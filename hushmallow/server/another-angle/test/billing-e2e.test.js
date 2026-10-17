// scripts/billing-e2e.mjs, the sandbox driver, offline: the real Worker, run as the staging Worker runs once set up,
// against an in-memory Stripe sandbox with test clocks (test/billing-sandbox.js) and a fake hushmallow-staging
// project, on a clock that moves only when the driver waits. Nothing here reaches Stripe, Supabase or a deployed
// Worker: what real Stripe does is for the driver's first sandbox run to show.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAsStaging, STAGING_PROJECT } from './staging-loader.js';

loadAsStaging();
const { createApp } = await import('../src/app.js');
const { createMockProvider } = await import('../src/providers/mock.js');
const { billingClient, summarise } = await import('../src/billing/store.js');
const { signWebhookPayload } = await import('../src/billing/stripe.js');
const { EVENTS } = await import('../src/billing/routes.js');
const { STRIPE_API_VERSION_EXPECTED, STAGING_SUPABASE_PROJECT_URL } = await import('../src/config.js');
const { makeEnv, SYSTEM_PROMPT, CLOCK_START } = await import('./helpers.js');
const F = await import('./billing-fixtures.js');
const { sandbox } = await import('./billing-sandbox.js');
const D = await import('../scripts/billing-e2e.mjs');

const STAGING_WORKER = D.STAGING_WORKER, PRODUCTION_WORKER = D.PRODUCTION_WORKER;
const PREVIEW = F.STAGING_APP;
const ACCOUNT = { email: 'e2e-b@example.com', password: 'e2e-b test password 0451', uid: F.UID };
/** The driver's own key: built at run time, like every key here. */
const E2E_KEY = F.stripeKey('rk_test', 'e');
const DRIVER_ENV = { STRIPE_E2E_KEY: E2E_KEY, STAGING_E2E_EMAIL: ACCOUNT.email, STAGING_E2E_PASSWORD: ACCOUNT.password };
const { BILLING_PRICES } = await import(new URL('../../../src/app/config.js', import.meta.url).href);
const stagingEnv = F.stagingWorkerEnv;

test('here src/config.js has a staging project (test/staging-loader.js), so the staging Worker can bill', () => {
  assert.equal(STAGING_SUPABASE_PROJECT_URL, STAGING_PROJECT);
});

/** The driver's non-secret values for that staging Worker (repoConfig's, once nothing is a placeholder). */
const CONFIG = Object.freeze({
  stagingWorker: STAGING_WORKER, productionWorker: PRODUCTION_WORKER, appOrigin: PREVIEW, productionOrigin: D.PRODUCTION_APP,
  supabaseUrl: STAGING_PROJECT, publishableKey: F.PK,
  prices: { paid: { monthly: F.PRICES.paidMonthly, yearly: F.PRICES.paidYearly }, ultra: { monthly: F.PRICES.ultraMonthly, yearly: F.PRICES.ultraYearly } },
  automaticTax: false, apiVersion: STRIPE_API_VERSION_EXPECTED, events: EVENTS, billingPrices: { ...BILLING_PRICES },
  production: { mode: 'testing', liveApproved: false },
});

/**
 * The staging Worker (the real app), production's (billing off, as committed), the sandbox and the staging project,
 * behind one fetch, on a clock that moves only when the driver waits.
 * @param {{ env?: Record<string, any>, box?: Record<string, any>, signWith?: string, pace?: number }} [o]
 *   pace: how much faster than the driver asks its waits pass (a run longer than a token's hour)
 */
