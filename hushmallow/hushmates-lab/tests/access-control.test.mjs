// Access control, tested against real servers over HTTP.
//
// Two experiences, strictly apart. Customers get the app (and the safety team its desk);
// on staging and production the only API is the Hushmates Edge Function, which answers a
// verified Supabase sign-in and nothing else. The lab (control room, scenarios, test
// phones, test identities) exists only on a development host and only for an authorised
// tester. Here, the production host is the built files; the development host is the whole
// local stack: real Postgres, the local copy of Supabase Auth (email codes), and the Edge
// Function's own code. These tests try every way in: direct URLs (with traversal tricks),
// no token, forged and expired tokens, a signed-in person without an invitation, an
// ordinary member, other sites' requests, test-only methods, and they check that consent,
// privacy, safety and deletion hold when someone calls the API directly.

import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHushmatesServer, builtFiles } from '../server/server.mjs';
import { labFiles } from '../server/app-files.mjs';
import { build } from '../tools/build-app.mjs';
import { startDevStack } from '../server/dev-stack.mjs';
import { freshDb, FEELING } from './backend-helpers.mjs';

const TESTER_KEY = 'tester-key-for-these-tests-only';
const ANON = 'hushmates-test-anon-key-0001';
const MEMBER_CODES = ['MEMBERONE1', 'MEMBERTWO2', 'MEMBERTRE3', 'MEMBERFOR4', 'MEMBERFIV5', 'MEMBERSIX6', 'MEMBERSEV7', 'MEMBEREIG8'];
const STAFF_CODE = 'STAFFONE01';
const quiet = { error() {}, log() {}, warn() {} };
const nowhereText = (t) => /This page isn’t here/.test(t);

let dist;
test.before(() => {
  dist = mkdtempSync(join(tmpdir(), 'hushmates-dist-'));
  for (const which of ['app', 'staff']) {
    const res = build({ out: join(dist, which), which });
    assert.ok(res.ok, `the ${which} build failed: ${JSON.stringify(res.problems)}`);
  }
});
test.after(() => rmSync(dist, { recursive: true, force: true }));

async function production() {
  const files = builtFiles(join(dist, 'app'));
  for (const [url, file] of builtFiles(join(dist, 'staff'))) files.set(url, file);
  const app = createHushmatesServer({ mode: 'production', files, log: quiet });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  return { app, base: `http://127.0.0.1:${app.server.address().port}`, close: () => app.close() };
}

const freePort = () => new Promise((resolve) => {
  const srv = net.createServer();
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});
/** The whole local stack on a fresh database, with a clock the test moves (the database's too). */
async function stack(o = {}) {
  const db = await freshDb();
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-stack-'));
  const clock = { t: Date.now() };
  const s = await startDevStack({
    port: await freePort(), pool: db.pool, anonKey: ANON, keysFile: join(dir, 'keys.json'), quiet: true, log: quiet,
    testerKey: TESTER_KEY, invites: MEMBER_CODES, staffInvites: [STAFF_CODE], tickMs: 3600e3, now: () => clock.t, moveDbClock: true, ...o,
  });
  return { ...s, base: s.origin, clock, async close() { await s.close(); await db.drop(); rmSync(dir, { recursive: true, force: true }); } };
}

