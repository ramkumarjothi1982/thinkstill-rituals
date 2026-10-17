// Web subscriptions: the client for our own server's billing routes
// (server/another-angle /v1/billing/*), which talk to Stripe. Off unless
// src/app/config.js switches them on (BILLING_PROVIDER 'stripe',
// BILLING_ENDPOINT our Worker; on a branch preview of the Pages project its
// staging settings do: deploySettings) AND this build has sign-in: a web plan belongs
// to an account, so it follows the person to any device they sign in on.
// With it off, createBilling() is null and nothing here ever runs. It is null
// in the App Store app's shell too (inNativeShell: the StoreKit bridge is
// there), so that app never shows, says or sends anything of web billing, and
// on a development host unless ?billingDev asks for it (test purchases stay).
//
// This file holds hushmallow's ONE billing network call (tests/core.test.mjs
// allows exactly the `netFetch` line below, only to the configured endpoint
// and only these four paths). What is sent: the signed-in account's access
// token (Authorization: Bearer) and, for a checkout or an upgrade, { plan, period }
// (an upgrade with intent 'upgrade'); back from Checkout, the session's id Stripe
// put in the address. Never words, feelings or photos, and nothing at all for a guest.
//
//   createBilling({ auth, signIn, config?, shell?, prices?, fetchImpl?, nav?, timeoutMs? }) → billing | null (off)
//     signedIn()             the account is signed in on this device
//     accountToken()         → its current access token, or null (Another Angle's session sends it too, src/beyond/angle-client.js)
//     status()               → { ok: true, tier, period, status, periodEnd, endsAt, cancelAtPeriodEnd, manageable, scheduled } | { ok: false, reason, off? }
//                              (scheduled: { at, tier, period } of a change Stripe has set for later, or null: scheduledOf)
//                              (period: 'monthly' | 'yearly' from the plan's recorded price, null from a server without it;
//                              periodEnd, endsAt: ms or null; the server sends ISO or ms, both are read; off: the
//                              server's 503 saying it has no web billing at all, one of BILLING_OFF_CODES)
//     checkout(plan, period) → { redirecting } (on to Stripe Checkout) | { framed } (inFrame: nothing made, outsideNote
//                              offers the whole window) | { needsAccount } | { manage } (has a plan)
//                              | { pending } (a payment still going through) | { failed, reason, support? }
//                              (support: the account's billing needs a person, 409 customer_conflict: BILLING_SUPPORT)
//     portal(intent?, trip?) → { redirecting } (Stripe's customer portal) | { framed } | { needsAccount } | { none } | { failed, reason };
//                              intent 'switch' (the plans page, for a plan already held) opens Stripe's own plan chooser,
//                              which comes back with ?billing=changed (or ?billing=unchanged by its back link), never the
//                              portal's front page; Settings' Manage subscription (no intent) is the front page
//                              trip: { uid, from } of the account changing its plan (ent.manage), kept for the way back
//                              (plan-change.js departChange)
//     upgrade(plan, period, trip?) → { redirecting, to } (Stripe's page confirming exactly that change, back with
//                              ?billing=changed&to=<plan>.<period>) | { framed } | { needsAccount } | { none } | { failed, reason }
//                              (reason: one of CHANGE_CODES as the server says it, or invalid, network, http_…, not_stripe)
//     sync(sessionId)        → as status(): back from Checkout, the server reads that session from Stripe and records the
//                              plan at once (the webhook may be a moment behind); a malformed id is never sent
//     refresh()              → as status(): the server reads the account's own subscription from Stripe now and records it
//                              (POST sync {}), so a change made on Stripe's page shows without waiting for the webhook
//     prices()               → { productId: 'US$…' }, from BILLING_PRICES (only those set)
//   resolveBilling({ provider, endpoint, allowedHosts, loc, session }) → { provider, endpoint } | null
//   inNativeShell(win?)     the App Store app's shell (window.HushNative or the hushStore message handler)
//   takeReturn({ loc, hist }) → { kind: 'success' | 'cancel' | 'portal' | 'changed' | 'unchanged', sessionId, to? } | null:
//     the ?billing= Stripe sent the person back with (and Checkout's session_id, a change's ?to=), taken out of the
//     address at once (Back never brings it again); to: only on 'changed', only <plan>.<period> (PLAN_TO), else null
//   welcomeBack(app, back, { before }?)  after Stripe: the session is synced, then the plan is asked for again (a few
//     times: the webhook can take a moment) and said once (hushmallow Beyond: its welcome, app.welcomePlan); after the
//     portal, asked for quietly until it differs from `before` (planNow(ent) as kept before the trip, taken at start);
//     after a change of plan ('changed' / 'unchanged'): src/app/plan-change.js confirmChange, which says it only once
//     Stripe has confirmed it
//   planNow(ent)            → { tier, period, status, cancelAtPeriodEnd, endsAt }: what a trip to the portal can change
//   rememberPlan(plan, period) / plannedPlan({ take? }) → { plan, period } | null: the plan a guest chose on the plans
//     page before signing in (this tab only, for PLAN_INTENT_MS), offered on the account card after sign-in
//
// Only Stripe's own pages are ever opened (STRIPE_PAGES: checkout.stripe.com,
// billing.stripe.com, and our custom domain checkout.hushmallow.com, which Stripe
// serves both from once it is activated), whatever an answer says.

