// Moonmilk Cove (world 5, lab-only) tests: the pure core (the screen plan, the rest meter, the discoveries, completion,
// the moon's phase), the registry entry's contract — and a headless run of the world inside the director (a fake DOM):
// a resting finger fills the moon, moving only pauses it, doing nothing counts after the first touch, the shells keep
// their places, a gentle session keeps its quiet, the storm melts into the cove and hands over its thought.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COVE, planCove, shoreY, defaultHero, createRestMeter, createRestDetector, createWaitedDetector, createCoveProgress, moonShadow, litFraction, tideBusy } from '../src/hushfold/flow/worlds/moonmilk-cove-rules.js';
import { WORLDS, REQUIRED_FIELDS, STATUS, createRegistry, isPlayable, missingFields, selectNext } from '../src/hushfold/flow/registry.js';

const DT = 1 / 60;
const SIZES = [[390, 844], [360, 780], [375, 812], [430, 932], [320, 568], [1280, 800], [844, 390], [667, 375]];
const bandFor = (H) => ({ x: 0, y: 76, w: 0, h: Math.min(156, Math.max(118, Math.round(H * 0.17))) });
const R = (o) => o && { x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1 };
const overlap = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

// ------------------------------------------------------------------ plan --
test('plan: the thought, its words, the shells and the lanterns never touch the band, the hero or each other — every size, normal and largest text', () => {
  for (const [W, H] of SIZES) {
    for (const plate of [{ w: 220, h: 58 }, { w: 232, h: 82 }, null]) {
      const p = planCove({ W, H, band: bandFor(H), plate, n: 7 });
      const where = `${W}×${H} plate ${plate ? plate.h : 0}`;
      const T = p.rects.thought, P = p.rects.plate, B = p.rects.band, M = p.rects.hero;
      assert.ok(!overlap(T, B), `${where}: thought under the band`);
      assert.ok(!overlap(T, M), `${where}: thought on the hero`);
      assert.ok(T.x0 >= 0 && T.x1 <= W && T.y1 <= H, `${where}: thought on screen`);
      if (plate) {
        assert.ok(P, `${where}: a place for the words`);
        assert.ok(!overlap(P, B), `${where}: words under the band (${JSON.stringify(R(P))})`);
        assert.ok(!overlap(P, M), `${where}: words on the hero`);
        assert.ok(P.x0 >= COVE.EDGE - 1e-6 && P.x1 <= W - COVE.EDGE + 1e-6 && P.y0 >= 0 && P.y1 <= H, `${where}: words on screen`);
        assert.ok(!overlap(P, T), `${where}: words on the thought`);
      }
      // the thought sits on the water (its cradle floats there)
      assert.ok(p.home.y >= p.hy, `${where}: the cradle floats on the water`);
      assert.ok(p.shells.length >= 1, `${where}: at least one shell`);
      assert.ok(p.slots.length >= 1, `${where}: at least one lantern for the photos`);
      for (const s of p.shells) {
        const S = { x0: s.x - s.hit, y0: s.y - s.hit, x1: s.x + s.hit, y1: s.y + s.hit * 0.8 };
        assert.ok(s.hit * 2 >= 44, `${where}: a 44 px target`);
        assert.ok(!overlap(S, M) && !overlap(S, B) && !overlap(S, T) && !(P && overlap(S, P)), `${where}: shell ${s.x},${s.y} clear`);
        assert.ok(S.x0 >= 0 && S.x1 <= W && S.y1 <= H, `${where}: shell on screen`);
        for (const q of p.shells) if (q !== s) assert.ok(Math.hypot(q.x - s.x, q.y - s.y) >= 2 * s.hit, `${where}: shells apart`);
      }
      for (const L of p.slots) {
        const S = { x0: L.x - L.D / 2, y0: L.y - L.D * 0.62, x1: L.x + L.D / 2, y1: L.y + L.D * 0.62 };
        assert.ok(L.D >= 30, `${where}: a lantern big enough to see (and tap)`);
        assert.ok(!overlap(S, M) && !overlap(S, B) && !overlap(S, T) && !(P && overlap(S, P)), `${where}: lantern ${L.x},${L.y} clear`);
        for (const q of p.slots) if (q !== L) assert.ok(!overlap(S, { x0: q.x - q.D / 2, y0: q.y - q.D * 0.62, x1: q.x + q.D / 2, y1: q.y + q.D * 0.62 }), `${where}: lanterns apart`);
        assert.ok(S.y0 >= p.hy - 1, `${where}: lanterns float on the water`);
      }
    }
  }
});

