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
//     ready() → Promise<boolean>: may the guest's account entry show? (src/auth/readiness.js:
//       the project's tables exist and email sign-up is set up; asked once a session, never in a loop)
//     load() → Promise<the full API of src/auth/client.js>  (lazy import)
//
// Links that land on the app's root with sign-in parameters (?code=,
// ?token_hash=, ?error=… — Supabase falls back to the Site URL when a
// redirect is not allowed) move to /auth/callback on this same site, the
// current entry replaced so no token stays in history.

import PUBLISHED from './public-config.js';
import { resolveAuthConfig } from './config.js';
import { bootNamespace, createNamespacedStore, settleNamespace, needsGuestChoice, readPersistedSession, readMarker, guestHasData, cleanupWipes, honourWipe, wipedSince, wipeKey, WIPE_RELOAD, maskEmail } from './namespace.js';
import { createStore } from '../engine/storage.js';
import { createReadiness } from './readiness.js';

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
  // an account whose copy here was deleted or removed (on any page of this device) leaves nothing behind
  if (ls) safe(() => cleanupWipes(ls, readPersistedSession(ls, config.storageKey)?.uid || null));
  const ns = bootNamespace({ config, ls });
  const store = createNamespacedStore({ ns, ls });
  // booted while another tab is removing this account's copy: nothing is written, not even the marker
  const sealedAtBoot = ns.mode === 'account' && !!safe(() => wipedSince(ls, ns.uid, ns.wipeId), false);
  const guestChoice = ns.mode === 'account' && ls && !sealedAtBoot ? settleNamespace(ls, ns.uid).needsChoice : false;
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
  'guest-kept': 'This device’s guest things are with your account here now.',
});

/**
 * The notice's line for this page: an arrival names the account it signed in
 * (shortened, maskEmail), so a link or a shared phone that signed in someone
 * other than expected is plain at once. null for an unknown notice.
 */
export function noticeText(kind, ns) {
  const base = NOTICE_TEXT[kind];
  if (!base) return null;
  const who = ns?.mode === 'account' ? maskEmail(ns.email) : null;
  if (who && kind === 'signed-in') return `You’re signed in as ${who}.`;
  if (who && kind === 'verified') return `Your email is confirmed. You’re signed in as ${who}.`;
  return base;
}

export function createAuthHandle(boot, { onReload, onExpired, win = globalThis, ls = safe(() => globalThis.localStorage), readiness = null } = {}) {
  const { config, ns } = boot;
  const enabled = !!config.enabled && !boot.forwarding;
  let real = null, loading = null;
  // production never shows a half-configured sign-in: the project is asked first (once a session)
  const gate = enabled ? (readiness || createReadiness(config)) : null;
  const ready = () => (gate ? gate.check().catch(() => false) : Promise.resolve(false));
  const listeners = new Set();
  // before (or without) the full client: another tab signing in or out changes which
  // namespace this page belongs to, so it reloads at the next calm moment; another
  // tab deleting this account or removing its copy here seals this page's namespace
  // at once and removes what it wrote (src/auth/namespace.js honourWipe)
  if (enabled && typeof onReload === 'function') {
    win?.addEventListener?.('storage', (e) => {
      if (real) return;
      if (ns.mode === 'account' && (e.key == null || e.key === wipeKey(ns.uid))) {
        const w = safe(() => honourWipe(ls, ns.uid, ns.wipeId));
        if (w) { onReload({ reason: WIPE_RELOAD[w.reason], urgent: false, hash: '#home' }); return; }
      }
      if (e.key != null && e.key !== config.storageKey) return;
      const uid = safe(() => readPersistedSession(ls, config.storageKey)?.uid) || null;
      if (uid !== (ns.uid || null)) onReload({ reason: uid ? 'account-changed' : 'expired', urgent: false, hash: '#home' });
    });
  }
  const handle = {
    enabled,
    config,
    namespace: ns,
    status: () => (real ? real.status() : !enabled ? 'off' : ns.mode === 'account' ? 'signed-in' : 'guest'),
    user: () => (real ? real.user() : ns.mode === 'account' ? { id: ns.uid, email: ns.email || null } : null),
    get pendingGuestChoice() { return real ? real.pendingGuestChoice : (ns.mode === 'account' && !!safe(() => needsGuestChoice(globalThis.localStorage, ns.uid), false)); },
    /** "Not now" at the first sign-in here, and the guest still has things: the account screen offers them again. */
    get guestDataWaiting() { return real ? real.guestDataWaiting : (ns.mode === 'account' && !!safe(() => readMarker(ls, ns.uid)?.guestChoice === 'fresh' && guestHasData(ls), false)); },
    get loaded() { return !!real; },
    /**
     * May a guest's account entry show (Settings' row, a #account link, the sign-in screens)? True once the project
     * has answered that its tables exist and email sign-up is set up; false when sign-in is off or the project is not
     * ready (one console info line says why). A signed-in account's own entry never waits on it (it must always be
     * able to sign out or delete itself).
     */
    ready,
    get readiness() { return gate?.result || null; },
    /** The full sign-in API (src/auth/client.js), imported on first use. */
    load() {
      if (!enabled) return Promise.reject(Object.assign(new Error('sign-in is off'), { code: 'not_configured' }));
      if (!loading) {
        loading = import('./client.js').then((m) => {
          real = m.createAuth({ config, ns, onReload, onExpired, readiness: ready });
          for (const fn of listeners) real.onChange(fn);
          return real;
        }).catch((e) => { loading = null; throw e; });
      }
      return loading;
    },
    onChange(fn) { listeners.add(fn); const off = real?.onChange(fn); return () => { listeners.delete(fn); off?.(); }; },
    /** The opt-in sync while the app runs (src/auth/autosync.js), once start() has run; null for guests. */
    autosync: null,
    /**
     * Signed in: load the client, check the session with the server, then
     * keep whatever the person opted into in step (src/auth/autosync.js).
     * Resolves the client. Guests: nothing loads; resolves null.
     */
    start({ store, prefs } = {}) {
      if (!enabled || ns.mode !== 'account') return Promise.resolve(null);
      if (!starting) {
        starting = handle.load().then(async (a) => {
          await a.init();
          if (a.status() === 'signed-in' && store && prefs) {
            const m = await import('./autosync.js');
            const sync = m.startAutoSync({ auth: a, store, prefs });
            handle.autosync = sync;
            // a sign-out, a deletion or "Remove this device's data" pauses it and waits for a run in flight
            a.addQuiescer?.({ pause: () => sync.pause(), resume: () => sync.resume() });
            sync.syncNow().catch(() => {});
          }
          return a;
        }).catch((e) => { starting = null; throw e; });
      }
      return starting;
    },
  };
  let starting = null;
  return handle;
}
