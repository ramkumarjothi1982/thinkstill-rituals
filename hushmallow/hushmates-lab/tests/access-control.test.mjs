// Access control, tested against real servers over HTTP.
//
// Two experiences, strictly apart: customers get the app and its API; the lab
// (control room, scenarios, test phones, test identities) exists only on a
// development server and only for an authorised tester. These tests try every
// way in: direct URLs (with traversal tricks), no session, an ordinary
// member's session, forged and stolen-looking cookies, other sites' requests,
// test-only methods through the API, and they check that consent, privacy and
// safety rules still hold when someone calls the API directly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHushmatesServer, builtFiles } from '../server/server.mjs';
import { appFiles, labFiles } from '../server/app-files.mjs';
import { build } from '../tools/build-app.mjs';
import { FEELING } from './relay-helpers.mjs';

const TESTER_KEY = 'tester-key-for-these-tests-only';
const INVITES = ['MEMBER-ONE', 'MEMBER-TWO', 'MEMBER-THREE', 'MEMBER-FOUR', 'MEMBER-FIVE', 'MEMBER-SIX', 'MEMBER-SEVEN'].map((code) => ({ code, role: 'member' }));
const STAFF = { code: 'STAFF-ONE', role: 'moderator' };
const quiet = { error() {}, log() {}, warn() {} };

let dist;
test.before(() => {
  dist = mkdtempSync(join(tmpdir(), 'hushmates-dist-'));
  const res = build({ out: dist });
  assert.ok(res.ok, `the build failed: ${JSON.stringify(res.problems)}`);
});
test.after(() => rmSync(dist, { recursive: true, force: true }));

async function serve(options) {
  const clock = { t: Date.UTC(2026, 9, 14, 9) };
  const app = createHushmatesServer({ invites: [...INVITES, STAFF], now: () => clock.t, log: quiet, ...options });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return { app, base, clock, close: () => app.close() };
}
const production = () => serve({ mode: 'production', files: builtFiles(dist) });
const development = (o = {}) => serve({ mode: 'development', files: appFiles(), labFiles: labFiles(), testerKey: TESTER_KEY, ...o });

