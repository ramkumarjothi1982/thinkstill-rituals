// Layer: the sleeping breath. An air swell at each inhale and a softer one at
// each exhale, weighted by the breath envelope: the Mallow breathes audibly
// exactly where the picture breathes.
//
//   v2 (compat)  period = loop / 4, and the score's own copy of the envelope,
//                which had lost the picture's 0.7 · smoothstep(10.8, 11.8) term:
//                the body breathed from 11.8 to 13.3 s with no sound (audit R11).
//   fix R11      period = the direction's breathPeriod anchor and the envelope is
//                composer/acting.js breathEnvelope(direction): ONE function for
//                picture and sound.
//   fix R7       circular: k runs over the loop's own breaths and every event is
//                placed modulo D, so the inhale that crosses the seam is the loop's
//                own last breath (v2 rendered a synthetic "previous night" pre-roll).

import { clamp, smoothstep, wrap } from './util.mjs';

/** v2 score's own envelope (audio/soundtrack-v2.mjs L181), kept for --compat v2-score only. */
export const v2ScoreEnvelope = (t) => (1 - smoothstep(0.18, 0.34, t)) + smoothstep(13.3, 14.4, t);

/** Inhale centred on k · period (the inflate rising through zero), exhale after it. */
const SWELLS = [[-0.95, 0.95, 0.5, 520, 880, 0.011], [0.95, 0.4, 1.4, 760, 420, 0.009]];

/**
 * L: layer context; period: seconds per breath; env(t): breath envelope;
 * circular: place events modulo D (no pre-roll).
 */
export function breath(L, { period, env, circular }) {
  const { S, DUR, PRE } = L;
  if (!(period > 0)) throw new Error(`score: breath period must be > 0, got ${period}`);
  if (circular) {
    const cycles = Math.round(DUR / period);
    if (Math.abs(cycles * period - DUR) > 1e-6) throw new Error(`score: ${DUR} s is not a whole number of ${period} s breaths (the circular breath must loop)`);
    for (let k = 0; k < cycles; k++) {
      const tc = k * period;
      for (const [dt, a, r, f0, f1, pk] of SWELLS) {
        const t0 = tc + dt;
        const w = env(wrap(t0 + a, DUR));
        if (w < 0.05) continue;
        S(t0 < 0 ? t0 + DUR : t0 >= DUR ? t0 - DUR : t0, 'air', { a, r, f0, f1, q: 0.8, peak: pk * w, send: 0.25 });
      }
    }
    return;
  }
  for (let k = -1; k * period < DUR + period; k++) {
    const tc = k * period;                      // inhale centre (inflate rising through zero)
    for (const [t0, a, r, f0, f1, pk] of SWELLS.map(([dt, ...rest]) => [tc + dt, ...rest])) {
      const mid = t0 + a;
      const w = env(clamp(mid, 0, DUR));
      if (w < 0.05 || t0 < -PRE + 0.05 || t0 > DUR) continue;
      S(t0, 'air', { a, r, f0, f1, q: 0.8, peak: pk * w, send: 0.25 });
    }
  }
}
