// The billing environment per stage (src/config.js readBilling): which Stripe key each Worker takes, the owner's
// live-billing approval (BILLING_LIVE), the pinned API version, the Stripe Tax switch, what /v1/health says about
// them, the testing sessions after the switch to a billing mode, and the local harness. No real key anywhere:
// every key-shaped value is built at runtime (test/billing-fixtures.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { req } from './helpers.js';
import { readConfig, BILLING_LIVE_APPROVED } from '../src/config.js';
import {
  billingEnv, setup, upstream, subscription, event, deliver, subscribe, status, lines, assertClean, stripeKey, withStagingProject,
  varsTables, WRANGLER, PAYMENTS_MD, LIVE_KEY, TEST_KEY, WHSEC, STAGING_SUPABASE, PK,
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
