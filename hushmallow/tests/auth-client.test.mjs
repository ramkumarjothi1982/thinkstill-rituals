// src/auth/client.js end to end in Node: the REAL vendored supabase-js
// against the LOCAL fake of Supabase Auth + PostgREST (tools/auth/fake-supabase.mjs).
// This proves the client's own logic and its use of supabase-js; it does not
// prove Supabase itself (supabase/tests/rls_check.sql and the CI stack do).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createAuth, guardedFetch } from '../src/auth/client.js';
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
beforeEach(() => { fake.reset(); Object.assign(fake.cfg, { autoconfirm: false, failRefresh: false, refreshDown: false, accessTtl: 3600, rateLimitMs: 60_000, securePasswordChange: true }); });

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

test('secure password change: a code is emailed; without it or with a wrong one nothing changes', async () => {
  const ls = memoryStorage();
  await signedUp(ls);
  const p = page(ls);
  await p.auth.init();
  assert.equal((await p.auth.updatePassword({ password: 'brand-new-pass-7' })).error.code, 'code_needed');
  assert.equal((await p.auth.reauthenticate()).ok, true);
  const m = await mail('ana@example.com', 'reauthentication');
  assert.match(m.token, /^\d{6}$/);
  assert.equal((await p.auth.updatePassword({ password: 'brand-new-pass-7', nonce: '000000' })).error.code, 'code_wrong');
  assert.equal((await p.auth.updatePassword({ password: 'short', nonce: m.token })).error.code, 'password_short');
  assert.equal((await p.auth.updatePassword({ password: 'brand-new-pass-7', nonce: ` ${m.token} ` })).ok, true);
  await retire(p.auth);
  const q = page(memoryStorage());
  assert.equal((await q.auth.signIn({ email: 'ana@example.com', password: 'gentle-moon-42' })).ok, false);
  assert.equal((await q.auth.signIn({ email: 'ana@example.com', password: 'brand-new-pass-7' })).ok, true);
  await retire(q.auth);
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
  await signedUp(ls);
  const p = page(memoryStorage());
  await p.auth.sendReset({ email: 'ana@example.com' });
  const m = await mail('ana@example.com', 'recovery');
  const cb = page(ls, memoryStorage(), { passive: true });   // the /auth/callback page
  const c = await cb.auth.ensureClient();
  const v = await c.auth.verifyOtp({ token_hash: m.token_hash, type: 'recovery' });
  assert.equal(v.error, null);
  assert.equal((await cb.auth.updatePassword({ password: 'after-reset-123' })).ok, true);
  const again = await c.auth.verifyOtp({ token_hash: m.token_hash, type: 'recovery' });
  assert.equal(again.error?.code, 'otp_expired', 'a link works once');
  await retire(p.auth); await retire(cb.auth);
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
