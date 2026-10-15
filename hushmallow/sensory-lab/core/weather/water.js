// Weather Weaver — gentle water you can push (pure; no DOM).
//
//   WaveField  the realm's water band as columns. Taps and holds disturb a
//              damped 1D wave equation (ripples, a rocking swell); a drag
//              launches a travelling swell (60–220 px/s, at most 4 live) in
//              the drag's direction. When a swell's crest passes the Mallow's
//              column with height ≥ 0.25 it emits 'arrive' (k = height;
//              lastGold tells whether it was a warm swell); at the screen edge
//              it emits 'shore'. Reduced motion: swells ×0.5 speed, ×0.4 height.
//   Puddles    two perspective ellipses either side of the Mallow's base in dry
//              realms: they appear once wet > 0.3 after rain and dry with τ 60 s.

import { clamp, smoothstep } from '../math.js';
import { SimBase } from './field.js';

export const WAVE_COLS = { high: 64, medium: 48, low: 32 };
export const SWELLS = { high: 4, medium: 3, low: 2 };
export const SWELL_MIN = 60, SWELL_MAX = 220, ARRIVE_AT = 0.25, SWELL_TAU = 7, DRY_TAU = 60;
const C = 14, DAMP = 1.1, REST = 2.5;   // ripple field: wave speed (columns/s), damping, pull back to level

export class WaveField extends SimBase {
  constructor({ tier = 'medium' } = {}) {
    super();
    this.cols = WAVE_COLS[tier] ?? WAVE_COLS.medium;
    this.maxSwells = SWELLS[tier] ?? SWELLS.medium;
    this.h = new Float32Array(WAVE_COLS.high);
    this.v = new Float32Array(WAVE_COLS.high);
    const S = () => new Float32Array(SWELLS.high);
    this.sx = S(); this.sv = S(); this.sa = S(); this.sw = S();
    this.sg = new Uint8Array(SWELLS.high);
    this.son = new Uint8Array(SWELLS.high);
    this.W = 390; this.band = [500, 844]; this.bodyX = 195;
    this.rockX = 0; this.rockOn = false;
    this.energy = 0;
    this.lastGold = false;
    this.motion = 1;          // Comfort DNA motion (swell height)
    this.t = 0;
    this._armed = true;
  }

  /** {W, band: [y0, y1], bodyX}: the water band and the Mallow's column (px). */
  resize({ W, band, bodyX } = {}) {
    this.W = W || this.W;
    if (band) this.band = band;
    if (bodyX != null) this.bodyX = bodyX;
    return this;
  }

  reset() { this.h.fill(0); this.v.fill(0); this.son.fill(0); this.energy = 0; this.rockOn = false; return this; }
  setTier(tier) { const n = SWELLS[tier]; if (n && n < this.maxSwells) this.maxSwells = n; return this; }

  _col(x) { return clamp(Math.round((x / this.W) * (this.cols - 1)), 0, this.cols - 1); }

  /**
   * A drag on the water: a swell from x travelling with the drag (speed clamped to 60–220 px/s).
   * strength 0..1; gold: a warm swell (Warm glow). Returns its slot.
   */
  push(x, vx, strength = 0.6, gold = false) {
    const red = this.reduced;
    const dir = Math.sign(vx) || (x < this.bodyX ? 1 : -1);
    const speed = clamp(Math.abs(vx), SWELL_MIN, SWELL_MAX) * (red ? 0.5 : 1);
    const amp = (0.3 + 0.7 * clamp(strength, 0, 1)) * (red ? 0.4 : 1) * clamp(this.motion, 0.5, 1.3);
    let s = -1, weakest = Infinity;
    for (let i = 0; i < this.maxSwells; i++) {
      if (!this.son[i]) { s = i; break; }
      if (this.sa[i] < weakest) { weakest = this.sa[i]; s = i; }
    }
    this.son[s] = 1; this.sx[s] = x; this.sv[s] = dir * speed; this.sa[s] = amp; this.sw[s] = 46; this.sg[s] = gold ? 1 : 0;
    this.ripple(x, 0.25 * amp);
    return s;
  }

