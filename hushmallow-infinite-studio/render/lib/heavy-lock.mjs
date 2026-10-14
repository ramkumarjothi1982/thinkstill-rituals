// Heavy-job lock: shared CPU slots plus an exclusive "whole machine" mode, on flock(1).
//
// The studio machine has 4 cores and no GPU. Renders, golden captures,
// benchmarks and asset derivations each saturate it, and parallel agents
// would otherwise distort each other's timings. Every heavy job runs inside
// this lock:
//
//   shared     a render/test worker; up to HM_HEAVY_SLOTS (default 2) run at
//              once. --weight N takes N slots (e.g. a derivation that wants
//              the whole worker budget but can coexist with light work).
//   exclusive  benchmarks and golden captures: waits until every shared job
//              is done and keeps new ones out until it finishes.
//
// CLI (exit code = the command's; the command runs inside the write jail):
//   node render/lib/heavy-lock.mjs --exclusive [--label txt] [--timeout s] -- <cmd> [args…]
//   node render/lib/heavy-lock.mjs --shared [--weight N] [--label txt] [--timeout s] -- <cmd> [args…]
//   node render/lib/heavy-lock.mjs --status [--json]
//
// Library:
//   import { withHeavyLock } from './render/lib/heavy-lock.mjs';
//   await withHeavyLock({ mode: 'exclusive', label: 'bench' }, async (lease) => { … });
//
// Protocol (lock files in WORK/locks, shared by every git worktree):
//   turnstile.lock  every acquirer holds it while it waits for its resources,
//                   so waiters are served in arrival order and an exclusive
//                   job cannot be starved by a stream of shared ones
//   gate.lock       held shared by running shared jobs, exclusively by an exclusive job
//   slot-<n>.lock   one per shared slot
// Each lock is held by a tiny `flock … cat` holder process reading a pipe
// from this process. Releasing closes the pipe; if this process dies (even
// kill -9) the pipe closes too and the kernel drops the lock, so there are
// never stale locks to clean up.
//
// Nesting: a lease exports HM_HEAVY_LOCK to child processes. A nested request
// that the outer lease already covers is a no-op (so `hm golden capture`
// under `heavy-lock --exclusive` does not deadlock); a nested request it does
// not cover (exclusive inside shared) throws instead of hanging.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCK_DIR } from './paths.mjs';
import { runJailed } from './write-jail.mjs';

const BUSY = 75;                       // flock --conflict-exit-code (EX_TEMPFAIL)
export const ENV_KEY = 'HM_HEAVY_LOCK';
export const defaultSlots = () => Math.max(1, Number(process.env.HM_HEAVY_SLOTS) || 2);

export class HeavyLockTimeout extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Hold one flock on `file`. Resolves to a holder { release() } once the lock
 * is held, or to null when `wait` is false and the lock is busy.
 * `cancel` is an AbortSignal: aborting a still-waiting holder rejects.
 */
function hold(file, { shared = false, wait = true, cancel } = {}) {
  return new Promise((resolve, reject) => {
    const args = [shared ? '--shared' : '--exclusive', '--conflict-exit-code', String(BUSY)];
    if (!wait) args.push('--nonblock');
    args.push(file, 'sh', '-c', 'echo held; exec cat >/dev/null');
    const child = spawn('flock', args, { stdio: ['pipe', 'pipe', 'inherit'] });
    let settled = false;
    const exited = new Promise((r) => child.once('exit', r));
    const holder = {
      release() {
        try { child.stdin.end(); } catch { /* already closed */ }
        return exited;
      },
    };
    const onAbort = () => { if (!settled) { settled = true; child.kill('SIGTERM'); reject(new HeavyLockTimeout(`timed out waiting for ${path.basename(file)}`)); } };
    cancel?.addEventListener('abort', onAbort, { once: true });
    child.stdout.once('data', () => {
      child.stdout.resume();
      cancel?.removeEventListener('abort', onAbort);
      if (settled) { holder.release(); return; }          // acquired just as we gave up: drop it
      settled = true;
      resolve(holder);
    });
    child.once('error', (e) => { if (!settled) { settled = true; reject(e); } });
    child.once('exit', (code, sig) => {
      cancel?.removeEventListener('abort', onAbort);
      if (settled) return;
      settled = true;
      if (code === BUSY) resolve(null);
      else reject(new Error(`flock ${path.basename(file)} exited ${code ?? sig}`));
    });
  });
}

/** Parse an HM_HEAVY_LOCK value: "exclusive@<dir>" or "shared:<w>@<dir>". */
export function parseHeld(value) {
  const m = /^(exclusive|shared)(?::(\d+))?@(.+)$/.exec(value || '');
  return m ? { mode: m[1], weight: m[1] === 'shared' ? Number(m[2] || 1) : Infinity, lockDir: m[3] } : null;
}

