// Weather Weaver — clouds and mist (pure; no DOM).
//
//   CloudBank   puffs you can part. 'thunder': three depth bands of storm
//               heads; a swipe parts them like curtains (opposite impulses
//               either side of the path, a little rubber-band resistance,
//               decisive swipes tear wider), two fingers spreading open a
//               gap. Parted puffs drift home by ≤ 15 % over 30 s. 'deck': the
//               low rain deck; a puff can be grabbed and pushed, and rain
//               falls in proportion to each column's cover, so it stops
//               under a gap.
//   MistField   fog as a FieldGrid: wiped along a path, cleared by a hold,
//               refilled toward its density with τ 9 s, streamed by the wind.
//   StrikeClock storm strikes 8–14 s apart in sim time while the bank is
//               heavy (glows only in the gentle style or with reduced motion),
//               each followed by thunder 0.4–1.2 s later.
//   glowEnvelope a cloud glow: rises over 0.35 s, fades over 1.2 s (photosafe).

import { clamp, smoothstep, rng } from '../math.js';
import { SimBase, FieldGrid, segDist2 } from './field.js';

export const COLS = 16;                                  // cover columns across the width
export const CENTRAL = [2, 13];                          // the central band (inclusive columns) coverage is measured over
export const PUFFS = { thunder: { high: 12, medium: 9, low: 6 }, deck: { high: 8, medium: 6, low: 4 } };
export const PHONE_W = 430;                              // the tier counts are for a phone; wider skies get proportionally more (≤ 2×)
export const BLITS = { high: 7, medium: 6, low: 5 };     // drawing sub-blobs per thunderhead
export const PATH_R = 70;                                // a swipe reaches puffs within 70 px of its path
export const REDRIFT_TAU = 240;                          // s: 1 − e^(−30/240) ≈ 12 % back in 30 s
export const GLOW_RISE = 0.35, GLOW_FADE = 1.2, GLOW_GAP = 1;   // s; lab cloud glows ≤ 1 a second (SHARED C6)
export const STRIKE_MIN = 8, STRIKE_MAX = 14;            // s between storm strikes (sim time)

/** Cloud glow at t seconds after it began: 0 → 1 over 0.35 s (smooth), back to 0 over 1.2 s. */
export function glowEnvelope(t) {
  if (!(t > 0)) return 0;
  if (t < GLOW_RISE) return smoothstep(0, GLOW_RISE, t);
  return t < GLOW_RISE + GLOW_FADE ? 1 - smoothstep(GLOW_RISE, GLOW_RISE + GLOW_FADE, t) : 0;
}

const DRAG_TAU = 0.6;          // s: pushed puffs glide about imp·0.6 px

export class CloudBank extends SimBase {
  /** @param {{kind?:'thunder'|'deck', tier?:string, seed?:number}} [o] */
  constructor({ kind = 'thunder', tier = 'medium', seed = 1 } = {}) {
    super();
    this.kind = kind === 'deck' ? 'deck' : 'thunder';
    const t = PUFFS[this.kind];
    this.cap = t.high * 2;
    this.tier = t[tier] ? tier : 'medium';
    this.base = t[this.tier];
    this.n = this.base;
    this.blits = BLITS[tier] ?? BLITS.medium;
    const F = () => new Float32Array(this.cap);
    this.x = F(); this.y = F(); this.r = F(); this.hx = F(); this.hy = F(); this.vx = F(); this.vy = F();
    this.seedv = F();                                  // per-puff random 0..1 (drawing variation)
    this.glowT0 = F().fill(-99);                       // sim time each puff's glow began
    this.band = new Uint8Array(this.cap);
    this.columnCover = new Float32Array(COLS);
    this.rand = rng(seed);
    this.seed = seed;
    this.W = 390; this.H = 844; this.top = 60; this.bottom = 400;
    this.t = 0;
    this.cov0 = 1;
    this.off = 0;                                      // choreography offset (px), drawing only
    this._sign = -1;
    this._lastFlash = -99;
    this.wind = this.kind === 'thunder' ? 0.05 : 0.2;  // how much the wind field carries the bank
    this.grabId = new Int32Array(3).fill(-1);
    this.grabI = new Int16Array(3).fill(-1);
    this.gx = new Float32Array(3); this.gy = new Float32Array(3);
    this._layout();
  }

