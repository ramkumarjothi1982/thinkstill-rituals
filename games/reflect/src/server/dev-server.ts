/* Local Reflect server for development and two-device testing (Node + ws). One port serves the dev page, the Bubble
 * art and the live rooms, using the same RoomHub as the Cloudflare Durable Object.
 *   node games/reflect/dist/dev-server.js [port] [--static=<dir>] [--img=<bubble-expressions dir>] [--host=0.0.0.0]
 * Rooms: ws://<host>:<port>/room/<CODE>?ritual=<id>      Health: http://<host>:<port>/health */
declare const require: any; declare const process: any;
const http = require('http');
const fs = require('fs');
const pathMod = require('path');
const { WebSocketServer } = require('ws');
import { RoomHub } from '../room/hub';
import { LIMITS, RitualId } from '../room/protocol';
import { REGISTRY } from '../rituals/registry';

const args: string[] = process.argv.slice(2);
const opt = (k: string) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : ''; };
const port = Number(args.find(a => /^\d+$/.test(a)) || process.env.PORT || 8790);
const host = opt('host') || '127.0.0.1';
const staticDir = opt('static') ? pathMod.resolve(opt('static')) : '';
const imgDir = opt('img') ? pathMod.resolve(opt('img')) : '';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2'
};
function serveFile(root: string, rel: string, res: any) {
  const file = pathMod.resolve(root, '.' + rel);
  if (file !== root && !file.startsWith(root + pathMod.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err: any, buf: any) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[pathMod.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  });
}

const rooms = new Map<string, RoomHub>();
const server = http.createServer((req: any, res: any) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, rooms: rooms.size })); return; }
  let rel = decodeURIComponent(u.pathname);
  if (imgDir && rel.startsWith('/img/')) { serveFile(imgDir, rel.slice(4), res); return; }
  if (!staticDir) { res.writeHead(404); res.end(); return; }
  if (rel.endsWith('/')) rel += 'index.html';
  serveFile(staticDir, rel, res);
});

const wss = new WebSocketServer({ noServer: true, maxPayload: LIMITS.maxMessageBytes });
server.on('upgrade', (req: any, socket: any, head: any) => {
  const u = new URL(req.url, 'http://x');
  if (!/^\/room\/[A-Z2-9]{5}$/.test(u.pathname)) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws: any) => wss.emit('connection', ws, req));
});
wss.on('connection', (ws: any, req: any) => {
  const url = new URL(req.url, 'http://x');
  const code = url.pathname.slice(6);
  const ritual = (url.searchParams.get('ritual') || 'group-think-glitch') as RitualId;
  let hub = rooms.get(code);
  if (!hub) { hub = new RoomHub(REGISTRY, code, REGISTRY[ritual] ? ritual : 'group-think-glitch'); rooms.set(code, hub); }
  const conn = { send: (msg: any) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }, pid: undefined as string | undefined };
  hub.open(conn);
  ws.on('message', (data: any) => hub!.message(conn, String(data)));
  ws.on('close', () => hub!.close(conn));
});
server.listen(port, host, () => console.log(`reflect dev server on http://${host}:${port}  (rooms: ws://${host}:${port}/room/<CODE>)`));