import { BILLING_PRICES, deploySettings } from './config.js';
import { PLANS } from './entitlements.js';
import { confirmChange, departChange, PLAN_TO } from './plan-change.js';

export { PLAN_TO };

export const PATHS = Object.freeze({ checkout: '/v1/billing/checkout', status: '/v1/billing/status', portal: '/v1/billing/portal', sync: '/v1/billing/sync' });
/** A Checkout Session id as Stripe makes them (the server checks the same shape, and that its mode is the key's). */
export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/;
/**
 * Why the server would not open a change of plan (POST /v1/billing/portal, intent 'upgrade' or 'switch': 409, or 503
 * plan_change_unavailable): already that plan; a payment to sort out first (past due, unpaid, incomplete); not an
 * upgrade by its rule; a change already waiting on the subscription; a subscription it cannot change here; a plan set
 * to end (cancelled in Manage subscription: renewed there first, plan_ending); or Stripe refusing the flow (never the
 * portal's front page instead). Only these, as { error: { code } }: anything else is a failure.
 */
export const CHANGE_CODES = Object.freeze(['already_on_plan', 'payment_issue', 'not_an_upgrade', 'plan_change_unavailable', 'change_pending', 'not_updatable', 'plan_ending']);
/**
 * Our custom domain for Checkout and the customer portal (decision D12). Stripe moves both pages there the moment the
 * owner activates it, so this list must be live in production and staging before that, or every checkout and
 * Manage subscription fails after the server has made the session.
 */
export const CHECKOUT_DOMAIN = 'checkout.hushmallow.com';
/** Exact host names only: a subdomain, a lookalike, another port or credentials never pass (stripePage). */
export const STRIPE_PAGES = Object.freeze(['checkout.stripe.com', 'billing.stripe.com', CHECKOUT_DOMAIN]);
export const TIMEOUT_MS = 10000;
/**
 * Said after Stripe: a checkout let go, a plan still on its way (the webhook can take a moment), or back on a
 * page where the account is not signed in (another browser, or signed out since): the plan is the account's.
 */
export const RETURN_LINES = Object.freeze({
  cancel: 'No problem. Nothing was charged.',
  pending: 'Thank you. Your plan is on its way: it can take a minute to arrive.',
  signIn: 'Sign in to see your plan.',
});
/** Checkout's 409 as the plans page and the account card's "Continue to …" say it: a plan already (the change of
 *  plan happens on the subscription page that opens next), or a payment still going through (nothing new started). */
