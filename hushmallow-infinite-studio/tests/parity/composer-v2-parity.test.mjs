// Composer parity (WP-03): T01 re-expressed as moves, composed IN the render
// page from specs/golden/t01-v2.json and rendered by runtime v3
// (engine/runtime/direction-runtime.js), reproduces the frozen v2 exactly:
//   G-STATE  every state value at all 2,441 frame-centre and sub-frame times
//            (+ the 0.98 s golden) within 1e-9 — measured: bit-identical
//   mesh     sha256 of the soft-body mesh (main and mirrored) of every state
//   subframes the adaptive sub-frame count of every frame
//   G-CUES   the cue log and the dry-run curves, byte for byte, and buildPlanV2's plan
// The frozen module is never loaded on this path: the page runs composer code only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { loadGoldenV2, compareStates, describe } from '../../tools/golden/compare.mjs';
import { planV2 } from '../../tools/golden/plan-v2.mjs';
import { EngineSession, openComposerPage, goldenSpec, pageDirection, V2 } from './composer-support.mjs';
import { composeNode } from './composer-fixtures.mjs';
import { gdir } from '../../composer/validate.js';
import fs from 'node:fs';
import { studioPath } from '../../render/lib/paths.mjs';

const golden = loadGoldenV2();
// the compiled golden direction, committed as the auditable output (and the registry input of runtime v3);
// HM_UPDATE_DIRECTION=1 rewrites it from the page compose instead of comparing
const DIRECTION_FILE = studioPath('specs', 'golden', 't01-v2.direction.json');

let sample;
async function resample() {
  if (sample) return sample;
  sample = await withHeavyLock({ mode: 'shared', label: 'test:parity composer v2' }, async () => {
    const session = await EngineSession.start();
    try {
      const { page, info } = await openComposerPage(session, { spec: goldenSpec() });
      const direction = await pageDirection(page);
      const { cues } = await V2.cueLog(page);
      const rows = await V2.sampleAllStates(page, 450);
      const extraIdx = [...new Set(golden.states.filter((r) => r.extra).map((r) => r.i))];
      const extra = (await V2.sampleIndices(page, extraIdx)).map((r) => ({ ...r, extra: true }));
      const curvesAfterRender = await page.evaluate(() => window.__stage.curves.length);
      const dry = await page.evaluate((n) => window.__engine.dryRun(n), 450);
      return { info, direction, cues, rows: [...rows, ...extra], curvesAfterRender, dry, served: session.served().map((f) => f.url) };
    } finally {
      await session.close();
    }
  });
  return sample;
}

test('T01 is composed in the page from the golden spec and runs on runtime v3, without the frozen module', { timeout: 900000 }, async () => {
  const s = await resample();
  assert.equal(s.info.meta.runtime, 'v3');
  assert.equal(s.direction.meta.layout, 'page', 'layout measured with the loaded Fredoka');
  assert.deepEqual([s.info.meta.fps, s.info.meta.duration, s.info.meta.shutter, s.info.meta.subframes], [30, 15, 0.4, 3]);
  assert.ok(!s.served.includes('/hushmallow-infinite-studio/videos/my-brain-at-2am-v2.js'), 'the frozen v2 direction is not used');
  assert.deepEqual(s.served.filter((u) => /\/(stage2|stage)\//.test(u)), []);
  assert.ok(s.served.includes('/hushmallow-infinite-studio/engine/runtime/direction-runtime.js'));
  assert.ok(s.served.includes('/hushmallow-infinite-studio/composer/compose.js'));
});

test('G-STATE: all 2,441 states (+ the 0.98 s golden) match within 1e-9; in fact bit-identical', { timeout: 900000 }, async (t) => {
  const s = await resample();
  const strip = ({ mesh, meshFlip, ...row }) => row;
  const res = compareStates(golden.states, s.rows.map(strip), { tol: golden.manifest.tolerance.state });
  t.diagnostic(`${res.rows} rows, ${res.compared} numbers compared, max |Δ| ${res.maxDelta}`);
  assert.ok(res.equal, describe(res));
  const exact = compareStates(golden.states, s.rows.map(strip), { tol: 0 });
  assert.ok(exact.equal, `not bit-identical: ${describe(exact)}`);
});

test('mesh buffer hashes and sub-frame counts are identical', { timeout: 900000 }, async () => {
  const s = await resample();
  assert.deepEqual(s.rows.map((r) => [r.i, r.k, r.mesh, r.meshFlip]), golden.mesh.rows);
  assert.deepEqual(s.rows.filter((r) => r.k === 'c' && !r.extra).map((r) => r.n), golden.subframes.frames);
  assert.deepEqual(s.dry.subframes, golden.subframes.frames);
});

test('G-CUES: the cue log and the dry-run curves are byte-equal; the score plan is v2\'s', { timeout: 900000 }, async () => {
  const s = await resample();
  assert.equal(s.curvesAfterRender, 0, 'rendering records no curves (R12)');
  assert.equal(JSON.stringify(s.cues), JSON.stringify(golden.cues.cues));
  assert.equal(JSON.stringify(s.dry.cues), JSON.stringify(golden.cues.cues));
  assert.equal(JSON.stringify(s.dry.curves), JSON.stringify(golden.curves.curves));
  assert.deepEqual(s.dry.errors, []);
  const plan = await planV2({ video: V2.VIDEO, title: s.info.meta.title, fps: 30, duration: 15, cues: s.dry.cues, curves: s.dry.curves });
  assert.equal(JSON.stringify(plan), JSON.stringify(golden.plan));
});

test('the page-composed direction equals the Node-composed one except for what the real font measured, and passes G-DIR', { timeout: 900000 }, async () => {
  const s = await resample();
  const node = composeNode().direction;
  const page = s.direction;
  // the only differences allowed: text measurements (shim vs canvas) and the layout source
  const scrub = (d) => {
    const x = structuredClone(d);
    x.meta.layout = x.layout.measuredBy = '*';
    for (const p of x.props) for (const it of p.items) it.layout = '*';
    for (const tx of x.text) tx.widths = '*';
    x.layout.hook.widths = '*';
    return x;
  };
  assert.equal(JSON.stringify(scrub(page)), JSON.stringify(scrub(node)));
  assert.match(page.provenance.tuning.sha256, /^[0-9a-f]{64}$/, 'the page records the sha256 of the library files it composed from, as Node does');
  assert.equal(page.layout.hook.size, 76);
  assert.deepEqual(gdir(page).errors, []);
});

test('the committed golden direction (specs/golden/t01-v2.direction.json) is exactly what the page composes', { timeout: 900000 }, async () => {
  const s = await resample();
  const text = JSON.stringify(s.direction, null, 1) + '\n';
  if (process.env.HM_UPDATE_DIRECTION === '1') fs.writeFileSync(DIRECTION_FILE, text);
  assert.equal(fs.readFileSync(DIRECTION_FILE, 'utf8'), text, 'composer output changed: review the diff, then HM_UPDATE_DIRECTION=1 (and re-check the tuning matrix versions)');
});
