// Circular timeline with a movable loop seam (PHASE2-PLAN, composer stage 7).
//
// A video of D seconds is composed on the domain [−P, D − P). The runtime
// shows wall time t ∈ [0, D) and evaluates the composition at
//
//   t* = t            for t < D − P
//   t* = t − D        for t ≥ D − P
//
// so the loop seam sits at wall time S = D − P instead of at frame 0:
//   - LP-RETURN (v2) uses P = 0: the seam is frame 0 and t* = t exactly;
//   - LP-RETRIGGER / LP-OBJECT put S at a quiet point (typically CARD_OUT + 0.1)
//     and let the trigger play straight across frame 0, which is ordinary
//     composition time there (t* runs −ε → 0 → +ε continuously).
// Loop closure is therefore required at S: the composition at D − P (left end
// of its domain) must equal the composition at −P (right after the seam).

/** Composition time of wall time t (identity when P = 0: not even a subtraction). */
export function wrapTime(t, D, P = 0) {
  if (!(P > 0)) return t;
  return t >= D - P ? t - D : t;
}

/** Wall time of composition time t* ∈ [−P, D − P). */
export function unwrapTime(ts, D, P = 0) {
  return ts < 0 ? ts + D : ts;
}

/** The composition domain [from, to] and the wall-time seam. */
export function domain(D, P = 0) {
  if (!(P >= 0 && P < D)) throw new Error(`loop seam P=${P} must be in [0, ${D})`);
  return { from: -P, to: D - P, seam: D - P };
}

/**
 * Loop closure of a function f(t*) at the seam: value step and slope step
 * between the two ends of the domain (one-sided differences of width h).
 * → { step, slopeStep, left, right }
 */
export function closure(f, D, P = 0, h = 1e-3) {
  const { from, to } = domain(D, P);
  const left = f(to - 1e-9), right = f(from);
  const slopeL = (f(to - 1e-9) - f(to - h)) / h;
  const slopeR = (f(from + h) - f(from)) / h;
  return { step: Math.abs(left - right), slopeStep: Math.abs(slopeL - slopeR), left, right };
}
