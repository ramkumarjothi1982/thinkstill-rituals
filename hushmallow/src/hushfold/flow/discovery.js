// Hushflow discoveries — small state machines that watch what the person's
// hands actually did (speed bands, holds, the world's own measurements) and
// report a discovery only when the contingency really happened. A discovery
// line ("You changed your pace. The world responded.") must always be
// literally true of the last few seconds of play.
//
// Pure (no DOM, no clock): feed update(dt, metrics) every frame. Node-tested.

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * Speed bands in units of U = min(W, H) per second. Fingers, mice and pens
 * move differently, so each has its own constants.
 */
export const PACE = Object.freeze({
  touch: { fastU: 1.8, slowLoU: 0.12, slowHiU: 0.65, stillU: 0.06, stillSec: 0.6, minFastU: 1.3 },
  pen: { fastU: 1.8, slowLoU: 0.12, slowHiU: 0.65, stillU: 0.05, stillSec: 0.6, minFastU: 1.3 },
  mouse: { fastU: 2.2, slowLoU: 0.14, slowHiU: 0.75, stillU: 0.04, stillSec: 0.6, minFastU: 1.5 },
});

/** Slowness 0..1 for a speed v (px/s): 1 at or below slowLo, 0 at or above slowHi. */
export function slowness(v, U, band = PACE.touch) { return smoothstep(band.slowHiU * U, band.slowLoU * U, v); }

/**
 * Per-person pace. After 3 s of moving it calibrates the fast threshold
 * DOWN for people who generally move gently (fast = max(minFast, 1.6 × median)),
 * never up — so a fast scribbler is always "fast" and a gentle mover can get there too.
 */
export function createPace({ U = 390, pointerType = 'touch' } = {}) {
  let band = PACE[pointerType] || PACE.touch;
  const N = 96;
  const samples = new Float32Array(N);
  let count = 0, head = 0, movingSec = 0, sampleClock = 0;
  let fastPx = band.fastU * U;
  let stillSec = 0;
  const sorted = new Float32Array(N);
  const out = { band: 'none', s: 0, k: 0, fast: false, still: false, stillSec: 0, fastPx, speed: 0 };
  function recalibrate() {
    const n = Math.min(count, N);
    if (n < 24) return;
    sorted.set(samples.subarray(0, n));
    const view = sorted.subarray(0, n);
    view.sort();
    const median = view[n >> 1];
    fastPx = Math.min(band.fastU * U, Math.max(band.minFastU * U, 1.6 * median));
  }
  return {
    get fastPx() { return fastPx; },
    get calibrated() { return movingSec >= 3; },
    setPointerType(t) { band = PACE[t] || PACE.touch; fastPx = Math.min(fastPx, band.fastU * U); },
    setU(u) { const k = u / U; U = u; fastPx *= k; },
    /** speed in px/s; down = a finger is on the world. Returns a shared (reused) result object. */
    update(dt, down, speed) {
      out.speed = speed;
      if (!down) { stillSec = 0; out.band = 'none'; out.s = 0; out.k = 0; out.fast = false; out.still = false; out.stillSec = 0; return out; }
      if (speed > band.stillU * U) {
        stillSec = 0;
        movingSec += dt;
        sampleClock += dt;
        if (sampleClock >= 1 / 30) { sampleClock = 0; samples[head] = speed; head = (head + 1) % N; count++; if (movingSec >= 3 && count % 12 === 0) recalibrate(); }
      } else stillSec += dt;
      const s = slowness(speed, U, band);
      const k = clamp((speed - fastPx) / fastPx, 0, 2);
      out.s = s; out.k = k; out.fast = speed >= fastPx; out.still = stillSec >= band.stillSec; out.stillSec = stillSec;
      out.band = out.still ? 'still' : out.fast ? 'fast' : s > 0.05 ? 'slow' : 'mid';
      out.fastPx = fastPx;
      return out;
    },
  };
}

/**
 * 'slowing': the person moved fast (charge high), then slowed down and the
 * world visibly calmed under their finger.
 *   1. Armed: fast for a cumulative ≥ armFastSec within a armWindowSec window, with Q ≥ armQ.
 *   2. Fires: a slow run (finger down, slowness ≥ slowS) starting within withinSec of the last
 *      fast moment, lasting ≥ slowSec (dips shorter than graceSec forgiven), having drained
 *      ≥ drainFrac · Q_armed · drainScale light since arming.
 * metrics: { down, fast, s, Q, light }. update() returns null or { id, evidence } once.
 */
