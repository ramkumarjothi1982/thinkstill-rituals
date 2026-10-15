// Integration H2 + H3, review round 3 (final): the person's words in the Luminous Ocean after a paused storm.
//  * 320×568: Tell → the Static Storm; Pause from the panel (the layer is planned again under the sheet), Resume; Drift
//    on → the ocean. Before: the pause's relayout reset the words' step down, the storm let go of its plate at the melt,
//    the ocean asked for none, the layer's own 3-line budget fitted nowhere round the thought, and a thought a world
//    drives never stepped down — the words stayed hidden (hostWait) for good. Now the ocean asks for the plate it planned
//    round (thought.labelFit, measured by the layer), a world-driven thought with nowhere clear takes fewer lines, and
//    its words are never hidden for good — never on Loomi's face either.
//  * The ThoughtLayer alone: a world-driven thought whose plate fits nowhere takes fewer lines and shows; a thought whose
//    host has come over everything stays hidden (the r2b guarantee).
//  * The director: a world melting away says nothing (its intro on a timer, a discovery), with and without reduced
//    motion; the world melting in speaks.
// The real ThoughtLayer and the real worlds, through the director, in a stand-in DOM that lays the tags out as Chromium
// does (tests/h23-r4-clear.test.mjs), at the geometry measured in the browser at 320×568 (and 390×844).
// Run: node --test hushmallow/tests/h23-r5-hostwait.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ------------------------------------------------------------- stand-in DOM --
const VIEW = { W: 320, H: 568 };
const metrics = () => (VIEW.W <= 360
  ? { cw: 7.85, lh: 20.8, padX: 22, padY: 13, border: 2, cssMax: Math.min(210, VIEW.W - 28) }
  : { cw: 8.3, lh: 22.1, padX: 28, padY: 15, border: 2, cssMax: Math.min(232, VIEW.W - 40) });
