// The billing environment per stage (src/config.js readBilling): which Stripe key each Worker takes, the owner's
// live-billing approval (BILLING_LIVE), the pinned API version, the Stripe Tax switch, what /v1/health says about
// them, the testing sessions after the switch to a billing mode, and the local harness. No real key anywhere:
// every key-shaped value is built at runtime (test/billing-fixtures.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { req, makeEnv, angleReq, CLOCK_START } from './helpers.js';
import { signToken } from '../src/auth/tokens.js';
import { readConfig, BILLING_LIVE_APPROVED, STRIPE_API_VERSION_EXPECTED } from '../src/config.js';
import {
  billingEnv, billingReq, setup, upstream, subscription, event, deliver, subscribe, status, lines, assertClean, stripeKey, withStagingProject,
  varsTables, WRANGLER, PAYMENTS_MD, DAY, LIVE_KEY, TEST_KEY, WHSEC, STAGING_SUPABASE, PK,
} from './billing-fixtures.js';

const KEYS = ['sk_test', 'rk_test', 'sk_live', 'rk_live', 'pk_test'];

// ----------------------------------------------------------- key mode --
test('key mode per stage: staging takes test keys only; production live keys only, and only once BILLING_LIVE = "approved"', async () => {
  const { readConfig: readWithStaging } = await withStagingProject(STAGING_SUPABASE);
  const stages = {
    production: (over) => readConfig(billingEnv(over)).billing,
    staging: (over) => readWithStaging(billingEnv({ ACCOUNTS_STAGE: 'staging', SUPABASE_URL: STAGING_SUPABASE, ...over })).billing,
  };
  /** what the rules say: [configured, keyMode, keyRefused] */
  const expected = (stage, prefix, approved) => {
    const mode = /_live$/.test(prefix) ? 'live' : 'test';
    if (prefix.startsWith('pk_')) return [false, '', ''];   // not a secret key at all: unset, as before
    if (stage === 'staging') return mode === 'test' ? [true, 'test', ''] : [false, '', 'live_key_on_staging'];
    if (mode === 'test') return [false, '', 'test_key_on_production'];
    return approved ? [true, 'live', ''] : [false, '', 'live_not_approved'];
  };
  for (const [stage, read] of Object.entries(stages)) {
    for (const prefix of KEYS) {
      for (const approved of [false, true]) {
        const b = read({ STRIPE_SECRET_KEY: stripeKey(prefix), BILLING_LIVE: approved ? 'approved' : undefined });
        const label = `${stage} + ${prefix}_ + BILLING_LIVE ${approved ? '"approved"' : 'unset'}`;
        assert.deepEqual([b.configured, b.keyMode, b.keyRefused], expected(stage, prefix, approved), label);
        // a refused key counts as unset: it is never sent anywhere
        assert.equal(b.secretKey, b.keyMode ? stripeKey(prefix) : '', label);
        // the approval is read on production only
        assert.equal(b.liveApproved, stage === 'production' && approved, label);
      }
    }
  }
  // only the exact word approves; nothing else does
  for (const v of ['yes', 'true', 'Approved', '1', '']) assert.equal(stages.production({ BILLING_LIVE: v }).keyRefused, 'live_not_approved', JSON.stringify(v));
  // any other stage than production (a misspelt one included) takes test keys only
  assert.equal(readConfig(billingEnv({ ACCOUNTS_STAGE: 'prod' })).billing.keyRefused, 'live_key_on_staging');
  assert.equal(readConfig(billingEnv({ ACCOUNTS_STAGE: 'prod', STRIPE_SECRET_KEY: TEST_KEY })).billing.keyRefused, '');
  // nothing set: no mode, nothing refused, nothing approved
  assert.deepEqual((({ keyMode, keyRefused, liveApproved }) => ({ keyMode, keyRefused, liveApproved }))(readConfig({}).billing), { keyMode: '', keyRefused: '', liveApproved: false });
});

