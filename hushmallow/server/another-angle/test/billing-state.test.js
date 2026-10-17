// Subscription state (src/billing/store.js, routes.js webhook/apply, stripe.js): the Stripe client's calls, the
// Billing Durable Object's ops, the events handled, the livemode gate, Stripe's 404s, diagnostics, which plan a
// price is, the past_due cap, cancellation dates, and an account with more than one subscription. Against the
// fakes in test/billing-fixtures.js; never live Stripe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clock } from './helpers.js';
import { createStripe, SUBSCRIPTION_LIST_LIMIT } from '../src/billing/stripe.js';
import { memoryBillingNamespace, billingClient, summarise } from '../src/billing/store.js';
import { readConfig, STRIPE_API_VERSION_EXPECTED } from '../src/config.js';
import { upstream, billingEnv, subscription, UID, OTHER, TEST_KEY } from './billing-fixtures.js';

// ---------------------------------------------------------- Stripe client --
test('Stripe client: customer create, price, subscriptions of a customer, checkout session read and expire; pinned version on each', async () => {
  for (const pin of [STRIPE_API_VERSION_EXPECTED, '']) {
    const up = upstream();
    const stripe = createStripe({ secretKey: TEST_KEY, apiVersion: pin, fetch: up.fetch });
    up.prices.set('price_BeyondMonthly1', { id: 'price_BeyondMonthly1', object: 'price', lookup_key: 'hushmallow.ultra.monthly' });
    up.subs.set('sub_A1', { id: 'sub_A1', customer: 'cus_Test123', status: 'active' });
    up.subs.set('sub_B2', { id: 'sub_B2', customer: 'cus_Other9', status: 'active' });
    up.sessions.set('cs_test_open1234567890', { id: 'cs_test_open1234567890', object: 'checkout.session', status: 'open' });

    const c = await stripe.createCustomer({ metadata: { user_id: UID } }, { idempotencyKey: `customer:${UID}` });
    assert.equal(c.ok, true);
    assert.match(c.ok ? c.data.id : '', /^cus_/);
    const p = await stripe.retrievePrice('price_BeyondMonthly1');
    assert.equal(p.ok && p.data.lookup_key, 'hushmallow.ultra.monthly');
    const l = await stripe.listSubscriptions('cus_Test123');
    assert.deepEqual(l.ok && l.data.data.map((s) => s.id), ['sub_A1']);
    const r = await stripe.retrieveCheckoutSession('cs_test_open1234567890');
    assert.equal(r.ok && r.data.status, 'open');
    const x = await stripe.expireCheckoutSession('cs_test_open1234567890');
    assert.equal(x.ok && x.data.status, 'expired');
    // a miss is Stripe's code, never its message
    assert.deepEqual(await stripe.retrievePrice('price_Nope1'), { ok: false, status: 404, code: 'resource_missing' });

    const calls = up.stripe();
    assert.deepEqual(calls.map((k) => `${k.method} ${k.path}`), [
      'POST /v1/customers', 'GET /v1/prices/price_BeyondMonthly1', 'GET /v1/subscriptions', 'GET /v1/checkout/sessions/cs_test_open1234567890',
      'POST /v1/checkout/sessions/cs_test_open1234567890/expire', 'GET /v1/prices/price_Nope1',
    ]);
    assert.equal(calls[0].form.get('metadata[user_id]'), UID);
    assert.equal(calls[0].headers['idempotency-key'], `customer:${UID}`);
    assert.deepEqual(Object.fromEntries(calls[2].query), { customer: 'cus_Test123', status: 'all', limit: String(SUBSCRIPTION_LIST_LIMIT) });
    assert.equal(SUBSCRIPTION_LIST_LIMIT, 20);
    for (const k of calls) {
      assert.equal(k.headers.authorization, `Bearer ${TEST_KEY}`);
      assert.equal(k.headers['stripe-version'], pin || undefined, `${pin || 'unpinned'}: ${k.path}`);
      if (k !== calls[0]) assert.equal(k.headers['idempotency-key'], undefined);
    }
  }
});