const SAME = { 'content-type': 'application/json', 'x-hushmates': '1' };
async function get(base, path, { cookie, headers = {} } = {}) {
  return fetch(base + path, { redirect: 'manual', headers: { ...(cookie ? { cookie } : {}), ...headers } });
}
async function post(base, path, body = {}, { cookie, headers = SAME, method = 'POST' } = {}) {
  return fetch(base + path, { method, redirect: 'manual', headers: { ...headers, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
}
const jar = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
async function join_(base, code, name = 'Moonbeam') {
  const res = await post(base, '/api/v1/session', { invite: code, name, adult: true });
  assert.equal(res.status, 200, `joining with ${code} failed: ${await res.text()}`);
  return jar(res);
}
async function rpc(base, cookie, method, args = {}, headers) {
  const res = await post(base, `/api/v1/rpc/${method}`, { args }, { cookie, headers });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const LAB_PATHS = ['/lab', '/lab/', '/lab/index.html', '/lab/lab/lab.js', '/lab/lab/lab-notes.js', '/lab/core/relay-seed.js', '/lab/styles/lab.css', '/lab/?key=wrong', '/index.html', '/lab/lab.js', '/lab.js'];
const SERVER_ONLY = ['/core/relay.js', '/core/relay-seed.js', '/core/perspectives.js', '/net/local-network.js', '/lab/lab.js', '/tests/relay.test.mjs', '/tests/relay-helpers.mjs',
  '/tools/shots.cjs', '/tools/build-app.mjs', '/docs/RELAY.md', '/server/server.mjs', '/server/main.mjs', '/README.md', '/manifest.json', '/dist/app/manifest.json', '/package.json', '/.git/config', '/v1-messaging/index.html'];
const TRICKS = ['/app/../core/relay.js', '/%2e%2e/core/relay.js', '/app/%2e%2e/core/relay.js', '/ui/..%2fcore/relay.js', '/ui/%2e%2e%2fcore%2frelay.js', '/src/ultra/../../hushmates-lab/core/relay.js',
  '/src/ultra/%2e%2e/%2e%2e/hushmates-lab/core/relay.js', '//core/relay.js', '/app/index.html%00.js', '/app\\..\\core\\relay.js', '/APP/index.html', '/app/index.html/', '/ui/relay/index.js.map', '/lab%2findex.html', '/%6cab/'];

// ------------------------------------------------------------------ production --
test('production: the app and every file it needs are served, with protective headers', async () => {
  const s = await production();
  try {
    const home = await get(s.base, '/');
    assert.equal(home.status, 302);
    assert.equal(home.headers.get('location'), '/app/');
    const page = await get(s.base, '/app/');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /script-src 'self'; .*connect-src 'self'; .*frame-ancestors 'none'/);
    assert.ok(!/8790|localhost|127\.0\.0\.1/.test(page.headers.get('content-security-policy')), 'the app may connect to a local developer service');
    for (const h of ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'cross-origin-opener-policy']) assert.ok(page.headers.get(h), `missing ${h}`);
    const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
    for (const url of Object.keys(manifest.files)) assert.equal((await get(s.base, url)).status, 200, url);
  } finally { await s.close(); }
});

test('production: the lab, test phones, control room and test data have no address at all', async () => {
  const s = await production();
  try {
    const nowhere = await (await get(s.base, '/no-such-page')).text();
    for (const path of [...LAB_PATHS, `/lab/?key=${TESTER_KEY}`]) {
      const res = await get(s.base, path);
      assert.equal(res.status, 404, `${path} answered ${res.status}`);
      assert.equal(await res.text(), nowhere, `${path} looks different from any missing page (it gives the lab away)`);
      assert.equal(res.headers.get('set-cookie'), null, `${path} set a cookie`);
    }
    assert.equal(s.app.hasLab, false);
    assert.throws(() => createHushmatesServer({ mode: 'production', files: builtFiles(dist), labFiles: labFiles(), testerKey: TESTER_KEY, log: quiet }), /no lab/);
  } finally { await s.close(); }
});

test('production: server code, tests, tools, docs and simulated data can’t be fetched, however the address is written', async () => {
  const s = await production();
  try {
    for (const path of [...SERVER_ONLY, ...TRICKS]) {
      const res = await get(s.base, path);
      assert.ok([400, 404].includes(res.status), `${path} answered ${res.status}`);
      const text = await res.text();
      assert.ok(!/RelayService|seedRelay|RELAY_IDENTITIES|MoonMallow/.test(text), `${path} leaked server or lab code`);
    }
    for (const method of ['PUT', 'DELETE', 'PATCH']) assert.equal((await fetch(`${s.base}/app/index.html`, { method })).status, 404, method);
  } finally { await s.close(); }
});

test('production: test identities can’t exist, and fixed testing examples are refused', async () => {
  const s = await production();
  try {
    const svc = s.app.service;
    assert.equal(svc.testMode, false);
    assert.equal(svc.cannedExamples, false);
    assert.throws(() => svc.createTestAccount({ key: 'moon', pseudonym: 'MoonMallow' }), (e) => e.code === 'forbidden');
    assert.throws(() => svc.signInTestAccount('moon'), (e) => e.code === 'forbidden');
    const { seedRelay } = await import('../core/relay-seed.js');
    assert.throws(() => seedRelay(svc), (e) => e.code === 'forbidden');
    assert.equal(Object.values(svc.s.accounts).filter((a) => a.test).length, 0);
    // nobody can join as a test identity either
    for (const invite of ['moon', 'cloud', 'mod', 'MOON']) {
      const res = await post(s.base, '/api/v1/session', { invite, name: 'MoonMallow', adult: true });
      assert.equal(res.status, 400, invite);
    }
  } finally { await s.close(); }
});

// -------------------------------------------------------------- unauthenticated --
test('no session: nothing but “not signed in”', async () => {
  const s = await production();
  try {
    assert.deepEqual(await (await get(s.base, '/api/v1/session')).json(), { ok: true, signedIn: false });
    for (const method of ['me', 'listJourneys', 'exportMyData', 'findFeeling', 'modListReports', 'deleteMyData']) {
      const r = await rpc(s.base, null, method);
      assert.equal(r.status, 401, method);
      assert.equal(r.body.code, 'not-signed-in');
    }
    assert.equal((await get(s.base, '/api/v1/events')).status, 401);
    assert.equal((await get(s.base, '/api/v1/rpc/me')).status, 405);
    assert.equal((await get(s.base, '/api/v2/rpc/me')).status, 404);
  } finally { await s.close(); }
});

test('joining: only a real invitation, only adults; the session is an HttpOnly cookie and nothing secret reaches the page', async () => {
  const s = await production();
  try {
    const bad = await post(s.base, '/api/v1/session', { invite: 'GUESS', name: 'Moonbeam', adult: true });
    assert.equal(bad.status, 400);
    assert.equal(bad.headers.get('set-cookie'), null);
    const child = await post(s.base, '/api/v1/session', { invite: 'MEMBER-ONE', name: 'Moonbeam', adult: false });
    assert.equal(child.status, 400);
    assert.match((await child.json()).message, /adults/);
    const res = await post(s.base, '/api/v1/session', { invite: 'member-one', name: 'Moonbeam', adult: true });
    assert.equal(res.status, 200);
    const set = res.headers.getSetCookie()[0];
    assert.match(set, /^hm_session=[A-Za-z0-9_-]{40,};/);
    for (const flag of ['HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/']) assert.ok(set.includes(flag), `cookie lacks ${flag}`);
    const body = await res.text();
    assert.ok(!/tok_|acc_/.test(body), 'the sign-in answer exposes an internal token or id');
    const cookie = jar(res);
    const me = await rpc(s.base, cookie, 'me');
    assert.equal(me.status, 200);
    assert.ok(!JSON.stringify(me.body).includes('tok_'), 'an answer carries the internal session token');
    assert.ok(!('test' in me.body.result), 'the app is told about test identities');
    assert.equal(me.body.result.isModerator, false);
    assert.equal(me.body.result.adultConfirmed, true);
    // an invitation opens one account: a second person can't take it over with another name
    assert.equal((await post(s.base, '/api/v1/session', { invite: 'MEMBER-ONE', name: 'Someone', adult: true })).status, 400);
  } finally { await s.close(); }
});

test('joining: guessing invitations is slowed down', async () => {
  const s = await production();
  try {
    const codes = [];
    for (let i = 0; i < 12; i++) codes.push((await post(s.base, '/api/v1/session', { invite: `GUESS-${i}`, name: 'Moonbeam', adult: true })).status);
    assert.deepEqual(codes.slice(0, 10), Array(10).fill(400));
    assert.equal(codes[10], 429);
  } finally { await s.close(); }
});

// ------------------------------------------------------------- ordinary members --
test('an ordinary member can’t reach the lab or any testing method, however they ask', async () => {
  const s = await development();
  try {
    const cookie = await join_(s.base, 'MEMBER-ONE');
    const nowhere = await (await get(s.base, '/no-such-page')).text();
    for (const path of LAB_PATHS) {
      const res = await get(s.base, path, { cookie });
      assert.equal(res.status, 404, `${path} answered ${res.status} for a member`);
      assert.equal(await res.text(), nowhere, path);
    }
    for (const method of ['createTestAccount', 'signInTestAccount', 'seedRelay', 'createMember', 'issueSession', 'endSession', 'tick', 'toJSON', 'subscribe',
      '_actor', '_items', '_rand', 'constructor', 'hasOwnProperty', 'advance', 'fixture', 'play', 'setClock', 'clock', 'reset']) {
      const r = await rpc(s.base, cookie, method, { key: 'moon' });
      assert.equal(r.status, 404, `${method} answered ${r.status}`);
    }
    // (a path like me/../x is tidied by the browser into an ordinary call of x for yourself; encoded, it's refused)
    for (const bad of ['__proto__', 'me.x', 'me/x', 'me%2F..%2FexportMyData', 'x'.repeat(41)]) {
      const res = await post(s.base, `/api/v1/rpc/${bad}`, { args: {} }, { cookie });
      assert.ok([404, 400].includes(res.status), `${bad} answered ${res.status}`);
    }
  } finally { await s.close(); }
});

test('safety-desk methods answer only to moderators', async () => {
  const s = await production();
  try {
    const member = await join_(s.base, 'MEMBER-ONE');
    for (const method of ['modListReports', 'modGetReport', 'modResolve', 'modAuditLog']) {
      const r = await rpc(s.base, member, method, { id: 'rep_x', action: 'dismiss' });
      assert.equal(r.status, 403, method);
      assert.equal(r.body.code, 'forbidden');
    }
    const mod = await join_(s.base, 'STAFF-ONE', 'Careful Cloud');
    assert.equal((await rpc(s.base, mod, 'modListReports')).status, 200);
  } finally { await s.close(); }
});

// ------------------------------------------------------------------- the tester --
test('development: the lab opens only for the tester key, and only as a cookie this page can’t read', async () => {
  const s = await development();
  try {
    assert.equal(s.app.hasLab, true);
    assert.equal((await get(s.base, '/lab/')).status, 404);
    assert.equal((await get(s.base, '/lab/?key=not-the-key-at-all')).status, 404);
    assert.equal((await get(s.base, `/lab/index.html?key=${TESTER_KEY}`)).status, 404, 'the key is only accepted at /lab/');
    const enter = await get(s.base, `/lab/?key=${TESTER_KEY}`);
    assert.equal(enter.status, 303);
    assert.equal(enter.headers.get('location'), '/lab/', 'the key stays in the address bar');
    const set = enter.headers.getSetCookie()[0];
    assert.match(set, /^hm_tester=/);
    for (const flag of ['HttpOnly', 'SameSite=Strict']) assert.ok(set.includes(flag), flag);
    const tester = jar(enter);
    const lab = await get(s.base, '/lab/', { cookie: tester });
    assert.equal(lab.status, 200);
    assert.match(await lab.text(), /Control room/);
    for (const path of ['/lab/lab/lab.js', '/lab/core/relay-seed.js', '/lab/net/local-network.js', '/lab/styles/lab.css']) assert.equal((await get(s.base, path, { cookie: tester })).status, 200, path);
    // the tester's cookie is not a forged one away
    assert.equal((await get(s.base, '/lab/', { cookie: 'hm_tester=' + 'A'.repeat(43) })).status, 404);
    // and it is not an account: it opens no API, and the API still has no testing methods
    assert.equal((await rpc(s.base, tester, 'me')).status, 401);
    const both = `${tester}; ${await join_(s.base, 'MEMBER-TWO')}`;
    assert.equal((await rpc(s.base, both, 'signInTestAccount', { key: 'moon' })).status, 404);
    assert.equal(s.app.service.testMode, false, 'the development server’s service allows test identities');
  } finally { await s.close(); }
});

test('development: no tester key (or too short a key) means no lab at all', async () => {
  for (const testerKey of [null, '', 'short-key']) {
    const s = await development({ testerKey });
    try {
      assert.equal(s.app.hasLab, false);
      assert.equal((await get(s.base, `/lab/?key=${testerKey}`)).status, 404);
      assert.equal((await get(s.base, '/lab/')).status, 404);
    } finally { await s.close(); }
  }
});

test('development: the app is served only from what it imports (no lab, tests or server code)', async () => {
  const s = await development();
  try {
    assert.equal((await get(s.base, '/app/')).status, 200);
    for (const path of [...SERVER_ONLY, ...TRICKS]) assert.ok([400, 404].includes((await get(s.base, path)).status), path);
  } finally { await s.close(); }
});

// ------------------------------------------------------------- cookies and CSRF --
test('forged, replayed-from-elsewhere and leaked cookies open nothing', async () => {
  const s = await production();
  try {
    const cookie = await join_(s.base, 'MEMBER-ONE');
    const internal = Object.keys(s.app.service.s.sessions)[0];
    for (const forged of ['hm_session=' + 'A'.repeat(43), `hm_session=${internal}`, 'hm_session=', `hm_session=${'x'.repeat(5000)}`, 'session=anything', `hm_session=${cookie.split('=')[1]}x`]) {
      assert.equal((await rpc(s.base, forged, 'me')).status, 401, forged.slice(0, 40));
    }
    // signed out: the old cookie is dead
    assert.equal((await post(s.base, '/api/v1/session', {}, { cookie, method: 'DELETE' })).status, 200);
    assert.equal((await rpc(s.base, cookie, 'me')).status, 401);
  } finally { await s.close(); }
});

test('changes from another site are refused (CSRF), even with a valid cookie', async () => {
  const s = await production();
  try {
    const cookie = await join_(s.base, 'MEMBER-ONE');
    const args = { text: FEELING, consent: true, clientId: 'csrf-0000-attempt' };
    const variants = [
      { 'content-type': 'application/json' },                                             // no custom header
      { 'content-type': 'text/plain', 'x-hushmates': '1' },                                // a "simple" form-like request
      { 'content-type': 'application/x-www-form-urlencoded', 'x-hushmates': '1' },
      { ...SAME, origin: 'https://evil.example' },
      { ...SAME, origin: 'null' },
      { ...SAME, 'sec-fetch-site': 'cross-site' },
      { ...SAME, 'sec-fetch-site': 'same-site' },
    ];
    for (const headers of variants) {
      const r = await rpc(s.base, cookie, 'submitFeeling', args, headers);
      assert.equal(r.status, 403, JSON.stringify(headers));
    }
    assert.equal((await post(s.base, '/api/v1/session', {}, { cookie, method: 'DELETE', headers: { 'content-type': 'application/json' } })).status, 403, 'a cross-site sign-out went through');
    assert.equal((await rpc(s.base, cookie, 'listJourneys')).body.result.journeys.length, 0, 'a refused request still released a feeling');
  } finally { await s.close(); }
});

// ------------------------------------------- the rules hold when the API is called directly --
test('consent, safety and privacy hold for anyone calling the API directly', async () => {
  const s = await production();
  try {
    const author = await join_(s.base, 'MEMBER-ONE', 'Moonbeam');
    const other = await join_(s.base, 'MEMBER-TWO', 'Starling');
    // no consent, no release
    const noConsent = await rpc(s.base, author, 'submitFeeling', { text: FEELING, clientId: 'no-consent-0001' });
    assert.equal(noConsent.body.code, 'consent-required');
    // words that suggest someone isn't safe get support, and are never stored or sent
    const crisis = await rpc(s.base, author, 'submitFeeling', { text: 'I want to end it all', consent: true, clientId: 'crisis-00000001' });
    assert.equal(crisis.body.result.status, 'support');
    assert.equal((await rpc(s.base, author, 'listJourneys')).body.result.journeys.length, 0);
    // a real release
    const released = await rpc(s.base, author, 'submitFeeling', { text: FEELING, label: 'worry', consent: true, allowFallback: true, clientId: 'release-0000001' });
    const id = released.body.result.journey.id;
    // someone else can't read, change or export it
    for (const [method, args] of [['getJourney', { journeyId: id }], ['withdrawFeeling', { journeyId: id }], ['deleteJourney', { journeyId: id, confirm: 'DELETE' }], ['askMallow', { journeyId: id }]]) {
      assert.equal((await rpc(s.base, other, method, args)).body.code, 'not-found', method);
    }
    const theirs = JSON.stringify((await rpc(s.base, other, 'exportMyData', { accountId: 'anyone', journeyId: id })).body.result);
    assert.ok(!theirs.includes(FEELING) && !theirs.includes('Moonbeam'), 'another person’s export reveals the feeling or its author');
    // a catcher never learns who wrote it
    assert.equal((await rpc(s.base, other, 'findFeeling')).body.code, 'not-catching', 'catching is off until the person turns it on');
    await rpc(s.base, other, 'savePreferences', { catching: true });
    const offer = (await rpc(s.base, other, 'findFeeling')).body.result.offer;
    assert.ok(offer && !JSON.stringify(offer).includes('Moonbeam') && !JSON.stringify(offer).includes('acc_'));
    await rpc(s.base, other, 'catchFeeling', { holdId: offer.holdId });
    const unkind = await rpc(s.base, other, 'submitReframe', { holdId: offer.holdId, text: 'Call me on 07700 900123 and we can talk properly', clientId: 'reframe-000001' });
    assert.ok(unkind.status >= 400, 'contact details passed screening');
    // a Mallow can't be asked before its time, and the time can't be moved from outside
    assert.equal((await rpc(s.base, author, 'askMallow', { journeyId: id })).body.code, 'fallback-not-yet');
    for (const m of ['advance', 'setClock', 'tick']) assert.equal((await rpc(s.base, author, m, { ms: 864e5 })).status, 404, m);
    // after its time, the Mallow perspective is real (the Reframe library), never a testing example
    s.clock.t += 31 * 60e3;
    const asked = await rpc(s.base, author, 'askMallow', { journeyId: id });
    const persp = asked.body.result.collection.find((p) => p.kind === 'mallow');
    assert.equal(persp.source, 'library');
    assert.equal(persp.label, 'A Mallow perspective · Automatically generated');
  } finally { await s.close(); }
});

test('deleting your data ends the session for good; signing out keeps it for the same invitation and name', async () => {
  const s = await production();
  try {
    const cookie = await join_(s.base, 'MEMBER-ONE', 'Moonbeam');
    await rpc(s.base, cookie, 'submitFeeling', { text: FEELING, label: 'worry', consent: true, clientId: 'keep-me-000001' });
    await post(s.base, '/api/v1/session', {}, { cookie, method: 'DELETE' });
    assert.equal((await post(s.base, '/api/v1/session', { invite: 'MEMBER-ONE', name: 'Someone else', adult: true })).status, 400, 'another name opened the account');
    const back = await join_(s.base, 'MEMBER-ONE', 'moonbeam');
    assert.equal((await rpc(s.base, back, 'listJourneys')).body.result.journeys.length, 1, 'coming back lost the feeling');
    const del = await post(s.base, '/api/v1/rpc/deleteMyData', { args: { confirm: 'DELETE' } }, { cookie: back });
    assert.equal(del.status, 200);
    assert.match(del.headers.getSetCookie()[0], /hm_session=;.*Max-Age=0/);
    assert.equal((await rpc(s.base, back, 'me')).status, 401);
    assert.equal((await post(s.base, '/api/v1/session', { invite: 'MEMBER-ONE', name: 'Moonbeam', adult: true })).status, 400, 'a deleted account came back');
  } finally { await s.close(); }
});

test('live updates reach only the person they are about', async () => {
  const s = await production();
  try {
    const a = await join_(s.base, 'MEMBER-ONE', 'Moonbeam');
    const b = await join_(s.base, 'MEMBER-TWO', 'Starling');
    const listen = async (cookie) => {
      const ctrl = new AbortController();
      const res = await fetch(`${s.base}/api/v1/events`, { headers: { cookie }, signal: ctrl.signal });
      assert.equal(res.status, 200);
      const reader = res.body.getReader();
      let text = '';
      (async () => { try { for (;;) { const { value, done } = await reader.read(); if (done) break; text += Buffer.from(value).toString(); } } catch { /* aborted */ } })();
      return { stop: () => ctrl.abort(), text: () => text };
    };
    const la = await listen(a);
    const lb = await listen(b);
    await rpc(s.base, a, 'submitFeeling', { text: FEELING, label: 'worry', consent: true, clientId: 'events-0000001' });
    await new Promise((r) => setTimeout(r, 150));
    assert.match(la.text(), /"scope":"journeys"/);
    assert.ok(!/"scope"/.test(lb.text()), 'someone else heard about a feeling that isn’t theirs');
    assert.ok(!/jr_|acc_|tok_/.test(la.text()), 'a live update carries internal ids');
    la.stop(); lb.stop();
  } finally { await s.close(); }
});

test('sessions and live updates end when they should, and can’t pile up', async () => {
  const s = await production();
  try {
    const open = async (cookie) => {
      const ctrl = new AbortController();
      const res = await fetch(`${s.base}/api/v1/events`, { headers: { cookie }, signal: ctrl.signal });
      const reader = res.body.getReader();
      const st = { ended: false, stop: () => ctrl.abort() };
      (async () => { try { for (;;) { const { done } = await reader.read(); if (done) break; } } catch { /* aborted */ } st.ended = true; })();
      return st;
    };
    const tick = () => new Promise((r) => setTimeout(r, 120));
    // signing in again on the same device replaces its session; the old cookie is dead
    const first = await join_(s.base, 'MEMBER-ONE', 'Moonbeam');
    const again = await post(s.base, '/api/v1/session', { invite: 'MEMBER-ONE', name: 'Moonbeam', adult: true }, { cookie: first });
    const second = jar(again);
    assert.equal((await rpc(s.base, first, 'me')).status, 401, 'the replaced session still works');
    assert.equal((await rpc(s.base, second, 'me')).status, 200);
    // many sign-ins from many devices keep only a few sessions
    for (let i = 0; i < 8; i++) await join_(s.base, 'MEMBER-ONE', 'Moonbeam');
    const acc = Object.values(s.app.service.s.accounts).find((a) => s.app.service.s.profiles[a.id]?.pseudonym === 'Moonbeam');
    assert.ok(Object.values(s.app.service.s.sessions).filter((id) => id === acc.id).length <= 5, 'sessions pile up for one account');
    // one account can hold only a few live streams
    const phone = await join_(s.base, 'MEMBER-ONE', 'Moonbeam');
    const many = [];
    for (let i = 0; i < 8; i++) many.push(await open(phone));
    await tick();
    assert.ok(many.filter((x) => x.ended).length >= 2, 'one account opened unlimited live streams');
    // deleting your data on one device closes the streams on the others
    const laptop = await join_(s.base, 'MEMBER-ONE', 'Moonbeam');
    const watching = await open(phone);
    await tick();
    assert.equal(watching.ended, false);
    const del = await post(s.base, '/api/v1/rpc/deleteMyData', { args: { confirm: 'DELETE' } }, { cookie: laptop });
    assert.equal(del.status, 200);
    await tick();
    assert.equal(watching.ended, true, 'another device kept hearing about a deleted account');
    assert.equal((await rpc(s.base, phone, 'me')).status, 401);
    for (const x of many) x.stop();
  } finally { await s.close(); }
});

test('the production build refuses files changed after it was built', () => {
  const copy = mkdtempSync(join(tmpdir(), 'hushmates-tamper-'));
  try {
    assert.ok(build({ out: copy }).ok);
    writeFileSync(join(copy, 'app', 'app.js'), 'window.__lab = true;');
    assert.throws(() => builtFiles(copy), /changed after the build/);
  } finally { rmSync(copy, { recursive: true, force: true }); }
});


test('a server refuses lab state: test identities and testing examples never load', async () => {
  const { RelayService } = await import('../core/relay.js');
  const { seedRelay } = await import('../core/relay-seed.js');
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-state-'));
  try {
    const labState = join(dir, 'lab.json');
    writeFileSync(labState, JSON.stringify({ relay: seedRelay(new RelayService({ testMode: true })).toJSON(), sessions: {}, invites: {} }));
    const svc = new RelayService({ testMode: true, cannedExamples: true, provider: async ({ mallow }) => ({ status: 'ok', text: 'A fixed line.', mallow, source: 'demo' }) });
    const id = svc.createMember({ pseudonym: 'Realname', adult: true });
    const tok = svc.issueSession(id);
    const j = svc.submitFeeling(tok, { text: FEELING, consent: true, allowFallback: true, clientId: 'state-test-0001' }).journey.id;
    svc.s.journeys[j].releasedAt -= 31 * 60e3;
    await svc.askMallow(tok, { journeyId: j });
    const demoState = join(dir, 'demo.json');
    writeFileSync(demoState, JSON.stringify({ relay: svc.toJSON(), sessions: {}, invites: {} }));
    for (const [statePath, why] of [[labState, /test identities/], [demoState, /testing examples/]]) {
      assert.throws(() => createHushmatesServer({ mode: 'production', files: builtFiles(dist), statePath, log: quiet }), why);
      assert.throws(() => createHushmatesServer({ mode: 'development', files: appFiles(), labFiles: labFiles(), testerKey: TESTER_KEY, statePath, log: quiet }), why);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
