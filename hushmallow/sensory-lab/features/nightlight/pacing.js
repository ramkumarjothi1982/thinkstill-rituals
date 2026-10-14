// Mallow Nightlight: breath and drowsiness (pure; seeded; driven by frame dt).
//
// BreathPacer  the slow breath of Breathing Together. A person can lead it:
//              a held press (or H, or the chip) starts an inhale from wherever
//              the breath is, holds at the top, and lets go into an exhale.
//              Nothing ever snaps: the level moves at most 0.1 per 50 ms.
// SleepyScript the Sleepy Companion's evening: drowsiness rises from 0 to 1,
//              and blinks, peeks, yawns, stretches, settles, sighs, nods and
//              dreams come at uneven, seeded intervals (never a loop), spaced
//              so two big moments never crowd each other. A touch wakes it a
//              little; holding it for 4 s or more lets it fall asleep in your hand.
// Both run on the frame clock (dt), so they pause while the page is hidden
// and pick up where they were, with no catching up.

import { clamp, rng } from '../../core/math.js';
import { SPEEDS } from './settings.js';
import { fadeSeconds, ARRIVE_S } from './session.js';

/** Speed factor per Speed setting (Slowest 1.25 · Slow 1.1 · Natural 1). */
export const SPEED_K = Object.freeze(Object.fromEntries(Object.entries(SPEEDS).map(([id, s]) => [id, s.k])));

const eis = (k) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(k, 0, 1));   // easeInOutSine
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export const LEAD_MIN_S = 1.2;
export const MAX_RATE = 2;   // level units per second (0.1 per 50 ms)

export class BreathPacer {
  /**
   * @param {{inhale?:number, exhale?:number, speedK?:number, holdIn?:number, holdOut?:number,
   *          slowTo?:number, slowOverS?:number}} [o]
   *   inhale / exhale: seconds (Comfort DNA breathTiming()); scaled by speedK.
   *   The cycle lengthens to × slowTo over the first slowOverS seconds, then stays.
   */
  constructor({ inhale = 4, exhale = 6, speedK = 1, holdIn = 0.3, holdOut = 0.7, slowTo = 1.12, slowOverS = 600 } = {}) {
    this.inhale = num(inhale, 4); this.exhale = num(exhale, 6);
    this.speedK = num(speedK, 1);
    this.holdIn = holdIn; this.holdOut = holdOut;
    this.slowTo = Math.max(1, slowTo); this.slowOverS = Math.max(1, slowOverS);
    this.elapsed = 0;
    this.leading = false;
    this.cycle = 0;              // inhales started (0 for the first): captions show for cycles 0 and 1
    this._level = 0;
    this._phase = 'in';
    this._t = 0;
    this._from = 0;
    this._dur = this._durFor('in');
    this._turn = false;
    this._out = { phase: 'in', k: 0, level: 0, turned: false };
  }

  get level() { return this._level; }
  get phase() { return this._phase; }
  /** The current phase's length in seconds (a led phase may be shorter than the schedule). */
  get duration() { return this._dur; }
  /** The slow-down factor now (1 … slowTo). */
  get slow() { return 1 + (this.slowTo - 1) * Math.min(1, this.elapsed / this.slowOverS); }
  /** One unled cycle as now scheduled, in seconds. */
  get period() { return (this.inhale + this.exhale) * this.speedK * this.slow + this.holdIn + this.holdOut; }

  setSpeed(k) { this.speedK = num(k, this.speedK); }
  setTiming({ inhale, exhale } = {}) { this.inhale = num(inhale, this.inhale); this.exhale = num(exhale, this.exhale); }

  /** Lead the breath: true starts an inhale from the current level (≥ 1.2 s) and holds at the top; false exhales from here. */
  lead(on) {
    if (on) {
      if (this.leading && (this._phase === 'in' || this._phase === 'holdIn')) return;
      this.leading = true;
      this._enter('in', Math.max(LEAD_MIN_S, this._durFor('in') * (1 - this._level)));
    } else {
      if (!this.leading) return;
      this.leading = false;
      if (this._phase === 'in' || this._phase === 'holdIn') this._enter('out', Math.max(LEAD_MIN_S, this._durFor('out') * this._level));
    }
  }

  /** Advance by dt seconds → one reused { phase, k, level, turned } (turned: a new phase began). */
  step(dt) {
    let rem = Math.max(0, num(dt, 0));
    let turned = this._turn;
    this._turn = false;
    this.elapsed += rem;
    while (rem > 0) {
      if (this.leading && this._phase === 'holdIn') { this._t += rem; break; }   // held at the top
      const left = this._dur - this._t;
      if (rem < left) { this._t += rem; break; }
      rem -= left;
      this._t = this._dur;
      this._next();
      turned = true;
    }
    const k = this._dur > 0 ? clamp(this._t / this._dur, 0, 1) : 1;
    const goal = this._phase === 'in' ? this._from + (1 - this._from) * eis(k)
      : this._phase === 'out' ? this._from * (1 - eis(k))
        : this._phase === 'holdIn' ? 1 : 0;
    const max = MAX_RATE * Math.max(0, num(dt, 0));
    this._level = clamp(this._level + clamp(goal - this._level, -max, max), 0, 1);
    const o = this._out;
    o.phase = this._phase; o.k = k; o.level = this._level; o.turned = turned;
    return o;
  }

