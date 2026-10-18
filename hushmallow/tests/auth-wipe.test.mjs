// Round-2 review, blocking: deleting the account (and "Sign out and remove my
// things", "Remove this phone's data") must clear this device's copy even when
// a SECOND page of the same account is open in a scene that is not calm. The
// seal used to live only in the deleting page's memory: the other page kept
// writing into hm2:u:<deleted uid>: until its deferred reload, and nothing ever
// removed those keys. Now a device-level tombstone (hm2:auth.wipe:<uid>,
// src/auth/namespace.js) is written first and every page honours it: its later
// writes are dropped, what slipped in is removed when it hears, and the next
// boot removes anything left. Two createAuth pages on one Storage, the real
// vendored supabase-js against the local fake; storage events are simulated
// (a Storage double has none).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createAuth } from '../src/auth/client.js';
import { authBoot, createAuthHandle } from '../src/auth/boot.js';
import { resolveAuthConfig } from '../src/auth/config.js';
import {
  bootNamespace, createNamespacedStore, readWipe, writeWipe, wipeKey, wipedSince, cleanupWipes, settleWipe,
  WIPE_GRACE_MS, WIPE_RELOAD, isSealed, unsealAccount,
} from '../src/auth/namespace.js';
import { createPrefs } from '../src/app/prefs.js';
import { toggleFavouriteWorld, favouriteWorlds } from '../src/engine/flow-store.js';
import { saveSkill } from '../src/engine/garden.js';
import { memoryStorage, supabaseLib, fakeDom, until, tick } from './helpers/auth-env.mjs';

let fake, config, published;
const live = [];
const loc = { origin: 'http://localhost:8202', pathname: '/', href: 'http://localhost:8202/', hostname: 'localhost', protocol: 'http:', search: '', hash: '', replace() { throw new Error('must not navigate'); } };
const GUEST = { 'hm2:prefs': JSON.stringify({ textScale: 1.25 }), 'hm2:hushfold.favourites': JSON.stringify({ v: 1, ids: ['quiet-lake'] }) };

before(async () => {
  fake = createFakeSupabase({ siteUrl: 'http://localhost:8202' });
  const port = await fake.listen(0);
  published = { enabled: true, url: `http://localhost:${port}`, key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' };
  config = resolveAuthConfig({ published, loc, session: memoryStorage() });
});
after(async () => { delete globalThis.localStorage; for (const a of live) await retire(a); await fake.close(); });
beforeEach(() => { fake.reset(); Object.assign(fake.cfg, { autoconfirm: true, rateLimitMs: 0, restDelayMs: 0, restDelayTables: null, accessTtl: 3600 }); });

async function retire(auth) { try { const c = await auth.ensureClient(); c.auth.stopAutoRefresh(); } catch { /* never loaded */ } }

/** A page of the app signed in as the account that holds ls's session: its own window, store, prefs and reloads. */
async function page(ls) {
  const ns = bootNamespace({ config, ls });
  assert.equal(ns.mode, 'account');
  const dom = fakeDom();
  const reloads = [];
  const auth = createAuth({ config, ns, ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, doc: dom.doc, win: dom.win, loc, onReload: (r) => reloads.push(r) });
  live.push(auth);
  await auth.init();
  const store = createNamespacedStore({ ns, backend: ls });
  return { ns, uid: ns.uid, auth, store, prefs: createPrefs(store), dom, reloads, hear: (key) => dom.fire('win', 'storage', { key }) };
}

/** One device (one Storage) with a guest's things and two pages of the same signed-in account, each with things written. */
async function twoPages(email) {
  const ls = memoryStorage({ ...GUEST });
  const g = createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: () => {} });
  live.push(g);
  const su = await g.signUp({ email, password: 'gentle-moon-42', agreed: true });   // autoconfirm: signed in at once
  assert.equal(su.signedIn, true);
  g.chooseGuestData('fresh');
  const p1 = await page(ls);   // tab 1: the Memory Garden, say (not a calm scene: its reload waits)
  const p2 = await page(ls);   // tab 2: the account screen
  toggleFavouriteWorld(p1.store, 'static-storm');
  saveSkill(p1.store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' });
  p1.prefs.set('textScale', 1.12);
  p1.store.set('journey', [{ at: Date.now(), family: 'worry' }]);
  return { ls, uid: p1.uid, p1, p2 };
}
const own = (ls, uid) => ls.keys().filter((k) => k.startsWith(`hm2:u:${uid}:`)).sort();
const guestOf = (ls) => Object.fromEntries(ls.keys().filter((k) => k.startsWith('hm2:') && !k.startsWith('hm2:u:') && !k.startsWith('hm2:auth.')).sort().map((k) => [k, ls.getItem(k)]));
/**
 * In a browser every tab has its own copy of namespace.js, so tab 2's
 * in-memory seal never reaches tab 1. In Node both pages share one module:
 * forget the seal to stand for "another page" (only the tombstone is shared).
 */
