// Blubi's Raindrop Lagoon tests: the pure core (the feeling words, the screen layout, looking into a
// drop, naming, the discoveries and the completion rule) and a headless run of the world inside the
// director (a fake DOM): a drop held still clears, carried to the thought it names it, a second sits
// beside it, a third takes the oldest's place, a word can be given back; the lagoon finishes only
// after a quiet moment with a named feeling; a gentle session and reduced motion; a melt in from the
// ocean hands over the thought. Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cpuPerCall, within } from './helpers/cost.mjs'; // (before any hushmallow module: its calibration runs first)
import { LAGOON, TIP, VOCAB, UNSURE, feelingWords, tagRows, planLagoon, defaultMallowBox, createFocus, createNaming, createNamingDetector, createLagoonProgress } from '../src/hushfold/flow/worlds/raindrop-lagoon-core.js';
import { RAINDROP_LAGOON } from '../src/hushfold/flow/worlds/raindrop-lagoon.js';
import { createRegistry, WORLDS, STATUS, REQUIRED_FIELDS, missingFields, isPlayable } from '../src/hushfold/flow/registry.js';
import { REALM_HORIZON } from '../src/world/realm.js';
import { SKILLS } from '../src/hushfold/skills.js';

const DT = 1 / 60;
const SIZES = [[390, 844], [360, 780], [320, 568], [375, 667], [430, 932], [1280, 800], [844, 390], [768, 1024]];
const bandFor = (H) => ({ x: 0, y: 76, w: 0, h: Math.min(156, Math.max(118, Math.round(H * 0.17))) });
// (a long text shows its start on two lines, cut with "…", as the handles do)
const platePx = (text) => (maxW, lines) => { const tw = text.length * 8.6, inner = maxW - 24; let n = Math.ceil(tw / inner); if (n > lines && lines < 2) return null; n = Math.min(n, lines, 2); return { w: Math.ceil(Math.min(maxW, (n === 1 ? tw : inner) + 24)), h: Math.ceil(n * 21.25 + 16) }; };
const hits = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
// (a teardrop: its point reaches TIP × D above the round part)
const discBox = (d) => ({ x0: d.x - d.D / 2, y0: d.y - TIP * d.D, x1: d.x + d.D / 2, y1: d.y + d.D / 2 });

// ------------------------------------------------------------- registry --
test('entry: every §16 field, PLAYABLE in WORLDS (never DEV), the realm’s horizon, the name-it skill, honest lines', () => {
  assert.deepEqual(missingFields(RAINDROP_LAGOON), []);
  assert.ok(REQUIRED_FIELDS.every((k) => RAINDROP_LAGOON[k] != null));
  assert.equal(RAINDROP_LAGOON.status, STATUS.PLAYABLE, 'switched on (16 Oct), never DEV');
  assert.ok(isPlayable(RAINDROP_LAGOON));
  assert.equal(WORLDS.find((w) => w.id === 'raindrop-lagoon'), RAINDROP_LAGOON, 'the world file re-exports the registry’s own entry');
  assert.deepEqual(RAINDROP_LAGOON.next, ['sunpop-orchard']);
  assert.ok(!RAINDROP_LAGOON.final);
  assert.equal(RAINDROP_LAGOON.horizon, REALM_HORIZON['raindrop-lagoon']);
  assert.equal(RAINDROP_LAGOON.horizon, LAGOON.HORIZON);
  assert.equal(RAINDROP_LAGOON.mallow.id, 'blubi');
  assert.equal(RAINDROP_LAGOON.memory.skillId, 'name-it');
  assert.equal(SKILLS['name-it']?.world?.id, 'raindrop-lagoon');
  assert.equal(RAINDROP_LAGOON.discoveries.named.skillId, 'name-it');
  assert.equal(RAINDROP_LAGOON.discoveries.both.offer, false);
  assert.equal(RAINDROP_LAGOON.calm, false, 'a gentle session never plays it by itself');
  assert.equal(typeof RAINDROP_LAGOON.load, 'function');
  for (const [id, d] of Object.entries(RAINDROP_LAGOON.discoveries)) {
    assert.ok(d.lines.length >= 1 && d.lines.length <= 3, id);
    for (const l of d.lines) assert.ok(l.length <= 60, l);
  }
  const text = JSON.stringify([RAINDROP_LAGOON.dialogue, RAINDROP_LAGOON.discoveries]);
  assert.ok(!/\bAI\b/.test(text) && !/Hushmallow|HUSHMALLOW/.test(text));
  assert.ok(!/\b(cure|cures|treat|treats|guarantee)\b/i.test(text));
  assert.ok(!/\b(strike|burn|smash|explode)\b/i.test(JSON.stringify(RAINDROP_LAGOON)), 'no violent verbs (registry.js rule)');
  for (const l of [...RAINDROP_LAGOON.dialogue.gentle.intro, ...RAINDROP_LAGOON.dialogue.gentle.arrive]) assert.doesNotMatch(l, /storm|splash|!|haha|fun/i, l);
  // its load() is the world module
  return RAINDROP_LAGOON.load().then((m) => assert.equal(typeof m.create, 'function'));
});

