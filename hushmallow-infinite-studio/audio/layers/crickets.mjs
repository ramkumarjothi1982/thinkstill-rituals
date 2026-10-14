// Layer: distant crickets, the night layer of a realm's time of day
// (library/sound/soundmap.json realms.<id>.tods.<tod>.layers.crickets). They
// sing while the Mallow sleeps, stop dead at the gag (comedic) and come back,
// fading in, in the calm ending, so the loop seam sits inside the night.
// Each voice is a sine carrier gated into chirps of 3-4 pulses; placement draws
// from the score's shared stream in v2's order.
//
//   fix R7  circular: v2's chirps before frame 0 (pre-roll) and after D are not
//           part of the loop. The draws are made exactly as v2 made them (so the
//           stream stays aligned for the layers after this one) and the pulses
//           outside [0, D) are dropped: the end's chirps run up to the seam and the
//           start's resume after it.

import { r4, smoothstep } from './util.mjs';

/** v2's two crickets: [carrier Hz, pan, period s, pulses], amplitude. */
export const V2_CRICKETS = Object.freeze({ voices: [[4150, -0.55, 0.64, 3], [3880, 0.6, 0.83, 4]], amp: 0.0065 });

/** L: layer context; params: {voices, amp}; circular. → crickets [{f, pan, ev}] */
export function crickets(L, { params, circular = false }) {
  const { A, rnd, rr, PRE, DUR } = L;
  const take = A.take(), open = A.open();
  const out = [];
  for (const [f, pan, per, pulses] of params.voices) {
    const ev = [];
    const chirps = (from, to, amp, fadeIn = 0) => {
      for (let t = from + rnd() * per; t < to; t += per * rr(0.85, 1.15)) {
        const k = fadeIn ? smoothstep(from, from + fadeIn, t) : 1;
        for (let p = 0; p < pulses; p++) { const tp = t + p * 0.031; if (tp + 0.018 < to) ev.push({ t: r4(tp), dur: 0.018, amp: amp * k * (p === 0 ? 0.75 : 1) }); }
      }
    };
    chirps(-PRE, take, params.amp);
    chirps(open + 0.5, DUR + 0.2, params.amp, 1.5);
    out.push({ f, pan, ev: circular ? ev.filter((p) => p.t >= 0 && p.t + p.dur < DUR) : ev });
  }
  return out;
}
