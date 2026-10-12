// Belief Mallows — longer-lived ideas the person names ("I must always be
// perfect", "I can pause before responding"), carrying a symbolic prop.
//
//   const b = createBelief({ text: 'I'm not good enough.', prop: 'stone' });
//   layer.add(b, { x, y });
//   b.explore(0.4);                    // or the person's own squeezes, strokes, stretches, carries
//
// The same family as Thought Mallows at 1.4× the size, denser and more
// opaque, with a rigid prop whose weight works through the soft-body solver
// (a persistent "heavy finger" or a tug on the jelly), so its influence is
// physical, not painted on:
//   stone   an oversized stone on its head: the top sinks and the body leans
//           under it. Explored enough, the stone is set down beside it.
//   shell   a protective shell over its head and one eye, pressing down a
//           little; exploring swings it open on its hinge (which stays on the
//           rim, top right) until it rests open against the side of the head.
//   thread  a tangled thread (several loops and a knot cluster) round its
//           middle, pinching a waist; exploring loosens the knots and it slips
//           down into one loose loop.
//   charm   a luminous charm on a cord, pulling its side down so the whole body
//           leans toward it; exploring brings it closer, lighter, warmer.
// Exploration never says the belief is wrong: the prop only becomes lighter,
// looser, less dominant. Nothing is ever removed.

import { ThoughtMallow, grow, emptyRect } from './thought.js';
import { THOUGHT_STYLES, BELIEF_TINTS, REST_FACE, normaliseEmotion, clamp, lerp } from './styles.js';

export const PROPS = Object.freeze(['stone', 'shell', 'thread', 'charm']);
/** How heavy each prop starts (1 = the full weight its mechanics allow). */
export const PROP_WEIGHT = Object.freeze({ stone: 1, shell: 0.7, thread: 0.85, charm: 0.55 });
/** How far each prop leans the body toward its weight at full weight (radians; charm ≈ 6°+ at the start). */
const LEAN = Object.freeze({ stone: 0.07, shell: 0, thread: 0, charm: -0.2 });
const BELIEF_MATERIAL = Object.freeze({ kG: 0.24, kL: 0.56, beta: 0.32, damp: 0.95, dMax: 0.34, maxStretch: 0.4 });
const BELIEF_FACE = {
  stone: { eyeOpen: 0.72, lid: 0.42, lidTilt: -0.55, browA: 0.65, browTilt: -0.55, curve: -0.38, mouthW: 0.7, lookY: 0.3, blush: 0.2 },
  shell: { eyeOpen: 0.82, lid: 0.18, lidTilt: -0.2, browA: 0.5, browTilt: -0.6, browY: 0.1, curve: -0.08, mouthW: 0.5, wave: 0.3, lookX: 0.45, lookY: 0.15, blush: 0.6 },
  thread: { eyeOpen: 0.98, browA: 0.8, browTilt: -0.85, browY: 0.22, curve: -0.3, wave: 0.6, mouthW: 0.55, sweat: 0.35, blush: 0.2 },
  charm: { eyeOpen: 0.88, lid: 0.08, curve: 0.42, mouthW: 0.78, blush: 0.55, lookX: -0.45, lookY: 0.5 },
};

/** A belief's style: its prop's palette and face, slower and steadier than a passing thought. */
export function beliefStyle(prop = 'stone', emotion = null) {
  const p = PROPS.includes(prop) ? prop : 'stone';
  const em = emotion ? THOUGHT_STYLES[normaliseEmotion(emotion)] : null;
  return Object.freeze({
    id: `belief-${p}`, label: `belief with a ${p}`, prop: p, tension: em ? Math.min(0.75, em.tension) : 0.62, charge: 0.3, alpha: 0.88,
    tint: em && em.id !== 'neutral' ? em.tint : BELIEF_TINTS[p],
    face: Object.freeze({ ...REST_FACE, ...BELIEF_FACE[p] }),
    motion: Object.freeze({ bob: 0.018, bobHz: 0.26, tremble: 0, trembleHz: 0, dart: 0, hop: 0, sway: 0.008, sink: 0, drift: 0, shrink: 0, crowd: 0 }),
    body: Object.freeze({ squash: p === 'stone' ? 0.03 : 0, puff: 0, droop: p === 'stone' ? 0.3 : 0 }),
    fx: Object.freeze({ crackle: 0, steam: 0, rain: 0, motes: 6, chatter: 0 }),
  });
}