// ------------------------------------------------------------- the words --
test('words: five closest feelings and “unsure”, always; stable indices; tag rows side by side', () => {
  for (const e of ['angry', 'frustrated', 'anxious', 'overwhelmed', 'sad', 'lonely', 'restless', 'other', 'nonsense']) {
    const w = feelingWords(e, 6);
    assert.equal(w.length, 6);
    assert.equal(w[w.length - 1], UNSURE, `${e}: unsure last`);
    assert.equal(new Set(w).size, 6, `${e}: no repeats`);
    for (const k of w) assert.ok(VOCAB[k], `${e}: ${k}`);
    assert.deepEqual(feelingWords(e, 4), [...w.slice(0, 3), UNSURE]);
  }
  assert.deepEqual(feelingWords('nonsense'), feelingWords('other'));
  assert.equal(VOCAB[UNSURE], 'unsure');
  assert.equal(VOCAB.indexOf('worry'), 9, 'append-only: saved indices keep their words');
  const worry = VOCAB.indexOf('worry'), tired = VOCAB.indexOf('tiredness');
  assert.deepEqual(tagRows([]), []);
  assert.deepEqual(tagRows([worry]), ['This is… worry']);
  assert.deepEqual(tagRows([worry, tired]), ['This is… worry · tiredness']);
  assert.deepEqual(tagRows([worry, tired], () => false), ['This is… worry', 'and tiredness']);
});

// ------------------------------------------------------------- layout --
test('layout: on every screen the drops, the thought, its words and its tag never overlap each other, the band, the hero or an edge', () => {
  for (const [W, H] of SIZES) {
    for (const [text, nPh] of [['My boss embarrassed me today.', 3], ['I keep thinking that everyone at work secretly thinks I am not good enough', 7], ['', 0]]) {
      const band = bandFor(H), mallow = defaultMallowBox(W, H);
      // (as the world plans: six drops, down to four where the screen is small)
      let p = null;
      const plan = () => { p = null; for (let n = 6; n >= 4 && !p?.fit; n--) p = planLagoon({ W, H, band, mallow, n, photos: nPh, thought: !!text, plate: text ? platePx(text) : null }); };
      // still one plan, read once (each screen's first plan is cold, as the world's is), but on this thread's CPU clock
      // (tests/helpers/cost.mjs): another test file's turn on a busy runner's core no longer lands in it (one read 253.6 ms).
      // One reading, never re-read, judged at the budget × this machine's factor
      const r = within(120, () => cpuPerCall(plan), 1);
      const tag = `${W}×${H} "${text.slice(0, 12)}" ${nPh}`;
      assert.ok(r.ok, `${tag}: planned in ${r.ms.toFixed(1)} ms of CPU; ${r.note}`);
      assert.ok(p.drops.length >= 4, `${tag}: at least four drops (${p.drops.length})`);
      assert.ok(p.D >= LAGOON.DROP_MIN && p.D <= LAGOON.DROP_MAX, `${tag}: D ${p.D} (≥ 44 px targets)`);
      const bandB = band.y + band.h;
      const items = [...p.drops, ...p.orbs];
      for (const d of items) {
        const b = discBox(d);
        assert.ok(b.x0 >= LAGOON.EDGE - 0.5 && b.x1 <= W - LAGOON.EDGE + 0.5, `${tag}: drop inside the sides ${JSON.stringify(d)}`);
        assert.ok(b.y0 >= bandB, `${tag}: drop under the band ${JSON.stringify(d)}`);
        assert.ok(b.y1 <= H - LAGOON.BOTTOM + 0.5, `${tag}: drop above the bottom strip`);
        assert.ok(!hits(b, p.K), `${tag}: drop off the hero ${JSON.stringify(d)}`);
        assert.ok(!hits(b, p.cluster, 4), `${tag}: drop off the thought, its words and tag ${JSON.stringify(d)}`);
      }
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        assert.ok(!hits(discBox(a), discBox(b), 4), `${tag}: drops ${i} and ${j} apart`);
      }
      // the thought cluster: under the band, inside the sides, never on the hero
      assert.ok(p.cluster.y0 >= bandB, `${tag}: thought under the band`);
      assert.ok(p.cluster.x0 >= LAGOON.EDGE - 0.5 && p.cluster.x1 <= W - LAGOON.EDGE + 0.5, `${tag}: thought inside the sides`);
      assert.ok(!hits(p.cluster, p.K), `${tag}: thought off the hero`);
      // (a phone on its side, 390 px tall, has no room for a planned plate beside the hero: the handle places its words itself)
      if (text && H >= 480) assert.ok(p.plate && p.plate.y1 <= p.thought.y - p.thought.r, `${tag}: the words above the thought`);
      assert.ok(p.tag.rows >= 1 && p.tag.h >= p.tag.rows * LAGOON.TAG_LINE, `${tag}: rows kept for the tag`);
      if (W >= 360 && H >= 640) assert.equal(p.tag.rows, 2, `${tag}: two rows on a phone`);
      assert.ok(!p.plate || !hits(p.plate, p.tag, 1), `${tag}: the tag never on the words`);
    }
  }
  // a side panel open: everything left of it
  const p = planLagoon({ W: 1280, H: 800, band: bandFor(800), mallow: defaultMallowBox(900, 800), freeW: 900, n: 6, photos: 3, plate: platePx('hello there') });
  for (const d of [...p.drops, ...p.orbs]) assert.ok(d.x + d.D / 2 <= 900 - LAGOON.EDGE + 0.5);
  assert.ok(p.cluster.x1 <= 900 - LAGOON.EDGE + 0.5);
  // deterministic
  assert.deepEqual(planLagoon({ W: 390, H: 844, band: bandFor(844), n: 6, plate: platePx('abc') }), planLagoon({ W: 390, H: 844, band: bandFor(844), n: 6, plate: platePx('abc') }));
});

