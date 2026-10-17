// The upgrade without the portal's home (the owner's request of 2026-10-17), against the fake Stripe of
// test/billing-fixtures.js: POST /v1/billing/portal { intent: 'upgrade', plan, period } (Stripe's
// subscription_update_confirm flow, back to ?billing=changed&to=… once done and ?billing=unchanged if left, checked on
// Stripe's own copy of the subscription first), POST /v1/billing/sync {} | { refresh: true } (the record read from
// Stripe again, so the app confirms a change without waiting for the webhook), the status body's period, and
// formEncode's bracket form for both flows. The scenarios the sandbox cannot be reached for from here: Flow → Beyond
// monthly, monthly → yearly, back-navigation (left unfinished), a failed upgrade payment, repeat taps and reloads,
// the webhook late, and cancelling from Manage subscription afterwards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { req, denyAll, allowAll, clock, ORIGIN, CLOCK_START } from './helpers.js';
import { createBilling, planChange, priceFault, PORTAL_RETURN, CHANGEABLE, CHECKOUT_PRICE_RULES } from '../src/billing/routes.js';
import { formEncode } from '../src/billing/stripe.js';
import { createLogger } from '../src/log.js';
import {
  upstream, billingEnv, subscription, setup, billingReq, subscribe, status, lines, jwt, assertClean, withStagingProject, price, event, deliver,
  UID, OTHER, TOKEN, PRICES, APP, DAY, SUPABASE, STAGING_SUPABASE, STAGING_APP,
} from './billing-fixtures.js';

const code = async (res) => [res.status, (await res.clone().json()).error?.code ?? null];
const URL_ = 'https://billing.stripe.com/p/session/test_1';
const SLOT = { 'paid.monthly': PRICES.paidMonthly, 'paid.yearly': PRICES.paidYearly, 'ultra.monthly': PRICES.ultraMonthly, 'ultra.yearly': PRICES.ultraYearly };
const SLOTS = Object.keys(SLOT);
const allLogs = [];
const track = (s) => { allLogs.push(s.logs); return s; };
const lastLog = (s, route) => lines(s.logs).filter((l) => l.route === route).at(-1);
const portal = (s, body, token) => s.app.fetch(billingReq('/v1/billing/portal', { body, token }), s.env);
const upgrade = (s, to, token) => { const [plan, period] = to.split('.'); return portal(s, { intent: 'upgrade', plan, period }, token); };
const refresh = (s, body = { refresh: true }, token) => s.app.fetch(billingReq('/v1/billing/sync', { body, token }), s.env);
const portals = (s) => s.up.stripe().filter((c) => c.path === '/v1/billing_portal/sessions').map((c) => Object.fromEntries(c.form));
const calls = (s) => s.up.stripe().map((c) => `${c.method} ${c.path}`);
/** A subscription on the plan `slot` ('paid.monthly'…), one item with a Stripe-shaped id, as Stripe returns it. */
const on = (slot, over = {}, end = (CLOCK_START + 30 * DAY) / 1000) => subscription({
  items: { object: 'list', has_more: false, data: [{ id: 'si_Item1234', object: 'subscription_item', quantity: 1, price: { id: SLOT[slot], lookup_key: null }, current_period_end: end }] },
  pending_update: null, schedule: null, ...over,
});
/** An account on `slot`, recorded by the webhook. */
async function account(slot = 'paid.monthly', o = {}) {
  const s = track(setup(o));
  await subscribe(s, on(slot));
  assert.equal((await status(s)).tier, slot.split('.')[0]);
  return s;
}
/** The customer confirms in the portal: Stripe changes the item's price (and, for a longer period, the period end). */
function confirmAtStripe(s, slot, over = {}) {
  const end = (s.now() + (slot.endsWith('yearly') ? 365 : 30) * DAY) / 1000;
  s.up.subs.set('sub_Test123', on(slot, over, end));
}
/** The confirm flow's form, exactly as Stripe receives it, for the account's sub_Test123 and its item. */
const confirmForm = (to, origin = APP) => ({
  customer: 'cus_Test123', return_url: `${origin}/?billing=unchanged`,
  'flow_data[type]': 'subscription_update_confirm',
  'flow_data[subscription_update_confirm][subscription]': 'sub_Test123',
  'flow_data[subscription_update_confirm][items][0][id]': 'si_Item1234',
  'flow_data[subscription_update_confirm][items][0][price]': SLOT[to],
  'flow_data[subscription_update_confirm][items][0][quantity]': '1',
  'flow_data[after_completion][type]': 'redirect',
  'flow_data[after_completion][redirect][return_url]': `${origin}/?billing=changed&to=${to}`,
});

// ------------------------------------------------------------ the form --
test('formEncode: Stripe\'s bracket form for both flows, exactly (nested objects as [key], arrays as [0], values percent-encoded, nothing missing or added)', () => {
  const confirm = {
    customer: 'cus_Test123', return_url: `${APP}/?billing=unchanged`,
    flow_data: {
      type: 'subscription_update_confirm',
      subscription_update_confirm: { subscription: 'sub_Test123', items: [{ id: 'si_Item1234', price: PRICES.ultraYearly, quantity: 1 }] },
      after_completion: { type: 'redirect', redirect: { return_url: `${APP}/?billing=changed&to=ultra.yearly` } },
    },
  };
  const body = formEncode(confirm);
  // the wire form: every key and value percent-encoded (brackets too, as strict form encoding has them; Stripe decodes
  // both), pairs joined by &, in the order given
  assert.equal(body, [
    'customer=cus_Test123',
    `return_url=${encodeURIComponent(`${APP}/?billing=unchanged`)}`,
    'flow_data%5Btype%5D=subscription_update_confirm',
    'flow_data%5Bsubscription_update_confirm%5D%5Bsubscription%5D=sub_Test123',
    'flow_data%5Bsubscription_update_confirm%5D%5Bitems%5D%5B0%5D%5Bid%5D=si_Item1234',
    `flow_data%5Bsubscription_update_confirm%5D%5Bitems%5D%5B0%5D%5Bprice%5D=${PRICES.ultraYearly}`,
    'flow_data%5Bsubscription_update_confirm%5D%5Bitems%5D%5B0%5D%5Bquantity%5D=1',
    'flow_data%5Bafter_completion%5D%5Btype%5D=redirect',
    'flow_data%5Bafter_completion%5D%5Bredirect%5D%5Breturn_url%5D=https%3A%2F%2Fapp.hushmallow.com%2F%3Fbilling%3Dchanged%26to%3Dultra.yearly',
  ].join('&'));
  // decoded as Stripe decodes a form: the bracket names, the & and = inside the return URL kept in the value
  assert.deepEqual([...new URLSearchParams(body)], Object.entries(confirmForm('ultra.yearly')));
  const sw = formEncode({
    customer: 'cus_Test123', return_url: `${APP}/?billing=unchanged`,
    flow_data: { type: 'subscription_update', subscription_update: { subscription: 'sub_Test123' }, after_completion: { type: 'redirect', redirect: { return_url: `${APP}/?billing=changed` } } },
  });
  assert.deepEqual([...new URLSearchParams(sw)], [
    ['customer', 'cus_Test123'], ['return_url', `${APP}/?billing=unchanged`], ['flow_data[type]', 'subscription_update'],
    ['flow_data[subscription_update][subscription]', 'sub_Test123'], ['flow_data[after_completion][type]', 'redirect'],
    ['flow_data[after_completion][redirect][return_url]', `${APP}/?billing=changed`],
  ]);
  // several items, booleans, numbers; undefined and null left out (never "undefined" or "null" sent)
  assert.deepEqual([...new URLSearchParams(formEncode({ a: [{ id: 'x', q: 2 }, { id: 'y', on: false }], b: undefined, c: null, d: { e: undefined, f: true } }))],
    [['a[0][id]', 'x'], ['a[0][q]', '2'], ['a[1][id]', 'y'], ['a[1][on]', 'false'], ['d[f]', 'true']]);
});

