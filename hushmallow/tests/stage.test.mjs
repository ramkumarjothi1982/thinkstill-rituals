// The Hushfold stage (src/hushfold/stage.js): the Mallow adapters — the same calls over the classic
// MallowRig (through app.world) and over a MallowTouch instance — and createStage on one loop with the
// real ThoughtLayer (B2): the world ticks first, then the thoughts are drawn, in the rig's shared loop.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStageMallow, createStage } from '../src/hushfold/stage.js';
import { addTicker, removeTicker } from '../src/mallows/rig.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

/** A MallowTouch stand-in that records every call and its arguments. */
function fakeTouch({ ready = false } = {}) {
  const calls = [];
  const rec = (name) => (...args) => { calls.push([name, ...args]); return t; };
  const listeners = {};
  const t = {
    id: 'glitzi', ready, loaded: Promise.resolve(null), stats: { tier: 'B' }, rig: { id: 'glitzi' },
    calls,
    setEmotion: rec('setEmotion'), setStage: rec('setStage'), react: rec('react'), lookAt: rec('lookAt'),
    place: rec('place'), float: rec('float'), setMallow: rec('setMallow'), wheel: rec('wheel'), pointer: rec('pointer'),
    bodyRect: () => ({ left: 100, top: 300, width: 180, height: 190, right: 280, bottom: 490, cx: 190, cy: 395 }),
    rect() { return this.bodyRect(); },
    hitTest: () => true,
    on(ev, fn) { (listeners[ev] ||= []).push(fn); return t; },
    off(ev, fn) { listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn); return t; },
    listeners,
  };
  return t;
}
const callsOf = (t, name) => t.calls.filter((c) => c[0] === name).map((c) => c.slice(1));

function fakeWorld(extra = {}) {
  const realmCalls = [];
  const rect = { left: 120, top: 400, width: 150, height: 160, right: 270, bottom: 560, cx: 195, cy: 480 };
  return {
    realmCalls,
    mallowId: 'boppo',
    realm: { setEmotion: (...a) => realmCalls.push(a) },
    bodyRect: () => ({ ...rect }),
    setEmotion() {}, setStage() {}, react() {}, place() {},
    ...extra,
  };
}

test('touch adapter: setStage / react pass their options through (quiet reaches MallowTouch)', () => {
  const t = fakeTouch();
  const m = createStageMallow(fakeWorld(), { touch: t });
  assert.equal(m.kind, 'touch');
  assert.equal(m.multiTouch, true);
  m.setStage('comforting', { quiet: true });
  m.react('nod', { quiet: true });
  m.setStage('neutral');
  assert.deepEqual(callsOf(t, 'setStage'), [['comforting', { quiet: true }], ['neutral', undefined]]);
  assert.deepEqual(callsOf(t, 'react'), [['nod', { quiet: true }]]);
});

