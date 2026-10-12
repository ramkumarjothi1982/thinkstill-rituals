// Minimal DER / X.509 reader: just enough to verify an App Store JWS
// certificate chain with Web Crypto (Workers have no X509Certificate class).
// Parses TBS bytes, signature algorithm, signature, subject public key,
// issuer/subject names, validity and extensions. Throws on malformed input.

/**
 * @typedef {{ tag: number, start: number, end: number, headerStart: number }} Tlv
 */

/** @param {Uint8Array} b @param {number} off @returns {Tlv} */
export function readTlv(b, off) {
  if (off + 2 > b.length) throw new Error('der: truncated');
  const tag = b[off];
  if ((tag & 0x1f) === 0x1f) throw new Error('der: high tag numbers unsupported');
  let len = b[off + 1];
  let p = off + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4 || p + n > b.length) throw new Error('der: bad length');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[p + i];
    p += n;
  }
  if (p + len > b.length) throw new Error('der: length overrun');
  return { tag, start: p, end: p + len, headerStart: off };
}

/** Children of a constructed TLV. @param {Uint8Array} b @param {Tlv} t */
export function children(b, t) {
  const out = [];
  let p = t.start;
  while (p < t.end) { const c = readTlv(b, p); out.push(c); p = c.end; }
  if (p !== t.end) throw new Error('der: children overrun');
  return out;
}

/** @param {Uint8Array} b @param {Tlv} t */
export function oid(b, t) {
  if (t.tag !== 0x06) throw new Error('der: expected OID');
  const bytes = b.subarray(t.start, t.end);
  const parts = [];
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v * 128 + (bytes[i] & 0x7f);
    if (!(bytes[i] & 0x80)) { parts.push(v); v = 0; }
  }
  const first = parts.shift() ?? 0;
  const a = first < 80 ? Math.floor(first / 40) : 2;
  return [a, first - a * 40, ...parts].join('.');
}

/** @param {Uint8Array} b @param {Tlv} t */
function time(b, t) {
  const s = new TextDecoder().decode(b.subarray(t.start, t.end));
  let m;
  if (t.tag === 0x17 && (m = /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(s))) {
    const yy = Number(m[1]);
    return Date.UTC(yy < 50 ? 2000 + yy : 1900 + yy, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
  }
  if (t.tag === 0x18 && (m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(s))) {
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
  }
  throw new Error('der: bad time');
}

/** @param {Uint8Array} a @param {Uint8Array} b */
const bytesEqual = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
export { bytesEqual };

/**
 * @typedef {{
 *   der: Uint8Array, tbs: Uint8Array, sigAlg: string, signature: Uint8Array,
 *   issuer: Uint8Array, subject: Uint8Array, notBefore: number, notAfter: number,
 *   spki: Uint8Array, keyAlg: string, curve: string | null,
 *   extensions: Map<string, { critical: boolean, value: Uint8Array }>, isCA: boolean
 * }} Certificate
 */

/** @param {Uint8Array} der @returns {Certificate} */
export function parseCertificate(der) {
  const cert = readTlv(der, 0);
  if (cert.tag !== 0x30 || cert.end !== der.length) throw new Error('x509: not a certificate');
  const [tbsT, algT, sigT] = children(der, cert);
  if (!tbsT || !algT || !sigT || tbsT.tag !== 0x30 || algT.tag !== 0x30 || sigT.tag !== 0x03) throw new Error('x509: bad structure');
  const sigAlg = oid(der, children(der, algT)[0]);
  if (der[sigT.start] !== 0) throw new Error('x509: unused bits in signature');
  const signature = der.subarray(sigT.start + 1, sigT.end);

  let fields = children(der, tbsT);
  if (fields[0].tag === 0xa0) fields = fields.slice(1); // [0] version
  const [, innerAlg, issuerT, validityT, subjectT, spkiT, ...rest] = fields;
  if (!innerAlg || !spkiT) throw new Error('x509: bad tbs');
  if (oid(der, children(der, innerAlg)[0]) !== sigAlg) throw new Error('x509: algorithm mismatch');
  const [nb, na] = children(der, validityT);
  const spkiParts = children(der, spkiT);
  const algParts = children(der, spkiParts[0]);
  const keyAlg = oid(der, algParts[0]);
  const curve = algParts[1] && algParts[1].tag === 0x06 ? oid(der, algParts[1]) : null;

  /** @type {Map<string, { critical: boolean, value: Uint8Array }>} */
  const extensions = new Map();
  let isCA = false;
  const extWrap = rest.find((t) => t.tag === 0xa3);
  if (extWrap) {
    const [seq] = children(der, extWrap);
    for (const ext of children(der, seq)) {
      const parts = children(der, ext);
      const id = oid(der, parts[0]);
      let critical = false;
      let valueT = parts[1];
      if (valueT.tag === 0x01) { critical = der[valueT.start] !== 0; valueT = parts[2]; }
      if (!valueT || valueT.tag !== 0x04) throw new Error('x509: bad extension');
      const value = der.subarray(valueT.start, valueT.end);
      extensions.set(id, { critical, value });
      if (id === '2.5.29.19') {
        // BasicConstraints ::= SEQUENCE { cA BOOLEAN DEFAULT FALSE, ... }
        const bc = readTlv(value, 0);
        const inner = children(value, bc);
        isCA = !!(inner[0] && inner[0].tag === 0x01 && value[inner[0].start] !== 0);
      }
    }
  }
  return {
    der,
    tbs: der.subarray(tbsT.headerStart, tbsT.end),
    sigAlg,
    signature,
    issuer: der.subarray(issuerT.headerStart, issuerT.end),
    subject: der.subarray(subjectT.headerStart, subjectT.end),
    notBefore: time(der, nb),
    notAfter: time(der, na),
    spki: der.subarray(spkiT.headerStart, spkiT.end),
    keyAlg,
    curve,
    extensions,
    isCA,
  };
}

/**
 * DER ECDSA-Sig-Value (SEQUENCE { r INTEGER, s INTEGER }) → raw r||s, the
 * form Web Crypto verifies.
 * @param {Uint8Array} sig @param {number} size bytes per integer (32 for P-256, 48 for P-384)
 */
export function ecdsaDerToRaw(sig, size) {
  const seq = readTlv(sig, 0);
  if (seq.tag !== 0x30 || seq.end !== sig.length) throw new Error('ecdsa: bad signature');
  const [r, s] = children(sig, seq);
  if (!r || !s || r.tag !== 0x02 || s.tag !== 0x02) throw new Error('ecdsa: bad signature');
  const out = new Uint8Array(size * 2);
  for (const [i, t] of [[0, r], [1, s]]) {
    let v = sig.subarray(/** @type {Tlv} */ (t).start, /** @type {Tlv} */ (t).end);
    while (v.length > size && v[0] === 0) v = v.subarray(1);
    if (v.length > size) throw new Error('ecdsa: integer too large');
    out.set(v, /** @type {number} */ (i) * size + (size - v.length));
  }
  return out;
}
