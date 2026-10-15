// G-AUDIO: the measurements of qa/gates/audio.py, plus the rules that read the
// score's structure rather than its sound:
//
//   recipes   no ringtone, alarm, heartbeat, messenger-pop or jump-scare recipe:
//             every recipe the direction's moves declare for their cues, and
//             every event name of the score plan
//   shapes    nothing in the score plan SOUNDS like one, whatever it is called:
//             the structural banned-sound lint (audio/lint-recipes.mjs lintEvents,
//             the detectors of audio/lint-shapes.mjs) over every engine and synth
//             event of the plan together, so a score made outside audio/score.mjs
//             is shape-checked too (FU-2). The sparkle layer's cloud of tiny random
//             pings is regenerated from the cue log, the Mallow and the pan seed
//             (audio/score.mjs sparkleTexture) and counts for its level only; any
//             other event is a full participant
//   close     MO-CLOSE is in the spec's sound motifs (the closing contour that
//             audio.py's tonal check verifies on the score plan)
// The score plan comes from qa/gates/context.mjs scorePlan(): score-plan.json
// when the score wrote one (WP-04), else a buildPlanV2 replay for the frozen
// soundtrack-v2.
//
// The seam exception (thresholds.json G-AUDIO seam.legacy: the frozen v2 score
// ends at 0.7 and restarts from 0, so its loop steps, R7) belongs to the approved
// v2 alone: the approved master itself (its sha256 in the frozen hash-lock) or the
// golden direction (T01 composed from specs/golden/t01-v2.json, the approved v2 bit
// for bit). seamKey() hands audio.py the legacy key only then; every other video is
// held to the new-score limit whatever its score id (FU-2; it used to be keyed on
// the score id, so any direction still on 'soundtrack-v2' passed at −24 dBFS).

import fs from 'node:fs';
import { check, gate } from './verdict.mjs';
import { scorePlan } from './context.mjs';
import { studioPath } from '../../render/lib/paths.mjs';

/** The approved master and the golden direction the seam exception belongs to. */
export const APPROVED_V2 = Object.freeze({
  video: 'output/v2/my-brain-at-2am-v2.mp4',             // its sha256: qa/golden/v2/frozen.sha256
  direction: 'specs/golden/t01-v2.direction.json',
});

let approvedCache = null;
/** { videoSha256, directionHash } of the approved v2 (from the hash-lock and the golden direction). */
async function approvedV2() {
  if (!approvedCache) {
    const { FROZEN_MANIFEST } = await import('../../render/lib/frozen.mjs');
    const { hashOf } = await import('../../planner/canonical.mjs');
    const line = fs.readFileSync(FROZEN_MANIFEST, 'utf8').split('\n').map((l) => /^([0-9a-f]{64})\s+\*?(.+)$/.exec(l.trim())).find((m) => m && m[2] === APPROVED_V2.video);
    if (!line) throw new Error(`G-AUDIO: ${APPROVED_V2.video} is not in the frozen hash-lock`);
    const d = JSON.parse(fs.readFileSync(studioPath(APPROVED_V2.direction), 'utf8'));
    approvedCache = { videoSha256: line[1], directionHash: hashOf(d.direction && d.direction.schema ? d.direction : d), hashOf };
  }
  return approvedCache;
}

/** Is this target the approved v2: its master (by sha256) or the golden direction (by its canonical hash)? → 'video' | 'direction' | null */
export async function approvedV2Match(ctx) {
  const a = await approvedV2();
  if (ctx.videoSha256 && ctx.videoSha256 === a.videoSha256) return 'video';
  if (ctx.direction && a.hashOf(ctx.direction) === a.directionHash) return 'direction';
  return null;
}

/**
 * The key audio.py reads the seam limit by (job.score): the target's score id where the
 * thresholds hold no legacy exception for it; for a legacy score id, that id only when
 * the target is the approved v2, else null (the new-score limit).
 */
export async function seamKey(ctx, T) {
  const legacy = T?.gates?.['G-AUDIO']?.seam?.legacy || {};
  if (!ctx.score || !Object.hasOwn(legacy, ctx.score)) return ctx.score ?? null;
  return (await approvedV2Match(ctx)) ? ctx.score : null;
}

