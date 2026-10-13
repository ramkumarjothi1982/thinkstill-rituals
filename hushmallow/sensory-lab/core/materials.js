// Soft-body material presets for the SoftBody Physics Engine.
//
// Every value is a physical quantity in the solver's own units (local pixels of
// the approved artwork, seconds, unit node mass), so presets can be compared and
// tuned directly:
//   goalK      shape-memory stiffness (k with m = 1). sqrt(goalK)/2π ≈ wobble Hz
//   damping    velocity damping coefficient c (force = -c·v); ζ ≈ c / (2·sqrt(goalK))
//   edge       distance-constraint compliance (higher = stretchier surface)
//   area       triangle-area compliance (higher = more compressible)
//   bend       compliance of the two-cell "bending" links (higher = floppier)
//   gravity    px/s² pulling every node toward the floor (negative = buoyant)
//   grabK      how firmly a finger holds the surface it grabbed
//   stretch    rubber-band limit of a pull, as a fraction of body height
//   volume     how much a squeeze bulges sideways (1 = area preserving)
//   dent       depth multiplier for pokes and presses
//   float      resting hover height, fraction of body height (Cloud)
//   friction   floor friction 0..1
// `sound` tunes the Sound Engine's squish / stretch / release voices.

export const MATERIALS = {
  marshmallow: {
    id: 'marshmallow', label: 'Marshmallow', blurb: 'Very soft, slow to recover',
    goalK: 34, damping: 11.5, edge: 2.2e-3, area: 6e-2, bend: 1.2e-2, gravity: 70,
    grabK: 2600, stretch: 0.3, volume: 0.9, dent: 1.25, float: 0, friction: 0.5,
    sound: { squish: 0.9, pitch: 0.8, wet: 0.15, airy: 0.35, boing: 0.15 },
  },
  jelly: {
    id: 'jelly', label: 'Jelly', blurb: 'Elastic wobble',
    goalK: 330, damping: 3.2, edge: 1.6e-4, area: 2e-3, bend: 1.5e-3, gravity: 40,
    grabK: 3200, stretch: 0.26, volume: 1, dent: 0.85, float: 0, friction: 0.35,
    sound: { squish: 0.7, pitch: 1.25, wet: 0.85, airy: 0.05, boing: 0.9 },
  },
  mochi: {
    id: 'mochi', label: 'Mochi', blurb: 'Stretchy and springy',
    goalK: 150, damping: 4.4, edge: 4.5e-3, area: 8e-3, bend: 3e-2, gravity: 55,
    grabK: 4200, stretch: 0.62, volume: 1, dent: 1, float: 0, friction: 0.7,
    sound: { squish: 0.75, pitch: 1, wet: 0.4, airy: 0.1, boing: 0.6 },
  },
  cloud: {
    id: 'cloud', label: 'Cloud', blurb: 'Airy, gently floating',
    goalK: 26, damping: 7.5, edge: 3e-3, area: 0.12, bend: 1.5e-2, gravity: -8,
    grabK: 1800, stretch: 0.38, volume: 0.65, dent: 1.1, float: 0.07, friction: 0.2,
    sound: { squish: 0.45, pitch: 1.4, wet: 0, airy: 1, boing: 0.1 },
  },
  pillow: {
    id: 'pillow', label: 'Pillow', blurb: 'Deep, soft compression',
    goalK: 80, damping: 9, edge: 1.8e-3, area: 0.4, bend: 1e-2, gravity: 60,
    grabK: 2600, stretch: 0.24, volume: 0.42, dent: 1.7, float: 0, friction: 0.6,
    sound: { squish: 1, pitch: 0.65, wet: 0.05, airy: 0.6, boing: 0.05 },
  },
};

export const MATERIAL_IDS = Object.keys(MATERIALS);

export function getMaterial(id) { return MATERIALS[id] || MATERIALS.marshmallow; }

// How each material *looks* in the mesh shader (core/mesh-renderer.js):
//   shade  how strongly squashing deepens / stretching thins the colour
//   gloss  strength of a wet highlight that rides on the body (jelly, mochi)
//   haze   airy lightening (cloud) — a few percent, never a wash-out
export const LOOKS = {
  marshmallow: { shade: 1, gloss: 0, haze: 0.04 },
  jelly: { shade: 0.8, gloss: 0.55, haze: 0 },
  mochi: { shade: 1.2, gloss: 0.18, haze: 0.02 },
  cloud: { shade: 0.6, gloss: 0, haze: 0.14 },
  pillow: { shade: 1.6, gloss: 0, haze: 0.03 },
};

// Each Mallow's own softness, layered over the chosen material (multipliers).
// Same material, different character: Blubi is the squishiest, Glitzi pushes
// back a little, Noomi recovers like someone waking up slowly.
export const MALLOW_FEEL = {
  boppo: { goalK: 1.1, damping: 0.85, stretch: 1, dent: 1 },
  pipzi: { goalK: 1.2, damping: 0.8, stretch: 0.95, dent: 0.9 },
  blubi: { goalK: 0.75, damping: 1.1, stretch: 1.1, dent: 1.25 },
  glitzi: { goalK: 1.25, damping: 1, stretch: 0.85, dent: 0.8 },
  zuzu: { goalK: 0.95, damping: 0.72, stretch: 1.05, dent: 1 },
  loomi: { goalK: 0.8, damping: 1.25, stretch: 1.05, dent: 1.1 },
  noomi: { goalK: 0.7, damping: 1.35, stretch: 1, dent: 1.3 },
};

/** The physics constants for a material as felt by a particular Mallow. */
export function tuneMaterial(id, mallowId, { reducedMotion = false } = {}) {
  const base = getMaterial(id), f = MALLOW_FEEL[mallowId] || {};
  const m = { ...base };
  for (const k of ['goalK', 'damping', 'stretch', 'dent']) if (f[k]) m[k] = base[k] * f[k];
  if (reducedMotion) m.damping = m.damping * 2 + 4;
  return m;
}