const textW = (t, m) => Array.from(t).length * m.cw;
function wrap(text, avail, m) {
  const words = String(text).split(' ').filter(Boolean);
  let lines = 1, cur = 0, widest = 0;
  for (const w of words) {
    const ww = textW(w, m);
    if (cur === 0) cur = ww;
    else if (cur + m.cw + ww <= avail + 0.01) cur += m.cw + ww;
    else { widest = Math.max(widest, cur); lines++; cur = ww; }
  }
  return { lines: words.length ? lines : 1, widest: Math.max(widest, cur) };
}
function layoutTag(el) {
  const m = metrics(), span = el.children[0], text = span ? span._text : '';
  const measure = el.classList.contains('tm-measure');
  const maxW = measure ? Infinity : el.style.maxWidth ? parseFloat(el.style.maxWidth) : m.cssMax;
  const one = textW(text, m), pad = m.padX + m.border;
  if (measure) return { w: one + pad, h: m.lh + m.padY + m.border, lines: 1, scroll: one };
  const w = el.style.width ? parseFloat(el.style.width) : Math.min(maxW, one + pad);
  const { lines, widest } = wrap(text, w - pad, m);
  return { w, h: Math.max(1, lines) * m.lh + m.padY + m.border, lines, scroll: Math.min(widest, w - pad) };
}
class ClassList {
  constructor() { this.s = new Set(); }
  add(...c) { for (const x of c) this.s.add(x); }
  remove(...c) { for (const x of c) this.s.delete(x); }
  toggle(c, f) { const on = f === undefined ? !this.s.has(c) : !!f; if (on) this.s.add(c); else this.s.delete(c); return on; }
  contains(c) { return this.s.has(c); }
}
class Style { setProperty(k, v) { this[k] = v; } }
const noop = () => {};
// (a canvas measures text at its font's size: 0.314 em a character, as Chromium measured these words for the ocean's own
// plate at 320×568 — 251 px at 17 px)
const ctx2d = (c) => { const o = {
  canvas: c, font: '10px sans-serif',
  createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
  createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * (parseFloat(/([\d.]+)px/.exec(o.font)?.[1]) || 10) * 0.314 }), getTransform: () => ({ a: 1, e: 0 }),
}; return new Proxy(o, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } }); };
class El {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = new Style(); this.classList = new ClassList(); this.attrs = {}; this._text = ''; this.width = 0; this.height = 0; }
  set className(v) { this.classList = new ClassList(); for (const c of String(v).split(/\s+/)) if (c) this.classList.add(c); }
  get className() { return [...this.classList.s].join(' '); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener() {}
  removeEventListener() {}
  appendChild(c) { c.remove?.(); c.parentNode = this; this.children.push(c); return c; }
  append(...cs) { for (const c of cs) this.appendChild(c); }
  insertBefore(c, ref) { c.remove?.(); c.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c; }
  remove() { const p = this.parentNode; if (p) { const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1); this.parentNode = null; } }
  focus() {}
  getContext() { return this.tagName === 'CANVAS' ? (this._g ||= ctx2d(this)) : null; }
  get clientWidth() { return VIEW.W; }
  get clientHeight() { return VIEW.H; }
  getBoundingClientRect() { return { left: 0, top: 0, right: VIEW.W, bottom: VIEW.H, width: VIEW.W, height: VIEW.H }; }
  get _tag() { return this.classList.contains('tm-tag') ? this : this.parentNode?.classList?.contains('tm-tag') ? this.parentNode : null; }
  get offsetWidth() { const t = this._tag; return t === this ? layoutTag(t).w : t ? layoutTag(t).scroll : 0; }
  get offsetHeight() { const t = this._tag; if (!t) return 0; const L = layoutTag(t); return t === this ? L.h : L.lines * metrics().lh; }
  get scrollWidth() { const t = this._tag; return t ? layoutTag(t).scroll : 0; }
}
globalThis.document = { createElement: (t) => new El(t), head: new El('head'), body: new El('body'), addEventListener() {}, removeEventListener() {}, hidden: false };
globalThis.getComputedStyle = () => ({ lineHeight: `${metrics().lh}px`, position: 'static', zIndex: 'auto' });
Object.defineProperty(globalThis, 'innerWidth', { get: () => VIEW.W, configurable: true });
Object.defineProperty(globalThis, 'innerHeight', { get: () => VIEW.H, configurable: true });
globalThis.devicePixelRatio = 2;
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { ThoughtLayer } = await import('../src/mallows/thought/layer.js');
const { createHushflow } = await import('../src/hushfold/flow/director.js');
const { WORLDS, createRegistry } = await import('../src/hushfold/flow/registry.js');
const { mallowFaceRect } = await import('../src/hushfold/garden-install.js');
const { MALLOWS } = await import('../src/mallows/registry.js');

