// The staging rehearsal driver (tools/staging/rehearsal.cjs, docs/STAGING.md "Automated rehearsal driver"): its pure
// parts, offline. The arguments; every refusal R0 makes before any request (production's hosts, the production Worker,
// a key that is not a test key, the local flag with anything but a loopback base); what it makes of /v1/health, the
// published sign-in config (and whether its model is the real one) and Stripe's addresses; that its defaults are the
// staging ones and never production's; that its accounts are its own, never the sandbox driver's E2E-B; the sentences
// R5 types; R3U's upgrade (Stripe's confirm page told from the portal's home, the welcome only after "Confirming…" and
// the Worker's answer of the new plan, the page's own recorder) and R7's cancel from Manage subscription's home; the
// teardown (only the subscriptions of this run's own Checkout Sessions, once, upgraded or not); S12's verdict; a step out
// of time or interrupted being stopped, not only no longer waited for; Playwright's signal handlers off; and that no
// secret is ever printed (the log helper, and the driver itself refusing with fake secrets in its environment). The
// browser part, and the signals for real, is tools/staging/rehearsal-dryrun.mjs (offline, a local build and the fake
// sign-in server). Every key-shaped fixture is built at run time (tools/secret-scan.mjs).
// Run: node --test hushmallow/tests/staging-rehearsal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkText } from '../src/engine/safety.js';
import { firstStep } from '../src/beyond/angle-first.js';
import { POSITIVE } from './safety-qa.probes.mjs';
import { STAGING_ANGLE_ENDPOINT, ANGLE_ENDPOINT, isPreviewHost } from '../src/app/config.js';
import { PROJECT_URL, STAGING_PROJECT_URL, STAGING_PROJECT_REF, PROJECT_REF } from '../src/auth/config.js';
import { STAGING_WORKER, PRODUCTION_WORKER } from '../server/another-angle/scripts/billing-e2e.mjs';
import { varsTables, readWrangler } from '../server/another-angle/scripts/billing-checks.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const DRIVER = join(root, 'tools/staging/rehearsal.cjs');
const D = createRequire(import.meta.url)(DRIVER);
const repo = await D.loadRepo();
const opts = (...argv) => { const r = D.parseArgs(argv); assert.ok(r.opts, r.error); return r.opts; };
const key = (prefix) => `${prefix}_${'Ab3'.repeat(9)}`;
const ACCOUNT = { REHEARSAL_A_EMAIL: 'e2e-a@example.com', REHEARSAL_A_PASSWORD: 'gentle-moon-42' };
const C_ACCOUNT = { REHEARSAL_C_EMAIL: 'e2e-c@example.com', REHEARSAL_C_PASSWORD: 'quiet-harbour-77' };
const pre = (argv, env = ACCOUNT) => D.preflight({ opts: opts(...argv), env, repo });

test('the defaults are the staging preview and the staging Worker, read from the repository, and never production', () => {
  const p = pre([]);
  assert.equal(p.refuse, null);
  assert.equal(p.base, 'https://claude-launch-rc.hushmallow.pages.dev');
  assert.equal(p.base, varsTables(readWrangler()).staging.APP_ORIGIN, 'the staging Worker’s APP_ORIGIN');
  assert.equal(p.worker, STAGING_WORKER);
  assert.equal(p.worker, STAGING_ANGLE_ENDPOINT, 'the Worker the preview itself talks to');
  assert.ok(isPreviewHost(new URL(p.base)));
  assert.notEqual(p.worker, PRODUCTION_WORKER);
  assert.notEqual(p.worker, ANGLE_ENDPOINT);
  for (const prod of ['app.hushmallow.com', 'hushmallow.pages.dev', 'hushmallow.com']) assert.notEqual(new URL(p.base).hostname, prod);
  assert.equal(p.local, false);
  assert.equal(p.returnsHere, true, 'Stripe sends people back to this base');
  assert.equal(repo.stagingUrl, STAGING_PROJECT_URL);
  assert.equal(repo.stagingRef, STAGING_PROJECT_REF);
  assert.notEqual(repo.stagingRef, PROJECT_REF);
  assert.equal(repo.productionUrl, PROJECT_URL);
  // the steps' own words, from the app (never written twice)
  assert.equal(repo.signInFirst, 'Sign in or create an account first, so your plan stays with you.');
  assert.match(repo.webPlanNotTouched, /so cancel it first in Settings → Manage subscription$/);
  assert.equal(repo.returnLines.cancel, 'No problem. Nothing was charged.');
  assert.deepEqual([repo.plans.paid, repo.plans.ultra], ['hushmallow Flow', 'hushmallow Beyond']);
  assert.deepEqual(Object.values(repo.billingPrices), ['US$9.99', 'US$99.99', 'US$19.99', 'US$199.99']);
});

test('arguments: steps (R0 always first), viewport, values, and anything else refused', () => {
  assert.deepEqual(opts().steps, ['R0', 'R1', 'R2', 'R3', 'R3U', 'R4', 'R5', 'R6', 'R7', 'R8']);
  assert.deepEqual(opts('--steps', 'r6,R1').steps, ['R0', 'R1', 'R6']);
  assert.deepEqual(opts('--steps=R3').steps, ['R0', 'R3']);
  assert.deepEqual(opts('--steps', 'r7,r3u,R3').steps, ['R0', 'R3', 'R3U', 'R7'], 'the run\'s own order: the upgrades after the purchase, the cancel last');
  assert.deepEqual(opts('--viewport', '375x812').viewport, { width: 375, height: 812 });
  assert.equal(opts('--out', '/tmp/x', '--delete-account').deleteAccount, true);
  assert.equal(opts('--allow-local-for-testing').allowLocal, true);
  for (const bad of [['--steps', 'R9'], ['--steps', ''], ['--steps'], ['--viewport', 'big'], ['--viewport', '10x10'], ['--base'], ['--base', '--out'], ['--nope'], ['stray']]) {
    assert.ok(D.parseArgs(bad).error, JSON.stringify(bad));
  }
});

test('R0 refuses production and every host that is not a branch preview, before anything is sent', () => {
  for (const base of ['https://app.hushmallow.com', 'https://hushmallow.pages.dev', 'https://hushmallow.com', 'https://www.hushmallow.com', 'https://ramkumarjothi1982.github.io']) {
    assert.match(pre(['--base', base]).refuse || '', /is production: this driver never runs there/, base);
  }
  for (const base of ['https://a.b.hushmallow.pages.dev', 'http://claude-launch-rc.hushmallow.pages.dev', 'https://claude-launch-rc.hushmallow.pages.dev:8443',
    'https://claude-launch-rc.hushmallow.pages.dev.evil.example', 'https://example.com', 'https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev']) {
    assert.match(pre(['--base', base]).refuse || '', /not a branch preview/, base);
  }
  for (const base of ['https://claude-launch-rc.hushmallow.pages.dev/app', 'https://claude-launch-rc.hushmallow.pages.dev/?x=1', 'https://u:p@claude-launch-rc.hushmallow.pages.dev', 'not a url']) {
    assert.ok(pre(['--base', base]).refuse, base);
  }
  // another preview is allowed, but Stripe returns to APP_ORIGIN only: the paying steps then skip (gate)
  const other = pre(['--base', 'https://0a1b2c3d.hushmallow.pages.dev']);
  assert.equal(other.refuse, null);
  assert.equal(other.returnsHere, false);
});

test('R0 refuses the production Worker, any other Worker, and a Worker address with more than an origin', () => {
  assert.match(pre(['--worker', PRODUCTION_WORKER]).refuse || '', /is the production Worker/);
  assert.match(pre(['--worker', ANGLE_ENDPOINT]).refuse || '', /is the production Worker/);
  for (const w of ['https://example.workers.dev', 'http://hushmallow-another-angle-staging.vibyfy-chat.workers.dev', `${STAGING_WORKER}/v1`, `${STAGING_WORKER}:444`, 'https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev.evil.example']) {
    assert.match(pre(['--worker', w]).refuse || '', /must be the staging Worker/, w);
  }
});

