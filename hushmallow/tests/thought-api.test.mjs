// The ThoughtLayer's host API (integration unit B3, additive): release(ms, which), a primary that skips
// leaving thoughts, ThoughtMallow.leaving, the words under the host's panels (z-index var(--tm-z, 1)),
// the person's text size (textScale), relayout() and a fade a world can write (opacity).
// A stand-in DOM lays the word tags out as the thought-layout gate does, at the tag's own text size.
// Run: node --test hushmallow/tests/thought-api.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ------------------------------------------------------------- stand-in DOM --
const VIEW = { W: 390, H: 844 };
// (HM Nunito Sans 17 px ≈ 8.3 px a character on 22.1 px lines; 16 px ≈ 7.85 on 20.8 at ≤ 360 px — × the text size)
const kOf = (tag) => parseFloat(tag?.style?.['--tm-k']) || 1;
const metrics = (k = 1) => (VIEW.W <= 360
  ? { cw: 7.85 * k, lh: 20.8 * k, padX: 22, padY: 13, border: 2, cssMax: Math.min(210, VIEW.W - 28) }
  : { cw: 8.3 * k, lh: 22.1 * k, padX: 28, padY: 15, border: 2, cssMax: Math.min(232, VIEW.W - 40) });
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
  const m = metrics(kOf(el)), span = el.children[0], text = span ? span._text : '';
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
class Style { setProperty(k, v) { this[k] = String(v); } }
class El {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = new Style(); this.classList = new ClassList(); this.attrs = {}; this._text = ''; }
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
  remove() { const p = this.parentNode; if (p) { const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1); this.parentNode = null; } }
  focus() {}
  getContext() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, right: VIEW.W, bottom: VIEW.H, width: VIEW.W, height: VIEW.H }; }
  get _tag() { return this.classList.contains('tm-tag') ? this : this.parentNode?.classList?.contains('tm-tag') ? this.parentNode : null; }
  get offsetWidth() { const t = this._tag; return t === this ? layoutTag(t).w : t ? layoutTag(t).scroll : 0; }
  get offsetHeight() { const t = this._tag; if (!t) return 0; const L = layoutTag(t); return t === this ? L.h : L.lines * metrics(kOf(t)).lh; }
  get scrollWidth() { const t = this._tag; return t ? layoutTag(t).scroll : 0; }
}
globalThis.document = { createElement: (t) => new El(t), head: new El('head'), body: new El('body'), addEventListener() {}, removeEventListener() {} };
globalThis.getComputedStyle = (el) => ({ lineHeight: `${metrics(kOf(el?._tag)).lh}px`, position: 'static', zIndex: 'auto' });
Object.defineProperty(globalThis, 'innerWidth', { get: () => VIEW.W, configurable: true });
Object.defineProperty(globalThis, 'innerHeight', { get: () => VIEW.H, configurable: true });
globalThis.devicePixelRatio = 2;

const { ThoughtLayer, ThoughtMallow, createThought } = await import('../src/mallows/thought/index.js');
const { primaryThought } = await import('../src/hushfold/flow/director.js');

const DT = 1 / 60;
const BOUNDS = { left: 20, top: 76, right: 370, bottom: 601 };
const HERO = { left: 86, top: 363, right: 304, bottom: 582 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (L, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) L.frame(DT); };
function stage(o = {}) {
  VIEW.W = 390; VIEW.H = 844;
  return new ThoughtLayer({ bounds: () => BOUNDS, keepOut: () => HERO, reducedMotion: false, tagRoot: document.body, ...o });
}
const three = (L) => [
  L.add({ text: 'My boss embarrassed me today.', emotion: 'embarrassment', intensity: 0.7 }, { from: { x: 195, y: 400 }, home: { x: 120, y: 200 } }),
  L.add({ text: 'Everyone saw me freeze in that meeting', emotion: 'overwhelm', intensity: 0.8 }, { from: { x: 195, y: 400 }, home: { x: 280, y: 200 } }),
  L.add({ text: 'Nobody texted me back', emotion: 'sadness', intensity: 0.6 }, { from: { x: 195, y: 400 }, home: { x: 200, y: 300 } }),
];

