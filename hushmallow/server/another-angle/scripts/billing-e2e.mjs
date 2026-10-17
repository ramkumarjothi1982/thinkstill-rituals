// The sandbox driver for web subscriptions (docs/STAGING.md "The sandbox driver"): phases P0, P1 and S3-S9 of the
// rehearsal, against the staging Worker and the hushmallow-staging Stripe sandbox, in Stripe test mode only.
//
//   npm run e2e:billing [-- --phases P0,P1,S3,S4,S5,S6,S7,S8,S9]      (all of them by default)
//   on your own machine, with the three values in a gitignored file (never typed on a command line):
//     node --env-file=.dev.vars.e2e scripts/billing-e2e.mjs
//
// Secrets come from the environment only, and are never printed:
//   STRIPE_E2E_KEY        a restricted test key (rk_test_…; sk_test_… also works). Anything else, a live key above
//                         all, is refused before any request is made.
//   STAGING_E2E_EMAIL     one confirmed hushmallow-staging test account (E2E-B), signed in with the staging project's
//   STAGING_E2E_PASSWORD  password grant and its public publishable key (wrangler.toml [env.staging.vars]).
// Everything else (the Workers' addresses, the staging project, the price ids, the tax switch) is read from the
// repository; while any of it is still a placeholder the driver refuses to start.
//
// What it does: P0 reads (health, the four prices, the webhook endpoint, the default portal configuration, Stripe
// Tax); P1 sends the key-free checks (scripts/billing-checks.mjs); S3-S9 each make a test clock with one customer on
// it, give the customer a test card and a subscription with metadata.user_id = the test account, move the clock on,
// and wait for the Worker's GET /v1/billing/status to follow. It never creates prices, products, registrations,
// settings or webhook endpoints. Every object it makes carries metadata[e2e_run] (a clock, its name), only those ids
// are printed, and its test clocks are deleted at the end (which deletes their customers and subscriptions). Any
// Stripe object read with livemode true stops the run at once. S1, S2 and S10-S13 need the hosted pages or the app
// and stay manual.
//
// Exit: 0 every check passed; 1 a check failed; 2 refused to start; 3 stopped (a livemode true object).

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STAGING_SUPABASE_PROJECT_URL, SUPABASE_PROJECT_URL, STRIPE_API_VERSION_EXPECTED } from '../src/config.js';
import { EVENTS, priceFault } from '../src/billing/routes.js';
import { formEncode } from '../src/billing/stripe.js';
import { uidOf } from '../src/billing/account.js';
import { idOf, TERMINAL, PAST_DUE_GRACE_MS } from '../src/billing/store.js';
import { keyFreeChecks, varsTables, readWrangler } from './billing-checks.mjs';

