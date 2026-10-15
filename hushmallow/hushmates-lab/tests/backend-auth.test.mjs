// Sign-in tokens, field encryption, and the local copy of Supabase Auth.
//
// The emulator runs over real HTTP against a real (throwaway) Postgres
// database, the same way the dev stack runs it. The verifier is tested against
// the emulator's own tokens, and against forged ones made with every trick we
// know: a changed signature or payload, another issuer, another audience,
// expired, not yet valid, alg none, HS256 signed with the public key, no
// subject, the wrong role, oversize, and plain garbage. Each must come back as
// the same "please sign in again" and nothing else.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHash, createHmac, randomBytes, webcrypto } from 'node:crypto';
import pg from 'pg';
import { createAuthEmulator } from '../server/auth-emulator.mjs';
import { createVerifier, bearer } from '../supabase/functions/_shared/jwt.js';
import { createFieldCrypt, isEncrypted } from '../supabase/functions/_shared/fieldcrypt.js';

const { subtle } = webcrypto;
const PG_URL = process.env.HUSHMATES_TEST_PG || 'postgres://postgres@127.0.0.1:54329';
const ANON = 'anon-key-for-these-tests-only';
const SERVICE = 'service-key-for-these-tests-only';
const quiet = { log() {}, info() {}, warn() {}, error() {} };

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const part = (token, i) => JSON.parse(Buffer.from(token.split('.')[i], 'base64url').toString('utf8'));
const headerOf = (token) => part(token, 0);
const claimsOf = (token) => part(token, 1);
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

async function signES256(privateKey, header, claims) {
  const input = `${b64(header)}.${b64(claims)}`;
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, Buffer.from(input));
  return `${input}.${Buffer.from(sig).toString('base64url')}`;
}
async function signRS256(privateKey, header, claims) {
  const input = `${b64(header)}.${b64(claims)}`;
  const sig = await subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, privateKey, Buffer.from(input));
  return `${input}.${Buffer.from(sig).toString('base64url')}`;
}
function signHS256(secret, header, claims) {
  const input = `${b64(header)}.${b64(claims)}`;
  return `${input}.${createHmac('sha256', secret).update(input).digest('base64url')}`;
}

// every refusal looks the same from outside; `reason` (server log only) says which check caught it
async function refused(verifier, token, reason) {
  await assert.rejects(verifier.verify(token), (e) => {
    assert.equal(e.code, 'not-signed-in');
    assert.equal(e.message, 'Please sign in again.');
    if (reason) assert.equal(e.reason, reason, `expected the ${reason} check to refuse it, got ${e.reason}`);
    return true;
  });
}

async function rsaKey(kid) {
  const pair = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await subtle.exportKey('jwk', pair.publicKey);
  return { kid, privateKey: pair.privateKey, jwk: { kty: 'RSA', n: jwk.n, e: jwk.e, kid, alg: 'RS256', use: 'sig' } };
}
async function ecKey(kid) {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await subtle.exportKey('jwk', pair.publicKey);
  return { kid, privateKey: pair.privateKey, jwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, kid, alg: 'ES256', use: 'sig' } };
}

// pool.end() resolves before its connections have really closed; dropping the
// database then would cut a live connection, so wait for each one to go
async function endPool(pool) {
  const open = pool.totalCount;
  let gone = 0;
  const closed = new Promise((resolve) => {
    if (open === 0) resolve();
    pool.on('remove', () => { if (++gone >= open) resolve(); });
  });
  await pool.end();
  await closed;
}

// ======================================================= the emulator ==

