// SoftMallow — an official Mallow with a real soft body.
//
// Extends the production MallowRig (src/mallows/rig.js, imported read-only) so
// every Mallow keeps its approved artwork, rig, expressions, signature
// particles and authored reactions. What changes is the last stage of the
// pipeline: instead of warping the skin in horizontal strips, the skin is
// mapped through a 2-D XPBD spring mesh (core/softbody.js) that fingers can
// poke, grab, pinch and stroke. The rig's own body motion (hops, squash beats,
// breathing, lean) becomes the mesh's *pose*, so the material adds weight and
// follow-through to everything the rig already does.
//
// Rig internals this class relies on are listed in adapters/rig-adapter.js.

import { MallowRig } from '../../src/mallows/rig.js';
import { REACTIONS } from '../../src/mallows/reactions.js';
import { SoftBody, alphaMask } from './softbody.js';
import { tuneMaterial, LOOKS } from './materials.js';
import { MeshRenderer } from './mesh-renderer.js';
import { deformationFace } from './expression-engine.js';
import { clamp, approach } from './math.js';
import { RIG_CONTRACT } from '../adapters/rig-adapter.js';

export const QUALITY = {
  high: { grid: 14, substeps: 8, dpr: 2 },
  medium: { grid: 11, substeps: 6, dpr: 1.5 },
  low: { grid: 8, substeps: 4, dpr: 1 },
};

// ------------------------------------------------------------ particles --
// The production field (src/mallows/particles.js) draws a sigh's or a pillow's 'puff' (white at 0.7) and a landing's
// 'dust' (white at 0.35) as hard pale discs, and a 'ring' (a ripple at the feet) as a hard line drawn over the body.
// On the lab's light stage those read as smudges on the face, stray discs at the feet and a line across the body.
// The lab draws these three itself (the field draws every other kind as authored): puffs and dust as soft white
// wisps (a radial sprite, a lower peak; a puff rises up and away from the mouth and is gone within 0.9 s), a ring
// as a soft stroke whose back half goes behind the body. Zuzu's rings circle its middle, as authored. A feature that
// turns a puff into its own kind at spawn (Nightlight's wisps) never reaches this.
export const SOFT_FX = Object.freeze({
  puff: Object.freeze({ peak: 0.32, grow: Object.freeze([0.8, 1.2]), rise: 1.1, fan: 0.5, life: Object.freeze([0.7, 0.9]) }),
  dust: Object.freeze({ peak: 0.3, grow: Object.freeze([0.6, 0.8]) }),
});

/** True when the lab draws this particle itself (see above). */
export const softKind = (p, mallowId) => p.kind === 'puff' || p.kind === 'dust' || (p.kind === 'ring' && mallowId !== 'zuzu');

/** A particle's progress 0..1 through its life (after any delay); -1 while it waits. */
export function particleT(p) {
  const d = p.delay || 0;
  return p.age < d ? -1 : (p.age - d) / Math.max(1e-6, p.life - d);
}

/** The field's own fade at progress t: in over the first 15 %, out over the last 45 %. */
export function fieldFade(t) { return t < 0 ? 0 : t < 0.15 ? t / 0.15 : Math.max(0, 1 - Math.max(0, (t - 0.55) / 0.45)); }

/** A wisp's opacity curve (× its peak): a quick rise over the first 20 %, then a long fade to nothing. */
export function wispFade(t) {
  if (!(t > 0 && t < 1)) return 0;
  if (t < 0.2) { const u = t / 0.2; return u * u * (3 - 2 * u); }
  return (1 - (t - 0.2) / 0.8) ** 1.6;
}

/** Send a puff, as the field spawned it at the mouth, up and away in a small fan (once; mutates and returns p). */
export function liftPuff(p, bodyH, { reduced = false, rand = Math.random } = {}) {
  const P = SOFT_FX.puff, a = (rand() - 0.5) * 2 * P.fan, v = P.rise * bodyH * (reduced ? 0.5 : 1) * (0.9 + 0.2 * rand());
  p.vx = Math.sin(a) * v; p.vy = -Math.cos(a) * v; p.drag = 0.9;
  p.life = P.life[0] + (P.life[1] - P.life[0]) * rand();
  p.labLifted = true;
  return p;
}

