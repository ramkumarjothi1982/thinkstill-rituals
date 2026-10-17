// The staging rehearsal driver (tools/staging/rehearsal.cjs, docs/STAGING.md "Automated rehearsal driver"): its pure
// parts, offline. The arguments; every refusal R0 makes before any request (production's hosts, the production Worker,
// a key that is not a test key, the local flag with anything but a loopback base); what it makes of /v1/health, the
// published sign-in config and Stripe's addresses; that its defaults are the staging ones and never production's; the
// sentences R5 types; the teardown's choice; and that no secret is ever printed (the log helper, and the driver itself
// refusing with fake secrets in its environment). The browser part is tools/staging/rehearsal-dryrun.mjs (offline, a
// local build and the fake sign-in server). Every key-shaped fixture is built at run time (tools/secret-scan.mjs).
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
const ACCOUNT = { STAGING_E2E_EMAIL: 'e2e-a@example.com', STAGING_E2E_PASSWORD: 'gentle-moon-42' };
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
  assert.deepEqual(opts().steps, ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']);
  assert.deepEqual(opts('--steps', 'r6,R1').steps, ['R0', 'R1', 'R6']);
  assert.deepEqual(opts('--steps=R3').steps, ['R0', 'R3']);
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

test('STRIPE_E2E_KEY: test keys only (rk_test_ or sk_test_); a live key, a publishable key or anything else is refused, never echoed', () => {
  for (const k of [key('rk_test'), key('sk_test')]) assert.equal(pre([], { ...ACCOUNT, STRIPE_E2E_KEY: k }).refuse, null);
  for (const [k, re] of [[key('rk_live'), /is a live key/], [key('sk_live'), /is a live key/], [key('pk_test'), /not a Stripe test secret/], ['rk_test_short', /not a Stripe test secret/], [`whsec_${'a'.repeat(32)}`, /not a Stripe test secret/]]) {
    const why = pre([], { ...ACCOUNT, STRIPE_E2E_KEY: k }).refuse || '';
    assert.match(why, re);
    assert.ok(!why.includes(k), 'the key is never in the message');
  }
  assert.equal(pre([], ACCOUNT).key, null, 'no key: the teardown is by hand');
});

test('the accounts and the other inputs: refused when missing, half there, the same twice, or out of place', () => {
  assert.match(pre([], {}).refuse || '', /STAGING_E2E_EMAIL and STAGING_E2E_PASSWORD/);
  assert.equal(pre(['--steps', 'R1'], {}).refuse, null, 'a guest needs no account');
  assert.equal(pre(['--steps', 'R4'], { STAGING_E2E_C_EMAIL: 'e2e-c@example.com', STAGING_E2E_C_PASSWORD: 'quiet-harbour-77' }).refuse, null, 'R4 uses E2E-C only');
  assert.match(pre([], { ...ACCOUNT, STAGING_E2E_C_EMAIL: 'e2e-c@example.com' }).refuse || '', /go together/);
  assert.match(pre([], { ...ACCOUNT, STAGING_E2E_C_EMAIL: 'E2E-A@example.com', STAGING_E2E_C_PASSWORD: 'x'.repeat(10) }).refuse || '', /second account/);
  assert.match(pre([], { ...ACCOUNT, REHEARSAL_SIGNUP_EMAIL: 'e2e-a@example.com' }).refuse || '', /new address/);
  assert.match(pre([], { ...ACCOUNT, REHEARSAL_SIGNUP_EMAIL: 'not-an-address' }).refuse || '', /not an email address/);
  assert.match(pre([], { ...ACCOUNT, STAGING_E2E_EMAIL: 'nobody' }).refuse || '', /not an email address/);
  assert.match(pre(['--steps', 'R2', '--delete-account'], ACCOUNT).refuse || '', /--delete-account goes with R8 only/);
  assert.match(pre(['--out', join(root, 'shots')], ACCOUNT).refuse || '', /outside the repository/);
  assert.equal(pre(['--out', join(tmpdir(), 'hm-shots')], ACCOUNT).refuse, null);
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

test('the teardown cancels only this run\'s own running test subscriptions, and stops at any live object', () => {
  const sub = (id, o) => ({ object: 'subscription', id, livemode: false, created: 1000, status: 'active', ...o });
  const list = [sub('sub_Run1aaaa'), sub('sub_Old1aaaa', { created: 999 }), sub('sub_Gone1aaa', { status: 'canceled' }), sub('sub_Exp1aaaa', { status: 'incomplete_expired' }),
    sub('sub_End1aaaa', { status: 'active', cancel_at_period_end: true }), sub('sub_Past1aaa', { status: 'past_due' }), { object: 'customer', id: 'cus_x' }, sub('not-an-id')];
  assert.deepEqual(D.subsToCancel(list, 1000), ['sub_Run1aaaa', 'sub_End1aaaa', 'sub_Past1aaa']);
  assert.throws(() => D.subsToCancel([sub('sub_Live1aaa', { livemode: true })], 0), D.LiveStop);
  assert.equal(D.hasLive({ data: [{ items: { data: [{ price: { livemode: true } }] } }] }), true);
  assert.equal(D.hasLive({ data: [{ livemode: false }] }), false);
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
    STAGING_E2E_EMAIL: 'Rehearsal.A+e2e@example.com', STAGING_E2E_PASSWORD: `pw-${'Zq9'.repeat(5)}`,
    STAGING_E2E_C_EMAIL: 'e2e-c@example.org', STAGING_E2E_C_PASSWORD: `cpw-${'Xy7'.repeat(5)}`,
    STRIPE_E2E_KEY: key('rk_test'), REHEARSAL_SIGNUP_EMAIL: 'owner-inbox@example.net', REHEARSAL_SIGNUP_PASSWORD: `spw-${'Wv5'.repeat(5)}`,
  };
  const lines = [];
  const log = D.createLog({ env, write: (l) => lines.push(l) });
  const uid = '7f9c1d2e-0000-4000-8000-123456789abc';
  log.secret(uid);
  const jwt = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiJ4In0', 's'.repeat(43)].join('.');
  const other = key('sk_live');
  log.pass('R2', `signed in as ${env.STAGING_E2E_EMAIL} with ${env.STAGING_E2E_PASSWORD} (${uid})`);
  log.fail('R3', `checkout for ${encodeURIComponent(env.STAGING_E2E_EMAIL)}: ${env.STRIPE_E2E_KEY} ${other} whsec_${'b'.repeat(24)} bearer ${jwt}`);
  log.skip('R4', `${env.STAGING_E2E_C_EMAIL.toUpperCase()} / ${env.STAGING_E2E_C_PASSWORD}; support@hushmallow.com`);
  log.info(`signup ${env.REHEARSAL_SIGNUP_EMAIL} ${env.REHEARSAL_SIGNUP_PASSWORD} ${env.STAGING_E2E_EMAIL.toLowerCase()}`);
  log.refused(`?email=${env.REHEARSAL_SIGNUP_EMAIL.replace('@', '%40')}`);
  const all = lines.join('\n');
  for (const v of [...Object.values(env), uid, jwt, other, encodeURIComponent(env.STAGING_E2E_EMAIL), 'whsec_b', 'example.com', 'example.org', 'example.net', 'hushmallow.com']) {
    assert.ok(!all.includes(v), `"${v.slice(0, 12)}…" was printed`);
  }
  assert.match(lines[0], /^PASS  R2  signed in as \[redacted\] with \[redacted\]/);
  assert.match(lines[1], /^FAIL  R3 /);
  assert.match(all, /\[stripe key\]/);
  assert.match(all, /\[token\]/);
  assert.equal(lines.length, 5);
  // the screenshots mask each secret's own text too
  for (const v of [env.STAGING_E2E_EMAIL, env.STAGING_E2E_PASSWORD, uid]) assert.ok(log.secrets().includes(v));
});

test('the driver itself, refusing with fake secrets in its environment: exit 2, nothing sent, no secret printed', () => {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME || tmpdir(), STAGING_E2E_EMAIL: 'refusal-a@example.com', STAGING_E2E_PASSWORD: `pw-${'Kj4'.repeat(5)}`, STRIPE_E2E_KEY: key('rk_live') };
  for (const argv of [[], ['--base', 'https://app.hushmallow.com'], ['--worker', PRODUCTION_WORKER], ['--allow-local-for-testing'], ['--steps', 'R9']]) {
    const e = argv.length ? { ...env, STRIPE_E2E_KEY: key('rk_test') } : env;
    const r = spawnSync(process.execPath, [DRIVER, ...argv], { env: e, encoding: 'utf8', timeout: 60000 });
    const printed = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 2, `${JSON.stringify(argv)}: ${printed}`);
    assert.match(printed, /^REFUSED /m);
    for (const v of [e.STAGING_E2E_EMAIL, e.STAGING_E2E_PASSWORD, e.STRIPE_E2E_KEY]) assert.ok(!printed.includes(v), `${JSON.stringify(argv)}: a secret was printed`);
    assert.doesNotMatch(printed, /hushmallow staging rehearsal/, 'it never got as far as starting a browser');
  }
});
