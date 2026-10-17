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
// and only these three paths). What is sent: the signed-in account's access
// token (Authorization: Bearer) and, for a checkout, { plan, period }. Never
// words, feelings or photos, and nothing at all for a guest.
//
//   createBilling({ auth, signIn, config?, shell?, prices?, fetchImpl?, nav?, timeoutMs? }) → billing | null (off)
//     signedIn()             the account is signed in on this device
//     accountToken()         → its current access token, or null (Another Angle's session sends it too, src/beyond/angle-client.js)
//     status()               → { ok: true, tier, status, periodEnd, endsAt, cancelAtPeriodEnd, manageable } | { ok: false, reason }
//                              (periodEnd, endsAt: ms or null; the server sends ISO or ms, both are read)
//     checkout(plan, period) → { redirecting } (on to Stripe Checkout) | { needsAccount } | { manage } (has a plan) | { failed, reason }
//     portal()               → { redirecting } (Stripe's customer portal) | { needsAccount } | { none } | { failed, reason }
//     prices()               → { productId: 'A$…' }, from BILLING_PRICES (only those set)
//   resolveBilling({ provider, endpoint, allowedHosts, loc, session }) → { provider, endpoint } | null
//   inNativeShell(win?)     the App Store app's shell (window.HushNative or the hushStore message handler)
//   takeReturn({ loc, hist }) → 'success' | 'cancel' | 'portal' | null: the ?billing= Stripe sent the person
//     back with, taken out of the address at once (Back never brings it again)
//   welcomeBack(app, kind)  after Stripe: the plan is asked for again (a few times: the webhook can take a
//     moment) and said once
//
// Only Stripe's own pages are ever opened (STRIPE_PAGES: checkout.stripe.com,
// billing.stripe.com, and our custom domain checkout.hushmallow.com, which Stripe
// serves both from once it is activated), whatever an answer says.

import { BILLING_PRICES, deploySettings } from './config.js';
import { PLANS } from './entitlements.js';

export const PATHS = Object.freeze({ checkout: '/v1/billing/checkout', status: '/v1/billing/status', portal: '/v1/billing/portal' });
/**
 * Our custom domain for Checkout and the customer portal (decision D12). Stripe moves both pages there the moment the
 * owner activates it, so this list must be live in production and staging before that, or every checkout and
 * Manage subscription fails after the server has made the session.
 */
export const CHECKOUT_DOMAIN = 'checkout.hushmallow.com';
/** Exact host names only: a subdomain, a lookalike, another port or credentials never pass (stripePage). */
export const STRIPE_PAGES = Object.freeze(['checkout.stripe.com', 'billing.stripe.com', CHECKOUT_DOMAIN]);
export const TIMEOUT_MS = 10000;
/** Said after Stripe: a checkout let go, or a plan still on its way (the webhook can take a moment). */
export const RETURN_LINES = Object.freeze({
  cancel: 'No problem. Nothing was charged.',
  pending: 'Thank you. Your plan is on its way: it can take a minute to arrive.',
});
const DEV_HOSTS = ['localhost', '127.0.0.1'];
const DEV_KEY = 'hm2:billingDev';
const PRODUCT = /^hushmallow\.(paid|ultra)\.(monthly|yearly)$/;

// THE billing network call (see the header): one place, one shape.
const netFetch = (url, init) => globalThis.fetch(url, init);