  /** A tap: a ripple at x (k 0..1). */
  ripple(x, k = 0.5) {
    const c = this._col(x);
    for (let d = -1; d <= 1; d++) { const i = c + d; if (i >= 0 && i < this.cols) this.v[i] += (d ? 0.5 : 1) * k * 2.2 * (this.reduced ? 0.4 : 1); }
    return this;
  }

  /** A hold: a rocking swell at x while on. */
  rock(x, on) { this.rockX = x; this.rockOn = !!on; return this; }

  step(dt) {
    dt = clamp(dt, 0, 0.1);
    this.t += dt;
    this._presence(dt);
    const n = this.cols, h = this.h, v = this.v, sub = Math.max(1, Math.ceil(dt / 0.025)), d = dt / sub;
    for (let s = 0; s < sub; s++) {
      if (this.rockOn) v[this._col(this.rockX)] += Math.sin(this.t * Math.PI * 1.6) * d * 6 * (this.reduced ? 0.4 : 1);
      for (let i = 0; i < n; i++) {
        const l = h[i > 0 ? i - 1 : i], r = h[i < n - 1 ? i + 1 : i];
        v[i] += (C * C * (l - 2 * h[i] + r) * 0.02 - REST * h[i] - DAMP * v[i]) * d;
      }
      for (let i = 0; i < n; i++) h[i] = clamp(h[i] + v[i] * d, -1.5, 1.5);
    }
    let sum = 0;
    for (let i = 0; i < n; i++) { if (!Number.isFinite(h[i] + v[i])) { h[i] = v[i] = 0; } sum += Math.abs(h[i]); }
    // travelling swells
    let swell = 0;
    for (let i = 0; i < this.maxSwells; i++) {
      if (!this.son[i]) continue;
      const before = (this.sx[i] - this.bodyX) * Math.sign(this.sv[i]);
      this.sx[i] += this.sv[i] * dt;
      this.sa[i] *= Math.exp(-dt / SWELL_TAU);
      const after = (this.sx[i] - this.bodyX) * Math.sign(this.sv[i]);
      if (before < 0 && after >= 0 && this.sa[i] >= ARRIVE_AT) { this.lastGold = !!this.sg[i]; this.emit('arrive', this.bodyX, this.band[0], this.sa[i]); }
      if (this.sx[i] < 0 || this.sx[i] > this.W) { this.emit('shore', clamp(this.sx[i], 0, this.W), this.band[0], this.sa[i]); this.son[i] = 0; continue; }
      if (this.sa[i] < 0.03) { this.son[i] = 0; continue; }
      swell += this.sa[i];
    }
    // a big enough ripple at the Mallow's column counts as an arrival too
    const hb = this.h[this._col(this.bodyX)];
    if (this._armed && hb >= ARRIVE_AT) { this._armed = false; this.lastGold = false; this.emit('arrive', this.bodyX, this.band[0], hb); }
    else if (hb < 0.15) this._armed = true;
    this.energy = clamp((sum / n) * 3 + swell * 0.5, 0, 1);
    return this;
  }

  /** Surface height at x (ripples plus swell crests), about −1.5..1.5. */
  height(x) {
    const f = clamp((x / this.W) * (this.cols - 1), 0, this.cols - 1), i = Math.floor(f), j = Math.min(this.cols - 1, i + 1);
    let y = this.h[i] + (this.h[j] - this.h[i]) * (f - i);
    for (let s = 0; s < this.maxSwells; s++) {
      if (!this.son[s]) continue;
      const u = (x - this.sx[s]) / this.sw[s];
      if (u > -1 && u < 1) y += this.sa[s] * 0.5 * (1 + Math.cos(Math.PI * u));
    }
    return y;
  }

