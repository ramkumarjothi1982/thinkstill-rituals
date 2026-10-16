// A tiny DOM for running the V3 ritual host (src/v3/host.js) in node: the ritual scene's top bar, title and dock, the
// Mallow's layer and the world that places it, a 2D canvas that draws nothing, and the window's size and safe-area
// insets. Every box is laid out by the test: a rect is a function of the element, so it can follow a class the host
// toggles (the title's v3-compact) the way the browser's layout would. Frames are timers 16 ms apart, so node:test's
// mock timers drive both the host's frames and its delayed lines.
//
//   const dom = installHostDom({ W, H, insets, rects: { title, dock, spot, bar, scene }, layer: { w, h } });
//   const run = await startHost(dom, 'HM-0901');   // { ctx, said, places, ac, done, phase(), tap(), finish() }
import { mock } from 'node:test';

class Style {
  constructor() { Object.defineProperty(this, '_vars', { value: new Map() }); }
  setProperty(k, v) { this._vars.set(k, String(v)); }
  getPropertyValue(k) { return this._vars.get(k) ?? ''; }
  removeProperty(k) { this._vars.delete(k); }
}

function ctx2d(canvas) {
  const grad = { addColorStop() {} };
  const data = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(4, Math.round(w) * Math.round(h) * 4)) });
  const special = {
    canvas,
    measureText: (t) => ({ width: String(t).length * 7, actualBoundingBoxAscent: 9, actualBoundingBoxDescent: 3 }),
    createRadialGradient: () => grad, createLinearGradient: () => grad, createConicGradient: () => grad, createPattern: () => grad,
    getImageData: (x, y, w, h) => data(w, h), createImageData: (w, h) => data(w, h),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), getLineDash: () => [], isPointInPath: () => false,
  };
  const state = { globalAlpha: 1, globalCompositeOperation: 'source-over', lineWidth: 1, font: '10px sans-serif', fillStyle: '#000', strokeStyle: '#000' };
  return new Proxy(state, {
    get: (t, k) => (k in special ? special[k] : k in t ? t[k] : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

export class El {
  constructor(tag, dom) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1; this.dom = dom;
    this.children = []; this.parentNode = null; this.attrs = {}; this.style = new Style(); this.listeners = {}; this._text = '';
    this.rect = null;                       // () => { left, top, width, height }, set by the test
    this.size = null;                       // { w, h }: offsetWidth / offsetHeight (the layout box, before any CSS transform)
    this.width = 300; this.height = 150;    // a canvas's backing store
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = String(v); }
  get classList() {
    const el = this;
    const list = () => el.className.split(/\s+/).filter(Boolean);
    const set = (a) => { el.attrs.class = a.join(' '); el.dom?.changed(el); };
    return {
      add: (...c) => set([...new Set([...list(), ...c])]),
      remove: (...c) => set(list().filter((x) => !c.includes(x))),
      contains: (c) => list().includes(c),
      toggle: (c, on) => { const has = list().includes(c); const want = on === undefined ? !has : !!on; if (want !== has) (want ? this.classList.add(c) : this.classList.remove(c)); return want; },
    };
  }
  get textContent() { return this.nodeType === 3 ? this._text : this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); if (this.nodeType === 1) this.children = []; }
  append(...kids) { for (const k of kids) { if (k == null) continue; const n = typeof k === 'object' ? k : this.dom.doc.createTextNode(k); n.parentNode?.children && n.remove(); n.parentNode = this; this.children.push(n); } }
  prepend(...kids) { const old = this.children; this.children = []; this.append(...kids); this.children.push(...old); }
  replaceChildren(...kids) { for (const c of this.children) c.parentNode = null; this.children = []; this.append(...kids); }
  remove() { const p = this.parentNode; if (p) { p.children = p.children.filter((c) => c !== this); this.parentNode = null; } }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === this.dom.doc.body || n === this.dom.root; }
  matches(sel) { return sel.startsWith('.') ? this.classList.contains(sel.slice(1)) : this.tagName === sel.toUpperCase(); }
  querySelector(sel) { for (const c of this.children) { if (c.nodeType !== 1) continue; if (c.matches(sel)) return c; const d = c.querySelector(sel); if (d) return d; } return null; }
  querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.children) if (c.nodeType === 1) { if (c.matches(sel)) out.push(c); walk(c); } }; walk(this); return out; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
  dispatch(t, ev = {}) { for (const fn of [...(this.listeners[t] || [])]) fn({ type: t, target: this, ...ev }); }
  click() { this.dispatch('click'); }
  getBoundingClientRect() {
    const r = this.rect ? this.rect(this) : { left: 0, top: 0, width: 0, height: 0 };
    return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top };
  }
  get offsetWidth() { return this.size ? this.size.w : this.rect ? this.getBoundingClientRect().width : 0; }
  get offsetHeight() { return this.size ? this.size.h : this.rect ? this.getBoundingClientRect().height : 0; }
  getContext() { return (this._g ||= ctx2d(this)); }
  setPointerCapture() {}
  releasePointerCapture() {}
  focus() {}
}

