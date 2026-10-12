// The Hushfold input router (src/hushfold/input-router.js): who owns a touch, what a
// routed event carries, and ctrl + wheel (a desktop trackpad pinch) on the Mallow.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInputRouter } from '../src/hushfold/input-router.js';
import { createStageMallow } from '../src/hushfold/stage.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

/** A fake DOM (as in hushfold.test.mjs): an EventTarget stage and a minimal document. */
function withDom(fn) {
  const prevDoc = globalThis.document, prevW = globalThis.innerWidth, prevH = globalThis.innerHeight;
  globalThis.document = { addEventListener() {}, removeEventListener() {}, body: { classList: { add() {}, remove() {} } } };
  globalThis.innerWidth = 390; globalThis.innerHeight = 844;
  try { return fn(); } finally { globalThis.document = prevDoc; globalThis.innerWidth = prevW; globalThis.innerHeight = prevH; }
}
function stageEl() {
  const el = new EventTarget();
  el.setPointerCapture = () => {};
  return el;
}
const ev = (type, id, x, y, extra = {}) => Object.assign(new Event(type, { cancelable: true }), { pointerId: id, clientX: x, clientY: y, pointerType: 'touch', ...extra });
function wheelEv(x, y, { timeStamp = 1234.5, ...extra } = {}) {
  const e = Object.assign(new Event('wheel', { cancelable: true }), { clientX: x, clientY: y, deltaY: -30, ctrlKey: true, ...extra });
  Object.defineProperty(e, 'timeStamp', { value: timeStamp });   // Event.timeStamp is a getter
  return e;
}

/** The Mallow covers y ≥ 600; the thought covers y < 600 (and x < 200). */
function scene({ mallowWheel } = {}) {
  const got = { mallow: [], thought: [], world: [], empty: [], wheel: [] };
  const mallow = {
    multiTouch: true, hitTest: (x, y) => y >= 600, pointer: (r) => got.mallow.push(r), bodyRect: () => ({ cx: 195, cy: 700 }), lookAt() {},
    ...(mallowWheel ? { wheel: (e) => { got.wheel.push(e); return mallowWheel(e); } } : {}),
  };
  const th = { id: 'th1' };
  const thoughts = { hitTest: (x, y) => (y < 600 && x < 200 ? th : null), pointer: (target, r) => got.thought.push([target, r]) };
  return { got, mallow, thoughts, th, onEmpty: (r) => got.empty.push(r) };
}

test('router: a thought hit reaches thoughts.pointer, and the world while a world owns the thoughts', () => withDom(() => {
  const el = stageEl();
  const s = scene();
  const router = createInputRouter({ el, mallow: s.mallow, thoughts: s.thoughts, onEmpty: s.onEmpty });
  const worldFn = (r) => s.got.world.push(r);

  // no world: the thought's own
  el.dispatchEvent(ev('pointerdown', 1, 100, 300));
  assert.deepEqual(router.owners, ['thought']);
  el.dispatchEvent(ev('pointerup', 1, 100, 300));
  assert.equal(s.got.thought.length, 2);
  assert.equal(s.got.thought[0][0], s.th);

  // a world without the flag (Another Angle's call): still the thought's
  router.setWorld(worldFn);
  assert.equal(router.worldOwnsThoughts, false);
  el.dispatchEvent(ev('pointerdown', 2, 100, 300));
  assert.deepEqual(router.owners, ['thought']);
  el.dispatchEvent(ev('pointerup', 2, 100, 300));
  assert.equal(s.got.world.length, 0);
  assert.equal(s.got.thought.length, 4);

  // a world that owns the thoughts: the world gets the touch (and forwards it itself)
  router.setWorld(worldFn, { thoughts: true });
  assert.equal(router.worldOwnsThoughts, true);
  el.dispatchEvent(ev('pointerdown', 3, 100, 300));
  assert.deepEqual(router.owners, ['world']);
  el.dispatchEvent(ev('pointermove', 3, 120, 310));
  el.dispatchEvent(ev('pointerup', 3, 120, 310));
  assert.deepEqual(s.got.world.map((r) => `${r.id}:${r.type}`), ['3:down', '3:move', '3:up']);
  assert.equal(s.got.thought.length, 4, 'the thought layer saw none of it');

  // the hero Mallow still comes first
  el.dispatchEvent(ev('pointerdown', 4, 100, 700));
  assert.deepEqual(router.owners, ['mallow']);
  el.dispatchEvent(ev('pointerup', 4, 100, 700));

  // the world ends: the flag goes with it; a later world without the flag does not inherit it
  router.setWorld(null, { thoughts: true });
  assert.equal(router.worldOwnsThoughts, false);
  router.setWorld(worldFn);
  assert.equal(router.worldOwnsThoughts, false);
  el.dispatchEvent(ev('pointerdown', 5, 100, 300));
  assert.deepEqual(router.owners, ['thought']);
  el.dispatchEvent(ev('pointerup', 5, 100, 300));
  // empty space beside the thought goes to the world while one runs
  el.dispatchEvent(ev('pointerdown', 6, 300, 300));
  assert.deepEqual(router.owners, ['world']);
  el.dispatchEvent(ev('pointerup', 6, 300, 300));
  assert.doesNotThrow(() => router.setWorld(worldFn, null));
  router.destroy();
}));