// ------------------------------------------------------------------ release --
test('release(ms, which): only that thought or those go; the others stay and keep their words', async () => {
  const L = stage();
  const [a, b, c] = three(L);
  run(L, 1.5);
  assert.equal(L.primary, c, 'the newest is the primary');
  // one thought (not an array)
  L.release(5000, c);
  assert.equal(c.leaving, true);
  assert.equal(a.leaving, false); assert.equal(b.leaving, false);
  assert.equal(L.primary, b, 'the primary skips a leaving thought');
  assert.equal(primaryThought(L), b, 'and so does the director');
  assert.equal(L.tagOf(c).style.pointerEvents, 'none', 'its words take no taps');
  assert.notEqual(L.tagOf(b).style.pointerEvents, 'none');
  // an array: those two; the one already leaving keeps its own fade
  const cUntil = c._leaving;
  L.release(5000, [a, c]);
  assert.equal(a.leaving, true);
  assert.equal(c._leaving, cUntil, 'a thought already leaving is not restarted');
  assert.equal(b.leaving, false);
  assert.equal(L.primary, b);
  // the others stay where they are and keep showing their words
  run(L, 0.3);
  assert.deepEqual(L.list, [a, b, c], 'still on the layer while they fade');
  assert.ok(L.tags.get(b).shown, 'the one that stays still shows its words');
  assert.ok(!L.tags.get(a).shown && !L.tags.get(c).shown, 'the leaving ones hide theirs');
  // rects() leave the leaving ones out (nothing keeps clear of words that are going)
  assert.deepEqual(L.rects().map((r) => r.id), [b.id]);
  // empty `which` releases nothing
  L.release(10, []);
  assert.equal(b.leaving, false);
  // no `which`: every thought goes (the Hushfold's call when a world takes the words over)
  L.release(10);
  assert.equal(b.leaving, true);
  assert.equal(L.primary, null);
  L.destroy();
});

test('release: a leaving thought and its siblings fade on the clock, are untouchable, then leave the layer', async () => {
  const L = stage();
  const [a, b] = three(L);
  run(L, 1.5);
  assert.ok(b.siblings.length > 0, 'overwhelm brings siblings');
  const a0 = b.render.alpha, s0 = b.siblings[0].render.alpha;
  // (its own alpha, unfaded: fainter only with depth, once it has appeared)
  const natural = (th) => (1 - 0.28 * th.z) * Math.min(1, th.ov.appear * 1.6);
  const sib = b.siblings[0];
  assert.equal(L.hitTest(b.render.cx, b.render.cy), b, 'touchable before');
  assert.equal(L.hitTest(sib.render.cx, sib.render.cy), sib, 'its sibling too');
  // a finger on it when it is let go: the press is cancelled (it is not carried off while it fades)
  assert.ok(L.pointer({ type: 'down', id: 3, x: b.render.cx, y: b.render.cy, t: performance.now() }));
  assert.ok(b.pressed);
  L.release(400, b);
  assert.equal(L.owner.size, 0);
  assert.ok(!b.pressed, 'the press is cancelled');
  assert.equal(sib.leaving, true, 'a sibling is leaving with its thought');
  assert.equal(L.hitTest(b.render.cx, b.render.cy), null, 'a leaving thought takes no touch');
  assert.equal(L.hitTest(sib.render.cx, sib.render.cy), null, 'nor do its siblings');
  await sleep(200);
  L.frame(DT);
  const k = b.render.alpha / a0, ks = sib.render.alpha / s0;
  assert.ok(k > 0.2 && k < 0.8, `half way through, the body is half faded: ${k.toFixed(2)}`);
  assert.ok(Math.abs(ks - k) < 0.12, `its siblings fade with it: ${ks.toFixed(2)} vs ${k.toFixed(2)}`);
  assert.ok(Math.abs(a.render.alpha - natural(a)) < 1e-6, 'the one that stays does not fade');
  assert.ok(Math.abs(b.render.alpha / natural(b) - k) < 0.05, 'the fade is on top of its own alpha');
  await sleep(260);
  L.frame(DT);
  assert.ok(!L.list.includes(b), 'gone once its time is up');
  assert.equal(b.destroyed, true);
  assert.ok(L.list.includes(a));
  L.destroy();
});

test('release: the built-in reader closes only when its own thought is let go', () => {
  const L = stage();
  const [a, b] = three(L);
  run(L, 1.2);
  L.read(a);
  assert.ok(L.reading);
  L.release(500, b);
  assert.ok(L.reading, 'reading another thought: it stays open');
  L.release(500, a);
  assert.ok(!L.reading, 'its own thought goes: it closes');
  L.destroy();
});

