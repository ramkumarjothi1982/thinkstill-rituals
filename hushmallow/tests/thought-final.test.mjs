// Thought Mallows — the final review round (B2, B4, B5 and the two blocking notes), at the root:
//   * B2: a plate takes the place planned for it when its thought comes to rest and keeps it — no hop a
//     second after release; the planner scores plates where the runtime will really show them; a lonely
//     thought's drift never displaces a resting plate.
//   * flight: words wait, hidden, while their thought is on its way and fade in at its resting place; words
//     that must move fade out where they are first — a shown plate never covers another or a face.
//   * B4: every mouth is level (corners within 1 px) at every relief, and a smile (curve > 0.2) only ever
//     comes with eyes drawn at least 0.6 closed — no sly charm, no "-‿-".
//   * B5: a lonely thought drifts away from the hero (the gap between them grows ≥ 25 px) or, with no room,
//     farther away where it is (its drift depth rises ≥ 0.15); never nearer.
//   * excerpts: a cut never drops just a short last word ("I'm not good…" for "I'm not good enough.").
// A stand-in DOM lays the word tags out as Chromium does (as in thought-layout.test.mjs: HM Nunito Sans
// 17 px ≈ 8.3 px a character on 22.1 px lines, 16 px ≈ 7.85 px on 20.8 px lines at ≤ 360 px), and the
// touch-lab's stages are replayed (its bounds and hero rects per phone size and count).
// Run: node --test hushmallow/tests/thought-final.test.mjs
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

const { ThoughtLayer, createThought, createBelief, PROPS, THOUGHT_KINDS, mouthGeom, eyeShut, MOUTH_TILT } = await import('../src/mallows/thought/index.js');

// ------------------------------------------------------------ the lab's stages --
// measured in touch-lab.html?tab=thoughts: the stage band and Glitzi's body rect, for 1 … 5 thoughts
const STAGES = {
  '390x844': { bounds: { left: 20, top: 76, right: 370, bottom: 601 }, hero: [[86.3, 363.1, 303.7, 581.9], [86.3, 363, 303.7, 581.9], [86.3, 362.8, 303.7, 581.9], [108.8, 410.6, 281.2, 584.6], [116.3, 426.4, 273.7, 585.5]] },
  '375x812': { bounds: { left: 20, top: 76, right: 355, bottom: 569 }, hero: [[82.3, 341.2, 292.7, 550.4], [82.2, 341.3, 292.8, 550.4], [82.2, 341.4, 292.8, 550.4], [105.7, 391.2, 269.3, 553.2], [113.2, 407.1, 261.8, 554.1]] },
  '320x568': { bounds: { left: 20, top: 20, right: 300, bottom: 396 }, hero: [[70.9, 199.1, 249.1, 379.3], [81.2, 221.7, 238.8, 380.5], [90.7, 242, 229.3, 381.7], [98.1, 258.1, 221.9, 382.6], [100.1, 262.5, 219.9, 382.8]] },
};
const TEXTS = ['My boss embarrassed me today.', "I'm not good enough.", 'What if they think I am useless?', 'Nobody texted me back', 'Everyone saw me freeze in that meeting', 'Nothing I do is ever right'];
const ov = (a, b) => { const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return x > 0 && y > 0 ? x * y : 0; };
const gapOf = (a, b) => Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));
const plate = (tg) => ({ left: tg.x - tg.w / 2, top: tg.y, right: tg.x + tg.w / 2, bottom: tg.y + tg.h });

// a lab stage: thoughts released as touch-lab.html does (all at once, or one at a time `gap` s apart), each
// frame handed to `each(L, t, hero)`
function stage(size, feelings, { gap = 0, seconds = 15, texts = TEXTS, seed = null, each = null } = {}) {
  const [W, H] = size.split('x').map(Number);
  VIEW.W = W; VIEW.H = H;
  const S = STAGES[size], n = feelings.length;
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
  const rad = W < 360 ? 32 : 38;
  let t = 0;
  const adds = [];
  const run = (sec) => { for (let i = 0, k = Math.round(sec * 60); i < k; i++) { L.frame(1 / 60); t += 1 / 60; each?.(L, t, hero); } };
  for (let i = 0; i < n; i++) {
    if (gap) { heroFor(i + 1); heroR(); }
    adds.push(t);
    L.add({ text: texts[i % texts.length], emotion: feelings[i], intensity: 0.75, r: rad, ...(seed != null ? { seed: seed * 7919 + i * 104729 } : {}) },
      { from: { x: r.cx, y: r.top + r.height * 0.2 }, home: gap ? wish(i, i + 1) : wish(i, n) });
    if (gap && i < n - 1) run(gap);
  }
  const last = t;
  run(seconds);
  return { L, hero, adds, last, t: () => t };
}

