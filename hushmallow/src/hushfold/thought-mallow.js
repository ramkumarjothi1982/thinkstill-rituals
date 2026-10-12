// Thought Mallows: the person's thought, out in the world.
//
// A tiny soft-bodied character (the same MallowTouch physics as the seven
// Mallows) whose body is a tinted moonmilk marshmallow with its own simple
// face, and whose words float above it exactly as typed. The feeling the
// person picked sets how it looks and moves: anger crackles, anxiety
// trembles, sadness hangs heavy, overwhelm splits into several Thought
// Mallows talking over each other. `calm` (0..1) is how settled it is; the
// worlds raise it, and it softens, relaxes its face and warms its colour.
// It is never destroyed: the point is a different relationship with the
// thought, not getting rid of it.

import { h } from '../app/ui.js';
import { MALLOWS } from '../mallows/registry.js';
import { SoftBody } from './touch/softbody.js';
import { createGestureReader } from './touch/gestures.js';
import { createMeshRenderer } from './touch/mesh-renderer.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const now = () => performance.now() / 1000;

export const THOUGHT_STYLES = {
  crackle: { tint: '#ff4d5e', calmTint: '#ffc38a', tension: 1, tremble: 0.5, bob: 0.5, size: 1, brows: 'angry', puff: 0.6, sparks: 1 },
  tremble: { tint: '#b9a3ff', calmTint: '#bfe9ff', tension: 0.75, tremble: 1, bob: 0.8, size: 0.95, brows: 'worried', puff: 0, eyesWide: 1 },
  heavy: { tint: '#5f8dff', calmTint: '#a8d4ff', tension: 0.4, tremble: 0, bob: 0.25, size: 1.05, brows: 'sad', puff: 0, droop: 1 },
  crowd: { tint: '#c58bff', calmTint: '#c9e7ff', tension: 0.7, tremble: 0.6, bob: 1, size: 0.72, brows: 'worried', puff: 0.2 },
  puff: { tint: '#ff8a3d', calmTint: '#ffd98a', tension: 0.85, tremble: 0.2, bob: 0.5, size: 1, brows: 'angry', puff: 1 },
  small: { tint: '#9fb4d8', calmTint: '#d6e8ff', tension: 0.3, tremble: 0, bob: 0.35, size: 0.82, brows: 'sad', puff: 0, lookAway: 1 },
  bounce: { tint: '#ff7ac8', calmTint: '#ffe2a3', tension: 0.6, tremble: 0.3, bob: 1.6, size: 0.92, brows: 'flat', puff: 0.2, hop: 1 },
  plain: { tint: '#a79bff', calmTint: '#cdeeff', tension: 0.5, tremble: 0.15, bob: 0.6, size: 0.95, brows: 'flat', puff: 0 },
};

let baseImg = null;
function loadBase() {
  if (baseImg) return baseImg;
  baseImg = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = MALLOWS.noomi.body; });
  return baseImg;
}

function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixHex(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; }

/** Split a sentence into up to n readable fragments (for overwhelm). */
export function fragments(text, n = 3) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) return [text];
  const k = Math.min(n, Math.ceil(words.length / 2));
  const per = Math.ceil(words.length / k);
  const out = [];
  for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per).join(' '));
  return out;
}

