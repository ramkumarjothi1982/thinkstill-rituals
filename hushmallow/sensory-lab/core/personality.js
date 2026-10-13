// Character Personality Engine — how each Mallow answers a gesture.
//
// Deterministic and local: a response is chosen from authored variants using
// the gesture, its duration / rhythm / speed, recent history, a slowly
// drifting mood and the person's chosen style. A seeded PRNG keeps it
// reproducible (and testable) while avoiding the same answer twice in a row.
// No network, no AI calls, and no claim to know how the person feels: the mood
// here is the *Mallow's* state, built only from what was touched.
//
// A response: {
//   react?   rig one-shot reaction kind (src/mallows/reactions.js)
//   mix?     expression blend (src/mallows/expressions.js presets)
//   i        expression intensity 0..1
//   hold     seconds to keep the expression (Infinity = until the gesture ends)
//   voice?   Sound Engine voice: tap | giggle | hum | surprise | content | boing | grumble | coo
//   poke?    physics impulse multiplier for taps
//   tag      short id of what happened (for tests, captions and Hushprints)
// }

import { rng, hash, clamp, approach } from './math.js';

// Shared behaviour; each Mallow overrides parts of it below.
const BASE = {
  energy: 1,
  tickleAt: 4,       // taps in one streak before the Mallow gets giggly
  dizzyAt: 9,        // …and before it gets dizzy
  tap: [
    { react: 'tap', mix: { happy: 1 }, i: 0.5, hold: 0.9, voice: 'tap', poke: 1, tag: 'tap-hello' },
    { react: 'nod', mix: { curious: 1 }, i: 0.5, hold: 1.1, voice: 'tap', poke: 0.8, tag: 'tap-curious' },
    { react: 'tap', mix: { playful: 1 }, i: 0.45, hold: 1, voice: 'tap', poke: 1, tag: 'tap-playful' },
  ],
  tickle: { react: 'hop', mix: { excited: 0.6, playful: 0.4 }, i: 0.7, hold: 1.4, voice: 'giggle', poke: 1.2, tag: 'tap-giggle' },
  dizzy: { react: 'shiver', mix: { confused: 1 }, i: 0.8, hold: 2.2, voice: 'surprise', poke: 0.6, tag: 'tap-dizzy' },
  groove: { react: 'nod', mix: { happy: 0.7, playful: 0.3 }, i: 0.6, hold: 1.2, voice: 'tap', poke: 0.7, tag: 'tap-groove' },
  doubletap: [
    { react: 'doubleTap', mix: { surprised: 0.4, happy: 0.6 }, i: 0.75, hold: 1.3, voice: 'surprise', tag: 'double-bounce' },
    { react: 'doubleTap', mix: { excited: 1 }, i: 0.7, hold: 1.3, voice: 'giggle', tag: 'double-excited' },
    { react: 'hop', mix: { playful: 1 }, i: 0.75, hold: 1.2, voice: 'boing', tag: 'double-playful' },
  ],
  holdstart: { mix: { comforted: 1 }, i: 0.6, hold: Infinity, voice: 'hum', tag: 'hold-settle' },
  holdlong: { mix: { loved: 0.45, calm: 0.55 }, i: 0.7, hold: Infinity, tag: 'hold-melt' },
  holdend: { react: 'comfort', mix: { happy: 0.5, comforted: 0.5 }, i: 0.5, hold: 1.6, voice: 'content', tag: 'hold-thanks' },
  strokeslow: { mix: { comforted: 0.6, loved: 0.4 }, i: 0.55, hold: Infinity, voice: 'coo', tag: 'stroke-content' },
  strokefast: { mix: { playful: 0.6, happy: 0.4 }, i: 0.7, hold: Infinity, voice: 'giggle', tag: 'stroke-tickle' },
  strokeend: { mix: { loved: 0.6, happy: 0.4 }, i: 0.6, hold: 2, voice: 'content', tag: 'stroke-after' },
  dragstart: { mix: { surprised: 0.5, curious: 0.5 }, i: 0.5, hold: Infinity, tag: 'drag-oh' },
  release: { react: 'release', mix: { happy: 0.6, surprised: 0.4 }, i: 0.6, hold: 1, voice: 'boing', tag: 'drag-release' },
  fling: { react: 'flick', mix: { surprised: 1 }, i: 0.7, hold: 1.2, voice: 'surprise', tag: 'drag-fling' },
  squeezestart: { mix: { surprised: 0.3, happy: 0.7 }, i: 0.4, hold: Infinity, tag: 'squeeze-in' },
  squeezesoft: { react: 'release', mix: { comforted: 1 }, i: 0.55, hold: 1.2, voice: 'content', tag: 'squeeze-soft' },
  squeezehard: { react: 'release', mix: { happy: 0.7, surprised: 0.3 }, i: 0.75, hold: 1.3, voice: 'boing', tag: 'squeeze-pop' },
  // mood → resting expression
  rest: { warm: { comforted: 1 }, excited: { happy: 1 }, both: { loved: 0.5, happy: 0.5 } },
};

