/* RoomCore: the authoritative Reflect room. Pure logic with no I/O, so the same code runs inside the Cloudflare Durable
 * Object, the local dev server and (for solo play with Bubble companions) the browser itself.
 *
 * Guarantees: host-only controls; actions validated by the ritual's rules; private submissions ("seal") stored here and
 * withheld from every other player until the reveal; duplicate actions ignored by id; rejoin by token restores the seat
 * and the player's own sealed payload; late joiners become spectators; caps on seats, live events and message rates. */
import { LIMITS, Player, RoomView, RitualId, Slug, SLUGS, LiveEvent, cleanName } from './protocol';
import { RitualLogic, Seat, mulberry32, hashStr } from './ritual';

export interface Snapshot {
  view: Omit<RoomView, 'serverNow' | 'mine' | 'you'>;
  secrets: Record<string, any>;
  tokens: Record<string, string>;     // token -> pid
  liveN: number;
}

export type ActResult = { ok: true } | { ok: false; code: string };

const rand = (n: number) => {
  const b = new Uint8Array(n);
  (globalThis.crypto as Crypto).getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
};
const COMPANION_NAMES: Record<Slug, string> = { loopie: 'Loopie', glitch: 'Glitch', patch: 'Patch', drop: 'Drop', rush: 'Rush', still: 'Still', sync: 'Sync' };

export class RoomCore {
  private s: Snapshot;
  private seen: Record<string, string[]> = {};
  private lastLive: Record<string, number> = {};
  constructor(private registry: Record<string, RitualLogic>, code: string, ritual: RitualId, snap?: Snapshot, private now: () => number = () => Date.now()) {
    this.s = snap || {
      view: { code, v: 1, hostPid: null, ritual, phase: 'lobby', seed: 0, round: 0, players: [], pub: null, sealed: {}, revealed: null, live: [], consent: {}, startedAt: null },
      secrets: {}, tokens: {}, liveN: 0
    };
  }
  snapshot(): Snapshot { return JSON.parse(JSON.stringify(this.s)); }
  get logic(): RitualLogic { return this.registry[this.s.view.ritual]; }
  get phase() { return this.s.view.phase; }
  private bump() { this.s.view.v++; }
  private player(pid: string) { return this.s.view.players.find(p => p.pid === pid); }
  private participants() { return this.s.view.players.filter(p => !p.spectator); }
  private humans() { return this.s.view.players.filter(p => p.human); }

  /** Join or rejoin. A valid token restores the same seat; otherwise a new player (spectator if the ritual is running). */
  join(name: string, avatar: Slug, token?: string): { pid: string; token: string } | { error: string } {
    if (token && this.s.tokens[token]) {
      const pid = this.s.tokens[token];
      const p = this.player(pid);
      if (p) { p.connected = true; if (!this.s.view.hostPid) this.s.view.hostPid = pid; this.bump(); return { pid, token }; }
      delete this.s.tokens[token];
    }
    if (this.humans().length >= LIMITS.maxHumans + 2) return { error: 'room_full' };
    const running = this.s.view.phase !== 'lobby';
    const seatsTaken = this.participants().length;
    const spectator = running || this.participants().filter(p => p.human).length >= Math.min(LIMITS.maxHumans, this.logic.max) || seatsTaken >= this.logic.max && !this.dropCompanionForHuman();
    const pid = 'p' + rand(4);
    const tok = rand(16);
    this.s.tokens[tok] = pid;
    this.s.view.players.push({ pid, name: this.uniqueName(cleanName(name)), avatar: SLUGS.includes(avatar) ? avatar : 'loopie', human: true, connected: true, seat: this.nextSeat(), spectator });
    if (!this.s.view.hostPid) this.s.view.hostPid = pid;
    this.bump();
    return { pid, token: tok };
  }
  /** In the lobby, a human arriving takes the seat of a companion when the ritual is full. */
  private dropCompanionForHuman(): boolean {
    const c = this.s.view.players.filter(p => !p.human).pop();
    if (!c) return false;
    this.s.view.players = this.s.view.players.filter(p => p !== c);
    return true;
  }
  /** Two people called "Player" become "Player" and "Player 2", so every reveal row is distinguishable. */
  private uniqueName(n: string, except?: string): string {
    const taken = new Set(this.s.view.players.filter(p => p.pid !== except).map(p => p.name.toLowerCase()));
    if (!taken.has(n.toLowerCase())) return n;
    let i = 2; while (taken.has((n + ' ' + i).toLowerCase())) i++;
    return (n.slice(0, LIMITS.maxName - 3) + ' ' + i);
  }
  private nextSeat() { return this.s.view.players.reduce((m, p) => Math.max(m, p.seat + 1), 0); }