export class ThoughtMallow {
  /**
   * @param {HTMLElement} layer   positioned parent (full screen)
   * @param {object} o  { text, style, x, y, size (px body height), reducedMotion, onSpark }
   */
  constructor(layer, { text, style = 'plain', x, y, size = 96, reducedMotion = false, audio = null, haptic = null, showWords = true } = {}) {
    this.layer = layer;
    this.text = text;
    this.styleId = style;
    this.st = THOUGHT_STYLES[style] || THOUGHT_STYLES.plain;
    this.reduced = reducedMotion;
    this.audio = audio; this.haptic = haptic;
    this.size = size * this.st.size;
    this.x = x; this.y = y;            // anchor (screen px, bottom centre of body)
    this.tx = x; this.ty = y;          // target anchor
    this.vx = 0; this.vy = 0;
    this.scale = 1;                    // perspective scale (ocean distance)
    this.calm = 0;                     // 0 tense … 1 settled
    this.charge = this.st.sparks ? 1 : 0;
    this.time = Math.random() * 10;
    this.appear = 0;                   // materialise 0..1
    this.alpha = 1;
    this.care = 0;
    const m = MALLOWS.noomi;
    const [bx0, by0, bx1, by1] = m.bodyBox;
    this.bw = bx1 - bx0; this.bh = by1 - by0;
    this.box = [bx0, by0];
    this.soft = new SoftBody({ width: this.bw, height: this.bh, cols: 7, rows: 7, stiffness: 150, damping: 4.5, coupling: 200 });
    this.soft.reduced = reducedMotion;
    this.gest = createGestureReader({ bodyWidth: this.size });
    this.el = h('div', { class: 'hf-thought', 'aria-hidden': 'true' });
    this.canvas = h('canvas', { class: 'hf-thought-canvas' });
    this.el.append(this.canvas);
    this.words = showWords ? h('div', { class: `hf-words style-${style}` }, text) : null;
    layer.append(this.el);
    if (this.words) layer.append(this.words);
    this.skin = document.createElement('canvas');
    this.sctx = this.skin.getContext('2d');
    this.tinted = document.createElement('canvas');
    this.mesh = createMeshRenderer(this.canvas, this.soft);
    this.fingers = new Map();
    this.ready = false;
    this._pt = [0, 0]; this._tc = [0, 0];
    this.loaded = loadBase().then((img) => { this.img = img; this._prepare(); this.ready = true; return this; });
  }

  _prepare() {
    const q = 0.6;   // texture scale (body is small on screen)
    const m = MALLOWS.noomi;
    this.q = q;
    for (const c of [this.skin, this.tinted]) { c.width = Math.ceil(m.size[0] * q); c.height = Math.ceil(m.size[1] * q); }
    this._lastTint = null;
    this._drawSkin(true);
  }

  _tintColour() { return mixHex(this.st.tint, this.st.calmTint, clamp(this.calm, 0, 1)); }

  _drawTinted(col) {
    const c = this.tinted.getContext('2d');
    const { width: W, height: H } = this.tinted;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, H);
    c.drawImage(this.img, 0, 0, W, H);
    c.globalCompositeOperation = 'color';
    c.fillStyle = col; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = 0.45; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(this.img, 0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }

  /** Face state, all 0..1, from the style and calm. */
  _face() {
    const s = this.st, c = clamp(this.calm, 0, 1);
    const tense = s.tension * (1 - c);
    return {
      tense,
      eyeOpen: lerp(s.eyesWide ? 1 : 0.75, 0.1, c),                  // calm closes the eyes softly
      browAngry: s.brows === 'angry' ? tense : 0,
      browWorried: (s.brows === 'worried' || s.brows === 'sad') ? (1 - c) * 0.9 : 0,
      smile: lerp(s.brows === 'sad' ? -0.7 : s.brows === 'angry' ? -0.5 : -0.2, 0.75, c),
      puff: s.puff * (1 - c),
      look: s.lookAway ? 0.6 * (1 - c) : 0,
      blush: 0.4 + c * 0.6 + this.care * 0.3,
    };
  }

