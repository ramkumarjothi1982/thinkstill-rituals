// Development only: a stand-in for the static host (Cloudflare Pages) in the staging rehearsal
// (tools/staging-e2e.mjs --rehearse). It serves the folder tools/pack-site.mjs makes the way
// Pages does: a folder's index.html for its path, the `_headers` rules on every response, the
// `_redirects` lines, `404.html` for anything else; and nothing outside the folder.

import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg',
};

/** `_headers`: a path pattern (/* or a path) followed by indented "Name: value" lines. */
function parseHeaders(text) {
  const rules = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); continue; }
    const m = /^\s+([^:]+):\s*(.*)$/.exec(line);
    if (m && cur) cur.headers[m[1].trim()] = m[2].trim();
  }
  return rules;
}
const matches = (pattern, path) => (pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path);

export function createStaticSite({ root }) {
  const base = resolve(root);
  const rules = existsSync(join(base, '_headers')) ? parseHeaders(readFileSync(join(base, '_headers'), 'utf8')) : [];
  const redirects = existsSync(join(base, '_redirects'))
    ? readFileSync(join(base, '_redirects'), 'utf8').split('\n').map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 2 && p[0].startsWith('/'))
    : [];
  const headersFor = (path) => Object.assign({}, ...rules.filter((r) => matches(r.pattern, path)).map((r) => r.headers));
  const server = http.createServer((req, res) => {
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); res.end(); return; }
    const redirect = redirects.find(([from]) => from === path);
    if (redirect) { res.writeHead(Number(redirect[2] || 302), { location: redirect[1], ...headersFor(path) }); res.end(); return; }
    let file = normalize(join(base, path));
    if (!file.startsWith(base + sep) && file !== base) { res.writeHead(404); res.end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    const found = existsSync(file) && statSync(file).isFile() && !/(^|\/)_(headers|redirects)$/.test(file);
    const target = found ? file : join(base, '404.html');
    res.writeHead(found ? 200 : 404, { 'content-type': TYPES[extname(target)] || 'application/octet-stream', ...headersFor(path) });
    res.end(req.method === 'HEAD' ? undefined : readFileSync(target));
  });
  return {
    server,
    listen: (port = 0, host = '127.0.0.1') => new Promise((r) => server.listen(port, host, () => r(`http://${host}:${server.address().port}`))),
    close: () => new Promise((r) => server.close(r)),
  };
}
