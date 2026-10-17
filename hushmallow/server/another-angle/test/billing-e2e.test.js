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
  // the four price ids are the owner's now (wrangler.toml [env.staging.vars]), so only the staging project's key is
  // left (here src/config.js has a staging project: test/staging-loader.js)
  assert.deepEqual(problems, ['[env.staging.vars] SUPABASE_PUBLISHABLE_KEY is still a placeholder']);
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
  assert.deepEqual(config.prices, {
    paid: { monthly: 'price_1URQs5L6VU7tTQ40MQxgK1On', yearly: 'price_1URQtXL6VU7tTQ40hf1mzuLd' },
    ultra: { monthly: 'price_1URQyUL6VU7tTQ408wYz4vYP', yearly: 'price_1URQuYL6VU7tTQ403DSA9bfh' },
  });
  assert.deepEqual(Object.keys(D.SANDBOX_AMOUNTS).map((k) => [k, `US$${(D.SANDBOX_AMOUNTS[k] / 100).toFixed(2)}`]), Object.entries(BILLING_PRICES));
});

test('one price id in two staging slots: the driver refuses to start (the Worker sells neither), and P0 names it on a Worker that has it', async () => {
  const t = F.varsTables(F.WRANGLER).staging;
  const toml = F.WRANGLER.replace(`STRIPE_PRICE_PAID_MONTHLY = "${t.STRIPE_PRICE_PAID_MONTHLY}"`, `STRIPE_PRICE_PAID_MONTHLY = "${t.STRIPE_PRICE_ULTRA_MONTHLY}"`);
  assert.notEqual(toml, F.WRANGLER);
  const { problems } = await D.repoConfig(toml);
  assert.ok(problems.includes('[env.staging.vars] the same price id is in more than one STRIPE_PRICE_* slot'), problems.join('; '));
  assert.ok(!(await D.repoConfig()).problems.some((x) => /more than one/.test(x)), 'the four committed ids are four');
  const w = world({ env: stagingEnv({ STRIPE_PRICE_PAID_MONTHLY: F.PRICES.ultraMonthly }) });
  assert.equal(await w.drive(['--phases', 'P0']), 1);
  assert.ok(w.out.some((l) => /^FAIL {2}P0 staging: no placeholder prices or sign-in values, no price id in two slots$/.test(l)), w.out.join('\n'));
  assertQuiet(w.out);
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
    'P0 staging: entitlement_mode billing+testing', 'P0 production: billing off (no approval, no key)', 'P0 price hushmallow.ultra.yearly: US$199.99',
    'P0 price hushmallow.paid.monthly: product "hushmallow Flow"', 'P0 webhook: exactly the 11 events', 'P0 portal: switching plans on, across all four prices',
    'P0 tax (AU): taxability_reason is not not_collecting', 'webhook: a stale signature → 400 bad_signature', 'checkout: Origin app.hushmallow.com → 403',
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
  const a = world({ box: { live: (method, path) => path.startsWith('/v1/prices/') } });
  assert.equal(await a.drive(), 3);
  assert.match(a.out.join('\n'), /^ABORT a Stripe object read from GET \/v1\/prices\/… has livemode true: stopped at once$/m);
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

// ------------------------------------------------------------------ Ctrl-C --
test('stopped half way (Ctrl-C): the run\'s subscriptions are cancelled before its clocks are deleted, so the Worker records the end and the next run starts clean', async () => {
  const w = world();
  const stop = { now: false };
  // Ctrl-C while S4's Beyond subscription is running
  const code = await w.drive(['--phases', 'S4'], { stop, write: (/** @type {string} */ l) => { w.out.push(l); if (/^PASS {2}S4: tier ultra, active/.test(l)) stop.now = true; } });
  const text = w.out.join('\n');
  assert.equal(code, 1, text);
  assert.match(text, /^FAIL {2}stopped: interrupted$/m);
  await w.box.drain();
  const { s } = w.box;
  // the subscription is cancelled first, then the clock deleted (with its customer); the cancel is said
  const writes = s.calls.filter((c) => c.key === E2E_KEY && c.method === 'DELETE').map((c) => c.path.replace(/\b(sub|clock)_\w+/, '$1'));
  assert.deepEqual(writes, ['/v1/subscriptions/sub', '/v1/test_helpers/test_clocks/clock']);
  assert.match(text, /^ {6}cancelled sub_\w+\n {6}deleted clock_\w+$/m);
  assert.equal([...s.clocks.values()].every((c) => c.deleted), true);
  // Stripe told the Worker, which recorded the end: no plan
  const ended = s.events.filter((e) => e.type === 'customer.subscription.deleted');
  assert.equal(ended.length, 1);
  assert.equal(ended[0].pending_webhooks, 0, 'the Worker acknowledged it');
  const rec = await billingClient(w.env.BILLING).get(ACCOUNT.uid);
  assert.deepEqual([rec.status, rec.tier], ['canceled', 'ultra']);
  // so the next run passes its start check and runs
  w.out.length = 0;
  assert.equal(await w.drive(['--phases', 'S3']), 0, w.out.join('\n'));
  assert.match(w.out.join('\n'), /^PASS {2}the account starts with no plan {2}none\/canceled$/m);
  // a run that ends on its own cancels nothing more in the end (each scenario already did)
  const k = world();
  assert.equal(await k.drive(['--phases', 'S7']), 0, k.out.join('\n'));
  assert.doesNotMatch(k.out.join('\n'), /^ {6}cancelled /m);
  assertQuiet([...w.out, ...k.out]);
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
        s.prices.get(F.PRICES.paidYearly).lookup_key = 'hushmallow.ultra.yearly';
        s.prices.get(F.PRICES.ultraYearly).currency = 'aud';
        s.prices.delete(F.PRICES.paidMonthly);
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
    /P0 price hushmallow\.paid\.yearly: USD, recurring every 1 year, its slot's amount, active, lookup key its own or none {2}breaks: lookup_key/,
    /P0 price hushmallow\.ultra\.yearly: USD, recurring every 1 year, its slot's amount, active, lookup key its own or none {2}breaks: currency/,
    // the amount: the Worker's own rule (CHECKOUT_PRICE_RULES.unit_amount) and the driver's US$ check both say it
    /P0 price hushmallow\.ultra\.monthly: USD, recurring every 1 month, its slot's amount, active, lookup key its own or none {2}breaks: unit_amount/,
    /P0 price hushmallow\.paid\.monthly: the id in \[env\.staging\.vars\] is a price of this sandbox {2}404 resource_missing/,
    /P0 price hushmallow\.ultra\.monthly: US\$19\.99 {2}US\$14\.99/, /P0 price hushmallow\.ultra\.monthly: product "hushmallow Beyond" {2}"Beyond"/,
    /P0 webhook: API version 2026-08-26\.dahlia {2}2025-03-31\.basil/, /P0 webhook: exactly the 11 events {2}missing invoice\.paid/,
    /P0 portal: cancellation on, at the end of the billing period \(D7\) {2}immediately/, /P0 portal: switching plans on/,
  ]) assert.ok(fails.some((l) => want.test(l)), String(want));
  // automatic_tax off: the settings are only said, whatever their default tax behaviour
  assert.ok(w.out.some((l) => /^INFO {2}P0 tax: settings status active, default tax behaviour exclusive \(automatic_tax is off\)$/.test(l)));
  // an active AU registration that collects nothing (a registration or tax code gap): said before the switch goes on
  assert.ok(w.out.some((l) => l.startsWith('FAIL') && l.includes('taxability_reason is not not_collecting')));
  assertQuiet(w.out);
});