  _drawSkin(force = false) {
    const f = this._face();
    const col = this._tintColour();
    const sig = [col, f.eyeOpen.toFixed(2), f.browAngry.toFixed(2), f.browWorried.toFixed(2), f.smile.toFixed(2), f.puff.toFixed(2), f.look.toFixed(2), f.blush.toFixed(2), this._blink ? 1 : 0].join('|');
    if (!force && sig === this._sig) return false;
    this._sig = sig;
    if (col !== this._lastTint) { this._drawTinted(col); this._lastTint = col; }
    const c = this.sctx, q = this.q;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.skin.width, this.skin.height);
    c.drawImage(this.tinted, 0, 0);
    c.setTransform(q, 0, 0, q, 0, 0);
    const ink = '#1a0f3a';
    const eyes = [[141, 226], [301, 226]];
    const open = this._blink ? 0.05 : f.eyeOpen;
    // cheeks
    for (const [x, y] of [[96, 276], [338, 276]]) {
      const g = c.createRadialGradient(x, y, 2, x, y, 42 + f.puff * 14);
      g.addColorStop(0, `rgba(255,120,200,${0.55 * f.blush})`);
      g.addColorStop(1, 'rgba(255,120,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 42 + f.puff * 14, 0, Math.PI * 2); c.fill();
    }
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [i, [x, y]] of eyes.entries()) {
      const side = i === 0 ? -1 : 1;
      if (open > 0.15) {
        const ry = 34 * open, rx = 30;
        c.fillStyle = '#fffaff';
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
        c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.clip();
        const px = x + f.look * 14 + (f.tense > 0.6 ? side * -3 : 0);
        c.fillStyle = ink; c.beginPath(); c.arc(px, y + 4, 15 + (this.st.eyesWide ? -3 : 0), 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(px - 5, y - 4, 5, 0, Math.PI * 2); c.fill();
        c.restore();
        c.strokeStyle = ink; c.lineWidth = 7;
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      } else {
        // closed, content arcs
        c.strokeStyle = ink; c.lineWidth = 10;
        c.beginPath(); c.moveTo(x - 30, y); c.quadraticCurveTo(x, y + 18, x + 30, y); c.stroke();
      }
      // brows
      const ba = f.browAngry, bw = f.browWorried;
      if (ba > 0.05 || bw > 0.05) {
        c.strokeStyle = ink; c.lineWidth = 9;
        const inner = x - side * 24, outer = x + side * 28;
        const yIn = y - 52 + ba * 18 - bw * 12, yOut = y - 56 - ba * 8 + bw * 10;
        c.globalAlpha = Math.min(1, Math.max(ba, bw) * 1.3);
        c.beginPath(); c.moveTo(inner, yIn); c.lineTo(outer, yOut); c.stroke();
        c.globalAlpha = 1;
      }
    }
    // mouth
    const mx = 220, my = 292, w = 62 * (1 - f.puff * 0.35);
    c.strokeStyle = ink; c.lineWidth = 10;
    c.beginPath();
    const tr = f.tense * this.st.tremble;
    if (tr > 0.3 && !this.reduced) {
      for (let i = 0; i <= 10; i++) {
        const t = i / 10, xx = mx - w / 2 + w * t;
        const yy = my - f.smile * 18 * Math.sin(Math.PI * t) + Math.sin(t * 18 + this.time * 20) * 4 * tr;
        i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
      }
    } else {
      c.moveTo(mx - w / 2, my);
      c.quadraticCurveTo(mx, my + f.smile * 36, mx + w / 2, my);
    }
    c.stroke();
    return true;
  }

  // ------------------------------------------------------------- input --
  _toBody(cx, cy) {
    const S = this._S();
    return { x: (cx - this.x) / S, y: (cy - (this.y - this._lift())) / S };
  }
  _S() { return (this.size / this.bh) * this.scale * (0.4 + 0.6 * easeOut(this.appear)); }
  _lift() { return this._bobY || 0; }

  hit(cx, cy) {
    if (!this.ready || this.appear < 0.6 || this.alpha < 0.3) return false;
    return this.soft.contains(this._toBody(cx, cy), 0.25);
  }

