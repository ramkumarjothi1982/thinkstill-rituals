// Boppo's Sunpop Orchard tests: the screen plan (band, hero, thought and words always clear; every sunpop a ≥ 44 px
// target), the sunpops (they ripen only while gently warmed, pokes only wobble them, ripeness never goes down), the
// thought (it softens only through what the person gives), the discoveries and completion — plus headless runs of the
// world inside the director (a fake DOM): hold → ripen → cup → give, pokes then a hold, the offer, completion, a melt
// in from another world handing over the thought and photos, reduced motion, no words, and saved progress.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ORCHARD, planOrchard, plateSize, createFruit, stepFruit, pokeFruit, pickFruit, heatFor, tensionFor, reliefFor,
  createGentleHandsDetector, createKinderDetector, createOrchardProgress, boxesOverlap,
} from '../src/hushfold/flow/worlds/sunpop-orchard-rules.js';
import { createRegistry, WORLDS, REQUIRED_FIELDS, missingFields, isPlayable } from '../src/hushfold/flow/registry.js';

const DT = 1 / 60;
const SIZES = [[390, 844], [360, 780], [375, 667], [320, 568], [430, 932], [1280, 800]];
const bandFor = (W, H) => ({ x: 0, y: 76, w: W, h: Math.min(156, Math.max(118, Math.round(H * 0.17))) });

// ------------------------------------------------------------------ plan --
test('plan: the band, the hero, the thought and its words stay clear; sunpops never overlap; ≥ 44 px targets; 20 px edges', () => {
  for (const [W, H] of SIZES) {
    for (const lines of [2, 1]) {
      const band = bandFor(W, H);
      const p = planOrchard({ W, H, band, plate: plateSize(lines === 2 ? 150 : 236, lines) });
      if (lines === 2 && !p.fits) continue;      // (the world then plans one wide line instead: tested below)
      const bandB = band.y + band.h;
      assert.ok(p.slots.length >= ORCHARD.N_MIN, `${W}×${H}: ${p.slots.length} sunpops`);
      assert.ok(p.D >= 44, `${W}×${H}: D ${p.D}`);
      const T = p.thought;
      assert.ok(T.y - T.r >= bandB, `${W}×${H}: the thought under the band`);
      assert.ok(p.plate.y0 > T.y + T.r && p.plate.y1 <= p.rects.hero.y0 + 1e-6, `${W}×${H}: the words under the thought, above the hero`);
      assert.ok(p.plate.x0 >= ORCHARD.EDGE - 1e-6 && p.plate.x1 <= W - ORCHARD.EDGE + 1e-6, `${W}×${H}: the words on screen`);
      for (const c of p.crown) {
        assert.ok(c.y - ORCHARD.LANTERN / 2 >= bandB, 'the crown under the band');
        assert.ok(c.y + ORCHARD.LANTERN / 2 < p.plate.y0, 'the crown never over the words');
      }
      for (const [i, s] of p.slots.entries()) {
        const R = s.D / 2, box = { x0: s.x - R, y0: s.y - R, x1: s.x + R, y1: s.y + R };
        assert.ok(box.x0 >= ORCHARD.EDGE - 1e-6 && box.x1 <= W - ORCHARD.EDGE + 1e-6, `${W}×${H} #${i}: inside the edges`);
        assert.ok(s.ay >= bandB, `${W}×${H} #${i}: its stem starts under the band`);
        assert.ok(!boxesOverlap(box, p.rects.hero), `${W}×${H} #${i}: off the hero`);
        assert.ok(!boxesOverlap(box, p.plate, 2), `${W}×${H} #${i}: off the words`);
        assert.ok(Math.hypot(s.x - T.x, s.y - T.y) > T.r + R + 10, `${W}×${H} #${i}: off the thought`);
        assert.ok(Math.max(ORCHARD.HIT_MIN, s.D * 0.56) * 2 >= 44, 'a 44 px target at least');
        for (const o of p.slots.slice(i + 1)) assert.ok(Math.hypot(s.x - o.x, s.y - o.y) >= (s.D + o.D) / 2 + ORCHARD.GAP - 1e-6, `${W}×${H}: sunpops apart`);
      }
      // both trees carry sunpops
      assert.ok(p.slots.some((s) => s.side < 0) && p.slots.some((s) => s.side > 0), `${W}×${H}: both sides`);
    }
  }
});

