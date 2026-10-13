// Sign-in for hushmallow: a small API over the vendored supabase-js.
//
// Optional by design: with sign-in off (src/auth/public-config.js) nothing
// here runs and nothing loads. Guests never download supabase-js; it loads
// (lazily, from this site, with Subresource Integrity) only when a session
// is already on this device or the person opens an account screen.
//
//   createAuth({ config, ns, ... }) → auth
//     status()            'off' | 'guest' | 'signed-in' | 'expired'
//     user()              { id, email, emailConfirmed, createdAt, name } | null
//     onChange(fn)        fn({ status, user, event }) → unsubscribe
//     init()              boot: check the persisted session with the server
//     signUp({ email, password, name })      → { ok, needsConfirmation, email } | { ok, signedIn, uid, needsGuestChoice }
//     signIn({ email, password })            → { ok, signedIn, uid, email, needsGuestChoice } | { ok:false, error }
//     chooseGuestData('keep'|'fresh')        the once-only question after a first sign-in on this device
//     enter(hash)                            reload into the signed-in account's namespace
//     signOut({ removeLocal })               local sign-out, session cleanup, reload as guest
//     resend({ email }) / sendReset({ email })  neutral answers, 60 s cooldown
//     updatePassword({ current, password })  checks the CURRENT password with an isolated
//                         client first, then changes it; { ok:false, needsCode } when Supabase wants
//                         reauthentication (a session over 24 h old): the 6-digit code is on its way,
//                         and updatePassword({ current, password, nonce }) finishes it
//     reauthenticate()    emails a new code (60 s cooldown)
//     deleteAccount()   server rows + the auth user (delete_my_account RPC), this device's copy, reload as guest
//     removeDeviceData()  this account's things on this device only
//     addQuiescer({ pause, resume })  the opt-in sync, paused (and waited for) before a sign-out,
//                         a deletion or "Remove this device's data"; the account's store is sealed then
//     profile.get/update/touch, consents.get/set, sync.* (opt-in gated)
//     signInWithProvider('google')           a hook: off until the provider is configured (no button yet)
//   Every failure is { ok: false, error: friendlyError(…) } (src/auth/errors.js).
//
// Sessions: persistSession + autoRefreshToken (supabase-js refreshes before
// expiry and when the tab becomes visible). Whatever happens to the session
// (a refresh that fails for good, a sign-out in another tab, a deleted
// account) this module only ever compares the persisted session with the
// namespace the page booted into (reconcile()): gone → the page drops to
// guest calmly at the next safe moment (guest things were never touched);
// another account → it reloads into that account's namespace. Offline keeps
// the session. A deletion, "Sign out and remove my things" or "Remove this
// phone's data" writes a device-level tombstone first (src/auth/namespace.js
// writeWipe): every other page of that account on this device stops writing
// at once, removes what it wrote and reloads (onWipe). Data calls always filter by the booted account's id and check
// the live session belongs to it; Row Level Security enforces the same.
//
// THE network: supabase-js is given one fetch function, netFetch below, that refuses any URL
// outside the configured project's origin. Realtime, Storage and Functions
// are never used.

import { friendlyError, errorCode, checkEmail, checkPassword } from './errors.js';
import { isUid, readPersistedSession, removeAccountData, removeSupabaseKeys, settleNamespace, applyGuestChoice, needsGuestChoice, readMarker, guestHasData, sealAccount, unsealAccount, isSealed, MARKER_KEY, writeWipe, wipedSince, honourWipe, settleWipe, wipeKey, WIPE_RELOAD } from './namespace.js';
import * as S from './sync.js';
import { FLOW_KEYS } from '../engine/flow-store.js';
import { GARDEN_KEY } from '../engine/garden.js';

export const VENDOR = Object.freeze({
  version: '2.117.2',
  src: new URL('../../vendor/supabase/supabase.js', import.meta.url).href,
  integrity: 'sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok',
});
export const COOLDOWN_MS = 60_000;
export const VERIFY_EVERY_MS = 60_000;
export const TOUCH_EVERY_MS = 6 * 60 * 60 * 1000;
/** How long a checked current password counts for the emailed-code step of the same change. */
export const VERIFIED_MS = 10 * 60 * 1000;
/** The most a sign-out or deletion waits for a sync already running. */
export const QUIESCE_MS = 5000;
/** Providers ready for a sign-in button. Google: set true once it is configured in Supabase (Auth → Providers). */
export const PROVIDERS = Object.freeze({ google: false });
const NOTICE_KEY = 'hm2:auth.notice';
const COOLDOWN_KEY = 'hm2:auth.cooldown';

// THE auth fetch site (tests/core.test.mjs allows exactly this line).
const netFetch = (url, init) => globalThis.fetch(url, init);

/** A fetch for supabase-js that only reaches `origin` (the project), never sends cookies or a referrer. */
export function guardedFetch(origin, base = globalThis.location?.href) {
  return (input, init = {}) => {
    let u;
    try { u = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, base); } catch { return Promise.reject(new TypeError('auth: unreadable request URL')); }
    if (u.origin !== origin) return Promise.reject(new TypeError('auth: blocked a request outside the sign-in server'));
    return netFetch(input, { ...init, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
  };
}

let libPromise = null;
/** Loads vendor/supabase/supabase.js once (classic script, SRI-checked). Resolves the `supabase` global. */
export function loadSupabase({ doc = globalThis.document, timeoutMs = 20000 } = {}) {
  if (globalThis.supabase?.createClient) return Promise.resolve(globalThis.supabase);
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const s = doc.createElement('script');
    let timer = 0;
    const fail = () => { clearTimeout(timer); libPromise = null; s.remove(); reject(Object.assign(new Error('auth: the sign-in library did not load'), { name: 'TypeError', status: 0 })); };
    timer = setTimeout(fail, timeoutMs);
    s.onload = () => { clearTimeout(timer); if (globalThis.supabase?.createClient) resolve(globalThis.supabase); else fail(); };
    s.onerror = fail;
    s.async = true;
    s.integrity = VENDOR.integrity;
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.src = VENDOR.src;
    doc.head.append(s);
  });
  return libPromise;
}