  pointerDown(e) {
    const t = now();
    this.gest.setBodyWidth(this.size * this.scale);
    this.gest.down({ id: e.pointerId, x: e.clientX, y: e.clientY, t });
    this.soft.grab(e.pointerId, this._toBody(e.clientX, e.clientY), { radius: 0.32 });
    this.fingers.set(e.pointerId, { x0: e.clientX, y0: e.clientY, ax: this.tx, ay: this.ty });
    this.audio?.play?.('noomi', 'press');
    this.held = true;
    this._events();
  }
  pointerMove(e) {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    this.gest.move({ id: e.pointerId, x: e.clientX, y: e.clientY, t: now() });
    const g = this.gest.fingers.get(e.pointerId);
    if (g?.moved) {
      // the body stretches towards the finger and the whole thought follows
      // lazily, so you can move it beside you or farther away
      this.soft.drag(e.pointerId, this._toBody(e.clientX, e.clientY));
      this.tx = f.ax + (e.clientX - f.x0) * 0.85;
      this.ty = f.ay + (e.clientY - f.y0) * 0.85;
      this.moved = true;
    }
    this._events();
  }
  pointerUp(e) {
    if (!this.fingers.has(e.pointerId)) return;
    const out = this.gest.up({ id: e.pointerId, t: now() });
    const S = this._S();
    this.soft.release(e.pointerId, out?.kind === 'flick' ? { x: out.vx / S * 0.6, y: out.vy / S * 0.6 } : null);
    this.fingers.delete(e.pointerId);
    this.held = this.fingers.size > 0;
    if (out?.kind === 'flick') { this.vx += out.vx * 0.25; this.vy += out.vy * 0.25; }
    this._events();
  }
  pointerCancel(e) { this.gest.cancel(e.pointerId); this.soft.release(e.pointerId); this.fingers.delete(e.pointerId); this.held = this.fingers.size > 0; }

  _events() {
    for (const ev of this.gest.take()) {
      if (ev.type === 'tap') { this.soft.poke(this._toBody(ev.x, ev.y), 0.8); this.onTouch?.({ kind: 'tap' }); }
      if (ev.type === 'circle' || ev.type === 'stroke') {
        // gentle care settles it a little — care, never punishment
        this.care = Math.min(1, this.care + 0.25);
        this.calm = Math.min(1, this.calm + 0.06);
        this.onTouch?.({ kind: 'care' });
      }
      if (ev.type === 'release') this.onTouch?.({ kind: 'release', held: ev.held });
      if (ev.type === 'jiggle') this.onTouch?.({ kind: 'jiggle' });
    }
  }

  // ------------------------------------------------------------ update --
  update(dt) {
    if (!this.ready) return;
    this.time += dt;
    this.appear = Math.min(1, this.appear + dt / (this.reduced ? 0.4 : 1.1));
    const rm = this.reduced;
    // squeeze softening while held still
    for (const id of this.soft.grabs.keys()) {
      const d = this.gest.depth(id, now());
      this.soft.setDepth(id, d);
      if (d > 0.4) { this.calm = Math.min(1, this.calm + dt * 0.05); this.care = Math.min(1, this.care + dt * 0.4); }
    }
    this.care = Math.max(0, this.care - dt * 0.15);
    // drift towards the target anchor
    const k = this.held ? 14 : 3.2;
    this.vx += (this.tx - this.x) * k * dt; this.vy += (this.ty - this.y) * k * dt;
    const damp = Math.exp(-(this.held ? 9 : 3.4) * dt);
    this.vx *= damp; this.vy *= damp;
    this.x += this.vx * dt; this.y += this.vy * dt;
    // personality motion, softened by calm
    const c = this.calm, s = this.st;
    const amt = rm ? 0.3 : 1;
    this._bobY = (Math.sin(this.time * (1.2 + s.bob)) * 5 * s.bob + (s.hop ? Math.abs(Math.sin(this.time * 3.2)) * 14 * (1 - c) : 0)) * amt * this.scale;
    const trem = s.tremble * (1 - c) * amt;
    const P = this.soft.pose;
    P.ox = trem * (Math.sin(this.time * 47) * 3 + Math.sin(this.time * 31) * 2);
    P.sy = 1 - s.tension * (1 - c) * 0.08 - (s.droop || 0) * (1 - c) * 0.06 + Math.sin(this.time * 1.7) * 0.012 * amt;
    P.sx = 1 + s.tension * (1 - c) * 0.05 + s.puff * (1 - c) * 0.05;
    P.droop = (s.droop || 0) * (1 - c) * 0.8;
    P.lean = Math.sin(this.time * 0.9) * 0.04 * s.bob * amt;
    this.soft.step(dt);
    // blinking (open-eyed only)
    this._blinkT = (this._blinkT ?? (2 + Math.random() * 3)) - dt;
    if (this._blinkT < 0) { this._blink = true; if (this._blinkT < -0.14) { this._blink = false; this._blinkT = 2 + Math.random() * 4; } }
    // charge leaks away as it settles
    if (this.st.sparks) this.charge = Math.min(this.charge, 1 - c * 0.95);
  }