  /**
   * Sky band {W, H, top, bottom} the bank lives in (px). Lays the puffs out afresh; a sky wider
   * than a phone gets more puffs (up to twice the tier's count) so each head keeps a natural size.
   */
  resize({ W, H, top, bottom } = {}) {
    this.W = W || this.W; this.H = H || this.H;
    this.top = top ?? this.top; this.bottom = Math.max(this.top + 40, bottom ?? this.bottom);
    this.n = Math.min(this.cap, Math.round(this.base * Math.max(1, this.W / PHONE_W)));
    this._layout();
    return this;
  }

  /** Shrink the active pool for a lower tier (never grows mid-session). */
  setTier(tier) {
    const b = PUFFS[this.kind][tier];
    if (!b || b >= this.base) return this;
    this.base = b; this.tier = tier; this.blits = BLITS[tier] ?? this.blits;
    this.n = Math.min(this.n, Math.round(b * Math.max(1, this.W / PHONE_W)));
    this._layout();
    return this;
  }

  _layout() {
    const { W, n } = this, bh = this.bottom - this.top, rand = rng(this.seed);
    const bands = this.kind === 'thunder' ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const b = i % bands, j = Math.floor(i / bands), m = Math.ceil((n - b) / bands);
      const sp = W * (this.kind === 'thunder' ? 1.1 : 1.15) / m;
      const yc = this.kind === 'thunder' ? this.top + bh * (0.3 + 0.21 * b) : this.top + bh * 0.5;
      const r = sp * (this.kind === 'thunder' ? 0.7 : 0.75) * (0.92 + 0.16 * rand());
      const x = -0.05 * W + sp * (j + 0.5) + (b * sp) / 3 + (rand() - 0.5) * 0.2 * sp;
      this.band[i] = b;
      this.r[i] = r;
      this.x[i] = this.hx[i] = x;
      this.y[i] = this.hy[i] = yc + (rand() - 0.5) * bh * 0.12;
      this.vx[i] = this.vy[i] = 0;
      this.seedv[i] = rand();
      this.glowT0[i] = -99;
    }
    this._measure();
    this.cov0 = Math.max(0.05, this.coverage());
  }

  /** Back to the laid-out bank (Again). */
  reset() { this._layout(); this.grabId.fill(-1); this.grabI.fill(-1); return this; }

  // ------------------------------------------------------------ touch --
  /** Index of the puff under (x, y) (its elliptical body), or −1. */
  hit(x, y) {
    let best = -1, bd = 1;
    for (let i = 0; i < this.n; i++) {
      const dx = (x - this.x[i] - this.dx()) / this.r[i], dy = (y - this.y[i]) / (this.r[i] * 0.65), d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /**
   * A swipe from (x0, y0) to (x1, y1): puffs within PATH_R of the path (from their
   * edge) are pushed apart, opposite ways either side. strength 0..1 (swipe speed).
   * Returns how many puffs moved.
   */
  push(x0, y0, x1, y1, strength = 0.5) {
    const sx = x1 - x0, sy = y1 - y0, L = Math.hypot(sx, sy), off = this.dx();
    if (L < 1e-3) return 0;
    const nx = -sy / L, ny = sx / L, ux = sx / L, uy = sy / L;
    const imp0 = 520 * Math.pow(clamp(strength, 0, 1.5), 1.2);
    let moved = 0;
    for (let i = 0; i < this.n; i++) {
      const px = this.x[i] + off, py = this.y[i], r = this.r[i];
      const d = Math.sqrt(segDist2(px, py, x0, y0, x1, y1)) - 0.45 * r;
      if (d >= PATH_R) continue;
      const f = d <= 0 ? 1 : 1 - d / PATH_R;
      const cross = sx * (py - y0) - sy * (px - x0);
      let side = Math.sign(cross);
      if (!side) side = Math.sign(nx || 1) * (px < this.W / 2 ? -1 : 1);
      const imp = imp0 * f / (1 + Math.abs(this.x[i] - this.hx[i]) / (3 * r));   // rubber band
      this.vx[i] += (nx * side + ux * 0.25) * imp;
      this.vy[i] += (ny * side + uy * 0.25) * imp * 0.5;
      moved++;
    }
    return moved;
  }

  /** Two fingers spreading at (cx, cy): nearby puffs move apart horizontally. k 0..1. */
  spread(cx, cy, k = 0.5) {
    const off = this.dx();
    let moved = 0;
    for (let i = 0; i < this.n; i++) {
      const px = this.x[i] + off, d = Math.hypot(px - cx, this.y[i] - cy) - 0.45 * this.r[i];
      if (d >= 160) continue;
      const f = d <= 0 ? 1 : 1 - d / 160;
      this.vx[i] += Math.sign(px - cx || (cx < this.W / 2 ? 1 : -1)) * 520 * clamp(k, 0, 1.5) * f;
      moved++;
    }
    return moved;
  }

  /** Arrow keys: push the puff nearest the middle of the sky sideways (dir −1 | 1). Returns its index. */
  nudge(dir = 1) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.n; i++) { const d = Math.abs(this.x[i] - this.W / 2); if (d < bd) { bd = d; best = i; } }
    if (best >= 0) this.vx[best] += Math.sign(dir || 1) * 380;
    return best;
  }

  /** Grab the puff under (x, y) with pointer `id` (deck pushing). True when one was taken. */
  grab(id, x, y) {
    const i = this.hit(x, y), s = this.grabId.indexOf(-1);
    if (i < 0 || s < 0 || this.grabI.includes(i)) return false;
    this.grabId[s] = id; this.grabI[s] = i; this.gx[s] = x - this.dx(); this.gy[s] = y;
    return true;
  }

  drag(id, x, y) {
    const s = this.grabId.indexOf(id);
    if (s >= 0) { this.gx[s] = x - this.dx(); this.gy[s] = y; }
  }

  /** Let go; the puff glides on with (vx, vy)·0.5 and stays where it was put. */
  release(id, vx = 0, vy = 0) {
    const s = this.grabId.indexOf(id);
    if (s < 0) return;
    const i = this.grabI[s];
    this.vx[i] = vx * 0.5; this.vy[i] = vy * 0.2;
    this.hx[i] = clamp(this.x[i], -this.r[i], this.W + this.r[i]);
    this.grabId[s] = -1; this.grabI[s] = -1;
  }

  // ----------------------------------------------------------- glows --
  /** A glow on the puff nearest x (front band first), at most one a second. Its index, or −1 when refused. */
  flash(x) {
    if (this.t - this._lastFlash < GLOW_GAP) return -1;
    let best = -1, bd = Infinity;
    const front = this.kind === 'thunder' ? 2 : 0;
    for (let i = 0; i < this.n; i++) {
      const d = Math.abs(this.x[i] + this.dx() - x) + (this.band[i] === front ? 0 : this.W * 0.25);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) { this.glowT0[best] = this.t; this._lastFlash = this.t; }
    return best;
  }

  glowAt(i) { return glowEnvelope(this.t - this.glowT0[i]); }
  /** The brightest glow in the bank at sim time `now`. */
  glow(now = this.t) {
    let g = 0;
    for (let i = 0; i < this.n; i++) g = Math.max(g, glowEnvelope(now - this.glowT0[i]));
    return g;
  }

  // ------------------------------------------------------------ step --
  /** wind: px/s carrying the bank (the wind field at the sky's middle), scaled by this.wind. */
  step(dt, wind = 0) {
    dt = clamp(dt, 0, 0.1);
    this.t += dt;
    this._presence(dt);
    this._choreo();
    const drag = Math.exp(-dt / DRAG_TAU), home = 1 - Math.exp(-dt / REDRIFT_TAU);
    const amb = (this.reduced ? 0.3 : 1) * this.speed;
    const carry = (wind || 0) * this.wind * amb;
    for (let s = 0; s < 3; s++) {
      const i = this.grabI[s];
      if (i < 0) continue;
      this.vx[i] = (this.gx[s] - this.x[i]) * 12;
      this.vy[i] = (this.gy[s] - this.y[i]) * 12;
    }
    for (let i = 0; i < this.n; i++) {
      const r = this.r[i], grabbed = this.grabI.includes(i);
      if (!grabbed) {
        this.vx[i] *= drag;
        this.vy[i] = this.vy[i] * drag + (this.hy[i] - this.y[i]) * 6 * dt;
        this.x[i] += (this.hx[i] - this.x[i]) * home;
        this.x[i] += carry * dt;
        this.hx[i] += carry * dt;
      }
      this.x[i] = clamp(this.x[i] + this.vx[i] * dt, -1.1 * r, this.W + 1.1 * r);
      this.hx[i] = clamp(this.hx[i], -1.1 * r, this.W + 1.1 * r);
      this.y[i] = clamp(this.y[i] + this.vy[i] * dt, this.top - r * 0.5, this.bottom + r * 0.3);
      if (!Number.isFinite(this.x[i]) || !Number.isFinite(this.y[i])) { this.x[i] = this.hx[i]; this.y[i] = this.hy[i]; this.vx[i] = this.vy[i] = 0; }
    }
    this._measure();
    return this;
  }

  // Sweep in from windward / drift off leeward. The offset only moves the drawing, so
  // coverage (and so progress) measures what the person did, not the choreography.
  _choreo() {
    if (this.amount >= 1) { this.off = 0; return; }
    if (this.off === 0) this._sign = this.entering ? -this.dir : this.dir;
    else this._sign = Math.sign(this.off);
    this.off = this._sign * (1 - smoothstep(0, 1, this.amount)) * (this.W * 0.6 + 120);
  }

  /** Horizontal drawing offset (0 with reduced motion: enter and leave fade in place). */
  dx() { return this.reduced ? 0 : this.off; }

  /** Where to draw puff i: its position, the choreography offset and a slow ambient sway (drawing only). */
  drawX(i) {
    const sway = this.reduced ? 0 : Math.sin(this.t * 0.31 * this.speed + this.seedv[i] * 6.28) * 5 * this.speed;
    return this.x[i] + this.dx() + sway;
  }

  _measure() {
    const cc = this.columnCover, cw = this.W / COLS;
    for (let c = 0; c < COLS; c++) {
      const xc = (c + 0.5) * cw;
      let clearP = 1;
      for (let i = 0; i < this.n; i++) {
        const r = this.r[i], d = Math.abs(xc - this.x[i]);
        if (d >= r) continue;
        clearP *= smoothstep(0.55 * r, r, d);          // 0 under the puff's core, 1 past its edge
      }
      cc[c] = 1 - clearP;
    }
  }

  /** Mean cover over the central columns (0..1). */
  coverage() {
    let s = 0;
    for (let c = CENTRAL[0]; c <= CENTRAL[1]; c++) s += this.columnCover[c];
    return s / (CENTRAL[1] - CENTRAL[0] + 1);
  }

  /** New sky: 1 − coverage / coverage at layout (0..1). */
  clear() { return clamp(1 - this.coverage() / this.cov0, 0, 1); }

  /** Up to 3 gaps in the central band (cover < 0.4) as [x, width, …] in out (≥ 6). Returns the count. */
  gaps(out) {
    const cc = this.columnCover, cw = this.W / COLS;
    let k = 0, start = -1;
    for (let c = CENTRAL[0]; c <= CENTRAL[1] + 1 && k < 3; c++) {
      const open = c <= CENTRAL[1] && cc[c] < 0.4;
      if (open && start < 0) start = c;
      else if (!open && start >= 0) { out[2 * k] = ((start + c) / 2) * cw + this.dx(); out[2 * k + 1] = (c - start) * cw; k++; start = -1; }
    }
    return k;
  }

  snapshot() {
    const puffs = [];
    for (let i = 0; i < this.n; i++) puffs.push([Math.round(this.x[i]), Math.round(this.y[i]), Math.round(this.r[i]), this.band[i]]);
    return { kind: this.kind, n: this.n, amount: +this.amount.toFixed(3), coverage: +this.coverage().toFixed(3), clear: +this.clear().toFixed(3),
      glow: +this.glow().toFixed(3), cover: Array.from(this.columnCover, (v) => +v.toFixed(2)), puffs };
  }
}

