// MallowTouch — a living, squeezable Mallow.
//
//   const mt = new MallowTouch(container, { id: 'glitzi', quality: 'auto', audio, haptic });
//   await mt.loaded;
//   mt.place({ x: 195, y: 430, scale: 1 });        // body centre, container CSS px
//   mt.on('touch', (e) => …);                     // {kind, depth, stretch, speed, turns, dir}
//   await mt.setMallow('zuzu');                   // switch character, same WebGL context
//   mt.place({ x, y, size: 240 });                // …or size the body: its height in CSS px
//   mt.addLayer({ gl(items, renderer), draw2d(ctx, info), busy() });  // e.g. Thought Mallows
//
// Layers inside `container` (which it fills; it may be the full viewport):
//   a WebGL canvas (tier A: the textured soft-body mesh, contact shadow and
//   aura) under a 2D canvas (particles; in tiers B and C everything). Both are
//   transparent outside the Mallow. One WebGL context per MallowTouch, kept
//   across setMallow() and released (loseContext) on destroy().
//
// Each frame (one shared requestAnimationFrame via rig.addTicker):
//   1. TouchReader turns fingers into press depth / pull / stretch / flick /
//      jiggle / massage / stroke / tap. A finger that slides off at once or
//      circles is a glide: it soothes (strokes, massage) and never pulls,
//      slips or startles.
//   2. Those drive SoftBody constraints (grabs, glides, dents, plungers, a
//      stretch waist, swirls, release velocities) and the headless MallowRig's
//      face (setTouch).
//   3. The rig's expression (squash, droop, cheek puff, shrink, lean) becomes
//      SoftBody's rest shape; breath, hop, tilt, spin and float are a rigid
//      stage transform (a JS transform, never CSS scale, so hit-testing and
//      raster resolution stay exact). With breath out of the solver an idle
//      Mallow's solver sleeps and it draws every other frame.
//   4. The rig re-renders only the face parts that changed (30 Hz while a
//      finger is down); tier A uploads just those rects with texSubImage2D and
//      draws the mesh with lighting from the deformation.
// At rest the mesh is the rest shape and the rig cross-fades in the untouched
// approved artwork, so an idle Mallow is exactly the approved picture.
//
// Input. bindPointer:true (default): MallowTouch owns its container — its
// full-size root takes every touch inside it (touches off the Mallow are
// ignored, not passed through to elements underneath). For a shared screen use
// bindPointer:false and route: mt.pointer({type, id, x, y, t}) with client CSS
// px and t in ms (event.timeStamp / performance.now()); it returns true when
// the event is the Mallow's. mt.hitTest(x, y) tells a router whether a touch
// lands on it. Keyboard (the root is focusable): hold Space to squeeze, Enter
// to tap, arrow keys to pull.

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
const STRETCH_GIVE = 0.7;      // share of a two-finger spread the body follows
const WAIST_GAIN = 0.75;       // waist pull per unit of stretch past 1
const REBOUND = 2.4;           // upward velocity (body heights/s) a full squeeze releases
const SLIP_DELAY = 0.09;       // s: a slip reaction waits this long (a flick or lift cancels it)

const hexRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const spinCurve = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
// an input event's time on the performance.now() clock
function eventMs(e, base) {
  const now = nowMs(), ts = e?.timeStamp;
  if (Number.isFinite(ts) && ts > 0 && ts <= now + 50 && now - ts < 1000) return ts;
  if (base && Number.isFinite(base.timeStamp) && Number.isFinite(ts)) return now - Math.max(0, base.timeStamp - ts);
  return now;
}

export class MallowTouch {
  /**
   * @param {HTMLElement} container
   * @param {object} opts
   * @param {string} opts.id  Mallow id
   * @param {'auto'|'gl'|'tri'|'strip'} [opts.quality='auto']
   * @param {boolean} [opts.reducedMotion]  @param {boolean} [opts.lowStim]
   * @param {object} [opts.audio]  the audio engine (play / hold / fx), or null
   * @param {(kind:string)=>void} [opts.haptic]  e.g. haptics.js haptic; null = none
   * @param {boolean} [opts.bindPointer=true]  listen to pointers itself (and own the
   *   container's touches); false = route them in with pointer()
   */
  constructor(container, opts = {}) {
    this._setup(container, opts);
    const root = this.root = document.createElement('div');
    root.className = 'mallow-touch';
    // the outline is replaced by a ring drawn around the body (see _focusRing)
    root.style.cssText = 'position:absolute;inset:0;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;' +
      '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.style.pointerEvents = this.opts.bindPointer ? 'auto' : 'none';
    root.setAttribute('role', 'button');
    root.tabIndex = 0;
    container.appendChild(root);
    this.c2d = this._canvas(2);
    this.ctx = this.c2d.getContext('2d');
    this._makeRing();
    this.rig = this._makeRig(this.id);
    this._tick = this._tick.bind(this);
    this._onResize = () => this._resize();
    this.loaded = this.rig.loaded.then(() => { if (!this.destroyed) this._init(); return this; });
  }

  // everything that is not DOM (also used by the DOM-free core in tests)
  _setup(container, opts) {
    const id = MALLOWS[opts.id] ? opts.id : 'boppo';
    // reduced motion follows the OS setting live unless the caller decides it
    this._rmFollowsOS = opts.reducedMotion == null;
    // skinSize 'auto': the skin's resolution follows the body's size on screen
    this._autoSkin = !(opts.skinSize > 0);
    this.opts = { quality: 'auto', lowStim: false, audio: null, haptic: null, bindPointer: true,
      ...opts, reducedMotion: opts.reducedMotion ?? prefersReducedMotion(), skinSize: opts.skinSize > 0 ? opts.skinSize : 640, id };
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
    this.stats = { tier: '', fps: 0, frameMs: 0, solverMs: 0, skinMs: 0, uploadMs: 0, drawMs: 0, uploadPx: 0, substeps: 0, frames: 0, skipped: 0, idle: false,
      last: { frame: 0, physics: 0, solver: 0, skin: 0, upload: 0, draw: 0, uploadPx: 0, drawn: false } };

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
    this._fingers = new Map();       // id → {band, x0, y0, surface, slipped, …}
    this._lastSoothe = -1;
    this._lag = { x: 0, y: 0, vx: 0, vy: 0 };
    this._rim = 0;
    this._squash = 0;
    this._lastTwist = 0;
    this._hold = null;
    this._hum = null;
    this._lastGasp = -9;
    this._slipQ = null;
    this._muteRigHaptic = false;
    this._inRelease = false;
    this._dirty = null;
    this._frameCosts = [];
    this._lastSkinFrame = -9;
    this._layers = new Set();
    this._items = [];
    this._layerInfo = { tier: '', dpr: 1, dt: 0, view: this.view, time: 0 };
    this._glitch = new Float32Array(36);
    this._burst = new Float32Array(18);
    this._item = { key: 'hero', positions: null, shade: null, m: this.M, lag: [0, 0], rim: 0, rimCol: [1, 1, 1], light: 1, spec: 1, glitch: null, glitchThick: 3, burst: null, src: [1, 1] };
    this._blobs = [
      { x: 0, y: 0, rx: 1, ry: 1, rgba: [10 / 255, 6 / 255, 30 / 255, 0.3], inner: 0 },
      { x: 0, y: 0, rx: 1, ry: 1, rgba: [1, 1, 1, 0], inner: 0.2 },
    ];
    this._blobList = [];
    this._setColours();
  }

