// Small numeric helpers shared by every Sensory Lab module. No DOM access.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;

/** Frame-rate independent exponential approach: move `cur` toward `goal` with a half-life in seconds. */
export const approach = (cur, goal, halfLife, dt) => goal + (cur - goal) * Math.pow(0.5, dt / Math.max(1e-4, halfLife));

/** Deterministic PRNG (mulberry32). Same seed, same sequence: reactions stay testable. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit string hash (FNV-1a). */
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Rubber-band response: grows linearly for small d, saturates at `limit`. */
export const rubber = (d, limit) => limit * Math.tanh(d / Math.max(1e-6, limit));