  /** Live swells (for drawing and the gold count). */
  swells() { let k = 0; for (let i = 0; i < this.maxSwells; i++) k += this.son[i]; return k; }

  snapshot() {
    const live = [];
    for (let i = 0; i < this.maxSwells; i++) if (this.son[i]) live.push({ x: Math.round(this.sx[i]), v: Math.round(this.sv[i]), a: +this.sa[i].toFixed(3), gold: !!this.sg[i] });
    return { energy: +this.energy.toFixed(3), cols: this.cols, swells: live, amount: +this.amount.toFixed(3) };
  }
}

// --------------------------------------------------------------- puddles --
export class Puddles {
  constructor() {
    this.wet = 0;
    this.e = new Float32Array(8);     // [x, y, rx, ry] × 2 at full size
    this.count = 2;
    this.W = 390;
    this._shown = false;              // formed this time (stays shown while drying from 0.3 down)
  }

  /**
   * {floorY, body, W}: one puddle either side of the Mallow, just beyond its base (the right one a little
   * further out). Kept on screen where there is room; on a narrow phone, where the Mallow fills most of the
   * width, a puddle tucks behind its base and may run off the screen edge (up to 45 %) rather than vanish.
   */
  resize({ floorY, body, W } = {}) {
    this.W = W || this.W;
    if (!body) return this;
    const w = body.w, rx = 0.35 * w, ry = 0.06 * w, off = 0.5 * w + 0.55 * rx;
    for (let k = 0; k < 2; k++) {
      const want = body.cx + (k ? off * 1.15 : -off);
      const room = k ? this.W - rx - 4 >= want : want - rx - 4 >= 0;
      const x = room ? want : clamp(want, rx * 0.55, this.W - rx * 0.55);
      const under = Math.abs(x - body.cx) < w * 0.3;   // mostly under the Mallow: no puddle there
      this.e[4 * k] = x; this.e[4 * k + 1] = (floorY ?? body.bottom) + ry * 0.3;   // on the ground just in front of the base line
      this.e[4 * k + 2] = under ? 0 : rx; this.e[4 * k + 3] = under ? 0 : ry;
    }
    return this;
  }

  /** rain: what is falling right now (0..1); about 8 s of full rain soaks the ground. */
  addWet(dt, rain) {
    this.wet = clamp(this.wet + (Math.max(0, dt) * clamp(rain, 0, 1)) / 8, 0, 1);
    if (this.wet > 0.3) this._shown = true;
    return this;
  }

  /** Dry with τ 60 s. */
  step(dt) {
    this.wet *= Math.exp(-Math.max(0, dt) / DRY_TAU);
    if (this.wet < 0.05) this._shown = false;
    return this;
  }

  /** 0..1: how present the puddles are (they appear once wet > 0.3, then fade as they dry). */
  get visible() { return this._shown ? smoothstep(0.05, 0.3, this.wet) : 0; }

  /** Current size factor (grows with wet). */
  get scale() { return 0.6 + 0.4 * clamp(this.wet / 0.6, 0, 1); }

  /** Index of the puddle under (x, y) (generous touch tolerance), or −1. */
  hit(x, y) {
    if (this.visible < 0.2) return -1;
    for (let k = 0; k < 2; k++) {
      const rx = this.e[4 * k + 2] * this.scale * 1.6, ry = Math.max(14, this.e[4 * k + 3] * this.scale * 2.4);
      if (rx <= 0) continue;
      const dx = (x - this.e[4 * k]) / rx, dy = (y - this.e[4 * k + 1]) / ry;
      if (dx * dx + dy * dy < 1) return k;
    }
    return -1;
  }

  snapshot() { return { wet: +this.wet.toFixed(3), visible: +this.visible.toFixed(3), ellipses: Array.from(this.e, (v) => Math.round(v)) }; }
}
