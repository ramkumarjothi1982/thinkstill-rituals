// Integration H2 + H3, review round 2b: the person's words are never shown on the hero, nor under the Memory Garden card.
//  * The Luminous Ocean as the first world on a small phone (320×568): its host (Loomi) stands larger and lower on the
//    world's floor than the person's Mallow stood at home, right where the thought's words were. The ThoughtLayer never
//    shows a world-driven thought's words while the hero covers every place round it (they wait, hidden, and come back
//    once a place has been clear a moment), and the shell's host sets off only once the words have faded out of its way
//    (its place is planned at once — restRect — while the body waits: stage.js holdPlace).
//  * The Memory Garden card over the Static Storm at 320×568 (below): the thought makes way from the card's placing, and
//    the card is never seen over it or its words.
// The real ThoughtLayer and the real worlds, through the director, in a stand-in DOM that lays the tags out as Chromium
// does (the metrics of tests/thought-layout.test.mjs), at the geometry measured in the browser at 320×568.
// Run: node --test hushmallow/tests/h23-r4-clear.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
const ctx2d = (c) => new Proxy({
  canvas: c,
  createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
  createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 8.4 }), getTransform: () => ({ a: 1, e: 0 }),
}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
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
const { createStageMallow } = await import('../src/hushfold/stage.js');

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');
const fnBody = (src, start, end) => { const a = src.indexOf(start); assert.ok(a >= 0, start); const b = src.indexOf(end, a + start.length); return src.slice(a, b > a ? b : undefined); };

