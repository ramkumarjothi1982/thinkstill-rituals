// Musical time for Hushbeat Symphony: the breath clock, a look-ahead
// scheduler, the take (what was just played) and the tune codec.
// Pure and Node-safe: the clock, timers and storage are injected.
//
// Musical time is performance time in seconds (performance.now() / 1000);
// the audio renderer maps it onto AudioContext time when it schedules. One
// breath is four bars, one turn of the four-chord loop, so a natural breath
// (4 s in, 6 s out) gives 96 bpm in 4/4 and 72 bpm in 3/4. Tempo only ever
// changes at a bar line and by at most 8 % per bar, with the beat continuous,
// so the next bar line is always known once a bar has begun.

import { clamp, smoothstep } from './math.js';
import { HUSHBEAT_MOTIF_RE } from './comfort-dna.js';

const mod = (a, n) => ((a % n) + n) % n;
const perfNow = () => (globalThis.performance ? performance.now() : Date.now()) / 1000;

export const BPM_RANGE = Object.freeze([48, 120]);
export const CYCLE_RANGE = Object.freeze([7, 15]);
export const MAX_STEP = 0.08;     // tempo change per bar line
const LEAD_IDLE = 10;             // s after the last breath-out without a new press: the lead lets go
const UNLEAD_BLEND = 2;           // s for the visible breath to ease back onto the clock's own
const BARS_PER_BREATH = 4;
const EPS = 1e-9;

const timing = ({ inhale, exhale } = {}, d = { inhale: 4, exhale: 6 }) => ({
  inhale: clamp(+inhale > 0 ? +inhale : d.inhale, 1, 10),
  exhale: clamp(+exhale > 0 ? +exhale : d.exhale, 1, 12),
});

/**
 * The breath clock: beats, bars and the breath level from one tempo, set by the
 * pace (breath timing) or by the person leading the breath.
 *   at(t) → { beat (continuous), bar, beatInBar, beatPhase, bpm, level 0..1, phase 'in'|'out', leading }
 */
export class BreathClock {
  constructor({ inhale = 4, exhale = 6, meter = 4, now = perfNow } = {}) {
    this.now = now;
    this.meter = meter === 3 ? 3 : 4;
    this.pace = timing({ inhale, exhale });
    this._target = clamp(this.pace.inhale + this.pace.exhale, ...CYCLE_RANGE);
    this.limit = MAX_STEP;
    this._ld = { phase: null, tIn: null, tOut: null, inhale: 0, exhale: 0, lvl0: 0, lvlOut: 0, cycles: 0, unleadT: null, from: 0 };
    this._fr = new Map();
    this._reset(now());
  }

  _reset(t) {
    this.tA = t; this.bA = 0; this.barA = 0;   // the anchor is always a bar line
    this.p = 60 / this._bpmFor(this._target);
  }

  _bpmFor(cycle) { return clamp(this.meter * BARS_PER_BREATH * 60 / cycle, ...BPM_RANGE); }

  _nextP(p) {
    const b = 60 / p, bt = this._bpmFor(this._target), L = this.limit;
    return 60 / clamp(bt, b * (1 - L), b * (1 + L));
  }

  _setTarget(cycle, limit = MAX_STEP) {
    this._target = clamp(cycle, ...CYCLE_RANGE);
    this.limit = limit;
  }

  /** The pace (breath timing): a target, applied at bar lines by ≤ 8 % per bar. */
  setTiming(t) {
    this.pace = timing(t, this.pace);
    if (!this._ld.phase) this._setTarget(this.pace.inhale + this.pace.exhale);
  }

  /** 4 (4/4) or 3 (3/4). A new meter starts a new bar now. */
  setMeter(m) {
    const meter = m === 3 ? 3 : 4;
    if (meter === this.meter) return;
    this.meter = meter;
    this._reset(this.now());
  }

