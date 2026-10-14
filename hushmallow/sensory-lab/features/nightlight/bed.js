// Mallow Nightlight: the night's sound (no DOM; Web Audio only through the
// Sound Engine, so it runs in Node with the fake audio context).
//
//   nightSound(sound, id)   the Companion's sound at night: softer touches, no
//                           thuds, only sleepy voices; setQuiet(true) silences it
//                           (Quiet Company with Sound off)
//   bedPlan(input, out)     what the bed should do now (pure): on or off, the pad
//                           and texture levels, and its peak gain
//   NightBed                the bed: one AmbientBed with a noise texture that
//                           belongs to the night world (waves, air or hush) and a
//                           soft pad on the Mallow's own root note, darker as the
//                           Light warms. Breathe swells the texture with the breath;
//                           Drift adds a rare bell on a firefly's glint.
//
// SHARED C7: the bed is content sound with its own controls (Quiet's Sound chip,
// the Nightlight Volume, Mute), so it does not follow Touch sounds
// (respectFx: false). Volume is not in the bed: it is the master trim
// (sound.setTrim), so it scales the Mallow's voice too. Nothing ever plays
// silently: below a displayed sound level of 0.03, at Volume 0, in silent
// Quiet, while hidden and once ended the bed is let go, and it rises from
// silence over 4 s when it comes back. Nothing plays before a gesture
// (the engine is not ready until lab.js unlocks it).

import { AmbientBed } from '../../core/ambience.js';
import { soundFacade, VOICES } from '../../core/sound-engine.js';
import { nightVoice, NIGHT_K } from './ways.js';
import { clamp, lerp, rng, hash } from '../../core/math.js';

const F = Object.freeze;

export const BED = F({
  peak: 0.035,          // peak gain at full level (× the mode's factor × the displayed sound level)
  tau: 1.5,             // level and filter easing (s): mode changes and the fade glide
  fadeIn: 4,            // a new bed rises from silence over this (s)
  floor: 0.03,          // below this displayed sound level the bed is let go
  reconcileMs: 1000,    // levels follow at most once a second (on / off and a new mix at once)
  breathLow: 0.3,       // Breathe: the texture's out-breath level, of its mode level
  chimeGapMs: 20000,    // Drift: at most one bell per 20 s…
  chimeI: 0.25,         // …this soft…
  chimeFrom: 0.5,       // …and only while the bed is at half its level or more
  padLfo: 0.04, padLfoDepth: 80,
});

/** The pad's lowpass from Moon (bright, 900 Hz) to Ember (dark, 380 Hz). */
export const PAD_LP = F({ moon: 900, ember: 380 });
export const padFreq = (temp) => lerp(PAD_LP.moon, PAD_LP.ember, clamp(Number.isFinite(temp) ? temp : 0.5, 0, 1));

/**
 * One looping brown-noise texture per kind of night world (NIGHT_SCENES.texture):
 *   waves  the cove and the lagoon: a lowpassed wash that rises and falls (0.08 Hz, 40 %)
 *   air    the observatory and the plain night: a soft band of air (0.05 Hz, 25 %)
 *   hush   the storm and the festival after closing: low and still, at 0.7 of the level
 */
export const TEXTURES = F({
  waves: F({ type: 'lowpass', f: 520, q: 0.4, lfo: 0.08, depth: 0.4, gain: 1 }),
  air: F({ type: 'bandpass', f: 420, q: 0.5, lfo: 0.05, depth: 0.25, gain: 1 }),
  hush: F({ type: 'lowpass', f: 300, q: 0.5, lfo: 0.04, depth: 0.3, gain: 0.7 }),
});

/**
 * The night sound facade for the Companion (stage-screen's `sound` option):
 * touch sounds × 0.6 and no impact thuds; only coo, hum and content voices
 * (grumble for Glitzi and Noomi; silence for Loomi), at half strength.
 * setQuiet(true) makes every touch and voice silent; `quiet` reads it back.
 * An explicit object (the shared soundFacade), never Object.create.
 */
export function nightSound(sound, mallowId) {
  const voice = nightVoice(mallowId);
  const f = soundFacade(sound, { fx: NIGHT_K.touch, skip: ['impact'], voice });
  let quiet = false;
  f.setQuiet = (b) => { quiet = !!b; f.setFx(quiet ? 0 : NIGHT_K.touch); f.setVoice(quiet ? () => null : voice); };
  Object.defineProperty(f, 'quiet', { get: () => quiet, enumerable: true });
  return f;
}

/**
 * What the bed should do now. input: { split: MODES[mode].bed ({ factor, pad,
 * texture }), silent (Quiet with Sound off), volume (0..1), sound (the displayed
 * sound level), ended, hidden, leaving }. Levels are kept even when off, so a
 * rebuild starts at the right mix. No allocation with `out`.
 * → { on, pad, texture (0..1 of BED.peak), gain (the peak gain: BED.peak × factor × sound) }
 */
export function bedPlan({ split = null, silent = false, volume = 1, sound = 1, ended = false, hidden = false, leaving = false } = {}, out = {}) {
  const s = clamp(Number.isFinite(sound) ? sound : 0, 0, 1);
  const k = clamp(split?.factor ?? 0, 0, 1) * s;
  out.pad = clamp(k * (split?.pad ?? 0), 0, 1);
  out.texture = clamp(k * (split?.texture ?? 0), 0, 1);
  out.on = !!split && !silent && volume > 0 && s >= BED.floor && !ended && !hidden && !leaving && out.pad + out.texture > 0;
  out.gain = BED.peak * k;
  return out;
}