export class BeliefMallow extends ThoughtMallow {
  constructor(o = {}) {
    const prop = PROPS.includes(o.prop) ? o.prop : 'stone';
    super({ ...o, kind: 'belief', r: (o.r > 0 ? o.r : 40) * 1.4, noSiblings: true, style: o.style || beliefStyle(prop, o.emotion),
      material: { ...BELIEF_MATERIAL, ...(o.material || {}) }, cols: 12, rows: 12 });
    this.prop = prop;
    this.emotion = o.emotion ? normaliseEmotion(o.emotion) : 'belief';
    this.earnedExplore = clamp(o.explored ?? 0);
    // the prop's own rigid state (screen px, radians), filled by _propPost
    this.propState = { weight: PROP_WEIGHT[prop], down: 0, downing: false, x: 0, y: 0, ang: 0, va: 0, size: 0, lift: 0, loose: 0, glow: 0,
      fromX: 0, fromY: 0, chain: null, landed: false, seed: this.seed };
    if (prop === 'charm') this.propState.chain = { x: new Float32Array(5), y: new Float32Array(5), px: new Float32Array(5), py: new Float32Array(5), init: false };
    this._propPt = { x: 0, y: 0 };
    this._pA = { x: 0, y: 0 }; this._pB = { x: 0, y: 0 }; this._pC = { x: 0, y: 0 }; this._pD = { x: 0, y: 0 };
  }

  /** How far it has been explored (0..1): the person's own touch, or explore(k). */
  get explored() { return clamp(Math.max(this.earnedExplore, this.levels.explore.cur)); }
  /** Ease exploration toward k (no argument: a step). The prop gets lighter and looser. */
  explore(k) { this._verb('explore', k, 0.25); this._emit('verb', { verb: 'explore', level: this.levels.explore.goal }); return this; }
  _explore(k) { if (k > 0) this.earnedExplore = clamp(this.earnedExplore + k * 0.9); }

  /** The prop's weight now (0..1 of its full mechanics). */
  get weight() {
    const ps = this.propState;
    return PROP_WEIGHT[this.prop] * (1 - 0.75 * this.explored) * (1 - ps.down);
  }

  toJSON() { return { ...super.toJSON(), kind: 'belief', prop: this.prop, explored: +this.explored.toFixed(3), down: this.propState.down >= 1 }; }
  restore(j = {}) {
    super.restore(j);
    if (Number.isFinite(j.explored)) this.earnedExplore = clamp(j.explored);
    if (j.down) { this.propState.down = 1; this.propState.landed = true; }
    return this;
  }

  // the prop leans on the jelly (before the solver step)
  _propPre(dt) {
    const sb = this.sb, a = this.aspect, w = this.weight, ps = this.propState, ex = this.explored;
    if (this.prop === 'stone') {
      // explored enough (and no finger on it): it is set down beside the belief
      if (!ps.downing && ex >= 0.72 && !this.pressed && ps.down < 1) { ps.downing = true; this._emit('prop', { kind: 'set-down' }); this.audio?.fx?.('settle', { intensity: 0.25 }); }
      if (ps.downing) ps.down = Math.min(1, ps.down + dt / (this.reducedMotion ? 0.5 : 1.5));
      this._heavy('prop', 0.64 * a, 0.03, w * 0.62, w * 0.11, 0.3, ps.down > 0.25);
    } else if (this.prop === 'shell') {
      this._heavy('prop', 0.34 * a, 0.06, w * 0.5, w * 0.07, 0.34, false);
    } else if (this.prop === 'thread') {
      // the thread pinches a waist (two hands squeezing the middle in, about 0.15 W); loose, it lets go
      const pinch = w * 0.19 * a, loose = ex > 0.88;
      this._tug('propL', 0.03 * a, 0.74, pinch, 0, 0.22, loose);
      this._tug('propR', 0.97 * a, 0.74, -pinch, 0, 0.22, loose);
    } else if (this.prop === 'charm') {
      // the cord tugs the side it hangs from toward the charm
      const ch = ps.chain, I = this.render.Minv;
      let dx = 0, dy = 1;
      if (ch?.init) {
        const n = ch.x.length - 1, ex2 = ch.x[n] - ch.x[0], ey2 = ch.y[n] - ch.y[0];
        dx = I[0] * ex2 + I[2] * ey2; dy = I[1] * ex2 + I[3] * ey2;
        const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      }
      this._tug('prop', 0.04 * a, 0.62, dx * w * 0.2, dy * w * 0.2, 0.22, false);
    }
  }

  // a persistent heavy finger: it presses the material at (x, y) down by `sink` with `depth`
  _heavy(id, x, y, depth, sink, r, off) {
    const sb = this.sb;
    if (off || depth < 0.01) { if (sb.ptr.has(id)) sb.release(id, { vx: 0, vy: -0.6 }); return; }
    if (!sb.ptr.has(id)) sb.grab(id, x, y, r);
    sb.press(id, x, y + sink, clamp(depth), r);
    sb.move(id, x, y + sink, 0.2);
  }
  // a persistent tug: holds the material at (x, y) and pulls it by (dx, dy)
  _tug(id, x, y, dx, dy, r, off) {
    const sb = this.sb;
    if (off) { if (sb.ptr.has(id)) sb.release(id, { quiet: false }); return; }
    if (!sb.ptr.has(id)) sb.grab(id, x, y, r);
    sb.press(id, x + dx, y + dy, 0, r);
    sb.move(id, x + dx, y + dy, 0.55);
  }