  _map(k) {
    const S = this._S();
    this._pt[0] = this.cw / 2 + this.soft.x[k] * S;
    this._pt[1] = this.ch * 0.82 + this.soft.y[k] * S;
    return this._pt;
  }
  _uv(k) {
    const m = MALLOWS.noomi;
    this._tc[0] = (this.box[0] + this.bw / 2 + this.soft.rx[k]) / m.size[0];
    this._tc[1] = (this.box[1] + this.bh + this.soft.ry[k]) / m.size[1];
    return this._tc;
  }

  render(dpr = 1) {
    if (!this.ready) return;
    const changed = this._drawSkin() || this.st.tremble > 0.3;
    const S = this._S();
    const cw = Math.ceil(this.bw * S * 1.9) + 8, ch = Math.ceil(this.bh * S * 1.7) + 8;
    this.cw = cw; this.ch = ch;
    // the canvas follows the thought; its bottom-centre anchor is (x, y - lift)
    const left = this.x - cw / 2, top = this.y - this._lift() - ch * 0.82;
    this.el.style.width = `${cw}px`; this.el.style.height = `${ch}px`;
    this.el.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
    this.el.style.opacity = String(this.alpha * Math.min(1, this.appear * 1.6));
    this.mesh.draw({ skin: this.skin, skinChanged: changed || this._firstDraw !== true, map: (k) => this._map(k), uvOf: (k) => this._uv(k),
      W: cw, H: ch, dpr: Math.min(2, dpr), glow: this.care * 0.6 + this.calm * 0.3 });
    this._firstDraw = true;
    if (this.words) {
      const b = this.soft.bounds();
      const topY = this.y - this._lift() + b.y0 * S;
      // keep the label fully on screen even when the Mallow drifts to an edge
      const sc = Math.max(0.62, this.scale);
      const half = ((this._wordsW ||= this.words.offsetWidth || 200) * sc) / 2;
      const vw = innerWidth;
      const lx = clamp(this.x, half + 10, Math.max(half + 10, vw - half - 10));
      this.words.style.transform = `translate3d(${lx.toFixed(1)}px, ${(topY - 10).toFixed(1)}px, 0) translate(-50%, -100%) scale(${sc.toFixed(3)})`;
      this.words.style.opacity = String(this.alpha * clamp((this.appear - 0.35) * 2, 0, 1) * (this.wordsAlpha ?? 1));
      this.words.classList.toggle('settled', this.calm > 0.6);
    }
  }

  /** Top-centre of the body in screen px (for effects). */
  head() { const S = this._S(); const b = this.soft.bounds(); return { x: this.x, y: this.y - this._lift() + b.y0 * S, mid: this.y - this._lift() + (b.y0 + b.y1) / 2 * S, w: (b.x1 - b.x0) * S }; }

  destroy() { this.mesh.destroy(); this.el.remove(); this.words?.remove(); }
}

function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }
