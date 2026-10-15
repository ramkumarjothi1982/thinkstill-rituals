// A LOCAL FAKE of the Supabase Auth (GoTrue) and PostgREST endpoints the
// app uses, for browser checks and Node tests in this sandbox (which cannot
// reach *.supabase.co and has no Docker for the real local stack). It is a
// test double, not a security boundary: the real isolation is proved by
// supabase/tests/rls_check.sql and the CI job on a local Supabase stack.
//
//   node hushmallow/tools/auth/fake-supabase.mjs --port 8203 [--site http://localhost:8202]
//   import { createFakeSupabase } from './fake-supabase.mjs'  (tests: listen(0))
//
// Auth:  POST /auth/v1/signup, /token?grant_type=password|refresh_token|pkce,
//        /verify (POST token_hash; GET → redirect with ?code= for PKCE),
//        /otp, /recover, /resend, /logout, GET /reauthenticate,
//        GET|PUT /user, GET /settings
// REST:  /rest/v1/{profiles,sync_consents,preferences,favourite_worlds,
//        garden_skills,hushflow_progress} (select / eq / in / not.in,
//        insert, upsert on_conflict, update, delete), POST /rest/v1/rpc/delete_my_account
//        Row Level Security as in supabase/migrations: anon gets nothing; a
//        user reads and writes only rows whose user_id is their own; synced
//        tables need the matching consent; withdrawing consent deletes them.
// Test control (this fake only): GET /__fake/outbox, POST /__fake/reset,
//        POST /__fake/config, POST /__fake/revoke, POST /__fake/delete-user,
//        POST /__fake/age-sessions, GET /__fake/state.
// Emails are never sent: they land in the outbox with their token_hash,
// confirmation URL and one-time code, which tests read. Each one is also
// rendered from the real templates in supabase/templates/ (the ones the
// owner pastes into production and the local Supabase stack sends) and
// served by a small Mailpit-compatible API under /__fake/mailpit/api/v1/
// (GET messages, GET message/<ID>, DELETE messages), so
// tests/e2e/auth.e2e.mjs reads mail the same way here as from Mailpit in CI.
// Like Supabase Auth by default: secure password change asks for the
// reauthentication code only on a session over 24 hours old (recentLoginMs:
// 86400000; POST /__fake/age-sessions makes a session that old; 0 = always
// ask), a password change signs out every other session of the user and
// voids its outstanding email links, and GET /user for a deleted user answers
// user_not_found. Config for the E2E dry run (POST /__fake/config):
// singleToken: true (a new link replaces the previous one of its kind, as in
// Supabase Auth).
import http from 'node:http';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const now = () => Date.now();
const sec = () => Math.floor(now() / 1000);
const hashPw = (pw, salt) => createHash('sha256').update(`${salt}:${pw}`).digest('hex');

export const TABLES = Object.freeze({
  profiles: { key: ['user_id'], cols: ['user_id', 'display_name', 'home_mallow', 'created_at', 'updated_at', 'last_seen_at', 'schema_version'], insertable: ['user_id', 'display_name', 'home_mallow'], updatable: ['display_name', 'home_mallow', 'last_seen_at'] },
  sync_consents: { key: ['user_id'], cols: ['user_id', 'settings_sync', 'settings_sync_at', 'settings_withdrawn_at', 'library_sync', 'library_sync_at', 'library_withdrawn_at', 'consent_version', 'updated_at'], insertable: ['user_id', 'settings_sync', 'library_sync'], updatable: ['settings_sync', 'library_sync'] },
  preferences: { key: ['user_id'], consent: 'settings_sync', cols: ['user_id', 'sound', 'volume', 'haptics', 'motion', 'low_stim', 'save_history', 'save_words', 'seen_intro', 'auto_flow', 'subtitle_speed', 'text_scale', 'mallow', 'created_at', 'updated_at'] },
  favourite_worlds: { key: ['user_id', 'world_id'], consent: 'library_sync', cols: ['user_id', 'world_id', 'position', 'created_at'] },
  garden_skills: { key: ['user_id', 'skill_id'], consent: 'library_sync', cols: ['user_id', 'skill_id', 'saved_at', 'last_practised_at', 'practised', 'from_world', 'mallow', 'updated_at'] },
  hushflow_progress: { key: ['user_id'], consent: 'library_sync', cols: ['user_id', 'world_id', 'idx', 'sequence', 'step', 'mallow', 'seed', 'saved_at', 'updated_at'] },
});
const SYNCED = Object.entries(TABLES).filter(([, t]) => t.consent).map(([n]) => n);

/** The email each kind of message uses (supabase/templates/, as in config.toml). */
export const TEMPLATE_FILES = Object.freeze({ signup: 'confirmation.html', recovery: 'recovery.html', magiclink: 'magic_link.html', email_change: 'email_change.html', reauthentication: 'reauthentication.html' });
const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../supabase/templates');
const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/**
 * A template rendered the way Supabase Auth fills it ({{ .Name }} → vars.Name,
 * HTML-escaped); the subject is the one named on the file's first line.
 */
