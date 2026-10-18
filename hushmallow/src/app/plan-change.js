// A change of plan made on Stripe's own page (src/app/billing.js: upgrade() opens Stripe's confirmation of exactly
// one upgrade, portal('switch') its plan chooser), on the way back. Nothing here is ever a success until Stripe has
// confirmed it: the server reads the subscription from Stripe (billing.js refresh, POST sync {}; GET status while
// that is not answered) and only a plan of the target tier AND period, active or trialing, is a confirmed change.
//
//   Leaving for Stripe's page (billing.js upgrade() / portal('switch'): departChange): the account making the change and
//                     its plan then are kept in this tab (TRIP_KEY, TRIP_MS), so the way back is judged for that account
//                     only, against that plan, even when it lands on a page that is not signed in (or signed in as
//                     someone else: then it is not theirs, and nothing is said).
//   ?billing=changed&to=<plan>.<period>  Stripe made the change (its after_completion redirect). { to, at, from, uid } is
//                     kept in this tab (CHANGE_KEY, sessionStorage, CHANGE_MS), so a reload mid-confirmation resumes;
//                     a calm "Confirming your new plan with Stripe…" shows (never a success) while the server is asked
//                     at CONFIRM_WAITS. Confirmed: the key says so (state 'done', so Back onto the same way back never
//                     says it twice) and the welcome opens (app.welcomePlan: hushmallow Beyond's with the Mallows, or a
//                     smaller one). A payment to sort out (past_due, unpaid, incomplete): no success, the card line and
//                     Manage subscription. Set by Stripe for later (the portal schedules a downgrade or a shorter
//                     period for the period end, D8: the status's scheduled_change): "Your plan changes to … on …",
//                     and nothing more is asked. Not in time: a neutral line ("Your plan here still shows …"), never a
//                     claim that Stripe is still confirming, the key kept (state 'quiet') and asked again quietly at
//                     the next start or when the app is back on screen (resumeChange).
//   ?billing=changed  (no to: Stripe's plan chooser) the same, against the plan kept before the trip (`from`); with
//                     no plan known from before (from null, or none), it is never said to have changed.
//   ?billing=unchanged  Stripe's back link (a change let go, or one that did not go through): asked once, quietly;
//                     nothing changed → "No change made. You're still on <plan>."
//   The change kept is the account's (uid): resumed only in that account's namespace, dropped in any other, and gone
//   with the account on a sign-out, a deletion or "Remove this device's data" (src/auth/namespace.js
//   removeAccountTabKeys). from: null when not known (back on a page not signed in, with no trip kept here): taken
//   after sign-in from the account's own plan kept on this phone (resumeChange's before), when it has one.
//
//   confirmChange(app, { kind, to }, { before, waits?, sleep?, session?, now?, ui? }) → 'confirmed' | 'payment_issue'
//     | 'scheduled' | 'timeout' | 'unchanged' | 'repeat' | 'signed-out' | 'stopped' | null (another kind)
//     | 'other-account' (the trip was another account's)
//   resumeChange(app, { quiet?, before? }) → as above, or null (nothing kept here, it ran out, it is done, or another
//     account's)
//   verdict(plan, rec) → 'confirmed' | 'payment_issue' | 'scheduled' | 'waiting'   (plan: { tier, period, status,
//     scheduled } as the server said)
//   rememberChange(rec) / pendingChange() / forgetChange(): the kept change, { to, at, from, state, uid?, result? }
//   departChange({ uid, from, to }) / takeTrip(): the trip to Stripe's page, { uid, from, to, at }
//   ensurePlanCss() → resolves once src/ui/plan-welcome.css is in (the note, the payment sheet and the welcome)
import { h, openSheet } from './ui.js';
import { PLANS } from './entitlements.js';

/** A change's target as the server writes it into the way back (?billing=changed&to=ultra.monthly): plan, then period. */
export const PLAN_TO = /^(paid|ultra)\.(monthly|yearly)$/;
export const CHANGE_KEY = 'hm2:planChange';
/** How long a change on its way is kept in this tab (a reload mid-confirmation, a check when the app is back): 15 minutes. */
export const CHANGE_MS = 15 * 60000;
/** The trip to Stripe's page for a change: who is making it, and from what plan (this tab only, for TRIP_MS). */
export const TRIP_KEY = 'hm2:planTrip';
/** How long a trip to Stripe's page is remembered (the person can take a while there): 2 hours. */
export const TRIP_MS = 2 * 3600000;
/** An account id as the namespace keeps it (src/auth/namespace.js: Supabase's uuid, lower case). */
const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
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

