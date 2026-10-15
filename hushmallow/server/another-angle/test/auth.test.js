import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken, keyedHash, safeEqual, b64url, fromB64url } from '../src/auth/tokens.js';
import { checkEntitlement } from '../src/auth/entitlement.js';
import { readConfig } from '../src/config.js';

const KEY = 'k'.repeat(40);
const OLD = 'o'.repeat(40);
const NOW = Date.parse('2026-10-12T10:00:00Z');
const claims = { sub: 'dev_abc', ent: /** @type {const} */ ('beyond'), src: /** @type {const} */ ('testing'), iat: NOW, exp: NOW + 3600000 };

test('tokens round-trip and carry the claims', async () => {
  const t = await signToken(claims, KEY);
  assert.match(t, /^hm1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  const r = await verifyToken(t, [KEY], NOW);
  assert.ok(r.ok);
  assert.equal(r.payload.sub, 'dev_abc');
  assert.equal(r.payload.aud, 'another-angle');
});

test('tampered, expired, wrong-key and malformed tokens are rejected', async () => {
  const t = await signToken(claims, KEY);
  const [p, body, sig] = t.split('.');
  const forged = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  forged.sub = 'dev_someone_else';
  const tampered = `${p}.${b64url(new TextEncoder().encode(JSON.stringify(forged)))}.${sig}`;
  assert.equal((await verifyToken(tampered, [KEY], NOW)).code, 'bad_signature');
  assert.equal((await verifyToken(t, [KEY], NOW + 3600001)).code, 'expired');
  assert.equal((await verifyToken(t, [OLD], NOW)).code, 'bad_signature');
  for (const bad of ['', 'abc', 'hm1.x', 'hm2.a.b', `${t}.extra`, 'hm1.@@@.' + 'a'.repeat(43), 'x'.repeat(3000)]) {
    assert.equal((await verifyToken(bad, [KEY], NOW)).ok, false, bad.slice(0, 20));
  }
});

test('key rotation: tokens signed with the previous key still verify', async () => {
  const t = await signToken(claims, OLD);
  assert.ok((await verifyToken(t, [KEY, OLD], NOW)).ok);
  assert.equal((await verifyToken(t, [KEY], NOW)).ok, false);
});

test('tokens for another audience or entitlement are rejected', async () => {
  const body = b64url(new TextEncoder().encode(JSON.stringify({ v: 1, aud: 'other', sub: 'x', ent: 'beyond', exp: NOW + 1000 })));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(`hm1.${body}`)));
  assert.equal((await verifyToken(`hm1.${body}.${b64url(sig)}`, [KEY], NOW)).code, 'wrong_audience');
});

test('keyed hashes are stable, keyed and never the raw value', async () => {
  const a = await keyedHash(KEY, 'ip:203.0.113.7');
  assert.equal(a, await keyedHash(KEY, 'ip:203.0.113.7'));
  assert.notEqual(a, await keyedHash(OLD, 'ip:203.0.113.7'));
  assert.ok(!a.includes('203'));
  assert.equal(a.length, 32);
  assert.ok(await safeEqual('MALLOW', 'MALLOW', KEY));
  assert.ok(!(await safeEqual('MALLOW', 'MALLOw', KEY)));
});

test('testing entitlement: open by default, invite code when configured', async () => {
  const open = readConfig({ TOKEN_SIGNING_KEY: KEY });
  const r = await checkEntitlement({ invite: null, signedTransaction: null }, open, NOW);
  assert.ok(r.ok);
  assert.equal(r.source, 'testing');
  assert.match(r.subject, /^dev_[0-9a-f-]{36}$/);
  assert.equal(r.expiresAt, NOW + 30 * 86400000);

  const gated = readConfig({ TOKEN_SIGNING_KEY: KEY, TESTER_INVITE_CODES: 'MALLOW-ONE, MALLOW-TWO' });
  assert.equal((await checkEntitlement({ invite: null, signedTransaction: null }, gated, NOW)).code, 'invite_required');
  assert.equal((await checkEntitlement({ invite: 'wrong', signedTransaction: null }, gated, NOW)).code, 'invite_required');
  assert.ok((await checkEntitlement({ invite: 'MALLOW-TWO', signedTransaction: null }, gated, NOW)).ok);
});

test('storekit mode requires a signed transaction and a configured bundle id', async () => {
  const cfg = readConfig({ TOKEN_SIGNING_KEY: KEY, ENTITLEMENT_MODE: 'storekit' });
  assert.equal((await checkEntitlement({ invite: null, signedTransaction: null }, cfg, NOW)).code, 'transaction_required');
  const r = await checkEntitlement({ invite: null, signedTransaction: 'a.b.c' }, cfg, NOW);
  assert.equal(r.code, 'storekit_not_configured');
  assert.equal(r.status, 503);
});

test('config: short signing keys are ignored, numbers are bounded, defaults are safe', () => {
  const c = readConfig({ TOKEN_SIGNING_KEY: 'short', DEVICE_DAILY_LIMIT: '-5', EFFORT: 'turbo', DAILY_SPEND_CAP_USD: '2.5' });
  assert.deepEqual(c.signingKeys, []);
  assert.equal(c.deviceDailyLimit, 20);
  assert.equal(c.effort, 'low');
  assert.equal(c.model, 'claude-opus-5-5');
  assert.equal(c.dailySpendCapMicros, 2500000);
  assert.equal(c.allowNoOrigin, false);
  assert.equal(c.requireHttps, true);
  assert.equal(c.refusalFallback, true);
  assert.deepEqual(c.allowedOrigins, ['https://ramkumarjothi1982.github.io']);
  assert.deepEqual(c.apple.rootFingerprints, ['63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179']);
});
