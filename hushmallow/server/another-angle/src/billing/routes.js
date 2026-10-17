// Web subscriptions for hushmallow Flow and hushmallow Beyond, through
// Stripe. Off until configured (src/config.js readBilling, docs/PAYMENTS.md):
// every route answers 503 billing_not_configured until then (503
// accounts_not_configured while the sign-in project is a placeholder, as on
// the staging Worker before its own project exists: docs/STAGING.md), and
// nothing else on the server changes.
//
//   POST /v1/billing/checkout  { plan: 'paid'|'ultra', period: 'monthly'|'yearly' } with the account's
//                              Supabase access token (Authorization: Bearer) → { url } (Stripe-hosted Checkout,
//                              subscription mode, the owner's Checkout Studio settings (CHECKOUT_STUDIO), the
//                              account's one Stripe customer, client_reference_id = the
//                              account id; back to APP_ORIGIN, ?billing=success&session_id=cs_…). Only a price that
//                              is what its slot says (CHECKOUT_PRICE_RULES) is sold, and only to an account with no
//                              subscription at Stripe, unpaid ones included (409 already_subscribed | payment_pending)
//   GET  /v1/billing/status    the account's token → { tier, status, current_period_end, cancel_at_period_end, ends_at, manageable }
//   POST /v1/billing/sync      { session_id: 'cs_…' } (back from Checkout) → the status body, once that session's
//                              subscription is read from Stripe and recorded (the webhook may still be on its way)
//   POST /v1/billing/portal    {} | { intent: 'switch' } → { url } (Stripe's customer portal: cancel, change plan, card,
//                              receipts); 'switch' opens the plan change itself → { url, flow: 'subscription_update' | 'portal' }
//   POST /v1/billing/webhook   Stripe's events, signed (Stripe-Signature); no Origin, the signature is the check
//                              (EVENTS: checkout.session.*, customer.subscription.*, invoice.*; each re-reads its subscription)
//
// Who is asking is decided by the sign-in project (account.js); what they
// have is decided only by Stripe's signed events, kept in the Billing
// Durable Object (store.js). A browser can never say it has a plan. The
// webhook reads each subscription back from Stripe, so events arriving out
// of order, or twice, cannot leave an old state behind (and each event id is
// applied once). Logs carry metadata only (src/log.js): never an account id,
// email, Stripe id, token or amount.

import { json, error, readJson, readText } from '../http.js';
import { allow, memoryRateLimiter } from '../limits/ratelimit.js';
import { createStripe, verifyWebhookSignature } from './stripe.js';
import { createAccountVerifier, uidOf } from './account.js';
import { billingClient, summarise, effectiveTier, givesAccess, accessUntil, idOf, priceMismatch, noLookupKey, bestOf, ACCESS, TERMINAL } from './store.js';

export const PATHS = Object.freeze({ checkout: '/v1/billing/checkout', status: '/v1/billing/status', sync: '/v1/billing/sync', portal: '/v1/billing/portal', webhook: '/v1/billing/webhook' });
/**
 * The events the webhook endpoint should send (docs/PAYMENTS.md); any other is acknowledged and ignored. Each one
 * re-reads its subscription, so Stripe's status decides access: a delayed payment's checkout (async_payment_*), a
 * renewal or a recovery whose customer.subscription.updated was lost (invoice.paid) all still land.
 */
export const EVENTS = Object.freeze([
  'checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
  'customer.subscription.paused', 'customer.subscription.resumed',
  'invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required',
]);
export const WEBHOOK_MAX_BYTES = 262144;
/**
 * Checkouts for the same account, plan and period within one such window (replacing the same previous session) share
 * an idempotency key, so two tabs starting at once get one Checkout Session (paid once), never two subscriptions.
 * Short, because Stripe gives back the first answer to a key, a failure included.
 */
export const CHECKOUT_WINDOW_MS = 120000;
/**
 * What a price must be in Stripe before checkout sells it (decisions D2, D3, D11, and the owner's USD decision of
 * 2026-10-17). US dollars only (Adaptive Pricing off: the plans page and the terms say US$), its default currency and
 * every other it carries (currency_options, read expanded: Checkout would charge some customers in one of those, as
 * the session sends no currency); recurring every one month or one year, as its period; the owner's amount for its
 * slot (unit_amount, in US cents: D2, the amounts the app's BILLING_PRICES shows); and active. Its lookup key, if it has one, names the plan and period of the slot it sits in; a
 * price with no lookup key is sold, and its configured id is then what maps it to a plan (store.js planForPrice). The
 * four amounts differ, so two ids swapped while pasting never sell Beyond at Flow's price, or the reverse, with lookup
 * keys or without, in either Stripe mode (the sandbox driver cannot read live prices). Its tax behaviour: any while
 * Stripe Tax is off; with STRIPE_AUTOMATIC_TAX on, one of tax_behavior (never 'unspecified': Stripe must know whether
 * the amount includes the tax). A price the owner changes changes here, in BILLING_PRICES and in Stripe together (D2).
 */
export const CHECKOUT_PRICE_RULES = Object.freeze({
  currency: 'usd',
  tax_behavior: Object.freeze(['inclusive', 'exclusive']),
  interval: Object.freeze({ monthly: 'month', yearly: 'year' }),
  unit_amount: Object.freeze({ paid: Object.freeze({ monthly: 999, yearly: 9999 }), ultra: Object.freeze({ monthly: 1999, yearly: 19999 }) }),
});
/** How long a price read for that check is trusted in this isolate: one read per price id in that time, and a price fixed in Stripe sells within it. */
export const CHECKOUT_PRICE_CACHE_MS = 600000;
/**
 * Checkout's integration_identifier (Stripe's label for comparing checkout flows in the Dashboard): the owner's Checkout
 * Studio value. Stripe takes it from API version CHECKOUT_INTEGRATION_IDENTIFIER_SINCE on, so it is sent only when
 * STRIPE_API_VERSION pins that or a later one (wrangler.toml pins 2026-08-26.dahlia): unpinned or older, Stripe would
 * refuse the parameter.
 */
