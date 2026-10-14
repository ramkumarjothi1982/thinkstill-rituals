// G-COST: predicted render time from the dry run, against the profile budget
// (PHASE2-PLAN "G-COST (compile)").
//
//   gcost(compiled, { spec }) → { pass, errors, warnings, metrics }
//
// predicted = Σ frames (per-frame passes) + Σ sub-frames (GPU passes + face
// redraws) with the coefficients of the profile's cost model. The sub-frame and
// face-redraw counts come from the composer's own dry run (scene.motion()),
// never from a render.
//
// Models:
//   exact  the v2 rules on today's engine (sub-frame floor 3, a face redraw per
//          sub-frame): the audit's per-pass costs (docs/design/map-v2-code.md §0)
//          scaled by 0.951 so v2 predicts the 1,337.6 s WP-01 measured (run A).
//   final  PROVISIONAL until WP-02's bench refits it: the plan's per-pass
//          projection after the performance pass (adaptive floor of 1, face
//          drawn once per frame plus sub-frame redraws only when the face moves
//          more than 1.5 px, 1/4-res glow, optimised world).
//   draft  PROVISIONAL: half scale, one sub-frame, face once per frame, no glow blur.
// G15 (WP-05) compares actual with predicted and refits these numbers.

import { createScene } from './scene.js';

export const COST_MODELS = Object.freeze({
  exact: { provisional: false, floor: 3, perFrame: { world: 0.6, post: 0.17, readback: 0.02, overlay: 0.013 }, perSub: { gpu: 0.25, upload: 0.018 }, faceRedraw: 0.257, faceEverySub: true, scale: 0.951 },
  final: { provisional: true, floor: 1, perFrame: { world: 0.25, post: 0.17, readback: 0.02, overlay: 0.013 }, perSub: { gpu: 0.14, upload: 0.008 }, faceRedraw: 0.05, faceEverySub: false, faceMotionPx: 1.5, scale: 1 },
  draft: { provisional: true, floor: 1, cap: 1, perFrame: { world: 0.07, post: 0.04, readback: 0.006, overlay: 0.004 }, perSub: { gpu: 0.05, upload: 0.004 }, faceRedraw: 0.036, faceEverySub: false, faceMotionPx: Infinity, scale: 1 },
});

/** Budgets in minutes per 15 s of video, scaled by duration (proof: 6 stills, seconds). */
export const BUDGETS = Object.freeze({ final: 11, draft: 3, exact: Infinity });
export const PROOF_BUDGET_S = 45;

/** Predict the render of a direction under a cost model. → { seconds, subframes, faceRedraws, frames } */
export function predict(direction, model = COST_MODELS.final) {
  const sc = createScene(direction);
  const { meta } = direction;
  const frames = Math.round(meta.duration * meta.fps);
  const rest = sc.channel('env.rest');
  let subs = 0, redraws = 0, sec = 0;
  for (let i = 0; i < frames; i++) {
    const t = i / meta.fps;
    const m = sc.motion(t);
    const N = Math.max(model.floor, Math.min(model.cap ?? meta.subframeMax, Math.ceil(m.d / meta.subframePx)));
    const restOn = rest(t) >= 0.999;
    const r = model.faceEverySub ? N : restOn ? 0 : 1 + (m.face > model.faceMotionPx ? N - 1 : 0);
    subs += N; redraws += r;
    const pf = model.perFrame;
    sec += pf.world + pf.post + pf.readback + pf.overlay + N * (model.perSub.gpu + model.perSub.upload) + r * model.faceRedraw;
  }
  return { seconds: sec * model.scale, subframes: subs, faceRedraws: redraws, frames };
}

export function gcost(compiled, { spec = null } = {}) {
  const direction = compiled?.direction ?? compiled;
  const quality = spec?.quality ?? direction.meta.profile ?? 'final';
  const errors = [], warnings = [];
  if (quality === 'proof') {
    // six full-quality stills: the final model's per-frame cost at the busiest frames
    const p = predict(direction, COST_MODELS.final);
    const perFrame = p.seconds / p.frames;
    const est = 6 * perFrame * 2;                                          // busiest frames cost about twice the mean
    if (est > PROOF_BUDGET_S) errors.push({ rule: 'cost:budget', message: `proof predicted ${est.toFixed(0)} s, budget ${PROOF_BUDGET_S} s` });
    return { pass: errors.length === 0, errors, warnings, metrics: { model: 'final', predictedSec: est, budgetSec: PROOF_BUDGET_S, provisional: true } };
  }
  const name = COST_MODELS[quality] ? quality : 'final';
  const model = COST_MODELS[name];
  const p = predict(direction, model);
  const exact = predict(direction, COST_MODELS.exact);
  const budgetMin = BUDGETS[name] * (direction.meta.duration / 15);
  const predictedMin = p.seconds / 60;
  if (predictedMin > budgetMin) errors.push({ rule: 'cost:budget', message: `${name} render predicted ${predictedMin.toFixed(1)} min, budget ${budgetMin.toFixed(1)} min` });
  if (model.provisional) warnings.push({ rule: 'cost:provisional', message: `the ${name} cost model is provisional until WP-02's bench refits it` });
  return {
    pass: errors.length === 0, errors, warnings,
    metrics: {
      model: name, provisional: model.provisional, predictedMin, budgetMin, predictedSec: p.seconds, subframes: p.subframes, faceRedraws: p.faceRedraws,
      exact: { predictedMin: exact.seconds / 60, subframes: exact.subframes, faceRedraws: exact.faceRedraws },
    },
  };
}
