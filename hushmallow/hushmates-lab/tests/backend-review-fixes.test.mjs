// Regression tests for what the independent review of sign-in found (each failed before its fix).

import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, randomBytes } from 'node:crypto';
import { createVerifier } from '../supabase/functions/_shared/jwt.js';
import { createFieldCrypt } from '../supabase/functions/_shared/fieldcrypt.js';

const { subtle } = webcrypto;
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
async function ecKey(kid) {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await subtle.exportKey('jwk', pair.publicKey);
  return { kid, privateKey: pair.privateKey, jwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, kid, alg: 'ES256', use: 'sig' } };
}
async function sign(k, claims) {
  const input = `${b64({ alg: 'ES256', kid: k.kid, typ: 'JWT' })}.${b64(claims)}`;
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k.privateKey, Buffer.from(input));
  return `${input}.${Buffer.from(sig).toString('base64url')}`;
}
const iss = 'https://abcdefgh.supabase.co/auth/v1';
const T = Date.UTC(2026, 9, 14, 9);
const claims = { iss, sub: 'u1', aud: 'authenticated', role: 'authenticated', exp: Math.floor(T / 1000) + 3600, iat: Math.floor(T / 1000) };
const outcome = (v, t) => v.verify(t).then(() => 'ok', (e) => `refused (${e.reason})`);

test('sign-in keys: one failed fetch at a cold start doesn’t refuse valid sign-ins for the next 30 seconds', async () => {
  const a = await ecKey('a');
  const clock = { t: T };
  let up = false;
  const fetch = async () => { if (!up) throw new Error('ECONNRESET'); return new Response(JSON.stringify({ keys: [a.jwk] })); };
  const v = createVerifier({ issuers: [{ iss, provider: 'hushmates', jwksUrl: `${iss}/.well-known/jwks.json` }], fetch, now: () => clock.t });
  const token = await sign(a, claims);
  assert.match(await outcome(v, token), /refused/, 'a token verified with no keys at all');
  up = true;
  clock.t = T + 1000;
  assert.equal(await outcome(v, token), 'ok', 'people were refused (and signed out) while the issuer was back');
});

test('sign-in keys: requests arriving together after a key rotation all wait for the one fetch', async () => {
  const a = await ecKey('a');
  const b = await ecKey('b');
  let served = { keys: [a.jwk] };
  let calls = 0;
  const fetch = async () => { calls += 1; await new Promise((r) => setTimeout(r, 50)); return new Response(JSON.stringify(served)); };
  const v = createVerifier({ issuers: [{ iss, provider: 'hushmates', jwksUrl: `${iss}/.well-known/jwks.json` }], fetch, now: () => T });
  assert.equal(await outcome(v, await sign(a, claims)), 'ok');
  served = { keys: [a.jwk, b.jwk] };
  const tokenB = await sign(b, claims);
  const results = await Promise.all(Array.from({ length: 5 }, () => outcome(v, tokenB)));
  assert.deepEqual(results, Array(5).fill('ok'));
  assert.equal(calls, 2, 'each request fetched the keys on its own');
});

test('field encryption: a key id that isn’t text is refused up front, not on the first feeling', async () => {
  const keys = { 1: randomBytes(32).toString('base64') };
  await assert.rejects(createFieldCrypt({ keys, current: 1, macKey: randomBytes(32).toString('base64') }), /current key id/);
});
