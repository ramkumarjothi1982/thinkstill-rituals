// Security review (17 Oct 2026): a web plan (source 'billing') and the Another
// Angle session the server mints for an account's Beyond subscription belong
// to that account, but they are kept under device-level keys (hm2:entitlement,
// hm2:beyond.session: src/auth/namespace.js DEVICE_KEYS) that every account
// and the guest on the browser share. Before this fix a guest (or account B)
// on a shared browser kept A's plan for the 3-day grace and sent A's session
// to /v1/angle (Beyond on A's subscription and daily allowance for up to a
// day), even after "Sign out and remove my things from this phone" or the
// account's deletion. Now each is kept with the namespace it belongs to and
// honoured only there, and every sign-out, a deletion and "Remove this
// device's data" remove them. App Store and test plans stay the phone's.
// Run with: node --test tests/account-device-keys.test.mjs
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createBilling, PATHS } from '../src/app/billing.js';
import { createEntitlements } from '../src/app/entitlements.js';
import { createStore } from '../src/engine/storage.js';
import { createAngleClient } from '../src/beyond/angle-client.js';
import { SCHEMA_VERSION } from '../src/beyond/vocab.js';
import { createNamespacedStore, accountPrefix, removeAccountData, removeAccountDeviceKeys, bootNamespace } from '../src/auth/namespace.js';
import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createAuth } from '../src/auth/client.js';
import { resolveAuthConfig } from '../src/auth/config.js';
import { memoryStorage, supabaseLib, fakeDom } from './helpers/auth-env.mjs';

const EP = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';
const NOW = Date.parse('2026-10-16T09:00:00Z');
const A = '11111111-2222-4333-8444-555555555555';
const B = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const ULTRA = { tier: 'ultra', status: 'active', current_period_end: '2026-11-16T09:00:00.000Z', cancel_at_period_end: false, manageable: true };
const NONE = { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, manageable: false };

const nsOf = (uid) => (uid ? Object.freeze({ mode: 'account', uid, prefix: accountPrefix(uid), wipeId: null, removing: false }) : Object.freeze({ mode: 'guest', uid: null, prefix: 'hm2:' }));
const storeFor = (ls, uid) => createNamespacedStore({ ns: nsOf(uid), backend: ls });
const raw = (ls, k) => JSON.parse(ls.getItem(k) || 'null');

/** createBilling as main.js wires it: signed in (with that account's token) or a guest; status answers from `status` (null: offline). */
function billingFor({ signedIn = true, token = 'eyJ.account.tok', status = ULTRA } = {}) {
  const calls = [];
  const auth = { enabled: true, status: () => (signedIn ? 'signed-in' : 'guest'), load: async () => ({ accessToken: async () => token }) };
  const fetchImpl = async (url, init) => {
    calls.push({ path: new URL(url).pathname, init });
    if (!status) throw new TypeError('Failed to fetch');
    if (new URL(url).pathname === PATHS.status) return new Response(JSON.stringify(status), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('{}', { status: 404 });
  };
  return { calls, billing: createBilling({ auth: () => auth, signIn: true, config: { provider: 'stripe', endpoint: EP }, fetchImpl, nav: () => {}, shell: false }) };
}

/** Another Angle's server, faked: each /v1/session mints `SESSION_FOR_<who>` (who: the account token sent, or 'GUEST'). */
function angleServer() {
  const calls = [];
  let n = 0;
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    calls.push({ path, auth: init.headers?.authorization || null });
    const reply = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
    if (path === '/v1/health') return reply({ ok: true, service: 'another-angle', schema_version: SCHEMA_VERSION, provider: 'anthropic', configured: { signing_key: true, provider_key: true } });
    if (path === '/v1/session') {
      const who = /^Bearer (.+)$/.exec(init.headers?.authorization || '')?.[1] || 'GUEST';
      return reply({ status: 'ok', token: `SESSION_FOR_${who.replace(/[^A-Za-z0-9]/g, '')}_${++n}`, expires_at: new Date(NOW + 86400000).toISOString(), source: who === 'GUEST' ? 'testing' : 'billing' });
    }
    return reply({ status: 'fallback', fallback: { reason: 'provider' } });
  };
  return { calls, fetchImpl, take: () => calls.splice(0) };
}
const angleBearer = (calls) => calls.filter((c) => c.path === '/v1/angle').map((c) => c.auth);
const clock = () => NOW + 60000;