let WISP = null;   // one soft white sprite for every SoftMallow (built on first use: no DOM at import)
function wispSprite() {
  if (WISP) return WISP;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  return (WISP = c);
}

// a closed-eyed Mallow's look at a finger: friendly, not worried (an experience can swap it via peekParams)
export const DEFAULT_PEEK = Object.freeze({ eyeOpen: 0.72, lidTop: 0.18, closedCurve: 0.2, browTilt: -0.25, mouthSmile: 1 });

export class SoftMallow extends MallowRig {
  /**
   * @param {HTMLElement} container
   * @param {object} opts  MallowRig options plus:
   *   material: 'marshmallow' | 'jelly' | 'mochi' | 'cloud' | 'pillow'
   *   quality:  'high' | 'medium' | 'low'
   *   renderer: 'webgl' | '2d'
   */
  constructor(container, opts = {}) {
    super(container, { ...opts, interactive: false });
    RIG_CONTRACT.check(this);
    this.material = opts.material || 'marshmallow';
    this.quality = QUALITY[opts.quality] ? opts.quality : 'high';
    this.prefer = opts.renderer || 'webgl';
    this.squeeze = { c: 0, target: 0, ax: 0, ay: 1, px: 0 };
    this.faceState = { squeeze: 0, stretch: 0, wobble: 0, closedEyes: this.mallow.face.eyeStyle === 'closed' };
    this.showMesh = false;
    this._settled = true;
    // Comfort DNA hooks: animation speed (time scale), motion intensity (impulse
    // scale), breath inflation and per-experience face overrides
    this.speed = 1;
    this.motionScale = 1;
    this.inflate = 0; this.inflateTarget = 0;
    this.faceOverride = { set: {}, min: {} };
    // Phase 3 hooks (all neutral by default): render cap, render counter, peek look, colour grade
    this.frameCap = null; this._acc = 0; this.renders = 0; this.peekParams = null; this.grade = [1, 1, 1];
    this._tickEv = { dt: 0 }; this._noRender = false; this._gradeMean = 1;
    this.canvas.setAttribute('role', 'img');
    this.canvas.style.touchAction = 'none';
    // know when the rig re-rendered its skin, so the texture is re-uploaded only then
    const sctx = this.sctx, clear = sctx.clearRect.bind(sctx);
    sctx.clearRect = (...a) => { this._skinDrawn = true; clear(...a); };
    this.softReady = this.loaded.then(() => { if (!this.destroyed) this._initSoft(); return this; })
      .catch((err) => { console.warn('[sensory-lab] soft body unavailable, using the standard rig', err); return this; });
  }

  // -------------------------------------------------------------- setup --
  _initSoft() {
    const m = this.mallow;
    const img = this.assets.original;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    try {
      const data = x.getImageData(0, 0, c.width, c.height).data;
      this._mask = alphaMask(data, c.width, c.height, m.bodyBox);
    } catch {
      // pixels unreadable (e.g. an opaque-origin sandbox): a rounded body shape is close
      // enough, and WebGL can't upload such art either, so draw the mesh with Canvas 2D
      this._mask = (u, v) => ((u - 0.5) / 0.52) ** 2 + ((v - 0.52) / 0.54) ** 2 < 1;
      this.prefer = '2d';
    }
    this._buildBody();
    this.renderer = new MeshRenderer({ prefer: this.prefer });
    this.renderer.setMesh(this.soft.tri, this._uv());
    this._resize();
    this._applyGrade();
  }

  _mat() { return tuneMaterial(this.material, this.id, { reducedMotion: this.opts.reducedMotion }); }