// ------------------------------------------------------------- harness --
const TEXT = 'My boss embarrassed me in front of everyone today.';
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t, cx: (l + r) / 2, cy: (t + b) / 2 });
const lerpBox = (a, b, k) => box(a.left + (b.left - a.left) * k, a.top + (b.top - a.top) * k, a.right + (b.right - a.right) * k, a.bottom + (b.bottom - a.bottom) * k);
const hit = (a, b) => !!(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
// what the person sees of the words: the stylesheet's fades (in .45 s, out .2 s), or a world's fade exactly
const seenOps = (frames) => { let v = 0, goal = 0; return frames.map((f) => { if (f.wf) v = goal = f.op; else { v = goal > v ? Math.min(goal, v + f.dt / 0.45) : Math.max(goal, v - f.dt / 0.2); goal = f.op; } return v; }); };

// 320×568 as measured in the browser: Pipzi at home with the thought below-right of it (its words beside it, under
// where Loomi will stand), and Loomi's place on the ocean's floor (restRect) and its live body there
const HOME = box(47, 257, 209, 413), LOOMI_HOME = box(53, 244, 204, 409), FLOOR = box(89, 339, 231, 492), FLOOR_LIVE = box(87, 325, 234, 485);
const BOUNDS = { left: 10, right: 310, top: 188, bottom: 534 };

/**
 * The ocean as the first world at 320×568. `wait`: the shell's way (the host sets off once the words are out of its
 * way); without it the host glides at once (only the layer keeps the words off it).
 */
async function oceanFirst({ wait = true, reducedMotion = false, seconds = 6 } = {}) {
  VIEW.W = 320; VIEW.H = 568;
  // the hero as the shell has it: where it rests (restRect: its place, planned at once) and its live body
  const hero = { id: 'pipzi', rest: HOME, live: HOME, glideAt: -1, glideFrom: null };
  const mallow = { rect: () => hero.live, bodyRect: () => hero.live, restRect: () => hero.rest, react() {}, setEmotion() {}, lookAt() {}, float() {} };
  // the shell's keep-out (mallowAvoidRect): round where it rests, with room for a hop, and round the live body
  const keepOut = () => {
    const o = hero.rest, b = hero.live;
    const rest = { left: o.left, right: o.right, top: o.top - Math.max(18, o.height * 0.14), bottom: o.bottom + 6 };
    const live = { left: b.left - 4, right: b.right + 4, top: b.top - 4, bottom: b.bottom + 6 };
    return { left: Math.min(rest.left, live.left), right: Math.max(rest.right, live.right), top: Math.min(rest.top, live.top), bottom: Math.max(rest.bottom, live.bottom) };
  };
  const L = new ThoughtLayer({ bounds: () => BOUNDS, keepOut, reducedMotion, tagRoot: document.body });
  const th = L.add({ text: TEXT, emotion: 'embarrassment', intensity: 0.6, r: 32 }, { from: { x: 264, y: 497 }, home: { x: 264, y: 497 } });
  let clock = 0;
  for (let i = 0; i < 120; i++) { clock += 1 / 60; L.frame(1 / 60); }
  const tg = L.tags.get(th);
  const homeTag = L.tagRect(th);
  const D = createHushflow({
    worldEl: new El('div'), fxEl: new El('div'), mallow, thoughts: L, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} },
    safeRect: () => ({ x: 20, y: 68, w: 280, h: Math.max(160, hero.rest.top - 14 - 68) }), subtitleBand: () => 118,
    photos: { n: 5, draw: () => ({ w: 1, h: 1 }), size: (i, k, s) => ({ w: Math.round(s * 0.78), h: Math.round(s) }) },
    registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion,
  });
  // the shell's onWorld on a cold start: Loomi takes the stage in place, its place on the floor is planned at once,
  // and it sets off once the words are out of its way (heroWaitsForWords) — or at once, without the wait
  let holding = false, holdT0 = 0, clearAt = 0;
  const wordsInWay = () => hit(L.tagRect(th), keepOut());
  D.on('world', () => {
    hero.id = 'loomi'; hero.live = LOOMI_HOME; hero.rest = FLOOR;
    holding = wait && wordsInWay(); holdT0 = clock;
    if (!holding) { hero.glideAt = clock; hero.glideFrom = hero.live; }
  });
  await D.start({ worldId: 'luminous-ocean', emotion: 'embarrassed', intention: 'calm' });
  // (the words fully seen at home as the world arrives: two settled frames before it)
  const homeFrame = { t: -1, dt: 1, op: tg.shown ? 1 : 0, wf: false, tag: homeTag, live: HOME, face: mallowFaceRect(HOME, MALLOWS.pipzi), hw: false, ph: 'home', holding: false };
  const frames = [homeFrame, { ...homeFrame }];
  const t0 = clock;
  for (let i = 0; i < 60 * seconds; i++) {
    clock += 1 / 60;
    if (holding) {
      if (wordsInWay()) clearAt = 0; else clearAt ||= clock;
      if ((clearAt && clock - clearAt >= 0.23) || clock - holdT0 > 0.9) { holding = false; hero.glideAt = clock; hero.glideFrom = hero.live; }
    }
    // (MallowTouch's spring to its place, as measured: a third of the way in 50 ms, there in about 0.6 s)
    if (hero.glideAt >= 0) hero.live = lerpBox(hero.glideFrom, FLOOR_LIVE, 1 - Math.exp(-(clock - hero.glideAt) / 0.12));
    D.debug.step(1 / 60); L.frame(1 / 60);
    const r = tg.shown ? { left: tg.x - tg.w / 2, top: tg.y, right: tg.x + tg.w / 2, bottom: tg.y + tg.h } : (tg.w ? { left: tg.x - tg.w / 2, top: tg.y, right: tg.x + tg.w / 2, bottom: tg.y + tg.h } : null);
    frames.push({ t: clock - t0, dt: 1 / 60, op: tg.shown && !L.hidden ? (tg.opQ ?? 20) / 20 : 0, wf: !!tg.wfade, tag: r, live: hero.live, face: mallowFaceRect(hero.live, MALLOWS[hero.id]), hw: !!tg.hostWait, ph: D.state.phase, holding });
  }
  return { D, L, th, tg, frames, homeTag, hero, keepOut, done() { D.destroy(); L.destroy(); } };
}
/** Frames where the words can be seen (> 0.15) on the hero's face or on its live body. */
function onHero(frames, from = 0) {
  const vis = seenOps(frames);
  const out = { face: [], body: [], seen: 0, seenAt: null };
  frames.forEach((f, i) => {
    if (f.t < from || vis[i] <= 0.15 || !f.tag) return;
    out.seen++; out.seenAt ??= +f.t.toFixed(2);
    if (hit(f.tag, f.face)) out.face.push({ t: +f.t.toFixed(2), seen: +vis[i].toFixed(2), tag: [f.tag.left, f.tag.top, f.tag.right, f.tag.bottom].map(Math.round), face: [f.face.left, f.face.top, f.face.right, f.face.bottom].map(Math.round) });
    if (hit(f.tag, f.live)) out.body.push({ t: +f.t.toFixed(2), seen: +vis[i].toFixed(2), tag: [f.tag.left, f.tag.top, f.tag.right, f.tag.bottom].map(Math.round), body: [f.live.left, f.live.top, f.live.right, f.live.bottom].map(Math.round) });
  });
  return out;
}

