// A Stripe sandbox in memory, for test/billing-e2e.test.js: what scripts/billing-e2e.mjs reads and makes (prices with
// their products, the webhook endpoint, the default portal configuration, Stripe Tax, test clocks with their
// customers, cards, subscriptions, invoices and events) and what the Worker reads back (a subscription, a customer's
// list). Moving a clock renews, retries, fails and cancels in outline as Stripe does, and each event goes, signed, to
// the Worker's webhook (deliver); its pending_webhooks drops to 0 once the Worker answers 2xx.
//
// Shapes follow API 2026-08-26.dahlia (the period on the items, an invoice's subscription under parent). The retry
// schedule and the limits (3 customers a clock, two intervals an advance) are the driver's own assumptions, from
// memory, not Stripe's documentation. Every key-shaped value is built at run time.

import { PRICES, price as sellable } from './billing-fixtures.js';
import { EVENTS } from '../src/billing/routes.js';
import { STRIPE_API_VERSION_EXPECTED } from '../src/config.js';

const DAY = 86400;
/** The card behind each test PaymentMethod token the driver uses. */
const CARDS = { pm_card_visa: 'ok', pm_card_chargeCustomerFail: 'fail', pm_card_authenticationRequired: 'auth' };
export const AMOUNTS = { [PRICES.paidMonthly]: 999, [PRICES.paidYearly]: 9999, [PRICES.ultraMonthly]: 1999, [PRICES.ultraYearly]: 19999 };
const SLOTS = { [PRICES.paidMonthly]: ['paid', 'monthly'], [PRICES.paidYearly]: ['paid', 'yearly'], [PRICES.ultraMonthly]: ['ultra', 'monthly'], [PRICES.ultraYearly]: ['ultra', 'yearly'] };
/** A made-up product tax code (not one of Stripe's): the owner chooses the real one (D4). */
const FAKE_TAX_CODE = 'txcd_99999999';

/** @param {number} t seconds @param {'month' | 'year'} interval */
function plus(t, interval, n = 1) {
  const d = new Date(t * 1000);
  if (interval === 'month') d.setUTCMonth(d.getUTCMonth() + n); else d.setUTCFullYear(d.getUTCFullYear() + n);
  return Math.floor(d.getTime() / 1000);
}

/**
 * @param {{ now: () => number, deliver: (ev: any) => Promise<Response>, worker: string,
 *   afterRetries?: 'cancel' | 'unpaid' | 'past_due', retries?: number, resend?: boolean,
 *   live?: (method: string, path: string) => boolean, edit?: (s: any) => void }} o
 *   afterRetries: what happens once the retries run out (Revenue recovery, D6); live: answers that carry livemode true;
 *   edit: change the sandbox's settings (prices, endpoints, portal, tax) before the run
 */
