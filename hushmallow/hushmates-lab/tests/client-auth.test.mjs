// The customer app's sign-in (client/supabase-auth.js) and its link to the
// gateway (client/functions-link.js), against fakes of Supabase Auth and the
// gateway: no server, no network. They check what reaches the wire, what is
// kept on the device, and that a person only ever sees words written for them.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuth, safeStorage, SESSION_KEY, KEY_HEADER } from '../client/supabase-auth.js';
import { FunctionsLink } from '../client/functions-link.js';
import { RelayClient } from '../client/relay-client.js';
import { humane, GENTLE } from '../ui/dom.js';
import { unseenMallow } from '../ui/relay/journeys.js';

const ANON = 'local-anon-key-dev-only';
const OFFLINE = 'You’re offline. Nothing was sent; try again when you’re back.';
const USER = { id: '6f0b5c1e-1111-4222-8333-444455556666', email: 'moonbeam@example.com' };

/** A clock the test moves. */
const clockAt = (t = Date.UTC(2026, 9, 14, 9)) => { const c = { t, now: () => c.t, add: (ms) => { c.t += ms; } }; return c; };

/** A Map-backed localStorage. */
function memoryStorage() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

/**
 * A fake fetch. `routes[pathname](call)` answers [status, body] (body undefined = empty), or
 * 'offline' to fail like a lost connection; a route may also return a promise (to hold an answer).
 */
function fakeFetch(routes = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const u = new URL(String(url), 'http://app.example');
    const call = { url: String(url), path: u.pathname, search: u.search, method: init.method, headers: { ...(init.headers || {}) }, body: init.body ? JSON.parse(init.body) : undefined, init };
    calls.push(call);
    const route = routes[u.pathname];
    if (!route) return new Response(JSON.stringify({ code: 'not_found', msg: 'no route' }), { status: 404 });
    const answer = await route(call);
    if (answer === 'offline') throw new TypeError('Failed to fetch');
    if (answer instanceof Response) return answer;
    const [status, body] = answer;
    return new Response(body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls, routes, of: (path) => calls.filter((c) => c.path === path) };
}

let n = 0;
const sessionBody = (life = 3600, user = USER) => {
  n += 1;
  return { access_token: `access-${n}`, token_type: 'bearer', expires_in: life, expires_at: Math.floor(Date.now() / 1000) + life, refresh_token: `refresh-${n}`, user: { ...user, aud: 'authenticated' } };
};

/** Supabase Auth, as far as the app uses it. */
function authRoutes(extra = {}) {
  return {
    '/auth/v1/otp': () => [200, {}],
    '/auth/v1/verify': (c) => (c.body.token === '123456' ? [200, sessionBody()] : [403, { code: 'otp_invalid', error_code: 'otp_invalid', msg: 'Token has expired or is invalid' }]),
    '/auth/v1/token': () => [200, sessionBody()],
    '/auth/v1/logout': () => [204],
    ...extra,
  };
}

async function signedIn({ routes = {}, clock = clockAt(), storage = memoryStorage(), ...opts } = {}) {
  const f = fakeFetch(authRoutes(routes));
  const auth = createAuth({ url: '', anonKey: ANON, storage, fetch: f.fetch, now: clock.now, events: null, ...opts });
  await auth.sendCode(USER.email);
  await auth.verifyCode(USER.email, '123456');
  return { auth, f, clock, storage };
}

const humaneOnly = (e, code, words) => {
  assert.equal(e.code, code);
  assert.equal(e.human, true);
  if (words) assert.equal(e.message, words);
  assert.equal(humane(e), e.message);
  return true;
};

// ------------------------------------------------------------------------- sign-in --