/** "hushmallow Flow (monthly)": a plan's whole name, its period when known. */
export function planLabel(tier, period = null) {
  const name = PLANS[tier]?.name;
  if (!name) return null;
  return period === 'monthly' || period === 'yearly' ? `${name} (${period})` : name;
}
const dayOf = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** What the way back says. Calm, never a success before Stripe's word; the plan names in full. */
export const CHANGE_LINES = Object.freeze({
  confirming: 'Confirming your new plan with Stripe…',
  /** not confirmed in time: what the app shows, never a claim about what Stripe is doing (the change may be set for later) */
  timeout: (plan) => (plan ? `Your plan here still shows ${plan}. If Stripe confirms a change, it will update here.` : 'No change shows here yet. If Stripe confirms one, it will update here.'),
  /** Stripe has the change set for later (plan: { tier, period, scheduled: { at, tier, period } } as the server said) */
  scheduled: (plan) => {
    const c = plan?.scheduled;
    const now = planLabel(plan?.tier, plan?.period) || 'your plan';
    const to = c?.tier ? planLabel(c.tier, c.period) : null;
    const when = Number.isFinite(c?.at) ? ` on ${dayOf(c.at)}` : ' for the end of this billing period';
    return to ? `Your plan changes to ${to}${when}. Until then, you’re on ${now}.` : `Your plan change is set${when.replace(' on ', ' for ')}. Until then, you’re on ${now}.`;
  },
  paymentTitle: 'Your payment needs a look',
  /** the plan as it still is (the change waits on the payment) */
  paymentIssue: (plan) => `Your payment didn’t go through, so you’re still on ${plan}. Update your card in Settings → Manage subscription.`,
  /** the new plan is on the subscription, its payment not through */
  paymentIssueNew: 'Your payment didn’t go through, so your new plan isn’t confirmed yet. Update your card in Settings → Manage subscription.',
  unchanged: (plan) => (plan ? `No change made. You’re still on ${plan}.` : 'No change made.'),
  signIn: 'Sign in to see your plan.',
  manageFailed: 'That didn’t open just now. Try again in a moment.',
});
const NOTE_MS = { timeout: 8000, unchanged: 4200, scheduled: 9000 };