// ---------------------------------------------------- looking into a drop --
test('focus: a still finger clears a drop in ~1.1 s; moving fogs it again until the word has come clear once; a tap reveals it', () => {
  const U = 390;
  const f = createFocus({ U });
  f.hold();
  let t = 0;
  while (!f.latched && t < 3) { f.update(DT, 0.02 * U); t += DT; }
  assert.ok(Math.abs(t - LAGOON.FOCUS_SEC) < 0.06, `cleared in ${t.toFixed(2)} s`);
  // once clear it can be carried (moving no longer fogs it)
  for (let k = 0; k < 60; k++) f.update(DT, 1.5 * U);
  assert.equal(f.k, 1);
  assert.ok(f.giveable);
  // half-clear, then a moving finger fogs it
  const g = createFocus({ U });
  g.hold();
  for (let k = 0; k < 36; k++) g.update(DT, 0);
  const half = g.k;
  assert.ok(half > 0.45 && half < 0.6, `half ${half}`);
  for (let k = 0; k < 30; k++) g.update(DT, 1.4 * U);
  assert.ok(g.k < half - 0.3, `fogged again: ${g.k}`);
  assert.ok(!g.giveable && !g.latched);
  // a gentle drift still counts as still; a scribble never clears it
  const s = createFocus({ U });
  s.hold();
  for (let k = 0; k < 240; k++) s.update(DT, 2 * U);
  assert.equal(s.k, 0);
  // let go before it is clear: it fogs over
  g.let(); for (let k = 0; k < 60; k++) g.update(DT, 0);
  assert.equal(g.k, 0);
  // a tap: clears by itself
  const q = createFocus({ U });
  q.tap(); let tt = 0;
  while (!q.latched && tt < 3) { q.update(DT, 0); tt += DT; }
  assert.ok(Math.abs(tt - LAGOON.TAP_REVEAL_SEC) < 0.06);
});

// ---------------------------------------------------------------- naming --
test('naming: two side by side; a third takes the oldest’s place; a word can be given back; indices only', () => {
  const n = createNaming();
  const [a, b, c] = [VOCAB.indexOf('worry'), VOCAB.indexOf('dread'), UNSURE];
  assert.deepEqual(n.add(a), { added: true, replaced: null });
  assert.deepEqual(n.add(a), { added: false, replaced: null }, 'the same word once');
  assert.deepEqual(n.add(b), { added: true, replaced: null });
  assert.deepEqual(n.list, [a, b]);
  assert.deepEqual(n.add(c), { added: true, replaced: a }, 'the oldest floats back');
  assert.deepEqual(n.list, [b, c]);
  assert.ok(n.remove(b) && !n.remove(b));
  assert.deepEqual(n.list, [c]);
  assert.equal(n.ever.length, 3);
  assert.deepEqual(n.add(-1).added, false); assert.deepEqual(n.add(999).added, false); assert.deepEqual(n.add('worry').added, false);
  const m = createNaming(); m.restore(JSON.parse(JSON.stringify(n.snapshot())));
  assert.deepEqual(m.list, [c]); assert.equal(m.ever.length, 3);
  m.restore({ l: [1, 1, 2, 3, 'x', 99], e: [] });
  assert.deepEqual(m.list, [1, 2], 'a tampered save keeps two valid words at most');
});

