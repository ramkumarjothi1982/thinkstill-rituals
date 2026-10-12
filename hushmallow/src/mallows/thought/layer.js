// ThoughtLayer — draws many Thought and Belief Mallows and owns their words.
//
//   const layer = new ThoughtLayer({ ctx2d, tagRoot, keepOut: () => heroRect, onRead });
//   const th = layer.add({ text, emotion: 'anxiety', intensity: 0.7, from: {x, y}, home: {x, y} });
//   layer.frame(dt, t);                 // each frame (or layer.attach(mallowTouch): drawn in its frame)
//   router: if (!hero.hitTest(x, y) && layer.hitTest(x, y)) layer.pointer(e)
//
// Ways to draw (thoughts are vector jelly, drawn in 2D — see render.js):
//   { ctx2d }    the caller's canvas (it clears it and sets CSS px → device px; e.g. the Hushfold's #fx-layer)
//   { canvas }   its own canvas: sized, cleared and ticked here (one shared rAF via rig.addTicker)
//   attach(mt)   on a MallowTouch's 2D canvas, inside its frame (thoughts sit above the hero mesh)
//   { canvasGL } only: the thoughts are not WebGL meshes, so the layer lays a 2D canvas of its own over
//                that one (same box, just above it) and draws there; it warns once (pass ctx2d instead).
//   { light }    true (or a function) when the backdrop is light: a deeper rim and a firmer shadow.
//
// The person's words ride on a DOM tag per thought: a <button> whose words are
// set with textContent only (never parsed), in the voice face (HM Nunito Sans)
// at 17 px (16 px on small phones) and never below 15 px — it is never
// scaled, however far the thought moves. A long text, a far-away thought or a
// crowded stage show the start of the words, cut at a word and marked "…",
// chosen by measuring the tag: the words shown always fit, nothing clips them
// again. A tap reads all of them (onRead(th), or a small built-in reader, laid
// clear of the thought). A soft rope tethers the tag to its thought; the tag
// trails with a little spring and tilts at most 4° while it moves (at rest it
// sits on whole device pixels, untilted). Keyboard on a focused tag: Enter reads,
// holding Space squeezes, the arrow keys move it, Shift + an arrow strokes it.
//
// Layout (W2b review r3):
//   * The stage has a crowd level, 0 (room) … 4 (packed). Each level holds its thoughts a little
//     farther away (smaller) and gives the words a budget: 3, 2, 2, 1, 1 lines on narrowing plates.
//   * add() chooses the newcomer's home, the side its words go and the level at once: the roomiest
//     level at which everything fits clear (bodies, effects, props and words, the hero and the
//     bounds) with the others where they are — or, when only a much fuller stage would do, everyone
//     placed again right then (a rearrangement because a thought arrived, never seconds later).
//     remove() lets the stage grow back where it stands.
//   * The words, every frame, follow hard rules: a plate never covers another plate, any face (a
//     sibling's included), a sibling pulled free, or the hero. A plate keeps its place while that
//     stays clear; otherwise it tries its other sides and slides along them, then (at rest) fewer
//     words; if nothing is clear the whole stage steps one level fuller in place (homes stay).
//     Arriving, its words keep the side chosen for them and wait (hidden, untouchable) while that
//     place is on the hero or a face.
//   * Bodies: a gentle push keeps footprints apart; a boxed-in thought may glide a short way
//     (≤ max(56 px, 0.9 P)); the bounds and the hero are hard limits — for siblings pulled free too.
//   * Loneliness drifts into the free room the layer finds for it (away from the hero and the others).
//
// Same shape as the Hushfold's placeholder layer: add / list / remove /
// hitTest / pointer / rects / frame / clear / release / destroy / onChange.
// For a host (the Hushfold shell, a world):
//   release(ms = 700, which = null)  let every thought fade off, or only `which` (one thought or an
//                                    array): the primary can ride into a world while the others drift off
//   primary                          the newest thought that is not leaving; th.leaving says which are
//   relayout()                       plan the stage again now (the host moved its bounds or its hero)
//   { textScale: () => k }           the person's text size: the words' font and plates grow with it
//   th.opacity = a                   a world's fade (0 … 1): body, siblings, rope and words
//   .tm-tag sits at z-index var(--tm-z, 1): under the host's sheets and panels; a host may set --tm-z

import { ThoughtMallow, createThought, PT, PUFF_K, siblingHome } from './thought.js';
import { createBelief } from './belief.js';
import { drawThought, drawRope } from './render.js';
import { tintAt, rgba, clamp, tagLines, wordsOf, firstWords, wordsExcerpt, TAG_MIN_PX } from './styles.js';
import { addTicker, removeTicker, prefersReducedMotion } from '../rig.js';

const ROPE_N = 7;
let styled = false;

function injectStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const st = document.createElement('style');
  st.id = 'thought-mallow-style';
  st.textContent = `
.tm-tag{position:fixed;left:0;top:0;z-index:var(--tm-z,1);margin:0;box-sizing:border-box;max-width:min(232px,calc(100vw - 40px));padding:7px 14px 8px;border-radius:15px;
  border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,var(--tm-wash,rgba(255,255,255,.05)),rgba(255,255,255,0) 70%),rgba(14,10,36,.74);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fbf8ff;
  font:650 calc(17px * var(--tm-k,1))/1.3 var(--ff-voice,"HM Nunito Sans","Nunito Sans",ui-rounded,system-ui,sans-serif);letter-spacing:.004em;text-align:center;
  box-shadow:0 8px 22px rgba(4,2,16,.34),inset 0 1px 0 var(--tm-tint,rgba(255,255,255,.22));cursor:pointer;transform-origin:50% 0;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;pointer-events:auto;
  opacity:0;transition:opacity .45s ease,border-color .6s ease}
.tm-tag.tm-move{will-change:transform}
.tm-tag::before{content:"";position:absolute;left:-2px;right:-2px;top:50%;height:max(100% + 4px,48px);transform:translateY(-50%)}
.tm-tag .tm-words{display:block;text-wrap:balance;overflow-wrap:anywhere;min-height:1.3em}
.tm-tag.tm-on{opacity:var(--tm-o,1)}
.tm-tag.tm-travel{pointer-events:none}
.tm-tag.tm-measure{max-width:none!important;width:auto!important}
.tm-tag.tm-measure .tm-words{white-space:nowrap}
.tm-tag.tm-belief{border-color:rgba(255,236,200,.34);font-weight:720}
.tm-tag.tm-calm{border-color:rgba(255,231,166,.4)}
.tm-tag:focus-visible{outline:2px solid #fff;outline-offset:3px}
.tm-tag.tm-hidden{opacity:0!important;pointer-events:none!important}
.tm-read{position:fixed;z-index:12;left:16px;right:16px;margin:0 auto;max-width:440px;top:calc(env(safe-area-inset-top,0px) + 72px);box-sizing:border-box;
  padding:18px 20px 14px;border-radius:22px;border:1px solid rgba(255,255,255,.2);background:#110c2c;
  color:#fbf8ff;box-shadow:0 20px 50px rgba(3,1,14,.55)}
.tm-read p{margin:0 0 12px;font:600 calc(19px * var(--tm-k,1))/1.45 var(--ff-voice,"HM Nunito Sans","Nunito Sans",ui-rounded,system-ui,sans-serif);white-space:pre-wrap;overflow-wrap:anywhere;
  max-height:min(50vh,320px);overflow:auto;-webkit-user-select:text;user-select:text}
.tm-read button{display:block;width:100%;min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fbf8ff;
  font:650 16px/1 var(--ff-ui,"HM Manrope",system-ui,sans-serif);cursor:pointer}
@media (max-width:360px){.tm-tag{font-size:calc(16px * var(--tm-k,1));max-width:min(210px,calc(100vw - 28px));padding:6px 11px 7px}}
@media (prefers-reduced-motion:reduce){.tm-tag{transition:none}}
`;
  document.head.appendChild(st);
}

const asFn = (v, d) => (typeof v === 'function' ? v : v == null ? d : () => v);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
// overlap area of two rects given as numbers
const overA = (l1, t1, r1, b1, l2, t2, r2, b2) => { const ox = Math.min(r1, r2) - Math.max(l1, l2), oy = Math.min(b1, b2) - Math.max(t1, t2); return ox > 0 && oy > 0 ? ox * oy : 0; };
// two padded footprints: their paddings may touch by DEAD px before it counts as an overlap (bodies keep
// 8 px apart, plates PAD_T + PAD_T − DEAD = 6 px)
const DEAD = 4, PAD_T = 5;
const overP = (l1, t1, r1, b1, l2, t2, r2, b2) => { const ox = Math.min(r1, r2) - Math.max(l1, l2) - DEAD, oy = Math.min(b1, b2) - Math.max(t1, t2) - DEAD; return ox > 0 && oy > 0 ? ox * oy : 0; };
// a feeling whose effects rise over its head (the sadness cloud and rain, steam): its words go below
const fxAbove = (th) => th.style.fx.rain > 0 || th.style.fx.steam > 0;
// grows at once, shrinks slowly (k per frame)
const smoothGrow = (cur, v, k, init) => (!init || v > cur ? v : cur + (v - cur) * k);

// what the words keep off. Hard (never covered): faces, a sibling pulled free (and, in _hard, the hero
// and other plates). Soft (avoided by weight; on its own thought / on another's): bodies, the siblings
// round a thought, effects, props.
// OB_DEST: where a thought still on its way will rest (its body there): words looking for a place keep
// off it; words already placed are not moved for it (it passes under them on its way).
const OB_BODY = 0, OB_FACE = 1, OB_SIB = 2, OB_SIBFACE = 3, OB_FX = 4, OB_PROP = 5, OB_FREE = 6, OB_DEST = 7;
const HARD = [false, true, false, true, false, false, true, false];
const W_OWN = [8, 0, 6, 0, 10, 10, 0, 0];
const W_OTHER = [8, 0, 6, 0, 12, 10, 0, 0];
const SIDE_NAMES = ['below', 'above', 'right', 'left'];
// Where the words may go, in order of preference: [side, slide] — side 0 below, 1 above, 2 right,
// 3 left; slide along the free axis (× the plate's width below / above; × half the plate plus half
// the body beside it). Planning a home tries the first NC_PLAN.
const CANDS = Object.freeze([0, 0, 1, 0, 2, 0, 3, 0, 0, -0.32, 0, 0.32, 1, -0.32, 1, 0.32, 2, -0.6, 2, 0.6, 3, -0.6, 3, 0.6,
  0, -0.62, 0, 0.62, 1, -0.62, 1, 0.62, 2, -1.15, 2, 1.15, 3, -1.15, 3, 1.15]);
const NC = CANDS.length / 2, NC_PLAN = 12;
// a px² on other words, the hero or a face itself weighs this many px² of a face's envelope
const BAD_CORE = 50;
// which anchor reaches point outward (+1 down / right, −1 up / left): they hold their furthest (_anchors)
const OUTWARD = Object.freeze([0, 1, 0, -1, 1, -1, 0, 1]);
/** How far each crowd level holds its thoughts (0 room … 4 packed). */
export const CROWD_Z = Object.freeze([0, 0.2, 0.45, 0.62, 0.78]);
// px² of padding overlap that still counts as "fits"
const FIT = 150;
// the room one thought needs at level 0 (px²): roominess is the room per thought over this
const ROOM_ONE = 52000;
// repack starts: [smallest first, words beside, stacked from the top of the stage (px of cost per px lower)]
const REPACK_STARTS = Object.freeze([[false, false, 0], [true, false, 0], [false, true, 0], [false, true, 1.5], [false, false, 1.5]]);
// layout tuning: wish = weight of the distance to where each wanted to be in a repack; moveCost = px of the
// others' movement (in total) worth one crowd level when add() weighs "place everyone again" against "fuller"
export const TUNE = { wish: 1.2, moveCost: 120 };

export class ThoughtLayer {
  /**
   * @param {object} o
   * @param {CanvasRenderingContext2D} [o.ctx2d]  draw here (the caller clears it and sets the dpr transform)
   * @param {HTMLCanvasElement} [o.canvas]  or own this canvas (sized, cleared, ticked here)
   * @param {HTMLCanvasElement} [o.canvasGL]  only this: a 2D overlay canvas of our own is laid over it
   * @param {HTMLElement} [o.tagRoot=document.body]  where the word tags live (position:fixed)
   * @param {boolean|()=>boolean} [o.reducedMotion]  default: the OS setting, live
   * @param {boolean|()=>boolean} [o.lowStim]
   * @param {boolean|()=>boolean} [o.light]  the backdrop is light (a deeper rim, a firmer shadow)
   * @param {()=>({left,top,right,bottom}|null)} [o.keepOut]  a rect thoughts float clear of (the hero Mallow), client px
   * @param {()=>({left,top,right,bottom})} [o.bounds]  where thoughts may float (default: the viewport, 20 px clear of the edges)
   * @param {(th)=>void} [o.onRead]  tap on the words (default: a small reader with all of them)
   * @param {(kind)=>void} [o.haptic]  @param {object} [o.audio]
   * @param {number|()=>number} [o.textScale=1]  the person's text size (1 … 1.25 …): the words' font and plates scale with it
   */
  constructor(o = {}) {
    injectStyle();
    this.o = o;
    this.ctx = o.ctx2d || null;
    this.canvas = o.canvas || this.ctx?.canvas || null;
    this.own = !!(o.canvas && !o.ctx2d);
    if (this.own) this.ctx = o.canvas.getContext('2d');
    if (!this.ctx && o.canvasGL) this._overlay(o.canvasGL);
    this.tagRoot = o.tagRoot || (typeof document !== 'undefined' ? document.body : null);
    this._rm = asFn(o.reducedMotion, () => prefersReducedMotion());
    this._low = asFn(o.lowStim, () => false);
    this._light = asFn(o.light, () => false);
    this._ts = asFn(o.textScale, () => 1);
    this._k = this._textK();
    this.keepOut = o.keepOut || null;
    this.bounds = o.bounds || null;
    this.thoughts = [];
    this.tags = new Map();
    this.ropes = new Map();
    this.owner = new Map();       // pointer id → thought
    this.listeners = {};
    this.onChange = null;
    this.mt = null;
    this.hidden = false;          // words hidden (a world took them over)
    this.paused = false;          // nothing stepped or drawn (another tab, a sheet)
    this.quality = 0;             // 0 full … 2 under load (siblings and far bodies lose fine light first)
    this._costMs = 0;
    this._env = { now: 0, rm: false, low: false, bounds: { left: 0, top: 0, right: 0, bottom: 0 }, away: null, view: { W: 1, H: 1 } };
    this._awayPt = { x: 0, y: 0 };
    this._view = { left: 0, top: 0, W: 1, H: 1, dpr: 1, dprTag: 1 };
    this._sorted = [];
    this._frames = 0;
    this._lastT = 0;
    // the stage's level: planned when thoughts come and go (_plan), plus steps taken in place (_crowdBias)
    this.crowd = 0; this._plan = 0; this._crowdBias = 0; this._blockT = 0;
    this._stageKey = new Float64Array(6).fill(NaN); this._replanT = 0;
    this.room = Infinity;
    this._ob = new Float32Array(6 * 64); this._obOwner = []; this._obN = 0;
    this._placedR = new Float64Array(4 * 16); this._nPlaced = 0;
    this._cr = new Float64Array(4); this._crD = 0; this._h3 = 0; this._core = 0; this._bestHard = 0; this._bestSoft = 0; this._bestBad = 0;
    this._tenv = { edge: 16, W: 1, yMin: 0, yMax: 1, K: null };
    this._rect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    this._rect2 = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    this._rect3 = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    this.destroyed = false;
    this._onResize = () => { this._measureView(); this._syncOverlay(); this._invalidateFits(); };
    if (typeof addEventListener === 'function') addEventListener('resize', this._onResize);
    if (typeof document !== 'undefined') document.fonts?.ready?.then(() => this._invalidateFits());
    this._measureView();
    if (this.own) { this._tick = (dt) => { if (!this.destroyed) this.frame(dt); }; addTicker(this._tick); }
  }

