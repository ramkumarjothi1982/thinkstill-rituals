// The heavy-job lock is shared by every agent on the machine, so its
// semantics are tested against a private lock directory (never WORK/locks).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { acquireHeavy, withHeavyLock, heavyStatus, parseHeld, HeavyLockTimeout } from '../../render/lib/heavy-lock.mjs';

const LOCK_CLI = fileURLToPath(new URL('../../render/lib/heavy-lock.mjs', import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Start an acquisition and expose whether it has resolved yet. */
function pending(opts) {
  const s = { done: false, lease: null, error: null };
  s.promise = acquireHeavy(opts).then((l) => { s.done = true; s.lease = l; return l; }, (e) => { s.done = true; s.error = e; throw e; });
  s.promise.catch(() => {});
  return s;
}

function withDir(fn) {
  return async () => {
    const lockDir = mkWorkTemp('heavy-lock-');
    // held: '' → ignore any HM_HEAVY_LOCK inherited from an outer `npm test` wrapper
    const base = { lockDir, held: '', slots: 2, pollMs: 50, onWait: () => {} };
    try { await fn(base, lockDir); } finally { fs.rmSync(lockDir, { recursive: true, force: true }); }
  };
}

test('two shared slots run at once; a third shared job waits for a free slot', withDir(async (base) => {
  const a = await acquireHeavy({ ...base, mode: 'shared' });
  const b = await acquireHeavy({ ...base, mode: 'shared' });
  assert.deepEqual([...a.slots, ...b.slots].sort(), [0, 1]);
  const c = pending({ ...base, mode: 'shared' });
  await sleep(500);
  assert.equal(c.done, false, 'third shared job must wait');
  await a.release();
  const lc = await c.promise;
  assert.deepEqual(lc.slots, a.slots, 'it takes the slot that was freed');
  await b.release(); await lc.release();
}));

test('exclusive waits for running shared jobs, and keeps new shared jobs out', withDir(async (base) => {
  const s = await acquireHeavy({ ...base, mode: 'shared' });
  const e = pending({ ...base, mode: 'exclusive' });
  await sleep(500);
  assert.equal(e.done, false, 'exclusive must wait for the shared job');
  await s.release();
  const le = await e.promise;
  assert.equal(le.mode, 'exclusive');
  const s2 = pending({ ...base, mode: 'shared' });
  await sleep(500);
  assert.equal(s2.done, false, 'shared must wait while exclusive runs');
  await le.release();
  await (await s2.promise).release();
}));

test('a waiting exclusive job is not starved: later shared jobs queue behind it', withDir(async (base) => {
  const order = [];
  const s1 = await acquireHeavy({ ...base, mode: 'shared' });          // one slot still free
  const e = pending({ ...base, mode: 'exclusive' });
  await sleep(300);
  const s2 = pending({ ...base, mode: 'shared' });
  e.promise.then(() => order.push('exclusive'));
  s2.promise.then(() => order.push('shared-2'));
  await sleep(500);
  assert.equal(s2.done, false, 'shared-2 must not jump the queue even though a slot is free');
  await s1.release();
  const le = await e.promise;
  await sleep(300);
  assert.equal(s2.done, false, 'shared-2 still waits while exclusive runs');
  await le.release();
  await (await s2.promise).release();
  assert.deepEqual(order, ['exclusive', 'shared-2']);
}));

test('weight N takes N slots', withDir(async (base) => {
  const w2 = await acquireHeavy({ ...base, mode: 'shared', weight: 2 });
  assert.equal(w2.slots.length, 2);
  const s = pending({ ...base, mode: 'shared' });
  await sleep(400);
  assert.equal(s.done, false);
  await w2.release();
  await (await s.promise).release();
  await assert.rejects(acquireHeavy({ ...base, mode: 'shared', weight: 3 }), /weight must be 1\.\.2/);
}));

test('timeouts give up cleanly and leave the lock usable', withDir(async (base) => {
  const e = await acquireHeavy({ ...base, mode: 'exclusive' });
  await assert.rejects(acquireHeavy({ ...base, mode: 'shared', timeoutMs: 300 }), HeavyLockTimeout);
  await assert.rejects(acquireHeavy({ ...base, mode: 'exclusive', timeoutMs: 300 }), HeavyLockTimeout);
  await e.release();
  const again = await acquireHeavy({ ...base, mode: 'exclusive', timeoutMs: 3000 });
  await again.release();
}));

test('nesting: covered requests are no-ops, uncovered ones throw instead of deadlocking', withDir(async (base, lockDir) => {
  const ex = await acquireHeavy({ ...base, mode: 'exclusive', held: `exclusive@${lockDir}` });
  assert.equal(ex.noop, true);
  const sh = await acquireHeavy({ ...base, mode: 'shared', held: `shared:1@${lockDir}` });
  assert.equal(sh.noop, true);
  await assert.rejects(acquireHeavy({ ...base, mode: 'exclusive', held: `shared:1@${lockDir}` }), /would deadlock/);
  await assert.rejects(acquireHeavy({ ...base, mode: 'shared', weight: 2, held: `shared:1@${lockDir}` }), /would deadlock/);
  // a lease on a different lock directory does not cover this one
  const real = await acquireHeavy({ ...base, mode: 'exclusive', held: 'exclusive@/some/other/locks' });
  assert.equal(real.noop, false);
  await real.release();
  assert.deepEqual(parseHeld('shared:2@/x/y'), { mode: 'shared', weight: 2, lockDir: '/x/y' });
  assert.equal(parseHeld('garbage'), null);
}));

test('withHeavyLock exports HM_HEAVY_LOCK to the body and restores it afterwards', withDir(async (base, lockDir) => {
  const before = process.env.HM_HEAVY_LOCK;
  await withHeavyLock({ ...base, mode: 'exclusive' }, async (lease) => {
    assert.equal(process.env.HM_HEAVY_LOCK, `exclusive@${lockDir}`);
    assert.equal(lease.envValue, `exclusive@${lockDir}`);
  });
  assert.equal(process.env.HM_HEAVY_LOCK, before);
}));

test('a holder killed with SIGKILL releases its lock (no stale locks)', withDir(async (base, lockDir) => {
  const script = `import { acquireHeavy } from ${JSON.stringify(new URL('../../render/lib/heavy-lock.mjs', import.meta.url).href)};
    await acquireHeavy({ mode: 'exclusive', lockDir: ${JSON.stringify(lockDir)}, held: '' });
    console.log('held'); setInterval(() => {}, 1000);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => child.stdout.once('data', r));
  const st = await heavyStatus({ lockDir });
  assert.equal(st.idle, false);
  assert.equal(st.holders[0].pid, child.pid);
  child.kill('SIGKILL');
  const lease = await acquireHeavy({ ...base, mode: 'exclusive', timeoutMs: 5000 });
  await lease.release();
  assert.equal((await heavyStatus({ lockDir })).holders.length, 0, 'dead holder info is pruned');
}));

test('CLI runs the command under the lock and propagates its exit code', withDir(async (_base, lockDir) => {
  const env = { ...process.env };
  delete env.HM_HEAVY_LOCK;
  const r = spawnSync(process.execPath, [LOCK_CLI, '--lock-dir', lockDir, '--shared', '--label', 'cli-test', '--',
    process.execPath, '-e', 'process.exit(process.env.HM_HEAVY_LOCK.startsWith("shared:1@") ? 7 : 1)'], { env, encoding: 'utf8' });
  assert.equal(r.status, 7, r.stderr);
  const usage = spawnSync(process.execPath, [LOCK_CLI, '--exclusive'], { env, encoding: 'utf8' });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /usage:/);
  const status = spawnSync(process.execPath, [LOCK_CLI, '--lock-dir', lockDir, '--status'], { env, encoding: 'utf8' });
  assert.equal(status.status, 0);
  assert.match(status.stdout, /idle \(2 shared slots\)/);
  assert.ok(fs.existsSync(path.join(lockDir, 'gate.lock')));
}));
