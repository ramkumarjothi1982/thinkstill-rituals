// The opt-in sync between two devices of one account, end to end in Node:
// the REAL vendored supabase-js and src/auth/client.js + src/auth/autosync.js
// against the LOCAL fake of Supabase (tools/auth/fake-supabase.mjs). Proves
// the merge rules (the newer setting wins by the server's clock; a removal
// on either device stays removed; withdrawing starts over) and that nothing
// moves without consent. Not Supabase itself: supabase/tests/rls_check.sql
// and the CI stack prove the database side.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createAuth } from '../src/auth/client.js';
import { resolveAuthConfig } from '../src/auth/config.js';
import { bootNamespace, createNamespacedStore } from '../src/auth/namespace.js';
import { startAutoSync } from '../src/auth/autosync.js';
import { createPrefs } from '../src/app/prefs.js';
import { toggleFavouriteWorld, favouriteWorlds, saveProgress, loadProgress, clearProgress } from '../src/engine/flow-store.js';
import { saveSkill, hasSkill, forgetSkill } from '../src/engine/garden.js';
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
beforeEach(() => { fake.reset(); Object.assign(fake.cfg, { autoconfirm: true, failRefresh: false, refreshDown: false, accessTtl: 3600, rateLimitMs: 0, securePasswordChange: true }); });

/** One page load on a device (its localStorage `ls`): the client, the store and the prefs it boots with. */
function device(ls) {
  const { doc, win } = fakeDom();
  const ns = bootNamespace({ config, ls });
  const auth = createAuth({ config, ns, ls, ss: memoryStorage(), loader: async () => supabaseLib(), doc, win, loc, storage: ls, onReload: () => {} });
  live.push(auth);
  const store = createNamespacedStore({ ns, backend: ls });
  return { auth, ns, store, prefs: createPrefs(store) };
}
async function retire(auth) { try { const c = await auth.ensureClient(); c.auth.stopAutoRefresh(); } catch { /* never loaded */ } }
/** Sign in on a device, answer the guest question, and boot the next page into the account. */
async function signedIn(ls, email, password = 'gentle-moon-42', { create = false } = {}) {
  const d = device(ls);
  const r = create ? await d.auth.signUp({ email, password, agreed: true }) : await d.auth.signIn({ email, password });
  assert.equal(r.ok, true, JSON.stringify(r));
  if (r.needsGuestChoice) d.auth.chooseGuestData('fresh');
  await retire(d.auth);
  const p = device(ls);
  assert.equal(p.ns.mode, 'account');
  await p.auth.init();
  return p;
}
const rowsOf = (t, uid) => fake.rows[t].filter((r) => r.user_id === uid);

test('settings: the newer side wins by the server’s clock; a change here is never overwritten', async () => {
  const lsA = memoryStorage(), lsB = memoryStorage();
  const A = await signedIn(lsA, 'ana@example.com', undefined, { create: true });
  const B = await signedIn(lsB, 'ana@example.com');
  const uid = A.ns.uid;
  // nothing moves until the person says yes
  A.prefs.set('textScale', 1.25);
  const off = await A.auth.sync.syncNow(A.store, A.prefs);
  assert.equal(off.settings, false); assert.equal(rowsOf('preferences', uid).length, 0);
  assert.equal((await A.auth.consents.set('settings', true)).ok, true);
  await A.auth.sync.syncNow(A.store, A.prefs);
  assert.equal(+rowsOf('preferences', uid)[0].text_scale, 1.25, 'A’s settings went up');
  // B, first time: the account's copy wins
  const b1 = await B.auth.sync.syncNow(B.store, B.prefs);
  assert.ok(b1.applied.includes('textScale'));
  assert.equal(B.prefs.get('textScale'), 1.25);
  // B changes a setting (autosync marks it), then syncs: B's change goes up, nothing of B's is overwritten
  const sB = startAutoSync({ auth: B.auth, store: B.store, prefs: B.prefs, setTimer: () => 0, clearTimer: () => {} });
  B.prefs.set('subtitleSpeed', 1.5);
  assert.equal(B.store.get('auth.sync').prefsDirty, true);
  await tick(5);   // a later server timestamp than A's push
  await sB.syncNow();
  assert.equal(+rowsOf('preferences', uid)[0].subtitle_speed, 1.5);
  assert.equal(B.prefs.get('subtitleSpeed'), 1.5);
  // A had not changed anything since: the newer account copy comes down
  const a2 = await A.auth.sync.syncNow(A.store, A.prefs);
  assert.ok(a2.applied.includes('subtitleSpeed'));
  assert.equal(A.prefs.get('subtitleSpeed'), 1.5);
  assert.equal(A.prefs.get('textScale'), 1.25);
  // nothing new anywhere: no writes
  const a3 = await A.auth.sync.syncNow(A.store, A.prefs);
  assert.deepEqual({ applied: a3.applied, changed: a3.changed }, { applied: [], changed: [] });
  sB.stop();
});

