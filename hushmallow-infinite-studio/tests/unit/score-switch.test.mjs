// OWNER-DECISIONS Q7 (lead decision 2026-10-14), FU-2: new directions name the
// generic score 'hm-score'; the golden T01 keeps the approved 'soundtrack-v2', so it
// still reproduces v2 exactly. A planned spec goes end to end: composed, dry-run,
// scored by audio/score.mjs and linted whole as G-AUDIO lints it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compose, SCORE } from '../../composer/compose.js';
import { dryRun } from '../../composer/artefacts.js';
import { SCORES } from '../../render/mux.mjs';
import { buildScore } from '../../audio/score.mjs';
import { shapesOf } from '../../qa/gates/audio-gate.mjs';
import { planBatch } from '../../planner/pick.mjs';
import { sealSpec } from '../../planner/fingerprint.mjs';
import { studioPath } from '../../render/lib/paths.mjs';
import { realCtx } from '../property/support.mjs';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const GOLDEN_SPEC = readJson(studioPath('specs', 'golden', 't01-v2.json'));
const GOLDEN_DIRECTION = readJson(studioPath('specs', 'golden', 't01-v2.direction.json'));

test('the golden T01 keeps soundtrack-v2; every other spec names hm-score; the farm renders both', async () => {
  assert.equal(SCORE.default, 'hm-score');
  const { direction } = await compose(GOLDEN_SPEC);
  assert.equal(direction.meta.score, 'soundtrack-v2');
  assert.equal(GOLDEN_DIRECTION.meta.score, 'soundtrack-v2', 'the committed golden direction');
  assert.deepEqual(Object.keys(SCORE.legacy), [GOLDEN_SPEC.fingerprint], 'the approved film alone keeps the frozen score');
  for (const over of [{ seed: 77 }, { duration: 20 }, { copy: { ...GOLDEN_SPEC.copy, lines: ['That awkward conversation.', 'Did I say something weird?', 'Why did I say that?'] } }]) {
    const d = (await compose(sealSpec({ ...GOLDEN_SPEC, ...over }))).direction;
    assert.equal(d.meta.score, 'hm-score', JSON.stringify(over));
  }
  for (const id of new Set([SCORE.default, ...Object.values(SCORE.legacy)])) assert.ok(Object.hasOwn(SCORES, id), `render/mux.mjs renders '${id}'`);
  // a fingerprint that happens to name an Object.prototype member is just another spec
  const odd = (await compose({ ...GOLDEN_SPEC, fingerprint: 'constructor' })).direction;
  assert.equal(odd.meta.score, 'hm-score');
});

test('planned specs end to end: composed with hm-score, scored by audio/score.mjs, and the whole plan clean as G-AUDIO lints it', async () => {
  const r = planBatch({ ...realCtx(), mode: 'review', count: 4, seed: 7, batch: 'fu2-switch' });
  for (const spec of r.specs) {
    const { direction } = await compose(spec);
    assert.equal(direction.meta.score, 'hm-score', spec.id);
    const d = dryRun(direction);
    const log = { video: spec.id, title: spec.id, fps: direction.meta.fps, duration: direction.meta.duration, cues: d.cues, curves: d.curves };
    const { plan, report } = buildScore({ log, direction, spec }, {});
    assert.ok(plan.circular, 'the generic score renders the loop circularly (R7)');
    const s = await shapesOf({ cues: log }, { ...plan, report: { mallow: report.mallow, sound: report.sound } });
    assert.deepEqual(s.findings, [], spec.id);
    assert.ok(s.texture > 0, `${spec.id}: the sparkle cloud regenerates`);
  }
});
