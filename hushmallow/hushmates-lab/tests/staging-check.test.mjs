// The staging check (tools/staging-check.mjs) run against the whole local stack, so the tool
// the owner runs against the real staging project is itself tested: every check it can make
// here passes, and the ones only a real project has (pg_cron, pg_net, Vault, password
// sign-in) are reported as not checked, never as passed. With a Deno installed
// (HUSHMATES_DENO), the Edge Function is the real entry point under Deno. And the staging
// E2E's own safeguards (tools/staging-e2e.mjs): the timings it puts back, its clean-up when it is
// stopped (what was being made at that moment included), a browser started without the secrets, a
// rehearsal that takes its database down even when its stack can't close, and a report that says
// which Edge Function ran.

import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDevStack } from '../server/dev-stack.mjs';
import { runStagingCheck, settledWell } from '../tools/staging-check.mjs';
import { DEFAULT_TIMINGS, timingsToRestore, cleanUpOnStop, edgeRuntime, toMarkdown, runStagingE2E, rehearsalTearDown, withoutSecrets } from '../tools/staging-e2e.mjs';
import { problemsWith, makeSecrets } from '../tools/staging-secrets.mjs';
import { freshDb } from './backend-helpers.mjs';
import { deriveSecrets, managementSql, createManagementApi } from '../tools/staging-env.mjs';
import { standIn, TOKEN, REF, STAGING } from './management-api-stand-in.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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

