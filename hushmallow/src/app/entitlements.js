// Subscription entitlements: exactly two paid tiers. The ids stay 'paid' /
// 'ultra' (StoreKit product ids, stored entitlements and tests depend on
// them); customers only ever see the names from src/brand.js:
//
//   paid  — hushmallow Flow: the Mallows, MallowTouch, Hushflow, the
//           Memory Garden and the ritual library.
//   ultra — hushmallow Beyond: everything in Flow + Another Angle.
//
// Enforcement points (not just hidden buttons):
//   * the router refuses to start any ritual without `paid` (or `ultra`)
//   * the recommender never returns rituals outside the person's tier
//   * Beyond's ('ultra') modules and content are dynamically imported ONLY through
//     loadUltra(), which throws without the `ultra` entitlement
//
// Purchases go through a provider. In the iOS app wrapper the native
// provider talks to StoreKit 2 (window.webkit.messageHandlers.hushStore or
// window.HushNative.store) and the App Store receipt is the source of truth.
// On the web, once web subscriptions are switched on (src/app/billing.js,
// off by default), Stripe sells them through our own server and the plan is
// that server's answer (source 'billing'), kept on this phone with the time
// it was checked: trusted for BILLING_GRACE_MS without a new answer (offline),
// then set aside until the server answers again. Another Angle's server checks
// the subscription itself, so a forged plan here never reaches it in billing
// mode. In a plain browser without them there is no store, so a clearly
// labelled *test* provider can grant tiers locally for development and
// review — it never charges and the UI always says "Test purchase".

import { RITUALS } from '../data/rituals.js';
import { BRAND } from '../brand.js';

// say only what is switched on today
const PAID_COUNT = RITUALS.filter((r) => (r.tier || 'paid') === 'paid').length;
const LIBRARY_LINE = PAID_COUNT >= 1000
  ? 'Over 1,000 more touch rituals in the library, for the whole A–Z of feelings'
  : `${PAID_COUNT.toLocaleString('en-GB')} more touch rituals in the library, for the A–Z of feelings`;

// Lines that sell something not switched on in this build stay out until
// the release that switches it on (flip the flag in that same change).
//   beliefMallows: Belief Mallows (W2 stage 2) inside Another Angle (W8)
export const LIVE_FEATURES = Object.freeze({ beliefMallows: false });

// Customer copy. Never the word 'AI' (brand language rule): Another Angle
// is described by what it does; the consent and privacy screens say how.
// The plans page leads with the first three lines of each plan (Beyond: its
// own capabilities, then "Everything in Flow"); the rest sit behind
// "Everything included".
export const PLANS = {
  paid: {
    id: 'paid', name: BRAND.flowPlanName, tagline: BRAND.flowTagline,
    productIds: { monthly: 'hushmallow.paid.monthly', yearly: 'hushmallow.paid.yearly' },
    includes: [
      'The seven living, squeezable Mallows, with MallowTouch',
      'Continuous Hushflow through worlds that respond to how you feel',
      'Mallow discoveries, kept as skills in your Memory Garden',
      'Cinematic conversations, where your thoughts become Thought\u00a0Mallows',
      'Release, calming and sensory play for big feelings',
      'Favourites and saved progress, stored on this phone',
      'Your own words and up to seven of your own photos inside the worlds (they never leave your phone), or the seven Mallows when you add none',
      LIBRARY_LINE,
    ],
  },
  ultra: {
    id: 'ultra', name: BRAND.beyondPlanName, tagline: BRAND.beyondTagline,
    productIds: { monthly: 'hushmallow.ultra.monthly', yearly: 'hushmallow.ultra.yearly' },
    includes: [
      `Everything in ${BRAND.flowPlanName}`,
      'Another Angle: fresh perspectives on your own situations, explored with Zuzu',
      'Fact versus interpretation: what you know, and what your mind added',
      'Alternative explanations you can test for yourself',
      ...(LIVE_FEATURES.beliefMallows ? ['Belief Mallow investigation for the stories that keep coming back'] : []),
      'Perspective-changing worlds made for Another Angle',
    ],
  },
};

