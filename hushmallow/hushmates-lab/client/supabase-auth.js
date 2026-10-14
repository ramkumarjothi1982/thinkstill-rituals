// Signing in to Hushmates: Supabase Auth's passwordless email code, with no
// library. Someone types their email, gets a 6-digit code, types it, and is in.
// Nobody chooses a username or remembers a password, and because everything
// they keep lives on the server under their account, a new device only needs
// a new code.
//   • One session per device, kept under one key ('hushmates.session'). When
//     the browser won't keep it (private mode), it lives in memory for this
//     visit only.
//   • The access token is short-lived; it is refreshed just before it runs
//     out, one refresh at a time, even across tabs where the browser can
//     coordinate them (a refresh token works only once).
//   • Every failure becomes a few warm words with a stable code; nothing the
//     server says is ever shown to a person.
// The same requests work against a real Supabase project and the local copy
// of its endpoints (server/auth-emulator.mjs).

export const SESSION_KEY = 'hushmates.session';
// Supabase reads the project's public (anon) key from this header on every call
export const KEY_HEADER = 'apikey';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFRESH_AHEAD_MS = 60e3;        // refresh when less than a minute is left
const FRESH_CODE_MS = 5 * 60e3;       // a code sent this recently can't have expired: a refusal means a typo

const WORDS = {
  network: 'You’re offline. Nothing was sent; try again when you’re back.',
  'invalid-email': 'That email doesn’t look quite right. Please check it and try again.',
  'rate-limited': 'Too many codes asked for. Please wait a little and try again.',
  'too-many-tries': 'That’s a lot of tries. Please wait a little, then ask for a new code.',
  'code-format': 'Please enter the 6-digit code from the email.',
  'code-wrong': 'That code didn’t match. Please check it, or ask for a new one.',
  'code-expired': 'That code has expired. We can send a new one.',
  captcha: 'We couldn’t check that it’s really you. Please try again.',
  'not-open': 'We can’t send a code to this email just now. Please try again later.',
  'not-signed-in': 'You’ve been signed out. Please sign in again.',
  error: 'Something went wrong on our side. Please try again in a moment.',
};

/** Every failure: our own words (`human`), and a stable `code` the app can act on. */
export const authError = (code) => Object.assign(new Error(WORDS[code] || WORDS.error), { code: WORDS[code] ? code : 'error', human: true });

/**
 * localStorage that never throws: when the browser refuses (private mode, storage full,
 * blocked), values are kept in memory for this visit instead.
 */
export function safeStorage(backing = defaultStorage()) {
  const memory = new Map();
  let usable = !!backing;
  const attempt = (fn) => {
    if (!usable) return undefined;
    try { return fn(); } catch { usable = false; return undefined; }
  };
  return {
    getItem(key) {
      const v = attempt(() => backing.getItem(key));
      if (usable) return v ?? null;
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) { memory.set(key, String(value)); attempt(() => backing.setItem(key, String(value))); },
    removeItem(key) { memory.delete(key); attempt(() => backing.removeItem(key)); },
  };
}
function defaultStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

// what is kept: only what's needed to stay signed in and to say who is signed in
function readSession(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  let s;
  try { s = JSON.parse(raw); } catch { return null; }
  const ok = s && typeof s === 'object' && typeof s.accessToken === 'string' && s.accessToken
    && typeof s.refreshToken === 'string' && s.refreshToken && Number.isFinite(s.expiresAt)
    && s.user && typeof s.user.id === 'string' && s.user.id;
  if (!ok) return null;
  return { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt, user: { id: s.user.id, email: typeof s.user.email === 'string' ? s.user.email : '' } };
}

/** The error code Supabase Auth sent, in whichever field this version uses. */
function serverCode(data) {
  if (!data || typeof data !== 'object') return '';
  for (const k of ['error_code', 'code', 'error']) if (typeof data[k] === 'string') return data[k];
  return '';
}

/**
 * @param {object} o
 *   url       the Supabase project's address ('' = this site, as on the local stack)
 *   anonKey   the project's public key (safe in a browser; it identifies the project, it opens nothing)
 *   storage   where the session is kept (default: localStorage, or memory when that fails)
 *   fetch     for tests
 *   now       for tests
 *   events    where 'storage' events arrive from other tabs (default: the window)
 *   locks     Web Locks, to keep tabs from refreshing at once (default: the browser's, when it has them)
 *   timeoutMs how long to wait for Supabase before saying we couldn't reach it
 */