  _buildBody() {
    const m = this.mallow, Q = QUALITY[this.quality];
    const [bx0, by0, bx1, by1] = m.bodyBox;
    this.soft = new SoftBody({ width: bx1 - bx0, height: by1 - by0, cols: Q.grid, rows: Q.grid, inside: this._mask, material: this._mat(), substeps: Q.substeps });
    this.soft.settleNow();
    this._cheekV = clamp(((m.face.cheeks?.L?.[1] ?? (by0 + (by1 - by0) * 0.62)) - by0) / (by1 - by0), 0, 1);
    this._pos = new Float32Array(this.soft.n * 2);
    this._shade = new Float32Array(this.soft.n);
    this._cnt = null;   // per-vertex triangle counts, sized to the new mesh on first use
    this._uvQ = null;
  }

  _uv() {
    const m = this.mallow, s = this.soft;
    const [bx0, by0, bx1, by1] = m.bodyBox;
    const q = this.q, tw = this.skin.width, th = this.skin.height;
    const uv = new Float32Array(s.n * 2);
    for (let k = 0; k < s.n; k++) {
      uv[k * 2] = (bx0 + s.u[k] * (bx1 - bx0)) * q / tw;
      uv[k * 2 + 1] = (by0 + s.v[k] * (by1 - by0)) * q / th;
    }
    this._uvQ = q;
    // the material's highlight sits on the upper-left of the body, in texture space
    const bw = bx1 - bx0, bh = by1 - by0;
    this.renderer?.setLook(LOOKS[this.material], [(bx0 + bw * 0.3) * q / tw, (by0 + bh * 0.24) * q / th], [bw * 0.17 * q / tw, bh * 0.1 * q / th]);
    return uv;
  }

  // --------------------------------------------------------- public API --
  setMaterial(id) {
    this.material = id;
    if (!this.soft) return;
    this.soft.setMaterial(this._mat());
    if (this.renderer) this.renderer.setUv(this._uv());   // refreshes the look too
  }

  setQuality(q) {
    if (!QUALITY[q] || q === this.quality) return;
    this.quality = q;
    if (!this.soft) return;
    this._buildBody();
    this.renderer?.setMesh(this.soft.tri, this._uv());   // null after a full rendering fallback
    this._resize();
  }

  setReducedMotion(b) {
    super.setReducedMotion(b);
    if (this.soft) this.soft.setMaterial(this._mat());
  }

  /** Animation speed (0.6..1.4): scales the whole rig clock, physics included. */
  setSpeed(k) { this.speed = clamp(+k || 1, 0.6, 1.4); }

  /** Motion intensity (0.3..1.4): scales impulses from touches and reactions. */
  setMotionScale(k) { this.motionScale = clamp(+k || 1, 0.3, 1.4); }

  /** Breath inflation 0..1 (≈ +7% size at 1), eased. */
  setInflate(v) { this.inflateTarget = clamp(v, -0.5, 1); }

  /**
   * Per-experience face overrides: `set` replaces targets, `min` raises them
   * (e.g. { min: { glow: 0.8 } } while a light rests on the Mallow).
   */
  setFaceOverride(o = {}) { this.faceOverride = { set: o.set || {}, min: o.min || {} }; }

  /** Closed-eyed Mallows open their eyes for a moment to look at a finger. */
  peek(x, y, dur = 1.1, params = this.peekParams) {
    if (!this.ready) return;
    if (x != null) this.lookAtScreen(x, y);
    if (this.mallow.face.eyeStyle !== 'closed') return;
    this.overlay('peek', params || DEFAULT_PEEK, dur);
  }

  /** Timed face overlay (attack / hold / release, like a reaction's): replaces any overlay of the same kind. */
  overlay(kind, params, dur) {
    if (!this.ready) return this;
    this.overlays = this.overlays.filter((o) => o.kind !== kind);
    this.overlays.push({ start: this.time, dur, params, kind });
    return this;
  }

  /** Body impulses in react() units, scaled by motion intensity (a quarter with reduced motion; no hop). */
  nudge({ lean = 0, squash = 0, shear = 0, tilt = 0, hop = 0 } = {}) {
    const b = this.body, rm = this.opts.reducedMotion, k = this.motionScale * (rm ? 0.25 : 1);
    b.leanV += lean * 4 * k; b.squashV += squash * 6 * k; b.shearV += shear * 5 * k; b.tiltV += tilt * 60 * k;
    if (hop > 0 && b.grounded && !rm) { b.hopV = Math.sqrt(2 * 9.8 * hop * 0.14) * this.motionScale; b.grounded = false; b.squash += 0.06; }
    this._unsettle();
    return this;
  }

