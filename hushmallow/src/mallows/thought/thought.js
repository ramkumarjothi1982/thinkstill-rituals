// Thought Mallows — the person's thought, alive in the Hushfold.
//
//   const th = createThought({ text: 'My boss embarrassed me today.', emotion: 'embarrassment', intensity: 0.7 });
//   layer.add(th, { x, y });                   // a ThoughtLayer draws it and hangs its words on it
//   th.soften(0.5); th.slow(); th.makeSpace(); th.settle(); th.transform(1); th.farther(0.6);
//
// A Thought Mallow is a small translucent jelly (SoftBody 10×10, the same
// solver as the seven Mallows) with a simple face. It is squeezed, stretched,
// stroked and carried with the same TouchReader as MallowTouch:
//   press and hold   squeeze: it dents, puffs its cheeks, then softens
//   drag             carry it (press then move, or slide off its edge): the
//                    jelly trails the finger and wobbles when put down
//   flick            toss it: it glides and recedes (moves farther away)
//   two fingers      spread to stretch it (and bring it nearer); pinch to send it farther
//   stroke / circle  soothe it: it calms and slows
//   tap              it hops and blinks
// The verbs (soften, slow, makeSpace, settle, transform, farther) ease it
// toward a level 0..1 (called without an argument they add a step). None of
// them removes it: destroy() is only for the host leaving.
//
// Handle (HUSHFOLD §3 W2): { id, text, emotion, x, y, z, scale, state:{tension, charge,
// calm, distance}, react(kind), soften(k), settle(k), transform(k), hitTest(x, y),
// pointer(e), destroy() } + slow, makeSpace, farther, closer, moveHome, token, siblings.
// x / y / scale / state may be written by a world every frame: a written value
// wins (the thought only adds its own life on top while it is driven).
// No DOM here (Node runs it); a ThoughtLayer renders it and owns its word tag.

import { SoftBody } from '../touch/softbody.js';
import { TouchReader } from '../touch/gestures.js';
import { SHAPE, styleFor, normaliseEmotion, deriveLook, makeLook, outlineUV, insideUV, siblingCount, tagBudget, wordsExcerpt, clamp, lerp } from './styles.js';

const TAU = Math.PI * 2;
const COLS = 10, ROWS = 10;
const OUTLINE_N = 44;
const OUTLINE = outlineUV(OUTLINE_N);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Named sample points on the body (lattice uv); render.js and the layer read them. */
export const PT = Object.freeze({
  eyeL: 0, eyeR: 1, mouthC: 2, mouthL: 3, mouthR: 4, cheekL: 5, cheekR: 6, forehead: 7, chin: 8, top: 9, bottom: 10,
  specA: 11, specB: 12, core: 13, ventL: 14, ventR: 15, sweat: 16, left: 17, right: 18, mote0: 19,
});
const PT_UV = [
  [0.355, 0.47], [0.645, 0.47], [0.5, 0.645], [0.43, 0.64], [0.57, 0.64], [0.24, 0.61], [0.76, 0.61], [0.5, 0.32], [0.5, 0.79], [0.5, 0.03], [0.5, 1],
  [0.3, 0.21], [0.43, 0.13], [0.5, 0.64], [0.3, 0.08], [0.7, 0.08], [0.87, 0.32], [0.02, 0.56], [0.98, 0.56],
];
const MOTE_UV = [[0.3, 0.78], [0.66, 0.84], [0.22, 0.42], [0.78, 0.5], [0.5, 0.88], [0.58, 0.3], [0.4, 0.56]];
const N_PTS = PT_UV.length + MOTE_UV.length;

/** The jelly a Thought Mallow is made of: softer and wobblier than the seven. */
export const THOUGHT_MATERIAL = Object.freeze({ kG: 0.2, kL: 0.5, beta: 0.36, damp: 0.955, dMax: 0.38, maxStretch: 0.42 });