// ------------------------------------------------------------------- mist --
export const MIST = { high: [40, 26], medium: [32, 20], low: [24, 16] };
export const MIST_TAU = 9, LIFT_TAU = 0.7, LIFT_DENSITY = 0.12;

export class MistField extends SimBase {
  constructor({ tier = 'medium' } = {}) {
    super();
    const [c, r] = MIST[tier] || MIST.medium;
    this.grid = new FieldGrid(c, r).fill(1);
    this.tier = tier;
    this.density = 1;          // refill target
    this.tau = MIST_TAU;
    this.lifted = false;
    this.W = 390; this.H = 844; this.top = 60; this.floor = 700;
  }

  /** {W, H, top, floor}: the mist covers the full width from the sky top to the floor. */
  resize({ W, H, top, floor } = {}) {
    this.W = W || this.W; this.H = H || this.H; this.top = top ?? this.top; this.floor = floor ?? this.floor;
    this.grid.setRect(0, this.top, this.W, this.floor);
    return this;
  }

  /** Wipe along a path r px wide (34–60, scaled by speed by the caller). */
  wipe(x0, y0, x1, y1, r = 44) { this.grid.paint(x0, y0, x1, y1, r, -0.9); return this; }

  /** A resting finger: the clear patch around (x, y) grows the longer it is held. */
  hold(x, y, dt) { this.grid.paint(x, y, x, y, 70, -Math.min(1, dt * 1.6)); return this; }