const elsewhere = (uid) => unsealAccount(uid);
/** A fresh page load of the app's boot on this device (src/app/main.js → authBoot): a new page, nothing in memory. */
const boot = (ls) => {
  for (const k of ls.keys()) { const m = k.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/); if (m) unsealAccount(m[0]); }
  globalThis.localStorage = ls;   // createStore('auto') uses the browser's localStorage
  return authBoot({ loc, ls, ss: memoryStorage(), published });
};

test('tab 2 deletes the account while tab 1 is open elsewhere: tab 1 writes nothing more, and nothing of the account survives tab 1’s reload', async () => {
  const { ls, uid, p1, p2 } = await twoPages('ana@example.com');
  assert.ok(own(ls, uid).length >= 4, 'the account has things on this device');
  const r = await p2.auth.deleteAccount();
  assert.equal(r.ok, true, JSON.stringify(r));
  elsewhere(uid);
  assert.deepEqual(own(ls, uid), [], 'tab 2 removed the copy');
  const w = readWipe(ls, uid);
  assert.equal(w.reason, 'deleted'); assert.equal(w.pending, true);
  // tab 1 has not heard yet (the event is on its way): what it writes now is dropped
  assert.equal(p1.store.sealed, true, 'sealed by the tombstone, not by tab 1’s own memory');
  toggleFavouriteWorld(p1.store, 'luminous-ocean');
  p1.prefs.set('textScale', 1);
  p1.store.set('hushfold.progress', { v: 1, worldId: 'static-storm' });
  assert.deepEqual(own(ls, uid), [], 'tab 1’s late writes never land');
  // …but one write that tab 1 sent just before the tombstone reached it lands after tab 2's removal
  ls.setItem(`hm2:u:${uid}:played`, JSON.stringify(['static-storm']));
  p1.hear(wipeKey(uid));
  assert.deepEqual(own(ls, uid), [], 'tab 1 removes what slipped in as soon as it hears');
  assert.equal(p1.reloads.at(-1)?.reason, WIPE_RELOAD.deleted, 'tab 1 reloads at its next calm moment, with the deletion notice');
  assert.equal(p1.reloads.at(-1)?.urgent, false);
  assert.equal(p1.auth.status(), 'expired');
  // still before its reload: more writes, dropped
  saveSkill(p1.store, { id: 'naming-it', fromWorld: 'static-storm', mallow: 'blubi' });
  p1.prefs.set('haptics', false);
  assert.deepEqual(own(ls, uid), []);
  // anything that got through some other way is gone at the next boot
  ls.setItem(`hm2:u:${uid}:journey`, JSON.stringify([{ family: 'worry' }]));
  const b = boot(ls);
  assert.equal(b.ns.mode, 'guest', 'tab 1 reloads as a guest');
  assert.deepEqual(own(ls, uid), [], 'no hm2:u:<deleted uid>: key is left on the device');
  assert.deepEqual(guestOf(ls), GUEST, 'the guest’s things are untouched');
  assert.equal(readWipe(ls, uid).pending, true, 'the tombstone stays: a deleted account never comes back here');
});

test('the old behaviour, for contrast: without the tombstone, tab 1’s writes after the deletion land and survive (the review’s probe)', async () => {
  const { ls, uid, p1, p2 } = await twoPages('bo@example.com');
  assert.equal((await p2.auth.deleteAccount()).ok, true);
  elsewhere(uid);
  ls.removeItem(wipeKey(uid));   // what the device looked like before this fix: no tombstone
  toggleFavouriteWorld(p1.store, 'luminous-ocean');
  assert.ok(own(ls, uid).length > 0, 'tab 1 writes into the deleted account’s namespace');
  boot(ls);
  assert.ok(own(ls, uid).length > 0, 'and nothing removes it');
});