for (const reducedMotion of [false, true]) {
  test(`ocean first, 320×568${reducedMotion ? ', reduced motion' : ''}: the words are never seen on Loomi (face or body) while it takes the stage, and come back clear of it`, async () => {
    const run = await oceanFirst({ reducedMotion });
    try {
      const { frames, homeTag } = run;
      assert.ok(homeTag && hit(homeTag, run.keepOut()), `the case: the words at home ${JSON.stringify(homeTag)} are where Loomi will stand`);
      assert.ok(frames.some((f) => f.ph === 'playing'), 'the ocean plays');
      const o = onHero(frames);
      assert.equal(o.face.length, 0, `words seen on Loomi's face: ${JSON.stringify(o.face.slice(0, 3))}`);
      assert.equal(o.body.length, 0, `words seen on Loomi's body: ${JSON.stringify(o.body.slice(0, 3))}`);
      // they come back, beside the thought, clear of the hero's keep-out
      const vis = seenOps(frames), last = frames.at(-1);
      assert.ok(vis.at(-1) > 0.9, `the words show again (seen ${vis.at(-1).toFixed(2)})`);
      assert.ok(!hit(last.tag, run.keepOut()), `clear of the hero at the end: ${JSON.stringify(last.tag)} vs ${JSON.stringify(run.keepOut())}`);
      const back = frames.findIndex((f, i) => i > 30 && vis[i] > 0.15);
      assert.ok(back > 0 && frames[back].t < 4, `back within 4 s (${back > 0 ? frames[back].t.toFixed(2) : 'never'} s)`);
    } finally { run.done(); }
  });
}

test('ocean first, 320×568, the host gliding in at once (the layer alone): the words fade out as it comes and never fade in on it', async () => {
  const run = await oceanFirst({ wait: false });
  try {
    const { frames } = run;
    // (they fade out where they are as Loomi comes — .2 s — and are never shown on it again)
    const o = onHero(frames, 0.3);
    assert.equal(o.face.length, 0, `words seen on Loomi's face after their fade-out: ${JSON.stringify(o.face.slice(0, 3))}`);
    assert.equal(o.body.length, 0, `words seen on Loomi's body after their fade-out: ${JSON.stringify(o.body.slice(0, 3))}`);
    assert.ok(frames.some((f) => f.hw), 'the layer held them back (hostWait)');
    assert.ok(seenOps(frames).at(-1) > 0.9, 'and they show again once a place is clear');
  } finally { run.done(); }
});

test('ThoughtLayer: a world-driven thought with nowhere clear for its words shows none; they come back once a place has been clear a moment — no flicker at the edge', () => {
  VIEW.W = 320; VIEW.H = 568;
  let K = box(20, 60, 300, 120);
  const L = new ThoughtLayer({ bounds: () => BOUNDS, keepOut: () => K, reducedMotion: false, tagRoot: document.body });
  const th = L.add({ text: TEXT, emotion: 'embarrassment', intensity: 0.6, r: 32 }, { x: 160, y: 330 });
  for (let i = 0; i < 90; i++) { th.x = 160; th.y = 330; L.frame(1 / 60); }
  const tg = L.tags.get(th);
  assert.ok(tg.shown, 'the words show while there is room');
  // the hero comes over every place round it (a keep-out from the band to the dock, edge to edge, but the thought's own column)
  K = box(0, 150, 320, 568);
  const frames = [];
  const rec = () => frames.push({ dt: 1 / 60, op: tg.shown ? (tg.opQ ?? 20) / 20 : 0, wf: !!tg.wfade, tag: tg.shown ? L.tagRect(th) : null });
  for (let i = 0; i < 60; i++) { th.x = 160; th.y = 330; L.frame(1 / 60); rec(); }
  assert.equal(tg.shown, false, 'hidden while nowhere is clear');
  assert.ok(frames.slice(2).every((f) => !f.tag || !hit(f.tag, K)), 'never shown on the hero');
  // it flickers clear and covered again for a few frames: nothing shows
  let shownWhileFlicker = 0;
  for (let i = 0; i < 40; i++) { K = i % 8 < 4 ? box(20, 60, 300, 120) : box(0, 150, 320, 568); th.x = 160; th.y = 330; L.frame(1 / 60); if (tg.shown) shownWhileFlicker++; }
  assert.equal(shownWhileFlicker, 0, `shown while the room came and went every 4 frames (${shownWhileFlicker} frames)`);
  // room again, and it stays: the words come back after a moment, clear of the hero
  K = box(20, 60, 300, 120);
  let backAt = -1;
  for (let i = 0; i < 60; i++) { th.x = 160; th.y = 330; L.frame(1 / 60); if (tg.shown && backAt < 0) backAt = i; }
  assert.ok(backAt >= 11 && backAt <= 30, `back once clear for ≥ 0.2 s (frame ${backAt})`);
  assert.ok(!hit(L.tagRect(th), K), 'clear of the hero');
  L.destroy();
});