import { testPurchasesAllowed } from './config.js';

const RANK = { none: 0, paid: 1, ultra: 2 };
const NONE = Object.freeze({ tier: 'none', source: null, since: null });
/** How long a web plan (source 'billing') is trusted without a new answer from the billing server: the offline grace. */
export const BILLING_GRACE_MS = 3 * 86400000;
/** The least time between two checks with the billing server (start, coming back to the app). */
export const BILLING_RECHECK_MS = 60000;
/** A web plan checked later than now by more than this (the phone's clock set back, or an edited copy) is not trusted. */
export const BILLING_CLOCK_SKEW_MS = 10 * 60000;

function nativeBridge() {
  if (typeof window === 'undefined') return null;
  if (window.HushNative?.store) return window.HushNative.store;
  const h = window.webkit?.messageHandlers?.hushStore;
  if (!h) return null;
  // request/response over the WKWebView message bridge
  let seq = 0;
  const waiting = new Map();
  window.__hushStoreReply = (id, payload) => { waiting.get(id)?.(payload); waiting.delete(id); };
  const call = (action, args) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); h.postMessage({ id, action, ...args }); });
  return {
    current: () => call('current', {}),
    purchase: (productId) => call('purchase', { productId }),
    restore: () => call('restore', {}),
  };
}

