// Seeded randomness for the composer. Nothing here reads a clock.
//
//   streams(spec.seed).get('blinks')   a named stream (planner/rng.mjs: sfc32
//                                      seeded from the seed and the name), so
//                                      adding a draw to one stream never
//                                      shifts another. Composer stream names
//                                      are prefixed 'composer/' to stay clear
//                                      of the planner's own names (docs/SPEC.md).
//   lcg(seed)                          v2's mote generator (videos/my-brain-at-2am-v2.js
//                                      rng()), kept bit-exact so moves tuned on
//                                      v2 reproduce its particles.
//
// The direction records every drawn value explicitly; the runtime never
// draws a random number.

import { stream } from '../planner/rng.mjs';

/** Named streams rooted at a spec seed. get(name) is memoised per name. */
export function streams(seed) {
  const cache = new Map();
  return {
    seed,
    get(name) {
      if (!cache.has(name)) cache.set(name, stream(seed >>> 0, `composer/${name}`));
      return cache.get(name);
    },
  };
}

/** v2's linear congruential generator: () → [0, 1). */
export function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
