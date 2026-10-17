// A change of plan made on Stripe's own page (src/app/billing.js: upgrade() opens Stripe's confirmation of exactly
// one upgrade, portal('switch') its plan chooser), on the way back. Nothing here is ever a success until Stripe has
// confirmed it: the server reads the subscription from Stripe (billing.js refresh, POST sync {}; GET status while
// that is not answered) and only a plan of the target tier AND period, active or trialing, is a confirmed change.
//
//   ?billing=changed&to=<plan>.<period>  Stripe made the change (its after_completion redirect). { to, at, from } is
//                     kept in this tab (CHANGE_KEY, sessionStorage, CHANGE_MS), so a reload mid-confirmation resumes;
//                     a calm "Confirming your new plan with Stripe…" shows (never a success) while the server is asked
//                     at CONFIRM_WAITS. Confirmed: the key says so (state 'done', so Back onto the same way back never
//                     says it twice) and the welcome opens (app.welcomePlan: hushmallow Beyond's with the Mallows, or a
//                     smaller one). A payment to sort out (past_due, unpaid, incomplete): no success, the card line and
//                     Manage subscription. Not in time: "Stripe is still confirming…", the key kept (state 'quiet') and
//                     asked again quietly at the next start or when the app is back on screen (resumeChange).
//   ?billing=changed  (no to: Stripe's plan chooser) the same, against the plan kept before the trip (`from`).
//   ?billing=unchanged  Stripe's back link (a change let go, or one that did not go through): asked once, quietly;
//                     nothing changed → "No change made. You're still on <plan>."
//
//   confirmChange(app, { kind, to }, { before, waits?, sleep?, session?, now?, ui? }) → 'confirmed' | 'payment_issue'
//     | 'timeout' | 'unchanged' | 'repeat' | 'signed-out' | 'stopped' | null (another kind)
//   resumeChange(app, { quiet? }) → as above, or null (nothing kept here, it ran out, or it is done)
//   verdict(plan, rec) → 'confirmed' | 'payment_issue' | 'waiting'   (plan: { tier, period, status } as the server said)
//   rememberChange(rec) / pendingChange() / forgetChange(): the kept change, { to, at, from, state, result? }
//   ensurePlanCss() → resolves once src/ui/plan-welcome.css is in (the note, the payment sheet and the welcome)
import { h, openSheet } from './ui.js';
import { PLANS } from './entitlements.js';

/** A change's target as the server writes it into the way back (?billing=changed&to=ultra.monthly): plan, then period. */
export const PLAN_TO = /^(paid|ultra)\.(monthly|yearly)$/;
export const CHANGE_KEY = 'hm2:planChange';
/** How long a change on its way is kept in this tab (a reload mid-confirmation, a check when the app is back): 15 minutes. */
export const CHANGE_MS = 15 * 60000;
/** The waits (ms) between asks after Stripe's way back: about 85 s in all. */
export const CONFIRM_WAITS = Object.freeze([0, 1500, 3000, 5000, 8000, 13000, 21000, 34000]);
/** The least time between two quiet checks when the app comes back on screen. */
export const QUIET_RECHECK_MS = 15000;
/** Stripe's statuses that confirm a plan, and those that mean a payment to sort out first (never a success). */
export const OK_STATUSES = Object.freeze(['active', 'trialing']);
export const PAYMENT_STATUSES = Object.freeze(['past_due', 'unpaid', 'incomplete', 'incomplete_expired']);
const STATES = ['confirming', 'quiet', 'done'];
const TIERS = ['none', 'paid', 'ultra'];
const PERIODS = ['monthly', 'yearly'];

/** What the way back says. Calm, never a success before Stripe's word; the plan names in full. */
export const CHANGE_LINES = Object.freeze({
  confirming: 'Confirming your new plan with Stripe…',
  timeout: 'Stripe is still confirming your change. Your plan will update here as soon as it’s confirmed.',
  paymentTitle: 'Your payment needs a look',
  /** the plan as it still is (the change waits on the payment) */
  paymentIssue: (plan) => `Your payment didn’t go through, so you’re still on ${plan}. Update your card in Settings → Manage subscription.`,
  /** the new plan is on the subscription, its payment not through */
  paymentIssueNew: 'Your payment didn’t go through, so your new plan isn’t confirmed yet. Update your card in Settings → Manage subscription.',
  unchanged: (plan) => (plan ? `No change made. You’re still on ${plan}.` : 'No change made.'),
  signIn: 'Sign in to see your plan.',
  manageFailed: 'That didn’t open just now. Try again in a moment.',
});
const NOTE_MS = { timeout: 8000, unchanged: 4200 };