export const CHECKOUT_INTEGRATION_IDENTIFIER = 'hosted_web_0001';
export const CHECKOUT_INTEGRATION_IDENTIFIER_SINCE = '2026-03-25';
/**
 * The owner's Checkout Studio settings (docs/integration/DECISIONS.md, 2026-10-17), on every Checkout Session exactly as
 * given. ui_mode 'hosted_page' is the Stripe-hosted page on the pinned API version (older versions name it 'hosted');
 * submit_type 'auto' lets Checkout word the button; no payment_method_types, ever (dynamic payment methods, D10).
 * With STRIPE_AUTOMATIC_TAX on, CHECKOUT_TAX replaces two of them (checkoutSettings).
 */
export const CHECKOUT_STUDIO = Object.freeze({
  ui_mode: 'hosted_page',
  billing_address_collection: 'auto',
  phone_number_collection: Object.freeze({ enabled: false }),
  automatic_tax: Object.freeze({ enabled: false }),
  allow_promotion_codes: false,
  payment_method_collection: 'always',
  submit_type: 'auto',
  origin_context: 'web',
});
/**
 * Stripe Tax on (D3, only once an active registration is verified): automatic_tax on, and the address typed at checkout
 * asked for (billing_address_collection 'required'), taxed and saved on the account's customer (customer_update), not a
 * saved one. Deliberately overrides the Studio's automatic_tax and billing_address_collection.
 */
export const CHECKOUT_TAX = Object.freeze({
  automatic_tax: Object.freeze({ enabled: true }),
  billing_address_collection: 'required',
  customer_update: Object.freeze({ address: 'auto' }),
});
/**
 * Statuses in which the account still has a subscription at Stripe, so checkout sells it no second one (409
 * already_subscribed: the portal pays or cancels it). Those giving access, and unpaid and paused: they give none but
 * stay in place, and paying an unpaid one's open invoice (or resuming a paused one) makes it active again, next to
 * the second one, both billing.
 */
export const HELD_STATUSES = new Set([...ACCESS, 'unpaid', 'paused']);
/** Stripe's default lifetime of a Checkout Session: for an answer without expires_at. */
const CHECKOUT_SESSION_TTL_MS = 86400000;
const PLANS = ['paid', 'ultra'];
const SUB = /^sub_/;
const PERIODS = ['monthly', 'yearly'];
/** A Checkout Session id, and its Stripe mode. */
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/;

/**
 * @typedef {import('../config.js').Config} Config
 * @typedef {{ ok: true, uid: string } | { ok: false, status: number, code: string }} AccountResult
 * @typedef {{ http: number, outcome: string, tier?: string, subStatus?: string, duplicate?: boolean, err?: string, stripeHttp?: number }} Recorded
 *   what recording a subscription did (err and stripeHttp: Stripe's code and HTTP status when a call failed; 0 = no answer)
 */

/** The bearer token on a request, or null. @param {Request} request */
export function bearerOf(request) {
  const m = /^Bearer ([A-Za-z0-9._-]{10,4096})$/.exec(request.headers.get('authorization') || '');
  return m ? m[1] : null;
}

/**
 * @param {{ logger: { event(f: Record<string, unknown>): unknown }, now: () => number, fetch?: typeof fetch,
 *   ipKey: (request: Request, cfg: Config) => Promise<string> }} deps
 */