test('a refused key: every billing route answers 503, the webhook 503 (Stripe keeps retrying), and Stripe is never called', async () => {
  for (const [over, why] of [
    [{ STRIPE_SECRET_KEY: TEST_KEY }, 'test_key_on_production'],
    [{ BILLING_LIVE: undefined }, 'live_not_approved'],
    [{ BILLING_LIVE: 'nope' }, 'live_not_approved'],
  ]) {
    const s = setup({ env: billingEnv(over) });
    for (const [path, o] of [['/v1/billing/checkout', { body: { plan: 'ultra', period: 'monthly' } }], ['/v1/billing/status', {}], ['/v1/billing/portal', { body: {} }]]) {
      const res = await s.app.fetch(req(path, { ...o, headers: { authorization: 'Bearer x.y.z' } }), s.env);
      assert.equal(res.status, 503, `${why} ${path}`);
      assert.equal((await res.json()).error.code, 'billing_not_configured');
    }
    s.up.subs.set('sub_Test123', subscription());
    const w = await deliver(s.app, s.env, event('customer.subscription.updated', subscription(), s.now));
    assert.equal(w.status, 503, why);
    assert.equal(s.up.calls.length, 0, `${why}: neither Stripe nor the sign-in project is asked`);
    assert.ok(lines(s.logs).some((l) => l.err === why), `${why}: the log line says why`);
    assertClean(s.logs);
  }
  // approved, with its live key: on
  const on = setup();
  await subscribe(on);
  assert.equal((await status(on)).tier, 'ultra');
});

// ------------------------------------------------------- wrangler guards --
/** Every var that belongs to web billing (any of them in a table means billing is being set up there). */
const BILLING_SET = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'APP_ORIGIN', 'STRIPE_PRICE_PAID_MONTHLY', 'STRIPE_PRICE_PAID_YEARLY', 'STRIPE_PRICE_ULTRA_MONTHLY', 'STRIPE_PRICE_ULTRA_YEARLY', 'BILLING_TOKEN_TTL_HOURS', 'STRIPE_API_VERSION', 'STRIPE_AUTOMATIC_TAX', 'BILLING_LIVE'];

/** The billing switches' guards (on top of test/billing.test.js checkWrangler). Throws on the first problem. */
function checkBillingSwitches(toml) {
  const t = varsTables(toml);
  assert.deepEqual(Object.keys(t), ['production', 'dev', 'staging']);
  // the live approval is read from production's [vars] only: never on a Worker that could take it by mistake
  for (const name of ['dev', 'staging']) assert.ok(!('BILLING_LIVE' in t[name]), `${name}: BILLING_LIVE belongs in production [vars] only, never here`);
  if ('BILLING_LIVE' in t.production) {
    assert.equal(t.production.BILLING_LIVE, BILLING_LIVE_APPROVED, 'production: BILLING_LIVE is exactly "approved"');
    const b = readConfig({ ...t.production, STRIPE_SECRET_KEY: LIVE_KEY, STRIPE_WEBHOOK_SECRET: WHSEC }).billing;
    assert.ok(b.configured && b.liveApproved, 'production: BILLING_LIVE only with the full billing var set');
  }
}

/** wrangler.toml with docs/PAYMENTS.md section 2's vars in production's [vars] (the owner's values stood in for). */
function withProductionVars(toml = WRANGLER) {
  const block = /Then add the vars to `\[vars\]`[\s\S]*?```\n([\s\S]*?)```/.exec(PAYMENTS_MD)?.[1];
  assert.ok(block, 'PAYMENTS.md section 2 has the vars block');
  let n = 0;
  const lines = block.replace(/sb_publishable_…/g, PK).replace(/price_…/g, () => `price_Rehearsal${++n}`);
  const at = toml.indexOf('APPLE_ENVIRONMENTS = "Production"\n') + 'APPLE_ENVIRONMENTS = "Production"\n'.length;
  assert.ok(at > 100);
  return `${toml.slice(0, at)}${lines}${toml.slice(at)}`;
}
const approve = (toml) => toml.replace('APPLE_ENVIRONMENTS = "Production"\n', 'APPLE_ENVIRONMENTS = "Production"\nBILLING_LIVE = "approved"\n');

