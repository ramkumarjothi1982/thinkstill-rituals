// The staging check (tools/staging-check.mjs) run against the whole local stack, so the tool
// the owner runs against the real staging project is itself tested: every check it can make
// here passes, and the ones only a real project has (pg_cron, pg_net, Vault, password
// sign-in) are reported as not checked, never as passed. With a Deno installed
// (HUSHMATES_DENO), the Edge Function is the real entry point under Deno.

import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startDevStack } from '../server/dev-stack.mjs';
import { runStagingCheck } from '../tools/staging-check.mjs';
import { problemsWith, makeSecrets } from '../tools/staging-secrets.mjs';
import { freshDb } from './backend-helpers.mjs';

const ANON = 'hushmates-test-anon-key-0001';
const DENO = process.env.HUSHMATES_DENO || 'deno';
const edge = spawnSync(DENO, ['--version']).status === 0 ? 'deno' : 'node';
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

test(`the staging check passes on the local stack (Edge Function under ${edge}), and says what it couldn't check`, { timeout: 180e3 }, async () => {
  const db = await freshDb();
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-check-'));
  const s = await startDevStack({ port: await freePort(), pool: db.pool, anonKey: ANON, keysFile: join(dir, 'keys.json'), quiet: true, log: { error() {}, log() {} }, tickMs: 3600e3, edge, deno: DENO });
  try {
    const secrets = {
      HUSHMATES_DATA_KEYS: JSON.stringify({ [s.keys.dataKeyId]: s.keys.dataKey }), HUSHMATES_DATA_KEY_ID: s.keys.dataKeyId,
      HUSHMATES_MAC_KEY: s.keys.macKey, HUSHMATES_JOB_SECRET: s.keys.jobSecret, HUSHMATES_ALLOWED_ORIGINS: s.origin,
    };
    const lines = [];
    const out = await runStagingCheck({ url: s.origin, anonKey: ANON, serviceKey: s.keys.serviceKey, adminPg: db.url, secrets, origin: s.origin, log: { log: (l) => lines.push(l) } });
    const failed = out.results.filter((r) => r.status === 'fail');
    assert.deepEqual(failed, [], lines.join('\n'));
    const passed = out.results.filter((r) => r.status === 'pass').map((r) => r.what);
    for (const must of ['refuses a call with no sign-in (401)', 'a browser can’t call the database’s functions directly (anon key → permission denied)',
      'row level security is on for every Hushmates table', 'the same feeling sent five times at once is stored once', 'both answers arrive at once, each in its own place',
      'the keys in .data/staging.env open it (they are the deployed keys: keep that file safe)', 'refuses a page on another website']) {
      assert.ok(passed.includes(must), `not checked: ${must}\n${lines.join('\n')}`);
    }
    assert.equal(out.results.filter((r) => r.area === 'deletion' && r.status === 'pass').length, 4, lines.join('\n'));
    // what only a real project has is said to be unchecked, not passed
    const skipped = out.results.filter((r) => r.status === 'skip').map((r) => r.what);
    assert.ok(skipped.some((w) => /pg_cron/.test(w)), skipped.join(' | '));
    assert.ok(skipped.some((w) => /password/.test(w)), skipped.join(' | '));
    // it cleaned up: no test account or unused invitation is left behind
    assert.equal((await db.pool.query("select count(*)::int n from auth.users where email like 'staging-check+%'")).rows[0].n, 0);
    assert.equal((await db.pool.query("select count(*)::int n from hushmates.invites where note like 'staging-check%' and revoked_at is null and uses < max_uses")).rows[0].n, 0);
    // and the wrong keys would have been caught
    const wrong = { ...secrets, HUSHMATES_DATA_KEYS: JSON.stringify({ [s.keys.dataKeyId]: Buffer.alloc(32, 7).toString('base64') }) };
    const again = await runStagingCheck({ url: s.origin, anonKey: ANON, serviceKey: s.keys.serviceKey, adminPg: db.url, secrets: wrong, origin: s.origin, log: {} });
    assert.equal(again.ok, false);
    assert.ok(again.results.some((r) => r.status === 'fail' && /keys in .data\/staging.env open it/.test(r.what)));
  } finally {
    await s.close();
    await db.drop();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the staging check’s scheduler watch: an offer that ran out is ended by the scheduler alone', { timeout: 120e3 }, async () => {
  const db = await freshDb();
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-check-'));
  // the local stack's scheduler ticks every second here, standing in for pg_cron; offers last 3 seconds
  const s = await startDevStack({ port: await freePort(), pool: db.pool, anonKey: ANON, keysFile: join(dir, 'keys.json'), quiet: true, log: { error() {}, log() {} }, tickMs: 1000 });
  try {
    await s.db.rpc('admin_set_setting', { p_key: 'limits', p_value: { offerHoldMs: 3000 } });
    const secrets = { HUSHMATES_DATA_KEYS: JSON.stringify({ [s.keys.dataKeyId]: s.keys.dataKey }), HUSHMATES_DATA_KEY_ID: s.keys.dataKeyId,
      HUSHMATES_MAC_KEY: s.keys.macKey, HUSHMATES_JOB_SECRET: s.keys.jobSecret, HUSHMATES_ALLOWED_ORIGINS: s.origin };
    const lines = [];
    const out = await runStagingCheck({ url: s.origin, anonKey: ANON, serviceKey: s.keys.serviceKey, adminPg: db.url, secrets, origin: s.origin,
      schedulerHere: true, schedulerMarginMs: 4000, log: { log: (l) => lines.push(l) } });
    const watch = out.results.find((r) => /ended an offer that ran out/.test(r.what));
    assert.equal(watch?.status, 'pass', lines.join('\n'));
  } finally {
    await s.close();
    await db.drop();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the secrets helper makes complete secrets and refuses unsafe ones', () => {
  const made = makeSecrets({ origin: 'https://hushmates-staging.pages.dev', projectRef: 'abcdefghijklmnopqrst' });
  assert.deepEqual(problemsWith(made.env), []);
  assert.match(made.vault, /hushmates_job_url/);
  assert.ok(made.file.includes(made.env.HUSHMATES_MAC_KEY));
  assert.ok(problemsWith({ ...made.env, HUSHMATES_ALLOWED_ORIGINS: 'https://x.pages.dev/app/' }).some((p) => /trailing slash|path/.test(p)));
  assert.ok(problemsWith({ ...made.env, HUSHMATES_ALLOWED_ORIGINS: 'http://x.pages.dev' }).length > 0);
  assert.ok(problemsWith({ ...made.env, HUSHMATES_DATA_KEY_ID: 'k9' }).some((p) => /names a key/.test(p)));
  assert.ok(problemsWith({ ...made.env, HUSHMATES_AI_URL: 'https://ai.example' }).some((p) => /AI must stay off/.test(p)));
  assert.ok(problemsWith({ ...made.env, HUSHMATES_MAC_KEY: 'c2hvcnQ=' }).some((p) => /MAC_KEY/.test(p)));
});