test('plan: the smallest phone (320×568) fits the thought with one wide line of words, and still hangs four sunpops', () => {
  const W = 320, H = 568, band = bandFor(W, H);
  const two = planOrchard({ W, H, band, plate: plateSize(230, 2) });
  const one = planOrchard({ W, H, band, plate: plateSize(230, 1) });
  assert.ok(!two.fits || two.thought.r < one.thought.r, 'two lines are tight here');
  assert.ok(one.fits, 'one line fits');
  assert.ok(one.slots.length >= 4 && one.D >= 46);
});

// --------------------------------------------------------------- sunpops --
test('sunpops: a bud grows in, ripens only while warmed (~1.7 s of a gentle hold), never un-ripens; pokes only wobble it', () => {
  const f = createFruit({ x: 50, y: 300, D: 56, ax: 56, ay: 256, side: -1 });
  let ev = null;
  for (let t = 0; t < 2; t += DT) ev = stepFruit(f, DT, 0) || ev;
  assert.equal(f.state, 'bud'); assert.equal(ev, 'grown'); assert.equal(f.ripe, 0, 'no warmth: no ripening');
  // pokes: it wobbles, nothing else changes
  for (let k = 0; k < 6; k++) { pokeFruit(f, 1); for (let t = 0; t < 0.2; t += DT) stepFruit(f, DT, 0); }
  assert.equal(f.ripe, 0, 'pokes never ripen');
  assert.ok(f.pokes === 6);
  // the wobble settles by itself
  for (let t = 0; t < 2.5; t += DT) stepFruit(f, DT, 0);
  assert.ok(Math.abs(f.wob) < 0.02, `settled (${f.wob})`);
  // a gentle hold: ripe in RIPEN_SEC
  let at = -1, prev = 0;
  for (let t = 0; t < 3 && at < 0; t += DT) { if (stepFruit(f, DT, 1, 'near') === 'ripened') at = t; assert.ok(f.ripe >= prev); prev = f.ripe; }
  assert.ok(Math.abs(at - ORCHARD.RIPEN_SEC) < 0.05, `ripened at ${at}`);
  assert.equal(f.ripenedBy, 'near');
  // half a hold, then let go: it keeps its warmth (never goes down)
  const g = createFruit({ x: 0, y: 0, D: 50, ax: 0, ay: -40, side: 1 }, { state: 'bud', grow: 1 });
  for (let t = 0; t < 0.8; t += DT) stepFruit(g, DT, 1, 'near');
  const half = g.ripe;
  for (let t = 0; t < 5; t += DT) stepFruit(g, DT, 0);
  assert.equal(g.ripe, half);
  // picked: it regrows
  pickFruit(f);
  for (let t = 0; t < ORCHARD.REGROW_SEC + ORCHARD.GROW_SEC + 0.2; t += DT) stepFruit(f, DT, 0);
  assert.equal(f.state, 'bud'); assert.equal(f.ripe, 0);
});

