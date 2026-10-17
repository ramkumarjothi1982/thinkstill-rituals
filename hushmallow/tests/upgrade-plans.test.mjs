// The plans page for an account that holds a web plan (src/app/scenes/plans.js), and Settings' Manage subscription
// (src/app/scenes/settings.js), after the owner's request of 17 Oct 2026:
//   * a card that is an upgrade by the server's rule says "Upgrade to hushmallow Beyond" (or, the same plan monthly →
//     yearly, "Switch to yearly") and opens Stripe's confirmation of exactly that plan and period; any other change says
//     "Change plan" and opens Stripe's plan chooser; one tap at a time (never two sessions); every refusal said calmly,
//     with the full portal where it helps;
//   * cancelling stays in Settings → Manage subscription, exactly as reachable as before (the portal's front page).
// The way back and the welcome: tests/upgrade-flow.test.mjs.
// Run with: node --test tests/
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createEntitlements } from '../src/app/entitlements.js';
import { createStore } from '../src/engine/storage.js';
import { plan, account, installDom, text, all, click, tick, keepGlobals } from './helpers/upgrade-fakes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const NBSP = '\u00a0';
after(keepGlobals());

// ------------------------------------------------------ the plans page --
async function plansPage(ent, { calls = [], state = {} } = {}) {
  const dom = installDom();
  const { default: plans } = await import('../src/app/scenes/plans.js');
  const world = { dim() {}, showMallow() {}, place() {}, setStage() {}, react() {}, fitBetween() {}, setMallow: async () => {}, mallowId: 'boppo' };
  const app = { ent, world, state, haptic() {}, audio: { ui() {} }, go: (name, params) => calls.push([name, params]), back() {} };
  const view = plans(app, {});
  dom.scene.append(view.el);
  const offers = () => all(view.el).filter((n) => n.attrs?.['data-plan-action']).map((n) => [n.attrs['data-plan-action'], n.attrs['data-to'] ?? null, text(n)]);
  const seg = (label) => all(view.el).find((n) => n.tagName === 'BUTTON' && n.attrs.role === 'radio' && text(n) === label);
  const offer = (to) => all(view.el).find((n) => n.tagName === 'BUTTON' && n.attrs['data-to'] === to);
  return { view, calls, offers, seg, offer, said: () => all(view.el).filter((n) => n.attrs?.class === 'invite-change').map(text).filter(Boolean).join(' ') };
}
const UP = 'Upgrade to hushmallow Beyond';

test('isUpgrade: the server\'s rule (a higher plan for the same or a longer period, or the same plan monthly → yearly)', async () => {
  const { isUpgrade, changeFor } = await import('../src/app/scenes/plans.js');
  const P = (s) => { const [plan, period] = s.split('.'); return { plan, period }; };
  const yes = [['paid.monthly', 'ultra.monthly'], ['paid.monthly', 'ultra.yearly'], ['paid.yearly', 'ultra.yearly'], ['paid.monthly', 'paid.yearly'], ['ultra.monthly', 'ultra.yearly']];
  const no = [['paid.yearly', 'ultra.monthly'], ['ultra.monthly', 'paid.monthly'], ['ultra.yearly', 'paid.yearly'], ['ultra.yearly', 'ultra.monthly'], ['paid.yearly', 'paid.monthly'], ['paid.monthly', 'paid.monthly'], ['ultra.monthly', 'paid.yearly']];
  for (const [a, b] of yes) assert.equal(isUpgrade(P(a), P(b)), true, `${a} → ${b}`);
  for (const [a, b] of no) assert.equal(isUpgrade(P(a), P(b)), false, `${a} → ${b}`);
  assert.equal(isUpgrade({ plan: 'paid', period: null }, P('ultra.monthly')), false, 'a period not known: never an upgrade by the rule');
  assert.equal(changeFor({ plan: 'paid', period: null }, P('paid.yearly')), 'held');
  assert.equal(changeFor({ plan: 'paid', period: null }, P('ultra.monthly')), 'change', 'Stripe\'s chooser, which knows');
  assert.equal(changeFor(P('ultra.monthly'), P('ultra.yearly')), 'yearly');
  assert.equal(changeFor(P('paid.monthly'), P('ultra.yearly')), 'upgrade');
});