export function renderTemplate(kind, vars) {
  const file = TEMPLATE_FILES[kind];
  if (!file) return { subject: '', html: '' };
  const src = readFileSync(join(TEMPLATE_DIR, file), 'utf8');
  const subject = (/Subject:\s*([^\n]*?)\s*-->/.exec(src) || [])[1] || '';
  const html = src.replace(/\{\{\s*\.([A-Za-z]+)\s*\}\}/g, (_, k) => escHtml(vars[k] ?? ''));
  return { subject, html };
}

export function createFakeSupabase({ siteUrl = 'http://localhost:8202', redirectAllow = null, log = false } = {}) {
  const secret = randomBytes(32);
  // (noSchema: the project's tables were never created — every table answers 404 PGRST205, as PostgREST does;
  //  emailOff: email sign-in switched off in Auth — GET /settings says external.email false. src/auth/readiness.js)
  const cfg = { autoconfirm: false, securePasswordChange: true, recentLoginMs: 86_400_000, failRefresh: false, refreshDown: false, accessTtl: 3600, rateLimitMs: 60_000, down: false, singleToken: false, reuseIntervalMs: 10_000, restDelayMs: 0, restDelayTables: null, noSchema: false, emailOff: false };
  let users, sessions, refresh, tokens, codes, outbox, rows, lastSend, pending = 0;
  function reset() {
    users = new Map();      // id → user
    sessions = new Map();   // id → { uid, createdAt, revoked, recovery, aal }
    refresh = new Map();    // token → { sid, used }
    tokens = new Map();     // token_hash → { uid, type, email, exp, used, flow }
    codes = new Map();      // auth_code → { uid, challenge, method, type, exp, used }
    outbox = [];
    rows = Object.fromEntries(Object.keys(TABLES).map((t) => [t, []]));
    lastSend = new Map();
  }
  reset();

  // ---------------------------------------------------------------- JWT --
  function sign(payload) {
    const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'fake' }));
    const p = b64u(JSON.stringify(payload));
    return `${h}.${p}.${b64u(createHmac('sha256', secret).update(`${h}.${p}`).digest())}`;
  }
  function verifyJwt(tok) {
    const parts = String(tok || '').split('.');
    if (parts.length !== 3) return null;
    const want = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
    let got;
    try { got = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64'); } catch { return null; }
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
    try { return JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); } catch { return null; }
  }

  const userJson = (u) => ({
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
    email_confirmed_at: u.confirmedAt ? new Date(u.confirmedAt).toISOString() : null,
    confirmed_at: u.confirmedAt ? new Date(u.confirmedAt).toISOString() : null,
    last_sign_in_at: u.lastSignIn ? new Date(u.lastSignIn).toISOString() : null,
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: u.meta || {},
    identities: [{ identity_id: u.identityId, id: u.id, user_id: u.id, provider: 'email', identity_data: { email: u.email, sub: u.id } }],
    created_at: new Date(u.createdAt).toISOString(), updated_at: new Date(u.updatedAt).toISOString(), is_anonymous: false,
  });

  function newSession(u, { recovery = false } = {}) {
    const sid = randomUUID();
    sessions.set(sid, { uid: u.id, createdAt: now(), revoked: false, recovery });
    u.lastSignIn = now();
    return issue(sid);
  }
  function issue(sid) {
    const s = sessions.get(sid);
    const u = users.get(s.uid);
    const exp = sec() + cfg.accessTtl;
    const access = sign({ aud: 'authenticated', exp, iat: sec(), iss: 'fake-supabase', sub: u.id, email: u.email, role: 'authenticated', aal: 'aal1', session_id: sid, is_anonymous: false });
    const rt = b64u(randomBytes(18));
    refresh.set(rt, { sid, used: false });
    return { access_token: access, token_type: 'bearer', expires_in: cfg.accessTtl, expires_at: exp, refresh_token: rt, user: userJson(u) };
  }

  // ------------------------------------------------------------- email --
  function allowedRedirect(to) {
    if (!to) return siteUrl;
    try {
      const u = new URL(to);
      const ok = redirectAllow ? redirectAllow(u) : (['localhost', '127.0.0.1'].includes(u.hostname) && /\/auth\/callback\/?$/.test(u.pathname));
      return ok ? u.href : siteUrl;
    } catch { return siteUrl; }
  }
  function mail(kind, u, { redirectTo, flow = null, email = u.email } = {}) {
    const raw = randomBytes(20).toString('hex');
    const tokenHash = (flow ? 'pkce_' : '') + createHash('sha224').update(raw).digest('hex');
    const otp = String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
    const type = kind === 'reauthentication' ? 'reauthentication' : kind;
    // like Supabase Auth, which keeps one confirmation and one recovery token per user
    if (cfg.singleToken) {
      const slot = (t) => (t === 'signup' ? 'confirm' : t === 'recovery' || t === 'magiclink' ? 'recovery' : t);
      for (const t of tokens.values()) if (t.uid === u.id && !t.used && slot(t.type) === slot(type)) t.used = true;
    }
    tokens.set(tokenHash, { uid: u.id, type, email, exp: now() + 3600_000, used: false, flow, otp });
    const rt = allowedRedirect(redirectTo);
    const confirmationUrl = `http://${host}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${encodeURIComponent(rt)}`;
    const { subject, html } = renderTemplate(kind, { RedirectTo: rt, TokenHash: tokenHash, Token: otp, SiteURL: siteUrl, Email: u.email, NewEmail: email, ConfirmationURL: confirmationUrl });
    const msg = { id: b64u(randomBytes(9)), to: email, kind, subject, html, token_hash: tokenHash, token: otp, redirect_to: rt, confirmation_url: confirmationUrl, at: now() };
    outbox.push(msg);
    if (kind === 'reauthentication') u.reauthNonce = { otp, exp: now() + 300_000 };
    return msg;
  }
  function limited(key) {
    const t = lastSend.get(key);
    if (t && now() - t < cfg.rateLimitMs) return true;
    lastSend.set(key, now());
    return false;
  }

  // ------------------------------------------------------------- rows --
  const isoNow = () => new Date().toISOString();
  function createDefaultRows(uid, meta = {}) {
    if (!rows.profiles.some((r) => r.user_id === uid)) rows.profiles.push({ user_id: uid, display_name: typeof meta.display_name === 'string' ? meta.display_name.slice(0, 40) : null, home_mallow: null, created_at: isoNow(), updated_at: isoNow(), last_seen_at: null, schema_version: 1 });
    if (!rows.sync_consents.some((r) => r.user_id === uid)) rows.sync_consents.push({ user_id: uid, settings_sync: false, settings_sync_at: null, settings_withdrawn_at: null, library_sync: false, library_sync_at: null, library_withdrawn_at: null, consent_version: 1, updated_at: isoNow() });
  }
  function consentOn(uid, col) { return rows.sync_consents.some((r) => r.user_id === uid && r[col] === true); }
  function beforeWrite(table, row, old) {
    const t = isoNow();
    if (table === 'profiles') { row.created_at = old?.created_at || t; row.updated_at = t; row.schema_version = 1; if (!old || row.last_seen_at !== old.last_seen_at) row.last_seen_at = row.last_seen_at == null ? (old?.last_seen_at ?? null) : t; }
    else if (table === 'sync_consents') {
      for (const k of ['settings', 'library']) {
        const on = row[`${k}_sync`] === true, was = old?.[`${k}_sync`] === true;
        if (on && !was) row[`${k}_sync_at`] = t;
        if (!on && was) row[`${k}_withdrawn_at`] = t;
        if (old) { if (on === was) { row[`${k}_sync_at`] = old[`${k}_sync_at`]; row[`${k}_withdrawn_at`] = row[`${k}_withdrawn_at`] ?? old[`${k}_withdrawn_at`]; } }
      }
      row.consent_version = 1; row.updated_at = t;
    } else { if ('updated_at' in Object.fromEntries(TABLES[table].cols.map((c) => [c, 1]))) row.updated_at = t; if (TABLES[table].cols.includes('created_at')) row.created_at = row.created_at || old?.created_at || t; }
  }
  function afterWrite(table, row, old) {
    if (table !== 'sync_consents') return;
    if (old?.settings_sync === true && row.settings_sync !== true) rows.preferences = rows.preferences.filter((r) => r.user_id !== row.user_id);
    if (old?.library_sync === true && row.library_sync !== true) for (const t of ['favourite_worlds', 'garden_skills', 'hushflow_progress']) rows[t] = rows[t].filter((r) => r.user_id !== row.user_id);
  }
  const CHECKS = {
    world: (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9._-]{0,47}$/.test(v),
    skill: (v) => typeof v === 'string' && /^[a-z][a-z0-9-]{1,47}$/.test(v),
    mallow: (v) => v === null || ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'].includes(v),
  };
  function checkRow(table, r) {
    if (table === 'profiles') return (r.display_name == null || (typeof r.display_name === 'string' && r.display_name.length <= 40)) && CHECKS.mallow(r.home_mallow ?? null);
    if (table === 'favourite_worlds') return CHECKS.world(r.world_id);
    if (table === 'garden_skills') return CHECKS.skill(r.skill_id) && (r.from_world == null || CHECKS.skill(r.from_world)) && CHECKS.mallow(r.mallow ?? null);
    if (table === 'hushflow_progress') return CHECKS.world(r.world_id) && Array.isArray(r.sequence ?? []) && (r.sequence ?? []).length <= 24 && (r.sequence ?? []).every(CHECKS.world) && CHECKS.mallow(r.mallow ?? null);
    if (table === 'preferences') return ['system', 'reduced', 'full'].includes(r.motion ?? 'system') && CHECKS.mallow(r.mallow ?? null);
    return true;
  }

  // filters: col=eq.v | col=in.(a,b) | col=not.in.(a,b) | col=is.null
  function parseFilters(q) {
    const out = [];
    for (const [k, v] of q) {
      if (['select', 'on_conflict', 'order', 'limit', 'offset', 'columns'].includes(k)) continue;
      const m = /^(not\.)?(eq|neq|in|is)\.(.*)$/.exec(v);
      if (!m) { out.push({ bad: k }); continue; }
      const neg = !!m[1], op = m[2];
      let val = m[3];
      if (op === 'in') val = val.replace(/^\(|\)$/g, '').split(',').filter(Boolean).map((x) => x.replace(/^"|"$/g, ''));
      out.push({ col: k, op, val, neg });
    }
    return out;
  }
  const str = (x) => (x === null || x === undefined ? 'null' : String(x));
  function matches(r, filters) {
    return filters.every((f) => {
      if (f.bad) return false;
      let ok;
      if (f.op === 'eq') ok = str(r[f.col]) === f.val;
      else if (f.op === 'neq') ok = str(r[f.col]) !== f.val;
      else if (f.op === 'in') ok = f.val.includes(str(r[f.col]));
      else if (f.op === 'is') ok = f.val === 'null' ? r[f.col] == null : str(r[f.col]) === f.val;
      return f.neg ? !ok : ok;
    });
  }
  const pick = (r, select) => {
    if (!select || select === '*') return { ...r };
    const o = {};
    for (const c of select.split(',').map((s) => s.trim()).filter(Boolean)) o[c] = r[c] ?? null;
    return o;
  };

  // ------------------------------------------------------------ server --
  let host = 'localhost:0';
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = {
      'access-control-allow-origin': origin || '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
      'access-control-allow-headers': req.headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile,range',
      'access-control-expose-headers': 'content-range,x-supabase-api-version',
      'access-control-max-age': '600', vary: 'origin',
    };
    const send = (status, data, extra = {}) => {
      const body = data === undefined || status === 204 ? '' : JSON.stringify(data);
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...cors, ...extra });
      res.end(body);
    };
    const gerr = (status, code, msg) => send(status, { code: status, error_code: code, msg });
    const perr = (status, code, message, details = null) => send(status, { code, message, details, hint: null });
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    const url = new URL(req.url, `http://${host}`);
    let body = null;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      try { body = raw ? JSON.parse(raw) : null; } catch { return gerr(400, 'bad_json', 'Could not parse request body as JSON'); }
    }
    if (log) console.log(`[fake] ${req.method} ${url.pathname}${url.search ? url.search.replace(/(token|code|token_hash|refresh_token)=[^&]+/g, '$1=…') : ''}`);
    try {
      if (url.pathname.startsWith('/__fake/')) return control(url, body, send, req.method);
      if (cfg.down) return send(503, { message: 'down' });
      const apikey = req.headers.apikey;
      // like Supabase's gateway: email links (GET /auth/v1/verify) are opened without an API key
      const open = req.method === 'GET' && url.pathname === '/auth/v1/verify';
      if (!open && (!apikey || !/^sb_publishable_|^eyJ/.test(apikey))) return send(401, { message: 'No API key found in request', hint: 'No `apikey` request header or url param was found.' });
      if (url.pathname.startsWith('/auth/v1/')) return await authRoute(req, url, body, send, gerr, res, cors);
      if (url.pathname.startsWith('/rest/v1/')) {
        // tests: a slow network for the tables (a sync still in flight while something else happens)
        const table = url.pathname.slice('/rest/v1/'.length);
        if (cfg.restDelayMs > 0 && !table.startsWith('rpc/') && (!cfg.restDelayTables || cfg.restDelayTables.includes(table))) { pending++; try { await new Promise((r) => setTimeout(r, cfg.restDelayMs)); } finally { pending--; } }
        return restRoute(req, url, body, send, perr);
      }
      return send(404, { message: 'not found' });
    } catch (e) {
      console.error('[fake] error', e);
      return send(500, { message: 'fake server error' });
    }
  });

  function bearer(req) {
    const h = req.headers.authorization || '';
    const m = /^Bearer (.+)$/i.exec(h);
    return m ? m[1] : null;
  }
  /** The live session behind an access token, or an error code. */
  function authed(req) {
    const tok = bearer(req);
    const p = verifyJwt(tok);
    if (!p) return { err: [401, 'bad_jwt', 'invalid JWT: unable to parse or verify signature'] };
    if (p.exp < sec()) return { err: [401, 'bad_jwt', 'invalid JWT: token is expired'] };
    // like Supabase Auth (maybeLoadUserOrSession): the user first, then the session
    const u = users.get(p.sub);
    if (!u) return { err: [403, 'user_not_found', 'User from sub claim in JWT does not exist'] };
    const s = sessions.get(p.session_id);
    if (!s || s.revoked) return { err: [403, 'session_not_found', 'Session from session_id claim in JWT does not exist'] };
    return { u, s, sid: p.session_id, claims: p };
  }

  async function authRoute(req, url, body, send, gerr, res, cors) {
    const path = url.pathname.slice('/auth/v1'.length);
    const b = body || {};
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    const byEmail = (e) => [...users.values()].find((u) => u.email === e);
    const flowOf = () => (b.code_challenge ? { challenge: b.code_challenge, method: String(b.code_challenge_method || 's256').toLowerCase() } : null);

    if (path === '/settings' && req.method === 'GET') return send(200, { external: { email: !cfg.emailOff, phone: false, google: false }, disable_signup: false, mailer_autoconfirm: cfg.autoconfirm, phone_autoconfirm: false, sms_provider: '' });

    if (path === '/signup' && req.method === 'POST') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return gerr(400, 'email_address_invalid', 'Email address is invalid');
      if (typeof b.password !== 'string' || b.password.length < 8) return send(422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 8 characters.', weak_password: { reasons: ['length'] } });
      const existing = byEmail(email);
      if (existing) {
        // GoTrue with confirmations on: an obfuscated user, never "already registered"
        if (!existing.confirmedAt && !limited(`signup:${email}`)) mail('signup', existing, { redirectTo: url.searchParams.get('redirect_to'), flow: flowOf() });
        return send(200, { id: randomUUID(), aud: 'authenticated', role: 'authenticated', email, identities: [], user_metadata: {}, app_metadata: {}, created_at: isoNow(), updated_at: isoNow() });
      }
      if (limited(`signup:${email}`)) return gerr(429, 'over_email_send_rate_limit', 'email rate limit exceeded');
      const salt = b64u(randomBytes(8));
      const u = { id: randomUUID(), identityId: randomUUID(), email, salt, pw: hashPw(b.password, salt), confirmedAt: cfg.autoconfirm ? now() : null, createdAt: now(), updatedAt: now(), meta: b.data && typeof b.data === 'object' ? b.data : {} };
      users.set(u.id, u);
      createDefaultRows(u.id, u.meta);   // the on_auth_user_created trigger
      if (cfg.autoconfirm) return send(200, newSession(u));
      mail('signup', u, { redirectTo: url.searchParams.get('redirect_to'), flow: flowOf() });
      return send(200, userJson(u));
    }

    if (path === '/token' && req.method === 'POST') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const u = byEmail(email);
        if (!u || hashPw(String(b.password ?? ''), u.salt) !== u.pw) return gerr(400, 'invalid_credentials', 'Invalid login credentials');
        if (!u.confirmedAt) return gerr(400, 'email_not_confirmed', 'Email not confirmed');
        return send(200, newSession(u));
      }
      if (grant === 'refresh_token') {
        if (cfg.refreshDown) return send(503, { message: 'upstream unavailable' });
        const r = refresh.get(b.refresh_token);
        if (cfg.failRefresh || !r) return gerr(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        const s = sessions.get(r.sid);
        if (!s || s.revoked || !users.has(s.uid)) return gerr(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        // like Supabase Auth's refresh_token_reuse_interval (10 s): a token used a moment ago (a
        // page that reloaded mid-refresh, two tabs at once) still gets the session's tokens
        if (r.used && now() - r.usedAt > cfg.reuseIntervalMs) return gerr(400, 'refresh_token_already_used', 'Invalid Refresh Token: Already Used');
        if (!r.used) { r.used = true; r.usedAt = now(); }
        return send(200, issue(r.sid));
      }
      if (grant === 'pkce') {
        const c = codes.get(b.auth_code);
        if (!c || c.used || c.exp < now()) return gerr(404, 'flow_state_not_found', 'invalid flow state, no valid flow state found');
        const v = String(b.code_verifier || '');
        const want = c.method === 'plain' ? v : b64u(createHash('sha256').update(v).digest());
        if (want !== c.challenge) return gerr(403, 'bad_code_verifier', 'code challenge does not match previously saved code verifier');
        c.used = true;
        const u = users.get(c.uid);
        if (!u) return gerr(404, 'user_not_found', 'User not found');
        return send(200, newSession(u, { recovery: c.type === 'recovery' }));
      }
      return gerr(400, 'validation_failed', 'unsupported grant_type');
    }

    if (path === '/verify') {
      const th = req.method === 'GET' ? url.searchParams.get('token') : b.token_hash;
      const type = req.method === 'GET' ? url.searchParams.get('type') : b.type;
      const t = tokens.get(th);
      const typeOk = t && (t.type === type || (type === 'email' && ['signup', 'magiclink'].includes(t.type)) || (type === 'signup' && t.type === 'signup'));
      const bad = !t || t.used || t.exp < now() || !typeOk;
      if (req.method === 'GET') {
        const rt = allowedRedirect(url.searchParams.get('redirect_to'));
        if (bad) { res.writeHead(303, { ...cors, location: `${rt}#error=access_denied&error_code=otp_expired&error_description=${encodeURIComponent('Email link is invalid or has expired')}` }); res.end(); return; }
        t.used = true;
        const u = users.get(t.uid);
        if (t.type === 'signup' && !u.confirmedAt) u.confirmedAt = now();
        if (t.type === 'email_change') { u.email = t.email; }
        if (t.flow) {
          const code = randomUUID();
          codes.set(code, { uid: u.id, challenge: t.flow.challenge, method: t.flow.method, type: t.type, exp: now() + 300_000, used: false });
          res.writeHead(303, { ...cors, location: `${rt}${rt.includes('?') ? '&' : '?'}code=${code}` }); res.end(); return;
        }
        const s = newSession(u, { recovery: t.type === 'recovery' });
        res.writeHead(303, { ...cors, location: `${rt}#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=${s.expires_in}&token_type=bearer&type=${t.type}` }); res.end(); return;
      }
      if (bad) return gerr(403, 'otp_expired', 'Email link is invalid or has expired');
      t.used = true;
      const u = users.get(t.uid);
      if (!u) return gerr(403, 'otp_expired', 'Email link is invalid or has expired');
      if (t.type === 'signup' && !u.confirmedAt) u.confirmedAt = now();
      if (t.type === 'email_change') u.email = t.email;
      return send(200, newSession(u, { recovery: t.type === 'recovery' }));
    }

    if (path === '/recover' && req.method === 'POST') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return gerr(400, 'email_address_invalid', 'Email address is invalid');
      if (limited(`recover:${email}`)) return gerr(429, 'over_email_send_rate_limit', 'email rate limit exceeded');
      const u = byEmail(email);
      if (u) mail('recovery', u, { redirectTo: url.searchParams.get('redirect_to'), flow: flowOf() });
      return send(200, {});   // the same answer either way
    }
    if (path === '/resend' && req.method === 'POST') {
      if (limited(`signup:${email}`)) return gerr(429, 'over_email_send_rate_limit', 'email rate limit exceeded');
      const u = byEmail(email);
      if (u && !u.confirmedAt && b.type === 'signup') mail('signup', u, { redirectTo: url.searchParams.get('redirect_to'), flow: flowOf() });
      return send(200, {});
    }
    if (path === '/otp' && req.method === 'POST') {
      if (limited(`otp:${email}`)) return gerr(429, 'over_email_send_rate_limit', 'email rate limit exceeded');
      const u = byEmail(email);
      if (u) mail('magiclink', u, { redirectTo: url.searchParams.get('redirect_to'), flow: flowOf() });
      return send(200, {});
    }
    if (path === '/logout' && req.method === 'POST') {
      const a = authed(req);
      if (a.err) return gerr(...a.err);
      const scope = url.searchParams.get('scope') || 'global';
      for (const [sid, s] of sessions) if (s.uid === a.u.id && (scope === 'global' || (scope === 'local' ? sid === a.sid : sid !== a.sid))) s.revoked = true;
      return send(204);
    }
    if (path === '/reauthenticate' && req.method === 'GET') {
      const a = authed(req);
      if (a.err) return gerr(...a.err);
      if (limited(`reauth:${a.u.id}`)) return gerr(429, 'over_email_send_rate_limit', 'email rate limit exceeded');
      mail('reauthentication', a.u);
      return send(200, {});
    }
    if (path === '/user') {
      const a = authed(req);
      if (a.err) return gerr(...a.err);
      if (req.method === 'GET') return send(200, userJson(a.u));
      if (req.method === 'PUT') {
        if (typeof b.password === 'string') {
          if (b.password.length < 8) return send(422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 8 characters.', weak_password: { reasons: ['length'] } });
          if (hashPw(b.password, a.u.salt) === a.u.pw) return gerr(422, 'same_password', 'New password should be different from the old password.');
          const recent = a.s.recovery || (cfg.recentLoginMs > 0 && now() - a.s.createdAt < cfg.recentLoginMs);
          if (cfg.securePasswordChange && !recent) {
            if (!b.nonce) return gerr(400, 'reauthentication_needed', 'Password update requires reauthentication.');
            if (!a.u.reauthNonce || a.u.reauthNonce.exp < now() || a.u.reauthNonce.otp !== String(b.nonce)) return gerr(400, 'reauthentication_not_valid', 'Verification code not valid');
            a.u.reauthNonce = null;
          }
          a.u.salt = b64u(randomBytes(8));
          a.u.pw = hashPw(b.password, a.u.salt);
          a.u.updatedAt = now();
          // like Supabase Auth (User.UpdatePassword): every other session of the user ends, its email links stop working
          for (const [sid, s] of sessions) if (s.uid === a.u.id && sid !== a.sid) s.revoked = true;
          for (const t of tokens.values()) if (t.uid === a.u.id) t.used = true;
          a.u.reauthNonce = null;
        }
        if (typeof b.email === 'string' && b.email.toLowerCase() !== a.u.email) mail('email_change', a.u, { email: b.email.toLowerCase(), redirectTo: url.searchParams.get('redirect_to') });
        if (b.data && typeof b.data === 'object') a.u.meta = { ...a.u.meta, ...b.data };
        return send(200, userJson(a.u));
      }
    }
    return gerr(404, 'not_found', 'Not found');
  }

  function restRoute(req, url, body, send, perr) {
    const name = url.pathname.slice('/rest/v1/'.length);
    const tok = bearer(req);
    const claims = verifyJwt(tok);
    const role = claims?.role === 'authenticated' && claims.exp >= sec() ? 'authenticated' : 'anon';
    if (tok && verifyJwt(tok) && claims.exp < sec()) return send(401, { code: 'PGRST303', message: 'JWT expired', details: null, hint: null });
    const uid = role === 'authenticated' ? claims.sub : null;
    if (name === 'rpc/delete_my_account') {
      if (req.method !== 'POST') return perr(405, 'PGRST117', 'Unsupported HTTP method');
      if (!uid) return perr(401, '42501', 'permission denied for function delete_my_account');
      if (!users.has(uid)) return perr(400, 'P0002', 'no account');
      const counts = {};
      for (const t of Object.keys(TABLES)) { const before = rows[t].length; rows[t] = rows[t].filter((r) => r.user_id !== uid); counts[t] = before - rows[t].length; }
      users.delete(uid);
      for (const s of sessions.values()) if (s.uid === uid) s.revoked = true;
      return send(200, { deleted: true, rows: counts });
    }
    const T = cfg.noSchema ? null : TABLES[name];
    if (!T) return perr(404, 'PGRST205', `Could not find the table 'public.${name}' in the schema cache`);
    if (role !== 'authenticated') return perr(401, '42501', `permission denied for table ${name}`);
    const filters = parseFilters(url.searchParams);
    if (filters.some((f) => f.bad || (f.col && !T.cols.includes(f.col)))) return perr(400, 'PGRST100', 'failed to parse filter');
    const select = url.searchParams.get('select');
    const prefer = String(req.headers.prefer || '');
    const wantRep = /return=representation/.test(prefer);
    const single = /application\/vnd\.pgrst\.object\+json/.test(String(req.headers.accept || ''));
    const visible = (r) => r.user_id === uid;   // USING (user_id = auth.uid())
    const reply = (status, list) => {
      if (single) {
        if (list.length !== 1) return perr(406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned', `The result contains ${list.length} rows`);
        return send(status === 201 ? 201 : 200, list[0]);
      }
      return send(status, list);
    };
    if (req.method === 'GET' || req.method === 'HEAD') return reply(200, rows[name].filter(visible).filter((r) => matches(r, filters)).map((r) => pick(r, select)));

    const deny = () => perr(403, '42501', `new row violates row-level security policy for table "${name}"`);
    if (req.method === 'POST') {
      const list = Array.isArray(body) ? body : [body];
      const upsert = /resolution=merge-duplicates/.test(prefer);
      const conflict = (url.searchParams.get('on_conflict') || T.key.join(',')).split(',');
      const out = [];
      // all-or-nothing, like one statement
      const staged = rows[name].map((r) => ({ ...r }));
      for (const raw of list) {
        if (!raw || typeof raw !== 'object') return perr(400, 'PGRST102', 'Empty or invalid json');
        for (const k of Object.keys(raw)) if (!T.cols.includes(k)) return perr(400, 'PGRST204', `Could not find the '${k}' column of '${name}' in the schema cache`);
        if (T.insertable && Object.keys(raw).some((k) => !T.insertable.includes(k))) return perr(403, '42501', `permission denied for table ${name}`);
        if (raw.user_id !== uid) return deny();                                    // WITH CHECK (user_id = auth.uid())
        if (T.consent && !consentOn(uid, T.consent)) return deny();                // WITH CHECK (… consent on)
        if (!checkRow(name, raw)) return perr(400, '23514', `new row for relation "${name}" violates check constraint`);
        const idx = staged.findIndex((r) => conflict.every((c) => str(r[c]) === str(raw[c])));
        if (idx >= 0) {
          if (!upsert) return perr(409, '23505', `duplicate key value violates unique constraint "${name}_pkey"`);
          if (!visible(staged[idx])) return deny();
          const old = staged[idx];
          const next = { ...old, ...raw };
          beforeWrite(name, next, old);
          staged[idx] = next; out.push(next);
          afterWrite(name, next, old);
        } else {
          const next = Object.fromEntries(T.cols.map((c) => [c, raw[c] ?? null]));
          beforeWrite(name, next, null);
          staged.push(next); out.push(next);
        }
      }
      rows[name] = staged;
      return wantRep ? reply(201, out.map((r) => pick(r, select))) : send(201, undefined, {});
    }
    if (req.method === 'PATCH') {
      const patch = body || {};
      if (T.updatable && Object.keys(patch).some((k) => !T.updatable.includes(k))) return perr(403, '42501', `permission denied for table ${name}`);
      if ('user_id' in patch && patch.user_id !== uid) return deny();
      if (T.consent && !consentOn(uid, T.consent)) return deny();
      const hit = rows[name].filter(visible).filter((r) => matches(r, filters));
      const out = [];
      for (const r of hit) {
        const old = { ...r };
        Object.assign(r, patch);
        if (!checkRow(name, r)) { Object.assign(r, old); return perr(400, '23514', `new row for relation "${name}" violates check constraint`); }
        beforeWrite(name, r, old);
        afterWrite(name, r, old);
        out.push(r);
      }
      return wantRep ? reply(200, out.map((r) => pick(r, select))) : send(204);
    }
    if (req.method === 'DELETE') {
      const hit = rows[name].filter(visible).filter((r) => matches(r, filters));
      rows[name] = rows[name].filter((r) => !hit.includes(r));
      return wantRep ? reply(200, hit.map((r) => pick(r, select))) : send(204);
    }
    return perr(405, 'PGRST117', 'Unsupported HTTP method');
  }

  // the parts of Mailpit's API (https://mailpit.axllent.org/docs/api-v1/) tests/e2e/auth.e2e.mjs reads
  const mailpitSummary = (m) => ({ ID: m.id, MessageID: `${m.id}@fake-supabase`, Read: false, From: { Name: 'hushmallow (fake)', Address: 'admin@email.com' }, To: [{ Name: '', Address: m.to }], Cc: [], Bcc: [], ReplyTo: [], Subject: m.subject, Created: new Date(m.at).toISOString(), Tags: [], Size: m.html.length, Attachments: 0, Snippet: m.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) });
  function mailpit(p, method, send) {
    if (p === 'api/v1/messages' && method === 'DELETE') { outbox.length = 0; return send(200, 'ok'); }
    if (p === 'api/v1/messages') { const list = [...outbox].reverse(); return send(200, { total: list.length, unread: list.length, count: list.length, messages_count: list.length, start: 0, tags: [], messages: list.map(mailpitSummary) }); }
    const m = /^api\/v1\/message\/([A-Za-z0-9_-]+)$/.exec(p);
    if (m) { const msg = outbox.find((x) => x.id === m[1]); return msg ? send(200, { ...mailpitSummary(msg), Date: new Date(msg.at).toISOString(), Text: msg.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), HTML: msg.html, Inline: [], Attachments: [] }) : send(404, 'message not found'); }
    return send(404, 'not found');
  }
  const userOf = (b) => (b?.uid ? users.get(String(b.uid).toLowerCase()) : [...users.values()].find((x) => x.email === String(b?.email || '').toLowerCase()));

  function control(url, body, send, method = 'GET') {
    const p = url.pathname.slice('/__fake/'.length);
    if (p.startsWith('mailpit/')) return mailpit(p.slice('mailpit/'.length), method, send);
    if (p === 'outbox') { const to = url.searchParams.get('to'); return send(200, to ? outbox.filter((m) => m.to === to.toLowerCase()) : outbox); }
    if (p === 'reset') { reset(); return send(200, { ok: true }); }
    if (p === 'config') { Object.assign(cfg, body || {}); return send(200, cfg); }
    if (p === 'revoke') { const u = userOf(body); if (u) for (const s of sessions.values()) if (s.uid === u.id) s.revoked = true; return send(200, { ok: !!u }); }
    // as if the user's sessions had been created `hours` ago (Supabase Auth's 24-hour rule for the reauthentication code)
    if (p === 'age-sessions') { const u = userOf(body); const ms = Math.max(0, Number(body?.hours) || 0) * 3600_000; let n = 0; if (u) for (const s of sessions.values()) if (s.uid === u.id && !s.revoked) { s.createdAt -= ms; n++; } return send(200, { ok: !!u, sessions: n }); }
    if (p === 'delete-user') {
      const u = [...users.values()].find((x) => x.email === String(body?.email || '').toLowerCase());
      if (u) { users.delete(u.id); for (const t of Object.keys(TABLES)) rows[t] = rows[t].filter((r) => r.user_id !== u.id); for (const s of sessions.values()) if (s.uid === u.id) s.revoked = true; }
      return send(200, { ok: !!u });
    }
    if (p === 'state') {
      return send(200, {
        users: [...users.values()].map((u) => ({ id: u.id, email: u.email, confirmed: !!u.confirmedAt })),
        sessions: [...sessions.values()].filter((s) => !s.revoked).length,
        sessionsByUser: [...sessions.values()].filter((s) => !s.revoked && users.has(s.uid)).reduce((o, s) => ({ ...o, [s.uid]: (o[s.uid] || 0) + 1 }), {}),
        liveSessions: [...sessions.entries()].filter(([, s]) => !s.revoked && users.has(s.uid)).map(([sid]) => sid),
        pending,   // table requests held by restDelayMs right now
        rows: Object.fromEntries(Object.entries(rows).map(([t, list]) => [t, list.map((r) => ({ ...r }))])),
      });
    }
    return send(404, { message: 'no such control' });
  }

  return {
    server, cfg, reset,
    /** Table requests held by restDelayMs right now (tests wait for a sync to be mid-flight). */
    get pending() { return pending; },
    get outbox() { return outbox; },
    get rows() { return rows; },
    get users() { return users; },
    lastEmail: (to, kind) => [...outbox].reverse().find((m) => m.to === String(to).toLowerCase() && (!kind || m.kind === kind)) || null,
    listen(port = 0, hostname = '127.0.0.1') {
      return new Promise((resolveP) => server.listen(port, hostname, () => { host = `${hostname === '127.0.0.1' ? 'localhost' : hostname}:${server.address().port}`; resolveP(server.address().port); }));
    },
    get url() { return `http://${host}`; },
    close: () => new Promise((r) => server.close(() => r())),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const port = Number(arg('--port', 8203));
  const fake = createFakeSupabase({ siteUrl: arg('--site', 'http://localhost:8202'), log: process.argv.includes('--log') });
  await fake.listen(port, arg('--host', '127.0.0.1'));
  console.log(`fake supabase on ${fake.url} (site ${arg('--site', 'http://localhost:8202')}) — test double only`);
}
