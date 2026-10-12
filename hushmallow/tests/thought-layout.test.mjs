// Thought Mallow layout gate (W2b review r3). A stand-in DOM lays the word tags out as Chromium does
// (measured in the lab: HM Nunito Sans 17 px ≈ 8.3 px a character on 22.1 px lines, 16 px ≈ 7.85 px on
// 20.8 px lines at ≤ 360 px; the tag's padding and border), and the lab's own stages are replayed
// (bounds and hero rect per phone size and count, its wish homes, thoughts released out of the hero's
// head). At rest:
//   * no plate covers another plate, any face (a sibling's included) or the hero — 0 px²;
//   * once the thoughts have arrived their homes stay put (nothing rearranges itself without a touch)
//     and every plate keeps its side;
//   * the words get the room there is (a roomy stage is not cut to three words).
// Run: node --test hushmallow/tests/thought-layout.test.mjs
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
// a tag's box: border-box width (an inline width, else shrink-to-fit up to its max-width), its lines
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
  insertBefore(c, ref) { c.remove?.(); c.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c; }
  remove() { const p = this.parentNode; if (p) { const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1); this.parentNode = null; } }
  focus() {}
  getContext() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, right: VIEW.W, bottom: VIEW.H, width: VIEW.W, height: VIEW.H }; }
  get _tag() { return this.classList.contains('tm-tag') ? this : this.parentNode?.classList?.contains('tm-tag') ? this.parentNode : null; }
  get offsetWidth() { const t = this._tag; return t === this ? layoutTag(t).w : t ? layoutTag(t).scroll : 0; }
  get offsetHeight() { const t = this._tag; if (!t) return 0; const L = layoutTag(t); return t === this ? L.h : L.lines * metrics().lh; }
  get scrollWidth() { const t = this._tag; return t ? layoutTag(t).scroll : 0; }
}
globalThis.document = { createElement: (t) => new El(t), head: new El('head'), body: new El('body'), addEventListener() {}, removeEventListener() {} };
globalThis.getComputedStyle = () => ({ lineHeight: `${metrics().lh}px`, position: 'static', zIndex: 'auto' });
Object.defineProperty(globalThis, 'innerWidth', { get: () => VIEW.W, configurable: true });
Object.defineProperty(globalThis, 'innerHeight', { get: () => VIEW.H, configurable: true });
globalThis.devicePixelRatio = 2;

const { ThoughtLayer } = await import('../src/mallows/thought/layer.js');

// ------------------------------------------------------------ the lab's stages --
// measured in touch-lab.html?tab=thoughts (W2b r3, geom.js): the stage band and Glitzi's body rect
const STAGES = {
  '390x844': { bounds: { left: 20, top: 76, right: 370, bottom: 601 }, hero: [[86.9, 360.9, 303.1, 581.9], [86.9, 360.9, 303.1, 581.9], [86.9, 361, 303.1, 581.9], [109.2, 409.3, 280.8, 584.6], [116.6, 425.5, 273.4, 585.5]] },
  '375x812': { bounds: { left: 20, top: 76, right: 355, bottom: 569 }, hero: [[82.4, 340.7, 292.6, 550.4], [82.4, 340.6, 292.6, 550.4], [82.5, 340.4, 292.5, 550.4], [106.1, 390, 268.9, 553.2], [113.6, 405.8, 261.4, 554.1]] },
  '430x932': { bounds: { left: 20, top: 76, right: 410, bottom: 689 }, hero: [[95.4, 424.4, 334.6, 668.5], [95.4, 424.4, 334.6, 668.5], [95.4, 424.5, 334.6, 668.5], [114.7, 466.5, 315.3, 670.9], [123.6, 485.8, 306.4, 672]] },
  '320x568': { bounds: { left: 20, top: 20, right: 300, bottom: 396 }, hero: [[70.7, 199.7, 249.3, 379.3], [81.1, 222.2, 238.9, 380.5], [81, 222.4, 239, 380.5], [98, 258.6, 222, 382.6], [100, 262.9, 220, 382.8]] },
};
const TEXTS = ['Everyone saw me freeze in that meeting', 'My boss embarrassed me today.', 'What if they think I am useless?', 'I said the wrong thing again', 'Nobody texted me back'];
const ov = (a, b) => { const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return x > 0 && y > 0 ? x * y : 0; };
const plateOf = (L, th) => { const tg = L.tags.get(th); return tg && tg.shown ? { left: tg.x - tg.w / 2, top: tg.y, right: tg.x + tg.w / 2, bottom: tg.y + tg.h } : null; };