test('plans page: what each card offers, per plan held (Flow monthly, Flow yearly, Beyond monthly, Beyond yearly) and period', async () => {
  const cases = [
    ['paid', 'monthly', { monthly: [['held', null, '✓ Your plan'], ['upgrade', 'ultra.monthly', UP]], yearly: [['yearly', 'paid.yearly', 'Switch to yearly'], ['upgrade', 'ultra.yearly', UP]] }],
    ['paid', 'yearly', { monthly: [['change', 'paid.monthly', 'Change plan'], ['change', 'ultra.monthly', 'Change plan']], yearly: [['held', null, '✓ Your plan'], ['upgrade', 'ultra.yearly', UP]] }],
    ['ultra', 'monthly', { monthly: [['change', 'paid.monthly', 'Change plan'], ['held', null, '✓ Your plan']], yearly: [['change', 'paid.yearly', 'Change plan'], ['yearly', 'ultra.yearly', 'Switch to yearly']] }],
    ['ultra', 'yearly', { monthly: [['change', 'paid.monthly', 'Change plan'], ['change', 'ultra.monthly', 'Change plan']], yearly: [['change', 'paid.yearly', 'Change plan'], ['held', null, '✓ Your plan']] }],
  ];
  for (const [tier, period, want] of cases) {
    const { ent } = await account({ held: plan(tier, period) });
    const p = await plansPage(ent);
    assert.ok(p.seg('Monthly') && p.seg('Yearly'), `${tier} ${period}: the period can be chosen (Beyond too)`);
    // the page opens on the period held
    assert.deepEqual(p.offers(), want[period], `${tier} ${period}, opened on ${period}`);
    const other = period === 'monthly' ? 'yearly' : 'monthly';
    await click(p.seg(other === 'monthly' ? 'Monthly' : 'Yearly'));
    assert.deepEqual(p.offers(), want[other], `${tier} ${period}, ${other}`);
    p.view.leave();
  }
  // never "Step into…" for a plan held, and the plan names in full on every upgrade
  const { ent } = await account({ held: plan('paid', 'monthly') });
  const p = await plansPage(ent);
  assert.ok(!all(p.view.el).some((n) => n.tagName === 'BUTTON' && /^Step into/.test(text(n))));
  assert.equal(text(p.offer('ultra.monthly')), 'Upgrade to hushmallow Beyond');
  assert.ok(p.offer('ultra.monthly').classList.contains('invite-buy'), 'the plan button\'s own fit and look (BUY_FIT)');
  p.view.leave();
});

test('plans page: an upgrade opens Stripe\'s confirmation of exactly that plan and period; "Change plan" its chooser; one tap at a time', async () => {
  const { ent, server, navs } = await account({ held: plan('paid', 'monthly') });
  let release;
  server.hold = new Promise((r) => { release = r; });
  server.portal = (b) => (b.intent === 'upgrade'
    ? { http: 200, body: { url: 'https://billing.stripe.com/p/flow/test_up', flow: 'subscription_update_confirm', to: `${b.plan}.${b.period}` } }
    : { http: 200, body: { url: 'https://billing.stripe.com/p/flow/test_choose', flow: 'subscription_update' } });
  const p = await plansPage(ent);
  await click(p.seg('Yearly'));
  const up = p.offer('ultra.yearly');
  // two quick taps, and a tap on the other card meanwhile: one request, one Stripe page
  const first = up.listeners.click[0]({ currentTarget: up });
  up.listeners.click[0]({ currentTarget: up });
  const yr = p.offer('paid.yearly');
  yr.listeners.click[0]({ currentTarget: yr });
  await tick();
  assert.equal(up.disabled, true, 'busy');
  assert.ok('aria-busy' in up.attrs);
  assert.equal(yr.disabled, true, 'the others rest');
  release();
  server.hold = null;
  await first;
  assert.deepEqual(server.calls.map((c) => [c.path, c.body]), [['/v1/billing/portal', { intent: 'upgrade', plan: 'ultra', period: 'yearly' }]]);
  assert.deepEqual(navs, ['https://billing.stripe.com/p/flow/test_up']);
  assert.equal(up.disabled, true, 'quiet while the page leaves for Stripe');
  p.view.leave();
  // "Change plan" (Beyond monthly held, Flow): Stripe's plan chooser
  const b = await account({ held: plan('ultra', 'monthly') });
  b.server.portal = { http: 200, body: { url: 'https://billing.stripe.com/p/flow/test_choose', flow: 'subscription_update' } };
  const q = await plansPage(b.ent);
  await click(q.offer('paid.monthly'));
  assert.deepEqual(b.server.calls.map((c) => c.body), [{ intent: 'switch' }]);
  assert.deepEqual(b.navs, ['https://billing.stripe.com/p/flow/test_choose']);
  q.view.leave();
});

