// Layer: the realm bed. The app's own ambience (hushmallow REALM_BEDS, by the
// realm preset's bed id) with its mood following the world-dial curves every
// 0.1 s, the bed's sparse music-box events only in the quiet stretches, and a
// level that dips under the spiral and settles lower in the calm ending.
//
//   v2 (compat)  one level point at a hard-coded 3.0 s; the pre-roll reads the
//                end of the loop
//   fix R10      that point is the first thought's arrival (3.0 s in T01)
//   fix R7       circular: the mood is continued past D for the bed's crossfade
//                tail (the loop's start again, curves are periodic); the render
//                crossfades the bed's continuation with its start over `xfade`
//                seconds (audio/render-offline.mjs), so the bed never restarts.

import { clamp, r4 } from './util.mjs';

/** Mood (the 4 app dials) from the curves at loop time tc. */
function moodAt(C, tc, DUR) {
  const cold = C('cold', clamp(tc, 0, DUR)), warm = C('warm', clamp(tc, 0, DUR));
  return { agitation: r4(clamp(C('agitation', clamp(tc, 0, DUR)) + 0.3 * cold, 0, 1)), heaviness: r4(0.6 * cold), clarity: r4(0.3 + 0.6 * warm), warmth: r4(0.25 + 0.7 * warm) };
}

/**
 * L: layer context; realm: engine bed id; firstThought: anchor time of the level
 * dip (v2: 3.0); circular: { xfade } | null. → the plan's bed block
 */
export function bed(L, { realm, firstThought, circular = null }) {
  const { A, C, DUR, PRE } = L;
  const take = A.take(), squeeze = A.squeeze(), exhale = A.exhale(), open = A.open(), logo = A.logo();
  const mood = [];
  for (let t = -PRE; t <= DUR + 1e-9; t += 0.1) {
    const tc = t < 0 ? t + DUR : t;        // the pre-roll is the end of the loop
    mood.push({ t: r4(t), m: moodAt(C, tc, DUR) });
  }
  if (circular) {
    // the crossfade tail: the loop's start again, sampled on the same 0.1 s grid
    for (let k = 1; k * 0.1 <= circular.xfade + 0.2 + 1e-9; k++) mood.push({ t: r4(DUR + k * 0.1), m: moodAt(C, k * 0.1, DUR) });
  }
  const out = {
    realm, fadeIn: 0.8, mood,
    tickWindows: [[-0.9, take - 0.3], [open + 0.3, logo - 0.4]],
    level: [[-PRE, 0.85], [take + 0.2, 0.9], [firstThought, 0.85], [squeeze - 0.1, 0.62], [exhale.t, 0.8], [open + 0.2, 0.7], [DUR, 0.85]],
  };
  if (circular) out.circular = { xfade: circular.xfade };
  return out;
}
