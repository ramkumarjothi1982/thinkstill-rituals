// MallowTouch: a living Mallow you can squeeze.
//
// SoftMallow keeps everything the existing rig does (the approved artwork,
// the animated face, blinks, expressions, personality reactions, particles,
// voices) and replaces two things:
//   * the body is a soft lattice (softbody.js) drawn with the face-animated
//     skin as its texture (mesh-renderer.js), so fingers dent, pull, stretch
//     and wobble the actual character, face included;
//   * touch is read by gestures.js: hold to squeeze deeper, drag to pull,
//     two fingers to stretch or squish, flick, jiggle, massage in circles,
//     stroke to calm. The face responds continuously while you touch.
//
// Input is routed in from outside (scene touch router) through hit() and
// pointerDown/Move/Up so several touchable things can share one screen.
// bindSelf: true makes it listen on its own canvas instead.

import { MallowRig } from '../../mallows/rig.js';
import { REACTIONS } from '../../mallows/reactions.js';
import { SoftBody } from './softbody.js';
import { createGestureReader } from './gestures.js';
import { createMeshRenderer } from './mesh-renderer.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

// How each Mallow's face answers touch. Values are targets blended in by the
// strength of each touch state (calm from strokes/massage, giggle from
// jiggles, stretch from pulls). Unlisted keys fall back to SHARED.
const SHARED = {
  calm: { eyeOpen: 0.05, closedCurve: -0.9, mouthSmile: 0.9, mouthOpen: 0.05, blush: 1.9, glow: 0.5, breathRate: 0.16, browY: 0.15 },
  giggle: { eyeOpen: 0.15, closedCurve: -1, mouthSmile: 1.1, mouthOpen: 0.75, blush: 2, cheekPuff: 0.4 },
  stretch: { eyeOpen: 1.3, eyeScale: 1.12, mouthRound: 0.9, mouthOpen: 0.7, browY: 0.9, browAlpha: 0.6 },
  squish: { eyeOpen: 0, closedCurve: -1, mouthRound: 0.6, mouthOpen: 0.4, cheekPuff: 1, blush: 2.2 },
};
const FACES = {
  glitzi: {
    calm: { lidTop: 0.62, lidSlant: -0.1, mouthSmile: 0.15, mouthSkew: 0.5, glitch: 0.2, glow: 0.4, lookX: 0.2, lookY: 0 },
    giggle: { lidTop: 0.2, mouthSmile: 0.7, mouthSkew: 0.6, mouthOpen: 0.4, glitch: 1.6 },
    stretch: { lidTop: 0, eyeOpen: 1.25, mouthRound: 0.8, mouthOpen: 0.6, glitch: 1.9, lookX: 0, lookY: 0 },
    squish: { lidTop: 0.7, lidSlant: 0.5, mouthSmile: -0.4, mouthWave: 0.7, glitch: 1.8, cheekPuff: 0.8 },
  },
  zuzu: { calm: { spin: 0.08, spiralHue: 0.6, mouthSmile: 0.9 }, giggle: { spin: 1.6, spiralHue: 1 } },
  pipzi: { giggle: { sparkle: 2, eyeOpen: 1.1, closedCurve: 0 } },
  boppo: { calm: { mouthSmile: 1, blush: 2 } },
};

function faceFor(id, state) { return { ...SHARED[state], ...(FACES[id]?.[state] || {}) }; }

// signature particle for a satisfying release
const RELEASE_FX = { glitzi: 'shard', blubi: 'drop', zuzu: 'ring', boppo: 'pop', pipzi: 'spark', loomi: 'ribbon', noomi: 'moon' };
const CARE_FX = { glitzi: 'pixelHeart', noomi: 'moon', loomi: 'ribbon' };

