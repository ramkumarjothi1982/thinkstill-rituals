// The upgrade experience (17 Oct 2026, the owner's request): after a change of plan on Stripe's page the customer comes
// straight back to hushmallow, never to the portal's front page with its Cancel button, and nothing says the change
// happened until Stripe has confirmed it.
//   * the client half of the contract (src/app/billing.js): POST /v1/billing/portal { intent: 'upgrade', plan, period }
//     opens only Stripe's subscription_update_confirm for exactly that change, { intent: 'switch' } only its plan
//     chooser (never the front page in its place), POST /v1/billing/sync {} re-reads the subscription from Stripe, the
//     status carries the plan's period, ?billing=changed&to=… and ?billing=unchanged come back;
//   * the confirmation (src/app/plan-change.js): success only once the server says the target tier AND period, active
//     or trialing; a payment to sort out is never a success; a timeout keeps it for a quiet check later; a reload
//     mid-confirmation resumes for 15 minutes, then it is forgotten; Back onto the way back never says it twice; the
//     back link says "No change made";
//   * the hushmallow Beyond welcome (src/app/scenes/beyond-welcome.js): the seven Mallows, a dialog done properly,
//     still with reduced motion or low stimulation, true to what Beyond includes.
// The plans page's buttons and Settings' Manage subscription: tests/upgrade-plans.test.mjs. Flow → Beyond monthly and
// monthly → yearly are rehearsed here against the repo's fakes; Stripe's sandbox itself is the staging rehearsal's.
// Run with: node --test tests/
import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createBilling, takeReturn, welcomeBack, planNow, PATHS, PLAN_TO, CHANGE_CODES, RETURN_KINDS, RETURN_LINES } from '../src/app/billing.js';
import { createEntitlements, PLANS, LIVE_FEATURES } from '../src/app/entitlements.js';
import {
  confirmChange, resumeChange, verdict, rememberChange, pendingChange, resetPlanChange, departChange, takeTrip,
  CHANGE_KEY, CHANGE_MS, CONFIRM_WAITS, CHANGE_LINES, QUIET_RECHECK_MS, PAYMENT_STATUSES, TRIP_KEY, TRIP_MS,
} from '../src/app/plan-change.js';
import { createStore } from '../src/engine/storage.js';
import { ACCOUNT_TAB_KEYS, removeAccountTabKeys } from '../src/auth/namespace.js';
import { MALLOWS, MALLOW_IDS } from '../src/mallows/registry.js';
import {
  CONFIG, plan, account, authHandle, memSession, fakeUi, installDom, FakeEl, text, all, click, sleepFor, welcomeApp, keepGlobals, UID_A, UID_B,
} from './helpers/upgrade-fakes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
after(keepGlobals());
const kinds = (ui) => ui.events.map((e) => e[0]);
beforeEach(() => resetPlanChange());

// ------------------------------------------------------- the contract --
test('takeReturn: ?billing=changed keeps only a well-formed to, ?billing=unchanged comes back, and to always leaves the address', () => {
  const replaced = [];
  const hist = { state: { i: 0 }, replaceState: (_, __, u) => replaced.push(u) };
  const back = (q) => takeReturn({ loc: { href: `https://claude-launch-rc.hushmallow.pages.dev/?${q}` }, hist });
  assert.deepEqual([...RETURN_KINDS], ['success', 'cancel', 'portal', 'changed', 'unchanged']);
  for (const to of ['paid.monthly', 'paid.yearly', 'ultra.monthly', 'ultra.yearly']) {
    assert.deepEqual(back(`billing=changed&to=${to}`), { kind: 'changed', sessionId: null, to });
    assert.equal(replaced.pop(), 'https://claude-launch-rc.hushmallow.pages.dev/', 'billing and to taken out at once');
  }
  for (const bad of ['', 'ultra', 'ultra.weekly', 'gold.monthly', 'ultra.monthly.x', 'ULTRA.MONTHLY', 'ultra.monthly%3Cb%3E', 'paid.yearly%20', 'paid.yearly%0A']) {
    assert.deepEqual(back(`billing=changed&to=${bad}`), { kind: 'changed', sessionId: null, to: null }, bad);
    replaced.pop();
  }
  assert.deepEqual(back('billing=changed'), { kind: 'changed', sessionId: null, to: null }, 'Stripe\'s plan chooser: no to');
  replaced.pop();
  assert.deepEqual(back('v=abc&billing=unchanged#home'), { kind: 'unchanged', sessionId: null });
  assert.equal(replaced.pop(), 'https://claude-launch-rc.hushmallow.pages.dev/?v=abc#home', 'everything else stays');
  // a to beside any other kind is taken out and never kept; a session id never rides on a change
  for (const kind of ['success', 'cancel', 'portal', 'unchanged']) {
    const r = back(`billing=${kind}&to=ultra.yearly`);
    assert.equal(r.kind, kind);
    assert.equal('to' in r, false, kind);
    assert.equal(replaced.pop(), 'https://claude-launch-rc.hushmallow.pages.dev/');
  }
  assert.equal(back(`billing=changed&to=ultra.yearly&session_id=cs_test_${'a'.repeat(20)}`).sessionId, null);
  replaced.pop();
  assert.equal(back('billing=upgraded&to=ultra.yearly'), null, 'an unknown kind');
  assert.equal(replaced.pop(), 'https://claude-launch-rc.hushmallow.pages.dev/');
  assert.equal(String(PLAN_TO), String(/^(paid|ultra)\.(monthly|yearly)$/));
});

test('upgrade: { intent: "upgrade", plan, period } with the token, and only Stripe\'s confirmation of exactly that change is opened', async () => {
  const { server, billing, navs } = await account();
  server.portal = (b) => ({ http: 200, body: { url: 'https://billing.stripe.com/p/flow/test_up', flow: 'subscription_update_confirm', to: `${b.plan}.${b.period}` } });
  assert.deepEqual(await billing.upgrade('ultra', 'monthly'), { redirecting: true, to: 'ultra.monthly' });
  assert.deepEqual(server.calls.map((c) => [c.path, c.method, c.body]), [['/v1/billing/portal', 'POST', { intent: 'upgrade', plan: 'ultra', period: 'monthly' }]]);
  assert.deepEqual(navs, ['https://billing.stripe.com/p/flow/test_up']);
  // never another flow, another plan or a page that is not Stripe's in its place
  for (const body of [{ url: 'https://billing.stripe.com/p/session/home' }, { url: 'https://billing.stripe.com/p/session/home', flow: 'portal' },
    { url: 'https://billing.stripe.com/p/flow/x', flow: 'subscription_update' }, { url: 'https://billing.stripe.com/p/flow/x', flow: 'subscription_update_confirm', to: 'ultra.yearly' }]) {
    server.portal = { http: 200, body };
    assert.deepEqual(await billing.upgrade('ultra', 'monthly'), { failed: true, reason: 'plan_change_unavailable' }, JSON.stringify(body));
  }
  server.portal = { http: 200, body: { url: 'https://evil.example/flow', flow: 'subscription_update_confirm', to: 'ultra.monthly' } };
  assert.deepEqual(await billing.upgrade('ultra', 'monthly'), { failed: true, reason: 'not_stripe' });
  assert.equal(navs.length, 1, 'nothing more opened');
  // every refusal of the contract, as the server says it (409, or 503 plan_change_unavailable)
  for (const code of CHANGE_CODES) {
    server.portal = { http: code === 'plan_change_unavailable' ? 503 : 409, body: { status: 'error', error: { code, message: 'x' } } };
    assert.deepEqual(await billing.upgrade('ultra', 'yearly'), { failed: true, reason: code }, code);
  }
  assert.deepEqual([...CHANGE_CODES], ['already_on_plan', 'payment_issue', 'not_an_upgrade', 'plan_change_unavailable', 'change_pending', 'not_updatable', 'plan_ending']);
  server.portal = { http: 409, body: { error: { code: 'something_else' } } };
  assert.deepEqual(await billing.upgrade('ultra', 'yearly'), { failed: true, reason: 'http_409' });
  server.portal = { http: 503, body: { error: { code: 'billing_not_configured' } } };
  assert.deepEqual(await billing.upgrade('ultra', 'yearly'), { failed: true, reason: 'http_503' });
  server.portal = { http: 404, body: { error: { code: 'no_subscription' } } };
  assert.deepEqual(await billing.upgrade('ultra', 'yearly'), { none: true });
  server.portal = { http: 401, body: {} };
  assert.deepEqual(await billing.upgrade('ultra', 'yearly'), { needsAccount: true });
  server.down = true;
  assert.deepEqual(await billing.upgrade('ultra', 'yearly'), { failed: true, reason: 'network' });
  server.down = false;
  // not a plan and a period: nothing is sent; a guest sends nothing either
  const n = server.calls.length;
  for (const [p, q] of [['premium', 'monthly'], ['ultra', 'weekly'], [undefined, undefined], ['ultra', { period: 'yearly' }]]) assert.deepEqual(await billing.upgrade(p, q), { failed: true, reason: 'invalid' });
  assert.equal(server.calls.length, n);
  const guest = await account({ signedIn: false, held: null });
  assert.deepEqual(await guest.billing.upgrade('ultra', 'monthly'), { needsAccount: true });
  assert.equal(guest.server.calls.length, 0);
});