test('auth: sending a code posts the email to /auth/v1/otp with the project key, and makes the account when the code is used', async () => {
  const f = fakeFetch(authRoutes());
  const auth = createAuth({ url: 'https://project.example.co/', anonKey: ANON, storage: memoryStorage(), fetch: f.fetch, events: null });
  const r = await auth.sendCode('  MoonBeam@Example.com ');
  assert.deepEqual(r, { email: 'moonbeam@example.com' });
  const [c] = f.calls;
  assert.equal(c.url, 'https://project.example.co/auth/v1/otp');
  assert.equal(c.method, 'POST');
  assert.equal(c.headers[KEY_HEADER], ANON);
  assert.equal(c.headers['content-type'], 'application/json');
  assert.equal(c.headers.authorization, undefined, 'no token before sign-in');
  assert.deepEqual(c.body, { email: 'moonbeam@example.com', create_user: true });
  assert.equal(c.init.credentials, 'omit', 'no cookies ride along');
  await auth.sendCode('moonbeam@example.com', { captchaToken: 'tok-123' });
  assert.deepEqual(f.calls[1].body.gotrue_meta_security, { captcha_token: 'tok-123' });
  assert.equal(auth.session(), null, 'sending a code signs nobody in');
});

test('auth: an email that isn’t one is refused here, without asking the server', async () => {
  const f = fakeFetch(authRoutes());
  const auth = createAuth({ anonKey: ANON, storage: memoryStorage(), fetch: f.fetch, events: null });
  for (const bad of ['', 'moonbeam', 'moon@beam', 'a b@c.de', null, 42]) {
    await assert.rejects(auth.sendCode(bad), (e) => humaneOnly(e, 'invalid-email'));
  }
  assert.equal(f.calls.length, 0);
});

test('auth: verifying a code signs in, keeps one session under hushmates.session, and never hands out the tokens', async () => {
  const clock = clockAt();
  const storage = memoryStorage();
  const f = fakeFetch(authRoutes());
  const auth = createAuth({ url: '', anonKey: ANON, storage, fetch: f.fetch, now: clock.now, events: null });
  const seen = [];
  auth.onChange((s, why) => seen.push([why, s?.user.email || null]));
  const s = await auth.verifyCode('MoonBeam@example.com', ' 123 456 ');
  const v = f.of('/auth/v1/verify')[0];
  assert.equal(v.url, '/auth/v1/verify', 'empty url = this site');
  assert.deepEqual(v.body, { type: 'email', email: 'moonbeam@example.com', token: '123456' });
  assert.deepEqual(s, { user: { id: USER.id, email: USER.email }, expiresAt: clock.t + 3600e3 });
  assert.deepEqual(auth.session(), s);
  assert.ok(!JSON.stringify(auth.session()).includes('access-'), 'session() has no tokens');
  assert.deepEqual(seen, [['signed-in', USER.email]]);
  assert.deepEqual([...storage.m.keys()], [SESSION_KEY]);
  const kept = JSON.parse(storage.m.get(SESSION_KEY));
  assert.equal(kept.user.id, USER.id);
  assert.match(kept.accessToken, /^access-/);
  assert.match(kept.refreshToken, /^refresh-/);
  assert.equal(kept.expiresAt, clock.t + 3600e3, 'lifetime counted on this device’s clock');
  assert.equal(await auth.accessToken(), kept.accessToken);
});

test('auth: the session survives a reload (same device), and a stored session that isn’t one is ignored', async () => {
  const { auth, storage, clock, f } = await signedIn();
  const token = await auth.accessToken();
  const again = createAuth({ anonKey: ANON, storage, fetch: f.fetch, now: clock.now, events: null });
  assert.deepEqual(again.session(), auth.session());
  assert.equal(await again.accessToken(), token);
  assert.equal(f.of('/auth/v1/token').length, 0, 'no refresh needed');
  for (const junk of ['{', '"x"', JSON.stringify({ accessToken: 'a' }), JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: 'soon', user: { id: 'u' } })]) {
    const s = memoryStorage();
    s.setItem(SESSION_KEY, junk);
    assert.equal(createAuth({ anonKey: ANON, storage: s, fetch: f.fetch, events: null }).session(), null, junk);
  }
});

