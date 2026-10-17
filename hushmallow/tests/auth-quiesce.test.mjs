// A sync still in flight when the person signs out, deletes the account or
// removes this device's data must never write the account's things back
// afterwards (round-1 review: hm2:u:<deleted uid>:auth.sync came back after
// removeAccountData). The real vendored supabase-js against the local fake,
// with the fake's tables made slow so the sync is genuinely mid-flight.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createAuth } from '../src/auth/client.js';
import { resolveAuthConfig } from '../src/auth/config.js';
import { bootNamespace, createNamespacedStore, isSealed, sealAccount, unsealAccount } from '../src/auth/namespace.js';
import { startAutoSync } from '../src/auth/autosync.js';
import { createPrefs } from '../src/app/prefs.js';
import { toggleFavouriteWorld } from '../src/engine/flow-store.js';
import { saveSkill } from '../src/engine/garden.js';
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
beforeEach(() => { fake.reset(); Object.assign(fake.cfg, { autoconfirm: true, rateLimitMs: 0, restDelayMs: 0, restDelayTables: null, accessTtl: 3600 }); });

async function retire(auth) { try { const c = await auth.ensureClient(); c.auth.stopAutoRefresh(); } catch { /* never loaded */ } }

/** A signed-in page with the opt-in library sync on, a favourite and a garden tool, and autosync wired the way src/auth/boot.js wires it. */
async function signedInPage(email) {
  const ls = memoryStorage({ 'hm2:prefs': JSON.stringify({ textScale: 1.25 }), 'hm2:hushfold.favourites': JSON.stringify({ v: 1, ids: ['quiet-lake'] }) });
  const g = createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: () => {} });
  live.push(g);
  const su = await g.signUp({ email, password: 'gentle-moon-42', agreed: true });   // autoconfirm: signed in at once
  assert.equal(su.ok, true); assert.equal(su.signedIn, true);
  g.chooseGuestData('fresh');
  const ns = bootNamespace({ config, ls });
  assert.equal(ns.mode, 'account');
  const dom = fakeDom();
  const events = { reloads: [] };
  const auth = createAuth({ config, ns, ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, doc: dom.doc, win: dom.win, loc, onReload: (r) => events.reloads.push(r) });
  live.push(auth);
  await auth.init();
  const store = createNamespacedStore({ ns, backend: ls });
  const prefs = createPrefs(store);
  toggleFavouriteWorld(store, 'static-storm');
  saveSkill(store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' });
  assert.equal((await auth.consents.set('library', true)).ok, true);
  assert.equal((await auth.consents.set('settings', true)).ok, true);
  const sync = startAutoSync({ auth, store, prefs, doc: dom.doc, win: dom.win, debounceMs: 50 });
  auth.addQuiescer({ pause: () => sync.pause(), resume: () => sync.resume() });
  assert.equal((await sync.syncNow()).ok, true, 'a first sync, as at boot');
  return { ls, ns, uid: ns.uid, auth, store, prefs, sync, events };
}
const own = (ls, uid) => ls.keys().filter((k) => k.startsWith(`hm2:u:${uid}:`));
/** Another device of the same account kept a favourite: the next pull brings it, so the sync writes here after its request returns. */
const elsewhere = (uid, id) => fake.rows.favourite_worlds.push({ user_id: uid, world_id: id, position: 9, created_at: new Date().toISOString() });
const sbKeys = (ls) => ls.keys().filter((k) => k.startsWith('sb-'));