test('switch: Stripe\'s plan chooser only; refused, never the portal\'s front page in its place', async () => {
  const { server, billing, navs, ent } = await account();
  server.portal = { http: 200, body: { url: 'https://billing.stripe.com/p/flow/test_choose', flow: 'subscription_update' } };
  assert.deepEqual(await ent.manage({ intent: 'switch' }), { redirecting: true });
  assert.deepEqual(server.calls.at(-1).body, { intent: 'switch' });
  // the server's 503 plan_change_unavailable (the flow off in the portal's settings), or an older server's front page
  server.portal = { http: 503, body: { status: 'error', error: { code: 'plan_change_unavailable' } } };
  assert.deepEqual(await billing.portal('switch'), { failed: true, reason: 'plan_change_unavailable' });
  server.portal = { http: 200, body: { url: 'https://billing.stripe.com/p/session/home', flow: 'portal' } };
  assert.deepEqual(await billing.portal('switch'), { failed: true, reason: 'plan_change_unavailable' });
  assert.deepEqual(navs, ['https://billing.stripe.com/p/flow/test_choose']);
  // Settings' Manage subscription is the front page, as ever ({}), whatever it says about flows
  assert.deepEqual(await ent.manage(), { redirecting: true });
  assert.deepEqual(server.calls.at(-1).body, {});
  assert.equal(navs.at(-1), 'https://billing.stripe.com/p/session/home');
  // the entitlements pass an upgrade through as it is
  server.portal = { http: 200, body: { url: 'https://billing.stripe.com/p/flow/u', flow: 'subscription_update_confirm', to: 'paid.yearly' } };
  assert.deepEqual(await ent.manage({ intent: 'upgrade', plan: 'paid', period: 'yearly' }), { redirecting: true, to: 'paid.yearly' });
  assert.deepEqual(server.calls.at(-1).body, { intent: 'upgrade', plan: 'paid', period: 'yearly' });
  assert.deepEqual(await createEntitlements({ store: createStore({ backend: 'memory' }) }).manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' }), { failed: true, reason: 'off' });
});

test('refresh: POST /v1/billing/sync {} re-reads the subscription from Stripe; the answer, with its period, is the plan kept', async () => {
  const { server, billing, ent } = await account();
  server.answers = [plan('ultra', 'yearly', 'trialing')];
  assert.deepEqual(await billing.refresh(), { ok: true, tier: 'ultra', period: 'yearly', status: 'trialing', periodEnd: Date.parse('2026-11-17T09:00:00Z'), endsAt: null, cancelAtPeriodEnd: false, manageable: true });
  assert.deepEqual(server.calls.map((c) => [c.path, c.method, c.body]), [['/v1/billing/sync', 'POST', {}]], 'nothing but {}');
  await ent.refreshFromStripe();
  assert.equal(ent.tier(), 'ultra');
  assert.equal(ent.webPlan().period, 'yearly');
  assert.equal(ent.webAnswered(), true);
  // no record (404 no_subscription), or a server from before the route took {}: not answered
  server.answers = null;
  server.sync = { http: 404, body: { error: { code: 'no_subscription' } } };
  assert.deepEqual(await billing.refresh(), { ok: false, reason: 'http_404' });
  server.sync = { http: 400, body: { error: { code: 'invalid_body' } } };
  await ent.refreshFromStripe();
  assert.equal(ent.webAnswered(), false);
  assert.equal(ent.tier(), 'ultra', 'what is kept stays');
  const guest = await account({ signedIn: false, held: null });
  assert.deepEqual(await guest.billing.refresh(), { ok: false, reason: 'signed-out' });
  assert.equal(guest.server.calls.length, 0);
});

// -------------------------------------------------- the confirmation --
test('Flow → Beyond monthly: "Confirming…" while the webhook is behind, the welcome only once Stripe says Beyond, monthly, active', async () => {
  const { server, ent } = await account();
  const before = planNow(ent);
  assert.deepEqual(before, { tier: 'paid', period: 'monthly', status: 'active', cancelAtPeriodEnd: false, endsAt: null });
  server.answers = [plan('paid', 'monthly'), plan('paid', 'monthly'), plan('ultra', 'monthly')];
  const session = memSession(), ui = fakeUi(), waits = [];
  const out = await confirmChange({ ent }, { kind: 'changed', to: 'ultra.monthly' }, { before, session, ui, sleep: async (ms) => { waits.push(ms); } });
  assert.equal(out, 'confirmed');
  assert.deepEqual(kinds(ui), ['confirming', 'close', 'welcome'], 'the calm state first, never a success before the answer');
  assert.deepEqual(ui.events[2][1], { tier: 'ultra', period: 'monthly', from: { tier: 'paid', period: 'monthly', status: 'active' }, to: 'ultra.monthly' });
  assert.deepEqual(waits, [1500, 3000], 'asked three times');
  assert.deepEqual(server.calls.map((c) => [c.path, c.body]), Array(3).fill(['/v1/billing/sync', {}]), 'Stripe\'s own copy each time');
  assert.equal(ent.tier(), 'ultra');
  assert.equal(pendingChange({ session }).state, 'done', 'kept as said (Back onto the same way back says nothing twice)');
  assert.deepEqual([...CONFIRM_WAITS], [0, 1500, 3000, 5000, 8000, 13000, 21000, 34000]);
});

test('success needs the target tier AND period, active or trialing; a payment to sort out is never a success', async () => {
  const run = async (answers, to = 'ultra.monthly', held = plan('paid', 'monthly')) => {
    resetPlanChange();
    const { server, ent } = await account({ held });
    server.answers = answers;
    const ui = fakeUi();
    const out = await confirmChange({ ent }, { kind: 'changed', to }, { before: planNow(ent), session: memSession(), ui, sleep: async () => {} });
    return { out, ui, ent, server };
  };
  // the right tier on the wrong period, or the right period on the wrong tier: never confirmed
  for (const wrong of [plan('ultra', 'yearly'), plan('paid', 'monthly'), plan('ultra', null), plan('ultra', 'monthly', 'canceled'), plan('none', null, 'none')]) {
    const r = await run([wrong]);
    assert.equal(r.out, 'timeout', JSON.stringify(wrong));
    assert.ok(!kinds(r.ui).includes('welcome'));
  }
  assert.equal((await run([plan('ultra', 'monthly', 'trialing')])).out, 'confirmed');
  // monthly → yearly, the same plan: its own smaller welcome is the UI's to choose (welcomeKind); here the result
  const yearly = await run([plan('paid', 'monthly'), plan('paid', 'yearly')], 'paid.yearly');
  assert.equal(yearly.out, 'confirmed');
  assert.deepEqual(yearly.ui.events.at(-1)[1], { tier: 'paid', period: 'yearly', from: { tier: 'paid', period: 'monthly', status: 'active' }, to: 'paid.yearly' });
  // the payment did not go through: still on the plan before (the change waits on it), or the new plan not confirmed
  for (const status of PAYMENT_STATUSES) {
    const r = await run([plan('paid', 'monthly', status)]);
    assert.equal(r.out, 'payment_issue', status);
    assert.deepEqual(r.ui.events.at(-1), ['payment', 'Your payment didn’t go through, so you’re still on hushmallow Flow. Update your card in Settings → Manage subscription.']);
    assert.ok(!kinds(r.ui).includes('welcome'));
  }
  const moved = await run([plan('ultra', 'monthly', 'past_due')]);
  assert.deepEqual(moved.ui.events.at(-1), ['payment', CHANGE_LINES.paymentIssueNew]);
  assert.match(CHANGE_LINES.paymentIssueNew, /didn’t go through/);
  // the verdict itself
  const rec = { to: 'ultra.monthly', from: { tier: 'paid', period: 'monthly' } };
  assert.equal(verdict({ tier: 'ultra', period: 'monthly', status: 'active' }, rec), 'confirmed');
  assert.equal(verdict({ tier: 'ultra', period: 'monthly', status: 'incomplete' }, rec), 'payment_issue');
  assert.equal(verdict({ tier: 'paid', period: 'monthly', status: 'active' }, rec), 'waiting');
  assert.equal(verdict(null, rec), 'waiting');
});

test('Stripe\'s plan chooser (no to): confirmed against the plan before the trip, by tier or by a known period', async () => {
  const chooser = { to: null, from: { tier: 'ultra', period: 'monthly', status: 'active' } };
  assert.equal(verdict({ tier: 'paid', period: 'monthly', status: 'active' }, chooser), 'confirmed', 'Beyond → Flow');
  assert.equal(verdict({ tier: 'ultra', period: 'yearly', status: 'active' }, chooser), 'confirmed', 'monthly → yearly');
  assert.equal(verdict({ tier: 'ultra', period: 'monthly', status: 'active' }, chooser), 'waiting', 'nothing yet');
  assert.equal(verdict({ tier: 'ultra', period: 'yearly', status: 'active' }, { to: null, from: { tier: 'ultra', period: null } }), 'waiting', 'a period not known before: only a tier counts');
  assert.equal(verdict({ tier: 'none', period: null, status: 'canceled' }, chooser), 'waiting');
  const { server, ent } = await account({ held: plan('ultra', 'monthly') });
  server.answers = [plan('ultra', 'monthly'), plan('paid', 'monthly')];
  const ui = fakeUi();
  assert.equal(await confirmChange({ ent }, { kind: 'changed', to: null }, { before: planNow(ent), session: memSession(), ui, sleep: async () => {} }), 'confirmed');
  assert.deepEqual(ui.events.at(-1)[1].tier, 'paid');
});

test('not confirmed in time: a calm line, the change kept for a quiet check later (next start, back on screen), then the welcome', async () => {
  const { server, ent } = await account();
  server.answers = [plan('paid', 'monthly')];   // the webhook and Stripe's copy both still on Flow
  const session = memSession(), ui = fakeUi(), waits = [];
  const out = await confirmChange({ ent }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(ent), session, ui, sleep: async (ms) => { waits.push(ms); } });
  assert.equal(out, 'timeout');
  assert.deepEqual(waits, CONFIRM_WAITS.slice(1));
  assert.deepEqual(ui.events, [['confirming'], ['say', 'Stripe is still confirming your change. Your plan will update here as soon as it’s confirmed.', 'timeout']]);
  assert.equal(server.calls.length, CONFIRM_WAITS.length);
  assert.equal(pendingChange({ session }).state, 'quiet');
  // back on screen: one quiet ask (no "Confirming…"), at most every QUIET_RECHECK_MS; confirmed, the welcome
  let t = Date.now();
  const now = () => t;
  const ui2 = fakeUi();
  assert.equal(await resumeChange({ ent }, { quiet: true, session, ui: ui2, now, sleep: async () => {} }), 'timeout');
  assert.deepEqual(ui2.events, [], 'quietly: nothing said');
  assert.equal(server.calls.length, CONFIRM_WAITS.length + 1);
  server.answers = [plan('ultra', 'monthly')];
  assert.equal(await resumeChange({ ent }, { quiet: true, session, ui: ui2, now, sleep: async () => {} }), null, 'too soon after the last');
  t += QUIET_RECHECK_MS;
  assert.equal(await resumeChange({ ent }, { quiet: true, session, ui: ui2, now, sleep: async () => {} }), 'confirmed');
  assert.deepEqual(kinds(ui2), ['welcome']);
  assert.equal(pendingChange({ session, now: t }).state, 'done');
  assert.equal(await resumeChange({ ent }, { quiet: true, session, ui: ui2, now: () => t + QUIET_RECHECK_MS, sleep: async () => {} }), null, 'done: never again');
});

