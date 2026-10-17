// Web subscriptions on the client (src/app/billing.js): off by default and
// then exactly as before; on, the plans page asks a guest to sign in, sends
// only { plan, period } with the account's token to our own server and opens
// only Stripe's pages; the plan is the server's answer (source 'billing'),
// kept with an expiry and a few days' offline grace; Settings' "Manage
// subscription"; Another Angle's session carries the account's token only
// when billing is on, and the consent card asks again before it does; the
// access token comes from the sign-in client. Never in the App Store app's
// shell, never on a development host without ?billingDev. The guards on the
// shipped config follow it: off, today's state; switched on, its shape.
// Run with: node --test tests/
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createBilling, resolveBilling, inNativeShell, takeReturn, welcomeBack, stripePage, planNow, rememberPlan, plannedPlan, PATHS, PORTAL_WAITS, PLAN_INTENT_MS, RETURN_LINES, STRIPE_PAGES, CHECKOUT_DOMAIN, CHANGE_PLAN, PAYMENT_PENDING } from '../src/app/billing.js';
import { createEntitlements, BILLING_GRACE_MS, BILLING_RECHECK_MS, BILLING_CLOCK_SKEW_MS, PLANS } from '../src/app/entitlements.js';
import { BILLING_PROVIDER, BILLING_ENDPOINT, BILLING_PRICES, ANGLE_ENDPOINT, ANGLE_ALLOWED_HOSTS } from '../src/app/config.js';
import { createStore } from '../src/engine/storage.js';
import { createAngleClient } from '../src/beyond/angle-client.js';
import { SCHEMA_VERSION } from '../src/beyond/vocab.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const memStore = () => createStore({ backend: 'memory' });
const EP = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';
const CONFIG = { provider: 'stripe', endpoint: EP };
const NOW = Date.parse('2026-10-16T09:00:00Z');
const NBSP = ' ';

/** The auth handle as main.js has it (app.auth): signed in or a guest, with the full client's accessToken(). */
function authHandle({ signedIn = true, token = 'eyJhbGciOi.account-token.sig' } = {}) {
  const h = { enabled: true, status: () => (h.signedIn ? 'signed-in' : 'guest'), signedIn, token, loads: 0 };
  h.load = async () => { h.loads++; return { accessToken: async () => h.token }; };
  return h;
}
/** Our server's billing routes, faked: records every request. */
function billingServer({ status = { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, manageable: false } } = {}) {
  const s = { calls: [], status, statusReply: null, sync: null, checkout: { http: 200, body: { url: 'https://checkout.stripe.com/c/pay/cs_test_a1' } }, portal: { http: 200, body: { url: 'https://billing.stripe.com/p/session/test_1' } }, down: false };
  s.fetch = async (url, init = {}) => {
    s.calls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : null });
    if (s.down) throw new TypeError('Failed to fetch');
    const path = new URL(url).pathname;
    const reply = (http, body) => new Response(JSON.stringify(body), { status: http, headers: { 'content-type': 'application/json' } });
    // statusReply: the status route failing ({ http, body }: the server busy, the rate limit, a gateway)
    if (path === PATHS.status) return s.statusReply ? reply(s.statusReply.http, s.statusReply.body) : reply(200, s.status);
    if (path === PATHS.checkout) return reply(s.checkout.http, s.checkout.body);
    if (path === PATHS.portal) return reply(s.portal.http, s.portal.body);
    // POST /v1/billing/sync (WS3): a server without it yet answers 404, as any unknown path
    if (path === PATHS.sync && s.sync) return reply(s.sync.http, typeof s.sync.body === 'function' ? s.sync.body() : s.sync.body);
    return reply(404, {});
  };
  return s;
}
function setup({ signedIn = true, server = billingServer(), prices } = {}) {
  const auth = authHandle({ signedIn });
  const navs = [];
  const billing = createBilling({ auth: () => auth, signIn: true, config: CONFIG, fetchImpl: server.fetch, nav: (u) => navs.push(u), ...(prices ? { prices } : {}) });
  return { auth, navs, billing, server };
}
const clockAt = (t = NOW) => { const c = () => c.t; c.t = t; return c; };

// ------------------------------------------------------------------ off --
// The guards follow the shipped config (as the ANGLE_ENDPOINT tests do): off (as committed), exactly today's state;
// switched on as docs/PAYMENTS.md section 3 says, its values must have their shape. So the release that switches it
// on needs no change to any test.
test('the shipped config: off (then nothing is switched on), or switched on with our own Worker and prices of the right shape', () => {
  assert.deepEqual(Object.keys(BILLING_PRICES), ['hushmallow.paid.monthly', 'hushmallow.paid.yearly', 'hushmallow.ultra.monthly', 'hushmallow.ultra.yearly']);
  if (BILLING_PROVIDER === '') {
    assert.equal(BILLING_ENDPOINT, '');
    // the owner's US-dollar prices (docs/STAGING.md): shown only where billing is on (a branch preview)
    for (const [id, v] of Object.entries(BILLING_PRICES)) assert.match(v, /^(?:US\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?)?$/, `${id}: '' or a US-dollar price (US$9.99)`);
    assert.equal(resolveBilling({ loc: { hostname: 'app.hushmallow.com', protocol: 'https:', search: '' } }), null);
    assert.equal(resolveBilling(), null);
    assert.equal(resolveBilling({ loc: { hostname: 'app.hushmallow.com', search: '' } }), null);
    assert.equal(createBilling({ auth: () => authHandle(), signIn: true, shell: false }), null);
  } else {
    assert.equal(BILLING_PROVIDER, 'stripe');
    const on = resolveBilling({ loc: { hostname: 'app.hushmallow.com', search: '' } });
    assert.ok(on && ANGLE_ALLOWED_HOSTS.includes(new URL(on.endpoint).hostname), 'BILLING_ENDPOINT: our own Worker (ANGLE_ALLOWED_HOSTS, https)');
    assert.deepEqual(resolveBilling(), on);
    for (const [id, v] of Object.entries(BILLING_PRICES)) assert.match(v, /^(?:US\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?)?$/, `${id}: '' or the US-dollar price as Stripe shows it`);
    assert.notEqual(createBilling({ auth: () => authHandle(), signIn: true, shell: false }), null);
  }
  // either way: a development host without ?billingDev never has billing (its test purchases stay)…
  assert.equal(resolveBilling({ loc: { hostname: 'localhost', protocol: 'http:', search: '' }, session: null }), null, 'localhost without ?billingDev');
  // …a build without sign-in has none (a web plan belongs to an account), nor has the App Store app
  assert.equal(createBilling({ auth: () => authHandle(), signIn: false, config: CONFIG }), null);
  assert.equal(createBilling({ auth: () => authHandle(), signIn: true, config: CONFIG, shell: true }), null);
  // main.js passes it straight to the entitlements; null is exactly the old behaviour
  const main = read('src/app/main.js');
  assert.match(main, /const billing = createBilling\(\{ auth: \(\) => app\.auth, signIn: !!AUTH\.config\.enabled && !AUTH\.forwarding \}\);\nconst ent = createEntitlements\(\{ store, billing \}\);/);
  assert.match(main, /const billingBack = billing \? takeReturn\(\) : null;/);
  assert.match(main, /if \(billing\) document\.addEventListener\('visibilitychange'/);
  assert.match(main, /const planBefore = billing \? planNow\(ent\) : null;/);
  assert.match(main, /if \(billingBack\) welcomeBack\(app, billingBack, \{ before: planBefore \}\)\.catch\(\(\) => \{\}\);/);
  // the plan before the trip is taken before the first check at start
  assert.ok(main.indexOf('const planBefore = billing ? planNow(ent) : null;') < main.indexOf('  ent.refresh().catch(() => {});'), 'before the first check');
});

test('off: the entitlements, Another Angle and the plans copy are exactly as before', async () => {
  for (const billing of [undefined, null]) {
    const store = memStore();
    const ent = createEntitlements({ store, billing });
    assert.equal(ent.isWeb, false);
    assert.equal(typeof ent.prices, 'undefined', 'no prices() unless the App Store shell or the web provides them');
    assert.equal(ent.canPurchase, true, 'Node is a development host: test purchases, as before');
    assert.deepEqual(await ent.purchase('paid'), { ok: true, test: true });
    assert.equal(ent.source(), 'test');
    assert.deepEqual(await ent.refresh(), store.get('entitlement'));
    assert.equal(ent.webPlan(), null);
    assert.equal(ent.webSignedIn(), false);
    assert.equal(ent.webAnswered(), false);
    assert.deepEqual(await ent.manage(), { failed: true, reason: 'off' });
  }
  const P = await import('../src/app/scenes/plans.js');
  assert.equal(P.periodNote({ period: 'monthly' }).replaceAll(NBSP, ' '), 'Test purchase · monthly · nothing is charged');
  assert.equal(P.periodNote({ native: true }).replaceAll(NBSP, ' '), 'Billed monthly by the App Store. Cancel any time.');
  // Another Angle passes an account token only when billing is on
  assert.match(read('src/beyond/another-angle.js'), /\.\.\.\(app\.billing \? \{ accountToken: \(\) => app\.billing\.accountToken\(\) \} : \{\}\)/);
  // Settings and the plans page only branch on ent.isWeb
  assert.match(read('src/app/scenes/settings.js'), /const webPlan = ent\.isWeb \? ent\.webPlan\?\.\(\) : null;/);
  assert.match(read('src/app/scenes/plans.js'), /ent\.isWeb \? WEB_NOTE : ent\.canPurchase/);
});

test('resolveBilling: our own Worker over https only; ?billingDev=<port> on localhost for a rehearsal, kept for the tab', () => {
  assert.deepEqual(resolveBilling({ provider: 'stripe', endpoint: EP }), CONFIG);
  assert.deepEqual(resolveBilling({ provider: 'stripe', endpoint: `${EP}/` }), CONFIG);
  assert.equal(resolveBilling({ provider: 'stripe', endpoint: ANGLE_ENDPOINT })?.endpoint, EP, 'the documented switch: BILLING_ENDPOINT = ANGLE_ENDPOINT');
  for (const endpoint of ['https://evil.example', 'http://hushmallow-another-angle.vibyfy-chat.workers.dev', `${EP}?x=1`, `${EP}#a`, 'https://user:pw@hushmallow-another-angle.vibyfy-chat.workers.dev', 'not a url', '']) {
    assert.equal(resolveBilling({ provider: 'stripe', endpoint }), null, endpoint);
  }
  assert.equal(resolveBilling({ provider: 'paddle', endpoint: EP }), null);
  const session = new Map();
  const ss = { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => session.set(k, v), removeItem: (k) => session.delete(k) };
  const at = (search, hostname = 'localhost') => resolveBilling({ provider: '', endpoint: '', loc: { hostname, protocol: 'http:', search }, session: ss });
  assert.deepEqual(at('?billingDev=8790'), { provider: 'stripe', endpoint: 'http://localhost:8790' });
  assert.deepEqual(at(''), { provider: 'stripe', endpoint: 'http://localhost:8790' }, 'the way back from Stripe still has it');
  assert.equal(at('?billingDev=off'), null);
  assert.equal(at(''), null);
  assert.equal(at('?billingDev=8790', 'app.hushmallow.com'), null, 'never on a public host');
});

// ------------------------------------------------------------ the module --
test('checkout: a guest is asked to sign in (nothing sent); signed in, only { plan, period } and the token go to our server', async () => {
  const guest = setup({ signedIn: false });
  assert.deepEqual(await guest.billing.checkout('ultra', 'monthly'), { needsAccount: true });
  assert.deepEqual(await guest.billing.status(), { ok: false, reason: 'signed-out' });
  assert.deepEqual(await guest.billing.portal(), { needsAccount: true });
  assert.equal(guest.server.calls.length, 0);
  assert.equal(guest.auth.loads, 0, 'a guest never loads the sign-in library for this');

  const s = setup();
  assert.deepEqual(await s.billing.checkout('ultra', 'yearly'), { redirecting: true });
  assert.deepEqual(s.navs, ['https://checkout.stripe.com/c/pay/cs_test_a1']);
  const [c] = s.server.calls;
  assert.equal(c.url, `${EP}/v1/billing/checkout`);
  assert.deepEqual(c.body, { plan: 'ultra', period: 'yearly' }, 'never words, feelings or photos');
  assert.equal(c.init.method, 'POST');
  assert.deepEqual(c.init.headers, { authorization: 'Bearer eyJhbGciOi.account-token.sig', 'content-type': 'application/json' });
  for (const [k, v] of Object.entries({ mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error' })) assert.equal(c.init[k], v, k);
  // a plan already: the portal; a session the server refused: sign in again; failures say failed
  s.server.checkout = { http: 409, body: { error: { code: 'already_subscribed' } } };
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { manage: true });
  // a payment still going through (WS3: a just-completed checkout, or an unfinished first payment): not the portal
  s.server.checkout = { http: 409, body: { status: 'error', error: { code: 'payment_pending', message: 'x' } } };
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { pending: true });
  for (const body of [{}, null, { error: 'payment_pending' }]) {
    s.server.checkout = { http: 409, body };
    assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { manage: true }, `no code (an older server): ${JSON.stringify(body)}`);
  }
  // customer_conflict (WS3: the account's Stripe customer link needs support) is no plan to change: never the portal
  // on a customer linked to another account, and said with where to write (support)
  s.server.checkout = { http: 409, body: { status: 'error', error: { code: 'customer_conflict', message: 'x' } } };
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { failed: true, reason: 'customer_conflict', support: true });
  // any other code is no plan to change either, and the code means nothing on another status
  s.server.checkout = { http: 409, body: { status: 'error', error: { code: 'other', message: 'x' } } };
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { failed: true, reason: 'http_409' });
  s.server.checkout = { http: 503, body: { status: 'error', error: { code: 'customer_conflict', message: 'x' } } };
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { failed: true, reason: 'http_503' });
  s.server.checkout = { http: 401, body: {} };
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { needsAccount: true });
  s.server.checkout = { http: 503, body: {} };
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { failed: true, reason: 'http_503' });
  s.server.down = true;
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { failed: true, reason: 'network' });
  s.server.down = false;
  // only Stripe's own pages are ever opened, whatever the answer says
  for (const url of ['https://evil.example/pay', 'http://checkout.stripe.com/c/pay/x', 'javascript:alert(1)', 'https://checkout.stripe.com.evil.example/x', 'https://u:p@checkout.stripe.com/x', 'https://checkout.stripe.com:8443/x', null]) {
    s.server.checkout = { http: 200, body: { url } };
    assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { failed: true, reason: 'not_stripe' }, String(url));
  }
  assert.equal(s.navs.length, 1);
  // not a plan or a period: nothing is sent
  const n = s.server.calls.length;
  assert.deepEqual(await s.billing.checkout('premium', 'monthly'), { failed: true, reason: 'invalid' });
  assert.deepEqual(await s.billing.checkout('ultra', 'weekly'), { failed: true, reason: 'invalid' });
  assert.equal(s.server.calls.length, n);
  // signed in on this device, but no token to send (offline, could not refresh): sign in, nothing sent
  s.auth.token = null;
  assert.deepEqual(await s.billing.checkout('ultra', 'monthly'), { needsAccount: true });
  assert.equal(s.server.calls.length, n);
  assert.deepEqual([...STRIPE_PAGES], ['checkout.stripe.com', 'billing.stripe.com', 'checkout.hushmallow.com']);
  assert.equal(stripePage('https://billing.stripe.com/p/session/x'), 'https://billing.stripe.com/p/session/x');
});

