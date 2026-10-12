// Subscription entitlements: exactly two paid tiers.
//
//   paid  — shown as HUSHMALLOW FLOW: the Mallows, Hushflow worlds, rituals.
//   ultra — shown as HUSHMALLOW BEYOND: everything in Flow + Another Angle.
//
// The internal ids ('paid', 'ultra') and every App Store product id are
// unchanged so existing purchases, receipts and the native bridge keep
// working. Only the names people see changed; planName() is the adapter.
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
    id: 'paid', name: 'Hushmallow Flow', short: 'Flow', tagline: 'A little more room for your feelings.',
    productIds: { monthly: 'hushmallow.paid.monthly', yearly: 'hushmallow.paid.yearly' },
    includes: [
      'All seven squeezable Mallows and their reactions',
      'Hushflow worlds that respond to how you play, like the Static Storm and the Luminous Ocean',
      'Your own words, and up to 7 photos if you like (they never leave your phone)',
      'The Memory Garden for the tools you discover',
      'Over 1,000 interactive touch rituals for the whole A–Z of feelings',
      'Favourites, Auto-flow and optional private history',
    ],
  },
  ultra: {
    id: 'ultra', name: 'Hushmallow Beyond', short: 'Beyond', tagline: 'There’s more than one way to see it.',
    productIds: { monthly: 'hushmallow.ultra.monthly', yearly: 'hushmallow.ultra.yearly' },
    includes: [
      'Everything in Hushmallow Flow',
      'Another Angle: separate what happened from what your mind added',
      'Gentle reframing with evidence orbits, perspective portals and plot twists',
      'Alternative perspectives for work, friends, family, love, rejection and more',
      'Fact or interpretation, thought X-rays and conversation practice',
    ],
    planned: [
      'Belief Mallows you can investigate',
      'perspective worlds built for Another Angle',
    ],
  },
};

/** Display adapter: internal tier id → the plan name people see. */
export function planName(tier) {
  return PLANS[tier]?.name || 'Hushmallow';
}

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

/** The only way Beyond (ultra) code/content gets loaded. */
export async function loadUltra(ent) {
  requireEntitlement(ent, 'ultra');
  const [angle, frameworks, engine] = await Promise.all([
    import('../ultra/another-angle.js'),
    import('../ultra/frameworks.js'),
    import('../ultra/reframe-engine.js'),
  ]);
  return { angle, frameworks, engine };
}
