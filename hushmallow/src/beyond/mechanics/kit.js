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
/** The viewport's width (390 where there is none, as in the node tests). */
export const viewW = () => (typeof innerWidth === 'number' ? innerWidth : 390);

// ------------------------------------------------------------- colours --
/** Thought tints per feeling: [light, deep] (soft, translucent, distinct from every Mallow's body). */
export const TINTS = Object.freeze({
  anger: ['#ff9d8c', '#ff4f6d'], anxiety: ['#b4e9ff', '#64aefc'], sadness: ['#a9bdff', '#6574ee'], overwhelm: ['#dcc2ff', '#9f70ff'],
  frustration: ['#ffc996', '#ff8f4a'], loneliness: ['#b0f2e6', '#4fc6b6'], restlessness: ['#ffeab0', '#ffbf3f'], shame: ['#ffc4dc', '#e2689e'],
  none: ['#ece2ff', '#ae96ff'],
});
const FAMILY = {
  anger: 'anger', frustration: 'frustration', irritation: 'frustration', resentment: 'anger', rage: 'anger', fury: 'anger',
  provoked: 'anger', annoyance: 'frustration', annoyed: 'frustration', outrage: 'anger', betrayal: 'anger', betrayed: 'anger', indignation: 'anger', contempt: 'anger', bitterness: 'anger',
  anxiety: 'anxiety', worry: 'anxiety', fear: 'anxiety', panic: 'anxiety', dread: 'anxiety', stress: 'anxiety', nervousness: 'anxiety', insecure: 'anxiety', uncertainty: 'anxiety', apprehension: 'anxiety',
  sadness: 'sadness', disappointment: 'sadness', hurt: 'sadness', grief: 'sadness', rejection: 'loneliness', loneliness: 'loneliness', heartbreak: 'sadness', regret: 'sadness', hopelessness: 'sadness',
  overwhelm: 'overwhelm', overthinking: 'overwhelm', confusion: 'overwhelm', restlessness: 'restlessness', boredom: 'restlessness', impatience: 'restlessness',
  shame: 'shame', embarrassment: 'shame', guilt: 'shame', humiliation: 'shame', jealousy: 'frustration', envy: 'frustration', insecurity: 'shame', inadequacy: 'shame',
  // the calmer readings never tint a troubled thought on their own (see another-angle.js lookFor): they read as plain
  relief: 'none', calm: 'none', contentment: 'none', hope: 'none', gratitude: 'none', joy: 'none', neutral: 'none',
};
/** The feeling family an emotion id belongs to ('none' when it has no troubled tint). */
export function familyOf(emotion) { return FAMILY[emotion] || (TINTS[emotion] ? emotion : 'none'); }
export function tintFor(emotion) { return TINTS[familyOf(emotion)] || TINTS.none; }
/** The living jellies' light for fact versus assumption (W2 tint shape): what happened is cool, what the mind added warm. */
export const W2_TINT = Object.freeze({
  fact: Object.freeze({ light: '#e4fdff', mid: '#8fe6f2', deep: '#2aaec6', glow: '#c9fbff', ink: '#0a2830' }),
  guess: Object.freeze({ light: '#ffe2f4', mid: '#ff9ad8', deep: '#d84aae', glow: '#ffd0ec', ink: '#3a0b2c' }),
});
/** Feelings whose own light is warm enough to stand apart from the cool fact (the others take the guess's magenta). */
export const WARM_FAMILIES = new Set(['anger', 'frustration', 'shame', 'overwhelm', 'restlessness']);
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
/**
 * The Thought Mallow silhouette: a soft superellipse (the family of W2's
 * Thought Mallows, src/mallows/thought/styles.js SHAPE: rounder than the
 * seven Mallows, a little wider than tall, a softly flattened base).
 */
