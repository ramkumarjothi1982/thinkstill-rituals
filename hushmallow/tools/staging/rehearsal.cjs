// The rehearsal driver for the hushmallow STAGING preview: docs/STAGING.md "The rehearsal checklist", sections 1 to 8
// and S12, in a browser ("Automated rehearsal driver" there says how to run it and what stays by hand). Chromium
// (Playwright) drives the real preview through the app's own screens at a phone's size, and Stripe's own hosted pages
// in TEST mode only. Nothing here ever talks to production.
//
//   timeout 1200 node hushmallow/tools/staging/rehearsal.cjs [--steps R0,R1,…] [--out DIR] [--base URL] [--worker URL]
//        [--viewport 390x844] [--delete-account]
//   offline, a local build with the fake sign-in server (R1, R2, R6 only): node hushmallow/tools/staging/rehearsal-dryrun.mjs
//     (it passes --base http://127.0.0.1:PORT --allow-local-for-testing, a flag refused with any other --base)
//
// Defaults, from the repository: --base the staging Worker's APP_ORIGIN (wrangler.toml [env.staging.vars],
// https://claude-launch-rc.hushmallow.pages.dev), --worker STAGING_WORKER (server/another-angle/scripts/billing-e2e.mjs).
//
//   R0  preflight (always runs first). Refuses to start (exit 2): a --base that is not a branch preview (app.hushmallow.com
//       and every other host), the production Worker or any other as --worker, a STRIPE_E2E_KEY that is not a test key,
//       a /v1/health in any Stripe mode but test or with live_approved true, a preview publishing production's sign-in
//       project (igbxbfuaoybfzsroxuln). Checks: /v1/health (test mode, live_approved false, configured, webhook,
//       accounts), the preview's published sign-in config is the staging project, Settings' version line says "staging".
//   R1  a guest: the home screen asks nothing; Plans show the BILLING_PRICES a month and a year; "Step into hushmallow
//       Beyond" opens the account screen with "Sign in or create an account first…".
//   R2  sign in (STAGING_E2E_EMAIL / _PASSWORD) through the account screen, by password; Settings → Privacy shows the
//       account row. With REHEARSAL_SIGNUP_EMAIL: a fresh browser signs up (the 18+ tick) and sees "Check your email".
//   R3  Plans → Monthly → Beyond → Stripe Checkout (checkout.stripe.com or checkout.hushmallow.com and a cs_test_ session,
//       else FAIL and stop at once): hushmallow Beyond, US$19.99, no phone or promotion code field; 4242…; back on the
//       preview "Welcome to hushmallow Beyond" and ?billing=success gone (90 s); Settings → Plan: Beyond and Manage
//       subscription; with STRIPE_E2E_KEY the customer is read (one, with the account's metadata.user_id). Then a second
//       browser that has not heard of the plan yet (its plan check held back) taps "Step into hushmallow Flow": 409
//       already_subscribed, and the app opens the portal instead of a second Checkout.
//   R4  (with STAGING_E2E_C_EMAIL / _PASSWORD only) 4000 0000 0000 9995 declined on Stripe's page, its back link → "No
//       problem. Nothing was charged.", no plan; 4000 0025 0000 3155: Fail authentication, then Complete authentication.
//   R5  Another Angle with the real staging model: the consent card, one made-up everyday situation, an angle from the
//       server (60 s), "Show me another angle" (a second one); then the crisis sentence of tests/safety-qa.probes.mjs gets
//       the support response and nothing is sent for it.
//   R6  the account screen's two "Keep with my account" switches on, a favourite world; a new page in the same browser:
//       still signed in, still Beyond (after R3), the favourite kept, both switches still on.
//   R7  Settings → Manage subscription → billing.stripe.com (test): switch to hushmallow Flow, back: Flow; cancel at the
//       period end, back: Settings says "Ends on …".
//   R8  (S12) the delete screen: its "Not touched" list says to cancel a web subscription first, and "Cancel your
//       subscription first" shows while the plan renews. Nothing is deleted unless --delete-account is passed.
//   teardown  with STRIPE_E2E_KEY: every subscription of the test accounts' customers created since the run started and
//       still running is cancelled at once (only ids are printed); nothing else is touched. Any Stripe object with
//       livemode true stops everything at once (exit 3).
//
// Secrets and inputs come from the environment only. They are never printed (every line goes through the mask in
// createLog) and never written to disk (screenshots, of failures only, mask every input, the address on the account
// screens and any secret's text): STAGING_E2E_EMAIL, STAGING_E2E_PASSWORD (one confirmed hushmallow-staging account,
// E2E-A), optional STAGING_E2E_C_EMAIL, STAGING_E2E_C_PASSWORD (E2E-C, for the declines), optional STRIPE_E2E_KEY
// (rk_test_… or sk_test_…: read-only checks and the teardown), optional REHEARSAL_SIGNUP_EMAIL (+ optional
// REHEARSAL_SIGNUP_PASSWORD; a real inbox the owner controls: the driver only submits the form, the owner clicks the link).
// Each step prints one PASS, FAIL or SKIP line; screenshots of failures go to --out (default a new folder in the system's
// temporary directory, never inside the repository). Exit: 0 nothing failed; 1 a step failed; 2 refused to start;
// 3 stopped at once (a Stripe object or page in live mode). Stripe's hosted pages are driven by their visible labels and
// ids as remembered (they are not this repository's): watch the first run; a changed label fails with a screenshot.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');          // hushmallow/
const REPO_ROOT = path.resolve(ROOT, '..');              // the repository (hushmallow/ is one folder down)
const STEPS = Object.freeze(['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']);
/** Steps that sign in as E2E-A. */
const A_STEPS = Object.freeze(['R2', 'R3', 'R5', 'R6', 'R7', 'R8']);
/** Steps that need Stripe (and the real Worker): never run in the local test mode. */
const STRIPE_STEPS = Object.freeze(['R3', 'R4', 'R7']);
const ONLINE_ONLY = Object.freeze(['R3', 'R4', 'R5', 'R7']);
/** Every environment value this driver treats as secret: masked wherever it would appear. */
const SECRET_ENV = Object.freeze(['STAGING_E2E_EMAIL', 'STAGING_E2E_PASSWORD', 'STAGING_E2E_C_EMAIL', 'STAGING_E2E_C_PASSWORD', 'STRIPE_E2E_KEY', 'REHEARSAL_SIGNUP_EMAIL', 'REHEARSAL_SIGNUP_PASSWORD']);
/** Hosts that are production (or production's copies): named in the refusal. Every other non-preview host is refused too. */
const PRODUCTION_HOSTS = Object.freeze(['app.hushmallow.com', 'hushmallow.pages.dev', 'hushmallow.com', 'www.hushmallow.com', 'ramkumarjothi1982.github.io']);
const LOOPBACK = Object.freeze(['127.0.0.1', 'localhost', '[::1]']);
/** Where Checkout may open (src/app/billing.js STRIPE_PAGES, without the portal's host). */
const CHECKOUT_HOSTS = Object.freeze(['checkout.stripe.com', 'checkout.hushmallow.com']);
const PORTAL_HOSTS = Object.freeze(['billing.stripe.com', 'checkout.hushmallow.com']);
/** Stripe's test cards (docs/STAGING.md, the rehearsal checklist). */
const CARDS = Object.freeze({ ok: '4242 4242 4242 4242', declined: '4000 0000 0000 9995', threeDs: '4000 0025 0000 3155' });
/** R5's made-up everyday situation (the app's own check reads it as ordinary, and Zuzu asks first; tests check both). */
const EVERYDAY = 'My friend hasn\'t replied to my message since yesterday, so she must be annoyed with me.';
/** R6's favourite: one of the Hushfold's worlds (src/hushfold/flow/registry.js). */
const WORLD = 'static-storm';
/** Each step's whole time budget (ms); the outer `timeout 1200` is the run's. */
const BUDGET = Object.freeze({ R0: 120000, R1: 150000, R2: 200000, R3: 420000, R4: 480000, R5: 420000, R6: 200000, R7: 420000, R8: 150000 });
const CHROMIUM = '/opt/pw-browsers/chromium';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** A check this step cannot pass without. stop: the run stops after it (a Checkout that is not Stripe's test page). */
class Fail extends Error { constructor(msg, { stop = false } = {}) { super(msg); this.stop = stop; } }
/** A Stripe object or page in live mode: everything stops at once. */
class LiveStop extends Error {}
const need = (ok, what, o) => { if (!ok) throw new Fail(what, o); };

// ------------------------------------------------------------------------------------------------ the pure parts --

/** The repository's own constants (never written here twice). Throws when one cannot be read. */
async function loadRepo() {
  const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
  const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const [app, auth, billing, ent, lines, vm, e2e, checks, srv, probes] = await Promise.all([
    imp('src/app/config.js'), imp('src/auth/config.js'), imp('src/app/billing.js'), imp('src/app/entitlements.js'),
    imp('src/beyond/lines.js'), imp('src/auth/view-model.js'), imp('server/another-angle/scripts/billing-e2e.mjs'),
    imp('server/another-angle/scripts/billing-checks.mjs'), imp('server/another-angle/src/config.js'), imp('tests/safety-qa.probes.mjs'),
  ]);
  const constOf = (text, name) => (new RegExp(`export const ${name} = '([^'\\n]+)'`).exec(text) || [])[1] || null;
  const plansSrc = src('src/app/scenes/plans.js'), accountSrc = src('src/app/scenes/account.js'), angleSrc = src('src/beyond/another-angle.js');
  const staging = checks.varsTables(checks.readWrangler()).staging || {};
  const repo = {
    appOrigin: staging.APP_ORIGIN || null,
    stagingWorker: e2e.STAGING_WORKER, productionWorker: e2e.PRODUCTION_WORKER, productionApp: e2e.PRODUCTION_APP, e2eKey: e2e.E2E_KEY,
    isPreviewHost: app.isPreviewHost, stagingAllowedHosts: [...app.STAGING_ALLOWED_HOSTS], angleAllowedHosts: [...app.ANGLE_ALLOWED_HOSTS],
    stagingAngleEndpoint: app.STAGING_ANGLE_ENDPOINT, billingPrices: { ...app.BILLING_PRICES },
    stagingRef: auth.STAGING_PROJECT_REF, stagingUrl: auth.STAGING_PROJECT_URL, productionRef: auth.PROJECT_REF, productionUrl: auth.PROJECT_URL,
    returnLines: { ...billing.RETURN_LINES }, changePlan: billing.CHANGE_PLAN,
    plans: { paid: ent.PLANS.paid.name, ultra: ent.PLANS.ultra.name },
    signInFirst: constOf(plansSrc, 'SIGN_IN_FIRST'),
    webPlanNotTouched: constOf(accountSrc, 'WEB_PLAN_NOT_TOUCHED'),
    cancelFirstTitle: (/CANCEL_FIRST = Object\.freeze\(\{\s*title: '([^']+)'/.exec(accountSrc) || [])[1] || null,
    angleBudgetMs: Number((/const ANGLE_BUDGET_MS = (\d+);/.exec(angleSrc) || [])[1]) || null,
    deleteWord: vm.DELETE_WORD, safetyCrisis: [...lines.SAFETY.crisis], angleChoice: { ...lines.ANGLE_CHOICE },
    feedbackAsk: lines.FEEDBACK.ask, anotherLabel: (lines.FEEDBACK.options.find((o) => o.value === 'another') || {}).label || null,
    crisisSentence: pickCrisisSentence(probes.POSITIVE),
    expectedFlags: checks.expectedFlags('staging'), apiVersion: srv.STRIPE_API_VERSION_EXPECTED,
  };
  for (const [k, v] of Object.entries(repo)) if (v == null || v === '') throw new Error(`the repository's ${k} could not be read`);
  return Object.freeze(repo);
}

/** The crisis TEST sentence: the first crisis-level entry of the repository's own safety fixtures (never one made up here). */
function pickCrisisSentence(positive) {
  const hit = (Array.isArray(positive) ? positive : []).find((x) => Array.isArray(x) && x[1] === 'crisis' && typeof x[0] === 'string' && x[0]);
  if (!hit) throw new Error('tests/safety-qa.probes.mjs has no crisis-level entry');
  return hit[0];
}

/** argv → { opts } | { error }. R0 always runs first, whatever --steps says. */
function parseArgs(argv) {
  const opts = { steps: [...STEPS], stepsGiven: false, out: null, base: null, worker: null, viewport: { width: 390, height: 844 }, allowLocal: false, deleteAccount: false, localBillingPort: '65534', help: false };
  const valued = ['--steps', '--out', '--base', '--worker', '--viewport', '--local-billing-port'];
  const args = [...argv];
  for (let i = 0; i < args.length; i++) {
    let a = String(args[i]);
    let v;
    const eq = a.indexOf('=');
    if (a.startsWith('--') && eq > 2) { v = a.slice(eq + 1); a = a.slice(0, eq); }
    if (a === '--help' || a === '-h') { opts.help = true; continue; }
    if (a === '--allow-local-for-testing') { opts.allowLocal = true; continue; }
    if (a === '--delete-account') { opts.deleteAccount = true; continue; }
    if (!valued.includes(a)) return { error: `unknown argument ${a.slice(0, 40)} (see the header of tools/staging/rehearsal.cjs)` };
    if (v === undefined) { v = args[i + 1]; i++; }
    if (v === undefined || v === '' || v.startsWith('--')) return { error: `${a} needs a value` };
    if (a === '--steps') {
      const asked = v.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
      const bad = asked.filter((x) => !STEPS.includes(x));
      if (bad.length || !asked.length) return { error: `--steps takes ${STEPS.join(',')}` };
      opts.steps = STEPS.filter((s) => s === 'R0' || asked.includes(s));
      opts.stepsGiven = true;
    } else if (a === '--viewport') {
      const m = /^(\d{3,4})x(\d{3,4})$/.exec(v);
      if (!m || +m[1] < 280 || +m[1] > 2560 || +m[2] < 400 || +m[2] > 2000) return { error: '--viewport takes WIDTHxHEIGHT, for example 390x844' };
      opts.viewport = { width: +m[1], height: +m[2] };
    } else if (a === '--local-billing-port') {
      if (!/^\d{2,5}$/.test(v) || +v > 65535) return { error: '--local-billing-port takes a port number' };
      opts.localBillingPort = v;
    } else opts[a.slice(2)] = v;
  }
  return { opts };
}

const emailShape = (s) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(s);
const insideRepo = (p) => { const r = path.resolve(p); return r === REPO_ROOT || r.startsWith(REPO_ROOT + path.sep); };

/**
 * Whether the driver may start, from the arguments, the environment and the repository alone (no network):
 * { refuse } (a sentence, never a secret's value) or { refuse: null, local, base, worker, out, accounts… }.
 */
function preflight({ opts, env = {}, repo }) {
  const refuse = (why) => ({ refuse: why });
  const base = opts.base ?? repo.appOrigin, worker = opts.worker ?? repo.stagingWorker;
  let b, w;
  try { b = new URL(base); } catch { return refuse('--base is not an address'); }
  try { w = new URL(worker); } catch { return refuse('--worker is not an address'); }
  const loopback = LOOPBACK.includes(b.hostname) && ['http:', 'https:'].includes(b.protocol) && !!b.port;
  if (b.username || b.password || (b.pathname && b.pathname !== '/') || b.search || b.hash) return refuse('--base must be an origin only (no path, query, fragment or credentials)');
  if (opts.allowLocal && !loopback) return refuse('--allow-local-for-testing is accepted only with a loopback --base (http://127.0.0.1:PORT, the offline dry run): never with a preview or production');
  if (loopback && !opts.allowLocal) return refuse(`--base ${b.host} is this machine: that is the offline dry run only, with --allow-local-for-testing`);
  if (!loopback) {
    const prodApp = (() => { try { return new URL(repo.productionApp).hostname; } catch { return 'app.hushmallow.com'; } })();
    if (PRODUCTION_HOSTS.includes(b.hostname) || b.hostname === prodApp) return refuse(`--base ${b.hostname} is production: this driver never runs there (only on a branch preview, https://<one label>.hushmallow.pages.dev)`);
    if (!repo.isPreviewHost({ hostname: b.hostname, protocol: b.protocol, port: b.port })) return refuse(`--base ${b.host} is not a branch preview of the Pages project (https, no port, https://<one label>.hushmallow.pages.dev): this driver runs only against the staging preview`);
  }
  const prodWorker = new URL(repo.productionWorker).hostname;
  if (w.hostname === prodWorker || repo.angleAllowedHosts.includes(w.hostname)) return refuse(`--worker ${w.hostname} is the production Worker: this driver only ever asks the staging Worker`);
  if (w.protocol !== 'https:' || w.port || w.username || w.password || (w.pathname && w.pathname !== '/') || w.search || w.hash || !repo.stagingAllowedHosts.includes(w.hostname)) {
    return refuse(`--worker must be the staging Worker (https://${repo.stagingAllowedHosts[0]}), as an origin only`);
  }
  const key = String(env.STRIPE_E2E_KEY || '').trim();
  if (key && /^[sr]k_live_/.test(key)) return refuse('STRIPE_E2E_KEY is a live key. This driver runs in Stripe test mode only. Nothing was sent.');
  if (key && !repo.e2eKey.test(key)) return refuse('STRIPE_E2E_KEY is not a Stripe test secret or restricted key (rk_test_… or sk_test_…). Nothing was sent.');
  const A = { email: String(env.STAGING_E2E_EMAIL || '').trim(), password: String(env.STAGING_E2E_PASSWORD || '') };
  const C = { email: String(env.STAGING_E2E_C_EMAIL || '').trim(), password: String(env.STAGING_E2E_C_PASSWORD || '') };
  const signup = { email: String(env.REHEARSAL_SIGNUP_EMAIL || '').trim(), password: String(env.REHEARSAL_SIGNUP_PASSWORD || '') };
  const needA = opts.steps.some((s) => A_STEPS.includes(s));
  if (needA && (!A.email || !A.password)) return refuse(`STAGING_E2E_EMAIL and STAGING_E2E_PASSWORD (one confirmed hushmallow-staging test account) are not set: ${opts.steps.filter((s) => A_STEPS.includes(s)).join(', ')} sign in with it. Nothing was sent.`);
  if (A.email && !emailShape(A.email)) return refuse('STAGING_E2E_EMAIL is not an email address');
  if (!!C.email !== !!C.password) return refuse('STAGING_E2E_C_EMAIL and STAGING_E2E_C_PASSWORD go together (the second test account, for the declines)');
  if (C.email && !emailShape(C.email)) return refuse('STAGING_E2E_C_EMAIL is not an email address');
  if (C.email && C.email.toLowerCase() === A.email.toLowerCase()) return refuse('STAGING_E2E_C_EMAIL must be a second account, not STAGING_E2E_EMAIL');
  if (signup.email && !emailShape(signup.email)) return refuse('REHEARSAL_SIGNUP_EMAIL is not an email address');
  if (signup.email && [A.email, C.email].filter(Boolean).some((x) => x.toLowerCase() === signup.email.toLowerCase())) return refuse('REHEARSAL_SIGNUP_EMAIL must be a new address, not one of the test accounts');
  if (signup.password && signup.password.length < 8) return refuse('REHEARSAL_SIGNUP_PASSWORD must be at least 8 characters');
  if (opts.deleteAccount && !opts.steps.includes('R8')) return refuse('--delete-account goes with R8 only');
  if (opts.out && insideRepo(opts.out)) return refuse('--out must be outside the repository (screenshots never go into git)');
  return {
    refuse: null, local: loopback, base: b.origin, worker: w.origin, key: key || null, A, C: C.email ? C : null, signup: signup.email ? signup : null,
    returnsHere: !loopback && b.origin === repo.appOrigin,
  };
}

/** The browser's and the API client's proxy: the environment's HTTPS proxy for the real preview, none on this machine. */
function proxyFromEnv(env = {}, local = false) {
  if (local) return undefined;
  const server = String(env.HTTPS_PROXY || env.https_proxy || '').trim();
  if (!server) return undefined;
  const bypass = String(env.NO_PROXY || env.no_proxy || '').split(',').map((s) => s.trim()).filter(Boolean).join(',');
  return bypass ? { server, bypass } : { server };
}

/**
 * The run's printer. Every line is cleaned first: each secret of the environment (and any added at run time: the test
 * accounts' ids) becomes [redacted], and anything shaped like a token, a Stripe secret or restricted key, a signing
 * secret or an email address is masked whatever it is.
 */
function createLog({ env = {}, write = (l) => console.log(l) } = {}) {
  const secrets = new Set();
  const add = (v) => {
    const s = String(v ?? '');
    if (s.trim().length < 4) return;
    for (const x of [s, s.trim(), encodeURIComponent(s.trim()), s.trim().toLowerCase()]) if (x.length >= 4) secrets.add(x);
  };
  for (const k of SECRET_ENV) add(env[k]);
  const clean = (text) => {
    let s = String(text ?? '');
    for (const x of [...secrets].sort((a, z) => z.length - a.length)) s = s.split(x).join('[redacted]');
    return s
      .replace(/eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.?[A-Za-z0-9_-]*/g, '[token]')
      .replace(/(?<![A-Za-z]{2})[sr]k_(?:live|test)_[A-Za-z0-9]{4,}/g, '[stripe key]')
      .replace(/whsec_[A-Za-z0-9+/=]{4,}|sb_secret_[A-Za-z0-9_-]{4,}|sk-ant-[A-Za-z0-9_-]{4,}/g, '[secret]')
      .replace(/[A-Za-z0-9._%+-]+(?:@|%40)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, '[email]');
  };
  const out = (tag, step, text) => write(clean(`${tag.padEnd(5)} ${step ? `${step}  ` : ''}${text}`));
  return {
    secret: add, clean, secrets: () => [...secrets],
    pass: (step, t) => out('PASS', step, t), fail: (step, t) => out('FAIL', step, t), skip: (step, t) => out('SKIP', step, t),
    info: (t) => out('INFO', '', t), refused: (t) => out('REFUSED', '', t), raw: (t) => write(clean(t)),
  };
}

/** What /v1/health says: { reachable, refuse, ok, why, fields } (refuse: anything but Stripe test mode, or a live approval). */
function judgeHealth(status, json, expected = null) {
  if (status !== 200 || !json || typeof json !== 'object') {
    return { reachable: false, refuse: null, ok: false, why: status ? `/v1/health answered ${status}` : 'the staging Worker did not answer /v1/health', fields: null };
  }
  const b = json.billing && typeof json.billing === 'object' ? json.billing : {};
  const fields = {
    entitlement_mode: json.entitlement_mode ?? null, configured: b.configured ?? null, webhook: b.webhook ?? null, stripe_mode: b.stripe_mode ?? null,
    live_approved: b.live_approved ?? null, accounts_configured: b.accounts_configured !== false, api_version: b.api_version ?? null,
    automatic_tax: b.automatic_tax ?? null, provider_key: json.configured?.provider_key ?? null,
    ...(b.key_refused ? { key_refused: String(b.key_refused).slice(0, 40) } : {}),
    ...(b.placeholder_prices ? { placeholder_prices: b.placeholder_prices } : {}), ...(b.duplicate_prices ? { duplicate_prices: b.duplicate_prices } : {}),
  };
  if (b.stripe_mode != null && b.stripe_mode !== 'test') return { reachable: true, refuse: `the staging Worker reports stripe_mode ${String(b.stripe_mode).slice(0, 12)}: this driver runs in Stripe test mode only`, ok: false, why: '', fields };
  if (b.live_approved === true) return { reachable: true, refuse: 'the staging Worker reports live_approved true: this driver runs in Stripe test mode only', ok: false, why: '', fields };
  const problems = [];
  if (json.ok !== true) problems.push('ok is not true');
  if (json.entitlement_mode !== 'billing+testing') problems.push(`entitlement_mode ${json.entitlement_mode}`);
  if (b.configured !== true) problems.push('billing not configured');
  if (b.webhook !== true) problems.push('no webhook signing secret');
  if (b.stripe_mode !== 'test') problems.push('no Stripe test key');
  if (b.live_approved !== false) problems.push('live_approved is not false');
  if (b.accounts_configured === false) problems.push('accounts_configured false');
  if (b.key_refused) problems.push(`key_refused ${fields.key_refused}`);
  if (b.placeholder_prices) problems.push('placeholder_prices');
  if (b.duplicate_prices) problems.push('duplicate_prices');
  if (expected && b.api_version !== expected.api_version) problems.push(`api_version ${b.api_version} (wrangler.toml: ${expected.api_version})`);
  if (expected && b.automatic_tax !== expected.automatic_tax) problems.push(`automatic_tax ${b.automatic_tax} (wrangler.toml: ${expected.automatic_tax})`);
  return { reachable: true, refuse: null, ok: !problems.length, why: problems.join(', '), fields };
}

/** public-config.js (tools/build-site.sh writes it) → its object, or null. */
function parsePublicConfig(text) {
  const m = /export default Object\.freeze\((\{[\s\S]*?\})\);?/.exec(String(text || ''));
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

/**
 * The preview's sign-in: the published file and what the page resolved. Online only the staging project; locally only
 * the fake on this machine. Production's project anywhere is a refusal.
 */
function judgeAuthConfig({ published, resolved, local, repo }) {
  const urls = [published?.url, resolved?.url].map((u) => String(u || ''));
  if (urls.some((u) => u.includes(repo.productionRef)) || resolved?.ref === repo.productionRef) {
    return { refuse: `the preview's sign-in is the production project hushmallow1 (${repo.productionRef}): nothing was signed in`, ok: false, why: '' };
  }
  if (local) {
    const loop = (u) => /^https?:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(String(u || '').replace(/\/+$/, ''));
    const ok = published?.enabled === true && loop(published.url) && resolved?.enabled === true && resolved.dev === true && loop(resolved.url);
    return { refuse: null, ok, why: ok ? '' : `the local build's sign-in is not the fake on this machine (published ${published?.enabled ? 'on' : 'off'}, page ${resolved?.enabled ? 'on' : 'off'})` };
  }
  const ok = published?.enabled === true && published.url === repo.stagingUrl && resolved?.enabled === true && resolved.ref === repo.stagingRef && resolved.url === repo.stagingUrl;
  let why = '';
  if (!ok) why = !published ? 'the preview has no readable public-config.js' : published.enabled !== true ? 'the preview was built without sign-in (A5: the Preview variables)' : resolved?.enabled !== true ? `the page switched sign-in off (${resolved?.reason || 'refused'})` : `the preview's sign-in is not the staging project ${repo.stagingRef}`;
  return { refuse: null, ok, why };
}

/** A Checkout address: { ok, live, id, why }. Only Stripe's Checkout hosts, https, and a cs_test_ session. */
function checkoutVerdict(href) {
  let u;
  try { u = new URL(String(href)); } catch { return { ok: false, live: false, id: null, why: 'Checkout did not open (no address)' }; }
  const m = /(?:^|\/)(cs_(test|live)_[A-Za-z0-9]{10,250})(?:$|[/?#])/.exec(u.pathname);
  const id = m ? m[1] : null, live = !!m && m[2] === 'live';
  if (u.protocol !== 'https:' || !CHECKOUT_HOSTS.includes(u.hostname) || u.port || u.username || u.password) return { ok: false, live, id, why: `Checkout opened on ${u.host || 'nothing'}, not checkout.stripe.com or checkout.hushmallow.com` };
  if (live) return { ok: false, live: true, id, why: 'a LIVE Checkout Session (cs_live_…)' };
  if (!id) return { ok: false, live: false, id: null, why: 'no cs_test_ Checkout Session in the address' };
  return { ok: true, live: false, id, host: u.hostname, why: '' };
}

/** A customer-portal address: { ok, live, test, why } (test: the session's address says test mode; null: it cannot tell). */
function portalVerdict(href) {
  let u;
  try { u = new URL(String(href)); } catch { return { ok: false, live: false, test: null, why: 'the portal did not open (no address)' }; }
  if (u.protocol !== 'https:' || !PORTAL_HOSTS.includes(u.hostname) || u.port || u.username || u.password) return { ok: false, live: false, test: null, why: `the portal opened on ${u.host || 'nothing'}, not billing.stripe.com` };
  const live = /\/p\/session\/live_/.test(u.pathname), test = /\/p\/session\/test_/.test(u.pathname) ? true : live ? false : null;
  if (live) return { ok: false, live: true, test: false, why: 'a LIVE portal session' };
  return { ok: true, live: false, test, why: '' };
}

/** Any object (at any depth) with livemode true. */
function hasLive(v, depth = 0) {
  if (!v || typeof v !== 'object' || depth > 12) return false;
  if (v.livemode === true) return true;
  return (Array.isArray(v) ? v : Object.values(v)).some((x) => hasLive(x, depth + 1));
}

const TERMINAL = Object.freeze(['canceled', 'incomplete_expired']);
/** From a Stripe list of subscriptions: the ids this run may cancel (test mode, created since `sinceSec`, still running). */
function subsToCancel(list, sinceSec) {
  if (hasLive(list)) throw new LiveStop('a subscription with livemode true was listed');
  return (Array.isArray(list) ? list : []).filter((s) => s && s.object === 'subscription' && typeof s.id === 'string' && /^sub_[A-Za-z0-9]{4,250}$/.test(s.id)
    && s.livemode === false && Number(s.created) >= sinceSec && !TERMINAL.includes(s.status)).map((s) => s.id);
}
/** A Stripe id from a field that may be expanded. */
const idOf = (v) => (typeof v === 'string' ? v : v && typeof v.id === 'string' ? v.id : null);
/** A path with its object ids taken out, for a message. */
const bare = (p) => String(p).split('?')[0].replace(/\b[a-z]{2,8}_[A-Za-z0-9_]{6,}/g, '…');

// ------------------------------------------------------------------------------------------------ the browser parts --

/** Installed in every page of the base host before its own scripts: the toasts and Mallow lines seen, and the load. */
function recorder(host) {
  if (location.host !== host) return;
  const rh = { toasts: [], said: [], loadedAt: `${Date.now()}-${Math.random()}` };
  window.__rh = rh;
  const seen = new WeakSet();
  const n = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const scan = () => {
    for (const t of document.querySelectorAll('body > .toast')) if (!seen.has(t) && n(t.textContent)) { seen.add(t); rh.toasts.push({ t: n(t.textContent), at: Date.now() }); }
    for (const e of document.querySelectorAll('.hf-subs .hf-sub .text, .hf-sublive .hf-sub .text')) {
      const t = n(e.textContent);
      if (t && !rh.said.slice(-6).includes(t)) rh.said.push(t);
    }
  };
  new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true });
}

async function until(fn, timeout, every = 250) {
  const end = Date.now() + timeout;
  for (;;) {
    let v;
    try { v = await fn(); } catch { v = undefined; }
    if (v) return v;
    if (Date.now() >= end) return null;
    await sleep(every);
  }
}
const rx = (re) => (re ? { source: re.source, flags: re.flags } : null);

/** The centre of the first visible element matching selector (and text), scrolled into view, or null. */
function findRect(page, selector, text, scroll) {
  return page.evaluate(({ selector, text, scroll }) => {
    const re = text ? new RegExp(text.source, text.flags) : null;
    const vis = (e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden], [inert]') && !e.disabled;
    };
    const el = [...document.querySelectorAll(selector)].find((e) => vis(e) && (!re || re.test((e.textContent || '').replace(/\s+/g, ' ').trim())));
    if (!el) return null;
    if (scroll) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
  }, { selector, text: rx(text), scroll });
}

/** A real touch on the app's element (selector, optionally its text), once it is visible and has stopped moving. */
async function tapEl(page, selector, { text = null, timeout = 30000 } = {}) {
  const at = await until(async () => {
    const a = await findRect(page, selector, text, true);
    if (!a) return null;
    await sleep(220);
    const b = await findRect(page, selector, text, false);
    return b && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 ? b : null;
  }, timeout, 200);
  if (!at) throw new Fail(`nothing to tap: ${selector}${text ? ` "${text.source}"` : ''}`);
  await page.touchscreen.tap(at.x, at.y);
}

async function waitApp(page, timeout = 90000) {
  const ok = await until(() => page.evaluate(() => !!(window.__hush && window.__hush.auth && window.__hush.ent && document.querySelector('#scene > *'))), timeout, 300);
  need(ok, 'the app did not start within 90 s');
}

/** The account scene's screen once it shows (one of views, or any): its name, or null. */
function waitView(page, views, timeout = 30000) {
  return until(() => page.evaluate((views) => {
    const el = document.querySelector('.hm-account[data-auth-view]');
    if (!el || el.style.visibility === 'hidden') return null;
    const v = el.dataset.authView;
    if (!v || v === 'loading') return null;
    return !views || views.includes(v) ? v : null;
  }, views || null), timeout);
}

const visibleNow = (page, selector) => page.locator(selector).first().isVisible().catch(() => false);

async function openSettings(page) {
  if (await visibleNow(page, '.settings h1')) return 'already';
  let via = null;
  const home = await page.evaluate(() => location.hash === '#home' && !!document.querySelector('.hf-top button[aria-label="Settings"]')).catch(() => false);
  if (home) {
    try { await tapEl(page, '.hf-top button[aria-label="Settings"]', { timeout: 10000 }); via = 'the Hushfold’s gear'; } catch { via = null; }
  }
  if (!via || !(await until(() => visibleNow(page, '.settings h1'), 8000))) { await page.evaluate(() => window.__hush.go('settings')); via = 'the app’s router'; }
  need(await until(() => visibleNow(page, '.settings h1'), 20000), 'Settings did not open');
  return via;
}

async function openPlans(page) {
  await openSettings(page);
  await tapEl(page, '.settings button', { text: /^View plans$/ });
  need(await until(() => visibleNow(page, '.plans .invites'), 20000), 'the plans page did not open from Settings → View plans');
}

/** Settings → Privacy → the account row → the account screen. Resolves its first screen. */
async function openAccountScreen(page) {
  await openSettings(page);
  // a guest's row shows once the project has said it is ready for sign-in (src/auth/readiness.js)
  await tapEl(page, '[data-act="account-row"]', { timeout: 45000 });
  const v = await waitView(page, null, 30000);
  need(v, 'the account screen did not open from Settings → Privacy');
  return v;
}

async function goHome(page) {
  await page.evaluate(() => window.__hush.go('home')).catch(() => {});
  await until(() => page.evaluate(() => location.hash === '#home' && !!document.querySelector('.hf-top')), 20000);
}

const loadStamp = (page) => page.evaluate(() => window.__rh?.loadedAt || null).catch(() => null);

/** The Plan row of Settings: { name, note, manage }. */
function planRow(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('.settings .setting button')].find((b) => b.textContent.trim() === 'View plans');
    const g = btn?.closest('.setting')?.querySelector('.grow');
    const name = g ? [...g.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim() : null;
    return { name, note: (g?.querySelector('small')?.textContent || '').trim(), manage: !!document.querySelector('.settings [data-act="manage-subscription"]') };
  });
}

