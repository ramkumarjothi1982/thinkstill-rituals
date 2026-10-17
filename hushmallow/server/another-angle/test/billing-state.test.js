// Subscription state (src/billing/store.js, routes.js webhook/apply, stripe.js): the Stripe client's calls, the
// Billing Durable Object's ops, the events handled, the livemode gate, Stripe's 404s, diagnostics, which plan a
// price is, the past_due cap, cancellation dates, and an account with more than one subscription. Against the
// fakes in test/billing-fixtures.js; never live Stripe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clock, CLOCK_START } from './helpers.js';
import { createStripe, signWebhookPayload, SUBSCRIPTION_LIST_LIMIT } from '../src/billing/stripe.js';
import { memoryBillingNamespace, billingClient, summarise, planForPrice, priceMismatch } from '../src/billing/store.js';
import { createBilling, EVENTS } from '../src/billing/routes.js';
import { readConfig, STRIPE_API_VERSION_EXPECTED } from '../src/config.js';
import { createLogger } from '../src/log.js';
import {
  upstream, billingEnv, subscription, setup, event, deliver, subscribe, status, lines, jwt, assertClean, withStagingProject,
  UID, OTHER, TEST_KEY, WHSEC, DAY, STAGING_SUPABASE, PRICES,
} from './billing-fixtures.js';

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

// ------------------------------------------------------ recordSubscription --
/** createBilling on its own (the routes' internals), with a logger into `logs`. */
function billingOf({ up = upstream(), now = clock(), env = billingEnv() } = {}) {
  const logs = [];
  const billing = createBilling({ logger: createLogger((l) => logs.push(l)), now, fetch: up.fetch, ipKey: async () => 'ip' });
  return { billing, logs, up, now, env, cfg: readConfig(env), db: billingClient(env.BILLING) };
}

/** A signed webhook Request for the event, as Stripe sends it (for createBilling's webhook with a cfg of its own). */
async function signed(ev, now) {
  const payload = JSON.stringify(ev);
  return new Request('https://angle.example.workers.dev/v1/billing/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': await signWebhookPayload(payload, WHSEC, Math.floor(now() / 1000)) }, body: payload,
  });
}

test('recordSubscription (the webhook\'s apply, and the return sync with no event id): reads, links, records', async () => {
  const b = billingOf();
  b.up.subs.set('sub_Test123', subscription());
  const args = { subId: 'sub_Test123', uidHint: UID, obj: {}, eventType: 'checkout.session.completed', created: Math.floor(b.now() / 1000), eventId: null };
  assert.deepEqual(await b.billing.recordSubscription(args, b.env, b.cfg), { http: 200, outcome: 'applied', tier: 'ultra', subStatus: 'active', duplicate: false });
  assert.equal((await b.db.get(UID)).tier, 'ultra');
  assert.equal(await b.db.owner('cus_Test123'), UID, 'the customer is linked to the account');
  assert.deepEqual([...b.env.BILLING.instances.get(`user:${UID}`).map.keys()].filter((k) => k.startsWith('evt:')), [], 'no event id kept');
  assert.deepEqual(b.up.stripe().map((c) => c.path), ['/v1/subscriptions/sub_Test123'], 'it read the subscription itself');
  // with an event id: applied once, then a duplicate
  b.now.advance(1000);
  const once = await b.billing.recordSubscription({ ...args, eventId: 'evt_R1' }, b.env, b.cfg);
  assert.equal(once.outcome, 'applied');
  assert.equal((await b.billing.recordSubscription({ ...args, eventId: 'evt_R1' }, b.env, b.cfg)).outcome, 'duplicate');
  // a customer already linked to another account: nothing recorded for this one
  const c = billingOf();
  c.up.subs.set('sub_Test123', subscription());
  await c.db.link('cus_Test123', OTHER);
  assert.deepEqual(await c.billing.recordSubscription(args, c.env, c.cfg), { http: 200, outcome: 'customer_conflict' });
  assert.equal(await c.db.get(UID), null);
  assertClean([...b.logs, ...c.logs]);
});

