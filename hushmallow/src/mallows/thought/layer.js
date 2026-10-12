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
//   { canvasGL } accepted and ignored (HUSHFOLD §3 named it; the thoughts are not WebGL meshes):
//                pass ctx2d / canvas, or attach(mt). Without either, nothing is drawn.
//
// The person's words ride on a DOM tag per thought: a <button> whose words are
// set with textContent only (never parsed), in the voice face (HM Nunito Sans)
// at 17 px (16 px on small phones) and never below 15 px — it is never
// scaled, however far the thought moves. A long text, a far-away thought or a
// crowded stage show the start of the words, cut at a word and marked "…",
// chosen by measuring the tag (3 lines near, 2 mid-way or crowded, 1 far or
// very crowded): the words shown always fit, nothing clips them again. A tap
// reads all of them (onRead(th), or a small built-in reader). A soft rope
// tethers the tag to its thought; the tag trails with a little spring and
// tilts at most 4°. Keyboard on a focused tag: Enter reads, holding Space
// squeezes, the arrow keys move it, Shift + an arrow strokes it.
//
// Layout: add() picks a free home near the one asked for (its words, effects
// and a belief's prop included, clear of the hero and the others) and the side
// its words go. While the stage lives, footprints never overlap (a gentle
// push), the hero is never covered, everything stays inside the bounds by its
// live extent (a flattened belief, a cloud, a stone set down), and a crowded
// stage holds its thoughts a little farther away (smaller; fewer lines) rather
// than piling them up. A boxed-in thought may glide a short way to free room,
// never across the stage; its siblings come with it.
//
// Same shape as the Hushfold's placeholder layer: add / list / remove /
// hitTest / pointer / rects / frame / clear / release / destroy / onChange.

import { ThoughtMallow, createThought, PT } from './thought.js';
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
.tm-tag{position:fixed;left:0;top:0;z-index:6;margin:0;box-sizing:border-box;max-width:min(232px,calc(100vw - 40px));padding:7px 14px 8px;border-radius:15px;
  border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,var(--tm-wash,rgba(255,255,255,.05)),rgba(255,255,255,0) 70%),rgba(14,10,36,.74);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fbf8ff;
  font:650 17px/1.3 var(--ff-voice,"HM Nunito Sans","Nunito Sans",ui-rounded,system-ui,sans-serif);letter-spacing:.004em;text-align:center;
  box-shadow:0 8px 22px rgba(4,2,16,.34),inset 0 1px 0 var(--tm-tint,rgba(255,255,255,.22));cursor:pointer;transform-origin:50% 0;will-change:transform;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;pointer-events:auto;
  opacity:0;transition:opacity .45s ease,border-color .6s ease}