  // a lattice point (u, v) in client px, into `out` (no allocation)
  _at(u, v, out) { const S = this._propPt, M = this.render.M; this.sb.sample(u, v, S); out.x = M[0] * S.x + M[2] * S.y + M[4]; out.y = M[1] * S.x + M[3] * S.y + M[5]; return out; }
  // rigid wobble: an angular spring with inertia, kicked by the body's motion
  _spring(dt, target, k, c) {
    const ps = this.propState, rm = this.reducedMotion;
    const kk = rm ? k * 2 : k, cc = rm ? 2 * Math.sqrt(kk) : c;
    ps.va += (kk * (target - ps.ang) - cc * ps.va) * dt;
    ps.va += clamp(-(this._vPrev.x - (ps._vx || 0)) * 0.0009, -0.4, 0.4) * (rm ? 0 : 1);
    ps._vx = this._vPrev.x;
    ps.ang += ps.va * dt;
  }

  // where the prop is drawn (after the body has moved)
  _propPost(dt) {
    // it leans toward the weight it carries: the stone's side, the charm's side
    this.lean = lerp(this.lean || 0, LEAN[this.prop] * this.weight, Math.min(1, dt * 2));
    const ps = this.propState, R = this.render, P = R.P, ex = this.explored, rm = this.reducedMotion;
    const M = R.M, pA = this._pA, pB = this._pB, pC = this._pC;
    const upX = -M[2] / P;          // the body's up, screen space (x part)
    const ang0 = R.ang;
    ps.glow = lerp(0.5, 1, ex);
    if (this.prop === 'stone') {
      ps.size = P * 0.34 * (1 - 0.3 * ex);
      const a = this._at(0.52, 0.02, pA), b = this._at(0.84, 0.08, pB);
      const slope = Math.atan2(b.y - a.y, b.x - a.x) * 0.6;
      // rest in the dent: the top of the deformed outline under the stone
      const top = this._at(0.64, 0.0, pC), sy = this.surfaceY(top.x);
      const hx = top.x + upX * ps.size * 0.7, hy = (Number.isFinite(sy) ? sy : top.y) - ps.size * 0.7;
      // beside it, on the same ground line
      const B = this._bbox();
      const gx = B.right + ps.size * 1.02, gy = B.bottom - ps.size * 0.86;
      ps.gx = gx; ps.gy = gy;
      const d = ps.down, e = d * d * (3 - 2 * d);
      // an arc from the head down to the ground
      ps.x = lerp(hx, gx, e); ps.y = lerp(hy, gy, e) - Math.sin(Math.PI * e) * P * 0.25;
      this._spring(dt, lerp(slope + ang0, 0.18, e) + Math.sin(Math.PI * e) * 1.2, 70, 9);
      if (d >= 1 && !ps.landed) { ps.landed = true; this._emit('prop', { kind: 'landed' }); }
    } else if (this.prop === 'shell') {
      // a hood over the head and the left eye, hinged on the rim at the top right (B). Explored, it
      // swings open over the top (turning over as it goes) and rests open against the right side.
      const A = this._at(0.04, 0.8, pA), B = this._at(0.86, 0.02, pB);
      const L = Math.hypot(B.x - A.x, B.y - A.y);
      ps.size = L * 1.06 * (1 - 0.28 * ex);
      const slope = Math.atan2(B.y - A.y, B.x - A.x);
      ps.lift = lerp(ps.lift, ex, Math.min(1, dt * (rm ? 8 : 1.6)));
      const sw = smooth01(ps.lift);
      // closed: pointing from over the eye up to the hinge; open: hanging from the hinge down the side
      const OPEN = SHELL_OPEN + ang0;
      let target = slope + (OPEN - slope + 2 * Math.PI * (OPEN < slope ? 1 : 0)) * sw;
      this._spring(dt, target, 60, 10);
      ps.flip = 1 - 2 * smooth01((sw - 0.3) / 0.4);
      // the hinge end stays on the rim: the shell is drawn from its free end toward B
      ps.hx = B.x; ps.hy = B.y;
      ps.x = B.x - Math.cos(ps.ang) * ps.size; ps.y = B.y - Math.sin(ps.ang) * ps.size;
    } else if (this.prop === 'thread') {
      ps.loose = lerp(ps.loose, ex, Math.min(1, dt * 2));
      // the band rides at the waist, and slips down as it loosens
      ps.v = lerp(0.74, 0.9, smooth01(ps.loose));
      ps.size = P;
    } else if (this.prop === 'charm') {
      const ch = ps.chain, n = ch.x.length;
      const A = this._at(0.02, 0.6, pA);
      const len = P * (0.34 - 0.12 * ex), seg = len / (n - 1);
      ps.size = P * (0.18 + 0.03 * ex);
      if (!ch.init) { for (let i = 0; i < n; i++) { ch.x[i] = ch.px[i] = A.x - i * seg * 0.3; ch.y[i] = ch.py[i] = A.y + i * seg; } ch.init = true; }
      const g = 900 * dt * dt, damp = rm ? 0.86 : 0.97;
      for (let i = 1; i < n; i++) {
        const vx = (ch.x[i] - ch.px[i]) * damp, vy = (ch.y[i] - ch.py[i]) * damp;
        ch.px[i] = ch.x[i]; ch.py[i] = ch.y[i];
        ch.x[i] += vx; ch.y[i] += vy + g * (i === n - 1 ? 1.6 : 1);
      }
      for (let it = 0; it < 6; it++) {
        ch.x[0] = A.x; ch.y[0] = A.y;
        for (let i = 0; i < n - 1; i++) {
          const dx = ch.x[i + 1] - ch.x[i], dy = ch.y[i + 1] - ch.y[i], d = Math.hypot(dx, dy) || 1e-4, f = (d - seg) / d;
          if (i === 0) { ch.x[1] -= dx * f; ch.y[1] -= dy * f; } else { ch.x[i] += dx * f * 0.5; ch.y[i] += dy * f * 0.5; ch.x[i + 1] -= dx * f * 0.5; ch.y[i + 1] -= dy * f * 0.5; }
        }
      }
      // the charm hangs clear of the body (it swings in front, never inside the jelly's base)
      ps.x = ch.x[n - 1]; ps.y = ch.y[n - 1];
      ps.ang = Math.atan2(ch.x[n - 1] - ch.x[n - 2], ch.y[n - 1] - ch.y[n - 2]) * -1;
    }
  }