// Each Mallow's distinct answers (partial overrides of BASE).
export const PROFILES = {
  boppo: {
    energy: 1.15, tickleAt: 3, dizzyAt: 10,
    tap: [
      { react: 'tap', mix: { happy: 1 }, i: 0.6, hold: 0.9, voice: 'tap', poke: 1.1, tag: 'tap-boop' },
      { react: 'hop', mix: { excited: 1 }, i: 0.55, hold: 1, voice: 'boing', poke: 1, tag: 'tap-hop' },
      { react: 'tap', mix: { surprised: 0.3, happy: 0.7 }, i: 0.55, hold: 0.9, voice: 'tap', poke: 1.1, tag: 'tap-oh' },
    ],
    tickle: { react: 'hop', mix: { excited: 1 }, i: 0.85, hold: 1.6, voice: 'giggle', poke: 1.3, tag: 'tap-giggle' },
    strokeslow: { mix: { loved: 0.55, comforted: 0.45 }, i: 0.6, hold: Infinity, voice: 'coo', tag: 'stroke-content' },
    fling: { react: 'doubleTap', mix: { excited: 1 }, i: 0.8, hold: 1.3, voice: 'giggle', tag: 'drag-whee' },
    squeezehard: { react: 'success', mix: { excited: 1 }, i: 0.8, hold: 1.4, voice: 'giggle', tag: 'squeeze-boop' },
    rest: { warm: { happy: 0.6, comforted: 0.4 }, excited: { excited: 1 }, both: { happy: 1 } },
  },
  blubi: {
    energy: 0.75, tickleAt: 5,
    tickle: { react: 'tap', mix: { embarrassed: 1 }, i: 0.7, hold: 1.8, voice: 'giggle', poke: 0.9, tag: 'tap-shy' },
    strokeslow: { mix: { loved: 1 }, i: 0.7, hold: Infinity, voice: 'coo', tag: 'stroke-melt' },
    fling: { react: 'flick', mix: { sad: 0.4, surprised: 0.6 }, i: 0.55, hold: 1.4, voice: 'surprise', tag: 'drag-wobbly' },
    rest: { warm: { loved: 1 }, excited: { happy: 1 }, both: { loved: 0.6, happy: 0.4 } },
  },
  glitzi: {
    energy: 0.9, tickleAt: 3, dizzyAt: 7,
    tap: [
      { react: 'tap', mix: { curious: 0.5, proud: 0.5 }, i: 0.5, hold: 1, voice: 'tap', poke: 0.9, tag: 'tap-unimpressed' },
      { react: 'glitchBurst', mix: { surprised: 1 }, i: 0.5, hold: 0.8, voice: 'surprise', poke: 1, tag: 'tap-glitch' },
    ],
    tickle: { react: 'flick', mix: { frustrated: 0.5, playful: 0.5 }, i: 0.65, hold: 1.5, voice: 'grumble', poke: 0.8, tag: 'tap-pretend-annoyed' },
    strokeslow: { mix: { loved: 0.4, proud: 0.6 }, i: 0.55, hold: Infinity, voice: 'coo', tag: 'stroke-secretly-likes' },
    rest: { warm: { loved: 0.4, proud: 0.6 }, excited: { playful: 1 }, both: { happy: 1 } },
  },
  zuzu: {
    tickle: { react: 'doubleTap', mix: { confused: 0.4, excited: 0.6 }, i: 0.7, hold: 1.5, voice: 'giggle', poke: 1, tag: 'tap-spin' },
    strokeslow: { mix: { calm: 0.6, loved: 0.4 }, i: 0.6, hold: Infinity, voice: 'coo', tag: 'stroke-unspin' },
    rest: { warm: { calm: 0.6, happy: 0.4 }, excited: { curious: 1 }, both: { happy: 1 } },
  },
  pipzi: {
    energy: 1.1, tickleAt: 3,
    tickle: { react: 'doubleTap', mix: { excited: 1 }, i: 0.85, hold: 1.5, voice: 'giggle', poke: 1.2, tag: 'tap-kapow' },
    rest: { warm: { happy: 1 }, excited: { excited: 1 }, both: { excited: 0.5, happy: 0.5 } },
  },
  loomi: {
    energy: 0.55, tickleAt: 6,
    tickle: { react: 'nod', mix: { bored: 0.4, playful: 0.6 }, i: 0.5, hold: 1.6, voice: 'content', poke: 0.6, tag: 'tap-unbothered' },
    fling: { react: 'flick', mix: { calm: 1 }, i: 0.5, hold: 1.4, voice: 'content', tag: 'drag-drift' },
    rest: { warm: { calm: 1 }, excited: { happy: 1 }, both: { calm: 0.5, happy: 0.5 } },
  },
  noomi: {
    energy: 0.5, tickleAt: 4,
    tickle: { react: 'flick', mix: { frustrated: 0.5, exhausted: 0.5 }, i: 0.55, hold: 1.8, voice: 'grumble', poke: 0.6, tag: 'tap-sleepy-grump' },
    holdlong: { mix: { calm: 0.5, exhausted: 0.5 }, i: 0.7, hold: Infinity, tag: 'hold-doze' },
    rest: { warm: { calm: 1 }, excited: { happy: 1 }, both: { calm: 0.6, happy: 0.4 } },
  },
};