  // canvasGL only: thoughts are not WebGL meshes — a 2D canvas of our own, in the same box, just above it
  _overlay(gl) {
    if (typeof console !== 'undefined') console.warn('[thoughts] canvasGL: Thought Mallows draw in 2D — drawing on an overlay canvas just above it (pass ctx2d to draw on yours)');
    if (typeof document === 'undefined' || !gl?.parentNode) return;
    const c = document.createElement('canvas');
    c.className = 'tm-overlay';
    c.setAttribute('aria-hidden', 'true');
    gl.parentNode.insertBefore(c, gl.nextSibling);
    this._glEl = gl; this._overlayEl = c;
    this.canvas = c; this.ctx = c.getContext('2d'); this.own = true;
    this._syncOverlay();
  }
  _syncOverlay() {
    const c = this._overlayEl, gl = this._glEl;
    if (!c || !gl || typeof getComputedStyle !== 'function') return;
    const cs = getComputedStyle(gl);
    const pos = cs.position === 'static' || !cs.position ? 'absolute' : cs.position;
    c.style.cssText = `position:${pos};left:${gl.offsetLeft}px;top:${gl.offsetTop}px;width:${gl.offsetWidth}px;height:${gl.offsetHeight}px;pointer-events:none;z-index:${cs.zIndex || 'auto'}`;
  }

  // ------------------------------------------------------------ thoughts --
  /** The thoughts and beliefs (not their siblings), oldest first. */
  get list() { return this.thoughts; }
  /** The thought the person's words ride on (the newest one not leaving), or null. */
  get primary() { for (let i = this.thoughts.length - 1; i >= 0; i--) if (!this.thoughts[i]._leaving) return this.thoughts[i]; return null; }
  /** Every Mallow drawn, siblings included. */
  all(out = []) { out.length = 0; for (const th of this.thoughts) { for (const s of th.siblings) out.push(s); out.push(th); } return out; }

  /**
   * Add a thought: a ThoughtMallow / BeliefMallow, or the options for one
   * ({text, emotion, intensity, scale, r, prop → a belief}).
   * place: {x, y} or {from, home} — the home is where it would like to rest: the layer takes the
   * nearest free place to it (its words, effects and prop clear of the hero and the others) at the
   * roomiest level the stage allows; {exact: true} keeps it exactly there.
   */
  add(th, place = {}) {
    if (!(th instanceof ThoughtMallow)) {
      const opts = { reducedMotion: this._rm(), lowStim: this._low(), haptic: this.o.haptic, audio: this.o.audio, ...th };
      th = opts.prop || opts.kind === 'belief' ? createBelief(opts) : createThought(opts);
      if (place === th || !place || Object.keys(place).length === 0) place = opts;
    }
    if (th.layer && th.layer !== this) th.layer.remove(th);
    th.layer = this;
    th.haptic ||= this.o.haptic || null;
    th.audio ||= this.o.audio || null;
    th.setReducedMotion(this._rm());
    const want = place.home || (Number.isFinite(place.x) ? { x: place.x, y: place.y } : this._spot());
    const from = place.from || want;
    th.place(from);
    th._computeRender(th.look, this._env);
    for (const s of th.siblings) { s.layer = this; s.haptic ||= th.haptic; s.place(from); s._computeRender(s.look, this._env); }
    this.thoughts.push(th);
    if (th.text) this._makeTag(th);
    // where it rests, where its words go and how full the stage is, chosen now (not by a stream of
    // small relocations later): see _replan
    const env = this._envNow(nowMs());
    th._want = { x: want.x, y: want.y };
    if (place.exact) { th.moveHome(want); this._applyLevel(this.crowd, env); }
    else this._replan(env, th, want);
    this._keyStage(env);
    th.react('appear');
    this._changed();
    return th;
  }