test('a reload mid-confirmation resumes it (for 15 minutes from the way back), then it is forgotten', async () => {
  const { server, ent } = await account();
  const session = memSession();
  const at = Date.parse('2026-10-17T20:00:00Z');
  rememberChange({ to: 'ultra.monthly', at, from: { tier: 'paid', period: 'monthly', status: 'active' }, state: 'confirming' }, { session });
  assert.deepEqual(JSON.parse(session.getItem(CHANGE_KEY)), { to: 'ultra.monthly', at, from: { tier: 'paid', period: 'monthly', status: 'active' }, state: 'confirming' }, 'only these, in this tab');
  server.answers = [plan('paid', 'monthly'), plan('ultra', 'monthly')];
  const ui = fakeUi();
  assert.equal(await resumeChange({ ent }, { session, ui, now: () => at + 5 * 60000, sleep: async () => {} }), 'confirmed');
  assert.deepEqual(kinds(ui), ['confirming', 'close', 'welcome'], 'the calm note again, then the welcome');
  // 15 minutes on: forgotten, nothing asked
  resetPlanChange();
  rememberChange({ to: 'ultra.monthly', at, from: { tier: 'paid', period: 'monthly' }, state: 'confirming' }, { session });
  const n = server.calls.length;
  assert.equal(await resumeChange({ ent }, { session, ui: fakeUi(), now: () => at + CHANGE_MS, sleep: async () => {} }), null);
  assert.equal(session.getItem(CHANGE_KEY), null, 'forgotten');
  assert.equal(server.calls.length, n);
  assert.equal(CHANGE_MS, 15 * 60000);
  // an odd or edited copy is forgotten, never acted on
  for (const bad of ['{', '{"to":"ultra.weekly","at":1,"from":{},"state":"confirming"}', JSON.stringify({ to: 'ultra.monthly', at: at + 60000, from: {}, state: 'confirming' }), JSON.stringify({ to: 'ultra.monthly', at, from: {}, state: 'welcome' })]) {
    session.setItem(CHANGE_KEY, bad);
    assert.equal(pendingChange({ session, now: at + 1000 }), null, bad);
    assert.equal(session.getItem(CHANGE_KEY), null);
  }
  // signed out on this page: nothing resumes
  rememberChange({ to: 'ultra.monthly', at, from: { tier: 'paid', period: 'monthly' }, state: 'quiet' }, { session });
  const away = await account({ signedIn: false, held: null });
  assert.equal(await resumeChange({ ent: away.ent }, { session, ui: fakeUi(), now: () => at + 1000 }), null);
  assert.equal(away.server.calls.length, 0);
});

