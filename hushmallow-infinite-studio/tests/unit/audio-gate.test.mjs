// qa/gates/audio-gate.mjs (FU-2): G-AUDIO lints the whole score plan for banned
// shapes (audio/lint-recipes.mjs lintEvents), the sparkle cloud counting for its
// level only, and the legacy seam exception belongs to the approved v2 alone (its
// master's sha256 or the golden direction), not to a score id.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { studioPath } from '../../render/lib/paths.mjs';
import { loadContext, V2_TARGET } from '../../qa/gates/context.mjs';
import { audioGate, audioJob, shapesOf, seamKey, approvedV2Match } from '../../qa/gates/audio-gate.mjs';
import { loadThresholds } from '../../qa/run-qa.mjs';
import { buildScore, soundmap } from '../../audio/score.mjs';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const T = loadThresholds();
const LOG = readJson(studioPath('output', 'v2', 'cues.json'));
const GOLDEN = readJson(studioPath('specs', 'golden', 't01-v2.direction.json'));
const SPEC = readJson(studioPath('specs', 'golden', 't01-v2.json'));
/** a context like loadContext builds for a farm job: a composed direction, its cue log, a score id and plan */
const jobCtx = (over = {}) => ({ video: null, videoSha256: 'f'.repeat(64), direction: GOLDEN, cues: LOG, spec: SPEC, score: 'soundtrack-v2', plan: null, ...over });
/** a passing audio.py result (the gate's own measurements are not under test here) */
const PY = { checks: {}, metrics: {} };
/** the score-plan.json a farm job carries (audio/score-cli.mjs writeScorePlan) */
const scorePlanJson = (mallow, panSeed) => {
  const sm = soundmap(), d = mallow === 'noomi' ? GOLDEN : { ...GOLDEN, mallow: { ...GOLDEN.mallow, id: mallow }, realm: { ...GOLDEN.realm, id: sm.mallows[mallow].bed, tod: 'default' } };
  const { plan, report } = buildScore({ log: LOG, direction: d, spec: SPEC }, { sound: { panSeed } });
  return { schema: 'hm-score-plan/1', ...plan, report: { mode: report.mode, mallow: report.mallow, kit: report.kit, sound: report.sound } };
};

test('the approved v2: its whole score plan has no banned shape, its 25 sparkles regenerated as texture; the gate passes shapes and recipes', async () => {
  const ctx = await loadContext({ kind: 'manifest', path: V2_TARGET });
  const plan = ctx.plan;
  const s = await shapesOf(ctx, plan);
  assert.deepEqual(s.findings, []);
  assert.equal(s.texture, 25);
  assert.equal(s.events, plan.engine.length + plan.synth.length);
  const g = await audioGate(ctx, PY, plan, ctx.planSource, T);
  assert.equal(g.checks.shapes.status, 'pass', g.checks.shapes.detail);
  assert.equal(g.checks.recipes.status, 'pass');
  assert.equal(g.metrics.shapes.texture, 25);
});