test('delete account with a sync in flight: the deleted account’s copy is gone and stays gone', async () => {
  const P = await signedInPage('ana@example.com');
  toggleFavouriteWorld(P.store, 'luminous-ocean');   // a change: the next sync has work to do
  elsewhere(P.uid, 'cosy-cave');
  Object.assign(fake.cfg, { restDelayMs: 300, restDelayTables: ['favourite_worlds'] });   // and the network is slow just there
  const inFlight = P.sync.syncNow();
  await until(() => fake.pending > 0, { step: 5 });   // the sync is mid-pull: it writes here when the answer comes
  const r = await P.auth.deleteAccount();
  assert.equal(r.ok, true, JSON.stringify(r));
  await inFlight;                                     // whatever the sync still had to do has finished…
  await tick(400);
  assert.deepEqual(own(P.ls, P.uid), [], '…and nothing of the deleted account came back on this device');
  assert.deepEqual(sbKeys(P.ls), []);
  assert.equal(P.ls.getItem('hm2:prefs'), JSON.stringify({ textScale: 1.25 }), 'the guest’s things are untouched');
  assert.equal(P.ls.getItem('hm2:hushfold.favourites'), JSON.stringify({ v: 1, ids: ['quiet-lake'] }));
  assert.equal(fake.users.has(P.uid), false);
  for (const [t, rows] of Object.entries(fake.rows)) assert.equal(rows.filter((x) => x.user_id === P.uid).length, 0, t);
  assert.equal(P.events.reloads.at(-1)?.reason, 'deleted');
  // later writes through the account's store (a scene saving a favourite before the reload) are dropped
  toggleFavouriteWorld(P.store, 'static-storm');
  P.prefs.set('sound', false);
  assert.deepEqual(own(P.ls, P.uid), [], 'the sealed store writes nothing');
});

test('delete account while a sync started straight from the account screen is running: the seal alone holds', async () => {
  const P = await signedInPage('bo@example.com');
  P.sync.stop();                                      // not the scheduler: the account screen's own call
  toggleFavouriteWorld(P.store, 'luminous-ocean');
  Object.assign(fake.cfg, { restDelayMs: 300, restDelayTables: ['favourite_worlds'] });
  const direct = P.auth.sync.syncNow(P.store, P.prefs);
  await until(() => fake.pending > 0, { step: 5 });
  const r = await P.auth.deleteAccount();
  assert.equal(r.ok, true);
  await direct.catch(() => {});
  await tick(400);
  assert.deepEqual(own(P.ls, P.uid), []);
});

test('sign out and remove my things, with a sync in flight: nothing of the account is left here', async () => {
  const P = await signedInPage('cy@example.com');
  toggleFavouriteWorld(P.store, 'luminous-ocean');
  elsewhere(P.uid, 'cosy-cave');
  Object.assign(fake.cfg, { restDelayMs: 300, restDelayTables: ['favourite_worlds'] });
  const inFlight = P.sync.syncNow();
  await until(() => fake.pending > 0, { step: 5 });   // the sync is mid-pull: it writes here when the answer comes
  await P.auth.signOut({ removeLocal: true });
  await inFlight; await tick(400);
  assert.deepEqual(own(P.ls, P.uid), []);
  assert.deepEqual(sbKeys(P.ls), []);
  assert.equal(P.events.reloads.at(-1)?.reason, 'signed-out');
});

test('sign out (keeping my things), with a sync in flight: the account’s copy stays as it was; nothing is written after', async () => {
  const P = await signedInPage('di@example.com');
  toggleFavouriteWorld(P.store, 'luminous-ocean');
  elsewhere(P.uid, 'cosy-cave');
  Object.assign(fake.cfg, { restDelayMs: 300, restDelayTables: ['favourite_worlds'] });
  const inFlight = P.sync.syncNow();
  await until(() => fake.pending > 0, { step: 5 });   // the sync is mid-pull: it writes here when the answer comes
  const snapshot = JSON.stringify(Object.fromEntries(own(P.ls, P.uid).map((k) => [k, P.ls.getItem(k)])));
  await P.auth.signOut();
  await inFlight; await tick(400);
  assert.equal(JSON.stringify(Object.fromEntries(own(P.ls, P.uid).map((k) => [k, P.ls.getItem(k)]))), snapshot, 'kept for next time, and not written to after the sign-out began');
  assert.deepEqual(sbKeys(P.ls), []);
});