export function createAuth({
  url = '', anonKey, storage, fetch: fetchImpl, now = () => Date.now(),
  events = globalThis, locks = globalThis.navigator?.locks, timeoutMs = 20e3,
} = {}) {
  if (typeof anonKey !== 'string' || !anonKey) throw new Error('createAuth needs the project’s anon key');
  const base = String(url || '').replace(/\/+$/, '');
  if (base && !/^https?:\/\/[^/]+/i.test(base)) throw new Error('createAuth: url must be an http(s) address, or empty for this site');
  const store = safeStorage(storage === undefined ? defaultStorage() : storage);
  const listeners = new Set();
  let cur = readSession(store.getItem(SESSION_KEY));
  let refreshing = null;
  let epoch = 0;                       // bumped on every sign-in and sign-out, so a late refresh can't bring a session back
  let lastSent = null;                 // { email, at } of the latest code we asked for

  const publicSession = () => (cur ? { user: { ...cur.user }, expiresAt: cur.expiresAt } : null);
  const emit = (reason) => {
    const s = publicSession();
    for (const fn of [...listeners]) { try { fn(s, reason); } catch { /* one listener's trouble isn't sign-in's */ } }
  };
  function keep(next, reason) {
    cur = next;
    if (next) store.setItem(SESSION_KEY, JSON.stringify({ v: 1, ...next }));
    else store.removeItem(SESSION_KEY);
    emit(reason);
  }
  function clear() {
    epoch += 1;
    refreshing = null;
    const had = !!cur;
    cur = null;
    store.removeItem(SESSION_KEY);
    if (had) emit('signed-out');
  }

  // another tab signed in, refreshed or signed out: follow it (a refresh changes nothing anyone sees)
  events?.addEventListener?.('storage', (e) => {
    if (e?.key !== SESSION_KEY && e?.key !== null) return;
    const next = readSession(store.getItem(SESSION_KEY));
    const before = cur?.user.id || null;
    cur = next;
    if ((next?.user.id || null) !== before) { epoch += 1; refreshing = null; emit('storage'); }
  });

  async function call(path, { body, bearer } = {}) {
    const headers = { [KEY_HEADER]: anonKey, 'content-type': 'application/json' };
    if (bearer) headers.authorization = `Bearer ${bearer}`;
    const send = fetchImpl || globalThis.fetch;
    let res;
    try {
      res = await send(`${base}/auth/v1${path}`, {
        method: 'POST', headers, body: JSON.stringify(body ?? {}), cache: 'no-store', credentials: 'omit',
        signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined,
      });
    } catch {
      return { status: 0, data: null };                              // offline, or no answer in time
    }
    let data = null;
    try { data = res.status === 204 ? {} : await res.json(); } catch { /* not JSON: judged by status alone */ }
    return { status: res.status, data };
  }

  // a session from Supabase's answer; its lifetime is counted on this device's clock, so a
  // device whose clock is wrong still refreshes on time
  function sessionFrom(data, previousUser = null) {
    if (!data || typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token) return null;
    const life = Number(data.expires_in);
    const expiresAt = Number.isFinite(life) && life > 0 ? now() + life * 1000
      : Number.isFinite(Number(data.expires_at)) ? Number(data.expires_at) * 1000 : now() + 3600e3;
    const id = typeof data.user?.id === 'string' && data.user.id ? data.user.id : previousUser?.id;
    if (!id) return null;
    const email = typeof data.user?.email === 'string' ? data.user.email : previousUser?.email || '';
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt, user: { id, email } };
  }

  function sendFailure({ status, data }) {
    if (status === 0) return authError('network');
    const code = serverCode(data);
    if (status === 429 || /rate_limit/.test(code)) return authError('rate-limited');
    if (code === 'captcha_failed') return authError('captcha');
    if (['validation_failed', 'email_address_invalid'].includes(code)) return authError('invalid-email');
    if (['otp_disabled', 'signup_disabled', 'email_provider_disabled', 'email_address_not_authorized'].includes(code)) return authError('not-open');
    return authError('error');
  }
  function verifyFailure({ status, data }, email) {
    if (status === 0) return authError('network');
    const code = serverCode(data);
    if (status === 429 || /rate_limit/.test(code)) return authError('too-many-tries');
    if (code === 'otp_invalid' || code === 'validation_failed') return authError('code-wrong');
    if (code === 'otp_expired') {
      // Supabase gives this one answer for a wrong code and an old one; a code asked for minutes ago is a typo
      const recent = lastSent && lastSent.email === email && now() - lastSent.at < FRESH_CODE_MS;
      return authError(recent ? 'code-wrong' : 'code-expired');
    }
    if (code === 'captcha_failed') return authError('captcha');
    if (['otp_disabled', 'signup_disabled', 'email_provider_disabled'].includes(code)) return authError('not-open');
    return authError('error');
  }

  const normaliseEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

  /** Ask for a code by email. A new address gets an account the moment its code is used. */
  async function sendCode(email, { captchaToken } = {}) {
    const e = normaliseEmail(email);
    if (e.length > 254 || !EMAIL.test(e)) throw authError('invalid-email');
    const body = { email: e, create_user: true };
    if (typeof captchaToken === 'string' && captchaToken) body.gotrue_meta_security = { captcha_token: captchaToken };
    const r = await call('/otp', { body });
    if (r.status < 200 || r.status >= 300) throw sendFailure(r);
    lastSent = { email: e, at: now() };
    return { email: e };
  }

  /** The code from the email → signed in. Spaces and dashes (from copying) don't matter. */
  async function verifyCode(email, code) {
    const e = normaliseEmail(email);
    if (e.length > 254 || !EMAIL.test(e)) throw authError('invalid-email');
    const token = String(code ?? '').replace(/[\s-]+/g, '');
    if (!/^\d{6,10}$/.test(token)) throw authError('code-format');
    const r = await call('/verify', { body: { type: 'email', email: e, token } });
    if (r.status < 200 || r.status >= 300) throw verifyFailure(r, e);
    const next = sessionFrom(r.data);
    if (!next) throw authError('error');
    epoch += 1;
    refreshing = null;
    lastSent = null;
    keep(next, 'signed-in');
    return publicSession();
  }

  // one refresh at a time: in this tab by sharing the promise, across tabs by a Web Lock when there is one
  async function refreshNow(forced) {
    const mine = epoch;
    const run = async () => {
      if (mine !== epoch) throw authError('not-signed-in');
      // another tab may have refreshed already: use what it kept rather than spend the old token again
      const stored = readSession(store.getItem(SESSION_KEY));
      const adopted = !!(stored && cur && stored.user.id === cur.user.id && stored.refreshToken !== cur.refreshToken);
      if (adopted) cur = stored;
      if (!cur) throw authError('not-signed-in');
      const fresh = cur.expiresAt - now() > REFRESH_AHEAD_MS;
      if (fresh && (adopted || !forced)) return cur.accessToken;
      const given = cur.refreshToken;
      const r = await call('/token?grant_type=refresh_token', { body: { refresh_token: given } });
      if (mine !== epoch) throw authError('not-signed-in');           // signed out (or in again) meanwhile
      if (r.status >= 200 && r.status < 300) {
        const next = sessionFrom(r.data, cur?.user);
        if (!next) throw authError('error');
        keep(next, 'refreshed');
        return next.accessToken;
      }
      const code = serverCode(r.data);
      const over = [400, 401, 403, 404].includes(r.status) && code !== 'invalid_api_key' && code !== 'no_api_key';
      if (over) {
        // the token may have been spent by another tab a moment ago: if it kept a newer session, that's ours too
        const again = readSession(store.getItem(SESSION_KEY));
        if (again && again.user.id === cur?.user.id && again.refreshToken !== given) { cur = again; return again.accessToken; }
        clear();
        throw authError('not-signed-in');
      }
      // a passing problem (offline, Supabase busy): the current token still works if it hasn't run out
      if (cur && cur.expiresAt - now() > 5e3) return cur.accessToken;
      throw authError(r.status === 0 ? 'network' : r.status === 429 ? 'rate-limited' : 'error');
    };
    return typeof locks?.request === 'function' ? locks.request(SESSION_KEY, run) : run();
  }
  function refresh(forced = false) {
    if (!refreshing) {
      const p = refreshNow(forced).finally(() => { if (refreshing === p) refreshing = null; });
      refreshing = p;
    }
    return refreshing;
  }

  /**
   * A working access token, or null when nobody is signed in. Refreshes when less than a minute is
   * left (or always, with `force`, after the gateway turned the current one away).
   */
  async function accessToken({ force = false } = {}) {
    if (!cur) return null;
    if (!force && cur.expiresAt - now() > REFRESH_AHEAD_MS) return cur.accessToken;
    return refresh(force);
  }

  /** Sign out on this device (other devices stay signed in): forgotten here first, then ended on the server. */
  async function signOut() {
    const token = cur ? await accessToken().catch(() => null) : null;
    clear();
    if (token) await call('/logout?scope=local', { bearer: token }).catch(() => {});
  }

  return {
    /** Who is signed in on this device: { user: { id, email }, expiresAt }, or null. Tokens stay inside. */
    session: publicSession,
    /** fn(session, reason): 'signed-in', 'refreshed', 'signed-out', or 'storage' (another tab changed who is signed in). */
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    sendCode,
    verifyCode,
    accessToken,
    signOut,
    /** Clear this device's session without asking the server (the account is already gone). */
    forget: clear,
  };
}