export function jellyPath(g, r, n = 2.3) {
  const e = 2 / n;
  g.beginPath();
  for (let i = 0; i <= 56; i++) {
    const t = (i / 56) * TAU;
    const c = Math.cos(t), sn = Math.sin(t);
    const x = Math.sign(c) * Math.abs(c) ** e * r;
    let y = Math.sign(sn) * Math.abs(sn) ** e * r * 0.95;
    if (y > 0) y *= 1 - 0.08 * (y / r) ** 6;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
}
/** A lit jelly body (body, inner bounce light, rim, specular), drawn once per tint. */
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
  let gr = g.createRadialGradient(-r * 0.3, -r * 0.36, r * 0.06, 0, 0, r * 1.08);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)');
  gr.addColorStop(0.32, rgba(light, 0.92));
  gr.addColorStop(0.78, rgba(deep, 0.86));
  gr.addColorStop(1, rgba(mix(deep, '#120a38', 0.35), 0.9));
  g.fillStyle = gr;
  jellyPath(g, r); g.fill();
  g.save();
  jellyPath(g, r); g.clip();
  // light bouncing up inside the jelly
  gr = g.createRadialGradient(0, r * 0.62, 0, 0, r * 0.55, r * 0.75);
  gr.addColorStop(0, rgba(light, 0.55)); gr.addColorStop(1, rgba(light, 0));
  g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2);
  g.restore();
  // rim light: bright at the top left, fading round the body
  gr = g.createLinearGradient(-r, -r, r, r);
  gr.addColorStop(0, 'rgba(255,255,255,0.7)'); gr.addColorStop(0.45, rgba(light, 0.25)); gr.addColorStop(1, rgba(light, 0.4));
  g.strokeStyle = gr; g.lineWidth = 2;
  jellyPath(g, r - 1.5); g.stroke();
  // specular
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(-r * 0.4, -r * 0.48, r * 0.21, r * 0.11, -0.5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.beginPath(); g.arc(-r * 0.12, -r * 0.62, r * 0.045, 0, TAU); g.fill();
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

/**
 * The person's own Thought Mallow inside a mechanic. Its springs are a Blob's
 * (home, drag, squash), so every mechanic moves it the same way; its look is
 * W2's Thought Mallow (src/mallows/thought: the same expressive, soft-body,
 * feeling-styled jelly the person watched while Zuzu was exploring) when the
 * scene hands one in (w2 = { create, draw }), else the kit's own jelly.
 *
 * The mechanic writes where it is (x, y, scale) and how it feels (the face's
 * tension and calm → the thought's state) every frame; W2 adds its own life
 * on top (breathing, the feeling's motion, the jelly's slosh when it is moved)
 * and dents under a finger (grab / drag / drop / poke / pointer forward the
 * touch to it). extra.squash (0..1) flattens it onto its base (a weight on it).
 */
export class ThoughtBody extends Blob {
  constructor(o = {}, w2 = null) {
    super(o);
    this.w2 = null; this.drawW2 = null; this.touchId = null; this._dt = 1 / 60; this._rm = false;
    // the person's reduced-motion setting (a mechanic may pin the body with step(dt, true) without meaning it)
    this.rmFn = typeof o.rmFn === 'function' ? o.rmFn : null;
    if (w2 && typeof w2.create === 'function' && typeof w2.draw === 'function') {
      try {
        // a mechanic may light the jelly its own way (o.tint: W2's { light, mid, deep, glow, ink }), keeping the feeling's motion and face
        // (its own id too: W2 caches a palette per style id, and this one must not share the feeling's)
        const base = o.tint && typeof w2.style === 'function' ? w2.style(o.emotion || 'anxiety') : null;
        const style = base ? { ...base, tint: o.tint, id: `${base.id}~${o.tint.deep}` } : undefined;
        this.w2 = w2.create({ text: o.text || '', emotion: o.emotion || 'anxiety', intensity: o.intensity ?? 0.7, r: o.w2r || this.r, x: this.x, y: this.y, reducedMotion: !!o.reducedMotion, lowStim: !!o.lowStim, siblings: 0, haptic: o.haptic || null, ...(style ? { style } : {}) });
        this.drawW2 = w2.draw;
      } catch (e) { console.info('[another angle] Thought Mallow unavailable here; the kit jelly stands in', e?.message); this.w2 = null; }
    }
    this.env = { now: 0, rm: false, low: false, bounds: o.bounds || null, away: null };
    this.opts = { ox: 0, oy: 0, rm: false, low: false, q: 0, light: false };
  }
  get living() { return !!this.w2; }
  step(dt, rm = false) { super.step(dt, rm); this._dt = dt; this._rm = rm; }
  /** A finger on it (no carrying): it dents, then the up / cancel comes through pointer(). */
  poke(e) {
    if (this.w2) { try { this.w2.pointer({ type: 'down', id: e.id, x: e.x, y: e.y, t: e.t }); this.touchId = e.id; } catch { /* the jelly is decoration */ } }
    else this.sqV += 2;
  }
  /** The rest of a poke (move / up / cancel for the same finger). True when it was this thought's. */
  pointer(e) {
    if (!this.w2 || this.touchId == null || e.id !== this.touchId) return false;
    try { this.w2.pointer(e); } catch { /* ignore */ }
    if (e.type === 'up' || e.type === 'cancel') this.touchId = null;
    return true;
  }
  grab(e) { super.grab(e); this.poke(e); }
  drag(e) { const ok = super.drag(e); if (ok && this.w2 && this.touchId === e.id) { try { this.w2.pointer(e); } catch { /* ignore */ } } return ok; }
  drop(e) {
    const p = super.drop(e);
    if (p && this.w2 && this.touchId != null) { try { this.w2.pointer({ type: 'up', id: this.touchId, x: e?.x ?? this.x, y: e?.y ?? this.y, t: e?.t ?? performance.now() }); } catch { /* ignore */ } this.touchId = null; }
    return p;
  }
  draw(g, face = {}, extra = {}) {
    const th = this.w2;
    if (!th) {
      const sq = extra.squash || 0;
      return super.draw(g, face, sq ? { sx: this.sx * (1 + sq * 0.9), sy: this.sy * (1 - sq), ...extra } : extra);
    }
    th.x = this.x; th.y = this.y;
    th.scale = Math.max(0.05, this.scale);
    // the mechanic's mood (a written value wins in W2's state for half a second; written every frame)
    th.state.tension = clamp(face.tension ?? 0.4);
    th.state.calm = clamp(face.calm ?? 0);
    if (extra.rot) th.rot = extra.rot;
    const env = this.env;
    const rmNow = this.rmFn ? !!this.rmFn() : this._rm;
    env.now = performance.now() / 1000; env.rm = rmNow; env.low = LOW;
    try { th.step(this._dt, env); } catch (e) { console.info('[another angle] Thought Mallow step', e?.message); this.w2 = null; return this.draw(g, face, extra); }
    const a = extra.alpha ?? this.alpha;
    if (a < 1) th.render.alpha *= clamp(a);
    if (th.render.alpha <= 0.004) return;
    const o = this.opts;
    o.rm = rmNow; o.low = LOW;
    const sq = extra.squash || 0;
    if (sq > 0.002) {
      // flattened onto its base (the weight on its head), never through it
      const by = this.y + this.r * this.scale * 0.95;
      g.save(); g.translate(this.x, by); g.scale(1 + sq * 0.9, 1 - sq); g.translate(-this.x, -by);
      this.drawW2(g, th, o);
      g.restore();
    } else this.drawW2(g, th, o);
  }
  destroy() { try { this.w2?.destroy(); } catch { /* ignore */ } this.w2 = null; }
}
/**
 * The person's Thought Mallow for a mechanic: the scene's living one (ctx.thought), else the kit's jelly in
 * the feeling's tint (Node tests, or W2's module unavailable).
 */
export function thoughtFor(ctx, o = {}) {
  if (typeof ctx.thought === 'function') { const t = ctx.thought(o); if (t) return t; }
  const [light, deep] = tintFor(ctx.emotion);
  return new ThoughtBody({ light, deep, rmFn: ctx.reducedMotion, ...o });
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
    const L = this.list;
    if (!L.length) return;
    let any = false;
    for (let i = 0; i < L.length; i++) { L[i].left -= dt; if (L[i].left <= 0) any = true; }
    if (!any) return;
    // the due ones leave the list first (in order, compacted in place), then run: a timer may add another
    const due = this.due || (this.due = []);
    due.length = 0;
    let n = 0;
    for (let i = 0; i < L.length; i++) { const t = L[i]; if (t.left <= 0) due.push(t); else L[n++] = t; }
    L.length = n;
    for (let i = 0; i < due.length; i++) { try { due[i].fn(); } catch (e) { console.warn('[mechanic timer]', e?.message); } }
    due.length = 0;
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
/** How much two rects {left, top, right, bottom} overlap (px²). */
export function overlapArea(a, b) {
  if (!a || !b) return 0;
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  if (w <= 0) return 0;
  const hh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return hh > 0 ? w * hh : 0;
}
const cover = (L, T, R, B, o) => {
  const w = Math.min(R, o.right) - Math.max(L, o.left);
  if (w <= 0) return 0;
  const hh = Math.min(B, o.bottom) - Math.max(T, o.top);
  return hh > 0 ? w * hh : 0;
};
// where a tag may move to dodge something (px from where its object wants it): small moves first
const DY = [0, -8, 8, -16, 16, -24, 24, -38, 38, -52, 52, -68, 68, -86, 86];
const DX = [0, -8, 8, -16, 16, -24, 24, -32, 32, -52, 52, -78, 78, -108, 108];
const GAP = 6;
/**
 * How far (px, each way) the collision pass may move a tag of each kind from where its object wants it.
 * A label names its object (a bowl, a jelly, a guess): moved further it would read as the next object's,
 * so it stays within a short reach and the others make way for it. A possibility or a card may lean a
 * little more; the person's own words under a thought a little more again.
 */
export const TIE = Object.freeze({ label: 24, card: 28, line: 32, words: 48, verdict: 0, piece: 0 });

/**
 * DOM labels over the canvas (textContent only, never canvas text for words).
 * kinds: 'words' (the person's own words, voice type), 'label' (a short UI
 * label with a coloured dot), 'line' (a short authored line on an object),
 * 'card' (a label title over a short line: one tag, one box), 'piece' and
 * 'verdict' (text drawn on an object: they stay where the object puts them).
 *
 * Each mechanic places its tags by anchor (at), then the scene calls
 * layout(dt, obstacles) once a frame: a collision pass that keeps every
 * visible tag off the other tags, the subtitle band and its control pill, the
 * Mallows and the scene's own bodies, moving each as little as it can (and
 * easing there, with a little stickiness so nothing jitters), and never
 * further than its tie (TIE by kind, or { tie }): a label stays by the object
 * it names. Tags that name something claim their place first (higher
 * { priority }, then the tighter tie, then the order added); the rest make way.
 *
 * A tag may say which object it belongs to (own(x, y), default: its anchor)
 * and a { group } of tags that name like objects (the four bowls): ties()
 * lists them so a check can prove each label sits nearest its own object.
 * Text the screen reader should hear (cards, possibilities, labels: everything
 * but the decoration) is announced through `announce` when it first shows.
 */
export function makeTags(root, { bounds = null, announce = null } = {}) {
  const list = new Set();
  const order = [];
  const sizes = () => { for (const t of list) { t.invalidate(); t.measure(); } };
  // scratch boxes for the collision pass (reused every frame)
  const boxes = [], probe = {};
  const slot = (i) => (boxes[i] ||= { left: 0, top: 0, right: 0, bottom: 0 });
  let frames = 0;
  const rank = (t) => t.priority * 1000 - t.tie;
  return {
    add(text, { kind = 'label', colour = null, max = 230, title = null, priority = 0, fixed = kind === 'piece', cls = '', tie = TIE[kind] ?? 108, group = null, say = kind !== 'piece' && kind !== 'words' } = {}) {
      // the person's own words stay readable where they are; everything else is heard (once) as it appears
      const el = h('div', { class: `bx-tag ${kind}${cls ? ` ${cls}` : ''}`, 'aria-hidden': kind === 'words' ? 'false' : 'true', style: { maxWidth: `min(${max}px, ${innerWidth < 360 ? 90 : 62}vw)` } });
      if (colour) el.style.setProperty('--bx-dot', colour);
      let body = el;
      if (title != null) {
        const head = h('span', { class: 'bx-card-title' });
        head.textContent = String(title);
        body = h('span', { class: 'bx-card-text' });
        el.append(head, body);
      }
      body.textContent = String(text ?? '');
      root.append(el);
      let shown = false, heard = false, lx = -1e4, ly = -1e4, lastO = -1, w = 0, hh = 0, dirty = true;
      // where the object wants it (dx, dy: where the collision pass moved it, eased); own: the object it names
      let wx = -1e4, wy = -1e4, ox = 0, oy = 0, tx = 0, ty = 0, placed = false, ownX = NaN, ownY = NaN, anchorX = 0, anchorY = 0;
      const write = () => {
        const px = Math.round(wx + ox), py = Math.round(wy + oy);
        if (px !== lx || py !== ly) { el.style.transform = `translate3d(${px}px, ${py}px, 0)`; lx = px; ly = py; }
      };
      const clampY = (py) => {
        // inside the play area when there is one (never over the Mallows below it or the subtitle band above)
        const B = bounds?.();
        if (B) py = clamp(py, B.y, Math.max(B.y, B.y + B.h - hh));
        return clamp(py, 8, innerHeight - hh - 8);
      };
      const clampX = (px) => { const edge = innerWidth < 360 ? 10 : 16; return clamp(px, edge, Math.max(edge, innerWidth - edge - w)); };
      const spoken = () => (title != null ? `${title}: ${body.textContent}` : body.textContent);
      const tag = {
        el, kind, priority, fixed, tie: fixed ? 0 : Math.max(0, tie), group,
        measure() { if (dirty || !w) { w = el.offsetWidth || 120; hh = el.offsetHeight || 36; dirty = false; } },
        get w() { tag.measure(); return w; }, get h() { tag.measure(); return hh; },
        get visible() { return lastO > 0.05; },
        /** Placed at least once (an object it names exists on the stage, shown or not yet). */
        get placedOnce() { return shown; },
        /**
         * Place by anchor: 'top' (centred above x,y), 'bottom' (centred below), 'center'; 'left' / 'right'
         * (starting / ending at x, centred on y), 'leftTop' (starting at x, ending above y). Kept inside the screen.
         */
        at(x, y, anchor = 'bottom', opacity = 1) {
          tag.measure();
          anchorX = x; anchorY = y;
          const side = anchor === 'left' || anchor === 'leftTop' ? x : anchor === 'right' ? x - w : x - w / 2;
          wx = clampX(side);
          wy = clampY(anchor === 'top' || anchor === 'leftTop' ? y - hh : anchor === 'center' || anchor === 'left' || anchor === 'right' ? y - hh / 2 : y);
          write();
          const o = Math.round(clamp(opacity) * 100) / 100;
          if (o !== lastO) { el.style.opacity = String(o); lastO = o; }
          if (!shown) { shown = true; el.classList.add('in'); }
          if (!heard && o > 0.5 && say && announce) { heard = true; announce(spoken()); }
          return tag;
        },
        /** The object this tag names (for ties()); without it, the anchor point. */
        own(x, y) { ownX = x; ownY = y; return tag; },
        /** The box it would have at offset (dx, dy) from where its object wants it, written into `out`. */
        boxAt(dx, dy, out = {}) {
          const px = clampX(wx + dx), py = clampY(wy + dy);
          out.left = px; out.top = py; out.right = px + w; out.bottom = py + hh; out.dx = px - wx; out.dy = py - wy;
          return out;
        },
        get target() { return { dx: tx, dy: ty }; },
        /** The collision pass's answer: ease there (or jump on the first placement and with reduced motion). */
        settle(dx, dy, dt, instant) {
          tx = dx; ty = dy;
          if (instant || !placed) { ox = dx; oy = dy; placed = true; } else { ox = approach(ox, dx, 14, dt); oy = approach(oy, dy, 14, dt); if (Math.abs(ox - dx) < 0.5) ox = dx; if (Math.abs(oy - dy) < 0.5) oy = dy; }
          write();
        },
        rect() { return lastO > 0.05 ? { left: lx, top: ly, right: lx + w, bottom: ly + hh } : null; },
        /** Where it is and what it names (QA): its centre, its object, how far it was moved. */
        tieInfo() {
          return { text: body.textContent, title: title != null ? el.querySelector('.bx-card-title')?.textContent : null, kind, group, visible: lastO > 0.05,
            cx: lx + w / 2, cy: ly + hh / 2, ox: Number.isFinite(ownX) ? ownX : anchorX, oy: Number.isFinite(ownY) ? ownY : anchorY, moved: Math.max(Math.abs(lx - Math.round(wx)), Math.abs(ly - Math.round(wy))), tie: tag.tie,
            rect: { left: lx, top: ly, right: lx + w, bottom: ly + hh } };
        },
        set(t) { if (body.textContent !== t) { body.textContent = t; dirty = true; heard = false; } return tag; },
        title(t) { const hd = el.querySelector('.bx-card-title'); if (hd && hd.textContent !== t) { hd.textContent = t; dirty = true; } return tag; },
        hide() { el.style.opacity = '0'; lastO = 0; return tag; },
        remove() { el.remove(); list.delete(tag); const i = order.indexOf(tag); if (i >= 0) order.splice(i, 1); },
        invalidate() { dirty = true; },
      };
      list.add(tag);
      order.push(tag);
      // stable: the same rank keeps the order added
      order.sort((a, b) => rank(b) - rank(a));
      return tag;
    },
    rects() { const out = []; for (const t of list) { const r = t.rect(); if (r) out.push(r); } return out; },
    /** Every visible tag that names an object, with where it sits and where its object is (QA: ownership checks). */
    ties() { const out = []; for (const t of list) { if (t.visible || (t.group && t.placedOnce)) out.push(t.tieInfo()); } return out; },
    /**
     * The collision pass (once a frame, after the mechanic placed its tags). obstacles: rects to keep
     * clear of (subtitle band and pill, Mallows, the scene's bodies). Cheap: a handful of tags × a
     * fixed set of candidate moves (only those within the tag's tie), plain arithmetic, nothing allocated.
     */
    layout(dt = 1 / 60, obstacles = [], { instant = false } = {}) {
      // sizes are cached; look again now and then (a font arriving, a longer line)
      if (++frames % 30 === 0) for (const t of list) t.invalidate();
      let n = 0;
      for (const t of order) {
        if (!t.visible) continue;
        if (t.fixed) { const r = t.rect(); if (r) Object.assign(slot(n++), r); continue; }
        const prev = t.target, tie = t.tie;
        let bestCost = Infinity, prevCost = Infinity, bdx = 0, bdy = 0, bestHit = 0, prevHit = 0;
        for (let iy = 0; iy < DY.length; iy++) {
          if (DY[iy] > tie || -DY[iy] > tie) continue;
          for (let ix = 0; ix < DX.length; ix++) {
            if (DX[ix] > tie || -DX[ix] > tie) continue;
            const b = t.boxAt(DX[ix], DY[iy], probe);
            const L = b.left - GAP, T = b.top - GAP, R = b.right + GAP, B = b.bottom + GAP;
            let hit = 0;
            for (let k = 0; k < obstacles.length; k++) { const o = obstacles[k]; if (o) hit += cover(L, T, R, B, o); }
            for (let k = 0; k < n; k++) hit += cover(L, T, R, B, boxes[k]) * 1.5;
            const cost = hit * 4 + Math.abs(b.dx) * 0.7 + Math.abs(b.dy);
            if (cost < bestCost) { bestCost = cost; bdx = b.dx; bdy = b.dy; bestHit = hit; }
            if (Math.abs(b.dx - prev.dx) < 1 && Math.abs(b.dy - prev.dy) < 1) { prevCost = cost; prevHit = hit; }
          }
        }
        // stickiness: stay put unless the new place is clearly better (no jitter between two near-equal places).
        // Once nothing is in the way of either place, a tag goes back towards its object: a band or a Mallow that
        // only passed by never leaves it drifted (review r4: cards left below their buds after the done line)
        if (prevCost <= bestCost + 18 && !(bestHit === 0 && prevHit === 0)) { bdx = prev.dx; bdy = prev.dy; }
        t.settle(bdx, bdy, dt, instant);
        t.boxAt(bdx, bdy, slot(n++));
      }
    },
    remeasure: sizes,
    clear() { for (const t of [...list]) t.remove(); },
  };
}

/**
 * A reusable list of rects (bodies, keep-outs): the same objects every call, so a scene that is asked for
 * its bodies ten times a second allocates nothing. begin() → add with circle()/box() → list (the array).
 */
export class RectList {
  constructor() { this.list = []; this.n = 0; this.pool = []; }
  begin() { this.n = 0; return this; }
  box(left, top, right, bottom) {
    const r = this.pool[this.n] || (this.pool[this.n] = { left: 0, top: 0, right: 0, bottom: 0 });
    r.left = left; r.top = top; r.right = right; r.bottom = bottom;
    this.list[this.n++] = r;
    return this;
  }
  circle(x, y, r, pad = 6) { return this.box(x - r - pad, y - r - pad, x + r + pad, y + r + pad); }
  end() { this.list.length = this.n; return this.list; }
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
