// Shared devices: per-account local namespaces chosen synchronously at boot,
// device-level keys, the once-only guest-data question, cleanup; and that
// with sign-in off the app's store is exactly what it was.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../src/engine/storage.js';
import { createPrefs } from '../src/app/prefs.js';
import { toggleFavouriteWorld, favouriteWorlds, saveProgress, loadProgress } from '../src/engine/flow-store.js';
import { saveSkill, garden } from '../src/engine/garden.js';
import { setConsent, consentState, STORE_KEYS } from '../src/beyond/consent.js';
import {
  bootNamespace, createNamespacedStore, readPersistedSession, settleNamespace, needsGuestChoice, applyGuestChoice,
  guestKeys, guestHasData, removeAccountData, removeSupabaseKeys, accountNamespaces, accountPrefix, DEVICE_KEYS,
} from '../src/auth/namespace.js';
import { authBoot, callbackForward, createAuthHandle } from '../src/auth/boot.js';
import { memoryStorage } from './helpers/auth-env.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const CONFIG = Object.freeze({ enabled: true, url: 'http://localhost:8203', key: 'sb_publishable_hushmallow_local_dev_only', storageKey: 'sb-localhost-auth-token', mode: 'dev' });
const session = (uid, extra = {}) => JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r1', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, email: `${uid.slice(0, 4)}@example.com` }, ...extra });
const signIn = (ls, uid) => ls.setItem(CONFIG.storageKey, session(uid));
const boot = (ls) => { const ns = bootNamespace({ config: CONFIG, ls }); return { ns, store: createNamespacedStore({ ns, backend: ls }) }; };

