// scripts/billing-checks.mjs, the key-free billing checks scripts/e2e.mjs runs after every deploy (and the sandbox
// driver runs as its phase P1): against the real app as production has it today (billing off) and as the staging
// Worker will have it once set up (billing on), and against Workers that get something wrong. Last, scripts/e2e.mjs
// itself, run as the deploy workflows run it, against the app served on this machine (the mock model).
// Nothing here reaches a deployed Worker.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadAsStaging, STAGING_PROJECT } from './staging-loader.js';

loadAsStaging();
const { createApp } = await import('../src/app.js');
const { createMockProvider } = await import('../src/providers/mock.js');
const { STRIPE_API_VERSION_EXPECTED, STAGING_SUPABASE_PROJECT_URL } = await import('../src/config.js');
const { makeEnv, SYSTEM_PROMPT } = await import('./helpers.js');
const F = await import('./billing-fixtures.js');
const C = await import('../scripts/billing-checks.mjs');

const STAGING_WORKER = 'https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev';
const PRODUCTION_WORKER = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';
const PREVIEW = F.STAGING_APP;
const stagingEnv = F.stagingWorkerEnv;

test('here src/config.js has a staging project (test/staging-loader.js), so the staging Worker can bill', () => {
  assert.equal(STAGING_SUPABASE_PROJECT_URL, STAGING_PROJECT);
  assert.equal(STAGING_PROJECT, F.STAGING_SUPABASE);
});

/** A call() to an app, as e2e.mjs and the driver make it. @param {any} app @param {Record<string, any>} env @param {string} base @param {string} origin */
const caller = (app, env, base, origin) => async (/** @type {string} */ path, /** @type {any} */ { method = 'POST', body, raw, token, origin: from = origin, headers = {} } = {}) => {
  const res = await app.fetch(new Request(base + path, { method, headers: { origin: from, ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) }), env);
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json, headers: res.headers };
};
const health = async (/** @type {any} */ call) => (await call('/v1/health', { method: 'GET' })).json;

test('key-free checks: the production Worker as committed (billing off) and the staging Worker once set up (billing on) both pass', async () => {
  // what wrangler.toml gives each stage today
  assert.deepEqual(C.expectedFlags('production'), { live_approved: false, api_version: null, automatic_tax: false });
  assert.deepEqual(C.expectedFlags('staging'), { live_approved: false, api_version: STRIPE_API_VERSION_EXPECTED, automatic_tax: false });
  assert.equal(C.stageOf(STAGING_WORKER), 'staging');
  assert.equal(C.stageOf(PRODUCTION_WORKER), 'production');
  for (const [stage, env, base, origin, foreign] of /** @type {const} */ ([
    ['production', makeEnv({ PROVIDER: 'mock', ALLOWED_ORIGINS: 'https://app.hushmallow.com,https://ramkumarjothi1982.github.io' }), PRODUCTION_WORKER, 'https://ramkumarjothi1982.github.io', ''],
    ['staging', stagingEnv(), STAGING_WORKER, PREVIEW, F.SUPABASE],
    // a staging Worker whose sign-in values are placeholders (as [env.staging] was before the owner's project): off,
    // and the off answers expected
    ['staging', stagingEnv({ SUPABASE_URL: 'https://STAGING_TODO.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_TODO', STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined }), STAGING_WORKER, PREVIEW, F.SUPABASE],
  ])) {
    /** @type {string[]} */
    const lines = [];
    const app = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), log: () => {}, fetch: async () => { throw new TypeError('no network'); } });
    const call = caller(app, env, base, origin);
    const r = await C.keyFreeChecks({ call, check: (ok, what, extra = '') => { lines.push(`${ok ? 'PASS' : 'FAIL'} ${what} ${extra}`); return ok; }, info: (x) => lines.push(`INFO ${x}`), health: await health(call), stage, foreignProject: foreign });
    assert.deepEqual(lines.filter((l) => l.startsWith('FAIL')), [], `${stage}: ${lines.join('\n')}`);
    assert.ok(lines.filter((l) => l.startsWith('PASS')).length >= 10, lines.join('\n'));
    if (env.STRIPE_SECRET_KEY) assert.equal(r.on, true); else assert.match(lines.join('\n'), /INFO billing is off on this Worker/);
  }
});

test('key-free checks on a staging Worker with one price id in every slot: billing is off, and the off answers expected, saying why', async () => {
  const one = F.PRICES.paidMonthly;
  const env = stagingEnv({ STRIPE_PRICE_PAID_YEARLY: one, STRIPE_PRICE_ULTRA_MONTHLY: one, STRIPE_PRICE_ULTRA_YEARLY: one });
  /** @type {string[]} */
  const lines = [];
  const app = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), log: () => {}, fetch: async () => { throw new TypeError('no network'); } });
  const call = caller(app, env, STAGING_WORKER, PREVIEW);
  const h = await health(call);
  assert.deepEqual([h.billing.configured, h.billing.duplicate_prices], [false, 4]);
  const r = await C.keyFreeChecks({ call, check: (ok, what, extra = '') => { lines.push(`${ok ? 'PASS' : 'FAIL'} ${what} ${extra}`); return ok; }, info: (x) => lines.push(`INFO ${x}`), health: h, stage: 'staging', foreignProject: F.SUPABASE });
  assert.equal(r.on, false);
  assert.deepEqual(lines.filter((l) => l.startsWith('FAIL')), [], lines.join('\n'));
  assert.ok(lines.includes('INFO billing is off on this Worker (the same price id is in more than one price slot): the off answers are expected below'), lines.join('\n'));
});