let NEXT = 1;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** Deterministic 0..1 noise for (seed, i) — no Math.random, so tests and replays agree. */
export const rnd = (seed, i) => { let x = (seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

const STATE_KEYS = ['tension', 'charge', 'calm', 'distance'];
const LEVELS = ['soft', 'slow', 'space', 'settle', 'transform', 'explore'];

export class ThoughtMallow {
  /**
   * @param {object} o
   * @param {string} o.text  the person's exact words (never reworded; shown by textContent only)
   * @param {string} [o.emotion]  any emotion id or word (normaliseEmotion)
   * @param {number} [o.intensity=0.6]  @param {number} [o.scale=1]  @param {number} [o.r=40] half body height, CSS px
   * @param {number} [o.x] @param {number} [o.y]  client CSS px
   * @param {boolean} [o.reducedMotion]  @param {(kind:string)=>void} [o.haptic]
   */
  constructor(o = {}) {
    this.kind = o.kind || 'thought';
    this.id = o.id || `${this.kind}-${NEXT++}`;
    this.text = String(o.text ?? '');
    this.emotion = normaliseEmotion(o.emotion);
    this.style = o.style || styleFor(this.emotion);
    this.intensity = clamp(o.intensity ?? 0.6);
    this.parent = o.parent || null;
    this.seed = (o.seed ?? hash(this.id + '|' + this.text)) >>> 0;
    this.r = o.r > 0 ? +o.r : 40;
    this.aspect = SHAPE.aspect;
    this.reducedMotion = !!o.reducedMotion;
    this.lowStim = !!o.lowStim;
    this.haptic = o.haptic || null;
    this.audio = o.audio || null;
    this.listeners = {};
    this.destroyed = false;
    this.layer = null;
    this.clock = 0;
    this.alpha = this.style.alpha ?? 0.76;

    // where it is (client CSS px): anchor, velocity, home (where it rests)
    const x = Number.isFinite(o.x) ? o.x : 0, y = Number.isFinite(o.y) ? o.y : 0;
    this._pos = { x, y }; this._vel = { x: 0, y: 0 }; this.home = { x, y };
    this._vPrev = { x: 0, y: 0 };
    this._drivenT = -9;           // clock of the last external x / y write
    this._scale = o.scale > 0 ? +o.scale : 1; this._scaleT = -9;
    this.z = clamp(o.z ?? 0); this.zGoal = this.z;
    this.off = { x: 0, y: 0 };    // its own life on top of the anchor (bob, tremble, sink, drift)
    this._sink = 0; this._drift = { x: 0, y: 0 }; this._driftDir = { x: 1, y: 0 };
    this._glide = false;          // a tossed thought gliding to rest

    // state: what a world reads and may write (a written value wins for 0.5 s)
    const base = { tension: clamp(this.style.tension * (0.55 + 0.45 * this.intensity)), charge: clamp(this.style.charge * (0.6 + 0.4 * this.intensity)) };
    this.base = base;
    const sv = { tension: base.tension, charge: base.charge, calm: 0, distance: this.z };
    const ext = { tension: -9, charge: -9, calm: -9, distance: -9 };
    const st = {};
    for (const k of STATE_KEYS) Object.defineProperty(st, k, { enumerable: true, get: () => sv[k], set: (v) => { sv[k] = clamp(+v || 0); ext[k] = this.clock; if (k === 'distance') this.zGoal = sv[k]; } });
    Object.defineProperty(st, '_v', { value: sv }); Object.defineProperty(st, '_ext', { value: ext });
    this.state = st;
    // the verbs' levels: goal (what was asked) and cur (eased toward it)
    this.levels = {};
    for (const k of LEVELS) this.levels[k] = { goal: 0, cur: 0 };
    this.earned = { calm: 0, soft: 0, space: 0 };   // from the person's own touch
    this.look = makeLook();
    this._lookIn = { tension: 0, charge: 0, calm: 0, transform: 0, soft: 0, settle: 0, space: 0, slow: 0 };
    this.ov = { blink: 0, squint: 0, gasp: 0, giggle: 0, sigh: 0, hop: -1, appear: 1, notice: 0 };
    this._blinkAt = 1.5 + 3 * rnd(this.seed, 1);
    this._dartAt = 0.4; this.gaze = { x: 0, y: 0, tx: 0, ty: 0 };
    this.phase = { bob: TAU * rnd(this.seed, 2), sway: TAU * rnd(this.seed, 3), hop: rnd(this.seed, 4), talk: TAU * rnd(this.seed, 5), burst: TAU * rnd(this.seed, 6), mote: TAU * rnd(this.seed, 7) };
    this.talk = 0;                // sibling chatter: mouth opening 0..1
    this.free = false;            // a sibling the person moved away from the ring
    this.speed = 0;

    // the jelly
    const mask = (u, v) => (insideUV(u, v, 0.03) ? 1 : 0);
    this.material = { ...THOUGHT_MATERIAL, ...(o.material || {}) };
    this.sb = new SoftBody({ cols: o.cols || COLS, rows: o.rows || ROWS, aspect: this.aspect, mask, faceRect: [0.27, 0.36, 0.73, 0.72],
      material: this._mat(), reducedMotion: this.reducedMotion });
    this._matKey = '';
    this._touchSquash = 0;

    // render data (client CSS px), filled by step()
    this.render = { P: this.r * 2, W: this.r * 2 * this.aspect, cx: x, cy: y, ang: 0, alpha: 1, M: [1, 0, 0, 1, 0, 0], Minv: [1, 0, 0, 1, 0, 0],
      outline: new Float32Array(2 * OUTLINE_N), pts: new Float32Array(2 * N_PTS), ready: false };
    this._sp = { x: 0, y: 0 }; this._b = { x: 0, y: 0 }; this._loc = { u: 0, v: 0, tri: -1 };

    // fingers
    this._vs = 1;                 // virtual px per CSS px for the reader (small bodies read like big ones)
    this.fingers = new Map();
    this.touch = { depth: 0, stretch: 1, pressed: false, carried: false };
    this.reader = new TouchReader({
      hit: (vx, vy) => this.hitTest(vx / this._vs, vy / this._vs),
      bodySize: () => this.render.W * this._vs,
      centre: () => ({ x: this.render.cx * this._vs, y: this.render.cy * this._vs }),
      keyReach: () => 0.7 * this.material.maxStretch * this.render.P * this._vs,
    });
    this._bindReader();

    // effects (fixed pools, reused: no per-frame allocation)
    this.fx = makeFx(this.style);

    // overthinking / overwhelm: smaller siblings talking over one another
    this.siblings = [];
    if (this.kind === 'thought' && !o.noSiblings) {
      const n = o.siblings ?? siblingCount(this.style, this.intensity);
      for (let i = 0; i < n; i++) this.siblings.push(new ThoughtMallow({ kind: 'sibling', parent: this, text: '', emotion: this.emotion, style: this.style, intensity: this.intensity,
        r: this.r * (0.5 + 0.08 * rnd(this.seed, 20 + i)), seed: this.seed + 101 * (i + 1), reducedMotion: this.reducedMotion, lowStim: this.lowStim, haptic: this.haptic, x, y, noSiblings: true, index: i }));
      this.siblings.forEach((s, i) => { s.index = i; s._orbitA = SIB_ANGLES[n][i]; });
    }
    this._settle(true);
  }

  // ------------------------------------------------------------ handle --
  get x() { return this._pos.x; }
  set x(v) { if (!Number.isFinite(v)) return; this._pos.x = v; this.home.x = v; this._drivenT = this.clock; this._glide = false; }
  get y() { return this._pos.y; }
  set y(v) { if (!Number.isFinite(v)) return; this._pos.y = v; this.home.y = v; this._drivenT = this.clock; this._glide = false; }
  get scale() { return this._scale; }
  set scale(v) { if (Number.isFinite(v) && v > 0) { this._scale = v; this._scaleT = this.clock; } }
  /** Being positioned by someone else (a world writes x / y every frame). */
  get driven() { return this.clock - this._drivenT < 0.5; }
  /** The words its tag shows now (exact text, or an excerpt of it when long or far away). */
  get token() { return this.layer?.tagText?.(this) ?? wordsExcerpt(this.text, 42); }
  /** The words as the tag shows them for depth z (pure). */
  tokenAt(z = this.z) { return wordsExcerpt(this.text, tagBudget(z)); }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return this; }
  off(ev, fn) { const l = this.listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } return this; }
  _emit(ev, data) { for (const fn of this.listeners[ev] || []) { try { fn(data); } catch (e) { console.error(e); } } this.layer?._relay?.(ev, this, data); }

  /** Move where it rests (it floats there). */
  moveHome(p) { if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) { this.home.x = p.x; this.home.y = p.y; this._glide = false; } return this; }
  /** Put it somewhere at once. */
  place(p) { if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) { this._pos.x = this.home.x = p.x; this._pos.y = this.home.y = p.y; this._vel.x = this._vel.y = 0; this._vPrev.x = this._vPrev.y = 0; } return this; }

  // -------------------------------------------------------------- verbs --
  // each eases a level toward k (0..1); no argument adds a step. None removes the thought.
  _verb(key, k, step = 0.34) { const L = this.levels[key]; L.goal = Number.isFinite(k) ? clamp(k) : clamp(L.goal + step); if (this.reducedMotion) L.cur = lerp(L.cur, L.goal, 0.6); return this; }
  /** Softer jelly, gentler face, the tint mellows. */
  soften(k) { this._verb('soft', k); for (const s of this.siblings) s._verb('soft', k); this._emit('verb', { verb: 'soften', level: this.levels.soft.goal }); return this; }
  /** Everything about it moves more slowly. */
  slow(k) { this._verb('slow', k); for (const s of this.siblings) s._verb('slow', k); this._emit('verb', { verb: 'slow', level: this.levels.slow.goal }); return this; }
  /** Room around it: others drift away, its siblings spread out. */
  makeSpace(k) { this._verb('space', k); this._emit('verb', { verb: 'space', level: this.levels.space.goal }); return this; }
  /** It sinks a little, stops bobbing and rests. */
  settle(k) { this._verb('settle', k); for (const s of this.siblings) s._verb('settle', k); this._emit('verb', { verb: 'settle', level: this.levels.settle.goal }); return this; }
  /** Its tint turns to the calm palette and its face relaxes into relief. */
  transform(k) { this._verb('transform', k); for (const s of this.siblings) s._verb('transform', k); this._emit('verb', { verb: 'transform', level: this.levels.transform.goal }); return this; }
  /** Farther away (z): smaller, quieter — the words stay readable. */
  farther(k) { this.zGoal = Number.isFinite(k) ? clamp(k) : clamp(this.zGoal + 0.3); this._emit('verb', { verb: 'farther', level: this.zGoal }); return this; }
  closer(k) { this.zGoal = Number.isFinite(k) ? clamp(this.zGoal - k) : clamp(this.zGoal - 0.3); this._emit('verb', { verb: 'closer', level: this.zGoal }); return this; }
  /** Alias for worlds that speak of distance. */
  moveFarther(k) { return this.farther(k); }

  /** A visible moment: 'tap' | 'poke' | 'squeeze' | 'release' | 'sigh' | 'appear' | 'notice' | 'giggle'. */
  react(kind) {
    const sb = this.sb, rm = this.reducedMotion ? 0.3 : 1, ov = this.ov;
    switch (kind) {
      case 'tap': case 'poke': ov.blink = 1; if (!this.reducedMotion) { ov.hop = 0; sb.deform('squash', 1.4); } this.audio?.fx?.('pluck', { intensity: 0.18 }); break;
      case 'squeeze': sb.deform('squash', 2.2 * rm); ov.squint = 1; break;
      case 'release': sb.deform('squash', -2.4 * rm); break;
      case 'sigh': ov.sigh = 1; sb.deform('squash', 0.9 * rm); this.audio?.fx?.('settle', { intensity: 0.2 }); break;
      case 'appear': ov.appear = 0; if (!this.reducedMotion) sb.deform('squash', -2.6); break;
      case 'notice': ov.notice = 1; break;
      case 'giggle': ov.giggle = 1; if (!this.reducedMotion) sb.deform('shear', 1.5); break;
      case 'gasp': ov.gasp = 1; break;
      default: sb.deform('squash', 0.8 * rm);
    }
    return this;
  }

  /** Is the client point (CSS px) on its body (with a little touch slop; ≥ 48 px target)? */
  hitTest(x, y, slop = 6) {
    const R = this.render;
    if (!R.ready || this.destroyed) return false;
    const dx = x - R.cx, dy = y - R.cy, rx = R.W / 2 + slop, ry = R.P / 2 + slop;
    // small bodies get at least a 48 px target
    const mrx = Math.max(rx, 24), mry = Math.max(ry, 24);
    if ((dx * dx) / (mrx * mrx) + (dy * dy) / (mry * mry) > 1.15) return false;
    if (rx < 24 || ry < 24) return (dx * dx) / (mrx * mrx) + (dy * dy) / (mry * mry) <= 1;
    const b = this._toBody(x, y);
    const loc = this.sb.locate(b.x, b.y, this._loc);
    const pad = slop / Math.max(20, R.P);
    if (loc) return insideUV(loc.u, loc.v, pad);
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 0.92;
  }

  /** Routed pointer {type:'down'|'move'|'up'|'cancel', id, x, y, t (ms, performance.now())}. True when it is this thought's. */
  pointer(e) {
    if (!e || this.destroyed) return false;
    const R = this.reader;
    if (e.type === 'down' && !R.ptrs.size) this._vs = clamp(180 / Math.max(40, this.render.W), 1, 2.4);
    if (e.type !== 'down' && !R.ptrs.has(e.id)) return false;
    const ms = Number.isFinite(e.t) ? e.t : nowMs();
    // how late input arrives: the gesture clock runs that far behind (a slow frame never reads as a pause)
    const lag = nowMs() - ms; this._inLag = lag > 0 && lag < 1000 ? lag / 1000 : 0;
    const vs = this._vs;
    return R.pointer({ type: e.type, id: e.id, x: e.x * vs, y: e.y * vs, t: ms / 1000, shift: !!e.shift, mouse: !!e.mouse });
  }

  get pressed() { return this.reader.ptrs.size > 0; }

  /** For a saved belief or thought: words, feeling, seed and levels (never pixels). */
  toJSON() {
    const lv = {};
    for (const k of LEVELS) lv[k] = +this.levels[k].goal.toFixed(3);
    return { kind: this.kind, text: this.text, emotion: this.emotion, intensity: this.intensity, seed: this.seed, z: +this.zGoal.toFixed(3), levels: lv, calm: +this.earned.calm.toFixed(3) };
  }
  /** Restore levels saved by toJSON(). */
  restore(j = {}) {
    for (const k of LEVELS) if (j.levels && Number.isFinite(j.levels[k])) { this.levels[k].goal = this.levels[k].cur = clamp(j.levels[k]); }
    if (Number.isFinite(j.calm)) this.earned.calm = clamp(j.calm);
    if (Number.isFinite(j.z)) this.z = this.zGoal = clamp(j.z);
    return this;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.reader.cancelAll();
    for (const s of this.siblings) s.destroy();
    this.layer?._forget?.(this);
    this._emit('destroy', {});
    this.listeners = {};
  }

  setReducedMotion(b) { this.reducedMotion = !!b; this.sb.setReducedMotion(b); this._matKey = ''; for (const s of this.siblings) s.setReducedMotion(b); }
  setLowStim(b) { this.lowStim = !!b; for (const s of this.siblings) s.setLowStim(b); }

  // ------------------------------------------------------------- input --
  _bindReader() {
    const R = this.reader;
    R.on('down', (e) => {
      const x = e.x / this._vs, y = e.y / this._vs;
      const b = this._toBody(x, y);
      this.sb.grab(e.id, b.x, b.y, 0.3);
      this.sb.press(e.id, b.x, b.y, 0, 0.24);
      this.fingers.set(e.id, { x, y, x0: x, y0: y, band: 0, carry: false, ox: 0, oy: 0, moved: 0, squeezed: false });
      this.ov.notice = 1;
      this._haptic('light');
      if (R.ptrs.size === 1) this.audio?.fx?.('bubble', { intensity: 0.16, pitch: 1.2 - 0.3 * clamp((this.render.P - 40) / 120) });
      this._emit('touch', { kind: 'press' });
    });
    R.on('glide', (e) => { const f = this.fingers.get(e.id); if (f && !f.carry) this.sb.surface(e.id); });
    R.on('regrip', (e) => {
      const f = this.fingers.get(e.id), p = R.ptrs.get(e.id);
      const x = e.x / this._vs, y = e.y / this._vs, b = this._toBody(x, y);
      this.sb.release(e.id, { quiet: true });
      this.sb.grab(e.id, b.x, b.y, 0.3);
      this.sb.press(e.id, b.x, b.y, p ? p.depth : 0, 0.24);
      if (f && f.carry) { f.ox = this._pos.x - x; f.oy = this._pos.y - y; }
    });
    R.on('move', (e) => {
      const f = this.fingers.get(e.id);
      if (!f) return;
      const x = e.x / this._vs, y = e.y / this._vs;
      f.moved += Math.hypot(x - f.x, y - f.y);
      f.x = x; f.y = y;
    });
    R.on('stroke', (e) => {
      const f = this.fingers.get(e.id);
      if (f?.carry) return;
      this._soothe(0.13, 'stroke');
      const s = Math.min(1.4, e.speed / this._vs / 300) * (this.reducedMotion ? 0.3 : 1);
      const b = this._toBody(e.x / this._vs, e.y / this._vs);
      this.sb.impulse(e.dx * s * 0.7, e.dy * s * 0.7, { x: b.x, y: b.y, r: 0.3 });
      this._haptic('tick');
      this.audio?.fx?.('swish', { intensity: 0.15 });
      this._emit('touch', { kind: 'stroke', dir: e.dir });
    });
    R.on('massage', (e) => {
      this._soothe(0.07, 'massage');
      if (Math.floor(e.turns) > (this._turnTick || 0)) { this._turnTick = Math.floor(e.turns); this._haptic('tick'); }
      this._emit('touch', { kind: 'massage', turns: e.turns, dir: e.dir });
    });
    R.on('massageEnd', () => { this._turnTick = 0; });
    R.on('jiggle', (e) => {
      if (!this.reducedMotion) this.sb.impulse(e.axis === 'x' ? 0.9 : 0, e.axis === 'y' ? 0.9 : 0);
      this.react('giggle');
      this._emit('touch', { kind: 'jiggle' });
    });
    R.on('stretchStart', (s) => {
      // stretching means holding with both hands: no carrying
      for (const f of this.fingers.values()) f.carry = false;
      this._zAt = this.zGoal;
      const grip = clamp((0.45 * s.d0 / this._vs) / Math.max(30, this.render.P), 0.16, 0.4);
      this.sb.setGrip(s.a, grip); this.sb.setGrip(s.b, grip);
      this._emit('touch', { kind: 'stretch' });
    });
    R.on('stretchEnd', () => { this.sb.setWaist(null); this._emit('touch', { kind: 'stretchEnd' }); });
    R.on('tap', () => { this.react('tap'); this._emit('touch', { kind: 'tap' }); });
    R.on('doubleTap', () => { this.react('giggle'); this._emit('touch', { kind: 'doubleTap' }); });
    R.on('up', (e) => this._release(e));
  }

  _release(e) {
    const f = this.fingers.get(e.id);
    this.fingers.delete(e.id);
    const vs = this._vs, rm = this.reducedMotion;
    const vx = e.vx / vs, vy = e.vy / vs;          // CSS px / s
    const P = Math.max(20, this.render.P), I = this.render.Minv;
    const flick = e.kind === 'flick';
    let bvx = (I[0] * vx + I[2] * vy) * (flick ? 1 : 0.4), bvy = (I[1] * vx + I[3] * vy) * (flick ? 1 : 0.4);
    if (f?.carry) { bvx *= 0.35; bvy *= 0.35; }
    this.sb.release(e.id, { vx: bvx, vy: bvy, flick: flick && !f?.carry });
    if (!this.reader.ptrs.size) { this.sb.setWaist(null); this.touch.depth = 0; this._touchSquash = 0; }
    if (e.cancelled) { this._emit('touch', { kind: 'release' }); return; }
    const soothing = e.mode === 'glide' && !f?.carry;
    if (f?.carry || flick) {
      // it stays where it was put; a toss glides on and recedes
      const sp = Math.hypot(vx, vy);
      if (flick && !rm) { this._vel.x = vx * 0.55; this._vel.y = vy * 0.55; this._glide = true; this.zGoal = clamp(this.zGoal + Math.min(0.4, sp / 3200)); }
      else if (flick) { this.zGoal = clamp(this.zGoal + Math.min(0.25, sp / 4000)); }
      this.home.x = this._pos.x; this.home.y = this._pos.y;
      // a sibling put somewhere else stays there (pulling the voices apart gives the main thought room)
      if (this.kind === 'sibling' && f?.carry) this.free = true;
      this._explore(Math.min(0.06, (f?.moved || 0) / 2500));
      this._emit('touch', { kind: flick ? 'flick' : 'put', speed: sp });
      if (!flick) this.audio?.fx?.('settle', { intensity: 0.12 });
      return;
    }
    if (e.kind === 'tapStart' || e.kind === 'doubleTap') { if (!rm) this.sb.impulse(0, 1.2, { x: this.aspect / 2, y: 0.4, r: 0.3 }); return; }
    const depth = soothing ? 0 : e.depth * (1 - 0.7 * (e.pull || 0));
    if (depth > 0.15) {
      // a squeeze let go: a jelly rebound, and a little more give each time
      if (!rm && !this.reader.ptrs.size) this.sb.deform('squash', -2.2 * depth);
      this._soothe(0.08 + 0.12 * depth, 'squeeze');
      this.earned.soft = clamp(this.earned.soft + 0.1 * depth);
      if (depth > 0.5) this._haptic('pop');
      this.audio?.fx?.('bubble', { intensity: 0.12 + 0.2 * depth, pitch: 0.8 });
    }
    this._emit('touch', { kind: 'release', depth });
  }

  /** The person's care: calm rises (fastest at first), and a belief loosens. */
  _soothe(k, how) {
    const E = this.earned;
    E.calm = clamp(E.calm + k * (1 - 0.55 * E.calm));
    if (how === 'stroke' || how === 'massage') this.levels.slow.goal = Math.max(this.levels.slow.goal, clamp(E.calm * 0.8));
    this._explore(k * 0.5);
    if (this.parent) this.parent._soothe(k * 0.25, 'sibling');
  }
  _explore() { /* beliefs loosen here (belief.js) */ }

  _haptic(kind) { try { this.haptic?.(kind); } catch { /* ignore */ } }

  // ------------------------------------------------------------- frame --
  _mat() {
    const s = Math.max(this.levels?.soft?.cur || 0, this.earned?.soft || 0), sl = this.levels?.slow?.cur || 0;
    const M = this.material;
    return { ...M, kG: M.kG * (1 - 0.35 * s), kL: M.kL * (1 - 0.15 * s), damp: clamp(M.damp + 0.012 * s - 0.03 * sl, 0.85, 0.985), dMax: M.dMax * (this.reducedMotion ? 0.6 : 1) };
  }

  /**
   * One frame. env: { now (s), rm, low, bounds:{left,top,right,bottom}, away:{x,y} (a point to drift away from: the hero) }.
   * Returns true while it is visibly moving.
   */
  step(dt, env = {}) {
    if (this.destroyed) return false;
    dt = clamp(dt, 0, 0.05);
    this.clock += dt;
    const rm = env.rm ?? this.reducedMotion, low = env.low ?? this.lowStim;
    if (rm !== this.reducedMotion) this.setReducedMotion(rm);
    this.lowStim = low;
    const L = this.levels, sv = this.state._v, ext = this.state._ext, recent = (k) => this.clock - ext[k] < 0.5;
    // the verbs ease in (about a second), the person's touch fades back very slowly
    const ke = Math.min(1, dt * (rm ? 6 : 1.8));
    for (const k of LEVELS) L[k].cur += (L[k].goal - L[k].cur) * ke;
    this.earned.calm = Math.max(0, this.earned.calm - dt * 0.004);
    // siblings pulled apart give the main thought room
    if (this.siblings.length) this.earned.space = this._siblingSpace();
    // state: written values win; otherwise it follows its feeling, its touch and the verbs
    if (!recent('tension')) sv.tension = this.base.tension;
    if (!recent('charge')) sv.charge = this.base.charge;
    if (!recent('calm')) sv.calm = clamp(Math.max(this.earned.calm, L.transform.cur, 0.5 * L.settle.cur, this.parent ? this.parent.state.calm * 0.8 : 0));
    // depth
    if (!recent('distance')) sv.distance = this.z;
    this.z += (this.zGoal - this.z) * Math.min(1, dt * (rm ? 8 : 2.2));
    // the look
    const li = this._lookIn;
    li.tension = sv.tension; li.charge = sv.charge; li.calm = sv.calm; li.transform = L.transform.cur;
    li.soft = Math.max(L.soft.cur, this.earned.soft); li.settle = L.settle.cur; li.slow = L.slow.cur;
    li.space = Math.max(L.space.cur, this.earned.space, this.parent ? this.parent.levels.space.cur : 0);
    const look = deriveLook(this.style, li, this.look);
    // material follows softening / slowing
    const mk = `${li.soft.toFixed(2)}|${li.slow.toFixed(2)}|${rm}`;
    if (mk !== this._matKey) { this._matKey = mk; this.sb.setMaterial(this._mat()); }
    this._readTouch(dt, env.now);
    this._motion(dt, env, look, rm);
    this._rest(look);
    this._propPre?.(dt, env);       // a belief's prop leans on the jelly (belief.js)
    this.sb.step(dt);
    this._face(dt, look, rm);
    this._computeRender(look, env);
    this._propPost?.(dt, env);
    stepFx(this, dt, look, env, rm, low);
    for (const s of this.siblings) { if (!s.free && !s.pressed && !s.driven) siblingHome(this, s, s.home); s.step(dt, env); }
    return true;
  }

  _readTouch(dt, now) {
    const R = this.reader, T = this.touch, sb = this.sb;
    if (!R.ptrs.size) this._inLag = 0;
    R.update(Number.isFinite(now) ? now - (this._inLag || 0) : R.t + dt);
    const S = R.stretch, vs = this._vs;
    let maxD = 0, carried = false;
    let mx = 0, my = 0, half = 0;
    if (S) {
      const a = R.ptrs.get(S.a), c = R.ptrs.get(S.b);
      if (a && c) {
        mx = (a.x + c.x) / 2 / vs; my = (a.y + c.y) / 2 / vs;
        // a small jelly follows the fingers generously (85 %), never so far that it slips
        const h0 = S.d0 / 2 / vs, hd = Math.hypot(a.x - c.x, a.y - c.y) / 2 / vs;
        half = clamp(h0 + (hd - h0) * 0.85, h0 * 0.55, h0 + 0.8 * this.material.maxStretch * (this.render.P || 80));
      }
      // pinch to send it farther, spread to stretch it (and bring it nearer)
      const s = S.s;
      if (s < 0.97) this.zGoal = clamp((this._zAt ?? this.zGoal) + (1 - s) * 1.4);
      else if (s > 1.03) this.zGoal = clamp((this._zAt ?? this.zGoal) - (s - 1) * 0.8);
      if (s > 1.05) this._explore(dt * 0.12 * (s - 1));
    }
    for (const p of R.ptrs.values()) {
      const f = this.fingers.get(p.id);
      if (!f) continue;
      let px = p.x / vs, py = p.y / vs;
      // a finger that slides off the body (not circling) picks the thought up
      if (!S && !f.carry && (p.mode === 'pull' || (p.mode === 'glide' && !p.massage && !this.hitTest(px, py, 4) && f.moved > 14))) {
        f.carry = true;
        // hold the material where the finger is now (clamped into the body): the stretch starts from here
        const b = this._toBody(px, py), gx = clamp(b.x, 0.08, this.aspect - 0.08), gy = clamp(b.y, 0.08, 0.92);
        sb.release(p.id, { quiet: true }); sb.grab(p.id, gx, gy, 0.32);
        // the anchor keeps the finger over that point of the body
        const M = this.render.M;
        f.ox = this._pos.x - (M[0] * gx + M[2] * gy + M[4]); f.oy = this._pos.y - (M[1] * gx + M[3] * gy + M[5]);
        this._glide = false;
        this._emit('touch', { kind: 'carry' });
      }
      if (half > 0 && (p.id === S.a || p.id === S.b)) {
        const dx = px - mx, dy = py - my, l = Math.hypot(dx, dy) || 1;
        px = mx + (dx / l) * half; py = my + (dy / l) * half;
      }
      if (f.carry) carried = true;
      const b = this._toBody(px, py);
      const d = f.carry ? p.depth * 0.25 : p.depth * (S ? 0.4 : 1);
      sb.press(p.id, b.x, b.y, d, 0.24);
      sb.move(p.id, b.x, b.y, S ? 1 : f.carry ? 0.6 : p.pull);
      const squeezing = p.mode !== 'glide' && !f.carry;
      if (squeezing) {
        maxD = Math.max(maxD, d);
        const band = p.depth > 0.66 ? 2 : p.depth > 0.33 ? 1 : 0;
        if (band > f.band) { this._haptic('soft'); if (band >= 1 && !f.squeezed && !S) { f.squeezed = true; this.ov.squint = 1; this._emit('touch', { kind: 'squeeze', depth: p.depth }); } }
        f.band = Math.max(f.band, band);
        // a gentle, held squeeze softens it
        this.earned.soft = clamp(this.earned.soft + dt * 0.1 * d);
        this.earned.calm = clamp(this.earned.calm + dt * 0.05 * d);
      }
      if (p.massage && Math.abs(p.massage.rate) > 0.5 && !f.carry) sb.swirl(b.x, b.y, 0.24, p.massage.rate);
    }
    T.depth += (maxD - T.depth) * (maxD > T.depth ? 1 : Math.min(1, dt * 12));
    T.stretch = S ? S.s : 1;
    T.pressed = R.ptrs.size > 0;
    T.carried = carried;
    if (S) sb.setWaist(S.a, S.b, clamp((S.s - 1) * 0.75, 0, 0.45));
  }

  // where it floats: home, carry, glide, its own motion, drift and sink
  _motion(dt, env, look, rm) {
    const pos = this._pos, vel = this._vel, home = this.home, m = look.motion;
    const lp = this._lastPos || (this._lastPos = { x: pos.x, y: pos.y });
    const P = this.render.P || this.r * 2;
    let carry = null;
    for (const f of this.fingers.values()) if (f.carry) { carry = f; break; }
    if (carry) {
      // the anchor follows the finger with a little lag (never so far the jelly slips)
      const tx = carry.x + carry.ox, ty = carry.y + carry.oy;
      const k = rm ? 400 : 170, c = 2 * Math.sqrt(k) * (rm ? 1 : 0.8);
      vel.x += (k * (tx - pos.x) - c * vel.x) * dt; vel.y += (k * (ty - pos.y) - c * vel.y) * dt;
      pos.x += vel.x * dt; pos.y += vel.y * dt;
      const maxLag = 0.6 * this.material.maxStretch * P, lx = tx - pos.x, ly = ty - pos.y, l = Math.hypot(lx, ly);
      if (l > maxLag) { pos.x = tx - (lx / l) * maxLag; pos.y = ty - (ly / l) * maxLag; }
      home.x = pos.x; home.y = pos.y;
    } else if (this._glide) {
      // a toss: glides with friction, eases off the edges, then rests where it stopped
      const fr = Math.exp(-dt * 2.4);
      vel.x *= fr; vel.y *= fr;
      pos.x += vel.x * dt; pos.y += vel.y * dt;
      const B = env.bounds;
      if (B) {
        const hw = (this.render.W || P) / 2, hh = P / 2;
        if (pos.x < B.left + hw) { pos.x = B.left + hw; vel.x = Math.abs(vel.x) * 0.4; }
        if (pos.x > B.right - hw) { pos.x = B.right - hw; vel.x = -Math.abs(vel.x) * 0.4; }
        if (pos.y < B.top + hh) { pos.y = B.top + hh; vel.y = Math.abs(vel.y) * 0.4; }
        if (pos.y > B.bottom - hh) { pos.y = B.bottom - hh; vel.y = -Math.abs(vel.y) * 0.4; }
      }
      home.x = pos.x; home.y = pos.y;
      if (Math.hypot(vel.x, vel.y) < 12) this._glide = false;
    } else if (!this.driven) {
      // float home: a soft, slightly underdamped glide
      const k = rm ? 30 : 12, c = 2 * Math.sqrt(k) * (rm ? 1 : 0.86);
      vel.x += (k * (home.x - pos.x) - c * vel.x) * dt; vel.y += (k * (home.y - pos.y) - c * vel.y) * dt;
      pos.x += vel.x * dt; pos.y += vel.y * dt;
    } else { vel.x = 0; vel.y = 0; }
    // the jelly feels the anchor's acceleration, however it moved (a drag, a toss, a world's
    // spring): it sloshes behind a drag and wobbles when put down
    const ivx = dt > 0 ? (pos.x - lp.x) / dt : 0, ivy = dt > 0 ? (pos.y - lp.y) / dt : 0;
    lp.x = pos.x; lp.y = pos.y;
    if (!rm && dt > 0) {
      const ax = ivx - this._vPrev.x, ay = ivy - this._vPrev.y;
      const s = 1 / Math.max(20, P);
      const sh = clamp(-ax * s * 0.55, -1.5, 1.5), sq = clamp(-ay * s * 0.4, -1.5, 1.5);
      if (Math.abs(sh) > 0.004) this.sb.deform('shear', sh);
      if (Math.abs(sq) > 0.004) this.sb.deform('squash', sq);
    }
    this._vPrev.x = ivx; this._vPrev.y = ivy;
    this.speed = Math.hypot(ivx, ivy);
    // its own life, on top (render offsets: they never shake the jelly)
    const ph = this.phase, pace = look.pace, t = this.clock;
    const amp = rm ? 0 : 1;
    ph.bob += dt * TAU * m.bobHz * (rm ? 0.5 : 1);
    ph.sway += dt * TAU * 0.33 * (0.5 + pace);
    let ox = 0, oy = Math.sin(ph.bob) * m.bob * P * (rm ? 0.25 : 1);
    if (m.tremble > 0 && amp) {
      const f = m.trembleHz * TAU;
      ox += (Math.sin(t * f) * 0.6 + Math.sin(t * f * 1.37 + 1.3) * 0.4) * m.tremble * P;
      oy += (Math.cos(t * f * 0.91 + 0.7) * 0.6 + Math.sin(t * f * 1.21) * 0.4) * m.tremble * P * 0.7;
    }
    if (m.sway > 0 && amp) ox += Math.sin(ph.sway) * m.sway * P;
    // anxiety's restless path: a small, jittery wander around home
    if (this.style.motion.dart > 1 && amp) { ox += (Math.sin(t * 1.7 * pace + ph.mote) + Math.sin(t * 2.9 * pace)) * 0.05 * P * look.e; oy += Math.sin(t * 2.3 * pace + 1) * 0.03 * P * look.e; }
    // restless hops
    if (m.hop > 0 && amp) {
      ph.hop += dt * m.hop;
      if (ph.hop >= 1) { ph.hop -= 1; this.ov.hop = 0; this.sb.deform('squash', 1.1); }
    }
    if (this.ov.hop >= 0) {
      const ht = this.ov.hop;
      oy -= 4 * ht * (1 - ht) * 0.22 * P;
      this.ov.hop += dt / 0.42;
      if (this.ov.hop >= 1) { this.ov.hop = -1; if (!rm) this.sb.deform('squash', 1.6); }
    }
    // sadness sinks (slowly), settling rests a little lower
    const sinkGoal = m.sink * P;
    this._sink += (sinkGoal - this._sink) * Math.min(1, dt * (rm ? 4 : 0.35));
    oy += this._sink;
    // loneliness drifts away from the others (slowly; soothing or carrying it close stops it)
    const D = this._drift;
    if (m.drift > 0.02 && !carry && !this.driven && env.away && !rm) {
      const dx = pos.x - env.away.x, dy = pos.y - env.away.y, l = Math.hypot(dx, dy) || 1;
      const lim = 0.12 * Math.min(env.view?.W || 400, env.view?.H || 800) * m.drift;
      const cur = Math.hypot(D.x, D.y);
      if (cur < lim) { D.x += (dx / l) * dt * 5 * m.drift; D.y += (dy / l) * dt * 2 * m.drift; }
    } else { D.x *= Math.exp(-dt * 0.6); D.y *= Math.exp(-dt * 0.6); }
    ox += D.x; oy += D.y;
    // farther away it also sits a little higher, toward the horizon
    oy -= this.z * 0.45 * this.r;
    // a sibling's own place: in a ring round its main thought
    this.off.x = ox; this.off.y = oy;
  }

  // the feeling and the touch become the jelly's rest shape
  _rest(look) {
    const b = look.body, T = this.touch;
    const sq = T.depth * 0.1;
    this._touchSquash += (sq - this._touchSquash) * 0.25;
    if (Math.abs(this._touchSquash - sq) < 1e-5) this._touchSquash = sq;
    this.sb.setRest({ squash: b.squash + this._touchSquash, droop: b.droop, shrink: b.shrink * 0.6, puffL: b.puff + T.depth * 0.6, puffR: b.puff + T.depth * 0.6, cheekV: 0.6 });
  }

  // blinks, gaze darts, face overlays
  _face(dt, look, rm) {
    const ov = this.ov, g = this.gaze, t = this.clock;
    // blink every few seconds (heavy lids blink slowly)
    if (t > this._blinkAt) { ov.blink = 1; this._blinkAt = t + 2.2 + 3.2 * rnd(this.seed, Math.floor(t * 7)); }
    ov.blink = Math.max(0, ov.blink - dt / 0.16);
    ov.squint = Math.max(0, ov.squint - dt / 0.9);
    ov.gasp = Math.max(0, ov.gasp - dt / 0.7);
    ov.giggle = Math.max(0, ov.giggle - dt / 0.8);
    ov.sigh = Math.max(0, ov.sigh - dt / 1.6);
    ov.notice = Math.max(0, ov.notice - dt / 1.5);
    ov.appear = Math.min(1, ov.appear + dt / (rm ? 0.25 : 0.9));
    // the gaze: darting (anxiety, overwhelm), or resting where the feeling looks
    const f = look.face;
    if (look.motion.dart > 0.05 && t > this._dartAt) {
      const i = Math.floor(t * 13);
      g.tx = (rnd(this.seed, i) * 2 - 1) * 0.9; g.ty = (rnd(this.seed, i + 5) * 2 - 1) * 0.6;
      this._dartAt = t + (0.25 + 0.6 * rnd(this.seed, i + 9)) / Math.max(0.3, look.motion.dart) * (rm ? 3 : 1);
    } else if (look.motion.dart <= 0.05) { g.tx = f.lookX; g.ty = f.lookY; }
    if (this._lookAt) { g.tx = this._lookAt.x; g.ty = this._lookAt.y; }
    const kg = rm ? 6 : look.motion.dart > 0.05 ? 30 : 8;
    g.x += (g.tx - g.x) * Math.min(1, dt * kg); g.y += (g.ty - g.y) * Math.min(1, dt * kg);
    // sibling chatter: syllables in bursts, out of phase with the others
    if (this.kind === 'sibling' && this.parent) {
      const P0 = this.parent.look.fx.chatter, ph = this.phase;
      ph.talk += dt * TAU * (rm ? 1.4 : 3.6 + 1.6 * rnd(this.seed, 3)) * (0.5 + 0.5 * this.look.pace);
      ph.burst += dt * TAU * 0.3;
      const on = Math.sin(ph.burst) > -0.25 ? 1 : 0;
      const quiet = 1 - clamp(this.earned.calm * 1.6);
      this.talk = P0 * quiet * on * Math.pow(Math.max(0, Math.sin(ph.talk)), 0.7);
    }
  }

  /** Look toward a client point (null = its own gaze). */
  lookAt(x, y) {
    if (x == null) { this._lookAt = null; return this; }
    const R = this.render;
    this._lookAt = { x: clamp((x - R.cx) / Math.max(60, R.W * 2)), y: clamp((y - R.cy) / Math.max(60, R.P * 2), -1, 1) };
    this._lookAt.x = clamp(this._lookAt.x * 1.6, -1, 1);
    return this;
  }

  _settle(first) {
    this._rest(this.look);
    this.sb.reset();
    this._computeRender(this.look, {});
    void first;
  }

  // body units → client px, the outline and the named points
  _computeRender(look, env) {
    const R = this.render, pos = this._pos;
    const zs = lerp(1, 0.5, this.z);
    const shrinkK = 1 - 0.16 * look.motion.shrink;
    const appear = this.ov.appear, ap = this.reducedMotion ? 1 : 0.35 + 0.65 * easeOutBack(appear);
    const P = this.r * 2 * this._scale * zs * shrinkK * ap;
    const cx = pos.x + this.off.x, cy = pos.y + this.off.y;
    // a slight lean into its own motion, and an embarrassed turn away
    let ang = clamp(this._vPrev.x * 0.0005, -0.14, 0.14) * (this.reducedMotion ? 0 : 1);
    if (this.emotion === 'embarrassment') ang += 0.07 * look.e * (look.face.lookX >= 0 ? 1 : -1);
    // a belief leans under the weight it carries (belief.js sets lean)
    if (this.lean) ang += this.lean;
    const co = Math.cos(ang), si = Math.sin(ang), a = this.aspect;
    const M = R.M;
    M[0] = co * P; M[1] = si * P; M[2] = -si * P; M[3] = co * P;
    M[4] = cx - (co * P * a / 2 - si * P * 0.5);
    M[5] = cy - (si * P * a / 2 + co * P * 0.5);
    const det = M[0] * M[3] - M[1] * M[2] || 1e-9, I = R.Minv;
    I[0] = M[3] / det; I[1] = -M[1] / det; I[2] = -M[2] / det; I[3] = M[0] / det;
    R.P = P; R.W = P * a; R.cx = cx; R.cy = cy; R.ang = ang;
    R.alpha = (1 - 0.28 * this.z) * clamp(appear * 1.6);
    const sb = this.sb, sp = this._sp, O = R.outline, Q = R.pts;
    for (let i = 0; i < OUTLINE_N; i++) {
      sb.sample(OUTLINE[2 * i], OUTLINE[2 * i + 1], sp);
      O[2 * i] = M[0] * sp.x + M[2] * sp.y + M[4];
      O[2 * i + 1] = M[1] * sp.x + M[3] * sp.y + M[5];
    }
    for (let i = 0; i < PT_UV.length; i++) {
      sb.sample(PT_UV[i][0], PT_UV[i][1], sp);
      Q[2 * i] = M[0] * sp.x + M[2] * sp.y + M[4];
      Q[2 * i + 1] = M[1] * sp.x + M[3] * sp.y + M[5];
    }
    const mp = this.phase.mote += 0.012 * (this.reducedMotion ? 0.3 : 1);
    for (let j = 0; j < MOTE_UV.length; j++) {
      const i = PT_UV.length + j;
      sb.sample(MOTE_UV[j][0] + 0.05 * Math.sin(mp + j * 1.7), MOTE_UV[j][1] + 0.04 * Math.cos(mp * 0.8 + j * 2.3), sp);
      Q[2 * i] = M[0] * sp.x + M[2] * sp.y + M[4];
      Q[2 * i + 1] = M[1] * sp.x + M[3] * sp.y + M[5];
    }
    R.ready = true;
    void env;
  }

  _toBody(x, y) {
    const R = this.render, I = R.Minv, b = this._b;
    const dx = x - R.M[4], dy = y - R.M[5];
    b.x = I[0] * dx + I[2] * dy; b.y = I[1] * dx + I[3] * dy;
    return b;
  }

  /** Where a named point (PT.*) is now, client px. */
  point(i, out = { x: 0, y: 0 }) { out.x = this.render.pts[2 * i]; out.y = this.render.pts[2 * i + 1]; return out; }

  /** The body's box (client px). */
  bodyRect() {
    const O = this.render.outline;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < O.length; i += 2) { const x = O[i], y = O[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  // how far its siblings have been given room (0..1)
  _siblingSpace() {
    let s = 0, n = 0;
    for (const sib of this.siblings) {
      if (!sib.free) continue;
      const d = Math.hypot(sib._pos.x - this._pos.x, sib._pos.y - this._pos.y) / Math.max(30, this.render.P);
      s += clamp((d - 1.1) / 1.4); n++;
    }
    return this.siblings.length ? s / this.siblings.length : 0;
  }
}

// sibling ring: angles (radians, 0 = right, y down) for 3 and 4 siblings
const SIB_ANGLES = { 0: [], 1: [-2.4], 2: [-2.5, -0.6], 3: [-2.55, -1.45, -0.5], 4: [-2.75, -1.85, -1.05, -0.25], 5: [-2.9, -2.1, -1.4, -0.7, 0.05] };

/** Where the siblings float: a crowded ring round the main thought, wider with room and calm. */
export function siblingHome(main, sib, out = { x: 0, y: 0 }) {
  const look = main.look, P = main.render.P || main.r * 2;
  const space = Math.max(main.levels.space.cur, main.earned.space);
  const rad = (P / 2 + (sib.render.P || sib.r * 2) / 2) * (0.78 + 0.6 * space + 0.35 * look.relief - 0.1 * look.motion.crowd);
  const wob = main.reducedMotion ? 0 : 0.18 * Math.sin(main.clock * (0.5 + 0.3 * sib.index) + sib.index * 2) * (0.3 + look.pace);
  const a = sib._orbitA + wob;
  out.x = main._pos.x + Math.cos(a) * rad * 1.08;
  out.y = main._pos.y + Math.sin(a) * rad * 0.9;
  return out;
}

const easeOutBack = (t) => { const c1 = 1.4, c3 = c1 + 1; return t >= 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// ---------------------------------------------------------------- effects --
// Fixed pools per thought: arcs (anger), puffs (frustration steam), drops
// (sadness rain), a sweat drop (anxiety), mumble marks (siblings). Spawn rates
// come from the look; everything fades in and out softly (photosafe).
function makeFx() {
  const pool = (n, keys) => Array.from({ length: n }, () => { const o = { life: 0, dur: 1 }; for (const k of keys) o[k] = 0; return o; });
  return {
    arcs: pool(3, ['i', 'len', 'seed', 'side']), arcT: 0,
    puffs: pool(10, ['x', 'y', 'vx', 'vy', 'r']), steamT: 0, huff: 0,
    drops: pool(12, ['x', 'y', 'vy', 'len']), rainT: 0, cloud: 0,
    sweat: { t: 0.4, on: 0 },
    marks: pool(3, ['x', 'y', 'side', 'r']), markT: 0, talkWas: 0,
  };
}

function stepFx(th, dt, look, env, rm, low) {
  const F = th.fx, R = th.render, P = R.P, fx = look.fx, t = th.clock, seed = th.seed;
  const live = (p) => p.life > 0;
  const spawn = (pool) => { for (const p of pool) if (!live(p)) return p; return null; };
  const k = low ? 0.35 : 1;
  // anger: micro-arcs along the rim (≤ 3 a second, each fades in over 0.28 s)
  F.arcT += dt * fx.crackle * k * (rm ? 0.4 : 1);
  if (F.arcT >= 1) {
    F.arcT -= 1;
    const a = spawn(F.arcs);
    if (a) {
      const i = Math.floor(t * 31);
      // round the head and shoulders (outline 0 is the top centre; the base, 14–30, stays quiet)
      const k = rnd(seed, i + 1);
      a.life = 1; a.dur = 0.62 + 0.25 * rnd(seed, i); a.len = 4 + Math.floor(rnd(seed, i + 2) * 3);
      a.i = (k < 0.5 ? 34 + Math.floor(k * 2 * 12) : 1 + Math.floor((k - 0.5) * 2 * 10)) - (k < 0.5 ? 0 : 0);
      a.seed = (seed + i * 7) >>> 0; a.side = rnd(seed, i + 3) < 0.5 ? -1 : 1;
    }
  }
  for (const a of F.arcs) if (live(a)) a.life -= dt / a.dur;
  // frustration: a huff every few seconds — the body squashes and steam puffs from two vents
  F.steamT += dt * fx.steam * k;
  if (F.steamT >= 1 && P > 0) {
    F.steamT -= 1;
    F.huff = 1;
    if (!rm) th.sb.deform('squash', 1.6);
    for (let n = 0; n < 4; n++) {
      const p = spawn(F.puffs);
      if (!p) break;
      const left = n % 2 === 0, vi = left ? PT.ventL : PT.ventR;
      p.x = R.pts[2 * vi]; p.y = R.pts[2 * vi + 1];
      const j = rnd(seed, Math.floor(t * 17) + n);
      p.vx = (left ? -1 : 1) * (8 + 14 * j) * (P / 80); p.vy = -(26 + 18 * j) * (P / 80) * (rm ? 0.5 : 1); p.r = P * (0.07 + 0.03 * j); p.life = 1; p.dur = 1.3 + 0.6 * j + n * 0.08;
    }
  }
  F.huff = Math.max(0, F.huff - dt / 0.6);
  for (const p of F.puffs) if (live(p)) { p.life -= dt / p.dur; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-dt * 0.8); p.r += dt * P * 0.12; }
  // sadness: a soft cloud and a light, slow drizzle
  F.cloud += ((fx.rain > 0.05 ? 1 : 0) * clamp(fx.rain / 1.2) - F.cloud) * Math.min(1, dt * 0.8);
  F.rainT += dt * fx.rain * k * (rm ? 0.5 : 1);
  if (F.rainT >= 1 && P > 0) {
    F.rainT -= 1;
    const d = spawn(F.drops);
    if (d) { const j = rnd(seed, Math.floor(t * 23)); d.x = R.cx + (j - 0.5) * R.W * 0.95; d.y = R.cy - P * 0.98; d.vy = (52 + 26 * rnd(seed, Math.floor(t * 29))) * (P / 80) * (rm ? 0.6 : 1); d.len = P * 0.07; d.life = 1; d.dur = 1.15; }
  }
  for (const d of F.drops) if (live(d)) { d.life -= dt / d.dur; d.y += d.vy * dt; }
  // anxiety: a sweat drop slides down the side, then forms again
  const sw = look.face.sweat;
  F.sweat.on += ((sw > 0.15 ? 1 : 0) - F.sweat.on) * Math.min(1, dt * 2);
  F.sweat.t = (F.sweat.t + dt / (rm ? 4 : 2.4)) % 1;
  // siblings: a little mumble mark as a syllable opens
  if (th.kind === 'sibling') {
    if (th.talk > 0.55 && F.talkWas <= 0.55 && !low) {
      const m = spawn(F.marks);
      if (m) { const mc = PT.mouthC; m.side = rnd(seed, Math.floor(t * 11)) < 0.5 ? -1 : 1; m.x = R.pts[2 * mc] + m.side * R.W * 0.32; m.y = R.pts[2 * mc + 1] - P * 0.1; m.r = P * 0.12; m.life = 1; m.dur = 0.55; }
    }
    F.talkWas = th.talk;
    for (const m of F.marks) if (live(m)) { m.life -= dt / m.dur; m.x += m.side * dt * P * 0.35; m.y -= dt * P * 0.25; }
  }
  void env;
}

export { OUTLINE_N, MOTE_UV, PT_UV };

/** createThought({text, emotion, intensity, scale, …}) → a Thought Mallow handle (add it to a ThoughtLayer to see it). */
export function createThought(o = {}) {
  const th = new ThoughtMallow(o);
  if (o.layer) o.layer.add(th, o);
  return th;
}