test('sign out and remove my things in tab 2: tab 1 stops writing, removes what slipped in, and its reload leaves nothing', async () => {
  const { ls, uid, p1, p2 } = await twoPages('cy@example.com');
  await p2.auth.signOut({ removeLocal: true });
  elsewhere(uid);
  assert.deepEqual(own(ls, uid), []);
  assert.equal(readWipe(ls, uid).reason, 'signed-out');
  toggleFavouriteWorld(p1.store, 'luminous-ocean');
  p1.prefs.set('textScale', 1);
  assert.deepEqual(own(ls, uid), [], 'dropped');
  ls.setItem(`hm2:u:${uid}:prefs`, JSON.stringify({ textScale: 1 }));   // slipped in before tab 1 heard
  p1.hear(wipeKey(uid));
  p1.hear(config.storageKey);   // and the session going
  assert.deepEqual(own(ls, uid), []);
  assert.equal(p1.reloads[0]?.reason, WIPE_RELOAD['signed-out']);
  ls.setItem(`hm2:u:${uid}:garden`, '{}');
  assert.equal(boot(ls).ns.mode, 'guest');
  assert.deepEqual(own(ls, uid), []);
  assert.deepEqual(guestOf(ls), GUEST);
});

test('signed in again later: the tombstone is settled, the account writes and keeps its copy across a plain sign-out', async () => {
  const { ls, uid, p2 } = await twoPages('di@example.com');
  await p2.auth.signOut({ removeLocal: true });
  ls.setItem(`hm2:u:${uid}:played`, '["static-storm"]');   // a leftover from a page that had not heard
  const g = createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: () => {} });
  live.push(g);
  const si = await g.signIn({ email: 'di@example.com', password: 'gentle-moon-42' });
  assert.equal(si.ok, true, JSON.stringify(si));
  assert.equal(readWipe(ls, uid).pending, false, 'settled by the sign-in');
  assert.ok(!own(ls, uid).includes(`hm2:u:${uid}:played`), 'the leftover went first');
  g.chooseGuestData('fresh');
  const b = boot(ls);
  assert.equal(b.ns.mode, 'account'); assert.equal(b.ns.removing, false);
  assert.equal(b.store.sealed, false);
  toggleFavouriteWorld(b.store, 'luminous-ocean');
  assert.ok(own(ls, uid).includes(`hm2:u:${uid}:hushfold.favourites`), 'writes land again');
  const p = await page(ls);
  await p.auth.signOut();   // a plain sign-out: the account keeps its copy
  assert.equal(boot(ls).ns.mode, 'guest');
  assert.ok(own(ls, uid).includes(`hm2:u:${uid}:hushfold.favourites`), 'kept for its next sign-in');
});

test('remove this phone’s data in tab 2: tab 1 is sealed and reloads; the "cleared" marker stays; after the reload the account writes again', async () => {
  const { ls, uid, p1, p2 } = await twoPages('ed@example.com');
  assert.equal((await p2.auth.removeDeviceData()).ok, true);
  elsewhere(uid);
  assert.deepEqual(own(ls, uid), [`hm2:u:${uid}:auth.local`]);
  const w = readWipe(ls, uid);
  assert.equal(w.reason, 'device-data'); assert.equal(w.pending, false, 'never pending: the account stays signed in here');
  toggleFavouriteWorld(p1.store, 'luminous-ocean');
  p1.prefs.set('textScale', 1);
  assert.deepEqual(own(ls, uid), [`hm2:u:${uid}:auth.local`], 'tab 1’s late writes are dropped');
  p1.hear(wipeKey(uid));
  assert.equal(JSON.parse(ls.getItem(`hm2:u:${uid}:auth.local`)).guestChoice, 'cleared', 'the marker is kept');
  assert.equal(p1.reloads.at(-1)?.reason, WIPE_RELOAD['device-data']);
  assert.equal(p1.auth.status(), 'signed-in', 'still signed in');
  const b = boot(ls);
  assert.equal(b.ns.mode, 'account'); assert.equal(b.ns.uid, uid);
  assert.equal(b.store.sealed, false, 'a page that boots after the tombstone is not sealed by it');
  toggleFavouriteWorld(b.store, 'cosy-cave');
  assert.deepEqual(favouriteWorlds(b.store), ['cosy-cave']);
  assert.equal(JSON.parse(ls.getItem(`hm2:u:${uid}:auth.local`)).guestChoice, 'cleared');
});

test('a plain sign-out or an expired session writes no tombstone: tab 1 is not sealed and the copy stays', async () => {
  const { ls, uid, p1, p2 } = await twoPages('fi@example.com');
  const before = own(ls, uid);
  await p2.auth.signOut();
  elsewhere(uid);
  assert.equal(readWipe(ls, uid), null);
  assert.equal(p1.store.sealed, false);
  p1.hear(config.storageKey);
  assert.equal(p1.reloads.at(-1)?.reason, 'expired');
  assert.deepEqual(own(ls, uid), before, 'kept for the next sign-in');
  boot(ls);
  assert.deepEqual(own(ls, uid), before, 'and the next boot keeps it');
});

