// The Hushfold stage: the hero Mallow behind one small adapter, the stage
// canvas on #fx-layer (touch ripples, placeholder Thought Mallows) and the
// one animation loop that draws it.
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
// The placeholder Thought layer stands in for W2's ThoughtLayer until it
// lands (same shape: add/hitTest/pointer/rects/destroy; thoughts carry
// {id, text, emotion, x, y, scale, state:{tension, charge, calm, distance},
// react, soften, settle, transform, hitTest, pointer, destroy}). It draws a
// translucent jelly with a simple face — clearly not one of the seven — and
// keeps the person's exact words in a DOM tag (textContent only).

import { h } from '../app/ui.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hexA = (hex, a) => { const n = parseInt(String(hex).slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const lerp = (a, b, t) => a + (b - a) * t;
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
    fit({ cx, cy, size }) { t.place({ x: cx, y: cy, size }); },
    get pressed() { return !!(t.pressed ?? t.state?.pressed); },
    // MallowTouch.on() chains (returns itself); the stage wants an unsubscribe
    on: (ev, fn) => { t.on(ev, fn); return () => t.off?.(ev, fn); },
    destroy: () => {},
  };
}

// ------------------------------------------------------ stage canvas --
/**
 * createStage({fx, prefs, reducedMotion}) → { canvas, ripple(x,y,colour), thoughts, start(), destroy() }
 * One canvas on #fx-layer (DPR ≤ 2) and one rAF loop that runs only while
 * something moves (ripples, thoughts) and stops when the tab is hidden.
 */
export function createStage({ fx, tagRoot, reducedMotion = () => false, lowStim = () => false, onReadThought, keepOut = () => null } = {}) {
  const canvas = h('canvas', { class: 'hf-stage', 'aria-hidden': 'true' });
  fx.replaceChildren(canvas);
  fx.classList.add('live');
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    kick();
  }
  const ripples = [];
  let raf = 0, last = 0, destroyed = false, drewSomething = false;
  const thoughts = createThoughtLayer({ g, tagRoot, reducedMotion, lowStim, onRead: onReadThought, size: () => ({ W, H }), keepOut });

  function frame(t) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(0.05, Math.max(0.001, (t - (last || t)) / 1000));
    last = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const rm = reducedMotion(), low = lowStim();
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt / (rm ? 0.5 : 0.9);
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
    const living = thoughts.frame(dt, t / 1000);
    drewSomething = ripples.length > 0 || living;
    if (drewSomething && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function kick() { if (!raf && !destroyed && !document.hidden) raf = requestAnimationFrame(frame); }
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener('visibilitychange', onVis);
  addEventListener('resize', resize);
  resize();
  thoughts.onChange = kick;

  return {
    canvas,
    thoughts,
    get size() { return { W, H }; },
    ripple(x, y, colour = '#ffd98a') {
      if (ripples.length > 5) ripples.shift();
      ripples.push({ x, y, t: 0, colour });
      kick();
    },
    kick,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('resize', resize);
      thoughts.destroy();
      canvas.remove();
      fx.classList.remove('live');
    },
  };
}

// --------------------------------------------- placeholder Thoughts --
// Tints per feeling: soft, translucent, distinct from every Mallow's body.
const TINTS = {
  anger: ['#ff8a7a', '#ff5470'], anxiety: ['#a9e4ff', '#6fb8ff'], sadness: ['#9db4ff', '#6c7ff0'], overwhelm: ['#d6b8ff', '#a77bff'],
  frustration: ['#ffc58a', '#ff9a52'], loneliness: ['#a8efe2', '#5fcfc0'], restlessness: ['#ffe9a3', '#ffc94d'], none: ['#e8dcff', '#b9a3ff'],
};
const MOTION = {
  anger: { jitter: 1.2, bob: 0.9, speed: 1.4 }, anxiety: { jitter: 0.9, bob: 0.7, speed: 2.2 }, sadness: { jitter: 0, bob: 0.5, speed: 0.45, droop: 1 },
  overwhelm: { jitter: 0.4, bob: 0.9, speed: 1.2 }, frustration: { jitter: 0.7, bob: 0.8, speed: 1.1 }, loneliness: { jitter: 0, bob: 1.2, speed: 0.5 },
  restlessness: { jitter: 0.5, bob: 1.1, speed: 1.8 }, none: { jitter: 0.2, bob: 1, speed: 0.8 },
};
const BASE_TENSION = { anger: 0.85, anxiety: 0.75, frustration: 0.7, overwhelm: 0.7, restlessness: 0.55, sadness: 0.55, loneliness: 0.45, none: 0.45 };