describe('the local copy of Supabase Auth', () => {
  const DB = `hm_test_auth_${randomBytes(6).toString('hex')}`;
  const clock = { t: Date.UTC(2026, 9, 14, 9) };
  let admin, pool, server, base, issuer, emu;
  let n = 0;
  const someone = () => `person-${++n}@example.test`;

  before(async () => {
    admin = new pg.Client({ connectionString: `${PG_URL}/postgres` });
    await admin.connect();
    await admin.query(`create database ${DB}`);
    pool = new pg.Pool({ connectionString: `${PG_URL}/${DB}`, max: 10 });
    server = http.createServer(async (req, res) => {
      const { pathname } = new URL(req.url, 'http://local');
      if (!(await emu.handle(req, res, pathname))) { res.writeHead(418); res.end('not auth'); }
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${server.address().port}`;
    issuer = `${base}/auth/v1`;
    emu = await createAuthEmulator({ pool, issuer, serviceKey: SERVICE, anonKey: ANON, now: () => clock.t, log: quiet });
  });
  after(async () => {
    emu?.close();
    await new Promise((r) => (server ? server.close(r) : r()));
    if (pool) await endPool(pool);
    if (admin) {
      await admin.query(`drop database if exists ${DB} with (force)`);
      await admin.end();
    }
  });

  async function call(path, { method = 'POST', body, key = ANON, token, headers = {} } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(key ? { apikey: key } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
  }
  const askCode = (email, extra = {}) => call('/auth/v1/otp', { body: { email, create_user: true, ...extra } });
  const verify = (email, token) => call('/auth/v1/verify', { body: { type: 'email', email, token } });
  const refresh = (refreshToken) => call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: refreshToken } });
  const whoAmI = (token) => call('/auth/v1/user', { method: 'GET', token });
  async function signIn(email) {
    assert.equal((await askCode(email)).status, 200);
    const res = await verify(email, emu.mailbox(email));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body;
  }
  const wrongCode = (code) => String((Number(code) + 1) % 1000000).padStart(6, '0');
  const tokenVerifier = (o = {}) => createVerifier({
    issuers: [{ iss: issuer, provider: 'hushmates', audience: 'authenticated', jwksUrl: `${issuer}/.well-known/jwks.json` }],
    now: () => clock.t, ...o,
  });
  async function emulatorKey() {
    const { rows: [row] } = await pool.query('select kid, private_jwk from auth.emulator_keys');
    const { kty, crv, x, y, d } = row.private_jwk;
    return { kid: row.kid, privateKey: await subtle.importKey('jwk', { kty, crv, x, y, d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']) };
  }

  test('an email code signs a person in, with answers shaped like Supabase Auth', async () => {
    const email = someone();
    const sent = await askCode(email);
    assert.equal(sent.status, 200);
    assert.deepEqual(sent.body, {});
    const code = emu.mailbox(email);
    assert.match(code, /^\d{6}$/);

    const res = await verify(email, code);
    assert.equal(res.status, 200);
    const s = res.body;
    assert.equal(s.token_type, 'bearer');
    assert.equal(s.expires_in, 3600);
    assert.equal(s.expires_at, Math.floor(clock.t / 1000) + 3600);
    assert.equal(typeof s.refresh_token, 'string');
    assert.ok(s.refresh_token.length >= 32);
    assert.match(s.user.id, /^[0-9a-f-]{36}$/);
    assert.equal(s.user.email, email);
    assert.equal(res.headers.get('cache-control'), 'no-store');

    const h = headerOf(s.access_token);
    assert.deepEqual(h, { alg: 'ES256', kid: emu.jwks.keys[0].kid, typ: 'JWT' });
    const c = claimsOf(s.access_token);
    assert.equal(c.iss, issuer);
    assert.equal(c.sub, s.user.id);
    assert.equal(c.aud, 'authenticated');
    assert.equal(c.role, 'authenticated');
    assert.equal(c.email, email);
    assert.equal(c.exp - c.iat, 3600);
    assert.equal(c.aal, 'aal1');
    assert.match(c.session_id, /^[0-9a-f-]{36}$/);
    assert.deepEqual(c.amr, [{ method: 'otp', timestamp: Math.floor(clock.t / 1000) }]);

    const me = await whoAmI(s.access_token);
    assert.equal(me.status, 200);
    assert.equal(me.body.id, s.user.id);
    assert.equal(me.body.email, email);
  });

  test('the same email on a new device is the same person (no username, no password)', async () => {
    const email = someone();
    const phone = await signIn(email);
    const laptop = await signIn(email.toUpperCase());                              // any capitalisation
    assert.equal(laptop.user.id, phone.user.id);
    assert.notEqual(claimsOf(laptop.access_token).session_id, claimsOf(phone.access_token).session_id);
    assert.equal((await whoAmI(phone.access_token)).status, 200, 'signing in elsewhere leaves the first device signed in');
  });

  test('only hashes of codes and refresh tokens are stored', async () => {
    const email = someone();
    await askCode(email);
    const code = emu.mailbox(email);
    const { rows: [row] } = await pool.query('select * from auth.otp_codes where email = $1 and used_at is null', [email]);
    assert.ok(!Object.values(row).some((v) => String(v) === code), 'the code itself is not in the database');
    assert.match(row.code_hash, /^[0-9a-f]{64}$/);
    assert.notEqual(row.code_hash, sha256(code), 'not a bare hash of six digits either (they would be trivial to reverse)');
    const s = (await verify(email, code)).body;
    const { rows } = await pool.query('select token_hash from auth.refresh_tokens where user_id = $1', [s.user.id]);
    assert.deepEqual(rows.map((r) => r.token_hash), [sha256(s.refresh_token)]);
  });

  test('every request needs the API key (except the public signing keys)', async () => {
    const none = await call('/auth/v1/otp', { body: { email: someone() }, key: null });
    assert.equal(none.status, 401);
    assert.equal(none.body.code, 'no_api_key');
    const wrong = await call('/auth/v1/otp', { body: { email: someone() }, key: 'not-the-right-key-at-all' });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.code, 'invalid_api_key');
    assert.equal((await call('/auth/v1/otp', { body: { email: someone() }, key: SERVICE })).status, 200);
    const keys = await call('/auth/v1/.well-known/jwks.json', { method: 'GET', key: null });
    assert.equal(keys.status, 200);
    assert.deepEqual(keys.body, emu.jwks);
    const [k] = keys.body.keys;
    assert.equal(keys.body.keys.length, 1);
    assert.equal(k.kty, 'EC');
    assert.equal(k.crv, 'P-256');
    assert.equal(k.alg, 'ES256');
    assert.equal(k.use, 'sig');
    assert.ok(k.kid);
    assert.equal(k.d, undefined, 'no private part');
  });

  test('a wrong code counts, and five wrong tries use the code up', async () => {
    const email = someone();
    await askCode(email);
    const code = emu.mailbox(email);
    for (let i = 0; i < 5; i++) {
      const res = await verify(email, wrongCode(code));
      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'otp_invalid');
      assert.equal(res.body.error_code, 'otp_invalid');
      assert.equal(typeof res.body.msg, 'string');
    }
    const late = await verify(email, code);
    assert.equal(late.status, 403);
    assert.equal(late.body.code, 'otp_expired', 'the right code no longer works after five wrong ones');
    // a new code works again
    await askCode(email);
    assert.equal((await verify(email, emu.mailbox(email))).status, 200);
  });

  test('codes expire, work once, and only the newest one works', async () => {
    const email = someone();
    await askCode(email);
    const first = emu.mailbox(email);
    clock.t += 600000 + 1000;
    const old = await verify(email, first);
    assert.equal(old.status, 403);
    assert.equal(old.body.code, 'otp_expired');

    await askCode(email);
    const a = emu.mailbox(email);
    await askCode(email);
    const b = emu.mailbox(email);
    if (a !== b) assert.equal((await verify(email, a)).body.code, 'otp_invalid', 'an older code is replaced by a newer one');
    assert.equal((await verify(email, b)).status, 200);
    const again = await verify(email, b);
    assert.equal(again.status, 403);
    assert.equal(again.body.code, 'otp_expired', 'a code works once');
  });

  test('racing sign-ins with one code: exactly one wins', async () => {
    const email = someone();
    await askCode(email);
    const code = emu.mailbox(email);
    const results = await Promise.all(Array.from({ length: 6 }, () => verify(email, code)));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.ok(results.filter((r) => r.status !== 200).every((r) => r.body.code === 'otp_expired'));
  });

  test('at most five codes per email per hour', async () => {
    const email = someone();
    for (let i = 0; i < 5; i++) assert.equal((await askCode(email)).status, 200);
    const sixth = await askCode(email);
    assert.equal(sixth.status, 429);
    assert.equal(sixth.body.code, 'over_email_send_rate_limit');
    assert.equal((await askCode(someone())).status, 200, 'other people are not held up');
    clock.t += 3600e3 + 1000;
    assert.equal((await askCode(email)).status, 200, 'an hour later it works again');
  });

  test('bad requests get plain error codes', async () => {
    const badEmail = await askCode('not an email');
    assert.equal(badEmail.status, 400);
    assert.equal(badEmail.body.code, 'validation_failed');
    const phone = await call('/auth/v1/otp', { body: { phone: '+61400000000' } });
    assert.equal(phone.status, 400);
    const sms = await call('/auth/v1/verify', { body: { type: 'sms', email: someone(), token: '123456' } });
    assert.equal(sms.status, 400);
    assert.equal(sms.body.code, 'validation_failed');
    const json = await call('/auth/v1/otp', { body: '{not json' });
    assert.equal(json.status, 400);
    assert.equal(json.body.code, 'bad_json');
    const big = await call('/auth/v1/otp', { body: { email: someone(), pad: 'x'.repeat(20000) } });
    assert.equal(big.status, 413);
    const nothing = await verify(someone(), '123456');
    assert.equal(nothing.status, 403);
    assert.equal(nothing.body.code, 'otp_expired', 'no code was ever sent');
    assert.equal((await call('/auth/v1/nowhere', { method: 'GET' })).status, 404);
    assert.equal((await call('/auth/v1/otp', { method: 'GET' })).status, 405);
    const elsewhere = await fetch(`${base}/functions/v1/hushmates/health`);
    assert.equal(elsewhere.status, 418, 'paths outside /auth/v1 are left to the caller');
  });

  test('create_user false never makes an account', async () => {
    const stranger = await askCode(someone(), { create_user: false });
    assert.equal(stranger.status, 422);
    assert.equal(stranger.body.code, 'otp_disabled');
    const email = someone();
    await signIn(email);
    assert.equal((await askCode(email, { create_user: false })).status, 200);
  });

  test('refreshing swaps the token; using an old one again ends the session', async () => {
    const s = await signIn(someone());
    const authAt = claimsOf(s.access_token).amr[0].timestamp;
    clock.t += 60000;
    const r1 = await refresh(s.refresh_token);
    assert.equal(r1.status, 200);
    assert.notEqual(r1.body.refresh_token, s.refresh_token);
    assert.equal(r1.body.user.id, s.user.id);
    assert.equal(claimsOf(r1.body.access_token).session_id, claimsOf(s.access_token).session_id);
    assert.equal(claimsOf(r1.body.access_token).amr[0].timestamp, authAt, 'when they proved their email is unchanged');
    assert.equal(r1.body.expires_at, Math.floor(clock.t / 1000) + 3600);
    const r2 = await refresh(r1.body.refresh_token);
    assert.equal(r2.status, 200);

    // the first token comes back: someone may have copied it, so the session ends for everyone
    const reused = await refresh(s.refresh_token);
    assert.equal(reused.status, 400);
    assert.equal(reused.body.code, 'refresh_token_already_used');
    assert.equal((await refresh(r2.body.refresh_token)).body.code, 'refresh_token_not_found', 'the newest token died with the session');
    const gone = await whoAmI(r2.body.access_token);
    assert.equal(gone.status, 403);
    assert.equal(gone.body.code, 'session_not_found');

    assert.equal((await refresh('made-up-token')).body.code, 'refresh_token_not_found');
    assert.equal((await refresh('')).status, 400);
    assert.equal((await call('/auth/v1/token?grant_type=password', { body: { email: 'a@b.c', password: 'x' } })).status, 400);
  });

  test('two refreshes racing with one token: one wins, and the session ends (strict reuse rule)', async () => {
    const s = await signIn(someone());
    const results = await Promise.all([refresh(s.refresh_token), refresh(s.refresh_token)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    const winner = results.find((r) => r.status === 200).body;
    assert.equal((await refresh(winner.refresh_token)).status, 400);
  });

  test('signing out: this device, other devices, or every device', async () => {
    const email = someone();
    const a = await signIn(email);
    const b = await signIn(email);
    const c = await signIn(email);
    const d = await signIn(email);

    assert.equal((await call('/auth/v1/logout?scope=local', { token: a.access_token })).status, 204);
    assert.equal((await whoAmI(a.access_token)).status, 403);
    assert.equal((await refresh(a.refresh_token)).status, 400, 'its refresh tokens are revoked');
    assert.equal((await whoAmI(b.access_token)).status, 200, 'other devices stay signed in');

    assert.equal((await call('/auth/v1/logout?scope=others', { token: b.access_token })).status, 204);
    assert.equal((await whoAmI(b.access_token)).status, 200);
    assert.equal((await whoAmI(c.access_token)).status, 403);
    assert.equal((await refresh(c.refresh_token)).status, 400);

    const e = await signIn(email);
    assert.equal((await call('/auth/v1/logout', { token: e.access_token })).status, 204, 'no scope: every device, as on Supabase');
    for (const s of [b, d, e]) assert.equal((await whoAmI(s.access_token)).status, 403);

    assert.equal((await call('/auth/v1/logout')).status, 401);
    assert.equal((await call('/auth/v1/logout', { token: 'garbage' })).body.code, 'bad_jwt');
    assert.equal((await call('/auth/v1/logout?scope=everything', { token: e.access_token })).status, 400);
    assert.equal((await call('/auth/v1/logout', { token: e.access_token })).status, 403, 'an ended session can’t sign anyone out');
  });

  test('"who am I" needs a real, current token for a live session', async () => {
    const s = await signIn(someone());
    assert.equal((await whoAmI()).status, 401);
    assert.equal((await whoAmI('not.a.token')).status, 403);
    const sig = s.access_token.split('.');
    const forged = `${sig[0]}.${b64({ ...claimsOf(s.access_token), sub: randomBytes(16).toString('hex') })}.${sig[2]}`;
    assert.equal((await whoAmI(forged)).body.code, 'bad_jwt');
    const saved = clock.t;
    clock.t += 3601e3 + 31e3;
    assert.equal((await whoAmI(s.access_token)).body.code, 'bad_jwt', 'expired');
    clock.t = saved;
  });

  test('any page may call it, as Supabase answers (CORS), and the admin API makes users and codes without email', async () => {
    const pre = await fetch(`${base}/auth/v1/otp`, { method: 'OPTIONS', headers: { origin: 'https://site.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'apikey, content-type' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), '*');
    assert.match(pre.headers.get('access-control-allow-headers'), /apikey/);
    assert.equal((await call('/auth/v1/user', { method: 'GET' })).headers.get('access-control-allow-origin'), '*');
    const email = someone();
    assert.equal((await call('/auth/v1/admin/users', { body: { email, email_confirm: true } })).status, 401, 'made a user without the service key');
    const made = await call('/auth/v1/admin/users', { key: SERVICE, token: SERVICE, body: { email, email_confirm: true } });
    assert.equal(made.status, 200);
    assert.equal((await call('/auth/v1/admin/users', { key: SERVICE, token: SERVICE, body: { email, email_confirm: true } })).status, 422);
    assert.equal((await call('/auth/v1/admin/users', { key: SERVICE, token: SERVICE, body: { email: someone(), password: 'x', email_confirm: true } })).status, 400, 'a password account');
    assert.equal((await call(`/auth/v1/admin/users/${made.body.id}`, { method: 'GET', key: SERVICE, token: SERVICE })).body.email, email);
    const link = await call('/auth/v1/admin/generate_link', { key: SERVICE, token: SERVICE, body: { type: 'magiclink', email } });
    assert.match(link.body.email_otp, /^\d{6}$/);
    assert.equal(emu.mailbox(email), null, 'a generated code was "emailed"');
    const s = await call('/auth/v1/verify', { body: { type: 'email', email, token: link.body.email_otp } });
    assert.equal(s.status, 200);
    assert.equal(s.body.user.id, made.body.id);
  });

  test('only the service key deletes a user, and everything of theirs goes with them', async () => {
    const email = someone();
    const s = await signIn(email);
    const path = `/auth/v1/admin/users/${s.user.id}`;
    assert.equal((await call(path, { method: 'DELETE' })).status, 401);
    const anon = await call(path, { method: 'DELETE', token: ANON });
    assert.equal(anon.status, 403);
    assert.equal(anon.body.code, 'not_admin');
    assert.equal((await call(path, { method: 'DELETE', token: s.access_token })).status, 403, 'a person’s own token is not the service key');

    const done = await call(path, { method: 'DELETE', key: SERVICE, token: SERVICE });
    assert.equal(done.status, 200);
    const { rows: [counts] } = await pool.query(
      `select (select count(*) from auth.users where id = $1)::int as users,
              (select count(*) from auth.sessions where user_id = $1)::int as sessions,
              (select count(*) from auth.refresh_tokens where user_id = $1)::int as tokens,
              (select count(*) from auth.otp_codes where email = $2)::int as codes`, [s.user.id, email]);
    assert.deepEqual(counts, { users: 0, sessions: 0, tokens: 0, codes: 0 });
    assert.equal(emu.mailbox(email), null);
    assert.equal((await whoAmI(s.access_token)).status, 403);
    assert.equal((await refresh(s.refresh_token)).status, 400);
    assert.equal((await call(path, { method: 'DELETE', token: SERVICE })).status, 404);
    assert.equal((await call('/auth/v1/admin/users/not-a-uuid', { method: 'DELETE', token: SERVICE })).status, 404);
    assert.equal((await call('/auth/v1/admin/users/%E0%A4%A', { method: 'DELETE', token: SERVICE })).status, 404);

    const fresh = await signIn(email);
    assert.notEqual(fresh.user.id, s.user.id, 'coming back after deletion is a new account');
  });

  test('the signing key survives a restart, and emulators starting together share one key', async () => {
    const s = await signIn(someone());
    const [again, twin] = await Promise.all([
      createAuthEmulator({ pool, issuer, serviceKey: SERVICE, anonKey: ANON, now: () => clock.t, log: quiet }),
      createAuthEmulator({ pool, issuer, serviceKey: SERVICE, anonKey: ANON, now: () => clock.t, log: quiet }),
    ]);
    assert.deepEqual(again.jwks, emu.jwks);
    assert.deepEqual(twin.jwks, emu.jwks);
    assert.equal((await pool.query('select count(*)::int as n from auth.emulator_keys')).rows[0].n, 1);
    const who = await tokenVerifier().verify(s.access_token);
    assert.equal(who.sub, s.user.id);
    again.close();
    twin.close();
  });

  test('the emulator refuses to be anything but local', async () => {
    const o = { pool, serviceKey: SERVICE, anonKey: ANON, log: quiet };
    await assert.rejects(createAuthEmulator({ ...o, issuer: 'https://abcdefgh.supabase.co/auth/v1' }), /local/);
    await assert.rejects(createAuthEmulator({ ...o, issuer: 'http://10.0.0.5:8090/auth/v1' }), /local/);
    await assert.rejects(createAuthEmulator({ ...o, issuer: `${issuer}/` }), /auth\/v1/);
    await assert.rejects(createAuthEmulator({ ...o, issuer, serviceKey: 'short' }), /16/);
    await assert.rejects(createAuthEmulator({ ...o, issuer, anonKey: '' }), /anonKey/);   // public by design: present is enough
    await assert.rejects(createAuthEmulator({ ...o, issuer, anonKey: SERVICE }), /differ/);
    await assert.rejects(createAuthEmulator({ ...o, issuer, pool: null }), /Pool/);
  });

  test('the emulation schema can be applied again and keeps everything locked away from browsers', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync(new URL('../supabase/local/auth-emulation.sql', import.meta.url), 'utf8');
    await pool.query(sql);
    await pool.query(sql);
    const { rows: roles } = await pool.query(`select rolname, rolcanlogin from pg_roles where rolname in ('anon', 'authenticated', 'service_role') order by 1`);
    assert.deepEqual(roles, [
      { rolname: 'anon', rolcanlogin: false }, { rolname: 'authenticated', rolcanlogin: false }, { rolname: 'service_role', rolcanlogin: false },
    ]);
    const { rows: grants } = await pool.query(
      `select grantee, table_name from information_schema.role_table_grants
        where table_schema = 'auth' and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')`);
    assert.deepEqual(grants, []);
    const { rows: rls } = await pool.query(
      `select c.relname, c.relrowsecurity from pg_class c join pg_namespace s on s.oid = c.relnamespace
        where s.nspname = 'auth' and c.relkind = 'r' order by 1`);
    assert.ok(rls.length >= 5 && rls.every((r) => r.relrowsecurity), JSON.stringify(rls));
  });

  // ---------------------------------------------- the verifier, on these tokens --

  test('the verifier accepts the emulator’s tokens and says who signed in', async () => {
    const s = await signIn(someone());
    const who = await tokenVerifier().verify(s.access_token);
    assert.deepEqual(who, {
      iss: issuer, provider: 'hushmates', sub: s.user.id, email: s.user.email, role: 'authenticated',
      sessionId: claimsOf(s.access_token).session_id, exp: claimsOf(s.access_token).exp,
    });
    // a static copy of the keys works the same as fetching them
    const fixed = createVerifier({ issuers: [{ iss: issuer, provider: 'hushmates', jwks: emu.jwks }], now: () => clock.t });
    assert.equal((await fixed.verify(s.access_token)).sub, s.user.id);
  });

  test('the verifier refuses every forged, stale or malformed token the same way', async () => {
    const s = await signIn(someone());
    const v = tokenVerifier();
    const key = await emulatorKey();
    const good = claimsOf(s.access_token);
    const head = { alg: 'ES256', kid: key.kid, typ: 'JWT' };
    const forge = (claims, header = head) => signES256(key.privateKey, header, claims);
    const t = Math.floor(clock.t / 1000);

    // the forge itself is sound: a token it makes with the real claims passes
    assert.equal((await v.verify(await forge(good))).sub, good.sub);

    const [h, p, sig] = s.access_token.split('.');
    const flipped = sig.slice(0, 10) + (sig[10] === 'A' ? 'B' : 'A') + sig.slice(11);
    await refused(v, `${h}.${p}.${flipped}`, 'signature');
    await refused(v, `${h}.${b64({ ...good, email: 'someone-else@example.test' })}.${sig}`, 'signature');
    await refused(v, `${h}.${b64({ ...good, role: 'service_role' })}.${sig}`, 'signature');

    await refused(v, await forge({ ...good, iss: 'https://abcdefgh.supabase.co/auth/v1' }), 'issuer');
    await refused(v, await forge({ ...good, iss: undefined }), 'issuer');
    await refused(v, await forge({ ...good, aud: 'somebody-else' }), 'audience');
    await refused(v, await forge({ ...good, aud: undefined }), 'audience');
    assert.ok(await v.verify(await forge({ ...good, aud: ['other', 'authenticated'] })), 'a list of audiences that includes ours is fine');

    await refused(v, await forge({ ...good, exp: t - 31 }), 'expired');
    assert.ok(await v.verify(await forge({ ...good, exp: t - 20 })), 'a little clock difference is tolerated');
    await refused(v, await forge({ ...good, exp: undefined }), 'exp');
    await refused(v, await forge({ ...good, exp: String(t + 3600) }), 'exp');
    await refused(tokenVerifier({ now: () => clock.t + 2 * 3600e3 }), s.access_token, 'expired');
    await refused(v, await forge({ ...good, nbf: t + 120 }), 'nbf');
    assert.ok(await v.verify(await forge({ ...good, nbf: t + 10 })));
    await refused(v, await forge({ ...good, iat: t + 3600 }), 'iat');

    await refused(v, await forge({ ...good, sub: undefined }), 'sub');
    await refused(v, await forge({ ...good, sub: '' }), 'sub');
    await refused(v, await forge({ ...good, sub: 42 }), 'sub');
    for (const role of ['anon', 'service_role', 'supabase_admin', undefined]) await refused(v, await forge({ ...good, role }), 'role');
    await refused(v, await forge({ ...good, is_anonymous: true }), 'anonymous');

    // alg none, in its spellings
    for (const alg of ['none', 'None', 'NONE']) {
      await refused(v, `${b64({ alg, typ: 'JWT' })}.${b64(good)}.`, 'malformed');
      await refused(v, `${b64({ alg, typ: 'JWT' })}.${b64(good)}.${sig}`, 'alg');
    }
    await refused(v, await forge(good, { ...head, alg: 'ES384' }), 'alg');
    await refused(v, await forge(good, { ...head, kid: 'some-other-key' }), 'unknown-key');
    await refused(v, await forge(good, { ...head, crit: ['exp'] }), 'crit');
    await refused(v, await forge(good, { ...head, typ: 'at+jwt+other' }), 'typ');

    // HS256 "signed" with the public key, in every form someone might try
    const jwk = emu.jwks.keys[0];
    const publicKey = await subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
    const spki = Buffer.from(await subtle.exportKey('spki', publicKey));
    const pem = `-----BEGIN PUBLIC KEY-----\n${spki.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----\n`;
    const secrets = [JSON.stringify(jwk), Buffer.from(await subtle.exportKey('raw', publicKey)), spki, pem, jwk.x];
    for (const secret of secrets) await refused(v, signHS256(secret, { alg: 'HS256', typ: 'JWT', kid: key.kid }, good), 'alg');

    // too big, even when properly signed
    await refused(v, await forge({ ...good, user_metadata: { pad: 'x'.repeat(9000) } }), 'oversize');
    // garbage
    for (const junk of ['', 'abc', 'a.b', 'a.b.c', 'a.b.c.d', '...', `${h}.${p}`, `${h}.${p}.${sig}.`, `${h}..${sig}`,
      `${b64('not json')}.${p}.${sig}`, `${h}.${b64('[1,2]')}.${sig}`, `${h}.${b64('null')}.${sig}`, `${h}.${p}.${sig}%`,
      `${Buffer.from([0xff, 0xfe]).toString('base64url')}.${p}.${sig}`, ` ${s.access_token}`]) {
      await refused(v, junk);
    }
    for (const junk of [null, undefined, 42, {}, [], { toString: () => s.access_token }]) await refused(v, junk, 'missing');
  });

  test('the verifier caches the key set, and fetches again for a new key id only once in a while', async () => {
    const s = await signIn(someone());
    let fetches = 0;
    const counting = (...a) => { fetches++; return fetch(...a); };
    const t0 = clock.t;
    const v = tokenVerifier({ fetch: counting });
    await v.verify(s.access_token);
    await v.verify(s.access_token);
    assert.equal(fetches, 1, 'cached');
    const key = await emulatorKey();
    const unknown = await signES256(key.privateKey, { alg: 'ES256', kid: 'rotated-away', typ: 'JWT' }, claimsOf(s.access_token));
    await refused(v, unknown, 'unknown-key');
    assert.equal(fetches, 2, 'an unknown key id fetches the set again');
    await refused(v, unknown, 'unknown-key');
    assert.equal(fetches, 2, 'but not on every request');
    clock.t = t0 + 600001;
    const later = await signIn(someone());
    await v.verify(later.access_token);
    assert.equal(fetches, 3, 'the cache expires');
  });
});

// ====================================================== the verifier ==

describe('the sign-in token verifier, on its own', () => {
  const T = Date.UTC(2026, 9, 14, 9);
  const now = () => T;
  const t = Math.floor(T / 1000);
  const claims = (iss, extra = {}) => ({ iss, sub: '7d1c3f8e-0a4b-4c2d-9e6f-1a2b3c4d5e6f', aud: 'authenticated', role: 'authenticated', email: 'Moon@Example.test', exp: t + 3600, iat: t, session_id: 's-1', ...extra });

  test('HS256 with the legacy shared secret (Supabase projects before asymmetric keys)', async () => {
    const secret = 'super-secret-jwt-token-with-at-least-32-characters-long';
    const iss = 'https://abcdefgh.supabase.co/auth/v1';
    const v = createVerifier({ issuers: [{ iss, provider: 'hushmates', audience: 'authenticated', hs256Secret: secret }], now });
    const who = await v.verify(signHS256(secret, { alg: 'HS256', typ: 'JWT' }, claims(iss)));
    assert.deepEqual(who, { iss, provider: 'hushmates', sub: claims(iss).sub, email: 'moon@example.test', role: 'authenticated', sessionId: 's-1', exp: t + 3600 });
    await refused(v, signHS256(`${secret}-other`, { alg: 'HS256', typ: 'JWT' }, claims(iss)), 'signature');
    const ec = await ecKey('k1');
    await refused(v, await signES256(ec.privateKey, { alg: 'ES256', kid: 'k1' }, claims(iss)), 'alg');
    await refused(v, signHS256(secret, { alg: 'HS512', typ: 'JWT' }, claims(iss)), 'alg');
    assert.throws(() => createVerifier({ issuers: [{ iss, provider: 'hushmates', hs256Secret: 'too-short' }] }), /32 bytes/);
  });

  test('an issuer with both a secret and public keys only ever checks HS256 against the secret', async () => {
    const secret = 'another-secret-that-is-long-enough-to-be-real';
    const iss = 'https://abcdefgh.supabase.co/auth/v1';
    const rsa = await rsaKey('r1');
    const v = createVerifier({ issuers: [{ iss, provider: 'hushmates', hs256Secret: secret, jwks: { keys: [rsa.jwk] } }], now });
    assert.ok(await v.verify(signHS256(secret, { alg: 'HS256' }, claims(iss))));
    assert.ok(await v.verify(await signRS256(rsa.privateKey, { alg: 'RS256', kid: 'r1' }, claims(iss))));
    for (const fake of [JSON.stringify(rsa.jwk), rsa.jwk.n, Buffer.from(rsa.jwk.n, 'base64url')]) {
      await refused(v, signHS256(fake, { alg: 'HS256', kid: 'r1' }, claims(iss)), 'signature');
    }
    const narrowed = createVerifier({ issuers: [{ iss, provider: 'hushmates', hs256Secret: secret, jwks: { keys: [rsa.jwk] }, algorithms: ['RS256'] }], now });
    await refused(narrowed, signHS256(secret, { alg: 'HS256' }, claims(iss)), 'alg');
  });

  test('RS256 from a key set URL: picked by kid, cached, fetched again for a rotated key', async () => {
    const iss = 'https://login.hushmallow.example/auth/v1';
    const a = await rsaKey('a');
    const b = await rsaKey('b');
    let served = { keys: [a.jwk] };
    let calls = 0;
    let down = false;
    const clock = { t: T };
    const fakeFetch = async (url, init) => {
      calls++;
      assert.equal(url, `${iss}/.well-known/jwks.json`);
      assert.equal(init.redirect, 'error');
      if (down) throw new Error('connection refused');
      return new Response(JSON.stringify(served), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const v = createVerifier({ issuers: [{ iss, provider: 'hushmallow', jwksUrl: `${iss}/.well-known/jwks.json` }], fetch: fakeFetch, now: () => clock.t, jwksTtlMs: 60000 });
    const tokenA = await signRS256(a.privateKey, { alg: 'RS256', kid: 'a', typ: 'JWT' }, claims(iss));
    assert.equal((await v.verify(tokenA)).provider, 'hushmallow');
    await v.verify(tokenA);
    assert.equal(calls, 1);

    served = { keys: [a.jwk, b.jwk] };                                    // the issuer rotates in a new key
    const tokenB = await signRS256(b.privateKey, { alg: 'RS256', kid: 'b', typ: 'JWT' }, claims(iss));
    assert.ok(await v.verify(tokenB));
    assert.equal(calls, 2, 'one fetch for the new kid');
    await refused(v, await signRS256(b.privateKey, { alg: 'RS256', kid: 'zzz' }, claims(iss)), 'unknown-key');
    assert.equal(calls, 2, 'a made-up kid right after does not fetch again');
    await refused(v, await signRS256(a.privateKey, { alg: 'RS256', kid: 'b' }, claims(iss)), 'signature');
    await refused(v, await signRS256(a.privateKey, { alg: 'RS256' }, claims(iss)), 'unknown-key');      // two keys, no kid: no guessing

    down = true;                                                          // the issuer has a hiccup
    clock.t += 61000;
    assert.ok(await v.verify(tokenA), 'keys we already had keep working');
    assert.equal(calls, 3);
    assert.ok(await v.verify(tokenA));
    assert.equal(calls, 3, 'a down issuer is not asked on every request');
  });

  test('two issuers side by side: each token is checked only with its own issuer’s keys (one Hushmallow account later)', async () => {
    const hushmates = await ecKey('hm-1');
    const hushmallow = await rsaKey('main-1');
    const issA = 'http://127.0.0.1:8090/auth/v1';
    const issB = 'https://login.hushmallow.example/auth/v1';
    const v = createVerifier({
      issuers: [
        { iss: issA, provider: 'hushmates', jwks: { keys: [hushmates.jwk] } },
        { iss: issB, provider: 'hushmallow', audience: 'authenticated', jwks: { keys: [hushmallow.jwk] } },
      ],
      now,
    });
    assert.equal((await v.verify(await signES256(hushmates.privateKey, { alg: 'ES256', kid: 'hm-1' }, claims(issA)))).provider, 'hushmates');
    assert.equal((await v.verify(await signRS256(hushmallow.privateKey, { alg: 'RS256', kid: 'main-1' }, claims(issB)))).provider, 'hushmallow');
    // a Hushmates key can't vouch for a main-login identity, nor the other way round
    await refused(v, await signES256(hushmates.privateKey, { alg: 'ES256', kid: 'hm-1' }, claims(issB)), 'unknown-key');
    await refused(v, await signRS256(hushmallow.privateKey, { alg: 'RS256', kid: 'main-1' }, claims(issA)), 'unknown-key');
  });

  test('a configuration that could never work is refused up front', () => {
    assert.throws(() => createVerifier({ issuers: [] }), /at least one issuer/);
    assert.throws(() => createVerifier({ issuers: [{ iss: 'x', provider: 'p' }] }), /no keys/);
    assert.throws(() => createVerifier({ issuers: [{ iss: 'x', jwks: { keys: [] } }] }), /provider/);
    assert.throws(() => createVerifier({ issuers: [{ iss: 'x', provider: 'p', jwks: { keys: [] } }, { iss: 'x', provider: 'q', jwks: { keys: [] } }] }), /twice/);
    assert.throws(() => createVerifier({ issuers: [{ iss: 'x', provider: 'p', jwks: { keys: [] }, algorithms: ['HS256'] }] }), /no algorithm/);
  });

  test('keys that are private, weak, or for something else are not used', async () => {
    const iss = 'https://abcdefgh.supabase.co/auth/v1';
    const weak = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 1024, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    const weakJwk = await subtle.exportKey('jwk', weak.publicKey);
    const enc = await ecKey('enc');
    const v = createVerifier({
      issuers: [{ iss, provider: 'hushmates', jwks: { keys: [
        { kty: 'RSA', n: weakJwk.n, e: weakJwk.e, kid: 'weak' },
        { ...enc.jwk, use: 'enc' },
        { kty: 'oct', k: Buffer.from('a-shared-secret-in-a-key-set-is-not-ok').toString('base64url'), kid: 'oct' },
      ] } }],
      now,
    });
    await refused(v, await signRS256(weak.privateKey, { alg: 'RS256', kid: 'weak' }, claims(iss)), 'unknown-key');
    await refused(v, await signES256(enc.privateKey, { alg: 'ES256', kid: 'enc' }, claims(iss)), 'unknown-key');
    await refused(v, signHS256('a-shared-secret-in-a-key-set-is-not-ok', { alg: 'HS256', kid: 'oct' }, claims(iss)), 'alg');
  });

  test('bearer() reads the token from an Authorization header', () => {
    assert.equal(bearer('Bearer abc.def.ghi'), 'abc.def.ghi');
    assert.equal(bearer('bearer abc.def-_.ghi'), 'abc.def-_.ghi');
    for (const h of [undefined, null, '', 'Basic abc', 'Bearer', 'Bearer a b', 'Bearer a,b', 'abc.def.ghi']) assert.equal(bearer(h), null);
  });
});

// ================================================== field encryption ==

describe('field encryption', () => {
  const key = () => randomBytes(32).toString('base64');
  const K1 = key();
  const K2 = key();
  const MAC = key();
  const FORMAT = /^hmenc:v1:([A-Za-z0-9_-]+):([A-Za-z0-9_-]{16}):([A-Za-z0-9_-]+)$/;
  const words = ['My friend hasn’t replied. I think they’re avoiding me.', 'a', 'Ünïcödé ✨🌙 and 中文', 'line one\nline two\n', 'hmenc', ' '.repeat(3), 'x'.repeat(100000)];

  test('words go in locked and come out the same', async () => {
    const fc = await createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: MAC });
    for (const text of words) {
      const locked = await fc.encrypt(text);
      const m = FORMAT.exec(locked);
      assert.ok(m, locked.slice(0, 80));
      assert.equal(m[1], 'k1');
      assert.equal(Buffer.from(m[2], 'base64url').length, 12);
      if (text.length >= 4) assert.ok(!m[3].includes(text) && !locked.slice(9).includes(text), 'the words are not readable in what is stored');
      assert.ok(isEncrypted(locked) && fc.isEncrypted(locked));
      assert.equal(await fc.decrypt(locked), text);
    }
    const a = await fc.encrypt(words[0]);
    const b = await fc.encrypt(words[0]);
    assert.notEqual(a, b, 'the same words never look the same twice');
    assert.equal(isEncrypted(words[0]), false);
    assert.equal(isEncrypted(null), false);
  });

  test('an empty string stays empty, so cleared words stay cleared', async () => {
    const fc = await createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: MAC });
    assert.equal(await fc.encrypt(''), '');
    assert.equal(await fc.decrypt(''), '');
    assert.equal(isEncrypted(''), false);
  });

  test('any change to a locked text is caught', async () => {
    const fc = await createFieldCrypt({ keys: { k1: K1, k2: K2 }, current: 'k1', macKey: MAC });
    const locked = await fc.encrypt('please keep this private');
    const [, , kid, iv, ct] = locked.split(':');
    const flip = (s, i) => s.slice(0, i) + (s[i] === 'A' ? 'B' : 'A') + s.slice(i + 1);
    const bad = [
      `hmenc:v1:${kid}:${iv}:${flip(ct, 5)}`,                      // ciphertext
      `hmenc:v1:${kid}:${iv}:${flip(ct, ct.length - 3)}`,          // tag
      `hmenc:v1:${kid}:${flip(iv, 3)}:${ct}`,                      // iv
      `hmenc:v1:k2:${iv}:${ct}`,                                   // passed off as another key's (the key id is bound in)
      `hmenc:v1:${kid}:${iv}:${ct.slice(0, -4)}`,                  // cut short
      `hmenc:v1:${kid}:${iv}:${ct.slice(0, 10)}`,
      `hmenc:v1:${kid}:${iv}:${ct}:extra`,
      `hmenc:v1:${kid}:${iv}`,
      `hmenc:v1:${kid}:${iv}:${ct}=`,
      'hmenc:v1:',
      'hmenc:v2:k1:abc:def',
      'just some words',
    ];
    for (const s of bad) {
      await assert.rejects(fc.decrypt(s), (e) => e.code === 'decrypt-failed' && !e.message.includes(s), s);
    }
    await assert.rejects(fc.decrypt(null), { code: 'decrypt-failed' });
  });

  test('an unknown key id, or the wrong key under a known id, does not open it', async () => {
    const fc = await createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: MAC });
    const locked = await fc.encrypt('words');
    const other = await createFieldCrypt({ keys: { k9: K1 }, current: 'k9', macKey: MAC });
    await assert.rejects(other.decrypt(locked), { code: 'decrypt-failed', reason: 'unknown-kid' });
    const impostor = await createFieldCrypt({ keys: { k1: K2 }, current: 'k1', macKey: MAC });
    await assert.rejects(impostor.decrypt(locked), { code: 'decrypt-failed', reason: 'tampered' });
  });

  test('key rotation: old texts open with their key, new texts use the current one', async () => {
    const before = await createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: MAC });
    const old = await before.encrypt('from last year');
    const rotated = await createFieldCrypt({ keys: { k1: K1, k2: K2 }, current: 'k2', macKey: MAC });
    assert.equal(await rotated.decrypt(old), 'from last year');
    const fresh = await rotated.encrypt('from today');
    assert.equal(fresh.split(':')[2], 'k2');
    assert.equal(rotated.currentKid, 'k2');
    const moved = await rotated.encrypt(await rotated.decrypt(old));             // re-locking moves a text to the new key
    assert.equal(moved.split(':')[2], 'k2');
    assert.equal(await rotated.decrypt(moved), 'from last year');
    const retired = await createFieldCrypt({ keys: { k2: K2 }, current: 'k2', macKey: MAC });
    assert.equal(await retired.decrypt(fresh), 'from today');
    await assert.rejects(retired.decrypt(old), { reason: 'unknown-kid' });
  });

  test('mac is a keyed hash: the same words give the same hash, and it needs the key', async () => {
    const fc = await createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: MAC });
    const rotated = await createFieldCrypt({ keys: { k1: K1, k2: K2 }, current: 'k2', macKey: MAC });
    const otherMac = await createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: key() });
    const h = await fc.mac('INVITE-CODE-1');
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(await fc.mac('INVITE-CODE-1'), h);
    assert.equal(await rotated.mac('INVITE-CODE-1'), h, 'rotating the locking keys does not change hashes');
    assert.notEqual(await fc.mac('INVITE-CODE-2'), h);
    assert.notEqual(await otherMac.mac('INVITE-CODE-1'), h);
    assert.notEqual(h, sha256('INVITE-CODE-1'));
    assert.equal(h, createHmac('sha256', Buffer.from(MAC, 'base64')).update('INVITE-CODE-1').digest('hex'), 'plain HMAC-SHA256');
    assert.match(await fc.mac(''), /^[0-9a-f]{64}$/);
  });

  test('decryptDeep opens every locked string in nested data and leaves the rest alone', async () => {
    const fc = await createFieldCrypt({ keys: { k1: K1, k2: K2 }, current: 'k2', macKey: MAC });
    const old = await (await createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: MAC })).encrypt('an older perspective');
    const input = {
      journeys: [
        { id: 'j1', text: await fc.encrypt('a feeling'), perspectives: [{ text: await fc.encrypt('maybe they’re busy') }, { text: old }], count: 2, sealed: true, note: null },
        { id: 'j2', text: '', tags: ['plain', await fc.encrypt('locked tag')] },
      ],
      name: 'Moonbeam',
      at: new Date(0),
      nested: [[[await fc.encrypt('deep')]]],
      ['__proto__']: await fc.encrypt('not a prototype'),
    };
    const snapshot = structuredClone(input);
    const out = await fc.decryptDeep(JSON.parse(JSON.stringify({ ...input, at: undefined })));
    assert.equal(out.journeys[0].text, 'a feeling');
    assert.deepEqual(out.journeys[0].perspectives.map((p) => p.text), ['maybe they’re busy', 'an older perspective']);
    assert.equal(out.journeys[0].count, 2);
    assert.equal(out.journeys[0].sealed, true);
    assert.equal(out.journeys[0].note, null);
    assert.equal(out.journeys[1].text, '');
    assert.deepEqual(out.journeys[1].tags, ['plain', 'locked tag']);
    assert.equal(out.name, 'Moonbeam');
    assert.equal(out.nested[0][0][0], 'deep');
    assert.equal(Object.getPrototypeOf(out), Object.prototype, 'a "__proto__" field stays a field');
    assert.equal(Object.getOwnPropertyDescriptor(out, '__proto__')?.value, 'not a prototype');
    assert.deepEqual(input, snapshot, 'the input is left alone');
    const withDate = await fc.decryptDeep({ at: input.at });
    assert.equal(withDate.at, input.at);
    for (const v of [null, undefined, 3, true, 'plain']) assert.equal(await fc.decryptDeep(v), v);

    const locked = await fc.encrypt('x');
    const tampered = { a: [{ b: locked.slice(0, -2) + (locked.slice(-2) === 'AA' ? 'BB' : 'AA') }] };
    await assert.rejects(fc.decryptDeep(tampered), { code: 'decrypt-failed' });
  });

  test('mistakes are refused rather than quietly allowed', async () => {
    await assert.rejects(createFieldCrypt({ keys: { k1: randomBytes(16).toString('base64') }, current: 'k1', macKey: MAC }), /32 bytes/);
    await assert.rejects(createFieldCrypt({ keys: { k1: 'not base64 !!' }, current: 'k1', macKey: MAC }), /base64/);
    await assert.rejects(createFieldCrypt({ keys: { k1: K1 }, current: 'k2', macKey: MAC }), /current/);
    await assert.rejects(createFieldCrypt({ keys: { 'k:1': K1 }, current: 'k:1', macKey: MAC }), /key id/);
    await assert.rejects(createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: K1 }), /differ/);
    await assert.rejects(createFieldCrypt({ keys: {}, current: 'k1', macKey: MAC }), /keys/);
    await assert.rejects(createFieldCrypt({ keys: { k1: K1 }, current: 'k1' }), /macKey/);
    const urlSafe = Buffer.from(K1, 'base64').toString('base64url');
    const fc = await createFieldCrypt({ keys: { k1: urlSafe }, current: 'k1', macKey: MAC });
    const both = await createFieldCrypt({ keys: { k1: K1 }, current: 'k1', macKey: MAC });
    assert.equal(await both.decrypt(await fc.encrypt('same key, either spelling')), 'same key, either spelling');
    await assert.rejects(fc.encrypt(42), TypeError);
    await assert.rejects(fc.encrypt(null), TypeError);
    await assert.rejects(fc.encrypt(await fc.encrypt('twice')), /already encrypted/);
    await assert.rejects(fc.mac(undefined), TypeError);
    assert.throws(() => { fc.encrypt = null; }, TypeError, 'the object is frozen');
  });
});