// ------------------------------------------------------------------ events --
const ELEVEN = [
  'checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.paused', 'customer.subscription.resumed',
  'invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required',
];
/** The object each kind of event carries, naming sub_Test123 for UID. */
function objectFor(type, over = {}) {
  if (type.startsWith('checkout.session.')) return { id: 'cs_test_a1', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', status: 'complete', client_reference_id: UID, customer: 'cus_Test123', subscription: 'sub_Test123', ...over };
  if (type.startsWith('invoice.')) return { id: 'in_1', object: 'invoice', customer: 'cus_Test123', parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_Test123', metadata: { user_id: UID } } }, ...over };
  return subscription(over);
}

test('events: the eleven, each routed by its prefix, each re-reading and recording the subscription', async () => {
  assert.deepEqual([...EVENTS], ELEVEN);
  for (const type of ELEVEN) {
    const s = setup();
    s.up.subs.set('sub_Test123', subscription());
    const res = await deliver(s.app, s.env, event(type, objectFor(type), s.now), { at: s.now() });
    assert.equal(res.status, 200, type);
    assert.deepEqual(s.up.stripe().map((c) => `${c.method} ${c.path}`), ['GET /v1/subscriptions/sub_Test123'], `${type}: read back from Stripe`);
    assert.equal((await status(s)).tier, 'ultra', type);
    assert.ok(lines(s.logs).some((l) => l.stripe_event === type && l.status === 'applied'), type);
    assertClean(s.logs);
  }
  // a checkout that is not a subscription (any of the three): acknowledged, Stripe never asked
  for (const type of ELEVEN.slice(0, 3)) {
    const s = setup();
    assert.equal((await deliver(s.app, s.env, event(type, objectFor(type, { mode: 'payment', subscription: null }), s.now), { at: s.now() })).status, 200);
    assert.equal(s.up.stripe().length, 0, type);
    assert.equal(s.env.BILLING.instances.get(`user:${UID}`)?.map.size ?? 0, 0, `${type}: nothing recorded`);
  }
});

test('invoice.paid in both shapes keeps a renewal that lost its subscription event (the period end moves on)', async () => {
  for (const shape of ['parent', 'flat']) {
    const s = setup();
    const long = jwt(UID, { exp: (CLOCK_START + 60 * DAY) / 1000 });
    s.up.users[long] = { id: UID };
    await subscribe(s, subscription({}, { end: (CLOCK_START + 30 * DAY) / 1000 }));
    // the renewal: Stripe moved the period on; the customer.subscription.updated for it never arrived
    s.now.advance(30 * DAY);
    s.up.subs.set('sub_Test123', subscription({ metadata: {} }, { end: (CLOCK_START + 60 * DAY) / 1000 }));
    const inv = shape === 'parent'
      ? { id: 'in_2', object: 'invoice', customer: 'cus_Test123', parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_Test123', metadata: { user_id: UID } } } }
      : { id: 'in_2', object: 'invoice', customer: 'cus_Test123', subscription: 'sub_Test123', subscription_details: { metadata: { user_id: UID } } };
    assert.equal((await deliver(s.app, s.env, event('invoice.paid', inv, s.now), { at: s.now() })).status, 200, shape);
    s.now.advance(2 * DAY);   // past the old period end and its day of grace
    const st = await status(s, long);
    assert.deepEqual([st.tier, st.current_period_end], ['ultra', new Date(CLOCK_START + 60 * DAY).toISOString()], shape);
  }
});

test('delayed payments: access follows the re-read subscription, never the checkout session', async () => {
  const s = setup();
  // completed but unpaid (a delayed method): the subscription is incomplete, so no plan yet
  s.up.subs.set('sub_Test123', subscription({ status: 'incomplete' }));
  await deliver(s.app, s.env, event('checkout.session.completed', objectFor('checkout.session.completed', { payment_status: 'unpaid' }), s.now), { at: s.now() });
  assert.deepEqual([(await status(s)).tier, (await status(s)).status], ['none', 'incomplete']);
  // the payment clears: active
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', subscription());
  await deliver(s.app, s.env, event('checkout.session.async_payment_succeeded', objectFor('checkout.session.async_payment_succeeded'), s.now), { at: s.now() });
  assert.equal((await status(s)).tier, 'ultra');
  // another account's delayed payment fails: its subscription never activates
  const f = setup();
  f.up.subs.set('sub_Test123', subscription({ status: 'incomplete' }));
  await deliver(f.app, f.env, event('checkout.session.completed', objectFor('checkout.session.completed', { payment_status: 'unpaid' }), f.now), { at: f.now() });
  f.now.advance(1000);
  f.up.subs.set('sub_Test123', subscription({ status: 'incomplete_expired' }));
  await deliver(f.app, f.env, event('checkout.session.async_payment_failed', objectFor('checkout.session.async_payment_failed', { payment_status: 'unpaid' }), f.now), { at: f.now() });
  assert.deepEqual([(await status(f)).tier, (await status(f)).status], ['none', 'incomplete_expired']);
  assertClean([...s.logs, ...f.logs]);
});

// ---------------------------------------------------------- livemode gate --
test('livemode gate: an event of the other mode gets 200 mode_mismatch before any Stripe call, and gives nothing', async () => {
  const s = setup();   // the production fixture: a live key
  s.up.subs.set('sub_Test123', subscription());
  for (const livemode of [false, undefined, 'true']) {
    const ev = event('checkout.session.completed', objectFor('checkout.session.completed'), s.now);
    if (livemode === undefined) delete ev.livemode; else ev.livemode = livemode;
    const res = await deliver(s.app, s.env, ev, { at: s.now() });
    assert.equal(res.status, 200, String(livemode));
    assert.deepEqual(await res.json(), { received: true });
  }
  assert.equal(s.up.calls.length, 0, 'Stripe never asked');
  assert.equal((await status(s)).tier, 'none');
  assert.equal(lines(s.logs).filter((l) => l.status === 'mode_mismatch' && l.stripe_event === 'checkout.session.completed').length, 3);
  // the same event in live mode: recorded
  await deliver(s.app, s.env, event('checkout.session.completed', objectFor('checkout.session.completed'), s.now), { at: s.now() });
  assert.equal((await status(s)).tier, 'ultra');
  // the staging Worker (a test key): a live event is the mismatch
  const { readConfig: readWithStaging } = await withStagingProject(STAGING_SUPABASE);
  const env = billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: STAGING_SUPABASE });
  const cfg = readWithStaging(env);
  assert.equal(cfg.billing.keyMode, 'test');
  const b = billingOf({ env });
  b.up.subs.set('sub_Test123', subscription({ livemode: false }));
  const hook = async (ev) => b.billing.webhook(await signed(ev, b.now), env, cfg);
  assert.equal((await hook(event('customer.subscription.updated', subscription(), b.now, { livemode: true }))).status, 200);
  assert.equal(b.up.calls.length, 0);
  assert.equal((await hook(event('customer.subscription.updated', subscription(), b.now, { livemode: false }))).status, 200);
  assert.equal((await b.db.get(UID)).tier, 'ultra', 'a test event on the test key is applied');
  // while billing is off, the gate waits: 503, so a live event is never dropped during a misconfiguration
  const off = setup({ env: billingEnv({ BILLING_LIVE: undefined }) });
  assert.equal((await deliver(off.app, off.env, event('customer.subscription.updated', subscription(), off.now), { at: off.now() })).status, 503);
  assertClean([...s.logs, ...b.logs, ...off.logs]);
});

// ------------------------------------------------------------- Stripe 404 --
test('a 404 from Stripe: the event\'s own copy may only take access away, never give it', async () => {
  // never seen, and Stripe has no such subscription: an active copy grants nothing
  const s = setup();
  const fresh = await deliver(s.app, s.env, event('customer.subscription.created', subscription(), s.now), { at: s.now() });
  assert.equal(fresh.status, 200);
  assert.equal((await status(s)).tier, 'none');
  assert.equal(s.env.BILLING.instances.get(`user:${UID}`)?.map.size ?? 0, 0, 'nothing recorded');
  assert.ok(lines(s.logs).some((l) => l.status === 'not_found'));
  // an active account: a newer active copy changes nothing; a newer canceled copy ends it
  await subscribe(s);
  s.up.subs.delete('sub_Test123');
  s.now.advance(60000);
  await deliver(s.app, s.env, event('customer.subscription.updated', subscription({ cancel_at_period_end: true }), s.now), { at: s.now() });
  assert.equal((await status(s)).cancel_at_period_end, false, 'the active copy was not applied');
  s.now.advance(60000);
  await deliver(s.app, s.env, event('customer.subscription.deleted', subscription({ status: 'canceled' }), s.now), { at: s.now() });
  assert.deepEqual([(await status(s)).tier, (await status(s)).status], ['none', 'canceled']);
  // a checkout or invoice event whose subscription Stripe does not have: nothing
  const c = setup();
  for (const type of ['checkout.session.completed', 'invoice.paid']) {
    assert.equal((await deliver(c.app, c.env, event(type, objectFor(type), c.now), { at: c.now() })).status, 200);
  }
  assert.equal((await status(c)).tier, 'none');
  assertClean([...s.logs, ...c.logs]);
});

// ------------------------------------------------------------ diagnostics --
test('diagnostics: a Stripe refusal is logged with its code and HTTP status (502, so Stripe retries); early refusals say why', async () => {
  const s = setup();
  // a restricted key without Subscriptions read: Stripe answers 403 (its message names the key and the account)
  s.up.fail = { path: /^\/v1\/subscriptions\//, status: 403, error: { type: 'invalid_request_error', message: "The provided key 'rk_live_…' does not have the required permissions for this endpoint on account 'acct_1A'." } };
  const r = await deliver(s.app, s.env, event('customer.subscription.updated', subscription(), s.now), { at: s.now() });
  assert.equal(r.status, 502);
  let line = lines(s.logs).find((l) => l.status === 'stripe_error');
  assert.deepEqual([line.http, line.err, line.stripe_http, line.stripe_event], [502, 'invalid_request_error', 403, 'customer.subscription.updated']);
  // Stripe unreachable: status 0, err network
  s.up.fail = null;
  const down = { ...s.up, fetch: async () => { throw new TypeError('offline'); } };
  const d = setup({ up: down });
  assert.equal((await deliver(d.app, d.env, event('invoice.paid', objectFor('invoice.paid'), d.now), { at: d.now() })).status, 502);
  line = lines(d.logs).find((l) => l.status === 'stripe_error');
  assert.deepEqual([line.err, line.stripe_http], ['network', 0]);
  // the early refusals, each logged with its code (before: nothing at all)
  const e = setup();
  const post = (body, headers = {}) => e.app.fetch(new Request('https://angle.example.workers.dev/v1/billing/webhook', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body }), e.env);
  assert.equal((await post('{}', { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post('{}', { 'content-length': String(300000) })).status, 413);
  assert.equal((await deliver(e.app, e.env, null, { raw: 'not json', at: e.now() })).status, 400);
  assert.equal((await deliver(e.app, e.env, null, { raw: JSON.stringify({ type: 'invoice.paid' }), at: e.now() })).status, 400);
  assert.deepEqual(lines(e.logs).map((l) => [l.route, l.status, l.http, l.err]), [
    ['webhook', 'invalid', 415, 'unsupported_media_type'], ['webhook', 'invalid', 413, 'too_large'],
    ['webhook', 'invalid', 400, 'invalid_json'], ['webhook', 'invalid', 400, 'invalid_event'],
  ]);
  assertClean([...s.logs, ...d.logs, ...e.logs]);
});

// ------------------------------------------------------- which plan a price is --
test('the lookup key decides the plan; a configured id that disagrees with it is logged as price_mismatch', async () => {
  const prices = readConfig(billingEnv()).billing.prices;
  assert.deepEqual(planForPrice('price_Anything1', 'hushmallow.ultra.yearly', prices), { plan: 'ultra', period: 'yearly' });
  assert.deepEqual(planForPrice(PRICES.paidMonthly, 'hushmallow.ultra.monthly', prices), { plan: 'ultra', period: 'monthly' }, 'the key wins over the slot');
  assert.deepEqual(planForPrice(PRICES.paidMonthly, null, prices), { plan: 'paid', period: 'monthly' }, 'no lookup key: the configured slot');
  assert.deepEqual(planForPrice(PRICES.paidMonthly, '', prices), { plan: 'paid', period: 'monthly' });
  assert.equal(planForPrice(PRICES.paidMonthly, 'flow_monthly_v1', prices), null, 'a lookup key that is not the app\'s: no plan');
  assert.equal(priceMismatch(PRICES.paidMonthly, 'hushmallow.ultra.monthly', prices), true);
  assert.equal(priceMismatch(PRICES.paidMonthly, 'flow_monthly_v1', prices), true);
  assert.equal(priceMismatch(PRICES.paidMonthly, 'hushmallow.paid.monthly', prices), false);
  assert.equal(priceMismatch(PRICES.paidMonthly, null, prices), false);
  assert.equal(priceMismatch('price_Replaced9', 'hushmallow.ultra.monthly', prices), false, 'a price replaced later is no mismatch');
  // Beyond monthly's id pasted into Flow monthly's slot: the subscriber has Beyond, and the log says the slot is wrong
  const s = setup({ env: billingEnv({ STRIPE_PRICE_PAID_MONTHLY: PRICES.ultraMonthly, STRIPE_PRICE_ULTRA_MONTHLY: '' }) });
  await subscribe(s, subscription({}, { price: PRICES.ultraMonthly, lookup: 'hushmallow.ultra.monthly' }));
  assert.equal((await status(s)).tier, 'ultra');
  const m = lines(s.logs).find((l) => l.status === 'price_mismatch');
  assert.ok(m, 'logged');
  assert.deepEqual([m.route, m.tier, m.period, m.stripe_event], ['webhook', 'ultra', 'monthly', 'checkout.session.completed']);
  // matching: no such line
  const ok = setup();
  await subscribe(ok, subscription({}, { price: PRICES.ultraMonthly, lookup: 'hushmallow.ultra.monthly' }));
  assert.equal(lines(ok.logs).some((l) => l.status === 'price_mismatch'), false);
  assertClean([...s.logs, ...ok.logs]);
});
