// The shutter displacement that decides P6's single-sample frames
// (engine/render/shutter.js): pure logic over fake states.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shutterDisplacement, STILL_PX } from '../../engine/render/shutter.js';
import { facePolicy, faceMotionArt } from '../../engine/face/cache.js';

const cols = 4, rows = 4, stride = 6, nVerts = (cols + 1) * (rows + 1);
const stub = () => ({ cols, rows, stride, nVerts, data: new Float32Array(nVerts * stride), upload() {} });
const ctx = (scale = 1) => ({ renderer: { scale, artSize: [100, 100] }, facePass: null, stubs: [stub(), stub()] });

/** A state whose mesh is the art square shifted by (dx, dy) world px, seen through camera `cam`. */
function state({ dx = 0, dy = 0, cam = { x: 540, y: 960, zoom: 1, roll: 0 }, bubbles = [], particles = [] } = {}) {
  return {
    cam,
    mallow: { bodyBox: [50, 100, 50, 100] },
    buildMesh(mesh) {
      let k = 0;
      for (let j = 0; j <= rows; j++) {
        for (let i = 0; i <= cols; i++, k += stride) {
          const u = i / cols, v = j / rows;
          mesh.data.set([500 + u * 100 + dx, 900 + v * 100 + dy, u, v, 1, 0], k);
        }
      }
    },
    bubblesBack: bubbles, bubblesFront: [], particles,
  };
}

test('identical ends of the shutter: nothing moves', () => {
  assert.equal(shutterDisplacement(state(), state(), ctx()), 0);
});

test('body motion is measured on every mesh vertex inside the body box, in output px (camera zoom, render scale)', () => {
  assert.ok(Math.abs(shutterDisplacement(state(), state({ dx: 3 }), ctx()) - 3) < 1e-9);
  const zoomed = { x: 540, y: 960, zoom: 1.5, roll: 0 };
  assert.ok(Math.abs(shutterDisplacement(state({ cam: zoomed }), state({ dx: 3, cam: zoomed }), ctx(0.5)) - 2.25) < 1e-9);
  // a camera move alone moves everything on screen
  assert.ok(shutterDisplacement(state(), state({ cam: { x: 545, y: 960, zoom: 1, roll: 0 } }), ctx()) >= 5 - 1e-9);
  assert.ok(shutterDisplacement(state(), state({ dx: 1.5 }), ctx()) < STILL_PX);
});

test('glass bubbles: centre motion plus scale change times half-width; a bubble appearing counts as motion', () => {
  const b = (x, scale = 1) => ({ x, y: 600, scale, hw: 200 });
  assert.equal(shutterDisplacement(state({ bubbles: [b(100)] }), state({ bubbles: [b(100)] }), ctx()), 0);
  assert.ok(Math.abs(shutterDisplacement(state({ bubbles: [b(100)] }), state({ bubbles: [b(104)] }), ctx()) - 4) < 1e-9);
  assert.ok(Math.abs(shutterDisplacement(state({ bubbles: [b(100, 1)] }), state({ bubbles: [b(100, 1.01)] }), ctx()) - 2) < 1e-9);
  assert.equal(shutterDisplacement(state(), state({ bubbles: [b(100)] }), ctx()), Infinity);
});

test('the face\'s own motion counts, with or without the face cache (a blink is never frozen into one sample)', () => {
  const spec = {
    eyes: {
      L: { x: 30, y: 40, hw: 8, sag: 3, lw: 2, tilt: 0, cxOff: 0, r: 7, irisR: 4, irisOff: [0, 0] },
      R: { x: 70, y: 40, hw: 8, sag: 3, lw: 2, tilt: 0, cxOff: 0, r: 7, irisR: 4, irisOff: [0, 0] },
    },
    brows: { L: { p0: [22, 28], c: [30, 25], p1: [38, 28], lw: 2 }, R: { p0: [62, 28], c: [70, 25], p1: [78, 28], lw: 2 } },
    mouth: { x: 50, y: 60, w: 14, sag: 2, lw: 2, cxOff: 0, tilt: 0 },
    cheeks: { L: [25, 55, 5], R: [75, 55, 5], colour: '#fca6fb' },
  };
  const face = { spec, draw(p) { if (facePolicy.capture) facePolicy.capture.push({ face: this, params: p }); return false; } };
  const withFace = (params, opts) => ({ ...state(opts), drawFace: () => face.draw(params) });
  const open = { eyeOpen: 1 }, shut = { eyeOpen: 1, blink: 1 };
  assert.equal(shutterDisplacement(withFace(open), withFace(open), ctx()), 0);
  // the 4×4 test grid maps 25 art px to 25 world px: art px = output px at zoom 1, scale 1
  const blink = shutterDisplacement(withFace(open), withFace(shut), ctx());
  assert.ok(Math.abs(blink - faceMotionArt(spec, open, shut)) < 1e-9 && blink > STILL_PX, `blink ${blink} px`);
  assert.ok(Math.abs(shutterDisplacement(withFace(open), withFace(shut), ctx(0.5)) - blink / 2) < 1e-9, 'scaled to output px');
  // the face pass no longer has to exist for this (the ctx has none)
  assert.equal(ctx().facePass, null);
});

test('particles: centre motion; a change in their number counts as motion', () => {
  const p = (x) => ({ x, y: 300, r: 4, a: 1, c: [1, 1, 1] });
  assert.ok(Math.abs(shutterDisplacement(state({ particles: [p(10)] }), state({ particles: [p(13)] }), ctx()) - 3) < 1e-9);
  assert.equal(shutterDisplacement(state({ particles: [p(10)] }), state({ particles: [] }), ctx()), Infinity);
});