  _setColours() {
    this._rimCol = hexRgb(this.mallow.colours.glow);
    this._item.rimCol = this._rimCol;
    this._item.spec = this.persona.specular ?? 1;
    const a = this._blobs[1].rgba;
    a[0] = this._rimCol[0]; a[1] = this._rimCol[1]; a[2] = this._rimCol[2];
  }

  _makeRig(id) {
    const rm = !!this.opts.reducedMotion;
    if (this._autoSkin) this.opts.skinSize = this._wantSkin(id) || this.opts.skinSize;
    const rig = new MallowRig(this.root, {
      id, headless: true, interactive: false, skinSize: this.opts.skinSize, reducedMotion: rm,
      audio: this.opts.audio, haptic: (k) => this._rigHaptic(k), particles: !this.opts.lowStim, lowStim: !!this.opts.lowStim,
      onImpulse: (imp, kind) => { if (this.rig === rig) this._impulse(imp, kind); },
      touchFace: (goal, T, r) => this.persona.face?.(goal, T, r),
    });
    rig.geoOverride = () => this._geo;
    rig.faceOverride = (sx, sy) => this._facePoint(sx, sy);
    rig.on('emotion', () => { if (this.rig === rig) this._label(); });
    return rig;
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
    this._initBody();
    this._initReader();
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
    if (this._pctPlace) { this.ready = true; this.place(...this._pctPlace); this.ready = false; this._pctPlace = null; }
    if (this._sizePlace != null) { this.goalSt.s = clamp(this._sizePlace / this._baseP(), 0.2, 3); this._sizePlace = null; }
    this.st.x = this.goalSt.x ?? this.view.w / 2;
    this.st.y = this.goalSt.y ?? this.view.h * 0.52;
    this.st.s = this.goalSt.s;
    this._checkSkin(true);
    if (this._rmFollowsOS && typeof matchMedia === 'function') {
      try {
        this._mq = matchMedia('(prefers-reduced-motion: reduce)');
        this._mqFn = (e) => this.setReducedMotion(e.matches);
        this._mq.addEventListener ? this._mq.addEventListener('change', this._mqFn) : this._mq.addListener?.(this._mqFn);
      } catch { /* ignore */ }
    }
    this._settle();
    this._label();
    this.ready = true;
    addTicker(this._tick);
    this._emit('ready', this);
  }

  // the soft body for the current Mallow (its box, mask, face region)
  _initBody() {
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
  }

  _initReader() {
    this.reader = new TouchReader({
      hit: (x, y) => this.hitTest(x, y),
      bodySize: () => this._P() * this.aspect,
      centre: () => { const r = this.bodyRect(); return { x: r.cx, y: r.cy }; },
      // the arrow keys pull to 80 % of where this material would slip
      keyReach: () => 0.8 * this.sb.material.maxStretch * this._P(),
    });
    this._bindReader();
  }