export function profileFor(id) { return { ...BASE, ...(PROFILES[id] || {}) }; }

export class Personality {
  /**
   * @param {string} mallowId
   * @param {{seed?:number, style?:'gentle'|'balanced'|'playful'}} [o]
   */
  constructor(mallowId, o = {}) {
    this.id = mallowId;
    this.p = profileFor(mallowId);
    this.rand = rng((o.seed ?? 1) ^ hash(mallowId));
    this.style = o.style || 'balanced';
    this.mood = { warmth: 0, excitement: 0, tickle: 0 };
    this.last = {};        // gesture → last variant index
    this.history = [];     // recent tags (max 12)
    this.count = 0;
  }

  setStyle(s) { this.style = s; }

  /** Advance mood decay. dt in seconds. */
  tick(dt) {
    const m = this.mood;
    m.warmth = approach(m.warmth, 0, 30, dt);
    m.excitement = approach(m.excitement, 0, 14, dt);
    m.tickle = approach(m.tickle, 0, 3, dt);
  }

  /** Resting expression from the Mallow's mood, or null for its neutral face. */
  restExpression() {
    const { warmth: w, excitement: e } = this.mood;
    if (w < 0.25 && e < 0.25) return null;
    const r = this.p.rest;
    const mix = w > 0.25 && e > 0.25 ? r.both : w >= e ? r.warm : r.excited;
    return { mix, i: clamp(Math.max(w, e) * 0.55, 0.15, 0.5) };
  }