function excerpt(text, max = 42) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const words = t.split(' ');
  let out = '';
  for (const w of words) { if ((out ? out.length + 1 : 0) + w.length > max - 1) break; out = out ? `${out} ${w}` : w; }
  return `${(out || t.slice(0, max - 1)).replace(/[.,;:]$/, '')}…`;
}

function createThoughtLayer({ g, tagRoot, reducedMotion, lowStim, onRead, size, keepOut = () => null }) {
  const list = [];
  let nextId = 1;
  const layer = {
    onChange: null,
    get list() { return list; },
    /** add({text, emotion, intensity, from:{x,y}, home:{x,y}, r}) → thought */
    add({ text, emotion = null, intensity = 0.6, from = null, home, r = 38 } = {}) {
      const key = TINTS[emotion] ? emotion : 'none';
      const id = `t${nextId++}`;
      const tag = h('button', { class: 'hf-tag hf-ui', type: 'button', 'aria-label': `Your thought: ${text}. Tap to read it all.` });
      tag.textContent = excerpt(text);
      tagRoot.append(tag);
      const th = {
        id, text: String(text || ''), token: tag.textContent, emotion, key, intensity, r,
        x: from?.x ?? home.x, y: from?.y ?? home.y, hx: home.x, hy: home.y, vx: 0, vy: 0,
        scale: reducedMotion() ? 1 : 0.2, born: 0, sq: 0, sqV: 0, phase: Math.random() * TAU,
        state: { tension: BASE_TENSION[key] * (0.6 + 0.4 * clamp(intensity)), charge: 0, calm: 0, distance: 0 },
        press: null, tag, gradient: null,
        react(kind) { if (kind === 'tap') th.sqV += 2.4; if (kind === 'squeeze') th.sqV += 1.2; layer.onChange?.(); },
        soften(k = 0.1) { th.state.calm = clamp(th.state.calm + k); layer.onChange?.(); },
        settle(k = 0.1) { th.state.tension = clamp(th.state.tension - k); layer.onChange?.(); },
        transform(k = 0) { th.state.charge = clamp(k); layer.onChange?.(); },
        hitTest(x, y) { return Math.hypot(x - th.x, y - th.y) < th.r * th.scale * 1.35; },
        pointer(e) { layer.pointer(th, e); },
        moveHome(p) { th.hx = p.x; th.hy = p.y; layer.onChange?.(); },
        destroy() { layer.remove(th); },
      };
      tag.addEventListener('click', () => onRead?.(th));
      list.push(th);
      layer.onChange?.();
      return th;
    },
    remove(th) {
      const i = list.indexOf(th);
      if (i >= 0) list.splice(i, 1);
      th.tag.remove();
      layer.onChange?.();
    },
    hitTest(x, y) { for (let i = list.length - 1; i >= 0; i--) if (!list[i].leaving && list[i].hitTest(x, y)) return list[i]; return null; },
    pointer(th, e) {
      if (e.type === 'down') { th.press = { id: e.id, x0: e.x, y0: e.y, ox: th.x - e.x, oy: th.y - e.y, t0: performance.now(), moved: 0 }; th.sqV += 1.6; }
      else if (e.type === 'move' && th.press && th.press.id === e.id) {
        th.press.moved = Math.max(th.press.moved, Math.hypot(e.x - th.press.x0, e.y - th.press.y0));
        if (th.press.moved > 10) {
          const { W, H } = size();
          let x = clamp(e.x + th.press.ox, th.r + 16, W - th.r - 16);
          const y = clamp(e.y + th.press.oy, 90 + th.r, H - th.r - 90);
          // a thought never sits on the hero Mallow (the Mallow takes touches first there)
          const k = keepOut();
          if (k && y > k.top - th.r && y < k.bottom + th.r && x > k.left - th.r && x < k.right + th.r) {
            const toLeft = x - (k.left - th.r), toRight = (k.right + th.r) - x;
            const nx = toLeft < toRight ? k.left - th.r : k.right + th.r;
            x = nx < th.r + 8 || nx > W - th.r - 8 ? x : nx;
            if (x > k.left - th.r && x < k.right + th.r) th.hy = Math.max(k.bottom + th.r, y); else th.hy = y;
          } else th.hy = y;
          th.hx = x;
        }
      } else if ((e.type === 'up' || e.type === 'cancel') && th.press && th.press.id === e.id) {
        const held = (performance.now() - th.press.t0) / 1000;
        if (held < 0.3 && th.press.moved < 12) th.react('tap');
        th.sqV -= 2.2;
        th.press = null;
      }
      layer.onChange?.();
    },
    /** Rectangles to keep subtitles off (thought body + its word tag). */
    rects() {
      return list.filter((th) => !th.leaving).map((th) => {
        const r = th.r * Math.max(0.6, th.scale) * 1.25;
        const tb = th.tag.getBoundingClientRect();
        return { left: Math.min(th.x - r, tb.left), right: Math.max(th.x + r, tb.right), top: th.y - r, bottom: Math.max(th.y + r, tb.bottom) };
      });
    },
    frame(dt, t) {
      if (!list.length) return false;
      const rm = reducedMotion(), low = lowStim();
      for (const th of [...list]) {
        const mo = MOTION[th.key];
        // leaving fades on the clock, not per frame (a slow frame never stretches the hand-over)
        if (th.leaving) { th.born = th.leaveFrom * (1 - (performance.now() - th.leaveAt) / (th.leaving * 1000)); if (th.born <= 0) { layer.remove(th); continue; } }
        else th.born = Math.min(1, th.born + dt / (rm ? 0.4 : 1.1));
        // springs: home position, scale, squash
        const k = th.press ? 120 : 26, d = th.press ? 18 : 7.5;
        th.vx += ((th.hx - th.x) * k - th.vx * d) * dt; th.vy += ((th.hy - th.y) * k - th.vy * d) * dt;
        th.x += th.vx * dt; th.y += th.vy * dt;
        th.scale += ((1 - th.scale) * 9) * dt;
        const sqGoal = th.press ? 0.16 + 0.06 * Math.sin(t * 9) * (rm ? 0 : 1) : 0;
        th.sqV += ((sqGoal - th.sq) * 160 - th.sqV * 9) * dt;
        th.sq += th.sqV * dt;
        // holding a thought gently softens it; it never disappears
        if (th.press) { th.state.calm = clamp(th.state.calm + dt * 0.18); }
        const tension = th.state.tension * (1 - 0.75 * th.state.calm);
        // motion: bob + feeling-specific jitter (calmer as it softens)
        const bob = rm ? 0 : Math.sin(t * mo.speed + th.phase) * 3.2 * mo.bob * (1 - 0.5 * th.state.calm);
        const jit = rm || low ? 0 : mo.jitter * tension * 1.6;
        const jx = jit ? Math.sin(t * 37 + th.phase) * jit : 0, jy = jit ? Math.cos(t * 41 + th.phase * 2) * jit : 0;
        drawThought(g, th, th.x + jx, th.y + bob + jy, tension, t, { rm, low, droop: mo.droop || 0 });
        // the word tag rides just under the body, always fully on screen
        const tagY = th.y + bob + th.r * th.scale * 1.05 + 8;
        const tw = th.tagW || (th.tagW = th.tag.offsetWidth || 120);
        const { W } = size();
        const edge = W < 360 ? 12 : 20;   // clear of the edge-swipe zone where there is room
        const tx = clamp(th.x, edge + tw / 2, Math.max(edge + tw / 2, W - edge - tw / 2));
        th.tag.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(tagY)}px, 0) translate(-50%, 0)`;
        th.tag.style.opacity = String(clamp(th.born * 1.4 - 0.2));
      }
      return true;
    },
    clear() { for (const th of [...list]) layer.remove(th); },
    /** Let every thought fade away gently (a world is taking the words over). */
    release(ms = 700) { const now = performance.now(); for (const th of list) { if (th.leaving) continue; th.leaving = ms / 1000; th.leaveAt = now; th.leaveFrom = th.born; th.tag.style.pointerEvents = 'none'; } layer.onChange?.(); },
    destroy() { layer.clear(); },
  };
  return layer;
}

function drawThought(g, th, x, y, tension, t, { rm, low, droop }) {
  const [light, deep] = TINTS[th.key];
  const r = th.r * Math.max(0.05, th.scale);
  const sx = 1 + th.sq * 0.9, sy = 1 - th.sq;
  g.save();
  g.translate(x, y + r * (1 - sy));
  g.scale(sx, sy);
  // soft glow halo (no shadowBlur: cheaper, photosafe); a cached falloff, not a flat disc
  if (!th.halo || th.haloR !== Math.round(r)) {
    const hg = g.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.55);
    hg.addColorStop(0, deep); hg.addColorStop(1, hexA(deep, 0));
    th.halo = hg; th.haloR = Math.round(r);
  }
  g.globalAlpha = (low ? 0.22 : 0.42) * th.born;
  g.fillStyle = th.halo;
  g.beginPath(); g.arc(0, 0, r * 1.55, 0, TAU); g.fill();
  // jelly body
  const rk = Math.round(r * 2) / 2;      // re-make the gradient only when the size really changes
  if (!th.gradient || th.gradR !== rk) {
    const gr = g.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.08, 0, 0, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.92)');
    gr.addColorStop(0.35, light);
    gr.addColorStop(1, deep);
    th.gradient = gr; th.gradR = rk;
  }
  g.globalAlpha = 0.82 * th.born;
  g.fillStyle = th.gradient;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  // rim
  g.globalAlpha = 0.55 * th.born;
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(0, 0, r - 0.75, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
  // shine
  g.globalAlpha = 0.5 * th.born;
  g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(-r * 0.36, -r * 0.44, r * 0.2, r * 0.11, -0.5, 0, TAU); g.fill();
  // face: two dots, a brow line that eases as tension drops, a small mouth
  const blinkT = (t + th.phase) % 4.2;
  const blink = !rm && blinkT < 0.12 ? 0.15 : 1;
  const ey = -r * 0.04 + droop * r * 0.04, ex = r * 0.27, er = r * 0.085;
  g.globalAlpha = 0.9 * th.born;
  g.fillStyle = '#241640';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, ey, er, er * blink * (th.press ? 0.55 : 1), 0, 0, TAU); g.fill(); }
  g.strokeStyle = '#241640'; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, r * 0.05);
  // brows: inner ends dip when tense (worried/cross); sadness lifts them instead
  const bt = tension * (droop ? -0.6 : 1);
  g.globalAlpha = 0.65 * th.born * clamp(tension * 1.4);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * (ex + er * 1.5), ey - er * 2.3 - bt * er * 0.5);
    g.lineTo(s * (ex - er * 1.5), ey - er * 2.3 + bt * er * 0.9);
    g.stroke();
  }
  const smile = lerp(-0.9, 0.5, clamp(th.state.calm * 1.1 + (1 - tension) * 0.3));
  g.globalAlpha = 0.85 * th.born;
  g.beginPath();
  g.moveTo(-r * 0.13, r * 0.25);
  g.quadraticCurveTo(0, r * 0.25 + smile * r * 0.12, r * 0.13, r * 0.25);
  g.stroke();
  // cheeks puff pink while held
  if (th.sq > 0.05) {
    g.globalAlpha = clamp(th.sq * 3) * 0.45 * th.born;
    g.fillStyle = '#ff8fc8';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.45, r * 0.16, r * 0.12, r * 0.07, 0, 0, TAU); g.fill(); }
  }
  g.restore();
}