test('our custom domain (D12): checkout and the portal open on checkout.hushmallow.com; its lookalikes never do', async () => {
  assert.equal(CHECKOUT_DOMAIN, 'checkout.hushmallow.com');
  assert.equal(stripePage('https://checkout.hushmallow.com/c/pay/cs_test_a1'), 'https://checkout.hushmallow.com/c/pay/cs_test_a1');
  assert.equal(stripePage('https://checkout.hushmallow.com/p/session/test_1'), 'https://checkout.hushmallow.com/p/session/test_1');
  for (const url of [
    'https://checkout.hushmallow.com.evil.example/c/pay/x', 'https://xcheckout.hushmallow.com/c/pay/x', 'https://evil.checkout.hushmallow.com/c/pay/x',
    'https://hushmallow.com/c/pay/x', 'https://checkout.hushmallow.co/c/pay/x', 'https://checkout.hushmallow.com./c/pay/x',
    'http://checkout.hushmallow.com/c/pay/x', 'https://checkout.hushmallow.com:8443/c/pay/x', 'https://u@checkout.hushmallow.com/c/pay/x',
    'https://u:p@checkout.hushmallow.com/c/pay/x',
  ]) assert.equal(stripePage(url), null, url);
  const s = setup();
  s.server.checkout = { http: 200, body: { url: 'https://checkout.hushmallow.com/c/pay/cs_test_a1' } };
  s.server.portal = { http: 200, body: { url: 'https://checkout.hushmallow.com/p/session/test_1' } };
  assert.deepEqual(await s.billing.checkout('ultra', 'yearly'), { redirecting: true });
  assert.deepEqual(await s.billing.portal(), { redirecting: true });
  assert.deepEqual(s.navs, ['https://checkout.hushmallow.com/c/pay/cs_test_a1', 'https://checkout.hushmallow.com/p/session/test_1']);
  // a lookalike in an answer: refused, nothing opened
  s.server.checkout = { http: 200, body: { url: 'https://checkout.hushmallow.com.evil.example/c/pay/x' } };
  assert.deepEqual(await s.billing.checkout('paid', 'monthly'), { failed: true, reason: 'not_stripe' });
  s.server.portal = { http: 200, body: { url: 'https://checkout.hushmallow.com:8443/p/session/x' } };
  assert.deepEqual(await s.billing.portal(), { failed: true, reason: 'not_stripe' });
  assert.equal(s.navs.length, 2);
});

test('status and portal: the server\'s answer, read strictly; the portal opens only Stripe\'s page', async () => {
  const s = setup();
  s.server.status = { tier: 'ultra', status: 'active', current_period_end: '2026-11-16T09:00:00.000Z', cancel_at_period_end: true, manageable: true };
  assert.deepEqual(await s.billing.status(), { ok: true, tier: 'ultra', period: null, status: 'active', periodEnd: Date.parse('2026-11-16T09:00:00Z'), endsAt: null, cancelAtPeriodEnd: true, manageable: true, scheduled: null }, 'a server from before ends_at (and period)');
  const [c] = s.server.calls;
  assert.equal(c.url, `${EP}/v1/billing/status`);
  assert.equal(c.init.method, 'GET');
  assert.equal(c.init.body, undefined);
  assert.deepEqual(c.init.headers, { authorization: 'Bearer eyJhbGciOi.account-token.sig' });
  // ends_at (WS2): ISO or ms, both read; anything else (or a seconds value sent by mistake) is no date, never 1970
  for (const v of ['2026-11-16T09:00:00.000Z', Date.parse('2026-11-16T09:00:00Z')]) {
    s.server.status = { tier: 'ultra', status: 'active', current_period_end: v, ends_at: v, cancel_at_period_end: true, manageable: true };
    const r = await s.billing.status();
    assert.equal(r.endsAt, Date.parse('2026-11-16T09:00:00Z'), String(v));
    assert.equal(r.periodEnd, Date.parse('2026-11-16T09:00:00Z'), String(v));
  }
  for (const v of [null, '', 'soon', 1794819600, -1, NaN, true, {}, '1794819600000']) {
    s.server.status = { tier: 'ultra', status: 'active', current_period_end: null, ends_at: v, cancel_at_period_end: false, manageable: true };
    assert.equal((await s.billing.status()).endsAt, null, String(v));
  }
  // the plan's period (the upgrade contract, C): 'monthly' | 'yearly' only, anything else none
  for (const [v, want] of [['monthly', 'monthly'], ['yearly', 'yearly'], ['weekly', null], ['YEARLY', null], [1, null], [null, null], [{}, null]]) {
    s.server.status = { tier: 'ultra', status: 'active', period: v, current_period_end: null, cancel_at_period_end: false, manageable: true };
    assert.equal((await s.billing.status()).period, want, String(v));
  }
  s.server.status = { tier: 'gold', status: '<b>', current_period_end: 'soon' };
  assert.deepEqual(await s.billing.status(), { ok: true, tier: 'none', period: null, status: 'none', periodEnd: null, endsAt: null, cancelAtPeriodEnd: false, manageable: false, scheduled: null });
  s.server.down = true;
  assert.deepEqual(await s.billing.status(), { ok: false, reason: 'network' });
  s.server.down = false;
  assert.deepEqual(await s.billing.portal(), { redirecting: true });
  assert.deepEqual(s.navs, ['https://billing.stripe.com/p/session/test_1']);
  assert.equal(s.server.calls.at(-1).url, `${EP}/v1/billing/portal`);
  assert.deepEqual(s.server.calls.at(-1).body, {}, 'Settings\' Manage subscription: the portal\'s front page');
  // the plans page, for a plan already held: straight to changing it ({ intent: 'switch' }); nothing else is ever sent
  assert.deepEqual(await s.billing.portal('switch'), { redirecting: true });
  assert.deepEqual(s.server.calls.at(-1).body, { intent: 'switch' });
  for (const other of ['cancel', 'SWITCH', { intent: 'switch' }, 1]) {
    await s.billing.portal(other);
    assert.deepEqual(s.server.calls.at(-1).body, {}, String(other));
  }
  const ent = createEntitlements({ store: memStore(), billing: s.billing });
  await ent.manage();
  assert.deepEqual(s.server.calls.at(-1).body, {});
  await ent.manage({ intent: 'switch' });
  assert.deepEqual(s.server.calls.at(-1).body, { intent: 'switch' });
  await ent.manage({ intent: 'other' });
  assert.deepEqual(s.server.calls.at(-1).body, {});
  // Settings asks for the front page; the plans page's 409 for the change of plan
  assert.match(read('src/app/scenes/settings.js'), /try \{ r = await ent\.manage\(\); \}/);
  assert.match(read('src/app/scenes/plans.js'), /try \{ m = await ent\.manage\(\{ intent: 'switch' \}\); \}/);
  const opened = s.navs.length;
  s.server.portal = { http: 404, body: { error: { code: 'no_subscription' } } };
  assert.deepEqual(await s.billing.portal(), { none: true });
  s.server.portal = { http: 200, body: { url: 'https://evil.example/portal' } };
  assert.deepEqual(await s.billing.portal(), { failed: true, reason: 'not_stripe' });
  assert.equal(s.navs.length, opened, 'nothing more opened');
});

test('prices come from configuration only; none set, none shown', () => {
  const shipped = Object.fromEntries(Object.entries(BILLING_PRICES).filter(([, v]) => v));
  assert.deepEqual(setup().billing.prices(), shipped, 'the shipped BILLING_PRICES (none while billing is off)');
  assert.deepEqual(setup({ prices: Object.fromEntries(Object.keys(BILLING_PRICES).map((k) => [k, ''])) }).billing.prices(), {}, 'none set: none shown');
  assert.deepEqual(setup({ prices: {} }).billing.prices(), {}, 'none set: none shown');
  const s = setup({ prices: { 'hushmallow.paid.monthly': ' US$9.99 ', 'hushmallow.ultra.yearly': 'US$149.99', 'hushmallow.paid.yearly': '', 'something.else': 'US$1' } });
  assert.deepEqual(s.billing.prices(), { 'hushmallow.paid.monthly': 'US$9.99', 'hushmallow.ultra.yearly': 'US$149.99' });
  const ent = createEntitlements({ store: memStore(), billing: s.billing });
  assert.deepEqual(ent.prices(), { 'hushmallow.paid.monthly': 'US$9.99', 'hushmallow.ultra.yearly': 'US$149.99' });
  // no amount is written into any customer copy: the plans page reads ent.prices()
  for (const p of ['src/app/scenes/plans.js', 'src/app/billing.js', 'src/app/scenes/settings.js', 'src/app/entitlements.js']) assert.doesNotMatch(read(p), /(?:[A-Z]{1,2}\$|[$£€])\s?\d/, p);
});

// ------------------------------------------------- entitlement 'billing' --
test('entitlement source "billing": the server\'s answer, kept with when it was checked, offline grace, then set aside', async () => {
  const now = clockAt();
  const s = setup();
  s.server.status = { tier: 'ultra', status: 'active', current_period_end: '2026-11-16T09:00:00.000Z', cancel_at_period_end: false, manageable: true };
  const store = memStore();
  const ent = createEntitlements({ store, billing: s.billing, now });
  assert.equal(ent.isWeb, true);
  assert.equal(ent.canPurchase, true);
  assert.equal(ent.tier(), 'none');
  await ent.refresh();
  assert.equal(ent.tier(), 'ultra');
  assert.equal(ent.source(), 'billing');
  assert.equal(ent.has('ultra'), true);
  const kept = store.get('entitlement');
  assert.deepEqual(kept, { tier: 'ultra', source: 'billing', since: NOW, checkedAt: NOW, period: null, status: 'active', periodEnd: Date.parse('2026-11-16T09:00:00Z'), endsAt: null, cancelAtPeriodEnd: false, manageable: true, scheduled: null });
  assert.deepEqual(ent.webPlan(), { period: null, status: 'active', periodEnd: Date.parse('2026-11-16T09:00:00Z'), endsAt: null, cancelAtPeriodEnd: false, manageable: true, scheduled: null });
  // the period the server says (the plans page reads it to offer an upgrade): kept with the plan
  s.server.status = { ...s.server.status, period: 'yearly' };
  await ent.refresh({ force: true });
  assert.equal(store.get('entitlement').period, 'yearly');
  assert.equal(ent.webPlan().period, 'yearly');
  assert.equal(createEntitlements({ store, billing: s.billing, now }).webPlan().period, 'yearly', 'kept on this phone');
  s.server.status = { ...s.server.status, period: undefined };
  await ent.refresh({ force: true });
  assert.equal(ent.webPlan().period, null);
  // at most one check a minute (start, back to the foreground) unless forced
  const n = s.server.calls.length;
  await ent.refresh();
  assert.equal(s.server.calls.length, n);
  now.t += BILLING_RECHECK_MS;
  await ent.refresh();
  assert.equal(s.server.calls.length, n + 1);
  await ent.refresh({ force: true });
  assert.equal(s.server.calls.length, n + 2);
  // offline: what is kept stays within the grace…
  s.server.down = true;
  now.t += BILLING_GRACE_MS - BILLING_RECHECK_MS - 1;
  await ent.refresh({ force: true });
  assert.equal(ent.tier(), 'ultra');
  // …and lapses after it (nothing stored is changed; the next answer decides)
  now.t += BILLING_RECHECK_MS + 2;
  assert.equal(ent.tier(), 'none');
  assert.equal(ent.source(), null);
  assert.equal(ent.has('paid'), false);
  assert.equal(store.get('entitlement').tier, 'ultra');
  // a page that starts after the grace sees no plan either, until the server answers
  const later = createEntitlements({ store, billing: s.billing, now });
  assert.equal(later.tier(), 'none');
  s.server.down = false;
  await later.refresh();
  assert.equal(later.tier(), 'ultra');
  // the subscription ends: the server says none, and the web plan goes
  s.server.status = { tier: 'none', status: 'canceled', current_period_end: '2026-11-16T09:00:00.000Z', cancel_at_period_end: false, manageable: true };
  await later.refresh({ force: true });
  assert.equal(later.tier(), 'none');
  assert.equal(later.source(), 'billing', 'kept as a past web plan: Settings can still open the portal for receipts');
  assert.equal(later.webPlan().status, 'canceled');
});

test('entitlement source "billing" never takes a test or App Store plan away; signed out keeps what is kept', async () => {
  const s = setup();
  const store = memStore();
  store.set('entitlement', { tier: 'paid', source: 'test', since: 1 });
  const ent = createEntitlements({ store, billing: s.billing });
  await ent.refresh({ force: true });
  assert.deepEqual(store.get('entitlement'), { tier: 'paid', source: 'test', since: 1 }, 'the server\'s "none" leaves a test plan alone');
  store.set('entitlement', { tier: 'ultra', source: 'app-store', since: 1 });
  const ios = createEntitlements({ store, billing: s.billing });
  await ios.refresh({ force: true });
  assert.equal(ios.source(), 'app-store');
  // signed out (or the session expired here): nothing is asked, what is kept stays within the grace
  const now = clockAt();
  const away = setup({ signedIn: false });
  const st = memStore();
  st.set('entitlement', { tier: 'ultra', source: 'billing', since: NOW, checkedAt: NOW });
  const e2 = createEntitlements({ store: st, billing: away.billing, now });
  await e2.refresh({ force: true });
  assert.equal(e2.tier(), 'ultra');
  assert.equal(away.server.calls.length, 0);
});

test('purchase and restore go through the web; in the App Store shell the web is never used', async () => {
  const s = setup();
  const ent = createEntitlements({ store: memStore(), billing: s.billing });
  assert.deepEqual(await ent.purchase('ultra', 'yearly'), { ok: false, test: false, redirecting: true });
  assert.deepEqual(s.server.calls[0].body, { plan: 'ultra', period: 'yearly' });
  assert.deepEqual(await createEntitlements({ store: memStore(), billing: setup({ signedIn: false }).billing }).purchase('paid'), { ok: false, test: false, needsAccount: true });
  s.server.status = { tier: 'paid', status: 'active', current_period_end: null, cancel_at_period_end: false, manageable: true };
  await ent.restore();
  assert.equal(ent.tier(), 'paid');
  assert.deepEqual(await ent.manage(), { redirecting: true });
  assert.equal(s.navs.at(-1), 'https://billing.stripe.com/p/session/test_1');
  assert.equal(ent.webSignedIn(), true);
  // the iOS wrapper: StoreKit only, the web billing is ignored entirely
  const prev = globalThis.window;
  globalThis.window = { HushNative: { store: { current: async () => ({ tier: 'paid' }), purchase: async () => ({ tier: 'ultra' }), restore: async () => ({ tier: 'paid' }) } } };
  try {
    const shell = setup();
    const native = createEntitlements({ store: memStore(), billing: shell.billing });
    assert.equal(native.isNative, true);
    assert.equal(native.isWeb, false);
    assert.deepEqual(await native.purchase('ultra', 'monthly'), { ok: true, test: false });
    assert.equal(native.source(), 'app-store');
    await native.refresh({ force: true });
    assert.equal(shell.server.calls.length, 0, 'nothing ever goes to the web billing from the App Store app');
  } finally { if (prev === undefined) delete globalThis.window; else globalThis.window = prev; }
});

