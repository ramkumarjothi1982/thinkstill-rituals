// Subscription state (src/billing/store.js, routes.js webhook/apply, stripe.js): the Stripe client's calls, the
// Billing Durable Object's ops, the events handled, the livemode gate, Stripe's 404s, diagnostics, which plan a
// price is, the past_due cap, cancellation dates, and an account with more than one subscription. Against the
// fakes in test/billing-fixtures.js; never live Stripe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStripe, SUBSCRIPTION_LIST_LIMIT } from '../src/billing/stripe.js';
import { STRIPE_API_VERSION_EXPECTED } from '../src/config.js';
import { upstream, UID, TEST_KEY } from './billing-fixtures.js';

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