  /** The fog lifts as a whole (on resolve): rises and thins over about 2 s. */
  lift(on = true) { this.lifted = !!on; this.density = on ? LIFT_DENSITY : 1; this.tau = on ? LIFT_TAU : MIST_TAU; return this; }

  reset() { this.grid.fill(1); this.lift(false); return this; }

  /** wind: px/s horizontal carried by the mist (streams with the wind field). */
  step(dt, wind = 0) {
    dt = clamp(dt, 0, 0.1);
    this._presence(dt);
    if (wind) this.grid.advect((wind * 0.6 * dt) / this.grid.cw, 0);
    this.grid.relax(dt, this.density, this.tau);
    return this;
  }

  /** Fraction of the full mist that has been cleared (0..1). */
  fogClear() { return clamp(1 - this.grid.mean(), 0, 1); }

  /** Visible height of the mist (0 = on the floor, 1 = full): it rises on enter and sinks on leave. */
  rise(k) { return this.setAmount(k); }
  sink(k) { return this.setAmount(1 - k); }

  snapshot() { return { amount: +this.amount.toFixed(3), fogClear: +this.fogClear().toFixed(3), density: this.density, lifted: this.lifted, grid: [this.grid.cols, this.grid.rows] }; }
}

// ---------------------------------------------------------------- strikes --
export class StrikeClock {
  constructor({ seed = 1 } = {}) {
    this.rand = rng(seed);
    this.t = 0;
    this.last = -99;
    this.next = this._gap();
    this.thunderAt = -1;
    this._active = false;
  }

  _gap() { return this.t + STRIKE_MIN + (STRIKE_MAX - STRIKE_MIN) * this.rand(); }
  reset() { this.t = 0; this.last = -99; this.next = this._gap(); this.thunderAt = -1; this._active = false; }

  /**
   * Advance sim time. → 'strike' | 'glow' (a strike the gentle style or reduced motion turns into a
   * cloud glow) | 'thunder' (0.4–1.2 s after either) | null. Strikes are ≥ 8 s apart, only while
   * coverage > 0.5, and the first one after the bank thickens waits at least 2 s.
   */
  step(dt, { coverage = 1, gentle = false, reduced = false } = {}) {
    this.t += clamp(dt, 0, 0.1);
    if (this.thunderAt >= 0 && this.t >= this.thunderAt) { this.thunderAt = -1; return 'thunder'; }
    const on = coverage > 0.5;
    if (on && !this._active) this.next = Math.max(this.next, this.t + 2);
    this._active = on;
    if (!on || this.t < this.next) return null;
    this.last = this.t;
    this.next = this._gap();
    this.thunderAt = this.t + 0.4 + 0.8 * this.rand();
    return gentle || reduced ? 'glow' : 'strike';
  }
}
