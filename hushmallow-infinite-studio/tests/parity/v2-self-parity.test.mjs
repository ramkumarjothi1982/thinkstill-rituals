// Parity baseline (G-STATE / G-CUES / G-PLAN against the frozen module itself):
// re-sample the frozen v2 in Chromium and require it to reproduce the
// committed goldens in qa/golden/v2 — every state value within 1e-9, mesh
// hashes, sub-frame counts, cue log, curves and buildPlanV2's event list
// exactly. This proves the goldens are reproducible and the harness is
// sound; WP-03 adds the composer-vs-golden parity tests next to this file.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import * as V2 from '../../tools/golden/v2-harness.mjs';
import { loadGoldenV2, compareStates, compareDeep, describe } from '../../tools/golden/compare.mjs';
import { planV2 } from '../../tools/golden/plan-v2.mjs';

const golden = loadGoldenV2();
const TOL = golden.manifest.tolerance.state;

let sample;
async function resample() {
  if (sample) return sample;
  sample = await withHeavyLock({ mode: 'shared', label: 'test:parity v2' }, async () => {
    const env = await V2.launch();
    try {
      const { page, info } = await V2.openStage(env, { probe: true });
      const { cues } = await V2.cueLog(page);
      const rows = await V2.sampleAllStates(page, info.frames);
      const { curves } = await V2.cueLog(page);
      const extraIdx = [...new Set(golden.states.filter((r) => r.extra).map((r) => r.i))];
      const extra = (await V2.sampleIndices(page, extraIdx)).map((r) => ({ ...r, extra: true }));
      return { info, cues, curves, rows: [...rows, ...extra] };
    } finally {
      await env.close();
    }
  });
  return sample;
}

test('G-STATE baseline: all 2,441 frame-centre and sub-frame states (+ the 0.98 s golden) match within 1e-9', { timeout: 600000 }, async (t) => {
  const s = await resample();
  const strip = ({ mesh, meshFlip, ...row }) => row;
  const res = compareStates(golden.states, s.rows.map(strip), { tol: TOL });
  t.diagnostic(`${res.rows} rows, ${res.compared} numbers compared, max |Δ| ${res.maxDelta}`);
  assert.equal(golden.manifest.counts.states, 2441);
  assert.ok(res.equal, describe(res));
});

test('mesh buffer hashes and sub-frame counts are identical', { timeout: 600000 }, async () => {
  const s = await resample();
  assert.deepEqual(s.rows.map((r) => [r.i, r.k, r.mesh, r.meshFlip]), golden.mesh.rows);
  const perFrame = s.rows.filter((r) => r.k === 'c' && !r.extra).map((r) => r.n);
  assert.deepEqual(perFrame, golden.subframes.frames);
  assert.equal(perFrame.reduce((a, b) => a + b, 0), 1991);
});

test('G-CUES baseline: the cue log and curves are identical', { timeout: 600000 }, async () => {
  const s = await resample();
  assert.ok(compareDeep(golden.cues.cues, s.cues).equal, 'cue log differs');
  assert.ok(compareDeep(golden.curves.curves, s.curves).equal, 'curves differ');
});

test('G-PLAN baseline: buildPlanV2 on the re-sampled cue log equals the golden event list', { timeout: 600000 }, async () => {
  const s = await resample();
  const plan = await planV2({ video: V2.VIDEO, title: s.info.title, fps: s.info.fps, duration: s.info.duration, cues: s.cues, curves: s.curves });
  assert.equal(JSON.stringify(plan), JSON.stringify(golden.plan));
});
