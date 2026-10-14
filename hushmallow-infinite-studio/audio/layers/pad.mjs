// Layer MO-WARMPAD: the warm transformation pad (major add9 on the kit's key),
// light and high-passed. A hint of it under the inhale, swelling from the
// exhale, opening with the warm curve, gone before the loop seam. Voiced in
// reference notes (C3 G3 D4 E4 G4 C5 E5 for Noomi), so a kit with another
// scale re-spells the chord on its own degrees.

import { r4, smoothstep } from './util.mjs';

export const PAD_VOICING = Object.freeze([['C3', 0.3], ['G3', 0.45], ['D4', 0.45], ['E4', 0.55], ['G4', 0.4], ['C5', 0.35], ['E5', 0.2]]);

/** L: layer context. → the plan's pad block */
export function pad(L) {
  const { A, C, DUR, pitch } = L;
  const inhale = A.inhale(), crest = A.crest(), exhale = A.exhale(), logo = A.logo();
  const out = { t0: inhale.t, dt: 0.02, hp: 170, notes: PAD_VOICING.map(([n, lvl]) => [pitch.note(n), lvl]), peak: 0.0132, env: [], lp: [] };
  for (let t = out.t0; t <= DUR + 1e-9; t += out.dt) {
    const pre = 0.18 * smoothstep(inhale.t, crest, t);                  // a hint of it under the inhale
    const up = smoothstep(exhale.t, exhale.t + 1.9, t);
    const down = 1 - smoothstep(logo + 0.6, DUR - 0.35, t);
    out.env.push(r4(Math.max(pre, up) * down * (0.85 + 0.15 * C('warm', t))));
    out.lp.push(Math.round(800 + 900 * C('warm', t)));
  }
  return out;
}