test('warmth: a quick finger warms nothing; a resting one warms after a moment, fully near a sunpop, more slowly from anywhere', () => {
  const U = 390, D = 56;
  assert.equal(heatFor({ speedU: 2, held: 0 }, 10, D, U).heat, 0, 'a quick swipe');
  assert.equal(heatFor({ speedU: 1, held: 0 }, 10, D, U).heat, 0, 'a brisk move');
  assert.equal(heatFor({ speedU: 0, held: 0.05 }, 10, D, U).heat, 0, 'a tap (not resting yet)');
  const still = heatFor({ speedU: 0, held: 0.5 }, 10, D, U);
  assert.equal(still.heat, 1); assert.ok(still.near);
  const slow = heatFor({ speedU: 0.3, held: 0 }, 10, D, U);
  assert.ok(slow.heat > 0.4 && slow.heat < 1, `a slow drift warms too (${slow.heat})`);
  const far = heatFor({ speedU: 0, held: 0.5 }, 300, D, U);
  assert.ok(far.heat > 0.15 && far.heat < 0.5 && !far.near, `from anywhere, more slowly (${far.heat})`);
});

test('the thought: it softens only through warmth given (never by itself), never below its floor, monotonically', () => {
  for (const t0 of [0.3, 0.6, 0.9]) {
    let prev = tensionFor(t0, 0);
    assert.ok(Math.abs(prev - t0) < 1e-9, 'unchanged with nothing given');
    for (let n = 1; n <= 12; n++) { const t = tensionFor(t0, reliefFor(n)); assert.ok(t <= prev + 1e-12); assert.ok(t >= ORCHARD.FLOOR); prev = t; }
  }
  assert.ok(reliefFor(0, 1e6) <= ORCHARD.HAND_MAX + 1e-12, 'a hand on it helps only a little');
});

// ------------------------------------------------------------ discoveries --
test('gentle-hands: pokes that wobbled sunpops, then a gentle hold that ripened one — never without the pokes, or from afar', () => {
  const a = createGentleHandsDetector();
  a.ripened({ via: 'near' }); assert.equal(a.update(DT), null, 'no pokes first');
  a.poke(); a.poke(); a.update(1);
  a.ripened({ via: 'far' }); assert.equal(a.update(DT), null, 'a hold from afar is not "a gentle hold ripened it"');
  a.ripened({ via: 'near' });
  const ev = a.update(DT);
  assert.equal(ev?.id, 'gentle-hands'); assert.equal(ev.evidence.pokes, 2);
  const b = createGentleHandsDetector();
  b.poke(); b.poke(); b.update(30);
  b.ripened({ via: 'near' }); assert.equal(b.update(DT), null, 'too long after the pokes');
});

test('kinder: three given and the thought really softened (relative to its room to); kinder-light without a thought', () => {
  const k = createKinderDetector();
  assert.equal(k.update(DT, { given: 2, tension: 0.2, t0: 0.7, hasThought: true }), null);
  assert.equal(k.update(DT, { given: 3, tension: 0.68, t0: 0.7, hasThought: true }), null, 'not softened');
  assert.equal(k.update(DT, { given: 3, tension: tensionFor(0.7, reliefFor(3)), t0: 0.7, hasThought: true })?.id, 'kinder');
  // an already settled thought (from the storm) has less room to soften: still found when it does
  const s = createKinderDetector();
  assert.equal(s.update(DT, { given: 3, tension: tensionFor(0.3, reliefFor(3)), t0: 0.3, hasThought: true })?.id, 'kinder');
  const n = createKinderDetector();
  assert.equal(n.update(DT, { given: 3, hasThought: false })?.id, 'kinder-light');
});

