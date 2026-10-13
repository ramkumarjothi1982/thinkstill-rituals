// Serves a built site (tools/build-site.sh output) the way Cloudflare Pages
// does, for local checks of /auth/callback and deep links:
//   * an exact file is served;
//   * /dir/ serves /dir/index.html; /dir (when /dir/index.html exists) is a
//     308 to /dir/ with the query kept; /page serves /page.html; /page.html
//     is a 308 to /page;
//   * anything else: with no top-level 404.html the site is treated as a
//     single-page app and /index.html is served with 200 (what Pages does);
//     with a 404.html, that page with 404;
//   * _headers rules (path patterns with * splats) are added to matching responses.
// It mirrors the documented behaviour closely enough for these checks; it is
// not Cloudflare. Usage: node hushmallow/tools/auth/pages-serve.mjs <dir> [port]
import http from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

export function parseHeaders(text) {
  const rules = [];
  let cur = null;
  for (const raw of String(text || '').split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { cur = { pattern: raw.trim(), headers: [] }; rules.push(cur); continue; }
    const m = /^\s+([^:]+):\s*(.*)$/.exec(raw);
    if (m && cur) cur.headers.push([m[1].trim(), m[2].trim()]);
  }
  return rules.map((r) => ({ ...r, re: new RegExp(`^${r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`) }));
}

export function createPagesServer(dir) {
  const root = resolve(dir);
  const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
  const rules = () => parseHeaders(existsSync(join(root, '_headers')) ? readFileSync(join(root, '_headers'), 'utf8') : '');
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://local');
    let path = decodeURIComponent(url.pathname);
    if (path.includes('\0') || normalize(path).includes('..')) { res.writeHead(400); res.end(); return; }
    const extra = {};
    for (const r of rules()) if (r.re.test(url.pathname)) for (const [k, v] of r.headers) extra[k] = v;
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
    if (!path.endsWith('/') && isFile(p)) return send(p);
    if (!path.endsWith('/') && isFile(join(p, 'index.html'))) return redirect(`${path}/`);
    if (!path.endsWith('/') && isFile(`${p}.html`)) return send(`${p}.html`);
    if (isFile(join(root, '404.html'))) return send(join(root, '404.html'), 404);
    return send(join(root, 'index.html'));   // no 404.html: single-page app fallback
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, port = '8202'] = process.argv.slice(2);
  if (!dir) { console.error('usage: node pages-serve.mjs <dir> [port]'); process.exit(2); }
  createPagesServer(dir).listen(Number(port), '127.0.0.1', () => console.log(`pages-like server: ${resolve(dir)} on http://localhost:${port}`));
}