test('plan: a tiny landscape window at the largest text (568×320, words 232×82): nowhere is clear — the words cover as little as can be, never the band', () => {
  const area = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  for (const plate of [{ w: 232, h: 58 }, { w: 232, h: 82 }]) {
    const p = planCove({ W: 568, H: 320, band: bandFor(320), plate, n: 5 });
    const P = p.rects.plate;
    assert.equal(area(P, p.rects.band), 0, 'never under the band');
    assert.ok(area(P, p.rects.hero) < 0.05 * plate.w * plate.h, `words on the hero: ${area(P, p.rects.hero)} px²`);
    assert.ok(P.y1 <= 320 && P.y0 >= 0);
    assert.ok(p.slots.length >= 1, 'the photos still get a lantern');
  }
});

test('plan: the side panel (freeW) keeps everything left of it; the shore is the realm’s curve', () => {
  const W = 1280, H = 800, x1 = 900;
  const p = planCove({ W, H, band: bandFor(H), plate: { w: 220, h: 58 }, n: 7, x1 });
  assert.ok(p.rects.thought.x1 <= x1 && (!p.rects.plate || p.rects.plate.x1 <= x1));
  for (const s of p.shells) assert.ok(s.x + s.hit <= x1);
  for (const L of p.slots) assert.ok(L.x + L.D / 2 <= x1);
  assert.ok(Math.abs(shoreY(390, 844, 195) - 0.785 * 844) < 1e-6 && shoreY(390, 844, 0) < shoreY(390, 844, 195));
  const m = defaultHero(390, 844);
  assert.ok(m.bottom <= 844 - 76 + 1e-6 && m.width > 130);
});

// ------------------------------------------------------------- the rest --
test('rest meter: a still finger fills the moon; moving pauses it (never takes it away); a minute is a full moon', () => {
  const m = createRestMeter();
  let r;
  for (let t = 0; t < 10; t += DT) r = m.update(DT, { down: 1, still: 1, moving: false, sinceInput: 0, touched: true });
  assert.ok(Math.abs(r.rest - 10) < 0.05 && r.mode === 'finger' && r.resting);
  for (let t = 0; t < 5; t += DT) r = m.update(DT, { down: 1, still: 0, moving: true, sinceInput: 0, touched: true });
  assert.ok(Math.abs(r.rest - 10) < 0.05, 'moving pauses the rest — it is not lost');
  assert.equal(r.run, 0, 'a long move ends the unbroken run');
  assert.ok(!r.resting);
  for (let t = 0; t < 52; t += DT) r = m.update(DT, { down: 1, still: 1, moving: false, sinceInput: 0, touched: true });
  assert.equal(r.p, 1, 'sixty seconds: a full moon');
  // two fingers resting are not twice the rest
  const m2 = createRestMeter();
  for (let t = 0; t < 4; t += DT) r = m2.update(DT, { down: 2, still: 2, moving: false, touched: true });
  assert.ok(Math.abs(r.rest - 4) < 0.05);
});