  disconnect(pid: string) {
    const p = this.player(pid);
    if (!p || !p.connected) return;
    p.connected = false;
    if (this.s.view.hostPid === pid) {
      const next = this.humans().find(h => h.connected && h.pid !== pid);
      if (next) this.s.view.hostPid = next.pid;
    }
    this.bump();
    this.maybeReveal();
  }

  act(pid: string, id: string, kind: string, data: any): ActResult {
    const p = this.player(pid);
    if (!p) return { ok: false, code: 'not_in_room' };
    const seen = (this.seen[pid] = this.seen[pid] || []);
    if (id) { if (seen.includes(id)) return { ok: true }; seen.push(id); if (seen.length > 64) seen.shift(); }
    const v = this.s.view, host = v.hostPid === pid, L = this.logic;
    switch (kind) {
      case 'ritual': {
        if (!host || v.phase !== 'lobby') return { ok: false, code: 'not_allowed' };
        if (!this.registry[data && data.ritual]) return { ok: false, code: 'bad_ritual' };
        v.ritual = data.ritual; this.bump(); return { ok: true };
      }
      case 'add_companion': {
        if (!host || v.phase !== 'lobby') return { ok: false, code: 'not_allowed' };
        if (this.participants().length >= L.max || v.players.length >= LIMITS.maxSeats) return { ok: false, code: 'full' };
        const used = new Set(v.players.filter(x => !x.human).map(x => x.avatar));
        const want: Slug = data && SLUGS.includes(data.avatar) && !used.has(data.avatar) ? data.avatar : (SLUGS.find(s => !used.has(s)) || 'loopie');
        v.players.push({ pid: 'c-' + want, name: COMPANION_NAMES[want], avatar: want, human: false, connected: true, seat: this.nextSeat(), spectator: false });
        this.bump(); return { ok: true };
      }
      case 'remove_player': {
        if (!host || !data || data.pid === pid) return { ok: false, code: 'not_allowed' };
        const t = this.player(data.pid);
        if (!t) return { ok: false, code: 'no_player' };
        v.players = v.players.filter(x => x !== t);
        Object.keys(this.s.tokens).forEach(k => { if (this.s.tokens[k] === t.pid) delete this.s.tokens[k]; });
        delete this.s.secrets[t.pid]; delete v.sealed[t.pid];
        this.bump(); this.maybeReveal(); return { ok: true };
      }
      case 'rename': {
        if (v.phase !== 'lobby') return { ok: false, code: 'not_allowed' };
        p.name = this.uniqueName(cleanName(data && data.name), p.pid);
        if (data && SLUGS.includes(data.avatar)) p.avatar = data.avatar;
        this.bump(); return { ok: true };
      }
      case 'start': {
        if (!host || v.phase !== 'lobby') return { ok: false, code: 'not_allowed' };
        const parts = this.participants();
        if (parts.length < L.min) return { ok: false, code: 'need_players' };
        if (parts.length > L.max) return { ok: false, code: 'too_many' };
        v.seed = (data && Number.isFinite(data.seed) ? data.seed : hashStr(v.code + this.now())) >>> 0;
        v.round++;
        const seats: Seat[] = parts.slice().sort((a, b) => a.seat - b.seat).map(x => ({ pid: x.pid, seat: x.seat, avatar: x.avatar, human: x.human, name: x.name }));
        v.pub = L.setup(v.seed, seats, data);
        v.sealed = {}; v.revealed = null; v.live = []; v.consent = {}; v.startedAt = this.now(); v.phase = 'play';
        this.s.secrets = {};
        // companions take their turns by their authored rules, immediately and visibly labelled
        const rng = mulberry32(v.seed ^ 0x9e3779b9);
        seats.filter(x => !x.human).forEach(x => { this.s.secrets[x.pid] = L.companionSeal(v.pub, x, rng); v.sealed[x.pid] = true; });
        this.bump(); this.maybeReveal(); return { ok: true };
      }
      case 'seal': {
        if (v.phase !== 'play' || p.spectator) return { ok: false, code: 'not_allowed' };
        if (v.sealed[pid]) return { ok: false, code: 'already_sealed' };
        const seat: Seat = { pid, seat: p.seat, avatar: p.avatar, human: true, name: p.name };
        const clean = L.validateSeal(v.pub, seat, data);
        if (clean == null) return { ok: false, code: 'invalid' };
        this.s.secrets[pid] = clean; v.sealed[pid] = true;
        this.bump(); this.maybeReveal(); return { ok: true };
      }
      case 'force_reveal': {
        if (!host || v.phase !== 'play') return { ok: false, code: 'not_allowed' };
        if (!Object.keys(v.sealed).some(k => this.player(k) && this.player(k)!.human)) return { ok: false, code: 'nothing_sealed' };
        this.reveal(); return { ok: true };
      }
      case 'live': {
        if (!L.validateLive || v.phase === 'lobby') return { ok: false, code: 'not_allowed' };
        const t = this.now();
        if (t - (this.lastLive[pid] || 0) < 220) return { ok: false, code: 'rate_limited' };
        const seat: Seat = { pid, seat: p.seat, avatar: p.avatar, human: p.human, name: p.name };
        const clean = L.validateLive(v.pub, seat, data, v.phase, t);
        if (clean == null) return { ok: false, code: 'invalid' };
        this.lastLive[pid] = t;
        const ev: LiveEvent = { n: ++this.s.liveN, pid, at: t, data: clean };
        v.live.push(ev); if (v.live.length > LIMITS.maxLive) v.live.splice(0, v.live.length - LIMITS.maxLive);
        if (L.onLive) { const np = L.onLive(v.pub, ev, seat); if (np) v.pub = np; }
        this.bump(); return { ok: true };
      }
      case 'consent': { v.consent[pid] = !!(data && data.share); this.bump(); return { ok: true }; }
      case 'finale': {
        if (!host || v.phase !== 'reveal') return { ok: false, code: 'not_allowed' };
        v.phase = 'finale'; this.bump(); return { ok: true };
      }
      case 'replay': {
        if (!host || (v.phase !== 'reveal' && v.phase !== 'finale')) return { ok: false, code: 'not_allowed' };
        v.phase = 'lobby'; v.pub = null; v.sealed = {}; v.revealed = null; v.live = []; v.startedAt = null; this.s.secrets = {};
        if (data && this.registry[data.ritual]) v.ritual = data.ritual;
        // spectators get a seat for the next round where there is room
        v.players.forEach(x => { if (x.spectator && this.participants().length < this.logic.max) x.spectator = false; });
        this.bump(); return { ok: true };
      }
      case 'leave': {
        v.players = v.players.filter(x => x.pid !== pid);
        Object.keys(this.s.tokens).forEach(k => { if (this.s.tokens[k] === pid) delete this.s.tokens[k]; });
        delete this.s.secrets[pid]; delete v.sealed[pid];
        if (v.hostPid === pid) { const n = this.humans().find(h => h.connected); v.hostPid = n ? n.pid : null; }
        this.bump(); this.maybeReveal(); return { ok: true };
      }
    }
    return { ok: false, code: 'unknown_action' };
  }

  /** Reveal when every participant has sealed. A dropped connection keeps its seat (people reconnect); if someone is gone
   * for good the host can force the reveal or remove them, and the waiting is visible to everyone. */
  private maybeReveal() {
    const v = this.s.view;
    if (v.phase !== 'play') return;
    const parts = this.participants();
    const waiting = parts.filter(p => !v.sealed[p.pid]);
    if (parts.length && !waiting.length && parts.some(p => v.sealed[p.pid] && p.human)) this.reveal();
  }
  private reveal() {
    const v = this.s.view;
    v.phase = 'reveal';
    v.revealed = JSON.parse(JSON.stringify(this.s.secrets));
    const up = this.logic.onReveal ? this.logic.onReveal(v.pub, this.now(), this.s.secrets) : null;
    if (up) v.pub = up;
    this.bump();
  }

  /** The view a given player is allowed to see. */
  view(pid?: string): RoomView {
    const out: RoomView = Object.assign(JSON.parse(JSON.stringify(this.s.view)), { serverNow: this.now() });
    if (pid) { out.you = pid; if (this.s.secrets[pid] !== undefined) out.mine = JSON.parse(JSON.stringify(this.s.secrets[pid])); }
    return out;
  }
}
