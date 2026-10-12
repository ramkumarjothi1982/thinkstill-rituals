// StoreKit 2 signed-transaction verification (production entitlement).
//
// !! UNTESTED AGAINST REAL APP STORE RECEIPTS. !!
// The tests exercise this with a locally generated certificate chain that
// mirrors Apple's (P-384 root → P-384 intermediate with Apple's WWDR marker
// OID → P-256 leaf with Apple's receipt-signing marker OID, ES256 JWS). Before
// launch, verify a real Sandbox transaction from the app (see README,
// "Before you sell Beyond").
//
// What is checked, following Apple's App Store Server Library:
//   1. JWS header alg ES256 with an x5c chain of exactly three certificates.
//   2. The chain's root is Apple Root CA - G3, pinned by SHA-256 fingerprint.
//   3. Each certificate is signed by the next one (ECDSA, Web Crypto) and the
//      issuer/subject names chain; root and intermediate are CAs.
//   4. Marker extensions: intermediate 1.2.840.113635.100.6.2.1, leaf
//      1.2.840.113635.100.6.11.1.
//   5. Every certificate is valid at the transaction's signedDate.
//   6. The JWS signature verifies with the leaf key.
//   7. Payload: bundleId, a Beyond productId, an allowed environment, an
//      auto-renewable subscription, not revoked, not expired.

import { parseCertificate, ecdsaDerToRaw, bytesEqual } from './der.js';
import { fromB64url } from './tokens.js';

const OID = {
  ecPublicKey: '1.2.840.10045.2.1',
  p256: '1.2.840.10045.3.1.7',
  p384: '1.3.132.0.34',
  ecdsaSha256: '1.2.840.10045.4.3.2',
  ecdsaSha384: '1.2.840.10045.4.3.3',
  appleWwdrIntermediate: '1.2.840.113635.100.6.2.1',
  appleReceiptLeaf: '1.2.840.113635.100.6.11.1',
};

/** @param {string} b64 */
function fromB64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** @param {Uint8Array} der */
async function sha256Hex(der) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', der));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** @param {import('./der.js').Certificate} cert */
function curveOf(cert) {
  if (cert.keyAlg !== OID.ecPublicKey) throw new Error('not an EC key');
  if (cert.curve === OID.p256) return { name: 'P-256', size: 32 };
  if (cert.curve === OID.p384) return { name: 'P-384', size: 48 };
  throw new Error('unsupported curve');
}

/** @param {import('./der.js').Certificate} cert */
function importKey(cert) {
  return crypto.subtle.importKey('spki', cert.spki, { name: 'ECDSA', namedCurve: curveOf(cert).name }, false, ['verify']);
}

/**
 * Is `child` signed by `parent`?
 * @param {import('./der.js').Certificate} child @param {import('./der.js').Certificate} parent
 */
async function signedBy(child, parent) {
  const hash = child.sigAlg === OID.ecdsaSha256 ? 'SHA-256' : child.sigAlg === OID.ecdsaSha384 ? 'SHA-384' : null;
  if (!hash) return false;
  if (!bytesEqual(child.issuer, parent.subject)) return false;
  const raw = ecdsaDerToRaw(child.signature, curveOf(parent).size);
  return crypto.subtle.verify({ name: 'ECDSA', hash }, await importKey(parent), raw, child.tbs);
}

/**
 * @typedef {{ bundleId: string, productIds: string[], environments: string[], rootFingerprints: string[] }} StoreKitOptions
 * @typedef {{ ok: true, originalTransactionId: string, productId: string, expiresAt: number, environment: string }
 *         | { ok: false, code: string }} StoreKitResult
 */

/**
 * @param {string} jws signedTransactionInfo from StoreKit 2 (Transaction.jwsRepresentation)
 * @param {StoreKitOptions} opts
 * @param {number} now ms
 * @returns {Promise<StoreKitResult>}
 */
export async function verifySignedTransaction(jws, opts, now) {
  if (!opts.bundleId) return { ok: false, code: 'storekit_not_configured' };
  const parts = String(jws || '').split('.');
  if (parts.length !== 3) return { ok: false, code: 'malformed' };
  /** @type {any} */
  let header;
  /** @type {any} */
  let payload;
  try {
    header = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  } catch {
    return { ok: false, code: 'malformed' };
  }
  if (!header || header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length !== 3) return { ok: false, code: 'bad_header' };

  /** @type {import('./der.js').Certificate[]} */
  let chain;
  try {
    chain = header.x5c.map((c) => parseCertificate(fromB64(String(c))));
  } catch {
    return { ok: false, code: 'bad_certificate' };
  }
  const [leaf, intermediate, root] = chain;

  if (!opts.rootFingerprints.includes(await sha256Hex(root.der))) return { ok: false, code: 'untrusted_root' };
  try {
    if (!root.isCA || !intermediate.isCA) return { ok: false, code: 'bad_chain' };
    if (!(await signedBy(root, root)) || !(await signedBy(intermediate, root)) || !(await signedBy(leaf, intermediate))) return { ok: false, code: 'bad_chain' };
  } catch {
    return { ok: false, code: 'bad_chain' };
  }
  if (!intermediate.extensions.has(OID.appleWwdrIntermediate) || !leaf.extensions.has(OID.appleReceiptLeaf)) return { ok: false, code: 'missing_marker' };

  const at = Number.isFinite(payload?.signedDate) ? payload.signedDate : now;
  for (const c of chain) if (at < c.notBefore || at > c.notAfter) return { ok: false, code: 'certificate_expired' };

  // JWS signature: ES256 = ECDSA P-256 / SHA-256, raw r||s (64 bytes).
  try {
    if (curveOf(leaf).name !== 'P-256') return { ok: false, code: 'bad_signature' };
    const sig = fromB64url(parts[2]);
    if (sig.length !== 64) return { ok: false, code: 'bad_signature' };
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await importKey(leaf), sig, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return { ok: false, code: 'bad_signature' };
  } catch {
    return { ok: false, code: 'bad_signature' };
  }

  if (payload.bundleId !== opts.bundleId) return { ok: false, code: 'wrong_bundle' };
  if (!opts.productIds.includes(payload.productId)) return { ok: false, code: 'not_beyond' };
  if (!opts.environments.includes(payload.environment)) return { ok: false, code: 'wrong_environment' };
  if (payload.type !== 'Auto-Renewable Subscription') return { ok: false, code: 'not_subscription' };
  if (payload.revocationDate) return { ok: false, code: 'revoked' };
  if (!Number.isFinite(payload.expiresDate) || payload.expiresDate <= now) return { ok: false, code: 'expired' };
  if (typeof payload.originalTransactionId !== 'string' || !payload.originalTransactionId) return { ok: false, code: 'malformed' };
  return { ok: true, originalTransactionId: payload.originalTransactionId, productId: payload.productId, expiresAt: payload.expiresDate, environment: payload.environment };
}