test('P0 with the owner\'s kind of prices: no lookup keys and any tax behaviour pass with Stripe Tax off; with it on, a price needs inclusive or exclusive and the settings must be active', async () => {
  const noKeys = (/** @type {any} */ s) => { for (const x of s.prices.values()) { x.lookup_key = null; x.tax_behavior = 'unspecified'; } };
  // tax off (as [env.staging.vars] has it): every check passes, and each price without a lookup key is said
  const off = world({ box: { edit: noKeys } });
  assert.equal(await off.drive(['--phases', 'P0']), 0, off.out.join('\n'));
  assert.ok(off.out.some((l) => l === 'PASS  P0 price hushmallow.paid.monthly: USD, recurring every 1 month, its slot\'s amount, active, lookup key its own or none'));
  assert.equal(off.out.filter((l) => /^INFO {2}P0 price hushmallow\.(?:paid|ultra)\.(?:monthly|yearly): no lookup key, so the configured id decides its plan/.test(l)).length, 4);
  // the price has no tax behaviour: the test calculation takes the settings' default (inclusive here)
  assert.ok(off.out.includes('PASS  P0 tax (AU): the total stays US$19.99 (inclusive)  US$19.99'), off.out.join('\n'));
  // …and a subscription on such a price is the plan of its configured id (S3 renews Beyond monthly)
  const s3 = world({ box: { edit: noKeys } });
  assert.equal(await s3.drive(['--phases', 'S3']), 0, s3.out.join('\n'));
  // tax on (the Worker and the driver both): an unspecified tax behaviour is refused, inclusive and exclusive pass
  const taxOn = { env: stagingEnv({ STRIPE_AUTOMATIC_TAX: 'true' }) };
  const on = world({ ...taxOn, box: { edit: noKeys } });
  assert.equal(await on.drive(['--phases', 'P0'], { config: { ...CONFIG, automaticTax: true } }), 1);
  for (const k of Object.keys(D.SANDBOX_AMOUNTS)) {
    const period = k.endsWith('monthly') ? 'month' : 'year';
    assert.ok(on.out.includes(`FAIL  P0 price ${k}: USD, recurring every 1 ${period}, its slot's amount, active, lookup key its own or none, tax behaviour inclusive or exclusive  breaks: tax_behavior`), k);
  }
  const ok = world({ ...taxOn, box: { edit: (/** @type {any} */ s) => { noKeys(s); for (const x of s.prices.values()) x.tax_behavior = 'exclusive'; } } });
  assert.equal(await ok.drive(['--phases', 'P0'], { config: { ...CONFIG, automaticTax: true } }), 0, ok.out.join('\n'));
  assert.ok(ok.out.includes('PASS  P0 tax: settings status active (head office set) while automatic_tax is on  active'));
  // an exclusive price: the calculation adds the tax on top (10% in the sandbox), and says the total
  assert.ok(ok.out.includes('INFO  P0 tax (AU): tax behaviour exclusive: the tax is added on top of US$19.99, a total of US$21.99'), ok.out.join('\n'));
  const pending = world({ ...taxOn, box: { edit: (/** @type {any} */ s) => { s.taxSettings.status = 'pending'; } } });
  assert.equal(await pending.drive(['--phases', 'P0'], { config: { ...CONFIG, automaticTax: true } }), 1);
  assert.ok(pending.out.includes('FAIL  P0 tax: settings status active (head office set) while automatic_tax is on  pending'));
  assertQuiet([...off.out, ...s3.out, ...on.out, ...ok.out, ...pending.out]);
});