/**
 * The supabase-js client, exactly as the owner's settings ask. The storage
 * key is left at supabase-js's default (sb-<ref>-auth-token), which
 * src/auth/namespace.js reads at boot. `storage` is for Node tests only (the
 * browser uses localStorage, supabase-js's own default).
 */
export function createSupabaseClient(lib, config, { storage } = {}) {
  const auth = { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' };
  if (storage) auth.storage = storage;
  return lib.createClient(config.url, config.key, { auth, global: { fetch: guardedFetch(new URL(config.url).origin) } });
}

let isoSeq = 0;
/**
 * A throwaway supabase-js client that shares nothing with this page's
 * session: no persistence, no refresh timer, no URL detection, its own
 * in-memory storage and its own storage key (so its own lock, and never the
 * "multiple clients on one storage key" clash). It checks the current
 * password before a change, and ends a session a link replaced, without ever
 * touching the signed-in session or the account's namespace.
 */
export function createIsolatedClient(lib, config) {
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
  const storageKey = `hm-isolated-${++isoSeq}-${Math.random().toString(36).slice(2, 10)}`;
  return lib.createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce', storage, storageKey },
    global: { fetch: guardedFetch(new URL(config.url).origin) },
  });
}

/** The site's root (where index.html lives), from any page of it (the app or /auth/callback/). */
export function siteRoot(loc = globalThis.location) {
  const path = String(loc.pathname || '/').replace(/auth\/callback\/?(?:index\.html)?$/, '').replace(/[^/]*$/, '');
  return `${loc.origin}${path}`;
}
/** Where every email link and provider sign-in returns (must be in Supabase's redirect allow-list). */
export const callbackUrl = (loc = globalThis.location) => `${siteRoot(loc)}auth/callback`;

/** Reload this page into whatever namespace the persisted session now says, at `hash`. */
export function reloadInto(hash = '#home', loc = globalThis.location, hist = globalThis.history) {
  try { const u = new URL(loc.href); u.hash = hash || ''; hist.replaceState(null, '', u.href); } catch { /* keep the URL */ }
  loc.reload();
}

