// G-COST: predicted render time from the dry run, against the profile budget
// (PHASE2-PLAN "G-COST (compile)").
//
//   gcost(compiled, { spec }) → { pass, errors, warnings, metrics }
//
// predicted render = Σ frames (per-frame passes) + Σ sub-frames (GPU passes)
// + Σ face redraws, with the coefficients of the profile's cost model, times
// the model's fitted scale. The sub-frame and face-redraw counts come from the
// composer's own dry run (scene.motion()), never from a render, counted the
// way the engine counts them for that profile. The render figure is what the
// farm's segments take on one worker (provenance.json segments[].ms summed),
// which QA's G15 check compares it with; the budget is judged on the wall
// clock, render plus the job's fixed overhead.
//
// Models (FU-4 refit, 2026-10-15, on the single-worker farm renders of T01 in
// docs/wp/WP-02.md and docs/M0-REPORT.md):
//   exact  the v2 rules (sub-frame floor 3, a face redraw per sub-frame): the
//          audit's per-pass costs (docs/design/map-v2-code.md §0) scaled by
//          0.951 so v2 predicts the 1,337.6 s WP-01 measured (run A).
//   final  every WP-02 feature. Sub-frames as the engine counts them (P6
//          adaptiveFloor: one centred sample when nothing moves STILL_PX = 2 px
//          across the shutter, else the direction's 3–16); face redraws as the
//          face pass does them (P3 faceCache: none while the painting covers the
//          face, once per frame, every sub-frame only past MOTION_PX = 1.5 px).
//          Per-pass costs: WP-02's bench split (round 2, run B, exclusive lock);
//          the glass pass only while a glass card is on screen. The bench
//          samples read 15–20 % below the farm, so the scale (1.185) is fit so
//          T01 predicts the median farm segment time, 542.2 s over 6 renders
//          (481.6–604.4 s); each 90-frame segment is then within 8 %. Overhead 44.8 s per 15 s: compile, the
//          master encode's tail, score, mux and preview (median of the same 6
//          renders, 40.0–46.7 s). T01: 586.8 s = 9.78 min against a measured
//          wall-clock median of 586.5 s (521.6–651.1 s).
//   draft  0.5 scale, 1 sub-frame, the face once per frame without glow: the
//          plan's per-pass projection, scale 0.852 fit to the median draft
//          segment time, 79.8 s over 3 renders (79.3–81.7 s); overhead 9.4 s
//          (9.1–9.6 s). T01: 89.2 s against a measured median of 88.9 s.
//   proof  6 stills at final quality: 6 × the final model's mean frame × 2
//          (the busiest frames cost about twice the mean). T01: 14.5 s against
//          12.8–14.8 s measured (4 runs, page setup included).
// The overheads were measured with the WP-02 farm (x264 QP 15 master encoded
// alongside the render); the master pipeline of OWNER-DECISIONS Q4 (CRF 16 over
// near-lossless segment intermediates) moves them. G15 (WP-05) compares the
// actual segment time with the prediction on every QA run and is the refit's
// input.

import { createScene } from './scene.js';

/** Mirrors of engine constants (pinned to them by tests/unit/composer-cost.test.mjs). */
export const ENGINE = Object.freeze({
  stillPx: 2,              // engine/render/shutter.js STILL_PX: below this, one centred sample (P6)
  faceMotionPx: 1.5,       // engine/renderer/passes/face.js MOTION_PX: face redrawn per sub-frame above this (P3)
  restFull: 0.999,         // the painting covers the face: the rest pose is held, nothing is drawn (R1)
});

export const COST_MODELS = Object.freeze({
  exact: {
    provisional: false, stillPx: null, faceEverySub: true,
    perFrame: { world: 0.6, post: 0.17, readback: 0.02, overlay: 0.013 }, perSub: { gpu: 0.25, upload: 0.018 }, faceRedraw: 0.257,
    scale: 0.951, overheadSec: 0,
  },
  final: {
    provisional: false, stillPx: ENGINE.stillPx, faceEverySub: false, faceMotionPx: ENGINE.faceMotionPx,
    // ms per frame from the bench split / 1000: world 183; composite 29 + bloom 42.1 + post 84.9; readback 31; overlay 6.6; state 5.7
    perFrame: { world: 0.183, post: 0.156, readback: 0.031, overlay: 0.0066, state: 0.0057 },
    // sub-frame passes: (reflection 48.8 + composite 112.5 + mesh 200 + accum 84.2) / 3.08 sub-frames per frame;
    // glass 63.1 / 3.08 only on frames with a glass card on screen (P5b scissors it to the cards)
    perSub: { gpu: 0.1446 }, perSubGlass: 0.0205,
    faceRedraw: 0.0348,
    scale: 1.185, overheadSec: 44.8,
  },
  draft: {
    provisional: false, subframes: 1, faceEverySub: false, faceMotionPx: Infinity,
    perFrame: { world: 0.07, post: 0.04, readback: 0.006, overlay: 0.004 }, perSub: { gpu: 0.05, upload: 0.004 }, faceRedraw: 0.036,
    scale: 0.852, overheadSec: 9.4,
  },
});

