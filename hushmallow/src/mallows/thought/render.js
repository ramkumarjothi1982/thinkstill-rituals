// Drawing Thought and Belief Mallows on a 2D canvas.
//
// Vector, not textures: the body is the soft body's own deformed outline
// (a superellipse sampled through the lattice), filled with translucent jelly
// gradients; the inner light, motes, speculars and the face sit on sample
// points of the same lattice, so everything squashes, stretches and trails
// with the jelly — crisp at any pixel ratio, no texture uploads, and the
// hero Mallow's WebGL context stays its own. Every gradient is made once per
// palette in unit space and placed with a transform (cached; nothing big is
// allocated per frame). No shadowBlur, no filters. The person's words are
// never drawn here (they ride on a DOM tag: layer.js).
//
// The caller's transform maps CSS px → device px; positions are canvas CSS px
// (the layer subtracts the canvas's client offset: o.ox, o.oy).
// o.q is the layer's quality level (0 full … 2 under load): siblings and far
// bodies drop their motes and fresnel first, then their depth shading.

import { tintAt, rgba, mixHex, clamp, lerp, smooth } from './styles.js';
import { PT, OUTLINE_N, FX_GEOM, rnd } from './thought.js';

const TAU = Math.PI * 2;
const caches = new WeakMap();       // ctx → { palettes, shared }
const SIDES = [-1, 1];
const CHEEKS = [PT.cheekL, PT.cheekR];
// cloud lobes: [dx (× W), dy (× P), rx (× W), ry (× P)] — a flat base and three soft bumps on top
const CLOUD = [[-0.27, 0.05, 0.25, 0.12], [0.02, 0.05, 0.46, 0.13], [0.28, 0.05, 0.22, 0.11], [-0.18, -0.04, 0.2, 0.15], [0.05, -0.09, 0.24, 0.18], [0.27, -0.02, 0.17, 0.13]];

function cacheFor(ctx) {
  let c = caches.get(ctx);
  if (!c) { c = { pal: new Map(), shared: null }; caches.set(ctx, c); }
  return c;
}

