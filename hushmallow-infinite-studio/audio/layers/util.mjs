// Numeric helpers shared by the score's layers and recipes: v2's own
// definitions (audio/soundtrack-v2.mjs), written the same way so a layer
// computes the same doubles as buildPlanV2 did.

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smoothstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
export const st = (s) => Math.pow(2, s / 12);
export const r4 = (x) => Math.round(x * 1e4) / 1e4;

/** Linear interpolation of the per-frame curves at any time t (v2's curveSampler; a missing key reads 0). */
export function curveSampler(curves, fps) {
  return (key, t) => {
    const u = clamp(t * fps, 0, curves.length - 1);
    const i = Math.floor(u), f = u - i;
    const a = curves[i][key] ?? 0, b = curves[Math.min(i + 1, curves.length - 1)][key] ?? 0;
    return a + (b - a) * f;
  };
}

/** t wrapped into the loop [0, D); exact (untouched) for t already inside it. */
export function wrap(t, D) {
  let u = t;
  while (u < 0) u += D;
  while (u >= D) u -= D;
  return u;
}
