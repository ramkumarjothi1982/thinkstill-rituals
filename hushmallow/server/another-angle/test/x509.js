// Test-only X.509 builder: mints a fresh certificate chain shaped like
// Apple's App Store signing chain on every run, so no private key is ever
// committed and nothing expires. Output is cross-checked with Node's own
// X509Certificate parser in storekit.test.js.
//
//   root (P-384, self-signed CA) → intermediate (P-384 CA, Apple WWDR marker
//   1.2.840.113635.100.6.2.1) → leaf (P-256, receipt-signing marker
//   1.2.840.113635.100.6.11.1), all signed with ecdsa-with-SHA384.

import { generateKeyPairSync, sign } from 'node:crypto';

/** @param {number} n */
function len(n) {
  if (n < 0x80) return [n];
  const out = [];
  for (let v = n; v > 0; v >>= 8) out.unshift(v & 0xff);
  return [0x80 | out.length, ...out];
}
/** @param {number} tag @param {...(Uint8Array | number[])} parts */
function tlv(tag, ...parts) {
  const body = Buffer.concat(parts.map((p) => Buffer.from(p)));
  return Buffer.concat([Buffer.from([tag, ...len(body.length)]), body]);
}
const seq = (/** @type {Buffer[]} */ ...p) => tlv(0x30, ...p);
const set = (/** @type {Buffer[]} */ ...p) => tlv(0x31, ...p);
/** @param {string} s */
function oid(s) {
  const [a, b, ...rest] = s.split('.').map(Number);
  const bytes = [40 * a + b];
  for (const v of rest) {
    const chunk = [v & 0x7f];
    for (let x = v >>> 7; x > 0; x >>>= 7) chunk.unshift(0x80 | (x & 0x7f));
    bytes.push(...chunk);
  }
  return tlv(0x06, bytes);
}
/** @param {number} n */
const int = (n) => tlv(0x02, n < 0x80 ? [n] : [0x00, ...len(n).slice(1)]);
/** @param {Date} d */
const utc = (d) => tlv(0x17, Buffer.from(d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'));
/** @param {string} s */
const utf8 = (s) => tlv(0x0c, Buffer.from(s));
const name = (/** @type {string} */ cn) => seq(set(seq(oid('2.5.4.3'), utf8(cn))), set(seq(oid('2.5.4.10'), utf8('hushmallow tests'))));
const ECDSA_SHA384 = seq(oid('1.2.840.10045.4.3.3'));

/**
 * @param {{ subject: string, issuer: string, publicKey: import('node:crypto').KeyObject, signer: import('node:crypto').KeyObject,
 *   ca: boolean, marker?: string, serial: number, notBefore: Date, notAfter: Date }} o
 */
function certificate(o) {
  const exts = [seq(oid('2.5.29.19'), tlv(0x01, [0xff]), tlv(0x04, o.ca ? seq(tlv(0x01, [0xff])) : seq()))];
  if (o.marker) exts.push(seq(oid(o.marker), tlv(0x04, [0x05, 0x00])));
  const tbs = seq(
    tlv(0xa0, int(2)),
    int(o.serial),
    ECDSA_SHA384,
    name(o.issuer),
    seq(utc(o.notBefore), utc(o.notAfter)),
    name(o.subject),
    /** @type {Buffer} */ (o.publicKey.export({ type: 'spki', format: 'der' })),
    tlv(0xa3, seq(...exts)),
  );
  const signature = sign('sha384', tbs, { key: o.signer, dsaEncoding: 'der' });
  return seq(tbs, ECDSA_SHA384, tlv(0x03, [0x00], signature));
}

/** @param {number} [now] */
export function makeChain(now = Date.now()) {
  const notBefore = new Date(now - 86400000);
  const notAfter = new Date(now + 10 * 365 * 86400000);
  const root = generateKeyPairSync('ec', { namedCurve: 'P-384' });
  const inter = generateKeyPairSync('ec', { namedCurve: 'P-384' });
  const leaf = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const rootCert = certificate({ subject: 'Test Root CA - G3', issuer: 'Test Root CA - G3', publicKey: root.publicKey, signer: root.privateKey, ca: true, serial: 1, notBefore, notAfter });
  const interCert = certificate({ subject: 'Test WWDR', issuer: 'Test Root CA - G3', publicKey: inter.publicKey, signer: root.privateKey, ca: true, marker: '1.2.840.113635.100.6.2.1', serial: 2, notBefore, notAfter });
  const leafCert = certificate({ subject: 'Test StoreKit Signing', issuer: 'Test WWDR', publicKey: leaf.publicKey, signer: inter.privateKey, ca: false, marker: '1.2.840.113635.100.6.11.1', serial: 3, notBefore, notAfter });
  const leafNoMarker = certificate({ subject: 'Test StoreKit Signing', issuer: 'Test WWDR', publicKey: leaf.publicKey, signer: inter.privateKey, ca: false, serial: 4, notBefore, notAfter });
  return { root: rootCert, intermediate: interCert, leaf: leafCert, leafNoMarker, leafKey: leaf.privateKey, rootKey: root, notBefore, notAfter };
}