test('remove this device’s data with a sync in flight: only the "cleared" marker is left', async () => {
  const P = await signedInPage('ed@example.com');
  toggleFavouriteWorld(P.store, 'luminous-ocean');
  elsewhere(P.uid, 'cosy-cave');
  Object.assign(fake.cfg, { restDelayMs: 300, restDelayTables: ['favourite_worlds'] });
  const inFlight = P.sync.syncNow();
  await until(() => fake.pending > 0, { step: 5 });   // the sync is mid-pull: it writes here when the answer comes
  const r = await P.auth.removeDeviceData();
  assert.equal(r.ok, true);
  await inFlight; await tick(400);
  assert.deepEqual(own(P.ls, P.uid), [`hm2:u:${P.uid}:auth.local`]);
  assert.equal(JSON.parse(P.ls.getItem(`hm2:u:${P.uid}:auth.local`)).guestChoice, 'cleared');
  assert.equal(sbKeys(P.ls).length > 0, true, 'still signed in');
  assert.equal(P.events.reloads.at(-1)?.reason, 'device-cleared');
  assert.ok(fake.rows.favourite_worlds.some((x) => x.user_id === P.uid), 'what is kept with the account stays there');
});

test('a deletion the server refuses: the seal lifts, the sync carries on, nothing is lost', async () => {
  const P = await signedInPage('fi@example.com');
  fake.cfg.down = true;
  const r = await P.auth.deleteAccount();
  fake.cfg.down = false;
  assert.equal(r.ok, false);
  assert.equal(isSealed(P.uid), false);
  assert.equal(P.sync.paused, false);
  toggleFavouriteWorld(P.store, 'luminous-ocean');
  assert.ok(JSON.parse(P.ls.getItem(`hm2:u:${P.uid}:hushfold.favourites`)).ids.includes('luminous-ocean'), 'writes work again');
  assert.equal((await P.sync.syncNow()).ok, true);
  assert.equal(P.auth.status(), 'signed-in');
});

test('an account deleted on another device: this device notices, drops to guest and removes its copy here', async () => {
  const P = await signedInPage('gu@example.com');
  P.sync.stop();
  await fetch(`${fake.url}/__fake/delete-user`, { method: 'POST', body: JSON.stringify({ email: 'gu@example.com' }) });
  await P.auth.verify(true);
  await until(() => P.events.reloads.length);
  assert.equal(P.events.reloads[0].reason, 'expired');
  assert.deepEqual(own(P.ls, P.uid), [], 'the deleted account’s copy goes too');
  assert.equal(P.ls.getItem('hm2:prefs'), JSON.stringify({ textScale: 1.25 }), 'the guest’s things stay');
});

test('an account only signed out elsewhere (not deleted) keeps its copy here', async () => {
  const P = await signedInPage('hy@example.com');
  P.sync.stop();
  await fetch(`${fake.url}/__fake/revoke`, { method: 'POST', body: JSON.stringify({ email: 'hy@example.com' }) });
  await P.auth.verify(true);
  await until(() => P.events.reloads.length);
  assert.ok(own(P.ls, P.uid).length > 2, 'kept for its next sign-in');
});

test('sealing: only the sealed account’s store stops writing; unsealing restores it', () => {
  const ls = memoryStorage();
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
  const sa = createNamespacedStore({ ns: { mode: 'account', uid: a, prefix: `hm2:u:${a}:` }, backend: ls });
  const sb = createNamespacedStore({ ns: { mode: 'account', uid: b, prefix: `hm2:u:${b}:` }, backend: ls });
  const guest = createNamespacedStore({ ns: { mode: 'guest', uid: null }, backend: ls });
  sealAccount(a);
  assert.equal(sa.sealed, true);
  assert.equal(sa.set('prefs', { x: 1 }), false);
  sa.remove('prefs'); sa.clearAll();
  sb.set('prefs', { y: 1 }); guest.set('prefs', { z: 1 });
  assert.deepEqual(ls.keys().sort(), ['hm2:prefs', `hm2:u:${b}:prefs`].sort());
  unsealAccount(a);
  sa.set('prefs', { x: 2 });
  assert.equal(ls.getItem(`hm2:u:${a}:prefs`), JSON.stringify({ x: 2 }));
});