test('leaving: false for a thought on no layer and for a fresh one; a sibling follows its thought', () => {
  const th = createThought({ text: 'What if they think I am useless?', emotion: 'overwhelm', intensity: 0.8 });
  assert.ok(th instanceof ThoughtMallow);
  assert.equal(th.leaving, false);
  assert.ok(th.siblings.length > 0);
  assert.equal(th.siblings[0].leaving, false);
  th._leaving = 123;     // (what ThoughtLayer.release() sets)
  assert.equal(th.leaving, true);
  assert.equal(th.siblings[0].leaving, true);
  // read only: a host cannot set it by mistake
  assert.throws(() => { th.leaving = false; }, TypeError);
});

// ------------------------------------------------------------------ z-index --
test('the words sit under the host\'s panels and sheets: .tm-tag z-index is var(--tm-z, 1), not 6', () => {
  const L = stage();
  const st = document.head.children.find((c) => c.id === 'thought-mallow-style');
  assert.ok(st, 'the style is injected');
  const rule = st.textContent.match(/\.tm-tag\{[^}]*\}/)[0];
  assert.match(rule, /z-index:var\(--tm-z,1\)/);
  assert.doesNotMatch(rule, /z-index:6/);
  // (the reader is a dialog: it stays above)
  assert.match(st.textContent, /\.tm-read\{[^}]*z-index:12/);
  L.destroy();
});

// ---------------------------------------------------------------- textScale --
test('textScale: the words\' font and plates grow with the person\'s text size; the same words show', () => {
  const text = 'Everyone saw me freeze in that meeting and now I keep replaying it';
  const at = (k) => {
    const L = stage(k == null ? {} : { textScale: () => k });
    const th = L.add({ text, emotion: 'anxiety', intensity: 0.6 }, { from: { x: 200, y: 300 }, home: { x: 260, y: 220 } });
    run(L, 1.5);
    const tg = L.tags.get(th);
    const out = { k: tg.el.style['--tm-k'], w: tg.w, h: tg.h, text: tg.text, max390: L._tagMax(390, 0), max320: L._tagMax(320, 0), max390full: L._tagMax(390, 4) };
    L.destroy();
    return out;
  };
  const one = at(null), big = at(1.25);
  assert.equal(one.k, undefined, 'the default size writes nothing (the look is unchanged)');
  assert.equal(big.k, '1.25', 'the font scales through --tm-k');
  assert.equal(one.max390, 232); assert.equal(one.max320, 210);
  assert.equal(big.max390, 290, 'a plate as much wider (232 × 1.25)');
  assert.equal(big.max320, 263, 'at 320 px: 210 × 1.25, still inside the screen');
  assert.equal(big.max390full, 240, 'a full stage: 192 × 1.25');
  assert.equal(big.text, one.text, 'the same words show at the larger size');
  assert.ok(big.w > one.w * 1.15 && big.h > one.h * 1.1, `the plate is larger: ${one.w}×${one.h} → ${big.w}×${big.h}`);
  // a number works as well as a function; nonsense falls back to 1
  assert.equal(new ThoughtLayer({ textScale: 1.12 })._k, 1.12);
  assert.equal(new ThoughtLayer({ textScale: () => NaN })._k, 1);
  // the plate never outgrows a narrow screen
  VIEW.W = 300;
  assert.equal(new ThoughtLayer({ textScale: 1.6 })._tagMax(300, 0), 272);
  VIEW.W = 390;
});

test('textScale: a live change re-measures the words and plans the stage again, once', () => {
  let k = 1;
  const L = stage({ textScale: () => k });
  const th = L.add({ text: 'My boss embarrassed me in front of everyone today', emotion: 'embarrassment', intensity: 0.7 }, { from: { x: 200, y: 300 }, home: { x: 260, y: 220 } });
  run(L, 1.5);
  const tg = L.tags.get(th), w1 = tg.w;
  L.read(th);
  let plans = 0;
  const relayout = L.relayout.bind(L);
  L.relayout = () => { plans++; relayout(); };
  k = 1.25;
  L.frame(DT);
  assert.equal(plans, 1, 'planned again at once');
  assert.equal(tg.el.style['--tm-k'], '1.25');
  assert.equal(L._readEl.style['--tm-k'], '1.25', 'the reader too');
  run(L, 0.5);
  assert.equal(plans, 1, 'only when the size changes');
  assert.ok(tg.w > w1 * 1.15, `the plate grew: ${w1} → ${tg.w}`);
  L.destroy();
});