test('a run still waiting when another run of the same change has confirmed and said it (a resumed one) stops without a word: the welcome once', async () => {
  const { server, ent } = await account();
  const session = memSession();
  const at = Date.parse('2026-10-17T20:00:00Z');
  let t = at;
  server.answers = [plan('paid', 'monthly')];
  let wake = null;
  const ui = fakeUi();
  const first = confirmChange({ ent }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(ent), session, ui, now: () => t, sleep: () => new Promise((r) => { wake = r; }) });
  while (!wake) await sleepFor(2);
  assert.deepEqual(kinds(ui), ['confirming'], 'Flow still: only the calm note');
  // that run is lost (the page reloaded); the new page resumes the same change and Stripe now says Beyond
  resetPlanChange();
  server.answers = [plan('ultra', 'monthly')];
  const resumed = fakeUi();
  t = at + 2000;
  assert.equal(await resumeChange({ ent }, { session, ui: resumed, now: () => t, sleep: async () => {} }), 'confirmed');
  assert.deepEqual(kinds(resumed), ['confirming', 'close', 'welcome']);
  assert.equal(pendingChange({ session, now: t }).state, 'done');
  // the old run wakes: nothing more is asked or said
  const n = server.calls.length;
  wake();
  assert.equal(await first, 'stopped');
  assert.deepEqual(kinds(ui), ['confirming', 'close'], 'its note closed, no second welcome');
  assert.equal(server.calls.length, n);
});

test('Back onto the way back after the welcome: not said twice; a new trip to Stripe starts afresh', async () => {
  const { server, ent } = await account();
  server.answers = [plan('ultra', 'monthly')];
  const session = memSession();
  globalThis.sessionStorage = session;   // billing.js forgets a kept change when a new trip starts (its default session)
  try {
    const ui = fakeUi();
    assert.equal(await confirmChange({ ent }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(ent), session, ui, sleep: async () => {} }), 'confirmed');
    // Back to Stripe's page and forward again (or a reload of that address): the plan kept is the change already said
    const again = fakeUi();
    assert.equal(await confirmChange({ ent }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(ent), session, ui: again, sleep: async () => {} }), 'repeat');
    assert.deepEqual(again.events, []);
    // then a real second change (Beyond monthly → yearly): a new trip forgets the old one, and it is confirmed in its turn
    server.portal = { http: 200, body: { url: 'https://billing.stripe.com/p/flow/y', flow: 'subscription_update_confirm', to: 'ultra.yearly' } };
    assert.deepEqual(await ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'yearly' }), { redirecting: true, to: 'ultra.yearly' });
    assert.equal(session.getItem(CHANGE_KEY), null, 'the way back from the new trip is its own');
    server.answers = [plan('ultra', 'yearly')];
    const second = fakeUi();
    assert.equal(await confirmChange({ ent }, { kind: 'changed', to: 'ultra.yearly' }, { before: planNow(ent), session, ui: second, sleep: async () => {} }), 'confirmed');
    assert.equal(second.events.at(-1)[1].period, 'yearly');
  } finally { delete globalThis.sessionStorage; }
});

test('the back link (?billing=unchanged): asked once, quietly; "No change made. You’re still on hushmallow Flow."', async () => {
  const { server, ent } = await account();
  server.answers = [plan('paid', 'monthly')];
  const ui = fakeUi();
  assert.equal(await confirmChange({ ent }, { kind: 'unchanged' }, { before: planNow(ent), session: memSession(), ui }), 'unchanged');
  assert.deepEqual(ui.events, [['say', 'No change made. You’re still on hushmallow Flow.', 'unchanged']]);
  assert.deepEqual(server.calls.map((c) => c.path), ['/v1/billing/sync'], 'one ask');
  // the payment page let go after a failed payment: never a success, the card line
  resetPlanChange();
  server.answers = [plan('paid', 'monthly', 'past_due')];
  const ui2 = fakeUi();
  assert.equal(await confirmChange({ ent }, { kind: 'unchanged' }, { before: { tier: 'paid', period: 'monthly', status: 'active' }, session: memSession(), ui: ui2 }), 'payment_issue');
  assert.match(ui2.events[0][1], /^Your payment didn’t go through, so you’re still on hushmallow Flow\./);
  // offline: the line from the plan kept
  const away = await account({ held: plan('ultra', 'yearly') });
  away.server.down = true;
  const ui3 = fakeUi();
  assert.equal(await confirmChange({ ent: away.ent }, { kind: 'unchanged' }, { before: planNow(away.ent), session: memSession(), ui: ui3 }), 'unchanged');
  assert.deepEqual(ui3.events, [['say', 'No change made. You’re still on hushmallow Beyond.', 'unchanged']]);
});

test('a server without sync {} yet: the recorded plan (GET status) is asked instead; offline, nothing is ever said to have changed', async () => {
  const { server, ent } = await account();
  server.sync = { http: 400, body: { error: { code: 'invalid_body' } } };
  let asks = 0;
  const answer = server.fetch;
  server.fetch = async (u, i) => { if (new URL(u).pathname === PATHS.status && ++asks === 2) server.status = plan('ultra', 'monthly'); return answer(u, i); };
  // (the billing client holds its fetch: a new one over the same fake)
  const billing = createBilling({ auth: () => authHandle(), signIn: true, config: CONFIG, fetchImpl: server.fetch, nav: () => {} });
  const ent2 = createEntitlements({ store: createStore({ backend: 'memory' }), billing });
  await ent2.refresh({ force: true });
  asks = 0; server.status = plan('paid', 'monthly'); server.calls.length = 0;
  const ui = fakeUi();
  assert.equal(await confirmChange({ ent: ent2 }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(ent2), session: memSession(), ui, sleep: async () => {} }), 'confirmed');
  assert.deepEqual(server.calls.map((c) => c.path), ['/v1/billing/sync', '/v1/billing/status', '/v1/billing/sync', '/v1/billing/status']);
  // offline throughout: no success, the calm line at the end
  resetPlanChange();
  server.down = true;
  const ui2 = fakeUi();
  assert.equal(await confirmChange({ ent }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(ent), session: memSession(), ui: ui2, sleep: async () => {} }), 'timeout');
  assert.deepEqual(kinds(ui2), ['confirming', 'say']);
});

test('back from a change, not signed in on this page: the sign-in screen, the change kept for after it', async () => {
  const away = await account({ signedIn: false, held: null });
  const went = [], session = memSession(), ui = fakeUi();
  const app = { ent: away.ent, go: (...a) => went.push(a) };
  assert.equal(await confirmChange(app, { kind: 'changed', to: 'ultra.monthly' }, { session, ui }), 'signed-out');
  assert.deepEqual(went, [['account', { view: 'signin', notice: 'Sign in to see your plan.' }]]);
  assert.equal(CHANGE_LINES.signIn, RETURN_LINES.signIn);
  assert.equal(pendingChange({ session }).to, 'ultra.monthly', 'kept: the account\'s page (a reload into it) carries on');
  assert.deepEqual(ui.events, []);
  assert.equal(away.server.calls.length, 0);
});

