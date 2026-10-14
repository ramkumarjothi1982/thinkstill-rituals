// Weather Weaver — the weather's sound (Web Audio only through the Sound Engine;
// no DOM, and nothing is touched at import time, so it runs in Node on the fake
// audio context).
//
//   bedLevels(s, out)  what the bed plays now (pure): one level per layer, from
//                      what the sims are doing (drops falling, thunderheads
//                      overhead, wind energy, water moving, mist) and a soft pad
//                      for the warm and night skies, all weighted by the
//                      planner's presence, so sound and picture cross-fade
//                      together through turns and fronts
//   WeatherSound       one AmbientBed (rain hiss, wind, storm rumble, water lap,
//                      air, and the pad on the Mallow's own root) plus the
//                      one-shots that land with what the hand does: drips as a
//                      bead gathers, a swish as clouds part, a swell pushed
//                      across the water, soft thunder after a cloud glow, chimes
//                      for glints, kindles and star tinks, a star shower, the
//                      brush of wiping mist
//
// Rules (spec-weather.md §6, SHARED C7–C9): nothing exists before the first
// gesture (the engine is not ready until lab.js unlocks it); the bed and every
// one-shot follow Touch sounds (respectFx, sound.fxOn) and Mute; the Mallow's
// voice and motifs stay with the engine (voiceOn). The bed is one long-lived
// `keep` voice, so the voice cap evicts it last; anything that stops every
// voice (mute, a hidden page) marks it not alive and the next update rebuilds
// it with a 1 s fade-in. One-shots go through the engine's _ok (ready, its own
// rate limit, and _room() under the voice cap) and their own gates. Thunder is
// a low swell and never a crack. The low tier keeps rain, wind and the pad.

import { AmbientBed } from './ambience.js';
import { VOICES } from './sound-engine.js';
import { DIAL_ORDER } from './weather.js';
import { clamp, smoothstep } from './math.js';

const F = Object.freeze;
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const unit = (v) => clamp(num(v, 0), 0, 1);

/** The bed's noise layers (spec §6): filter, peak gain, amplitude LFO. Pink where the band is high, brown where it is low. */
export const LAYERS = F({
  rain: F({ type: 'bandpass', f: 3200, q: 0.6, peak: 0.03, color: 'pink' }),
  wind: F({ type: 'bandpass', f: 300, q: 1.2, peak: 0.035, lfo: 0.15, depth: 0.5, color: 'pink' }),
  rumble: F({ type: 'lowpass', f: 140, q: 0.7, peak: 0.045, color: 'brown' }),
  lap: F({ type: 'bandpass', f: 420, q: 2, peak: 0.02, lfo: 0.25, depth: 0.6, color: 'brown' }),
  air: F({ type: 'lowpass', f: 500, q: 0.5, peak: 0.01, color: 'brown' }),
});
/** Layers per quality tier (the pad plays on every tier): 5 / 4 / 2 noise layers. */
export const TIER_LAYERS = F({
  high: F(['rain', 'wind', 'rumble', 'lap', 'air']),
  medium: F(['rain', 'wind', 'rumble', 'lap']),
  low: F(['rain', 'wind']),
});
const RANK = F({ low: 0, medium: 1, high: 2 });
export const PAD = F({ peak: 0.035, lp: 700 });
export const BED = F({ tau: 0.6, fadeIn: 1, updateMs: 100 });
export const WIND_HZ = F([300, 900]);                    // the wind band's centre follows energy
export const RUMBLE_SWELL = F({ up: 0.35, secs: 0.5 });  // a cloud glow swells the rumble over 0.5 s
/** ms between one-shots of a kind (on top of the engine's own 40 ms per key). */
export const GAPS = F({ drip: 166, pat: 700, splash: 333, swish: 250, swell: 500, arrive: 900, thunder: 6000, chime: 200, shower: 1200, rise: 400 });

const WARM_SKIES = F(['sunshine', 'warm', 'moonlight', 'starlight']);

/**
 * The pad for weather `w`: a warm or night tone under Sunshine, Warm glow, Moonlight and Starlight
 * (0.4 + 0.6 · the realm's warmth); the cloud weathers bring it in only as they settle, so a raging
 * storm has none and a parted one hums.
 */