  _durFor(phase) {
    if (phase === 'in') return this.inhale * this.speedK * this.slow;
    if (phase === 'out') return this.exhale * this.speedK * this.slow;
    return phase === 'holdIn' ? this.holdIn : this.holdOut;
  }

  _enter(phase, dur = this._durFor(phase)) {
    if (phase === 'in' && this._phase !== 'in') this.cycle++;
    this._phase = phase;
    this._t = 0;
    this._dur = Math.max(1e-3, dur);
    this._from = this._level;
    this._turn = true;
  }

  _next() {
    const p = this._phase;
    const next = p === 'in' ? 'holdIn' : p === 'holdIn' ? 'out' : p === 'out' ? 'holdOut' : 'in';
    this._enter(next);
    this._turn = false;   // step() reports this turn itself
  }
}

// ---------------------------------------------------------------- sleepy --

/** Interval ranges in seconds (× speedK; repeats ± 30 %). `first`: when the first one comes. */
export const SLEEPY_EVENTS = Object.freeze({
  blink: Object.freeze({ lo: 5, hi: 12 }),                         // × (1 + d)
  peek: Object.freeze({ lo: 20, hi: 40 }),
  yawn: Object.freeze({ first: [15, 25], lo: 40, hi: 110 }),
  stretch: Object.freeze({ first: [45, 60], lo: 90, hi: 150 }),
  settle: Object.freeze({ lo: 60, hi: 90 }),
  sigh: Object.freeze({ lo: 50, hi: 80 }),
  nod: Object.freeze({ lo: 30, hi: 60 }),
  dream: Object.freeze({ lo: 120, hi: 240 }),
});
export const SLEEPY_KINDS = Object.keys(SLEEPY_EVENTS);
/** Big moments, highest priority first: never two within SPACING_S (a stretch's own settle excepted). */
export const BIG_EVENTS = ['stretch', 'yawn', 'settle', 'dream'];
const ORDER = ['stretch', 'yawn', 'settle', 'dream', 'sigh', 'nod', 'blink', 'peek'];
/** A stretch: squeeze ramps over `ramp`, holds, releases; its settle comes `settleAfter` s after the release begins. */
export const STRETCH = Object.freeze({ ramp: 1.2, hold: 0.8, release: 0.6, settleAfter: 1.4 });
export const DURATIONS = Object.freeze({ peek: 1.4, yawn: 2.4, stretch: STRETCH.ramp + STRETCH.hold + STRETCH.release, settle: 2.0, sigh: 1.4, nod: 0.8, dream: 3 });
export const SPACING_S = 6;
export const TOUCH_QUIET_S = 3;
export const MIN_GAP_S = 1.2;   // a small moment (blink, peek, sigh, nod) waits this long after any other
export const DOUBLE_BLINK = 0.18;
export const STAGES = Object.freeze([['drowsy', 0.35], ['settling', 0.6], ['dozing', 0.85], ['asleep', Infinity]]);

/**
 * How long drowsiness takes to reach 1: clamp(0.4 × planned steady seconds, 180, 720); 600 s with No timer.
 * The sleep arc follows the session length and the fade only. Animation speed changes tempo (breath,
 * blink cadence, movement), never when drowsiness arrives (lead decision), so the third parameter is
 * accepted for call compatibility and ignored.
 */
export function rampFor(minutes, fade, _speedK = 1) {
  if (!(minutes > 0)) return 600;
  const steady = minutes * 60 - fadeSeconds(minutes, fade) - ARRIVE_S;
  return clamp(0.4 * steady, 180, 720);
}

export class SleepyScript {
  /**
   * @param {{seed?:number, speedK?:number, rampS?:number, motion?:string, closedEyes?:boolean}} [o]
   *   closedEyes: Mallows whose eyes rest closed (Blubi, Loomi, Noomi) peek instead of blinking.
   */
  constructor({ seed = 1, speedK = 1, rampS = 600, motion = 'gentle', closedEyes = false } = {}) {
    this.rand = rng(seed >>> 0);
    this.speedK = Math.max(0.1, num(speedK, 1));
    this.rampS = Math.max(1, num(rampS, 600));
    this.motion = motion;
    this.closedEyes = !!closedEyes;
    this.t = 0;
    this._d = 0;
    this._quietUntil = -Infinity;
    this._busyUntil = -Infinity;
    this._lastAny = -Infinity;
    this._lastBig = -Infinity;
    this._followAt = null;
    this._forced = null;
    this.next = {};
    for (const k of SLEEPY_KINDS) this.next[k] = this._first(k);
  }