.tm-tag::before{content:"";position:absolute;left:-2px;right:-2px;top:50%;height:max(100% + 4px,48px);transform:translateY(-50%)}
.tm-tag .tm-words{display:block;text-wrap:balance;overflow-wrap:anywhere;min-height:1.3em}
.tm-tag.tm-on{opacity:1}
.tm-tag.tm-measure{max-width:none!important;width:auto!important}
.tm-tag.tm-measure .tm-words{white-space:nowrap}
.tm-tag.tm-belief{border-color:rgba(255,236,200,.34);font-weight:720}
.tm-tag.tm-calm{border-color:rgba(255,231,166,.4)}
.tm-tag:focus-visible{outline:2px solid #fff;outline-offset:3px}
.tm-tag.tm-hidden{opacity:0!important;pointer-events:none!important}
.tm-read{position:fixed;z-index:12;left:16px;right:16px;margin:0 auto;max-width:440px;top:calc(env(safe-area-inset-top,0px) + 72px);box-sizing:border-box;
  padding:18px 20px 14px;border-radius:22px;border:1px solid rgba(255,255,255,.2);background:rgba(16,11,42,.9);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
  color:#fbf8ff;box-shadow:0 20px 50px rgba(3,1,14,.5)}
.tm-read p{margin:0 0 12px;font:600 19px/1.45 var(--ff-voice,"HM Nunito Sans","Nunito Sans",ui-rounded,system-ui,sans-serif);white-space:pre-wrap;overflow-wrap:anywhere;
  max-height:min(50vh,320px);overflow:auto;-webkit-user-select:text;user-select:text}
.tm-read button{display:block;width:100%;min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fbf8ff;
  font:650 16px/1 var(--ff-ui,"HM Manrope",system-ui,sans-serif);cursor:pointer}
@media (max-width:360px){.tm-tag{font-size:16px;max-width:min(210px,calc(100vw - 28px));padding:6px 11px 7px}}
@media (prefers-reduced-motion:reduce){.tm-tag{transition:none}}
`;
  document.head.appendChild(st);
}

const asFn = (v, d) => (typeof v === 'function' ? v : v == null ? d : () => v);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
// overlap area of two rects given as numbers
const overA = (l1, t1, r1, b1, l2, t2, r2, b2) => { const ox = Math.min(r1, r2) - Math.max(l1, l2), oy = Math.min(b1, b2) - Math.max(t1, t2); return ox > 0 && oy > 0 ? ox * oy : 0; };
// a feeling whose effects rise over its head (the sadness cloud and rain, steam): its words go below
const fxAbove = (th) => th.style.fx.rain > 0 || th.style.fx.steam > 0;
// grows at once, shrinks slowly (k per frame)
const smoothGrow = (cur, v, k, init) => (!init || v > cur ? v : cur + (v - cur) * k);

// obstacle kinds for the words (weights: on its own thought / on another's)
const OB_BODY = 0, OB_FACE = 1, OB_SIB = 2, OB_SIBFACE = 3, OB_FX = 4, OB_PROP = 5;
const W_OWN = [8, 40, 6, 30, 10, 10];
const W_OTHER = [6, 40, 6, 30, 6, 8];
const SIDE_NAMES = ['below', 'above', 'right', 'left', 'below', 'below', 'above', 'above'];
// how far a crowded stage holds its thoughts (by crowd level 0 room … 3 packed)
const CROWD_Z = [0, 0.2, 0.45, 0.62, 0.78];

export class ThoughtLayer {
  /**
   * @param {object} o
   * @param {CanvasRenderingContext2D} [o.ctx2d]  draw here (the caller clears it and sets the dpr transform)
   * @param {HTMLCanvasElement} [o.canvas]  or own this canvas (sized, cleared, ticked here)
   * @param {HTMLCanvasElement} [o.canvasGL]  accepted and ignored: thoughts are drawn in 2D (pass ctx2d / canvas or attach(mt))
   * @param {HTMLElement} [o.tagRoot=document.body]  where the word tags live (position:fixed)
   * @param {boolean|()=>boolean} [o.reducedMotion]  default: the OS setting, live
   * @param {boolean|()=>boolean} [o.lowStim]
   * @param {()=>({left,top,right,bottom}|null)} [o.keepOut]  a rect thoughts float clear of (the hero Mallow), client px
   * @param {()=>({left,top,right,bottom})} [o.bounds]  where thoughts may float (default: the viewport, 20 px clear of the edges)
   * @param {(th)=>void} [o.onRead]  tap on the words (default: a small reader with all of them)
   * @param {(kind)=>void} [o.haptic]  @param {object} [o.audio]
   */
  constructor(o = {}) {
    injectStyle();
    this.o = o;
    this.ctx = o.ctx2d || null;
    this.canvas = o.canvas || this.ctx?.canvas || null;
    this.own = !!(o.canvas && !o.ctx2d);
    if (this.own) this.ctx = o.canvas.getContext('2d');
    if (o.canvasGL && !this.ctx && typeof console !== 'undefined') console.info('[thoughts] canvasGL is not used: Thought Mallows draw in 2D (pass ctx2d or canvas, or attach(mallowTouch))');
    this.tagRoot = o.tagRoot || (typeof document !== 'undefined' ? document.body : null);
    this._rm = asFn(o.reducedMotion, () => prefersReducedMotion());
    this._low = asFn(o.lowStim, () => false);
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
    this._view = { left: 0, top: 0, W: 1, H: 1, dpr: 1 };
    this._sorted = [];
    this._frames = 0;
    this._lastT = 0;
    this.crowd = 0;
    this._crowdK = new Float64Array(8).fill(NaN);
    this._ob = new Float32Array(6 * 64); this._obOwner = []; this._obN = 0;
    this._rect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    this._rect2 = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    this.destroyed = false;
    this._onResize = () => { this._measureView(); for (const tg of this.tags.values()) { tg.fitKey = ''; tg.measure = true; } };
    if (typeof addEventListener === 'function') addEventListener('resize', this._onResize);
    if (typeof document !== 'undefined') document.fonts?.ready?.then(() => { for (const tg of this.tags.values()) { tg.fitKey = ''; tg.measure = true; } });
    this._measureView();
    if (this.own) { this._tick = (dt) => { if (!this.destroyed) this.frame(dt); }; addTicker(this._tick); }
  }

  // ------------------------------------------------------------ thoughts --
  /** The thoughts and beliefs (not their siblings), oldest first. */
  get list() { return this.thoughts; }
  /** The thought the person's words ride on (the newest one), or null. */
  get primary() { return this.thoughts[this.thoughts.length - 1] || null; }
  /** Every Mallow drawn, siblings included. */
  all(out = []) { out.length = 0; for (const th of this.thoughts) { for (const s of th.siblings) out.push(s); out.push(th); } return out; }

  /**
   * Add a thought: a ThoughtMallow / BeliefMallow, or the options for one
   * ({text, emotion, intensity, scale, r, prop → a belief}).
   * place: {x, y} or {from, home} — the home is where it would like to rest: the layer takes the
   * nearest free place to it (its words, effects and prop clear of the hero and the others);
   * {exact: true} keeps it exactly there.
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
    // where it rests and where its words go, chosen now (not by a stream of small relocations later)
    const env = this._envNow(nowMs());
    this._crowdLevel(env, true);
    const home = place.exact ? want : this._place(th, want, env);
    th.moveHome(home);
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
    this._changed();
  }
  _forget(th) { this.remove(th); }

  clear() { for (let i = this.thoughts.length - 1; i >= 0; i--) { const th = this.thoughts[i]; this.remove(th); th.destroy(); } }
  /** Let the thoughts fade (a world takes the words over), then take them off. */
  release(ms = 700) {
    const until = nowMs() + ms;
    for (const th of this.thoughts) { th._leaving = until; th._leaveMs = ms; const tg = this.tags.get(th); if (tg) tg.el.style.pointerEvents = 'none'; }
    this._changed();
  }

  hideTags(b = true) { this.hidden = !!b; for (const tg of this.tags.values()) tg.el.classList.toggle('tm-hidden', this.hidden || this.paused); }
  /** Pause the layer: nothing is stepped, drawn or touchable and the words hide (another tab, a sheet). */
  pause(b = true) {
    this.paused = !!b;
    for (const tg of this.tags.values()) tg.el.classList.toggle('tm-hidden', this.hidden || this.paused);
    if (this.paused) for (const [id, th] of this.owner) { th.pointer({ type: 'cancel', id, x: 0, y: 0, t: nowMs() }); this.owner.delete(id); }
    if (this.paused && this.own && this.ctx) { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    this._changed();
  }
  resume() { this.pause(false); }
  setReducedMotion(b) { this._rm = () => !!b; for (const th of this.thoughts) th.setReducedMotion(!!b); }
  setLowStim(b) { this._low = () => !!b; }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return this; }
  off(ev, fn) { const l = this.listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } return this; }
  // events carry the thought on the same object (no copy per event)
  _relay(ev, th, data) {
    const l = this.listeners[ev];
    if (l?.length) { const d = data || {}; d.thought = th; for (const fn of l) { try { fn(d); } catch (e) { console.error(e); } } }
    if (ev === 'touch') this._changed();
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
    for (let i = all.length - 1; i >= 0; i--) { const th = all[i]; if (!th._leaving && th.hitTest(x, y)) return th; }
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

  /** Rects (client px) subtitles and other UI must keep clear of: each thought with everything it draws and its words. */
  rects(out = []) {
    out.length = 0;
    for (const th of this.thoughts) {
      if (th._leaving) continue;
      const b = th.extent(this._rect);
      let l = b.left, t = b.top, r = b.right, btm = b.bottom;
      const tg = this.tags.get(th);
      if (tg && tg.w && tg.shown) { l = Math.min(l, tg.x - tg.w / 2); r = Math.max(r, tg.x + tg.w / 2); t = Math.min(t, tg.y); btm = Math.max(btm, tg.y + tg.h); }
      out.push({ left: l, top: t, right: r, bottom: btm, width: r - l, height: btm - t, id: th.id });
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

  /** Show all of a thought's words. */
  read(th) {
    this._relay('read', th, {});
    if (this.o.onRead) { this.o.onRead(th); return; }
    this.closeRead();
    const el = document.createElement('div');
    el.className = 'tm-read';
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
    this._readEl = el; this._readKey = key; this._readFrom = this.tags.get(th)?.el || null;
    this.tagRoot.appendChild(el);
    btn.focus({ preventScroll: true });
  }
  closeRead() {
    if (!this._readEl) return;
    this._readEl.remove(); document.removeEventListener('keydown', this._readKey);
    this._readFrom?.focus?.({ preventScroll: true });
    this._readEl = null; this._readFrom = null;
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
    this._crowdLevel(env, false);
    this._arrange(dt, env);
    for (const th of this.thoughts) {
      th.step(dt, env);
      if (th._leaving) th.render.alpha *= clamp((th._leaving - now) / Math.max(1, th._leaveMs));
    }
    const all = this._sortedNow();
    // ox/oy: the canvas's client offset (thoughts live in client px)
    let ox = V.left, oy = V.top;
    if (this.mt && this._attachedInfo) { ox = this._attachedInfo.view.left; oy = this._attachedInfo.view.top; }
    const o = this._drawOpts || (this._drawOpts = { ox: 0, oy: 0, rm: false, low: false, q: 0 });
    o.ox = ox; o.oy = oy; o.rm = env.rm; o.low = env.low; o.q = this.quality;
    this._ropes(dt, env);
    if (ctx) {
      for (const th of this.thoughts) {
        const rope = this.ropes.get(th), tg = this.tags.get(th);
        if (rope && tg && tg.shown && !this.hidden) drawRope(ctx, rope, rope.colour, th.render.alpha * 0.85, ox, oy);
      }
      for (const th of all) drawThought(ctx, th, o);
    }
    this._tags(dt, env);
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
    V.dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
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

  // ------------------------------------------------------------ layout --
  // How a thought sits round its anchor: offsets (CSS px, ≥ 0) of everything it draws from the drawn
  // body centre — live (its extent) and smoothed: it grows at once and shrinks slowly, so limits
  // never jitter with a wobble — plus where the body is drawn relative to its home (sink, drift, bob).
  _extent(th, dt) {
    const R = th.render, e = th._ext || (th._ext = { l: 0, r: 0, t: 0, b: 0, dx: 0, dy: 0, init: false });
    const x = th.extent(this._rect);
    const l = R.cx - x.left, r = x.right - R.cx, t = R.cy - x.top, b = x.bottom - R.cy;
    // before it has fully appeared, plan for its full size (it grows from a small seed)
    const pr = th.ov.appear < 1 ? this._predict(th) : null;
    const k = Math.min(1, dt * 1.2), init = e.init;
    e.l = smoothGrow(e.l, pr ? Math.max(l, pr.l) : l, k, init); e.r = smoothGrow(e.r, pr ? Math.max(r, pr.r) : r, k, init);
    e.t = smoothGrow(e.t, pr ? Math.max(t, pr.t) : t, k, init); e.b = smoothGrow(e.b, pr ? Math.max(b, pr.b) : b, k, init);
    const dx = R.cx - th.x, dy = R.cy - th.y;
    if (!e.init) { e.dx = dx; e.dy = dy; } else { e.dx += (dx - e.dx) * Math.min(1, dt * 3); e.dy += (dy - e.dy) * Math.min(1, dt * 3); }
    e.init = true;
    return e;
  }

  // the extent a thought will have once it has appeared (offsets from its centre), from its size, feeling and prop
  _predict(th) {
    const p = th._pred || (th._pred = { l: 0, r: 0, t: 0, b: 0 });
    const z = Math.max(th.zGoal, th.zFloor);
    const P = th.r * 2 * th.scale * (1 - 0.5 * z) * (1 - 0.16 * th.style.motion.shrink * 0.7), W = P * th.aspect;
    p.l = p.r = W / 2 + 2; p.t = p.b = P / 2 + 2;
    // siblings: their ring round it
    for (const s of th.siblings) {
      const Ps = s.r * 2 * th.scale * (1 - 0.5 * z), rad = (P / 2 + Ps / 2) * 0.96;
      const x = Math.cos(s._orbitA) * rad * 1.08, y = Math.sin(s._orbitA) * rad * 0.9;
      p.l = Math.max(p.l, -x + Ps * 0.56); p.r = Math.max(p.r, x + Ps * 0.56); p.t = Math.max(p.t, -y + Ps * 0.52); p.b = Math.max(p.b, y + Ps * 0.52);
    }
    const fx = th.style.fx;
    if (fx.rain > 0) { p.t = Math.max(p.t, P * 1.3); p.l = Math.max(p.l, W * 0.56); p.r = Math.max(p.r, W * 0.56); }
    if (fx.steam > 0) { p.t = Math.max(p.t, P * 1.4); p.l = Math.max(p.l, W * 0.42 + P * 0.42); p.r = Math.max(p.r, W * 0.42 + P * 0.42); }
    if (fx.crackle > 0) { p.t = Math.max(p.t, P * 0.66); p.l = Math.max(p.l, W / 2 + P * 0.16); p.r = Math.max(p.r, W / 2 + P * 0.16); }
    if (th.kind === 'belief') {
      if (th.prop === 'stone') p.t = Math.max(p.t, P * 0.5 + P * 0.34 * 1.5);
      if (th.prop === 'shell') { p.t = Math.max(p.t, P * 0.85); p.l = Math.max(p.l, W * 0.62); }
      if (th.prop === 'charm') { p.l = Math.max(p.l, W * 0.62); p.b = Math.max(p.b, P * 0.85); }
    }
    return p;
  }

  // how far below its home the body will rest once its feeling shows (sadness sinks; far away floats higher)
  _restDy(th) {
    const z = Math.max(th.zGoal, th.zFloor), P = th.r * 2 * th.scale * (1 - 0.5 * z);
    const e = 0.3 + 0.7 * clamp(th.state.tension);
    return th.style.motion.sink * e * P - z * 0.45 * th.r;
  }

  // the words' rect for a side, relative to the drawn body centre (into out: [l, t, r, b]); e: extent offsets
  // (as _tags places them: below / beside the body itself, above whatever is over its head)
  _tagRel(th, et, side, w, h, out) {
    const z = Math.max(th.zGoal, th.zFloor), gap = 14 + 8 * (1 - z);
    const bh = th.r * th.scale * (1 - 0.5 * z), bw = bh * th.aspect;
    if (side === 0) { out[0] = -w / 2; out[1] = bh + gap; }
    else if (side === 1) { out[0] = -w / 2; out[1] = -et - gap - h; }
    else if (side === 2) { out[0] = bw + gap; out[1] = -h / 2; }
    else { out[0] = -bw - gap - w; out[1] = -h / 2; }
    out[2] = out[0] + w; out[3] = out[1] + h;
    return out;
  }

  // Where a new thought rests (and where its words go): the free place nearest to `want` on a grid
  // over the bounds, scored against the hero, every other thought's footprint (body, siblings,
  // effects, prop, words) and the edges. A full stage holds it a little farther (smaller) first.
  _place(th, want, env) {
    const B = env.bounds, K = this._keep();
    const e = this._extent(th, 0);
    const pr = this._predict(th);
    e.l = Math.max(e.l, pr.l); e.r = Math.max(e.r, pr.r); e.t = Math.max(e.t, pr.t); e.b = Math.max(e.b, pr.b);
    const tg = this.tags.get(th);
    if (tg) { this._fitText(th, tg, env.view.W); if (tg.measure) this._measureTag(tg, env.view.W); }
    const w = tg?.w || 0, h = tg?.h || 0;
    // the others' footprints (where they rest), words included
    const F = this._feet || (this._feet = []);
    let n = 0;
    for (const o of this.thoughts) {
      if (o === th || o._leaving) continue;
      const f = this._foot(o);
      const r = F[n] || (F[n] = [0, 0, 0, 0]);
      r[0] = f.l; r[1] = f.t; r[2] = f.r; r[3] = f.b; n++;
    }
    const rel = this._relA || (this._relA = [0, 0, 0, 0]);
    let best = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const zs = attempt === 0 ? 1 : attempt === 1 ? 0.84 : 0.72;
      const el = e.l * zs, er = e.r * zs, et = e.t * zs, eb = e.b * zs;
      const minX = B.left + el, maxX = Math.max(minX, B.right - er), minY = B.top + et, maxY = Math.max(minY, B.bottom - eb);
      const sx = Math.max(10, (maxX - minX) / 18), sy = Math.max(10, (maxY - minY) / 24);
      let bs = Infinity, bx = want.x, by = want.y, bside = 0, bover = 0;
      for (let x = minX; x <= maxX + 0.5; x += sx) {
        for (let y = minY; y <= maxY + 0.5; y += sy) {
          // the body and everything it draws
          const l = x - el - 6, t = y - et - 4, r = x + er + 6, b = y + eb + 4;
          let over = 0;
          for (let i = 0; i < n; i++) { const q = F[i]; over += overA(l, t, r, b, q[0], q[1], q[2], q[3]); }
          if (K) over += 30 * overA(l, t, r, b, K.left - 10, K.top - 10, K.right + 10, K.bottom + 10);
          // its words: the best side here
          let tbest = 0, tside = 0, tover = 0;
          if (w) {
            tbest = Infinity;
            for (let s = 0; s < 4; s++) {
              this._tagRel(th, et, s, w, h, rel);
              const tl = x + rel[0], tt = y + rel[1], tr = x + rel[2], tb = y + rel[3];
              // what it would cover (or how far off the stage it would hang)…
              let ov = 0;
              const off = Math.max(0, 16 - tl) + Math.max(0, tr - env.view.W + 16) + Math.max(0, B.top - tt) + Math.max(0, tb - B.bottom - 2);
              if (off > 0) ov += 2000 + 40 * off * h;
              for (let i = 0; i < n; i++) { const q = F[i]; ov += 1.5 * overA(tl, tt, tr, tb, q[0], q[1], q[2], q[3]); }
              if (K) ov += 30 * overA(tl, tt, tr, tb, K.left - 6, K.top - 6, K.right + 6, K.bottom + 6);
              // …and which side it would rather be: below first, then above, right, left; below a
              // feeling whose effects rise over its head; the host's wish
              let pen = s * 60;
              if ((th.style.fx.rain > 0 || th.style.fx.steam > 0) && s === 1) pen += 3000;
              if (th.labelSide && SIDE_NAMES[s] === th.labelSide) pen -= 200;
              if (ov + pen < tbest) { tbest = ov + pen; tside = s; tover = ov; }
            }
          }
          const sc = over + tbest + Math.hypot(x - want.x, y - want.y) * 4;
          if (sc < bs) { bs = sc; bx = x; by = y; bside = tside; bover = over + tover; }
        }
      }
      best = { x: bx, y: by, side: bside };
      if (globalThis.__tmDebug) globalThis.__tmDebug.push({ id: th.id, attempt, bover: bover | 0, area: ((el + er) * (et + eb)) | 0, x: bx | 0, y: by | 0, side: bside, n, w, h, e: [el | 0, er | 0, et | 0, eb | 0], lim: [minX | 0, maxX | 0, minY | 0, maxY | 0] });
      // it fits, or nearly (the gentle push makes the last room: the others can move too): done.
      // Otherwise it is held a step farther away (smaller) and placed again.
      if (bover < 0.25 * (el + er) * (et + eb) || attempt === 2) break;
      th.zFloor = Math.max(th.zFloor, attempt === 0 ? 0.3 : 0.55);
    }
    if (tg) { tg.pref = best.side; tg.cand = best.side; }
    // the drawn body sits off its home a little (a sad thought sinks, a far one floats higher): the home
    // is placed for the drawn body, as it will be once its feeling shows
    return { x: best.x - (e.dx || 0), y: best.y - this._restDy(th) };
  }

  // homes: room between thoughts (more round one given space) — then, as hard limits, inside the
  // bounds and clear of the hero (the hero takes touches first; nothing may sit on it)
  _arrange(dt, env) {
    const B = env.bounds, K = this._keep(), list = this.thoughts;
    for (const th of list) {
      const e = this._extent(th, dt);
      const tg = this.tags.get(th);
      // the words below or above take room in the bounds too
      let tb = 0, tt = 0;
      if (tg && tg.w) { const gap = 14 + 8 * (1 - th.z); if (tg.side === 'above') tt = tg.h + gap; else if (tg.side !== 'right' && tg.side !== 'left') tb = tg.h + gap; }
      const lim = th._lim || (th._lim = { minX: 0, maxX: 0, minY: 0, maxY: 0, hwL: 0, hwR: 0, hhT: 0, hhB: 0, dx: 0, dy: 0 });
      lim.minX = B.left + e.l - e.dx; lim.maxX = B.right - e.r - e.dx;
      lim.minY = B.top + e.t + tt - e.dy; lim.maxY = B.bottom - Math.max(e.b, tb ? th.render.P / 2 + tb : 0) - e.dy;
      if (lim.maxX < lim.minX) lim.maxX = lim.minX = (lim.minX + lim.maxX) / 2;
      if (lim.maxY < lim.minY) lim.maxY = lim.minY;
      lim.hwL = e.l; lim.hwR = e.r; lim.hhT = e.t; lim.hhB = e.b; lim.dx = e.dx; lim.dy = e.dy;
    }
    // room between thoughts: footprints (body + effects + prop + words) never overlap; space() widens one's room
    for (const th of list) th._ov = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i], C = list[j];
        const fa = this._foot(A), fc = this._foot(C);
        const ox = Math.min(fa.r, fc.r) - Math.max(fa.l, fc.l), oy = Math.min(fa.b, fc.b) - Math.max(fa.t, fc.t);
        if (ox <= 0 || oy <= 0) continue;
        A._ov += ox * oy; C._ov += ox * oy;
        const ma = this._free(A) ? 1 : 0, mc = this._free(C) ? 1 : 0;
        if (!ma && !mc) continue;
        const sa = ma / (ma + mc), sc = mc / (ma + mc);
        const kk = Math.min(1, dt * 4);
        // the smaller overlap, unless the bounds leave no room that way
        const la = A._lim, lc = C._lim, aLeft = fa.l + fa.r < fc.l + fc.r, aUp = fa.t + fa.b < fc.t + fc.b;
        const roomX = aLeft ? (A.home.x - la.minX) * ma + (lc.maxX - C.home.x) * mc : (la.maxX - A.home.x) * ma + (C.home.x - lc.minX) * mc;
        const roomY = aUp ? (A.home.y - la.minY) * ma + (lc.maxY - C.home.y) * mc : (la.maxY - A.home.y) * ma + (C.home.y - lc.minY) * mc;
        let horiz = ox < oy;
        if (horiz && roomX < ox * 0.5 && roomY > roomX) horiz = false;
        else if (!horiz && roomY < oy * 0.5 && roomX > roomY) horiz = true;
        if (horiz) { const d = (aLeft ? -1 : 1) * ox * kk; A.home.x += d * sa; C.home.x -= d * sc; }
        else { const d = (aUp ? -1 : 1) * oy * kk; A.home.y += d * sa; C.home.y -= d * sc; }
      }
    }
    // boxed in for a while: a short glide to free room nearby (never across the stage); when there is
    // none, it is held a step farther away (smaller) instead of overlapping
    for (const th of list) {
      // only at rest: arriving thoughts cross each other's paths on their way home
      const resting = th.ov.appear >= 1 && Math.hypot(th.x - th.home.x, th.y - th.home.y) < 0.3 * th.render.P;
      if (!this._free(th) || !resting) { th._stuck = Math.min(0, th._stuck || 0); continue; }
      // (a sliver of padding is not being boxed in: a real overlap is a good part of its footprint)
      const f = this._foot(th), big = Math.max(500, 0.07 * (f.r - f.l) * (f.b - f.t));
      th._stuck = th._ov > big ? (th._stuck || 0) + dt : Math.min(0, (th._stuck || 0) + dt);
      if (th._stuck > 1.2) {
        const moved = this._nudge(th, K, env);
        if (!moved) th.zFloor = Math.min(0.85, th.zFloor + 0.15);
        th._stuck = -3;
      }
    }
    // hard limits last: the bounds, then never on the hero (out by the nearest way that stays in bounds)
    for (const th of list) {
      if (!this._free(th)) continue;
      const h = th.home, L = th._lim;
      h.x = clamp(h.x, L.minX, Math.max(L.minX, L.maxX)); h.y = clamp(h.y, L.minY, Math.max(L.minY, L.maxY));
      if (!K) continue;
      // the whole footprint — body, effects, prop and its words — stays off the hero
      const f = this._foot(th), fl = h.x - f.l, fr = f.r - h.x, ft = h.y - f.t, fb = f.b - h.y;
      const l = K.left - fr - 4, r = K.right + fl + 4, t = K.top - fb - 4, b = K.bottom + ft + 2;
      if (h.x > l && h.x < r && h.y > t && h.y < b) {
        let bx = 0, by = 0, bd = Infinity, fx = 0, fy = 0, fd = Infinity;
        for (let q = 0; q < 4; q++) {
          const x = q === 0 ? l : q === 1 ? r : h.x, y = q === 2 ? t : q === 3 ? b : h.y;
          const d = Math.abs(x - h.x) + Math.abs(y - h.y);
          if (d < fd) { fd = d; fx = x; fy = y; }
          if (x >= L.minX - 0.5 && x <= L.maxX + 0.5 && y >= L.minY - 0.5 && y <= L.maxY + 0.5 && d < bd) { bd = d; bx = x; by = y; }
        }
        if (bd === Infinity) { bx = fx; by = fy; }
        h.x = bx; h.y = by;
      }
    }
  }

  _free(th) { return !(th.driven || th.pressed || th._glide); }

  // a short glide (≤ ~1.6 body heights) to the least crowded home nearby; true when it found clearly more room
  _nudge(th, K, env) {
    const L = th._lim, f0 = this._foot(th);
    const ofl = f0.l - th.home.x, ofr = f0.r - th.home.x, oft = f0.t - th.home.y, ofb = f0.b - th.home.y;
    const F = this._feet || (this._feet = []);
    let n = 0;
    for (const o of this.thoughts) {
      if (o === th || o._leaving) continue;
      const f = this._foot(o);
      const r = F[n] || (F[n] = [0, 0, 0, 0]);
      r[0] = f.l; r[1] = f.t; r[2] = f.r; r[3] = f.b; n++;
    }
    const over = (x, y) => {
      let a = 0;
      for (let i = 0; i < n; i++) { const q = F[i]; a += overA(x + ofl, y + oft, x + ofr, y + ofb, q[0], q[1], q[2], q[3]); }
      if (K) a += 30 * overA(x + ofl, y + oft, x + ofr, y + ofb, K.left - 6, K.top - 6, K.right + 6, K.bottom + 6);
      return a;
    };
    const reach = Math.max(110, 1.6 * th.render.P), x0 = th.home.x, y0 = th.home.y;
    const o0 = over(x0, y0);
    let bx = x0, by = y0, bo = o0, best = o0;
    for (let gx = -6; gx <= 6; gx++) {
      for (let gy = -6; gy <= 6; gy++) {
        const x = clamp(x0 + (gx / 6) * reach, L.minX, Math.max(L.minX, L.maxX)), y = clamp(y0 + (gy / 6) * reach, L.minY, Math.max(L.minY, L.maxY));
        const ov = over(x, y), sc = ov + Math.hypot(x - x0, y - y0) * 4;
        if (sc < best) { best = sc; bx = x; by = y; bo = ov; }
      }
    }
    if (bo > o0 * 0.6) return false;
    th.home.x = bx; th.home.y = by;
    void env;
    return true;
  }

  // where its footprint is when it rests at home: everything it draws, and its words
  _foot(th) {
    const f = th._footRect || (th._footRect = { l: 0, r: 0, t: 0, b: 0 });
    const R = th.render, e = th._ext || this._extent(th, 0), sp = 1 + 0.9 * Math.max(th.levels.space.cur, th.earned.space);
    const x = th.home.x + e.dx, y = th.home.y + e.dy;
    // space() widens its room (round the body; effects and props as they are)
    const pw = (R.W / 2) * (sp - 1), ph = (R.P / 2) * (sp - 1);
    f.l = x - e.l - pw - 6; f.r = x + e.r + pw + 6; f.t = y - e.t - ph - 4; f.b = y + e.b + ph + 4;
    const tg = this.tags.get(th);
    if (tg && tg.w) {
      // the words where they sit now (relative to the thought), or on their chosen side before they show;
      // a feeling whose effects rise over its head always keeps the room below for its words
      let dx, dy;
      if (tg.shown && !fxAbove(th)) { dx = tg.tx - R.cx; dy = tg.ty - R.cy; }
      else { const rel = this._relB || (this._relB = [0, 0, 0, 0]); this._tagRel(th, e.t, fxAbove(th) ? 0 : tg.pref ?? 0, tg.w, tg.h, rel); dx = rel[0] + tg.w / 2; dy = rel[1]; }
      f.l = Math.min(f.l, x + dx - tg.w / 2 - 4); f.r = Math.max(f.r, x + dx + tg.w / 2 + 4);
      f.t = Math.min(f.t, y + dy - 4); f.b = Math.max(f.b, y + dy + tg.h + 4);
    }
    return f;
  }

  // How full the stage is (stable: recomputed only when the count, the view, the bounds or the hero change).
  // A fuller stage holds its thoughts a little farther away and shows fewer lines of words.
  _crowdLevel(env, force) {
    const B = env.bounds, n = this.thoughts.length, K = this._keep(), c = this._crowdK;
    const v0 = n, v1 = env.view.W, v2 = env.view.H, v3 = B.left | 0, v4 = B.top | 0, v5 = B.right | 0, v6 = B.bottom | 0, v7 = K ? ((K.right - K.left) * (K.bottom - K.top)) | 0 : 0;
    if (!force && c[0] === v0 && c[1] === v1 && c[2] === v2 && c[3] === v3 && c[4] === v4 && c[5] === v5 && c[6] === v6 && Math.abs(c[7] - v7) < 2000) return this.crowd;
    c[0] = v0; c[1] = v1; c[2] = v2; c[3] = v3; c[4] = v4; c[5] = v5; c[6] = v6; c[7] = v7;
    const area = Math.max(1, (B.right - B.left) * (B.bottom - B.top) - v7 * 0.8);
    // what each level needs: every body (at that level's depth, siblings and effects round it) and its
    // words (an estimated plate for that level's lines and width, 17 px Nunito ≈ 8.6 px a character),
    // with slack for packing; the roomiest level that fits wins
    const W = env.view.W;
    let crowd = 4;
    for (let lv = 0; lv < 5 && n > 1; lv++) {
      const z = CROWD_Z[lv], lines = lv === 0 ? 3 : lv === 1 ? 2 : 1;
      const { maxW, pad } = this._tagMax(W, lv);
      let need = 0;
      for (const th of this.thoughts) {
        const P = th.r * 2 * th.scale * (1 - 0.5 * z), Wb = P * th.aspect;
        let bw = Wb + 24, bh = P + 16;
        if (th.siblings.length) { bw += Wb * 0.9; bh += P * 0.6; }
        if (th.style.fx.rain > 0 || th.style.fx.steam > 0) bh += P * 0.75;
        if (th.kind === 'belief') bh += P * 0.35;
        const tw = Math.min(th.text.length * 8.6, (maxW - pad) * lines), l = Math.max(1, Math.ceil(tw / (maxW - pad)));
        const pw = Math.min(maxW, tw / l + pad) + 16, ph = l * 22 + 32;
        need += bw * bh + pw * ph;
      }
      if (area >= need * 1.15) { crowd = lv; break; }
    }
    if (n <= 1) crowd = 0;
    this.room = area / Math.max(1, n);
    if (crowd !== this.crowd) { this.crowd = crowd; for (const tg of this.tags.values()) { tg.fitKey = ''; tg.measure = true; } }
    const floor = CROWD_Z[crowd];
    for (const th of this.thoughts) if (!th.driven) th.zFloor = Math.max(floor, Math.min(th.zFloor, floor + 0.2));
    return this.crowd;
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
    this.tagRoot.appendChild(el);
    const tg = { el, words, text: '', fitKey: '', w: 0, h: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 0, kx: NaN, ky: NaN, kr: NaN, measure: true, shown: false, above: false, calm: false, side: 'below', pref: 0, cand: 0, tintQ: -1, clear: true };
    this.tags.set(th, tg);
    th.tag = el;
    th._words = wordsOf(th.text);
    const rope = { x: new Float32Array(ROPE_N), y: new Float32Array(ROPE_N), px: new Float32Array(ROPE_N), py: new Float32Array(ROPE_N), init: false, colour: '#ffffff' };
    this.ropes.set(th, rope);
  }

  // the widest a tag may be at this view width (CSS max-width and padding mirrored); a very crowded
  // stage gives each tag a narrower plate (its space budget: fewer words, still 17 px, a tap reads all)
  _tagMax(W, crowd = this.crowd) {
    const cap = W < 361 ? [210, 210, 184, 180, 176][Math.min(4, crowd)] : [232, 232, 208, 200, 192][Math.min(4, crowd)];
    return { maxW: Math.min(cap, W - (W < 361 ? 28 : 40)), pad: W < 361 ? 24 : 30 };
  }

  // The words a tag shows: all of them when they fit its line budget (3 near, 2 mid-way or crowded,
  // 1 far or very crowded) at its widest, otherwise the most leading words that do, cut at a word and
  // marked "…" — measured, so the plate never clips them again. Re-measured only when the budget,
  // the view width or the fonts change.
  _fitText(th, tg, W) {
    const lines = tagLines(th.z, this.crowd || 0);
    const { maxW } = this._tagMax(W);
    const key = `${lines}|${W}|${maxW}`;
    if (key === tg.fitKey) return;
    tg.fitKey = key;
    const el = tg.el, words = th._words || (th._words = wordsOf(th.text));
    el.classList.remove('tm-measure');
    el.style.maxWidth = `${maxW}px`;
    el.style.width = `${maxW}px`;
    const lh = parseFloat(getComputedStyle(tg.words).lineHeight) || 22;
    const fits = (txt) => { tg.words.textContent = txt; return tg.words.offsetHeight <= lines * lh + 2; };
    let text = words.join(' ');
    if (!fits(text)) {
      // the most words that fit (binary search over a prefix)
      let lo = 1, hi = words.length - 1, ok = 0;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (fits(firstWords(words, mid))) { ok = mid; lo = mid + 1; } else hi = mid - 1; }
      if (ok) text = firstWords(words, ok);
      else {
        // one very long first word: cut inside it (by code point), still marked "…"
        let n = Math.max(2, Array.from(words[0] || '').length);
        do { n = Math.floor(n * 0.85); text = wordsExcerpt(th.text, n); } while (n > 3 && !fits(text));
      }
    }
    tg.words.textContent = text;
    el.style.width = '';
    if (text !== tg.text) { tg.text = text; }
    tg.lines = lines;
    tg.measure = true;
  }

  // the plate fits its balanced lines (text-wrap:balance alone keeps the box at its max width)
  _measureTag(tg, W) {
    const el = tg.el;
    el.style.width = '';
    el.classList.add('tm-measure');
    const mc = tg.words.scrollWidth;
    el.classList.remove('tm-measure');
    const { maxW, pad } = this._tagMax(W);
    const lh = parseFloat(getComputedStyle(tg.words).lineHeight) || 22;
    const lines = Math.min(3, Math.ceil((mc + 1) / Math.max(40, maxW - pad)));
    if (lines > 1) {
      // the narrowest plate that still holds the words in that many lines
      let w = Math.min(maxW, Math.ceil(mc / lines) + pad + 6);
      el.style.width = `${w}px`;
      for (let i = 0; i < 16 && w < maxW && tg.words.offsetHeight > lines * lh + 2; i++) { w = Math.min(maxW, w + 8); el.style.width = `${w}px`; }
    }
    tg.w = el.offsetWidth || tg.w; tg.h = el.offsetHeight || tg.h;
    tg.measure = false;
  }

  // The obstacles the words keep off, once per frame: every body, face, sibling, effect zone and prop.
  _obstacles() {
    this._obN = 0;
    const R1 = this._rect, R2 = this._rect2;
    for (const th of this.thoughts) {
      if (th._leaving) continue;
      this._obPush(th, OB_BODY, th._bbox());
      this._obPush(th, OB_FACE, th.faceRect(R1));
      for (const s of th.siblings) { this._obPush(th, OB_SIB, s._bbox()); this._obPush(th, OB_SIBFACE, s.faceRect(R1)); }
      const f = th.fxRect(R2); if (f) this._obPush(th, OB_FX, f);
      const p = th.propRect(R2); if (p) this._obPush(th, OB_PROP, p);
    }
    this._obOwner.length = this._obN;
    return this._obN;
  }
  _obPush(th, kind, r) {
    const n = this._obN;
    if (6 * (n + 1) > this._ob.length) { const nb = new Float32Array(this._ob.length * 2); nb.set(this._ob); this._ob = nb; }
    const ob = this._ob, i = 6 * n;
    ob[i] = r.left; ob[i + 1] = r.top; ob[i + 2] = r.right; ob[i + 3] = r.bottom; ob[i + 4] = kind;
    this._obOwner[n] = th; this._obN = n + 1;
  }

  // The words sit beside their thought where nothing else is: below, above, right or left of it,
  // scored against the hero, every body and face (a face is never covered), the effects above a
  // feeling's head, props, and the words already placed, inside the bounds; they keep their place
  // unless somewhere else is clearly better (never when their place is on something).
  _tags(dt, env) {
    const rm = env.rm, W = env.view.W, H = env.view.H, edge = W < 360 ? 12 : 16;
    const B = env.bounds, K = this._keep();
    const yMin = Math.max(edge, B.top), yMax = Math.min(H - edge, B.bottom + 2);
    const placed = this._placed || (this._placed = []);
    placed.length = 0;
    const C = this._cands || (this._cands = Array.from({ length: 8 }, () => ({ x: 0, y: 0, ax: 0, ay: 0, score: 0 })));
    const nOb = this._obstacles(), ob = this._ob, own = this._obOwner;
    for (const th of this.thoughts) {
      const tg = this.tags.get(th);
      if (!tg) continue;
      this._fitText(th, tg, W);
      if (tg.measure) this._measureTag(tg, W);
      const Q = th.render.pts, b = th._bbox(), gap = 14 + 8 * (1 - th.z), w = tg.w, h = tg.h;
      const bx = Q[2 * PT.bottom], tx0 = Q[2 * PT.top];
      const fx = th.fxRect(this._rect2), topY = fx ? Math.min(b.top, fx.top) : b.top;
      this._cand(C[0], bx, b.bottom + gap, w, h, edge, W, yMin, yMax);
      this._cand(C[1], tx0, topY - gap - h, w, h, edge, W, yMin, yMax);
      this._cand(C[2], b.right + gap + w / 2, b.cy - h / 2, w, h, edge, W, yMin, yMax);
      this._cand(C[3], b.left - gap - w / 2, b.cy - h / 2, w, h, edge, W, yMin, yMax);
      this._cand(C[4], bx + w * 0.32, b.bottom + gap, w, h, edge, W, yMin, yMax);
      this._cand(C[5], bx - w * 0.32, b.bottom + gap, w, h, edge, W, yMin, yMax);
      this._cand(C[6], tx0 + w * 0.32, topY - gap - h, w, h, edge, W, yMin, yMax);
      this._cand(C[7], tx0 - w * 0.32, topY - gap - h, w, h, edge, W, yMin, yMax);
      let best = 0;
      for (let i = 0; i < C.length; i++) {
        const c = C[i], l = c.x - w / 2, t = c.y, r = c.x + w / 2, bt = c.y + h, A = w * h;
        let sc = 0.12 * i + Math.hypot(c.x - c.ax, c.y - c.ay) / 50;
        // words on the hero would take its touches: never
        if (K) sc += 100 * overA(l, t, r, bt, K.left - 4, K.top - 4, K.right + 4, K.bottom + 4) / A;
        for (let k = 0; k < nOb; k++) {
          const j = 6 * k, a = overA(l, t, r, bt, ob[j] - 4, ob[j + 1] - 4, ob[j + 2] + 4, ob[j + 3] + 4);
          if (a > 0) sc += (own[k] === th ? W_OWN : W_OTHER)[ob[j + 4]] * a / A;
        }
        for (const q of placed) sc += 8 * overA(l, t, r, bt, q.left - 4, q.top - 4, q.right + 4, q.bottom + 4) / A;
        // below a feeling whose effects rise over its head; the side chosen when it arrived, or the host's wish
        const side = SIDE_NAMES[i];
        if (side === 'above' && fxAbove(th)) sc += 2.5;
        if (th.labelSide === side) sc -= 1.5;
        else if (tg.pref === i || (tg.pref === 0 && (i === 4 || i === 5)) || (tg.pref === 1 && i >= 6)) sc -= 0.4;
        c.score = sc;
        if (sc < C[best].score) best = i;
      }
      // The side is a layout decision, not a per-frame one: on its way home it keeps the side chosen
      // when it arrived; at rest it moves only when its place has been clearly worse for half a second
      // (at once when it is on a face, the hero or the effects over its head)
      const prev = tg.cand ?? 0;
      const travelling = !tg.shown || Math.hypot(th.x - th.home.x, th.y - th.home.y) > 0.35 * th.render.P;
      if (travelling) { best = tg.pref ?? prev; tg.badT = 0; }
      else if (best !== prev) {
        const worse = C[prev].score > C[best].score + 0.6;
        tg.badT = worse ? (tg.badT || 0) + dt : 0;
        if (C[prev].score < 6 && tg.badT < 0.5) best = prev;
        else tg.badT = 0;
      } else tg.badT = 0;
      if (best !== prev && !travelling) tg.pref = best;
      const c = C[best];
      tg.cand = best; tg.side = SIDE_NAMES[best]; tg.above = best === 1;
      tg.tx = c.x; tg.ty = c.y; tg.clear = c.score < 1;
      const pr = this._rectPool || (this._rectPool = []);
      const r = pr[placed.length] || (pr[placed.length] = { left: 0, right: 0, top: 0, bottom: 0 });
      r.left = c.x - w / 2; r.right = c.x + w / 2; r.top = c.y; r.bottom = c.y + h;
      placed.push(r);
    }
    for (const th of this.thoughts) {
      const tg = this.tags.get(th);
      if (!tg) continue;
      if (rm || !tg.shown) { tg.x = tg.tx; tg.y = tg.ty; tg.vx = tg.vy = 0; }
      else {
        // a little spring lag: the words trail their thought
        const k = 140, c = 2 * Math.sqrt(k) * 0.82;
        tg.vx += (k * (tg.tx - tg.x) - c * tg.vx) * dt; tg.vy += (k * (tg.ty - tg.y) - c * tg.vy) * dt;
        tg.x += tg.vx * dt; tg.y += tg.vy * dt;
      }
      tg.rot = rm ? 0 : clamp(tg.vx * 0.012, -4, 4);
      const kx = Math.round(tg.x * 2), ky = Math.round(tg.y * 2), kr = Math.round(tg.rot * 10);
      if (kx !== tg.kx || ky !== tg.ky || kr !== tg.kr) {
        tg.kx = kx; tg.ky = ky; tg.kr = kr;
        tg.el.style.transform = `translate3d(${(tg.x - tg.w / 2).toFixed(1)}px,${tg.y.toFixed(1)}px,0) rotate(${tg.rot.toFixed(1)}deg)`;
      }
      const show = th.ov.appear > 0.35 && !th._leaving;
      if (show !== tg.shown) { tg.shown = show; tg.el.classList.toggle('tm-on', show); }
      const calm = th.look.relief > 0.55;
      if (calm !== tg.calm) { tg.calm = calm; tg.el.classList.toggle('tm-calm', calm); }
      // the tag's top edge carries the thought's light
      const tq = Math.round(th.look.tintK * 4);
      if (tq !== tg.tintQ) { tg.tintQ = tq; const t = tintAt(th.style.tint, 0, th.look.tintK, {}); tg.el.style.setProperty('--tm-tint', rgba(t.light, 0.55)); tg.el.style.setProperty('--tm-wash', rgba(t.mid, 0.16)); this.ropes.get(th).colour = rgba(t.light, 0.8); }
    }
  }

  // a candidate place for the words: its anchor (ax, ay) and the place clamped onto the screen
  _cand(c, x, y, w, h, edge, W, yMin, yMax) {
    c.ax = x; c.ay = y;
    c.x = clamp(x, edge + w / 2, Math.max(edge + w / 2, W - edge - w / 2));
    c.y = clamp(y, yMin, Math.max(yMin, yMax - h));
  }

  // the soft rope from the body to its words (verlet, pinned at both ends, a little slack)
  _ropes(dt, env) {
    for (const th of this.thoughts) {
      const rope = this.ropes.get(th), tg = this.tags.get(th);
      if (!rope || !tg) continue;
      const Q = th.render.pts, side = tg.side || 'below';
      const ai = side === 'above' ? PT.top : side === 'right' ? PT.right : side === 'left' ? PT.left : PT.bottom;
      const ax = Q[2 * ai] + (side === 'right' ? -2 : side === 'left' ? 2 : 0), ay = Q[2 * ai + 1] + (side === 'above' ? 2 : side === 'below' ? -2 : 0);
      const bx = side === 'right' ? tg.x - tg.w / 2 : side === 'left' ? tg.x + tg.w / 2 : tg.x;
      const by = side === 'above' ? tg.y + tg.h : side === 'below' ? tg.y : tg.y + tg.h / 2;
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
