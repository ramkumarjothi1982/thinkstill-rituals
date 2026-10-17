// The upgrade end to end, both halves at once (the owner's request of 2026-10-17), offline: the app's OWN billing code
// (hushmallow/src/app/billing.js, entitlements.js, plan-change.js, the plans page's upgrade rule) driving the REAL
// staging Worker (src/app.js, run as the staging Worker runs: test/staging-loader.js, stagingWorkerEnv) against the
// in-memory Stripe sandbox (test/billing-sandbox.js), which checks each portal session as Stripe does. "The customer
// confirms on Stripe's page" is the sandbox applying exactly the change that portal session asked for, and "Stripe
// sends them back" is the session's own after_completion (or top-level) return URL, read by the app's takeReturn:
// nothing between the two halves is written twice here. The app's screens are recorded instead of drawn (the
// confirmation's UI is plan-change.js's `ui` seam; the screens themselves are hushmallow/tests/upgrade-*.test.mjs).
//
// Covered: Flow → Beyond monthly and Beyond monthly → yearly (Stripe's confirm page for exactly that change, the
// calm "Confirming…" first, the welcome only after the Worker has read the subscription from Stripe, the webhook
// held back meanwhile and landing late without undoing it); back-navigation (Stripe's return link: no change, "No
// change made"); a return before Stripe has the change (never a welcome, then confirmed later); a failed upgrade
// payment (no success, the card line, Manage subscription still opens its home); an abandoned upgrade; repeat taps
// and a reload mid-confirmation; Stripe's plan chooser; the refusals as the plans page reads them; cancelling from
// Settings → Manage subscription (the portal's home, cancel at the period end, "Ends on …"); the paths, bodies,
// codes and the status body's period agreeing; and production's app having no web billing at all.

import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadAsStaging, STAGING_PROJECT } from './staging-loader.js';

loadAsStaging();
const { createApp } = await import('../src/app.js');
const { createMockProvider } = await import('../src/providers/mock.js');
const { signWebhookPayload, formEncode } = await import('../src/billing/stripe.js');
const { PATHS: SERVER_PATHS, PORTAL_RETURN, planChange } = await import('../src/billing/routes.js');
const { SYSTEM_PROMPT, CLOCK_START, allowAll } = await import('./helpers.js');
const F = await import('./billing-fixtures.js');
const { sandbox } = await import('./billing-sandbox.js');
const { STAGING_WORKER } = await import('../scripts/billing-e2e.mjs');
const client = (p) => import(new URL(`../../../src/${p}`, import.meta.url).href);
const B = await client('app/billing.js');
const E = await client('app/entitlements.js');
const PC = await client('app/plan-change.js');
const { isUpgrade, changeFor } = await client('app/scenes/plans.js');
const { welcomeKind } = await client('app/scenes/beyond-welcome.js');
const { createStore } = await client('engine/storage.js');

const PREVIEW = F.STAGING_APP;
const ROUTES_SRC = readFileSync(new URL('../src/billing/routes.js', import.meta.url), 'utf8');
/** The driver's own Stripe key, built at run time (the sandbox takes any test key). */
const KEY = F.stripeKey('rk_test', 'u');

// this tab's sessionStorage (plan-change.js keeps the change on its way there; billing.js forgets it on a new trip)
const hadSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
function memSession() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
beforeEach(() => { Object.defineProperty(globalThis, 'sessionStorage', { value: memSession(), configurable: true, writable: true }); PC.resetPlanChange(); });
after(() => { if (hadSession) Object.defineProperty(globalThis, 'sessionStorage', hadSession); else delete globalThis.sessionStorage; });

/**
 * The staging Worker, its sign-in project (one account), the sandbox, and the app's billing client as the preview
 * builds it (createBilling with the staging Worker as its endpoint, the browser's Origin on every call), on one
 * clock that moves only when the app waits. webhooks: 'on' (delivered at once) or 'held' (kept until release()).
 */