export const CHANGE_PLAN = 'You already have a plan. You can change it on the next page.';
export const PAYMENT_PENDING = 'Your payment is still going through. Nothing more was charged.';
/** Where billing questions go: the contact address the Terms and the Privacy Policy give (legal/terms.html, Contact). */
export const SUPPORT_EMAIL = 'support@hushmallow.com';
/** Checkout's 409 customer_conflict, on the plans page and the account card: nothing was made, and the account's
 *  billing needs a person to look at it (its Stripe customer is linked elsewhere), so where to write is said. */
export const BILLING_SUPPORT = `That didn’t go through, and nothing was charged. Your account’s billing needs a look from us: please email ${SUPPORT_EMAIL}.`;
/**
 * The codes our server's billing routes answer 503 with while it has no web billing at all (server/another-angle
 * src/billing/routes.js offCode: not configured, a key refused, or its sign-in project still a placeholder, as on a
 * branch preview's staging Worker before its keys). Only these, only on a 503, only as { error: { code } }: anything
 * else is no answer (the delete screen's check fails closed on it).
 */
export const BILLING_OFF_CODES = Object.freeze(['billing_not_configured', 'accounts_not_configured']);
const DEV_HOSTS = ['localhost', '127.0.0.1'];
const DEV_KEY = 'hm2:billingDev';
const PRODUCT = /^hushmallow\.(paid|ultra)\.(monthly|yearly)$/;

// THE billing network call (see the header): one place, one shape.
const netFetch = (url, init) => globalThis.fetch(url, init);

function safeSession() { try { return globalThis.sessionStorage || null; } catch { return null; } }

/**
 * How long a plan chosen by a guest is kept for after sign-in: enough to create an account and confirm the email on
 * this phone, short enough that it never comes back as a surprise later. Only { plan, period, at }, in this tab.
 */
export const PLAN_INTENT_MS = 30 * 60000;
const INTENT_KEY = 'hm2:planIntent';
const isPlan = (plan, period) => ['paid', 'ultra'].includes(plan) && ['monthly', 'yearly'].includes(period);
/** 'monthly' | 'yearly' as the server says it, or null. */
const periodOf = (v) => (v === 'monthly' || v === 'yearly' ? v : null);
/** The plans page, a guest's "Step into…": kept for after sign-in. */
export function rememberPlan(plan, period, { session = safeSession(), now = Date.now() } = {}) {
  if (!isPlan(plan, period)) return;
  try { session?.setItem(INTENT_KEY, JSON.stringify({ plan, period, at: now })); } catch { /* not kept: the plans page again */ }
}
/** That plan, chosen here in the last PLAN_INTENT_MS: { plan, period } | null (an old or odd one is forgotten). take: forget it now. */
export function plannedPlan({ take = false, session = safeSession(), now = Date.now() } = {}) {
  let v = null;
  try { v = JSON.parse(session?.getItem(INTENT_KEY) || 'null'); } catch { v = null; }
  const ok = !!v && isPlan(v.plan, v.period) && Number.isFinite(v.at) && now >= v.at && now - v.at < PLAN_INTENT_MS;
  if (take || (v && !ok)) { try { session?.removeItem(INTENT_KEY); } catch { /* it lapses by its time */ } }
  return ok ? { plan: v.plan, period: v.period } : null;
}
// no subscription date is earlier: a seconds value sent by mistake reads as no date, never as January 1970
const EARLIEST = Date.UTC(2020, 0, 1);
/** A date from the server, ISO or ms → ms, or null. */
function dateMs(v) {
  const t = typeof v === 'number' ? v : typeof v === 'string' && v ? Date.parse(v) : NaN;
  return Number.isFinite(t) && t >= EARLIEST ? t : null;
}

