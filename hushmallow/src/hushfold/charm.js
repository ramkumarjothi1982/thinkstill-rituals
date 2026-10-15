// Memory Garden charms: a small luminous object per skill, drawn
// procedurally on canvas from the skill id and the colours of the Mallow who
// was there when it was kept. One painter per family (skills.js
// CHARM_FAMILIES), each layered the same way: a soft halo, a glass or pearl
// body with depth, an inner light, the family's motif, facets/ribs, rim light
// and specular glints. Static layers are painted once into a cached sprite;
// the live parts (breathing inner light, a slow glint sweep, twinkling
// sparkles) are cheap draws on top, so nothing big is allocated per frame.
//
//   drawCharm(g, { skillId, mallow, x, y, size, res, t, alpha, glint, sparkle, dpr })
//   charmSprite(skillId, mallow, size, dpr) → canvas (cached; size = charm diameter, CSS px)
//   charmCanvas({ skillId, mallow, box, animate, reducedMotion }) → { el, draw(t), destroy() }
//   charmPalette(skillId, mallow) → colours
//
// `size` is the charm's body diameter; sprites are CHARM_PAD × larger so the
// halo and the prism's beams have room. Readable from 40 to 220 px. A charm
// whose size animates (the installation, a plant's bob) passes `res`, its
// largest size: one sprite is painted at that size and scaled with drawImage,
// so an animation never rasterises a new sprite per frame. Sparkles and
// glints are cached sprites too (no gradient is built per frame). Live charm
// canvases share the Mallow loop (rig.js addTicker): one requestAnimationFrame.

import { getSkill, CHARM_FAMILIES } from './skills.js';
import { MALLOWS } from '../mallows/registry.js';
import { addTicker, removeTicker } from '../mallows/rig.js';

export const CHARM_PAD = 1.6;

// ---------------------------------------------------------------- colour --
const hex = (h) => {
  const s = String(h || '#ffffff').replace('#', '');
  const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s.padEnd(6, '0').slice(0, 6);
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
};
const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