const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };
const normEmail = (e) => String(e ?? '').trim().toLowerCase();
const cleanName = (n) => String(n ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
const codeErr = (code) => Object.assign(new Error(code), { code });
const toUser = (u) => (u && isUid(u.id) ? {
  id: u.id.toLowerCase(),
  email: typeof u.email === 'string' ? u.email : null,
  emailConfirmed: !!(u.email_confirmed_at || u.confirmed_at),
  createdAt: u.created_at || null,
  name: typeof u.user_metadata?.display_name === 'string' ? u.user_metadata.display_name.slice(0, 40) : null,
} : null);

export function createAuth({
  config, ns,
  ls = safe(() => globalThis.localStorage), ss = safe(() => globalThis.sessionStorage),
  loader = loadSupabase, doc = globalThis.document, win = globalThis, loc = globalThis.location,
  now = () => Date.now(),
  onReload = ({ hash }) => reloadInto(hash ?? '#home', loc),
  onExpired = () => {},
  passive = false,
  storage,   // Node tests: the Storage supabase-js keeps its session in (the browser: localStorage)
} = {}) {
  const enabled = !!config?.enabled;
  const mode = ns?.mode || 'off';
  const bootUid = mode === 'account' ? ns.uid : null;
  let status = !enabled ? 'off' : mode === 'account' ? 'signed-in' : 'guest';
  let user = bootUid ? { id: bootUid, email: ns.email || null, emailConfirmed: true, createdAt: null, name: null } : null;
  let client = null, clientPromise = null;
  let intent = null;          // our own flow is deciding what happens next (signin, signout, delete…)
  let pendingUid = null;      // signed in, waiting for the guest-data answer before entering
  let settled = false;        // dropped or switching: the page is about to reload
  let lastVerify = 0;
  let consents = null;
  let verified = null;        // { uid, at }: the current password was checked for this change
  const quiescers = new Set();   // { pause() → Promise, resume() }: the opt-in sync (src/auth/boot.js)
  const listeners = new Set();
  /** This page may no longer write into the account's namespace (a removal started here, or on another page of this device). */
  const sealedHere = (uid = bootUid) => isSealed(uid) || (!!uid && uid === bootUid && wipedSince(ls, bootUid, ns?.wipeId));
  const emit = (event) => { const snap = { status, user: user && { ...user }, event }; for (const fn of [...listeners]) { try { fn(snap); } catch (e) { console.warn('[auth]', e); } } };
  const fail = (error) => ({ ok: false, error });

  // ------------------------------------------------------------ client --
  async function ensureClient() {
    if (!enabled) throw codeErr('not_configured');
    if (client) return client;
    if (!clientPromise) {
      clientPromise = (async () => {
        const lib = await loader({ doc });
        const c = createSupabaseClient(lib, config, { storage });
        // never call supabase from inside its own callback (its lock): look a tick later
        c.auth.onAuthStateChange((event, session) => { setTimeout(() => onAuthEvent(event, session), 0); });
        client = c;
        return c;
      })().catch((e) => { clientPromise = null; throw e; });
    }
    return clientPromise;
  }

  function onAuthEvent(event, session) {
    const u = toUser(session?.user);
    if (u && u.id === bootUid) user = { ...user, ...u };
    if (event === 'PASSWORD_RECOVERY') emit('recovery');
    reconcile(event);
  }

  /** Compare the persisted session with the namespace this page booted into. */
  function reconcile(event = 'check') {
    if (!enabled || passive || settled) return;
    if (intent) { emit(event); return; }
    const p = readPersistedSession(ls, config.storageKey);
    const uid = p?.uid || null;
    if (mode === 'account') {
      if (!uid) return drop(event);
      if (uid !== bootUid) return switchTo('account-changed');
      if (status !== 'signed-in') status = 'signed-in';
      emit(event);
      return;
    }
    if (uid) return switchTo('signed-in-elsewhere');
    emit(event);
  }

  function drop(event) {
    settled = true;
    status = 'expired';
    user = null;
    consents = null;
    emit(event === 'SIGNED_OUT' ? 'expired' : event);
    try { onExpired({ reason: 'expired' }); } catch (e) { console.warn('[auth]', e); }
    onReload({ reason: 'expired', urgent: false, hash: '#home' });
  }
  function switchTo(reason) { settled = true; onReload({ reason, urgent: false, hash: '#home' }); }

  /**
   * Another page of this device wrote a tombstone for the account this page
   * booted into (it deleted the account, signed out removing its things, or
   * removed this phone's copy): this page's namespace is sealed at once (its
   * later writes are dropped), what it wrote before it heard is removed when
   * the copy is to go, the sync pauses, and the page reloads at the next
   * calm moment with the matching notice.
   */
  function onWipe() {
    if (mode !== 'account') return;
    const w = honourWipe(ls, bootUid, ns.wipeId);
    if (!w) return;
    for (const q of quiescers) Promise.resolve().then(() => q.pause?.()).catch(() => {});
    if (['signout', 'delete', 'device-data'].includes(intent)) return;   // this page's own flow reloads it
    if (w.reason !== 'device-data') { status = 'expired'; user = null; consents = null; }
    settled = true;
    emit(w.reason === 'device-data' ? 'wiped' : 'expired');
    onReload({ reason: WIPE_RELOAD[w.reason], urgent: false, hash: '#home' });
  }

  /**
   * Before a sign-out, a deletion or "Remove this device's data": seal the
   * account's namespace (src/auth/namespace.js: nothing more is written into
   * it from this page) and pause the opt-in sync, waiting (at most QUIESCE_MS)
   * for a sync already running to finish.
   */
  async function quiesce(uid) {
    sealAccount(uid);
    const waits = [...quiescers].map((q) => Promise.resolve().then(() => q.pause?.()).catch(() => {}));
    let timer = 0;
    await Promise.race([Promise.all(waits), new Promise((r) => { timer = setTimeout(r, QUIESCE_MS); })]);
    clearTimeout(timer);
  }
  /** A deletion that failed: the account carries on as before. */
  function unquiesce(uid) {
    unsealAccount(uid);
    for (const q of quiescers) { try { q.resume?.(); } catch { /* carry on */ } }
  }

  /** Ask the server whether this session is still real (a deleted account, a revoked session). */
  async function verify(force = false) {
    if (!enabled || mode !== 'account' || settled) return status;
    if (!force && now() - lastVerify < VERIFY_EVERY_MS) return status;
    lastVerify = now();
    try {
      const c = await ensureClient();
      const { data, error } = await c.auth.getUser();
      if (error) {
        const st = Number(error.status) || 0;
        const dead = ['user_not_found', 'session_not_found', 'bad_jwt', 'refresh_token_not_found', 'session_expired'].includes(error.code) || error.name === 'AuthSessionMissingError' || st === 401 || st === 403;
        if (dead) {
          // the account itself is gone (deleted on another device): its copy here goes too
          const gone = error.code === 'user_not_found';
          if (gone) {
            // every other page of this account on this device stops too (unless one already said so)
            if (!wipedSince(ls, bootUid, ns.wipeId)) writeWipe(ls, bootUid, 'deleted', now());
            await quiesce(bootUid);
          }
          try { await c.auth.signOut({ scope: 'local' }); } catch { /* the session is gone either way */ }
          removeSupabaseKeys(ls, config.storageKey);
          if (gone) removeAccountData(ls, bootUid);
        }
      } else if (data?.user) {
        const u = toUser(data.user);
        if (u?.id === bootUid) user = { ...user, ...u };
      }
    } catch { /* offline or the library could not load: the session stays */ }
    reconcile('verified');
    return status;
  }

  if (enabled && !passive) {
    // another tab signed in or out: the persisted session changed under us
    win.addEventListener?.('storage', (e) => {
      if (mode === 'account' && (e.key == null || e.key === wipeKey(bootUid))) onWipe();
      if (e.key == null || e.key === config.storageKey) reconcile('storage');
    });
    doc?.addEventListener?.('visibilitychange', () => {
      if (doc.visibilityState !== 'visible') return;
      reconcile('visible');
      if (mode === 'account') verify().catch(() => {});
    });
  }

  // -------------------------------------------------------------- flows --
  async function flow(name, fn) {
    if (!enabled) return fail(friendlyError({ code: 'signup_disabled' }, name));
    const before = intent;
    intent = name;
    let keep = false;
    try {
      const c = await ensureClient();
      const r = await fn(c);
      keep = !!r?.keepIntent;
      if (r) delete r.keepIntent;
      return r;
    } catch (e) {
      return fail(friendlyError(e, name));
    } finally {
      if (!keep) intent = before;
    }
  }

  function afterSignIn(session) {
    const u = toUser(session?.user);
    if (!u) return fail(friendlyError({}, 'signin'));
    pendingUid = u.id;
    settleWipe(ls, u.id, now());   // signed in here again after its copy was removed: anything left of it goes first
    const s = settleNamespace(ls, u.id, now());
    return { ok: true, signedIn: true, uid: u.id, email: u.email, needsGuestChoice: s.needsChoice, keepIntent: true };
  }

  // one cooldown per kind of email (Supabase limits each kind per address): 'signup' (sign-up and resend), 'recovery'
  const cooldownLeft = (kind = 'signup') => { const at = Number(safe(() => ss?.getItem(`${COOLDOWN_KEY}:${kind}`), 0)) || 0; return Math.max(0, at + COOLDOWN_MS - now()); };
  const startCooldown = (kind = 'signup') => safe(() => ss?.setItem(`${COOLDOWN_KEY}:${kind}`, String(now())));
  const notice = (kind) => safe(() => ss?.setItem(NOTICE_KEY, kind));

  async function liveUid(c) {
    if (mode !== 'account' || status !== 'signed-in' || settled) throw codeErr('not_signed_in');
    const { data } = await c.auth.getSession();
    const uid = data?.session?.user?.id?.toLowerCase() || null;
    if (uid !== bootUid) { reconcile('mismatch'); throw codeErr('not_signed_in'); }
    return uid;
  }
  /** Runs fn({ c, uid }) as the booted account only. */
  async function asOwner(context, fn) {
    if (!enabled) return fail(friendlyError({ code: 'not_signed_in' }, context));
    try {
      const c = await ensureClient();
      const uid = await liveUid(c);
      return await fn({ c, uid });
    } catch (e) { return fail(friendlyError(e, context)); }
  }
  const own = (rows, uid) => (Array.isArray(rows) ? rows : rows ? [rows] : []).filter((r) => r && String(r.user_id).toLowerCase() === uid);

  async function getConsents(c, uid) {
    const { data, error } = await c.from('sync_consents').select('user_id,settings_sync,settings_sync_at,settings_withdrawn_at,library_sync,library_sync_at,library_withdrawn_at').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    const r = own(data, uid)[0] || null;
    consents = {
      settings: { on: r?.settings_sync === true, at: r?.settings_sync_at || null, withdrawnAt: r?.settings_withdrawn_at || null },
      library: { on: r?.library_sync === true, at: r?.library_sync_at || null, withdrawnAt: r?.library_withdrawn_at || null },
      exists: !!r,
    };
    return consents;
  }
  async function gate(c, uid, kind) {
    const k = consents || await getConsents(c, uid);
    if (!k[kind]?.on) throw codeErr('sync_off');
  }

  /**
   * Whether `password` is this account's password: a sign-in for its email on
   * an isolated client (createIsolatedClient: its own memory, storage key and
   * lock, nothing persisted, no refresh), whose short-lived session is signed
   * out again at once with scope 'local' — never 'global', which would end the
   * person's real session on every device.
   */
  async function checkCurrentPassword(email, password, uid) {
    let iso = null, opened = false;
    try {
      iso = createIsolatedClient(await loader({ doc }), config);
      const { data, error } = await iso.auth.signInWithPassword({ email, password });
      if (error) return fail(friendlyError(error, 'current'));
      opened = !!data?.session;
      if (data?.user?.id?.toLowerCase() !== uid) return fail(friendlyError({ code: 'password_mismatch' }, 'current'));
      return { ok: true };
    } catch (e) {
      return fail(friendlyError(e, 'current'));
    } finally {
      if (opened) { try { await iso.auth.signOut({ scope: 'local' }); } catch { /* it ends with the password change, or on its own */ } }
    }
  }

  /** /auth/callback: a new password for the recovery session the link opened (and only for that account). */
  async function setRecoveryPassword(password, recoveryUid) {
    try {
      const c = await ensureClient();
      const { data } = await c.auth.getSession();
      const sid = data?.session?.user?.id?.toLowerCase() || null;
      if (!sid || !isUid(recoveryUid) || sid !== String(recoveryUid).toLowerCase()) return fail(friendlyError({ code: 'not_signed_in' }, 'password'));
      const { error } = await c.auth.updateUser({ password });
      if (error) return fail(friendlyError(error, 'password'));
      notice('password-updated');
      return { ok: true };
    } catch (e) { return fail(friendlyError(e, 'password')); }
  }

  const api = {
    get enabled() { return enabled; },
    get config() { return config; },
    get namespace() { return ns; },
    status: () => status,
    user: () => (user ? { ...user } : null),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    ensureClient,
    verify,
    reconcile,
    /** Whether the once-only "keep this device's guest things?" question is waiting. */
    get pendingGuestChoice() { const uid = pendingUid || bootUid; return !!uid && needsGuestChoice(ls, uid); },
    /** What happened before the last reload ('signed-in' | 'signed-out' | 'deleted' | 'expired' | 'verified' | 'password-updated'), once. */
    takeNotice() { const n = safe(() => ss?.getItem(NOTICE_KEY)); if (n) safe(() => ss?.removeItem(NOTICE_KEY)); return n || null; },

    async init() {
      if (!enabled || mode !== 'account') return status;
      try {
        const c = await ensureClient();
        await c.auth.getSession();   // supabase-js recovers / refreshes the persisted session here
      } catch { /* offline: stay signed in on this device */ }
      reconcile('init');
      await verify(true);
      if (status === 'signed-in') api.profile.touch().catch(() => {});
      return status;
    },

    async signUp({ email, password, name = '' } = {}) {
      const e = normEmail(email);
      const n = cleanName(name);
      const bad = checkEmail(e) || checkPassword(password) || (n.length > 40 ? friendlyError({ code: 'name_long' }) : null);
      if (bad) return fail(bad);
      return flow('signup', async (c) => {
        const { data, error } = await c.auth.signUp({ email: e, password, options: { emailRedirectTo: callbackUrl(loc), data: n ? { display_name: n } : {} } });
        if (error) {
          const f = friendlyError(error, 'signup');
          if (f.code === 'neutral_sent') { startCooldown(); return { ok: true, needsConfirmation: true, email: e }; }
          return fail(f);
        }
        if (data?.session?.user) return afterSignIn(data.session);   // email confirmation switched off (local stacks only)
        startCooldown();
        return { ok: true, needsConfirmation: true, email: e };
      });
    },

    async signIn({ email, password } = {}) {
      const e = normEmail(email);
      const bad = checkEmail(e);
      if (bad) return fail(bad);
      if (!password) return fail(friendlyError({ code: 'invalid_credentials', status: 400 }, 'signin'));
      return flow('signin', async (c) => {
        const { data, error } = await c.auth.signInWithPassword({ email: e, password });
        if (error) return fail(friendlyError(error, 'signin'));
        return afterSignIn(data?.session);
      });
    },

    /** Google (and others) later: a clean hook, no button yet. */
    async signInWithProvider(provider) {
      if (!PROVIDERS[provider]) return fail(friendlyError({ code: 'provider_disabled' }, 'signin'));
      return flow('signin', async (c) => {
        const { error } = await c.auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl(loc) } });
        return error ? fail(friendlyError(error, 'signin')) : { ok: true, redirecting: true, keepIntent: true };
      });
    },

    chooseGuestData(choice) {
      const uid = pendingUid || bootUid;
      if (!uid) return { ok: false };
      return { ok: true, ...applyGuestChoice(ls, uid, choice === 'keep' ? 'keep' : 'fresh', now()) };
    },

    /** After a sign-in (and the guest-data answer): reload into the account's namespace. */
    enter(hash = '#account') {
      intent = 'enter';
      settled = true;
      notice('signed-in');
      onReload({ reason: 'signed-in', urgent: true, hash });
    },

    async signOut({ removeLocal = false } = {}) {
      if (!enabled) return { ok: true };
      intent = 'signout';
      settled = true;
      const uid = bootUid || pendingUid;
      // removing my things: the tombstone first, so every other page of this account here stops writing too
      if (removeLocal && uid) writeWipe(ls, uid, 'signed-out', now());
      if (uid) await quiesce(uid);   // a sync in flight lands in a sealed store: nothing is written after this
      if (removeLocal && uid) removeAccountData(ls, uid);
      try { const c = await ensureClient(); await c.auth.signOut({ scope: 'local' }); } catch { /* offline: the tokens still go below */ }
      removeSupabaseKeys(ls, config.storageKey);
      if (removeLocal && uid) removeAccountData(ls, uid);   // once more, right before the reload
      consents = null; user = null; status = 'guest'; verified = null;
      notice('signed-out');
      emit('signed-out');
      onReload({ reason: 'signed-out', urgent: true, hash: '#home' });
      return { ok: true };
    },

    cooldownLeft,

    async resend({ email } = {}) {
      const e = normEmail(email);
      const bad = checkEmail(e);
      if (bad) return fail(bad);
      const wait = cooldownLeft();
      if (wait > 0) return { ok: false, error: friendlyError({ status: 429 }, 'resend'), cooldownMs: wait };
      return flow('resend', async (c) => {
        const { error } = await c.auth.resend({ type: 'signup', email: e, options: { emailRedirectTo: callbackUrl(loc) } });
        const f = error ? friendlyError(error, 'resend') : null;
        if (f && ['rate_limited', 'network', 'server'].includes(f.code)) return fail(f);
        startCooldown();
        return { ok: true, cooldownMs: COOLDOWN_MS };   // the same answer whether or not the email has an account
      });
    },

    async sendReset({ email } = {}) {
      const e = normEmail(email);
      const bad = checkEmail(e);
      if (bad) return fail(bad);
      const wait = cooldownLeft('recovery');
      if (wait > 0) return { ok: false, error: friendlyError({ status: 429 }, 'reset'), cooldownMs: wait };
      return flow('reset', async (c) => {
        const { error } = await c.auth.resetPasswordForEmail(e, { redirectTo: callbackUrl(loc) });
        const f = error ? friendlyError(error, 'reset') : null;
        if (f && ['rate_limited', 'network', 'server'].includes(f.code)) return fail(f);
        startCooldown('recovery');
        return { ok: true, cooldownMs: COOLDOWN_MS };
      });
    },

    /** Emails a new 6-digit reauthentication code to the account's address (a password change on an older session). */
    async reauthenticate() {
      const wait = cooldownLeft('reauth');
      if (wait > 0) return { ok: false, error: friendlyError({ status: 429 }, 'reauth'), cooldownMs: wait };
      return asOwner('reauth', async ({ c }) => {
        const { error } = await c.auth.reauthenticate();
        if (error) return fail(friendlyError(error, 'reauth'));
        startCooldown('reauth');
        return { ok: true, cooldownMs: COOLDOWN_MS };
      });
    },

    /**
     * Change the password, with real reauthentication for every session.
     *   { current, password }  the CURRENT password is checked first with a
     *        sign-in on an isolated client (never this page's session), then
     *        updateUser({ password }). When Supabase answers
     *        reauthentication_needed (secure password change on a session over
     *        24 hours old) the 6-digit code is emailed and the answer is
     *        { ok:false, needsCode:true, email, error } — nothing has changed yet.
     *   { current, password, nonce }  the emailed code: updateUser({ password, nonce }).
     *   /auth/callback (passive): { password, recoveryUid } — the recovery
     *        session the link just opened, and only that one.
     * A wrong current password reads "That password doesn’t match."
     */
    async updatePassword({ password, current, nonce, recoveryUid } = {}) {
      const bad = checkPassword(password);
      if (bad) return fail(bad);
      if (!enabled) return fail(friendlyError({ code: 'not_signed_in' }, 'password'));
      if (passive) return setRecoveryPassword(password, recoveryUid);
      return asOwner('password', async ({ c, uid }) => {
        const code = String(nonce ?? '').replace(/\D+/g, '');
        const { data } = await c.auth.getSession();
        const email = data?.session?.user?.email || user?.email || null;
        if (!email) return fail(friendlyError({ code: 'not_signed_in' }, 'password'));
        if (current != null && current !== '' && String(current) === String(password)) return fail(friendlyError({ code: 'same_password' }, 'password'));
        const fresh = !!verified && verified.uid === uid && now() - verified.at < VERIFIED_MS;
        if (!code || !fresh) {
          if (!current) return fail(friendlyError({ code: 'current_needed' }, 'current'));
          const ok = await checkCurrentPassword(email, String(current), uid);
          if (!ok.ok) { verified = null; return ok; }
          verified = { uid, at: now() };
        }
        const { error } = await c.auth.updateUser(code ? { password, nonce: code } : { password });
        if (error) {
          if (!code && ['reauthentication_needed', 'reauth_nonce_missing'].includes(errorCode(error))) {
            const sent = await c.auth.reauthenticate();
            if (sent.error) return fail(friendlyError(sent.error, 'reauth'));
            startCooldown('reauth');
            return { ok: false, needsCode: true, email, error: friendlyError({ code: 'reauthentication_needed' }, 'password') };
          }
          return fail(friendlyError(error, 'password'));
        }
        verified = null;
        notice('password-updated');
        return { ok: true };
      });
    },

    /**
     * Ends a session this page no longer holds (the one an email link just
     * replaced on this browser) on the server: an isolated client, scope
     * 'local', so only that one session ends. Best effort.
     */
    async endDetachedSession({ access_token: at, refresh_token: rt } = {}) {
      if (!enabled || typeof at !== 'string' || typeof rt !== 'string' || !at || !rt) return { ok: false };
      try {
        const iso = createIsolatedClient(await loader({ doc }), config);
        const { error } = await iso.auth.setSession({ access_token: at, refresh_token: rt });
        if (error) return { ok: false };
        const out = await iso.auth.signOut({ scope: 'local' });
        return { ok: !out?.error };
      } catch { return { ok: false }; }
    },

    /** Deletes the account: every row it owns and its sign-in (server), then this device's copy. */
    async deleteAccount() {
      const r = await asOwner('delete', async ({ c, uid }) => {
        intent = 'delete';
        settled = true;        // nothing drops or reloads on its own while this runs
        await quiesce(uid);    // no sync starts, one already running finishes, nothing more is written here
        const { data, error } = await c.rpc('delete_my_account');
        if (error) {
          intent = null; settled = false; unquiesce(uid);
          reconcile('check');
          return fail(friendlyError(error, 'delete'));
        }
        writeWipe(ls, uid, 'deleted', now());   // first: every other page of this account on this device stops writing too
        removeAccountData(ls, uid);
        try { await c.auth.signOut({ scope: 'local' }); } catch { /* the user no longer exists */ }
        removeSupabaseKeys(ls, config.storageKey);
        consents = null; user = null; status = 'guest'; verified = null;
        notice('deleted');
        emit('deleted');
        removeAccountData(ls, uid);   // once more, right before the reload: nothing that slipped in survives
        onReload({ reason: 'deleted', urgent: true, hash: '#home' });
        return { ok: true, deleted: data ?? null };
      });
      return r;
    },

    /** "Remove this device's data": this account's things on this device (the server copy stays). */
    async removeDeviceData() {
      if (mode !== 'account' || settled) return { ok: false };
      intent = 'device-data';
      settled = true;
      writeWipe(ls, bootUid, 'device-data', now());   // first: every other page of this account on this device stops writing too
      await quiesce(bootUid);
      const n = removeAccountData(ls, bootUid);
      safe(() => ls.setItem(`hm2:u:${bootUid}:${MARKER_KEY}`, JSON.stringify({ v: 1, createdAt: now(), guestChoice: 'cleared', choiceAt: now() })));
      notice('device-cleared');
      onReload({ reason: 'device-cleared', urgent: true, hash: '#account' });
      return { ok: true, removed: n };
    },

    /** The opt-in sync (src/auth/boot.js): paused and waited for before a sign-out or deletion. Returns an unsubscribe. */
    addQuiescer(q) { if (q && typeof q.pause === 'function') quiescers.add(q); return () => quiescers.delete(q); },

    /**
     * The guest's things on this device that this account said "Not now" to
     * at its first sign-in here: true when there are some to bring in.
     */
    get guestDataWaiting() {
      if (mode !== 'account') return false;
      const m = readMarker(ls, bootUid);
      return !!m && m.guestChoice === 'fresh' && guestHasData(ls);
    },
    /** "Bring in this phone's guest things": copies them into this account's namespace (local only), then reloads. */
    importGuestData() {
      if (mode !== 'account' || settled || sealedHere()) return { ok: false };
      const r = applyGuestChoice(ls, bootUid, 'keep', now());
      notice('guest-kept');
      settled = true;
      onReload({ reason: 'guest-kept', urgent: true, hash: '#account' });
      return { ok: true, ...r };
    },

    profile: {
      async get() {
        return asOwner('profile', async ({ c, uid }) => {
          const { data, error } = await c.from('profiles').select('user_id,display_name,home_mallow,created_at,last_seen_at,schema_version').eq('user_id', uid).maybeSingle();
          if (error) return fail(friendlyError(error, 'profile'));
          const r = own(data, uid)[0];
          return { ok: true, profile: r ? { displayName: r.display_name || '', homeMallow: S.MALLOW_IDS.includes(r.home_mallow) ? r.home_mallow : null, createdAt: r.created_at, lastSeenAt: r.last_seen_at, schemaVersion: r.schema_version } : null };
        });
      },
      async update({ displayName, homeMallow } = {}) {
        const patch = {};
        if (displayName !== undefined) { const n = cleanName(displayName); if (n.length > 40) return fail(friendlyError({ code: 'name_long' })); patch.display_name = n || null; }
        if (homeMallow !== undefined) { if (homeMallow !== null && !S.MALLOW_IDS.includes(homeMallow)) return fail(friendlyError({}, 'profile')); patch.home_mallow = homeMallow; }
        return asOwner('profile', async ({ c, uid }) => {
          const { data, error } = await c.from('profiles').update(patch).eq('user_id', uid).select('user_id').maybeSingle();
          if (error) return fail(friendlyError(error, 'profile'));
          if (!data) {   // an account made before the signup trigger: create its row (see supabase/README.md backfill)
            const ins = await c.from('profiles').insert({ user_id: uid, ...patch });
            if (ins.error) return fail(friendlyError(ins.error, 'profile'));
          }
          return { ok: true };
        });
      },
      /** created/last-seen: the server stamps the time; at most every 6 hours. */
      async touch() {
        const key = `hm2:u:${bootUid}:auth.touchedAt`;
        const last = Number(safe(() => ls.getItem(key), 0)) || 0;
        if (now() - last < TOUCH_EVERY_MS) return { ok: true, skipped: true };
        return asOwner('profile', async ({ c, uid }) => {
          const { error } = await c.from('profiles').update({ last_seen_at: new Date(now()).toISOString() }).eq('user_id', uid);
          if (error) return fail(friendlyError(error, 'profile'));
          if (!settled && !sealedHere(uid)) safe(() => ls.setItem(key, String(now())));   // never after a sign-out or deletion began (on any page here)
          return { ok: true };
        });
      },
    },

    consents: {
      /** { settings: { on, at, withdrawnAt }, library: { … } } — both off until the person turns them on. */
      async get() { return asOwner('sync', async ({ c, uid }) => ({ ok: true, consents: await getConsents(c, uid) })); },
      /**
       * kind 'settings' ("Sync my settings") or 'library' ("Keep my favourites and
       * progress with my account"). On records consent (the server stamps the time);
       * off withdraws it and the server deletes what was synced for it.
       */
      async set(kind, on) {
        if (!['settings', 'library'].includes(kind)) return fail(friendlyError({}, 'sync'));
        const col = kind === 'settings' ? 'settings_sync' : 'library_sync';
        return asOwner('sync', async ({ c, uid }) => {
          const { data, error } = await c.from('sync_consents').update({ [col]: !!on }).eq('user_id', uid).select('user_id').maybeSingle();
          if (error) return fail(friendlyError(error, 'sync'));
          if (!data) { const ins = await c.from('sync_consents').insert({ user_id: uid, [col]: !!on }); if (ins.error) return fail(friendlyError(ins.error, 'sync')); }
          consents = null;
          return { ok: true, consents: await getConsents(c, uid) };
        });
      },
    },

    sync: {
      async pushPreferences(prefsAll) {
        return asOwner('sync', async ({ c, uid }) => {
          await gate(c, uid, 'settings');
          const { data, error } = await c.from('preferences').upsert({ user_id: uid, ...S.prefsToRow(prefsAll) }, { onConflict: 'user_id' }).select('user_id,updated_at').maybeSingle();
          if (error) return fail(friendlyError(error, 'sync'));
          return { ok: true, updatedAt: own(data, uid)[0]?.updated_at || null };
        });
      },
      async pullPreferences() {
        return asOwner('sync', async ({ c, uid }) => {
          await gate(c, uid, 'settings');
          const { data, error } = await c.from('preferences').select('*').eq('user_id', uid).maybeSingle();
          if (error) return fail(friendlyError(error, 'sync'));
          const r = own(data, uid)[0];
          return { ok: true, prefs: r ? S.rowToPrefs(r) : null, updatedAt: r?.updated_at || null };
        });
      },
      async pushLibrary({ favourites, garden, progress } = {}) {
        return asOwner('sync', async ({ c, uid }) => {
          await gate(c, uid, 'library');
          if (favourites) {
            const rows = S.favouritesToRows(favourites).map((r) => ({ user_id: uid, ...r }));
            const keep = rows.map((r) => r.world_id);
            let q = c.from('favourite_worlds').delete().eq('user_id', uid);
            if (keep.length) q = q.not('world_id', 'in', `(${keep.join(',')})`);
            const del = await q;
            if (del.error) return fail(friendlyError(del.error, 'sync'));
            if (rows.length) { const up = await c.from('favourite_worlds').upsert(rows, { onConflict: 'user_id,world_id' }); if (up.error) return fail(friendlyError(up.error, 'sync')); }
          }
          if (garden) {
            const rows = S.gardenToRows(garden).map((r) => ({ user_id: uid, ...r }));
            const keep = rows.map((r) => r.skill_id);
            let q = c.from('garden_skills').delete().eq('user_id', uid);
            if (keep.length) q = q.not('skill_id', 'in', `(${keep.join(',')})`);
            const del = await q;
            if (del.error) return fail(friendlyError(del.error, 'sync'));
            if (rows.length) { const up = await c.from('garden_skills').upsert(rows, { onConflict: 'user_id,skill_id' }); if (up.error) return fail(friendlyError(up.error, 'sync')); }
          }
          if (progress !== undefined) {
            const row = progress ? S.progressToRow(progress) : null;
            const r = row ? await c.from('hushflow_progress').upsert({ user_id: uid, ...row }, { onConflict: 'user_id' }) : await c.from('hushflow_progress').delete().eq('user_id', uid);
            if (r.error) return fail(friendlyError(r.error, 'sync'));
          }
          return { ok: true };
        });
      },
      async pullLibrary() {
        return asOwner('sync', async ({ c, uid }) => {
          await gate(c, uid, 'library');
          const [f, g, p] = await Promise.all([
            c.from('favourite_worlds').select('user_id,world_id,position').eq('user_id', uid),
            c.from('garden_skills').select('user_id,skill_id,saved_at,last_practised_at,practised,from_world,mallow').eq('user_id', uid),
            c.from('hushflow_progress').select('user_id,world_id,idx,sequence,step,mallow,seed,saved_at').eq('user_id', uid).maybeSingle(),
          ]);
          const err = f.error || g.error || p.error;
          if (err) return fail(friendlyError(err, 'sync'));
          return { ok: true, favourites: S.rowsToFavourites(own(f.data, uid)), garden: S.rowsToGarden(own(g.data, uid)), progress: S.rowToProgress(own(p.data, uid)[0]) };
        });
      },
      /**
       * Brings this device and the account together, for whatever the person
       * opted into (store: app.store, prefs: app.prefs).
       *   settings  the newer side wins, by the server's own clock: the
       *             account's copy when another device changed it since this
       *             one last synced (and nothing changed here), else this
       *             device's (meta.prefsDirty is set by src/auth/autosync.js
       *             when a setting changes here). First time on a device: the
       *             account's copy, if there is one.
       *   library   favourites, Memory Garden and the Hushflow pause merged
       *             three ways against what both sides had at the last sync
       *             (sync.js mergeFavourites3 / mergeGarden3 / mergeProgress3),
       *             so a removal on either side stays removed.
       * A switch that is off forgets its bookkeeping (turning it on again
       * starts from this device). opts.quietly(fn) runs the local writes
       * (autosync uses it so its own writes are not taken for changes).
       */
      async syncNow(store, prefs, { quietly = (fn) => fn() } = {}) {
        const r = await api.consents.get();
        if (!r.ok) return r;
        const out = { ok: true, settings: false, library: false, applied: [], changed: [] };
        const meta = { ...(store.get('auth.sync', null) || {}) };
        const t = (iso) => { const v = Date.parse(iso || ''); return Number.isFinite(v) ? v : 0; };
        if (r.consents.settings.on && prefs) {
          const pulled = await api.sync.pullPreferences();
          if (!pulled.ok) return pulled;
          const serverAt = t(pulled.updatedAt), seen = Number(meta.prefsServerAt) || 0;
          if (pulled.prefs && serverAt > seen && !meta.prefsDirty) {
            quietly(() => { for (const [k, v] of Object.entries(pulled.prefs)) if (prefs.get(k) !== v) { prefs.set(k, v); out.applied.push(k); } });
            meta.prefsServerAt = serverAt;
          } else if (!pulled.prefs || meta.prefsDirty || !seen) {
            const pushed = await api.sync.pushPreferences(prefs.all());
            if (!pushed.ok) return pushed;
            meta.prefsServerAt = t(pushed.updatedAt) || serverAt || now();
            out.changed.push('preferences');
          }
          delete meta.prefsDirty;
          meta.prefsAt = now(); out.settings = true;
        } else { delete meta.prefsServerAt; delete meta.prefsDirty; delete meta.prefsAt; }
        if (r.consents.library.on) {
          const pulled = await api.sync.pullLibrary();
          if (!pulled.ok) return pulled;
          const base = meta.library && typeof meta.library === 'object' ? meta.library : null;
          const favRec = store.get(FLOW_KEYS.favourites, null);
          const localFav = favRec?.v === 1 && Array.isArray(favRec.ids) ? favRec.ids : [];
          const localGarden = store.get(GARDEN_KEY, null);
          const localProgRec = store.get(FLOW_KEYS.progress, null);
          const localProg = localProgRec?.v === 1 ? localProgRec : null;
          const favourites = S.mergeFavourites3(localFav, pulled.favourites, base?.favourites);
          const garden = S.mergeGarden3(localGarden, pulled.garden, base?.garden);
          const progress = S.mergeProgress3(localProg, pulled.progress, base?.progressAt);
          const same = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
          quietly(() => {
            if (!same(favourites, localFav)) { store.set(FLOW_KEYS.favourites, { v: 1, ids: favourites }); out.applied.push(FLOW_KEYS.favourites); }
            if (!same(S.gardenToRows(garden), S.gardenToRows(localGarden))) { store.set(GARDEN_KEY, garden); out.applied.push(GARDEN_KEY); }
            if (progress !== localProg) {
              if (progress) store.set(FLOW_KEYS.progress, progress); else store.remove(FLOW_KEYS.progress);
              out.applied.push(FLOW_KEYS.progress);
            }
          });
          const upload = {};
          if (!same(favourites, pulled.favourites)) upload.favourites = favourites;
          if (!same(S.gardenToRows(garden), S.gardenToRows(pulled.garden))) upload.garden = garden;
          if (!same(S.progressToRow(progress), S.progressToRow(pulled.progress))) upload.progress = progress;
          if (Object.keys(upload).length) {
            const pushed = await api.sync.pushLibrary(upload);
            if (!pushed.ok) return pushed;
            out.changed.push(...Object.keys(upload));
          }
          meta.library = S.libraryBase({ favourites, garden, progress });
          meta.libraryAt = now(); out.library = true;
        } else { delete meta.library; delete meta.libraryAt; }
        quietly(() => store.set('auth.sync', meta));
        return out;
      },
    },
  };
  return api;
}
