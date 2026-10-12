// Subscription entitlements: exactly two paid tiers.
//
//   paid  — HUSHMALLOW: the Mallows, the Hushfold, the ritual library.
//   ultra — HUSHMALLOW ULTRA: everything in paid + Another Angle (Reframe).
//
// Enforcement points (not just hidden buttons):
//   * the router refuses to start any ritual without `paid` (or `ultra`)
//   * the recommender never returns rituals outside the person's tier
//   * Ultra's modules and content are dynamically imported ONLY through
//     loadUltra(), which throws without the `ultra` entitlement
//
// Purchases go through a provider. In the iOS app wrapper the native
// provider talks to StoreKit 2 (window.webkit.messageHandlers.hushStore or
// window.HushNative.store) and the App Store receipt is the source of truth.
// In a plain browser there is no store, so a clearly labelled *test*
// provider can grant tiers locally for development and review — it never
// charges and the UI always says "Test purchase".

export const PLANS = {
  paid: {
    id: 'paid', name: 'Hushmallow', tagline: 'Your second brain for feelings.',
    productIds: { monthly: 'hushmallow.paid.monthly', yearly: 'hushmallow.paid.yearly' },
    includes: [
      'All seven living Mallows and their reactions',
      'The Hushfold: seven realms that respond to how you feel',
      'Over 1,000 interactive touch rituals for the whole A–Z of feelings',
      'Your own words and up to 7 of your own photos inside the ritual (they never leave your phone)',
      'Suggestions that rotate so things stay fresh',
      'Favourites and optional private history',
      'New rituals as the library grows',
    ],
  },
  ultra: {
    id: 'ultra', name: 'Hushmallow Ultra', tagline: 'See your thoughts in a different light.',
    productIds: { monthly: 'hushmallow.ultra.monthly', yearly: 'hushmallow.ultra.yearly' },
    includes: [
      'Everything in Hushmallow',
      'Another Angle: separate what happened from what your brain added',
      'Evidence orbits, perspective portals and plot twists for real situations',
      'Authored frameworks for work, friends, family, love, rejection and more',
      'Fact or fiction, thought X-rays and conversation practice',
      'Plan your next move and save the angles you found',
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
  // a test plan saved on a dev host means nothing on the public site
  if (state.source === 'test' && !testOk && !native) state = { tier: 'none', source: null, since: null };

  const set = (tier, source) => {
    state = { tier, source, since: Date.now() };
    store.set('entitlement', state);
    listeners.forEach((fn) => fn(state));
  };

  const api = {
    get isNative() { return !!native; },
    /** Can this build sell (or test-grant) a plan right now? */
    get canPurchase() { return !!native || testOk; },
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
        if (r?.tier) set(r.tier, 'app-store');
        return { ok: !!r?.tier, test: false };
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

/** The only way Ultra code/content gets loaded. */
export async function loadUltra(ent) {
  requireEntitlement(ent, 'ultra');
  const [angle, frameworks, engine] = await Promise.all([
    import('../ultra/another-angle.js'),
    import('../ultra/frameworks.js'),
    import('../ultra/reframe-engine.js'),
  ]);
  return { angle, frameworks, engine };
}