test('rest meter: doing nothing counts — only after the first touch and 3 s without any; a short fidget does not break a run', () => {
  const m = createRestMeter();
  let r;
  for (let t = 0; t < 20; t += DT) r = m.update(DT, { down: 0, still: 0, moving: false, sinceInput: t, touched: false });
  assert.equal(r.rest, 0, 'before the first touch, nothing counts (reading the intro is not the rest)');
  for (let t = 0; t < 2.9; t += DT) r = m.update(DT, { down: 0, still: 0, moving: false, sinceInput: t, touched: true });
  assert.equal(r.rest, 0, 'a finger just lifted: not yet');
  for (let t = 2.9; t < 8; t += DT) r = m.update(DT, { down: 0, still: 0, moving: false, sinceInput: t, touched: true });
  assert.ok(r.rest > 4.9 && r.rest < 5.2 && r.mode === 'hands-off', `hands-off rest ${r.rest}`);
  // a run: 8 s resting, 0.8 s fidget (forgiven), 8 s resting → one 16 s run
  const q = createRestMeter();
  for (let t = 0; t < 8; t += DT) r = q.update(DT, { down: 1, still: 1, touched: true });
  for (let t = 0; t < 0.8; t += DT) r = q.update(DT, { down: 1, still: 0, moving: true, touched: true });
  for (let t = 0; t < 8; t += DT) r = q.update(DT, { down: 1, still: 1, touched: true });
  assert.ok(r.run > 15.9, `the run survived a fidget: ${r.run}`);
  const snap = q.snapshot(), q2 = createRestMeter(); q2.restore(snap);
  assert.ok(Math.abs(q2.rest - q.rest) < 0.06);
  q2.restore({ r: 1e9 }); assert.equal(q2.rest, COVE.REST_GOAL, 'restored rest is clamped');
});

test('discoveries: "rest" after 15 s of one unbroken rest (once); "waited" only for a shell touched after real rest', () => {
  const d = createRestDetector();
  assert.equal(d.update({ run: 14.9, rest: 30 }), null);
  const ev = d.update({ run: 15, rest: 15, mode: 'finger', shells: 3 });
  assert.equal(ev.id, 'rest');
  assert.equal(ev.evidence.shells, 3);
  assert.equal(d.update({ run: 40, rest: 40 }), null, 'once');
  const w = createWaitedDetector();
  assert.equal(w.touch(5, 100), null, 'not before real rest');
  assert.equal(w.touch(20, 10), null, 'a shell that was not there the whole rest did not wait');
  assert.equal(w.touch(20, 25).id, 'waited');
  assert.equal(w.touch(30, 40), null, 'once');
});

test('completion: a full moon, then 1.2 s with no finger moving (resting fingers are fine); progress never goes back', () => {
  const p = createCoveProgress();
  let r, last = 0;
  for (let t = 0; t < 59; t += DT) { r = p.update(DT, { rest: t, moving: false }); assert.ok(r.p >= last - 1e-9); last = r.p; }
  assert.ok(!r.complete && r.p < 1);
  r = p.update(DT, { rest: 60, moving: true });
  for (let t = 0; t < 3; t += DT) r = p.update(DT, { rest: 60, moving: true });
  assert.ok(!r.complete, 'not while a finger is moving');
  for (let t = 0; t < 1.3; t += DT) r = p.update(DT, { rest: 60, moving: false });
  assert.ok(r.complete && r.p === 1);
  r = p.update(DT, { rest: 0, moving: true });
  assert.ok(r.complete, 'complete stays complete');
});

test('the moon: a thin crescent at the start, full at the minute, filling steadily; the tide hushes with rest', () => {
  assert.ok(moonShadow(0) < 0.4 && moonShadow(1) >= 2.08);
  // the lit area is the rest earned: 'Half a moon.' is half a moon, and the last quarter of the minute still shows
  for (const p of [0, 0.25, 0.5, 0.75, 0.95]) assert.ok(Math.abs(litFraction(moonShadow(p)) - (0.12 + 0.88 * p)) < 0.01, `lit at ${p}`);
  assert.ok(moonShadow(0.95) < 2.08, 'still a sliver of shadow near the end');
  let last = -1; for (let p = 0; p <= 1; p += 0.01) { const v = moonShadow(p); assert.ok(v >= last); last = v; }
  assert.ok(tideBusy(0.9, 0, 0) > tideBusy(0.9, 1, 0) && tideBusy(0.9, 1, 0) > tideBusy(0.9, 1, 1) - 1e-9);
  assert.ok(tideBusy(0.9, 1, 1) >= 0.15 && tideBusy(1, 0, 0, 1) <= 1);
  assert.ok(tideBusy(0.3, 0, 0, 1) > tideBusy(0.3, 0, 0, 0), 'busy hands make the tide a little busier');
});

