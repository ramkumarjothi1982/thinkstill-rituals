// Pointer speed for the Hushflow worlds (pure: no DOM, no clock; node-tested).
//
// Speed is how far the finger really travelled — the PATH length, the sum of
// |Δp| between samples — over a short window (≥ 60 ms), divided by the
// window's duration, then smoothed as a SCALAR (EMA: rises with τ 0.06 s so a
// fast stroke registers within two or three frames, falls with τ 0.12 s). A fast
// scribble that reverses every 80 ms therefore reads as fast. (Straight-line
// distance over the window cuts through every reversal, and smoothing the
// velocity VECTOR lets opposite directions cancel: a ±60 px scribble at a true
// 1500 px/s used to read as ~230 px/s, i.e. "slow".)
//
// A separate smoothed vector (vx, vy) keeps the net direction of travel, for
// things that are pushed along the stroke. It is NOT the speed: for a
// scribble |v| is small while `speed` is large.
//
// Tiny moves below MIN_STEP_PX are held back until they add up (a dead-band
// on an anchor point), so touch-screen jitter on a resting finger does not
// count as movement.
//
// When events stop arriving (a resting mouse, often a resting finger), the
// caller ticks idle(dt, quietSec) every frame: once the pointer has been quiet
// for longer than its usual gap between events (1.6× the measured interval,
// 60–400 ms), the speed decays towards 0 with the same τ — so a finger that
// stops reads as still within about half a second.
//
//   const v = createVelocity();
//   v.reset(x, y, tSec)          // pointer down
//   v.sample(x, y, tSec)         // every (coalesced) move → speed px/s
//   v.idle(dtSec, quietSec)      // every frame → true when it decayed

export const VELOCITY = Object.freeze({
  WINDOW_SEC: 0.06,     // path length over at least this much time
  ATTACK_SEC: 0.06,     // scalar speed EMA while speeding up
  TAU_SEC: 0.12,        // …while slowing down, the direction vector, and the idle decay
  MIN_STEP_PX: 1.5,     // jitter dead-band
  STALE_K: 1.6,         // quiet for 1.6× the usual event interval → stopped
  STALE_MIN_SEC: 0.06,
  STALE_MAX_SEC: 0.4,   // (a sparse event stream — some devices, remote QA — is not a stop)
  N: 24,                // samples kept (≥ the window at 240 Hz)
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createVelocity(opts = {}) {
  const c = { ...VELOCITY, ...opts };
  const N = Math.max(4, c.N | 0);
  const hx = new Float64Array(N), hy = new Float64Array(N), ht = new Float64Array(N), cum = new Float64Array(N);
  let n = 0, head = 0;
  let ax = 0, ay = 0, path = 0;
  let speed = 0, vx = 0, vy = 0, lastT = 0, interval = 1 / 60;

  function push(x, y, t) {
    head = (head + 1) % N;
    hx[head] = x; hy[head] = y; ht[head] = t; cum[head] = path;
    if (n < N) n++;
  }

  const api = {
    /** Smoothed path speed, px/s. */
    get speed() { return speed; },
    /** Smoothed net velocity (direction of travel), px/s. */
    get vx() { return vx; },
    get vy() { return vy; },
    get lastT() { return lastT; },
    /** The usual gap between this pointer's events (EMA), s. */
    get interval() { return interval; },
    /** How long the pointer may be quiet before it counts as stopped, s. */
    get staleSec() { return clamp(c.STALE_K * interval, c.STALE_MIN_SEC, c.STALE_MAX_SEC); },
    /** Pointer down at (x, y), time t (s): speed starts at 0. */
    reset(x, y, t = 0) {
      n = 0; path = 0; ax = x; ay = y; speed = 0; vx = 0; vy = 0; lastT = t; interval = 1 / 60;
      push(x, y, t);
    },
    /** A move sample. Returns the smoothed speed (px/s). */
    sample(x, y, t) {
      if (!n) { api.reset(x, y, t); return 0; }
      const dtE = t - lastT > 0 ? t - lastT : 0;
      const d = Math.hypot(x - ax, y - ay);
      if (d >= c.MIN_STEP_PX) { path += d; ax = x; ay = y; }
      push(x, y, t);
      // the window: back to the first sample at least WINDOW_SEC old (or the oldest kept)
      let j = head;
      for (let m = 1; m < n; m++) {
        j = (head - m + N) % N;
        if (t - ht[j] >= c.WINDOW_SEC) break;
      }
      const dtw = t - ht[j];
      if (dtE > 0) interval += (Math.min(dtE, 0.5) - interval) * 0.35;
      if (dtw > 1e-4 && dtE > 0) {
        const inst = (path - cum[j]) / dtw;
        const ivx = (x - hx[j]) / dtw, ivy = (y - hy[j]) / dtw;
        const a = 1 - Math.exp(-dtE / c.TAU_SEC);
        speed += (inst - speed) * (inst > speed ? 1 - Math.exp(-dtE / c.ATTACK_SEC) : a);
        vx += (ivx - vx) * a; vy += (ivy - vy) * a;
      }
      if (t > lastT) lastT = t;
      return speed;
    },
    /**
     * Called every frame with the frame's dt and the time since this pointer's
     * last event. Once that exceeds staleSec the pointer has stopped: decay the
     * speed (and direction) towards 0 with τ. Returns true when it decayed.
     */
    idle(dt, quietSec) {
      if (!(dt > 0) || !(quietSec > api.staleSec)) return false;
      const k = Math.exp(-dt / c.TAU_SEC);
      speed *= k; vx *= k; vy *= k;
      if (speed < 0.05) speed = 0;
      return true;
    },
  };
  return api;
}
