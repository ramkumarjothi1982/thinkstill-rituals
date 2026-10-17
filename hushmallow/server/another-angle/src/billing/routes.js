// Web subscriptions for hushmallow Flow and hushmallow Beyond, through
// Stripe. Off until configured (src/config.js readBilling, docs/PAYMENTS.md):
// every route answers 503 billing_not_configured until then (503
// accounts_not_configured while the sign-in project is a placeholder, as on
// the staging Worker before its own project exists: docs/STAGING.md), and
// nothing else on the server changes.
//
//   POST /v1/billing/checkout  { plan: 'paid'|'ultra', period: 'monthly'|'yearly' } with the account's
//                              Supabase access token (Authorization: Bearer) → { url } (Stripe Checkout,
//                              subscription mode, the account's one Stripe customer, client_reference_id = the
//                              account id; back to APP_ORIGIN). Only a price that is what its slot says
//                              (CHECKOUT_PRICE_RULES) is sold, and only to an account with no subscription at Stripe
//                              (409 already_subscribed | payment_pending)
//   GET  /v1/billing/status    the account's token → { tier, status, current_period_end, cancel_at_period_end, ends_at, manageable }
//   POST /v1/billing/portal    the account's token → { url } (Stripe's customer portal: cancel, change plan, card, receipts)
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
import { billingClient, summarise, effectiveTier, accessUntil, idOf, priceMismatch, bestOf, ACCESS, TERMINAL } from './store.js';

export const PATHS = Object.freeze({ checkout: '/v1/billing/checkout', status: '/v1/billing/status', portal: '/v1/billing/portal', webhook: '/v1/billing/webhook' });
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
 * What a price must be in Stripe before checkout sells it (decisions D2, D3, D11). Its lookup key names the plan and
 * period of the slot it sits in, so two ids swapped while pasting never sell Beyond at Flow's price, or the reverse;
 * Australian dollars only (Adaptive Pricing off: the plans page and the terms say A$); GST-inclusive from day one,
 * whether or not Stripe Tax is on; recurring every one month or one year, as its period; and active.
 */