// ------------------------------------------------------- Durable Object --
test('Billing DO: the customer is set once per account; the last checkout is kept; sync applies through supersedes with no event id', async () => {
  const t = clock();
  const ns = memoryBillingNamespace({ now: t });
  const db = billingClient(ns);
  const prices = readConfig(billingEnv()).billing.prices;
  // one Stripe customer per account, set once (a second, different one is a conflict and changes nothing)
  assert.equal(await db.customerOf(UID), null);
  assert.deepEqual(await db.setCustomer(UID, 'cus_First1'), { ok: true, customer: 'cus_First1', conflict: false });
  assert.deepEqual(await db.setCustomer(UID, 'cus_First1'), { ok: true, customer: 'cus_First1', conflict: false }, 'idempotent');
  assert.deepEqual(await db.setCustomer(UID, 'cus_Second2'), { ok: true, customer: 'cus_First1', conflict: true });
  assert.equal(await db.customerOf(UID), 'cus_First1');
  assert.equal(await db.customerOf(OTHER), null, 'per account');
  // the last Checkout Session started: its id and when it expires (ms)
  assert.equal(await db.lastCheckout(UID), null);
  const exp = t() + 3600000;
  assert.deepEqual(await db.setCheckout(UID, { id: 'cs_test_a1b2c3d4e5f6g7', expires_at: exp }), { ok: true });
  assert.deepEqual(await db.setCheckout(UID, { id: 'cs_test_a1b2c3d4e5f6g7', expires_at: exp }), { ok: true }, 'idempotent');
  assert.deepEqual(await db.lastCheckout(UID), { id: 'cs_test_a1b2c3d4e5f6g7', expires_at: exp });
  await db.setCheckout(UID, { id: 'cs_live_z9y8x7w6v5u4t3', expires_at: exp + 1 });
  assert.deepEqual(await db.lastCheckout(UID), { id: 'cs_live_z9y8x7w6v5u4t3', expires_at: exp + 1 }, 'the newer one replaces it');
  // shapes are checked: never anything but a cus_ id, a cs_ id and a time in ms
  const raw = (op, body) => ns.get(ns.idFromName(`user:${UID}`)).fetch(`https://billing/${op}`, { method: 'POST', body: JSON.stringify(body) });
  for (const [op, body] of [
    ['set_customer', { customer: 'ana@example.com' }], ['set_customer', {}],
    ['set_checkout', { checkout: { id: 'pi_123456789012', expires_at: exp } }], ['set_checkout', { checkout: { id: 'cs_test_a1b2c3d4e5f6g7', expires_at: Math.floor(exp / 1000) } }],
    ['set_checkout', { checkout: { id: 'cs_test_a1b2c3d4e5f6g7', expires_at: exp, url: 'https://checkout.stripe.com/x' } }],
    ['sync', { record: { tier: 'ultra' } }],
  ]) assert.equal((await raw(op, body)).status, 400, `${op} ${JSON.stringify(body)}`);
  // sync: the same state machine as apply, without an event id (nothing is marked seen)
  const rec = (over = {}, asOf = t()) => ({ ...summarise(subscription(), prices, asOf), ...over });
  assert.deepEqual(await db.sync(UID, rec()), { ok: true, applied: true });
  assert.deepEqual(await db.sync(UID, rec({ status: 'canceled' }, t() - 1000)), { ok: true, applied: false }, 'an older read changes nothing');
  assert.equal((await db.get(UID)).status, 'active');
  t.advance(1000);
  assert.deepEqual(await db.sync(UID, rec({ status: 'past_due' })), { ok: true, applied: true });
  assert.deepEqual(await db.sync(UID, rec({ status: 'past_due' })), { ok: true, applied: true }, 'the same read again: the same record');
  assert.equal((await db.get(UID)).status, 'past_due');
  assert.deepEqual([...ns.instances.get(`user:${UID}`).map.keys()].filter((k) => k.startsWith('evt:')), []);
  // and an apply after a sync still dedupes by event id
  t.advance(1000);
  assert.deepEqual(await db.apply(UID, 'evt_S1', rec()), { ok: true, applied: true, duplicate: false });
  assert.deepEqual(await db.apply(UID, 'evt_S1', rec({ status: 'canceled' })), { ok: true, applied: false, duplicate: true });
});

test('Billing DO: the new ops stay atomic when calls race (one customer wins; the later read wins whatever the order)', async () => {
  const t = clock();
  const ns = memoryBillingNamespace({ now: t });
  const db = billingClient(ns);
  const prices = readConfig(billingEnv()).billing.prices;
  const tries = Array.from({ length: 8 }, (_, i) => `cus_Race${i}abc`);
  const answers = await Promise.all(tries.map((c) => db.setCustomer(UID, c)));
  const winner = await db.customerOf(UID);
  assert.ok(tries.includes(winner));
  assert.deepEqual(answers.map((a) => a.customer), tries.map(() => winner), 'every caller is told the same customer');
  assert.equal(answers.filter((a) => !a.conflict).length, 1, 'exactly one set it');
  // syncs and applies of one subscription, sent at once in any order: the latest as_of is kept
  const reads = [0, 3, 1, 4, 2].map((n) => ({ ...summarise(subscription({ status: n === 4 ? 'canceled' : 'active' }), prices, t() + n * 1000) }));
  await Promise.all(reads.map((r, i) => (i % 2 ? db.sync(UID, r) : db.apply(UID, `evt_Race${i}`, r))));
  const kept = await db.get(UID);
  assert.deepEqual([kept.status, kept.as_of], ['canceled', t() + 4000]);
});
