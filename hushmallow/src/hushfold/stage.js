// The Hushfold stage: the hero Mallow behind one small adapter, and the stage
// canvas on #fx-layer (touch ripples and the Thought Mallows), drawn in the
// Mallow rig's shared loop.
//
// stageMallow is the seam for MallowTouch (W2): createStageMallow(world) drives
// the existing MallowRig through app.world, and createStageMallow(world, {touch})
// wraps a MallowTouch instance behind exactly the same calls:
//   setEmotion(mix, intensity, opts), setStage(name, opts), react(kind, opts)
//   (opts.quiet reaches the Mallow: no anticipation squash or blink), lookAt(nx, ny),
//   bodyRect(), rect() (the same box: the Hushflow worlds' name for it),
//   float({lift, tilt}) (lift in body heights, tilt in degrees), hitTest(x, y),
//   pointer(e), on('touch', fn), ready,
//   multiTouch (the router gives it a second finger),
//   fit({cx, cy, size}), setMallow(id), loaded, tier, wheel(e) (touch only)
// 'touch' events: { kind: 'press'|'squeeze'|'release'|'tap'|'doubleTap'|'flick'
//   (+ MallowTouch: 'stretch'|'massage'|'stroke'|'jiggle'), depth, speed, held }
//
// createStage draws W2's ThoughtLayer (src/mallows/thought, loaded lazily) on the
// stage canvas, and runs the world (the Hushflow director, through worldTicker)
// first in the same tick: what a world writes to a thought this frame is drawn
// this frame, in one loop with the Mallow.

