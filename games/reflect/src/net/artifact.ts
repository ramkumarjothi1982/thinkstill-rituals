/* Live rooms inside a claude.ai artifact, over the artifact's `room` capability (no server of our own).
 *
 * The person who opens an invite hosts the room: their browser runs the same RoomHub the Durable Object runs. Guests
 * talk to the host on topic `rf.c`; the host answers each guest on `rf.s`. Everyone in an artifact room hears every
 * message, so every message is end-to-end encrypted between that guest and the host (ECDH P-256 → AES-GCM): other
 * guests cannot read anyone's sealed verdict or private view. The host device holds the room (like a game console
 * on the coffee table); for strict server-side privacy use the Reflect room server instead.
 * Messages over the 4 KiB event limit are split into chunks; the host re-sends each guest's view every few seconds so
 * a dropped message heals itself. If the host closes the page, the room ends (nothing persists in artifact rooms). */
import type { ClientMsg, ServerMsg, RitualId } from '../room/protocol';
import { RoomHub, Conn } from '../room/hub';
import { REGISTRY } from '../rituals/registry';
import type { Transport, Status } from './client';

type RoomNS = any; type NamedRoom = any;
const TOPIC_C = 'rf.c', TOPIC_S = 'rf.s';
const CHUNK = 2800;

const b64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const unb64 = (s: string) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const enc = new TextEncoder(), dec = new TextDecoder();
const rid = () => Math.random().toString(36).slice(2, 10);

async function keyPair() { return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']) as Promise<CryptoKeyPair>; }
async function pubJwk(k: CryptoKey) { const j: any = await crypto.subtle.exportKey('jwk', k); return { x: j.x, y: j.y }; }
async function shared(priv: CryptoKey, pub: { x: string; y: string }) {
  const p = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y, ext: true } as JsonWebKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  return crypto.subtle.deriveKey({ name: 'ECDH', public: p }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(key: CryptoKey, obj: any): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64(out);
}
async function open(key: CryptoKey, s: string): Promise<any> {
  const u = unb64(s);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12));
  return JSON.parse(dec.decode(pt));
}
/** Split a sealed string into ≤4 KiB events and put it back together on the other side. */
async function sendChunked(nr: NamedRoom, topic: string, head: Record<string, any>, body: string) {
  const id = rid(), n = Math.max(1, Math.ceil(body.length / CHUNK));
  for (let i = 0; i < n; i++) { try { await nr.emit(topic, { ...head, id, i, n, d: body.slice(i * CHUNK, (i + 1) * CHUNK) }); } catch (e) { return; } }
}
class Reassembler {
  private parts = new Map<string, { n: number; got: string[]; c: number; at: number }>();
  push(m: any): string | null {
    if (!m || typeof m.id !== 'string' || typeof m.d !== 'string' || !(m.n >= 1 && m.n <= 64) || !(m.i >= 0 && m.i < m.n)) return null;
    if (m.n === 1) return m.d;
    let e = this.parts.get(m.id);
    if (!e) { e = { n: m.n, got: new Array(m.n), c: 0, at: Date.now() }; this.parts.set(m.id, e); }
    if (e.got[m.i] == null) { e.got[m.i] = m.d; e.c++; }
    if (e.c === e.n) { this.parts.delete(m.id); return e.got.join(''); }
    if (this.parts.size > 40) { const old = Date.now() - 10000; this.parts.forEach((v, k) => { if (v.at < old) this.parts.delete(k); }); }
    return null;
  }
}

/** The host side: an in-page RoomHub plus the bridge to guests. The host's own client talks to it directly. */
export class ArtifactHost {
  hub: RoomHub;
  private nr: NamedRoom | null = null;
  private kp: CryptoKeyPair | null = null;
  private guests = new Map<string, { conn: Conn; key: Promise<CryptoKey>; last: number }>();
  private asm = new Map<string, Reassembler>();
  private offs: (() => void)[] = [];
  private timer: any = 0;
  private stopped = false;
  constructor(private roomNs: Promise<RoomNS | null>, public code: string, ritual: RitualId, private onStatus: (s: Status) => void) {
    this.hub = new RoomHub(REGISTRY, code, ritual);
    this.start();
  }
  private async start() {
    const room = await this.roomNs;
    if (!room || this.stopped) { this.onStatus(room ? 'closed' : 'closed'); return; }
    try {
      this.kp = await keyPair();
      this.nr = await room.join('reflect-' + this.code.toLowerCase());
      await this.nr.presence({ rf: 'host', code: this.code, pub: await pubJwk(this.kp.publicKey) });
      this.offs.push(this.nr.on(TOPIC_C, (m: any) => this.onGuest(m)));
      this.offs.push(this.nr.onPeers((ch: any) => { for (const p of ch.left) this.drop(p.peer); }));
      this.onStatus('open');
      // heal dropped messages: re-send each guest's current view every few seconds
      this.timer = setInterval(() => this.guests.forEach((g) => { if (g.conn.pid) g.conn.send({ t: 'state', view: this.hub.core.view(g.conn.pid) }); }), 4000);
    } catch (e) { this.onStatus('closed'); }
  }
  private async onGuest(m: any) {
    if (!m || m.sameTab || !m.data || typeof m.data !== 'object') return;
    const peer = m.peer as string, d = m.data;
    let g = this.guests.get(peer);
    if (!g) {
      if (!d.pub || typeof d.pub.x !== 'string' || typeof d.pub.y !== 'string') return;
      const key = shared(this.kp!.privateKey, d.pub);
      const conn: Conn = { send: (msg: ServerMsg) => { key.then(k => seal(k, msg)).then(body => this.nr && sendChunked(this.nr, TOPIC_S, { to: peer }, body)).catch(() => {}); } };
      g = { conn, key, last: Date.now() };
      this.guests.set(peer, g);
      this.hub.open(conn);
    }
    g.last = Date.now();
    let a = this.asm.get(peer); if (!a) { a = new Reassembler(); this.asm.set(peer, a); }
    const body = a.push(d); if (!body) return;
    try { const msg: ClientMsg = await open(await g.key, body); this.hub.message(g.conn, msg); } catch (e) { /* not for us / tampered */ }
  }
  private drop(peer: string) { const g = this.guests.get(peer); if (g) { this.hub.close(g.conn); this.guests.delete(peer); this.asm.delete(peer); } }
  stop() { this.stopped = true; clearInterval(this.timer); this.offs.forEach(f => { try { f(); } catch (e) { /* gone */ } }); if (this.nr) this.nr.leave().catch(() => {}); }
}