// ------------------------------------------------------- the registry entry --
test('entry: every §16 field, lab-only (never playable in production, never DEV), calm, its skill exists; not in WORLDS', async () => {
  const { MOONMILK_COVE } = await import('../src/hushfold/flow/worlds/moonmilk-cove.js');
  const e = MOONMILK_COVE;
  assert.deepEqual(missingFields(e), []);
  for (const k of REQUIRED_FIELDS) assert.ok(e[k] != null, k);
  assert.ok(e.fits && e.calm === true && Array.isArray(e.next) && typeof e.load === 'function');
  assert.notEqual(e.status, STATUS.DEV);
  assert.ok(!isPlayable(e), 'not offered until the coordinator switches it on');
  assert.ok(!WORLDS.some((w) => w.id === e.id), 'not in WORLDS (integration adds it)');
  assert.equal(e.mallow.id, 'noomi');
  assert.equal(e.memory.skillId, 'permission-to-rest');
  const { SKILLS } = await import('../src/hushfold/skills.js');
  const ids = Array.isArray(SKILLS) ? SKILLS.map((s) => s.id) : Object.keys(SKILLS);
  assert.ok(ids.includes('permission-to-rest'));
  assert.equal(e.discoveries.rest.skillId, 'permission-to-rest');
  assert.equal(e.discoveries.waited.offer, false);
  // its copy: no exclamation marks, no quips in the gentle lines; the full-moon lines say what is true
  const text = JSON.stringify([e.dialogue, e.discoveries]);
  assert.ok(!text.includes('!'));
  assert.equal(e.dialogue.gentle.busy, null);
  const mod = await e.load();
  assert.equal(typeof mod.create, 'function');
  // switched on (as the coordinator will), a gentle session may pick it, the selector is happy with it
  const on = { ...e, status: STATUS.PLAYABLE };
  const pick = selectNext([...WORLDS, on], { current: null, emotion: 'overwhelmed', intention: 'calm', gentle: true, exclude: ['luminous-ocean'] });
  assert.equal(pick.id, 'moonmilk-cove');
});