const get = (base, path, { headers = {} } = {}) => fetch(base + path, { redirect: 'manual', headers });
const JSONH = { 'content-type': 'application/json', apikey: ANON };
async function auth(s, path, body, headers = {}) {
  const res = await fetch(`${s.base}/auth/v1${path}`, { method: 'POST', headers: { ...JSONH, ...headers }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}
/** An email code, asked for and typed in, as the app does. → the session */
async function signIn(s, email) {
  assert.equal((await auth(s, '/otp', { email, create_user: true })).status, 200);
  const r = await auth(s, '/verify', { type: 'email', email, token: s.auth.mailbox(email) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
async function rpc(s, token, method, args = {}, headers = {}) {
  const res = await fetch(`${s.base}/functions/v1/hushmates/rpc/${method}`, {
    method: 'POST', headers: { ...JSONH, ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify({ args }),
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}
async function member(s, email, code, name) {
  const session = await signIn(s, email);
  const r = await rpc(s, session.access_token, 'redeemInvite', { code, name, adult: true });
  assert.equal(r.status, 200, `joining with ${code}: ${JSON.stringify(r.body)}`);
  return session.access_token;
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

const LAB_PATHS = ['/lab', '/lab/', '/lab/index.html', '/lab/lab/lab.js', '/lab/lab/lab-notes.js', '/lab/core/relay-seed.js', '/lab/styles/lab.css', '/lab/?key=wrong', '/index.html', '/lab/lab.js', '/lab.js'];
const SERVER_ONLY = ['/core/relay.js', '/core/relay-seed.js', '/core/perspectives.js', '/net/local-network.js', '/lab/lab.js', '/tests/relay.test.mjs', '/tests/relay-helpers.mjs',
  '/tools/shots.cjs', '/tools/build-app.mjs', '/docs/RELAY.md', '/server/server.mjs', '/server/main.mjs', '/server/admin.mjs', '/server/auth-emulator.mjs', '/README.md', '/manifest.json',
  '/dist/app/manifest.json', '/package.json', '/.git/config', '/v1-messaging/index.html', '/.data/dev-keys.json', '/supabase/functions/_shared/gateway.js',
  '/supabase/migrations/20261014090000_hushmates_schema.sql', '/supabase/functions/hushmates/index.ts', '/supabase/config.toml'];
const TRICKS = ['/app/../core/relay.js', '/%2e%2e/core/relay.js', '/app/%2e%2e/core/relay.js', '/ui/..%2fcore/relay.js', '/ui/%2e%2e%2fcore%2frelay.js', '/src/ultra/../../hushmates-lab/core/relay.js',
  '/src/ultra/%2e%2e/%2e%2e/hushmates-lab/core/relay.js', '//core/relay.js', '/app/index.html%00.js', '/app\\..\\core\\relay.js', '/APP/index.html', '/app/index.html/', '/ui/relay/index.js.map', '/lab%2findex.html', '/%6cab/',
  '/staff/../server/admin.mjs', '/staff/%2e%2e/.data/dev-keys.json'];

// ------------------------------------------------------------------ production --
test('production: the app and the safety desk are served with every file they need, and protective headers', async () => {
  const s = await production();
  try {
    const home = await get(s.base, '/');
    assert.equal(home.status, 302);
    assert.equal(home.headers.get('location'), '/app/');
    for (const page of ['/app/', '/staff/']) {
      const res = await get(s.base, page);
      assert.equal(res.status, 200, page);
      const csp = res.headers.get('content-security-policy');
      assert.match(csp, /script-src 'self'; .*connect-src 'self'; .*frame-ancestors 'none'/, page);
      assert.ok(!/8790|localhost|127\.0\.0\.1/.test(csp), `${page} may connect to a local developer service`);
      for (const h of ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'cross-origin-opener-policy', 'strict-transport-security']) assert.ok(res.headers.get(h), `${page} lacks ${h}`);
    }
    for (const which of ['app', 'staff']) {
      const manifest = JSON.parse(readFileSync(join(dist, which, 'manifest.json'), 'utf8'));
      for (const url of Object.keys(manifest.files)) assert.equal((await get(s.base, url)).status, 200, url);
    }
  } finally { await s.close(); }
});

test('production: no lab, no sign-in emulation and no API on the web host, and no way to switch them on', async () => {
  const s = await production();
  try {
    for (const path of [...LAB_PATHS, `/lab/?key=${TESTER_KEY}`, '/auth/v1/otp', '/auth/v1/.well-known/jwks.json', '/functions/v1/hushmates/rpc/me', '/functions/v1/hushmates/health',
      '/functions/v1/hushmates/jobs/tick', '/api/v1/session', '/api/v1/rpc/me']) {
      for (const method of ['GET', 'POST']) {
        const res = await fetch(s.base + path, { method, redirect: 'manual', headers: JSONH, body: method === 'POST' ? '{}' : undefined });
        assert.equal(res.status, 404, `${method} ${path} answered ${res.status}`);
        assert.ok(nowhereText(await res.text()), `${path} looks different from any missing page (it gives something away)`);
        assert.equal(res.headers.get('set-cookie'), null, `${path} set a cookie`);
      }
    }
    assert.equal(s.app.hasLab, false);
    for (const extra of [{ labFiles: labFiles(), testerKey: TESTER_KEY }, { auth: { handle() {} } }, { gateway: { handle() {} } }]) {
      assert.throws(() => createHushmatesServer({ mode: 'production', files: builtFiles(join(dist, 'app')), log: quiet, ...extra }), /no lab/);
    }
  } finally { await s.close(); }
});

test('production: server code, keys, tests, tools, docs and simulated data can’t be fetched, however the address is written', async () => {
  const s = await production();
  try {
    for (const path of [...SERVER_ONLY, ...TRICKS]) {
      const res = await get(s.base, path);
      assert.ok([400, 404].includes(res.status), `${path} answered ${res.status}`);
      const text = await res.text();
      assert.ok(!/RelayService|seedRelay|RELAY_IDENTITIES|MoonMallow|createGateway|serviceKey|dataKey/.test(text), `${path} leaked server or lab code`);
    }
    for (const method of ['PUT', 'DELETE', 'PATCH']) assert.equal((await fetch(`${s.base}/app/index.html`, { method })).status, 404, method);
  } finally { await s.close(); }
});

test('production build for a Supabase project: the page may connect to that project only, and a secret key is refused', async () => {
  const out = mkdtempSync(join(tmpdir(), 'hushmates-deploy-'));
  const jwt = (role) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ iss: 'supabase', ref: 'abcdefghijkl', role, iat: 1, exp: 2e9 })}.c2lnbmF0dXJlLW5vdC1jaGVja2Vk`;
  try {
    const ok = build({ out: join(out, 'app'), deploy: { supabaseUrl: 'https://abcdefghijkl.supabase.co', anonKey: jwt('anon') } });
    assert.ok(ok.ok, JSON.stringify(ok.problems));
    const html = readFileSync(join(out, 'app', 'app', 'index.html'), 'utf8');
    assert.match(html, /connect-src 'self' https:\/\/abcdefghijkl\.supabase\.co;/);
    const config = JSON.parse(readFileSync(join(out, 'app', 'app', 'config.json'), 'utf8'));
    assert.equal(config.supabaseUrl, 'https://abcdefghijkl.supabase.co');
    // the production host's own header policy allows that project too (browsers apply both policies)
    const host = createHushmatesServer({ mode: 'production', files: builtFiles(join(out, 'app')), log: quiet });
    await new Promise((r) => host.server.listen(0, '127.0.0.1', r));
    try {
      const res = await fetch(`http://127.0.0.1:${host.server.address().port}/app/`);
      assert.match(res.headers.get('content-security-policy'), /connect-src 'self' https:\/\/abcdefghijkl\.supabase\.co;/);
    } finally { await host.close(); }
    for (const anonKey of [jwt('service_role'), 'sb_secret_abc123', '']) {
      assert.throws(() => build({ out: join(out, 'bad'), deploy: { supabaseUrl: 'https://abcdefghijkl.supabase.co', anonKey } }), /public/);
    }
    assert.throws(() => build({ out: join(out, 'bad'), deploy: { supabaseUrl: 'http://abcdefghijkl.supabase.co', anonKey: jwt('anon') } }), /https/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('the production build refuses files changed after it was built', () => {
  const copy = mkdtempSync(join(tmpdir(), 'hushmates-tamper-'));
  try {
    assert.ok(build({ out: copy }).ok);
    writeFileSync(join(copy, 'app', 'app.js'), 'window.__lab = true;');
    assert.throws(() => builtFiles(copy), /changed after the build/);
  } finally { rmSync(copy, { recursive: true, force: true }); }
});

// ------------------------------------------------------ the local stack (shared) --
let S;
test.before(async () => { S = await stack(); });
test.after(async () => { await S?.close(); });

test('no sign-in, or a token that isn’t real: nothing but “please sign in”', async () => {
  const s = S;
  const methods = ['me', 'listJourneys', 'exportMyData', 'findFeeling', 'modListReports', 'deleteMyData', 'redeemInvite'];
  const now = Math.floor(s.clock.t / 1000);
  const issuer = `${s.base}/auth/v1`;
  const claims = { iss: issuer, sub: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', exp: now + 600, iat: now };
  const forged = [
    null, '', 'not-a-token', 'a.b.c',
    `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`,                                                     // unsigned
    (() => { const h = b64({ alg: 'HS256', typ: 'JWT' }); const p = b64(claims); return `${h}.${p}.${createHmac('sha256', ANON).update(`${h}.${p}`).digest('base64url')}`; })(), // signed with the public key
  ];
  // a real token with its claims changed
  const real = (await signIn(s, 'someone@example.com')).access_token;
  const [h, , sig] = real.split('.');
  forged.push(`${h}.${b64({ ...claims, sub: 'someone-else' })}.${sig}`, `${h}.${b64({ ...claims, role: 'service_role' })}.${sig}`);
  for (const token of forged) {
    for (const method of methods) {
      const r = await rpc(s, token, method);
      assert.equal(r.status, 401, `${method} with ${String(token).slice(0, 30)} answered ${r.status}`);
      assert.equal(r.body.code, 'not-signed-in');
      assert.equal(r.body.message, 'Please sign in again.');
    }
  }
  // the right shape of request only: GET, other paths and other content types are refused
  assert.equal((await get(s.base, '/functions/v1/hushmates/rpc/me')).status, 405);
  assert.equal((await get(s.base, '/functions/v1/hushmates/rpc2/me')).status, 404);
  const plain = await fetch(`${s.base}/functions/v1/hushmates/rpc/me`, { method: 'POST', headers: { authorization: `Bearer ${real}`, 'content-type': 'text/plain' }, body: '{}' });
  assert.equal(plain.status, 400);
});

test('an expired sign-in is refused, and a refreshed one works', async () => {
  const s = await stack();
  try {
    const session = await signIn(s, 'later@example.com');
    assert.equal((await rpc(s, session.access_token, 'me')).status, 200);
    s.clock.t += 2 * 3600e3;
    assert.equal((await rpc(s, session.access_token, 'me')).status, 401);
    const fresh = await fetch(`${s.base}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: JSONH, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    assert.equal(fresh.status, 200);
    assert.equal((await rpc(s, (await fresh.json()).access_token, 'me')).status, 200);
  } finally { await s.close(); }
});

test('signed in but not invited: only “who am I” and “redeem an invitation”, and only real codes, only adults', async () => {
  const s = S;
  const token = (await signIn(s, 'newcomer@example.com')).access_token;
  const me = await rpc(s, token, 'me');
  assert.equal(me.status, 200);
  assert.deepEqual(Object.keys(me.body.result).sort(), ['needsInvite', 'now']);
  assert.equal(me.body.result.needsInvite, true);
  for (const method of ['listJourneys', 'submitFeeling', 'findFeeling', 'exportMyData', 'deleteMyData', 'modListReports', 'savePreferences']) {
    const r = await rpc(s, token, method, { text: FEELING, consent: true, clientId: 'not-a-member-01' });
    assert.equal(r.status, 403, method);
    assert.equal(r.body.code, 'invite-required');
  }
  const child = await rpc(s, token, 'redeemInvite', { code: MEMBER_CODES[0], name: 'Moonbeam', adult: false });
  assert.equal(child.body.code, 'invalid');
  assert.match(child.body.message, /adults/);
  assert.equal((await rpc(s, token, 'redeemInvite', { code: 'NOTACODE99', name: 'Moonbeam', adult: true })).body.code, 'invite-invalid');
  const joined = await rpc(s, token, 'redeemInvite', { code: MEMBER_CODES[0].toLowerCase().replace(/(.{5})/, '$1-'), name: 'Moonbeam', adult: true });
  assert.equal(joined.status, 200, JSON.stringify(joined.body));
  assert.equal(joined.body.result.isModerator, false);
  assert.equal(joined.body.result.adultConfirmed, true);
  const text = JSON.stringify((await rpc(s, token, 'me')).body);
  assert.ok(!/newcomer@|auth\/v1|"sub"|issuer|subject/.test(text), 'an answer carries the email or the sign-in identity');
  assert.ok(!('test' in (await rpc(s, token, 'me')).body.result), 'the app is told about test identities');
  // an invitation opens one account: a second person can't use it again
  const other = (await signIn(s, 'second@example.com')).access_token;
  assert.equal((await rpc(s, other, 'redeemInvite', { code: MEMBER_CODES[0], name: 'Someone', adult: true })).body.code, 'invite-invalid');
});

test('guessing invitations is slowed down (per person, and per network)', async () => {
  const s = await stack();
  try {
    const guess = async (token, n) => { const out = []; for (let i = 0; i < n; i++) out.push((await rpc(s, token, 'redeemInvite', { code: `GUESSCODE${i}`, name: 'Moonbeam', adult: true })).body.code); return out; };
    const first = (await signIn(s, 'guesser@example.com')).access_token;
    const codes = await guess(first, 12);
    assert.deepEqual(codes.slice(0, 10), Array(10).fill('invite-invalid'));
    assert.deepEqual(codes.slice(10), ['rate-limited', 'rate-limited'], 'a person can keep guessing');
    // new accounts on the same network get a few more tries (people share homes), then that network waits too;
    // the address is never stored, only a keyed hash of it
    for (const n of [2, 3]) assert.deepEqual(await guess((await signIn(s, `guesser${n}@example.com`)).access_token, 10), Array(10).fill('invite-invalid'));
    const fourth = (await signIn(s, 'guesser4@example.com')).access_token;
    assert.equal((await rpc(s, fourth, 'redeemInvite', { code: MEMBER_CODES[1], name: 'Moonbeam', adult: true })).body.code, 'rate-limited', 'a network can keep guessing');
    // and a header can't pretend to be another network
    assert.equal((await rpc(s, fourth, 'redeemInvite', { code: MEMBER_CODES[1], name: 'Moonbeam', adult: true }, { 'x-forwarded-for': '203.0.113.9' })).body.code, 'rate-limited');
  } finally { await s.close(); }
});

test('a member can’t reach the lab, any testing method, the scheduler or the safety desk’s methods', async () => {
  const s = S;
  const token = await member(s, 'member1@example.com', MEMBER_CODES[1], 'Starling');
  for (const path of LAB_PATHS) {
    const res = await get(s.base, path, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(res.status, 404, `${path} answered ${res.status} for a member`);
    assert.ok(nowhereText(await res.text()), path);
  }
  for (const method of ['createTestAccount', 'signInTestAccount', 'seedRelay', 'createMember', 'issueSession', 'endSession', 'tick', 'toJSON', 'subscribe',
    'mallowContext', 'jobTick', 'job_tick', 'admin_create_invite', 'adminSetSetting', '_actor', 'constructor', 'hasOwnProperty', 'advance', 'setClock', 'clock', 'reset', 'rpc']) {
    const r = await rpc(s, token, method, { key: 'moon' });
    assert.equal(r.status, 404, `${method} answered ${r.status}`);
  }
  for (const bad of ['__proto__', 'me.x', 'me/x', 'me%2F..%2FexportMyData', 'x'.repeat(41)]) {
    const res = await fetch(`${s.base}/functions/v1/hushmates/rpc/${bad}`, { method: 'POST', headers: { ...JSONH, authorization: `Bearer ${token}` }, body: '{"args":{}}' });
    assert.ok([404, 400].includes(res.status), `${bad} answered ${res.status}`);
  }
  for (const method of ['modListReports', 'modGetReport', 'modResolve', 'modAuditLog']) {
    const r = await rpc(s, token, method, { id: '00000000-0000-4000-8000-000000000001', action: 'dismiss' });
    assert.equal(r.status, 403, method);
    assert.equal(r.body.code, 'forbidden');
  }
  // the scheduler's routes answer only to its secret
  for (const path of ['/jobs/tick', '/jobs/retention']) {
    for (const headers of [{}, { authorization: `Bearer ${token}` }, { 'x-hushmates-job': 'guess' }]) {
      const res = await fetch(`${s.base}/functions/v1/hushmates${path}`, { method: 'POST', headers: { ...JSONH, ...headers }, body: '{}' });
      assert.equal(res.status, 404, `${path} ${JSON.stringify(headers)}`);
    }
    const res = await fetch(`${s.base}/functions/v1/hushmates${path}`, { method: 'POST', headers: { ...JSONH, 'x-hushmates-job': s.keys.jobSecret }, body: '{}' });
    assert.equal(res.status, 200, path);
  }
  // a safety team invitation opens the desk's methods
  const mod = await member(s, 'safety@example.com', STAFF_CODE, 'Careful Cloud');
  assert.equal((await rpc(s, mod, 'modListReports')).status, 200);
  assert.equal((await rpc(s, mod, 'me')).body.result.isModerator, true);
});

test('other sites can’t call the API, and get no permission to read its answers', async () => {
  const s = S;
  const token = (await signIn(s, 'csrf@example.com')).access_token;
  const pre = await fetch(`${s.base}/functions/v1/hushmates/rpc/me`, { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } });
  assert.equal(pre.headers.get('access-control-allow-origin'), null);
  const own = await fetch(`${s.base}/functions/v1/hushmates/rpc/me`, { method: 'OPTIONS', headers: { origin: s.base, 'access-control-request-method': 'POST' } });
  assert.equal(own.headers.get('access-control-allow-origin'), s.base);
  for (const origin of ['https://evil.example', 'null', `${s.base}.evil.example`]) {
    const r = await rpc(s, token, 'me', {}, { origin });
    assert.equal(r.status, 403, origin);
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  }
});

test('consent, safety and privacy hold for anyone calling the API directly', async () => {
  const s = S;
  const author = await member(s, 'author@example.com', MEMBER_CODES[2], 'Moonbeam');
  const other = await member(s, 'other@example.com', MEMBER_CODES[3], 'Wrenlet');
  // no consent, no release
  assert.equal((await rpc(s, author, 'submitFeeling', { text: FEELING, clientId: 'no-consent-0001' })).body.code, 'consent-required');
  // words that suggest someone isn't safe get support, and are never stored or sent
  const crisis = await rpc(s, author, 'submitFeeling', { text: 'I want to end it all', consent: true, clientId: 'crisis-00000001' });
  assert.equal(crisis.body.result.status, 'support');
  assert.equal((await rpc(s, author, 'listJourneys')).body.result.journeys.length, 0);
  const stored = await s.pool.query('select count(*)::int n from hushmates.journeys');
  assert.equal(stored.rows[0].n, 0, 'words needing care were stored');
  // a real release, kept encrypted
  const released = await rpc(s, author, 'submitFeeling', { text: FEELING, label: 'worry', consent: true, allowFallback: true, clientId: 'release-0000001' });
  const id = released.body.result.journey.id;
  const row = (await s.pool.query('select text_enc from hushmates.journeys where id = $1', [id])).rows[0];
  assert.match(row.text_enc, /^hmenc:v1:/);
  assert.ok(!JSON.stringify((await s.pool.query('select * from hushmates.journeys')).rows).includes('avoiding'), 'the feeling is readable in the database');
  // someone else can't read, change or export it
  for (const [method, args] of [['getJourney', { journeyId: id }], ['withdrawFeeling', { journeyId: id }], ['deleteJourney', { journeyId: id, confirm: 'DELETE' }], ['askMallow', { journeyId: id }]]) {
    assert.equal((await rpc(s, other, method, args)).body.code, 'not-found', method);
  }
  const theirs = JSON.stringify((await rpc(s, other, 'exportMyData', { accountId: 'anyone', journeyId: id })).body.result);
  assert.ok(!theirs.includes('avoiding') && !theirs.includes('Moonbeam'), 'another person’s export reveals the feeling or its author');
  // a catcher never learns who wrote it, and never catches their own
  assert.equal((await rpc(s, author, 'findFeeling')).body.result?.offer ?? null, null, 'someone was offered their own feeling');
  await rpc(s, other, 'savePreferences', { catching: true });
  const offer = (await rpc(s, other, 'findFeeling')).body.result.offer;
  assert.ok(offer, 'the catcher was offered nothing');
  assert.ok(!/Moonbeam|author@|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/.test(JSON.stringify({ ...offer, holdId: undefined })), 'the offer identifies its author');
  await rpc(s, other, 'catchFeeling', { holdId: offer.holdId });
  const unkind = await rpc(s, other, 'submitReframe', { holdId: offer.holdId, text: 'Call me on 0412 345 678 and we can talk properly', clientId: 'reframe-000001' });
  assert.ok(unkind.status >= 400, 'contact details passed screening');
  // a Mallow can't be asked before its time, and the time can't be moved from outside
  assert.equal((await rpc(s, author, 'askMallow', { journeyId: id })).body.code, 'fallback-not-yet');
  for (const m of ['advance', 'setClock', 'tick']) assert.equal((await rpc(s, author, m, { ms: 864e5 })).status, 404, m);
});

test('the same person on a new device has everything; deleting their data ends the sign-in for good', async () => {
  const s = S;
  const phone = await member(s, 'two-devices@example.com', MEMBER_CODES[4], 'Fernlight');
  await rpc(s, phone, 'submitFeeling', { text: FEELING, label: 'worry', consent: true, clientId: 'keep-me-000001' });
  await rpc(s, phone, 'savePreferences', { mallow: 'pipzi' });
  // a laptop: the same email, a new code, the same account
  const laptop = (await signIn(s, 'two-devices@example.com')).access_token;
  assert.equal((await rpc(s, laptop, 'listJourneys')).body.result.journeys.length, 1, 'the new device lost the feeling');
  assert.equal((await rpc(s, laptop, 'me')).body.result.profile.mallow, 'pipzi', 'the new device lost the Mallow');
  assert.equal((await rpc(s, laptop, 'me')).body.result.profile.pseudonym, 'Fernlight');
  // signing out on one device leaves the account (and other people's) alone
  assert.equal((await fetch(`${s.base}/auth/v1/logout?scope=local`, { method: 'POST', headers: { ...JSONH, authorization: `Bearer ${phone}` } })).status, 204);
  assert.equal((await rpc(s, laptop, 'listJourneys')).body.result.journeys.length, 1);
  // deleting: confirmed only with the word, then the account and its sign-in are gone
  assert.equal((await rpc(s, laptop, 'deleteMyData', { confirm: 'yes' })).body.code, 'invalid');
  const del = await rpc(s, laptop, 'deleteMyData', { confirm: 'DELETE' });
  assert.equal(del.status, 200);
  assert.deepEqual(del.body.result, { deleted: true });
  const user = await fetch(`${s.base}/auth/v1/user`, { headers: { apikey: ANON, authorization: `Bearer ${laptop}` } });
  assert.ok([401, 403].includes(user.status), 'the sign-in still exists');
  // the token's signature is still valid until it expires, but it leads to nothing that was theirs
  assert.equal((await rpc(s, laptop, 'me')).body.result.needsInvite, true);
  assert.equal((await rpc(s, laptop, 'listJourneys')).body.code, 'invite-required');
  const left = (await s.pool.query("select count(*)::int n from hushmates.journeys where text_enc <> ''")).rows[0].n;
  const theirs = (await s.pool.query("select count(*)::int n from hushmates.journeys j join hushmates.members m on m.id = j.owner where m.state = 'deleted' and j.text_enc <> ''")).rows[0].n;
  assert.equal(theirs, 0, 'a deleted account’s words are still stored');
  assert.ok(left >= 1, 'deleting one account removed someone else’s feeling');
  // and the email can sign up afresh, as a new person with nothing of the old account
  const again = (await signIn(s, 'two-devices@example.com')).access_token;
  assert.equal((await rpc(s, again, 'me')).body.result.needsInvite, true);
});

// --------------------------------------------------------------- the tester --
test('development: the lab opens only for the tester key, and only as a cookie this page can’t read', async () => {
  const s = S;
  assert.equal(s.hasLab, true);
  assert.equal((await get(s.base, '/lab/')).status, 404);
  assert.equal((await get(s.base, '/lab/?key=not-the-key-at-all')).status, 404);
  assert.equal((await get(s.base, `/lab/index.html?key=${TESTER_KEY}`)).status, 404, 'the key is only accepted at /lab/');
  const enter = await get(s.base, `/lab/?key=${TESTER_KEY}`);
  assert.equal(enter.status, 303);
  assert.equal(enter.headers.get('location'), '/lab/', 'the key stays in the address bar');
  const set = enter.headers.getSetCookie()[0];
  assert.match(set, /^hm_tester=/);
  for (const flag of ['HttpOnly', 'SameSite=Strict']) assert.ok(set.includes(flag), flag);
  const cookie = set.split(';')[0];
  const lab = await get(s.base, '/lab/', { headers: { cookie } });
  assert.equal(lab.status, 200);
  assert.match(await lab.text(), /Control room/);
  for (const path of ['/lab/lab/lab.js', '/lab/core/relay-seed.js', '/lab/net/local-network.js', '/lab/styles/lab.css']) assert.equal((await get(s.base, path, { headers: { cookie } })).status, 200, path);
  assert.equal((await get(s.base, '/lab/', { headers: { cookie: `hm_tester=${'A'.repeat(43)}` } })).status, 404);
  // the tester's cookie is not an account: the API still wants a real sign-in
  const r = await fetch(`${s.base}/functions/v1/hushmates/rpc/me`, { method: 'POST', headers: { ...JSONH, cookie }, body: '{}' });
  assert.equal(r.status, 401);
});

test('development: no tester key (or too short a key) means no lab at all', async () => {
  for (const testerKey of [null, 'short-key']) {
    const s = await stack({ testerKey });
    try {
      assert.equal(s.hasLab, false);
      assert.equal((await get(s.base, `/lab/?key=${testerKey}`)).status, 404);
      assert.equal((await get(s.base, '/lab/')).status, 404);
    } finally { await s.close(); }
  }
});

test('development: the app and the desk are served only from what they import (no lab, tests, keys or server code)', async () => {
  const s = S;
  for (const page of ['/app/', '/staff/', '/app/config.json']) assert.equal((await get(s.base, page)).status, 200, page);
  for (const path of [...SERVER_ONLY, ...TRICKS]) assert.ok([400, 404].includes((await get(s.base, path)).status), path);
});
