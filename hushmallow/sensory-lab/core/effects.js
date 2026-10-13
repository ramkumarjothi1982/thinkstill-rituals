// Effects Engine — light, trails, floating things, breath rings and blooms,
// drawn on one overlay canvas above the Mallow (pointer-events: none).
//
// Kept deliberately gentle: no full-screen flashes (a bloom is a soft local
// glow that fades over a second or more), adaptive density (quality tier and
// reduced motion), no allocations per frame beyond small arrays, and the loop
// stops while the page is hidden. The pure physics for floating things
// (Floater.step) is exported for tests.

import { clamp, lerp, TAU } from './math.js';

const DENSITY = { high: 1, medium: 0.7, low: 0.45 };

export class EffectsLayer {
  /**
   * @param {HTMLElement} parent  positioned element to cover
   * @param {{quality?:string, reducedMotion?:boolean}} [o]
   */
  constructor(parent, o = {}) {
    this.parent = parent;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-layer';
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2' });
    parent.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.items = new Set();
    this.reduced = !!o.reducedMotion;
    this.density = (DENSITY[o.quality] ?? 0.8) * (this.reduced ? 0.4 : 1);
    this.t = 0;
    this._raf = 0;
    this._resize = this._resize.bind(this);
    this.ro = new ResizeObserver(this._resize);
    this.ro.observe(parent);
    this._resize();
    this._loop = this._loop.bind(this);
    this._vis = () => { if (!document.hidden) this._kick(); };
    document.addEventListener('visibilitychange', this._vis);
    this._kick();
  }

  add(item) { this.items.add(item); item.layer = this; return item; }
  remove(item) { this.items.delete(item); }
  clear() { this.items.clear(); }

  _resize() {
    const r = this.parent.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height); this.dpr = dpr;
    this.canvas.width = Math.round(this.W * dpr); this.canvas.height = Math.round(this.H * dpr);
  }

  _kick() { if (!this._raf && !this.destroyed) this._raf = requestAnimationFrame(this._loop); }

  _loop(now) {
    this._raf = 0;
    if (this.destroyed || document.hidden) return;
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000);
    this._last = now;
    this.t += dt;
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    for (const it of [...this.items]) {
      if (it.step(dt, this) === false) { this.items.delete(it); continue; }
      it.draw(g, this);
    }
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this._raf);
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this._vis);
    this.canvas.remove();
    this.items.clear();
  }
}