// ------------------------------------------------------- headless world --
function installFakeDom(W = 390, H = 844) {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const noop = () => {};
  const ctx2d = (c) => new Proxy({
    canvas: c,
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 8.4 }), getTransform: () => ({ a: 1, e: 0 }),
  }, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => { const c = { style: {}, className: '', width: 0, height: 0, children: [], setAttribute() {}, append(...x) { this.children.push(...x); }, remove() {}, addEventListener() {}, removeEventListener() {}, clientWidth: W, clientHeight: H }; c.getContext = () => ctx2d(c); return c; };
  globalThis.document = { createElement: () => el(), addEventListener() {}, removeEventListener() {}, hidden: false };
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return { el, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
const fakeMallow = (W, H) => {
  const r = defaultHero(W, H);
  const m = { reacts: [], emotions: [], rect: () => r, bodyRect: () => r, react(k) { m.reacts.push(k); }, setEmotion(x) { m.emotions.push(x); }, lookAt() {}, float() {} };
  return m;
};
const fakeThought = () => ({ id: 't', token: 'My boss embarrassed me today.', text: 'My boss embarrassed me today.', x: 120, y: 600, z: 0, scale: 1, state: { tension: 0.6 }, react() {}, settle() { this.settled = true; }, soften() {}, hitTest: () => false, pointer() {} });
const fakePhotos = (n = 3, standIn = false) => { const calls = []; return { n, standIn, calls, colour: () => '#ffd98a', size: (i, sh, D) => ({ w: D, h: D }), draw(g, i, x, y, D, o) { calls.push({ i, shape: o?.shape }); return { w: D, h: D }; } }; };
const steps = (D, sec, dt = 1 / 15) => { for (let t = 0; t < sec; t += dt) D.debug.step(dt); };
function rest(D, x, y, sec, id = 1) {
  const t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x, y, t, pointerType: 'touch' });
  steps(D, sec);
  D.pointer({ type: 'up', id, x, y, t: D.debug.time * 1000, pointerType: 'touch' });
}
function stroke(D, x0, y0, x1, y1, sec, id = 2) {
  let t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x: x0, y: y0, t, pointerType: 'touch' });
  const n = Math.round(sec * 30);
  for (let i = 1; i <= n; i++) { t += 1000 / 30; D.pointer({ type: 'move', id, x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n + Math.sin(i / 3) * 20, t, pointerType: 'touch' }); D.debug.step(1 / 30); }
  D.pointer({ type: 'up', id, x: x1, y: y1, t: t + 16, pointerType: 'touch' });
}
async function covedRegistry() {
  const { MOONMILK_COVE } = await import('../src/hushfold/flow/worlds/moonmilk-cove.js');
  return createRegistry([...WORLDS, { ...MOONMILK_COVE, status: STATUS.PLAYABLE }]);
}
function director(dom, { W = 390, H = 844, gentle = false, photos = fakePhotos(), thought = fakeThought(), mallow = fakeMallow(W, H), audio = null, reducedMotion = false, registry, forceNext = null } = {}) {
  return import('../src/hushfold/flow/director.js').then(({ createHushflow }) => {
    const said = [], found = [], offers = [], sounds = [];
    const subtitles = { say(lines, o) { said.push({ lines: [].concat(lines), kind: o?.kind }); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {} };
    const D = createHushflow({
      worldEl: dom.el(), fxEl: dom.el(), mallow, thought, subtitles, photos, registry, ticker: fakeTicker(), store: memStore(), reducedMotion, forceNext,
      audio: audio || { fx: (n) => { sounds.push(n); return true; }, hold: () => ({ update() {}, stop() {} }), ambience() {}, setAmbienceMood() {} },
      safeRect: () => ({ x: 20, y: 64, w: W - 40, h: 400 }),
    });
    if (gentle) D.setGentle(true);
    D.on('discovery', (e) => found.push(e)); D.on('offer', (e) => offers.push(e));
    return { D, said, found, offers, sounds, mallow, thought, photos };
  });
}

test('world: a resting finger fills the moon and hushes the shells; moving pauses; doing nothing counts; the rest discovery and completion are true', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const registry = await covedRegistry();
    const h = await director(dom, { registry });
    D = h.D;
    await D.start({ worldId: 'moonmilk-cove', emotion: 'anxious', intention: 'calm' });
    const w = D.world;
    assert.ok(w, 'the cove started');
    steps(D, 3);
    assert.ok(h.said.some((s) => s.lines.includes('Mm. The cove’s sleepy tonight.')), 'the intro');
    assert.equal(w.metrics.rest, 0, 'nothing counts before the first touch');
    steps(D, 4);
    assert.ok(h.said.some((s) => s.lines.includes('Rest a finger anywhere.')), 'the person is told how the cove works');
    // the shells ping while nobody rests
    steps(D, 8);
    assert.ok(h.sounds.filter((n) => n === 'drip').length >= 2, 'the shells ping');
    const pl = w.debug.plan;
    // a stroke: moonmilk ribbons, the rest does not move
    stroke(D, 40, pl.hy + 40, 300, pl.hy + 90, 1.2);
    assert.ok(w.debug.ribbons >= 1, 'a ribbon of moonmilk');
    assert.equal(w.metrics.rest, 0, 'moving is not rest');
    // rest a finger for 16 s on the water
    const drips = h.sounds.filter((n) => n === 'drip').length;
    rest(D, pl.moon.x, pl.hy + 60, 16);
    const m = w.metrics;
    assert.ok(m.rest > 14.5 && m.rest < 16.5, `rested ${m.rest}`);
    assert.ok(h.sounds.filter((n) => n === 'drip').length <= drips + 1, 'the shells hush while resting');
    assert.ok(h.found.some((e) => e.id === 'rest' && e.skillId === 'permission-to-rest'), 'the rest discovery');
    assert.equal(w.debug.shells.length, 3, 'the shells are still there');
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(h.offers.some((o) => o.skillId === 'permission-to-rest'), 'Permission to Rest is offered');
    assert.ok(w.metrics.tension < 0.6, `the thought eased: ${w.metrics.tension}`);
    // hands off: after 3 s, doing nothing counts too, up to a full moon
    const r0 = w.metrics.rest;
    steps(D, 10);
    assert.ok(w.metrics.rest > r0 + 6 && w.metrics.mode === 'hands-off', 'doing nothing counts');
    assert.ok(!w.complete);
    steps(D, 40);
    assert.ok(w.complete && w.progress === 1, 'a full moon: complete');
    assert.ok(h.mallow.reacts.includes('sigh'), 'Noomi sighs');
    assert.ok(h.thought.settled, 'the thought settles');
    // it stays playable: a tap on a shell still answers (and 'waited' is true: it was there the whole rest)
    const s0 = w.debug.shells[0];
    D.pointer({ type: 'down', id: 9, x: s0.x, y: s0.y - 4, t: D.debug.time * 1000, pointerType: 'touch' });
    D.debug.step(1 / 30);
    D.pointer({ type: 'up', id: 9, x: s0.x, y: s0.y - 4, t: D.debug.time * 1000 + 30, pointerType: 'touch' });
    assert.ok(h.found.some((e) => e.id === 'waited'), 'It waited for you.');
    assert.ok(h.sounds.includes('glass'));
    // the thought stays on screen, never under the band; words planned clear
    const T = w.debug.thought;
    assert.ok(T.alpha > 0.9 && T.x > 0 && T.x < 390 && T.y > 76 + 118);
    // saved progress: ids and numbers only, never the words; survives the sanitiser and a restore
    const { sanitizeState } = await import('../src/engine/flow-store.js');
    const st = w.serialize();
    assert.deepEqual(sanitizeState(st), st);
    assert.ok(!JSON.stringify(st).includes('boss'));
    assert.ok(st.complete && st.discoveries.includes('rest'));
    assert.ok(w.restore(st));
    assert.equal(D.state.canNext, false, 'nothing follows the cove yet: Stay as long as you like, or Finish');
  } finally { D?.destroy(); dom.restore(); }
});

