/* RoomClient + transports.
 *  - LocalTransport: an in-page RoomHub (solo play with labelled Bubble companions; also the reference behaviour).
 *  - WsTransport: the Reflect room server (Cloudflare Durable Object, or the local dev server), with reconnect + rejoin.
 * The client never decides outcomes: it sends intents and renders the views the authority sends back. */
import type { ClientMsg, RoomView, ServerMsg, Slug, RitualId, ActKind } from '../room/protocol';
import { RoomHub, Conn } from '../room/hub';
import { REGISTRY } from '../rituals/registry';

export type Status = 'connecting' | 'open' | 'reconnecting' | 'closed';
export interface Transport {
  start(onMsg: (m: ServerMsg) => void, onStatus: (s: Status) => void): void;
  send(m: ClientMsg): void;
  stop(): void;
}

export class LocalTransport implements Transport {
  private hub: RoomHub;
  private conn: Conn | null = null;
  constructor(code: string, ritual: RitualId) { this.hub = new RoomHub(REGISTRY, code, ritual); }
  start(onMsg: (m: ServerMsg) => void, onStatus: (s: Status) => void) {
    this.conn = { send: (m) => setTimeout(() => onMsg(JSON.parse(JSON.stringify(m))), 0) };
    this.hub.open(this.conn);
    onStatus('open');
  }
  send(m: ClientMsg) { if (this.conn) this.hub.message(this.conn, JSON.parse(JSON.stringify(m))); }
  stop() { if (this.conn) this.hub.close(this.conn); this.conn = null; }
}

export class WsTransport implements Transport {
  private ws: WebSocket | null = null;
  private queue: string[] = [];
  private stopped = false;
  private tries = 0;
  private timer: any = 0;
  constructor(private url: string) {}
  start(onMsg: (m: ServerMsg) => void, onStatus: (s: Status) => void) {
    const open = () => {
      if (this.stopped) return;
      onStatus(this.tries ? 'reconnecting' : 'connecting');
      let ws: WebSocket;
      try { ws = new WebSocket(this.url); } catch (e) { retry(); return; }
      this.ws = ws;
      ws.onopen = () => { this.tries = 0; onStatus('open'); this.onOpen && this.onOpen(); const q = this.queue.splice(0); q.forEach(s => ws.send(s)); };
      ws.onmessage = (ev) => { try { onMsg(JSON.parse(String(ev.data))); } catch (e) { /* ignore malformed */ } };
      ws.onclose = () => { this.ws = null; if (!this.stopped) retry(); };
      ws.onerror = () => { try { ws.close(); } catch (e) { /* closed */ } };
    };
    const retry = () => {
      onStatus('reconnecting');
      const wait = Math.min(8000, 400 * Math.pow(1.7, this.tries++));
      this.timer = setTimeout(open, wait);
    };
    open();
  }
  onOpen?: () => void;
  send(m: ClientMsg) {
    const s = JSON.stringify(m);
    if (this.ws && this.ws.readyState === 1) this.ws.send(s); else this.queue.push(s);
  }
  stop() { this.stopped = true; clearTimeout(this.timer); try { this.ws && this.ws.close(); } catch (e) { /* closed */ } }
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** One player's connection to one room. */
export class RoomClient {
  view: RoomView | null = null;
  pid: string | null = null;
  status: Status = 'connecting';
  clockSkew = 0;                     // serverNow - Date.now(), for synchronised starts
  private subs = new Set<(v: RoomView) => void>();
  private errs = new Set<(code: string) => void>();
  private statusSubs = new Set<(s: Status) => void>();
  private pending: { id: string; kind: ActKind; data: any }[] = [];
  constructor(private t: Transport, private code: string, private me: { name: string; avatar: Slug }, private storeKey?: string) {}
  connect(ritual?: RitualId) {
    const token = this.storeKey ? safeGet(this.storeKey) || undefined : undefined;
    if (this.t instanceof WsTransport) (this.t as WsTransport).onOpen = () => this.hello(ritual);
    this.t.start((m) => this.onMsg(m), (s) => { this.status = s; this.statusSubs.forEach(f => f(s)); });
    if (!(this.t instanceof WsTransport)) this.hello(ritual, token);
    return this;
  }
  private hello(ritual?: RitualId, token?: string) {
    const tok = token || (this.storeKey ? safeGet(this.storeKey) || undefined : undefined);
    this.t.send({ t: 'hello', room: this.code, token: tok, name: this.me.name, avatar: this.me.avatar, ritual });
    // re-send intents that may not have arrived before a drop; the server ignores duplicates by id
    this.pending.forEach(p => this.t.send({ t: 'act', id: p.id, kind: p.kind, data: p.data }));
  }
  private onMsg(m: ServerMsg) {
    if (m.t === 'welcome') {
      this.pid = m.pid;
      if (this.storeKey) safeSet(this.storeKey, m.token);
      this.setView(m.view);
    } else if (m.t === 'state') this.setView(m.view);
    else if (m.t === 'error') { if (m.actId) this.pending = this.pending.filter(p => p.id !== m.actId); this.errs.forEach(f => f(m.code)); }
  }
  private setView(v: RoomView) {
    if (this.view && v.v < this.view.v && v.round === this.view.round) return;   // stale
    this.clockSkew = v.serverNow - Date.now();
    this.view = v;
    this.pending = this.pending.slice(-8);
    this.subs.forEach(f => f(v));
  }
  act(kind: ActKind, data?: any) {
    const id = uid();
    this.pending.push({ id, kind, data });
    if (this.pending.length > 16) this.pending.shift();
    this.t.send({ t: 'act', id, kind, data });
    return id;
  }
  on(f: (v: RoomView) => void) { this.subs.add(f); if (this.view) f(this.view); return () => this.subs.delete(f); }
  onError(f: (code: string) => void) { this.errs.add(f); return () => this.errs.delete(f); }
  onStatus(f: (s: Status) => void) { this.statusSubs.add(f); return () => this.statusSubs.delete(f); }
  serverNow() { return Date.now() + this.clockSkew; }
  get isHost() { return !!(this.view && this.pid && this.view.hostPid === this.pid); }
  get mePlayer() { return this.view ? this.view.players.find(p => p.pid === this.pid) || null : null; }
  close() { this.subs.clear(); this.errs.clear(); this.statusSubs.clear(); this.t.stop(); }
}

function safeGet(k: string) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
export function newRoomCode(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = new Uint8Array(5); crypto.getRandomValues(b);
  return Array.from(b, x => A[x % A.length]).join('');
}
