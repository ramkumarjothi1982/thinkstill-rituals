// Coordinator decision 3: GUESTS KEEP TODAY'S DATA. Every localStorage key
// today's app keeps for a guest (hm2:… with no account) is read and written
// exactly as before accounts existed. This pins it: a realistic snapshot of
// today's guest keys boots with sign-in off and with sign-in on, every key is
// read through the app's own readers, and afterwards every raw value is
// byte-identical and no key has moved. Then the same after a real sign-in
// (the vendored supabase-js against the local fake) → "Not now" → the
// account's page → sign-out.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { authBoot } from '../src/auth/boot.js';
import { createAuth } from '../src/auth/client.js';
import { createStore } from '../src/engine/storage.js';
import { createPrefs, DEFAULTS } from '../src/app/prefs.js';
import { createEntitlements } from '../src/app/entitlements.js';
import { favouriteWorlds, loadProgress, FLOW_KEYS } from '../src/engine/flow-store.js';
import { readGarden, GARDEN_KEY } from '../src/engine/garden.js';
import { journeyEntries } from '../src/engine/journey.js';
import { playedSet } from '../src/engine/played.js';
import { consentState, STORE_KEYS } from '../src/beyond/consent.js';
import { createAngleClient } from '../src/beyond/angle-client.js';
import { memoryStorage, supabaseLib, fakeDom } from './helpers/auth-env.mjs';
import { todayGuestKeys, GUEST_DEVICE_ID } from './helpers/guest-snapshot.mjs';

const NOW = Date.now();
const DEVICE_ID = GUEST_DEVICE_ID;
/** Today's guest keys, as today's app writes them (the raw strings, byte for byte): tests/helpers/guest-snapshot.mjs. */
export const TODAY = Object.freeze(todayGuestKeys(NOW));
const GUEST = (ls) => Object.fromEntries(ls.keys().filter((k) => k.startsWith('hm2:') && !k.startsWith('hm2:u:')).sort().map((k) => [k, ls.getItem(k)]));

/** Everything the app reads at boot and while it runs, through its own readers. */
function readAll(store, ls) {
  return {
    prefs: createPrefs(store).all(),
    favourites: favouriteWorlds(store),
    progress: loadProgress(store, NOW)?.worldId ?? null,
    garden: Object.keys(readGarden(store).skills),
    consent: consentState(store),
    device: createAngleClient({ store, endpoint: null }).deviceId(),
    tier: createEntitlements({ store }).tier(),
    journey: journeyEntries(store).map((e) => `${e.id}:${e.felt}:${(e.families || []).join('+')}`),
    played: [...playedSet(store)],
    flowRotation: store.get('hushflow.rotation', null)?.sessionCount ?? null,   // src/hushfold/flow/director.js reads it this way
    invite: store.get(STORE_KEYS.invite, null),                                // src/beyond/angle-client.js reads it this way
    sound: JSON.parse(ls.getItem('hm2:sound') || 'null'),       // src/engine/audio.js reads it raw
    haptics: JSON.parse(ls.getItem('hm2:haptics') || 'null'),   // src/engine/haptics.js reads it raw
  };
}
const EXPECTED = {
  prefs: { ...DEFAULTS, ...JSON.parse(TODAY['hm2:prefs']) },
  favourites: ['static-storm', 'luminous-ocean'],
  progress: 'static-storm',
  garden: ['slowing-down'],
  consent: 'yes',
  device: DEVICE_ID,
  tier: 'paid',
  journey: ['r-001:lighter:worry'],
  played: ['r-001'],
  flowRotation: 3,
  invite: 'tester-invite-01',
  sound: { enabled: false, volume: 0.35 },
  haptics: false,
};

