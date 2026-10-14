// Checking a person's sign-in token (a Supabase Auth access token, a JWT).
//
// Runtime-neutral: only Web Crypto, TextEncoder/TextDecoder, atob and fetch, so
// the same file runs in the Edge Function (Deno) and under Node 22 in tests.
//
// A token is trusted only when it comes from an issuer we were told about, is
// signed with that issuer's key using an algorithm that issuer is allowed, is
// meant for us (audience), is current (exp, nbf, iat with a little leeway), and
// names a signed-in person (sub, role 'authenticated'). Anything else, of any
// kind, is the same answer: 'not-signed-in' with one gentle line. The reason is
// kept on the error (`.reason`) for the server's log, never for the screen.
//
// Several issuers can be trusted at once. Today there is one: the isolated
// Hushmates Auth project. Later the main Hushmallow login can be added as a
// second issuer, and `provider` tells the database which identity this is, so
// one Hushmallow account can reach Hushmates without a second account.
//
// Keys:
//   jwks / jwksUrl   ES256 and RS256 public keys, picked by `kid`. A fetched set
//                    is cached (jwksTtlMs); an unknown kid fetches it again once
//                    (at most once per cool-down, so made-up kids can't make us
//                    fetch on every request).
//   hs256Secret      Supabase's legacy shared secret. HS256 is allowed only for
//                    an issuer that has one, and an HS256 token is only ever
//                    checked against that secret, never against public key bytes
//                    (the classic "HS256 signed with the public key" trick).

const MAX_TOKEN = 8192;                 // bytes; real access tokens are well under 2 KB
const MAX_JWKS = 65536;                 // a key set larger than this is not a key set
const REFETCH_COOLDOWN_MS = 30000;      // forced refetches (unknown kid, or a failed fetch)
const FETCH_TIMEOUT_MS = 5000;
const SEGMENT = /^[A-Za-z0-9_-]+$/;
const ASYMMETRIC = ['ES256', 'RS256'];

const encoder = new TextEncoder();
const strictDecoder = new TextDecoder('utf-8', { fatal: true });

class NotSignedIn extends Error {
  constructor(reason) {
    super('Please sign in again.');
    this.name = 'NotSignedIn';
    this.code = 'not-signed-in';
    this.reason = reason;
  }
}
const refuse = (reason) => { throw new NotSignedIn(reason); };

function base64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

function decodeJson(segment, what) {
  try {
    const value = JSON.parse(strictDecoder.decode(base64urlToBytes(segment)));
    if (!isPlainObject(value)) refuse(`${what}-not-object`);
    return value;
  } catch (e) {
    if (e instanceof NotSignedIn) throw e;
    return refuse(`${what}-malformed`);
  }
}

/** The token in an `Authorization: Bearer <token>` header, or null. */
export function bearer(header) {
  const m = /^Bearer[ ]+([A-Za-z0-9._-]+)[ ]*$/i.exec(String(header ?? ''));
  return m ? m[1] : null;
}

// A public key from a JWKS, imported for verifying only. Private fields are
// never passed on; keys for other uses, curves or algorithms are skipped.
async function importJwk(jwk) {
  if (!isPlainObject(jwk)) return null;
  if (jwk.use !== undefined && jwk.use !== 'sig') return null;
  if (jwk.key_ops !== undefined && !(Array.isArray(jwk.key_ops) && jwk.key_ops.includes('verify'))) return null;
  const kid = typeof jwk.kid === 'string' ? jwk.kid : null;
  try {
    if (jwk.kty === 'EC') {
      if (jwk.crv !== 'P-256' || (jwk.alg !== undefined && jwk.alg !== 'ES256')) return null;
      if (typeof jwk.x !== 'string' || typeof jwk.y !== 'string') return null;
      const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y },
        { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      return { kid, alg: 'ES256', key };
    }
    if (jwk.kty === 'RSA') {
      if (jwk.alg !== undefined && jwk.alg !== 'RS256') return null;
      if (typeof jwk.n !== 'string' || typeof jwk.e !== 'string') return null;
      if (base64urlToBytes(jwk.n).length < 256) return null;            // under 2048 bits: too weak
      const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
      return { kid, alg: 'RS256', key };
    }
  } catch { /* a key we can't read is a key we don't use */ }
  return null;                                                           // 'oct' and anything else: never from a JWKS
}