function safeSession() { try { return globalThis.sessionStorage || null; } catch { return null; } }
// no subscription date is earlier: a seconds value sent by mistake reads as no date, never as January 1970
const EARLIEST = Date.UTC(2020, 0, 1);
/** A date from the server, ISO or ms → ms, or null. */
function dateMs(v) {
  const t = typeof v === 'number' ? v : typeof v === 'string' && v ? Date.parse(v) : NaN;
  return Number.isFinite(t) && t >= EARLIEST ? t : null;
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

export function createBilling({
  auth, signIn = false, config = resolveBilling(), shell = inNativeShell(), prices = BILLING_PRICES, fetchImpl = netFetch,
  nav = (url) => globalThis.location.assign(url), timeoutMs = TIMEOUT_MS,
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
  /** Onwards to a Stripe page (the page leaves). false when the answer is not one. */
  function open(url) {
    const href = stripePage(url);
    if (!href) return false;
    nav(href);
    return true;
  }

  return {
    get endpoint() { return endpoint; },
    signedIn,
    accountToken,
    async status() {
      if (!signedIn()) return { ok: false, reason: 'signed-out' };
      const r = await call(PATHS.status, { method: 'GET' });
      if (r.signedOut || r.http === 401) return { ok: false, reason: 'signed-out' };
      if (r.http !== 200 || !r.data || typeof r.data !== 'object') return { ok: false, reason: reasonOf(r) };
      const d = r.data;
      return {
        ok: true, tier: ['none', 'paid', 'ultra'].includes(d.tier) ? d.tier : 'none',
        status: typeof d.status === 'string' && /^[a-z_]{1,24}$/.test(d.status) ? d.status : 'none',
        // endsAt: the day the subscription ends (cancelled at the period end, or a date set for it); null while it renews
        periodEnd: dateMs(d.current_period_end), endsAt: dateMs(d.ends_at),
        cancelAtPeriodEnd: d.cancel_at_period_end === true, manageable: d.manageable === true,
      };
    },
    async checkout(plan, period) {
      if (!['paid', 'ultra'].includes(plan) || !['monthly', 'yearly'].includes(period)) return { failed: true, reason: 'invalid' };
      if (!signedIn()) return { needsAccount: true };
      const r = await call(PATHS.checkout, { body: { plan, period } });
      if (r.signedOut || r.http === 401) return { needsAccount: true };
      if (r.http === 409) return { manage: true };
      if (r.http === 200 && open(r.data?.url)) return { redirecting: true };
      return { failed: true, reason: r.http === 200 ? 'not_stripe' : reasonOf(r) };
    },
    async portal() {
      if (!signedIn()) return { needsAccount: true };
      const r = await call(PATHS.portal, { body: {} });
      if (r.signedOut || r.http === 401) return { needsAccount: true };
      if (r.http === 404) return { none: true };
      if (r.http === 200 && open(r.data?.url)) return { redirecting: true };
      return { failed: true, reason: r.http === 200 ? 'not_stripe' : reasonOf(r) };
    },
    prices() {
      const out = {};
      for (const [k, v] of Object.entries(prices || {})) if (PRODUCT.test(k) && typeof v === 'string' && v.trim() && v.length <= 24) out[k] = v.trim();
      return out;
    },
  };
}

/** The ?billing= Stripe sent the person back with ('success' | 'cancel' | 'portal'), taken out of the address; null when none. */
export function takeReturn({ loc = globalThis.location, hist = globalThis.history } = {}) {
  let u;
  try { u = new URL(loc.href); } catch { return null; }
  if (!u.searchParams.has('billing')) return null;
  const v = u.searchParams.get('billing');
  u.searchParams.delete('billing');
  try { hist.replaceState(hist.state ?? null, '', u.href); } catch { /* the address keeps it; nothing else reads it */ }
  return ['success', 'cancel', 'portal'].includes(v) ? v : null;
}

/**
 * Back from Stripe. 'success': the plan is asked for again, a few times (the webhook can take a moment),
 * and said once it is here, else a calm "on its way"; 'cancel': nothing was charged; 'portal': the plan
 * is asked for again quietly (it may have been cancelled or changed there).
 */
export async function welcomeBack(app, kind, { waits = [0, 2000, 4000, 8000, 15000], sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const { ent } = app;
  if (kind === 'cancel') { app.toast(RETURN_LINES.cancel); return 'cancel'; }
  if (kind === 'portal') { try { await ent.refresh({ force: true }); } catch { /* the next check */ } return 'portal'; }
  if (kind !== 'success') return null;
  for (const ms of waits) {
    if (ms) await sleep(ms);
    try { await ent.refresh({ force: true }); } catch { /* try again */ }
    if (ent.source() === 'billing' && ent.has('paid')) {
      app.toast(`Welcome to ${PLANS[ent.tier()].name}`);
      app.haptic?.('success');
      app.world?.react?.('celebrate');
      return 'welcome';
    }
  }
  app.toast(RETURN_LINES.pending, 4200);
  return 'pending';
}
