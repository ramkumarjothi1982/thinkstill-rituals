// Weather Weaver — shared pieces for the pure weather sims (no DOM).
//
//   FieldGrid  a low-resolution scalar field (0..1) over a rectangle: the mist
//              you wipe, the haze sunlight burns away. Painted with a capsule
//              brush, relaxed toward a target, advected by the wind, and
//              turned into RGBA bytes for one small putImageData.
//   SimBase    what every sim shares: an enter / leave presence (amount),
//              Comfort DNA speed, reduced motion and an allocation-free event
//              hook (sim.emit = (type, x, y, k) => …).
//   scatter    seeded dart-throwing placement with a minimum spacing and
//              keep-out rectangles (stars, embers).

import { clamp } from '../math.js';

export const noop = () => {};

/** Squared distance from (px, py) to the segment (x0, y0)–(x1, y1). */
export function segDist2(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy;
  let t = L > 1e-9 ? ((px - x0) * dx + (py - y0) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = x0 + dx * t - px, ey = y0 + dy * t - py;
  return ex * ex + ey * ey;
}

export class SimBase {
  constructor() {
    this.amount = 0;         // presence 0..1 (enter → 1, leave → 0); draws and measures use it
    this.target = 0;
    this.dir = 1;            // direction of travel for sweeping enters / leaves
    this.enterDur = 1.2;     // seconds at speed 1
    this.leaveDur = 1.2;
    this.speed = 1;          // Comfort DNA pace (0.82 / 1 / 1.14)
    this.reduced = false;
    this.emit = noop;        // (type, x, y, k) → void
  }

  enter(dir = 1) { this.target = 1; this.dir = dir < 0 ? -1 : 1; return this; }
  leave(dir = 1) { this.target = 0; this.dir = dir < 0 ? -1 : 1; return this; }
  setAmount(a) { this.amount = this.target = clamp(+a || 0, 0, 1); return this; }
  setReduced(b) { this.reduced = !!b; return this; }
  setSpeed(k) { this.speed = clamp(+k || 1, 0.5, 2); return this; }
  get entering() { return this.target > this.amount; }

  _presence(dt) {
    if (this.amount === this.target) return;
    const up = this.target > this.amount, s = dt * this.speed / Math.max(1e-3, up ? this.enterDur : this.leaveDur);
    this.amount = up ? Math.min(this.target, this.amount + s) : Math.max(this.target, this.amount - s);
  }
}

export class FieldGrid {
  /** @param {number} cols @param {number} rows  cells; the world rectangle defaults to one px per cell */
  constructor(cols, rows) {
    this.cols = Math.max(1, cols | 0);
    this.rows = Math.max(1, rows | 0);
    this.n = this.cols * this.rows;
    this.v = new Float32Array(this.n);
    this._t = new Float32Array(this.n);
    this.x0 = 0; this.y0 = 0; this.cw = 1; this.ch = 1;
  }

  /** Map the grid onto the world rectangle (x0, y0)–(x1, y1) in px. */
  setRect(x0, y0, x1, y1) {
    this.x0 = x0; this.y0 = y0;
    this.cw = Math.max(1e-6, (x1 - x0) / this.cols);
    this.ch = Math.max(1e-6, (y1 - y0) / this.rows);
    return this;
  }

  fill(v) { this.v.fill(clamp(v, 0, 1)); return this; }

  /**
   * Capsule brush: every cell centre within r px of the segment moves by
   * amt·(1 − (d/r)²)² (1 at the spine, 0 at the edge), clamped to 0..1.
   * amt < 0 wipes. Touches only the cells in the brush's bounding box.
   */
  paint(x0, y0, x1, y1, r, amt) {
    if (!(r > 0) || !amt) return this;
    const { cols, rows, cw, ch, v } = this, r2 = r * r;
    const c0 = clamp(Math.floor((Math.min(x0, x1) - r - this.x0) / cw), 0, cols - 1), c1 = clamp(Math.ceil((Math.max(x0, x1) + r - this.x0) / cw), 0, cols - 1);
    const q0 = clamp(Math.floor((Math.min(y0, y1) - r - this.y0) / ch), 0, rows - 1), q1 = clamp(Math.ceil((Math.max(y0, y1) + r - this.y0) / ch), 0, rows - 1);
    for (let j = q0; j <= q1; j++) {
      const py = this.y0 + (j + 0.5) * ch;
      for (let i = c0; i <= c1; i++) {
        const d2 = segDist2(this.x0 + (i + 0.5) * cw, py, x0, y0, x1, y1);
        if (d2 >= r2) continue;
        const f = 1 - d2 / r2, k = j * cols + i, nv = v[k] + amt * f * f;
        v[k] = nv < 0 ? 0 : nv > 1 ? 1 : nv;
      }
    }
    return this;
  }

  /** Exponential approach toward `target` (a number, or a per-cell Float32Array) with time constant tau (s). */
  relax(dt, target, tau) {
    const a = 1 - Math.exp(-Math.max(0, dt) / Math.max(1e-4, tau)), v = this.v;
    if (typeof target === 'number') for (let i = 0; i < this.n; i++) v[i] += (target - v[i]) * a;
    else for (let i = 0; i < this.n; i++) v[i] += (target[i] - v[i]) * a;
    return this;
  }

  /** Shift the field by (dx, dy) cells (fractional, bilinear); cells entering from an edge copy the edge. */
  advect(dx, dy) {
    if (!dx && !dy) return this;
    const { cols, rows, v, _t: t } = this;
    t.set(v);
    for (let j = 0; j < rows; j++) {
      const sy = clamp(j - dy, 0, rows - 1), y0 = Math.floor(sy), y1 = Math.min(rows - 1, y0 + 1), fy = sy - y0;
      for (let i = 0; i < cols; i++) {
        const sx = clamp(i - dx, 0, cols - 1), x0 = Math.floor(sx), x1 = Math.min(cols - 1, x0 + 1), fx = sx - x0;
        const a = t[y0 * cols + x0] + (t[y0 * cols + x1] - t[y0 * cols + x0]) * fx;
        const b = t[y1 * cols + x0] + (t[y1 * cols + x1] - t[y1 * cols + x0]) * fx;
        v[j * cols + i] = a + (b - a) * fy;
      }
    }
    return this;
  }

  /** Bilinear value at world (x, y) (clamped to the grid). */
  sample(x, y) {
    const { cols, rows, v } = this;
    const sx = clamp((x - this.x0) / this.cw - 0.5, 0, cols - 1), sy = clamp((y - this.y0) / this.ch - 0.5, 0, rows - 1);
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(cols - 1, x0 + 1), y1 = Math.min(rows - 1, y0 + 1), fx = sx - x0, fy = sy - y0;
    const a = v[y0 * cols + x0] + (v[y0 * cols + x1] - v[y0 * cols + x0]) * fx;
    const b = v[y1 * cols + x0] + (v[y1 * cols + x1] - v[y1 * cols + x0]) * fx;
    return a + (b - a) * fy;
  }

  mean() {
    let s = 0;
    for (let i = 0; i < this.n; i++) s += this.v[i];
    return s / this.n;
  }

  /** Mean over the cells whose centres lie in the world box (the nearest cell when none do). */
  meanIn(x0, y0, x1, y1) {
    const { cols, rows, cw, ch, v } = this;
    const c0 = clamp(Math.ceil((Math.min(x0, x1) - this.x0) / cw - 0.5), 0, cols - 1), c1 = clamp(Math.floor((Math.max(x0, x1) - this.x0) / cw - 0.5), 0, cols - 1);
    const q0 = clamp(Math.ceil((Math.min(y0, y1) - this.y0) / ch - 0.5), 0, rows - 1), q1 = clamp(Math.floor((Math.max(y0, y1) - this.y0) / ch - 0.5), 0, rows - 1);
    if (c1 < c0 || q1 < q0) return this.sample((x0 + x1) / 2, (y0 + y1) / 2);
    let s = 0, n = 0;
    for (let j = q0; j <= q1; j++) for (let i = c0; i <= c1; i++) { s += v[j * cols + i]; n++; }
    return s / n;
  }

  /** Write RGBA bytes (cols × rows × 4) into u8: colour rgb [r, g, b] (0..255), alpha = value·k·255. */
  toRGBA(u8, rgb, k = 1) {
    const v = this.v, r = rgb[0], g = rgb[1], b = rgb[2], s = 255 * k;
    for (let i = 0, p = 0; i < this.n; i++, p += 4) {
      u8[p] = r; u8[p + 1] = g; u8[p + 2] = b;
      const a = v[i] * s;
      u8[p + 3] = a < 0 ? 0 : a > 255 ? 255 : a;
    }
    return u8;
  }
}

/**
 * Seeded dart throwing: up to n points in rect {x0, y0, x1, y1}, at least minDist
 * apart and outside every avoid rect {x0, y0, x1, y1}. Writes x, y pairs into
 * out (Float32Array ≥ 2n) and returns how many were placed.
 */
export function scatter(n, rect, avoid, minDist, rand, out) {
  const w = rect.x1 - rect.x0, h = rect.y1 - rect.y0, d2 = minDist * minDist;
  let placed = 0;
  if (!(w > 0) || !(h > 0)) return 0;
  for (let tries = 0; placed < n && tries < n * 60; tries++) {
    const x = rect.x0 + rand() * w, y = rect.y0 + rand() * h;
    let ok = true;
    for (let a = 0; ok && a < avoid.length; a++) { const r = avoid[a]; if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) ok = false; }
    for (let i = 0; ok && i < placed; i++) { const dx = out[2 * i] - x, dy = out[2 * i + 1] - y; if (dx * dx + dy * dy < d2) ok = false; }
    if (ok) { out[2 * placed] = x; out[2 * placed + 1] = y; placed++; }
  }
  return placed;
}
