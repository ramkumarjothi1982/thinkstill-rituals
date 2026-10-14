// Environment Engine — one Hushfold realm per container, for every screen
// that has a world behind the Mallow (stage-screen, Weather, Hushbeat,
// Nightlight's live window).
//
//   const env = new Environment(wrap, { screen, quality, reducedMotion });
//   env.mount('blue-drift', { groundY: 0.8 });
//   env.setMood({ agitation: 0.6 });     // throttled: ≤ 5 sends a second unless a big move
//   env.pulse('strike', { nx: 0.5, ny: 0.3 });   // photosafe: refused pulses are dropped, never converted
//   env.destroy();
//
// Also the chrome tone over a realm (backdropTone), realm geometry
// (REALM_GEO: horizons and lights, the single source for features) and
// painted stills (paintRealm). Nothing touches the DOM at import time, and
// nothing else in the lab calls mountRealm.

import { mountRealm, REALMS, REALM_IDS, realmForMallow } from '../../src/world/realm.js';
import { FlashGate } from './effects.js';
import { clamp } from './math.js';

export const REALM_GEO = {   // fractions of W/H; mirrors production realm geometry (verified against src/world/realms/*.js)
  'blue-drift':         { sky: 'day',   horizon: 0.57,  water: [0.57, 1],     sun: [0.72, 0.25], moon: null },
  'sunpop-orchard':     { sky: 'day',   horizon: 0.665, water: null,          sun: [0.80, 0.15], moon: null },
  'raindrop-lagoon':    { sky: 'dusk',  horizon: 0.60,  water: [0.60, 1],     sun: null,         moon: null },
  'moonmilk-cove':      { sky: 'night', horizon: 0.50,  water: [0.50, 0.735], sun: null,         moon: [0.70, 0.285], shore: [0.785, 0.05] },
  'spark-festival':     { sky: 'night', horizon: 0.60,  water: null,          sun: null,         moon: [0.80, 0.125] },
  'spiral-observatory': { sky: 'night', horizon: 0.635, water: null,          sun: null,         moon: null, feature: [0.5, 0.355], indoor: true },
  'static-storm':       { sky: 'night', horizon: 0.655, water: null,          sun: null,         moon: null },
};
export const PULSE_KINDS = ['tap', 'ripple', 'success', 'burst', 'strike', 'clear'];
export const BRIGHT_PULSES = ['success', 'burst', 'strike', 'clear'];
export const PULSE_GAPS = { tap: 90, ripple: 200, success: 900, burst: 900, strike: 1500, clear: 4000 };   // ms, per kind

const AXES = ['agitation', 'heaviness', 'clarity', 'warmth'];
const MOOD_GAP = 200;     // ms between small mood sends
const MOOD_STEP = 0.02;   // an axis move this big is sent at once
const LOG_N = 32;

