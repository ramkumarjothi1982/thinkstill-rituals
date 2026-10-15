// Hushfold world engine.
//
// Each Mallow lives in a realm: a full-screen, procedurally painted backdrop
// that breathes with the user's emotion.  One <canvas> per mounted realm,
// static depth layers pre-rendered on resize, only moving things drawn per
// frame.  The realm leaves a clear stage at centre-bottom for the Mallow rig
// (feet at `groundY`, default 86% of the height).
//
//   const realm = mountRealm(container, 'static-storm', { emotion: 'angry', intensity: 0.7 });
//   realm.setMood({ clarity: 0.8 });      // eases over seconds, never snaps
//   realm.transform(1);                   // ritual progress → resolved world
//   realm.pulse('tap', { x: e.clientX, y: e.clientY });
//   realm.destroy();
//
// Underneath, createRealmCore(id, {W, H, dpr, …}) is the same engine with no
// DOM, rAF or observers: the Hushflow director drives cores by hand (one
// frame loop, its own layer canvases, per-call easing taus, st.horizonY).

import { clamp, lerp } from './util.js';
import staticStorm from './realms/static-storm.js';
import raindropLagoon from './realms/raindrop-lagoon.js';
import spiralObservatory from './realms/spiral-observatory.js';
import sunpopOrchard from './realms/sunpop-orchard.js';
import sparkFestival from './realms/spark-festival.js';
import blueDrift from './realms/blue-drift.js';
import moonmilkCove from './realms/moonmilk-cove.js';

export const REALMS = {
  'static-storm': {
    id: 'static-storm', name: 'The Static Storm', mallow: 'glitzi',
    tagline: 'Where scrambled feelings crackle until they find their pattern.',
    palette: { sky: '#0b0e33', deep: '#05061f', glow: '#3ee8ff', accent: '#ff3df2', warm: '#ffb37a', ink: '#070720' },
  },
  'raindrop-lagoon': {
    id: 'raindrop-lagoon', name: 'The Raindrop Lagoon', mallow: 'blubi',
    tagline: 'A soft lagoon where every tear hangs like glass, waiting to turn to light.',
    palette: { sky: '#0e3f8f', deep: '#06205a', glow: '#7fd4ff', accent: '#ff8ef2', water: '#0b8ff0', ink: '#050a3a' },
  },
  'spiral-observatory': {
    id: 'spiral-observatory', name: 'The Spiral Observatory', mallow: 'zuzu',
    tagline: 'A dome of looping thoughts, slowly turning into a galaxy you can read.',
    palette: { sky: '#1a0838', deep: '#0b0320', glow: '#39f0ff', accent: '#c414e6', stone: '#2a0f52', ink: '#0b0320' },
  },
  'sunpop-orchard': {
    id: 'sunpop-orchard', name: 'The Sunpop Orchard', mallow: 'boppo',
    tagline: 'Floating islands of golden fruit that bounce whenever good things grow.',
    palette: { sky: '#ff9a7a', deep: '#e8607a', glow: '#ffd23a', accent: '#ff7a0a', leaf: '#8fc24a', ink: '#5a2414' },
  },
  'spark-festival': {
    id: 'spark-festival', name: 'The Spark Festival', mallow: 'pipzi',
    tagline: 'A night festival where every lantern waits for your spark.',
    palette: { sky: '#1c0627', deep: '#0d0214', glow: '#ffcf4a', accent: '#f2073b', lantern: '#ff8a3d', ink: '#0d0214' },
  },
  'blue-drift': {
    id: 'blue-drift', name: 'The Blue Drift', mallow: 'loomi',
    tagline: 'Quiet islands drifting over glass-still water. Nothing here is in a hurry.',
    palette: { sky: '#5ec8f2', deep: '#1a6fb5', glow: '#a8f0ff', accent: '#1aa8f5', water: '#bdeefc', ink: '#0d3e66' },
  },
  'moonmilk-cove': {
    id: 'moonmilk-cove', name: 'The Moonmilk Cove', mallow: 'noomi',
    tagline: 'A sleepy cove under a milky moon, where dreams wash gently ashore.',
    palette: { sky: '#2a2668', deep: '#15123d', glow: '#fff4c8', accent: '#8fd0ff', lavender: '#b9a6ff', ink: '#15123d' },
  },
};