test('the local test flag only goes with a loopback base, and a loopback base only with the flag', () => {
  const ok = pre(['--base', 'http://127.0.0.1:8202', '--allow-local-for-testing']);
  assert.equal(ok.refuse, null);
  assert.equal(ok.local, true);
  assert.equal(pre(['--base', 'http://localhost:8202', '--allow-local-for-testing']).local, true);
  assert.match(pre(['--base', 'http://127.0.0.1:8202']).refuse || '', /--allow-local-for-testing/);
  assert.match(pre(['--allow-local-for-testing']).refuse || '', /only with a loopback --base/, 'never with the preview');
  assert.match(pre(['--base', 'https://app.hushmallow.com', '--allow-local-for-testing']).refuse || '', /only with a loopback --base/);
  assert.ok(pre(['--base', 'http://127.0.0.1', '--allow-local-for-testing']).refuse, 'a port is part of it');
});

test('STRIPE_E2E_KEY: a restricted Sandbox key only (rk_test_); a secret key, a live key, a publishable key or anything else is refused, never echoed', () => {
  assert.equal(pre([], { ...ACCOUNT, STRIPE_E2E_KEY: key('rk_test') }).refuse, null);
  assert.match(pre([], { ...ACCOUNT, STRIPE_E2E_KEY: key('sk_test') }).refuse, /not a restricted Stripe Sandbox key/);
  for (const [k, re] of [[key('rk_live'), /is a live key/], [key('sk_live'), /is a live key/], [key('pk_test'), /not a restricted Stripe Sandbox key/], ['rk_test_short', /not a restricted Stripe Sandbox key/], [`whsec_${'a'.repeat(32)}`, /not a restricted Stripe Sandbox key/]]) {
    const why = pre([], { ...ACCOUNT, STRIPE_E2E_KEY: k }).refuse || '';
    assert.match(why, re);
    assert.ok(!why.includes(k), 'the key is never in the message');
  }
  assert.equal(pre([], ACCOUNT).key, null, 'no key: the teardown is by hand');
});

test('the accounts and the other inputs: refused when missing, half there, the same twice, or out of place', () => {
  assert.match(pre([], {}).refuse || '', /REHEARSAL_A_EMAIL and REHEARSAL_A_PASSWORD/);
  assert.equal(pre(['--steps', 'R1'], {}).refuse, null, 'a guest needs no account');
  assert.equal(pre(['--steps', 'R4'], C_ACCOUNT).refuse, null, 'R4 uses E2E-C only');
  assert.match(pre([], { ...ACCOUNT, REHEARSAL_C_EMAIL: 'e2e-c@example.com' }).refuse || '', /go together/);
  assert.match(pre([], { ...ACCOUNT, REHEARSAL_C_EMAIL: 'E2E-A@example.com', REHEARSAL_C_PASSWORD: 'x'.repeat(10) }).refuse || '', /second account/);
  assert.match(pre([], { ...ACCOUNT, REHEARSAL_SIGNUP_EMAIL: 'e2e-a@example.com' }).refuse || '', /new address/);
  assert.match(pre([], { ...ACCOUNT, REHEARSAL_SIGNUP_EMAIL: 'not-an-address' }).refuse || '', /not an email address/);
  assert.match(pre([], { ...ACCOUNT, REHEARSAL_A_EMAIL: 'nobody' }).refuse || '', /not an email address/);
  assert.match(pre(['--steps', 'R2', '--delete-account'], ACCOUNT).refuse || '', /--delete-account goes with R8 only/);
  assert.match(pre(['--out', join(root, 'shots')], ACCOUNT).refuse || '', /outside the repository/);
  assert.equal(pre(['--out', join(tmpdir(), 'hm-shots')], ACCOUNT).refuse, null);
});