// --------------------------------------------------------- back from Stripe --
test('back from Stripe: ?billing= leaves the address at once; the plan is asked for again and said once', async () => {
  const replaced = [];
  const hist = { state: { i: 0 }, replaceState: (s, _, u) => replaced.push([s, u]) };
  assert.deepEqual(takeReturn({ loc: { href: 'https://app.hushmallow.com/?billing=success' }, hist }), { kind: 'success', sessionId: null });
  assert.deepEqual(replaced.pop(), [{ i: 0 }, 'https://app.hushmallow.com/']);
  assert.deepEqual(takeReturn({ loc: { href: 'https://app.hushmallow.com/?v=abc&billing=cancel#home' }, hist }), { kind: 'cancel', sessionId: null });
  assert.equal(replaced.pop()[1], 'https://app.hushmallow.com/?v=abc#home', 'everything else in the address stays');
  assert.deepEqual(takeReturn({ loc: { href: 'https://app.hushmallow.com/?billing=portal' }, hist }), { kind: 'portal', sessionId: null });
  assert.equal(takeReturn({ loc: { href: 'https://app.hushmallow.com/?billing=<script>' }, hist }), null);
  assert.equal(replaced.length, 2, 'an unknown value is taken out too');
  assert.equal(takeReturn({ loc: { href: 'https://app.hushmallow.com/' }, hist }), null);
  assert.equal(replaced.length, 2);

  // success, with the webhook a moment behind: asked again until the plan is here, then said once
  const server = billingServer();
  const answer = server.fetch;
  let asks = 0;
  server.fetch = async (u, i) => {
    if (new URL(u).pathname === PATHS.status && ++asks === 3) server.status = { tier: 'ultra', status: 'active', current_period_end: null, cancel_at_period_end: false, manageable: true };
    return answer(u, i);
  };
  const toasts = [], waits = [];
  const app = { ent: createEntitlements({ store: memStore(), billing: setup({ server }).billing }), toast: (t) => toasts.push(t), haptic: () => {}, world: { react: () => {} } };
  assert.deepEqual(await welcomeBack(app, { kind: 'cancel', sessionId: null }, { sleep: async () => {} }), 'cancel', 'takeReturn\'s answer as it comes');
  toasts.length = 0;
  const fast = { sleep: async (ms) => { waits.push(ms); } };
  assert.equal(await welcomeBack(app, 'success', fast), 'welcome');
  assert.deepEqual(toasts, [`Welcome to ${PLANS.ultra.name}`]);
  assert.deepEqual(toasts, ['Welcome to hushmallow Beyond']);
  assert.deepEqual(waits, [2000, 4000], 'asked three times, then said once');
  // never arrives in time: a calm "on its way"
  const s3 = setup();
  const app3 = { ...app, ent: createEntitlements({ store: memStore(), billing: s3.billing }) };
  toasts.length = 0;
  assert.equal(await welcomeBack(app3, 'success', { sleep: async () => {} }), 'pending');
  assert.deepEqual(toasts, [RETURN_LINES.pending]);
  toasts.length = 0;
  assert.equal(await welcomeBack(app3, 'cancel', fast), 'cancel');
  assert.deepEqual(toasts, ['No problem. Nothing was charged.']);
  assert.equal(await welcomeBack(app3, 'portal', fast), 'portal');
  assert.equal(await welcomeBack(app3, null, fast), null);
});

test('back from Checkout: session_id leaves the address with ?billing=, and only a well-formed one is kept, only on success', () => {
  const replaced = [];
  const hist = { state: null, replaceState: (_, __, u) => replaced.push(u) };
  const id = `cs_test_${'a1B2'.repeat(15)}`;
  assert.deepEqual(takeReturn({ loc: { href: `https://app.hushmallow.com/?billing=success&session_id=${id}` }, hist }), { kind: 'success', sessionId: id });
  assert.equal(replaced.pop(), 'https://app.hushmallow.com/', 'both taken out at once');
  assert.deepEqual(takeReturn({ loc: { href: `https://app.hushmallow.com/?v=abc&session_id=${id}&billing=success#home` }, hist }), { kind: 'success', sessionId: id });
  assert.equal(replaced.pop(), 'https://app.hushmallow.com/?v=abc#home');
  const live = `cs_live_${'Z9'.repeat(20)}`;
  assert.equal(takeReturn({ loc: { href: `https://app.hushmallow.com/?billing=success&session_id=${live}` }, hist }).sessionId, live);
  replaced.pop();
  // never sent: Stripe's placeholder left unfilled, another kind of id, too short or long, anything else in it
  for (const bad of ['{CHECKOUT_SESSION_ID}', 'cs_test_short', `cs_prod_${'a'.repeat(20)}`, `sub_${'a'.repeat(20)}`, `cs_test_${'a'.repeat(251)}`, `cs_test_${'a'.repeat(20)}%3Cb%3E`, `cs_test_${'a'.repeat(20)}-x`, '']) {
    assert.deepEqual(takeReturn({ loc: { href: `https://app.hushmallow.com/?billing=success&session_id=${bad}` }, hist }), { kind: 'success', sessionId: null }, bad);
    assert.equal(replaced.pop(), 'https://app.hushmallow.com/', `${bad}: taken out all the same`);
  }
  // a session id beside any other kind is taken out and not kept
  for (const kind of ['cancel', 'portal']) {
    assert.deepEqual(takeReturn({ loc: { href: `https://app.hushmallow.com/?billing=${kind}&session_id=${id}` }, hist }), { kind, sessionId: null });
    assert.equal(replaced.pop(), 'https://app.hushmallow.com/');
  }
  assert.equal(takeReturn({ loc: { href: `https://app.hushmallow.com/?billing=nope&session_id=${id}` }, hist }), null);
  assert.equal(replaced.pop(), 'https://app.hushmallow.com/');
  // no ?billing=: not ours, nothing touched
  assert.equal(takeReturn({ loc: { href: `https://app.hushmallow.com/?session_id=${id}` }, hist }), null);
  assert.equal(replaced.length, 0);
});