/** The plan as the billing server says it now (a forced check, read-only), then the tier this page holds. */
const refreshTier = (page) => page.evaluate(async () => { try { await window.__hush.ent.refresh({ force: true }); } catch { /* the kept answer */ } return window.__hush.ent.tier(); });

/** This page's own version folder (/v/<version>/), from the script that started it. */
const pageVersion = (page) => page.evaluate(() => {
  const s = [...document.scripts].map((x) => x.src).find((x) => /\/v\/[^/]+\/src\/app\/main\.js/.test(x));
  return s ? /\/v\/([^/]+)\//.exec(s)[1] : null;
});

/** A toast with exactly this text since `since`. */
const toastSince = (page, text, since, timeout) => until(() => page.evaluate(({ text, since }) => (window.__rh?.toasts || []).some((x) => x.t === text && x.at >= since), { text, since }), timeout);

// ------------------------------------------------------------------------------------------------ the run --

async function main(argv = process.argv.slice(2), env = process.env, { write = (l) => console.log(l) } = {}) {
  const parsed = parseArgs(argv);
  const log = createLog({ env, write });
  if (parsed.error) { log.refused(parsed.error); return 2; }
  if (parsed.opts.help) { write(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 12).map((l) => l.slice(3)).join('\n')); return 0; }
  const opts = parsed.opts;
  let repo;
  try { repo = await loadRepo(); } catch (e) { log.refused(`the repository's own values could not be read: ${String(e?.message || e).split('\n')[0]}`); return 2; }
  const pre = preflight({ opts, env, repo });
  if (pre.refuse) { log.refused(pre.refuse); return 2; }

  const runId = `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}-${crypto.randomBytes(3).toString('hex')}`;
  const out = path.resolve(opts.out || path.join(os.tmpdir(), `hushmallow-rehearsal-${runId}`));
  const baseHost = new URL(pre.base).host, workerHost = new URL(pre.worker).host;
  const X = {
    opts, repo, pre, log, out, baseHost, workerHost, local: pre.local, base: pre.base, worker: pre.worker,
    startMs: Date.now(), sessions: [], uids: {}, live: false, stopped: null, page: null,
    workerUp: false, billingReady: false, signInReady: false, beyondA: false, ctxA: null, pageA: null, shots: 0,
  };
  const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
  let interrupted = false;
  process.once('SIGINT', () => { interrupted = true; log.info('stopping after this step: the teardown still runs'); });
  write(log.clean(`hushmallow staging rehearsal ${runId}: ${pre.local ? 'LOCAL TEST MODE, ' : ''}${pre.base} · Worker ${pre.local ? '(not contacted)' : pre.worker} · steps ${opts.steps.join(',')} · ${opts.viewport.width}x${opts.viewport.height}`));

  let pw;
  try { pw = createRequire('/opt/node-tools/node_modules/')('playwright'); } catch (e) { log.refused(`Playwright did not load from /opt/node-tools/node_modules (${String(e?.message || e).split('\n')[0]})`); return 2; }
  const proxy = proxyFromEnv(env, pre.local);
  // Chromium's profile goes in the temporary directory, and a long path there (a deep scratch folder) is too long for
  // its sockets: the browser alone then uses /tmp (the screenshots' folder was chosen above)
  if (os.tmpdir().length > 60 && fs.existsSync('/tmp')) process.env.TMPDIR = '/tmp';
  let browser = null, http = null, refused = false;
  // the outer `timeout` ends the run with SIGTERM: this run's subscriptions are cancelled first
  process.once('SIGTERM', () => {
    log.info('terminated: the teardown runs, then the driver exits');
    const done = () => process.exit(X.live ? 3 : 1);
    Promise.race([refused || !http ? Promise.resolve() : teardown(X).catch(() => {}), sleep(90000)]).then(done, done);
  });
  try {
    browser = await pw.chromium.launch({ ...(fs.existsSync(CHROMIUM) ? { executablePath: CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'], ...(proxy ? { proxy } : {}) });
    http = await pw.request.newContext({ ...(proxy ? { proxy } : {}), timeout: 30000 });
    X.browser = browser; X.http = http;
    X.newContext = (extra = {}) => newContext(X, extra);
    X.stripe = pre.key && !pre.local ? stripeApi(http, pre.key, repo.apiVersion) : null;
    X.shot = (page, name) => shot(X, page, name);

    // R0: always first; a refusal here ends the run before anything is signed in or paid
    const r0 = await runStep(X, 'R0', () => stepR0(X), counts);
    if (r0 === 'refused') { refused = true; return 2; }
    for (const id of opts.steps.filter((s) => s !== 'R0')) {
      if (interrupted && !X.stopped) X.stopped = 'interrupted (Ctrl-C)';
      if (X.stopped) { log.skip(id, `not run: ${X.stopped}`); counts.SKIP++; continue; }
      const why = gate(X, id);
      if (why) { log.skip(id, why); counts.SKIP++; continue; }
      await runStep(X, id, () => STEP_FNS[id](X), counts);
    }
  } catch (e) {
    if (e instanceof LiveStop) { X.live = true; log.fail('', `STOPPED: ${e.message}`); } else { log.fail('', `the driver stopped: ${String(e?.message || e).split('\n')[0]}`); counts.FAIL++; }
  } finally {
    try { if (http && !refused) await teardown(X); } catch (e) { if (e instanceof LiveStop) { X.live = true; log.fail('teardown', `STOPPED: ${e.message}`); } else { log.fail('teardown', String(e?.message || e).split('\n')[0]); counts.FAIL++; } }
    if (browser) await browser.close().catch(() => {});
    if (http) await http.dispose().catch(() => {});
  }
  write(log.clean(`\n${counts.PASS} passed, ${counts.FAIL} failed, ${counts.SKIP} skipped${X.shots ? ` · ${X.shots} screenshot(s) of failures in ${out}` : ''}`));
  write('Still by hand (docs/STAGING.md): the email links (confirm, reset), S10 tax, S13 the custom domain, S14 the Worker log search.');
  return X.live ? 3 : counts.FAIL ? 1 : 0;
}

/** Why a step cannot run now (a SKIP line), or null. */
function gate(X, id) {
  if (X.local && ONLINE_ONLY.includes(id)) return 'local test mode: Stripe and the real model are never contacted from here, and their results are never faked';
  if (A_STEPS.includes(id) && !X.signInReady) return 'R0: the preview has no working staging sign-in';
  if (A_STEPS.includes(id) && X.aFailed) return `E2E-A could not sign in earlier (${X.aFailed})`;
  if (STRIPE_STEPS.includes(id)) {
    if (!X.billingReady) return 'R0: billing on the staging Worker is not ready (or its test mode could not be confirmed)';
    if (!X.pre.returnsHere) return `Stripe sends people back to the staging Worker's APP_ORIGIN (${X.repo.appOrigin}), not to ${X.base}`;
  }
  if (id === 'R4' && !X.pre.C) return 'STAGING_E2E_C_EMAIL / STAGING_E2E_C_PASSWORD (E2E-C) are not set';
  if (id === 'R4' && !X.signInReady) return 'R0: the preview has no working staging sign-in';
  if (id === 'R5' && !X.workerUp) return 'R0: the staging Worker did not answer';
  return null;
}

async function runStep(X, id, fn, counts) {
  X.page = null; X.stepId = id; X.shotTaken = false;
  let timer;
  try {
    const r = await Promise.race([fn(), new Promise((_, rej) => { timer = setTimeout(() => rej(Object.assign(new Fail(`took longer than ${BUDGET[id] / 1000} s`), { timeout: true })), BUDGET[id]); })]);
    if (r?.refuse) { X.log.refused(`${id}: ${r.refuse}`); return 'refused'; }
    if (r?.status === 'SKIP') { X.log.skip(id, r.reason); counts.SKIP++; return 'SKIP'; }
    if (r?.status === 'FAIL') { X.log.fail(id, r.reason); counts.FAIL++; if (X.page && !X.shotTaken) await X.shot(X.page, id); return 'FAIL'; }
    X.log.pass(id, r?.reason || ''); counts.PASS++;
    return 'PASS';
  } catch (e) {
    if (e instanceof LiveStop) { X.live = true; X.stopped = 'a live-mode object was read'; X.log.fail(id, `STOPPED AT ONCE: ${e.message}`); counts.FAIL++; return 'FAIL'; }
    const msg = String(e?.message || e).split('\n')[0];
    X.log.fail(id, msg); counts.FAIL++;
    if (X.page && !X.shotTaken) await X.shot(X.page, id);
    // a step out of time may still be acting on its page: that page goes, so it can never touch the next step's
    if (e?.timeout && X.page) { const gone = X.page; if (gone === X.pageA) X.pageA = null; await gone.close().catch(() => {}); }
    if (e?.stop) X.stopped = `stopped after ${id}`;
    return 'FAIL';
  } finally { clearTimeout(timer); }
}

async function newContext(X, extra = {}) {
  const { width, height } = X.opts.viewport;
  const ctx = await X.browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: width < 900, ...extra });
  await ctx.addInitScript(recorder, X.baseHost);
  // the Worker's answers this browser received (paths and statuses; the bodies of the few the steps read)
  const net = [], reqs = [];
  ctx.on('request', (q) => { try { const u = new URL(q.url()); if (u.host === X.workerHost || (X.local && u.port === X.opts.localBillingPort)) reqs.push({ m: q.method(), p: u.pathname, host: u.host, at: Date.now() }); } catch { /* not ours */ } });
  ctx.on('response', async (r) => {
    try {
      const u = new URL(r.url());
      if (u.host !== X.workerHost) return;
      const rec = { m: r.request().method(), p: u.pathname, s: r.status(), at: Date.now(), json: null };
      // a record is complete when it is listed: the few bodies the steps read come first
      if (/^\/v1\/(angle|billing\/checkout|billing\/portal)$/.test(u.pathname)) rec.json = await r.json().catch(() => null);
      net.push(rec);
    } catch { /* a page gone */ }
  });
  ctx.__net = net; ctx.__reqs = reqs;
  return ctx;
}

/** A browser of its own for fn(ctx); a failure inside is screenshotted before it closes. */
async function inContext(X, fn) {
  const ctx = await X.newContext();
  try { return await fn(ctx); } catch (e) {
    if (!(e instanceof LiveStop) && X.page && !X.page.isClosed()) { await X.shot(X.page, X.stepId || 'step'); X.shotTaken = true; }
    throw e;
  } finally { await ctx.close().catch(() => {}); }
}

async function shot(X, page, name) {
  try {
    if (!page || page.isClosed()) return;
    fs.mkdirSync(X.out, { recursive: true });
    const mask = [page.locator('input'), page.locator('textarea'), page.locator('[data-email]'), page.locator('.hm-account-strong'), page.locator('.hm-auth-lede strong'),
      ...X.log.secrets().filter((s) => s.length >= 4 && !/%/.test(s)).map((s) => page.getByText(s, { exact: false }))];
    const file = path.join(X.out, `FAILED-${name}-${++X.shots}.png`);
    await page.screenshot({ path: file, mask, timeout: 15000 });
  } catch { /* no screenshot: the line says what failed */ }
}

async function httpGet(X, url, headers = {}) {
  try {
    const r = await X.http.get(url, { headers, timeout: 20000, failOnStatusCode: false });
    const text = await r.text().catch(() => '');
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: r.status(), text, json };
  } catch { return { status: 0, text: '', json: null }; }
}

