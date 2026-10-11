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
const MOOD_TAU = 1.4;      // s — time constant for mood easing (≈4 s to settle)
const TRANSFORM_TAU = 1.7; // s
const FOCUS_TAU = 0.9;     // s
const MARGIN = 26;         // px bleed around layers for parallax

/**
 * Mount a realm into `container` (a positioned element). Returns a handle.
 * opts: { emotion, intensity, mood, transform, reducedMotion, lowStimulation,
 *         groundY = 0.86, quality: 'auto' | 'low' | 'high' }
 */
export function mountRealm(container, realmId, opts = {}) {
  if (realmId && typeof realmId === 'object') realmId = realmId.id;
  let id = realmId;
  if (!FACTORIES[id]) {
    const viaMallow = realmForMallow(id);
    id = viaMallow ? viaMallow.id : 'moonmilk-cove';
    if (!viaMallow) console.warn(`[hushfold] unknown realm "${realmId}", using ${id}`);
  }
  const def = REALMS[id];

  const canvas = document.createElement('canvas');
  canvas.className = 'hushfold-realm';
  canvas.dataset.realm = id;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
  container.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });

  const prefersReduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startMood = opts.mood ? { ...NEUTRAL_MOOD, ...opts.mood } : moodForEmotion(opts.emotion || 'neutral', opts.intensity ?? 0.6);

  // Shared state the realm reads every frame.
  const st = {
    id, def, W: 0, H: 0, dpr: 1, M: MARGIN,
    groundY: clamp(opts.groundY ?? 0.86, 0.5, 0.98),
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
  let fx = 0, fy = 0;
  let drift = Math.random() * 100;

  const realm = FACTORIES[id]({ st, ctx, canvas, def });

  let raf = 0, last = 0, destroyed = false, inView = true, needBuild = true;
  let dprDowngraded = false, slowFrames = 0, sampleFrames = 0;
  const pulseTimes = [];

  function computeDpr(W, H) {
    const dev = (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) ? devicePixelRatio : 1;
    if (st.quality === 'low') return 1;
    let d = Math.min(dev, 1.5);
    if (st.quality === 'auto') {
      const area = W * H;
      const cores = navigator.hardwareConcurrency || 4;
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

  function measure() {
    const W = Math.max(1, Math.round(container.clientWidth || canvas.clientWidth || 390));
    const H = Math.max(1, Math.round(container.clientHeight || canvas.clientHeight || 844));
    const dpr = computeDpr(W, H);
    if (W !== st.W || H !== st.H || dpr !== st.dpr || needBuild) {
      st.W = W; st.H = H; st.dpr = dpr;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      realm.build(st);
      needBuild = false;
      return true;
    }
    return false;
  }

  function step(dtMs) {
    const rdt = Math.min(dtMs, 50) / 1000;
    st.rdt = rdt;
    st.now += rdt;
    st.dt = rdt * st.motion;
    st.t += st.dt;
    const km = 1 - Math.exp(-rdt / MOOD_TAU);
    const kp = 1 - Math.exp(-rdt / TRANSFORM_TAU);
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

  function draw() {
    if (!st.W) return;
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

  function tick(now) {
    raf = 0;
    if (destroyed || !shouldRun()) return;
    raf = requestAnimationFrame(tick);
    const dtMs = last ? now - last : 16.7;
    last = now;
    if (needBuild) measure();
    step(dtMs);
    draw();
    // adaptive resolution: sustained slow frames on 'auto' → drop to 1×
    if (st.quality === 'auto' && !dprDowngraded && st.dpr > 1) {
      sampleFrames++;
      if (dtMs > 26) slowFrames++;
      if (sampleFrames >= 120) {
        if (slowFrames > 70) { dprDowngraded = true; needBuild = true; }
        sampleFrames = 0; slowFrames = 0;
      }
    }
  }

  function shouldRun() { return !destroyed && inView && !(typeof document !== 'undefined' && document.hidden); }
  function start() { if (!raf && shouldRun()) { last = 0; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  let ro = null, io = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => { needBuild = true; if (!raf) { measure(); draw(); } });
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
  step(16);
  draw();
  start();

  const handle = {
    canvas,
    id,
    realm: def,
    setEmotion(presetId, intensity = 0.6) {
      target.mood = moodForEmotion(presetId, intensity);
      return handle;
    },
    setMood(m = {}) {
      for (const k of Object.keys(NEUTRAL_MOOD)) if (typeof m[k] === 'number' && isFinite(m[k])) target.mood[k] = clamp(m[k]);
      return handle;
    },
    getMood() { return { ...target.mood }; },
    transform(p) {
      if (typeof p === 'number' && isFinite(p)) target.p = clamp(p);
      return handle;
    },
    pulse(kind = 'tap', pos = {}) {
      if (!PULSE_KINDS.has(kind)) kind = 'tap';
      let x, y;
      if (pos && typeof pos.nx === 'number') { x = pos.nx * st.W; y = pos.ny * st.H; }
      else if (pos && typeof pos.x === 'number') {
        const r = canvas.getBoundingClientRect();
        const sx = r.width ? st.W / r.width : 1, sy = r.height ? st.H / r.height : 1;
        x = (pos.x - r.left) * sx; y = (pos.y - r.top) * sy;
      } else { x = st.W * 0.5; y = st.H * (st.groundY - 0.17); }
      // photosensitivity: at most 3 bright events per second; extras become gentle taps
      const nowMs = performance.now();
      while (pulseTimes.length && nowMs - pulseTimes[0] > 1000) pulseTimes.shift();
      let gentle = false;
      if (pulseTimes.length >= 3) gentle = true; else pulseTimes.push(nowMs);
      if (gentle && kind !== 'tap' && kind !== 'ripple') kind = 'tap';
      if (st.reduced && kind === 'strike') kind = 'strike'; // realm renders a soft glow instead
      realm.pulse(kind, x, y, st, gentle);
      return handle;
    },
    setFocus(nx = 0, ny = 0) {
      target.fx = clamp(nx, -1, 1); target.fy = clamp(ny, -1, 1);
      return handle;
    },
    setReducedMotion(on) { st.reduced = !!on; applyDensity(); return handle; },
    setLowStimulation(on) { st.low = !!on; applyDensity(); realm.build(st); return handle; },
    setQuality(q) { st.quality = q; applyDensity(); needBuild = true; if (!raf) { measure(); draw(); } return handle; },
    destroy() {
      destroyed = true;
      stop();
      document.removeEventListener('visibilitychange', onVis);
      ro?.disconnect(); io?.disconnect();
      realm.destroy?.();
      canvas.remove();
    },
    /** Test hooks (gallery / QA). Not part of the product API. */
    debug: {
      state: st,
      settle() { Object.assign(st.raw, target.mood); st.p = target.p; fx = target.fx; fy = target.fy; step(0); },
      frame(dtMs = 16.7) { if (needBuild) measure(); step(dtMs); draw(); },
      rebuild() { needBuild = true; measure(); draw(); },
    },
  };
  return handle;
}

export default mountRealm;
