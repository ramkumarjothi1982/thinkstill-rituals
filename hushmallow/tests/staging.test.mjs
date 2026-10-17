// Staging (docs/STAGING.md): a BRANCH PREVIEW of the Cloudflare Pages project
// (https, exactly one DNS label + ".hushmallow.pages.dev", e.g. the release
// branch claude/launch-rc → claude-launch-rc.hushmallow.pages.dev) talks to the
// STAGING Worker for Another Angle and billing, with billing ON (Stripe TEST
// mode) and the owner's provisional prices on the plans page; Settings' version
// line says "staging". Everywhere else (app.hushmallow.com, the production alias
// hushmallow.pages.dev, hushmallow.com, the GitHub Pages copy, localhost) nothing
// changes. The _headers rule that lets a preview reach the staging Worker
// matches the same hosts and no others.
// Run with: node --test tests/
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  ANGLE_ENDPOINT, ANGLE_ALLOWED_HOSTS, BILLING_PROVIDER, BILLING_ENDPOINT, BILLING_PRICES, BUILD,
  STAGING_ANGLE_ENDPOINT, STAGING_ALLOWED_HOSTS, PREVIEW_HOST_SUFFIX, isPreviewHost, deploySettings,
} from '../src/app/config.js';
import { resolveEndpoint } from '../src/beyond/endpoint.js';
import { createBilling, resolveBilling } from '../src/app/billing.js';
import { createEntitlements } from '../src/app/entitlements.js';
import { createStore } from '../src/engine/storage.js';
import { headersFile, PREVIEW_PATTERN } from '../tools/site/auth-config.mjs';
import { parseHeadersFile, headersFor } from '../tools/site/pages-headers.mjs';
import { previewRule } from '../tools/site/security-headers.mjs';
import { PROJECT_URL } from '../src/auth/config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const PROD = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';
const STAGING = 'https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev';
const PREVIEW = 'claude-launch-rc.hushmallow.pages.dev';
const loc = (hostname, { protocol = 'https:', search = '', port = '' } = {}) => ({ hostname, protocol, search, port, href: `${protocol}//${hostname}${port ? `:${port}` : ''}/${search}`, hash: '' });
/** Hosts that keep production's settings exactly (the customers' hosts, the GitHub Pages copy, this machine). */
const PRODUCTION_HOSTS = ['app.hushmallow.com', 'hushmallow.pages.dev', 'hushmallow.com', 'www.hushmallow.com', 'ramkumarjothi1982.github.io'];
const PREVIEWS = [PREVIEW, 'claude-upbeat-pasteur-b0aqg1.hushmallow.pages.dev', '3f9c2a1b.hushmallow.pages.dev', 'main.hushmallow.pages.dev'];
const PRICES = { 'hushmallow.paid.monthly': 'US$9.99', 'hushmallow.paid.yearly': 'US$99.99', 'hushmallow.ultra.monthly': 'US$19.99', 'hushmallow.ultra.yearly': 'US$199.99' };

// ------------------------------------------------------------- the hosts --
test('isPreviewHost: https, no port, exactly one DNS label in front of ".hushmallow.pages.dev"; nothing else', () => {
  assert.equal(PREVIEW_HOST_SUFFIX, '.hushmallow.pages.dev');
  for (const h of PREVIEWS) assert.equal(isPreviewHost(loc(h)), true, h);
  // the branch → alias rule (docs/STAGING.md): Pages lowercases the branch and turns "/" into "-"
  assert.equal(isPreviewHost(loc(`${'claude/launch-rc'.toLowerCase().replace(/[^a-z0-9]/g, '-')}${PREVIEW_HOST_SUFFIX}`)), true);
  for (const h of [
    ...PRODUCTION_HOSTS, 'localhost', '127.0.0.1',
    'a.b.hushmallow.pages.dev', 'evil.com.hushmallow.pages.dev', '.hushmallow.pages.dev', 'hushmallow.pages.dev.evil.com',
    `${PREVIEW}.evil.com`, `${PREVIEW}.`, 'xhushmallow.pages.dev', 'claude-launch-rc-hushmallow.pages.dev', 'claude-launch-rc.hushmallow.pages.dev.attacker.dev',
    '-x.hushmallow.pages.dev', 'x-.hushmallow.pages.dev', 'claude_launch.hushmallow.pages.dev', 'CLAUDE-LAUNCH-RC.hushmallow.pages.dev',
    `${'a'.repeat(64)}.hushmallow.pages.dev`, 'claude-launch-rc.hushmallow.pages.devx', 'claude-launch-rc.otherproject.pages.dev', '',
  ]) assert.equal(isPreviewHost(loc(h)), false, JSON.stringify(h));
  assert.equal(isPreviewHost(loc(`${'a'.repeat(63)}.hushmallow.pages.dev`)), true, 'a 63-character label is still one label');
  assert.equal(isPreviewHost(loc(PREVIEW, { protocol: 'http:' })), false, 'https only');
  assert.equal(isPreviewHost(loc(PREVIEW, { port: '8443' })), false, 'no port');
  for (const l of [null, undefined, {}, { hostname: PREVIEW }, { hostname: 42, protocol: 'https:' }]) assert.equal(isPreviewHost(l), false, JSON.stringify(l));
  // Node (no location): production
  assert.equal(isPreviewHost(), false);
});