test('touch adapter: fit() places the body with place({x, y, size}) (no private stage maths, no entrance glide)', () => {
  const t = fakeTouch();
  const m = createStageMallow(fakeWorld(), { touch: t });
  m.fit({ cx: 195, cy: 486, size: 257 });
  assert.deepEqual(callsOf(t, 'place'), [[{ x: 195, y: 486, size: 257 }]]);
  // the adapter never reads MallowTouch's private stage state
  const src = read('src/hushfold/stage.js');
  const adapter = src.slice(src.indexOf('function touchAdapter('), src.indexOf('// ------------------------------------------------------ stage canvas --'));
  assert.doesNotMatch(adapter, /t\._P\(|t\.st\b/);
});

test('touch adapter: ready follows MallowTouch; loaded, tier, setMallow and wheel are passed through', async () => {
  const t = fakeTouch({ ready: false });
  const m = createStageMallow(fakeWorld(), { touch: t });
  assert.equal(m.ready, false, 'not ready until MallowTouch is');
  t.ready = true;
  assert.equal(m.ready, true);
  assert.equal(m.loaded, t.loaded);
  assert.equal(m.tier, 'B');
  m.setMallow('zuzu');
  assert.deepEqual(callsOf(t, 'setMallow'), [['zuzu']]);
  const w = { x: 10, y: 20, deltaY: -40, t: 5 };
  m.wheel(w);
  assert.deepEqual(callsOf(t, 'wheel'), [[w]]);
  // a MallowTouch without wheel() (older builds) is fine
  delete t.wheel;
  assert.doesNotThrow(() => m.wheel(w));
});

test('touch adapter: setEmotion reaches MallowTouch with its options and the realm with the strongest feeling', () => {
  const t = fakeTouch();
  const world = fakeWorld();
  const m = createStageMallow(world, { touch: t });
  m.setEmotion({ sad: 0.3, angry: 0.6, neutral: 0.1 }, 0.8, { instant: true });
  m.setEmotion('calm');
  assert.deepEqual(callsOf(t, 'setEmotion'), [[{ sad: 0.3, angry: 0.6, neutral: 0.1 }, 0.8, { instant: true }], ['calm', undefined, undefined]]);
  assert.deepEqual(world.realmCalls, [['angry', 0.8], ['calm', 0.7]]);
  // no world, or a world without a realm yet: MallowTouch still gets it
  assert.doesNotThrow(() => createStageMallow({ realm: null }, { touch: t }).setEmotion({}, 0.5));
});

test('touch adapter: rect() and float() are there (the Hushflow worlds call them)', () => {
  const t = fakeTouch();
  const m = createStageMallow(fakeWorld(), { touch: t });
  assert.equal(typeof m.rect, 'function');
  assert.equal(typeof m.float, 'function');
  assert.deepEqual(m.rect(), t.bodyRect());
  m.float({ lift: 0.2, tilt: -3 });
  assert.deepEqual(callsOf(t, 'float'), [[{ lift: 0.2, tilt: -3 }]]);
  // on() returns an unsubscribe
  const fn = () => {};
  const off = m.on('touch', fn);
  assert.equal(t.listeners.touch.length, 1);
  off();
  assert.equal(t.listeners.touch.length, 0);
});

/** A rig stand-in: its canvas sits in a holder at (layer.left, layer.top), 300 × 330 CSS px. */
function fakeRig() {
  const holderRect = { left: 45, top: 260, width: 300, height: 330 };
  const holder = { getBoundingClientRect: () => ({ ...holderRect, right: 345, bottom: 590 }) };
  const style = {};
  const canvas = { style, parentElement: holder, getBoundingClientRect: () => ({ ...holderRect, right: 345, bottom: 590 }) };
  return {
    canvas, ready: true, W: 300, H: 330, S: 0.5, CX: 150, BASE: 290, mallow: { bodyBox: [40, 60, 340, 380] },
    on() {}, lookAt() {}, _hit: () => true,
  };
}

test('rig adapter: rect() is the body box, and float() moves the rig canvas with CSS translate / rotate', () => {
  const world = fakeWorld();
  const m = createStageMallow(world);
  assert.equal(m.kind, 'rig');
  assert.equal(m.multiTouch, false);
  assert.equal(typeof m.rect, 'function');
  assert.equal(typeof m.float, 'function');
  assert.deepEqual(m.rect(), world.bodyRect());
  assert.doesNotThrow(() => m.float({ lift: 0.3 }), 'no rig attached yet: nothing to move');
  const rig = fakeRig();
  m.attach(rig);
  // the rest box: bodyBox × S on the holder, without the float (300 × 0.5 = 150 wide, 320 × 0.5 = 160 tall)
  const rest = m.restRect();
  assert.equal(Math.round(rest.width), 150);
  assert.equal(Math.round(rest.height), 160);
  m.float({ lift: 0.25, tilt: 4 });
  assert.equal(rig.canvas.style.translate, '0 -40px', 'lift is in body heights (0.25 × 160 px, up)');
  assert.equal(rig.canvas.style.rotate, '4deg');
  assert.equal(rig.canvas.style.transformOrigin, '50% 82%');
  m.float({ lift: 0, tilt: 0 });
  assert.equal(rig.canvas.style.translate, '');
  assert.equal(rig.canvas.style.rotate, '');
  // detach() takes the float off the canvas it leaves
  m.float({ lift: -0.1, tilt: -2.5 });
  assert.equal(rig.canvas.style.translate, '0 16px');
  m.detach();
  assert.equal(rig.canvas.style.translate, '');
  assert.equal(rig.canvas.style.rotate, '');
  assert.equal(m.rig, null);
});

test('both adapters: the same calls, and the shape the router test pins', () => {
  const rigAd = createStageMallow(fakeWorld());
  const touchAd = createStageMallow(fakeWorld(), { touch: fakeTouch({ ready: true }) });
  for (const k of ['setEmotion', 'setStage', 'react', 'lookAt', 'place', 'float', 'bodyRect', 'rect', 'hitTest', 'pointer', 'on', 'attach', 'detach', 'destroy']) {
    assert.equal(typeof rigAd[k], 'function', `rig: ${k}`);
    assert.equal(typeof touchAd[k], 'function', `touch: ${k}`);
  }
  for (const k of ['fit', 'setMallow', 'wheel']) assert.equal(typeof touchAd[k], 'function', `touch: ${k}`);
  const src = read('src/hushfold/stage.js');
  assert.match(src, /kind: 'rig',[\s\S]*?multiTouch: false/);
  assert.match(src, /kind: 'touch',[\s\S]*?multiTouch: true/);
  assert.match(src, /if \(touch\) return touchAdapter\(touch, world\);/);
});

test('world.releaseMallow: the classic rig is destroyed and its holder removed; setMallow builds a fresh one', () => {
  const src = read('src/app/world.js');
  const body = src.slice(src.indexOf('releaseMallow() {'), src.indexOf('setEmotion(mix, intensity'));
  assert.ok(body.length > 0, 'releaseMallow exists');
  assert.match(body, /rig = null; mallowId = null;/);
  assert.match(body, /\.destroy\(\)/);
  assert.match(body, /\.container\?\.remove\(\)/);
});

// ------------------------------------------------------- createStage (B2) --
// A browser stand-in just big enough for createStage: a fake canvas whose 2D context takes any call (and
// counts the clears), a fake #fx-layer, the viewport, and a requestAnimationFrame that only books — the
// test runs the rig's shared loop one frame at a time. No document.body: the real ThoughtLayer has no
// word tags here. (The frame the rig's loop booked is kept across stand-ins, as a page keeps it.)
let booked = null, books = 0;
function browser() {
  const clears = { n: 0 };
  const grad = { addColorStop() {} };
  const canvas = { width: 0, height: 0, style: {}, setAttribute() {}, remove() { canvas.removed = true; }, getBoundingClientRect: () => ({ left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 }) };
  const ctx = new Proxy({ canvas }, {
    get: (o, k) => (k in o ? o[k] : k === 'clearRect' ? () => { clears.n++; } : () => grad),
    set: (o, k, v) => { o[k] = v; return true; },
  });
  canvas.getContext = () => ctx;
  const head = { appendChild() {} };
  const saved = {};
  for (const k of ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'innerWidth', 'innerHeight', 'devicePixelRatio']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  Object.assign(globalThis, {
    document: { createElement: (t) => (t === 'canvas' ? canvas : { style: {}, setAttribute() {} }), head, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: (fn) => { booked = fn; return ++books; },
    cancelAnimationFrame: () => { booked = null; },
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
  });
  const fx = { children: [], replaceChildren(...c) { fx.children = c; }, classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); } } };
  let t = 1000;
  return {
    canvas, ctx, clears, fx,
    get books() { return books; },
    /** One frame of the shared loop (it books the next one first). */
    frame(ms = 1000 / 60) { const f = booked; booked = null; t += ms; if (f) f(t); return !!f; },
    restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } },
  };
}