// unit-space radial gradient: stops [[t, css], …], centre (cx, cy), radii r0 → r1
function radial(ctx, cx, cy, r0, r1, stops, ox = cx, oy = cy) {
  const g = ctx.createRadialGradient(ox, oy, r0, cx, cy, r1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

function sharedGrads(ctx) {
  const C = cacheFor(ctx);
  if (C.shared) return C.shared;
  C.shared = {
    spec: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(255,255,255,0.95)'], [0.45, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]),
    blush: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(255,104,150,0.85)'], [0.6, 'rgba(255,120,160,0.35)'], [1, 'rgba(255,130,170,0)']]),
    blushCalm: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(255,170,140,0.75)'], [1, 'rgba(255,180,150,0)']]),
    dent: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(10,4,30,0.22)'], [0.5, 'rgba(10,4,30,0.08)'], [0.78, 'rgba(255,250,240,0.16)'], [1, 'rgba(255,250,240,0)']]),
    // steam: a soft, lit puff with a denser core (reads as steam, not fog, at 0.14–0.35 P)
    puff: radial(ctx, -0.2, -0.25, 0, 1, [[0, 'rgba(255,252,248,0.92)'], [0.4, 'rgba(250,244,238,0.62)'], [0.75, 'rgba(236,228,224,0.22)'], [1, 'rgba(230,222,220,0)']], -0.25, -0.3),
    // a rain cloud: lit from above (the focal point high), cooler and greyer underneath
    cloud: radial(ctx, 0, -0.35, 0.05, 1, [[0, 'rgba(236,242,255,0.96)'], [0.45, 'rgba(196,208,236,0.9)'], [0.82, 'rgba(150,166,206,0.72)'], [1, 'rgba(140,156,200,0)']], 0, -0.62),
    cloudBase: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(96,110,160,0.55)'], [0.7, 'rgba(110,124,170,0.25)'], [1, 'rgba(110,124,170,0)']]),
    splash: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(226,238,255,0.95)'], [1, 'rgba(206,224,255,0)']]),
    stone: radial(ctx, -0.35, -0.4, 0.05, 1.1, [[0, '#b9b4cc'], [0.4, '#7b7593'], [1, '#3f3a55']], -0.35, -0.4),
    stoneLight: radial(ctx, -0.35, -0.4, 0.05, 1.1, [[0, '#f1eef8'], [0.45, '#cfcadf'], [1, '#9d97b5']], -0.35, -0.4),
    shell: radial(ctx, 0.45, -0.1, 0.05, 1.05, [[0, '#fff2ea'], [0.45, '#f6b7a6'], [1, '#c26d68']], 0.3, -0.3),
    charm: radial(ctx, -0.2, -0.3, 0.02, 1, [[0, '#fffef4'], [0.45, '#ffe08a'], [1, '#e19b2c']], -0.2, -0.3),
    charmGlow: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(255,226,150,0.6)'], [0.35, 'rgba(255,214,130,0.22)'], [1, 'rgba(255,210,120,0)']]),
    shadow: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(12,6,34,0.32)'], [1, 'rgba(12,6,34,0)']]),
    heat: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(255,160,120,0.42)'], [0.5, 'rgba(255,140,110,0.24)'], [0.75, 'rgba(255,120,100,0.08)'], [1, 'rgba(255,110,100,0)']]),
    gloss: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(255,255,255,1)'], [0.7, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]),
  };
  return C.shared;
}

// palettes are quantised (calm transform in 16 steps, softening in 6) and cached per context
function paletteFor(ctx, th, look) {
  const kq = Math.round(clamp(look.tintK) * 16), sq = Math.round(clamp(look.soft) * 6), qk = kq * 8 + sq;
  // the last palette this thought used (no lookup and no key string on most frames)
  if (th._palQ === qk && th._palCtx === ctx && th._pal) return th._pal;
  const C = cacheFor(ctx);
  const key = `${th.style.id}|${kq}|${sq}`;
  let p = C.pal.get(key);
  if (p) { th._pal = p; th._palQ = qk; th._palCtx = ctx; return p; }
  const t = tintAt(th.style.tint, sq / 6, kq / 16, {});
  const a = th.alpha ?? 0.76;
  p = {
    ...t,
    body: radial(ctx, 0, 0, 0.04, 1.18, [[0, rgba(t.light, 0.96)], [0.38, rgba(mixHex(t.light, t.mid, 0.55), a)], [0.8, rgba(t.mid, a)], [1, rgba(mixHex(t.mid, t.deep, 0.6), a)]], -0.3, -0.42),
    core: radial(ctx, 0, 0, 0, 1, [[0, rgba(t.glow, 0.62)], [0.5, rgba(t.glow, 0.22)], [1, rgba(t.glow, 0)]]),
    // pale, so it reads as light over any dark world (a separate canvas cannot add light to the page)
    halo: radial(ctx, 0, 0, 0, 1, [[0, rgba(mixHex(t.glow, '#ffffff', 0.55), 0.5)], [0.45, rgba(mixHex(t.glow, '#ffffff', 0.5), 0.3)], [0.72, rgba(mixHex(t.glow, '#ffffff', 0.45), 0.1)], [1, rgba(t.glow, 0)]]),
    mote: radial(ctx, 0, 0, 0, 1, [[0, 'rgba(255,255,255,0.95)'], [0.3, rgba(t.glow, 0.65)], [1, rgba(t.glow, 0)]]),
    rim: (() => { const g = ctx.createLinearGradient(-1, -1, 1, 1); g.addColorStop(0, 'rgba(255,255,255,0.92)'); g.addColorStop(0.45, rgba(t.light, 0.62)); g.addColorStop(1, rgba(mixHex(t.light, t.glow, 0.5), 0.75)); return g; })(),
    inkA: rgba(t.ink, 0.92), inkB: rgba(t.ink, 0.78),
    lightA: rgba(t.light, 0.32), lightA2: rgba(t.light, 0.6), deepA: rgba(t.deep, 0.5),
    depth: radial(ctx, 0, 0, 0, 1, [[0, rgba(t.deep, 0.42)], [0.6, rgba(t.deep, 0.16)], [1, rgba(t.deep, 0)]]),
    fresnel: radial(ctx, 0, 0, 0, 1.04, [[0, rgba(t.light, 0)], [0.6, rgba(t.light, 0)], [0.82, rgba(t.light, 0.12)], [0.94, rgba(t.light, 0.3)], [1, rgba(t.light, 0.5)]]),
  };
  if (C.pal.size > 160) C.pal.delete(C.pal.keys().next().value);
  C.pal.set(key, p);
  th._pal = p; th._palQ = qk; th._palCtx = ctx;
  return p;
}

// a unit-space fill placed at (x, y), radii (rx, ry), rotation a
function blob(ctx, fill, x, y, rx, ry, a = 0, alpha = 1) {
  if (!(alpha > 0.003) || !(rx > 0.1) || !(ry > 0.1)) return;
  ctx.save();
  ctx.translate(x, y); if (a) ctx.rotate(a); ctx.scale(rx, ry);
  ctx.globalAlpha *= clamp(alpha);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
  ctx.restore();
}

// the smooth closed outline (quadratic curves through the midpoints)
function outlinePath(ctx, O, ox, oy) {
  const n = O.length / 2;
  ctx.beginPath();
  let mx = (O[2 * (n - 1)] + O[0]) / 2 - ox, my = (O[2 * (n - 1) + 1] + O[1]) / 2 - oy;
  ctx.moveTo(mx, my);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x = O[2 * i] - ox, y = O[2 * i + 1] - oy;
    mx = (x + O[2 * j] - ox) / 2; my = (y + O[2 * j + 1] - oy) / 2;
    ctx.quadraticCurveTo(x, y, mx, my);
  }
  ctx.closePath();
}

// a stroke along outline points i0..i1 (wrapping), smoothed
function rimArc(ctx, O, i0, i1, ox, oy, colour, width) {
  const n = O.length / 2;
  ctx.save();
  ctx.beginPath();
  for (let k = i0; k <= i1; k++) {
    const i = k % n, x = O[2 * i] - ox, y = O[2 * i + 1] - oy;
    if (k === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Draw a list of thoughts (far first). o: { ox, oy (canvas client offset), rm, low, t, fingers? } */
export function drawThoughts(ctx, list, o = {}) {
  for (const th of list) drawThought(ctx, th, o);
}

export function drawThought(ctx, th, o = {}) {
  const R = th.render;
  if (!R.ready || R.P < 2) return;
  const look = th.look, f = look.face, ox = o.ox || 0, oy = o.oy || 0, t = th.clock, rm = !!o.rm, low = !!o.low;
  const S = sharedGrads(ctx), pal = paletteFor(ctx, th, look);
  const P = R.P, W = R.W, cx = R.cx - ox, cy = R.cy - oy, ang = R.ang;
  const Q = R.pts;
  // under load, siblings and far bodies keep their shape and face but lose the finest light
  const q = o.q || 0, lite = q > 0 && (th.kind === 'sibling' || th.z > 0.5), liter = q > 1 && lite;
  ctx.save();
  ctx.globalAlpha = R.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // a warm halo once it is soothed / transformed
  const halo = look.fx.halo * (low ? 0.5 : 1);
  if (halo > 0.02) {
    const br = rm ? 1 : 1 + 0.04 * Math.sin(t * 1.1);
    blob(ctx, pal.halo, cx, cy, W * 0.98 * br, P * 0.96 * br, 0, halo * 0.85);
  }
  // anger / frustration: a low warm heat round the body (slow, never a flash)
  const heat = look.fx.heat * (low ? 0.5 : 1);
  if (heat > 0.02) blob(ctx, S.heat, cx, cy, W * 0.9, P * 0.88, 0, heat * (rm ? 0.55 : 0.5 + 0.1 * Math.sin(t * 2.2)));
  // props behind the body
  if (th.kind === 'belief') drawPropBack(ctx, th, o, S, pal);
  // a soft shadow of light beneath (it floats)
  blob(ctx, S.shadow, cx, cy + P * 0.56, W * 0.36, P * 0.07, 0, 0.5 * (1 - th.z));

  // the jelly
  outlinePath(ctx, R.outline, ox, oy);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(W / 2, P / 2);
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.restore();

  // inside the jelly: depth, a soft fresnel edge, the inner light, motes, dents, blush
  ctx.save();
  ctx.clip();
  // depth: the gel deepens away from the light (lower right)
  if (!liter) blob(ctx, pal.depth, cx + W * 0.2, cy + P * 0.26, W * 0.62, P * 0.56, ang, 0.55);
  // fresnel: the rim brightens smoothly toward the edge
  if (!lite) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(W / 2, P / 2);
    ctx.fillStyle = pal.fresnel;
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
  const glow = look.fx.glow * (low ? 0.7 : 1) * (rm ? 1 : 1 + 0.06 * Math.sin(t * 0.9 + th.seed));
  // the inner light, gathered low in the gel (light passing through it)
  blob(ctx, pal.core, Q[2 * PT.core] - ox, Q[2 * PT.core + 1] - oy + P * 0.06, W * 0.5, P * 0.42, ang, glow * 1.1);
  blob(ctx, pal.core, Q[2 * PT.bottom] - ox, Q[2 * PT.bottom + 1] - oy - P * 0.06, W * 0.36, P * 0.12, ang, glow * 0.8);
  if (!low && !lite) {
    const nm = Math.min(look.fx.motes, 7);
    for (let j = 0; j < nm; j++) {
      const i = PT.mote0 + j;
      const tw = rm ? 0.6 : 0.45 + 0.35 * Math.sin(t * (0.8 + 0.13 * j) + j * 2.1);
      blob(ctx, pal.mote, Q[2 * i] - ox, Q[2 * i + 1] - oy, P * 0.035, P * 0.035, 0, tw * (0.6 + 0.4 * look.relief));
    }
  }
  // a charm warms the side it hangs on
  if (th.kind === 'belief' && th.prop === 'charm') blob(ctx, S.charmGlow, th.propState.x - ox, th.propState.y - oy - P * 0.2, P * 0.7, P * 0.7, 0, 0.35 * th.propState.glow);
  ctx.globalCompositeOperation = 'source-over';
  // where a finger presses: a soft dent with a lit rim
  for (const fg of th.fingers.values()) {
    const p = th.reader.ptrs.get(fg.id);
    if (!p || fg.carry || p.depth < 0.04) continue;
    const r = P * 0.26 * (p.mode === 'glide' ? 0.75 : 1);
    blob(ctx, S.dent, fg.x - ox, fg.y - oy, r, r, 0, clamp(p.depth * (p.mode === 'glide' ? 0.5 : 1.1)));
  }
  // cheeks (puffed ones catch a little light)
  const sx = faceScaleX(th), sy = faceScaleY(th);
  const blush = clamp(f.blush * 0.42 + look.fx.halo * 0.05);
  if (blush > 0.01) for (const i of CHEEKS) blob(ctx, look.tintK > 0.5 ? S.blushCalm : S.blush, Q[2 * i] - ox, Q[2 * i + 1] - oy, W * 0.105 * sx, P * 0.06 * sy, ang, blush);
  const puff = clamp(f.puff + th.touch.depth * 0.8);
  if (puff > 0.2) for (const i of CHEEKS) blob(ctx, S.spec, Q[2 * i] - ox + (i === PT.cheekL ? -1 : 1) * W * 0.02, Q[2 * i + 1] - oy - P * 0.045, W * 0.05 * sx, P * 0.022 * sy, ang, 0.3 * puff);
  ctx.restore();

  // glassy rim and speculars
  outlinePath(ctx, R.outline, ox, oy);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(W / 2, P / 2);
  ctx.lineWidth = 2.6 / Math.max(10, P / 2);
  ctx.strokeStyle = pal.rim;
  ctx.globalAlpha *= 0.85;
  ctx.stroke();
  ctx.restore();
  // a crescent of light along the upper left rim, a fainter one low on the right
  rimArc(ctx, R.outline, 34, 42, ox, oy, 'rgba(255,255,255,0.75)', Math.max(1.2, P * 0.02));
  if (!liter) rimArc(ctx, R.outline, 12, 19, ox, oy, pal.lightA2, Math.max(1, P * 0.016));
  // gloss: one soft window reflection and a crisp glint
  const sax = Q[2 * PT.specA] - ox, say = Q[2 * PT.specA + 1] - oy;
  blob(ctx, S.spec, sax, say, W * 0.15, P * 0.07, ang - 0.6, 0.62);
  blob(ctx, S.gloss, sax - W * 0.012, say - P * 0.008, W * 0.075, P * 0.03, ang - 0.6, 0.9);
  blob(ctx, S.gloss, Q[2 * PT.specB] - ox, Q[2 * PT.specB + 1] - oy, W * 0.024, W * 0.024, 0, 0.95);

  drawFace(ctx, th, pal, ox, oy, sx, sy, o);
  drawFx(ctx, th, pal, S, o);
  if (th.kind === 'belief') drawPropFront(ctx, th, o, S, pal);
  ctx.restore();
}

// how the face stretches with the jelly (rest = 1)
function faceScaleX(th) {
  const Q = th.render.pts;
  const d = Math.hypot(Q[2 * PT.eyeR] - Q[2 * PT.eyeL], Q[2 * PT.eyeR + 1] - Q[2 * PT.eyeL + 1]);
  return clamp(d / Math.max(1, 0.29 * th.render.W), 0.6, 1.6);
}
function faceScaleY(th) {
  const Q = th.render.pts;
  const d = Math.hypot(Q[2 * PT.chin] - Q[2 * PT.forehead], Q[2 * PT.chin + 1] - Q[2 * PT.forehead + 1]);
  return clamp(d / Math.max(1, 0.47 * th.render.P), 0.6, 1.6);
}

const MOUTH_N = 10;
/**
 * The mouth this frame (pure geometry; drawFace draws it, tests read it).
 * Returns (into `out`): { open, x, y, orx, ory, rot } for an open mouth, or { open:false, pts }
 * for a line mouth: MOUTH_N + 1 points (client px − o) from one corner to the other. A smile's
 * middle sits lower (larger y) than its corners.
 */
export function mouthGeom(th, ox = 0, oy = 0, rm = false, out = { open: false, x: 0, y: 0, orx: 0, ory: 0, rot: 0, pts: new Float32Array(2 * (MOUTH_N + 1)) }) {
  const look = th.look, f = look.face, ov = th.ov, R = th.render, P = R.P, Q = R.pts, t = th.clock;
  const squint = clamp(ov.squint * 0.7 + th.touch.depth * 0.75);
  const mcX = Q[2 * PT.mouthC] - ox, mcY = Q[2 * PT.mouthC + 1] - oy;
  let ax = Q[2 * PT.mouthR] - Q[2 * PT.mouthL], ay = Q[2 * PT.mouthR + 1] - Q[2 * PT.mouthL + 1];
  const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
  const skew = f.skew * 0.28;
  const cs = Math.cos(skew), sn = Math.sin(skew);
  const dxu = ax * cs - ay * sn, dyu = ax * sn + ay * cs;     // along the mouth
  const nx = -dyu, ny = dxu;                                   // down, across it
  const hw = (al / 2) * (f.mouthW / 0.85) * 1.15 * (1 - 0.3 * clamp(f.puff - 0.4)) * (1 - 0.25 * squint);
  const mx = mcX + dxu * f.skew * hw * 0.35, my = mcY;
  const sib = th.kind === 'sibling';
  const talk = sib ? th.talk : 0;
  const mOpen = clamp(Math.max(f.open, talk) + ov.gasp * 0.35 + ov.giggle * 0.25);
  out.open = mOpen > 0.06;
  if (out.open) {
    // a sibling mid-syllable opens wide (up to 0.2 P tall): you can see them talking over one another
    out.orx = sib ? Math.max(P * 0.075, hw * (0.5 + 0.2 * f.mouthW)) * (0.8 + 0.25 * mOpen) : hw * (0.62 + 0.25 * f.mouthW);
    out.ory = P * (sib ? 0.1 : 0.085) * mOpen;
    out.x = mx; out.y = my + out.ory * 0.35 - f.curve * P * 0.01; out.rot = Math.atan2(dyu, dxu);
    return out;
  }
  const curve = f.curve * P * 0.075 + ov.giggle * P * 0.03;
  const wave = f.wave * P * 0.02 * (rm ? 1 : 0.85 + 0.15 * Math.sin(t * 9));
  const pts = out.pts;
  for (let k = 0; k <= MOUTH_N; k++) {
    const u = k / MOUTH_N * 2 - 1;                     // −1 … 1 along the mouth
    const sag = curve * (1 - u * u) - curve * 0.25;
    const wv = wave * Math.sin((u + 1) * Math.PI * 1.5 + (rm ? 0 : t * 4));
    pts[2 * k] = mx + dxu * u * hw + nx * (sag + wv); pts[2 * k + 1] = my + dyu * u * hw + ny * (sag + wv);
  }
  return out;
}

function drawFace(ctx, th, pal, ox, oy, sx, sy, o) {
  const look = th.look, f = look.face, ov = th.ov, R = th.render, P = R.P, W = R.W, rm = !!o.rm, Q = R.pts;
  const ang = R.ang, co = Math.cos(ang), si = Math.sin(ang);
  const g = th.gaze;
  // eyes: open beans; as they close the lid comes down (the bean narrows to a slit at full ink,
  // never a faded ghost) and becomes a soft closed curve (◡): relieved, content
  const squint = clamp(ov.squint * 0.7 + th.touch.depth * 0.75);
  const sigh = ov.sigh;
  const open = clamp(f.eyeOpen * (1 - ov.blink) * (1 - 0.6 * squint) * (1 - 0.5 * sigh) + 0.25 * ov.gasp, 0, 1.3);
  const shut = smooth(0.35, 0.8, Math.max(f.closed, sigh * 0.9));
  const rx = W * 0.072 * sx, ry0 = P * 0.1 * sy;
  const lookX = g.x * W * 0.032 * (1 - shut), lookY = g.y * P * 0.026 * (1 - shut);
  ctx.fillStyle = pal.inkA;
  ctx.strokeStyle = pal.inkA;
  for (const side of SIDES) {
    const i = side < 0 ? PT.eyeL : PT.eyeR;
    const ex0 = Q[2 * i] - ox + lookX, ey0 = Q[2 * i + 1] - oy + lookY;
    const ryO = Math.max(0.6, ry0 * open);
    const ry = ryO * (1 - shut);
    // the bean sinks toward its lower lid as it closes (where the closed curve sits)
    const ex = ex0, ey = ey0 + ryO * shut * 0.3;
    if (ry > 0.45) {
      ctx.save();
      // a heavy lid cuts the top of the bean (angled: inner corner low = cross, high = worried)
      const lid = clamp(f.lid + 0.35 * squint * 0.5);
      const tilt = f.lidTilt * 0.55 * (side < 0 ? 1 : -1) * (1 - shut);
      if (lid > 0.04) {
        const yl = ey - ry + 2 * ry * lid;
        ctx.beginPath();
        ctx.moveTo(ex - rx * 2, yl - tilt * rx * 2); ctx.lineTo(ex + rx * 2, yl + tilt * rx * 2);
        ctx.lineTo(ex + rx * 2, ey + ry * 3); ctx.lineTo(ex - rx * 2, ey + ry * 3); ctx.closePath();
        ctx.clip();
      }
      ctx.beginPath(); ctx.ellipse(ex, ey, rx * (1 + 0.08 * shut), ry, ang, 0, TAU); ctx.fill();
      // catchlights (only while the eye is properly open)
      if (open > 0.25 && ry > ry0 * 0.42) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.arc(ex - rx * 0.34, ey - ry * 0.4, rx * 0.34, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(ex + rx * 0.3, ey + ry * 0.38, rx * 0.15, 0, TAU); ctx.fill();
        ctx.fillStyle = pal.inkA;
      }
      ctx.restore();
      if (f.lid > 0.06 && shut < 0.6) {
        // the lid's edge
        const yl = ey - ry + 2 * ry * clamp(f.lid);
        ctx.save(); ctx.globalAlpha *= 0.85 * (1 - shut / 0.6); ctx.lineWidth = Math.max(1, P * 0.02);
        ctx.beginPath(); ctx.moveTo(ex - rx * 1.15, yl - tilt * rx * 1.15); ctx.lineTo(ex + rx * 1.15, yl + tilt * rx * 1.15); ctx.stroke();
        ctx.restore();
      }
    }
    if (shut > 0.5) {
      // content: a soft closed curve (◡), drawn in as the slit closes (it thickens, it does not fade in)
      const k = smooth(0.5, 0.92, shut);
      ctx.save(); ctx.lineWidth = Math.max(0.6, Math.max(1.2, P * 0.03) * k);
      ctx.beginPath(); ctx.ellipse(ex0, ey0 - ry0 * 0.25, rx * 1.1, ry0 * 0.55, ang, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
      ctx.restore();
    }
  }
  // brows (only when it is tense)
  const browA = clamp(f.browA * (1 - shut * 0.8));
  if (browA > 0.03) {
    ctx.save(); ctx.globalAlpha *= browA * 0.9; ctx.lineWidth = Math.max(1.2, P * 0.03);
    for (const side of SIDES) {
      const i = side < 0 ? PT.eyeL : PT.eyeR;
      const d = ry0 * 1.55 + f.browY * P * 0.05, ux = si * d, uy = -co * d;
      const bx = Q[2 * i] - ox + ux, by = Q[2 * i + 1] - oy + uy;
      const a = f.browTilt * 0.42 * (side < 0 ? 1 : -1) + ang, hl = W * 0.075 * sx;
      const dx = Math.cos(a) * hl, dy = Math.sin(a) * hl;
      ctx.beginPath(); ctx.moveTo(bx - dx, by - dy); ctx.quadraticCurveTo(bx, by - P * 0.012, bx + dx, by + dy); ctx.stroke();
    }
    ctx.restore();
  }
  // mouth
  const mg = mouthGeom(th, ox, oy, rm, th._mouth || (th._mouth = { open: false, x: 0, y: 0, orx: 0, ory: 0, rot: 0, pts: new Float32Array(2 * (MOUTH_N + 1)) }));
  ctx.lineWidth = Math.max(1.2, P * 0.028);
  if (mg.open) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(mg.x, mg.y, mg.orx, mg.ory, mg.rot, 0, TAU);
    ctx.fillStyle = pal.inkA; ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgba(236,104,128,0.55)';
    ctx.beginPath(); ctx.ellipse(mg.x, mg.y + mg.ory * 0.7, mg.orx * 0.8, mg.ory * 0.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  } else {
    const M = mg.pts;
    ctx.beginPath();
    ctx.moveTo(M[0], M[1]);
    for (let k = 1; k <= MOUTH_N; k++) ctx.lineTo(M[2 * k], M[2 * k + 1]);
    ctx.stroke();
  }
  // blush lines (embarrassment)
  if (f.lines > 0.05) {
    ctx.save(); ctx.globalAlpha *= clamp(f.lines) * 0.75; ctx.strokeStyle = '#d63a6c'; ctx.lineWidth = Math.max(1, P * 0.014);
    for (const i of CHEEKS) {
      const bx = Q[2 * i] - ox, by = Q[2 * i + 1] - oy;
      for (let k = -1; k <= 1; k++) {
        const x0 = bx + k * W * 0.035 - W * 0.012, y0 = by + P * 0.022;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + W * 0.022, y0 - P * 0.045); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // sweat (anxiety): a drop forms at the temple and slides down
  const SW = th.fx.sweat;
  if (SW.on > 0.02 && f.sweat > 0.05) {
    const tt = SW.t, a = SW.on * Math.pow(Math.sin(Math.PI * tt), 0.6) * clamp(f.sweat);
    const d = -tt * P * 0.3;
    const x = Q[2 * PT.sweat] - ox + si * d, y = Q[2 * PT.sweat + 1] - oy - co * d, r = P * 0.042;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.moveTo(x, y - r * 2.3); ctx.bezierCurveTo(x + r * 0.9, y - r * 0.9, x + r * 1.05, y + r * 0.2, x, y + r); ctx.bezierCurveTo(x - r * 1.05, y + r * 0.2, x - r * 0.9, y - r * 0.9, x, y - r * 2.3);
    ctx.fillStyle = 'rgba(228,244,255,0.9)'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,230,0.75)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.25, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawFx(ctx, th, pal, S, o) {
  const F = th.fx, R = th.render, P = R.P, W = R.W, ox = o.ox || 0, oy = o.oy || 0, t = th.clock, rm = !!o.rm;
  const cx = R.cx - ox, cy = R.cy - oy, O = R.outline;
  // anger: micro-arcs crackling along the rim (soft rise, never a flash)
  for (const a of F.arcs) {
    if (a.life <= 0) continue;
    const el = (1 - a.life) * a.dur, al = smooth(0, 0.28, el) * (1 - smooth(a.dur - 0.3, a.dur, el));
    if (al < 0.01) continue;
    const tick = rm ? 0 : Math.floor(t * 12);
    ctx.beginPath();
    // a hairline of static hugging the rim: three irregular kinks per rim step, re-jagged 12 times a second
    const steps = a.len * 3;
    let ex0 = 0, ey0 = 0, ex1 = 0, ey1 = 0;
    for (let k = 0; k <= steps; k++) {
      const f = k / 3, i0 = (a.i + Math.floor(f)) % OUTLINE_N, i1 = (i0 + 1) % OUTLINE_N, u = f - Math.floor(f);
      const x = O[2 * i0] + (O[2 * i1] - O[2 * i0]) * u - ox, y = O[2 * i0 + 1] + (O[2 * i1 + 1] - O[2 * i0 + 1]) * u - oy;
      const nx = x - cx, ny = y - cy, nl = Math.hypot(nx, ny) || 1;
      const end = k === 0 || k === steps ? 0 : 1;
      const r = rnd(a.seed, k + tick * 17);
      const jag = P * (0.03 + end * (r - 0.42) * 0.11);
      const X = x + (nx / nl) * jag, Y = y + (ny / nl) * jag;
      if (k === 0) { ctx.moveTo(X, Y); ex0 = X; ey0 = Y; } else ctx.lineTo(X, Y);
      ex1 = X; ey1 = Y;
    }
    ctx.save();
    ctx.globalAlpha *= al * 0.4; ctx.strokeStyle = '#ff6a3d'; ctx.lineWidth = Math.max(3, P * 0.06); ctx.stroke();
    ctx.globalAlpha = ctx.globalAlpha / 0.4 * 0.95; ctx.strokeStyle = '#ffeedb'; ctx.lineWidth = Math.max(1.1, P * 0.015); ctx.stroke();
    // a spark at each end
    ctx.fillStyle = '#fff1dc';
    ctx.beginPath(); ctx.arc(ex0, ey0, Math.max(0.8, P * 0.012), 0, TAU); ctx.arc(ex1, ey1, Math.max(0.8, P * 0.012), 0, TAU); ctx.fill();
    ctx.restore();
  }
  // frustration: steam puffs rising from two vents (0.14 P growing to 0.35 P)
  for (const p of F.puffs) {
    if (p.life <= 0) continue;
    const e = 1 - p.life, a = Math.pow(Math.sin(Math.PI * Math.min(1, e * 1.08)), 0.7) * 0.85;
    blob(ctx, S.puff, p.x - ox, p.y - oy, p.r, p.r * 0.88, 0, a);
  }
  // sadness: its own soft rain cloud (lit on top, greyer below) and a light rain that splashes on its head
  if (F.cloud > 0.02) {
    const G = FX_GEOM, ccx = cx + (rm ? 0 : Math.sin(t * 0.25) * W * 0.04), ccy = cy + P * G.cloudY;
    const a = F.cloud * 0.92, cw = W * G.cloudW / 0.92;
    blob(ctx, S.cloudBase, ccx, ccy + P * 0.09, cw * 0.44, P * 0.1, 0, a * 0.8);
    for (let k = 0; k < CLOUD.length; k++) {
      const L = CLOUD[k], br = rm ? 0 : 0.02 * Math.sin(t * 0.6 + k * 1.9);
      blob(ctx, S.cloud, ccx + L[0] * cw, ccy + L[1] * P, L[2] * cw * (1 + br), L[3] * P * (1 + br), 0, a);
    }
    ctx.save();
    ctx.lineCap = 'round';
    for (const d of F.drops) {
      if (d.life <= 0) continue;
      const x = cx + d.x, y = cy + d.y;
      if (d.splash > 0) {
        // a short splash where it lands: two droplets thrown out and a little ring
        const k = d.splash, sa = (1 - k) * 0.85 * F.cloud, sy = cy + d.sy;
        ctx.globalAlpha = R.alpha * sa;
        blob(ctx, S.splash, x - P * 0.07 * k, sy - P * 0.06 * Math.sin(Math.PI * k), P * 0.022, P * 0.022, 0, 1);
        blob(ctx, S.splash, x + P * 0.07 * k, sy - P * 0.05 * Math.sin(Math.PI * k), P * 0.02, P * 0.02, 0, 1);
        ctx.strokeStyle = 'rgba(214,230,255,0.9)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(x, sy + 1, P * (0.03 + 0.06 * k), P * (0.01 + 0.015 * k), 0, Math.PI, TAU); ctx.stroke();
        continue;
      }
      const e = 1 - d.life, a2 = smooth(0, 0.06, e) * 0.9 * F.cloud;
      if (a2 < 0.01) continue;
      ctx.globalAlpha = R.alpha * a2;
      ctx.strokeStyle = 'rgba(200,220,255,1)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 0.8, y + d.len); ctx.stroke();
    }
    ctx.restore();
  }
  // siblings: mumble marks beside a talking mouth ("))", drifting off as the syllable ends)
  if (th.kind === 'sibling') {
    ctx.save(); ctx.strokeStyle = pal.inkB; ctx.lineWidth = Math.max(1.4, P * 0.05); ctx.lineCap = 'round';
    for (const m of F.marks) {
      if (m.life <= 0) continue;
      ctx.globalAlpha = R.alpha * Math.sin(Math.PI * (1 - m.life)) * 0.8;
      const a0 = m.side > 0 ? -0.55 : Math.PI - 0.55;
      ctx.beginPath(); ctx.arc(m.x - ox - m.side * m.r, m.y - oy, m.r * 0.62, a0, a0 + 1.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(m.x - ox - m.side * m.r, m.y - oy, m.r, a0 - 0.05, a0 + 1.15); ctx.stroke();
    }
    ctx.restore();
  }
}

// --------------------------------------------------------------- props --
function drawPropBack(ctx, th, o, S, pal) {
  if (th.prop === 'thread') drawThread(ctx, th, o, pal, true);
  void S;
}

function drawPropFront(ctx, th, o, S, pal) {
  const ps = th.propState, ox = o.ox || 0, oy = o.oy || 0, ex = th.explored, R = th.render, P = R.P, t = th.clock, rm = !!o.rm;
  if (th.prop === 'stone') {
    const r = ps.size, x = ps.x - ox, y = ps.y - oy;
    // contact shadow where it rests
    blob(ctx, S.shadow, x, y + r * 0.78, r * 0.8, r * 0.18, 0, 0.7);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ps.ang);
    ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU, k = 1 + 0.07 * (rnd(ps.seed, i % n) - 0.5) * 2;
      const X = Math.cos(a) * r * k, Y = Math.sin(a) * r * 0.82 * k;
      const a2 = ((i + 0.5) / n) * TAU, k2 = 1 + 0.07 * (rnd(ps.seed, (i + 1) % n) - 0.5) * 2;
      if (i === 0) ctx.moveTo(X, Y); else ctx.quadraticCurveTo(Math.cos(a2 - Math.PI / n) * r * k * 1.03, Math.sin(a2 - Math.PI / n) * r * 0.82 * k * 1.03, X, Y);
      void k2;
    }
    ctx.closePath();
    ctx.save(); ctx.scale(r, r); ctx.fillStyle = S.stone; ctx.fill(); ctx.restore();
    if (ex > 0.01) { ctx.save(); ctx.globalAlpha *= smooth(0, 1, ex); ctx.scale(r, r); ctx.fillStyle = S.stoneLight; ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = 'rgba(20,14,40,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    // speckles and a dull sheen
    ctx.fillStyle = `rgba(30,24,52,${0.35 * (1 - 0.6 * ex)})`;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((rnd(ps.seed, 30 + i) - 0.5) * r * 1.2, (rnd(ps.seed, 40 + i) - 0.4) * r * 0.9, r * 0.035, 0, TAU); ctx.fill(); }
    blob(ctx, S.spec, -r * 0.36, -r * 0.4, r * 0.32, r * 0.16, -0.5, 0.45);
    ctx.restore();
  } else if (th.prop === 'shell') {
    // drawn from its free end (origin) to the hinge (x = L), which stays on the rim
    const L = ps.size, H = L * 0.36, flip = ps.flip ?? 1;
    ctx.save();
    ctx.translate(ps.x - ox, ps.y - oy); ctx.rotate(ps.ang);
    // turning over as it swings open: edge-on half way, its back toward the head once open
    ctx.scale(1, Math.abs(flip) < 0.08 ? 0.08 * (flip < 0 ? -1 : 1) : flip);
    ctx.globalAlpha *= 1 - 0.18 * ex;
    // a scallop: a fan from the hinge, scalloped along its rim
    ctx.beginPath();
    ctx.moveTo(L, 0);
    const ribs = 7;
    for (let i = 0; i <= ribs; i++) {
      const a = -Math.PI * 0.98 + (i / ribs) * Math.PI * 0.98;
      const x = Math.cos(a) * L * 0.5 + L * 0.5, y = Math.sin(a) * H;
      if (i === 0) ctx.lineTo(x, y);
      else {
        const am = -Math.PI * 0.98 + ((i - 0.5) / ribs) * Math.PI * 0.98;
        ctx.quadraticCurveTo(Math.cos(am) * L * 0.56 + L * 0.5, Math.sin(am) * H * 1.12, x, y);
      }
    }
    ctx.closePath();
    ctx.save(); ctx.scale(L / 2, H); ctx.translate(1, 0); ctx.fillStyle = S.shell; ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(120,52,50,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    // ribs fanning from the hinge
    ctx.strokeStyle = 'rgba(150,70,64,0.35)'; ctx.lineWidth = 1;
    for (let i = 1; i < ribs; i++) {
      const a = -Math.PI * 0.98 + (i / ribs) * Math.PI * 0.98;
      ctx.beginPath(); ctx.moveTo(L * 0.92, 0); ctx.lineTo(Math.cos(a) * L * 0.47 + L * 0.5, Math.sin(a) * H * 0.94); ctx.stroke();
    }
    // the hinge (on the rim) and a pearly highlight
    ctx.fillStyle = '#d48b80'; ctx.beginPath(); ctx.ellipse(L * 0.95, -H * 0.02, L * 0.07, H * 0.14, 0, 0, TAU); ctx.fill();
    blob(ctx, S.spec, L * 0.58, -H * 0.62, L * 0.16, H * 0.12, 0.2, 0.55);
    ctx.restore();
  } else if (th.prop === 'thread') {
    drawThread(ctx, th, o, pal, false);
  } else if (th.prop === 'charm') {
    const ch = ps.chain;
    if (!ch?.init) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,232,170,0.85)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(ch.x[0] - ox, ch.y[0] - oy);
    for (let i = 1; i < ch.x.length; i++) ctx.lineTo(ch.x[i] - ox, ch.y[i] - oy);
    ctx.stroke();
    const s = ps.size, x = ps.x - ox, y = ps.y - oy;
    const pulse = rm ? 1 : 1 + 0.08 * Math.sin(t * 1.25);
    ctx.globalCompositeOperation = 'lighter';
    blob(ctx, S.charmGlow, x, y + s * 0.6, s * 2.8 * pulse, s * 2.8 * pulse, 0, 0.55 * ps.glow);
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(x, y); ctx.rotate(ps.ang);
    // a teardrop crystal, point up to the cord
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.75, s * 0.45, s * 0.8, s * 1.35, 0, s * 1.55);
    ctx.bezierCurveTo(-s * 0.8, s * 1.35, -s * 0.75, s * 0.45, 0, 0);
    ctx.save(); ctx.translate(0, s * 0.95); ctx.scale(s * 0.8, s * 0.8); ctx.fillStyle = S.charm; ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(190,120,30,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    // a small four-point glint
    const gx = -s * 0.12, gy = s * 0.85, gr = s * 0.42 * ps.glow;
    ctx.fillStyle = 'rgba(255,255,250,0.95)';
    ctx.beginPath(); ctx.moveTo(gx, gy - gr); ctx.quadraticCurveTo(gx, gy, gx + gr * 0.6, gy); ctx.quadraticCurveTo(gx, gy, gx, gy + gr); ctx.quadraticCurveTo(gx, gy, gx - gr * 0.6, gy); ctx.quadraticCurveTo(gx, gy, gx, gy - gr); ctx.fill();
    ctx.restore();
  }
  void P;
}

// the tangled thread round its middle: back half behind the body, front half (with its loops and
// knot cluster) in front. Tangled, three strands wander and cross; loosened, one soft loop slips down.
const THREAD_N = 16;
function drawThread(ctx, th, o, pal, back) {
  const ps = th.propState, ox = o.ox || 0, oy = o.oy || 0, R = th.render, M = R.M, sb = th.sb, P = R.P, t = th.clock, rm = !!o.rm;
  const tangle = 1 - smooth(0, 1, ps.loose);
  const v = ps.v ?? 0.74;
  const sp = th._propPt;
  const lw = Math.max(3, P * 0.034);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // strands: the band itself, and (tangled) two more that wander over and under it
  const strands = back ? 1 : tangle > 0.12 ? 3 : 1;
  for (let st = 0; st < strands; st++) {
    let px0 = 0, py0 = 0;
    ctx.beginPath();
    for (let k = 0; k <= THREAD_N; k++) {
      const u = -0.04 + (k / THREAD_N) * 1.08;
      // the band curves round the body: lower at the front, higher behind
      const vv = back ? v - 0.06 : v + 0.035 * Math.sin(Math.PI * (k / THREAD_N));
      sb.sample(clamp(u), clamp(vv), sp);
      let x = M[0] * sp.x + M[2] * sp.y + M[4] - ox, y = M[1] * sp.x + M[3] * sp.y + M[5] - oy;
      if (!back) {
        const w = tangle * P * (st === 0 ? 0.035 : 0.06);
        const ph = st * 2.1 + rnd(ps.seed, k + 31 * st) * 2.4;
        y += Math.sin(k * (1.5 + 0.4 * st) + ph) * w + (rm ? 0 : Math.sin(t * 1.1 + k + st) * w * 0.1);
        x += Math.cos(k * (2.1 + 0.3 * st) + ph) * w * 0.45;
      }
      if (k === 0) ctx.moveTo(x, y); else { ctx.quadraticCurveTo(px0, py0, (px0 + x) / 2, (py0 + y) / 2); }
      px0 = x; py0 = y;
    }
    ctx.lineTo(px0, py0);
    ctx.strokeStyle = back ? 'rgba(200,64,96,0.45)' : st === 0 ? '#f2557c' : st === 1 ? '#e84a72' : '#ff7196';
    ctx.lineWidth = st === 0 ? lw : lw * 0.8;
    ctx.globalAlpha = R.alpha * (st === 0 ? 1 : 0.92 * smooth(0.12, 0.5, tangle));
    ctx.stroke();
    if (!back && st === 0) { ctx.strokeStyle = 'rgba(255,214,224,0.8)'; ctx.lineWidth = Math.max(1, lw * 0.28); ctx.stroke(); }
  }
  ctx.globalAlpha = R.alpha;
  if (!back) {
    // a knot cluster at the front (three tight loops round a knot); loosened, a single small loop
    sb.sample(0.62, clamp(v + 0.035), sp);
    const kx = M[0] * sp.x + M[2] * sp.y + M[4] - ox, ky = M[1] * sp.x + M[3] * sp.y + M[5] - oy;
    const loops = tangle > 0.15 ? 3 : 1;
    for (let j = 0; j < loops; j++) {
      const r = P * (0.04 + 0.04 * tangle) * (j === 1 ? 0.8 : 1);
      const x = kx + (loops > 1 ? (j - 1) * P * 0.055 : 0), y = ky + (loops > 1 ? (j === 1 ? -P * 0.025 : P * 0.01) : 0);
      ctx.strokeStyle = j === 1 ? '#ff7196' : '#f2557c'; ctx.lineWidth = Math.max(2.4, lw * 0.85);
      ctx.beginPath();
      for (let q = 0; q <= 20; q++) {
        const a = (q / 20) * TAU * (1 + tangle * 0.6), rr = r * (0.75 + 0.35 * Math.sin(q * 1.3 + j * 2));
        const X = x + Math.cos(a + j * 1.7) * rr, Y = y + Math.sin(a + j * 1.7) * rr * 0.72;
        if (q === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke();
    }
    if (tangle > 0.15) {
      ctx.fillStyle = '#c93a62'; ctx.beginPath(); ctx.ellipse(kx, ky, P * 0.03 * (0.6 + 0.4 * tangle), P * 0.024 * (0.6 + 0.4 * tangle), 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,215,0.85)'; ctx.beginPath(); ctx.arc(kx - P * 0.008, ky - P * 0.008, P * 0.008, 0, TAU); ctx.fill();
      // two loose ends hanging from the knot
      ctx.strokeStyle = '#f2557c'; ctx.lineWidth = lw * 0.75;
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(kx - P * 0.03, ky + P * 0.06, kx - P * 0.015, ky + P * 0.11 * tangle); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(kx + P * 0.04, ky + P * 0.05, kx + P * 0.035, ky + P * 0.09 * tangle); ctx.stroke();
    }
  }
  ctx.restore();
  void pal;
}

/** The soft rope between a thought and its words. rope: {x, y: Float32Array} (canvas CSS px after offset). */
export function drawRope(ctx, rope, colour, alpha = 1, ox = 0, oy = 0) {
  const n = rope.x.length;
  if (n < 2 || alpha < 0.02) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rope.x[0] - ox, rope.y[0] - oy);
  for (let i = 1; i < n - 1; i++) {
    const mx = (rope.x[i] + rope.x[i + 1]) / 2 - ox, my = (rope.y[i] + rope.y[i + 1]) / 2 - oy;
    ctx.quadraticCurveTo(rope.x[i] - ox, rope.y[i] - oy, mx, my);
  }
  ctx.lineTo(rope.x[n - 1] - ox, rope.y[n - 1] - oy);
  ctx.strokeStyle = 'rgba(10,6,30,0.35)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = colour; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = colour;
  ctx.beginPath(); ctx.arc(rope.x[0] - ox, rope.y[0] - oy, 2.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(rope.x[n - 1] - ox, rope.y[n - 1] - oy, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}

export { lerp };