test('sync: the session id goes to /v1/billing/sync with the token (only a well-formed one, never for a guest); the answer is read as the status', async () => {
  const id = `cs_test_${'a1B2'.repeat(15)}`;
  const s = setup();
  s.server.sync = { http: 200, body: { tier: 'ultra', status: 'active', current_period_end: '2026-11-16T09:00:00.000Z', ends_at: null, cancel_at_period_end: false, manageable: true } };
  assert.deepEqual(await s.billing.sync(id), { ok: true, tier: 'ultra', period: null, status: 'active', periodEnd: Date.parse('2026-11-16T09:00:00Z'), endsAt: null, cancelAtPeriodEnd: false, manageable: true, scheduled: null });
  const [c] = s.server.calls;
  assert.equal(c.url, `${EP}/v1/billing/sync`);
  assert.equal(c.init.method, 'POST');
  assert.deepEqual(c.body, { session_id: id }, 'the session id only');
  assert.deepEqual(c.init.headers, { authorization: 'Bearer eyJhbGciOi.account-token.sig', 'content-type': 'application/json' });
  for (const [k, v] of Object.entries({ mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error' })) assert.equal(c.init[k], v, k);
  // malformed: nothing is sent
  for (const bad of [null, undefined, '', '{CHECKOUT_SESSION_ID}', 'cs_test_short', `cs_test_${'a'.repeat(20)}<`, 42, { id }]) assert.deepEqual(await s.billing.sync(bad), { ok: false, reason: 'invalid' }, String(bad));
  assert.equal(s.server.calls.length, 1);
  // a server without the route yet, another account's session, refused: not ok (the caller goes on asking for the status)
  for (const [http, reason] of [[404, 'http_404'], [403, 'http_403'], [400, 'http_400'], [502, 'http_502']]) {
    s.server.sync = { http, body: { status: 'error', error: { code: 'x' } } };
    assert.deepEqual(await s.billing.sync(id), { ok: false, reason });
  }
  s.server.sync = { http: 401, body: {} };
  assert.deepEqual(await s.billing.sync(id), { ok: false, reason: 'signed-out' });
  s.server.down = true;
  assert.deepEqual(await s.billing.sync(id), { ok: false, reason: 'network' });
  const guest = setup({ signedIn: false });
  assert.deepEqual(await guest.billing.sync(id), { ok: false, reason: 'signed-out' });
  assert.equal(guest.server.calls.length, 0);
});

test('back from Checkout: the session is synced once, then the plan is asked for as before; a 404 from sync is ignored', async () => {
  const id = `cs_test_${'a1B2'.repeat(15)}`;
  const PLAN = { tier: 'ultra', status: 'active', current_period_end: null, cancel_at_period_end: false, manageable: true };
  const run = async (prep) => {
    const server = billingServer();
    prep(server);
    const toasts = [], waits = [];
    const app = { ent: createEntitlements({ store: memStore(), billing: setup({ server }).billing }), toast: (t) => toasts.push(t), haptic: () => {}, world: { react: () => {} } };
    const out = await welcomeBack(app, { kind: 'success', sessionId: id }, { sleep: async (ms) => { waits.push(ms); } });
    return { out, toasts, waits, paths: server.calls.map((c) => new URL(c.url).pathname), ent: app.ent };
  };
  // the server has the route: the plan at once, said once, no status asked
  const now = await run((sv) => { sv.sync = { http: 200, body: PLAN }; });
  assert.equal(now.out, 'welcome');
  assert.deepEqual(now.toasts, ['Welcome to hushmallow Beyond']);
  assert.deepEqual(now.paths, ['/v1/billing/sync']);
  assert.equal(now.ent.source(), 'billing');
  // a server without it yet (404): ignored, then the status checks as before
  const old = await run((sv) => {
    let asks = 0;
    const answer = sv.fetch;
    sv.fetch = async (u, i) => { if (new URL(u).pathname === PATHS.status && ++asks === 2) sv.status = PLAN; return answer(u, i); };
  });
  assert.equal(old.out, 'welcome');
  assert.deepEqual(old.paths, ['/v1/billing/sync', '/v1/billing/status', '/v1/billing/status']);
  assert.deepEqual(old.waits, [2000]);
  // the session is not complete yet (the plan is none): the checks go on, then a calm "on its way"
  const open = await run((sv) => { sv.sync = { http: 200, body: { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, manageable: false } }; });
  assert.equal(open.out, 'pending');
  assert.deepEqual(open.paths, ['/v1/billing/sync', ...Array(5).fill('/v1/billing/status')]);
  assert.deepEqual(open.toasts, [RETURN_LINES.pending]);
  // no session id (an old success address, or a malformed one): no sync, as before
  const server = billingServer();
  server.status = PLAN;
  const app = { ent: createEntitlements({ store: memStore(), billing: setup({ server }).billing }), toast: () => {}, haptic: () => {}, world: { react: () => {} } };
  assert.equal(await welcomeBack(app, { kind: 'success', sessionId: null }, { sleep: async () => {} }), 'welcome');
  assert.deepEqual(server.calls.map((c) => new URL(c.url).pathname), ['/v1/billing/status']);
});

test('back from Checkout, not signed in on this page: the sign-in screen says to sign in to see the plan, never "on its way"', async () => {
  const id = `cs_test_${'a1B2'.repeat(15)}`;
  const away = setup({ signedIn: false });
  const toasts = [], went = [];
  const app = { ent: createEntitlements({ store: memStore(), billing: away.billing }), toast: (t) => toasts.push(t), go: (...a) => went.push(a), haptic: () => {}, world: { react: () => {} } };
  const slept = [];
  assert.equal(await welcomeBack(app, { kind: 'success', sessionId: id }, { sleep: async (ms) => { slept.push(ms); } }), 'signed-out');
  assert.deepEqual(went, [['account', { view: 'signin', notice: 'Sign in to see your plan.' }]]);
  assert.equal(RETURN_LINES.signIn, 'Sign in to see your plan.');
  assert.deepEqual(toasts, [], 'the account screen says it (its notice), never "on its way"');
  assert.deepEqual(slept, [], 'nothing waited for');
  assert.equal(away.server.calls.length, 0, 'nothing sent');
  // a page without app.go (never main.js): the line as a toast
  const bare = { ...app, go: undefined };
  assert.equal(await welcomeBack(bare, 'success', { sleep: async () => {} }), 'signed-out');
  assert.deepEqual(toasts, ['Sign in to see your plan.']);
  // cancel says the same as ever, signed in or not
  toasts.length = 0;
  assert.equal(await welcomeBack(app, { kind: 'cancel', sessionId: null }), 'cancel');
  assert.deepEqual(toasts, [RETURN_LINES.cancel]);
});

test('back from the portal: the plan is asked for quietly until it differs from the one before the trip, at most four times', async () => {
  assert.deepEqual([...PORTAL_WAITS], [0, 2000, 4000, 8000]);
  const FLOW = { tier: 'paid', status: 'active', current_period_end: '2026-11-12T09:00:00.000Z', ends_at: null, cancel_at_period_end: false, manageable: true };
  /** A page back from the portal: the plan kept before the trip is FLOW; the server's answer turns to `after` at ask `at`. */
  const run = async ({ after = FLOW, at = Infinity, signedIn = true, boot = false } = {}) => {
    const server = billingServer({ status: FLOW });
    const store = memStore();
    await createEntitlements({ store, billing: setup({ server }).billing }).refresh({ force: true });   // the earlier visit
    server.calls.length = 0;
    let asks = 0;
    const answer = server.fetch;
    server.fetch = async (u, i) => { if (new URL(u).pathname === PATHS.status && ++asks >= at) server.status = after; return answer(u, i); };
    const toasts = [], waits = [];
    const ent = createEntitlements({ store, billing: setup({ server, signedIn }).billing });
    const before = planNow(ent);   // main.js, before its first check
    if (boot) await ent.refresh();   // that first check has already brought the change
    const app = { ent, toast: (t) => toasts.push(t), haptic: () => {}, world: { react: () => {} } };
    const out = await welcomeBack(app, { kind: 'portal', sessionId: null }, { before, sleep: async (ms) => { waits.push(ms); } });
    return { out, toasts, waits, asks, ent };
  };
  assert.deepEqual(planNow((await run()).ent), { tier: 'paid', period: null, status: 'active', cancelAtPeriodEnd: false, endsAt: null });
  // nothing changes (or the webhook is later still): four asks, then no more, and nothing said
  const same = await run();
  assert.equal(same.out, 'portal');
  assert.equal(same.asks, 4);
  assert.deepEqual(same.waits, [2000, 4000, 8000]);
  assert.deepEqual(same.toasts, [], 'quietly');
  // cancelled there, the webhook a moment behind: asked until it shows, then no more
  const cancelled = await run({ after: { ...FLOW, cancel_at_period_end: true, ends_at: FLOW.current_period_end }, at: 3 });
  assert.equal(cancelled.asks, 3);
  assert.deepEqual(cancelled.waits, [2000, 4000]);
  assert.equal(cancelled.ent.webPlan().cancelAtPeriodEnd, true);
  assert.deepEqual(cancelled.toasts, []);
  // each of the five is a change: the tier, its period (monthly → yearly in the portal), Stripe's status, cancelling, the end date
  for (const [name, after] of [
    ['tier', { ...FLOW, tier: 'ultra' }], ['period', { ...FLOW, period: 'yearly' }], ['status', { ...FLOW, status: 'past_due' }],
    ['cancelling', { ...FLOW, cancel_at_period_end: true }], ['end date', { ...FLOW, ends_at: '2027-02-12T09:00:00.000Z' }],
  ]) {
    const r = await run({ after, at: 2 });
    assert.equal(r.asks, 2, name);
  }
  // the first check at start already brought it: one more ask sees the difference, then no more
  const early = await run({ after: { ...FLOW, tier: 'ultra' }, at: 1, boot: true });
  assert.equal(early.asks, 2);
  assert.equal(early.ent.tier(), 'ultra');
  // without `before` (a caller other than main.js): the plan as welcomeBack finds it
  const server = billingServer({ status: FLOW });
  const ent = createEntitlements({ store: memStore(), billing: setup({ server }).billing });
  assert.equal(await welcomeBack({ ent, toast: () => {} }, 'portal', { sleep: async () => {} }), 'portal');
  assert.equal(server.calls.length, 1, 'none kept here: the first answer (Flow) is the change');
  // signed out on this page: nothing to ask
  const away = await run({ signedIn: false });
  assert.equal(away.asks, 0);
  assert.equal(away.out, 'portal');
});

test('sync waits for a check already in flight: the older answer never lands after the session\'s', async () => {
  const id = `cs_test_${'a1B2'.repeat(15)}`;
  const server = billingServer({ status: { tier: 'none', status: 'canceled', current_period_end: null, cancel_at_period_end: false, manageable: true } });
  const answer = server.fetch;
  let release;
  const held = new Promise((r) => { release = r; });
  const asked = [];   // in the order sent (the fake records a request when it answers)
  server.fetch = async (u, i) => { const p = new URL(u).pathname; asked.push(p); if (p === PATHS.status && asked.length === 1) await held; return answer(u, i); };
  server.sync = { http: 200, body: { tier: 'paid', status: 'active', current_period_end: null, cancel_at_period_end: false, manageable: true } };
  const store = memStore();
  store.set('entitlement', { tier: 'none', source: 'billing', since: 1, checkedAt: Date.now(), status: 'canceled', manageable: true });   // a past web plan
  const ent = createEntitlements({ store, billing: setup({ server }).billing });
  const boot = ent.refresh();   // main.js asks at start, before the way back from Stripe is handled
  const synced = ent.sync(id);
  for (let i = 0; i < 5; i++) await tick();
  assert.deepEqual(asked, ['/v1/billing/status'], 'the sync waits');
  release();
  await boot;
  await synced;
  assert.deepEqual(asked, ['/v1/billing/status', '/v1/billing/sync']);
  assert.equal(ent.tier(), 'paid', 'the session\'s answer is the last word');
  // and a refresh asked while the sync runs joins it (one request at a time)
  const again = ent.sync(id);
  const joined = ent.refresh({ force: true });
  await Promise.all([again, joined]);
  assert.deepEqual(asked, ['/v1/billing/status', '/v1/billing/sync', '/v1/billing/sync']);
});

// ------------------------------------------------------------- the copy --
test('web billing copy: no App Store, no price written in, no plan word, no "server" on the plans page', async () => {
  const P = await import('../src/app/scenes/plans.js');
  const lines = [
    P.periodNote({ web: true, period: 'monthly' }), P.periodNote({ web: true, period: 'yearly' }),
    P.WEB_NOTE, P.SIGN_IN_FIRST, P.SIGN_IN_TO_RESTORE, P.CHANGE_PLAN, P.PAYMENT_PENDING, ...Object.values(RETURN_LINES),
    (await import('../src/app/billing.js')).BILLING_SUPPORT,
  ];
  assert.deepEqual([P.CHANGE_PLAN, P.PAYMENT_PENDING], [CHANGE_PLAN, PAYMENT_PENDING], 'one copy, said by the plans page and the account card');
  assert.equal(lines[0].replaceAll(NBSP, ' '), 'Billed monthly. Cancel any time in Settings.');
  assert.equal(lines[1].replaceAll(NBSP, ' '), 'Billed once a year. Cancel any time in Settings.');
  assert.ok(lines[0].endsWith(`in${NBSP}Settings.`), 'never "Settings." alone on a line');
  for (const l of lines) {
    assert.doesNotMatch(l, /App Store|Apple|\bserver\b|\bAI\b|\b(Paid|Ultra|Premium)\b|[$£€]\d/, l);
  }
  // the App Store's line stays the App Store's, only in the shell
  assert.match(P.periodNote({ native: true, web: true }), /by the App Store/);
  const { webPlanNote } = await import('../src/app/scenes/settings.js');
  const end = Date.parse('2026-11-12T09:00:00Z');
  assert.equal(webPlanNote({ status: 'active', periodEnd: end, cancelAtPeriodEnd: false }, 'ultra'), 'Renews on 12 November 2026');
  assert.equal(webPlanNote({ status: 'active', periodEnd: end, cancelAtPeriodEnd: true }, 'paid'), 'Ends on 12 November 2026. Nothing more is charged.');
  assert.match(webPlanNote({ status: 'past_due', periodEnd: end }, 'ultra'), /^Your last payment didn’t go through\./);
  assert.equal(webPlanNote({ status: 'canceled', periodEnd: end }, 'none'), null);
  assert.equal(webPlanNote({ status: 'active', periodEnd: null }, 'ultra'), null);
  // the server's ends_at (WS2): "Ends on" that day; a set end after this period still renews until then
  const hour = 3600000;
  assert.equal(webPlanNote({ status: 'active', periodEnd: end, endsAt: end, cancelAtPeriodEnd: true }, 'ultra'), 'Ends on 12 November 2026. Nothing more is charged.');
  assert.equal(webPlanNote({ status: 'active', periodEnd: end, endsAt: end + hour, cancelAtPeriodEnd: false }, 'ultra'), 'Ends on 12 November 2026. Nothing more is charged.');
  assert.equal(webPlanNote({ status: 'active', periodEnd: end, endsAt: Date.parse('2026-10-30T09:00:00Z'), cancelAtPeriodEnd: false }, 'paid'), 'Ends on 30 October 2026. Nothing more is charged.');
  assert.equal(webPlanNote({ status: 'active', periodEnd: end, endsAt: Date.parse('2027-02-12T09:00:00Z'), cancelAtPeriodEnd: false }, 'paid'), 'Renews on 12 November 2026. Ends on 12 February 2027.');
  assert.equal(webPlanNote({ status: 'active', periodEnd: null, endsAt: end, cancelAtPeriodEnd: false }, 'paid'), 'Ends on 12 November 2026. Nothing more is charged.');
  assert.match(webPlanNote({ status: 'past_due', periodEnd: end, endsAt: end }, 'ultra'), /^Your last payment didn’t go through\./, 'a card to look at first');
  // …from the server's answer through what this phone keeps to Settings
  const ends = setup();
  ends.server.status = { tier: 'paid', status: 'active', current_period_end: '2026-11-12T09:00:00.000Z', ends_at: '2026-11-12T09:00:00.000Z', cancel_at_period_end: true, manageable: true };
  const store = memStore();
  await createEntitlements({ store, billing: ends.billing }).refresh({ force: true });
  const again = createEntitlements({ store, billing: ends.billing });
  assert.equal(again.webPlan().endsAt, end, 'kept on this phone');
  assert.equal(webPlanNote(again.webPlan(), again.tier()), 'Ends on 12 November 2026. Nothing more is charged.');
  // deleting the account never cancels a web subscription nor deletes our server's record of it, and the delete screen
  // says so (only with billing on)
  const acct = read('src/app/scenes/account.js');
  assert.match(acct, /h\('h2', \{ class: 'hm-account-eyebrow' \}, 'Not touched'\), list\(notTouched\(app\)\)\)/);
  const { WEB_PLAN_NOT_TOUCHED, notTouched } = await import('../src/app/scenes/account.js');
  assert.equal(WEB_PLAN_NOT_TOUCHED, 'a web subscription, if you have one, and our server’s record of it (which plan and its status, never your card): deleting your account doesn’t cancel it, so cancel it first in Settings → Manage subscription');
  const before = notTouched({ billing: null });
  assert.ok(before.includes('your plan: it belongs to this phone’s app store account'), 'off: the list as before');
  assert.deepEqual(notTouched({ billing: setup().billing }), before.map((l) => (l.startsWith('your plan:') ? WEB_PLAN_NOT_TOUCHED : l)));
});

// ------------------------------------------------------- the plans page --
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1;
    this.children = []; this.attrs = {}; this.style = {}; this.listeners = {}; this.parentNode = null; this.textContent = ''; this.disabled = false;
    const cls = new Set();
    this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), toggle: (c, on) => { if (on ?? !cls.has(c)) cls.add(c); else cls.delete(c); }, contains: (c) => cls.has(c) };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  toggleAttribute(k, on) { if (on) this.attrs[k] = ''; else delete this.attrs[k]; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener() {}
  append(...kids) { for (const k of kids) { k.parentNode = this; this.children.push(k); } }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this); }
  querySelector() { return null; }
  getBoundingClientRect() { return { top: 0, bottom: 0 }; }
  focus() {}
}
const text = (n) => (n.nodeType === 3 ? n.textContent : (n.children || []).map(text).join('') || n.textContent || '');
const all = (n, out = []) => { out.push(n); for (const c of n.children || []) all(c, out); return out; };
const tick = () => new Promise((r) => setTimeout(r, 0));
const prevDoc = globalThis.document;
after(() => { if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc; });

/** A document made of FakeEl, as the scenes need it; → its body. */
function fakeDocument() {
  const body = new FakeEl('body');
  globalThis.document = {
    createElement: (t) => new FakeEl(t), createElementNS: (_, t) => new FakeEl(t),
    createTextNode: (t) => Object.assign(new FakeEl('#text'), { textContent: String(t) }),
    addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    getElementById: () => null, head: new FakeEl('head'), body, documentElement: new FakeEl('html'),
  };
  globalThis.requestAnimationFrame ||= (fn) => setTimeout(fn, 0);
  return body;
}
async function plansPage(ent, { calls = [] } = {}) {
  const body = fakeDocument();
  const { default: plans } = await import('../src/app/scenes/plans.js');
  const world = { dim() {}, showMallow() {}, place() {}, setStage() {}, react() {}, fitBetween() {}, setMallow: async () => {}, mallowId: 'boppo' };
  const app = { ent, world, state: {}, haptic() {}, audio: { ui() {} }, go: (name, params) => calls.push([name, params]), back() {} };
  const view = plans(app, {});
  return { view, body, calls, buttons: () => all(view.el).filter((n) => n.tagName === 'BUTTON') };
}
const click = async (btn) => { await btn.listeners.click[0]({ currentTarget: btn }); await tick(); };

test('plans page, web subscriptions on: a guest goes to sign in; signed in, the chosen plan and period go to checkout', async () => {
  const guest = setup({ signedIn: false });
  const g = await plansPage(createEntitlements({ store: memStore(), billing: guest.billing }));
  const steps = g.buttons().filter((b) => /^Step into/.test(text(b)));
  assert.deepEqual(steps.map(text), ['Step into hushmallow Flow', 'Step into hushmallow Beyond']);
  const page = all(g.view.el).map(text).join(' ');
  assert.doesNotMatch(all(g.view.el).filter((n) => n.tagName === 'P').map(text).join(' '), /App Store|Test purchase|Development build/);
  assert.ok(page.includes('Cancel any'), 'the web billing line');
  await click(steps[1]);
  assert.deepEqual(g.calls, [['account', { view: 'welcome', notice: 'Sign in or create an account first, so your plan stays with you.' }]]);
  assert.equal(guest.server.calls.length, 0);
  assert.equal(steps[1].disabled, false, 'the buttons wake again');
  // Restore, as a guest: sign in to the account the plan is with
  await click(g.buttons().find((b) => text(b) === 'Restore purchases'));
  assert.deepEqual(g.calls[1], ['account', { view: 'signin', notice: 'Sign in to the account your plan is with.' }]);

  const s = setup();
  const p = await plansPage(createEntitlements({ store: memStore(), billing: s.billing }));
  // Yearly, then Beyond
  await click(p.buttons().find((b) => text(b) === 'Yearly'));
  await click(p.buttons().find((b) => text(b) === 'Step into hushmallow Beyond'));
  assert.deepEqual(s.server.calls.map((c) => [new URL(c.url).pathname, c.body]), [['/v1/billing/checkout', { plan: 'ultra', period: 'yearly' }]]);
  assert.deepEqual(s.navs, ['https://checkout.stripe.com/c/pay/cs_test_a1']);
  const beyond = p.buttons().find((b) => text(b) === 'Step into hushmallow Beyond');
  assert.equal(beyond.disabled, true, 'quiet while the page leaves for the checkout');
  // Back from the checkout page restores this page from the browser's cache: the buttons wake
  const shows = [];
  const prevAdd = globalThis.addEventListener, prevRemove = globalThis.removeEventListener;
  globalThis.addEventListener = (t, fn) => shows.push([t, fn]);
  globalThis.removeEventListener = () => {};
  try {
    await p.view.enter();
    const [, onShow] = shows.find(([t]) => t === 'pageshow');
    onShow({ persisted: true });
    assert.equal(beyond.disabled, false);
    p.view.leave();
  } finally { globalThis.addEventListener = prevAdd; globalThis.removeEventListener = prevRemove; }
});

test('plans page, web subscriptions on: a plan already goes to the portal; configured prices show, absent ones do not', async () => {
  const s = setup({ prices: { 'hushmallow.paid.monthly': 'US$9.99' } });
  s.server.checkout = { http: 409, body: { error: { code: 'already_subscribed' } } };
  const p = await plansPage(createEntitlements({ store: memStore(), billing: s.billing }));
  await p.view.enter().catch(() => {});
  await tick();
  const prices = all(p.view.el).filter((n) => n.attrs?.class === 'invite-price');
  assert.deepEqual(prices.map((n) => [n.textContent, n.hidden]), [['US$9.99 a month', false], ['', true]]);
  await click(p.buttons().find((b) => text(b) === 'Step into hushmallow Beyond'));
  assert.deepEqual(s.server.calls.map((c) => new URL(c.url).pathname), ['/v1/billing/checkout', '/v1/billing/portal']);
  assert.deepEqual(s.server.calls[1].body, { intent: 'switch' }, 'the portal opens on changing the plan');
  assert.deepEqual(s.navs, ['https://billing.stripe.com/p/session/test_1']);
  assert.ok(all(p.body).some((n) => text(n) === 'You already have a plan. You can change it on the next page.'));
  p.view.leave();
});