// ------------------------------------------------------ the upgrade rule --
test('the upgrade rule: a higher tier with the same or a longer period, or the same tier monthly → yearly; never one up and one down, never a downgrade', () => {
  const want = {
    'paid.monthly': { 'paid.monthly': 'same', 'paid.yearly': 'upgrade', 'ultra.monthly': 'upgrade', 'ultra.yearly': 'upgrade' },
    'paid.yearly': { 'paid.monthly': 'not_an_upgrade', 'paid.yearly': 'same', 'ultra.monthly': 'not_an_upgrade', 'ultra.yearly': 'upgrade' },
    'ultra.monthly': { 'paid.monthly': 'not_an_upgrade', 'paid.yearly': 'not_an_upgrade', 'ultra.monthly': 'same', 'ultra.yearly': 'upgrade' },
    'ultra.yearly': { 'paid.monthly': 'not_an_upgrade', 'paid.yearly': 'not_an_upgrade', 'ultra.monthly': 'not_an_upgrade', 'ultra.yearly': 'same' },
  };
  const of = (k) => { const [plan, period] = k.split('.'); return { plan, period }; };
  for (const from of SLOTS) for (const to of SLOTS) assert.equal(planChange(of(from), of(to)), want[from][to], `${from} → ${to}`);
  assert.deepEqual([...CHANGEABLE], ['active', 'trialing']);
  assert.deepEqual({ ...PORTAL_RETURN }, { home: '/?billing=portal', changed: '/?billing=changed', unchanged: '/?billing=unchanged' });
});

test('the upgrade rule, through the route: every pair of the four plans; an upgrade opens the confirm flow, anything else is 409 with no portal session', async () => {
  for (const from of SLOTS) {
    for (const to of SLOTS) {
      const s = await account(from);
      const n = portals(s).length;
      const res = await upgrade(s, to);
      const [plan, period] = from.split('.');
      const [tPlan, tPeriod] = to.split('.');
      const rule = planChange({ plan, period }, { plan: tPlan, period: tPeriod });
      if (rule === 'upgrade') {
        assert.equal(res.status, 200, `${from} → ${to}`);
        assert.deepEqual(await res.json(), { url: URL_, flow: 'subscription_update_confirm', to });
        assert.deepEqual(portals(s).slice(n), [confirmForm(to)], `${from} → ${to}`);
      } else {
        assert.deepEqual(await code(res), [409, rule === 'same' ? 'already_on_plan' : 'not_an_upgrade'], `${from} → ${to}`);
        assert.equal(portals(s).length, n, `${from} → ${to}: no portal session`);
        assert.equal(lastLog(s, 'portal').err, from);
      }
    }
  }
  // the disallowed cross case, named: Flow yearly → Beyond monthly (one up, one down)
  const x = await account('paid.yearly');
  assert.deepEqual(await code(await upgrade(x, 'ultra.monthly')), [409, 'not_an_upgrade']);
  assert.deepEqual(portals(x), []);
  assertClean(allLogs.flat());
});

// ------------------------------------------------------- the scenarios --
test('Flow → Beyond monthly: the confirm flow, then nothing changes until Stripe has; refresh records it at once; the webhook later and a reload change nothing; a repeat tap is already_on_plan', async () => {
  const s = await account('paid.monthly');
  const before = await status(s);
  assert.deepEqual([before.tier, before.period, before.status], ['paid', 'monthly', 'active']);
  const n = s.up.stripe().length;
  const res = await upgrade(s, 'ultra.monthly');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  const body = await res.json();
  assert.deepEqual(body, { url: URL_, flow: 'subscription_update_confirm', to: 'ultra.monthly' });
  // Stripe's own copy of the subscription, the target price as checkout reads it, then the session: in that order
  assert.deepEqual(calls(s).slice(n), ['GET /v1/subscriptions/sub_Test123', `GET /v1/prices/${PRICES.ultraMonthly}`, 'POST /v1/billing_portal/sessions']);
  assert.deepEqual(s.up.stripe().at(-2).query.getAll('expand[]'), ['currency_options'], 'read as checkout reads it');
  assert.deepEqual(portals(s).at(-1), confirmForm('ultra.monthly'));
  const l = lastLog(s, 'portal');
  assert.deepEqual([l.status, l.http, l.intent, l.plan, l.period], ['ok', 200, 'upgrade', 'ultra', 'monthly']);
  // opening the flow is not the upgrade: the record, and so the plan, is what it was
  assert.deepEqual(await status(s), before);
  // a second tap (two tabs, a reload of the plans page): another session, still nothing changed
  assert.equal((await upgrade(s, 'ultra.monthly')).status, 200);
  assert.equal(portals(s).length, 2);
  assert.deepEqual(await status(s), before);
  // back on ?billing=changed&to=ultra.monthly before Stripe has the change (it never says so by itself): refresh is Flow
  s.now.advance(1000);
  assert.deepEqual(await (await refresh(s)).json(), before);
  // the customer confirmed: Stripe has the new price; refresh reads it and records it (no webhook yet)
  s.now.advance(1000);
  confirmAtStripe(s, 'ultra.monthly');
  const m = s.up.stripe().length;
  const r = await refresh(s);
  assert.equal(r.status, 200);
  const after = await r.json();
  assert.deepEqual([after.tier, after.period, after.status, after.cancel_at_period_end, after.manageable], ['ultra', 'monthly', 'active', false, true]);
  assert.deepEqual(calls(s).slice(m), ['GET /v1/subscriptions/sub_Test123'], 'only the subscription is read');
  assert.deepEqual(await status(s), after);
  const rl = lastLog(s, 'sync');
  assert.deepEqual([rl.status, rl.http, rl.intent, rl.tier, rl.period, rl.sub_status], ['applied', 200, 'refresh', 'ultra', 'monthly', 'active']);
  assert.deepEqual([...s.env.BILLING.instances.get(`user:${UID}`).map.keys()].filter((k) => k.startsWith('evt:')).length, 1, 'only the checkout\'s event id: refresh keeps none');
  // the reload of the return page: the same answer again
  s.now.advance(1000);
  assert.deepEqual(await (await refresh(s, {})).json(), after);
  // the webhook arriving afterwards (its object the old state, as a late delivery can be): Stripe is read, nothing goes back
  s.now.advance(1000);
  const late = await deliver(s.app, s.env, event('customer.subscription.updated', on('paid.monthly'), s.now), { at: s.now() });
  assert.equal(late.status, 200);
  assert.deepEqual(await status(s), after);
  // a repeat tap on the old button: already there, no session
  const k = portals(s).length;
  assert.deepEqual(await code(await upgrade(s, 'ultra.monthly')), [409, 'already_on_plan']);
  assert.equal(portals(s).length, k);
  // (the answer's url is Stripe's page: it goes to the app, never to a log)
  assertClean(allLogs.flat(), after);
});