test('default hm-score plans (score-plan.json) of every Mallow pass; a banned shape anywhere in a plan fails the gate', async () => {
  for (const mallow of ['noomi', 'glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi']) {
    const plan = scorePlanJson(mallow, 1234);
    const s = await shapesOf(jobCtx({ score: 'hm-score' }), plan);
    assert.deepEqual(s.findings, [], mallow);
    assert.ok(s.texture > 0 && s.mallow === mallow && s.panSeed === 1234, mallow);
  }
  const ctx = jobCtx({ score: 'hm-score' }), base = scorePlanJson('noomi', 7);
  const fail = async (synth, engine = [], why) => {
    const plan = { ...base, synth: [...base.synth, ...synth], engine: [...base.engine, ...engine] };
    const g = await audioGate(ctx, PY, plan, 'test', T);
    assert.equal(g.checks.shapes.status, 'fail', why);
    assert.equal(g.status, 'fail', why);
    return g.checks.shapes.detail;
  };
  assert.match(await fail([0, 0.6].flatMap((o) => [400, 450].map((f) => ({ t: 2 + o, inst: 'blip', f, a: 0.01, h: 0.4, d: 0.03, peak: 0.03 }))), [], 'a UK ring'), /ringtone/);
  assert.match(await fail([0, 0.15].map((o) => ({ t: 6.1 + o, inst: 'blip', f: 3000 / Math.pow(2, 110 / 1200), f1: 3000, glide: 0.002, a: 0.004, d: 0.05, peak: 0.04 })), [], 'beep-beep with scoops'), /alarm/);
  assert.match(await fail([], [0, 0.28].map((o) => ({ t: 6.5 + o, kind: 'fx', name: 'thrum', opts: { intensity: 0.6 }, trim: 0.8 })), 'a lub-dub on the engine thrum'), /heartbeat/);
  assert.match(await fail([], [{ t: 2.5, kind: 'fx', name: 'snap', opts: { intensity: 0.8 }, trim: 1 }], 'a full-force snap'), /jump-scare/);
  // inside the sparkle cloud (9.42–11.4 s): only the layer's own pings are texture
  assert.match(await fail([0, 0.1].map((o, k) => ({ t: 10 + o, inst: 'ping', f: [880, 1318.5][k], rise: 1.012, peak: 0.04, decay: 0.55, pan: 0, send: 0.45 })), [], 'a two-tone of pings among the sparkles'), /messenger-pop/);
});

test('a plan whose sparkle cloud does not regenerate is linted whole (a wrong pan seed or Mallow is no excuse)', async () => {
  const plan = scorePlanJson('noomi', 7);
  const wrong = await shapesOf(jobCtx({ score: 'hm-score' }), { ...plan, report: { ...plan.report, sound: { ...plan.report.sound, panSeed: 8 } } });
  assert.equal(wrong.texture, 0);
  assert.ok(wrong.findings.length > 0, 'the cloud alone reads as pops and trains');
  const unknown = await shapesOf(jobCtx({ score: 'hm-score' }), { ...plan, report: { ...plan.report, mallow: 'nobody' } });
  assert.equal(unknown.texture, 0);
});

test('the legacy seam exception is the approved v2\'s: its master by sha256 or the golden direction, never a score id', async () => {
  const v2 = await loadContext({ kind: 'manifest', path: V2_TARGET });
  assert.equal(await approvedV2Match(v2), 'video');
  assert.equal(await seamKey(v2, T), 'soundtrack-v2');
  // T01 composed from the golden spec and rendered by the farm: the golden direction
  assert.equal(await approvedV2Match(jobCtx()), 'direction');
  assert.equal(await seamKey(jobCtx(), T), 'soundtrack-v2');
  // any other direction still scored by the frozen score: the new-score limit
  const other = { ...GOLDEN, meta: { ...GOLDEN.meta, id: 'T01-noomi-late-night-15s-000000', fingerprint: 'sha256:0' } };
  assert.equal(await approvedV2Match(jobCtx({ direction: other })), null);
  assert.equal(await seamKey(jobCtx({ direction: other }), T), null);
  const moved = { ...GOLDEN, anchors: { ...GOLDEN.anchors, TURN: GOLDEN.anchors.TURN + 0.01 } };
  assert.equal(await seamKey(jobCtx({ direction: moved }), T), null, 'one anchor moved is another film');
  assert.equal(await seamKey(jobCtx({ direction: null }), T), null, 'no direction, not the approved master');
  // scores without a legacy entry pass through unchanged
  assert.equal(await seamKey(jobCtx({ score: 'hm-score', direction: other }), T), 'hm-score');
  assert.equal(await seamKey(jobCtx({ score: null }), T), null);
  // audio.py reads the limit by job.score; the score id travels as scoreId
  const j = await audioJob(jobCtx({ direction: other, plan: { engine: [], synth: [] }, planSource: 'test' }), null, T);
  assert.equal(j.job.score, null);
  assert.equal(j.job.scoreId, 'soundtrack-v2');
  const g = await audioJob(jobCtx({ plan: { engine: [], synth: [] }, planSource: 'test' }), null, T);
  assert.equal(g.job.score, 'soundtrack-v2');
});
