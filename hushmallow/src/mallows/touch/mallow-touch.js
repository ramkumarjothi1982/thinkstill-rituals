// MallowTouch — a living, squeezable Mallow.
//
//   const mt = new MallowTouch(container, { id: 'glitzi', quality: 'auto', audio, haptic });
//   await mt.loaded;
//   mt.place({ x: 195, y: 430, scale: 1 });        // body centre, container CSS px
//   mt.on('touch', (e) => …);                     // {kind, depth, stretch, speed, turns, dir}
//
// Layers inside `container` (which it fills; it may be the full viewport):
//   a WebGL canvas (tier A: the textured soft-body mesh, contact shadow and
//   aura) under a 2D canvas (particles; in tiers B and C everything). Both are
//   transparent outside the Mallow.
//
// Each frame (one shared requestAnimationFrame via rig.addTicker):
//   1. TouchReader turns fingers into press depth / pull / stretch / flick /
//      jiggle / massage / stroke / tap.
//   2. Those drive SoftBody constraints (grabs, dents, plungers, swirls,
//      release velocities) and the headless MallowRig's face (setTouch).
//   3. The rig's expression (squash, breath, droop, cheek puff, shrink, lean)
//      becomes SoftBody's rest shape; hop, tilt, spin and float stay a rigid
//      stage transform (a JS transform, never CSS scale, so hit-testing and
//      raster resolution stay exact).
//   4. The rig re-renders only the face rect that changed; tier A uploads just
//      that rect with texSubImage2D and draws the mesh with lighting from the
//      deformation.
// At rest the mesh is the rest shape and the rig cross-fades in the untouched
// approved artwork, so an idle Mallow is exactly the approved picture.
//
// Routed input (bindPointer:false): call mt.pointer({type, id, x, y, t}) with
// client CSS px and t in ms (event.timeStamp); it returns true when the event
// is the Mallow's. mt.hitTest(x, y) tells a router whether a touch lands on it.

import { MALLOWS, maskAlpha } from '../registry.js';
import { MallowRig, addTicker, removeTicker, prefersReducedMotion, facePartsSrc } from '../rig.js';
import { SoftBody } from './softbody.js';
import { TouchReader } from './gestures.js';
import { MeshRenderer, coarseGrid, drawTriangleWarp, drawStripWarp } from './mesh-gl.js';
import { personaFor } from './persona.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const COLS = 21, ROWS = 21;
const PAD = 3;                 // source px of margin around the body box
const HOP_SCALE = 2.2;         // the rig measures hops in layer heights (≈ 2.2 body heights)
const TIERS = { gl: 'A', tri: 'B', strip: 'C' };
const REBOUND = 2.4;           // upward velocity (body heights/s) a full squeeze releases

const hexRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const spinCurve = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class MallowTouch {
  /**
   * @param {HTMLElement} container
   * @param {object} opts
   * @param {string} opts.id  Mallow id
   * @param {'auto'|'gl'|'tri'|'strip'} [opts.quality='auto']
   * @param {boolean} [opts.reducedMotion]  @param {boolean} [opts.lowStim]
   * @param {object} [opts.audio]  the audio engine (play / hold / fx), or null
   * @param {(kind:string)=>void} [opts.haptic]  e.g. haptics.js haptic; null = none
   * @param {boolean} [opts.bindPointer=true]  listen to pointers itself
   */
  constructor(container, opts = {}) {
    const id = MALLOWS[opts.id] ? opts.id : 'boppo';
    this.opts = { quality: 'auto', reducedMotion: prefersReducedMotion(), lowStim: false, audio: null, haptic: null,
      bindPointer: true, skinSize: 640, ...opts, id };
    this.id = id;
    this.mallow = MALLOWS[id];
    this.persona = personaFor(id);
    this.container = container;
    this.listeners = {};
    this.destroyed = false;
    this.ready = false;
    this.visible = true;
    this.time = 0;
    this.tier = null;
    this.stats = { tier: '', fps: 0, frameMs: 0, solverMs: 0, skinMs: 0, uploadMs: 0, drawMs: 0, uploadPx: 0, substeps: 0, frames: 0 };

    const root = this.root = document.createElement('div');
    root.className = 'mallow-touch';
    root.style.cssText = 'position:absolute;inset:0;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;' +
      '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.style.pointerEvents = this.opts.bindPointer ? 'auto' : 'none';
    root.setAttribute('role', 'button');
    root.tabIndex = 0;
    container.appendChild(root);
    this.c2d = this._canvas(2);
    this.ctx = this.c2d.getContext('2d');

    const rm = !!this.opts.reducedMotion;
    this.rig = new MallowRig(root, {
      id, headless: true, interactive: false, skinSize: this.opts.skinSize, reducedMotion: rm,
      audio: this.opts.audio, haptic: (k) => this._rigHaptic(k), particles: !this.opts.lowStim, lowStim: !!this.opts.lowStim,
      onImpulse: (imp, kind) => this._impulse(imp, kind),
      touchFace: (goal, T, rig) => this.persona.face?.(goal, T, rig),
    });
    this.rig.geoOverride = () => this._geo;
    this.rig.faceOverride = (sx, sy) => this._facePoint(sx, sy);

    // stage transform (springs), in container CSS px
    this.view = { w: 1, h: 1, left: 0, top: 0, dpr: 1 };
    this.st = { x: 0, y: 0, s: 1, vx: 0, vy: 0, vs: 0 };
    this.goalSt = { x: null, y: null, s: 1 };
    this.fl = { lift: 0, tilt: 0, vl: 0, vt: 0, gl: 0, gt: 0 };
    this.M = [1, 0, 0, 1, 0, 0];
    this.Minv = [1, 0, 0, 1, 0, 0];
    this._geo = { cx: 0, top: 0, bottom: 0, w: 1, h: 1, mid: 0 };
    this._pt = { x: 0, y: 0 };
    this._b = { x: 0, y: 0 };
    this._loc = { u: 0, v: 0, tri: -1 };

    // touch state
    this.touch = { depth: 0, stretch: 1, speed: 0, turns: 0, strokes: 0, calm: 0, jiggle: 0, held: 0, massageRate: 0, twistRate: 0 };
    this._fingers = new Map();       // id → {band, x0, y0}
    this._lastSoothe = -1;
    this._lag = { x: 0, y: 0, vx: 0, vy: 0 };
    this._rim = 0;
    this._squash = 0;
    this._lastTwist = 0;
    this._hold = null;
    this._hum = null;
    this._lastGasp = -9;
    this._muteRigHaptic = false;
    this._dirty = null;
    this._frameCosts = [];
    this._rimCol = hexRgb(this.mallow.colours.glow);
    this._glowCol = this._rimCol;
    this._glitch = new Float32Array(36);
    this._burst = new Float32Array(18);
    this._item = { key: 'hero', positions: null, shade: null, m: this.M, lag: [0, 0], rim: 0, rimCol: this._rimCol, light: 1, glitch: null, glitchThick: 3, burst: null, src: [1, 1] };
    this._blobs = [
      { x: 0, y: 0, rx: 1, ry: 1, rgba: [10 / 255, 6 / 255, 30 / 255, 0.3], inner: 0 },
      { x: 0, y: 0, rx: 1, ry: 1, rgba: [...this._glowCol, 0], inner: 0.2 },
    ];
    this._blobList = [];

    this._tick = this._tick.bind(this);
    this._onResize = () => this._resize();
    this.loaded = this.rig.loaded.then(() => { if (!this.destroyed) this._init(); return this; });
  }

  _canvas(z) {
    const c = document.createElement('canvas');
    c.style.cssText = `position:absolute;left:0;top:0;width:100%;height:100%;display:block;background:transparent;z-index:${z};pointer-events:none;`;
    c.setAttribute('aria-hidden', 'true');
    this.root.appendChild(c);
    return c;
  }

  // ------------------------------------------------------------- set-up --
  _init() {
    const m = this.mallow, rig = this.rig;
    const [bx0, by0, bx1, by1] = m.bodyBox;
    const x0 = Math.max(0, bx0 - PAD), y0 = Math.max(0, by0 - PAD), x1 = Math.min(m.size[0], bx1 + PAD), y1 = by1;
    this.box = [x0, y0, x1, y1];
    const bw = x1 - x0, bh = y1 - y0;
    this.aspect = bw / bh;
    const skin = rig.skin, q = rig.q;
    this.uvRect = [(x0 * q) / skin.width, (y0 * q) / skin.height, (x1 * q) / skin.width, (y1 * q) / skin.height];
    const mask = rig.assets?.mask;
    const maskFn = mask ? (u, v) => maskAlpha(mask, (x0 + u * bw) / m.size[0], (y0 + v * bh) / m.size[1]) : null;
    this._maskFn = maskFn;
    // the face core (eyes + mouth) is stiffer and dents less
    const parts = facePartsSrc(m);
    const fr = [Math.min(parts.eyes[0], parts.mouth[0]), Math.min(parts.eyes[1], parts.mouth[1]), Math.max(parts.eyes[2], parts.mouth[2]), Math.max(parts.eyes[3], parts.mouth[3])];
    const faceRect = [(fr[0] - x0) / bw, (fr[1] - y0) / bh, (fr[2] - x0) / bw, (fr[3] - y0) / bh];
    this.cheekV = clamp(((m.face.cheeks?.L?.[1] ?? by0 + (by1 - by0) * 0.65) - y0) / bh, 0, 1);
    this.sb = new SoftBody({ cols: COLS, rows: ROWS, aspect: this.aspect, mask: maskFn, faceRect, uvRect: this.uvRect,
      material: this._material(), reducedMotion: !!this.opts.reducedMotion });
    this.coarse = coarseGrid(this.sb, 2);
    this._item.src = [m.size[0], m.size[1]];

    this.reader = new TouchReader({
      hit: (x, y) => this.hitTest(x, y),
      bodySize: () => this._P() * this.aspect,
      centre: () => { const r = this.bodyRect(); return { x: r.cx, y: r.cy }; },
    });
    this._bindReader();
    this._setTier(this.opts.quality);
    if (this.opts.bindPointer) this._bindPointer();
    this._bindKeys();
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this._onResize) : null;
    this.ro?.observe(this.container);
    addEventListener('resize', this._onResize);
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((es) => { this.visible = es.some((e) => e.isIntersecting); this.rig.visible = this.visible; });
      this.io.observe(this.root);
    }
    this._resize();
    this.st.x = this.goalSt.x ?? this.view.w / 2;
    this.st.y = this.goalSt.y ?? this.view.h * 0.52;
    this.st.s = this.goalSt.s;
    this._computeTransform(0);
    this._rest();
    this.sb.reset();
    this._updateGeo();
    this._label();
    this.rig.on('emotion', () => this._label());
    this.ready = true;
    addTicker(this._tick);
    this._emit('ready', this);
  }

  _material() {
    const base = this.persona.material;
    return this.opts.reducedMotion ? { ...base, dMax: base.dMax * 0.6 } : { ...base };
  }

  _setTier(quality) {
    const want = quality === 'gl' || quality === 'tri' || quality === 'strip' ? quality : 'auto';
    this.quality = want;
    let tier = want === 'auto' ? 'gl' : want;
    if (tier === 'gl' && !this.renderer) {
      this.glCanvas = this._canvas(1);
      const r = new MeshRenderer(this.glCanvas, {
        strict: want === 'auto',
        onLost: () => { this._lostGL = true; this._applyTier('tri'); this._emit('tier', { tier: this.tier, reason: 'context-lost' }); },
        onRestored: () => { this._lostGL = false; if (this.quality === 'gl' || this.quality === 'auto') { this._applyTier('gl'); this._emit('tier', { tier: this.tier, reason: 'restored' }); } },
      });
      if (!r.ok) { r.destroy(); this.glCanvas.remove(); this.glCanvas = null; tier = 'tri'; } else {
        this.renderer = r;
        r.addBody('hero', { source: this.rig.skin, indices: this.sb.indices, uvs: this.sb.uvs, faceW: this.sb.faceW, n: this.sb.n });
      }
    }
    if (tier === 'gl' && (!this.renderer || this._lostGL)) tier = 'tri';
    this._applyTier(tier);
  }

  _applyTier(tier) {
    this.tier = tier;
    this.stats.tier = TIERS[tier];
    this._frameCosts.length = 0;
    // Glitzi's glitch lines move to the shader in tier A; 2D tiers keep them in the skin
    this.rig.opts.shaderGlitch = tier === 'gl';
    this.rig.skinDirty = true;
    if (this.glCanvas) this.glCanvas.style.display = tier === 'gl' ? 'block' : 'none';
    if (tier === 'gl' && this.renderer) this.renderer.updateTexture('hero', this.rig.skin, null);
    this._clear2d(true);
  }

  /** Force a tier: 'auto' | 'gl' | 'tri' | 'strip'. */
  setQuality(q) { if (this.ready) this._setTier(q); else this.opts.quality = q; }

  _resize() {
    if (this.destroyed) return;
    const r = this.container.getBoundingClientRect();
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const v = this.view;
    v.w = w; v.h = h; v.left = r.left; v.top = r.top; v.dpr = dpr;
    const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    if (this.c2d.width !== cw) this.c2d.width = cw;
    if (this.c2d.height !== ch) this.c2d.height = ch;
    this.renderer?.resize(w, h, dpr);
    this._dirty = null;
    if (this.goalSt.x == null) this.st.x = w / 2;
    if (this.goalSt.y == null) this.st.y = h * 0.52;
  }

  _label() {
    const d = this.rig.describe();
    this.root.setAttribute('aria-label', `${d}. Press and hold to squeeze, drag to pull, two fingers to stretch, or tap.`);
  }

  // ------------------------------------------------------------- public --
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return this; }
  off(ev, fn) { const l = this.listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } return this; }
  _emit(ev, data) { for (const fn of this.listeners[ev] || []) { try { fn(data); } catch (e) { console.error(e); } } }

  setEmotion(mix, intensity = 0.7, opts = {}) { this.rig.setEmotion(mix, intensity, opts); return this; }
  setStage(name, opts) { this.rig.setStage(name, opts); return this; }
  react(kind, opts) { this.rig.react(kind, opts); return this; }
  lookAt(nx, ny) { this.rig.lookAt(nx, ny); return this; }
  setAudio(a) { this.opts.audio = a; this.rig.opts.audio = a; }
  setHaptic(fn) { this.opts.haptic = fn; }
  setReducedMotion(b) {
    this.opts.reducedMotion = !!b;
    this.rig.setReducedMotion(b);
    this.sb?.setReducedMotion(b);
    this.sb?.setMaterial(this._material());
  }
  setLowStim(b) { this.opts.lowStim = !!b; this.rig.opts.particles = !b; if (b) this.rig.particles.list.length = 0; }

  /** Body centre at (x, y) container CSS px; scale × the default size. */
  place({ x, y, scale } = {}, { instant = false } = {}) {
    if (Number.isFinite(x)) this.goalSt.x = x;
    if (Number.isFinite(y)) this.goalSt.y = y;
    if (Number.isFinite(scale)) this.goalSt.s = clamp(scale, 0.2, 3);
    if (instant || !this.ready) {
      if (this.goalSt.x != null) this.st.x = this.goalSt.x;
      if (this.goalSt.y != null) this.st.y = this.goalSt.y;
      this.st.s = this.goalSt.s; this.st.vx = this.st.vy = this.st.vs = 0;
    }
    return this;
  }

  /** Extra float: lift in body heights, tilt in degrees (sprung). */
  float({ lift, tilt } = {}) {
    if (Number.isFinite(lift)) this.fl.gl = clamp(lift, -1, 3);
    if (Number.isFinite(tilt)) this.fl.gt = clamp(tilt, -45, 45);
    return this;
  }

  /** The deformed body's bounding box in client CSS px. */
  bodyRect() {
    const v = this.view, r = this.container.getBoundingClientRect?.() || { left: v.left, top: v.top };
    if (!this.sb) {
      const P = this._P(), w = P * (this.aspect || 1);
      const cx = r.left + (this.goalSt.x ?? v.w / 2), cy = r.top + (this.goalSt.y ?? v.h * 0.52);
      return { left: cx - w / 2, top: cy - P / 2, width: w, height: P, right: cx + w / 2, bottom: cy + P / 2, cx, cy };
    }
    const b = this.sb.bounds(), M = this.M;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [bx, by] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
      const X = M[0] * bx + M[2] * by + M[4], Y = M[1] * bx + M[3] * by + M[5];
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    }
    x0 += r.left; x1 += r.left; y0 += r.top; y1 += r.top;
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0, right: x1, bottom: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  /** Is the client point (CSS px) on the Mallow's (deformed) body? */
  hitTest(x, y) {
    if (!this.sb) return false;
    const r = this.container.getBoundingClientRect();
    const b = this._toBody(x - r.left, y - r.top);
    const bb = this.sb.bounds();
    if (b.x < bb.x0 - 0.02 || b.x > bb.x1 + 0.02 || b.y < bb.y0 - 0.02 || b.y > bb.y1 + 0.02) return false;
    const loc = this.sb.locate(b.x, b.y, this._loc);
    if (!loc) return false;
    return !this._maskFn || this._maskFn(loc.u, loc.v) > 0.22;
  }

  /** Routed pointer: {type:'down'|'move'|'up'|'cancel', id, x, y, t?(ms, performance.now() clock)}. Returns true when it is the Mallow's. */
  pointer(e) {
    if (!this.ready || !e) return false;
    const t = (Number.isFinite(e.t) ? e.t : nowMs()) / 1000;
    if (e.type === 'move' && !this.reader.ptrs.has(e.id)) { this._gaze(e.x, e.y); return false; }
    return this.reader.pointer({ type: e.type, id: e.id, x: e.x, y: e.y, t, shift: !!e.shift, mouse: !!e.mouse });
  }

  get state() {
    const T = this.touch;
    return { tier: this.stats.tier, depth: T.depth, stretch: T.stretch, speed: T.speed, turns: T.turns, strokes: T.strokes, calm: T.calm,
      energy: this.sb ? this.sb.energy : 0, pointers: this.reader ? this.reader.ptrs.size : 0, ready: this.ready };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    removeTicker(this._tick);
    this._hold?.stop(); this._hum?.stop();
    this._unbind?.(); this._unbindKeys?.();
    this.ro?.disconnect(); this.io?.disconnect();
    removeEventListener('resize', this._onResize);
    this.renderer?.destroy();
    this.rig.destroy();
    this.root.remove();
  }

  // ----------------------------------------------------------- geometry --
  _P() {
    const v = this.view;
    const base = clamp(Math.min((0.6 * v.w) / (this.aspect || 1), 0.34 * v.h), 110, 330);
    return base * this.st.s;
  }

  _toBody(x, y) {
    const I = this.Minv, b = this._b;
    const dx = x - this.M[4], dy = y - this.M[5];
    b.x = I[0] * dx + I[2] * dy; b.y = I[1] * dx + I[3] * dy;
    return b;
  }

  _computeTransform(dt) {
    const rig = this.rig, b = rig.body, v = rig.val, rm = !!this.opts.reducedMotion;
    // stage springs (place / float): critically damped glide
    const st = this.st, g = this.goalSt;
    const k = rm ? 60 : 90, c = 2 * Math.sqrt(k);
    const gx = g.x ?? this.view.w / 2, gy = g.y ?? this.view.h * 0.52;
    st.vx += (k * (gx - st.x) - c * st.vx) * dt; st.x += st.vx * dt;
    st.vy += (k * (gy - st.y) - c * st.vy) * dt; st.y += st.vy * dt;
    st.vs += (k * (g.s - st.s) - c * st.vs) * dt; st.s += st.vs * dt;
    const fl = this.fl, kf = 40, cf = 2 * Math.sqrt(kf) * 0.8;
    fl.vl += (kf * (fl.gl - fl.lift) - cf * fl.vl) * dt; fl.lift += fl.vl * dt;
    fl.vt += (kf * (fl.gt - fl.tilt) - cf * fl.vt) * dt; fl.tilt += fl.vt * dt;
    const P = this._P(), Href = P * HOP_SCALE;
    const floatY = (v.float * 0.07 + Math.sin(rig.time * 0.9) * v.float * 0.012) * Href * (rm ? 0.5 : 1);
    const lift = b.hop * Href + floatY + fl.lift * P;
    const trem = rm ? 0 : v.tremble * 1.6 * (P / 215) * (Math.sin(rig.time * 41) * 0.6 + Math.sin(rig.time * 27.7) * 0.4);
    const th = ((b.tilt + fl.tilt) * Math.PI) / 180 + (b.spin > 0 ? spinCurve(1 - b.spin) * TAU : 0);
    const co = Math.cos(th), si = Math.sin(th), aw = this.aspect;
    const ox = st.x, oy = st.y + P / 2;
    const M = this.M;
    M[0] = co * P; M[1] = si * P; M[2] = -si * P; M[3] = co * P;
    M[4] = ox + trem - co * P * aw / 2 + si * 0.5 * P;
    M[5] = oy - lift - 0.5 * P - si * P * aw / 2 - co * 0.5 * P;
    const det = M[0] * M[3] - M[1] * M[2] || 1e-9, I = this.Minv;
    I[0] = M[3] / det; I[1] = -M[1] / det; I[2] = -M[2] / det; I[3] = M[0] / det;
    this._lift = lift; this._floorY = oy; this._Pnow = P;
  }

  // particles spawn from the deformed body (CSS px, canvas space)
  _updateGeo() {
    const b = this.sb.bounds(), M = this.M, g = this._geo;
    const cx = (b.x0 + b.x1) / 2;
    const X = (x, y) => M[0] * x + M[2] * y + M[4], Y = (x, y) => M[1] * x + M[3] * y + M[5];
    g.cx = X(cx, (b.y0 + b.y1) / 2);
    g.top = Y(cx, b.y0); g.bottom = Y(cx, b.y1);
    g.w = (b.x1 - b.x0) * this._Pnow; g.h = (b.y1 - b.y0) * this._Pnow;
    g.mid = (g.top + g.bottom) / 2;
    g.kind = this.id;
  }

  _facePoint(sx, sy) {
    if (!this.sb) return null;
    const [x0, y0, x1, y1] = this.box;
    const p = this.sb.sample((sx - x0) / (x1 - x0), (sy - y0) / (y1 - y0), this._pt);
    const M = this.M;
    return { x: M[0] * p.x + M[2] * p.y + M[4], y: M[1] * p.x + M[3] * p.y + M[5] };
  }

  // ------------------------------------------------------------- input --
  _bindPointer() {
    const el = this.root;
    // one clock for everything: performance.now() when handled (event.timeStamp
    // can be on another base for synthesized input); coalesced samples keep
    // their relative spacing
    const conv = (e, type, base) => ({ type, id: e.pointerId, x: e.clientX, y: e.clientY,
      t: (nowMs() - (base ? Math.max(0, base.timeStamp - e.timeStamp) : 0)) / 1000, shift: e.shiftKey, mouse: e.pointerType === 'mouse' });
    const down = (e) => {
      if (e.button > 0) return;
      const ok = this.reader.pointer(conv(e, 'down'));
      if (ok) { try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ } e.preventDefault(); el.focus?.({ preventScroll: true }); }
    };
    const move = (e) => {
      if (!this.reader.ptrs.has(e.pointerId) && !(this.reader._shift && this.reader._shift.src === e.pointerId)) { this._gaze(e.clientX, e.clientY); return; }
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (list && list.length > 1) for (const c of list) this.reader.pointer(conv(c, 'move', e));
      else this.reader.pointer(conv(e, 'move'));
      e.preventDefault();
    };
    const up = (e) => { this.reader.pointer(conv(e, e.type === 'pointercancel' ? 'cancel' : 'up')); };
    const leave = () => { if (!this.reader.active) this.rig.lookAt(null); };
    const wheel = (e) => {
      if (!e.ctrlKey) return;
      if (this.reader.wheel({ x: e.clientX, y: e.clientY, deltaY: e.deltaY, t: nowMs() / 1000 })) e.preventDefault();
    };
    const gesture = (e) => e.preventDefault();
    const ctx = (e) => { if (this.hitTest(e.clientX, e.clientY)) e.preventDefault(); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('gesturestart', gesture);
    el.addEventListener('contextmenu', ctx);
    this._unbind = () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave); el.removeEventListener('wheel', wheel);
      el.removeEventListener('gesturestart', gesture); el.removeEventListener('contextmenu', ctx);
    };
  }

  _bindKeys() {
    const el = this.root;
    const k = (type) => (e) => {
      if (!['Enter', ' ', 'Spacebar', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      if (this.reader.key({ type, key: e.key, t: nowMs() / 1000, repeat: e.repeat })) e.preventDefault();
    };
    const kd = k('down'), ku = k('up');
    el.addEventListener('keydown', kd); el.addEventListener('keyup', ku);
    this._unbindKeys = () => { el.removeEventListener('keydown', kd); el.removeEventListener('keyup', ku); };
  }

  _gaze(x, y) {
    if (!this.sb) return;
    const r = this.bodyRect();
    this.rig.lookAt(clamp((x - r.cx) / (r.width * 0.8), -1, 1), clamp((y - r.cy) / (r.height * 0.8), -1, 1));
  }

  _local(x, y) { return this._toBody(x - this.view.left, y - this.view.top); }

  _bindReader() {
    const R = this.reader;
    R.on('down', (e) => {
      const cr = this.container.getBoundingClientRect();
      this.view.left = cr.left; this.view.top = cr.top;
      const b = this._local(e.x, e.y);
      this.sb.grab(e.id, b.x, b.y, 0.3);
      this.sb.press(e.id, b.x, b.y, 0, 0.21);
      this._fingers.set(e.id, { band: 0, bx: b.x, by: b.y, x0: e.x, y0: e.y });
      if (R.ptrs.size === 1) this.opts.audio?.play?.(this.id, 'press');
      this._haptic('light');
      this._gaze(e.x, e.y);
      this._wake();
      this._touchEvent('down');
    });
    R.on('move', (e) => {
      const p = R.ptrs.get(e.id);
      const b = this._local(e.x, e.y);
      this.sb.move(e.id, b.x, b.y, p ? p.pull : 0);
      this._gaze(e.x, e.y);
      if (!this._fingers.get(e.id)?.pulled && p && p.pull > 0.5) { this._fingers.get(e.id).pulled = true; this._touchEvent('pull'); }
      // a fast drag startles a little
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > 1700 && this.time - this._lastGasp > 1.6 && p && p.pull > 0.6) { this._lastGasp = this.time; this.rig.react('gasp'); }
    });
    R.on('up', (e) => this._release(e));
    R.on('stretchStart', (s) => {
      this._wasStretch = true;
      for (const id of [s.a, s.b]) this.sb.setGrip(id, 0.38);
      this._touchEvent('stretch');
    });
    R.on('stretchEnd', () => this._touchEvent('stretchEnd'));
    R.on('tap', () => { this.rig.react('tap'); this._touchEvent('tap'); });
    R.on('doubleTap', () => { this.rig.react('doubleTap'); this._touchEvent('doubleTap'); });
    R.on('jiggle', (e) => {
      this.touch.jiggle = 1;
      if (!this.opts.reducedMotion) {
        const s = this._Pnow || 200;
        const amp = e.axis === 'x' ? [Math.sign(R.ptrs.get(e.id)?.vx || 1) * 0.6, 0] : [0, Math.sign(R.ptrs.get(e.id)?.vy || 1) * 0.6];
        this.sb.impulse(amp[0] * (220 / s), amp[1] * (220 / s));
      }
      if (!this.persona.onJiggle?.(this, e)) this.rig.overlay({ mouthOpen: 0.6, mouthSmile: 1, closedCurve: -1, eyeOpen: 0.35, blush: 1.8 }, { dur: 0.9 });
      this._touchEvent('jiggle');
    });
    R.on('massageStart', () => {
      this._hold?.stop(); this._hold = null;
      this._hum = this.opts.audio?.hold?.('hum', { intensity: 0.2, pitch: 1 }) || null;
    });
    R.on('massage', (e) => {
      const T = this.touch;
      T.calm = Math.min(0.8, T.calm + 0.06);
      this._lastSoothe = this.time;
      const whole = Math.floor(e.turns);
      if (whole > (this._turnTick || 0)) { this._turnTick = whole; this._haptic('tick'); }
      this.persona.onMassage?.(this, e);
      this._touchEvent('massage', { turns: e.turns, dir: e.dir });
    });
    R.on('massageEnd', () => { this._hum?.stop(); this._hum = null; this._turnTick = 0; });
    R.on('stroke', (e) => {
      const T = this.touch;
      T.strokes += 1;
      T.calm = Math.min(0.8, T.calm + (T.strokes >= 3 ? 0.3 : 0.16));
      this._lastSoothe = this.time;
      const b = this._local(e.x, e.y);
      const s = Math.min(1.5, e.speed / 400) * (this.opts.reducedMotion ? 0.3 : 1);
      // a light tangential drag on the surface it brushed
      this.sb.impulse(e.dx * s * 0.9, e.dy * s * 0.9, { x: b.x, y: b.y, r: 0.28 });
      this.opts.audio?.fx?.('swish', { intensity: 0.25 });
      this._haptic('tick');
      this.persona.onStroke?.(this, { ...e, strokes: T.strokes });
      this._touchEvent('stroke', { dir: e.dir });
    });
  }

  _release(e) {
    const id = e.id;
    // release velocity, CSS px/s → body units/s (undo the stage rotation + scale)
    const I = this.Minv;
    let vx = I[0] * e.vx + I[2] * e.vy, vy = I[1] * e.vx + I[3] * e.vy;
    const flick = e.kind === 'flick';
    const fs = this.persona.flickScale ?? 1;
    if (flick) { vx *= fs; vy *= fs; }
    if (!flick) { vx *= 0.45; vy *= 0.45; }
    this.sb.release(id, { vx, vy, flick });
    // how much of this touch was a squeeze (a pull or a two-finger stretch grips instead)
    const stretched = this._wasStretch;
    const depth = stretched ? 0 : e.depth * (1 - 0.7 * (e.pull || 0));
    if (this.reader.ptrs.size === 0) { this._hold?.stop(); this._hold = null; this._wasStretch = false; }
    if (e.cancelled) { this._fingers.delete(id); this._touchEvent('release'); return; }
    if (flick) {
      if (!this.persona.onFlick?.(this, e)) this.rig.react('flick', { dirX: Math.sign(e.vx) || 1 });
      this._fingers.delete(id);
      this._touchEvent('flick');
      return;
    }
    if (e.kind === 'tapStart' || e.kind === 'doubleTap') {
      // an instant, small poke so every tap answers within a frame
      const b = this._local(e.x, e.y);
      if (!this.opts.reducedMotion) this.sb.impulse(0, 1.4, { x: b.x, y: b.y, r: 0.22 });
      this._fingers.delete(id);
      return;
    }
    if (depth > 0.25) {
      this._muteRigHaptic = true;
      if (!this.persona.onRelease?.(this, { depth, ...e })) this.rig.react('release');
      this._muteRigHaptic = false;
      if (depth > 0.5) this._haptic('pop');
    } else if (!stretched || this.reader.ptrs.size === 0) this.opts.audio?.play?.(this.id, 'release', { intensity: 0.3 });
    this._fingers.delete(id);
    // the stored squeeze springs back: the press leaves the rest shape at once
    // and the body pops up past its rest height before it settles
    if (this.reader.ptrs.size === 0 && depth > 0.1) {
      this._squash = 0;
      // the same pop height for every Mallow (softer ones ring slower, not taller)
      const M = this.sb.material, k = Math.sqrt((M.kG + M.kL) / 0.83);
      if (!this.opts.reducedMotion) this.sb.deform('squash', -REBOUND * depth * k);
    }
    this._touchEvent('release', { depth });
  }

  _touchEvent(kind, extra) {
    const T = this.touch;
    this._emit('touch', { kind, depth: T.depth, stretch: T.stretch, speed: T.speed, turns: T.turns, dir: extra?.dir ?? 0, ...extra });
  }

  _haptic(kind) { try { this.opts.haptic?.(kind); } catch { /* ignore */ } }
  _rigHaptic(kind) { if (!this._muteRigHaptic) this._haptic(kind); }

  // rig reactions arrive as soft-body velocity fields
  _impulse(imp, kind) {
    if (!this.sb) return;
    const rm = this.opts.reducedMotion;
    if (imp.squash) this.sb.deform('squash', imp.squash * 1.5);
    const sh = (imp.lean || 0) * 0.55 + (imp.shear || 0) * 0.18;
    if (sh) this.sb.deform('shear', sh * (rm ? 0.5 : 2.2));
    void kind;
    this._wake();
  }

  _wake() { this._sleep = 0; }

  // -------------------------------------------------------------- frame --
  _tick(dt) {
    if (!this.ready || this.destroyed) return;
    if (!this.visible || (typeof document !== 'undefined' && document.hidden)) return;
    const t0 = nowMs();
    this.time += dt;
    this._dt = dt;
    const st = this.stats;
    st.fps = st.fps ? st.fps + (1 / Math.max(dt, 1e-3) - st.fps) * 0.08 : 1 / Math.max(dt, 1e-3);
    this._computeTransform(dt);
    const R = this.reader;
    const rs = R.update(nowMs() / 1000);    // same clock as event.timeStamp
    this._readTouch(rs, dt);
    this._rest();
    const a = nowMs();
    st.substeps = this.sb.step(dt);
    st.solverMs = lerp(st.solverMs, nowMs() - a, 0.1);
    if (this.sb.lastSlip) this._slip(this.sb.lastSlip);
    this._updateGeo();
    this._faceLag(dt);
    this._render(dt);
    const cost = nowMs() - t0;
    st.frameMs = lerp(st.frameMs, cost, 0.1);
    st.frames++;
    this._autoTier(cost);
  }

  _readTouch(rs, dt) {
    const T = this.touch, R = this.reader, sb = this.sb;
    const dScale = 1;
    let maxD = 0;
    for (const p of R.ptrs.values()) {
      const f = this._fingers.get(p.id);
      const b = this._local(p.x, p.y);
      const d = p.depth * dScale * (R.stretch ? 0.4 : 1);
      sb.press(p.id, b.x, b.y, d, 0.21);
      sb.move(p.id, b.x, b.y, R.stretch ? 1 : p.pull);
      maxD = Math.max(maxD, d);
      if (f) {
        // haptic beats as the squeeze deepens
        const band = p.depth > 0.66 ? 2 : p.depth > 0.33 ? 1 : 0;
        if (band > f.band) { this._haptic('soft'); if (band === 1 && !f.squeezed) { f.squeezed = true; this._touchEvent('squeeze'); } }
        f.band = Math.max(f.band, band);
      }
      // massage swirls the skin under the finger
      if (p.massage && Math.abs(p.massage.rate) > 0.5) sb.swirl(b.x, b.y, 0.22, p.massage.rate);
    }
    // pull stretch: how far the finger has dragged the body (body heights)
    let pullStretch = 1;
    if (!R.stretch) {
      for (const p of R.ptrs.values()) {
        const f = this._fingers.get(p.id);
        if (!f) continue;
        const d = Math.hypot(p.x - f.x0, p.y - f.y0) / (this._Pnow || 200);
        pullStretch = Math.max(pullStretch, 1 + d * p.pull);
      }
    }
    const k = Math.min(1, dt * 12);
    T.depth += (maxD - T.depth) * (maxD > T.depth ? 1 : k);
    T.stretch += ((R.stretch ? rs.stretch : pullStretch) - T.stretch) * k;
    T.speed = rs.speed;
    T.held = rs.held;
    T.turns = rs.turns;
    T.massageRate += ((rs.massaging ? rs.rate : 0) - T.massageRate) * k;
    const tw = R.stretch ? rs.twist : 0;
    T.twistRate += (((tw - this._lastTwist) / Math.max(dt, 1e-3)) - T.twistRate) * k;
    this._lastTwist = tw;
    T.jiggle = Math.max(0, T.jiggle - dt * 1.2);
    // soothing fades after 4 s without strokes or circles
    if (this.time - this._lastSoothe > 4) { T.calm = Math.max(0, T.calm - dt * 0.25); if (T.calm < 0.05) T.strokes = 0; }
    this.rig.setTouch(T);
    // the squeeze sound follows the depth
    const audio = this.opts.audio;
    if (audio?.hold && R.ptrs.size && T.depth > 0.12 && !rs.massaging) {
      if (!this._hold) this._hold = audio.hold('charge', { intensity: 0.2, pitch: 1 }) || null;
      this._hold?.update?.({ intensity: 0.15 + 0.75 * T.depth, pitch: 0.9 + 0.3 * (T.stretch - 1) + 0.15 * T.depth });
    } else if (this._hold && (!R.ptrs.size || rs.massaging)) { this._hold.stop(); this._hold = null; }
    if (this._hum) this._hum.update?.({ intensity: clamp(Math.abs(T.massageRate) / 10, 0.1, 0.7), pitch: 0.9 + clamp(Math.abs(T.massageRate) / 30, 0, 0.3) });
  }

  _slip(s) {
    this.opts.audio?.play?.(this.id, 'release', { intensity: 0.5 });
    this._haptic('soft');
    if (!this.persona.onSlip?.(this, s)) this.rig.react('gasp');
    this._touchEvent('slip');
  }

  // the rig's body expression becomes the soft body's rest shape
  _rest() {
    const rig = this.rig, v = rig.val, b = rig.body, T = this.touch;
    const rm = !!this.opts.reducedMotion;
    const breath = Math.sin(rig.breathPhase) * 0.014 * v.breath * (rm ? 0.5 : 1);
    // pressing presses it into the floor a little: shorter and wider
    const dm = this.sb.material.dMax / 0.34;
    const sq = T.depth * 0.1 * dm;
    this._squash += (sq - this._squash) * Math.min(1, (this._dt || 0.016) * 15);
    this.sb.setRest({
      squash: v.squashBias + this._squash, breath, droop: v.droop, shrink: v.shrink, lean: b.lean * 0.55,
      puffL: v.cheekPuff, puffR: v.cheekPuff, cheekV: this.cheekV,
    });
  }

  _faceLag(dt) {
    const L = this._lag, fv = this.sb.faceVelocity(this._pt);
    // a spring follower (k 90, ζ 0.5) on the face's velocity
    const k = 90, c = 2 * 0.5 * Math.sqrt(k);
    L.vx += (k * (fv.x - L.x) - c * L.vx) * dt; L.x += L.vx * dt;
    L.vy += (k * (fv.y - L.y) - c * L.vy) * dt; L.y += L.vy * dt;
    const uv = this.uvRect, gain = this.opts.reducedMotion ? 0 : 0.012;
    this._item.lag[0] = clamp(L.x * gain, -0.02, 0.02) * ((uv[2] - uv[0]) / this.aspect);
    this._item.lag[1] = clamp(L.y * gain, -0.02, 0.02) * (uv[3] - uv[1]);
  }

  _render(dt) {
    const st = this.stats, rig = this.rig, sb = this.sb, T = this.touch;
    let a = nowMs();
    const changed = rig.renderSkin();
    st.skinMs = lerp(st.skinMs, nowMs() - a, 0.1);
    // rim light rises with the squeeze, the stretch and a jiggle
    const rimGoal = clamp(0.5 * T.depth + 0.9 * Math.max(0, T.stretch - 1) + 0.3 * T.jiggle, 0, 0.75) * (this.opts.lowStim ? 0.5 : 1);
    this._rim += (rimGoal - this._rim) * Math.min(1, dt * (rimGoal > this._rim ? 10 : 3));
    if (this.tier === 'gl' && this.renderer && !this.renderer.lost) {
      a = nowMs();
      st.uploadPx = changed ? this.renderer.updateTexture('hero', rig.skin, rig.skinRect) : 0;
      st.uploadMs = lerp(st.uploadMs, nowMs() - a, 0.1);
      a = nowMs();
      sb.computeShading();
      const it = this._item;
      it.positions = sb.positions; it.shade = sb.shade; it.m = this.M; it.rim = this._rim;
      it.glitch = this._glitchUniforms();
      it.glitchThick = this._glitch.thick || 3;
      it.burst = this._burstUniforms();
      this.renderer.draw([it], this._blobsFor());
      this._draw2d(false);
      st.drawMs = lerp(st.drawMs, nowMs() - a, 0.1);
    } else {
      st.uploadMs = 0; st.uploadPx = 0;
      a = nowMs();
      this._draw2d(true);
      st.drawMs = lerp(st.drawMs, nowMs() - a, 0.1);
    }
  }

  _glitchUniforms() {
    if (this.id !== 'glitzi') return null;
    const g = this.rig.glitchLines(this._glitch);
    if (!g) return null;
    this._glitch.thick = g.thick;
    return this._glitch;
  }

  _burstUniforms() {
    const b = this.rig.body;
    if (this.id !== 'glitzi' || !(b.glitchBurst > 0) || !b.burstRows?.length) return null;
    const m = this.mallow, q = this.rig.q, skin = this.rig.skin;
    const [, by0, , by1] = m.bodyBox, bh = by1 - by0;
    const B = this._burst;
    B.fill(0);
    for (let i = 0; i < Math.min(6, b.burstRows.length); i++) {
      const [row, dir] = b.burstRows[i];
      B[3 * i] = ((by0 + row * bh) * q) / skin.height;
      B[3 * i + 1] = (dir * b.glitchBurst * 28 * q) / skin.width;
      B[3 * i + 2] = (0.035 * bh * q) / skin.height;
    }
    return B;
  }

  _shadowParams() {
    const E = this.sb.rowExtents(), j = this.sb.rows - 1;
    const P = this._Pnow, Href = P * HOP_SCALE;
    const M = this.M;
    const xl = E[3 * j + 1], xr = E[3 * j + 2];
    const bx = (xl + xr) / 2;
    const cx = M[0] * bx + M[2] * 1 + M[4];
    const liftF = (this._lift || 0) / Href;
    const sw = (xr - xl) * P * 0.46 * (1 - Math.min(0.5, liftF * 2.2));
    const sa = 0.3 * (1 - Math.min(0.7, liftF * 3));
    return { cx, cy: this._floorY, sw, sa };
  }

  _blobsFor() {
    const list = this._blobList;
    list.length = 0;
    const s = this._shadowParams();
    const sh = this._blobs[0];
    sh.x = s.cx; sh.y = s.cy; sh.rx = s.sw; sh.ry = s.sw * 0.22; sh.rgba[3] = s.sa;
    list.push(sh);
    const v = this.rig.val;
    if (v.glow > 0.02) {
      const au = this._blobs[1], g = this._geo;
      const r = g.w * 0.75;
      au.x = g.cx; au.y = g.mid; au.rx = r; au.ry = r;
      au.rgba[3] = 0.32 * clamp(v.glow, 0, 1.5);
      list.push(au);
    }
    return list;
  }

  _clear2d(all) {
    const c = this.ctx, dpr = this.view.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (all || !this._dirty) c.clearRect(0, 0, this.c2d.width, this.c2d.height);
    else { const d = this._dirty; c.clearRect(d[0] * dpr, d[1] * dpr, (d[2] - d[0]) * dpr, (d[3] - d[1]) * dpr); }
    this._dirty = null;
  }

  // 2D canvas: everything in tiers B/C, only particles over the GL mesh in tier A
  _draw2d(body) {
    const ctx = this.ctx, dpr = this.view.dpr, rig = this.rig, parts = rig.particles;
    const hasParticles = rig.opts.particles && (parts.list.length > 0 || parts.cloud > 0.02);
    if (!body && !hasParticles && !this._dirty) return;
    this._clear2d(false);
    const g = this._geo;
    const ext = [g.cx - g.w, g.top - g.h * 0.9, g.cx + g.w, g.bottom + g.h * 0.2];
    if (body) {
      const s = this._shadowParams();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSoftBlob(ctx, s.cx, s.cy, s.sw, s.sw * 0.22, 'rgba(10,6,30,1)', s.sa);
      const v = rig.val;
      if (v.glow > 0.02) drawSoftBlob(ctx, g.cx, g.mid, g.w * 0.75, g.w * 0.75, this.mallow.colours.glow, 0.32 * clamp(v.glow, 0, 1.5), 0.2);
      if (this.tier === 'strip') {
        const burst = this.id === 'glitzi' && rig.body.glitchBurst > 0 ? (vm) => burstShift(rig.body, vm) * (7 / this._Pnow) : null;
        drawStripWarp(ctx, rig.skin, this.sb, this.M, dpr, this.uvRect, 44, burst);
      } else {
        drawTriangleWarp(ctx, rig.skin, this.sb, this.coarse, this.M, dpr);
      }
      this._dentShading(ctx, dpr);
    }
    if (hasParticles) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts.draw(ctx);
      for (const p of parts.list) {
        if (p.x - 40 < ext[0]) ext[0] = p.x - 40; if (p.x + 40 > ext[2]) ext[2] = p.x + 40;
        if (p.y - 40 < ext[1]) ext[1] = p.y - 40; if (p.y + 40 > ext[3]) ext[3] = p.y + 40;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const v = this.view;
    this._dirty = [Math.max(0, ext[0] - 8), Math.max(0, ext[1] - 8), Math.min(v.w, ext[2] + 8), Math.min(v.h, ext[3] + 8)];
  }

  // 2D tiers: a soft dark dent with a lit rim where a finger presses
  _dentShading(ctx, dpr) {
    const R = this.reader;
    if (!R.ptrs.size) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    for (const p of R.ptrs.values()) {
      if (p.depth < 0.03) continue;
      const r = (this._Pnow || 200) * 0.22;
      const x = p.x - this.view.left, y = p.y - this.view.top;
      const gr = this._dentGrad || (this._dentGrad = (() => {
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gg.addColorStop(0, 'rgba(8,4,30,0.2)'); gg.addColorStop(0.5, 'rgba(8,4,30,0.08)');
        gg.addColorStop(0.78, 'rgba(255,250,240,0.12)'); gg.addColorStop(1, 'rgba(255,250,240,0)');
        return gg;
      })());
      ctx.save();
      ctx.translate(x, y); ctx.scale(r, r);
      ctx.globalAlpha = clamp(p.depth, 0, 1) * (this.sb.material.dMax / 0.34);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  _autoTier(cost) {
    if (this.quality !== 'auto' || this.tier !== 'tri') return;
    const F = this._frameCosts;
    if (F.length < 30) { F.push(cost); return; }
    if (F.length === 30) {
      const med = [...F].sort((x, y) => x - y)[15];
      F.push(med);
      if (med > 12) { this._applyTier('strip'); this._emit('tier', { tier: this.tier, reason: 'slow', medianMs: med }); }
    }
  }
}

function burstShift(b, v) {
  for (const [row, dir] of b.burstRows) if (Math.abs(v - row) < 0.035) return dir * b.glitchBurst * 4;
  return 0;
}

// a soft radial blob from a cached unit gradient (no per-frame gradients)
const blobCache = new Map();
function drawSoftBlob(ctx, x, y, rx, ry, colour, alpha, inner = 0) {
  if (!(alpha > 0.003) || !(rx > 0) || !(ry > 0)) return;
  const key = colour + '|' + inner;
  let c = blobCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 64 * inner, 64, 64, 64);
    gr.addColorStop(0, colour); gr.addColorStop(1, 'rgba(0,0,0,0)');
    // a colour-at-full then fade gradient; alpha is applied when drawing
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    blobCache.set(key, c);
  }
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.drawImage(c, x - rx, y - ry, rx * 2, ry * 2);
  ctx.restore();
}

export { SoftBody, TouchReader };