  /** The prop's rect, client px (the stone's landing spot included once it is being set down). */
  propRect(out = {}) {
    const ps = this.propState, P = this.render.P;
    emptyRect(out);
    if (this.prop === 'stone') {
      const r = ps.size;
      grow(out, ps.x - r * 1.05, ps.y - r * 0.9, ps.x + r * 1.05, ps.y + r * 0.95);
      if (ps.downing || ps.landed) grow(out, ps.gx - r * 1.05, ps.gy - r * 0.9, ps.gx + r * 1.05, ps.gy + r * 0.95);
    } else if (this.prop === 'shell') {
      // its four corners: the free end, the hinge, and both bulged by the dome's height
      const L = ps.size, H = L * 0.4, co = Math.cos(ps.ang), si = Math.sin(ps.ang), f = ps.flip ?? 1;
      const nx = si * f, ny = -co * f;               // the dome side
      grow(out, Math.min(ps.x, ps.hx), Math.min(ps.y, ps.hy), Math.max(ps.x, ps.hx), Math.max(ps.y, ps.hy));
      const mx = (ps.x + ps.hx) / 2 + nx * H, my = (ps.y + ps.hy) / 2 + ny * H;
      grow(out, mx - 2, my - 2, mx + 2, my + 2);
      void co;
    } else if (this.prop === 'thread') {
      const b = this._bbox();
      grow(out, b.left - P * 0.06, b.top + b.height * 0.55, b.right + P * 0.06, b.bottom);
    } else if (this.prop === 'charm') {
      const s = ps.size, ch = ps.chain;
      grow(out, ps.x - s * 0.75, ps.y - s * 0.2, ps.x + s * 0.75, ps.y + s * 1.7);
      if (ch?.init) grow(out, ch.x[0] - 2, ch.y[0] - 2, ch.x[0] + 2, ch.y[0] + 2);
    }
    if (!(out.right > out.left)) return null;
    out.width = out.right - out.left; out.height = out.bottom - out.top;
    return out;
  }
}

// where an opened shell rests (radians, the direction from its free end to the hinge): hanging down the right side, leaning out a little
const SHELL_OPEN = Math.atan2(-0.94, -0.3) + 2 * Math.PI;

const smooth01 = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

// (kept for older callers) the top of the deformed outline at client x
BeliefMallow.prototype._surfaceY = function (x) { return this.surfaceY(x); };

/** createBelief({text, prop:'stone'|'shell'|'thread'|'charm', emotion?, explored?}) → a Belief Mallow handle. */
export function createBelief(o = {}) {
  const b = new BeliefMallow(o);
  if (o.layer) o.layer.add(b, o);
  return b;
}