  /** The person leads: 'in' while pressing, 'out' on letting go. in → out → in measures a cycle. */
  lead(phase, t = this.now()) {
    this.step(t);
    const L = this._ld, lvl = this._level(t, this._beatAt(t));
    const ratio = this.pace.exhale / this.pace.inhale;
    if (phase === 'in') {
      if (L.phase === 'in') return;
      if (L.phase === 'out' && L.tIn != null) {
        this._setTarget(t - L.tIn);
        L.exhale = clamp(t - L.tOut, 1, 12);
        L.cycles++;
      }
      L.phase = 'in'; L.tIn = t; L.lvl0 = lvl; L.unleadT = null;
    } else if (phase === 'out') {
      if (L.phase !== 'in') return;
      L.inhale = clamp(t - L.tIn, 0.5, 10);
      if (!L.cycles) { this._setTarget(L.inhale * (1 + ratio)); L.exhale = L.inhale * ratio; }
      L.phase = 'out'; L.tOut = t; L.lvlOut = lvl;
    }
  }

  /** Stop leading: drift back to the pace over two breaths (eight bars). */
  unlead(t = this.now()) {
    const L = this._ld;
    if (!L.phase) return;
    L.from = this._level(t, this._beatAt(t));
    L.phase = null; L.unleadT = t; L.tIn = null; L.tOut = null; L.cycles = 0;
    const cycle = clamp(this.pace.inhale + this.pace.exhale, ...CYCLE_RANGE);
    const gap = Math.abs(Math.log(this._bpmFor(cycle) / this.bpm));
    this._setTarget(cycle, clamp(gap / (2 * BARS_PER_BREATH), 0.005, MAX_STEP));
  }

  /** Commit tempo changes at every bar line up to t (and let go of an idle lead). Deterministic. */
  step(t = this.now()) {
    if (t - this.tA > 256 * this.meter * this.p) {   // back after a long absence: jump, at the target tempo
      const len = this.meter * this.p, n = Math.floor((t - this.tA) / len);
      this.tA += n * len; this.bA += n * this.meter; this.barA += n;
      this.p = 60 / this._bpmFor(this._target);
    }
    for (let i = 0; i < 4096; i++) {
      const end = this.tA + this.meter * this.p, L = this._ld;
      if (L.phase === 'out' && L.tOut + LEAD_IDLE <= Math.min(t, end)) this.unlead(L.tOut + LEAD_IDLE);
      if (t < end) break;
      this.tA = end; this.bA += this.meter; this.barA++;
      this.p = this._nextP(this.p);
      if (this.limit < MAX_STEP && Math.abs(60 / this.p - this._bpmFor(this._target)) < 1e-6) this.limit = MAX_STEP;
    }
  }

  // beat position at t: committed up to now, predicted (same rule, current target) beyond
  _beatAt(t) {
    let tA = this.tA, bA = this.bA, p = this.p;
    if (t <= tA) return bA + (t - tA) / p;
    for (let i = 0; i < 1024; i++) {
      const end = tA + this.meter * p;
      if (t < end) break;
      tA = end; bA += this.meter; p = this._nextP(p);
    }
    return bA + (t - tA) / p;
  }

  _timeOf(beat) {
    let tA = this.tA, bA = this.bA, p = this.p;
    if (beat <= bA) return tA + (beat - bA) * p;
    for (let i = 0; i < 1024; i++) {
      if (beat < bA + this.meter) break;
      tA += this.meter * p; bA += this.meter; p = this._nextP(p);
    }
    return tA + (beat - bA) * p;
  }

  _level(t, b) {
    const L = this._ld;
    if (L.phase === 'in') {
      const inh = L.inhale || this.pace.inhale;
      return L.lvl0 + (1 - L.lvl0) * smoothstep(0, 1, (t - L.tIn) / inh);
    }
    if (L.phase === 'out') {
      const exh = L.exhale || L.inhale * (this.pace.exhale / this.pace.inhale);
      return L.lvlOut * (1 - smoothstep(0, 1, (t - L.tOut) / exh));
    }
    const own = this._own(b).level;
    if (L.unleadT != null && t - L.unleadT < UNLEAD_BLEND) return L.from + (own - L.from) * smoothstep(0, UNLEAD_BLEND, t - L.unleadT);
    return own;
  }

