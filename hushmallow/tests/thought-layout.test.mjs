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
  '390x844': { bounds: { left: 20, top: 76, right: 370, bottom: 601 }, hero: [[86.3, 363.1, 303.7, 581.9], [86.3, 363, 303.7, 581.9], [86.3, 362.8, 303.7, 581.9], [108.8, 410.6, 281.2, 584.6], [116.3, 426.4, 273.7, 585.5]] },
  '375x812': { bounds: { left: 20, top: 76, right: 355, bottom: 569 }, hero: [[82.3, 341.2, 292.7, 550.4], [82.2, 341.3, 292.8, 550.4], [82.2, 341.4, 292.8, 550.4], [105.7, 391.2, 269.3, 553.2], [113.2, 407.1, 261.8, 554.1]] },
  '430x932': { bounds: { left: 20, top: 76, right: 410, bottom: 689 }, hero: [[93.6, 430.5, 336.4, 668.5], [93.6, 430.7, 336.4, 668.5], [93.5, 430.7, 336.5, 668.5], [113.2, 471.6, 316.8, 670.9], [122.2, 490.5, 307.8, 672]] },
  '320x568': { bounds: { left: 20, top: 20, right: 300, bottom: 396 }, hero: [[70.9, 199.1, 249.1, 379.3], [81.2, 221.7, 238.8, 380.5], [90.7, 242, 229.3, 381.7], [98.1, 258.1, 221.9, 382.6], [100.1, 262.5, 219.9, 382.8]] },
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
  return { t, pp, pf, ph, crowd: L.crowding, homes: list.map((th) => [th.home.x, th.home.y]), ci: list.map((th) => L.tags.get(th)?.ci), tags: list.map((th) => { const tg = L.tags.get(th); return tg ? [tg.x, tg.y] : null; }), text: list.map((th) => L.tagText(th)), emo: list.map((th) => th.emotion) };
}
// at rest: from 2 s after the last thought was released (it has flown out of the hero and settled)
const atRest = (log) => log.frames.filter((f) => f.t >= log.lastAdd + 2);
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
  // and the words stay where they are, at every sample (never sliding to and fro between two places)
  for (const f of rest) f.tags.forEach((q, i) => {
    if (a.emo[i] === 'loneliness' || !q || !a.tags[i]) return;
    const d = Math.hypot(q[0] - a.tags[i][0], q[1] - a.tags[i][1]);
    assert.ok(d <= 25, `${name}: ${i}'s words moved ${d.toFixed(0)} px at rest (t ${f.t.toFixed(2)})`);
  });
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

