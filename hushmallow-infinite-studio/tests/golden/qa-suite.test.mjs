// QA suite v1 (WP-05), the heavy half: the approved v2 passes every gate
// within the 90 s budget, and (opt-in, HM_QA_FIXTURES=1, about 7 min plus
// about 15 min to build missing fixtures) every fault fixture fails exactly
// its own gate. Both take the heavy lock themselves (shared).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runQa } from '../../qa/run-qa.mjs';
import { runFixtures } from '../../qa/fixtures/run-fixtures.mjs';
import { qaProblems } from '../../planner/export.mjs';
import { mkWorkTemp } from '../../render/lib/paths.mjs';

test('the approved v2 passes every QA gate in 90 s or less, and its report meets the export QA contract', { timeout: 300_000 }, async () => {
  const out = mkWorkTemp('qa-v2-');
  const [r] = await runQa('v2', { out });
  assert.equal(r.status, 'pass', `failed: ${r.failed.join(', ')}; not run: ${r.pending.join(', ')}`);
  assert.equal(Object.keys(r.gates).length, 18);
  assert.ok(r.timings.total <= 90, `${r.timings.total} s`);
  assert.deepEqual(qaProblems(r, { videoSha256: r.video.sha256, fingerprint: r.spec.fingerprint, required: ['G-FINAL', 'G-AUDIO'] }), []);
  assert.equal(r.gates['G-FINAL:determinism'].metrics.frames.length, 3);
});

test('every fault fixture fails exactly its own gate (HM_QA_FIXTURES=1)', { timeout: 3_600_000, skip: process.env.HM_QA_FIXTURES !== '1' && 'set HM_QA_FIXTURES=1 (builds missing fixtures, then about 7 min)' }, async () => {
  const s = await runFixtures({ build: true, v2: false, log: () => {} });
  const bad = s.fixtures.filter((f) => !f.ok).map((f) => `${f.id}: ${f.why}`);
  assert.deepEqual(bad, []);
});
