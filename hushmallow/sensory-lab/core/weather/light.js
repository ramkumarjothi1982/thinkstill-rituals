// Weather Weaver — light you can move, and warmth you can spread (pure; no DOM).
//
//   LightPool  a warm sun pool (glides to the finger, critically damped, about
//              180 ms) or a soft moon pool (heavier, about 300 ms). Measures:
//              height (low → golden, high → crisp), rest (seconds still; emits
//              'rest' once after 0.8 s for the sun, 1 s for the moon), onBody
//              (within 0.5·body.h of the Mallow; 'body-in' / 'body-out'),
//              onWater, bask (seconds on the Mallow), dwell (builds only while
//              resting where the person put it, fastest on water or the
//              Mallow; the pool's own entry never counts) and, for the sun,
//              painted: the overcast haze (a FieldGrid) burnt away along the
//              pool's path, which stays clear.
//   EmberField dim embers around the scene. A drag kindles those it passes,
//              a tap kindles one, the hearth (the Mallow held in Warm glow)
//              radiates rings that kindle by radius. Each swells over
//              300–600 ms, then floats and glows. heat = the lit share
//              (monotonic). Events 'kindle' and 'all-lit'.

import { clamp, smoothstep, rng, TAU } from '../math.js';
import { SimBase, FieldGrid, segDist2, scatter } from './field.js';

export const SUN_LAG = 0.18, MOON_LAG = 0.3;      // s to (almost) arrive, critically damped
export const SUN_REST = 0.8, MOON_REST = 1;       // s still before 'rest'
export const HAZE = { high: [24, 12], medium: [20, 10], low: [16, 8] };
export const EMBERS = { high: 32, medium: 24, low: 14 };
const STILL = 14;                                 // px/s: slower than this counts as resting

export class LightPool extends SimBase {
  /** @param {{kind?:'sun'|'moon', tier?:string}} [o] */
  constructor({ kind = 'sun', tier = 'medium' } = {}) {
    super();
    this.kind = kind === 'moon' ? 'moon' : 'sun';
    this.omega = 4.74 / (this.kind === 'sun' ? SUN_LAG : MOON_LAG);   // 95 % of the way in the lag time
    this.restAt = this.kind === 'sun' ? SUN_REST : MOON_REST;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.tx = 0; this.ty = 0;
    this.r = 40;
    this.height = 0.5; this.rest = 0; this.onBody = false; this.onWater = false; this.bask = 0; this.dwell = 0;
    this.haze = this.kind === 'sun' ? new FieldGrid(...(HAZE[tier] || HAZE.medium)).fill(1) : null;
    this.painted = 0;
    this.W = 390; this.H = 844; this.skyTop = 60; this.horizonY = 480; this.floorY = 700; this.water = null;
    this.anchor = [0.72 * 390, 0.25 * 844];
    this.from = null;           // a one-off entry point instead of the anchor ([x, y] px)
    this.moved = false;         // has the person moved it since the weather began?
    this._rested = false;
    this._placed = false;
  }

  /** {W, H, anchor: [x, y] px (the realm's painted sun or moon), skyTop, horizonY, water: [y0, y1] | null, floorY}. */
  resize({ W, H, anchor, skyTop, horizonY, water = null, floorY } = {}) {
    this.W = W || this.W; this.H = H || this.H;
    this.skyTop = skyTop ?? this.skyTop; this.horizonY = horizonY ?? this.horizonY; this.floorY = floorY ?? this.floorY;
    this.water = water;
    if (anchor) this.anchor = [anchor[0], anchor[1]];
    const m = Math.min(this.W, this.H);
    this.r = this.kind === 'sun' ? Math.max(34, 0.11 * m) : Math.max(30, 0.1 * m);
    this.haze?.setRect(0, this.skyTop, this.W, this.floorY);
    if (!this._placed) { this._place(...this.start()); this._placed = true; }
    else { this.tx = this._cx(this.tx); this.ty = this._cy(this.ty); }
    return this;
  }

  /** Where the pool rests when a weather begins: in the sky, off to the side of its light. */
  start() {
    const x = this.kind === 'sun' ? 0.5 * this.W : 0.42 * this.W;
    return [x, this.skyTop + (this.horizonY - this.skyTop) * (this.kind === 'sun' ? 0.55 : 0.5)];
  }

  _cx(x) { return clamp(x, this.r * 0.5, this.W - this.r * 0.5); }
  _cy(y) { return clamp(y, this.skyTop + this.r * 0.5, this.floorY); }

  /** Glide toward (x, y) (the person moving the light: rest and dwell count from now). */
  to(x, y) { this.moved = true; return this._to(x, y); }
  /** Jump to (x, y) and stay (the person putting the light there). */
  place(x, y) { this.moved = true; return this._place(x, y); }
  // the pool's own choreography (enter, leave, layout) never counts as being moved
  _to(x, y) { this.tx = this._cx(x); this.ty = this._cy(y); return this; }
  _place(x, y) { this.x = this.tx = this._cx(x); this.y = this.ty = this._cy(y); this.vx = this.vy = 0; return this; }

