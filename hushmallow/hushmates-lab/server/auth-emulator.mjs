// A local, development-only copy of the Supabase Auth (GoTrue) endpoints the
// Hushmates app uses: passwordless sign-in with a 6-digit email code, session
// refresh, sign-out, "who am I", the public signing keys, and deleting a user.
//
// It exists so the whole system (app, gateway, database) runs and is tested on
// one machine with no outside service and no email provider: codes are written
// to the console and kept in an in-memory mailbox instead of being emailed.
// It is NEVER part of a production build (tools/build-app.mjs ships only what
// app/index.html imports) and it refuses to start for anything but a local
// issuer, so a token it signs can never be mistaken for a real one by a
// production verifier, which trusts only the real Supabase issuer.
//
// Requests and answers have the same shapes as Supabase Auth, so the app's
// sign-in code doesn't change between here and a real project. The admin
// endpoints the staging check uses are here too (service key only): create a
// user, look one up, and generate a sign-in code without sending an email
// (tools/staging-check.mjs signs its test accounts in that way, on staging as
// here, so it sends no email and spends nothing). Errors carry
// the string code twice (`code`, and `error_code` as GoTrue names it) and a
// developer message (`msg`): the app maps codes to its own warm words and
// never shows `msg` to anyone.
//
// Persistence is a small emulation schema (supabase/local/auth-emulation.sql),
// applied at start. The ES256 signing key is kept there too, so restarting the
// dev stack doesn't sign everyone out. Only hashes of codes and refresh tokens
// are stored.
//
// Where it is stricter or simpler than the real thing (on purpose):
//   · a refresh token works exactly once; using one again ends that session
//     for every holder (Supabase allows a few seconds' grace for racing tabs);
//   · a user row is made when the email is proven (Supabase makes it when the
//     code is sent);
//   · only email codes (type 'email', or 'magiclink' for a generated one) and
//     grant_type 'refresh_token': no passwords at all.

import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createVerifier, bearer } from '../supabase/functions/_shared/jwt.js';

const SCHEMA_FILE = fileURLToPath(new URL('../supabase/local/auth-emulation.sql', import.meta.url));
const CODES_PER_HOUR = 5;
const MAX_WRONG = 5;
const MAX_BODY = 16384;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const { subtle } = webcrypto;

class AuthError extends Error {
  constructor(status, code, msg) { super(msg); this.status = status; this.code = code; }
}
const fail = (status, code, msg) => { throw new AuthError(status, code, msg); };
const expired = () => new AuthError(403, 'otp_expired', 'Token has expired or is invalid');

const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
const sameSecret = (a, b) => typeof a === 'string' && typeof b === 'string'
  && timingSafeEqual(Buffer.from(sha256(a), 'hex'), Buffer.from(sha256(b), 'hex'));
const b64url = (data) => Buffer.from(data).toString('base64url');
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const iso = (d) => (d ? new Date(d).toISOString() : null);

function normaliseEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL.test(email)) fail(400, 'validation_failed', 'Unable to validate email address: invalid format');
  return email;
}

// RFC 7638 thumbprint: the key id is a fingerprint of the public key itself
const thumbprint = (jwk) => b64url(createHash('sha256').update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })).digest());