/** A change of plan set for later, as the server says it (status scheduled_change): { at (ms), tier, period } | null. */
export function scheduledOf(v) {
  if (!v || typeof v !== 'object') return null;
  const at = dateMs(v.at);
  if (at == null) return null;
  return { at, tier: v.tier === 'paid' || v.tier === 'ultra' ? v.tier : null, period: periodOf(v.period) };
}

/**
 * Where billing goes, or null (off). Production: BILLING_PROVIDER 'stripe' and BILLING_ENDPOINT,
 * https, on a host listed in ANGLE_ALLOWED_HOSTS, an origin and a path only. A branch preview of the
 * Pages project (src/app/config.js isPreviewHost): on, to STAGING_ANGLE_ENDPOINT on STAGING_ALLOWED_HOSTS,
 * by the same rules (deploySettings). Development only:
 * on localhost, `?billingDev=<port>` points at a local server on this machine for the rest of the tab
 * (kept in sessionStorage, so the way back from Stripe still has it; `?billingDev=off` clears it).
 * Without it a development host has no billing at all, whatever the config says: the production
 * Worker never accepts its origin, and its free test purchases stay as they were.
 */
export function resolveBilling({ provider, endpoint, allowedHosts, loc = globalThis.location, session = safeSession() } = {}) {
  // a development host: billing only with ?billingDev=<port> (a local server); otherwise off, so its test purchases stay
  if (loc && DEV_HOSTS.includes(loc.hostname)) {
    let port = null;
    try {
      const q = new URLSearchParams(loc.search || '').get('billingDev');
      if (q === 'off' || q === '0') session?.removeItem(DEV_KEY);
      else if (q && /^\d{2,5}$/.test(q)) session?.setItem(DEV_KEY, q);
      port = q && /^\d{2,5}$/.test(q) ? q : q === 'off' || q === '0' ? null : session?.getItem(DEV_KEY);
    } catch { port = null; }
    return port && /^\d{2,5}$/.test(port) ? { provider: 'stripe', endpoint: `${loc.protocol === 'https:' ? 'https:' : 'http:'}//${loc.hostname}:${port}` } : null;
  }
  // this page's own switch, Worker and allow-list, unless a caller names them
  const here = deploySettings(loc);
  if (provider === undefined) provider = here.billingProvider;
  if (endpoint === undefined) endpoint = here.billingEndpoint;
  if (allowedHosts === undefined) allowedHosts = here.angleAllowedHosts;
  if (provider !== 'stripe' || !endpoint || typeof endpoint !== 'string') return null;
  let u;
  try { u = new URL(endpoint); } catch { return null; }
  if (u.protocol !== 'https:' || !Array.isArray(allowedHosts) || !allowedHosts.includes(u.hostname)) return null;
  if (u.username || u.password || u.search || u.hash) return null;
  return { provider: 'stripe', endpoint: `${u.origin}${u.pathname.replace(/\/+$/, '')}` };
}

/** A Stripe page this app may open, or null. */
export function stripePage(url) {
  let u;
  try { u = new URL(String(url)); } catch { return null; }
  if (u.protocol !== 'https:' || !STRIPE_PAGES.includes(u.hostname) || u.username || u.password || u.port) return null;
  return u.href;
}

/**
 * The App Store app's shell: the StoreKit bridge entitlements.js uses (window.HushNative.store or the hushStore
 * message handler), or any window.HushNative. Web subscriptions never run there: Apple's purchase is the only one.
 */
export function inNativeShell(win = globalThis.window) {
  try { return !!win && !!(win.HushNative || win.webkit?.messageHandlers?.hushStore); } catch { return false; }
}

/**
 * This page runs inside a frame (the owner's Framer site embeds the app: FRAME_ANCESTORS). Stripe's Checkout and
 * customer portal refuse to load in a frame, so a framed page never starts either (checkout() and portal() answer
 * { framed }, nothing sent): the person is offered a real link to this same app in the whole window (outsideNote).
 * A frame whose parent cannot be read counts as framed.
 */