test('discoveries: “named” only for a word that was looked into, once; “both” for two at once', () => {
  const d = createNamingDetector();
  assert.equal(d.given({ looked: false, count: 1 }), null, 'never for a drop not looked into');
  const e = d.given({ looked: true, stillSec: 1.3, count: 1 });
  assert.equal(e.id, 'named'); assert.equal(e.evidence.stillSec, 1.3);
  assert.equal(d.given({ looked: true, count: 1 }), null, 'once');
  assert.equal(d.given({ looked: true, count: 2 })?.id, 'both');
  assert.equal(d.given({ looked: true, count: 2 }), null);
  const d2 = createNamingDetector(); d2.markFired('named');
  assert.equal(d2.given({ looked: true, count: 2 })?.id, 'both');
});

test('progress: monotonic, nothing by itself; complete only with a word kept, 8 s of quiet with it, 25 s of play and 2 s idle', () => {
  const p = createLagoonProgress();
  let last = 0;
  const run = (sec, m) => { let r; for (let t = 0; t < sec; t += DT) { r = p.update(DT, m); assert.ok(r.p >= last - 1e-9, 'monotonic'); last = r.p; } return r; };
  run(30, { down: false, named: 0 });
  assert.equal(last, 0, 'the rain does nothing by itself');
  p.touch(); run(1, { down: true });
  assert.ok(last > 0 && last < 0.1);
  p.look(); run(1, { down: true, holding: true });
  assert.equal(Math.round(last * 100), 20);
  p.name(1);
  let r = run(6, { down: false, named: 1 });
  assert.ok(!r.complete, 'not before 25 s of play');
  r = run(4, { down: false, holding: true, named: 1 });
  assert.ok(r.quiet < 6.1, 'a drop in hand is not quiet');
  r = run(20, { down: true, named: 1 });
  assert.ok(!r.complete, 'a finger still down');
  r = run(2.1, { down: false, named: 1 });
  assert.ok(r.complete && r.p === 1, `complete: quiet ${r.quiet}, played ${r.played}`);
  const s = p.snapshot(), q = createLagoonProgress(); q.restore(JSON.parse(JSON.stringify(s)));
  assert.ok(q.complete && q.p === 1);
  // a word given back before the quiet: no completion
  const z = createLagoonProgress(); z.touch(); z.look(); z.name(1);
  for (let t = 0; t < 40; t += DT) z.update(DT, { down: false, named: 0 });
  assert.ok(!z.complete, 'nothing kept, nothing finished');
});

// ------------------------------------------------------- headless world --
function installFakeDom() {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const noop = () => {};
  const ctx2d = (c) => new Proxy({
    canvas: c,
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 8.4 }), getTransform: () => ({ a: 1, e: 0 }),
  }, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => { const c = { style: {}, className: '', width: 0, height: 0, children: [], setAttribute() {}, append(...x) { this.children.push(...x); }, remove() {}, addEventListener() {}, removeEventListener() {}, clientWidth: 390, clientHeight: 844 }; c.getContext = () => ctx2d(c); return c; };
  globalThis.document = { createElement: () => el(), addEventListener() {}, removeEventListener() {}, hidden: false };
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return { el, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
const fakeMallow = (W, H) => {
  const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
  const r = { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B, bottom, width: B, height: B, cx: W / 2, cy: bottom - B / 2 };
  const m = { reacts: [], emotions: [], rect: () => r, bodyRect: () => r, react(k) { m.reacts.push(k); }, setEmotion(mix) { m.emotions.push(mix); }, lookAt() {} };
  return m;
};
const fakeThought = () => ({ id: 't', token: 'My boss embarrassed me today.', text: 'My boss embarrassed me today.', x: 0, y: 0, z: 0, scale: 1, r: 40, state: {}, reacts: [], react(k) { this.reacts.push(k); }, hitTest: () => false, pointer() {} });
const steps = (D, sec, dt = 1 / 30) => { for (let t = 0; t < sec; t += dt) D.debug.step(dt); };
/** Press a drop, hold still for `hold` s, carry it to (x1, y1), let go. */
function holdAndCarry(D, d, x1, y1, hold = 1.4, id = 1) {
  let t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x: d.x, y: d.y, t, pointerType: 'touch' });
  for (let s = 0; s < hold; s += 1 / 30) { t += 1000 / 30; D.debug.step(1 / 30); }
  const n = 20;
  for (let i = 1; i <= n; i++) { t += 1000 / 30; D.pointer({ type: 'move', id, x: d.x + ((x1 - d.x) * i) / n, y: d.y + ((y1 - d.y) * i) / n, t, pointerType: 'touch' }); D.debug.step(1 / 30); }
  D.pointer({ type: 'up', id, x: x1, y: y1, t: t + 16, pointerType: 'touch' });
  steps(D, 1);
}
function tap(D, x, y, id = 3) {
  const t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x, y, t, pointerType: 'touch' });
  D.debug.step(1 / 30);
  D.pointer({ type: 'up', id, x, y, t: t + 90, pointerType: 'touch' });
  D.debug.step(1 / 30);
}