test('a web plan counts only in the namespace of the account it was checked for: never for a guest or another account', async () => {
  const ls = memoryStorage();
  const a = billingFor({ token: 'tokA' });
  const entA = createEntitlements({ store: storeFor(ls, A), billing: a.billing, now: clock });
  await entA.refresh({ force: true });
  assert.equal(entA.tier(), 'ultra');
  assert.equal(raw(ls, 'hm2:entitlement').owner, A, 'kept with its account');

  // a guest on this browser: no plan, no plan details, nothing asked
  const guest = billingFor({ signedIn: false });
  const entG = createEntitlements({ store: storeFor(ls, null), billing: guest.billing, now: clock });
  await entG.refresh({ force: true });
  assert.equal(entG.tier(), 'none');
  assert.equal(entG.has('ultra'), false);
  assert.equal(entG.webPlan(), null, 'A’s renewal date and payment status are not shown to the guest');
  assert.equal(guest.calls.length, 0);

  // account B signs in here offline (or its first check fails): not A's plan
  const bOff = billingFor({ token: 'tokB', status: null });
  const entB = createEntitlements({ store: storeFor(ls, B), billing: bOff.billing, now: clock });
  await entB.refresh({ force: true });
  assert.equal(entB.tier(), 'none');
  assert.equal(entB.webPlan(), null);
  assert.equal(entB.has('ultra'), false);

  // A itself, back offline within the grace: still its plan
  const aOff = billingFor({ token: 'tokA', status: null });
  const entA2 = createEntitlements({ store: storeFor(ls, A), billing: aOff.billing, now: clock });
  await entA2.refresh({ force: true });
  assert.equal(entA2.tier(), 'ultra', 'the offline grace still holds for the account itself');

  // B's own answer: B's plan, kept with B (A's record replaced)
  const bOn = billingFor({ token: 'tokB', status: NONE });
  const entB2 = createEntitlements({ store: storeFor(ls, B), billing: bOn.billing, now: clock });
  await entB2.refresh({ force: true });
  assert.equal(entB2.tier(), 'none');

  // a web plan kept from before owners were kept: honoured by nobody until the server answers
  ls.setItem('hm2:entitlement', JSON.stringify({ tier: 'ultra', source: 'billing', since: NOW, checkedAt: NOW }));
  assert.equal(createEntitlements({ store: storeFor(ls, A), billing: aOff.billing, now: clock }).tier(), 'none');
  assert.equal(createEntitlements({ store: storeFor(ls, null), billing: guest.billing, now: clock }).tier(), 'none');
  // an App Store or test plan stays the phone's
  ls.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'app-store', since: 1 }));
  assert.equal(createEntitlements({ store: storeFor(ls, null), now: clock }).tier(), 'paid');
  assert.equal(createEntitlements({ store: storeFor(ls, B), now: clock }).tier(), 'paid');
  // a store without a namespace (sign-in off) keeps the rule it always had
  const plain = createStore({ backend: 'memory' });
  plain.set('entitlement', { tier: 'ultra', source: 'billing', since: NOW, checkedAt: NOW });
  assert.equal(createEntitlements({ store: plain, now: clock }).tier(), 'ultra');
});

