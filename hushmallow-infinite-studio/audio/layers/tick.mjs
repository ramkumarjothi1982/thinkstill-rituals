// Layer MO-TICK: the 2 AM clock. Quiet once a second from the loop start until
// the gag, unsettled after the landing and faster with the spiral (cold and
// spin curves), stopping dead at the turn's squeeze; it keeps out of the way of
// every transient pop (recipes flagged `transient`).
//
//   tempo   the spec's audio-only sound.tickTempo slot (x0.9..1.1), 1 = v2
//   fix R10 the transient set comes from the recipes, not a hard-coded cue list
//   hit sync where a tick is heard as a transient cue's hit (inside its 120 ms hit
//           window, louder than the cue's own sound: audio/hits.mjs), the clock stays
//           out of that cue's whole hit window
//   fix R7  circular: the tick v2 placed in the discarded pre-roll (t < 0) is not
//           part of the loop (the loop's end has no clock), so it is dropped; the
//           others keep their tick/tock alternation.

import { clamp, r4 } from './util.mjs';

/** v2's hard-coded transient cue types (audio/soundtrack-v2.mjs L193), compat only. */
export const V2_BUSY = Object.freeze(['take', 'land', 'blink', 'glance', 'thought', 'lift_off', 'wince']);

export const CLEAR = 0.08;   // v2: a tick keeps 80 ms from a transient cue on either side

/**
 * L: layer context; busy: the cues to keep clear of, each a time or [t, after] (after:
 * how long past the cue the clock stays out, CLEAR by default; hit sync widens it to
 * the cue's hit window where a tick was heard as that cue's hit); tempo; circular. → ticks
 */
export function tick(L, { busy, tempo = 1, circular = false }) {
  const { A, C } = L;
  if (!(tempo >= 0.5 && tempo <= 2)) throw new Error(`score: tick tempo ${tempo} is outside 0.5..2`);
  const take = A.take(), land = A.land(), squeeze = A.squeeze();
  const ticks = [];
  const spans = busy.map((b) => (Array.isArray(b) ? b : [b, CLEAR]));
  const clear = (t) => { for (const [ct, after] of spans) if (t > ct - CLEAR && t < ct + after) return ct + after; return null; };
  let t = -0.85;
  while (t < take - 0.12) { ticks.push({ t: r4(t), hi: ticks.length % 2 === 0, peak: 0.034 }); t += 1 / tempo; }
  t = land + 0.9;
  while (t < squeeze - 0.05) {
    let m = clear(t); while (m !== null) { t = m; m = clear(t); }
    if (t >= squeeze - 0.05) break;
    const cold = C('cold', t), spin = C('spin', t);
    ticks.push({ t: r4(t), hi: ticks.length % 2 === 0, peak: 0.034 * (1 + 0.6 * cold) });
    t += 1 / (clamp(1 + 1.2 * cold + 0.6 * spin, 1, 3.2) * tempo);
  }
  return circular ? ticks.filter((k) => k.t >= 0) : ticks;
}
