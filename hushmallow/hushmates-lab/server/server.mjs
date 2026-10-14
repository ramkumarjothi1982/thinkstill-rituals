// The Hushmates server: the customer app, its API, and nothing else.
//
// Two modes:
//   production   serves the built app (dist/app, tools/build-app.mjs) and the
//                API. There are no lab or testing routes at all: /lab/ is an
//                ordinary "not here" page, test identities can't exist
//                (RelayService testMode is off), and fixed testing examples
//                are refused as Mallow perspectives (cannedExamples is off).
//   development  serves the app from the source tree (only files the app
//                imports), the API, and the lab at /lab/, which answers only
//                to an authorised tester (a key set by whoever runs the
//                server) and is "not here" for everyone else, signed in or not.
//
// Who someone is comes only from an HttpOnly session cookie, mapped here to
// an internal session the browser never sees. Every change needs a header a
// page on another site can't send, JSON, and (when the browser says) our own
// origin. The API reaches only the methods a person may use (CLIENT_METHODS
// and MODERATOR_METHODS, which check the moderator role themselves).
// Nothing here calls a paid AI service: Mallow perspectives come from the
// Reframe library (rule-based, free, on this server).
//
// This is the pilot's reference server for local and staging use. Production
// integration (Supabase Auth and Postgres, docs/RELAY.md §5) needs approval.

import http from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { RelayService, CLIENT_METHODS, MODERATOR_METHODS } from '../core/relay.js';
import { libraryProvider } from '../core/perspectives.js';

const API = new Set([...CLIENT_METHODS, ...MODERATOR_METHODS]);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg',
};
const STATUS = { 'not-signed-in': 401, forbidden: 403, 'account-inactive': 403, 'not-found': 404, 'rate-limited': 429, invalid: 400 };
const GENTLE = 'Something went wrong on our side. Please try again in a moment.';
const NOT_HERE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hushmates</title></head>'
  + '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FFF8F3;color:#1F1640;font:600 17px/1.5 system-ui,sans-serif;text-align:center">'
  + '<p>This page isn’t here.<br><a href="/app/" style="color:#1F1640">Go to Hushmates</a></p></body></html>';
const SESSION_COOKIE = 'hm_session';
const TESTER_COOKIE = 'hm_tester';
const SESSION_IDLE_MS = 30 * 86400e3;
const TESTER_MS = 12 * 3600e3;

const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const same = (a, b) => { const x = Buffer.from(sha(a)); const y = Buffer.from(sha(b)); return timingSafeEqual(x, y); };

/**
 * @param {object} o
 *   mode         'production' | 'development'
 *   files        Map(urlPath → absolute file) the app may load (production: from the build's manifest)
 *   labFiles     development only: Map(urlPath → file) for the lab (served only to testers)
 *   testerKey    development only: the key that opens the lab (none → no lab at all)
 *   invites      [{ code, role: 'member' | 'moderator' }] invitations this server accepts
 *   statePath    where to keep state between restarts (none → memory only)
 *   secureCookies  mark cookies Secure (on by default in production)
 *   provider, now, random, log   for tests
 */