/** Recipe ids and plan event names this video's sound is made of. */
export async function recipesOf(ctx, plan) {
  const names = new Set();
  const d = ctx.direction;
  if (d?.moves?.length) {
    const { MOVES } = await import('../../composer/moves/index.js');
    for (const m of d.moves) for (const c of Object.values(MOVES[m.id]?.cues || {})) if (c?.recipe) names.add(String(c.recipe));
  }
  for (const e of plan?.engine || []) if (e.name) names.add(String(e.name));
  for (const e of plan?.synth || []) if (e.inst) names.add(String(e.inst));
  for (const e of plan?.events || []) if (e.recipe || e.name) names.add(String(e.recipe || e.name));
  return [...names].sort();
}

/**
 * The structural banned-sound lint over a score plan's events. The plan's Mallow and pan
 * seed (score-plan.json report; v2's for a plan without one) regenerate the sparkle
 * cloud; a plan whose cloud does not regenerate is linted whole.
 * → { findings: [{ rule, message }], events, texture, mallow, panSeed }
 */
export async function shapesOf(ctx, plan) {
  const { lintEvents } = await import('../../audio/lint-recipes.mjs');
  const { sparkleTexture, V2_SEED } = await import('../../audio/score.mjs');
  const mallow = plan.report?.mallow ?? 'noomi', panSeed = plan.report?.sound?.panSeed ?? V2_SEED;
  let texture = new Set();
  try { texture = sparkleTexture(plan, { log: ctx.cues || { cues: [] }, mallow, panSeed }); } catch { /* an unknown Mallow: no texture */ }
  const events = { engine: plan.engine || [], synth: plan.synth || [] };
  return { findings: lintEvents(events, { texture }), events: events.engine.length + events.synth.length, texture: texture.size, mallow, panSeed };
}

/** The job for audio.py (job.score: the seam key, seamKey()). */
export async function audioJob(ctx, artefacts, T = null) {
  const { plan, source } = await scorePlan(ctx);
  const A = ctx.direction?.anchors || {};
  const thresholds = T || JSON.parse(fs.readFileSync(studioPath('qa', 'gates', 'thresholds.json'), 'utf8'));
  return {
    job: {
      video: ctx.video, duration: ctx.duration, fps: ctx.fps, cues: ctx.cues?.cues || [], plan,
      turn: A.TURN !== undefined && A.RITUAL0 !== undefined ? [A.TURN, A.RITUAL0] : null,
      score: await seamKey(ctx, thresholds), scoreId: ctx.score, artefacts,
    },
    plan, planSource: source,
  };
}

export async function audioGate(ctx, py, plan, planSource, T) {
  if (!py) return gate({ measure: check('not-run', null, null, 'audio.py did not run') });
  const checks = { ...py.checks };
  const banned = T.gates['G-AUDIO'].bannedRecipes;
  const used = await recipesOf(ctx, plan);
  const hits = used.filter((n) => banned.some((b) => n.toLowerCase().includes(b)));
  checks.recipes = used.length
    ? check(hits.length ? 'fail' : 'pass', hits.length, 0, hits.length ? `banned recipes: ${hits.join(', ')}` : `${used.length} recipes and score events, none banned (${banned.join(', ')})`)
    : check('not-run', null, 0, 'no move recipes and no score plan to read');
  let shapes = null;
  if (plan) {
    shapes = await shapesOf(ctx, plan);
    const f = shapes.findings;
    checks.shapes = check(f.length ? 'fail' : 'pass', f.length, 0, f.length
      ? `the score plan sounds like a banned recipe: ${[...new Set(f.map((x) => x.message))].join('; ')}`
      : `${shapes.events} score events, no banned shape (ringtone, alarm, heartbeat, messenger pop, jump scare); ${shapes.texture} sparkle-layer events counted for their level only`);
  } else {
    checks.shapes = check('not-run', null, 0, 'no score plan to read');
  }
  if (ctx.spec) {
    const has = (ctx.spec.sound?.motifs || []).includes('MO-CLOSE');
    checks.close = check(has ? 'pass' : 'fail', has, true, has ? 'MO-CLOSE is in the spec\'s sound motifs' : 'the spec\'s sound motifs have no MO-CLOSE');
  } else {
    checks.close = check('not-run', null, true, 'no spec: the sound motifs are unknown');
  }
  const seam = { score: ctx.score, legacyExemption: await approvedV2Match(ctx).then((m) => (m && Object.hasOwn(T.gates['G-AUDIO'].seam?.legacy || {}, ctx.score) ? m : null)) };
  return gate(checks, { metrics: { ...py.metrics, planSource, recipes: used, shapes: shapes && { events: shapes.events, texture: shapes.texture, mallow: shapes.mallow, panSeed: shapes.panSeed, findings: shapes.findings }, seam } });
}
