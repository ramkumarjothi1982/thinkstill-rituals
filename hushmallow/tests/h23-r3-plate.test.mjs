// Integration H2 + H3, review round 2: one source of truth for the Thought Mallow's words plate in the Static Storm.
// The storm plans its stage round the plate W2's ThoughtLayer measures (plateFor), asks the layer for that very plate
// (th.labelFit, th.labelSide 'below'), keeps it clear of where the layer keeps words off (wordsKeepOut), and the layer
// draws exactly it there — so postcards never press on the words, the words never hop above the thought, and the
// thought rests where it was planned. The real layer and the real storm, through the director, in a stand-in DOM that
// lays the tags out as Chromium does (the metrics of tests/thought-layout.test.mjs).
// Run: node --test hushmallow/tests/h23-r3-plate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ------------------------------------------------------------- stand-in DOM --
const VIEW = { W: 390, H: 844 };
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
const { WORDS, createRegistry } = await (async () => { const m = await import('../src/hushfold/flow/registry.js'); return { WORDS: m.WORLDS, createRegistry: m.createRegistry }; })();

// ------------------------------------------------------------- harness --
const TEXT = 'My boss shouted at me in front of the whole team today.';
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
/** Glitzi on the world's floor as the shell places it (its rest box), and the shell's keep-out round it (room for a hop). */
function heroOf(W, H) {
  const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
  const b = { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B, bottom, width: B, height: B, cx: W / 2, cy: bottom - B / 2 };
  const keep = { left: b.left, right: b.right, top: b.top - Math.max(18, B * 0.14), bottom: b.bottom + 6 };
  return { b, keep, mallow: { rect: () => b, bodyRect: () => b, restRect: () => b, react() {}, setEmotion() {}, lookAt() {}, float() {} } };
}
const below = (tg, e) => tg.y >= e.bottom - 4;

async function storm(W, H, { reducedMotion = false, seconds = 10, melt = false, meltDt = 1 / 60 } = {}) {
  VIEW.W = W; VIEW.H = H;
  const hero = heroOf(W, H);
  const bounds = { left: 10, right: W - 10, top: 96, bottom: H - 80 };
  const L = new ThoughtLayer({ bounds: () => bounds, keepOut: () => hero.keep, reducedMotion, tagRoot: document.body });
  const th = L.add({ text: TEXT, emotion: 'angry', intensity: 0.75, r: W < 360 ? 32 : 38 }, { from: { x: W * 0.8, y: hero.b.top + 30 }, home: { x: W * 0.8, y: hero.b.top + 30 } });
  for (let i = 0; i < 90; i++) L.frame(1 / 60);
  const D = createHushflow({
    worldEl: new El('div'), fxEl: new El('div'), mallow: hero.mallow, thoughts: L, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} },
    // (the shell's free area under its top bar and the band it keeps for the lines, as measured in the browser)
    safeRect: () => ({ x: 20, y: 68, w: W - 40, h: Math.max(160, hero.b.top - 14 - 68) }), subtitleBand: () => (H < 600 ? 118 : 143),
    photos: { n: 7, draw: () => ({ w: 1, h: 1 }), size: (i, k, s) => ({ w: Math.round(s * 0.78), h: Math.round(s) }) },
    registry: createRegistry(WORDS), ticker: fakeTicker(), store: memStore(), reducedMotion,
  });
  await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
  const frames = [];
  const sample = (i, dt = 1 / 60) => {
    const P = D.world?.layoutPlan?.thought, tg = L.tags.get(th), e = th.extent({});
    // (what the person sees of the words: none unless shown, then the world's fade — no CSS ease, as with the OS's reduced motion)
    const op = tg && tg.shown && !L.hidden ? (tg.opQ ?? 20) / 20 : 0;
    frames.push({ i, dt, k: D.state.melt, tho: th.opacity, w: D.state.worldId, ph: D.state.phase, x: th.x, y: th.y, P: P && { ...P }, op, wf: !!tg?.wfade, tc: tg ? { x: tg.x, y: tg.y + tg.h / 2 } : null,
      tag: tg && tg.shown ? { x0: tg.x - tg.w / 2, y0: tg.y, x1: tg.x + tg.w / 2, y1: tg.y + tg.h, w: tg.w, h: tg.h } : null, below: tg && tg.shown ? below(tg, e) : null, fit: th.labelFit, side: th.labelSide });
  };
  for (let i = 0; i < 60 * seconds; i++) { D.debug.step(1 / 60); L.frame(1 / 60); sample(i); }
  if (melt) {
    assert.equal(D.next(), true, 'Drift on');
    // (the melt at the frame rate given: a slow device steps it coarsely — far past its midpoint in one frame)
    for (let i = 0; i < 60 * 12 && !(D.state.worldId === 'luminous-ocean' && D.state.phase === 'playing'); i++) { D.debug.step(meltDt); L.frame(meltDt); sample(frames.length, meltDt); await new Promise((r) => setTimeout(r, 0)); }
    for (let i = 0; i < 60 * 3; i++) { D.debug.step(1 / 60); L.frame(1 / 60); sample(frames.length); }
  }
  return { D, L, th, frames, hero, done() { D.destroy(); L.destroy(); } };
}