  // the clock's own breath: each breath starts on the downbeat of bar 1 with the inhale
  _own(b) {
    const per = this.meter * BARS_PER_BREATH;
    const f = mod(b - this.bA + this.barA * this.meter, per) / per;
    const inF = this.pace.inhale / (this.pace.inhale + this.pace.exhale);
    return f < inF ? { level: smoothstep(0, inF, f), phase: 'in' } : { level: 1 - smoothstep(inF, 1, f), phase: 'out' };
  }

  /** Where the music is at time t (writes into `out`, no allocation). */
  at(t = this.now(), out = {}) {
    this.step(Math.min(t, this.now()));
    const b = this._beatAt(t), rel = b - this.bA + EPS;
    out.beat = b;
    out.bar = this.barA + Math.floor(rel / this.meter);
    out.beatInBar = Math.floor(mod(rel, this.meter));
    out.beatPhase = Math.max(0, b - Math.floor(b + EPS));
    out.bpm = 60 / this.p;
    out.level = this._level(t, b);
    out.phase = this._ld.phase || this._own(b).phase;
    out.leading = this._ld.phase;
    return out;
  }

  beatTime(beat) { this.step(); return this._timeOf(beat); }
  barTime(bar) { this.step(); return this._timeOf(this.bA + (bar - this.barA) * this.meter); }
  barOf(t) { this.step(); return this.barA + Math.floor((this._beatAt(t) - this.bA + EPS) / this.meter); }

  _fracs(div, swing) {
    const k = `${div}|${swing}`;
    let f = this._fr.get(k);
    if (!f) {
      f = [];
      for (let i = 0; i < div; i++) f.push(div % 2 === 0 ? (Math.floor(i / 2) + (i % 2 ? swing : 0)) * 2 / div : i / div);
      this._fr.set(k, f);
    }
    return f;
  }

  /** The next grid time strictly after t: `div` per beat; with swing, every second subdivision lands late. */
  nextGrid(t, div = 1, swing = 0.5) {
    this.step();
    const d = Math.max(1, Math.round(div)), fr = this._fracs(d, d >= 2 ? clamp(swing, 0.3, 0.75) : 0.5);
    const b = this._beatAt(t), B = Math.floor(b + EPS);
    for (let k = 0; k <= 1; k++) for (const f of fr) { const g = B + k + f; if (g > b + 1e-7) return this._timeOf(g); }
    return this._timeOf(B + 2);
  }

  /** The beat nearest t: → { beat, offsetS, strong (a strong beat, within ±12 % of a beat), downbeat (within ±60 ms) } */
  nearest(t) {
    this.step();
    const b = this._beatAt(t), n = Math.round(b), tb = this._timeOf(n), per = this._timeOf(n + 1) - tb;
    const off = t - tb, bib = mod(n - this.bA, this.meter);
    return {
      beat: n, offsetS: off, beatInBar: bib,
      strong: (bib === 0 || (this.meter === 4 && bib === 2)) && Math.abs(off) <= 0.12 * per,
      downbeat: bib === 0 && Math.abs(off) <= 0.06,
    };
  }

  get bpm() { return 60 / this.p; }
  get beatS() { return this.p; }
  get barS() { return this.meter * this.p; }
  /** The current cycle: four bars at the current tempo. */
  get cycle() { return this.meter * BARS_PER_BREATH * this.p; }
  /** The cycle the tempo is moving toward. */
  get target() { return this._target; }
  get leading() { return this._ld.phase; }
}