// one stage: n thoughts released as the lab does (all at once, or one at a time `gap` s apart)
function stage(size, feelings, { gap = 0, seconds = 8, texts = null } = {}) {
  const [W, H] = size.split('x').map(Number);
  VIEW.W = W; VIEW.H = H;
  const S = STAGES[size], n = feelings.length;
  // the lab sizes the hero for the count before adding (one at a time: it steps down with each arrival)
  const hero = { left: 0, top: 0, right: 0, bottom: 0 };
  const heroFor = (k) => { const h = S.hero[k - 1]; hero.left = h[0]; hero.top = h[1]; hero.right = h[2]; hero.bottom = h[3]; };
  heroFor(gap ? 1 : n);
  const L = new ThoughtLayer({ bounds: () => S.bounds, keepOut: () => hero, reducedMotion: false, tagRoot: document.body });
  const r = { cx: 0, top: 0, width: 0, height: 0 };
  const heroR = () => { r.cx = (hero.left + hero.right) / 2; r.top = hero.top; r.width = hero.right - hero.left; r.height = hero.bottom - hero.top; };
  heroR();
  const wish = (i, m) => {
    const span = Math.min(W - 120, 130 * Math.max(1, m - 1));
    const x = m > 1 ? W / 2 - span / 2 + (span * i) / (m - 1) : r.cx + r.width * 0.25;
    return { x, y: S.bounds.top + (r.top - S.bounds.top) * (m > 2 && i % 2 ? 0.3 : 0.55) };
  };
  const from = () => ({ x: r.cx, y: r.top + r.height * 0.2 });
  const rad = W < 360 ? 32 : 38;
  const log = { frames: [], adds: [] };
  let t = 0;
  const run = (sec) => { const k = Math.round(sec * 60); for (let i = 0; i < k; i++) { L.frame(1 / 60); t += 1 / 60; if (Math.round(t * 60) % 15 === 0) log.frames.push(snapshot(L, t, hero)); } };
  for (let i = 0; i < n; i++) {
    if (gap) { heroFor(i + 1); heroR(); }
    const t0 = performance.now();
    // (as the lab: the k-th of m wishes for a place in a row above the hero)
    L.add({ text: (texts || TEXTS)[i % (texts || TEXTS).length], emotion: feelings[i], intensity: 0.75, r: rad }, { from: from(), home: gap ? wish(i, i + 1) : wish(i, n) });
    log.adds.push(performance.now() - t0);
    if (gap) run(gap);
  }
  log.lastAdd = t;
  run(seconds);
  return { L, log, hero };
}
function snapshot(L, t, hero) {
  const list = L.list, faces = [];
  for (const th of list) { faces.push(th.faceRect({})); for (const s of th.siblings) faces.push(s.faceRect({})); }
  let pp = 0, pf = 0, ph = 0;
  const plates = list.map((th) => plateOf(L, th));
  for (let i = 0; i < plates.length; i++) {
    const a = plates[i];
    if (!a) continue;
    for (let j = i + 1; j < plates.length; j++) if (plates[j]) pp += ov(a, plates[j]);
    for (const f of faces) pf += ov(a, f);
    ph += ov(a, hero);
  }
  return { t, pp, pf, ph, crowd: L.crowding, homes: list.map((th) => [th.home.x, th.home.y]), ci: list.map((th) => L.tags.get(th)?.ci), text: list.map((th) => L.tagText(th)), emo: list.map((th) => th.emotion) };
}
// at rest: from 3 s after the last thought arrived
const atRest = (log) => log.frames.filter((f) => f.t >= log.lastAdd + 3);
function check(name, { L, log }) {
  const rest = atRest(log);
  assert.ok(rest.length > 4, `${name}: sampled at rest`);
  const worst = rest.reduce((a, f) => ({ pp: Math.max(a.pp, f.pp), pf: Math.max(a.pf, f.pf), ph: Math.max(a.ph, f.ph) }), { pp: 0, pf: 0, ph: 0 });
  assert.equal(Math.round(worst.pp), 0, `${name}: plate on plate ${worst.pp.toFixed(0)} px² (texts ${JSON.stringify(rest.at(-1).text)}, crowd ${rest.at(-1).crowd})`);
  assert.equal(Math.round(worst.pf), 0, `${name}: plate on a face ${worst.pf.toFixed(0)} px²`);
  assert.equal(Math.round(worst.ph), 0, `${name}: plate on the hero ${worst.ph.toFixed(0)} px²`);
  // nothing rearranges itself once arrived: homes within 25 px (a lonely one drifts on purpose), sides kept
  const a = rest[0], b = rest.at(-1);
  a.homes.forEach((p, i) => {
    if (a.emo[i] === 'loneliness') return;
    const d = Math.hypot(p[0] - b.homes[i][0], p[1] - b.homes[i][1]);
    assert.ok(d <= 25, `${name}: ${i} moved ${d.toFixed(0)} px at rest`);
  });
  assert.deepEqual(b.ci, a.ci, `${name}: plates kept their sides at rest`);
  return b;
}