test('before supabase-js loads (app.auth handle only), a page hears the tombstone too', async () => {
  const { ls, uid, p2 } = await twoPages('gu@example.com');
  const handlers = [];
  const win = { addEventListener: (t, fn) => { if (t === 'storage') handlers.push(fn); } };
  const reloads = [];
  const b = boot(ls);
  const h = createAuthHandle(b, { onReload: (r) => reloads.push(r), win, ls });
  assert.equal(h.status(), 'signed-in');
  const store = createNamespacedStore({ ns: b.ns, backend: ls });
  assert.equal((await p2.auth.deleteAccount()).ok, true);
  elsewhere(uid);
  toggleFavouriteWorld(store, 'luminous-ocean');
  assert.deepEqual(own(ls, uid), [], 'dropped');
  ls.setItem(`hm2:u:${uid}:prefs`, '{}');
  handlers[0]({ key: wipeKey(uid) });
  assert.deepEqual(own(ls, uid), []);
  assert.deepEqual(reloads.at(-1), { reason: WIPE_RELOAD.deleted, urgent: false, hash: '#home' });
  unsealAccount(uid);
  assert.equal(store.sealed, true, 'the tombstone seals it whatever this page remembers');
});

test('a boot that lands while another tab is still removing this account’s copy writes nothing; an old pending tombstone is settled', () => {
  const uid = '33333333-3333-4333-8333-333333333333';
  const session = JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: uid, email: 'x@example.com' } });
  const ls = memoryStorage({ ...GUEST, [config.storageKey]: session });
  writeWipe(ls, uid, 'signed-out');   // tab 2 has started; its session is about to go
  ls.setItem(`hm2:u:${uid}:prefs`, '{"textScale":1}');
  const b = boot(ls);
  assert.equal(b.ns.mode, 'account'); assert.equal(b.ns.removing, true);
  assert.equal(b.store.sealed, true);
  assert.equal(b.guestChoice, false, 'no question asked mid-removal');
  assert.deepEqual(own(ls, uid), [`hm2:u:${uid}:prefs`], 'not even the marker is written');
  b.store.set('hushfold.favourites', { v: 1, ids: ['static-storm'] });
  assert.deepEqual(own(ls, uid), [`hm2:u:${uid}:prefs`]);
  // the same tombstone, old: whatever ended it, the account is signed in here now
  const old = JSON.parse(ls.getItem(wipeKey(uid)));
  ls.setItem(wipeKey(uid), JSON.stringify({ ...old, at: Date.now() - WIPE_GRACE_MS - 1000 }));
  const b2 = boot(ls);
  assert.equal(b2.ns.removing, false);
  assert.equal(readWipe(ls, uid).pending, false, 'settled');
  assert.equal(ls.getItem(`hm2:u:${uid}:prefs`), null, 'the leftover went');
  assert.equal(b2.store.sealed, false);
  b2.store.set('hushfold.favourites', { v: 1, ids: ['static-storm'] });
  assert.ok(own(ls, uid).includes(`hm2:u:${uid}:hushfold.favourites`));
});

test('tombstones: shapes, ids, the guest’s "Delete everything" keeps them, cleanup only for pending ones', () => {
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
  const ls = memoryStorage({ ...GUEST, [`hm2:u:${a}:prefs`]: '{}', [`hm2:u:${b}:prefs`]: '{}' });
  assert.equal(writeWipe(ls, a, 'nonsense'), null);
  assert.equal(writeWipe(ls, 'not-a-uid', 'deleted'), null);
  const w1 = writeWipe(ls, a, 'deleted');
  const w2 = writeWipe(ls, a, 'deleted');
  assert.notEqual(w1.id, w2.id, 'a new id each time');
  assert.equal(wipedSince(ls, a, w1.id), true);
  assert.equal(wipedSince(ls, a, w2.id), false);
  assert.equal(wipedSince(ls, b, null), false);
  writeWipe(ls, b, 'device-data');
  const guest = createNamespacedStore({ ns: { mode: 'guest', uid: null }, backend: ls });
  guest.clearAll();
  assert.ok(readWipe(ls, a) && readWipe(ls, b), 'a guest’s "Delete everything on this phone" leaves the tombstones');
  assert.deepEqual(cleanupWipes(ls, null), [a], 'only the pending one is cleaned');
  assert.equal(ls.getItem(`hm2:u:${a}:prefs`), null);
  assert.equal(ls.getItem(`hm2:u:${b}:prefs`), '{}', 'device-data is not pending: an account that stays signed in keeps what it wrote since');
  assert.equal(settleWipe(ls, b), 0);
  ls.setItem(wipeKey(a), 'not json');
  assert.equal(readWipe(ls, a), null);
  assert.equal(isSealed(a), false);
});