test('plans page, web subscriptions on: a 409 customer_conflict says to write to support, never "You already have a plan" or the portal', async () => {
  const { BILLING_SUPPORT, SUPPORT_EMAIL } = await import('../src/app/billing.js');
  const s = setup();
  s.server.checkout = { http: 409, body: { status: 'error', error: { code: 'customer_conflict', message: 'x' } } };
  const p = await plansPage(createEntitlements({ store: memStore(), billing: s.billing }));
  const beyond = p.buttons().find((b) => text(b) === 'Step into hushmallow Beyond');
  await click(beyond);
  assert.deepEqual(s.server.calls.map((c) => new URL(c.url).pathname), ['/v1/billing/checkout'], 'no portal');
  assert.deepEqual(s.navs, []);
  const said = all(p.body).map(text);
  assert.ok(said.includes(BILLING_SUPPORT), 'the support line');
  assert.ok(said.some((l) => /nothing was charged/i.test(l) && l.includes(SUPPORT_EMAIL)), 'nothing charged, and where to write');
  assert.ok(!said.includes('That didn’t go through. Nothing was charged.'), 'not the plain line');
  assert.ok(!said.includes('You already have a plan. You can change it on the next page.'));
  assert.equal(beyond.disabled, false);
  // any other 409 code: the plain line, as any failure
  s.server.checkout = { http: 409, body: { status: 'error', error: { code: 'other', message: 'x' } } };
  const q = await plansPage(createEntitlements({ store: memStore(), billing: s.billing }));
  await click(q.buttons().find((b) => text(b) === 'Step into hushmallow Flow'));
  assert.ok(all(q.body).map(text).includes('That didn’t go through. Nothing was charged.'));
  assert.deepEqual(s.server.calls.map((c) => new URL(c.url).pathname), ['/v1/billing/checkout', '/v1/billing/checkout'], 'no portal');
  p.view.leave();
  q.view.leave();
});

test('billing support: the address the support line gives is the Terms\' and the Privacy Policy\'s contact address', async () => {
  const { BILLING_SUPPORT, SUPPORT_EMAIL } = await import('../src/app/billing.js');
  assert.equal(typeof SUPPORT_EMAIL, 'string');
  for (const p of ['legal/terms.html', 'legal/privacy.html']) {
    assert.ok(read(p).includes(`<li>Email: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`), `${p}: the same address`);
  }
  assert.ok(BILLING_SUPPORT.endsWith(`${SUPPORT_EMAIL}.`), 'the line ends with it');
  assert.match(BILLING_SUPPORT, /^That didn’t go through, and nothing was charged\./);
});

test('plans page, web subscriptions on: a payment still going through is said so (never the portal), and welcomed once it is here', async () => {
  const s = setup();
  s.server.checkout = { http: 409, body: { status: 'error', error: { code: 'payment_pending', message: 'x' } } };
  const p = await plansPage(createEntitlements({ store: memStore(), billing: s.billing }));
  const flow = p.buttons().find((b) => text(b) === 'Step into hushmallow Flow');
  await click(flow);
  assert.deepEqual(s.server.calls.map((c) => new URL(c.url).pathname), ['/v1/billing/checkout', '/v1/billing/status'], 'asked for once more, no portal');
  const said = () => all(p.body).map(text);
  assert.ok(said().includes('Your payment is still going through. Nothing more was charged.'));
  assert.ok(!said().includes('You already have a plan. You can change it on the next page.'));
  assert.equal(flow.disabled, false, 'the buttons wake again');
  assert.deepEqual(s.navs, []);
  // tapped again once its plan has arrived: welcome, then the Hushfold
  s.server.status = { tier: 'paid', status: 'active', current_period_end: null, cancel_at_period_end: false, manageable: true };
  await click(flow);
  assert.ok(said().includes('Welcome to hushmallow Flow'));
  assert.equal(flow.disabled, true, 'quiet until the Hushfold opens');
  p.view.leave();
});

test('plans page, off: exactly the old test-purchase page (no web line, no sign-in, nothing sent)', async () => {
  const ent = createEntitlements({ store: memStore() });
  const p = await plansPage(ent);
  const notes = all(p.view.el).filter((n) => n.tagName === 'P').map(text).join(' ');
  assert.match(notes, /Development build: purchases here are test purchases\./);
  assert.ok(notes.replaceAll(NBSP, ' ').includes('Test purchase · monthly · nothing is charged'));
  assert.doesNotMatch(notes, /sign in first|secure checkout/i);
  await click(p.buttons().find((b) => text(b) === 'Step into hushmallow Flow'));
  assert.equal(ent.source(), 'test');
  assert.deepEqual(p.calls, [], 'no account screen');
  p.view.leave();
});

