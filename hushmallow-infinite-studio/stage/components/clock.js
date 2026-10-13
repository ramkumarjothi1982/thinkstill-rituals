// Deterministic virtual clock for offline rendering.
//
// The approved Hushmallow engines (Mallow rig, Hushfold realms) are written
// for live screens: they run on requestAnimationFrame, read wall-clock time,
// observe their containers and use Math.random for blinks, saccades and
// particles. To render a frame-exact, reproducible video we don't edit those
// engines; this module, loaded BEFORE any of them, swaps the browser hooks
// they use for virtual ones:
//
//   requestAnimationFrame → callbacks are queued and only run when step() is
//                           called, with a synthetic timestamp
//   performance.now/Date  → virtual time (advances only in step())
//   Math.random           → seeded PRNG (same seed → identical video)
//   Resize/Intersection   → inert; sizes are applied explicitly
//   matchMedia            → "no reduced motion" so the full animation renders
//
// Must be imported as the very first module of the stage page.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 20261013);

const state = {
  nowMs: 1000,             // virtual ms since "page load"
  epoch: Date.UTC(2026, 9, 13, 2, 0, 0), // 2 AM, naturally
  queue: [],
  nextId: 1,
};

Math.random = mulberry32(SEED);

const realPerfNow = performance.now.bind(performance);
performance.now = () => state.nowMs;
const RealDate = Date;
// Date.now only; `new Date()` is left alone (nothing in the engines uses it for animation)
Date.now = () => state.epoch + state.nowMs;

// Engines keep the id they get back and treat their loop as "running", so no
// engine ever schedules itself again; the stage ticks each engine explicitly
// (realm.debug.frame(dt), rig._tick(dt, now)). Callbacks are kept only so a
// component that wants a frame hook can opt in via clock.step().
window.requestAnimationFrame = (cb) => {
  state.queue.push({ id: 0x7fffffff, cb, parked: true });
  return 0x7fffffff;
};
window.cancelAnimationFrame = () => {};

class InertObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
window.ResizeObserver = InertObserver;
window.IntersectionObserver = InertObserver;

const realMatchMedia = window.matchMedia?.bind(window);
window.matchMedia = (q) => {
  if (/prefers-reduced-motion/.test(q)) {
    return { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
  }
  return realMatchMedia ? realMatchMedia(q) : { matches: false, media: q, addEventListener() {}, removeEventListener() {} };
};

export const clock = {
  seed: SEED,
  get nowMs() { return state.nowMs; },
  get pending() { return state.queue.length; },
  /** Advance virtual time by dtMs. Parked engine loops are never run. */
  step(dtMs) {
    state.nowMs += dtMs;
    state.queue.length = 0;
  },
  realNow: realPerfNow,
  RealDate,
};

window.__hushClock = clock;