/** Budgets in minutes per 15 s of video, scaled by duration (proof: 6 stills, seconds). */
export const BUDGETS = Object.freeze({ final: 11, draft: 3, exact: Infinity });
export const PROOF_BUDGET_S = 45;

/** Sub-frames the engine renders for a frame whose dry-run motion is m, under a model. */
export function subframesFor(m, meta, model) {
  if (model.subframes) return model.subframes;                                  // draft: always that many
  if (model.stillPx !== null && model.stillPx !== undefined && m.d < model.stillPx) return 1;   // P6: a still frame
  return Math.max(meta.subframes, Math.min(meta.subframeMax, Math.ceil(m.d / meta.subframePx)));
}

/** Face draws for a frame of N sub-frames under a model. */
export function faceRedrawsFor(m, N, restOn, model) {
  if (model.faceEverySub) return N;
  if (restOn) return 0;
  return 1 + (m.face > model.faceMotionPx ? N - 1 : 0);
}

/**
 * Predict the render of a direction under a cost model.
 * → { seconds (render, segment time on one worker), overheadSec, wallSeconds, subframes, glassSubframes, faceRedraws, frames }
 */
export function predict(direction, model = COST_MODELS.final) {
  const sc = createScene(direction);
  const { meta } = direction;
  const frames = Math.round(meta.duration * meta.fps);
  const rest = sc.channel('env.rest');
  const perFrame = Object.values(model.perFrame).reduce((a, b) => a + b, 0);
  const perSub = Object.values(model.perSub).reduce((a, b) => a + b, 0);
  const glassOn = (t) => sc.props.some((p) => { for (let i = 0; i < p.count; i++) if (p.at(i, t)) return true; return false; });
  let subs = 0, glassSubs = 0, redraws = 0;
  for (let i = 0; i < frames; i++) {
    const t = i / meta.fps;
    const m = sc.motion(t);
    const N = subframesFor(m, meta, model);
    subs += N;
    if (model.perSubGlass && glassOn(t)) glassSubs += N;
    redraws += faceRedrawsFor(m, N, rest(t) >= ENGINE.restFull, model);
  }
  const seconds = (frames * perFrame + subs * perSub + glassSubs * (model.perSubGlass || 0) + redraws * model.faceRedraw) * model.scale;
  const overheadSec = (model.overheadSec || 0) * (meta.duration / 15);
  return { seconds, overheadSec, wallSeconds: seconds + overheadSec, subframes: subs, glassSubframes: glassSubs, faceRedraws: redraws, frames };
}

export function gcost(compiled, { spec = null } = {}) {
  const direction = compiled?.direction ?? compiled;
  const quality = spec?.quality ?? direction.meta.profile ?? 'final';
  const errors = [], warnings = [];
  if (quality === 'proof') {
    // six full-quality stills: the final model's mean frame, twice (the busiest frames)
    const p = predict(direction, COST_MODELS.final);
    const est = 6 * (p.seconds / p.frames) * 2;
    if (est > PROOF_BUDGET_S) errors.push({ rule: 'cost:budget', message: `proof predicted ${est.toFixed(0)} s, budget ${PROOF_BUDGET_S} s` });
    return { pass: errors.length === 0, errors, warnings, metrics: { model: 'final', predictedSec: est, budgetSec: PROOF_BUDGET_S, provisional: false } };
  }
  const name = COST_MODELS[quality] ? quality : 'final';
  const model = COST_MODELS[name];
  const p = predict(direction, model);
  const exact = predict(direction, COST_MODELS.exact);
  const budgetMin = BUDGETS[name] * (direction.meta.duration / 15);
  const predictedMin = p.wallSeconds / 60;
  if (predictedMin > budgetMin) errors.push({ rule: 'cost:budget', message: `${name} render predicted ${predictedMin.toFixed(1)} min (render ${(p.seconds / 60).toFixed(1)} + overhead ${(p.overheadSec / 60).toFixed(1)}), budget ${budgetMin.toFixed(1)} min` });
  if (model.provisional) warnings.push({ rule: 'cost:provisional', message: `the ${name} cost model is provisional until it is fitted to measured renders` });
  return {
    pass: errors.length === 0, errors, warnings,
    metrics: {
      model: name, provisional: model.provisional, predictedMin, budgetMin,
      predictedSec: p.seconds, overheadSec: p.overheadSec, predictedWallSec: p.wallSeconds,
      subframes: p.subframes, faceRedraws: p.faceRedraws,
      exact: { predictedMin: exact.seconds / 60, subframes: exact.subframes, faceRedraws: exact.faceRedraws },
    },
  };
}