export const STAGING_WORKER = 'https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev';
export const PRODUCTION_WORKER = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';
/** Production's own app: never one of the staging Worker's origins, so P1 expects it refused there. */
export const PRODUCTION_APP = 'https://app.hushmallow.com';
/** Test keys only: a restricted key (recommended) or the sandbox's secret key. */
export const E2E_KEY = /^(?:rk|sk)_test_[A-Za-z0-9]{8,}$/;
export const PHASES = Object.freeze(['P0', 'P1', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9']);
/** The owner's provisional sandbox amounts in cents (decision D2, docs/STAGING.md): Stripe and BILLING_PRICES must both say these. */
/** @type {Readonly<Record<string, number>>} */
export const SANDBOX_AMOUNTS = Object.freeze({ 'hushmallow.paid.monthly': 999, 'hushmallow.paid.yearly': 9999, 'hushmallow.ultra.monthly': 1999, 'hushmallow.ultra.yearly': 19999 });
export const PRODUCT_NAMES = Object.freeze({ paid: 'hushmallow Flow', ultra: 'hushmallow Beyond' });
/** One status read per 5 s at most: the billing routes allow 20 a minute per network (BILLING_IP_LIMITER). */
export const STATUS_POLL_MS = 5000;
/** How long a change may take to reach the Worker (Stripe's delivery, then its own read of the subscription). */
export const WAIT_MS = 180000;
/** How long a test clock may take to move (Stripe says seconds to minutes). */
export const CLOCK_WAIT_MS = 300000;
/** POST /v1/session allows 3 a minute per network (SESSION_IP_LIMITER): one per 21 s. */
export const SESSION_GAP_MS = 21000;
/** A hushmallow-staging access token lasts an hour: sign in again well before. */
export const TOKEN_REFRESH_MS = 45 * 60000;
/** Past a period end, how far to move a clock so the renewal invoice is finalized and charged (about an hour after it is made, from memory). */
export const RENEWAL_SETTLE_S = 3 * 3600;
/** A clock may move at most two intervals of its subscriptions at once (from memory): 50 days stays inside two months. */
export const MAX_ADVANCE_S = 50 * 86400;
/** Smart Retries over about two weeks (D5) make a handful of attempts; this many clock moves is plenty. */
export const MAX_RETRY_ADVANCES = 12;
const DAY_S = 86400;
const SUB = /^sub_[A-Za-z0-9]{4,250}$/;

/**
 * @typedef {{ paid: { monthly: string, yearly: string }, ultra: { monthly: string, yearly: string } }} Prices
 * @typedef {{ stagingWorker: string, productionWorker: string, appOrigin: string, productionOrigin: string,
 *   supabaseUrl: string, publishableKey: string, prices: Prices, automaticTax: boolean, apiVersion: string,
 *   events: readonly string[], billingPrices: Record<string, string>, production: { mode: string, liveApproved: boolean } }} Config
 * @typedef {{ ok: true, status: number, data: any } | { ok: false, status: number, code: string, data: null }} StripeAnswer
 * @typedef {{ status: number, json: any, headers: Headers }} Answer
 */

/** A Stripe object of live mode was read: everything stops. */
class Abort extends Error {}
/** A step this scenario cannot go on without failed (already reported). */
class Stop extends Error {}

/**
 * Why the driver will not start with this environment, or ''. No value is ever echoed.
 * @param {Record<string, string | undefined>} env @param {boolean} needsAccount
 */
export function refusal(env, needsAccount = true) {
  const key = String(env.STRIPE_E2E_KEY || '').trim();
  if (!key) return 'STRIPE_E2E_KEY is not set (a restricted test key, rk_test_…). Nothing was sent.';
  if (/^[sr]k_live_/.test(key)) return 'STRIPE_E2E_KEY is a live key. This driver runs in test mode only. Nothing was sent.';
  if (!E2E_KEY.test(key)) return 'STRIPE_E2E_KEY is not a Stripe test secret or restricted key (rk_test_… or sk_test_…). Nothing was sent.';
  if (needsAccount && (!String(env.STAGING_E2E_EMAIL || '').trim() || !String(env.STAGING_E2E_PASSWORD || ''))) {
    return 'STAGING_E2E_EMAIL and STAGING_E2E_PASSWORD (one confirmed hushmallow-staging test account) are not set. Nothing was sent.';
  }
  return '';
}

/**
 * The non-secret values, from the repository: wrangler.toml [env.staging.vars] and [vars], src/config.js and the app's
 * BILLING_PRICES. → { config } or { problems } (a placeholder still there).
 * @returns {Promise<{ config: Config, problems: string[] }>}
 */
export async function repoConfig() {
  const t = varsTables(readWrangler());
  const s = t.staging || {}, p = t.production || {};
  // not a literal import, so the app's own file is not type-checked as the server's
  const app = await import(new URL('../../../src/app/config.js', import.meta.url).href);
  /** @type {string[]} */
  const problems = [];
  if (!STAGING_SUPABASE_PROJECT_URL) problems.push('src/config.js STAGING_SUPABASE_PROJECT_URL is empty (hushmallow-staging does not exist yet)');
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(s.SUPABASE_PUBLISHABLE_KEY || '') || /TODO/.test(s.SUPABASE_PUBLISHABLE_KEY || '')) problems.push('[env.staging.vars] SUPABASE_PUBLISHABLE_KEY is still a placeholder');
  /** @param {string} k */
  const price = (k) => {
    const v = s[k] || '';
    if (!/^price_[A-Za-z0-9]{4,64}$/.test(v) || /^price_todo/i.test(v)) problems.push(`[env.staging.vars] ${k} is still a placeholder`);
    return v;
  };
  const config = {
    stagingWorker: STAGING_WORKER, productionWorker: PRODUCTION_WORKER,
    appOrigin: s.APP_ORIGIN || '', productionOrigin: PRODUCTION_APP,
    supabaseUrl: STAGING_SUPABASE_PROJECT_URL, publishableKey: s.SUPABASE_PUBLISHABLE_KEY || '',
    prices: {
      paid: { monthly: price('STRIPE_PRICE_PAID_MONTHLY'), yearly: price('STRIPE_PRICE_PAID_YEARLY') },
      ultra: { monthly: price('STRIPE_PRICE_ULTRA_MONTHLY'), yearly: price('STRIPE_PRICE_ULTRA_YEARLY') },
    },
    automaticTax: /^(?:1|true|yes|on)$/i.test(s.STRIPE_AUTOMATIC_TAX || ''),
    apiVersion: s.STRIPE_API_VERSION || STRIPE_API_VERSION_EXPECTED,
    events: EVENTS,
    billingPrices: { ...(app.BILLING_PRICES || {}) },
    production: { mode: p.ENTITLEMENT_MODE || 'testing', liveApproved: p.BILLING_LIVE === 'approved' },
  };
  if (!config.appOrigin) problems.push('[env.staging.vars] APP_ORIGIN is not set');
  return { config, problems };
}

/** Any object (at any depth) with livemode true. @param {unknown} v @param {number} [depth] @returns {boolean} */
function hasLive(v, depth = 0) {
  if (!v || typeof v !== 'object' || depth > 12) return false;
  if (/** @type {any} */ (v).livemode === true) return true;
  return (Array.isArray(v) ? v : Object.values(v)).some((x) => hasLive(x, depth + 1));
}

/** A path with its object ids taken out, for a message. @param {string} path */
const bare = (path) => path.split('?')[0].replace(/\b[a-z]{2,8}_[A-Za-z0-9_]{6,}/g, '…');

/**
 * Stripe's REST API with the driver's key, pinned to the Worker's API version; every answer is read for livemode.
 * @param {{ key: string, version: string, fetch: typeof fetch }} o
 */
function stripeClient({ key, version, fetch: f }) {
  /** @param {'GET' | 'POST' | 'DELETE'} method @param {string} path @param {Record<string, unknown>} [params] @returns {Promise<StripeAnswer>} */
  async function call(method, path, params) {
    /** @type {Record<string, string>} */
    const headers = { authorization: `Bearer ${key}`, 'stripe-version': version, accept: 'application/json' };
    let url = `https://api.stripe.com${path}`;
    /** @type {string | undefined} */
    let body;
    if (method === 'GET' && params) url += `${path.includes('?') ? '&' : '?'}${formEncode(params)}`;
    if (method === 'POST') { headers['content-type'] = 'application/x-www-form-urlencoded'; body = formEncode(params || {}); }
    /** @type {Response} */
    let res;
    try { res = await f(url, { method, headers, body }); } catch { return { ok: false, status: 0, code: 'network', data: null }; }
    /** @type {any} */
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (hasLive(data)) throw new Abort(`a Stripe object read from ${method} ${bare(path)} has livemode true`);
    if (res.ok && data && typeof data === 'object') return { ok: true, status: res.status, data };
    return { ok: false, status: res.status, code: String(data?.error?.code || data?.error?.type || `http_${res.status}`).replace(/[^a-z0-9_]/gi, '').slice(0, 40), data: null };
  }
  return {
    /** @param {string} p @param {Record<string, unknown>} [q] */ get: (p, q) => call('GET', p, q),
    /** @param {string} p @param {Record<string, unknown>} [form] */ post: (p, form) => call('POST', p, form),
    /** @param {string} p */ del: (p) => call('DELETE', p),
  };
}

/** A Worker, called as the staging app calls it. @param {{ base: string, origin: string, fetch: typeof fetch }} o */
function workerClient({ base, origin, fetch: f }) {
  /**
   * @param {string} path
   * @param {{ method?: string, body?: unknown, raw?: string, token?: string, origin?: string, headers?: Record<string, string> }} [o]
   * @returns {Promise<Answer>}
   */
  return async (path, { method = 'POST', body, raw, token, origin: from = origin, headers = {} } = {}) => {
    /** @type {Record<string, string>} */
    const h = { origin: from, ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers };
    /** @type {Response} */
    let res;
    try { res = await f(base + path, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) }); } catch { return { status: 0, json: null, headers: new Headers() }; }
    let json = null;
    try { json = await res.json(); } catch { json = null; }
    return { status: res.status, json, headers: res.headers };
  };
}