test('createStage: no animation loop of its own; it ticks in the rig\'s shared loop and loads the real ThoughtLayer', () => {
  const src = read('src/hushfold/stage.js');
  assert.doesNotMatch(src, /requestAnimationFrame\(/, 'no loop of its own');
  assert.doesNotMatch(src, /visibilitychange/, 'the shared loop handles hidden tabs');
  assert.match(src, /import \{ addTicker, removeTicker[^}]*\} from '\.\.\/mallows\/rig\.js';/);
  assert.match(src, /import\('\.\.\/mallows\/thought\/index\.js'\)/, 'the ThoughtLayer, loaded lazily');
  // the placeholder thoughts are gone
  assert.doesNotMatch(src, /createThoughtLayer|function drawThought|BASE_TENSION|TINTS|hf-tag/);
  // the person's words: the stage never writes them to the DOM; the ThoughtLayer does, with textContent only,
  // and keeps them on the device
  assert.doesNotMatch(src, /\bhtml:|innerHTML/);
  for (const f of ['layer.js', 'thought.js', 'render.js', 'belief.js', 'styles.js', 'index.js']) {
    assert.doesNotMatch(read(`src/mallows/thought/${f}`), /innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon/, f);
  }
  assert.match(read('src/mallows/thought/layer.js'), /tg\.words\.textContent = text;/);
});