test('an Another Angle session is used only in the namespace it was minted in: a guest or account B never sends A’s', async () => {
  const ls = memoryStorage();
  const srv = angleServer();
  const client = (uid, token) => createAngleClient({ store: storeFor(ls, uid), endpoint: EP, fetchImpl: srv.fetchImpl, now: clock, ...(token !== undefined ? { accountToken: async () => token } : {}) });
  const words = { text: 'My colleague got promoted instead of me.' };

  await client(A, 'tokA').angle(words);
  const a1 = srv.take();
  assert.deepEqual(a1.map((c) => c.path), ['/v1/health', '/v1/session', '/v1/angle']);
  assert.match(angleBearer(a1)[0], /^Bearer SESSION_FOR_tokA_/);
  const sessA = angleBearer(a1)[0];
  assert.equal(raw(ls, 'hm2:beyond.session').owner, A, 'kept with the namespace it was minted in');

  // A again (a new page): its own session is reused, no new one
  await client(A, 'tokA').angle(words);
  const a2 = srv.take();
  assert.deepEqual(a2.map((c) => c.path), ['/v1/health', '/v1/angle']);
  assert.equal(angleBearer(a2)[0], sessA);

  // a guest on this browser asks for its own session (without an account token) and never sends A's
  await client(null, null).angle(words);
  const g = srv.take();
  assert.deepEqual(g.map((c) => c.path), ['/v1/health', '/v1/session', '/v1/angle']);
  assert.equal(g.find((c) => c.path === '/v1/session').auth, null);
  assert.notEqual(angleBearer(g)[0], sessA);
  assert.match(angleBearer(g)[0], /^Bearer SESSION_FOR_GUEST_/);
  assert.equal(raw(ls, 'hm2:beyond.session').owner, null);

  // A's session back in the slot, then account B: B's own token goes to /v1/session, never A's session to /v1/angle
  await client(A, 'tokA').angle(words);
  srv.take();
  await client(B, 'tokB').angle(words);
  const b = srv.take();
  assert.equal(b.find((c) => c.path === '/v1/session')?.auth, 'Bearer tokB');
  assert.match(angleBearer(b)[0], /^Bearer SESSION_FOR_tokB_/);

  // a session kept from before owners were kept: never used in a namespace
  ls.setItem('hm2:beyond.session', JSON.stringify({ token: 'LEGACY_SESSION_TOKEN', exp: NOW + 86400000, endpoint: EP }));
  await client(null, null).angle(words);
  assert.ok(!angleBearer(srv.take()).includes('Bearer LEGACY_SESSION_TOKEN'));
  // a store without a namespace (sign-in off) keeps the rule it always had
  const plain = createStore({ backend: 'memory' });
  plain.set('beyond.session', { token: 'PLAIN_SESSION_TOKEN', exp: NOW + 86400000, endpoint: EP });
  await createAngleClient({ store: plain, endpoint: EP, fetchImpl: srv.fetchImpl, now: clock }).angle(words);
  assert.deepEqual(angleBearer(srv.take()), ['Bearer PLAIN_SESSION_TOKEN']);
});

test('an account’s web plan and its sessions leave the device with it; the phone’s plan and a guest’s session stay', () => {
  const ls = memoryStorage();
  const put = (k, v) => ls.setItem(k, JSON.stringify(v));
  put('hm2:entitlement', { tier: 'ultra', source: 'billing', owner: A, checkedAt: NOW });
  put('hm2:beyond.session', { token: 'x', exp: NOW, endpoint: EP, owner: A });
  put(`hm2:u:${A}:prefs`, { textScale: 1 });
  removeAccountData(ls, A);
  assert.equal(ls.getItem('hm2:entitlement'), null);
  assert.equal(ls.getItem('hm2:beyond.session'), null);
  // another account's or the guest's stay; so does an App Store plan
  put('hm2:entitlement', { tier: 'ultra', source: 'billing', owner: B, checkedAt: NOW });
  put('hm2:beyond.session', { token: 'x', exp: NOW, endpoint: EP, owner: null });
  assert.equal(removeAccountDeviceKeys(ls, A), 0);
  assert.ok(ls.getItem('hm2:entitlement') && ls.getItem('hm2:beyond.session'));
  put('hm2:entitlement', { tier: 'paid', source: 'app-store', since: 1 });
  removeAccountDeviceKeys(ls, B);
  assert.equal(raw(ls, 'hm2:entitlement').source, 'app-store');
  // a web plan kept before owners were is some account's (a guest never has one): it goes; a session kept then may be
  // the guest's, so it stays byte for byte (no namespace uses it)
  put('hm2:entitlement', { tier: 'ultra', source: 'billing', checkedAt: NOW });
  put('hm2:beyond.session', { token: 'x', exp: NOW, endpoint: EP });
  assert.equal(removeAccountDeviceKeys(ls, A), 1);
  assert.equal(ls.getItem('hm2:entitlement'), null);
  assert.deepEqual(raw(ls, 'hm2:beyond.session'), { token: 'x', exp: NOW, endpoint: EP });
});

