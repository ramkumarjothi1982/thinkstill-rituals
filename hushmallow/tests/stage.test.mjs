// The Hushfold stage's Mallow adapters (src/hushfold/stage.js): the same calls over the
// classic MallowRig (through app.world) and over a MallowTouch instance.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStageMallow } from '../src/hushfold/stage.js';

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
