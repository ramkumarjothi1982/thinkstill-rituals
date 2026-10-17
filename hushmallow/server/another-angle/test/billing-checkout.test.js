// Checkout, the return sync and the portal's plan change (src/billing/routes.js), against the fake Stripe of
// test/billing-fixtures.js: the price check before selling, one customer and one subscription per account (checked
// at Stripe), the previous Checkout Session settled first, the Checkout Studio settings, the Stripe Tax switch and
// integration_identifier on the session's form, POST /v1/billing/sync after Checkout, and the portal's intent 'switch'.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { req, denyAll, allowAll, clock, ORIGIN, CLOCK_START } from './helpers.js';
import {
  createBilling, CHECKOUT_PRICE_RULES, CHECKOUT_PRICE_CACHE_MS, CHECKOUT_INTEGRATION_IDENTIFIER, CHECKOUT_INTEGRATION_IDENTIFIER_SINCE,
  CHECKOUT_STUDIO, CHECKOUT_TAX, checkoutSettings, integrationIdentifierOn, priceFault, PATHS, HELD_STATUSES,
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
test('checkout form: the Studio\'s settings on every session and the account link kept; tax on replaces two of them and adds customer_update; a 2026-03-25+ pin adds integration_identifier; never payment_method_types', async () => {
  const formOf = async (over) => {
    const s = track(setup({ env: billingEnv(over) }));
    const res = await post(s, ULTRA_M);
    assert.equal(res.status, 200, await res.clone().text());
    const [c] = creates(s);
    return { s, c, f: Object.fromEntries(c.form) };
  };
  const base = {
    mode: 'subscription', 'line_items[0][price]': PRICES.ultraMonthly, 'line_items[0][quantity]': '1', customer: 'cus_New1abc', client_reference_id: UID,
    // the literal placeholder: Stripe puts the session's id there
    success_url: `${APP}/?billing=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${APP}/?billing=cancel`,
    'metadata[user_id]': UID, 'metadata[plan]': 'ultra', 'metadata[period]': 'monthly', 'metadata[price]': PRICES.ultraMonthly,
    'subscription_data[metadata][user_id]': UID,
    // the owner's Checkout Studio values, exactly
    ui_mode: 'hosted_page', billing_address_collection: 'auto', 'phone_number_collection[enabled]': 'false', 'automatic_tax[enabled]': 'false',
    allow_promotion_codes: 'false', payment_method_collection: 'always', submit_type: 'auto', origin_context: 'web',
  };
  const tax = { 'automatic_tax[enabled]': 'true', billing_address_collection: 'required', 'customer_update[address]': 'auto' };
  assert.deepEqual(CHECKOUT_STUDIO, {
    ui_mode: 'hosted_page', billing_address_collection: 'auto', phone_number_collection: { enabled: false }, automatic_tax: { enabled: false },
    allow_promotion_codes: false, payment_method_collection: 'always', submit_type: 'auto', origin_context: 'web',
  });
  assert.deepEqual(CHECKOUT_TAX, { automatic_tax: { enabled: true }, billing_address_collection: 'required', customer_update: { address: 'auto' } });
  assert.deepEqual(checkoutSettings(false), { ...CHECKOUT_STUDIO });
  assert.deepEqual(checkoutSettings(true), { ...CHECKOUT_STUDIO, ...CHECKOUT_TAX });
  // tax off (the default) and unpinned: the form, with the customer
  const off = await formOf({});
  assert.deepEqual(off.f, base);
  assert.equal(off.c.headers['stripe-version'], undefined);
  // STRIPE_AUTOMATIC_TAX on: the customer is always passed, so the address typed at checkout is asked for and saved on it
  const on = await formOf({ STRIPE_AUTOMATIC_TAX: 'true' });
  assert.deepEqual(on.f, { ...base, ...tax });
  assert.equal(on.f.ui_mode, 'hosted_page', 'the other Studio values stay with tax on');
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
  // the label: the owner's Checkout Studio value
  assert.equal(CHECKOUT_INTEGRATION_IDENTIFIER, 'hosted_web_0001');
  assert.equal(CHECKOUT_INTEGRATION_IDENTIFIER_SINCE, '2026-03-25');
  // never payment_method_types (dynamic payment methods), and no trial, promotion code or email (D10, D13, D14)
  for (const { f } of [off, on, pinned, both]) {
    assert.deepEqual(Object.keys(f).filter((k) => /payment_method_(?:types|configuration)|trial|discounts|email/.test(k)), []);
    assert.deepEqual([f.allow_promotion_codes, f.payment_method_collection], ['false', 'always']);
  }
  // the exact body sent, pinned as wrangler.toml pins it: tax off (the default), then tax on
  const enc = (pairs) => pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const sale = [
    ['mode', 'subscription'], ['line_items[0][price]', PRICES.ultraMonthly], ['line_items[0][quantity]', '1'], ['customer', 'cus_New1abc'], ['client_reference_id', UID],
    ['success_url', `${APP}/?billing=success&session_id={CHECKOUT_SESSION_ID}`], ['cancel_url', `${APP}/?billing=cancel`],
    ['metadata[user_id]', UID], ['metadata[plan]', 'ultra'], ['metadata[period]', 'monthly'], ['metadata[price]', PRICES.ultraMonthly], ['subscription_data[metadata][user_id]', UID],
  ];
  assert.equal(pinned.c.body, enc([
    ...sale, ['ui_mode', 'hosted_page'], ['billing_address_collection', 'auto'], ['phone_number_collection[enabled]', 'false'], ['automatic_tax[enabled]', 'false'],
    ['allow_promotion_codes', 'false'], ['payment_method_collection', 'always'], ['submit_type', 'auto'], ['origin_context', 'web'], ['integration_identifier', 'hosted_web_0001'],
  ]));
  assert.equal(both.c.body, enc([
    ...sale, ['ui_mode', 'hosted_page'], ['billing_address_collection', 'required'], ['phone_number_collection[enabled]', 'false'], ['automatic_tax[enabled]', 'true'],
    ['allow_promotion_codes', 'false'], ['payment_method_collection', 'always'], ['submit_type', 'auto'], ['origin_context', 'web'], ['customer_update[address]', 'auto'],
    ['integration_identifier', 'hosted_web_0001'],
  ]));
  assert.ok(pinned.c.body.startsWith('mode=subscription&line_items%5B0%5D%5Bprice%5D=price_BeyondMonthly1&line_items%5B0%5D%5Bquantity%5D=1&customer=cus_New1abc&'));
  assert.ok(pinned.c.body.endsWith('&ui_mode=hosted_page&billing_address_collection=auto&phone_number_collection%5Benabled%5D=false&automatic_tax%5Benabled%5D=false&allow_promotion_codes=false&payment_method_collection=always&submit_type=auto&origin_context=web&integration_identifier=hosted_web_0001'));
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
  // past_due long after its grace: no plan, still a subscription (pay or cancel it in the portal), as Stripe's list says
  const p = track(setup());
  await subscribe(p, subscription({ status: 'past_due' }));
  p.now.advance(20 * DAY);
  assert.equal((await status(p)).tier, 'none');
  assert.deepEqual(await code(await post(p, ULTRA_M)), [409, 'already_subscribed']);
  assert.equal(lastLog(p, 'checkout').err, 'listed');
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

test('a subscription Stripe keeps unpaid or paused is still the account\'s: 409 already_subscribed, from Stripe\'s list, so paying its open invoice later never makes two', async () => {
  for (const st of ['unpaid', 'paused']) {
    // the record says so (retries ran out and Stripe marked it unpaid): no plan, and no second subscription. A record
    // giving no access decides nothing alone: Stripe's list, which still has it, does
    const r = track(setup());
    assert.equal((await post(r, ULTRA_M)).status, 200);
    const customer = await db(r).customerOf(UID);
    const sub = subscription({ id: 'sub_Held1', customer, status: st });
    r.up.subs.set(sub.id, sub);
    await deliver(r.app, r.env, event('customer.subscription.updated', sub, r.now), { at: r.now() });
    assert.deepEqual([(await status(r)).tier, (await status(r)).status], ['none', st]);
    r.now.advance(DAY + 3600000);   // the first session has expired
    const res = await post(r, ULTRA_M);
    assert.deepEqual(await code(res), [409, 'already_subscribed'], `${st}: record`);
    assert.deepEqual([lastLog(r, 'checkout').status, lastLog(r, 'checkout').err], ['already_subscribed', 'listed']);
    assert.equal(creates(r).length, 1, `${st}: no second session`);
    // the portal is where it is paid or cancelled
    assert.equal((await r.app.fetch(billingReq('/v1/billing/portal', { body: {} }), r.env)).status, 200);
    assertClean(r.logs, await res.json());
    // the record knows nothing of it yet: Stripe's list does
    const l = track(setup());
    assert.equal((await post(l, ULTRA_M)).status, 200);
    l.up.subs.set('sub_Held2', subscription({ id: 'sub_Held2', customer: await db(l).customerOf(UID), status: st }));
    l.now.advance(DAY + 3600000);
    assert.deepEqual(await code(await post(l, { plan: 'paid', period: 'monthly' })), [409, 'already_subscribed'], `${st}: listed`);
    assert.deepEqual([lastLog(l, 'checkout').status, lastLog(l, 'checkout').err], ['already_subscribed', 'listed']);
    assert.equal(creates(l).length, 1);
  }
  assert.deepEqual([...HELD_STATUSES].sort(), ['active', 'past_due', 'paused', 'trialing', 'unpaid']);
  assertClean(allLogs.flat());
});

test('a record whose period ended over a day ago (its last events lost) does not decide alone: Stripe\'s list does, and the new plan is recorded over it', async () => {
  // a sign-in that outlives the period (the fixture's token lasts 30 days)
  const LONG = jwt(UID, { exp: (CLOCK_START + 400 * DAY) / 1000 });
  const long = () => track(setup({ up: upstream({ users: { [LONG]: { id: UID } } }) }));
  // the record says Beyond monthly, active; Stripe cancelled it at once and customer.subscription.deleted never landed
  const s = long();
  const old = subscription({ id: 'sub_Stale1', customer: 'cus_Stale1' });
  await subscribe(s, old);
  s.up.subs.set(old.id, { ...old, status: 'canceled' });
  // within a day of the period end the record still decides, Stripe not asked
  s.now.advance(30 * DAY + DAY - 60000);
  let n = calls(s).length;
  assert.deepEqual(await code(await post(s, { plan: 'paid', period: 'monthly' }, LONG)), [409, 'already_subscribed']);
  assert.equal(calls(s).length, n);
  assert.equal(lastLog(s, 'checkout').err, 'record');
  // past it: tier none, and Stripe's list (canceled) lets the account subscribe again, to Flow this time
  s.now.advance(DAY);
  assert.deepEqual([(await status(s, LONG)).tier, (await status(s, LONG)).status], ['none', 'active']);
  n = calls(s).length;
  const res = await post(s, { plan: 'paid', period: 'monthly' }, LONG);
  assert.equal(res.status, 200, await res.clone().text());
  assert.deepEqual(calls(s).slice(n), [`GET /v1/prices/${PRICES.paidMonthly}`, 'GET /v1/subscriptions', 'POST /v1/checkout/sessions']);
  assert.equal(creates(s).at(-1).form.get('customer'), 'cus_Stale1');
  // Flow is a lower plan than the stale record's Beyond: recorded all the same, since the stale one gives nothing
  const flow = subscription({ id: 'sub_Flow1', customer: 'cus_Stale1' }, { price: PRICES.paidMonthly, end: (s.now() + 30 * DAY) / 1000 });
  s.up.subs.set(flow.id, flow);
  await deliver(s.app, s.env, event('checkout.session.completed', { id: sessionIds(s).at(-1), object: 'checkout.session', mode: 'subscription', status: 'complete', client_reference_id: UID, customer: 'cus_Stale1', subscription: flow.id }, s.now), { at: s.now() });
  assert.deepEqual([(await status(s, LONG)).tier, (await status(s, LONG)).status], ['paid', 'active']);
  assert.equal((await db(s).get(UID)).subscription, 'sub_Flow1');
  // a late event about the stale one (a lost one, resent) never takes Flow away
  await deliver(s.app, s.env, event('customer.subscription.updated', old, s.now), { at: s.now() });
  assert.equal((await status(s, LONG)).tier, 'paid');
  // the same stale record while Stripe still has it running (its renewal's events lost): the list stops a second one
  const r = long();
  await subscribe(r, subscription({ id: 'sub_Renewed1', customer: 'cus_Renewed1' }));
  r.up.subs.set('sub_Renewed1', subscription({ id: 'sub_Renewed1', customer: 'cus_Renewed1' }, { end: (CLOCK_START + 60 * DAY) / 1000 }));
  r.now.advance(32 * DAY);
  assert.deepEqual(await code(await post(r, ULTRA_M, LONG)), [409, 'already_subscribed']);
  assert.equal(lastLog(r, 'checkout').err, 'listed');
  assert.equal(creates(r).length, 0);
  assertClean(allLogs.flat());
});

test('a record that gives no access while its period runs (past_due beyond its 14-day cap, unpaid) does not decide alone: Stripe\'s list does, and a plan bought then is recorded', async () => {
  const YEAR = { price: PRICES.ultraYearly, end: (CLOCK_START + 365 * DAY) / 1000 };
  // a Beyond yearly renewal fails: Stripe moves the period a year on and marks it past_due
  const s = track(setup());
  const year = subscription({ id: 'sub_Year1', customer: 'cus_Year1' }, YEAR);
  await subscribe(s, year);
  s.now.advance(60000);
  s.up.subs.set(year.id, { ...year, status: 'past_due' });
  await deliver(s.app, s.env, event('customer.subscription.updated', { ...year, status: 'past_due' }, s.now), { at: s.now() });
  // within the cap it gives access: the record decides, Stripe not asked
  s.now.advance(10 * DAY);
  assert.deepEqual([(await status(s)).tier, (await status(s)).status], ['ultra', 'past_due']);
  let n = calls(s).length;
  assert.deepEqual(await code(await post(s, { plan: 'paid', period: 'monthly' })), [409, 'already_subscribed']);
  assert.deepEqual([calls(s).length, lastLog(s, 'checkout').err], [n, 'record']);
  // the retries ran out and Stripe cancelled it (D6), but customer.subscription.deleted was lost: no plan, and
  // Stripe's list (canceled) lets the account subscribe again, though the record's period has 11 months to run
  s.up.subs.set(year.id, { ...year, status: 'canceled' });
  s.now.advance(5 * DAY);
  assert.deepEqual([(await status(s)).tier, (await status(s)).status], ['none', 'past_due']);
  n = calls(s).length;
  const res = await post(s, { plan: 'paid', period: 'monthly' });
  assert.equal(res.status, 200, await res.clone().text());
  assert.deepEqual(calls(s).slice(n), [`GET /v1/prices/${PRICES.paidMonthly}`, 'GET /v1/subscriptions', 'POST /v1/checkout/sessions']);
  // Flow, a lower plan than the record's Beyond, is recorded all the same: the record past its cap gives nothing
  const flow = subscription({ id: 'sub_Flow1', customer: 'cus_Year1' }, { price: PRICES.paidMonthly, end: (s.now() + 30 * DAY) / 1000 });
  s.up.subs.set(flow.id, flow);
  await deliver(s.app, s.env, event('checkout.session.completed', { id: sessionIds(s).at(-1), object: 'checkout.session', mode: 'subscription', status: 'complete', client_reference_id: UID, customer: 'cus_Year1', subscription: flow.id }, s.now), { at: s.now() });
  assert.deepEqual([(await status(s)).tier, (await status(s)).status], ['paid', 'active']);
  assert.equal((await db(s).get(UID)).subscription, 'sub_Flow1');
  // the same record while Stripe still has it past_due (the retries left running): the list stops a second one
  const p = track(setup());
  await subscribe(p, year);
  p.now.advance(60000);
  p.up.subs.set(year.id, { ...year, status: 'past_due' });
  await deliver(p.app, p.env, event('customer.subscription.updated', { ...year, status: 'past_due' }, p.now), { at: p.now() });
  p.now.advance(15 * DAY);
  assert.deepEqual(await code(await post(p, ULTRA_M)), [409, 'already_subscribed']);
  assert.equal(lastLog(p, 'checkout').err, 'listed');
  assert.equal(creates(p).length, 0);
  // unpaid in the record, cancelled at Stripe since (its event lost): sold, from Stripe's list
  const u = track(setup());
  await subscribe(u, year);
  u.now.advance(60000);
  u.up.subs.set(year.id, { ...year, status: 'unpaid' });
  await deliver(u.app, u.env, event('customer.subscription.updated', { ...year, status: 'unpaid' }, u.now), { at: u.now() });
  u.up.subs.set(year.id, { ...year, status: 'canceled' });
  u.now.advance(DAY);
  assert.equal((await status(u)).status, 'unpaid');
  assert.equal((await post(u, ULTRA_M)).status, 200);
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

test('the account\'s customer deleted at Stripe (a Dashboard clean-up, an erasure, a test clock deleted): replaced once by a new one, and checkout goes on', async () => {
  const made = (s) => s.up.stripe().filter((c) => c.path === '/v1/customers');
  // Stripe's list refuses the deleted customer
  const s = track(setup());
  assert.equal((await post(s, ULTRA_M)).status, 200);
  s.up.customers.get('cus_New1abc').deleted = true;
  s.now.advance(DAY);
  let n = calls(s).length;
  const res = await post(s, ULTRA_M);
  assert.equal(res.status, 200, await res.clone().text());
  assert.deepEqual(calls(s).slice(n), [
    `GET /v1/prices/${PRICES.ultraMonthly}`, 'GET /v1/subscriptions', 'GET /v1/customers/cus_New1abc', 'POST /v1/customers', 'POST /v1/checkout/sessions',
  ], 'a customer made just now has nothing to list');
  assert.equal(await db(s).customerOf(UID), 'cus_New2abc');
  assert.equal(await db(s).owner('cus_New2abc'), UID);
  assert.equal(creates(s).at(-1).form.get('customer'), 'cus_New2abc');
  // made as the first was (the account id only), under a key of its own: Stripe never hands back the deleted one
  assert.deepEqual(Object.fromEntries(made(s).at(-1).form), { 'metadata[user_id]': UID });
  assert.equal(made(s).at(-1).headers['idempotency-key'], `customer:${UID}:cus_New1abc`);
  assert.ok(lines(s.logs).some((l) => l.route === 'checkout' && l.status === 'customer_replaced'));
  // from then on it is the account's: nothing more made
  s.now.advance(DAY);
  assert.equal((await post(s, { plan: 'paid', period: 'yearly' })).status, 200);
  assert.equal(made(s).length, 2);
  assertClean(s.logs);
  // Stripe lists nothing for it but refuses the session: replaced there, and the session made for the new one
  const e = track(setup());
  e.up.deletedListing = 'empty';
  assert.equal((await post(e, ULTRA_M)).status, 200);
  e.up.customers.get('cus_New1abc').deleted = true;
  e.now.advance(DAY);
  n = calls(e).length;
  assert.equal((await post(e, ULTRA_M)).status, 200);
  assert.deepEqual(calls(e).slice(n).slice(-4), ['POST /v1/checkout/sessions', 'GET /v1/customers/cus_New1abc', 'POST /v1/customers', 'POST /v1/checkout/sessions']);
  assert.deepEqual(creates(e).slice(-2).map((c) => c.form.get('customer')), ['cus_New1abc', 'cus_New2abc']);
  const [k1, k2] = creates(e).slice(-2).map((c) => c.headers['idempotency-key']);
  assert.notEqual(k1, k2, 'the retry never gets Stripe\'s first answer back');
  assert.equal(await db(e).customerOf(UID), 'cus_New2abc');
  // a record's customer from before customers were kept here, deleted since: the same
  const r = track(setup());
  await subscribe(r, subscription({ status: 'canceled' }));
  r.up.customers.set('cus_Test123', { id: 'cus_Test123', object: 'customer', metadata: {}, deleted: true });
  assert.equal((await post(r, ULTRA_M)).status, 200);
  assert.equal(await db(r).customerOf(UID), 'cus_New2abc');
  // a customer this key cannot find at all (GET /v1/customers/:id 404, not a deleted one): gone too, and replaced
  const g = track(setup());
  await subscribe(g, subscription({ status: 'canceled' }));
  assert.equal(g.up.customers.has('cus_Test123'), false);
  g.up.fail = { path: /^\/v1\/subscriptions$/, status: 400, error: { code: 'resource_missing', param: 'customer', type: 'invalid_request_error' } };
  n = calls(g).length;
  assert.equal((await post(g, ULTRA_M)).status, 200);
  assert.deepEqual(calls(g).slice(n), [`GET /v1/prices/${PRICES.ultraMonthly}`, 'GET /v1/subscriptions', 'GET /v1/customers/cus_Test123', 'POST /v1/customers', 'POST /v1/checkout/sessions']);
  assert.equal(await db(g).customerOf(UID), 'cus_New1abc');
  assert.equal(creates(g).at(-1).form.get('customer'), 'cus_New1abc');
  // resource_missing about the customer while Stripe still has it (or cannot say): 502, nothing replaced
  const k = track(setup());
  assert.equal((await post(k, ULTRA_M)).status, 200);
  k.now.advance(DAY);
  k.up.fail = { path: /^\/v1\/subscriptions$/, status: 400, error: { code: 'resource_missing', type: 'invalid_request_error' } };
  assert.deepEqual(await code(await post(k, ULTRA_M)), [502, 'billing_unavailable']);
  assert.equal(lastLog(k, 'checkout').err, 'list:resource_missing');
  // the customer's read refused too (not a 404, not a deleted customer): it is not known to be gone
  k.up.fail = { path: /^\/v1\/(subscriptions|customers\/.*)$/, status: 400, error: { code: 'resource_missing', type: 'invalid_request_error' } };
  assert.deepEqual(await code(await post(k, ULTRA_M)), [502, 'billing_unavailable']);
  assert.ok(calls(k).includes('GET /v1/customers/cus_New1abc'));
  assert.equal(made(k).length, 1);
  assert.equal(await db(k).customerOf(UID), 'cus_New1abc');
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

test('the previous session on the slot\'s old price (replaced in Stripe, its lookup key moved to a new id): expired, and the new session sells the new price', async () => {
  const s = track(setup());
  assert.equal((await post(s, ULTRA_M)).status, 200);
  const [s1] = sessionIds(s);
  const NEW = 'price_BeyondMonthly2';
  s.up.prices.set(NEW, price(NEW, 'ultra', 'monthly'));
  s.up.prices.set(PRICES.ultraMonthly, { ...s.up.prices.get(PRICES.ultraMonthly), lookup_key: null, active: false });
  const env = { ...s.env, STRIPE_PRICE_ULTRA_MONTHLY: NEW };
  s.now.advance(5 * 60000);
  const res = await s.app.fetch(billingReq('/v1/billing/checkout', { body: ULTRA_M }), env);
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(s.up.sessions.get(s1).status, 'expired', 'the open session would charge the old price');
  assert.equal(creates(s).length, 2);
  const f = creates(s).at(-1).form;
  assert.deepEqual([f.get('line_items[0][price]'), f.get('metadata[price]')], [NEW, NEW]);
  assert.equal((await db(s).lastCheckout(UID)).id, sessionIds(s)[1]);
  // and that one is handed back to the next tap
  assert.deepEqual(await (await s.app.fetch(billingReq('/v1/billing/checkout', { body: ULTRA_M }), env)).json(), { url: s.up.checkoutUrl });
  assert.equal(creates(s).length, 2);
  assertClean(s.logs);
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

// ------------------------------------------------------------- the sync --
const sync = (s, body, token) => s.app.fetch(billingReq('/v1/billing/sync', { body, token }), s.env);
/** A checkout that was paid: its session complete, its subscription at Stripe on the account's customer. */
async function paid(s, { sub = {}, session = {} } = {}) {
  assert.equal((await post(s, ULTRA_M)).status, 200);
  const id = sessionIds(s).at(-1);
  const customer = await db(s).customerOf(UID);
  s.up.subs.set('sub_Paid1', subscription({ id: 'sub_Paid1', customer, ...sub }));
  Object.assign(s.up.sessions.get(id), { status: 'complete', payment_status: 'paid', subscription: 'sub_Paid1', ...session });
  return id;
}
const ACTIVE = { tier: 'ultra', status: 'active', current_period_end: new Date(CLOCK_START + 30 * DAY).toISOString(), cancel_at_period_end: false, ends_at: null, manageable: true };
const NONE = { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, ends_at: null, manageable: false };

test('POST /v1/billing/sync: back from Checkout, the session\'s subscription is read and recorded at once; the answer is the status', async () => {
  const s = track(setup());
  const id = await paid(s);
  assert.deepEqual(await status(s), NONE, 'no webhook yet');
  const n = calls(s).length;
  const res = await sync(s, { session_id: id });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  const body = await res.json();
  assert.deepEqual(body, ACTIVE);
  assert.deepEqual(await status(s), ACTIVE);
  assert.deepEqual(calls(s).slice(n), [`GET /v1/checkout/sessions/${id}`, 'GET /v1/subscriptions/sub_Paid1'], 'the session, then its subscription');
  assert.deepEqual([...s.env.BILLING.instances.get(`user:${UID}`).map.keys()].filter((k) => k.startsWith('evt:')), [], 'no event id kept');
  const l = lastLog(s, 'sync');
  assert.deepEqual([l.status, l.http, l.tier, l.sub_status], ['applied', 200, 'ultra', 'active']);
  // the webhook landing afterwards changes nothing; a second sync says the same
  await deliver(s.app, s.env, event('checkout.session.completed', { ...s.up.sessions.get(id) }, s.now), { at: s.now() });
  assert.deepEqual(await (await sync(s, { session_id: id })).json(), ACTIVE);
  // a complete checkout whose subscription is not paid yet (3-D Secure left half way): recorded as it is, no plan
  const h = track(setup());
  const hid = await paid(h, { sub: { status: 'incomplete' }, session: { payment_status: 'unpaid' } });
  const half = await (await sync(h, { session_id: hid })).json();
  assert.deepEqual([half.tier, half.status], ['none', 'incomplete']);
  assertClean(allLogs.flat(), body, half);
});

test('sync refusals: another account\'s session (403), not complete (409), a bad id or the other mode (400), unknown (404), Stripe down (502), a customer of another account (409)', async () => {
  const s = track(setup());
  const id = await paid(s);
  // another account with UID's session id: told nothing about it, nothing read beyond the session
  s.up.users[jwt(OTHER)] = { id: OTHER };
  let n = calls(s).length;
  const theirs = await sync(s, { session_id: id }, jwt(OTHER));
  assert.deepEqual(await code(theirs), [403, 'not_yours']);
  assert.deepEqual(calls(s).slice(n), [`GET /v1/checkout/sessions/${id}`]);
  assert.equal((await status(s, jwt(OTHER))).tier, 'none');
  assert.equal((await status(s)).tier, 'none', 'nor for the owner');
  // still open, expired, or not a subscription: nothing recorded, the subscription never read
  for (const change of [{ status: 'open' }, { status: 'expired' }, { mode: 'payment' }]) {
    const o = track(setup());
    const oid = await paid(o, { session: change });
    n = calls(o).length;
    const r = await sync(o, { session_id: oid });
    assert.deepEqual(await code(r), [409, 'checkout_not_complete'], JSON.stringify(change));
    assert.deepEqual(calls(o).slice(n), [`GET /v1/checkout/sessions/${oid}`]);
    assert.deepEqual(await status(o), NONE);
    assertClean(o.logs, await r.json());
  }
  // a cs_test_ session on this live key, or not a session id at all: 400 before Stripe is asked
  n = calls(s).length;
  for (const v of [`cs_test_A1${'x'.repeat(12)}`, 'cs_live_short', `pi_${'x'.repeat(20)}`, `cs_live_${'x'.repeat(12)}/../x`, 42, '', null]) {
    assert.deepEqual(await code(await sync(s, { session_id: v })), [400, 'invalid_session'], String(v));
  }
  assert.deepEqual(lines(s.logs).filter((l) => l.route === 'sync' && l.status === 'invalid').map((l) => l.err), ['mode_mismatch', ...Array(6).fill('session_id')]);
  assert.deepEqual(await code(await sync(s, {})), [400, 'invalid_session'], 'no session_id');
  for (const b of [{ session_id: id, plan: 'ultra' }, [id], id]) assert.deepEqual(await code(await sync(s, b)), [400, 'invalid_body'], JSON.stringify(b));
  assert.equal(calls(s).length, n);
  // unknown to Stripe: 404
  assert.deepEqual(await code(await sync(s, { session_id: `cs_live_Z${'x'.repeat(16)}` })), [404, 'session_not_found']);
  // Stripe not answering: 502
  s.up.fail = { path: /^\/v1\/checkout\/sessions\//, status: 500, error: { type: 'api_error' } };
  assert.deepEqual(await code(await sync(s, { session_id: id })), [502, 'billing_unavailable']);
  s.up.fail = { path: /^\/v1\/subscriptions\//, status: 500, error: { type: 'api_error' } };
  assert.deepEqual(await code(await sync(s, { session_id: id })), [502, 'billing_unavailable']);
  assert.deepEqual([lastLog(s, 'sync').status, lastLog(s, 'sync').err, lastLog(s, 'sync').stripe_http], ['stripe_error', 'api_error', 500]);
  s.up.fail = null;
  // its subscription's customer linked to another account: nothing recorded
  const c = track(setup());
  const cid = await paid(c);
  await db(c).link('cus_Elsewhere1', OTHER);
  c.up.subs.get('sub_Paid1').customer = 'cus_Elsewhere1';
  assert.deepEqual(await code(await sync(c, { session_id: cid })), [409, 'customer_conflict']);
  assert.deepEqual(await status(c), NONE);
  // no token, GET, billing off
  assert.deepEqual(await code(await sync(s, { session_id: id }, null)), [401, 'account_required']);
  assert.deepEqual(await code(await s.app.fetch(billingReq('/v1/billing/sync'), s.env)), [405, 'method_not_allowed']);
  assert.equal((await s.app.fetch(billingReq('/v1/billing/sync'), s.env)).headers.get('allow'), 'POST, OPTIONS');
  const off = track(setup({ env: billingEnv({ STRIPE_SECRET_KEY: '' }) }));
  assert.deepEqual(await code(await sync(off, { session_id: id })), [503, 'billing_not_configured']);
  assert.equal(off.up.calls.length, 0);
  assert.equal(PATHS.sync, '/v1/billing/sync');
  assertClean(allLogs.flat(), await theirs.json());
});

test('sync on the staging Worker (a test key): a cs_live_ id is refused (400); its own cs_test_ session is recorded', async () => {
  const { readConfig: readWithStaging } = await withStagingProject(STAGING_SUPABASE);
  const env = billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: STAGING_SUPABASE });
  const cfg = readWithStaging(env);
  assert.equal(cfg.billing.keyMode, 'test');
  const token = jwt(UID, { iss: `${STAGING_SUPABASE}/auth/v1` });
  const up = upstream({ users: { [token]: { id: UID } } });
  // the staging project, answered by the fake one
  const fetch = (u, i) => up.fetch(String(u).replace(STAGING_SUPABASE, SUPABASE), i);
  const logs = [];
  const billing = createBilling({ logger: createLogger((l) => logs.push(l)), now: clock(), fetch, ipKey: async () => 'ip' });
  const ask = (session_id) => billing.sync(billingReq('/v1/billing/sync', { body: { session_id }, token }), env, cfg, {});
  const live = await ask(`cs_live_A1${'x'.repeat(12)}`);
  assert.deepEqual(await code(live), [400, 'invalid_session']);
  assert.equal(up.stripe().length, 0);
  const id = `cs_test_A1${'x'.repeat(12)}`;
  up.subs.set('sub_Paid1', subscription({ id: 'sub_Paid1', customer: 'cus_Stage1', livemode: false }));
  up.sessions.set(id, { id, object: 'checkout.session', mode: 'subscription', status: 'complete', client_reference_id: UID, customer: 'cus_Stage1', subscription: 'sub_Paid1', livemode: false });
  const ok = await ask(id);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).tier, 'ultra');
  assertClean(logs);
});

test('sync shares the billing rate limit (BILLING_IP_LIMITER, else the isolate\'s 20 a minute)', async () => {
  const counted = allowAll();
  const s = track(setup({ env: billingEnv({ BILLING_IP_LIMITER: counted }) }));
  await status(s);
  await sync(s, { session_id: `cs_live_A1${'x'.repeat(12)}` });
  assert.equal(counted.calls, 2, 'the same binding as status');
  const d = track(setup({ env: billingEnv({ BILLING_IP_LIMITER: denyAll() }) }));
  const r = await sync(d, { session_id: `cs_live_A1${'x'.repeat(12)}` });
  assert.deepEqual(await code(r), [429, 'rate_limited']);
  assert.equal(r.headers.get('retry-after'), '60');
  assert.equal(d.up.calls.length, 0);
  // no binding: the in-memory window is the routes' together
  const m = track(setup({ env: billingEnv({ BILLING_IP_LIMITER: undefined }) }));
  for (let i = 0; i < 20; i++) assert.equal((await m.app.fetch(billingReq('/v1/billing/status'), m.env)).status, 200);
  assert.deepEqual(await code(await sync(m, { session_id: `cs_live_A1${'x'.repeat(12)}` })), [429, 'rate_limited']);
  assertClean(allLogs.flat());
});

// ------------------------------------------------------------ the portal --
test('portal intent "switch": straight to the plan change of the account\'s subscription; Stripe refusing the flow (400) opens the portal\'s home; no customer is 404', async () => {
  const s = track(setup());
  const portal = (body, o = {}) => s.app.fetch(billingReq('/v1/billing/portal', { body, ...o }), s.env);
  const portals = () => s.up.stripe().filter((c) => c.path === '/v1/billing_portal/sessions').map((c) => Object.fromEntries(c.form));
  const home = { customer: 'cus_Test123', return_url: `${APP}/?billing=portal` };
  const URL_ = 'https://billing.stripe.com/p/session/test_1';
  assert.deepEqual(await code(await portal({ intent: 'switch' })), [404, 'no_subscription']);
  await subscribe(s);
  const res = await portal({ intent: 'switch' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { url: URL_, flow: 'subscription_update' });
  assert.deepEqual(portals().at(-1), { ...home, 'flow_data[type]': 'subscription_update', 'flow_data[subscription_update][subscription]': 'sub_Test123' });
  // {} (and no body at all): the home, as before
  assert.deepEqual(await (await portal({})).json(), { url: URL_ });
  assert.deepEqual(await (await portal(undefined, { method: 'POST' })).json(), { url: URL_ });
  assert.deepEqual(portals().slice(-2), [home, home]);
  // the portal not letting customers switch plans: once more without flow_data, and the log says so
  s.up.portalFlows = false;
  const fb = await portal({ intent: 'switch' });
  assert.deepEqual(await fb.json(), { url: URL_, flow: 'portal' });
  assert.deepEqual(portals().slice(-2).map((f) => f['flow_data[type]'] ?? null), ['subscription_update', null]);
  const l = lastLog(s, 'portal');
  assert.deepEqual([l.status, l.http, l.err, l.stripe_http], ['switch_fallback', 200, 'invalid_request_error', 400]);
  // any other failure is not retried
  s.up.portalFlows = true;
  s.up.fail = { path: /^\/v1\/billing_portal\//, status: 500, error: { type: 'api_error' } };
  const n = portals().length;
  assert.deepEqual(await code(await portal({ intent: 'switch' })), [502, 'billing_unavailable']);
  assert.equal(portals().length, n + 1);
  s.up.fail = null;
  // bodies other than {} or { intent: 'switch' }
  for (const [b, want] of [[{ intent: 'cancel' }, 'invalid_intent'], [{ intent: 'switch', plan: 'ultra' }, 'invalid_body'], [[], 'invalid_body'], [null, 'invalid_body']]) {
    assert.deepEqual(await code(await portal(b)), [400, want], JSON.stringify(b));
  }
  assert.deepEqual(await code(await s.app.fetch(req('/v1/billing/portal', { raw: 'nope', headers: { authorization: `Bearer ${TOKEN}` } }), s.env)), [400, 'invalid_json']);
  // a subscription that has ended: no plan to change, the home opens
  s.now.advance(60000);
  s.up.subs.set('sub_Test123', subscription({ status: 'canceled' }));
  await deliver(s.app, s.env, event('customer.subscription.deleted', subscription({ status: 'canceled' }), s.now), { at: s.now() });
  assert.equal((await status(s)).status, 'canceled');
  assert.deepEqual(await (await portal({ intent: 'switch' })).json(), { url: URL_, flow: 'portal' });
  assert.deepEqual(portals().at(-1), home);
  assertClean(allLogs.flat());
});