test('the persisted session decides the namespace, synchronously, without supabase-js', () => {
  const ls = memoryStorage();
  assert.equal(bootNamespace({ config: CONFIG, ls }).mode, 'guest');
  assert.equal(bootNamespace({ config: { enabled: false }, ls }).mode, 'off');
  signIn(ls, A);
  const ns = bootNamespace({ config: CONFIG, ls });
  assert.deepEqual({ mode: ns.mode, uid: ns.uid, prefix: ns.prefix }, { mode: 'account', uid: A, prefix: `hm2:u:${A}:` });
  // an expired access token still counts while a refresh token is there (supabase-js refreshes or signs out)
  ls.setItem(CONFIG.storageKey, session(B, { expires_at: 1 }));
  assert.equal(bootNamespace({ config: CONFIG, ls }).uid, B);
  // junk, a bad id or no tokens: guest
  for (const raw of ['nope', '{}', session('not-a-uuid'), JSON.stringify({ user: { id: A } })]) {
    ls.setItem(CONFIG.storageKey, raw);
    assert.equal(bootNamespace({ config: CONFIG, ls }).mode, 'guest', raw.slice(0, 30));
  }
  // the user kept apart (supabase-js userStorage layout)
  ls.setItem(CONFIG.storageKey, JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r', expires_at: 9e9 }));
  ls.setItem(`${CONFIG.storageKey}-user`, JSON.stringify({ user: { id: A } }));
  assert.equal(readPersistedSession(ls, CONFIG.storageKey).uid, A);
});

test('two accounts and a guest on one device never see each other’s things', () => {
  const ls = memoryStorage();
  // the guest plays first
  let { store } = boot(ls);
  const gp = createPrefs(store); gp.set('textScale', 1.25); gp.set('mallow', 'zuzu');
  toggleFavouriteWorld(store, 'static-storm');
  saveSkill(store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' });
  setConsent(store, 'yes');
  store.set('entitlement', { tier: 'paid', source: 'test', since: 1 });
  store.set(STORE_KEYS.device, 'device-code-1234567890');

  // A signs in (starts fresh)
  signIn(ls, A); ({ store } = boot(ls));
  assert.equal(store.namespace.uid, A);
  assert.deepEqual(favouriteWorlds(store), []);
  assert.deepEqual(garden(store), []);
  assert.equal(createPrefs(store).get('textScale'), 1);
  assert.equal(consentState(store), 'unasked', 'Another Angle consent is a person’s choice');
  assert.deepEqual(store.get('entitlement'), { tier: 'paid', source: 'test', since: 1 }, 'the plan belongs to the device');
  assert.equal(store.get(STORE_KEYS.device), 'device-code-1234567890', 'so does the Another Angle device code');
  toggleFavouriteWorld(store, 'luminous-ocean');
  createPrefs(store).set('sound', false);
  saveProgress(store, { worldId: 'luminous-ocean', idx: 1, sequence: ['static-storm', 'luminous-ocean'], step: 0.5 });

  // B on the same device
  signIn(ls, B); ({ store } = boot(ls));
  assert.deepEqual(favouriteWorlds(store), []);
  assert.equal(loadProgress(store), null);
  assert.equal(createPrefs(store).get('sound'), true);
  toggleFavouriteWorld(store, 'static-storm');

  // back to A: A's own things, untouched by B
  signIn(ls, A); ({ store } = boot(ls));
  assert.deepEqual(favouriteWorlds(store), ['luminous-ocean']);
  assert.equal(createPrefs(store).get('sound'), false);
  assert.equal(loadProgress(store).worldId, 'luminous-ocean');

  // signed out: the guest's things exactly as they were
  ls.removeItem(CONFIG.storageKey); ({ store } = boot(ls));
  assert.equal(store.namespace.mode, 'guest');
  assert.deepEqual(favouriteWorlds(store), ['static-storm']);
  assert.equal(createPrefs(store).get('textScale'), 1.25);
  assert.equal(garden(store)[0].id, 'slowing-down');
  assert.equal(consentState(store), 'yes');
  assert.deepEqual(accountNamespaces(ls).sort(), [A, B]);
});

test('device-level keys are the documented few; everything else is per account', () => {
  assert.deepEqual([...DEVICE_KEYS].sort(), ['beyond.device', 'beyond.invite', 'beyond.session', 'entitlement', 'haptics', 'sound']);
  const ls = memoryStorage();
  signIn(ls, A);
  const { store } = boot(ls);
  store.set('entitlement', 1); store.set('beyond.consent', 2); store.set('prefs', 3); store.set('garden', 4);
  assert.equal(ls.getItem('hm2:entitlement'), '1');
  assert.equal(ls.getItem(`hm2:u:${A}:beyond.consent`), '2');
  assert.equal(ls.getItem(`hm2:u:${A}:prefs`), '3');
  assert.equal(ls.getItem('hm2:prefs'), null);
});

test('"Delete everything on this phone" in an account clears that account (and device keys), never the guest or others', () => {
  const ls = memoryStorage({ 'hm2:prefs': '{"sound":false}', 'hm2:garden': '{"v":1,"skills":{}}', [`hm2:u:${B}:prefs`]: '{}', 'hm2:entitlement': '{"tier":"paid"}' });
  signIn(ls, A);
  let { store } = boot(ls);
  settleNamespace(ls, A);
  applyGuestChoice(ls, A, 'fresh');
  store.set('prefs', { sound: true }); store.set('hushfold.favourites', { v: 1, ids: ['x'] });
  store.clearAll();
  assert.equal(ls.getItem(`hm2:u:${A}:prefs`), null);
  assert.equal(ls.getItem(`hm2:u:${A}:hushfold.favourites`), null);
  assert.equal(ls.getItem('hm2:entitlement'), null, 'device keys too (settings.js puts the plan back)');
  assert.equal(ls.getItem('hm2:prefs'), '{"sound":false}', 'the guest’s things stay');
  assert.equal(ls.getItem(`hm2:u:${B}:prefs`), '{}', 'another account stays');
  assert.equal(needsGuestChoice(ls, A), false, 'the question is not asked again');
  // the guest's own "Delete everything" leaves every account namespace alone
  ls.removeItem(CONFIG.storageKey); ({ store } = boot(ls));
  store.clearAll();
  assert.equal(ls.getItem('hm2:prefs'), null);
  assert.equal(ls.getItem(`hm2:u:${B}:prefs`), '{}');
});

test('first sign-in on a device asks once about the guest’s things; keep copies locally, fresh copies nothing', () => {
  const ls = memoryStorage();
  // nothing to offer: settled at once, never asked
  assert.deepEqual(settleNamespace(ls, A), { firstVisit: true, needsChoice: false });
  assert.equal(needsGuestChoice(ls, A), false);
  // only rotation bags: still nothing worth asking about
  ls.setItem('hm2:rotation', '{"v":1}');
  assert.equal(guestHasData(ls), false);
  // real guest things
  ls.setItem('hm2:prefs', '{"textScale":1.25}');
  ls.setItem('hm2:hushfold.favourites', '{"v":1,"ids":["static-storm"]}');
  ls.setItem('hm2:entitlement', '{"tier":"paid"}');
  assert.deepEqual(guestKeys(ls).sort(), ['hushfold.favourites', 'prefs', 'rotation']);
  assert.deepEqual(settleNamespace(ls, B), { firstVisit: true, needsChoice: true });
  assert.equal(needsGuestChoice(ls, B), true);
  assert.equal(settleNamespace(ls, B).needsChoice, true, 'still waiting until answered');
  ls.setItem(`hm2:u:${B}:prefs`, '{"textScale":1}');   // B already changed a setting before answering
  const r = applyGuestChoice(ls, B, 'keep');
  assert.equal(r.copied, 2, 'favourites and rotation copied; B’s own prefs kept');
  assert.equal(ls.getItem(`hm2:u:${B}:prefs`), '{"textScale":1}');
  assert.equal(ls.getItem(`hm2:u:${B}:hushfold.favourites`), '{"v":1,"ids":["static-storm"]}');
  assert.equal(ls.getItem(`hm2:u:${B}:entitlement`), null, 'device keys are not copied');
  assert.equal(ls.getItem('hm2:hushfold.favourites'), '{"v":1,"ids":["static-storm"]}', 'a copy: the guest keeps its own');
  assert.equal(needsGuestChoice(ls, B), false);
  assert.equal(settleNamespace(ls, B).needsChoice, false, 'asked once');
  // a third account says fresh
  const C = '33333333-3333-4333-8333-333333333333';
  settleNamespace(ls, C);
  assert.equal(applyGuestChoice(ls, C, 'fresh').copied, 0);
  assert.equal(ls.getItem(`hm2:u:${C}:hushfold.favourites`), null);
  assert.throws(() => applyGuestChoice(ls, 'nope', 'keep'));
});

test('sign-out and deletion clean up: tokens, verifiers and (when asked) the account’s namespace', () => {
  const ls = memoryStorage({
    [CONFIG.storageKey]: session(A), [`${CONFIG.storageKey}-code-verifier`]: 'v/x', [`${CONFIG.storageKey}-flows-code-verifier`]: '[]',
    [`${CONFIG.storageKey}-user`]: '{}', 'sb-other-auth-token': 'keep', [`hm2:u:${A}:prefs`]: '{}', [`hm2:u:${A}:garden`]: '{}', [`hm2:u:${B}:prefs`]: '{}', 'hm2:prefs': '{}',
  });
  assert.equal(removeSupabaseKeys(ls, CONFIG.storageKey), 4);
  assert.equal(ls.getItem('sb-other-auth-token'), 'keep');
  assert.equal(removeAccountData(ls, A), 2);
  assert.deepEqual(ls.keys().sort(), [`hm2:u:${B}:prefs`, 'hm2:prefs', 'sb-other-auth-token'].sort());
  assert.equal(removeAccountData(ls, 'bad'), 0);
  assert.equal(accountPrefix(A.toUpperCase()), `hm2:u:${A}:`);
});

test('sign-in off: the store is exactly createStore() and nothing else happens', () => {
  const ls = memoryStorage({ 'sb-localhost-auth-token': session(A) });
  const loc = { hostname: 'app.hushmallow.com', protocol: 'https:', search: '', hash: '#account', href: 'https://app.hushmallow.com/?code=abc#account', replace() { throw new Error('must not navigate'); } };
  const b = authBoot({ loc, ls, ss: memoryStorage(), published: { enabled: false } });
  assert.equal(b.config.enabled, false);
  assert.equal(b.ns.mode, 'off');
  assert.equal(b.forwarding, false, 'a ?code= link is left alone');
  assert.equal(b.deepLink, null);
  assert.deepEqual(Object.keys(b.store).sort(), Object.keys(createStore({ backend: 'memory' })).sort());
  const h = createAuthHandle(b);
  assert.equal(h.enabled, false); assert.equal(h.status(), 'off'); assert.equal(h.user(), null);
  return assert.rejects(h.load(), /off/);
});

test('sign-in on: deep link, notice, and sign-in links that land on the root move to /auth/callback', () => {
  const published = { enabled: true, url: 'http://localhost:8203', key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' };
  const ls = memoryStorage({ 'sb-localhost-auth-token': session(A) });
  const ss = memoryStorage({ 'hm2:auth.notice': 'verified' });
  const loc = { hostname: 'localhost', protocol: 'http:', search: '', hash: '#account', href: 'http://localhost:8202/#account', replace() { throw new Error('no'); } };
  const b = authBoot({ loc, ls, ss, published });
  assert.equal(b.ns.uid, A); assert.equal(b.deepLink, 'account'); assert.equal(b.notice, 'verified');
  assert.equal(ss.getItem('hm2:auth.notice'), null, 'a notice is shown once');
  let went = null;
  const loc2 = { ...loc, hash: '', href: 'http://localhost:8202/?token_hash=pkce_abc123456&type=signup', replace: (u) => { went = u; } };
  const b2 = authBoot({ loc: loc2, ls, ss, published });
  assert.equal(b2.forwarding, true);
  assert.equal(went, 'http://localhost:8202/auth/callback/?token_hash=pkce_abc123456&type=signup');
  assert.equal(callbackForward('https://app.hushmallow.com/?code=c0de1234-5678'), 'https://app.hushmallow.com/auth/callback/?code=c0de1234-5678');
  assert.equal(callbackForward('https://app.hushmallow.com/#error=access_denied&error_code=otp_expired&error_description=x'), 'https://app.hushmallow.com/auth/callback/?error=access_denied&error_code=otp_expired&error_description=x');
  assert.equal(callbackForward('https://app.hushmallow.com/?v=abc123#home'), null, 'the version forwarder’s ?v= is not a sign-in link');
  assert.equal(callbackForward('https://app.hushmallow.com/'), null);
  // forwarding keeps only the known parameters, on the same origin
  assert.equal(callbackForward('https://app.hushmallow.com/?code=abcdefgh&redirect=https://evil.example'), 'https://app.hushmallow.com/auth/callback/?code=abcdefgh');
});

test('storage.js protect: clearAll leaves protected prefixes, get/set unaffected', () => {
  const ls = memoryStorage({ 'hm2:a': '1', 'hm2:u:x:b': '2', 'other': '3' });
  const s = createStore({ backend: ls, protect: ['hm2:u:'] });
  s.clearAll();
  assert.deepEqual(ls.keys().sort(), ['hm2:u:x:b', 'other']);
  const plain = createStore({ backend: ls });
  plain.clearAll();
  assert.deepEqual(ls.keys(), ['other'], 'without protect: as before');
});