export class SoftMallow extends MallowRig {
  constructor(container, opts = {}) {
    super(container, { ...opts, interactive: false, fit: opts.fit ?? 0.62 });
    this.touchOpts = { bindSelf: false, ...opts };
    const m = this.mallow;
    const [bx0, by0, bx1, by1] = m.bodyBox;
    this.bodyW = bx1 - bx0; this.bodyH = by1 - by0;
    this.cxs = (bx0 + bx1) / 2; this.by1 = by1;
    this.soft = new SoftBody({ width: this.bodyW + 4, height: this.bodyH + 3, cols: 11, rows: 11 });
    this.soft.reduced = this.opts.reducedMotion;
    this.gest = createGestureReader({ bodyWidth: 240 });
    this.touch = { depth: 0, pull: 0, calm: 0, giggle: 0, stretch: 0, squish: 0, squeezed: new Set(), lastAny: 0 };
    this.fingerScreen = new Map();
    // the face-animated skin goes on a WebGL mesh under the 2D overlay canvas
    this.gl = document.createElement('canvas');
    this.gl.className = 'mallow-mesh';
    this.gl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    container.insertBefore(this.gl, this.canvas);
    this.mesh = createMeshRenderer(this.gl, this.soft);
    this.canvas.setAttribute('role', 'img');
    this.canvas.style.pointerEvents = this.touchOpts.bindSelf ? 'auto' : 'none';
    this._skinVersion = 0;
    this._uploadedVersion = -1;
    this._map = this._map.bind(this);
    this._uv = this._uv.bind(this);
    this._pt = [0, 0]; this._tc = [0, 0];
    if (this.touchOpts.bindSelf) this._bindSelf();
    this._label();
  }

  _label() {
    if (!this.canvas || !this.mallow) return;
    const d = this.describe ? this.describe() : this.mallow.name;
    this.canvas.setAttribute('aria-label', `${d}. Press and hold to squeeze, drag to stretch, stroke to calm.`);
  }

  setReducedMotion(b) { super.setReducedMotion(b); if (this.soft) this.soft.reduced = !!b; }

  // ------------------------------------------------------------ input --
  /** Container-local CSS px for a client point (handles CSS scaling). */
  local(cx, cy) {
    const r = this.container.getBoundingClientRect();
    const sx = r.width ? this.W / r.width : 1, sy = r.height ? this.H / r.height : 1;
    return { x: (cx - r.left) * sx, y: (cy - r.top) * sy, scale: r.width ? r.width / this.W : 1 };
  }

  _lift() {
    const v = this.val, rm = this.opts.reducedMotion;
    const floatY = (v.float * 0.07 + Math.sin(this.time * 0.9) * v.float * 0.012) * this.H * (rm ? 0.5 : 1);
    return this.body.hop * this.H + floatY;
  }
  _scale() { return this.S * (1 - clamp(this.val.shrink, 0, 1) * 0.12); }
  toBody(p) { const S = this._scale(); return { x: (p.x - this.CX) / S, y: (p.y - (this.BASE - this._lift())) / S }; }

  /** Is the client point on the Mallow's (deformed) body? */
  hit(cx, cy) {
    if (!this.ready) return false;
    return this.soft.contains(this.toBody(this.local(cx, cy)), 0.06);
  }

  pointerDown(e) {
    const p = this.local(e.clientX, e.clientY);
    const t = now();
    const w = Math.max(e.width || 0, e.height || 0) / (p.scale || 1);
    this.gest.setBodyWidth(this.bodyW * this._scale() * (p.scale || 1));
    this.gest.down({ id: e.pointerId, x: e.clientX, y: e.clientY, t, w: e.pointerType === 'touch' ? w : 0 });
    this.soft.grab(e.pointerId, this.toBody(p), { radius: 0.3 });
    this.fingerScreen.set(e.pointerId, p);
    this.touch.lastAny = this.time;
    this.lookAt((p.x - this.CX) / (this.W * 0.5), 0);
    this.opts.audio?.play?.(this.id, 'press');
    this._haptic('light');
    this._afterGesture();
  }

  pointerMove(e) {
    const g = this.soft.grabs.get(e.pointerId);
    const p = this.local(e.clientX, e.clientY);
    this.lookAt((p.x - this.CX) / (this.W * 0.5), (p.y - (this.BASE - this.H * 0.3)) / (this.H * 0.5));
    if (!g) return;
    const t = now();
    this.gest.move({ id: e.pointerId, x: e.clientX, y: e.clientY, t, w: e.pointerType === 'touch' ? Math.max(e.width || 0, e.height || 0) / (p.scale || 1) : 0 });
    this.fingerScreen.set(e.pointerId, p);
    const f = this.gest.fingers.get(e.pointerId);
    if (f?.moved) this.soft.drag(e.pointerId, this.toBody(p));
    this.touch.lastAny = this.time;
    this._afterGesture();
  }