test('auth: the access token is refreshed when less than a minute is left, and not before', async () => {
  const { auth, f, clock, storage } = await signedIn();
  const first = await auth.accessToken();
  clock.add(3600e3 - 61e3);
  assert.equal(await auth.accessToken(), first);
  assert.equal(f.of('/auth/v1/token').length, 0);
  clock.add(2e3);                                                 // 59 s left
  const second = await auth.accessToken();
  assert.notEqual(second, first);
  const [r] = f.of('/auth/v1/token');
  assert.equal(r.search, '?grant_type=refresh_token');
  assert.equal(r.headers[KEY_HEADER], ANON);
  assert.match(r.body.refresh_token, /^refresh-/);
  assert.equal(JSON.parse(storage.m.get(SESSION_KEY)).accessToken, second);
  assert.equal(auth.session().expiresAt, clock.t + 3600e3);
  assert.equal(await auth.accessToken(), second, 'fresh again: no second refresh');
  assert.equal(f.of('/auth/v1/token').length, 1);
});

test('auth: one refresh at a time, however many calls need a token at once', async () => {
  let release;
  const held = new Promise((r) => { release = r; });
  const { auth, f, clock } = await signedIn({ routes: { '/auth/v1/token': async () => { await held; return [200, sessionBody()]; } } });
  clock.add(3600e3);
  const all = Promise.all([auth.accessToken(), auth.accessToken(), auth.accessToken({ force: true }), auth.accessToken()]);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(f.of('/auth/v1/token').length, 1);
  release();
  const tokens = await all;
  assert.equal(new Set(tokens).size, 1);
  assert.equal(f.of('/auth/v1/token').length, 1);
  // force: the gateway turned the current one away, so a new one even though it looks fresh
  const before = await auth.accessToken();
  const forced = await auth.accessToken({ force: true });
  assert.notEqual(forced, before);
  assert.equal(f.of('/auth/v1/token').length, 2);
});

