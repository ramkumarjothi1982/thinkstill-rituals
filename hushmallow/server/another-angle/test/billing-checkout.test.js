// Checkout (src/billing/routes.js), against the fake Stripe of test/billing-fixtures.js: the price check before
// selling, one customer and one subscription per account (checked at Stripe), the previous Checkout Session settled
// first, and the Stripe Tax switch and integration_identifier on the session's form.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { req, denyAll, allowAll, clock, ORIGIN, CLOCK_START } from './helpers.js';
import {
  CHECKOUT_PRICE_RULES, CHECKOUT_PRICE_CACHE_MS, CHECKOUT_INTEGRATION_IDENTIFIER, CHECKOUT_INTEGRATION_IDENTIFIER_SINCE, integrationIdentifierOn, priceFault,
} from '../src/billing/routes.js';
import { billingClient } from '../src/billing/store.js';
import { createLogger } from '../src/log.js';
import { STRIPE_API_VERSION_EXPECTED } from '../src/config.js';
import {
  upstream, billingEnv, subscription, setup, billingReq, subscribe, status, lines, jwt, assertClean, withStagingProject, price, event, deliver,
  UID, OTHER, TOKEN, PRICES, APP, DAY, SUPABASE, STAGING_SUPABASE,
} from './billing-fixtures.js';

const ULTRA_M = { plan: 'ultra', period: 'monthly' };
const post = (s, body, token) => s.app.fetch(billingReq('/v1/billing/checkout', { body, token }), s.env);
const code = async (res) => [res.status, (await res.clone().json()).error?.code ?? null];
const calls = (s) => s.up.stripe().map((c) => `${c.method} ${c.path}`);
const creates = (s) => s.up.stripe().filter((c) => c.method === 'POST' && c.path === '/v1/checkout/sessions');
const priceReads = (s) => s.up.stripe().filter((c) => c.path.startsWith('/v1/prices/')).map((c) => c.path.slice('/v1/prices/'.length));
const db = (s) => billingClient(s.env.BILLING);
const lastLog = (s, route) => lines(s.logs).filter((l) => l.route === route).at(-1);
const sessionIds = (s) => [...s.up.sessions.keys()];
const allLogs = [];
const track = (s) => { allLogs.push(s.logs); return s; };