  pointerUp(e) {
    if (!this.soft.grabs.has(e.pointerId)) return;
    const out = this.gest.up({ id: e.pointerId, t: now() });
    const S = this._scale() * (this.local(0, 0).scale || 1);
    const vel = out && out.kind === 'flick' ? { x: out.vx / S, y: out.vy / S } : null;
    this.soft.release(e.pointerId, vel);
    this.fingerScreen.delete(e.pointerId);
    this._afterGesture();
  }

  pointerCancel(e) { this.gest.cancel(e.pointerId); this.soft.release(e.pointerId); this.fingerScreen.delete(e.pointerId); }

  /** Is a finger currently on this Mallow? */
  get touched() { return this.soft.grabs.size > 0; }

  _haptic(kind) { if (this.opts.haptics) this.opts.haptic?.(kind); }

  _afterGesture() {
    const T = this.touch;
    for (const ev of this.gest.take()) {
      switch (ev.type) {
        case 'tap': {
          this.soft.poke(this.toBody(this.local(ev.x, ev.y)), 1);
          this.react('tap');
          this._emit('touch', { kind: 'tap' });
          break;
        }
        case 'flick': {
          this.body.leanV += clamp(ev.vx / 2500, -1.2, 1.2) * 3;
          this.react('flick', { dirX: Math.sign(ev.vx) || 1 });
          this._haptic('pop');
          this._emit('touch', { kind: 'flick', speed: ev.speed });
          break;
        }
        case 'release': {
          if (T.squeezed.has(ev.id)) {
            T.squeezed.delete(ev.id);
            this.react('release');
            if (this.opts.particles) this.particles.burst({ kind: RELEASE_FX[this.id] || 'spark', n: 6 });
            this._haptic('soft');
            this._emit('touch', { kind: 'release', squeezed: true, held: ev.held });
          } else {
            this.opts.audio?.play?.(this.id, 'release');
            this._emit('touch', { kind: 'release', squeezed: false, held: ev.held, dist: ev.dist });
          }
          break;
        }
        case 'jiggle': {
          T.giggle = Math.min(1, T.giggle + 0.55);
          const f = this.gest.fingers.get(ev.id);
          if (f) this.soft.poke(this.toBody(this.local(ev.x, ev.y)), 0.5);
          if (T.giggle > 0.5) this.opts.audio?.play?.(this.id, 'tap', { intensity: 0.8 });
          this._haptic('tick');
          this._emit('touch', { kind: 'jiggle' });
          break;
        }
        case 'circle': {
          T.calm = Math.min(1, T.calm + 0.2);
          this._hum(0.35 + T.calm * 0.4);
          if (this.opts.particles && Math.random() < 0.5) this.particles.burst({ kind: CARE_FX[this.id] || 'heart', n: 1 });
          this._haptic('tick');
          this._emit('touch', { kind: 'massage', calm: T.calm });
          break;
        }
        case 'stroke': {
          T.calm = Math.min(1, T.calm + 0.24);
          this.opts.audio?.fx?.('swish', { intensity: 0.35 });
          this._emit('touch', { kind: 'stroke', calm: T.calm });
          break;
        }
        case 'pinchStart': this._emit('touch', { kind: 'twoFinger' }); break;
        default: break;
      }
    }
  }

  _hum(intensity) {
    const a = this.opts.audio;
    if (!a?.hold) return;
    if (!this._humH) this._humH = a.hold('hum', { intensity });
    this._humH.update?.({ intensity });
    this._humUntil = this.time + 1.4;
  }

