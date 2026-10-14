// Realm palettes: a time of day carries three looks (base, tense, resolved)
// that two world dials blend, exactly as v2's palette(cold, warm) did:
//
//   P[k] = mix3(mix3(base[k], tense[k], tension), resolved[k], warmth)    colours (linear RGB)
//   P.n[k] = lerp(lerp(base.n[k], tense.n[k], tension), resolved.n[k], warmth)   scalars
//
// Colours are authored as sRGB hex and linearised with a 2.2 power (v2's L()).
// Arrays (the post tints) act in display space and are mixed as given.
//
// World jitter (spec.worldJitter: hue °, warmth, exposure) recolours the WORLD
// only: sky, water, hills, clouds and moon. The Mallow's light rig is never
// shifted, so the Mallow is relit but never recoloured. Zero jitter is an
// exact no-op (the colours are not even touched).

import { hex3, lerp } from '../engine/motion.js';

const L = (h) => hex3(h).map((v) => Math.pow(v, 2.2));
const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** World colour keys that jitter may touch (never the light rig). */
export const WORLD_COLOURS = Object.freeze(['zenith', 'high', 'horizon', 'haze', 'moonCol', 'haloCol', 'cloudLit', 'cloudDark', 'hillCol', 'waterNear', 'waterFar']);

/** Linearise one authored look: hex strings → linear RGB; arrays and n stay as given. */
export function lineariseLook(look) {
  const out = {};
  for (const k of Object.keys(look)) {
    const v = look[k];
    if (typeof v === 'string') out[k] = L(v);
    else if (k === 'n') out.n = { ...v };
    else out[k] = Array.isArray(v) ? [...v] : v;
  }
  return out;
}

/**
 * A palette blender for a time-of-day triple { base, tense, resolved } (hex
 * looks). → (tension, warmth) → P, key order of the base look.
 */
export function makePalette(triple, jitter = null) {
  const base = lineariseLook(triple.base), tense = lineariseLook(triple.tense), resolved = lineariseLook(triple.resolved);
  for (const look of [tense, resolved]) {
    const a = Object.keys(base).join(), b = Object.keys(look).join();
    if (a !== b) throw new Error(`palette looks must have the same keys in the same order (${a} vs ${b})`);
  }
  const keys = Object.keys(base).filter((k) => k !== 'n');
  const nKeys = Object.keys(base.n);
  const J = jitterTransform(jitter);
  return (cold, warm) => {
    const out = { n: {} };
    for (const k of keys) {
      if (k === 'n') continue;
      out[k] = mix3(mix3(base[k], tense[k], cold), resolved[k], warm);
    }
    for (const k of nKeys) out.n[k] = lerp(lerp(base.n[k], tense.n[k], cold), resolved.n[k], warm);
    if (J) J(out);
    return out;
  };
}

/**
 * The world-only jitter as an in-place transform of a mixed palette, or null
 * when every component is zero. Hue: rotation about the grey axis (luma kept);
 * warmth: ±R / ∓B gain; exposure: a gain on the post exposure.
 */
export function jitterTransform(j) {
  if (!j) return null;
  const hue = j.hue || 0, warmth = j.warmth || 0, exposure = j.exposure || 0;
  if (hue === 0 && warmth === 0 && exposure === 0) return null;
  const a = (hue * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  // rotation about (1,1,1)/√3 (Rodrigues), the classic hue-rotate matrix
  const k = (1 - c) / 3, q = Math.sqrt(1 / 3) * s;
  const M = [[c + k, k - q, k + q], [k + q, c + k, k - q], [k - q, k + q, c + k]];
  const wr = 1 + 0.5 * warmth, wb = 1 - 0.5 * warmth;
  return (P) => {
    for (const key of WORLD_COLOURS) {
      const v = P[key];
      if (!v) continue;
      const r = M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2];
      const g = M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2];
      const b = M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2];
      P[key] = [Math.max(0, r * wr), Math.max(0, g), Math.max(0, b * wb)];
    }
    if (P.n && 'exposure' in P.n) P.n.exposure *= 1 + exposure;
  };
}