for (const [W, H] of [[390, 844], [320, 568]]) {
  test(`storm ${W}×${H}: the plan is laid round the layer's own words plate, the layer draws that very plate below the thought, and the thought rests where it was planned`, async () => {
    const run = await storm(W, H);
    try {
      const { frames, th, L, hero } = run;
      const last = frames.at(-1);
      assert.ok(last.P?.fit, 'the plan was measured by the layer (plan.thought.fit)');
      assert.deepEqual({ lines: th.labelFit.lines, maxW: th.labelFit.maxW }, { lines: last.P.fit.lines, maxW: last.P.fit.maxW }, 'the storm asks the layer for the planned plate');
      assert.equal(th.labelSide, 'below');
      const P = last.P.plate;
      // the plan's plate is the size the layer measured, and clear of where the layer keeps words off
      const K = L.wordsKeepOut();
      assert.ok(!(P.x1 > K.left && P.x0 < K.right && P.y1 > K.top && P.y0 < K.bottom), `planned plate ${JSON.stringify(P)} clear of the words keep-out ${JSON.stringify(K)}`);
      // from 4 s: the words are drawn below the thought, at the planned size, near the planned place; the thought rests at its plan
      const settled = frames.filter((f) => f.i >= 240 && f.tag);
      assert.ok(settled.length > 300, `the words show (${settled.length} frames)`);
      const notBelow = settled.filter((f) => !f.below).length;
      assert.equal(notBelow, 0, `frames with the words not below the thought: ${notBelow}`);
      const dW = Math.max(...settled.map((f) => Math.abs(f.tag.w - (f.P.plate.x1 - f.P.plate.x0))));
      const dH = Math.max(...settled.map((f) => Math.abs(f.tag.h - (f.P.plate.y1 - f.P.plate.y0))));
      assert.ok(dW <= 1 && dH <= 1, `drawn plate size = planned (Δw ${dW.toFixed(1)}, Δh ${dH.toFixed(1)})`);
      const dPlate = settled.map((f) => Math.hypot(f.tag.x0 - f.P.plate.x0, f.tag.y0 - f.P.plate.y0)).sort((a, b) => a - b);
      assert.ok(dPlate[dPlate.length >> 1] <= 8, `drawn plate within a few px of the plan (median ${dPlate[dPlate.length >> 1].toFixed(1)} px)`);
      const dT = frames.filter((f) => f.i >= 300).map((f) => Math.hypot(f.x - f.P.x, f.y - f.P.y)).sort((a, b) => a - b);
      assert.ok(dT[dT.length >> 1] <= 4 && dT.at(-1) <= 12, `the thought rests at its planned place (median ${dT[dT.length >> 1].toFixed(1)}, max ${dT.at(-1).toFixed(1)} px; at ${last.x.toFixed(1)},${last.y.toFixed(1)} plan ${last.P.x.toFixed(1)},${last.P.y.toFixed(1)}; ${JSON.stringify(run.D.world.debug.yieldBy)} rest ${JSON.stringify(run.D.world.thoughtRest)} plan ${last.P.name})`);
      // and the drawn words never touch the hero's keep-out
      const onKeep = settled.filter((f) => f.tag.x1 > K.left && f.tag.x0 < K.right && f.tag.y1 > K.top && f.tag.y0 < K.bottom).length;
      assert.equal(onKeep, 0, `frames with the words on the hero's keep-out: ${onKeep}`);
      void hero;
    } finally { run.done(); }
  });
}

