/* ThinkStill Reflect room server — Cloudflare Worker + Durable Object (one object per room code).
 *
 *   GET  /room/<CODE>?ritual=<id>   (WebSocket upgrade)   → the room's Durable Object
 *   GET  /health                                          → "ok"
 *
 * The Durable Object owns the authoritative RoomCore: it validates every action, keeps sealed submissions private until
 * the reveal, survives eviction by persisting a snapshot, and uses the WebSocket Hibernation API so idle rooms cost
 * nothing. Allowed browser origins come from env.ALLOWED_ORIGINS (comma-separated, "https://*.framer.app" style wildcards). */
import { RoomHub, Conn } from '../room/hub';
import { LIMITS, RitualId, ServerMsg } from '../room/protocol';
import { REGISTRY } from '../rituals/registry';

interface Env { ROOMS: any; ALLOWED_ORIGINS?: string; }

function originAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return list.some(p => {
    if (p === origin) return true;
    const m = p.match(/^(https?:\/\/)\*\.(.+)$/);
    return !!m && origin.startsWith(m[1]) && origin.slice(m[1].length).endsWith('.' + m[2]);
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok');
    const m = url.pathname.match(/^\/room\/([A-Z2-9]{5})$/);
    if (!m) return new Response('not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    if (!originAllowed(req.headers.get('Origin'), env)) return new Response('origin not allowed', { status: 403 });
    const id = env.ROOMS.idFromName(m[1]);
    return env.ROOMS.get(id).fetch(req);
  }
};

export class ReflectRoom {
  private hub: RoomHub | null = null;
  constructor(private state: any, private env: Env) {}
  private async load(code: string, ritual: RitualId) {
    if (this.hub) return this.hub;
    const snap = await this.state.storage.get('snap');
    const hub = new RoomHub(REGISTRY, code, REGISTRY[ritual] ? ritual : 'group-think-glitch', snap || undefined);
    hub.onPersist = (s) => { this.state.storage.put('snap', s); };
    // re-attach hibernated sockets
    for (const ws of this.state.getWebSockets()) {
      const att = ws.deserializeAttachment() || {};
      const c: Conn = { pid: att.pid, send: (msg: ServerMsg) => { try { ws.send(JSON.stringify(msg)); } catch (e) { /* closed */ } } };
      (ws as any).__conn = c; hub.open(c);
    }
    this.hub = hub;
    return hub;
  }
  private conn(ws: any): Conn {
    if (!ws.__conn) {
      const att = ws.deserializeAttachment() || {};
      ws.__conn = { pid: att.pid, send: (msg: ServerMsg) => { try { ws.send(JSON.stringify(msg)); } catch (e) { /* closed */ } } };
    }
    return ws.__conn;
  }
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const code = (url.pathname.match(/([A-Z2-9]{5})$/) || [])[1] || 'XXXXX';
    const ritual = (url.searchParams.get('ritual') || 'group-think-glitch') as RitualId;
    await this.state.storage.put('meta', { code, ritual });
    const hub = await this.load(code, ritual);
    const pair = new (globalThis as any).WebSocketPair();
    const [client, server] = Object.values(pair) as any[];
    this.state.acceptWebSocket(server);
    hub.open(this.conn(server));
    return new Response(null, { status: 101, webSocket: client } as any);
  }
  async webSocketMessage(ws: any, msg: string | ArrayBuffer) {
    const meta = (await this.state.storage.get('meta')) || { code: 'XXXXX', ritual: 'group-think-glitch' };
    const hub = await this.load(meta.code, meta.ritual);
    const c = this.conn(ws);
    const raw = typeof msg === 'string' ? msg : new TextDecoder().decode(msg);
    if (raw.length > LIMITS.maxMessageBytes) { c.send({ t: 'error', code: 'too_large' }); return; }
    const before = c.pid;
    hub.message(c, raw);
    if (c.pid && c.pid !== before) ws.serializeAttachment({ pid: c.pid });
  }
  async webSocketClose(ws: any) {
    const meta = (await this.state.storage.get('meta')) || { code: 'XXXXX', ritual: 'group-think-glitch' };
    const hub = await this.load(meta.code, meta.ritual);
    hub.close(this.conn(ws));
  }
  async webSocketError(ws: any) { await this.webSocketClose(ws); }
}
