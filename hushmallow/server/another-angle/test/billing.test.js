// Web subscriptions (src/billing/): Stripe's webhook signature, checkout /
// status / portal against a fake Stripe and a fake sign-in project, the
// Billing Durable Object's state machine, POST /v1/session in the billing
// modes, and the modes that existed before, unchanged.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeEnv, req, angleReq, clock, allowAll, denyAll, ORIGIN, CLOCK_START, SYSTEM_PROMPT } from './helpers.js';
import { createApp } from '../src/app.js';
import { createMockProvider } from '../src/providers/mock.js';
import { verifyWebhookSignature, signWebhookPayload, formEncode, SIGNATURE_TOLERANCE_SEC } from '../src/billing/stripe.js';
import { memoryBillingNamespace, billingClient, summarise, supersedes, effectiveTier, planForPrice, PERIOD_GRACE_MS, EVENT_KEEP_MS, Billing } from '../src/billing/store.js';
import { createAccountVerifier } from '../src/billing/account.js';
import { CHECKOUT_WINDOW_MS } from '../src/billing/routes.js';
import { price as sellable, PRICE_SLOTS } from './billing-fixtures.js';
import { readConfig, SUPABASE_PROJECT_URL, STAGING_SUPABASE_PROJECT_URL } from '../src/config.js';
import { fromB64url } from '../src/auth/tokens.js';
import worker from '../src/index.js';

const SUPABASE = 'https://igbxbfuaoybfzsroxuln.supabase.co';
const APP = 'https://app.hushmallow.com';
const UID = '0b0c3c1e-5f2a-4c1b-9a77-2d4e6f8a9b10';
const OTHER = '7d1f2e3a-0b4c-4d5e-8f60-718293a4b5c6';
const WHSEC = `whsec_${'b'.repeat(32)}`;
// the production Worker's key is live, and taken only with BILLING_LIVE = "approved" (src/config.js); the staging
// Worker's is a test key. Both built at runtime, so no key-shaped literal is ever committed.
const SK = `rk_live_${'a'.repeat(24)}`;
const TEST_SK = `sk_test_${'a'.repeat(24)}`;
const PK = `sb_publishable_${'c'.repeat(24)}`;
const PRICES = { paidMonthly: 'price_FlowMonthly1', paidYearly: 'price_FlowYearly1', ultraMonthly: 'price_BeyondMonthly1', ultraYearly: 'price_BeyondYearly1' };
const DAY = 86400000;

/** A Supabase-shaped access token (the fake project decides whether it is live). */
function jwt(sub = UID, { exp = (CLOCK_START + 3600000) / 1000, iss = `${SUPABASE}/auth/v1` } = {}) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub, exp, iss, role: 'authenticated', aud: 'authenticated' })}.${'s'.repeat(43)}`;
}
const TOKEN = jwt(UID);

/** The billing configuration, on: production with its live key and the owner's approval (staging: its test key). */
function billingEnv(over = {}) {
  const staging = over.ACCOUNTS_STAGE === 'staging';
  return makeEnv({
    ALLOWED_ORIGINS: `${ORIGIN},${APP},http://localhost:8000`,
    STRIPE_SECRET_KEY: staging ? TEST_SK : SK, STRIPE_WEBHOOK_SECRET: WHSEC, ...(staging ? {} : { BILLING_LIVE: 'approved' }),
    STRIPE_PRICE_PAID_MONTHLY: PRICES.paidMonthly, STRIPE_PRICE_PAID_YEARLY: PRICES.paidYearly,
    STRIPE_PRICE_ULTRA_MONTHLY: PRICES.ultraMonthly, STRIPE_PRICE_ULTRA_YEARLY: PRICES.ultraYearly,
    SUPABASE_URL: SUPABASE, SUPABASE_PUBLISHABLE_KEY: PK, APP_ORIGIN: APP,
    BILLING: memoryBillingNamespace(), BILLING_IP_LIMITER: allowAll(), PROVIDER: 'mock',
    ...over,
  });
}

/** A subscription as Stripe returns it (newer API: the period end on the item). */
function subscription(over = {}, { price = PRICES.ultraMonthly, end = (CLOCK_START + 30 * DAY) / 1000, lookup = null } = {}) {
  return {
    id: 'sub_Test123', object: 'subscription', customer: 'cus_Test123', status: 'active', cancel_at_period_end: false, cancel_at: null,
    metadata: { user_id: UID }, items: { object: 'list', data: [{ id: 'si_1', price: { id: price, lookup_key: lookup }, current_period_end: end }] },
    ...over,
  };
}

/** A fake Stripe + sign-in project behind one fetch, recording every call. */
function upstream({ users = { [TOKEN]: { id: UID, email: 'ana@example.com' } } } = {}) {
  const calls = [];
  const subs = new Map();
  const customers = new Map();
  const o = { calls, subs, users, customers, stripeDown: false, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_a1' };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  o.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const call = { url: u.href, path: u.pathname, method: init.method || 'GET', headers, form: typeof init.body === 'string' ? new URLSearchParams(init.body) : null };
    calls.push(call);
    if (u.origin === SUPABASE) {
      const token = (headers.authorization || '').replace(/^Bearer /, '');
      if (headers.apikey !== PK) return reply(401, { code: 401, error_code: 'no_api_key' });
      const user = o.users[token];
      return user ? reply(200, user) : reply(403, { code: 403, error_code: 'bad_jwt' });
    }
    if (u.origin !== 'https://api.stripe.com') throw new TypeError('unexpected host');
    if (o.stripeDown) return reply(500, { error: { type: 'api_error', message: 'down' } });
    // checkout's price check (the four configured prices, sellable) and the account's own customer (one per idempotency key)
    const pm = /^\/v1\/prices\/(price_[A-Za-z0-9]+)$/.exec(u.pathname);
    if (call.method === 'GET' && pm) return PRICE_SLOTS[pm[1]] ? reply(200, sellable(pm[1], ...PRICE_SLOTS[pm[1]])) : reply(404, { error: { code: 'resource_missing' } });
    if (call.method === 'POST' && u.pathname === '/v1/customers') {
      const key = headers['idempotency-key'] || String(customers.size);
      if (!customers.has(key)) customers.set(key, `cus_New${customers.size + 1}abc`);
      return reply(200, { id: customers.get(key), object: 'customer' });
    }
    if (call.method === 'POST' && u.pathname === '/v1/checkout/sessions') return reply(200, { id: 'cs_test_a1', object: 'checkout.session', url: o.checkoutUrl });
    if (call.method === 'POST' && u.pathname === '/v1/billing_portal/sessions') return reply(200, { id: 'bps_1', object: 'billing_portal.session', url: 'https://billing.stripe.com/p/session/test_1' });
    const m = /^\/v1\/subscriptions\/(sub_[A-Za-z0-9]+)$/.exec(u.pathname);
    if (call.method === 'GET' && m) return subs.has(m[1]) ? reply(200, subs.get(m[1])) : reply(404, { error: { code: 'resource_missing', type: 'invalid_request_error', message: `No such subscription: '${m[1]}'` } });
    // a customer's subscriptions (the webhook lists them when one ends)
    if (call.method === 'GET' && u.pathname === '/v1/subscriptions') return reply(200, { object: 'list', data: [...subs.values()].filter((x) => x.customer === u.searchParams.get('customer')), has_more: false });
    return reply(404, { error: { code: 'resource_missing' } });
  };
  o.stripe = () => calls.filter((c) => c.url.startsWith('https://api.stripe.com'));
  o.supabase = () => calls.filter((c) => c.url.startsWith(SUPABASE));
  return o;
}

/** The app with the fake upstream as its fetch (createApp's `fetch` option), on a clock that moves only when told. */
function setup({ env = billingEnv(), up = upstream(), now = clock() } = {}) {
  const logs = [];
  const app = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), now, log: (l) => logs.push(l), fetch: up.fetch });
  return { app, logs, env, up, now };
}

const billingReq = (path, { token = TOKEN, body, method, origin } = {}) => req(path, {
  ...(body !== undefined ? { body } : {}), ...(method ? { method } : {}), ...(origin !== undefined ? { origin } : {}),
  headers: token ? { authorization: `Bearer ${token}` } : {},
});
let evtSeq = 0;
// livemode true: the shared fixture's key is live, and the webhook applies only events of its own mode
const event = (type, object, now, id = `evt_Test${++evtSeq}`) => ({ id, object: 'event', type, created: Math.floor(now() / 1000), livemode: true, data: { object } });
async function deliver(app, env, ev, { secret = WHSEC, at, tamper = null, header } = {}) {
  const payload = JSON.stringify(ev);
  const sig = header ?? await signWebhookPayload(payload, secret, Math.floor((at ?? CLOCK_START) / 1000));
  return app.fetch(new Request('https://angle.example.workers.dev/v1/billing/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', 'stripe-signature': sig }, body: tamper ? tamper(payload) : payload,
  }), env);
}
/** checkout.session.completed for UID, with its subscription now at Stripe. */
async function subscribe(s, sub = subscription()) {
  s.up.subs.set(sub.id, sub);
  const res = await deliver(s.app, s.env, event('checkout.session.completed', { id: 'cs_test_a1', object: 'checkout.session', mode: 'subscription', client_reference_id: UID, customer: sub.customer, subscription: sub.id }, s.now), { at: s.now() });
  assert.equal(res.status, 200, await res.clone().text());
  return res;
}
const status = async (s, token = TOKEN) => (await s.app.fetch(billingReq('/v1/billing/status', { token }), s.env)).json();
const claims = (token) => JSON.parse(new TextDecoder().decode(fromB64url(token.split('.')[1])));
/** Every log line is metadata: no account id, email, Stripe id, token or key. */
function assertClean(logs) {
  const all = logs.join('\n');
  for (const secret of [UID, OTHER, 'ana@example.com', 'cus_Test123', 'sub_Test123', 'cs_test_a1', TOKEN.slice(0, 40), SK, WHSEC, PK, 'checkout.stripe.com', 'billing.stripe.com']) {
    assert.ok(!all.includes(secret), `log leaked ${secret.slice(0, 20)}`);
  }
  for (const l of logs) JSON.parse(l);
}