test('createStage (B2 ordering): a world writes thought.x in its tick; the same tick draws it there (one loop)', async () => {
  const B = browser();
  try {
    const { ThoughtLayer } = await import('../src/mallows/thought/index.js');
    const stage = createStage({ fx: B.fx, reducedMotion: () => false, keepOut: () => null });
    assert.deepEqual(B.fx.children, [B.canvas]);
    const layer = await stage.whenThoughts();
    assert.ok(layer instanceof ThoughtLayer, 'the real ThoughtLayer');
    assert.equal(stage.thoughts, layer);
    const th = stage.thoughts.add({ text: 'My boss embarrassed me today.', emotion: 'embarrassment', intensity: 0.7 }, { x: 100, y: 300 });
    // a fake world on the stage's world ticker (as the director registers with { ticker: stage.worldTicker })
    let n = 0;
    const world = () => { n++; th.x = 200 + 10 * n; th.y = 320; };
    stage.worldTicker.add(world);
    stage.start();
    const books0 = B.books;
    for (let i = 0; i < 30; i++) {
      assert.ok(B.frame(), 'the shared loop is running');
      const drawnAt = th.render.cx - th.off.x;
      assert.ok(Math.abs(drawnAt - (200 + 10 * n)) < 1, `frame ${i}: drawn at ${drawnAt.toFixed(2)}, the world wrote ${200 + 10 * n}`);
    }
    assert.equal(n, 30, 'the world ticked once a frame');
    assert.equal(B.books - books0, 30, 'one requestAnimationFrame a frame: the shared loop only');
    // control: a world on its own ticker after the stage's lags a frame behind (what the order prevents)
    stage.worldTicker.remove(world);
    const late = () => { n++; th.x = 200 + 10 * n; };
    addTicker(late);
    B.frame(); B.frame();
    const lag = 200 + 10 * n - (th.render.cx - th.off.x);
    assert.ok(lag > 9, `a world ticking after the layer is drawn a frame late (${lag.toFixed(1)} px)`);
    removeTicker(late);
    stage.destroy();
  } finally { B.restore(); }
});

test('createStage: freeze holds the thoughts still while the world still ticks; idle frames draw nothing', async () => {
  const B = browser();
  try {
    const stage = createStage({ fx: B.fx, reducedMotion: () => false });
    await stage.whenThoughts();
    stage.start();
    // idle: nothing on the canvas, nothing cleared
    assert.ok(B.frame(), 'the shared loop is running');
    const c0 = B.clears.n; B.frame(); B.frame();
    assert.equal(B.clears.n, c0, 'an idle stage does not clear or draw');
    // a ripple draws until it has faded, then one last clear, then idle again
    stage.ripple(100, 100);
    for (let i = 0; i < 70; i++) B.frame();
    const c1 = B.clears.n; B.frame(); B.frame();
    assert.ok(c1 > c0 + 40, `the ripple was drawn (${c1 - c0} frames)`);
    assert.equal(B.clears.n, c1, 'idle once it has faded');
    // freeze: the world ticks on, the thought is not stepped
    const th = stage.thoughts.add({ text: 'Nobody texted me back', emotion: 'sadness' }, { x: 260, y: 300 });
    let n = 0;
    stage.worldTicker.add(() => { n++; });
    for (let i = 0; i < 10; i++) B.frame();
    stage.freeze(true);
    assert.equal(stage.frozen, true);
    B.frame();       // (the frame that freeze asked for: drawn as it is)
    const clk = th.clock, cx = th.render.cx, n0 = n, c2 = B.clears.n;
    for (let i = 0; i < 20; i++) B.frame();
    assert.equal(n, n0 + 20, 'the world still ticks (the director keeps its own pause)');
    assert.equal(th.clock, clk, 'the thought is not stepped');
    assert.equal(th.render.cx, cx, 'and holds still where it is drawn');
    assert.equal(B.clears.n, c2, 'nothing is redrawn');
    stage.freeze(false);
    B.frame(); B.frame();
    assert.ok(th.clock > clk, 'it lives again');
    // a world ticker that throws does not stop the thoughts
    stage.worldTicker.add(() => { throw new Error('boom'); });
    const err = console.error; console.error = () => {};
    try { const k = th.clock; B.frame(); B.frame(); assert.ok(th.clock > k, 'the thoughts are still drawn'); } finally { console.error = err; }
    stage.destroy();
  } finally { B.restore(); }
});