/** Stripe's API with the driver's test key (read-only checks, and cancelling this run's own subscriptions). */
function stripeApi(http, key, version) {
  async function call(method, p, params) {
    let url = `https://api.stripe.com${p}`;
    if (params) url += `?${new URLSearchParams(params)}`;
    let r;
    try { r = await http.fetch(url, { method, headers: { authorization: `Bearer ${key}`, 'stripe-version': version }, timeout: 30000, failOnStatusCode: false }); } catch { return { ok: false, status: 0, data: null, code: 'network' }; }
    let data = null;
    try { data = await r.json(); } catch { data = null; }
    if (hasLive(data)) throw new LiveStop(`a Stripe object read from ${method} ${bare(p)} has livemode true`);
    const ok = r.ok() && !!data && typeof data === 'object';
    return { ok, status: r.status(), data: ok ? data : null, code: ok ? '' : String(data?.error?.code || data?.error?.type || `http_${r.status()}`).replace(/[^a-z0-9_]/gi, '').slice(0, 40) };
  }
  return { get: (p, q) => call('GET', p, q), del: (p) => call('DELETE', p) };
}

// ----------------------------------------------------------------------------------------------------- R0 --
async function stepR0(X) {
  const { repo, log } = X;
  const said = [], problems = [];
  if (X.local) said.push('local test mode: the staging Worker is not contacted');
  else {
    const h = await httpGet(X, `${X.worker}/v1/health`, { origin: X.base });
    const j = judgeHealth(h.status, h.json, repo.expectedFlags);
    if (j.refuse) return { refuse: j.refuse };
    X.workerUp = j.reachable;
    X.billingReady = j.reachable && j.ok;
    if (!j.reachable) problems.push(j.why);
    else if (!j.ok) problems.push(`/v1/health: ${j.why}`);
    if (j.fields) said.push(`/v1/health ${JSON.stringify(j.fields)}`);
  }
  // what the preview published, and what its page made of it
  const v = await httpGet(X, `${X.base}/version.json`);
  const ver = v.json?.v && /^[0-9a-zA-Z_-]+$/.test(v.json.v) ? v.json.v : null;
  const pub = ver ? parsePublicConfig((await httpGet(X, `${X.base}/v/${ver}/src/auth/public-config.js`)).text) : null;
  const refused = await inContext(X, async (ctx) => {
    const page = await ctx.newPage();
    X.page = page;
    await page.goto(`${X.base}/`, { timeout: 90000 });
    await waitApp(page);
    const resolved = await page.evaluate(() => { const c = window.__hush.auth.config || {}; return { enabled: !!c.enabled, url: c.url || null, ref: c.ref || null, dev: !!c.dev, reason: c.reason || null }; });
    const a = judgeAuthConfig({ published: pub, resolved, local: X.local, repo });
    if (a.refuse) return a.refuse;
    X.signInReady = a.ok;
    if (!a.ok) problems.push(a.why);
    else said.push(X.local ? 'sign-in: the local fake (a dev build, loopback only)' : `sign-in: the staging project ${repo.stagingRef}, never ${repo.productionRef}`);
    await openSettings(page);
    const line = norm(await page.locator('.settings [data-version]').first().innerText({ timeout: 10000 }).catch(() => ''));
    const staging = /·\s*staging\b/.test(line);
    if (X.local ? staging : !staging) problems.push(`Settings' version line is "${line}"${X.local ? ' (this machine is not a preview: no "staging")' : ', without "staging"'}`);
    else said.push(`version line "${line}"`);
    if (problems.length) { await X.shot(page, 'R0'); X.shotTaken = true; }
    return null;
  });
  if (refused) return { refuse: refused };
  if (!X.local && !X.pre.key) log.info('no STRIPE_E2E_KEY: the customer check in R3 and the teardown are by hand');
  return problems.length ? { status: 'FAIL', reason: `${problems.join('; ')}${said.length ? ` (${said.join('; ')})` : ''}` } : { reason: said.join('; ') };
}