test('progress: monotonic; completion needs five given, 30 s of play and the discovery, then 2 s with fingers lifted', () => {
  const q = createOrchardProgress();
  let r, last = 0;
  for (let t = 0; t < 40; t += 0.1) { r = q.update(0.1, { given: Math.min(4, Math.floor(t / 5)), playing: true, down: false, kinder: true }); assert.ok(r.p >= last); last = r.p; }
  assert.ok(!r.complete, 'four given is not five');
  r = q.update(0.1, { given: 5, playing: true, down: true, kinder: true });
  for (let t = 0; t < 5; t += 0.1) r = q.update(0.1, { given: 5, playing: true, down: true, kinder: true });
  assert.ok(!r.complete, 'never while a finger is down');
  for (let t = 0; t < 1.9; t += 0.1) r = q.update(0.1, { given: 5, playing: true, down: false, kinder: true });
  assert.ok(!r.complete);
  for (let t = 0; t < 0.3; t += 0.1) r = q.update(0.1, { given: 5, playing: true, down: false, kinder: true });
  assert.ok(r.complete && r.p === 1);
  const early = createOrchardProgress();
  for (let t = 0; t < 10; t += 0.1) r = early.update(0.1, { given: 9, playing: true, down: false, kinder: true });
  assert.ok(!r.complete, 'never before 30 s of play');
  const snap = q.snapshot(), q2 = createOrchardProgress(); q2.restore(snap);
  assert.ok(q2.complete);
});

// --------------------------------------------------------------- registry --
test('registry entry: every §16 field, fits, calm, next and load; not in WORLDS yet, never DEV', async () => {
  const { SUNPOP_ORCHARD } = await import('../src/hushfold/flow/worlds/sunpop-orchard.js');
  assert.deepEqual(missingFields(SUNPOP_ORCHARD), []);
  for (const k of REQUIRED_FIELDS) assert.ok(SUNPOP_ORCHARD[k] != null, k);
  assert.ok(SUNPOP_ORCHARD.fits && typeof SUNPOP_ORCHARD.calm === 'boolean' && Array.isArray(SUNPOP_ORCHARD.next) && typeof SUNPOP_ORCHARD.load === 'function');
  assert.notEqual(SUNPOP_ORCHARD.status, 'dev');
  assert.ok(!WORLDS.some((w) => w.id === 'sunpop-orchard'), 'lab-only: the coordinator adds it');
  assert.equal(SUNPOP_ORCHARD.memory.skillId, 'kinder-voice');
  assert.equal(SUNPOP_ORCHARD.mallow.id, 'boppo');
  const { SKILLS } = await import('../src/hushfold/skills.js').catch(() => ({}));
  const sk = Array.isArray(SKILLS) ? SKILLS.find((s) => s.id === 'kinder-voice') : SKILLS?.['kinder-voice'];
  if (sk) assert.equal(sk.world?.id, 'sunpop-orchard');
  const reg = createRegistry([...WORLDS, SUNPOP_ORCHARD]);
  assert.ok(isPlayable(SUNPOP_ORCHARD) && reg.playable('sunpop-orchard'));
  const mod = await reg.load('sunpop-orchard');
  assert.equal(typeof mod.create, 'function');
  // a gentle session never picks it by itself
  const pick = reg.select({ current: 'luminous-ocean', emotion: 'sad', intention: 'calm', gentle: true });
  assert.notEqual(pick.id, 'sunpop-orchard');
  // every discovery the world can fire is in the entry; the one that offers is A Kinder Voice
  for (const id of ['gentle-hands', 'kinder', 'kinder-light']) assert.ok(SUNPOP_ORCHARD.discoveries[id]?.lines?.length, id);
  assert.equal(SUNPOP_ORCHARD.discoveries['gentle-hands'].offer, false);
  assert.equal(SUNPOP_ORCHARD.discoveries.kinder.skillId, 'kinder-voice');
});