/** Chrome tone over a realm: its sky's relative luminance > 0.3 → 'light', else 'dark'. */
export function backdropTone(realmId) {
  const sky = REALMS[realmId]?.palette.sky || '#000000';
  const n = parseInt(sky.replace('#', ''), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.3 ? 'light' : 'dark';
}

/** A known realm id, else the Mallow's own realm for a Mallow id, else the Moonmilk Cove. */
const resolve = (id) => (Object.hasOwn(REALMS, id) ? id : realmForMallow(id)?.id || 'moonmilk-cove');

/** The world a feature that always needs one opens in: the chosen realm, else the Mallow's own. */
export function homeRealm(dna, mallowId) {
  const e = dna?.get?.('environment');
  return REALM_IDS.includes(e) ? e : realmForMallow(mallowId)?.id || 'moonmilk-cove';
}

/** The world's main light as [nx, ny] fractions: its sun, moon or central feature. */
export function lightAnchor(realmId) {
  const g = Object.hasOwn(REALM_GEO, realmId) ? REALM_GEO[realmId] : null;
  const a = g && (g.sun || g.moon || g.feature);
  return a ? [a[0], a[1]] : [0.5, 0.2];
}

/** The default realm pulse gate: ≤ max bright pulses a second, plus PULSE_GAPS per kind. */
export function pulseGate({ max = 2, now } = {}) {
  return new FlashGate({ max, windowMs: 1000, gaps: PULSE_GAPS, bright: BRIGHT_PULSES, now });
}

export class Environment {
  /**
   * @param {HTMLElement} wrap  positioned container the realm canvas goes into
   * @param {{screen?:HTMLElement|null, quality?:string, reducedMotion?:boolean, lowStimulation?:boolean,
   *          gate?:FlashGate|null, mount?:Function, now?:()=>number}} [o]
   *   screen: gets data-backdrop (chrome tone) and data-realm while a realm is mounted.
   *   gate: shared photosafe limiter (Hushbeat passes one gate for realm and effects).
   *   mount, now: test seams (default mountRealm, performance.now).
   */
  constructor(wrap, { screen = null, quality = 'medium', reducedMotion = false, lowStimulation = false,
    gate = null, mount = mountRealm, now = () => performance.now() } = {}) {
    this.wrap = wrap;
    this.screen = screen;
    this.quality = quality;
    this.reduced = !!reducedMotion;
    this.low = !!lowStimulation;
    this.now = now;
    this.gate = gate || pulseGate({ now });
    this._mount = mount;
    this._realm = null;
    this._id = null;
    this._target = { agitation: 0, heaviness: 0, clarity: 0, warmth: 0 };   // where the world is heading
    this._sent = { agitation: 0, heaviness: 0, clarity: 0, warmth: 0 };     // what the realm was last told
    this._sentAt = 0;
    this._p = 0;
    this._groundY = 0.86;
    this._log = Array.from({ length: LOG_N }, () => ({ t: 0, kind: '', ok: false }));
    this._logN = 0;
  }

  /** Mount (or replace) the realm. An unknown id resolves through the Mallow registry, else the Moonmilk Cove. */
  mount(realmId, { mood = null, emotion = 'calm', intensity = 0.4, transform = 0, groundY = 0.86 } = {}) {
    this._realm?.destroy();
    this._realm = null;
    const id = resolve(realmId);
    const realm = this._mount(this.wrap, id, {
      ...(mood ? { mood } : { emotion, intensity }), transform, groundY,
      reducedMotion: this.reduced, lowStimulation: this.low, quality: this.quality === 'low' ? 'low' : 'auto',
    });
    this._realm = realm;
    this._id = id;
    const m = realm.getMood?.() || mood || {};
    for (const k of AXES) { const v = typeof m[k] === 'number' && Number.isFinite(m[k]) ? clamp(m[k], 0, 1) : 0; this._target[k] = v; this._sent[k] = v; }
    this._sentAt = this.now();
    this._p = typeof transform === 'number' && Number.isFinite(transform) ? clamp(transform, 0, 1) : 0;
    this._groundY = groundY;
    if (this.screen) { this.screen.dataset.backdrop = backdropTone(id); this.screen.dataset.realm = id; }
    return realm;
  }

  /** Rebuild the same realm (e.g. a new ground line) at the current target mood and transform. */
  remount({ groundY } = {}) {
    if (!this._id) return null;
    return this.mount(this._id, { mood: { ...this._target }, transform: this._p, groundY: groundY ?? this._groundY });
  }

  get realm() { return this._realm; }
  get realmId() { return this._realm ? this._id : null; }
  get geo() { return this._realm ? REALM_GEO[this._id] || null : null; }
  get tone() { return this._realm ? backdropTone(this._id) : null; }
  get mood() { return this._realm ? { ...this._sent } : null; }
  /** Copy of the last 32 pulse decisions, oldest first: [{t, kind, ok}]. */
  get log() {
    const n = Math.min(LOG_N, this._logN), out = [];
    for (let i = this._logN - n; i < this._logN; i++) out.push({ ...this._log[i % LOG_N] });
    return out;
  }

  /**
   * Merge mood axes (0..1) into the target. Sent to the realm only when it differs
   * from what was last sent, and then at most every 200 ms unless an axis moved by
   * ≥ 0.02 (so calling every frame is fine). No allocation. True when sent.
   */
  setMood(m) {
    if (!this._realm || !m) return false;
    const T = this._target, S = this._sent;
    let diff = false, big = false;
    for (let i = 0; i < AXES.length; i++) {   // indexed: no iterator per call
      const k = AXES[i], v = m[k];
      if (typeof v === 'number' && Number.isFinite(v)) T[k] = clamp(v, 0, 1);
      const d = Math.abs(T[k] - S[k]);
      if (d > 0) diff = true;
      if (d >= MOOD_STEP) big = true;
    }
    if (!diff) return false;
    const t = this.now();
    if (!big && t - this._sentAt < MOOD_GAP) return false;
    for (let i = 0; i < AXES.length; i++) S[AXES[i]] = T[AXES[i]];
    this._sentAt = t;
    this._realm.setMood(T);
    return true;
  }

  /** Ritual progress 0..1; sent when it moved by ≥ 0.005, or reached exactly 0 or 1. True when sent. */
  transform(p) {
    if (!this._realm || typeof p !== 'number' || !Number.isFinite(p)) return false;
    p = clamp(p, 0, 1);
    if (!(Math.abs(p - this._p) >= 0.005 || ((p === 0 || p === 1) && p !== this._p))) return false;
    this._p = p;
    this._realm.transform(p);
    return true;
  }

  setFocus(nx, ny) { this._realm?.setFocus(nx, ny); }

  /**
   * A realm pulse through the gate. pos: {nx, ny} fractions or {x, y} client px.
   * A refused pulse is dropped (never turned into a gentler kind) and logged.
   * Callers apply their own gentle / reduced-motion rules first.
   */
  pulse(kind, pos = {}) {
    if (!this._realm) return false;
    if (!PULSE_KINDS.includes(kind)) kind = 'tap';
    const t = this.now(), ok = this.gate.allow(kind, t);
    const e = this._log[this._logN++ % LOG_N];
    e.t = t; e.kind = kind; e.ok = ok;
    if (ok) this._realm.pulse(kind, pos);
    return ok;
  }

  setReducedMotion(b) { this.reduced = !!b; this._realm?.setReducedMotion(this.reduced); }
  /** A lab tier ('high' | 'medium' | 'low'): the realm runs 'low' or 'auto'. */
  setQuality(q) { this.quality = q; this._realm?.setQuality(q === 'low' ? 'low' : 'auto'); }
  setLowStimulation(b) { this.low = !!b; this._realm?.setLowStimulation(this.low); }

  /** A copy of the live realm canvas (its backing size, or W·dpr × H·dpr), or null. */
  snapshot({ dpr = null } = {}) {
    const src = this._realm?.canvas;
    if (!src) return null;
    try {
      const st = this._realm.debug?.state;
      const W = st?.W || src.clientWidth || src.width, H = st?.H || src.clientHeight || src.height;
      return dpr > 0 ? copyCanvas(src, Math.round(W * dpr), Math.round(H * dpr)) : copyCanvas(src, src.width, src.height);
    } catch { return null; }
  }

  destroy() {
    this._realm?.destroy();
    this._realm = null;
    this._id = null;
    if (this.screen) delete this.screen.dataset.realm;   // data-backdrop stays: the screen is going too
  }
}

/**
 * A painted still of a realm: mounted into `host` (laid out at the target size,
 * visibility:hidden, owned by the caller) with reduced motion, its synchronous
 * first frame copied at round(W·dpr) × round(H·dpr), then destroyed. Null when
 * anything throws or the copy is blank.
 */
export function paintRealm(host, realmId, { mood = null, transform = 0, groundY = 0.86, dpr = 1, quality = 'auto' } = {}) {
  let realm = null;
  try {
    realm = mountRealm(host, resolve(realmId), { ...(mood ? { mood } : { emotion: 'calm', intensity: 0.4 }), transform, groundY, reducedMotion: true, quality });
    const st = realm.debug?.state, src = realm.canvas;
    const W = st?.W || host.clientWidth || 1, H = st?.H || host.clientHeight || 1;
    const out = copyCanvas(src, Math.max(1, Math.round(W * dpr)), Math.max(1, Math.round(H * dpr)));
    return out && !isBlank(out) ? out : null;
  } catch {
    return null;
  } finally {
    try { realm?.destroy(); } catch { /* already gone */ }
  }
}

/** True when the canvas is empty or black (max relative luminance < 0.01 over a 16×16 sample). Tainted → false. */
export function isBlank(canvas) {
  if (!canvas || !canvas.width || !canvas.height) return true;
  try {
    const s = document.createElement('canvas');
    s.width = 16; s.height = 16;
    const g = s.getContext('2d', { willReadFrequently: true });
    if (!g) return false;
    g.drawImage(canvas, 0, 0, 16, 16);
    const d = g.getImageData(0, 0, 16, 16).data;
    let max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const L = (0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2])) * d[i + 3] / 255;
      if (L > max) max = L;
    }
    return max < 0.01;
  } catch {
    return false;   // tainted: unreadable, so not known to be blank
  }
}

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

function copyCanvas(src, w, h) {
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const g = out.getContext('2d');
  if (!g) return null;
  g.drawImage(src, 0, 0, w, h);
  return out;
}