// ------------------------------------------------- deleting the account --
test('delete account (D9): a web plan that still renews shows "Cancel your subscription first" and keeps Delete off until a check shows it ending', async () => {
  fakeDocument();
  const A = await import('../src/app/scenes/account.js');
  assert.equal(A.BLOCK_DELETE_WHILE_SUBSCRIBED, true, 'the default under D9');
  assert.deepEqual([...A.RENEWING], ['active', 'trialing', 'past_due']);
  const LIVE = { tier: 'ultra', status: 'active', current_period_end: '2026-11-16T09:00:00.000Z', ends_at: null, cancel_at_period_end: false, manageable: true };
  /** The delete screen's guard, as account.js builds it: a submit button and the typed word. */
  const open = async ({ status = LIVE, kept = status, word = '' } = {}) => {
    const s = setup();
    s.server.status = kept;
    const store = memStore();
    const ent = createEntitlements({ store, billing: s.billing });
    if (kept) await ent.refresh({ force: true });   // what this phone kept from before
    s.server.status = status;
    s.server.calls.length = 0;
    const submit = new FakeEl('button');
    const typed = { word };
    const guard = A.deleteGuard({ billing: s.billing, ent }, { submit, confirmed: () => typed.word === 'delete' });
    return { s, ent, guard, submit, typed };
  };
  const shown = (g) => all(g.el).map(text).join(' ');
  // renewing: the step shows, Delete stays off whatever is typed, and the check on opening says the same
  const live = await open({ word: 'delete' });
  assert.equal(live.guard.blocked(), true);
  assert.ok(shown(live.guard).includes('Cancel your subscription first'));
  assert.ok(shown(live.guard).includes(A.CANCEL_FIRST.body));
  assert.equal(live.submit.disabled, true);
  await live.guard.checked;
  assert.deepEqual(live.s.server.calls.map((c) => new URL(c.url).pathname), ['/v1/billing/status'], 'asked once on opening');
  assert.equal(live.submit.disabled, true);
  // Manage subscription: the portal's front page
  const manage = all(live.guard.el).find((n) => n.tagName === 'BUTTON' && text(n) === 'Manage subscription');
  await click(manage);
  assert.deepEqual(live.s.server.calls.at(-1).body, {});
  assert.deepEqual(live.s.navs, ['https://billing.stripe.com/p/session/test_1']);
  // trialing and past_due renew too
  for (const st of ['trialing', 'past_due']) assert.equal((await open({ status: { ...LIVE, status: st } })).guard.blocked(), true, st);
  // cancelled there since: the check on opening lifts it, and Delete follows the typed word again
  const cancelled = await open({ kept: LIVE, status: { ...LIVE, cancel_at_period_end: true, ends_at: LIVE.current_period_end } });
  assert.equal(cancelled.guard.blocked(), true, 'until the check answers');
  await cancelled.guard.checked;
  assert.equal(cancelled.guard.blocked(), false);
  assert.equal(shown(cancelled.guard), '', 'the step goes');
  assert.equal(cancelled.submit.disabled, true, 'nothing typed yet');
  cancelled.typed.word = 'delete';
  cancelled.guard.update();
  assert.equal(cancelled.submit.disabled, false);
  // ended (canceled, unpaid, incomplete_expired) or no plan at all: nothing in the way
  for (const st of ['canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'paused']) {
    const g = await open({ status: { ...LIVE, tier: 'none', status: st } });
    await g.guard.checked;
    assert.equal(g.guard.blocked(), false, st);
  }
  const none = await open({ kept: null, status: { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, manageable: false }, word: 'delete' });
  await none.guard.checked;
  assert.equal(none.guard.blocked(), false);
  assert.equal(shown(none.guard), '');
  assert.equal(none.submit.disabled, false);
  // bought on another phone (nothing kept here): the check on opening brings it, and the step appears
  const elsewhere = await open({ kept: null, word: 'delete' });
  assert.equal(elsewhere.guard.blocked(), true, 'Delete waits for the check');
  assert.equal(shown(elsewhere.guard), '', 'with nothing shown meanwhile');
  assert.equal(elsewhere.submit.disabled, true);
  await elsewhere.guard.checked;
  assert.equal(elsewhere.guard.blocked(), true);
  assert.equal(elsewhere.submit.disabled, true);
  assert.ok(shown(elsewhere.guard).includes('Cancel your subscription first'));
  // a check with the same answer (coming back to the app) leaves the step as it is: focus stays on Manage subscription
  let redraws = 0;
  const put = live.guard.el.replaceChildren.bind(live.guard.el);
  live.guard.el.replaceChildren = (...k) => { redraws++; return put(...k); };
  await live.ent.refresh({ force: true });
  live.guard.update();
  assert.equal(redraws, 0, 'not redrawn');
  assert.ok(shown(live.guard).includes('Cancel your subscription first'));
  // a change while the screen is open (a check from coming back to the app) is followed; stop() lets go
  const follow = await open({ word: 'delete' });
  await follow.guard.checked;
  follow.s.server.status = { ...LIVE, cancel_at_period_end: true };
  await follow.ent.refresh({ force: true });
  assert.equal(follow.submit.disabled, false);
  follow.guard.stop();
  follow.s.server.status = LIVE;
  await follow.ent.refresh({ force: true });
  assert.equal(follow.submit.disabled, false, 'no longer listening');
  // web billing off, or no web billing in this app: no step, the screen exactly as before
  const off = createEntitlements({ store: memStore() });
  assert.equal(A.deleteGuard({ billing: null, ent: off }), null);
  assert.equal(A.renewingWebPlan({ billing: null, ent: off }), false);
  const outside = setup().billing;   // made before the shell's bridge is there
  const prev = globalThis.window;
  globalThis.window = { HushNative: { store: { current: async () => ({ tier: 'ultra' }), purchase: async () => ({ tier: 'ultra' }), restore: async () => ({ tier: 'ultra' }) } } };
  try {
    const shell = setup();
    assert.equal(shell.billing, null, 'the App Store app: no web billing');
    assert.equal(A.deleteGuard({ billing: shell.billing, ent: createEntitlements({ store: memStore(), billing: shell.billing }) }), null);
    // even handed a billing object, StoreKit's entitlement (isWeb false) never meets the step
    const native = createEntitlements({ store: memStore(), billing: outside });
    assert.equal(native.isWeb, false);
    assert.equal(A.deleteGuard({ billing: outside, ent: native }), null);
    assert.equal(A.renewingWebPlan({ billing: outside, ent: native }), false);
  } finally { if (prev === undefined) delete globalThis.window; else globalThis.window = prev; }
});

test('delete account (D9): with no answer from the billing check, Delete waits ("Couldn’t check…", Try again) and is refused at submit', async () => {
  fakeDocument();
  const A = await import('../src/app/scenes/account.js');
  const LIVE = { tier: 'ultra', status: 'active', current_period_end: '2027-10-16T09:00:00.000Z', ends_at: null, cancel_at_period_end: false, manageable: true };
  const NONE = { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, manageable: false };
  const shown = (g) => all(g.el).map(text).join(' ');
  const paths = (s) => s.server.calls.map((c) => new URL(c.url).pathname);
  const failing = (http) => ({ http, body: { status: 'error', error: { code: 'billing_unavailable', message: 'x' } } });
  // a new browser, or cleared site data (nothing kept here), and the check fails: busy, the IP limit, a gateway, offline
  for (const why of [503, 429, 502, 'offline']) {
    const s = setup();
    if (why === 'offline') s.server.down = true; else s.server.statusReply = failing(why);
    const ent = createEntitlements({ store: memStore(), billing: s.billing });
    const submit = new FakeEl('button');
    const g = A.deleteGuard({ billing: s.billing, ent }, { submit, confirmed: () => true });
    await g.checked;
    assert.equal(ent.webAnswered(), false);
    assert.equal(g.blocked(), true, `${why}: never deleted on no answer`);
    assert.equal(submit.disabled, true, String(why));
    assert.ok(shown(g).includes(A.CANCEL_FIRST.unchecked), String(why));
    assert.ok(!shown(g).includes(A.CANCEL_FIRST.title), 'nothing kept says a plan renews');
    // at submit: asked once more, and still refused without an answer
    assert.equal(await g.ready(), A.CANCEL_FIRST.unchecked, String(why));
    assert.deepEqual(paths(s), ['/v1/billing/status', '/v1/billing/status'], String(why));
  }
  // a renewing plan kept here longer than the grace ago (set aside: no plan for now), and the check fails now
  const s = setup();
  s.server.status = LIVE;
  const store = memStore();
  const clock = clockAt();
  await createEntitlements({ store, billing: s.billing, now: clock }).refresh({ force: true });
  clock.t += BILLING_GRACE_MS + 3600000;
  s.server.statusReply = failing(503);
  const ent = createEntitlements({ store, billing: s.billing, now: clock });
  assert.equal(ent.webPlan(), null, 'older than the grace');
  const submit = new FakeEl('button');
  const g = A.deleteGuard({ billing: s.billing, ent }, { submit, confirmed: () => true });
  await g.checked;
  assert.equal(g.blocked(), true);
  assert.equal(submit.disabled, true);
  // Try again, the server answers now: the plan renews, so the step shows instead of the line
  const retry = all(g.el).find((n) => n.tagName === 'BUTTON' && text(n) === 'Try again');
  assert.equal(retry.attrs['data-act'], 'recheck-subscription');
  s.server.statusReply = null;
  await click(retry);
  await g.checked;
  assert.equal(g.blocked(), true);
  assert.ok(shown(g).includes(A.CANCEL_FIRST.title));
  assert.ok(!shown(g).includes(A.CANCEL_FIRST.unchecked));
  assert.equal(await g.ready(), A.CANCEL_FIRST.refused);
  // cancelled there since: the answer at submit lets it through
  s.server.status = { ...LIVE, cancel_at_period_end: true, ends_at: LIVE.current_period_end };
  await ent.refresh({ force: true });
  assert.equal(await g.ready(), null);
  assert.equal(submit.disabled, false);
  // no plan at all: one answer, at submit, is enough
  const late = setup();
  late.server.status = NONE;
  late.server.statusReply = failing(503);
  const lateEnt = createEntitlements({ store: memStore(), billing: late.billing });
  const lateSubmit = new FakeEl('button');
  const lg = A.deleteGuard({ billing: late.billing, ent: lateEnt }, { submit: lateSubmit, confirmed: () => true });
  await lg.checked;
  assert.equal(lg.blocked(), true);
  late.server.statusReply = null;
  assert.equal(await lg.ready(), null, 'the answer came at submit');
  assert.equal(lg.blocked(), false);
  assert.equal(shown(lg), '', 'the line goes');
  assert.deepEqual(paths(late), ['/v1/billing/status', '/v1/billing/status']);
  assert.equal(await lg.ready(), null);
  assert.equal(late.server.calls.length, 2, 'not asked again once answered');
});

test('delete account (D9): a Worker with no web billing (503 billing_not_configured / accounts_not_configured) lets Delete go ahead; any other failure still waits', async () => {
  fakeDocument();
  const A = await import('../src/app/scenes/account.js');
  const LIVE = { tier: 'ultra', status: 'active', current_period_end: '2027-10-16T09:00:00.000Z', ends_at: null, cancel_at_period_end: false, manageable: true };
  const shown = (g) => all(g.el).map(text).join(' ');
  const paths = (s) => s.server.calls.map((c) => new URL(c.url).pathname);
  // the server's answer on every billing route while it has no billing (server/another-angle src/billing/routes.js
  // offCode: not configured, or its sign-in project still a placeholder, as on a branch preview's staging Worker)
  const offReply = (code) => ({ http: 503, body: { status: 'error', error: { code, message: 'Web subscriptions are not set up on this server.' } } });
  /** The delete screen's guard, once its check on opening has settled. raw: the status route's body as plain text. */
  const open = async ({ reply = null, raw = null, down = false, store = memStore(), now } = {}) => {
    const server = billingServer();
    const base = server.fetch;
    server.fetch = async (url, init) => {
      if (!raw || new URL(url).pathname !== PATHS.status) return base(url, init);
      server.calls.push({ url: String(url), init, body: null });
      return new Response(raw.body, { status: raw.http });
    };
    const s = setup({ server });
    s.server.statusReply = reply;
    s.server.down = down;
    const ent = createEntitlements({ store, billing: s.billing, ...(now ? { now } : {}) });
    const submit = new FakeEl('button');
    const g = A.deleteGuard({ billing: s.billing, ent }, { submit, confirmed: () => true });
    await g.checked;
    return { s, ent, g, submit };
  };
  for (const code of ['billing_not_configured', 'accounts_not_configured']) {
    // nothing kept here: Delete goes ahead, as with web billing off, and nothing is said in its way
    const { s, ent, g, submit } = await open({ reply: offReply(code) });
    assert.equal(g.blocked(), false, `${code}: no web billing on this Worker`);
    assert.equal(submit.disabled, false, code);
    assert.equal(shown(g), '', `${code}: no "Couldn’t check" line, no step`);
    assert.equal(await g.ready(), null, code);
    assert.deepEqual(paths(s), ['/v1/billing/status'], `${code}: asked once, not again at submit`);
    assert.equal(ent.webAnswered(), false, `${code}: no plan was answered`);
    assert.equal(ent.webOff(), true, code);
    // billing.js keeps the server's word: no plan answered, and no web billing there (status and sync alike)
    const b = setup();
    b.server.statusReply = offReply(code);
    b.server.sync = offReply(code);
    assert.deepEqual(await b.billing.status(), { ok: false, reason: 'http_503', off: code }, code);
    assert.deepEqual(await b.billing.sync(`cs_test_${'a1B2'.repeat(15)}`), { ok: false, reason: 'http_503', off: code }, code);
  }
  assert.equal(createEntitlements({ store: memStore() }).webOff(), false, 'web billing off on this page: never');
  // everything else still fails closed: offline, a 5xx (or any status) without those codes or with them on another
  // status, and answers that only look like it
  const failing = (http, body) => ({ reply: { http, body } });
  const closed = [
    ['offline', { down: true }],
    ['503 billing_unavailable', failing(503, { status: 'error', error: { code: 'billing_unavailable', message: 'x' } })],
    ['503 rate_limited', failing(503, { status: 'error', error: { code: 'rate_limited', message: 'x' } })],
    ['500 billing_not_configured', failing(500, offReply('billing_not_configured').body)],
    ['502 accounts_not_configured', failing(502, offReply('accounts_not_configured').body)],
    ['504 billing_not_configured', failing(504, offReply('billing_not_configured').body)],
    ['429 billing_not_configured', failing(429, offReply('billing_not_configured').body)],
    ['503 no code', failing(503, { status: 'error' })],
    ['503 {}', failing(503, {})],
    ['503 null', failing(503, null)],
    ['503 error as a string', failing(503, { error: 'billing_not_configured' })],
    ['503 code at the top', failing(503, { code: 'billing_not_configured' })],
    ['503 code in capitals', failing(503, { error: { code: 'BILLING_NOT_CONFIGURED' } })],
    ['503 code with a space', failing(503, { error: { code: 'billing_not_configured ' } })],
    ['503 code with more after it', failing(503, { error: { code: 'billing_not_configured_yet' } })],
    ['503 code in a list', failing(503, { error: { code: ['billing_not_configured'] } })],
    ['503 an array', failing(503, [{ error: { code: 'billing_not_configured' } }])],
    ['503 html', { raw: { http: 503, body: '<html><body>Service Unavailable</body></html>' } }],
    ['503 the code as text', { raw: { http: 503, body: 'billing_not_configured' } }],
    ['503 cut-off JSON', { raw: { http: 503, body: '{"status":"error","error":{"code":"billing_not_configured"' } }],
  ];
  for (const [why, o] of closed) {
    const { s, ent, g, submit } = await open(o);
    assert.equal(ent.webOff(), false, why);
    assert.equal(g.blocked(), true, `${why}: never deleted on no answer`);
    assert.equal(submit.disabled, true, why);
    assert.ok(shown(g).includes(A.CANCEL_FIRST.unchecked), why);
    assert.equal(await g.ready(), A.CANCEL_FIRST.unchecked, why);
    assert.deepEqual(paths(s), ['/v1/billing/status', '/v1/billing/status'], `${why}: asked once more at submit`);
  }
  // a timeout: the request is let go after timeoutMs, and Delete waits
  const slow = createBilling({
    auth: () => authHandle(), signIn: true, config: CONFIG, nav: () => {}, timeoutMs: 20,
    fetchImpl: (url, init) => new Promise((_, reject) => { init.signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError'))); }),
  });
  assert.deepEqual(await slow.status(), { ok: false, reason: 'network' });
  const slowEnt = createEntitlements({ store: memStore(), billing: slow });
  const sg = A.deleteGuard({ billing: slow, ent: slowEnt }, { submit: new FakeEl('button'), confirmed: () => true });
  await sg.checked;
  assert.equal(slowEnt.webOff(), false);
  assert.equal(sg.blocked(), true, 'a timeout: never deleted on no answer');
  assert.equal(await sg.ready(), A.CANCEL_FIRST.unchecked);
  // a failure first, then the Worker's "no billing" on Try again: the line goes and Delete goes ahead
  const t = await open({ reply: { http: 502, body: {} } });
  assert.ok(shown(t.g).includes(A.CANCEL_FIRST.unchecked));
  t.s.server.statusReply = offReply('accounts_not_configured');
  await click(all(t.g.el).find((n) => n.tagName === 'BUTTON' && text(n) === A.CANCEL_FIRST.retry));
  await t.g.checked;
  assert.equal(t.g.blocked(), false);
  assert.equal(shown(t.g), '');
  assert.equal(t.submit.disabled, false);
  // billing set up on the Worker while the screen is open: a check from coming back to the app brings a renewing plan,
  // and the step appears
  const on = await open({ reply: offReply('billing_not_configured') });
  on.s.server.statusReply = null;
  on.s.server.status = LIVE;
  await on.ent.refresh({ force: true });
  assert.equal(on.g.blocked(), true);
  assert.ok(shown(on.g).includes(A.CANCEL_FIRST.title));
  assert.equal(on.submit.disabled, true);
  // a renewing plan this phone checked within the grace, and the Worker has no billing now (its key removed or
  // refused): that plan may still renew at Stripe, so the step stays; the answer changes nothing kept, and once the
  // copy is older than the grace (set aside: no plan), Delete goes ahead
  const store = memStore();
  const clock = clockAt();
  const k = setup();
  k.server.status = LIVE;
  await createEntitlements({ store, billing: k.billing, now: clock }).refresh({ force: true });
  clock.t += 3600000;
  const kept = await open({ reply: offReply('billing_not_configured'), store, now: clock });
  assert.equal(kept.g.blocked(), true);
  assert.ok(shown(kept.g).includes(A.CANCEL_FIRST.title));
  assert.ok(!shown(kept.g).includes(A.CANCEL_FIRST.unchecked));
  assert.equal(await kept.g.ready(), A.CANCEL_FIRST.refused);
  assert.equal(kept.ent.webPlan()?.status, 'active', 'what is kept stays');
  clock.t += BILLING_GRACE_MS;
  const aged = await open({ reply: offReply('billing_not_configured'), store, now: clock });
  assert.equal(aged.g.blocked(), false);
  assert.equal(shown(aged.g), '');
  assert.equal(await aged.g.ready(), null);
});

test('delete account (D9): an end date set on or before the period end (a Dashboard cancel_at) is not renewing, as Settings says', async () => {
  fakeDocument();
  const A = await import('../src/app/scenes/account.js');
  const { webPlanNote } = await import('../src/app/scenes/settings.js');
  const periodEnd = '2027-10-16T09:00:00.000Z';
  const LIVE = { tier: 'ultra', status: 'active', current_period_end: periodEnd, ends_at: null, cancel_at_period_end: false, manageable: true };
  const at = (d) => new Date(Date.parse(periodEnd) + d).toISOString();
  const hour = 3600000, day = 86400000;
  // [ends_at, cancel_at_period_end, still renews]: the server sends cancel_at_period_end only when cancel_at is
  // within a day of the period end; an earlier date comes as ends_at alone
  const cases = [
    [null, false, true], [null, true, false], [periodEnd, true, false],
    ['2027-03-01T00:00:00.000Z', false, false], [at(hour), false, false], [at(day), false, false],
    [at(day + hour), false, true], ['2028-01-16T09:00:00.000Z', false, true],
  ];
  for (const [ends, cape, renews] of cases) {
    const s = setup();
    s.server.status = { ...LIVE, ends_at: ends, cancel_at_period_end: cape };
    const ent = createEntitlements({ store: memStore(), billing: s.billing });
    const g = A.deleteGuard({ billing: s.billing, ent }, { submit: new FakeEl('button'), confirmed: () => true });
    await g.checked;
    assert.equal(A.renewingWebPlan({ billing: s.billing, ent }), renews, `${ends} ${cape}`);
    assert.equal(g.blocked(), renews, `${ends} ${cape}`);
    // the same reading as Settings: "Ends on … Nothing more is charged." exactly when it no longer renews
    assert.equal(/Nothing more is charged\.$/.test(webPlanNote(ent.webPlan(), ent.tier())), !renews, `${ends} ${cape}`);
  }
});

test('delete account (D9): the delete screen puts the step first, keeps Delete off while it shows, and refuses at submit too', () => {
  const src = read('src/app/scenes/account.js');
  const del = src.slice(src.indexOf('  V.delete = () => {'), src.indexOf('  // ----------------------------------------------------------- actions --'));
  assert.match(del, /const guard = deleteGuard\(app, \{ submit: f\.submitBtn, confirmed: \(\) => VM\.deleteConfirmed\(confirm\.input\.value\) \}\);/);
  assert.match(del, /confirm\.onInput\(\(\) => \{ f\.submitBtn\.disabled = !!guard\?\.blocked\(\) \|\| !VM\.deleteConfirmed\(confirm\.input\.value\); \}\);/);
  assert.match(del, /body: \[\n\s+guard\?\.el,\n\s+h\('div', \{ class: 'hm-account-facts' \}/, 'the step comes first');
  assert.match(del, /const refused = await guard\.ready\(\);\n\s+if \(refused\) \{ later\(\(\) => guard\.update\(\), 0\); return \{ ok: false, error: \{ code: 'subscription', message: refused \} \}; \}/);
  assert.ok(del.indexOf('await guard.ready()') < del.indexOf('a.deleteAccount()'), 'before anything is deleted');
  assert.match(del, /stop: \(\) => guard\?\.stop\(\),/);
  assert.match(src, /stopView\?\.\(\); stopView = null;\n[\s\S]{0,200}const make = V\[top\.view\]/, 'dropped when another screen shows');
  assert.equal((src.match(/stopView\?\.\(\); stopView = null;/g) || []).length, 2, 'and when the scene goes');
});

// ------------------------------------------------ the plan across sign-in --
/** A tab's sessionStorage, faked (Node has none); → { ss, restore }. */
function fakeSession() {
  const m = new Map();
  const ss = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), map: m };
  const had = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { value: ss, configurable: true, writable: true });
  return { ss, restore: () => { if (had) Object.defineProperty(globalThis, 'sessionStorage', had); else delete globalThis.sessionStorage; } };
}

test('the plan a guest chose is kept for half an hour in this tab, then forgotten; only { plan, period, at }', () => {
  assert.equal(PLAN_INTENT_MS, 30 * 60000);
  const m = new Map();
  const session = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  rememberPlan('ultra', 'yearly', { session, now: NOW });
  assert.deepEqual(JSON.parse(m.get('hm2:planIntent')), { plan: 'ultra', period: 'yearly', at: NOW }, 'nothing else is kept');
  assert.deepEqual(plannedPlan({ session, now: NOW + PLAN_INTENT_MS - 1 }), { plan: 'ultra', period: 'yearly' });
  assert.equal(m.size, 1, 'a look keeps it');
  assert.equal(plannedPlan({ session, now: NOW + PLAN_INTENT_MS }), null, 'half an hour later: gone');
  assert.equal(m.size, 0, 'and forgotten');
  rememberPlan('paid', 'monthly', { session, now: NOW });
  assert.deepEqual(plannedPlan({ take: true, session, now: NOW }), { plan: 'paid', period: 'monthly' });
  assert.equal(plannedPlan({ session, now: NOW }), null, 'taken once');
  // never anything else; an odd or future-dated copy is forgotten
  rememberPlan('premium', 'yearly', { session, now: NOW });
  rememberPlan('ultra', 'weekly', { session, now: NOW });
  assert.equal(m.size, 0);
  for (const odd of ['{', '"x"', '{"plan":"ultra","period":"yearly"}', `{"plan":"ultra","period":"yearly","at":${NOW + 60000}}`, `{"plan":"gold","period":"yearly","at":${NOW}}`]) {
    m.set('hm2:planIntent', odd);
    assert.equal(plannedPlan({ session, now: NOW }), null, odd);
  }
  // storage blocked: nothing kept, nothing thrown
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  rememberPlan('ultra', 'yearly', { session: blocked });
  assert.equal(plannedPlan({ take: true, session: blocked }), null);
  assert.equal(plannedPlan({ session: null }), null);
});

test('the plan across sign-in: a guest\'s "Step into…" is kept, and the account card offers "Continue to hushmallow Beyond (yearly)" once', async () => {
  const tab = fakeSession();
  try {
    // the plans page: a guest picks Beyond, yearly
    const guest = setup({ signedIn: false });
    const g = await plansPage(createEntitlements({ store: memStore(), billing: guest.billing }));
    await click(g.buttons().find((b) => text(b) === 'Yearly'));
    await click(g.buttons().find((b) => text(b) === 'Step into hushmallow Beyond'));
    const { SIGN_IN_FIRST } = await import('../src/app/scenes/plans.js');
    assert.deepEqual(g.calls, [['account', { view: 'welcome', notice: SIGN_IN_FIRST }]], 'to sign in, as before');
    assert.deepEqual(plannedPlan(), { plan: 'ultra', period: 'yearly' });
    // signed in (the page reloads into the account): the card offers it first
    const A = await import('../src/app/scenes/account.js');
    const s = setup();
    const went = [];
    const app = { billing: s.billing, ent: createEntitlements({ store: memStore(), billing: s.billing }), go: (...a) => went.push(a) };
    const offer = A.continuePlan(app);
    const btn = all(offer.el).find((n) => n.tagName === 'BUTTON');
    assert.equal(text(btn), 'Continue to hushmallow Beyond (yearly)');
    assert.equal(btn.attrs['data-act'], 'continue-plan');
    await click(btn);
    // the plan is asked for first (a plan already here needs no checkout), then on to checkout
    assert.deepEqual(s.server.calls.map((c) => [new URL(c.url).pathname, c.body]), [['/v1/billing/status', null], ['/v1/billing/checkout', { plan: 'ultra', period: 'yearly' }]]);
    assert.deepEqual(s.navs, ['https://checkout.stripe.com/c/pay/cs_test_a1']);
    assert.equal(btn.disabled, true, 'quiet while the page leaves');
    assert.equal(plannedPlan(), null, 'offered once');
    assert.equal(A.continuePlan(app), null);
    offer.stop();
    // a plan already (409): said, and the subscription page opens on changing it, as the plans page does
    rememberPlan('paid', 'monthly');
    s.server.checkout = { http: 409, body: { error: { code: 'already_subscribed' } } };
    s.server.calls.length = 0;
    await click(all(A.continuePlan(app).el).find((n) => n.tagName === 'BUTTON'));
    assert.deepEqual(s.server.calls.map((c) => [new URL(c.url).pathname, c.body]), [['/v1/billing/checkout', { plan: 'paid', period: 'monthly' }], ['/v1/billing/portal', { intent: 'switch' }]]);
    assert.deepEqual(s.navs.at(-1), 'https://billing.stripe.com/p/session/test_1');
    assert.ok(all(document.body).some((n) => text(n) === CHANGE_PLAN));
    assert.deepEqual(went, [], 'not the plans page with nothing said');
    rememberPlan('paid', 'monthly');
    s.server.checkout = { http: 503, body: {} };
    const failed = A.continuePlan(app);
    const fb = all(failed.el).find((n) => n.tagName === 'BUTTON');
    await click(fb);
    assert.ok(all(failed.el).map(text).includes('That didn’t go through. Nothing was charged.'));
    assert.equal(fb.disabled, false);
    // never: with a plan already, as a guest, with web billing off or in the App Store app
    rememberPlan('ultra', 'yearly');
    s.server.status = { tier: 'paid', status: 'active', current_period_end: null, cancel_at_period_end: false, manageable: true };
    const has = createEntitlements({ store: memStore(), billing: s.billing });
    await has.refresh({ force: true });
    assert.equal(A.continuePlan({ billing: s.billing, ent: has }), null, 'a plan already');
    const away = setup({ signedIn: false });
    assert.equal(A.continuePlan({ billing: away.billing, ent: createEntitlements({ store: memStore(), billing: away.billing }) }), null, 'a guest');
    assert.equal(A.continuePlan({ billing: null, ent: createEntitlements({ store: memStore() }) }), null, 'billing off');
    assert.deepEqual(plannedPlan(), { plan: 'ultra', period: 'yearly' }, 'none of those took it');
    // the account card puts it first, and lets go of it with the screen
    const src = read('src/app/scenes/account.js');
    assert.match(src, /const offer = continuePlan\(app\);/);
    assert.match(src, /body: \[\n\s+offer\?\.el,\n\s+h\('p', \{ class: 'hm-auth-hint hm-auth-center', 'data-since': '' \}/);
    assert.match(src, /after: \(\) => loadAccount\(\{ settingsRow, libraryRow, syncStatus, loadNote, picker \}\),\n\s+stop: \(\) => offer\?\.stop\(\),/);
  } finally { tab.restore(); }
});

test('the plan across sign-in: the offer goes once a check shows a plan, a tap waits for the check in flight, a payment going through is said', async () => {
  const tab = fakeSession();
  const body = fakeDocument();
  try {
    const A = await import('../src/app/scenes/account.js');
    const said = () => all(body).map(text);
    const BEYOND = { tier: 'ultra', status: 'active', current_period_end: '2027-10-16T09:00:00.000Z', ends_at: null, cancel_at_period_end: false, manageable: true };
    const paths = (s) => s.server.calls.map((c) => new URL(c.url).pathname);
    /** The account card after the sign-in reload: rendered while the start's check is still in flight. */
    const open = (status) => {
      rememberPlan('ultra', 'yearly');
      const s = setup();
      s.server.status = status;
      const went = [];
      const app = { billing: s.billing, ent: createEntitlements({ store: memStore(), billing: s.billing }), go: (...a) => went.push(a) };
      const boot = app.ent.refresh();
      const offer = A.continuePlan(app);
      const card = new FakeEl('div');
      card.append(offer.el);
      return { s, app, went, boot, offer, card, btn: all(offer.el).find((n) => n.tagName === 'BUTTON') };
    };
    // an existing Beyond subscriber: the check answers with the plan, and the offer goes
    const sub = open(BEYOND);
    assert.equal(sub.card.children.length, 1, 'shown while the check runs');
    await sub.boot;
    assert.equal(sub.app.ent.has('ultra'), true);
    assert.deepEqual(sub.card.children, [], 'withdrawn');
    assert.deepEqual(plannedPlan(), { plan: 'ultra', period: 'yearly' }, 'not taken: as when a plan was known at the start');
    // tapped before the check answered: it waits for that answer, then no checkout: the change of plan, said
    const quick = open(BEYOND);
    await click(quick.btn);
    await quick.boot;
    assert.deepEqual(paths(quick.s), ['/v1/billing/status', '/v1/billing/portal'], 'no checkout');
    assert.deepEqual(quick.s.server.calls[1].body, { intent: 'switch' });
    assert.ok(said().includes(CHANGE_PLAN));
    assert.deepEqual(quick.went, []);
    // the portal not opening is said, and the button wakes
    const NONE = { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, manageable: false };
    const down = open(NONE);
    await down.boot;
    down.s.server.checkout = { http: 409, body: { error: { code: 'already_subscribed' } } };
    down.s.server.portal = { http: 503, body: {} };
    await click(down.btn);
    assert.ok(said().includes('That didn’t open just now. Try again in a moment.'));
    assert.equal(down.btn.disabled, false);
    // a payment still going through: said (never the portal), and the button wakes
    const pend = open(NONE);
    await pend.boot;
    pend.s.server.checkout = { http: 409, body: { status: 'error', error: { code: 'payment_pending', message: 'x' } } };
    await click(pend.btn);
    assert.deepEqual(paths(pend.s), ['/v1/billing/status', '/v1/billing/checkout']);
    assert.ok(said().includes(PAYMENT_PENDING));
    assert.equal(pend.btn.disabled, false);
    assert.deepEqual(pend.went, []);
    // the account's billing needs a look (409 customer_conflict): where to write is said (never the portal), and the
    // button wakes
    const { BILLING_SUPPORT } = await import('../src/app/billing.js');
    const conflict = open(NONE);
    await conflict.boot;
    conflict.s.server.checkout = { http: 409, body: { status: 'error', error: { code: 'customer_conflict', message: 'x' } } };
    const changes = () => said().filter((l) => l === CHANGE_PLAN).length;
    const before = changes();
    await click(conflict.btn);
    assert.deepEqual(paths(conflict.s), ['/v1/billing/status', '/v1/billing/checkout'], 'no portal');
    assert.deepEqual(conflict.s.navs, []);
    assert.ok(all(conflict.offer.el).map(text).includes(BILLING_SUPPORT), 'the support line on the card');
    assert.equal(changes(), before, 'never "You already have a plan" for it');
    assert.equal(conflict.btn.disabled, false);
    assert.deepEqual(conflict.went, []);
    // its plan arriving later (coming back to the app) withdraws the offer; stop() lets go of it
    pend.s.server.status = BEYOND;
    await pend.app.ent.refresh({ force: true });
    assert.deepEqual(pend.card.children, []);
    const left = open(BEYOND);
    left.offer.stop();
    await left.boot;
    assert.equal(left.card.children.length, 1, 'no longer listening');
  } finally { tab.restore(); }
});

// ------------------------------------------------------- Another Angle --
test('Another Angle: the account\'s token goes with /v1/session only when billing passes it; never with the words', async () => {
  const run = async (extra) => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ path: new URL(url).pathname, init });
      const reply = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
      const path = new URL(url).pathname;
      if (path === '/v1/health') return reply({ ok: true, service: 'another-angle', schema_version: SCHEMA_VERSION, provider: 'anthropic', configured: { signing_key: true, provider_key: true } });
      if (path === '/v1/session') return reply({ status: 'ok', token: 'hm1.session.token-xyz', expires_at: new Date(Date.now() + 3600000).toISOString() });
      return reply({ status: 'fallback', fallback: { reason: 'provider' } });
    };
    await createAngleClient({ store: memStore(), endpoint: EP, fetchImpl, ...extra }).angle({ text: 'My colleague got promoted instead of me.' });
    return calls;
  };
  const plain = await run({});
  const session = plain.find((c) => c.path === '/v1/session');
  assert.deepEqual(session.init.headers, { 'content-type': 'application/json' }, 'off: exactly as before');
  const billed = await run({ accountToken: async () => 'eyJ.account.tok' });
  assert.equal(billed.find((c) => c.path === '/v1/session').init.headers.authorization, 'Bearer eyJ.account.tok');
  assert.equal(billed.find((c) => c.path === '/v1/angle').init.headers.authorization, 'Bearer hm1.session.token-xyz', 'the words go with the session token only');
  assert.doesNotMatch(JSON.parse(billed.find((c) => c.path === '/v1/session').init.body).device_id, /eyJ/);
  // the consent card says so, only when billing is on (off, its line is exactly as before)
  const consent = read('src/beyond/consent.js');
  assert.match(consent, /sendsAccount\(app\) \? ACCOUNT_CHECK : ' Never your name or account\.'/);
  assert.match(consent, /export const sendsAccount = \(app\) => !!app\?\.billing;/, 'the same condition as the token');
  const { ACCOUNT_CHECK } = await import('../src/beyond/consent.js');
  // (17 Oct 2026) the token is a Supabase access token: it carries the email and the sign-up name, so the line says so
  assert.equal(ACCOUNT_CHECK, ' When you’re signed in, it also sends your account’s sign-in token, so our server can check your plan. The token carries your email (and the name you gave at sign-up, if any); our server uses only your account’s id and doesn’t log or store it.');
  // a token that cannot be had (signed out, offline): the session goes without one
  const none = await run({ accountToken: async () => null });
  assert.equal(none.find((c) => c.path === '/v1/session').init.headers.authorization, undefined);
  const boom = await run({ accountToken: async () => { throw new Error('no'); } });
  assert.equal(boom.find((c) => c.path === '/v1/session').init.headers.authorization, undefined);
});