test('monthly → yearly: Flow, Beyond, and Flow monthly → Beyond yearly; the status body\'s period says yearly once Stripe does, with the year\'s period end', async () => {
  for (const [from, to] of [['paid.monthly', 'paid.yearly'], ['ultra.monthly', 'ultra.yearly'], ['paid.monthly', 'ultra.yearly'], ['paid.yearly', 'ultra.yearly']]) {
    const s = await account(from);
    const res = await upgrade(s, to);
    assert.deepEqual(await res.json(), { url: URL_, flow: 'subscription_update_confirm', to }, `${from} → ${to}`);
    assert.deepEqual(portals(s).at(-1), confirmForm(to));
    s.now.advance(1000);
    confirmAtStripe(s, to);
    const st = await (await refresh(s)).json();
    assert.deepEqual([st.tier, st.period, st.status], [...to.split('.'), 'active'], `${from} → ${to}`);
    assert.equal(Date.parse(st.current_period_end) - s.now(), 365 * DAY);
    assert.deepEqual(await status(s), st);
    // yearly is as far as it goes for this tier
    assert.deepEqual(await code(await upgrade(s, to)), [409, 'already_on_plan']);
  }
  assertClean(allLogs.flat());
});

test('left unfinished (back-navigation, the portal\'s own link): ?billing=unchanged; the plan stays as Stripe has it, and the flow can be opened again', async () => {
  const s = await account('paid.monthly');
  const before = await status(s);
  assert.equal((await upgrade(s, 'ultra.yearly')).status, 200);
  const f = portals(s).at(-1);
  // the link back Stripe shows the whole time says unchanged; only the completed flow goes to changed
  assert.equal(f.return_url, `${APP}${PORTAL_RETURN.unchanged}`);
  assert.equal(f['flow_data[after_completion][redirect][return_url]'], `${APP}${PORTAL_RETURN.changed}&to=ultra.yearly`);
  assert.notEqual(f.return_url, `${APP}${PORTAL_RETURN.home}`);
  // the customer went back without confirming: the app's refresh says what Stripe has, Flow monthly
  s.now.advance(1000);
  assert.deepEqual(await (await refresh(s)).json(), before);
  // and may come back to it: a new session, the same flow
  assert.equal((await upgrade(s, 'ultra.yearly')).status, 200);
  assert.deepEqual(portals(s).at(-1), confirmForm('ultra.yearly'));
  // the switch flow (choosing a plan) leaves the same way
  assert.equal((await portal(s, { intent: 'switch' })).status, 200);
  assert.equal(portals(s).at(-1).return_url, `${APP}/?billing=unchanged`);
  assertClean(allLogs.flat());
});

test('a failed upgrade payment: Stripe keeps the old price (pending_update) and the app is never told Beyond; a second try is change_pending; the card fixed in Manage subscription, it lands', async () => {
  const s = await account('paid.monthly');
  const before = await status(s);
  assert.equal((await upgrade(s, 'ultra.monthly')).status, 200);
  // the prorated invoice's payment failed: the item is unchanged, the change waits as pending_update
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', on('paid.monthly', { pending_update: { expires_at: Math.floor(s.now() / 1000) + 82800, subscription_items: [{ id: 'si_Item1234', price: { id: PRICES.ultraMonthly } }] } }));
  const st = await (await refresh(s)).json();
  assert.deepEqual(st, before, 'still Flow: no Beyond before Stripe has it');
  const n = portals(s).length;
  assert.deepEqual(await code(await upgrade(s, 'ultra.monthly')), [409, 'change_pending']);
  assert.equal(portals(s).length, n);
  assert.equal(lastLog(s, 'portal').err, 'pending_update');
  // Manage subscription still opens (the card is updated there, or the plan cancelled)
  assert.deepEqual(await (await portal(s, {})).json(), { url: URL_ });
  // paid: Stripe applies the change; refresh shows it
  s.now.advance(1000);
  confirmAtStripe(s, 'ultra.monthly');
  assert.deepEqual((await (await refresh(s)).json()).tier, 'ultra');
  // a renewal that failed (past_due): no upgrade on a failing card, from the record (Stripe not asked) or Stripe's copy
  const p = await account('paid.monthly');
  p.now.advance(1000);
  p.up.subs.set('sub_Test123', on('paid.monthly', { status: 'past_due' }));
  const k = p.up.stripe().length;
  assert.deepEqual(await code(await upgrade(p, 'ultra.monthly')), [409, 'payment_issue'], 'Stripe says past_due before the webhook');
  assert.equal(lastLog(p, 'portal').err, 'stripe:past_due');
  assert.deepEqual(calls(p).slice(k), ['GET /v1/subscriptions/sub_Test123'], 'nothing more asked, no session');
  assert.equal((await (await refresh(p)).json()).status, 'past_due');
  const j = p.up.stripe().length;
  for (const st2 of ['past_due', 'unpaid', 'incomplete', 'paused']) {
    p.now.advance(1000);
    p.up.subs.set('sub_Test123', on('paid.monthly', { status: st2 }));
    await refresh(p);
    const m = p.up.stripe().length;
    assert.deepEqual(await code(await upgrade(p, 'ultra.monthly')), [409, 'payment_issue'], st2);
    assert.equal(p.up.stripe().length, m, `${st2}: the record decides, Stripe not asked`);
    assert.equal(lastLog(p, 'portal').err, `record:${st2}`);
  }
  assert.ok(p.up.stripe().length > j);
  assertClean(allLogs.flat());
});

