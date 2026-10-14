// Layer MO-HUM: the tension tone under the spiral. Two slowly beating sines and
// a soft octave (rendered by the swirl instrument), pitch creeping up a semitone
// with the cold curve, ducking to silence over 0.5 s at the turn's squeeze.
// The pitch is the reference G3, so it sits on the kit's scale (fifth below the
// key for Noomi). Automation is sampled on the swirl's timeline (swirl.mjs).

import { r4, smoothstep, st } from './util.mjs';

/** → { gainAt(t, cold), freqAt(t, cold) } for the swirl timeline. */
export function hum(L, { squeeze }) {
  const g3 = L.pitch.note('G3');
  return {
    gainAt: (t, cold) => r4(0.0045 * Math.pow(cold, 1.6) * (1 - smoothstep(squeeze, squeeze + 0.5, t))),
    freqAt: (t, cold) => r4(g3 * st(1.0 * cold)),
  };
}