// ---------------------------------------------- sign-out and deletion --
let fake, config;
const loc = { origin: 'http://localhost:8202', pathname: '/', href: 'http://localhost:8202/', hostname: 'localhost', protocol: 'http:', search: '', hash: '', replace() { throw new Error('must not navigate'); } };
const live = [];
before(async () => {
  fake = createFakeSupabase({ siteUrl: 'http://localhost:8202' });
  const port = await fake.listen(0);
  config = resolveAuthConfig({ published: { enabled: true, url: `http://localhost:${port}`, key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' }, loc, session: memoryStorage() });
});
after(async () => { for (const a of live) { try { (await a.ensureClient()).auth.stopAutoRefresh(); } catch { /* never loaded */ } } await fake.close(); });
beforeEach(() => { fake.reset(); Object.assign(fake.cfg, { autoconfirm: true, rateLimitMs: 0, restDelayMs: 0, restDelayTables: null, accessTtl: 3600 }); });

/** A device where `email` signed up, and a page of the app signed in as it that kept a web plan and an Another Angle session. */
async function signedInWithPlan(email) {
  const ls = memoryStorage();
  const g = createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: () => {} });
  live.push(g);
  assert.equal((await g.signUp({ email, password: 'gentle-moon-42', agreed: true })).signedIn, true);
  g.chooseGuestData('fresh');
  const ns = bootNamespace({ config, ls });
  const auth = createAuth({ config, ns, ls, ss: memoryStorage(), loader: async () => supabaseLib(), storage: ls, ...fakeDom(), loc, onReload: () => {} });
  live.push(auth);
  await auth.init();
  const store = createNamespacedStore({ ns, backend: ls });
  const a = billingFor({ token: 'tokA' });
  await createEntitlements({ store, billing: a.billing }).refresh({ force: true });
  const srv = angleServer();
  await createAngleClient({ store, endpoint: EP, fetchImpl: srv.fetchImpl, accountToken: async () => 'tokA' }).angle({ text: 'My colleague got promoted instead of me.' });
  assert.equal(raw(ls, 'hm2:entitlement').owner, ns.uid);
  assert.equal(raw(ls, 'hm2:beyond.session').owner, ns.uid);
  return { ls, ns, auth };
}
const gone = (ls) => assert.deepEqual([ls.getItem('hm2:entitlement'), ls.getItem('hm2:beyond.session')], [null, null], 'the account’s web plan and Another Angle session left with it');

test('a plain sign-out takes the account’s web plan and Another Angle session off the device-level keys', async () => {
  const { ls, auth } = await signedInWithPlan('dee@example.com');
  await auth.signOut();
  gone(ls);
});

test('"Sign out and remove my things from this phone" takes them too', async () => {
  const { ls, auth } = await signedInWithPlan('eli@example.com');
  await auth.signOut({ removeLocal: true });
  gone(ls);
});

test('deleting the account takes them too', async () => {
  const { ls, auth } = await signedInWithPlan('fay@example.com');
  assert.equal((await auth.deleteAccount()).ok, true);
  gone(ls);
});

test('"Remove this device’s data" takes them too (the next check brings the plan back)', async () => {
  const { ls, auth } = await signedInWithPlan('gus@example.com');
  assert.equal((await auth.removeDeviceData()).ok, true);
  gone(ls);
});