// ----------------------------------------------------------------------------------------------------- R1 --
async function stepR1(X) {
  const { repo } = X;
  const P = repo.billingPrices;
  return inContext(X, async (ctx) => {
    const page = await ctx.newPage();
    X.page = page;
    // locally web billing is switched on with the app's own ?billingDev= (a port nothing listens on: a guest sends nothing)
    await page.goto(X.local ? `${X.base}/?billingDev=${X.opts.localBillingPort}` : `${X.base}/`, { timeout: 90000 });
    await waitApp(page);
    await sleep(3000);
    const home = await page.evaluate(() => ({ hash: location.hash, account: !!document.querySelector('[data-auth-view]'), status: window.__hush.auth.status(), web: !!window.__hush.ent.isWeb }));
    need(home.hash === '#home' && !home.account && home.status === 'guest', `the home screen did not open as a guest with nothing asking to sign in (${JSON.stringify(home)})`);
    need(home.web, 'web subscriptions are off on this page (sign-in off, or not a preview): no prices to check');
    await openPlans(page);
    const prices = () => until(() => page.evaluate(() => {
      const t = (s) => (document.querySelector(s)?.hidden ? '' : (document.querySelector(s)?.textContent || '').trim());
      const v = { paid: t('.invite-flow .invite-price'), ultra: t('.invite-beyond .invite-price') };
      return v.paid && v.ultra ? v : null;
    }), 15000);
    const m = await prices();
    const wantM = { paid: `${P['hushmallow.paid.monthly']} a month`, ultra: `${P['hushmallow.ultra.monthly']} a month` };
    need(m && m.paid === wantM.paid && m.ultra === wantM.ultra, `Plans, monthly: ${JSON.stringify(m)} (want ${JSON.stringify(wantM)})`);
    await tapEl(page, '.seg .seg-opt', { text: /^Yearly$/ });
    const wantY = { paid: `${P['hushmallow.paid.yearly']} a year`, ultra: `${P['hushmallow.ultra.yearly']} a year` };
    const y = await until(async () => { const v = await prices(); return v && v.paid === wantY.paid && v.ultra === wantY.ultra ? v : null; }, 8000);
    need(y, `Plans, yearly: want ${JSON.stringify(wantY)}`);
    await tapEl(page, '.seg .seg-opt', { text: /^Monthly$/ });
    const t0 = Date.now();
    await tapEl(page, '.invite-beyond .invite-buy');
    const view = await waitView(page, ['welcome', 'signin', 'create'], 30000);
    need(view, '"Step into hushmallow Beyond" did not open the account screen');
    need(await toastSince(page, repo.signInFirst, t0, 10000), `the account screen opened (${view}) without "${repo.signInFirst}"`);
    if (X.local) need(!ctx.__reqs.length, `a guest sent ${ctx.__reqs.length} request(s) to the billing server`);
    return { reason: `home as a guest, nothing asks to sign in; Plans: ${m.paid} / ${m.ultra}, yearly ${y.paid} / ${y.ultra}; "Step into ${repo.plans.ultra}" → the account screen (${view}): "${repo.signInFirst}"${X.local ? ' (web billing on through ?billingDev; the guest sent nothing)' : ''}` };
  });
}