test('world: hold a drop still and its word surfaces; carry it to the thought and it is named; two side by side; give one back; the quiet finishes it', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844;
    const mallow = fakeMallow(W, H), thought = fakeThought();
    const said = [], found = [], offers = [];
    const subtitles = { say(lines, o) { said.push({ lines: [].concat(lines), kind: o?.kind }); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {} };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, subtitles, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false, safeRect: () => ({ x: 20, y: 64, w: W - 40, h: 400 }) });
    D.on('discovery', (e) => found.push(e)); D.on('offer', (e) => offers.push(e));
    await D.start({ worldId: 'raindrop-lagoon', emotion: 'sad', intention: 'steady', intensity: 0.7 });
    const w = D.world;
    assert.ok(w, 'the lagoon started');
    steps(D, 3);
    assert.ok(said.some((s) => s.lines.includes('Oh… it’s raining a little.')), 'the intro line');
    assert.ok(w.metrics.rain > 0.5, `it rains: ${w.metrics.rain}`);
    const drops0 = w.debug.drops;
    assert.equal(drops0.length, 6);
    assert.ok(drops0.every((d) => d.state === 'hang'), 'the drops have formed');
    assert.equal(drops0[5].word, 'unsure');
    const T = w.debug.thought;
    assert.ok(Math.abs(T.x - T.home.x) < 4 && Math.abs(T.y - T.home.y) < 5, 'the thought hangs at its home');
    assert.ok(Math.abs(thought.x - T.x) < 0.01 && Math.abs(thought.y - T.y) < 0.01, 'the handle is driven');
    assert.equal(thought.labelSide, 'above');
    // a quick drag straight to the thought: not looked into, it floats back (and Blubi says to hold it still)
    const d0 = drops0[0];
    let t = D.debug.time * 1000;
    D.pointer({ type: 'down', id: 1, x: d0.x, y: d0.y, t, pointerType: 'touch' });
    for (let i = 1; i <= 6; i++) { t += 33; D.pointer({ type: 'move', id: 1, x: d0.x + ((T.x - d0.x) * i) / 6, y: d0.y + ((T.y - d0.y) * i) / 6, t, pointerType: 'touch' }); D.debug.step(1 / 30); }
    D.pointer({ type: 'up', id: 1, x: T.x, y: T.y, t: t + 16, pointerType: 'touch' });
    steps(D, 1);
    assert.deepEqual(w.metrics.named, [], 'a drop not looked into is never named');
    assert.ok(said.some((s) => s.lines.includes('Hold it still a moment.')), 'the fog line');
    assert.equal(found.length, 0);
    // hold it still: it clears; carry it to the thought: named
    const word0 = d0.word;
    holdAndCarry(D, w.debug.drops[0], T.x, T.y);
    assert.deepEqual(w.metrics.named, [word0], `named: ${w.metrics.named}`);
    assert.ok(found.some((e) => e.id === 'named' && e.skillId === 'name-it'), 'You gave it a word.');
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(offers.some((e) => e.skillId === 'name-it'), 'A Word for the Feeling is offered');
    assert.ok(w.debug.tag.words.some((x) => x.word === word0), 'the tag shows the word');
    assert.ok(thought.reacts.includes('sigh'));
    assert.ok(mallow.reacts.includes('comfort'), 'Blubi is comforted at the discovery');
    steps(D, 4);
    const rain1 = w.metrics.rain;
    assert.ok(rain1 < 0.55, `the rain eases: ${rain1}`);
    // a second word, side by side
    const d1 = w.debug.drops[1];
    holdAndCarry(D, d1, T.x, T.y);
    assert.deepEqual(w.metrics.named, [word0, d1.word]);
    assert.ok(found.some((e) => e.id === 'both'), 'Two at once.');
    assert.equal(offers.filter((e) => e.skillId === 'name-it').length, 1, 'offered once');
    // a third takes the oldest's place; the oldest floats back up
    const d5 = w.debug.drops[5];
    holdAndCarry(D, d5, T.x, T.y);
    assert.deepEqual(w.metrics.named, [d1.word, 'unsure']);
    steps(D, 2);
    assert.equal(w.debug.drops[0].state, 'hang', 'the oldest word hangs again');
    // tap a word on the tag: given back
    const tw = w.debug.tag.words.find((x) => x.word === d1.word);
    assert.ok(tw, 'the word is on the tag');
    tap(D, (tw.x0 + tw.x1) / 2, (tw.y0 + tw.y1) / 2);
    steps(D, 2);
    assert.deepEqual(w.metrics.named, ['unsure']);
    assert.ok(said.some((s) => s.lines.includes('That’s fine. Try another.')));
    // touching the water only rings it
    const p0 = w.progress;
    for (let k = 0; k < 4; k++) tap(D, 60 + 60 * k, 800, 4);
    assert.equal(w.progress, p0, 'the water is play, never progress');
    // the quiet with a named feeling finishes it
    assert.ok(!w.complete);
    steps(D, 30);
    assert.ok(w.complete, `complete: ${JSON.stringify(w.metrics)}`);
    assert.equal(D.state.complete, true);
    steps(D, 3);
    assert.ok(w.metrics.rain < 0.1, 'the rain has stopped');
    // it stays playable
    const dd = w.debug.drops.find((x) => x.state === 'hang');
    holdAndCarry(D, dd, T.x, T.y);
    assert.ok(w.metrics.named.includes(dd.word));
    // saved progress: ids and numbers only, small; it survives the sanitiser and a restore
    const { sanitizeState } = await import('../src/engine/flow-store.js');
    const st = w.serialize();
    assert.deepEqual(sanitizeState(st), st);
    assert.ok(JSON.stringify(st).length < 1024, `${JSON.stringify(st).length} chars`);
    assert.ok(!/boss|worry|sadness|unsure|tiredness|hurt/.test(JSON.stringify(st)), 'never words');
    assert.ok(w.restore(st));
    // the subtitle band is kept clear
    const band = D.subtitleBand();
    for (const r of w.avoid()) if (r.kind !== 'finger') assert.ok(r.y >= band.y + band.h - 1, `${r.kind} under the band`);
    // the handoff: where things are, for the next world
    const h = w.handoff();
    assert.ok(Math.abs(h.thought.x - w.debug.thought.x) < 1 && h.horizonY === Math.round(H * 0.6));
  } finally { D?.destroy(); dom.restore(); }
});