  /** The body on screen (CSS px in the container); same maths as Pocket Hush api.body(). */
  bodyRect(out = {}) {
    const S = this._S || this.S, soft = this.soft;
    const [bx0, by0, bx1, by1] = this.mallow.bodyBox;
    const hh = (soft ? soft.H : by1 - by0) * S, ww = (soft ? soft.W : bx1 - bx0) * S;
    const bottom = this.BASE - (this._lift || 0);
    out.cx = this.CX; out.top = bottom - hh; out.bottom = bottom; out.mid = bottom - hh / 2;
    out.w = ww; out.h = hh; out.W = this.W; out.H = this.H;
    return out;
  }

  /** Render cap: null = every frame (default), 0 = paused (the last frame stays), n = at most n renders a second. */
  setFrameCap(fps) { this.frameCap = fps == null || !Number.isFinite(+fps) ? null : Math.max(0, +fps); }

  /** Colour grade [r, g, b] (0..1 each; identity [1, 1, 1]): the mesh shader with WebGL, CSS brightness otherwise. */
  setGrade(rgb) {
    const g = this.grade;
    for (let i = 0; i < 3; i++) { const v = +rgb?.[i]; g[i] = Number.isFinite(v) ? clamp(v, 0, 1) : 1; }
    this._applyGrade();
  }

  _applyGrade() {
    const g = this.grade, r = this.renderer, gl = r?.mode === 'webgl';
    if (gl) r.setGrade(g);
    // the 2-D mesh and the strip fallback get brightness only (no temperature)
    const mean = gl ? 1 : (g[0] + g[1] + g[2]) / 3;
    if (mean !== this._gradeMean) { this._gradeMean = mean; this.canvas.style.filter = mean === 1 ? '' : `brightness(${mean.toFixed(3)})`; }
  }

  react(kind, opts = {}) {
    const b = this.body, k = this.motionScale;
    if (!this.ready || k === 1) return super.react(kind, opts);
    const v0 = { squashV: b.squashV, leanV: b.leanV, shearV: b.shearV, tiltV: b.tiltV, hopV: b.hopV };
    super.react(kind, opts);
    for (const key of Object.keys(v0)) b[key] = v0[key] + (b[key] - v0[key]) * k;
    return this;
  }

  _tick(dt, now) {
    if (this.frameCap === 0) { this._acc = 0; return; }
    this._acc += dt;
    if (this.frameCap && this._acc < 1 / this.frameCap - 0.004) return;
    const step = this._acc; this._acc = 0;
    this._tickEv.dt = step; this._emit('tick', this._tickEv);   // raw dt, before the update; reused object
    const n = Math.max(1, Math.ceil(step / 0.05));              // physics stays real time and stable
    for (let i = 0; i < n; i++) { this._noRender = i < n - 1; super._tick(step / n * this.speed, now); }
    this._noRender = false;
  }

  /** Screen (CSS px in the container) → soft-body local px. */
  toLocal(x, y) {
    const S = this._S || this.S, lift = this._lift || 0;
    const cy = -(this.mallow.bodyBox[3] - this.mallow.bodyBox[1]) * 0.5;
    let lx = (x - this.CX) / S, ly = (y - (this.BASE - lift)) / S;
    const a = -(this._tiltRad || 0);
    if (a) {
      const dy = ly - cy, c = Math.cos(a), s = Math.sin(a);
      const rx = lx * c - dy * s, ry = lx * s + dy * c;
      lx = rx; ly = ry + cy;
    }
    return [lx, ly];
  }

  /** Is the screen point on (or very near) the Mallow's body? */
  hitTest(x, y) {
    if (!this.soft) return false;
    const [lx, ly] = this.toLocal(x, y);
    return this.soft.distance(lx, ly) < this.soft.cell * 1.15;
  }

  lookAtScreen(x, y) {
    if (x == null) { this.lookAt(null); return; }
    this.lookAt((x - this.CX) / (this.W * 0.5), (y - (this.BASE - this.H * 0.3)) / (this.H * 0.5));
  }

