// ThoughtLayer — draws many Thought and Belief Mallows and owns their words.
//
//   const layer = new ThoughtLayer({ ctx2d, tagRoot, keepOut: () => heroRect, onRead });
//   const th = layer.add({ text, emotion: 'anxiety', intensity: 0.7, from: {x, y}, home: {x, y} });
//   layer.frame(dt, t);                 // each frame (or layer.attach(mallowTouch): drawn in its frame)
//   router: if (!hero.hitTest(x, y) && layer.hitTest(x, y)) layer.pointer(e)
//
// Three ways to draw:
//   { ctx2d }    the caller's canvas (it clears it and sets CSS px → device px; e.g. the Hushfold's #fx-layer)
//   { canvas }   its own canvas: sized, cleared and ticked here (one shared rAF via rig.addTicker)
//   attach(mt)   on a MallowTouch's 2D canvas, inside its frame (thoughts sit above the hero mesh)
//
// The person's words ride on a DOM tag per thought: a <button> whose words are
// set with textContent only (never parsed), in the voice face (HM Nunito Sans)
// at 17 px (16 px on small phones) and never below 15 px — it is never
// scaled, however far the thought moves. Long words or a far-away thought
// show an excerpt (cut at a word, marked "…"); a tap reads all of them
// (onRead(th), or a small built-in reader). A soft rope tethers the tag to its
// thought; the tag trails with a little spring and tilts at most 4°.
// Same shape as the Hushfold's placeholder layer: add / list / remove /
// hitTest / pointer / rects / frame / clear / release / destroy / onChange.

import { ThoughtMallow, createThought, PT } from './thought.js';
import { BeliefMallow, createBelief } from './belief.js';
import { drawThought, drawRope } from './render.js';
import { tintAt, rgba, clamp, tagBudget, wordsExcerpt, TAG_MIN_PX } from './styles.js';
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
.tm-tag .tm-words{text-wrap:balance;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere;min-height:1.3em}
.tm-tag.tm-on{opacity:1}
.tm-tag.tm-measure{max-width:none!important;width:auto!important}
.tm-tag.tm-measure .tm-words{white-space:nowrap;display:block}
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

export class ThoughtLayer {
  /**
   * @param {object} o
   * @param {CanvasRenderingContext2D} [o.ctx2d]  draw here (the caller clears it and sets the dpr transform)
   * @param {HTMLCanvasElement} [o.canvas]  or own this canvas (sized, cleared, ticked here)
   * @param {HTMLElement} [o.tagRoot=document.body]  where the word tags live (position:fixed)
   * @param {boolean|()=>boolean} [o.reducedMotion]  default: the OS setting, live
   * @param {boolean|()=>boolean} [o.lowStim]
   * @param {()=>({left,top,right,bottom}|null)} [o.keepOut]  a rect thoughts float clear of (the hero Mallow), client px
   * @param {()=>({left,top,right,bottom})} [o.bounds]  where thoughts may float (default: the viewport, clear of the edges)
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
    this.hidden = false;
    this._env = { now: 0, rm: false, low: false, bounds: { left: 0, top: 0, right: 0, bottom: 0 }, away: null, view: { W: 1, H: 1 } };
    this._awayPt = { x: 0, y: 0 };
    this._view = { left: 0, top: 0, W: 1, H: 1, dpr: 1 };
    this._sorted = [];
    this._frames = 0;
    this._lastT = 0;
    this.destroyed = false;
    this._onResize = () => { this._measureView(); for (const tg of this.tags.values()) tg.measure = true; };
    if (typeof addEventListener === 'function') addEventListener('resize', this._onResize);
    if (typeof document !== 'undefined') document.fonts?.ready?.then(() => { for (const tg of this.tags.values()) tg.measure = true; });
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
   * ({text, emotion, intensity, scale, r, prop → a belief}). place: {x, y} or {from, home}.
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
    const home = place.home || (Number.isFinite(place.x) ? { x: place.x, y: place.y } : this._spot(th));
    const from = place.from || home;
    th.place(from); th.moveHome(home);
    for (const s of th.siblings) { s.layer = this; s.haptic ||= th.haptic; s.place(from); }
    th._computeRender(th.look, this._env);
    this.thoughts.push(th);
    if (th.text) this._makeTag(th);
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
    this._changed();
  }
  _forget(th) { this.remove(th); }

  clear() { for (const th of [...this.thoughts]) { this.remove(th); th.destroy(); } }
  /** Let the thoughts fade (a world takes the words over), then take them off. */
  release(ms = 700) {
    const until = performance.now() + ms;
    for (const th of this.thoughts) { th._leaving = until; th._leaveMs = ms; const tg = this.tags.get(th); if (tg) tg.el.style.pointerEvents = 'none'; }
    this._changed();
  }