test('the accounts are the rehearsal\'s own: the sandbox driver\'s STAGING_E2E_… (E2E-B) is never read, and E2E-B as E2E-A or E2E-C is refused', () => {
  const B = { STAGING_E2E_EMAIL: 'e2e-b@example.com', STAGING_E2E_PASSWORD: 'sandbox-driver-pw' };
  // only the sandbox driver's variables set (B12's network secrets): refused, naming why, never signing in as E2E-B
  const onlyB = pre([], B);
  assert.match(onlyB.refuse || '', /REHEARSAL_A_EMAIL and REHEARSAL_A_PASSWORD/);
  assert.match(onlyB.refuse, /STAGING_E2E_EMAIL is the sandbox driver's E2E-B and is never used here/);
  assert.ok(!onlyB.refuse.includes(B.STAGING_E2E_EMAIL), 'the address is never in the message');
  // both set: the rehearsal's own account is the one used
  const both = pre([], { ...B, ...ACCOUNT });
  assert.equal(both.refuse, null);
  assert.equal(both.A.email, ACCOUNT.REHEARSAL_A_EMAIL);
  // E2E-B given as E2E-A or E2E-C (any case): refused, so the teardown never meets the sandbox driver's customers
  assert.match(pre([], { ...B, REHEARSAL_A_EMAIL: 'E2E-B@example.com', REHEARSAL_A_PASSWORD: 'x'.repeat(10) }).refuse || '', /REHEARSAL_A_EMAIL is the sandbox driver's account/);
  assert.match(pre([], { ...B, ...ACCOUNT, REHEARSAL_C_EMAIL: 'e2e-b@example.com', REHEARSAL_C_PASSWORD: 'x'.repeat(10) }).refuse || '', /REHEARSAL_C_EMAIL is the sandbox driver's account/);
  for (const k of ['STAGING_E2E_EMAIL', 'STAGING_E2E_PASSWORD', 'REHEARSAL_A_EMAIL', 'REHEARSAL_A_PASSWORD', 'REHEARSAL_C_EMAIL', 'REHEARSAL_C_PASSWORD']) assert.ok(D.SECRET_ENV.includes(k), `${k} is masked`);
});

test('/v1/health: test mode, live_approved false, configured, webhook and accounts; any live sign is a refusal', () => {
  const good = { ok: true, entitlement_mode: 'billing+testing', configured: { provider_key: true }, billing: { configured: true, webhook: true, stripe_mode: 'test', live_approved: false, api_version: repo.expectedFlags.api_version, automatic_tax: repo.expectedFlags.automatic_tax } };
  const j = D.judgeHealth(200, good, repo.expectedFlags);
  assert.equal(j.ok, true, j.why);
  assert.equal(j.refuse, null);
  assert.deepEqual([j.fields.configured, j.fields.webhook, j.fields.stripe_mode, j.fields.live_approved, j.fields.accounts_configured], [true, true, 'test', false, true]);
  const bill = (b) => ({ ...good, billing: { ...good.billing, ...b } });
  assert.match(D.judgeHealth(200, bill({ stripe_mode: 'live' }), repo.expectedFlags).refuse || '', /test mode only/);
  assert.match(D.judgeHealth(200, bill({ live_approved: true }), repo.expectedFlags).refuse || '', /live_approved true/);
  for (const [b, why] of [[{ configured: false }, /billing not configured/], [{ webhook: false }, /no webhook/], [{ stripe_mode: null }, /no Stripe test key/],
    [{ accounts_configured: false }, /accounts_configured false/], [{ key_refused: 'live_key_on_staging', stripe_mode: null }, /key_refused/], [{ placeholder_prices: 2 }, /placeholder_prices/],
    [{ api_version: '2020-01-01' }, /api_version/], [{ live_approved: undefined }, /live_approved is not false/]]) {
    const r = D.judgeHealth(200, bill(b), repo.expectedFlags);
    assert.equal(r.refuse, null, JSON.stringify(b));
    assert.equal(r.ok, false, JSON.stringify(b));
    assert.match(r.why, why);
  }
  assert.match(D.judgeHealth(200, { ...good, entitlement_mode: 'testing' }, repo.expectedFlags).why, /entitlement_mode testing/);
  assert.deepEqual([D.judgeHealth(0, null).reachable, D.judgeHealth(403, { error: {} }).reachable], [false, false]);
});

test('/v1/health\'s provider: R5 needs the real model; a Worker on PROVIDER=mock (whose provider_key reads true) never passes for it', () => {
  const good = { ok: true, provider: 'anthropic', entitlement_mode: 'billing+testing', configured: { provider_key: true }, billing: { configured: true, webhook: true, stripe_mode: 'test', live_approved: false, api_version: repo.expectedFlags.api_version, automatic_tax: repo.expectedFlags.automatic_tax } };
  const real = D.judgeHealth(200, good, repo.expectedFlags);
  assert.deepEqual([real.ok, real.realModel, real.fields.provider, real.modelWhy], [true, true, 'anthropic', '']);
  const mock = D.judgeHealth(200, { ...good, provider: 'mock' }, repo.expectedFlags);
  assert.equal(mock.ok, true, 'billing is still checked as before');
  assert.equal(mock.realModel, false);
  assert.match(mock.modelWhy, /provider is mock \(PROVIDER\), not the real model/);
  assert.equal(mock.fields.provider, 'mock', 'printed in R0');
  assert.equal(D.judgeHealth(200, { ...good, configured: { provider_key: false } }, repo.expectedFlags).realModel, false);
  assert.match(D.judgeHealth(200, { ...good, provider: undefined }, repo.expectedFlags).modelWhy, /not said/);
  assert.equal(D.judgeHealth(0, null).realModel, false);
  // the step says so before it opens anything (the source: R5's first check)
  assert.match(readFileSync(DRIVER, 'utf8'), /async function stepR5\(X\) \{[\s\S]{0,400}need\(X\.realModel, /);
});

test('the preview\'s sign-in: the staging project only; production\'s anywhere is a refusal; locally only the fake', () => {
  const published = { enabled: true, url: STAGING_PROJECT_URL, key: 'sb_publishable_x', mode: 'production' };
  const resolved = { enabled: true, url: STAGING_PROJECT_URL, ref: STAGING_PROJECT_REF, dev: false };
  assert.equal(D.judgeAuthConfig({ published, resolved, local: false, repo }).ok, true);
  assert.match(D.judgeAuthConfig({ published: { ...published, url: PROJECT_URL }, resolved: { enabled: false }, local: false, repo }).refuse || '', /production project hushmallow1/);
  assert.match(D.judgeAuthConfig({ published, resolved: { ...resolved, ref: PROJECT_REF, url: PROJECT_URL }, local: false, repo }).refuse || '', /igbxbfuaoybfzsroxuln/);
  assert.match(D.judgeAuthConfig({ published: { enabled: false }, resolved: { enabled: false }, local: false, repo }).why, /without sign-in \(A5/);
  assert.equal(D.judgeAuthConfig({ published: null, resolved, local: false, repo }).ok, false);
  const local = { published: { enabled: true, url: 'http://127.0.0.1:8203', mode: 'dev' }, resolved: { enabled: true, url: 'http://127.0.0.1:8203', ref: '127', dev: true } };
  assert.equal(D.judgeAuthConfig({ ...local, local: true, repo }).ok, true);
  assert.equal(D.judgeAuthConfig({ ...local, local: false, repo }).ok, false, 'a local config never passes online');
  assert.equal(D.judgeAuthConfig({ published, resolved, local: true, repo }).ok, false, 'the staging project never passes the local run');
  assert.deepEqual(D.parsePublicConfig('// x\nexport default Object.freeze({"enabled":true,"url":"https://a.supabase.co","key":"k","mode":"production"});\n'), { enabled: true, url: 'https://a.supabase.co', key: 'k', mode: 'production' });
  assert.equal(D.parsePublicConfig('nothing'), null);
});

test('Checkout and the portal: Stripe\'s own hosts and a test session only; a live one stops everything', () => {
  const cs = `cs_test_${'a1B2'.repeat(10)}`, live = `cs_live_${'a1B2'.repeat(10)}`;
  assert.deepEqual(D.checkoutVerdict(`https://checkout.stripe.com/c/pay/${cs}#fidabc`), { ok: true, live: false, id: cs, host: 'checkout.stripe.com', why: '' });
  assert.equal(D.checkoutVerdict(`https://checkout.hushmallow.com/c/pay/${cs}`).ok, true, 'the custom domain (B13)');
  assert.deepEqual([D.checkoutVerdict(`https://checkout.stripe.com/c/pay/${live}`).ok, D.checkoutVerdict(`https://checkout.stripe.com/c/pay/${live}`).live], [false, true]);
  for (const u of [`https://checkout.stripe.com.evil.example/c/pay/${cs}`, `http://checkout.stripe.com/c/pay/${cs}`, `https://checkout.stripe.com:8443/c/pay/${cs}`, `https://evil.example/c/pay/${cs}`, 'https://checkout.stripe.com/c/pay/', 'about:blank', '']) {
    assert.equal(D.checkoutVerdict(u).ok, false, u);
  }
  assert.deepEqual(D.portalVerdict('https://billing.stripe.com/p/session/test_YWNjdF8xUXo'), { ok: true, live: false, test: true, why: '' });
  assert.equal(D.portalVerdict('https://billing.stripe.com/p/session/live_YWNjdF8xUXo').live, true);
  assert.equal(D.portalVerdict('https://checkout.stripe.com/c/pay/x').ok, false);
  assert.equal(D.portalVerdict('https://billing.stripe.com/p/login/abc').test, null, 'cannot tell: the page must say test mode');
});

test('the upgrade\'s words and hooks come from the app and the Worker (never written twice in the driver)', () => {
  assert.equal(repo.confirmingLine, 'Confirming your new plan with Stripe…');
  assert.equal(repo.unchangedFlow, 'No change made. You’re still on hushmallow Flow.');
  assert.equal(repo.beyondTitle, 'Welcome to hushmallow Beyond');
  assert.equal(repo.yearlyLine, 'You’re on hushmallow Beyond, yearly');
  assert.deepEqual(repo.changeLabels, { upgrade: 'Upgrade to hushmallow Beyond', yearly: 'Switch to yearly' });
  assert.equal(repo.manageHint, 'Change plan, update your card or cancel.');
  assert.equal(repo.mallowCount, 7);
  assert.deepEqual(repo.okStatuses, ['active', 'trialing']);
  assert.deepEqual(repo.portalReturn, { home: '/?billing=portal', changed: '/?billing=changed', unchanged: '/?billing=unchanged' }, 'the staging Worker\'s own return addresses (src/billing/routes.js PORTAL_RETURN)');
  // R3's price, read as Checkout shows it: US$9.99, never found inside US$19.99 or US$99.99
  const re = D.amountRe(repo.billingPrices['hushmallow.paid.monthly']);
  assert.ok(re.test('hushmallow Flow US$9.99 per month'));
  assert.ok(re.test('$9.99'));
  for (const no of ['US$19.99', 'US$99.99', '9.995', '29.99']) assert.ok(!re.test(no), no);
  // the step's budget covers the app's own confirmation waits, twice over
  assert.ok(D.CONFIRM_WAIT_MS > 85500 && D.BUDGET.R3U >= 3 * D.CONFIRM_WAIT_MS);
});

test('the upgrade (R3U): Stripe\'s page confirming one change is told from the portal\'s home; the welcome only after "Confirming…" and the Worker\'s answer of the new plan, once', () => {
  assert.equal(D.stripePageKind(['Confirm', 'Return to hushmallow']), 'confirm');
  assert.equal(D.stripePageKind(['Update plan', 'Cancel subscription', 'Add payment method']), 'home');
  assert.equal(D.stripePageKind(['Confirm', 'Cancel plan']), 'home', 'a cancel control anywhere: never taken for the upgrade\'s page');
  assert.equal(D.stripePageKind(['Cancel', '  Confirm ']), 'confirm', 'a plain Cancel (going back) is not the subscription\'s cancel');
  assert.equal(D.stripePageKind([]), 'other');
  assert.equal(D.stripePageKind(['Continue', 'Select']), 'other');
  assert.equal(D.stripePageKind(['Confirm and pay']), 'confirm');
  const line = repo.confirmingLine;
  const notes = [{ state: 'confirming', text: '', at: 100 }, { state: 'confirming', text: line, at: 150 }];
  const answer = (o) => ({ path: '/v1/billing/sync', http: 200, tier: 'ultra', period: 'monthly', status: 'active', at: 400, ...o });
  const welcome = (o) => ({ kind: 'beyond', to: 'ultra.monthly', title: repo.beyondTitle, mallows: 7, at: 600, ...o });
  const j = (o) => D.judgeConfirm({ to: 'ultra.monthly', kind: 'beyond', confirmingLine: line, okStatuses: repo.okStatuses, notes, ...o });
  const ok = j({ answers: [answer({ tier: 'paid', at: 200 }), answer()], welcomes: [welcome()] });
  assert.equal(ok.ok, true, ok.why);
  assert.equal(ok.said, '"Confirming your new plan with Stripe…" first, then the welcome 200 ms after the Worker\'s /v1/billing/sync said ultra.monthly active (1 answer(s) before it said the old plan)');
  assert.equal(j({ answers: [answer({ status: 'trialing' })], welcomes: [welcome()] }).ok, true, 'trialing confirms too');
  assert.equal(j({ answers: [answer({ path: '/v1/billing/status', at: 120 })], welcomes: [welcome()] }).ok, true, 'the recorded plan (the webhook, from Stripe) at the start counts');
  for (const [o, why] of [
    [{ answers: [answer({ at: 700 })], welcomes: [welcome()] }, /the welcome opened before the Worker said ultra\.monthly active \(never before Stripe confirms/],
    [{ answers: [answer({ status: 'past_due' })], welcomes: [welcome()] }, /the welcome opened before the Worker said ultra\.monthly active/],
    [{ answers: [answer({ period: 'yearly' })], welcomes: [welcome()] }, /the welcome opened before the Worker said ultra\.monthly active/],
    [{ answers: [answer({ http: 502 })], welcomes: [welcome()] }, /the welcome opened before/],
    [{ answers: [answer()], welcomes: [] }, /the Worker said ultra\.monthly active, yet no welcome opened/],
    [{ answers: [answer({ tier: 'paid' })], welcomes: [] }, /no welcome, and the Worker never said ultra\.monthly active \(last answer: 200 paid\.monthly active\)/],
    [{ answers: [answer()], welcomes: [welcome(), welcome({ at: 900 })] }, /the welcome opened 2 times/],
    [{ answers: [answer()], welcomes: [welcome({ kind: 'plan' })] }, /the welcome was "plan" for ultra\.monthly, not "beyond" for ultra\.monthly/],
    [{ answers: [answer()], welcomes: [welcome({ to: 'ultra.yearly' })] }, /for ultra\.yearly, not "beyond" for ultra\.monthly/],
    [{ answers: [answer()], welcomes: [welcome()], notes: [] }, /"Confirming your new plan with Stripe…" did not show before the welcome/],
    [{ answers: [answer()], welcomes: [welcome()], notes: [{ state: 'confirming', text: '', at: 650 }] }, /did not show before the welcome/],
    [{ answers: [answer()], welcomes: [welcome()], notes: [{ state: 'confirming', text: 'All done!', at: 100 }] }, /the confirming line said "All done!"/],
    [{ answers: [answer()], welcomes: [], notes: [...notes, { state: 'payment_issue', text: 'Your payment didn’t go through…', at: 500 }] }, /the app said the payment needs a look/],
  ]) {
    const r = j(o);
    assert.equal(r.ok, false, JSON.stringify(o));
    assert.match(r.why, why);
  }
  // back by Stripe's return link
  const u = (o) => D.judgeUnchanged({ line: repo.unchangedFlow, notes: [{ state: 'unchanged', text: '', at: 1 }, { state: 'unchanged', text: repo.unchangedFlow, at: 2 }], welcomes: [], ...o });
  assert.deepEqual(u(), { ok: true, why: '' });
  assert.match(u({ welcomes: [welcome()] }).why, /a welcome opened \(beyond ultra\.monthly\) though nothing was confirmed/);
  assert.match(u({ notes: [] }).why, /^no "No change made\. You’re still on hushmallow Flow\."/);
  assert.match(u({ notes: [{ state: 'unchanged', text: 'No change made. You’re still on hushmallow Beyond.', at: 1 }] }).why, /the app said "No change made\. You’re still on hushmallow Beyond\."/);
});

test('the recorder in the page: Stripe\'s way back as it arrived, the status line and the welcome as they show, and the Worker\'s billing answers as they arrive (the app\'s own response untouched)', async () => {
  const keep = ['window', 'document', 'location', 'MutationObserver'].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  const set = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  let scan = null;
  const els = { notes: [], sheets: [] };
  const host = 'claude-launch-rc.hushmallow.pages.dev';
  const sent = [];
  const win = {
    fetch: async (url) => {
      sent.push(String(url));
      await new Promise((r) => setTimeout(r, 5));
      return new Response(JSON.stringify(String(url).endsWith('/sync') ? { tier: 'ultra', period: 'monthly', status: 'active' } : { url: 'https://billing.stripe.com/p/session/test_x' }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  };
  try {
    set('location', { host, search: '?billing=changed&to=ultra.monthly', href: `https://${host}/?billing=changed&to=ultra.monthly` });
    set('document', { querySelectorAll: (sel) => (sel === '[data-plan-confirm]' ? els.notes : sel === '.sheet[data-plan-welcome]' ? els.sheets : []) });
    set('MutationObserver', class { constructor(fn) { scan = fn; } observe() {} });
    set('window', win);
    D.recorder('another.example');
    assert.equal(win.__rh, undefined, 'only on the preview\'s own host');
    D.recorder(host);
    const rh = win.__rh;
    assert.equal(rh.arrived, '?billing=changed&to=ultra.monthly', 'the address Stripe sent, before the app takes it out');
    // the status line shows (its words a moment later), then the welcome
    const note = { state: 'confirming', words: '', getAttribute() { return this.state; }, querySelector() { return { textContent: this.words }; } };
    els.notes.push(note); scan(); scan();
    note.words = repo.confirmingLine; scan();
    const sheet = { attrs: { 'data-plan-welcome': 'beyond', 'data-to': 'ultra.monthly' }, getAttribute(k) { return this.attrs[k]; }, querySelector: () => ({ textContent: ' Welcome to  hushmallow Beyond ' }), querySelectorAll: () => ({ length: 7 }) };
    els.sheets.push(sheet); scan(); scan();
    assert.deepEqual(rh.notes.map((x) => [x.state, x.text]), [['confirming', ''], ['confirming', repo.confirmingLine]], 'each change once');
    assert.deepEqual(rh.welcomes.map((x) => [x.kind, x.to, x.title, x.mallows]), [['beyond', 'ultra.monthly', repo.beyondTitle, 7]], 'once');
    // a billing answer: recorded when it arrives; the app gets the very response, its body unread
    const t0 = Date.now();
    const res = await win.fetch('https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/billing/sync', { method: 'POST' });
    assert.equal(res.bodyUsed, false);
    assert.deepEqual(await res.json(), { tier: 'ultra', period: 'monthly', status: 'active' });
    for (let i = 0; i < 50 && !rh.answers.length; i++) await new Promise((r) => setTimeout(r, 2));
    assert.equal(rh.answers.length, 1);
    const [a] = rh.answers;
    assert.deepEqual({ ...a, at: 0 }, { path: '/v1/billing/sync', http: 200, tier: 'ultra', period: 'monthly', status: 'active', at: 0 });
    assert.ok(a.at >= t0 && a.at <= Date.now());
    // other calls go through, unrecorded
    await (await win.fetch('https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/billing/portal', { method: 'POST' })).json();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(rh.answers.length, 1);
    assert.equal(sent.length, 2);
  } finally {
    for (const [k, d] of keep) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; }
  }
});

test('R3 buys hushmallow Flow monthly; R3U upgrades that same subscription only through the plans page\'s buttons, reading Stripe\'s page before pressing anything there; R7 cancels only from Settings → Manage subscription\'s home', () => {
  const src = readFileSync(DRIVER, 'utf8');
  const body = (name) => { const i = src.indexOf(`async function ${name}(X`); assert.ok(i > 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
  const inOrder = (text, res, what) => { let at = 0; for (const re of res) { const m = re.exec(text.slice(at)); assert.ok(m, `${what}: ${re} after the one before`); at += m.index + m[0].length; } };
  const r3 = body('stepR3');
  assert.match(r3, /toCheckout\(X, page, 'paid', 'A'\)/);
  assert.match(r3, /welcomed\(X, page, 'paid', t0\)/);
  assert.match(r3, /X\.boughtA = true;/);
  const r3u = body('stepR3U');
  inOrder(r3u, [
    /toChange\(X, page, \{ card: '\.invite-beyond', action: 'upgrade', to: 'ultra\.monthly', label: repo\.changeLabels\.upgrade, twice: true \}\)/, /b\.requests === 1/,
    /readFlowPage\(X, page, repo\.plans\.ultra\)/, /leaveByReturnLink\(X, page\)/, /judgeUnchanged\(/,
    /toChange\(X, page, \{ card: '\.invite-beyond', action: 'upgrade', to: 'ultra\.monthly'/, /readFlowPage\(X, page, repo\.plans\.ultra\)/, /confirmOnStripe\(X, page\)/,
    /confirmedBack\(X, page, \{ to: 'ultra\.monthly', kind: 'beyond', title: repo\.beyondTitle \}\)/, /page\.reload\(/,
    /toChange\(X, page, \{ card: '\.invite-beyond', action: 'yearly', to: 'ultra\.yearly', label: repo\.changeLabels\.yearly \}\)/, /readFlowPage\(X, page, repo\.plans\.ultra\)/, /confirmOnStripe\(X, page\)/,
    /confirmedBack\(X, page, \{ to: 'ultra\.yearly', kind: 'plan', title: repo\.yearlyLine \}\)/,
  ], 'R3U');
  for (const f of [r3u, body('toChange'), body('readFlowPage'), body('confirmOnStripe'), body('confirmedBack'), body('leaveByReturnLink')]) {
    assert.doesNotMatch(f.replace(/need\(kind !== 'home'[^\n]*/, ''), /CANCEL_LABEL|cancel \(plan|clickFirst\(page, \[\/\^cancel/i, 'an upgrade never presses a cancel control');
  }
  assert.match(body('readFlowPage'), /need\(kind !== 'home', 'an upgrade opened the portal\\'s HOME/);
  assert.match(body('confirmOnStripe'), /clickFirst\(page, CONFIRM_LABELS, 30000\)[\s\S]*outcome\(X, page, 120000\)[\s\S]*need\(o\.kind === 'returned'/);
  assert.match(body('confirmedBack'), /judgeConfirm\(\{ to, kind, \.\.\.rec/);
  const r7 = body('stepR7');
  inOrder(r7, [/readDeleteScreen\(X, page\)/, /repo\.manageHint/, /toPortal\(X, page\)/, /!\('flow' in home\.json\)/, /stripePageKind\(n\) === 'home'/, /X\.cancelAttempted = true/, /clickFirst\(page, \[CANCEL_LABEL\]\)/, /returnFromPortal\(X, page\)/, /back\.get\('billing'\) === 'portal'/, /Ends on/], 'R7');
  assert.doesNotMatch(r7, /update \(plan|change \(plan|data-rh-pick/i, 'R7 no longer switches plans in the portal (R3U\'s upgrades do that through the plans page)');
  // Beyond's Checkout (R4, E2E-C) is welcomed by Beyond's welcome sheet, Flow's by its line
  assert.match(body('stepR4'), /welcomed\(X, page, 'ultra', t2\)/);
  assert.match(src.slice(src.indexOf('async function welcomed('), src.indexOf('async function closeWelcome(')), /plan === 'ultra' \? \(rh\.welcomes \|\| \[\]\)\.some\(\(x\) => x\.kind === 'beyond'/);
});

test('the app\'s hooks R3U, R7 and the recorder rely on are the app\'s own (the plans page\'s buttons, the status line, the welcome, Manage subscription\'s hint)', () => {
  const read = (p) => readFileSync(join(root, p), 'utf8');
  const plans = read('src/app/scenes/plans.js'), change = read('src/app/plan-change.js'), welcome = read('src/app/scenes/beyond-welcome.js'), settings = read('src/app/scenes/settings.js');
  assert.match(plans, /class: `invite \$\{beyond \? 'invite-beyond' : 'invite-flow'\}/);
  assert.match(plans, /class: `btn block invite-buy invite-change-buy\$\{tone\}`, 'data-plan-action': kind, 'data-to': `\$\{p\.id\}\.\$\{period\}`/);
  assert.match(plans, /h\('p', \{ class: 'invite-change-line' \}/);
  assert.match(change, /h\('span', \{ class: 'plan-note-text' \}\)/);
  assert.match(change, /'data-plan-confirm': state \}, dot, words\)/);
  assert.match(change, /el\.setAttribute\('data-plan-confirm', nextState\)/);
  assert.match(change, /s\.el\.setAttribute\('data-plan-confirm', 'payment_issue'\)/);
  assert.match(change, /h\('p', \{ class: 'plan-sheet-line' \}, line\)/);
  assert.match(change, /confirming: \(\) => planNote\(app, CHANGE_LINES\.confirming, \{ busy: true, state: 'confirming' \}\)/);
  assert.match(change, /say: \(text, ms, state\) => planNote\(app, text, \{ ms, state \}\)/);
  assert.match(change, /CHANGE_LINES\.unchanged\([^)]*\)[^\n]*'unchanged'\)/);
  assert.match(welcome, /s\.el\.setAttribute\('data-plan-welcome', kind\)/);
  assert.match(welcome, /if \(tier && period\) s\.el\.setAttribute\('data-to', `\$\{tier\}\.\$\{period\}`\)/);
  assert.match(welcome, /h\('h2', \{ class: 'pw-title'/);
  assert.match(welcome, /h\('span', \{ class: 'pw-mallow'[\s\S]*?h\('img', \{ src: m\.file/);
  assert.equal((welcome.match(/'data-act': 'continue'/g) || []).length, 2, 'Continue on both welcomes');
  assert.match(settings, /'data-act': 'manage-subscription', 'aria-describedby': 'manage-hint'/);
  assert.match(read('src/app/ui.js'), /const sheet = h\('div', \{ class: `sheet\$\{full \? ' full' : ''\}`/);
  assert.match(settings, /h\('p', \{ id: 'manage-hint', 'data-manage-hint': ''[^\n]*MANAGE_HINT\)/);
});

test('R1 reads "Sign in or create an account first…" where the app says it: the account screen\'s lede, never a toast over its buttons', async () => {
  const src = readFileSync(DRIVER, 'utf8');
  const i = src.indexOf('async function stepR1(X');
  const r1 = src.slice(i, src.indexOf('\n}\n', i));
  assert.match(r1, /document\.getElementById\('hm-account-lede'\)[^\n]*\) === repo\.signInFirst;\n\s+need\(await until\(ledeSays, 10000\), /);
  assert.match(r1, /need\(!\(await toastSince\(page, repo\.signInFirst, t0, 1500\)\), /, 'and no toast says it');
  assert.doesNotMatch(r1, /need\(await toastSince\(page, repo\.signInFirst/, 'the toast it once waited for is gone from the app');
  // the app's own: the plans page sends a guest to welcome with it, which says it as its lede (tests/account-notice.test.mjs)
  const { carriesNotice } = await import('../src/app/scenes/account.js');
  assert.equal(carriesNotice('welcome', { view: 'welcome', notice: repo.signInFirst }), true);
  assert.match(readFileSync(join(root, 'src/app/scenes/plans.js'), 'utf8'), /app\.go\('account', \{ view: 'welcome', notice: SIGN_IN_FIRST \}\);/);
  assert.match(readFileSync(join(root, 'src/app/scenes/account.js'), 'utf8'), /const lede = h\('p', \{ class: 'hm-auth-lede', id: 'hm-account-lede' \}\);/);
});

test('the teardown\'s choice: only the subscription of a Checkout Session this run opened, the account\'s, made since the start, still running', () => {
  const since = 1000;
  const sess = (o) => ({ object: 'checkout.session', id: 'cs_test_Run1aaaaaaaaaa', livemode: false, customer: 'cus_Aaaa1', client_reference_id: 'uid-a', metadata: { user_id: 'uid-a' }, subscription: 'sub_Run1aaaa', ...o });
  const sub = (o) => ({ object: 'subscription', id: 'sub_Run1aaaa', livemode: false, customer: 'cus_Aaaa1', created: 1000, status: 'active', ...o });
  const pick = (s, b, uid = 'uid-a') => D.teardownPick(s, b, { uid, sinceSec: since });
  assert.deepEqual(pick(sess(), sub()), { cancel: 'sub_Run1aaaa' });
  assert.deepEqual(pick(sess(), sub({ status: 'past_due', cancel_at_period_end: true })), { cancel: 'sub_Run1aaaa' }, 'cancelled at the period end in R7: still running, cancelled at once');
  // R3U's upgrades change the same subscription (its item's price, never its id): the session still names it
  const upgraded = sub({ items: { object: 'list', data: [{ id: 'si_Run1aaaa', price: { id: 'price_BeyondYearly1', lookup_key: 'hushmallow.ultra.yearly', livemode: false } }] }, cancel_at_period_end: true });
  assert.deepEqual(pick(sess(), upgraded), { cancel: 'sub_Run1aaaa' }, 'Flow monthly bought, upgraded to Beyond yearly, cancelled at the period end: cancelled at once');
  assert.equal(pick(sess(), sub({ created: 999 })).cancel, null, 'made before the run started: no margin');
  assert.equal(pick(sess({ subscription: null, status: 'expired' }), null).cancel, null, 'declined or abandoned, then expired: nothing to cancel');
  assert.equal(pick(sess({ subscription: null, status: 'expired' }), null).done, true);
  // still open: a payment may be completing (the subscription appears only when the session completes): never "done"
  assert.deepEqual(pick(sess({ subscription: null, status: 'open' }), null), { cancel: null, why: 'still open (not paid yet)', pending: true });
  assert.equal(pick(sess({ subscription: null }), null).done, undefined, 'no status said: never assumed done');
  assert.equal(pick(sess({ subscription: null, status: 'complete' }), null).done, undefined, 'complete with no subscription: checked by hand');
  assert.equal(pick(sess(), sub({ status: 'canceled' })).done, true);
  assert.equal(pick(sess(), sub({ status: 'incomplete_expired' })).cancel, null);
  assert.equal(pick(sess({ client_reference_id: 'uid-b', metadata: { user_id: 'uid-b' } }), sub()).cancel, null, 'a session of another account');
  assert.equal(pick(sess(), sub({ customer: 'cus_Bbbb1' })).cancel, null, 'a subscription of another customer');
  assert.equal(pick(sess(), sub({ id: 'sub_Other111' })).cancel, null, 'not the subscription the session names');
  assert.equal(pick(sess({ livemode: undefined }), sub()).cancel, null, 'test mode must be said');
  assert.equal(pick(sess(), sub({ livemode: undefined })).cancel, null);
  assert.equal(pick(sess(), sub(), null).cancel, 'sub_Run1aaaa', 'the account id unknown: the session alone');
  assert.throws(() => pick(sess({ livemode: true }), null), D.LiveStop);
  assert.throws(() => pick(sess(), sub({ items: { data: [{ price: { livemode: true } }] } })), D.LiveStop);
  assert.equal(D.hasLive({ data: [{ items: { data: [{ price: { livemode: true } }] } }] }), true);
  assert.equal(D.hasLive({ data: [{ livemode: false }] }), false);
});

test('the teardown asks Stripe only about this run\'s Checkout Sessions, never searches by customer, account or time, and runs once', async () => {
  const startMs = 1_800_000_000_000, t = startMs / 1000;
  const S = {
    cs_test_A1aaaaaaaaaa: { object: 'checkout.session', id: 'cs_test_A1aaaaaaaaaa', livemode: false, customer: 'cus_Aaaa1', client_reference_id: 'uid-a', subscription: 'sub_RunA1aaa' },
    cs_test_C1aaaaaaaaaa: { object: 'checkout.session', id: 'cs_test_C1aaaaaaaaaa', livemode: false, customer: 'cus_Cccc1', client_reference_id: 'uid-c', subscription: null, status: 'expired' },
    cs_test_C2aaaaaaaaaa: { object: 'checkout.session', id: 'cs_test_C2aaaaaaaaaa', livemode: false, customer: 'cus_Cccc1', client_reference_id: 'uid-c', subscription: { id: 'sub_RunC1aaa' } },
    cs_test_A0aaaaaaaaaa: { object: 'checkout.session', id: 'cs_test_A0aaaaaaaaaa', livemode: false, customer: 'cus_Aaaa1', client_reference_id: 'uid-a', subscription: 'sub_OldA1aaa' },
  };
  // the same customer also holds a subscription of the sandbox driver's shape, made within the run: never seen
  const SUB = {
    sub_RunA1aaa: { object: 'subscription', id: 'sub_RunA1aaa', livemode: false, customer: 'cus_Aaaa1', created: t + 120, status: 'active' },
    sub_RunC1aaa: { object: 'subscription', id: 'sub_RunC1aaa', livemode: false, customer: 'cus_Cccc1', created: t + 300, status: 'active' },
    sub_OldA1aaa: { object: 'subscription', id: 'sub_OldA1aaa', livemode: false, customer: 'cus_Aaaa1', created: t - 30, status: 'active' },
    sub_Sandbox1: { object: 'subscription', id: 'sub_Sandbox1', livemode: false, customer: 'cus_Aaaa1', created: t + 10, status: 'active' },
  };
  const calls = [];
  const stripe = {
    get: async (p, q) => {
      calls.push(['GET', p, q || null]);
      await new Promise((r) => setTimeout(r, 5));
      const id = p.split('/').pop();
      const data = p.startsWith('/v1/checkout/sessions/') ? S[id] : p.startsWith('/v1/subscriptions/') ? SUB[id] : null;
      return data ? { ok: true, status: 200, data, code: '' } : { ok: false, status: 404, data: null, code: 'resource_missing' };
    },
    del: async (p) => { calls.push(['DELETE', p]); return { ok: true, status: 200, data: { ...SUB[p.split('/').pop()], status: 'canceled' }, code: '' }; },
  };
  const lines = [];
  const X = {
    log: D.createLog({ write: (l) => lines.push(l) }), local: false, stripe, startMs, uids: { A: 'uid-a', C: 'uid-c' },
    sessions: [{ id: 'cs_test_A1aaaaaaaaaa', who: 'A' }, { id: 'cs_test_C1aaaaaaaaaa', who: 'C' }, { id: 'cs_test_C2aaaaaaaaaa', who: 'C' }, { id: 'cs_test_A1aaaaaaaaaa', who: 'A' }, { id: 'cs_test_A0aaaaaaaaaa', who: 'A' }],
  };
  // the end of the run and a signal's at the same time: one teardown
  const [f1, f2] = await Promise.all([D.teardown(X), D.teardown(X)]);
  assert.equal(f1, 1, 'the subscription made before the run is left alone, and said');
  assert.equal(f2, 1);
  assert.deepEqual(calls.filter((c) => c[0] === 'DELETE').map((c) => c[1]), ['/v1/subscriptions/sub_RunA1aaa', '/v1/subscriptions/sub_RunC1aaa']);
  for (const c of calls) {
    assert.match(c[1], /^\/v1\/(checkout\/sessions\/cs_test_|subscriptions\/sub_)/, `only this run's sessions and the subscriptions they name: ${c[1]}`);
    if (c[0] === 'GET') assert.equal(c[2], null, 'no search, list or filter');
  }
  assert.ok(!calls.some((c) => c[1].includes('sub_Sandbox1')));
  assert.equal(calls.filter((c) => c[1] === '/v1/checkout/sessions/cs_test_A1aaaaaaaaaa').length, 1, 'each session once');
  const all = lines.join('\n');
  assert.match(all, /cancelled sub_RunA1aaa/);
  assert.match(all, /^FAIL  teardown  sub_OldA1aaa left alone: its subscription was made before this run started/m);
  assert.match(all, /2 subscription\(s\) of this run's 4 Checkout Session\(s\) cancelled; nothing else was looked for or touched/);
  assert.equal(D.handList(X), 'the subscriptions of this run\'s Checkout Sessions (the sandbox → Payments → Checkout Sessions): cs_test_A0aaaaaaaaaa', 'what is left to do by hand');
  // a session still open when the teardown reads it: read again; one paid meanwhile is cancelled, one still open is
  // never called done: it stays on the list to check by hand
  {
    let reads = 0;
    const paying = { object: 'checkout.session', id: 'cs_test_P1aaaaaaaaaa', livemode: false, customer: 'cus_Aaaa1', client_reference_id: 'uid-a', subscription: null, status: 'open' };
    const open = { ...paying, id: 'cs_test_O1aaaaaaaaaa' };
    const st = {
      get: async (p) => {
        const id = p.split('/').pop();
        if (id === 'cs_test_P1aaaaaaaaaa') { reads++; return { ok: true, status: 200, code: '', data: reads >= 3 ? { ...paying, status: 'complete', subscription: 'sub_RunP1aaa' } : paying }; }
        if (id === 'cs_test_O1aaaaaaaaaa') return { ok: true, status: 200, code: '', data: open };
        if (id === 'sub_RunP1aaa') return { ok: true, status: 200, code: '', data: { object: 'subscription', id: 'sub_RunP1aaa', livemode: false, customer: 'cus_Aaaa1', created: t + 400, status: 'active' } };
        return { ok: false, status: 404, data: null, code: 'resource_missing' };
      },
      del: async (p) => ({ ok: true, status: 200, code: '', data: { id: p.split('/').pop(), status: 'canceled' } }),
    };
    const ol = [];
    const O = { log: D.createLog({ write: (l) => ol.push(l) }), local: false, stripe: st, startMs, uids: { A: 'uid-a' }, openEveryMs: 5, openWaitMs: 60,
      sessions: [{ id: 'cs_test_P1aaaaaaaaaa', who: 'A' }, { id: 'cs_test_O1aaaaaaaaaa', who: 'A' }] };
    assert.equal(await D.teardown(O), 1, 'the one still open counts as not seen to');
    assert.match(ol.join('\n'), /cancelled sub_RunP1aaa \(of cs_test_P1aaaaaaaaaa\)/);
    assert.match(ol.join('\n'), /^FAIL  teardown  cs_test_O1aaaaaaaaaa left alone: still open \(not paid yet\) \(check it by hand\)/m);
    assert.equal(D.handList(O), 'the subscriptions of this run\'s Checkout Sessions (the sandbox → Payments → Checkout Sessions): cs_test_O1aaaaaaaaaa');
  }
  // one Ctrl-C delivered twice (the terminal and `timeout`) is one; a second Ctrl-C a second later is a second
  assert.equal(D.SIGNAL_AGAIN_MS, 1000);
  assert.equal(D.isSignalAgain(1000, 1004), false);
  assert.equal(D.isSignalAgain(1000, 1999), false);
  assert.equal(D.isSignalAgain(1000, 2000), true);
  assert.equal(D.isSignalAgain(undefined, 5000), false);
  // a live object anywhere: everything stops
  const L = { ...X, teardownP: null, sessions: [{ id: 'cs_test_A1aaaaaaaaaa', who: 'A' }], stripe: { get: async () => { throw new D.LiveStop('livemode true'); }, del: async () => assert.fail('never') } };
  await assert.rejects(D.teardown(L), D.LiveStop);
  // no key: the sessions to see to by hand, nothing sent
  const lines2 = [];
  assert.equal(await D.teardown({ log: D.createLog({ write: (l) => lines2.push(l) }), local: false, stripe: null, sessions: X.sessions, uids: {} }), 0);
  assert.match(lines2.join('\n'), /^SKIP  teardown  no STRIPE_E2E_KEY: cancel by hand .*cs_test_A1aaaaaaaaaa, cs_test_C1aaaaaaaaaa, cs_test_C2aaaaaaaaaa, cs_test_A0aaaaaaaaaa/m);
  // the source never looks for subscriptions any other way
  const src = readFileSync(DRIVER, 'utf8');
  const body = src.slice(src.indexOf('async function tearDown(X)'), src.indexOf('const STEP_FNS'));
  assert.doesNotMatch(body, /customers\/search|created\[gte\]|'\/v1\/subscriptions'/);
});

test('S12: "Cancel your subscription first" while a plan renews is checked (now, or in R7 before its cancel); with none renewing it is a SKIP, never a PASS', () => {
  const T = repo.cancelFirstTitle;
  const look = (o) => ({ billing: true, notTouched: true, cancelFirst: false, unchecked: false, submitOff: true, renewing: false, goesAhead: null, ...o });
  const renewing = look({ renewing: true, cancelFirst: true });
  const j = (o) => D.judgeS12({ cancelFirstTitle: T, ...o });
  // a full run: R7 looked while Beyond renewed, R8 after the cancel at the period end
  const full = j({ now: look({ goesAhead: true }), before: { ...renewing, expect: true } });
  assert.equal(full.status, 'PASS', full.reason);
  assert.match(full.reason, /in R7, before its cancel, the plan renewed: "Cancel your subscription first" first, Delete off/);
  assert.match(full.reason, /after the cancel at the period end: no cancel-first step, and Delete turns on once the word is typed/);
  // R8 alone while the plan renews
  const now = j({ now: renewing, expectNow: true });
  assert.equal(now.status, 'PASS', now.reason);
  assert.match(now.reason, /^.*now the plan renewed: "Cancel your subscription first" first/);
  // no plan renewed at all in the run: S12's point was not checked
  const none = j({ now: look({ goesAhead: true }) });
  assert.equal(none.status, 'SKIP');
  assert.match(none.reason, /^S12 not checked: no plan renewed in this run/);
  assert.equal(j({ now: look({ billing: false, notTouched: false }) }).status, 'SKIP', 'web billing off: nothing to check');
  // what fails
  for (const [o, why] of [
    [{ now: look(), expectNow: true }, /this run’s plan renews, yet the delete screen says it does not/],
    [{ now: look({ renewing: true }) }, /now the plan renewed, but "Cancel your subscription first" was not there/],
    [{ now: look({ renewing: true, cancelFirst: true, submitOff: false }) }, /Delete my account is on before the word is typed/],
    [{ now: look({ goesAhead: true }), before: { ...renewing, cancelFirst: false, expect: true } }, /in R7, before its cancel, the plan renewed, but "Cancel your subscription first" was not there/],
    [{ now: look({ goesAhead: true }), before: { ...look(), expect: true } }, /in R7, before its cancel, this run’s plan renewed, yet the delete screen said it did not/],
    [{ now: look({ goesAhead: true }), before: { error: 'the delete screen did not open' } }, /R7's look at the delete screen while the plan renewed failed: the delete screen did not open/],
    [{ now: look({ goesAhead: false }), before: { ...renewing, expect: true } }, /after the cancel at the period end, Delete stays off with the word typed/],
    [{ now: look({ cancelFirst: true }) }, /shows, yet no plan renews/],
    [{ now: look({ unchecked: true }) }, /could not check for a subscription/],
    [{ now: look({ notTouched: false, renewing: true, cancelFirst: true }) }, /"Not touched" does not say to cancel a web subscription first/],
  ]) {
    const r = j(o);
    assert.equal(r.status, 'FAIL', JSON.stringify(o));
    assert.match(r.reason, why);
  }
  // R7 looks at the delete screen before it cancels when R8 is in the run, and only R3's own plan is ever changed (R3U
  // upgrades it, R7 cancels it)
  const src = readFileSync(DRIVER, 'utf8');
  const r7 = src.slice(src.indexOf('async function stepR7(X)'), src.indexOf('// cancel at the period end'));
  assert.match(r7, /X\.opts\.steps\.includes\('R8'\)[\s\S]*readDeleteScreen\(X, page\)[\s\S]*toPortal\(X, page\)/);
  const gx = (o) => ({ local: false, signInReady: true, billingReady: true, workerUp: true, pre: { returnsHere: true, C: null }, repo, base: repo.appOrigin, boughtA: false, ...o });
  for (const id of ['R3U', 'R7']) {
    assert.match(D.gate(gx(), id) || '', new RegExp(`no plan this run bought .*${id} only ever changes a subscription this run created`));
    assert.equal(D.gate(gx({ boughtA: true }), id), null);
    assert.match(D.gate(gx({ boughtA: true, local: true }), id) || '', /^local test mode/);
    assert.match(D.gate(gx({ boughtA: true, billingReady: false }), id) || '', /^R0: billing/);
    assert.match(D.gate(gx({ boughtA: true, pre: { returnsHere: false } }), id) || '', /^Stripe sends people back to the staging Worker's APP_ORIGIN/);
  }
});

test('a step out of time is stopped, not only no longer waited for: its later waits throw, its page closes, it cannot set the next step\'s page', async () => {
  const lines = [];
  const X = D.bindStepState({ log: D.createLog({ write: (l) => lines.push(l) }), shot: async () => {}, sessions: [], pageA: null, ctxA: null });
  const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
  const closed = [];
  const page = (name) => ({ name, close: async () => { closed.push(name); }, isClosed: () => closed.includes(name) });
  let ticks = 0, lateError = null;
  const orphan = page('R3-page');
  X.pageA = orphan;
  const r = await D.runStep(X, 'R3', async () => {
    X.page = orphan;
    try {
      for (;;) { await D.sleep(10); ticks++; }
    } catch (e) {
      lateError = e;
      X.sessions.push('never: an orphan cannot go on');
      throw e;
    }
  }, counts, 120);
  assert.equal(r, 'FAIL');
  assert.match(lines[0], /^FAIL  R3  took longer than 0\.12 s/);
  assert.ok(lateError instanceof D.Cancelled, 'its next wait threw Cancelled');
  const at = ticks;
  await new Promise((res) => setTimeout(res, 80));
  assert.equal(ticks, at, 'nothing of it runs any more');
  assert.deepEqual(closed, ['R3-page'], 'the page it was on closed');
  assert.equal(X.pageA, null, 'E2E-A\'s page went with it: the next step opens a new one');
  assert.equal(X.page, null, 'outside a step there is no page');

  // the next step's page is its own, whatever a stopped step left behind tries
  let stale = null;
  const r1 = D.runStep(X, 'R4', async () => {
    X.page = page('R4-page');
    stale = (async () => { await new Promise((res) => setTimeout(res, 60)); X.page = page('stale'); })().then(() => null, (e) => e);
    await D.sleep(400);
    return { reason: `on ${X.page.name}` };
  }, counts, 30);
  assert.equal(await r1, 'FAIL');
  assert.ok((await stale) instanceof D.Cancelled, 'setting a page in a stopped step throws');
  assert.ok(closed.includes('stale'), 'and closes that page');

  const r2 = await D.runStep(X, 'R5', async () => { X.page = page('R5-page'); await D.sleep(30); return { reason: `on ${X.page.name}` }; }, counts, 5000);
  assert.equal(r2, 'PASS');
  assert.match(lines.at(-1), /^PASS  R5  on R5-page$/);
  assert.equal(D.STEP.getStore(), undefined);
  D.checkpoint();   // outside any step: never throws
});

test('a step interrupted (Ctrl-C, SIGTERM) stops at once and fails as not finished; Playwright\'s own signal handlers are off', async () => {
  const lines = [];
  const X = D.bindStepState({ log: D.createLog({ write: (l) => lines.push(l) }), shot: async () => {} });
  const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
  let stoppedAt = null;
  const timers = () => process.getActiveResourcesInfo().filter((x) => x === 'Timeout').length;
  const t0 = Date.now(), before = timers();
  setTimeout(() => X.interruptStep('interrupted (Ctrl-C)'), 50);
  const r = await D.runStep(X, 'R5', async () => { try { await D.until(() => false, 60000, 10); } catch (e) { stoppedAt = Date.now(); throw e; } }, counts, 420000);
  assert.equal(r, 'FAIL');
  assert.ok(Date.now() - t0 < 2000, 'at once, not after the step\'s budget');
  assert.ok(stoppedAt, 'its wait ended');
  assert.match(lines[0], /^FAIL  R5  interrupted \(Ctrl-C\) after 0 s: not finished$/);
  assert.equal(X.interruptStep, null, 'nothing left to interrupt between steps');
  assert.ok(timers() <= before, 'no timer of the step (its budget, the wait for its work) holds the driver open after it');
  const src = readFileSync(DRIVER, 'utf8');
  // Playwright's handlers would close the browser and exit 130 before the teardown
  assert.match(src, /chromium\.launch\(\{[\s\S]{0,400}handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false/);
  assert.match(src, /process\.on\(sig, fn\)/);
  assert.doesNotMatch(src, /process\.once\('SIG/);
});

test('R5\'s sentences: an ordinary made-up situation Zuzu asks about first, and the crisis one taken from the safety fixtures', () => {
  assert.equal(checkText(D.EVERYDAY).level, 'none');
  assert.equal(firstStep(D.EVERYDAY, {}), 'choice', 'Zuzu asks "another angle, or just be with it?" first');
  const crisis = POSITIVE.find((x) => x[1] === 'crisis');
  assert.equal(repo.crisisSentence, crisis[0], 'the first crisis entry of tests/safety-qa.probes.mjs');
  assert.equal(checkText(repo.crisisSentence).level, 'crisis');
  assert.throws(() => D.pickCrisisSentence([['ordinary', 'none']]), /no crisis-level entry/);
  // the driver holds no crisis or self-harm words of its own: only the fixture's, read at run time
  const src = readFileSync(DRIVER, 'utf8');
  assert.ok(!src.includes(crisis[0]));
  for (const w of [/kill (?:my|him|her)self/i, /\bsuicid/i, /\bcutting\b/i, /hurt myself/i, /want to die/i, /end (?:it|my life)/i]) assert.doesNotMatch(src, w);
});

test('the proxy: the environment\'s HTTPS proxy online (with its bypass list), none for the local test run', () => {
  assert.equal(D.proxyFromEnv({ HTTPS_PROXY: 'http://127.0.0.1:3128' }, true), undefined);
  assert.equal(D.proxyFromEnv({}, false), undefined);
  assert.deepEqual(D.proxyFromEnv({ HTTPS_PROXY: 'http://127.0.0.1:3128', NO_PROXY: 'localhost, 127.0.0.1,,' }, false), { server: 'http://127.0.0.1:3128', bypass: 'localhost,127.0.0.1' });
  assert.deepEqual(D.proxyFromEnv({ https_proxy: 'http://127.0.0.1:3128' }, false), { server: 'http://127.0.0.1:3128' });
});

test('the log helper never prints a secret: each value of the environment, its encoded form, and anything shaped like one', () => {
  const env = {
    REHEARSAL_A_EMAIL: 'Rehearsal.A+e2e@example.com', REHEARSAL_A_PASSWORD: `pw-${'Zq9'.repeat(5)}`,
    REHEARSAL_C_EMAIL: 'e2e-c@example.org', REHEARSAL_C_PASSWORD: `cpw-${'Xy7'.repeat(5)}`,
    STRIPE_E2E_KEY: key('rk_test'), REHEARSAL_SIGNUP_EMAIL: 'owner-inbox@example.net', REHEARSAL_SIGNUP_PASSWORD: `spw-${'Wv5'.repeat(5)}`,
    STAGING_E2E_EMAIL: 'sandbox-b@example.org', STAGING_E2E_PASSWORD: `bpw-${'Tr2'.repeat(5)}`,
  };
  const lines = [];
  const log = D.createLog({ env, write: (l) => lines.push(l) });
  const uid = '7f9c1d2e-0000-4000-8000-123456789abc';
  log.secret(uid);
  const jwt = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiJ4In0', 's'.repeat(43)].join('.');
  const other = key('sk_live');
  log.pass('R2', `signed in as ${env.REHEARSAL_A_EMAIL} with ${env.REHEARSAL_A_PASSWORD} (${uid})`);
  log.fail('R3', `checkout for ${encodeURIComponent(env.REHEARSAL_A_EMAIL)}: ${env.STRIPE_E2E_KEY} ${other} whsec_${'b'.repeat(24)} bearer ${jwt}`);
  log.skip('R4', `${env.REHEARSAL_C_EMAIL.toUpperCase()} / ${env.REHEARSAL_C_PASSWORD}; support@hushmallow.com`);
  log.info(`signup ${env.REHEARSAL_SIGNUP_EMAIL} ${env.REHEARSAL_SIGNUP_PASSWORD} ${env.REHEARSAL_A_EMAIL.toLowerCase()}`);
  log.refused(`?email=${env.REHEARSAL_SIGNUP_EMAIL.replace('@', '%40')} ${env.STAGING_E2E_PASSWORD}`);
  const all = lines.join('\n');
  for (const v of [...Object.values(env), uid, jwt, other, encodeURIComponent(env.REHEARSAL_A_EMAIL), 'whsec_b', 'example.com', 'example.org', 'example.net', 'hushmallow.com']) {
    assert.ok(!all.includes(v), `"${v.slice(0, 12)}…" was printed`);
  }
  assert.match(lines[0], /^PASS  R2  signed in as \[redacted\] with \[redacted\]/);
  assert.match(lines[1], /^FAIL  R3 /);
  assert.match(all, /\[stripe key\]/);
  assert.match(all, /\[token\]/);
  assert.equal(lines.length, 5);
  // the screenshots mask each secret's own text too
  for (const v of [env.REHEARSAL_A_EMAIL, env.REHEARSAL_A_PASSWORD, env.STAGING_E2E_PASSWORD, uid]) assert.ok(log.secrets().includes(v));
});

test('the driver itself, refusing with fake secrets in its environment: exit 2, nothing sent, no secret printed', () => {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME || tmpdir(), REHEARSAL_A_EMAIL: 'refusal-a@example.com', REHEARSAL_A_PASSWORD: `pw-${'Kj4'.repeat(5)}`, STRIPE_E2E_KEY: key('rk_live') };
  for (const argv of [[], ['--base', 'https://app.hushmallow.com'], ['--worker', PRODUCTION_WORKER], ['--allow-local-for-testing'], ['--steps', 'R9']]) {
    const e = argv.length ? { ...env, STRIPE_E2E_KEY: key('rk_test') } : env;
    const r = spawnSync(process.execPath, [DRIVER, ...argv], { env: e, encoding: 'utf8', timeout: 60000 });
    const printed = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 2, `${JSON.stringify(argv)}: ${printed}`);
    assert.match(printed, /^REFUSED /m);
    for (const v of [e.REHEARSAL_A_EMAIL, e.REHEARSAL_A_PASSWORD, e.STRIPE_E2E_KEY]) assert.ok(!printed.includes(v), `${JSON.stringify(argv)}: a secret was printed`);
    assert.doesNotMatch(printed, /hushmallow staging rehearsal/, 'it never got as far as starting a browser');
  }
});