function world() {
  let t = CLOCK_START;
  const now = () => t;
  /** @type {string[]} */
  const logs = [];
  /** what happened, in order: the app's calls and the Worker's answers, and what the app said */
  /** @type {any[]} */
  const seq = [];
  const token = F.jwt(F.UID, { exp: Math.floor(t / 1000) + 30 * 86400, iss: `${STAGING_PROJECT}/auth/v1` });
  const env = F.stagingWorkerEnv({ BILLING_IP_LIMITER: allowAll() });
  /** @type {any[]} */
  const held = [];
  let hold = false;
  /** @param {URL} url @param {RequestInit} init */
  async function project(url, init) {
    const h = new Headers(init.headers);
    const reply = (/** @type {number} */ status, /** @type {unknown} */ body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (h.get('apikey') !== F.PK) return reply(401, { message: 'No API key found in request' });
    if (url.pathname === '/auth/v1/user' && h.get('authorization') === `Bearer ${token}`) return reply(200, { id: F.UID, email: 'e2e-u@example.com', is_anonymous: false });
    return reply(403, { code: 403, error_code: 'bad_jwt' });
  }
  const route = async (/** @type {any} */ u, /** @type {RequestInit} */ init = {}) => {
    const url = new URL(String(u));
    if (url.origin === 'https://api.stripe.com') return box.fetch(url, init);
    if (url.origin === STAGING_PROJECT) return project(url, init);
    throw new TypeError(`unexpected host ${url.host}`);
  };
  const app = createApp({ systemPrompt: SYSTEM_PROMPT, provider: createMockProvider({ mode: 'heuristic' }), now, log: (l) => logs.push(l), fetch: route });
  const deliverNow = async (/** @type {any} */ ev) => {
    const payload = JSON.stringify(ev);
    const sig = await signWebhookPayload(payload, F.WHSEC, Math.floor(t / 1000));
    return app.fetch(new Request(`${STAGING_WORKER}/v1/billing/webhook`, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', 'stripe-signature': sig }, body: payload }), env);
  };
  const box = sandbox({ now, worker: STAGING_WORKER, deliver: async (ev) => (hold ? (held.push(ev), new Response(null, { status: 503 })) : deliverNow(ev)) });

  /** The browser's fetch on the preview: only ever the staging Worker, with the page's Origin. */
  const browserFetch = async (/** @type {any} */ url, /** @type {RequestInit} */ init = {}) => {
    const u = new URL(String(url));
    assert.equal(u.origin, STAGING_WORKER, 'the preview\'s app only ever calls the staging Worker');
    const res = await app.fetch(new Request(u, { ...init, headers: { ...(/** @type {any} */ (init.headers) || {}), origin: PREVIEW } }), env);
    const json = await res.clone().json().catch(() => null);
    seq.push({ kind: 'server', path: u.pathname, method: init.method || 'GET', body: init.body ? JSON.parse(String(init.body)) : null, status: res.status, json });
    return res;
  };
  /** @type {string[]} */
  const navs = [];
  const auth = { enabled: true, status: () => 'signed-in', load: async () => ({ accessToken: async () => token }) };
  const billing = B.createBilling({ auth, signIn: true, config: B.resolveBilling({ loc: new URL(`${PREVIEW}/`) }), shell: false, fetchImpl: browserFetch, nav: (u) => { navs.push(u); seq.push({ kind: 'nav', url: u }); } });
  assert.ok(billing, 'web billing is on for the preview');
  const ent = E.createEntitlements({ store: createStore({ backend: 'memory' }), billing, now });
  /** @type {string[]} */
  const toasts = [];
  const went = [];
  const appShell = { ent, toast: (/** @type {string} */ s) => toasts.push(s), go: (...a) => went.push(a) };
  /** The confirmation's UI (plan-change.js's seam), recorded in `seq` with the Worker's answers. */
  const ui = {
    confirming: () => { seq.push({ kind: 'ui', ev: 'confirming' }); return { say: (/** @type {string} */ s, _ms, st) => seq.push({ kind: 'ui', ev: 'say', text: s, state: st }), close: () => seq.push({ kind: 'ui', ev: 'close' }) }; },
    say: (/** @type {string} */ s, _ms, st) => seq.push({ kind: 'ui', ev: 'say', text: s, state: st }),
    welcome: (/** @type {any} */ r) => { seq.push({ kind: 'ui', ev: 'welcome', result: r }); },
    paymentIssue: (/** @type {string} */ line) => seq.push({ kind: 'ui', ev: 'payment', text: line }),
  };
  /** The app's waits pass on this clock (the sandbox's deliveries land in between). */
  const sleep = async (/** @type {number} */ ms) => { await box.drain(); t += ms; await box.drain(); };
  /** Stripe's API with the driver's key: what the customer (or the dashboard) does there. */
  async function stripe(/** @type {string} */ method, /** @type {string} */ path, params = {}) {
    const res = await box.fetch(new URL(`https://api.stripe.com${path}`), { method, headers: { authorization: `Bearer ${KEY}` }, ...(method === 'POST' ? { body: formEncode(params) } : {}) });
    await box.drain();
    const body = await res.json();
    assert.ok(res.ok, `${method} ${path}: ${res.status} ${JSON.stringify(body).slice(0, 160)}`);
    return body;
  }
  /** E2E's account on hushmallow Flow monthly, paid with the visa test card, recorded by the webhook; the app has heard. */
  async function flowMonthly() {
    const cus = await stripe('POST', '/v1/customers', { metadata: { user_id: F.UID } });
    const pm = await stripe('POST', '/v1/payment_methods/pm_card_visa/attach', { customer: cus.id });
    await stripe('POST', `/v1/customers/${cus.id}`, { invoice_settings: { default_payment_method: pm.id } });
    const sub = await stripe('POST', '/v1/subscriptions', { customer: cus.id, items: [{ price: F.PRICES.paidMonthly }], metadata: { user_id: F.UID } });
    assert.equal(sub.status, 'active');
    await ent.refresh({ force: true });
    assert.deepEqual(PC.planOf(ent), { tier: 'paid', period: 'monthly', status: 'active' });
    return { cus: cus.id, sub: sub.id };
  }
  /** The portal session the Worker made last, as Stripe received it. */
  const lastSession = () => box.s.portalSessions.at(-1);
  /** The customer presses Confirm on Stripe's page: exactly that session's change, at Stripe (prorated at once, D8). → where Stripe sends them. */
  async function confirmOnStripe(session = lastSession()) {
    const f = session.form;
    assert.equal(f.get('flow_data[type]'), 'subscription_update_confirm');
    const k = (/** @type {string} */ x) => f.get(`flow_data[subscription_update_confirm]${x}`);
    await stripe('POST', `/v1/subscriptions/${k('[subscription]')}`, { items: [{ id: k('[items][0][id]'), price: k('[items][0][price]') }], proration_behavior: 'always_invoice' });
    assert.equal(f.get('flow_data[after_completion][type]'), 'redirect');
    return /** @type {string} */ (f.get('flow_data[after_completion][redirect][return_url]'));
  }
  /** Back on the preview at `href`: the app's own takeReturn, as main.js calls it at start. */
  function arrive(/** @type {string} */ href) {
    const u = new URL(href);
    assert.equal(u.origin, PREVIEW, 'Stripe sends them back to the preview (the staging Worker\'s APP_ORIGIN), never the portal\'s home');
    const hist = { state: null, replaced: /** @type {string[]} */ ([]), replaceState(_s, _t, url) { this.replaced.push(url); } };
    const back = B.takeReturn({ loc: { href }, hist });
    assert.ok(!/[?&](billing|to|session_id)=/.test(hist.replaced.at(-1) || ''), 'the way back is taken out of the address at once');
    return back;
  }
  return {
    app, env, box, logs, seq, navs, toasts, went, ent, billing, appShell, ui, sleep, stripe, flowMonthly, lastSession, confirmOnStripe, arrive,
    now, hold: () => { hold = true; }, release: async () => { hold = false; for (const ev of held.splice(0)) await deliverNow(ev); await box.drain(); },
    heldCount: () => held.length,
    status: async () => (await app.fetch(new Request(`${STAGING_WORKER}/v1/billing/status`, { headers: { authorization: `Bearer ${token}`, origin: PREVIEW } }), env)).json(),
  };
}
const uiOf = (w) => w.seq.filter((x) => x.kind === 'ui');
const serverOf = (w, path) => w.seq.filter((x) => x.kind === 'server' && (!path || x.path === path));
/** The welcome is said only after an answer of the Worker's that read Stripe and shows exactly the target, active. */
function assertWelcomeAfterStripe(w, from, to) {
  const ev = w.seq;
  const iConfirming = ev.findIndex((x, i) => i >= from && x.kind === 'ui' && x.ev === 'confirming');
  const iWelcome = ev.findIndex((x, i) => i >= from && x.kind === 'ui' && x.ev === 'welcome');
  assert.ok(iConfirming >= 0 && iWelcome > iConfirming, '"Confirming…" first, the welcome after it');
  const [plan, period] = to.split('.');
  const iConfirmed = ev.findIndex((x, i) => i > from && x.kind === 'server' && x.path === B.PATHS.sync && x.status === 200 && x.json?.tier === plan && x.json?.period === period && x.json?.status === 'active');
  assert.ok(iConfirmed > from && iConfirmed < iWelcome, 'the Worker read the subscription from Stripe (sync {}) and said the new plan, active, before the welcome');
  for (const x of ev.slice(from, iConfirmed)) if (x.kind === 'ui') assert.notEqual(x.ev, 'welcome');
  return ev[iWelcome].result;
}

// ---------------------------------------------------------------------- the contract --
test('the two halves agree: the app\'s four paths are the Worker\'s, its refusal codes are the portal route\'s, its upgrade rule is the server\'s, its return kinds are the Worker\'s return URLs', () => {
  for (const [k, p] of Object.entries(B.PATHS)) assert.equal(SERVER_PATHS[k], p, k);
  const messages = /const PORTAL_MESSAGES = Object\.freeze\(\{([\s\S]*?)\}\);/.exec(ROUTES_SRC)?.[1] || '';
  const codes = [...messages.matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]);
  for (const c of B.CHANGE_CODES) assert.ok(codes.includes(c), `${c} is one of the portal route's codes`);
  // every other code the route answers is read as no plan to change (404), the account (401), or a failure
  assert.deepEqual(codes.filter((c) => !B.CHANGE_CODES.includes(c)).sort(), ['billing_unavailable', 'no_subscription', 'not_yours']);
  const SLOTS = ['paid.monthly', 'paid.yearly', 'ultra.monthly', 'ultra.yearly'].map((s) => { const [plan, period] = s.split('.'); return { plan, period }; });
  for (const from of SLOTS) for (const to of SLOTS) {
    const rule = planChange(from, to);
    assert.equal(isUpgrade(from, to), rule === 'upgrade', `${from.plan}.${from.period} → ${to.plan}.${to.period}`);
    assert.equal(changeFor(from, to), rule === 'same' ? 'held' : rule === 'not_an_upgrade' ? 'change' : to.plan === from.plan ? 'yearly' : 'upgrade');
  }
  for (const [k, v] of Object.entries(PORTAL_RETURN)) {
    const kind = new URLSearchParams(v.slice(2)).get('billing');
    assert.ok(B.RETURN_KINDS.includes(kind), `${k}: ${kind}`);
  }
  for (const to of ['paid.yearly', 'ultra.monthly', 'ultra.yearly']) assert.match(to, B.PLAN_TO);
  // production's app has no web billing at all (production stays as it is until the owner approves); the preview's is the staging Worker
  assert.equal(B.resolveBilling({ loc: new URL('https://app.hushmallow.com/') }), null);
  assert.deepEqual(B.resolveBilling({ loc: new URL(`${PREVIEW}/`) }), { provider: 'stripe', endpoint: STAGING_WORKER });
});

// ------------------------------------------------------- Flow → Beyond → yearly --
test('Flow monthly → Beyond monthly → Beyond yearly: Stripe\'s page confirming exactly that change, back to the preview, "Confirming…", then the welcome only once the Worker has read it from Stripe (the webhook late)', async () => {
  const w = world();
  const { sub } = await w.flowMonthly();
  // the plans page, holding Flow monthly: Beyond's card is an upgrade, Flow's yearly card "Switch to yearly"
  const held = { plan: 'paid', period: 'monthly' };
  assert.equal(changeFor(held, { plan: 'ultra', period: 'monthly' }), 'upgrade');
  assert.equal(changeFor(held, { plan: 'paid', period: 'yearly' }), 'yearly');
  const before = B.planNow(w.ent);
  const from = w.seq.length;
  const r = await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' });
  assert.deepEqual(r, { redirecting: true, to: 'ultra.monthly' });
  // what the app sent and what the Worker answered
  const ask = serverOf(w, B.PATHS.portal).at(-1);
  assert.deepEqual(ask.body, { intent: 'upgrade', plan: 'ultra', period: 'monthly' });
  assert.equal(ask.status, 200);
  assert.equal(ask.json.flow, 'subscription_update_confirm');
  assert.equal(ask.json.to, 'ultra.monthly');
  assert.equal(w.navs.at(-1), ask.json.url);
  assert.match(w.navs.at(-1), /^https:\/\/billing\.stripe\.com\/p\/session\/test_/);
  // what Stripe received: its confirm flow for the subscription's one item, Beyond monthly, back to the preview
  const s1 = w.lastSession();
  assert.equal(s1.flow, 'subscription_update_confirm');
  const f = Object.fromEntries(s1.form);
  const item = w.box.s.subs.get(sub).items.data[0].id;
  assert.deepEqual(f, {
    customer: w.box.s.subs.get(sub).customer, return_url: `${PREVIEW}/?billing=unchanged`,
    'flow_data[type]': 'subscription_update_confirm', 'flow_data[subscription_update_confirm][subscription]': sub,
    'flow_data[subscription_update_confirm][items][0][id]': item, 'flow_data[subscription_update_confirm][items][0][price]': F.PRICES.ultraMonthly,
    'flow_data[subscription_update_confirm][items][0][quantity]': '1',
    'flow_data[after_completion][type]': 'redirect', 'flow_data[after_completion][redirect][return_url]': `${PREVIEW}/?billing=changed&to=ultra.monthly`,
  });
  // asking changed nothing
  assert.equal(w.box.s.subs.get(sub).items.data[0].price.id, F.PRICES.paidMonthly);
  assert.equal((await w.status()).tier, 'paid');

  // the customer confirms; the webhook is held back (it lands later); Stripe sends them to the preview
  w.hold();
  const back = w.arrive(await w.confirmOnStripe(s1));
  assert.deepEqual(back, { kind: 'changed', sessionId: null, to: 'ultra.monthly' });
  assert.ok(w.heldCount() > 0, 'Stripe\'s events are still on their way');
  assert.equal(await B.welcomeBack(w.appShell, back, { before, sleep: w.sleep, change: { ui: w.ui, now: w.now } }), 'confirmed');
  const result = assertWelcomeAfterStripe(w, from, 'ultra.monthly');
  assert.deepEqual({ tier: result.tier, period: result.period, to: result.to }, { tier: 'ultra', period: 'monthly', to: 'ultra.monthly' });
  assert.equal(welcomeKind(result), 'beyond', 'the full welcome, with the Mallows');
  assert.deepEqual(uiOf(w).map((x) => x.ev), ['confirming', 'close', 'welcome']);
  assert.equal(w.ent.tier(), 'ultra');
  assert.deepEqual(PC.planOf(w.ent), { tier: 'ultra', period: 'monthly', status: 'active' });
  // the webhook lands late: nothing goes back
  await w.release();
  const st = await w.status();
  assert.deepEqual([st.tier, st.period, st.status], ['ultra', 'monthly', 'active']);
  await w.ent.refresh({ force: true });
  assert.equal(w.ent.tier(), 'ultra');
  // a reload, or Back onto the same way back: the welcome is never said twice
  const n = w.seq.length;
  assert.equal(await B.welcomeBack(w.appShell, w.arrive(`${PREVIEW}/?billing=changed&to=ultra.monthly`), { before: B.planNow(w.ent), sleep: w.sleep, change: { ui: w.ui, now: w.now } }), 'repeat');
  assert.ok(!w.seq.slice(n).some((x) => x.kind === 'ui'));

  // Beyond monthly → yearly: the Beyond card's "Switch to yearly"
  assert.equal(changeFor({ plan: 'ultra', period: 'monthly' }, { plan: 'ultra', period: 'yearly' }), 'yearly');
  const before2 = B.planNow(w.ent);
  const from2 = w.seq.length;
  assert.deepEqual(await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'yearly' }), { redirecting: true, to: 'ultra.yearly' });
  const s2 = w.lastSession();
  assert.equal(s2.form.get('flow_data[subscription_update_confirm][items][0][price]'), F.PRICES.ultraYearly);
  assert.equal(s2.form.get('flow_data[after_completion][redirect][return_url]'), `${PREVIEW}/?billing=changed&to=ultra.yearly`);
  const back2 = w.arrive(await w.confirmOnStripe(s2));
  assert.equal(await B.welcomeBack(w.appShell, back2, { before: before2, sleep: w.sleep, change: { ui: w.ui, now: w.now } }), 'confirmed');
  const r2 = assertWelcomeAfterStripe(w, from2, 'ultra.yearly');
  assert.equal(welcomeKind(r2), 'plan', 'the smaller welcome: "You\'re on hushmallow Beyond, yearly"');
  assert.equal(w.ent.webPlan().period, 'yearly');
  assert.ok(w.ent.webPlan().periodEnd - w.now() > 360 * 86400000, 'a year-long period, from Stripe');
  // nothing was ever asked of the portal's home on the way
  assert.ok(w.box.s.portalSessions.every((s) => s.flow === 'subscription_update_confirm'));
  F.assertClean(w.logs);
});