test('world: a tap reveals a drop; tapping the thought gives it; tapping elsewhere lets it float back', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 360, H = 780, mallow = fakeMallow(W, H), thought = fakeThought(), found = [];
    D = createHushflow({ worldEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), fxEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), mallow, thought, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} } });
    D.on('discovery', (e) => found.push(e));
    await D.start({ worldId: 'raindrop-lagoon', emotion: 'anxious', intention: 'calm' });
    const w = D.world;
    steps(D, 3);
    const d = w.debug.drops[0];
    assert.equal(d.word, 'worry');
    tap(D, d.x, d.y);
    steps(D, 1.5);
    assert.equal(w.debug.drops[0].state, 'open');
    assert.ok(w.debug.drops[0].latched, 'a tapped drop clears by itself');
    assert.ok(w.debug.drops[0].pill, 'its word shows');
    // elsewhere: it floats back
    tap(D, 30, 300);
    steps(D, 0.5);
    assert.equal(w.debug.drops[0].state, 'hang');
    // again, then the thought
    tap(D, d.x, d.y); steps(D, 1.5);
    const T = w.debug.thought;
    tap(D, T.x, T.y); steps(D, 1.2);
    assert.deepEqual(w.metrics.named, ['worry']);
    assert.ok(found.some((e) => e.id === 'named'));
  } finally { D?.destroy(); dom.restore(); }
});

test('world: a gentle session — quiet lines, no offers, Blubi never happy; reduced motion and low stimulation still name a feeling', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 320, H = 568, mallow = fakeMallow(W, H), thought = fakeThought(), said = [], offers = [], found = [];
    D = createHushflow({ worldEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), fxEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), mallow, thought, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: true, lowStimulation: true, subtitles: { say(l) { said.push([].concat(l)); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {} } });
    D.on('offer', (e) => offers.push(e)); D.on('discovery', (e) => found.push(e));
    // (a gentle session never starts a world that is not calm: the session turns gentle while the lagoon plays)
    await D.start({ worldId: 'raindrop-lagoon', emotion: 'sad', intention: 'steady' });
    D.setGentle(true);
    const W2 = D.world;
    assert.ok(W2);
    steps(D, 3);
    assert.ok(said.some((l) => l.includes('Soft rain here.')), `the gentle intro: ${JSON.stringify(said)}`);
    assert.ok(!said.some((l) => l.includes('Oh… it’s raining a little.')));
    const n = W2.debug.drops.length;
    assert.ok(n >= 4 && n <= 6, `${n} drops at 320×568`);
    const T = W2.debug.thought;
    holdAndCarry(D, W2.debug.drops[0], T.x, T.y);
    assert.equal(W2.metrics.named.length, 1, 'reduced motion: still named');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(offers.length, 0, 'no Memory Garden offer in a gentle session');
    for (const m of mallow.emotions.slice(-5)) assert.ok(!(m.happy > 0), `no happy mix in a gentle session: ${JSON.stringify(m)}`);
    assert.ok(!mallow.reacts.includes('comfort') && !mallow.reacts.includes('celebrate'), 'no grin reactions');
    assert.ok(W2.debug.rain.n <= 20, `reduced motion and low stimulation: sparse rain (${W2.debug.rain.n} streaks)`);
  } finally { D?.destroy(); dom.restore(); }
});