export class NightBed {
  /**
   * @param {import('../../core/sound-engine.js').SoundEngine} sound
   * @param {{mallowId?:string, texture?:string, quality?:string, temp?:number, seed?:number}} [o]
   */
  constructor(sound, { mallowId = 'noomi', texture = 'air', quality = 'medium', temp = 0.5, seed } = {}) {
    this.sound = sound;
    this.id = Object.hasOwn(VOICES, mallowId) ? mallowId : 'noomi';
    this.noiseSecs = quality === 'low' ? 4 : 6;
    this.temp = clamp(Number.isFinite(temp) ? temp : 0.5, 0, 1);
    this.rand = rng((seed ?? hash(`bed:${this.id}`)) >>> 0);
    this.plan = { on: false, pad: 0, texture: 0, gain: 0 };
    this._both = { pad: 0, texture: 0 };   // reused level objects for AmbientBed.set
    this._pad = { pad: 0 };
    this._at = -Infinity;
    this._force = true;
    this._breathing = false;
    this._lastChime = -Infinity;
    this.chimes = 0;
    this.texture = null;
    this.amb = null;
    this.setTexture(texture);
  }

  /** The night world's texture (a new world fades the old texture out as the new one fades in). */
  setTexture(name) {
    const key = Object.hasOwn(TEXTURES, name) ? name : 'air';
    if (key === this.texture) return;
    this.amb?.end(BED.tau);
    this.texture = key;
    const T = TEXTURES[key];
    this.amb = new AmbientBed(this.sound, {
      respectFx: false, tau: BED.tau, fadeIn: BED.fadeIn, noiseSecs: this.noiseSecs,
      layers: { texture: { type: T.type, f: T.f, q: T.q, peak: BED.peak * T.gain, lfo: T.lfo, depth: T.depth, color: 'brown' } },
      pad: { root: VOICES[this.id].root, peak: BED.peak, lp: padFreq(this.temp), lfo: BED.padLfo, lfoDepth: BED.padLfoDepth },
    });
    this._breathing = false;
    this._force = true;
  }

  /** The screen's bedPlan() output. Turning on or off is reconciled at once, levels at most once a second. */
  want(plan) {
    const p = this.plan;
    if (!!plan.on !== p.on) this._force = true;
    p.on = !!plan.on; p.pad = plan.pad; p.texture = plan.texture; p.gain = plan.gain;
  }

  /** Mark the mix changed (a mode change): reconciled on the next tick. */
  touch() { this._force = true; }

  /** The Light setting: the pad darkens from Moon to Ember. */
  setTemp(temp) {
    if (!Number.isFinite(temp)) return;
    this.temp = clamp(temp, 0, 1);
    this.amb.setFreq('pad', padFreq(this.temp));
  }

  /**
   * Breathe: the texture swells with the in-breath and falls with the out-breath
   * (one linear ramp per phase, over the phase's own length). Any other phase
   * ('holdIn', 'holdOut') leaves the swell where it is; null stops breathing and
   * hands the texture back to the plan.
   */
  breathe(phase, secs) {
    if (phase == null) { if (this._breathing) { this._breathing = false; this._force = true; } return; }
    if (phase !== 'in' && phase !== 'out') return;
    this._breathing = true;
    this.amb.ramp('texture', this.plan.texture * (phase === 'in' ? 1 : BED.breathLow), Math.max(0.5, +secs || 0));
  }

  /** Drift: one soft bell on the Mallow's scale, at most every 20 s, only while the bed is playing. */
  chime(nowMs = performance.now()) {
    const level = this.plan.gain / BED.peak;
    if (!this.alive || !this.sound.ready || level < BED.chimeFrom || nowMs - this._lastChime < BED.chimeGapMs) return false;
    this._lastChime = nowMs;
    this.chimes++;
    this.sound.chime(this.id, Math.floor(this.rand() * 5), BED.chimeI * Math.min(1, level));
    return true;
  }

  /** On the frame clock: reconcile (≤ 1 Hz, or at once after a change), then let the AmbientBed build, fade or ease. */
  tick(nowMs = performance.now()) {
    const p = this.plan, a = this.amb;
    if (this._force || nowMs - this._at >= BED.reconcileMs) {
      this._force = false;
      this._at = nowMs;
      a.want(p.on);
      if (this._breathing) { this._pad.pad = p.pad; a.set(this._pad); }
      else { this._both.pad = p.pad; this._both.texture = p.texture; a.set(this._both); }
    }
    a.tick(nowMs);
  }

  get alive() { return this.amb.alive; }
  get wanted() { return this.amb.wanted; }
  /** The bed's peak gain now (0 when it is not playing). */
  get gain() { return this.alive ? this.plan.gain : 0; }

  /** Let go: fade out over fadeS and stop (a tick with the plan on would bring it back). */
  end(fadeS = 1.5) { this.plan.on = false; this.amb.end(fadeS); }
  destroy() { this.end(0.4); }

  debug() {
    const v = this.amb.v;
    let fade = 0;
    try { fade = v ? +v.out.gain.value.toFixed(4) : 0; } catch { fade = 0; }
    return { alive: this.alive, wanted: this.wanted, on: this.plan.on, gain: +this.gain.toFixed(5), fade, texture: this.texture,
      breathing: this._breathing, builds: this.amb.builds, chimes: this.chimes, levels: { ...this.amb.levels } };
  }
}