test('createStage: before the layer loads, `thoughts` is an empty stand-in that forwards once it has (the router keeps it)', async () => {
  const B = browser();
  try {
    const stage = createStage({ fx: B.fx });
    const early = stage.thoughts;
    assert.ok(Object.isFrozen(early));
    assert.deepEqual(early.list, []);
    assert.ok(Object.isFrozen(early.list));
    assert.equal(early.primary, null);
    assert.deepEqual(early.rects(), []);
    assert.equal(early.hitTest(10, 10), null);
    assert.equal(early.pointer({ type: 'down', id: 1, x: 0, y: 0 }), false);
    assert.equal(early.roominess, Infinity);
    assert.equal(early.tagOf({}), null);
    assert.doesNotThrow(() => { early.release(900); early.hideTags(true); early.hideTags(false); early.relayout(); });
    // a Tell before the layer is there: the thought is added once it is
    assert.equal(early.add({ text: 'I said the wrong thing again', emotion: 'frustration' }, { x: 280, y: 260 }), null);
    const layer = await stage.whenThoughts();
    assert.equal(layer.list.length, 1, 'added once the layer loaded');
    assert.equal(layer.list[0].text, 'I said the wrong thing again', 'the exact words');
    // the stand-in the router kept reaches the layer
    stage.start();
    for (let i = 0; i < 60; i++) B.frame();
    const th = layer.list[0];
    assert.equal(early.list, layer.list);
    assert.equal(early.primary, th);
    assert.equal(early.hitTest(th.render.cx, th.render.cy), th, 'touches reach the thought through it');
    assert.ok(early.pointer({ type: 'down', id: 4, x: th.render.cx, y: th.render.cy, t: performance.now() }));
    assert.ok(th.pressed, 'squeezable through the stand-in');
    early.pointer(th, { type: 'up', id: 4, x: th.render.cx, y: th.render.cy, t: performance.now() });
    assert.deepEqual(early.rects().map((r) => r.id), [th.id]);
    // destroy: the layer goes, `thoughts` is empty again, the shared loop no longer ticks the stage
    stage.destroy();
    assert.equal(th.destroyed, true);
    assert.deepEqual(stage.thoughts.list, []);
    assert.equal(B.canvas.removed, true);
    assert.ok(!B.fx.classList.s.has('live'));
    const b0 = B.books;
    B.frame();
    assert.equal(B.books, b0, 'nothing left on the shared loop: it stops');
    // destroyed before it loaded: whenThoughts() gives null
    const s2 = createStage({ fx: B.fx });
    s2.destroy();
    assert.equal(await s2.whenThoughts(), null);
  } finally { B.restore(); }
});