test('plans page: each refusal said calmly, with Manage subscription (the full portal) where it helps', async () => {
  const { CHANGE_ERRORS, MANAGE_TO_CHANGE } = await import('../src/app/scenes/plans.js');
  const { ent, server, navs } = await account({ held: plan('paid', 'monthly') });
  const p = await plansPage(ent);
  const up = () => p.offer('ultra.monthly');
  const tryWith = async (reply) => { server.portal = reply; server.calls.length = 0; await click(up()); };
  const manageButton = () => all(p.view.el).find((n) => n.tagName === 'BUTTON' && n.attrs.class?.includes('invite-manage'));
  await tryWith({ http: 409, body: { status: 'error', error: { code: 'already_on_plan' } } });
  assert.equal(p.said(), 'You’re already on hushmallow Beyond.');
  assert.equal(manageButton(), undefined);
  assert.equal(up().disabled, false, 'the buttons wake again');
  await tryWith({ http: 409, body: { status: 'error', error: { code: 'payment_issue' } } });
  assert.equal(p.said(), `${CHANGE_ERRORS.payment_issue}Manage subscription`);
  assert.match(CHANGE_ERRORS.payment_issue, /payment didn’t go through\. Update your card in Manage subscription/);
  // its button: Settings' own Manage subscription (the front page: the card, cancelling, receipts)
  server.portal = { http: 200, body: { url: 'https://billing.stripe.com/p/session/test_home' } };
  server.calls.length = 0;
  await click(manageButton());
  assert.deepEqual(server.calls.map((c) => c.body), [{}]);
  assert.equal(navs.at(-1), 'https://billing.stripe.com/p/session/test_home');
  for (const code of ['not_an_upgrade', 'plan_change_unavailable', 'change_pending', 'not_updatable']) {
    await tryWith({ http: code === 'plan_change_unavailable' ? 503 : 409, body: { status: 'error', error: { code } } });
    assert.equal(p.said(), `${CHANGE_ERRORS[code]}${MANAGE_TO_CHANGE}`, code);
    assert.equal(text(manageButton()), 'Change plan in Manage subscription');
  }
  // Stripe refusing the chooser too, an older server's front page: the same calm line, never the front page as the change
  await tryWith({ http: 200, body: { url: 'https://billing.stripe.com/p/session/home', flow: 'portal' } });
  assert.equal(p.said(), `${CHANGE_ERRORS.plan_change_unavailable}${MANAGE_TO_CHANGE}`);
  for (const reply of [{ http: 502, body: {} }, { http: 429, body: {} }, { http: 200, body: { url: 'https://evil.example/', flow: 'subscription_update_confirm' } }]) {
    await tryWith(reply);
    assert.equal(p.said(), 'Couldn’t open Stripe just now. Try again.', JSON.stringify(reply));
  }
  server.down = true;
  await click(up());
  assert.equal(p.said(), CHANGE_ERRORS.offline);
  server.down = false;
  await tryWith({ http: 404, body: { error: { code: 'no_subscription' } } });
  assert.equal(p.said(), 'There’s no subscription on this account yet.');
  // a session that has lapsed here: sign in again
  await tryWith({ http: 401, body: {} });
  assert.deepEqual(p.calls.at(-1), ['account', { view: 'signin', notice: 'Sign in to the account your plan is with.' }]);
  p.view.leave();
});

test('plans page without a web plan held: exactly as before (Step into…, Checkout, the 409 path)', async () => {
  const guestish = await account({ held: plan('none', null, 'none', { manageable: false }) });
  const p = await plansPage(guestish.ent);
  assert.deepEqual(all(p.view.el).filter((n) => n.tagName === 'BUTTON' && /^Step into/.test(text(n))).map(text), ['Step into hushmallow Flow', 'Step into hushmallow Beyond']);
  assert.deepEqual(p.offers(), []);
  p.view.leave();
  // a test plan or the App Store's: never the web's change buttons
  const local = createEntitlements({ store: createStore({ backend: 'memory' }) });
  await local.purchase('paid');
  const q = await plansPage(local);
  assert.deepEqual(q.offers(), []);
  q.view.leave();
});

test('plans page: the words for a change, calm and in full; its controls at least 44 px', async () => {
  const P = await import('../src/app/scenes/plans.js');
  const copy = [...Object.values(P.CHANGE_ERRORS).map((v) => (typeof v === 'function' ? v('hushmallow Beyond') : v)), ...Object.values(P.CHANGE_LABELS), P.MANAGE_TO_CHANGE];
  for (const l of copy) {
    assert.doesNotMatch(l, /\bAI\b|\b(Paid|Ultra|Premium|premium)\b|Hushmallow|HUSHMALLOW/, l);
    assert.doesNotMatch(l, /now or never|limited|hurry|don’t miss|last chance|!/i, `never pushy: ${l}`);
    assert.doesNotMatch(l, /\b(Step into|Upgrade to|on|to) (Flow|Beyond)\b/, `the plan's whole name: ${l}`);
  }
  assert.equal(P.CHANGE_ERRORS.offline, 'Couldn’t open Stripe just now. Try again.');
  assert.equal(P.CHANGE_ERRORS.already_on_plan('hushmallow Beyond'), 'You’re already on hushmallow Beyond.');
  // the period notes keep their no-break spaces and say where cancelling is
  assert.equal(P.periodNote({ web: true, period: 'yearly' }).replaceAll(NBSP, ' '), 'Billed once a year. Cancel any time in Settings.');
  const css = read('src/ui/app.css');
  assert.match(css, /\.invite-manage \{ min-height: 48px;/);
  assert.match(css, /\.invite-change:empty \{ display: none; \}/);
  // the "Upgrade to" label keeps the plan's whole name in one piece, as "Step into" does (fitWhole, BUY_FIT)
  const src = read('src/app/scenes/plans.js');
  assert.match(src, /h\('span', \{ class: 'nb' \}, CHANGE_LABELS\.upgrade\), ' ', h\('span', \{ class: 'nb' \}, p\.name\)/);
  assert.match(src, /if \(btn\) requestAnimationFrame\(\(\) => \{ if \(!gone\) fitWhole\(btn, BUY_FIT\); \}\);/);
});
