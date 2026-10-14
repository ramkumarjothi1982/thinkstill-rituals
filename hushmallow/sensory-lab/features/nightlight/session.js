// Mallow Nightlight: the session clock (pure; the wall clock is injected).
//
// A session is a deadline on the wall clock, never a count of frames, so a
// locked phone or a throttled tab can only find it on time, or ended: it can
// never run late, and it never catches up in a burst. The levels the screen
// shows (world, Mallow, sound) are a function of the time alone.
//
//   const clock = new SessionClock({ minutes: 30, fade: true, mode: 'moonlight' });
//   clock.start();
//   const t = clock.sync();               // once per frame: reads now() and absorbs clock jumps
//   clock.phase(t);                        // 'arriving' | 'steady' | 'fading' | 'ended'
//   clock.levels(t, out);                  // { world, mallow, sound, u } (no allocation)
//   sessionStorage[STORE_KEY] = JSON.stringify(clock.toJSON());
//   SessionClock.restore(sessionStorage[STORE_KEY], () => Date.now());
//
// phase(), levels() and remaining() with an explicit t are pure; without one
// they call sync() first. `rev` grows on every change worth saving.

import { clamp, smoothstep, approach } from '../../core/math.js';
import { MODES_ORDER, TIMER_MINUTES } from './settings.js';

export { TIMER_MINUTES };
export const STORE_KEY = 'hm.sensorylab.nightlight.session.v1';
export const ARRIVE_S = 15;
export const EXTEND_MIN = 10;               // "A little longer"
export const MAX_EXTRA_MIN = 60;            // at most six of those per session
export const STOP_SOON_S = 12;              // "Fade out now"
export const MAX_FADE_S = 480;
export const JUMP_MS = 2000;                // a backwards clock jump bigger than this shifts the whole session
export const RESUME_MS = 5000;              // left this recently → resume (a Mallow change, a reroute)
export const ENDED_KEEP_MS = 6 * 3600e3;    // a reload within 6 h of the end shows the end view
export const NO_TIMER_MAX_MS = 12 * 3600e3;
export const FUTURE_MS = 60e3;              // a record may start at most this far in the future
const MIN = 60e3;

/** Fade length in seconds: clamp(minutes·20, 120, 480) with fade on (a third of the session, 2–8 min), a 10 s settle with it off, 0 with No timer. */
export function fadeSeconds(minutes, fade) {
  if (!(minutes > 0)) return 0;
  return fade ? clamp(minutes * 20, 120, MAX_FADE_S) : 10;
}

/** The three levels at fade progress u (0..1). Each falls monotonically; the world falls asleep first, then the Mallow. */
export function levelsAt(u, out = {}) {
  const k = clamp(Number.isFinite(u) ? u : 0, 0, 1);
  out.world = 1 - smoothstep(0, 0.75, k);
  out.mallow = 1 - smoothstep(0.35, 1, k);
  out.sound = (1 - k) * (1 - k);
  out.u = k;
  return out;
}

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

/** A stored record that is safe to resume from (shape and sanity; see restore()). */
export function validRecord(o, now) {
  if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== 1) return false;
  if (!finite(o.startedAt) || o.startedAt > now + FUTURE_MS) return false;
  if (!TIMER_MINUTES.includes(o.minutes) || typeof o.fade !== 'boolean' || !MODES_ORDER.includes(o.mode)) return false;
  const extra = o.extra ?? 0;
  if (!finite(extra) || extra < 0 || extra > MAX_EXTRA_MIN) return false;
  if (o.leftAt != null && !finite(o.leftAt)) return false;
  if (o.endsAt == null) return o.fadeFrom == null && o.minutes === 0;   // only No timer runs without a deadline
  if (!finite(o.endsAt) || !finite(o.fadeFrom)) return false;
  if (o.endsAt < o.startedAt || o.fadeFrom > o.endsAt || o.endsAt - o.fadeFrom > MAX_FADE_S * 1000) return false;
  const span = o.minutes > 0 ? (o.minutes + extra) * MIN + MIN : NO_TIMER_MAX_MS + MIN;   // 60 min → at most 61 min
  return o.endsAt - o.startedAt <= span;
}

export class SessionClock {
  /** @param {{now?:()=>number, minutes?:number, fade?:boolean, mode?:string}} [o] */
  constructor({ now = () => Date.now(), minutes = 30, fade = true, mode = 'moonlight' } = {}) {
    this.now = now;
    this._minutes = TIMER_MINUTES.includes(minutes) ? minutes : 30;
    this._fade = !!fade;
    this._mode = MODES_ORDER.includes(mode) ? mode : 'moonlight';
    this._startedAt = NaN;
    this._endsAt = null;
    this._fadeFrom = null;
    this._extra = 0;               // minutes added by "A little longer"
    this._arriveEnd = -Infinity;   // the first 15 s after start (a timer change does not arrive again)
    this._lastT = -Infinity;
    this.rev = 0;
  }