  /**
   * @param {string} gesture  tap | doubletap | holdstart | holding | holdend | strokestart | stroke | strokeend | dragstart | dragend | squeezestart | squeezeend
   * @param {object} d        gesture data from the Gesture Engine
   * @returns {object|null}   response (see header)
   */
  respond(gesture, d = {}) {
    const p = this.p, m = this.mood;
    let r = null;
    switch (gesture) {
      case 'tap': {
        m.tickle = clamp(m.tickle + 0.3, 0, 3);
        m.excitement = clamp(m.excitement + 0.08 * p.energy, 0, 1);
        if (d.streak >= p.dizzyAt) r = p.dizzy;
        else if (d.steady && d.streak >= 4) r = { ...p.groove, beat: d.interval };
        else if (d.streak >= p.tickleAt) r = p.tickle;
        else r = this._pick('tap', p.tap);
        break;
      }
      case 'doubletap':
        m.excitement = clamp(m.excitement + 0.2 * p.energy, 0, 1);
        r = this._pick('doubletap', p.doubletap);
        break;
      case 'holdstart': m.warmth = clamp(m.warmth + 0.1, 0, 1); r = p.holdstart; break;
      case 'holding':
        m.warmth = clamp(m.warmth + 0.0025, 0, 1);
        if (d.dur > 4000 && !this._held) { this._held = true; r = p.holdlong; }
        break;
      case 'holdend': this._held = false; r = p.holdend; break;
      case 'strokestart': m.warmth = clamp(m.warmth + 0.05, 0, 1); this._strokeKind = null; break;
      case 'stroke': {
        const kind = d.speed > 900 ? 'strokefast' : 'strokeslow';
        if (kind === 'strokefast') m.tickle = clamp(m.tickle + 0.02, 0, 3);
        else m.warmth = clamp(m.warmth + 0.004, 0, 1);
        if (kind !== this._strokeKind) { this._strokeKind = kind; r = p[kind]; }
        break;
      }
      case 'strokeend': this._strokeKind = null; r = p.strokeend; break;
      case 'dragstart': r = p.dragstart; break;
      case 'dragend':
        if (d.converted) return null;
        m.excitement = clamp(m.excitement + 0.1 * p.energy, 0, 1);
        r = d.fling ? p.fling : p.release;
        break;
      case 'squeezestart': r = p.squeezestart; break;
      case 'squeezeend': {
        const hard = Math.abs(d.peak ?? d.amount ?? 0) > 0.35;
        m.warmth = clamp(m.warmth + (hard ? 0.05 : 0.12), 0, 1);
        if (hard) m.excitement = clamp(m.excitement + 0.12 * p.energy, 0, 1);
        r = hard ? p.squeezehard : p.squeezesoft;
        break;
      }
      default: return null;
    }
    if (!r) return null;
    this.count++;
    const out = this._styled({ ...r });
    this.history.push(out.tag);
    if (this.history.length > 12) this.history.shift();
    return out;
  }

  _pick(key, variants) {
    if (!Array.isArray(variants)) return variants;
    let i = Math.floor(this.rand() * variants.length);
    if (variants.length > 1 && i === this.last[key]) i = (i + 1 + Math.floor(this.rand() * (variants.length - 1))) % variants.length;
    this.last[key] = i;
    return variants[i];
  }

  // gentle: smaller, slower answers and no jumps; playful: a little bigger
  _styled(r) {
    if (this.style === 'gentle') {
      r.i = (r.i ?? 0.6) * 0.7;
      if (r.react === 'hop' || r.react === 'doubleTap' || r.react === 'celebrate') r.react = 'nod';
      if (r.react === 'flick' || r.react === 'shiver' || r.react === 'glitchBurst') r.react = 'tap';
      if (r.voice === 'giggle') r.voice = 'coo';
      r.poke = (r.poke ?? 1) * 0.6;
    } else if (this.style === 'playful') {
      r.i = clamp((r.i ?? 0.6) * 1.15, 0, 1);
      r.poke = (r.poke ?? 1) * 1.2;
    }
    return r;
  }
}
