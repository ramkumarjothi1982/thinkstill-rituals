// Tiny static server rooted at the repository root, so stage pages can import
// the approved Mallow engine read-only from ../hushmallow/src/, plus the render
// farm's binary frame sink.
//
//   node render/serve.mjs            → http://localhost:8123/hushmallow-infinite-studio/stage/
//   import { startServer } from './serve.mjs'   (the frozen render/render.mjs uses startServer(port) and REPO_ROOT)
//
// Frame sink (WP-01, plan step P1): a page POSTs each frame's raw RGBA bytes to
// /__hm/sink/<token>/<frame> (engine/stage.js readback()). The bytes arrive in
// one Buffer, are handed to the sink's onFrame(i, buf), and the request is
// answered only once onFrame has resolved, so a slow encoder applies
// back-pressure to the page instead of buffering frames in memory. This replaces
// stage2's base64-through-the-debugger readback (about 404 ms per frame).
//
// GET only serves files inside the repository; nothing is ever written.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..');
export const SINK_PREFIX = '/__hm/sink/';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.svg': 'image/svg+xml',
};

const inside = (file, root) => {
  const rel = path.relative(root, file);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

function sendStatic(req, res, url, onServe) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let file = path.resolve(REPO_ROOT, rel);
  if (!inside(file, REPO_ROOT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : buf);
    onServe?.({ url: url.pathname, file, bytes: buf });
  });
}

function receiveFrame(sinks, req, res, url) {
  const [token, idx, extra] = url.pathname.slice(SINK_PREFIX.length).split('/');
  const sink = sinks.get(token);
  const fail = (code, msg) => { if (!res.headersSent) res.writeHead(code, { 'content-type': 'text/plain' }).end(msg); req.resume(); };
  if (req.method !== 'POST') return fail(405, 'POST only');
  if (!sink || extra !== undefined || !/^\d+$/.test(idx || '')) return fail(404, `no frame sink ${url.pathname}`);
  const len = Number(req.headers['content-length']);
  if (!Number.isInteger(len) || (sink.bytes && len !== sink.bytes)) return fail(400, `frame of ${req.headers['content-length']} bytes, expected ${sink.bytes}`);
  const buf = Buffer.allocUnsafe(len);
  let off = 0, overflow = false;
  req.on('data', (c) => {
    if (overflow || off + c.length > len) { overflow = true; return; }
    c.copy(buf, off);
    off += c.length;
  });
  req.on('error', () => {});
  req.on('end', () => {
    if (overflow || off !== len) return fail(400, `frame body ${off} bytes, expected ${len}`);
    Promise.resolve()
      .then(() => sink.onFrame(Number(idx), buf))
      .then(() => res.writeHead(204).end(), (e) => fail(500, String(e?.message || e)));
  });
}

/**
 * Start the server on 127.0.0.1. options.onServe({ url, file, bytes }) is called
 * for every file delivered (the worker hashes them into the job's asset log).
 * The server gets addSink(onFrame, { bytes }) → { token, url(i), close() }.
 */
export function startServer(port = 0, { onServe } = {}) {
  const sinks = new Map();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith(SINK_PREFIX)) receiveFrame(sinks, req, res, url);
    else sendStatic(req, res, url, onServe);
  });
  server.addSink = (onFrame, { bytes = 0 } = {}) => {
    const token = crypto.randomBytes(8).toString('hex');
    sinks.set(token, { onFrame, bytes });
    return { token, url: (i) => `${SINK_PREFIX}${token}/${i}`, close: () => sinks.delete(token) };
  };
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startServer(Number(process.env.PORT) || 8123);
  const { port } = server.address();
  console.log(`Stage preview:  http://localhost:${port}/hushmallow-infinite-studio/stage/?video=my-brain-at-2am`);
  console.log(`Engine preview: http://localhost:${port}/hushmallow-infinite-studio/engine/index.html?direction=my-brain-at-2am-v2`);
}
