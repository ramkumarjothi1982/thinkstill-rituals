// Engine parity (WP-01): the frozen v2 direction, running on the ENGINE through
// the v2 adapter (engine/index.html's import map + runtime/adapter-v2.js),
// reproduces the committed goldens exactly: every state value within 1e-9 at
// all 2,441 frame-centre and sub-frame times, mesh hashes, sub-frame counts and
// the cue log. Curves come from the engine's dry run (R12), never from rendering.
//
// tools/golden/v2-probe.js is loaded unchanged: it imports '../../stage2/face.js',
// which the engine page's import map resolves to engine/face.js, the very module
// instance the frozen direction draws with.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { EngineSession } from '../../render/worker.mjs';
import { loadGoldenV2, compareStates, compareDeep, describe } from '../../tools/golden/compare.mjs';
import { planV2 } from '../../tools/golden/plan-v2.mjs';
import * as V2 from '../../tools/golden/v2-harness.mjs';

const golden = loadGoldenV2();
const TOL = golden.manifest.tolerance.state;
const P = { direction: 'my-brain-at-2am-v2', width: 1080, height: 1920, scale: 1, seed: Number(V2.SEED) };

let sample;
async function resample() {
  if (sample) return sample;
  sample = await withHeavyLock({ mode: 'shared', label: 'test:parity engine v2' }, async () => {
    const session = await EngineSession.start();
    try {
      const { page, info } = await session.openPage(P);
      await page.evaluate(async () => { window.__probe = await import('/hushmallow-infinite-studio/tools/golden/v2-probe.js'); });
      const runtime = await page.evaluate(async () => ({
        contract: window.__engine.stage.video.contract,
        stage2FaceIsEngineFace: (await import('/hushmallow-infinite-studio/stage2/face.js')) === (await import('/hushmallow-infinite-studio/engine/face.js')),
      }));
      const { cues } = await V2.cueLog(page);
      const rows = await V2.sampleAllStates(page, info.frames);
      const curvesAfterRender = await page.evaluate(() => window.__stage.curves.length);
      const dry = await page.evaluate((n) => window.__engine.dryRun(n), info.frames);
      const extraIdx = [...new Set(golden.states.filter((r) => r.extra).map((r) => r.i))];
      const extra = (await V2.sampleIndices(page, extraIdx)).map((r) => ({ ...r, extra: true }));
      return { info, runtime, cues, curvesAfterRender, dry, rows: [...rows, ...extra], served: session.served().map((f) => f.url) };
    } finally {
      await session.close();
    }
  });
  return sample;
}

test('the frozen direction runs on the engine through runtime v2 (chosen from meta, not the id)', { timeout: 600000 }, async () => {
  const s = await resample();
  assert.equal(s.runtime.contract, 'v2');
  assert.equal(s.runtime.stage2FaceIsEngineFace, true, 'the import map resolves ../stage2/face.js to engine/face.js');
  // the frozen stage2 code and the v1 stage are never even fetched: the direction runs on engine code only (R19)
  assert.deepEqual(s.served.filter((u) => /\/(stage2|stage)\//.test(u)), []);
  assert.ok(s.served.includes('/hushmallow-infinite-studio/videos/my-brain-at-2am-v2.js'), 'the frozen module itself, unchanged');
  assert.equal(s.info.runtime, 'v2');
  assert.equal(s.info.score, 'soundtrack-v2');
  assert.deepEqual([s.info.frames, s.info.fps, s.info.width, s.info.height], [450, 30, 1080, 1920]);
});

test('G-STATE: all 2,441 states (+ the 0.98 s golden) match within 1e-9 on the engine', { timeout: 600000 }, async (t) => {
  const s = await resample();
  const strip = ({ mesh, meshFlip, ...row }) => row;
  const res = compareStates(golden.states, s.rows.map(strip), { tol: TOL });
  t.diagnostic(`${res.rows} rows, ${res.compared} numbers compared, max |Δ| ${res.maxDelta}`);
  assert.ok(res.equal, describe(res));
});

test('mesh buffer hashes and sub-frame counts are identical on the engine', { timeout: 600000 }, async () => {
  const s = await resample();
  assert.deepEqual(s.rows.map((r) => [r.i, r.k, r.mesh, r.meshFlip]), golden.mesh.rows);
  assert.deepEqual(s.rows.filter((r) => r.k === 'c' && !r.extra).map((r) => r.n), golden.subframes.frames);
  assert.deepEqual(s.dry.subframes, golden.subframes.frames, 'the dry run reports the same sub-frame counts');
});

test('R12: rendering records no curves; the dry run gives the golden cue log, curves and plan', { timeout: 600000 }, async () => {
  const s = await resample();
  assert.equal(s.curvesAfterRender, 0, 'renderFrame() must not push curves (stage2 did, once per call)');
  assert.ok(compareDeep(golden.cues.cues, s.cues).equal, 'cue log differs');
  assert.ok(compareDeep(golden.cues.cues, s.dry.cues).equal, 'dry-run cue log differs');
  assert.ok(compareDeep(golden.curves.curves, s.dry.curves).equal, 'dry-run curves differ');
  assert.deepEqual(s.dry.errors, []);
  const plan = await planV2({ video: V2.VIDEO, title: s.info.title, fps: s.info.fps, duration: s.info.duration, cues: s.dry.cues, curves: s.dry.curves });
  assert.equal(JSON.stringify(plan), JSON.stringify(golden.plan));
});