/** The host's own seat: a direct connection to the in-page hub. */
export class HostSelfTransport implements Transport {
  private conn: Conn | null = null;
  constructor(private host: ArtifactHost) {}
  start(onMsg: (m: ServerMsg) => void, onStatus: (s: Status) => void) {
    this.conn = { send: (m) => setTimeout(() => onMsg(JSON.parse(JSON.stringify(m))), 0) };
    this.host.hub.open(this.conn);
    onStatus('open');
  }
  send(m: ClientMsg) { if (this.conn) this.host.hub.message(this.conn, JSON.parse(JSON.stringify(m))); }
  stop() { if (this.conn) this.host.hub.close(this.conn); this.conn = null; this.host.stop(); }
}

/** A guest's connection to the host's browser. */
export class ArtifactGuestTransport implements Transport {
  private nr: NamedRoom | null = null;
  private key: CryptoKey | null = null;
  private pub: { x: string; y: string } | null = null;
  private me: string | null = null;
  private queue: ClientMsg[] = [];
  private asm = new Reassembler();
  private offs: (() => void)[] = [];
  private stopped = false;
  constructor(private roomNs: Promise<RoomNS | null>, private code: string) {}
  async start(onMsg: (m: ServerMsg) => void, onStatus: (s: Status) => void) {
    onStatus('connecting');
    const room = await this.roomNs;
    if (!room || this.stopped) { onStatus('closed'); onMsg({ t: 'error', code: 'no_live_rooms' }); return; }
    try {
      const kp = await keyPair();
      this.pub = await pubJwk(kp.publicKey);
      this.nr = await room.join('reflect-' + this.code.toLowerCase());
      const findHost = () => (this.nr.peers() as any[]).find(p => p.presence && p.presence.rf === 'host' && p.presence.code === this.code && p.presence.pub);
      const self = () => (this.nr.peers() as any[]).find(p => p.sameTab);
      let host: any = null;
      for (let i = 0; i < 60 && !host && !this.stopped; i++) { host = findHost(); if (!host) await new Promise(r => setTimeout(r, 250)); }
      if (!host) { onStatus('closed'); onMsg({ t: 'error', code: 'no_host' }); return; }
      this.key = await shared(kp.privateKey, host.presence.pub);
      const meP = self(); this.me = meP ? meP.peer : null;
      this.offs.push(this.nr.on(TOPIC_S, async (m: any) => {
        if (!m || !m.data || (this.me && m.data.to !== this.me)) return;
        if (!this.me) return;
        const body = this.asm.push(m.data); if (!body) return;
        try { onMsg(await open(this.key!, body)); } catch (e) { /* someone else's */ }
      }));
      this.offs.push(this.nr.onPeers((ch: any) => {
        if (!this.me) { const s = self(); if (s) this.me = s.peer; }
        if (ch.left.some((p: any) => p.peer === host.peer)) { onStatus('closed'); onMsg({ t: 'error', code: 'host_left' }); }
      }));
      onStatus('open');
      const q = this.queue.splice(0); for (const m of q) this.send(m);
    } catch (e) { onStatus('closed'); onMsg({ t: 'error', code: 'no_live_rooms' }); }
  }
  send(m: ClientMsg) {
    if (!this.nr || !this.key || !this.pub) { this.queue.push(m); return; }
    const pub = this.pub, nr = this.nr;
    seal(this.key, m).then(body => sendChunked(nr, TOPIC_C, { pub }, body)).catch(() => {});
  }
  stop() { this.stopped = true; this.offs.forEach(f => { try { f(); } catch (e) { /* gone */ } }); if (this.nr) this.nr.leave().catch(() => {}); }
}