export const CHECKOUT_PRICE_RULES = Object.freeze({ currency: 'aud', tax_behavior: 'inclusive', interval: Object.freeze({ monthly: 'month', yearly: 'year' }) });
/** How long a price read for that check is trusted in this isolate: one read per price id in that time, and a price fixed in Stripe sells within it. */
export const CHECKOUT_PRICE_CACHE_MS = 600000;
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
   * 'live_key_on_staging', 'test_key_on_production', 'live_not_approved'); 'placeholder_prices' when no price id is
   * real and one is still a placeholder such as price_TODO_owner (staging before the owner's test ids); else
   * 'not_configured'.
   * @param {Config} cfg
   */
  const offReason = (cfg) => {
    if (cfg.billing.accountsPlaceholder) return 'accounts_not_configured';
    if (cfg.billing.keyRefused) return cfg.billing.keyRefused;
    const p = cfg.billing.prices;
    return cfg.billing.placeholderPrices > 0 && ![p.paid, p.ultra].some((x) => !!(x.monthly || x.yearly)) ? 'placeholder_prices' : 'not_configured';
  };
  /** The 503's code for offReason(). @param {Config} cfg */
  const offCode = (cfg) => (offReason(cfg) === 'accounts_not_configured' ? 'accounts_not_configured' : 'billing_not_configured');
  /** The 503's message for offReason(). @param {Config} cfg */
  const offMessage = (cfg) => {
    const r = offReason(cfg);
    if (r === 'accounts_not_configured') return 'Web subscriptions are not set up on this server: accounts are not configured (its sign-in project, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, is still a placeholder).';
    if (r === 'live_not_approved') return 'Web subscriptions are not set up on this server: live billing is not approved (BILLING_LIVE).';
    if (r === 'live_key_on_staging' || r === 'test_key_on_production') return 'Web subscriptions are not set up on this server: its Stripe key is not for this stage.';
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
    const fault = priceFault(hit.price, plan, period);
    return fault ? { ok: false, fault } : { ok: true };
  }

  /**
   * The account's one Stripe customer: the one kept for it, else its subscription's (a record from before customers
   * were made here), else a new one made for it with metadata[user_id] only (no email or name, decision D13: Checkout
   * asks for the email). Linked to the account first, then kept once: a request racing this one is told the same one.
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
    if (!price) { log('checkout', t0, { status: 'no_price', http: 503, plan, period }); return error(503, 'price_not_configured', 'This plan is not on sale yet.', cors); }
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
    // one subscription per account, whatever plan it maps to (an unmapped price included): a change of plan (Flow →
    // Beyond) or period happens in the portal
    if (rec && ACCESS.has(rec.status)) return taken('already_subscribed', 'record');
    // the price is what its slot says, or nothing is sold (and no customer made)
    const checked = await checkPrice(cfg, plan, period, price);
    if (!checked.ok && checked.fault) {
      log('checkout', t0, { status: 'price_misconfigured', http: 503, plan, period, err: checked.fault });
      return error(503, 'price_misconfigured', 'This plan is not on sale just now.', cors);
    }
    if (!checked.ok) return unavailable(`price:${checked.code}`, checked.status);
    const cust = await customerFor(who.uid, rec, cfg, store);
    if (!cust.ok && cust.conflict) {
      log('checkout', t0, { status: 'customer_conflict', http: 409, plan, period });
      return error(409, 'customer_conflict', 'This account\'s billing needs a look from support.', cors);
    }
    if (!cust.ok) return unavailable(cust.err || 'customer', cust.stripeHttp);
    const { customer } = cust;
    const stripe = stripeFor(cfg);
    // Stripe's own word, ahead of the webhook: a subscription paid (or being paid) whose events are still on their way.
    // A customer made just now has none.
    /** @type {any[]} */
    let subs = [];
    if (!cust.fresh) {
      const listed = await stripe.listSubscriptions(customer);
      if (!listed.ok) return unavailable(`list:${listed.code}`, listed.status);
      subs = (Array.isArray(listed.data?.data) ? listed.data.data : []).filter((/** @type {any} */ x) => SUB.test(idOf(x?.id) || '') && idOf(x.customer) === customer);
      if (subs.some((x) => ACCESS.has(x.status))) return taken('already_subscribed', 'listed');
      if (subs.some((x) => x.status === 'incomplete')) return taken('payment_pending', 'incomplete');
    }
    const prev = await settlePrevious(who.uid, store, stripe, cfg, { plan, period, price, customer }, subs);
    if (prev.err) return unavailable(prev.err, prev.stripeHttp);
    if (prev.pending) return taken('payment_pending', 'session_complete');
    if (prev.reuse) { log('checkout', t0, { status: 'reused', http: 200, plan, period }); return json(200, { url: prev.reuse }, cors); }
    const back = cfg.billing.appOrigin;
    // the session this one replaces is part of the key: Stripe never hands back the one just expired
    const idempotencyKey = `checkout:${who.uid}:${plan}:${period}:${Math.floor(now() / CHECKOUT_WINDOW_MS)}:${prev.prev ? prev.prev.slice(-24) : '-'}`;
    // no payment_method_types (Stripe's dynamic payment methods; which ones is a Dashboard setting, D10), no trial and
    // no promotion codes (D14), no email (D13)
    const r = await stripe.createCheckoutSession({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer,
      client_reference_id: who.uid,
      success_url: `${back}/?billing=success`,
      cancel_url: `${back}/?billing=cancel`,
      metadata: { user_id: who.uid, plan, period, price },
      subscription_data: { metadata: { user_id: who.uid } },
      // Stripe Tax (D3: STRIPE_AUTOMATIC_TAX, off until the AU registration is Collecting). The customer is always
      // passed, so the address typed at checkout is asked for and saved on it; else Stripe taxes the saved one (none).
      ...(cfg.billing.automaticTax ? { automatic_tax: { enabled: true }, customer_update: { address: 'auto' }, billing_address_collection: 'required' } : {}),
    }, { idempotencyKey });
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

  /** @param {Request} request @param {Record<string, any>} env @param {Config} cfg @param {Record<string, string>} cors */
  async function portal(request, env, cfg, cors) {
    const t0 = now();
    const who = await signedIn('portal', request, env, cfg, cors, t0);
    if (who instanceof Response) return who;
    const rec = await storeFor(env).get(who.uid);
    if (!rec?.customer) { log('portal', t0, { status: 'no_subscription', http: 404 }); return error(404, 'no_subscription', 'This account has no web subscription yet.', cors); }
    const r = await stripeFor(cfg).createPortalSession({ customer: rec.customer, return_url: `${cfg.billing.appOrigin}/?billing=portal` });
    const url = r.ok ? httpsUrl(r.data?.url) : null;
    if (!url) { log('portal', t0, { status: 'stripe_error', http: 502, err: r.ok ? 'no_url' : r.code }); return error(502, 'billing_unavailable', 'The portal could not be opened just now.', cors); }
    log('portal', t0, { status: 'ok', http: 200 });
    return json(200, { url }, cors);
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
    // was cancelled). The customer's list decides, and its best replaces the record (store.js supersedes).
    if (TERMINAL.has(record.status) && customer) {
      const listAsOf = now();
      const listed = await stripe.listSubscriptions(customer);
      if (!listed.ok) return { http: 502, outcome: 'stripe_error', err: listed.code, stripeHttp: listed.status };
      /** @type {any[]} */
      const subs = (Array.isArray(listed.data?.data) ? listed.data.data : []).filter((/** @type {any} */ x) => SUB.test(idOf(x?.id) || '') && idOf(x.customer) === customer);
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

  return { ready, checkout, status, portal, webhook, beyondAccess, recordSubscription };
}

/**
 * Why a Stripe price may not be sold as this plan and period (CHECKOUT_PRICE_RULES): the first rule it breaks, or ''.
 * @param {any} p @param {'paid' | 'ultra'} plan @param {'monthly' | 'yearly'} period
 */
export function priceFault(p, plan, period) {
  if (p?.lookup_key !== `hushmallow.${plan}.${period}`) return 'lookup_key';
  if (p.currency !== CHECKOUT_PRICE_RULES.currency) return 'currency';
  if (p.type !== 'recurring') return 'type';
  if (p.recurring?.interval !== CHECKOUT_PRICE_RULES.interval[period]) return 'interval';
  if (p.recurring?.interval_count !== 1) return 'interval_count';
  if (p.active !== true) return 'inactive';
  if (p.tax_behavior !== CHECKOUT_PRICE_RULES.tax_behavior) return 'tax_behavior';
  return '';
}

/** An https URL from Stripe's answer, or null. @param {unknown} v */
function httpsUrl(v) {
  if (typeof v !== 'string' || v.length > 2048) return null;
  try { return new URL(v).protocol === 'https:' ? v : null; } catch { return null; }
}