/**
 * A look-ahead scheduler: a setTimeout chain (25 ms) that fires callbacks up to
 * 120 ms before their time, so the renderer can schedule them exactly. It runs
 * only while something is queued. An event more than 50 ms late is dropped
 * (its optional `drop` callback runs instead), never played late; an event may
 * carry its own tolerance (a replay's notes: a long frame must not lose a note).
 */
export class Scheduler {
  constructor({ now = perfNow, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id), lookahead = 0.12, interval = 25, late = 0.05 } = {}) {
    this.now = now; this.setTimer = setTimer; this.clearTimer = clearTimer;
    this.lookahead = lookahead; this.interval = interval; this.late = late;
    this.q = [];           // sorted by t, then id
    this.timer = null;
    this.ids = 0;
    this.dropped = 0;
    this._ticking = false;
    this._tick = () => this.tick();
  }

  /** Run fn(t) at musical time t (performance seconds); late: this event's own tolerance (s). → id */
  at(t, fn, tag = null, drop = null, late = null) {
    const ev = { id: ++this.ids, t: +t, fn, tag, drop, late };
    let lo = 0, hi = this.q.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.q[m].t <= ev.t) lo = m + 1; else hi = m; }
    this.q.splice(lo, 0, ev);
    if (this.timer == null && !this._ticking) this.timer = this.setTimer(this._tick, 0);
    return ev.id;
  }

  tick() {
    this.timer = null;
    this._ticking = true;
    try {
      const now = this.now(), horizon = now + this.lookahead;
      for (let guard = 0; guard < 1000 && this.q.length && this.q[0].t <= horizon; guard++) {
        const ev = this.q.shift();
        try {
          if (now - ev.t > (ev.late ?? this.late)) { this.dropped++; ev.drop?.(ev.t); } else ev.fn(ev.t);
        } catch (e) { console.error(e); }
      }
    } finally { this._ticking = false; }
    if (this.q.length) this.timer = this.setTimer(this._tick, this.interval);
  }

  /** Cancel by id (number) or by tag (string). */
  cancel(idOrTag) {
    const key = typeof idOrTag === 'number' ? 'id' : 'tag';
    const before = this.q.length;
    this.q = this.q.filter((e) => e[key] !== idOrTag);
    if (!this.q.length) this.stop();
    return before - this.q.length;
  }

  has(tag) { return this.q.some((e) => e.tag === tag); }
  clear() { this.q = []; this.stop(); }
  /** Stop the timer chain (queued events stay; a later at() restarts it and stale ones drop as late). */
  stop() { if (this.timer != null) this.clearTimer(this.timer); this.timer = null; }
  get running() { return this.timer != null; }
  get pending() { return this.q.length; }
}

const cleanEvent = (e) => ({
  beat: Math.max(0, +e.beat || 0), slot: e.slot === 1 ? 1 : 0, kind: ['n', 'b', 'h'].includes(e.kind) ? e.kind : 'n',
  deg: Math.round(+e.deg || 0), vel: clamp(+e.vel || 0.6, 0.05, 1), len: Math.max(0, +e.len || 0),
  ...(Number.isFinite(e.x01) ? { x01: e.x01 } : {}), ...(Number.isFinite(e.y01) ? { y01: e.y01 } : {}),
});
const rebase = (list) => { const b0 = list.length ? list[0].beat : 0; return list.map((e) => ({ ...e, beat: e.beat - b0 })); };

/**
 * The take: what was just played (live notes, basses and hums), for Replay and Keep.
 * A gap of min(2 bars, gapS) starts a new take; the current take keeps its newest
 * maxEvents events within maxBeats beats (the codec's limits).
 */
export class Take {
  constructor({ maxEvents = 48, maxBeats = 64, gapS = 6 } = {}) {
    this.maxEvents = maxEvents; this.maxBeats = maxBeats; this.gapS = gapS;
    this.barS = 2.5;        // the engine keeps this at the clock's bar length
    this.cur = []; this.prev = null; this.lastT = -Infinity;
  }