// ------------------------------------------------------- headless world --
function installFakeDom() {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const noop = () => {};
  const ctx2d = (c) => new Proxy({
    canvas: c,
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
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
  const m = { reacts: [], emotions: [], rect: () => r, bodyRect: () => r, react(k) { m.reacts.push(k); }, setEmotion(mix) { m.emotions.push(mix); }, lookAt() {}, float() {} };
  return m;
};
const fakeThought = () => ({ id: 't', token: 'My boss embarrassed me today.', text: 'My boss embarrassed me today.', x: 0, y: 0, z: 0, scale: 1, state: { tension: 0.7 }, reacts: [], react(k) { this.reacts.push(k); }, hitTest: () => false, pointer() {}, settle() {} });
const steps = (D, sec, dt = 1 / 30) => { for (let t = 0; t < sec; t += dt) D.debug.step(dt); };
const quiet = () => ({ say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} });
let ORCH = null;
async function orchardRegistry(extra = []) {
  if (!ORCH) ORCH = (await import('../src/hushfold/flow/worlds/sunpop-orchard.js')).SUNPOP_ORCHARD;
  return createRegistry([...WORLDS, ...extra, ORCH]);
}
/** A finger resting on (x, y) for `sec`, then (optionally) lifted. */
function hold(D, x, y, sec, { id = 1, lift = true } = {}) {
  let t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x, y, t, pointerType: 'touch' });
  for (let s = 0; s < sec; s += 1 / 30) { D.debug.step(1 / 30); }
  if (lift) D.pointer({ type: 'up', id, x, y, t: D.debug.time * 1000, pointerType: 'touch' });
}
function tap(D, x, y, id = 2) {
  const t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x, y, t, pointerType: 'touch' });
  D.debug.step(1 / 30);
  D.pointer({ type: 'up', id, x, y, t: t + 90, pointerType: 'touch' });
  D.debug.step(1 / 30);
}
/** Ripen the first bud with a gentle hold and let it go (one sunpop given). */
function giveOne(w, D) {
  const k = w.debug.fruits.findIndex((q) => q.state === 'bud' && q.photo < 0);
  const q = w.debug.fruits[k];
  hold(D, q.x, q.y + 4, ORCHARD.RIPEN_SEC + 0.45);
  steps(D, GIFT_WAIT);
  return k;
}
const GIFT_WAIT = 2.3;