// ------------------------------------------------------------------- B2 --
test('B2: angry + sad released together at 320×568, 20 seeds — every plate keeps its ci and side from first shown to 15 s', () => {
  const bad = [];
  for (let seed = 1; seed <= 20; seed++) {
    const first = new Map(), texts = TEXTS.slice(seed % TEXTS.length).concat(TEXTS.slice(0, seed % TEXTS.length));
    const { L } = stage('320x568', ['anger', 'sadness'], { seed, texts, seconds: 15, each: (L, t) => {
      for (const th of L.list) {
        const tg = L.tags.get(th);
        if (!tg.shown) continue;
        const f = first.get(th);
        if (!f) first.set(th, { ci: tg.ci, side: tg.side, t });
        else if (f.ci !== tg.ci || f.side !== tg.side) { bad.push(`seed ${seed} ${th.emotion}: ci ${f.ci}→${tg.ci} ${f.side}→${tg.side} at ${t.toFixed(2)} s`); first.set(th, { ci: tg.ci, side: tg.side, t }); }
      }
    } });
    assert.equal(first.size, 2, `seed ${seed}: both plates shown`);
    L.destroy();
  }
  assert.deepEqual(bad, [], 'no plate re-placed itself');
});

test('B2: three thoughts at once at 320, 375 and 390 — planned places are kept at rest; homes still; nothing on a plate, a face or the hero', () => {
  const sets = [['anger', 'anger', 'anger'], ['sadness', 'sadness', 'sadness'], ['overwhelm', 'overwhelm', 'overwhelm'], ['embarrassment', 'embarrassment', 'embarrassment'], ['anger', 'sadness', 'overwhelm'], ['loneliness', 'embarrassment', 'overwhelm']];
  for (const size of ['320x568', '375x812', '390x844']) {
    for (const feelings of sets) {
      const name = `${size} ${feelings.join('+')}`;
      const first = new Map(), homes = new Map();
      let worst = 0, hops = [];
      const { L } = stage(size, feelings, { seconds: 15, each: (L, t, hero) => {
        const shown = [];
        for (const th of L.list) {
          const tg = L.tags.get(th);
          if (!tg.shown) continue;
          const f = first.get(th);
          if (!f) first.set(th, tg.ci); else if (f !== tg.ci) { hops.push(`${th.emotion} ${f}→${tg.ci} at ${t.toFixed(2)}`); first.set(th, tg.ci); }
          shown.push([th, plate(tg)]);
        }
        if (t < 3) return;
        for (const th of L.list) if (!homes.has(th) && th.emotion !== 'loneliness') homes.set(th, { x: th.home.x, y: th.home.y });
        for (let i = 0; i < shown.length; i++) {
          const [a, pa] = shown[i];
          worst = Math.max(worst, ov(pa, hero));
          for (let j = i + 1; j < shown.length; j++) worst = Math.max(worst, ov(pa, shown[j][1]));
          for (const th of L.list) { worst = Math.max(worst, ov(pa, th.faceRect({}))); for (const s of th.siblings) worst = Math.max(worst, ov(pa, s.faceRect({}))); }
        }
      } });
      assert.deepEqual(hops, [], `${name}: plates kept their places`);
      assert.ok(worst < 1, `${name}: at rest a plate covers ${worst.toFixed(1)} px²`);
      for (const [th, h] of homes) assert.ok(Math.hypot(th.home.x - h.x, th.home.y - h.y) <= 2, `${name}: ${th.emotion} moved at rest`);
      L.destroy();
    }
  }
});

