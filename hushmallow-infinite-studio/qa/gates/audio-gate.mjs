// G-AUDIO: the measurements of qa/gates/audio.py, plus the two rules that read
// the score's structure rather than its sound:
//
//   recipes   no ringtone, alarm, heartbeat, messenger-pop or jump-scare recipe:
//             every recipe the direction's moves declare for their cues, and
//             every event name of the score plan
//   close     MO-CLOSE is in the spec's sound motifs (the closing contour that
//             audio.py's tonal check verifies on the score plan)
// The score plan comes from qa/gates/context.mjs scorePlan(): score-plan.json
// when the score wrote one (WP-04), else a buildPlanV2 replay for the frozen
// soundtrack-v2.

import { check, gate } from './verdict.mjs';
import { scorePlan } from './context.mjs';

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

/** The job for audio.py. */
export async function audioJob(ctx, artefacts) {
  const { plan, source } = await scorePlan(ctx);
  const A = ctx.direction?.anchors || {};
  return {
    job: {
      video: ctx.video, duration: ctx.duration, fps: ctx.fps, cues: ctx.cues?.cues || [], plan,
      turn: A.TURN !== undefined && A.RITUAL0 !== undefined ? [A.TURN, A.RITUAL0] : null, score: ctx.score, artefacts,
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
  if (ctx.spec) {
    const has = (ctx.spec.sound?.motifs || []).includes('MO-CLOSE');
    checks.close = check(has ? 'pass' : 'fail', has, true, has ? 'MO-CLOSE is in the spec\'s sound motifs' : 'the spec\'s sound motifs have no MO-CLOSE');
  } else {
    checks.close = check('not-run', null, true, 'no spec: the sound motifs are unknown');
  }
  return gate(checks, { metrics: { ...py.metrics, planSource, recipes: used } });
}
