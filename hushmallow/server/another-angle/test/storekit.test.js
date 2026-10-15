// StoreKit 2 JWS verification against a freshly minted chain shaped like
// Apple's (test/x509.js; no keys are stored in the repo). This proves the
// chain, marker-OID, signature and payload logic; it is NOT a test against
// real App Store receipts (see README, "Before you sell Beyond").

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, sign, X509Certificate, generateKeyPairSync } from 'node:crypto';
import { verifySignedTransaction } from '../src/auth/storekit.js';
import { parseCertificate, ecdsaDerToRaw } from '../src/auth/der.js';
import { b64url } from '../src/auth/tokens.js';
import { makeChain } from './x509.js';

const NOW = Date.now();
const chain = makeChain(NOW);
const ROOT = chain.root;
const INTER = chain.intermediate;
const LEAF = chain.leaf;
const LEAF_NOMARK = chain.leafNoMarker;
const LEAF_KEY = chain.leafKey;
const ROOT_FP = createHash('sha256').update(ROOT).digest('hex').toUpperCase();
const OPTS = { bundleId: 'com.example.hushmallow', productIds: ['hushmallow.ultra.monthly', 'hushmallow.ultra.yearly'], environments: ['Sandbox'], rootFingerprints: [ROOT_FP] };

test('the test chain is a real X.509 chain (OpenSSL, via Node, agrees)', () => {
  const root = new X509Certificate(ROOT);
  const inter = new X509Certificate(INTER);
  const leaf = new X509Certificate(LEAF);
  assert.ok(root.verify(root.publicKey));
  assert.ok(inter.verify(root.publicKey));
  assert.ok(leaf.verify(inter.publicKey));
  assert.ok(inter.ca && !leaf.ca);
  assert.ok(leaf.checkIssued(inter));
});

/** @param {Record<string, unknown>} over @param {{ chain?: Buffer[], alg?: string, key?: any }} [o] */
function jws(over = {}, o = {}) {
  const header = { alg: o.alg || 'ES256', x5c: (o.chain || [LEAF, INTER, ROOT]).map((d) => d.toString('base64')) };
  const payload = {
    transactionId: '2000000123456789', originalTransactionId: '2000000000000001', bundleId: 'com.example.hushmallow',
    productId: 'hushmallow.ultra.monthly', type: 'Auto-Renewable Subscription', environment: 'Sandbox',
    purchaseDate: NOW - 86400000, signedDate: NOW - 60000, expiresDate: NOW + 30 * 86400000, ...over,
  };
  const h = b64url(new TextEncoder().encode(JSON.stringify(header)));
  const p = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = sign('sha256', Buffer.from(`${h}.${p}`), { key: o.key || LEAF_KEY, dsaEncoding: 'ieee-p1363' });
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
}

test('a well-formed transaction from the pinned chain verifies', async () => {
  const r = await verifySignedTransaction(jws(), OPTS, NOW);
  assert.deepEqual(r, { ok: true, originalTransactionId: '2000000000000001', productId: 'hushmallow.ultra.monthly', expiresAt: NOW + 30 * 86400000, environment: 'Sandbox' });
});

test('the real Apple Root CA - G3 is pinned by default, so the test root is untrusted', async () => {
  const r = await verifySignedTransaction(jws(), { ...OPTS, rootFingerprints: ['63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179'] }, NOW);
  assert.equal(r.code, 'untrusted_root');
});

test('tampered payloads and foreign signing keys fail the signature check', async () => {
  const t = jws();
  const [h, , s] = t.split('.');
  const forged = b64url(new TextEncoder().encode(JSON.stringify({ productId: 'hushmallow.ultra.yearly', expiresDate: NOW + 1e12 })));
  assert.equal((await verifySignedTransaction(`${h}.${forged}.${s}`, OPTS, NOW)).code, 'bad_signature');
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  assert.equal((await verifySignedTransaction(jws({}, { key: privateKey }), OPTS, NOW)).code, 'bad_signature');
});

test('chain problems are caught: order, missing marker, wrong header', async () => {
  assert.equal((await verifySignedTransaction(jws({}, { chain: [INTER, LEAF, ROOT] }), OPTS, NOW)).code, 'bad_chain');
  assert.equal((await verifySignedTransaction(jws({}, { chain: [LEAF_NOMARK, INTER, ROOT] }), OPTS, NOW)).code, 'missing_marker');
  assert.equal((await verifySignedTransaction(jws({}, { chain: [LEAF, ROOT] }), OPTS, NOW)).code, 'bad_header');
  assert.equal((await verifySignedTransaction(jws({}, { alg: 'HS256' }), OPTS, NOW)).code, 'bad_header');
  assert.equal((await verifySignedTransaction('a.b.c', OPTS, NOW)).code, 'malformed');
});

test('payload rules: bundle, product, environment, type, revocation, expiry', async () => {
  const code = async (over) => (await verifySignedTransaction(jws(over), OPTS, NOW)).code;
  assert.equal(await code({ bundleId: 'com.other.app' }), 'wrong_bundle');
  assert.equal(await code({ productId: 'hushmallow.paid.monthly' }), 'not_beyond');
  assert.equal(await code({ environment: 'Production' }), 'wrong_environment');
  assert.equal(await code({ type: 'Non-Consumable' }), 'not_subscription');
  assert.equal(await code({ revocationDate: NOW - 1000 }), 'revoked');
  assert.equal(await code({ expiresDate: NOW - 1 }), 'expired');
  assert.equal(await code({ signedDate: chain.notAfter.getTime() + 1000 }), 'certificate_expired');
  assert.equal(await code({ signedDate: chain.notBefore.getTime() - 1000 }), 'certificate_expired');
  assert.equal((await verifySignedTransaction(jws(), { ...OPTS, bundleId: '' }, NOW)).code, 'storekit_not_configured');
});

test('the DER reader parses the fixture certificates', () => {
  const leaf = parseCertificate(new Uint8Array(LEAF));
  const inter = parseCertificate(new Uint8Array(INTER));
  assert.equal(leaf.curve, '1.2.840.10045.3.1.7');
  assert.equal(inter.curve, '1.3.132.0.34');
  assert.equal(leaf.sigAlg, '1.2.840.10045.4.3.3');
  assert.ok(inter.isCA);
  assert.ok(!leaf.isCA);
  assert.ok(leaf.extensions.has('1.2.840.113635.100.6.11.1'));
  assert.ok(inter.extensions.has('1.2.840.113635.100.6.2.1'));
  assert.ok(leaf.notAfter > NOW && leaf.notBefore < NOW);
  assert.throws(() => parseCertificate(new Uint8Array([0x30, 0x05, 0x01])));
});

test('ECDSA DER signatures convert to fixed-width raw form', () => {
  // SEQUENCE { INTEGER 0x00 0x80 (leading zero), INTEGER 0x01 }
  const der = new Uint8Array([0x30, 0x07, 0x02, 0x02, 0x00, 0x80, 0x02, 0x01, 0x01]);
  const raw = ecdsaDerToRaw(der, 4);
  assert.deepEqual([...raw], [0, 0, 0, 0x80, 0, 0, 0, 1]);
});