test('world: melting in from the ocean, the thought glides from where it was; the drops condense; photos become glass drops', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, mallow = fakeMallow(W, H), thought = fakeThought();
    const photos = { n: 3, standIn: false, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }), colour: () => '#7fd4ff' };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, photos, registry: createRegistry(WORLDS), forceNext: 'raindrop-lagoon', ticker: fakeTicker(), store: memStore(), reducedMotion: false, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} } });
    const melts = [];
    D.on('melt', (e) => melts.push(e));
    await D.start({ worldId: 'luminous-ocean', emotion: 'sad', intention: 'steady' });
    steps(D, 2);
    const ocean = D.world;
    const from = { x: ocean.debug.thought.sx, y: ocean.debug.thought.sy };
    assert.ok(D.next(), 'drift on into the lagoon');
    for (let k = 0; k < 200 && !D.incoming; k++) { D.debug.step(1 / 30); await new Promise((r) => setTimeout(r, 1)); }
    for (let k = 0; k < 200 && D.state.melt == null; k++) { D.debug.step(1 / 30); await new Promise((r) => setTimeout(r, 1)); }
    assert.ok(melts.some((m) => m.k === 0 && m.to === 'raindrop-lagoon'), 'the melt began');
    const lag = D.incoming;
    D.debug.step(1 / 30);
    const T0 = lag.debug.thought;
    assert.ok(Math.hypot(T0.x - from.x, T0.y - from.y) < 40, `starts where the ocean left it: ${JSON.stringify(T0)} vs ${JSON.stringify(from)}`);
    steps(D, 6);
    assert.equal(D.world, lag, 'the lagoon is on stage');
    const T1 = lag.debug.thought;
    assert.ok(Math.abs(T1.x - T1.home.x) < 4 && Math.abs(T1.y - T1.home.y) < 5, 'and glided home');
    assert.ok(lag.debug.drops.every((d) => d.state === 'hang'), 'the drops condensed');
    assert.equal(lag.debug.orbs.length, 3, 'three glass photo drops');
  } finally { D?.destroy(); dom.restore(); }
});

