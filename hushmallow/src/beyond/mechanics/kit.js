// Shared drawing + physics kit for the ten Another Angle mechanics.
//
// Everything a mechanic draws goes through these helpers so the ten scenes
// share one look: translucent Thought Mallow jelly (rounder and simpler than
// the seven Mallows, never one of them), soft glows, calm springs, a fixed
// pool of motes. Sprites and gradients are made once per colour and size
// bucket and reused; nothing big is allocated per frame. No flashes: glows
// ease in over ≥0.3 s and nothing brightens the whole screen.
//
// Words on screen are DOM (textContent only) through makeTags(); canvas text
// is never used for the person's words.

import { h } from '../../app/ui.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
};
/** Frame-rate independent approach: x → target at rate k (1/s). */
export const approach = (x, target, k, dt) => x + (target - x) * (1 - Math.exp(-k * dt));
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// ------------------------------------------------------------- colours --
/** Thought tints per feeling: [light, deep] (soft, translucent, distinct from every Mallow's body). */
export const TINTS = Object.freeze({
  anger: ['#ff9d8c', '#ff4f6d'], anxiety: ['#b4e9ff', '#64aefc'], sadness: ['#a9bdff', '#6574ee'], overwhelm: ['#dcc2ff', '#9f70ff'],
  frustration: ['#ffc996', '#ff8f4a'], loneliness: ['#b0f2e6', '#4fc6b6'], restlessness: ['#ffeab0', '#ffbf3f'], shame: ['#ffc4dc', '#e2689e'],
  none: ['#ece2ff', '#ae96ff'],
});
const FAMILY = {
  anger: 'anger', frustration: 'frustration', irritation: 'frustration', resentment: 'anger', rage: 'anger', fury: 'anger',
  anxiety: 'anxiety', worry: 'anxiety', fear: 'anxiety', panic: 'anxiety', dread: 'anxiety', stress: 'anxiety', nervousness: 'anxiety',
  sadness: 'sadness', disappointment: 'sadness', hurt: 'sadness', grief: 'sadness', rejection: 'loneliness', loneliness: 'loneliness',
  overwhelm: 'overwhelm', overthinking: 'overwhelm', confusion: 'overwhelm', restlessness: 'restlessness', boredom: 'restlessness',
  shame: 'shame', embarrassment: 'shame', guilt: 'shame', humiliation: 'shame', jealousy: 'frustration', envy: 'frustration', insecurity: 'shame',
};
export function tintFor(emotion) { return TINTS[FAMILY[emotion] || emotion] || TINTS.none; }
/** Another Angle's own light: fact (cool), the mind's addition (warm magenta), calm (gold). */
export const LIGHT = Object.freeze({ fact: ['#c9fbff', '#3fd6ee'], guess: ['#ffc6ee', '#e04fbf'], calm: ['#fff1c9', '#ffc35c'], steel: ['#d9dcf2', '#6d6f98'], ember: ['#ffd4a8', '#ff6a3d'] });

const hexRgb = (hex) => { const v = parseInt(String(hex).slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
export const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${Math.round(clamp(a) * 1000) / 1000})`; };
export function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `#${[0, 1, 2].map((i) => Math.round(lerp(A[i], B[i], clamp(t))).toString(16).padStart(2, '0')).join('')}`;
}

/** Low stimulation (Settings): fewer motes, softer glows, everywhere at once. */
let LOW = false;
export function setLowStim(b) { LOW = !!b; }

