// The shared Mallow loop (rig.js): one requestAnimationFrame drives every rig,
// MallowTouch stage, Thought Mallow and world. A rig that throws in its frame
// must not stop the others: the next frame is booked before anything runs.
//
// Runs the real rig.js against a minimal fake DOM (canvas, Image, rAF) so a
// real headless MallowRig joins the loop; its _tick is then made to throw.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---- a minimal browser: canvases that draw nothing, images that load, a manual rAF
const noop = () => {};
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
function fakeCanvas() {
  return {
    width: 1, height: 1, style: {}, tabIndex: -1,
    setAttribute: noop, removeAttribute: noop, remove: noop, addEventListener: noop, removeEventListener: noop,
    getContext: () => ctx2d,
  };
}
globalThis.document = {
  hidden: false,
  createElement: () => fakeCanvas(),
  addEventListener: noop, removeEventListener: noop,
};
globalThis.Image = class {
  constructor() { this.width = 8; this.height = 8; this.naturalWidth = 8; this.naturalHeight = 8; }
  set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); }
  get src() { return this._src; }
};
let queue = new Map();
let nextId = 1;
globalThis.requestAnimationFrame = (fn) => { const id = nextId++; queue.set(id, fn); return id; };
globalThis.cancelAnimationFrame = (id) => { queue.delete(id); };
let now = 1000;
function runFrame() {
  const due = queue; queue = new Map();
  now += 16.7;
  for (const fn of due.values()) fn(now);
  return due.size;
}

const { MallowRig, addTicker, removeTicker } = await import('../src/mallows/rig.js');

test('loop: a rig whose frame throws does not stop the other tickers (next frame booked first)', async () => {
  const errors = [];
  const origError = console.error;
  console.error = (...a) => errors.push(a);
  try {
    const rig = new MallowRig({}, { id: 'boppo', headless: true, interactive: false, particles: false });
    await rig.loaded;
    assert.equal(rig.ready, true, 'the headless rig loaded and joined the loop');
    let rigCalls = 0;
    rig._tick = () => { rigCalls++; throw new Error('a broken rig frame'); };

    const fired = { a: 0, b: 0 };
    const a = addTicker(() => { fired.a++; });
    const b = addTicker(() => { fired.b++; });

    assert.ok(runFrame() >= 1, 'a frame was booked');
    assert.equal(rigCalls, 1, 'the throwing rig ran');
    assert.deepEqual(fired, { a: 1, b: 1 }, 'both tickers fired in the frame the rig threw');
    assert.equal(queue.size, 1, 'exactly one next frame is booked despite the throw');

    runFrame();
    assert.equal(rigCalls, 2);
    assert.deepEqual(fired, { a: 2, b: 2 }, 'both tickers still fire on the next frame');
    assert.equal(queue.size, 1, 'still one loop, not two');

    runFrame();
    assert.deepEqual(fired, { a: 3, b: 3 });
    const rigErrors = errors.filter((e) => String(e[0]).includes('Mallow rig'));
    assert.equal(rigErrors.length, 1, 'the broken rig is logged once, not every frame');
    assert.match(String(rigErrors[0][1]?.message), /a broken rig frame/);

    // a ticker that throws is isolated the same way
    const c = addTicker(() => { throw new Error('a broken ticker'); });
    runFrame(); runFrame();
    assert.deepEqual(fired, { a: 5, b: 5 }, 'a throwing ticker does not stop its siblings');
    assert.equal(errors.filter((e) => String(e[0]).includes('ticker')).length, 1, 'a broken ticker is logged once');
    removeTicker(c);

    // a ticker added during a frame does not start a second loop
    const d = addTicker(() => { addTicker(noop); });
    runFrame();
    assert.equal(queue.size, 1, 'adding a ticker inside a frame keeps one loop');
    removeTicker(d); removeTicker(noop);

    // nothing left: the loop stops instead of spinning
    rig.destroy();
    removeTicker(a); removeTicker(b);
    runFrame();
    assert.equal(queue.size, 0, 'no frame booked once every rig and ticker has left');
    // and it starts again when a ticker joins
    let again = 0;
    const e = addTicker(() => { again++; });
    assert.equal(queue.size, 1);
    runFrame();
    assert.equal(again, 1);
    removeTicker(e);
    runFrame();
    assert.equal(queue.size, 0);
  } finally {
    console.error = origError;
  }
});