test('world (review): a relayout mid-hold keeps the drop; "unsure" is not "a word"; resting on the tag or tapping too soon names nothing', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, mallow = fakeMallow(W, H), thought = fakeThought(), said = [], found = [];
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false, subtitles: { say(l) { said.push([].concat(l)); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {} } });
    D.on('discovery', (e) => found.push(e));
    await D.start({ worldId: 'raindrop-lagoon', emotion: 'sad', intention: 'steady' });
    const w = D.world;
    steps(D, 3);
    // resting a finger on the empty tag for 2 s: nothing is drawn to it, nothing named
    const tg = w.debug.tag;
    let t = D.debug.time * 1000;
    D.pointer({ type: 'down', id: 7, x: (tg.x0 + tg.x1) / 2, y: (tg.y0 + tg.y1) / 2, t, pointerType: 'touch' });
    steps(D, 2);
    D.pointer({ type: 'up', id: 7, x: (tg.x0 + tg.x1) / 2, y: (tg.y0 + tg.y1) / 2, t: t + 2000, pointerType: 'touch' });
    steps(D, 1);
    assert.deepEqual(w.metrics.named, [], 'a finger resting on the tag names nothing');
    assert.equal(w.progress, 0, 'and is not play');
    // a tap on a drop, then the thought at once: its word is not readable yet, nothing is given
    const d0 = w.debug.drops[0], T = w.debug.thought;
    tap(D, d0.x, d0.y, 8);
    tap(D, T.x, T.y, 8);
    steps(D, 1);
    assert.deepEqual(w.metrics.named, [], 'never given before its word shows');
    tap(D, 20, 300, 8); steps(D, 1);
    // "unsure" first: it counts, it says so, and "You gave it a word." waits for a word
    const un = w.debug.drops.find((d) => d.word === 'unsure');
    holdAndCarry(D, un, T.x, T.y);
    assert.deepEqual(w.metrics.named, ['unsure']);
    assert.ok(said.some((l) => l.includes('“Unsure” counts too.')));
    assert.ok(!found.some((e) => e.id === 'named'), 'no "You gave it a word." for unsure');
    // hold a drop, turn the phone mid-hold (fewer slots), carry it to the thought: it lands and counts
    const d1 = w.debug.drops[0];
    t = D.debug.time * 1000;
    D.pointer({ type: 'down', id: 9, x: d1.x, y: d1.y, t, pointerType: 'touch' });
    for (let s = 0; s < 1.4; s += 1 / 30) { t += 33; D.debug.step(1 / 30); }
    w.resize(320, 568);
    steps(D, 0.6);
    const T2 = w.debug.thought;
    for (let i = 1; i <= 15; i++) { t += 33; D.pointer({ type: 'move', id: 9, x: d1.x + ((T2.home.x - d1.x) * i) / 15, y: d1.y + ((T2.home.y - d1.y) * i) / 15, t, pointerType: 'touch' }); D.debug.step(1 / 30); }
    D.pointer({ type: 'up', id: 9, x: T2.home.x, y: T2.home.y, t: t + 16, pointerType: 'touch' });
    steps(D, 1.5);
    assert.ok(w.metrics.named.includes(d1.word), `named after the relayout: ${w.metrics.named}`);
    assert.ok(found.some((e) => e.id === 'named'), 'and the discovery came');
    const same = w.debug.drops.filter((d) => d.word === d1.word && d.state !== 'gone');
    assert.equal(same.length, 1, 'one drop per word');
    assert.equal(same[0].state, 'in');
    // it can be given back from the tag (once the thought has eased to its new home)
    steps(D, 2);
    const tw = w.debug.tag.words.find((x) => x.word === d1.word);
    tap(D, (tw.x0 + tw.x1) / 2, (tw.y0 + tw.y1) / 2, 10);
    steps(D, 2);
    assert.ok(!w.metrics.named.includes(d1.word), `given back: ${JSON.stringify({ named: w.metrics.named, tag: w.debug.tag, tw, drops: w.debug.drops.map((d) => [d.word, d.state, Math.round(d.x), Math.round(d.y)]) })}`);
  } finally { D?.destroy(); dom.restore(); }
});

test('layout (review r2): the person’s photos get at least one glass drop even on a 320×568 screen', () => {
  for (const tk of [1, 1.25]) {
    let p = null;
    for (let n = 6; n >= 4 && !p?.fit; n--) p = planLagoon({ W: 320, H: 568, band: bandFor(568), mallow: defaultMallowBox(320, 568), n, photos: 3, plate: platePx('My boss embarrassed me today.'), textScale: tk });
    assert.ok(p.orbs.length >= 1, `text ×${tk}: ${p.orbs.length} photo drops`);
    for (const o of p.orbs) assert.ok(o.D >= 28 && o.D + 24 >= 44, 'its touch target keeps 44 px');
  }
});

test('world (review r2): two long words never grow the tag past the place kept for it', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    for (const [W, H] of [[320, 568], [390, 844]]) {
      const mallow = fakeMallow(W, H), thought = fakeThought();
      D = createHushflow({ worldEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), fxEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), mallow, thought, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: true, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} } });
      await D.start({ worldId: 'raindrop-lagoon', emotion: 'frustrated', intention: 'calm' });
      const w = D.world;
      steps(D, 3);
      const T = w.debug.thought;
      for (const word of ['frustration', 'disappointment']) { const d = w.debug.drops.find((q) => q.word === word); holdAndCarry(D, d, T.x, T.y); }
      steps(D, 1);
      assert.deepEqual(w.metrics.named, ['frustration', 'disappointment']);
      const tg = w.debug.tag, P = w.debug.plan.tag;
      assert.ok(tg.x1 - tg.x0 <= P.w + 0.5 && tg.y1 - tg.y0 <= P.h + 0.5, `${W}×${H}: tag ${JSON.stringify(tg)} in ${JSON.stringify(P)}`);
      const body = { x0: T.x - T.r, x1: T.x + T.r, y0: T.y - T.r, y1: T.y + T.r };
      assert.ok(!hits(tg, body), `${W}×${H}: the tag is not on the thought`);
      if (w.debug.plan.plate) assert.ok(!hits(tg, w.debug.plan.plate, -1), `${W}×${H}: nor on its words`);
      D.destroy(); D = null;
    }
  } finally { D?.destroy(); dom.restore(); }
});