import { h } from '../app/ui.js';
import { addTicker, removeTicker, prefersReducedMotion } from '../mallows/rig.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------ Mallow --
export function createStageMallow(world, { touch = null } = {}) {
  if (touch) return touchAdapter(touch, world);
  const subs = new Map();
  let rig = null;
  const emit = (ev, data) => { for (const fn of subs.get(ev) || []) { try { fn(data); } catch (e) { console.warn('[stageMallow]', e); } } };
  const saved = new WeakMap();

  function attach(r) {
    if (!r || r === rig) return rig;
    detach();
    rig = r;
    // B2 fix for routed events (rig.js gets the same fix from W2): map client
    // px through the canvas's on-screen box, so a CSS-scaled layer still hits.
    saved.set(r, { toLocal: Object.prototype.hasOwnProperty.call(r, '_toLocal') ? r._toLocal : null });
    r._toLocal = (e) => {
      const c = r.canvas.getBoundingClientRect();
      return { x: (e.clientX - c.left) * (r.W / (c.width || 1)), y: (e.clientY - c.top) * (r.H / (c.height || 1)) };
    };
    // the stage's router holds pointer capture on #fx-layer; routed events must not move it
    r.canvas.setPointerCapture = () => {};
    r.canvas.releasePointerCapture = () => {};
    r.on('touch', (d) => {
      if (r !== rig) return;
      if (d.kind === 'squeeze') emit('touch', { kind: 'squeeze', depth: 1, held: 0.35 });
      else if (d.kind === 'release') emit('touch', { kind: 'release', held: d.held, speed: d.speed, dist: d.dist });
    });
    r.on('react', ({ kind }) => {
      if (r !== rig) return;
      if (kind === 'tap' || kind === 'doubleTap' || kind === 'flick') emit('touch', { kind });
      emit('react', { kind });
    });
    return rig;
  }
  function detach() {
    if (!rig) return;
    const s = saved.get(rig);
    if (s?.toLocal) rig._toLocal = s.toLocal; else delete rig._toLocal;
    delete rig.canvas.setPointerCapture;
    delete rig.canvas.releasePointerCapture;
    unfloat(rig.canvas);
    rig = null;
  }
  // this adapter's float (below) lives on the canvas's own `translate` / `rotate`
  function unfloat(c) {
    if (!c?.style) return;
    c.style.translate = '';
    c.style.rotate = '';
    c._fy = 0; c._fr = 0;
  }
  /**
   * The body box where the shell put it, without the float or a hop: world.bodyRect()'s
   * framing measured on the canvas's holder (which fills the layer and does not float).
   */
  function restRect() {
    const g = rig, holder = g?.canvas?.parentElement;
    if (!g?.S || !g.W || !g.H || !g.mallow?.bodyBox || !holder?.getBoundingClientRect) return null;
    const r = holder.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const kx = r.width / g.W, ky = r.height / g.H;
    const [bx0, by0, bx1, by1] = g.mallow.bodyBox;
    const bw = (bx1 - bx0) * g.S, bh = (by1 - by0) * g.S;
    const left = r.left + (g.CX - bw / 2) * kx, top = r.top + (g.BASE - bh) * ky, width = bw * kx, height = bh * ky;
    return { left, top, width, height, right: left + width, bottom: top + height, cx: left + width / 2, cy: top + height / 2 };
  }

  const api = {
    kind: 'rig',
    /** The rig reads one pointer: a second finger on it goes to the world instead. */
    multiTouch: false,
    get rig() { return rig; },
    get id() { return world.mallowId; },
    get ready() { return !!rig?.ready; },
    attach, detach,
    setEmotion(mix, intensity = 0.7, opts = {}) { world.setEmotion(mix, intensity, opts); },
    setStage(name, opts) { world.setStage(name, opts); },
    react(kind, opts) { world.react(kind, opts); },
    lookAt(nx, ny) { rig?.lookAt?.(nx, ny); },
    place(p, opts) { world.place({ ...p, calm: opts?.calm }); },
    /**
     * Float on the water: lift in body heights (up), tilt in degrees. The rig has no float of
     * its own, so its canvas moves with the CSS `translate` / `rotate` properties — separate
     * from the layer's `transform` (and its 720 ms transition), so the bob is never lagged or
     * eased away. float({lift: 0, tilt: 0}) puts it back.
     */
    float({ lift = 0, tilt = 0 } = {}) {
      const c = rig?.canvas;
      if (!c?.style) return;
      const h = (restRect() || world.bodyRect())?.height || 200;
      const ty = Math.round(-(Number(lift) || 0) * h * 10) / 10, rot = Math.round((Number(tilt) || 0) * 20) / 20;
      if ((c._fy || 0) === ty && (c._fr || 0) === rot) return;
      c._fy = ty; c._fr = rot;
      c.style.transformOrigin = '50% 82%';
      c.style.translate = ty ? `0 ${ty}px` : '';
      c.style.rotate = rot ? `${rot}deg` : '';
    },
    bodyRect() { return world.bodyRect(); },
    /** The same box as bodyRect() (the Hushflow worlds call it rect()). */
    rect() { return world.bodyRect(); },
    restRect,
    hitTest(x, y) {
      if (!rig?.ready || !rig.canvas) return false;
      const p = rig._toLocal({ clientX: x, clientY: y });
      if (typeof rig._hit === 'function') return rig._hit(p);
      const b = world.bodyRect();
      const dx = (x - b.cx) / (b.width / 2), dy = (y - b.cy) / (b.height / 2);
      return dx * dx + dy * dy < 1.2;
    },
    /** A routed pointer: {type:'down'|'move'|'up'|'cancel', id, x, y, t, pointerType}. */
    pointer(e) {
      if (!rig?.canvas) return;
      const type = { down: 'pointerdown', move: 'pointermove', up: 'pointerup', cancel: 'pointercancel' }[e.type];
      if (!type) return;
      let ev;
      try {
        ev = new PointerEvent(type, { pointerId: e.id, clientX: e.x, clientY: e.y, bubbles: false, cancelable: true, isPrimary: true,
          pointerType: e.pointerType || 'touch', buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1 });
      } catch { return; }
      rig.canvas.dispatchEvent(ev);
      if (type === 'pointerdown' && rig.press) emit('touch', { kind: 'press', depth: 0 });
    },
    /** Is the Mallow being held right now? */
    get pressed() { return !!rig?.press; },
    on(ev, fn) { if (!subs.has(ev)) subs.set(ev, new Set()); subs.get(ev).add(fn); return () => subs.get(ev)?.delete(fn); },
    destroy() { detach(); subs.clear(); },
  };
  return api;
}