function hash01(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

function mallowOf(m) {
  if (m && typeof m === 'object' && m.colours) return m;
  return (typeof m === 'string' && MALLOWS[m]) || null;
}

const FALLBACK = { deep: '#1a1450', body: '#5b4bd6', light: '#c9c0ff', core: '#fff4c8', rim: '#ffe9a8' };

/** The charm's colours: the skill's own palette, lit by the Mallow who was there (cached). */
const PALETTES = new Map();
export function charmPalette(skillId, mallow) {
  const key = `${skillId}|${typeof mallow === 'string' ? mallow : mallow?.id || ''}`;
  let P = PALETTES.get(key);
  if (!P) { P = Object.freeze(paletteFor(skillId, mallow)); if (PALETTES.size > 96) PALETTES.clear(); PALETTES.set(key, P); }
  return P;
}
function paletteFor(skillId, mallow) {
  const s = getSkill(skillId);
  const own = s?.charm?.palette || FALLBACK;
  const home = MALLOWS[s?.mallow] || null;
  const m = mallowOf(mallow) || home || MALLOWS.noomi;
  const visiting = !home || m.id !== home.id;     // kept with a different Mallow: a little of their colour
  const mc = { glow: hex(m.colours.glow), accent: hex(m.colours.accent), body: hex(m.colours.body) };
  const rim = mix(hex(own.rim), mc.glow, visiting ? 0.45 : 0.22);
  return {
    family: s?.charm?.family || CHARM_FAMILIES[Math.floor(hash01(String(skillId || 'charm')) * CHARM_FAMILIES.length)],
    deep: hex(own.deep),
    body: visiting ? mix(hex(own.body), mc.body, 0.22) : hex(own.body),
    light: hex(own.light),
    core: hex(own.core),
    rim,
    glow: mix(rim, mc.glow, 0.5),
    accent: mc.accent,
    sparkle: mix(rim, WHITE, 0.4),
    seed: hash01(String(skillId || 'charm')),
  };
}

// ------------------------------------------------------------ primitives --
function radial(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
function linear(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
function poly(pts, close = true) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (close) p.closePath();
  return p;
}
function smoothClosed(pts) {
  const p = new Path2D();
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], m = mid(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
  p.closePath();
  return p;
}
/** Soft elliptical highlight. */
function spec(g, x, y, rx, ry, rot, a, c = WHITE) {
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(rx, ry);
  g.fillStyle = radial(g, 0, 0, 0, 1, [[0, rgba(c, a)], [0.55, rgba(c, a * 0.35)], [1, rgba(c, 0)]]);
  g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
  g.restore();
}
/** A four-point glint with a soft core. */
function star4(g, x, y, r, a, c = WHITE, thin = 0.13) {
  if (a <= 0.002) return;
  g.save();
  g.translate(x, y);
  g.fillStyle = radial(g, 0, 0, 0, r * 0.7, [[0, rgba(c, a * 0.75)], [1, rgba(c, 0)]]);
  g.beginPath(); g.arc(0, 0, r * 0.7, 0, Math.PI * 2); g.fill();
  g.fillStyle = rgba(mix(c, WHITE, 0.6), a);
  const w = r * thin;
  g.beginPath();
  g.moveTo(0, -r); g.quadraticCurveTo(w, -w, r, 0); g.quadraticCurveTo(w, w, 0, r); g.quadraticCurveTo(-w, w, -r, 0); g.quadraticCurveTo(-w, -w, 0, -r);
  g.fill();
  g.restore();
}
function glow(g, x, y, r, c, a) {
  g.fillStyle = radial(g, x, y, 0, r, [[0, rgba(c, a)], [0.4, rgba(c, a * 0.45)], [1, rgba(c, 0)]]);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}
/** Rim light (upper left) and depth (lower right), drawn inside the shape. */
function rimAndDepth(g, path, P, { lit = 0.6, dark = 0.5, w = 0.075, off = 0.04 } = {}) {
  g.save();
  g.clip(path);
  g.save(); g.translate(-off * 0.9, -off * 1.1); g.strokeStyle = rgba(P.deep, dark); g.lineWidth = w * 1.6; g.stroke(path); g.restore();
  g.save(); g.translate(off, off * 1.15); g.strokeStyle = rgba(mix(P.rim, WHITE, 0.25), lit); g.lineWidth = w; g.stroke(path); g.restore();
  g.restore();
}
function outline(g, path, P, a = 0.45, w = 0.02) { g.strokeStyle = rgba(mix(P.rim, WHITE, 0.2), a); g.lineWidth = w; g.stroke(path); }

// ---------------------------------------------------------------- shapes --
// Unit space: the charm body fits in [-1, 1] (a little more for sprouts and beams).
const SHAPE_CACHE = new Map();
function shapeOf(family) {
  if (typeof Path2D === 'undefined') return null;
  if (SHAPE_CACHE.has(family)) return SHAPE_CACHE.get(family);
  let p;
  switch (family) {
    case 'crystal': p = poly(CRYSTAL.outline); break;
    case 'ripple-stone': p = smoothClosed(PEBBLE); break;
    case 'prism': p = roundedTri([0, -0.9], [0.94, 0.72], [-0.94, 0.72], 0.13); break;
    case 'lantern': { p = new Path2D(); p.ellipse(0, 0.1, 0.64, 0.6, 0, 0, Math.PI * 2); break; }
    case 'shell': p = shellPath(); break;
    case 'moon-pearl': { p = new Path2D(); p.arc(0, 0, 0.88, 0, Math.PI * 2); break; }
    case 'seed': p = seedBody(); break;
    default: { p = new Path2D(); p.arc(0, 0, 0.9, 0, Math.PI * 2); }
  }
  SHAPE_CACHE.set(family, p);
  return p;
}
function roundedTri(a, b, c, r) {
  const p = new Path2D();
  const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  p.moveTo(m[0], m[1]);
  p.arcTo(a[0], a[1], b[0], b[1], r);
  p.arcTo(b[0], b[1], c[0], c[1], r);
  p.arcTo(c[0], c[1], a[0], a[1], r);
  p.closePath();
  return p;
}

const CRYSTAL = (() => {
  const T = [0, -1.02], UL = [-0.54, -0.5], UR = [0.54, -0.5], LL = [-0.54, 0.46], LR = [0.54, 0.46], B = [0, 1.02];
  const TL = [-0.19, -0.6], TR = [0.19, -0.6], BL = [-0.19, 0.55], BR = [0.19, 0.55];
  return { T, UL, UR, LL, LR, B, TL, TR, BL, BR, outline: [T, UR, LR, B, LL, UL] };
})();

const PEBBLE = (() => {
  const pts = [];
  const rot = -0.2, cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < 40; i++) {
    const th = (i / 40) * Math.PI * 2;
    const r = 1 + 0.05 * Math.sin(2 * th + 0.7) + 0.035 * Math.sin(3 * th + 1.9);
    const x = 0.95 * r * Math.cos(th), y = 0.76 * r * Math.sin(th) + 0.04;
    pts.push([x * cr - y * sr, x * sr + y * cr]);
  }
  return pts;
})();

const SHELL = (() => {
  const H = [0, 0.7], R = 1.18, a0 = -Math.PI + 0.46, a1 = -0.46, N = 7;
  const at = (a, r) => [H[0] + Math.cos(a) * r, H[1] + Math.sin(a) * r];
  const valleys = [];
  for (let i = 0; i <= N; i++) valleys.push(a0 + ((a1 - a0) * i) / N);
  return { H, R, N, at, valleys };
})();
function shellPath() {
  const { H, R, N, at, valleys } = SHELL;
  const p = new Path2D();
  p.moveTo(H[0] - 0.08, H[1] + 0.04);
  const s = at(valleys[0], R * 0.9);
  p.lineTo(s[0], s[1]);
  for (let i = 0; i < N; i++) {
    const am = (valleys[i] + valleys[i + 1]) / 2;
    const c = at(am, R * 1.1), e = at(valleys[i + 1], R * 0.92);
    p.quadraticCurveTo(c[0], c[1], e[0], e[1]);
  }
  p.lineTo(H[0] + 0.08, H[1] + 0.04);
  p.closePath();
  return p;
}
function seedBody() {
  const p = new Path2D();
  p.moveTo(-0.56, -0.28);
  p.bezierCurveTo(-0.8, 0.26, -0.46, 0.86, 0, 0.98);
  p.bezierCurveTo(0.46, 0.86, 0.8, 0.26, 0.56, -0.28);
  p.quadraticCurveTo(0, -0.4, -0.56, -0.28);
  p.closePath();
  return p;
}

// --------------------------------------------------------------- painters --
function halo(g, P, a = 0.34) {
  g.fillStyle = radial(g, 0, 0, 0.2, 1.55, [[0, rgba(P.glow, a)], [0.45, rgba(P.glow, a * 0.42)], [1, rgba(P.glow, 0)]]);
  g.fillRect(-1.6, -1.6, 3.2, 3.2);
}

const PAINT = {
  crystal(g, P, lod) {
    const C = CRYSTAL, path = shapeOf('crystal');
    const face = (pts, c0, c1) => { g.fillStyle = linear(g, 0, -1, 0.3, 1, [[0, rgba(c0, 0.96)], [1, rgba(c1, 0.96)]]); g.fill(poly(pts)); };
    const L = mix(P.body, P.light, 0.5), LL = mix(P.body, P.light, 0.75), M = P.body, D = mix(P.body, P.deep, 0.5), DD = mix(P.body, P.deep, 0.75);
    face([C.UL, C.TL, C.BL, C.LL], L, mix(L, P.deep, 0.35));
    face([C.TL, C.TR, C.BR, C.BL], mix(M, P.light, 0.12), mix(M, P.deep, 0.3));
    face([C.TR, C.UR, C.LR, C.BR], D, DD);
    face([C.T, C.TL, C.UL], LL, L);
    face([C.T, C.TR, C.TL], mix(P.light, WHITE, 0.15), mix(P.light, P.body, 0.4));
    face([C.T, C.UR, C.TR], mix(M, P.light, 0.3), D);
    face([C.LL, C.BL, C.B], mix(M, P.light, 0.15), D);
    face([C.BL, C.BR, C.B], mix(M, P.deep, 0.35), DD);
    face([C.BR, C.LR, C.B], DD, P.deep);
    // the dawn inside: a horizon of gold and a sun rising from it
    g.save();
    g.clip(path);
    g.globalCompositeOperation = 'lighter';
    const hy = 0.16;
    glow(g, 0, hy, 0.95, P.core, 0.38);
    g.save(); g.beginPath(); g.rect(-1, -1.1, 2, hy + 1.1); g.clip();
    g.fillStyle = radial(g, 0, hy, 0, 0.42, [[0, rgba(mix(P.core, WHITE, 0.55), 0.95)], [0.42, rgba(P.core, 0.75)], [1, rgba(P.core, 0)]]);
    g.beginPath(); g.arc(0, hy, 0.42, 0, Math.PI * 2); g.fill();
    if (lod > 34) {
      g.strokeStyle = rgba(P.core, 0.22); g.lineWidth = 0.022;
      for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * 0.36; g.beginPath(); g.moveTo(Math.cos(a) * 0.24, hy + Math.sin(a) * 0.24); g.lineTo(Math.cos(a) * 0.72, hy + Math.sin(a) * 0.72); g.stroke(); }
    }
    g.restore();
    g.fillStyle = linear(g, -0.6, 0, 0.6, 0, [[0, rgba(P.core, 0)], [0.5, rgba(mix(P.core, WHITE, 0.4), 0.95)], [1, rgba(P.core, 0)]]);
    g.fillRect(-0.6, hy - 0.014, 1.2, 0.028);
    g.save(); g.translate(0, hy); g.scale(1, 0.45);
    g.fillStyle = radial(g, 0, 0, 0, 0.5, [[0, rgba(P.core, 0.4)], [1, rgba(P.core, 0)]]);
    g.beginPath(); g.arc(0, 0.2, 0.5, 0, Math.PI * 2); g.fill();
    g.restore();
    g.restore();
    // facet edges
    if (lod > 22) {
      g.strokeStyle = rgba(mix(P.rim, WHITE, 0.3), 0.32); g.lineWidth = Math.max(0.012, 0.9 / lod);
      const e = (a, b) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
      e(C.T, C.TL); e(C.T, C.TR); e(C.TL, C.TR); e(C.UL, C.TL); e(C.UR, C.TR); e(C.TL, C.BL); e(C.TR, C.BR);
      e(C.BL, C.BR); e(C.LL, C.BL); e(C.LR, C.BR); e(C.BL, C.B); e(C.BR, C.B);
    }
    g.strokeStyle = rgba(mix(P.rim, WHITE, 0.5), 0.85); g.lineWidth = 0.028;
    g.beginPath(); g.moveTo(C.UL[0], C.UL[1]); g.lineTo(C.T[0], C.T[1]); g.lineTo(C.TL[0], C.TL[1]); g.stroke();
    outline(g, path, P, 0.5, 0.024);
    spec(g, -0.34, -0.12, 0.07, 0.34, 0.05, 0.42);
    spec(g, -0.18, -0.68, 0.16, 0.06, -0.85, 0.55);
    star4(g, -0.42, -0.62, 0.26, 0.85, mix(P.rim, WHITE, 0.6));
  },

  'ripple-stone'(g, P, lod) {
    const path = shapeOf('ripple-stone');
    g.fillStyle = radial(g, -0.3, -0.32, 0.04, 1.2, [[0, rgba(mix(P.light, WHITE, 0.3))], [0.42, rgba(mix(P.body, P.light, 0.35))], [0.78, rgba(P.body)], [1, rgba(P.deep)]]);
    g.fill(path);
    g.save();
    g.clip(path);
    g.globalCompositeOperation = 'lighter';
    glow(g, 0.12, 0.18, 0.85, P.core, 0.28);
    // ripples spreading round a still point, in perspective
    const cx = 0.12, cy = 0.2;
    const rings = lod > 30 ? [0.2, 0.4, 0.6, 0.82, 1.04] : [0.3, 0.62, 0.95];
    rings.forEach((k, i) => {
      g.strokeStyle = rgba(mix(P.light, WHITE, 0.3), 0.6 * (1 - i / (rings.length + 0.5)));
      g.lineWidth = 0.022 - i * 0.002;
      g.beginPath(); g.ellipse(cx, cy, k * 0.92, k * 0.36, -0.12, 0, Math.PI * 2); g.stroke();
    });
    g.globalCompositeOperation = 'source-over';
    rings.forEach((k, i) => {
      g.strokeStyle = rgba(P.deep, 0.22 * (1 - i / rings.length));
      g.lineWidth = 0.016;
      g.beginPath(); g.ellipse(cx, cy + 0.035, k * 0.92, k * 0.36, -0.12, 0.15, Math.PI - 0.15); g.stroke();
    });
    // the thought, a little further away, still there
    g.globalCompositeOperation = 'lighter';
    glow(g, -0.44, -0.08, 0.26, P.core, 0.75);
    g.fillStyle = rgba(mix(P.core, WHITE, 0.6), 1);
    g.beginPath(); g.arc(-0.44, -0.08, 0.07, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(-0.44, 0.03); g.scale(1, 0.35); glow(g, 0, 0, 0.12, P.core, 0.45); g.restore();
    // frosted specks
    if (lod > 30) {
      g.fillStyle = rgba(WHITE, 0.22);
      for (const [x, y, r] of [[0.42, -0.3, 0.018], [0.58, 0.1, 0.012], [-0.1, -0.42, 0.014], [0.3, 0.46, 0.012], [-0.62, 0.22, 0.016], [0.66, -0.12, 0.01]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
    rimAndDepth(g, path, P, { lit: 0.7, dark: 0.45, w: 0.07 });
    outline(g, path, P, 0.4, 0.02);
    spec(g, -0.36, -0.4, 0.34, 0.12, -0.32, 0.55);
    star4(g, -0.58, -0.3, 0.17, 0.8, mix(P.rim, WHITE, 0.5));
  },

  prism(g, P, lod) {
    const outer = shapeOf('prism');
    const A = [0, -0.9], B = [0.94, 0.72], C = [-0.94, 0.72];
    const a = [0, -0.52], b = [0.6, 0.5], c = [-0.6, 0.5];
    const inner = roundedTri(a, b, c, 0.06);
    // the white beam arriving from the left, behind the glass
    g.save();
    g.globalCompositeOperation = 'lighter';
    const beam = (x0, y0, x1, y1, w0, w1, col, a0, a1) => {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      g.fillStyle = linear(g, x0, y0, x1, y1, [[0, rgba(col, a0)], [1, rgba(col, a1)]]);
      g.beginPath(); g.moveTo(x0 + nx * w0, y0 + ny * w0); g.lineTo(x1 + nx * w1, y1 + ny * w1); g.lineTo(x1 - nx * w1, y1 - ny * w1); g.lineTo(x0 - nx * w0, y0 - ny * w0); g.closePath(); g.fill();
    };
    beam(-1.5, 0.44, -0.46, 0.05, 0.06, 0.04, WHITE, 0, 0.9);
    beam(-1.5, 0.44, -0.46, 0.05, 0.18, 0.12, P.light, 0, 0.25);
    g.restore();
    g.fillStyle = linear(g, 0, -0.9, 0, 0.75, [[0, rgba(mix(P.light, WHITE, 0.2))], [0.5, rgba(P.body)], [1, rgba(P.deep)]]);
    g.fill(outer);
    g.save();
    g.clip(outer);
    g.fillStyle = rgba(mix(P.light, WHITE, 0.25), 0.42); g.fill(poly([A, a, c, C]));
    g.fillStyle = rgba(P.deep, 0.42); g.fill(poly([A, B, b, a]));
    g.fillStyle = rgba(P.deep, 0.3); g.fill(poly([C, c, b, B]));
    g.fillStyle = radial(g, -0.12, 0.08, 0.02, 0.8, [[0, rgba(mix(P.light, P.body, 0.3), 0.95)], [0.6, rgba(P.body, 0.9)], [1, rgba(mix(P.body, P.deep, 0.5), 0.95)]]);
    g.fill(inner);
    g.globalCompositeOperation = 'lighter';
    beam(-0.46, 0.05, 0.36, 0.15, 0.08, 0.1, P.light, 0.16, 0.22);
    beam(-0.46, 0.05, 0.36, 0.15, 0.022, 0.03, WHITE, 0.42, 0.3);
    glow(g, 0.34, 0.15, 0.3, mix(P.core, P.light, 0.3), 0.32);
    g.restore();
    // three ways out: one event, more than one way to see it
    g.save();
    g.globalCompositeOperation = 'lighter';
    const outs = [[1.5, -0.2, P.rim], [1.5, 0.2, P.accent], [1.5, 0.6, [255, 214, 120]]];
    for (const [x, y, col] of outs) { beam(0.4, 0.16, x, y, 0.025, 0.1, col, 0.95, 0); beam(0.4, 0.16, x, y, 0.06, 0.22, col, 0.3, 0); }
    g.restore();
    if (lod > 40) {
      // a tiny Zuzu spiral etched near the top
      g.strokeStyle = rgba(mix(P.rim, WHITE, 0.3), 0.55); g.lineWidth = 0.014;
      g.beginPath();
      for (let i = 0; i <= 60; i++) { const th = (i / 60) * Math.PI * 4.4, r = 0.012 + (i / 60) * 0.12; const x = Math.cos(th) * r, y = -0.24 + Math.sin(th) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = rgba(mix(P.rim, WHITE, 0.3), 0.3); g.lineWidth = 0.014;
    if (lod > 24) {
      g.stroke(inner);
      // corner edges stop where the rounded corners begin
      const e = (p, q) => { g.beginPath(); g.moveTo(p[0] + (q[0] - p[0]) * 0.22, p[1] + (q[1] - p[1]) * 0.22); g.lineTo(q[0], q[1]); g.stroke(); };
      e(A, a); e(B, b); e(C, c);
    }
    outline(g, outer, P, 0.55, 0.024);
    g.strokeStyle = rgba(mix(P.rim, WHITE, 0.55), 0.8); g.lineWidth = 0.026;
    g.beginPath(); g.moveTo(-0.84, 0.6); g.lineTo(-0.08, -0.78); g.stroke();
    star4(g, 0, -0.8, 0.24, 0.85, mix(P.rim, WHITE, 0.6));
  },

  lantern(g, P, lod) {
    const glass = shapeOf('lantern');
    const metal0 = mix(P.deep, P.light, 0.22), metal1 = mix(P.deep, BLACK, 0.2);
    // handle ring
    g.strokeStyle = rgba(metal0); g.lineWidth = 0.065;
    g.beginPath(); g.arc(0, -0.8, 0.17, Math.PI * 0.95, Math.PI * 2.05); g.stroke();
    g.strokeStyle = rgba(mix(P.rim, WHITE, 0.3), 0.55); g.lineWidth = 0.018;
    g.beginPath(); g.arc(0, -0.8, 0.17, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
    // glass with a warm heart
    g.fillStyle = radial(g, 0, 0.2, 0.02, 0.78, [[0, rgba(P.core)], [0.32, rgba(mix(P.core, P.body, 0.55))], [0.7, rgba(P.body)], [1, rgba(P.deep)]]);
    g.fill(glass);
    g.save();
    g.clip(glass);
    // paper ribs (latitudes), shaded under and lit over
    const ribs = lod > 30 ? [-0.66, -0.33, 0, 0.33, 0.66] : [-0.5, 0, 0.5];
    for (const k of ribs) {
      const y = 0.1 + k * 0.6, hw = 0.64 * Math.sqrt(1 - k * k);
      g.strokeStyle = rgba(P.deep, 0.42); g.lineWidth = 0.03;
      g.beginPath(); g.moveTo(-hw, y); g.quadraticCurveTo(0, y + 0.09, hw, y); g.stroke();
      g.strokeStyle = rgba(mix(P.light, WHITE, 0.3), 0.3); g.lineWidth = 0.012;
      g.beginPath(); g.moveTo(-hw, y - 0.022); g.quadraticCurveTo(0, y + 0.068, hw, y - 0.022); g.stroke();
    }
    g.globalCompositeOperation = 'lighter';
    glow(g, 0, 0.22, 0.6, P.core, 0.24);
    g.globalCompositeOperation = 'source-over';
    // the flame
    g.fillStyle = radial(g, 0, 0.25, 0.01, 0.3, [[0, rgba(WHITE, 1)], [0.3, rgba(mix(P.core, WHITE, 0.25), 1)], [0.75, rgba(mix(P.core, P.accent, 0.35), 0.95)], [1, rgba(mix(P.core, P.accent, 0.6), 0.6)]]);
    g.beginPath(); g.moveTo(0, -0.08); g.bezierCurveTo(0.1, 0.06, 0.16, 0.18, 0.13, 0.27); g.bezierCurveTo(0.1, 0.36, -0.1, 0.36, -0.13, 0.27); g.bezierCurveTo(-0.16, 0.18, -0.1, 0.06, 0, -0.08); g.fill();
    g.restore();
    rimAndDepth(g, glass, P, { lit: 0.55, dark: 0.5, w: 0.07 });
    outline(g, glass, P, 0.35, 0.02);
    // caps
    const cap = (pts) => { const p = poly(pts); g.fillStyle = linear(g, 0, pts[0][1], 0, pts[2][1], [[0, rgba(metal0)], [1, rgba(metal1)]]); g.fill(p); g.strokeStyle = rgba(mix(P.rim, WHITE, 0.2), 0.45); g.lineWidth = 0.016; g.stroke(p); };
    cap([[-0.22, -0.66], [0.22, -0.66], [0.36, -0.5], [-0.36, -0.5]]);
    cap([[-0.24, 0.66], [0.24, 0.66], [0.15, 0.8], [-0.15, 0.8]]);
    g.fillStyle = rgba(mix(P.rim, WHITE, 0.3), 0.6); g.fillRect(-0.2, -0.655, 0.4, 0.018);
    g.globalCompositeOperation = 'lighter';
    glow(g, 0, 0.9, 0.1, P.accent, 0.6);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = rgba(mix(P.accent, WHITE, 0.3), 0.95); g.beginPath(); g.arc(0, 0.89, 0.045, 0, Math.PI * 2); g.fill();
    spec(g, -0.38, 0.02, 0.07, 0.3, 0.1, 0.5);
    star4(g, -0.3, -0.36, 0.17, 0.75, mix(P.rim, WHITE, 0.5));
  },

  shell(g, P, lod) {
    const { H, R, N, at, valleys } = SHELL;
    const path = shapeOf('shell');
    // ears at the hinge
    const ear = (s) => { const p = poly([[0.06 * s, 0.6], [0.4 * s, 0.5], [0.36 * s, 0.74], [0.08 * s, 0.8]]); g.fillStyle = linear(g, 0, 0.5, 0, 0.8, [[0, rgba(P.light)], [1, rgba(P.body)]]); g.fill(p); g.strokeStyle = rgba(P.deep, 0.35); g.lineWidth = 0.018; g.stroke(p); };
    ear(-1); ear(1);
    g.fillStyle = radial(g, H[0], H[1], 0.05, R * 1.08, [[0, rgba(mix(P.core, WHITE, 0.2))], [0.36, rgba(P.light)], [0.78, rgba(P.body)], [1, rgba(mix(P.body, P.deep, 0.4))]]);
    g.fill(path);
    g.save();
    g.clip(path);
    // corrugation: every other rib a little brighter
    for (let i = 0; i < N; i++) {
      const p0 = at(valleys[i], R * 1.2), p1 = at(valleys[i + 1], R * 1.2);
      g.fillStyle = i % 2 ? rgba(P.deep, 0.1) : rgba(WHITE, 0.1);
      g.fill(poly([H, p0, p1]));
    }
    for (let i = 1; i < N; i++) {
      const p0 = at(valleys[i], 0.16), p1 = at(valleys[i], R);
      g.strokeStyle = rgba(P.deep, 0.34); g.lineWidth = 0.03; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      const q0 = at(valleys[i] + 0.035, 0.18), q1 = at(valleys[i] + 0.035, R);
      g.strokeStyle = rgba(mix(P.light, WHITE, 0.4), 0.42); g.lineWidth = 0.014; g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke();
    }
    if (lod > 40) {
      g.strokeStyle = rgba(P.deep, 0.12); g.lineWidth = 0.012;
      for (const r of [0.48, 0.74, 0.96]) { g.beginPath(); g.arc(H[0], H[1], r, valleys[0], valleys[N]); g.stroke(); }
    }
    g.globalCompositeOperation = 'lighter';
    glow(g, 0, 0.3, 0.75, P.core, 0.22);
    g.restore();
    rimAndDepth(g, path, P, { lit: 0.5, dark: 0.35, w: 0.06 });
    g.strokeStyle = rgba(mix(P.rim, WHITE, 0.35), 0.7); g.lineWidth = 0.026; g.stroke(path);
    // the pearl
    g.save();
    g.globalCompositeOperation = 'lighter';
    glow(g, 0, 0.5, 0.5, P.core, 0.55);
    g.restore();
    g.fillStyle = radial(g, -0.07, 0.42, 0.01, 0.25, [[0, rgba(WHITE)], [0.4, rgba(mix(P.core, WHITE, 0.4))], [0.85, rgba(mix(P.light, P.core, 0.4))], [1, rgba(mix(P.light, P.body, 0.4))]]);
    g.beginPath(); g.arc(0, 0.5, 0.21, 0, Math.PI * 2); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; spec(g, 0.08, 0.57, 0.1, 0.06, 0.4, 0.22, P.accent); g.restore();
    spec(g, -0.07, 0.43, 0.07, 0.045, -0.5, 0.95);
    star4(g, -0.46, -0.42, 0.2, 0.7, mix(P.rim, WHITE, 0.5));
  },

  'star-seed'(g, P, lod) {
    const path = shapeOf('star-seed');
    g.fillStyle = radial(g, -0.26, -0.3, 0.06, 1.05, [[0, rgba(mix(P.body, P.light, 0.4))], [0.45, rgba(P.body)], [0.8, rgba(mix(P.body, P.deep, 0.6))], [1, rgba(P.deep)]]);
    g.fill(path);
    g.save();
    g.clip(path);
    g.globalCompositeOperation = 'lighter';
    glow(g, 0.32, 0.28, 0.55, P.accent, 0.2);
    glow(g, -0.3, 0.22, 0.5, P.light, 0.16);
    if (lod > 30) {
      const pts = [[-0.52, -0.18], [-0.26, -0.5], [0.18, -0.52], [0.5, -0.2], [0.46, 0.3], [0.06, 0.55], [-0.42, 0.38]];
      g.strokeStyle = rgba(P.light, 0.3); g.lineWidth = 0.012;
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      for (const [x, y] of pts) { glow(g, x, y, 0.07, P.light, 0.55); g.fillStyle = rgba(mix(P.light, WHITE, 0.6), 0.9); g.beginPath(); g.arc(x, y, 0.022, 0, Math.PI * 2); g.fill(); }
    }
    // the one quiet point
    glow(g, 0, 0, 0.5, P.core, 0.85);
    g.fillStyle = rgba(mix(P.core, WHITE, 0.55), 0.95);
    const ray = (ang, len, w) => { g.save(); g.rotate(ang); g.beginPath(); g.moveTo(0, -len); g.quadraticCurveTo(w, 0, 0, len); g.quadraticCurveTo(-w, 0, 0, -len); g.fill(); g.restore(); };
    ray(0, 0.58, 0.05); ray(Math.PI / 2, 0.58, 0.05); ray(Math.PI / 4, 0.24, 0.035); ray(-Math.PI / 4, 0.24, 0.035);
    g.fillStyle = rgba(WHITE, 1); g.beginPath(); g.arc(0, 0, 0.06, 0, Math.PI * 2); g.fill();
    g.restore();
    // a glass sphere: bright crescent above, refracted rim below
    g.strokeStyle = rgba(WHITE, 0.5); g.lineWidth = 0.06; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, 0.76, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
    g.strokeStyle = rgba(P.rim, 0.5); g.lineWidth = 0.05;
    g.beginPath(); g.arc(0, 0, 0.8, Math.PI * 0.08, Math.PI * 0.55); g.stroke();
    g.lineCap = 'butt';
    outline(g, path, P, 0.4, 0.02);
    spec(g, -0.36, -0.44, 0.24, 0.1, -0.62, 0.5);
  },

  'moon-pearl'(g, P, lod) {
    const path = shapeOf('moon-pearl');
    g.fillStyle = radial(g, -0.32, -0.38, 0.02, 1.05, [[0, rgba(mix(P.light, WHITE, 0.6))], [0.22, rgba(P.light)], [0.62, rgba(P.body)], [1, rgba(mix(P.body, P.deep, 0.55))]]);
    g.fill(path);
    g.save();
    g.clip(path);
    // nacre: soft colour drifting across the surface
    g.globalCompositeOperation = 'lighter';
    spec(g, 0.34, 0.12, 0.42, 0.7, 0.3, 0.16, P.accent);
    spec(g, -0.18, 0.48, 0.6, 0.28, -0.2, 0.16, P.glow);
    spec(g, 0.12, -0.52, 0.5, 0.22, 0.2, 0.1, mix(P.light, P.accent, 0.4));
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = radial(g, 0.52, 0.56, 0, 0.9, [[0, rgba(P.deep, 0.38)], [1, rgba(P.deep, 0)]]);
    g.fillRect(-1, -1, 2, 2);
    // the crescent, glowing from inside
    g.globalCompositeOperation = 'lighter';
    glow(g, -0.16, 0.06, 0.6, P.core, 0.22);
    g.globalCompositeOperation = 'source-over';
    const moon = new Path2D();
    moon.arc(-0.08, 0.04, 0.44, 0, Math.PI * 2);
    moon.arc(0.1, -0.07, 0.37, 0, Math.PI * 2, true);
    g.save();
    g.shadowColor = rgba(P.core, 0.9); g.shadowBlur = 18;
    g.fillStyle = linear(g, -0.5, -0.4, 0.2, 0.5, [[0, rgba(mix(P.core, WHITE, 0.45))], [1, rgba(mix(P.core, P.rim, 0.4))]]);
    g.fill(moon, 'nonzero');
    g.restore();
    g.strokeStyle = rgba(mix(P.rim, WHITE, 0.2), 0.55); g.lineWidth = 0.014; g.stroke(moon);
    star4(g, 0.4, -0.22, 0.11, 0.95, P.core);
    star4(g, 0.52, 0.18, 0.07, 0.85, P.core);
    star4(g, 0.26, 0.36, 0.06, 0.8, P.core);
    g.restore();
    outline(g, path, P, 0.3, 0.02);
    spec(g, -0.4, -0.44, 0.22, 0.12, -0.7, 0.75);
    g.fillStyle = rgba(WHITE, 0.95); g.beginPath(); g.arc(-0.44, -0.46, 0.035, 0, Math.PI * 2); g.fill();
  },

  seed(g, P, lod) {
    const body = shapeOf('seed');
    // sprout
    g.lineCap = 'round';
    g.strokeStyle = rgba(mix(P.rim, P.deep, 0.15)); g.lineWidth = 0.065;
    g.beginPath(); g.moveTo(0, -0.66); g.bezierCurveTo(0.02, -0.86, 0.2, -0.94, 0.16, -1.08); g.stroke();
    g.strokeStyle = rgba(mix(P.rim, WHITE, 0.4), 0.7); g.lineWidth = 0.02;
    g.beginPath(); g.moveTo(-0.01, -0.68); g.bezierCurveTo(0.0, -0.86, 0.17, -0.94, 0.14, -1.06); g.stroke();
    const leaf = (x, y, ang, s) => {
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
      const p = new Path2D(); p.moveTo(0, 0); p.quadraticCurveTo(0.16, -0.16, 0.42, 0); p.quadraticCurveTo(0.16, 0.14, 0, 0);
      g.fillStyle = linear(g, 0, 0, 0.42, 0, [[0, rgba(mix(P.rim, P.deep, 0.25))], [1, rgba(mix(P.core, WHITE, 0.2))]]);
      g.fill(p); g.strokeStyle = rgba(mix(P.core, WHITE, 0.4), 0.5); g.lineWidth = 0.02; g.stroke(p);
      g.restore();
    };
    leaf(0.07, -0.88, -0.5, 0.9); leaf(0.06, -0.8, Math.PI + 0.55, 0.7);
    g.lineCap = 'butt';
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0.15, -1.1, 0.16, P.core, 0.7); g.restore();
    // glass body
    g.fillStyle = radial(g, -0.2, 0.06, 0.04, 1.05, [[0, rgba(mix(P.light, WHITE, 0.15))], [0.45, rgba(mix(P.body, P.light, 0.25))], [0.8, rgba(P.body)], [1, rgba(P.deep)]]);
    g.fill(body);
    g.save();
    g.clip(body);
    g.globalCompositeOperation = 'lighter';
    glow(g, 0, 0.72, 0.6, P.core, 0.26);
    // the worries, settled at the bottom where they can be found again
    const grains = [[-0.3, 0.7, 0.05], [-0.16, 0.74, 0.06], [0, 0.7, 0.055], [0.15, 0.75, 0.05], [0.3, 0.7, 0.045], [-0.22, 0.62, 0.042], [-0.06, 0.6, 0.05], [0.1, 0.62, 0.045], [0.24, 0.6, 0.04], [-0.02, 0.82, 0.05], [0.14, 0.53, 0.035], [-0.14, 0.52, 0.035]];
    for (const [x, y, r] of (lod > 30 ? grains : grains.slice(0, 7))) {
      glow(g, x, y, r * 2.2, P.core, 0.22);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = radial(g, x - r * 0.3, y - r * 0.35, r * 0.1, r, [[0, rgba(mix(P.core, WHITE, 0.6))], [0.7, rgba(P.core)], [1, rgba(mix(P.core, P.body, 0.4))]]);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'lighter';
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = rgba(mix(P.light, WHITE, 0.3), 0.3); g.lineWidth = 0.016;
    g.beginPath(); g.moveTo(-0.6, 0.36); g.quadraticCurveTo(0, 0.44, 0.6, 0.36); g.stroke();
    g.restore();
    rimAndDepth(g, body, P, { lit: 0.6, dark: 0.45, w: 0.07 });
    outline(g, body, P, 0.38, 0.02);
    // cap
    const cap = new Path2D();
    cap.moveTo(-0.66, -0.26); cap.bezierCurveTo(-0.64, -0.62, -0.3, -0.78, 0, -0.76); cap.bezierCurveTo(0.3, -0.78, 0.64, -0.62, 0.66, -0.26); cap.quadraticCurveTo(0, -0.14, -0.66, -0.26); cap.closePath();
    g.fillStyle = linear(g, 0, -0.78, 0, -0.18, [[0, rgba(mix(P.deep, P.light, 0.32))], [1, rgba(mix(P.deep, BLACK, 0.15))]]);
    g.fill(cap);
    if (lod > 40) {
      g.save(); g.clip(cap); g.strokeStyle = rgba(P.light, 0.18); g.lineWidth = 0.014;
      for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(i * 0.13 - 0.3, -0.8); g.lineTo(i * 0.13 + 0.3, -0.16); g.stroke(); g.beginPath(); g.moveTo(i * 0.13 + 0.3, -0.8); g.lineTo(i * 0.13 - 0.3, -0.16); g.stroke(); }
      g.restore();
    }
    g.strokeStyle = rgba(mix(P.rim, WHITE, 0.3), 0.55); g.lineWidth = 0.02; g.stroke(cap);
    spec(g, -0.28, -0.6, 0.22, 0.06, -0.3, 0.45);
    spec(g, -0.36, 0.14, 0.07, 0.28, 0.12, 0.45);
    star4(g, -0.42, -0.08, 0.16, 0.7, mix(P.rim, WHITE, 0.5));
  },
};

// ---------------------------------------------------------------- sprites --
const SPRITES = new Map();
const SPRITE_MAX = 48;
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const mallowKey = (m) => (typeof m === 'string' ? m : m?.id || '');

/**
 * The static charm (halo, body, motif, glints) as a cached canvas. `size` is
 * the body diameter in CSS px; the canvas is CHARM_PAD × that, at `dpr`.
 * Sizes are bucketed (16 device px), so a garden of charms shares sprites.
 */
export function charmSprite(skillId, mallow, size = 96, dpr = 1) {
  const dev = Math.max(16, Math.ceil((size * Math.min(3, Math.max(1, dpr))) / 16) * 16);
  const key = `${skillId}|${mallowKey(mallow)}|${dev}`;
  const hit = SPRITES.get(key);
  if (hit) { SPRITES.delete(key); SPRITES.set(key, hit); return hit; }
  const side = Math.ceil(dev * CHARM_PAD);
  const c = mkCanvas(side, side);
  const g = c.getContext('2d');
  const P = charmPalette(skillId, mallow);
  const R = dev / 2;
  g.translate(side / 2, side / 2);
  g.scale(R, R);
  halo(g, P);
  (PAINT[P.family] || PAINT['star-seed'])(g, P, R);
  c.charm = { size: dev, side, family: P.family };
  SPRITES.set(key, c);
  while (SPRITES.size > SPRITE_MAX) SPRITES.delete(SPRITES.keys().next().value);
  return c;
}
export function clearCharmCache() { SPRITES.clear(); }

// a soft glow and a glint band, made once per context
const LIVE = new WeakMap();
function liveKit(g) {
  let k = LIVE.get(g);
  if (k) return k;
  const band = g.createLinearGradient(-0.32, 0, 0.32, 0);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  k = { band };
  LIVE.set(g, k);
  return k;
}
/** A four-point glint (soft core + thin rays) as a cached 64 px sprite, per colour. */
const STARS = new Map();
function starSprite(c) {
  const key = c.join(',');
  let s = STARS.get(key);
  if (s) return s;
  s = mkCanvas(64, 64);
  const g = s.getContext('2d');
  g.translate(32, 32); g.scale(31, 31);
  star4(g, 0, 0, 1, 1, c);
  if (STARS.size > 48) STARS.clear();
  STARS.set(key, s);
  return s;
}
const CORE_GLOW = new Map();
function coreGlow(c) {
  const key = c.join(',');
  let s = CORE_GLOW.get(key);
  if (s) return s;
  s = mkCanvas(64, 64);
  const g = s.getContext('2d');
  g.fillStyle = radial(g, 32, 32, 0, 32, [[0, rgba(c, 1)], [0.35, rgba(c, 0.45)], [1, rgba(c, 0)]]);
  g.fillRect(0, 0, 64, 64);
  CORE_GLOW.set(key, s);
  return s;
}

/**
 * Draw a charm centred at (x, y) with body diameter `size` (in g's current
 * units). t: seconds (breathing light, sparkles); glint: 0..1 sweep progress
 * or null; alpha; scale-free rotation `rot`; sparkle: twinkles around it.
 */
export function drawCharm(g, { skillId, mallow, x = 0, y = 0, size = 96, res = 0, t = 0, alpha = 1, glint = null, sparkle = true, rot = 0, dpr = 1, breathe = true } = {}) {
  if (alpha <= 0.002 || size < 2) return;
  const sprite = charmSprite(skillId, mallow, Math.max(size, res || 0), dpr);
  const side = size * CHARM_PAD;
  const P = charmPalette(skillId, mallow);
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.drawImage(sprite, -side / 2, -side / 2, side, side);
  const R = size / 2;
  if (breathe) {
    const b = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 4.2 + P.seed * 6);
    g.globalCompositeOperation = 'lighter';
    const prev = g.globalAlpha;
    g.globalAlpha = prev * (0.1 + 0.14 * b);
    const gs = R * 1.25;
    g.drawImage(coreGlow(P.core), -gs, -gs + (P.family === 'shell' ? R * 0.45 : P.family === 'seed' ? R * 0.5 : 0), gs * 2, gs * 2);
    g.globalAlpha = prev;
    g.globalCompositeOperation = 'source-over';
  }
  if (glint != null && glint > 0 && glint < 1) {
    const path = shapeOf(P.family);
    if (path) {
      const kit = liveKit(g);
      g.save();
      g.scale(R, R);
      g.clip(path);
      g.globalCompositeOperation = 'lighter';
      g.rotate(0.55);
      g.translate(-1.6 + glint * 3.2, 0);
      g.fillStyle = kit.band;
      g.fillRect(-0.32, -1.8, 0.64, 3.6);
      g.restore();
    }
  }
  if (sparkle) {
    g.globalCompositeOperation = 'lighter';
    const stars = starSprite(P.sparkle);
    for (let i = 0; i < 3; i++) {
      const a = P.seed * 6.28 + i * 2.2;
      const rr = R * (1.12 + 0.14 * ((i * 0.37 + P.seed) % 1));
      const tw = Math.max(0, Math.sin((t * Math.PI * 2) / (2.1 + i * 0.7) + i * 1.7 + P.seed * 9));
      const k = Math.min(1, Math.max(0.55, (R - 14) / 40));
      const a2 = tw * tw * 0.85;
      if (a2 <= 0.002) continue;
      const sr = R * (0.08 + 0.025 * i) * k;
      const prev = g.globalAlpha;
      g.globalAlpha = prev * a2;
      g.drawImage(stars, Math.cos(a) * rr - sr, Math.sin(a) * rr * 0.92 - sr, sr * 2, sr * 2);
      g.globalAlpha = prev;
    }
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

// ------------------------------------------------------------- live DOM --
// Every live charm canvas on the page draws from one ticker in the shared
// Mallow loop (rig.js), which runs only while something is live.
const LIVE_SET = new Set();
let ticking = false;
function tick(dt, seconds) {
  for (const c of LIVE_SET) {
    if (!c.el.isConnected) { if (++c.gone > 120) LIVE_SET.delete(c); continue; }
    c.gone = 0;
    c.draw(seconds);
  }
  if (!LIVE_SET.size) { removeTicker(tick); ticking = false; }
}
function goLive(handle) {
  LIVE_SET.add(handle);
  if (!ticking) { ticking = true; addTicker(tick); }
}

/**
 * A self-drawing <canvas> for DOM use (the "NEW TOOL SAVED" card, the garden's
 * open view, related-tool chips). `box` is the canvas's CSS size; the charm's
 * body is box / CHARM_PAD across. Reduced motion draws one still frame.
 */
export function charmCanvas({ skillId, mallow, box = 96, animate = true, reducedMotion = false, label = null, bob = true } = {}) {
  const el = document.createElement('canvas');
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  el.width = Math.round(box * dpr); el.height = Math.round(box * dpr);
  el.style.width = `${box}px`; el.style.height = `${box}px`;
  el.className = 'hm-charm';
  if (label) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', label); } else el.setAttribute('aria-hidden', 'true');
  const g = el.getContext('2d');
  const size = box / CHARM_PAD;
  const phase = Math.random() * 3;
  let glintAt = 0.6;
  const handle = {
    el, gone: 0,
    draw(t = 0) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, box, box);
      const still = reducedMotion || !animate;
      const tt = t + phase;
      // a slow glint every ~6 s; a gentle float
      let glint = null;
      if (!still) { const k = (tt - glintAt) / 1.3; if (k > 0 && k < 1) glint = k; else if (k >= 1) glintAt = tt + 4.5 + Math.random() * 3; }
      const dy = still || !bob ? 0 : Math.sin(tt * 1.1) * size * 0.025;
      drawCharm(g, { skillId, mallow, x: box / 2, y: box / 2 + dy, size, t: still ? 1.3 : tt, glint, sparkle: true, dpr, breathe: !still });
    },
    destroy() { LIVE_SET.delete(handle); if (!LIVE_SET.size && ticking) { removeTicker(tick); ticking = false; } },
  };
  if (reducedMotion || !animate) handle.draw(0);
  else { goLive(handle); handle.draw(performance.now() / 1000); }
  return handle;
}