  get started() { return Number.isFinite(this._startedAt); }
  get startedAt() { return this._startedAt; }
  get endsAt() { return this._endsAt; }
  get fadeFrom() { return this._fadeFrom; }
  get minutes() { return this._minutes; }
  get fade() { return this._fade; }
  get mode() { return this._mode; }
  get extra() { return this._extra; }
  /** The fade's length in ms as now scheduled (0 with No timer). */
  get fadeMs() { return this._endsAt == null ? 0 : this._endsAt - this._fadeFrom; }
  /** Room for another "A little longer". */
  get canExtend() { return this._endsAt != null && this._extra + EXTEND_MIN <= MAX_EXTRA_MIN; }

  start(t = this.now()) {
    this._arriveEnd = t + ARRIVE_S * 1000;
    this._schedule(t);
    return this;
  }

  /** A new timer (or fade choice) from now; the mode is kept. Does not arrive again. */
  restart({ minutes = this._minutes, fade = this._fade } = {}) {
    const t = this.sync();
    if (TIMER_MINUTES.includes(minutes)) this._minutes = minutes;
    this._fade = !!fade;
    if (!this.started) this._arriveEnd = t + ARRIVE_S * 1000;
    this._schedule(t);
    return this;
  }

  /** "A little longer": endsAt and fadeFrom move by `min` minutes. False when ended, with No timer, or past the cap. */
  extend(min = EXTEND_MIN) {
    const t = this.sync();
    if (!this.started || this._endsAt == null || t >= this._endsAt || !(min > 0) || this._extra + min > MAX_EXTRA_MIN) return false;
    this._endsAt += min * MIN;
    this._fadeFrom += min * MIN;
    this._extra += min;
    this.rev++;
    return true;
  }

  /**
   * "Fade out now": the session ends within `s` seconds. From steady the fade
   * starts now; while already fading it keeps its progress (the levels carry on
   * down from where they are) and finishes within `s`.
   */
  stopSoon(s = STOP_SOON_S) {
    const t = this.sync(), ms = Math.max(1, s) * 1000;
    if (!this.started || (this._endsAt != null && t >= this._endsAt)) return false;
    const u = this._u(t);
    const fadeFrom = t - u * ms, endsAt = fadeFrom + ms;
    if (this._endsAt != null && endsAt >= this._endsAt) return false;   // already ending sooner
    this._fadeFrom = fadeFrom;
    this._endsAt = endsAt;
    this.rev++;
    return true;
  }

  setMode(id) {
    if (!MODES_ORDER.includes(id) || id === this._mode) return false;
    this._mode = id;
    this.rev++;
    return true;
  }

  /**
   * Read the clock once (per frame). A backwards jump of more than 2 s shifts
   * the whole session by the same amount, so the time left never grows; a
   * smaller wobble is held still. A forward jump is simply time passing (the
   * session may end early, never late). Returns the time to use.
   */
  sync(t = this.now()) {
    if (!this.started) return t;
    if (t < this._lastT - JUMP_MS) this._shift(t - this._lastT);
    else if (t < this._lastT) t = this._lastT;
    this._lastT = t;
    return t;
  }

  phase(t) {
    if (t === undefined) t = this.sync();
    if (!this.started) return 'arriving';
    if (this._endsAt != null && t >= this._endsAt) return 'ended';
    if (this._fadeFrom != null && t >= this._fadeFrom) return 'fading';
    return t < this._arriveEnd ? 'arriving' : 'steady';
  }

  /** { world, mallow, sound, u } at t, written into `out`. */
  levels(t, out = {}) {
    if (t === undefined) t = this.sync();
    return levelsAt(this._u(t), out);
  }

  /** ms left (Infinity with No timer). */
  remaining(t) {
    if (t === undefined) t = this.sync();
    if (!this.started) return this._minutes > 0 ? this._minutes * MIN : Infinity;
    return this._endsAt == null ? Infinity : Math.max(0, this._endsAt - t);
  }

  /** The record for sessionStorage. `leftAt` (ms) only when the screen is left without meaning to end. */
  toJSON(leftAt) {
    const o = { v: 1, startedAt: this._startedAt, endsAt: this._endsAt, fadeFrom: this._fadeFrom,
      minutes: this._minutes, fade: this._fade, mode: this._mode, extra: this._extra };
    if (finite(leftAt)) o.leftAt = leftAt;   // JSON.stringify passes a key string here: ignored
    return o;
  }