export const REALM_IDS = Object.keys(REALMS);

const FACTORIES = {
  'static-storm': staticStorm,
  'raindrop-lagoon': raindropLagoon,
  'spiral-observatory': spiralObservatory,
  'sunpop-orchard': sunpopOrchard,
  'spark-festival': sparkFestival,
  'blue-drift': blueDrift,
  'moonmilk-cove': moonmilkCove,
};

/** Realm definition for a Mallow id ('glitzi' → REALMS['static-storm']), or null. */
export function realmForMallow(mallowId) {
  for (const id of REALM_IDS) if (REALMS[id].mallow === mallowId) return REALMS[id];
  return null;
}

// ------------------------------------------------------- emotion → mood --
export const NEUTRAL_MOOD = Object.freeze({ agitation: 0.18, heaviness: 0.18, clarity: 0.5, warmth: 0.45 });
const M = (agitation, heaviness, clarity, warmth) => ({ agitation, heaviness, clarity, warmth });
export const EMOTION_MOODS = {
  neutral: NEUTRAL_MOOD,
  happy: M(0.2, 0.04, 0.82, 0.86),
  excited: M(0.42, 0.02, 0.78, 0.88),
  playful: M(0.32, 0.04, 0.74, 0.82),
  loved: M(0.08, 0.04, 0.8, 0.96),
  proud: M(0.16, 0.04, 0.86, 0.82),
  hopeful: M(0.12, 0.12, 0.76, 0.72),
  calm: M(0.03, 0.1, 0.72, 0.55),
  relieved: M(0.05, 0.08, 0.74, 0.62),
  curious: M(0.24, 0.08, 0.62, 0.6),
  surprised: M(0.5, 0.08, 0.5, 0.55),
  awe: M(0.14, 0.04, 0.88, 0.74),
  confused: M(0.42, 0.25, 0.1, 0.4),
  anxious: M(0.8, 0.35, 0.14, 0.3),
  scared: M(0.86, 0.42, 0.1, 0.2),
  sad: M(0.08, 0.86, 0.3, 0.3),
  lonely: M(0.06, 0.8, 0.34, 0.18),
  guilty: M(0.3, 0.72, 0.3, 0.24),
  embarrassed: M(0.46, 0.42, 0.34, 0.46),
  jealous: M(0.72, 0.3, 0.28, 0.3),
  disgusted: M(0.68, 0.34, 0.3, 0.2),
  angry: M(0.96, 0.24, 0.28, 0.34),
  frustrated: M(0.86, 0.36, 0.24, 0.3),
  exhausted: M(0.04, 0.92, 0.34, 0.26),
  bored: M(0.04, 0.56, 0.36, 0.3),
  determined: M(0.34, 0.1, 0.76, 0.62),
  comforted: M(0.04, 0.1, 0.72, 0.78),
};

/** Mood for an emotion preset at an intensity (0..1). Unknown presets → neutral. */
export function moodForEmotion(presetId, intensity = 0.6) {
  const target = EMOTION_MOODS[presetId] || NEUTRAL_MOOD;
  const k = 0.35 + 0.65 * clamp(intensity ?? 0.6);
  const out = {};
  for (const key of Object.keys(NEUTRAL_MOOD)) out[key] = clamp(NEUTRAL_MOOD[key] + (target[key] - NEUTRAL_MOOD[key]) * k);
  return out;
}

const PULSE_KINDS = new Set(['tap', 'success', 'burst', 'ripple', 'strike', 'clear']);
const MOOD_TAU = 1.4;      // s — default time constant for mood easing (≈4 s to settle)
const TRANSFORM_TAU = 1.7; // s
const FOCUS_TAU = 0.9;     // s
const MARGIN = 26;         // px bleed around layers for parallax

