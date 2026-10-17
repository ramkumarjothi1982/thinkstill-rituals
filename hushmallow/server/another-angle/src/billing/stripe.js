// Stripe over its REST API (fetch and Web Crypto only, no SDK), for the
// web subscriptions (src/billing/routes.js):
//
//   createStripe({ secretKey, apiVersion?, fetch }) →
//     createCheckoutSession(params, { idempotencyKey? }), createPortalSession(params), retrieveSubscription(id),
//     createCustomer(params, { idempotencyKey? }), retrieveCustomer(id), retrievePrice(id), listSubscriptions(customer),
//     retrieveCheckoutSession(id), expireCheckoutSession(id)
//     each → { ok: true, data } | { ok: false, status, code }   (never throws; status 0 = no answer)
//     (idempotencyKey: Stripe's Idempotency-Key header; the same key gives back the first answer for 24 hours)
//     Every call sends Stripe-Version when apiVersion is set (src/config.js pins it wherever billing is on).
//   verifyWebhookSignature(payload, header, secret, nowMs, toleranceSec?) →
//     { ok: true, timestamp } | { ok: false, code }
//   signWebhookPayload(payload, secret, timestampSec) → a Stripe-Signature header (tests, rehearsals)
//
// The Stripe-Signature header is "t=<unix seconds>,v1=<hex HMAC-SHA256>[,v1=…]":
// the HMAC of "<t>.<raw body>" keyed with the endpoint's whole signing secret
// (whsec_…). Every v1 is tried (Stripe sends two while a secret is being
// rolled), each compared in constant time by crypto.subtle.verify, and a
// timestamp more than toleranceSec (5 minutes) away from now is refused, so a
// recorded delivery cannot be replayed later.

const API = 'https://api.stripe.com';
const enc = new TextEncoder();
export const SIGNATURE_TOLERANCE_SEC = 300;
/** listSubscriptions reads at most this many of a customer's subscriptions (every status): far more than one account has. */
export const SUBSCRIPTION_LIST_LIMIT = 20;

/**
 * Stripe's form encoding: nested objects and arrays as key[sub][0]=… pairs.
 * @param {Record<string, unknown>} params @returns {string}
 */
export function formEncode(params) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} key @param {unknown} v */
  const add = (key, v) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) { v.forEach((x, i) => add(`${key}[${i}]`, x)); return; }
    if (typeof v === 'object') { for (const [k, x] of Object.entries(/** @type {Record<string, unknown>} */ (v))) add(`${key}[${k}]`, x); return; }
    out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  };
  for (const [k, v] of Object.entries(params)) add(k, v);
  return out.join('&');
}

/**
 * @typedef {{ ok: true, data: any } | { ok: false, status: number, code: string }} StripeResult
 * @param {{ secretKey: string, apiVersion?: string, fetch: typeof fetch, timeoutMs?: number }} o
 */
