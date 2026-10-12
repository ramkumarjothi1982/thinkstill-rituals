// The two worlds with W2's ThoughtLayer (integration unit B1), headless through the director:
// a thought already on screen only notices the world (it does not appear again), the storm takes
// it from where it is (a glide, never a jump) at the storm's size with its words below, softens it
// in 0.05 steps and keeps postcards and lines off what the layer really draws; the ocean writes
// depth as z with the layer's own depth shrink and lift taken back out (drawn exactly at the
// ocean's projection). The 2D placeholder (no extent, no ov, no r) behaves as before.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORLDS, createRegistry } from '../src/hushfold/flow/registry.js';
import { OCEAN } from '../src/hushfold/flow/worlds/ocean-rules.js';

function installFakeDom(W = 390, H = 844) {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const noop = () => {};
  const ctx2d = (c) => new Proxy({
    canvas: c,
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
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
  const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
  const r = { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B, bottom, width: B, height: B, cx: W / 2, cy: bottom - B / 2 };
  return { rect: () => r, bodyRect: () => r, react() {}, setEmotion() {}, lookAt() {}, float() {} };
};
const subtitles = { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} };

/** A stand-in for W2's ThoughtMallow: its own radius r, ov.appear, and an extent() round where it is drawn. */
function layerThought({ x = 110, y = 640, appeared = true, r = 40 } = {}) {
  const calls = { react: [], soften: [] };
  const h = {
    id: 'th-1', token: 'My boss embarrassed me today.', text: 'My boss embarrassed me today.', r, scale: 1, x, y, z: 0, rot: 0, labelSide: null, state: {},
    ov: { appear: appeared ? 1 : 0 },
    react(k) { calls.react.push(k); }, soften(k) { calls.soften.push(k); }, settle() {}, hitTest: () => false, pointer() {},
    extent(out = {}) { const P = h.r * h.scale * (1 - 0.5 * h.z); out.left = h.x - P; out.right = h.x + P; out.top = h.y - P; out.bottom = h.y + P; out.width = out.right - out.left; out.height = out.bottom - out.top; return out; },
    calls,
  };
  return h;
}
/** Its layer: rects() gives the thought with its words tag (wider, and below), by id. */
const layerOf = (h) => ({
  primary: h, list: [h],
  rects(out = []) { out.length = 0; const e = h.extent({}); out.push({ left: e.left - 40, top: e.top, right: e.right + 40, bottom: e.bottom + 44, width: e.width + 80, height: e.height + 44, id: h.id }); return out; },
});

async function play(worldId, h, { W = 390, H = 844, layer = true, photos = null } = {}) {
  const dom = installFakeDom(W, H);
  const { createHushflow } = await import('../src/hushfold/flow/director.js');
  const D = createHushflow({
    worldEl: dom.el(), fxEl: dom.el(), mallow: fakeMallow(W, H), ...(layer ? { thoughts: layerOf(h) } : { thought: h }), subtitles, photos,
    registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false,
  });
  await D.start({ worldId, emotion: worldId === 'static-storm' ? 'angry' : 'anxious', intention: worldId === 'static-storm' ? 'calm' : 'let-go' });
  return { D, dom, done() { D.destroy(); dom.restore(); } };
}

// ---------------------------------------------------------------- storm --
test('storm: a thought already on screen notices the storm; a new one (or the placeholder) appears', async () => {
  for (const [appeared, want] of [[true, 'notice'], [false, 'appear']]) {
    const h = layerThought({ appeared });
    const run = await play('static-storm', h);
    try { assert.equal(h.calls.react[0], want, `ov.appear ${appeared ? 1 : 0}`); } finally { run.done(); }
  }
  const p = layerThought(); delete p.ov; delete p.extent; delete p.r;
  const run = await play('static-storm', p, { layer: false });
  try { assert.equal(p.calls.react[0], 'appear', 'the placeholder, as before'); } finally { run.done(); }
});

test('storm: it takes the thought from where it is — a glide (< 12 px a frame) to its place, eased to the storm’s size, words below; soften in 0.05 steps', async () => {
  const h = layerThought({ x: 110, y: 640 });
  const run = await play('static-storm', h);
  try {
    const { D } = run;
    const T = D.world.layoutPlan.thought;
    assert.ok(T, 'the storm planned a place for it');
    assert.ok(Math.hypot(T.x - 110, T.y - 640) > 60, `its place is somewhere else (${Math.round(T.x)}, ${Math.round(T.y)})`);
    D.debug.step(1 / 60);
    assert.ok(Math.hypot(h.x - 110, h.y - 640) < 6, `the first frame is where it was (${h.x.toFixed(1)}, ${h.y.toFixed(1)})`);
    assert.ok(Math.abs(h.scale - 1) < 0.08, `and its own size (${h.scale.toFixed(3)})`);
    let px = h.x, py = h.y, worst = 0;
    for (let i = 0; i < 60 * 4; i++) { D.debug.step(1 / 60); worst = Math.max(worst, Math.hypot(h.x - px, h.y - py)); px = h.x; py = h.y; }
    assert.ok(worst < 12, `largest step ${worst.toFixed(1)} px`);
    assert.ok(Math.hypot(h.x - T.x, h.y - T.y) < 14, `at its place after 4 s (${Math.round(h.x)}, ${Math.round(h.y)} vs ${Math.round(T.x)}, ${Math.round(T.y)})`);
    const goal = T.r / h.r;
    assert.ok(Math.abs(h.scale - goal) < 0.01, `drawn at the storm’s radius: scale ${h.scale.toFixed(3)} ≈ ${goal.toFixed(3)} (tR ${T.r} / r ${h.r})`);
    assert.equal(h.labelSide, 'below');
    assert.ok(h.calls.soften.length >= 1, 'softened');
    assert.ok(h.calls.soften.length < 60, `not every frame (${h.calls.soften.length} calls in 4 s)`);
    for (const k of h.calls.soften) assert.ok(Math.abs(k * 20 - Math.round(k * 20)) < 1e-9 && k >= 0 && k <= 1, `0.05 steps: ${k}`);
    for (let i = 1; i < h.calls.soften.length; i++) assert.notEqual(h.calls.soften[i], h.calls.soften[i - 1]);
  } finally { run.done(); }
});

test('storm: postcards and lines keep off what the layer really draws (its extent and its words, by id)', async () => {
  const h = layerThought({ x: 110, y: 640 });
  const run = await play('static-storm', h, { photos: { n: 5, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) } });
  try {
    const { D } = run;
    for (let i = 0; i < 60 * 3; i++) D.debug.step(1 / 60);
    assert.ok(D.world.debug.cards.length >= 2, `postcards hang (${D.world.debug.cards.length})`);
    const a = D.avoid().find((q) => q.kind === 'thought');
    assert.ok(a, 'the thought is in avoid()');
    const e = h.extent({});
    // the layer's rect: 40 px either side for its words, and 44 below
    assert.ok(Math.abs(a.x - (e.left - 40)) < 3 && Math.abs(a.x + a.w - (e.right + 40)) < 3, `x ${a.x.toFixed(1)}…${(a.x + a.w).toFixed(1)} vs ${(e.left - 40).toFixed(1)}…${(e.right + 40).toFixed(1)}`);
    assert.ok(Math.abs(a.y + a.h - (e.bottom + 44)) < 3, 'its words below');
    // every hanging postcard stays clear of that rect
    for (const c of D.world.debug.cards) {
      if (c.alpha < 0.35) continue;
      const hw = (Math.abs(Math.cos(c.rot)) * c.w + Math.abs(Math.sin(c.rot)) * c.h) / 2, hh = (Math.abs(Math.sin(c.rot)) * c.w + Math.abs(Math.cos(c.rot)) * c.h) / 2;
      const ox = Math.min(c.x + hw, a.x + a.w) - Math.max(c.x - hw, a.x), oy = Math.min(c.y + hh, a.y + a.h) - Math.max(c.y - hh, a.y);
      assert.ok(!(ox > 1 && oy > 1), `postcard ${c.i} overlaps the thought by ${ox.toFixed(1)}×${oy.toFixed(1)}`);
    }
  } finally { run.done(); }
});