/** Each realm's horizon line as a fraction of the height (st.horizonY = round(H × this)). */
export const REALM_HORIZON = Object.freeze({
  'static-storm': 0.655, 'raindrop-lagoon': 0.6, 'spiral-observatory': 0.635, 'sunpop-orchard': 0.665,
  'spark-festival': 0.6, 'blue-drift': 0.57, 'moonmilk-cove': 0.5,
});

/** A realm id from an id, a realm definition or a Mallow id; unknown → 'moonmilk-cove'. */
export function resolveRealmId(realmId) {
  if (realmId && typeof realmId === 'object') realmId = realmId.id;
  if (FACTORIES[realmId]) return realmId;
  const viaMallow = realmForMallow(realmId);
  if (!viaMallow) console.warn(`[hushfold] unknown realm "${realmId}", using moonmilk-cove`);
  return viaMallow ? viaMallow.id : 'moonmilk-cove';
}

const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const finite = (v) => typeof v === 'number' && isFinite(v);

function detachedCanvas() {
  if (typeof document !== 'undefined' && document.createElement) return document.createElement('canvas');
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(1, 1);
  throw new Error('[hushfold] no canvas available for a realm');
}

/**
 * The realm engine without any DOM, rAF or observers: one opaque canvas of
 * its own (never shared — static-storm's glitch bands copy their own
 * canvas), driven by whoever owns the frame loop (mountRealm, or the
 * Hushflow director).
 *
 *   const core = createRealmCore('static-storm', { W: 390, H: 844, dpr: 1.5, emotion: 'angry' });
 *   core.build();                         // 30–60 ms: call it in idle time
 *   core.setMood({ agitation: 0.9 }, { tau: 0.35 });   // per-call easing override
 *   core.tick(16.7); core.draw();         // or core.frame(16.7)
 *   g.drawImage(core.canvas, 0, 0, 390, 844);
 *
 * opts: { W, H, dpr (fixed; omit for the adaptive 'auto' rule), emotion, intensity, mood, transform,
 *         reducedMotion, lowStimulation, groundY = 0.86, quality: 'auto'|'low'|'high', canvas, adaptive }
 * Coordinates for pulse() are realm-local CSS px ({x, y}) or normalised ({nx, ny}).
 */
