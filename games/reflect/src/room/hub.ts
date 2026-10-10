/* RoomHub: wires one RoomCore to a set of live connections. Shared by the Cloudflare Durable Object, the local dev
 * server and the in-page solo host, so every transport behaves identically. */
import { RoomCore, Snapshot } from './core';
import { ClientMsg, LIMITS, RitualId, ServerMsg } from './protocol';
import { RitualLogic } from './ritual';

export interface Conn { send(msg: ServerMsg): void; pid?: string; }

export class RoomHub {
  core: RoomCore;
  conns = new Set<Conn>();
  onPersist?: (snap: Snapshot) => void;
  constructor(registry: Record<string, RitualLogic>, code: string, ritual: RitualId, snap?: Snapshot, now?: () => number) {
    this.core = new RoomCore(registry, code, ritual, snap, now);
  }
  open(c: Conn) { this.conns.add(c); }
  close(c: Conn) {
    this.conns.delete(c);
    if (c.pid && ![...this.conns].some(o => o.pid === c.pid)) { this.core.disconnect(c.pid); this.broadcast(); }
  }
  message(c: Conn, raw: string | ClientMsg) {
    let m: ClientMsg;
    try {
      if (typeof raw === 'string') { if (raw.length > LIMITS.maxMessageBytes) return c.send({ t: 'error', code: 'too_large' }); m = JSON.parse(raw); }
      else m = raw;
    } catch (e) { return c.send({ t: 'error', code: 'bad_json' }); }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') return c.send({ t: 'pong', at: m.at, serverNow: Date.now() });
    if (m.t === 'hello') {
      const r = this.core.join(m.name, m.avatar, m.token);
      if ('error' in r) return c.send({ t: 'error', code: r.error });
      // the newest connection for a seat wins (a reconnect can arrive before the old socket is noticed as closed)
      this.conns.forEach(o => { if (o !== c && o.pid === r.pid) { o.pid = undefined; o.send({ t: 'error', code: 'replaced' }); } });
      c.pid = r.pid;
      c.send({ t: 'welcome', pid: r.pid, token: r.token, view: this.core.view(r.pid) });
      this.broadcast(c);
      return;
    }
    if (m.t === 'act') {
      if (!c.pid) return c.send({ t: 'error', code: 'say_hello_first' });
      const res = this.core.act(c.pid, String(m.id || ''), m.kind, m.data);
      if (!res.ok) return c.send({ t: 'error', code: res.code, actId: m.id });
      this.broadcast();
    }
  }
  broadcast(except?: Conn) {
    this.conns.forEach(c => { if (c !== except && c.pid) c.send({ t: 'state', view: this.core.view(c.pid) }); });
    if (this.onPersist) this.onPersist(this.core.snapshot());
  }
}
