// Session tokens: "hm1.<base64url(JSON payload)>.<base64url(HMAC-SHA256)>".
// Issued by POST /v1/session (after the entitlement check) and sent as
// "Authorization: Bearer <token>" on POST /v1/angle. Rotation: verification
// accepts TOKEN_SIGNING_KEY and TOKEN_SIGNING_KEY_PREVIOUS; signing uses the
// first. Web Crypto only, so it runs the same in Workers and Node.

const enc = new TextEncoder();
const dec = new TextDecoder();
export const TOKEN_PREFIX = 'hm1';
export const AUDIENCE = 'another-angle';

/** @param {Uint8Array} bytes */
export function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string} s @returns {Uint8Array} */
export function fromB64url(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/** @type {Map<string, Promise<CryptoKey>>} */
const KEY_CACHE = new Map();
/** @param {string} secret */
function hmacKey(secret) {
  let p = KEY_CACHE.get(secret);
  if (!p) {
    p = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    if (KEY_CACHE.size > 8) KEY_CACHE.clear();
    KEY_CACHE.set(secret, p);
  }
  return p;
}

/**
 * Keyed hash (hex) for anything that must be stable but never stored raw
 * (IP addresses, subjects sent to the provider as an abuse-monitoring tag).
 * @param {string} secret @param {string} value @param {number} [bytes]
 */
export async function keyedHash(secret, value, bytes = 16) {
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(value)));
  return [...sig.slice(0, bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @typedef {{ v: 1, aud: string, sub: string, ent: 'beyond', src: 'testing' | 'storekit', iat: number, exp: number }} TokenPayload
 */

/**
 * @param {Omit<TokenPayload, 'v' | 'aud'>} claims
 * @param {string} secret
 */
export async function signToken(claims, secret) {
  /** @type {TokenPayload} */
  const payload = { v: 1, aud: AUDIENCE, ...claims };
  const body = `${TOKEN_PREFIX}.${b64url(enc.encode(JSON.stringify(payload)))}`;
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/**
 * @param {string} token
 * @param {string[]} secrets
 * @param {number} now ms
 * @returns {Promise<{ ok: true, payload: TokenPayload } | { ok: false, code: 'malformed' | 'bad_signature' | 'expired' | 'wrong_audience' }>}
 */
export async function verifyToken(token, secrets, now) {
  if (typeof token !== 'string' || token.length > 2048) return { ok: false, code: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX || !/^[A-Za-z0-9_-]+$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return { ok: false, code: 'malformed' };
  const body = `${parts[0]}.${parts[1]}`;
  let sig;
  try { sig = fromB64url(parts[2]); } catch { return { ok: false, code: 'malformed' }; }
  let valid = false;
  for (const secret of secrets) {
    // crypto.subtle.verify compares in constant time.
    if (await crypto.subtle.verify('HMAC', await hmacKey(secret), sig, enc.encode(body))) { valid = true; break; }
  }
  if (!valid) return { ok: false, code: 'bad_signature' };
  /** @type {any} */
  let payload;
  try { payload = JSON.parse(dec.decode(fromB64url(parts[1]))); } catch { return { ok: false, code: 'malformed' }; }
  if (!payload || payload.v !== 1 || typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return { ok: false, code: 'malformed' };
  if (payload.aud !== AUDIENCE || payload.ent !== 'beyond') return { ok: false, code: 'wrong_audience' };
  if (payload.exp <= now) return { ok: false, code: 'expired' };
  return { ok: true, payload };
}

/** Constant-time string comparison via HMAC of both sides. @param {string} a @param {string} b @param {string} key */
export async function safeEqual(a, b, key) {
  const [x, y] = await Promise.all([keyedHash(key, a, 32), keyedHash(key, b, 32)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