test('world: a gentle hold ripens a sunpop, it stays cupped, letting go gives it to the thought — and only that softens it', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, mallow = fakeMallow(W, H), thought = fakeThought();
    const found = [], offers = [], said = [];
    const subtitles = { say(lines, o) { said.push({ lines: [].concat(lines), kind: o?.kind }); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {} };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, subtitles, registry: await orchardRegistry(), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
    D.on('discovery', (e) => found.push(e)); D.on('offer', (e) => offers.push(e));
    await D.start({ worldId: 'sunpop-orchard', emotion: 'sad', intention: 'steady' });
    const w = D.world;
    assert.ok(w, 'the orchard started');
    steps(D, 3);
    assert.ok(w.debug.fruits.length >= 4 && w.debug.fruits.every((q) => q.state === 'bud'), 'sunpops grew in');
    const T0 = w.debug.thought;
    assert.ok(T0.alpha > 0.9 && Math.abs(T0.x - w.debug.plan.thought.x) < 6, 'the thought sits on its swing');
    assert.equal(thought.state.tension, 0.7, 'its own tension');
    steps(D, 10);
    assert.equal(w.metrics.tension, 0.7, 'nobody touching: it never calms by itself');
    assert.ok(said.some((s) => s.lines.includes('Mm. Sunpops.')), 'the intro');
    // a gentle hold on a sunpop: it ripens in under two seconds and stays cupped under the finger
    const q0 = w.debug.fruits[0];
    hold(D, q0.x, q0.y + 4, ORCHARD.RIPEN_SEC + 0.4, { lift: false });
    assert.equal(w.debug.fruits[0].state, 'ripe', 'ripe');
    assert.ok(w.debug.fingers[0].cup, 'cupped under the finger');
    assert.equal(w.metrics.given, 0, 'not given until let go');
    D.pointer({ type: 'up', id: 1, x: q0.x, y: q0.y, t: D.debug.time * 1000, pointerType: 'touch' });
    D.debug.step(1 / 30);
    assert.equal(w.debug.gifts.length, 1, 'floating to the thought');
    steps(D, GIFT_WAIT);
    assert.equal(w.metrics.given, 1);
    assert.ok(w.metrics.tension < 0.7 - 0.03, `it softened (${w.metrics.tension})`);
    assert.equal(w.debug.crown.n, 1, 'a light in its crown');
    assert.ok(Math.abs(thought.state.tension - w.metrics.tension) < 1e-3, 'the handle hears it');
    assert.equal(w.debug.fruits[0].state, 'gone', 'the stem is bare for a while…');
    steps(D, ORCHARD.REGROW_SEC + ORCHARD.GROW_SEC + 0.3);
    assert.equal(w.debug.fruits[0].state, 'bud', '…then a new bud');
    // quick pokes: they wobble, nothing ripens; then a gentle hold ripens one → 'gentle-hands' (nothing offered)
    const q1 = w.debug.fruits[1], r1 = q1.ripe;
    for (let k = 0; k < 3; k++) tap(D, q1.x, q1.y);
    assert.equal(w.debug.fruits[1].ripe, r1, 'pokes ripen nothing');
    assert.equal(w.metrics.pokes, 3);
    hold(D, q1.x, q1.y + 4, ORCHARD.RIPEN_SEC + 0.4);
    steps(D, 0.3);
    assert.ok(found.some((e) => e.id === 'gentle-hands'), 'Quick pokes made it wobble. A gentle hold ripened it.');
    steps(D, GIFT_WAIT);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(offers.length, 0, '"gentle-hands" offers nothing');
    // one more: three given, and it really softened → 'kinder', which offers A Kinder Voice
    giveOne(w, D);
    steps(D, 0.3);
    assert.equal(w.metrics.given, 3);
    assert.ok(found.some((e) => e.id === 'kinder' && e.skillId === 'kinder-voice'), 'the discovery');
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(offers.some((e) => e.skillId === 'kinder-voice'), 'A Kinder Voice is offered');
    // completion: five given, 30 s of play, then 2 s with fingers lifted
    giveOne(w, D); giveOne(w, D);
    assert.equal(w.metrics.given, 5);
    steps(D, Math.max(0, ORCHARD.MIN_PLAY - w.metrics.played) + 0.5);
    steps(D, ORCHARD.IDLE_SEC + 0.5);
    assert.ok(w.complete && w.progress === 1, 'complete');
    assert.equal(D.state.complete, true);
    // still playable: sunpops regrow and still ripen
    steps(D, 8);
    const k = giveOne(w, D);
    assert.ok(k >= 0 && w.metrics.given === 6);
    // saved progress: ids and numbers only, small, never the person's words; it restores
    const { sanitizeState } = await import('../src/engine/flow-store.js');
    const st = w.serialize();
    assert.deepEqual(sanitizeState(st), st);
    assert.ok(JSON.stringify(st).length < 1024, `${JSON.stringify(st).length} chars`);
    assert.ok(!JSON.stringify(st).includes('boss'));
    assert.ok(w.restore(st));
    // Finish: nothing more happens
    D.finish();
    assert.equal(D.state.phase, 'finished');
  } finally { D?.destroy(); dom.restore(); }
});