test('stage.js holdPlace: the place is planned at once (restRect), the body waits, and goes there when the hold ends (or after 1.5 s at most)', async () => {
  const placed = [];
  const fake = {
    ready: true, view: { w: 320, h: 568, left: 0, top: 0 }, goalSt: { x: 128, y: 335, s: 1 }, baseSize: 156, aspect: 1.04,
    container: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
    place(p) { placed.push(p); this.goalSt.x = p.x; this.goalSt.y = p.y; this.goalSt.s = p.size / this.baseSize; },
    bodyRect: () => box(47, 257, 209, 413), setEmotion() {}, on() { return fake; },
  };
  const m = createStageMallow(null, { touch: fake });
  const r0 = m.restRect();
  m.holdPlace(true);
  m.fit({ cx: 160, cy: 415, size: 153 });
  assert.equal(placed.length, 0, 'the body is not sent while held');
  assert.ok(m.placeHeld);
  const r1 = m.restRect();
  assert.ok(Math.abs(r1.cy - 415) < 0.01 && Math.abs(r1.height - 153) < 0.01 && Math.abs(r1.cx - 160) < 0.01, `restRect reports the planned place (${JSON.stringify(r1)})`);
  assert.notDeepEqual(r1, r0);
  m.fit({ cx: 160, cy: 416, size: 153 });
  m.holdPlace(40);
  await new Promise((r) => setTimeout(r, 70));
  assert.deepEqual(placed, [{ x: 160, y: 416, size: 153 }], 'ending the hold sends it to the last place asked for, once');
  assert.equal(m.placeHeld, false);
  m.fit({ cx: 100, cy: 300, size: 150 });
  assert.equal(placed.length, 2, 'not held: fit() places at once');
  // a hold nobody ends ends by itself
  m.holdPlace(true); m.fit({ cx: 161, cy: 417, size: 153 });
  await new Promise((r) => setTimeout(r, 1600));
  assert.equal(placed.length, 3, 'a forgotten hold lets go after 1.5 s');
  m.destroy();
});

test('shell: a world\'s first arrival holds its host\'s place until the words are out of its way; a melt does not, and finishing lets go', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const onWorld = fnBody(scene, 'function onWorld(d) {', '\n  }\n');
  assert.match(onWorld, /const cold = !d\?\.from;\s*\n\s*if \(cold\) stageMallow\?\.holdPlace\?\.\(true\);/, 'held before the host is shown and placed');
  assert.ok(onWorld.indexOf('holdPlace?.(true)') < onWorld.indexOf('showMallow(mallowId'), 'the hold starts before the host is shown');
  assert.ok(onWorld.indexOf('showMallow(mallowId') < onWorld.indexOf('if (cold) heroWaitsForWords();'), 'and waits for the words after it is placed');
  // the crisis veil returns before any of it
  assert.ok(onWorld.indexOf("if (hold === 'crisis')") < onWorld.indexOf('holdPlace?.(true)'));
  const wait = fnBody(scene, 'function heroWaitsForWords() {', '\n  }\n');
  assert.match(wait, /if \(!wordsInHeroWay\(\)\) \{ stageMallow\.holdPlace\(0\); return; \}/, 'nothing in the way: it goes at once');
  assert.match(wait, /now\(\) - t0 > 900/, 'never waits more than 0.9 s');
  assert.match(fnBody(scene, 'function wordsInHeroWay() {', '\n  }\n'), /L\.tagRect\(t\), K\)/, 'the words as shown, against the hero keep-out (which has the planned place in it)');
  assert.match(fnBody(scene, 'function endWorldMode() {', '\n  }\n'), /stageMallow\?\.holdPlace\?\.\(0\);/, 'finishing lets a waiting host go');
});