// ------------------------------------------- whose change it is (a shared browser) --
test('a change kept in this tab is the account\'s: another account signed in on the tab never hears of it, and a sign-out takes it', async () => {
  const session = memSession();
  const at = Date.parse('2026-10-17T20:00:00Z');
  let t = at;
  const now = () => t;
  // A (Flow monthly) upgrades to Beyond monthly; Stripe's answer is late, so the change is kept for a quiet check
  const a = await account({ held: plan('paid', 'monthly'), uid: UID_A });
  a.server.answers = [plan('paid', 'monthly')];
  assert.equal(await confirmChange({ ent: a.ent }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(a.ent), session, ui: fakeUi(), now, sleep: async () => {} }), 'timeout');
  assert.deepEqual([pendingChange({ session, now: t }).state, pendingChange({ session, now: t }).uid], ['quiet', UID_A], 'kept with the account');
  // A signs out (elsewhere: this tab's copy stays) and B, who already holds Beyond monthly, signs in on this tab
  for (const [held, quiet] of [[plan('ultra', 'monthly'), true], [plan('paid', 'yearly'), null]]) {
    const copy = JSON.stringify({ ...JSON.parse(session.getItem(CHANGE_KEY)), state: 'quiet' });
    session.setItem(CHANGE_KEY, copy);
    resetPlanChange();
    const b = await account({ held, uid: UID_B });
    b.server.answers = [held];
    const ui = fakeUi();
    t += QUIET_RECHECK_MS;
    assert.equal(await resumeChange({ ent: b.ent }, { quiet, before: planNow(b.ent), session, ui, now, sleep: async () => {} }), null, `${held.tier}.${held.period}`);
    assert.deepEqual(ui.events, [], 'no welcome, no "Confirming…", no "still confirming"');
    assert.equal(b.server.calls.length, 0, 'nothing asked for A\'s change');
    assert.equal(session.getItem(CHANGE_KEY), null, 'dropped');
    session.setItem(CHANGE_KEY, copy);
  }
  // A, back on the same tab later, still has it
  resetPlanChange();
  a.server.answers = [plan('ultra', 'monthly')];
  const ui = fakeUi();
  t += QUIET_RECHECK_MS;
  assert.equal(await resumeChange({ ent: a.ent }, { quiet: true, session, ui, now, sleep: async () => {} }), 'confirmed');
  assert.deepEqual(kinds(ui), ['welcome']);
  // any sign-out, a deletion and "Remove this device's data" take this tab's copy (src/auth/client.js)
  assert.deepEqual(ACCOUNT_TAB_KEYS.map((k) => `hm2:${k}`), [CHANGE_KEY, TRIP_KEY]);
  departChange({ uid: UID_A, from: plan('paid', 'monthly'), to: 'ultra.yearly' }, { session, now: t });
  rememberChange({ to: 'ultra.yearly', at: t, from: { tier: 'paid', period: 'monthly' }, state: 'quiet', uid: UID_A }, { session });
  session.setItem('hm2:planIntent', '{"plan":"paid","period":"yearly","at":1}');
  assert.equal(removeAccountTabKeys(session), 2);
  assert.deepEqual([session.getItem(CHANGE_KEY), session.getItem(TRIP_KEY)], [null, null]);
  assert.notEqual(session.getItem('hm2:planIntent'), null, 'a guest\'s chosen plan is not the account\'s');
  const client = read('src/auth/client.js');
  assert.equal((client.match(/removeAccountTabKeys\(ss\);/g) || []).length, 3, 'sign-out, deletion, this device\'s data');
});

test('the way back lands on a tab signed in as another account since the trip left: not theirs, nothing said, nothing asked', async () => {
  const session = memSession();
  globalThis.sessionStorage = session;   // billing.js keeps the trip in this tab (its default session)
  try {
    const a = await account({ held: plan('paid', 'monthly'), uid: UID_A });
    a.server.portal = { http: 200, body: { url: 'https://billing.stripe.com/p/flow/up', flow: 'subscription_update_confirm', to: 'ultra.monthly' } };
    assert.deepEqual(await a.ent.manage({ intent: 'upgrade', plan: 'ultra', period: 'monthly' }), { redirecting: true, to: 'ultra.monthly' });
    const trip = JSON.parse(session.getItem(TRIP_KEY));
    assert.deepEqual([trip.uid, trip.from, trip.to], [UID_A, { tier: 'paid', period: 'monthly', status: 'active' }, 'ultra.monthly'], 'whose trip, and from what');
    // meanwhile A signed out and B (already on Beyond monthly) signed in: the tab reloads into B's namespace
    const b = await account({ held: plan('ultra', 'monthly'), uid: UID_B });
    b.server.answers = [plan('ultra', 'monthly')];
    const ui = fakeUi();
    assert.equal(await confirmChange({ ent: b.ent }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(b.ent), session, ui, sleep: async () => {} }), 'other-account');
    assert.deepEqual(ui.events, []);
    assert.equal(b.server.calls.length, 0);
    assert.deepEqual([session.getItem(CHANGE_KEY), session.getItem(TRIP_KEY)], [null, null]);
    // the back link the same
    departChange({ uid: UID_A, from: plan('paid', 'monthly'), to: null }, { session });
    assert.equal(await confirmChange({ ent: b.ent }, { kind: 'unchanged' }, { before: planNow(b.ent), session, ui, sleep: async () => {} }), 'other-account');
    assert.deepEqual(ui.events, []);
    // A's own way back: the trip's plan is the plan before
    departChange({ uid: UID_A, from: plan('paid', 'monthly'), to: 'ultra.monthly' }, { session });
    a.server.answers = [plan('ultra', 'monthly')];
    const mine = fakeUi();
    assert.equal(await confirmChange({ ent: a.ent }, { kind: 'changed', to: 'ultra.monthly' }, { before: planNow(a.ent), session, ui: mine, sleep: async () => {} }), 'confirmed');
    assert.deepEqual(mine.events.at(-1), ['welcome', { tier: 'ultra', period: 'monthly', from: { tier: 'paid', period: 'monthly', status: 'active' }, to: 'ultra.monthly' }]);
    assert.equal(session.getItem(TRIP_KEY), null, 'taken');
    // a trip is kept for TRIP_MS, then forgotten
    departChange({ uid: UID_A, from: null, to: null }, { session, now: 1e12 });
    assert.equal(takeTrip({ session, now: 1e12 + TRIP_MS }), null);
    assert.equal(TRIP_MS, 2 * 3600000);
  } finally { delete globalThis.sessionStorage; }
});

