// src/auth/client.js end to end in Node: the REAL vendored supabase-js
// against the LOCAL fake of Supabase Auth + PostgREST (tools/auth/fake-supabase.mjs).
// This proves the client's own logic and its use of supabase-js; it does not
// prove Supabase itself (supabase/tests/rls_check.sql and the CI stack do).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createAuth, guardedFetch, createIsolatedClient } from '../src/auth/client.js';
import { openLink, createCallbackAuth, parseCallback } from '../src/auth/callback.js';
import { resolveAuthConfig } from '../src/auth/config.js';
import { bootNamespace, createNamespacedStore, readMarker } from '../src/auth/namespace.js';
import { createPrefs } from '../src/app/prefs.js';
import { toggleFavouriteWorld, favouriteWorlds, saveProgress } from '../src/engine/flow-store.js';
import { saveSkill, garden } from '../src/engine/garden.js';
import { memoryStorage, supabaseLib, fakeDom, until, tick } from './helpers/auth-env.mjs';

let fake, config;
const live = [];
const loc = { origin: 'http://localhost:8202', pathname: '/', href: 'http://localhost:8202/', hostname: 'localhost', protocol: 'http:', search: '', hash: '' };

before(async () => {
  fake = createFakeSupabase({ siteUrl: 'http://localhost:8202' });
  const port = await fake.listen(0);
  config = resolveAuthConfig({ published: { enabled: true, url: `http://localhost:${port}`, key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' }, loc, session: memoryStorage() });
});
after(async () => { for (const a of live) await retire(a); await fake.close(); });
beforeEach(() => { fake.reset(); Object.assign(fake.cfg, { autoconfirm: false, failRefresh: false, refreshDown: false, accessTtl: 3600, rateLimitMs: 60_000, securePasswordChange: true, recentLoginMs: 86_400_000, singleToken: false }); });

/** One "page load": a client for whatever namespace this device's storage boots into. */
function page(ls, ss = memoryStorage(), extra = {}) {
  const { doc, win, fire } = fakeDom();
  const events = { reloads: [], expired: 0 };
  const ns = bootNamespace({ config, ls });
  const auth = createAuth({ config, ns, ls, ss, loader: async () => supabaseLib(), doc, win, loc, storage: ls,
    onReload: (r) => events.reloads.push(r), onExpired: () => { events.expired++; }, ...extra });
  live.push(auth);
  return { auth, ns, events, fire, doc, store: createNamespacedStore({ ns, backend: ls }) };
}
async function retire(auth) { try { const c = await auth.ensureClient(); c.auth.stopAutoRefresh(); } catch { /* never loaded */ } }
const mail = (email, kind) => until(() => fake.lastEmail(email, kind));
const fakeState = () => fetch(`${fake.url}/__fake/state`).then((r) => r.json());
const agePost = (body) => fetch(`${fake.url}/__fake/age-sessions`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());
/** The password grant straight at the fake: whether these credentials sign in (status); the session it opens is closed again. */
async function canSignIn(email, password) {
  const r = await fetch(`${fake.url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: config.key, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const j = await r.json().catch(() => ({}));
  if (j.access_token) await fetch(`${fake.url}/auth/v1/logout?scope=local`, { method: 'POST', headers: { apikey: config.key, authorization: `Bearer ${j.access_token}` } });
  return r.status;
}
const sidOf = (ls) => { try { return JSON.parse(Buffer.from(JSON.parse(ls.getItem(config.storageKey)).access_token.split('.')[1], 'base64url').toString()).session_id; } catch { return null; } };

async function signedUp(ls, email = 'ana@example.com', password = 'gentle-moon-42') {
  const p = page(ls);
  const r = await p.auth.signUp({ email, password, name: 'Ana' });
  assert.equal(r.ok, true); assert.equal(r.needsConfirmation, true);
  const m = await mail(email, 'signup');
  const c = await p.auth.ensureClient();
  const v = await c.auth.verifyOtp({ token_hash: m.token_hash, type: 'signup' });   // what /auth/callback does
  assert.equal(v.error, null);
  await retire(p.auth);
  return v.data.session.user.id;
}

test('sign up → email (token_hash) → verified → the next page boots in the account’s namespace', async () => {
  const ls = memoryStorage();
  const uid = await signedUp(ls);
  assert.ok(fake.users.get(uid).confirmedAt);
  assert.equal(fake.lastEmail('ana@example.com', 'signup').redirect_to, 'http://localhost:8202/auth/callback', 'emails return to /auth/callback');
  const p = page(ls);
  assert.equal(p.ns.mode, 'account'); assert.equal(p.ns.uid, uid);
  assert.equal(await p.auth.init(), 'signed-in');
  const prof = await p.auth.profile.get();
  assert.equal(prof.profile.displayName, 'Ana', 'the sign-up trigger made the profile');
  assert.ok(prof.profile.lastSeenAt, 'last seen is stamped by the server');
  assert.equal(p.events.reloads.length, 0);
  await retire(p.auth);
});

test('sign-up for an email that already has an account looks exactly like a new one', async () => {
  const ls = memoryStorage();
  await signedUp(ls, 'ana@example.com');
  const p = page(memoryStorage());
  fake.cfg.rateLimitMs = 0;
  const r = await p.auth.signUp({ email: 'ana@example.com', password: 'another-pass-99' });
  assert.deepEqual(r, { ok: true, needsConfirmation: true, email: 'ana@example.com' });
  await retire(p.auth);
});

test('sign in: wrong password and unknown email are the same message; unconfirmed asks to confirm', async () => {
  const ls = memoryStorage();
  await signedUp(ls, 'ana@example.com', 'gentle-moon-42');
  const p = page(memoryStorage());
  const wrong = await p.auth.signIn({ email: 'ana@example.com', password: 'nope-nope-nope' });
  const unknown = await p.auth.signIn({ email: 'nobody@example.com', password: 'nope-nope-nope' });
  assert.equal(wrong.ok, false); assert.equal(unknown.ok, false);
  assert.equal(wrong.error.message, unknown.error.message);
  await p.auth.signUp({ email: 'bo@example.com', password: 'gentle-moon-42' });
  const unconfirmed = await p.auth.signIn({ email: 'bo@example.com', password: 'gentle-moon-42' });
  assert.equal(unconfirmed.error.code, 'email_not_confirmed');
  await retire(p.auth);
});

test('first sign-in on a device with guest things asks once; keep copies them locally; enter reloads into the account', async () => {
  const ls = memoryStorage();
  // the guest has favourites and a garden on this device
  const g = page(ls);
  toggleFavouriteWorld(g.store, 'static-storm');
  saveSkill(g.store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' });
  await signedUp(memoryStorage(), 'ana@example.com', 'gentle-moon-42');   // the account was made on another device
  const r = await g.auth.signIn({ email: 'ana@example.com', password: 'gentle-moon-42' });
  assert.equal(r.ok, true); assert.equal(r.needsGuestChoice, true);
  assert.equal(g.auth.pendingGuestChoice, true);
  await tick(30);
  assert.equal(g.events.reloads.length, 0, 'nothing reloads while the question is open');
  assert.equal(g.auth.chooseGuestData('keep').copied, 2);
  g.auth.enter('#account');
  assert.deepEqual(g.events.reloads.at(-1), { reason: 'signed-in', urgent: true, hash: '#account' });
  await retire(g.auth);
  const p = page(ls);
  assert.equal(p.ns.uid, r.uid);
  assert.deepEqual(favouriteWorlds(p.store), ['static-storm']);
  assert.equal(garden(p.store)[0].id, 'slowing-down');
  assert.equal(readMarker(ls, r.uid).guestChoice, 'keep');
  assert.equal(p.auth.pendingGuestChoice, false, 'asked once');
  await retire(p.auth);
});

test('a refresh that fails for good drops to guest calmly; the guest’s things are untouched', async () => {
  const ls = memoryStorage({ 'hm2:prefs': JSON.stringify({ textScale: 1.25 }), 'hm2:hushfold.favourites': JSON.stringify({ v: 1, ids: ['static-storm'] }) });
  fake.cfg.accessTtl = 1;
  await signedUp(ls);
  const p = page(ls);
  createPrefs(p.store).set('sound', false);   // the account's own setting
  await tick(1300);                             // the access token has expired
  fake.cfg.failRefresh = true;                  // and the refresh token is no longer valid
  await p.auth.init();
  await until(() => p.events.reloads.length);
  assert.equal(p.auth.status(), 'expired');
  assert.equal(p.events.expired, 1, 'one calm notice');
  assert.deepEqual(p.events.reloads[0], { reason: 'expired', urgent: false, hash: '#home' }, 'not urgent: at the next safe moment');
  assert.equal(ls.getItem(config.storageKey), null, 'the dead session is gone');
  const next = page(ls);
  assert.equal(next.ns.mode, 'guest');
  assert.equal(createPrefs(next.store).get('textScale'), 1.25);
  assert.deepEqual(favouriteWorlds(next.store), ['static-storm']);
  assert.equal(ls.getItem(`hm2:u:${p.ns.uid}:prefs`) !== null, true, 'the account’s own copy stays for its next sign-in');
  await retire(p.auth); await retire(next.auth);
});

test('offline (refresh endpoint down) keeps the session: no sign-out, no reload', async () => {
  const ls = memoryStorage();
  fake.cfg.accessTtl = 1;
  await signedUp(ls);
  await tick(1300);
  fake.cfg.refreshDown = true;   // 503: retryable
  const p = page(ls);
  await p.auth.init();
  await tick(100);
  assert.equal(p.auth.status(), 'signed-in');
  assert.equal(p.events.reloads.length, 0);
  assert.ok(ls.getItem(config.storageKey));
  fake.cfg.refreshDown = false;
  await retire(p.auth);
});

test('TOKEN_REFRESHED keeps the same account; visibility re-checks with the server', async () => {
  const ls = memoryStorage();
  fake.cfg.accessTtl = 2;
  await signedUp(ls);
  const p = page(ls);
  await p.auth.init();
  const seen = [];
  p.auth.onChange((s) => seen.push(s.event));
  await tick(2200);
  const c = await p.auth.ensureClient();
  await c.auth.getSession();   // refreshes (expired)
  await until(() => seen.includes('TOKEN_REFRESHED'));
  assert.equal(p.auth.status(), 'signed-in');
  // the account is revoked elsewhere: the next visible check notices and drops calmly
  fake.cfg.accessTtl = 3600;
  for (const s of [...fake.users.values()]) await fetch(`${fake.url}/__fake/revoke`, { method: 'POST', body: JSON.stringify({ email: s.email }) });
  await p.auth.verify(true);
  await until(() => p.events.reloads.length);
  assert.equal(p.events.reloads[0].reason, 'expired');
  await retire(p.auth);
});

test('another tab signs in as someone else: this page reloads into that namespace', async () => {
  const ls = memoryStorage();
  const uidA = await signedUp(ls, 'ana@example.com');
  const p = page(ls);
  await p.auth.init();
  // tab 2 (same storage) signs in as B
  await signedUp(memoryStorage(), 'bo@example.com');
  const ls2 = memoryStorage();
  const t2 = page(ls2);
  assert.equal((await t2.auth.signIn({ email: 'bo@example.com', password: 'gentle-moon-42' })).ok, true);
  ls.setItem(config.storageKey, ls2.getItem(config.storageKey));   // what the shared localStorage would now hold
  p.fire('win', 'storage', { key: config.storageKey });
  await until(() => p.events.reloads.length);
  assert.equal(p.events.reloads[0].reason, 'account-changed');
  assert.notEqual(bootNamespace({ config, ls }).uid, uidA);
  await retire(p.auth); await retire(t2.auth);
});

test('sync is off until consented; consent is stamped; withdrawal deletes the synced rows', async () => {
  const ls = memoryStorage();
  await signedUp(ls);
  const p = page(ls);
  await p.auth.init();
  const prefs = createPrefs(p.store);
  prefs.set('textScale', 1.12); prefs.set('mallow', 'zuzu');
  toggleFavouriteWorld(p.store, 'static-storm');
  saveSkill(p.store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' });
  saveProgress(p.store, { worldId: 'static-storm', idx: 0, sequence: ['static-storm'], step: 0.3, emotion: 'anxious', intention: 'calm', state: { charge: 2 } });

  const off = await p.auth.sync.syncNow(p.store, prefs);
  assert.deepEqual({ ok: off.ok, settings: off.settings, library: off.library }, { ok: true, settings: false, library: false });
  assert.equal((await p.auth.sync.pushPreferences(prefs.all())).error.code, 'sync_off');
  for (const t of ['preferences', 'favourite_worlds', 'garden_skills', 'hushflow_progress']) assert.equal(fake.rows[t].length, 0, `${t}: nothing without consent`);

  const on = await p.auth.consents.set('library', true);
  assert.equal(on.consents.library.on, true); assert.ok(on.consents.library.at, 'the server stamped the consent');
  assert.equal(on.consents.settings.on, false, 'each switch is its own consent');
  await p.auth.consents.set('settings', true);
  const r = await p.auth.sync.syncNow(p.store, prefs);
  assert.deepEqual({ ok: r.ok, settings: r.settings, library: r.library }, { ok: true, settings: true, library: true });
  assert.equal(fake.rows.preferences[0].text_scale, 1.12);
  assert.deepEqual(fake.rows.favourite_worlds.map((x) => x.world_id), ['static-storm']);
  assert.equal(fake.rows.garden_skills[0].skill_id, 'slowing-down');
  const prog = fake.rows.hushflow_progress[0];
  assert.equal(prog.world_id, 'static-storm');
  assert.equal('emotion' in prog || 'intention' in prog || 'state' in prog, false, 'no feeling, intention or world state leaves the device');
  const everything = JSON.stringify(fake.rows);
  assert.doesNotMatch(everything, /anxious|calm\b|charge/);

  await p.auth.consents.set('library', false);
  for (const t of ['favourite_worlds', 'garden_skills', 'hushflow_progress']) assert.equal(fake.rows[t].length, 0, `${t}: deleted on withdrawal`);
  assert.equal(fake.rows.preferences.length, 1, 'the other consent is untouched');
  const k = (await p.auth.consents.get()).consents.library;
  assert.equal(k.on, false); assert.ok(k.withdrawnAt);
  assert.deepEqual(favouriteWorlds(p.store), ['static-storm'], 'this device keeps its own copy');
  await retire(p.auth);
});

test('an account never reaches another account’s rows (client filters + the fake’s RLS)', async () => {
  const lsA = memoryStorage(), lsB = memoryStorage();
  const uidA = await signedUp(lsA, 'ana@example.com');
  await signedUp(lsB, 'bo@example.com');
  const a = page(lsA), b = page(lsB);
  await a.auth.init(); await b.auth.init();
  await a.auth.consents.set('library', true);
  await a.auth.sync.pushLibrary({ favourites: ['static-storm'] });
  await b.auth.consents.set('library', true);
  const pulled = await b.auth.sync.pullLibrary();
  assert.deepEqual(pulled.favourites, []);
  // B forging A's id straight at the API is refused
  const cb = await b.auth.ensureClient();
  const forged = await cb.from('favourite_worlds').insert({ user_id: uidA, world_id: 'luminous-ocean' });
  assert.equal(forged.error?.code, '42501');
  const peek = await cb.from('favourite_worlds').select('*').eq('user_id', uidA);
  assert.deepEqual(peek.data, []);
  await retire(a.auth); await retire(b.auth);
});

test('sign out: local session revoked, every token and verifier removed, guest on reload', async () => {
  const ls = memoryStorage();
  await signedUp(ls);
  const p = page(ls);
  await p.auth.init();
  createPrefs(p.store).set('sound', false);
  const r = await p.auth.signOut();
  assert.equal(r.ok, true);
  assert.deepEqual(p.events.reloads.at(-1), { reason: 'signed-out', urgent: true, hash: '#home' });
  assert.deepEqual(ls.keys().filter((k) => k.startsWith('sb-')), []);
  const st = await (await fetch(`${fake.url}/__fake/state`)).json();
  assert.equal(st.sessions, 0, 'the server session is revoked');
  assert.equal(bootNamespace({ config, ls }).mode, 'guest');
  assert.ok(ls.getItem(`hm2:u:${p.ns.uid}:prefs`), 'kept for next time unless asked');
  // …and with removeLocal the account's copy goes too
  const p2ls = memoryStorage();
  await signedUp(p2ls, 'bo@example.com');
  const p2 = page(p2ls); await p2.auth.init();
  createPrefs(p2.store).set('sound', false);
  await p2.auth.signOut({ removeLocal: true });
  assert.deepEqual(p2ls.keys().filter((k) => k.startsWith('hm2:u:')), []);
  await retire(p.auth); await retire(p2.auth);
});

test('delete account: server rows and the auth user go, then this device’s copy, then guest', async () => {
  const ls = memoryStorage({ 'hm2:prefs': JSON.stringify({ textScale: 1.25 }) });
  const uid = await signedUp(ls);
  const p = page(ls);
  await p.auth.init();
  await p.auth.consents.set('library', true);
  await p.auth.sync.pushLibrary({ favourites: ['static-storm'], garden: { v: 1, skills: { 'slowing-down': { savedAt: Date.now(), practised: 1 } } } });
  createPrefs(p.store).set('sound', false);
  const r = await p.auth.deleteAccount();
  assert.equal(r.ok, true);
  assert.equal(fake.users.has(uid), false);
  for (const [t, rows] of Object.entries(fake.rows)) assert.equal(rows.filter((x) => x.user_id === uid).length, 0, t);
  assert.deepEqual(ls.keys().filter((k) => k.startsWith('sb-') || k.startsWith('hm2:u:')), []);
  assert.equal(ls.getItem('hm2:prefs'), JSON.stringify({ textScale: 1.25 }), 'the guest’s things stay');
  assert.deepEqual(p.events.reloads.at(-1), { reason: 'deleted', urgent: true, hash: '#home' });
  await retire(p.auth);
});

test('password change on a fresh session: the CURRENT password is checked (wrong → “That password doesn’t match.”), the right one changes it, no code', async () => {
  const ls = memoryStorage();
  const uid = await signedUp(ls);
  const p = page(ls);
  await p.auth.init();
  const sid = sidOf(ls), held = ls.getItem(config.storageKey), sbKeys = ls.keys().filter((k) => k.startsWith('sb-')).sort().join();
  assert.ok(sid);
  const none = await p.auth.updatePassword({ password: 'brand-new-pass-7' });
  assert.equal(none.error.code, 'current_needed', 'the current password is asked for every time');
  const wrong = await p.auth.updatePassword({ current: 'not-my-password', password: 'brand-new-pass-7' });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.error.code, 'password_mismatch');
  assert.equal(wrong.error.message, 'That password doesn’t match.');
  assert.equal(wrong.error.field, 'current');
  assert.doesNotMatch(wrong.error.message, /lock|attempt|account|exist/i, 'no lockout wording, nothing about the account');
  assert.equal(fake.lastEmail('ana@example.com', 'reauthentication'), null, 'no code is ever emailed on a fresh session');
  assert.equal(ls.getItem(config.storageKey), held, 'the check never touched this page’s session');
  assert.equal(await canSignIn('ana@example.com', 'brand-new-pass-7'), 400, 'a wrong current password changes nothing');
  assert.equal((await p.auth.updatePassword({ current: 'gentle-moon-42', password: 'gentle-moon-42' })).error.code, 'password_same');
  const ok = await p.auth.updatePassword({ current: 'gentle-moon-42', password: 'brand-new-pass-7' });
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.equal(fake.lastEmail('ana@example.com', 'reauthentication'), null, 'still no code');
  const st = await fakeState();
  assert.deepEqual(st.liveSessions, [sid], 'this page’s session is the only one alive: the check’s own session was signed out (scope local), the real one was not');
  assert.equal(sidOf(ls), sid, 'still the same session on this page');
  assert.equal(p.auth.status(), 'signed-in');
  assert.equal(await p.auth.verify(true), 'signed-in', 'and the server agrees it is alive');
  assert.equal(p.events.reloads.length, 0, 'nothing reloads');
  assert.equal(ls.keys().filter((k) => k.startsWith('sb-')).sort().join(), sbKeys, 'the isolated check left nothing in this browser’s storage');
  assert.deepEqual(ls.keys().filter((k) => k.startsWith('hm-isolated')), []);
  assert.equal(await canSignIn('ana@example.com', 'brand-new-pass-7'), 200);
  assert.equal(await canSignIn('ana@example.com', 'gentle-moon-42'), 400);
  assert.equal(fake.users.get(uid).reauthNonce ?? null, null);
  await retire(p.auth);
});

test('password change on a session over 24 hours old: Supabase wants the emailed code; a wrong code is refused, the right one works', async () => {
  const ls = memoryStorage();
  const uid = await signedUp(ls);
  const p = page(ls);
  await p.auth.init();
  const sid = sidOf(ls);
  assert.equal((await agePost({ uid, hours: 25 })).sessions, 1);
  const wrongCurrent = await p.auth.updatePassword({ current: 'not-my-password', password: 'quiet-harbour-77' });
  assert.equal(wrongCurrent.error.code, 'password_mismatch', 'the current password comes first here too');
  assert.equal(fake.lastEmail('ana@example.com', 'reauthentication'), null, 'and a wrong one sends no code');
  const first = await p.auth.updatePassword({ current: 'gentle-moon-42', password: 'quiet-harbour-77' });
  assert.equal(first.ok, false);
  assert.equal(first.needsCode, true, JSON.stringify(first));
  assert.equal(first.email, 'ana@example.com');
  const m = await mail('ana@example.com', 'reauthentication');
  assert.match(m.token, /^\d{6}$/);
  assert.deepEqual((await fakeState()).liveSessions, [sid], 'the isolated check’s session is already gone (scope local) and the real one stays');
  assert.equal(await canSignIn('ana@example.com', 'quiet-harbour-77'), 400, 'nothing changed before the code');
  const wrongCode = await p.auth.updatePassword({ current: 'gentle-moon-42', password: 'quiet-harbour-77', nonce: m.token === '000000' ? '111111' : '000000' });
  assert.equal(wrongCode.error.code, 'code_wrong');
  assert.equal(await canSignIn('ana@example.com', 'quiet-harbour-77'), 400, 'a wrong code is refused by the server');
  assert.equal(await canSignIn('ana@example.com', 'gentle-moon-42'), 200);
  assert.equal(p.auth.cooldownLeft('reauth') > 0, true, 'a new code waits for the cooldown');
  assert.equal((await p.auth.reauthenticate()).error.code, 'rate_limited');
  const ok = await p.auth.updatePassword({ current: 'gentle-moon-42', password: 'quiet-harbour-77', nonce: ` ${m.token} ` });
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.equal(await canSignIn('ana@example.com', 'quiet-harbour-77'), 200);
  assert.equal(await canSignIn('ana@example.com', 'gentle-moon-42'), 400);
  assert.equal(p.auth.status(), 'signed-in');
  await retire(p.auth);
});

test('the isolated client: its own memory and storage key, nothing persisted, never this page’s storage', async () => {
  const ls = memoryStorage();
  await signedUp(ls);
  const before = JSON.stringify(ls.dump());
  const a = createIsolatedClient(supabaseLib(), config), b = createIsolatedClient(supabaseLib(), config);
  assert.notEqual(a.auth.storageKey, b.auth.storageKey, 'each check has its own key (and lock)');
  assert.notEqual(a.auth.storageKey, config.storageKey);
  assert.equal(a.auth.persistSession, false);
  assert.equal(a.auth.autoRefreshToken, false);
  assert.equal(a.auth.detectSessionInUrl, false);
  const r = await a.auth.signInWithPassword({ email: 'ana@example.com', password: 'gentle-moon-42' });
  assert.equal(r.error, null);
  await a.auth.signOut({ scope: 'local' });
  assert.equal(JSON.stringify(ls.dump()), before, 'this page’s storage is exactly as it was');
});

test('forgot password and resend: the same neutral answer for any email, then a 60 s cooldown', async () => {
  const ls = memoryStorage();
  await signedUp(ls);
  const p = page(memoryStorage());
  const known = await p.auth.sendReset({ email: 'ana@example.com' });
  assert.deepEqual(known, { ok: true, cooldownMs: 60000 });
  assert.ok(await mail('ana@example.com', 'recovery'));
  const again = await p.auth.sendReset({ email: 'nobody@example.com' });
  assert.equal(again.ok, false); assert.equal(again.error.code, 'rate_limited', 'cooldown, whoever asks');
  const q = page(memoryStorage());
  assert.deepEqual(await q.auth.sendReset({ email: 'nobody@example.com' }), { ok: true, cooldownMs: 60000 }, 'unknown email: same answer');
  assert.equal(fake.lastEmail('nobody@example.com'), null, 'and nothing is sent');
  const r = page(memoryStorage());
  assert.deepEqual(await r.auth.resend({ email: 'nobody@example.com' }), { ok: true, cooldownMs: 60000 });
  await retire(p.auth); await retire(q.auth); await retire(r.auth);
});

test('recovery link (token_hash) gives a recovery session that may set a new password without a code', async () => {
  const ls = memoryStorage();
  const uid = await signedUp(ls);
  const p = page(memoryStorage());
  await p.auth.sendReset({ email: 'ana@example.com' });
  const m = await mail('ana@example.com', 'recovery');
  const cb = createCallbackAuth(createAuth, config, { ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom() });   // the /auth/callback page
  live.push(cb);
  const c = await cb.ensureClient();
  const r = await openLink({ auth: cb, c, p: parseCallback(`http://localhost:8202/auth/callback?token_hash=${m.token_hash}&type=recovery`) });
  assert.equal(r.ok, true); assert.equal(r.kind, 'recovery'); assert.equal(r.uid, uid);
  assert.equal(r.email, 'ana@example.com', 'the page names the account the link signed in');
  assert.equal((await cb.updatePassword({ password: 'after-reset-123' })).error.code, 'not_signed_in', 'only for the account the link opened');
  assert.equal((await cb.updatePassword({ password: 'after-reset-123', recoveryUid: uid })).ok, true);
  const again = await c.auth.verifyOtp({ token_hash: m.token_hash, type: 'recovery' });
  assert.equal(again.error?.code, 'otp_expired', 'a link works once');
  assert.equal(await canSignIn('ana@example.com', 'after-reset-123'), 200);
  await retire(p.auth); await retire(cb);
});

test('a shared browser: B’s reset link while A is signed in here works for B; A’s session ends (scope local); A’s things stay A’s', async () => {
  const ls = memoryStorage();
  const uidB = await signedUp(memoryStorage(), 'bo@example.com');
  const uidA = await signedUp(ls, 'ana@example.com');
  const a = page(ls);
  await a.auth.init();
  createPrefs(a.store).set('textScale', 1.25);   // A's own setting on this browser
  toggleFavouriteWorld(a.store, 'static-storm');
  const sidA = sidOf(ls);
  // B (elsewhere) asks for a reset; the link is opened in this same browser
  await page(memoryStorage()).auth.sendReset({ email: 'bo@example.com' });
  const m = await mail('bo@example.com', 'recovery');
  const cb = createCallbackAuth(createAuth, config, { ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom() });
  live.push(cb);
  const c = await cb.ensureClient();
  const r = await openLink({ auth: cb, c, p: parseCallback(`http://localhost:8202/auth/callback?token_hash=${m.token_hash}&type=recovery`) });
  assert.equal(r.ok, true); assert.equal(r.kind, 'recovery'); assert.equal(r.uid, uidB, 'the link decides whose session this is');
  const saved = await cb.updatePassword({ password: 'bo-after-reset-9', recoveryUid: r.uid });
  assert.equal(saved.ok, true, JSON.stringify(saved));
  assert.equal((await r.ended).ok, true, 'A’s session was ended on the server');
  const st = await fakeState();
  assert.equal(st.liveSessions.includes(sidA), false, 'A’s session on this browser is gone');
  assert.equal(st.sessionsByUser[uidA] || 0, 0);
  assert.equal(await canSignIn('bo@example.com', 'bo-after-reset-9'), 200, 'B can sign in with the new password');
  assert.equal(await canSignIn('ana@example.com', 'gentle-moon-42'), 200, 'A’s password is untouched');
  // the next page boots into B's namespace, and A's things are still A's
  const next = page(ls);
  assert.equal(next.ns.uid, uidB);
  assert.deepEqual(favouriteWorlds(next.store), [], 'B sees none of A’s things');
  assert.equal(createPrefs(next.store).get('textScale'), 1);
  assert.equal(JSON.parse(ls.getItem(`hm2:u:${uidA}:prefs`)).textScale, 1.25, 'A’s copy stays for A');
  // and a recovery for the wrong account is refused outright
  assert.equal((await cb.updatePassword({ password: 'nope-nope-99', recoveryUid: uidA })).ok, false);
  await retire(a.auth); await retire(cb); await retire(next.auth);
});

test('the fetch handed to supabase-js reaches only the project', async () => {
  const f = guardedFetch('https://igbxbfuaoybfzsroxuln.supabase.co');
  await assert.rejects(f('https://evil.example/auth/v1/token'), /blocked/);
  await assert.rejects(f('https://igbxbfuaoybfzsroxuln.supabase.co.evil.example/x'), /blocked/);
  await assert.rejects(f('http://igbxbfuaoybfzsroxuln.supabase.co/x'), /blocked/);
  const ok = guardedFetch(new URL(config.url).origin);
  const res = await ok(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key } });
  assert.equal(res.status, 200);
});

test('Google sign-in is a hook only (no provider until it is configured)', async () => {
  const p = page(memoryStorage());
  const r = await p.auth.signInWithProvider('google');
  assert.equal(r.ok, false); assert.equal(r.error.code, 'signup_closed');
  await retire(p.auth);
});