test('a way back before Stripe has the change (or a hand-made address): "Confirming…", then a neutral line, never a welcome; once Stripe has it, a quiet check confirms it', async () => {
  const w = world();
  await w.flowMonthly();
  const before = B.planNow(w.ent);
  await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' });
  const s1 = w.lastSession();
  // back on ?billing=changed&to=ultra.monthly without the change at Stripe
  const back = w.arrive(String(s1.form.get('flow_data[after_completion][redirect][return_url]')));
  assert.equal(await B.welcomeBack(w.appShell, back, { before, sleep: w.sleep, change: { ui: w.ui, now: w.now } }), 'timeout');
  assert.deepEqual(uiOf(w).map((x) => x.ev), ['confirming', 'say']);
  assert.equal(uiOf(w)[1].text, PC.CHANGE_LINES.timeout('hushmallow Flow (monthly)'));
  assert.doesNotMatch(uiOf(w)[1].text, /still confirming/);
  assert.ok(serverOf(w, B.PATHS.sync).length >= PC.CONFIRM_WAITS.length, 'the Worker was asked at each wait');
  assert.ok(serverOf(w, B.PATHS.sync).every((x) => x.status === 200 && x.json.tier === 'paid' && x.json.period === 'monthly'), 'and said Flow monthly each time');
  assert.equal(w.ent.tier(), 'paid');
  assert.equal(PC.pendingChange({ now: w.now() })?.state, 'quiet');
  // now the customer confirms (the tab was still open on Stripe's page); the app comes back on screen: a quiet check
  await w.confirmOnStripe(s1);
  const n = w.seq.length;
  assert.equal(await PC.resumeChange(w.appShell, { quiet: true, ui: w.ui, now: w.now, sleep: w.sleep }), 'confirmed');
  const said = w.seq.slice(n).filter((x) => x.kind === 'ui');
  assert.deepEqual(said.map((x) => x.ev), ['welcome'], 'quiet: no "Confirming…" line, the welcome once Stripe has it');
  assert.equal(said[0].result.tier, 'ultra');
});

