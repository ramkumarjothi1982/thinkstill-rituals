// Sign-in readiness (P1, 15 Oct 2026): production never shows a half-configured sign-in.
// src/auth/readiness.js against the local fake of Supabase Auth + PostgREST (tools/auth/fake-supabase.mjs),
// plus the gate in the auth client's entry flows and where the app shows the account entry.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createReadiness, probeReadiness, schemaFrom, settingsFrom, READY_KEY } from '../src/auth/readiness.js';
import { createAuth } from '../src/auth/client.js';
import { createAuthHandle } from '../src/auth/boot.js';
import { resolveAuthConfig } from '../src/auth/config.js';
import { bootNamespace } from '../src/auth/namespace.js';
import { memoryStorage, supabaseLib, fakeDom } from './helpers/auth-env.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, '..', p), 'utf8');
const KEY = 'sb_publishable_hushmallow_local_dev_only';
const loc = { origin: 'http://localhost:8202', pathname: '/', href: 'http://localhost:8202/', hostname: 'localhost', protocol: 'http:', search: '', hash: '' };

let fake, url, calls;
/** fetch, counted (only what goes to the fake's two readiness questions) */
const counted = (path) => (u, init) => { if (String(u).includes(path)) calls.push(String(u)); return fetch(u, init); };
const countingFetch = (u, init) => { calls.push(String(u).replace(url, '')); return fetch(u, init); };
/** As production checks it (the hushmallow1 rules), but pointed at the fake on this machine. */
const prodLike = () => ({ enabled: true, url, key: KEY, dev: false });
const quiet = () => { const lines = []; return { lines, log: (...a) => lines.push(a.join(' ')) }; };

before(async () => {
  fake = createFakeSupabase({ siteUrl: 'http://localhost:8202' });
  url = `http://localhost:${await fake.listen(0)}`;
});
after(async () => { await fake.close(); });
beforeEach(() => { calls = []; fake.reset(); Object.assign(fake.cfg, { autoconfirm: false, noSchema: false, emailOff: false, down: false, rateLimitMs: 0 }); });

test('ready: the tables are there (anon may not read them: 401 42501) and email sign-up confirms — asked once a session', async () => {
  const ss = memoryStorage(), q = quiet();
  const r = createReadiness(prodLike(), { session: ss, fetchFn: countingFetch, log: q.log });
  assert.equal(await r.check(), true);
  assert.deepEqual(r.result.checked, { schema: 'present', settings: 'ready' });
  assert.deepEqual(calls.sort(), ['/auth/v1/settings', '/rest/v1/profiles?select=user_id&limit=0']);
  // again on this page, and on the next page of this session: nothing more is asked
  assert.equal(await r.check(), true);
  const again = createReadiness(prodLike(), { session: ss, fetchFn: countingFetch, log: q.log });
  assert.equal(await again.check(), true);
  assert.equal(calls.length, 2, 'one pair of questions for the whole session');
  assert.equal(JSON.parse(ss.getItem(READY_KEY)).ready, true);
  assert.deepEqual(q.lines, [], 'ready: no console line');
});

test('schema missing (the migrations never ran): not ready, one info line, kept for the session', async () => {
  fake.cfg.noSchema = true;
  const ss = memoryStorage(), q = quiet();
  const r = createReadiness(prodLike(), { session: ss, fetchFn: countingFetch, log: q.log });
  assert.equal(await r.check(), false);
  assert.equal(r.result.reason, 'schema-missing');
  assert.equal(q.lines.length, 1);
  assert.match(q.lines[0], /^\[auth\] sign-in is hidden: the database tables are missing/);
  assert.equal(await r.check(), false);
  assert.equal(q.lines.length, 1, 'said once');
  const next = createReadiness(prodLike(), { session: ss, fetchFn: countingFetch, log: () => {} });
  assert.equal(await next.check(), false);
  assert.equal(calls.length, 2, 'never asked again this session');
});

