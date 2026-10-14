// Scene evaluator: direction.json → the numeric state of the frame model at
// any time t. It is the single implementation of direction semantics, shared
// by the engine runtime (engine/runtime/direction-runtime.js adds the GL
// handles: mesh builder, face drawer, text textures) and by the composer's
// own dry runs (curves, G-DIR, G-COST) in Node.
//
// State shape is v2's contract (docs/design/map-v2-code.md §3), field for field
// and in the same key order; every formula mirrors videos/my-brain-at-2am-v2.js
// so a direction re-expressing v2 evaluates to the same doubles (G-STATE).
//
// Circular timeline: the composition lives on [−P, D − P); wall time t ≥ D − P
// is evaluated at t − D (meta.P = 0 leaves t untouched, as v2).

import { SoftBody } from '../engine/softbody.js';
import { clamp, smoothstep } from '../engine/motion.js';
import { channelTable, BODY_DOFS } from './channels.js';
import { makePalette } from './palette.js';
import { controllerOf } from './controllers/index.js';
import { wrapTime } from './circular.js';

const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** The renderer's water-loop fallback: world.loop is emitted only when D differs (v2 omits it). */
export const RENDERER_LOOP_DEFAULT = 15;

const memo = new WeakMap();

/**
 * Build the evaluator. env: { faceSpec, silhouette } as measured from the
 * assets (default: the values recorded in the direction). Without env the
 * scene is memoised per direction object, so G-DIR and G-COST share one.
 */
export function createScene(direction, env = null) {
  if (env) return buildScene(direction, env);
  if (!memo.has(direction)) memo.set(direction, buildScene(direction, {}));
  return memo.get(direction);
}