  /**
   * Resume from a stored record (a JSON string or the object).
   *   invalid (shape, non-finite, start > 60 s ahead, endsAt < startedAt,
   *     span over minutes + 1, fade over 480 s, unknown mode) → null
   *   leftAt more than 5 s ago (the person went elsewhere) → null
   *   past endsAt: less than 6 h ago → { ended: true, endsAt }; else null
   *   No timer and started more than 12 h ago → null
   *   otherwise → a SessionClock with the same deadline
   */
  static restore(json, now = () => Date.now()) {
    const nowFn = typeof now === 'function' ? now : () => now;
    let o = json;
    if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return null; } }
    const t = nowFn();
    if (!finite(t) || !validRecord(o, t)) return null;
    if (o.leftAt != null && t - o.leftAt > RESUME_MS) return null;
    if (o.endsAt != null && t >= o.endsAt) return t - o.endsAt < ENDED_KEEP_MS ? { ended: true, endsAt: o.endsAt } : null;
    if (o.endsAt == null && t - o.startedAt > NO_TIMER_MAX_MS) return null;
    const c = new SessionClock({ now: nowFn, minutes: o.minutes, fade: o.fade, mode: o.mode });
    c._startedAt = o.startedAt;
    c._endsAt = o.endsAt;
    c._fadeFrom = o.fadeFrom;
    c._extra = o.extra ?? 0;
    c._arriveEnd = o.startedAt + ARRIVE_S * 1000;
    c._lastT = t;
    return c;
  }

  _schedule(t) {
    this._startedAt = t;
    this._extra = 0;
    this._endsAt = this._minutes > 0 ? t + this._minutes * MIN : null;
    this._fadeFrom = this._endsAt == null ? null : this._endsAt - fadeSeconds(this._minutes, this._fade) * 1000;
    this._lastT = t;
    this.rev++;
  }

  _u(t) {
    if (!this.started || this._endsAt == null) return 0;
    const span = this._endsAt - this._fadeFrom;
    return span > 0 ? clamp((t - this._fadeFrom) / span, 0, 1) : (t >= this._endsAt ? 1 : 0);
  }

  _shift(d) {
    this._startedAt += d;
    this._arriveEnd += d;
    if (this._endsAt != null) { this._endsAt += d; this._fadeFrom += d; }
    this.rev++;
  }
}

// --------------------------------------------------------- the record --
// sessionStorage is passed in (the feature gives globalThis.sessionStorage,
// read inside a try); every access is wrapped, so blocked or full storage
// (private modes, sandboxed frames) never stops the screen: it just cannot resume.

/** Write the record (with leftAt when leaving without meaning to end). False if storage refused. */
export function saveRecord(storage, clock, leftAt) {
  try { storage.setItem(STORE_KEY, JSON.stringify(clock.toJSON(leftAt))); return true; } catch { return false; }
}

/** Read and restore the record: a SessionClock, { ended: true, endsAt }, or null (start fresh). */
export function loadRecord(storage, now = () => Date.now()) {
  let raw = null;
  try { raw = storage.getItem(STORE_KEY); } catch { return null; }
  return raw ? SessionClock.restore(raw, now) : null;
}

/** Remove the record (a deliberate exit: Close, Escape, Done). */
export function clearRecord(storage) {
  try { storage.removeItem(STORE_KEY); return true; } catch { return false; }
}

/**
 * The levels the screen shows. They ease toward the clock's levels with a
 * 0.8 s half-life but never rise on their own: between explicit actions each
 * is min(previous, eased target). rise() (after "A little longer") lets them
 * ease back up over 2 s; snap() sets them at once (start, and on return from
 * hidden, under the veil).
 */
export class DisplayLevels {
  constructor({ halfLife = 0.8, riseS = 2 } = {}) {
    this.halfLife = halfLife;
    this.riseS = riseS;
    this.world = 1; this.mallow = 1; this.sound = 1;
    this._riseLeft = 0;
    this._from = { world: 1, mallow: 1, sound: 1 };
  }

  get rising() { return this._riseLeft > 0; }

  snap(target) {
    this.world = target.world; this.mallow = target.mallow; this.sound = target.sound;
    this._riseLeft = 0;
    return this;
  }

  rise(s = this.riseS) {
    this._riseLeft = this._riseS = Math.max(0.3, s);   // a brightening always takes ≥ 300 ms
    this._from.world = this.world; this._from.mallow = this.mallow; this._from.sound = this.sound;
    return this;
  }

  step(dt, target) {
    const d = Math.max(0, dt || 0);
    let k = -1;
    if (this._riseLeft > 0) {
      this._riseLeft = Math.max(0, this._riseLeft - d);
      k = smoothstep(0, 1, 1 - this._riseLeft / this._riseS);
    }
    this.world = this._next(this.world, target.world, this._from.world, k, d);
    this.mallow = this._next(this.mallow, target.mallow, this._from.mallow, k, d);
    this.sound = this._next(this.sound, target.sound, this._from.sound, k, d);
    return this;
  }

  _next(cur, goal, from, k, dt) {
    if (k >= 0 && goal > from) return from + (goal - from) * k;
    return Math.min(cur, approach(cur, goal, this.halfLife, dt));
  }
}