test('world: holding still anywhere warms the nearest sunpop (no precise target); a quick scribble warms nothing', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844;
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow: fakeMallow(W, H), thought: fakeThought(), subtitles: quiet(), registry: await orchardRegistry(), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
    await D.start({ worldId: 'sunpop-orchard', emotion: 'lonely', intention: 'calm' });
    const w = D.world;
    steps(D, 3);
    // a scribble across the trees
    let t = D.debug.time * 1000;
    D.pointer({ type: 'down', id: 1, x: 40, y: 300, t, pointerType: 'touch' });
    for (let i = 0; i < 60; i++) { t += 1000 / 60; D.pointer({ type: 'move', id: 1, x: 40 + (i % 2 ? 60 : -0) + i, y: 300 + (i % 4) * 30, t, pointerType: 'touch' }); D.debug.step(1 / 60); }
    D.pointer({ type: 'up', id: 1, x: 100, y: 300, t, pointerType: 'touch' });
    assert.ok(w.debug.fruits.every((q) => q.ripe === 0), 'a scribble ripens nothing');
    // a hold in open air (nowhere near a sunpop): the nearest one warms, more slowly
    const p = w.debug.plan;
    hold(D, p.cx, p.rects.hero.y0 - 8, 2);
    const ripe = w.debug.fruits.map((q) => q.ripe);
    assert.equal(ripe.filter((r) => r > 0).length, 1, 'one sunpop warmed');
    const r = Math.max(...ripe);
    assert.ok(r > 0.15 && r < 0.8, `more slowly (${r})`);
  } finally { D?.destroy(); dom.restore(); }
});

test('world: melting in from another world — the thought glides from where it was to the swing, photos into their sunpops', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, mallow = fakeMallow(W, H), thought = fakeThought();
    const cards = [{ i: 0, x: 90, y: 300, w: 64, h: 64, rot: 0, state: 'floating', shape: 'bubble' }, { i: 1, x: 300, y: 340, w: 64, h: 64, rot: 0, state: 'floating', shape: 'bubble' }];
    const FROM = { ...WORLDS[1], id: 'stand-in', final: false, next: ['sunpop-orchard'], load: async () => ({ create: () => ({ prepare() {}, enter() {}, frame() {}, pointer() {}, outro() {}, intro() {}, get progress() { return 1; }, get complete() { return true; }, get metrics() { return {}; },
      handoff: () => ({ horizonY: 0.44 * H, thought: { x: 140, y: 420, scale: 1, r: 30, tension: 0.55 }, photos: cards }), serialize: () => ({ v: 1 }), restore() {}, pause() {}, resume() {}, destroy() {} }) }) };
    const photos = { n: 2, standIn: false, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, photos, subtitles: quiet(), registry: await orchardRegistry([FROM]), ticker: fakeTicker(), store: memStore(), reducedMotion: false, forceNext: 'sunpop-orchard' });
    const melts = [];
    D.on('melt', (e) => melts.push(e));
    await D.start({ worldId: 'stand-in', emotion: 'sad', intention: 'calm' });
    assert.ok(D.next());
    for (let i = 0; i < 200 && D.state.phase !== 'melting'; i++) { D.debug.step(1 / 60); await new Promise((r) => setTimeout(r, 2)); }
    assert.equal(D.state.phase, 'melting');
    const o = D.incoming;
    D.debug.step(1 / 60);
    const T = o.debug.thought;
    assert.ok(Math.abs(T.x - 140) < 2 && Math.abs(T.y - 420) < 2, `the thought starts where it was (${T.x}, ${T.y})`);
    assert.ok(Math.abs(T.t0 - 0.55) < 1e-9, 'its tension came with it');
    const ph = o.debug.fruits.filter((q) => q.photo >= 0);
    assert.equal(ph.length, 2, 'both photos hang as sunpops');
    const xs = [];
    for (let i = 0; i < 30 * 6; i++) { D.debug.step(1 / 30); xs.push(o.debug.thought.x); }
    for (let i = 1; i < xs.length; i++) assert.ok(Math.abs(xs[i] - xs[i - 1]) < 8, 'it glides (no jump)');
    assert.equal(D.state.worldId, 'sunpop-orchard');
    steps(D, 1);
    const P = o.debug.plan.thought, T2 = o.debug.thought;
    assert.ok(Math.abs(T2.x - P.x) < 6 && Math.abs(T2.y - P.y) < 6, 'on the swing');
    for (const q of o.debug.fruits.filter((f) => f.photo >= 0)) assert.ok(q.state === 'bud', 'photo sunpops hang ready');
    assert.deepEqual(melts.map((m) => m.k), [0, 1]);
    // and out again: the hand-over carries the thought, its tension and the photos where they hang
    const h = o.handoff();
    assert.ok(h.horizonY > 0.6 * H && h.thought && Number.isFinite(h.thought.x) && h.thought.tension > 0);
    assert.equal(h.photos.length, 2);
  } finally { D?.destroy(); dom.restore(); }
});