export function createRealmCore(realmId, opts = {}) {
  const id = resolveRealmId(realmId);
  const def = REALMS[id];
  const canvas = opts.canvas || detachedCanvas();
  const ctx = canvas.getContext('2d', { alpha: false });

  const prefersReduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startMood = opts.mood ? { ...NEUTRAL_MOOD, ...opts.mood } : moodForEmotion(opts.emotion || 'neutral', opts.intensity ?? 0.6);

  // Shared state the realm reads every frame.
  const st = {
    id, def, W: 0, H: 0, dpr: 1, M: MARGIN,
    groundY: clamp(opts.groundY ?? 0.86, 0.5, 0.98),
    horizon: REALM_HORIZON[id] ?? 0.6,
    horizonY: 0,                   // px, set at build (the line melts and world intros share)
    t: 0, dt: 0, rdt: 0, now: 0,
    raw: { ...startMood },         // eased user mood
    m: { ...startMood },           // effective mood (with transform applied)
    p: clamp(opts.transform ?? 0), // eased transform progress
    camX: 0, camY: 0,              // parallax offset in px for depth 1
    reduced: opts.reducedMotion ?? prefersReduced,
    low: !!opts.lowStimulation,
    quality: opts.quality || 'auto',
    density: 1,
    motion: 1,
  };
  const target = { mood: { ...startMood }, p: st.p, fx: 0, fy: 0 };
  const tau = { mood: MOOD_TAU, p: TRANSFORM_TAU };
  let fx = 0, fy = 0;
  let drift = Math.random() * 100;

  const realm = FACTORIES[id]({ st, ctx, canvas, def });

  const fixedDpr = finite(opts.dpr) && opts.dpr > 0 ? opts.dpr : null;
  let dprOverride = fixedDpr;
  const adaptive = opts.adaptive ?? !fixedDpr;
  let destroyed = false, needBuild = true, built = false;
  let dprDowngraded = false, slowFrames = 0, sampleFrames = 0;
  const pulseTimes = [];

  function computeDpr(W, H) {
    if (dprOverride) return dprOverride;
    const dev = (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) ? devicePixelRatio : 1;
    if (st.quality === 'low') return 1;
    let d = Math.min(dev, 1.5);
    if (st.quality === 'auto') {
      const area = W * H;
      const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
      if (dprDowngraded) d = 1;
      else if (cores <= 4 && area > 520000) d = 1;
      // keep the backing store under ~2.4 MP
      if (area * d * d > 2.4e6) d = Math.max(1, Math.sqrt(2.4e6 / area));
    }
    return d;
  }

  function applyDensity() {
    st.density = (st.quality === 'low' ? 0.6 : 1) * (st.low ? 0.55 : 1);
    st.motion = (st.reduced ? 0.3 : 1) * (st.low ? 0.75 : 1);
  }
  applyDensity();

  /** Record a new size (CSS px). Returns true when it changed (a build is then due). */
  function resize(W, H, dpr) {
    W = Math.max(1, Math.round(W || 390)); H = Math.max(1, Math.round(H || 844));
    if (finite(dpr) && dpr > 0) dprOverride = dpr;
    const d = computeDpr(W, H);
    if (W === st.W && H === st.H && d === st.dpr) return false;
    st.W = W; st.H = H; st.dpr = d;
    needBuild = true;
    return true;
  }

  /** Paint the static layers now (30–60 ms on a phone). */
  function build() {
    if (destroyed) return false;
    if (!st.W) resize(opts.W, opts.H, opts.dpr);
    st.dpr = computeDpr(st.W, st.H);
    canvas.width = Math.round(st.W * st.dpr);
    canvas.height = Math.round(st.H * st.dpr);
    st.horizonY = Math.round(st.H * st.horizon);
    realm.build(st);
    needBuild = false; built = true;
    return true;
  }

  function step(dtMs) {
    const rdt = Math.min(dtMs, 50) / 1000;
    st.rdt = rdt;
    st.now += rdt;
    st.dt = rdt * st.motion;
    st.t += st.dt;
    const km = 1 - Math.exp(-rdt / tau.mood);
    const kp = 1 - Math.exp(-rdt / tau.p);
    const kf = 1 - Math.exp(-rdt / FOCUS_TAU);
    for (const k in st.raw) st.raw[k] += (target.mood[k] - st.raw[k]) * km;
    st.p += (target.p - st.p) * kp;
    if (Math.abs(target.p - st.p) < 1e-4) st.p = target.p;
    const p = st.p;
    st.m.agitation = st.raw.agitation * (1 - p);
    st.m.heaviness = st.raw.heaviness * (1 - p);
    st.m.clarity = st.raw.clarity + (1 - st.raw.clarity) * p;
    st.m.warmth = st.raw.warmth + (Math.max(0.72, st.raw.warmth) - st.raw.warmth) * p;
    // parallax + slow camera drift (none when reduced motion)
    const tx = st.reduced ? 0 : target.fx, ty = st.reduced ? 0 : target.fy;
    fx += (tx - fx) * kf; fy += (ty - fy) * kf;
    let dx = 0, dy = 0;
    if (!st.reduced) { drift += rdt; dx = Math.sin(drift * 0.11) * 0.22 + Math.sin(drift * 0.047) * 0.12; dy = Math.sin(drift * 0.083) * 0.18; }
    st.camX = -(fx + dx) * 9;
    st.camY = -(fy + dy) * 6;
  }

  /** Advance time. Adaptive cores also watch for sustained slow frames and drop to 1×. */
  function tick(dtMs = 16.7) {
    if (destroyed) return;
    step(dtMs);
    if (adaptive && st.quality === 'auto' && !dprDowngraded && st.dpr > 1) {
      sampleFrames++;
      if (dtMs > 26) slowFrames++;
      if (sampleFrames >= 120) {
        if (slowFrames > 70) { dprDowngraded = true; needBuild = true; }
        sampleFrames = 0; slowFrames = 0;
      }
    }
  }

  function draw() {
    if (destroyed || !st.W) return;
    if (needBuild) build();
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    realm.frame(ctx, st);
    if (st.low) {
      // soften contrast for low-stimulation mode
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = def.palette.sky;
      ctx.fillRect(0, 0, st.W, st.H);
      ctx.globalAlpha = 1;
    }
  }

  if (finite(opts.W) && finite(opts.H)) resize(opts.W, opts.H, opts.dpr);

  const core = {
    id,
    realm: def,
    canvas,
    ctx,
    st,
    get built() { return built; },
    get needsBuild() { return needBuild; },
    get horizonY() { return st.horizonY || Math.round(st.H * st.horizon); },
    resize,
    build,
    tick,
    draw,
    frame(dtMs = 16.7) { tick(dtMs); draw(); },
    setEmotion(presetId, intensity = 0.6, o = {}) {
      target.mood = moodForEmotion(presetId, intensity);
      tau.mood = finite(o?.tau) && o.tau > 0 ? o.tau : MOOD_TAU;
      return core;
    },
    /** Ease towards a mood. {tau} (s) overrides the easing for this call; omitted → the default 1.4 s. */
    setMood(m = {}, o = {}) {
      for (const k of Object.keys(NEUTRAL_MOOD)) if (finite(m[k])) target.mood[k] = clamp(m[k]);
      tau.mood = finite(o?.tau) && o.tau > 0 ? o.tau : MOOD_TAU;
      return core;
    },
    getMood() { return { ...target.mood }; },
    /** Ease the resolved-world transform towards p. {tau} (s) overrides the easing for this call. */
    transform(p, o = {}) {
      if (finite(p)) target.p = clamp(p);
      tau.p = finite(o?.tau) && o.tau > 0 ? o.tau : TRANSFORM_TAU;
      return core;
    },
    pulse(kind = 'tap', pos = {}) {
      if (!PULSE_KINDS.has(kind)) kind = 'tap';
      let x, y;
      if (pos && finite(pos.nx)) { x = pos.nx * st.W; y = pos.ny * st.H; }
      else if (pos && finite(pos.x)) { x = pos.x; y = pos.y; }
      else { x = st.W * 0.5; y = st.H * (st.groundY - 0.17); }
      // photosensitivity: at most 3 bright events per second; extras become gentle taps
      const t = nowMs();
      while (pulseTimes.length && t - pulseTimes[0] > 1000) pulseTimes.shift();
      let gentle = false;
      if (pulseTimes.length >= 3) gentle = true; else pulseTimes.push(t);
      if (gentle && kind !== 'tap' && kind !== 'ripple') kind = 'tap';
      if (!built) return core;     // nothing to draw into yet
      realm.pulse(kind, x, y, st, gentle); // reduced motion: realms render a soft glow for 'strike'
      return core;
    },
    setFocus(nx = 0, ny = 0) {
      target.fx = clamp(nx, -1, 1); target.fy = clamp(ny, -1, 1);
      return core;
    },
    setReducedMotion(on) { st.reduced = !!on; applyDensity(); return core; },
    setLowStimulation(on) { st.low = !!on; applyDensity(); if (built) realm.build(st); return core; },
    setQuality(q) { st.quality = q; applyDensity(); needBuild = true; return core; },
    /** Jump the eased values to their targets (tests, gallery, restore). */
    settle() { Object.assign(st.raw, target.mood); st.p = target.p; fx = target.fx; fy = target.fy; step(0); return core; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      realm.destroy?.();
      try { canvas.width = canvas.height = 0; } catch { /* detached */ }
    },
  };
  return core;
}

