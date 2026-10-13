// Tiny motion engine for the Hushmates interface: the same curves and
// springs as the hushmallow landing page (Framer Motion), in plain JS.
// One shared requestAnimationFrame loop runs only while something moves.

export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t;
  const Y = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x;
      if (Math.abs(e) < 1e-6) return Y(t);
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    while (hi - lo > 1e-6) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}

export const EASE = {
  linear: (t) => t,
  easeIn: bezier(0.42, 0, 1, 1),
  easeOut: bezier(0, 0, 0.58, 1),
  easeInOut: bezier(0.42, 0, 0.58, 1),
  out: bezier(0.22, 1, 0.36, 1),        // the house curve (--ease)
  hop: bezier(0.3, 0, 0.3, 1),
  spin: bezier(0.5, 0, 0.2, 1),
};
export const CSS_EASE = 'cubic-bezier(.22,1,.36,1)';

export function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

const active = new Set();
let raf = 0;
function loop(now) {
  for (const a of [...active]) a.step(now);
  raf = active.size ? requestAnimationFrame(loop) : 0;
}
function run(a) { active.add(a); if (!raf && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop); }

/** One animated number with one animation slot: a new animation cancels the old. */
export class Channel {
  constructor(v, onChange) { this.v = v; this.cur = null; this.onChange = onChange; }
  get() { return this.v; }
  set(v) { this.stop(); this.v = v; this.onChange(); }
  stop() { if (this.cur) { active.delete(this.cur); this.cur.resolve(); this.cur = null; } }
  /** values: keyframes (a single number tweens from the current value); ease applies per segment */
  tween(values, { duration, times, ease = EASE.easeInOut, delay = 0 } = {}) {
    if (!Array.isArray(values)) values = [this.v, values];
    const n = values.length - 1;
    const T = times || values.map((_, i) => i / n);
    this.stop();
    let t0 = null;
    return new Promise((resolve) => {
      const a = this.cur = {
        resolve,
        step: (now) => {
          if (t0 === null) t0 = now + delay * 1000;
          const p = Math.min(1, Math.max(0, (now - t0) / (Math.max(0.001, duration) * 1000)));
          let i = 0;
          while (i < n - 1 && p > T[i + 1]) i++;
          const span = T[i + 1] - T[i] || 1;
          const local = ease(Math.min(1, Math.max(0, (p - T[i]) / span)));
          this.v = values[i] + (values[i + 1] - values[i]) * local;
          this.onChange();
          if (p >= 1) { active.delete(a); this.cur = null; resolve(); }
        },
      };
      run(a);
    });
  }
  /** analytic under-damped spring (every spring used here has ζ < 1) */
  spring(target, { stiffness, damping, mass = 1, velocity = 0 }) {
    const x0 = this.v, D = target - x0;
    const w0 = Math.sqrt(stiffness / mass);
    const z = damping / (2 * Math.sqrt(stiffness * mass));
    const wd = w0 * Math.sqrt(Math.max(1e-6, 1 - z * z));
    const pos = (t) => target - Math.exp(-z * w0 * t) * (((-velocity + z * w0 * D) / wd) * Math.sin(wd * t) + D * Math.cos(wd * t));
    this.stop();
    let t0 = null;
    return new Promise((resolve) => {
      const a = this.cur = {
        resolve,
        step: (now) => {
          if (t0 === null) t0 = now;
          const t = (now - t0) / 1000;
          const x = pos(t);
          const v = (pos(t + 0.001) - x) / 0.001;
          this.v = x;
          this.onChange();
          if ((Math.abs(v) < 0.01 && Math.abs(target - x) < 0.005) || t > 4) {
            this.v = target; this.onChange(); active.delete(a); this.cur = null; resolve();
          }
        },
      };
      run(a);
    });
  }
}

/** Follows a moving target with a per-frame spring (lean towards the pointer). */
export class Follower {
  constructor(onChange, { stiffness = 80, damping = 14 } = {}) {
    this.x = 0; this.v = 0; this.target = 0; this.k = stiffness; this.c = damping; this.onChange = onChange;
    this.last = 0;
    this.a = { step: (now) => {
      const dt = Math.min(0.05, (now - (this.last || now)) / 1000) || 1 / 60;
      this.last = now;
      const acc = -this.k * (this.x - this.target) - this.c * this.v;
      this.v += acc * dt; this.x += this.v * dt;
      this.onChange(this.x);
      if (Math.abs(this.v) < 0.01 && Math.abs(this.x - this.target) < 0.01) { this.x = this.target; this.onChange(this.x); active.delete(this.a); this.last = 0; }
    } };
  }
  to(target) { this.target = target; run(this.a); }
  stop() { active.delete(this.a); }
}

/** Samples a damped spring into linear WAAPI keyframe progress values (0 → 1). */
export function springCurve({ stiffness, damping, mass = 1, velocity = 0 }) {
  const w0 = Math.sqrt(stiffness / mass);
  const z = damping / (2 * Math.sqrt(stiffness * mass));
  const wd = w0 * Math.sqrt(Math.max(1e-6, 1 - z * z));
  const decay = damping / (2 * mass);
  const duration = Math.min(2, 6 / decay);
  const p = (t) => 1 - Math.exp(-decay * t) * (Math.cos(wd * t) + ((decay - velocity) / wd) * Math.sin(wd * t));
  const N = 60;
  return { pts: Array.from({ length: N + 1 }, (_, i) => (i === N ? 1 : p((i / N) * duration))), duration: duration * 1000 };
}

/** Drop-in entrance (landing "drop into focus"): spring from above, slightly small. */
export function dropIn(el, { y = -60, scale = 0.8, stiffness = 210, damping = 16, delay = 0 } = {}) {
  if (!el?.animate) return null;
  if (reducedMotion()) return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay, fill: 'backwards' });
  const s = springCurve({ stiffness, damping });
  return el.animate(s.pts.map((v) => ({ transform: `translateY(${y * (1 - v)}px) scale(${scale + (1 - scale) * v})`, opacity: Math.min(1, v * 1.6) })),
    { duration: s.duration, delay, easing: 'linear', fill: 'backwards' });
}

/** Soft rise (Reveal): opacity + 28px rise over .8s on the house curve, staggered. */
export function rise(els, { y = 22, duration = 700, stagger = 70, delay = 0 } = {}) {
  const list = [...els].filter(Boolean);
  const rm = reducedMotion();
  list.forEach((el, i) => el.animate?.(rm ? [{ opacity: 0 }, { opacity: 1 }]
    : [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }],
  { duration: rm ? 250 : duration, delay: delay + i * stagger, easing: CSS_EASE, fill: 'backwards' }));
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
