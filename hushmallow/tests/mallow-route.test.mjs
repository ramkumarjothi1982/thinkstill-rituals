// MallowTouch's routed input (the Hushfold's input router calls pointer() and
// wheel() instead of MallowTouch binding its own listeners): a Shift-drag
// stretches through routed moves, and a routed ctrl+wheel (trackpad pinch)
// stretches around the cursor. No DOM: the real MallowTouch glue on a
// stand-in rig, as in touch.test.mjs's core tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MALLOWS } from '../src/mallows/registry.js';
import { MallowTouch } from '../src/mallows/touch/mallow-touch.js';
import { REACTIONS } from '../src/mallows/reactions.js';

function core(id = 'blubi') {
  const events = [];
  const m = MALLOWS[id], q = 640 / Math.max(...m.size);
  const mt = Object.create(MallowTouch.prototype);
  const rig = {
    id, mallow: m, q, skin: { width: Math.round(m.size[0] * q), height: Math.round(m.size[1] * q) }, assets: { mask: null },
    body: { hop: 0, hopV: 0, tilt: 0, spin: 0, lean: 0, grounded: true, glitchBurst: 0, burstRows: [] },
    val: { float: 0, tremble: 0, breath: 1, squashBias: 0, droop: 0, shrink: 0, cheekPuff: 0, glitch: 0 },
    time: 0, breathPhase: 0, overlays: [], opts: { reducedMotion: false, audio: null }, cycles: {}, particles: { burst() {}, list: [], cloud: 0 },
    react(kind) {
      const r = REACTIONS[id]?.[kind] || REACTIONS._shared[kind], imp = r?.impulse || {};
      mt._impulse({ squash: (imp.squash || 0) * 6, lean: (imp.lean || 0) * 4, shear: (imp.shear || 0) * 5 }, kind);
      return this;
    },
    overlay() { return this; },
    looks: 0, lookAt() { this.looks++; }, setTouch(T) { this.touch = T; }, describe() { return id; }, on() {},
  };
  mt._setup({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 800 }) }, { id, haptic() {}, audio: { play() {} } });
  mt.rig = rig;
  mt._initBody(); mt._initReader();
  mt.view.w = 1280; mt.view.h = 800;
  mt.place({ x: 640, y: 420 }, { instant: true });
  mt._settle();
  mt.ready = true;
  mt.on('touch', (e) => events.push(e.kind));
  // routed events carry t in ms on the performance.now() clock; frames run on
  // seconds. The fake clock starts ahead of the real one, so MallowTouch's
  // input-lag estimate (now - e.t) stays 0 however loaded the machine is.
  let ms = Math.ceil(performance.now()) + 2000;
  const frame = (n = 1) => { for (let i = 0; i < n; i++) { ms += 1000 / 60; rig.time += 1 / 60; mt._physics(1 / 60, ms / 1000); } };
  return { mt, rig, events, frame, at: () => ms };
}

test('route: a routed Shift-drag (mouse) stretches the Mallow through its moves', () => {
  const c = core();
  const r = c.mt.bodyRect();
  const x0 = r.cx, y0 = r.cy;
  assert.equal(c.mt.pointer({ type: 'down', id: 7, x: x0, y: y0, t: c.at(), shift: true, mouse: true }), true, 'the Shift press is the Mallow’s');
  assert.ok(c.mt.reader._shift, 'Shift-drag started (two virtual fingers)');
  c.frame(2);
  const bx0 = c.mt.reader.ptrs.get('shiftB').x;
  let maxStretch = 1;
  for (let i = 1; i <= 24; i++) {
    // false here would mean the move was taken as hover gaze (the old rule)
    const took = c.mt.pointer({ type: 'move', id: 7, x: x0 + i * 6, y: y0, t: c.at(), shift: true, mouse: true });
    assert.equal(took, true, `move ${i} reaches the virtual fingers`);
    c.frame();
    maxStretch = Math.max(maxStretch, c.mt.touch.stretch);
  }
  assert.ok(c.mt.reader.ptrs.get('shiftB').x > bx0 + 40, 'the virtual fingers followed the drag');
  assert.ok(maxStretch > 1.2, `stretch ${maxStretch.toFixed(2)} > 1.2`);
  assert.equal(c.mt.pointer({ type: 'up', id: 7, x: x0 + 144, y: y0, t: c.at() }), true);
  assert.equal(c.mt.reader._shift, null, 'the Shift-drag ended');
  c.frame(30);
  assert.ok(c.events.includes('stretch'), `events ${c.events.join(',')}`);
});

test('route: a move from a pointer that is not on the Mallow is still hover gaze', () => {
  const c = core();
  const r = c.mt.bodyRect();
  const looks = c.rig.looks;
  assert.equal(c.mt.pointer({ type: 'move', id: 3, x: r.cx + 300, y: r.cy, t: c.at(), mouse: true }), false);
  assert.equal(c.rig.looks, looks + 1, 'the Mallow looked towards the cursor');
});

test('route: a routed ctrl+wheel over the body stretches (trackpad pinch), and ends on its own', () => {
  const c = core();
  const r = c.mt.bodyRect();
  assert.equal(typeof c.mt.wheel, 'function');
  assert.equal(c.mt.wheel({ x: r.cx + r.width * 2, y: r.cy, deltaY: -10, t: c.at() }), false, 'a wheel off the body is not the Mallow’s');
  let maxStretch = 1;
  for (let i = 0; i < 12; i++) {
    assert.equal(c.mt.wheel({ x: r.cx, y: r.cy, deltaY: -8, t: c.at() }), true, `wheel ${i} is the Mallow’s`);
    c.frame(2);
    maxStretch = Math.max(maxStretch, c.mt.touch.stretch);
  }
  assert.ok(maxStretch > 1.2, `stretch ${maxStretch.toFixed(2)} > 1.2`);
  c.frame(40);   // 220 ms after the last wheel event the pinch lets go
  assert.equal(c.mt.reader._wheel, null, 'the pinch ended');
  assert.equal(c.mt.pressed, false);
  // not ready: nothing is taken
  c.mt.ready = false;
  assert.equal(c.mt.wheel({ x: r.cx, y: r.cy, deltaY: -8, t: c.at() }), false);
});
