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
// In a plain browser there is no store, so a clearly labelled *test*
// provider can grant tiers locally for development and review — it never
// charges and the UI always says "Test purchase".

import { RITUALS } from '../data/rituals.js';
import { BRAND } from '../brand.js';

// say only what is switched on today
const PAID_COUNT = RITUALS.filter((r) => (r.tier || 'paid') === 'paid').length;
const LIBRARY_LINE = PAID_COUNT >= 1000
  ? 'Over 1,000 more touch rituals in the library, for the whole A–Z of feelings'
  : `${PAID_COUNT.toLocaleString('en-GB')} more touch rituals in the library, for the A–Z of feelings`;

// Lines that sell something not switched on in this build stay out until
// the release that switches it on (flip the flag in that same change).
//   beliefMallows: Belief Mallows (W2 stage 2) inside Another Angle (W8): src/beyond/belief (on this phone only). On since
//   the integration of 16 Oct 2026 (Beyond only: src/beyond/belief/gate.js also requires the 'ultra' entitlement).
export const LIVE_FEATURES = Object.freeze({ beliefMallows: true });

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

export function createEntitlements({ store }) {
  const native = nativeBridge();
  const listeners = new Set();
  let state = store.get('entitlement', { tier: 'none', source: null, since: null });
  const testOk = testPurchasesAllowed();
  // a test plan saved on a dev host means nothing on the public site (testEnded: the plans page says so, once, quietly —
  // a returning pilot tester whose test plan this host no longer honours; nothing stored is changed)
  const testEnded = state.source === 'test' && !testOk && !native;
  if (testEnded) state = { tier: 'none', source: null, since: null };

  const set = (tier, source) => {
    state = { tier, source, since: Date.now() };
    store.set('entitlement', state);
    listeners.forEach((fn) => fn(state));
  };

  const api = {
    get isNative() { return !!native; },
    /** Can this build sell (or test-grant) a plan right now? */
    get canPurchase() { return !!native || testOk; },
    /** A test plan was kept on this phone, and this host has no test purchases: it was set aside at start. */
    get testEnded() { return testEnded && state.tier === 'none'; },
    tier: () => state.tier,
    source: () => state.source,
    has: (need) => RANK[state.tier] >= RANK[need],
    flags: () => ({ paid: RANK[state.tier] >= 1, ultra: RANK[state.tier] >= 2 }),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async refresh() {
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
      // development/test provider: grants locally, never charges — dev/preview hosts only
      if (!testOk) return { ok: false, test: false, unavailable: true };
      set(planId, 'test');
      return { ok: true, test: true };
    },
    async restore() {
      if (native) { const r = await native.restore(); if (r?.tier) set(r.tier, 'app-store'); return state; }
      return state;
    },
    cancelTest() { if (state.source === 'test') set('none', null); },
  };
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