// ---------------------------------------------------------------- the Memory Garden card over the storm, 320×568 --
//  * The installation places its card as it starts and shows it 2.6 s later. On a small phone there is no place for it
//    clear of the thought, so the thought makes way — from the moment the card is placed (the shell's installKeepOut:
//    the card to come is in the director's keepOut while still unseen), not once it is already fading in over the
//    words; and if the thought is still under it when it is due (a finger holds it, a reduced-motion card comes at
//    0.75 s), the card waits unseen (cardWaitsForThought, ≤ 0.9 s). Whenever the card can be seen, neither the
//    thought's body nor its words are under it.
const heroOf = (W, H) => {
  const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
  const b = box(W / 2 - B / 2, bottom - B, W / 2 + B / 2, bottom);
  return { b, keep: { left: b.left, right: b.right, top: b.top - Math.max(18, B * 0.14), bottom: b.bottom + 6 }, mallow: { rect: () => b, bodyRect: () => b, restRect: () => b, react() {}, setEmotion() {}, lookAt() {}, float() {} } };
};
async function stormCard({ early = true, wait = true, cardAt = 2.6, reducedMotion = false } = {}) {
  VIEW.W = 320; VIEW.H = 568;
  const hero = heroOf(320, 568);
  const bounds = { left: 10, right: 310, top: 188, bottom: 534 };
  const L = new ThoughtLayer({ bounds: () => bounds, keepOut: () => hero.keep, reducedMotion, tagRoot: document.body });
  const th = L.add({ text: 'My brother read my messages again and I am so angry I could scream.', emotion: 'angry', intensity: 0.75, r: 32 }, { from: { x: 256, y: hero.b.top + 30 }, home: { x: 256, y: hero.b.top + 30 } });
  for (let i = 0; i < 90; i++) L.frame(1 / 60);
  // the card: its rect (planned from the installation's start) and how much of it is seen (from cardAt)
  const card = { rect: null, op: 0, shownAt: -1 };
  const keepOut = () => {
    if (!card.rect) return [];
    // (before: the shell kept the thought clear of the card only once it could be seen, and to its very edge; now also
    // while it is planned, with 10 px to spare — installKeepOut's KEEP_PAD)
    if (!early) return card.op < 0.05 ? [] : [card.rect];
    const p = 10, r = card.rect;
    return [{ left: r.left - p, top: r.top - p, right: r.right + p, bottom: r.bottom + p }];
  };
  const D = createHushflow({
    worldEl: new El('div'), fxEl: new El('div'), mallow: hero.mallow, thoughts: L, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} },
    safeRect: () => ({ x: 20, y: 68, w: 280, h: Math.max(160, hero.b.top - 14 - 68) }), subtitleBand: () => 118,
    photos: { n: 7, draw: () => ({ w: 1, h: 1 }), size: (i, k, s) => ({ w: Math.round(s * 0.78), h: Math.round(s) }) },
    registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion, keepOut,
  });
  await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
  for (let i = 0; i < 60 * 8; i++) { D.debug.step(1 / 60); L.frame(1 / 60); }
  const tg = L.tags.get(th);
  const P = D.world.layoutPlan.thought.plate;
  // where garden-install puts the card at 320 (measured: 280 × 150, from just above the words down over Glitzi's head)
  card.rect = box(20, Math.round(P.y0) - 22, 300, Math.round(P.y0) - 22 + 150);
  // (the installation has the lines quiet: the shell lets the thoughts float up to just under the top bar meanwhile)
  bounds.top = 70;
  const frames = [];
  let t = 0, waitFrom = -1;
  const over = () => (L.rects() || []).some((r) => hit(box(card.rect.left - 4, card.rect.top - 4, card.rect.right + 4, card.rect.bottom + 4), r));
  for (let i = 0; i < 60 * 6; i++) {
    t += 1 / 60;
    if (t >= cardAt && card.shownAt < 0) {
      if (!wait) card.shownAt = t;
      else { if (waitFrom < 0) waitFrom = t; if (!over() || t - waitFrom > 0.9) card.shownAt = t; }
    }
    // (.hm-install-card's fade in: opacity .6 s cubic-bezier(.22,1,.36,1) — a quick rise; .45 s ease with reduced motion)
    if (card.shownAt >= 0) { const k = Math.min(1, (t - card.shownAt) / (reducedMotion ? 0.45 : 0.6)); card.op = 1 - (1 - k) ** 3; }
    D.debug.step(1 / 60); L.frame(1 / 60);
    const e = th.extent({});
    frames.push({ t, op: card.op, body: box(e.left, e.top, e.right, e.bottom), tag: tg.shown ? L.tagRect(th) : null });
  }
  return { D, L, th, frames, card, done() { D.destroy(); L.destroy(); } };
}
const underCard = (run) => run.frames.filter((f) => f.op > 0.15 && (hit(f.body, run.card.rect) || hit(f.tag, run.card.rect)))
  .map((f) => ({ t: +f.t.toFixed(2), op: +f.op.toFixed(2), body: hit(f.body, run.card.rect), words: hit(f.tag, run.card.rect) }));