test('B2: a lonely thought drifting never displaces a resting plate (lonely, embarrassed, overthinking one by one at 390, four seeds)', () => {
  for (let seed = 1; seed <= 4; seed++) {
    const seen = new Map(), changes = [];
    const { L, last } = stage('390x844', ['loneliness', 'embarrassment', 'overwhelm'], { gap: 2.5, seed, seconds: 15, each: (L, t) => {
      for (const th of L.list) {
        const tg = L.tags.get(th);
        if (!tg.shown || t < 6.5) continue;      // (from 1.5 s after the last thought was released)
        const c = seen.get(th);
        if (c == null) seen.set(th, tg.ci); else if (c !== tg.ci) { changes.push(`seed ${seed} ${th.emotion} ${c}→${tg.ci} at ${t.toFixed(2)} s`); seen.set(th, tg.ci); }
      }
    } });
    assert.ok(last > 4.9);
    assert.deepEqual(changes, [], 'no plate moved for the drift');
    L.destroy();
  }
});

// --------------------------------------------------------------- flight --
test('flight: words wait, hidden, while their thought is on its way; a shown plate never covers another, a resting face or the hero', () => {
  for (const size of ['320x568', '375x812', '390x844']) {
    for (const [gap, feelings] of [[0, ['anger', 'sadness', 'overwhelm']], [2.4, ['anger', 'sadness', 'overwhelm']], [2.4, ['overwhelm', 'overwhelm', 'overwhelm']], [2.4, ['embarrassment', 'embarrassment', 'embarrassment']]]) {
      let travelShown = 0, worst = 0, moved = 0, cameIn = 0;
      const prev = new Map(), hid = new Map();
      const { L } = stage(size, feelings, { gap, seconds: 4, each: (L, t, hero) => {
        const shown = [];
        for (const th of L.list) {
          const tg = L.tags.get(th);
          if (tg.mode >= 2 && tg.shown) travelShown++;
          // (hidden words fade out where they were: they never travel while they can still be seen)
          const p = prev.get(th);
          if (p && !tg.shown && hid.get(th) && tg.fade > 0 && (Math.abs(p.x - tg.x) + Math.abs(p.y - tg.y) > 0.01)) moved++;
          // (words coming in start at their resting place, never gliding in from where they faded out)
          if (tg.shown && hid.get(th) && Math.abs(tg.x - tg.tx) + Math.abs(tg.y - tg.ty) > 0.5) cameIn++;
          prev.set(th, { x: tg.x, y: tg.y }); hid.set(th, !tg.shown);
          if (tg.shown) shown.push(plate(tg));
        }
        for (let i = 0; i < shown.length; i++) {
          worst = Math.max(worst, ov(shown[i], hero));
          for (let j = i + 1; j < shown.length; j++) worst = Math.max(worst, ov(shown[i], shown[j]));
          for (const th of L.list) { if (th._trav) continue; worst = Math.max(worst, ov(shown[i], th.faceRect({}))); for (const sb of th.siblings) worst = Math.max(worst, ov(shown[i], sb.faceRect({}))); }
        }
      } });
      const name = `${size} ${feelings.join('+')} gap ${gap}`;
      assert.equal(travelShown, 0, `${name}: no words shown on the way`);
      assert.equal(moved, 0, `${name}: fading words stay put`);
      assert.equal(cameIn, 0, `${name}: words come in where they rest`);
      assert.ok(worst < 1, `${name}: a shown plate covered ${worst.toFixed(1)} px²`);
      L.destroy();
    }
  }
});