test('deploySettings: the staging Worker, its own allow-list and billing on for a preview; production exactly as configured elsewhere', () => {
  const p = deploySettings(loc('app.hushmallow.com'));
  assert.deepEqual({ ...p }, { stage: 'production', angleEndpoint: ANGLE_ENDPOINT, angleAllowedHosts: ANGLE_ALLOWED_HOSTS, billingProvider: BILLING_PROVIDER, billingEndpoint: BILLING_ENDPOINT });
  // production's own switches are unchanged: the production Worker, billing off
  assert.equal(ANGLE_ENDPOINT, PROD);
  assert.deepEqual([...ANGLE_ALLOWED_HOSTS], ['hushmallow-another-angle.vibyfy-chat.workers.dev']);
  assert.equal(BILLING_PROVIDER, '');
  assert.equal(BILLING_ENDPOINT, '');
  for (const h of [...PRODUCTION_HOSTS, 'localhost', '127.0.0.1']) assert.equal(deploySettings(loc(h, { protocol: h.includes('local') || h.startsWith('127') ? 'http:' : 'https:' })), p, h);
  assert.equal(deploySettings(null), p);
  assert.equal(deploySettings(), p, 'Node: production');
  const s = deploySettings(loc(PREVIEW));
  assert.deepEqual({ ...s }, { stage: 'staging', angleEndpoint: STAGING, angleAllowedHosts: STAGING_ALLOWED_HOSTS, billingProvider: 'stripe', billingEndpoint: STAGING });
  assert.equal(STAGING_ANGLE_ENDPOINT, STAGING);
  assert.deepEqual([...STAGING_ALLOWED_HOSTS], ['hushmallow-another-angle-staging.vibyfy-chat.workers.dev']);
  // the two allow-lists never overlap: a preview never reaches production, production never reaches staging
  assert.ok(!ANGLE_ALLOWED_HOSTS.some((h) => STAGING_ALLOWED_HOSTS.includes(h)));
  assert.ok(Object.isFrozen(p) && Object.isFrozen(s));
});

// ---------------------------------------------------------- Another Angle --
test('Another Angle: a preview uses the staging Worker; app.hushmallow.com, hushmallow.pages.dev, github.io and localhost keep the production Worker', () => {
  for (const h of PREVIEWS) assert.equal(resolveEndpoint({ loc: loc(h) }), STAGING, h);
  for (const h of PRODUCTION_HOSTS) assert.equal(resolveEndpoint({ loc: loc(h) }), PROD, h);
  // localhost: as before (the configured production Worker, or ?angleDev=<port> for a local server)
  assert.equal(resolveEndpoint({ loc: loc('localhost', { protocol: 'http:' }) }), PROD);
  assert.equal(resolveEndpoint({ loc: loc('localhost', { protocol: 'http:', search: '?angleDev=8790' }) }), 'http://localhost:8790');
  assert.equal(resolveEndpoint({ loc: loc('127.0.0.1', { protocol: 'http:', search: '?angleDev=8790' }) }), 'http://127.0.0.1:8790');
  assert.equal(resolveEndpoint({ loc: null }), PROD, 'Node: production');
  // no development override on a preview (localhost only)
  assert.equal(resolveEndpoint({ loc: loc(PREVIEW, { search: '?angleDev=8790' }) }), STAGING);
  // strict both ways: each host only on its own allow-list
  assert.equal(resolveEndpoint({ configured: PROD, loc: loc(PREVIEW) }), null, 'a preview never reaches the production Worker');
  assert.equal(resolveEndpoint({ configured: STAGING, loc: loc('app.hushmallow.com') }), null, 'production never reaches staging');
  for (const bad of [`http://${STAGING.slice(8)}`, `${STAGING}/?x=1`, `${STAGING}#a`, `https://u:p@${STAGING.slice(8)}`, 'https://evil.example', '', null]) {
    assert.equal(resolveEndpoint({ configured: bad, loc: loc(PREVIEW) }), null, String(bad));
  }
  // the privacy copy follows the endpoint, so a preview reads as "live" (the words go to our staging server after consent)
  assert.match(read('src/app/privacy.js'), /resolveEndpoint/);
});