test('auth: a refresh token the server no longer knows signs the person out here, in plain words', async () => {
  const { auth, clock, storage } = await signedIn({ routes: { '/auth/v1/token': () => [400, { code: 'refresh_token_not_found', error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' }] } });
  const seen = [];
  auth.onChange((s, why) => seen.push([why, s]));
  clock.add(3600e3);
  await assert.rejects(auth.accessToken(), (e) => humaneOnly(e, 'not-signed-in', 'You’ve been signed out. Please sign in again.'));
  assert.equal(auth.session(), null);
  assert.equal(storage.m.has(SESSION_KEY), false);
  assert.deepEqual(seen, [['signed-out', null]]);
  assert.equal(await auth.accessToken(), null, 'nobody signed in: no token, no call');
  // the older answer shape (error + error_description) is read the same way
  const old = await signedIn({ routes: { '/auth/v1/token': () => [400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' }] } });
  old.clock.add(3600e3);
  await assert.rejects(old.auth.accessToken(), (e) => e.code === 'not-signed-in');
});

test('auth: a passing problem while refreshing keeps the session (and the current token while it still works)', async () => {
  let mode = 'offline';
  const { auth, clock, storage } = await signedIn({ routes: { '/auth/v1/token': () => (mode === 'offline' ? 'offline' : mode === 'busy' ? [503, 'upstream'] : [429, { code: 'over_request_rate_limit' }]) } });
  const token = await auth.accessToken();
  clock.add(3600e3 - 30e3);                                       // 30 s left: refresh is due, the token still works
  assert.equal(await auth.accessToken(), token);
  clock.add(40e3);                                                // now it has run out
  await assert.rejects(auth.accessToken(), (e) => humaneOnly(e, 'network', OFFLINE));
  mode = 'busy';
  await assert.rejects(auth.accessToken(), (e) => humaneOnly(e, 'error', 'Something went wrong on our side. Please try again in a moment.'));
  mode = 'limited';
  await assert.rejects(auth.accessToken(), (e) => e.code === 'rate-limited');
  assert.ok(auth.session(), 'still signed in');
  assert.ok(storage.m.has(SESSION_KEY));
});

test('auth: when storage throws (private browsing), everything works for this visit from memory', async () => {
  const angry = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); }, removeItem() { throw new Error('SecurityError'); } };
  const { auth, clock } = await signedIn({ storage: angry });
  assert.equal(auth.session().user.email, USER.email);
  const t = await auth.accessToken();
  assert.match(t, /^access-/);
  clock.add(3600e3);
  assert.notEqual(await auth.accessToken(), t, 'refresh works from memory too');
  auth.forget();
  assert.equal(auth.session(), null);
  // the wrapper on its own: writes that fail are still read back
  const half = safeStorage({ getItem: () => null, setItem() { throw new Error('QuotaExceededError'); }, removeItem() {} });
  half.setItem('k', 'v');
  assert.equal(half.getItem('k'), 'v');
  const none = safeStorage(null);
  none.setItem('k', 'v');
  assert.equal(none.getItem('k'), 'v');
  none.removeItem('k');
  assert.equal(none.getItem('k'), null);
});

test('auth: every refusal from Supabase becomes our own words with a stable code; its own text never shows', async () => {
  const clock = clockAt();
  const SECRET = 'internal detail: smtp relay 10.0.0.7 refused';
  const cases = [
    ['send', [429, { code: 'over_email_send_rate_limit', msg: SECRET }], 'rate-limited', 'Too many codes asked for. Please wait a little and try again.'],
    ['send', [429, { msg: SECRET }], 'rate-limited'],
    ['send', 'offline', 'network', OFFLINE],
    ['send', [500, { code: 'unexpected_failure', msg: SECRET }], 'error', 'Something went wrong on our side. Please try again in a moment.'],
    ['send', [502, `<html>${SECRET}</html>`], 'error'],
    ['send', [400, { code: 'validation_failed', msg: SECRET }], 'invalid-email'],
    ['send', [400, { error_code: 'captcha_failed', code: 400, msg: SECRET }], 'captcha'],
    ['send', [422, { code: 'email_address_not_authorized', msg: SECRET }], 'not-open'],
    ['send', [422, { code: 'otp_disabled', msg: SECRET }], 'not-open'],
    ['verify', [403, { code: 'otp_invalid', msg: SECRET }], 'code-wrong', 'That code didn’t match. Please check it, or ask for a new one.'],
    ['verify', [429, { code: 'over_request_rate_limit', msg: SECRET }], 'too-many-tries'],
    ['verify', 'offline', 'network', OFFLINE],
    ['verify', [500, { msg: SECRET }], 'error'],
    ['verify', [200, { msg: 'no session in here' }], 'error'],
  ];
  for (const [step, answer, code, words] of cases) {
    const f = fakeFetch({ '/auth/v1/otp': () => answer, '/auth/v1/verify': () => answer });
    const auth = createAuth({ anonKey: ANON, storage: memoryStorage(), fetch: f.fetch, now: clock.now, events: null });
    const p = step === 'send' ? auth.sendCode(USER.email) : auth.verifyCode(USER.email, '123456');
    await assert.rejects(p, (e) => {
      humaneOnly(e, code, words);
      assert.ok(!e.message.includes('internal') && !e.message.includes('session in here'), e.message);
      return true;
    }, `${step} ${JSON.stringify(answer)}`);
    assert.equal(auth.session(), null);
  }
});

test('auth: Supabase’s one answer for a wrong or old code reads as a typo for a fresh code, and as expired for an old one', async () => {
  const clock = clockAt();
  const f = fakeFetch(authRoutes({ '/auth/v1/verify': () => [403, { code: 'otp_expired', error_code: 'otp_expired', msg: 'Token has expired or is invalid' }] }));
  const auth = createAuth({ anonKey: ANON, storage: memoryStorage(), fetch: f.fetch, now: clock.now, events: null });
  await auth.sendCode(USER.email);
  clock.add(60e3);
  await assert.rejects(auth.verifyCode(USER.email, '111111'), (e) => humaneOnly(e, 'code-wrong', 'That code didn’t match. Please check it, or ask for a new one.'));
  clock.add(10 * 60e3);
  await assert.rejects(auth.verifyCode(USER.email, '111111'), (e) => humaneOnly(e, 'code-expired', 'That code has expired. We can send a new one.'));
  // after a reload we don't know when it was sent: expired, and the way forward is a new code
  const fresh = createAuth({ anonKey: ANON, storage: memoryStorage(), fetch: f.fetch, now: clock.now, events: null });
  await assert.rejects(fresh.verifyCode(USER.email, '111111'), (e) => e.code === 'code-expired');
});

test('auth: a code that isn’t 6 digits is refused here, without spending a try', async () => {
  const { auth, f } = await signedIn();
  const before = f.calls.length;
  for (const bad of ['', '12345', '12ab56', 'one two', null]) {
    await assert.rejects(auth.verifyCode(USER.email, bad), (e) => humaneOnly(e, 'code-format', 'Please enter the 6-digit code from the email.'));
  }
  assert.equal(f.calls.length, before);
});

test('auth: signing out ends this device’s session on the server (only this device), and still signs out when offline', async () => {
  const { auth, f, storage } = await signedIn();
  const token = await auth.accessToken();
  await auth.signOut();
  const [out] = f.of('/auth/v1/logout');
  assert.equal(out.search, '?scope=local', 'other devices stay signed in');
  assert.equal(out.headers.authorization, `Bearer ${token}`);
  assert.equal(out.headers[KEY_HEADER], ANON);
  assert.equal(auth.session(), null);
  assert.equal(storage.m.has(SESSION_KEY), false);
  const off = await signedIn({ routes: { '/auth/v1/logout': () => 'offline' } });
  await off.auth.signOut();
  assert.equal(off.auth.session(), null);
});

test('auth: forget() clears this device without asking the server, and a refresh still on its way can’t bring the session back', async () => {
  let release;
  const held = new Promise((r) => { release = r; });
  const { auth, f, clock, storage } = await signedIn({ routes: { '/auth/v1/token': async () => { await held; return [200, sessionBody()]; } } });
  clock.add(3600e3);
  const late = auth.accessToken();
  await new Promise((r) => setTimeout(r, 5));
  auth.forget();
  release();
  await assert.rejects(late, (e) => e.code === 'not-signed-in');
  assert.equal(auth.session(), null);
  assert.equal(storage.m.has(SESSION_KEY), false);
  assert.equal(f.of('/auth/v1/logout').length, 0);
});

test('auth: tabs share the session: a refresh done in another tab is used here instead of spending the old token again', async () => {
  const storage = memoryStorage();
  const clock = clockAt();
  const listeners = {};
  const events = { addEventListener: (type, fn) => { listeners[type] = fn; } };
  const f = fakeFetch(authRoutes());
  const a = createAuth({ anonKey: ANON, storage, fetch: f.fetch, now: clock.now, events });
  await a.verifyCode(USER.email, '123456');
  const b = createAuth({ anonKey: ANON, storage, fetch: f.fetch, now: clock.now, events: null });
  clock.add(3600e3 - 30e3);
  const fromB = await b.accessToken();                            // tab B refreshes (and writes storage)
  assert.equal(f.of('/auth/v1/token').length, 1);
  const fromA = await a.accessToken();                            // tab A finds it, without a second refresh
  assert.equal(fromA, fromB);
  assert.equal(f.of('/auth/v1/token').length, 1);
  // another tab signs out, or someone else signs in: this tab follows and says so
  const seen = [];
  a.onChange((s, why) => seen.push([why, s?.user.email || null]));
  storage.removeItem(SESSION_KEY);
  listeners.storage({ key: SESSION_KEY });
  assert.equal(a.session(), null);
  assert.deepEqual(seen, [['storage', null]]);
  listeners.storage({ key: 'something-else' });
  assert.equal(seen.length, 1);
});

test('auth: a refresh token another tab spent a moment ago doesn’t sign anyone out when that tab kept the new session', async () => {
  const storage = memoryStorage();
  const clock = clockAt();
  const f = fakeFetch(authRoutes());
  const a = createAuth({ anonKey: ANON, storage, fetch: f.fetch, now: clock.now, events: null });
  await a.verifyCode(USER.email, '123456');
  clock.add(3600e3);
  // while A's refresh is on its way, B refreshes and stores; A's spent token is refused
  f.routes['/auth/v1/token'] = () => {
    storage.setItem(SESSION_KEY, JSON.stringify({ v: 1, accessToken: 'from-b', refreshToken: 'refresh-b', expiresAt: clock.t + 3600e3, user: USER }));
    return [400, { code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' }];
  };
  assert.equal(await a.accessToken(), 'from-b');
  assert.equal(a.session().user.id, USER.id);
});

test('auth: createAuth needs a key and a proper address', () => {
  assert.throws(() => createAuth({ anonKey: '' }), /anon key/);
  assert.throws(() => createAuth({ anonKey: ANON, url: 'javascript:alert(1)' }), /http/);
  assert.doesNotThrow(() => createAuth({ anonKey: ANON, url: 'http://127.0.0.1:8090', storage: memoryStorage(), events: null }));
});

// ------------------------------------------------------------------- the gateway --

const BASE = '/functions/v1/hushmates';
const ok = (result) => [200, { ok: true, result }];

async function linked({ gateway = {}, routes = {}, clock, ...opts } = {}) {
  const s = await signedIn({ clock, routes });
  for (const [m, fn] of Object.entries(gateway)) s.f.routes[`${BASE}/rpc/${m}`] = fn;
  const signedOut = [];
  const link = new FunctionsLink({ base: BASE, auth: s.auth, anonKey: ANON, fetch: s.f.fetch, onSignedOut: () => signedOut.push(1), doc: null, win: null, ...opts });
  return { ...s, link, signedOut, rpc: (m) => s.f.of(`${BASE}/rpc/${m}`) };
}

test('link: every call is a POST to /rpc/<method> with the person’s token, the project key and the same-site header', async () => {
  const { link, rpc, auth } = await linked({ gateway: { me: (c) => ok({ echo: c.body }) } });
  const r = await link.request('me', 'ignored-token', { a: 1 });
  assert.deepEqual(r, { echo: { args: { a: 1 } } });
  const [c] = rpc('me');
  assert.equal(c.url, `${BASE}/rpc/me`);
  assert.equal(c.method, 'POST');
  assert.equal(c.headers.authorization, `Bearer ${await auth.accessToken()}`);
  assert.notEqual(c.headers.authorization, 'Bearer ignored-token');
  assert.equal(c.headers[KEY_HEADER], ANON);
  assert.equal(c.headers['content-type'], 'application/json');
  assert.equal(c.headers['x-hushmates'], '1');
  assert.equal(c.init.credentials, 'omit');
  await link.request('me');
  assert.deepEqual(rpc('me')[1].body, { args: {} });
  // a full address works too
  const full = new FunctionsLink({ base: 'https://project.example.co/functions/v1/hushmates/', auth, anonKey: ANON, fetch: async (u) => { assert.equal(u, 'https://project.example.co/functions/v1/hushmates/rpc/me'); return new Response(JSON.stringify({ ok: true, result: 1 })); }, doc: null, win: null });
  assert.equal(await full.request('me'), 1);
});

test('link: a token the gateway turns away is refreshed and the call tried once more', async () => {
  let first = true;
  const { link, rpc, f, signedOut } = await linked({ gateway: { listJourneys: () => { if (first) { first = false; return [401, { ok: false, code: 'not-signed-in', message: 'Please sign in again.' }]; } return ok({ journeys: [] }); } } });
  assert.deepEqual(await link.request('listJourneys'), { journeys: [] });
  const [a, b] = rpc('listJourneys');
  assert.notEqual(a.headers.authorization, b.headers.authorization, 'the retry carries a new token');
  assert.equal(f.of('/auth/v1/token').length, 1);
  assert.equal(signedOut.length, 0);
});

test('link: turned away again with a freshly refreshed token is a passing problem: the session is kept', async () => {
  // Supabase Auth just accepted the session, so the gateway's second refusal (say it couldn't fetch its
  // keys for a moment) mustn't throw away a good session (review finding)
  const { link, auth, rpc, signedOut } = await linked({ gateway: { me: () => [401, { msg: 'Invalid JWT' }] } });
  await assert.rejects(link.request('me'), (e) => e.code === 'error' && /try again in a moment/.test(e.message));
  assert.equal(rpc('me').length, 2, 'one retry, no more');
  assert.equal(signedOut.length, 0, 'a good session was thrown away');
  assert.ok(auth.session(), 'the session was forgotten');
  // the gateway's own "not signed in" (e.g. the account was deleted) ends it the same way
  const other = await linked({ gateway: { me: () => [403, { ok: false, code: 'not-signed-in', message: 'Please sign in again.' }] } });
  await assert.rejects(other.link.request('me'), (e) => e.code === 'not-signed-in');
  assert.equal(other.signedOut.length, 1);
});

test('link: no session, or one that can’t be refreshed, is signed out without calling the gateway', async () => {
  const { link, auth, rpc, signedOut, clock, f } = await linked({ gateway: { me: () => ok({}) } });
  f.routes['/auth/v1/token'] = () => [400, { code: 'refresh_token_not_found' }];
  clock.add(3600e3);
  await assert.rejects(link.request('me'), (e) => e.code === 'not-signed-in');
  assert.equal(signedOut.length, 1);
  assert.equal(rpc('me').length, 0);
  assert.equal(auth.session(), null);
  await assert.rejects(link.request('me'), (e) => e.code === 'not-signed-in');
});

test('link: no connection is “offline” (and the link says so); the gateway’s own refusals are shown; anything else is one gentle line', async () => {
  const statuses = [];
  const { link } = await linked({
    gateway: {
      me: () => 'offline',
      redeemInvite: () => [409, { ok: false, code: 'invite-invalid', message: 'That invitation code didn’t work. It may have been used already or expired. Please check it, or ask the person who invited you.' }],
      submitFeeling: () => [429, { ok: false, code: 'rate-limited', message: 'That’s a lot of tries. Please wait a little and try again.' }],
      listJourneys: () => [500, { ok: false, code: 'error', message: 'Something went wrong on our side. Please try again in a moment.' }],
      myGifts: () => [503, { code: 'BOOT_ERROR', message: 'Function failed to start (please check logs)' }],
      exportMyData: () => [502, '<html>Bad gateway</html>'],
      savePreferences: () => [200, { result: 'no ok flag' }],
    },
  });
  link.onStatus((on) => statuses.push(on));
  await assert.rejects(link.request('me'), (e) => { assert.equal(e.code, 'network'); assert.equal(humane(e), OFFLINE); return true; });
  assert.equal(link.online, false);
  await assert.rejects(link.request('redeemInvite', null, { code: 'NOPE00', name: 'Moonbeam', adult: true }), (e) => {
    humaneOnly(e, 'invite-invalid', 'That invitation code didn’t work. It may have been used already or expired. Please check it, or ask the person who invited you.');
    return true;
  });
  assert.equal(link.online, true, 'an answer means we’re back');
  assert.deepEqual(statuses, [false, true]);
  await assert.rejects(link.request('submitFeeling'), (e) => humaneOnly(e, 'rate-limited'));
  for (const m of ['listJourneys', 'myGifts', 'exportMyData', 'savePreferences']) {
    await assert.rejects(link.request(m), (e) => {
      assert.equal(e.human, false, m);
      assert.equal(humane(e), GENTLE, m);
      assert.ok(!/Function failed|Bad gateway|no ok flag/.test(e.message), m);
      return true;
    });
  }
});

test('link: no answer in time is “safe to try again”, and a method that isn’t one is refused without a call', async () => {
  const { link, rpc, f } = await linked();
  f.routes[`${BASE}/rpc/submitFeeling`] = () => { throw Object.assign(new Error('timed out'), { name: 'TimeoutError' }); };
  await assert.rejects(link.request('submitFeeling'), (e) => { assert.equal(e.code, 'response-lost'); assert.match(humane(e), /safe to try again/); return true; });
  for (const bad of ['../me', 'me/x', '', 'a'.repeat(41), 'rpc me', 7]) {
    await assert.rejects(link.request(bad), (e) => e.code === 'invalid' && humane(e) === GENTLE);
  }
  assert.equal(rpc('../me').length, 0);
});

/** A document whose visibility the test sets, and a window that can go online. */
function fakePage() {
  const make = () => {
    const ls = new Map();
    return {
      ls,
      addEventListener: (t, fn) => { if (!ls.has(t)) ls.set(t, new Set()); ls.get(t).add(fn); },
      removeEventListener: (t, fn) => ls.get(t)?.delete(fn),
      fire: (t) => [...(ls.get(t) || [])].forEach((fn) => fn({ type: t })),
      count: (t) => ls.get(t)?.size || 0,
    };
  };
  const doc = Object.assign(make(), { visibilityState: 'visible' });
  const win = Object.assign(make(), { navigator: { onLine: true } });
  return { doc, win };
}

test('link: while visible it asks for changes every 20 s; hidden, it rests; back, it catches up at once', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { doc, win } = fakePage();
  const { auth } = await signedIn();
  const link = new FunctionsLink({ base: BASE, auth, anonKey: ANON, fetch: async () => new Response('{}'), doc, win });
  const events = [];
  let reconnects = 0;
  const stop = link.subscribe('ignored', (ev) => events.push(ev), { onReconnect: () => { reconnects += 1; } });
  t.mock.timers.tick(19999);
  assert.equal(events.length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(events, [{ type: 'changed', scope: 'journeys' }, { type: 'changed', scope: 'me' }]);
  t.mock.timers.tick(20000);
  assert.equal(events.length, 4);
  doc.visibilityState = 'hidden';
  doc.fire('visibilitychange');
  t.mock.timers.tick(120000);
  assert.equal(events.length, 4, 'nothing while hidden');
  win.fire('online');
  assert.equal(reconnects, 0, 'coming online while hidden waits for the page');
  doc.visibilityState = 'visible';
  doc.fire('visibilitychange');
  assert.equal(reconnects, 1, 'visible again: catch up straight away');
  t.mock.timers.tick(20000);
  assert.equal(events.length, 6, 'and polling resumes');
  win.fire('online');
  assert.equal(reconnects, 2, 'back online: catch up');
  stop();
  t.mock.timers.tick(100000);
  assert.equal(events.length, 6, 'stopped');
  assert.equal(doc.count('visibilitychange'), 0);
  assert.equal(win.count('online'), 1, 'only the link’s own status listener is left');
  // a page that starts hidden doesn't poll until it's seen
  doc.visibilityState = 'hidden';
  const quiet = [];
  link.subscribe('x', (ev) => quiet.push(ev));
  t.mock.timers.tick(60000);
  assert.equal(quiet.length, 0);
});

test('link: RelayClient runs over it unchanged (me and journeys at start)', async (t) => {
  const { auth, f } = await signedIn();
  const me = { now: Date.now(), profile: { pseudonym: 'Moonbeam', mallow: 'noomi', onboarded: true }, accountState: 'active', adultConfirmed: true };
  f.routes[`${BASE}/rpc/me`] = () => ok(me);
  f.routes[`${BASE}/rpc/listJourneys`] = () => ok({ journeys: [], now: Date.now() });
  const link = new FunctionsLink({ base: BASE, auth, anonKey: ANON, fetch: f.fetch, doc: null, win: null, pollMs: 20000 });
  const client = new RelayClient(link, 'session');
  await client.start();
  t.after(() => client.stop());
  assert.equal(client.state.me.profile.pseudonym, 'Moonbeam');
  assert.deepEqual(client.state.journeys, []);
  assert.equal(client.state.ready, true);
});

// ------------------------------------------------------ the Mallow's own perspective --

test('journeys: a Mallow perspective the server prepared waits as an invitation until it is opened (here or anywhere)', () => {
  const dev = { memory: {} };
  const item = { id: 'p1', kind: 'mallow', text: 'Maybe…', mallow: 'noomi', label: 'A Mallow perspective · Automatically generated' };
  const j = (fallback, collection = [item]) => ({ id: 'j1', fallback, collection });
  assert.equal(unseenMallow(dev, j({ status: 'ready', seen: false })), true);
  assert.equal(unseenMallow(dev, j({ status: 'ready', seen: true })), false, 'already seen: shown directly');
  assert.equal(unseenMallow(dev, j({ status: 'ready' })), false, 'the in-page service has no seen flag: shown directly, as before');
  assert.equal(unseenMallow(dev, j({ status: 'available' })), false, 'asking still works as before');
  assert.equal(unseenMallow(dev, j({ status: 'ready', seen: false }, [])), false, 'nothing to show yet: no invitation');
  dev.memory.mallowSeen.add('j1');
  assert.equal(unseenMallow(dev, j({ status: 'ready', seen: false })), false, 'opened on this device: shown directly even before the server hears');
});