// ------------------------------------------------------------------- B5 --
test('B5: lonely thoughts (alone, three at once, mixed) at 320, 375 and 390 drift away from the hero or farther away — never nearer', () => {
  const cases = { alone: ['loneliness'], three: ['loneliness', 'loneliness', 'loneliness'], mixed: ['anger', 'loneliness', 'sadness'] };
  const out = [];
  for (const size of ['320x568', '375x812', '390x844']) {
    for (const [cn, feelings] of Object.entries(cases)) {
      const track = new Map();
      const { L } = stage(size, feelings, { seconds: 11.5, each: (L, t, hero) => {
        for (const th of L.list) {
          if (th.emotion !== 'loneliness') continue;
          const g = gapOf(th.bodyRect(), hero);
          let k = track.get(th);
          if (t >= 1.5 && !k) track.set(th, k = { g0: g, z0: th._zDrift, gMin: g, g: g, z: th._zDrift });
          if (k) { k.gMin = Math.min(k.gMin, g); k.g = g; k.z = th._zDrift; k.gMax = Math.max(k.gMax ?? g, g); }
        }
      } });
      for (const [th, k] of track) {
        const name = `${size} ${cn} #${L.list.indexOf(th)}`;
        out.push(`${name}: gap ${k.g0.toFixed(0)} → ${k.g.toFixed(0)} px, drift depth +${(k.z - k.z0).toFixed(2)}`);
        assert.ok(k.gMin > k.g0 - 2, `${name}: never nearer the hero (gap ${k.g0.toFixed(0)} → min ${k.gMin.toFixed(0)})`);
        assert.ok(k.gMax - k.g0 >= 25 || k.z - k.z0 >= 0.15, `${name}: away (gap +${(k.gMax - k.g0).toFixed(0)} px, depth +${(k.z - k.z0).toFixed(2)})`);
      }
      L.destroy();
    }
  }
  console.log(out.join('\n'));
});

// ------------------------------------------------------------------- B4 --
// every feeling and every belief prop, relief 0 … 1 in steps of 0.02 (through transform, and through calm —
// the stroked thought's way, calm decaying slowly): level mouths, and no smile before the eyes are closed
const BOUNDS = { left: 16, top: 64, right: 374, bottom: 820 };
function faceSweep(th, via) {
  const bad = [];
  let T = 100;
  const env = { now: T, view: { W: 390, H: 844 }, bounds: BOUNDS, rm: false, low: false };
  const step = (n) => { for (let i = 0; i < n; i++) { T += 1 / 60; env.now = T; th.step(1 / 60, env); } };
  step(90);
  for (let r = 0; r <= 1.0001; r += 0.02) {
    if (via === 'transform') { th.levels.transform.goal = th.levels.transform.cur = r; }
    else th.earned.calm = Math.min(1, Math.pow(r / 0.82, 0.8));
    step(12);
    for (let k = 0; k < 4; k++) {
      step(3);
      const m = mouthGeom(th, 0, 0, false), f = th.look.face;
      const diff = m.open ? Math.abs(2 * m.orx * Math.sin(m.rot - (th.render.faceAng || 0))) : Math.abs(m.pts[1] - m.pts[m.pts.length - 1]);
      if (diff >= 1) bad.push(`relief ${th.look.relief.toFixed(2)}: mouth corners ${diff.toFixed(2)} px apart`);
      if (f.curve > 0.2 && eyeShut(f, th.ov) < 0.6) bad.push(`relief ${th.look.relief.toFixed(2)}: smile ${f.curve.toFixed(2)} with eyes ${eyeShut(f, th.ov).toFixed(2)} closed`);
    }
  }
  return bad;
}
test('B4: every feeling and belief prop, relief 0 … 1 (step 0.02) — mouth corners level within 1 px; a smile only with eyes drawn ≥ 0.6 closed', () => {
  const bad = [];
  for (const via of ['transform', 'calm']) {
    for (const emotion of THOUGHT_KINDS) {
      const th = createThought({ text: "I'm not good enough.", emotion, intensity: 0.75, x: 200, y: 400, seed: 7 });
      for (const b of faceSweep(th, via)) bad.push(`${emotion} (${via}) ${b}`);
      th.destroy();
    }
    for (const prop of PROPS) {
      for (const emotion of [null, 'sadness']) {
        const th = createBelief({ text: "I'm not good enough.", prop, emotion, x: 200, y: 400, seed: 11 });
        for (const b of faceSweep(th, via)) bad.push(`belief ${prop}${emotion ? `/${emotion}` : ''} (${via}) ${b}`);
        th.destroy();
      }
    }
  }
  assert.deepEqual(bad.slice(0, 12), [], `${bad.length} faces out of rule`);
  assert.ok(MOUTH_TILT <= 0.03);
});

