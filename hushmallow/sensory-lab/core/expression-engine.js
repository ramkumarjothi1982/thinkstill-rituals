// Expression Engine — faces for the Sensory Lab, built on the existing rig.
//
// Two jobs:
//  1. ExpressionDirector: layers a transient expression (from a gesture
//     response) over a resting expression (from the Mallow's mood), and returns
//     to rest when it expires. It drives MallowRig.setEmotion only on changes,
//     so the rig's own springs make every transition smooth.
//  2. deformationFace(): per-frame facial adjustment from the soft body's
//     shape, so squeezing narrows the eyes and puffs the cheeks (each Mallow's
//     authored `squeezeFace`), stretching widens the eyes and rounds the
//     mouth, and wobbling adds a flustered open mouth. Pure function.
//  3. FaceMixer (Phase 3): several owners (a base look, a mode, a passing
//     event) share the rig's one face override without fighting over it.

import { clamp, lerp } from './math.js';

const sameMix = (a, b) => {
  if (!a || !b) return a === b;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) < 1e-3);
};

export class ExpressionDirector {
  /** @param {{setEmotion:Function}} rig */
  constructor(rig) {
    this.rig = rig;
    this.rest = null;        // {mix, i}
    this.cur = null;         // {mix, i, until}
    this.applied = null;
    this.t = 0;
  }

  setRest(e) { this.rest = e; }

  /** Show `mix` at intensity `i` for `hold` seconds (Infinity = until clear()). extra: absolute rig params. */
  play(mix, i = 0.6, hold = 1.2, extra = null) {
    if (!mix) return;
    this.cur = { mix, i, extra, until: this.t + (Number.isFinite(hold) ? hold : 1e9) };
    this._apply();
  }

  /** End a held (Infinity) expression now. */
  clear() { this.cur = null; this._apply(); }

  tick(dt) {
    this.t += dt;
    if (this.cur && this.t >= this.cur.until) this.cur = null;
    this._apply();
  }

  _apply() {
    const want = this.cur || this.rest || { mix: { neutral: 1 }, i: 0 };
    if (this.applied && sameMix(this.applied.mix, want.mix) && Math.abs(this.applied.i - want.i) < 0.02 && this.applied.extra === want.extra) return;
    this.applied = { mix: want.mix, i: want.i, extra: want.extra };
    this.rig.setEmotion(want.mix, want.i, want.extra ? { extra: want.extra } : {});
  }
}

/**
 * Adjust facial targets for the body's current deformation (mutates `goal`).
 * @param {object} goal   rig parameter targets for this frame
 * @param {object} s      {squeeze 0..1, stretch 0..1, wobble 0..1, closedEyes:boolean}
 * @param {object} squeezeFace  the Mallow's authored squeeze face (src/mallows/reactions.js)
 */
export function deformationFace(goal, s, squeezeFace) {
  const k = clamp(s.squeeze || 0, 0, 1);
  if (k > 0.01 && squeezeFace) {
    const w = k * k * (3 - 2 * k);
    for (const [p, v] of Object.entries(squeezeFace)) if (p in goal) goal[p] = lerp(goal[p], v, w);
    goal.cheekPuff = lerp(goal.cheekPuff, 0.9, w);
    goal.blush = Math.max(goal.blush, lerp(goal.blush, 2.2, w));
  }
  const st = clamp(s.stretch || 0, 0, 1);
  if (st > 0.01) {
    const w = st * st * (3 - 2 * st);
    // closed-eyed Mallows only open their eyes for a really big stretch
    const eyeW = s.closedEyes ? clamp((st - 0.55) / 0.45, 0, 1) : w;
    goal.eyeOpen = lerp(goal.eyeOpen, 1.28, eyeW);
    goal.eyeScale = lerp(goal.eyeScale, 1.12, eyeW);
    goal.irisScale = lerp(goal.irisScale, 0.9, eyeW);
    goal.browY = lerp(goal.browY, 0.85, w);
    goal.browAlpha = Math.max(goal.browAlpha, 0.6 * w);
    goal.mouthRound = lerp(goal.mouthRound, 0.85, w);
    goal.mouthOpen = lerp(goal.mouthOpen, 0.75, w);
    goal.mouthSmile = lerp(goal.mouthSmile, 0.2, w);
  }
  const wb = clamp(s.wobble || 0, 0, 1);
  if (wb > 0.02 && k < 0.3) {
    goal.mouthOpen = Math.max(goal.mouthOpen, lerp(goal.mouthOpen, 0.55, wb));
    goal.mouthWave = lerp(goal.mouthWave, 0.5, wb * 0.6);
    goal.blush = lerp(goal.blush, Math.max(goal.blush, 1.8), wb);
  }
  return goal;
}

/**
 * Combines face overrides from several owners into the one { set, min } object
 * installed on the rig (rig.setFaceOverride). `set`: the latest owner in the
 * list wins; `min`: the highest floor over all owners. Unknown owners are
 * appended (highest priority). A feature that uses a FaceMixer never calls
 * rig.setFaceOverride itself; apply() writes in place, without allocating.
 */
export class FaceMixer {
  constructor(rig, owners = ['base', 'mode', 'event']) {
    this.rig = rig;
    this.layers = [];           // [{ owner, set, min }] lowest priority first
    this._by = new Map();       // owner → layer
    for (const o of owners) this._layer(o);
    this._out = { set: {}, min: {} };
    this._dirty = false;
    this._installed = true;
    rig.setFaceOverride(this._out);
  }

  _layer(owner) {
    let l = this._by.get(owner);
    if (!l) { l = { owner, set: {}, min: {} }; this._by.set(owner, l); this.layers.push(l); }
    return l;
  }

  _put(bag, key, v) {
    if (v == null) { if (key in bag) { delete bag[key]; this._dirty = true; } return; }
    if (bag[key] !== v) { bag[key] = v; this._dirty = true; }
  }

  /** Owner's absolute value for a face param (v == null removes it). */
  set(owner, key, v) { this._put(this._layer(owner).set, key, v); return this; }

  /** Owner's floor for a face param (v == null removes it). */
  min(owner, key, v) { this._put(this._layer(owner).min, key, v); return this; }

  /** Drop everything one owner asked for. */
  release(owner) {
    const l = this._by.get(owner);
    if (!l) return this;
    for (const k in l.set) { delete l.set[k]; this._dirty = true; }
    for (const k in l.min) { delete l.min[k]; this._dirty = true; }
    return this;
  }

  /** Write the combination into the installed override. Returns false (and does nothing) when nothing changed. */
  apply() {
    if (!this._dirty) return false;
    const { set, min } = this._out;
    for (const k in set) delete set[k];
    for (const k in min) delete min[k];
    for (let i = 0; i < this.layers.length; i++) {
      const l = this.layers[i];
      for (const k in l.set) set[k] = l.set[k];
      for (const k in l.min) min[k] = k in min ? Math.max(min[k], l.min[k]) : l.min[k];
    }
    if (!this._installed) { this.rig.setFaceOverride(this._out); this._installed = true; }   // after clear()
    this._dirty = false;
    return true;
  }

  /** Release every owner and hand the rig a fresh, empty override. */
  clear() {
    for (const l of this.layers) this.release(l.owner);
    const { set, min } = this._out;
    for (const k in set) delete set[k];
    for (const k in min) delete min[k];
    this._dirty = false;
    this._installed = false;
    this.rig.setFaceOverride({});
  }

  /** The installed { set, min } (read only). */
  get out() { return this._out; }
}
