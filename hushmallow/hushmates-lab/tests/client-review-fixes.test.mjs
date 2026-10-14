// Regression tests for what the independent review of the app's sign-in found (each failed before its fix).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuth } from '../client/supabase-auth.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
function fakeAuth(routes) {
  const calls = [];
  const fetch = async (url, init) => {
    const path = new URL(url, 'http://x').pathname + new URL(url, 'http://x').search;
    calls.push({ path, body: init.body ? JSON.parse(init.body) : null, at: calls.length });
    const route = Object.keys(routes).find((p) => path.startsWith(p));
    const r = await routes[route]?.(JSON.parse(init.body || '{}'), init);
    if (r instanceof Error) throw r;
    const [status, data] = r || [404, {}];
    return new Response(status === 204 ? null : JSON.stringify(data), { status });
  };
  return { fetch, calls };
}
const session = (n = 1, life = 3600) => [200, { access_token: `access-${n}`, refresh_token: `refresh-${n}`, expires_in: life, user: { id: 'u1', email: 'a@example.com' } }];

test('a forced refresh that fails for a passing reason doesn’t hand back the refused token', async () => {
  const f = fakeAuth({ '/auth/v1/verify': () => session(1), '/auth/v1/token': () => [503, {}] });
  const auth = createAuth({ anonKey: 'k', storage: memory(), fetch: f.fetch, locks: null, events: null });
  await auth.verifyCode('a@example.com', '123456');
  await assert.rejects(auth.accessToken({ force: true }), (e) => e.code === 'error');
  assert.ok(auth.session(), 'a passing problem signed the person out');
  assert.equal(await auth.accessToken(), 'access-1', 'unforced, the still-valid token is fine');
});

test('signing out forgets this device first, and spends no refresh when the token still works', async () => {
  let release;
  const f = fakeAuth({ '/auth/v1/verify': () => session(1, 50), '/auth/v1/token': () => new Promise((r) => { release = () => r(session(2)); }), '/auth/v1/logout': () => [204, null] });
  const auth = createAuth({ anonKey: 'k', storage: memory(), fetch: f.fetch, locks: null, events: null });
  await auth.verifyCode('a@example.com', '123456');
  const out = auth.signOut();
  assert.equal(auth.session(), null, 'the session was still here while signing out');
  await out;
  assert.ok(!f.calls.some((c) => c.path.startsWith('/auth/v1/token')), 'a refresh was spent just to sign out');
  assert.ok(f.calls.some((c) => c.path.startsWith('/auth/v1/logout')));
  release?.();
});

test('a typo after a reload reads as a typo, not as an expired code', async () => {
  const f = fakeAuth({ '/auth/v1/verify': () => [403, { code: 'otp_expired' }] });
  const now = Date.now();
  const auth = createAuth({ anonKey: 'k', storage: memory(), fetch: f.fetch, locks: null, events: null, now: () => now });   // a fresh tab: no memory of sending
  await assert.rejects(auth.verifyCode('a@example.com', '999999', { sentAt: now - 20e3 }), (e) => e.code === 'code-wrong');
  await assert.rejects(auth.verifyCode('a@example.com', '999999', { sentAt: now - 20 * 60e3 }), (e) => e.code === 'code-expired');
});

test('no answer in time isn’t called “offline, nothing was sent”', async () => {
  const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
  const f = fakeAuth({ '/auth/v1/otp': () => timeout, '/auth/v1/verify': () => timeout });
  const auth = createAuth({ anonKey: 'k', storage: memory(), fetch: f.fetch, locks: null, events: null });
  await assert.rejects(auth.sendCode('a@example.com'), (e) => e.code === 'slow' && !/Nothing was sent/.test(e.message));
  await assert.rejects(auth.verifyCode('a@example.com', '123456'), (e) => e.code === 'slow');
  const offline = createAuth({ anonKey: 'k', storage: memory(), fetch: async () => { throw new TypeError('Failed to fetch'); }, locks: null, events: null });
  await assert.rejects(offline.sendCode('a@example.com'), (e) => e.code === 'network');
});