  poke(x, y, strength = 1) {
    if (!this.soft) return;
    const [lx, ly] = this.toLocal(x, y);
    this.soft.poke(lx, ly, strength * this.motionScale * (this.opts.reducedMotion ? 0.4 : 1));
    this._unsettle();
  }

  grab(id, x, y) { if (!this.soft) return; const [lx, ly] = this.toLocal(x, y); this.soft.grab(id, lx, ly); this._unsettle(); }
  moveGrab(id, x, y) { if (!this.soft) return; const [lx, ly] = this.toLocal(x, y); this.soft.moveGrab(id, lx, ly); }

  /** Let go; returns how far it was stretched (body heights). vx, vy in CSS px / s. */
  release(id, vx = 0, vy = 0) {
    if (!this.soft) return 0;
    const S = this._S || this.S;
    const k = (this.opts.reducedMotion ? 0.3 : 1) * this.motionScale;
    this._unsettle();
    return this.soft.release(id, vx / S * k, vy / S * k);
  }

  brush(x, y, vx, vy) {
    if (!this.soft) return;
    const [lx, ly] = this.toLocal(x, y), S = this._S || this.S;
    this.soft.brush(lx, ly, vx / S, vy / S);
    this._unsettle();
  }

  /** Resting finger dent (hold). depth in body heights; 0 removes it. */
  setPress(x, y, depth) {
    if (!this.soft) return;
    if (!depth) { this.soft.setPress(0, 0, 0); return; }
    const [lx, ly] = this.toLocal(x, y);
    this.soft.setPress(lx, ly, depth * this.soft.H * this.soft.mat.dent);
  }

  /**
   * Squeeze the whole body. amount 0..1 compresses, < 0 stretches.
   * angle: screen angle of the line between the fingers (compression is along it).
   * Default (single-touch / button squeeze): straight down onto the floor.
   */
  setSqueeze(amount, angle = Math.PI / 2, cx = null) {
    const s = this.squeeze;
    s.target = clamp(amount, -0.8, 1);
    s.ax = Math.abs(Math.cos(angle)); s.ay = Math.abs(Math.sin(angle));
    const l = Math.hypot(s.ax, s.ay) || 1; s.ax /= l; s.ay /= l;
    s.px = cx == null ? 0 : clamp(this.toLocal(cx, 0)[0], -this.soft?.W * 0.3 || 0, this.soft?.W * 0.3 || 0);
    if (amount) this._unsettle();
  }

  metrics() { return this.soft ? this.soft.metrics() : null; }

  _unsettle() { this._settled = false; this._settleT = 0; }

  // ------------------------------------------------------ rig overrides --
  _label() {
    this.canvas?.setAttribute('aria-label', `${this.describe ? this.describe() : this.mallow.name}.`);
  }

  _resize() {
    super._resize();
    if (!this.renderer) return;
    const Q = QUALITY[this.quality];
    this.renderer.resize(this.W, this.H, Math.min(this.dpr, Q.dpr));
    if (this.soft && this._uvQ !== this.q) this.renderer.setUv(this._uv());
  }

  _composeTargets(dt) {
    const goal = super._composeTargets(dt);
    if (this.soft) {
      const sqFace = REACTIONS[this.id]?.squeezeFace || REACTIONS._shared.squeezeFace;
      deformationFace(goal, this.faceState, sqFace);
    }
    const fo = this.faceOverride;
    for (const k in fo.set) if (k in goal) goal[k] = fo.set[k];
    for (const k in fo.min) if (k in goal) goal[k] = Math.max(goal[k], fo.min[k]);
    return goal;
  }

