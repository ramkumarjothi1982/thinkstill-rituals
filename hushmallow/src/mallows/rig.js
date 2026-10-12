// Living Mallow rig.
//
// Rendering pipeline (per visible frame):
//   1. skin  — source-resolution canvas: the face-cleaned approved artwork,
//              then the animated face (eyes whose lids are the body's own
//              surface, irises / spirals cut from the approved art, brows and
//              mouth drawn in each Mallow's sampled ink), then the pristine
//              approved PNG cross-faded in whenever the face is at rest.
//   2. warp  — the skin is drawn to the visible canvas in horizontal strips,
//              each with its own width / offset, giving soft-body squash,
//              stretch, bulge, lean and jiggle without ever distorting the
//              face differently from the body.
//   3. fx    — Mallow-specific particles (sparks, droplets, spirals, glitch
//              shards, moon stars…) in screen space.
//
// One shared requestAnimationFrame loop drives every rig; rigs that are off
// screen or in a hidden tab don't render.

import { MALLOWS, loadMallowAssets } from './registry.js';
import { PARAMS, PARAM_NAMES, PRESETS, STAGES, resolveExpression, baseParams, describeExpression } from './expressions.js';
import { REACTIONS } from './reactions.js';
import { ParticleField } from './particles.js';
import { drawStar, drawHeart, drawDrop } from './shapes.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a, b) => a + Math.random() * (b - a);

// spring constants per parameter group: [stiffness, damping]
const GROUPS = {
  gaze: [420, 34], eye: [240, 24], brow: [190, 21], mouth: [170, 17],
  cheek: [80, 16], body: [55, 13], fx: [30, 11],
};
const GROUPS_CALM = {
  gaze: [200, 28], eye: [110, 21], brow: [90, 19], mouth: [80, 18],
  cheek: [50, 14], body: [35, 12], fx: [25, 10],
};

// face params a soothing stroke or massage pulls toward its calm look
const CALM_KEYS = ['eyeOpen', 'closedCurve', 'lidTop', 'lidBot', 'lidSlant', 'browY', 'browTilt', 'browAlpha', 'mouthSmile', 'mouthOpen',
  'mouthWave', 'mouthTremble', 'tremble', 'gazeDart', 'blinkRate', 'sweat', 'blush', 'glow', 'breath', 'breathRate', 'glitch', 'spinJitter'];

// GLITZI: rows of the approved glitch lines (source px)
const GLITCH_ROWS = [61, 111, 122, 177, 215, 242, 269, 281, 329];

// ---------------------------------------------------------------- ticker --
const rigs = new Set();
const tickers = new Set();
let rafId = 0;
let lastT = 0;
function frame(t) {
  rafId = 0;
  const dt = Math.min(0.05, Math.max(0.001, (t - (lastT || t)) / 1000));
  lastT = t;
  for (const r of rigs) {
    if (r._shouldRun()) r._tick(dt, t / 1000);
  }
  // MallowTouch stages, Thought Mallows and worlds share this one loop; they
  // run after the rigs so they see this frame's face
  for (const fn of tickers) {
    try { fn(dt, t / 1000); } catch (e) { console.error(e); }
  }
  if (rigs.size || tickers.size) rafId = requestAnimationFrame(frame);
}
/** Run fn(dt, seconds) every animation frame in the shared Mallow loop. */
export function addTicker(fn) { if (typeof fn === 'function') { tickers.add(fn); ensureLoop(); } return fn; }
export function removeTicker(fn) { tickers.delete(fn); }
function ensureLoop() {
  if (!rafId && typeof requestAnimationFrame === 'function') {
    lastT = 0;
    rafId = requestAnimationFrame(frame);
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ensureLoop(); });
}

// vibration only after the person has interacted (browsers require it);
// in the iOS app wrapper haptics go through the native bridge instead
function buzz(pattern) {
  try {
    if (window.HushNative?.haptic) { window.HushNative.haptic(Array.isArray(pattern) ? 'pop' : 'light'); return; }
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate?.(pattern);
  } catch { /* unsupported */ }
}

// rig vibration patterns → the kinds haptics.js understands
function hapticKind(p) {
  if (!Array.isArray(p)) return 'light';
  if (p.length === 1) return 'pop';
  if (p.length <= 3) return 'soft';
  return p[0] <= 6 ? 'buzz' : 'success';
}

export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

// ------------------------------------------------------------- the rig --
export class MallowRig {
  constructor(container, opts = {}) {
    this.id = opts.id || 'boppo';
    this.mallow = MALLOWS[this.id];
    if (!this.mallow) throw new Error(`Unknown Mallow ${this.id}`);
    this.opts = {
      interactive: true, pristine: true, fit: 0.64, baseline: 0.88,
      reducedMotion: opts.reducedMotion ?? prefersReducedMotion(),
      audio: null, haptics: true, particles: true, shadow: true, aura: true,
      ...opts,
    };
    // headless: no canvas of its own, no pointer, no observers — the face
    // brain (springs, overlays, blinks, skin) for MallowTouch
    this.headless = !!this.opts.headless;
    if (this.opts.lowStim) this.opts.particles = false;
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'mallow-canvas';
    this.canvas.setAttribute('role', this.opts.interactive ? 'button' : 'img');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;background:transparent;';
    if (this.opts.interactive) {
      this.canvas.style.touchAction = 'none';
      this.canvas.style.cursor = 'grab';
      this.canvas.tabIndex = 0;
    }
    if (!this.headless) container.appendChild(this.canvas);
    this.ctx = this.headless ? null : this.canvas.getContext('2d');
    this.skin = document.createElement('canvas');
    this.sctx = this.skin.getContext('2d');

    // parameters
    this.base = baseParams(this.mallow);
    this.target = { ...this.base };
    this.val = { ...this.base };
    this.vel = {};
    for (const k of PARAM_NAMES) this.vel[k] = 0;
    this.mix = { neutral: 1 };
    this.intensity = 0;
    this.stage = 'neutral';

    // procedural state
    this.time = 0;
    this.blink = { next: rand(1.2, 3.5), t: -1, double: false };
    this.sacc = { next: rand(0.6, 2), x: 0, y: 0 };
    this.gaze = { x: 0, y: 0 };
    this.pointerLook = null;
    this.breathPhase = Math.random() * 6;
    this.spinAngle = Math.random() * 6;
    this.cycles = { yawn: rand(3, 6), sigh: rand(3, 6), idle: rand(3, 7) };
    this.overlays = [];      // timed reaction overlays
    this.body = {
      squash: 0, squashV: 0, lean: 0, leanV: 0, tilt: 0, tiltV: 0,
      shear: 0, shearV: 0, hop: 0, hopV: 0, grounded: true, sinceLand: 0, spin: 0,
      press: 0, pressV: 0, glitchBurst: 0, burstRows: [],
    };
    this.press = null;
    this.touch = null;       // set by MallowTouch: {depth, stretch, speed, turns, strokes, calm}
    this.skinVersion = 0;    // bumps whenever the skin's pixels change
    this.skinRect = null;    // the skin-px rect that changed last
    this.lastTap = 0;
    this.visible = true;
    this.destroyed = false;
    this.ready = false;
    this.listeners = {};
    this.particles = new ParticleField(this);

    this._resize = this._resize.bind(this);
    this.ro = !this.headless && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this._resize) : null;
    this.ro?.observe(container);
    if (!this.headless && typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((es) => { this.visible = es.some((e) => e.isIntersecting); ensureLoop(); });
      this.io.observe(container);
    }
    if (this.opts.interactive && !this.headless) this._bindPointer();
    this._resize();
    this._label();

