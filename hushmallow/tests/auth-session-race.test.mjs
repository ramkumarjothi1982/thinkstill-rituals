// A shared browser: B's reset (or confirmation) link opens in a second tab
// while A's page is checking its own session. The link's page stores B's
// session and ends A's on the server; A's check, already in flight with A's
// token, is then refused. Round 3 found that answer clearing the session in
// storage, which by then was B's: supabase-js's getUser() removes whatever
// session is stored on "session not found", and A's page then signed out
// (on the server) whatever session was stored. B's new password failed with
// "Sign in first" (the E2E dry run's `shared` section, 2 runs in 3). Now
// A's page checks its own token with its own request and only ever clears a
// session that is still its own. The real vendored supabase-js against the
// local fake; the second tab's write is made at the exact moment A's request
// is on the wire.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createAuth } from '../src/auth/client.js';
import { resolveAuthConfig } from '../src/auth/config.js';
import { bootNamespace } from '../src/auth/namespace.js';
import { openLink, createCallbackAuth, parseCallback } from '../src/auth/callback.js';
import { memoryStorage, supabaseLib, fakeDom, until } from './helpers/auth-env.mjs';

let fake, config;
const live = [];
const loc = { origin: 'http://localhost:8202', pathname: '/', href: 'http://localhost:8202/', hostname: 'localhost', protocol: 'http:', search: '', hash: '' };
const realFetch = globalThis.fetch;

before(async () => {
  fake = createFakeSupabase({ siteUrl: 'http://localhost:8202' });
  const port = await fake.listen(0);
  config = resolveAuthConfig({ published: { enabled: true, url: `http://localhost:${port}`, key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' }, loc, session: memoryStorage() });
});
after(async () => { globalThis.fetch = realFetch; for (const a of live) { try { (await a.ensureClient()).auth.stopAutoRefresh(); } catch { /* never loaded */ } } await fake.close(); });
beforeEach(() => { globalThis.fetch = realFetch; fake.reset(); Object.assign(fake.cfg, { autoconfirm: true, rateLimitMs: 0, accessTtl: 3600 }); });

const guestPage = (ls) => { const g = createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: () => {} }); live.push(g); return g; };
/** A browser (one Storage) with A signed in, A's page booted and checked; and B's session made elsewhere. */
async function sharedBrowser() {
  const ls = memoryStorage();
  const g = guestPage(ls);
  assert.equal((await g.signUp({ email: 'ana@example.com', password: 'gentle-moon-42' })).signedIn, true);
  g.chooseGuestData('fresh');
  const reloads = [];
  const a = createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: (r) => reloads.push(r) });
  live.push(a);
  await a.init();
  assert.equal(a.status(), 'signed-in');
  const lsB = memoryStorage();
  const gb = guestPage(lsB);
  assert.equal((await gb.signUp({ email: 'bo@example.com', password: 'gentle-moon-42' })).signedIn, true);
  const bSession = lsB.getItem(config.storageKey);
  return { ls, a, reloads, bSession, bToken: JSON.parse(bSession).access_token };
}
const userOk = (token) => realFetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.key, authorization: `Bearer ${token}` } }).then((r) => r.status);
const revoke = (email) => realFetch(`${fake.url}/__fake/revoke`, { method: 'POST', body: JSON.stringify({ email }) });

test('A’s page checks its session while B’s link replaces it in another tab: B’s session is left alone, here and on the server', async () => {
  const { ls, a, reloads, bSession, bToken } = await sharedBrowser();
  let armed = true;
  globalThis.fetch = async (url, init) => {
    if (armed && /\/auth\/v1\/user$/.test(String(url))) {
      armed = false;
      // the other tab, right now: B's session lands in storage and A's session is ended on the server
      ls.setItem(config.storageKey, bSession);
      await revoke('ana@example.com');
    }
    return realFetch(url, init);
  };
  await a.verify(true);
  globalThis.fetch = realFetch;
  assert.equal(armed, false, 'A’s check went to the server');
  assert.equal(ls.getItem(config.storageKey), bSession, 'B’s session is still in storage, untouched');
  assert.equal(await userOk(bToken), 200, 'and still alive on the server');
  await until(() => reloads.length);
  assert.equal(reloads.at(-1).reason, 'account-changed', 'A’s page moves to the account now on this browser');
});