// ---------------------------------------------------------------- billing --
test('billing: on (Stripe, the staging Worker) on a preview only; off on production hosts, the GitHub Pages copy and localhost', () => {
  for (const h of PREVIEWS) assert.deepEqual(resolveBilling({ loc: loc(h), session: null }), { provider: 'stripe', endpoint: STAGING }, h);
  for (const h of PRODUCTION_HOSTS) assert.equal(resolveBilling({ loc: loc(h), session: null }), null, h);
  assert.equal(resolveBilling({ loc: loc('localhost', { protocol: 'http:' }), session: null }), null, 'localhost without ?billingDev: off, as before');
  assert.deepEqual(resolveBilling({ loc: loc('localhost', { protocol: 'http:', search: '?billingDev=8790' }), session: null }), { provider: 'stripe', endpoint: 'http://localhost:8790' });
  assert.equal(resolveBilling({ session: null }), null, 'Node: production, off');
  // ?billingDev only on localhost; a preview cannot be pointed anywhere else
  assert.deepEqual(resolveBilling({ loc: loc(PREVIEW, { search: '?billingDev=8790' }), session: null }), { provider: 'stripe', endpoint: STAGING });
  assert.equal(resolveBilling({ endpoint: PROD, loc: loc(PREVIEW), session: null }), null, 'a preview never bills through production');
  assert.equal(resolveBilling({ provider: 'stripe', endpoint: STAGING, loc: loc('app.hushmallow.com'), session: null }), null, 'production never bills through staging');
  // createBilling as main.js calls it: needs sign-in (a web plan belongs to an account)
  const auth = { enabled: true, status: () => 'guest', load: async () => ({ accessToken: async () => null }) };
  const on = createBilling({ auth: () => auth, signIn: true, config: resolveBilling({ loc: loc(PREVIEW), session: null }) });
  assert.equal(on.endpoint, STAGING);
  assert.equal(createBilling({ auth: () => auth, signIn: false, config: resolveBilling({ loc: loc(PREVIEW), session: null }) }), null, 'no sign-in: off');
  assert.equal(createBilling({ auth: () => auth, signIn: true, config: resolveBilling({ loc: loc('app.hushmallow.com'), session: null }) }), null, 'production: off');
  // main.js builds it with no config of its own: resolveBilling() reads the page's location
  assert.match(read('src/app/main.js'), /const billing = createBilling\(\{ auth: \(\) => app\.auth, signIn: !!AUTH\.config\.enabled && !AUTH\.forwarding \}\);/);
});