// --------------------------------------------------------------- back-navigation --
test('back-navigation: Stripe\'s return link instead of Confirm → "No change made. You\'re still on hushmallow Flow.", nothing changed at Stripe or on the Worker', async () => {
  const w = world();
  const { sub } = await w.flowMonthly();
  const before = B.planNow(w.ent);
  await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' });
  const s1 = w.lastSession();
  const back = w.arrive(s1.return_url);
  assert.deepEqual(back, { kind: 'unchanged', sessionId: null });
  assert.equal(await B.welcomeBack(w.appShell, back, { before, sleep: w.sleep, change: { ui: w.ui, now: w.now } }), 'unchanged');
  assert.deepEqual(uiOf(w), [{ kind: 'ui', ev: 'say', text: 'No change made. You’re still on hushmallow Flow.', state: 'unchanged' }]);
  assert.equal(w.box.s.subs.get(sub).items.data[0].price.id, F.PRICES.paidMonthly);
  assert.deepEqual(PC.planOf(w.ent), { tier: 'paid', period: 'monthly', status: 'active' });
  assert.equal((await w.status()).tier, 'paid');
  // and the plans page offers the upgrade again, which opens again
  assert.deepEqual(await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' }), { redirecting: true, to: 'ultra.monthly' });
});

// ------------------------------------------------------------------ failed payment --
test('a failed upgrade payment: never a success; the card line with Manage subscription; another upgrade is refused (payment_issue) and Manage subscription still opens the portal\'s home', async () => {
  const w = world();
  const { cus, sub } = await w.flowMonthly();
  // the card on file now fails (4000 0000 0000 0341: saved, then the next charge fails)
  const bad = await w.stripe('POST', '/v1/payment_methods/pm_card_chargeCustomerFail/attach', { customer: cus });
  await w.stripe('POST', `/v1/customers/${cus}`, { invoice_settings: { default_payment_method: bad.id } });
  const before = B.planNow(w.ent);
  await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' });
  const back = w.arrive(await w.confirmOnStripe());
  assert.equal(w.box.s.subs.get(sub).status, 'past_due', 'the sandbox: the price changed, its invoice failed');
  assert.equal(await B.welcomeBack(w.appShell, back, { before, sleep: w.sleep, change: { ui: w.ui, now: w.now } }), 'payment_issue');
  const said = uiOf(w);
  assert.deepEqual(said.map((x) => x.ev), ['confirming', 'close', 'payment']);
  assert.equal(said[2].text, PC.CHANGE_LINES.paymentIssueNew);
  assert.ok(!said.some((x) => x.ev === 'welcome'));
  assert.equal(PC.pendingChange({ now: w.now() }), null, 'nothing kept to say later');
  // the plans page: another upgrade is refused by the Worker before Stripe is asked
  const sessions = w.box.s.portalSessions.length;
  assert.deepEqual(await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'yearly' }), { failed: true, reason: 'payment_issue' });
  assert.equal(w.box.s.portalSessions.length, sessions);
  // Settings → Manage subscription: the portal's home (the card, or cancel)
  assert.deepEqual(await w.ent.manage(), { redirecting: true });
  assert.equal(w.lastSession().flow, null);
  assert.equal(w.lastSession().return_url, `${PREVIEW}/?billing=portal`);
});

