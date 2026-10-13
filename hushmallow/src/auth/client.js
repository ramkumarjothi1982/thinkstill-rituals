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
//     signIn({ email, password })            → { ok, signedIn, uid, needsGuestChoice } | { ok:false, error }
//     chooseGuestData('keep'|'fresh')        the once-only question after a first sign-in on this device
//     enter(hash)                            reload into the signed-in account's namespace
//     signOut({ removeLocal })               local sign-out, session cleanup, reload as guest
//     resend({ email }) / sendReset({ email })  neutral answers, 60 s cooldown
//     reauthenticate() → emails a code; updatePassword({ password, nonce })
//     deleteAccount()   server rows + the auth user (delete_my_account RPC), this device's copy, reload as guest
//     removeDeviceData()  this account's things on this device only
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
// the session. Data calls always filter by the booted account's id and check
// the live session belongs to it; Row Level Security enforces the same.
//
// THE network: supabase-js is given one fetch function, netFetch below, that refuses any URL
// outside the configured project's origin. Realtime, Storage and Functions
// are never used.

import { friendlyError, checkEmail, checkPassword } from './errors.js';
import { isUid, readPersistedSession, removeAccountData, removeSupabaseKeys, settleNamespace, applyGuestChoice, needsGuestChoice, readMarker, guestHasData, MARKER_KEY } from './namespace.js';
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
  const listeners = new Set();
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
          try { await c.auth.signOut({ scope: 'local' }); } catch { /* the session is gone either way */ }
          removeSupabaseKeys(ls, config.storageKey);
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
    win.addEventListener?.('storage', (e) => { if (e.key == null || e.key === config.storageKey) reconcile('storage'); });
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
    const s = settleNamespace(ls, u.id, now());
    return { ok: true, signedIn: true, uid: u.id, needsGuestChoice: s.needsChoice, keepIntent: true };
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
      try { const c = await ensureClient(); await c.auth.signOut({ scope: 'local' }); } catch { /* offline: the tokens still go below */ }
      removeSupabaseKeys(ls, config.storageKey);
      if (removeLocal && uid) removeAccountData(ls, uid);
      consents = null; user = null; status = 'guest';
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

    /** Secure password change, step 1: email a one-time code to the account's address. */
    async reauthenticate() {
      return asOwner('reauth', async ({ c }) => {
        const { error } = await c.auth.reauthenticate();
        return error ? fail(friendlyError(error, 'reauth')) : { ok: true };
      });
    },

    /**
     * Step 2 (or the recovery link's new password): { password, nonce } where
     * nonce is the emailed code. A recovery session (from /auth/callback) needs no code.
     */
    async updatePassword({ password, nonce } = {}) {
      const bad = checkPassword(password);
      if (bad) return fail(bad);
      if (!enabled) return fail(friendlyError({ code: 'not_signed_in' }, 'password'));
      try {
        const c = await ensureClient();
        const { data } = await c.auth.getSession();
        if (!data?.session) return fail(friendlyError({ code: 'not_signed_in' }, 'password'));
        if (mode === 'account' && data.session.user?.id?.toLowerCase() !== bootUid) { reconcile('mismatch'); return fail(friendlyError({ code: 'not_signed_in' }, 'password')); }
        const attrs = { password };
        const code = String(nonce ?? '').replace(/\s+/g, '');
        if (code) attrs.nonce = code;
        const { error } = await c.auth.updateUser(attrs);
        if (error) return fail(friendlyError(error, 'password'));
        notice('password-updated');
        return { ok: true };
      } catch (e) { return fail(friendlyError(e, 'password')); }
    },

    /** Deletes the account: every row it owns and its sign-in (server), then this device's copy. */
    async deleteAccount() {
      const r = await asOwner('delete', async ({ c, uid }) => {
        intent = 'delete';
        const { data, error } = await c.rpc('delete_my_account');
        if (error) { intent = null; return fail(friendlyError(error, 'delete')); }
        settled = true;
        removeAccountData(ls, uid);
        try { await c.auth.signOut({ scope: 'local' }); } catch { /* the user no longer exists */ }
        removeSupabaseKeys(ls, config.storageKey);
        consents = null; user = null; status = 'guest';
        notice('deleted');
        emit('deleted');
        onReload({ reason: 'deleted', urgent: true, hash: '#home' });
        return { ok: true, deleted: data ?? null };
      });
      return r;
    },

    /** "Remove this device's data": this account's things on this device (the server copy stays). */
    removeDeviceData() {
      if (mode !== 'account') return { ok: false };
      const n = removeAccountData(ls, bootUid);
      safe(() => ls.setItem(`hm2:u:${bootUid}:${MARKER_KEY}`, JSON.stringify({ v: 1, createdAt: now(), guestChoice: 'cleared', choiceAt: now() })));
      notice('device-cleared');
      settled = true;
      onReload({ reason: 'device-cleared', urgent: true, hash: '#account' });
      return { ok: true, removed: n };
    },

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
      if (mode !== 'account' || settled) return { ok: false };
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
          safe(() => ls.setItem(key, String(now())));
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