// ----------------------------------------------------------------- prices --
test('prices: ONE config object (BILLING_PRICES) with the owner\'s US-dollar prices, marked display only; shown only where billing is on', () => {
  assert.deepEqual({ ...BILLING_PRICES }, PRICES);
  assert.ok(Object.isFrozen(BILLING_PRICES));
  const cfg = read('src/app/config.js');
  assert.match(cfg, /THE OWNER'S PRICES[\s\S]{0,80}DISPLAY\s+\*?\s*ONLY: Stripe Checkout always charges what Stripe holds/);
  assert.doesNotMatch(cfg, /'A\$\d/, 'no Australian-dollar price is left');
  // nowhere else: no amount in the code that shows or sells a plan
  for (const f of ['src/app/scenes/plans.js', 'src/app/billing.js', 'src/app/scenes/settings.js', 'src/app/entitlements.js', 'src/app/main.js']) assert.doesNotMatch(read(f), /(?:US|A)\$\d/, f);
  // where billing is on (a preview), the plans page's prices are exactly these; where it is off there are none
  const auth = { enabled: true, status: () => 'guest', load: async () => ({ accessToken: async () => null }) };
  const billing = createBilling({ auth: () => auth, signIn: true, config: resolveBilling({ loc: loc(PREVIEW), session: null }) });
  assert.deepEqual(billing.prices(), PRICES);
  const ent = createEntitlements({ store: createStore({ backend: 'memory' }), billing });
  assert.deepEqual(ent.prices(), PRICES);
  const off = createEntitlements({ store: createStore({ backend: 'memory' }), billing: createBilling({ auth: () => auth, signIn: true, config: resolveBilling({ loc: loc('app.hushmallow.com'), session: null }) }) });
  assert.equal(off.prices, undefined, 'production: no web prices while billing is off there');
  // the plans page reads ent.prices() and nothing else
  assert.match(read('src/app/scenes/plans.js'), /Promise\.resolve\(typeof ent\.prices === 'function' \? ent\.prices\(\) : null\)/);
});

// ------------------------------------------------------- the rendered pages --
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1;
    this.children = []; this.attrs = {}; this.style = {}; this.listeners = {}; this.parentNode = null; this.textContent = ''; this.disabled = false; this.hidden = false;
    const cls = new Set();
    this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), toggle: (c, on) => { if (on ?? !cls.has(c)) cls.add(c); else cls.delete(c); }, contains: (c) => cls.has(c) };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  toggleAttribute(k, on) { if (on) this.attrs[k] = ''; else delete this.attrs[k]; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener() {}
  append(...kids) { for (const k of kids) { k.parentNode = this; this.children.push(k); } }
  appendChild(k) { this.append(k); return k; }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
  focus() {}
}
const text = (n) => (n.nodeType === 3 ? n.textContent : (n.children || []).map(text).join('') || n.textContent || '');
const all = (n, out = []) => { out.push(n); for (const c of n.children || []) all(c, out); return out; };
const tick = () => new Promise((r) => setTimeout(r, 0));
const prev = { document: globalThis.document, location: globalThis.location, raf: globalThis.requestAnimationFrame };
after(() => {
  for (const [k, v] of [['document', prev.document], ['location', prev.location], ['requestAnimationFrame', prev.raf]]) {
    if (v === undefined) delete globalThis[k]; else globalThis[k] = v;
  }
});
function installDom(hostname) {
  globalThis.document = {
    createElement: (t) => new FakeEl(t), createElementNS: (_, t) => new FakeEl(t),
    createTextNode: (t) => Object.assign(new FakeEl('#text'), { textContent: String(t) }),
    addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    getElementById: () => null, head: new FakeEl('head'), body: new FakeEl('body'), documentElement: new FakeEl('html'),
  };
  globalThis.location = loc(hostname, { protocol: ['localhost', '127.0.0.1'].includes(hostname) ? 'http:' : 'https:' });
  globalThis.requestAnimationFrame ||= (fn) => setTimeout(fn, 0);
}
const world = { dim() {}, showMallow() {}, place() {}, setStage() {}, react() {}, fitBetween() {}, setMallow: async () => {}, mallowId: 'boppo' };

test('the plans page on a preview shows the provisional prices under each plan, monthly and yearly', async () => {
  installDom(PREVIEW);
  const auth = { enabled: true, status: () => 'signed-in', load: async () => ({ accessToken: async () => 'tok.en.sig' }) };
  const billing = createBilling({ auth: () => auth, signIn: true, fetchImpl: async () => { throw new TypeError('offline'); } });
  assert.equal(billing.endpoint, STAGING, 'from the page\'s own location');
  const ent = createEntitlements({ store: createStore({ backend: 'memory' }), billing });
  const { default: plans } = await import('../src/app/scenes/plans.js');
  const app = { ent, world, state: {}, haptic() {}, audio: { ui() {} }, go() {}, back() {} };
  const view = plans(app, {});
  await view.enter().catch(() => {});
  await tick();
  const priceLines = () => all(view.el).filter((n) => n.attrs?.class === 'invite-price').map((n) => [n.textContent, n.hidden]);
  assert.deepEqual(priceLines(), [['US$9.99 a month', false], ['US$19.99 a month', false]], 'Flow, then Beyond');
  const yearly = all(view.el).find((n) => n.tagName === 'BUTTON' && text(n) === 'Yearly');
  yearly.listeners.click[0]({ currentTarget: yearly });
  assert.deepEqual(priceLines(), [['US$99.99 a year', false], ['US$199.99 a year', false]]);
  view.leave();
});