// --------------------------------------------------------------- signature --
test('webhook signature: valid, wrong secret, stale or future timestamp, tampered body, malformed header', async () => {
  const payload = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' });
  const t = Math.floor(CLOCK_START / 1000);
  const header = await signWebhookPayload(payload, WHSEC, t);
  assert.match(header, /^t=\d+,v1=[0-9a-f]{64}$/);
  assert.deepEqual(await verifyWebhookSignature(payload, header, WHSEC, CLOCK_START), { ok: true, timestamp: t });
  // still fine just inside the 5 minutes
  assert.equal((await verifyWebhookSignature(payload, header, WHSEC, CLOCK_START + SIGNATURE_TOLERANCE_SEC * 1000)).ok, true);
  assert.equal((await verifyWebhookSignature(payload, header, `whsec_${'x'.repeat(32)}`, CLOCK_START)).code, 'bad_signature', 'wrong secret');
  assert.equal((await verifyWebhookSignature(payload, header, WHSEC, CLOCK_START + (SIGNATURE_TOLERANCE_SEC + 1) * 1000)).code, 'stale', 'replayed later');
  assert.equal((await verifyWebhookSignature(payload, await signWebhookPayload(payload, WHSEC, t + 600), WHSEC, CLOCK_START)).code, 'stale', 'from the future');
  assert.equal((await verifyWebhookSignature(payload.replace('updated', 'deleted'), header, WHSEC, CLOCK_START)).code, 'bad_signature', 'tampered body');
  assert.equal((await verifyWebhookSignature(`${payload} `, header, WHSEC, CLOCK_START)).code, 'bad_signature', 'one byte more');
  // a re-signed timestamp with the old signature does not pass
  assert.equal((await verifyWebhookSignature(payload, header.replace(`t=${t}`, `t=${t + 1}`), WHSEC, CLOCK_START)).code, 'bad_signature');
  for (const bad of ['', 't=abc,v1=00', `v1=${'0'.repeat(64)}`, `t=${t}`, `t=${t},v1=nothex`, `t=${t},v0=${'0'.repeat(64)}`]) {
    assert.equal((await verifyWebhookSignature(payload, bad, WHSEC, CLOCK_START)).ok, false, bad);
  }
  assert.equal((await verifyWebhookSignature(payload, null, WHSEC, CLOCK_START)).code, 'missing');
  assert.equal((await verifyWebhookSignature(payload, header, '', CLOCK_START)).code, 'missing', 'no secret configured never passes');
  // while a secret is rolled Stripe signs with both: either v1 may match
  const old = await signWebhookPayload(payload, `whsec_${'o'.repeat(32)}`, t);
  assert.equal((await verifyWebhookSignature(payload, `${header},v1=${old.split('v1=')[1]}`, `whsec_${'o'.repeat(32)}`, CLOCK_START)).ok, true);
  assert.equal((await verifyWebhookSignature(payload, `${old},v1=${header.split('v1=')[1]}`, WHSEC, CLOCK_START)).ok, true);
});

test('Stripe form encoding: nested objects and arrays', () => {
  const s = formEncode({ mode: 'subscription', line_items: [{ price: 'price_A', quantity: 1 }], metadata: { user_id: UID }, skip: undefined, none: null });
  const p = new URLSearchParams(s);
  assert.equal(p.get('mode'), 'subscription');
  assert.equal(p.get('line_items[0][price]'), 'price_A');
  assert.equal(p.get('line_items[0][quantity]'), '1');
  assert.equal(p.get('metadata[user_id]'), UID);
  assert.ok(!s.includes('skip') && !s.includes('none'));
});

