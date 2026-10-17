// Web subscriptions for hushmallow Flow and hushmallow Beyond, through
// Stripe. Off until configured (src/config.js readBilling, docs/PAYMENTS.md):
// every route answers 503 billing_not_configured until then (503
// accounts_not_configured while the sign-in project is a placeholder, as on
// the staging Worker before its own project exists: docs/STAGING.md), and
// nothing else on the server changes.
//
//   POST /v1/billing/checkout  { plan: 'paid'|'ultra', period: 'monthly'|'yearly' } with the account's
//                              Supabase access token (Authorization: Bearer) → { url } (Stripe Checkout,
//                              subscription mode, client_reference_id = the account id; back to APP_ORIGIN)
//   GET  /v1/billing/status    the account's token → { tier, status, current_period_end, cancel_at_period_end, manageable }
//   POST /v1/billing/portal    the account's token → { url } (Stripe's customer portal: cancel, change plan, card, receipts)
//   POST /v1/billing/webhook   Stripe's events, signed (Stripe-Signature); no Origin, the signature is the check
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
import { billingClient, summarise, effectiveTier, accessUntil, idOf, ACCESS } from './store.js';

export const PATHS = Object.freeze({ checkout: '/v1/billing/checkout', status: '/v1/billing/status', portal: '/v1/billing/portal', webhook: '/v1/billing/webhook' });
/** The events the webhook endpoint should send (docs/PAYMENTS.md); any other is acknowledged and ignored. */
export const EVENTS = Object.freeze(['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed']);
export const WEBHOOK_MAX_BYTES = 262144;
/**
 * Checkouts for the same account, plan and period within one such window share an idempotency key, so two tabs
 * starting at once get one Checkout Session (paid once), never two subscriptions. Short, because Stripe gives back
 * the first answer to a key, a failure included.
 */
export const CHECKOUT_WINDOW_MS = 120000;
const PLANS = ['paid', 'ultra'];
const PERIODS = ['monthly', 'yearly'];

