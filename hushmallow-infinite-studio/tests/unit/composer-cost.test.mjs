// G-COST (composer/cost.js): the final and draft models refit on the measured
// single-worker farm renders of T01 (FU-4; numbers from docs/wp/WP-02.md and
// docs/M0-REPORT.md, provenance in WORK/{wp02,wp02r2,verify-wp02*,m0-audit}).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gcost, predict, COST_MODELS, ENGINE, BUDGETS, PROOF_BUDGET_S } from '../../composer/cost.js';
import { STILL_PX } from '../../engine/render/shutter.js';
import { MOTION_PX } from '../../engine/renderer/passes/face.js';
import { REST_FULL } from '../../engine/face/cache.js';
import { composeNode, goldenSpec } from '../parity/composer-fixtures.mjs';

const { direction } = composeNode();
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const near = (a, b, rel) => Math.abs(a - b) <= rel * Math.abs(b);

// T01, final profile, one worker: [segment render s, wall clock s] (m0-audit, final-4, verifier r1, verifier r2, final-2, final-3)
const FINAL_RUNS = [[481.6, 521.6], [526.8, 572.1], [539.5, 584.3], [544.9, 588.7], [562.2, 607.0], [604.4, 651.1]];
// T01, draft profile, one worker (draft-2, verifier r2, verifier r1)
const DRAFT_RUNS = [[79.3, 88.7], [79.8, 88.9], [81.7, 91.3]];
const FINAL_SUBFRAMES = 1611;                   // every final render's provenance (sum of segments[].subframes)
const PROOF_RUNS = [13.3, 12.8, 14.8, 14.7];

test('the models count what the engine counts: its still threshold, face-motion threshold and rest level', () => {
  assert.equal(ENGINE.stillPx, STILL_PX);
  assert.equal(ENGINE.faceMotionPx, MOTION_PX);
  assert.equal(ENGINE.restFull, REST_FULL);
  assert.equal(COST_MODELS.final.stillPx, STILL_PX);
  assert.equal(COST_MODELS.final.faceMotionPx, MOTION_PX);
  assert.equal(COST_MODELS.draft.subframes, 1);
  assert.equal(COST_MODELS.exact.stillPx, null, 'exact keeps the direction\'s floor of 3');
});

test('final: T01 predicts the measured farm (median render 542.2 s, median wall clock 586.5 s ≈ 9.8 min)', () => {
  const p = predict(direction, COST_MODELS.final);
  assert.ok(near(p.subframes, FINAL_SUBFRAMES, 0.02), `sub-frames ${p.subframes} vs ${FINAL_SUBFRAMES} rendered`);
  assert.ok(near(p.seconds, median(FINAL_RUNS.map((r) => r[0])), 0.005), `render ${p.seconds} s`);
  assert.ok(near(p.wallSeconds, median(FINAL_RUNS.map((r) => r[1])), 0.005), `wall ${p.wallSeconds} s`);
  assert.ok(p.glassSubframes > 0 && p.glassSubframes < p.subframes, 'the glass pass is costed only while cards are on screen');
  // every measured run sits inside G15's warn band (QA warns at +30 % over the prediction)
  for (const [seg] of FINAL_RUNS) assert.ok(Math.abs(seg / p.seconds - 1) < 0.15, `run ${seg} s vs ${p.seconds} s`);
  const r = gcost(direction, { spec: goldenSpec() });
  assert.equal(r.pass, true);
  assert.deepEqual(r.warnings, [], 'fitted: no longer provisional');
  assert.equal(r.metrics.model, 'final');
  assert.equal(r.metrics.provisional, false);
  assert.ok(r.metrics.predictedMin > 9.5 && r.metrics.predictedMin < 10 && r.metrics.budgetMin === BUDGETS.final, JSON.stringify(r.metrics));
  assert.equal(r.metrics.predictedSec, p.seconds, 'predictedSec is the render (segment) time QA compares with');
  assert.equal(r.metrics.predictedWallSec, p.wallSeconds);
  assert.equal(r.metrics.overheadSec, COST_MODELS.final.overheadSec);
});

test('draft: T01 predicts the measured farm (median render 79.8 s, wall clock 88.9 s)', () => {
  const p = predict(direction, COST_MODELS.draft);
  assert.equal(p.subframes, 450, 'one sub-frame per frame');
  assert.ok(near(p.seconds, median(DRAFT_RUNS.map((r) => r[0])), 0.01), `render ${p.seconds} s`);
  assert.ok(near(p.wallSeconds, median(DRAFT_RUNS.map((r) => r[1])), 0.01), `wall ${p.wallSeconds} s`);
  const r = gcost(direction, { spec: { ...goldenSpec(), quality: 'draft' } });
  assert.deepEqual([r.pass, r.metrics.model, r.warnings.length], [true, 'draft', 0]);
  assert.ok(r.metrics.predictedMin < BUDGETS.draft);
});

test('proof: six stills at final quality predict the measured 12.8–14.8 s', () => {
  const r = gcost(direction, { spec: { ...goldenSpec(), quality: 'proof' } });
  assert.equal(r.pass, true);
  assert.ok(r.metrics.predictedSec < PROOF_BUDGET_S);
  assert.ok(near(r.metrics.predictedSec, median(PROOF_RUNS), 0.1), `${r.metrics.predictedSec} s`);
});

test('the budget is judged on the wall clock, and both it and the overhead scale with duration', () => {
  const busy = structuredClone(direction);
  busy.meta.subframes = 16;                                   // every moving frame at 16 sub-frames
  const r = gcost(busy, { spec: goldenSpec() });
  assert.equal(r.pass, false);
  assert.deepEqual(r.errors.map((e) => e.rule), ['cost:budget']);
  assert.match(r.errors[0].message, /^final render predicted \d+\.\d min \(render \d+\.\d \+ overhead 0\.7\), budget 11\.0 min$/);
  assert.equal(gcost(busy, { spec: { quality: 'exact' } }).pass, true, 'exact has no budget (goldens only)');
  const half = structuredClone(direction);
  half.meta.duration = 7.5;
  const h = gcost(half, { spec: goldenSpec() });
  assert.equal(h.metrics.budgetMin, 5.5);
  assert.equal(h.metrics.overheadSec, COST_MODELS.final.overheadSec / 2);
});