// ----------------------------------------------------------------------------------------------------- R2 --
/** Sign in through the account screen (the real form, by password). → { ok, why, arrived, choice }. */
async function signIn(X, page, who) {
  let v = await openAccountScreen(page);
  if (v === 'account') return { ok: true, already: true };
  if (v === 'off') return { ok: false, why: 'the account screen says this version doesn’t use accounts (sign-in off, or the project not ready)' };
  if (v !== 'signin') { await tapEl(page, '[data-act="signin"]'); v = await waitView(page, ['signin'], 20000); }
  need(v === 'signin', 'the sign-in screen did not open');
  await page.locator('[data-auth-view="signin"] input[name="email"]').fill(who.email);
  await page.locator('[data-auth-view="signin"] input[name="password"]').fill(who.password);
  const before = await loadStamp(page);
  await tapEl(page, '[data-act="signin-submit"]');
  const r = await until(async () => {
    const st = await page.evaluate(() => ({ stamp: window.__rh?.loadedAt || null, view: document.querySelector('.hm-account[data-auth-view]')?.dataset.authView || null, err: (document.querySelector('[data-auth-view="signin"] .hm-auth-error')?.textContent || '').trim() }));
    if (st.stamp && st.stamp !== before) return { kind: 'reload' };
    if (st.view === 'guest-choice') return { kind: 'choice' };
    if (st.err) return { kind: 'error', err: st.err };
    return null;
  }, 60000, 300);
  if (!r) return { ok: false, why: 'signing in did not finish within 60 s' };
  if (r.kind === 'error') return { ok: false, why: `the sign-in screen said: "${r.err}"` };
  let choice = false;
  let view = r.kind === 'choice' ? 'guest-choice' : (await waitApp(page), await waitView(page, ['account', 'guest-choice'], 60000));
  if (view === 'guest-choice') {
    // a first sign-in here with a guest's things on this browser: "Not now" (the account starts clean)
    choice = true;
    const b2 = await loadStamp(page);
    await tapEl(page, '[data-act="fresh"]');
    await until(async () => (await loadStamp(page)) !== b2, 30000);
    await waitApp(page);
    view = await waitView(page, ['account'], 60000);
  }
  if (view !== 'account') return { ok: false, why: `after signing in the account screen showed ${view || 'nothing'}` };
  const user = await page.evaluate(() => ({ status: window.__hush.auth.status(), id: window.__hush.auth.user()?.id || null }));
  if (user.status !== 'signed-in' || !user.id) return { ok: false, why: `signed in, but the app says ${user.status}` };
  X.log.secret(user.id);
  return { ok: true, uid: user.id, choice };
}

/** E2E-A's browser, signed in (the same one for R2 to R8): its page. */
async function ensureA(X, { announce = true } = {}) {
  if (X.pageA && !X.pageA.isClosed()) {
    const st = await X.pageA.evaluate(() => window.__hush?.auth?.status?.()).catch(() => null);
    if (st === 'signed-in') { X.page = X.pageA; return X.pageA; }
  }
  if (!X.ctxA) X.ctxA = await X.newContext();
  const page = X.pageA && !X.pageA.isClosed() ? X.pageA : await X.ctxA.newPage();
  X.pageA = page; X.page = page;
  await page.goto(`${X.base}/`, { timeout: 90000 });
  await waitApp(page);
  const r = await signIn(X, page, X.pre.A);
  if (!r.ok) X.aFailed = r.why;   // the later steps of E2E-A are skipped: never one failed sign-in after another
  need(r.ok, `E2E-A could not sign in: ${r.why}`);
  if (r.uid) X.uids.A = r.uid;
  if (announce) X.log.info('E2E-A signed in through the account screen (for the steps after R2)');
  return page;
}

async function stepR2(X) {
  const said = [];
  if (!X.ctxA) X.ctxA = await X.newContext();
  const page = await X.ctxA.newPage();
  X.pageA = page; X.page = page;
  await page.goto(`${X.base}/`, { timeout: 90000 });
  await waitApp(page);
  const r = await signIn(X, page, X.pre.A);
  if (!r.ok) X.aFailed = r.why;
  need(r.ok, `E2E-A: ${r.why}`);
  X.uids.A = r.uid;
  said.push(`signed in through the account screen by password${r.choice ? ' ("Not now" to this browser’s guest things)' : ''}`);
  await openSettings(page);
  const row = await until(() => page.evaluate(() => {
    const b = document.querySelector('.settings [data-act="account-row"]');
    const g = b?.closest('.setting')?.querySelector('.grow');
    if (!g) return null;
    return { label: [...g.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(), sub: (g.querySelector('small')?.textContent || '').trim(), button: b.textContent.trim() };
  }), 20000);
  need(row && row.label === 'Your account' && /^Signed in as /.test(row.sub) && row.button === 'Manage', `Settings → Privacy: the account row is ${row ? `"${row.label}" / "${row.button}"` : 'not there'}`);
  said.push('Settings → Privacy: "Your account · Signed in as …" with Manage');
  if (X.pre.signup) {
    await inContext(X, async (ctx) => {
      const p = await ctx.newPage();
      X.page = p;
      await p.goto(`${X.base}/`, { timeout: 90000 });
      await waitApp(p);
      let v = await openAccountScreen(p);
      if (v !== 'create') { await tapEl(p, '[data-act="create"]'); v = await waitView(p, ['create'], 20000); }
      need(v === 'create', 'sign-up: the Create your account screen did not open');
      const pw = X.pre.signup.password || `${crypto.randomBytes(12).toString('base64url')}-Hm7`;
      X.log.secret(pw);
      await p.locator('[data-auth-view="create"] input[name="email"]').fill(X.pre.signup.email);
      await p.locator('[data-auth-view="create"] input[name="password"]').fill(pw);
      const off = await p.evaluate(() => document.querySelector('[data-act="create-submit"]')?.disabled === true);
      need(off, 'sign-up: Create my account was on before the 18+ tick');
      await tapEl(p, '[data-auth-view="create"] input[name="agree"]');
      need(await until(() => p.evaluate(() => document.querySelector('[data-auth-view="create"] input[name="agree"]')?.checked === true && !document.querySelector('[data-act="create-submit"]').disabled), 5000), 'sign-up: the 18+ tick did not tick');
      await tapEl(p, '[data-act="create-submit"]');
      const done = await until(() => p.evaluate(() => {
        const v = document.querySelector('.hm-account[data-auth-view]')?.dataset.authView;
        if (v === 'check-email') return { ok: /We’ve sent a link to/.test(document.querySelector('.hm-auth-lede')?.textContent || '') };
        const err = (document.querySelector('[data-auth-view="create"] .hm-auth-error')?.textContent || '').trim();
        return err ? { err } : null;
      }), 45000);
      need(done?.ok, `sign-up: ${done?.err ? `the screen said "${done.err}"` : 'no "Check your email" within 45 s'}`);
      said.push(`sign-up in a fresh browser (the 18+ tick first): "Check your email" (the link is the owner's to click${X.pre.signup.password ? '' : '; the password was made up and not kept: use Forgot your password'})`);
    });
  } else said.push('sign-up not run (REHEARSAL_SIGNUP_EMAIL not set)');
  X.page = page;
  return { reason: said.join('; ') };
}

// ----------------------------------------------------------------------------------------------------- Stripe pages --
const visible = (loc) => loc.first().isVisible().catch(() => false);

/** Checkout as it first shows: { text, phone, promo, testBadge }. */
async function readCheckout(page) {
  await page.locator('#cardNumber, [data-testid="card-accordion-item-button"], .SubmitButton, [data-testid="hosted-payment-submit-button"]').first().waitFor({ state: 'visible', timeout: 60000 });
  await sleep(1500);
  const text = norm(await page.locator('body').innerText({ timeout: 15000 }).catch(() => ''));
  const phone = (await page.locator('#phoneNumber:visible, input[type="tel"]:visible, input[autocomplete="tel"]:visible').count().catch(() => 0)) > 0;
  const promo = (await page.locator('#promotionCode:visible, [data-testid="promotion-code-input"]:visible').count().catch(() => 0)) > 0 || /add promotion code|promotion code/i.test(text);
  return { text, phone, promo, testBadge: /test mode|sandbox/i.test(text) };
}

/** Fills Checkout's card form with one test card and submits it. */
async function payCard(page, number, { email }) {
  const em = page.locator('input#email');
  if (await visible(em) && !(await em.inputValue().catch(() => ''))) await em.fill(email);
  const card = page.locator('[data-testid="card-accordion-item-button"], #payment-method-accordion-item-title-card').first();
  if (await visible(card)) await card.click().catch(() => {});
  const num = page.locator('#cardNumber');
  await num.waitFor({ state: 'visible', timeout: 30000 });
  const digits = number.replace(/\D/g, '');
  await num.fill(number);
  if ((await num.inputValue().catch(() => '')).replace(/\D/g, '') !== digits) { await num.fill(''); await num.pressSequentially(digits, { delay: 40 }); }
  const yy = String((new Date().getFullYear() + 3) % 100).padStart(2, '0');
  await page.locator('#cardExpiry').fill(`12 / ${yy}`);
  await page.locator('#cardCvc').fill('123');
  const name = page.locator('#billingName');
  if (await visible(name) && !(await name.inputValue().catch(() => ''))) await name.fill('hushmallow rehearsal');
  const zip = page.locator('#billingPostalCode');
  if (await visible(zip) && !(await zip.inputValue().catch(() => ''))) {
    const country = await page.locator('#billingCountry').inputValue().catch(() => 'US');
    await zip.fill({ US: '10001', GB: 'SW1A 1AA', CA: 'K1A 0B1', AU: '2000', NZ: '1010' }[country] || '10001');
  }
  for (const [sel, v] of [['#billingAddressLine1', '1 Test Street'], ['#billingLocality', 'Sydney']]) {
    const f = page.locator(sel);
    if (await visible(f) && !(await f.inputValue().catch(() => ''))) await f.fill(v);
  }
  // Link's "save my information" stays off (it would ask for a phone number)
  const link = page.locator('#enableStripePass');
  if (await link.isChecked().catch(() => false)) await link.uncheck().catch(() => {});
  await page.locator('[data-testid="hosted-payment-submit-button"], button.SubmitButton').first().click();
}

/** Stripe's test 3-D Secure challenge, in its frames: the Complete or Fail button (or any), or null. */
async function challengeButton(page, which = 'any') {
  const ids = { complete: '#test-source-authorize-3ds', fail: '#test-source-fail-3ds', any: '#test-source-authorize-3ds, #test-source-fail-3ds' }[which];
  const re = { complete: /^\s*complete(\s+authentication)?\s*$/i, fail: /^\s*fail(\s+authentication)?\s*$/i, any: /^\s*(complete|fail)(\s+authentication)?\s*$/i }[which];
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    try {
      let l = f.locator(ids);
      if (await l.count()) return l.first();
      l = f.getByRole('button', { name: re });
      if (await l.count()) return l.first();
    } catch { /* a frame going away */ }
  }
  return null;
}

