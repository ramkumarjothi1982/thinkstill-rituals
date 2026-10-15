// Serves a built site (tools/build-site.sh output) with its _headers applied
// the way Cloudflare Pages applies them, for the CSP sweep and header tests:
//   node hushmallow/tools/site/pages-headers.mjs <dir> [port]
//
// _headers (written from Cloudflare's documentation and its open-source asset
// server, workers-sdk pages-shared; not Cloudflare itself):
//   * a rule is a URL pattern on its own line, then indented "Name: value"
//     lines; "! Name" removes a header; # starts a comment;
//   * a pattern is a path (or an absolute https://host/path URL); "*" (splat)
//     matches any characters, slashes included; ":name" matches one path
//     segment; matching is on the path only (no query);
//   * EVERY matching rule applies, in file order: the first rule to set a
//     header replaces Pages' default for it, a later rule setting the same
//     header appends ", value"; "! Name" deletes it at that point;
//   * Pages' own defaults (applied before the rules): Cache-Control
//     "public, max-age=0, must-revalidate", Access-Control-Allow-Origin "*",
//     Referrer-Policy "strict-origin-when-cross-origin", X-Content-Type-Options
//     "nosniff".
// Routing follows tools/auth/pages-serve.mjs (/dir/ → index.html, /x.html →
// 308 /x, /dir → 308 /dir/, unknown paths → /index.html with 200 when no
// 404.html: what Pages does for a single-page app).
import http from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream' };

export const PAGES_DEFAULTS = Object.freeze([
  ['Cache-Control', 'public, max-age=0, must-revalidate'],
  ['Access-Control-Allow-Origin', '*'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['X-Content-Type-Options', 'nosniff'],
]);

/** [{ pattern, re, host, set: [[name, value]], unset: [name] }] in file order. */
export function parseHeadersFile(text) {
  const rules = [];
  let cur = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const t = raw.trim();
    if (!t || t.startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      let pattern = t, host = null;
      const abs = /^https?:\/\/([^/]+)(\/.*)?$/.exec(t);
      if (abs) { host = abs[1]; pattern = abs[2] || '/'; }
      const re = new RegExp(`^${pattern.split(/(\*|:[A-Za-z]\w*)/).map((p) => (p === '*' ? '(.*)' : /^:[A-Za-z]/.test(p) ? '([^/]+)' : p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))).join('')}$`);
      cur = { pattern: t, re, host, set: [], unset: [] };
      rules.push(cur);
      continue;
    }
    if (!cur) continue;
    const un = /^!\s*([^:\s]+)\s*$/.exec(t);
    if (un) { cur.unset.push(un[1]); continue; }
    const m = /^([^:]+):\s*(.*)$/.exec(t);
    if (m) cur.set.push([m[1].trim(), m[2].trim()]);
  }
  return rules;
}

/** The response headers for a path: Pages' defaults, then every matching rule in order. Returns a Map(lowercased name → { name, value }). */
export function headersFor(rules, pathname, { host = null, defaults = PAGES_DEFAULTS } = {}) {
  const out = new Map();
  for (const [k, v] of defaults) out.set(k.toLowerCase(), { name: k, value: v });
  const setByRules = new Set();
  for (const r of rules) {
    if (r.host && host && r.host !== host) continue;
    if (!r.re.test(pathname)) continue;
    for (const n of r.unset) out.delete(n.toLowerCase());
    for (const [k, v] of r.set) {
      const key = k.toLowerCase();
      const prev = out.get(key);
      if (setByRules.has(key) && prev) out.set(key, { name: prev.name, value: `${prev.value}, ${v}` });
      else { out.set(key, { name: k, value: v }); setByRules.add(key); }
    }
  }
  return out;
}

/** The patterns of every rule matching a path (tests). */
export const matchingRules = (rules, pathname) => rules.filter((r) => r.re.test(pathname)).map((r) => r.pattern);

/**
 * A Pages-like server for a built site. `intercept(req, res, url)` may answer
 * a request first (return true), e.g. a mock API.
 */
export function createServer(dir, { intercept = null } = {}) {
  const root = resolve(dir);
  const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
  const hp = join(root, '_headers');
  const rules = () => parseHeadersFile(existsSync(hp) ? readFileSync(hp, 'utf8') : '');
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://local');
    if (intercept && intercept(req, res, url)) return;
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end(); return; }
    if (path.includes('\0') || normalize(path).includes('..')) { res.writeHead(400); res.end(); return; }
    const hs = headersFor(rules(), url.pathname, { host: req.headers.host || null });
    const extra = Object.fromEntries([...hs.values()].map(({ name, value }) => [name, value]));
    const send = (file, status = 200) => {
      res.writeHead(status, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', ...extra });
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(file).pipe(res);
    };
    const redirect = (to) => { res.writeHead(308, { location: to + url.search, ...extra }); res.end(); };
    const p = join(root, path);
    if (path.endsWith('/index.html')) return redirect(path.slice(0, -'index.html'.length));
    if (path.endsWith('.html') && isFile(p)) return redirect(path.slice(0, -5));
    if (path.endsWith('/') && isFile(join(p, 'index.html'))) return send(join(p, 'index.html'));
    if (!path.endsWith('/') && isFile(p) && !path.endsWith('/_headers')) return send(p);
    if (!path.endsWith('/') && isFile(join(p, 'index.html'))) return redirect(`${path}/`);
    if (!path.endsWith('/') && isFile(`${p}.html`)) return send(`${p}.html`);
    if (isFile(join(root, '404.html'))) return send(join(root, '404.html'), 404);
    return send(join(root, 'index.html'));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, port = '8204'] = process.argv.slice(2);
  if (!dir) { console.error('usage: node pages-headers.mjs <dir> [port]'); process.exit(2); }
  createServer(dir).listen(Number(port), '127.0.0.1', () => console.log(`pages-like server (with _headers): ${resolve(dir)} on http://127.0.0.1:${port}`));
}