/** The same interface over a W2 MallowTouch instance. */
function touchAdapter(t, world = null) {
  // a place the shell has planned but holds back for a moment (holdPlace): restRect() reports it at once — what the
  // worlds and the keep-outs plan round — while the body stays where it is until the hold ends, then goes there
  let held = false, pending = null, holdT = 0;
  const releasePlace = () => {
    clearTimeout(holdT); holdT = 0; held = false;
    const p = pending; pending = null;
    if (p) t.place({ x: p.cx, y: p.cy, size: p.size });
  };
  return {
    kind: 'touch',
    /** MallowTouch tracks several pointers (two-finger stretch): the router routes both. */
    multiTouch: true,
    get rig() { return t.rig; },
    get id() { return t.id ?? t.rig?.id; },
    get ready() { return !!t.ready; },
    /** Resolves when the current Mallow (and any swap in flight) is showing. */
    get loaded() { return t.loaded; },
    /** The render tier: 'A' (WebGL mesh), 'B' (2D triangles) or 'C' (2D strips). */
    get tier() { return t.stats?.tier; },
    attach() { return t.rig; }, detach() {},
    // the realm follows the strongest feeling, as world.setEmotion does in rig mode
    setEmotion: (mix, i, o) => {
      t.setEmotion(mix, i, o);
      const top = typeof mix === 'string' ? mix : Object.entries(mix || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
      world?.realm?.setEmotion?.(top, i ?? 0.7);
    },
    setStage: (n, o) => t.setStage(n, o),
    react: (k, o) => t.react(k, o),
    lookAt: (x, y) => t.lookAt(x, y),
    place: (p, o) => t.place(p, o),
    float: (f) => t.float?.(f),
    bodyRect: () => t.bodyRect(),
    /** The same box as bodyRect() (MallowTouch.rect(); the Hushflow worlds call it rect()). */
    rect: () => (typeof t.rect === 'function' ? t.rect() : t.bodyRect()),
    /**
     * The body box where the shell put it (its place and size, fit()), without its breath, squash, hops or a glide
     * still on its way: steady while the live body (bodyRect) moves — what layouts and keep-outs are planned round.
     */
    restRect() {
      const g = t.goalSt, v = t.view;
      if (!t.ready || !g || !v || !(v.w > 1)) return null;
      const r = t.container?.getBoundingClientRect?.() || { left: v.left || 0, top: v.top || 0 };
      // (a place held back: where it is going, as place({size}) will put it — the size clamped as MallowTouch clamps it)
      const base = t.baseSize || 0;
      const P = pending ? Math.min(3 * base, Math.max(0.2 * base, pending.size)) : base * (g.s || 1), w = P * (t.aspect || 1);
      if (!(P > 0)) return null;
      const cx = r.left + (pending ? pending.cx : g.x ?? v.w / 2), cy = r.top + (pending ? pending.cy : g.y ?? v.h * 0.52);
      return { left: cx - w / 2, top: cy - P / 2, width: w, height: P, right: cx + w / 2, bottom: cy + P / 2, cx, cy };
    },
    /**
     * Hold the body where it is for a moment while its next place is already planned: holdPlace(true) starts a hold
     * (fit() then only plans: restRect() reports the place, the body stays — at most 1.5 s), holdPlace(ms) ends it
     * that many ms from now, holdPlace(0) ends it now. Ending it sends the body to the last place fit() asked for.
     */
    holdPlace(v = true) {
      if (v === true) { held = true; clearTimeout(holdT); holdT = setTimeout(releasePlace, 1500); return; }
      const ms = Number(v) || 0;
      if (!held) return;
      if (ms > 0) { clearTimeout(holdT); holdT = setTimeout(releasePlace, ms); } else releasePlace();
    },
    get placeHeld() { return held; },
    hitTest: (x, y) => t.hitTest(x, y),
    pointer: (e) => t.pointer(e),
    /** ctrl + wheel over the body (a desktop trackpad pinch) stretches it. */
    wheel: (e) => t.wheel?.(e),
    /** Switch to another Mallow in place (same canvases and WebGL context). */
    setMallow: (id) => t.setMallow(id),
    /**
     * Put the body's centre at (cx, cy) client px with a body `size` px tall (the shell's
     * layout; the container covers the viewport at 0,0). MallowTouch sizes it against its
     * own measured view, so a fit made before it is ready lands at the right size at once.
     */
    fit({ cx, cy, size }) { if (held) { pending = { cx, cy, size }; return; } t.place({ x: cx, y: cy, size }); },
    get pressed() { return !!(t.pressed ?? t.state?.pressed); },
    // MallowTouch.on() chains (returns itself); the stage wants an unsubscribe
    on: (ev, fn) => { t.on(ev, fn); return () => t.off?.(ev, fn); },
    destroy: () => { clearTimeout(holdT); holdT = 0; held = false; pending = null; },
  };
}

// ------------------------------------------------------ stage canvas --
const NO_THOUGHTS = Object.freeze([]);

/**
 * createStage({ fx, tagRoot, reducedMotion, lowStim, onReadThought, keepOut, bounds, haptic, audio, textScale })
 *   → { canvas, thoughts, whenThoughts(), start(), worldTicker: { add, remove }, freeze(b), frozen,
 *       ripple(x, y, colour), kick(), size, destroy() }
 *
 * One canvas on #fx-layer (DPR ≤ 2) and no animation loop of its own: the stage ticks in the Mallow rig's
 * shared loop (rig.js addTicker, which also stops for a hidden tab). Each tick, in this order:
 *   1. the world tickers (worldTicker.add(fn): the Hushflow director, `ticker: stage.worldTicker`), so a
 *      world writes the thought's x / y / z / scale / rot / state / labelSide / opacity before it is drawn;
 *   2. nothing more while frozen (a paused world: the thoughts hold still where they are drawn);
 *   3. nothing while idle (no ripple, no thought, and nothing left on the canvas);
 *   4. clear, the ripples, then the ThoughtLayer's frame: the bodies on this canvas, their DOM word tags.
 * The ThoughtLayer (src/mallows/thought) loads lazily: whenThoughts() resolves with it (null if it could
 * not load). Until then `thoughts` is a stand-in with the same calls — empty: no list, no rects, no hits;
 * add() waits for the layer — and whatever kept the stand-in (the input router) reaches the layer
 * through it once it has loaded. After destroy() `thoughts` is that empty stand-in again.
 * start() puts the stage on the shared loop (a ripple, a thought or a world ticker does too).
 *
 * keepOut() → the hero's rect (client px; thoughts and their words keep off it); bounds() → where the
 * thoughts may float (default: under tagRoot's .hf-top, over its .hf-dock pills); onReadThought(th) → a
 * tap on the words; textScale() → the person's text size
 * (default: --type-scale on <html>, as Settings sets it); haptic(kind), audio {fx(name, opts)}.
 */
export function createStage({ fx, tagRoot = null, reducedMotion = () => prefersReducedMotion(), lowStim = () => false, onReadThought = null, onRead = null,
  keepOut = null, bounds = null, haptic = null, audio = null, textScale = null } = {}) {
  const canvas = h('canvas', { class: 'hf-stage', 'aria-hidden': 'true' });
  fx.replaceChildren(canvas);
  fx.classList.add('live');
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const ripples = [];
  const worlds = new Set(), failed = new WeakSet();
  let layer = null, destroyed = false, frozen = false, onLoop = false, drawn = false, dirty = false;
  // what the shell asked of the thoughts before the layer had loaded (a first Tell on a slow line):
  // done on the layer once it has
  let early = [], subs = [], hide = null, held = null, unavailable = false;

  function resize() {
    dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    W = typeof innerWidth === 'number' ? innerWidth : 0; H = typeof innerHeight === 'number' ? innerHeight : 0;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // (that wiped the canvas: the next tick draws it again, frozen or not; a resize alone does not join
    // the shared loop — start() does, after the hero, so a world sees this frame's hero)
    dirty = true;
  }
  // the person's text size as Settings sets it on <html> (ui/type.js setTextScale): the words grow with it
  const textK = textScale ?? (() => { try { return parseFloat(document.documentElement.style.getPropertyValue('--type-scale')) || 1; } catch { return 1; } });
  // no bounds from the shell: the room its own controls leave — under its top bar and subtitle band, over
  // its dock — read at most four times a second (never every frame); a shell that passes bounds() decides
  let shellB = null, shellAt = -1e9;
  function shellBounds() {
    const now = performance.now();
    if (now - shellAt < 250) return shellB;
    shellAt = now;
    const q = (s) => (typeof tagRoot?.querySelector === 'function' ? tagRoot.querySelector(s) : null);
    const top = q('.hf-top'), dock = q('.hf-dock');
    if (!top && !dock) return (shellB = null);
    const vh = typeof innerHeight === 'number' ? innerHeight : H;
    let dockTop = vh - 24;
    for (const el of dock?.children || []) {
      if (el.hidden || el.classList?.contains('is-hidden')) continue;
      const r = el.getBoundingClientRect();
      if (r.height) dockTop = Math.min(dockTop, r.top);
    }
    // (under the top bar and the subtitle band the shell keeps below it: clamp(0.17 H, 118, 156) px)
    const tb = top?.getBoundingClientRect(), band = top ? Math.min(156, Math.max(118, vh * 0.17)) : 0;
    shellB = { top: Math.max(Math.min(96, vh * 0.12), (tb?.bottom || 0) + band), bottom: dockTop - 10 };
    return shellB;
  }

  const ready = import('../mallows/thought/index.js').then(({ ThoughtLayer }) => {
    if (destroyed) return null;
    const L = new ThoughtLayer({ ctx2d: g, tagRoot, keepOut, bounds: bounds || shellBounds, onRead: onReadThought || onRead, reducedMotion, lowStim, haptic, audio, textScale: textK });
    L.onChange = kick;
    layer = L;
    if (hide != null) L.hideTags(hide);
    if (held != null) L.pause(held);
    for (const [ev, fn] of subs.splice(0)) L.on(ev, fn);
    for (const [th, place] of early.splice(0)) { try { L.add(th, place); } catch (e) { console.warn('[stage] a thought could not be added', e); } }
    return L;
  }, (e) => {
    unavailable = true; early = []; subs = [];
    console.warn('[stage] Thought Mallows unavailable:', e?.message || e);
    return null;
  });

  /** The thoughts before the layer has loaded (and after destroy): empty, the same calls, forwarding once it is there. */
  const soon = Object.freeze({
    get list() { return layer ? layer.list : NO_THOUGHTS; },
    get primary() { return layer ? layer.primary : null; },
    get roominess() { return layer ? layer.roominess : Infinity; },
    get crowding() { return layer ? layer.crowding : 0; },
    get pressed() { return !!layer?.pressed; },
    get reading() { return !!layer?.reading; },
    add(th, place) {
      if (layer) return layer.add(th, place);
      if (!unavailable && !destroyed) { early.push([th, place]); kick(); }
      return null;
    },
    remove(th) { if (layer) layer.remove(th); else early = early.filter((q) => q[0] !== th); },
    release(ms, which) { if (layer) layer.release(ms, which); else if (which == null) early = []; },
    clear() { if (layer) layer.clear(); else early = []; },
    rects(out = []) { if (layer) return layer.rects(out); out.length = 0; return out; },
    hitTest(x, y) { return layer ? layer.hitTest(x, y) : null; },
    pointer(a, b) { return layer ? layer.pointer(a, b) : false; },
    hideTags(b = true) { hide = !!b; layer?.hideTags(hide); },
    pause(b = true) { held = !!b; layer?.pause(held); },
    resume() { held = false; layer?.resume(); },
    relayout() { layer?.relayout(); },
    tagOf(th) { return layer ? layer.tagOf(th) : null; },
    tagText(th) { return layer ? layer.tagText(th) : ''; },
    read(th) { layer?.read(th); },
    closeRead() { layer?.closeRead(); },
    on(ev, fn) { if (layer) layer.on(ev, fn); else if (!destroyed) subs.push([ev, fn]); return soon; },
    off(ev, fn) { if (layer) layer.off(ev, fn); else subs = subs.filter((q) => q[0] !== ev || q[1] !== fn); return soon; },
  });

  function tick(dt, t) {
    if (destroyed) return;
    // 1. the world first: what it writes to a thought this frame is drawn this frame
    for (const fn of worlds) {
      try { fn(dt, t); } catch (e) { if (!failed.has(fn)) { failed.add(fn); console.error('[stage] a world ticker failed a frame:', e); } }
    }
    // 2. a paused world: everything holds still where it is drawn (unless the canvas was wiped)
    if (frozen && !dirty) return;
    // 3. idle: nothing to draw, nothing left on the canvas
    const live = ripples.length > 0 || (layer ? layer.list.length > 0 : false);
    if (!live && !drawn && !dirty) return;
    dirty = false;
    const step = frozen ? 0 : dt;
    // 4. clear, ripples, the thoughts (their words last)
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const rm = reducedMotion(), low = lowStim();
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += step / (rm ? 0.5 : 0.9);
      if (r.t >= 1) { ripples.splice(i, 1); continue; }
      const k = r.t, a = (1 - k) * (1 - k) * (low ? 0.16 : 0.32);
      g.globalAlpha = a;
      g.strokeStyle = r.colour;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(r.x, r.y, rm ? 18 : 10 + 54 * (1 - (1 - k) * (1 - k)), 0, TAU);
      g.stroke();
      if (!rm) { g.globalAlpha = a * 0.5; g.beginPath(); g.arc(r.x, r.y, 6 + 30 * k, 0, TAU); g.stroke(); }
    }
    g.globalAlpha = 1;
    drawn = ripples.length > 0;
    if (layer && layer.list.length) drawn = layer.frame(step, t) || drawn;
  }
  /** On the shared loop (once; until destroy). */
  function ensure() { if (!onLoop && !destroyed) { onLoop = true; addTicker(tick); } }
  /** Something changed: draw the next frame (even when idle or frozen). */
  function kick() { dirty = true; ensure(); }

  /** The director's ticker ({ ticker: stage.worldTicker }): its worlds step first in the stage's tick. */
  const worldTicker = Object.freeze({
    add(fn) { if (typeof fn === 'function' && !destroyed) { worlds.add(fn); ensure(); } return fn; },
    remove(fn) { worlds.delete(fn); },
  });

  if (typeof addEventListener === 'function') addEventListener('resize', resize);
  resize();

  const stage = {
    canvas,
    /** The ThoughtLayer once it has loaded; until then (and after destroy) the empty stand-in. */
    get thoughts() { return layer || soon; },
    /** Resolves with the ThoughtLayer (null if it could not load or the stage is gone). */
    whenThoughts: () => ready,
    /** Join the shared loop now (the shell: after the hero is up). */
    start() { kick(); return stage; },
    worldTicker,
    /** Hold the thoughts and ripples still where they are drawn (a paused world); the world tickers still run. */
    freeze(b = true) { frozen = !!b; kick(); },
    get frozen() { return frozen; },
    get size() { return { W, H }; },
    ripple(x, y, colour = '#ffd98a') {
      if (ripples.length > 5) ripples.shift();
      ripples.push({ x, y, t: 0, colour });
      kick();
    },
    kick,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (onLoop) { removeTicker(tick); onLoop = false; }
      worlds.clear(); early = []; subs = [];
      if (typeof removeEventListener === 'function') removeEventListener('resize', resize);
      const L = layer;
      layer = null;
      try { L?.destroy(); } catch (e) { console.warn('[stage] thoughts', e); }
      canvas.remove();
      fx.classList.remove('live');
    },
  };
  return stage;
}