  /** Spawn n thoughts with the same words and feeling, spread round `near` ({x, y}). */
  spawn(n, opts = {}, near = null) {
    const out = [];
    const c = near || this._spot();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.9;
      const r = n > 1 ? 70 + 10 * n : 0;
      out.push(this.add({ ...opts }, { from: { x: c.x, y: c.y }, home: { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.8 + (n > 1 ? r * 0.4 : 0) } }));
    }
    return out;
  }

  /** Take a thought off this layer (it is not destroyed; add() it elsewhere). */
  remove(th) {
    const i = this.thoughts.indexOf(th);
    if (i < 0) return;
    this.thoughts.splice(i, 1);
    const tg = this.tags.get(th);
    if (tg) { tg.el.remove(); this.tags.delete(th); }
    this.ropes.delete(th);
    for (const [id, o] of this.owner) if (o === th || o.parent === th) this.owner.delete(id);
    if (th.layer === this) th.layer = null;
    for (const s of th.siblings) s.layer = null;
    th.zFloor = 0;
    if (this._readTh === th) this.closeRead();
    // the stage grows back where it stands
    if (this.thoughts.length && !this.destroyed) this._regrow();
    this._changed();
  }
  _forget(th) { this.remove(th); }

  clear() { for (let i = this.thoughts.length - 1; i >= 0; i--) { const th = this.thoughts[i]; this.remove(th); th.destroy(); } }
  /**
   * Let the thoughts fade over `ms` (a world takes the words over), then take them off. `which`: only
   * this thought, or these (an array) — the others stay. One already leaving keeps its own fade.
   */
  release(ms = 700, which = null) {
    const only = which == null ? null : Array.isArray(which) ? which : [which];
    if (!only || only.includes(this._readTh)) this.closeRead();
    ms = Math.max(0, Number.isFinite(+ms) ? +ms : 700);
    const until = nowMs() + ms;
    for (const th of this.thoughts) {
      if (th._leaving || (only && !only.includes(th))) continue;
      th._leaving = until; th._leaveMs = ms;
      const tg = this.tags.get(th); if (tg) tg.el.style.pointerEvents = 'none';
      for (const [id, o] of this.owner) if (o === th || o.parent === th) { o.pointer({ type: 'cancel', id, x: 0, y: 0, t: nowMs() }); this.owner.delete(id); }
    }
    this._changed();
  }

  hideTags(b = true) { this.hidden = !!b; for (const th of this.thoughts) this.tags.get(th)?.el.classList.toggle('tm-hidden', this.hidden || this.paused); }
  /** Pause the layer: nothing is stepped, drawn or touchable and the words hide (another tab, a sheet). */
  pause(b = true) {
    this.paused = !!b;
    if (this.paused) this.closeRead();
    for (const th of this.thoughts) this.tags.get(th)?.el.classList.toggle('tm-hidden', this.hidden || this.paused);
    if (this.paused) for (const [id, th] of this.owner) { th.pointer({ type: 'cancel', id, x: 0, y: 0, t: nowMs() }); this.owner.delete(id); }
    if (this.paused && this.own && this.ctx) { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    this._changed();
  }
  resume() { this.pause(false); }
  /** Plan the stage again now: where each thought rests, its words' side and the crowd level (the host moved its bounds, its hero or the text size). */
  relayout() {
    if (this.destroyed) return;
    this._measureView(); this._syncOverlay(); this._invalidateFits();
    if (!this.thoughts.length) return;
    const env = this._envNow(nowMs());
    this._replanT = 0;
    this._keyStage(env);
    this._replan(env);
    this._changed();
  }
  /** The person's text size (a number, or a function read every frame). */
  setTextScale(k) { this._ts = asFn(k, () => 1); }
  _textK() { const v = Number(this._ts()); return Number.isFinite(v) && v > 0 ? clamp(v, 0.8, 1.6) : 1; }
  setReducedMotion(b) { this._rm = () => !!b; for (const th of this.thoughts) th.setReducedMotion(!!b); }
  setLowStim(b) { this._low = () => !!b; }
  /** The backdrop is light (or not): a deeper rim and a firmer shadow keep pale jelly visible. */
  setLight(b) { this._light = asFn(b, () => false); }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return this; }
  off(ev, fn) { const l = this.listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } return this; }
  // events carry the thought on the same object (no copy per event)
  _relay(ev, th, data) {
    const l = this.listeners[ev];
    if (l?.length) { const d = data || {}; d.thought = th; for (const fn of l) { try { fn(d); } catch (e) { console.error(e); } } }
    if (ev === 'touch') {
      // put down somewhere new by the person: its words may try their full budget again
      const k = data?.kind;
      if (k === 'put' || k === 'flick' || k === 'stretchEnd') { const tg = this.tags.get(th.parent || th); if (tg) tg.drop = 0; }
      this._changed();
    }
  }
  _changed() { try { this.onChange?.(); } catch { /* ignore */ } }

  /** Draw on a MallowTouch's 2D canvas, in its frame (one loop, above the hero). */
  attach(mt) {
    this.detach();
    this.mt = mt;
    this._mtLayer = mt.addLayer({
      draw2d: (ctx, info) => { this._attachedInfo = info; this.frame(info.dt, info.time, ctx); },
      busy: () => this.thoughts.length > 0 && !this.paused,
    });
    if (!this.keepOut) this._mtKeep = true;
    return this;
  }
  detach() { if (this.mt && this._mtLayer) this.mt.removeLayer(this._mtLayer); this.mt = null; this._mtLayer = null; this._mtKeep = false; }

  // ------------------------------------------------------------- input --
  /** The top thought (or sibling) at a client point, or null. */
  hitTest(x, y) {
    if (this.paused) return null;
    const all = this._sortedNow();
    for (let i = all.length - 1; i >= 0; i--) { const th = all[i]; if (!th.leaving && th.hitTest(x, y)) return th; }
    return null;
  }

  /** Route a pointer: pointer(e) finds the thought under it; pointer(th, e) gives it to that one. True when taken. */
  pointer(a, b) {
    let th = null, e = a;
    if (b) { th = a; e = b; }
    if (!e || (this.paused && e.type === 'down')) return false;
    if (e.type === 'down') {
      th ||= this.hitTest(e.x, e.y);
      if (!th) return false;
      const ok = th.pointer(e);
      if (ok) { this.owner.set(e.id, th); this._changed(); }
      return ok;
    }
    const o = this.owner.get(e.id) || th;
    if (!o) return false;
    const ok = o.pointer(e);
    if (e.type === 'up' || e.type === 'cancel') this.owner.delete(e.id);
    this._changed();
    return ok;
  }

  /** Is a finger on any thought? */
  get pressed() { return this.owner.size > 0; }

  /** Rects (client px) subtitles and other UI must keep clear of: each thought with everything it draws and its words, and each sibling pulled free. */
  rects(out = []) {
    out.length = 0;
    for (const th of this.thoughts) {
      if (th._leaving) continue;
      const b = th.extent(this._rect);
      let l = b.left, t = b.top, r = b.right, btm = b.bottom;
      const tg = this.tags.get(th);
      if (tg && tg.w && tg.shown) { l = Math.min(l, tg.x - tg.w / 2); r = Math.max(r, tg.x + tg.w / 2); t = Math.min(t, tg.y); btm = Math.max(btm, tg.y + tg.h); }
      out.push({ left: l, top: t, right: r, bottom: btm, width: r - l, height: btm - t, id: th.id });
      for (const s of th.siblings) {
        if (!s.free || !s.render.ready) continue;
        const q = s._bbox();
        out.push({ left: q.left, top: q.top, right: q.right, bottom: q.bottom, width: q.width, height: q.height, id: `${th.id}~${s.index}` });
      }
    }
    return out;
  }

  /** The words a thought's tag shows now. */
  tagText(th) { return this.tags.get(th)?.text ?? th.tokenAt(); }
  /** How full the stage is: 0 (room) … 4 (packed): a fuller stage holds its thoughts a little farther and gives the words fewer lines and narrower plates. */
  get crowding() { return this.crowd || 0; }
  /** Room on the stage per thought it holds (≥ 1.15 comfortable; < 0.75 crowded): a host may give the hero less room when low. */
  get roominess() { return this.room ?? Infinity; }
  /** The tag element of a thought (the Hushfold reads its size). */
  tagOf(th) { return this.tags.get(th)?.el || null; }

  /** Show all of a thought's words (laid clear of the thought itself). */
  read(th) {
    if (!th || !this.thoughts.includes(th)) return;
    this._relay('read', th, {});
    if (this.o.onRead) { this.o.onRead(th); return; }
    this.closeRead();
    if (typeof document === 'undefined' || !this.tagRoot) return;
    const el = document.createElement('div');
    el.className = 'tm-read';
    if (this._k !== 1) el.style.setProperty('--tm-k', String(this._k));
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-label', th.kind === 'belief' ? 'The belief, in your words' : 'Your words');
    const p = document.createElement('p');
    p.dir = 'auto';
    p.textContent = th.text;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Close';
    btn.addEventListener('click', () => this.closeRead());
    el.append(p, btn);
    const key = (ev) => { if (ev.key === 'Escape') this.closeRead(); };
    document.addEventListener('keydown', key);
    this._readEl = el; this._readKey = key; this._readFrom = this.tags.get(th)?.el || null; this._readTh = th;
    this.tagRoot.appendChild(el);
    this._placeReader(th, el);
    btn.focus({ preventScroll: true });
  }
  // the reader goes where the thought is not: below it, else above it, else on the side with more room
  _placeReader(th, el) {
    const H = typeof innerHeight === 'number' ? innerHeight : 844, h = el.offsetHeight || 160;
    const r = this.rects().find((q) => q.id === th.id);
    if (!r) return;
    const top = 12, bottom = H - 12, roomA = r.top - top, roomB = bottom - r.bottom;
    const y = roomB >= h + 12 ? r.bottom + 12 : roomA >= h + 12 ? r.top - 12 - h : roomB >= roomA ? Math.max(top, bottom - h) : top;
    el.style.top = `${Math.round(y)}px`;
  }
  closeRead() {
    if (!this._readEl) return;
    this._readEl.remove(); document.removeEventListener('keydown', this._readKey);
    this._readFrom?.focus?.({ preventScroll: true });
    this._readEl = null; this._readFrom = null; this._readTh = null;
  }
  get reading() { return !!this._readEl; }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this._tick) removeTicker(this._tick);
    this.detach();
    this.closeRead();
    if (typeof removeEventListener === 'function') removeEventListener('resize', this._onResize);
    this.clear();
    this._overlayEl?.remove();
  }

  // ------------------------------------------------------------- frame --
  /** Step and draw every thought. Returns true while there are any. */
  frame(dt, t, ctx = this.ctx) {
    if (this.destroyed) return false;
    if (!Number.isFinite(dt)) { const n = nowMs(); dt = this._lastT ? (n - this._lastT) / 1000 : 1 / 60; this._lastT = n; }
    dt = clamp(dt, 0, 0.05);
    if (this.paused) return false;
    const t0 = nowMs();
    this._frames++;
    if (this._frames % 90 === 0) this._measureView();
    // the person changed the text size: the words re-measure at the new size and the stage is planned again
    const tk = this._textK();
    if (tk !== this._k) {
      this._k = tk;
      for (const tg of this.tags.values()) tg.el.style.setProperty('--tm-k', String(tk));
      this._readEl?.style.setProperty('--tm-k', String(tk));
      this.relayout();
    }
    const V = this._view;
    if (this.own && ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    }
    // leaving (release): fade, then off the layer
    const now = t0;
    for (let i = this.thoughts.length - 1; i >= 0; i--) { const th = this.thoughts[i]; if (th._leaving && now >= th._leaving) { this.remove(th); th.destroy(); } }
    if (!this.thoughts.length) return false;
    const env = this._envNow(now);
    this._watch(env, dt);
    this._arrange(dt, env);
    for (const th of this.thoughts) {
      th.step(dt, env);
      // a world's fade and a release fade the body, its siblings and its rope (its words: _tags)
      let a = clamp(th.opacity ?? 1);
      if (th._leaving) a *= clamp((th._leaving - now) / Math.max(1, th._leaveMs));
      if (a < 1) { th.render.alpha *= a; for (const s of th.siblings) s.render.alpha *= a; }
    }
    const all = this._sortedNow();
    // ox/oy: the canvas's client offset (thoughts live in client px)
    let ox = V.left, oy = V.top;
    if (this.mt && this._attachedInfo) { ox = this._attachedInfo.view.left; oy = this._attachedInfo.view.top; }
    const o = this._drawOpts || (this._drawOpts = { ox: 0, oy: 0, rm: false, low: false, q: 0, light: false });
    o.ox = ox; o.oy = oy; o.rm = env.rm; o.low = env.low; o.q = this.quality; o.light = !!this._light();
    this._tags(dt, env);
    this._ropes(dt, env);
    if (ctx) {
      for (const th of this.thoughts) {
        const rope = this.ropes.get(th), tg = this.tags.get(th);
        if (rope && tg && tg.shown && !this.hidden) drawRope(ctx, rope, rope.colour, th.render.alpha * 0.85, ox, oy);
      }
      for (const th of all) drawThought(ctx, th, o);
    }
    this._adapt(nowMs() - t0);
    return true;
  }

  // adaptive quality from what this layer costs per frame (with hysteresis)
  _adapt(ms) {
    this._costMs += (ms - this._costMs) * 0.06;
    const q = this.quality, c = this._costMs;
    if (q < 2 && c > (q === 0 ? 5 : 8)) this.quality = q + 1;
    else if (q > 0 && c < (q === 2 ? 5 : 3)) this.quality = q - 1;
  }

  _envNow(now) {
    const env = this._env, V = this._view;
    env.now = now / 1000; env.rm = this._rm(); env.low = this._low();
    env.view.W = typeof innerWidth === 'number' ? innerWidth : V.W; env.view.H = typeof innerHeight === 'number' ? innerHeight : V.H;
    const B = this.bounds?.();
    const W = env.view.W, H = env.view.H, edge = 20;
    env.bounds.left = B?.left ?? edge; env.bounds.right = B?.right ?? W - edge;
    env.bounds.top = B?.top ?? Math.min(96, H * 0.12); env.bounds.bottom = B?.bottom ?? H - edge;
    const k = this._keep();
    if (k) { this._awayPt.x = (k.left + k.right) / 2; this._awayPt.y = (k.top + k.bottom) / 2; env.away = this._awayPt; } else env.away = null;
    return env;
  }

  // the hero's rect, read once per frame
  _keep() {
    if (this._kF === this._frames && this._frames > 0) return this._kR;
    this._kF = this._frames;
    this._kR = this.keepOut ? this.keepOut() : this._mtKeep && this.mt?.ready ? this.mt.bodyRect() : null;
    return this._kR;
  }

  _measureView() {
    const V = this._view;
    const dpr = (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1;
    V.dpr = Math.min(2, dpr); V.dprTag = dpr;
    if (this.canvas?.getBoundingClientRect) {
      const r = this.canvas.getBoundingClientRect();
      V.left = r.left; V.top = r.top; V.W = r.width || V.W; V.H = r.height || V.H;
      if (this.own) {
        const w = Math.round(V.W * V.dpr), h = Math.round(V.H * V.dpr);
        if (this.canvas.width !== w) this.canvas.width = w;
        if (this.canvas.height !== h) this.canvas.height = h;
      }
    } else if (typeof innerWidth === 'number') { V.W = innerWidth; V.H = innerHeight; }
  }

  // far first; a thought's siblings round the sides talk in front of it, the upper ones behind it
  // (a stable insertion sort on a precomputed key: no comparator closure, no allocation)
  _sortedNow() {
    const all = this.all(this._sorted);
    for (const t of all) t._sortKey = (t.kind === 'sibling' ? (t.front ? 2 : 0) : 1) - 100 * t.z;
    for (let i = 1; i < all.length; i++) {
      const v = all[i], k = v._sortKey;
      let j = i - 1;
      while (j >= 0 && all[j]._sortKey > k) { all[j + 1] = all[j]; j--; }
      all[j + 1] = v;
    }
    return all;
  }

  // a default place for a new thought: beside the hero
  _spot() {
    const W = typeof innerWidth === 'number' ? innerWidth : 390, H = typeof innerHeight === 'number' ? innerHeight : 844;
    const k = this._keep();
    const x = k ? (k.right + 70 < W - 30 ? k.right + 56 : Math.max(60, k.left - 56)) : W * 0.7;
    const y = k ? Math.max(120, k.top + 20) : H * 0.45;
    return { x: Math.min(W - 60, Math.max(60, x)), y };
  }

  // ------------------------------------------------------- the stage plan --
  // How full the stage is and where everyone rests, chosen when a thought arrives (nc, wishing for
  // `want`) or the stage itself changes: the cheapest of
  //   * the others where they are, the newcomer at its best free place, at the roomiest level (0…4)
  //     at which everything fits clear, and
  //   * everyone placed again at a roomier level (worth it only when that level saves more than
  //     the others' glides cost: TUNE.moveCost px of movement per level).
  // Nothing here waits for an overlap to be measured later: the result is the stage.
  _replan(env, nc = null, want = null) {
    const list = this.thoughts, snap = this._snap();
    let best = null, fixedFit = 5;
    const consider = (lv, repack) => {
      const bare = this._stageBare(lv, env);
      // (moving one that has not arrived yet costs nothing anyone sees: it simply flies somewhere else)
      let mv = 0;
      for (let i = 0; i < list.length && i < snap.n; i++) { const o = list[i]; if (o !== nc && !this._travelling(o)) mv += Math.hypot(o.home.x - snap.hx[i], o.home.y - snap.hy[i]); }
      const cost = (bare > FIT ? 1e5 + bare : 0) + lv + mv / TUNE.moveCost + (repack ? 0.2 : 0);
      if (!best || cost < best.cost) best = { cost, lv, s: this._snap(), bare };
      return bare <= FIT;
    };
    for (let lv = 0; lv <= 4; lv++) {
      this._restore(snap); this._applyLevel(lv, env);
      if (nc) nc.moveHome(this._place(nc, want, env, lv));
      // (the others' words may change side to make room; their homes stay)
      if (this._stageBare(lv, env) > FIT) { this._reside(env, lv); if (nc) nc.moveHome(this._place(nc, want, env, lv)); }
      if (consider(lv, false)) { fixedFit = lv; break; }
    }
    if (this._movable() > (nc ? 1 : 0)) {
      for (let lv = 0; lv < Math.min(5, fixedFit); lv++) {
        this._restore(snap); this._applyLevel(lv, env);
        this._repack(env, lv);
        if (consider(lv, true)) break;
      }
    }
    this._restore(best.s); this._applyLevel(best.lv, env);
    this._plan = best.lv; this._crowdBias = 0; this._blockT = 0;
    this._lastPlan = best;
    return best;
  }

  // a thought left: the stage grows back where it stands (the roomiest level at which everyone still fits)
  _regrow() {
    const env = this._envNow(nowMs()), cur = this.crowd;
    let lv = 0;
    for (; lv < cur; lv++) { this._applyLevel(lv, env); if (this._stageBare(lv, env) <= FIT) break; }
    this._applyLevel(lv, env); this._plan = lv; this._crowdBias = 0; this._blockT = 0;
    this._keyStage(env);
  }

  // the stage itself changed (the view; the bounds by more than a few px): plan it again (the count is
  // planned by add() / remove())
  _watch(env, dt) {
    const B = env.bounds, k = this._stageKey;
    this._replanT += dt;
    if (Number.isNaN(k[0])) { this._keyStage(env); return; }
    const moved = k[0] !== env.view.W || k[1] !== env.view.H || Math.abs(k[2] - B.left) > 12 || Math.abs(k[3] - B.top) > 12 || Math.abs(k[4] - B.right) > 12 || Math.abs(k[5] - B.bottom) > 12;
    if (!moved || this._replanT < 0.5) return;
    this._replanT = 0;
    this._keyStage(env);
    this._invalidateFits();
    this._replan(env);
  }
  _keyStage(env) {
    const B = env.bounds, k = this._stageKey, K = this._keep();
    k[0] = env.view.W; k[1] = env.view.H; k[2] = B.left; k[3] = B.top; k[4] = B.right; k[5] = B.bottom;
    const area = Math.max(1, (B.right - B.left) * (B.bottom - B.top) - (K ? (K.right - K.left) * (K.bottom - K.top) * 0.8 : 0));
    // (room per thought against what one needs: a 76 px thought, its effects and a full plate, with margins)
    this.room = area / Math.max(1, this.thoughts.length) / ROOM_ONE;
  }

  _movable() { let n = 0; for (const o of this.thoughts) if (!o.driven && !o.pressed && !o._leaving) n++; return n; }

  _snap() {
    const n = this.thoughts.length, s = { n, crowd: this.crowd, hx: new Float64Array(n), hy: new Float64Array(n), ci: new Int8Array(n), zf: new Float64Array(n) };
    for (let i = 0; i < n; i++) { const o = this.thoughts[i]; s.hx[i] = o.home.x; s.hy[i] = o.home.y; s.zf[i] = o.zFloor; s.ci[i] = this.tags.get(o)?.ci ?? 0; }
    return s;
  }
  _restore(s) {
    for (let i = 0; i < this.thoughts.length && i < s.n; i++) {
      const o = this.thoughts[i];
      o.home.x = s.hx[i]; o.home.y = s.hy[i]; o.zFloor = s.zf[i];
      const tg = this.tags.get(o); if (tg) tg.ci = s.ci[i];
    }
    this.crowd = s.crowd;
  }

  // the stage at a level: how far its thoughts are held, and what their words get (measured now)
  _applyLevel(lv, env) {
    this.crowd = lv;
    const zf = CROWD_Z[lv], W = env.view.W;
    for (const th of this.thoughts) {
      if (!th.driven) th.zFloor = zf;
      const tg = this.tags.get(th);
      if (tg) { tg.drop = 0; this._fitLevel(th, tg, W); }
    }
  }
  // one level fuller, in place: every home stays where it is (the thoughts shrink, the plates narrow)
  _stepCrowd(env) { this._applyLevel(Math.min(4, this._plan + this._crowdBias), env); }

  // how much the stage would overlap at rest at the level now applied (px²): footprints pairwise
  // (bodies, effects, props, words; siblings pulled free on their own), on the hero, outside the bounds
  _stageBare(lv, env) {
    const F = this._gatherFeet(null, lv), n = this._nFeet, K = this._keep(), B = env.bounds, W = env.view.W, edge = W < 360 ? 12 : 16;
    // (what _place allows: a body's padding on the bounds, a plate's at the screen's own margin)
    const xl = Math.min(B.left - 6, edge - PAD_T), xr = Math.max(B.right + 6, W - edge + PAD_T), yt = B.top - PAD_T, yb = B.bottom + 2 + PAD_T;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const a = F[i];
      for (let j = i + 1; j < n; j++) { const b = F[j]; sum += overP(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3]); }
      if (K) sum += 4 * overA(a[0], a[1], a[2], a[3], K.left - 6, K.top - 6, K.right + 6, K.bottom + 6);
      sum += 40 * (Math.max(0, xl - a[0] - 0.5) + Math.max(0, a[2] - xr - 0.5) + Math.max(0, yt - a[1] - 0.5) + Math.max(0, a[3] - yb - 0.5));
    }
    return sum;
  }

  // ------------------------------------------------------------ layout --
  // How a thought sits round its anchor: offsets (CSS px, ≥ 0) of everything it draws from the drawn
  // body centre — live (its extent) and smoothed: it grows at once and shrinks slowly, so limits
  // never jitter with a wobble — plus where the body is drawn relative to its home (sink, drift, bob).
  _extent(th, dt) {
    const R = th.render, e = th._ext || (th._ext = { l: 0, r: 0, t: 0, b: 0, dx: 0, dy: 0, rx: 0, ry: 0, init: false });
    const x = th.extent(this._rect);
    const l = R.cx - x.left, r = x.right - R.cx, t = R.cy - x.top, b = x.bottom - R.cy;
    // before it has fully appeared, plan for its full size (it grows from a small seed)
    const pr = th.ov.appear < 1 ? this._predict(th) : null;
    const k = Math.min(1, dt * 1.2), init = e.init;
    e.l = smoothGrow(e.l, pr ? Math.max(l, pr.l) : l, k, init); e.r = smoothGrow(e.r, pr ? Math.max(r, pr.r) : r, k, init);
    e.t = smoothGrow(e.t, pr ? Math.max(t, pr.t) : t, k, init); e.b = smoothGrow(e.b, pr ? Math.max(b, pr.b) : b, k, init);
    const dx = R.cx - th.x, dy = R.cy - th.y;
    // (dx/dy follow its life within a third of a second; rx/ry are its slow average — where it rests, its
    // bob, tremble, darts and hops taken out — where its words sit)
    if (!e.init) { e.dx = e.rx = dx; e.dy = e.ry = dy; }
    else { e.dx += (dx - e.dx) * Math.min(1, dt * 3); e.dy += (dy - e.dy) * Math.min(1, dt * 3); e.rx += (dx - e.rx) * Math.min(1, dt * 0.7); e.ry += (dy - e.ry) * Math.min(1, dt * 0.7); }
    e.init = true;
    return e;
  }

  // the extent a thought will have at rest at its target depth (offsets from its centre): its size,
  // feeling, the siblings round it and its prop
  _predict(th, zAt) {
    const p = th._pred || (th._pred = { l: 0, r: 0, t: 0, b: 0 });
    const z = Number.isFinite(zAt) ? Math.max(th.zGoal, zAt) : Math.max(th.zGoal, th.zFloor);
    const P = th.r * 2 * th.scale * (1 - 0.5 * z) * (1 - 0.16 * th.style.motion.shrink * 0.7), W = P * th.aspect;
    // (puffed cheeks and a squashed body are wider; a hopping one squashes as it lands)
    const bo = th.style.body || {}, hop = th.style.motion.hop > 0 ? 0.05 * P : 0;
    const wide = 0.55 * Math.min(1.5, bo.puff || 0) * PUFF_K * P + (W / 2) * 0.62 * Math.max(0, bo.squash || 0) + hop;
    p.l = p.r = W / 2 + 2 + wide; p.t = P / 2 + 2 + hop; p.b = P / 2 + 2;
    for (const s of th.siblings) {
      if (s.free) continue;
      const Ps = s.r * 2 * th.scale * (1 - 0.5 * z), rad = (P / 2 + Ps / 2) * 0.96;
      const x = Math.cos(s._orbitA) * rad * 1.08, y = Math.sin(s._orbitA) * rad * 0.9;
      p.l = Math.max(p.l, -x + Ps * 0.56); p.r = Math.max(p.r, x + Ps * 0.56); p.t = Math.max(p.t, -y + Ps * 0.52); p.b = Math.max(p.b, y + Ps * 0.52);
    }
    const fx = th.style.fx;
    if (fx.rain > 0) { p.t = Math.max(p.t, P * 1.3); p.l = Math.max(p.l, W * 0.56); p.r = Math.max(p.r, W * 0.56); }
    if (fx.steam > 0) { p.t = Math.max(p.t, P * 1.4); p.l = Math.max(p.l, W * 0.42 + P * 0.42); p.r = Math.max(p.r, W * 0.42 + P * 0.42); }
    if (fx.crackle > 0) { p.t = Math.max(p.t, P * 0.66); p.l = Math.max(p.l, W / 2 + wide + P * 0.16); p.r = Math.max(p.r, W / 2 + wide + P * 0.16); }
    if (th.kind === 'belief') {
      // (measured: the stone flattens and widens the body under it; the shell's hinge and dome; the
      // thread's pinch lifts the head; the charm hangs low on its cord)
      if (th.prop === 'stone') { p.t = Math.max(p.t, P * 0.5 + P * 0.34 * 1.5); p.l = Math.max(p.l, W / 2 + 0.24 * P + 2); p.r = Math.max(p.r, W / 2 + 0.1 * P + 2); if (th.propState.downing || th.propState.landed) p.r = Math.max(p.r, W / 2 + P * 0.75); }
      if (th.prop === 'shell') { p.t = Math.max(p.t, P * 0.85); p.l = Math.max(p.l, W * 0.62); p.r = Math.max(p.r, W / 2 + 0.12 * P + 2); }
      if (th.prop === 'thread') p.t = Math.max(p.t, P * 0.57 + 2);
      if (th.prop === 'charm') { p.l = Math.max(p.l, W * 0.62); p.b = Math.max(p.b, P * 0.94); }
    }
    return p;
  }
  // for planning: the prediction, or the live extent when it is already at that depth and bigger
  _planExt(o) {
    const p = this._predict(o), e = o._ext;
    if (e && e.init && o.ov.appear >= 1 && Math.abs(o.z - Math.max(o.zGoal, o.zFloor)) < 0.05) { p.l = Math.max(p.l, e.l); p.r = Math.max(p.r, e.r); p.t = Math.max(p.t, e.t); p.b = Math.max(p.b, e.b); }
    return p;
  }

  // how far below its home the body will rest once its feeling shows (sadness sinks; far away floats higher)
  _restDy(th) {
    const z = Math.max(th.zGoal, th.zFloor), P = th.r * 2 * th.scale * (1 - 0.5 * z);
    const e = 0.3 + 0.7 * clamp(th.state.tension);
    return th.style.motion.sink * e * P + 0.12 * th.levels.settle.goal * P - z * 0.45 * th.r;
  }

  // the words' rect for candidate ci, relative to the drawn body centre (into out: [l, t, r, b]); e: extent
  // offsets (as _tags places them: below the body itself, above whatever is over its head, beside all of it)
  _tagRel(th, e, ci, w, h, out) {
    const side = CANDS[2 * ci], sl = CANDS[2 * ci + 1];
    const z = Math.max(th.zGoal, th.zFloor), gap = 14 + 8 * (1 - z);
    const bh = th.r * th.scale * (1 - 0.5 * z) * (1 - 0.16 * th.style.motion.shrink * 0.7);
    if (ci >= NC) { const tg = this.tags.get(th); out[0] = (tg?.wx || 0) - w / 2; out[1] = (tg?.wy || 0) - h / 2; out[2] = out[0] + w; out[3] = out[1] + h; return out; }
    if (side === 0) { out[0] = -w / 2 + sl * w; out[1] = bh + gap; }
    else if (side === 1) { out[0] = -w / 2 + sl * w; out[1] = -e.t - gap - h; }
    else if (side === 2) { out[0] = e.r + gap; out[1] = -h / 2 + sl * (h / 2 + bh); }
    else { out[0] = -e.l - gap - w; out[1] = -h / 2 + sl * (h / 2 + bh); }
    out[2] = out[0] + w; out[3] = out[1] + h;
    return out;
  }

  // Where a thought rests (and where its words go) at a level: the free place nearest to `want` on a
  // grid over the bounds, scored against the hero, every other footprint (bodies, effects, props, words,
  // siblings pulled free) and the edges. fresh: placing everyone again (room for all matters more than
  // each one's wish).
  _place(th, want, env, lv, fresh = false, win = 0) {
    const B = env.bounds, K = this._keep();
    const e = this._planExt(th);
    const eS = this._eS || (this._eS = { l: 0, r: 0, t: 0, b: 0 });
    eS.l = e.l; eS.r = e.r; eS.t = e.t; eS.b = e.b;
    const el = eS.l, er = eS.r, et = eS.t, eb = eS.b;
    const tg = this.tags.get(th);
    const w = tg?.w || 0, h = tg?.h || 0;
    const F = this._gatherFeet(th, lv), n = this._nFeet;
    // its words' place for each candidate, relative to the body (the same at every point of the grid),
    // and how much each would rather not be used: below first, then above, right, left, then slid; never
    // above a feeling whose effects rise over its head; the host's wish
    const RL = this._relsP || (this._relsP = new Float64Array(4 * NC_PLAN)), PEN = this._penP || (this._penP = new Float64Array(NC_PLAN));
    const rel = this._relP || (this._relP = [0, 0, 0, 0]), fa = fxAbove(th);
    let penMin = Infinity;
    for (let c = 0; c < NC_PLAN && w; c++) {
      this._tagRel(th, eS, c, w, h, rel);
      RL[4 * c] = rel[0] - PAD_T; RL[4 * c + 1] = rel[1] - PAD_T; RL[4 * c + 2] = rel[2] + PAD_T; RL[4 * c + 3] = rel[3] + PAD_T;
      let pen = c * 40 + Math.abs(CANDS[2 * c + 1]) * 120 + (this._beside && CANDS[2 * c] < 2 ? 400 : 0);
      if (fa && CANDS[2 * c] === 1) pen += 3000;
      if (th.labelSide && SIDE_NAMES[CANDS[2 * c]] === th.labelSide) pen -= 200;
      PEN[c] = pen; if (pen < penMin) penMin = pen;
    }
    if (!w) penMin = 0;
    const VW = env.view.W, edge = VW < 360 ? 12 : 16, wk = fresh ? TUNE.wish : 4, grav = this._grav || 0, amp = this._amp(th);
    let minX = B.left + el, maxX = Math.max(minX, B.right - er), minY = B.top + et, maxY = Math.max(minY, B.bottom - eb);
    // (a window round `want`: a short glide, never across the stage)
    if (win > 0) { const wy = want.y + this._restDy(th); minX = clamp(want.x - win, minX, maxX); maxX = clamp(want.x + win, minX, maxX); minY = clamp(wy - win, minY, maxY); maxY = clamp(wy + win, minY, maxY); }
    const R = this._plc || (this._plc = { bs: Infinity, bx: 0, by: 0, bci: 0, bare: 0 });
    R.bs = Infinity; R.bx = want.x; R.by = want.y; R.bci = tg?.ci ?? 0; R.bare = 0;
    const tryAt = (x, y) => {
      const d = Math.hypot(x - want.x, y - want.y - (win > 0 ? this._restDy(th) : 0)) * wk + grav * (y - minY);
      // the body and everything it draws
      const l = x - el - 6 - amp, t = y - et - 4 - amp, r = x + er + 6 + amp, b = y + eb + 4 + amp;
      let over = 0;
      for (let i = 0; i < n; i++) { const q = F[i]; over += overP(l, t, r, b, q[0], q[1], q[2], q[3]); }
      let bare = over;
      if (K) { const k = overA(l, t, r, b, K.left - 10, K.top - 10, K.right + 10, K.bottom + 10); over += 30 * k; bare += k; }
      if (over + d + penMin >= R.bs) return;
      // its words: the best place for them here
      let tbest = 0, tci = 0, tbare = 0;
      if (w) {
        tbest = Infinity;
        for (let c = 0; c < NC_PLAN; c++) {
          const tl = x + RL[4 * c], tt = y + RL[4 * c + 1], tr = x + RL[4 * c + 2], tb = y + RL[4 * c + 3];
          let ov = 0, ob = 0;
          // (how far off the stage it would hang: the screen's margin at the sides, the bounds above and below)
          const off = Math.max(0, edge - PAD_T - tl) + Math.max(0, tr - VW + edge - PAD_T) + Math.max(0, B.top - PAD_T - tt) + Math.max(0, tb - B.bottom - 2 - PAD_T);
          if (off > 0) { ov += 2000 + 40 * off * h; ob += off * h; }
          for (let i = 0; i < n; i++) { const q = F[i], a = overP(tl, tt, tr, tb, q[0], q[1], q[2], q[3]); ov += 1.5 * a; ob += a; }
          if (K) { const a = overA(tl, tt, tr, tb, K.left - 6, K.top - 6, K.right + 6, K.bottom + 6); ov += 30 * a; ob += a; }
          if (ov + PEN[c] < tbest) { tbest = ov + PEN[c]; tci = c; tbare = ob; }
        }
      }
      const sc = over + tbest + d;
      if (sc < R.bs) { R.bs = sc; R.bx = x; R.by = y; R.bci = tci; R.bare = bare + tbare; }
    };
    // a coarse grid over the bounds, then finer round the best of it
    const sx = Math.max(8, (maxX - minX) / 12), sy = Math.max(8, (maxY - minY) / 14);
    for (let x = minX; x <= maxX + 0.5; x += sx) for (let y = minY; y <= maxY + 0.5; y += sy) tryAt(x, y);
    const cx = R.bx, cy = R.by;
    for (let gx = -3; gx <= 3; gx++) for (let gy = -3; gy <= 3; gy++) if (gx || gy) tryAt(clamp(cx + (gx * sx) / 3, minX, maxX), clamp(cy + (gy * sy) / 3, minY, maxY));
    if (tg) tg.ci = R.bci;
    this._placeBare = R.bare;
    // the drawn body sits off its home a little (a sad thought sinks, a far one floats higher): the home
    // is placed for the drawn body, as it will rest once its feeling shows
    return { x: R.bx, y: R.by - this._restDy(th) };
  }

  // Place every free thought again: three starts (largest first; smallest first; largest first with
  // the words beside rather than below — what a narrow phone stage usually needs), each improved by
  // placing one thought at a time again against all the others; the stage that overlaps least is kept.
  _repack(env, lv) {
    const order = this._order || (this._order = []);
    order.length = 0;
    for (const o of this.thoughts) {
      if (o.driven || o.pressed || o._leaving) continue;
      const p = this._predict(o), tg = this.tags.get(o);
      o._size = (p.l + p.r) * (p.t + p.b) + (tg?.w || 0) * (tg?.h || 0);
      order.push(o);
    }
    order.sort((a, b) => b._size - a._size);
    const run = (rev, beside, grav) => {
      this._beside = beside; this._grav = grav;
      for (const o of order) o._unplaced = true;
      for (let k = 0; k < order.length; k++) { const o = order[rev ? order.length - 1 - k : k]; o._unplaced = false; o.moveHome(this._place(o, o._want || o.home, env, lv, true)); }
      this._beside = false; this._grav = 0;
      let bare = this._stageBare(lv, env);
      // one at a time again, against everyone else where they now are (keeps only what helps)
      for (let pass = 0; pass < 2 && bare > FIT; pass++) {
        for (const o of order) {
          const tg = this.tags.get(o), hx = o.home.x, hy = o.home.y, ci = tg?.ci ?? 0;
          o.moveHome(this._place(o, o._want || o.home, env, lv, true));
          const b = this._stageBare(lv, env);
          if (b < bare - 1) bare = b; else { o.home.x = hx; o.home.y = hy; if (tg) tg.ci = ci; }
        }
      }
      return bare;
    };
    let best = Infinity, B = null;
    for (const [rev, beside, grav] of REPACK_STARTS) {
      if (B) this._restore(B.s0);
      const s0 = B ? B.s0 : this._snap();
      const bare = run(rev, beside, grav);
      if (bare < best) { best = bare; B = { s0, s: this._snap() }; } else if (!B.s0) B.s0 = s0;
      if (best <= FIT || order.length < 2) break;
    }
    this._restore(B.s);
    return best;
  }

  // the others' words may change side to make room (their homes stay): each takes the side that leaves
  // the stage overlapping least, twice round
  _reside(env, lv) {
    let bare = this._stageBare(lv, env);
    for (let pass = 0; pass < 2 && bare > FIT; pass++) {
      for (const o of this.thoughts) {
        const tg = this.tags.get(o);
        if (!tg || !tg.w || o.driven || o._leaving) continue;
        let bc = tg.ci;
        for (let c = 0; c < NC_PLAN; c++) {
          if (c === bc) continue;
          const was = tg.ci; tg.ci = c;
          const b = this._stageBare(lv, env);
          if (b < bare - 1) { bare = b; bc = c; } else tg.ci = was;
        }
        tg.ci = bc;
      }
    }
    return bare;
  }

  // everyone's footprint but `skip`'s (lv ≥ 0: at rest at the level applied, as planned; −1: live), and
  // each sibling pulled free on its own (skip's too: they are separate bodies now)
  _gatherFeet(skip, lv) {
    const F = this._feet || (this._feet = []);
    let n = 0;
    for (const o of this.thoughts) {
      if (o._leaving || o._unplaced) continue;
      if (o !== skip) {
        const q = F[n] || (F[n] = new Float64Array(4)); n++;
        if (lv >= 0) this._footAt(o, q);
        else { const f = this._foot(o); q[0] = f.l; q[1] = f.t; q[2] = f.r; q[3] = f.b; }
      }
      for (const s of o.siblings) {
        if (!s.free || !s.render.ready) continue;
        const g = this._sibFoot(s), q = F[n] || (F[n] = new Float64Array(4)); n++;
        q[0] = g.l; q[1] = g.t; q[2] = g.r; q[3] = g.b;
      }
    }
    this._nFeet = n;
    return F;
  }

  // a thought's footprint at rest at its home, at the level applied (as planned), into out [l, t, r, b]
  _footAt(o, out) {
    const p = this._planExt(o), z = Math.max(o.zGoal, o.zFloor);
    const x = o.home.x, y = o.home.y + this._restDy(o);
    const P = o.r * 2 * o.scale * (1 - 0.5 * z), sp = 1 + 0.9 * Math.max(o.levels.space.goal, o.earned.space);
    const pw = ((P * o.aspect) / 2) * (sp - 1), ph = (P / 2) * (sp - 1), a = this._amp(o);
    out[0] = x - p.l - pw - 6 - a; out[1] = y - p.t - ph - 4 - a; out[2] = x + p.r + pw + 6 + a; out[3] = y + p.b + ph + 4 + a;
    const tg = this.tags.get(o);
    if (tg && tg.w) {
      const rel = this._tagRel(o, p, tg.ci, tg.w, tg.h, this._relA || (this._relA = [0, 0, 0, 0]));
      out[0] = Math.min(out[0], x + rel[0] - PAD_T); out[1] = Math.min(out[1], y + rel[1] - PAD_T);
      out[2] = Math.max(out[2], x + rel[2] + PAD_T); out[3] = Math.max(out[3], y + rel[3] + PAD_T);
    }
    return out;
  }

  // where its footprint is when it rests at home (live): everything it draws, and (words) its plate
  _foot(th, words = true) {
    const f = th._footRect || (th._footRect = { l: 0, r: 0, t: 0, b: 0 });
    const R = th.render, e = th._ext || this._extent(th, 0), sp = 1 + 0.9 * Math.max(th.levels.space.cur, th.earned.space);
    const x = th.home.x + e.dx, y = th.home.y + e.dy;
    // space() widens its room (round the body; effects and props as they are)
    const pw = (R.W / 2) * (sp - 1), ph = (R.P / 2) * (sp - 1);
    f.l = x - e.l - pw - 6; f.r = x + e.r + pw + 6; f.t = y - e.t - ph - 4; f.b = y + e.b + ph + 4;
    const tg = words ? this.tags.get(th) : null;
    if (tg && tg.w) {
      // the words where they sit now (relative to the thought), or on their chosen side before they show;
      // a feeling whose effects rise over its head keeps room for its words below it, never above
      let dl, dtp;
      const up = fxAbove(th) && CANDS[2 * tg.ci] === 1;
      if (tg.live && !up) { dl = tg.rl - R.cx; dtp = tg.rt - R.cy; }
      else { const rel = this._tagRel(th, e, up ? 0 : tg.ci, tg.w, tg.h, this._relB || (this._relB = [0, 0, 0, 0])); dl = rel[0]; dtp = rel[1]; }
      f.l = Math.min(f.l, x + dl - PAD_T); f.r = Math.max(f.r, x + dl + tg.w + PAD_T);
      f.t = Math.min(f.t, y + dtp - PAD_T); f.b = Math.max(f.b, y + dtp + tg.h + PAD_T);
    }
    return f;
  }

  // a sibling pulled free: its own footprint at its home, and the limits that keep it in the bounds
  _sibFoot(s) {
    const f = s._footRect || (s._footRect = { l: 0, r: 0, t: 0, b: 0 });
    const b = s._bbox(), dx = s.home.x - s._pos.x, dy = s.home.y - s._pos.y;
    f.l = b.left + dx - 5; f.r = b.right + dx + 5; f.t = b.top + dy - 4; f.b = b.bottom + dy + 4;
    return f;
  }
  _sibLim(s, B) {
    const L = s._lim || (s._lim = { minX: 0, maxX: 0, minY: 0, maxY: 0 });
    const b = s._bbox(), R = s.render, dx = R.cx - s._pos.x, dy = R.cy - s._pos.y;
    L.minX = B.left + (R.cx - b.left) - dx; L.maxX = Math.max(L.minX, B.right - (b.right - R.cx) - dx);
    L.minY = B.top + (R.cy - b.top) - dy; L.maxY = Math.max(L.minY, B.bottom - (b.bottom - R.cy) - dy);
    return L;
  }

  _free(th) { return !(th.driven || th.pressed || th._glide); }
  // how far its body moves about its resting place (px): its bob, tremble, sway, an anxious wander, a
  // restless hop — the room the words leave round it (nothing for reduced motion, which stills them)
  _amp(th) {
    if (th.reducedMotion) return 1;
    const m = th.style.motion, z = Math.max(th.zGoal, th.zFloor), P = th.r * 2 * th.scale * (1 - 0.5 * z);
    return P * (m.bob + m.tremble + m.sway + (m.dart > 1 ? 0.08 : 0) + (m.hop > 0 ? 0.22 : 0)) + 1;
  }
  _resting(th) { return th.ov.appear >= 1 && this._free(th) && !th._leaving && Math.hypot(th.x - th.home.x, th.y - th.home.y) < 0.3 * th.render.P; }

  // homes: room between thoughts (a gentle push), a lonely one's drift, a short glide for one boxed in,
  // a step fuller in place when the words have nowhere clear — then, as hard limits, inside the bounds
  // and clear of the hero (the hero takes touches first; nothing may sit on it), siblings pulled free too
  _arrange(dt, env) {
    const B = env.bounds, K = this._keep(), list = this.thoughts;
    for (const th of list) {
      // (the body and everything it draws stay in the bounds; its words find their own clear place, inside
      // the stage, each frame — the planner made room for them, nothing is pushed for them now)
      const e = this._extent(th, dt);
      const lim = th._lim || (th._lim = { minX: 0, maxX: 0, minY: 0, maxY: 0 });
      lim.minX = B.left + e.l - e.dx; lim.maxX = B.right - e.r - e.dx;
      lim.minY = B.top + e.t - e.dy; lim.maxY = B.bottom - e.b - e.dy;
      if (lim.maxX < lim.minX) lim.maxX = lim.minX = (lim.minX + lim.maxX) / 2;
      if (lim.maxY < lim.minY) lim.maxY = lim.minY;
    }
    // room between them: footprints (body + effects + prop + words, and each sibling pulled free) never
    // overlap; space() widens one's room
    const M = this._movers || (this._movers = []);
    let nm = 0;
    for (const th of list) {
      // (settled: at rest for a moment — just arrived, its squash and stretch still swell its outline)
      th._restT = this._resting(th) ? (th._restT || 0) + dt : 0;
      const m = M[nm] || (M[nm] = { o: null, f: null, lim: null, move: false, ov: 0, set: false }); nm++;
      // (bodies only: the words find their own clear place each frame; nothing is pushed for them at rest)
      m.o = th; m.f = this._foot(th, false); m.lim = th._lim; m.move = this._free(th) && !th._leaving; m.ov = 0; m.set = th._restT > 0.8 || th.pressed;
      for (const s of th.siblings) {
        if (!s.free || !s.render.ready) continue;
        const q = M[nm] || (M[nm] = { o: null, f: null, lim: null, move: false, ov: 0, set: false }); nm++;
        q.o = s; q.f = this._sibFoot(s); q.lim = this._sibLim(s, B); q.move = !s.pressed && !s.driven && !s._glide; q.ov = 0; q.set = !s._glide;
      }
    }
    for (let i = 0; i < nm; i++) {
      for (let j = i + 1; j < nm; j++) {
        const A = M[i], C = M[j], fa = A.f, fc = C.f;
        const ox = Math.min(fa.r, fc.r) - Math.max(fa.l, fc.l), oy = Math.min(fa.b, fc.b) - Math.max(fa.t, fc.t);
        // (margins touching by a few px is not an overlap: nothing moves for it)
        if (ox <= 6 || oy <= 6) continue;
        A.ov += ox * oy; C.ov += ox * oy;
        // nothing moves for a thought still arriving or settling: the plan made room for it
        if (!A.set || !C.set) continue;
        const ma = A.move ? 1 : 0, mc = C.move ? 1 : 0;
        if (!ma && !mc) continue;
        const sa = ma / (ma + mc), sc = mc / (ma + mc);
        const kk = Math.min(1, dt * 4);
        // the smaller overlap, unless the bounds leave no room that way
        const la = A.lim, lc = C.lim, ha = A.o.home, hc = C.o.home, aLeft = fa.l + fa.r < fc.l + fc.r, aUp = fa.t + fa.b < fc.t + fc.b;
        const roomX = aLeft ? (ha.x - la.minX) * ma + (lc.maxX - hc.x) * mc : (la.maxX - ha.x) * ma + (hc.x - lc.minX) * mc;
        const roomY = aUp ? (ha.y - la.minY) * ma + (lc.maxY - hc.y) * mc : (la.maxY - ha.y) * ma + (hc.y - lc.minY) * mc;
        let horiz = ox < oy;
        const short = horiz;
        if (horiz && roomX < ox * 0.5 && roomY > roomX) horiz = false;
        else if (!horiz && roomY < oy * 0.5 && roomX > roomY) horiz = true;
        // the short way apart at the gentle rate; the long way round (the short way is blocked) slowly,
        // at most 40 px a second, so nothing ever sweeps across the stage
        const cap = horiz === short ? Infinity : 40 * dt;
        if (horiz) { const d = (aLeft ? -1 : 1) * Math.min(ox * kk, cap); ha.x += d * sa; hc.x -= d * sc; }
        else { const d = (aUp ? -1 : 1) * Math.min(oy * kk, cap); ha.y += d * sa; hc.y -= d * sc; }
      }
    }
    for (let i = 0; i < nm; i++) if (M[i].o.kind !== 'sibling') M[i].o._ov = M[i].ov;
    // a lonely thought drifts into the free room found for it, and pauses while its footprint would touch
    // another's or the bounds hold it (blocked a while: it looks for room again from where it is)
    for (const th of list) {
      const L = th._lim, h = th.home;
      th._driftBlocked = th._ov > 0 || h.x <= L.minX + 2 || h.x >= L.maxX - 2 || h.y <= L.minY + 2 || h.y >= L.maxY - 2;
      if (!(th.style.motion.drift > 0) || th._driftEnd || !(th.look.motion.drift > 0.02)) continue;
      if (!th._driftPlanned) { if (this._resting(th)) this._planDrift(th, env); continue; }
      th._driftBlockT = th._driftBlocked && th._driftD < th._driftMax - 2 ? (th._driftBlockT || 0) + dt : 0;
      if (th._driftBlockT > 1.5) this._planDrift(th, env);
    }
    // still blocked at rest — words with nowhere clear, or bodies on bodies: the whole stage steps one
    // level fuller in place (smaller thoughts, shorter plates) and every home stays where it is
    let blocked = 0, resting = 0;
    for (const th of list) { if (!this._resting(th)) continue; resting++; if (this.tags.get(th)?.blocked) blocked++; }
    const bodies = resting === list.length && list.length > 1 ? this._bodyOverlap() : 0;
    this._blockT = blocked || bodies > 400 ? this._blockT + dt : Math.min(0, this._blockT + dt);
    if (this._blockT > 0.3 && this.crowd < 4) { this._crowdBias++; this._blockT = -1; this._stepCrowd(env); }
    // its words boxed in at rest on a packed stage (nowhere clear, even with fewer words): only that thought
    // glides (≤ max(56 px, 0.9 P)) to the nearest place where they fit — once, then it rests
    for (const th of list) {
      const tg = this.tags.get(th);
      th._blockedT = tg?.blocked && this._resting(th) && this.crowd >= 4 ? (th._blockedT || 0) + dt : 0;
      if (th._blockedT > 0.8 && !(th._wordNudges >= 2)) {
        th._blockedT = 0; th._wordNudges = (th._wordNudges || 0) + 1;
        const reach = Math.max(56, 0.9 * th.render.P), want = this._wantH || (this._wantH = { x: 0, y: 0 });
        want.x = th.home.x; want.y = th.home.y;
        const ci = tg.ci, h = this._place(th, want, env, -1, false, reach);
        const dd = Math.hypot(h.x - th.home.x, h.y - th.home.y);
        if (dd > reach) { h.x = th.home.x + ((h.x - th.home.x) * reach) / dd; h.y = th.home.y + ((h.y - th.home.y) * reach) / dd; }
        // (only a real move re-places its words; nowhere better: they stay as they are)
        if (this._placeBare < 40 && Math.hypot(h.x - th.home.x, h.y - th.home.y) > 3) { th.moveHome(h); tg.drop = 0; tg.live = false; } else tg.ci = ci;
      }
    }
    // boxed in for a while: a short glide to free room nearby (≤ max(56 px, 0.9 P); never across the stage)
    for (const th of list) {
      // only at rest: arriving thoughts cross each other's paths on their way home
      if (!this._resting(th)) { th._stuck = Math.min(0, th._stuck || 0); continue; }
      // (a sliver of padding is not being boxed in: a real overlap is a good part of its footprint)
      const f = this._foot(th, false), big = Math.max(500, 0.07 * (f.r - f.l) * (f.b - f.t));
      th._stuck = th._ov > big ? (th._stuck || 0) + dt : Math.min(0, (th._stuck || 0) + dt);
      if (th._stuck > 1.2) { this._nudge(th, K); th._stuck = -3; }
    }
    // hard limits last: the bounds, then never on the hero (out by the nearest way that stays in bounds)
    for (const th of list) {
      if (this._free(th)) this._limit(th.home, this._foot(th, false), th._lim, K, th);
      for (const s of th.siblings) {
        if (!s.free || s.pressed || s.driven || s._glide || !s.render.ready) continue;
        this._limit(s.home, this._sibFoot(s), this._sibLim(s, B), K, s);
      }
    }
  }

  // inside its limits, then off the hero: out by the nearest way that stays in bounds — and, of those,
  // the one with the most room (two thoughts are never both pushed into the same corner)
  _limit(h, f, L, K, who) {
    const x0 = h.x, y0 = h.y;
    h.x = clamp(h.x, L.minX, Math.max(L.minX, L.maxX)); h.y = clamp(h.y, L.minY, Math.max(L.minY, L.maxY));
    const fl = x0 - f.l, fr = f.r - x0, ft = y0 - f.t, fb = f.b - y0;
    if (!K) return;
    const l = K.left - fr - 4, r = K.right + fl + 4, t = K.top - fb - 4, b = K.bottom + ft + 2;
    if (!(h.x > l && h.x < r && h.y > t && h.y < b)) return;
    let bx = 0, by = 0, bd = Infinity, fx = 0, fy = 0, fd = Infinity;
    for (let q = 0; q < 4; q++) {
      const x = q === 0 ? l : q === 1 ? r : h.x, y = q === 2 ? t : q === 3 ? b : h.y;
      const d = Math.abs(x - h.x) + Math.abs(y - h.y);
      if (d < fd) { fd = d; fx = x; fy = y; }
      if (!(x >= L.minX - 0.5 && x <= L.maxX + 0.5 && y >= L.minY - 0.5 && y <= L.maxY + 0.5)) continue;
      let crowd = 0;
      const dx = x - x0, dy = y - y0;
      for (const o of this.thoughts) { if (o === who) continue; const g = this._foot(o, false); crowd += overA(f.l + dx, f.t + dy, f.r + dx, f.b + dy, g.l, g.t, g.r, g.b); }
      const cost = d + crowd * 0.05;
      if (cost < bd) { bd = cost; bx = x; by = y; }
    }
    if (bd === Infinity) { bx = fx; by = fy; }
    h.x = bx; h.y = by;
  }

  // what actually overlaps on screen (px²) at rest: everything each body draws, no padding (siblings pulled free included)
  _bodyOverlap() {
    let sum = 0;
    const list = this.thoughts, X = this._exs || (this._exs = []);
    let n = 0;
    for (const th of list) {
      const a = X[n] || (X[n] = {}); n++; th.extent(a);
      for (const s of th.siblings) if (s.free && s.render.ready) { const q = X[n] || (X[n] = {}); n++; const b = s._bbox(); q.left = b.left; q.top = b.top; q.right = b.right; q.bottom = b.bottom; }
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = X[i], b = X[j]; sum += overA(a.left, a.top, a.right, a.bottom, b.left, b.top, b.right, b.bottom); }
    return sum;
  }

  // a short glide (≤ about one body height) to the least crowded home nearby; true when it found clearly more room
  _nudge(th, K) {
    const L = th._lim, f0 = this._foot(th, false);
    const ofl = f0.l - th.home.x, ofr = f0.r - th.home.x, oft = f0.t - th.home.y, ofb = f0.b - th.home.y;
    const F = this._gatherFeet(th, -1), n = this._nFeet;
    const over = (x, y) => {
      let a = 0;
      for (let i = 0; i < n; i++) { const q = F[i]; a += overA(x + ofl, y + oft, x + ofr, y + ofb, q[0], q[1], q[2], q[3]); }
      if (K) a += 30 * overA(x + ofl, y + oft, x + ofr, y + ofb, K.left - 6, K.top - 6, K.right + 6, K.bottom + 6);
      return a;
    };
    const reach = Math.max(56, 0.9 * th.render.P), x0 = th.home.x, y0 = th.home.y;
    const o0 = over(x0, y0);
    let bx = x0, by = y0, bo = o0, best = o0;
    for (let gx = -6; gx <= 6; gx++) {
      for (let gy = -6; gy <= 6; gy++) {
        if (gx * gx + gy * gy > 36) continue;           // (within the reach: a circle, not a square)
        const x = clamp(x0 + (gx / 6) * reach, L.minX, Math.max(L.minX, L.maxX)), y = clamp(y0 + (gy / 6) * reach, L.minY, Math.max(L.minY, L.maxY));
        const ov = over(x, y), sc = ov + Math.hypot(x - x0, y - y0) * 8;
        if (sc < best) { best = sc; bx = x; by = y; bo = ov; }
      }
    }
    if (bo > o0 * 0.6) return false;
    th.home.x = bx; th.home.y = by;
    return true;
  }

  // Loneliness: the free room it drifts into — away from the hero and the others, its whole footprint
  // (words included) inside the bounds and clear of everyone along the way, up to 90 px in all.
  _planDrift(th, env) {
    const L = th._lim, f0 = this._foot(th), x0 = th.home.x, y0 = th.home.y, K = this._keep();
    const fl = f0.l - x0, fr = f0.r - x0, ft = f0.t - y0, fb = f0.b - y0;
    const F = this._gatherFeet(th, -1), n = this._nFeet;
    // (its words go with it: they stay inside the screen's margin and the stage, never pushed back onto it)
    const W = env.view.W, edge = W < 360 ? 12 : 16, B = env.bounds;
    let ax = 0, ay = 0;
    if (env.away) { const dx = x0 - env.away.x, dy = y0 - env.away.y, d = Math.hypot(dx, dy) || 1; ax += dx / d; ay += dy / d; }
    for (const o of this.thoughts) {
      if (o === th) continue;
      const dx = x0 - o.home.x, dy = y0 - o.home.y, d = Math.hypot(dx, dy) || 1, w = 0.6 * clamp(160 / d);
      ax += (dx / d) * w; ay += (dy / d) * w;
    }
    const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
    const budget = Math.max(0, 90 - th._driftD);
    let best = -Infinity, bux = 0, buy = 0, bd = 0;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
      let reach = 0;
      for (let d = 12; d <= budget + 0.1; d += 6) {
        const x = x0 + ux * d, y = y0 + uy * d;
        if (x < L.minX || x > L.maxX || y < L.minY || y > L.maxY) break;
        if (x + fl < edge - PAD_T || x + fr > W - edge + PAD_T || y + ft < B.top - PAD_T || y + fb > B.bottom + 2 + PAD_T) break;
        let hit = K ? overA(x + fl, y + ft, x + fr, y + fb, K.left - 6, K.top - 6, K.right + 6, K.bottom + 6) > 0 : false;
        for (let i = 0; i < n && !hit; i++) { const q = F[i]; if (overP(x + fl, y + ft, x + fr, y + fb, q[0], q[1], q[2], q[3]) > 0) hit = true; }
        if (hit) break;
        reach = d;
      }
      // as far as it can go, mostly away (and a little sideways rather than up or down)
      const sc = reach + 45 * (ux * ax + uy * ay) + (Math.abs(uy) < 0.5 ? 6 : 0);
      if (reach >= 24 && sc > best) { best = sc; bux = ux; buy = uy; bd = reach; }
    }
    th._driftPlanned = true;
    th._driftDir.x = bux; th._driftDir.y = buy;
    // (no room anywhere: it stays where it is, and looks back now and then)
    th._driftMax = th._driftD + bd;
    th._driftBlockT = 0;
  }

  // ------------------------------------------------------------- words --
  _makeTag(th) {
    if (!this.tagRoot || typeof document === 'undefined') return;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tm-tag tm-${th.kind}`;
    const words = document.createElement('span');
    words.className = 'tm-words';
    words.dir = 'auto';
    el.appendChild(words);
    const label = th.kind === 'belief' ? 'Belief' : 'Thought';
    const said = th.text.trim();
    el.setAttribute('aria-label', `${label}: ${said}${/[.!?…]$/u.test(said) ? '' : '.'} Enter reads it all; hold Space to squeeze it; the arrow keys move it; Shift and an arrow strokes it.`);
    el.addEventListener('click', () => this.read(th));
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        // holding Space squeezes it (as a held finger); a button would read on Space, Enter does that here
        e.preventDefault();
        th.key({ type: 'down', key: ' ', t: nowMs() / 1000, repeat: e.repeat });
        this._changed();
        return;
      }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      if (e.shiftKey) { th.keyStroke(d[0], d[1]); this._changed(); return; }
      th.moveHome({ x: th.home.x + d[0] * 18, y: th.home.y + d[1] * 18 });
      th._explore?.(0.02);
      this._changed();
    });
    el.addEventListener('keyup', (e) => {
      if (e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      th.key({ type: 'up', key: ' ', t: nowMs() / 1000 });
      this._changed();
    });
    el.addEventListener('blur', () => { if (th.reader.keys?.space != null) th.key({ type: 'up', key: ' ', t: nowMs() / 1000 }); });
    // the words take their own taps; nothing underneath gets them
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    if (this.hidden || this.paused) el.classList.add('tm-hidden');
    if (this._k !== 1) el.style.setProperty('--tm-k', String(this._k));
    this.tagRoot.appendChild(el);
    const tg = { el, words, text: '', fits: [], cur: null, w: 0, h: 0, lines: 3, maxW: 0,
      x: 0, y: 0, vx: 0, vy: 0, rot: 0, kx: NaN, ky: NaN, kr: NaN, moving: false,
      shown: false, travel: false, wait: false, above: false, calm: false, side: 'below',
      ci: 0, pi: -1, live: false, done: false, blocked: false, drop: 0, mode: 2,
      tx: 0, ty: 0, rl: 0, rt: 0, g: new Float64Array(10), ga: new Float64Array(8), gaInit: false, gaKey: NaN, gaRest: 0, ciShown: null, hop: 0, wx: 0, wy: 0, wxShown: 0, wyShown: 0, tintQ: -1, clear: true, opQ: 20 };
    this.tags.set(th, tg);
    th.tag = el;
    th._words = wordsOf(th.text);
    const rope = { x: new Float32Array(ROPE_N), y: new Float32Array(ROPE_N), px: new Float32Array(ROPE_N), py: new Float32Array(ROPE_N), init: false, colour: '#ffffff' };
    this.ropes.set(th, rope);
  }

  // the widest a tag may be at this view width and level (CSS max-width mirrored): a fuller stage gives
  // each tag a narrower plate (fewer words, still 17 px; a tap reads all) — and its padding
  _tagMax(W, lv = this.crowd) {
    const cap = W < 361 ? [210, 210, 184, 180, 176][Math.min(4, lv)] : [232, 232, 208, 200, 192][Math.min(4, lv)];
    // (a larger text size: a plate as much wider, so it holds the same words — never wider than the screen allows)
    return Math.min(Math.round(cap * this._k), W - (W < 361 ? 28 : 40));
  }
  _tagPad(W) { return W < 361 ? 24 : 30; }
  _invalidateFits() { for (const th of this.thoughts) { const tg = this.tags.get(th); if (tg) { tg.fits.length = 0; tg.cur = null; } } }
  _resetDrops() { for (const th of this.thoughts) { const tg = this.tags.get(th); if (tg) tg.drop = 0; } }

  // the words a tag shows at its budget now: lines and plate width from the stage's level, its depth
  // (as it is going to be) and its own step down when nothing was clear at full budget
  _fitLevel(th, tg, W) {
    const lines = Math.max(1, tagLines(Math.max(th.zGoal, th.zFloor), this.crowd) - tg.drop);
    // (the last step, only on a packed stage with nowhere clear: two words on a narrower plate, not three)
    const last = tg.drop >= 3 && this.crowd + tg.drop >= 6;
    return this._fit(th, tg, lines, last ? this._tagMax(W, 4) - 26 : this._tagMax(W, Math.min(4, this.crowd + tg.drop)), W, last ? 2 : 3);
  }
  // measured once per budget (lines × width × view) and kept: switching back costs no layout
  _fit(th, tg, lines, maxW, W, minWords = 3) {
    const C = tg.fits;
    let e = null;
    for (let i = 0; i < C.length; i++) { const q = C[i]; if (q.lines === lines && q.maxW === maxW && q.W === W && q.minWords === minWords) { e = q; break; } }
    if (!e) {
      e = this._measure(th, tg, lines, maxW, W, minWords);
      if (e.w > 0) { if (C.length >= 8) C.shift(); C.push(e); }
      return e;
    }
    if (tg.cur !== e) {
      tg.cur = e;
      if (tg.text !== e.text) { tg.words.textContent = e.text; tg.text = e.text; }
      tg.el.style.maxWidth = `${e.mw}px`; tg.el.style.width = e.cssW ? `${e.cssW}px` : '';
      tg.w = e.w; tg.h = e.h; tg.lines = e.lines; tg.maxW = e.mw;
    }
    return e;
  }

  // The words for a budget: all of them when they fit `lines` at `maxW`, otherwise the most leading
  // words that do, cut at a word and marked "…" — never fewer than the first three (the plate widens
  // back for them) — and the narrowest plate that holds them in that many balanced lines.
  _measure(th, tg, lines, maxW, W, minWords = 3) {
    const el = tg.el, wd = tg.words, words = th._words || (th._words = wordsOf(th.text));
    el.classList.remove('tm-measure');
    el.style.maxWidth = `${maxW}px`;
    el.style.width = `${maxW}px`;
    let mw = maxW;
    const lh = parseFloat(getComputedStyle(wd).lineHeight) || 22;
    const fits = (txt) => { wd.textContent = txt; return wd.offsetHeight <= lines * lh + 2; };
    let text = words.join(' ');
    if (!fits(text)) {
      // the most words that fit (binary search over a prefix)…
      let lo = 1, hi = words.length - 1, ok = 0;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (fits(firstWords(words, mid))) { ok = mid; lo = mid + 1; } else hi = mid - 1; }
      // …but a crowded plate never carries fewer than the first three words (two, as the very last step on
      // a packed stage): it widens back for them
      const minK = Math.min(minWords, words.length - 1);
      if (ok < minK) {
        const wide = minWords < 3 ? maxW : this._tagMax(W, 0);
        el.style.maxWidth = `${wide}px`; el.style.width = `${wide}px`; mw = wide;
        if (fits(firstWords(words, minK))) ok = minK;
        else if (!ok) { lo = 1; hi = minK - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (fits(firstWords(words, mid))) { ok = mid; lo = mid + 1; } else hi = mid - 1; } }
      }
      if (ok) text = firstWords(words, ok);
      else {
        // one very long first word: cut inside it (by code point), still marked "…"
        let n = Math.max(2, Array.from(words[0] || '').length);
        do { n = Math.floor(n * 0.85); text = wordsExcerpt(th.text, n); } while (n > 3 && !fits(text));
      }
    }
    tg.words.textContent = text;
    // the plate fits its balanced lines (text-wrap:balance alone keeps the box at its max width)
    el.style.width = '';
    el.style.maxWidth = `${mw}px`;
    el.classList.add('tm-measure');
    const mc = wd.scrollWidth;
    el.classList.remove('tm-measure');
    const pad = this._tagPad(W);
    const n = Math.min(lines, Math.ceil((mc + 1) / Math.max(40, mw - pad)));
    let cssW = 0;
    if (n > 1) {
      // the narrowest plate that still holds the words in that many lines
      let w = Math.min(mw, Math.ceil(mc / n) + pad + 6);
      el.style.width = `${w}px`;
      for (let i = 0; i < 16 && w < mw && wd.offsetHeight > n * lh + 2; i++) { w = Math.min(mw, w + 8); el.style.width = `${w}px`; }
      cssW = w;
    }
    const e = { lines, maxW, W, mw, text, cssW, minWords, w: el.offsetWidth, h: el.offsetHeight };
    tg.cur = e; tg.text = text; tg.w = e.w || tg.w; tg.h = e.h || tg.h; tg.lines = lines; tg.maxW = mw;
    return e;
  }

  // The obstacles the words keep off, once per frame: every body, face, sibling, effect zone and prop —
  // of the thoughts at rest or held (one still on its way passes under the words: the plan has made room
  // for where it is going, and nothing re-plans round its flight).
  _obstacles() {
    this._obN = 0;
    const R1 = this._rect, R2 = this._rect2;
    for (const th of this.thoughts) {
      if (th._leaving) continue;
      if (th._trav) {
        // (on its way: where it will rest — its body at home, at its full size)
        const p = this._planExt(th), y = th.home.y + this._restDy(th), q = this._rect2;
        const P = th.r * 2 * th.scale * (1 - 0.5 * Math.max(th.zGoal, th.zFloor)), W = P * th.aspect, a = this._amp(th);
        q.left = th.home.x - W / 2 - a; q.right = th.home.x + W / 2 + a; q.top = y - Math.min(p.t, P / 2 + 2) - a; q.bottom = y + P / 2 + 2 + a;
        const sx = th._sx, sy = th._sy, syP = th._syP; th._sx = th._sy = th._syP = 0;
        this._obPush(th, OB_DEST, q);
        th._sx = sx; th._sy = sy; th._syP = syP;
        continue;
      }
      this._obPush(th, OB_BODY, th._bbox());
      this._obPush(th, OB_FACE, th.faceRect(R1));
      for (const s of th.siblings) {
        if (!s.render.ready) continue;
        // (a sibling round its thought: where it sits in the ring without its slow wobble, with room for
        // the wobble — so a plate beside the cluster never flickers as the voices sway)
        let dx = 0, dy = 0, m = 0;
        // (the wobble swings it up to about 0.24 of the ring's radius either way)
        if (!s.free && !s.pressed) { const q = siblingHome(th, s, this._sh || (this._sh = { x: 0, y: 0 }), true); dx = q.x - s._pos.x; dy = q.y - s._pos.y; m = (th.reducedMotion ? 0.02 : 0.25) * 0.5 * (th.render.P + s.render.P) + 1; }
        this._obPush(th, s.free ? OB_FREE : OB_SIB, s._bbox(), dx, dy, m);
        this._obPush(th, OB_SIBFACE, s.faceRect(R1), dx, dy, m);
      }
      const f = th.fxRect(R2); if (f) this._obPush(th, OB_FX, f);
      const p = th.propRect(R2); if (p) this._obPush(th, OB_PROP, p);
    }
    this._obOwner.length = this._obN;
    return this._obN;
  }
  _obPush(th, kind, r, dx = 0, dy = 0, m = 0) {
    const n = this._obN;
    if (6 * (n + 1) > this._ob.length) { const nb = new Float32Array(this._ob.length * 2); nb.set(this._ob); this._ob = nb; }
    // (where it rests: its bob, tremble and hops taken out, so a resting plate's place never flickers with them)
    // (and with room for how far it moves about that place: a plate kept clear of the envelope is never touched)
    // (from where it rests now to where it will rest: a plate placed now is not covered as it sinks or rises)
    const ob = this._ob, i = 6 * n, sx = (th._sx || 0) + dx, sy = (th._sy || 0) + dy, syP = th._trav ? sy : (th._syP ?? 0) + dy, a = m + (th._amp || 0);
    ob[i] = r.left + sx - a; ob[i + 1] = r.top + Math.min(sy, syP) - a; ob[i + 2] = r.right + sx + a; ob[i + 3] = r.bottom + Math.max(sy, syP) + a; ob[i + 4] = kind; ob[i + 5] = a;
    this._obOwner[n] = th; this._obN = n + 1;
  }

  // where a thought's words may anchor this frame: below its body, above everything over its head, beside all
  // of it. Measured relative to its centre and smoothed over about a second (ga), so the words follow its
  // slow changes (a verb, a sink, going farther) and not its fast ones (a squash, a tremble, a hop, the
  // crackle flickering on and off)
  _anchors(th, tg, dt = 1 / 60) {
    const g = tg.g, ga = tg.ga, R = th.render, Q = R.pts, b = th._bbox(), ex = th.extent(this._rect3), gap = 14 + 8 * (1 - th.z);
    const cx = R.cx, cy = R.cy, A = this._anc || (this._anc = new Float64Array(8));
    A[0] = Q[2 * PT.bottom] - cx; A[1] = b.bottom + gap - cy;
    A[2] = Q[2 * PT.top] - cx; A[3] = ex.top - gap - cy;
    A[4] = ex.right + gap - cx; A[5] = ex.left - gap - cx;
    A[6] = b.cy - cy; A[7] = b.height / 2;
    // (outward reaches — below, above, right, left, half its height — hold their furthest at once and ease
    // back in slowly: steady through a squash or a tremble, never late for a body that grows; the x of
    // its top and bottom and its middle follow smoothly)
    // (still appearing or on its way: it follows exactly — an appearing jelly overshoots its size). Once it
    // has rested a second with nothing changed — no touch, no verb, the same depth and words — its words'
    // place is held still; anything that changes it lets the anchors follow again.
    const key = (th.pressed ? 1 : 0) + Math.round(Math.max(th.zGoal, th.zFloor) * 50) * 2 + Math.round((th.levels.soft.goal + th.levels.settle.goal + th.levels.transform.goal + th.levels.space.goal + (th.levels.explore?.goal || 0)) * 20) * 200 + tg.w * 1e5 + tg.h * 1e8;
    if (key !== tg.gaKey) { tg.gaKey = key; tg.gaRest = 0; }
    tg.gaRest = th._trav || th.pressed || th.ov.appear < 1 ? 0 : (tg.gaRest || 0) + dt;
    if (tg.gaInit && tg.gaRest > 1) { g[0] = R.cx + ga[0]; g[1] = R.cy + ga[1]; g[2] = R.cx + ga[2]; g[3] = R.cy + ga[3]; g[4] = R.cx + ga[4]; g[5] = R.cx + ga[5]; g[6] = R.cy + ga[6]; g[7] = ga[7]; g[8] = R.cx; g[9] = R.cy; return; }
    const settled = tg.gaInit && th.ov.appear >= 1 && !th._trav;
    const k = settled ? Math.min(1, dt * (th.pressed ? 6 : 1)) : 1, kin = settled ? Math.min(1, dt * 0.6) : 1;
    for (let i = 0; i < 8; i++) {
      const out = OUTWARD[i];
      if (out && (A[i] - ga[i]) * out > 0) ga[i] = A[i];
      else ga[i] += (A[i] - ga[i]) * (out ? kin : k);
    }
    tg.gaInit = true;
    g[0] = cx + ga[0]; g[1] = cy + ga[1]; g[2] = cx + ga[2]; g[3] = cy + ga[3];
    g[4] = cx + ga[4]; g[5] = cx + ga[5]; g[6] = cy + ga[6]; g[7] = ga[7]; g[8] = cx; g[9] = cy;
  }
  // the plate's rect for candidate c (clamped onto the screen and the stage) into the shared scratch;
  // _crD: how far the clamp moved it from where it wanted to be
  // (live: where the jelly is drawn this frame — for showing it; otherwise where the thought rests — for
  // every decision, so a bob or a tremble never moves a plate's place)
  _candRect(th, tg, c, live = false) {
    const g = tg.g, T = this._tenv, w = tg.w, h = tg.h, side = CANDS[2 * c], sl = CANDS[2 * c + 1];
    let x, y;
    if (c >= NC) { x = g[8] + tg.wx; y = g[9] + tg.wy - h / 2; }
    else if (side === 0) { x = g[0] + sl * w; y = g[1]; }
    else if (side === 1) { x = g[2] + sl * w; y = g[3] - h; }
    else { x = side === 2 ? g[4] + w / 2 : g[5] - w / 2; y = g[6] - h / 2 + sl * (h / 2 + g[7]); }
    if (!live) { x += th._sx || 0; y += th._sy || 0; }
    const cx = clamp(x, T.edge + w / 2, Math.max(T.edge + w / 2, T.W - T.edge - w / 2));
    const cy = clamp(y, T.yMin, Math.max(T.yMin, T.yMax - h));
    this._crD = Math.abs(cx - x) + Math.abs(cy - y);
    const r = this._cr; r[0] = cx - w / 2; r[1] = cy; r[2] = cx + w / 2; r[3] = cy + h;
    return r;
  }
  // what a plate at r covers that it must never cover — the hero, any face, a sibling pulled free, other
  // words (except placed[skip]): the true overlap (px²) is returned; _h3 is the same with 4 px to spare;
  // _core what of that is more than an envelope — other words, the hero itself, a face where it rests
  // (so where nothing is clear, a place that only brushes how far a face may sway beats one on other words)
  _hard(r, th, skip, search = false) {
    // (searching: the plate's whole way to where it will rest — its thought may still be sinking or rising)
    const d = search && !th._trav ? (th._syP ?? 0) - (th._sy ?? 0) : 0;
    const K = this._tenv.K, l = r[0], t = r[1] + Math.min(0, d), rr = r[2], b = r[3] + Math.max(0, d), m = 4;
    let h0 = 0, h3 = 0, core = 0;
    if (K) { h0 += overA(l, t, rr, b, K.left - 4, K.top - 4, K.right + 4, K.bottom + 4); h3 += overA(l - m, t - m, rr + m, b + m, K.left - 4, K.top - 4, K.right + 4, K.bottom + 4); core += overA(l, t, rr, b, K.left, K.top, K.right, K.bottom); }
    const ob = this._ob, n = this._obN;
    // (_hobDeep: what covers a face or a free sibling by more than a 2 px brush of its envelope)
    let hob = 0, deep = 0;
    for (let k = 0; k < n; k++) {
      const j = 6 * k, kind = ob[j + 4];
      if (!HARD[kind] && !(search && kind === OB_DEST)) continue;
      const ox = Math.min(rr, ob[j + 2]) - Math.max(l, ob[j]), oy = Math.min(b, ob[j + 3]) - Math.max(t, ob[j + 1]);
      if (ox > 0 && oy > 0) { hob += ox * oy; if (ox > 2 && oy > 2) deep += ox * oy; const e = ob[j + 5]; if (ox > e && oy > e) core += overA(l, t, rr, b, ob[j] + e, ob[j + 1] + e, ob[j + 2] - e, ob[j + 3] - e); }
      h3 += overA(l - m, t - m, rr + m, b + m, ob[j], ob[j + 1], ob[j + 2], ob[j + 3]);
    }
    h0 += hob; this._hob = hob; this._hobDeep = deep;
    const P = this._placedR, np = this._nPlaced;
    for (let i = 0; i < np; i++) {
      if (i === skip) continue;
      const q = 4 * i;
      // (edges touching — under half a pixel deep — are not an overlap)
      const ox = Math.min(rr, P[q + 2]) - Math.max(l, P[q]), oy = Math.min(b, P[q + 3]) - Math.max(t, P[q + 1]);
      if (ox > 0.5 && oy > 0.5) { h0 += ox * oy; core += ox * oy; }
      h3 += overA(l - m, t - m, rr + m, b + m, P[q], P[q + 1], P[q + 2], P[q + 3]);
    }
    this._h3 = h3; this._core = core;
    return h0;
  }
  // what it would rather not cover (bodies, the siblings round a thought, effects, props: by weight × the
  // covered fraction) and how much it would rather be on one side than another
  _soft(r, th, c, tg) {
    const l = r[0], t = r[1], rr = r[2], b = r[3], A = Math.max(1, (rr - l) * (b - t));
    let sc = 0.12 * c + this._crD / 50;
    const ob = this._ob, own = this._obOwner, n = this._obN;
    for (let k = 0; k < n; k++) {
      const j = 6 * k, kind = ob[j + 4];
      if (HARD[kind]) continue;
      const a = overA(l, t, rr, b, ob[j] - 4, ob[j + 1] - 4, ob[j + 2] + 4, ob[j + 3] + 4);
      if (a > 0) sc += (own[k] === th ? W_OWN : W_OTHER)[kind] * a / A;
    }
    const side = CANDS[2 * c];
    if (side === 1 && fxAbove(th)) sc += 2.5;
    if (th.labelSide && SIDE_NAMES[side] === th.labelSide) sc -= 1.5;
    if (tg && c === tg.ci) sc -= 0.6;
    return sc;
  }
  // the best place for its words now: clear first (with room to spare, then at all), then the softest
  _search(th, tg, skip) {
    let best = 0, bc = Infinity, bh = 0, b3 = 0, bs = 0, bb = 0;
    for (let c = 0; c < NC; c++) {
      const r = this._candRect(th, tg, c);
      const h0 = this._hard(r, th, skip, true), h3 = this._h3, soft = this._soft(r, th, c, tg), bad = h0 + BAD_CORE * this._core;
      const cost = h0 > 0 ? 2e4 + bad : h3 > 0 ? 1e4 + h3 + soft : soft;
      if (cost < bc) { bc = cost; best = c; bh = h0; b3 = h3; bs = soft; bb = bad; }
    }
    this._bestHard = bh; this._bestH3 = b3; this._bestSoft = bs; this._bestBad = bb;
    return best;
  }
  // Nowhere clear round it: a wider look, a grid of places round the thought (about a plate's width either
  // side, a little more up and down), the nearest clear one wins (the rope reaches it). Kept as candidate NC,
  // relative to the body.
  _searchWide(th, tg, skip) {
    const g = tg.g, w = tg.w, h = tg.h, T = this._tenv;
    let bc = Infinity, bx = 0, by = 0, bh = Infinity, bb = Infinity;
    for (let iy = -13; iy <= 13; iy++) {
      for (let ix = -8; ix <= 8; ix++) {
        const dx = (ix * (w + g[7] * 2) * 1.2) / 8, dy = (iy * (h + g[7] * 2) * 1.6) / 13, cx = g[8] + (th._sx || 0), cy = g[9] + (th._sy || 0);
        const x = clamp(cx + dx, T.edge + w / 2, Math.max(T.edge + w / 2, T.W - T.edge - w / 2)), y = clamp(cy + dy - h / 2, T.yMin, Math.max(T.yMin, T.yMax - h));
        const r = this._cr; r[0] = x - w / 2; r[1] = y; r[2] = x + w / 2; r[3] = y + h; this._crD = 0;
        const h0 = this._hard(r, th, skip, true), bad = h0 + BAD_CORE * this._core;
        const cost = (h0 > 0 ? 1e5 + bad : 0) + (this._h3 > 0 ? 50 : 0) + this._soft(r, th, 0, null) + Math.hypot(x - cx, y + h / 2 - cy) / 25;
        if (cost < bc) { bc = cost; bx = x - cx; by = y + h / 2 - cy; bh = h0; bb = bad; }
      }
    }
    tg.wx = bx; tg.wy = by;
    this._bestHard = bh; this._bestBad = bb;
    return NC;
  }
  // a placed plate (into the frame's list): from where it is to where it will be once its thought has
  // finished sinking or rising, so no plate placed beside it is met on the way
  _placeR(r, i = this._nPlaced, th = null) {
    if (4 * (i + 1) > this._placedR.length) { const nb = new Float64Array(this._placedR.length * 2); nb.set(this._placedR); this._placedR = nb; }
    const P = this._placedR, q = 4 * i, d = th && !th._trav ? (th._syP ?? 0) - (th._sy ?? 0) : 0;
    P[q] = r[0]; P[q + 1] = r[1] + Math.min(0, d); P[q + 2] = r[2]; P[q + 3] = r[3] + Math.max(0, d);
    if (i === this._nPlaced) this._nPlaced++;
    return i;
  }
  // which side of the body a wide place is on (for the rope)
  _wideSide(th, tg) {
    const half = tg.g[7];
    if (tg.wy - tg.h / 2 >= half) return 'below';
    if (tg.wy + tg.h / 2 <= -half) return 'above';
    return tg.wx >= 0 ? 'right' : 'left';
  }
  // on its way: still appearing (it grows in, overshooting its size), tossed, or not yet home
  _travelling(th) {
    return th.ov.appear < 1 || th._glide || (!th.pressed && !th.driven && Math.hypot(th.x - th.home.x, th.y - th.home.y) > 0.35 * th.render.P);
  }

  // The words sit beside their thought where nothing else is. Hard rules: never on another plate, a face
  // or the hero. A resting plate keeps its place while it stays clear; otherwise it searches its sides
  // and slides, then (at rest) fewer words, then a wider look round. A plate on its way (arriving, tossed)
  // keeps its side and waits, hidden, while that is on the hero or a face. Resting plates are placed
  // first, held ones next.
  _tags(dt, env) {
    const W = env.view.W, H = env.view.H, B = env.bounds, list = this.thoughts, T = this._tenv;
    T.edge = W < 360 ? 12 : 16; T.W = W; T.yMin = Math.max(T.edge, B.top); T.yMax = Math.min(H - T.edge, B.bottom + 2); T.K = this._keep();
    for (const th of list) {
      th._trav = this._travelling(th);
      // where its body rests (home and its average drawn offset) against where it is drawn this frame
      const e = th._ext, R = th.render;
      th._sx = !th._trav && e ? th.home.x + e.rx - R.cx : 0; th._sy = !th._trav && e ? th.home.y + e.ry - R.cy : 0;
      // (and where it will rest once its feeling has fully shown — a sad one is still sinking for seconds)
      th._syP = !th._trav ? th.home.y + this._restDy(th) - R.cy : 0;
      th._amp = this._amp(th);
    }
    this._obstacles();
    this._nPlaced = 0;
    for (const th of list) {
      const tg = this.tags.get(th);
      if (!tg) continue;
      this._fitLevel(th, tg, W);
      this._anchors(th, tg, dt);
      tg.blocked = false; tg.done = false; tg.pi = -1; tg.wait = false;
      tg.mode = th._leaving ? 3 : th._trav ? 2 : th.pressed || th.driven ? 1 : 0;
    }
    // a plate keeps its place while that place stays clear
    for (let mode = 0; mode < 2; mode++) {
      for (const th of list) {
        const tg = this.tags.get(th);
        if (!tg || tg.mode !== mode || !tg.live || !tg.w) continue;
        const r = this._candRect(th, tg, tg.ci);
        // (a brush of a face's motion envelope — itself a pixel wider than the face goes — is not a cover:
        // an overlap no more than 2 px deep is let be, so a resting plate never flickers for it)
        const h0 = this._hard(r, th, -1);
        if (h0 - this._hob + this._hobDeep > 0) continue;
        tg.done = true; tg.pi = this._placeR(r, this._nPlaced, th);
      }
    }
    // the others look for the best clear place (a kept one stays, even on something soft: once a thought
    // has arrived its words move only when their place is covered)
    for (let mode = 0; mode < 2; mode++) {
      for (const th of list) {
        const tg = this.tags.get(th);
        if (!tg || tg.mode !== mode || !tg.w || tg.done) continue;
        // (where it rested, and how much is on that place now — measured as the search measures)
        const ci0 = tg.ci, wx0 = tg.wx, wy0 = tg.wy;
        const h00 = mode === 0 && tg.live && tg.shown ? this._hard(this._candRect(th, tg, ci0), th, -1, true) : Infinity, b00 = h00 + BAD_CORE * (h00 < Infinity ? this._core : 0);
        let c = this._search(th, tg, -1);
        // at rest and nowhere clear: fewer words (a narrower, shorter plate), then look again
        while (this._bestHard > 0 && mode === 0 && tg.drop < (this.crowd >= 3 ? 3 : 2)) {
          tg.drop++; this._fitLevel(th, tg, W);
          c = this._search(th, tg, -1);
        }
        // still nowhere: a wider look round it
        if (this._bestHard > 0 && mode === 0) { const hc = this._bestHard, bc = this._bestBad, wx = tg.wx, wy = tg.wy, cw = this._searchWide(th, tg, -1); if (this._bestBad < bc) c = cw; else { tg.wx = wx; tg.wy = wy; this._bestHard = hc; this._bestBad = bc; } }
        // nowhere clear either: a resting plate does not swap one covered place for another no better than
        // half as covered (two such places would take turns, the words sliding to and fro across the stage)
        if (this._bestHard > 0 && this._bestBad > 0.5 * b00) { c = ci0; tg.wx = wx0; tg.wy = wy0; this._bestHard = h00; this._bestBad = b00; }
        tg.blocked = this._bestHard > 0;
        tg.ci = c; tg.live = true; tg.done = true;
        tg.pi = this._placeR(this._candRect(th, tg, c), this._nPlaced, th);
      }
    }
    // on its way: it keeps the side chosen for it, and waits (hidden, untouchable) while that is on the hero or a face
    for (const th of list) {
      const tg = this.tags.get(th);
      if (!tg || tg.mode < 2) continue;
      tg.wait = tg.mode === 2 && this._hard(this._candRect(th, tg, tg.ci, true), th, -1) > 0;
    }
    const dpr = this._view.dprTag || 1;
    for (const th of list) {
      const tg = this.tags.get(th);
      if (!tg) continue;
      // shown where it was placed: at the thought's resting place (the jelly bobs and hops on its slack rope
      // while the words stay put and readable); on its way, with the body
      const r = this._candRect(th, tg, tg.ci, tg.mode >= 2);
      tg.tx = (r[0] + r[2]) / 2; tg.ty = r[1]; tg.rl = r[0] - (th._sx || 0) * (tg.mode < 2 ? 1 : 0); tg.rt = r[1] - (th._sy || 0) * (tg.mode < 2 ? 1 : 0);
      tg.side = tg.ci >= NC ? this._wideSide(th, tg) : SIDE_NAMES[CANDS[2 * tg.ci]]; tg.above = tg.side === 'above'; tg.clear = !tg.blocked;
      // its words change side at rest (their place was covered): a quick hop — out, across, back in —
      // never a slide over the faces between
      // (a wider place that moves is a new place too)
      const wideMoved = tg.ci >= NC && Math.abs(tg.wx - tg.wxShown) + Math.abs(tg.wy - tg.wyShown) > 6;
      if (tg.ciShown !== tg.ci || wideMoved) { if (tg.ciShown != null && tg.shown && tg.mode < 2 && !env.rm) tg.hop = 0.16; tg.ciShown = tg.ci; tg.wxShown = tg.wx; tg.wyShown = tg.wy; }
      if (tg.hop > 0) { tg.hop -= dt; tg.x = tg.tx; tg.y = tg.ty; tg.vx = tg.vy = 0; }
      if (env.rm || !tg.shown) { tg.x = tg.tx; tg.y = tg.ty; tg.vx = tg.vy = 0; }
      else {
        // a little spring lag: the words trail their thought
        const k = 140, c = 2 * Math.sqrt(k) * 0.82;
        tg.vx += (k * (tg.tx - tg.x) - c * tg.vx) * dt; tg.vy += (k * (tg.ty - tg.y) - c * tg.vy) * dt;
        tg.x += tg.vx * dt; tg.y += tg.vy * dt;
      }
      tg.rot = env.rm ? 0 : clamp(tg.vx * 0.012, -4, 4);
      // at rest: whole device pixels and no tilt (crisp text); moving: a composited, slightly tilted plate
      const moving = Math.abs(tg.vx) + Math.abs(tg.vy) > 4 || Math.abs(tg.tx - tg.x) + Math.abs(tg.ty - tg.y) > 0.75;
      const X = Math.round((tg.x - tg.w / 2) * dpr) / dpr, Y = Math.round(tg.y * dpr) / dpr, kr = moving ? Math.round(tg.rot * 10) : 0;
      if (X !== tg.kx || Y !== tg.ky || kr !== tg.kr || moving !== tg.moving) {
        tg.kx = X; tg.ky = Y; tg.kr = kr;
        tg.el.style.transform = moving ? `translate3d(${X}px,${Y}px,0) rotate(${(kr / 10).toFixed(1)}deg)` : `translate(${X}px,${Y}px)`;
        if (moving !== tg.moving) { tg.moving = moving; tg.el.classList.toggle('tm-move', moving); }
      }
      const show = th.ov.appear > 0.35 && !th._leaving && !tg.wait && !(tg.hop > 0);
      if (show !== tg.shown) { tg.shown = show; tg.el.classList.toggle('tm-on', show); }
      const travel = tg.mode >= 2;
      if (travel !== tg.travel) { tg.travel = travel; tg.el.classList.toggle('tm-travel', travel); }
      const calm = th.look.relief > 0.55;
      if (calm !== tg.calm) { tg.calm = calm; tg.el.classList.toggle('tm-calm', calm); }
      // a world's fade reaches the words too (in steps of 5 %: no style write per frame)
      const oq = Math.round(clamp(th.opacity ?? 1) * 20);
      if (oq !== tg.opQ) { tg.opQ = oq; tg.el.style.setProperty('--tm-o', String(oq / 20)); }
      // the tag's top edge carries the thought's light
      const tq = Math.round(th.look.tintK * 4);
      if (tq !== tg.tintQ) { tg.tintQ = tq; const t = tintAt(th.style.tint, 0, th.look.tintK, {}); tg.el.style.setProperty('--tm-tint', rgba(t.light, 0.55)); tg.el.style.setProperty('--tm-wash', rgba(t.mid, 0.16)); this.ropes.get(th).colour = rgba(t.light, 0.8); }
    }
  }
  // the soft rope from the body to its words (verlet, pinned at both ends, a little slack). It leaves the
  // body on the words' side — beside a stone or a closed shell when the words are above, never through it —
  // and reaches the plate's nearest edge.
  _ropes(dt, env) {
    const pt = this._ropePt || (this._ropePt = { x: 0, y: 0 });
    for (const th of this.thoughts) {
      const rope = this.ropes.get(th), tg = this.tags.get(th);
      if (!rope || !tg) continue;
      const Q = th.render.pts, side = tg.side || 'below';
      const ai = side === 'above' ? PT.top : side === 'right' ? PT.right : side === 'left' ? PT.left : PT.bottom;
      let ax = Q[2 * ai] + (side === 'right' ? -2 : side === 'left' ? 2 : 0), ay = Q[2 * ai + 1] + (side === 'above' ? 2 : side === 'below' ? -2 : 0);
      if (side === 'above' && th.kind === 'belief') {
        const ps = th.propState;
        if (th.prop === 'stone' && ps.down < 0.5) { th._at(0.15, 0.13, pt); ax = pt.x; ay = pt.y; }
        else if (th.prop === 'shell' && ps.lift < 0.5) { th._at(0.93, 0.24, pt); ax = pt.x; ay = pt.y; }
      }
      const l = tg.x - tg.w / 2, r = tg.x + tg.w / 2;
      const bx = side === 'right' ? l : side === 'left' ? r : clamp(ax, l + 14, Math.max(l + 14, r - 14));
      const by = side === 'above' ? tg.y + tg.h : side === 'below' ? tg.y : clamp(ay, tg.y + 10, Math.max(tg.y + 10, tg.y + tg.h - 10));
      const n = ROPE_N;
      if (!rope.init || env.rm) {
        for (let i = 0; i < n; i++) { const t = i / (n - 1); rope.x[i] = rope.px[i] = ax + (bx - ax) * t; rope.y[i] = rope.py[i] = ay + (by - ay) * t + Math.sin(Math.PI * t) * 4; }
        rope.init = true;
        continue;
      }
      const L = Math.hypot(bx - ax, by - ay), seg = (L / (n - 1)) * 1.06;
      const g = 520 * dt * dt;
      for (let i = 1; i < n - 1; i++) {
        const vx = (rope.x[i] - rope.px[i]) * 0.9, vy = (rope.y[i] - rope.py[i]) * 0.9;
        rope.px[i] = rope.x[i]; rope.py[i] = rope.y[i];
        rope.x[i] += vx; rope.y[i] += vy + g;
      }
      for (let it = 0; it < 5; it++) {
        rope.x[0] = ax; rope.y[0] = ay; rope.x[n - 1] = bx; rope.y[n - 1] = by;
        for (let i = 0; i < n - 1; i++) {
          const dx = rope.x[i + 1] - rope.x[i], dy = rope.y[i + 1] - rope.y[i], d = Math.hypot(dx, dy) || 1e-4, f = ((d - seg) / d) * 0.5;
          if (i > 0) { rope.x[i] += dx * f; rope.y[i] += dy * f; }
          if (i + 1 < n - 1) { rope.x[i + 1] -= dx * f; rope.y[i + 1] -= dy * f; }
        }
      }
      rope.x[0] = ax; rope.y[0] = ay; rope.x[n - 1] = bx; rope.y[n - 1] = by;
    }
  }
}

export { TAG_MIN_PX };