test('back from a change on a page not signed in: the plan before is the trip\'s own (never the guest\'s "none"), so a change Stripe did not make is never welcomed', async () => {
  const { welcomeKind } = await import('../src/app/scenes/beyond-welcome.js');
  const session = memSession();
  globalThis.sessionStorage = session;
  try {
    // A on Beyond monthly picks Flow on Stripe's chooser; Stripe schedules it for the period end, so Beyond stays
    const a = await account({ held: plan('ultra', 'monthly'), uid: UID_A });
    a.server.portal = { http: 200, body: { url: 'https://billing.stripe.com/p/flow/choose', flow: 'subscription_update' } };
    assert.deepEqual(await a.ent.manage({ intent: 'switch' }), { redirecting: true });
    // the session lapsed on this tab: the way back lands on a guest's page
    const away = await account({ signedIn: false, held: null, uid: null });
    assert.equal(planNow(away.ent).tier, 'none', 'the web plan counts for nobody here');
    const went = [];
    assert.equal(await confirmChange({ ent: away.ent, go: (...x) => went.push(x) }, { kind: 'changed', to: null }, { before: planNow(away.ent), session, ui: fakeUi() }), 'signed-out');
    assert.deepEqual(pendingChange({ session }).from, { tier: 'ultra', period: 'monthly', status: 'active' }, 'the trip\'s plan, never none');
    assert.equal(pendingChange({ session }).uid, UID_A);
    // signed in again: Stripe still says Beyond monthly (the move to Flow waits for the period end)
    a.server.answers = [plan('ultra', 'monthly')];
    const ui = fakeUi();
    const out = await resumeChange({ ent: a.ent }, { before: planNow(a.ent), session, ui, sleep: async () => {} });
    assert.notEqual(out, 'confirmed');
    assert.ok(!kinds(ui).includes('welcome'), 'no "Welcome to hushmallow Beyond" for the plan being left');
    // Beyond monthly → yearly on the same path: the smaller welcome, as from the page itself
    resetPlanChange();
    departChange({ uid: UID_A, from: plan('ultra', 'monthly'), to: 'ultra.yearly' }, { session });
    assert.equal(await confirmChange({ ent: away.ent, go() {} }, { kind: 'changed', to: 'ultra.yearly' }, { before: planNow(away.ent), session, ui: fakeUi() }), 'signed-out');
    a.server.answers = [plan('ultra', 'yearly')];
    const y = fakeUi();
    assert.equal(await resumeChange({ ent: a.ent }, { before: planNow(a.ent), session, ui: y, sleep: async () => {} }), 'confirmed');
    assert.equal(welcomeKind(y.events.at(-1)[1]), 'plan', 'You\'re on hushmallow Beyond, yearly');
  } finally { delete globalThis.sessionStorage; }
  // no trip kept here (an old address, another tab): the plan before is not known on a page not signed in; after the
  // sign-in it is the account's own plan kept on this phone, when it holds one
  const t2 = memSession();
  const guest = await account({ signedIn: false, held: null, uid: null });
  for (const to of [null, 'ultra.yearly']) {
    resetPlanChange();
    assert.equal(await confirmChange({ ent: guest.ent, go() {} }, { kind: 'changed', to }, { before: planNow(guest.ent), session: t2, ui: fakeUi() }), 'signed-out');
    assert.equal(pendingChange({ session: t2 }).from, null, 'not known');
    // a fresh device for this account (nothing kept): a chooser change is never confirmed against nothing; an upgrade
    // with its target is, by that target, with the smaller welcome (what came before is not known)
    const fresh = await account({ held: plan('paid', 'monthly'), uid: UID_A, store: createStore({ backend: 'memory' }) });
    fresh.server.answers = [plan('ultra', 'yearly')];
    const ui = fakeUi();
    const out = await resumeChange({ ent: fresh.ent }, { before: { tier: 'none', period: null, status: null }, session: t2, ui, sleep: async () => {} });
    if (!to) { assert.notEqual(out, 'confirmed'); assert.ok(!kinds(ui).includes('welcome')); }
    else {
      assert.equal(out, 'confirmed');
      assert.deepEqual(ui.events.at(-1)[1], { tier: 'ultra', period: 'yearly', from: null, fromUnknown: true, to: 'ultra.yearly' });
      assert.equal(welcomeKind(ui.events.at(-1)[1]), 'plan');
    }
    forgetChangeIn(t2);
  }
  // the account's own plan kept here: the plan before, and Flow → Beyond gets Beyond's welcome
  resetPlanChange();
  assert.equal(await confirmChange({ ent: guest.ent, go() {} }, { kind: 'changed', to: 'ultra.yearly' }, { before: planNow(guest.ent), session: t2, ui: fakeUi() }), 'signed-out');
  const kept = await account({ held: plan('paid', 'monthly'), uid: UID_A });
  kept.server.answers = [plan('ultra', 'yearly')];
  const ui = fakeUi();
  assert.equal(await resumeChange({ ent: kept.ent }, { before: planNow(kept.ent), session: t2, ui, sleep: async () => {} }), 'confirmed');
  assert.deepEqual(ui.events.at(-1)[1].from, { tier: 'paid', period: 'monthly', status: 'active' });
  assert.equal(welcomeKind(ui.events.at(-1)[1]), 'beyond');
  // the chooser's verdict against a plan not known, or none: never a change
  for (const from of [null, { tier: 'none', period: null }]) assert.equal(verdict({ tier: 'paid', period: 'monthly', status: 'active' }, { to: null, from }), 'waiting', JSON.stringify(from));
});
const forgetChangeIn = (session) => session.removeItem(CHANGE_KEY);

test('the back link (?billing=unchanged) with a plan kept here that counts for nobody (no owner, from before this release): "No change made", never a welcome', async () => {
  const store = createStore({ backend: 'memory' });
  store.set('entitlement', { tier: 'paid', source: 'billing', since: Date.now() - 86400000, checkedAt: Date.now() - 3600000, period: 'monthly', status: 'active' });
  const a = await account({ held: null, uid: UID_A, store });
  assert.equal(planNow(a.ent).tier, 'none', 'kept without an owner: it counts for nobody until the server answers');
  const before = planNow(a.ent);
  a.server.answers = [plan('paid', 'monthly')];
  const ui = fakeUi();
  assert.equal(await confirmChange({ ent: a.ent }, { kind: 'unchanged' }, { before, session: memSession(), ui }), 'unchanged');
  assert.deepEqual(ui.events, [['say', 'No change made. You’re still on hushmallow Flow.', 'unchanged']]);
  // older than the grace, or another account's: the same
  for (const kept of [{ checkedAt: Date.now() - 4 * 86400000, owner: UID_A }, { checkedAt: Date.now() - 3600000, owner: UID_B }]) {
    const st = createStore({ backend: 'memory' });
    st.set('entitlement', { tier: 'ultra', source: 'billing', since: 1, period: 'yearly', status: 'active', ...kept });
    const x = await account({ held: null, uid: UID_A, store: st });
    const b4 = planNow(x.ent);
    x.server.answers = [plan('ultra', 'yearly')];
    const u = fakeUi();
    assert.equal(await confirmChange({ ent: x.ent }, { kind: 'unchanged' }, { before: b4, session: memSession(), ui: u }), 'unchanged', JSON.stringify(kept));
    assert.deepEqual(u.events, [['say', 'No change made. You’re still on hushmallow Beyond.', 'unchanged']]);
  }
});

test('welcomeBack: a change\'s way back goes to the confirmation; a Beyond Checkout opens Beyond\'s welcome instead of the plain line', async () => {
  const { server, ent } = await account();
  server.answers = [plan('ultra', 'monthly')];
  const ui = fakeUi(), toasts = [];
  const app = { ent, toast: (t) => toasts.push(t), haptic() {}, world: { react() {} } };
  assert.equal(await welcomeBack(app, { kind: 'changed', sessionId: null, to: 'ultra.monthly' }, { before: planNow(ent), sleep: async () => {}, change: { session: memSession(), ui } }), 'confirmed');
  assert.deepEqual(kinds(ui), ['confirming', 'close', 'welcome']);
  assert.deepEqual(toasts, []);
  // Checkout: hushmallow Beyond, confirmed by the session's sync → its welcome (app.welcomePlan), no toast
  const id = `cs_test_${'a1B2'.repeat(15)}`;
  const fresh = await account({ held: null });
  fresh.server.sync = { http: 200, body: plan('ultra', 'yearly') };
  const welcomed = [];
  const app2 = { ent: fresh.ent, toast: (t) => toasts.push(t), haptic() {}, world: { react() {} }, welcomePlan: async (r) => { welcomed.push(r); } };
  assert.equal(await welcomeBack(app2, { kind: 'success', sessionId: id }, { sleep: async () => {} }), 'welcome');
  assert.deepEqual(welcomed, [{ tier: 'ultra', period: 'yearly', from: null }]);
  assert.deepEqual(toasts, []);
  // hushmallow Flow: the line, as before
  const flow = await account({ held: null });
  flow.server.sync = { http: 200, body: plan('paid', 'monthly') };
  assert.equal(await welcomeBack({ ...app2, ent: flow.ent }, { kind: 'success', sessionId: id }, { sleep: async () => {} }), 'welcome');
  assert.deepEqual(toasts, ['Welcome to hushmallow Flow']);
  assert.equal(welcomed.length, 1);
});