// The words never jump in plain sight (review r2, B4): from the storm's arrival, through its stage and the melt into the
// ocean, the tag's centre steps at most 12 px per 1/60 s whenever it can be seen (opacity > 0.15, as the stylesheet's own
// fades show it: out .2 s, in .45 s, none while a world fades words already there) — with reduced motion (a side change,
// a new plate or a melt move fades it fully out first, moves it unseen, then fades it in) and without; at 60 fps, and on
// a slow device (world steps clamped to 50 ms while each frame takes 80 ms). And the body is moved only while unseen.
const seenOps = (frames, cssDt) => { let v = 0, goal = 0; return frames.map((f) => { if (f.wf) v = goal = f.op; else { const dt = cssDt ?? f.dt; v = goal > v ? Math.min(goal, v + dt / 0.45) : Math.max(goal, v - dt / 0.2); goal = f.op; } return v; }); };
function worstStep(frames, vis) {
  let worst = 0, at = null, seen = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    if (!a.tc || !b.tc || Math.max(vis[i - 1], vis[i]) <= 0.15) continue;
    seen++;
    const d = Math.hypot(b.tc.x - a.tc.x, b.tc.y - a.tc.y) / (b.dt * 60);
    if (d > worst) { worst = d; at = { i, w: b.w, ph: b.ph, k: b.k, op: [vis[i - 1], vis[i]].map((v) => +v.toFixed(2)), from: a.tc, to: b.tc }; }
  }
  return { worst, at, seen };
}
for (const [reducedMotion, meltDt, cssDt] of [[true, 1 / 60, null], [true, 0.05, 0.08], [false, 1 / 60, null]]) {
  for (const [W, H] of [[390, 844], [320, 568]]) {
    test(`words continuity ${W}×${H}${reducedMotion ? ', reduced motion' : ''}${cssDt ? ', slow device' : ''}: storm arrival → storm → melt → ocean, the tag never steps > 12 px per 1/60 s while seen`, async () => {
      const run = await storm(W, H, { reducedMotion, seconds: 6, melt: true, meltDt });
      try {
        const { frames } = run;
        assert.ok(frames.some((f) => f.w === 'luminous-ocean' && f.ph === 'playing'), 'the ocean arrived');
        const { worst, at, seen } = worstStep(frames, seenOps(frames, cssDt));
        assert.ok(seen > 150, `the words were seen (${seen} frame pairs)`);
        assert.ok(worst <= 12, `largest step of the words while seen ${worst.toFixed(1)} px (${JSON.stringify(at)})`);
      } finally { run.done(); }
    });
  }
}
// (a slow frame can carry the reduced-motion melt far past its midpoint: the thought is moved home on a frame drawn unseen)
for (const [W, H] of [[390, 844], [320, 568]]) {
  test(`reduced-motion melt ${W}×${H} with coarse frames (80 ms): the body is moved home only on a frame where it is unseen`, async () => {
    const run = await storm(W, H, { reducedMotion: true, seconds: 5, melt: true, meltDt: 0.08 });
    try {
      const { frames } = run;
      let bad = null;
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1], b = frames[i], d = Math.hypot(b.x - a.x, b.y - a.y) / (b.dt * 60);
        if (d > 12 && Math.max(a.tho ?? 1, b.tho ?? 1) > 0.05 && (b.tho ?? 1) > 0.05) { bad = { i, d: +d.toFixed(1), k: b.k, op: [a.tho, b.tho] }; break; }
      }
      assert.equal(bad, null, `moved in plain sight: ${JSON.stringify(bad)}`);
    } finally { run.done(); }
  });
}