// ----------------------------------------------------------------- relayout --
test('relayout(): the stage is planned again now (the hero moved onto a thought), not after the half-second wait', () => {
  const hero = { ...HERO };
  const L = new ThoughtLayer({ bounds: () => BOUNDS, keepOut: () => hero, reducedMotion: false, tagRoot: document.body });
  const th = L.add({ text: 'Nobody texted me back', emotion: 'sadness', intensity: 0.6 }, { from: { x: 300, y: 200 }, home: { x: 300, y: 200 } });
  run(L, 2);
  const h0 = { x: th.home.x, y: th.home.y };
  // the host moves its hero onto where the thought rests
  Object.assign(hero, { left: h0.x - 90, right: Math.min(BOUNDS.right, h0.x + 90), top: h0.y - 90, bottom: h0.y + 90 });
  L.relayout();
  const moved = Math.hypot(th.home.x - h0.x, th.home.y - h0.y);
  assert.ok(moved > 30, `its home moved at once (${moved.toFixed(0)} px)`);
  const f = L._footAt(th, new Float64Array(4));
  const ox = Math.min(f[2], hero.right) - Math.max(f[0], hero.left), oy = Math.min(f[3], hero.bottom) - Math.max(f[1], hero.top);
  assert.ok(!(ox > 12 && oy > 12), `planned clear of the hero: ${[...f].map((v) => v.toFixed(0))} vs ${JSON.stringify(hero)}`);
  // harmless with no thoughts, and after destroy
  const E = new ThoughtLayer({});
  assert.doesNotThrow(() => E.relayout());
  L.destroy();
  assert.doesNotThrow(() => L.relayout());
});

// ------------------------------------------------------------------ opacity --
test('opacity: a world\'s fade reaches the body, its siblings, the rope and the words; it eases back to 1', () => {
  const L = stage();
  const th = L.add({ text: 'Everyone saw me freeze in that meeting', emotion: 'overwhelm', intensity: 0.8 }, { from: { x: 200, y: 300 }, home: { x: 270, y: 220 } });
  run(L, 1.5);
  const tg = L.tags.get(th), sib = th.siblings[0];
  const a0 = th.render.alpha, s0 = sib.render.alpha;
  assert.equal(tg.el.style['--tm-o'], undefined, 'nothing written while no world fades it (the look is unchanged)');
  // a world writes it every frame (its tick runs before the layer's frame)
  for (let i = 0; i < 20; i++) { th.opacity = 0.3; L.frame(DT); }
  assert.ok(Math.abs(th.render.alpha - 0.3 * a0) < 0.01, `body ${th.render.alpha.toFixed(3)} vs ${(0.3 * a0).toFixed(3)}`);
  assert.ok(Math.abs(sib.render.alpha - 0.3 * s0) < 0.01, 'its siblings');
  assert.equal(tg.el.style['--tm-o'], '0.3', 'its words (in 5 % steps)');
  assert.ok(tg.shown, 'its words still show (faded), they are not hidden');
  // no more writes: held half a second, then back to 1 over the next half
  run(L, 0.4);
  assert.ok(th.opacity < 0.31, 'held');
  run(L, 0.3);
  assert.ok(th.opacity > 0.31 && th.opacity < 1, `easing back: ${th.opacity.toFixed(2)}`);
  run(L, 0.5);
  assert.equal(th.opacity, 1);
  assert.ok(Math.abs(th.render.alpha - a0) < 0.01);
  assert.equal(tg.el.style['--tm-o'], '1');
  // clamped; nonsense is ignored
  th.opacity = 2; assert.equal(th.opacity, 1);
  th.opacity = -1; assert.equal(th.opacity, 0);
  th.opacity = NaN; assert.equal(th.opacity, 0);
  // a fade and a release multiply
  th.opacity = 0.5;
  L.release(100000, th);
  L.frame(DT); th.opacity = 0.5; L.frame(DT);
  assert.ok(th.render.alpha < 0.5 * a0 + 0.01);
  L.destroy();
});

test('a thought on no layer: opacity defaults to 1 and the jelly draws as before', () => {
  const th = createThought({ text: 'I said the wrong thing again', emotion: 'frustration' });
  assert.equal(th.opacity, 1);
  th.step(DT, {});
  assert.ok(th.render.alpha > 0);
});