const DECLINE = /(your (?:credit |debit )?card (?:was|has been) declined[^.]*\.?|insufficient funds[^.]*\.?|card (?:was )?declined|we are unable to authenticate[^.]*\.?|authentication (?:failed|was unsuccessful)[^.]*\.?|could ?n[o’']t (?:be )?(?:processed|authenticate)[^.]*\.?)/i;
/** After a submit: { kind: 'returned' | 'challenge' | 'error' | 'timeout', text? }. */
async function outcome(X, page, timeout, { skipChallenge = false } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    try { if (new URL(page.url()).host === X.baseHost) return { kind: 'returned' }; } catch { /* navigating */ }
    if (!skipChallenge && await challengeButton(page)) return { kind: 'challenge' };
    const t = norm(await page.locator('body').innerText({ timeout: 3000 }).catch(() => ''));
    const m = DECLINE.exec(t);
    if (m && !(await challengeButton(page))) return { kind: 'error', text: m[0].slice(0, 120) };
    if (Date.now() >= end) return { kind: 'timeout' };
    await sleep(800);
  }
}

/** Plans → Monthly → one plan's button → Stripe Checkout, checked at once. → its verdict (refused: a Fail that stops the run). */
async function toCheckout(X, page, plan = 'ultra', who = 'A') {
  await openPlans(page);
  await tapEl(page, '.seg .seg-opt', { text: /^Monthly$/ });
  await tapEl(page, `${plan === 'ultra' ? '.invite-beyond' : '.invite-flow'} .invite-buy`);
  const left = await until(() => { try { return new URL(page.url()).host !== X.baseHost; } catch { return false; } }, 30000);
  if (!left) {
    const toasts = await page.evaluate(() => (window.__rh?.toasts || []).slice(-2).map((x) => x.t)).catch(() => []);
    throw new Fail(`"Step into …" did not open Checkout within 30 s${toasts.length ? ` (the app said: ${toasts.join(' / ')})` : ''}`);
  }
  const v = checkoutVerdict(page.url());
  if (v.live) throw new LiveStop(`Checkout opened a live session (${v.why})`);
  if (!v.ok) throw new Fail(`refused at once, nothing was typed: ${v.why}`, { stop: true });
  X.sessions.push({ id: v.id, who, at: Date.now() });
  return v;
}

/** Back on the preview after paying: "Welcome to <plan>" and ?billing=success gone, within 90 s. */
async function welcomed(X, page, planName, since) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await waitApp(page);
  const want = `Welcome to ${planName}`;
  const ok = await until(() => page.evaluate(({ want, since }) => (window.__rh?.toasts || []).some((x) => x.t === want && x.at >= since) && !/billing=success/.test(location.search), { want, since }), 90000, 400);
  if (ok) return true;
  const st = await page.evaluate(() => ({ search: location.search.replace(/session_id=[^&]+/, 'session_id=…'), toasts: (window.__rh?.toasts || []).slice(-3).map((x) => x.t) })).catch(() => ({}));
  throw new Fail(`back on the preview: no "${want}" within 90 s (address ${st.search || '(clean)'}; the app said ${JSON.stringify(st.toasts || [])})`);
}

// ----------------------------------------------------------------------------------------------------- R3 --
async function stepR3(X) {
  const { repo } = X;
  const said = [];
  const page = await ensureA(X);
  const tier0 = await refreshTier(page);
  need(tier0 === 'none', `E2E-A already has ${tier0 === 'ultra' ? repo.plans.ultra : tier0 === 'paid' ? repo.plans.paid : tier0} before checkout: cancel it first (the teardown, or the sandbox's dashboard)`);
  const v = await toCheckout(X, page, 'ultra', 'A');
  said.push(`Checkout on ${v.host}, a cs_test_ session`);
  const co = await readCheckout(page);
  need(co.text.includes(repo.plans.ultra) && /19\.99/.test(co.text), `Checkout does not show ${repo.plans.ultra} at US$19.99`);
  need(!co.phone, 'Checkout has a phone number field (the Checkout Studio settings say none)');
  need(!co.promo, 'Checkout has a promotion code field (the Checkout Studio settings say none)');
  said.push(`${repo.plans.ultra} US$19.99${co.testBadge ? ', test mode shown' : ''}, no phone or promotion code field`);
  const t0 = Date.now();
  await payCard(page, CARDS.ok, { email: X.pre.A.email });
  const o = await outcome(X, page, 120000);
  need(o.kind === 'returned', `paying with 4242…: ${o.kind}${o.text ? ` ("${o.text}")` : ''}`);
  await welcomed(X, page, repo.plans.ultra, t0);
  said.push(`4242… paid; "Welcome to ${repo.plans.ultra}", ?billing=success gone`);
  await openSettings(page);
  const plan = await until(async () => { const r = await planRow(page); return r.name === repo.plans.ultra && r.manage ? r : null; }, 20000);
  need(plan, `Settings → Plan does not show ${repo.plans.ultra} with Manage subscription`);
  X.beyondA = true;
  said.push(`Settings → Plan: ${plan.name}, "${plan.note}", Manage subscription`);
  if (X.stripe) said.push(await confirmCustomer(X, v.id));
  said.push(await alreadySubscribed(X));
  X.page = page;
  return { reason: said.join('; ') };
}

/** The Stripe customer of that session (read-only): one, holding the account's metadata.user_id. */
async function confirmCustomer(X, sessionId) {
  const s = await X.stripe.get(`/v1/checkout/sessions/${sessionId}`);
  need(s.ok, `Stripe: the Checkout Session could not be read (${s.status} ${s.code})`);
  const cus = idOf(s.data.customer);
  need(cus, 'Stripe: the Checkout Session has no customer');
  const c = await X.stripe.get(`/v1/customers/${cus}`);
  need(c.ok && c.data.metadata?.user_id === X.uids.A, 'Stripe: the customer does not hold the account’s metadata.user_id');
  // Stripe's search can take up to a minute to see a new customer
  let q = null;
  for (let i = 0; i < 7; i++) {
    q = await X.stripe.get('/v1/customers/search', { query: `metadata['user_id']:'${X.uids.A}'` });
    if (!q.ok || q.data.data.length) break;
    await sleep(10000);
  }
  if (!q.ok) return `Stripe: customer ${cus} holds the account's metadata.user_id (search not allowed for this key: ${q.code})`;
  need(q.data.data.length <= 1, `Stripe: ${q.data.data.length} customers hold the account's metadata.user_id (want one)`);
  return `Stripe: customer ${cus} holds the account's metadata.user_id${q.data.data.length ? ', the only one' : ' (search does not list it yet)'}`;
}

/**
 * "Step into hushmallow Flow" with Beyond already there. The plans page shows a plan the app knows as included (no
 * button), so this is a second browser that has not heard of the plan yet: its GET /v1/billing/status is held back.
 * The server's own 409 already_subscribed must answer, and the app opens the portal instead of a second Checkout.
 */
async function alreadySubscribed(X) {
  return inContext(X, async (ctx) => {
    await ctx.route((u) => u.host === X.workerHost && u.pathname === '/v1/billing/status', (r) => r.abort('failed'));
    const p = await ctx.newPage();
    X.page = p;
    await p.goto(`${X.base}/`, { timeout: 90000 });
    await waitApp(p);
    const r = await signIn(X, p, X.pre.A);
    need(r.ok, `409 check: E2E-A could not sign in in a second browser: ${r.why}`);
    await openPlans(p);
    const t0 = Date.now();
    await tapEl(p, '.invite-flow .invite-buy');
    const ans = await until(() => ctx.__net.find((x) => x.m === 'POST' && x.p === '/v1/billing/checkout' && x.at >= t0), 30000);
    need(ans, '409 check: no answer from /v1/billing/checkout within 30 s');
    need(ans.s === 409 && ans.json?.error?.code === 'already_subscribed', `409 check: checkout answered ${ans.s} ${ans.json?.error?.code || ''} (want 409 already_subscribed)`);
    const away = await until(() => { try { const u = new URL(p.url()); return u.host !== X.baseHost ? u.href : null; } catch { return null; } }, 30000);
    need(away, '409 check: the app did not open the portal');
    const pv = portalVerdict(away);
    if (pv.live) throw new LiveStop('the portal opened a live session');
    need(pv.ok && !checkoutVerdict(away).id, `409 check: the app opened ${new URL(away).host}, not the portal (${pv.why})`);
    return `a second browser without the plan yet: "Step into ${X.repo.plans.paid}" → 409 already_subscribed → the portal (${new URL(away).host}), no second Checkout`;
  });
}

// ----------------------------------------------------------------------------------------------------- R4 --
async function stepR4(X) {
  const { repo } = X;
  const said = [];
  return inContext(X, async (ctx) => {
    const page = await ctx.newPage();
    X.page = page;
    await page.goto(`${X.base}/`, { timeout: 90000 });
    await waitApp(page);
    const r = await signIn(X, page, X.pre.C);
    need(r.ok, `E2E-C could not sign in: ${r.why}`);
    X.uids.C = r.uid;
    const tier0 = await refreshTier(page);
    need(tier0 === 'none', `E2E-C already has a plan (${tier0}): cancel it first`);
    // 1. declined
    await toCheckout(X, page, 'ultra', 'C');
    await readCheckout(page);
    await payCard(page, CARDS.declined, { email: X.pre.C.email });
    const o1 = await outcome(X, page, 60000);
    need(o1.kind === 'error', `4000 0000 0000 9995: ${o1.kind === 'returned' ? 'it was ACCEPTED' : o1.kind} (want Stripe's decline on its own page)`);
    said.push(`9995 declined on Stripe's page ("${o1.text}")`);
    const back = page.locator('a[href*="billing=cancel"]').first();
    need(await visible(back), 'Checkout has no back link (to …?billing=cancel)');
    const t1 = Date.now();
    await back.click();
    need(await until(() => { try { return new URL(page.url()).host === X.baseHost; } catch { return false; } }, 30000), 'the back link did not return to the preview');
    await waitApp(page);
    need(await toastSince(page, repo.returnLines.cancel, t1, 20000), `back on the preview without "${repo.returnLines.cancel}"`);
    need((await refreshTier(page)) === 'none', 'after the decline the account has a plan');
    await openSettings(page);
    const p1 = await planRow(page);
    need(p1.name === 'No plan yet', `Settings → Plan says "${p1.name}" after the decline`);
    said.push(`the back link: "${repo.returnLines.cancel}", no plan`);
    // 2. 3-D Secure: Fail authentication, then Complete authentication
    await toCheckout(X, page, 'ultra', 'C');
    await readCheckout(page);
    await payCard(page, CARDS.threeDs, { email: X.pre.C.email });
    const o2 = await outcome(X, page, 60000);
    need(o2.kind === 'challenge', `4000 0025 0000 3155: no 3-D Secure challenge (${o2.kind})`);
    const fail = await until(() => challengeButton(page, 'fail'), 15000);
    need(fail, 'the challenge has no "Fail authentication"');
    await fail.click();
    await until(async () => !(await challengeButton(page)), 30000);
    const o3 = await outcome(X, page, 45000, { skipChallenge: true });
    need(o3.kind === 'error', `after "Fail authentication": ${o3.kind === 'returned' ? 'it was ACCEPTED' : o3.kind}`);
    said.push(`3155 → Fail authentication: refused ("${o3.text}")`);
    const t2 = Date.now();
    await page.locator('[data-testid="hosted-payment-submit-button"], button.SubmitButton').first().click();
    const o4 = await outcome(X, page, 60000);
    need(o4.kind === 'challenge', `3155 again: no challenge (${o4.kind})`);
    const ok = await until(() => challengeButton(page, 'complete'), 15000);
    need(ok, 'the challenge has no "Complete authentication"');
    await ok.click();
    const o5 = await outcome(X, page, 120000, { skipChallenge: true });
    need(o5.kind === 'returned', `after "Complete authentication": ${o5.kind}${o5.text ? ` ("${o5.text}")` : ''}`);
    await welcomed(X, page, repo.plans.ultra, t2);
    said.push(`then Complete authentication: "Welcome to ${repo.plans.ultra}" (E2E-C's subscription goes in the teardown)`);
    return { reason: said.join('; ') };
  });
}