  /** ev { beat, slot, kind: 'n'|'b'|'h', deg, vel, len, x01, y01 } at time t → the stored event (len may be set later). */
  add(ev, t) {
    if (this.cur.length && t - this.lastT > Math.min(2 * this.barS, this.gapS)) this.cut();
    const e = cleanEvent(ev);
    let i = this.cur.length;
    while (i > 0 && this.cur[i - 1].beat > e.beat) i--;
    this.cur.splice(i, 0, e);
    while (this.cur.length > this.maxEvents) this.cur.shift();
    const last = this.cur[this.cur.length - 1].beat;
    while (this.cur.length > 1 && last - this.cur[0].beat > this.maxBeats - 0.25) this.cur.shift();
    this.lastT = Math.max(this.lastT, t);
    return e;
  }

  /** Something is still sounding (a held layer): the take doesn't end yet. */
  touch(t) { this.lastT = Math.max(this.lastT, t); }

  /** Start a new take; the current one becomes the previous if it was worth keeping. */
  cut() { if (this.cur.length >= 3) this.prev = this.cur; this.cur = []; }

  /** → the current take if ≥ 3 events, else the previous if ≥ 3, else null (copies; beats from 0). */
  best() {
    const src = this.cur.length >= 3 ? this.cur : this.prev && this.prev.length >= 3 ? this.prev : null;
    return src ? rebase(src) : null;
  }

  load(events) {
    this.cur = rebase((Array.isArray(events) ? events : []).map(cleanEvent).sort((a, b) => a.beat - b.beat)).slice(0, this.maxEvents);
    this.prev = null; this.lastT = -Infinity;
  }

  clear() { this.cur = []; this.prev = null; this.lastT = -Infinity; }
  get length() { return this.cur.length; }
}

/** Move a beat position `strength` of the way toward the nearest 1/div grid point. */
export function softQuantise(beat, div, strength = 0.75) {
  const d = Math.max(1, div), g = Math.round(beat * d) / d;
  return beat + (g - beat) * strength;
}

// ------------------------------------------------------------- codec --
// up to 48 tokens: step in 16ths (2 chars, base 32), kind (n | b | h; upper case = the friend),
// degree + 7 (base 32, 0–21) and velocity ÷ 0.11 (notes) or length in beats (b, h), 1–9.
const B32 = '0123456789abcdefghijklmnopqrstuv';

/** Events → a tune motif matching HUSHBEAT_MOTIF_RE ('' when there is nothing to keep). */
export function encodeMotif(events) {
  if (!Array.isArray(events) || !events.length) return '';
  const list = events.map(cleanEvent).sort((a, b) => a.beat - b.beat).slice(0, 48);
  const b0 = list[0].beat;
  let s = '';
  for (const e of list) {
    const step = clamp(Math.round((e.beat - b0) * 4), 0, 255);
    const k = e.slot === 1 ? e.kind.toUpperCase() : e.kind;
    const v = e.kind === 'n' ? clamp(Math.round(e.vel / 0.11), 1, 9) : clamp(Math.round(e.len || 1), 1, 9);
    s += B32[step >> 5] + B32[step & 31] + k + B32[clamp(e.deg + 7, 0, 21)] + v;
  }
  return s;
}

/** A motif → events, or null when it is not a valid motif. */
export function decodeMotif(str) {
  if (typeof str !== 'string' || !HUSHBEAT_MOTIF_RE.test(str)) return null;
  const out = [];
  for (let i = 0; i < str.length; i += 5) {
    const step = B32.indexOf(str[i]) * 32 + B32.indexOf(str[i + 1]);
    const k = str[i + 2], kind = k.toLowerCase(), v = +str[i + 4];
    out.push({
      beat: step / 4, slot: k === kind ? 0 : 1, kind, deg: B32.indexOf(str[i + 3]) - 7,
      vel: kind === 'n' ? Math.round(v * 11) / 100 : 0.6, len: kind === 'n' ? 0 : v,
    });
  }
  return out.sort((a, b) => a.beat - b.beat);
}