test('Settings\' version line says "staging" on a preview, and only there', async () => {
  const { default: settings } = await import('../src/app/scenes/settings.js');
  const versionLine = (hostname) => {
    installDom(hostname);
    const prefs = { get: (k) => ({ textScale: 1, subtitleSpeed: 1, motion: 'system', volume: 0.6 })[k] ?? false, set() {} };
    const ent = { tier: () => 'none', source: () => 'none', isWeb: false, has: () => false, webSignedIn: () => false, cancelTest() {} };
    const app = { prefs, ent, world, rec: {}, store: createStore({ backend: 'memory' }), auth: null, haptic() {}, go() {}, back() {} };
    const view = settings(app);
    const el = view.el || view;
    const p = all(el).find((n) => n.attrs && 'data-version' in n.attrs);
    return text(p);
  };
  const base = `Version ${BUILD}`;
  assert.equal(versionLine(PREVIEW), `${base} · staging`);
  for (const h of ['app.hushmallow.com', 'hushmallow.pages.dev', 'ramkumarjothi1982.github.io', 'localhost']) assert.equal(versionLine(h), base, h);
  // BUILD itself (sent to the server as app_version) is unchanged
  assert.equal(BUILD, '2026-10-13 · Hushfold pilot + optional sign-in');
  await tick();
});

// ---------------------------------------------------------------- headers --
test('_headers: a preview\'s CSP names the staging Worker instead of production; app.hushmallow.com and hushmallow.pages.dev keep exactly today\'s policy', () => {
  const SUPA = new URL(PROJECT_URL).origin;
  const text = headersFile(SUPA, { version: '0123abcd' });
  const rules = parseHeadersFile(text);
  const csp = (host, path = '/') => headersFor(rules, path, { host }).get('content-security-policy').value;
  const connect = (v) => v.split(',').map((p) => (/connect-src ([^;]+)/.exec(p) || [])[1]);
  const prodPolicy = csp(null);
  for (const h of ['app.hushmallow.com', 'hushmallow.pages.dev', 'hushmallow.com', 'a.b.hushmallow.pages.dev', '127.0.0.1:8204']) assert.equal(csp(h), prodPolicy, h);
  assert.deepEqual(connect(prodPolicy), [`'self' ${SUPA} wss://igbxbfuaoybfzsroxuln.supabase.co ${PROD}`]);
  for (const h of PREVIEWS) {
    const v = csp(h);
    assert.deepEqual(connect(v), [`'self' ${SUPA} wss://igbxbfuaoybfzsroxuln.supabase.co ${STAGING}`], h);
    // the same policy otherwise, word for word
    assert.equal(v.replace(STAGING, PROD), prodPolicy, h);
    // /auth/* keeps its own (stricter) policy on top
    const auth = csp(h, '/auth/callback/').split(',');
    assert.equal(auth.length, 2, h);
    assert.match(auth[1], /frame-ancestors 'none'/);
    assert.ok(!auth[0].includes(PROD) && auth[0].includes(STAGING));
  }
  // the rule: one host placeholder (one DNS label, as Pages matches it), "!" before the new policy, before /auth/*
  assert.equal(PREVIEW_PATTERN, 'https://:preview.hushmallow.pages.dev/*');
  const lines = text.split('\n');
  const at = lines.indexOf(PREVIEW_PATTERN);
  assert.ok(at > lines.indexOf('/*') && at < lines.indexOf('/auth/*'), 'after the whole-site rule, before /auth/*');
  assert.equal(lines[at + 1], '  ! Content-Security-Policy');
  assert.match(lines[at + 2], /^ {2}Content-Security-Policy: default-src 'self'; /);
  assert.equal(lines.filter((l) => /^ {2}! /.test(l)).length, 1, '"!" only here');
  // Pages substitutes ":name" placeholders in values: the policy holds none
  assert.doesNotMatch(lines[at + 2], /:(preview|splat)\b/);
  assert.throws(() => previewRule({ pattern: 'https://*.hushmallow.pages.dev/*', angle: [STAGING] }), /bad preview pattern/);
  assert.deepEqual(previewRule({ pattern: PREVIEW_PATTERN, angle: [] }), [], 'no staging Worker: no rule');
  // the synthetic monitor (tools/ops/monitor.mjs) checks the production domain: it still expects production's policy
  assert.equal(headersFor(rules, '/').get('content-security-policy').value, prodPolicy);
  assert.ok(!prodPolicy.includes('staging'));
});