let fake, published;
const loc = { origin: 'http://localhost:8202', pathname: '/', href: 'http://localhost:8202/', hostname: 'localhost', protocol: 'http:', search: '', hash: '', replace() { throw new Error('must not navigate'); } };
before(async () => {
  fake = createFakeSupabase({ siteUrl: 'http://localhost:8202' });
  const port = await fake.listen(0);
  Object.assign(fake.cfg, { rateLimitMs: 0 });
  published = { enabled: true, url: `http://localhost:${port}`, key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' };
});
after(async () => { delete globalThis.localStorage; await fake.close(); });

/** One page load of the app's boot (src/app/main.js: authBoot → its store), on this device's storage. */
function bootApp(ls, pub) {
  globalThis.localStorage = ls;   // createStore('auto') and the raw readers use the browser's localStorage
  return authBoot({ loc, ls, ss: memoryStorage(), published: pub });
}

test('sign-in OFF: today’s guest keys boot, are all read, and stay byte-identical; nothing moves', () => {
  const ls = memoryStorage({ ...TODAY });
  const b = bootApp(ls, { enabled: false });
  assert.equal(b.ns.mode, 'off');
  assert.deepEqual(Object.keys(b.store).sort(), Object.keys(createStore({ backend: 'memory' })).sort(), 'the store is today’s createStore()');
  assert.deepEqual(readAll(b.store, ls), EXPECTED, 'every key is read as before');
  assert.deepEqual(GUEST(ls), Object.fromEntries(Object.entries(TODAY).sort()), 'byte-identical, nothing moved or added');
  assert.equal(ls.keys().length, Object.keys(TODAY).length);
});

test('sign-in ON, still a guest: the same keys, the same values, read the same way; nothing moves', () => {
  const ls = memoryStorage({ ...TODAY });
  const b = bootApp(ls, published);
  assert.equal(b.config.enabled, true);
  assert.equal(b.ns.mode, 'guest');
  assert.deepEqual(readAll(b.store, ls), EXPECTED);
  assert.deepEqual(GUEST(ls), Object.fromEntries(Object.entries(TODAY).sort()));
  assert.equal(ls.keys().length, Object.keys(TODAY).length, 'no new key for a guest (no sb-, no hm2:u:, no auth.*)');
  // a guest using the app writes exactly where today's app writes
  createPrefs(b.store).set('subtitleSpeed', 1.5);
  assert.equal(JSON.parse(ls.getItem('hm2:prefs')).subtitleSpeed, 1.5);
  assert.deepEqual(ls.keys().filter((k) => !TODAY[k]), []);
});

test('sign in → “Not now” → the account’s page → sign out: the guest’s keys are exactly as they were', async () => {
  const ls = memoryStorage({ ...TODAY });
  // the account exists already (made on another phone)
  const other = memoryStorage();
  const mk = createAuth({ config: bootApp(other, published).config, ns: { mode: 'guest', uid: null }, ls: other, ss: memoryStorage(), loader: async () => supabaseLib(), storage: other, ...fakeDom(), loc, onReload: () => {} });
  fake.cfg.autoconfirm = true;
  assert.equal((await mk.signUp({ email: 'ana@example.com', password: 'gentle-moon-42' })).ok, true);
  fake.cfg.autoconfirm = false;
  (await mk.ensureClient()).auth.stopAutoRefresh();

  // 1. this phone, a guest: sign in on the account screen
  const g = bootApp(ls, published);
  const guestPage = createAuth({ config: g.config, ns: g.ns, ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: () => {} });
  const r = await guestPage.signIn({ email: 'ana@example.com', password: 'gentle-moon-42' });
  assert.equal(r.ok, true); assert.equal(r.needsGuestChoice, true, 'this phone has guest things: asked once');
  assert.equal(guestPage.chooseGuestData('fresh').copied, 0, '“Not now” copies nothing');
  (await guestPage.ensureClient()).auth.stopAutoRefresh();
  const guestNow = Object.fromEntries(Object.entries(GUEST(ls)));
  assert.deepEqual(guestNow, Object.fromEntries(Object.entries(TODAY).sort()), 'signing in moved or changed no guest key');

  // 2. the reload: the account's own namespace, none of the guest's things
  const a = bootApp(ls, published);
  assert.equal(a.ns.mode, 'account'); assert.equal(a.ns.uid, r.uid);
  const seen = readAll(a.store, ls);
  assert.deepEqual(seen.favourites, []); assert.equal(seen.progress, null); assert.deepEqual(seen.garden, []);
  assert.equal(seen.consent, 'unasked', 'Another Angle consent is a person’s choice: asked again');
  assert.equal(seen.prefs.textScale, DEFAULTS.textScale);
  assert.equal(seen.device, DEVICE_ID, 'the device code is the phone’s (device-level)');
  assert.equal(seen.tier, 'paid', 'the plan is the phone’s (device-level)');
  // the account uses the app: its writes land in its own namespace
  createPrefs(a.store).set('textScale', 1.12);
  a.store.set(FLOW_KEYS.favourites, { v: 1, ids: ['quiet-lake'] });
  a.store.set(GARDEN_KEY, { v: 1, skills: {} });
  assert.deepEqual(GUEST(ls), Object.fromEntries(Object.entries(TODAY).sort()), 'the account’s writes never touch the guest’s keys');
  const acct = createAuth({ config: a.config, ns: a.ns, ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: () => {} });
  await acct.init();
  assert.equal(acct.status(), 'signed-in');

  // 3. sign out → the reload: a guest again, with today's keys exactly as they were
  await acct.signOut();
  const back = bootApp(ls, published);
  assert.equal(back.ns.mode, 'guest');
  assert.deepEqual(readAll(back.store, ls), EXPECTED, 'every guest key reads as before');
  assert.deepEqual(GUEST(ls), Object.fromEntries(Object.entries(TODAY).sort()), 'byte-identical, nothing moved');
  assert.deepEqual(ls.keys().filter((k) => k.startsWith('sb-')), [], 'no sign-in left behind');
  assert.ok(ls.keys().some((k) => k.startsWith(`hm2:u:${r.uid}:`)), 'the account’s own copy is kept apart for its next sign-in');
  // and sign-in off again (the build without accounts) reads them the same
  const off = bootApp(ls, { enabled: false });
  assert.deepEqual(readAll(off.store, ls), EXPECTED);
});