// ------------------------------------------------------------- harness --
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t, cx: (l + r) / 2, cy: (t + b) / 2 });
const hit = (a, b) => !!(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
// what the person sees of the words: the stylesheet's fades (in .45 s, out .2 s), or a world's fade exactly
const seenOps = (frames) => { let v = 0, goal = 0; return frames.map((f) => { if (f.wf) v = goal = f.op; else { v = goal > v ? Math.min(goal, v + f.dt / 0.45) : Math.max(goal, v - f.dt / 0.2); goal = f.op; } return v; }); };
const TEXT = 'I am furious that the train was cancelled again';

/**
 * Tell → the storm → (Pause, the layer planned again under the panel's sheet, Resume) → Drift on → the ocean, at W×H.
 * The hero stands on the world's floor as the shell puts it (Glitzi, then Loomi from the melt's 'host'); the subtitle
 * band and the thoughts' bounds as measured in the browser.
 */
async function stormPauseMelt({ W = 320, H = 568, reducedMotion = false, pause = true, ocean = 6 } = {}) {
  VIEW.W = W; VIEW.H = H;
  const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
  const floor = box(W / 2 - B / 2, bottom - B, W / 2 + B / 2, bottom);
  const hero = { id: 'glitzi', rest: floor, live: floor };
  const mallow = { rect: () => hero.live, bodyRect: () => hero.live, restRect: () => hero.rest, react() {}, setEmotion() {}, lookAt() {}, float() {} };
  // the shell's keep-out (mallowAvoidRect): round where it rests, with room for a hop, and round the live body
  const keepOut = () => {
    const o = hero.rest, b = hero.live;
    return { left: Math.min(o.left, b.left - 4), right: Math.max(o.right, b.right + 4), top: Math.min(o.top - Math.max(18, o.height * 0.14), b.top - 4), bottom: Math.max(o.bottom + 6, b.bottom + 6) };
  };
  const bandH = Math.min(156, Math.max(118, Math.round(H * 0.17)));
  const bounds = { left: 10, right: W - 10, top: 68 + bandH + 2, bottom: H - 34 };
  const L = new ThoughtLayer({ bounds: () => bounds, keepOut, reducedMotion, tagRoot: document.body });
  // (at home the thought rests beside the person's Mallow, low on the right, its words under it)
  const th = L.add({ text: TEXT, emotion: 'angry', intensity: 0.7, r: 32 }, { from: { x: W * 0.8, y: bottom - 40 }, home: { x: W * 0.8, y: bottom - 40 } });
  for (let i = 0; i < 120; i++) L.frame(1 / 60);
  const tg = L.tags.get(th);
  const said = [];
  const D = createHushflow({
    worldEl: new El('div'), fxEl: new El('div'), mallow, thoughts: L,
    subtitles: { say: (lines, o = {}) => { said.push({ t: D.debug.time, world: o.world, who: o.who, lines: [].concat(lines).map((l) => (typeof l === 'string' ? l : l?.text)) }); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {}, pause() {}, resume() {} },
    safeRect: () => ({ x: 20, y: 68, w: W - 40, h: Math.max(160, hero.rest.top - 14 - 68) }), subtitleBand: () => bandH,
    photos: { n: 5, draw: () => ({ w: 1, h: 1 }), size: (i, k, s) => ({ w: Math.round(s * 0.78), h: Math.round(s) }) },
    registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion,
  });
  const marks = {};
  D.on('host', () => { hero.id = 'loomi'; marks.host = D.debug.time; });
  D.on('melt', (e) => { marks[e.k === 0 ? 'melt0' : 'melt1'] = D.debug.time; });
  const frames = [];
  const rec = (ph) => {
    const r = tg.w ? { left: tg.x - tg.w / 2, top: tg.y, right: tg.x + tg.w / 2, bottom: tg.y + tg.h } : null;
    frames.push({ t: D.debug.time, dt: 1 / 60, op: tg.shown && !L.hidden && !L.paused ? (tg.opQ ?? 20) / 20 : 0, wf: !!tg.wfade, tag: r, face: mallowFaceRect(hero.live, MALLOWS[hero.id]), hero: hero.id, ph, rows: tg.cur?.rows, fit: th.labelFit, drop: tg.drop, hw: !!tg.hostWait });
  };
  const run = (sec, ph) => { for (let i = 0; i < Math.round(sec * 60); i++) { D.debug.step(1 / 60); L.frame(1 / 60); rec(ph ?? D.state.phase); } };
  await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
  run(3, 'storm');
  if (pause) {
    // the panel's Pause: the director holds the world, the stage freezes; the sheet moves the thoughts' bounds and the
    // layer plans its stage again (as it does by itself when its bounds move); closed, the bounds come back; the pill's
    // Resume
    D.pause(); L.pause();
    bounds.bottom = Math.round(H * 0.55); L.relayout();
    bounds.bottom = H - 34; L.relayout();
    L.resume(); D.resume();
    run(1.8, 'resumed');
  }
  const before = { fit: th.labelFit && { ...th.labelFit }, drop: tg.drop, rows: tg.cur?.rows };
  const done = () => { D.destroy(); L.destroy(); };
  try {
    assert.equal(D.next(), true, 'Drift on');
    // (the ocean is built in idle time: real time passes between the frames until it melts in)
    for (let i = 0; i < 60 * 14 && !(D.state.phase === 'playing' && D.state.worldId === 'luminous-ocean'); i++) {
      D.debug.step(1 / 60); L.frame(1 / 60); rec(D.state.phase);
      if (D.state.phase !== 'melting') await sleep(4);
    }
    assert.equal(D.state.worldId, 'luminous-ocean', 'the ocean plays');
    run(ocean, 'ocean');
  } catch (e) { done(); throw e; }
  return { D, L, th, tg, frames, marks, said, before, hero, keepOut, done };
}
/** From t0 on: when the words are first seen (> 0.15), the longest time they are not, and frames seen on the face. */
function wordsFrom(frames, t0) {
  const vis = seenOps(frames);
  let first = null, gap = 0, gapMax = 0, prev = null;
  const face = [];
  frames.forEach((f, i) => {
    if (f.t < t0) return;
    const seen = vis[i] > 0.15 && !!f.tag;
    if (seen) { first ??= +(f.t - t0).toFixed(2); gap = 0; if (hit(f.tag, f.face)) face.push({ t: +(f.t - t0).toFixed(2), hero: f.hero, tag: [f.tag.left, f.tag.top, f.tag.right, f.tag.bottom].map(Math.round), face: [f.face.left, f.face.top, f.face.right, f.face.bottom].map(Math.round) }); }
    else if (prev != null) { gap += f.t - prev; gapMax = Math.max(gapMax, gap); }
    prev = f.t;
  });
  return { first, gapMax: +gapMax.toFixed(2), face, last: vis.at(-1) };
}

for (const [W, H] of [[320, 568], [390, 844]]) {
  for (const reducedMotion of [false, true]) {
    test(`storm → Pause/Resume → ocean, ${W}×${H}${reducedMotion ? ', reduced motion' : ''}: the words are back within 2 s of the melt's end, never on Loomi's (or Glitzi's) face, and stay`, async () => {
      const run = await stormPauseMelt({ W, H, reducedMotion });
      try {
        const { frames, marks } = run;
        assert.ok(marks.melt0 != null && marks.melt1 != null && marks.host != null, `the melt ran (${JSON.stringify(marks)})`);
        const w = wordsFrom(frames, marks.melt1);
        assert.ok(w.first != null && w.first <= 2, `seen in the ocean within 2 s of the melt's end (${w.first} s; at the end: rows ${frames.at(-1).rows}, fit ${JSON.stringify(frames.at(-1).fit)}, drop ${frames.at(-1).drop}, hostWait ${frames.at(-1).hw})`);
        assert.ok(w.last > 0.9, `still seen at the end (${w.last.toFixed(2)})`);
        assert.ok(w.gapMax < 1, `once back, never hidden long (${w.gapMax} s)`);
        // never on a host's face: the whole run, from the storm through the melt (Glitzi, then Loomi) to the ocean
        const all = wordsFrom(frames, frames[0].t);
        assert.equal(all.face.length, 0, `words seen on the host's face: ${JSON.stringify(all.face.slice(0, 3))}`);
        // and across the melt the words are hidden no longer than a fade out, a change and a fade in (and the thought's
        // glide home)
        const m = wordsFrom(frames, marks.melt0);
        assert.ok(m.gapMax <= 3.5, `hidden ${m.gapMax} s at most across the melt`);
        // the ocean asked for its own plate, and the words show it — on the ocean's plan, clear of the band and of Loomi
        const end = frames.at(-1);
        assert.ok(end.fit && end.fit.lines >= 1 && end.fit.maxW > 0, `the ocean's plate (labelFit) ${JSON.stringify(end.fit)}`);
        assert.ok(!hit(end.tag, run.keepOut()), `clear of Loomi at the end: ${JSON.stringify(end.tag)}`);
        assert.ok(end.tag.top >= 68 + Math.min(156, Math.max(118, Math.round(H * 0.17))), `under the subtitle band: ${JSON.stringify(end.tag)}`);
      } finally { run.done(); }
    });
  }
}

test('storm → ocean without a pause, 320×568: the same — the words come back and show the ocean\'s plate', async () => {
  const run = await stormPauseMelt({ pause: false });
  try {
    const w = wordsFrom(run.frames, run.marks.melt1);
    assert.ok(w.first != null && w.first <= 2, `seen within 2 s (${w.first})`);
    assert.equal(wordsFrom(run.frames, run.frames[0].t).face.length, 0);
    assert.ok(run.frames.at(-1).fit, 'the ocean\'s plate');
  } finally { run.done(); }
});

test('director: a world melting away says nothing — the storm\'s intro, due during the melt, is never said; the ocean speaks', async () => {
  for (const reducedMotion of [false, true]) {
    VIEW.W = 320; VIEW.H = 568;
    const L = new ThoughtLayer({ bounds: () => ({ left: 10, right: 310, top: 188, bottom: 534 }), keepOut: () => null, reducedMotion, tagRoot: document.body });
    L.add({ text: TEXT, emotion: 'angry', intensity: 0.7, r: 32 }, { x: 256, y: 400 });
    const said = [];
    const hero = box(83, 339, 237, 492);
    const D = createHushflow({
      worldEl: new El('div'), fxEl: new El('div'), thoughts: L,
      mallow: { rect: () => hero, bodyRect: () => hero, restRect: () => hero, react() {}, setEmotion() {}, lookAt() {}, float() {} },
      subtitles: { say: (lines, o = {}) => { said.push({ t: D.debug.time, world: o.world, who: o.who, melt: D.state.melt, lines: [].concat(lines).map((l) => (typeof l === 'string' ? l : l?.text)) }); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {}, pause() {}, resume() {} },
      safeRect: () => ({ x: 20, y: 68, w: 280, h: 257 }), subtitleBand: () => 118,
      photos: { n: 3, draw: () => ({ w: 1, h: 1 }), size: (i, k, s) => ({ w: Math.round(s * 0.78), h: Math.round(s) }) },
      registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion,
    });
    let meltAt = null, meltEnd = null;
    D.on('melt', (e) => { if (e.k === 0) meltAt = D.debug.time; else meltEnd = D.debug.time; });
    try {
      await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
      // Drift on before the storm's intro is due (3.8 s after it enters): it would fall inside the melt
      for (let i = 0; i < 60 * (reducedMotion ? 3 : 1); i++) { D.debug.step(1 / 60); L.frame(1 / 60); }
      assert.equal(D.next(), true);
      for (let i = 0; i < 60 * 14 && meltEnd == null; i++) { D.debug.step(1 / 60); L.frame(1 / 60); if (meltAt == null) await sleep(4); }
      assert.ok(meltAt != null && meltEnd != null && meltEnd - meltAt > 1, 'the melt ran');
      for (let i = 0; i < 60 * 4; i++) { D.debug.step(1 / 60); L.frame(1 / 60); }
      const stormLate = said.filter((s) => s.world === 'static-storm' && s.t >= meltAt);
      assert.deepEqual(stormLate, [], `the storm spoke as it melted away${reducedMotion ? ' (reduced motion)' : ''}: ${JSON.stringify(stormLate)}`);
      assert.ok(said.some((s) => s.world === 'luminous-ocean'), `the ocean speaks: ${JSON.stringify(said.map((s) => s.world))}`);
      // (its discoveries are not found either: nothing of it can follow over the next world's host)
      assert.equal(D.state.discoveries.length, 0);
    } finally { D.destroy(); L.destroy(); }
  }
});

// ------------------------------------------------------------- the layer alone --
const BOUNDS = { left: 10, right: 310, top: 188, bottom: 534 };
test('ThoughtLayer: a world-driven thought whose asked-for plate fits nowhere takes fewer lines, then shows (never on the hero)', () => {
  VIEW.W = 320; VIEW.H = 568;
  // the world asks for three lines; there is room for them (below) until its hero comes up under the thought: then room
  // above for fewer lines only (the band over it), none beside or below
  let K = box(40, 520, 280, 568);
  const L = new ThoughtLayer({ bounds: () => BOUNDS, keepOut: () => K, reducedMotion: false, tagRoot: document.body });
  const th = L.add({ text: 'My boss embarrassed me in front of everyone today and I still cannot stop thinking about it', emotion: 'embarrassment', intensity: 0.6, r: 30 }, { x: 160, y: 262 });
  // (a world drives it: it writes x / y every frame — th.driven — and asks for its plate)
  th.x = 160; th.y = 262; th.labelSide = 'above'; th.labelFit = { lines: 3, maxW: 210 };
  const tg = L.tags.get(th);
  for (let i = 0; i < 120; i++) { th.x = 160; th.y = 262; L.frame(1 / 60); }
  assert.ok(tg.shown && tg.cur.rows === 3 && tg.drop === 0, `the plate asked for, while there is room (rows ${tg.cur?.rows}, drop ${tg.drop})`);
  K = box(40, 300, 280, 568);
  let back = -1, onK = 0, hid = false;
  for (let i = 0; i < 120; i++) {
    th.x = 160; th.y = 262; L.frame(1 / 60);
    if (!tg.shown) hid = true;
    else if (hid && back < 0) back = i;
    if (tg.shown && hit(L.tagRect(th), K)) onK++;
  }
  assert.ok(hid, 'they made way for the hero');
  assert.ok(back > 0 && back <= 48, `back within 0.8 s of the hero coming (frame ${back}; rows ${tg.cur?.rows}, drop ${tg.drop})`);
  assert.ok(tg.cur.lines < 3 && tg.drop > 0, `with fewer lines than asked for (lines ${tg.cur.lines}, drop ${tg.drop})`);
  assert.equal(onK, 0, 'never on the hero');
  // the world plans again (a new plate): the whole budget again
  th.labelFit = { lines: 2, maxW: 280 };
  th.x = 160; th.y = 262; L.frame(1 / 60);
  assert.equal(tg.drop, 0, 'a new plate asked for gives the words their whole budget again');
  L.destroy();
});

test('ThoughtLayer: planned again (a pause, a panel) a world-driven thought keeps its step down — no blink at the old budget', () => {
  VIEW.W = 320; VIEW.H = 568;
  const K = box(40, 300, 280, 568);
  const L = new ThoughtLayer({ bounds: () => BOUNDS, keepOut: () => K, reducedMotion: false, tagRoot: document.body });
  const th = L.add({ text: 'My boss embarrassed me in front of everyone today and I still cannot stop thinking about it', emotion: 'embarrassment', intensity: 0.6, r: 30 }, { x: 160, y: 262 });
  th.x = 160; th.y = 262; th.labelSide = 'above';
  const tg = L.tags.get(th);
  for (let i = 0; i < 120; i++) { th.x = 160; th.y = 262; L.frame(1 / 60); }
  assert.ok(tg.shown && tg.drop > 0, `shown on fewer lines (drop ${tg.drop})`);
  const d0 = tg.drop;
  L.relayout();
  assert.equal(tg.drop, d0, 'the relayout keeps the step a world-driven thought took');
  let hidden = 0;
  for (let i = 0; i < 60; i++) { th.x = 160; th.y = 262; L.frame(1 / 60); if (!tg.shown) hidden++; }
  assert.equal(hidden, 0, `never hidden after the relayout (${hidden} frames)`);
  L.destroy();
});

test('ThoughtLayer: a host over every place round the thought keeps its words hidden however long they wait (never on the hero)', () => {
  VIEW.W = 320; VIEW.H = 568;
  const K = box(0, 150, 320, 568);
  const L = new ThoughtLayer({ bounds: () => BOUNDS, keepOut: () => K, reducedMotion: false, tagRoot: document.body });
  const th = L.add({ text: 'My boss embarrassed me', emotion: 'embarrassment', intensity: 0.6, r: 30 }, { x: 160, y: 330 });
  th.x = 160; th.y = 330;
  const tg = L.tags.get(th);
  let shown = 0;
  for (let i = 0; i < 60 * 4; i++) { th.x = 160; th.y = 330; L.frame(1 / 60); if (tg.shown) shown++; }
  assert.equal(shown, 0, `shown on the hero (${shown} frames)`);
  assert.ok(tg.hostWait, 'waiting');
  L.destroy();
});

// The final follow-up (FU4): at 320×568 the ocean's words stayed cut to one line ("I'm so angry my boss…") for the whole of
// its first seconds, and far out: a moment's block during the melt (the host swap) stepped them down, and nothing gave the
// line back while the world drove the thought with the same plate. Now, once they have shown clear a while, the plate a
// line larger is tried round the thought (measured before: no change in sight) and, clear there too, taken.
test('ThoughtLayer: a world-driven thought cut to fewer lines by a hero passing gets its line back once that is clear (never onto the hero)', () => {
  VIEW.W = 320; VIEW.H = 568;
  let K = box(40, 520, 280, 568);
  const L = new ThoughtLayer({ bounds: () => BOUNDS, keepOut: () => K, reducedMotion: false, tagRoot: document.body });
  const th = L.add({ text: 'My boss embarrassed me in front of everyone today and I still cannot stop thinking about it', emotion: 'embarrassment', intensity: 0.6, r: 30 }, { x: 160, y: 262 });
  th.x = 160; th.y = 262; th.labelSide = 'above'; th.labelFit = { lines: 3, maxW: 210 };
  const tg = L.tags.get(th);
  const run = (n, each = null) => { for (let i = 0; i < n; i++) { th.x = 160; th.y = 262; L.frame(1 / 60); each?.(i); } };
  run(120);
  assert.ok(tg.shown && tg.cur.rows === 3 && tg.drop === 0, `the plate asked for (rows ${tg.cur?.rows})`);
  // the hero comes up under the thought (a melt's host swap): fewer lines
  K = box(40, 300, 280, 568);
  run(90);
  assert.ok(tg.shown && tg.drop > 0, `stepped down (drop ${tg.drop})`);
  // while it stays there, the line is never given back onto it (the step down stays: no blinking to and fro)
  let onK = 0, hidden = 0;
  run(240, () => { if (tg.shown && hit(L.tagRect(th), K)) onK++; if (!tg.shown) hidden++; });
  assert.ok(tg.drop > 0, `kept its step down while the hero is there (drop ${tg.drop})`);
  assert.equal(onK, 0, 'never on the hero');
  assert.equal(hidden, 0, `never hidden for a try (${hidden} frames)`);
  // the hero goes back down: the words get their whole budget again, with the same plate asked for
  K = box(40, 520, 280, 568);
  let back = -1;
  run(60 * 6, (i) => { if (back < 0 && tg.drop === 0 && tg.shown && tg.cur?.rows === 3) back = i; if (tg.shown && hit(L.tagRect(th), K)) onK++; });
  assert.ok(back >= 0 && back < 60 * 4, `the three lines are back (frame ${back}; drop ${tg.drop}, rows ${tg.cur?.rows})`);
  assert.equal(onK, 0, 'never on the hero');
  assert.deepEqual(th.labelFit, { lines: 3, maxW: 210 }, 'with the plate the world asked for, unchanged');
  L.destroy();
});