// ------------------------------------------------ abandoned, repeat taps, reloads --
test('abandoned, repeated and reloaded: an upgrade left on Stripe\'s page changes nothing; two taps make two sessions and write nothing; a reload mid-confirmation carries on', async () => {
  const w = world();
  const { sub } = await w.flowMonthly();
  // abandoned: Stripe's page opened, the tab closed; the next start has nothing to say or ask
  await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' });
  assert.equal(await PC.resumeChange(w.appShell, { ui: w.ui, now: w.now, sleep: w.sleep }), null);
  assert.deepEqual(uiOf(w), []);
  // two taps (two tabs): two sessions, nothing written on Stripe or the Worker
  const [a, b] = await Promise.all([w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' }), w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' })]);
  assert.deepEqual([a, b], [{ redirecting: true, to: 'ultra.monthly' }, { redirecting: true, to: 'ultra.monthly' }]);
  assert.equal(w.box.s.portalSessions.length, 3);
  assert.equal(w.box.s.subs.get(sub).items.data[0].price.id, F.PRICES.paidMonthly);
  assert.equal((await w.status()).tier, 'paid');
  // back from the second, before Stripe's change shows: a reload in the middle of "Confirming…"
  const before = B.planNow(w.ent);
  const back = w.arrive(String(w.lastSession().form.get('flow_data[after_completion][redirect][return_url]')));
  let stuck = null;
  const first = B.welcomeBack(w.appShell, back, { before, sleep: (ms) => new Promise((r) => { stuck = r; }), change: { ui: w.ui, now: w.now } });
  while (!stuck) await new Promise((r) => setTimeout(r, 5));
  assert.equal(PC.pendingChange({ now: w.now() })?.state, 'confirming');
  assert.deepEqual(uiOf(w).map((x) => x.ev), ['confirming'], 'asked once, Flow still: nothing said but "Confirming…"');
  // the page reloads (that run is gone with it); Stripe has the change now
  PC.resetPlanChange();
  await w.confirmOnStripe();
  assert.equal(await PC.resumeChange(w.appShell, { ui: w.ui, now: w.now, sleep: w.sleep }), 'confirmed');
  assert.equal(uiOf(w).filter((x) => x.ev === 'welcome').length, 1);
  // the old run, had it gone on (it cannot after a real reload), stops without a word: its change was confirmed and said
  stuck();
  assert.equal(await first, 'stopped');
  assert.equal(uiOf(w).filter((x) => x.ev === 'welcome').length, 1, 'the welcome once');
});