test('B4: the charm belief explored 0 … 0.7 — level mouth, a soft curve (≤ 0.15), its gaze down at the charm, not to one side', () => {
  for (const ex of [0, 0.2, 0.4, 0.55, 0.7]) {
    const b = createBelief({ text: "I'm not good enough.", prop: 'charm', x: 200, y: 400, explored: ex, seed: 3 });
    let T = 100;
    const env = { now: T, view: { W: 390, H: 844 }, bounds: BOUNDS, rm: false, low: false };
    for (let i = 0; i < 180; i++) { T += 1 / 60; env.now = T; b.step(1 / 60, env); }
    const m = mouthGeom(b), f = b.look.face;
    assert.ok(!m.open);
    const diff = Math.abs(m.pts[1] - m.pts[m.pts.length - 1]);
    assert.ok(diff < 1, `explored ${ex}: corners ${diff.toFixed(2)} px apart (body tilt ${b.render.ang.toFixed(2)})`);
    assert.ok(f.curve <= 0.15, `explored ${ex}: curve ${f.curve.toFixed(2)}`);
    assert.ok(Math.abs(f.lookX) < 0.05 && f.lookY > 0.2, `explored ${ex}: gaze ${f.lookX.toFixed(2)}, ${f.lookY.toFixed(2)}`);
    b.destroy();
  }
});

test('B4: a world\'s tilt still turns the whole face, mouth included (only the jelly\'s own lean is kept off it)', () => {
  const th = createThought({ text: 'Nobody texted me back', emotion: 'neutral', x: 200, y: 400, seed: 5 });
  let T = 100;
  const env = { now: T, view: { W: 390, H: 844 }, bounds: BOUNDS, rm: false, low: false };
  for (let i = 0; i < 90; i++) { T += 1 / 60; env.now = T; th.rot = 0.3; th.step(1 / 60, env); }
  const m = mouthGeom(th), a = Math.atan2(m.pts[m.pts.length - 1] - m.pts[1], m.pts[m.pts.length - 2] - m.pts[0]);
  assert.ok(Math.abs(a - 0.3) <= MOUTH_TILT + 0.01, `mouth turned ${a.toFixed(3)} with the world's 0.3`);
  th.destroy();
});

// ------------------------------------------------------------- excerpts --
test('excerpts: a cut never leaves out just a short last word (or a quarter of the words or less) — the plate widens or takes a line', () => {
  for (const W of [320, 390]) {
    VIEW.W = W; VIEW.H = W === 320 ? 568 : 844;
    const L = new ThoughtLayer({ bounds: () => ({ left: 20, top: 20, right: W - 20, bottom: VIEW.H - 100 }), tagRoot: document.body, reducedMotion: false });
    const cases = [["I'm not good enough.", true], ['Nobody texted me back', true], ['I said the wrong thing again', false], ['Nothing I do is ever right and nobody notices', false], ['What if they think I am useless?', false]];
    for (const [text, whole] of cases) {
      const th = L.add({ text, emotion: 'sadness', r: 32 }, { x: W / 2, y: 200, exact: true });
      const tg = L.tags.get(th);
      // the most crowded budget: one line on the narrowest plate
      const e = L._measure(th, tg, 1, L._tagMax(W, 4) - 26, W, 2);
      if (whole) assert.equal(e.text, text, `${W}: "${text}" shown whole (got "${e.text}")`);
      else {
        assert.ok(e.text.endsWith('…'), `${W}: a long one still cut: "${e.text}"`);
        const kept = e.text.slice(0, -1).split(' '), all = text.split(' ');
        assert.deepEqual(kept, all.slice(0, kept.length), 'an exact word prefix');
        const left = all.slice(kept.length).join(' ');
        assert.ok(left.length > 8 && left.length > 0.25 * text.length, `never just a short tail left out ("${left}")`);
      }
      assert.ok(e.w <= Math.max(L._tagMax(W, 0), W - (W < 361 ? 28 : 40)) + 0.5, `${W}: plate ${e.w} px within the roomiest plate`);
      L.remove(th); th.destroy();
    }
    L.destroy();
  }
});
