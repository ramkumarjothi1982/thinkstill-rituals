// The sign-in part of the app's boot (src/app/main.js), synchronous and small.
//
// It decides, before any scene or store exists, which local namespace this
// page runs in (src/auth/namespace.js), from the session supabase-js left in
// localStorage, without loading supabase-js. Sign-in off: the store is
// exactly createStore() and nothing else happens (the app boots as before).
//
//   authBoot() → { config, ns, store, forwarding, deepLink, guestChoice, notice }
//   createAuthHandle(boot, { onReload, onExpired }) → app.auth
//     enabled, namespace, status(), user(), pendingGuestChoice,
//     load() → Promise<the full API of src/auth/client.js>  (lazy import)
//
// Links that land on the app's root with sign-in parameters (?code=,
// ?token_hash=, ?error=… — Supabase falls back to the Site URL when a
// redirect is not allowed) move to /auth/callback on this same site, the
// current entry replaced so no token stays in history.

import PUBLISHED from './public-config.js';
import { resolveAuthConfig } from './config.js';
import { bootNamespace, createNamespacedStore, settleNamespace, needsGuestChoice } from './namespace.js';
import { createStore } from '../engine/storage.js';

const AUTH_PARAMS = ['code', 'token_hash', 'error_code', 'error_description'];
const NOTICE_KEY = 'hm2:auth.notice';
const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };

/** Where a root URL carrying sign-in parameters should go instead (or null). Pure. */
export function callbackForward(href) {
  let u;
  try { u = new URL(href); } catch { return null; }
  const q = u.searchParams;
  const f = new URLSearchParams(u.hash.replace(/^#/, ''));
  const has = AUTH_PARAMS.some((k) => q.has(k)) || (q.has('error') && q.has('error_description')) || f.has('error_description') || f.has('error_code');
  if (!has) return null;
  const params = new URLSearchParams();
  for (const k of ['code', 'token_hash', 'type', 'error', 'error_code', 'error_description', 'next']) {
    const v = q.get(k) ?? f.get(k);
    if (v != null) params.set(k, v);
  }
  const dir = u.pathname.replace(/[^/]*$/, '');
  return `${u.origin}${dir}auth/callback/?${params.toString()}`;
}

export function authBoot({ loc = globalThis.location, ls = safe(() => globalThis.localStorage), ss = safe(() => globalThis.sessionStorage), published = PUBLISHED } = {}) {
  const config = resolveAuthConfig({ published, loc, session: ss });
  if (!config.enabled) return { config, ns: Object.freeze({ mode: 'off', uid: null }), store: createStore(), forwarding: false, deepLink: null, guestChoice: false, notice: null };
  const fwd = callbackForward(loc.href);
  if (fwd) { loc.replace(fwd); return { config, ns: Object.freeze({ mode: 'off', uid: null }), store: createStore({ backend: 'memory' }), forwarding: true, deepLink: null, guestChoice: false, notice: null }; }
  const ns = bootNamespace({ config, ls });
  const store = createNamespacedStore({ ns });
  const guestChoice = ns.mode === 'account' && ls ? settleNamespace(ls, ns.uid).needsChoice : false;
  const deepLink = /^#account(?:$|[?&/])/.test(loc.hash || '') ? 'account' : null;
  const notice = safe(() => ss?.getItem(NOTICE_KEY));
  if (notice) safe(() => ss.removeItem(NOTICE_KEY));
  return { config, ns, store, forwarding: false, deepLink, guestChoice, notice };
}

/** What a notice left before the last reload says to the person (a short, calm toast), or null. */
export const NOTICE_TEXT = Object.freeze({
  'signed-in': 'You’re signed in.',
  'signed-out': 'You’re signed out. Everything here is a guest’s again.',
  deleted: 'Your account is deleted. Thank you for being here.',
  expired: 'You’ve been signed out on this device. Sign in again whenever you like.',
  verified: 'Your email is confirmed. Welcome to hushmallow.',
  'password-updated': 'Your new password is saved.',
  'email-changed': 'Your new email address is confirmed.',
  'device-cleared': 'This device’s copy of your things is removed.',
});

export function createAuthHandle(boot, { onReload, onExpired } = {}) {
  const { config, ns } = boot;
  const enabled = !!config.enabled && !boot.forwarding;
  let real = null, loading = null;
  const listeners = new Set();
  const handle = {
    enabled,
    config,
    namespace: ns,
    status: () => (real ? real.status() : !enabled ? 'off' : ns.mode === 'account' ? 'signed-in' : 'guest'),
    user: () => (real ? real.user() : ns.mode === 'account' ? { id: ns.uid, email: ns.email || null } : null),
    get pendingGuestChoice() { return real ? real.pendingGuestChoice : (ns.mode === 'account' && !!safe(() => needsGuestChoice(globalThis.localStorage, ns.uid), false)); },
    get loaded() { return !!real; },
    /** The full sign-in API (src/auth/client.js), imported on first use. */
    load() {
      if (!enabled) return Promise.reject(Object.assign(new Error('sign-in is off'), { code: 'not_configured' }));
      if (!loading) {
        loading = import('./client.js').then((m) => {
          real = m.createAuth({ config, ns, onReload, onExpired });
          for (const fn of listeners) real.onChange(fn);
          return real;
        }).catch((e) => { loading = null; throw e; });
      }
      return loading;
    },
    onChange(fn) { listeners.add(fn); const off = real?.onChange(fn); return () => { listeners.delete(fn); off?.(); }; },
  };
  return handle;
}