/** The account's access token from the staging project's password grant. @param {Config} cfg @param {string} email @param {string} password @param {typeof fetch} f */
async function signIn(cfg, email, password, f) {
  /** @type {Response} */
  let res;
  try {
    res = await f(`${cfg.supabaseUrl}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: cfg.publishableKey, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  } catch { return { ok: false, status: 0, token: '', uid: '' }; }
  /** @type {any} */
  let j = null;
  try { j = await res.json(); } catch { j = null; }
  const uid = uidOf(j?.user?.id);
  if (!res.ok || typeof j?.access_token !== 'string' || !uid) return { ok: false, status: res.status, token: '', uid: '' };
  return { ok: true, status: res.status, token: /** @type {string} */ (j.access_token), uid };
}

/** The subscription an event's object is about (a subscription, an invoice of either API shape, or a Checkout Session). @param {any} o */
const subOf = (o) => (o?.object === 'subscription' ? idOf(o.id) : idOf(o?.subscription) || idOf(o?.parent?.subscription_details?.subscription));
/** A subscription's period end in seconds (on the items from API 2025-03-31, on the subscription before). @param {any} s */
const periodEnd = (s) => Math.max(Number(s?.current_period_end) || 0, ...(Array.isArray(s?.items?.data) ? s.items.data : []).map((/** @type {any} */ i) => Number(i?.current_period_end) || 0));
/** An ISO date within a day of `sec`. @param {unknown} isoDate @param {number} sec */
const near = (isoDate, sec) => typeof isoDate === 'string' && Math.abs(Date.parse(isoDate) / 1000 - sec) <= DAY_S;
/** @param {number} cents */
const aud = (cents) => `A$${(cents / 100).toFixed(2)}`;
/** @param {any} s */
const desc = (s) => (s ? `${s.tier}/${s.status}${s.ends_at ? ` ends ${String(s.ends_at).slice(0, 10)}` : ''}` : 'no answer');

/**
 * Run the driver. Returns the exit code.
 * @param {{ env?: Record<string, string | undefined>, args?: string[], fetch?: typeof fetch, write?: (line: string) => void,
 *   sleep?: (ms: number) => Promise<void>, now?: () => number, config?: Config, stop?: { now: boolean } }} [o]
 *   config: the non-secret values (the repository's when left out); stop.now: set by Ctrl-C, ends at the next wait
 */
export async function run({ env = process.env, args = [], fetch: f = (input, init) => fetch(input, init), write = (l) => console.log(l), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now, config, stop = { now: false } } = {}) {
  const at = args.indexOf('--phases');
  const asked = at >= 0 ? String(args[at + 1] || '').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean) : [...PHASES];
  const unknown = asked.filter((x) => !PHASES.includes(x));
  if (unknown.length || !asked.length) { write(`REFUSED  --phases takes ${PHASES.join(',')}`); return 2; }
  const phases = new Set(asked);
  const scenarios = [...phases].some((x) => x.startsWith('S'));
  const why = refusal(env, scenarios);
  if (why) { write(`REFUSED  ${why}`); return 2; }
  /** @type {Config} */
  let cfg;
  if (config) cfg = config;
  else {
    const r = await repoConfig();
    if (r.problems.length) { write(`REFUSED  staging is not set up yet: ${r.problems.join('; ')}. Nothing was sent.`); return 2; }
    cfg = r.config;
  }
  const key = String(env.STRIPE_E2E_KEY).trim();
  const email = String(env.STAGING_E2E_EMAIL || '').trim(), password = String(env.STAGING_E2E_PASSWORD || '');
  const acct = { token: '', uid: '', at: 0 };
  // the last line of defence: no secret (or the account's id) is ever printed, whatever a message holds
  /** @param {unknown} text */
  const clean = (text) => {
    let s = String(text);
    for (const x of [key, password, email, acct.token, acct.uid]) if (x && x.length >= 6) s = s.split(x).join('[redacted]');
    return s;
  };
  let failed = 0;
  /** @param {string} tag @param {string} what @param {string} [extra] */
  const line = (tag, what, extra = '') => write(clean(`${tag.padEnd(5)} ${what}${extra ? `  ${extra}` : ''}`));
  /** @param {boolean} ok @param {string} what @param {string} [extra] */
  const check = (ok, what, extra = '') => { line(ok ? 'PASS' : 'FAIL', what, extra); if (!ok) failed++; return ok; };
  /** A check this scenario cannot go on without. @param {boolean} ok @param {string} what @param {string} [extra] */
  const must = (ok, what, extra = '') => { if (!check(ok, what, extra)) throw new Stop(what); };
  /** A setup step: printed only when it fails. @param {boolean} ok @param {string} what @param {string} [extra] */
  const need = (ok, what, extra = '') => { if (!ok) must(false, what, extra); };
  /** @param {string} what */
  const info = (what) => line('INFO', what);
  /** @param {string} what */
  const skip = (what) => line('SKIP', what);
  /** @param {number} ms */
  const nap = async (ms) => { if (stop.now) throw new Stop('interrupted'); await sleep(ms); };

  const runId = `${new Date(now()).toISOString().slice(0, 10).replace(/-/g, '')}${Buffer.from(crypto.getRandomValues(new Uint8Array(4))).toString('hex')}`;
  const stripe = stripeClient({ key, version: cfg.apiVersion, fetch: f });
  const staging = workerClient({ base: cfg.stagingWorker, origin: cfg.appOrigin, fetch: f });
  const production = workerClient({ base: cfg.productionWorker, origin: cfg.productionOrigin, fetch: f });
  /** @type {string[]} */
  const clocks = [];
  /** @type {string} the staging webhook endpoint (P0 finds it; S8 resends to it) */
  let endpoint = '';
  write(`hushmallow web subscriptions, sandbox driver: run ${runId}, phases ${[...phases].join(',')}`);

  // ------------------------------------------------------------------ P0 --
  async function p0() {
    write('\nP0 preflight (read-only)');
    const h = await staging('/v1/health', { method: 'GET' });
    const b = h.json?.billing || {};
    check(h.status === 200 && h.json?.entitlement_mode === 'billing+testing', 'P0 staging: entitlement_mode billing+testing', `${h.status} ${h.json?.entitlement_mode}`);
    check(b.configured === true && b.webhook === true, 'P0 staging: billing configured, webhook secret set', JSON.stringify({ configured: b.configured, webhook: b.webhook }));
    check(b.stripe_mode === 'test' && !b.key_refused, 'P0 staging: stripe_mode test, no key refused', `${b.stripe_mode}${b.key_refused ? ` ${b.key_refused}` : ''}`);
    check(b.api_version === cfg.apiVersion, `P0 staging: api_version ${cfg.apiVersion}`, String(b.api_version));
    check(b.live_approved === false, 'P0 staging: live_approved false', String(b.live_approved));
    check(b.automatic_tax === cfg.automaticTax, `P0 staging: automatic_tax ${cfg.automaticTax}, as [env.staging.vars] says`, String(b.automatic_tax));
    check(!('placeholder_prices' in b) && b.accounts_configured !== false, 'P0 staging: no placeholder prices or sign-in values');
    const p = await production('/v1/health', { method: 'GET' });
    const pb = p.json?.billing || {};
    check(p.status === 200 && p.json?.entitlement_mode === cfg.production.mode, `P0 production: entitlement_mode ${cfg.production.mode}, as [vars] says`, `${p.status} ${p.json?.entitlement_mode}`);
    if (!cfg.production.liveApproved) check(pb.configured === false && pb.live_approved === false && pb.stripe_mode === null, 'P0 production: billing off (no approval, no key)', JSON.stringify({ configured: pb.configured, stripe_mode: pb.stripe_mode }));

    // the four prices, by lookup key: what the Worker sells (priceFault), at the sandbox amounts, under the products' names
    const keys = Object.keys(SANDBOX_AMOUNTS);
    const pr = await stripe.get('/v1/prices', { lookup_keys: keys, expand: ['data.product'], limit: 10 });
    check(pr.ok, 'P0 prices: listed by lookup key', pr.ok ? '' : `${pr.status} ${pr.code}`);
    /** @type {any[]} */
    const list = pr.ok && Array.isArray(pr.data.data) ? pr.data.data : [];
    for (const k of keys) {
      const [, plan, period] = /** @type {[string, 'paid' | 'ultra', 'monthly' | 'yearly']} */ (/** @type {unknown} */ (/^hushmallow\.(paid|ultra)\.(monthly|yearly)$/.exec(k)));
      const x = list.find((y) => y?.lookup_key === k);
      if (!check(!!x, `P0 price ${k}: exists`)) continue;
      const fault = priceFault(x, plan, period);
      check(!fault, `P0 price ${k}: AUD, recurring every 1 ${period === 'monthly' ? 'month' : 'year'}, inclusive, active`, fault ? `breaks: ${fault}` : '');
      check(x.unit_amount === SANDBOX_AMOUNTS[k], `P0 price ${k}: ${aud(SANDBOX_AMOUNTS[k])}`, typeof x.unit_amount === 'number' ? aud(x.unit_amount) : '');
      check(x.product?.name === PRODUCT_NAMES[plan], `P0 price ${k}: product "${PRODUCT_NAMES[plan]}"`, x.product?.name ? `"${x.product.name}"` : '');
      check(x.id === cfg.prices[plan][period], `P0 price ${k}: the id in [env.staging.vars]`);
      check(cfg.billingPrices[k] === aud(SANDBOX_AMOUNTS[k]), `P0 price ${k}: BILLING_PRICES says ${aud(SANDBOX_AMOUNTS[k])}`, String(cfg.billingPrices[k] || ''));
    }

    // the staging webhook endpoint: enabled, on the pinned version, with exactly the events the Worker handles
    const url = `${cfg.stagingWorker}/v1/billing/webhook`;
    const we = await stripe.get('/v1/webhook_endpoints', { limit: 100 });
    /** @type {any[]} */
    const mine = we.ok && Array.isArray(we.data.data) ? we.data.data.filter((/** @type {any} */ e) => e?.url === url) : [];
    if (check(mine.length === 1, 'P0 webhook: one endpoint for the staging Worker', we.ok ? `${mine.length}` : `${we.status} ${we.code}`)) {
      const e = mine[0];
      endpoint = String(e.id || '');
      check(e.status === 'enabled', 'P0 webhook: enabled', String(e.status));
      check(e.api_version === cfg.apiVersion, `P0 webhook: API version ${cfg.apiVersion}`, String(e.api_version));
      const got = [...(e.enabled_events || [])].sort(), want = [...cfg.events].sort();
      check(JSON.stringify(got) === JSON.stringify(want), `P0 webhook: exactly the ${want.length} events`, got.filter((x) => !want.includes(x)).concat(want.filter((x) => !got.includes(x)).map((x) => `missing ${x}`)).join(', '));
    }

    // the default portal configuration: cancel at period end, switch across all four prices, card update, invoices
    const pc = await stripe.get('/v1/billing_portal/configurations', { is_default: 'true', limit: 3 });
    const conf = pc.ok && Array.isArray(pc.data.data) ? pc.data.data.find((/** @type {any} */ c) => c?.is_default === true) : null;
    if (check(!!conf, 'P0 portal: a default configuration', pc.ok ? '' : `${pc.status} ${pc.code}`)) {
      const ft = conf.features || {};
      check(ft.subscription_cancel?.enabled === true && ft.subscription_cancel?.mode === 'at_period_end', 'P0 portal: cancellation on, at the end of the billing period (D7)', String(ft.subscription_cancel?.mode || ''));
      const four = [cfg.prices.paid.monthly, cfg.prices.paid.yearly, cfg.prices.ultra.monthly, cfg.prices.ultra.yearly];
      const allowed = (Array.isArray(ft.subscription_update?.products) ? ft.subscription_update.products : []).flatMap((/** @type {any} */ x) => (Array.isArray(x?.prices) ? x.prices : []));
      check(ft.subscription_update?.enabled === true && (ft.subscription_update?.default_allowed_updates || []).includes('price') && four.every((id) => allowed.includes(id)), 'P0 portal: switching plans on, across all four prices');
      check(ft.payment_method_update?.enabled === true, 'P0 portal: payment-method update on');
      check(ft.invoice_history?.enabled === true, 'P0 portal: invoice history on');
      info(`P0 portal: proration on plan changes: ${ft.subscription_update?.proration_behavior || 'not said'} (D8)`);
    }

    // Stripe Tax: active settings with an inclusive default; automatic_tax only with an active AU registration
    const ts = await stripe.get('/v1/tax/settings');
    if (check(ts.ok, 'P0 tax: settings read', ts.ok ? '' : `${ts.status} ${ts.code}`)) {
      check(ts.data.status === 'active', 'P0 tax: settings status active (head office set)', String(ts.data.status));
      check(ts.data.defaults?.tax_behavior === 'inclusive', 'P0 tax: default tax behaviour inclusive', String(ts.data.defaults?.tax_behavior));
    }
    const tr = await stripe.get('/v1/tax/registrations', { status: 'active', limit: 100 });
    const au = tr.ok && Array.isArray(tr.data.data) ? tr.data.data.find((/** @type {any} */ r) => r?.country === 'AU' && r?.status === 'active') : null;
    if (cfg.automaticTax) check(!!au, 'P0 tax: an active (Collecting) AU registration while automatic_tax is on', tr.ok ? '' : `${tr.status} ${tr.code}`);
    else info(au ? 'P0 tax: the AU registration is active; STRIPE_AUTOMATIC_TAX may be turned on once the calculation below passes (D3)' : 'P0 tax: no active AU registration, and automatic_tax is off, as it must be');
    if (au) {
      const beyond = list.find((y) => y?.lookup_key === 'hushmallow.ultra.monthly');
      const code = (typeof beyond?.product?.tax_code === 'string' ? beyond.product.tax_code : beyond?.product?.tax_code?.id) || (ts.ok ? ts.data.defaults?.tax_code : null);
      if (cfg.automaticTax) check(!!code, 'P0 tax: a product tax code is set (the owner\'s choice, D4)');
      else info(`P0 tax: a product tax code is ${code ? 'set' : 'not set yet (the owner\'s choice, D4)'}`);
      const amount = SANDBOX_AMOUNTS['hushmallow.ultra.monthly'];
      const calc = await stripe.post('/v1/tax/calculations', {
        currency: 'aud',
        line_items: [{ amount, reference: `e2e-${runId}`, tax_behavior: 'inclusive', ...(code ? { tax_code: code } : {}) }],
        customer_details: { address: { line1: '1 Martin Place', city: 'Sydney', state: 'NSW', postal_code: '2000', country: 'AU' }, address_source: 'billing' },
      });
      if (check(calc.ok, 'P0 tax: a test calculation for a Sydney address', calc.ok ? '' : `${calc.status} ${calc.code}`)) {
        const reasons = (Array.isArray(calc.data.tax_breakdown) ? calc.data.tax_breakdown : []).map((/** @type {any} */ x) => String(x?.taxability_reason));
        check(reasons.length > 0 && !reasons.includes('not_collecting'), 'P0 tax: taxability_reason is not not_collecting', reasons.join(',') || 'none');
        check(calc.data.amount_total === amount, `P0 tax: the total stays ${aud(amount)} (inclusive)`, typeof calc.data.amount_total === 'number' ? aud(calc.data.amount_total) : '');
      }
    }
    check(true, 'P0: every Stripe object read had livemode false');
  }

  // ------------------------------------------------------------------ P1 --
  async function p1() {
    write('\nP1 key-free checks');
    const h = await staging('/v1/health', { method: 'GET' });
    await keyFreeChecks({
      call: staging, check, info, health: h.json, stage: 'staging', now,
      expected: { live_approved: false, api_version: cfg.apiVersion, automatic_tax: cfg.automaticTax },
      refusedOrigin: cfg.productionOrigin, foreignProject: SUPABASE_PROJECT_URL,
    });
  }

  // -------------------------------------------------------------- S3-S9 --
  /** The account's token, signed in again before it can expire. */
  async function token() {
    if (acct.token && now() - acct.at < TOKEN_REFRESH_MS) return acct.token;
    const r = await signIn(cfg, email, password, f);
    (acct.token ? need : must)(r.ok, 'the E2E-B account signs in to hushmallow-staging', r.ok ? '' : `HTTP ${r.status}`);
    Object.assign(acct, { token: r.token, uid: r.uid, at: now() });
    return acct.token;
  }
  let lastStatus = -Infinity;
  /** GET /v1/billing/status, never more often than STATUS_POLL_MS. */
  async function status() {
    const wait = lastStatus + STATUS_POLL_MS - now();
    if (wait > 0) await nap(wait);
    lastStatus = now();
    const r = await staging('/v1/billing/status', { method: 'GET', token: await token() });
    return r.status === 200 ? r.json : null;
  }
  /** @param {(s: any) => boolean} pred */
  async function waitStatus(pred) {
    const until = now() + WAIT_MS;
    let last = null;
    do { last = await status(); if (last && pred(last)) return last; } while (now() < until);
    return last;
  }
  /** @param {string} what @param {(s: any) => boolean} pred */
  async function mustStatus(what, pred) {
    const last = await waitStatus(pred);
    must(!!last && pred(last), what, desc(last));
    return last;
  }
  let lastSession = -Infinity;
  const deviceId = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
  /** POST /v1/session as the app sends it in billing mode (the account's token, no invite code). */
  async function session() {
    const wait = lastSession + SESSION_GAP_MS - now();
    if (wait > 0) await nap(wait);
    lastSession = now();
    const r = await staging('/v1/session', { body: { device_id: deviceId, platform: 'web', app_version: 'billing-e2e' }, token: await token() });
    return { status: r.status, code: String(r.json?.error?.code || ''), source: String(r.json?.source || '') };
  }
  /** @param {string} label */
  async function newClock(label) {
    const r = await stripe.post('/v1/test_helpers/test_clocks', { frozen_time: Math.floor(now() / 1000), name: `hushmallow-e2e ${runId} ${label}` });
    need(r.ok && /^clock_/.test(String(r.data?.id)), `${label}: a test clock`, r.ok ? '' : `${r.status} ${r.code}`);
    clocks.push(r.data.id);
    write(`      made ${r.data.id} (${label})`);
    return r.data;
  }
  /** @param {string} id */
  async function clockReady(id) {
    const until = now() + CLOCK_WAIT_MS;
    for (;;) {
      const r = await stripe.get(`/v1/test_helpers/test_clocks/${id}`);
      if (r.ok && r.data.status === 'ready') return r.data;
      need(!(r.ok && r.data.status === 'internal_failure') && now() < until, 'the test clock moved', r.ok ? String(r.data.status) : `${r.status} ${r.code}`);
      await nap(STATUS_POLL_MS);
    }
  }
  /** Move the clock to `to` (seconds), in steps Stripe allows. @param {any} clk @param {number} to */
  async function advance(clk, to) {
    let c = clk;
    while (c.frozen_time < to) {
      const step = Math.min(to, c.frozen_time + MAX_ADVANCE_S);
      const r = await stripe.post(`/v1/test_helpers/test_clocks/${c.id}/advance`, { frozen_time: step });
      need(r.ok, 'the test clock moves on', r.ok ? '' : `${r.status} ${r.code}`);
      c = await clockReady(c.id);
    }
    return c;
  }
  /** @param {any} clk @param {string} label */
  async function customerOn(clk, label) {
    const r = await stripe.post('/v1/customers', { test_clock: clk.id, metadata: { user_id: acct.uid, e2e_run: runId } });
    need(r.ok && /^cus_/.test(String(r.data?.id)), `${label}: a customer on the clock`, r.ok ? '' : `${r.status} ${r.code}`);
    write(`      made ${r.data.id} (${label})`);
    return /** @type {string} */ (r.data.id);
  }
  /** A test card (pm_card_… token) attached and made the customer's default. @param {string} customer @param {string} card */
  async function card(customer, card) {
    const a = await stripe.post(`/v1/payment_methods/${card}/attach`, { customer });
    need(a.ok && /^pm_/.test(String(a.data?.id)), `${card} on the customer`, a.ok ? '' : `${a.status} ${a.code}`);
    await stripe.post(`/v1/payment_methods/${a.data.id}`, { metadata: { e2e_run: runId } });
    const u = await stripe.post(`/v1/customers/${customer}`, { invoice_settings: { default_payment_method: a.data.id } });
    need(u.ok, `${card} is the default`, u.ok ? '' : `${u.status} ${u.code}`);
    return /** @type {string} */ (a.data.id);
  }
  /** @param {string} customer @param {'paid' | 'ultra'} plan @param {'monthly' | 'yearly'} period @param {string} label */
  async function subscribe(customer, plan, period, label) {
    const r = await stripe.post('/v1/subscriptions', { customer, items: [{ price: cfg.prices[plan][period] }], metadata: { user_id: acct.uid, e2e_run: runId } });
    need(r.ok && SUB.test(String(r.data?.id)), `${label}: ${PRODUCT_NAMES[plan]} ${period}`, r.ok ? '' : `${r.status} ${r.code}`);
    write(`      made ${r.data.id} (${label})`);
    need(r.data.status === 'active', `${label}: the first payment went through`, String(r.data.status));
    return r.data;
  }
  /** @param {string} id */
  const subscription = async (id) => {
    const r = await stripe.get(`/v1/subscriptions/${id}`);
    need(r.ok, 'the subscription read back', r.ok ? '' : `${r.status} ${r.code}`);
    return r.data;
  };
  /** @param {string} type @param {string} subId @returns {Promise<any[]>} */
  async function eventsFor(type, subId) {
    const r = await stripe.get('/v1/events', { type, limit: 100 });
    return r.ok && Array.isArray(r.data.data) ? r.data.data.filter((/** @type {any} */ e) => subOf(e?.data?.object) === subId) : [];
  }
  /** @param {string} type @param {string} subId */
  const seenIds = async (type, subId) => new Set((await eventsFor(type, subId)).map((e) => e.id));
  /**
   * A new event of this type about this subscription, which every endpoint has acknowledged (pending_webhooks 0: the
   * Worker answered 200; the sandbox should have no other endpoint).
   * @param {string} what @param {string} type @param {string} subId @param {Set<string>} [seen] @param {(o: any) => boolean} [pred]
   */
  async function delivered(what, type, subId, seen = new Set(), pred = () => true) {
    const until = now() + WAIT_MS;
    /** @type {any} */
    let ev = null;
    for (;;) {
      ev = (await eventsFor(type, subId)).find((e) => !seen.has(e.id) && pred(e.data?.object)) || null;
      if ((ev && ev.pending_webhooks === 0) || now() >= until) break;
      await nap(STATUS_POLL_MS);
    }
    check(!!ev && ev.pending_webhooks === 0, `${what}: ${type} delivered (200)`, ev ? (ev.pending_webhooks === 0 ? '' : `pending_webhooks ${ev.pending_webhooks}`) : 'no such event');
    return ev;
  }
  let blocked = false;
  /**
   * One scenario: anything it started is ended afterwards, and the account must have no plan again before the next.
   * @param {string} name @param {(subs: string[]) => Promise<void>} fn
   */
  async function scenario(name, fn) {
    write(`\n${name}`);
    if (blocked) { skip(`${name}: the account still had a plan after the last scenario`); return; }
    /** @type {string[]} */
    const subs = [];
    try { await fn(subs); } catch (e) {
      if (e instanceof Abort) throw e;
      if (!(e instanceof Stop)) check(false, `${name.split(' ')[0]}: the driver stopped`, clean(/** @type {any} */ (e)?.message || e));
      if (stop.now) throw e;
    }
    for (const id of subs) {
      const s = await stripe.get(`/v1/subscriptions/${id}`);
      if (s.ok && !TERMINAL.has(s.data.status)) await stripe.del(`/v1/subscriptions/${id}`);
    }
    const last = await waitStatus((s) => s.tier === 'none');
    if (!(last && last.tier === 'none')) { check(false, `${name.split(' ')[0]}: the account has no plan again`, desc(last)); blocked = true; }
  }

  async function s3() {
    await scenario('S3 renewal', async (subs) => {
      let clk = await newClock('S3');
      const cus = await customerOn(clk, 'S3');
      await card(cus, 'pm_card_visa');
      const sub = await subscribe(cus, 'paid', 'monthly', 'S3'); subs.push(sub.id);
      await mustStatus('S3: tier paid, active', (s) => s.tier === 'paid' && s.status === 'active');
      const end1 = periodEnd(sub);
      const seen = await seenIds('invoice.paid', sub.id);
      clk = await advance(clk, end1 + RENEWAL_SETTLE_S);
      await delivered('S3 renewal', 'invoice.paid', sub.id, seen, (inv) => inv?.billing_reason === 'subscription_cycle');
      const end2 = periodEnd(await subscription(sub.id));
      const days = Math.round((end2 - end1) / DAY_S);
      check(days >= 28 && days <= 31, 'S3: Stripe moved the period on by one month', `${days} days`);
      await mustStatus('S3: still active, and the Worker has the new period end', (s) => s.tier === 'paid' && s.status === 'active' && s.current_period_end === new Date(end2 * 1000).toISOString());
      info('S3: Settings shows the new "Renews on" date: an app check, by hand');
    });
  }

  async function s45() {
    await scenario(phases.has('S4') ? 'S4 failed renewal, then recovery' : 'S4 (the start of S5) failed renewal, then recovery', async (subs) => {
      let clk = await newClock('S4');
      const cus = await customerOn(clk, 'S4');
      await card(cus, 'pm_card_visa');
      const sub = await subscribe(cus, 'ultra', 'monthly', 'S4'); subs.push(sub.id);
      await mustStatus('S4: tier ultra, active', (s) => s.tier === 'ultra' && s.status === 'active');
      await card(cus, 'pm_card_chargeCustomerFail');
      let seen = await seenIds('invoice.payment_failed', sub.id);
      clk = await advance(clk, periodEnd(sub) + RENEWAL_SETTLE_S);
      await delivered('S4', 'invoice.payment_failed', sub.id, seen);
      await mustStatus('S4: past_due, and Beyond still open while Stripe retries', (s) => s.status === 'past_due' && s.tier === 'ultra');
      const open = await session();
      check(open.status === 200 && open.source === 'billing', 'S4: /v1/session still opens Another Angle (200, source billing)', `${open.status} ${open.code || open.source}`);
      const visa = await card(cus, 'pm_card_visa');
      const inv = idOf((await subscription(sub.id)).latest_invoice);
      seen = await seenIds('invoice.paid', sub.id);
      const paid = await stripe.post(`/v1/invoices/${inv}/pay`, { payment_method: visa });
      must(paid.ok && paid.data.status === 'paid', 'S4: the open invoice paid with the new card', paid.ok ? String(paid.data.status) : `${paid.status} ${paid.code}`);
      await delivered('S4 recovery', 'invoice.paid', sub.id, seen);
      await mustStatus('S4: active again', (s) => s.tier === 'ultra' && s.status === 'active');
      if (!phases.has('S5')) return;

      write('\nS5 past_due cap and retries exhausted');
      await card(cus, 'pm_card_chargeCustomerFail');
      seen = await seenIds('invoice.payment_failed', sub.id);
      clk = await advance(clk, periodEnd(await subscription(sub.id)) + RENEWAL_SETTLE_S);
      await delivered('S5', 'invoice.payment_failed', sub.id, seen);
      await mustStatus('S5: past_due again, Beyond still open', (s) => s.status === 'past_due' && s.tier === 'ultra');
      info(`S5: the ${PAST_DUE_GRACE_MS / 86400000}-day past_due cap runs on the Worker's own clock, which a test clock does not move; test/billing-state.test.js covers it`);
      let s = await subscription(sub.id);
      for (let i = 0; i < MAX_RETRY_ADVANCES && !TERMINAL.has(s.status); i++) {
        const r = await stripe.get(`/v1/invoices/${idOf(s.latest_invoice)}`);
        const next = r.ok ? Number(r.data.next_payment_attempt) || 0 : 0;
        if (!next) break;
        clk = await advance(clk, Math.max(next, clk.frozen_time) + 3600);
        s = await subscription(sub.id);
      }
      // D6 is cancel only: an unpaid subscription stays in place with its invoice open, and paying it revives it
      check(s.status === 'canceled', 'S5: once the retries ran out, Stripe cancelled the subscription (D6: cancel; never unpaid or left past due)', String(s.status));
      if (s.status === 'canceled') await delivered('S5', 'customer.subscription.deleted', sub.id);
      await mustStatus('S5: no plan', (st) => st.tier === 'none');
      const shut = await session();
      check(shut.status === 403 && shut.code === 'subscription_required', 'S5: /v1/session 403 subscription_required', `${shut.status} ${shut.code}`);
    });
  }

  async function s6() {
    await scenario('S6 plan changes', async (subs) => {
      const clk = await newClock('S6');
      const cus = await customerOn(clk, 'S6');
      await card(cus, 'pm_card_visa');
      const sub = await subscribe(cus, 'paid', 'monthly', 'S6'); subs.push(sub.id);
      await mustStatus('S6: Flow monthly: tier paid', (s) => s.tier === 'paid' && s.status === 'active');
      const flow = await session();
      check(flow.status === 403 && flow.code === 'subscription_required', 'S6: Flow alone: /v1/session 403 subscription_required (Zuzu\'s authored angles)', `${flow.status} ${flow.code}`);
      const item = sub.items?.data?.[0]?.id;
      const up = await stripe.post(`/v1/subscriptions/${sub.id}`, { items: [{ id: item, price: cfg.prices.ultra.monthly }], proration_behavior: 'always_invoice' });
      need(up.ok, 'S6: the item changed to Beyond monthly', up.ok ? '' : `${up.status} ${up.code}`);
      await mustStatus('S6: Flow → Beyond monthly: tier ultra', (s) => s.tier === 'ultra' && s.status === 'active');
      const beyond = await session();
      check(beyond.status === 200 && beyond.source === 'billing', 'S6: Beyond: /v1/session 200 (source billing)', `${beyond.status} ${beyond.code || beyond.source}`);
      const down = await stripe.post(`/v1/subscriptions/${sub.id}`, { items: [{ id: item, price: cfg.prices.paid.yearly }], proration_behavior: 'always_invoice' });
      need(down.ok, 'S6: the item changed to Flow yearly', down.ok ? '' : `${down.status} ${down.code}`);
      const c = await stripe.get(`/v1/test_helpers/test_clocks/${clk.id}`);
      const t = c.ok ? Number(c.data.frozen_time) : clk.frozen_time;
      await mustStatus('S6: → Flow yearly: tier paid, a period of a year', (s) => s.tier === 'paid' && s.status === 'active' && Date.parse(s.current_period_end) / 1000 - t >= 360 * DAY_S);
      const yearly = await session();
      check(yearly.status === 403 && yearly.code === 'subscription_required', 'S6: Flow yearly: /v1/session 403 subscription_required', `${yearly.status} ${yearly.code}`);
      info('S6: the same switch in the portal (Settings → Manage subscription) is an app check, by hand');
    });
  }

  async function s7() {
    await scenario('S7 cancellations', async (subs) => {
      let clk = await newClock('S7');
      const cus = await customerOn(clk, 'S7');
      await card(cus, 'pm_card_visa');
      const sub = await subscribe(cus, 'ultra', 'monthly', 'S7'); subs.push(sub.id);
      await mustStatus('S7: tier ultra', (s) => s.tier === 'ultra' && s.status === 'active');
      const end1 = periodEnd(sub);
      need((await stripe.post(`/v1/subscriptions/${sub.id}`, { cancel_at_period_end: true })).ok, 'S7: set to cancel at the period end');
      await mustStatus('S7: cancels at the period end: ends_at is the period end, tier unchanged', (s) => s.tier === 'ultra' && s.cancel_at_period_end === true && near(s.ends_at, end1));
      need((await stripe.post(`/v1/subscriptions/${sub.id}`, { cancel_at_period_end: false })).ok, 'S7: renewing again');
      const at = clk.frozen_time + 90 * DAY_S;
      need((await stripe.post(`/v1/subscriptions/${sub.id}`, { cancel_at: at })).ok, 'S7: cancel_at set 90 days on');
      await mustStatus('S7: cancel_at: ends_at is that date, tier unchanged', (s) => s.tier === 'ultra' && !s.cancel_at_period_end && near(s.ends_at, at));
      clk = await advance(clk, at + 3600);
      await delivered('S7', 'customer.subscription.deleted', sub.id);
      await mustStatus('S7: past cancel_at: no plan', (s) => s.tier === 'none');
      const now2 = await subscribe(cus, 'ultra', 'monthly', 'S7 again'); subs.push(now2.id);
      await mustStatus('S7: tier ultra again', (s) => s.tier === 'ultra' && s.status === 'active');
      need((await stripe.del(`/v1/subscriptions/${now2.id}`)).ok, 'S7: cancelled at once');
      await delivered('S7 at once', 'customer.subscription.deleted', now2.id);
      await mustStatus('S7: cancelled at once: no plan at the next check', (s) => s.tier === 'none' && s.status === 'canceled');
      info('S7: Another Angle then falls back to the authored angles: an app check, by hand');
    });
  }

  async function s8() {
    await scenario('S8 duplicates and repair', async (subs) => {
      const clk = await newClock('S8');
      const cus = await customerOn(clk, 'S8');
      await card(cus, 'pm_card_visa');
      const one = await subscribe(cus, 'paid', 'monthly', 'S8'); subs.push(one.id);
      await mustStatus('S8: tier paid', (s) => s.tier === 'paid' && s.status === 'active');
      const created = await delivered('S8', 'customer.subscription.created', one.id);
      if (!endpoint) {
        const we = await stripe.get('/v1/webhook_endpoints', { limit: 100 });
        const e = we.ok && Array.isArray(we.data.data) ? we.data.data.find((/** @type {any} */ x) => x?.url === `${cfg.stagingWorker}/v1/billing/webhook`) : null;
        endpoint = String(e?.id || '');
      }
      // Stripe's resend (the CLI's `stripe events resend`; its API path is from memory)
      const again = created && endpoint ? await stripe.post(`/v1/events/${created.id}/retry`, { webhook_endpoint: endpoint }) : null;
      if (again?.ok) {
        await nap(STATUS_POLL_MS);
        await delivered('S8 resend', 'customer.subscription.created', one.id);
        await mustStatus('S8: the resent event changes nothing (tier paid)', (s) => s.tier === 'paid' && s.status === 'active');
        info('S8: the staging Worker\'s log line for it says "duplicate":true: check its Logs by hand');
      } else {
        skip(`S8: no resend through the API (${again ? `${again.status} ${again.code}` : 'no event or endpoint'}); resend by hand: Workbench → Events → Resend`);
      }
      const two = await subscribe(cus, 'ultra', 'monthly', 'S8 second'); subs.push(two.id);
      await mustStatus('S8: a second, higher subscription: tier ultra', (s) => s.tier === 'ultra' && s.status === 'active');
      need((await stripe.del(`/v1/subscriptions/${two.id}`)).ok, 'S8: the higher one cancelled');
      await delivered('S8', 'customer.subscription.deleted', two.id);
      await mustStatus('S8: the remaining Flow subscription is recorded (tier paid)', (s) => s.tier === 'paid' && s.status === 'active');
    });
  }

  async function s9() {
    await scenario('S9 renewal that needs authentication', async (subs) => {
      let clk = await newClock('S9');
      const cus = await customerOn(clk, 'S9');
      await card(cus, 'pm_card_visa');
      const sub = await subscribe(cus, 'paid', 'monthly', 'S9'); subs.push(sub.id);
      await mustStatus('S9: tier paid', (s) => s.tier === 'paid' && s.status === 'active');
      await card(cus, 'pm_card_authenticationRequired');
      const seen = await seenIds('invoice.payment_action_required', sub.id);
      clk = await advance(clk, periodEnd(sub) + RENEWAL_SETTLE_S);
      await delivered('S9', 'invoice.payment_action_required', sub.id, seen);
      await mustStatus('S9: past_due while the payment waits for the customer', (s) => s.status === 'past_due' && s.tier === 'paid');
      info('S9: Stripe\'s hosted confirmation email goes to the customer\'s address; these customers have none (D13), so check it on a Checkout subscription by hand');
    });
  }

  let aborted = false;
  try {
    if (phases.has('P0')) await p0();
    if (phases.has('P1')) await p1();
    if (scenarios) {
      write('\nS3-S9 with test clocks (account E2E-B)');
      let ready = false;
      try {
        await token();
        const s0 = await status();
        ready = check(!!s0 && s0.tier === 'none', 'the account starts with no plan', desc(s0));
      } catch (e) { if (!(e instanceof Stop)) throw e; }
      if (ready) {
        if (phases.has('S3')) await s3();
        if (phases.has('S4') || phases.has('S5')) await s45();
        if (phases.has('S6')) await s6();
        if (phases.has('S7')) await s7();
        if (phases.has('S8')) await s8();
        if (phases.has('S9')) await s9();
      } else skip('S3-S9: not run');
    }
  } catch (e) {
    if (e instanceof Abort) { aborted = true; write(clean(`ABORT ${e.message}: stopped at once`)); }
    else if (e instanceof Stop) { check(false, `stopped: ${e.message}`); }
    else check(false, 'the driver stopped', clean(/** @type {any} */ (e)?.message || e));
  } finally {
    // its own test clocks only; deleting one deletes its customers and subscriptions
    for (const id of clocks) {
      try {
        const r = await stripe.del(`/v1/test_helpers/test_clocks/${id}`);
        if (r.ok) write(`      deleted ${id}`);
        else check(false, `${id} not deleted: delete it in the Dashboard (Billing → Test clocks)`, `${r.status} ${r.code}`);
      } catch (e) { if (e instanceof Abort) aborted = true; }
    }
  }
  write(aborted ? '\nstopped: a livemode true object was read' : failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  if (scenarios) write('S1, S2 and S10-S13 are by hand: docs/STAGING.md, the rehearsal checklist');
  return aborted ? 3 : failed ? 1 : 0;
}

// run as a command (npm run e2e:billing); imported (test/billing-e2e.test.js), it only offers run() and its parts
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stop = { now: false };
  process.once('SIGINT', () => { stop.now = true; console.log('stopping: the test clocks of this run are deleted first'); });
  process.exitCode = await run({ env: process.env, args: process.argv.slice(2), stop });
}