test('layout gate: n = 1–3 at 320, 375, 390 and 430 — no plate on a plate, a face or the hero; nothing moves at rest', () => {
  const sets = { 1: [['anger'], ['overwhelm'], ['sadness']], 2: [['sadness', 'sadness'], ['anger', 'overwhelm'], ['frustration', 'anxiety']], 3: [['anger', 'anger', 'anger'], ['anger', 'sadness', 'overwhelm'], ['overwhelm', 'overwhelm', 'overwhelm']] };
  const summary = [];
  for (const size of ['320x568', '375x812', '390x844', '430x932']) {
    for (const n of [1, 2, 3]) {
      for (const feelings of sets[n]) {
        const st = stage(size, feelings);
        const last = check(`${size} ${feelings.join('+')}`, st);
        summary.push(`${size} ${feelings.join('+')}: crowd ${last.crowd}, ${last.text.map((x) => x.split(' ').length).join('/')} words, add ${Math.max(...st.log.adds).toFixed(0)} ms`);
        st.L.destroy();
      }
    }
  }
  console.log(summary.join('\n'));
});

test('layout gate: released one at a time (0.25 s apart), the same holds; sad thoughts at 320 keep their words readable', () => {
  for (const [size, feelings] of [['320x568', ['sadness', 'sadness']], ['320x568', ['anger', 'sadness', 'overwhelm']], ['375x812', ['anger', 'anger', 'anger']], ['430x932', ['overwhelm', 'overwhelm', 'overwhelm']]]) {
    const st = stage(size, feelings, { gap: 0.25 });
    const last = check(`${size} ${feelings.join('+')} one by one`, st);
    for (const tx of last.text) assert.ok(tx.replace('…', '').split(' ').length >= 3, `${size}: at least three words (${tx})`);
    st.L.destroy();
  }
});

test('layout gate: five at 390×844 (at once and one by one) — words clear of each other and every face', () => {
  for (const gap of [0, 0.25]) {
    for (const feelings of [['anger', 'sadness', 'overwhelm', 'anxiety', 'loneliness'], ['anger', 'anger', 'anger', 'anger', 'anger']]) {
      const st = stage('390x844', feelings, { gap });
      check(`390x844 five ${feelings[1]} gap ${gap}`, st);
      st.L.destroy();
    }
  }
});

test('layout: a roomy stage is not cut to three words — three thoughts at 375×812 show at least two lines', () => {
  const st = stage('375x812', ['anger', 'anger', 'anger']);
  const last = check('375 anger×3', st);
  assert.ok(last.crowd <= 2, `crowd ${last.crowd}`);
  for (const tx of last.text) assert.ok(tx.replace('…', '').split(' ').length >= 4, `more than three words: ${tx}`);
  st.L.destroy();
});

test('layout: no timed rearrangement — after the last arrival no home jumps (≤ 25 px) for 12 s', () => {
  const st = stage('390x844', ['anger', 'sadness', 'overwhelm', 'anxiety', 'frustration'], { gap: 0.25, seconds: 14 });
  const fr = st.log.frames.filter((f) => f.t >= st.log.lastAdd + 2);
  for (let k = 1; k < fr.length; k++) {
    fr[k].homes.forEach((p, i) => {
      const d = Math.hypot(p[0] - fr[k - 1].homes[i][0], p[1] - fr[k - 1].homes[i][1]);
      assert.ok(d <= 25, `${i} jumped ${d.toFixed(0)} px at ${fr[k].t.toFixed(2)} s`);
    });
  }
  st.L.destroy();
});
