// Shared fixtures for the web-subscription tests (billing-env, billing-state and later files): a fake Stripe and a
// fake sign-in project behind one fetch, the billing env, Stripe-shaped objects and signed webhook deliveries.
// test/billing.test.js keeps its own copies (it came first); these follow the same shapes.
//
// Every key-shaped value is built at runtime, so a secret scan of the repository never sees one.

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeEnv, req, clock, allowAll, CLOCK_START, SYSTEM_PROMPT } from './helpers.js';
import { createApp } from '../src/app.js';
import { createMockProvider } from '../src/providers/mock.js';
import { signWebhookPayload } from '../src/billing/stripe.js';
import { memoryBillingNamespace } from '../src/billing/store.js';
import { STRIPE_API_VERSION_EXPECTED } from '../src/config.js';

export const SUPABASE = 'https://igbxbfuaoybfzsroxuln.supabase.co';
export const APP = 'https://app.hushmallow.com';
export const UID = '0b0c3c1e-5f2a-4c1b-9a77-2d4e6f8a9b10';
export const OTHER = '7d1f2e3a-0b4c-4d5e-8f60-718293a4b5c6';
export const WHSEC = `whsec_${'b'.repeat(32)}`;
/** A Stripe key of this kind (sk/rk, live/test, or pk for the publishable one), built at runtime. @param {string} prefix */
export const stripeKey = (prefix, fill = 'a') => `${prefix}_${fill.repeat(24)}`;
/** The production Worker's key: live, used only once BILLING_LIVE = "approved". */
export const LIVE_KEY = stripeKey('rk_live');
/** The staging Worker's (and the harness's) key: test mode only. */
export const TEST_KEY = stripeKey('rk_test');
export const PK = `sb_publishable_${'c'.repeat(24)}`;
export const PRICES = { paidMonthly: 'price_FlowMonthly1', paidYearly: 'price_FlowYearly1', ultraMonthly: 'price_BeyondMonthly1', ultraYearly: 'price_BeyondYearly1' };
export const DAY = 86400000;