// ------------------------------------------------------------------ config --
test('config: billing is off by default; every value is checked for its shape', () => {
  assert.equal(readConfig({}).billing.configured, false);
  assert.equal(readConfig(makeEnv()).billing.configured, false);
  const on = readConfig(billingEnv());
  assert.equal(on.billing.configured, true);
  assert.equal(on.billing.appOrigin, APP);
  assert.equal(on.billing.tokenTtlMs, 24 * 3600000);
  assert.deepEqual(on.billing.prices.ultra, { monthly: PRICES.ultraMonthly, yearly: PRICES.ultraYearly });
  const off = (over) => readConfig(billingEnv(over)).billing;
  assert.equal(off({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co' }).configured, false, 'only hushmallow1');
  assert.equal(off({ SUPABASE_PUBLISHABLE_KEY: `sb_secret_${'c'.repeat(24)}` }).configured, false, 'never a secret key');
  assert.equal(off({ APP_ORIGIN: 'https://evil.example' }).configured, false, 'APP_ORIGIN must be an allowed origin');
  assert.equal(off({ APP_ORIGIN: `${APP}/somewhere` }).configured, false, 'an origin only');
  assert.equal(off({ APP_ORIGIN: 'http://app.hushmallow.com' }).configured, false, 'https');
  assert.equal(off({ STRIPE_SECRET_KEY: 'pk_test_abcdefghijkl' }).configured, false, 'a publishable Stripe key is not a secret key');
  assert.equal(off({ STRIPE_PRICE_PAID_MONTHLY: '', STRIPE_PRICE_PAID_YEARLY: '', STRIPE_PRICE_ULTRA_MONTHLY: 'prod_x', STRIPE_PRICE_ULTRA_YEARLY: '' }).configured, false, 'at least one price id');
  assert.equal(off({ STRIPE_WEBHOOK_SECRET: 'not-a-secret' }).webhookSecret, '');
  assert.equal(off({ APP_ORIGIN: 'http://localhost:8000' }).appOrigin, 'http://localhost:8000', 'http only for a local rehearsal');
  assert.equal(readConfig({ ENTITLEMENT_MODE: 'billing+testing' }).entitlementMode, 'billing+testing');
  assert.equal(readConfig({ ENTITLEMENT_MODE: 'stripe' }).entitlementMode, 'testing', 'an unknown mode reads as testing, as before');
});

// The wrangler.toml guards follow the configuration (as the app's ANGLE_ENDPOINT tests do): billing off (today), each
// table keeps a mode from before billing; switched on as docs/PAYMENTS.md sections 2 and 4 say, each value must have its
// shape. So the switch-on commit needs no change to any test, and a half-done one cannot deploy.
const BILLING_VARS = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'APP_ORIGIN', 'STRIPE_PRICE_PAID_MONTHLY', 'STRIPE_PRICE_PAID_YEARLY', 'STRIPE_PRICE_ULTRA_MONTHLY', 'STRIPE_PRICE_ULTRA_YEARLY', 'BILLING_TOKEN_TTL_HOURS', 'STRIPE_API_VERSION'];
const PRICE_VARS = { STRIPE_PRICE_PAID_MONTHLY: ['paid', 'monthly'], STRIPE_PRICE_PAID_YEARLY: ['paid', 'yearly'], STRIPE_PRICE_ULTRA_MONTHLY: ['ultra', 'monthly'], STRIPE_PRICE_ULTRA_YEARLY: ['ultra', 'yearly'] };
const WRANGLER = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const PAYMENTS_MD = readFileSync(new URL('../../../docs/PAYMENTS.md', import.meta.url), 'utf8');

/** wrangler.toml's three [vars] tables (production, dev, staging) as { NAME: value }; comments left out. */
function varsTables(toml) {
  const names = { vars: 'production', 'env.dev.vars': 'dev', 'env.staging.vars': 'staging' };
  const out = {};
  let cur = null;
  for (const line of toml.split('\n')) {
    const head = /^\s*\[\[?([^\]]+)\]\]?\s*(?:#.*)?$/.exec(line);
    if (head) { cur = names[head[1].trim()] || null; if (cur) out[cur] = {}; continue; }
    const kv = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*(?:#.*)?$/.exec(line);
    if (cur && kv) out[cur][kv[1]] = kv[2];
  }
  return out;
}

/** Every wrangler.toml guard, for the file as committed or as the owner will edit it. Throws on the first problem. */
function checkWrangler(toml) {
  const live = toml.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const tables = varsTables(toml);
  assert.deepEqual(Object.keys(tables), ['production', 'dev', 'staging']);
  for (const [name, vars] of Object.entries(tables)) {
    for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) assert.ok(!(k in vars), `${name}: ${k} is a secret (wrangler secret put), never a var`);
    const mode = vars.ENTITLEMENT_MODE;
    if (!BILLING_VARS.some((k) => k in vars)) {
      // billing off: a mode from before billing existed ("testing" as committed), never one that needs billing
      assert.ok(['testing', 'storekit', 'both'].includes(mode), `${name}: ENTITLEMENT_MODE "${mode}" without the billing vars`);
      continue;
    }
    // [env.staging]: its billing values are the staging project's and the test prices, placeholders until the owner
    // creates them (docs/STAGING.md); the staging tests below pin them, and staging never names hushmallow1
    if (name === 'staging') {
      assert.ok(['billing', 'billing+testing', 'testing'].includes(mode), `staging: ENTITLEMENT_MODE "${mode}"`);
      assert.ok(!String(vars.SUPABASE_URL || '').includes('igbxbfuaoybfzsroxuln'), 'staging never uses the production sign-in project');
      continue;
    }
    // switched on: complete, and every value has its shape (readConfig counts a misshapen one as unset), with
    // stand-ins for the two secrets, which never live here, and for the approval until its own commit
    const b = readConfig({ BILLING_LIVE: 'approved', ...vars, STRIPE_SECRET_KEY: SK, STRIPE_WEBHOOK_SECRET: WHSEC }).billing;
    assert.equal(b.configured, true, `${name}: the billing vars are complete, each with its shape`);
    assert.equal(b.supabaseUrl, String(vars.SUPABASE_URL).replace(/\/+$/, ''), `${name}: SUPABASE_URL is hushmallow1`);
    assert.equal(b.supabaseKey, vars.SUPABASE_PUBLISHABLE_KEY, `${name}: SUPABASE_PUBLISHABLE_KEY is a publishable key`);
    assert.equal(b.appOrigin, vars.APP_ORIGIN, `${name}: APP_ORIGIN is an origin in this table's ALLOWED_ORIGINS`);
    for (const [k, [plan, period]] of Object.entries(PRICE_VARS)) if (k in vars) assert.equal(b.prices[plan][period], vars[k], `${name}: ${k} is a price_ id`);
    if ('BILLING_TOKEN_TTL_HOURS' in vars) assert.equal(b.tokenTtlMs, Number(vars.BILLING_TOKEN_TTL_HOURS) * 3600000, `${name}: BILLING_TOKEN_TTL_HOURS`);
    if ('STRIPE_API_VERSION' in vars) assert.equal(b.apiVersion, vars.STRIPE_API_VERSION, `${name}: STRIPE_API_VERSION`);
    assert.ok(['testing', 'storekit', 'both', 'billing', 'billing+testing'].includes(mode), `${name}: ENTITLEMENT_MODE "${mode}"`);
  }
  assert.match(live, /\[\[migrations\]\]\ntag = "v1"\nnew_sqlite_classes = \["Ledger"\]\n\n\[\[migrations\]\]\ntag = "v2"\nnew_sqlite_classes = \["Billing"\]/);
  assert.match(live, /\[\[env\.staging\.migrations\]\]\ntag = "v2"\nnew_sqlite_classes = \["Billing"\]/);
  assert.equal((live.match(/name = "BILLING"\nclass_name = "Billing"/g) || []).length, 3);
  assert.equal((live.match(/name = "BILLING_IP_LIMITER"/g) || []).length, 3);
  for (const k of [...BILLING_VARS, 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) assert.match(toml, new RegExp(k), `${k} is documented`);
  // a secret never, anywhere (comments included); the public values only as their own var's value
  assert.doesNotMatch(toml, /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]|whsec_[A-Za-z0-9]|sb_secret_[A-Za-z0-9]/, 'no secret');
  const rest = toml.split('\n').filter((l) => !/^\s*(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|STRIPE_PRICE_[A-Z_]+)\s*=/.test(l)).join('\n');
  assert.doesNotMatch(rest, /price_[A-Za-z0-9]|sb_publishable_[A-Za-z0-9]|supabase\.co/, 'a billing value only as its own var');
}

/** wrangler.toml with billing off: as committed today, or with a switch-on taken out again. */
const offOf = (toml) => toml
  .replace(/^(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|APP_ORIGIN|STRIPE_PRICE_[A-Z_]+|BILLING_TOKEN_TTL_HOURS|STRIPE_API_VERSION) = .*\n/gm, '')
  .replace(/^ENTITLEMENT_MODE = "[^"]*"$/gm, 'ENTITLEMENT_MODE = "testing"');

/** wrangler.toml as docs/PAYMENTS.md tells the owner to edit it: section 2's vars in production's [vars], then section 4's mode. */
function switchedOn(mode = 'billing+testing') {
  const block = /Then add the vars to `\[vars\]`[\s\S]*?```\n([\s\S]*?)```/.exec(PAYMENTS_MD)?.[1];
  assert.ok(block, 'PAYMENTS.md section 2 has the vars block');
  let n = 0;
  // the owner's own values, stood in for with ones of the same shape
  const lines = block.replace(/sb_publishable_…/g, `sb_publishable_${'k'.repeat(24)}`).replace(/price_…/g, () => `price_Rehearsal${++n}`);
  assert.equal(n, 4, 'the four price ids');
  const off = offOf(WRANGLER);
  const at = off.indexOf('APPLE_ENVIRONMENTS = "Production"\n') + 'APPLE_ENVIRONMENTS = "Production"\n'.length;
  assert.ok(at > 100);
  const doc = /\| `billing\+testing` \|/.test(PAYMENTS_MD) && /set `ENTITLEMENT_MODE = "billing\+testing"`/.test(PAYMENTS_MD);
  assert.ok(doc, 'PAYMENTS.md section 4 names the mode');
  // (production's [vars] come first in the file)
  const toml = `${off.slice(0, at)}${lines}${off.slice(at)}`.replace('ENTITLEMENT_MODE = "testing"', `ENTITLEMENT_MODE = "${mode}"`);
  assert.deepEqual(Object.values(varsTables(toml).production).filter((v) => v.includes('…')), [], 'no placeholder left in a value');
  return toml;
}

test('wrangler.toml as committed passes the guards (off: every mode as before, no billing value; on: every value has its shape)', () => {
  checkWrangler(WRANGLER);
  // off and on are the same file apart from the switch: the Billing class in migration v2, bound in all three environments
  checkWrangler(offOf(WRANGLER));
  assert.deepEqual(Object.values(varsTables(offOf(WRANGLER))).map((v) => v.ENTITLEMENT_MODE), ['testing', 'testing', 'testing']);
  assert.equal(varsTables(WRANGLER).production.ALLOWED_ORIGINS, 'https://app.hushmallow.com,https://hushmallow.pages.dev,https://ramkumarjothi1982.github.io');
});

test('wrangler.toml switched on exactly as docs/PAYMENTS.md says passes the same guards; a half-done or wrong switch does not', () => {
  for (const mode of ['billing+testing', 'billing', 'testing']) checkWrangler(switchedOn(mode));
  const on = varsTables(switchedOn()).production;
  assert.equal(readConfig({ ...on, STRIPE_SECRET_KEY: SK, STRIPE_WEBHOOK_SECRET: WHSEC }).entitlementMode, 'billing+testing');
  assert.equal(on.APP_ORIGIN, APP);
  // a billing mode without the vars (every session refused): never
  assert.throws(() => checkWrangler(offOf(WRANGLER).replace('ENTITLEMENT_MODE = "testing"', 'ENTITLEMENT_MODE = "billing"')), /without the billing vars/);
  // half the vars, another sign-in project, an origin the server does not allow, a price that is not a price id
  assert.throws(() => checkWrangler(switchedOn().replace(/^STRIPE_PRICE_[A-Z_]+ = .*\n/gm, '')), /complete, each with its shape/);
  assert.throws(() => checkWrangler(switchedOn().replace('igbxbfuaoybfzsroxuln', 'abcdefghijklmnopqrst')), /complete, each with its shape|hushmallow1/);
  assert.throws(() => checkWrangler(switchedOn().replace('APP_ORIGIN = "https://app.hushmallow.com"', 'APP_ORIGIN = "https://hushmallow.com"')), /complete, each with its shape|APP_ORIGIN/);
  assert.throws(() => checkWrangler(switchedOn().replace('price_Rehearsal2', 'prod_Rehearsal2')), /price_ id/);
  // the secrets never as vars, nor anywhere in the file; a public value only on its own line
  assert.throws(() => checkWrangler(switchedOn().replace('APP_ORIGIN =', `STRIPE_SECRET_KEY = "${SK}"\nAPP_ORIGIN =`)), /never a var/);
  assert.throws(() => checkWrangler(`${switchedOn()}\n# whsec_${'q'.repeat(24)}\n`), /no secret/);
  assert.throws(() => checkWrangler(`${WRANGLER}\n# price_Stray1 was the old one\n`), /only as its own var/);
});

// -------------------------------------------------------------- not set up --
/** /v1/health's key flags (test/billing-env.test.js): the production fixture's approved live key, the staging one's test key, none. */
const FLAGS = {
  live: { stripe_mode: 'live', live_approved: true, api_version: null, automatic_tax: false },
  test: { stripe_mode: 'test', live_approved: false, api_version: null, automatic_tax: false },
  none: { stripe_mode: null, live_approved: false, api_version: null, automatic_tax: false },
};
test('not configured: every billing route answers 503, health says so, and nothing is called', async () => {
  const up = upstream();
  const s = setup({ env: makeEnv({ PROVIDER: 'mock' }), up });
  for (const [path, o] of [['/v1/billing/checkout', { body: { plan: 'ultra', period: 'monthly' } }], ['/v1/billing/status', {}], ['/v1/billing/portal', { body: {} }]]) {
    const res = await s.app.fetch(billingReq(path, o), s.env);
    assert.equal(res.status, 503, path);
    assert.equal((await res.json()).error.code, 'billing_not_configured');
  }
  const wh = await deliver(s.app, s.env, event('customer.subscription.updated', subscription(), s.now));
  assert.equal(wh.status, 503, 'no webhook secret: Stripe keeps retrying until it is set');
  const h = await (await s.app.fetch(req('/v1/health'), s.env)).json();
  assert.deepEqual(h.billing, { configured: false, webhook: false, ...FLAGS.none });
  assert.deepEqual(h.configured, { signing_key: true, provider_key: true }, 'the existing block is unchanged');
  assert.equal(up.calls.length, 0);
  // configured, but the Durable Object is not bound: still off (never an in-memory stand-in)
  const unbound = setup({ env: billingEnv({ BILLING: undefined }), up });
  assert.equal((await unbound.app.fetch(billingReq('/v1/billing/status'), unbound.env)).status, 503);
  assert.deepEqual((await (await unbound.app.fetch(req('/v1/health'), unbound.env)).json()).billing, { configured: false, webhook: true, ...FLAGS.live });
  assert.deepEqual((await (await s.app.fetch(req('/v1/health'), billingEnv())).json()).billing, { configured: true, webhook: true, ...FLAGS.live });
});

// ---------------------------------------------------------------- checkout --
test('checkout: the account is checked with the sign-in project, then a subscription Checkout Session for the plan', async () => {
  const s = setup();
  const res = await s.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'ultra', period: 'yearly' } }), s.env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { url: s.up.checkoutUrl });
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  const [sb] = s.up.supabase();
  assert.equal(sb.url, `${SUPABASE}/auth/v1/user`);
  assert.equal(sb.headers.apikey, PK);
  assert.equal(sb.headers.authorization, `Bearer ${TOKEN}`);
  // the price is read first (src/billing/routes.js CHECKOUT_PRICE_RULES), then the account's own customer is made
  const sessions = () => s.up.stripe().filter((c) => c.method === 'POST' && c.path === '/v1/checkout/sessions');
  assert.deepEqual(s.up.stripe().map((c) => `${c.method} ${c.path}`), [`GET /v1/prices/${PRICES.ultraYearly}`, 'POST /v1/customers', 'POST /v1/checkout/sessions']);
  const [st] = sessions();
  assert.equal(st.headers.authorization, `Bearer ${SK}`);
  assert.equal(st.headers['content-type'], 'application/x-www-form-urlencoded');
  const f = Object.fromEntries(st.form);
  assert.deepEqual(f, {
    mode: 'subscription', 'line_items[0][price]': PRICES.ultraYearly, 'line_items[0][quantity]': '1', customer: 'cus_New1abc', client_reference_id: UID,
    success_url: `${APP}/?billing=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${APP}/?billing=cancel`,
    'metadata[user_id]': UID, 'metadata[plan]': 'ultra', 'metadata[period]': 'yearly', 'metadata[price]': PRICES.ultraYearly, 'subscription_data[metadata][user_id]': UID,
  });
  // Flow monthly maps to its own price
  await s.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'paid', period: 'monthly' } }), s.env);
  assert.equal(sessions()[1].form.get('line_items[0][price]'), PRICES.paidMonthly);
  // the account answer is kept a minute: no second question to the sign-in project, then asked again
  assert.equal(s.up.supabase().length, 1);
  s.now.advance(61000);
  await s.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'paid', period: 'monthly' } }), s.env);
  assert.equal(s.up.supabase().length, 2);
  assertClean(s.logs);
});