test('P0 tax: any jurisdiction\'s active registration will do (not Australia\'s alone); each gets a test calculation at an address it covers, or is said', async () => {
  const taxOn = { env: stagingEnv({ STRIPE_AUTOMATIC_TAX: 'true' }) };
  const config = { ...CONFIG, automaticTax: true };
  /** @param {any[]} registrations */
  const only = (registrations) => (/** @type {any} */ s) => { s.registrations = registrations; for (const x of s.prices.values()) x.tax_behavior = 'exclusive'; };
  const reg = (country, type, extra = {}) => ({ id: `taxreg_Sbx${country}1`, object: 'tax.registration', country, status: 'active', country_options: { [country.toLowerCase()]: { type, ...extra } }, livemode: false });
  /** the line, with or without what it found after it @param {{ out: string[] }} w @param {string} line */
  const has = (w, line) => w.out.some((l) => l === line || l.startsWith(`${line}  `));
  // the EU's One Stop Shop (non-Union scheme) in Ireland, verified Collecting, and no AU registration: P0 passes
  const ie = world({ ...taxOn, box: { edit: only([reg('IE', 'oss_non_union')]) } });
  assert.equal(await ie.drive(['--phases', 'P0'], { config }), 0, ie.out.join('\n'));
  for (const want of ['PASS  P0 tax: an active (Collecting) registration while automatic_tax is on  IE', 'PASS  P0 tax (IE): a test calculation for an address in Dublin, IE', 'PASS  P0 tax (IE): taxability_reason is not not_collecting  standard_rated']) {
    assert.ok(ie.out.includes(want), `${want}\n${ie.out.join('\n')}`);
  }
  // the Union scheme (in Germany) covers the other member states: the address is in France
  const de = world({ ...taxOn, box: { edit: only([reg('DE', 'oss_union')]) } });
  assert.equal(await de.drive(['--phases', 'P0'], { config }), 0, de.out.join('\n'));
  assert.ok(has(de, 'PASS  P0 tax (DE): a test calculation for an address in Paris, FR'), de.out.join('\n'));
  // two registrations: a calculation for each
  const two = world({ ...taxOn, box: { edit: only([reg('AU', 'standard'), reg('GB', 'standard')]) } });
  assert.equal(await two.drive(['--phases', 'P0'], { config }), 0, two.out.join('\n'));
  for (const c of ['AU', 'GB']) assert.ok(has(two, `PASS  P0 tax (${c}): taxability_reason is not not_collecting`), c);
  // a registration the driver has no address for (a US state): said, and its calculation left to the owner
  const us = world({ ...taxOn, box: { edit: only([reg('US', 'state_sales_tax', { state: 'CA' })]) } });
  assert.equal(await us.drive(['--phases', 'P0'], { config }), 0, us.out.join('\n'));
  assert.ok(us.out.includes('INFO  P0 tax (US): no test address here for this registration (state_sales_tax): run its test calculation yourself (docs/PAYMENTS.md "Stripe Tax")'), us.out.join('\n'));
  assert.ok(!us.box.s.calls.some((c) => c.path === '/v1/tax/calculations'));
  // none at all, with automatic_tax on: fails
  const none = world({ ...taxOn, box: { edit: only([]) } });
  assert.equal(await none.drive(['--phases', 'P0'], { config }), 1);
  assert.deepEqual(none.out.filter((l) => l.startsWith('FAIL')), ['FAIL  P0 tax: an active (Collecting) registration while automatic_tax is on']);
  assert.ok(!none.box.s.calls.some((c) => c.path === '/v1/tax/calculations'));
  // a registration that covers the address but collects nothing there: fails, whichever country
  const gap = world({ ...taxOn, box: { edit: (/** @type {any} */ s) => { only([reg('NZ', 'standard')])(s); s.taxReason = 'not_collecting'; } } });
  assert.equal(await gap.drive(['--phases', 'P0'], { config }), 1);
  assert.ok(gap.out.includes('FAIL  P0 tax (NZ): taxability_reason is not not_collecting  not_collecting'), gap.out.join('\n'));
  // the addresses
  assert.equal(D.taxTestAddress(reg('AU', 'standard')), D.TAX_TEST_ADDRESSES.AU);
  assert.equal(D.taxTestAddress(reg('FR', 'oss_union')), D.TAX_TEST_ADDRESSES.DE);
  assert.equal(D.taxTestAddress(reg('NL', 'oss_non_union')), D.TAX_TEST_ADDRESSES.DE);
  assert.equal(D.taxTestAddress(reg('IE', 'ioss')), null);
  assert.equal(D.taxTestAddress(reg('JP', 'standard')), null);
  assert.equal(D.taxTestAddress(null), null);
  assertQuiet([...ie.out, ...de.out, ...two.out, ...us.out, ...none.out, ...gap.out]);
});