test('world: a finger resting on the Thought Mallow rests with it; resting in a gentle session stays quiet (no pings, no quips, no face changes, plain lanterns)', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const registry = await covedRegistry();
    const photos = fakePhotos(3, true);
    const h = await director(dom, { registry, gentle: true, photos });
    D = h.D;
    await D.start({ worldId: 'moonmilk-cove', emotion: 'sad', intention: 'calm', gentle: true });
    const w = D.world;
    steps(D, 14);
    assert.ok(h.said.some((s) => s.lines.includes('Somewhere quiet.')), 'the gentle intro');
    assert.ok(!h.said.some((s) => s.lines.some((l) => /pinging|left to do/.test(l))), 'no talk of tasks after something heavy');
    assert.equal(h.sounds.filter((n) => n === 'drip').length, 0, 'no pings');
    assert.equal(h.mallow.emotions.length, 0, 'the concerned face holds: no face changes');
    assert.ok(!h.mallow.reacts.some((k) => ['yawn', 'celebrate', 'hop', 'doubleTap'].includes(k)));
    assert.equal(photos.calls.filter((c) => c.shape === 'arch').length, 0, 'stand-in cards: plain lantern light, no faces (prepare warms none either)');
    // busy hands: no "busy" quip in a gentle session
    const pl = w.debug.plan;
    for (let k = 0; k < 6; k++) stroke(D, 40, pl.hy + 40, 300, pl.hy + 90, 1.2);
    assert.ok(!h.said.some((s) => s.lines.includes('Busy hands are allowed too.')));
    // resting on the thought (the fake handle's hitTest says yes)
    h.thought.hitTest = () => true;
    rest(D, w.debug.thought.x, w.debug.thought.y, 4, 3);
    assert.ok(w.metrics.rest > 3, 'resting on the thought is rest');
    assert.ok(h.said.some((s) => s.lines.includes('It can rest here too.')));
    assert.equal(h.offers.length, 0, 'no Memory Garden offers in a gentle session');
  } finally { D?.destroy(); dom.restore(); }
});