test('checkout: refusals (no account, a dead session, bad bodies, no price, Stripe down, already subscribed)', async () => {
  const s = setup();
  const post = (body, token) => s.app.fetch(billingReq('/v1/billing/checkout', { body, token }), s.env);
  const code = async (res) => [res.status, (await res.json()).error?.code];
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly' }, null)), [401, 'account_required']);
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly' }, 'not-a-jwt-at-all')), [401, 'account_required']);
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly' }, jwt(UID, { exp: CLOCK_START / 1000 - 10 }))), [401, 'account_required'], 'expired');
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly' }, jwt(UID, { iss: 'https://abcdefghijklmnopqrst.supabase.co/auth/v1' }))), [401, 'account_required'], 'another project');
  assert.equal(s.up.calls.length, 0, 'none of those asked anyone');
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly' }, jwt(OTHER))), [401, 'account_required'], 'the project does not know it');
  assert.equal(s.up.supabase().length, 1);
  // the project answering for a different account than the token names
  s.up.users[jwt(OTHER)] = { id: UID };
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly' }, jwt(OTHER))), [401, 'account_required']);
  assert.deepEqual(await code(await post({ plan: 'premium', period: 'monthly' })), [400, 'invalid_plan']);
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'weekly' })), [400, 'invalid_period']);
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly', text: 'my words' })), [400, 'invalid_body'], 'nothing but plan and period');
  assert.deepEqual(await code(await s.app.fetch(billingReq('/v1/billing/checkout', { method: 'GET' }), s.env)), [405, 'method_not_allowed']);
  const noYearly = setup({ env: billingEnv({ STRIPE_PRICE_ULTRA_YEARLY: '' }) });
  assert.deepEqual(await code(await noYearly.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'ultra', period: 'yearly' } }), noYearly.env)), [503, 'price_not_configured']);
  s.up.stripeDown = true;
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly' })), [502, 'billing_unavailable']);
  s.up.stripeDown = false;
  s.up.checkoutUrl = 'javascript:alert(1)';
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'monthly' })), [502, 'billing_unavailable'], 'only an https URL goes back');
  s.up.checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_test_a1';
  // the sign-in project unreachable: 503, not "sign in"
  const base = upstream();
  const flaky = setup({ up: { ...base, fetch: async (u, i) => (String(u).startsWith(SUPABASE) ? Promise.reject(new TypeError('offline')) : base.fetch(u, i)) } });
  assert.deepEqual(await code(await flaky.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'ultra', period: 'monthly' } }), flaky.env)), [503, 'account_unavailable']);
  // one subscription per account: a change of plan goes through the portal
  await subscribe(s);
  assert.deepEqual(await code(await post({ plan: 'ultra', period: 'yearly' })), [409, 'already_subscribed']);
  assert.deepEqual(await code(await post({ plan: 'paid', period: 'monthly' })), [409, 'already_subscribed']);
  // burst limit
  const limited = setup({ env: billingEnv({ BILLING_IP_LIMITER: denyAll() }) });
  assert.deepEqual(await code(await limited.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'ultra', period: 'monthly' } }), limited.env)), [429, 'rate_limited']);
  assert.equal(limited.up.calls.length, 0);
  assertClean(s.logs);
});

test('checkout: two tabs at once get one Checkout Session (one idempotency key per account, plan and period, for two minutes)', async () => {
  const s = setup();
  const post = (plan, period, token = TOKEN) => s.app.fetch(billingReq('/v1/billing/checkout', { body: { plan, period }, token }), s.env);
  const keys = () => s.up.stripe().filter((c) => c.path === '/v1/checkout/sessions').map((c) => c.headers['idempotency-key']);
  await Promise.all([post('ultra', 'monthly'), post('ultra', 'monthly')]);
  const [a, b] = keys();
  assert.ok(a && a === b, 'the same key, so Stripe gives back the same session: it can be paid once');
  await post('ultra', 'yearly');
  await post('paid', 'monthly');
  s.up.users[jwt(OTHER)] = { id: OTHER };
  await post('ultra', 'monthly', jwt(OTHER));
  s.now.advance(CHECKOUT_WINDOW_MS);
  await post('ultra', 'monthly');
  assert.equal(new Set(keys()).size, 5, 'another period, plan or account, or a later try: a key of its own');
  for (const k of keys()) assert.ok(k.length <= 255, 'within Stripe\'s limit');
  // the portal and the webhook's reads carry none (the customer's own is customer:<account>: test/billing-checkout.test.js)
  const before = s.up.stripe().length;
  await subscribe(s);
  await s.app.fetch(billingReq('/v1/billing/portal', { body: {} }), s.env);
  assert.deepEqual(s.up.stripe().slice(before).map((c) => [c.path, c.headers['idempotency-key']]), [['/v1/subscriptions/sub_Test123', undefined], ['/v1/billing_portal/sessions', undefined]]);
  assertClean(s.logs);
});

test('checkout after a cancelled subscription reuses the Stripe customer', async () => {
  const s = setup();
  await subscribe(s, subscription({ status: 'canceled' }));
  const res = await s.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'paid', period: 'monthly' } }), s.env);
  assert.equal(res.status, 200);
  assert.equal(s.up.stripe().find((c) => c.path === '/v1/checkout/sessions').form.get('customer'), 'cus_Test123');
});

// ---------------------------------------------------------- status / portal --
test('status and portal: nothing yet, then the plan the webhook recorded; the portal for its customer', async () => {
  const s = setup();
  assert.deepEqual(await status(s), { tier: 'none', status: 'none', current_period_end: null, cancel_at_period_end: false, ends_at: null, manageable: false });
  assert.equal((await s.app.fetch(billingReq('/v1/billing/status', { token: null }), s.env)).status, 401);
  const none = await s.app.fetch(billingReq('/v1/billing/portal', { body: {} }), s.env);
  assert.equal(none.status, 404);
  assert.equal((await none.json()).error.code, 'no_subscription');
  await subscribe(s);
  assert.deepEqual(await status(s), { tier: 'ultra', status: 'active', current_period_end: new Date(CLOCK_START + 30 * DAY).toISOString(), cancel_at_period_end: false, ends_at: null, manageable: true });
  const p = await s.app.fetch(billingReq('/v1/billing/portal', { body: {} }), s.env);
  assert.equal(p.status, 200);
  assert.deepEqual(await p.json(), { url: 'https://billing.stripe.com/p/session/test_1' });
  const call = s.up.stripe().find((c) => c.path === '/v1/billing_portal/sessions');
  assert.deepEqual(Object.fromEntries(call.form), { customer: 'cus_Test123', return_url: `${APP}/?billing=portal` });
  // another account sees only its own (nothing)
  s.up.users[jwt(OTHER)] = { id: OTHER };
  assert.equal((await status(s, jwt(OTHER))).tier, 'none');
  assert.equal((await s.app.fetch(billingReq('/v1/billing/status', { method: 'POST', body: {} }), s.env)).status, 405);
  assertClean(s.logs);
});

// ----------------------------------------------------------------- webhook --
test('webhook: checkout → active Beyond; the same event twice is applied once; cancel at period end; ended', async () => {
  const s = setup();
  const first = event('checkout.session.completed', { id: 'cs_test_a1', object: 'checkout.session', mode: 'subscription', client_reference_id: UID, customer: 'cus_Test123', subscription: 'sub_Test123' }, s.now);
  s.up.subs.set('sub_Test123', subscription());
  const r1 = await deliver(s.app, s.env, first);
  assert.equal(r1.status, 200);
  assert.deepEqual(await r1.json(), { received: true });
  assert.equal((await status(s)).tier, 'ultra');
  // Stripe delivers it again (a retry): acknowledged, not applied twice
  s.up.subs.set('sub_Test123', subscription({ status: 'canceled' }));
  const again = await deliver(s.app, s.env, first);
  assert.deepEqual(await again.json(), { received: true, duplicate: true });
  assert.equal((await status(s)).status, 'active', 'the duplicate changed nothing');
  // cancelled in the portal, at the end of the period: still Beyond until then
  s.now.advance(60000);
  s.up.subs.set('sub_Test123', subscription({ cancel_at_period_end: true }));
  await deliver(s.app, s.env, event('customer.subscription.updated', subscription({ cancel_at_period_end: true }), s.now), { at: s.now() });
  let st = await status(s);
  assert.equal(st.tier, 'ultra');
  assert.equal(st.cancel_at_period_end, true);
  // newer API versions say it with cancel_at
  s.now.advance(60000);
  s.up.subs.set('sub_Test123', subscription({ cancel_at: (CLOCK_START + 30 * DAY) / 1000 }));
  await deliver(s.app, s.env, event('customer.subscription.updated', subscription(), s.now), { at: s.now() });
  assert.equal((await status(s)).cancel_at_period_end, true);
  // the period ends: deleted
  s.now.advance(60000);
  s.up.subs.set('sub_Test123', subscription({ status: 'canceled' }));
  await deliver(s.app, s.env, event('customer.subscription.deleted', subscription({ status: 'canceled' }), s.now), { at: s.now() });
  st = await status(s);
  assert.equal(st.tier, 'none');
  assert.equal(st.status, 'canceled');
  assert.equal(st.manageable, true, 'the portal still shows receipts');
  assertClean(s.logs);
});