/**
 * Mount a realm into `container` (a positioned element). Returns a handle.
 * A thin wrapper over createRealmCore: it adds the DOM canvas, the rAF
 * loop, resize / visibility / in-view observers and client-coordinate pulses.
 * opts: { emotion, intensity, mood, transform, reducedMotion, lowStimulation,
 *         groundY = 0.86, quality: 'auto' | 'low' | 'high' }
 * handle.pause(true) holds it still (no rAF, no draws) until handle.pause(false).
 */
export function mountRealm(container, realmId, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hushfold-realm';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
  container.prepend(canvas);
  const { W: _w, H: _h, dpr: _d, canvas: _c, ...rest } = opts;
  const core = createRealmCore(realmId, { ...rest, canvas, adaptive: true });
  const id = core.id, st = core.st;
  canvas.dataset.realm = id;

  // held: paused by the caller (e.g. while a Hushflow world covers the backdrop) — no frames, no draws
  let raf = 0, last = 0, destroyed = false, inView = true, needBuild = true, held = false;

  function measure() {
    const W = Math.max(1, Math.round(container.clientWidth || canvas.clientWidth || 390));
    const H = Math.max(1, Math.round(container.clientHeight || canvas.clientHeight || 844));
    const changed = core.resize(W, H);
    if (changed || needBuild || core.needsBuild) {
      core.build();
      needBuild = false;
      return true;
    }
    return false;
  }

  function tick(now) {
    raf = 0;
    if (destroyed || !shouldRun()) return;
    raf = requestAnimationFrame(tick);
    const dtMs = last ? now - last : 16.7;
    last = now;
    if (needBuild || core.needsBuild) measure();
    core.tick(dtMs);
    core.draw();
  }

  function shouldRun() { return !destroyed && !held && inView && !(typeof document !== 'undefined' && document.hidden); }
  function start() { if (!raf && shouldRun()) { last = 0; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  let ro = null, io = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => { needBuild = true; if (!raf && !held) { measure(); core.draw(); } });
    ro.observe(container);
  }
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) inView = e.isIntersecting;
      inView ? start() : stop();
    }, { threshold: 0 });
    io.observe(container);
  }

  measure();
  core.tick(16);
  core.draw();
  start();

  const handle = {
    canvas,
    id,
    realm: core.realm,
    core,
    get horizonY() { return core.horizonY; },
    setEmotion(presetId, intensity = 0.6, o) { core.setEmotion(presetId, intensity, o); return handle; },
    setMood(m = {}, o) { core.setMood(m, o); return handle; },
    getMood() { return core.getMood(); },
    transform(p, o) { core.transform(p, o); return handle; },
    pulse(kind = 'tap', pos = {}) {
      if (pos && typeof pos.nx !== 'number' && typeof pos.x === 'number') {
        const r = canvas.getBoundingClientRect();
        const sx = r.width ? st.W / r.width : 1, sy = r.height ? st.H / r.height : 1;
        pos = { x: (pos.x - r.left) * sx, y: (pos.y - r.top) * sy };
      }
      core.pulse(kind, pos);
      return handle;
    },
    setFocus(nx = 0, ny = 0) { core.setFocus(nx, ny); return handle; },
    setReducedMotion(on) { core.setReducedMotion(on); return handle; },
    setLowStimulation(on) { core.setLowStimulation(on); return handle; },
    setQuality(q) { core.setQuality(q); if (!raf && !held) { measure(); core.draw(); } return handle; },
    /**
     * Hold the realm still (true) or let it run again (false). While held it books no frames and
     * draws nothing (resizes and quality changes wait for the resume, which rebuilds if needed).
     */
    pause(b) { held = !!b; if (held) stop(); else start(); return handle; },
    get paused() { return held; },
    destroy() {
      destroyed = true;
      stop();
      document.removeEventListener('visibilitychange', onVis);
      ro?.disconnect(); io?.disconnect();
      core.destroy();
      canvas.remove();
    },
    /** Test hooks (gallery / QA). Not part of the product API. */
    debug: {
      state: st,
      settle() { core.settle(); },
      frame(dtMs = 16.7) { if (needBuild || core.needsBuild) measure(); core.tick(dtMs); core.draw(); },
      rebuild() { needBuild = true; measure(); core.draw(); },
    },
  };
  return handle;
}

export default mountRealm;