function safeSession() { try { return globalThis.sessionStorage || null; } catch { return null; } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** { tier, period, status } of the web plan kept on this phone now (the server's last answer). */
export function planOf(ent) {
  const p = ent?.webPlan?.() || null;
  return { tier: ent?.tier?.() ?? 'none', period: p?.period ?? null, status: p?.status ?? null };
}
const cleanFrom = (f) => ({
  tier: TIERS.includes(f?.tier) ? f.tier : 'none',
  period: PERIODS.includes(f?.period) ? f.period : null,
  status: typeof f?.status === 'string' && /^[a-z_]{1,24}$/.test(f.status) ? f.status : null,
});

/** Keep a change on its way (this tab only): { to, at, from: { tier, period, status }, state, result? }. */
export function rememberChange(rec, { session = safeSession() } = {}) {
  if (!rec || !(rec.to === null || PLAN_TO.test(rec.to)) || !Number.isFinite(rec.at) || !STATES.includes(rec.state)) return;
  const v = { to: rec.to, at: rec.at, from: cleanFrom(rec.from), state: rec.state, ...(rec.result ? { result: { tier: rec.result.tier, period: rec.result.period ?? null } } : {}) };
  try { session?.setItem(CHANGE_KEY, JSON.stringify(v)); } catch { /* not kept: a reload asks nothing more */ }
}
/** The change kept here in the last CHANGE_MS, or null (an old or odd one is forgotten). */
export function pendingChange({ session = safeSession(), now = Date.now() } = {}) {
  let raw = null, v = null;
  try { raw = session?.getItem(CHANGE_KEY) ?? null; v = JSON.parse(raw || 'null'); } catch { v = null; }
  const ok = !!v && typeof v === 'object' && (v.to === null || (typeof v.to === 'string' && PLAN_TO.test(v.to)))
    && Number.isFinite(v.at) && now >= v.at && now - v.at < CHANGE_MS && STATES.includes(v.state) && !!v.from && typeof v.from === 'object';
  if (raw != null && !ok) forgetChange({ session });
  return ok ? { to: v.to, at: v.at, from: cleanFrom(v.from), state: v.state, ...(v.result ? { result: { tier: v.result.tier, period: v.result.period ?? null } } : {}) } : null;
}
export function forgetChange({ session = safeSession() } = {}) {
  try { session?.removeItem(CHANGE_KEY); } catch { /* it lapses by its time */ }
}

/**
 * What the server's answer says of the change. With a target (`to`): its tier and period, active or trialing.
 * Without one (Stripe's chooser): a tier, or a known period, other than the plan before the trip, active or trialing.
 * A payment to sort out is never a success; anything else is not there yet.
 */
export function verdict(plan, rec) {
  const { tier = 'none', period = null, status = null } = plan || {};
  let landed;
  if (rec?.to) {
    const [t, p] = rec.to.split('.');
    landed = tier === t && period === p;
  } else {
    const f = cleanFrom(rec?.from);
    landed = tier !== 'none' && (tier !== f.tier || (!!f.period && !!period && period !== f.period));
  }
  if (landed && OK_STATUSES.includes(status)) return 'confirmed';
  if (PAYMENT_STATUSES.includes(status)) return 'payment_issue';
  return 'waiting';
}

/** Ask the server: Stripe's own copy first (POST sync {}), the recorded plan while that is not answered. → answered. */
async function ask(ent) {
  try { await ent.refreshFromStripe?.(); } catch { /* the status, below */ }
  if (ent.webAnswered?.()) return true;
  try { await ent.refresh?.({ force: true }); } catch { /* not answered */ }
  return !!ent.webAnswered?.();
}

const nameOf = (tier) => PLANS[tier]?.name || null;
/** The payment line: still on the plan before (the change waits on the payment), or the new plan not confirmed yet. */
function paymentLine(plan, rec) {
  const target = rec.to ? rec.to.split('.')[0] : null;
  const moved = target ? plan.tier === target && plan.tier !== rec.from.tier : plan.tier !== rec.from.tier;
  if (moved && plan.tier !== 'none') return CHANGE_LINES.paymentIssueNew;
  return CHANGE_LINES.paymentIssue(nameOf(rec.from.tier !== 'none' ? rec.from.tier : plan.tier) || 'your plan');
}

let running = null;
let lastQuiet = -Infinity;

/** Ask at `waits` until the server says the change is confirmed, a payment needs a look, or the time is up. */
function run(app, rec, { waits, sleep, session, now, view, quiet }) {
  if (running) return running;
  running = (async () => {
    const { ent } = app;
    const note = quiet ? null : view.confirming();
    for (const ms of waits) {
      if (ms) await sleep(ms);
      // forgotten meanwhile (a new trip to Stripe, or it ran out): no more asks, nothing said
      const still = pendingChange({ session, now: now() });
      if (!still || still.at !== rec.at) { note?.close(); return 'stopped'; }
      if (!(await ask(ent))) continue;
      const plan = planOf(ent);
      const v = verdict(plan, rec);
      if (v === 'confirmed') {
        rememberChange({ ...rec, state: 'done', result: { tier: plan.tier, period: plan.period } }, { session });
        note?.close();
        try { await view.welcome({ tier: plan.tier, period: plan.period, from: rec.from, to: rec.to }); } catch { /* the plan is here all the same */ }
        return 'confirmed';
      }
      if (v === 'payment_issue') {
        forgetChange({ session });
        note?.close();
        view.paymentIssue(paymentLine(plan, rec));
        return 'payment_issue';
      }
    }
    // not confirmed in time: said once; asked again quietly at the next start or when the app is back on screen
    rememberChange({ ...rec, state: 'quiet' }, { session });
    if (note) note.say(CHANGE_LINES.timeout, NOTE_MS.timeout, 'timeout');
    return 'timeout';
  })().finally(() => { running = null; });
  return running;
}

/**
 * Back from Stripe with a change of plan made ('changed') or let go ('unchanged'). before: planNow(ent) as kept before
 * the trip (main.js takes it at start, before the first check).
 */
export async function confirmChange(app, back, {
  before = null, waits = CONFIRM_WAITS, sleep = wait, session = safeSession(), now = () => Date.now(), ui = null,
} = {}) {
  const { ent } = app;
  const view = ui || planChangeUi(app);
  const kind = back?.kind;
  const from = cleanFrom(before || planOf(ent));
  if (kind === 'changed') {
    const to = typeof back.to === 'string' && PLAN_TO.test(back.to) ? back.to : null;
    // Back (or a reload) onto Stripe's way back again after this change was confirmed and said: not said twice
    const prev = pendingChange({ session, now: now() });
    if (prev?.state === 'done' && prev.result && prev.result.tier === from.tier && (prev.result.period ?? null) === from.period
      && (!to || to === `${prev.result.tier}.${prev.result.period}`)) return 'repeat';
    const rec = { to, at: now(), from, state: 'confirming' };
    rememberChange(rec, { session });
    // not signed in on this page: nothing can be asked; the key waits for the sign-in (the page reloads into the account)
    if (!ent.webSignedIn?.()) {
      if (typeof app.go === 'function') app.go('account', { view: 'signin', notice: CHANGE_LINES.signIn });
      else app.toast?.(CHANGE_LINES.signIn, 3600);
      return 'signed-out';
    }
    return run(app, rec, { waits, sleep, session, now, view, quiet: false });
  }
  if (kind === 'unchanged') {
    if (!ent.webSignedIn?.()) return 'signed-out';
    const answered = await ask(ent);
    const plan = planOf(ent);
    if (answered) {
      const v = verdict(plan, { to: null, from });
      // (it did change after all, confirmed by Stripe: another tab, or a change completed before the back link)
      if (v === 'confirmed') {
        rememberChange({ to: null, at: now(), from, state: 'done', result: { tier: plan.tier, period: plan.period } }, { session });
        try { await view.welcome({ tier: plan.tier, period: plan.period, from, to: null }); } catch { /* here all the same */ }
        return 'confirmed';
      }
      if (v === 'payment_issue' && !PAYMENT_STATUSES.includes(from.status)) { view.paymentIssue(paymentLine(plan, { to: null, from })); return 'payment_issue'; }
    }
    view.say(CHANGE_LINES.unchanged(nameOf(answered ? plan.tier : from.tier) || nameOf(from.tier)), NOTE_MS.unchanged, 'unchanged');
    return 'unchanged';
  }
  return null;
}

/**
 * A change kept here and not confirmed yet: asked for again. At start (a reload mid-confirmation: the calm note again,
 * unless it had already run out of time) or quietly when the app comes back on screen (one ask, at most every
 * QUIET_RECHECK_MS). Confirmed: its welcome, as on the way back.
 */
export async function resumeChange(app, { quiet = null, waits = CONFIRM_WAITS, sleep = wait, session = safeSession(), now = () => Date.now(), ui = null } = {}) {
  const rec = pendingChange({ session, now: now() });
  if (!rec || rec.state === 'done' || !app?.ent?.webSignedIn?.()) return null;
  const q = quiet ?? rec.state === 'quiet';
  if (q) {
    if (running) return running;
    if (now() - lastQuiet < QUIET_RECHECK_MS) return null;
    lastQuiet = now();
  }
  return run(app, rec, { waits: q ? [0] : waits, sleep, session, now, view: ui || planChangeUi(app), quiet: q });
}
/** (tests) A fresh start: no run in flight, no quiet check remembered. */
export function resetPlanChange() { running = null; lastQuiet = -Infinity; }

// ------------------------------------------------------------------ the UI --
const CSS_HREF = new URL('../ui/plan-welcome.css', import.meta.url).href;
let cssReady = null;
/** src/ui/plan-welcome.css, once (resolves when it has loaded, or after 1.2 s). */
export function ensurePlanCss() {
  if (cssReady) return cssReady;
  try {
    if (typeof document === 'undefined' || !document.head) return (cssReady = Promise.resolve());
    const have = [...(document.querySelectorAll?.('link[rel="stylesheet"]') || [])].some((l) => l.href === CSS_HREF);
    if (have) return (cssReady = Promise.resolve());
    const link = h('link', { rel: 'stylesheet', href: CSS_HREF });
    cssReady = new Promise((r) => { link.addEventListener('load', r); link.addEventListener('error', r); setTimeout(r, 1200); });
    document.head.append(link);
  } catch { cssReady = Promise.resolve(); }
  return cssReady;
}
/** Nothing moves: reduced motion (the app's setting or the phone's), or low stimulation. */
export function stillFor(app) {
  try { return !!(app?.prefs?.reducedMotion?.() || app?.prefs?.get?.('lowStim')); } catch { return false; }
}

let liveNote = null;
/** A small status line over the bottom of the screen (role=status): the calm "Confirming…", then what came of it. */
export function planNote(app, text, { busy = false, ms = 0, state = 'said' } = {}) {
  liveNote?.close();
  const words = h('span', { class: 'plan-note-text' });
  const dot = busy ? h('span', { class: 'plan-note-dot', 'aria-hidden': 'true' }) : null;
  const el = h('div', { class: `plan-note${busy ? ' is-busy' : ''}${stillFor(app) ? ' is-still' : ''}`, role: 'status', 'aria-live': 'polite', 'data-plan-confirm': state }, dot, words);
  // the live region first, its words once its styles are in (never a line of plain text at the foot of the page; the
  // words arriving in a region already there are what a screen reader announces)
  let line = text, styled = false;
  el.style.opacity = '0';
  document.body.append(el);
  const show = () => { styled = true; el.style.opacity = ''; words.textContent = line; };
  ensurePlanCss().then(show, show);
  let timer = 0;
  const handle = {
    el,
    say(next, after = 0, nextState = 'said') {
      dot?.remove();
      el.classList.remove('is-busy');
      line = next;
      if (styled) words.textContent = next;
      el.setAttribute('data-plan-confirm', nextState);
      clearTimeout(timer);
      if (after) timer = setTimeout(() => handle.close(), after);
    },
    close() { clearTimeout(timer); el.remove(); if (liveNote === handle) liveNote = null; },
  };
  if (ms) timer = setTimeout(() => handle.close(), ms);
  liveNote = handle;
  return handle;
}

/** The payment to sort out: the line, and Settings' own Manage subscription (Stripe's portal: the card, or cancel). */
export function paymentSheet(app, line) {
  ensurePlanCss();
  const status = h('p', { class: 'plan-sheet-status', role: 'status', 'aria-live': 'polite' });
  const manage = h('button', { class: 'btn primary', 'data-act': 'manage-subscription', onclick: async () => {
    if (manage.disabled) return;
    manage.disabled = true;
    let r = null;
    try { r = await app.ent.manage(); } catch { r = null; }
    // leaving for the portal; Back from there can bring this page back as it was, so the button wakes again
    if (r?.redirecting) { setTimeout(() => { manage.disabled = false; }, 4000); return; }
    manage.disabled = false;
    status.textContent = CHANGE_LINES.manageFailed;
  } }, 'Manage subscription');
  const s = openSheet({
    title: CHANGE_LINES.paymentTitle,
    body: h('div', {}, h('p', { class: 'plan-sheet-line' }, line), status),
    foot: h('div', { class: 'row-btns' }, h('button', { class: 'btn', onclick: () => s.close() }, 'Not now'), manage),
  });
  s.el.setAttribute('data-plan-confirm', 'payment_issue');
  return s;
}

/** The UI confirmChange speaks through (tests pass their own). */
export function planChangeUi(app) {
  return {
    confirming: () => planNote(app, CHANGE_LINES.confirming, { busy: true, state: 'confirming' }),
    say: (text, ms, state) => planNote(app, text, { ms, state }),
    welcome: (result) => {
      if (typeof app.welcomePlan === 'function') return app.welcomePlan(result);
      app.toast?.(`Welcome to ${nameOf(result.tier) || 'your new plan'}`);
      app.haptic?.('success');
      return null;
    },
    paymentIssue: (line) => paymentSheet(app, line),
  };
}