test('webhook: a failed renewal keeps access while Stripe retries (past_due), and lapses once unpaid or long past the period', async () => {
  const s = setup();
  await subscribe(s);
  s.now.advance(60000);
  s.up.subs.set('sub_Test123', subscription({ status: 'past_due' }));
  // newer API: the subscription sits under parent.subscription_details on the invoice
  const inv = { id: 'in_1', object: 'invoice', customer: 'cus_Test123', parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_Test123', metadata: { user_id: UID } } } };
  assert.equal((await deliver(s.app, s.env, event('invoice.payment_failed', inv, s.now), { at: s.now() })).status, 200);
  let st = await status(s);
  assert.equal(st.status, 'past_due');
  assert.equal(st.tier, 'ultra');
  // older API: invoice.subscription, and the account found from the customer alone
  s.now.advance(60000);
  s.up.subs.set('sub_Test123', subscription({ status: 'unpaid', metadata: {} }));
  await deliver(s.app, s.env, event('invoice.payment_failed', { id: 'in_2', object: 'invoice', customer: 'cus_Test123', subscription: 'sub_Test123' }, s.now), { at: s.now() });
  st = await status(s);
  assert.equal(st.status, 'unpaid');
  assert.equal(st.tier, 'none');
  // an active record past its period end (+ one day's grace) gives nothing either
  const late = setup();
  const long = jwt(UID, { exp: (CLOCK_START + 10 * DAY) / 1000 });
  late.up.users[long] = { id: UID };
  await subscribe(late, subscription({}, { end: (CLOCK_START + DAY) / 1000 }));
  assert.equal((await status(late, long)).tier, 'ultra');
  late.now.advance(2 * DAY - 1);
  assert.equal((await status(late, long)).tier, 'ultra', 'a renewal event running late never locks anyone out');
  late.now.advance(2);
  assert.equal((await status(late, long)).tier, 'none');
});

test('webhook: out of order, other subscriptions, unknown events, unsigned or replayed deliveries', async () => {
  const s = setup();
  await subscribe(s);
  // a stale copy (Stripe gone: the event's own object, older than the record) never overwrites
  s.up.subs.delete('sub_Test123');
  const old = event('customer.subscription.updated', subscription({ status: 'incomplete' }), s.now);
  old.created -= 3600;
  await deliver(s.app, s.env, old);
  assert.equal((await status(s)).status, 'active');
  // a Flow → Beyond switch in the portal arrives as an update with the new price
  const flow = setup();
  await subscribe(flow, subscription({}, { price: PRICES.paidMonthly }));
  assert.equal((await status(flow)).tier, 'paid');
  flow.now.advance(1000);
  flow.up.subs.set('sub_Test123', subscription({}, { price: PRICES.ultraYearly }));
  await deliver(flow.app, flow.env, event('customer.subscription.updated', subscription(), flow.now), { at: flow.now() });
  assert.equal((await status(flow)).tier, 'ultra');
  // a price the owner replaced later still maps by its lookup key (the app's product id)
  flow.now.advance(1000);
  flow.up.subs.set('sub_Test123', subscription({}, { price: 'price_NewBeyond2', lookup: 'hushmallow.ultra.monthly' }));
  await deliver(flow.app, flow.env, event('customer.subscription.updated', subscription(), flow.now), { at: flow.now() });
  assert.equal((await status(flow)).tier, 'ultra');
  // a late event about an old, cancelled subscription never takes access from the current one
  s.up.subs.set('sub_Old456', subscription({ id: 'sub_Old456', status: 'canceled' }));
  await deliver(s.app, s.env, event('customer.subscription.deleted', subscription({ id: 'sub_Old456', status: 'canceled' }), s.now), { at: s.now() });
  assert.equal((await status(s)).tier, 'ultra');
  // not one of ours (no account on it, an unknown customer): nothing is given to anyone
  const before = s.up.stripe().length;
  s.up.subs.set('sub_Dash789', subscription({ id: 'sub_Dash789', customer: 'cus_Stranger1', metadata: {} }));
  const stranger = await deliver(s.app, s.env, event('customer.subscription.created', subscription({ id: 'sub_Dash789', customer: 'cus_Stranger1', metadata: {} }), s.now), { at: s.now() });
  assert.equal(stranger.status, 200);
  assert.equal(s.up.stripe().length, before + 1);
  assert.equal(s.env.BILLING.instances.get('customer:cus_Stranger1')?.map.size ?? 0, 0, 'the stranger is linked to nobody (asked, nothing kept)');
  assert.deepEqual([...s.env.BILLING.instances.keys()].filter((k) => k.startsWith('user:')), [`user:${UID}`]);
  // events the endpoint does not need: acknowledged, ignored, Stripe never asked
  const n = s.up.stripe().length;
  assert.equal((await deliver(s.app, s.env, event('charge.succeeded', { id: 'ch_1' }, s.now), { at: s.now() })).status, 200);
  assert.equal((await deliver(s.app, s.env, event('checkout.session.completed', { id: 'cs_test_b2', mode: 'payment', client_reference_id: UID }, s.now), { at: s.now() })).status, 200);
  assert.equal(s.up.stripe().length, n);
  // Stripe unreachable: 502, so Stripe delivers it again later; nothing changes now
  s.up.stripeDown = true;
  assert.equal((await deliver(s.app, s.env, event('customer.subscription.deleted', subscription({ status: 'canceled' }), s.now), { at: s.now() })).status, 502);
  s.up.stripeDown = false;
  assert.equal((await status(s)).tier, 'ultra');
  // signatures: wrong secret, replayed after five minutes, tampered body, none
  const ev = event('customer.subscription.deleted', subscription({ status: 'canceled' }), s.now);
  s.up.subs.set('sub_Test123', subscription({ status: 'canceled' }));
  for (const o of [{ secret: `whsec_${'z'.repeat(32)}` }, { at: s.now() - 301000 }, { tamper: (p) => p.replace(UID, OTHER) }, { header: '' }]) {
    const res = await deliver(s.app, s.env, ev, { at: s.now(), ...o });
    assert.equal(res.status, 400, JSON.stringify(Object.keys(o)));
    assert.equal((await res.json()).error.code, 'bad_signature');
  }
  assert.equal((await status(s)).tier, 'ultra', 'no forged event changed anything');
  // no Origin is needed (ALLOW_NO_ORIGIN is false here) and none is echoed back
  const ok = await deliver(s.app, s.env, ev, { at: s.now() });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), null);
  assert.equal((await status(s)).tier, 'none');
  assert.equal((await s.app.fetch(new Request('https://angle.example.workers.dev/v1/billing/webhook'), s.env)).status, 405);
  assertClean([...s.logs, ...flow.logs]);
});