export function createHushmatesServer({
  mode = 'production', files, labFiles = null, testerKey = null, invites = [], statePath = null,
  secureCookies = mode === 'production', provider = libraryProvider(), now = () => Date.now(), random, log = console,
} = {}) {
  if (!['production', 'development'].includes(mode)) throw new Error(`unknown mode ${mode}`);
  if (!(files instanceof Map) || !files.has('/app/index.html')) throw new Error('the app’s files are missing (build it first)');
  const dev = mode === 'development';
  const lab = dev && typeof testerKey === 'string' && testerKey.length >= 16 && labFiles instanceof Map ? labFiles : null;
  if (mode === 'production' && (labFiles || testerKey)) throw new Error('a production server has no lab');

  // ------------------------------------------------------------ state --
  const saved = statePath && existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null;
  const service = new RelayService({ state: saved?.relay || null, now, random, provider, cannedExamples: false, testMode: false });
  const sessions = new Map(Object.entries(saved?.sessions || {}));       // sha(cookie) → { token, accountId, seenAt }
  const inviteBook = new Map(Object.entries(saved?.invites || {}));     // sha(code) → { role, accountId, nameHash, usedAt }
  for (const inv of invites) {
    const key = sha(String(inv.code).trim().toUpperCase());
    if (!inviteBook.has(key)) inviteBook.set(key, { role: inv.role === 'moderator' ? 'moderator' : 'member', accountId: null, nameHash: null, usedAt: null });
  }
  const testers = new Map();                                            // sha(cookie) → { until }
  let writing = null;
  const persist = () => {
    if (!statePath || writing) return;
    writing = setTimeout(() => {
      writing = null;
      mkdirSync(dirname(statePath), { recursive: true });
      const tmp = `${statePath}.tmp`;
      writeFileSync(tmp, JSON.stringify({ relay: service.toJSON(), sessions: Object.fromEntries(sessions), invites: Object.fromEntries(inviteBook) }), { mode: 0o600 });
      renameSync(tmp, statePath);
    }, 250);
  };
  service.onPersist = persist;
  const ticker = setInterval(() => { try { service.tick(); } catch (e) { log.error?.('tick failed', e); } }, 15e3);
  ticker.unref?.();

  // ---------------------------------------------------------- helpers --
  const headers = (res, extra = {}) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  };
  const csp = (forLab) => `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'${forLab ? ' http://127.0.0.1:8790 http://localhost:8790' : ''}; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
  const json = (res, status, body, extra = {}) => {
    headers(res, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
    res.writeHead(status);
    res.end(JSON.stringify(body));
  };
  const notHere = (res, head = false) => {
    headers(res, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" });
    res.writeHead(404);
    res.end(head ? undefined : NOT_HERE);
  };
  const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p.length === 2 && p[0]).map(([k, v]) => [k, v]));
  const cookie = (name, value, { maxAge, path = '/' } = {}) => [`${name}=${value}`, `Path=${path}`, 'HttpOnly', 'SameSite=Strict', secureCookies ? 'Secure' : null, maxAge != null ? `Max-Age=${maxAge}` : null].filter(Boolean).join('; ');

  function who(req) {
    const raw = cookies(req)[SESSION_COOKIE];
    if (!raw || raw.length > 100) return null;
    const key = sha(raw);
    const s = sessions.get(key);
    if (!s) return null;
    if (now() - s.seenAt > SESSION_IDLE_MS || !service.s.sessions[s.token]) { sessions.delete(key); persist(); return null; }
    s.seenAt = now();
    return { key, ...s };
  }
  function tester(req) {
    const raw = cookies(req)[TESTER_COOKIE];
    if (!lab || !raw || raw.length > 100) return false;
    const t = testers.get(sha(raw));
    if (!t || t.until < now()) return false;
    return true;
  }
  /** A change must come from our own pages: custom header (cross-site pages can't send it), JSON, our origin. */
  function sameSite(req) {
    if (req.headers['x-hushmates'] !== '1') return false;
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return false;
    const origin = req.headers.origin;
    if (origin && origin !== 'null') {
      try { if (new URL(origin).host !== req.headers.host) return false; } catch { return false; }
    } else if (origin === 'null') return false;
    const site = req.headers['sec-fetch-site'];
    if (site && !['same-origin', 'none'].includes(site)) return false;
    return true;
  }
  function body(req, limit = 64 * 1024) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('too large'), { code: 'invalid' })); req.destroy(); } else chunks.push(c); });
      req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(Object.assign(new Error('bad json'), { code: 'invalid' })); } });
      req.on('error', reject);
    });
  }
  const attempts = new Map();                                           // ip → [times] (invitation guesses)
  function limited(req, max = 10, windowMs = 15 * 60e3) {
    const ip = req.socket.remoteAddress || '?';
    const t = now();
    const list = (attempts.get(ip) || []).filter((x) => t - x < windowMs);
    attempts.set(ip, list);
    if (list.length >= max) return true;
    list.push(t);
    return false;
  }
  const streams = new Map();                                            // service token → Set(res)
  function endStreams(tok) { for (const r of streams.get(tok) || []) r.end(); streams.delete(tok); }
  function startSession(res, accountId) {
    const raw = token();
    const tok = service.issueSession(accountId);
    sessions.set(sha(raw), { token: tok, accountId, seenAt: now() });
    persist();
    return cookie(SESSION_COOKIE, raw, { maxAge: SESSION_IDLE_MS / 1000 });
  }
  function endSession(s) {
    if (!s) return;
    service.endSession(s.token);
    sessions.delete(s.key);
    endStreams(s.token);
    persist();
  }
  const clear = () => cookie(SESSION_COOKIE, '', { maxAge: 0 });

  // ------------------------------------------------------------- API --
  async function api(req, res, path) {
    if (path === '/api/v1/session') {
      if (req.method === 'GET') { json(res, 200, { ok: true, signedIn: !!who(req) }); return; }
      if (!sameSite(req)) { json(res, 403, { ok: false, code: 'forbidden', message: 'That isn’t something you can do here.' }); return; }
      if (req.method === 'DELETE') { endSession(who(req)); json(res, 200, { ok: true, signedIn: false }, { 'Set-Cookie': clear() }); return; }
      if (req.method !== 'POST') { json(res, 405, { ok: false, code: 'invalid', message: 'That isn’t something you can do here.' }); return; }
      if (limited(req)) { json(res, 429, { ok: false, code: 'rate-limited', message: 'That’s a lot of tries. Please wait a little and try again.' }); return; }
      let form;
      try { form = await body(req, 4096); } catch { json(res, 400, { ok: false, code: 'invalid', message: 'Something didn’t go through. Please try again.' }); return; }
      const code = typeof form.invite === 'string' ? form.invite.trim().toUpperCase() : '';
      const name = typeof form.name === 'string' ? form.name : '';
      if (form.adult !== true) { json(res, 400, { ok: false, code: 'invalid', message: 'Hushmates is for adults (18+) during the pilot.' }); return; }
      const inv = code && code.length <= 64 ? inviteBook.get(sha(code)) : null;
      const wrong = () => json(res, 400, { ok: false, code: 'invalid', message: 'That invitation code and name don’t match an invitation. Please check them and try again.' });
      if (!inv) { wrong(); return; }
      let accountId = inv.accountId;
      if (accountId) {
        // coming back: the same invitation and the same name open the same account (it was never deleted)
        const acc = service.s.accounts[accountId];
        if (!acc || acc.state === 'deleted' || !inv.nameHash || !same(inv.nameHash, sha(name.trim().toLowerCase()))) { wrong(); return; }
      } else {
        try { accountId = service.createMember({ pseudonym: name, role: inv.role, adult: true }); } catch (e) { json(res, 400, { ok: false, code: 'invalid', message: e.message }); return; }
        Object.assign(inv, { accountId, nameHash: sha(name.trim().toLowerCase()), usedAt: now() });
      }
      json(res, 200, { ok: true, signedIn: true }, { 'Set-Cookie': startSession(res, accountId) });
      return;
    }

    const s = who(req);
    if (path === '/api/v1/events') {
      if (req.method !== 'GET') { json(res, 405, { ok: false, code: 'invalid', message: 'That isn’t something you can do here.' }); return; }
      if (!s) { json(res, 401, { ok: false, code: 'not-signed-in', message: 'Please sign in again.' }); return; }
      headers(res, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.writeHead(200);
      res.write(': hello\n\n');
      let unsub = () => {};
      try { unsub = service.subscribe(s.token, (ev) => res.write(`data: ${JSON.stringify({ type: ev.type, scope: ev.scope })}\n\n`)); } catch { res.end(); return; }
      const set = streams.get(s.token) || new Set();
      if (set.size >= 4) { const oldest = set.values().next().value; set.delete(oldest); oldest.end(); }   // a few tabs, not a flood
      set.add(res); streams.set(s.token, set);
      const beat = setInterval(() => res.write(': still here\n\n'), 25e3);
      beat.unref?.();
      req.on('close', () => { clearInterval(beat); unsub(); set.delete(res); });
      return;
    }

    const m = /^\/api\/v1\/rpc\/([A-Za-z]{1,40})$/.exec(path);
    if (!m) { json(res, 404, { ok: false, code: 'not-found', message: 'That isn’t available.' }); return; }
    if (req.method !== 'POST') { json(res, 405, { ok: false, code: 'invalid', message: 'That isn’t something you can do here.' }); return; }
    if (!sameSite(req)) { json(res, 403, { ok: false, code: 'forbidden', message: 'That isn’t something you can do here.' }); return; }
    if (!s) { json(res, 401, { ok: false, code: 'not-signed-in', message: 'Please sign in again.' }); return; }
    const method = m[1];
    if (!API.has(method) || typeof service[method] !== 'function') { json(res, 404, { ok: false, code: 'not-found', message: 'That isn’t available.' }); return; }
    let input;
    try { input = await body(req); } catch { json(res, 400, { ok: false, code: 'invalid', message: 'Something didn’t go through. Please try again.' }); return; }
    const args = input && typeof input === 'object' && !Array.isArray(input) && input.args && typeof input.args === 'object' && !Array.isArray(input.args) ? input.args : {};
    try {
      const result = await service[method](s.token, args);
      const extra = {};
      if (method === 'deleteMyData') { endSession(s); extra['Set-Cookie'] = clear(); }
      json(res, 200, { ok: true, result }, extra);
    } catch (e) {
      if (e?.name === 'RelayError') { json(res, STATUS[e.code] || 409, { ok: false, code: e.code, message: e.message }); return; }
      log.error?.(`rpc ${method} failed`, e);                      // details stay in the server's log
      json(res, 500, { ok: false, code: 'error', message: GENTLE });
    }
  }

  // ---------------------------------------------------------- static --
  function serve(req, res, file, { forLab = false } = {}) {
    if (!['GET', 'HEAD'].includes(req.method)) { notHere(res); return; }
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const html = type.startsWith('text/html');
    headers(res, { 'Content-Type': type, 'Cache-Control': html || forLab ? 'no-store' : 'no-cache', ...(html ? { 'Content-Security-Policy': csp(forLab) } : {}) });
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
  }

  function labRoute(req, res, url) {
    if (!lab) { notHere(res, req.method === 'HEAD'); return; }
    // a tester opens /lab/?key=… once (as with a notebook server's token); the key becomes an HttpOnly cookie
    const key = url.searchParams.get('key');
    if (key != null && req.method === 'GET' && url.pathname === '/lab/') {
      if (!same(key, testerKey)) { notHere(res); return; }
      const raw = token();
      testers.set(sha(raw), { until: now() + TESTER_MS });
      headers(res, { Location: '/lab/', 'Cache-Control': 'no-store', 'Set-Cookie': cookie(TESTER_COOKIE, raw, { maxAge: TESTER_MS / 1000, path: '/' }) });
      res.writeHead(303);
      res.end();
      return;
    }
    if (!tester(req)) { notHere(res, req.method === 'HEAD'); return; }
    const path = url.pathname === '/lab/' ? '/lab/index.html' : url.pathname;
    const file = lab.get(path);
    if (!file) { notHere(res); return; }
    serve(req, res, file, { forLab: true });
  }

  const server = http.createServer(async (req, res) => {
    let url;
    try { url = new URL(req.url, 'http://hushmates'); decodeURIComponent(url.pathname); } catch { json(res, 400, { ok: false, code: 'invalid', message: 'That page isn’t here.' }); return; }
    const path = url.pathname;
    try {
      if (path.startsWith('/api/')) { await api(req, res, path); return; }
      if (path === '/' || path === '/app') { headers(res, { Location: '/app/', 'Cache-Control': 'no-store' }); res.writeHead(302); res.end(); return; }
      if (path === '/lab' || path.startsWith('/lab/')) { labRoute(req, res, url); return; }
      const file = files.get(path === '/app/' ? '/app/index.html' : path);
      // files only the lab loads (the lab's own copy of shared code under /src/ultra/) are for testers too
      if (!file && lab && tester(req) && lab.has(path)) { serve(req, res, lab.get(path), { forLab: true }); return; }
      if (!file) { notHere(res, req.method === 'HEAD'); return; }
      serve(req, res, file);
    } catch (e) {
      log.error?.('request failed', e);
      if (!res.headersSent) json(res, 500, { ok: false, code: 'error', message: GENTLE });
      else res.end();
    }
  });

  return {
    server, service, mode, hasLab: !!lab,
    close() { clearInterval(ticker); for (const set of streams.values()) for (const r of set) r.end(); return new Promise((r) => server.close(r)); },
  };
}

/** The production file list: exactly what the build wrote and recorded (each file checked against its hash). */
export function builtFiles(dist) {
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
  const files = new Map();
  for (const [url, { sha256 }] of Object.entries(manifest.files)) {
    const file = join(dist, url);
    if (createHash('sha256').update(readFileSync(file)).digest('hex') !== sha256) throw new Error(`${url} changed after the build`);
    files.set(url, file);
  }
  return files;
}