export function padFor(w, progress = 0, warmth = 0.5) {
  if (WARM_SKIES.includes(w)) return 0.4 + 0.6 * unit(warmth);
  return 0.5 * smoothstep(0.5, 1, unit(progress));
}

/**
 * The bed's levels now (0..1 each) and the wind band's centre, written into `out` (no allocation).
 * s: { amount(w) → the planner's presence 0..1 (missing: the current weather only), weather, progress,
 *      warmth (the realm mood's warmth), rain (drops falling now), storm (thunderhead coverage × presence),
 *      wind (flow energy), water (realm water present, 0..1), waves (wave energy), mist (fog density),
 *      fade (1, falling to 0 while the screen leaves) }
 */
export function bedLevels(s, out = {}) {
  const f = unit(num(s.fade, 1)), e = unit(s.wind);
  out.rain = unit(s.rain) * f;
  out.wind = e * f;
  out.rumble = unit(s.storm) * f;
  out.lap = unit(s.water) * clamp(num(s.waves, 0) + 0.3, 0, 1) * f;
  out.air = unit(s.mist) * f;
  let pad = 0;
  for (let i = 0; i < DIAL_ORDER.length; i++) {
    const w = DIAL_ORDER[i], a = typeof s.amount === 'function' ? unit(s.amount(w)) : w === s.weather ? 1 : 0;
    if (a > 0) pad += a * padFor(w, w === s.weather ? s.progress : 0, s.warmth);
  }
  out.pad = clamp(pad, 0, 1) * f;
  out.windHz = WIND_HZ[0] + (WIND_HZ[1] - WIND_HZ[0]) * e;
  return out;
}

export class WeatherSound {
  /**
   * @param {import('./sound-engine.js').SoundEngine} sound  the lab's engine (ctx.sound)
   * @param {string} mallowId  its voice (root and scale) tunes the pad, drips and chimes
   * @param {{tier?:'high'|'medium'|'low', now?:()=>number}} [o]
   */
  constructor(sound, mallowId, { tier = 'medium', now = () => performance.now() } = {}) {
    this.sound = sound;
    this.id = Object.hasOwn(VOICES, mallowId) ? mallowId : 'boppo';
    this.V = VOICES[this.id];
    this.now = now;
    this.tier = Object.hasOwn(TIER_LAYERS, tier) ? tier : 'medium';
    this.bed = this._bed(this.tier);
    this.played = Object.create(null);   // one-shots played, by kind (debug and tests)
    this._gates = Object.create(null);
    this._brush = null;
    this._last = -Infinity;
    this.ended = false;
  }

  _bed(tier) {
    const layers = {};
    for (const k of TIER_LAYERS[tier]) layers[k] = LAYERS[k];
    return new AmbientBed(this.sound, { layers, pad: { root: this.V.root, peak: PAD.peak, lp: PAD.lp }, respectFx: true, tau: BED.tau, fadeIn: BED.fadeIn });
  }

  /** Bed levels (bedLevels' output), at most every 100 ms; builds the bed once the sound is ready. */
  update(levels, nowMs = this.now()) {
    if (this.ended || nowMs - this._last < BED.updateMs) return;
    this._last = nowMs;
    const b = this.bed;
    b.want(true);
    b.set(levels);
    if (Number.isFinite(levels.windHz)) b.setFreq('wind', levels.windHz);
    b.tick(nowMs);
  }

  /** A quality tier: the bed only ever loses layers mid-session (rebuilt, cross-fading). */
  setTier(q) {
    if (!Object.hasOwn(RANK, q) || RANK[q] >= RANK[this.tier]) return;
    const old = this.bed, levels = { ...old.levels };
    this.tier = q;
    this.bed = this._bed(q);
    this.bed.set(levels);
    if (old.wanted) this.bed.want(true);
    old.end(0.8);
    this._last = -Infinity;
  }

  get alive() { return this.bed.alive; }