  /** Drowsiness 0..1. */
  get d() { return this._d; }
  get stage() { return STAGES.find(([, below]) => this._d < below)[0]; }

  setMotion(m) { this.motion = m; }
  setSpeed(k) { this.speedK = Math.max(0.1, num(k, this.speedK)); }

  /** A touch wakes it a little (d − 0.15) and nothing happens for 3 s. */
  touch() {
    this._d = Math.max(0, this._d - 0.15);
    this._quietUntil = this.t + TOUCH_QUIET_S;
  }

  /** Held for 4 s or more: asleep in your hand. */
  holdLong() { this._d = Math.max(this._d, 0.9); }

  /** Stroking makes it drowsier: d rises by k (0.04 per second of stroke), never past 1. */
  drowse(k) { this._d = clamp(this._d + Math.max(0, num(k, 0)), 0, 1); }

  /** Play `kind` on the next step, whatever the schedule (tests, debug). */
  force(kind) { if (SLEEPY_KINDS.includes(kind)) this._forced = kind; }

  /** Advance by dt seconds → an event { kind, t, dur, double?, follow? } or null (at most one per step). */
  step(dt) {
    const d = Math.max(0, num(dt, 0));
    this.t += d;
    this._d = Math.min(1, this._d + d / this.rampS);
    const t = this.t;
    if (this._forced) { const k = this._forced; this._forced = null; return this._fire(k); }
    if (t < this._quietUntil) return null;
    if (this._followAt != null && t >= this._followAt) { this._followAt = null; return this._fire('settle', true); }
    if (t < this._busyUntil) return null;
    const gapOk = t - this._lastAny >= MIN_GAP_S;
    for (const kind of ORDER) {
      if (t < this.next[kind]) continue;
      if (!this._eligible(kind)) { this.next[kind] = t + this._repeat(kind); continue; }
      if (BIG_EVENTS.includes(kind)) {
        if (t - this._lastBig < SPACING_S) { this.next[kind] = this._lastBig + SPACING_S; continue; }
        const first = this._aheadOf(kind, t);
        if (first != null) { this.next[kind] = first + SPACING_S; continue; }
      } else if (!gapOk) continue;   // small moments wait their turn (still due)
      return this._fire(kind);
    }
    return null;
  }

  _eligible(kind) {
    const d = this._d;
    switch (kind) {
      case 'blink': return !this.closedEyes && d < 0.85;
      case 'peek': return this.closedEyes && d < 0.7;
      case 'yawn': case 'settle': return d < 0.85;
      case 'stretch': return d < 0.6;
      case 'nod': return d >= 0.6 && d < 0.85;
      case 'dream': return d >= 0.85 && this.motion !== 'still';
      default: return true;   // sigh
    }
  }

  // a higher-priority big moment due within SPACING_S goes first: its time, or null
  _aheadOf(kind, t) {
    let best = null;
    for (const k of BIG_EVENTS) {
      if (k === kind) break;
      const n = this.next[k];
      if (n > t && n <= t + SPACING_S && this._eligible(k) && (best == null || n < best)) best = n;
    }
    return best;
  }

  _range(lo, hi) { return lo + (hi - lo) * this.rand(); }

  _first(kind) {
    const e = SLEEPY_EVENTS[kind];
    const base = e.first ? this._range(e.first[0], e.first[1]) : this._range(e.lo, e.hi);
    return base * this.speedK * (kind === 'blink' ? 1 + this._d : 1);
  }

  _repeat(kind) {
    const e = SLEEPY_EVENTS[kind];
    const jitter = 0.7 + 0.6 * this.rand();
    return this._range(e.lo, e.hi) * this.speedK * jitter * (kind === 'blink' ? 1 + this._d : 1);
  }

  _fire(kind, follow = false) {
    const t = this.t;
    let k = kind;
    if (k === 'stretch' && this.motion !== 'gentle') k = 'settle';   // Less / Still: no stretch squash
    const ev = { kind: k, t, dur: DURATIONS[k] ?? 0 };
    if (k === 'blink') { ev.dur = 0.6 + 0.5 * this.rand(); ev.double = this.rand() < DOUBLE_BLINK; }
    if (follow) ev.follow = true;
    if (k === 'stretch') this._followAt = t + STRETCH.ramp + STRETCH.hold + STRETCH.settleAfter;
    this._lastAny = t;
    if (BIG_EVENTS.includes(k)) { this._lastBig = t; this._busyUntil = this._lastAny = t + ev.dur; }   // small moments wait until it is over
    this.next[kind] = t + this._repeat(kind);
    if (k !== kind) this.next[k] = Math.max(this.next[k], t + this._repeat(k));
    return ev;
  }
}