// ------------------------------------------------ the consent card --
/** The consent card as Another Angle opens it, in a fake document: → { text, accept(), close() } (one of the two, so its timers end). */
async function consentCard(app) {
  const { openConsent } = await import('../src/beyond/consent.js');
  const root = fakeDocument();
  const card = openConsent({ app, root, onDecide: () => {} });
  return { text: text(card.el), close: card.close, accept: () => all(card.el).find((n) => n.tagName === 'BUTTON' && text(n) === 'Accept').listeners.click[0]({}) };
}

test('consent: with billing on, a yes given before (the notice did not name the token) is asked again; off, exactly as before', async () => {
  const { consentState, setConsent, STORE_KEYS, CONSENT_VERSION, ACCOUNT_CHECK } = await import('../src/beyond/consent.js');
  const store = memStore();
  store.set(STORE_KEYS.consent, { v: CONSENT_VERSION, choice: 'yes', at: '2026-10-12' });   // accepted before billing was on
  assert.equal(consentState(store), 'yes', 'billing off: the stored yes counts, as today');
  assert.equal(consentState(store, { account: false }), 'yes');
  assert.equal(consentState(store, { account: true }), 'unasked', 'billing on: asked again before the token goes with the session');
  setConsent(store, 'yes', { account: true });
  assert.equal(consentState(store, { account: true }), 'yes');
  assert.equal(consentState(store), 'yes', 'a yes to the fuller notice counts with billing off too');
  // (17 Oct 2026) a yes to the account line before it said what the token carries ("Never your name or email", recorded
  // as account: true) is asked again, once, with billing on; it still counts with billing off (no token is sent then)
  const { ACCOUNT_NOTICE } = await import('../src/beyond/consent.js');
  assert.equal(ACCOUNT_NOTICE, 2);
  assert.equal(store.get(STORE_KEYS.consent).account, ACCOUNT_NOTICE, 'Accept records the account line it showed');
  store.set(STORE_KEYS.consent, { v: CONSENT_VERSION, choice: 'yes', at: '2026-10-16', account: true });
  assert.equal(consentState(store, { account: true }), 'unasked', 'the older account line: asked again');
  assert.equal(consentState(store), 'yes', 'billing off: it still counts');
  setConsent(store, 'yes', { account: true });
  assert.equal(consentState(store, { account: true }), 'yes', 'asked once');
  // a "Not now" stays one (nothing is sent then); off, the record is exactly as before
  store.set(STORE_KEYS.consent, { v: CONSENT_VERSION, choice: 'no', at: '2026-10-12' });
  assert.equal(consentState(store, { account: true }), 'no');
  setConsent(store, 'yes');
  assert.deepEqual(Object.keys(store.get(STORE_KEYS.consent)), ['v', 'choice', 'at']);
  assert.equal(consentState(store, { account: true }), 'unasked');
  // the card with billing on names the token, and its Accept records the notice it showed
  const on = { billing: setup().billing, store: memStore() };
  const card = await consentCard(on);
  assert.ok(card.text.includes(ACCOUNT_CHECK.trim()), 'the token line');
  assert.ok(!card.text.includes('Never your name or account.'));
  card.accept();
  assert.equal(consentState(on.store, { account: true }), 'yes');
  // off: the line as before, and the record as before
  const off = { billing: null, store: memStore() };
  const plain = await consentCard(off);
  assert.ok(plain.text.includes('(and any invite code) to keep the daily allowance fair. Never your name or account.'));
  assert.ok(!/sign-in token/.test(plain.text));
  plain.accept();
  assert.deepEqual(Object.keys(off.store.get(STORE_KEYS.consent)), ['v', 'choice', 'at']);
  // Another Angle and Settings ask with the same condition as the token
  const aa = read('src/beyond/another-angle.js');
  assert.match(aa, /const accountNotice = \{ account: sendsAccount\(app\) \};/);
  assert.equal((aa.match(/consentState\(store, accountNotice\)/g) || []).length, 3);
  assert.doesNotMatch(aa, /consentState\(store\)/);
  assert.match(read('src/beyond/consent.js'), /input\.checked = consentState\(store, notice\) === 'yes';/);
});