test('layout gate: the same stages with other words (other seeds, other plate sizes)', () => {
  const sets = [['sadness', 'sadness'], ['anger', 'overwhelm'], ['anger', 'anger', 'anger'], ['anger', 'sadness', 'overwhelm'], ['frustration', 'loneliness', 'embarrassment'], ['restlessness', 'anxiety', 'neutral']];
  for (const rot of [1, 2]) {
    const texts = TEXTS.slice(rot).concat(TEXTS.slice(0, rot));
    for (const size of ['320x568', '375x812', '390x844', '430x932']) {
      for (const feelings of sets) {
        const st = stage(size, feelings, { texts });
        check(`${size} ${feelings.join('+')} (texts +${rot})`, st);
        st.L.destroy();
      }
    }
  }
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

// -------------------------------------------------------------- the rest of r3 --
const run = (L, sec) => { for (let i = 0, k = Math.round(sec * 60); i < k; i++) L.frame(1 / 60); };
function layer390(extra = {}) {
  VIEW.W = 390; VIEW.H = 844;
  const S = STAGES['390x844'], h = S.hero[1], hero = { left: h[0], top: h[1], right: h[2], bottom: h[3] };
  return { L: new ThoughtLayer({ bounds: () => S.bounds, keepOut: () => hero, reducedMotion: false, tagRoot: document.body, ...extra }), S, hero };
}

test('siblings pulled free: kept inside the bounds by their own box, out of the main thought\'s extent, and never under the words (B3)', () => {
  const { L, S } = layer390();
  const ov3 = L.add({ text: 'What if they think I am useless?', emotion: 'overwhelm', intensity: 0.75, r: 38 }, { from: { x: 195, y: 400 }, home: { x: 110, y: 200 } });
  const an = L.add({ text: 'My boss embarrassed me today.', emotion: 'anger', intensity: 0.75, r: 38 }, { from: { x: 195, y: 400 }, home: { x: 290, y: 200 } });
  run(L, 3);
  // dragged off the right edge and let go (as a carry leaves it): it comes back into view
  const s = ov3.siblings[0];
  s.free = true; s.home.x = VIEW.W + 30; s._pos.x = VIEW.W + 30; s.home.y = 300; s._pos.y = 300;
  run(L, 3);
  const b = s.bodyRect();
  assert.ok(b.right <= S.bounds.right + 1 && b.left >= S.bounds.left - 1, `free sibling in bounds: ${b.left.toFixed(0)}–${b.right.toFixed(0)}`);
  const ex = ov3.extent({});
  assert.ok(ex.right < b.left || ex.left > b.right || ex.bottom < b.top || ex.top > b.bottom, 'no longer part of its thought\'s extent');
  // put down right on the anger thought's words: the words and the sibling end up apart
  const tg = L.tags.get(an);
  const s2 = ov3.siblings[1];
  s2.free = true; s2.home.x = s2._pos.x = tg.x; s2.home.y = s2._pos.y = tg.y + tg.h / 2;
  run(L, 4);
  const q = s2.bodyRect(), pl = { left: tg.x - tg.w / 2, top: tg.y, right: tg.x + tg.w / 2, bottom: tg.y + tg.h };
  assert.equal(Math.round(ov(q, pl)), 0, 'the words are clear of a sibling pulled free');
  const rs = L.rects();
  assert.ok(rs.some((r) => r.id === `${ov3.id}~${s2.index}`), 'subtitles keep clear of it too');
  L.destroy();
});

test('loneliness on a stage: a drift you can see into its own free room, away from the hero, words clear (B5)', () => {
  const { L, hero } = layer390();
  const lo = L.add({ text: 'Nobody texted me back', emotion: 'loneliness', intensity: 0.75, r: 38 }, { from: { x: 195, y: 400 }, home: { x: 200, y: 230 } });
  const other = L.add({ text: 'My boss embarrassed me today.', emotion: 'anger', intensity: 0.75, r: 38 }, { from: { x: 195, y: 400 }, home: { x: 100, y: 150 } });
  run(L, 1.5);
  // (final-round review B5: away means the gap between its body and the hero grows — a drift sideways
  // across the top of the hero is not away. Here the other thought and its words fill the room above it,
  // so it may not drift far: then it goes farther away where it is — smaller, a little higher)
  const gap = () => { const b = lo.bodyRect(), dx = Math.max(0, hero.left - b.right, b.left - hero.right), dy = Math.max(0, hero.top - b.bottom, b.top - hero.bottom); return Math.hypot(dx, dy); };
  const h0 = { x: lo.home.x, y: lo.home.y }, z0 = lo.z, zd0 = lo._zDrift, g0 = gap();
  let worst = 0, gMin = Infinity;
  for (let k = 0; k < 9 * 4; k++) {
    run(L, 0.25);
    const tl = L.tags.get(lo), to = L.tags.get(other);
    const a = { left: tl.x - tl.w / 2, top: tl.y, right: tl.x + tl.w / 2, bottom: tl.y + tl.h }, c = { left: to.x - to.w / 2, top: to.y, right: to.x + to.w / 2, bottom: to.y + to.h };
    worst = Math.max(worst, ov(a, c), ov(a, other.faceRect({})), ov(c, lo.faceRect({})));
    gMin = Math.min(gMin, gap());
  }
  const d = Math.hypot(lo.home.x - h0.x, lo.home.y - h0.y);
  assert.ok(d <= 92, `drifted ${d.toFixed(0)} px`);
  // apart: never nearer the hero, nor the other thought; 25 px farther from the hero, or (no room) farther away
  const o = other.home, dOther = Math.hypot(lo.home.x - o.x, lo.home.y - o.y) - Math.hypot(h0.x - o.x, h0.y - o.y);
  assert.ok(gMin > g0 - 2 && dOther > -2, `drifted apart: gap to the hero ${g0.toFixed(0)} → ≥ ${gMin.toFixed(0)} px, the other +${dOther.toFixed(0)} px`);
  assert.ok(gap() - g0 >= 25 || lo._zDrift - zd0 >= 0.15, `away: gap +${(gap() - g0).toFixed(0)} px, drift depth +${(lo._zDrift - zd0).toFixed(2)}`);
  assert.ok(lo.z > z0 + 0.08, `a little farther away (z ${z0.toFixed(2)} → ${lo.z.toFixed(2)})`);
  assert.equal(Math.round(worst), 0, 'its words and the other\'s stay clear as it drifts');
  L.destroy();
});

test('the reader: read(null) is harmless; it opens clear of the thought, and pause() / release() close it (polish 4, 11)', () => {
  const { L } = layer390();
  assert.doesNotThrow(() => { L.read(undefined); L.read(null); L.read({ text: 'not on this layer' }); });
  assert.equal(L.reading, false);
  const th = L.add({ text: 'I said the wrong thing again', emotion: 'sadness', intensity: 0.75, r: 38 }, { from: { x: 195, y: 400 }, home: { x: 200, y: 160 } });
  run(L, 3);
  L.read(th);
  assert.equal(L.reading, true);
  const top = parseFloat(L._readEl.style.top), r = L.rects().find((q) => q.id === th.id);
  assert.ok(Number.isFinite(top) && (top >= r.bottom || top + (L._readEl.offsetHeight || 160) <= r.top), `reader at ${top}, thought ${r.top.toFixed(0)}–${r.bottom.toFixed(0)}`);
  L.pause(true);
  assert.equal(L.reading, false, 'pause closes it');
  L.resume(); L.read(th); L.release(10);
  assert.equal(L.reading, false, 'release closes it');
  L.destroy();
});

test('words on their way are untouchable and wait off the hero; at rest they sit on whole device pixels, untilted (polish 1, 6)', () => {
  const { L, hero } = layer390();
  const th = L.add({ text: 'Everyone saw me freeze in that meeting', emotion: 'anxiety', intensity: 0.75, r: 38 }, { from: { x: 195, y: 380 }, home: { x: 260, y: 200 } });
  const tg = L.tags.get(th);
  let travelSeen = false, onHero = 0;
  for (let i = 0; i < 40; i++) {
    L.frame(1 / 60);
    if (tg.el.classList.contains('tm-travel')) travelSeen = true;
    if (tg.shown) onHero = Math.max(onHero, ov({ left: tg.x - tg.w / 2, top: tg.y, right: tg.x + tg.w / 2, bottom: tg.y + tg.h }, hero));
  }
  assert.ok(travelSeen, 'tm-travel (pointer-events: none) while it flies');
  assert.equal(Math.round(onHero), 0, 'never shown over the hero');
  run(L, 4);
  assert.ok(!tg.el.classList.contains('tm-travel') && !tg.el.classList.contains('tm-move'), 'at rest: touchable, no will-change');
  const m = /^translate\(([-\d.]+)px,([-\d.]+)px\)$/.exec(tg.el.style.transform);
  assert.ok(m, `a plain 2D translate at rest: ${tg.el.style.transform}`);
  for (const v of [+m[1], +m[2]]) assert.ok(Math.abs(v * 2 - Math.round(v * 2)) < 1e-6, `${v} sits on a device pixel (dpr 2)`);
  L.destroy();
});

test('canvasGL only: an overlay 2D canvas is laid just above it (polish 13)', () => {
  const host = document.createElement('div'), gl = document.createElement('canvas');
  host.appendChild(gl);
  const warn = console.warn; let warned = 0; console.warn = () => { warned++; };
  const L = new ThoughtLayer({ canvasGL: gl, tagRoot: document.body });
  console.warn = warn;
  assert.equal(warned, 1, 'it says so once');
  assert.equal(host.children[1], L.canvas, 'the overlay sits right after the GL canvas');
  assert.ok(L.canvas !== gl && L.own, 'it draws on its own canvas');
  assert.match(L.canvas.style.cssText, /pointer-events:none/);
  L.destroy();
  assert.equal(host.children.length, 1, 'and takes it away when destroyed');
});

test('a lone thought on a small home stage (320×568): two lines when the first line alone would cut the person\'s words to a few (final main polish)', () => {
  VIEW.W = 320; VIEW.H = 568;
  // (the Hushfold's home stage at 320×568 after Send: the hero above, the thought's room down to the dock)
  const hero = { left: 30, top: 235, right: 230, bottom: 430 };
  const L = new ThoughtLayer({ bounds: () => ({ left: 10, right: 310, top: 188, bottom: 500 }), keepOut: () => hero, reducedMotion: false, tagRoot: document.body });
  const text = 'I\'m so angry my boss ignored me again';
  const th = L.add({ text, emotion: 'angry', intensity: 0.75, r: 32 }, { from: { x: 130, y: 280 }, home: { x: 263, y: 470 } });
  for (let i = 0; i < 60 * 6; i++) L.frame(1 / 60);
  const tg = L.tags.get(th);
  assert.equal(tg.text, text, `all of the words show (${JSON.stringify(tg.text)}, ${tg.cur?.lines} lines, crowd ${L.crowd})`);
  assert.ok(tg.cur.lines >= 2);
  const r = L.tagRect(th);
  assert.ok(r && !(r.left < hero.right && r.right > hero.left && r.top < hero.bottom && r.bottom > hero.top), `clear of the hero: ${JSON.stringify(r)}`);
  // a second thought: the plan's places are theirs again (the extra line goes when the stage is planned anew)
  L.add({ text: 'my sister forgot my birthday again this year', emotion: 'sad', intensity: 0.6, r: 32 }, { from: { x: 130, y: 280 }, home: { x: 80, y: 470 } });
  for (let i = 0; i < 60 * 4; i++) L.frame(1 / 60);
  assert.equal(L.tags.get(th).up || 0, 0, 'no extra line with company');
  L.destroy();
  VIEW.W = 390; VIEW.H = 844;
});
