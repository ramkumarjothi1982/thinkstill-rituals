// Beat clock (composer/clock.js) and the circular timeline (composer/circular.js):
// anchors from the library, exact anchor arithmetic, a whole number of breaths
// per loop, and the movable seam: P = 0 reproduces v2 exactly, P > 0 closes the
// loop at a quiet point while a retrigger plays across frame 0.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockAnchors, at, snap, resolveRef, breathPeriod, jitterAnchors, FRAME_LOCKED } from '../../composer/clock.js';
import { wrapTime, unwrapTime, domain, closure } from '../../composer/circular.js';
import { gdir } from '../../composer/validate.js';
import { createScene } from '../../composer/scene.js';
import { lib, composeNode, retriggerLoop, settledArc, registryWith, specWith, dataWithCells, goldenSpec } from '../parity/composer-fixtures.mjs';
import { stream } from '../../planner/rng.mjs';

test('anchors come from the library beat clock; the 15 s clock is v2\'s timing', () => {
  for (const D of [10, 12, 15, 20]) {
    const A = clockAnchors(lib.clocks[D], D);
    assert.equal(A.END, D);
    assert.ok(Math.abs(A.breathPeriod - lib.clocks[D].breathPeriod) < 1e-3, `breath period at ${D} s`);
    assert.ok(Number.isInteger(Math.round(D / A.breathPeriod)) && Math.abs(D / A.breathPeriod - Math.round(D / A.breathPeriod)) < 1e-12);
    if (D === 20) assert.equal(A.L4, 8.0);
  }
  const A = clockAnchors(lib.clocks[15], 15);
  assert.deepEqual([A.ANTIC, A.GAG, A.IMPACT, A.L1, A.L2, A.L3, A.PEAK0, A.TURN, A.RITUAL0, A.OPEN, A.RESOLVE, A.LOGO, A.SETTLE, A.CARD_OUT, A.HOOK_IN], [0.26, 0.4, 0.98, 3, 4, 5, 5.6, 7, 7.4, 11.7, 11.9, 12.6, 13.5, 14.3, 14.66]);
  assert.ok(Object.is(A.breathPeriod, 15 / 4), 'v2 LOOP_BREATH = 15 / 4');
  assert.throws(() => clockAnchors(undefined, 13), /no beat clock/);
});

test('at() lands on the double a decimal literal parses to; plain + keeps v2\'s run-time arithmetic', () => {
  assert.ok(Object.is(at(0.4, 0.13), 0.53));
  assert.ok(Object.is(at(7.4, 1.8), 9.2) && !Object.is(7.4 + 1.8, 9.2), 'snap fixes 9.200000000000001');
  assert.ok(Object.is(at(0.98, 1.02), 2) && Object.is(at(12.6, 0.2), 12.8));
  assert.ok(Object.is(9.2 + 0.12, 9.319999999999999), 'v2 computed T.exhale + 0.12 at run time; moves write it the same way');
  assert.ok(Object.is(snap(1 / 3), 0.333333));
  const A = { TURN: 7, OPEN: 11.7 };
  assert.ok(Object.is(resolveRef('TURN-0.05', A), 6.95) && Object.is(resolveRef('OPEN-0.25', A), 11.45) && resolveRef(3, A) === 3);
  assert.throws(() => resolveRef('NOPE+1', A), /unknown anchor/);
  assert.equal(breathPeriod(15), 3.75);
});