async function importJwks(set) {
  const keys = Array.isArray(set?.keys) ? set.keys : [];
  return (await Promise.all(keys.map(importJwk))).filter(Boolean);
}

/**
 * @param {object} o
 *   issuers        [{ iss, provider, audience = 'authenticated', jwksUrl?, jwks?, hs256Secret?, algorithms? }]
 *                  `algorithms` can narrow what an issuer may use (default: what its keys allow)
 *   fetch, now     for tests
 *   leewaySeconds  clock difference tolerated on exp, nbf and iat
 *   jwksTtlMs      how long a fetched key set is trusted before fetching again
 * @returns {{ verify(token: string): Promise<{ iss, provider, sub, email, role, sessionId, exp }> }}
 */
export function createVerifier({ issuers, fetch = globalThis.fetch, now = () => Date.now(), leewaySeconds = 30, jwksTtlMs = 600000 } = {}) {
  if (!Array.isArray(issuers) || issuers.length === 0) throw new Error('createVerifier needs at least one issuer');
  const byIss = new Map();
  for (const c of issuers) {
    if (typeof c?.iss !== 'string' || !c.iss) throw new Error('every issuer needs an iss');
    if (typeof c.provider !== 'string' || !c.provider) throw new Error(`issuer ${c.iss} needs a provider`);
    if (byIss.has(c.iss)) throw new Error(`issuer ${c.iss} is listed twice`);
    const hasKeys = Boolean(c.jwks || c.jwksUrl);
    if (c.hs256Secret !== undefined && (typeof c.hs256Secret !== 'string' || encoder.encode(c.hs256Secret).length < 32)) {
      throw new Error(`issuer ${c.iss}: the HS256 secret must be at least 32 bytes`);
    }
    if (!hasKeys && !c.hs256Secret) throw new Error(`issuer ${c.iss} has no keys (jwks, jwksUrl or hs256Secret)`);
    let allowed = [...(hasKeys ? ASYMMETRIC : []), ...(c.hs256Secret ? ['HS256'] : [])];
    if (c.algorithms !== undefined) {
      if (!Array.isArray(c.algorithms)) throw new Error(`issuer ${c.iss}: algorithms must be a list`);
      allowed = allowed.filter((a) => c.algorithms.includes(a));
    }
    if (allowed.length === 0) throw new Error(`issuer ${c.iss} allows no algorithm its keys can check`);
    byIss.set(c.iss, {
      iss: c.iss,
      provider: c.provider,
      audience: c.audience ?? 'authenticated',
      allowed: new Set(allowed),
      jwksUrl: c.jwksUrl || null,
      staticKeys: c.jwks ? importJwks(c.jwks) : Promise.resolve([]),
      hmac: c.hs256Secret
        ? crypto.subtle.importKey('raw', encoder.encode(c.hs256Secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
        : null,
      fetched: null,          // { keys, at }
      inflight: null,
      lastForcedAt: -Infinity,
      failedAt: -Infinity,
    });
  }

  async function fetchKeys(c) {
    if (!c.inflight) {
      c.inflight = (async () => {
        try {
          const res = await fetch(c.jwksUrl, { headers: { accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
          if (!res.ok) throw new Error(`jwks ${res.status}`);
          const text = await res.text();
          if (text.length > MAX_JWKS) throw new Error('jwks too large');
          c.fetched = { keys: await importJwks(JSON.parse(text)), at: now() };
        } catch {
          // keep any keys we already had: a hiccup at the issuer shouldn't sign everyone out,
          // and wait a little before asking again so a down issuer isn't asked on every request
          c.failedAt = now();
        } finally {
          c.inflight = null;
        }
      })();
    }
    return c.inflight;
  }

  async function keysFor(c, { force = false } = {}) {
    if (c.jwksUrl) {
      if (force) {
        // an unknown kid may mean the issuer rotated its keys; made-up kids get one fetch per cool-down
        if (now() - c.lastForcedAt >= REFETCH_COOLDOWN_MS) { c.lastForcedAt = now(); await fetchKeys(c); }
      } else if ((!c.fetched || now() - c.fetched.at > jwksTtlMs) && now() - c.failedAt >= REFETCH_COOLDOWN_MS) {
        await fetchKeys(c);
      }
    }
    return [...(await c.staticKeys), ...(c.fetched?.keys || [])];
  }

  function pick(keys, alg, kid) {
    const usable = keys.filter((k) => k.alg === alg);
    if (kid !== undefined) return usable.find((k) => k.kid === kid) || null;
    return usable.length === 1 ? usable[0] : null;          // no kid: only when there's no doubt which key
  }

  async function checkSignature(c, header, signingInput, signature) {
    const data = encoder.encode(signingInput);
    if (header.alg === 'HS256') {
      if (signature.length !== 32) refuse('signature');
      return crypto.subtle.verify('HMAC', await c.hmac, signature, data);
    }
    if (header.kid !== undefined && typeof header.kid !== 'string') refuse('kid');
    let key = pick(await keysFor(c), header.alg, header.kid);
    if (!key && c.jwksUrl) key = pick(await keysFor(c, { force: true }), header.alg, header.kid);
    if (!key) refuse('unknown-key');
    if (header.alg === 'ES256') {
      if (signature.length !== 64) refuse('signature');
      return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key.key, signature, data);
    }
    return crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key.key, signature, data);
  }

  async function verifyOrRefuse(token) {
    if (typeof token !== 'string' || token.length === 0) refuse('missing');
    if (token.length > MAX_TOKEN) refuse('oversize');
    const parts = token.split('.');
    if (parts.length !== 3 || !parts.every((p) => SEGMENT.test(p))) refuse('malformed');
    const [h, p, s] = parts;
    const header = decodeJson(h, 'header');
    const claims = decodeJson(p, 'payload');

    if (typeof header.alg !== 'string') refuse('alg');
    if (header.typ !== undefined && String(header.typ).toUpperCase() !== 'JWT') refuse('typ');
    if (header.crit !== undefined) refuse('crit');                    // no extensions are understood here

    // the issuer decides which keys and algorithms count, so it comes first
    const c = typeof claims.iss === 'string' ? byIss.get(claims.iss) : undefined;
    if (!c) refuse('issuer');
    if (!c.allowed.has(header.alg)) refuse('alg');

    let signature;
    try { signature = base64urlToBytes(s); } catch { refuse('malformed'); }
    if (!(await checkSignature(c, header, `${h}.${p}`, signature))) refuse('signature');

    // from here the claims are the issuer's own words
    const t = now() / 1000;
    const aud = claims.aud;
    if (!(aud === c.audience || (Array.isArray(aud) && aud.includes(c.audience)))) refuse('audience');
    if (!isNumber(claims.exp)) refuse('exp');
    if (t > claims.exp + leewaySeconds) refuse('expired');
    if (claims.nbf !== undefined && (!isNumber(claims.nbf) || claims.nbf > t + leewaySeconds)) refuse('nbf');
    if (claims.iat !== undefined && (!isNumber(claims.iat) || claims.iat > t + leewaySeconds)) refuse('iat');
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255 || /[\u0000-\u001f\u007f]/.test(claims.sub)) refuse('sub');
    if (claims.role !== 'authenticated') refuse('role');
    if (claims.is_anonymous === true) refuse('anonymous');            // Hushmates needs a proven email, not a guest

    return {
      iss: c.iss,
      provider: c.provider,
      sub: claims.sub,
      email: typeof claims.email === 'string' && claims.email ? claims.email.toLowerCase() : null,
      role: claims.role,
      sessionId: typeof claims.session_id === 'string' ? claims.session_id : null,
      exp: claims.exp,
    };
  }

  return {
    async verify(token) {
      try {
        return await verifyOrRefuse(token);
      } catch (e) {
        if (e instanceof NotSignedIn) throw e;
        throw new NotSignedIn('error');                                // anything unexpected is still just "sign in again"
      }
    },
  };
}