// ------------------------------------------------------------- sprites --
const SPRITES = new Map();
const mkCanvas = (w, hgt) => { const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, hgt) : Object.assign(document.createElement('canvas'), { width: w, height: hgt }); return c; };
const JELLY_PX = 192;
/** A lit jelly sphere (body, inner bounce light, rim, specular), drawn once per tint. */
export function jellySprite(light, deep) {
  const key = `j|${light}|${deep}`;
  let c = SPRITES.get(key);
  if (c) return c;
  c = mkCanvas(JELLY_PX, JELLY_PX);
  const g = c.getContext('2d');
  const R = JELLY_PX / 2;
  g.translate(R, R);
  const r = R - 3;
  // body
  let gr = g.createRadialGradient(-r * 0.3, -r * 0.36, r * 0.06, 0, 0, r);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)');
  gr.addColorStop(0.32, rgba(light, 0.92));
  gr.addColorStop(0.78, rgba(deep, 0.86));
  gr.addColorStop(1, rgba(mix(deep, '#120a38', 0.35), 0.9));
  g.fillStyle = gr;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  // light bouncing up inside the jelly
  gr = g.createRadialGradient(0, r * 0.62, 0, 0, r * 0.55, r * 0.75);
  gr.addColorStop(0, rgba(light, 0.55)); gr.addColorStop(1, rgba(light, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  // rim light
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2.2;
  g.beginPath(); g.arc(0, 0, r - 2, Math.PI * 1.08, Math.PI * 1.72); g.stroke();
  g.strokeStyle = rgba(light, 0.5); g.lineWidth = 1.6;
  g.beginPath(); g.arc(0, 0, r - 1.5, Math.PI * 0.15, Math.PI * 0.62); g.stroke();
  // specular
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(-r * 0.38, -r * 0.46, r * 0.2, r * 0.11, -0.55, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.beginPath(); g.arc(-r * 0.12, -r * 0.6, r * 0.045, 0, TAU); g.fill();
  SPRITES.set(key, c);
  return c;
}
/** A soft round glow (colour → transparent), drawn once per colour. */
export function glowSprite(colour, falloff = 1) {
  const key = `g|${colour}|${falloff}`;
  let c = SPRITES.get(key);
  if (c) return c;
  c = mkCanvas(128, 128);
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, rgba(colour, 0.85));
  gr.addColorStop(0.28 * falloff, rgba(colour, 0.42));
  gr.addColorStop(0.65, rgba(colour, 0.1));
  gr.addColorStop(1, rgba(colour, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  SPRITES.set(key, c);
  return c;
}
export function drawGlow(g, x, y, r, colour, alpha = 1) {
  if (LOW) alpha *= 0.6;
  if (alpha <= 0.004 || r <= 0.5) return;
  g.globalAlpha = clamp(alpha);
  g.drawImage(glowSprite(colour), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

// --------------------------------------------------------------- faces --
/**
 * A Thought Mallow's simple face. face: { tension 0..1, calm 0..1, sad 0..1,
 * cross 0..1, surprise 0..1, blink 0..1 (1 = shut), lookX, lookY, press 0..1 }.
 */
export function drawFace(g, x, y, r, face = {}, alpha = 1) {
  const { tension = 0.4, calm = 0, sad = 0, cross = 0, surprise = 0, blink = 0, lookX = 0, lookY = 0, press = 0 } = face;
  g.save();
  g.translate(x, y);
  g.globalAlpha = 0.92 * alpha;
  const ex = r * 0.27, ey = -r * 0.04 + sad * r * 0.05, er = r * (0.085 + surprise * 0.02);
  const lx = lookX * r * 0.06, ly = lookY * r * 0.05;
  const open = clamp(1 - blink) * (1 - press * 0.45) * (calm > 0.85 ? 0.35 : 1);
  g.fillStyle = '#21123e';
  for (const s of [-1, 1]) {
    g.beginPath();
    if (open < 0.2) {
      // closed, content eyes: a soft arc
      g.lineWidth = Math.max(1.4, r * 0.045); g.strokeStyle = '#21123e'; g.lineCap = 'round';
      g.arc(s * ex + lx, ey + ly, er * 1.15, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    } else {
      g.ellipse(s * ex + lx, ey + ly, er, er * open, 0, 0, TAU); g.fill();
      if (open > 0.5) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(s * ex + lx - er * 0.32, ey + ly - er * 0.35, er * 0.32, 0, TAU); g.fill(); g.fillStyle = '#21123e'; }
    }
  }
  // brows: worry lifts the inner ends, crossness drops them, calm lets them go
  const bw = clamp(tension * (1 - calm));
  if (bw > 0.05 || cross > 0.05) {
    g.globalAlpha = 0.7 * alpha * clamp(bw + cross);
    g.strokeStyle = '#21123e'; g.lineCap = 'round'; g.lineWidth = Math.max(1.4, r * 0.05);
    for (const s of [-1, 1]) {
      const inner = (sad > 0.3 ? -1 : 1) * (cross * 1.2 - bw * 0.6);
      g.beginPath();
      g.moveTo(s * (ex + er * 1.6), ey - er * 2.4 - inner * er * 0.3);
      g.lineTo(s * (ex - er * 1.4), ey - er * 2.4 + inner * er * 0.9);
      g.stroke();
    }
  }
  // mouth: a frown that eases into a small smile as it calms
  g.globalAlpha = 0.86 * alpha;
  g.strokeStyle = '#21123e'; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, r * 0.05);
  const smile = lerp(-0.8 - sad * 0.3, 0.6, clamp(calm * 1.1 + (1 - tension) * 0.25));
  g.beginPath();
  if (surprise > 0.4) { g.ellipse(0, r * 0.27, r * 0.07, r * 0.09 * surprise, 0, 0, TAU); g.stroke(); }
  else { g.moveTo(-r * 0.13, r * 0.26); g.quadraticCurveTo(0, r * 0.26 + smile * r * 0.13, r * 0.13, r * 0.26); g.stroke(); }
  // cheeks: pink while pressed or calm
  const blush = clamp(press * 1.2 + calm * 0.6);
  if (blush > 0.05) {
    g.globalAlpha = blush * 0.42 * alpha;
    g.fillStyle = '#ff8fc8';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.45, r * 0.16, r * 0.12, r * 0.07, 0, 0, TAU); g.fill(); }
  }
  g.restore();
}

/**
 * A Thought Mallow jelly: j = { x, y, r, sx, sy, rot, light, deep, alpha, glow, face, faceAlpha }.
 * sx/sy squash (1 = round), rot in radians. The face rides the squash.
 */
export function drawJelly(g, j) {
  const { x, y, r, sx = 1, sy = 1, rot = 0, light, deep, alpha = 1, glow = 0.45, face = null, faceAlpha = 1 } = j;
  if (r <= 0.5 || alpha <= 0.004) return;
  if (glow > 0) drawGlow(g, x, y, r * 1.85, deep, glow * alpha);
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.scale(sx, sy);
  g.globalAlpha = alpha;
  g.drawImage(jellySprite(light, deep), -r * 1.016, -r * 1.016, r * 2.032, r * 2.032);
  g.restore();
  if (face) drawFace(g, x, y + r * (1 - sy) * 0.4, r * Math.min(sx, 1.08), face, alpha * faceAlpha);
}

/** A draggable jelly body with springs (home, squash, wobble). */
export class Blob {
  constructor({ x = 0, y = 0, r = 36, light = TINTS.none[0], deep = TINTS.none[1] } = {}) {
    Object.assign(this, { x, y, r, hx: x, hy: y, vx: 0, vy: 0, sq: 0, sqV: 0, rot: 0, light, deep, press: null, alpha: 1, scale: 1, k: 26, d: 7.5, wob: 0 });
  }
  hit(px, py, pad = 1.3) { return dist(px, py, this.x, this.y) < this.r * this.scale * pad; }
  grab(e) { this.press = { id: e.id, ox: this.x - e.x, oy: this.y - e.y, x0: e.x, y0: e.y, t0: e.t || performance.now(), moved: 0 }; this.sqV += 1.6; }
  drag(e) { if (!this.press || this.press.id !== e.id) return false; this.press.moved = Math.max(this.press.moved, dist(e.x, e.y, this.press.x0, this.press.y0)); this.hx = e.x + this.press.ox; this.hy = e.y + this.press.oy; return true; }
  drop(e) { if (!this.press || (e && this.press.id !== e.id)) return null; const p = this.press; this.press = null; this.sqV -= 2.2; return p; }
  /** One frame of springs; reduced motion settles at once. */
  step(dt, rm = false) {
    if (rm) { this.x = this.hx; this.y = this.hy; this.sq = this.press ? 0.12 : 0; this.sqV = 0; return; }
    const k = this.press ? 140 : this.k, d = this.press ? 20 : this.d;
    this.vx += ((this.hx - this.x) * k - this.vx * d) * dt; this.vy += ((this.hy - this.y) * k - this.vy * d) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const goal = this.press ? 0.14 : 0;
    this.sqV += ((goal - this.sq) * 170 - this.sqV * 10) * dt;
    this.sq += this.sqV * dt;
    // velocity leans the jelly a little (it trails the finger)
    this.rot = approach(this.rot, clamp(this.vx / 2400, -0.18, 0.18), 8, dt);
  }
  get sx() { return (1 + this.sq * 0.9) * this.scale; }
  get sy() { return (1 - this.sq) * this.scale; }
  draw(g, face, extra = {}) {
    drawJelly(g, { x: this.x, y: this.y, r: this.r, sx: this.sx, sy: this.sy, rot: this.rot, light: this.light, deep: this.deep, alpha: this.alpha, face, ...extra });
  }
}

// -------------------------------------------------------------- timers --
/**
 * Delays that run on the scene's own clock (frame dt), not setTimeout: they
 * pause with the loop (a hidden tab), never fire after destroy, and replay
 * exactly in tests. after(fn, ms) (setTimeout's order) → id; step(dt) in frame(); clear().
 */
export class Timers {
  constructor() { this.list = []; }
  after(fn, ms = 0) { this.list.push({ left: Math.max(0, ms) / 1000, fn }); return this.list.length; }
  step(dt) {
    if (!this.list.length) return;
    const due = [];
    for (const t of this.list) { t.left -= dt; if (t.left <= 0) due.push(t); }
    if (!due.length) return;
    this.list = this.list.filter((t) => t.left > 0);
    for (const t of due) { try { t.fn(); } catch (e) { console.warn('[mechanic timer]', e?.message); } }
  }
  clear() { this.list.length = 0; }
}

// --------------------------------------------------------------- motes --
/** A fixed pool of soft particles (no allocation after construction). */
export class Motes {
  constructor(n = 48) {
    this.n = n;
    this.x = new Float32Array(n); this.y = new Float32Array(n); this.vx = new Float32Array(n); this.vy = new Float32Array(n);
    this.life = new Float32Array(n); this.max = new Float32Array(n); this.size = new Float32Array(n);
    this.col = new Array(n).fill('#ffffff');
    this.i = 0;
  }
  burst(x, y, colour, count = 8, { speed = 60, size = 3, life = 1.2, up = 20 } = {}) {
    if (LOW) count = Math.min(count, 2);
    for (let k = 0; k < count; k++) {
      const i = this.i = (this.i + 1) % this.n;
      const a = (k / count) * TAU + (i % 7) * 0.4;
      const s = speed * (0.4 + ((i * 37) % 11) / 11 * 0.6);
      this.x[i] = x; this.y[i] = y; this.vx[i] = Math.cos(a) * s; this.vy[i] = Math.sin(a) * s - up;
      this.life[i] = life * (0.7 + ((i * 13) % 7) / 7 * 0.3); this.max[i] = this.life[i]; this.size[i] = size * (0.6 + ((i * 5) % 5) / 5 * 0.7);
      this.col[i] = colour;
    }
  }
  /** → true while any mote lives. */
  draw(g, dt) {
    let alive = false;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      alive = true;
      this.life[i] -= dt;
      this.vx[i] *= 1 - 1.6 * dt; this.vy[i] = this.vy[i] * (1 - 1.6 * dt) - 12 * dt;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
      const k = clamp(this.life[i] / this.max[i]);
      drawGlow(g, this.x[i], this.y[i], this.size[i] * 3.2, this.col[i], k * k * 0.9);
    }
    return alive;
  }
  get busy() { for (let i = 0; i < this.n; i++) if (this.life[i] > 0) return true; return false; }
}

// ---------------------------------------------------------------- tags --
/**
 * DOM labels over the canvas (textContent only, never canvas text for words).
 * kinds: 'words' (the person's own words, voice type), 'label' (a short UI
 * label with a coloured dot), 'line' (a short authored line on an object).
 */
export function makeTags(root) {
  const list = new Set();
  return {
    add(text, { kind = 'label', colour = null, max = 230 } = {}) {
      const el = h('div', { class: `bx-tag ${kind}`, 'aria-hidden': kind === 'words' ? 'false' : 'true', style: { maxWidth: `min(${max}px, 62vw)` } });
      if (colour) el.style.setProperty('--bx-dot', colour);
      el.textContent = String(text ?? '');
      root.append(el);
      let shown = false, lx = -1e4, ly = -1e4, lastO = -1;
      const tag = {
        el,
        get w() { return el.offsetWidth; }, get h() { return el.offsetHeight; },
        /** Place by anchor: 'top' (centred above x,y), 'bottom' (centred below), 'center'. Kept 12px inside the screen. */
        at(x, y, anchor = 'bottom', opacity = 1) {
          const w = el.offsetWidth || 120, hh = el.offsetHeight || 36;
          const edge = innerWidth < 360 ? 10 : 16;
          let px = clamp(x - w / 2, edge, Math.max(edge, innerWidth - edge - w));
          let py = anchor === 'top' ? y - hh : anchor === 'center' ? y - hh / 2 : y;
          py = clamp(py, 8, innerHeight - hh - 8);
          px = Math.round(px); py = Math.round(py);
          if (px !== lx || py !== ly) { el.style.transform = `translate3d(${px}px, ${py}px, 0)`; lx = px; ly = py; }
          const o = Math.round(clamp(opacity) * 100) / 100;
          if (o !== lastO) { el.style.opacity = String(o); lastO = o; }
          if (!shown) { shown = true; el.classList.add('in'); }
          return tag;
        },
        rect() { const w = el.offsetWidth, hh = el.offsetHeight; return lastO > 0.05 ? { left: lx, top: ly, right: lx + w, bottom: ly + hh } : null; },
        set(t) { if (el.textContent !== t) el.textContent = t; return tag; },
        hide() { el.style.opacity = '0'; lastO = 0; return tag; },
        remove() { el.remove(); list.delete(tag); },
      };
      list.add(tag);
      return tag;
    },
    rects() { const out = []; for (const t of list) { const r = t.rect(); if (r) out.push(r); } return out; },
    clear() { for (const t of [...list]) t.remove(); },
  };
}

// ------------------------------------------------------------ geometry --
export function roundRect(g, x, y, w, hgt, r) {
  const rr = Math.min(r, w / 2, hgt / 2);
  g.beginPath();
  g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + hgt, rr); g.arcTo(x + w, y + hgt, x, y + hgt, rr);
  g.arcTo(x, y + hgt, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath();
}
/** A rect {left, top, right, bottom} around a circle, padded. */
export const circleRect = (x, y, r, pad = 6) => ({ left: x - r - pad, top: y - r - pad, right: x + r + pad, bottom: y + r + pad });
/** A blink envelope from time and a phase (closed for ~0.12 s every few seconds). */
export const blinkAt = (t, phase = 0, every = 4.2) => { const k = (t + phase) % every; return k < 0.12 ? 1 - Math.abs(k - 0.06) / 0.06 : 0; };