export function createBilling({ logger, now, fetch: fetchImpl = (input, init) => fetch(input, init), ipKey }) {
  const limiter = memoryRateLimiter({ limit: 20, periodMs: 60000, now });   // as BILLING_IP_LIMITER in wrangler.toml
  /** @type {Map<string, ReturnType<typeof createAccountVerifier>>} */
  const verifiers = new Map();

  /** Billing is on: configured, and the Durable Object is bound (never an in-memory stand-in in production). @param {Record<string, any>} env @param {Config} cfg */
  const ready = (env, cfg) => cfg.billing.configured && !!env.BILLING;
  /**
   * Why billing is off (never a value): 'accounts_not_configured' while the sign-in project is a placeholder
   * (the staging Worker before its own project exists, docs/STAGING.md); the key's refusal (src/config.js:
   * 'live_key_on_staging', 'test_key_on_production', 'live_not_approved'); with no price left to sell,
   * 'duplicate_prices' when one id sits in two slots (src/config.js duplicateSlots) and 'placeholder_prices' when one is
   * still a placeholder such as price_TODO_owner (staging before the owner's test ids); else 'not_configured'.
   * @param {Config} cfg
   */
  const offReason = (cfg) => {
    if (cfg.billing.accountsPlaceholder) return 'accounts_not_configured';
    if (cfg.billing.keyRefused) return cfg.billing.keyRefused;
    const p = cfg.billing.prices;
    if ([p.paid, p.ultra].some((x) => !!(x.monthly || x.yearly))) return 'not_configured';
    if (cfg.billing.duplicateSlots.length > 0) return 'duplicate_prices';
    return cfg.billing.placeholderPrices > 0 ? 'placeholder_prices' : 'not_configured';
  };
  /** The 503's code for offReason(). @param {Config} cfg */
  const offCode = (cfg) => (offReason(cfg) === 'accounts_not_configured' ? 'accounts_not_configured' : 'billing_not_configured');
  /** The 503's message for offReason(). @param {Config} cfg */
  const offMessage = (cfg) => {
    const r = offReason(cfg);
    if (r === 'accounts_not_configured') return 'Web subscriptions are not set up on this server: accounts are not configured (its sign-in project, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, is still a placeholder).';
    if (r === 'live_not_approved') return 'Web subscriptions are not set up on this server: live billing is not approved (BILLING_LIVE).';
    if (r === 'live_key_on_staging' || r === 'test_key_on_production') return 'Web subscriptions are not set up on this server: its Stripe key is not for this stage.';
    if (r === 'duplicate_prices') return 'Web subscriptions are not set up on this server: the same Stripe price id is in more than one of its price slots.';
    return r === 'placeholder_prices'
      ? 'Web subscriptions are not set up on this server: its Stripe price ids are still placeholders (price_TODO…).'
      : 'Web subscriptions are not set up on this server.';
  };
  /** @param {Config} cfg */
  const stripeFor = (cfg) => createStripe({ secretKey: cfg.billing.secretKey, apiVersion: cfg.billing.apiVersion, fetch: fetchImpl });
  /** @param {Config} cfg */
  const verifierFor = (cfg) => {
    const k = `${cfg.billing.supabaseUrl}|${cfg.billing.supabaseKey}`;
    let v = verifiers.get(k);
    if (!v) { v = createAccountVerifier({ url: cfg.billing.supabaseUrl, key: cfg.billing.supabaseKey, fetch: fetchImpl, now }); verifiers.set(k, v); }
    return v;
  };
  /** @param {string | null} token @param {Config} cfg @returns {Promise<AccountResult>} */
  const account = (token, cfg) => verifierFor(cfg)(token);
  /** @param {Record<string, any>} env */
  const storeFor = (env) => billingClient(env.BILLING);

  /** @param {string} route @param {number} t0 @param {Record<string, unknown>} f */
  const log = (route, t0, f) => logger.event({ evt: 'billing', route, latency_ms: now() - t0, ...f });

  /**
   * The checks every browser route shares: on, burst limit, the account. → { uid } or a Response.
   * @param {string} route @param {Request} request @param {Record<string, any>} env @param {Config} cfg @param {Record<string, string>} cors @param {number} t0
   * @returns {Promise<{ uid: string } | Response>}
   */
  async function signedIn(route, request, env, cfg, cors, t0) {
    if (!ready(env, cfg)) { log(route, t0, { status: 'off', http: 503, err: offReason(cfg) }); return error(503, offCode(cfg), offMessage(cfg), cors); }
    if (!(await allow(env.BILLING_IP_LIMITER, limiter, await ipKey(request, cfg)))) {
      log(route, t0, { status: 'rate_limited', http: 429 });
      return error(429, 'rate_limited', 'Too many requests. Try again in a minute.', { ...cors, 'retry-after': '60' });
    }
    const a = await account(bearerOf(request), cfg);
    if (!a.ok) {
      log(route, t0, { status: 'denied', http: a.status, err: a.code });
      return error(a.status, a.code, a.code === 'account_required' ? 'Sign in to a hushmallow account first.' : 'The account could not be checked just now.', { ...cors, ...(a.status === 401 ? { 'www-authenticate': 'Bearer realm="billing"' } : {}) });
    }
    return { uid: a.uid };
  }

  /** @param {number | null | undefined} ms */
  const iso = (ms) => (typeof ms === 'number' ? new Date(ms).toISOString() : null);
  /**
   * The status body. ends_at: when the plan ends, if it is set to (the cancel_at date, else the period end when it
   * cancels at period end), so Settings can say "Ends on …"; null while it renews.
   * @param {any} rec @returns {Record<string, unknown>}
   */
  const statusBody = (rec) => (rec ? {
    tier: effectiveTier(rec, now()), status: rec.status,
    current_period_end: iso(rec.current_period_end),
    cancel_at_period_end: !!rec.cancel_at_period_end,
    ends_at: rec.cancel_at != null ? iso(rec.cancel_at) : rec.cancel_at_period_end ? iso(rec.current_period_end) : null,
    manageable: !!rec.customer,
  } : { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, ends_at: null, manageable: false });

  /** @type {Map<string, { at: number, price: any }>} */
  const priceCache = new Map();
  /**
   * The configured price as Stripe has it, against CHECKOUT_PRICE_RULES (read once per CHECKOUT_PRICE_CACHE_MS).
   * → { ok: true } | { ok: false, fault } (not to be sold: the rule it breaks; not_found: no such price for this key)
   *   | { ok: false, code, status } (Stripe did not answer it: nothing is cached)
   * @param {Config} cfg @param {'paid' | 'ultra'} plan @param {'monthly' | 'yearly'} period @param {string} id
   * @returns {Promise<{ ok: true } | { ok: false, fault?: string, code?: string, status?: number }>}
   */
  async function checkPrice(cfg, plan, period, id) {
    const key = `${cfg.billing.keyMode}:${id}`;
    let hit = priceCache.get(key);
    if (!hit || now() - hit.at >= CHECKOUT_PRICE_CACHE_MS) {
      const r = await stripeFor(cfg).retrievePrice(id);
      if (!r.ok) return r.status === 404 ? { ok: false, fault: 'not_found' } : { ok: false, code: r.code, status: r.status };
      if (priceCache.size >= 64) priceCache.clear();
      hit = { at: now(), price: r.data };
      priceCache.set(key, hit);
    }
    const fault = priceFault(hit.price, plan, period, cfg.billing.automaticTax);
    return fault ? { ok: false, fault } : { ok: true };
  }

  /**
   * The account's one Stripe customer: the one kept for it, else its subscription's (a record from before customers
   * were made here), else a new one made for it with metadata[user_id] only (no email or name, decision D13: Checkout
   * asks for the email). Linked to the account first, then kept once: a request racing this one is told the same one.
   * (Replaced only once Stripe has deleted it: replaceCustomer.)
   * @param {string} uid @param {any} rec @param {Config} cfg @param {ReturnType<typeof billingClient>} store
   * @returns {Promise<{ ok: true, customer: string, fresh: boolean } | { ok: false, conflict?: true, err?: string, stripeHttp?: number }>}
   */
  async function customerFor(uid, rec, cfg, store) {
    const before = idOf(rec?.customer);
    let customer = (await store.customerOf(uid)) || (before?.startsWith('cus_') ? before : null), fresh = false;
    if (!customer) {
      const c = await stripeFor(cfg).createCustomer({ metadata: { user_id: uid } }, { idempotencyKey: `customer:${uid}` });
      const id = c.ok ? idOf(c.data?.id) : null;
      if (!id || !id.startsWith('cus_')) return c.ok ? { ok: false, err: 'customer:no_id' } : { ok: false, err: `customer:${c.code}`, stripeHttp: c.status };
      customer = id;
      fresh = true;
    }
    if ((await store.link(customer, uid)).conflict) return { ok: false, conflict: true };
    const kept = await store.setCustomer(uid, customer);
    return { ok: true, customer: kept.customer, fresh: fresh && kept.customer === customer };
  }

  /**
   * Stripe no longer has this customer: it reads back deleted (a Dashboard clean-up, an erasure, a sandbox's test
   * clock deleted with its customers), or this key cannot find it (404). Asked only after a call naming the customer
   * answered resource_missing, which may also be about something else.
   * @param {ReturnType<typeof createStripe>} stripe @param {string} customer
   */
  async function customerGone(stripe, customer) {
    const c = await stripe.retrieveCustomer(customer);
    return c.ok ? c.data?.deleted === true : c.status === 404;
  }

  /**
   * The account's kept customer, deleted at Stripe, replaced by a new one (else every checkout of the account fails for
   * good): made as customerFor makes one, under a key of its own (customer:<account>:<the deleted id>, never Stripe's
   * first answer again), linked, then swapped in only while the deleted one is still kept (a racing request's swap,
   * the same customer by that key, stands).
   * @param {string} uid @param {string} gone @param {Config} cfg @param {ReturnType<typeof billingClient>} store
   * @returns {Promise<{ ok: true, customer: string, fresh: boolean } | { ok: false, conflict?: true, err?: string, stripeHttp?: number }>}
   */
  async function replaceCustomer(uid, gone, cfg, store) {
    const c = await stripeFor(cfg).createCustomer({ metadata: { user_id: uid } }, { idempotencyKey: `customer:${uid}:${gone.slice(-24)}` });
    const id = c.ok ? idOf(c.data?.id) : null;
    if (!id || !id.startsWith('cus_')) return c.ok ? { ok: false, err: 'customer:no_id' } : { ok: false, err: `customer:${c.code}`, stripeHttp: c.status };
    if ((await store.link(id, uid)).conflict) return { ok: false, conflict: true };
    const kept = await store.replaceCustomer(uid, gone, id);
    if (!kept.customer) return { ok: false, err: 'customer:replace' };
    logger.event({ evt: 'billing', route: 'checkout', status: 'customer_replaced' });
    return { ok: true, customer: kept.customer, fresh: kept.customer === id };
  }

  /**
   * The account's last Checkout Session, settled before another one is made, so an account never has two it could
   * pay. Still open for the same plan, period, price, customer and tax: handed back as it is (a second tab or tap pays
   * the same session, once). Open for anything else: expired first. Already paid: its subscription is on its way
   * (payment_pending), unless Stripe's list shows that subscription ended. Gone, past its expiry, or of the other
   * Stripe mode (this key can neither read nor pay it): nothing to do.
   * @param {string} uid @param {ReturnType<typeof billingClient>} store @param {ReturnType<typeof createStripe>} stripe
   * @param {Config} cfg @param {{ plan: string, period: string, price: string, customer: string }} want @param {any[]} subs the customer's, as listed
   * @returns {Promise<{ prev: string | null, reuse?: string, pending?: true, err?: string, stripeHttp?: number }>}
   */
  async function settlePrevious(uid, store, stripe, cfg, want, subs) {
    const last = await store.lastCheckout(uid);
    const m = last ? SESSION_ID.exec(last.id) : null;
    if (!last || !m || m[1] !== cfg.billing.keyMode || last.expires_at <= now()) return { prev: null };
    const prev = last.id;
    let got = await stripe.retrieveCheckoutSession(prev);
    if (!got.ok) return got.status === 404 ? { prev } : { prev, err: `session:${got.code}`, stripeHttp: got.status };
    /** @type {any} */
    let s = got.data;
    if (s?.status === 'open') {
      const same = s.metadata?.plan === want.plan && s.metadata?.period === want.period && s.metadata?.price === want.price
        && idOf(s.customer) === want.customer && !!s.automatic_tax?.enabled === cfg.billing.automaticTax;
      const url = same ? httpsUrl(s.url) : null;
      if (url) return { prev, reuse: url };
      const x = await stripe.expireCheckoutSession(prev);
      if (x.ok) return { prev };
      // refused: it may have been paid that moment; read it again to see
      got = await stripe.retrieveCheckoutSession(prev);
      s = got.ok ? got.data : null;
      if (!s || s.status === 'open') return { prev, err: `expire:${x.code}`, stripeHttp: x.status };
    }
    if (s?.status === 'complete') {
      const sub = idOf(s.subscription);
      if (!subs.some((x) => idOf(x?.id) === sub && TERMINAL.has(x.status))) return { prev, pending: true };
    }
    return { prev };
  }

  /** @param {Request} request @param {Record<string, any>} env @param {Config} cfg @param {Record<string, string>} cors */
  async function checkout(request, env, cfg, cors) {
    const t0 = now();
    const who = await signedIn('checkout', request, env, cfg, cors, t0);
    if (who instanceof Response) return who;
    const body = await readJson(request, 512);
    if (!body.ok) return error(body.status, body.code, body.message, cors);
    const b = /** @type {any} */ (body.value);
    if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).some((k) => !['plan', 'period'].includes(k))) return error(400, 'invalid_body', 'Send { plan, period } only.', cors);
    if (!PLANS.includes(b.plan)) return error(400, 'invalid_plan', 'plan must be "paid" or "ultra".', cors, { field: 'plan' });
    if (!PERIODS.includes(b.period)) return error(400, 'invalid_period', 'period must be "monthly" or "yearly".', cors, { field: 'period' });
    const plan = /** @type {'paid' | 'ultra'} */ (b.plan), period = /** @type {'monthly' | 'yearly'} */ (b.period);
    const price = cfg.billing.prices[plan][period];
    if (!price) {
      // a slot whose id is also in another slot is never sold (src/config.js duplicateSlots): the log says so
      log('checkout', t0, { status: 'no_price', http: 503, plan, period, ...(cfg.billing.duplicateSlots.includes(`${plan}.${period}`) ? { err: 'duplicate_price' } : {}) });
      return error(503, 'price_not_configured', 'This plan is not on sale yet.', cors);
    }
    /** @param {string} err @param {number} [stripeHttp] */
    const unavailable = (err, stripeHttp) => {
      log('checkout', t0, { status: 'stripe_error', http: 502, plan, period, err: err.slice(0, 48), stripe_http: stripeHttp });
      return error(502, 'billing_unavailable', 'The checkout could not be started just now.', cors);
    };
    /** @param {'already_subscribed' | 'payment_pending'} code @param {string} err */
    const taken = (code, err) => {
      log('checkout', t0, { status: code, http: 409, plan, period, err });
      return code === 'already_subscribed'
        ? error(409, code, 'This account already has a subscription; change it in the portal.', cors)
        : error(409, code, 'A payment for this account is still going through.', cors);
    };
    const store = storeFor(env);
    const rec = await store.get(who.uid);
    // one subscription per account, whatever plan it maps to (an unmapped price included), unpaid or not (HELD_STATUSES):
    // a change of plan (Flow → Beyond) or period, or paying what is owed, happens in the portal. The record decides
    // alone only while it gives access (givesAccess). One that gives none (unpaid, paused, past_due past its cap, its
    // period over) may be out of date (its last events lost, a year ahead on a yearly plan): Stripe's list below decides
    // instead, and still stops one held there, so a lost end never blocks checkout.
    if (rec && givesAccess(rec, now())) return taken('already_subscribed', 'record');
    // the price is what its slot says, or nothing is sold (and no customer made)
    const checked = await checkPrice(cfg, plan, period, price);
    if (!checked.ok && checked.fault) {
      log('checkout', t0, { status: 'price_misconfigured', http: 503, plan, period, err: checked.fault });
      return error(503, 'price_misconfigured', 'This plan is not on sale just now.', cors);
    }
    if (!checked.ok) return unavailable(`price:${checked.code}`, checked.status);
    /** @param {{ conflict?: true, err?: string, stripeHttp?: number }} c */
    const noCustomer = (c) => {
      if (!c.conflict) return unavailable(c.err || 'customer', c.stripeHttp);
      log('checkout', t0, { status: 'customer_conflict', http: 409, plan, period });
      return error(409, 'customer_conflict', 'This account\'s billing needs a look from support.', cors);
    };
    let cust = await customerFor(who.uid, rec, cfg, store);
    if (!cust.ok) return noCustomer(cust);
    const stripe = stripeFor(cfg);
    // Stripe's own word, ahead of the webhook: a subscription paid (or being paid) whose events are still on their way.
    // A customer made just now has none.
    let listed = cust.fresh ? null : await stripe.listSubscriptions(cust.customer);
    if (listed && !listed.ok && listed.code === 'resource_missing' && await customerGone(stripe, cust.customer)) {
      cust = await replaceCustomer(who.uid, cust.customer, cfg, store);
      if (!cust.ok) return noCustomer(cust);
      listed = cust.fresh ? null : await stripe.listSubscriptions(cust.customer);
    }
    let { customer } = cust;
    /** @type {any[]} */
    let subs = [];
    if (listed) {
      if (!listed.ok) return unavailable(`list:${listed.code}`, listed.status);
      subs = (Array.isArray(listed.data?.data) ? listed.data.data : []).filter((/** @type {any} */ x) => SUB.test(idOf(x?.id) || '') && idOf(x.customer) === customer);
      if (subs.some((x) => HELD_STATUSES.has(x.status))) return taken('already_subscribed', 'listed');
      if (subs.some((x) => x.status === 'incomplete')) return taken('payment_pending', 'incomplete');
    }
    const prev = await settlePrevious(who.uid, store, stripe, cfg, { plan, period, price, customer }, subs);
    if (prev.err) return unavailable(prev.err, prev.stripeHttp);
    if (prev.pending) return taken('payment_pending', 'session_complete');
    if (prev.reuse) { log('checkout', t0, { status: 'reused', http: 200, plan, period }); return json(200, { url: prev.reuse }, cors); }
    const back = cfg.billing.appOrigin;
    // the session this one replaces is part of the key: Stripe never hands back the one just expired
    const idempotencyKey = `checkout:${who.uid}:${plan}:${period}:${Math.floor(now() / CHECKOUT_WINDOW_MS)}:${prev.prev ? prev.prev.slice(-24) : '-'}`;
    // the Studio's settings (CHECKOUT_STUDIO: no payment_method_types, D10; no promotion codes, D14), no trial and no
    // email (D13)
    /** @param {string} customer @param {string} key */
    const create = (customer, key) => stripe.createCheckoutSession({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      // kept although the Studio lists none of the four: they tie the payment to the account (webhook, sync, entitlement)
      customer,
      client_reference_id: who.uid,
      // Stripe puts the session's id in place of {CHECKOUT_SESSION_ID}: the app asks POST /v1/billing/sync with it
      success_url: `${back}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${back}/?billing=cancel`,
      metadata: { user_id: who.uid, plan, period, price },
      subscription_data: { metadata: { user_id: who.uid } },
      // the Studio's values; Stripe Tax on (D3: STRIPE_AUTOMATIC_TAX) replaces two of them (CHECKOUT_TAX)
      ...checkoutSettings(cfg.billing.automaticTax),
      ...(integrationIdentifierOn(cfg.billing.apiVersion) ? { integration_identifier: CHECKOUT_INTEGRATION_IDENTIFIER } : {}),
    }, { idempotencyKey: key });
    let r = await create(customer, idempotencyKey);
    // the customer deleted although Stripe's list did not say so: replaced, and the session made once more for the new
    // one, under a key naming it (Stripe may keep the refusal as the first key's answer)
    if (!r.ok && r.code === 'resource_missing' && await customerGone(stripe, customer)) {
      const next = await replaceCustomer(who.uid, customer, cfg, store);
      if (!next.ok) return noCustomer(next);
      customer = next.customer;
      r = await create(customer, `${idempotencyKey}:${customer.slice(-24)}`);
    }
    const url = r.ok ? httpsUrl(r.data?.url) : null;
    if (!r.ok || !url) return unavailable(r.ok ? 'no_url' : r.code, r.ok ? undefined : r.status);
    const id = String(r.data?.id || '');
    if (SESSION_ID.test(id)) {
      const exp = Number(r.data.expires_at);
      await store.setCheckout(who.uid, { id, expires_at: exp > 0 ? exp * 1000 : now() + CHECKOUT_SESSION_TTL_MS });
    }
    log('checkout', t0, { status: 'ok', http: 200, plan, period });
    return json(200, { url }, cors);
  }

  /** @param {Request} request @param {Record<string, any>} env @param {Config} cfg @param {Record<string, string>} cors */
  async function status(request, env, cfg, cors) {
    const t0 = now();
    const who = await signedIn('status', request, env, cfg, cors, t0);
    if (who instanceof Response) return who;
    const out = statusBody(await storeFor(env).get(who.uid));
    log('status', t0, { status: 'ok', http: 200, tier: out.tier, sub_status: out.status });
    return json(200, out, cors);
  }

  /**
   * Back from Checkout (success_url's session_id): that session's subscription read from Stripe and recorded now, through
   * the webhook's own path (recordSubscription, no event id), so the plan shows without waiting for the webhook. Only
   * the account that started the session, and only once it is complete; the answer is the status body.
   * @param {Request} request @param {Record<string, any>} env @param {Config} cfg @param {Record<string, string>} cors
   */
  async function sync(request, env, cfg, cors) {
    const t0 = now();
    const who = await signedIn('sync', request, env, cfg, cors, t0);
    if (who instanceof Response) return who;
    const body = await readJson(request, 512);
    if (!body.ok) return error(body.status, body.code, body.message, cors);
    const b = /** @type {any} */ (body.value);
    if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).some((k) => k !== 'session_id')) return error(400, 'invalid_body', 'Send { session_id } only.', cors);
    const m = typeof b.session_id === 'string' ? SESSION_ID.exec(b.session_id) : null;
    // a session of the other Stripe mode was never made with this server's key
    if (!m || m[1] !== cfg.billing.keyMode) {
      log('sync', t0, { status: 'invalid', http: 400, err: m ? 'mode_mismatch' : 'session_id' });
      return error(400, 'invalid_session', 'session_id is not a Checkout Session of this server.', cors, { field: 'session_id' });
    }
    const got = await stripeFor(cfg).retrieveCheckoutSession(b.session_id);
    if (!got.ok && got.status === 404) { log('sync', t0, { status: 'not_found', http: 404, err: got.code }); return error(404, 'session_not_found', 'There is no such checkout.', cors); }
    /** @param {string} err @param {number} [stripeHttp] */
    const unavailable = (err, stripeHttp) => {
      log('sync', t0, { status: 'stripe_error', http: 502, err: err.slice(0, 48), stripe_http: stripeHttp });
      return error(502, 'billing_unavailable', 'The plan could not be checked just now.', cors);
    };
    if (!got.ok) return unavailable(got.code, got.status);
    const s = got.data;
    // another account's session id says nothing about it, whatever its state
    if (uidOf(s?.client_reference_id) !== who.uid) { log('sync', t0, { status: 'not_yours', http: 403 }); return error(403, 'not_yours', 'This checkout belongs to another account.', cors); }
    if (s.mode !== 'subscription' || s.status !== 'complete') {
      log('sync', t0, { status: 'not_complete', http: 409, err: s.mode !== 'subscription' ? 'not_subscription' : String(s.status).slice(0, 24) });
      return error(409, 'checkout_not_complete', 'This checkout has not been completed.', cors);
    }
    const subId = idOf(s.subscription);
    if (!subId || !SUB.test(subId)) return unavailable('no_subscription');
    const r = await recordSubscription({ subId, uidHint: who.uid, obj: s, eventType: 'checkout.session.completed', created: Math.floor(now() / 1000), eventId: null }, env, cfg);
    const ok = r.outcome === 'applied' || r.outcome === 'stale';
    const http = ok ? 200 : r.outcome === 'customer_conflict' ? 409 : 502;
    log('sync', t0, { status: r.outcome, http, tier: r.tier, sub_status: r.subStatus, err: r.err, stripe_http: r.stripeHttp });
    if (r.outcome === 'customer_conflict') return error(409, 'customer_conflict', 'This account\'s billing needs a look from support.', cors);
    if (!ok) return error(502, 'billing_unavailable', 'The plan could not be checked just now.', cors);
    return json(200, statusBody(await storeFor(env).get(who.uid)), cors);
  }

  /**
   * {} (or no body) opens the portal's home; { intent: 'switch' } (Flow → Beyond, monthly → yearly) opens the plan
   * change of the account's subscription itself, while it gives access. Stripe refuses that flow when the portal does
   * not let customers switch plans (a Dashboard setting): the home opens instead, and the log says so.
   * @param {Request} request @param {Record<string, any>} env @param {Config} cfg @param {Record<string, string>} cors
   */
  async function portal(request, env, cfg, cors) {
    const t0 = now();
    const who = await signedIn('portal', request, env, cfg, cors, t0);
    if (who instanceof Response) return who;
    /** @type {Awaited<ReturnType<typeof readJson>>} */
    const body = !request.body && !request.headers.get('content-type') ? { ok: true, value: {} } : await readJson(request, 256);
    if (!body.ok) return error(body.status, body.code, body.message, cors);
    const b = /** @type {any} */ (body.value);
    if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).some((k) => k !== 'intent')) return error(400, 'invalid_body', 'Send {} or { intent: "switch" } only.', cors);
    if (b.intent !== undefined && b.intent !== 'switch') return error(400, 'invalid_intent', 'intent must be "switch".', cors, { field: 'intent' });
    const rec = await storeFor(env).get(who.uid);
    if (!rec?.customer) { log('portal', t0, { status: 'no_subscription', http: 404 }); return error(404, 'no_subscription', 'This account has no web subscription yet.', cors); }
    const stripe = stripeFor(cfg);
    const home = { customer: rec.customer, return_url: `${cfg.billing.appOrigin}/?billing=portal` };
    const flow = b.intent === 'switch' && SUB.test(rec.subscription || '') && ACCESS.has(rec.status);
    let r = await stripe.createPortalSession(flow ? { ...home, flow_data: { type: 'subscription_update', subscription_update: { subscription: rec.subscription } } } : home);
    /** @type {{ code: string, status: number } | null} */
    let refused = null;
    if (flow && !r.ok && r.status === 400) { refused = { code: r.code, status: r.status }; r = await stripe.createPortalSession(home); }
    const url = r.ok ? httpsUrl(r.data?.url) : null;
    if (!url) { log('portal', t0, { status: 'stripe_error', http: 502, err: r.ok ? 'no_url' : r.code, stripe_http: r.ok ? undefined : r.status }); return error(502, 'billing_unavailable', 'The portal could not be opened just now.', cors); }
    log('portal', t0, refused ? { status: 'switch_fallback', http: 200, err: refused.code, stripe_http: refused.status } : { status: 'ok', http: 200 });
    if (b.intent !== 'switch') return json(200, { url }, cors);
    return json(200, { url, flow: flow && !refused ? 'subscription_update' : 'portal' }, cors);
  }

  /**
   * Stripe's events. 2xx tells Stripe it is done; anything else is retried by
   * Stripe for up to three days (a missing setting, Stripe or the Durable
   * Object unreachable), which is what is wanted.
   * @param {Request} request @param {Record<string, any>} env @param {Config} cfg
   */
  async function webhook(request, env, cfg) {
    const t0 = now();
    if (request.method !== 'POST') return error(405, 'method_not_allowed', 'Method not allowed.', { allow: 'POST' });
    if (!cfg.billing.webhookSecret) { log('webhook', t0, { status: 'off', http: 503 }); return error(503, 'billing_not_configured', 'STRIPE_WEBHOOK_SECRET is not set.'); }
    const raw = await readText(request, WEBHOOK_MAX_BYTES);
    if (!raw.ok) { log('webhook', t0, { status: 'invalid', http: raw.status, err: raw.code }); return error(raw.status, raw.code, raw.message); }
    const sig = await verifyWebhookSignature(raw.value, request.headers.get('stripe-signature'), cfg.billing.webhookSecret, now());
    if (!sig.ok) { log('webhook', t0, { status: 'bad_signature', http: 400, err: sig.code }); return error(400, 'bad_signature', 'The Stripe signature does not match.'); }
    /** @type {any} */
    let event;
    try { event = JSON.parse(raw.value); } catch { log('webhook', t0, { status: 'invalid', http: 400, err: 'invalid_json' }); return error(400, 'invalid_json', 'Body is not valid JSON.'); }
    if (!event || typeof event !== 'object' || typeof event.id !== 'string' || !/^evt_[A-Za-z0-9]{1,250}$/.test(event.id) || typeof event.type !== 'string') {
      log('webhook', t0, { status: 'invalid', http: 400, err: 'invalid_event' });
      return error(400, 'invalid_event', 'Not a Stripe event.');
    }
    const type = event.type.slice(0, 48);
    if (!EVENTS.includes(type)) { log('webhook', t0, { status: 'ignored', http: 200, stripe_event: type }); return json(200, { received: true }); }
    if (!ready(env, cfg)) { log('webhook', t0, { status: 'off', http: 503, stripe_event: type, err: offReason(cfg) }); return error(503, offCode(cfg), offMessage(cfg)); }
    // an event of the other mode (the test endpoint's whsec_ next to a live key, or the reverse) never gives a plan;
    // checked once billing is on, so while it is off every event waits (503) instead of being dropped
    if (event.livemode !== (cfg.billing.keyMode === 'live')) { log('webhook', t0, { status: 'mode_mismatch', http: 200, stripe_event: type }); return json(200, { received: true }); }
    const r = await apply(event, env, cfg);
    log('webhook', t0, { status: r.outcome, http: r.http, stripe_event: type, tier: r.tier, sub_status: r.subStatus, duplicate: r.duplicate, err: r.err, stripe_http: r.stripeHttp });
    return r.http === 200 ? json(200, { received: true, ...(r.duplicate ? { duplicate: true } : {}) }) : error(r.http, 'retry_later', 'Could not record the event just now.');
  }

  /**
   * @param {any} event @param {Record<string, any>} env @param {Config} cfg
   * @returns {Promise<Recorded>}
   */
  async function apply(event, env, cfg) {
    const obj = event.data?.object && typeof event.data.object === 'object' ? event.data.object : {};
    let uid = null, subId = null;
    // by the event's prefix: a Checkout Session (subscription mode only), an invoice, or the subscription itself
    if (event.type.startsWith('checkout.session.')) {
      if (obj.mode !== 'subscription') return { http: 200, outcome: 'ignored' };
      uid = uidOf(obj.client_reference_id) || uidOf(obj.metadata?.user_id);
      subId = idOf(obj.subscription);
    } else if (event.type.startsWith('invoice.')) {
      // where the subscription sits on an invoice depends on the API version
      subId = idOf(obj.subscription) || idOf(obj.parent?.subscription_details?.subscription);
      uid = uidOf(obj.subscription_details?.metadata?.user_id) || uidOf(obj.parent?.subscription_details?.metadata?.user_id);
    } else {
      subId = idOf(obj.id);
      uid = uidOf(obj.metadata?.user_id);
    }
    if (!subId || !/^sub_/.test(subId)) return { http: 200, outcome: 'no_subscription' };
    return recordSubscription({ subId, uidHint: uid, obj, eventType: event.type, created: Number(event.created), eventId: event.id }, env, cfg);
  }

  /**
   * Read a subscription back from Stripe and record it for its account: the webhook's apply (with the event's id, so
   * it is applied once) and the checkout return's sync (eventId null). Who it belongs to: uidHint (the event's or the
   * signed-in account), else the subscription's metadata, else its customer's link; a customer linked to another
   * account records nothing.
   * @param {{ subId: string, uidHint: string | null, obj: any, eventType: string, created: number, eventId: string | null }} args
   *   obj: the event's object (a subscription event's own copy is the fallback on a 404); created: the event's, in seconds
   * @param {Record<string, any>} env @param {Config} cfg
   * @returns {Promise<Recorded>}
   */
  async function recordSubscription({ subId, uidHint, obj, eventType, created, eventId }, env, cfg) {
    // as of when Stripe was asked, not when it answered: of two deliveries racing for the same subscription, the one
    // that asked later read the later state, whichever answer comes back first
    let asOf = now();
    const stripe = stripeFor(cfg);
    const got = await stripe.retrieveSubscription(subId);
    /** @type {any} */
    let sub;
    if (got.ok) sub = got.data;
    else if (got.status === 404) {
      // Stripe does not have it (any more): the event's own, unverified copy may only take access away, as of the
      // event's time; a copy that would give access records nothing
      if (!eventType.startsWith('customer.subscription.') || idOf(obj?.id) !== subId || ACCESS.has(obj?.status)) return { http: 200, outcome: 'not_found' };
      sub = obj;
      asOf = Number(created) * 1000 || 0;
    } else return { http: 502, outcome: 'stripe_error', err: got.code, stripeHttp: got.status };
    if (idOf(sub?.id) !== subId) return { http: 502, outcome: 'stripe_error', err: 'id_mismatch' };
    const store = storeFor(env);
    const customer = idOf(sub.customer) || idOf(obj?.customer);
    const uid = uidOf(uidHint) || uidOf(sub.metadata?.user_id) || (customer ? uidOf(await store.owner(customer)) : null);
    // not one of ours (made in the dashboard, or by another app on the account): nothing to give
    if (!uid) return { http: 200, outcome: 'unlinked' };
    if (customer) {
      const l = await store.link(customer, uid);
      if (l.conflict) return { http: 200, outcome: 'customer_conflict' };
    }
    let record = summarise(sub, cfg.billing.prices, asOf);
    /** @type {string[] | null} */
    let covers = null;
    // it ended: the account may still have another subscription running (Flow billing on after a second one, Beyond,
    // was cancelled). The customer's list decides, and its best replaces the record (store.js supersedes). A customer
    // Stripe has deleted (its list refused with resource_missing, and the customer reads back deleted or not found) has
    // nothing else running: its subscriptions ended with it, so this end is recorded (else every retry fails, and the
    // record keeps giving access). Any other failure is 502, and Stripe retries.
    if (TERMINAL.has(record.status) && customer) {
      const listAsOf = now();
      const listed = await stripe.listSubscriptions(customer);
      const gone = !listed.ok && listed.code === 'resource_missing' && await customerGone(stripe, customer);
      if (!listed.ok && !gone) return { http: 502, outcome: 'stripe_error', err: listed.code, stripeHttp: listed.status };
      /** @type {any[]} */
      const subs = (listed.ok && Array.isArray(listed.data?.data) ? listed.data.data : []).filter((/** @type {any} */ x) => SUB.test(idOf(x?.id) || '') && idOf(x.customer) === customer);
      /** @type {import('./store.js').SubRecord[]} */
      const recs = subs.map((x) => summarise(x, cfg.billing.prices, listAsOf));
      if (!recs.some((r) => r.subscription === subId)) { recs.push(record); subs.push(sub); }
      record = bestOf(recs, now(), recs.find((r) => r.subscription === subId) || record);
      sub = subs[recs.indexOf(record)] || sub;
      covers = recs.map((r) => r.subscription);
    }
    // a configured price id whose lookup key names another plan: the key decided; say so, so the slot gets fixed
    const items = Array.isArray(sub.items?.data) ? sub.items.data : [];
    if (items.some((/** @type {any} */ it) => priceMismatch((it?.price || it?.plan)?.id, (it?.price || it?.plan)?.lookup_key, cfg.billing.prices))) {
      logger.event({ evt: 'billing', route: eventId ? 'webhook' : 'sync', status: 'price_mismatch', stripe_event: eventType, tier: record.tier, period: record.period });
    }
    const r = eventId ? await store.apply(uid, eventId, record, covers) : { ...(await store.sync(uid, record, covers)), duplicate: false };
    return { http: 200, outcome: r.duplicate ? 'duplicate' : r.applied ? 'applied' : 'stale', tier: effectiveTier(record, now()), subStatus: record.status, duplicate: r.duplicate };
  }

  /**
   * POST /v1/session in billing mode: this account has hushmallow Beyond right now.
   * @param {Record<string, any>} env @param {Config} cfg @param {string} token
   * @returns {Promise<{ ok: true, uid: string, until: number } | { ok: false, status: number, code: string, message: string }>}
   */
  async function beyondAccess(env, cfg, token) {
    if (!ready(env, cfg)) return { ok: false, status: 503, code: offCode(cfg), message: offMessage(cfg) };
    const a = await account(token, cfg);
    if (!a.ok) return { ok: false, status: a.status, code: a.code, message: a.code === 'account_required' ? 'Sign in to a hushmallow account first.' : 'The account could not be checked just now.' };
    const rec = await storeFor(env).get(a.uid);
    if (!rec || effectiveTier(rec, now()) !== 'ultra') return { ok: false, status: 403, code: 'subscription_required', message: 'Another Angle needs an active hushmallow Beyond subscription.' };
    return { ok: true, uid: a.uid, until: accessUntil(rec, now(), cfg.billing.tokenTtlMs) };
  }

  return { ready, checkout, status, sync, portal, webhook, beyondAccess, recordSubscription };
}