test('webhook: two deliveries racing for one subscription; the later read wins, whichever answer comes back first', async () => {
  const up = upstream();
  const answer = up.fetch;
  let gets = 0, release, reached;
  const held = new Promise((r) => { release = r; });
  const asked = new Promise((r) => { reached = r; });
  // the first delivery's read of Stripe is answered slowly (its state taken when asked)
  up.fetch = async (u, i) => {
    const res = await answer(u, i);
    if (/\/v1\/subscriptions\//.test(String(u)) && ++gets === 1) { reached(); await held; }
    return res;
  };
  const s = setup({ up });
  up.subs.set('sub_Test123', subscription({ status: 'incomplete' }));
  const first = deliver(s.app, s.env, event('customer.subscription.created', subscription({ status: 'incomplete' }), s.now), { at: s.now() });
  await asked;
  // meanwhile Stripe takes the payment, and the next delivery reads and records that
  s.now.advance(1000);
  up.subs.set('sub_Test123', subscription());
  assert.equal((await deliver(s.app, s.env, event('customer.subscription.updated', subscription(), s.now), { at: s.now() })).status, 200);
  assert.equal((await status(s)).status, 'active');
  // the first, older answer arrives last: it never overwrites the newer one
  s.now.advance(1000);
  release();
  assert.equal((await first).status, 200);
  const st = await status(s);
  assert.deepEqual([st.status, st.tier], ['active', 'ultra']);
  assert.ok(s.logs.some((l) => JSON.parse(l).status === 'stale'), 'recorded as stale');
  assertClean(s.logs);
});

// ----------------------------------------------------- the Durable Object --
test('Billing Durable Object: the state machine, one apply per event, old events forgotten, customer links', async () => {
  const t = clock();
  const ns = memoryBillingNamespace({ now: t });
  const db = billingClient(ns);
  const prices = readConfig(billingEnv()).billing.prices;
  const rec = (over = {}, asOf = t()) => ({ ...summarise(subscription(), prices, asOf), ...over });
  assert.equal(await db.get(UID), null);
  assert.deepEqual(await db.apply(UID, 'evt_1', rec()), { ok: true, applied: true, duplicate: false });
  assert.deepEqual(await db.apply(UID, 'evt_1', rec({ status: 'canceled' })), { ok: true, applied: false, duplicate: true });
  assert.equal((await db.get(UID)).status, 'active');
  // older answer for the same subscription: recorded as seen, not applied
  assert.deepEqual(await db.apply(UID, 'evt_2', rec({ status: 'canceled' }, t() - 1000)), { ok: true, applied: false, duplicate: false });
  assert.equal((await db.get(UID)).status, 'active');
  // the record shape is checked
  const bad = await ns.get(ns.idFromName(`user:${UID}`)).fetch('https://billing/apply', { method: 'POST', body: JSON.stringify({ event: 'evt_3', record: { tier: 'ultra' } }) });
  assert.equal(bad.status, 400);
  // events are forgotten after 30 days
  t.advance(EVENT_KEEP_MS + 1);
  await db.apply(UID, 'evt_4', rec());
  const keys = [...ns.instances.get(`user:${UID}`).map.keys()].sort();
  assert.deepEqual(keys, ['evt:evt_4', 'sub']);
  // a customer belongs to the first account linked to it
  assert.deepEqual(await db.link('cus_A1b2', UID), { ok: true, uid: UID, conflict: false });
  assert.deepEqual(await db.link('cus_A1b2', OTHER), { ok: true, uid: UID, conflict: true });
  assert.equal(await db.owner('cus_A1b2'), UID);
  assert.equal(await db.owner('cus_None1'), null);
  // the rules on their own
  const a = rec(), later = rec({}, a.as_of + 1);
  assert.equal(supersedes(null, a), true);
  assert.equal(supersedes(a, later), true);
  assert.equal(supersedes(later, a), false);
  const other = (over) => rec({ subscription: 'sub_Other1', ...over }, a.as_of + 5);
  assert.equal(supersedes(a, other({ status: 'canceled' })), false, 'an ended other subscription never replaces an active one');
  assert.equal(supersedes(rec({ status: 'canceled' }), other({ status: 'active' })), true, 'a new active one replaces an ended one');
  assert.equal(supersedes(rec({ tier: 'paid' }), other({ tier: 'ultra' })), true, 'two active: the higher plan');
  assert.equal(supersedes(rec({ tier: 'ultra' }), other({ tier: 'paid' })), false);
  // a record whose period was over a day before the other was read (its end never recorded) gives nothing: a lower plan replaces it
  const stale = rec({ tier: 'ultra' }), after = stale.current_period_end + PERIOD_GRACE_MS;
  const flow = (over = {}) => ({ ...other({ tier: 'paid', current_period_end: after + 30 * DAY, ...over }), as_of: after });
  assert.equal(supersedes(stale, { ...flow(), as_of: after - 1 }), false, 'within the grace it still counts');
  assert.equal(supersedes(stale, flow()), true);
  assert.equal(supersedes(stale, flow({ status: 'canceled' })), false, 'neither gives anything: the higher plan stays, as before');
  assert.equal(typeof Billing, 'function');
});

test('subscription summary: price → plan, the period end (item or subscription), statuses, grace', () => {
  const prices = readConfig(billingEnv()).billing.prices;
  assert.deepEqual(planForPrice(PRICES.paidYearly, null, prices), { plan: 'paid', period: 'yearly' });
  assert.deepEqual(planForPrice('price_Unknown1', 'hushmallow.ultra.yearly', prices), { plan: 'ultra', period: 'yearly' });
  assert.equal(planForPrice('price_Unknown1', 'something.else', prices), null);
  const s = summarise(subscription(), prices, 5);
  assert.deepEqual(s, { v: 1, subscription: 'sub_Test123', customer: 'cus_Test123', status: 'active', tier: 'ultra', period: 'monthly', current_period_end: CLOCK_START + 30 * DAY, cancel_at_period_end: false, cancel_at: null, as_of: 5 });
  // older API: the period end on the subscription itself
  const oldApi = summarise({ ...subscription(), current_period_end: (CLOCK_START + 7 * DAY) / 1000, items: { data: [{ price: { id: PRICES.paidMonthly } }] } }, prices, 5);
  assert.equal(oldApi.current_period_end, CLOCK_START + 7 * DAY);
  assert.equal(oldApi.tier, 'paid');
  assert.equal(summarise(subscription({ status: 'weird' }), prices, 5).status, 'unknown');
  assert.equal(summarise(subscription({}, { price: 'price_Unknown1' }), prices, 5).tier, 'none', 'an unknown price gives nothing');
  const end = CLOCK_START + 30 * DAY;
  for (const [st, tier] of [['active', 'ultra'], ['trialing', 'ultra'], ['past_due', 'ultra'], ['canceled', 'none'], ['unpaid', 'none'], ['incomplete', 'none'], ['incomplete_expired', 'none'], ['paused', 'none'], ['unknown', 'none']]) {
    // read just now (past_due counts 14 days from its read: test/billing-state.test.js)
    assert.equal(effectiveTier({ ...s, status: st, as_of: CLOCK_START }, CLOCK_START), tier, st);
  }
  assert.equal(effectiveTier(s, end + PERIOD_GRACE_MS - 1), 'ultra');
  assert.equal(effectiveTier(s, end + PERIOD_GRACE_MS), 'none');
  assert.equal(effectiveTier(null, CLOCK_START), 'none');
});

test('account check: the claims are read first, the project decides, anonymous sign-ins and other accounts are refused', async () => {
  const up = upstream();
  const t = clock();
  const verify = createAccountVerifier({ url: SUPABASE, key: PK, fetch: up.fetch, now: t });
  assert.deepEqual(await verify(TOKEN), { ok: true, uid: UID });
  assert.deepEqual(await verify(null), { ok: false, status: 401, code: 'account_required' });
  assert.deepEqual(await verify(jwt('not-a-uuid')), { ok: false, status: 401, code: 'account_required' });
  up.users[jwt(OTHER)] = { id: OTHER, is_anonymous: true };
  assert.equal((await verify(jwt(OTHER))).ok, false, 'an anonymous sign-in cannot subscribe');
  // cached at most until the token expires
  const short = jwt(UID, { exp: (CLOCK_START + 30000) / 1000 });
  up.users[short] = { id: UID };
  assert.equal((await verify(short)).ok, true);
  t.advance(30001);
  assert.equal((await verify(short)).ok, false, 'expired since: refused without asking');
  // the project overloaded or down: unavailable, never "signed out"
  const busy = createAccountVerifier({ url: SUPABASE, key: PK, fetch: async () => new Response('{}', { status: 503 }), now: clock() });
  assert.deepEqual(await busy(TOKEN), { ok: false, status: 503, code: 'account_unavailable' });
});

// ------------------------------------------------------ session gating --
test('session in billing mode: an active Beyond subscription only; the token lasts the paid period at most; per account', async () => {
  const s = setup({ env: billingEnv({ ENTITLEMENT_MODE: 'billing', TESTER_INVITE_CODES: 'MALLOW-ONE' }) });
  const session = (o = {}) => s.app.fetch(req('/v1/session', { body: o.body || { device_id: 'device-aaaaaaaaaaaaaaaa' }, headers: o.token === null ? {} : { authorization: `Bearer ${o.token || TOKEN}` } }), s.env);
  const code = async (res) => [res.status, (await res.json()).error?.code];
  assert.deepEqual(await code(await session({ token: null })), [401, 'account_required']);
  assert.deepEqual(await code(await session({ token: null, body: { invite: 'MALLOW-ONE' } })), [401, 'account_required'], 'billing alone takes no invite code');
  assert.deepEqual(await code(await session()), [403, 'subscription_required'], 'signed in, no plan');
  await subscribe(s, subscription({}, { price: PRICES.paidMonthly }));
  assert.deepEqual(await code(await session()), [403, 'subscription_required'], 'Flow is not Beyond');
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', subscription({}, { price: PRICES.ultraMonthly, end: (CLOCK_START + 3600000 * 5) / 1000 }));
  await deliver(s.app, s.env, event('customer.subscription.updated', subscription(), s.now), { at: s.now() });
  const ok = await session();
  assert.equal(ok.status, 200);
  const j = await ok.json();
  assert.equal(j.source, 'billing');
  // the shorter of BILLING_TOKEN_TTL_HOURS (24 h) and the period end plus a day's grace
  assert.equal(Date.parse(j.expires_at), Math.min(s.now() + 24 * 3600000, CLOCK_START + 5 * 3600000 + PERIOD_GRACE_MS));
  const c = claims(j.token);
  assert.equal(c.src, 'billing');
  assert.match(c.sub, /^acct_[0-9a-f]{32}$/);
  assert.ok(!j.token.includes(UID));
  // the same account on another device has the same daily allowance
  const other = await (await session({ body: { device_id: 'device-bbbbbbbbbbbbbbbb' } })).json();
  assert.equal(claims(other.token).sub, c.sub);
  // the token works for an angle, as any other
  const a = await s.app.fetch(angleReq(j.token, { text: 'My colleague got promoted instead of me.' }), s.env);
  assert.equal(a.status, 200);
  assert.equal((await a.json()).status, 'ok');
  // the subscription ends: no new session
  s.now.advance(1000);
  s.up.subs.set('sub_Test123', subscription({ status: 'canceled' }));
  await deliver(s.app, s.env, event('customer.subscription.deleted', subscription({ status: 'canceled' }), s.now), { at: s.now() });
  assert.deepEqual(await code(await session()), [403, 'subscription_required']);
  const h = await (await s.app.fetch(req('/v1/health'), s.env)).json();
  assert.equal(h.entitlement_mode, 'billing');
  assert.equal(h.invite_required, false);
  assertClean(s.logs);
});

test('session in billing+testing mode: a Beyond subscription or a valid tester code; never open without codes', async () => {
  const s = setup({ env: billingEnv({ ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: 'MALLOW-ONE, MALLOW-TWO' }) });
  const session = (body, token) => s.app.fetch(req('/v1/session', { body, headers: token ? { authorization: `Bearer ${token}` } : {} }), s.env);
  const tester = await session({ invite: 'MALLOW-TWO', device_id: 'device-aaaaaaaaaaaaaaaa' });
  assert.equal(tester.status, 200);
  const tj = await tester.json();
  assert.equal(tj.source, 'testing');
  assert.equal(Date.parse(tj.expires_at), CLOCK_START + 30 * DAY, 'a testing session, exactly as in testing mode');
  assert.match(claims(tj.token).sub, /^dev_[0-9a-f]{32}$/);
  assert.equal((await session({ invite: 'WRONG' })).status, 403);
  assert.equal((await (await session({ invite: 'WRONG' })).json()).error.code, 'invite_required');
  assert.equal((await session({})).status, 401);
  // signed in without Beyond, but a tester: the code still works
  assert.equal((await (await session({ invite: 'MALLOW-ONE' }, TOKEN)).json()).source, 'testing');
  assert.equal((await (await session({}, TOKEN)).json()).error.code, 'subscription_required');
  // a subscriber gets the subscription's session, code or not
  await subscribe(s);
  assert.equal((await (await session({ invite: 'MALLOW-ONE' }, TOKEN)).json()).source, 'billing');
  // testing caps still apply to testing sessions (10 a day per network)
  const capped = setup({ env: billingEnv({ ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: 'MALLOW-ONE', SESSIONS_PER_IP_DAILY: '1' }) });
  const cs = (body) => capped.app.fetch(req('/v1/session', { body }), capped.env);
  assert.equal((await cs({ invite: 'MALLOW-ONE' })).status, 200);
  assert.equal((await cs({ invite: 'MALLOW-ONE' })).status, 429);
  // no codes set: billing alone (an invite opens nothing)
  const closed = setup({ env: billingEnv({ ENTITLEMENT_MODE: 'billing+testing' }) });
  const r = await closed.app.fetch(req('/v1/session', { body: { invite: 'ANYTHING' } }), closed.env);
  assert.equal(r.status, 401);
  assert.equal((await (await closed.app.fetch(req('/v1/health'), closed.env)).json()).invite_required, false);
  assert.equal((await (await s.app.fetch(req('/v1/health'), s.env)).json()).invite_required, true);
});

test('session in billing mode without the billing setup: 503 for an account, 401 without one; nothing called', async () => {
  const s = setup({ env: makeEnv({ ENTITLEMENT_MODE: 'billing', PROVIDER: 'mock' }) });
  const withToken = await s.app.fetch(req('/v1/session', { body: {}, headers: { authorization: `Bearer ${TOKEN}` } }), s.env);
  assert.equal(withToken.status, 503);
  assert.equal((await withToken.json()).error.code, 'billing_not_configured');
  assert.equal((await s.app.fetch(req('/v1/session', { body: {} }), s.env)).status, 401);
  assert.equal(s.up.calls.length, 0);
});

test('the modes that existed before are unchanged: testing ignores an account token, storekit still wants a transaction', async () => {
  const s = setup({ env: billingEnv() });   // billing set up, mode left at its default (testing)
  assert.equal(readConfig(s.env).entitlementMode, 'testing');
  const res = await s.app.fetch(req('/v1/session', { body: { device_id: 'device-aaaaaaaaaaaaaaaa' }, headers: { authorization: `Bearer ${TOKEN}` } }), s.env);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.source, 'testing');
  assert.match(claims(j.token).sub, /^dev_/);
  assert.equal(s.up.calls.length, 0, 'the sign-in project is never asked in testing mode');
  const gated = setup({ env: billingEnv({ TESTER_INVITE_CODES: 'MALLOW-ONE' }) });
  const g = await gated.app.fetch(req('/v1/session', { body: {}, headers: { authorization: `Bearer ${TOKEN}` } }), gated.env);
  assert.equal((await g.json()).error.code, 'invite_required', 'a subscription is not an invite code in testing mode');
  const sk = setup({ env: billingEnv({ ENTITLEMENT_MODE: 'storekit' }) });
  const r = await sk.app.fetch(req('/v1/session', { body: {}, headers: { authorization: `Bearer ${TOKEN}` } }), sk.env);
  assert.equal(r.status, 401);
  assert.equal((await r.json()).error.code, 'transaction_required');
  const both = setup({ env: billingEnv({ ENTITLEMENT_MODE: 'both' }) });
  assert.equal((await (await both.app.fetch(req('/v1/session', { body: {} }), both.env)).json()).source, 'testing');
  assert.equal(sk.up.calls.length + both.up.calls.length, 0);
});