test('"Confirm email" off (mailer_autoconfirm on): not ready in production; a local dev/ci build may confirm at once', async () => {
  fake.cfg.autoconfirm = true;
  const q = quiet();
  const r = createReadiness(prodLike(), { session: memoryStorage(), fetchFn: countingFetch, log: q.log });
  assert.equal(await r.check(), false);
  assert.equal(r.result.reason, 'autoconfirm-on');
  assert.match(q.lines[0], /Confirm email/);
  const dev = createReadiness({ ...prodLike(), dev: true }, { session: memoryStorage(), fetchFn: countingFetch, log: q.log });
  assert.equal(await dev.check(), true);
});

test('email sign-in switched off: not ready', async () => {
  fake.cfg.emailOff = true;
  const r = createReadiness(prodLike(), { session: memoryStorage(), fetchFn: countingFetch, log: () => {} });
  assert.equal(await r.check(), false);
  assert.equal(r.result.reason, 'email-off');
});

test('network error or a timeout: not ready for this page only (never stored, never retried in a loop)', async () => {
  const ss = memoryStorage(), q = quiet();
  let n = 0;
  const down = async () => { n++; throw new TypeError('Failed to fetch'); };
  const r = createReadiness(prodLike(), { session: ss, fetchFn: down, log: q.log });
  assert.equal(await r.check(), false);
  assert.equal(r.result.reason, 'unknown');
  assert.equal(await r.check(), false);
  assert.equal(n, 2, 'two questions, once: a second check on the page asks nothing');
  assert.equal(ss.getItem(READY_KEY), null, 'not kept for the session');
  assert.equal(q.lines.length, 1);
  // a request that hangs is given up after the timeout
  const hang = (u, init) => new Promise((_, no) => init?.signal?.addEventListener('abort', () => no(new Error('aborted'))));
  const t0 = Date.now();
  const p = await probeReadiness(prodLike(), { fetchFn: hang, timeoutMs: 60 });
  assert.equal(p.ready, false);
  assert.equal(p.reason, 'unknown');
  assert.ok(Date.now() - t0 < 2000);
  // the project down (503) is unknown too
  fake.cfg.down = true;
  const r2 = createReadiness(prodLike(), { session: memoryStorage(), fetchFn: countingFetch, log: () => {} });
  assert.equal(await r2.check(), false);
  assert.equal(r2.result.reason, 'unknown');
});

test('the answers, as PostgREST and Supabase Auth give them', () => {
  assert.equal(schemaFrom(200, []), 'present');
  assert.equal(schemaFrom(401, { code: '42501', message: 'permission denied for table profiles' }), 'present');
  assert.equal(schemaFrom(403, { code: '42501' }), 'present');
  assert.equal(schemaFrom(404, { code: 'PGRST205' }), 'missing');
  assert.equal(schemaFrom(400, { code: 'PGRST205' }), 'missing');
  assert.equal(schemaFrom(401, { message: 'Invalid API key' }), 'unknown', 'a refused key is not a schema answer');
  assert.equal(schemaFrom(500, null), 'unknown');
  assert.deepEqual(settingsFrom(200, { external: { email: true }, mailer_autoconfirm: false }), { ready: true, reason: 'ready' });
  assert.deepEqual(settingsFrom(200, { external: { email: true }, mailer_autoconfirm: true }), { ready: false, reason: 'autoconfirm-on' });
  assert.deepEqual(settingsFrom(200, { external: { email: true } }), { ready: false, reason: 'unknown' }, 'no answer about confirmation is not ready');
  assert.deepEqual(settingsFrom(200, { external: { email: false }, mailer_autoconfirm: false }), { ready: false, reason: 'email-off' });
  assert.deepEqual(settingsFrom(401, { message: 'Invalid API key' }), { ready: false, reason: 'unknown' });
});