  hideTags(b = true) { this.hidden = !!b; for (const tg of this.tags.values()) tg.el.classList.toggle('tm-hidden', this.hidden); }
  setReducedMotion(b) { this._rm = () => !!b; for (const th of this.thoughts) th.setReducedMotion(!!b); }
  setLowStim(b) { this._low = () => !!b; }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return this; }
  off(ev, fn) { const l = this.listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } return this; }
  _relay(ev, th, data) { for (const fn of this.listeners[ev] || []) { try { fn({ thought: th, ...data }); } catch (e) { console.error(e); } } if (ev === 'touch') this._changed(); }
  _changed() { try { this.onChange?.(); } catch { /* ignore */ } }

  /** Draw on a MallowTouch's 2D canvas, in its frame (one loop, above the hero). */
  attach(mt) {
    this.detach();
    this.mt = mt;
    this._mtLayer = mt.addLayer({
      draw2d: (ctx, info) => { this._attachedInfo = info; this.frame(info.dt, info.time, ctx); },
      busy: () => this.thoughts.length > 0,
    });
    if (!this.keepOut) this._mtKeep = true;
    return this;
  }
  detach() { if (this.mt && this._mtLayer) this.mt.removeLayer(this._mtLayer); this.mt = null; this._mtLayer = null; this._mtKeep = false; }

  // ------------------------------------------------------------- input --
  /** The top thought (or sibling) at a client point, or null. */
  hitTest(x, y) {
    const all = this._sortedNow();
    for (let i = all.length - 1; i >= 0; i--) { const th = all[i]; if (!th._leaving && th.hitTest(x, y)) return th; }
    return null;
  }

  /** Route a pointer: pointer(e) finds the thought under it; pointer(th, e) gives it to that one. True when taken. */
  pointer(a, b) {
    let th = null, e = a;
    if (b) { th = a; e = b; }
    if (!e) return false;
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

  /** Rects (client px) subtitles and other UI must keep clear of: each body with its words. */
  rects(out = []) {
    out.length = 0;
    for (const th of this.thoughts) {
      if (th._leaving) continue;
      const b = th.bodyRect();
      let l = b.left, t = b.top, r = b.right, btm = b.bottom;
      for (const s of th.siblings) { const sb = s.bodyRect(); l = Math.min(l, sb.left); t = Math.min(t, sb.top); r = Math.max(r, sb.right); btm = Math.max(btm, sb.bottom); }
      const tg = this.tags.get(th);
      if (tg && tg.w) { l = Math.min(l, tg.x - tg.w / 2); r = Math.max(r, tg.x + tg.w / 2); t = Math.min(t, tg.y); btm = Math.max(btm, tg.y + tg.h); }
      out.push({ left: l, top: t, right: r, bottom: btm, width: r - l, height: btm - t, id: th.id });
    }
    return out;
  }

  /** The words a thought's tag shows now. */
  tagText(th) { return this.tags.get(th)?.text ?? th.tokenAt(); }
  /** How full the stage is: 0 (room), 1, 2 (crowded: shorter excerpts). */
  get crowding() { return this.crowd || 0; }
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
    if (!Number.isFinite(dt)) { const n = performance.now(); dt = this._lastT ? (n - this._lastT) / 1000 : 1 / 60; this._lastT = n; }
    dt = clamp(dt, 0, 0.05);
    this._frames++;
    if (this._frames % 90 === 0) this._measureView();
    const V = this._view;
    if (this.own && ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    }
    // leaving (release): fade, then off the layer
    const now = performance.now();
    for (const th of [...this.thoughts]) if (th._leaving && now >= th._leaving) { this.remove(th); th.destroy(); }
    if (!this.thoughts.length) return false;
    const env = this._envNow(now);
    this._arrange(dt, env);
    for (const th of this.thoughts) {
      th.step(dt, env);
      if (th._leaving) th.render.alpha *= clamp((th._leaving - now) / Math.max(1, th._leaveMs));
    }
    const all = this._sortedNow();
    // ox/oy: the canvas's client offset (thoughts live in client px)
    let ox = V.left, oy = V.top;
    if (this.mt && this._attachedInfo) { ox = this._attachedInfo.view.left; oy = this._attachedInfo.view.top; }
    const o = this._drawOpts || (this._drawOpts = { ox: 0, oy: 0, rm: false, low: false });
    o.ox = ox; o.oy = oy; o.rm = env.rm; o.low = env.low;
    this._ropes(dt, env);
    if (ctx) {
      for (const th of this.thoughts) {
        const rope = this.ropes.get(th), tg = this.tags.get(th);
        if (rope && tg && tg.shown && !this.hidden) drawRope(ctx, rope, rope.colour, th.render.alpha * 0.85, ox, oy);
      }
      for (const th of all) drawThought(ctx, th, o);
    }
    this._tags(dt, env);
    return true;
  }

  _envNow(now) {
    const env = this._env, V = this._view;
    env.now = now / 1000; env.rm = this._rm(); env.low = this._low();
    env.view.W = typeof innerWidth === 'number' ? innerWidth : V.W; env.view.H = typeof innerHeight === 'number' ? innerHeight : V.H;
    const B = this.bounds?.();
    const W = env.view.W, H = env.view.H, edge = W < 360 ? 12 : 20;
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

  // far first; a thought's siblings just behind it
  _sortedNow() {
    const all = this.all(this._sorted);
    // siblings round the sides talk in front of their thought, the upper ones behind it
    const rank = (t) => (t.kind === 'sibling' ? (t.front ? 2 : 0) : 1);
    all.sort((a, b) => (b.z - a.z) || (rank(a) - rank(b)));
    return all;
  }

  // a free place for a new thought: beside the hero, clear of the others
  _spot() {
    const W = typeof innerWidth === 'number' ? innerWidth : 390, H = typeof innerHeight === 'number' ? innerHeight : 844;
    const k = this._keep();
    const x = k ? (k.right + 70 < W - 30 ? k.right + 56 : Math.max(60, k.left - 56)) : W * 0.7;
    const y = k ? Math.max(120, k.top + 20) : H * 0.45;
    return { x: Math.min(W - 60, Math.max(60, x)), y: y + this.thoughts.length * 26 };
  }

  // homes: room between thoughts (more round one given space) — then, as hard limits, inside the
  // bounds and clear of the hero (the hero takes touches first; nothing may sit on it)
  _arrange(dt, env) {
    const B = env.bounds, K = this._keep(), list = this.thoughts;
    const free = (th) => !(th.driven || th.pressed || th._glide);
    for (const th of list) {
      const R = th.render;
      let hwL = Math.max(24, R.W / 2) + 6, hwR = hwL, hhT = Math.max(24, R.P / 2) + 6, hhB = hhT;
      // a thought's siblings belong to its footprint (they crowd round it)
      for (const sb of th.siblings) {
        const r = sb._bbox();
        hwL = Math.max(hwL, th.x - r.left + 4); hwR = Math.max(hwR, r.right - th.x + 4); hhT = Math.max(hhT, th.y - r.top + 4); hhB = Math.max(hhB, r.bottom - th.y + 4);
      }
      const tg = this.tags.get(th), below = tg && tg.w && (tg.side || 'below') === 'below' ? tg.h + 16 : 0;
      // limits for the home, so that the drawn body (home + its own sink / drift) stays inside
      const dx = R.cx - th.x, dy = R.cy - th.y;
      const lim = th._lim || (th._lim = { minX: 0, maxX: 0, minY: 0, maxY: 0, hwL: 0, hwR: 0, hhT: 0, hhB: 0, dx: 0, dy: 0 });
      lim.minX = B.left + hwL - dx; lim.maxX = B.right - hwR - dx; lim.minY = B.top + hhT - dy; lim.maxY = B.bottom - hhB - below - dy;
      if (lim.maxY < lim.minY) lim.maxY = lim.minY;
      lim.hwL = hwL; lim.hwR = hwR; lim.hhT = hhT; lim.hhB = hhB; lim.dx = dx; lim.dy = dy;
    }
    // room between thoughts: footprints (body + words) never overlap; space() widens one's room
    for (const th of list) th._ov = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i], C = list[j];
        const fa = this._foot(A), fc = this._foot(C);
        const ox = Math.min(fa.r, fc.r) - Math.max(fa.l, fc.l), oy = Math.min(fa.b, fc.b) - Math.max(fa.t, fc.t);
        if (ox <= 0 || oy <= 0) continue;
        A._ov += ox * oy; C._ov += ox * oy;
        const ma = free(A) ? 1 : 0, mc = free(C) ? 1 : 0;
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
    // boxed in (still overlapping after a moment): glide to the best free place on the stage
    for (const th of list) {
      if (!free(th)) { th._stuck = 0; continue; }
      th._stuck = th._ov > 60 ? (th._stuck || 0) + dt : Math.min(0, (th._stuck || 0) + dt);
      if (th._stuck > 0.8) { this._freeSpot(th, K); th._stuck = -1.5; }
    }
    // hard limits last: the bounds, then never on the hero (out by the nearest way that stays in bounds)
    for (const th of list) {
      if (!free(th)) continue;
      const h = th.home, L = th._lim;
      h.x = clamp(h.x, L.minX, Math.max(L.minX, L.maxX)); h.y = clamp(h.y, L.minY, Math.max(L.minY, L.maxY));
      if (!K) continue;
      const l = K.left - L.hwR - 8 - L.dx, r = K.right + L.hwL + 8 - L.dx, t = K.top - L.hhB - 8 - L.dy, b = K.bottom + L.hhT + 4 - L.dy;
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

  // the least crowded home for a thought on a coarse grid (its footprint against the others' and the hero)
  _freeSpot(th, K) {
    const L = th._lim, f0 = this._foot(th);
    const ofl = f0.l - th.home.x, ofr = f0.r - th.home.x, oft = f0.t - th.home.y, ofb = f0.b - th.home.y;
    const others = [];
    for (const o of this.thoughts) if (o !== th) { const f = this._foot(o); others.push([f.l, f.t, f.r, f.b]); }
    if (K) others.push([K.left - 6, K.top - 6, K.right + 6, K.bottom + 6]);
    const over = (x, y) => {
      let a = 0;
      for (const [l, t, r, b] of others) { const ox = Math.min(x + ofr, r) - Math.max(x + ofl, l), oy = Math.min(y + ofb, b) - Math.max(y + oft, t); if (ox > 0 && oy > 0) a += ox * oy; }
      return a;
    };
    let bx = th.home.x, by = th.home.y, best = over(bx, by) * 2;
    const sx = Math.max(16, (L.maxX - L.minX) / 14), sy = Math.max(16, (L.maxY - L.minY) / 18);
    for (let x = L.minX; x <= L.maxX + 0.5; x += sx) {
      for (let y = L.minY; y <= L.maxY + 0.5; y += sy) {
        const sc = over(x, y) * 2 + Math.hypot(x - th.home.x, y - th.home.y) * 3;
        if (sc < best) { best = sc; bx = x; by = y; }
      }
    }
    th.home.x = bx; th.home.y = by;
  }

  _foot(th) {
    const f = th._footRect || (th._footRect = { l: 0, r: 0, t: 0, b: 0 });
    const R = th.render, sp = 1 + 0.9 * Math.max(th.levels.space.cur, th.earned.space);
    const hw = (R.W / 2) * sp + (th.siblings.length ? R.W * 0.45 : 0), hh = (R.P / 2) * sp + (th.siblings.length ? R.P * 0.35 : 0);
    const tg = this.tags.get(th);
    // where it will be drawn when it rests at home (its own sink and drift included)
    const x = th.home.x + (R.cx - th.x), y = th.home.y + (R.cy - th.y);
    f.l = x - hw - 6; f.r = x + hw + 6; f.t = y - hh - 4; f.b = y + hh + 4;
    if (tg && tg.w) {
      // the words where they sit now (relative to the thought), or below it before they are placed
      const dx = tg.shown ? tg.tx - R.cx : 0, dy = tg.shown ? tg.ty - R.cy : hh + 18;
      f.l = Math.min(f.l, x + dx - tg.w / 2 - 4); f.r = Math.max(f.r, x + dx + tg.w / 2 + 4);
      f.t = Math.min(f.t, y + dy - 4); f.b = Math.max(f.b, y + dy + tg.h + 4);
    }
    return f;
  }

  // ------------------------------------------------------------- words --
  _makeTag(th) {
    if (!this.tagRoot || typeof document === 'undefined') return;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tm-tag tm-${th.kind}`;
    const words = document.createElement('span');
    words.className = 'tm-words';
    el.appendChild(words);
    const label = th.kind === 'belief' ? 'Belief' : 'Thought';
    el.setAttribute('aria-label', `${label}: ${th.text}. Press to read it all; the arrow keys move it.`);
    el.addEventListener('click', () => this.read(th));
    el.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      th.moveHome({ x: th.home.x + d[0] * 18, y: th.home.y + d[1] * 18 });
      th._explore?.(0.02);
      this._changed();
    });
    // the words take their own taps; nothing underneath gets them
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    if (this.hidden) el.classList.add('tm-hidden');
    this.tagRoot.appendChild(el);
    const tg = { el, words, text: '', bucket: -1, w: 0, h: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 0, key: '', measure: true, shown: false, above: false, calm: false };
    this.tags.set(th, tg);
    th.tag = el;
    this._setTagText(th, tg);
    const rope = { x: new Float32Array(ROPE_N), y: new Float32Array(ROPE_N), px: new Float32Array(ROPE_N), py: new Float32Array(ROPE_N), init: false, colour: '#ffffff' };
    this.ropes.set(th, rope);
  }

  _setTagText(th, tg) {
    const b = Math.min(tagBudget(th.z), [999, 48, 24][this.crowd || 0]);
    if (b === tg.bucket) return;
    tg.bucket = b;
    const text = wordsExcerpt(th.text, b);
    if (text !== tg.text) { tg.text = text; tg.words.textContent = text; tg.measure = true; }
  }

  // the plate fits its balanced lines (text-wrap:balance alone keeps the box at its max width)
  _measureTag(tg, W) {
    const el = tg.el;
    el.style.width = '';
    el.classList.add('tm-measure');
    const mc = tg.words.scrollWidth;
    el.classList.remove('tm-measure');
    const maxW = Math.min(W < 361 ? 210 : 232, W - (W < 361 ? 28 : 40)), pad = W < 361 ? 24 : 30;
    const lines = Math.min(3, Math.ceil((mc + 1) / Math.max(40, maxW - pad)));
    if (lines > 1) {
      // the narrowest plate that still holds the words in that many lines
      const lh = parseFloat(getComputedStyle(tg.words).lineHeight) || 22;
      let w = Math.min(maxW, Math.ceil(mc / lines) + pad + 6);
      el.style.width = `${w}px`;
      for (let i = 0; i < 14 && w < maxW && tg.words.offsetHeight > lines * lh + 2; i++) { w = Math.min(maxW, w + 8); el.style.width = `${w}px`; }
    }
    tg.w = el.offsetWidth || tg.w; tg.h = el.offsetHeight || tg.h;
    tg.measure = false;
  }

  // How full the stage is (stable: recomputed only when the count, the view or the bounds change).
  // A crowded stage shows shorter excerpts of the words (still 17 px; a tap reads all of them).
  _crowdLevel(env) {
    const B = env.bounds, n = this.thoughts.length;
    const key = `${n}|${env.view.W}|${env.view.H}|${B.left | 0}|${B.top | 0}|${B.right | 0}|${B.bottom | 0}`;
    if (key === this._crowdKey) return this.crowd;
    this._crowdKey = key;
    const K = this._keep();
    const area = Math.max(1, (B.right - B.left) * (B.bottom - B.top) - (K ? (K.right - K.left) * (K.bottom - K.top) : 0));
    const per = area / Math.max(1, n);
    this.crowd = per < 40000 ? 2 : per < 64000 ? 1 : 0;
    for (const tg of this.tags.values()) tg.bucket = -1;
    return this.crowd;
  }

  // The words sit beside their thought where nothing else is: below, above, right or left of
  // it (scored against the hero, the other bodies and the words already placed, inside the
  // bounds), with a little hysteresis so they never flicker between places.
  _tags(dt, env) {
    const rm = env.rm, W = env.view.W, H = env.view.H, edge = W < 360 ? 12 : 16;
    const B = env.bounds, K = this._keep();
    const yMin = Math.max(edge, B.top), yMax = Math.min(H - edge, B.bottom + 2);
    this._crowdLevel(env);
    const placed = this._placed || (this._placed = []);
    placed.length = 0;
    const C = this._cands || (this._cands = Array.from({ length: 6 }, () => ({ side: '', x: 0, y: 0, ax: 0, ay: 0, score: 0 })));
    const frac = (x, y, w, h, r) => {
      const ox = Math.min(x + w / 2, r.right + 4) - Math.max(x - w / 2, r.left - 4), oy = Math.min(y + h, r.bottom + 4) - Math.max(y, r.top - 4);
      return ox > 0 && oy > 0 ? (ox * oy) / (w * h) : 0;
    };
    for (const th of this.thoughts) {
      const tg = this.tags.get(th);
      if (!tg) continue;
      this._setTagText(th, tg);
      if (tg.measure) this._measureTag(tg, W);
      const Q = th.render.pts, b = th._bbox(), gap = 14 + 8 * (1 - th.z), w = tg.w, h = tg.h;
      const bx = Q[2 * PT.bottom], tx0 = Q[2 * PT.top];
      const set = (i, side, x, y) => { const c = C[i]; c.side = side; c.ax = x; c.ay = y; c.x = clamp(x, edge + w / 2, Math.max(edge + w / 2, W - edge - w / 2)); c.y = clamp(y, yMin, Math.max(yMin, yMax - h)); };
      set(0, 'below', bx, b.bottom + gap);
      set(1, 'above', tx0, b.top - gap - h);
      set(2, 'right', b.right + gap + w / 2, b.cy - h / 2);
      set(3, 'left', b.left - gap - w / 2, b.cy - h / 2);
      set(4, 'below', bx + w * 0.32, b.bottom + gap);
      set(5, 'below', bx - w * 0.32, b.bottom + gap);
      let best = 0;
      for (let i = 0; i < C.length; i++) {
        const c = C[i];
        let sc = 0.12 * i + Math.hypot(c.x - c.ax, c.y - c.ay) / 50;
        if (K) sc += 100 * frac(c.x, c.y, w, h, K);   // words on the hero would take its touches: never
        sc += 8 * frac(c.x, c.y, w, h, b);
        for (const o of this.thoughts) {
          if (o === th || o._leaving) continue;
          sc += 6 * frac(c.x, c.y, w, h, o._bbox());
          for (const s of o.siblings) sc += 4 * frac(c.x, c.y, w, h, s._bbox());
        }
        for (const s of th.siblings) sc += 4 * frac(c.x, c.y, w, h, s._bbox());
        for (const r of placed) sc += 6 * frac(c.x, c.y, w, h, r);
        c.score = sc;
        if (sc < C[best].score) best = i;
      }
      // keep where it is unless somewhere else is clearly better
      const prev = tg.cand ?? 0;
      if (prev !== best && C[prev].score <= C[best].score + 0.6) best = prev;
      const c = C[best];
      tg.cand = best; tg.side = c.side; tg.above = c.side === 'above';
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
      const key = `${Math.round(tg.x * 2)}|${Math.round(tg.y * 2)}|${Math.round(tg.rot * 10)}`;
      if (key !== tg.key) {
        tg.key = key;
        tg.el.style.transform = `translate3d(${(tg.x - tg.w / 2).toFixed(1)}px,${tg.y.toFixed(1)}px,0) rotate(${tg.rot.toFixed(1)}deg)`;
      }
      const show = th.ov.appear > 0.35 && !th._leaving;
      if (show !== tg.shown) { tg.shown = show; tg.el.classList.toggle('tm-on', show); }
      const calm = th.look.relief > 0.55;
      if (calm !== tg.calm) { tg.calm = calm; tg.el.classList.toggle('tm-calm', calm); }
      // the tag's top edge carries the thought's light
      const tintKey = `${th.style.id}|${Math.round(th.look.tintK * 4)}`;
      if (tintKey !== tg.tintKey) { tg.tintKey = tintKey; const t = tintAt(th.style.tint, 0, th.look.tintK, {}); tg.el.style.setProperty('--tm-tint', rgba(t.light, 0.55)); tg.el.style.setProperty('--tm-wash', rgba(t.mid, 0.16)); this.ropes.get(th).colour = rgba(t.light, 0.8); }
    }
  }

  // another thought's body (or one of its siblings) under a tag placed at (x, y), or null
  _overBody(tg, x, y, own) {
    for (const o of this.thoughts) {
      if (o === own || o._leaving) continue;
      for (const b of [o, ...o.siblings]) {
        const r = b._bbox();
        if (x + tg.w / 2 > r.left - 4 && x - tg.w / 2 < r.right + 4 && y + tg.h > r.top - 4 && y < r.bottom + 4) return r;
      }
    }
    return null;
  }

  _overK(x, y, tg, K) { return x + tg.w / 2 > K.left - 4 && x - tg.w / 2 < K.right + 4 && y + tg.h > K.top - 4 && y < K.bottom + 4; }

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