// ------------------------------------------------------------ the form --
test('checkout form: the customer always; tax on adds automatic_tax, customer_update and billing_address_collection; a 2026-03-25+ pin adds integration_identifier; never payment_method_types', async () => {
  const formOf = async (over) => {
    const s = track(setup({ env: billingEnv(over) }));
    const res = await post(s, ULTRA_M);
    assert.equal(res.status, 200, await res.clone().text());
    const [c] = creates(s);
    return { s, c, f: Object.fromEntries(c.form) };
  };
  const base = {
    mode: 'subscription', 'line_items[0][price]': PRICES.ultraMonthly, 'line_items[0][quantity]': '1', customer: 'cus_New1abc', client_reference_id: UID,
    success_url: `${APP}/?billing=success`, cancel_url: `${APP}/?billing=cancel`,
    'metadata[user_id]': UID, 'metadata[plan]': 'ultra', 'metadata[period]': 'monthly', 'metadata[price]': PRICES.ultraMonthly,
    'subscription_data[metadata][user_id]': UID,
  };
  const tax = { 'automatic_tax[enabled]': 'true', 'customer_update[address]': 'auto', billing_address_collection: 'required' };
  // tax off (the default) and unpinned: the form, with the customer
  const off = await formOf({});
  assert.deepEqual(off.f, base);
  assert.equal(off.c.headers['stripe-version'], undefined);
  // STRIPE_AUTOMATIC_TAX on: the customer is always passed, so the address typed at checkout is asked for and saved on it
  const on = await formOf({ STRIPE_AUTOMATIC_TAX: 'true' });
  assert.deepEqual(on.f, { ...base, ...tax });
  // pinned as wrangler.toml pins it: integration_identifier, and the Stripe-Version header
  const pinned = await formOf({ STRIPE_API_VERSION: STRIPE_API_VERSION_EXPECTED });
  assert.deepEqual(pinned.f, { ...base, integration_identifier: CHECKOUT_INTEGRATION_IDENTIFIER });
  assert.equal(pinned.c.headers['stripe-version'], STRIPE_API_VERSION_EXPECTED);
  const both = await formOf({ STRIPE_API_VERSION: STRIPE_API_VERSION_EXPECTED, STRIPE_AUTOMATIC_TAX: 'on' });
  assert.deepEqual(both.f, { ...base, ...tax, integration_identifier: CHECKOUT_INTEGRATION_IDENTIFIER });
  // the first version that takes it does; an older pin sends the header but never the parameter
  assert.equal((await formOf({ STRIPE_API_VERSION: '2026-03-25.dahlia' })).f.integration_identifier, CHECKOUT_INTEGRATION_IDENTIFIER);
  for (const v of ['2026-02-25.clover', '2025-03-31.basil', '2024-06-20']) {
    const o = await formOf({ STRIPE_API_VERSION: v });
    assert.deepEqual(o.f, base, v);
    assert.equal(o.c.headers['stripe-version'], v);
  }
  assert.equal(integrationIdentifierOn(''), false, 'unpinned');
  assert.equal(integrationIdentifierOn('2026-03-24.clover'), false);
  assert.equal(integrationIdentifierOn('2027-01-01.later'), true);
  // the label: a fixed name and 8 letters, chosen once and committed
  assert.match(CHECKOUT_INTEGRATION_IDENTIFIER, /^hushmallow_web_plans_[a-z]{8}$/);
  assert.equal(CHECKOUT_INTEGRATION_IDENTIFIER_SINCE, '2026-03-25');
  // never payment_method_types (dynamic payment methods), and no trial, promotion code or email (D10, D13, D14)
  for (const { f } of [off, on, pinned, both]) {
    assert.deepEqual(Object.keys(f).filter((k) => /payment_method|trial|promotion|discounts|customer_email|email/.test(k)), []);
  }
  // the customer: the account id only, under customer:<account>
  const made = off.s.up.stripe().filter((c) => c.path === '/v1/customers');
  assert.equal(made.length, 1);
  assert.deepEqual(Object.fromEntries(made[0].form), { 'metadata[user_id]': UID });
  assert.equal(made[0].headers['idempotency-key'], `customer:${UID}`);
  assertClean(allLogs.flat());
});

