// The Hushmates web host: the customer app, the safety team's desk, and (in development
// only, for testers) the lab. Nothing else.
//
// Two modes:
//   production   static files from the build (dist/app, dist/staff), each checked against
//                the build's manifest. No lab, no local sign-in, no API: on staging and
//                production the API is the Hushmates Edge Function on Supabase.
//   development  the app and the desk from the source tree (only the files they import),
//                plus, on the same origin, the local copy of Supabase Auth (/auth/v1/…),
//                the gateway (/functions/v1/hushmates/…, the Edge Function's own code), and
//                the lab at /lab/, which answers only to an authorised tester (a key set by
//                whoever runs the server) and is "not here" for everyone else.
//
// Every path is looked up in an allow-list, never joined onto the disk, so tricks with
// "..", encodings or case find nothing. Anything not listed is the same plain page.

import http from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg',
};
const NOT_HERE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hushmates</title></head>'
  + '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FFF8F3;color:#1F1640;font:600 17px/1.5 system-ui,sans-serif;text-align:center">'
  + '<p>This page isn’t here.<br><a href="/app/" style="color:#1F1640">Go to Hushmates</a></p></body></html>';
const TESTER_COOKIE = 'hm_tester';
const TESTER_MS = 12 * 3600e3;
const MAX_BODY = 128 * 1024;

const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const same = (a, b) => timingSafeEqual(Buffer.from(sha(a)), Buffer.from(sha(b)));

/**
 * @param {object} o
 *   mode        'production' | 'development'
 *   files       Map(urlPath → file): the customer app (and the desk, under /staff/)
 *   labFiles    development only: Map(urlPath → file) for the lab, served only to testers
 *   testerKey   development only: the key that opens the lab (none, or under 16 characters → no lab)
 *   auth        development only: the local copy of Supabase Auth ({ handle(req, res, path) })
 *   gateway     development only: the Edge Function's logic ({ handle(Request) → Response })
 */
export function createHushmatesServer({ mode = 'production', files, labFiles = null, testerKey = null, auth = null, gateway = null, secureCookies = mode === 'production', now = () => Date.now(), log = console } = {}) {
  if (!['production', 'development'].includes(mode)) throw new Error(`unknown mode ${mode}`);
  if (!(files instanceof Map) || !files.has('/app/index.html')) throw new Error('the app’s files are missing (build it first)');
  if (mode === 'production' && (labFiles || testerKey || auth || gateway)) throw new Error('a production host has no lab, no local sign-in and no API');
  const lab = mode === 'development' && typeof testerKey === 'string' && testerKey.length >= 16 && labFiles instanceof Map ? labFiles : null;
  // a build for a Supabase project talks to that project (app/config.json): the header policy allows it too,
  // as the page's own does (browsers apply both)
  let backendOrigin = '';
  try {
    const url = files.get('/app/config.json') && JSON.parse(readFileSync(files.get('/app/config.json'), 'utf8')).supabaseUrl;
    if (url) { const u = new URL(url); if (u.protocol === 'https:' || ['127.0.0.1', 'localhost'].includes(u.hostname)) backendOrigin = u.origin; }
  } catch { /* no config, or not a URL: same origin only */ }
  const testers = new Map();                                            // sha(cookie) → until

  const headers = (res, extra = {}) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (secureCookies) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  };
  const csp = (forLab) => `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'${backendOrigin ? ` ${backendOrigin}` : ''}${forLab ? ' http://127.0.0.1:8790 http://localhost:8790' : ''}; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
  const notHere = (res, head = false) => {
    headers(res, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" });
    res.writeHead(404);
    res.end(head ? undefined : NOT_HERE);
  };
  const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p.length === 2 && p[0]));
  const testerCookie = (value, maxAge) => [`${TESTER_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', secureCookies ? 'Secure' : null, `Max-Age=${maxAge}`].filter(Boolean).join('; ');
  function tester(req) {
    const raw = cookies(req)[TESTER_COOKIE];
    if (!lab || !raw || raw.length > 100) return false;
    const until = testers.get(sha(raw));
    return !!until && until > now();
  }

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
      const raw = randomBytes(32).toString('base64url');
      testers.set(sha(raw), now() + TESTER_MS);
      headers(res, { Location: '/lab/', 'Cache-Control': 'no-store', 'Set-Cookie': testerCookie(raw, TESTER_MS / 1000) });
      res.writeHead(303);
      res.end();
      return;
    }
    if (!tester(req)) { notHere(res, req.method === 'HEAD'); return; }
    const file = lab.get(url.pathname === '/lab/' ? '/lab/index.html' : url.pathname);
    if (!file) { notHere(res); return; }
    serve(req, res, file, { forLab: true });
  }

  /** The Edge Function's own code, run here for development (on Supabase it runs on Deno). */
  async function toGateway(req, res, url) {
    const chunks = [];
    let size = 0;
    for await (const c of req) { size += c.length; if (size > MAX_BODY) { notHere(res); return; } chunks.push(c); }
    // the caller's address comes from the connection, never from a header they could write themselves
    const forwarded = ['x-forwarded-for', 'x-real-ip', 'forwarded'];
    const passed = Object.entries(req.headers).filter(([k, v]) => typeof v === 'string' && !forwarded.includes(k));
    const request = new Request(`http://${req.headers.host || 'localhost'}${url.pathname}${url.search}`, {
      method: req.method, headers: [...passed, ['x-forwarded-for', req.socket.remoteAddress || 'unknown']],
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const response = await gateway.handle(request);
    headers(res, Object.fromEntries(response.headers));
    res.writeHead(response.status);
    res.end(Buffer.from(await response.arrayBuffer()));
  }

  const server = http.createServer(async (req, res) => {
    let url;
    try { url = new URL(req.url, 'http://hushmates'); decodeURIComponent(url.pathname); } catch { notHere(res); return; }
    const path = url.pathname;
    try {
      if (auth && path.startsWith('/auth/v1/')) { if (!(await auth.handle(req, res, path))) notHere(res); return; }
      if (gateway && (path === '/functions/v1/hushmates' || path.startsWith('/functions/v1/hushmates/'))) { await toGateway(req, res, url); return; }
      if (path === '/' || path === '/app') { headers(res, { Location: '/app/', 'Cache-Control': 'no-store' }); res.writeHead(302); res.end(); return; }
      if (path === '/staff' && files.has('/staff/index.html')) { headers(res, { Location: '/staff/', 'Cache-Control': 'no-store' }); res.writeHead(302); res.end(); return; }
      if (path === '/lab' || path.startsWith('/lab/')) { labRoute(req, res, url); return; }
      const file = files.get(path === '/app/' ? '/app/index.html' : path === '/staff/' ? '/staff/index.html' : path);
      // files only the lab loads (its copy of shared code under /src/ultra/) are for testers too
      if (!file && lab && tester(req) && lab.has(path)) { serve(req, res, lab.get(path), { forLab: true }); return; }
      if (!file) { notHere(res, req.method === 'HEAD'); return; }
      serve(req, res, file);
    } catch (e) {
      log.error?.('request failed', e?.message || e);
      if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Something went wrong on our side. Please try again in a moment.'); } else res.end();
    }
  });

  return { server, mode, hasLab: !!lab, close: () => new Promise((r) => server.close(r)) };
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