test('A’s session refused while it is still the one here: it leaves storage, and the page drops to guest calmly', async () => {
  const { ls, a, reloads } = await sharedBrowser();
  await revoke('ana@example.com');
  await a.verify(true);
  assert.equal(ls.getItem(config.storageKey), null, 'the refused session is gone from this browser');
  await until(() => reloads.length);
  assert.equal(reloads.at(-1).reason, 'expired');
});

test('A’s page signs out after another tab put B’s session here: B’s session stays, here and on the server', async () => {
  const { ls, a, bSession, bToken } = await sharedBrowser();
  ls.setItem(config.storageKey, bSession);   // the other tab signed B in (this page has not heard yet)
  await a.signOut();
  assert.equal(ls.getItem(config.storageKey), bSession);
  assert.equal(await userOk(bToken), 200);
});

test('A’s page deletes its account after another tab put B’s session here: only A goes', async () => {
  const { ls, a, bSession, bToken } = await sharedBrowser();
  const uidA = a.user().id;
  // the other tab signs B in between the server's yes and this page's clean-up
  let armed = true;
  globalThis.fetch = async (url, init) => {
    const r = await realFetch(url, init);
    if (armed && /\/rest\/v1\/rpc\/delete_my_account/.test(String(url))) { armed = false; ls.setItem(config.storageKey, bSession); }
    return r;
  };
  const d = await a.deleteAccount();
  globalThis.fetch = realFetch;
  assert.equal(d.ok, true, JSON.stringify(d));
  assert.equal(fake.users.has(uidA), false, 'A is deleted');
  assert.equal(ls.getItem(config.storageKey), bSession, 'B’s session is untouched');
  assert.equal(await userOk(bToken), 200);
  assert.deepEqual(ls.keys().filter((k) => k.startsWith(`hm2:u:${uidA}:`)), [], 'A’s copy is gone');
});

test('the other way round: A’s page writes its refreshed session over B’s a moment after B’s link stored it; the link’s page puts B’s back and the new password is saved', async () => {
  const { ls, a } = await sharedBrowser();
  const aSession = ls.getItem(config.storageKey);
  // B asks for a reset elsewhere; the link opens in a second tab of this browser
  await realFetch(`${config.url}/auth/v1/recover`, { method: 'POST', headers: { apikey: config.key, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'bo@example.com' }) });
  const m = await until(() => fake.lastEmail('bo@example.com', 'recovery'));
  const cb = createCallbackAuth(createAuth, config, { ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom() });
  live.push(cb);
  const c = await cb.ensureClient();
  const r = await openLink({ auth: cb, c, p: parseCallback(`http://localhost:8202/auth/callback?token_hash=${m.token_hash}&type=recovery`), ls });
  assert.equal(r.ok, true, JSON.stringify(r));
  await r.ended;
  // tab 1 (A's page) had a refresh in flight before it heard: its save lands over B's session
  ls.setItem(config.storageKey, aSession);
  const u = await cb.updatePassword({ password: 'after-reset-123', recoveryUid: r.uid });
  assert.equal(u.ok, true, JSON.stringify(u));
  assert.equal(JSON.parse(ls.getItem(config.storageKey)).user.email, 'bo@example.com', 'B’s session is back in storage');
  const t = await realFetch(`${config.url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: config.key, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'bo@example.com', password: 'after-reset-123' }) });
  assert.equal(t.status, 200, 'B signs in with the new password');
  // and the arrival check does the same for a confirmation link
  ls.setItem(config.storageKey, aSession);
  assert.equal(await cb.keepLinkSession(r.uid), true);
  assert.equal(JSON.parse(ls.getItem(config.storageKey)).user.email, 'bo@example.com');
  assert.equal(await a.keepLinkSession(r.uid), false, 'only the link’s own page holds a link’s session');
});
