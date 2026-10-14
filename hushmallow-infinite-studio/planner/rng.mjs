// Seeded random streams for the planner. No Math.random anywhere: every
// choice comes from a named stream derived from (seed, stream name), so
// adding a draw to one stream never shifts the values of another, and a spec
// is reproducible byte for byte from its seed.
//
//   const r = stream(4991633, 'gag');  r.next() → [0, 1)   r.int(n)   r.pick(items, weights)
//
// Generator: sfc32 (small, fast, passes PractRand to 2^40+), seeded through
// splitmix32 from a 32-bit FNV-1a hash of the seed and stream name.

/** 32-bit FNV-1a of a string. */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function splitmix32(a) {
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let z = a;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

function sfc32(a, b, c, d) {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Derive a 32-bit seed from parts (numbers or strings), e.g. seedOf(batchSeed, index, attempt). */
export function seedOf(...parts) {
  return fnv1a(parts.map(String).join('␟'));
}

/** A named random stream. */
export function stream(seed, name) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`seed must be a uint32, got ${seed}`);
  const mix = splitmix32(fnv1a(`${seed >>> 0}/${name}`));
  const next = sfc32(mix(), mix(), mix(), mix());
  for (let i = 0; i < 12; i++) next();                 // discard the warm-up outputs
  const r = {
    next,
    /** Integer in [0, n). */
    int(n) { return Math.floor(next() * n); },
    /** Uniform in [a, b). */
    range(a, b) { return a + (b - a) * next(); },
    /** True with probability p. */
    chance(p) { return next() < p; },
    /** Weighted pick (weights default to 1). Returns undefined for an empty list. */
    pick(items, weights) {
      if (!items.length) return undefined;
      if (!weights) return items[r.int(items.length)];
      const total = weights.reduce((s, w) => s + w, 0);
      if (!(total > 0)) throw new Error('weighted pick: weights must sum to > 0');
      let x = next() * total;
      for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x < 0) return items[i]; }
      return items[items.length - 1];
    },
    /** A uint32 (for child seeds). */
    u32() { return Math.floor(next() * 4294967296) >>> 0; },
  };
  return r;
}
