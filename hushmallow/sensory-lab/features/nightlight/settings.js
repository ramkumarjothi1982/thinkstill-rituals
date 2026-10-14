// Mallow Nightlight: the person's night settings (pure; no DOM).
//
// One device-prefs key, `nightlight` (core/prefs.js), holds only the fields the
// person changed. Every read goes through cleanNight(), which keeps or drops
// each field on its own, so a damaged or hand-edited value can never break the
// screen. Comfort DNA is only read, for defaults (speed from animationSpeed,
// the first mode from what helps); nothing is written back to it.
//
//   const settings = new NightSettings(ctx.prefs, ctx.dna);
//   settings.get().brightness;                     // 0.05..1
//   settings.set('brightness', 0.6);               // memory now, prefs after 400 ms
//   settings.set('minutes', 20, { persist: 'now' });
//
// Prefs.set skips a value with the same reference, so the stored object is
// always written as a new one.

import { clamp } from '../../core/math.js';

export const MODES_ORDER = ['moonlight', 'breathe', 'sleepy', 'drift', 'quiet'];
export const TIMER_MINUTES = [10, 20, 30, 45, 60, 0];   // 0 = No timer
export const SPEEDS = Object.freeze({
  slowest: Object.freeze({ rig: 0.62, k: 1.25 }),
  slow: Object.freeze({ rig: 0.75, k: 1.1 }),
  natural: Object.freeze({ rig: 0.9, k: 1 }),
});
export const SPEED_IDS = ['slowest', 'slow', 'natural'];
export const MOTIONS = ['gentle', 'less', 'still'];
export const TEMP_STEPS = 4;                            // Moon · Soft · Warm · Candle · Ember → temp = i / 4

export const NIGHT_DEFAULTS = Object.freeze({
  mode: 'moonlight', brightness: 0.4, temp: 0.5, speed: 'slow', volume: 0.5,
  minutes: 30, fade: true, motion: 'gentle', keepAwake: false, quietSound: false,
});
export const NIGHT_KEYS = Object.keys(NIGHT_DEFAULTS);

/**
 * What each Movement level allows (spec §8). Scales are multipliers on the
 * Gentle values; flags say whether a kind of movement happens at all.
 *   inflate   breath inflation depth          drift     cloud, firefly and parallax speed
 *   twinkle   star twinkle amplitude          parallax  the still slides with Drift
 *   live      Drift's live realm window       impulses  body nudges from scripts (nods, dream bounces)
 *   stretch   stretch squash (else a settle)  scripted  scripted gaze and dream moments
 *   animated  the sky animates (else it is drawn only when something changes)
 */
export const MOTION_RULES = Object.freeze({
  gentle: Object.freeze({ inflate: 1, drift: 1, twinkle: 1, parallax: true, live: true, impulses: true, stretch: true, scripted: true, animated: true }),
  less: Object.freeze({ inflate: 0.4, drift: 0.3, twinkle: 0.5, parallax: false, live: false, impulses: false, stretch: false, scripted: true, animated: true }),
  still: Object.freeze({ inflate: 0, drift: 0, twinkle: 0, parallax: false, live: false, impulses: false, stretch: false, scripted: false, animated: false }),
});

const SPEED_FROM_DNA = { slower: 'slowest', natural: 'slow', livelier: 'natural' };
const MODE_FROM_COMFORT = { breathe: 'breathe', quiet: 'quiet', float: 'drift', glow: 'moonlight', hold: 'sleepy', stroke: 'sleepy' };

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const own = (o, k) => o !== null && typeof o === 'object' && Object.hasOwn(o, k);

/** One field, cleaned: the value to keep, or undefined to drop it. */
export function cleanField(k, v) {
  switch (k) {
    case 'mode': return MODES_ORDER.includes(v) ? v : undefined;
    case 'brightness': return finite(v) ? clamp(Math.round(v * 20) / 20, 0.05, 1) : undefined;     // the slider: 5..100 in 5s
    case 'temp': return finite(v) ? clamp(Math.round(v * TEMP_STEPS) / TEMP_STEPS, 0, 1) : undefined;
    case 'speed': return typeof v === 'string' && Object.hasOwn(SPEEDS, v) ? v : undefined;
    case 'volume': return finite(v) ? clamp(Math.round(v * 100) / 100, 0, 1) : undefined;
    case 'minutes': return TIMER_MINUTES.includes(v) ? v : undefined;
    case 'motion': return MOTIONS.includes(v) ? v : undefined;
    case 'fade': case 'keepAwake': case 'quietSound': return typeof v === 'boolean' ? v : undefined;
    default: return undefined;
  }
}

/** The valid own fields of a stored value (what the person changed), as a new object. */
export function storedFields(raw) {
  const out = {};
  for (const k of NIGHT_KEYS) {
    if (!own(raw, k)) continue;
    const c = cleanField(k, raw[k]);
    if (c !== undefined) out[k] = c;
  }
  return out;
}

/**
 * Full settings from a stored value over a base (defaults): field by field,
 * own keys only (inherited names such as __proto__ or constructor are never
 * read), ranges clamped and snapped to the sheet's steps. Frozen.
 */