test('the Worker entry exports the Billing class and serves the billing routes', async () => {
  const env = billingEnv();
  const res = await worker.fetch(req('/v1/billing/status'), env, { waitUntil() {} });
  // the entry's own fetch is the real one: no token → refused before any call
  assert.equal(res.status, 401);
  const mod = await import('../src/index.js');
  assert.equal(typeof mod.Billing, 'function');
});

// ----------------------------------------------------------------- staging --
// The staging rehearsal (docs/STAGING.md): [env.staging] alone has billing on, in Stripe TEST mode, for the
// release branch's preview; its four price ids are placeholders until the owner pastes the real test ids.
const PREVIEW = 'https://claude-launch-rc.hushmallow.pages.dev';
const STAGING_PRICE_VARS = ['STRIPE_PRICE_PAID_MONTHLY', 'STRIPE_PRICE_PAID_YEARLY', 'STRIPE_PRICE_ULTRA_MONTHLY', 'STRIPE_PRICE_ULTRA_YEARLY'];
const PLACEHOLDERS = Object.fromEntries(STAGING_PRICE_VARS.map((k) => [k, 'price_TODO_owner']));
const REAL_PRICES = { STRIPE_PRICE_PAID_MONTHLY: PRICES.paidMonthly, STRIPE_PRICE_PAID_YEARLY: PRICES.paidYearly, STRIPE_PRICE_ULTRA_MONTHLY: PRICES.ultraMonthly, STRIPE_PRICE_ULTRA_YEARLY: PRICES.ultraYearly };