  _updateBody(dt, goal) {
    const b = this.body;
    const wasGrounded = b.grounded;
    const hopV = b.hopV;
    super._updateBody(dt, goal);
    const s = this.soft;
    if (!s) return;
    const rm = this.opts.reducedMotion;
    // take-off and landing give the material something to jiggle with
    if (wasGrounded && !b.grounded) s.impulse(0, -Math.abs(b.hopV) * s.H * 0.9 * (rm ? 0.3 : 1));
    if (!wasGrounded && b.grounded) {
      const strength = clamp(Math.abs(hopV) / 3, 0, 1);
      s.impulse(0, Math.abs(hopV) * s.H * 0.8 * (rm ? 0.3 : 1));
      this._unsettle();
      this._emit('impact', { strength });
    }
    const sq = this.squeeze;
    // follow the fingers closely; let go a touch slower so the rebound is springy, not violent
    sq.c = approach(sq.c, sq.target, Math.abs(sq.target) < Math.abs(sq.c) ? 0.06 : 0.03, dt);
    const v = this.val;
    const bodyH = s.H;
    const breath = Math.sin(this.breathPhase) * 0.014 * v.breath * (rm ? 0.5 : 1);
    const lean = b.lean * bodyH * 0.55 + b.shear * bodyH * 0.18;
    const fl = s.mat.float + (rm ? 0.5 : 1) * Math.sin(this.time * 0.9) * 0.012 * (s.mat.float > 0 ? 1.6 : 0);
    this.inflate = approach(this.inflate, this.inflateTarget, 0.25, dt);
    s.setPose({ squash: b.squash, breath, lean, float: fl, inflate: this.inflate * 0.07,
      droop: v.droop, cheekPuff: v.cheekPuff, cheekV: this._cheekV,
      squeeze: Math.abs(sq.c) > 1e-3 ? { c: sq.c * 0.6, ax: sq.ax, ay: sq.ay, px: sq.px } : null });
    s.step(dt);
    // face follows the shape
    const M = s.metrics();
    this._m = M;
    const fs = this.faceState;
    fs.squeeze = clamp(Math.max(sq.c * 1.25, (M.squash - b.squash * 0.6) * 3.2), 0, 1);
    fs.stretch = clamp((M.offset - 0.05) * 3.4 + Math.max(0, -sq.c) * 1.2, 0, 1);
    fs.wobble = clamp((M.energy - 0.25) * 0.9, 0, 1);
    // settling detection (for the settle sound and for idle behaviour)
    if (!this._settled) {
      if (M.energy < 0.06 && Math.abs(sq.target) < 0.01 && s.grabs.size === 0) {
        this._settleT = (this._settleT || 0) + dt;
        if (this._settleT > 0.35) { this._settled = true; this._emit('settle', {}); }
      } else this._settleT = 0;
    }
  }

