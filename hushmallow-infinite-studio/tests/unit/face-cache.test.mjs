// The face cache (engine/face/cache.js, WP-02 P3): pure logic, no browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FaceQuantiser, featurePoints, captureFaces, facePolicy, STEP_PX, REST_COARSE } from '../../engine/face/cache.js';
import { NEUTRAL } from '../../engine/face/params.js';

// a face spec shaped like Noomi's derived one (art px)
const SPEC = {
  eyes: {
    L: { x: 386, y: 608, hw: 105, sag: 41, lw: 24, tilt: -1.6, cxOff: -6, r: 86, irisR: 46, irisOff: [0, 3] },
    R: { x: 812, y: 606, hw: 104, sag: 40, lw: 24, tilt: 1.2, cxOff: 5, r: 85, irisR: 46, irisOff: [0, 3] },
  },
  brows: { L: { p0: [300, 470], c: [380, 440], p1: [460, 465], lw: 20 }, R: { p0: [740, 465], c: [820, 440], p1: [900, 470], lw: 20 } },
  mouth: { x: 600, y: 760, w: 150, sag: 22, lw: 22, cxOff: 0, tilt: 0 },
  cheeks: { L: [300, 700, 60], R: [900, 700, 60], colour: '#fca6fb' },
};

/** Seeded PRNG (mulberry32), for reproducible random poses. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const randomPose = (r) => ({
  eyeOpen: r() * 1.4, blink: r() < 0.3 ? r() : 0, squint: r() * 0.8, closedCurve: 0.5 + r() * 0.6, lidTop: r() * 0.2, lidBot: r() * 0.5,
  lookX: r() * 2 - 1, lookY: r() * 2 - 1, irisScale: 0.6 + r() * 0.6, eyeScale: 0.9 + r() * 0.25, eyeStretch: 0.9 + r() * 0.25,
  browAlpha: r(), browY: r(), mouthSmile: r() * 2 - 1, mouthOpen: r() * 0.7, mouthRound: r(), mouthWidth: 0.7 + r() * 0.4,
  mouthWave: r() * 0.9, mouthWavePhase: r() * 60, blush: r() * 1.2, sparkle: r(),
});

test('face cache: quantising is idempotent and stays within half a step of every drawn point', () => {
  const Q = new FaceQuantiser(SPEC), r = rng(7);
  let worst = 0;
  for (let n = 0; n < 2000; n++) {
    const P = { ...NEUTRAL, ...randomPose(r) };
    const q = Q.quantise(P);
    assert.equal(Q.quantise(q.P).key, q.key, 'idempotent');
    worst = Math.max(worst, Q.motionArt(P, q.P));
  }
  // each parameter moves a point by at most STEP_PX / 2; a few act on the same point at once
  assert.ok(worst <= 1.5 * STEP_PX, `largest quantisation error ${worst.toFixed(3)} art px`);
});

test('face cache: equal keys for poses within half a quantum; held poses hit, moving poses miss', () => {
  const Q = new FaceQuantiser(SPEC);
  const a = Q.quantise({ eyeOpen: 1, lookX: 0.3 }), b = Q.quantise({ eyeOpen: 1 + 1e-6, lookX: 0.3 + 1e-6 });
  assert.equal(a.key, b.key);
  assert.notEqual(Q.quantise({ eyeOpen: 1.01 }).key, Q.quantise({ eyeOpen: 1 }).key);
  // an unknown parameter keeps the approved key's 1/2000 rounding
  assert.equal(Q.quantum('somethingNew', false), 1 / 2000);
});

test('face cache: mouthWavePhase is dropped while mouthWave < 0.01 and taken modulo 2π otherwise', () => {
  const Q = new FaceQuantiser(SPEC);
  assert.equal(Q.quantise({ mouthWave: 0, mouthWavePhase: 1.3 }).key, Q.quantise({ mouthWave: 0, mouthWavePhase: 40.2 }).key);
  assert.equal(Q.quantise({ mouthWave: 0.004, mouthWavePhase: 9 }).P.mouthWavePhase, 0);
  const w = Q.quantise({ mouthWave: 0.5, mouthWavePhase: 1 }), w2 = Q.quantise({ mouthWave: 0.5, mouthWavePhase: 1 + 2 * Math.PI });
  assert.equal(w.key, w2.key);
  assert.notEqual(w.key, Q.quantise({ mouthWave: 0.5, mouthWavePhase: 1.5 }).key);
});

test('face cache: rest quanta are REST_COARSE times coarser and keyed apart', () => {
  const Q = new FaceQuantiser(SPEC);
  assert.equal(Q.quantum('lookX', true), Q.quantum('lookX', false) * REST_COARSE);
  assert.ok(Q.quantise({}, true).key.startsWith('rest|'));
  assert.notEqual(Q.quantise({}, true).key, Q.quantise({}, false).key);
});

test('face cache: motion between poses (blink >> look jitter) and stable feature points', () => {
  const Q = new FaceQuantiser(SPEC);
  const open = { eyeOpen: 1 }, half = { eyeOpen: 1, blink: 0.5 };
  assert.ok(Q.motionArt(open, half) > 20, 'a half blink moves the lids tens of art px');
  assert.ok(Q.motionArt(open, { eyeOpen: 1, lookX: 0.001 }) < 0.1);
  assert.equal(Q.motionArt(open, open), 0);
  assert.equal(featurePoints(SPEC, {}).length, featurePoints(SPEC, randomPose(rng(1))).length);
});

test('face cache: capture mode records the parameters of a drawFace() call', () => {
  const face = { draw(p) { if (facePolicy.capture) { facePolicy.capture.push({ face: this, params: p }); return false; } return true; } };
  const S = { drawFace: () => face.draw({ eyeOpen: 0.7 }) };
  const rec = captureFaces(S);
  assert.deepEqual(rec.map((x) => [x.face, x.params]), [[face, { eyeOpen: 0.7 }]]);
  assert.equal(facePolicy.capture, null, 'capture mode ends');
  assert.equal(S.drawFace(), true, 'outside capture the face draws');
  assert.deepEqual(captureFaces({}), []);
});
