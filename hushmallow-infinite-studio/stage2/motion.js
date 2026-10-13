// Analytic motion primitives. Every animated quantity is a pure function of
// time t (seconds), so any instant can be evaluated exactly: sub-frame motion
// blur, time-lagged evaluation (a jelly wave travelling up the body), and
// rendering frames in any order all come for free.
//
//   Track      piecewise targets, each change eased by a closed-form damped
//              spring (overshoot optional) — physical, never linear
//   Impulses   a sum of damped-sinusoid responses to kicks (jiggle, wobble)
//   Hop        a ballistic arc between take-off and landing
//   Blinks     an asymmetric blink curve (fast close, slower open)

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const smootherstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };

/** Unit step response of a damped spring (0 → 1), natural freq f (Hz), damping ratio z. */
export function spring(t, f, z) {
  if (t <= 0) return 0;
  const w = TAU * f;
  if (z >= 1) { const e = Math.exp(-w * t); return 1 - e * (1 + w * t); }
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}

/** Impulse response (peak ≈ 1 shortly after t=0), damped sinusoid. */
export function ring(t, f, z) {
  if (t <= 0) return 0;
  const w = TAU * f;
  const wd = w * Math.sqrt(Math.max(1e-6, 1 - z * z));
  // normalise so the first peak is ~1
  const tp = Math.atan2(wd, z * w) / wd;
  const peak = Math.exp(-z * w * tp) * Math.sin(wd * tp);
  return (Math.exp(-z * w * t) * Math.sin(wd * t)) / peak;
}

/**
 * A spring-eased piecewise track.
 *   new Track(v0, { f: 2.2, z: 0.8 }).to(t1, v1).to(t2, v2, { f, z })
 * value(t) = v0 + Σ (v_k − v_{k−1}) · spring(t − t_k, f_k, z_k)
 */
export class Track {
  constructor(v0 = 0, opts = {}) {
    this.v0 = v0;
    this.f = opts.f ?? 2.4;
    this.z = opts.z ?? 0.85;
    this.keys = [];
    this.last = v0;
  }
  to(t, v, opts = {}) {
    this.keys.push({ t, d: v - this.last, f: opts.f ?? this.f, z: opts.z ?? this.z, ease: opts.ease || null, dur: opts.dur || 0 });
    this.last = v;
    return this;
  }
  value(t) {
    let v = this.v0;
    for (const k of this.keys) {
      if (t <= k.t) break;
      const u = t - k.t;
      v += k.d * (k.ease ? k.ease(clamp(u / k.dur)) : spring(u, k.f, k.z));
    }
    return v;
  }
}

/** Sum of damped impulse responses: kick(t, amp, f, z). */
export class Impulses {
  constructor() { this.list = []; }
  kick(t, amp, f = 2, z = 0.3) { this.list.push({ t, amp, f, z }); return this; }
  value(t) {
    let v = 0;
    for (const k of this.list) if (t > k.t) v += k.amp * ring(t - k.t, k.f, k.z);
    return v;
  }
}

/** Ballistic hops: [{ t0 (take-off), t1 (landing), h (peak height) }]. */
export class Hops {
  constructor() { this.list = []; }
  add(t0, t1, h) { this.list.push({ t0, t1, h }); return this; }
  value(t) {
    for (const k of this.list) if (t > k.t0 && t < k.t1) { const u = (t - k.t0) / (k.t1 - k.t0); return 4 * k.h * u * (1 - u); }
    return 0;
  }
  velocity(t) {
    for (const k of this.list) if (t > k.t0 && t < k.t1) { const T = k.t1 - k.t0, u = (t - k.t0) / T; return (4 * k.h * (1 - 2 * u)) / T; }
    return 0;
  }
}

/** Blinks: closedness 0..1. Fast close (≈70 ms), held hold, slower open (≈130 ms). */
export class Blinks {
  constructor() { this.list = []; }
  add(t, { close = 0.07, hold = 0.02, open = 0.13 } = {}) { this.list.push({ t, close, hold, open }); return this; }
  value(t) {
    let v = 0;
    for (const b of this.list) {
      const u = t - b.t;
      if (u < 0 || u > b.close + b.hold + b.open) continue;
      let k;
      if (u < b.close) k = smoothstep(0, 1, u / b.close);
      else if (u < b.close + b.hold) k = 1;
      else k = 1 - smoothstep(0, 1, (u - b.close - b.hold) / b.open);
      v = Math.max(v, k);
    }
    return v;
  }
}

/** Smooth value noise in [-1, 1]. */
export function noise1(x, seed = 0) {
  const h = (n) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

export const ease = {
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inQuad: (t) => t * t,
};

/** Monotone cubic spline through [[t, v], ...] — flows through keys, no overshoot. */
export function spline(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const d = (k) => (keys[k + 1][1] - keys[k][1]) / (keys[k + 1][0] - keys[k][0]);
  const tan = (k) => {
    if (k === 0) return d(0);
    if (k === n - 1) return d(n - 2);
    const a = d(k - 1), b = d(k);
    if (a * b <= 0) return 0;
    return (3 * (keys[k + 1][0] - keys[k - 1][0])) / ((2 * keys[k + 1][0] - keys[k][0] - keys[k - 1][0]) / a + (keys[k + 1][0] - 2 * keys[k - 1][0] + keys[k][0]) / b);
  };
  const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
  const h = t1 - t0, u = (t - t0) / h;
  const m0 = tan(i) * h, m1 = tan(i + 1) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}

export function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return pa.map((v, i) => lerp(v, pb[i], clamp(t)) / 255);
}
export const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