  // ------------------------------------------------------------ one-shots --
  // Each plays only with Touch sounds on and the engine ready, behind its own gate and the
  // engine's _ok (its rate limit, and _room() under the voice cap). Returns true when it played.

  /** A bead merges: a plink up the Mallow's scale (≤ 6 a second). */
  drip(step = 0, i = 1, pan = 0) {
    const v = this._voice('drip', 0.25, pan);
    if (!v) return false;
    const f = this._note(step % 7);
    this.sound._tone(v, v.t, { f0: f * 1.08, f1: f, dur: 0.18, type: 'sine', peak: 0.04 * clamp(num(i, 1), 0.2, 1), a: 0.004 });
    v.end(v.t + 0.25);
    return true;
  }

  /** A drop lands on the Mallow: a tiny soft tick, high on its scale (≤ 1 every 0.7 s, so steady rain stays calm). */
  patter(pan = 0) {
    const v = this._voice('pat', 0.15, pan);
    if (!v) return false;
    const f = this._note(4 + (this.played.pat % 3));
    this.sound._tone(v, v.t, { f0: f * 1.5, f1: f * 1.4, dur: 0.08, type: 'sine', peak: 0.018, a: 0.003 });
    v.end(v.t + 0.15);
    return true;
  }

  /** A bead or a drop lands: a short bandpassed splash, bigger for a bigger bead (≤ 3 a second). */
  splash(size = 0.5, pan = 0) {
    const v = this._voice('splash', 0.4, pan);
    if (!v) return false;
    const k = unit(size);
    this.sound._noise(v, v.t, { dur: 0.3, f0: 1500 + 800 * k, f1: 500, q: 0.8, peak: 0.025 + 0.025 * k, a: 0.012 });
    v.end(v.t + 0.4);
    return true;
  }

  /** Clouds parting, a wipe starting, a stroke of wind: a soft rising sweep (≤ 4 a second). */
  swish(speed = 0.5, pan = 0) {
    const v = this._voice('swish', 0.45, pan);
    if (!v) return false;
    this.sound._noise(v, v.t, { dur: 0.35, f0: 600, f1: 2400, q: 0.7, peak: 0.012 + 0.018 * unit(speed), a: 0.08 });
    v.end(v.t + 0.45);
    return true;
  }

  /** A swell pushed across the water (≤ 2 a second), or arriving at the Mallow (`arrive`, ≤ 1 a second). */
  swell(strength = 0.5, pan = 0, kind = 'swell') {
    const v = this._voice(kind === 'arrive' ? 'arrive' : 'swell', 1.3, pan);
    if (!v) return false;
    this.sound._noise(v, v.t, { dur: 1.2, f0: 380, f1: 620, type: 'lowpass', q: 0.5, peak: 0.012 + 0.018 * unit(strength), a: 0.4 });
    v.end(v.t + 1.3);
    return true;
  }

  /** Soft thunder after a cloud glow: a low swell that rolls on, never a crack (≥ 6 s apart). k: 1, softer for glows. */
  thunder(k = 1) {
    const v = this._voice('thunder', 2.8);
    if (!v) return false;
    const K = clamp(num(k, 1), 0.2, 1);
    this.sound._noise(v, v.t, { dur: 2.2, f0: 160, f1: 80, type: 'lowpass', q: 0.6, peak: 0.06 * K, a: 0.35 });
    this.sound._noise(v, v.t + 0.5, { dur: 1.8, f0: 120, f1: 60, type: 'lowpass', q: 0.5, peak: 0.03 * K, a: 0.5 });   // the roll
    v.end(v.t + 2.8);
    return true;
  }

  /** A cloud glows: the rumble swells over 0.5 s, then eases back to what the clouds say. */
  rumble(k = 1) {
    const b = this.bed;
    if (this.ended || !Object.hasOwn(b.levels, 'rumble')) return false;
    b.ramp('rumble', clamp(b.levels.rumble + RUMBLE_SWELL.up * unit(k), 0, 1), RUMBLE_SWELL.secs);
    return true;
  }