/** A made-up staging project (20-character ref) for the cases "once the owner has created hushmallow-staging". */
const STAGING_SUPABASE = 'https://hmstagingtest0000000.supabase.co';
const STAGING_LINE = "const STAGING_SUPABASE_PROJECT_URL = '';";
/** A copy of src/config.js with only STAGING_SUPABASE_PROJECT_URL filled in (the one line the owner's values change). */
async function withStagingProject(url) {
  const src = readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
  assert.equal(src.split(STAGING_LINE).length, 2, 'the placeholder line is there exactly once');
  const dir = mkdtempSync(join(tmpdir(), 'hm-angle-staging-'));
  const file = join(dir, 'config.js');
  writeFileSync(file, src.replace(STAGING_LINE, `const STAGING_SUPABASE_PROJECT_URL = '${url}';`));
  try { return await import(pathToFileURL(file).href); } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** The KEY = "value" lines of one wrangler.toml table (comments skipped). */
function tomlVars(toml, table) {
  const out = {};
  let inside = false;
  for (const line of toml.split('\n')) {
    const t = line.trim();
    if (t.startsWith('[')) { inside = t === `[${table}]`; continue; }
    if (!inside || !t || t.startsWith('#')) continue;
    const m = /^([A-Z][A-Z0-9_]*) = "(.*)"$/.exec(t);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

test('wrangler.toml [env.staging]: billing+testing for staging only, the preview origin, its own placeholder sign-in project and four placeholder prices', async () => {
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const prod = tomlVars(toml, 'vars'), dev = tomlVars(toml, 'env.dev.vars'), staging = tomlVars(toml, 'env.staging.vars');
  // production and dev exactly as before
  assert.equal(prod.ENTITLEMENT_MODE, 'testing');
  assert.equal(dev.ENTITLEMENT_MODE, 'testing');
  assert.equal(prod.ALLOWED_ORIGINS, 'https://app.hushmallow.com,https://hushmallow.pages.dev,https://ramkumarjothi1982.github.io');
  for (const k of [...STAGING_PRICE_VARS, 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'APP_ORIGIN', 'ACCOUNTS_STAGE']) {
    assert.equal(prod[k], undefined, `production: no ${k}`);
    assert.equal(dev[k], undefined, `dev: no ${k}`);
  }
  // staging: billing (or a tester code) for Another Angle; the preview origin added, the others kept
  assert.equal(staging.ENTITLEMENT_MODE, 'billing+testing');
  assert.deepEqual(staging.ALLOWED_ORIGINS.split(','), ['https://ramkumarjothi1982.github.io', 'https://claude-upbeat-pasteur-b0aqg1.hushmallow.pages.dev', PREVIEW, 'http://localhost:8000', 'http://127.0.0.1:8000']);
  assert.equal(staging.APP_ORIGIN, PREVIEW, 'Checkout returns to the preview');
  // its own sign-in project, hushmallow-staging, never production's: placeholders until the owner creates it
  assert.equal(staging.ACCOUNTS_STAGE, 'staging');
  assert.equal(staging.SUPABASE_URL, 'https://STAGING_TODO.supabase.co');
  assert.equal(staging.SUPABASE_PUBLISHABLE_KEY, 'sb_publishable_TODO');
  assert.doesNotMatch(toml.split(/^\[env\.staging\]$/m)[1], /igbxbfuaoybfzsroxuln|sb_publishable_NSv1/, 'nothing of production\'s project in [env.staging]');
  for (const k of STAGING_PRICE_VARS) assert.equal(staging[k], 'price_TODO_owner', `${k}: a marked placeholder`);
  // secrets are never vars; the rest of staging is as it was (the real model, a $3 cap, https, browsers only)
  for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ANTHROPIC_API_KEY', 'TOKEN_SIGNING_KEY', 'TESTER_INVITE_CODES']) assert.equal(staging[k], undefined, k);
  assert.deepEqual([staging.PROVIDER, staging.DAILY_SPEND_CAP_USD, staging.REQUIRE_HTTPS, staging.ALLOW_NO_ORIGIN], ['anthropic', '3', 'true', 'false']);
  // as the staging Worker reads it once the owner's TEST secrets are set: still off while the prices and the accounts are placeholders
  const cfg = readConfig({ ...staging, STRIPE_SECRET_KEY: TEST_SK, STRIPE_WEBHOOK_SECRET: WHSEC });
  assert.equal(cfg.entitlementMode, 'billing+testing');
  assert.equal(cfg.billing.appOrigin, PREVIEW);
  assert.equal(cfg.billing.accountsStage, 'staging');
  assert.equal(cfg.billing.accountsPlaceholder, true);
  assert.equal(cfg.billing.supabaseUrl, '');
  assert.equal(cfg.billing.supabaseKey, '');
  assert.deepEqual(cfg.billing.prices, { paid: { monthly: '', yearly: '' }, ultra: { monthly: '', yearly: '' } });
  assert.equal(cfg.billing.placeholderPrices, 4);
  assert.equal(cfg.billing.configured, false);
  // …still off with the four test price ids alone: the accounts are placeholders
  assert.equal(readConfig({ ...staging, ...REAL_PRICES, STRIPE_SECRET_KEY: TEST_SK, STRIPE_WEBHOOK_SECRET: WHSEC }).billing.configured, false);
  // …and on, once the staging project exists too (its URL in src/config.js and in [env.staging.vars], and its key)
  const { readConfig: readWithStaging } = await withStagingProject(STAGING_SUPABASE);
  const on = readWithStaging({ ...staging, ...REAL_PRICES, SUPABASE_URL: STAGING_SUPABASE, SUPABASE_PUBLISHABLE_KEY: PK, STRIPE_SECRET_KEY: TEST_SK, STRIPE_WEBHOOK_SECRET: WHSEC }).billing;
  assert.equal(on.configured, true);
  assert.equal(on.supabaseUrl, STAGING_SUPABASE);
  assert.equal(on.placeholderPrices, 0);
  assert.equal(on.accountsPlaceholder, false);
  // production's [vars] never turn billing on
  assert.equal(readConfig(prod).billing.configured, false);
  assert.equal(readConfig(prod).entitlementMode, 'testing');
});

test('the staging Worker\'s sign-in project: placeholders mean "accounts not configured" (503 accounts_not_configured), and nothing is asked', async () => {
  const ACCOUNTS = { ACCOUNTS_STAGE: 'staging', SUPABASE_URL: 'https://STAGING_TODO.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_TODO' };
  // the staging Worker today: everything else real (Stripe test keys, the four prices), the accounts placeholders
  const s = setup({ env: billingEnv({ ...ACCOUNTS, ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: 'MALLOW-ONE' }) });
  const c = readConfig(s.env).billing;
  assert.deepEqual([c.configured, c.accountsPlaceholder, c.accountsStage, c.supabaseUrl, c.supabaseKey], [false, true, 'staging', '', '']);
  for (const [path, o] of [['/v1/billing/checkout', { body: { plan: 'ultra', period: 'monthly' } }], ['/v1/billing/status', {}], ['/v1/billing/portal', { body: {} }]]) {
    const res = await s.app.fetch(billingReq(path, o), s.env);
    assert.equal(res.status, 503, path);
    const e = (await res.json()).error;
    assert.equal(e.code, 'accounts_not_configured', path);
    assert.equal(e.message, 'Web subscriptions are not set up on this server: accounts are not configured (its sign-in project, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, is still a placeholder).', path);
  }
  // Stripe's events wait (503: Stripe retries) until the accounts are real
  const w = await deliver(s.app, s.env, event('customer.subscription.updated', subscription(), s.now));
  assert.equal(w.status, 503);
  assert.equal((await w.json()).error.code, 'accounts_not_configured');
  // Another Angle: an account cannot get a billing session; a tester's code still opens a testing one
  const session = (body, token) => s.app.fetch(req('/v1/session', { body, headers: token ? { authorization: `Bearer ${token}` } : {} }), s.env);
  const acct = await session({ device_id: 'device-aaaaaaaaaaaaaaaa' }, TOKEN);
  assert.equal(acct.status, 503);
  assert.equal((await acct.json()).error.code, 'accounts_not_configured');
  assert.equal((await (await session({ invite: 'MALLOW-ONE', device_id: 'device-aaaaaaaaaaaaaaaa' }, TOKEN)).json()).source, 'testing');
  // /v1/health says so (never a value)
  assert.deepEqual((await (await s.app.fetch(req('/v1/health'), s.env)).json()).billing, { configured: false, webhook: true, accounts_configured: false, ...FLAGS.test });
  // no outbound call at all: neither Stripe nor any sign-in project
  assert.equal(s.up.calls.length, 0);
  assert.ok(s.logs.some((l) => JSON.parse(l).err === 'accounts_not_configured'), 'the log line says why');
  assertClean(s.logs);
  // with the price placeholders too (wrangler.toml [env.staging] as it is): the accounts are named first
  const both = setup({ env: billingEnv({ ...ACCOUNTS, ...PLACEHOLDERS }) });
  assert.equal((await (await both.app.fetch(billingReq('/v1/billing/status'), both.env)).json()).error.code, 'accounts_not_configured');
  assert.deepEqual((await (await both.app.fetch(req('/v1/health'), both.env)).json()).billing, { configured: false, webhook: true, placeholder_prices: 4, accounts_configured: false, ...FLAGS.test });
  assert.equal(both.up.calls.length, 0);
  // each placeholder alone is enough, on any Worker
  for (const over of [{ SUPABASE_URL: 'https://STAGING_TODO.supabase.co' }, { SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_TODO' }, { SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_TODO_owner_staging_key' }, { ACCOUNTS_STAGE: 'staging' }]) {
    const b = readConfig(billingEnv(over)).billing;
    assert.deepEqual([b.configured, b.accountsPlaceholder, b.supabaseUrl, b.supabaseKey], [false, true, '', ''], JSON.stringify(over));
  }
  // a staging Worker with production's project: refused (it has no staging project yet, and never production's)
  const cross = readConfig(billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: SUPABASE })).billing;
  assert.deepEqual([cross.configured, cross.supabaseUrl, cross.accountsPlaceholder], [false, '', true]);
  // not a placeholder: a lower-case "todo" can be part of a real ref or key; an unknown stage has no project
  assert.equal(readConfig(billingEnv({ SUPABASE_URL: 'https://abctodoabcdefghijklm.supabase.co' })).billing.accountsPlaceholder, false);
  assert.equal(readConfig(billingEnv({ SUPABASE_PUBLISHABLE_KEY: `sb_publishable_x_TODO_${'c'.repeat(16)}` })).billing.accountsPlaceholder, false);
  const unknown = readConfig(billingEnv({ ACCOUNTS_STAGE: 'prod' })).billing;
  assert.deepEqual([unknown.configured, unknown.supabaseUrl, unknown.accountsPlaceholder], [false, '', false]);
  // production exactly as before: hushmallow1 is its only project, and an unset project gives the general answer
  assert.equal(SUPABASE_PROJECT_URL, SUPABASE);
  assert.equal(readConfig(billingEnv()).billing.configured, true);
  assert.equal(readConfig(billingEnv({ ACCOUNTS_STAGE: 'production' })).billing.configured, true);
  assert.equal(readConfig(billingEnv()).billing.accountsStage, 'production');
  const off = setup({ env: billingEnv({ SUPABASE_URL: '' }) });
  const r = await (await off.app.fetch(billingReq('/v1/billing/status'), off.env)).json();
  assert.deepEqual([r.error.code, r.error.message], ['billing_not_configured', 'Web subscriptions are not set up on this server.']);
  assert.deepEqual((await (await off.app.fetch(req('/v1/health'), off.env)).json()).billing, { configured: false, webhook: true, ...FLAGS.live });
});

test('once hushmallow-staging exists: the staging Worker accepts only its project, production only hushmallow1; the server and the app name the same project', async () => {
  // today: no staging project anywhere (the app's STAGING_PROJECT_REF, this server's constant, [env.staging]'s placeholder)
  assert.equal(STAGING_SUPABASE_PROJECT_URL, '');
  const appConfig = readFileSync(new URL('../../../src/auth/config.js', import.meta.url), 'utf8');
  const ref = /^export const STAGING_PROJECT_REF = '([a-z0-9]*)';$/m.exec(appConfig)?.[1];
  assert.equal(typeof ref, 'string', 'the app has STAGING_PROJECT_REF');
  assert.equal(STAGING_SUPABASE_PROJECT_URL, ref ? `https://${ref}.supabase.co` : '', 'the server and the app name the same staging project');
  const toml = tomlVars(readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8'), 'env.staging.vars');
  if (STAGING_SUPABASE_PROJECT_URL) assert.equal(toml.SUPABASE_URL, STAGING_SUPABASE_PROJECT_URL);
  else assert.match(toml.SUPABASE_URL, /TODO/, '[env.staging] keeps its placeholder until then');
  // with the staging project's URL filled in (a copy of src/config.js)
  const { readConfig: read } = await withStagingProject(STAGING_SUPABASE);
  const staging = read(billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: STAGING_SUPABASE })).billing;
  assert.deepEqual([staging.configured, staging.supabaseUrl, staging.accountsPlaceholder], [true, STAGING_SUPABASE, false]);
  assert.equal(read(billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: `${STAGING_SUPABASE}/` })).billing.supabaseUrl, STAGING_SUPABASE);
  assert.equal(read(billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: SUPABASE })).billing.configured, false, 'the staging Worker never takes production\'s project');
  assert.equal(read(billingEnv({ SUPABASE_URL: STAGING_SUPABASE })).billing.configured, false, 'production never takes the staging project');
  assert.equal(read(billingEnv()).billing.supabaseUrl, SUPABASE, 'production as before');
  assert.equal(read(billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: STAGING_SUPABASE, SUPABASE_PUBLISHABLE_KEY: `sb_secret_${'c'.repeat(24)}` })).billing.configured, false, 'never a secret key');
  // a request to the staging Worker asks only the staging project
  const asked = [];
  const STAGING_TOKEN = jwt(UID, { iss: `${STAGING_SUPABASE}/auth/v1` });
  const fetchStaging = async (url) => {
    const u = new URL(String(url));
    asked.push(u.origin);
    if (u.origin !== STAGING_SUPABASE) throw new TypeError('unexpected host');
    return new Response(JSON.stringify({ id: UID, email: 'ana@example.com' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const v = createAccountVerifier({ url: staging.supabaseUrl, key: staging.supabaseKey, fetch: fetchStaging, now: () => CLOCK_START });
  assert.deepEqual(await v(STAGING_TOKEN), { ok: true, uid: UID });
  assert.deepEqual(await v(TOKEN), { ok: false, status: 401, code: 'account_required' }, 'a production token is refused unasked (another issuer)');
  assert.deepEqual(asked, [STAGING_SUPABASE]);
});

test('placeholder price ids (price_TODO…) count as unset: billing answers "not configured" and says why; Stripe is never called', async () => {
  for (const v of ['price_TODO_owner', 'price_TODO', 'price_TODOowner', 'price_todo1234', '', '  ']) {
    assert.equal(readConfig(billingEnv({ STRIPE_PRICE_PAID_MONTHLY: v })).billing.prices.paid.monthly, '', JSON.stringify(v));
  }
  assert.equal(readConfig(billingEnv({ STRIPE_PRICE_PAID_MONTHLY: 'price_Todd1234' })).billing.prices.paid.monthly, 'price_Todd1234', 'only the placeholder word');
  assert.equal(readConfig(billingEnv()).billing.placeholderPrices, 0);
  // staging before the owner's ids: everything else set, all four prices placeholders
  const s = setup({ env: billingEnv({ ...PLACEHOLDERS, ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: 'MALLOW-ONE' }) });
  assert.equal(readConfig(s.env).billing.configured, false);
  for (const [path, o] of [['/v1/billing/checkout', { body: { plan: 'ultra', period: 'monthly' } }], ['/v1/billing/status', {}], ['/v1/billing/portal', { body: {} }]]) {
    const res = await s.app.fetch(billingReq(path, o), s.env);
    assert.equal(res.status, 503, path);
    const e = (await res.json()).error;
    assert.equal(e.code, 'billing_not_configured', path);
    assert.match(e.message, /Stripe price ids are still placeholders \(price_TODO…\)/, path);
  }
  const h = await (await s.app.fetch(req('/v1/health'), s.env)).json();
  assert.deepEqual(h.billing, { configured: false, webhook: true, placeholder_prices: 4, ...FLAGS.live });
  // Stripe's events wait (503: Stripe retries) until the ids are real
  assert.equal((await deliver(s.app, s.env, event('customer.subscription.updated', subscription(), s.now))).status, 503);
  // Another Angle: an account cannot get a billing session; a tester's code still opens a testing one
  const session = (body, token) => s.app.fetch(req('/v1/session', { body, headers: token ? { authorization: `Bearer ${token}` } : {} }), s.env);
  const acct = await session({ device_id: 'device-aaaaaaaaaaaaaaaa' }, TOKEN);
  assert.equal(acct.status, 503);
  assert.equal((await acct.json()).error.code, 'billing_not_configured');
  assert.equal((await (await session({ invite: 'MALLOW-ONE', device_id: 'device-aaaaaaaaaaaaaaaa' }, TOKEN)).json()).source, 'testing');
  assert.equal(s.up.calls.length, 0, 'neither Stripe nor the sign-in project is asked');
  assert.ok(s.logs.some((l) => JSON.parse(l).err === 'placeholder_prices'), 'the log line says why');
  assertClean(s.logs);
  // one placeholder among real ids: only that plan is not on sale
  const m = setup({ env: billingEnv({ STRIPE_PRICE_ULTRA_YEARLY: 'price_TODO_owner' }) });
  assert.equal(readConfig(m.env).billing.configured, true);
  assert.deepEqual((await (await m.app.fetch(req('/v1/health'), m.env)).json()).billing, { configured: true, webhook: true, placeholder_prices: 1, ...FLAGS.live });
  const y = await m.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'ultra', period: 'yearly' } }), m.env);
  assert.equal(y.status, 503);
  assert.equal((await y.json()).error.code, 'price_not_configured');
  assert.equal(m.up.stripe().length, 0, 'a placeholder is never sent to Stripe');
  const mo = await m.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'ultra', period: 'monthly' } }), m.env);
  assert.equal(mo.status, 200);
  assert.equal(m.up.stripe().find((c) => c.path === '/v1/checkout/sessions').form.get('line_items[0][price]'), PRICES.ultraMonthly);
  // nothing set at all: the general message, no word of placeholders
  const off = setup({ env: makeEnv({ PROVIDER: 'mock' }) });
  const r = await off.app.fetch(billingReq('/v1/billing/status'), off.env);
  assert.equal((await r.json()).error.message, 'Web subscriptions are not set up on this server.');
});