// ----------------------------------------------------------------------------------------------------- R5 --
async function openAngle(X, page) {
  await goHome(page);
  let via = 'the side panel';
  try {
    await tapEl(page, '[data-hf="panel-handle"]', { timeout: 15000 });
    await tapEl(page, '[data-hf="panel"] .hf-link', { text: /^Another Angle/, timeout: 15000 });
  } catch { via = null; }
  if (!via || !(await until(() => visibleNow(page, '[data-hf="angle"]'), 10000))) { await page.evaluate(() => window.__hush.go('angle')); via = 'the app’s router'; }
  need(await until(() => visibleNow(page, '[data-hf="angle"]'), 30000), 'Another Angle did not open');
  return via;
}
const chipSel = '.hf-chips:not([hidden]) .hf-chip';
const visibleChips = (page) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent && !e.closest('[hidden]')).map((e) => e.textContent.replace(/\s+/g, ' ').trim()), chipSel).catch(() => []);
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tell Zuzu: the chip or the dock's pill, the words, Send (unless a support sheet opened on them while typing). */
async function tell(page, text, { sendUnlessSheet = false } = {}) {
  await tapEl(page, `${chipSel}, [data-bx="tell"]`, { text: /Tell Zuzu/, timeout: 90000 });
  await page.locator('.hf-input textarea').waitFor({ state: 'visible', timeout: 30000 });
  await sleep(350);
  await page.locator('.hf-input textarea').fill(text);
  await sleep(sendUnlessSheet ? 1500 : 700);
  if (sendUnlessSheet && await page.evaluate(() => !!document.querySelector('#sheet-root .sheet.open'))) return { sent: false, sheet: true };
  await tapEl(page, '.hf-input .hf-send:not([disabled])', { timeout: 15000 });
  return { sent: true, sheet: false };
}
/** Answer a choice by its chip (a chip still fading in may miss a tap: tried again). */
async function answer(page, label) {
  for (let i = 0; i < 4; i++) {
    await tapEl(page, chipSel, { text: new RegExp(`^${escRe(label)}$`), timeout: 20000 });
    if (await until(async () => !(await visibleChips(page)).includes(label), 4000)) return true;
  }
  return false;
}
/**
 * Plays the angle through as a person would, until `done` holds: "That’s enough" when Zuzu offers to test it, a held
 * line's Continue, the mechanic's own choice, or the dock's touch-free pill. Never the feedback, end, question or
 * support answers.
 */
async function playThrough(X, page, done, timeout) {
  const never = new Set([X.repo.angleChoice.angle, X.repo.angleChoice.be, 'That helped', X.repo.anotherLabel, 'Not relevant', 'I’d rather just squeeze a Mallow', 'Keep this discovery', 'Continue', 'Finish', 'Leave it there', 'See support', 'Tell Zuzu']);
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await done().catch(() => false)) return true;
    const chips = await visibleChips(page);
    const enough = chips.find((c) => /^That.s enough$/.test(c));
    const own = chips.find((c) => !never.has(c) && !/support|squeeze|not okay|Tell Zuzu/i.test(c));
    try {
      if (enough) await tapEl(page, chipSel, { text: new RegExp(`^${escRe(enough)}$`), timeout: 3000 });
      else if (await findRect(page, '.hf-subs button', /Continue/, false)) await tapEl(page, '.hf-subs button', { text: /Continue/, timeout: 3000 });
      else if (own) await tapEl(page, chipSel, { text: new RegExp(`^${escRe(own)}$`), timeout: 3000 });
      else if (await findRect(page, '[data-bx="assist"]', null, false)) await tapEl(page, '[data-bx="assist"]', { timeout: 3000 });
    } catch { /* it moved on meanwhile */ }
    await sleep(900);
  }
  return false;
}

async function stepR5(X) {
  const { repo } = X;
  const said = [];
  const page = await ensureA(X);
  const tier = await refreshTier(page);
  if (tier !== 'ultra') return { status: 'SKIP', reason: `E2E-A has no ${repo.plans.ultra} (${tier}): Another Angle needs it (R3 gives it)` };
  const ctx = X.ctxA;
  const via = await openAngle(X, page);
  const card = await until(() => visibleNow(page, '[data-bx="consent"]'), 30000);
  if (card) { await sleep(800); await tapEl(page, '[data-bx="consent"] .bx-accept'); said.push(`opened (${via}); the consent card: Accept`); }
  else said.push(`opened (${via}); no consent card (accepted before in this browser)`);
  await tell(page, EVERYDAY);
  const q = repo.angleChoice.ask;
  const asked = await until(() => page.evaluate(({ q, be, sel }) => (window.__rh?.said || []).includes(q) && [...document.querySelectorAll(sel)].some((e) => e.offsetParent && e.textContent.includes(be)), { q, be: repo.angleChoice.be, sel: chipSel }), 45000);
  need(asked, `Zuzu did not ask "${q}"`);
  const t0 = Date.now();
  need(await answer(page, repo.angleChoice.angle), `"${repo.angleChoice.angle}" did not take`);
  const first = await until(() => ctx.__net.find((x) => x.m === 'POST' && x.p === '/v1/angle' && x.at >= t0 && x.s), 60000);
  if (!first) {
    const s = ctx.__net.filter((x) => x.p === '/v1/session').pop();
    throw new Fail(`no answer from /v1/angle within 60 s${s ? ` (the last /v1/session answered ${s.s})` : ' (no /v1/session either: is sharing on?)'}`);
  }
  const ms1 = first.at - t0;
  need(first.s === 200 && first.json?.status === 'ok' && first.json?.scene, `/v1/angle answered ${first.s} ${first.json?.status || ''}${first.json?.fallback?.reason ? ` (${first.json.fallback.reason})` : ''}: not the real model's angle`);
  need(ms1 <= repo.angleBudgetMs, `the angle took ${ms1} ms, over the app's ${repo.angleBudgetMs} ms: Zuzu's own angle played instead`);
  const sess = ctx.__net.filter((x) => x.p === '/v1/session' && x.at >= t0 - 120000);
  said.push(`an everyday situation → "${repo.angleChoice.angle}" → /v1/session ${sess.length ? sess[sess.length - 1].s : '(earlier)'} + /v1/angle 200 ok in ${ms1} ms`);
  const lines = [first.json.scene.subtitle_line_1, first.json.scene.subtitle_line_2].map(norm).filter(Boolean);
  const fb = await playThrough(X, page, async () => (await visibleChips(page)).includes(repo.anotherLabel), 150000);
  need(fb, `no "${repo.feedbackAsk}" with "${repo.anotherLabel}" after the angle (150 s)`);
  const shown = await page.evaluate((ls) => ls.filter((l) => (window.__rh?.said || []).map((s) => s.replace(/\s+/g, ' ').trim()).includes(l)).length, lines);
  said.push(`its lines on screen ${shown}/${lines.length}${shown < lines.length ? ' (the app’s own guard may swap a line)' : ''}`);
  const t1 = Date.now();
  need(await answer(page, repo.anotherLabel), `"${repo.anotherLabel}" did not take`);
  const second = await until(() => ctx.__net.find((x) => x.m === 'POST' && x.p === '/v1/angle' && x.at >= t1 && x.s), 60000);
  need(second && second.s === 200 && second.json?.status === 'ok', `"${repo.anotherLabel}": /v1/angle ${second ? `${second.s} ${second.json?.status || ''}` : 'did not answer within 60 s'}`);
  said.push(`"${repo.anotherLabel}": a second angle (200 ok in ${second.at - t1} ms)`);
  // the crisis TEST sentence from the repository's safety fixtures: support, and nothing sent for it
  await openAngle(X, page);
  const tc = Date.now();
  const sent = await tell(page, repo.crisisSentence, { sendUnlessSheet: true });
  const support = await until(() => page.evaluate((line) => (document.querySelector('#sheet-root .sheet.open') ? 'the urgent support sheet' : null) || ((window.__rh?.said || []).includes(line) ? `"${line}"` : null), repo.safetyCrisis[0]), 20000);
  await sleep(2000);
  const angleAfter = ctx.__reqs.filter((x) => x.p === '/v1/angle' && x.at >= tc).length;
  need(support, 'the crisis test sentence did not get the support response');
  need(!angleAfter, `the crisis test sentence was followed by ${angleAfter} /v1/angle request(s)`);
  said.push(`the crisis test sentence (tests/safety-qa.probes.mjs) → ${support}${sent.sent ? '' : ' while typing'}, no angle requested`);
  await goHome(page);
  return { reason: said.join('; ') };
}

// ----------------------------------------------------------------------------------------------------- R6 --
async function syncSwitches(page) {
  const out = [];
  for (const kind of ['settings', 'library']) {
    const ready = await until(() => page.evaluate((k) => { const i = document.querySelector(`[data-sync="${k}"]`); return !!i && !i.disabled; }, kind), 30000);
    need(ready, `the "${kind}" switch did not wake (the account's choices did not load)`);
    const on = await page.evaluate((k) => document.querySelector(`[data-sync="${k}"]`).checked, kind);
    if (!on) {
      await tapEl(page, `[data-sync="${kind}"]`);
      const ok = await until(() => page.evaluate((k) => {
        const i = document.querySelector(`[data-sync="${k}"]`);
        const line = i?.closest('.hm-account-row')?.querySelector('.hm-account-consent')?.textContent || '';
        return i && i.checked && !i.disabled && /^On since /.test(line);
      }, kind), 30000);
      need(ok, `the "${kind}" switch did not turn on (${await page.evaluate(() => document.querySelector('[data-sync-status]')?.textContent || '').catch(() => '')})`);
      out.push(`${kind} on`);
    } else out.push(`${kind} already on`);
  }
  return out;
}
const consentLines = (page) => page.evaluate(() => ['settings', 'library'].map((k) => { const i = document.querySelector(`[data-sync="${k}"]`); return { k, on: !!i?.checked, line: (i?.closest('.hm-account-row')?.querySelector('.hm-account-consent')?.textContent || '').trim() }; }));

async function stepR6(X) {
  const { repo } = X;
  const said = [];
  let page = await ensureA(X);
  const v = await openAccountScreen(page);
  need(v === 'account', `the account screen shows ${v}`);
  said.push(`"Keep with my account": ${(await syncSwitches(page)).join(', ')}`);
  const ver = await pageVersion(page);
  need(ver, 'the page’s version folder could not be read');
  const tFav = await page.evaluate(() => Date.now());
  const favs = await page.evaluate(async ({ ver, id }) => {
    const m = await import(`/v/${ver}/src/engine/flow-store.js`);
    // a favourite from an earlier run is set again, so the opt-in sync has a change to send now
    if (m.isFavouriteWorld(window.__hush.store, id)) m.toggleFavouriteWorld(window.__hush.store, id);
    m.toggleFavouriteWorld(window.__hush.store, id);
    return m.favouriteWorlds(window.__hush.store);
  }, { ver, id: WORLD });
  need(favs.includes(WORLD), `${WORLD} is not a favourite`);
  // the opt-in sync sends a change a few seconds later (src/auth/autosync.js DEBOUNCE_MS): its own run, waited for
  const synced = await until(() => page.evaluate((t) => { const s = window.__hush.auth.autosync?.state; return !!s && !s.running && Number(s.last) > t; }, tFav), 30000, 500);
  need(synced, `the opt-in sync did not send the favourite within 30 s (${await page.evaluate(() => window.__hush.auth.autosync?.state?.error || 'no error said').catch(() => '?')})`);
  said.push(`favourite world ${WORLD} (through the app's flow-store, as the side panel's Favourite button does), sent by the app's own sync`);
  const before = await page.evaluate(() => ({ uid: window.__hush.auth.user()?.id || null, tier: window.__hush.ent.tier() }));
  // come back: a new page in the same browser
  await page.close();
  page = await X.ctxA.newPage();
  X.pageA = page; X.page = page;
  await page.goto(`${X.base}/`, { timeout: 90000 });
  await waitApp(page);
  const st = await until(() => page.evaluate(() => (window.__hush.auth.status() === 'signed-in' ? { uid: window.__hush.auth.user()?.id || null } : null)), 20000);
  need(st && st.uid === before.uid, 'a new page is not signed in as the same account');
  const kept = await page.evaluate(async ({ ver, id }) => (await import(`/v/${ver}/src/engine/flow-store.js`)).isFavouriteWorld(window.__hush.store, id), { ver, id: WORLD });
  need(kept, `${WORLD} is no longer a favourite after coming back`);
  let plan = 'plan not checked (no web billing here)';
  if (!X.local) {
    const tier = await refreshTier(page);
    if (X.beyondA) need(tier === 'ultra', `after coming back the plan is ${tier}, not ${repo.plans.ultra}`);
    plan = X.beyondA ? `still ${repo.plans.ultra}` : `plan ${tier} (R3 did not run in this browser)`;
  }
  const v2 = await openAccountScreen(page);
  need(v2 === 'account', `after coming back the account screen shows ${v2}`);
  const lines = await until(async () => { const l = await consentLines(page); return l.every((x) => x.on && /^On since /.test(x.line)) ? l : null; }, 30000);
  need(lines, 'after coming back the two switches are not both on');
  said.push(`a new page: still signed in, ${plan}, the favourite kept, both switches "On since …"`);
  return { reason: said.join('; ') };
}