async function loadOrCreateKey(client) {
  const pick = () => client.query('select kid, private_jwk, public_jwk from auth.emulator_keys order by created_at, kid limit 1');
  let row = (await pick()).rows[0];
  if (!row) {
    const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const priv = await subtle.exportKey('jwk', pair.privateKey);
    const kid = thumbprint(priv);
    const publicJwk = { kty: 'EC', crv: 'P-256', x: priv.x, y: priv.y, kid, alg: 'ES256', use: 'sig', key_ops: ['verify'] };
    const privateJwk = { kty: 'EC', crv: 'P-256', x: priv.x, y: priv.y, d: priv.d };
    await client.query('insert into auth.emulator_keys (kid, private_jwk, public_jwk) values ($1, $2, $3) on conflict do nothing', [kid, privateJwk, publicJwk]);
    row = (await pick()).rows[0];
  }
  const { kty, crv, x, y, d } = row.private_jwk;
  const privateKey = await subtle.importKey('jwk', { kty, crv, x, y, d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return { kid: row.kid, privateKey, publicJwk: row.public_jwk };
}

async function readJson(req) {
  if (Number(req.headers['content-length'] || 0) > MAX_BODY) fail(413, 'request_too_large', 'Request body too large');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= MAX_BODY) chunks.push(chunk);                     // keep reading (not storing) so the answer can still be sent
  }
  if (size > MAX_BODY) fail(413, 'request_too_large', 'Request body too large');
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  let body;
  try { body = JSON.parse(text); } catch { fail(400, 'bad_json', 'Could not parse request body as JSON'); }
  if (!isPlainObject(body)) fail(400, 'bad_json', 'Could not parse request body as JSON');
  return body;
}

function send(res, status, body, headers = {}) {
  if (res.headersSent) return;
  const base = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers };
  if (body == null) { res.writeHead(status, base); res.end(); return; }
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(text), ...base });
  res.end(text);
}

/**
 * @param {object} o
 *   pool               a pg Pool for a local database
 *   issuer             e.g. 'http://127.0.0.1:8090/auth/v1' (must be a local address)
 *   serviceKey         what the server side sends (apikey, and Bearer for admin)
 *   anonKey            what the browser sends (apikey)
 *   now                for tests
 *   otpTtlMs           how long a code works
 *   accessTtlSeconds   how long an access token works
 *   log                where codes and problems are written
 * @returns {Promise<{ handle(req, res, pathname): Promise<boolean>, jwks: { keys: object[] }, mailbox(email): string|null, issuer: string, close(): void }>}
 */