  // snap the body, stage and geometry to where they belong now
  _settle() {
    this._computeTransform(0);
    this._rest();
    this.sb.reset();
    this._updateGeo();
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
        this._addGLBody();
        if (this.view.w > 1) r.resize(this.view.w, this.view.h, this.view.dpr);
      }
    }
    if (tier === 'gl' && (!this.renderer || this._lostGL)) tier = 'tri';
    this._applyTier(tier);
  }

  _addGLBody() {
    const r = this.renderer;
    if (!r) return;
    r.removeBody('hero');
    r.addBody('hero', { source: this.rig.skin, indices: this.sb.indices, uvs: this.sb.uvs, faceW: this.sb.faceW, n: this.sb.n,
      base: this.id === 'glitzi' ? this._atSkin(this.rig.assets?.body) : null, orig: this._atSkin(this.rig.assets?.original) });
  }

  // an asset drawn at skin size, uploaded once per Mallow: the untouched
  // approved art (the shader cross-fades it in at rest) and, for Glitzi, its
  // face-cleaned body (so the shader keeps glitch lines under the face)
  _atSkin(img) {
    const rig = this.rig;
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = rig.skin.width; c.height = rig.skin.height;
    const g = c.getContext('2d');
    g.setTransform(rig.q, 0, 0, rig.q, 0, 0);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, rig.mallow.size[0], rig.mallow.size[1]);   // at the logical size (high-res art: res px per unit)
    return c;
  }

  // the skin's resolution for this layout: ≈ 1.1 × the body's height in
  // device px (crisp, never minified past ~1.3×, cheap on small layouts)
  _wantSkin(id = this.id) {
    const m = MALLOWS[id];
    let w = this.view.w, h = this.view.h, dpr = this.view.dpr;
    if (!(w > 1)) {
      const r = this.container?.getBoundingClientRect?.();
      if (!r || !(r.width > 1)) return 0;
      w = r.width; h = r.height; dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
    }
    const [bx0, by0, bx1, by1] = m.bodyBox, aspect = (bx1 - bx0 + 2 * PAD) / (by1 - by0);
    const P = clamp(Math.min((0.6 * w) / aspect, 0.34 * h), 110, 330) * (this.goalSt?.s || 1);
    return clamp(Math.round((1.1 * P * dpr * Math.max(...m.size)) / (by1 - by0) / 32) * 32, 320, 768);
  }

  // re-skin when the layout asks for a skin ≥ 20 % off (now, or once no finger is down)
  _checkSkin(now = false) {
    if (!this._autoSkin || typeof this.rig?.setSkinSize !== 'function' || !this.rig.assets?.original) return;
    const want = this._wantSkin(), have = this.rig.opts.skinSize;
    if (!want || Math.abs(want / have - 1) < 0.2) { this._reskinTo = 0; return; }
    if (now || !this.reader?.ptrs.size) this._reskin(want); else this._reskinTo = want;
  }

  _reskin(px) {
    this._reskinTo = 0;
    const rig = this.rig;
    rig.setSkinSize(px);
    this.opts.skinSize = px;
    const m = this.mallow, [x0, y0, x1, y1] = this.box, q = rig.q, skin = rig.skin;
    this.uvRect = [(x0 * q) / skin.width, (y0 * q) / skin.height, (x1 * q) / skin.width, (y1 * q) / skin.height];
    this.sb.setUvRect(this.uvRect);
    void m;
    this._addGLBody();
    if (this.tier === 'gl' && this.renderer) this.renderer.updateTexture('hero', rig.skin, null);
    this._dirty = null;
  }

  _applyTier(tier) {
    this.tier = tier;
    this.stats.tier = TIERS[tier];
    this._frameCosts.length = 0;
    // Glitzi's glitch lines and the approved art's rest cross-fade move to the
    // shader in tier A; the 2D tiers keep them in the skin
    this.rig.opts.shaderGlitch = tier === 'gl';
    this.rig.opts.shaderRest = tier === 'gl';
    this.rig.skinDirty = true;
    if (this.glCanvas) this.glCanvas.style.display = tier === 'gl' ? 'block' : 'none';
    if (tier === 'gl' && this.renderer) this.renderer.updateTexture('hero', this.rig.skin, null);
    this._clear2d(true);
  }

  /** Force a tier: 'auto' | 'gl' | 'tri' | 'strip'. */
  setQuality(q) { if (this.ready) this._setTier(q); else this.opts.quality = q; }

  /** Switch to another Mallow in place: same canvases, same WebGL context,
   *  same placement and listeners; the feeling carries over. Resolves when
   *  the new Mallow is showing. */
  setMallow(id) {
    if (!MALLOWS[id] || this.destroyed) return Promise.resolve(this);
    if (id === this.id && !this._swapping) return Promise.resolve(this);
    const token = (this._swap = (this._swap || 0) + 1);
    this._swapping = true;
    const rig = this._makeRig(id);
    const p = rig.loaded.then(() => {
      if (this.destroyed || token !== this._swap) { rig.destroy(); return this; }
      this._swapping = false;
      if (this.ready) this._swapIn(id, rig);
      else { this.rig.destroy(); this.rig = rig; this.id = id; this.mallow = MALLOWS[id]; this.persona = personaFor(id); this.opts.id = id; this._setColours(); }
      return this;
    });
    this.loaded = this.loaded.then(() => p);
    return p;
  }

  _swapIn(id, rig) {
    const old = this.rig;
    // let go of whatever the old Mallow was doing
    this.reader?.cancelAll();
    this._hold?.stop(); this._hold = null; this._hum?.stop(); this._hum = null;
    this._slipQ = null;
    if (old.mix) rig.setEmotion(old.mix, old.intensity, { instant: true, quiet: true });
    old.destroy();
    this.id = id; this.mallow = MALLOWS[id]; this.persona = personaFor(id); this.opts.id = id;
    this.rig = rig;
    rig.visible = this.visible;
    this._setColours();
    this._initBody();
    const T = this.touch;
    T.depth = 0; T.stretch = 1; T.speed = 0; T.turns = 0; T.strokes = 0; T.calm = 0; T.jiggle = 0; T.held = 0; T.massageRate = 0; T.twistRate = 0;
    this._fingers.clear();
    this._squash = 0; this._rim = 0; this._lastTwist = 0; this._wasStretch = false;
    this._lag.x = this._lag.y = this._lag.vx = this._lag.vy = 0;
    this._addGLBody();
    this._applyTier(this.tier === 'gl' && this.renderer && !this._lostGL ? 'gl' : this.tier);
    this._settle();
    this._label();
    this._emit('mallow', { id });
  }

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
    if (this.ready) this._checkSkin();
  }

  _label() {
    if (!this.root) return;
    const d = this.rig.describe();
    this.root.setAttribute('aria-label', `${d}. Press and hold to squeeze, press then drag (or drag an edge outwards) to pull, two fingers to stretch, ` +
      'stroke or circle to soothe, or tap. With a keyboard, hold Space to squeeze, press Enter to tap, or use the arrow keys to pull.');
  }

  // a visible keyboard-focus ring around the body (the root itself is the
  // whole container, so its own outline would be meaningless)
  _makeRing() {
    const ring = this._ring = document.createElement('div');
    ring.className = 'mallow-touch-focus';
    ring.setAttribute('aria-hidden', 'true');
    ring.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:3;border-radius:42%;opacity:0;' +
      'box-shadow:0 0 0 2px rgba(255,255,255,0.96),0 0 0 4.5px rgba(16,10,48,0.88),0 0 22px 6px rgba(255,255,255,0.22);' +
      (this.opts.reducedMotion ? '' : 'transition:opacity .18s ease;');
    this.root.appendChild(ring);
    const set = (vis) => {
      this._focusVisible = vis;
      ring.style.opacity = vis ? '1' : '0';
      if (vis) { this._ringKey = ''; this._focusRing(); }
    };
    // keyboard focus shows the ring; focus that follows a finger or a click does not
    const focus = () => {
      if (nowMs() - (this._pointerT || -1e9) < 400) { set(false); return; }
      let vis = true;
      try { vis = this.root.matches(':focus-visible'); } catch { /* old engines: show it */ }
      set(vis);
    };
    const blur = () => set(false);
    // only the keys the Mallow answers to (Tab focus is :focus-visible above); a
    // modifier held for a trackpad pinch or a shortcut is not keyboard use
    const KEYS = ['Enter', ' ', 'Spacebar', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const key = (e) => { if (!this._focusVisible && KEYS.includes(e.key) && !e.ctrlKey && !e.metaKey && document.activeElement === this.root) set(true); };
    const press = () => { this._pointerT = nowMs(); if (this._focusVisible) set(false); };
    const R = this.root;
    R.addEventListener('focus', focus);
    R.addEventListener('blur', blur);
    R.addEventListener('keydown', key);
    R.addEventListener('pointerdown', press, true);
    this._unbindRing = () => { R.removeEventListener('focus', focus); R.removeEventListener('blur', blur); R.removeEventListener('keydown', key); R.removeEventListener('pointerdown', press, true); };
  }

  _focusRing() {
    if (!this._focusVisible || !this.sb) return;
    const b = this.sb.bounds(), M = this.M;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let c = 0; c < 4; c++) {
      const bx = c & 1 ? b.x1 : b.x0, by = c & 2 ? b.y1 : b.y0;
      const X = M[0] * bx + M[2] * by + M[4], Y = M[1] * bx + M[3] * by + M[5];
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
    const pad = 12;
    const key = `${Math.round(x0)},${Math.round(y0)},${Math.round(x1)},${Math.round(y1)}`;
    if (key === this._ringKey) return;
    this._ringKey = key;
    const s = this._ring.style;
    s.width = `${Math.round(x1 - x0 + 2 * pad)}px`; s.height = `${Math.round(y1 - y0 + 2 * pad)}px`;
    s.transform = `translate(${Math.round(x0 - pad)}px,${Math.round(y0 - pad)}px)`;
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
  setLowStim(b) { this.opts.lowStim = !!b; this.rig.opts.particles = !b; this.rig.opts.lowStim = !!b; if (b) { this.rig.particles.list.length = 0; this.rig.particles.cloud = 0; } }

  /** Body centre at (x, y) in container CSS px (or % of the container with
   *  unit:'%'); scale × the default size (≈ 0.6 of the width, ≤ 0.34 of the
   *  height) — or size: the body's height in CSS px (overrides scale). */
  place({ x, y, scale, size, unit } = {}, { instant = false } = {}) {
    if (unit === '%') {
      if (!this.ready) { this._pctPlace = [{ x, y, scale, size, unit }, { instant }]; return this; }
      x = Number.isFinite(x) ? (x / 100) * this.view.w : x; y = Number.isFinite(y) ? (y / 100) * this.view.h : y;
    }
    if (Number.isFinite(size) && size > 0) {
      if (this.view.w > 1) scale = size / this._baseP(); else { this._sizePlace = size; scale = undefined; }
    }
    if (Number.isFinite(x)) this.goalSt.x = x;
    if (Number.isFinite(y)) this.goalSt.y = y;
    if (Number.isFinite(scale)) { this.goalSt.s = clamp(scale, 0.2, 3); if (this.ready) this._checkSkin(); }
    if (instant || !this.ready) {
      if (this.goalSt.x != null) this.st.x = this.goalSt.x;
      if (this.goalSt.y != null) this.st.y = this.goalSt.y;
      this.st.s = this.goalSt.s; this.st.vx = this.st.vy = this.st.vs = 0;
    }
    return this;
  }

  /** The body's height (CSS px) at scale 1 for the current layout; place({size}) uses it. */
  get baseSize() { return this._baseP(); }

  /** Draw more on this Mallow's canvases in the same frame (one WebGL context):
   *  layer = { gl(items, renderer, info) — push mesh items (bodies added with
   *  renderer.addBody) to draw after the hero in tier A; draw2d(ctx, info) —
   *  2D drawing (tiers B/C, and tier A when the layer has no gl);
   *  busy() — true while it animates (keeps an idle Mallow drawing every frame) }.
   *  info: {tier 'A'|'B'|'C', dpr, dt, view, time}. Returns the layer. */
  addLayer(layer) { if (layer) { this._layers.add(layer); this._dirty = null; } return layer; }
  removeLayer(layer) { this._layers.delete(layer); this._clear2d(true); }
  /** Shorthand: fn(items, renderer, info) adds tier A mesh items each frame. */
  addDrawItems(fn) { return this.addLayer({ gl: fn }); }
  /** The tier A mesh renderer (null in the 2D tiers or when WebGL is unavailable). */
  get meshRenderer() { return this.tier === 'gl' && this.renderer && !this.renderer.lost ? this.renderer : null; }

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
    for (let c = 0; c < 4; c++) {
      const bx = c & 1 ? b.x1 : b.x0, by = c & 2 ? b.y1 : b.y0;
      const X = M[0] * bx + M[2] * by + M[4], Y = M[1] * bx + M[3] * by + M[5];
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
    x0 += r.left; x1 += r.left; y0 += r.top; y1 += r.top;
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0, right: x1, bottom: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  /** Alias of bodyRect() (the Hushflow worlds' mallow interface). */
  rect() { return this.bodyRect(); }

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
    if (e.type === 'down') { this._pointerT = nowMs(); if (this._focusVisible) { this._focusVisible = false; this._ring.style.opacity = '0'; } }
    const ms = Number.isFinite(e.t) ? e.t : nowMs();
    this._noteLag(ms);
    const t = ms / 1000;
    if (e.type === 'move' && !this.reader.ptrs.has(e.id)) { this._gaze(e.x, e.y); return false; }
    return this.reader.pointer({ type: e.type, id: e.id, x: e.x, y: e.y, t, shift: !!e.shift, mouse: !!e.mouse });
  }

  /** Is a finger (or mouse / key) on the Mallow right now? */
  get pressed() { return !!this.reader && this.reader.ptrs.size > 0; }

  get state() {
    const T = this.touch;
    return { tier: this.stats.tier, depth: T.depth, stretch: T.stretch, speed: T.speed, turns: T.turns, strokes: T.strokes, calm: T.calm,
      held: T.held, pressed: this.pressed, energy: this.sb ? this.sb.energy : 0, pointers: this.reader ? this.reader.ptrs.size : 0, ready: this.ready };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this._swap = (this._swap || 0) + 1;
    removeTicker(this._tick);
    this._hold?.stop(); this._hum?.stop();
    this._unbind?.(); this._unbindKeys?.(); this._unbindRing?.();
    if (this._mq && this._mqFn) { try { this._mq.removeEventListener ? this._mq.removeEventListener('change', this._mqFn) : this._mq.removeListener?.(this._mqFn); } catch { /* ignore */ } }
    this._layers.clear();
    this.ro?.disconnect(); this.io?.disconnect();
    removeEventListener('resize', this._onResize);
    // gives the WebGL context back now (iOS keeps very few), not at GC
    this.renderer?.destroy();
    this.renderer = null;
    this.rig.destroy();
    this.c2d.width = this.c2d.height = 0;
    this.root.remove();
  }

  // ----------------------------------------------------------- geometry --
  _baseP() {
    const v = this.view;
    return clamp(Math.min((0.6 * v.w) / (this.aspect || 1), 0.34 * v.h), 110, 330);
  }

  _P() { return this._baseP() * this.st.s; }

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
    // breathing: taller and a touch narrower about the bottom centre (in the
    // transform, not the solver, so an idle body's solver can sleep)
    const br = Math.sin(rig.breathPhase || 0) * 0.014 * (v.breath || 0) * (rm ? 0.5 : 1);
    const bsx = 1 - 0.6 * br, bsy = 1 + br;
    const sx4 = (aw / 2) * (1 - bsx), sy5 = 1 - bsy;
    const ox = st.x, oy = st.y + P / 2;
    const m0 = co * P, m1 = si * P, m2 = -si * P, m3 = co * P;
    const m4 = ox + trem - co * P * aw / 2 + si * 0.5 * P;
    const m5 = oy - lift - 0.5 * P - si * P * aw / 2 - co * 0.5 * P;
    const M = this.M;
    M[0] = m0 * bsx; M[1] = m1 * bsx; M[2] = m2 * bsy; M[3] = m3 * bsy;
    M[4] = m4 + m0 * sx4 + m2 * sy5; M[5] = m5 + m1 * sx4 + m3 * sy5;
    const det = M[0] * M[3] - M[1] * M[2] || 1e-9, I = this.Minv;
    I[0] = M[3] / det; I[1] = -M[1] / det; I[2] = -M[2] / det; I[3] = M[0] / det;
    this._lift = lift; this._floorY = oy; this._Pnow = P; this._trem = trem;
  }

  // particles spawn from the deformed body (CSS px, canvas space)
  _updateGeo() {
    const b = this.sb.bounds(), M = this.M, g = this._geo;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    g.cx = M[0] * cx + M[2] * cy + M[4];
    g.top = M[1] * cx + M[3] * b.y0 + M[5]; g.bottom = M[1] * cx + M[3] * b.y1 + M[5];
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
    // one clock for everything (performance.now()): the event's own timeStamp
    // when it is on that clock (every current engine) — so a janky main thread
    // doesn't distort speeds and gesture decisions — else handling time, with
    // coalesced samples keeping their relative spacing
    const conv = (e, type, base) => {
      const ms = eventMs(e, base);
      this._noteLag(ms);
      return { type, id: e.pointerId, x: e.clientX, y: e.clientY, t: ms / 1000, shift: e.shiftKey, mouse: e.pointerType === 'mouse' };
    };
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
      if (this.reader.wheel({ x: e.clientX, y: e.clientY, deltaY: e.deltaY, t: eventMs(e) / 1000 })) e.preventDefault();
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
      if (this.reader.key({ type, key: e.key, t: eventMs(e) / 1000, repeat: e.repeat })) e.preventDefault();
    };
    const kd = k('down'), ku = k('up');
    el.addEventListener('keydown', kd); el.addEventListener('keyup', ku);
    this._unbindKeys = () => { el.removeEventListener('keydown', kd); el.removeEventListener('keyup', ku); };
  }

  // how late input arrives (handling time − the event's own time): the gesture
  // clock runs that far behind, so a slow main thread never makes a moving
  // finger look as if it had paused (and gripped again)
  _noteLag(ms) { const lag = nowMs() - ms; this._inLag = lag > 0 ? Math.min(1000, lag) : 0; }

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
      this._fingers.set(e.id, { band: 0, x0: e.x, y0: e.y, surface: false, slipped: false, pulled: false, squeezed: false });
      if (R.ptrs.size === 1) this.opts.audio?.play?.(this.id, 'press');
      this._haptic('light');
      this._gaze(e.x, e.y);
      this._touchEvent('press');
    });
    // a stroking or circling finger slides over the skin instead of holding it
    R.on('glide', (e) => {
      const f = this._fingers.get(e.id);
      this.sb.surface(e.id);
      if (f) f.surface = true;
    });
    // …and grips again where it comes to rest (or starts to jiggle / stretch)
    R.on('regrip', (e) => {
      const f = this._fingers.get(e.id), p = R.ptrs.get(e.id);
      const b = this._local(e.x, e.y);
      this.sb.release(e.id, { quiet: true });
      this.sb.grab(e.id, b.x, b.y, 0.3);
      this.sb.press(e.id, b.x, b.y, p ? p.depth : 0, 0.21);
      if (f) { f.surface = false; f.slipped = false; f.pulled = false; f.x0 = e.x; f.y0 = e.y; }
    });
    R.on('move', (e) => {
      const p = R.ptrs.get(e.id);
      const b = this._local(e.x, e.y);
      if (!R.stretch) this.sb.move(e.id, b.x, b.y, p ? p.pull : 0);
      // past the slip limit: decide now (slide on or a real slip), not at the
      // next solved frame — a whole stroke can arrive between two slow frames
      if (p && p.mode === 'pull' && !R.stretch && this.sb.slipAt(e.id, b.x, b.y)) this._noteSlip({ id: e.id });
      this._gaze(e.x, e.y);
      const f = this._fingers.get(e.id);
      if (f && !f.pulled && p && p.mode === 'pull' && p.pull > 0.5) { f.pulled = true; this._touchEvent('pull'); }
      // a fast yank startles a little (never a stroke or a massage)
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > 1700 && p && p.mode === 'pull' && p.pull > 0.6 && !R.stretch && this.time - this._lastGasp > 1.6 && e.t - p.t0 > 0.4) { this._lastGasp = this.time; this.rig.react('gasp'); }
    });
    R.on('up', (e) => this._release(e));
    R.on('stretchStart', (s) => {
      this._wasStretch = true;
      // each finger holds its own side; the middle is free to narrow
      const grip = clamp((0.45 * s.d0) / (this._Pnow || 200), 0.14, 0.38);
      for (const id of [s.a, s.b]) this.sb.setGrip(id, grip);
      this._touchEvent('stretch');
    });
    R.on('stretchEnd', () => { this.sb.setWaist(null); this._touchEvent('stretchEnd'); });
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
      this.sb.impulse(e.dx * s * 0.6, e.dy * s * 0.6, { x: b.x, y: b.y, r: 0.28 });
      this.opts.audio?.fx?.('swish', { intensity: 0.25 });
      this._haptic('tick');
      this.persona.onStroke?.(this, { ...e, strokes: T.strokes });
      this._touchEvent('stroke', { dir: e.dir });
    });
  }

  _release(e) {
    const id = e.id;
    const f = this._fingers.get(id);
    // the lift says what happened; a slip still waiting to react is dropped
    if (this._slipQ && this._slipQ.id === id) this._slipQ = null;
    // release velocity, CSS px/s → body units/s (undo the stage rotation + scale)
    const I = this.Minv;
    let vx = I[0] * e.vx + I[2] * e.vy, vy = I[1] * e.vx + I[3] * e.vy;
    const flick = e.kind === 'flick';
    const fs = this.persona.flickScale ?? 1;
    if (flick) { vx *= fs; vy *= fs; }
    if (!flick) { vx *= 0.45; vy *= 0.45; }
    this.sb.release(id, { vx, vy, flick });
    // how much of this touch was a squeeze: a pull or a two-finger stretch
    // grips instead, a stroke or massage (a glide) soothes, a slip let go already
    const stretched = this._wasStretch;
    const soothing = e.mode === 'glide';
    const depth = stretched || soothing || f?.slipped ? 0 : e.depth * (1 - 0.7 * (e.pull || 0));
    if (this.reader.ptrs.size === 0) {
      this._hold?.stop(); this._hold = null; this._wasStretch = false; this.sb.setWaist(null);
      // the squeeze is over at once: the rest shape must not re-squash while
      // the depth would fade (it would fight the rebound); the face springs
      // still ease out of the squeeze face
      this.touch.depth = 0; this._squash = 0;
    }
    if (e.cancelled) { this._fingers.delete(id); this._touchEvent('release'); return; }
    if (flick) {
      // a stroke brushed off briskly still wobbles but stays a kind touch;
      // a decisive flick (> 1125 px/s) is a flick whatever came before
      if (!(soothing && e.stroked && !e.snap) && !this.persona.onFlick?.(this, e)) this.rig.react('flick', { dirX: Math.sign(e.vx) || 1 });
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
      // the reactions' own squash kicks are replaced by the rebound below
      this._muteRigHaptic = true; this._inRelease = true;
      try {
        if (!this.persona.onRelease?.(this, { ...e, depth })) this.rig.react('release', { intensity: depth });
      } finally { this._muteRigHaptic = false; this._inRelease = false; }
      if (depth > 0.5) this._haptic('pop');
    } else if (!soothing && (!stretched || this.reader.ptrs.size === 0)) {
      // a stroke or massage ends softly: no pop, no sound
      this.opts.audio?.play?.(this.id, 'release', { intensity: clamp(0.15 + depth, 0.15, 0.4) });
    }
    this._fingers.delete(id);
    // the stored squeeze springs back: the press leaves the rest shape at once
    // and the body pops up past its rest height before it settles
    if (this.reader.ptrs.size === 0 && depth > 0.1) {
      // about the same pop height for every Mallow (softer ones ring slower)
      const M = this.sb.material, k = Math.sqrt((M.kG + M.kL) / 0.83) * (this.persona.pop ?? 1);
      if (!this.opts.reducedMotion) this.sb.deform('squash', -REBOUND * depth * k);
    }
    this._touchEvent('release', { depth });
  }

  _touchEvent(kind, extra) {
    const T = this.touch;
    this._emit('touch', { kind, depth: T.depth, stretch: T.stretch, speed: T.speed, turns: T.turns, dir: extra?.dir ?? 0,
      held: T.held, pressed: this.reader.ptrs.size > 0, calm: T.calm, ...extra });
  }

  _haptic(kind) { try { this.opts.haptic?.(kind); } catch { /* ignore */ } }
  _rigHaptic(kind) { if (!this._muteRigHaptic) this._haptic(kind); }

  // rig reactions arrive as soft-body velocity fields
  _impulse(imp, kind) {
    if (!this.sb) return;
    const rm = this.opts.reducedMotion;
    // inside a release the rebound replaces every reaction's own squash
    // (Glitzi's glitch burst squashes +2.25, which would cancel its pop)
    if (imp.squash && !this._inRelease) this.sb.deform('squash', imp.squash * 1.5);
    const sh = (imp.lean || 0) * 0.55 + (imp.shear || 0) * 0.18;
    if (sh) this.sb.deform('shear', sh * (rm ? 0.5 : 2.2));
    void kind;
  }

  // -------------------------------------------------------------- frame --
  _tick(dt) {
    if (!this.ready || this.destroyed) return;
    if (!this.visible || (typeof document !== 'undefined' && document.hidden)) return;
    if (this._reskinTo && !this.reader.ptrs.size) this._reskin(this._reskinTo);
    const t0 = nowMs();
    const st = this.stats, last = st.last;
    st.fps = st.fps ? st.fps + (1 / Math.max(dt, 1e-3) - st.fps) * 0.08 : 1 / Math.max(dt, 1e-3);
    last.skin = last.upload = last.draw = last.uploadPx = 0; last.drawn = false;
    this._physics(dt, t0 / 1000);   // same clock as the pointer events
    last.physics = nowMs() - t0;
    this._render(dt);
    this._focusRing();
    const cost = nowMs() - t0;
    last.frame = cost;
    st.frameMs = lerp(st.frameMs, cost, 0.1);
    st.frames++;
    this._autoTier(cost);
  }

  // fingers → body → face, one frame (no DOM: also the node-tested core)
  _physics(dt, now) {
    this.time += dt;
    this._dt = dt;
    const st = this.stats;
    this._computeTransform(dt);
    if (!this.reader.ptrs.size) this._inLag = 0;
    const rs = this.reader.update(now - (this._inLag || 0) / 1000);
    this._readTouch(rs, dt);
    this._rest();
    const a = nowMs();
    st.substeps = this.sb.step(dt);
    st.last.solver = nowMs() - a;
    st.solverMs = lerp(st.solverMs, st.last.solver, 0.1);
    if (this.sb.lastSlip) this._noteSlip(this.sb.lastSlip);
    if (this._slipQ && this.time >= this._slipQ.at) {
      const q = this._slipQ;
      this._slipQ = null;
      if (this.reader.ptrs.has(q.id)) this._slip(q);
    }
    this._updateGeo();
    this._faceLag(dt);
  }

  _readTouch(rs, dt) {
    const T = this.touch, R = this.reader, sb = this.sb;
    let maxD = 0, speed = 0;
    // two fingers: the jelly stretches less than the fingers spread (a tough,
    // springy feel, and the approved face never smears): 70 % of the ratio
    const S = R.stretch;
    let mx = 0, my = 0, half = 0;
    if (S) {
      const a = R.ptrs.get(S.a), c = R.ptrs.get(S.b);
      if (a && c) { mx = (a.x + c.x) / 2; my = (a.y + c.y) / 2; half = (S.d0 / 2) * (1 + (S.s - 1) * STRETCH_GIVE); }
    }
    for (const p of R.ptrs.values()) {
      const f = this._fingers.get(p.id);
      let px = p.x, py = p.y;
      if (half > 0 && (p.id === S.a || p.id === S.b)) {
        const dx = p.x - mx, dy = p.y - my, l = Math.hypot(dx, dy) || 1;
        px = mx + (dx / l) * half; py = my + (dy / l) * half;
      }
      const b = this._local(px, py);
      const d = p.depth * (S ? 0.4 : 1);
      sb.press(p.id, b.x, b.y, d, 0.21);
      sb.move(p.id, b.x, b.y, S ? 1 : p.pull);
      // a gliding (soothing) or slipped finger dents the skin but isn't a squeeze
      const squeezing = p.mode !== 'glide' && !f?.slipped;
      if (squeezing) { maxD = Math.max(maxD, d); speed = Math.max(speed, Math.hypot(p.vx, p.vy)); }
      if (f && squeezing) {
        // haptic beats as the squeeze deepens; 'squeeze' only for a real press
        const band = p.depth > 0.66 ? 2 : p.depth > 0.33 ? 1 : 0;
        if (band > f.band) {
          this._haptic('soft');
          if (band >= 1 && !f.squeezed && !S && p.mode === 'press') { f.squeezed = true; this._touchEvent('squeeze'); }
        }
        f.band = Math.max(f.band, band);
      }
      // massage swirls the skin under the finger
      if (p.massage && Math.abs(p.massage.rate) > 0.5) sb.swirl(b.x, b.y, 0.22, p.massage.rate);
    }
    // pull stretch: how far a holding finger has dragged the body (body heights)
    let pullStretch = 1;
    if (!S) {
      for (const p of R.ptrs.values()) {
        const f = this._fingers.get(p.id);
        if (!f || p.mode !== 'pull' || f.slipped) continue;
        const d = Math.hypot(p.x - f.x0, p.y - f.y0) / (this._Pnow || 200);
        pullStretch = Math.max(pullStretch, 1 + d * p.pull);
      }
    }
    const k = Math.min(1, dt * 12);
    T.depth += (maxD - T.depth) * (maxD > T.depth ? 1 : k);
    T.stretch += ((S ? rs.stretch : pullStretch) - T.stretch) * k;
    T.speed = speed;
    T.held = rs.held;
    T.turns = rs.turns;
    T.massageRate += ((rs.massaging ? rs.rate : 0) - T.massageRate) * k;
    const tw = S ? rs.twist : 0;
    T.twistRate += (((tw - this._lastTwist) / Math.max(dt, 1e-3)) - T.twistRate) * k;
    this._lastTwist = tw;
    T.jiggle = Math.max(0, T.jiggle - dt * 1.2);
    // a two-finger stretch pulls in a waist between the fingers
    if (S) sb.setWaist(S.a, S.b, clamp((T.stretch - 1) * WAIST_GAIN, 0, 0.45));
    // massage soothes continuously, more for a slow, gentle circle
    if (rs.massaging) {
      const tps = Math.abs(rs.rate) / TAU;
      const gentle = clamp((1.6 - tps) / 1.2, 0, 1);
      T.calm = Math.min(0.8, T.calm + dt * 0.16 * (0.4 + 0.6 * gentle));
      this._lastSoothe = this.time;
    }
    // soothing fades after 4 s without strokes or circles
    if (this.time - this._lastSoothe > 4) { T.calm = Math.max(0, T.calm - dt * 0.25); if (T.calm < 0.05) T.strokes = 0; }
    this.rig.setTouch(T);
    // the squeeze sound follows the depth
    const audio = this.opts.audio;
    if (audio?.hold && R.ptrs.size && T.depth > 0.12 && !rs.massaging) {
      if (!this._hold) this._hold = audio.hold('charge', { intensity: 0.2, pitch: 1 }) || null;
      this._hold?.update?.({ intensity: 0.15 + 0.75 * T.depth, pitch: 0.9 + 0.3 * (T.stretch - 1) + 0.15 * T.depth });
    } else if (this._hold && (!R.ptrs.size || rs.massaging || T.depth < 0.06)) { this._hold.stop(); this._hold = null; }
    if (this._hum) this._hum.update?.({ intensity: clamp(Math.abs(T.massageRate) / 10, 0.1, 0.7), pitch: 0.9 + clamp(Math.abs(T.massageRate) / 30, 0, 0.3) });
  }

  // a pull stretched past the material's limit let go
  _noteSlip(s) {
    const f = this._fingers.get(s.id), p = this.reader.ptrs.get(s.id);
    if (!f || !p || p.mode === 'glide') return;
    // the hand slid off the jelly (anything but a fast, bent yank): it glides
    // on over the skin, no startle — and may still count as a stroke
    if (this.reader.slide(s.id)) return;
    f.slipped = true;
    // react a moment later: a flick or a lift that follows says it better
    this._slipQ = { id: s.id, at: this.time + SLIP_DELAY };
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
    // pressing presses it into the floor a little: shorter and wider
    const dm = this.sb.material.dMax / 0.34;
    const sq = T.depth * 0.1 * dm;
    this._squash += (sq - this._squash) * Math.min(1, (this._dt || 0.016) * 15);
    if (Math.abs(this._squash - sq) < 1e-5) this._squash = sq;
    this.sb.setRest({
      squash: v.squashBias + this._squash, droop: v.droop, shrink: v.shrink, lean: b.lean * 0.55,
      puffL: v.cheekPuff, puffR: v.cheekPuff, cheekV: this.cheekV,
    });
  }

  _faceLag(dt) {
    const L = this._lag, fv = this.sb.faceVelocity(this._pt);
    // a spring follower (k 90, ζ 0.5) on the face's velocity
    const k = 90, c = 2 * 0.5 * Math.sqrt(k);
    L.vx += (k * (fv.x - L.x) - c * L.vx) * dt; L.x += L.vx * dt;
    L.vy += (k * (fv.y - L.y) - c * L.vy) * dt; L.y += L.vy * dt;
    if (Math.abs(L.x) + Math.abs(L.y) + Math.abs(L.vx) + Math.abs(L.vy) < 1e-6) { L.x = L.y = L.vx = L.vy = 0; }
    const uv = this.uvRect, gain = this.opts.reducedMotion ? 0 : 0.012;
    this._item.lag[0] = clamp(L.x * gain, -0.02, 0.02) * ((uv[2] - uv[0]) / this.aspect);
    this._item.lag[1] = clamp(L.y * gain, -0.02, 0.02) * (uv[3] - uv[1]);
  }

  _render(dt) {
    const st = this.stats, rig = this.rig, sb = this.sb, T = this.touch;
    let a = nowMs();
    // the face redraws at most ~30 times a second in tier A (each redraw is a
    // texture upload) and every other frame in the 2D tiers while a finger is
    // down; the body still moves every frame, and the first change after a
    // quiet spell (a blink, a touch) is drawn at once
    const touching = this.reader.ptrs.size > 0;
    let changed = false;
    const gl = this.tier === 'gl';
    const due = gl ? this.time - (this._lastSkinT ?? -1) >= 0.03 || st.frames - this._lastSkinFrame > 1 : !touching || st.frames - this._lastSkinFrame > 1;
    if (due || this._lastSkinFrame < st.frames - 1) {
      changed = rig.renderSkin();
      if (changed) { this._lastSkinFrame = st.frames; this._lastSkinT = this.time; }
    }
    st.last.skin = nowMs() - a;
    st.skinMs = lerp(st.skinMs, st.last.skin, 0.1);
    // idle (only breathing, blinks drawn when they happen): draw every other
    // frame — breathing is slow, the battery is not. Anything else (a finger,
    // a wobble, a face change, particles, a glide, a hop) draws every frame.
    const s = this.st, parts = rig.particles, fl = this.fl;
    const idle = !touching && !changed && (!sb.awake || sb.energy < 2e-5) && this._rim < 0.01 && !(parts.list.length || parts.cloud > 0.02) &&
      Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vs) + Math.abs(fl.vl) + Math.abs(fl.vt) < 0.5 && rig.body.grounded && !(rig.body.spin > 0) &&
      !(rig.body.glitchBurst > 0) && !this._trem && !(this.id === 'glitzi' && this.tier === 'gl' && rig.val.glitch >= 0.55 && rig.restMix < 0.999) &&
      !this._layersBusy();
    this._idleFrames = idle ? (this._idleFrames || 0) + 1 : 0;
    st.idle = idle;
    if (idle && this._idleFrames % 2 === 0) { st.skipped++; return; }
    st.last.drawn = true;
    const info = this._layerInfo;
    info.tier = st.tier; info.dpr = this.view.dpr; info.dt = dt; info.time = this.time;
    // rim light rises with the squeeze, the stretch and a jiggle
    const rimGoal = clamp(0.5 * T.depth + 0.9 * Math.max(0, T.stretch - 1) + 0.3 * T.jiggle, 0, 0.75) * (this.opts.lowStim ? 0.5 : 1);
    this._rim += (rimGoal - this._rim) * Math.min(1, dt * (rimGoal > this._rim ? 10 : 3));
    if (this._rim < 1e-3 && rimGoal === 0) this._rim = 0;
    if (this.tier === 'gl' && this.renderer && !this.renderer.lost) {
      a = nowMs();
      st.uploadPx = changed ? this.renderer.updateTexture('hero', rig.skin, rig.skinRects || rig.skinRect) : 0;
      st.last.upload = nowMs() - a; st.last.uploadPx = st.uploadPx;
      st.uploadMs = lerp(st.uploadMs, st.last.upload, 0.1);
      a = nowMs();
      sb.computeShading();
      const it = this._item;
      it.positions = sb.positions; it.shade = sb.shade; it.m = this.M; it.rim = this._rim;
      it.rest = rig.opts.pristine === false ? 0 : rig.restMix ?? 0;
      it.glitch = this._glitchUniforms();
      it.glitchThick = this._glitch.thick || 3;
      it.burst = this._burstUniforms();
      const items = this._items;
      items.length = 0; items.push(it);
      for (const L of this._layers) if (L.gl) { try { L.gl(items, this.renderer, info); } catch (e) { console.error(e); } }
      this.renderer.draw(items, this._blobsFor());
      this._draw2d(false);
      st.last.draw = nowMs() - a;
      st.drawMs = lerp(st.drawMs, st.last.draw, 0.1);
    } else {
      st.uploadMs = 0; st.uploadPx = 0;
      a = nowMs();
      this._draw2d(true);
      st.last.draw = nowMs() - a;
      st.drawMs = lerp(st.drawMs, st.last.draw, 0.1);
    }
  }

  _glitchUniforms() {
    if (this.id !== 'glitzi') return null;
    const g = this.rig.glitchLines(this._glitch, { dim: true });
    if (!g) return null;
    this._item.glitchMode = g.mode;
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
    const sp = this._shadow || (this._shadow = { cx: 0, cy: 0, sw: 0, sa: 0 });
    sp.cx = cx; sp.cy = this._floorY; sp.sw = sw; sp.sa = sa;
    return sp;
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

  _layersBusy() { for (const L of this._layers) { try { if (L.busy?.()) return true; } catch { /* ignore */ } } return false; }

  // layers drawing on the 2D canvas this frame (all in tiers B/C; in tier A those without gl)
  _layers2d(body) { for (const L of this._layers) if (L.draw2d && (body || !L.gl)) return true; return false; }

  // 2D canvas: everything in tiers B/C, only particles over the GL mesh in tier A
  _draw2d(body) {
    const ctx = this.ctx, dpr = this.view.dpr, rig = this.rig, parts = rig.particles;
    const hasParticles = rig.opts.particles && (parts.list.length > 0 || parts.cloud > 0.02);
    const layers = this._layers.size ? this._layers2d(body) : false;
    if (!body && !hasParticles && !this._dirty && !layers && !this._hadLayers2d) return;
    // other layers may draw anywhere: clear everything while there are any
    this._clear2d(layers || this._hadLayers2d);
    this._hadLayers2d = layers;
    const g = this._geo;
    let e0 = g.cx - g.w, e1 = g.top - g.h * 0.9, e2 = g.cx + g.w, e3 = g.bottom + g.h * 0.2;
    if (body) {
      const s = this._shadowParams();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSoftBlob(ctx, s.cx, s.cy, s.sw, s.sw * 0.22, 'rgba(10,6,30,1)', s.sa);
      const v = rig.val;
      if (v.glow > 0.02) drawSoftBlob(ctx, g.cx, g.mid, g.w * 0.75, g.w * 0.75, this.mallow.colours.glow, 0.32 * clamp(v.glow, 0, 1.5), 0.2);
      if (!this.sb.awake && this.sb.restFlat) {
        // asleep on the undeformed lattice: the warp is one affine image
        const M = this.M, uv = this.uvRect, SW = rig.skin.width, SH = rig.skin.height;
        ctx.setTransform(M[0] * dpr, M[1] * dpr, M[2] * dpr, M[3] * dpr, M[4] * dpr, M[5] * dpr);
        ctx.drawImage(rig.skin, uv[0] * SW, uv[1] * SH, (uv[2] - uv[0]) * SW, (uv[3] - uv[1]) * SH, 0, 0, this.aspect, 1);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else if (this.tier === 'strip') {
        const burst = this.id === 'glitzi' && rig.body.glitchBurst > 0 ? (this._burstFn || (this._burstFn = (vm) => burstShift(this.rig.body, vm) * (7 / this._Pnow))) : null;
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
        if (p.x - 40 < e0) e0 = p.x - 40; if (p.x + 40 > e2) e2 = p.x + 40;
        if (p.y - 40 < e1) e1 = p.y - 40; if (p.y + 40 > e3) e3 = p.y + 40;
      }
    }
    if (layers) {
      for (const L of this._layers) {
        if (!L.draw2d || (!body && L.gl)) continue;
        ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        try { L.draw2d(ctx, this._layerInfo); } catch (e) { console.error(e); }
        ctx.restore();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const v = this.view;
    const d = this._dirtyBox || (this._dirtyBox = [0, 0, 0, 0]);
    d[0] = Math.max(0, e0 - 8); d[1] = Math.max(0, e1 - 8); d[2] = Math.min(v.w, e2 + 8); d[3] = Math.min(v.h, e3 + 8);
    this._dirty = d;
  }

  // 2D tiers: a soft dark dent with a lit rim where a finger presses
  _dentShading(ctx, dpr) {
    const R = this.reader;
    if (!R.ptrs.size) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    for (const p of R.ptrs.values()) {
      const f = this._fingers.get(p.id);
      if (p.depth < 0.03 || f?.slipped) continue;
      // a glide's dent travels with the finger and is shallower
      const k = p.mode === 'glide' ? 0.45 : 1;
      const r = (this._Pnow || 200) * 0.22 * (p.mode === 'glide' ? 0.8 : 1);
      const x = p.x - this.view.left, y = p.y - this.view.top;
      const gr = this._dentGrad || (this._dentGrad = (() => {
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gg.addColorStop(0, 'rgba(8,4,30,0.2)'); gg.addColorStop(0.5, 'rgba(8,4,30,0.08)');
        gg.addColorStop(0.78, 'rgba(255,250,240,0.12)'); gg.addColorStop(1, 'rgba(255,250,240,0)');
        return gg;
      })());
      ctx.save();
      ctx.translate(x, y); ctx.scale(r, r);
      ctx.globalAlpha = clamp(p.depth * k, 0, 1) * (this.sb.material.dMax / 0.34);
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