test('createStage: with no bounds() the thoughts keep under the shell\'s top bar and subtitle band and over its dock; a shell\'s own bounds win', async () => {
  const B = browser();
  try {
    const pill = (top, hidden = false, cls = '') => ({ hidden, classList: { contains: (c) => cls === c }, getBoundingClientRect: () => ({ top, height: 48 }) });
    const dock = { children: [pill(700, true), pill(760, false, 'is-hidden'), pill(778)] };
    const top = { getBoundingClientRect: () => ({ bottom: 58 }) };
    const tagRoot = { querySelector: (s) => (s === '.hf-top' ? top : s === '.hf-dock' ? dock : null) };
    const stage = createStage({ fx: B.fx, tagRoot });
    const L = await stage.whenThoughts();
    const b = L.bounds();
    assert.equal(Math.round(b.top), Math.round(58 + 844 * 0.17), 'under the top bar and its subtitle band (0.17 H)');
    assert.equal(b.bottom, 768, 'over the visible dock pill, 10 px clear (hidden pills do not count)');
    assert.equal(b.left, undefined, 'the sides stay the layer\'s own');
    assert.equal(L.bounds(), b, 'read at most four times a second');
    stage.destroy();
    // nothing to read: the layer's own default
    const s2 = createStage({ fx: B.fx });
    assert.equal((await s2.whenThoughts()).bounds(), null);
    s2.destroy();
    // the shell's own bounds
    const mine = () => ({ left: 10, top: 100, right: 300, bottom: 500 });
    const s3 = createStage({ fx: B.fx, tagRoot, bounds: mine });
    assert.equal((await s3.whenThoughts()).bounds, mine);
    s3.destroy();
  } finally { B.restore(); }
});

test('createStage: every stage and stage.thoughts call in the Hushfold scene exists (the current shell works as it is)', async () => {
  const shell = read('src/app/scenes/hushfold.js');
  const B = browser();
  try {
    const stage = createStage({ fx: B.fx });
    const early = stage.thoughts;
    const layer = await stage.whenThoughts();
    const thoughtCalls = [...new Set([...shell.matchAll(/\bstage\??\.thoughts\.(\w+)/g)].map((m) => m[1]))];
    const stageCalls = [...new Set([...shell.matchAll(/(?<![\w/.'])stage\??\.(\w+)/g)].map((m) => m[1]))].filter((k) => k !== 'thoughts');
    assert.ok(thoughtCalls.length >= 3 && stageCalls.length >= 2, `found ${thoughtCalls} / ${stageCalls}`);
    for (const k of thoughtCalls) {
      assert.ok(k in early, `stand-in: thoughts.${k}`);
      assert.ok(k in layer, `ThoughtLayer: thoughts.${k}`);
    }
    for (const k of [...stageCalls, 'thoughts', 'whenThoughts', 'start', 'worldTicker', 'freeze', 'ripple', 'kick', 'size', 'canvas', 'destroy']) assert.ok(k in stage, `stage.${k}`);
    // the options the scene passes are all createStage options
    const call = shell.match(/createStage\(\{([\s\S]*?)\}\);/)?.[1] || '';
    const sig = read('src/hushfold/stage.js').match(/export function createStage\(\{([\s\S]*?)\} = \{\}\)/)[1];
    // (the top-level keys of the scene's options object)
    const keys = [];
    let depth = 0, at = 0;
    for (let i = 0; i <= call.length; i++) {
      const ch = call[i] ?? ',';
      if ('({['.includes(ch)) depth++;
      else if (')}]'.includes(ch)) depth--;
      else if (ch === ',' && depth === 0) { const m = call.slice(at, i).match(/^\s*(\w+)\s*(?::|$)/); if (m) keys.push(m[1]); at = i + 1; }
    }
    assert.ok(call && keys.length >= 4, `the scene's createStage options: ${keys}`);
    for (const k of ['fx', 'tagRoot', 'keepOut']) assert.ok(keys.includes(k), `the scene passes ${k}`);
    for (const k of keys) assert.match(sig, new RegExp(`\\b${k}\\b`), `createStage takes ${k}`);
    // what the scene's layout() reads off a thought (until the shell's pass 3 moves it into the layer)
    const th = layer.add({ text: 'My boss embarrassed me today.', emotion: 'embarrassment', intensity: 0.6, from: { x: 195, y: 300 }, home: { x: 300, y: 420 }, r: 38 });
    assert.equal(th.r, 38);
    assert.equal(typeof th.moveHome, 'function');
    assert.equal(th.text, 'My boss embarrassed me today.');
    assert.deepEqual({ x: Math.round(th._want.x), y: Math.round(th._want.y) }, { x: 300, y: 420 }, 'add({text, …, from, home, r}) in one object, as the scene calls it');
    stage.destroy();
  } finally { B.restore(); }
});