test('library: a favourite un-starred, a tool let go or a pause finished on one device stays gone on the other', async () => {
  const lsA = memoryStorage(), lsB = memoryStorage();
  const A = await signedIn(lsA, 'ana@example.com', undefined, { create: true });
  const B = await signedIn(lsB, 'ana@example.com');
  const uid = A.ns.uid;
  await A.auth.consents.set('library', true);
  toggleFavouriteWorld(A.store, 'static-storm');
  toggleFavouriteWorld(A.store, 'luminous-ocean');
  saveSkill(A.store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' });
  saveProgress(A.store, { worldId: 'static-storm', idx: 1, sequence: ['static-storm', 'luminous-ocean'], step: 0.4, emotion: 'anxious', intention: 'calm', state: { charge: 2 } });
  await A.auth.sync.syncNow(A.store, A.prefs);
  assert.deepEqual(rowsOf('favourite_worlds', uid).map((r) => r.world_id).sort(), ['luminous-ocean', 'static-storm']);
  assert.doesNotMatch(JSON.stringify(fake.rows), /anxious|charge/, 'never the feeling, the intention or the world’s state');

  await B.auth.sync.syncNow(B.store, B.prefs);
  assert.deepEqual(favouriteWorlds(B.store).sort(), ['luminous-ocean', 'static-storm']);
  assert.equal(hasSkill(B.store, 'slowing-down'), true);
  assert.equal(loadProgress(B.store)?.worldId, 'static-storm');

  // B: un-star one, let the tool go, finish the pause; A meanwhile stars something new
  toggleFavouriteWorld(B.store, 'static-storm');
  forgetSkill(B.store, 'slowing-down');
  clearProgress(B.store);
  await B.auth.sync.syncNow(B.store, B.prefs);
  toggleFavouriteWorld(A.store, 'quiet-lake');
  await A.auth.sync.syncNow(A.store, A.prefs);
  assert.deepEqual(favouriteWorlds(A.store).sort(), ['luminous-ocean', 'quiet-lake'], 'B’s removal reached A; A’s new star stayed');
  assert.equal(hasSkill(A.store, 'slowing-down'), false, 'the tool B let go is gone on A');
  assert.equal(loadProgress(A.store), null, 'the pause B finished is gone on A');
  assert.deepEqual(rowsOf('favourite_worlds', uid).map((r) => r.world_id).sort(), ['luminous-ocean', 'quiet-lake']);
  assert.equal(rowsOf('hushflow_progress', uid).length, 0);
  await B.auth.sync.syncNow(B.store, B.prefs);
  assert.deepEqual(favouriteWorlds(B.store).sort(), ['luminous-ocean', 'quiet-lake']);
});

test('withdrawing deletes what was kept and forgets the bookkeeping; turning it on again starts from this device', async () => {
  const ls = memoryStorage();
  const A = await signedIn(ls, 'ana@example.com', undefined, { create: true });
  const uid = A.ns.uid;
  await A.auth.consents.set('library', true);
  toggleFavouriteWorld(A.store, 'static-storm');
  await A.auth.sync.syncNow(A.store, A.prefs);
  assert.ok(A.store.get('auth.sync').library);
  await A.auth.consents.set('library', false);
  await A.auth.sync.syncNow(A.store, A.prefs);
  assert.equal(rowsOf('favourite_worlds', uid).length, 0, 'deleted on withdrawal');
  assert.equal(A.store.get('auth.sync').library, undefined, 'the base is forgotten');
  assert.deepEqual(favouriteWorlds(A.store), ['static-storm'], 'this device keeps its own');
  await A.auth.consents.set('library', true);
  await A.auth.sync.syncNow(A.store, A.prefs);
  assert.deepEqual(rowsOf('favourite_worlds', uid).map((r) => r.world_id), ['static-storm'], 'on again: this device’s things go up (nothing is lost to an old base)');
});

test('autosync follows a change within its debounce, and only with consent', async () => {
  const ls = memoryStorage();
  const A = await signedIn(ls, 'ana@example.com', undefined, { create: true });
  const uid = A.ns.uid;
  const s = startAutoSync({ auth: A.auth, store: A.store, prefs: A.prefs, debounceMs: 30 });
  await s.syncNow();
  assert.equal(s.state.library, false);
  toggleFavouriteWorld(A.store, 'static-storm');
  await tick(80);
  assert.equal(rowsOf('favourite_worlds', uid).length, 0, 'no consent: nothing goes up');
  await A.auth.consents.set('library', true);
  await s.syncNow();   // what the account screen does after the switch
  assert.equal(rowsOf('favourite_worlds', uid).length, 1);
  toggleFavouriteWorld(A.store, 'quiet-lake');
  await until(() => rowsOf('favourite_worlds', uid).length === 2, { timeout: 3000 });
  s.stop();
});

test('the guest question answered "Not now", then "Bring them in" on the account screen: a local copy, a reload', async () => {
  const ls = memoryStorage();
  const g = device(ls);
  toggleFavouriteWorld(g.store, 'static-storm');
  await retire(g.auth);
  fake.cfg.autoconfirm = true;
  const d = device(ls);
  const r = await d.auth.signUp({ email: 'ana@example.com', password: 'gentle-moon-42', agreed: true });
  assert.equal(r.needsGuestChoice, true);
  d.auth.chooseGuestData('fresh');
  await retire(d.auth);
  const events = [];
  const { doc, win } = fakeDom();
  const ns = bootNamespace({ config, ls });
  const p = createAuth({ config, ns, ls, ss: memoryStorage(), loader: async () => supabaseLib(), doc, win, loc, storage: ls, onReload: (e) => events.push(e) });
  live.push(p);
  const store = createNamespacedStore({ ns, backend: ls });
  assert.deepEqual(favouriteWorlds(store), [], 'Not now: the account starts fresh');
  assert.equal(p.guestDataWaiting, true);
  const k = p.importGuestData();
  assert.equal(k.ok, true);
  assert.deepEqual(events.at(-1), { reason: 'guest-kept', urgent: true, hash: '#account' });
  assert.deepEqual(favouriteWorlds(createNamespacedStore({ ns, backend: ls })), ['static-storm']);
  assert.equal(p.guestDataWaiting, false, 'offered once');
  assert.equal(Object.keys(fake.rows).every((t) => !fake.rows[t].some((row) => row.world_id === 'static-storm')), true, 'nothing was uploaded');
});