test('wrangler guards: BILLING_LIVE only in production [vars], only "approved", only with the full billing var set', () => {
  checkBillingSwitches(WRANGLER);
  // production today: no billing var at all, the approval included, and the mode from before billing
  const prod = varsTables(WRANGLER).production;
  assert.deepEqual(BILLING_SET.filter((k) => k in prod), []);
  assert.equal(prod.ENTITLEMENT_MODE, 'testing');
  assert.equal(readConfig(prod).billing.liveApproved, false);
  // the documented switch-on (section 2), approved or not yet: both pass
  checkBillingSwitches(withProductionVars());
  checkBillingSwitches(approve(withProductionVars()));
  assert.equal(readConfig({ ...varsTables(approve(withProductionVars())).production, STRIPE_SECRET_KEY: LIVE_KEY }).billing.liveApproved, true);
  // approval without the vars, any other word, or on staging or dev: never
  assert.throws(() => checkBillingSwitches(approve(WRANGLER)), /full billing var set/);
  assert.throws(() => checkBillingSwitches(approve(withProductionVars()).replace(/^BILLING_LIVE = "approved"$/m, 'BILLING_LIVE = "yes"')), /exactly "approved"/);
  assert.throws(() => checkBillingSwitches(WRANGLER.replace('[env.staging.vars]\n', '[env.staging.vars]\nBILLING_LIVE = "approved"\n')), /staging: BILLING_LIVE/);
  assert.throws(() => checkBillingSwitches(WRANGLER.replace('[env.dev.vars]\n', '[env.dev.vars]\nBILLING_LIVE = "approved"\n')), /dev: BILLING_LIVE/);
  // the switch is documented where the owner sets it, as a comment (never a live value today)
  assert.match(WRANGLER, /^#.*BILLING_LIVE = "approved"/m);
});

// ------------------------------------------------------------ API version --
/** Any table that sets billing up pins exactly the API version the code and the webhook endpoints are built for. */
function checkApiVersion(toml) {
  for (const [name, vars] of Object.entries(varsTables(toml))) {
    if (!BILLING_SET.some((k) => k in vars)) continue;
    assert.equal(vars.STRIPE_API_VERSION, STRIPE_API_VERSION_EXPECTED, `${name}: STRIPE_API_VERSION = "${STRIPE_API_VERSION_EXPECTED}" (src/config.js STRIPE_API_VERSION_EXPECTED)`);
  }
}

test('wrangler guards: staging pins the API version; any table with billing vars must pin exactly the same one, production\'s activation too', () => {
  assert.equal(STRIPE_API_VERSION_EXPECTED, '2026-08-26.dahlia');
  checkApiVersion(WRANGLER);
  const t = varsTables(WRANGLER);
  assert.equal(t.staging.STRIPE_API_VERSION, STRIPE_API_VERSION_EXPECTED);
  assert.equal(readConfig(t.staging).billing.apiVersion, STRIPE_API_VERSION_EXPECTED, 'and the Worker reads it');
  // production and dev have no billing: no pin needed (and none set)
  assert.equal(t.production.STRIPE_API_VERSION, undefined);
  assert.equal(t.dev.STRIPE_API_VERSION, undefined);
  // the documented production switch-on (docs/PAYMENTS.md section 2) pins it, so the activation commit passes
  checkApiVersion(withProductionVars());
  checkApiVersion(approve(withProductionVars()));
  // unpinned, or another version, wherever billing is set: never
  assert.throws(() => checkApiVersion(WRANGLER.replace(/^STRIPE_API_VERSION = .*\n/m, '')), /staging: STRIPE_API_VERSION/);
  assert.throws(() => checkApiVersion(WRANGLER.replace(/^STRIPE_API_VERSION = .*$/m, 'STRIPE_API_VERSION = "2025-03-31.basil"')), /staging: STRIPE_API_VERSION/);
  assert.throws(() => checkApiVersion(withProductionVars().replace(/^STRIPE_API_VERSION = .*\n/m, '')), /production: STRIPE_API_VERSION/);
});

test('pinned, every Stripe call (checkout\'s price read, customer and session, the portal, the webhook\'s subscription read) sends Stripe-Version; unpinned, none does', async () => {
  for (const pin of [STRIPE_API_VERSION_EXPECTED, '']) {
    const s = setup({ env: billingEnv(pin ? { STRIPE_API_VERSION: pin } : {}) });
    assert.equal((await s.app.fetch(billingReq('/v1/billing/checkout', { body: { plan: 'ultra', period: 'monthly' } }), s.env)).status, 200);
    await subscribe(s);
    assert.equal((await s.app.fetch(billingReq('/v1/billing/portal', { body: {} }), s.env)).status, 200);
    const calls = s.up.stripe();
    assert.deepEqual(calls.map((c) => c.path).sort(), ['/v1/billing_portal/sessions', '/v1/checkout/sessions', '/v1/customers', '/v1/prices/price_BeyondMonthly1', '/v1/subscriptions/sub_Test123']);
    for (const c of calls) assert.equal(c.headers['stripe-version'], pin || undefined, `${pin || 'unpinned'}: ${c.path}`);
  }
});

// ------------------------------------------------------------ Stripe Tax --
test('STRIPE_AUTOMATIC_TAX: off unless switched on; staging says "false" until its AU registration is Collecting', () => {
  assert.equal(readConfig({}).billing.automaticTax, false, 'off by default');
  assert.equal(readConfig(billingEnv()).billing.automaticTax, false);
  for (const v of ['true', 'TRUE', '1', 'on', 'yes']) assert.equal(readConfig(billingEnv({ STRIPE_AUTOMATIC_TAX: v })).billing.automaticTax, true, v);
  for (const v of ['false', '0', 'off', 'no', 'ture', '']) assert.equal(readConfig(billingEnv({ STRIPE_AUTOMATIC_TAX: v })).billing.automaticTax, false, JSON.stringify(v));
  const t = varsTables(WRANGLER);
  assert.equal(t.staging.STRIPE_AUTOMATIC_TAX, 'false');
  assert.equal(readConfig(t.staging).billing.automaticTax, false);
  assert.equal(t.production.STRIPE_AUTOMATIC_TAX, undefined, 'production: no billing var');
  // where it is set, it says exactly "true" or "false" (a typo would read as off without saying so)
  for (const [name, vars] of Object.entries(t)) if ('STRIPE_AUTOMATIC_TAX' in vars) assert.ok(['true', 'false'].includes(vars.STRIPE_AUTOMATIC_TAX), name);
  assert.match(WRANGLER, /^#.*STRIPE_AUTOMATIC_TAX/m, 'documented');
});

// -------------------------------------------------------------- /v1/health --
test('/v1/health says the Stripe mode, why a key is refused, the approval, the API version and the tax switch; never a value', async () => {
  const health = async (env) => {
    const s = setup({ env });
    const res = await s.app.fetch(req('/v1/health'), s.env);
    assert.equal(res.status, 200);
    const text = await res.text();
    assertClean(s.logs, text);
    for (const v of [LIVE_KEY, TEST_KEY, WHSEC, PK, 'price_', 'cus_', 'acct_']) assert.ok(!text.includes(v), `no ${v.slice(0, 12)}`);
    return JSON.parse(text).billing;
  };
  // production today (nothing set): all off
  assert.deepEqual(await health(makeEnv({ PROVIDER: 'mock' })), { configured: false, webhook: false, stripe_mode: null, live_approved: false, api_version: null, automatic_tax: false });
  // production, approved, pinned
  assert.deepEqual(await health(billingEnv({ STRIPE_API_VERSION: STRIPE_API_VERSION_EXPECTED })), { configured: true, webhook: true, stripe_mode: 'live', live_approved: true, api_version: STRIPE_API_VERSION_EXPECTED, automatic_tax: false });
  // production with its live key but no approval yet: refused, and says why
  assert.deepEqual(await health(billingEnv({ BILLING_LIVE: undefined })), { configured: false, webhook: true, stripe_mode: null, key_refused: 'live_not_approved', live_approved: false, api_version: null, automatic_tax: false });
  assert.equal((await health(billingEnv({ STRIPE_SECRET_KEY: TEST_KEY }))).key_refused, 'test_key_on_production');
  // the staging Worker as committed (its own vars), with a test key, and with a live one pasted by mistake
  const staging = { ...varsTables(WRANGLER).staging, BILLING: billingEnv().BILLING, STRIPE_WEBHOOK_SECRET: WHSEC };
  assert.deepEqual(await health(makeEnv({ ...staging, STRIPE_SECRET_KEY: TEST_KEY })), {
    configured: false, webhook: true, stripe_mode: 'test', live_approved: false, api_version: STRIPE_API_VERSION_EXPECTED, automatic_tax: false,
    accounts_configured: false,
  });
  const wrong = await health(makeEnv({ ...staging, STRIPE_SECRET_KEY: LIVE_KEY, BILLING_LIVE: 'approved' }));
  assert.deepEqual([wrong.stripe_mode, wrong.key_refused, wrong.live_approved], [null, 'live_key_on_staging', false]);
  assert.equal((await health(billingEnv({ STRIPE_AUTOMATIC_TAX: 'true' }))).automatic_tax, true);
});

// ------------------------------------------------- sessions after the switch --
test('sessions minted before the switch: in "billing" only billing sessions reach the model; in "billing+testing" a testing one only if minted there with a code', async () => {
  const signingKey = makeEnv().TOKEN_SIGNING_KEY;
  const mint = (src, more = {}) => signToken({ sub: `${src === 'billing' ? 'acct' : src === 'storekit' ? 'st' : 'dev'}_${'a'.repeat(32)}`, ent: 'beyond', src, ...more, iat: CLOCK_START, exp: CLOCK_START + 30 * DAY }, signingKey);
  // testing: from testing mode (with or without a code, it does not say); invited: minted under billing+testing with a code
  const tokens = { testing: await mint('testing'), invited: await mint('testing', { inv: 1 }), billing: await mint('billing'), storekit: await mint('storekit') };
  const ok = { testing: 'ok', invited: 'ok', billing: 'ok', storekit: 'ok' };
  const cases = [
    ['testing', '', ok],
    ['testing', 'MALLOW-ONE', ok],
    ['storekit', '', ok],
    ['both', '', ok],
    ['billing', 'MALLOW-ONE', { testing: 'superseded', invited: 'superseded', billing: 'ok', storekit: 'superseded' }],
    // a testing session from before the switch may have been open to anyone (testing mode without codes): one new
    // session, which the app asks for with its saved code
    ['billing+testing', 'MALLOW-ONE', { testing: 'superseded', invited: 'ok', billing: 'ok', storekit: 'ok' }],
    ['billing+testing', '', { testing: 'superseded', invited: 'superseded', billing: 'ok', storekit: 'ok' }],
  ];
  for (const [mode, codes, want] of cases) {
    const s = setup({ env: makeEnv({ PROVIDER: 'mock', ENTITLEMENT_MODE: mode, TESTER_INVITE_CODES: codes }) });
    for (const [src, token] of Object.entries(tokens)) {
      const label = `${mode}${codes ? ' with codes' : ''}: a ${src} session`;
      const a = await s.app.fetch(angleReq(token, { text: 'My colleague got promoted instead of me.' }), s.env);
      const f = await s.app.fetch(req('/v1/feedback', { body: { rating: 'helped' }, headers: { authorization: `Bearer ${token}` } }), s.env);
      if (want[src] === 'ok') {
        assert.equal(a.status, 200, `${label}: angle`);
        assert.equal((await a.json()).status, 'ok', label);
        assert.equal(f.status, 202, `${label}: feedback`);
      } else {
        for (const [res, route] of [[a, 'angle'], [f, 'feedback']]) {
          assert.equal(res.status, 401, `${label}: ${route}`);
          assert.equal((await res.json()).error.code, 'session_superseded', `${label}: ${route}`);
          assert.match(res.headers.get('www-authenticate') || '', /^Bearer /, 'the client asks for a new session on a 401');
        }
      }
    }
    if (Object.values(want).includes('superseded')) assert.ok(lines(s.logs).some((l) => l.evt === 'angle' && l.err === 'session_superseded'), `${mode}: logged`);
    assertClean(s.logs);
  }
  // what a session carries: a tester's under billing+testing says it used a code and reaches the model; testing mode's
  // says nothing new (as today)
  const claimsOf = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
  for (const [mode, inv] of [['billing+testing', 1], ['testing', undefined]]) {
    const m = setup({ env: makeEnv({ PROVIDER: 'mock', ENTITLEMENT_MODE: mode, TESTER_INVITE_CODES: 'MALLOW-ONE' }) });
    const r = await m.app.fetch(req('/v1/session', { body: { invite: 'MALLOW-ONE', device_id: 'device-aaaaaaaaaaaaaaaa' } }), m.env);
    assert.equal(r.status, 200, mode);
    const { token, source } = await r.json();
    assert.deepEqual([source, claimsOf(token).inv], ['testing', inv], mode);
    assert.equal((await m.app.fetch(angleReq(token, { text: 'My colleague got promoted instead of me.' }), m.env)).status, 200, mode);
  }
  // a crisis still gets support at once, whatever the session (the check before the token is unchanged)
  const s = setup({ env: makeEnv({ PROVIDER: 'mock', ENTITLEMENT_MODE: 'billing' }) });
  const crisis = await s.app.fetch(angleReq(tokens.testing, { text: 'I want to kill myself' }), s.env);
  assert.equal(crisis.status, 200);
  assert.equal((await crisis.json()).status, 'crisis');
});

// ----------------------------------------------------------- local harness --
test('local harness: forwards the stage, the pin and the tax switch, never BILLING_LIVE; refuses a live key; bills only on the staging project', async () => {
  const { harnessEnv } = await import('../tools/local-harness.mjs');
  for (const k of [LIVE_KEY, stripeKey('sk_live')]) assert.match(harnessEnv({ STRIPE_SECRET_KEY: k }).error, /only takes Stripe test keys/);
  const values = {
    STRIPE_SECRET_KEY: TEST_KEY, STRIPE_WEBHOOK_SECRET: WHSEC, STRIPE_PRICE_PAID_MONTHLY: 'price_FlowMonthly1', STRIPE_PRICE_ULTRA_MONTHLY: 'price_BeyondMonthly1',
    SUPABASE_URL: 'https://igbxbfuaoybfzsroxuln.supabase.co', SUPABASE_PUBLISHABLE_KEY: PK, APP_ORIGIN: 'http://localhost:8000', ENTITLEMENT_MODE: 'billing',
  };
  const { env } = harnessEnv({ ...values, ACCOUNTS_STAGE: 'staging', SUPABASE_URL: STAGING_SUPABASE, STRIPE_AUTOMATIC_TAX: 'true', BILLING_LIVE: 'approved' });
  assert.equal(env.ACCOUNTS_STAGE, 'staging');
  assert.equal(env.STRIPE_AUTOMATIC_TAX, 'true');
  assert.equal(env.STRIPE_API_VERSION, STRIPE_API_VERSION_EXPECTED, 'pinned as the Workers are, unless told otherwise');
  assert.equal(harnessEnv({ ...values, STRIPE_API_VERSION: '2026-09-30.dahlia' }).env.STRIPE_API_VERSION, '2026-09-30.dahlia');
  assert.equal('BILLING_LIVE' in env, false, 'the approval is never forwarded');
  assert.equal(typeof env.BILLING?.get, 'function', 'subscriptions kept in memory');
  // with the staging project (once STAGING_SUPABASE_PROJECT_URL is filled), a test key bills, in test mode
  const { readConfig: readWithStaging } = await withStagingProject(STAGING_SUPABASE);
  const staging = readWithStaging(env).billing;
  assert.deepEqual([staging.configured, staging.keyMode, staging.automaticTax], [true, 'test', true]);
  // without ACCOUNTS_STAGE=staging it is the production stage, which takes no test key: a rehearsal never lands on a hushmallow1 account
  const prod = readConfig(harnessEnv(values).env).billing;
  assert.deepEqual([prod.configured, prod.keyRefused], [false, 'test_key_on_production']);
  // nothing given: no billing, as before
  const plain = harnessEnv({}).env;
  assert.deepEqual([plain.STRIPE_SECRET_KEY, plain.BILLING, plain.ACCOUNTS_STAGE], [undefined, undefined, undefined]);
  assert.equal(plain.PROVIDER, 'mock');
});

test('local harness as a command: a live key exits before anything runs; the one-shot answer still works', () => {
  const run = (extra) => spawnSync(process.execPath, ['--import', './test/register.mjs', 'tools/local-harness.mjs', 'My colleague got promoted instead of me.'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 60000, env: { PATH: process.env.PATH, ...extra },
  });
  const live = run({ STRIPE_SECRET_KEY: LIVE_KEY });
  assert.equal(live.status, 1);
  assert.match(live.stderr, /only takes Stripe test keys/);
  assert.ok(!live.stdout.includes('"status"'), 'no request was made');
  const once = run({});
  assert.equal(once.status, 0, once.stderr);
  assert.equal(JSON.parse(once.stdout).status, 'ok');
});
