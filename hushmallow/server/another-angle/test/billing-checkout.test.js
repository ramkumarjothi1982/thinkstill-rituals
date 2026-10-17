// Checkout (src/billing/routes.js), against the fake Stripe of test/billing-fixtures.js: the price check before
// selling.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { req, denyAll, allowAll, clock, ORIGIN, CLOCK_START } from './helpers.js';
import { CHECKOUT_PRICE_RULES, CHECKOUT_PRICE_CACHE_MS, priceFault } from '../src/billing/routes.js';
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