export function inFrame(win = globalThis.window) {
  try { return !!win && win.top !== win.self; } catch { return true; }
}
/** Said, framed, where a checkout or the portal would have opened. */
export const FRAMED_LINE = 'Plans and your subscription open in a full window, not inside this page.';
/** This same app in the whole window, on the account card (#account is the deep link the app honours). */
export function outsideHref(loc = globalThis.location) {
  try { return `${loc.origin}${loc.pathname}#account`; } catch { return null; }
}
/**
 * Framed: FRAMED_LINE and a real link out (target _top: the person's own tap takes the whole window there, which a
 * frame may do; opening it from code after an answer arrives is refused by some browsers). h: src/app/ui.js's.
 */
export function outsideNote(h, { loc = globalThis.location } = {}) {
  const href = outsideHref(loc);
  return h('span', { 'data-framed': '' }, FRAMED_LINE, href ? ' ' : null,
    href ? h('a', { href, target: '_top', rel: 'noopener' }, `Continue on ${loc.host}`) : null);
}

export function createBilling({
  auth, signIn = false, config = resolveBilling(), shell = inNativeShell(), prices = BILLING_PRICES, fetchImpl = netFetch,
  nav = (url) => globalThis.location.assign(url), timeoutMs = TIMEOUT_MS, framed = inFrame(),
} = {}) {
  if (!config || !signIn || shell) return null;
  const { endpoint } = config;
  const handle = () => (typeof auth === 'function' ? auth() : auth);

  const signedIn = () => { const a = handle(); return !!a?.enabled && a.status?.() === 'signed-in'; };
  async function accountToken() {
    if (!signedIn()) return null;
    try { const a = await handle().load(); return (await a.accessToken?.()) || null; } catch { return null; }
  }

  /** One request to our server. Never throws: { http, data } (http 0 = no answer; signedOut = no token to send). */
  async function call(path, { method = 'POST', body = null } = {}) {
    if (!endpoint || !Object.values(PATHS).includes(path)) return { http: 0, data: null };
    const token = await accountToken();
    if (!token) return { http: 0, data: null, signedOut: true };
    const url = `${endpoint}${path}`;
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { try { ctrl?.abort(); } catch { /* ignore */ } }, timeoutMs);
    const init = {
      method, mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error', signal: ctrl?.signal,
      headers: { authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
      ...(method === 'POST' ? { body: JSON.stringify(body || {}) } : {}),
    };
    try {
      const res = await fetchImpl(url, init);
      let data = null;
      try { data = await res.json(); } catch { data = null; }
      return { http: res.status, data };
    } catch { return { http: 0, data: null }; } finally { clearTimeout(timer); }
  }
  const reasonOf = (r) => (r.http === 0 ? 'network' : `http_${r.http}`);
  /** The plan as the server says it (GET status, or a sync: the same answer), read strictly. */
  function readStatus(r) {
    if (r.signedOut || r.http === 401) return { ok: false, reason: 'signed-out' };
    if (r.http !== 200 || !r.data || typeof r.data !== 'object') {
      // no plan answered; a 503 with one of BILLING_OFF_CODES says this server has no web billing to ask (off)
      const code = r.http === 503 ? r.data?.error?.code : null;
      return { ok: false, reason: reasonOf(r), ...(BILLING_OFF_CODES.includes(code) ? { off: code } : {}) };
    }
    const d = r.data;
    return {
      ok: true, tier: ['none', 'paid', 'ultra'].includes(d.tier) ? d.tier : 'none',
      // the plan's period, from the price Stripe has on the subscription (a monthly → yearly move shows here)
      period: periodOf(d.period),
      status: typeof d.status === 'string' && /^[a-z_]{1,24}$/.test(d.status) ? d.status : 'none',
      // endsAt: the day the subscription ends (cancelled at the period end, or a date set for it); null while it renews
      periodEnd: dateMs(d.current_period_end), endsAt: dateMs(d.ends_at),
      cancelAtPeriodEnd: d.cancel_at_period_end === true, manageable: d.manageable === true,
      // a change of plan Stripe has set for later (the portal's downgrade or shorter period at the period end), or null
      scheduled: scheduledOf(d.scheduled_change),
    };
  }
  /** Onwards to a Stripe page (the page leaves). false when the answer is not one. */
  function open(url) {
    const href = stripePage(url);
    if (!href) return false;
    nav(href);
    return true;
  }
  /** The server's reason for not opening a change of plan (CHANGE_CODES), or null. */
  const changeCode = (r) => {
    const code = r.http === 409 || r.http === 503 ? r.data?.error?.code : null;
    return CHANGE_CODES.includes(code) ? code : null;
  };

  return {
    get endpoint() { return endpoint; },
    /** Framed (inFrame): no checkout or portal starts here; the plan is still asked for and shown. */
    get framed() { return !!framed; },
    signedIn,
    accountToken,
    async status() {
      if (!signedIn()) return { ok: false, reason: 'signed-out' };
      return readStatus(await call(PATHS.status, { method: 'GET' }));
    },
    async sync(sessionId) {
      if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) return { ok: false, reason: 'invalid' };
      if (!signedIn()) return { ok: false, reason: 'signed-out' };
      return readStatus(await call(PATHS.sync, { body: { session_id: sessionId } }));
    },
    async checkout(plan, period) {
      if (!['paid', 'ultra'].includes(plan) || !['monthly', 'yearly'].includes(period)) return { failed: true, reason: 'invalid' };
      // in a frame Stripe's page would never load (it refuses framing): nothing is made, the page offers the way out
      if (framed) return { framed: true };
      if (!signedIn()) return { needsAccount: true };
      const r = await call(PATHS.checkout, { body: { plan, period } });
      if (r.signedOut || r.http === 401) return { needsAccount: true };
      // 409, nothing new made: a plan already (already_subscribed, or no code from an older server: changed in the
      // portal), or a payment still going through (payment_pending: a checkout just completed whose plan is not here
      // yet, or a first payment unfinished). Any other code is no plan to change, so never the portal; customer_conflict
      // (the account's Stripe customer is linked elsewhere) needs a person: { support } (BILLING_SUPPORT says where)
      if (r.http === 409) {
        const code = r.data?.error?.code;
        if (code === 'payment_pending') return { pending: true };
        if (code === 'already_subscribed' || !code) return { manage: true };
        return code === 'customer_conflict' ? { failed: true, reason: 'customer_conflict', support: true } : { failed: true, reason: 'http_409' };
      }
      if (r.http === 200 && open(r.data?.url)) return { redirecting: true };
      return { failed: true, reason: r.http === 200 ? 'not_stripe' : reasonOf(r) };
    },
    async portal(intent, trip = null) {
      if (framed) return { framed: true };
      if (!signedIn()) return { needsAccount: true };
      // { intent: 'switch' }: the server opens Stripe's change-plan page, never its front page (where that flow is off
      // in the portal's settings it answers 503 plan_change_unavailable); Settings: {}, the front page
      const switching = intent === 'switch';
      const r = await call(PATHS.portal, { body: switching ? { intent: 'switch' } : {} });
      if (r.signedOut || r.http === 401) return { needsAccount: true };
      if (r.http === 404) return { none: true };
      if (switching && changeCode(r)) return { failed: true, reason: changeCode(r) };
      // (an older server put the front page in its place and said so: not opened for a change of plan)
      if (switching && r.http === 200 && r.data?.flow === 'portal') return { failed: true, reason: 'plan_change_unavailable' };
      // a new trip to change the plan: a change kept from before (said, or still on its way) is its way back no longer,
      // and the trip is kept with the account making it and its plan now (trip: from ent.manage)
      if (switching && r.http === 200 && stripePage(r.data?.url)) departChange({ ...trip, to: null });
      if (r.http === 200 && open(r.data?.url)) return { redirecting: true };
      return { failed: true, reason: r.http === 200 ? 'not_stripe' : reasonOf(r) };
    },
    /**
     * An upgrade the plans page offers for the plan already held (Flow → Beyond, monthly → yearly): the server checks it
     * with Stripe and opens Stripe's page confirming exactly that change (subscription_update_confirm), which comes back
     * with ?billing=changed&to=<plan>.<period> once Stripe has made it (and ?billing=unchanged by its back link).
     */
    async upgrade(plan, period, trip = null) {
      if (!isPlan(plan, period)) return { failed: true, reason: 'invalid' };
      // in a frame Stripe's confirmation page would never load, as with checkout and the portal: nothing is asked for
      if (framed) return { framed: true };
      if (!signedIn()) return { needsAccount: true };
      const r = await call(PATHS.portal, { body: { intent: 'upgrade', plan, period } });
      if (r.signedOut || r.http === 401) return { needsAccount: true };
      if (r.http === 404) return { none: true };
      if (changeCode(r)) return { failed: true, reason: changeCode(r) };
      const to = `${plan}.${period}`;
      // only Stripe's confirmation of exactly this change is opened: never another flow or another plan in its place
      if (r.http === 200 && (r.data?.flow !== 'subscription_update_confirm' || (r.data?.to != null && r.data.to !== to))) return { failed: true, reason: 'plan_change_unavailable' };
      if (r.http === 200 && stripePage(r.data?.url)) departChange({ ...trip, to });
      if (r.http === 200 && open(r.data?.url)) return { redirecting: true, to };
      return { failed: true, reason: r.http === 200 ? 'not_stripe' : reasonOf(r) };
    },
    /** The account's subscription read from Stripe by the server now (POST sync {}); the answer is read as the status. */
    async refresh() {
      if (!signedIn()) return { ok: false, reason: 'signed-out' };
      return readStatus(await call(PATHS.sync, { body: {} }));
    },
    prices() {
      const out = {};
      for (const [k, v] of Object.entries(prices || {})) if (PRODUCT.test(k) && typeof v === 'string' && v.trim() && v.length <= 24) out[k] = v.trim();
      return out;
    },
  };
}