test('router: the routed event carries shift and mouse (a mouse Shift-drag stretches the Mallow)', () => withDom(() => {
  const el = stageEl();
  const s = scene();
  const router = createInputRouter({ el, mallow: s.mallow, thoughts: s.thoughts, onEmpty: s.onEmpty });
  el.dispatchEvent(ev('pointerdown', 1, 195, 700, { pointerType: 'mouse', shiftKey: true }));
  el.dispatchEvent(ev('pointermove', 1, 240, 700, { pointerType: 'mouse', shiftKey: true }));
  el.dispatchEvent(ev('pointerup', 1, 240, 700, { pointerType: 'mouse', shiftKey: false }));
  assert.deepEqual(s.got.mallow.map((r) => [r.type, r.shift, r.mouse]), [['down', true, true], ['move', true, true], ['up', false, true]]);
  el.dispatchEvent(ev('pointerdown', 2, 195, 700));
  el.dispatchEvent(ev('pointerup', 2, 195, 700));
  assert.deepEqual(s.got.mallow.slice(-2).map((r) => [r.shift, r.mouse, r.pointerType]), [[false, false, 'touch'], [false, false, 'touch']]);
  // the empty-space, thought and world owners get the same fields
  el.dispatchEvent(ev('pointerdown', 3, 300, 300, { pointerType: 'mouse', shiftKey: true }));
  el.dispatchEvent(ev('pointerup', 3, 300, 300, { pointerType: 'mouse' }));
  assert.equal(s.got.empty[0].shift, true);
  assert.equal(s.got.empty[0].mouse, true);
  router.destroy();
}));

test('router: ctrl + wheel over the Mallow goes to mallow.wheel and never zooms the page', () => withDom(() => {
  const el = stageEl();
  let inPinch = false;
  const s = scene({ mallowWheel: (e) => { if (e.y >= 600) inPinch = true; return inPinch; } });
  const router = createInputRouter({ el, mallow: s.mallow, thoughts: s.thoughts });

  const a = wheelEv(195, 700);
  el.dispatchEvent(a);
  assert.equal(a.defaultPrevented, true);
  assert.deepEqual(s.got.wheel, [{ x: 195, y: 700, deltaY: -30, t: 1234.5 }]);

  // a pinch under way keeps going (and keeps the page still) when the cursor leaves the body
  const b = wheelEv(195, 500);
  el.dispatchEvent(b);
  assert.equal(b.defaultPrevented, true);
  assert.equal(s.got.wheel.length, 2);

  // a plain wheel (scroll) is not the Mallow's
  const c = wheelEv(195, 700, { ctrlKey: false });
  el.dispatchEvent(c);
  assert.equal(c.defaultPrevented, false);
  assert.equal(s.got.wheel.length, 2);

  // off the body with no pinch under way: the browser keeps its own ctrl + wheel
  inPinch = false;
  const d = wheelEv(195, 300);
  el.dispatchEvent(d);
  assert.equal(d.defaultPrevented, false);

  router.destroy();
  const e = wheelEv(195, 700);
  el.dispatchEvent(e);
  assert.equal(e.defaultPrevented, false, 'destroy() removes the wheel listener');
  assert.equal(s.got.wheel.length, 3);
}));

test('router: a Mallow without wheel() (the classic rig) leaves ctrl + wheel to the browser', () => withDom(() => {
  const el = stageEl();
  const s = scene();
  const router = createInputRouter({ el, mallow: s.mallow, thoughts: s.thoughts });
  const a = wheelEv(195, 700);
  el.dispatchEvent(a);
  assert.equal(a.defaultPrevented, false);
  router.destroy();
}));

test('router + touch adapter: ctrl + wheel reaches MallowTouch.wheel with the event clock', () => withDom(() => {
  const el = stageEl();
  const calls = [];
  const t = {
    ready: true, id: 'glitzi', rig: {}, hitTest: (x, y) => y >= 600, pointer() { return true; }, lookAt() {},
    bodyRect: () => ({ cx: 195, cy: 700, left: 100, top: 600, width: 190, height: 200 }),
    wheel: (e) => { calls.push(e); return true; }, on() { return t; },
  };
  const mallow = createStageMallow({}, { touch: t });
  const router = createInputRouter({ el, mallow, thoughts: null });
  const a = wheelEv(195, 700, { deltaY: 12, timeStamp: 5000 });
  el.dispatchEvent(a);
  assert.equal(a.defaultPrevented, true);
  assert.deepEqual(calls, [{ x: 195, y: 700, deltaY: 12, t: 5000 }]);
  router.destroy();
}));

test('router: Another Angle calls setWorld without the thoughts flag, so its routing is unchanged', () => {
  const angle = read('src/beyond/another-angle.js');
  const calls = angle.match(/router\.setWorld\(([^;]*)\);/g) || [];
  assert.ok(calls.length >= 1);
  for (const c of calls) assert.doesNotMatch(c, /thoughts\s*:/, c);
  const src = read('src/hushfold/input-router.js');
  assert.match(src, /else if \(!worldOwnsThoughts && \(th = thoughts\?\.hitTest\?\.\(x, y\)\)\)/);
  assert.match(src, /shift: !!e\.shiftKey, mouse: e\.pointerType === 'mouse'/);
  assert.match(src, /addEventListener\('wheel', wheel, \{ passive: false \}\)/);
});