// ------------------------------------------------------------- colours --
export function rgba(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1).toFixed(3)})`;
}

// -------------------------------------------------------------- glow orb --
/** A warm light the person moves around; leaves a soft trail. */
export class GlowOrb {
  constructor({ x, y, color = '#ffd98a', r = 26 }) {
    this.x = x; this.y = y; this.tx = x; this.ty = y;
    this.color = color; this.r = r; this.trail = []; this.pulse = 0; this.alpha = 0;
  }

  moveTo(x, y) { this.tx = x; this.ty = y; }

  step(dt, L) {
    const k = 1 - Math.exp(-dt * 14);
    this.x = lerp(this.x, this.tx, k); this.y = lerp(this.y, this.ty, k);
    this.alpha = Math.min(1, this.alpha + dt * 2);
    this.pulse += dt;
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last[0] - this.x, last[1] - this.y) > 6) this.trail.push([this.x, this.y, 1]);
    const max = Math.round(28 * L.density) + 6;
    while (this.trail.length > max) this.trail.shift();
    for (const p of this.trail) p[2] -= dt * 1.4;
    this.trail = this.trail.filter((p) => p[2] > 0);
    return !this.gone;
  }

  draw(g) {
    const a = this.alpha;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, life] of this.trail) {
      const rr = this.r * 0.55 * life;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, rgba(this.color, 0.22 * life * a)); gr.addColorStop(1, rgba(this.color, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
    const R = this.r * (1 + Math.sin(this.pulse * 2.4) * 0.06);
    const gr = g.createRadialGradient(this.x, this.y, 0, this.x, this.y, R * 2.6);
    gr.addColorStop(0, rgba('#ffffff', 0.9 * a)); gr.addColorStop(0.18, rgba(this.color, 0.75 * a));
    gr.addColorStop(0.5, rgba(this.color, 0.22 * a)); gr.addColorStop(1, rgba(this.color, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(this.x, this.y, R * 2.6, 0, TAU); g.fill();
    g.restore();
  }
}

// -------------------------------------------------------------- floaters --
const KINDS = {
  bubbles: { r: 22, buoy: 70, drag: 1.2, sway: 18 },
  lanterns: { r: 20, buoy: 52, drag: 1.5, sway: 10 },
  petals: { r: 15, buoy: 34, drag: 2.2, sway: 34 },
  leaves: { r: 17, buoy: 30, drag: 2.4, sway: 40 },
};
export const FLOAT_KINDS = Object.keys(KINDS);

/** Something the person lets go of: bobs while waiting, drifts up when released. */
export class Floater {
  constructor({ x, y, kind = 'bubbles', color = '#bfe9ff', seed = 0 }) {
    const K = KINDS[kind] || KINDS.bubbles;
    Object.assign(this, { x, y, hx: x, hy: y, vx: 0, vy: 0, kind, color, seed, r: K.r, K });
    this.state = 'waiting';   // waiting | held | rising | gone
    this.t = seed * 1.7; this.alpha = 0; this.rot = seed;
  }

  hit(x, y) { return this.state !== 'rising' && this.state !== 'gone' && Math.hypot(x - this.x, y - this.y) < this.r * 1.9; }
  hold(x, y) { this.state = 'held'; this.gx = x; this.gy = y; }
  drag(x, y) { this.gx = x; this.gy = y; }

  /** Let go with a fling velocity (px/s); a gentle tap just lets it rise. */
  release(vx = 0, vy = 0) {
    this.state = 'rising';
    this.vx = clamp(vx, -900, 900) * 0.6;
    this.vy = Math.min(-60, clamp(vy, -1400, 400) * 0.6);
  }

  /** Pure motion step (no drawing). Returns false once it has floated away. */
  step(dt, L) {
    this.t += dt;
    const H = L?.H ?? 800;
    if (this.state === 'waiting') {
      this.alpha = Math.min(1, this.alpha + dt * 1.5);
      this.x = this.hx + Math.sin(this.t * 1.1) * 4;
      this.y = this.hy + Math.sin(this.t * 1.7) * 5;
    } else if (this.state === 'held') {
      const k = 1 - Math.exp(-dt * 18);
      const nx = lerp(this.x, this.gx, k), ny = lerp(this.y, this.gy, k);
      this.vx = (nx - this.x) / Math.max(dt, 1e-3); this.vy = (ny - this.y) / Math.max(dt, 1e-3);
      this.x = nx; this.y = ny;
    } else if (this.state === 'rising') {
      const K = this.K, d = Math.exp(-K.drag * dt);
      this.vy = (this.vy - K.buoy * dt) * d;
      this.vx = this.vx * d + Math.sin(this.t * 2 + this.seed) * K.sway * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.rot += this.vx * dt * 0.01;
      if (this.y < H * 0.18) this.alpha -= dt * 0.9;
      if (this.alpha <= 0 || this.y < -60) { this.state = 'gone'; return false; }
    }
    return this.state !== 'gone';
  }

  draw(g) {
    const a = clamp(this.alpha, 0, 1), r = this.r, c = this.color;
    g.save();
    g.translate(this.x, this.y);
    if (this.kind === 'bubbles') {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      gr.addColorStop(0, rgba('#ffffff', 0.55 * a)); gr.addColorStop(0.6, rgba(c, 0.22 * a)); gr.addColorStop(1, rgba(c, 0.6 * a));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      // a soft dark edge under a bright rim keeps bubbles readable on light skies too
      g.strokeStyle = rgba('#1a2a48', 0.22 * a); g.lineWidth = 3; g.stroke();
      g.strokeStyle = rgba('#ffffff', 0.85 * a); g.lineWidth = 1.5; g.stroke();
      g.fillStyle = rgba('#ffffff', 0.8 * a); g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.18, r * 0.11, -0.6, 0, TAU); g.fill();
    } else if (this.kind === 'lanterns') {
      g.rotate(this.rot * 0.3);
      const glow = g.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
      glow.addColorStop(0, rgba(c, 0.35 * a)); glow.addColorStop(1, rgba(c, 0));
      g.fillStyle = glow; g.beginPath(); g.arc(0, 0, r * 2.4, 0, TAU); g.fill();
      g.fillStyle = rgba(c, 0.92 * a);
      g.beginPath(); g.moveTo(-r * 0.7, -r); g.quadraticCurveTo(-r * 1.05, 0, -r * 0.55, r); g.lineTo(r * 0.55, r); g.quadraticCurveTo(r * 1.05, 0, r * 0.7, -r); g.closePath(); g.fill();
      g.fillStyle = rgba('#fff6d6', 0.85 * a); g.beginPath(); g.ellipse(0, r * 0.2, r * 0.28, r * 0.42, 0, 0, TAU); g.fill();
    } else {
      // petals and leaves: a soft curved blade that tumbles as it drifts
      g.rotate(this.rot + Math.sin(this.t * 2.3 + this.seed) * 0.5);
      g.fillStyle = rgba(c, 0.9 * a);
      g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * 0.9, -r * 0.5, r * 0.7, r * 0.6, 0, r); g.bezierCurveTo(-r * 0.7, r * 0.6, -r * 0.9, -r * 0.5, 0, -r); g.fill();
      g.strokeStyle = rgba('#ffffff', 0.4 * a); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, -r * 0.8); g.lineTo(0, r * 0.8); g.stroke();
    }
    g.restore();
  }
}

// --------------------------------------------------------------- breath ring --
/** A soft ring around the Mallow; `level` 0..1 is set by the breath mode. */
export class BreathRing {
  constructor({ x, y, r0, r1, color }) { Object.assign(this, { x, y, r0, r1, color, level: 0, shown: 0 }); }
  step(dt) { this.shown = lerp(this.shown, this.level, 1 - Math.exp(-dt * 6)); return !this.gone; }
  draw(g) {
    const r = lerp(this.r0, this.r1, this.shown), a = 0.25 + 0.45 * this.shown;
    g.save();
    const gr = g.createRadialGradient(this.x, this.y, r * 0.82, this.x, this.y, r * 1.12);
    gr.addColorStop(0, rgba(this.color, 0)); gr.addColorStop(0.5, rgba(this.color, 0.38 * a)); gr.addColorStop(1, rgba(this.color, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(this.x, this.y, r * 1.12, 0, TAU); g.fill();
    g.strokeStyle = rgba('#1a1440', 0.18 * a); g.lineWidth = 5;
    g.beginPath(); g.arc(this.x, this.y, r, 0, TAU); g.stroke();
    g.strokeStyle = rgba(this.color, 0.85 * a); g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.5 * a); g.lineWidth = 1; g.stroke();
    g.restore();
  }
}

// ------------------------------------------------------------------ bloom --
/** A soft, local glow that opens and fades (never a screen flash). */
export class Bloom {
  constructor({ x, y, r, color, dur = 1.6 }) { Object.assign(this, { x, y, r, color, dur, age: 0 }); }
  step(dt) { this.age += dt; return this.age < this.dur; }
  draw(g) {
    const t = this.age / this.dur, a = Math.sin(Math.PI * Math.min(1, t)) * 0.45, R = this.r * (0.6 + t * 0.8);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(this.x, this.y, 0, this.x, this.y, R);
    gr.addColorStop(0, rgba(this.color, a)); gr.addColorStop(1, rgba(this.color, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(this.x, this.y, R, 0, TAU); g.fill();
    g.restore();
  }
}

// ------------------------------------------------------------------ motes --
/** A few slow, drifting specks of light for quiet scenes. */
export class Motes {
  constructor({ color = '#fff4c8', count = 18 } = {}) { this.color = color; this.count = count; this.list = null; }
  step(dt, L) {
    if (!this.list) {
      const n = Math.max(4, Math.round(this.count * L.density));
      this.list = Array.from({ length: n }, (_, i) => ({ x: ((i * 97) % 100) / 100 * L.W, y: ((i * 61) % 100) / 100 * L.H, s: 1 + (i % 3), p: i }));
    }
    for (const m of this.list) {
      m.y -= dt * (6 + m.s * 3) * (L.reduced ? 0.4 : 1);
      m.x += Math.sin(L.t * 0.3 + m.p) * dt * 4;
      if (m.y < -10) { m.y = L.H + 10; }
    }
    return !this.gone;
  }
  draw(g, L) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const m of this.list) {
      const a = 0.25 + 0.25 * Math.sin(L.t * 0.8 + m.p);
      g.fillStyle = rgba(this.color, a);
      g.beginPath(); g.arc(m.x, m.y, m.s, 0, TAU); g.fill();
    }
    g.restore();
  }
}