const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

function readHolders(lockDir) {
  const dir = path.join(lockDir, 'holders');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    try {
      const info = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (pidAlive(info.pid)) out.push(info);
      else fs.rmSync(path.join(dir, f), { force: true });       // holder died: its flocks are already gone
    } catch { /* half-written or removed meanwhile */ }
  }
  return out.sort((a, b) => a.since.localeCompare(b.since));
}

let seq = 0;

/**
 * Acquire the heavy-job lock.
 *   mode       'shared' | 'exclusive'
 *   weight     shared slots to take (1..slots)
 *   label      shown by --status and in wait messages
 *   timeoutMs  give up (HeavyLockTimeout) if not acquired in time; default: wait forever
 *   onWait     called once if the lock is not acquired within 1 s (default: a stderr note)
 *   held       override for the inherited HM_HEAVY_LOCK value ('' = ignore the environment)
 * → lease { mode, weight, slots, waitedMs, envValue, noop, release() }
 */
export async function acquireHeavy({
  mode = 'shared', weight = 1, label = '', lockDir = LOCK_DIR, slots = defaultSlots(),
  timeoutMs, onWait, held = process.env[ENV_KEY], pollMs = 400,
} = {}) {
  if (mode !== 'shared' && mode !== 'exclusive') throw new Error(`heavy lock mode must be shared|exclusive, got ${mode}`);
  lockDir = path.resolve(lockDir);
  weight = mode === 'exclusive' ? slots : Math.floor(weight);
  if (!(weight >= 1 && weight <= slots)) throw new Error(`weight must be 1..${slots}`);

  const outer = parseHeld(held);
  if (outer && path.resolve(outer.lockDir) === lockDir) {
    if (outer.mode === 'exclusive' || (mode === 'shared' && weight <= outer.weight)) {
      return { mode, weight, slots: [], waitedMs: 0, envValue: held, noop: true, release: async () => {} };
    }
    throw new Error(`nested heavy lock would deadlock: this process already holds ${held}, and asks for ${mode}${mode === 'shared' ? `:${weight}` : ''}`);
  }

  fs.mkdirSync(path.join(lockDir, 'holders'), { recursive: true });
  const t0 = performance.now();
  const abort = new AbortController();
  const timer = timeoutMs != null ? setTimeout(() => abort.abort(), timeoutMs) : null;
  const notify = setTimeout(() => {
    const who = readHolders(lockDir).map((h) => `${h.mode}${h.mode === 'shared' ? `:${h.weight}` : ''} pid ${h.pid} "${h.label || h.cmd}"`);
    (onWait || ((msg) => process.stderr.write(`[heavy-lock] ${msg}\n`)))(`waiting for ${mode}${label ? ` (${label})` : ''}; held by: ${who.join('; ') || 'nobody yet (queue)'}`);
  }, 1000);
  const acquired = [];
  try {
    const turnstile = await hold(path.join(lockDir, 'turnstile.lock'), { cancel: abort.signal });
    try {
      const mySlots = [];
      if (mode === 'shared') {
        // only the turnstile holder hunts for slots, so partial holds can never deadlock
        while (mySlots.length < weight) {
          for (let n = 0; n < slots && mySlots.length < weight; n++) {
            if (mySlots.includes(n)) continue;
            const h = await hold(path.join(lockDir, `slot-${n}.lock`), { wait: false });
            if (h) { acquired.push(h); mySlots.push(n); }
          }
          if (mySlots.length < weight) {
            if (abort.signal.aborted) throw new HeavyLockTimeout('timed out waiting for a shared slot');
            await sleep(pollMs);
          }
        }
      }
      acquired.push(await hold(path.join(lockDir, 'gate.lock'), { shared: mode === 'shared', cancel: abort.signal }));
      const waitedMs = performance.now() - t0;
      const envValue = mode === 'exclusive' ? `exclusive@${lockDir}` : `shared:${weight}@${lockDir}`;
      const infoFile = path.join(lockDir, 'holders', `${process.pid}-${++seq}.json`);
      fs.writeFileSync(infoFile, JSON.stringify({
        pid: process.pid, mode, weight, slots: mySlots, label, host: os.hostname(),
        cmd: process.argv.slice(1).join(' ').slice(0, 300), since: new Date().toISOString(),
      }));
      let released = false;
      return {
        mode, weight, slots: mySlots, waitedMs, envValue, noop: false,
        async release() {
          if (released) return;
          released = true;
          fs.rmSync(infoFile, { force: true });
          await Promise.all(acquired.map((h) => h.release()));
        },
      };
    } finally {
      await turnstile.release();
    }
  } catch (e) {
    await Promise.all(acquired.map((h) => h.release()));
    throw e;
  } finally {
    clearTimeout(timer);
    clearTimeout(notify);
  }
}

/**
 * Run `fn(lease)` while holding the lock. While it runs, HM_HEAVY_LOCK is
 * exported so child processes (renders, captures) see that they are covered.
 */
export async function withHeavyLock(opts, fn) {
  const lease = await acquireHeavy(opts);
  const prev = process.env[ENV_KEY];
  if (!lease.noop) process.env[ENV_KEY] = lease.envValue;
  try {
    return await fn(lease);
  } finally {
    if (!lease.noop) { if (prev === undefined) delete process.env[ENV_KEY]; else process.env[ENV_KEY] = prev; }
    await lease.release();
  }
}

/** Who holds what right now. → { lockDir, slots, idle, holders: [...] } */
export async function heavyStatus({ lockDir = LOCK_DIR, slots = defaultSlots() } = {}) {
  lockDir = path.resolve(lockDir);
  fs.mkdirSync(path.join(lockDir, 'holders'), { recursive: true });
  // probe: if the gate can be taken exclusively right now, nothing heavy is running
  const probe = await hold(path.join(lockDir, 'gate.lock'), { wait: false });
  if (probe) await probe.release();
  return { lockDir, slots, idle: !!probe, holders: readHolders(lockDir) };
}

// ------------------------------------------------------------------- CLI --

function parseCli(argv) {
  const sep = argv.indexOf('--');
  const own = sep >= 0 ? argv.slice(0, sep) : argv;
  const cmd = sep >= 0 ? argv.slice(sep + 1) : [];
  const o = { mode: null, weight: 1, label: '', timeoutMs: undefined, lockDir: LOCK_DIR, status: false, json: false, quiet: false, cmd };
  for (let i = 0; i < own.length; i++) {
    const a = own[i];
    if (a === '--exclusive') o.mode = 'exclusive';
    else if (a === '--shared') o.mode = 'shared';
    else if (a === '--weight') o.weight = Number(own[++i]);
    else if (a === '--label') o.label = own[++i];
    else if (a === '--timeout') o.timeoutMs = Number(own[++i]) * 1000;
    else if (a === '--lock-dir') o.lockDir = own[++i];
    else if (a === '--status') o.status = true;
    else if (a === '--json') o.json = true;
    else if (a === '--quiet') o.quiet = true;
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

const USAGE = `usage: node render/lib/heavy-lock.mjs (--exclusive | --shared [--weight N]) [--label txt] [--timeout s] -- <cmd> [args…]
       node render/lib/heavy-lock.mjs --status [--json]`;

export function formatStatus(s) {
  const lines = [`heavy lock ${s.lockDir}: ${s.idle ? 'idle' : 'busy'} (${s.slots} shared slots)`];
  for (const h of s.holders) lines.push(`  ${h.mode}${h.mode === 'shared' ? `:${h.weight} slots [${h.slots.join(',')}]` : ''}  pid ${h.pid}  since ${h.since}  ${h.label || h.cmd}`);
  return lines.join('\n');
}

async function cli(argv) {
  let o;
  try { o = parseCli(argv); } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  if (o.status) {
    const s = await heavyStatus({ lockDir: o.lockDir });
    console.log(o.json ? JSON.stringify(s, null, 2) : formatStatus(s));
    return 0;
  }
  if (!o.mode || !o.cmd.length) { console.error(USAGE); return 2; }
  let lease;
  try {
    lease = await acquireHeavy({ mode: o.mode, weight: o.weight, label: o.label || o.cmd.join(' ').slice(0, 120), timeoutMs: o.timeoutMs, lockDir: o.lockDir });
  } catch (e) {
    console.error(`[heavy-lock] ${e.message}`);
    return e instanceof HeavyLockTimeout ? BUSY : 1;
  }
  if (!o.quiet && lease.waitedMs > 1000) console.error(`[heavy-lock] ${o.mode} acquired after ${(lease.waitedMs / 1000).toFixed(1)} s`);
  // The command runs inside the write jail (render/lib/write-jail.mjs): every
  // heavy job can write only to the studio and WORK. runJailed forwards
  // SIGINT/SIGTERM/SIGHUP and passes the exit code through.
  const code = await runJailed(o.cmd[0], o.cmd.slice(1), { env: { ...process.env, [ENV_KEY]: lease.envValue } })
    .catch((e) => { console.error(`[heavy-lock] cannot run ${o.cmd[0]}: ${e.message}`); return 127; });
  await lease.release();
  return code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await cli(process.argv.slice(2));
}