  /** A bead rises into the cloud as light: a soft upward glide with a high shimmer. */
  rise(n = 8) {
    const v = this._voice('rise', 0.9);
    if (!v) return false;
    const f = this._note(2);
    this.sound._tone(v, v.t, { f0: f * 0.75, f1: f * 1.5, dur: 0.5, type: 'sine', peak: 0.03 + 0.02 * unit(num(n, 8) / 24), a: 0.06 });
    this.sound._tone(v, v.t + 0.18, { f0: f * 2, dur: 0.6, type: 'sine', peak: 0.012, a: 0.01 });
    v.end(v.t + 0.9);
    return true;
  }

  /** A star shower for the Mallow: four soft notes falling down its scale. */
  shower() {
    const v = this._voice('shower', 1.6);
    if (!v) return false;
    [7, 6, 4, 2].forEach((step, k) => this.sound._tone(v, v.t + k * 0.09, { f0: this._note(step), dur: 0.6, type: 'sine', peak: 0.025, a: 0.006 }));
    v.end(v.t + 1.6);
    return true;
  }

  /** A bell on the Mallow's scale (the engine's chime), ≤ 5 a second across glints, kindles and tinks. */
  chime(step = 0, i = 0.35) {
    const s = this.sound;
    if (this.ended || !s.fxOn || !s.ready || !this._gate('chime')) return false;
    this._count('chime');
    s.chime(this.id, ((step % 10) + 10) % 10, i);
    return true;
  }
  /** A light pool comes to rest. */
  glint(step = 3) { return this.chime(step, 0.35); }
  /** An ember kindles. */
  kindle(step = 4) { return this.chime(step, 0.3); }
  /** A star joins the cluster at the fingertip. */
  tink(step = 2) { return this.chime(step, 0.3); }
  /** The first light through a storm: a warm pair (steps 2 and 4), whatever the chime gate says. */
  pair() {
    const s = this.sound;
    if (this.ended || !s.fxOn || !s.ready) return false;
    this._count('pair');
    s.chime(this.id, 2, 0.35); s.chime(this.id, 4, 0.3);
    return true;
  }

  /** Wiping mist: the engine's continuous brush, owned here, following the wipe speed (0..1); off ends it. */
  wipe(on, speed = 0) {
    const s = this.sound;
    if (!on || this.ended || !s.fxOn || !s.ready) {
      if (this._brush) { this._brush.end(); this._brush = null; }
      return false;
    }
    if (!this._brush) { s._room(); this._brush = s.brush(); this._count('wipe'); }
    this._brush.update(unit(speed));
    return true;
  }

  /** Fade the bed out (fadeS seconds) and stop wiping; nothing plays afterwards. */
  end(fadeS = 1.5) {
    if (this.ended) return;
    this.wipe(false);
    this.ended = true;
    this.bed.end(fadeS);
  }

  destroy() { this.end(0.4); }

  debug() {
    const b = this.bed.debug();
    return { alive: b.alive, wanted: b.wanted, builds: b.builds, tier: this.tier, layers: Object.keys(this.bed.layers), levels: b.levels,
      played: { ...this.played }, wiping: !!this._brush, ended: this.ended };
  }

  // ------------------------------------------------------------ internals --
  _gate(key) {
    const t = this.now();
    if (t - (this._gates[key] ?? -1e9) < GAPS[key]) return false;
    this._gates[key] = t;
    return true;
  }

  _count(key) { this.played[key] = (this.played[key] || 0) + 1; }

  // a one-shot voice, or null: Touch sounds on, ready, its own gate, then the engine's _ok (→ _room())
  _voice(key, dur, pan = 0) {
    const s = this.sound;
    if (this.ended || !s.fxOn || !s.ready || !this._gate(key) || !s._ok('wx:' + key)) return null;
    this._count(key);
    return s._voice(dur, { pan: clamp(num(pan, 0), -0.8, 0.8) });
  }

  // a note on the Mallow's scale, kept in a gentle register (low roots up an octave)
  _note(step) {
    const V = this.V, n = Math.max(0, Math.floor(num(step, 0)));
    return V.root * (V.root < 400 ? 2 : 1) * Math.pow(2, (V.scale[n % 5] + 12 * Math.floor(n / 5)) / 12);
  }
}