test('main.js: the way back first, else a change kept in this tab carries on; a quiet check when the app is back on screen', () => {
  const main = read('src/app/main.js');
  assert.match(main, /if \(billingBack\) welcomeBack\(app, billingBack, \{ before: planBefore \}\)\.catch\(\(\) => \{\}\);\n {2}\/\/[^\n]*\n {2}else if \(billing\) resumeChange\(app, \{ before: planBefore \}\)\.catch\(\(\) => \{\}\);/);
  // the plan kept before any check, whether or not this start is a way back (a change kept from a page not signed in
  // is judged against the account's own plan)
  assert.match(main, /const planBefore = billing \? planNow\(ent\) : null;/);
  assert.ok(main.indexOf('const planBefore = billing') < main.indexOf('ent.refresh().catch'), 'taken before the first check');
  assert.match(main, /if \(billing\) document\.addEventListener\('visibilitychange', \(\) => \{ if \(document\.visibilityState === 'visible'\) resumeChange\(app, \{ quiet: true \}\)\.catch\(\(\) => \{\}\); \}\);/);
  assert.match(main, /app\.welcomePlan = async \(result\) => \{/);
  assert.match(main, /\(await import\('\.\/scenes\/beyond-welcome\.js'\)\)\.openPlanWelcome\(app, result\)/);
  // (never over a ritual or a conversation: a line there instead)
  assert.match(main, /const WELCOME_SCENES = \['home', 'plans', 'settings', 'account'/);
  assert.doesNotMatch(main.match(/const WELCOME_SCENES = \[[^\]]*\]/)[0], /ritual|angle|encounter|express/);
});

// ------------------------------------------------------- the welcome --
test('the Beyond welcome: the seven Mallows, a labelled modal dialog, focus in and back, Escape and Continue close it', async () => {
  const { doc, scene } = installDom();
  const { openPlanWelcome, WELCOME_LINES, beyondLines } = await import('../src/app/scenes/beyond-welcome.js');
  const opener = new FakeEl('button', doc);
  scene.append(opener);
  opener.focus();
  const { app, log } = welcomeApp();
  const s = await openPlanWelcome(app, { tier: 'ultra', period: 'monthly', from: { tier: 'paid', period: 'monthly' } });
  const el = s.el;
  assert.equal(el.attrs.role, 'dialog');
  assert.equal(el.attrs['aria-modal'], 'true');
  assert.equal(el.attrs['aria-label'], undefined, 'labelled by its heading');
  const heading = all(el).find((n) => n.attrs?.id === el.attrs['aria-labelledby']);
  assert.equal(heading.tagName, 'H2');
  assert.equal(text(heading), 'Welcome to hushmallow Beyond');
  assert.ok(all(heading).some((n) => n.attrs?.class === 'brand-name' && text(n) === 'hushmallow'), 'the brand marked (never uppercased)');
  assert.ok(all(el).find((n) => n.attrs?.id === el.attrs['aria-describedby']));
  assert.ok(el.classList.contains('plan-welcome') && el.classList.contains('is-beyond') && el.classList.contains('full'), 'the whole screen');
  assert.equal(el.attrs['data-plan-welcome'], 'beyond');
  assert.equal(el.attrs['data-to'], 'ultra.monthly');
  // the seven, each its own picture from the registry (the app's own files: nothing fetched from anywhere else)
  const imgs = all(el).filter((n) => n.tagName === 'IMG');
  assert.deepEqual(imgs.map((i) => i.parentNode.attrs['data-mallow']).sort(), [...MALLOW_IDS].sort());
  for (const i of imgs) {
    assert.equal(i.attrs.src, MALLOWS[i.parentNode.attrs['data-mallow']].file);
    assert.ok(i.attrs.src.startsWith(new URL('../assets/', import.meta.url).href), i.attrs.src);
    assert.equal(i.attrs.alt, '');
  }
  const gather = all(el).find((n) => n.attrs?.class === 'pw-gather');
  assert.equal(gather.attrs.role, 'img');
  assert.equal(gather.attrs['aria-label'], WELCOME_LINES.gathered);
  // the words: what Beyond opens, and where to change or cancel
  const words = text(el);
  for (const line of beyondLines()) assert.ok(words.includes(line), line);
  assert.ok(words.includes('You can change your plan or cancel any time in Settings → Manage subscription.'));
  const buttons = all(el).filter((n) => n.tagName === 'BUTTON');
  assert.deepEqual(buttons.map(text), ['Try Another Angle', 'Continue']);
  assert.ok(buttons.every((b) => b.classList.contains('btn')), 'the app\'s buttons: 52 px, ghost 44 px (app.css)');
  assert.deepEqual(log.haptics, ['success'], 'the success haptic, as the app does');
  assert.deepEqual(log.reacts, ['celebrate']);
  // the focus moves to the heading (never to a button a second Enter would press), and back to the opener on close
  await sleepFor(520);
  assert.equal(doc.activeElement, heading);
  assert.equal(scene.inert, true, 'what is behind is out of reach');
  doc.key('Escape');
  assert.equal(s.open, false, 'Escape closes it');
  assert.notEqual(scene.inert, true);
  await sleepFor(500);
  assert.equal(doc.activeElement, opener, 'the focus comes back');
  assert.equal(el.parentNode, null);
  // Continue closes it; Try Another Angle closes it and opens Another Angle
  const again = await openPlanWelcome(app, { tier: 'ultra', period: 'yearly', from: null });
  await click(all(again.el).find((n) => n.attrs?.['data-act'] === 'continue'));
  assert.equal(again.open, false);
  const third = await openPlanWelcome(app, { tier: 'ultra', period: 'yearly', from: null });
  await click(all(third.el).find((n) => n.attrs?.['data-act'] === 'try-angle'));
  assert.equal(third.open, false);
  assert.deepEqual(log.went, ['angle']);
  await sleepFor(500);
});

test('the welcome is still with reduced motion or low stimulation; a yearly move or a move to Flow gets the smaller one', async () => {
  installDom();
  const { openPlanWelcome, welcomeKind, planLine } = await import('../src/app/scenes/beyond-welcome.js');
  for (const opts of [{ reduced: true }, { lowStim: true }]) {
    const { app, log } = welcomeApp(opts);
    const s = await openPlanWelcome(app, { tier: 'ultra', period: 'monthly', from: { tier: 'paid' } });
    assert.ok(s.el.classList.contains('is-still'), JSON.stringify(opts));
    assert.deepEqual(log.reacts, [], 'no celebration movement either');
    assert.deepEqual(log.haptics, ['success']);
    s.close();
  }
  const { app } = welcomeApp();
  const moving = await openPlanWelcome(app, { tier: 'ultra', period: 'monthly', from: { tier: 'paid' } });
  assert.ok(!moving.el.classList.contains('is-still'));
  moving.close();
  assert.equal(welcomeKind({ tier: 'ultra', from: { tier: 'paid' } }), 'beyond');
  assert.equal(welcomeKind({ tier: 'ultra', from: null }), 'beyond', 'a Beyond Checkout');
  assert.equal(welcomeKind({ tier: 'ultra', from: { tier: 'ultra' } }), 'plan', 'Beyond monthly → yearly');
  assert.equal(welcomeKind({ tier: 'paid', from: { tier: 'paid' } }), 'plan');
  assert.equal(welcomeKind({ tier: 'paid', from: { tier: 'ultra' } }), 'plan');
  assert.equal(planLine({ tier: 'paid', period: 'yearly' }), 'You’re on hushmallow Flow, yearly');
  assert.equal(planLine({ tier: 'ultra', period: null }), 'You’re on hushmallow Beyond');
  const { app: a2 } = welcomeApp({ mallow: 'blubi' });
  const small = await openPlanWelcome(a2, { tier: 'paid', period: 'yearly', from: { tier: 'paid', period: 'monthly' } });
  assert.equal(small.el.attrs['data-plan-welcome'], 'plan');
  assert.ok(!small.el.classList.contains('full'), 'a sheet, not the whole screen');
  assert.equal(text(all(small.el).find((n) => n.attrs?.id === small.el.attrs['aria-labelledby'])), 'You’re on hushmallow Flow, yearly');
  assert.deepEqual(all(small.el).filter((n) => n.tagName === 'IMG').map((i) => i.parentNode.attrs['data-mallow']), ['glitzi', 'blubi', 'zuzu'], 'the home Mallow in the middle');
  assert.deepEqual(all(small.el).filter((n) => n.tagName === 'BUTTON').map(text), ['Continue']);
  assert.ok(text(small.el).includes('Billed once a year. You can change your plan or cancel any time in Settings → Manage subscription.'));
  small.close();
  await sleepFor(500);
});

test('the welcome\'s CSS: design tokens only, nothing from elsewhere, nothing moving when still, targets ≥ 44 px', () => {
  const css = read('src/ui/plan-welcome.css');
  assert.doesNotMatch(css, /url\(|https?:|@import/, 'no external request (CSP: self)');
  assert.match(css, /\.plan-welcome\.is-still \.pw-mallow, \.plan-welcome\.is-still \.pw-spark \{ animation: none; \}/);
  assert.match(css, /\.plan-welcome\.is-still \.pw-spark \{ display: none; \}/);
  assert.match(css, /\.sheet\.plan-welcome\.is-still, \.sheet\.plan-welcome\.is-still\.full \{ transition: none; \}/);
  const rm = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)[1];
  assert.match(rm, /\.pw-mallow, \.pw-spark \{ animation: none; \}/);
  assert.match(css, /\.plan-note\.is-still, \.plan-note\.is-still \.plan-note-dot \{ animation: none; \}/);
  // every text size from the type tokens (Settings → Text size grows it); no px font size at all
  assert.doesNotMatch(css, /font(-size)?:\s*[^;]*\d+px/);
  for (const m of css.matchAll(/font: (var\(--type-[a-z-]+\))/g)) assert.match(m[1], /^var\(--type-(overline|cinematic|discovery|body|caption|label)\)$/);
  // no target made smaller than 44 px here (the buttons are the app's .btn: 52 px, ghost 44 px)
  for (const m of css.matchAll(/min-height:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 44, m[0]);
  assert.match(read('src/ui/app.css'), /\.btn \{[^}]*min-height: 52px/);
  assert.match(read('src/ui/app.css'), /\.btn\.ghost \{[^}]*min-height: 44px/);
});

test('the words: calm and warm, true to what Beyond includes, the plan names in full, nothing medical or pushy', async () => {
  const W = await import('../src/app/scenes/beyond-welcome.js');
  const includes = PLANS.ultra.includes.join(' ');
  const lines = W.beyondLines();
  assert.equal(lines.length, LIVE_FEATURES.beliefMallows ? 3 : 2);
  assert.match(lines[0], /^Another Angle: fresh perspectives on your own situations, explored with Zuzu$/);
  assert.ok(includes.includes('Another Angle: fresh perspectives on your own situations, explored with Zuzu'));
  if (LIVE_FEATURES.beliefMallows) { assert.match(lines[1], /^Belief Mallows/); assert.match(includes, /Belief Mallow investigation for the stories that keep coming back/); }
  assert.match(lines.at(-1), /^Perspective-changing worlds, with everything in hushmallow Flow$/);
  assert.match(includes, /Perspective-changing worlds made for Another Angle/);
  assert.match(includes, /Everything in hushmallow Flow/);
  const copy = [
    ...Object.values(W.WELCOME_LINES), ...lines, W.planLine({ tier: 'paid', period: 'yearly' }), W.planDetail({ period: 'monthly' }),
    ...Object.values(CHANGE_LINES).map((v) => (typeof v === 'function' ? v('hushmallow Flow') : v)),
  ];
  for (const l of copy) {
    assert.doesNotMatch(l, /\bAI\b|\b(Paid|Ultra|Premium|premium)\b|Hushmallow|HUSHMALLOW/, l);
    assert.doesNotMatch(l, /therap|treat|cure|heal|diagnos|clinical|anxiety|depress|symptom/i, `no medical or therapy claim: ${l}`);
    assert.doesNotMatch(l, /now or never|limited|hurry|don’t miss|last chance|!/i, `never pushy: ${l}`);
    assert.doesNotMatch(l, /\b(Step into|Upgrade to|on|to) (Flow|Beyond)\b/, `the plan's whole name: ${l}`);
  }
  assert.equal(W.WELCOME_LINES.beyondTitle, 'Welcome to hushmallow Beyond');
  assert.equal(CHANGE_LINES.confirming, 'Confirming your new plan with Stripe…');
  assert.equal(CHANGE_LINES.unchanged('hushmallow Flow'), 'No change made. You’re still on hushmallow Flow.');
});

test('the confirmation\'s own UI: a calm status line (role=status), then what came of it; the payment sheet opens Manage subscription', async () => {
  const { doc } = installDom();
  const { planChangeUi } = await import('../src/app/plan-change.js');
  const { ent, server, navs } = await account();
  const { app } = welcomeApp({ reduced: true });
  const ui = planChangeUi({ ...app, ent });
  const note = ui.confirming();
  assert.equal(note.el.attrs.role, 'status');
  assert.equal(note.el.attrs['aria-live'], 'polite');
  assert.equal(note.el.attrs['data-plan-confirm'], 'confirming');
  assert.ok(note.el.classList.contains('is-still'), 'nothing moves with reduced motion');
  await sleepFor(5);
  assert.equal(text(note.el), 'Confirming your new plan with Stripe…');
  assert.ok(!/welcome|confirmed|upgraded/i.test(text(note.el)), 'never a success');
  note.say(CHANGE_LINES.timeout, 0, 'timeout');
  assert.equal(text(note.el), CHANGE_LINES.timeout);
  assert.equal(note.el.attrs['data-plan-confirm'], 'timeout');
  note.close();
  assert.equal(note.el.parentNode, null);
  // one line at a time
  ui.say('first', 0, 'unchanged');
  ui.say('second', 0, 'unchanged');
  await sleepFor(5);
  assert.deepEqual(doc.body.children.filter((n) => n.classList?.contains('plan-note')).map(text), ['second']);
  // the payment to sort out: a dialog with Settings' own Manage subscription (the portal's front page)
  const s = ui.paymentIssue(CHANGE_LINES.paymentIssue('hushmallow Flow'));
  assert.equal(s.el.attrs.role, 'dialog');
  assert.equal(s.el.attrs['data-plan-confirm'], 'payment_issue');
  assert.ok(text(s.el).includes('Your payment didn’t go through, so you’re still on hushmallow Flow. Update your card in Settings → Manage subscription.'));
  const manage = all(s.el).find((n) => n.attrs?.['data-act'] === 'manage-subscription');
  assert.deepEqual(all(s.el).filter((n) => n.tagName === 'BUTTON').map(text).slice(-2), ['Not now', 'Manage subscription']);
  await click(manage);
  assert.deepEqual(server.calls.map((c) => [c.path, c.body]), [['/v1/billing/portal', {}]]);
  assert.deepEqual(navs, ['https://billing.stripe.com/p/session/test_portal']);
  s.close();
  // with no welcome on the page (never main.js): the plan said in a line, never before the confirmation called it
  const toasts = [];
  planChangeUi({ ent, toast: (t) => toasts.push(t), haptic() {} }).welcome({ tier: 'ultra', period: 'monthly' });
  assert.deepEqual(toasts, ['Welcome to hushmallow Beyond']);
  await sleepFor(500);
});