/**
 * Globals for one host run: document, window size, insets, frames. rects: { scene, bar, title, dock, spot } (functions
 * of the element, or plain boxes); layer: the Mallow layer's layout size ({ w, h }, before its CSS scale).
 */
export function installHostDom({ W = 390, H = 844, insets = { top: 0, right: 0, bottom: 0, left: 0 }, rects = {}, layer = null, resizeObserver = false } = {}) {
  const dom = { W, H, insets, onChange: [], changed(el) { for (const fn of dom.onChange) fn(el); } };
  const make = (tag) => new El(tag, dom);
  const doc = {
    createElement: make, createElementNS: (_, t) => make(t),
    createTextNode: (t) => { const n = make('#text'); n._text = String(t); return n; },
    addEventListener() {}, removeEventListener() {}, documentElement: null, body: null, fonts: null,
  };
  dom.doc = doc;
  doc.body = make('body'); doc.documentElement = make('html');
  dom.root = doc.body;
  const box = (r) => (typeof r === 'function' ? r : r ? () => r : null);
  // the ritual scene: top bar, title (eyebrow, h2, p), spacer, dock
  const scene = make('div'); scene.attrs.id = 'scene'; scene.rect = box(rects.scene || { left: 0, top: 0, width: W, height: H });
  const bar = make('div'); bar.className = 'topbar'; bar.rect = box(rects.bar || { left: 0, top: 0, width: W, height: 58 });
  const title = make('div'); title.className = 'move-title'; title.rect = box(rects.title || { left: 20, top: 66, width: W - 40, height: 150 });
  title.append(make('span'), make('h2'), make('p'));
  title.children[0].className = 'eyebrow';
  const dock = make('div'); dock.className = 'dock'; dock.rect = box(rects.dock || { left: 20, top: H - 120, width: W - 40, height: 100 });
  scene.append(bar, title, dock);
  doc.body.append(scene);
  const mallowLayer = make('div'); mallowLayer.attrs.id = 'mallow-layer'; mallowLayer.size = layer || { w: Math.min(0.86 * W, 430), h: Math.min(0.56 * H, 470) };
  const fx = make('div'); fx.attrs.id = 'fx-layer';
  doc.body.append(mallowLayer, fx);
  const byId = { scene, 'mallow-layer': mallowLayer, 'fx-layer': fx };
  doc.getElementById = (id) => byId[id] || null;
  const SEL = { '#scene .move-title': title, '#scene .ritual-ui > .topbar': bar, '#scene .dock': dock };
  doc.querySelector = (sel) => SEL[sel] || null;           // (no '#sheet-root .sheet': nothing is paused)
  doc.querySelectorAll = (sel) => (SEL[sel] ? [SEL[sel]] : []);
  // the dock's spot (the small Mallow's place) is the host's own element: it gets its box once it is in the dock
  if (rects.spot) dom.onSpot = box(rects.spot);
  const origAppend = dock.append.bind(dock);
  dock.append = (...k) => { origAppend(...k); const s = dock.querySelector('.v3-spot'); if (s && dom.onSpot) s.rect = dom.onSpot; };
  const winListeners = {};
  Object.assign(globalThis, {
    document: doc,
    devicePixelRatio: 1,
    addEventListener: (t, fn) => { (winListeners[t] ||= []).push(fn); },
    removeEventListener: (t, fn) => { winListeners[t] = (winListeners[t] || []).filter((f) => f !== fn); },
    getComputedStyle: (el) => (el.style.padding?.includes('safe-area-inset')
      ? { paddingTop: `${dom.insets.top}px`, paddingRight: `${dom.insets.right}px`, paddingBottom: `${dom.insets.bottom}px`, paddingLeft: `${dom.insets.left}px` }
      : { paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px' }),
    requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
  });
  Object.defineProperty(globalThis, 'innerWidth', { get: () => dom.W, configurable: true });
  Object.defineProperty(globalThis, 'innerHeight', { get: () => dom.H, configurable: true });
  // a ResizeObserver only when the test asks for one (it then says when the title or the dock changed size: observed())
  const observers = [];
  if (resizeObserver) {
    globalThis.ResizeObserver = class { constructor(fn) { this.fn = fn; this.els = new Set(); observers.push(this); } observe(el) { this.els.add(el); } unobserve(el) { this.els.delete(el); } disconnect() { this.els.clear(); } };
  } else delete globalThis.ResizeObserver;
  const observed = (el) => { for (const o of observers) if (o.els.has(el)) o.fn([{ target: el }]); };
  Object.assign(dom, { scene, bar, title, dock, layer: mallowLayer, fx, observed, resize: () => { for (const fn of winListeners.resize || []) fn({ type: 'resize' }); } });
  return dom;
}

/** The world the host places the Mallow with: the real fitBetween / place arithmetic (src/app/world.js) on the layer. */
export async function hostWorld(dom, { bodyFrame } = {}) {
  const { createWorld } = await import('../../src/app/world.js');
  const prefs = { get: () => false, reducedMotion: () => false };
  const real = createWorld({ prefs, audio: null });
  const places = [];                      // every move of the Mallow: { place } or { fitBetween }
  const world = {
    fx: dom.fx, layer: dom.layer, rig: null, realm: null, mallowId: null,
    place: (p) => { places.push({ place: { ...p } }); real.place(p); },
    fitBetween: (...a) => { places.push({ fitBetween: a }); real.fitBetween(...a); },
    bodyRect: () => real.bodyRect(), mallowRect: () => real.mallowRect(),
    react() {}, setEmotion() {}, setStage() {}, dim() {}, showMallow() {},
    places,
  };
  // the body's box in the layer, as the rig frames it (fractions of the layer), when the test gives one
  if (bodyFrame) world.bodyFrame = () => bodyFrame;
  else if (real.bodyFrame) world.bodyFrame = () => real.bodyFrame();
  return world;
}

/**
 * Starts host.run() for a built ritual inside mock timers. Returns the run's handles: said (every line the Mallow says,
 * in order), the abort controller (Leave), tap() (Tap instead), frames(n), phase().
 */
export async function startHost(dom, code, { world: w = null, input = null } = {}) {
  const { specFor } = await import('../../src/v3/rituals.js');
  const host = await import('../../src/v3/host.js');
  const ritual = specFor(code);
  ritual.params.v3.noMallows = true;            // no stand-in cards to load (they are images)
  const world = w || await hostWorld(dom);
  const said = [];
  const ac = new AbortController();
  const noop = () => {};
  const ctx = {
    world, dock: dom.dock, signal: ac.signal, ritual, reducedMotion: true, lowStim: true,
    input: input || { text: 'I am furious about what happened at work.', emotions: [{ id: 'anger', confidence: 1, intensity: 0.7 }], intensity: 0.7 },
    app: { audio: { fx: noop, hold: () => ({ stop: noop, set: noop }), ui: noop }, haptic: noop },
    setMove: (i, { eyebrow = '', title = '', prompt = '' } = {}) => { const [e, t, p] = dom.title.children; e.textContent = eyebrow; t.textContent = title; p.textContent = prompt; },
    say: (text, opts) => { said.push({ text, at: Date.now(), who: opts?.who }); },
  };
  delete globalThis.__hm3;
  const started = host.run(ctx);
  const done = { value: null };
  started.then((r) => { done.value = r; });
  // the host first awaits its copy and its engine module (real imports): it has begun once its canvas is in the world
  for (let i = 0; i < 5000 && !dom.fx.children.length; i++) await new Promise((r) => setImmediate(r));
  if (!dom.fx.children.length) throw new Error(`${code}: the host never began`);
  const frames = (n = 1) => { for (let i = 0; i < n; i++) mock.timers.tick(16); };
  const phase = () => globalThis.__hm3?.phase;
  const btn = (cls) => dom.dock.querySelector(cls);
  /** Tap instead, a frame or a few apart, until the phase is no longer `from` (or n presses). */
  const tapThrough = (from, n = 400) => { for (let i = 0; i < n && phase() === from; i++) { btn('.v3-tap')?.click(); frames(8); } return phase(); };
  return { ctx, world, said, ac, done, started, frames, phase, tapThrough, btn, dom };
}