  /** Enter: slide down the beam from the realm's sun or moon (or from `from`, set once: a gap in the clouds). */
  enter(dir = 1) {
    if (this.amount < 0.05) {
      const f = this.from || this.anchor;
      this._place(f[0], f[1]); this._to(...this.start());
    }
    this.from = null;
    return super.enter(dir);
  }

  /** Leave: fade back into the light it came from. */
  leave(dir = 1) { this._to(this.anchor[0], this.anchor[1]); return super.leave(dir); }

  reset() {
    this.rest = 0; this.bask = 0; this.dwell = 0; this.painted = 0; this.onBody = false; this._rested = false; this.moved = false;
    this.haze?.fill(1);
    return this;
  }

  /** body: {cx, mid, h} (or null). */
  step(dt, body = null) {
    dt = clamp(dt, 0, 0.1);
    this._presence(dt);
    const px = this.x, py = this.y, w = this.omega, n = Math.max(1, Math.ceil((dt * w) / 0.4)), h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vx += (w * w * (this.tx - this.x) - 2 * w * this.vx) * h;
      this.vy += (w * w * (this.ty - this.y) - 2 * w * this.vy) * h;
      this.x += this.vx * h; this.y += this.vy * h;
    }
    if (!Number.isFinite(this.x + this.y)) this.place(this.tx, this.ty);
    if (Math.hypot(this.vx, this.vy) < STILL) this.rest += dt;
    else { this.rest = 0; this._rested = false; }
    // a pool the person has put somewhere: 'rest' once it has been still a moment, and dwell builds while it rests
    if (!this._rested && this.moved && this.rest >= this.restAt) { this._rested = true; this.emit('rest', this.x, this.y, this.height); }
    this.height = clamp((this.horizonY - this.y) / Math.max(1, this.horizonY - this.skyTop), 0, 1);
    this.onWater = !!this.water && this.y >= this.water[0] && this.y <= this.water[1];
    if (body) {
      const inB = Math.hypot(this.x - body.cx, this.y - body.mid) < 0.5 * body.h;
      if (inB !== this.onBody) this.emit(inB ? 'body-in' : 'body-out', this.x, this.y, 0);
      this.onBody = inB;
      if (inB && this.amount > 0.5) this.bask += dt;
    }
    if (this.moved && this.rest > 0.25 && this.amount > 0.5) this.dwell = Math.min(1, this.dwell + dt / (this.onWater || this.onBody ? 8 : 13));
    if (this.haze && this.moved && this.amount > 0.5) {
      this.haze.paint(px, py, this.x, this.y, this.r * 0.9, -Math.min(1, dt * 5));
      this.painted = clamp(1 - this.haze.mean(), 0, 1);
    }
    return this;
  }

  snapshot() {
    return { kind: this.kind, x: Math.round(this.x), y: Math.round(this.y), r: Math.round(this.r), height: +this.height.toFixed(3), rest: +this.rest.toFixed(2),
      onBody: this.onBody, onWater: this.onWater, bask: +this.bask.toFixed(2), dwell: +this.dwell.toFixed(3), painted: +this.painted.toFixed(3), amount: +this.amount.toFixed(3) };
  }
}

// ----------------------------------------------------------------- embers --
export class EmberField extends SimBase {
  constructor({ tier = 'medium', seed = 1 } = {}) {
    super();
    this.cap = EMBERS.high;
    this.n = this.want = EMBERS[tier] ?? EMBERS.medium;
    const F = () => new Float32Array(this.cap);
    this.x = F(); this.y = F(); this.hx = F(); this.hy = F(); this.lit = F(); this.dur = F(); this.ph = F();
    this.litT = F().fill(-1);           // seconds since kindled (−1 = waiting)
    this._pts = new Float32Array(this.cap * 2);
    this.rand = rng(seed);
    this.seed = seed;
    this.heat = 0;
    this.t = 0;
    this.ringR = 0;                     // the hearth's current ring radius
    this.ringX = 0; this.ringY = 0;
    this._ringIdle = 9;
    this._allLit = false;
  }