    this.loaded = loadMallowAssets(this.id).then((assets) => {
      if (this.destroyed) return this;
      this.assets = assets;
      this.ready = true;
      this._resize();
      rigs.add(this);
      ensureLoop();
      this._emit('ready');
      return this;
    });
  }

  // ------------------------------------------------------------ public --
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return this; }
  _emit(ev, data) { for (const fn of this.listeners[ev] || []) fn(data); }

  /** emotion: preset id | {presetId: weight}; intensity 0..1 */
  setEmotion(emotion, intensity = 0.7, opts = {}) {
    const mix = typeof emotion === 'string' ? { [emotion]: 1 } : { ...emotion };
    this.mix = mix;
    this.intensity = Number.isFinite(+intensity) ? clamp(+intensity, 0, 1) : 0.7;
    this.stage = opts.stage || null;
    this.target = resolveExpression(this.mallow, mix, this.intensity, opts.extra || null);
    if (opts.instant) { Object.assign(this.val, this.target); }
    // anticipation: a tiny squash "beat" sells the change of feeling
    if (!opts.instant && !opts.quiet && this.ready) {
      const delta = Math.abs((this.target.mouthSmile || 0) - (this.val.mouthSmile || 0)) +
        Math.abs((this.target.eyeOpen || 0) - (this.val.eyeOpen || 0));
      if (delta > 0.25) {
        const kick = this.opts.reducedMotion ? 0 : 0.9 * Math.min(1, delta);
        if (this.opts.onImpulse) this.opts.onImpulse({ squash: kick, lean: 0, shear: 0 }, 'emotion');
        else this.body.squashV += kick;
        this._blinkNow();
      }
    }
    this._label();
    this._emit('emotion', { mix, intensity: this.intensity });
    return this;
  }

  setStage(name, opts = {}) {
    const s = STAGES[name] || STAGES.neutral;
    this.setEmotion(s.mix, opts.intensity ?? s.intensity, { extra: s.extra, stage: name, quiet: opts.quiet });
    this.stage = name;
    return this;
  }

  /** One-shot reaction: tap, doubleTap, flick, squeeze, release, celebrate,
   *  nod, gasp, shiver, sigh, yawn, comfort, glitchBurst, hop */
  react(kind, opts = {}) {
    if (!this.ready) return this;
    const table = REACTIONS[this.id] || {};
    const r = table[kind] || REACTIONS._shared[kind];
    if (!r) return this;
    const rm = this.opts.reducedMotion;
    const dur = (r.dur || 0.8) * (rm ? 1.15 : 1);
    this.overlays.push({ start: this.time, dur, params: r.params || {}, kind });
    const b = this.body;
    const imp = r.impulse || {};
    const k = rm ? 0.25 : 1;
    if (this.opts.onImpulse) {
      // MallowTouch: squash / lean / shear become soft-body velocity fields
      this.opts.onImpulse({ squash: (imp.squash || 0) * 6 * k + (imp.hop && b.grounded && !rm ? 0.5 : 0),
        lean: (imp.lean || 0) * 4 * k, shear: (imp.shear || 0) * 5 * k }, kind);
    } else {
      if (imp.squash) b.squashV += imp.squash * 6 * k;
      if (imp.lean) b.leanV += imp.lean * 4 * k;
      if (imp.shear) b.shearV += imp.shear * 5 * k;
    }
    if (imp.hop && b.grounded && !rm) { b.hopV = Math.sqrt(2 * 9.8 * imp.hop * 0.14) * 1.0; b.grounded = false; if (!this.opts.onImpulse) b.squash += 0.06; }
    if (imp.tilt) b.tiltV += imp.tilt * 60 * k;
    if (imp.spin && !rm) b.spin = imp.spin;
    if (imp.glitch) { b.glitchBurst = Math.max(b.glitchBurst, rm ? 0 : imp.glitch); }
    if (r.fx && this.opts.particles) this.particles.burst(r.fx, opts);
    // opts.intensity: e.g. how deep the squeeze was (MallowTouch release)
    if (r.sound) this.opts.audio?.play?.(this.id, r.sound, { intensity: Number.isFinite(opts.intensity) ? clamp(opts.intensity, 0, 1) : this.intensity });
    if (r.haptic) this._haptic(r.haptic);
    if (r.blink) this._blinkNow();
    this._emit('react', { kind });
    return this;
  }

  // haptics only through the injected fn when one is given (prefs + rate limits live there)
  _haptic(pattern) {
    if (typeof this.opts.haptic === 'function') { try { this.opts.haptic(hapticKind(pattern)); } catch { /* ignore */ } return; }
    if (this.opts.haptic === null || this.opts.haptic === false) return;
    if (this.opts.haptics) buzz(pattern);
  }

  /** MallowTouch drives the face from the gesture: {depth 0..1, stretch ~1, speed px/s, turns, strokes, calm 0..1}. */
  setTouch(state) {
    if (!state) { this.touch = null; return this; }
    const t = this.touch || (this.touch = { depth: 0, stretch: 1, speed: 0, turns: 0, strokes: 0, calm: 0 });
    for (const key of Object.keys(state)) { const v = +state[key]; if (Number.isFinite(v)) t[key] = v; }
    return this;
  }

  /** A one-off face overlay (attack / hold / release envelope) with optional
   *  particles and sound — for touch reactions that are not in REACTIONS. */
  overlay(params, { dur = 1, fx = null, sound = null } = {}) {
    if (!this.ready) return this;
    this.overlays.push({ start: this.time, dur: dur * (this.opts.reducedMotion ? 1.15 : 1), params: params || {}, kind: 'overlay' });
    if (fx && this.opts.particles) this.particles.burst(fx);
    if (sound) this.opts.audio?.play?.(this.id, sound, { intensity: this.intensity });
    return this;
  }

  lookAt(x, y) { this.pointerLook = x == null ? null : { x: clamp(x, -1, 1), y: clamp(y, -1, 1), t: this.time }; }
  setReducedMotion(b) { this.opts.reducedMotion = !!b; }
  snapshot() { return { ...this.val }; }
  describe() { return describeExpression(this.mallow, this.mix, this.intensity); }

  destroy() {
    this.destroyed = true;
    rigs.delete(this);
    this.ro?.disconnect();
    this.io?.disconnect();
    this._unbind?.();
    this.canvas.remove();
  }

  // ----------------------------------------------------------- layout --
  _resize() {
    if (this.headless) { this._resizeHeadless(); return; }
    const r = this.container.getBoundingClientRect();
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    const m = this.mallow;
    const [bx0, by0, bx1, by1] = m.bodyBox;
    const bw = bx1 - bx0, bh = by1 - by0;
    // consistent framing: every Mallow's body occupies the same width share
    // consistent framing: every Mallow gets the same body *area* on screen
    const ref = Math.sqrt(bw * bh);
    this.S = Math.min(W * this.opts.fit / ref, H * (this.opts.fit + 0.06) / ref);
    this.CX = W / 2;
    this.BASE = H * this.opts.baseline;
    // skin resolution follows on-screen size (cheap for thumbnails)
    const q = this.opts.skinSize ? this.opts.skinSize / Math.max(...m.size) : clamp(this.S * dpr * 1.05, 0.28, 1.25);
    if (q !== this.q) {
      this.q = q;
      this.skin.width = Math.ceil(m.size[0] * q);
      this.skin.height = Math.ceil(m.size[1] * q);
    }
    this.skinDirty = true;
  }

  /** Headless (MallowTouch): change the skin's resolution (max side, px). The
   *  next renderSkin() is a full redraw at the new size. */
  setSkinSize(px) {
    if (!(px > 0) || px === this.opts.skinSize) return this;
    this.opts.skinSize = px;
    if (this.headless) this._resizeHeadless(); else this._resize();
    return this;
  }

  _resizeHeadless() {
    const m = this.mallow;
    this.W = this.W || 1; this.H = this.H || 1; this.dpr = 1;
    this.S = this.S || 1; this.CX = this.CX || 0; this.BASE = this.BASE || 0;
    const q = (this.opts.skinSize || 640) / Math.max(...m.size);
    if (q !== this.q) {
      this.q = q;
      this.skin.width = Math.ceil(m.size[0] * q);
      this.skin.height = Math.ceil(m.size[1] * q);
      this._faceRect = null;
    }
    this.skinDirty = true;
  }

  _label() {
    const d = this.describe ? this.describe() : this.mallow.name;
    this.canvas.setAttribute('aria-label', this.opts.interactive ? `${d}. Tap, double tap, hold to squeeze, or drag.` : d);
  }

  _shouldRun() {
    if (this.destroyed || !this.ready) return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    return this.visible;
  }

  // ---------------------------------------------------------- pointer --
  _toLocal(e) {
    // a CSS-scaled layer: the rect includes the transform, W/H do not
    const r = this.canvas.getBoundingClientRect();
    const sx = r.width > 0 ? this.W / r.width : 1, sy = r.height > 0 ? this.H / r.height : 1;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  _hit(p) {
    const m = this.mallow;
    const [bx0, by0, bx1, by1] = m.bodyBox;
    const hw = (bx1 - bx0) * this.S / 2, hh = (by1 - by0) * this.S / 2;
    const cy = this.BASE - hh - this.body.hop * this.H;
    const dx = (p.x - this.CX) / hw, dy = (p.y - cy) / hh;
    return dx * dx + dy * dy < 1.25;
  }

  _bindPointer() {
    const c = this.canvas;
    const down = (e) => {
      const p = this._toLocal(e);
      if (!this._hit(p)) return;
      c.setPointerCapture?.(e.pointerId);
      this.press = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, t0: this.time, lastX: p.x, lastY: p.y, lastT: this.time, vx: 0, vy: 0, squeezed: false };
      c.style.cursor = 'grabbing';
      this.opts.audio?.play?.(this.id, 'press');
      if (this.opts.haptics) buzz(8);
      e.preventDefault();
    };
    const move = (e) => {
      const p = this._toLocal(e);
      const nx = (p.x - this.CX) / (this.W * 0.5), ny = (p.y - (this.BASE - this.H * 0.3)) / (this.H * 0.5);
      this.lookAt(nx, ny);
      if (!this.press || e.pointerId !== this.press.id) return;
      const pr = this.press;
      const dt = Math.max(0.008, this.time - pr.lastT);
      pr.vx = lerp(pr.vx, (p.x - pr.lastX) / dt, 0.5);
      pr.vy = lerp(pr.vy, (p.y - pr.lastY) / dt, 0.5);
      pr.lastX = p.x; pr.lastY = p.y; pr.lastT = this.time;
      pr.x = p.x; pr.y = p.y;
    };
    const up = (e) => {
      if (!this.press || e.pointerId !== this.press.id) return;
      const pr = this.press;
      this.press = null;
      c.style.cursor = 'grab';
      const held = this.time - pr.t0;
      const dist = Math.hypot(pr.x - pr.x0, pr.y - pr.y0);
      // a pause before letting go means no fling, whatever the last velocity was
      const speed = this.time - pr.lastT > 0.08 ? 0 : Math.hypot(pr.vx, pr.vy);
      // elastic recovery: release the stored squash / stretch as velocity
      this.body.squashV -= this.body.press * 7;
      this.body.shearV += clamp(-(pr.x - pr.x0) / this.W, -0.5, 0.5) * 6;
      if (speed > 900 && dist > 24) {
        this.body.leanV += clamp(pr.vx / 2500, -1.2, 1.2) * 3;
        this.react('flick', { dirX: Math.sign(pr.vx) || 1 });
      } else if (pr.squeezed) {
        this.react('release');
      } else if (held < 0.35 && dist < 14) {
        if (this.time - this.lastTap < 0.33) { this.lastTap = 0; this._pendingTap = 0; this.react('doubleTap'); }
        else { this.lastTap = this.time; this._pendingTap = this.time; }
      } else {
        this.opts.audio?.play?.(this.id, 'release');
      }
      this._emit('touch', { kind: 'release', held, dist, speed });
    };
    const leave = () => { if (!this.press) this.lookAt(null); };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', leave);
    const key = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.react('tap'); }
    };
    c.addEventListener('keydown', key);
    this._unbind = () => {
      c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up);
      c.removeEventListener('pointerleave', leave); c.removeEventListener('keydown', key);
    };
  }

  _blinkNow() { if (this.blink.t < 0) this.blink.t = 0; }

  // ------------------------------------------------------------ update --
  _tick(dt, now) {
    this.time += dt;
    const rm = this.opts.reducedMotion;
    // a single tap waits briefly so a double tap can win
    if (this._pendingTap && this.time - this._pendingTap > 0.3) {
      this._pendingTap = 0;
      this.react('tap');
    }
    // squeeze while held
    if (this.press && !this.press.squeezed && this.time - this.press.t0 > 0.35 &&
      Math.hypot(this.press.x - this.press.x0, this.press.y - this.press.y0) < 30) {
      this.press.squeezed = true;
      this._emit('touch', { kind: 'squeeze' });
      this.opts.audio?.play?.(this.id, 'squeeze');
    }

    const goal = this._composeTargets(dt);
    // spring every parameter toward its goal
    const G = rm ? GROUPS_CALM : GROUPS;
    this._dt = dt;
    // fixed small substeps keep stiff springs (gaze) stable on slow frames
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (const k of PARAM_NAMES) {
      const [kS, kD] = G[PARAMS[k][1]];
      let x = this.val[k], v = this.vel[k];
      const g = goal[k];
      for (let i = 0; i < n; i++) { v += (kS * (g - x) - kD * v) * h; x += v * h; }
      this.vel[k] = v;
      this.val[k] = x;
    }
    this._updateBody(dt, goal);
    this._updateCycles(dt);
    if (this.opts.particles) this.particles.update(dt, this.val);
    if (!this.headless) this._render();
  }

  _composeTargets(dt) {
    const goal = { ...this.target };
    // reaction overlays (attack / hold / release envelope)
    this.overlays = this.overlays.filter((o) => this.time - o.start < o.dur);
    for (const o of this.overlays) {
      const t = (this.time - o.start) / o.dur;
      const w = t < 0.18 ? smoothstep(0, 0.18, t) : t > 0.62 ? 1 - smoothstep(0.62, 1, t) : 1;
      for (const [k, v] of Object.entries(o.params)) if (k in goal) goal[k] = lerp(goal[k], v, w);
    }
    // MallowTouch: the face follows how deep, how stretched and how soothed
    if (this.touch) this._touchFace(goal, this.touch);
    // squeeze face while held
    if (this.press?.squeezed) {
      const sq = REACTIONS[this.id]?.squeezeFace || REACTIONS._shared.squeezeFace;
      for (const [k, v] of Object.entries(sq)) goal[k] = v;
    }
    // yawn / sigh cycles
    const yawn = this._cycleEnv('yawn');
    if (yawn > 0) {
      goal.mouthRound = lerp(goal.mouthRound, 1, yawn);
      goal.mouthOpen = lerp(goal.mouthOpen, 1.15, yawn);
      goal.mouthSmile = lerp(goal.mouthSmile, 0, yawn);
      goal.eyeOpen = lerp(goal.eyeOpen, 0, yawn);
      goal.closedCurve = lerp(goal.closedCurve, -0.4, yawn);
      goal.browY = lerp(goal.browY, 0.5, yawn);
      goal.squashBias -= 0.07 * yawn;
    }
    const sigh = this._cycleEnv('sigh');
    if (sigh > 0) {
      goal.squashBias += 0.07 * Math.sin(sigh * Math.PI);
      goal.mouthRound = lerp(goal.mouthRound, 0.5, sigh);
      goal.mouthOpen = lerp(goal.mouthOpen, 0.35, sigh);
      goal.eyeOpen *= 1 - 0.6 * sigh;
    }
    // gaze: pointer > saccades
    this.sacc.next -= dt;
    const dart = this.val.gazeDart;
    if (this.sacc.next <= 0) {
      const amp = 0.18 + dart * 0.6;
      this.sacc.x = rand(-amp, amp);
      this.sacc.y = rand(-amp * 0.6, amp * 0.6);
      this.sacc.next = dart > 0.3 ? rand(0.18, 0.6) : rand(0.8, 2.8);
    }
    if (this.pointerLook && this.time - this.pointerLook.t < 2.5) {
      goal.lookX = lerp(goal.lookX, this.pointerLook.x, 0.85);
      goal.lookY = lerp(goal.lookY, this.pointerLook.y, 0.85);
    } else {
      goal.lookX += this.sacc.x;
      goal.lookY += this.sacc.y;
    }
    goal.lookX = clamp(goal.lookX, -1, 1);
    goal.lookY = clamp(goal.lookY, -1, 1);
    return goal;
  }

  _touchFace(goal, T) {
    const d = clamp(T.depth || 0, 0, 1);
    if (d > 0.004) {
      const sq = REACTIONS[this.id]?.squeezeFace || REACTIONS._shared.squeezeFace;
      const w = smoothstep(0.05, 0.6, d);
      for (const k in sq) if (k in goal) goal[k] = lerp(goal[k], sq[k], w);
      goal.cheekPuff += 0.7 * d;
      goal.lidBot += 0.4 * d;
      goal.eyeOpen *= 1 - 0.6 * d;
      goal.browY -= 0.2 * d;
    }
    const st = T.stretch ?? 1;
    if (st > 1.1) {
      // a long stretch: "ooh"
      const w = smoothstep(1.1, 1.35, st);
      goal.mouthRound = lerp(goal.mouthRound, 0.8, w);
      goal.mouthOpen = lerp(goal.mouthOpen, Math.max(goal.mouthOpen, 0.55), w);
      goal.eyeOpen += 0.3 * w;
    }
    const calm = clamp(T.calm || 0, 0, 0.85);
    if (calm > 0.005) {
      const cg = this._calmGoal || (this._calmGoal = resolveExpression(this.mallow, { comforted: 0.6, calm: 0.4 }, 0.8));
      for (const k of CALM_KEYS) goal[k] = lerp(goal[k], cg[k], calm);
    }
    this.opts.touchFace?.(goal, T, this);
  }

  _cycleEnv(name) {
    const c = this.cycles;
    const key = name + 'T';
    if (c[key] != null) {
      const t = (this.time - c[key]) / (name === 'yawn' ? 2.4 : 1.6);
      if (t >= 1) { c[key] = null; return 0; }
      return t < 0.3 ? smoothstep(0, 0.3, t) : t > 0.7 ? 1 - smoothstep(0.7, 1, t) : 1;
    }
    return 0;
  }

  _updateCycles(dt) {
    const v = this.val;
    const c = this.cycles;
    const fire = (name, strength, period) => {
      if (strength < 0.05) return;
      c[name] -= dt * strength;
      if (c[name] <= 0) {
        c[name] = rand(period * 0.7, period * 1.3);
        c[name + 'T'] = this.time;
        if (name === 'yawn') this.opts.audio?.play?.(this.id, 'yawn');
        if (name === 'sigh') {
          this.opts.audio?.play?.(this.id, 'sigh');
          if (this.opts.particles) this.particles.burst({ kind: 'puff', n: 3 });
        }
      }
    };
    fire('yawn', v.yawnCycle, 8);
    fire('sigh', v.sighCycle, 6.5);
    // signature idle behaviour every few seconds while nothing else happens
    c.idle -= dt;
    if (c.idle <= 0) {
      c.idle = rand(5, 10);
      if (!this.press && !this.touch?.held && this.overlays.length === 0 && this.intensity < 0.6) this.react('idle');
    }
    // blinking (open-eyed states only)
    const b = this.blink;
    if (b.t >= 0) {
      b.t += dt;
      if (b.t > 0.16) {
        b.t = -1;
        if (b.double) { b.double = false; b.next = 0.12; }
      }
    } else {
      b.next -= dt * Math.max(0.3, v.blinkRate);
      if (b.next <= 0) {
        b.t = 0;
        b.double = Math.random() < 0.18;
        b.next = rand(2.2, 5.5);
      }
    }
  }

  _blinkAmount() {
    const t = this.blink.t;
    if (t < 0) return 0;
    return t < 0.07 ? smoothstep(0, 0.07, t) : 1 - smoothstep(0.07, 0.16, t);
  }

  _updateBody(dt, goal) {
    const b = this.body;
    const v = this.val;
    const rm = this.opts.reducedMotion;
    const energy = rm ? 0.25 : 1;
    // press: squash builds while held
    let pressGoal = 0, dragLean = 0, dragStretch = 0;
    if (this.press) {
      const pr = this.press;
      const held = this.time - pr.t0;
      pressGoal = Math.min(1, 0.35 + held * 1.4);
      const dx = (pr.x - pr.x0) / this.W, dy = (pr.y - pr.y0) / this.H;
      dragLean = clamp(dx * 2.2, -0.9, 0.9);
      dragStretch = clamp(-dy * 1.6, -0.5, 0.6);
      if (Math.hypot(dx, dy) > 0.03) pressGoal *= 0.35;
    }
    const pa = 160 * (pressGoal - b.press) - 18 * b.pressV;
    b.pressV += pa * dt; b.press += b.pressV * dt;

    // squash spring (positive = flatter); underdamped for jelly jiggle
    const sGoal = v.squashBias + b.press * 0.2 - dragStretch * 0.22;
    const sk = rm ? 120 : 210, sd = rm ? 22 : 9.5;
    b.squashV += (sk * (sGoal - b.squash) - sd * b.squashV) * dt;
    b.squash += b.squashV * dt;
    b.squash = clamp(b.squash, -0.45, 0.45);
    // lean & shear
    const lGoal = v.leanBias * 0.16 + dragLean * 0.5;
    b.leanV += (120 * (lGoal - b.lean) - (rm ? 22 : 11) * b.leanV) * dt;
    b.lean += b.leanV * dt;
    b.shearV += (150 * (0 - b.shear) - (rm ? 24 : 7) * b.shearV) * dt;
    b.shear += b.shearV * dt;
    // tilt (degrees)
    const tGoal = v.tiltBias + dragLean * 8;
    b.tiltV += (90 * (tGoal - b.tilt) - 13 * b.tiltV) * dt;
    b.tilt += b.tiltV * dt;
    // spin (double-tap pirouette)
    if (b.spin > 0) { b.spin = Math.max(0, b.spin - dt * 1.25); }

    // hops: ballistic with gravity, landing squash
    const g = 9.8 * 1.3;
    if (!b.grounded) {
      b.hopV -= g * dt * 0.42;
      b.hop += b.hopV * dt * 0.42;
      if (b.hop <= 0) {
        b.hop = 0; b.grounded = true; b.sinceLand = 0;
        const land = Math.min(2.6, Math.abs(b.hopV) * 1.7) * energy, wob = rand(-0.4, 0.4) * energy;
        if (this.opts.onImpulse) this.opts.onImpulse({ squash: land, lean: 0, shear: wob }, 'land');
        else { b.squashV += land; b.shearV += wob; }
        b.hopV = 0;
        if (this.opts.particles && v.bounce > 0.3) this.particles.burst({ kind: 'dust', n: 3 });
      }
    } else {
      b.sinceLand += dt;
      const interval = 1 / Math.max(0.4, v.bounceRate);
      if (v.bounce > 0.06 && !rm && !this.press && !this.touch?.held && b.sinceLand > interval * 0.6) {
        if (this.opts.onImpulse) this.opts.onImpulse({ squash: 0.5 * v.bounce, lean: 0, shear: 0 }, 'anticipate');
        else b.squash += 0.05 * v.bounce;    // anticipation
        b.hopV = Math.sqrt(2 * g * 0.42 * v.bounce * 0.12) * 1.05;
        b.grounded = false;
      }
    }
    // breathing
    this.breathPhase += dt * Math.PI * 2 * v.breathRate;
    // spiral rotation (Zuzu)
    const jitter = v.spinJitter * (Math.sin(this.time * 7.3) * 0.6 + Math.sin(this.time * 3.1) * 0.4);
    this.spinAngle += dt * (v.spin * 2.4 + jitter * 2.2) * (rm ? 0.35 : 1);
    // glitch bursts (Glitzi), at most a couple per second, never strobing
    if (this.id === 'glitzi') {
      b.glitchBurst = Math.max(0, b.glitchBurst - dt * 3);
      if (!rm && v.glitch > 0.8 && Math.random() < dt * (v.glitch - 0.7) * 1.4 && b.glitchBurst <= 0) {
        b.glitchBurst = 0.25 + Math.random() * 0.35;
        b.burstRows = Array.from({ length: 3 + (Math.random() * 3 | 0) }, () => [Math.random(), rand(-1, 1)]);
      }
    }
  }

  // ------------------------------------------------------------ render --
  _render() {
    this._renderSkin();
    const ctx = this.ctx;
    const { W, H, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const v = this.val, b = this.body, m = this.mallow;
    const rm = this.opts.reducedMotion;
    const [bx0, by0, bx1, by1] = m.bodyBox;
    const bodyW = (bx1 - bx0), bodyH = (by1 - by0);
    const shrink = 1 - clamp(v.shrink, 0, 1) * 0.12;
    const S = this.S * shrink;
    const floatY = (v.float * 0.07 + Math.sin(this.time * 0.9) * v.float * 0.012) * this.H * (rm ? 0.5 : 1);
    const hopY = b.hop * this.H;
    const lift = hopY + floatY;
    const trem = rm ? 0 : v.tremble * 1.6 * (Math.sin(this.time * 41) * 0.6 + Math.sin(this.time * 27.7) * 0.4);
    const breath = Math.sin(this.breathPhase) * 0.014 * v.breath * (rm ? 0.5 : 1);

    // contact shadow
    if (this.opts.shadow) {
      const sw = bodyW * S * 0.46 * (1 + b.squash * 0.35) * (1 - Math.min(0.5, lift / this.H * 2.2));
      const sa = 0.3 * (1 - Math.min(0.7, lift / this.H * 3));
      const g = ctx.createRadialGradient(this.CX, this.BASE, 0, this.CX, this.BASE, sw);
      g.addColorStop(0, `rgba(10,6,30,${sa})`);
      g.addColorStop(1, 'rgba(10,6,30,0)');
      ctx.save();
      ctx.translate(this.CX, this.BASE);
      ctx.scale(1, 0.22);
      ctx.translate(-this.CX, -this.BASE);
      ctx.fillStyle = g;
      ctx.fillRect(this.CX - sw, this.BASE - sw, sw * 2, sw * 2);
      ctx.restore();
    }
    // aura glow
    if (this.opts.aura && v.glow > 0.02) {
      const r = bodyW * S * 0.75;
      const cy = this.BASE - bodyH * S * 0.5 - lift;
      const g = ctx.createRadialGradient(this.CX, cy, r * 0.2, this.CX, cy, r);
      g.addColorStop(0, hexA(m.colours.glow, 0.32 * clamp(v.glow, 0, 1.5)));
      g.addColorStop(1, hexA(m.colours.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(this.CX - r, cy - r, r * 2, r * 2);
    }

    // strip warp
    ctx.save();
    ctx.translate(this.CX + trem, this.BASE - lift);
    const tiltRad = (b.tilt * Math.PI) / 180 + (b.spin > 0 ? spinCurve(1 - b.spin) * Math.PI * 2 : 0);
    if (tiltRad) {
      // rotate around the body's centre so it doesn't sweep sideways
      const cy = -bodyH * S * 0.5;
      ctx.translate(0, cy); ctx.rotate(tiltRad); ctx.translate(0, -cy);
    }
    const sq = b.squash;
    const sy = (1 - sq) * (1 + breath);
    const sxBase = (1 + sq * 0.62) * (1 - breath * 0.6);
    const droop = clamp(v.droop, 0, 1.2);
    const N = clamp(Math.round(bodyH * S / 5), 22, 72);
    const q = this.q;
    const srcTop = by0, srcH = bodyH;
    const cxs = (bx0 + bx1) / 2;
    const leanPx = b.lean * bodyH * S * 0.55 + b.shear * bodyH * S * 0.18;
    const cheekV = clamp(((m.face.cheeks?.L?.[1] || bodyH * 0.6) - srcTop) / srcH, 0, 1);
    const glitchOn = this.id === 'glitzi' && b.glitchBurst > 0;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (let i = 0; i < N; i++) {
      const v0 = i / N, v1 = (i + 1) / N;
      const vm = (v0 + v1) / 2;
      // width profile: squash bulges the middle, droop sags the bottom,
      // puffed cheeks swell around cheek height
      const bulge = sq * 0.32 * Math.sin(Math.PI * vm) + droop * 0.07 * vm * vm - droop * 0.03 * (1 - vm)
        + v.cheekPuff * 0.045 * Math.exp(-((vm - cheekV) ** 2) / 0.012);
      const sx = sxBase * (1 + bulge);
      const xo = leanPx * (1 - vm) * (1 - vm) + (glitchOn ? glitchShift(b, vm) * S * 7 : 0);
      const sy0 = srcTop + v0 * srcH, sh = srcH / N;
      // droop compresses the upper body a little more than the base
      const yScale = sy * (1 - droop * 0.06 * (1 - vm));
      const dy0 = -(srcTop + srcH - sy0) * S * yScale;
      const dh = sh * S * yScale + 0.9;
      const dw = this.mallow.size[0] * S * sx;
      ctx.drawImage(this.skin, 0, sy0 * q, this.skin.width, sh * q + 0.5,
        -cxs * S * sx + xo, dy0, dw, dh);
    }
    ctx.restore();

    if (this.opts.particles) this.particles.draw(ctx, { lift, S });
  }

  /** Redraw the skin if the face changed. Returns true when its pixels changed
   *  (skinVersion bumps; skinRect is the changed area in skin px). */
  renderSkin() { return this._renderSkin() === true; }

  /** The skin-px rectangle that holds everything the face animates (eyes,
   *  brows, mouth, tongue, cheeks, tears, sweat) — for dirty-rect uploads. */
  faceRect() {
    if (this._faceRect) return this._faceRect;
    this._faceRect = this._skinBox(faceRectSrc(this.mallow));
    return this._faceRect;
  }

  _skinBox([x0, y0, x1, y1]) {
    const q = this.q || 1, W = this.skin.width, H = this.skin.height;
    const x = clamp(Math.floor(x0 * q), 0, W), y = clamp(Math.floor(y0 * q), 0, H);
    return { x, y, w: clamp(Math.ceil(x1 * q) - x, 1, W - x), h: clamp(Math.ceil(y1 * q) - y, 1, H - y) };
  }

  // The face parts that changed since they were last drawn (each side's eye,
  // brow, cheek and tear, the mouth, the sweat drop), each as the skin rect
  // around where it was drawn last time and where it is drawn now — computed
  // from the live geometry, so a squinting eye dirties the eye, not the face.
  // this._dirtyRects lists them (overlaps are not merged: each is redrawn and
  // uploaded on its own); returns their bounding rect, or null. `covered`:
  // the approved art lies over the eyes, brows and mouth, so those wait.
  _dirtyFaceRect(P, covered = false) {
    if (!this._parts || this._partQ !== this.q) {
      this._partQ = this.q;
      this._parts = makeFaceParts(this.mallow);
      this._rectPool = this._parts.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
      this._dirtyRects = [];
      this._dirtyU = box();
      this._dirtyBox = { x: 0, y: 0, w: 0, h: 0 };
    }
    const parts = this._parts, out = this._dirtyRects, u = this._dirtyU;
    out.length = 0;
    u[0] = u[1] = Infinity; u[2] = u[3] = -Infinity;
    for (let i = 0; i < parts.length; i++) {
      const pt = parts[i];
      if (covered && pt.under) continue;
      const keys = pt.keys, sg = pt.sig;
      let changed = !pt.init;
      for (let j = 0; j < keys.length && !changed; j++) if (!(Math.abs(sg[j] - P[keys[j]]) < pt.tol[j])) changed = true;
      if (!changed && !partAnimated(pt, P, this)) continue;
      for (let j = 0; j < keys.length; j++) sg[j] = P[keys[j]];
      pt.init = true;
      partBounds(this, pt, P, pt.cur);
      const a = pt.prev, b = pt.cur;
      const x0 = Math.min(a[0], b[0]) - 2, y0 = Math.min(a[1], b[1]) - 2, x1 = Math.max(a[2], b[2]) + 2, y1 = Math.max(a[3], b[3]) + 2;
      pt.prev = b; pt.cur = a;
      if (!(x1 > x0 && y1 > y0)) continue;    // drawn neither then nor now
      const r = this._skinBoxInto([x0, y0, x1, y1], this._rectPool[out.length]);
      if (r.w <= 1 && r.h <= 1) continue;
      out.push(r);
      grow(u, x0, y0, x1, y1);
    }
    return out.length ? this._skinBoxInto(u, this._dirtyBox) : null;
  }

  _skinBoxInto([x0, y0, x1, y1], o) {
    const q = this.q || 1, W = this.skin.width, H = this.skin.height;
    const x = clamp(Math.floor(x0 * q), 0, W), y = clamp(Math.floor(y0 * q), 0, H);
    o.x = x; o.y = y; o.w = clamp(Math.ceil(x1 * q) - x, 1, W - x); o.h = clamp(Math.ceil(y1 * q) - y, 1, H - y);
    return o;
  }

  /** Glitzi's energised glitch lines for a shader (opts.shaderGlitch): per row
   *  [y, x0, len, alpha] in source px, plus out.thick and out.mode ('lit');
   *  null when calm. With {dim:true} a calm Glitzi returns its quieted rows
   *  instead (out.mode 'dim': dark bands over the approved lines). */
  glitchLines(out = new Float32Array(GLITCH_ROWS.length * 4), opts = {}) {
    const g = clamp(this.val.glitch, 0, 2);
    if (this.id !== 'glitzi') return null;
    if (g < 0.55) {
      const a = (0.55 - g) * 1.2;
      if (!opts.dim || a < 0.003) return null;
      for (let i = 0; i < GLITCH_ROWS.length; i++) { out[4 * i] = GLITCH_ROWS[i]; out[4 * i + 1] = 0; out[4 * i + 2] = this.mallow.size[0]; out[4 * i + 3] = a; }
      out.thick = 6; out.mode = 'dim';
      return out;
    }
    out.mode = 'lit';
    const W = this.mallow.size[0], k = (g - 0.55) / 1.45;
    for (let i = 0; i < GLITCH_ROWS.length; i++) {
      const ph = this.time * (0.6 + i * 0.13) + i * 1.7;
      out[4 * i] = GLITCH_ROWS[i];
      out[4 * i + 1] = (Math.sin(ph) * 0.5 + 0.5) * W * 0.4;
      out[4 * i + 2] = W * (0.35 + 0.5 * k);
      out[4 * i + 3] = (0.25 + 0.55 * k) * (0.65 + 0.35 * Math.sin(ph * 2.1));
    }
    out.thick = 3 + 2 * k;
    return out;
  }

  _renderSkin() {
    const v = this.val;
    const blinkAmt = this._blinkAmount();
    const shaderGlitch = this.id === 'glitzi' && !!this.opts.shaderGlitch;
    // MallowTouch tier A cross-fades the approved art in its shader: the skin
    // then holds only the live face (no per-blink, per-fade face uploads)
    const shaderRest = this.headless && !!this.opts.shaderRest;
    // rest state for the approved-art cross-fade
    const blinking = blinkAmt > 0.01 && v.eyeOpen > 0.05;
    // the shader lays the approved art over everything, so with it nothing
    // may be drawn on top at rest (extra blush, puff, tears, sweat)
    const bare = !shaderRest || (v.blush - (this.mallow.face.cheeks?.base ?? 1) <= 0.02 && v.blushLines <= 0.03 &&
      v.cheekPuff <= 0.05 && v.tears <= 0.02 && v.sweat <= 0.02);
    const atRest = !blinking && bare && this._deviation(v) < 0.03;
    const prevRest = this.restMix ?? 1;
    this.restMix = atRest ? Math.min(1, prevRest + (this._dt || 0.016) * 7) : 0;
    // fully at rest the approved art covers the eyes, brows and mouth: their
    // changes (a glance, Zuzu's spirals, Glitzi's lines) are invisible, so the
    // skin keeps still (and an idle Mallow uploads nothing) until it fades
    const covered = !this.skinDirty && this.restMix >= 0.999 && (shaderRest || (this._drawnRest ?? 0) >= 0.999);
    const waveAnim = v.mouthWave * this.mallow.face.mouth.w * 0.05 > 0.3;
    const animated = (!covered && (this.id === 'zuzu' || (this.id === 'glitzi' && !shaderGlitch) || v.sparkle > 1.02 ||
      v.heartEyes > 0.02 || v.mouthTremble > 0.01 || waveAnim)) || v.sweat > 0.02;
    // numeric signature of everything the face draws (no strings per frame)
    const S = this._sigVals || (this._sigVals = new Float64Array(FACE_SIG_KEYS.length + 2).fill(NaN));
    const nk = FACE_SIG_KEYS.length;
    let same = true;
    for (let i = 0; i < nk; i++) if (!(Math.abs(S[i] - v[FACE_SIG_KEYS[i]]) < 2.5e-4)) { same = false; break; }
    if (same && !(Math.abs(S[nk] - blinkAmt) < 1e-3)) same = false;
    if (same && !shaderRest && !(Math.abs(S[nk + 1] - this.restMix) < 5e-3)) same = false;
    if (!animated && !this.skinDirty && same) return false;
    for (let i = 0; i < nk; i++) S[i] = v[FACE_SIG_KEYS[i]];
    S[nk] = blinkAmt; S[nk + 1] = this.restMix;
    // headless (MallowTouch): only the face parts that changed are redrawn —
    // outside them the body and the approved art are the same pixels.
    // Glitzi's glitch lines span the body, so they force a full redraw
    // unless a shader draws them.
    const fullKey = this.q + (this.id === 'glitzi' && !shaderGlitch && !covered ? String(this.time) : '');
    const partial = this.headless && !this.skinDirty && this.skinVersion > 0 && fullKey === this._fullKey;
    this._fullKey = fullKey;
    this.skinDirty = false;
    const ctx = this.sctx;
    const q = this.q;
    const m = this.mallow;
    const A = this.assets;
    // one reused params object (the face renderers read P.blink as well)
    const P0 = this._P0 || (this._P0 = {});
    Object.assign(P0, v); P0.blink = blinkAmt;
    // a baked pristine fade touches everything the body art changed: the whole face
    const restMoved = !shaderRest && this.restMix !== this._lastRestMix;
    this._lastRestMix = this.restMix;
    let dirty = this.headless ? this._dirtyFaceRect(P0, covered && partial) : null;
    if (partial && restMoved) {
      // the whole face rect, plus anything that moved outside it
      const fr = this.faceRect(), list = this._dirtyRects;
      const o = this._faceRectSlot || (this._faceRectSlot = { x: 0, y: 0, w: 0, h: 0 });
      o.x = fr.x; o.y = fr.y; o.w = fr.w; o.h = fr.h;
      list.push(o);
      dirty = dirty ? unionRect(dirty, fr) : fr;
    }
    if (partial && !dirty) { this.skinRect = null; this.skinRects = null; return false; }
    if (!shaderRest) this._drawnRest = this.restMix;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (partial) {
      const rs = this._dirtyRects;
      ctx.beginPath();
      for (const r of rs) ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      for (const r of rs) ctx.clearRect(r.x, r.y, r.w, r.h);
      this.skinRect = dirty;
      this.skinRects = rs;
    } else {
      ctx.clearRect(0, 0, this.skin.width, this.skin.height);
      this.skinRect = { x: 0, y: 0, w: this.skin.width, h: this.skin.height, full: true };
      this.skinRects = null;
    }
    ctx.setTransform(q, 0, 0, q, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(A.body, 0, 0);

    const f = m.face;
    const P = P0;
    // Glitzi's energised/dimmed glitch lines sit on the body, under the eyes
    if (this.id === 'glitzi' && !shaderGlitch) drawGlitchLines(ctx, this, P);
    for (const side of ['L', 'R']) drawEye(ctx, this, f, side, P);
    for (const side of ['L', 'R']) drawBrow(ctx, f, side, P);
    drawMouth(ctx, f, P, this.time);

    // the untouched approved artwork, whenever the face is at rest. Gaze and
    // blinks don't count as "not at rest"; leaving rest is a hard cut and
    // returning only fades in once the face has converged, so the two faces
    // never overlap visibly.
    if (this.opts.pristine && this.restMix > 0.004 && !shaderRest) {
      ctx.globalAlpha = this.restMix;
      ctx.globalCompositeOperation = 'source-atop';   // keep the approved alpha, no edge build-up
      ctx.drawImage(A.original, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    drawCheeks(ctx, f, P, this.time);
    drawTearsAndSweat(ctx, this, f, P);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    this.skinVersion++;
    return true;
  }

  _faceSignature(blink) {
    let s = blink.toFixed(2);
    for (const k of FACE_SIG_KEYS) s += '|' + this.val[k].toFixed(3);
    return s;
  }

  _deviation(P) {
    const b = this.base;
    let d = 0;
    const W = { eyeOpen: 1, closedCurve: 0.25, lidTop: 1, lidBot: 1, lidSlant: 0.6, wink: 1,
      irisScale: 1, eyeScale: 1.2, heartEyes: 1, browAlpha: 0.8, browY: 0.5, browTilt: 0.5, browAsym: 0.5,
      mouthSmile: 0.6, mouthOpen: 0.7, mouthWidth: 1, mouthRound: 0.8, mouthWave: 0.8, mouthSkew: 0.6, mouthPout: 0.8,
      tongue: 1, cheekPuff: 0.5, wet: 0.5, tears: 0.5, sweat: 0.5, blushLines: 0.5 };
    for (const [k, w] of Object.entries(W)) d += Math.abs(P[k] - b[k]) * w;
    return d;
  }
}

// ---------------------------------------------------------- drawing --
/** Source-px boxes [x0, y0, x1, y1] around each animated face feature group:
 *  eyes, brows, mouth, cheeks, wet (tears + sweat). */
export function facePartsSrc(m) {
  const f = m.face;
  const parts = { eyes: box(), brows: box(), mouth: box(), cheeks: box(), wet: box() };
  for (const side of ['L', 'R']) {
    const e = f.eyes[side];
    const rx = e.rx || e.hw, ry = e.ry || e.hw * 0.7, lw = e.lw || 10;
    // open eyes stay inside their (scaled) ellipse; closed lids are a tube
    const hx = Math.max(rx * 1.45, (e.hw || 0) * 1.15) + lw, hy = ry * 1.5 + lw;
    grow(parts.eyes, e.x - hx, e.y - hy, e.x + hx, e.y + hy);
    const out = side === 'L' ? -1 : 1;
    const tx = e.x + out * (e.hw || rx) * 0.55;
    grow(parts.wet, tx - 12, e.y, tx + 12, e.y + (e.ry || e.sag) * 0.9 + (e.ry || 30) * 2.2 + 8);
    if (side === 'R') grow(parts.wet, e.x + rx * 1.15 - 18, e.y - ry * 1.2 - 18, e.x + rx * 1.15 + 18, e.y - ry * 1.2 + 36);
    const b = f.brows?.[side];
    if (b) {
      const lift = ry * 1.2 + b.lw;
      grow(parts.brows, Math.min(b.p0[0], b.p1[0]) - b.lw, Math.min(b.p0[1], b.p1[1], b.c[1]) - lift,
        Math.max(b.p0[0], b.p1[0]) + b.lw, Math.max(b.p0[1], b.p1[1], b.c[1]) + lift * 0.6);
    }
    const c = f.cheeks?.[side];
    if (c) grow(parts.cheeks, c[0] - c[2] * 1.55, c[1] - c[2] * 1.55, c[0] + c[2] * 1.55, c[1] + c[2] * 1.55);
  }
  const M = f.mouth;
  const depth = M.depth || M.w * 0.45;
  grow(parts.mouth, M.x - M.w * 0.78 - M.lw, M.y - M.w * 0.22 - M.lw, M.x + M.w * 0.78 + M.lw, M.y + (M.sag || 0) + depth * 1.6 + M.w * 0.28 + M.lw);
  const pad = 8;
  for (const k of Object.keys(parts)) {
    const r = parts[k];
    if (!(r[2] > r[0])) { delete parts[k]; continue; }
    r[0] = Math.max(0, r[0] - pad); r[1] = Math.max(0, r[1] - pad);
    r[2] = Math.min(m.size[0], r[2] + pad); r[3] = Math.min(m.size[1], r[3] + pad);
  }
  return parts;
}
/** The same boxes, finer: [[group, box], …] with each side's eye, brow and
 *  cheek on its own (for per-part dirty rects). */
export function facePartBoxesSrc(m) {
  const all = facePartsSrc(m), f = m.face, out = [];
  const clampBox = (r) => [Math.max(0, r[0]), Math.max(0, r[1]), Math.min(m.size[0], r[2]), Math.min(m.size[1], r[3])];
  for (const side of ['L', 'R']) {
    const e = f.eyes[side];
    const rx = e.rx || e.hw, ry = e.ry || e.hw * 0.7, lw = e.lw || 10;
    const hx = Math.max(rx * 1.45, (e.hw || 0) * 1.15) + lw, hy = ry * 1.5 + lw;
    out.push(['eyes', clampBox([e.x - hx - 8, e.y - hy - 8, e.x + hx + 8, e.y + hy + 8])]);
    const b = f.brows?.[side];
    if (b && all.brows) {
      const lift = ry * 1.2 + b.lw;
      out.push(['brows', clampBox([Math.min(b.p0[0], b.p1[0]) - b.lw - 8, Math.min(b.p0[1], b.p1[1], b.c[1]) - lift - 8,
        Math.max(b.p0[0], b.p1[0]) + b.lw + 8, Math.max(b.p0[1], b.p1[1], b.c[1]) + lift * 0.6 + 8])]);
    }
    const c = f.cheeks?.[side];
    if (c && all.cheeks) out.push(['cheeks', clampBox([c[0] - c[2] * 1.55 - 8, c[1] - c[2] * 1.55 - 8, c[0] + c[2] * 1.55 + 8, c[1] + c[2] * 1.55 + 8])]);
  }
  if (all.mouth) out.push(['mouth', all.mouth]);
  if (all.wet) out.push(['wet', all.wet]);
  return out;
}

function box() { return [Infinity, Infinity, -Infinity, -Infinity]; }
function grow(r, x0, y0, x1, y1) { r[0] = Math.min(r[0], x0); r[1] = Math.min(r[1], y0); r[2] = Math.max(r[2], x1); r[3] = Math.max(r[3], y1); }

/** Source-px box [x0, y0, x1, y1] around every animated face feature. */
export function faceRectSrc(m) {
  const r = box();
  for (const p of Object.values(facePartsSrc(m))) grow(r, ...p);
  return r;
}

// which face params each part draws (for per-part dirty rects)
const PART_KEYS = {
  eyes: ['eyeOpen', 'closedCurve', 'lidTop', 'lidBot', 'lidSlant', 'wink', 'lookX', 'lookY', 'irisScale', 'eyeScale', 'sparkle', 'heartEyes', 'wet', 'spiralHue'],
  brows: ['browAlpha', 'browY', 'browTilt', 'browCurve', 'browAsym'],
  mouth: ['mouthSmile', 'mouthOpen', 'mouthWidth', 'mouthRound', 'mouthWave', 'mouthSkew', 'mouthPout', 'tongue', 'mouthTremble'],
  cheeks: ['blush', 'blushLines', 'cheekPuff'],
  wet: ['tears', 'sweat'],
};

// every expression param the face skin draws (the skin's redraw signature)
const FACE_SIG_KEYS = [...new Set([...PART_KEYS.eyes, ...PART_KEYS.brows, ...PART_KEYS.mouth, ...PART_KEYS.cheeks, ...PART_KEYS.wet])];

// the face as separately redrawn parts: [{k, side, keys, tol, sig, prev, cur, under}]
// (`under`: drawn below the approved art's cross-fade)
function makeFaceParts(m) {
  const f = m.face, out = [];
  const mk = (k, side, keys, under) => out.push({ k, side, keys, under, init: false,
    tol: keys.map((key) => (key === 'blink' ? 1e-3 : 2.5e-4)), sig: new Float64Array(keys.length).fill(NaN),
    prev: box(), cur: box() });
  for (const side of ['L', 'R']) {
    mk('eye', side, ['blink', ...PART_KEYS.eyes], true);
    if (f.brows?.[side]) mk('brow', side, PART_KEYS.brows, true);
  }
  mk('mouth', null, PART_KEYS.mouth, true);
  if (f.cheeks) for (const side of ['L', 'R']) mk('cheek', side, PART_KEYS.cheeks, false);
  for (const side of ['L', 'R']) mk('tear', side, ['tears'], false);
  mk('sweat', null, ['sweat'], false);
  return out;
}

// does this part move with time even when its params hold still?
function partAnimated(pt, P, rig) {
  if (pt.k === 'eye') return rig.id === 'zuzu' || P.sparkle > 1.02 || P.heartEyes > 0.02 || P.spiralHue > 0.02;
  if (pt.k === 'mouth') return P.mouthTremble > 0.01 || P.mouthWave * rig.mallow.face.mouth.w * 0.05 > 0.3;
  if (pt.k === 'sweat') return P.sweat > 0.02;
  return false;
}

function hull(r, xs, ys, pad) {
  for (const x of xs) { if (x - pad < r[0]) r[0] = x - pad; if (x + pad > r[2]) r[2] = x + pad; }
  for (const y of ys) { if (y - pad < r[1]) r[1] = y - pad; if (y + pad > r[3]) r[3] = y + pad; }
}
// exact bounds of Bézier curves (not their control hulls), grown by pad
function cubicAxis(a0, a1, a2, a3, lohi) {
  let lo = Math.min(a0, a3), hi = Math.max(a0, a3);
  const A = -a0 + 3 * a1 - 3 * a2 + a3, B = 2 * (a0 - 2 * a1 + a2), C = a1 - a0;
  const at = (t) => { const u = 1 - t; return u * u * u * a0 + 3 * u * u * t * a1 + 3 * u * t * t * a2 + t * t * t * a3; };
  const test = (t) => { if (t > 0 && t < 1) { const v = at(t); if (v < lo) lo = v; if (v > hi) hi = v; } };
  if (Math.abs(A) < 1e-9) { if (Math.abs(B) > 1e-9) test(-C / B); } else {
    const d = B * B - 4 * A * C;
    if (d >= 0) { const q = Math.sqrt(d); test((-B + q) / (2 * A)); test((-B - q) / (2 * A)); }
  }
  lohi[0] = lo; lohi[1] = hi;
  return lohi;
}
const _ax = [0, 0], _ay = [0, 0];
function cubicBox(r, x0, y0, x1, y1, x2, y2, x3, y3, pad, dy = 0) {
  cubicAxis(x0, x1, x2, x3, _ax); cubicAxis(y0, y1, y2, y3, _ay);
  grow(r, _ax[0] - pad, _ay[0] + dy - pad, _ax[1] + pad, _ay[1] + dy + pad);
}
// a quadratic is the cubic with controls 2/3 of the way to its control point
function quadBox(r, x0, y0, cx, cy, x1, y1, pad) {
  cubicBox(r, x0, y0, x0 + (cx - x0) * 2 / 3, y0 + (cy - y0) * 2 / 3, x1 + (cx - x1) * 2 / 3, y1 + (cy - y1) * 2 / 3, x1, y1, pad);
}

/** Where one face part draws right now (source px) — the same geometry as
 *  its renderer, conservatively (curves by their control hulls, tubes by
 *  their shadow width). Empty (Infinity box) when it draws nothing. */
function partBounds(rig, pt, P, r) {
  r[0] = r[1] = Infinity; r[2] = r[3] = -Infinity;
  const f = rig.mallow.face, side = pt.side;
  if (pt.k === 'eye') {
    const spec = f.eyes[side], style = f.eyeStyle, lw = spec.lw;
    const g = eyeGeom(spec, side, P, style, rig.id);
    const upper = (pad, dy = 0) => cubicBox(r, g.xout, g.yout, g.up[0], g.up[1], g.up[2], g.up[3], g.xin, g.yin, pad, dy);
    if (g.o > 0.015) {
      // inside the lid region: the eyeball (sclera, iris, hearts, sparkle) or the spiral
      let cx0, cy0, cx1, cy1;
      if (style === 'spiral') {
        const img = rig.assets?.sprites?.[spec.sprite];
        const rr = ((img ? img.width / 2 : spec.spriteR || spec.rx) * P.eyeScale) + 1;
        cx0 = g.ex - rr; cx1 = g.ex + rr; cy0 = g.ey - rr; cy1 = g.ey + rr;
      } else {
        cx0 = g.ex - g.rx * 1.06; cx1 = g.ex + g.rx * 1.06; cy0 = g.ey - g.ry * 1.06; cy1 = g.ey + g.ry * 1.06;
        const ir = (spec.irisR || 0) * P.irisScale * P.eyeScale * 1.12;
        if (ir > 0) {
          const ix = g.ex + (spec.irisOff?.[0] || 0) * P.eyeScale + clamp(P.lookX, -1, 1) * (g.rx - ir / 1.12) * 0.85;
          const iy = g.ey + (spec.irisOff?.[1] || 0) * P.eyeScale + clamp(P.lookY, -1, 1) * (g.ry - ir / 1.12) * 0.8;
          cx0 = Math.min(cx0, ix - ir); cx1 = Math.max(cx1, ix + ir); cy0 = Math.min(cy0, iy - ir); cy1 = Math.max(cy1, iy + ir);
        }
      }
      // …clipped to the lid region
      const reg = [Infinity, Infinity, -Infinity, -Infinity];
      cubicBox(reg, g.xout, g.yout, g.up[0], g.up[1], g.up[2], g.up[3], g.xin, g.yin, 1);
      cubicBox(reg, g.xin, g.yin, g.lo[0], g.lo[1], g.lo[2], g.lo[3], g.xout, g.yout, 1);
      const bx0 = Math.max(cx0, reg[0]), by0 = Math.max(cy0, reg[1]), bx1 = Math.min(cx1, reg[2]), by1 = Math.min(cy1, reg[3]);
      if (bx1 > bx0 && by1 > by0) grow(r, bx0, by0, bx1, by1);
      if (style === 'glitzi') upper(2, -lw * 0.75);   // the neon lid rim
    }
    // the lid line (shut, or closing)
    if (1 - smoothstep(0.02, 0.3, g.o) > 0.01) upper(lw * 0.9 + 1);
    return r;
  }
  if (pt.k === 'brow') {
    const spec = f.brows?.[side];
    if (!spec || Math.max(spec.alpha, clamp(P.browAlpha, 0, 1)) < 0.02) return r;
    const eye = f.eyes[side], unit = (eye.ry || eye.hw * 0.7) * 0.42;
    const innerIsP1 = side === 'L' ? spec.p1[0] > spec.p0[0] : spec.p1[0] < spec.p0[0];
    const lift = -P.browY * unit - (side === 'L' ? P.browAsym : -P.browAsym * 0.35) * unit * 0.9;
    const tiltIn = -P.browTilt * unit * 1.55, tiltOut = P.browTilt * unit * 0.45;
    const y0 = spec.p0[1] + lift + (innerIsP1 ? tiltOut : tiltIn), y1 = spec.p1[1] + lift + (innerIsP1 ? tiltIn : tiltOut);
    const mid = (spec.p0[1] + spec.p1[1]) / 2;
    const bend = 1 + P.browCurve * 0.6 + Math.min(0, P.browTilt) * 0.5;
    const cy = mid + lift + (spec.c[1] - mid) * bend + (tiltIn + tiltOut) * 0.5;
    quadBox(r, spec.p0[0], y0, spec.c[0], cy, spec.p1[0], y1, spec.lw * 0.9 + 1);
    return r;
  }
  if (pt.k === 'mouth') {
    const M = f.mouth;
    const sm = clamp(P.mouthSmile, -1.2, 1.2), o = clamp(P.mouthOpen, 0, 1.4), rd = clamp(P.mouthRound, 0, 1), pout = clamp(P.mouthPout, 0, 1);
    const W = M.w * clamp(P.mouthWidth, 0.3, 1.5) * (1 - 0.5 * rd) * (1 - 0.45 * pout);
    const oc = clamp(o, 0, 1), depth = M.depth || M.w * 0.45;
    const sagS = (M.sag === 0 ? M.w * 0.18 * (1 - oc) : (M.sag ?? M.w * 0.2)) * sm * (1 - 0.6 * rd);
    const trem = Math.abs(P.mouthTremble) * 3.2;
    const skewY = P.mouthSkew * M.w * 0.1, sx = P.mouthSkew * M.w * 0.04;
    const x0 = M.x - W / 2 + sx, x1 = M.x + W / 2 + sx;
    const upperOpen = (M.upper ?? -M.w * 0.08) * (0.4 + 0.6 * Math.max(0, sm));
    let U = lerp(sagS, upperOpen, oc) - rd * o * depth * 0.28;
    const Lo = sagS + o * depth * (1 + 0.15 * rd) * (sm < -0.2 ? 0.7 : 1);
    if (sm < 0 && oc > 0.05) U = Math.min(U, Lo - trem - 2);
    const k = 4 / 3, cy = M.y, wave = P.mouthWave * M.w * 0.05;
    const lw = M.style === 'open' ? Math.max(M.lw, 8) : M.lw;
    const yL = cy + skewY, yR = cy - skewY, pad = lw * 1.25 + wave + 2;
    const ux0 = x0 + W * 0.22, ux1 = x1 - W * 0.22;
    cubicBox(r, x0, yL, ux0, cy + U * k, ux1, cy + U * k, x1, yR, pad);
    for (const L of [Lo - trem, Lo + trem]) cubicBox(r, x1, yR, ux1, cy + L * k, ux0, cy + L * k, x0, yL, pad);
    if (pout > 0.05) grow(r, M.x - W * 0.32 - 1, cy + Math.max(Lo + trem, 0) + M.lw * 0.5, M.x + W * 0.32 + 1, cy + Math.max(Lo + trem, 0) + M.lw * 1.3);
    if (P.tongue > 0.03) {
      const t = clamp(P.tongue, 0, 1), tx = M.x + P.mouthSkew * M.w * 0.08, ty = cy + Math.max(Lo + trem, U) + M.lw * 0.3;
      grow(r, tx - M.w * 0.17 - 2, ty - 2, tx + M.w * 0.17 + 2, ty + M.w * 0.2 * t * 1.25 + 2);
    }
    return r;
  }
  if (pt.k === 'cheek') {
    const ch = f.cheeks, [x, y, cr] = ch[side];
    const extra = P.blush - (ch.base ?? 1);
    if (extra > 0.02) { const rr = cr * (1.05 + 0.2 * clamp(extra, 0, 1.5) + P.cheekPuff * 0.15) + 1; grow(r, x - rr, y - rr, x + rr, y + rr); }
    if (P.blushLines > 0.03) grow(r, x - cr * 0.54 - 3, y - cr * 0.22 - 3, x + cr * 0.54 + 3, y + cr * 0.22 + 3);
    if (P.cheekPuff > 0.05) { const a = cr * 0.75 + 3; grow(r, x - a, y + cr * 0.1 - a, x + a, y + cr * 0.1 + a); }
    return r;
  }
  if (pt.k === 'tear') {
    if (!(P.tears > 0.02)) return r;
    const e = f.eyes[side], out = side === 'L' ? -1 : 1;
    const x = e.x + out * (e.hw || e.rx) * 0.55, y = e.y + (e.ry || e.sag) * 0.9, len = (e.ry || 30) * 2.2 * clamp(P.tears, 0, 1);
    hull(r, [x, x + out * 6], [y, y + len], 4);
    return r;
  }
  if (pt.k === 'sweat') {
    if (!(P.sweat > 0.02)) return r;
    const e = f.eyes.R, sz = 10 + 6 * clamp(P.sweat, 0, 1);
    const x = e.x + (e.rx || e.hw) * 1.15, y = e.y - (e.ry || e.hw * 0.6) * 1.2;
    grow(r, x - sz * 0.7 - 1, y - sz - 1, x + sz * 0.7 + 1, y + 18 + sz + 1);   // the whole slide
    return r;
  }
  return r;
}

function unionRect(a, b) {
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  return { x: x0, y: y0, w: Math.max(a.x + a.w, b.x + b.w) - x0, h: Math.max(a.y + a.h, b.y + b.h) - y0 };
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1).toFixed(3)})`;
}

function spinCurve(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function glitchShift(b, v) {
  for (const [row, dir] of b.burstRows) if (Math.abs(v - row) < 0.035) return dir * b.glitchBurst * 4;
  return 0;
}

// glossy tube stroke in the approved line style
function tube(ctx, path, w, ink, hi, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,25,0.22)';
  ctx.lineWidth = w * 1.45;
  ctx.translate(0, w * 0.14);
  path(); ctx.stroke();
  ctx.translate(0, -w * 0.14);
  ctx.strokeStyle = ink;
  ctx.lineWidth = w;
  path(); ctx.stroke();
  if (hi) {
    ctx.strokeStyle = hi;
    ctx.lineWidth = w * (hi.startsWith('rgba(80,225') ? 0.38 : 0.3);
    ctx.translate(0, -w * 0.17);
    path(); ctx.stroke();
  }
  ctx.restore();
}

function eyeGeom(spec, side, P, style, rigId) {
  const inner = side === 'L' ? 1 : -1;
  const es = P.eyeScale;
  const rx = spec.rx * es, ry = spec.ry * es;
  const ex = spec.x;
  const ey = style === 'closed' ? spec.y + spec.sag * 0.42 : spec.y;
  const winkClose = side === 'R' ? clamp(P.wink, 0, 1) : 0;
  const o = clamp(P.eyeOpen * (1 - winkClose) * (1 - P.blink), 0, 1.45);
  const oc = Math.min(1, o);
  const curve = lerp(P.closedCurve, -1, winkClose);
  const yC = style === 'closed' ? spec.y : ey + ry * 0.12;
  const sagC = spec.sag * curve;
  const tilt = (spec.tilt || 0) * (1 - oc);
  const hw = lerp(spec.hw * (style === 'closed' ? 1 : Math.min(1.1, es)), rx * 1.3, oc);
  const slant = P.lidSlant * ry * 0.3 * oc;
  const xin = ex + inner * hw, xout = ex - inner * hw;
  const yCorner = lerp(yC, ey, oc);
  const yin = yCorner + tilt + slant, yout = yCorner - tilt - slant * 0.6;
  const oTop = clamp(o * (1 - P.lidTop), 0, 1.45);
  const oBot = clamp(o * (1 - P.lidBot), 0, 1.45);
  const qUp = lerp(yC + 2 * sagC, ey - ry * 2.35, oTop);
  const qLo = lerp(yC + 2 * sagC, ey + ry * 2.35, oBot);
  // cubic controls equivalent to the quadratic, with slant on the upper lid
  const c = (x0, y0, x1, y1, qy, sl) => {
    const qx = (x0 + x1) / 2;
    return [x0 + (qx - x0) * 2 / 3, y0 + (qy - y0) * 2 / 3 + sl * (x0 === xin ? 1 : -0.5),
      x1 + (qx - x1) * 2 / 3, y1 + (qy - y1) * 2 / 3 + sl * (x1 === xin ? 1 : -0.5)];
  };
  const up = c(xout, yout, xin, yin, qUp, P.lidSlant * ry * 0.55 * oc);
  const lo = c(xin, yin, xout, yout, qLo, 0);
  return { ex, ey, rx, ry, o, oc, xin, xout, yin, yout, up, lo, inner };
}

function drawEye(ctx, rig, f, side, P) {
  const spec = f.eyes[side];
  const style = f.eyeStyle;
  const g = eyeGeom(spec, side, P, style, rig.id);
  const ink = f.line;
  const upperPath = () => {
    ctx.beginPath();
    ctx.moveTo(g.xout, g.yout);
    ctx.bezierCurveTo(g.up[0], g.up[1], g.up[2], g.up[3], g.xin, g.yin);
  };
  const regionPath = () => {
    ctx.beginPath();
    ctx.moveTo(g.xout, g.yout);
    ctx.bezierCurveTo(g.up[0], g.up[1], g.up[2], g.up[3], g.xin, g.yin);
    ctx.bezierCurveTo(g.lo[0], g.lo[1], g.lo[2], g.lo[3], g.xout, g.yout);
    ctx.closePath();
  };
  const A = rig.assets.sprites;
  if (g.o > 0.015) {
    ctx.save();
    regionPath();
    ctx.clip();
    if (style === 'spiral') {
      const img = A[spec.sprite];
      const r = (img.width / 2) * P.eyeScale;
      ctx.save();
      ctx.translate(g.ex, g.ey);
      ctx.rotate(rig.spinAngle * (side === 'L' ? 1 : -1));
      ctx.drawImage(img, -r, -r, r * 2, r * 2);
      if (P.spiralHue > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.32 * clamp(P.spiralHue, 0, 1);
        const cg = ctx.createConicGradient ? ctx.createConicGradient(rig.time * 1.7, 0, 0) : null;
        if (cg) {
          ['#ff3df2', '#ffe14d', '#3dffb8', '#3d8bff', '#ff3df2'].forEach((col, i) => cg.addColorStop(i / 4, col));
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    } else {
      // sclera
      const sg = ctx.createRadialGradient(g.ex - g.rx * 0.25, g.ey - g.ry * 0.3, g.rx * 0.1, g.ex, g.ey, g.rx * 1.05);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(0.62, style === 'glitzi' ? '#efe9f6' : '#fbf5fa');
      sg.addColorStop(1, style === 'glitzi' ? '#b9add8' : '#e6d6e8');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(g.ex, g.ey, g.rx, g.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // iris
      const img = A[spec.iris];
      if (img) {
        const rc = img.width / 2 - 2;
        const ir = spec.irisR * P.irisScale * P.eyeScale;
        const lx = clamp(P.lookX, -1, 1), ly = clamp(P.lookY, -1, 1);
        const ix = g.ex + spec.irisOff[0] * P.eyeScale + lx * (g.rx - ir) * 0.85;
        const iy = g.ey + spec.irisOff[1] * P.eyeScale + ly * (g.ry - ir) * 0.8;
        const s = ir / rc;
        ctx.drawImage(img, ix - (img.width / 2) * s, iy - (img.height / 2) * s, img.width * s, img.height * s);
        // extra sparkle for joy / awe, twinkling
        if (P.sparkle > 1.02) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const a = clamp(P.sparkle - 1, 0, 1);
          const tw = 0.6 + 0.4 * Math.sin(rig.time * 5 + (side === 'L' ? 0 : 2));
          drawStar(ctx, ix - ir * 0.38, iy - ir * 0.34, ir * 0.34 * tw, `rgba(255,255,255,${0.85 * a})`);
          drawStar(ctx, ix + ir * 0.35, iy + ir * 0.3, ir * 0.18 * (1.4 - tw), `rgba(255,240,200,${0.7 * a})`);
          ctx.restore();
        }
        if (P.heartEyes > 0.02) {
          ctx.save();
          ctx.globalAlpha = clamp(P.heartEyes, 0, 1);
          const pulse = 1 + 0.06 * Math.sin(rig.time * 6);
          drawHeart(ctx, ix, iy + ir * 0.05, ir * 0.95 * pulse, '#ff4f9a', '#ffd0e6');
          ctx.restore();
        }
      }
      // wet, glossy lower eye
      if (P.wet > 0.02) {
        ctx.save();
        ctx.globalAlpha = clamp(P.wet, 0, 1) * 0.75;
        const wg = ctx.createLinearGradient(0, g.ey + g.ry * 0.2, 0, g.ey + g.ry);
        wg.addColorStop(0, 'rgba(160,220,255,0)');
        wg.addColorStop(1, 'rgba(170,225,255,0.9)');
        ctx.fillStyle = wg;
        ctx.fillRect(g.ex - g.rx, g.ey, g.rx * 2, g.ry);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = Math.max(1.5, g.ry * 0.06);
        ctx.beginPath();
        ctx.ellipse(g.ex, g.ey + g.ry * 0.05, g.rx * 0.72, g.ry * 0.7, 0, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
        ctx.restore();
      }
      // soft rim so the eye sits in the body
      ctx.strokeStyle = hexA(f.line, 0.35);
      ctx.lineWidth = g.rx * 0.07;
      ctx.beginPath();
      ctx.ellipse(g.ex, g.ey, g.rx * 0.985, g.ry * 0.985, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // lid occlusion shadow under the upper lid (on the eyeball only)
    ctx.beginPath();
    ctx.ellipse(g.ex, g.ey, g.rx, g.ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineCap = 'round';
    for (const [w, a] of [[g.ry * 0.55, 0.08], [g.ry * 0.32, 0.1], [g.ry * 0.14, 0.14]]) {
      ctx.strokeStyle = hexA(f.line, a);
      ctx.lineWidth = w;
      upperPath(); ctx.stroke();
    }
    ctx.restore();
  }
  // lid line: full closed line when shut, clipped lid edge when open
  const closedA = 1 - smoothstep(0.02, 0.3, g.o);
  const lw = spec.lw;
  if (closedA > 0.01) tube(ctx, upperPath, lw, f.line, f.lineHi, closedA);
  if (g.o > 0.015) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(g.ex, g.ey, g.rx * 1.06, g.ry * 1.06, 0, 0, Math.PI * 2);
    ctx.clip();
    const lashW = style === 'glitzi' ? lw * 1.1 : style === 'closed' ? lw * 0.62 : lw * 0.45;
    tube(ctx, upperPath, lashW, f.line, null, 1 - closedA);
    ctx.restore();
    if (style === 'glitzi') {
      // heavy lid rim catching neon light
      ctx.save();
      ctx.strokeStyle = 'rgba(120,200,255,0.25)';
      ctx.lineWidth = 2;
      ctx.translate(0, -lw * 0.75);
      upperPath(); ctx.stroke();
      ctx.restore();
    }
  }
}

function drawBrow(ctx, f, side, P) {
  const spec = f.brows?.[side];
  if (!spec) return;
  const alpha = Math.max(spec.alpha, clamp(P.browAlpha, 0, 1));
  if (alpha < 0.02) return;
  const eye = f.eyes[side];
  const unit = (eye.ry || eye.hw * 0.7) * 0.42;
  const innerIsP1 = side === 'L' ? spec.p1[0] > spec.p0[0] : spec.p1[0] < spec.p0[0];
  const lift = -P.browY * unit - (side === 'L' ? P.browAsym : -P.browAsym * 0.35) * unit * 0.9;
  const tiltIn = -P.browTilt * unit * 1.55, tiltOut = P.browTilt * unit * 0.45;
  const p0 = [spec.p0[0], spec.p0[1] + lift + (innerIsP1 ? tiltOut : tiltIn)];
  const p1 = [spec.p1[0], spec.p1[1] + lift + (innerIsP1 ? tiltIn : tiltOut)];
  const mid = [(spec.p0[0] + spec.p1[0]) / 2, (spec.p0[1] + spec.p1[1]) / 2];
  const bend = 1 + P.browCurve * 0.6 + Math.min(0, P.browTilt) * 0.5;
  const c = [spec.c[0], mid[1] + lift + (spec.c[1] - mid[1]) * bend + (tiltIn + tiltOut) * 0.5];
  tube(ctx, () => { ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(c[0], c[1], p1[0], p1[1]); },
    spec.lw, spec.ink || f.line, spec.hi || f.lineHi, alpha);
}

function drawMouth(ctx, f, P, time) {
  const M = f.mouth;
  const s = clamp(P.mouthSmile, -1.2, 1.2);
  const o = clamp(P.mouthOpen, 0, 1.4);
  const r = clamp(P.mouthRound, 0, 1);
  const pout = clamp(P.mouthPout, 0, 1);
  const W = M.w * clamp(P.mouthWidth, 0.3, 1.5) * (1 - 0.5 * r) * (1 - 0.45 * pout);
  const oc0 = clamp(o, 0, 1);
  const sagBase = M.sag ?? M.w * 0.2;
  const sagS = (M.sag === 0 ? M.w * 0.18 * (1 - oc0) : sagBase) * s * (1 - 0.6 * r);
  const tremble = P.mouthTremble * 1.6 * Math.sin(time * 31) * (1 + Math.sin(time * 7));
  const skewY = P.mouthSkew * M.w * 0.1;
  const x0 = M.x - W / 2 + P.mouthSkew * M.w * 0.04, x1 = M.x + W / 2 + P.mouthSkew * M.w * 0.04;
  const yL = M.y + skewY, yR = M.y - skewY;
  const upperOpen = (M.upper ?? -M.w * 0.08) * (0.4 + 0.6 * Math.max(0, s));
  const oc = clamp(o, 0, 1);
  let U = lerp(sagS, upperOpen, oc) - r * o * (M.depth || M.w * 0.45) * 0.28;
  let Lo = sagS + o * (M.depth || M.w * 0.45) * (1 + 0.15 * r) * (s < -0.2 ? 0.7 : 1) + tremble;
  if (s < 0 && oc > 0.05) U = Math.min(U, Lo - 2);
  const cy = M.y;
  const k = 4 / 3;
  const upper = [x0 + W * 0.22, cy + U * k, x1 - W * 0.22, cy + U * k];
  const lower = [x1 - W * 0.22, cy + Lo * k, x0 + W * 0.22, cy + Lo * k];
  const open = Lo - U > 2.2;
  const waveAmp = P.mouthWave * M.w * 0.05;
  const linePath = () => {
    ctx.beginPath();
    if (waveAmp > 0.3) {
      const n = 18;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = bez(x0, upper[0], upper[2], x1, t);
        const y = bez(yL, upper[1], upper[3], yR, t) + Math.sin(t * Math.PI * 3 + time * 2) * waveAmp * Math.sin(Math.PI * t);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    } else {
      ctx.moveTo(x0, yL);
      ctx.bezierCurveTo(upper[0], upper[1], upper[2], upper[3], x1, yR);
    }
  };
  const region = () => {
    ctx.beginPath();
    ctx.moveTo(x0, yL);
    ctx.bezierCurveTo(upper[0], upper[1], upper[2], upper[3], x1, yR);
    ctx.bezierCurveTo(lower[0], lower[1], lower[2], lower[3], x0, yL);
    ctx.closePath();
  };
  if (M.style === 'crease' && !open) {
    // carved frown (Glitzi): shadow groove with a lit ridge above
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(120,170,255,0.22)';
    ctx.lineWidth = M.lw * 0.6;
    ctx.translate(0, -M.lw * 0.8);
    linePath(); ctx.stroke();
    ctx.restore();
    tube(ctx, linePath, M.lw, '#05061c', null, 1);
  } else if (open) {
    ctx.save();
    region();
    const ig = ctx.createLinearGradient(0, cy + U, 0, cy + Lo);
    ig.addColorStop(0, shade(M.inside, -0.35));
    ig.addColorStop(1, M.inside);
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.clip();
    // tongue
    const tw = W * 0.34, th = Math.max(4, (Lo - U) * 0.42);
    const tg = ctx.createRadialGradient(M.x, cy + Lo * 0.95, 1, M.x, cy + Lo * 0.95, tw * 1.2);
    tg.addColorStop(0, shade(M.tongue, 0.18));
    tg.addColorStop(1, M.tongue);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(M.x, cy + Lo * 0.98, tw, th, 0, 0, Math.PI * 2);
    ctx.fill();
    // upper inner shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(M.x, cy + U, W * 0.5, Math.max(2, (Lo - U) * 0.18), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = M.style === 'line' || M.style === 'crease' ? f.line : shade(M.inside, -0.3);
    ctx.lineWidth = Math.max(2, M.lw * 0.45);
    region(); ctx.stroke();
    // lit lower lip (only on a properly open mouth): a sheen that follows the
    // lower lip's own curve and fades out toward the corners
    if (Lo - U > 10) {
      const lg = ctx.createLinearGradient(x0, 0, x1, 0);
      lg.addColorStop(0.2, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.22)');
      lg.addColorStop(0.8, 'rgba(255,255,255,0)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = Math.max(1.5, M.lw * 0.25);
      ctx.translate(0, M.lw * 0.45);
      ctx.beginPath();
      ctx.moveTo(x1, yR);
      ctx.bezierCurveTo(lower[0], lower[1], lower[2], lower[3], x0, yL);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    const lw = M.style === 'open' ? Math.max(M.lw, 8) : M.lw;
    tube(ctx, linePath, lw * (1 - 0.25 * pout), M.style === 'open' ? shade(M.inside, -0.15) : f.line, f.lineHi, 1);
  }
  // pout: a soft pushed-out lip highlight
  if (pout > 0.05) {
    ctx.save();
    ctx.globalAlpha = pout * 0.7;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(M.x, cy + Math.max(Lo, 0) + M.lw * 0.9, W * 0.32, M.lw * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // tongue out (playful / "bleh")
  if (P.tongue > 0.03) {
    const t = clamp(P.tongue, 0, 1);
    const tx = M.x + P.mouthSkew * M.w * 0.08;
    const ty = cy + Math.max(Lo, U) + M.lw * 0.3;
    ctx.save();
    const tw = M.w * 0.17, th = M.w * 0.2 * t;
    const g = ctx.createLinearGradient(0, ty, 0, ty + th);
    g.addColorStop(0, shade(M.tongue, -0.1));
    g.addColorStop(1, shade(M.tongue, 0.15));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tx - tw, ty);
    ctx.bezierCurveTo(tx - tw, ty + th * 1.25, tx + tw, ty + th * 1.25, tx + tw, ty);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(M.tongue, -0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx, ty + 1); ctx.lineTo(tx, ty + th * 0.6); ctx.stroke();
    ctx.restore();
  }
}

function drawCheeks(ctx, f, P, time) {
  const ch = f.cheeks;
  if (!ch) return;
  const extra = P.blush - (ch.base ?? 1);
  if (extra > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const side of ['L', 'R']) {
      const [x, y, r] = ch[side];
      const rr = r * (1.05 + 0.2 * clamp(extra, 0, 1.5) + P.cheekPuff * 0.15);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, hexA(ch.colour, 0.55 * clamp(extra, 0, 1.4)));
      g.addColorStop(0.55, hexA(ch.colour, 0.28 * clamp(extra, 0, 1.4)));
      g.addColorStop(1, hexA(ch.colour, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (P.blushLines > 0.03) {
    ctx.save();
    ctx.strokeStyle = hexA(ch.colour === '#ff3df2' ? '#ff3df2' : '#e0306a', 0.75 * clamp(P.blushLines, 0, 1));
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const side of ['L', 'R']) {
      const [x, y, r] = ch[side];
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * r * 0.42 - r * 0.12, y + r * 0.22);
        ctx.lineTo(x + i * r * 0.42 + r * 0.12, y - r * 0.22);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  if (P.cheekPuff > 0.05) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.28 * clamp(P.cheekPuff, 0, 1)})`;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const side of ['L', 'R']) {
      const [x, y, r] = ch[side];
      ctx.beginPath();
      ctx.arc(x, y + r * 0.1, r * 0.75, Math.PI * 1.15, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTearsAndSweat(ctx, rig, f, P) {
  if (P.tears > 0.02) {
    const t = clamp(P.tears, 0, 1);
    for (const side of ['L', 'R']) {
      const e = f.eyes[side];
      const out = side === 'L' ? -1 : 1;
      const x = e.x + out * (e.hw || e.rx) * 0.55;
      const y = e.y + (e.ry || e.sag) * 0.9;
      const len = (e.ry || 30) * 2.2 * t;
      ctx.save();
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, `rgba(190,235,255,${0.85 * t})`);
      g.addColorStop(1, 'rgba(190,235,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + out * 6, y + len * 0.5, x + out * 2, y + len);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * t})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  if (P.sweat > 0.02) {
    const e = f.eyes.R;
    const s = clamp(P.sweat, 0, 1);
    const slide = (rig.time * 0.35) % 1;
    const x = e.x + (e.rx || e.hw) * 1.15, y = e.y - (e.ry || e.hw * 0.6) * 1.2 + slide * 18;
    ctx.save();
    ctx.globalAlpha = s * (1 - slide * 0.6);
    drawDrop(ctx, x, y, 10 + 6 * s);
    ctx.restore();
  }
}

function drawGlitchLines(ctx, rig, P) {
  const g = clamp(P.glitch, 0, 2);
  const W = rig.mallow.size[0];
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  if (g < 0.55) {
    // calm / sad Glitzi: its static quiets down
    ctx.globalAlpha = (0.55 - g) * 1.2;
    ctx.fillStyle = '#1b1452';
    for (const y of GLITCH_ROWS) ctx.fillRect(0, y - 3, W, 6);
  } else {
    // energised: lines brighten, drift and stretch, never strobing
    const k = (g - 0.55) / 1.45;
    for (let i = 0; i < GLITCH_ROWS.length; i++) {
      const y = GLITCH_ROWS[i];
      const ph = rig.time * (0.6 + i * 0.13) + i * 1.7;
      const a = (0.25 + 0.55 * k) * (0.65 + 0.35 * Math.sin(ph * 2.1));
      const x0 = (Math.sin(ph) * 0.5 + 0.5) * W * 0.4;
      const len = W * (0.35 + 0.5 * k);
      const lg = ctx.createLinearGradient(x0, 0, x0 + len, 0);
      lg.addColorStop(0, 'rgba(62,232,255,0)');
      lg.addColorStop(0.3, `rgba(62,232,255,${a})`);
      lg.addColorStop(0.55, `rgba(255,255,255,${a})`);
      lg.addColorStop(0.8, `rgba(255,61,242,${a})`);
      lg.addColorStop(1, 'rgba(255,61,242,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x0, y - 1.5 - k, len, 3 + 2 * k);
    }
  }
  ctx.restore();
}

function bez(a, b, c, d, t) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

function shade(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  r = f(r); g = f(g); b = f(b);
  return `rgb(${r},${g},${b})`;
}

export { PRESETS, STAGES };