  _bindSelf() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    const down = (e) => { if (!this.hit(e.clientX, e.clientY)) return; c.setPointerCapture?.(e.pointerId); this.pointerDown(e); e.preventDefault(); };
    const move = (e) => this.pointerMove(e);
    const up = (e) => this.pointerUp(e);
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', (e) => this.pointerCancel(e));
    this._unbind = () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); };
  }

  // ----------------------------------------------------------- update --
  _composeTargets(dt) {
    const goal = super._composeTargets(dt);
    const T = this.touch;
    const blend = (state, w) => {
      if (w < 0.01) return;
      const f = faceFor(this.id, state);
      for (const [k, v] of Object.entries(f)) if (k in goal) goal[k] = lerp(goal[k], v, clamp(w, 0, 1));
    };
    blend('calm', T.calm * 0.95);
    blend('giggle', T.giggle);
    blend('stretch', T.stretch);
    blend('squish', T.squish);
    // squeeze face follows depth continuously (character-specific)
    if (T.depth > 0.05) {
      const sq = this._squeezeFace();
      const w = clamp((T.depth - 0.08) / 0.5, 0, 1);
      for (const [k, v] of Object.entries(sq)) if (k in goal) goal[k] = lerp(goal[k], v, w);
      goal.glow = Math.max(goal.glow, T.depth * 0.6);
    }
    return goal;
  }

  _squeezeFace() {
    return REACTIONS[this.id]?.squeezeFace || REACTIONS._shared.squeezeFace;
  }

  _updateBody(dt, goal) {
    super._updateBody(dt, goal);
    if (!this.soft) return;
    const T = this.touch, b = this.body, v = this.val;
    const t = now();
    // squeeze depth per still finger
    let depth = 0, pull = 0;
    for (const [id, g] of this.soft.grabs) {
      const d = this.gest.depth(id, t);
      this.soft.setDepth(id, d);
      depth = Math.max(depth, d);
      pull = Math.max(pull, g.pull);
      if (d > 0.45 && !T.squeezed.has(id)) {
        T.squeezed.add(id);
        this.opts.audio?.play?.(this.id, 'squeeze');
        this._haptic('soft');
        this._emit('touch', { kind: 'squeeze' });
      }
      // pulled far past its limit: it slips out of your fingers with a boing
      if (g.pull > 2.4) {
        this.soft.release(id, { x: -(g.x - g.x0) * 3, y: -(g.y - g.y0) * 3 });
        this.gest.cancel(id);
        this.react('doubleTap');
        this._emit('touch', { kind: 'slip' });
      }
    }
    T.depth = lerp(T.depth, depth, Math.min(1, dt * 14));
    T.pull = lerp(T.pull, pull, Math.min(1, dt * 10));
    const pinch = this.gest.count === 2 ? this.gest.pinch() : null;
    const stretchGoal = Math.max(clamp((T.pull - 0.25) / 0.9, 0, 1), pinch ? clamp((pinch.ratio - 1.08) / 0.4, 0, 1) : 0);
    const squishGoal = pinch ? clamp((0.92 - pinch.ratio) / 0.3, 0, 1) : 0;
    T.stretch = lerp(T.stretch, stretchGoal, Math.min(1, dt * 8));
    T.squish = lerp(T.squish, squishGoal, Math.min(1, dt * 8));
    T.giggle = Math.max(0, T.giggle - dt * 0.9);
    // calm lingers, then slowly fades once touch stops
    const idle = this.time - T.lastAny;
    T.calm = Math.max(0, T.calm - dt * (idle > 4 ? 0.06 : 0.015));
    if (this._humH && this.time > (this._humUntil || 0)) { this._humH.stop?.(); this._humH = null; }
    // the rig's whole-body motion becomes the soft body's pose
    const rm = this.opts.reducedMotion;
    const breath = Math.sin(this.breathPhase) * 0.014 * v.breath * (rm ? 0.5 : 1);
    const sq = b.squash;
    const P = this.soft.pose;
    P.sy = (1 - sq) * (1 + breath);
    P.sx = (1 + sq * 0.62) * (1 - breath * 0.6);
    P.bulge = sq * 0.32 + v.cheekPuff * 0.02;
    P.lean = b.lean * 0.55 + b.shear * 0.18;
    P.tilt = (b.tilt * Math.PI) / 180 + (b.spin > 0 ? spinCurve(1 - b.spin) * Math.PI * 2 : 0);
    P.droop = clamp(v.droop, 0, 1.2);
    P.ox = rm ? 0 : v.tremble * 1.6 * (Math.sin(this.time * 41) * 0.6 + Math.sin(this.time * 27.7) * 0.4) / Math.max(0.2, this.S);
    this.soft.step(dt);
  }

  // ----------------------------------------------------------- render --
  _renderSkin() {
    const before = this._lastSig;
    const animated = this.id === 'zuzu' || this.id === 'glitzi' || this.val.tears > 0.01 || this.val.sweat > 0.01 ||
      this.val.mouthTremble > 0.01 || this.val.heartEyes > 0.01 || this.val.sparkle > 1.05 || this.val.wet > 0.05;
    const dirty = this.skinDirty;
    super._renderSkin();
    if (animated || dirty || this._lastSig !== before) this._skinVersion++;
  }

  _map(k) {
    const S = this._scale();
    this._pt[0] = this.CX + this.soft.x[k] * S;
    this._pt[1] = this.BASE - this._liftNow + this.soft.y[k] * S;
    return this._pt;
  }
  _uv(k) {
    const q = this.q;
    this._tc[0] = ((this.cxs + this.soft.rx[k] * (this.bodyW / (this.bodyW + 4))) * q) / this.skin.width;
    this._tc[1] = ((this.by1 + this.soft.ry[k] * (this.bodyH / (this.bodyH + 3))) * q) / this.skin.height;
    return this._tc;
  }

  _render() {
    if (!this.soft) return;
    this._renderSkin();
    const ctx = this.ctx;
    const { W, H, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const v = this.val, m = this.mallow;
    const S = this._scale();
    const lift = this._lift();
    this._liftNow = lift;
    const bnd = this.soft.bounds();
    const bodyW = (bnd.x1 - bnd.x0);
    // contact shadow (follows the squashed footprint)
    if (this.opts.shadow) {
      const sw = bodyW * S * 0.5 * (1 - Math.min(0.5, lift / H * 2.2));
      const sa = 0.3 * (1 - Math.min(0.7, lift / H * 3)) * (1 + this.touch.depth * 0.4);
      const g = ctx.createRadialGradient(this.CX, this.BASE, 0, this.CX, this.BASE, Math.max(1, sw));
      g.addColorStop(0, `rgba(10,6,30,${sa})`);
      g.addColorStop(1, 'rgba(10,6,30,0)');
      ctx.save();
      ctx.translate(this.CX, this.BASE); ctx.scale(1, 0.22); ctx.translate(-this.CX, -this.BASE);
      ctx.fillStyle = g;
      ctx.fillRect(this.CX - sw, this.BASE - sw, sw * 2, sw * 2);
      ctx.restore();
    }
    if (this.opts.aura && v.glow > 0.02) {
      const r = bodyW * S * 0.78;
      const cy = this.BASE - lift + ((bnd.y0 + bnd.y1) / 2) * S;
      const g = ctx.createRadialGradient(this.CX, cy, r * 0.2, this.CX, cy, r);
      g.addColorStop(0, hexA(m.colours.glow, 0.3 * clamp(v.glow, 0, 1.5)));
      g.addColorStop(1, hexA(m.colours.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(this.CX - r, cy - r, r * 2, r * 2);
    }
    // the body: soft mesh in WebGL (or 2D)
    const dents = [];
    for (const [id, g] of this.soft.grabs) {
      const d = g.depth * (1 - Math.min(1, g.pull * 3));
      if (d < 0.02) continue;
      const fp = this.fingerScreen.get(id);
      if (fp) dents.push({ x: fp.x, y: fp.y, r: g.sigma * S * 0.75, depth: d });
    }
    const changed = this._skinVersion !== this._uploadedVersion;
    this._uploadedVersion = this._skinVersion;
    this.mesh.draw({ skin: this.skin, skinChanged: changed, map: this._map, uvOf: this._uv, W, H, dpr, dentList: dents, glow: clamp(v.glow, 0, 1.5) * 0.3 + this.touch.depth * 0.25 });
    if (this.opts.particles) this.particles.draw(ctx, { lift, S });
  }

  destroy() {
    this._humH?.stop?.();
    super.destroy();
    this.mesh?.destroy();
    this.gl?.remove();
  }
}

function spinCurve(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1).toFixed(3)})`;
}
