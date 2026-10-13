// Pocket Hush "Surprise Me": a small, deterministic rules engine (no AI calls).
//
// Weights start equal and are adjusted by:
//   Comfort DNA bias   what the person said helps, favourites, learned use
//   recency            never the last two moments again
//   time of day        evenings lean towards slower moments
//   reduced motion     skip none, but lean away from the most kinetic one
// Then a seeded draw picks the mode and a variant, so a given seed always
// gives the same surprise (testable), while the app seeds from the clock.

import { rng } from './math.js';

export const VARIANTS = {
  'quick-squeeze': { materials: ['marshmallow', 'pillow', 'jelly', 'mochi'] },
  'let-it-float': { kinds: ['bubbles', 'lanterns', 'petals', 'leaves'] },
  'gentle-glow': { tints: ['warm', 'moon', 'mallow'] },
  'soft-breath': {},
  'quiet-moment': {},
};

/**
 * @param {object} o
 * @param {{id:string, evening?:boolean}[]} o.modes  candidate modes
 * @param {Record<string, number>} [o.bias]          multipliers from ComfortDNA.surpriseBias()
 * @param {string[]} [o.recent]                     most recent first
 * @param {number} [o.hour]                          local hour 0..23
 * @param {boolean} [o.reducedMotion]
 * @param {number} [o.seed]
 * @returns {{mode:string, variant:object, weights:Record<string, number>}}
 */
export function pickSurprise({ modes, bias = {}, recent = [], hour = 12, reducedMotion = false, seed = 1 }) {
  const evening = hour >= 20 || hour < 6;
  const weights = {};
  for (const m of modes) {
    let w = 1 * (bias[m.id] || 1);
    if (recent.slice(0, 2).includes(m.id)) w = 0;
    if (evening && m.evening) w *= 1.6;
    if (!evening && !m.evening) w *= 1.15;
    if (reducedMotion && m.id === 'quick-squeeze') w *= 0.7;
    weights[m.id] = w;
  }
  let total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total <= 0) { for (const m of modes) weights[m.id] = 1; total = modes.length; }   // everything was recent
  const r = rng(seed >>> 0 || 1);
  let x = r() * total, mode = modes[modes.length - 1].id;
  for (const m of modes) { x -= weights[m.id]; if (x <= 0) { mode = m.id; break; } }
  const V = VARIANTS[mode] || {};
  const variant = {};
  if (V.materials) variant.material = V.materials[Math.floor(r() * V.materials.length)];
  if (V.kinds) variant.kind = V.kinds[Math.floor(r() * V.kinds.length)];
  if (V.tints) variant.tint = V.tints[Math.floor(r() * V.tints.length)];
  return { mode, variant, weights };
}