/**
 * @typedef {import('../config.js').Config} Config
 * @typedef {{ ok: true, uid: string } | { ok: false, status: number, code: string }} AccountResult
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

  /** @param {any} rec @returns {Record<string, unknown>} */
  const statusBody = (rec) => (rec ? {
    tier: effectiveTier(rec, now()), status: rec.status,
    current_period_end: rec.current_period_end != null ? new Date(rec.current_period_end).toISOString() : null,
    cancel_at_period_end: !!rec.cancel_at_period_end, manageable: !!rec.customer,
  } : { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, manageable: false });

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
    const store = storeFor(env);
    const rec = await store.get(who.uid);
    // one subscription per account: a change of plan (Flow → Beyond) or period happens in the portal
    if (rec && ACCESS.has(rec.status) && effectiveTier(rec, now()) !== 'none') {
      log('checkout', t0, { status: 'already_subscribed', http: 409, plan, period, tier: rec.tier });
      return error(409, 'already_subscribed', 'This account already has a subscription; change it in the portal.', cors);
    }
    const back = cfg.billing.appOrigin;
    const idempotencyKey = `checkout:${who.uid}:${plan}:${period}:${Math.floor(now() / CHECKOUT_WINDOW_MS)}`;
    const r = await stripeFor(cfg).createCheckoutSession({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      client_reference_id: who.uid,
      success_url: `${back}/?billing=success`,
      cancel_url: `${back}/?billing=cancel`,
      metadata: { user_id: who.uid, plan, period },
      subscription_data: { metadata: { user_id: who.uid } },
      ...(rec?.customer ? { customer: rec.customer } : {}),
    }, { idempotencyKey });
    const url = r.ok ? httpsUrl(r.data?.url) : null;
    if (!url) {
      log('checkout', t0, { status: 'stripe_error', http: 502, plan, period, err: r.ok ? 'no_url' : r.code });
      return error(502, 'billing_unavailable', 'The checkout could not be started just now.', cors);
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
    if (!raw.ok) return error(raw.status, raw.code, raw.message);
    const sig = await verifyWebhookSignature(raw.value, request.headers.get('stripe-signature'), cfg.billing.webhookSecret, now());
    if (!sig.ok) { log('webhook', t0, { status: 'bad_signature', http: 400, err: sig.code }); return error(400, 'bad_signature', 'The Stripe signature does not match.'); }
    /** @type {any} */
    let event;
    try { event = JSON.parse(raw.value); } catch { return error(400, 'invalid_json', 'Body is not valid JSON.'); }
    if (!event || typeof event !== 'object' || typeof event.id !== 'string' || !/^evt_[A-Za-z0-9]{1,250}$/.test(event.id) || typeof event.type !== 'string') return error(400, 'invalid_event', 'Not a Stripe event.');
    const type = event.type.slice(0, 48);
    if (!EVENTS.includes(type)) { log('webhook', t0, { status: 'ignored', http: 200, stripe_event: type }); return json(200, { received: true }); }
    if (!ready(env, cfg)) { log('webhook', t0, { status: 'off', http: 503, stripe_event: type, err: offReason(cfg) }); return error(503, offCode(cfg), offMessage(cfg)); }
    const r = await apply(event, env, cfg);
    log('webhook', t0, { status: r.outcome, http: r.http, stripe_event: type, tier: r.tier, sub_status: r.subStatus, duplicate: r.duplicate });
    return r.http === 200 ? json(200, { received: true, ...(r.duplicate ? { duplicate: true } : {}) }) : error(r.http, 'retry_later', 'Could not record the event just now.');
  }

  /**
   * @param {any} event @param {Record<string, any>} env @param {Config} cfg
   * @returns {Promise<{ http: number, outcome: string, tier?: string, subStatus?: string, duplicate?: boolean }>}
   */
  async function apply(event, env, cfg) {
    const obj = event.data?.object && typeof event.data.object === 'object' ? event.data.object : {};
    let uid = null, subId = null;
    if (event.type === 'checkout.session.completed') {
      if (obj.mode !== 'subscription') return { http: 200, outcome: 'ignored' };
      uid = uidOf(obj.client_reference_id) || uidOf(obj.metadata?.user_id);
      subId = idOf(obj.subscription);
    } else if (event.type === 'invoice.payment_failed') {
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
   * @returns {Promise<{ http: number, outcome: string, tier?: string, subStatus?: string, duplicate?: boolean }>}
   */
  async function recordSubscription({ subId, uidHint, obj, eventType, created, eventId }, env, cfg) {
    // as of when Stripe was asked, not when it answered: of two deliveries racing for the same subscription, the one
    // that asked later read the later state, whichever answer comes back first
    let asOf = now();
    const got = await stripeFor(cfg).retrieveSubscription(subId);
    /** @type {any} */
    let sub;
    if (got.ok) sub = got.data;
    else if (got.status === 404 && eventType.startsWith('customer.subscription.')) { sub = obj; asOf = Number(created) * 1000 || 0; }
    else if (got.status === 404) return { http: 200, outcome: 'no_subscription' };
    else return { http: 502, outcome: 'stripe_error' };
    if (idOf(sub?.id) !== subId) return { http: 502, outcome: 'stripe_error' };
    const store = storeFor(env);
    const customer = idOf(sub.customer) || idOf(obj?.customer);
    const uid = uidOf(uidHint) || uidOf(sub.metadata?.user_id) || (customer ? uidOf(await store.owner(customer)) : null);
    // not one of ours (made in the dashboard, or by another app on the account): nothing to give
    if (!uid) return { http: 200, outcome: 'unlinked' };
    if (customer) {
      const l = await store.link(customer, uid);
      if (l.conflict) return { http: 200, outcome: 'customer_conflict' };
    }
    const record = summarise(sub, cfg.billing.prices, asOf);
    const r = eventId ? await store.apply(uid, eventId, record) : { ...(await store.sync(uid, record)), duplicate: false };
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

/** An https URL from Stripe's answer, or null. @param {unknown} v */
function httpsUrl(v) {
  if (typeof v !== 'string' || v.length > 2048) return null;
  try { return new URL(v).protocol === 'https:' ? v : null; } catch { return null; }
}