function safeSession() { try { return globalThis.sessionStorage || null; } catch { return null; } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** { tier, period, status } of the web plan kept on this phone now (the server's last answer). */
export function planOf(ent) {
  const p = ent?.webPlan?.() || null;
  return { tier: ent?.tier?.() ?? 'none', period: p?.period ?? null, status: p?.status ?? null };
}
/** planOf, and the change Stripe has set for later ({ at, tier, period } | null), for the verdict. */
const answerOf = (ent) => ({ ...planOf(ent), scheduled: ent?.webPlan?.()?.scheduled ?? null });
const cleanFrom = (f) => ({
  tier: TIERS.includes(f?.tier) ? f.tier : 'none',
  period: PERIODS.includes(f?.period) ? f.period : null,
  status: typeof f?.status === 'string' && /^[a-z_]{1,24}$/.test(f.status) ? f.status : null,
});
/** The plan before the trip, or null when it is not known (never read as "none"). */
const fromOrNull = (f) => (f && typeof f === 'object' ? cleanFrom(f) : null);
/** A plan known from before that a change can be judged against: one actually held (the chooser is offered only then). */
const heldFrom = (f) => (f && TIERS.includes(f.tier) && f.tier !== 'none' ? cleanFrom(f) : null);
const uidOr = (u) => (typeof u === 'string' && UID.test(u) ? u : null);
/** The account this page runs as (entitlements.js account()), or null. */
const accountOf = (ent) => { try { return uidOr(ent?.account?.()); } catch { return null; } };

/** Keep a change on its way (this tab only): { to, at, from: { tier, period, status } | null, state, uid?, result? }. */
export function rememberChange(rec, { session = safeSession() } = {}) {
  if (!rec || !(rec.to === null || PLAN_TO.test(rec.to)) || !Number.isFinite(rec.at) || !STATES.includes(rec.state)) return;
  const uid = uidOr(rec.uid);
  const v = { to: rec.to, at: rec.at, from: fromOrNull(rec.from), state: rec.state, ...(uid ? { uid } : {}), ...(rec.result ? { result: { tier: rec.result.tier, period: rec.result.period ?? null } } : {}) };
  try { session?.setItem(CHANGE_KEY, JSON.stringify(v)); } catch { /* not kept: a reload asks nothing more */ }
}
/** The change kept here in the last CHANGE_MS, or null (an old or odd one is forgotten). */
export function pendingChange({ session = safeSession(), now = Date.now() } = {}) {
  let raw = null, v = null;
  try { raw = session?.getItem(CHANGE_KEY) ?? null; v = JSON.parse(raw || 'null'); } catch { v = null; }
  const ok = !!v && typeof v === 'object' && (v.to === null || (typeof v.to === 'string' && PLAN_TO.test(v.to)))
    && Number.isFinite(v.at) && now >= v.at && now - v.at < CHANGE_MS && STATES.includes(v.state)
    && (v.from === null || (!!v.from && typeof v.from === 'object')) && (v.uid === undefined || !!uidOr(v.uid));
  if (raw != null && !ok) forgetChange({ session });
  return ok ? { to: v.to, at: v.at, from: fromOrNull(v.from), state: v.state, ...(v.uid ? { uid: v.uid } : {}), ...(v.result ? { result: { tier: v.result.tier, period: v.result.period ?? null } } : {}) } : null;
}
export function forgetChange({ session = safeSession() } = {}) {
  try { session?.removeItem(CHANGE_KEY); } catch { /* it lapses by its time */ }
}

/**
 * Leaving for Stripe's page to change the plan (billing.js, just before the page leaves): a change kept from before is
 * its way back no longer, and this trip is kept with the account making it (uid, entitlements.js account()) and its
 * plan now (from), for the way back.
 */
export function departChange({ uid = null, from = null, to = null } = {}, { session = safeSession(), now = Date.now() } = {}) {
  forgetChange({ session });
  const v = { uid: uidOr(uid), from: fromOrNull(from), to: typeof to === 'string' && PLAN_TO.test(to) ? to : null, at: now };
  try { session?.setItem(TRIP_KEY, JSON.stringify(v)); } catch { /* not kept: the way back judges by the plan kept here */ }
}
/** The trip kept here in the last TRIP_MS ({ uid, from, to, at }), taken (it is forgotten now), or null. */
export function takeTrip({ session = safeSession(), now = Date.now() } = {}) {
  let v = null;
  try { v = JSON.parse(session?.getItem(TRIP_KEY) || 'null'); session?.removeItem(TRIP_KEY); } catch { v = null; }
  const ok = !!v && typeof v === 'object' && Number.isFinite(v.at) && now >= v.at && now - v.at < TRIP_MS
    && (v.uid === null || !!uidOr(v.uid)) && (v.from === null || typeof v.from === 'object');
  return ok ? { uid: v.uid, from: fromOrNull(v.from), to: typeof v.to === 'string' && PLAN_TO.test(v.to) ? v.to : null, at: v.at } : null;
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
    // against no plan known from before (not known on this page, or none: the plan kept here counted for nobody), any
    // plan would read as a change: nothing can be told, so it is never confirmed
    const f = heldFrom(rec?.from);
    landed = !!f && tier !== 'none' && (tier !== f.tier || (!!f.period && !!period && period !== f.period));
  }
  if (landed && OK_STATUSES.includes(status)) return 'confirmed';
  if (PAYMENT_STATUSES.includes(status)) return 'payment_issue';
  // not on the plan yet because Stripe has the change set for later (the portal's downgrade or shorter period at the
  // period end, D8): nothing to wait for now
  if (!landed && OK_STATUSES.includes(status) && Number.isFinite(plan?.scheduled?.at)) return 'scheduled';
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
  const f = heldFrom(rec.from);
  const moved = target ? plan.tier === target && plan.tier !== f?.tier : !!f && plan.tier !== f.tier;
  if (moved && plan.tier !== 'none') return CHANGE_LINES.paymentIssueNew;
  return CHANGE_LINES.paymentIssue(nameOf(f ? f.tier : plan.tier) || 'your plan');
}
/** What the welcome is told of the plan before: the plan, or (not known) that it is not known, so it never says more. */
const welcomeFrom = (rec) => (heldFrom(rec.from) ? { from: rec.from } : { from: null, fromUnknown: true });

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
      // forgotten meanwhile (a new trip to Stripe, or it ran out), or already confirmed and said by another run of the
      // same change (a resumed one): no more asks, nothing said, so the welcome is never said twice
      const still = pendingChange({ session, now: now() });
      if (!still || still.at !== rec.at || still.state === 'done') { note?.close(); return 'stopped'; }
      if (!(await ask(ent))) continue;
      const plan = answerOf(ent);
      const v = verdict(plan, rec);
      if (v === 'confirmed') {
        rememberChange({ ...rec, state: 'done', result: { tier: plan.tier, period: plan.period } }, { session });
        note?.close();
        try { await view.welcome({ tier: plan.tier, period: plan.period, ...welcomeFrom(rec), to: rec.to }); } catch { /* the plan is here all the same */ }
        return 'confirmed';
      }
      if (v === 'payment_issue') {
        forgetChange({ session });
        note?.close();
        view.paymentIssue(paymentLine(plan, rec));
        return 'payment_issue';
      }
      // Stripe accepted it for later: said as it is, once (asked no more; the plan updates here on the day, as any)
      if (v === 'scheduled') {
        forgetChange({ session });
        const line = CHANGE_LINES.scheduled(plan);
        if (note) note.say(line, NOTE_MS.scheduled, 'scheduled'); else view.say(line, NOTE_MS.scheduled, 'scheduled');
        return 'scheduled';
      }
    }
    // not confirmed in time: said once, neutrally; asked again quietly at the next start or when the app is back on screen
    rememberChange({ ...rec, state: 'quiet' }, { session });
    if (note) { const p = planOf(ent); note.say(CHANGE_LINES.timeout(p.tier !== 'none' ? planLabel(p.tier, p.period) : null), NOTE_MS.timeout, 'timeout'); }
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
  if (kind !== 'changed' && kind !== 'unchanged') return null;
  const signedIn = !!ent.webSignedIn?.();
  const acct = accountOf(ent);
  // the trip that led here (departChange): another account's (this tab signed in as someone else since it left) is not
  // this one's to confirm or welcome, and nothing is said
  const trip = takeTrip({ session, now: now() });
  if (trip?.uid && acct && trip.uid !== acct) { forgetChange({ session }); return 'other-account'; }
  const uid = trip?.uid || acct || null;
  // the plan before: the trip's (the account's own, as it left), else the plan kept here (signed in: this account's);
  // on a page not signed in, not known (null), never the guest's "none"
  const from = trip?.from || (signedIn ? cleanFrom(before || planOf(ent)) : null);
  if (kind === 'changed') {
    const to = typeof back.to === 'string' && PLAN_TO.test(back.to) ? back.to : null;
    // Back (or a reload) onto Stripe's way back again after this change was confirmed and said: not said twice
    const prev = pendingChange({ session, now: now() });
    if (prev?.state === 'done' && prev.result && from && prev.result.tier === from.tier && (prev.result.period ?? null) === from.period
      && (!prev.uid || prev.uid === uid) && (!to || to === `${prev.result.tier}.${prev.result.period}`)) return 'repeat';
    const rec = { to, at: now(), from, state: 'confirming', uid };
    rememberChange(rec, { session });
    // not signed in on this page: nothing can be asked; the key waits for the sign-in (the page reloads into the account)
    if (!signedIn) {
      if (typeof app.go === 'function') app.go('account', { view: 'signin', notice: CHANGE_LINES.signIn });
      else app.toast?.(CHANGE_LINES.signIn, 3600);
      return 'signed-out';
    }
    return run(app, rec, { waits, sleep, session, now, view, quiet: false });
  }
  // 'unchanged'
  if (!signedIn) return 'signed-out';
  const answered = await ask(ent);
  const plan = planOf(ent);
  if (answered) {
    // (it did change after all, confirmed by Stripe: another tab, or a change completed before the back link; only
    // against a plan known from before, never against one kept here that counts for nobody)
    const v = verdict(plan, { to: null, from });
    if (v === 'confirmed') {
      rememberChange({ to: null, at: now(), from, state: 'done', uid, result: { tier: plan.tier, period: plan.period } }, { session });
      try { await view.welcome({ tier: plan.tier, period: plan.period, from, to: null }); } catch { /* here all the same */ }
      return 'confirmed';
    }
    if (v === 'payment_issue' && !PAYMENT_STATUSES.includes(from?.status)) { view.paymentIssue(paymentLine(plan, { to: null, from })); return 'payment_issue'; }
  }
  view.say(CHANGE_LINES.unchanged(nameOf(answered ? plan.tier : from?.tier) || nameOf(from?.tier)), NOTE_MS.unchanged, 'unchanged');
  return 'unchanged';
}

/**
 * A change kept here and not confirmed yet: asked for again. At start (a reload mid-confirmation: the calm note again,
 * unless it had already run out of time) or quietly when the app comes back on screen (one ask, at most every
 * QUIET_RECHECK_MS). Confirmed: its welcome, as on the way back.
 */
export async function resumeChange(app, { quiet = null, before = null, waits = CONFIRM_WAITS, sleep = wait, session = safeSession(), now = () => Date.now(), ui = null } = {}) {
  let rec = pendingChange({ session, now: now() });
  if (!rec || rec.state === 'done' || !app?.ent?.webSignedIn?.()) return null;
  const acct = accountOf(app.ent);
  // another account's change (it signed out, and someone else is signed in on this tab now): never theirs to hear
  if (rec.uid && acct && rec.uid !== acct) { forgetChange({ session }); return null; }
  // kept on a page not signed in: it is this account's now, and the plan before, if it was not known, is the plan this
  // account kept on this phone (main.js takes it at start, before the first check), when it holds one
  if ((!rec.uid && acct) || !rec.from) {
    rec = { ...rec, uid: rec.uid || acct, from: rec.from || heldFrom(before) };
    rememberChange(rec, { session });
  }
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