// ----------------------------------------------------------------------------------------------------- R7 --
/** The first button or link whose name matches one of these (polling until timeout); clicked. */
async function clickFirst(page, res, timeout = 30000) {
  const hit = await until(async () => {
    for (const re of res) for (const role of ['button', 'link']) {
      const l = page.getByRole(role, { name: re });
      if (await l.count().catch(() => 0)) { const f = l.first(); if (await f.isVisible().catch(() => false)) return f; }
    }
    return null;
  }, timeout, 400);
  if (!hit) throw new Fail(`Stripe's page has no ${res.map((r) => `"${r.source}"`).join(' or ')}`);
  await hit.click();
  return true;
}
/** Leaves the portal by its return link; back on the preview. */
async function returnFromPortal(X, page) {
  const link = page.locator('a[href*="billing=portal"], [data-testid="return-to-business-link"]').first();
  if (await visible(link)) await link.click(); else await clickFirst(page, [/^return to/i, /^back to/i], 30000);
  need(await until(() => { try { return new URL(page.url()).host === X.baseHost; } catch { return false; } }, 45000), 'the portal’s return link did not come back to the preview');
  await waitApp(page);
}
async function toPortal(X, page) {
  await openSettings(page);
  await tapEl(page, '.settings [data-act="manage-subscription"]', { timeout: 20000 });
  const away = await until(() => { try { const u = new URL(page.url()); return u.host !== X.baseHost ? u.href : null; } catch { return null; } }, 30000);
  need(away, 'Manage subscription did not open the portal');
  const pv = portalVerdict(away);
  if (pv.live) throw new LiveStop('Manage subscription opened a live portal session');
  need(pv.ok, pv.why);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await sleep(2000);
  const text = norm(await page.locator('body').innerText({ timeout: 30000 }).catch(() => ''));
  need(pv.test === true || /test mode|sandbox/i.test(text), 'the portal does not say it is in test mode');
  return text;
}
/** Polls the plan this page holds (forced checks, at most one each 5 s) until want(entitlements) or timeout. */
const planUntil = (page, want, timeout) => until(() => page.evaluate(async (w) => {
  try { await window.__hush.ent.refresh({ force: true }); } catch { /* next */ }
  const e = window.__hush.ent, p = e.webPlan?.() || {};
  const s = { tier: e.tier(), cancelAtPeriodEnd: !!p.cancelAtPeriodEnd, endsAt: p.endsAt ?? null };
  return (w === 'paid' ? s.tier === 'paid' : s.cancelAtPeriodEnd || Number.isFinite(s.endsAt)) ? s : null;
}, want), timeout, 5000);

async function stepR7(X) {
  const { repo } = X;
  const said = [];
  const page = await ensureA(X);
  const tier = await refreshTier(page);
  if (tier === 'none') return { status: 'SKIP', reason: 'E2E-A has no plan to manage (R3 gives it one)' };
  // switch to hushmallow Flow
  const text = await toPortal(X, page);
  need(text.includes(repo.plans.ultra) || text.includes(repo.plans.paid), 'the portal does not name the plan');
  said.push('Manage subscription → billing.stripe.com, test mode');
  await clickFirst(page, [/^update (plan|subscription)/i, /^change (plan|subscription)/i]);
  await sleep(2000);
  const picked = await page.evaluate((name) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
    const btns = [...document.querySelectorAll('button, a[role="button"]')].filter((b) => vis(b) && /^select$/i.test(b.textContent.trim()));
    for (const b of btns) {
      let el = b;
      for (let i = 0; i < 8 && el; i++, el = el.parentElement) {
        const inside = [...el.querySelectorAll('button, a[role="button"]')].filter((x) => /^select$/i.test(x.textContent.trim()));
        if (inside.length > 1) break;
        if ((el.textContent || '').includes(name)) { b.setAttribute('data-rh-pick', '1'); return true; }
      }
    }
    return false;
  }, repo.plans.paid);
  need(picked, `the portal's plan list has no "Select" for ${repo.plans.paid}`);
  await page.locator('[data-rh-pick="1"]').first().click();
  await clickFirst(page, [/^continue$/i]);
  await clickFirst(page, [/^confirm$/i, /^(update|confirm) (plan|subscription)$/i]);
  await sleep(3000);
  await returnFromPortal(X, page);
  const flow = await planUntil(page, 'paid', 45000);
  await openSettings(page);
  const p1 = await planRow(page);
  need(flow && p1.name === repo.plans.paid, `back from the portal the app shows ${p1.name || 'nothing'}, not ${repo.plans.paid} (if the portal schedules a downgrade at the period end, B6/D8, the switch waits until then)`);
  said.push(`switched to ${repo.plans.paid} there; back: Settings → Plan: ${p1.name}`);
  // cancel at the period end
  await toPortal(X, page);
  await clickFirst(page, [/^cancel (plan|subscription)$/i]);
  await sleep(1500);
  await clickFirst(page, [/^cancel (plan|subscription)$/i, /^confirm cancellation$/i]);
  await sleep(2500);
  // a cancellation survey, if the portal asks one
  for (const re of [/^skip$/i, /^no thanks$/i]) {
    const l = page.getByRole('button', { name: re });
    if (await l.count().catch(() => 0)) { await l.first().click().catch(() => {}); break; }
  }
  await sleep(1500);
  await returnFromPortal(X, page);
  const ends = await planUntil(page, 'ends', 45000);
  await openSettings(page);
  const p2 = await planRow(page);
  need(ends && /^Ends on .+\. Nothing more is charged\.$/.test(p2.note), `after cancelling, Settings → Plan says "${p2.note}" (want "Ends on …. Nothing more is charged.")`);
  said.push(`cancelled at the period end; Settings: "${p2.note}"`);
  return { reason: said.join('; ') };
}

// ----------------------------------------------------------------------------------------------------- R8 --
async function stepR8(X) {
  const { repo } = X;
  const page = await ensureA(X);
  const v = await openAccountScreen(page);
  need(v === 'account', `the account screen shows ${v}`);
  await tapEl(page, '[data-act="delete"]');
  need(await waitView(page, ['delete'], 20000), 'Delete my account did not open the delete screen');
  await sleep(3000);   // its check with the billing server (D9)
  const ver = await pageVersion(page);
  const st = await page.evaluate(async (ver) => {
    const m = await import(`/v/${ver}/src/app/scenes/account.js`);
    return {
      facts: [...document.querySelectorAll('[data-auth-view="delete"] .hm-account-facts')].map((e) => e.innerText).join('\n'),
      cancelFirst: !!document.querySelector('[data-cancel-first]'), unchecked: !!document.querySelector('[data-unchecked]'),
      submitOff: document.querySelector('[data-act="delete-confirm"]')?.disabled === true,
      billing: !!window.__hush.billing, renewing: m.renewingWebPlan(window.__hush),
    };
  }, ver);
  const said = [];
  if (st.billing) {
    need(norm(st.facts).includes(norm(repo.webPlanNotTouched)), '"Not touched" does not say to cancel a web subscription first');
    said.push('"Not touched": "…deleting your account doesn’t cancel it, so cancel it first in Settings → Manage subscription"');
  } else said.push('web billing off here: "Not touched" as before (the App Store line)');
  if (st.renewing) {
    need(st.cancelFirst && st.submitOff, `the plan renews, but "${repo.cancelFirstTitle}" is ${st.cancelFirst ? 'there and Delete is on' : 'not there'}`);
    said.push(`the plan renews: "${repo.cancelFirstTitle}" first, Delete off`);
  } else {
    need(!st.cancelFirst, `"${repo.cancelFirstTitle}" shows, yet the plan does not renew`);
    need(!st.unchecked || !st.billing, 'the delete screen could not check for a subscription');
    said.push(st.billing ? 'no renewing plan: no "Cancel your subscription first" step' : 'no web plan here');
  }
  need(st.submitOff, 'Delete my account is on before the word is typed');
  if (!X.opts.deleteAccount) {
    await tapEl(page, '[data-act="cancel"]');
    said.push('nothing deleted (no --delete-account)');
    return { reason: said.join('; ') };
  }
  need(!st.renewing, '--delete-account: the plan still renews, so the app refuses (cancel it first)');
  await page.locator('[data-auth-view="delete"] input[name="confirm"]').fill(repo.deleteWord);
  const b = await loadStamp(page);
  await tapEl(page, '[data-act="delete-confirm"]');
  need(await until(async () => (await loadStamp(page)) !== b, 60000), 'deleting did not finish');
  await waitApp(page);
  need((await page.evaluate(() => window.__hush.auth.status())) === 'guest', 'after deleting the page is not a guest');
  X.pageA = null;
  said.push('--delete-account: E2E-A deleted (a guest again)');
  return { reason: said.join('; ') };
}

// ----------------------------------------------------------------------------------------------------- teardown --
async function teardown(X) {
  const { log } = X;
  if (X.local) { log.info('teardown: local test mode, nothing at Stripe'); return; }
  const ids = [...new Set(X.sessions.map((s) => s.id))];
  if (!X.stripe) {
    if (ids.length) log.skip('teardown', `no STRIPE_E2E_KEY: cancel this run's test subscriptions by hand (the sandbox → Subscriptions); its Checkout Sessions: ${ids.join(', ')}`);
    else log.info('teardown: no Checkout Session was opened, nothing to cancel');
    return;
  }
  const since = Math.floor(X.startMs / 1000) - 60;   // the run's start (a minute for the clocks' difference)
  const customers = new Set();
  for (const id of ids) {
    const s = await X.stripe.get(`/v1/checkout/sessions/${id}`);
    const cus = s.ok ? idOf(s.data.customer) : null;
    if (cus) customers.add(cus);
  }
  for (const uid of [X.uids.A, X.uids.C].filter(Boolean)) {
    const q = await X.stripe.get('/v1/customers/search', { query: `metadata['user_id']:'${uid}'` });
    if (q.ok) for (const c of q.data.data || []) if (typeof c.id === 'string') customers.add(c.id);
  }
  if (!customers.size) { log.info('teardown: no customer of the test accounts was found, nothing to cancel'); return; }
  let cancelled = 0;
  for (const cus of customers) {
    const r = await X.stripe.get('/v1/subscriptions', { customer: cus, status: 'all', 'created[gte]': String(since), limit: '100' });
    if (!r.ok) { log.fail('teardown', `the subscriptions of ${cus} could not be listed (${r.status} ${r.code}): cancel them by hand`); continue; }
    for (const id of subsToCancel(r.data.data, since)) {
      const d = await X.stripe.del(`/v1/subscriptions/${id}`);
      if (d.ok) { cancelled++; log.info(`teardown: cancelled ${id}`); } else log.fail('teardown', `${id} not cancelled (${d.status} ${d.code}): cancel it by hand`);
    }
  }
  log.info(`teardown: ${cancelled} subscription(s) of this run cancelled; nothing else was touched`);
}

const STEP_FNS = { R1: stepR1, R2: stepR2, R3: stepR3, R4: stepR4, R5: stepR5, R6: stepR6, R7: stepR7, R8: stepR8 };

module.exports = {
  STEPS, A_STEPS, SECRET_ENV, PRODUCTION_HOSTS, CHECKOUT_HOSTS, CARDS, EVERYDAY, WORLD,
  loadRepo, pickCrisisSentence, parseArgs, preflight, proxyFromEnv, createLog, judgeHealth, parsePublicConfig, judgeAuthConfig,
  checkoutVerdict, portalVerdict, hasLive, subsToCancel, LiveStop, main,
};

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }, (e) => { createLog({ env: process.env }).fail('', `the driver stopped: ${String(e?.message || e).split('\n')[0]}`); process.exitCode = 1; });
}