// ------------------------------------------------------- the price check --
test('price check: a price that is not what its slot says is not sold (503 price_misconfigured, no customer, no session), and says which rule', async () => {
  const cases = [
    // Flow's monthly price in Beyond's monthly slot (two ids swapped while pasting)
    ['lookup_key', (p) => ({ ...p, lookup_key: 'hushmallow.paid.monthly' })],
    ['lookup_key', (p) => ({ ...p, lookup_key: null })],
    ['currency', (p) => ({ ...p, currency: 'usd' })],
    ['type', (p) => ({ ...p, type: 'one_time', recurring: null })],
    ['interval', (p) => ({ ...p, recurring: { ...p.recurring, interval: 'week' } })],
    ['interval_count', (p) => ({ ...p, recurring: { ...p.recurring, interval_count: 3 } })],
    ['inactive', (p) => ({ ...p, active: false })],
    ['tax_behavior', (p) => ({ ...p, tax_behavior: 'exclusive' })],
    ['tax_behavior', (p) => ({ ...p, tax_behavior: 'unspecified' })],
  ];
  for (const [fault, change] of cases) {
    const s = track(setup());
    s.up.prices.set(PRICES.ultraMonthly, change(s.up.prices.get(PRICES.ultraMonthly)));
    const res = await post(s, ULTRA_M);
    assert.deepEqual(await code(res), [503, 'price_misconfigured'], fault);
    assert.deepEqual(calls(s), [`GET /v1/prices/${PRICES.ultraMonthly}`], `${fault}: no customer, no session`);
    const l = lastLog(s, 'checkout');
    assert.deepEqual([l.status, l.http, l.err, l.plan, l.period], ['price_misconfigured', 503, fault, 'ultra', 'monthly']);
    assertClean(s.logs, await res.json());
  }
  // a monthly price in the yearly slot: its lookup key says yearly, Stripe bills it every month
  const y = track(setup());
  y.up.prices.set(PRICES.ultraYearly, price(PRICES.ultraYearly, 'ultra', 'yearly', { recurring: { interval: 'month', interval_count: 1 } }));
  assert.deepEqual(await code(await post(y, { plan: 'ultra', period: 'yearly' })), [503, 'price_misconfigured']);
  assert.equal(lastLog(y, 'checkout').err, 'interval');
  // the ids swapped the other way round in the vars: neither plan sells
  const swap = track(setup({ env: billingEnv({ STRIPE_PRICE_PAID_MONTHLY: PRICES.ultraMonthly, STRIPE_PRICE_ULTRA_MONTHLY: PRICES.paidMonthly }) }));
  assert.deepEqual(await code(await post(swap, { plan: 'paid', period: 'monthly' })), [503, 'price_misconfigured']);
  assert.deepEqual(await code(await post(swap, ULTRA_M)), [503, 'price_misconfigured']);
  assert.equal(creates(swap).length, 0);
  // not a price of this Stripe environment: the same
  const gone = track(setup());
  gone.up.prices.delete(PRICES.ultraMonthly);
  assert.deepEqual(await code(await post(gone, ULTRA_M)), [503, 'price_misconfigured']);
  assert.equal(lastLog(gone, 'checkout').err, 'not_found');
  // Stripe not answering: 502, nothing made, nothing kept (the next try reads it again)
  const down = track(setup());
  down.up.fail = { path: /^\/v1\/prices\//, status: 500, error: { type: 'api_error', message: 'down' } };
  assert.deepEqual(await code(await post(down, ULTRA_M)), [502, 'billing_unavailable']);
  assert.deepEqual([lastLog(down, 'checkout').err, lastLog(down, 'checkout').stripe_http], ['price:api_error', 500]);
  down.up.fail = null;
  assert.equal((await post(down, ULTRA_M)).status, 200);
  assert.deepEqual(priceReads(down), [PRICES.ultraMonthly, PRICES.ultraMonthly]);
  // the rules, and the check on its own
  assert.deepEqual(CHECKOUT_PRICE_RULES, { currency: 'aud', tax_behavior: 'inclusive', interval: { monthly: 'month', yearly: 'year' } });
  for (const [id, plan, period] of [[PRICES.paidMonthly, 'paid', 'monthly'], [PRICES.paidYearly, 'paid', 'yearly'], [PRICES.ultraYearly, 'ultra', 'yearly']]) {
    assert.equal(priceFault(price(id, plan, period), plan, period), '', `${plan} ${period}`);
  }
  assert.equal(priceFault(null, 'paid', 'monthly'), 'lookup_key');
  assert.equal(priceFault(price(PRICES.paidMonthly, 'paid', 'monthly'), 'paid', 'yearly'), 'lookup_key');
  assertClean(allLogs.flat());
});

test('price check: one read per price id for CHECKOUT_PRICE_CACHE_MS (ten minutes), then read again', async () => {
  const s = track(setup());
  s.up.users[jwt(OTHER)] = { id: OTHER };
  for (const [body, token] of [[ULTRA_M], [ULTRA_M], [{ plan: 'ultra', period: 'yearly' }], [ULTRA_M, jwt(OTHER)]]) {
    assert.equal((await post(s, body, token)).status, 200);
  }
  assert.deepEqual(priceReads(s), [PRICES.ultraMonthly, PRICES.ultraYearly], 'the cache is the isolate\'s, for every account');
  assert.equal(CHECKOUT_PRICE_CACHE_MS, 600000);
  s.now.advance(CHECKOUT_PRICE_CACHE_MS - 1);
  await post(s, ULTRA_M);
  assert.equal(priceReads(s).length, 2);
  s.now.advance(1);
  await post(s, ULTRA_M);
  assert.deepEqual(priceReads(s), [PRICES.ultraMonthly, PRICES.ultraYearly, PRICES.ultraMonthly]);
  // a price fixed in Stripe sells once its read is that old
  const f = track(setup());
  f.up.prices.set(PRICES.ultraMonthly, { ...f.up.prices.get(PRICES.ultraMonthly), tax_behavior: 'exclusive' });
  assert.equal((await post(f, ULTRA_M)).status, 503);
  f.up.prices.set(PRICES.ultraMonthly, price(PRICES.ultraMonthly, 'ultra', 'monthly'));
  assert.equal((await post(f, ULTRA_M)).status, 503, 'still the read kept');
  f.now.advance(CHECKOUT_PRICE_CACHE_MS);
  assert.equal((await post(f, ULTRA_M)).status, 200);
  assertClean(allLogs.flat());
});

// ------------------------------------------- one subscription per account --
test('one subscription per account: the record whatever its plan, then Stripe\'s own list (409 already_subscribed | payment_pending); nothing made', async () => {
  // an active subscription on a price no plan maps to: no plan, but still a subscription
  const a = track(setup());
  await subscribe(a, subscription({}, { price: 'price_Unmapped1' }));
  assert.deepEqual([(await status(a)).tier, (await status(a)).status], ['none', 'active']);
  const n = calls(a).length;
  const res = await post(a, ULTRA_M);
  assert.deepEqual(await code(res), [409, 'already_subscribed']);
  assert.equal(calls(a).length, n, 'Stripe not asked');
  assert.deepEqual([lastLog(a, 'checkout').status, lastLog(a, 'checkout').err], ['already_subscribed', 'record']);
  assertClean(a.logs, await res.json());
  // past_due long after its grace: no plan, still a subscription (pay or cancel it in the portal)
  const p = track(setup());
  await subscribe(p, subscription({ status: 'past_due' }));
  p.now.advance(20 * DAY);
  assert.equal((await status(p)).tier, 'none');
  assert.deepEqual(await code(await post(p, ULTRA_M)), [409, 'already_subscribed']);
  // nothing in the record yet, but Stripe has one (its webhook still on its way)
  for (const [st, want, err] of [['active', 'already_subscribed', 'listed'], ['trialing', 'already_subscribed', 'listed'], ['past_due', 'already_subscribed', 'listed'], ['incomplete', 'payment_pending', 'incomplete']]) {
    const s = track(setup());
    assert.equal((await post(s, ULTRA_M)).status, 200, 'the first makes the account\'s customer');
    const customer = await db(s).customerOf(UID);
    s.up.subs.set('sub_Lag1', subscription({ id: 'sub_Lag1', customer, status: st }));
    const r = await post(s, { plan: 'paid', period: 'yearly' });
    assert.deepEqual(await code(r), [409, want], st);
    assert.equal(creates(s).length, 1, `${st}: no second session`);
    assert.equal(s.up.sessions.get(sessionIds(s)[0]).status, 'open', `${st}: the first session left alone`);
    assert.equal((await status(s)).tier, 'none', 'the record is still the webhook\'s to write');
    assert.deepEqual([lastLog(s, 'checkout').status, lastLog(s, 'checkout').err], [want, err]);
    const listed = s.up.stripe().filter((c) => c.path === '/v1/subscriptions').at(-1);
    assert.deepEqual(Object.fromEntries(listed.query), { customer, status: 'all', limit: '20' });
    assertClean(s.logs, await r.json());
  }
  // ended ones do not count
  const e = track(setup());
  await post(e, ULTRA_M);
  const cus = await db(e).customerOf(UID);
  e.up.subs.set('sub_Old1', subscription({ id: 'sub_Old1', customer: cus, status: 'canceled' }));
  e.up.subs.set('sub_Old2', subscription({ id: 'sub_Old2', customer: cus, status: 'incomplete_expired' }));
  assert.equal((await post(e, { plan: 'paid', period: 'monthly' })).status, 200);
  // Stripe's list not answering: 502, nothing made
  e.up.fail = { path: /^\/v1\/subscriptions$/, status: 500, error: { type: 'api_error' } };
  assert.deepEqual(await code(await post(e, { plan: 'paid', period: 'yearly' })), [502, 'billing_unavailable']);
  assert.deepEqual([lastLog(e, 'checkout').err, lastLog(e, 'checkout').stripe_http], ['list:api_error', 500]);
  assert.equal(creates(e).length, 2);
  assertClean(allLogs.flat());
});

test('one Stripe customer per account: made once (customer:<account>), linked and reused; a subscription\'s customer from before is adopted; one linked to another account is refused', async () => {
  const s = track(setup());
  assert.equal((await post(s, ULTRA_M)).status, 200);
  assert.ok(!calls(s).includes('GET /v1/subscriptions'), 'a customer made just now has no subscriptions to list');
  assert.equal((await post(s, { plan: 'paid', period: 'yearly' })).status, 200);
  assert.equal(s.up.stripe().filter((c) => c.path === '/v1/customers').length, 1);
  const cus = await db(s).customerOf(UID);
  assert.equal(cus, 'cus_New1abc');
  assert.equal(await db(s).owner(cus), UID);
  assert.deepEqual(creates(s).map((c) => c.form.get('customer')), [cus, cus]);
  // another account: its own
  s.up.users[jwt(OTHER)] = { id: OTHER };
  assert.equal((await post(s, ULTRA_M, jwt(OTHER))).status, 200);
  assert.equal(await db(s).customerOf(OTHER), 'cus_New2abc');
  assert.equal(creates(s).at(-1).form.get('customer'), 'cus_New2abc');
  // two first checkouts at once: one customer and one session (Stripe's idempotency, then the kept session)
  const t = track(setup());
  const [x, y] = await Promise.all([post(t, ULTRA_M), post(t, ULTRA_M)]);
  assert.deepEqual([x.status, y.status], [200, 200]);
  assert.equal((await x.json()).url, (await y.json()).url);
  assert.deepEqual([t.up.customers.size, t.up.sessions.size], [1, 1]);
  assert.ok(t.up.stripe().filter((c) => c.path === '/v1/customers').every((c) => c.headers['idempotency-key'] === `customer:${UID}`));
  // a record from before customers were made here: its subscription's customer is the account's, nothing made
  const r = track(setup());
  await subscribe(r, subscription({ status: 'canceled' }));
  assert.equal((await post(r, ULTRA_M)).status, 200);
  assert.equal(r.up.stripe().filter((c) => c.path === '/v1/customers').length, 0);
  assert.equal(await db(r).customerOf(UID), 'cus_Test123');
  assert.equal(creates(r)[0].form.get('customer'), 'cus_Test123');
  // the account's customer linked to another account: refused before anything is made
  const c = track(setup());
  await db(c).link('cus_Shared1', OTHER);
  await db(c).setCustomer(UID, 'cus_Shared1');
  const conflict = await post(c, ULTRA_M);
  assert.deepEqual(await code(conflict), [409, 'customer_conflict']);
  assert.equal(creates(c).length, 0);
  assertClean(c.logs, await conflict.json());
  // Stripe refusing the customer (a restricted key without Customers write): 502, no session
  const f = track(setup());
  f.up.fail = { path: /^\/v1\/customers$/, status: 403, error: { type: 'invalid_request_error', message: 'The provided key does not have the required permissions' } };
  assert.deepEqual(await code(await post(f, ULTRA_M)), [502, 'billing_unavailable']);
  assert.deepEqual([lastLog(f, 'checkout').err, lastLog(f, 'checkout').stripe_http], ['customer:invalid_request_error', 403]);
  assert.equal(creates(f).length, 0);
  assert.equal(await db(f).customerOf(UID), null);
  assertClean(allLogs.flat());
});

// ------------------------------------------------- the previous session --
test('the previous Checkout Session: the same again is handed back; another plan expires it first; a paid one is payment_pending until its subscription ends', async () => {
  const s = track(setup());
  assert.equal((await post(s, ULTRA_M)).status, 200);
  const [s1] = sessionIds(s);
  assert.deepEqual(await db(s).lastCheckout(UID), { id: s1, expires_at: CLOCK_START + DAY }, 'kept, in ms');
  // the same plan again (a second tab, or Back and the button again): that session, nothing new, nothing expired
  s.now.advance(5 * 60000);
  const again = await post(s, ULTRA_M);
  assert.deepEqual(await again.json(), { url: s.up.checkoutUrl });
  assert.equal(creates(s).length, 1);
  assert.equal(s.up.sessions.get(s1).status, 'open');
  assert.equal(lastLog(s, 'checkout').status, 'reused');
  // another plan: the open one is expired before the new one is made, and the new one is kept
  let n = calls(s).length;
  assert.equal((await post(s, { plan: 'paid', period: 'monthly' })).status, 200);
  assert.deepEqual(calls(s).slice(n), [
    `GET /v1/prices/${PRICES.paidMonthly}`, 'GET /v1/subscriptions', `GET /v1/checkout/sessions/${s1}`, `POST /v1/checkout/sessions/${s1}/expire`, 'POST /v1/checkout/sessions',
  ]);
  const s2 = sessionIds(s)[1];
  assert.deepEqual([s.up.sessions.get(s1).status, s.up.sessions.get(s2).status], ['expired', 'open']);
  assert.equal((await db(s).lastCheckout(UID)).id, s2);
  // back to the first plan within the same two minutes: a session of its own, never Stripe's answer for the expired one
  assert.equal((await post(s, ULTRA_M)).status, 200);
  const s3 = sessionIds(s)[2];
  assert.ok(s3 && s3 !== s1);
  assert.equal(s.up.sessions.get(s2).status, 'expired');
  const keys = creates(s).map((c) => c.headers['idempotency-key']);
  assert.equal(new Set(keys).size, 3);
  for (const k of keys) assert.ok(k.length <= 255 && k.startsWith(`checkout:${UID}:`));
  // Stripe Tax switched on since: the open session has none, so it is replaced
  const taxed = { ...s.env, STRIPE_AUTOMATIC_TAX: 'true' };
  assert.equal((await s.app.fetch(billingReq('/v1/billing/checkout', { body: ULTRA_M }), taxed)).status, 200);
  const s4 = sessionIds(s)[3];
  assert.deepEqual([s.up.sessions.get(s3).status, s.up.sessions.get(s4).automatic_tax.enabled], ['expired', true]);
  // paid, and its subscription not ended: on its way (409 payment_pending), nothing made
  Object.assign(s.up.sessions.get(s4), { status: 'complete', subscription: 'sub_Paid1' });
  n = creates(s).length;
  const pending = await s.app.fetch(billingReq('/v1/billing/checkout', { body: ULTRA_M }), taxed);
  assert.deepEqual(await code(pending), [409, 'payment_pending']);
  assert.deepEqual([lastLog(s, 'checkout').status, lastLog(s, 'checkout').err], ['payment_pending', 'session_complete']);
  assert.equal(creates(s).length, n);
  // … until Stripe's list shows that subscription ended
  s.up.subs.set('sub_Paid1', subscription({ id: 'sub_Paid1', customer: await db(s).customerOf(UID), status: 'canceled' }));
  assert.equal((await s.app.fetch(billingReq('/v1/billing/checkout', { body: ULTRA_M }), taxed)).status, 200);
  assert.equal(creates(s).length, n + 1);
  assertClean(s.logs, await pending.json());
});

test('the previous session: past its time, of the other mode, gone or expired is left alone; an expire refused because it was paid that moment is payment_pending; refused while open is 502', async () => {
  const sessionReads = (s) => calls(s).filter((c) => c.includes('/v1/checkout/sessions/'));
  // past its expires_at: Stripe is not asked about it
  const t = track(setup());
  await post(t, ULTRA_M);
  t.now.advance(DAY);
  assert.equal((await post(t, { plan: 'paid', period: 'monthly' })).status, 200);
  assert.deepEqual(sessionReads(t), []);
  // a cs_test_ session kept on a live key: never read (this key can neither read nor pay it)
  const o = track(setup());
  await post(o, ULTRA_M);
  await db(o).setCheckout(UID, { id: `cs_test_B9${'x'.repeat(12)}`, expires_at: CLOCK_START + DAY });
  assert.equal((await post(o, { plan: 'paid', period: 'monthly' })).status, 200);
  assert.deepEqual(sessionReads(o), []);
  // gone at Stripe (404), or expired there already: a new one, no expire
  for (const change of [(s, id) => s.up.sessions.delete(id), (s, id) => { s.up.sessions.get(id).status = 'expired'; }]) {
    const g = track(setup());
    await post(g, ULTRA_M);
    const [id] = sessionIds(g);
    change(g, id);
    assert.equal((await post(g, { plan: 'paid', period: 'monthly' })).status, 200);
    assert.deepEqual(sessionReads(g), [`GET /v1/checkout/sessions/${id}`]);
  }
  // the expire refused because it was paid that very moment: read again, 409 payment_pending, nothing made
  const up = upstream();
  const base = up.fetch;
  let onExpire = null;
  up.fetch = async (u, i) => { const r = await base(u, i); if (onExpire && String(u).endsWith('/expire')) onExpire(); return r; };
  const p = track(setup({ up }));
  await post(p, ULTRA_M);
  const [id] = sessionIds(p);
  up.fail = { path: /\/expire$/, status: 400, error: { type: 'invalid_request_error', code: 'checkout_session_not_open' } };
  onExpire = () => Object.assign(up.sessions.get(id), { status: 'complete', subscription: 'sub_Paid1' });
  assert.deepEqual(await code(await post(p, { plan: 'paid', period: 'monthly' })), [409, 'payment_pending']);
  assert.deepEqual(sessionReads(p), [`GET /v1/checkout/sessions/${id}`, `POST /v1/checkout/sessions/${id}/expire`, `GET /v1/checkout/sessions/${id}`]);
  assert.equal(creates(p).length, 1);
  // refused while it is still open: 502, nothing made (two payable sessions never)
  const q = track(setup());
  await post(q, ULTRA_M);
  q.up.fail = { path: /\/expire$/, status: 500, error: { type: 'api_error' } };
  assert.deepEqual(await code(await post(q, { plan: 'paid', period: 'monthly' })), [502, 'billing_unavailable']);
  assert.deepEqual([lastLog(q, 'checkout').err, lastLog(q, 'checkout').stripe_http], ['expire:api_error', 500]);
  assert.equal(creates(q).length, 1);
  // its read failing: 502 too
  q.up.fail = { path: /^\/v1\/checkout\/sessions\/cs_/, status: 503, error: { type: 'api_error' } };
  assert.deepEqual(await code(await post(q, { plan: 'paid', period: 'monthly' })), [502, 'billing_unavailable']);
  assert.equal(lastLog(q, 'checkout').err, 'session:api_error');
  assertClean(allLogs.flat());
});