// ---------------------------------------------------------------- ocean --
/** Drive a real-time-ish stroke through the director (30 Hz moves). */
function stroke(D, x0, y0, x1, y1, pxPerSec, id = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round((len / pxPerSec) * 30));
  let t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x: x0, y: y0, t, pointerType: 'touch' });
  for (let i = 1; i <= n; i++) { t += 1000 / 30; D.pointer({ type: 'move', id, x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, t, pointerType: 'touch' }); D.debug.step(1 / 30); }
  D.pointer({ type: 'up', id, x: x1, y: y1, t: t + 16, pointerType: 'touch' });
}
const steps = (D, sec, dt = 1 / 15) => { for (let t = 0; t < sec; t += dt) D.debug.step(dt); };

test('ocean: depth is z (= state.distance), drawn exactly at the ocean’s projection; a thought on screen notices the sea', async () => {
  const W = 390, H = 844;
  const h = layerThought({ x: 200, y: 600 });
  const run = await play('luminous-ocean', h, { W, H });
  try {
    const { D } = run;
    assert.equal(h.calls.react[0], 'notice');
    const w = D.world;
    steps(D, 3);
    const check = (tag) => {
      const T = w.debug.thought;
      assert.ok(Math.abs(h.z - h.state.distance) < 1e-9, `${tag}: z ${h.z} = distance ${h.state.distance}`);
      const drawn = h.r * h.scale * (1 - 0.5 * h.z), want = T.r * T.surf;
      assert.ok(Math.abs(drawn - want) < 0.01, `${tag}: drawn radius ${drawn.toFixed(2)} = the ocean’s ${want.toFixed(2)}`);
      assert.ok(Math.abs(h.y - 0.45 * h.r * h.z - T.sy) < 0.01 && Math.abs(h.x - T.sx) < 0.01, `${tag}: drawn where the ocean floats it`);
    };
    assert.ok(h.z < 0.3, `at home it is near (z ${h.z})`);
    check('home');
    for (let k = 0; k < 4 && h.z < 0.25; k++) { stroke(D, W / 2 + 6 * k, 720, W / 2, w.debug.surfaceY(Math.max(1.2, w.metrics.dist * 0.8)) - 30, 0.2 * 390, 4); steps(D, 8); }
    assert.ok(h.z > 0.1, `drifted out (z ${h.z.toFixed(2)}, dist ${w.metrics.dist.toFixed(2)})`);
    assert.ok(Math.abs(h.z - (w.metrics.dist - 1) / (OCEAN.CAP - 1)) < 0.02);
    check('far');
  } finally { run.done(); }
});

test('ocean: the 2D placeholder (it draws itself) is untouched by the layer compensation', async () => {
  const h = layerThought({ x: 200, y: 600 });
  delete h.r; delete h.ov; delete h.extent;
  h.draw = () => {};
  const run = await play('luminous-ocean', h, { layer: false });
  try {
    const { D } = run;
    assert.equal(h.calls.react[0], 'appear');
    steps(D, 3);
    const T = D.world.debug.thought;
    assert.ok(Math.abs(h.y - T.sy) < 0.01, 'no lift taken out');
    assert.ok(Math.abs(h.scale * (1 - 0.5 * h.z) - T.surf) < 0.01);
  } finally { run.done(); }
});