test('key-free checks fail a Worker that takes an unsigned event, lets in another origin, or says the wrong flags', async () => {
  const env = stagingEnv();
  const real = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), log: () => {} });
  /** @param {(req: Request) => Response | null} bend */
  const run = async (bend, over = {}) => {
    /** @type {string[]} */
    const fails = [];
    const app = { fetch: async (/** @type {Request} */ req, /** @type {any} */ e) => bend(req) || real.fetch(req, e) };
    const call = caller(app, env, STAGING_WORKER, PREVIEW);
    await C.keyFreeChecks({ call, check: (ok, what) => { if (!ok) fails.push(what); return ok; }, health: await health(call), stage: 'staging', ...over });
    return fails;
  };
  const ok = (/** @type {unknown} */ body) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  assert.deepEqual(await run(() => null), []);
  assert.deepEqual(await run((req) => (req.method === 'POST' && req.url.endsWith('/v1/billing/webhook') ? ok({ received: true }) : null)), ['webhook: no signature → 400 bad_signature', 'webhook: a bad signature → 400 bad_signature', 'webhook: a stale signature → 400 bad_signature']);
  assert.deepEqual(await run((req) => (req.headers.get('origin') === C.REFUSED_ORIGIN ? ok({ url: 'https://checkout.stripe.com/c/pay/x' }) : null)), [`checkout: Origin ${new URL(C.REFUSED_ORIGIN).host} → 403`]);
  assert.deepEqual(await run(() => null, { expected: { live_approved: false, api_version: null, automatic_tax: true } }), ['billing: api_version null, as wrangler.toml [env.staging.vars] says', 'billing: automatic_tax true, as wrangler.toml [env.staging.vars] says']);
  // a live key on staging: refused by the Worker (key_refused), and the checks say so
  const liveEnv = stagingEnv({ STRIPE_SECRET_KEY: F.LIVE_KEY });
  const call = caller(real, liveEnv, STAGING_WORKER, PREVIEW);
  /** @type {string[]} */
  const fails = [];
  await C.keyFreeChecks({ call, check: (k, what) => { if (!k) fails.push(what); return k; }, health: await health(call), stage: 'staging' });
  assert.deepEqual(fails, ['billing: no Stripe key refused for this stage']);
  // production: a test key is refused and fails; its live key set before the activation commit is refused as intended
  for (const [key, want] of /** @type {const} */ ([[F.TEST_KEY, ['billing: no Stripe key refused for this stage']], [F.LIVE_KEY, []]])) {
    const prodEnv = makeEnv({ PROVIDER: 'mock', ALLOWED_ORIGINS: 'https://app.hushmallow.com', STRIPE_SECRET_KEY: key });
    const p = caller(real, prodEnv, PRODUCTION_WORKER, 'https://app.hushmallow.com');
    /** @type {string[]} */
    const got = [], said = [];
    await C.keyFreeChecks({ call: p, check: (k, what) => { if (!k) got.push(what); return k; }, info: (x) => said.push(x), health: await health(p), stage: 'production' });
    assert.deepEqual(got, want, key.slice(0, 8));
    if (key === F.LIVE_KEY) assert.ok(said.some((x) => x.includes('refused until BILLING_LIVE = "approved"')));
  }
});

test('scripts/e2e.mjs runs the key-free checks against a Worker (here the app on this machine, the mock model): all pass; a webhook that takes anything fails it', async () => {
  const env = makeEnv({ PROVIDER: 'mock', REQUIRE_HTTPS: 'false', ALLOWED_ORIGINS: 'https://ramkumarjothi1982.github.io' });
  const app = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), log: () => {} });
  let bent = false;
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const request = new Request(`http://localhost${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : Buffer.concat(chunks) });
    const response = bent && req.method === 'POST' && req.url === '/v1/billing/webhook' ? new Response('{"received":true}', { status: 200 }) : await app.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
  const e2e = () => new Promise((resolve) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/e2e.mjs', import.meta.url)), `http://127.0.0.1:${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    child.stdout.on('data', (d) => { text += d; });
    child.stderr.on('data', (d) => { text += d; });
    child.on('close', (code) => resolve({ code, text }));
  });
  try {
    const good = /** @type {{ code: number, text: string }} */ (await e2e());
    assert.equal(good.code, 0, good.text);
    for (const want of ['billing checks for the production Worker', 'PASS  billing: /v1/health has the billing flags', 'PASS  billing: live_approved false, as wrangler.toml [vars] says', 'PASS  webhook: GET is refused (405)', 'PASS  webhook: a bad signature → 503 billing_not_configured', 'PASS  checkout: billing off → 503', `PASS  checkout: Origin ${new URL(C.REFUSED_ORIGIN).host} → 403`, 'INFO  billing is off on this Worker (no Stripe key)', 'all checks passed']) {
      assert.ok(good.text.includes(want), `${want}\n${good.text}`);
    }
    bent = true;
    const bad = /** @type {{ code: number, text: string }} */ (await e2e());
    assert.equal(bad.code, 1, bad.text);
    assert.match(bad.text, /FAIL {2}webhook: no signature → 503 billing_not_configured/);
  } finally { server.close(); }
});
