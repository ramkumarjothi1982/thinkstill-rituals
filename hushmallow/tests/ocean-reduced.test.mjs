// The Luminous Ocean with reduced motion (final main polish, item 4): reduced motion softens how the sea looks, never
// what it does. The person's swells show 0.4 of their height, but carry the Thought Mallow out as far as anyone's, so
// the 'distance' discovery (and its A Little More Room) is reached with the same strokes in about the same time.
// (Before: sculptStroke cut the amplitude itself, and with it the Stokes drift ∝ A²: 1.5·Z0 after 100 s, not 4.3.)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SEA, Sea, strokePacket, makeCamera } from '../src/hushfold/flow/worlds/ocean-sea.js';
import { planOcean } from '../src/hushfold/flow/worlds/ocean-rules.js';
import { createRegistry, WORLDS } from '../src/hushfold/flow/registry.js';

test('sea: look scales how tall a swell looks (height, slopes, crest lines, rows), never its drift or whether it is seen', () => {
  const W = 390, H = 844, U = Math.min(W, H);
  const plan = planOcean({ W, H, band: { x: 0, y: 76, w: 0, h: 143 }, mallow: null, textW: 245, n: 7 });
  const cam = makeCamera({ W, H, hy: plan.hy, homeY: plan.homeY, waterY: plan.waterY });
  const P = strokePacket(cam, U, { x0: W / 2, y0: cam.homeY + 120, x1: W / 2, y1: cam.homeY - 60, len: 180, speed: 0.2 * U });
  const full = new Sea(), soft = new Sea();
  const i = full.launch({ ...P }), j = soft.launch({ ...P, look: 0.4 });
  assert.equal(full.look[i], 1);
  assert.ok(Math.abs(soft.look[j] - 0.4) < 1e-6);
  for (let t = 0; t < 2; t += 1 / 30) { full.step(1 / 30); soft.step(1 / 30); }
  full.prepare(); soft.prepare();
  const a = {}, b = {}, z = P.z, x = P.x;
  full.sample(x, z, a); soft.sample(x, z, b);
  assert.ok(Math.abs(a.h) > 0.5, `a real swell here (${a.h})`);
  assert.ok(Math.abs(b.h / a.h - 0.4) < 0.02, `it shows 0.4 of its height (${(b.h / a.h).toFixed(3)})`);
  assert.ok(Math.abs(b.amp / a.amp - 0.4) < 0.02);
  assert.ok(Math.abs(a.uz) > 0, 'it drifts what floats');
  assert.ok(Math.abs(b.uz - a.uz) < 1e-9 && Math.abs(b.ux - a.ux) < 1e-9, 'the same drift');
  const la = {}, lb = {};
  full.heightLong(x, z, 0, la); soft.heightLong(x, z, 0, lb);
  assert.ok(Math.abs(lb.h / la.h - 0.4) < 0.02, 'crest lines follow how it looks');
  assert.equal(soft.peakPx(j, cam), full.peakPx(i, cam), 'it counts as seen just the same');
  assert.equal(soft.energy(), full.energy(), 'and carries the same energy');
  // the render rows agree with sampling (row recurrences scaled the same way)
  const n = 8, F = () => new Float32Array(n), R = [F(), F(), F(), F(), F(), F()], S = [F(), F(), F(), F(), F(), F()];
  full.row(z, x - 40, 10, n, 4, 0, ...R, false); soft.row(z, x - 40, 10, n, 4, 0, ...S, false);
  for (let c = 0; c < n; c++) if (Math.abs(R[0][c]) > 0.2) assert.ok(Math.abs(S[0][c] / R[0][c] - 0.4) < 0.03, `row ${c}`);
  // sculpting keeps (or sets) it; a ring takes it too
  const k = soft.launch({ ...P, free: false, look: 0.4 });
  soft.sculpt(k, { ...P });
  assert.ok(Math.abs(soft.look[k] - 0.4) < 1e-6, 'a sculpt without look keeps it');
  soft.sculpt(k, { ...P, look: 1 });
  assert.equal(soft.look[k], 1);
  const r = soft.ringAt(x, z, 0.32 * U, 0.028 * 0.32 * U, true, 0.4);
  assert.ok(Math.abs(soft.look[r] - 0.4) < 1e-6);
  assert.ok(SEA.STOKES > 0);
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
  return { rect: () => r, bodyRect: () => r, react() {}, setEmotion() {}, lookAt() {}, float() {} };
};
const fakeThought = () => ({ id: 't', token: 'My boss embarrassed me today.', text: 'My boss embarrassed me today.', x: 0, y: 0, z: 0, scale: 1, state: { tension: 0.6 }, react() {}, hitTest: () => false, pointer() {} });
function stroke(D, x0, y0, x1, y1, pxPerSec, id = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round((len / pxPerSec) * 30));
  let t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x: x0, y: y0, t, pointerType: 'touch' });
  for (let i = 1; i <= n; i++) { t += 1000 / 30; D.pointer({ type: 'move', id, x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, t, pointerType: 'touch' }); D.debug.step(1 / 30); }
  D.pointer({ type: 'up', id, x: x1, y: y1, t: t + 16, pointerType: 'touch' });
}
const steps = (D, sec, dt = 1 / 15) => { for (let t = 0; t < sec; t += dt) D.debug.step(dt); };

/** The same slow strokes away from you, with or without reduced motion: how far the thought drifts, and when 'distance' fires. */
async function drift(reducedMotion) {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, found = [], offers = [];
    const subtitles = { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow: fakeMallow(W, H), thought: fakeThought(), subtitles, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion, safeRect: () => ({ x: 20, y: 64, w: W - 40, h: 400 }) });
    D.on('discovery', (e) => found.push({ ...e, t: D.debug.time })); D.on('offer', (e) => offers.push(e));
    await D.start({ worldId: 'luminous-ocean', emotion: 'anxious', intention: 'let-go' });
    const w = D.world;
    steps(D, 1.5);
    const t0 = D.debug.time, d0 = w.metrics.dist;
    for (let k = 0; k < 6 && !found.some((e) => e.id === 'distance'); k++) { stroke(D, W / 2 + 6 * k, 720, W / 2, w.debug.surfaceY(Math.max(1.2, w.metrics.dist * 0.8)) - 30, 0.2 * 390, 4); steps(D, 8); }
    steps(D, 0.2);
    await new Promise((r) => setTimeout(r, 0));
    const at = found.find((e) => e.id === 'distance');
    return { d0, dist: w.metrics.dist, at: at ? at.t - t0 : null, more: offers.some((e) => e.skillId === 'a-little-more-room') };
  } finally { D?.destroy(); dom.restore(); }
}

test('world: with reduced motion the thought still drifts out — "distance" and A Little More Room in about the same time', async () => {
  const normal = await drift(false), reduced = await drift(true);
  assert.ok(normal.at != null, `normally reached (${JSON.stringify(normal)})`);
  assert.ok(reduced.at != null, `reduced motion reaches it too (${JSON.stringify(reduced)})`);
  assert.ok(reduced.at <= normal.at * 1.25 + 2, `in a similar time: ${reduced.at.toFixed(1)} s vs ${normal.at.toFixed(1)} s`);
  assert.ok(reduced.dist >= 4, `drifted past 4·Z0 (${reduced.dist.toFixed(2)})`);
  assert.ok(reduced.more, 'A Little More Room is offered');
});