test('P0: a US-dollar price with another currency added (currency_options) fails, as the Worker refuses it; one with only USD passes', async () => {
  const w = world({ box: { edit: (/** @type {any} */ s) => { s.prices.get(F.PRICES.paidMonthly).currency_options = { usd: { unit_amount: 999 }, aud: { unit_amount: 1499 } }; } } });
  assert.equal(await w.drive(['--phases', 'P0']), 1);
  // (the sandbox, as Stripe, sends currency_options only when the read expands it: the driver does)
  assert.deepEqual(w.out.filter((l) => l.startsWith('FAIL')), ['FAIL  P0 price hushmallow.paid.monthly: USD, recurring every 1 month, its slot\'s amount, active, lookup key its own or none  breaks: currency_options']);
  const u = world({ box: { edit: (/** @type {any} */ s) => { s.prices.get(F.PRICES.paidMonthly).currency_options = { usd: { unit_amount: 999 } }; } } });
  assert.equal(await u.drive(['--phases', 'P0']), 0, u.out.join('\n'));
  assertQuiet([...w.out, ...u.out]);
});

test('package.json runs the driver as npm run e2e:billing; the driver is never part of npm test or a workflow', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['e2e:billing'], 'node scripts/billing-e2e.mjs');
  assert.ok(!/billing-e2e/.test(pkg.scripts.test));
  const flows = new URL('../../../../.github/workflows/', import.meta.url);
  for (const f of readdirSync(flows)) assert.doesNotMatch(readFileSync(new URL(f, flows), 'utf8'), /billing-e2e|STRIPE_E2E_KEY/, f);
});