test('cancellation stays on Settings → Manage subscription: the home, after an upgrade too; a cancel at the period end shows through refresh and keeps the plan until then', async () => {
  const s = await account('paid.monthly');
  assert.equal((await upgrade(s, 'ultra.yearly')).status, 200);
  s.now.advance(1000);
  confirmAtStripe(s, 'ultra.yearly');
  assert.equal((await (await refresh(s)).json()).period, 'yearly');
  // Manage subscription: the portal's home, with cancel, back to ?billing=portal
  const home = await portal(s, {});
  assert.deepEqual(await home.json(), { url: URL_ });
  assert.deepEqual(portals(s).at(-1), { customer: 'cus_Test123', return_url: `${APP}/?billing=portal` });
  // cancelled there, at the period end (D7)
  s.now.advance(1000);
  const end = (s.now() - 1000 + 365 * DAY) / 1000;
  s.up.subs.set('sub_Test123', on('ultra.yearly', { cancel_at_period_end: true }, end));
  const st = await (await refresh(s)).json();
  assert.deepEqual([st.tier, st.period, st.status, st.cancel_at_period_end, st.ends_at], ['ultra', 'yearly', 'active', true, new Date(end * 1000).toISOString()]);
  // ended: no plan, nothing to upgrade (a new plan is a checkout), the home still opens for receipts
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', on('ultra.yearly', { status: 'canceled' }, end));
  await deliver(s.app, s.env, event('customer.subscription.deleted', on('ultra.yearly', { status: 'canceled' }, end), s.now), { at: s.now() });
  assert.deepEqual([(await status(s)).tier, (await status(s)).status], ['none', 'canceled']);
  const n = s.up.stripe().length;
  assert.deepEqual(await code(await upgrade(s, 'ultra.yearly')), [404, 'no_subscription']);
  assert.equal(s.up.stripe().length, n);
  assert.equal(lastLog(s, 'portal').err, 'record:ended');
  assert.equal((await portal(s, {})).status, 200);
  assertClean(allLogs.flat());
});

// -------------------------------------------------------- the refusals --
test('a plan set to end (cancelled in Manage subscription) is never changed: 409 plan_ending on Stripe\'s copy, for an upgrade and the plan chooser; renewed at Stripe, both open again', async () => {
  const s = await account('paid.monthly');
  // cancelled at the period end, as the pinned dahlia version has it: the flag, and cancel_at on the period end
  const end = (CLOCK_START + 30 * DAY) / 1000;
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', on('paid.monthly', { cancel_at_period_end: true, cancel_at: end }, end));
  const st = await (await refresh(s)).json();
  assert.deepEqual([st.tier, st.status, st.ends_at], ['paid', 'active', new Date(end * 1000).toISOString()], 'the record knows it ends');
  for (const [name, send] of [['upgrade', () => upgrade(s, 'ultra.yearly')], ['switch', () => portal(s, { intent: 'switch' })]]) {
    const n = portals(s).length, k = s.up.stripe().length;
    assert.deepEqual(await code(await send()), [409, 'plan_ending'], name);
    assert.equal(portals(s).length, n, `${name}: no portal session, so nothing is paid that would still end on the old date`);
    assert.deepEqual(calls(s).slice(k), ['GET /v1/subscriptions/sub_Test123'], `${name}: Stripe's copy decides`);
    assert.equal(lastLog(s, 'portal').err, 'stripe:cancel_at_period_end', name);
    assert.equal((await code(await send()))[1], 'plan_ending', `${name}: a second tap the same`);
  }
  const body = await (await upgrade(s, 'ultra.monthly')).json();
  assert.equal(body.error.code, 'plan_ending');
  assert.match(body.error.message, /set to end: renew it in Manage subscription first/);
  // Manage subscription still opens (renewing, or the receipts, are there)
  assert.deepEqual(await (await portal(s, {})).json(), { url: URL_ });
  // a cancel_at of its own (a date set for it, not the period end): the same
  s.up.subs.set('sub_Test123', on('paid.monthly', { cancel_at: end - 7 * DAY / 1000 }, end));
  assert.deepEqual(await code(await upgrade(s, 'ultra.monthly')), [409, 'plan_ending']);
  assert.equal(lastLog(s, 'portal').err, 'stripe:cancel_at');
  // renewed in Manage subscription: Stripe's copy renews, and the change opens before the webhook says so
  s.up.subs.set('sub_Test123', on('paid.monthly'));
  assert.equal((await status(s)).ends_at, new Date(end * 1000).toISOString(), 'the record still behind');
  assert.equal((await upgrade(s, 'ultra.yearly')).status, 200);
  assert.deepEqual(portals(s).at(-1), confirmForm('ultra.yearly'));
  assert.equal((await portal(s, { intent: 'switch' })).status, 200);
  assertClean(allLogs.flat());
});