export function cleanNight(raw, base = NIGHT_DEFAULTS) {
  const out = {};
  for (const k of NIGHT_KEYS) {
    const b = own(base, k) ? cleanField(k, base[k]) : undefined;
    out[k] = b === undefined ? NIGHT_DEFAULTS[k] : b;
  }
  return Object.freeze(Object.assign(out, storedFields(raw)));
}

/**
 * Defaults with Comfort DNA folded in: Speed from animationSpeed (slower →
 * Slowest, natural → Slow, livelier → Natural) and the first mode from the
 * first thing in comfort[] that maps to one. With personalisation off,
 * dna.get() returns DNA defaults, which give NIGHT_DEFAULTS.
 */
export function defaultsFromDNA(dna) {
  const get = (k) => { try { return dna?.get?.(k); } catch { return undefined; } };
  const pace = get('animationSpeed');
  const speed = typeof pace === 'string' && Object.hasOwn(SPEED_FROM_DNA, pace) ? SPEED_FROM_DNA[pace] : NIGHT_DEFAULTS.speed;
  let mode = NIGHT_DEFAULTS.mode;
  const comfort = get('comfort');
  if (Array.isArray(comfort)) {
    const hit = comfort.find((c) => typeof c === 'string' && Object.hasOwn(MODE_FROM_COMFORT, c));
    if (hit) mode = MODE_FROM_COMFORT[hit];
  }
  return Object.freeze({ ...NIGHT_DEFAULTS, speed, mode });
}

/** The Movement actually used: the setting, but at least Less when the lab or the system asks for reduced motion. */
export function effectiveMotion(setting, reduced) {
  const m = MOTIONS.includes(setting) ? setting : 'gentle';
  return reduced && m === 'gentle' ? 'less' : m;
}

/** Light slider position (0..4) ↔ temp (0..1). */
export const tempIndex = (temp) => clamp(Math.round((finite(temp) ? temp : NIGHT_DEFAULTS.temp) * TEMP_STEPS), 0, TEMP_STEPS);
export const tempAt = (i) => clamp(Math.round(finite(i) ? i : 2), 0, TEMP_STEPS) / TEMP_STEPS;

/**
 * The live settings of one Nightlight screen: memory is updated at once,
 * prefs are written on release (persist 'now'), after a 400 ms debounce
 * ('debounced'), or later on flush() (false). Timers are injectable for tests.
 * No subscriptions of its own: the feature calls reload() when prefs are reset
 * or Comfort DNA changes, and destroy() (which flushes) on unmount.
 */
export class NightSettings {
  constructor(prefs, dna = null, { setTimeout: st = globalThis.setTimeout, clearTimeout: ct = globalThis.clearTimeout, debounceMs = 400 } = {}) {
    this.prefs = prefs;
    this.dna = dna;
    this._st = st;
    this._ct = ct;
    this.debounceMs = debounceMs;
    this._timer = null;
    this._dirty = false;
    this._writing = false;
    this.listeners = new Set();
    this.reload();
  }

  /** Re-read prefs and Comfort DNA (a pending write is dropped). */
  reload() {
    this._cancel();
    this._dirty = false;
    let raw = null;
    try { raw = this.prefs?.get?.('nightlight') ?? null; } catch { raw = null; }
    this.base = defaultsFromDNA(this.dna);
    this.stored = storedFields(raw);
    this.cur = cleanNight(this.stored, this.base);
    return this.cur;
  }

  /** The full current settings (frozen; replaced on every change). */
  get() { return this.cur; }

  /** True while this object is writing to prefs (so the feature can ignore its own change). */
  get writing() { return this._writing; }

  /** Change one field. Returns false (and changes nothing) for an unknown key or an invalid value. */
  set(k, v, { persist = 'debounced' } = {}) {
    if (!NIGHT_KEYS.includes(k)) return false;
    const c = cleanField(k, v);
    if (c === undefined) return false;
    if (this.stored[k] !== c || !Object.hasOwn(this.stored, k)) this.stored = { ...this.stored, [k]: c };
    const changed = this.cur[k] !== c;
    if (changed) this.cur = Object.freeze({ ...this.cur, [k]: c });
    this._dirty = true;
    if (persist === 'now') this.flush();
    else if (persist === 'debounced') this._schedule();
    if (changed) for (const fn of [...this.listeners]) fn(k, c, this.cur);
    return true;
  }

  /** Write any pending change to prefs now (always as a new object). */
  flush() {
    this._cancel();
    if (!this._dirty) return;
    this._dirty = false;
    this._writing = true;
    try { this.prefs?.set?.('nightlight', { ...this.stored }); } finally { this._writing = false; }
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  destroy() { this.flush(); this.listeners.clear(); }

  _schedule() {
    this._cancel();
    this._timer = this._st(() => { this._timer = null; this.flush(); }, this.debounceMs);
  }

  _cancel() {
    if (this._timer != null) { this._ct(this._timer); this._timer = null; }
  }
}