export async function createAuthEmulator({
  pool, issuer, serviceKey, anonKey, now = () => Date.now(), otpTtlMs = 600000, accessTtlSeconds = 3600, log = console,
} = {}) {
  if (!pool || typeof pool.query !== 'function' || typeof pool.connect !== 'function') throw new Error('createAuthEmulator needs a pg Pool');
  if (process.env.NODE_ENV === 'production') throw new Error('the auth emulator is for local development only');
  let url;
  try { url = new URL(issuer); } catch { throw new Error('issuer must be a URL like http://127.0.0.1:8090/auth/v1'); }
  if (!LOOPBACK.has(url.hostname) || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('the auth emulator is for local development only: its issuer must be a local address (127.0.0.1, localhost or [::1])');
  }
  if (!issuer.endsWith('/auth/v1')) throw new Error('issuer must end with /auth/v1 (no trailing slash), as Supabase\'s does');
  // the anon key is public by design (it ships in the app), so only the service key needs length
  if (typeof serviceKey !== 'string' || serviceKey.length < 16) throw new Error('serviceKey must be at least 16 characters');
  if (typeof anonKey !== 'string' || !anonKey) throw new Error('anonKey is needed');
  if (serviceKey === anonKey) throw new Error('serviceKey and anonKey must differ');

  const say = (...a) => (log.log || log.info || (() => {})).apply(log, a);
  const warn = (...a) => (log.warn || log.log || (() => {})).apply(log, a);
  const oops = (...a) => (log.error || log.log || (() => {})).apply(log, a);

  // the schema and the signing key, once, even if several emulators start on one database together
  let signer;
  {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query("select pg_advisory_xact_lock(hashtextextended('hushmates:auth-emulation', 0))");
      await client.query(readFileSync(SCHEMA_FILE, 'utf8'));
      signer = await loadOrCreateKey(client);
      await client.query('commit');
    } catch (e) {
      await client.query('rollback').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }
  const jwks = Object.freeze({ keys: [Object.freeze({ ...signer.publicJwk })] });
  // the emulator checks its own tokens with the same verifier the gateway uses
  const verifier = createVerifier({
    issuers: [{ iss: issuer, provider: 'hushmates', audience: 'authenticated', jwks, algorithms: ['ES256'] }], now,
  });
  // codes are kept as keyed hashes: six digits alone would be trivial to reverse
  const codeKey = createHash('sha256').update(`hushmates-auth-emulator:${serviceKey}`).digest();
  const codeHash = (email, code) => createHmac('sha256', codeKey).update(`${email}:${code}`).digest('hex');
  const mail = new Map();           // email → latest code: the dev stand-in for an inbox
  let closed = false;

  async function tx(fn) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const out = await fn(client);
      await client.query('commit');
      return out;
    } catch (e) {
      await client.query('rollback').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }
  const lockEmail = (c, email) => c.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`hushmates:otp:${email}`]);

  async function sign(claims) {
    const input = `${b64url(JSON.stringify({ alg: 'ES256', kid: signer.kid, typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
    const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer.privateKey, Buffer.from(input));
    return `${input}.${b64url(sig)}`;
  }

  const publicUser = (u) => ({
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email,
    email_confirmed_at: iso(u.created_at),          // made only once the email is proven
    last_sign_in_at: iso(u.last_sign_in_at),
    created_at: iso(u.created_at),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    is_anonymous: false,
  });

  // a fresh refresh token and access token for a session (inside the caller's transaction)
  async function issue(c, user, session, parent) {
    const refreshToken = randomBytes(24).toString('base64url');
    const at = new Date(now());
    await c.query('insert into auth.refresh_tokens (token_hash, session_id, user_id, parent, created_at) values ($1, $2, $3, $4, $5)',
      [sha256(refreshToken), session.id, user.id, parent, at]);
    const iat = Math.floor(at.getTime() / 1000);
    const exp = iat + accessTtlSeconds;
    const accessToken = await sign({
      aud: 'authenticated', exp, iat, iss: issuer, sub: user.id, email: user.email, phone: '',
      app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
      role: 'authenticated', aal: 'aal1',
      amr: [{ method: 'otp', timestamp: Math.floor(new Date(session.created_at).getTime() / 1000) }],
      session_id: session.id, is_anonymous: false,
    });
    return { access_token: accessToken, token_type: 'bearer', expires_in: accessTtlSeconds, expires_at: exp, refresh_token: refreshToken, user: publicUser(user) };
  }

  function checkApiKey(req) {
    const key = req.headers.apikey;
    if (typeof key !== 'string' || !key) fail(401, 'no_api_key', 'No API key found in request');
    if (!sameSecret(key, anonKey) && !sameSecret(key, serviceKey)) fail(401, 'invalid_api_key', 'Invalid API key');
  }

  // who a Bearer access token belongs to, with a session that still exists
  async function signedIn(req) {
    const token = bearer(req.headers.authorization);
    if (!token) fail(401, 'no_authorization', 'This endpoint requires a Bearer token');
    let who;
    try { who = await verifier.verify(token); } catch { fail(403, 'bad_jwt', 'invalid JWT: unable to parse or verify signature, token is expired'); }
    if (!UUID.test(who.sub) || !UUID.test(who.sessionId || '')) fail(403, 'bad_jwt', 'invalid JWT: unable to parse or verify signature, token is expired');
    const { rows } = await pool.query(
      `select s.id as session_id, u.id, u.email, u.created_at, u.last_sign_in_at
         from auth.sessions s join auth.users u on u.id = s.user_id
        where s.id = $1 and s.user_id = $2`, [who.sessionId, who.sub]);
    if (!rows[0]) fail(403, 'session_not_found', 'Session from session_id claim in JWT does not exist');
    return rows[0];
  }

  // POST /otp: send a code (here: write it to the console and the mailbox)
  async function sendCode(body) {
    if (body.phone !== undefined) fail(400, 'validation_failed', 'Only email codes are available');
    const email = normaliseEmail(body.email);
    const createUser = body.create_user !== false;
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const t = now();
    await tx(async (c) => {
      await lockEmail(c, email);
      if (!createUser) {
        const known = await c.query('select 1 from auth.users where email = $1', [email]);
        if (!known.rows[0]) fail(422, 'otp_disabled', 'Signups not allowed for otp');
      }
      const { rows: [{ n }] } = await c.query('select count(*)::int as n from auth.otp_codes where email = $1 and created_at > $2', [email, new Date(t - 3600e3)]);
      if (n >= CODES_PER_HOUR) fail(429, 'over_email_send_rate_limit', 'Email rate limit exceeded');
      await c.query('update auth.otp_codes set used_at = $2 where email = $1 and used_at is null', [email, new Date(t)]);   // only the newest code works
      await c.query('delete from auth.otp_codes where email = $1 and created_at < $2', [email, new Date(t - 86400e3)]);
      await c.query('insert into auth.otp_codes (email, code_hash, create_user, created_at, expires_at) values ($1, $2, $3, $4, $5)',
        [email, codeHash(email, code), createUser, new Date(t), new Date(t + otpTtlMs)]);
    });
    mail.set(email, code);
    say(`[auth emulator] code for ${email}: ${code}`);
    return [200, {}];
  }

  // POST /verify: a code for a session
  async function verifyCode(body) {
    if (body.type !== 'email' && body.type !== 'magiclink') fail(400, 'validation_failed', 'Verify requires type "email"');
    const email = normaliseEmail(body.email);
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const t = now();
    const out = await tx(async (c) => {
      await lockEmail(c, email);
      const { rows: [code] } = await c.query(
        `select id, code_hash, attempts, expires_at, create_user from auth.otp_codes
          where email = $1 and used_at is null order by created_at desc, id desc limit 1 for update`, [email]);
      if (!code || code.expires_at.getTime() <= t || code.attempts >= MAX_WRONG) return { error: expired() };
      if (!/^\d{6}$/.test(token) || !sameSecret(codeHash(email, token), code.code_hash)) {
        // the wrong try is kept (committed) even though the answer is an error
        await c.query('update auth.otp_codes set attempts = attempts + 1 where id = $1', [code.id]);
        return { error: new AuthError(403, 'otp_invalid', 'Token has expired or is invalid') };
      }
      await c.query('update auth.otp_codes set used_at = $2 where id = $1', [code.id, new Date(t)]);
      if (!code.create_user && !(await c.query('select 1 from auth.users where email = $1', [email])).rows[0]) {
        return { error: new AuthError(422, 'otp_disabled', 'Signups not allowed for otp') };
      }
      const { rows: [user] } = await c.query(
        `insert into auth.users (id, email, created_at, last_sign_in_at) values ($1, $2, $3, $3)
         on conflict (email) do update set last_sign_in_at = excluded.last_sign_in_at
         returning id, email, created_at, last_sign_in_at`, [randomUUID(), email, new Date(t)]);
      const session = { id: randomUUID(), created_at: new Date(t) };
      await c.query('insert into auth.sessions (id, user_id, created_at) values ($1, $2, $3)', [session.id, user.id, session.created_at]);
      return { session: await issue(c, user, session, null) };
    });
    if (out.error) throw out.error;
    return [200, out.session];
  }

  // POST /token?grant_type=refresh_token: swap a refresh token for a new session
  async function refresh(body, query) {
    if (query.get('grant_type') !== 'refresh_token') fail(400, 'validation_failed', 'unsupported_grant_type');
    const given = typeof body.refresh_token === 'string' ? body.refresh_token : '';
    const notFound = new AuthError(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
    if (!given || given.length > 256) throw notFound;
    const t = new Date(now());
    const out = await tx(async (c) => {
      const { rows: [row] } = await c.query(
        `select r.id as token_id, r.revoked, s.id as session_id, s.created_at as session_created_at,
                u.id, u.email, u.created_at, u.last_sign_in_at
           from auth.refresh_tokens r
           join auth.sessions s on s.id = r.session_id
           join auth.users u on u.id = r.user_id
          where r.token_hash = $1
          for update of r, s`, [sha256(given)]);
      if (!row) return { error: notFound };
      if (row.revoked) {
        // an already-swapped token came back: someone else may hold a copy, so the whole session ends
        await c.query('delete from auth.sessions where id = $1', [row.session_id]);
        warn(`[auth emulator] a used refresh token came back; session ${row.session_id} ended`);
        return { error: new AuthError(400, 'refresh_token_already_used', 'Invalid Refresh Token: Already Used') };
      }
      await c.query('update auth.refresh_tokens set revoked = true, updated_at = $2 where id = $1', [row.token_id, t]);
      await c.query('update auth.sessions set refreshed_at = $2 where id = $1', [row.session_id, t]);
      const user = { id: row.id, email: row.email, created_at: row.created_at, last_sign_in_at: row.last_sign_in_at };
      return { session: await issue(c, user, { id: row.session_id, created_at: row.session_created_at }, row.token_id) };
    });
    if (out.error) throw out.error;
    return [200, out.session];
  }

  // POST /logout?scope=global|local|others (Supabase's default is global: every device)
  async function logout(req, query) {
    const scope = query.get('scope') || 'global';
    if (!['global', 'local', 'others'].includes(scope)) fail(400, 'validation_failed', `Unsupported logout scope "${scope}"`);
    const me = await signedIn(req);
    if (scope === 'local') await pool.query('delete from auth.sessions where id = $1', [me.session_id]);
    else if (scope === 'others') await pool.query('delete from auth.sessions where user_id = $1 and id <> $2', [me.id, me.session_id]);
    else await pool.query('delete from auth.sessions where user_id = $1', [me.id]);
    return [204, null];
  }

  function admin(req) {
    const m = /^Bearer[ ]+(\S+)$/i.exec(String(req.headers.authorization ?? ''));
    if (!m) fail(401, 'no_authorization', 'This endpoint requires a Bearer token');
    if (!sameSecret(m[1], serviceKey)) fail(403, 'not_admin', 'User not allowed');
  }

  // POST /admin/users { email, email_confirm }: a user whose email is taken as proven (no email sent)
  async function createUser(req, body) {
    admin(req);
    if (body.password !== undefined) fail(400, 'validation_failed', 'Passwords are not supported by the local copy (Hushmates signs in by email code only)');
    if (body.email_confirm !== true) fail(400, 'validation_failed', 'Only users with email_confirm: true can be made here');
    const email = normaliseEmail(body.email);
    const t = new Date(now());
    const { rows: [user] } = await pool.query(
      `insert into auth.users (id, email, created_at) values ($1, $2, $3) on conflict (email) do nothing
       returning id, email, created_at, last_sign_in_at`, [randomUUID(), email, t]);
    if (!user) fail(422, 'email_exists', 'A user with this email address has already been registered');
    return [200, publicUser(user)];
  }

  // GET /admin/users/:id
  async function getUser(req, id) {
    admin(req);
    if (!UUID.test(id)) fail(404, 'user_not_found', 'User not found');
    const { rows: [user] } = await pool.query('select id, email, created_at, last_sign_in_at from auth.users where id = $1', [id]);
    if (!user) fail(404, 'user_not_found', 'User not found');
    return [200, publicUser(user)];
  }

  // POST /admin/generate_link { type: 'magiclink', email }: a sign-in code handed back, not emailed
  async function generateLink(req, body) {
    admin(req);
    if (body.type !== 'magiclink') fail(400, 'validation_failed', 'Only magiclink links can be generated here');
    const email = normaliseEmail(body.email);
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const t = now();
    const user = await tx(async (c) => {
      await lockEmail(c, email);
      const { rows: [u] } = await c.query('select id, email, created_at, last_sign_in_at from auth.users where email = $1', [email]);
      if (!u) fail(404, 'user_not_found', 'User with this email not found');
      await c.query('update auth.otp_codes set used_at = $2 where email = $1 and used_at is null', [email, new Date(t)]);
      await c.query('insert into auth.otp_codes (email, code_hash, create_user, created_at, expires_at) values ($1, $2, false, $3, $4)',
        [email, codeHash(email, code), new Date(t), new Date(t + otpTtlMs)]);
      return u;
    });
    const hashed = codeHash(email, code);
    return [200, { ...publicUser(user), action_link: `${issuer}/verify?token=${hashed}&type=magiclink`, email_otp: code, hashed_token: hashed, verification_type: 'magiclink', redirect_to: '' }];
  }

  // DELETE /admin/users/:id (the service key only)
  async function deleteUser(req, id) {
    admin(req);
    if (!UUID.test(id)) fail(404, 'user_not_found', 'User not found');
    const email = await tx(async (c) => {
      const { rows: [user] } = await c.query('select email from auth.users where id = $1 for update', [id]);
      if (!user) fail(404, 'user_not_found', 'User not found');
      await c.query('delete from auth.otp_codes where email = $1', [user.email]);
      await c.query('delete from auth.users where id = $1', [id]);                 // sessions and refresh tokens go with it
      return user.email;
    });
    mail.delete(email);
    return [200, {}];
  }

  async function route(req, pathname) {
    const method = req.method;
    const query = new URL(req.url || '/', 'http://local').searchParams;
    const only = (m) => { if (method !== m) fail(405, 'method_not_allowed', 'Method not allowed'); };
    // public keys are public: the gateway fetches them without an API key, as on Supabase
    if (pathname === '/auth/v1/.well-known/jwks.json') {
      only('GET');
      return [200, jwks, { 'cache-control': 'public, max-age=600' }];
    }
    checkApiKey(req);
    switch (pathname) {
      case '/auth/v1/otp': only('POST'); return sendCode(await readJson(req));
      case '/auth/v1/verify': only('POST'); return verifyCode(await readJson(req));
      case '/auth/v1/token': only('POST'); return refresh(await readJson(req), query);
      case '/auth/v1/logout': only('POST'); return logout(req, query);
      case '/auth/v1/user': { only('GET'); const me = await signedIn(req); return [200, publicUser(me)]; }
      case '/auth/v1/admin/users': only('POST'); return createUser(req, await readJson(req));
      case '/auth/v1/admin/generate_link': only('POST'); return generateLink(req, await readJson(req));
      default: {
        const one = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(pathname);
        if (one) {
          let id;
          try { id = decodeURIComponent(one[1]); } catch { id = ''; }
          if (method === 'GET') return getUser(req, id);
          only('DELETE');
          return deleteUser(req, id);
        }
        return fail(404, 'not_found', 'Not found');
      }
    }
  }

  return {
    issuer,
    jwks,
    /** Answers anything under /auth/v1/; false for any other path (so the caller can route it). */
    async handle(req, res, pathname) {
      if (closed || (pathname !== '/auth/v1' && !String(pathname).startsWith('/auth/v1/'))) return false;
      try {
        const [status, body, headers] = await route(req, pathname);
        send(res, status, body, headers);
      } catch (e) {
        if (e instanceof AuthError) {
          send(res, e.status, { code: e.code, error_code: e.code, msg: e.message }, e.status === 413 ? { connection: 'close' } : {});
        } else {
          oops('[auth emulator]', e);
          send(res, 500, { code: 'unexpected_failure', error_code: 'unexpected_failure', msg: 'Unexpected failure' });
        }
      }
      return true;
    },
    /** The latest code "emailed" to this address (tests and the dev console), or null. */
    mailbox(email) {
      return mail.get(String(email ?? '').trim().toLowerCase()) ?? null;
    },
    close() {
      closed = true;
      mail.clear();
    },
  };
}