export function createSlowingDetector(opts = {}) {
  const c = { armFastSec: 1.0, armWindowSec: 3, armQ: 0.5, withinSec: 6, slowS: 0.6, slowSec: 1.8, graceSec: 0.25, drainFrac: 0.25, drainScale: 8, ...opts };
  const BIN = 0.1, NB = Math.round(c.armWindowSec / BIN);
  const bins = new Float32Array(NB);
  let bin = 0, binClock = 0;
  let state = 'idle', sinceFast = Infinity, qArmed = 0, lightAtArm = 0, fastMs = 0, slowRun = 0, gap = 0, armedAt = 0, t = 0;
  function reset() { state = 'idle'; qArmed = 0; lightAtArm = 0; fastMs = 0; slowRun = 0; gap = 0; }
  return {
    get state() { return state; },
    get armed() { return state === 'armed'; },
    get fired() { return state === 'fired'; },
    get slowRun() { return slowRun; },
    /** Mark as already discovered (restored progress). */
    markFired() { state = 'fired'; },
    update(dt, m) {
      if (state === 'fired' || dt <= 0) return null;
      t += dt;
      // fast time inside the rolling window
      binClock += dt;
      while (binClock >= BIN) { binClock -= BIN; bin = (bin + 1) % NB; bins[bin] = 0; }
      if (m.fast && m.down) { bins[bin] += dt; sinceFast = 0; } else sinceFast += dt;
      let fastWin = 0;
      for (let i = 0; i < NB; i++) fastWin += bins[i];
      if (fastWin >= c.armFastSec && m.Q >= c.armQ) {
        if (state === 'idle') { state = 'armed'; qArmed = m.Q; lightAtArm = m.light; armedAt = t; }
        else qArmed = Math.max(qArmed, m.Q);
        fastMs = Math.max(fastMs, fastWin * 1000);
      }
      if (state !== 'armed') return null;
      if (m.down && !m.fast && m.s >= c.slowS) { slowRun += dt; gap = 0; }
      else { gap += dt; if (gap > c.graceSec) slowRun = 0; }
      if (slowRun === 0 && sinceFast > c.withinSec) { reset(); return null; }
      const drained = m.light - lightAtArm;
      if (slowRun >= c.slowSec && drained >= c.drainFrac * qArmed * c.drainScale) {
        state = 'fired';
        return { id: 'slowing', evidence: { qBefore: round(qArmed), qAfter: round(m.Q), fastMs: Math.round(fastMs), slowMs: Math.round(slowRun * 1000), drained: round(drained), armedForMs: Math.round((t - armedAt) * 1000) } };
      }
      return null;
    },
  };
}

/**
 * 'stillness': for people who never rush. Ground pulses from holding still
 * (≥ pulses of them in one hold, ≤ gapSec apart) drained ≥ drainMin, with no
 * fast movement for quietSec and the 'slowing' discovery not waiting.
 * metrics: { pulse: bool (a pulse finished this frame), pulseDrain, fast, blocked }.
 */
export function createStillnessDetector(opts = {}) {
  const c = { pulses: 2, gapSec: 3.2, drainMin: 3, quietSec: 6, ...opts };
  let state = 'idle', run = 0, runDrain = 0, sincePulse = Infinity, sinceFast = Infinity;
  return {
    get state() { return state; },
    get fired() { return state === 'fired'; },
    markFired() { state = 'fired'; },
    update(dt, m) {
      if (state === 'fired') return null;
      sincePulse += dt;
      sinceFast = m.fast ? 0 : sinceFast + dt;
      if (sincePulse > c.gapSec) { run = 0; runDrain = 0; }
      if (m.pulse) { run++; runDrain += m.pulseDrain || 0; sincePulse = 0; }
      if (!m.blocked && run >= c.pulses && runDrain >= c.drainMin && sinceFast >= c.quietSec) {
        state = 'fired';
        return { id: 'stillness', evidence: { pulses: run, drained: round(runDrain) } };
      }
      return null;
    },
  };
}

/**
 * Settling of one object (the Thought Mallow): local charge below `below`
 * for `forSec` continuous seconds, after having been above `above` once.
 */
export function createSettleDetector({ below = 0.15, above = 0.3, forSec = 2 } = {}) {
  let wasCharged = false, run = 0, done = false;
  return {
    get settled() { return done; },
    markSettled() { done = true; },
    update(dt, q) {
      if (done) return false;
      if (q > above) wasCharged = true;
      if (wasCharged && q < below) run += dt; else run = 0;
      if (run >= forSec) { done = true; return true; }
      return false;
    },
  };
}

function round(v) { return Math.round(v * 100) / 100; }