/** A Supabase-shaped access token (the fake project decides whether it is live). */
export function jwt(sub = UID, { exp = (CLOCK_START + 30 * DAY) / 1000, iss = `${SUPABASE}/auth/v1` } = {}) {
  /** @param {object} o */
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub, exp, iss, role: 'authenticated', aud: 'authenticated' })}.${'s'.repeat(43)}`;
}
export const TOKEN = jwt(UID);

/**
 * The billing configuration, on: the production Worker with its live key and the owner's approval, or (ACCOUNTS_STAGE
 * "staging") the staging Worker with its test key.
 * @param {Record<string, any>} [over]
 */
export function billingEnv(over = {}) {
  const staging = over.ACCOUNTS_STAGE === 'staging';
  return makeEnv({
    ALLOWED_ORIGINS: 'https://ramkumarjothi1982.github.io,https://app.hushmallow.com,http://localhost:8000',
    STRIPE_SECRET_KEY: staging ? TEST_KEY : LIVE_KEY, STRIPE_WEBHOOK_SECRET: WHSEC,
    ...(staging ? {} : { BILLING_LIVE: 'approved' }),
    STRIPE_PRICE_PAID_MONTHLY: PRICES.paidMonthly, STRIPE_PRICE_PAID_YEARLY: PRICES.paidYearly,
    STRIPE_PRICE_ULTRA_MONTHLY: PRICES.ultraMonthly, STRIPE_PRICE_ULTRA_YEARLY: PRICES.ultraYearly,
    SUPABASE_URL: SUPABASE, SUPABASE_PUBLISHABLE_KEY: PK, APP_ORIGIN: APP,
    BILLING: memoryBillingNamespace(), BILLING_IP_LIMITER: allowAll(), PROVIDER: 'mock',
    ...over,
  });
}

/** A subscription as Stripe returns it (newer API: the period end on the item). */
export function subscription(over = {}, { price = PRICES.ultraMonthly, end = (CLOCK_START + 30 * DAY) / 1000, lookup = null } = {}) {
  return {
    id: 'sub_Test123', object: 'subscription', customer: 'cus_Test123', status: 'active', cancel_at_period_end: false, cancel_at: null,
    livemode: true, metadata: { user_id: UID }, items: { object: 'list', data: [{ id: 'si_1', price: { id: price, lookup_key: lookup }, current_period_end: end }] },
    ...over,
  };
}

/** The four configured prices as the checkout's price check wants them (src/billing/routes.js CHECKOUT_PRICE_RULES). */
export const PRICE_SLOTS = Object.freeze({
  [PRICES.paidMonthly]: ['paid', 'monthly'], [PRICES.paidYearly]: ['paid', 'yearly'],
  [PRICES.ultraMonthly]: ['ultra', 'monthly'], [PRICES.ultraYearly]: ['ultra', 'yearly'],
});
/** A Stripe price for that plan and period that may be sold (AUD, GST-inclusive, recurring, active, its lookup key), with `over` on top. */
export function price(id, plan, period, over = {}) {
  return {
    id, object: 'price', active: true, currency: 'aud', type: 'recurring', tax_behavior: 'inclusive', lookup_key: `hushmallow.${plan}.${period}`,
    recurring: { interval: period === 'monthly' ? 'month' : 'year', interval_count: 1, usage_type: 'licensed' }, ...over,
  };
}

/**
 * A fake Stripe + sign-in project behind one fetch, recording every call. Stripe: checkout sessions (create, retrieve,
 * expire), portal sessions, customers, prices (the four configured ones, sellable), subscriptions (retrieve, and list
 * by customer). A POST with an Idempotency-Key it has seen gets the first answer again, as Stripe does. Sessions are of
 * the key's mode (cs_live_… on a live key) and keep what checkout sent. `fail` makes every call whose path matches
 * answer with that status and error (a restricted key without a permission, Stripe down); `portalFlows: false`
 * refuses a portal session with flow_data (the portal does not let customers switch plans). A customer marked
 * `deleted: true` (in `customers`) is read back as Stripe's deleted customer, and listing its subscriptions
 * (unless `deletedListing` is 'empty') or making a session for it answers 400 resource_missing.
 */
export function upstream({ users = { [TOKEN]: { id: UID, email: 'ana@example.com' } } } = {}) {
  /** @type {{ url: string, path: string, method: string, headers: Record<string, string>, form: URLSearchParams | null, body: string | null, query: URLSearchParams }[]} */
  const calls = [];
  /** @type {Map<string, any>} */
  const subs = new Map();
  /** @type {Map<string, any>} */
  const prices = new Map();
  /** @type {Map<string, any>} */
  const sessions = new Map();
  /** @type {Map<string, any>} */
  const customers = new Map();
  for (const [id, [plan, period]] of Object.entries(PRICE_SLOTS)) prices.set(id, price(id, plan, period));
  /** @type {Map<string, string>} the first answer to each Idempotency-Key */
  const replays = new Map();
  const o = {
    calls, subs, prices, sessions, customers, users, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_a1',
    /** @type {{ path: RegExp, status: number, error: Record<string, string> } | null} */
    fail: null,
    portalFlows: true,
    /** @type {'missing' | 'empty'} what listing a deleted customer's subscriptions answers */
    deletedListing: 'missing',
    /** the clock sessions expire on (setup() gives it the app's) */
    clock: () => CLOCK_START,
    /** @type {(url: string | URL | Request, init?: RequestInit) => Promise<Response>} */
    fetch: async () => new Response(null),
    stripe: () => calls.filter((c) => c.url.startsWith('https://api.stripe.com')),
    supabase: () => calls.filter((c) => c.url.startsWith(SUPABASE)),
  };
  /** @param {number} status @param {unknown} body */
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const missing = () => reply(404, { error: { code: 'resource_missing', type: 'invalid_request_error', message: 'No such object' } });
  const noCustomer = () => reply(400, { error: { code: 'resource_missing', param: 'customer', type: 'invalid_request_error', message: 'No such customer' } });
  /** @param {string | null} id */
  const deleted = (id) => !!id && customers.get(id)?.deleted === true;
  o.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const body = typeof init.body === 'string' ? init.body : null;
    const call = { url: u.href, path: u.pathname, method: init.method || 'GET', headers, form: body === null ? null : new URLSearchParams(body), body, query: u.searchParams };
    calls.push(call);
    if (u.origin === SUPABASE) {
      const token = (headers.authorization || '').replace(/^Bearer /, '');
      if (headers.apikey !== PK) return reply(401, { code: 401, error_code: 'no_api_key' });
      const user = o.users[token];
      return user ? reply(200, user) : reply(403, { code: 403, error_code: 'bad_jwt' });
    }
    if (u.origin !== 'https://api.stripe.com') throw new TypeError('unexpected host');
    if (o.fail && o.fail.path.test(u.pathname)) return reply(o.fail.status, { error: o.fail.error });
    const { method } = call, p = u.pathname;
    const key = headers['idempotency-key'];
    if (method === 'POST' && key && replays.has(`${p}|${key}`)) return new Response(replays.get(`${p}|${key}`), { status: 200, headers: { 'content-type': 'application/json' } });
    /** @param {any} body */
    const first = (body) => { if (key) replays.set(`${p}|${key}`, JSON.stringify(body)); return reply(200, body); };
    const form = call.form || new URLSearchParams();
    const metadata = Object.fromEntries([...form].filter(([k]) => /^metadata\[[a-z_]+\]$/.test(k)).map(([k, v]) => [k.slice(9, -1), v]));
    if (method === 'POST' && p === '/v1/checkout/sessions') {
      if (deleted(form.get('customer'))) return noCustomer();
      const live = /^Bearer [sr]k_live_/.test(headers.authorization || '');
      const s = {
        id: `cs_${live ? 'live' : 'test'}_A${sessions.size + 1}${'x'.repeat(12)}`, object: 'checkout.session', url: o.checkoutUrl, status: 'open',
        mode: form.get('mode'), livemode: live, customer: form.get('customer'), client_reference_id: form.get('client_reference_id'), metadata,
        automatic_tax: { enabled: form.get('automatic_tax[enabled]') === 'true' }, subscription: null, expires_at: Math.floor(o.clock() / 1000) + 86400,
      };
      sessions.set(s.id, s);
      return first(s);
    }
    if (method === 'POST' && p === '/v1/billing_portal/sessions') {
      if (form.has('flow_data[type]') && !o.portalFlows) return reply(400, { error: { type: 'invalid_request_error', message: 'This feature is not enabled for the portal configuration of cus_x.' } });
      return reply(200, { id: 'bps_1', object: 'billing_portal.session', url: 'https://billing.stripe.com/p/session/test_1' });
    }
    if (method === 'POST' && p === '/v1/customers') {
      const c = { id: `cus_New${customers.size + 1}abc`, object: 'customer', metadata };
      customers.set(c.id, c);
      return first(c);
    }
    let m;
    if (method === 'GET' && (m = /^\/v1\/prices\/(price_[A-Za-z0-9]+)$/.exec(p))) return prices.has(m[1]) ? reply(200, prices.get(m[1])) : missing();
    if (method === 'GET' && (m = /^\/v1\/checkout\/sessions\/(cs_[A-Za-z0-9_]+)$/.exec(p))) return sessions.has(m[1]) ? reply(200, sessions.get(m[1])) : missing();
    if (method === 'POST' && (m = /^\/v1\/checkout\/sessions\/(cs_[A-Za-z0-9_]+)\/expire$/.exec(p))) {
      const s = sessions.get(m[1]);
      if (!s) return missing();
      s.status = 'expired';
      return reply(200, s);
    }
    if (method === 'GET' && (m = /^\/v1\/subscriptions\/(sub_[A-Za-z0-9]+)$/.exec(p))) return subs.has(m[1]) ? reply(200, subs.get(m[1])) : missing();
    if (method === 'GET' && (m = /^\/v1\/customers\/(cus_[A-Za-z0-9]+)$/.exec(p))) {
      const c = customers.get(m[1]);
      return !c ? missing() : reply(200, c.deleted ? { id: c.id, object: 'customer', deleted: true } : c);
    }
    if (method === 'GET' && p === '/v1/subscriptions') {
      const customer = u.searchParams.get('customer');
      if (deleted(customer) && o.deletedListing !== 'empty') return noCustomer();
      const data = [...subs.values()].filter((s) => s.customer === customer).slice(0, Number(u.searchParams.get('limit') || 10));
      return reply(200, { object: 'list', data, has_more: false, url: '/v1/subscriptions' });
    }
    return missing();
  };
  return o;
}

/**
 * The app with the fake upstream as its fetch, on a clock that moves only when told.
 * @param {{ env?: Record<string, any>, up?: ReturnType<typeof upstream>, now?: ReturnType<typeof clock> }} [o]
 */
export function setup({ env = billingEnv(), up = upstream(), now = clock() } = {}) {
  /** @type {string[]} */
  const logs = [];
  up.clock = now;
  const app = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), now, log: (l) => logs.push(l), fetch: up.fetch });
  return { app, logs, env, up, now };
}

/** @param {string} path @param {{ token?: string | null, body?: any, method?: string, origin?: string | null }} [o] */
export const billingReq = (path, { token = TOKEN, body, method, origin } = {}) => req(path, {
  ...(body !== undefined ? { body } : {}), ...(method ? { method } : {}), ...(origin !== undefined ? { origin } : {}),
  headers: token ? { authorization: `Bearer ${token}` } : {},
});

let evtSeq = 0;
/** A Stripe event (livemode true: the production fixture's key is live). */
export const event = (type, object, now, { id = `evt_Fx${++evtSeq}`, livemode = true } = {}) => ({ id, object: 'event', type, created: Math.floor(now() / 1000), livemode, data: { object } });

/** POST the event to the webhook, signed as Stripe does. */
export async function deliver(app, env, ev, { secret = WHSEC, at = CLOCK_START, raw, headers = {} } = {}) {
  const payload = raw ?? JSON.stringify(ev);
  const sig = await signWebhookPayload(payload, secret, Math.floor(at / 1000));
  return app.fetch(new Request('https://angle.example.workers.dev/v1/billing/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', 'stripe-signature': sig, ...headers }, body: payload,
  }), env);
}

/** checkout.session.completed for UID, with its subscription now at Stripe. */
export async function subscribe(s, sub = subscription(), extra = {}) {
  s.up.subs.set(sub.id, sub);
  const res = await deliver(s.app, s.env, event('checkout.session.completed', { id: 'cs_test_a1', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', status: 'complete', client_reference_id: UID, customer: sub.customer, subscription: sub.id, ...extra }, s.now), { at: s.now() });
  assert.equal(res.status, 200, await res.clone().text());
  return res;
}

/** GET /v1/billing/status's body. */
export const status = async (s, token = TOKEN) => (await s.app.fetch(billingReq('/v1/billing/status', { token }), s.env)).json();
/** Parsed log lines. @param {string[]} logs */
export const lines = (logs) => logs.map((l) => JSON.parse(l));

/** Every log line (and any body given) is metadata: no account id, email, Stripe id, token, key, price or project. @param {string[]} logs @param {...unknown} bodies */
export function assertClean(logs, ...bodies) {
  const all = [...logs, ...bodies.map((b) => (typeof b === 'string' ? b : JSON.stringify(b)))].join('\n');
  for (const secret of [UID, OTHER, 'ana@example.com', TOKEN.slice(0, 40), PK, SUPABASE, 'whsec_', 'checkout.stripe.com', 'billing.stripe.com', 'does not have the required permissions']) {
    assert.ok(!all.includes(secret), `leaked ${secret.slice(0, 20)}`);
  }
  // Stripe ids and keys by their shape (a log key such as sub_status or a code such as price_mismatch is lower case)
  assert.doesNotMatch(all, /\b(?:cus|sub|si|in|price|prod|acct|cs_test|cs_live|bps)_[0-9A-Z]/, 'a Stripe id');
  assert.doesNotMatch(all, /\b[spr]k_(?:live|test)_/, 'a Stripe key');
  for (const l of logs) JSON.parse(l);
}

/** wrangler.toml's three [vars] tables (production, dev, staging) as { NAME: value }; comments left out. @param {string} toml */
export function varsTables(toml) {
  /** @type {Record<string, string>} */
  const names = { vars: 'production', 'env.dev.vars': 'dev', 'env.staging.vars': 'staging' };
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  /** @type {string | null} */
  let cur = null;
  for (const line of toml.split('\n')) {
    const head = /^\s*\[\[?([^\]]+)\]\]?\s*(?:#.*)?$/.exec(line);
    if (head) { cur = names[head[1].trim()] || null; if (cur) out[cur] = {}; continue; }
    const kv = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*(?:#.*)?$/.exec(line);
    if (cur && kv) out[cur][kv[1]] = kv[2];
  }
  return out;
}

export const WRANGLER = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
export const PAYMENTS_MD = readFileSync(new URL('../../../docs/PAYMENTS.md', import.meta.url), 'utf8');

/** A made-up staging project (20-character ref) for "once the owner has created hushmallow-staging". */
export const STAGING_SUPABASE = 'https://hmstagingtest0000000.supabase.co';
/** The staging app's origin (the release branch's preview), its APP_ORIGIN. */
export const STAGING_APP = 'https://claude-launch-rc.hushmallow.pages.dev';

/**
 * The staging Worker's env once the owner's values are in, as wrangler.toml [env.staging.vars] will have them
 * (billing+testing, its own project, a test key, the pinned API version, Stripe Tax off), with the Worker's own
 * in-memory limits (20 billing requests and 3 sessions a minute) on the app's clock. Billing is on only where
 * src/config.js has a staging project (test/staging-loader.js).
 * @param {Record<string, any>} [over]
 */
export function stagingWorkerEnv(over = {}) {
  return makeEnv({
    PROVIDER: 'mock', ALLOWED_ORIGINS: `https://ramkumarjothi1982.github.io,${STAGING_APP}`, ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: 'hm-test-e2e-0001',
    ACCOUNTS_STAGE: 'staging', SUPABASE_URL: STAGING_SUPABASE, SUPABASE_PUBLISHABLE_KEY: PK, APP_ORIGIN: STAGING_APP,
    STRIPE_SECRET_KEY: TEST_KEY, STRIPE_WEBHOOK_SECRET: WHSEC,
    STRIPE_PRICE_PAID_MONTHLY: PRICES.paidMonthly, STRIPE_PRICE_PAID_YEARLY: PRICES.paidYearly,
    STRIPE_PRICE_ULTRA_MONTHLY: PRICES.ultraMonthly, STRIPE_PRICE_ULTRA_YEARLY: PRICES.ultraYearly,
    STRIPE_API_VERSION: STRIPE_API_VERSION_EXPECTED, STRIPE_AUTOMATIC_TAX: 'false',
    BILLING: memoryBillingNamespace(), BILLING_IP_LIMITER: undefined, SESSION_IP_LIMITER: undefined,
    ...over,
  });
}
/** A copy of src/config.js with only STAGING_SUPABASE_PROJECT_URL filled in (the one line the owner's values change). @param {string} url */
export async function withStagingProject(url) {
  const line = "const STAGING_SUPABASE_PROJECT_URL = '';";
  const src = readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
  assert.equal(src.split(line).length, 2, 'the placeholder line is there exactly once');
  const dir = mkdtempSync(join(tmpdir(), 'hm-angle-staging-'));
  const file = join(dir, 'config.js');
  writeFileSync(file, src.replace(line, `const STAGING_SUPABASE_PROJECT_URL = '${url}';`));
  try { return await import(pathToFileURL(file).href); } finally { rmSync(dir, { recursive: true, force: true }); }
}