export function sandbox({ now, deliver, worker, afterRetries = 'cancel', retries = 4, resend = true, live = () => false, edit = () => {} }) {
  let n = 0;
  const id = (/** @type {string} */ p) => `${p}_Sbx${++n}${'x'.repeat(8)}`;
  const products = {
    paid: { id: 'prod_FlowSbx1', object: 'product', name: 'hushmallow Flow', tax_code: FAKE_TAX_CODE, livemode: false },
    ultra: { id: 'prod_BeyondSbx1', object: 'product', name: 'hushmallow Beyond', tax_code: FAKE_TAX_CODE, livemode: false },
  };
  /** @type {Map<string, any>} */
  const prices = new Map(Object.entries(SLOTS).map(([pid, [plan, period]]) => [pid, { ...sellable(pid, plan, period), unit_amount: AMOUNTS[pid], product: products[/** @type {'paid' | 'ultra'} */ (plan)].id, livemode: false }]));
  const s = {
    products, prices,
    endpoints: [{ id: 'we_SbxStaging1', object: 'webhook_endpoint', url: `${worker}/v1/billing/webhook`, status: 'enabled', api_version: STRIPE_API_VERSION_EXPECTED, enabled_events: [...EVENTS], livemode: false }],
    portal: {
      id: 'bpc_SbxDefault1', object: 'billing_portal.configuration', is_default: true, active: true, livemode: false,
      features: {
        subscription_cancel: { enabled: true, mode: 'at_period_end', proration_behavior: 'none' },
        subscription_update: { enabled: true, default_allowed_updates: ['price'], proration_behavior: 'always_invoice', products: [{ product: products.paid.id, prices: [PRICES.paidMonthly, PRICES.paidYearly] }, { product: products.ultra.id, prices: [PRICES.ultraMonthly, PRICES.ultraYearly] }] },
        payment_method_update: { enabled: true }, invoice_history: { enabled: true }, customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
      },
    },
    taxSettings: { object: 'tax.settings', status: 'active', defaults: { tax_behavior: 'inclusive', tax_code: null }, head_office: { address: { country: 'AU' } }, livemode: false },
    registrations: [{ id: 'taxreg_SbxAu1', object: 'tax.registration', country: 'AU', status: 'active', country_options: { au: { type: 'standard' } }, livemode: false }],
    taxReason: 'standard_rated',
    /** @type {Map<string, any>} */ clocks: new Map(),
    /** @type {Map<string, any>} */ customers: new Map(),
    /** @type {Map<string, any>} */ pms: new Map(),
    /** @type {Map<string, any>} */ subs: new Map(),
    /** @type {Map<string, any>} */ invoices: new Map(),
    /** @type {any[]} */ events: [],
    /** @type {{ method: string, path: string, key: string, version: string, form: URLSearchParams, at: number }[]} */ calls: [],
  };
  edit(s);
  /** the open invoice of each subscription (Stripe's latest_invoice, while it is unpaid) */
  /** @type {Map<string, string>} */
  const open = new Map();
  let queue = Promise.resolve();

  /** @param {string} type @param {any} obj */
  function emit(type, obj) {
    const ev = { id: id('evt'), object: 'event', type, api_version: STRIPE_API_VERSION_EXPECTED, created: Math.floor(now() / 1000), livemode: false, pending_webhooks: 1, data: { object: structuredClone(obj) } };
    s.events.push(ev);
    send(ev);
  }
  /** @param {any} ev */
  function send(ev) {
    ev.pending_webhooks = 1;
    queue = queue.then(async () => { const r = await deliver(ev); if (r.status >= 200 && r.status < 300) ev.pending_webhooks = 0; }).catch(() => {});
  }
  /** @param {string} cus */
  const timeOf = (cus) => { const c = s.customers.get(cus); return c?.test_clock ? s.clocks.get(c.test_clock).frozen_time : Math.floor(now() / 1000); };
  /** @param {any} sub */
  const item = (sub) => sub.items.data[0];
  /** @param {string} cus */
  const howPays = (cus) => /** @type {string} */ (s.pms.get(s.customers.get(cus)?.invoice_settings?.default_payment_method)?._how || 'none');
  /** @param {any} sub @param {string} reason @param {number} at */
  function invoice(sub, reason, at) {
    const inv = {
      id: id('in'), object: 'invoice', customer: sub.customer, status: 'open', billing_reason: reason, amount_due: AMOUNTS[item(sub).price.id] || 0,
      attempt_count: 0, next_payment_attempt: null, created: at, livemode: false,
      parent: { type: 'subscription_details', subscription_details: { subscription: sub.id, metadata: { ...sub.metadata } } },
    };
    s.invoices.set(inv.id, inv);
    sub.latest_invoice = inv.id;
    return inv;
  }
  /** One payment attempt on an invoice, with `how` (the card's behaviour). @param {any} inv @param {any} sub @param {number} at @param {string} how */
  function attempt(inv, sub, at, how) {
    inv.attempt_count++;
    if (how === 'ok') {
      inv.status = 'paid'; inv.next_payment_attempt = null; open.delete(sub.id);
      const was = sub.status;
      sub.status = 'active';
      emit('invoice.paid', inv);
      if (was !== 'active' && was !== 'incomplete') emit('customer.subscription.updated', sub);
      return;
    }
    open.set(sub.id, inv.id);
    if (sub.status === 'incomplete') { emit('invoice.payment_failed', inv); return; }
    const out = inv.attempt_count >= retries && how !== 'auth';
    inv.next_payment_attempt = out ? null : at + 3 * DAY;
    emit('invoice.payment_failed', inv);
    if (how === 'auth') emit('invoice.payment_action_required', inv);
    if (out && afterRetries !== 'past_due') {
      sub.status = afterRetries === 'unpaid' ? 'unpaid' : 'canceled';
      if (sub.status === 'canceled') { sub.ended_at = at; sub.canceled_at = at; emit('customer.subscription.deleted', sub); } else emit('customer.subscription.updated', sub);
      return;
    }
    if (sub.status !== 'past_due') { sub.status = 'past_due'; emit('customer.subscription.updated', sub); }
  }
  /** Run a clock forward to `to`: renewals, retries and cancellations, in time order. @param {any} clock @param {number} to */
  function run(clock, to) {
    for (;;) {
      /** @type {{ at: number, kind: string, sub: any } | null} */
      let next = null;
      /** @param {number} at @param {string} kind @param {any} sub */
      const due = (at, kind, sub) => { if (at <= to && (!next || at < next.at || (at === next.at && kind === 'cancel'))) next = { at, kind, sub }; };
      for (const sub of s.subs.values()) {
        if (s.customers.get(sub.customer)?.test_clock !== clock.id || ['canceled', 'unpaid', 'incomplete_expired', 'incomplete'].includes(sub.status)) continue;
        const inv = s.invoices.get(open.get(sub.id) || '');
        if (inv?.status === 'open' && inv.next_payment_attempt) due(inv.next_payment_attempt, 'retry', sub);
        const end = item(sub).current_period_end;
        if (sub.cancel_at && sub.cancel_at <= end) due(sub.cancel_at, 'cancel', sub);
        else due(end, 'renew', sub);
      }
      if (!next) break;
      const { at, kind, sub } = /** @type {{ at: number, kind: string, sub: any }} */ (next);
      clock.frozen_time = at;
      if (kind === 'cancel') {
        Object.assign(sub, { status: 'canceled', ended_at: at, canceled_at: at });
        emit('customer.subscription.deleted', sub);
      } else if (kind === 'renew') {
        const it = item(sub);
        it.current_period_start = it.current_period_end;
        it.current_period_end = plus(it.current_period_start, it.price.recurring.interval);
        emit('customer.subscription.updated', sub);
        attempt(invoice(sub, 'subscription_cycle', at), sub, at, howPays(sub.customer));
      } else {
        attempt(s.invoices.get(/** @type {string} */ (open.get(sub.id))), sub, at, howPays(sub.customer));
      }
    }
    clock.frozen_time = to;
  }
  /** The furthest a clock may move now: two intervals of its shortest subscription. @param {any} clock */
  const furthest = (clock) => Math.min(Infinity, ...[...s.subs.values()]
    .filter((x) => s.customers.get(x.customer)?.test_clock === clock.id && !['canceled', 'unpaid'].includes(x.status))
    .map((x) => plus(clock.frozen_time, item(x).price.recurring.interval, 2)));
  /** A price as a subscription item carries it. @param {string} pid */
  const priced = (pid) => { const p = prices.get(pid); return { id: p.id, object: 'price', lookup_key: p.lookup_key, recurring: { ...p.recurring }, unit_amount: p.unit_amount, product: p.product, livemode: false }; };

  /** @param {number} status @param {unknown} body */
  const reply = (status, body) => [status, body];
  const missing = () => reply(404, { error: { code: 'resource_missing', type: 'invalid_request_error', message: 'No such object.' } });
  /** @param {string} message */
  const invalid = (message) => reply(400, { error: { type: 'invalid_request_error', message } });
  /** @param {any[]} data */
  const listOf = (data) => ({ object: 'list', data, has_more: false });
  /** A copy as Stripe answers it (no internal fields). @param {any} o */
  const out = (o) => { const c = structuredClone(o); delete c._how; return c; };

  /** @param {string} method @param {URL} u @param {URLSearchParams} form @returns {[number, any]} */
  function handle(method, u, form) {
    const p = u.pathname, q = u.searchParams;
    let m;
    // read by P0
    if (method === 'GET' && (m = /^\/v1\/prices\/(price_\w+)$/.exec(p))) {
      const x = prices.get(m[1]);
      if (!x) return missing();
      const expand = [...q].some(([k, v]) => /^expand\[\d*\]$/.test(k) && v === 'product');
      return reply(200, { ...x, product: expand ? Object.values(products).find((y) => y.id === x.product) : x.product });
    }
    if (method === 'GET' && p === '/v1/webhook_endpoints') return reply(200, listOf(s.endpoints));
    if (method === 'GET' && p === '/v1/billing_portal/configurations') return reply(200, listOf(s.portal ? [s.portal] : []));
    if (method === 'GET' && p === '/v1/tax/settings') return reply(200, s.taxSettings);
    if (method === 'GET' && p === '/v1/tax/registrations') return reply(200, listOf(s.registrations.filter((r) => !q.get('status') || r.status === q.get('status'))));
    if (method === 'POST' && p === '/v1/tax/calculations') {
      const amount = Number(form.get('line_items[0][amount]'));
      const au = form.get('customer_details[address][country]') === 'AU' && s.registrations.some((r) => r.country === 'AU' && r.status === 'active');
      const reason = au ? s.taxReason : 'not_collecting';
      // a 10% rate: inside an inclusive amount (1/11 of it), or on top of an exclusive one
      const inclusive = form.get('line_items[0][tax_behavior]') === 'inclusive';
      const tax = reason === 'standard_rated' ? Math.round(inclusive ? amount / 11 : amount / 10) : 0;
      return reply(200, {
        id: id('taxcalc'), object: 'tax.calculation', currency: form.get('currency'), amount_total: inclusive ? amount : amount + tax,
        tax_amount_inclusive: inclusive ? tax : 0, tax_amount_exclusive: inclusive ? 0 : tax, tax_breakdown: [{ amount: tax, inclusive, taxability_reason: reason }], livemode: false,
      });
    }
    // test clocks
    if (method === 'POST' && p === '/v1/test_helpers/test_clocks') {
      const c = { id: id('clock'), object: 'test_helpers.test_clock', frozen_time: Number(form.get('frozen_time')), name: form.get('name'), status: 'ready', livemode: false, deletes_after: Math.floor(now() / 1000) + 30 * DAY };
      s.clocks.set(c.id, c);
      return reply(200, c);
    }
    if ((m = /^\/v1\/test_helpers\/test_clocks\/(clock_\w+)(\/advance)?$/.exec(p))) {
      const c = s.clocks.get(m[1]);
      if (!c || c.deleted) return missing();
      if (method === 'DELETE' && !m[2]) {
        c.deleted = true;
        for (const cus of [...s.customers.values()].filter((x) => x.test_clock === c.id)) {
          for (const sub of [...s.subs.values()].filter((x) => x.customer === cus.id)) s.subs.delete(sub.id);
          s.customers.delete(cus.id);
        }
        return reply(200, { id: c.id, object: 'test_helpers.test_clock', deleted: true });
      }
      if (method === 'POST' && m[2]) {
        const to = Number(form.get('frozen_time'));
        if (!(to > c.frozen_time)) return invalid('The frozen time must be after the current one.');
        if (to > furthest(c)) return invalid('A test clock can move at most two intervals of its subscriptions at once.');
        c.status = 'advancing'; c._to = to;
        return reply(200, out({ ...c, _to: undefined }));
      }
      if (method === 'GET' && !m[2]) {
        if (c.status === 'advancing') { run(c, c._to); c.status = 'ready'; delete c._to; }
        return reply(200, c);
      }
    }
    // customers and cards
    if (method === 'POST' && p === '/v1/customers') {
      const clock = form.get('test_clock');
      if (clock && [...s.customers.values()].filter((x) => x.test_clock === clock).length >= 3) return invalid('A test clock takes at most 3 customers.');
      const c = { id: id('cus'), object: 'customer', test_clock: clock, metadata: meta(form), invoice_settings: { default_payment_method: null }, livemode: false };
      s.customers.set(c.id, c);
      return reply(200, c);
    }
    if (method === 'POST' && (m = /^\/v1\/customers\/(cus_\w+)$/.exec(p))) {
      const c = s.customers.get(m[1]);
      if (!c) return missing();
      const pm = form.get('invoice_settings[default_payment_method]');
      if (pm) { if (!s.pms.has(pm)) return missing(); c.invoice_settings.default_payment_method = pm; }
      return reply(200, c);
    }
    if (method === 'POST' && (m = /^\/v1\/payment_methods\/(pm_\w+)\/attach$/.exec(p))) {
      const how = /** @type {Record<string, string>} */ (CARDS)[m[1]];
      if (!how || !s.customers.has(String(form.get('customer')))) return missing();
      const pm = { id: id('pm'), object: 'payment_method', customer: form.get('customer'), metadata: {}, type: 'card', livemode: false, _how: how };
      s.pms.set(pm.id, pm);
      return reply(200, out(pm));
    }
    if (method === 'POST' && (m = /^\/v1\/payment_methods\/(pm_\w+)$/.exec(p))) {
      const pm = s.pms.get(m[1]);
      if (!pm) return missing();
      Object.assign(pm.metadata, meta(form));
      return reply(200, out(pm));
    }
    // subscriptions
    if (method === 'POST' && p === '/v1/subscriptions') {
      const cus = String(form.get('customer')), pid = String(form.get('items[0][price]'));
      if (!s.customers.has(cus) || !prices.has(pid)) return missing();
      const t = timeOf(cus), pr = priced(pid);
      const sub = {
        id: id('sub'), object: 'subscription', customer: cus, status: 'incomplete', metadata: meta(form), cancel_at_period_end: false, cancel_at: null, canceled_at: null, ended_at: null,
        latest_invoice: null, livemode: false, start_date: t, test_clock: s.customers.get(cus).test_clock,
        items: { object: 'list', data: [{ id: id('si'), object: 'subscription_item', price: pr, quantity: 1, current_period_start: t, current_period_end: plus(t, pr.recurring.interval) }] },
      };
      s.subs.set(sub.id, sub);
      const inv = invoice(sub, 'subscription_create', t);
      const how = howPays(cus);
      if (how === 'ok') { sub.status = 'active'; inv.status = 'paid'; inv.attempt_count = 1; }
      emit('customer.subscription.created', sub);
      if (how === 'ok') emit('invoice.paid', inv); else { inv.attempt_count = 1; open.set(sub.id, inv.id); emit('invoice.payment_failed', inv); }
      return reply(200, sub);
    }
    if ((m = /^\/v1\/subscriptions\/(sub_\w+)$/.exec(p))) {
      const sub = s.subs.get(m[1]);
      if (!sub) return missing();
      if (method === 'GET') return reply(200, sub);
      if (method === 'DELETE') {
        if (sub.status === 'canceled') return invalid('This subscription is already canceled.');
        const t = timeOf(sub.customer);
        Object.assign(sub, { status: 'canceled', ended_at: t, canceled_at: t });
        emit('customer.subscription.deleted', sub);
        return reply(200, sub);
      }
      if (method === 'POST') {
        if (sub.status === 'canceled') return invalid('This subscription is canceled.');
        const t = timeOf(sub.customer), it = item(sub);
        const pid = form.get('items[0][price]');
        /** @type {any} */
        let inv = null;
        if (pid) {
          if (!prices.has(pid) || form.get('items[0][id]') !== it.id) return invalid('No such item or price.');
          const pr = priced(pid);
          if (pr.recurring.interval !== it.price.recurring.interval) { it.current_period_start = t; it.current_period_end = plus(t, pr.recurring.interval); }
          it.price = pr;
          inv = invoice(sub, 'subscription_update', t);
        }
        if (form.has('cancel_at_period_end')) {
          const on = form.get('cancel_at_period_end') === 'true';
          sub.cancel_at_period_end = on;
          sub.cancel_at = on ? it.current_period_end : null;
        }
        if (form.has('cancel_at')) { sub.cancel_at = Number(form.get('cancel_at')); sub.cancel_at_period_end = false; }
        emit('customer.subscription.updated', sub);
        if (inv) attempt(inv, sub, t, howPays(sub.customer));
        return reply(200, sub);
      }
    }
    if (method === 'GET' && p === '/v1/subscriptions') {
      const cus = q.get('customer');
      return reply(200, listOf([...s.subs.values()].filter((x) => x.customer === cus).slice(0, Number(q.get('limit') || 10))));
    }
    // invoices
    if ((m = /^\/v1\/invoices\/(in_\w+)(\/pay)?$/.exec(p))) {
      const inv = s.invoices.get(m[1]);
      if (!inv) return missing();
      if (method === 'GET' && !m[2]) return reply(200, inv);
      if (method === 'POST' && m[2]) {
        if (inv.status !== 'open') return invalid('This invoice is not open.');
        const pm = s.pms.get(String(form.get('payment_method')));
        if (!pm) return missing();
        if (pm._how !== 'ok') return reply(402, { error: { code: 'card_declined', type: 'card_error', message: 'Your card was declined.' } });
        const sub = s.subs.get(inv.parent.subscription_details.subscription);
        attempt(inv, sub, timeOf(inv.customer), 'ok');
        return reply(200, inv);
      }
    }
    // events
    if (method === 'GET' && p === '/v1/events') {
      const type = q.get('type');
      return reply(200, listOf(s.events.filter((e) => !type || e.type === type).reverse().slice(0, Number(q.get('limit') || 10))));
    }
    if (method === 'POST' && (m = /^\/v1\/events\/(evt_\w+)\/retry$/.exec(p))) {
      const ev = s.events.find((e) => e.id === m?.[1]);
      if (!ev || !resend || !s.endpoints.some((e) => e.id === form.get('webhook_endpoint'))) return missing();
      send(ev);
      return reply(200, ev);
    }
    return missing();
  }
  /** metadata[k]=v pairs of a form. @param {URLSearchParams} form */
  function meta(form) {
    return Object.fromEntries([...form].filter(([k]) => /^metadata\[[a-z0-9_]+\]$/.test(k)).map(([k, v]) => [k.slice(9, -1), v]));
  }

  /** The sandbox's fetch (api.stripe.com only). @param {URL} u @param {RequestInit} [init] */
  async function fetch(u, init = {}) {
    const headers = new Headers(init.headers);
    const key = (headers.get('authorization') || '').replace(/^Bearer /, '');
    const method = init.method || 'GET';
    const form = new URLSearchParams(typeof init.body === 'string' ? init.body : '');
    s.calls.push({ method, path: u.pathname, key, version: headers.get('stripe-version') || '', form, at: now() });
    const json = (/** @type {number} */ status, /** @type {unknown} */ body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (!/^[sr]k_test_/.test(key)) return json(401, { error: { type: 'invalid_request_error', message: 'Invalid API key.' } });
    const [status, body] = handle(method, u, form);
    const copy = structuredClone(body);
    if (live(method, u.pathname)) {
      /** @param {any} o */
      const mark = (o) => { if (o && typeof o === 'object') { if ('livemode' in o) o.livemode = true; Object.values(o).forEach(mark); } };
      mark(copy);
    }
    return json(status, copy);
  }
  /** Until every delivery queued so far (and any it queued) is done. */
  async function drain() { let q; do { q = queue; await q; } while (q !== queue); }
  return { s, fetch, drain };
}