test('sign-in off: nothing is asked, and the handle says not ready', async () => {
  const r = createReadiness({ enabled: false }, { session: memoryStorage(), fetchFn: countingFetch, log: () => {} });
  assert.equal(await r.check(), false);
  assert.equal(calls.length, 0);
  const h = createAuthHandle({ config: { enabled: false }, ns: { mode: 'off', uid: null }, forwarding: false });
  assert.equal(await h.ready(), false);
});

test('the client never starts a sign-up, sign-in, resend or reset against a project that is not ready', async () => {
  const config = resolveAuthConfig({ published: { enabled: true, url, key: KEY, mode: 'dev' }, loc, session: memoryStorage() });
  const mk = (ok) => {
    const ls = memoryStorage(), { doc, win } = fakeDom();
    return createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => supabaseLib(), doc, win, loc, storage: ls, onReload: () => {}, readiness: async () => ok });
  };
  const no = mk(false);
  for (const [name, call] of [['signUp', () => no.signUp({ email: 'sky@example.com', password: 'gentle-moon-42' })], ['signIn', () => no.signIn({ email: 'sky@example.com', password: 'gentle-moon-42' })],
    ['resend', () => no.resend({ email: 'sky@example.com' })], ['sendReset', () => no.sendReset({ email: 'sky@example.com' })]]) {
    const res = await call();
    assert.equal(res.ok, false, name);
    assert.equal(res.error.code, 'signup_closed', name);
  }
  const st = await (await fetch(`${url}/__fake/state`)).json().catch(() => null);
  const out = await (await fetch(`${url}/__fake/outbox`)).json();
  assert.equal(out.length, 0, 'no email was sent');
  if (st && Array.isArray(st.users)) assert.equal(st.users.length, 0, 'no account was made');
  // ready: the same call goes through
  const yes = mk(true);
  const su = await yes.signUp({ email: 'sky@example.com', password: 'gentle-moon-42' });
  assert.equal(su.ok, true);
  assert.equal(su.needsConfirmation, true);
  try { (await yes.ensureClient()).auth.stopAutoRefresh(); } catch { /* never loaded */ }
});

test('the app shows a guest\'s account entry only once the project is ready; an account\'s own entry never waits', () => {
  const acc = read('src/app/scenes/account.js');
  const row = acc.slice(acc.indexOf('export function mountAccountRow('), acc.indexOf('function fillAccountRow('));
  assert.match(row, /if \(!signedIn && typeof auth\.ready === 'function'\) \{\s*el\.replaceChildren\(\);\s*auth\.ready\(\)\.then\(\(ok\) => \{ if \(ok\) fillAccountRow\(app, el, auth, u, false\); \}, \(\) => \{\}\);\s*return;\s*\}/);
  // the account scene: a guest (or an ended session) gets the sign-in screens only when ready, else the "off" screen
  assert.match(acc, /if \(usable && lastStatus !== 'signed-in' && typeof auth\.ready === 'function'\) \{\s*usable = await auth\.ready\(\)\.catch\(\(\) => false\);/);
  assert.match(acc, /VM\.initialView\(\{ enabled: usable, status: usable \? lastStatus : 'off',/);
  // a guest's #account link waits for the answer; an account's opens at once
  assert.match(read('src/app/main.js'), /if \(opensAccount && AUTH\.ns\.mode !== 'account'\) \{\s*app\.auth\.ready\(\)\.then\(\(ok\) => \{ if \(ok && stack\[stack\.length - 1\]\?\.name === 'home'\) app\.go\('account'/);
  // the handle passes the same check into the client's entry flows
  const boot = read('src/auth/boot.js');
  assert.match(boot, /real = m\.createAuth\(\{ config, ns, onReload, onExpired, readiness: ready \}\);/);
  assert.match(read('src/auth/client.js'), /const ENTRY_FLOWS = \['signup', 'signin', 'resend', 'reset'\];/);
  // nothing at boot: the question goes out only when the entry would show (Settings, a #account link, the account screen)
  assert.doesNotMatch(boot.slice(boot.indexOf('export function authBoot('), boot.indexOf('export const NOTICE_TEXT')), /ready|readiness/);
});