/**
 * Why a Stripe price may not be sold as this plan and period (CHECKOUT_PRICE_RULES): the first rule it breaks, or ''.
 * @param {any} p @param {'paid' | 'ultra'} plan @param {'monthly' | 'yearly'} period
 * @param {boolean} [automaticTax] STRIPE_AUTOMATIC_TAX (cfg.billing.automaticTax): only then is the tax behaviour checked
 */
export function priceFault(p, plan, period, automaticTax = false) {
  if (!p || typeof p !== 'object') return 'not_a_price';
  if (!noLookupKey(p.lookup_key) && p.lookup_key !== `hushmallow.${plan}.${period}`) return 'lookup_key';
  if (p.currency !== CHECKOUT_PRICE_RULES.currency) return 'currency';
  if (p.currency_options && typeof p.currency_options === 'object' && Object.keys(p.currency_options).some((c) => c !== CHECKOUT_PRICE_RULES.currency)) return 'currency_options';
  if (p.type !== 'recurring') return 'type';
  if (p.recurring?.interval !== CHECKOUT_PRICE_RULES.interval[period]) return 'interval';
  if (p.recurring?.interval_count !== 1) return 'interval_count';
  if (p.unit_amount !== CHECKOUT_PRICE_RULES.unit_amount[plan][period]) return 'unit_amount';
  if (p.active !== true) return 'inactive';
  if (automaticTax && !CHECKOUT_PRICE_RULES.tax_behavior.includes(p.tax_behavior)) return 'tax_behavior';
  return '';
}

/**
 * A Checkout Session's settings besides the sale and the account link: the Studio's (CHECKOUT_STUDIO), with Stripe Tax's
 * in place of two of them when it is on (CHECKOUT_TAX).
 * @param {boolean} automaticTax @returns {Record<string, unknown>}
 */
export function checkoutSettings(automaticTax) {
  return { ...CHECKOUT_STUDIO, ...(automaticTax ? CHECKOUT_TAX : {}) };
}

/** integration_identifier goes on a session: the pinned API version is CHECKOUT_INTEGRATION_IDENTIFIER_SINCE or later. @param {string} apiVersion */
export function integrationIdentifierOn(apiVersion) {
  return /^\d{4}-\d{2}-\d{2}/.test(apiVersion) && apiVersion.slice(0, 10) >= CHECKOUT_INTEGRATION_IDENTIFIER_SINCE;
}

/** An https URL from Stripe's answer, or null. @param {unknown} v */
function httpsUrl(v) {
  if (typeof v !== 'string' || v.length > 2048) return null;
  try { return new URL(v).protocol === 'https:' ? v : null; } catch { return null; }
}