function buildScene(direction, env) {
  const { meta, mallow, realm } = direction;
  const sil = env.silhouette || mallow.silhouette;
  const faceSpec = env.faceSpec || mallow.faceSpec;
  const pl = mallow.placement;
  const xf = { x: pl.baseX, y: pl.baseY, s: pl.scale };
  const ch = channelTable(direction.channels);
  const fn = (name) => ch.get(name);
  const D = meta.duration, P = meta.P || 0;
  const W = realm.world, post = realm.post;

  // ---- body: each DOF is the sum of its layers, in v2's operand order
  const layer = (ref) => {
    const [name, part] = ref.split('#');
    const f = fn(name);
    if (part === 'amp') return (t) => f(t)[0];
    if (part === 'phase') return (t) => f(t)[1];
    return f;
  };
  const dofLayers = BODY_DOFS.map((dof) => (direction.body[dof] || []).map(layer));
  const dofAt = (t) => {
    const o = {};
    for (let j = 0; j < BODY_DOFS.length; j++) {
      const ls = dofLayers[j];
      let v = ls.length ? ls[0](t) : 0;
      for (let i = 1; i < ls.length; i++) v = v + ls[i](t);
      o[BODY_DOFS[j]] = v;
    }
    return o;
  };
  const liftLayers = dofLayers[BODY_DOFS.indexOf('lift')];
  const liftAt = (t) => { let v = liftLayers.length ? liftLayers[0](t) : 0; for (let i = 1; i < liftLayers.length; i++) v = v + liftLayers[i](t); return v; };

  // ---- face: the parameters handed to Face.draw, in direction order
  const faceFns = direction.face.map(([param, name]) => [param, fn(name)]);
  const faceAt = (t) => { const o = {}; for (const [p, f] of faceFns) o[p] = f(t); return o; };
  const faceOne = (param) => { const e = faceFns.find(([p]) => p === param); return e ? e[1] : () => 0; };
  const fEyeOpen = faceOne('eyeOpen'), fBlink = faceOne('blink'), fLookX = faceOne('lookX'), fLookY = faceOne('lookY'), fMouthOpen = faceOne('mouthOpen');

  // ---- world, camera, light
  const palette = makePalette(realm.palette, realm.jitter);
  const tension = fn('world.tension'), warmth = fn('world.warmth'), agitation = fn('world.agitation');
  const ripples = ch.has('world.ripples') ? fn('world.ripples')(0) : [];
  const camX = fn('cam.x'), camY = fn('cam.y'), camZoom = fn('cam.zoom'), follow = fn('cam.follow');
  const rest = fn('env.rest');
  const glowPulse = fn('mallow.glowPulse');
  const camAt = (t) => {
    const lift = liftAt(t) * pl.scale;
    return { x: camX(t), y: camY(t) - lift * follow(t), zoom: camZoom(t), roll: 0 };
  };
  const skyCamFor = (cam) => {
    const k = W.skyParallax, cx = W.skyCentreX, h = W.horizonY;
    const z = 1 + (cam.zoom - 1) * k;
    return [cx + (cam.x - cx) * k, h - (h - cam.y) * cam.zoom / z, z];
  };

  // ---- props
  const props = (direction.props || []).map((p) => ({ def: p, ctl: controllerOf(p).create(p, fn) }));
  const audioProp = props.find((p) => p.def.audio);
  const phaseOf = audioProp ? fn(audioProp.def.channels.phase) : null;

  const body = new SoftBody({ w: mallow.artSize[0], h: mallow.artSize[1] }, sil, { lag: mallow.body.lag, cols: mallow.body.cols, rows: mallow.body.rows });

  function glassOf(t, cold) {
    const back = [], front = [];
    for (const { def, ctl } of props) {
      const g = def.style.glass;
      for (let i = 0; i < ctl.count; i++) {
        const b = ctl.at(i, t);
        if (!b || b.alpha < g.minAlpha) continue;
        const L = def.items[i].layout;
        const item = {
          x: b.x, y: b.y, hw: L.hw, hh: L.hh, scale: b.scale, squash: b.squash, rot: 0, radius: Math.min(L.hh, g.radiusMax),
          alpha: b.alpha, textAlpha: b.textAlpha, glowUp: b.glowUp, textTex: def.items[i].tex, tint: mix3(g.tint[0], g.tint[1], cold), edge: g.edge, stress: b.stress,
        };
        (b.depth < 0 ? back : front).push(item);
      }
    }
    return { back, front };
  }

  function particlesOf(t) {
    const out = [];
    for (const { def, ctl } of props) {
      const M = def.motes;
      if (!M) continue;
      for (let i = 0; i < ctl.count; i++) {
        const td = def.items[i].dissolve;
        const age0 = t - td;
        if (age0 <= 0) continue;
        const b = ctl.at(i, td);
        const L = def.items[i].layout;
        const dir = [b.x - M.away[0], b.y - M.away[1]]; const dl = Math.hypot(...dir); dir[0] /= dl; dir[1] /= dl;
        for (const m of M.list[i]) {
          const age = age0 - Math.abs(m.u) * M.stagger;
          if (age <= 0 || age > m.life) continue;
          const k = M.drag, drag = (1 - Math.exp(-k * age)) / k;
          const x = b.x + m.u * L.hw * M.spread[0] * b.scale + dir[0] * m.push * drag + Math.sin(age * m.sw * M.sway.freq + m.ph) * M.sway.amp;
          const y = b.y + m.v * L.hh * M.spread[1] * b.scale + dir[1] * m.push * drag - m.up * age;
          const a = smoothstep(0, M.fadeIn, age) * (1 - smoothstep(m.life * M.fadeOutFrom, m.life, age)) * (M.flicker.base + M.flicker.amp * Math.sin(age * M.flicker.freq + m.ph));
          out.push({ x, y, r: m.size, a: a * M.alpha, c: mix3(M.colors[0], M.colors[1], clamp(age / m.life)) });
        }
      }
    }
    return out;
  }

  function audioOf(t, cold, warm, d0) {
    const a = { warm, cold, agitation: agitation(t), inflate: d0.inflate, lift: d0.lift, squash: d0.squash };
    if (audioProp) {
      a.spin = (phaseOf(t + 0.01) - phaseOf(t - 0.01)) / 0.02;
      const pan = direction.audio.pan;
      for (let i = 0; i < audioProp.ctl.count; i++) {
        const b = audioProp.ctl.at(i, t);
        a[`bx${i}`] = b ? +((b.x - pan.centre) / pan.curveNorm).toFixed(3) : 0;
        a[`bf${i}`] = b ? +((b.depth + 1) / 2).toFixed(3) : 0;
        a[`ba${i}`] = b ? +b.alpha.toFixed(3) : 0;
      }
    }
    return a;
  }

  /** The numeric state at wall time t (no GL handles). */
  function state(tWall) {
    const t = wrapTime(tWall, D, P);
    const cold = tension(t), warm = warmth(t);
    const Pal = palette(cold, warm);
    const cam = camAt(t);
    const d0 = dofAt(t);
    const liftW = d0.lift * pl.scale;
    const rp = [];
    for (const [t0, amp] of ripples) if (t > t0 && t - t0 < W.rippleLife) rp.push({ x: pl.baseX, y: pl.baseY, age: t - t0, amp });
    const { back, front } = glassOf(t, cold);
    const n = Pal.n;
    const world = {
      zenith: Pal.zenith, high: Pal.high, horizon: Pal.horizon, haze: Pal.haze,
      moon: W.moon, moonCol: Pal.moonCol, moonGlow: n.moonGlow, haloCol: Pal.haloCol,
      stars: n.stars, clouds: n.clouds, cloudLit: Pal.cloudLit, cloudDark: Pal.cloudDark, hillCol: Pal.hillCol,
      horizonY: W.horizonY, waterNear: Pal.waterNear, waterFar: Pal.waterFar, fresnel: W.fresnel, agitation: agitation(t),
      reflAmt: W.reflAmt, contactY: pl.baseY, contact: [pl.baseX, sil.halfW * pl.scale * (1 + W.contactSpread * Math.max(0, d0.squash))],
      shadow: W.shadow * Math.exp(-liftW / W.shadowFall), ripples: rp, skyCam: skyCamFor(cam),
    };
    if (D !== RENDERER_LOOP_DEFAULT) world.loop = D;
    return {
      t: tWall, cam,
      mallow: {
        bodyBox: [sil.cx, sil.baseY, sil.halfW, sil.h], rest: rest(t),
        light: {
          dir: mallow.light.dir, key: Pal.key, rim: Pal.rim, rimAmt: n.rimAmt, spec: n.spec, specCol: Pal.specCol,
          glowCol: Pal.glowCol, glow: n.glow * glowPulse(t), ambient: Pal.ambient, sss: mallow.light.sss,
        },
      },
      world,
      bubblesBack: back, bubblesFront: front, particles: particlesOf(t),
      post: {
        exposure: n.exposure, bloom: post.bloom, bloomThresh: post.bloomThresh, contrast: post.contrast, sat: n.sat,
        shadowTint: Pal.shadowTint, highTint: Pal.highTint, vignette: post.vignette + post.vignetteTension * cold, grain: post.grain, time: tWall,
      },
      audio: audioOf(t, cold, warm, d0),
    };
  }

  /**
   * How far things travel on screen while the shutter is open at frame time t
   * (px): the body (4 silhouette points through the soft body), the face (eye
   * opening, gaze, mouth) and every prop. → { d, face }
   */
  const motionCache = new Map();
  function motion(tWall) {
    if (motionCache.has(tWall)) return motionCache.get(tWall);
    const m = motionAt(tWall);
    motionCache.set(tWall, m);
    return m;
  }
  function motionAt(tWall) {
    const t = wrapTime(tWall, D, P);
    const sh = meta.shutter / meta.fps / 2;
    const pts = [[sil.cx, sil.top], [sil.x0, sil.top + sil.h * 0.5], [sil.x1, sil.top + sil.h * 0.5], [sil.x0 + sil.w * 0.15, sil.baseY]];
    let d = 0;
    for (const [px, py] of pts) {
      const a = body.project(px, py, t - sh, dofAt, xf), b = body.project(px, py, t + sh, dofAt, xf);
      d = Math.max(d, Math.hypot(a.x - b.x, a.y - b.y));
    }
    const ta = t - sh, tb = t + sh;
    const r = faceSpec.eyes.L.r * pl.scale;
    const face = Math.max(Math.abs((fEyeOpen(ta) * (1 - fBlink(ta))) - (fEyeOpen(tb) * (1 - fBlink(tb)))) * r * 1.8,
      Math.hypot(fLookX(ta) - fLookX(tb), fLookY(ta) - fLookY(tb)) * r * 0.5, Math.abs(fMouthOpen(ta) - fMouthOpen(tb)) * r * 1.5);
    d = Math.max(d, face);
    for (const { def, ctl } of props) {
      for (let i = 0; i < ctl.count; i++) {
        const a = ctl.at(i, t - sh), b = ctl.at(i, t + sh);
        if (a && b) d = Math.max(d, Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(a.scale - b.scale) * def.items[i].layout.hw);
      }
    }
    return { d, face };
  }

  /**
   * Sub-frames for frame time t (v2's adaptive motion blur): enough samples
   * that nothing moves more than meta.subframePx px between them, within
   * [meta.subframes, meta.subframeMax].
   */
  function subframes(tWall) {
    return Math.max(meta.subframes, Math.min(meta.subframeMax, Math.ceil(motion(tWall).d / meta.subframePx)));
  }

  return {
    direction, body, xf, sil, faceSpec,
    channel: fn,
    dofAt: (t) => dofAt(wrapTime(t, D, P)),
    faceAt: (t) => faceAt(wrapTime(t, D, P)),
    camAt: (t) => camAt(wrapTime(t, D, P)),
    /** Raw composition-time evaluators (no wrap), for builders that work on [−P, D − P). */
    raw: { dofAt, faceAt, camAt },
    props: props.map((p) => ({ id: p.def.id, count: p.ctl.count, at: p.ctl.at })),
    palette,
    state,
    motion,
    subframes,
  };
}