export function createStripe({ secretKey, apiVersion = '', fetch: fetchImpl, timeoutMs = 10000 }) {
  /**
   * @param {'GET' | 'POST'} method @param {string} path @param {Record<string, unknown>} [params]
   * @param {{ idempotencyKey?: string }} [o] @returns {Promise<StripeResult>}
   */
  async function call(method, path, params, { idempotencyKey = '' } = {}) {
    /** @type {Record<string, string>} */
    const headers = { authorization: `Bearer ${secretKey}`, accept: 'application/json' };
    if (apiVersion) headers['stripe-version'] = apiVersion;
    if (method === 'POST') headers['content-type'] = 'application/x-www-form-urlencoded';
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
    /** @type {Response} */
    let res;
    try {
      res = await fetchImpl(`${API}${path}`, { method, headers, body: method === 'POST' ? formEncode(params || {}) : undefined, signal: AbortSignal.timeout(timeoutMs) });
    } catch { return { ok: false, status: 0, code: 'network' }; }
    /** @type {any} */
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (res.ok && data && typeof data === 'object') return { ok: true, data };
    // Stripe's error code (resource_missing, …) or its type; never its message (it can echo what was sent)
    const code = String(data?.error?.code || data?.error?.type || `http_${res.status}`).replace(/[^a-z0-9_]/gi, '').slice(0, 40);
    return { ok: false, status: res.status, code };
  }
  return {
    /** POST /v1/checkout/sessions @param {Record<string, unknown>} params @param {{ idempotencyKey?: string }} [o] */
    createCheckoutSession: (params, o) => call('POST', '/v1/checkout/sessions', params, o),
    /** POST /v1/billing_portal/sessions (flow_data: straight to one task, such as a plan change) @param {{ customer: string, return_url: string, flow_data?: Record<string, unknown> }} params */
    createPortalSession: (params) => call('POST', '/v1/billing_portal/sessions', params),
    /**
     * GET /v1/subscriptions/:id (the current truth, whatever order the events came in). Never expanded: a restricted
     * key without "Subscription schedules" may not read an expanded schedule, and every plan the server records comes
     * through this read. @param {string} id
     */
    retrieveSubscription: (id) => call('GET', `/v1/subscriptions/${encodeURIComponent(id)}`),
    /**
     * GET /v1/subscription_schedules/:id (a change the portal set for the period end: when, and to which price;
     * store.js summarise). Read only when a subscription names one, and optional: refused, the record keeps when, not
     * which plan. @param {string} id
     */
    retrieveSubscriptionSchedule: (id) => call('GET', `/v1/subscription_schedules/${encodeURIComponent(id)}`),
    /** POST /v1/customers @param {Record<string, unknown>} params @param {{ idempotencyKey?: string }} [o] */
    createCustomer: (params, o) => call('POST', '/v1/customers', params, o),
    /** GET /v1/customers/:id (a deleted one reads back as { id, deleted: true }) @param {string} id */
    retrieveCustomer: (id) => call('GET', `/v1/customers/${encodeURIComponent(id)}`),
    /**
     * GET /v1/prices/:id, with every currency it can be charged in (currency_options: Stripe sends it only when
     * expanded; Checkout charges a customer in one of them) @param {string} id
     */
    retrievePrice: (id) => call('GET', `/v1/prices/${encodeURIComponent(id)}?${new URLSearchParams({ 'expand[]': 'currency_options' })}`),
    /** GET /v1/subscriptions?customer=…&status=all (a customer's subscriptions, ended ones included) @param {string} customer */
    listSubscriptions: (customer) => call('GET', `/v1/subscriptions?${new URLSearchParams({ customer, status: 'all', limit: String(SUBSCRIPTION_LIST_LIMIT) })}`),
    /** GET /v1/checkout/sessions/:id @param {string} id */
    retrieveCheckoutSession: (id) => call('GET', `/v1/checkout/sessions/${encodeURIComponent(id)}`),
    /** POST /v1/checkout/sessions/:id/expire (an open session can no longer be paid) @param {string} id */
    expireCheckoutSession: (id) => call('POST', `/v1/checkout/sessions/${encodeURIComponent(id)}/expire`, {}),
  };
}

/** @param {string} secret */
const hmacKey = (secret) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

/** @param {string} hex @returns {Uint8Array | null} */
function fromHex(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * @param {string} payload the raw request body, exactly as received
 * @param {string | null} header the Stripe-Signature header
 * @param {string} secret the endpoint's signing secret (whsec_…)
 * @param {number} nowMs
 * @param {number} [toleranceSec]
 * @returns {Promise<{ ok: true, timestamp: number } | { ok: false, code: 'missing' | 'malformed' | 'stale' | 'bad_signature' }>}
 */
export async function verifyWebhookSignature(payload, header, secret, nowMs, toleranceSec = SIGNATURE_TOLERANCE_SEC) {
  if (typeof header !== 'string' || !header || typeof secret !== 'string' || !secret) return { ok: false, code: 'missing' };
  if (header.length > 2048) return { ok: false, code: 'malformed' };
  let t = NaN;
  /** @type {Uint8Array[]} */
  const sigs = [];
  for (const part of header.split(',')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 't' && /^\d{1,12}$/.test(v)) t = Number(v);
    else if (k === 'v1') { const b = fromHex(v); if (b) sigs.push(b); }
  }
  if (!Number.isFinite(t) || !sigs.length) return { ok: false, code: 'malformed' };
  if (Math.abs(nowMs / 1000 - t) > toleranceSec) return { ok: false, code: 'stale' };
  const key = await hmacKey(secret);
  const signed = enc.encode(`${t}.${payload}`);
  let valid = false;
  // every candidate is checked (no early exit), each in constant time
  for (const s of sigs) if (await crypto.subtle.verify('HMAC', key, s, signed)) valid = true;
  return valid ? { ok: true, timestamp: t } : { ok: false, code: 'bad_signature' };
}

/** A Stripe-Signature header for this payload (what Stripe sends). @param {string} payload @param {string} secret @param {number} timestampSec */
export async function signWebhookPayload(payload, secret, timestampSec) {
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${timestampSec}.${payload}`)));
  return `t=${timestampSec},v1=${[...sig].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