export function createEntitlements({ store, billing = null, now = () => Date.now() }) {
  const native = nativeBridge();
  const listeners = new Set();
  let state = store.get('entitlement', { tier: 'none', source: null, since: null });
  const testOk = testPurchasesAllowed();
  // a test plan saved on a dev host means nothing on the public site (testEnded: the plans page says so, once, quietly —
  // a returning pilot tester whose test plan this host no longer honours; nothing stored is changed)
  const testEnded = state.source === 'test' && !testOk && !native;
  if (testEnded) state = { tier: 'none', source: null, since: null };
  // web subscriptions (src/app/billing.js; null when off): never in the App Store app, where Apple's purchase is the only one
  const web = native ? null : billing;
  // a web plan whose last check is older than the grace (or later than now) counts as no plan (nothing stored changes)
  // until the server answers
  const fresh = (checkedAt) => { const age = now() - (Number(checkedAt) || 0); return age > -BILLING_CLOCK_SKEW_MS && age < BILLING_GRACE_MS; };
  const cur = () => (state.source === 'billing' && !fresh(state.checkedAt) ? NONE : state);

  const set = (tier, source) => {
    state = { tier, source, since: Date.now() };
    store.set('entitlement', state);
    listeners.forEach((fn) => fn(state));
  };
  /** The billing server's answer, kept with when it was checked. */
  const setWeb = (r) => {
    const since = state.source === 'billing' && state.tier === r.tier && state.since ? state.since : now();
    state = { tier: r.tier, source: 'billing', since, checkedAt: now(), status: r.status, periodEnd: r.periodEnd, cancelAtPeriodEnd: r.cancelAtPeriodEnd, manageable: r.manageable };
    store.set('entitlement', state);
    listeners.forEach((fn) => fn(state));
  };
  let lastWebCheck = -Infinity, webCheck = null, webAnswered = false;
  /** Ask the billing server (at most once a BILLING_RECHECK_MS unless forced; one request at a time). */
  function refreshWeb(force) {
    if (webCheck) return webCheck;
    if (!force && now() - lastWebCheck < BILLING_RECHECK_MS) return Promise.resolve(cur());
    lastWebCheck = now();
    webCheck = (async () => {
      let r = null;
      try { r = await web.status(); } catch { r = null; }
      webAnswered = !!r?.ok;
      // a plan, or what the server says about a web plan kept here (ended, or a past one with receipts to see);
      // a test or App Store plan is never taken away by it. Offline or signed out: what is kept stays, within the grace
      if (r?.ok && (RANK[r.tier] > 0 || state.source === 'billing' || (state.tier === 'none' && r.manageable))) setWeb(r);
      return cur();
    })().finally(() => { webCheck = null; });
    return webCheck;
  }

  const api = {
    get isNative() { return !!native; },
    /** Web subscriptions are on: plans are sold through Stripe (src/app/billing.js). */
    get isWeb() { return !!web; },
    /** Can this build sell (or test-grant) a plan right now? */
    get canPurchase() { return !!native || !!web || testOk; },
    /** A test plan was kept on this phone, and this host has no test purchases: it was set aside at start. */
    get testEnded() { return testEnded && state.tier === 'none'; },
    tier: () => cur().tier,
    source: () => cur().source,
    has: (need) => RANK[cur().tier] >= RANK[need],
    flags: () => ({ paid: RANK[cur().tier] >= 1, ultra: RANK[cur().tier] >= 2 }),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Web subscriptions: the account is signed in here (a web plan needs one). */
    webSignedIn: () => !!web && web.signedIn(),
    /** A web plan's details for Settings: { status, periodEnd, cancelAtPeriodEnd, manageable } | null. */
    webPlan() {
      const s = cur();
      return s.source === 'billing' ? { status: s.status || null, periodEnd: s.periodEnd ?? null, cancelAtPeriodEnd: !!s.cancelAtPeriodEnd, manageable: !!s.manageable } : null;
    },
    async refresh({ force = false } = {}) {
      if (web) return refreshWeb(force);
      if (!native) return state;
      const r = await native.current();   // {tier: 'none'|'paid'|'ultra'}
      if (r && RANK[r.tier] != null) set(r.tier, 'app-store');
      return state;
    },
    async purchase(planId, period = 'monthly') {
      const plan = PLANS[planId];
      if (!plan) throw new Error('Unknown plan');
      if (native) {
        const r = await native.purchase(plan.productIds[period]);
        // the shell replies {cancelled:true} when the person backs out of the sheet
        if (r?.cancelled) return { ok: false, test: false, cancelled: true };
        if (r?.tier && RANK[r.tier] != null) set(r.tier, 'app-store');
        // a reply carrying the old tier is not a purchase
        return { ok: RANK[r?.tier] >= RANK[planId], test: false };
      }
      // web subscriptions: on to Stripe Checkout ({ redirecting }: the page leaves; the plan arrives from the server on the
      // way back), or { needsAccount } (sign in first), { manage } (a plan already: changed in the portal), { failed }
      if (web) return { ok: false, test: false, ...(await web.checkout(planId, period)) };
      // development/test provider: grants locally, never charges — dev/preview hosts only
      if (!testOk) return { ok: false, test: false, unavailable: true };
      set(planId, 'test');
      return { ok: true, test: true };
    },
    async restore() {
      if (native) { const r = await native.restore(); if (r?.tier) set(r.tier, 'app-store'); return state; }
      if (web) {
        const s = await refreshWeb(true);
        // offline, or the server could not say: the plans page says "Couldn't check", never "Nothing to restore yet"
        if (!webAnswered) throw new Error('The billing server did not answer');
        return s;
      }
      return state;
    },
    cancelTest() { if (state.source === 'test') set('none', null); },
    /** Web subscriptions: Stripe's customer portal (cancel as easily as subscribing, change plan, card, receipts). */
    async manage() { return web ? web.portal() : { failed: true, reason: 'off' }; },
  };
  // the plans page shows these under each button (src/app/scenes/plans.js); only with web subscriptions on
  if (web) api.prices = () => web.prices();
  return api;
}

export class EntitlementError extends Error {
  constructor(need) { super(`Needs ${need}`); this.need = need; }
}

export function requireEntitlement(ent, need) {
  if (!ent.has(need)) throw new EntitlementError(need);
}

/** The only way Beyond ('ultra') code/content gets loaded. */
export async function loadUltra(ent) {
  requireEntitlement(ent, 'ultra');
  const [angle, frameworks, engine, beyond] = await Promise.all([
    import('../ultra/another-angle.js'),
    import('../ultra/frameworks.js'),
    import('../ultra/reframe-engine.js'),
    import('../beyond/another-angle.js'),   // the cinematic Another Angle (W8): its server client lives inside it
  ]);
  return { angle, frameworks, engine, beyond };
}