  /** {rect: {x0, y0, x1, y1}, avoid: [{x0, y0, x1, y1}], body}: embers wait around the scene, off the Mallow and the chrome. */
  resize({ rect, avoid = [], body = null } = {}) {
    if (!rect) return this;
    const keep = [...avoid];
    if (body) keep.push({ x0: body.cx - body.w * 0.5 - 24, y0: body.top - 24, x1: body.cx + body.w * 0.5 + 24, y1: body.bottom + 24 });
    const spacing = Math.max(22, Math.sqrt(((rect.x1 - rect.x0) * (rect.y1 - rect.y0)) / Math.max(1, this.want)) * 0.6);
    const placed = scatter(this.want, rect, keep, spacing, rng(this.seed), this._pts);
    this.n = Math.max(1, Math.min(this.want, placed || 1));
    for (let i = 0; i < this.n; i++) {
      this.hx[i] = this.x[i] = placed ? this._pts[2 * i] : (rect.x0 + rect.x1) / 2;
      this.hy[i] = this.y[i] = placed ? this._pts[2 * i + 1] : (rect.y0 + rect.y1) / 2;
      this.dur[i] = 0.3 + 0.3 * this.rand();
      this.ph[i] = this.rand() * TAU;
    }
    return this;
  }

  setTier(tier) { const n = EMBERS[tier]; if (n && n < this.want) { this.want = n; this.n = Math.min(this.n, n); this._heat(); } return this; }

  reset() { this.litT.fill(-1); this.lit.fill(0); this.heat = 0; this._allLit = false; this.ringR = 0; return this; }

  _kindle(i) {
    if (this.litT[i] >= 0) return false;
    this.litT[i] = 0;
    this.emit('kindle', this.x[i], this.y[i], i);
    return true;
  }

  /** A drag from (x0, y0) to (x1, y1): every waiting ember within r px of the path kindles. Returns how many. */
  kindleAlong(x0, y0, x1, y1, r = 40) {
    let k = 0;
    const r2 = r * r;
    for (let i = 0; i < this.n; i++) if (this.litT[i] < 0 && segDist2(this.x[i], this.y[i], x0, y0, x1, y1) < r2 && this._kindle(i)) k++;
    return k;
  }

  /** A tap: the nearest waiting ember within reach kindles. Its index, or −1. */
  kindleAt(x, y, reach = 60) {
    let best = -1, bd = reach * reach;
    for (let i = 0; i < this.n; i++) {
      if (this.litT[i] >= 0) continue;
      const d = (this.x[i] - x) ** 2 + (this.y[i] - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) this._kindle(best);
    return best;
  }

  /** Kindle the `count` waiting embers nearest (x, y) (a warm swell reaching the Mallow). */
  kindleNear(x, y, count = 1) {
    let k = 0;
    for (; k < count; k++) {
      let best = -1, bd = Infinity;
      for (let i = 0; i < this.n; i++) {
        if (this.litT[i] >= 0) continue;
        const d = (this.x[i] - x) ** 2 + (this.y[i] - y) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) break;
      this._kindle(best);
    }
    return k;
  }

  /** The hearth: warm rings radiate from (cx, cy) while this is called; embers kindle as a ring reaches them. */
  radiate(cx, cy, dt) {
    this.ringX = cx; this.ringY = cy; this._ringIdle = 0;
    this.ringR += 140 * Math.max(0, dt);
    let far = 0;
    for (let i = 0; i < this.n; i++) {
      const d = Math.hypot(this.x[i] - cx, this.y[i] - cy);
      far = Math.max(far, d);
      if (d <= this.ringR) this._kindle(i);
    }
    if (this.ringR > far + 60) this.ringR = 0;     // the next ring
    return this;
  }

  _heat() {
    let s = 0;
    for (let i = 0; i < this.n; i++) s += this.lit[i];
    this.heat = Math.max(this.heat, s / Math.max(1, this.n));
  }

  step(dt, reduced = this.reduced) {
    dt = clamp(dt, 0, 0.1);
    this.t += dt;
    this._presence(dt);
    this._ringIdle += dt;
    if (this._ringIdle > 0.5) this.ringR = 0;
    let all = this.n > 0;
    for (let i = 0; i < this.n; i++) {
      if (this.litT[i] < 0) { all = false; continue; }
      this.litT[i] += dt;
      this.lit[i] = smoothstep(0, this.dur[i], this.litT[i]);
      if (!reduced) {     // lit embers float a little and bob; reduced motion: they swell without drifting
        const f = smoothstep(0, 3, this.litT[i]);
        this.x[i] = this.hx[i] + Math.sin(this.t * 0.6 + this.ph[i]) * 4 * f;
        this.y[i] = this.hy[i] - 10 * f + Math.sin(this.t * 0.9 + this.ph[i] * 1.3) * 3 * f;
      }
    }
    this._heat();
    if (all && !this._allLit) { this._allLit = true; this.emit('all-lit', 0, 0, 1); }
    return this;
  }

  /** How many are lit (≥ half swelled). */
  get litCount() { let k = 0; for (let i = 0; i < this.n; i++) if (this.lit[i] >= 0.5) k++; return k; }

  snapshot() { return { n: this.n, heat: +this.heat.toFixed(3), lit: this.litCount, ringR: Math.round(this.ringR), amount: +this.amount.toFixed(3) }; }
}