function world({ env = stagingEnv(), box = {}, signWith = F.WHSEC, pace = 1 } = {}) {
  let t = CLOCK_START;
  const now = () => t;
  /** @type {string[]} */
  const logs = [];
  /** @type {{ url: string, method: string, status: number, at: number }[]} */
  const worker = [];
  /** @type {{ url: string, at: number }[]} */
  const all = [];
  const issued = new Set();
  const route = async (/** @type {any} */ u, /** @type {RequestInit} */ init = {}) => {
    const url = new URL(String(u));
    all.push({ url: url.href, at: t });
    if (url.origin === STAGING_WORKER) {
      const res = await app.fetch(new Request(url, init), env);
      worker.push({ url: url.pathname, method: init.method || 'GET', status: res.status, at: t });
      return res;
    }
    if (url.origin === PRODUCTION_WORKER) return prod.fetch(new Request(url, init), prodEnv);
    if (url.origin === 'https://api.stripe.com') return box.fetch(url, init);
    if (url.origin === STAGING_PROJECT) return project(url, init);
    throw new TypeError(`unexpected host ${url.host}`);
  };
  /** hushmallow-staging: the password grant and /auth/v1/user, for the one test account. @param {URL} url @param {RequestInit} init */
  async function project(url, init) {
    const h = new Headers(init.headers);
    const reply = (/** @type {number} */ status, /** @type {unknown} */ body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (h.get('apikey') !== F.PK) return reply(401, { message: 'No API key found in request' });
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const b = JSON.parse(String(init.body || '{}'));
      if (b.email !== ACCOUNT.email || b.password !== ACCOUNT.password) return reply(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      const token = F.jwt(ACCOUNT.uid, { exp: Math.floor(t / 1000) + 3600, iss: `${STAGING_PROJECT}/auth/v1` });
      issued.add(token);
      return reply(200, { access_token: token, token_type: 'bearer', expires_in: 3600, user: { id: ACCOUNT.uid, email: ACCOUNT.email } });
    }
    if (url.pathname === '/auth/v1/user') {
      const token = (h.get('authorization') || '').replace(/^Bearer /, '');
      return issued.has(token) ? reply(200, { id: ACCOUNT.uid, email: ACCOUNT.email, is_anonymous: false }) : reply(403, { code: 403, error_code: 'bad_jwt' });
    }
    return reply(404, {});
  }
  const app = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), now, log: (l) => logs.push(l), fetch: route });
  const prodEnv = makeEnv({ PROVIDER: 'mock', ALLOWED_ORIGINS: 'https://app.hushmallow.com,https://hushmallow.pages.dev,https://ramkumarjothi1982.github.io' });
  const prod = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), now, log: () => {} });
  box = sandbox({
    now, worker: STAGING_WORKER,
    deliver: async (ev) => {
      const payload = JSON.stringify(ev);
      const sig = await signWebhookPayload(payload, signWith, Math.floor(t / 1000));
      return app.fetch(new Request(`${STAGING_WORKER}/v1/billing/webhook`, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', 'stripe-signature': sig }, body: payload }), env);
    },
    ...box,
  });
  /** @type {string[]} */
  const out = [];
  const drive = (/** @type {string[]} */ args = [], /** @type {Record<string, any>} */ o = {}) => D.run({
    env: DRIVER_ENV, args, fetch: /** @type {any} */ (route), write: (l) => out.push(l), now, config: CONFIG,
    sleep: async (ms) => { await box.drain(); t += ms * pace; await box.drain(); }, ...o,
  });
  return { drive, out, box, logs, worker, all, env, now, route };
}

/** Nothing the driver printed holds a secret, the account's id or its token. @param {string[]} out */
function assertQuiet(out) {
  const text = out.join('\n');
  for (const x of [E2E_KEY, ACCOUNT.password, ACCOUNT.email, ACCOUNT.uid, F.TEST_KEY, F.WHSEC, F.PK]) assert.ok(!text.includes(x), `printed ${x.slice(0, 12)}…`);
  assert.doesNotMatch(text, /\b[spr]k_(?:live|test)_[A-Za-z0-9]{6}/, 'a Stripe key');
  assert.doesNotMatch(text, /eyJ[A-Za-z0-9_-]{10,}/, 'a token');
  assert.doesNotMatch(text, /\b(?:price|prod|we|bpc|in|si|evt|taxreg)_[A-Za-z0-9]/, 'an id the driver did not make');
}

// ---------------------------------------------------------------- refusals --
test('the driver refuses anything but a test secret or restricted key, and an account it lacks, before any request', async () => {
  for (const key of ['', F.stripeKey('rk_live'), F.stripeKey('sk_live'), F.stripeKey('pk_test'), F.stripeKey('pk_live'), F.WHSEC, 'rk_test_short', ` ${F.stripeKey('rk_test')}x!`]) {
    const w = world();
    const code = await w.drive([], { env: { ...DRIVER_ENV, STRIPE_E2E_KEY: key } });
    assert.equal(code, 2, `refused: ${key.slice(0, 8)}`);
    assert.equal(w.all.length, 0, 'nothing was sent');
    assert.match(w.out.join('\n'), /^REFUSED {2}STRIPE_E2E_KEY .*Nothing was sent\.$/);
    if (key) assert.ok(!w.out.join('\n').includes(key.trim()), 'the value is never echoed');
  }
  assert.match(D.refusal({ ...DRIVER_ENV, STRIPE_E2E_KEY: F.stripeKey('rk_live') }), /live key/);
  assert.equal(D.refusal({ ...DRIVER_ENV, STRIPE_E2E_KEY: F.stripeKey('sk_test') }), '');
  assert.equal(D.refusal(DRIVER_ENV), '');
  // the account is needed for the scenarios only
  const w = world();
  assert.equal(await w.drive([], { env: { STRIPE_E2E_KEY: E2E_KEY } }), 2);
  assert.match(w.out[0], /STAGING_E2E_EMAIL and STAGING_E2E_PASSWORD/);
  assert.equal(w.all.length, 0);
  assert.equal(D.refusal({ STRIPE_E2E_KEY: E2E_KEY }, false), '');
  // an unknown phase
  const u = world();
  assert.equal(await u.drive(['--phases', 'P0,S2']), 2);
  assert.equal(u.all.length, 0);
});

test('the driver refuses while staging still has placeholders (the repository today), and says which', async () => {
  const { problems } = await D.repoConfig();
  assert.ok(problems.some((p) => /SUPABASE_PUBLISHABLE_KEY is still a placeholder/.test(p)));
  for (const k of ['STRIPE_PRICE_PAID_MONTHLY', 'STRIPE_PRICE_PAID_YEARLY', 'STRIPE_PRICE_ULTRA_MONTHLY', 'STRIPE_PRICE_ULTRA_YEARLY']) assert.ok(problems.some((p) => p.includes(k)), k);
  const w = world();
  assert.equal(await w.drive([], { config: undefined }), 2);
  assert.match(w.out.join('\n'), /^REFUSED {2}staging is not set up yet: .*Nothing was sent\.$/);
  assert.equal(w.all.length, 0);
  // the parts that are not placeholders are the repository's own
  const { config } = await D.repoConfig();
  assert.equal(config.appOrigin, PREVIEW);
  assert.equal(config.apiVersion, STRIPE_API_VERSION_EXPECTED);
  assert.equal(config.automaticTax, false);
  assert.deepEqual(config.billingPrices, BILLING_PRICES);
  assert.deepEqual(config.production, { mode: 'testing', liveApproved: false });
  assert.deepEqual(Object.keys(D.SANDBOX_AMOUNTS).map((k) => [k, `A$${(D.SANDBOX_AMOUNTS[k] / 100).toFixed(2)}`]), Object.entries(BILLING_PRICES));
});

// -------------------------------------------------------------- a full run --
test('a full run (P0, P1, S3-S9) against the Worker and a sandbox with test clocks: every check passes; every object is tagged and its clocks deleted', async () => {
  const w = world();
  const code = await w.drive();
  const text = w.out.join('\n');
  assert.equal(code, 0, text);
  assert.doesNotMatch(text, /^(?:FAIL|ABORT)/m, text);
  assert.match(text, /\nall checks passed\n/);
  const runId = /run (\d{8}[0-9a-f]{8}),/.exec(w.out[0])?.[1];
  assert.ok(runId);
  for (const want of [
    'P0 staging: entitlement_mode billing+testing', 'P0 production: billing off (no approval, no key)', 'P0 price hushmallow.ultra.yearly: A$199.99',
    'P0 price hushmallow.paid.monthly: product "hushmallow Flow"', 'P0 webhook: exactly the 11 events', 'P0 portal: switching plans on, across all four prices',
    'P0 tax: taxability_reason is not not_collecting', 'webhook: a stale signature → 400 bad_signature', 'checkout: Origin app.hushmallow.com → 403',
    'checkout: a token of igbxbfuaoybfzsroxuln → 401', 'S3: Stripe moved the period on by one month', 'S3: still active, and the Worker has the new period end',
    'S4: past_due, and Beyond still open while Stripe retries', 'S4: /v1/session still opens Another Angle (200, source billing)', 'S4: active again',
    'S5: once the retries ran out, Stripe cancelled the subscription', 'S5: /v1/session 403 subscription_required', 'S6: Flow → Beyond monthly: tier ultra',
    'S6: → Flow yearly: tier paid, a period of a year', 'S7: cancel_at: ends_at is that date, tier unchanged', 'S7: past cancel_at: no plan',
    'S7: cancelled at once: no plan at the next check', 'S8: the resent event changes nothing (tier paid)', 'S8: the remaining Flow subscription is recorded (tier paid)',
    'S9: invoice.payment_action_required delivered (200)', 'S9: past_due while the payment waits for the customer',
  ]) assert.ok(w.out.some((l) => l.startsWith('PASS') && l.includes(want)), want);
  assert.match(text, /^INFO {2}S5: the 14-day past_due cap runs on the Worker's own clock/m);

  const { s } = w.box;
  // six clocks, one customer each, all deleted at the end (with what was on them)
  assert.equal(s.clocks.size, 6);
  for (const c of s.clocks.values()) { assert.equal(c.deleted, true); assert.equal(c.name.startsWith(`hushmallow-e2e ${runId} S`), true); }
  assert.equal(s.customers.size, 0);
  assert.equal(s.subs.size, 0);
  // what it made, it tagged (metadata e2e_run, and the account on customers and subscriptions)
  const made = s.calls.filter((c) => c.key === E2E_KEY && c.method === 'POST' && ['/v1/customers', '/v1/subscriptions'].includes(c.path));
  assert.equal(made.length, 6 + 8, 'six customers; eight subscriptions (S7 and S8 make two)');
  for (const c of made) { assert.equal(c.form.get('metadata[e2e_run]'), runId); assert.equal(c.form.get('metadata[user_id]'), ACCOUNT.uid); }
  assert.ok(s.pms.size >= 10);
  for (const pm of s.pms.values()) assert.equal(pm.metadata.e2e_run, runId);
  // it never makes prices, products, registrations, settings, endpoints or portal configurations, and pins the version
  const mine = s.calls.filter((c) => c.key === E2E_KEY);
  assert.deepEqual(mine.filter((c) => c.method !== 'GET' && /^\/v1\/(?:prices|products|tax\/(?:settings|registrations)|webhook_endpoints|billing_portal)/.test(c.path)), []);
  assert.deepEqual([...new Set(mine.map((c) => c.version))], [STRIPE_API_VERSION_EXPECTED]);
  // every event reached the Worker and was acknowledged; the Worker kept to its limits (no 429) and the driver to 5 s
  assert.ok(s.events.length > 40);
  assert.deepEqual(s.events.filter((e) => e.pending_webhooks !== 0).map((e) => e.type), []);
  assert.deepEqual(w.worker.filter((r) => r.status === 429), []);
  const polls = w.worker.filter((r) => r.url === '/v1/billing/status').map((r) => r.at);
  assert.ok(polls.length > 20, `${polls.length} polls`);
  for (let i = 1; i < polls.length; i++) assert.ok(polls[i] - polls[i - 1] >= D.STATUS_POLL_MS, `status ${i}`);
  const sessions = w.worker.filter((r) => r.url === '/v1/session').map((r) => r.at);
  for (let i = 1; i < sessions.length; i++) assert.ok(sessions[i] - sessions[i - 1] >= D.SESSION_GAP_MS, `session ${i}`);
  // S8's resent event reached the Worker as the same event id: applied once, logged as a duplicate
  assert.ok(F.lines(w.logs).some((l) => l.route === 'webhook' && l.duplicate === true && l.stripe_event === 'customer.subscription.created'));
  assertQuiet(w.out);
  F.assertClean(w.logs);
});

test('a run longer than the account token\'s hour signs in again on the way, and the Worker keeps answering', async () => {
  const w = world({ pace: 400 });
  let grants = 0;
  const drive = w.drive;
  const code = await drive(['--phases', 'S3,S6'], { fetch: /** @type {any} */ (async (/** @type {any} */ u, /** @type {any} */ i) => { if (String(u).includes('grant_type=password')) grants++; return w.route(u, i); }) });
  assert.equal(code, 0, w.out.join('\n'));
  assert.ok(w.now() - CLOCK_START > 2 * 3600000, `over two hours of the test clock: ${(w.now() - CLOCK_START) / 60000} min`);
  assert.ok(grants >= 3, `signed in ${grants} times`);
  assertQuiet(w.out);
});

// ---------------------------------------------------------------- livemode --
test('livemode true on any Stripe object stops the run at once (exit 3): nothing more is made, and its own clocks are still deleted', async () => {
  // in P0's first read: nothing at all is made
  const a = world({ box: { live: (method, path) => path === '/v1/prices' } });
  assert.equal(await a.drive(), 3);
  assert.match(a.out.join('\n'), /^ABORT a Stripe object read from GET \/v1\/prices has livemode true: stopped at once$/m);
  assert.deepEqual(a.box.s.calls.filter((c) => c.key === E2E_KEY && c.method !== 'GET'), []);
  assert.equal(a.worker.filter((r) => r.url !== '/v1/health').length, 0, 'no further step (P1 and the scenarios never ran)');
  // in the middle of S3 (the subscription it made reads livemode true): the clock is deleted, and nothing else is made
  const b = world({ box: { live: (method, path) => method === 'POST' && path === '/v1/subscriptions' } });
  assert.equal(await b.drive(['--phases', 'S3,S4']), 3);
  const posts = b.box.s.calls.filter((c) => c.key === E2E_KEY && c.method !== 'GET');
  const at = posts.findIndex((c) => c.path === '/v1/subscriptions');
  assert.deepEqual(posts.slice(at + 1).map((c) => `${c.method} ${c.path.replace(/clock_\w+/, 'clock')}`), ['DELETE /v1/test_helpers/test_clocks/clock']);
  assert.equal(b.box.s.clocks.size, 1);
  assert.equal([...b.box.s.clocks.values()][0].deleted, true);
  assert.match(b.out.join('\n'), /\nstopped: a livemode true object was read/);
  assertQuiet([...a.out, ...b.out]);
});

// --------------------------------------------------------------- the checks --
test('a Worker that never gets the events, or Stripe left to keep a failed renewal past due, fails the run (exit 1)', async () => {
  // the endpoint's signing secret is not the Worker's: every delivery is refused (400), so nothing is recorded
  const a = world({ signWith: `whsec_${'z'.repeat(32)}` });
  assert.equal(await a.drive(['--phases', 'S3']), 1);
  const at = a.out.join('\n');
  assert.match(at, /^FAIL {2}S3: tier paid, active {2}none\/none$/m);
  assert.ok(a.box.s.events.every((e) => e.pending_webhooks === 1));
  assert.equal([...a.box.s.clocks.values()].every((c) => c.deleted), true);
  // Revenue recovery set to "leave the subscription past due" (never, D6): S5 says so
  const b = world({ box: { afterRetries: 'past_due' } });
  assert.equal(await b.drive(['--phases', 'S5']), 1);
  const bt = b.out.join('\n');
  assert.match(bt, /^INFO {2}S5 starts with S4's steps|^S4 \(the start of S5\)/m);
  assert.match(bt, /^FAIL {2}S5: once the retries ran out, Stripe cancelled the subscription \(D6: cancel; never unpaid or left past due\) {2}past_due$/m);
  // "mark as unpaid" fails too: the subscription stays in place with its invoice open (D6 is cancel only)
  const c = world({ box: { afterRetries: 'unpaid' } });
  assert.equal(await c.drive(['--phases', 'S4,S5']), 1, c.out.join('\n'));
  assert.match(c.out.join('\n'), /^FAIL {2}S5: once the retries ran out, Stripe cancelled the subscription \(D6: cancel; never unpaid or left past due\) {2}unpaid$/m);
  // cancel, as B7 sets it: passes
  const k = world({ box: { afterRetries: 'cancel' } });
  assert.equal(await k.drive(['--phases', 'S4,S5']), 0, k.out.join('\n'));
  // an account that already has a plan (a run's leftover): no scenario starts, and nothing is made
  const d = world();
  await billingClient(d.env.BILLING).sync(ACCOUNT.uid, summarise(F.subscription({ livemode: false }), CONFIG.prices, CLOCK_START));
  assert.equal(await d.drive(['--phases', 'S3']), 1);
  assert.match(d.out.join('\n'), /^FAIL {2}the account starts with no plan {2}ultra\/active$/m);
  assert.match(d.out.join('\n'), /^SKIP {2}S3-S9: not run$/m);
  assert.deepEqual(d.box.s.calls.filter((x) => x.key === E2E_KEY), []);
  assertQuiet([...a.out, ...b.out, ...c.out, ...k.out, ...d.out]);
});

test('P0 names what the sandbox was set up wrong: a price, the endpoint\'s events and version, the portal, Stripe Tax', async () => {
  const w = world({
    box: {
      edit: (/** @type {any} */ s) => {
        s.prices.get(F.PRICES.paidYearly).tax_behavior = 'exclusive';
        s.prices.get(F.PRICES.ultraMonthly).unit_amount = 1499;
        s.products.ultra.name = 'Beyond';
        s.endpoints[0].enabled_events = s.endpoints[0].enabled_events.filter((/** @type {string} */ e) => e !== 'invoice.paid');
        s.endpoints[0].api_version = '2025-03-31.basil';
        s.portal.features.subscription_update.enabled = false;
        s.portal.features.subscription_cancel.mode = 'immediately';
        s.taxSettings.defaults.tax_behavior = 'exclusive';
        s.taxReason = 'not_collecting';
      },
    },
  });
  assert.equal(await w.drive(['--phases', 'P0']), 1);
  const fails = w.out.filter((l) => l.startsWith('FAIL'));
  for (const want of [
    /P0 price hushmallow\.paid\.yearly: AUD, recurring every 1 year, inclusive, active {2}breaks: tax_behavior/,
    /P0 price hushmallow\.ultra\.monthly: A\$19\.99 {2}A\$14\.99/, /P0 price hushmallow\.ultra\.monthly: product "hushmallow Beyond" {2}"Beyond"/,
    /P0 webhook: API version 2026-08-26\.dahlia {2}2025-03-31\.basil/, /P0 webhook: exactly the 11 events {2}missing invoice\.paid/,
    /P0 portal: cancellation on, at the end of the billing period \(D7\) {2}immediately/, /P0 portal: switching plans on/,
    /P0 tax: default tax behaviour inclusive {2}exclusive/,
  ]) assert.ok(fails.some((l) => want.test(l)), String(want));
  // an active AU registration that collects nothing (a registration or tax code gap): said before the switch goes on
  assert.ok(w.out.some((l) => l.startsWith('FAIL') && l.includes('taxability_reason is not not_collecting')));
  assertQuiet(w.out);
});

test('package.json runs the driver as npm run e2e:billing; the driver is never part of npm test or a workflow', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['e2e:billing'], 'node scripts/billing-e2e.mjs');
  assert.ok(!/billing-e2e/.test(pkg.scripts.test));
  const flows = new URL('../../../../.github/workflows/', import.meta.url);
  for (const f of readdirSync(flows)) assert.doesNotMatch(readFileSync(new URL(f, flows), 'utf8'), /billing-e2e|STRIPE_E2E_KEY/, f);
});