test('seeded anchor jitter stays within ±80 ms, keeps the order and never moves frame-locked anchors', () => {
  const A = clockAnchors(lib.clocks[15], 15);
  for (let seed = 1; seed <= 50; seed++) {
    const r = stream(seed, 'composer/clock');
    const J = jitterAnchors(A, () => r.next());
    for (const k of FRAME_LOCKED) if (k in A) assert.equal(J[k], A[k], k);
    for (const k of Object.keys(A)) assert.ok(Math.abs(J[k] - A[k]) <= 0.08 + 1e-9, k);
    const order = ['COVER', 'ANTIC', 'GAG', 'IMPACT', 'HOOK_OUT', 'L1', 'L2', 'L3', 'PEAK0', 'PEAK1', 'TURN', 'RITUAL0', 'OPEN', 'RESOLVE', 'LOGO', 'SETTLE', 'CARD_OUT', 'HOOK_IN', 'END'];
    for (let i = 1; i < order.length; i++) {
      const tie = A[order[i]] === A[order[i - 1]];                          // PEAK1 and TURN coincide on the clock
      assert.ok(tie ? J[order[i]] >= J[order[i - 1]] : J[order[i]] > J[order[i - 1]], `${order[i]} after ${order[i - 1]} (seed ${seed})`);
    }
  }
  // the v2 cells were approved at exact timing: the golden composes without jitter
  assert.equal(composeNode().report.jitter, false);
});

test('wrapTime: P = 0 is the identity (not even a subtraction); P > 0 maps the tail before frame 0', () => {
  for (const t of [0, 1e-9, 7.123, 14.999999]) assert.ok(Object.is(wrapTime(t, 15, 0), t));
  assert.equal(wrapTime(14.7, 15, 0.34), 14.7 - 15);
  assert.equal(wrapTime(14.6, 15, 0.34), 14.6);
  assert.ok(Math.abs(unwrapTime(wrapTime(14.8, 15, 0.34), 15, 0.34) - 14.8) < 1e-12);
  assert.deepEqual(domain(15, 0.34), { from: -0.34, to: 15 - 0.34, seam: 15 - 0.34 });
  assert.throws(() => domain(15, 15), /seam/);
  const c = closure((t) => Math.sin((2 * Math.PI * t) / 3.75), 15, 0.34);
  assert.ok(c.step < 1e-8 && c.slopeStep < 1e-2, JSON.stringify(c));   // one-sided differences of width 1 ms
});

test('P = 0 (LP-RETURN) reproduces v2: the golden direction has its seam at frame 0 and closes there', () => {
  const { direction } = composeNode();
  assert.equal(direction.meta.P, 0);
  const r = gdir(direction);
  assert.deepEqual(r.errors, []);
  assert.ok(r.metrics.closure.step < 1e-4, JSON.stringify(r.metrics.closure));
});

test('P > 0: a retrigger playing across frame 0 passes loop closure at the moved seam; the same retrigger at a P = 0 seam fails', () => {
  const run = (seamless) => {
    const loop = retriggerLoop({ seamless }), arc = settledArc();
    const spec = specWith((s) => { s.loop = loop.id; s.arc = arc.id; });
    const moves = registryWith(loop, arc);
    const compiled = composeNode({ spec, data: dataWithCells([loop.id, arc.id], spec), moves });
    return { compiled, r: gdir(compiled, { moves }) };
  };
  const good = run(true);
  const D = 15, P = good.compiled.direction.meta.P;
  assert.ok(Math.abs(P - (15 - 14.66)) < 1e-12, `seam at HOOK_IN, P=${P}`);
  assert.deepEqual(good.r.errors, [], JSON.stringify(good.r.errors));
  // the twitch really plays across frame 0: wall time 14.8 is composition −0.2, and frame 0 continues it
  const sc = createScene(good.compiled.direction);
  const sq = (t) => sc.dofAt(t).squash;
  assert.ok(Math.abs(sq(14.8)) > 1e-3, `twitch visible before frame 0 (${sq(14.8)})`);
  assert.ok(Math.abs(sq(14.999) - sq(0)) < 2e-3, 'continuous through frame 0');
  // and the loop closes at the seam: composition D − P (left) equals −P (right)
  const c = closure((t) => sc.raw.dofAt(t).squash, D, P);
  assert.ok(c.step < 1e-3, `step ${c.step}`);
  const bad = run(false);
  assert.equal(bad.compiled.direction.meta.P, 0);
  assert.ok(bad.r.errors.some((e) => e.rule === 'loop:closure' && /body\.squash/.test(e.message)), JSON.stringify(bad.r.errors));
  // the golden spec itself is untouched by the fixture registry
  assert.equal(goldenSpec().loop, 'LP-RETURN');
});