for (const reducedMotion of [false, true]) {
  test(`storm 320×568${reducedMotion ? ', reduced motion' : ''}: the garden card is never seen over the thought or its words — it makes way while the card is still planned`, async () => {
    const run = await stormCard({ reducedMotion, cardAt: reducedMotion ? 0.75 : 2.6 });
    try {
      const u = underCard(run);
      assert.equal(u.length, 0, `frames with the card seen over the thought: ${JSON.stringify(u.slice(0, 4))}`);
      assert.ok(run.frames.at(-1).op > 0.99, 'the card shows');
      const late = run.card.shownAt - (reducedMotion ? 0.75 : 2.6);
      assert.ok(late <= 0.91, `and not much later than due (${late.toFixed(2)} s)`);
      assert.ok(run.frames.every((f) => f.body.top >= 0), 'the thought stays on the screen');
    } finally { run.done(); }
  });
}

test('storm 320×568, the case: kept clear only once the card is seen (before r2b), the card fades in over the words', async () => {
  const run = await stormCard({ early: false, wait: false });
  try {
    assert.ok(underCard(run).length > 0, 'the old way showed the card over the thought (this harness sees the failure)');
  } finally { run.done(); }
});

test('shell: the thought makes way for the card from its placing, the card waits unseen while the thought is under it, the lines wait for the thought to leave the band', () => {
  const scene = read('src/app/scenes/hushfold.js'), css = read('src/ui/hushfold.css');
  assert.match(scene, /keepOut: \(\) => installKeepOut\(\),/, 'the director keeps the thought clear of the card to come');
  assert.match(fnBody(scene, 'function installKeepOut() {', '\n  }\n'), /r\.left - KEEP_PAD, top: r\.top - KEEP_PAD/, 'with room to spare');
  assert.match(scene, /const KEEP_PAD = 10;/);
  const planned = fnBody(scene, 'function plannedCardRect() {', '\n  }\n');
  assert.match(planned, /\.hm-install-card:not\(\.is-out\)/);
  assert.match(planned, /if \(!c\?\.isConnected\) return null;/, 'from its placing until it goes — also in the first frames of its fade-in, before installAvoidRects sees it');
  assert.match(fnBody(scene, 'const onInstallPhase = (e) => {', '\n  };\n'), /if \(ph === 'card'\) \{[^\n]*cardWaitsForThought\(\);/);
  assert.match(fnBody(scene, 'function cardWaitsForThought() {', '\n  }\n'), /now\(\) - t0 > 900/, 'never waits more than 0.9 s');
  assert.match(css, /body\.hf-card-wait \.hm-install-card \{ opacity: 0 !important; pointer-events: none !important; \}/);
  const subs = fnBody(scene, 'const installSubtitles = ((shown) => {', '\n  })(subtitles);');
  assert.match(subs, /thoughtInBand\(\) && \(inst \|\| now\(\) - freeAt < 3000\)\) \{ later\(go, 60\); return; \}\s*back = 0; shown\.resume\(\);/, 'the lines wait while the thought is in the band');
  assert.match(subs, /get paused\(\) \{ return shown\.paused && !back; \}/, 'lines on their way back are not paused for a second installation: its pause is its own');
  assert.match(subs, /pause\(\) \{ back = 0; shown\.pause\(\); \}/, 'a pause cancels lines on their way back');
});