  _render() {
    if (this._noRender) return;   // a capped frame's earlier physics substeps
    this.renders++;
    if (!this.soft || !this.renderer) { super._render(); return; }
    this._skinDrawn = false;
    this._renderSkin();
    const ctx = this.ctx;
    const { W, H, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const v = this.val, b = this.body, m = this.mallow, s = this.soft;
    const rm = this.opts.reducedMotion;
    const bodyH = s.H, bodyW = s.W;
    const S = this.S * (1 - clamp(v.shrink, 0, 1) * 0.12);
    const floatY = (v.float * 0.07 + Math.sin(this.time * 0.9) * v.float * 0.012) * this.H * (rm ? 0.5 : 1);
    const lift = b.hop * this.H + floatY;
    const trem = rm ? 0 : v.tremble * 1.6 * (Math.sin(this.time * 41) * 0.6 + Math.sin(this.time * 27.7) * 0.4);
    const tilt = (b.tilt * Math.PI) / 180 + (b.spin > 0 ? spinCurve(1 - b.spin) * Math.PI * 2 : 0);
    this._S = S; this._lift = lift; this._tiltRad = tilt;
    const M = this._m || s.metrics();
    const hover = Math.max(0, -M.bottom) * S;

    // contact shadow follows the real footprint of the deformed body
    if (this.opts.shadow) {
      const footprint = (M.widen + 1) * bodyW * S * 0.46;
      const up = (lift + hover) / this.H;
      const sw = footprint * (1 - Math.min(0.5, up * 2.2));
      const sa = 0.32 * (1 - Math.min(0.75, up * 3));
      const g = ctx.createRadialGradient(this.CX, this.BASE, 0, this.CX, this.BASE, sw);
      g.addColorStop(0, `rgba(10,6,30,${sa})`);
      g.addColorStop(1, 'rgba(10,6,30,0)');
      ctx.save();
      ctx.translate(this.CX, this.BASE); ctx.scale(1, 0.22); ctx.translate(-this.CX, -this.BASE);
      ctx.fillStyle = g;
      ctx.fillRect(this.CX - sw, this.BASE - sw, sw * 2, sw * 2);
      ctx.restore();
    }
    if (this.opts.aura && v.glow > 0.02) {
      const r = bodyW * S * 0.75, cy = this.BASE - bodyH * S * 0.5 - lift - hover;
      const g = ctx.createRadialGradient(this.CX, cy, r * 0.2, this.CX, cy, r);
      g.addColorStop(0, hexA(m.colours.glow, 0.32 * clamp(v.glow, 0, 1.5)));
      g.addColorStop(1, hexA(m.colours.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(this.CX - r, cy - r, r * 2, r * 2);
    }
    if (this.opts.particles) this._ringBacks(ctx, S);   // a ripple's back half goes behind the body

    // mesh → screen
    const P = this._pos, n = s.n, px = s.px, py = s.py;
    const cyc = -bodyH * 0.5, cosA = Math.cos(tilt), sinA = Math.sin(tilt);
    const ox = this.CX + trem, oy = this.BASE - lift;
    for (let k = 0; k < n; k++) {
      let x = px[k], y = py[k];
      if (tilt) { const dy = y - cyc; const rx = x * cosA - dy * sinA, ry = x * sinA + dy * cosA; x = rx; y = ry + cyc; }
      P[k * 2] = ox + x * S; P[k * 2 + 1] = oy + y * S;
    }
    this._shadeMesh();
    if (this._uvQ !== this.q) this.renderer.setUv(this._uv());
    try {
      this.renderer.draw(this.skin, this._skinDrawn, P, this._shade);
      ctx.drawImage(this.renderer.canvas, 0, 0, W, H);
      if (this.id === 'glitzi' && b.glitchBurst > 0) this._glitchSlices(ctx, oy, bodyH * S, S);
    } catch (err) {
      // never let one bad frame stop the shared rig loop: drop to Canvas 2D, then to the standard rig
      this._renderFailed(err);
    }
    if (this.showMesh) this._drawMesh(ctx);
    if (this.opts.particles) this._drawParticles(ctx, lift, S);
  }

  // the field draws every particle but puffs, dust and rings (alpha 0 while it draws), which the lab draws soft
  _drawParticles(ctx, lift, S) {
    const list = this.particles.list, id = this.id;
    let n = 0;
    for (const p of list) if (softKind(p, id)) { p.labAlpha = p.alpha; p.alpha = 0; n++; }
    this.particles.draw(ctx, { lift, S });
    if (!n) return;
    const bodyH = (this.soft ? this.soft.H : 1) * S, reduced = !!this.opts.reducedMotion;
    ctx.save();
    for (const p of list) {
      if (!softKind(p, id)) continue;
      p.alpha = p.labAlpha;
      if (p.kind === 'ring') { this._ring(ctx, p, S, false); continue; }
      if (p.kind === 'puff' && !p.labLifted) liftPuff(p, bodyH, { reduced });
      const t = particleT(p), fx = SOFT_FX[p.kind];
      const a = (p.kind === 'puff' ? wispFade(t) : fieldFade(t)) * fx.peak * (p.alpha ?? 1);
      if (a < 0.004) continue;
      const r = p.size * (fx.grow[0] + fx.grow[1] * t) * 1.6;   // the sprite fades to its rim: a little wider than the disc was
      ctx.globalAlpha = a;
      ctx.drawImage(wispSprite(), p.x - r, p.y - r, 2 * r, 2 * r);
    }
    ctx.restore();
  }

  _ringBacks(ctx, S) {
    const list = this.particles.list;
    if (!list.length || this.id === 'zuzu') return;
    ctx.save();
    for (const p of list) if (p.kind === 'ring') this._ring(ctx, p, S, true);
    ctx.restore();
  }

  // a ripple at the feet as a soft stroke (a faint wide halo round a thinner core): the back half or the front half
  _ring(ctx, p, S, back) {
    const t = particleT(p), a = fieldFade(t) * (p.alpha ?? 1);
    if (a < 0.004) return;
    const [bx0, , bx1] = this.mallow.bodyBox;
    const r = p.size + p.grow * t, lw = Math.max(1, (bx1 - bx0) * S * 0.02 * (1 - t));
    ctx.strokeStyle = p.col; ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.28, 0, back ? Math.PI : 0, back ? 2 * Math.PI : Math.PI);
    ctx.globalAlpha = a * 0.22; ctx.lineWidth = lw * 3.2; ctx.stroke();
    ctx.globalAlpha = a * 0.55; ctx.lineWidth = lw; ctx.stroke();
  }

  // Glitzi's signature: short horizontal slices of the body jump sideways, like
  // the production rig's strip glitch (never strobing: the rig limits bursts)
  _glitchSlices(ctx, oy, hScreen, S) {
    const src = this.renderer.canvas, r = src.width / this.W;
    const b = this.body, bandH = hScreen * 0.07;
    for (const [row, dir] of b.burstRows) {
      const y = oy - hScreen + row * hScreen - bandH / 2;
      const dx = dir * b.glitchBurst * 4 * S * 7;
      if (y + bandH < 0 || y > this.H) continue;
      ctx.clearRect(0, y, this.W, bandH);
      ctx.drawImage(src, 0, Math.max(0, y * r), src.width, bandH * r, dx, Math.max(0, y), this.W, bandH);
    }
  }

  _renderFailed(err) {
    console.warn('[sensory-lab] mesh rendering failed, falling back', err);
    const was = this.renderer;
    if (was.mode === 'webgl') {
      this.prefer = '2d';
      this.renderer = new MeshRenderer({ prefer: '2d' });
      this.renderer.setMesh(this.soft.tri, this._uv());   // _uv() also sets the look
      this._resize();
    } else {
      this.renderer = null;    // _render() uses the production rig's strip warp from now on
    }
    was.dispose();
    this._applyGrade();
  }

  // light term per vertex from the local area change (squash deepens, stretch brightens)
  _shadeMesh() {
    const s = this.soft, sh = this._shade, T = s.tri, A0 = s.tA;
    sh.fill(0);
    const cnt = this._cnt || (this._cnt = new Float32Array(s.n));
    cnt.fill(0);
    for (let t = 0; t < A0.length; t++) {
      const r = A0[t] > 1e-6 ? s._triArea(t, s.px, s.py) / A0[t] : 1;
      const v = clamp((r - 1) * 1.4, -0.6, 0.6);
      for (let j = 0; j < 3; j++) { const k = T[t * 3 + j]; sh[k] += v; cnt[k]++; }
    }
    for (let k = 0; k < s.n; k++) if (cnt[k]) sh[k] /= cnt[k];
  }

  _drawMesh(ctx) {
    const P = this._pos, T = this.soft.tri;
    ctx.save();
    if (!this._meshCol || this.time - this._meshColT > 0.5) {   // theme can change; re-read twice a second
      this._meshCol = getComputedStyle(this.canvas).getPropertyValue('--mesh').trim() || 'rgba(255,255,255,0.55)';
      this._meshColT = this.time;
    }
    const col = this._meshCol;
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = col;
    ctx.beginPath();
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t] * 2, b = T[t + 1] * 2, c = T[t + 2] * 2;
      ctx.moveTo(P[a], P[a + 1]); ctx.lineTo(P[b], P[b + 1]); ctx.lineTo(P[c], P[c + 1]); ctx.closePath();
    }
    ctx.stroke();
    ctx.fillStyle = col;
    for (let k = 0; k < P.length; k += 2) ctx.fillRect(P[k] - 1, P[k + 1] - 1, 2, 2);
    ctx.restore();
  }

  destroy() {
    super.destroy();
    this.renderer?.dispose();
    this.renderer = null;
    this.soft = null;
  }
}

function spinCurve(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1).toFixed(3)})`;
}
