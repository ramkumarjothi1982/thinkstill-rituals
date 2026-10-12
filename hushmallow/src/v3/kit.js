// Interaction kit shared by world laws and touch engines: path tracing,
// angle tracking, hit tests, pointer bookkeeping. Pure geometry, no drawing
// policy (engines own their look).

import { TAU, clamp, dist, lerp, rgba, glow } from './fx.js';

/** Resample a polyline to points ~`step` px apart. */
export function resample(pts, step = 4) {
  if (pts.length < 2) return pts.map((p) => [p[0], p[1]]);
  const out = [[pts[0][0], pts[0][1]]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.hypot(x1 - x0, y1 - y0);
    let d = step - carry;
    while (d <= L) { const t = d / L; out.push([lerp(x0, x1, t), lerp(y0, y1, t)]); d += step; }
    carry = L - (d - step);
  }
  const last = pts[pts.length - 1];
  if (dist(out[out.length - 1][0], out[out.length - 1][1], last[0], last[1]) > step * 0.3) out.push([last[0], last[1]]);
  return out;
}
/** Points along a cubic bezier. */
export function bezier(p0, p1, p2, p3, n = 48) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}
/** Points along a circular arc (angles in radians, clockwise when a1 > a0). */
export function arcPts(cx, cy, r, a0, a1, n = 64) {
  return Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
}
export function polyLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); return L; }

/**
 * Follow-the-path tracker. Progress only grows when the finger is near the
 * path just ahead of the traced head, so it can't be skipped or autoplayed.
 *   const tr = new CurveTrace(pts, { tol: 38 });
 *   tr.feed(x, y);  // on move → true if it advanced
 *   tr.progress;    // 0..1
 */
export class CurveTrace {
  constructor(pts, { tol = 38, ahead = 26, step = 4 } = {}) {
    this.tol = tol; this.aheadN = ahead; this.setPoints(pts, step);
  }
  setPoints(pts, step = 4) {
    this.pts = resample(pts, step);
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + dist(this.pts[i - 1][0], this.pts[i - 1][1], this.pts[i][0], this.pts[i][1]));
    this.L = this.cum[this.cum.length - 1] || 1;
    this.i = 0; this.near = Infinity; this.off = false;
  }
  reset() { this.i = 0; this.off = false; }
  get progress() { return this.cum[this.i] / this.L; }
  get head() { const p = this.pts[this.i]; return { x: p[0], y: p[1] }; }
  get last() { return this.pts.length - 1; }
  /** Feed a finger position. Returns true when the head advanced. */
  feed(x, y) {
    let best = -1, bd = Infinity;
    const lo = Math.max(0, this.i - 6), hi = Math.min(this.last, this.i + this.aheadN);
    for (let k = lo; k <= hi; k++) { const d = dist(x, y, this.pts[k][0], this.pts[k][1]); if (d < bd) { bd = d; best = k; } }
    this.near = bd;
    this.off = bd > this.tol;
    if (!this.off && best > this.i) { this.i = best; return true; }
    return false;
  }
  /** Assist: move the head forward by a fraction of the path. */
  advance(dp) {
    const target = Math.min(this.L, this.cum[this.i] + dp * this.L);
    while (this.i < this.last && this.cum[this.i] < target) this.i++;
  }
  get done() { return this.i >= this.last - 1; }
  /** Point at fraction p of the path (with direction). */
  pointAt(p) {
    const target = clamp(p) * this.L;
    let lo = 0, hi = this.last;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.cum[m] < target) lo = m + 1; else hi = m; }
    const k = Math.max(1, lo), a = this.pts[k - 1], b = this.pts[k];
    return { x: b[0], y: b[1], a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  /** Draw a dotted guide for the untraced part and a glowing ribbon for the traced part. */
  draw(g, { colour = '#ffffff', core = '#ffffff', width = 8, guide = 0.5, dots = true, t = 0 } = {}) {
    const P = this.pts;
    if (P.length < 2) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (guide > 0 && this.i < this.last) {
      g.strokeStyle = rgba(colour, 0.18 * guide); g.lineWidth = width * 2.2;
      g.beginPath(); g.moveTo(P[this.i][0], P[this.i][1]); for (let k = this.i + 1; k < P.length; k++) g.lineTo(P[k][0], P[k][1]); g.stroke();
      if (dots) {
        g.fillStyle = rgba(core, 0.55 * guide);
        const gap = Math.max(3, Math.round(16 / 4));
        for (let k = this.i + gap; k < P.length; k += gap) {
          const pulse = 0.6 + 0.4 * Math.sin(t * 3 - k * 0.15);
          g.beginPath(); g.arc(P[k][0], P[k][1], 1.6 + pulse, 0, TAU); g.fill();
        }
      }
    }
    if (this.i > 0) {
      g.globalCompositeOperation = 'lighter';
      for (const [w, a, c] of [[width * 2.4, 0.18, colour], [width, 0.55, colour], [width * 0.34, 0.95, core]]) {
        g.strokeStyle = rgba(c, a); g.lineWidth = w;
        g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let k = 1; k <= this.i; k++) g.lineTo(P[k][0], P[k][1]); g.stroke();
      }
    }
    g.restore();
  }
}

/** Accumulates signed angle travelled around a centre (positive = clockwise on screen). */
export class AngleTracker {
  constructor(cx = 0, cy = 0) { this.cx = cx; this.cy = cy; this.a = null; this.total = 0; this.speed = 0; }
  start(x, y) { this.a = Math.atan2(y - this.cy, x - this.cx); }
  /** Returns the change in angle since the last call (radians). */
  feed(x, y, dt = 1 / 60) {
    const a = Math.atan2(y - this.cy, x - this.cx);
    if (this.a == null) { this.a = a; return 0; }
    let d = a - this.a; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
    this.a = a; this.total += d; this.speed = lerp(this.speed, d / Math.max(1e-3, dt), 0.3);
    return d;
  }
  end() { this.a = null; }
}

export const hit = (p, x, y, r) => dist(p.x, p.y, x, y) <= r;
export const inRect = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
/** Nearest index in a list of {x,y} within r, or -1. */
export function nearest(list, x, y, r = Infinity) {
  let best = -1, bd = r;
  list.forEach((o, i) => { if (!o) return; const d = dist(x, y, o.x, o.y); if (d < bd) { bd = d; best = i; } });
  return best;
}

/** Soft "not yet" wobble value for a rejected touch: call .kick(), read .v each frame. */
export class Wobble {
  constructor() { this.v = 0; this.vel = 0; }
  kick(k = 1) { this.vel += 18 * k; }
  update(dt) { const f = -260 * this.v - 14 * this.vel; this.vel += f * dt; this.v += this.vel * dt; return this.v; }
}

/** Little glowing ring that counts down a wait (law locks, holds). */
export function waitRing(g, x, y, r, frac, colour, alpha = 1) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha; g.lineCap = 'round';
  g.strokeStyle = rgba(colour, 0.22); g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.strokeStyle = rgba(colour, 0.9); g.lineWidth = 3.5; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac)); g.stroke();
  g.restore();
  glow(g, x, y, r * 1.4, colour, 0.25 * alpha);
}