test('the plan chooser (intent "switch") is checked on Stripe\'s own copy too: a record behind Stripe never opens it on a failing card or another account\'s subscription', async () => {
  const s = await account('paid.monthly');
  // the record says active; Stripe has past_due (invoice.payment_failed not delivered yet: Stripe is retrying it)
  s.up.subs.set('sub_Test123', on('paid.monthly', { status: 'past_due' }));
  assert.equal((await status(s)).status, 'active', 'the record is behind');
  let k = s.up.stripe().length;
  assert.deepEqual(await code(await portal(s, { intent: 'switch' })), [409, 'payment_issue']);
  assert.deepEqual(calls(s).slice(k), ['GET /v1/subscriptions/sub_Test123'], 'Stripe read, no portal session');
  assert.deepEqual([lastLog(s, 'portal').err, lastLog(s, 'portal').intent], ['stripe:past_due', 'switch']);
  for (const st of ['unpaid', 'incomplete', 'paused']) {
    s.up.subs.set('sub_Test123', on('paid.monthly', { status: st }));
    assert.deepEqual(await code(await portal(s, { intent: 'switch' })), [409, 'payment_issue'], st);
  }
  s.up.subs.set('sub_Test123', on('paid.monthly', { status: 'canceled' }));
  assert.deepEqual(await code(await portal(s, { intent: 'switch' })), [404, 'no_subscription']);
  // not the account's at Stripe: another account's metadata, another customer, or another subscription answered
  for (const [over, want, err] of [[{ metadata: { user_id: OTHER } }, [403, 'not_yours'], 'subscription'], [{ customer: 'cus_Elsewhere1' }, [403, 'not_yours'], 'subscription'], [{ id: 'sub_Other1234' }, [502, 'billing_unavailable'], 'id_mismatch']]) {
    s.up.subs.set('sub_Test123', on('paid.monthly', over));
    assert.deepEqual(await code(await portal(s, { intent: 'switch' })), want, JSON.stringify(over));
    assert.equal(lastLog(s, 'portal').err, err);
  }
  // Stripe has no such subscription, or does not answer
  s.up.subs.delete('sub_Test123');
  assert.deepEqual(await code(await portal(s, { intent: 'switch' })), [404, 'no_subscription']);
  s.up.subs.set('sub_Test123', on('paid.monthly'));
  s.up.fail = { path: /^\/v1\/subscriptions\//, status: 500, error: { type: 'api_error' } };
  assert.deepEqual(await code(await portal(s, { intent: 'switch' })), [502, 'billing_unavailable']);
  s.up.fail = null;
  assert.deepEqual(portals(s), [], 'no plan chooser opened for any of them');
  // paid up at Stripe: the chooser opens, after the one read
  k = s.up.stripe().length;
  const ok = await portal(s, { intent: 'switch' });
  assert.deepEqual(await ok.json(), { url: URL_, flow: 'subscription_update' });
  assert.deepEqual(calls(s).slice(k), ['GET /v1/subscriptions/sub_Test123', 'POST /v1/billing_portal/sessions']);
  // Manage subscription (the home) is never behind any of this
  s.up.subs.set('sub_Test123', on('paid.monthly', { status: 'past_due' }));
  k = s.up.stripe().length;
  assert.deepEqual(await (await portal(s, {})).json(), { url: URL_ });
  assert.deepEqual(calls(s).slice(k), ['POST /v1/billing_portal/sessions'], 'the home reads nothing first');
  assertClean(allLogs.flat());
});

test('upgrade refusals on Stripe\'s copy: another account\'s subscription, several items, a change waiting, an unknown price, Stripe not having it or not answering', async () => {
  /** @param {string} name @param {Record<string, any>} over @param {[number, string]} want @param {string} err */
  const refused = async (name, over, want, err) => {
    const s = await account('paid.monthly');
    s.up.subs.set('sub_Test123', on('paid.monthly', over));
    const n = portals(s).length;
    assert.deepEqual(await code(await upgrade(s, 'ultra.monthly')), want, name);
    assert.equal(portals(s).length, n, `${name}: no portal session`);
    assert.equal(lastLog(s, 'portal').err, err, name);
    assert.equal((await status(s)).tier, 'paid', `${name}: the record untouched`);
    return s;
  };
  await refused('metadata of another account', { metadata: { user_id: OTHER } }, [403, 'not_yours'], 'subscription');
  await refused('metadata not an account id', { metadata: { user_id: 'someone' } }, [403, 'not_yours'], 'subscription');
  await refused('another customer', { customer: 'cus_Elsewhere1' }, [403, 'not_yours'], 'subscription');
  await refused('canceled at Stripe', { status: 'canceled' }, [404, 'no_subscription'], 'stripe:ended');
  await refused('incomplete_expired at Stripe', { status: 'incomplete_expired' }, [404, 'no_subscription'], 'stripe:ended');
  const two = { object: 'list', has_more: false, data: [{ id: 'si_Item1234', price: { id: PRICES.paidMonthly } }, { id: 'si_Extra1234', price: { id: 'price_AddOn1234' } }] };
  await refused('two items', { items: two }, [409, 'not_updatable'], 'items');
  await refused('more items than listed', { items: { ...on('paid.monthly').items, has_more: true } }, [409, 'not_updatable'], 'items');
  await refused('no items', { items: { object: 'list', data: [] } }, [409, 'not_updatable'], 'items');
  await refused('a price not configured', { items: { object: 'list', data: [{ id: 'si_Item1234', price: { id: 'price_Legacy1234' } }] } }, [409, 'not_updatable'], 'unknown_price');
  await refused('an item without a Stripe id', { items: { object: 'list', data: [{ id: 'x', price: { id: PRICES.paidMonthly } }] } }, [409, 'not_updatable'], 'item');
  await refused('a configured id whose lookup key names Beyond', { items: { object: 'list', data: [{ id: 'si_Item1234', price: { id: PRICES.paidMonthly, lookup_key: 'hushmallow.ultra.monthly' } }] } }, [503, 'plan_change_unavailable'], 'price_mismatch');
  await refused('a pending update', { pending_update: { expires_at: 1 } }, [409, 'change_pending'], 'pending_update');
  await refused('a schedule (a downgrade waiting for the period end)', { schedule: 'sub_sched_Test1234' }, [409, 'change_pending'], 'schedule');
  // the record's subscription: Stripe has no such one (404), or does not answer (502)
  const g = await account('paid.monthly');
  g.up.subs.delete('sub_Test123');
  assert.deepEqual(await code(await upgrade(g, 'ultra.monthly')), [404, 'no_subscription']);
  assert.equal(lastLog(g, 'portal').err, 'stripe_not_found');
  g.up.subs.set('sub_Test123', on('paid.monthly'));
  g.up.fail = { path: /^\/v1\/subscriptions\//, status: 500, error: { type: 'api_error' } };
  assert.deepEqual(await code(await upgrade(g, 'ultra.monthly')), [502, 'billing_unavailable']);
  assert.deepEqual([lastLog(g, 'portal').err, lastLog(g, 'portal').stripe_http], ['subscription:api_error', 500]);
  g.up.fail = null;
  // Stripe answering another subscription than asked for
  g.up.subs.set('sub_Test123', on('paid.monthly', { id: 'sub_Other1234' }));
  assert.deepEqual(await code(await upgrade(g, 'ultra.monthly')), [502, 'billing_unavailable']);
  assert.equal(lastLog(g, 'portal').err, 'id_mismatch');
  assert.deepEqual(portals(g), []);
  // no record; another account's token sees only its own (none), never UID's subscription
  const e = track(setup());
  assert.deepEqual(await code(await upgrade(e, 'ultra.monthly')), [404, 'no_subscription']);
  assert.deepEqual(e.up.stripe(), []);
  const o = await account('paid.monthly');
  o.up.users[jwt(OTHER)] = { id: OTHER };
  assert.deepEqual(await code(await upgrade(o, 'ultra.monthly', jwt(OTHER))), [404, 'no_subscription']);
  assert.deepEqual(await code(await refresh(o, {}, jwt(OTHER))), [404, 'no_subscription']);
  assert.deepEqual(portals(o), []);
  // bodies: plan and period as checkout has them, nothing else
  for (const [b, want] of [
    [{ intent: 'upgrade' }, 'invalid_plan'], [{ intent: 'upgrade', plan: 'ultra' }, 'invalid_period'], [{ intent: 'upgrade', plan: 'beyond', period: 'monthly' }, 'invalid_plan'],
    [{ intent: 'upgrade', plan: 'ultra', period: 'weekly' }, 'invalid_period'], [{ intent: 'upgrade', plan: 'ultra', period: 'yearly', price: PRICES.ultraYearly }, 'invalid_body'],
    [{ intent: 'upgrade', plan: 'ultra', period: 'yearly', subscription: 'sub_Other1234' }, 'invalid_body'], [{ intent: 'Upgrade', plan: 'ultra', period: 'yearly' }, 'invalid_intent'],
  ]) {
    assert.deepEqual(await code(await portal(o, b)), [400, want], JSON.stringify(b));
  }
  assertClean(allLogs.flat());
});

test('the target price is checked as checkout checks it (CHECKOUT_PRICE_RULES): a fault is 503 plan_change_unavailable and never offered; a slot not configured, or one id in two slots, too', async () => {
  for (const [name, over] of [['another currency', { currency: 'eur' }], ['monthly in the yearly slot', { recurring: { interval: 'month', interval_count: 1 } }], ['Flow\'s amount', { unit_amount: CHECKOUT_PRICE_RULES.unit_amount.paid.yearly }], ['archived', { active: false }], ['another slot\'s lookup key', { lookup_key: 'hushmallow.paid.yearly' }], ['other currencies on it', { currency_options: { usd: {}, aud: {} } }]]) {
    const s = await account('paid.monthly');
    s.up.prices.set(PRICES.ultraYearly, price(PRICES.ultraYearly, 'ultra', 'yearly', over));
    const fault = priceFault({ ...price(PRICES.ultraYearly, 'ultra', 'yearly', over) }, 'ultra', 'yearly');
    assert.notEqual(fault, '', name);
    assert.deepEqual(await code(await upgrade(s, 'ultra.yearly')), [503, 'plan_change_unavailable'], name);
    assert.deepEqual(portals(s), [], `${name}: never offered`);
    const l = lastLog(s, 'portal');
    assert.deepEqual([l.status, l.http, l.err, l.plan, l.period], ['plan_change_unavailable', 503, `price:${fault}`, 'ultra', 'yearly'], name);
    // the other targets still open
    assert.equal((await upgrade(s, 'ultra.monthly')).status, 200, name);
  }
  // Stripe not having the price (a live id on a test key): 503; not answering: 502
  const g = await account('paid.monthly');
  g.up.prices.delete(PRICES.ultraYearly);
  assert.deepEqual(await code(await upgrade(g, 'ultra.yearly')), [503, 'plan_change_unavailable']);
  assert.equal(lastLog(g, 'portal').err, 'price:not_found');
  const d = await account('paid.monthly');
  d.up.fail = { path: /^\/v1\/prices\//, status: 500, error: { type: 'api_error' } };
  assert.deepEqual(await code(await upgrade(d, 'ultra.yearly')), [502, 'billing_unavailable']);
  assert.equal(portals(d).length, 0);
  // the slot empty, or its id in two slots: never offered, Stripe not asked
  const e = await account('paid.monthly', { env: billingEnv({ STRIPE_PRICE_ULTRA_YEARLY: '' }) });
  let n = e.up.stripe().length;
  assert.deepEqual(await code(await upgrade(e, 'ultra.yearly')), [503, 'plan_change_unavailable']);
  assert.deepEqual([e.up.stripe().length, lastLog(e, 'portal').err], [n, 'no_price']);
  const dup = await account('paid.monthly', { env: billingEnv({ STRIPE_PRICE_ULTRA_YEARLY: PRICES.ultraMonthly }) });
  n = dup.up.stripe().length;
  assert.deepEqual(await code(await upgrade(dup, 'ultra.yearly')), [503, 'plan_change_unavailable']);
  assert.deepEqual([dup.up.stripe().length, lastLog(dup, 'portal').err], [n, 'duplicate_price']);
  // the same read as checkout's: one per price id for the cache's time
  const c = await account('paid.monthly');
  await upgrade(c, 'ultra.yearly');
  await upgrade(c, 'ultra.yearly');
  assert.equal(c.up.stripe().filter((x) => x.path === `/v1/prices/${PRICES.ultraYearly}`).length, 1);
  assertClean(allLogs.flat());
});

test('Stripe refusing the confirm flow (plan changes off, or the price not in the portal configuration) is 503 plan_change_unavailable, never the home; any other failure 502', async () => {
  const s = await account('paid.monthly');
  s.up.portalFlows = false;
  let n = portals(s).length;
  const r = await upgrade(s, 'ultra.monthly');
  assert.deepEqual(await code(r), [503, 'plan_change_unavailable']);
  assert.equal((await r.json()).url, undefined);
  assert.deepEqual(portals(s).slice(n), [confirmForm('ultra.monthly')], 'one session asked for, no home after it');
  assert.deepEqual([lastLog(s, 'portal').err, lastLog(s, 'portal').stripe_http], ['flow:invalid_request_error', 400]);
  s.up.portalFlows = true;
  // the portal configuration offers Flow only (Beyond's prices not added under Subscriptions → products)
  s.up.portalPrices = [PRICES.paidMonthly, PRICES.paidYearly];
  n = portals(s).length;
  assert.deepEqual(await code(await upgrade(s, 'ultra.monthly')), [503, 'plan_change_unavailable']);
  assert.equal(portals(s).length, n + 1);
  assert.equal((await upgrade(s, 'paid.yearly')).status, 200, 'a price it offers opens');
  s.up.portalPrices = Object.values(SLOT);
  assert.equal((await upgrade(s, 'ultra.monthly')).status, 200);
  // the portal itself failing: 502, once
  s.up.fail = { path: /^\/v1\/billing_portal\//, status: 500, error: { type: 'api_error' } };
  n = portals(s).length;
  assert.deepEqual(await code(await upgrade(s, 'ultra.monthly')), [502, 'billing_unavailable']);
  assert.equal(portals(s).length, n + 1);
  s.up.fail = { path: /^\/v1\/billing_portal\//, status: 403, error: { type: 'invalid_request_error', code: 'secret_key_required' } };
  assert.deepEqual(await code(await upgrade(s, 'ultra.monthly')), [502, 'billing_unavailable'], 'a key without the permission is not a portal setting');
  assertClean(allLogs.flat());
});

test('return addresses come from APP_ORIGIN only: production\'s on its own, the staging Worker\'s preview on staging, whatever the request\'s Origin', async () => {
  // production (the fixtures' APP_ORIGIN), asked from another allowed origin
  const s = await account('paid.monthly');
  const res = await s.app.fetch(billingReq('/v1/billing/portal', { body: { intent: 'upgrade', plan: 'ultra', period: 'monthly' }, origin: 'http://localhost:8000' }), s.env);
  assert.equal(res.status, 200);
  assert.deepEqual(portals(s).at(-1), confirmForm('ultra.monthly', APP));
  // the staging Worker: back to the release candidate's preview
  const { readConfig: readWithStaging } = await withStagingProject(STAGING_SUPABASE);
  const env = billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: STAGING_SUPABASE, APP_ORIGIN: STAGING_APP, ALLOWED_ORIGINS: `https://ramkumarjothi1982.github.io,${STAGING_APP}` });
  const cfg = readWithStaging(env);
  assert.equal(cfg.billing.appOrigin, 'https://claude-launch-rc.hushmallow.pages.dev');
  const token = jwt(UID, { iss: `${STAGING_SUPABASE}/auth/v1` });
  const up = upstream({ users: { [token]: { id: UID } } });
  const fetch = (u, i) => up.fetch(String(u).replace(STAGING_SUPABASE, SUPABASE), i);
  const logs = [];
  const now = clock();
  const billing = createBilling({ logger: createLogger((l) => logs.push(l)), now, fetch, ipKey: async () => 'ip' });
  const ask = (body) => billing.portal(billingReq('/v1/billing/portal', { body, token, origin: 'https://ramkumarjothi1982.github.io' }), env, cfg, {});
  const sub = on('paid.monthly', { livemode: false });
  up.subs.set('sub_Test123', sub);
  const rec = await billing.recordSubscription({ subId: 'sub_Test123', uidHint: UID, obj: {}, eventType: 'checkout.session.completed', created: Math.floor(now() / 1000), eventId: null }, env, cfg);
  assert.equal(rec.outcome, 'applied');
  assert.deepEqual(await (await ask({ intent: 'upgrade', plan: 'ultra', period: 'yearly' })).json(), { url: URL_, flow: 'subscription_update_confirm', to: 'ultra.yearly' });
  const form = (i) => Object.fromEntries(up.stripe().filter((c) => c.path === '/v1/billing_portal/sessions').at(i).form);
  assert.deepEqual(form(-1), confirmForm('ultra.yearly', STAGING_APP));
  assert.equal(form(-1)['flow_data[after_completion][redirect][return_url]'], 'https://claude-launch-rc.hushmallow.pages.dev/?billing=changed&to=ultra.yearly');
  await ask({ intent: 'switch' });
  assert.equal(form(-1)['flow_data[after_completion][redirect][return_url]'], `${STAGING_APP}/?billing=changed`);
  assert.equal(form(-1).return_url, `${STAGING_APP}/?billing=unchanged`);
  await ask({});
  assert.deepEqual(form(-1), { customer: 'cus_Test123', return_url: `${STAGING_APP}/?billing=portal` });
  // no production address anywhere in what staging sent
  for (const c of up.stripe()) assert.ok(!(c.body || '').includes(encodeURIComponent(APP)), c.path);
  assertClean(logs);
});

// --------------------------------------------------------- the refresh --
test('POST /v1/billing/sync {} | { refresh: true }: the recorded subscription read from Stripe and recorded through recordSubscription; refusals; Stripe down 502', async () => {
  // no record: 404, Stripe not asked
  const e = track(setup());
  assert.deepEqual(await code(await refresh(e)), [404, 'no_subscription']);
  assert.deepEqual(await code(await refresh(e, {})), [404, 'no_subscription']);
  assert.deepEqual(e.up.stripe(), []);
  assert.deepEqual([lastLog(e, 'sync').status, lastLog(e, 'sync').intent], ['no_subscription', 'refresh']);
  // recorded as the webhook records it (the state machine: a later read replaces an earlier one), no event id kept
  const s = await account('paid.monthly');
  const evts = () => [...s.env.BILLING.instances.get(`user:${UID}`).map.keys()].filter((k) => k.startsWith('evt:')).length;
  const kept = evts();
  s.now.advance(1000);
  confirmAtStripe(s, 'ultra.monthly');
  const r = await refresh(s);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal((await r.json()).tier, 'ultra');
  assert.equal(evts(), kept);
  const rec = s.env.BILLING.instances.get(`user:${UID}`).map.get('sub');
  assert.deepEqual([rec.tier, rec.period, rec.status, rec.as_of], ['ultra', 'monthly', 'active', s.now()]);
  // Stripe not answering: 502 billing_unavailable, the record as it was
  s.up.fail = { path: /^\/v1\/subscriptions\//, status: 500, error: { type: 'api_error' } };
  assert.deepEqual(await code(await refresh(s)), [502, 'billing_unavailable']);
  assert.deepEqual([lastLog(s, 'sync').status, lastLog(s, 'sync').err, lastLog(s, 'sync').stripe_http], ['stripe_error', 'api_error', 500]);
  s.up.fail = null;
  // Stripe no longer has it: 404, and the record is left for the webhook to settle
  s.up.subs.delete('sub_Test123');
  assert.deepEqual(await code(await refresh(s)), [404, 'no_subscription']);
  assert.equal((await status(s)).tier, 'ultra');
  // a subscription whose metadata names another account: nothing recorded (403)
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', on('paid.monthly', { metadata: { user_id: OTHER } }));
  assert.deepEqual(await code(await refresh(s)), [403, 'not_yours']);
  assert.equal((await status(s)).tier, 'ultra', 'unchanged');
  // its customer linked to another account: 409 customer_conflict, nothing recorded
  const c = await account('paid.monthly');
  c.now.advance(1000);
  await c.env.BILLING.get(c.env.BILLING.idFromName('customer:cus_Elsewhere1')).fetch('https://billing/link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ uid: OTHER }) });
  c.up.subs.set('sub_Test123', on('ultra.monthly', { customer: 'cus_Elsewhere1' }));
  assert.deepEqual(await code(await refresh(c)), [409, 'customer_conflict']);
  assert.equal((await status(c)).tier, 'paid');
  // ended at Stripe: recorded (the customer's list read, as the webhook does), no plan
  const x = await account('ultra.monthly');
  x.now.advance(1000);
  x.up.subs.set('sub_Test123', on('ultra.monthly', { status: 'canceled' }));
  const n = x.up.stripe().length;
  const ended = await (await refresh(x)).json();
  assert.deepEqual([ended.tier, ended.status], ['none', 'canceled']);
  assert.deepEqual(calls(x).slice(n), ['GET /v1/subscriptions/sub_Test123', 'GET /v1/subscriptions']);
  // no token, GET, billing off
  assert.deepEqual(await code(await refresh(x, {}, null)), [401, 'account_required']);
  const off = track(setup({ env: billingEnv({ STRIPE_SECRET_KEY: '' }) }));
  assert.deepEqual(await code(await refresh(off)), [503, 'billing_not_configured']);
  assert.equal(off.up.calls.length, 0);
  assertClean(allLogs.flat());
});

test('refresh shares the billing rate limit (BILLING_IP_LIMITER, else the isolate\'s 20 a minute), as sync does', async () => {
  const counted = allowAll();
  const s = await account('paid.monthly', { env: billingEnv({ BILLING_IP_LIMITER: counted }) });
  const before = counted.calls;
  await refresh(s);
  await refresh(s, {});
  await upgrade(s, 'ultra.monthly');
  assert.equal(counted.calls - before, 3);
  const d = track(setup({ env: billingEnv({ BILLING_IP_LIMITER: denyAll() }) }));
  const r = await refresh(d);
  assert.deepEqual(await code(r), [429, 'rate_limited']);
  assert.equal(r.headers.get('retry-after'), '60');
  assert.deepEqual(await code(await upgrade(d, 'ultra.monthly')), [429, 'rate_limited']);
  assert.equal(d.up.calls.length, 0);
  const m = await account('paid.monthly', { env: billingEnv({ BILLING_IP_LIMITER: undefined }) });
  // account() asked for the status once: 19 more in the minute, then the window is full
  for (let i = 0; i < 19; i++) assert.equal((await refresh(m)).status, 200, String(i));
  assert.deepEqual(await code(await refresh(m)), [429, 'rate_limited']);
  assert.deepEqual(await code(await upgrade(m, 'ultra.monthly')), [429, 'rate_limited']);
  assertClean(allLogs.flat());
});

// ------------------------------------------------- a change set for later --
test('a change the portal set for the period end (D8: a downgrade, a shorter period) is in the status: scheduled_change { at, tier, period }, the schedule read expanded', async () => {
  const end = (CLOCK_START + 30 * DAY) / 1000;
  /** The portal's schedule: this period on the plan held, then the plan chosen from the period end. */
  const schedule = (from, to, over = {}) => ({
    id: 'sub_sched_Test1234', object: 'subscription_schedule', status: 'active', end_behavior: 'release',
    current_phase: { start_date: CLOCK_START / 1000, end_date: end },
    phases: [{ start_date: CLOCK_START / 1000, end_date: end, items: [{ price: SLOT[from], quantity: 1 }] }, { start_date: end, end_date: end + 30 * DAY / 1000, items: [{ price: SLOT[to], quantity: 1 }] }],
    ...over,
  });
  const s = await account('ultra.monthly');
  s.now.advance(1000);
  // Beyond monthly → Flow on Stripe's chooser: Beyond stays until the period end, then Flow
  s.up.subs.set('sub_Test123', on('ultra.monthly', { schedule: schedule('ultra.monthly', 'paid.monthly') }, end));
  const st = await (await refresh(s)).json();
  const later = { at: new Date(end * 1000).toISOString(), tier: 'paid', period: 'monthly' };
  assert.deepEqual([st.tier, st.period, st.status, st.scheduled_change], ['ultra', 'monthly', 'active', later]);
  const read = s.up.stripe().filter((c) => c.path === '/v1/subscriptions/sub_Test123').at(-1);
  assert.deepEqual(read.query.getAll('expand[]'), ['schedule'], 'the schedule read expanded');
  assert.deepEqual((await status(s)).scheduled_change, later, 'kept in the record: GET status says it too');
  // a next phase on the same plan is no change of plan
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', on('ultra.monthly', { schedule: schedule('ultra.monthly', 'ultra.monthly') }, end));
  assert.equal((await (await refresh(s)).json()).scheduled_change, null);
  // the webhook's own path records it the same way (its event carries the schedule's id; the read expands it)
  s.now.advance(1000);
  const toFlowYearly = on('ultra.monthly', { schedule: schedule('ultra.monthly', 'paid.yearly') }, end);
  s.up.subs.set('sub_Test123', toFlowYearly);
  await deliver(s.app, s.env, event('customer.subscription.updated', { ...toFlowYearly, schedule: 'sub_sched_Test1234' }, s.now), { at: s.now() });
  assert.deepEqual((await status(s)).scheduled_change, { at: new Date(end * 1000).toISOString(), tier: 'paid', period: 'yearly' });
  // the schedule's id only (an event's own copy, Stripe not having it): when, the plan not told
  const { summarise } = await import('../src/billing/store.js');
  const prices = { paid: { monthly: PRICES.paidMonthly, yearly: PRICES.paidYearly }, ultra: { monthly: PRICES.ultraMonthly, yearly: PRICES.ultraYearly } };
  assert.deepEqual(summarise(on('ultra.monthly', { schedule: 'sub_sched_Test1234' }, end), prices, CLOCK_START).scheduled, { at: end * 1000, tier: null, period: null });
  // released, completed or cancelled, or no phase still to come: no change waiting
  for (const over of [{ status: 'released' }, { status: 'completed' }, { status: 'canceled' }, { phases: [] }]) {
    assert.equal(summarise(on('ultra.monthly', { schedule: schedule('ultra.monthly', 'paid.monthly', over) }, end), prices, CLOCK_START).scheduled, null, JSON.stringify(over));
  }
  assert.equal(summarise(on('ultra.monthly', { schedule: null }, end), prices, CLOCK_START).scheduled, null);
  assert.equal(summarise(on('ultra.monthly', { schedule: 'not_a_schedule' }, end), prices, CLOCK_START).scheduled, null);
  // a plan set to end says when it ends, never a change: scheduled_change null
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', on('ultra.monthly', { schedule: schedule('ultra.monthly', 'paid.monthly'), cancel_at_period_end: true, cancel_at: end }, end));
  const ending = await (await refresh(s)).json();
  assert.deepEqual([ending.ends_at, ending.scheduled_change], [new Date(end * 1000).toISOString(), null]);
  // an upgrade on a subscription with a change waiting is still change_pending (no confirm flow over a schedule)
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', on('ultra.monthly', { schedule: schedule('ultra.monthly', 'paid.monthly') }, end));
  await refresh(s);
  assert.deepEqual(await code(await upgrade(s, 'ultra.yearly')), [409, 'change_pending']);
  assertClean(allLogs.flat());
});

// ---------------------------------------------------- the status body --
test('the status body carries the period and Stripe\'s status next to every field it had (old clients read on as before)', async () => {
  const s = await account('paid.yearly');
  const st = await status(s);
  assert.deepEqual(Object.keys(st), ['tier', 'status', 'period', 'current_period_end', 'cancel_at_period_end', 'ends_at', 'manageable', 'scheduled_change']);
  assert.deepEqual([st.tier, st.status, st.period], ['paid', 'active', 'yearly']);
  const none = await status(track(setup()));
  assert.deepEqual(none, { tier: 'none', status: 'none', period: null, current_period_end: null, cancel_at_period_end: false, ends_at: null, manageable: false, scheduled_change: null });
  // a price that is none of the plans: no tier, no period
  const u = track(setup());
  await subscribe(u, subscription({}, { price: 'price_Legacy1234' }));
  const legacy = await status(u);
  assert.deepEqual([legacy.tier, legacy.status, legacy.period], ['none', 'active', null]);
  // sync's answer is the same body
  s.now.advance(1000);
  assert.deepEqual(Object.keys(await (await refresh(s)).json()), Object.keys(st));
});
