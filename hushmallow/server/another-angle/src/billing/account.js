// Who is asking: the signed-in hushmallow account behind a Supabase access
// token, checked with the sign-in project itself (GET <project>/auth/v1/user
// with the project's publishable key), never by reading the token alone.
// Only hushmallow1 is ever asked (src/config.js refuses any other project).
//
//   createAccountVerifier({ url, key, fetch, now?, ttlMs?, timeoutMs? }) →
//     verify(token) → { ok: true, uid } | { ok: false, status: 401 | 503, code }
//
// The token's own claims are read first, only to refuse what cannot be a
// live session of this project without asking it (wrong shape, expired, no
// account id, another issuer). An answer is kept in memory for ttlMs (a
// minute), never past the token's expiry, under a SHA-256 of the token (the
// token itself is not kept). Nothing here is logged.

const JWT = /^[A-Za-z0-9_-]{8,}\.([A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}$/;
const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CACHE_MAX = 1000;

/** @param {unknown} v @returns {string | null} a Supabase user id (lower case) or null */
export function uidOf(v) {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return UID.test(s) ? s : null;
}

/** @param {string} part @returns {any} */
function claimsOf(part) {
  try {
    const b = atob(part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0))));
  } catch { return null; }
}

/** @param {string} s */
async function sha256(s) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const REFUSED = /** @type {const} */ ({ ok: false, status: 401, code: 'account_required' });
const UNAVAILABLE = /** @type {const} */ ({ ok: false, status: 503, code: 'account_unavailable' });

/**
 * @param {{ url: string, key: string, fetch: typeof fetch, now?: () => number, ttlMs?: number, timeoutMs?: number }} o
 * @returns {(token: string | null) => Promise<{ ok: true, uid: string } | { ok: false, status: number, code: string }>}
 */
export function createAccountVerifier({ url, key, fetch: fetchImpl, now = Date.now, ttlMs = 60000, timeoutMs = 8000 }) {
  /** @type {Map<string, { uid: string, until: number }>} */
  const cache = new Map();
  return async function verify(token) {
    const m = typeof token === 'string' && token.length <= 4096 ? JWT.exec(token) : null;
    if (!m || !token) return REFUSED;
    const claims = claimsOf(m[1]);
    const sub = uidOf(claims?.sub);
    if (!sub || typeof claims.exp !== 'number' || claims.exp * 1000 <= now()) return REFUSED;
    if (claims.iss !== undefined && claims.iss !== `${url}/auth/v1`) return REFUSED;
    const k = await sha256(token);
    const hit = cache.get(k);
    if (hit && hit.until > now()) return { ok: true, uid: hit.uid };
    /** @type {Response} */
    let res;
    try {
      res = await fetchImpl(`${url}/auth/v1/user`, { method: 'GET', headers: { apikey: key, authorization: `Bearer ${token}`, accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
    } catch { return UNAVAILABLE; }
    if (res.status === 429 || res.status >= 500) return UNAVAILABLE;
    if (!res.ok) return REFUSED;
    /** @type {any} */
    let user = null;
    try { user = await res.json(); } catch { return UNAVAILABLE; }
    const uid = uidOf(user?.id);
    // the project's own answer decides; it must be the token's account, and a real one (not an anonymous sign-in)
    if (!uid || uid !== sub || user.is_anonymous === true) return REFUSED;
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(k, { uid, until: Math.min(now() + ttlMs, claims.exp * 1000) });
    return { ok: true, uid };
  };
}