test('world: reduced motion — the swing is still, a given sunpop fades into the crown (no flight), the melt crossfades the thought', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 320, H = 568;
    D = createHushflow({ worldEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), fxEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), mallow: fakeMallow(W, H), thought: fakeThought(), subtitles: quiet(), registry: await orchardRegistry(), ticker: fakeTicker(), store: memStore(), reducedMotion: true, lowStimulation: true });
    await D.start({ worldId: 'sunpop-orchard', emotion: 'sad', intention: 'calm' });
    const w = D.world;
    steps(D, 2);
    assert.ok(w.debug.fruits.length >= 4, `${w.debug.fruits.length} sunpops on the smallest phone`);
    const sw = [];
    for (let i = 0; i < 60; i++) { D.debug.step(1 / 30); sw.push(w.debug.swing.a); }
    assert.ok(sw.every((a) => Math.abs(a) < 1e-3), 'the swing stays still');
    const q = w.debug.fruits[0];
    hold(D, q.x, q.y, ORCHARD.RIPEN_SEC + 0.4);
    D.debug.step(1 / 30);
    const g = w.debug.gifts[0];
    if (g) { const x0 = g.x; steps(D, 0.5); const g2 = w.debug.gifts[0]; if (g2) assert.equal(g2.x, x0, 'it does not fly'); }
    steps(D, 2.5);
    assert.equal(w.metrics.given, 1);
    // the words fit (one wide line) between the band and the hero
    const p = w.debug.plan;
    assert.ok(p.fits && p.plate.y1 <= p.rects.hero.y0 + 1e-6);
  } finally { D?.destroy(); dom.restore(); }
});

test('world: no words — an empty swing gathers the lights; "kinder-light" offers A Kinder Voice', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, found = [];
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow: fakeMallow(W, H), thought: null, subtitles: quiet(), registry: await orchardRegistry(), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
    D.on('discovery', (e) => found.push(e));
    await D.start({ worldId: 'sunpop-orchard', emotion: 'sad', intention: 'calm' });
    const w = D.world;
    steps(D, 3);
    for (let k = 0; k < 3; k++) giveOne(w, D);
    assert.equal(w.metrics.given, 3);
    assert.equal(w.metrics.tension, null);
    assert.ok(found.some((e) => e.id === 'kinder-light' && e.skillId === 'kinder-voice'));
    assert.ok(w.avoid().every((r) => r.kind !== 'thought'));
  } finally { D?.destroy(); dom.restore(); }
});

test('world: a gentle session — no quips, no faces, Boppo never grins', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, mallow = fakeMallow(W, H), said = [];
    const subtitles = { say(lines) { said.push(...[].concat(lines)); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {} };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought: fakeThought(), subtitles, registry: await orchardRegistry(), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
    // (a session turns gentle while the orchard plays: care typed mid-world; it keeps playing, gently)
    await D.start({ worldId: 'sunpop-orchard', emotion: 'sad', intention: 'calm' });
    D.setGentle(true);
    const w = D.world;
    mallow.emotions.length = 0;
    steps(D, 3);
    for (let k = 0; k < 5; k++) tap(D, w.debug.fruits[0].x, w.debug.fruits[0].y);
    giveOne(w, D);
    assert.ok(!said.some((l) => /Boing/.test(l)), 'no quips');
    assert.ok(mallow.emotions.length && mallow.emotions.every((m) => !(m.happy > 0)), 'no grin');
    assert.ok(!mallow.reacts.includes('hop'));
  } finally { D?.destroy(); dom.restore(); }
});