// ------------------------------------------------------------ the plan chooser, refusals --
test('Stripe\'s plan chooser (subscription_update) comes back the same way, and the refusals reach the plans page as its codes', async () => {
  const w = world();
  await w.flowMonthly();
  // Beyond monthly first, through the confirm flow (webhooks on)
  await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' });
  await B.welcomeBack(w.appShell, w.arrive(await w.confirmOnStripe()), { before: B.planNow(w.ent), sleep: w.sleep, change: { ui: w.ui, now: w.now } });
  assert.equal(w.ent.tier(), 'ultra');
  // the plans page from Beyond monthly: Flow yearly is no upgrade (the server's rule too), Beyond monthly is held
  assert.deepEqual(await w.ent.manage({ intent: 'upgrade', plan: 'paid', period: 'yearly' }), { failed: true, reason: 'not_an_upgrade' });
  assert.deepEqual(await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' }), { failed: true, reason: 'already_on_plan' });
  // "Change plan": Stripe's chooser, back to ?billing=changed (no to) once done, never the portal's home
  assert.deepEqual(await w.ent.manage({ intent: 'switch' }), { redirecting: true });
  const s = w.lastSession();
  assert.equal(s.flow, 'subscription_update');
  assert.equal(s.form.get('flow_data[subscription_update][subscription]'), [...w.box.s.subs.keys()][0]);
  assert.equal(s.form.get('flow_data[after_completion][redirect][return_url]'), `${PREVIEW}/?billing=changed`);
  assert.equal(s.return_url, `${PREVIEW}/?billing=unchanged`);
  // the chooser left without a choice: nothing changed, and nothing claimed
  const n = w.seq.length;
  const back = w.arrive(String(s.form.get('flow_data[after_completion][redirect][return_url]')));
  assert.deepEqual(back, { kind: 'changed', sessionId: null, to: null });
  assert.equal(await B.welcomeBack(w.appShell, back, { before: B.planNow(w.ent), sleep: w.sleep, change: { ui: w.ui, now: w.now, waits: [0, 1500] } }), 'timeout');
  assert.ok(!w.seq.slice(n).some((x) => x.kind === 'ui' && x.ev === 'welcome'));
});

// --------------------------------------------------------- cancel from Settings --
test('cancelling: Settings → Manage subscription is the portal\'s home (Cancel there), back on ?billing=portal the app shows it ends at the period end', async () => {
  const w = world();
  const { sub } = await w.flowMonthly();
  await w.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' });
  await B.welcomeBack(w.appShell, w.arrive(await w.confirmOnStripe()), { before: B.planNow(w.ent), sleep: w.sleep, change: { ui: w.ui, now: w.now } });
  assert.equal(w.ent.tier(), 'ultra');
  const before = B.planNow(w.ent);
  assert.deepEqual(await w.ent.manage(), { redirecting: true });
  const ask = serverOf(w, B.PATHS.portal).at(-1);
  assert.deepEqual(ask.body, {});
  assert.deepEqual(Object.keys(ask.json), ['url'], 'the home: no flow');
  const home = w.lastSession();
  assert.equal(home.flow, null);
  assert.equal(home.return_url, `${PREVIEW}/?billing=portal`);
  assert.ok(![...home.form.keys()].some((k) => k.startsWith('flow_data')));
  // the customer cancels there, at the period end (B6: cancellations at the end of the billing period)
  await w.stripe('POST', `/v1/subscriptions/${sub}`, { cancel_at_period_end: true });
  const back = w.arrive(home.return_url);
  assert.deepEqual(back, { kind: 'portal', sessionId: null });
  assert.equal(await B.welcomeBack(w.appShell, back, { before, sleep: w.sleep }), 'portal');
  const p = w.ent.webPlan();
  assert.equal(p.cancelAtPeriodEnd, true);
  assert.equal(p.endsAt, p.periodEnd, 'ends at the period end ("Ends on …")');
  assert.equal(w.ent.tier(), 'ultra', 'still Beyond until then');
});