test('the App Store app’s shell: no web billing whatever the config (the consent card, the delete screen and the session as before)', async () => {
  const { consentState, STORE_KEYS, CONSENT_VERSION } = await import('../src/beyond/consent.js');
  const { notTouched } = await import('../src/app/scenes/account.js');
  const before = await consentCard({ billing: null, store: memStore() });
  before.close();
  const prev = globalThis.window;
  const shells = {
    storekit: { HushNative: { store: { current: async () => ({ tier: 'ultra' }), purchase: async () => ({ tier: 'ultra' }), restore: async () => ({ tier: 'ultra' }) } } },
    'HushNative alone': { HushNative: {} },
    'the message handler': { webkit: { messageHandlers: { hushStore: { postMessage() {} } } } },
  };
  try {
    for (const [name, win] of Object.entries(shells)) {
      globalThis.window = win;
      assert.equal(inNativeShell(), true, name);
      // configured, signed in and sign-in on, as main.js would build it with billing switched on: still null
      const s = setup();
      assert.equal(s.billing, null, name);
      const app = { billing: s.billing, store: memStore() };   // main.js: app.billing
      assert.deepEqual(notTouched(app), notTouched({}), `${name}: the delete screen keeps "your plan: it belongs to this phone’s app store account"`);
      const card = await consentCard(app);
      card.close();
      assert.equal(card.text, before.text, `${name}: the consent card word for word`);
      app.store.set(STORE_KEYS.consent, { v: CONSENT_VERSION, choice: 'yes', at: '2026-10-12' });
      assert.equal(consentState(app.store, { account: !!app.billing }), 'yes', `${name}: nobody is asked again`);
      assert.equal(createEntitlements({ store: memStore(), billing: s.billing }).isWeb, false);
    }
  } finally { if (prev === undefined) delete globalThis.window; else globalThis.window = prev; }
  // the session carries an account token only through app.billing (null here)
  assert.match(read('src/beyond/another-angle.js'), /\.\.\.\(app\.billing \? \{ accountToken: \(\) => app\.billing\.accountToken\(\) \} : \{\}\)/);
  assert.match(read('src/app/billing.js'), /if \(!config \|\| !signIn \|\| shell\) return null;/);
  assert.equal(inNativeShell(), false, 'Node, like a plain browser');
  assert.equal(inNativeShell({ location: {} }), false);
});

// ------------------------------------------------ development hosts --
test('a development host keeps its test purchases with billing switched on, unless ?billingDev points at a local server', async () => {
  const session = new Map();
  const ss = { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => session.set(k, v), removeItem: (k) => session.delete(k) };
  const loc = { hostname: 'localhost', protocol: 'http:', search: '' };
  for (const hostname of ['localhost', '127.0.0.1']) {
    const cfg = resolveBilling({ provider: 'stripe', endpoint: EP, loc: { ...loc, hostname }, session: ss });
    assert.equal(cfg, null, `${hostname}: never the production Worker (it refuses this origin)`);
    const ent = createEntitlements({ store: memStore(), billing: createBilling({ auth: () => authHandle(), signIn: true, config: cfg, shell: false }) });
    assert.equal(ent.isWeb, false);
    assert.deepEqual(await ent.purchase('paid'), { ok: true, test: true }, 'a free test purchase, as before');
  }
  assert.deepEqual(resolveBilling({ provider: 'stripe', endpoint: EP, loc: { ...loc, search: '?billingDev=8790' }, session: ss }), { provider: 'stripe', endpoint: 'http://localhost:8790' });
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(resolveBilling({ provider: 'stripe', endpoint: EP, loc, session: blocked }), null, 'storage blocked: still no production billing here');
  assert.deepEqual(resolveBilling({ provider: 'stripe', endpoint: EP, loc: { hostname: 'app.hushmallow.com', protocol: 'https:', search: '?billingDev=8790' }, session: ss }), CONFIG, 'a public host: the configured Worker, never a dev port');
});

// ---------------------------------------------- entitlement edges --
test('entitlement source "billing": a check dated later than now (a clock set back, an edited copy) is not trusted', async () => {
  const now = clockAt();
  const store = memStore();
  const away = setup({ signedIn: false });   // a signed-out tab never asks the server
  store.set('entitlement', { tier: 'ultra', source: 'billing', since: NOW, checkedAt: NOW + 365 * 86400000 });
  const ent = createEntitlements({ store, billing: away.billing, now });
  assert.equal(ent.tier(), 'none');
  await ent.refresh({ force: true });
  assert.equal(ent.tier(), 'none', 'it never becomes trusted by waiting');
  now.t += 200 * 86400000;
  assert.equal(ent.tier(), 'none');
  store.set('entitlement', { tier: 'ultra', source: 'billing', since: NOW, checkedAt: now.t + BILLING_CLOCK_SKEW_MS - 1 });
  assert.equal(createEntitlements({ store, billing: away.billing, now }).tier(), 'ultra', 'a few minutes of drift are fine');
  // the server's next answer decides, dated now
  const s = setup();
  s.server.status = { tier: 'ultra', status: 'active', current_period_end: null, cancel_at_period_end: false, manageable: true };
  store.set('entitlement', { tier: 'ultra', source: 'billing', since: NOW, checkedAt: now.t + 365 * 86400000 });
  const e2 = createEntitlements({ store, billing: s.billing, now });
  await e2.refresh();
  assert.equal(e2.tier(), 'ultra');
  assert.equal(store.get('entitlement').checkedAt, now.t);
});

test('Restore on the web: no answer from the server says "Couldn’t check", never "Nothing to restore yet"', async () => {
  const s = setup();
  const ent = createEntitlements({ store: memStore(), billing: s.billing });
  s.server.down = true;
  await assert.rejects(ent.restore(), /did not answer/);
  s.server.down = false;
  assert.equal((await ent.restore()).tier, 'none', 'answered: nothing to restore');
  s.server.down = true;
  const p = await plansPage(ent);
  await click(p.buttons().find((b) => text(b) === 'Restore purchases'));
  const said = all(p.body).map(text);
  assert.ok(said.includes('Couldn’t check just now. Try again in a moment.'));
  assert.ok(!said.includes('Nothing to restore yet'));
  s.server.down = false;
  await click(p.buttons().find((b) => text(b) === 'Restore purchases'));
  assert.ok(all(p.body).map(text).includes('Nothing to restore yet'));
  p.view.leave();
});

// ------------------------------------------------- the sign-in client --
test('the sign-in client hands out its own account\'s access token, and nothing for a guest', async () => {
  const { createFakeSupabase } = await import('../tools/auth/fake-supabase.mjs');
  const { createAuth } = await import('../src/auth/client.js');
  const { resolveAuthConfig } = await import('../src/auth/config.js');
  const { bootNamespace } = await import('../src/auth/namespace.js');
  const { memoryStorage, supabaseLib, fakeDom } = await import('./helpers/auth-env.mjs');
  const fake = createFakeSupabase({ siteUrl: 'http://localhost:8203' });
  const port = await fake.listen(0);
  const loc = { origin: 'http://localhost:8203', pathname: '/', href: 'http://localhost:8203/', hostname: 'localhost', protocol: 'http:', search: '', hash: '' };
  const config = resolveAuthConfig({ published: { enabled: true, url: `http://localhost:${port}`, key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' }, loc, session: memoryStorage() });
  const made = [];
  const page = (ls) => {
    const { doc, win } = fakeDom();
    const a = createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => supabaseLib(), doc, win, loc, storage: ls, onReload: () => {} });
    made.push(a);
    return a;
  };
  try {
    fake.cfg.autoconfirm = true;
    const ls = memoryStorage();
    const first = page(ls);
    assert.equal(await first.accessToken(), null, 'a guest has none');
    const r = await first.signUp({ email: 'ana@example.com', password: 'gentle-moon-42', name: 'Ana', agreed: true });
    assert.equal(r.ok, true);
    const signed = page(ls);   // the reload into the account
    assert.equal(signed.namespace.mode, 'account');
    const at = await signed.accessToken();
    assert.equal(typeof at, 'string');
    assert.equal(at, JSON.parse(ls.getItem(config.storageKey)).access_token);
  } finally {
    for (const a of made) { try { (await a.ensureClient()).auth.stopAutoRefresh(); } catch { /* never loaded */ } }
    await fake.close();
  }
});

// -------------------------------------------- framed (the Framer site) --
// Security review (17 Oct 2026): the app may run framed in the owner's Framer site (FRAME_ANCESTORS), and Stripe's
// Checkout and customer portal refuse to load in a frame: location.assign there left a dead frame where the app was,
// on the plans page, Manage subscription and the delete screen's "Cancel your subscription first". Framed, nothing is
// started at Stripe; a real link (target _top) opens this same app in the whole window instead.
test('framed: no checkout or portal starts in a frame; the plan is still shown, and a real link opens the app in the whole window', async () => {
  const { inFrame, outsideNote, outsideHref, FRAMED_LINE } = await import('../src/app/billing.js');
  const w = {}; w.top = w; w.self = w;
  assert.equal(inFrame(w), false, 'the whole window');
  assert.equal(inFrame({ top: {}, self: {} }), true);
  assert.equal(inFrame({ get top() { throw new Error('cross-origin'); }, self: {} }), true, 'a parent that cannot be read: framed');
  assert.equal(inFrame(undefined), false);
  const server = billingServer({ status: { tier: 'ultra', status: 'active', current_period_end: '2026-11-16T09:00:00.000Z', cancel_at_period_end: false, manageable: true } });
  const auth = authHandle();
  const navs = [];
  const billing = createBilling({ auth: () => auth, signIn: true, config: CONFIG, fetchImpl: server.fetch, nav: (u) => navs.push(u), framed: true });
  assert.equal(billing.framed, true);
  assert.deepEqual(await billing.checkout('ultra', 'monthly'), { framed: true });
  assert.deepEqual(await billing.portal(), { framed: true });
  assert.deepEqual(await billing.portal('switch'), { framed: true });
  assert.deepEqual(await billing.upgrade('ultra', 'monthly'), { framed: true }, 'the upgrade\'s confirm page neither');
  assert.deepEqual([navs, server.calls.length], [[], 0], 'nothing made at Stripe, the frame never navigated');
  assert.equal((await billing.status()).tier, 'ultra', 'the plan is still asked for');
  // the default reads the window it runs in
  const prevWin = globalThis.window;
  globalThis.window = { top: {}, self: {} };
  try { assert.equal(createBilling({ auth: () => auth, signIn: true, config: CONFIG, fetchImpl: server.fetch, shell: false }).framed, true); } finally { if (prevWin === undefined) delete globalThis.window; else globalThis.window = prevWin; }
  assert.equal(setup().billing.framed, false, 'the whole window: as before');
  // entitlements pass it on
  const ent = createEntitlements({ store: memStore(), billing });
  assert.deepEqual(await ent.purchase('ultra', 'yearly'), { ok: false, test: false, framed: true });
  assert.deepEqual(await ent.manage(), { framed: true });
  assert.deepEqual(await ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'yearly' }), { framed: true });
  // the way out: this same app, on the account card, in the whole window
  const loc = { origin: 'https://app.hushmallow.com', pathname: '/', host: 'app.hushmallow.com' };
  assert.equal(outsideHref(loc), 'https://app.hushmallow.com/#account');
  const prevLoc = globalThis.location;
  globalThis.location = loc;
  try {
    const p = await plansPage(createEntitlements({ store: memStore(), billing }));
    const before = server.calls.length;
    const beyond = p.buttons().find((b) => text(b) === 'Step into hushmallow Beyond');
    await click(beyond);
    assert.deepEqual([navs, server.calls.length - before], [[], 0]);
    assert.equal(beyond.disabled, false, 'the buttons wake again');
    const note = all(p.body).find((n) => n.attrs?.['data-framed'] === '');
    assert.ok(note && text(note).startsWith(FRAMED_LINE), 'said where the plan opens');
    const a = all(note).find((n) => n.tagName === 'A');
    assert.deepEqual([a.attrs.href, a.attrs.target, a.attrs.rel, text(a)], ['https://app.hushmallow.com/#account', '_top', 'noopener', 'Continue on app.hushmallow.com']);
    p.view.leave?.();
    // the delete screen's "Cancel your subscription first": its Manage subscription says the same, in place
    const A = await import('../src/app/scenes/account.js');
    const kept = createEntitlements({ store: memStore(), billing });
    await kept.refresh({ force: true });
    const guard = A.deleteGuard({ billing, ent: kept }, { submit: new FakeEl('button'), confirmed: () => false });
    await guard.checked;
    const manage = all(guard.el).find((n) => n.tagName === 'BUTTON' && text(n) === 'Manage subscription');
    await click(manage);
    assert.deepEqual(navs, []);
    const said = all(guard.el).find((n) => n.attrs?.['data-framed'] === '');
    assert.ok(said, 'the way out, under the button');
    assert.equal(all(said).find((n) => n.tagName === 'A').attrs.target, '_top');
    assert.equal(manage.disabled, false);
    guard.stop?.();
  } finally { if (prevLoc === undefined) delete globalThis.location; else globalThis.location = prevLoc; }
  // Settings' Manage subscription says it too (a toast with the same link)
  assert.match(read('src/app/scenes/settings.js'), /if \(r\?\.framed\) \{ toast\(outsideNote\(h\), 9000\); return; \}/);
  const fake = (tag, attrs, ...kids) => ({ tag, attrs, kids: kids.filter((k) => k != null) });
  assert.deepEqual(outsideNote(fake, { loc }).kids.at(-1), { tag: 'a', attrs: { href: 'https://app.hushmallow.com/#account', target: '_top', rel: 'noopener' }, kids: ['Continue on app.hushmallow.com'] });
});