test('the staging check as a cloud session runs it: keys derived from the root secret, SQL through the Management API', { timeout: 180e3 }, async () => {
  const db = await freshDb();
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-check-'));
  const port = await freePort();
  // the "deployed" function holds the keys derived from the root, as tools/staging-deploy.mjs would set them
  const root = 'q7Vd-Lm2#xR9pT4!wZ6nB8@kH3sJ5cF1yG0uE-test-only';
  const d = deriveSecrets({ root, ref: REF, origin: 'https://hushmates-staging.pages.dev' });
  const keysFile = join(dir, 'keys.json');
  writeFileSync(keysFile, JSON.stringify({ dataKeyId: 'k1', dataKey: JSON.parse(d.HUSHMATES_DATA_KEYS).k1, macKey: d.HUSHMATES_MAC_KEY, jobSecret: d.HUSHMATES_JOB_SECRET, serviceKey: 'sb_secret_dev_root_mode_test_000001' }));
  const s = await startDevStack({ port, pool: db.pool, anonKey: ANON, keysFile, quiet: true, log: { error() {}, log() {} }, tickMs: 3600e3, edge, deno: DENO });
  const api = await standIn({ connectionString: db.url, project: STAGING });
  try {
    const secrets = { ...d, HUSHMATES_ALLOWED_ORIGINS: s.origin };
    const lines = [];
    const out = await runStagingCheck({ url: s.origin, anonKey: ANON, serviceKey: s.keys.serviceKey, db: managementSql({ api: createManagementApi({ token: TOKEN, base: api.base }), ref: REF }),
      secrets, secretsSource: 'root', origin: s.origin, log: { log: (l) => lines.push(l) } });
    assert.deepEqual(out.results.filter((r) => r.status === 'fail'), [], lines.join('\n'));
    const passed = out.results.filter((r) => r.status === 'pass').map((r) => r.what);
    for (const must of ['row level security is on for every Hushmates table', 'the keys derived from the root secret open it (they are the deployed keys: keep the root secret safe)',
      'the job secret derived from the root secret is the deployed one (the scheduler’s route answers it)', 'the same feeling sent five times at once is stored once']) {
      assert.ok(passed.includes(must), `not checked: ${must}\n${lines.join('\n')}`);
    }
    assert.equal(out.results.filter((r) => r.area === 'deletion' && r.status === 'pass').length, 4, lines.join('\n'));
    assert.deepEqual(api.state.problems, [], 'a query the Management API would refuse');
    assert.ok(api.state.calls.filter((c) => c.endsWith('/database/query')).length > 10);
  } finally {
    await api.close();
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

test('the scheduler is judged by its most recent runs: a first deploy’s start-up failures pass, a scheduler that keeps failing doesn’t', () => {
  const ok = (x) => x === 200;
  // newest first, as the check reads them
  assert.equal(settledWell([200], ok), true);
  assert.equal(settledWell([200, 200, 404, 404], ok), true, 'two minutes of 404s before the function was there, then answers');
  assert.equal(settledWell([200, 404], ok), true, 'the first answer after the start-up');
  assert.equal(settledWell([404, 200, 200], ok), false, 'failing now');
  assert.equal(settledWell([200, 500, 200], ok), false, 'failing on and off after it worked');
  assert.equal(settledWell([404, 404, 404], ok), false, 'never worked');
  assert.equal(settledWell([], ok), false, 'nothing ran');
});

test('the staging E2E puts back the timings the project had, or the migrations’ defaults when a cut-off run left its short ones', () => {
  // the defaults are the ones the first migration sets
  const sql = readFileSync(join(ROOT, 'supabase', 'migrations', '20261014090000_hushmates_schema.sql'), 'utf8');
  const limits = JSON.parse(/\('limits',\s*'(\{[\s\S]*?\})'\)/.exec(sql)[1]);
  assert.deepEqual(DEFAULT_TIMINGS, { fallbackAfterMs: limits.fallbackAfterMs, journeyTtlMs: limits.journeyTtlMs });
  const short = { fallbackAfterMs: 60e3, journeyTtlMs: 180e3 };
  assert.deepEqual(timingsToRestore(DEFAULT_TIMINGS, short), DEFAULT_TIMINGS);
  assert.deepEqual(timingsToRestore({ fallbackAfterMs: 45 * 60e3, journeyTtlMs: 12 * 3600e3 }, short), { fallbackAfterMs: 45 * 60e3, journeyTtlMs: 12 * 3600e3 }, 'the owner’s own choice is kept');
  assert.deepEqual(timingsToRestore(short, short), DEFAULT_TIMINGS, 'a cut-off run’s timings are never kept as the ones to put back');
  assert.deepEqual(timingsToRestore({ fallbackAfterMs: 12e3, journeyTtlMs: 45e3 }, short), DEFAULT_TIMINGS, 'a cut-off rehearsal’s');
  assert.deepEqual(timingsToRestore({ fallbackAfterMs: 45 * 60e3, journeyTtlMs: 180e3 }, short), { fallbackAfterMs: 45 * 60e3, journeyTtlMs: DEFAULT_TIMINGS.journeyTtlMs });
  assert.deepEqual(timingsToRestore({}, short), DEFAULT_TIMINGS, 'nothing set: the defaults, never nothing');
});

test('the staging E2E stopped by Ctrl-C or SIGTERM cleans up before it exits', async () => {
  for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    const proc = new EventEmitter();
    const order = [];
    let exited;
    const done = new Promise((r) => { proc.exit = (c) => { order.push(`exit ${c}`); exited = c; r(); }; });
    cleanUpOnStop(async (stoppedBy) => { await new Promise((r) => setTimeout(r, 20)); order.push(`cleaned after ${stoppedBy}`); }, { proc });
    proc.emit(sig, sig);
    await done;
    assert.deepEqual(order, [`cleaned after ${sig}`, `exit ${code}`], sig);
    assert.equal(exited, code);
  }
  // a clean-up that fails still stops; and once the run is over the handlers are gone
  const proc = new EventEmitter();
  const done = new Promise((r) => { proc.exit = r; });
  cleanUpOnStop(async () => { throw new Error('the network is down'); }, { proc });
  proc.emit('SIGTERM', 'SIGTERM');
  assert.equal(await done, 143);
  const quiet = new EventEmitter();
  const off = cleanUpOnStop(async () => {}, { proc: quiet });
  off();
  assert.equal(quiet.listenerCount('SIGINT') + quiet.listenerCount('SIGTERM'), 0);
});

// The staging E2E on a real database, with Supabase Auth's admin API answered here (making a person
// takes 300 ms) and the database reached as through the Management API (its end() does nothing,
// each query a little slow). `stopAt` sends Ctrl-C while the first test person ('person') or the
// first invitation ('invitation') is being made; `playwright` stands in for the browser (by default
// one that can't start, so a run that gets that far stops there).
const NO_BROWSER = { chromium: { launch: async () => { throw new Error('no browser in this test'); } } };
async function e2eAgainst(db, { stopAt = null, playwright = NO_BROWSER } = {}) {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const proc = new EventEmitter();
  const exited = new Promise((r) => { proc.exit = r; });
  let stopped = false;
  const stop = (what) => { if (stopAt === what && !stopped) { stopped = true; setTimeout(() => proc.emit('SIGINT', 'SIGINT'), 5); } };
  const people = { made: [], deleted: [] };
  const fetch = async (url, o = {}) => {
    const u = String(url);
    if (u.endsWith('/auth/v1/admin/users') && o.method === 'POST') {
      stop('person');
      await pause(300);
      const id = randomUUID();
      people.made.push(id);
      return Response.json({ id });
    }
    if (/\/auth\/v1\/admin\/users\/[^/]+$/.test(u) && o.method === 'DELETE') { people.deleted.push(u.split('/').pop()); return Response.json({}); }
    return new Response('{}', { status: 200 });
  };
  const viaApi = { async query(q, p) { if (/admin_create_invite/.test(q)) stop('invitation'); await pause(60); return db.pool.query(q, p); }, async end() {} };
  const out = mkdtempSync(join(tmpdir(), 'hushmates-e2e-stop-'));
  try {
    const report = await runStagingE2E({ environment: 'local-rehearsal', site: 'http://127.0.0.1:9', supabaseUrl: 'http://127.0.0.1:8', anonKey: 'a', serviceKey: 'sb_secret_x',
      db: viaApi, secrets: makeSecrets({ origin: 'https://hushmates-staging.pages.dev', projectRef: REF }).env, out, log: {}, proc, fetch, playwright });
    const invitations = (await db.pool.query("select count(*)::int n, count(revoked_at)::int revoked from hushmates.invites where note = 'staging-e2e ' || $1", [report.run])).rows[0];
    const limits = (await db.pool.query("select hushmates_api.settings() -> 'limits' as l")).rows[0].l;
    return { report, people, invitations, timings: { fallbackAfterMs: limits.fallbackAfterMs, journeyTtlMs: limits.journeyTtlMs }, exited: stopAt ? await exited : null };
  } finally { rmSync(out, { recursive: true, force: true }); }
}

test('the staging E2E stopped while it makes its test people or invitations removes what was being made too, and makes nothing after', { timeout: 60e3 }, async () => {
  const db = await freshDb();
  try {
    // Ctrl-C while the first test person is being made: that one is removed too, and no second one is made
    let r = await e2eAgainst(db, { stopAt: 'person' });
    assert.equal(r.exited, 130);
    assert.equal(r.report.stoppedBy, 'SIGINT', 'the report doesn’t say it was stopped');
    assert.ok(r.report.checks.some((c) => !c.ok && /without being stopped/.test(c.what)));
    assert.equal(r.people.made.length, 1, 'a test person was made after the stop');
    assert.deepEqual(r.people.deleted, r.people.made, 'a test person was left behind');
    assert.deepEqual(r.invitations, { n: 5, revoked: 5 }, 'an invitation was left usable');
    assert.deepEqual(r.timings, DEFAULT_TIMINGS, 'the timings weren’t put back');
    // Ctrl-C while the first invitation is being made (the database's end() does nothing, so the run goes on)
    r = await e2eAgainst(db, { stopAt: 'invitation' });
    assert.equal(r.exited, 130);
    assert.deepEqual(r.invitations, { n: 1, revoked: 1 }, 'the invitation being made was left usable, or more were made after the stop');
    assert.deepEqual(r.people.made, [], 'a test person was made after the stop');
    assert.deepEqual(r.timings, DEFAULT_TIMINGS, 'the timings weren’t put back');
  } finally { await db.drop(); }
});

test('the browser the staging E2E starts gets none of the secrets (Playwright would hand it this whole environment)', { timeout: 60e3 }, async () => {
  const secrets = { HUSHMATES_STAGING_ROOT_SECRET: 'root-never-for-the-browser', SUPABASE_ACCESS_TOKEN: 'sbp_never_for_the_browser', HUSHMATES_ADMIN_PG: 'postgresql://never-for-the-browser@db',
    HUSHMATES_STAGING_SERVICE_KEY: 'sb_secret_never_for_the_browser', CLOUDFLARE_API_TOKEN: 'cf-never-for-the-browser', supabase_db_password: 'never-for-the-browser' };
  const kept = { PATH: '/usr/bin:/bin', HOME: '/home/owner', DISPLAY: ':0', HTTPS_PROXY: 'http://proxy:3128', FONTCONFIG_PATH: '/etc/fonts', LANG: 'en_AU.UTF-8' };
  assert.deepEqual(withoutSecrets({ ...kept, ...secrets, UNSET: undefined }), kept);
  const db = await freshDb();
  const saved = Object.fromEntries(Object.keys(secrets).map((k) => [k, process.env[k]]));
  Object.assign(process.env, secrets);
  try {
    const launched = [];
    const playwright = { chromium: { launch: async (o) => { launched.push(o); throw new Error('no browser in this test'); } } };
    const r = await e2eAgainst(db, { playwright });
    assert.equal(launched.length, 1, 'the run never got as far as the browser');
    assert.ok(launched[0].env && launched[0].env.PATH === process.env.PATH, 'the browser wasn’t given its own environment');
    for (const v of Object.values(secrets)) assert.ok(!JSON.stringify(launched[0].env).includes(v), 'the browser was given a secret');
    assert.equal(launched[0].handleSIGINT, false);
    // and the four test people made before it are gone again
    assert.equal(r.people.made.length, 4);
    assert.deepEqual(r.people.deleted, r.people.made);
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    await db.drop();
  }
});

test('a rehearsal taken down after a terminal’s Ctrl-C still drops its database and folder when its stack can’t close', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-rehearsal-test-'));
  const order = [];
  // the stack waits for a Deno that the same Ctrl-C already stopped, and would never return
  const tearDown = rehearsalTearDown({ dir, waitMs: 200, site: { close: async () => { order.push('site'); } },
    stack: { close: () => { order.push('stack'); return new Promise(() => {}); } }, db: { drop: async () => { order.push('database'); } } });
  const started = Date.now();
  await tearDown();
  assert.ok(Date.now() - started < 3000, 'it waited for the stack');
  assert.deepEqual(order, ['site', 'stack', 'database']);
  assert.ok(!existsSync(dir), 'the rehearsal’s folder is still there');
  assert.equal(tearDown(), tearDown(), 'a second call (the stop, then the run’s own end) takes it down again');
});

test('a rehearsal says which Edge Function ran: the real index.ts under Deno (and which), or the Node gateway only when asked for', () => {
  const deno = edgeRuntime({ deno: '/opt/deno', run: () => ({ status: 0, stdout: 'deno 2.1.4 (stable, release, x86_64-unknown-linux-gnu)\nv8 13.0\n' }) });
  assert.deepEqual(deno, { edge: 'deno 2.1.4', edgeLabel: 'the real index.ts under Deno 2.1.4' });
  assert.throws(() => edgeRuntime({ deno: '/nope', run: () => ({ status: 1, stdout: '' }) }), /doesn’t run/);
  assert.throws(() => edgeRuntime({}), /HUSHMATES_DENO isn’t set.*--node/);
  assert.deepEqual(edgeRuntime({ node: true }), { edge: 'node', edgeLabel: 'Node gateway, not the real index.ts' });
  const report = { environment: 'local-rehearsal', ...edgeRuntime({ node: true }), checks: [], notChecked: [], screens: [], passed: 0, failed: 0, startedAt: 'a', finishedAt: 'b', engine: 'Chromium' };
  assert.match(toMarkdown(report).split('\n')[0], /^# Staging end-to-end: LOCAL REHEARSAL \(not staging\) · Edge Function: Node gateway, not the real index\.ts$/);
  assert.match(toMarkdown({ ...report, ...deno }).split('\n')[0], /Edge Function: the real index\.ts under Deno 2\.1\.4$/);
  // and the command refuses to rehearse without Deno unless --node is given (before it starts anything)
  const env = { ...process.env };
  delete env.HUSHMATES_DENO;
  const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'staging-e2e.mjs'), '--rehearse'], { cwd: ROOT, env, encoding: 'utf8', timeout: 30e3 });
  assert.equal(r.status, 2, r.stderr || r.stdout);
  assert.match(r.stderr, /HUSHMATES_DENO isn’t set.*add --node/);
});