/** Back from the portal: the plan is asked for at these waits (ms) until it differs from the plan before the trip (the
 *  webhook for a change there can land after the first check), then no more. 14 s in all, quietly. */
export const PORTAL_WAITS = Object.freeze([0, 2000, 4000, 8000]);

/** What a trip to the portal can change (the tier, its period, Stripe's status, cancelling, the end date), as kept on this phone now. */
export function planNow(ent) {
  const p = ent?.webPlan?.() || null;
  return { tier: ent?.tier?.() ?? 'none', period: p?.period ?? null, status: p?.status ?? null, cancelAtPeriodEnd: !!p?.cancelAtPeriodEnd, endsAt: p?.endsAt ?? null };
}
const samePlan = (a, b) => a.tier === b.tier && (a.period ?? null) === (b.period ?? null) && a.status === b.status && a.cancelAtPeriodEnd === b.cancelAtPeriodEnd && a.endsAt === b.endsAt;

/** The ways back from Stripe: Checkout paid or let go, the portal's front page, a change of plan made or not made. */
export const RETURN_KINDS = Object.freeze(['success', 'cancel', 'portal', 'changed', 'unchanged']);
/**
 * The ?billing= Stripe sent the person back with ({ kind, sessionId }, and on 'changed' its `to`), taken out of the
 * address with Checkout's session_id and a change's ?to=; null when none. sessionId: only on success, and only a
 * well-formed one; to: only on 'changed', only <plan>.<period> (PLAN_TO), else null (Stripe's own plan chooser).
 */