test('world: the storm melts into the cove — the thought glides into its cradle, postcards become lanterns; reduced motion fades instead', async () => {
  for (const reducedMotion of [false, true]) {
    const dom = installFakeDom();
    let D = null;
    try {
      const registry = await covedRegistry();
      const photos = fakePhotos(3);
      const h = await director(dom, { registry, photos, reducedMotion, forceNext: 'moonmilk-cove' });
      D = h.D;
      await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
      steps(D, 1);
      assert.ok(D.next({ worldId: 'moonmilk-cove' }));
      let n = 0;
      while (D.state.melt == null && n++ < 400) { D.debug.step(1 / 30); await new Promise((r) => setTimeout(r, 0)); }
      assert.ok(D.state.melt != null, 'the melt began');
      const cove = D.incoming;
      assert.ok(cove, 'the cove is melting in');
      const T0 = cove.debug.thought;
      assert.ok(T0.from, 'the thought comes from where the storm showed it');
      assert.equal(!!T0.from.fade, reducedMotion, reducedMotion ? 'reduced motion: a fade' : 'a glide');
      n = 0;
      while (D.state.melt != null && n++ < 600) D.debug.step(1 / 30);
      assert.equal(D.state.worldId, 'moonmilk-cove');
      steps(D, 3);
      const w = D.world, T = w.debug.thought, home = w.debug.plan.home;
      assert.ok(Math.abs(T.x - home.x) < 1 && Math.abs(T.y - home.y) < 6, `the thought rests in its cradle (${T.x},${T.y} vs ${home.x},${home.y})`);
      assert.ok(T.alpha > 0.95);
      assert.ok(w.debug.lanterns.length >= 1 && w.debug.lanterns.every((L) => L.alpha > 0.9), 'the postcards float as lanterns');
      const ho = w.handoff();
      assert.ok(ho.thought && ho.horizonY > 0 && Array.isArray(ho.photos));
    } finally { D?.destroy(); dom.restore(); }
  }
});

test('world: every screen size plans and plays without a throw; a resize keeps the rest', async () => {
  for (const [W, H] of [[320, 568], [844, 390], [1280, 800]]) {
    const dom = installFakeDom(W, H);
    let D = null;
    try {
      const registry = await covedRegistry();
      const h = await director(dom, { W, H, registry, photos: fakePhotos(7) });
      D = h.D;
      await D.start({ worldId: 'moonmilk-cove', emotion: 'overwhelmed', intention: 'calm' });
      const w = D.world;
      steps(D, 2);
      rest(D, W * 0.8, H * 0.6, 5);
      const r = w.metrics.rest;
      assert.ok(r > 3.5, `${W}×${H}: rest ${r}`);
      w.resize(H, W, {});
      steps(D, 1);
      assert.ok(w.metrics.rest >= r, 'a turned phone keeps the rest');
      assert.ok(w.debug.lanterns.filter((L) => !L.leaving).length + w.debug.waiting.length === 7, 'every photo has its place or its turn');
    } finally { D?.destroy(); dom.restore(); }
  }
});
