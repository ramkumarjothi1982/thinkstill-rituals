// Layer: the cloud of tiny rising sparkles as the thoughts dissolve into light
// (owned by the dissolve recipe, v2/dissolve). Sparse sine pings, panned
// around, drifting up, fading out over about 2 s from the first dissolve.
// Notes are reference notes (C6..E7), so they follow the kit's key and scale.
// Draws from the score's shared stream (the panSeed slot) in v2's order.

import { lerp } from './util.mjs';

export const SPARKLE_NOTES = Object.freeze(['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7']);

/** L: the score's layer context (audio/score.mjs). Pushes synth events. */
export function sparkles(L) {
  const { S, of, A, rnd, rr, pitch } = L;
  const d0 = Math.min(...of('dissolve').map((c) => c.t), A.exhale().t + 0.2);
  const notes = SPARKLE_NOTES.map((n) => pitch.note(n));
  for (let t = d0; t < d0 + 2.0;) {
    const age = t - d0, level = Math.exp(-age / 0.8);
    S(t, 'ping', { f: notes[Math.floor(rnd() * notes.length)], rise: 1.012 + 0.01 * rnd(), peak: 0.009 * (0.5 + 0.5 * rnd()) * (0.25 + 0.75 * level),
      decay: rr(0.14, 0.3), pan: rr(-0.85, 0.85), send: 0.45 });
    t += lerp(0.05, 0.13, age / 2) * rr(0.6, 1.4);
  }
}