export function takeReturn({ loc = globalThis.location, hist = globalThis.history } = {}) {
  let u;
  try { u = new URL(loc.href); } catch { return null; }
  if (!u.searchParams.has('billing')) return null;
  const v = u.searchParams.get('billing');
  const id = u.searchParams.get('session_id');
  const to = u.searchParams.get('to');
  u.searchParams.delete('billing');
  u.searchParams.delete('session_id');
  u.searchParams.delete('to');
  try { hist.replaceState(hist.state ?? null, '', u.href); } catch { /* the address keeps it; nothing else reads it */ }
  if (!RETURN_KINDS.includes(v)) return null;
  const back = { kind: v, sessionId: v === 'success' && typeof id === 'string' && SESSION_ID.test(id) ? id : null };
  if (v === 'changed') back.to = typeof to === 'string' && PLAN_TO.test(to) ? to : null;
  return back;
}

/**
 * Back from Stripe (takeReturn's answer, or just its kind). 'success': the Checkout Session is synced first (the plan
 * at once, before the webhook), then the plan is asked for again, a few times (the webhook can take a moment), and
 * said once it is here (hushmallow Beyond with its welcome, app.welcomePlan, where the app has it), else a calm "on
 * its way"; not signed in on this page, the sign-in screen says to sign in to see it; 'cancel': nothing was charged;
 * 'portal': the plan is asked for again quietly, at PORTAL_WAITS until it differs from `before` (it may have been
 * cancelled or changed there; main.js takes it at start, before any check); 'changed' / 'unchanged' (a change of plan
 * on Stripe's page, made or not): plan-change.js confirmChange (`change`: its options, for tests).
 */