test('ThoughtLayer.plateFor: the plate measured for a budget is the plate drawn once a driving host asks for it; the tag keeps what it showed meanwhile', () => {
  VIEW.W = 390; VIEW.H = 844;
  const L = new ThoughtLayer({ bounds: () => ({ left: 10, right: 380, top: 96, bottom: 760 }), keepOut: () => null, reducedMotion: false, tagRoot: document.body });
  const th = L.add({ text: TEXT, emotion: 'angry', intensity: 0.75, r: 38 }, { x: 200, y: 300 });
  for (let i = 0; i < 60; i++) L.frame(1 / 60);
  const tg = L.tags.get(th), before = { w: tg.w, h: tg.h, text: tg.text };
  const P2 = L.plateFor(th, { lines: 2, maxW: 324, r: 33 });
  assert.deepEqual({ w: tg.w, h: tg.h, text: tg.text }, before, 'measuring leaves the tag as it was');
  assert.ok(P2.w <= 324 && P2.rows === 2 && P2.h === 2 * 22.1 + 17, `two rows of the whole text: ${JSON.stringify(P2)}`);
  assert.equal(P2.text, TEXT);
  const P1 = L.plateFor(th, { lines: 1, maxW: 280, r: 27 });
  assert.equal(P1.rows, 1);
  assert.match(P1.text, /…$/, 'one line: the start of the words, cut at a word');
  assert.ok(P2.below > 33 && P2.below < 33 + 40, `hangs below the body drawn at r 33 (${P2.below.toFixed(1)})`);
  // a host that drives the thought and asks for that plate gets it, on its side
  th.labelFit = { lines: 2, maxW: 324 }; th.labelSide = 'below';
  for (let i = 0; i < 40; i++) { th.x = 200; th.y = 300; L.frame(1 / 60); }
  assert.equal(tg.w, P2.w); assert.equal(tg.h, P2.h);
  assert.ok(tg.y >= th.extent({}).bottom - 4, 'below the thought');
  const R = L.tagRect(th);
  assert.deepEqual([R.left, R.top, R.right - R.left, R.bottom - R.top].map((v) => Math.round(v)), [Math.round(tg.x - tg.w / 2), Math.round(tg.y), Math.round(tg.w), Math.round(tg.h)], 'tagRect: the plate alone');
  // once nothing drives it, the stage's own budget again
  th.labelFit = null;
  for (let i = 0; i < 60; i++) L.frame(1 / 60);
  assert.equal(tg.text, before.text);
  L.destroy();
});

for (const reducedMotion of [false, true]) {
  test(`ThoughtLayer${reducedMotion ? ', reduced motion' : ''}: a thought a world drives out to the horizon gets fewer lines — the words change only while unseen, never re-flowing in plain sight`, () => {
    VIEW.W = 390; VIEW.H = 844;
    const L = new ThoughtLayer({ bounds: () => ({ left: 10, right: 380, top: 96, bottom: 760 }), keepOut: () => null, reducedMotion, tagRoot: document.body });
    const th = L.add({ text: TEXT, emotion: 'embarrassed', intensity: 0.6, r: 38 }, { x: 200, y: 360 });
    for (let i = 0; i < 60; i++) L.frame(1 / 60);
    const tg = L.tags.get(th), lines0 = tg.cur.lines;
    assert.ok(tg.shown && lines0 >= 2, `the words show, ${lines0} lines`);
    // (the Luminous Ocean writes the thought each frame — place and depth — as the person's swells carry it out)
    const frames = [];
    for (let i = 0; i < 60 * 4; i++) {
      th.x = 200; th.y = 360; th.z = Math.min(0.95, i / 150);
      L.frame(1 / 60);
      frames.push({ dt: 1 / 60, op: tg.shown && !L.hidden ? (tg.opQ ?? 20) / 20 : 0, wf: !!tg.wfade, box: `${tg.w}×${tg.h}`, text: tg.text, lines: tg.cur.lines });
    }
    const vis = seenOps(frames);
    let changes = 0, seen = null;
    for (let i = 1; i < frames.length; i++) {
      if (frames[i].box === frames[i - 1].box && frames[i].text === frames[i - 1].text) continue;
      changes++;
      if (Math.max(vis[i - 1], vis[i]) > 0.15 && !seen) seen = { i, from: frames[i - 1].box, to: frames[i].box, op: [vis[i - 1], vis[i]].map((v) => +v.toFixed(2)) };
    }
    assert.ok(frames[frames.length - 1].lines < lines0, `it got fewer lines (${lines0} → ${frames[frames.length - 1].lines})`);
    assert.ok(changes >= 1, 'its words changed');
    assert.equal(seen, null, `re-flowed while seen: ${JSON.stringify(seen)}`);
    assert.ok(vis[vis.length - 1] > 0.9, 'and they show again afterwards');
    L.destroy();
  });
}