export async function welcomeBack(app, back, {
  before = null, waits = [0, 2000, 4000, 8000, 15000], portalWaits = PORTAL_WAITS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), change = {},
} = {}) {
  const { kind, sessionId = null, to = null } = typeof back === 'string' ? { kind: back } : back || {};
  const { ent } = app;
  if (kind === 'cancel') { app.toast(RETURN_LINES.cancel); return 'cancel'; }
  if (kind === 'changed' || kind === 'unchanged') return confirmChange(app, { kind, to }, { before, sleep, ...change });
  if (kind === 'portal') {
    if (!ent.webSignedIn?.()) return 'portal';   // signed out here: nothing to ask
    const was = before || planNow(ent);
    for (const ms of portalWaits) {
      if (ms) await sleep(ms);
      try { await ent.refresh({ force: true }); } catch { /* the next try */ }
      if (!samePlan(planNow(ent), was)) break;
    }
    return 'portal';
  }
  if (kind !== 'success') return null;
  // not signed in here: nothing can be asked, and "on its way" would never come true on this page
  if (!ent.webSignedIn?.()) {
    if (typeof app.go === 'function') app.go('account', { view: 'signin', notice: RETURN_LINES.signIn });
    else app.toast(RETURN_LINES.signIn, 3600);
    return 'signed-out';
  }
  const here = () => ent.source() === 'billing' && ent.has('paid');
  let arrived = false;
  // a server without the sync route yet (404), or any failure: the checks below, as before
  if (sessionId && typeof ent.sync === 'function') { try { await ent.sync(sessionId); } catch { /* the checks */ } arrived = here(); }
  for (const ms of waits) {
    if (arrived) break;
    if (ms) await sleep(ms);
    try { await ent.refresh({ force: true }); } catch { /* try again */ }
    arrived = here();
  }
  if (!arrived) { app.toast(RETURN_LINES.pending, 4200); return 'pending'; }
  // hushmallow Beyond, confirmed by Stripe through our server: its full welcome (with the Mallows), where the app has it
  if (ent.tier() === 'ultra' && typeof app.welcomePlan === 'function') {
    try { await app.welcomePlan({ tier: 'ultra', period: ent.webPlan?.()?.period ?? null, from: null }); return 'welcome'; } catch { /* the line, below */ }
  }
  app.toast(`Welcome to ${PLANS[ent.tier()].name}`);
  app.haptic?.('success');
  app.world?.react?.('celebrate');
  return 'welcome';
}
