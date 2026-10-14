// Character Personality Engine — how each Mallow answers a gesture.
//
// Deterministic and local: a response is chosen from authored variants using
// the gesture, its duration / rhythm / speed, recent history, a slowly
// drifting mood and the person's chosen style. A seeded PRNG keeps it
// reproducible (and testable) while avoiding the same answer twice in a row.
// No network, no AI calls, and no claim to know how the person feels: the mood
// here is the *Mallow's* state, built only from what was touched.
//
// A response: {
//   react?   rig one-shot reaction kind (src/mallows/reactions.js)
//   mix?     expression blend (src/mallows/expressions.js presets)
//   i        expression intensity 0..1
//   hold     seconds to keep the expression (Infinity = until the gesture ends)
//   voice?   Sound Engine voice: tap | giggle | hum | surprise | content | boing | grumble | coo
//   poke?    physics impulse multiplier for taps
//   tag      short id of what happened (for tests, captions and Hushprints)
// }

import { rng, hash, clamp, approach } from './math.js';

// Shared behaviour; each Mallow overrides parts of it below.
const BASE = {
  energy: 1,
  tickleAt: 4,       // taps in one streak before the Mallow gets giggly
  dizzyAt: 9,        // …and before it gets dizzy
  tap: [
    { react: 'tap', mix: { happy: 1 }, i: 0.5, hold: 0.9, voice: 'tap', poke: 1, tag: 'tap-hello' },
    { react: 'nod', mix: { curious: 1 }, i: 0.5, hold: 1.1, voice: 'tap', poke: 0.8, tag: 'tap-curious' },
    { react: 'tap', mix: { playful: 1 }, i: 0.45, hold: 1, voice: 'tap', poke: 1, tag: 'tap-playful' },
  ],
  tickle: { react: 'hop', mix: { excited: 0.6, playful: 0.4 }, i: 0.7, hold: 1.4, voice: 'giggle', poke: 1.2, tag: 'tap-giggle' },
  dizzy: { react: 'shiver', mix: { confused: 1 }, i: 0.8, hold: 2.2, voice: 'surprise', poke: 0.6, tag: 'tap-dizzy' },
  groove: { react: 'nod', mix: { happy: 0.7, playful: 0.3 }, i: 0.6, hold: 1.2, voice: 'tap', poke: 0.7, tag: 'tap-groove' },
  doubletap: [
    { react: 'doubleTap', mix: { surprised: 0.4, happy: 0.6 }, i: 0.75, hold: 1.3, voice: 'surprise', tag: 'double-bounce' },
    { react: 'doubleTap', mix: { excited: 1 }, i: 0.7, hold: 1.3, voice: 'giggle', tag: 'double-excited' },
    { react: 'hop', mix: { playful: 1 }, i: 0.75, hold: 1.2, voice: 'boing', tag: 'double-playful' },
  ],
  holdstart: { mix: { comforted: 1 }, i: 0.6, hold: Infinity, voice: 'hum', tag: 'hold-settle' },
  holdlong: { mix: { loved: 0.45, calm: 0.55 }, i: 0.7, hold: Infinity, tag: 'hold-melt' },
  holdend: { react: 'comfort', mix: { happy: 0.5, comforted: 0.5 }, i: 0.5, hold: 1.6, voice: 'content', tag: 'hold-thanks' },
  strokeslow: { mix: { comforted: 0.6, loved: 0.4 }, i: 0.55, hold: Infinity, voice: 'coo', tag: 'stroke-content' },
  strokefast: { mix: { playful: 0.6, happy: 0.4 }, i: 0.7, hold: Infinity, voice: 'giggle', tag: 'stroke-tickle' },
  strokeend: { mix: { loved: 0.6, happy: 0.4 }, i: 0.6, hold: 2, voice: 'content', tag: 'stroke-after' },
  dragstart: { mix: { surprised: 0.5, curious: 0.5 }, i: 0.5, hold: Infinity, tag: 'drag-oh' },
  release: { react: 'release', mix: { happy: 0.6, surprised: 0.4 }, i: 0.6, hold: 1, voice: 'boing', tag: 'drag-release' },
  fling: { react: 'flick', mix: { surprised: 1 }, i: 0.7, hold: 1.2, voice: 'surprise', tag: 'drag-fling' },
  squeezestart: { mix: { surprised: 0.3, happy: 0.7 }, i: 0.4, hold: Infinity, tag: 'squeeze-in' },
  squeezesoft: { react: 'release', mix: { comforted: 1 }, i: 0.55, hold: 1.2, voice: 'content', tag: 'squeeze-soft' },
  squeezehard: { react: 'release', mix: { happy: 0.7, surprised: 0.3 }, i: 0.75, hold: 1.3, voice: 'boing', tag: 'squeeze-pop' },
  // mood → resting expression
  rest: { warm: { comforted: 1 }, excited: { happy: 1 }, both: { loved: 0.5, happy: 0.5 } },
};

// Each Mallow's distinct answers. Every Mallow authors every gesture, using its
// own rig reactions (src/mallows/reactions.js), so the same touch reads as a
// different character: Glitzi pretends not to care, Blubi melts, Zuzu spins
// with curiosity, Boppo bounces, Pipzi sparks, Loomi stays unbothered, Noomi
// dozes. (Lines are never spoken; tags name what happened.)
const R = (react, mix, i, hold, voice, tag, extra = {}) => ({ react, mix, i, hold, voice, tag, ...extra });
export const PROFILES = {
  boppo: {
    energy: 1.15, tickleAt: 3, dizzyAt: 10,
    tap: [
      R('tap', { happy: 1 }, 0.6, 0.9, 'tap', 'tap-boop', { poke: 1.1 }),
      R('hop', { excited: 1 }, 0.55, 1, 'boing', 'tap-hop', { poke: 1 }),
      R('tap', { surprised: 0.3, happy: 0.7 }, 0.55, 0.9, 'tap', 'tap-oh', { poke: 1.1 }),
    ],
    tickle: R('hop', { excited: 1 }, 0.85, 1.6, 'giggle', 'tap-giggle', { poke: 1.3 }),
    doubletap: [
      R('doubleTap', { excited: 1 }, 0.8, 1.3, 'giggle', 'double-boop'),
      R('doubleTap', { surprised: 0.3, happy: 0.7 }, 0.75, 1.3, 'surprise', 'double-bounce'),
    ],
    holdstart: R(null, { happy: 0.4, comforted: 0.6 }, 0.6, Infinity, 'hum', 'hold-sunny'),
    holdlong: R(null, { loved: 0.6, calm: 0.4 }, 0.65, Infinity, null, 'hold-sunbeam'),
    holdend: R('success', { happy: 1 }, 0.6, 1.4, 'content', 'hold-thanks'),
    strokeslow: R(null, { loved: 0.55, comforted: 0.45 }, 0.6, Infinity, 'coo', 'stroke-content'),
    strokefast: R(null, { excited: 0.6, playful: 0.4 }, 0.75, Infinity, 'giggle', 'stroke-tickle'),
    strokeend: R('hop', { happy: 1 }, 0.6, 1.6, 'content', 'stroke-after'),
    dragstart: R(null, { surprised: 0.4, excited: 0.6 }, 0.5, Infinity, null, 'drag-wheee'),
    release: R('release', { happy: 0.8, surprised: 0.2 }, 0.65, 1.1, 'boing', 'drag-release'),
    fling: R('doubleTap', { excited: 1 }, 0.8, 1.3, 'giggle', 'drag-whee'),
    squeezestart: R(null, { happy: 0.7, surprised: 0.3 }, 0.45, Infinity, null, 'squeeze-in'),
    squeezesoft: R('release', { happy: 0.5, comforted: 0.5 }, 0.6, 1.2, 'content', 'squeeze-soft'),
    squeezehard: R('success', { excited: 1 }, 0.8, 1.4, 'giggle', 'squeeze-boop'),
    rest: { warm: { happy: 0.6, comforted: 0.4 }, excited: { excited: 1 }, both: { happy: 1 } },
  },
  pipzi: {
    energy: 1.1, tickleAt: 3, dizzyAt: 9,
    tap: [
      R('tap', { excited: 1 }, 0.6, 0.9, 'tap', 'tap-spark', { poke: 1.1 }),
      R('tap', { surprised: 0.6, happy: 0.4 }, 0.6, 0.9, 'surprise', 'tap-ooh', { poke: 1 }),
      R('hop', { playful: 1 }, 0.55, 1, 'tap', 'tap-hop', { poke: 1.1 }),
    ],
    tickle: R('doubleTap', { excited: 1 }, 0.85, 1.5, 'giggle', 'tap-kapow', { poke: 1.2 }),
    doubletap: [
      R('celebrate', { excited: 1 }, 0.85, 1.6, 'giggle', 'double-kapow'),
      R('doubleTap', { surprised: 0.5, excited: 0.5 }, 0.8, 1.3, 'surprise', 'double-sparks'),
    ],
    holdstart: R(null, { determined: 0.4, calm: 0.6 }, 0.55, Infinity, 'hum', 'hold-trying-calm'),
    holdlong: R(null, { comforted: 0.7, happy: 0.3 }, 0.6, Infinity, null, 'hold-whisper-sparks'),
    holdend: R('tap', { excited: 0.6, happy: 0.4 }, 0.65, 1.3, 'giggle', 'hold-sparks-back'),
    strokeslow: R(null, { happy: 0.6, loved: 0.4 }, 0.6, Infinity, 'coo', 'stroke-glow'),
    strokefast: R(null, { excited: 1 }, 0.8, Infinity, 'giggle', 'stroke-fizz'),
    strokeend: R('tap', { happy: 1 }, 0.65, 1.5, 'content', 'stroke-after'),
    dragstart: R(null, { excited: 0.7, surprised: 0.3 }, 0.55, Infinity, null, 'drag-woo'),
    release: R('release', { excited: 0.6, happy: 0.4 }, 0.7, 1.1, 'boing', 'drag-release'),
    fling: R('celebrate', { excited: 1 }, 0.85, 1.5, 'giggle', 'drag-kapow'),
    squeezestart: R(null, { excited: 0.5, surprised: 0.5 }, 0.5, Infinity, null, 'squeeze-in'),
    squeezesoft: R('release', { happy: 1 }, 0.6, 1.2, 'content', 'squeeze-soft'),
    squeezehard: R('celebrate', { excited: 1 }, 0.85, 1.5, 'giggle', 'squeeze-kapow'),
    rest: { warm: { happy: 1 }, excited: { excited: 1 }, both: { excited: 0.5, happy: 0.5 } },
  },
  blubi: {
    energy: 0.75, tickleAt: 5, dizzyAt: 10,
    tap: [
      R('tap', { happy: 0.6, embarrassed: 0.4 }, 0.5, 1.1, 'coo', 'tap-blush', { poke: 1 }),
      R('nod', { comforted: 1 }, 0.5, 1.2, 'tap', 'tap-snuggle', { poke: 0.9 }),
      R('tap', { loved: 0.5, happy: 0.5 }, 0.45, 1.1, 'tap', 'tap-aww', { poke: 1 }),
    ],
    tickle: R('tap', { embarrassed: 1 }, 0.7, 1.8, 'giggle', 'tap-shy', { poke: 0.9 }),
    doubletap: [
      R('doubleTap', { surprised: 0.4, happy: 0.6 }, 0.7, 1.4, 'surprise', 'double-splash'),
      R('doubleTap', { loved: 1 }, 0.7, 1.4, 'coo', 'double-heart'),
    ],
    holdstart: R(null, { comforted: 1 }, 0.65, Infinity, 'hum', 'hold-melt'),
    holdlong: R(null, { loved: 1 }, 0.75, Infinity, null, 'hold-happy-tears', { extra: { wet: 0.6 } }),
    holdend: R('comfort', { loved: 0.6, happy: 0.4 }, 0.6, 1.8, 'content', 'hold-thanks'),
    strokeslow: R(null, { loved: 1 }, 0.7, Infinity, 'coo', 'stroke-melt'),
    strokefast: R(null, { embarrassed: 0.5, playful: 0.5 }, 0.65, Infinity, 'giggle', 'stroke-giggly'),
    strokeend: R('comfort', { loved: 0.7, happy: 0.3 }, 0.6, 2, 'content', 'stroke-after'),
    dragstart: R(null, { surprised: 0.5, anxious: 0.2, curious: 0.3 }, 0.5, Infinity, null, 'drag-oh-no'),
    release: R('release', { relieved: 0.6, happy: 0.4 }, 0.6, 1.3, 'content', 'drag-phew'),
    fling: R('flick', { sad: 0.4, surprised: 0.6 }, 0.55, 1.4, 'surprise', 'drag-wobbly'),
    squeezestart: R(null, { loved: 0.6, surprised: 0.4 }, 0.45, Infinity, null, 'squeeze-in'),
    squeezesoft: R('release', { comforted: 1 }, 0.65, 1.4, 'coo', 'squeeze-soft'),
    squeezehard: R('release', { happy: 0.6, surprised: 0.4 }, 0.7, 1.4, 'boing', 'squeeze-dramatic'),
    rest: { warm: { loved: 1 }, excited: { happy: 1 }, both: { loved: 0.6, happy: 0.4 } },
  },
  glitzi: {
    energy: 0.9, tickleAt: 3, dizzyAt: 7,
    tap: [
      R('tap', { curious: 0.5, proud: 0.5 }, 0.5, 1, 'tap', 'tap-unimpressed', { poke: 0.9 }),
      R('glitchBurst', { surprised: 1 }, 0.5, 0.8, 'surprise', 'tap-glitch', { poke: 1 }),
      R('tap', { playful: 1 }, 0.45, 1, 'tap', 'tap-side-eye', { poke: 0.9 }),
    ],
    tickle: R('flick', { frustrated: 0.5, playful: 0.5 }, 0.65, 1.5, 'grumble', 'tap-pretend-annoyed', { poke: 0.8 }),
    doubletap: [
      R('glitchBurst', { surprised: 0.6, playful: 0.4 }, 0.7, 1.3, 'surprise', 'double-static'),
      R('celebrate', { happy: 1 }, 0.6, 1.4, 'giggle', 'double-secretly-delighted'),
    ],
    holdstart: R(null, { proud: 0.5, calm: 0.5 }, 0.55, Infinity, 'hum', 'hold-tolerating'),
    holdlong: R(null, { loved: 0.5, embarrassed: 0.5 }, 0.6, Infinity, null, 'hold-caught-enjoying'),
    holdend: R('tap', { proud: 0.6, playful: 0.4 }, 0.55, 1.4, 'content', 'hold-whatever'),
    strokeslow: R(null, { loved: 0.4, proud: 0.6 }, 0.55, Infinity, 'coo', 'stroke-secretly-likes'),
    strokefast: R(null, { frustrated: 0.4, playful: 0.6 }, 0.6, Infinity, 'grumble', 'stroke-static'),
    strokeend: R('idle', { proud: 0.5, happy: 0.5 }, 0.55, 1.8, 'content', 'stroke-after'),
    dragstart: R(null, { surprised: 0.4, frustrated: 0.6 }, 0.45, Infinity, null, 'drag-hey'),
    release: R('release', { playful: 0.7, proud: 0.3 }, 0.6, 1.1, 'boing', 'drag-release'),
    fling: R('flick', { angry: 0.4, playful: 0.6 }, 0.55, 1.3, 'grumble', 'drag-rude'),
    squeezestart: R(null, { frustrated: 0.5, surprised: 0.5 }, 0.45, Infinity, null, 'squeeze-in'),
    squeezesoft: R('release', { calm: 0.6, proud: 0.4 }, 0.55, 1.2, 'grumble', 'squeeze-soft'),
    squeezehard: R('glitchBurst', { playful: 0.6, surprised: 0.4 }, 0.7, 1.3, 'surprise', 'squeeze-glitch'),
    rest: { warm: { loved: 0.4, proud: 0.6 }, excited: { playful: 1 }, both: { happy: 1 } },
  },
  zuzu: {
    energy: 0.85, tickleAt: 4, dizzyAt: 8,
    tap: [
      R('tap', { curious: 1 }, 0.55, 1.1, 'tap', 'tap-ooh-what', { poke: 1 }),
      R('nod', { awe: 0.5, curious: 0.5 }, 0.5, 1.1, 'tap', 'tap-wonder', { poke: 0.9 }),
      R('tap', { playful: 0.6, confused: 0.4 }, 0.5, 1.1, 'surprise', 'tap-what-if', { poke: 1 }),
    ],
    tickle: R('doubleTap', { confused: 0.4, excited: 0.6 }, 0.7, 1.5, 'giggle', 'tap-spin'),
    doubletap: [
      R('doubleTap', { excited: 1 }, 0.75, 1.4, 'giggle', 'double-pirouette'),
      R('doubleTap', { awe: 0.6, surprised: 0.4 }, 0.7, 1.4, 'surprise', 'double-whoa'),
    ],
    holdstart: R(null, { calm: 0.7, curious: 0.3 }, 0.55, Infinity, 'hum', 'hold-slow-spin'),
    holdlong: R(null, { calm: 0.6, awe: 0.4 }, 0.65, Infinity, null, 'hold-still-spirals'),
    holdend: R('nod', { curious: 0.5, happy: 0.5 }, 0.55, 1.4, 'content', 'hold-again'),
    strokeslow: R(null, { calm: 0.6, loved: 0.4 }, 0.6, Infinity, 'coo', 'stroke-unspin'),
    strokefast: R(null, { confused: 0.4, excited: 0.6 }, 0.7, Infinity, 'giggle', 'stroke-dizzy'),
    strokeend: R('idle', { happy: 0.6, curious: 0.4 }, 0.55, 1.6, 'content', 'stroke-after'),
    dragstart: R(null, { curious: 0.6, surprised: 0.4 }, 0.5, Infinity, null, 'drag-ooh'),
    release: R('release', { curious: 0.5, happy: 0.5 }, 0.6, 1.1, 'boing', 'drag-again'),
    fling: R('flick', { confused: 0.6, excited: 0.4 }, 0.6, 1.4, 'surprise', 'drag-spinning'),
    squeezestart: R(null, { curious: 0.5, surprised: 0.5 }, 0.45, Infinity, null, 'squeeze-in'),
    squeezesoft: R('release', { calm: 1 }, 0.55, 1.2, 'coo', 'squeeze-soft'),
    squeezehard: R('doubleTap', { excited: 1 }, 0.75, 1.3, 'giggle', 'squeeze-spiral'),
    rest: { warm: { calm: 0.6, happy: 0.4 }, excited: { curious: 1 }, both: { happy: 1 } },
  },
  loomi: {
    energy: 0.55, tickleAt: 6, dizzyAt: 12,
    tap: [
      R('nod', { calm: 1 }, 0.45, 1.3, 'tap', 'tap-mm', { poke: 0.7 }),
      R('tap', { happy: 1 }, 0.4, 1.3, 'tap', 'tap-small-smile', { poke: 0.8 }),
      R('idle', { curious: 0.5, calm: 0.5 }, 0.4, 1.3, 'tap', 'tap-oh-hey', { poke: 0.7 }),
    ],
    tickle: R('nod', { bored: 0.4, playful: 0.6 }, 0.5, 1.6, 'content', 'tap-unbothered', { poke: 0.6 }),
    doubletap: [
      R('doubleTap', { awe: 0.5, calm: 0.5 }, 0.55, 1.8, 'surprise', 'double-float'),
      R('nod', { happy: 1 }, 0.5, 1.6, 'content', 'double-nice'),
    ],
    holdstart: R(null, { calm: 1 }, 0.65, Infinity, 'hum', 'hold-drift'),
    holdlong: R(null, { calm: 0.7, comforted: 0.3 }, 0.75, Infinity, null, 'hold-deep-drift'),
    holdend: R('nod', { relieved: 0.5, calm: 0.5 }, 0.5, 1.8, 'content', 'hold-thanks'),
    strokeslow: R(null, { calm: 0.6, loved: 0.4 }, 0.6, Infinity, 'coo', 'stroke-floaty'),
    strokefast: R(null, { playful: 0.6, calm: 0.4 }, 0.5, Infinity, 'content', 'stroke-amused'),
    strokeend: R('idle', { calm: 1 }, 0.5, 2, 'content', 'stroke-after'),
    dragstart: R(null, { curious: 0.6, calm: 0.4 }, 0.4, Infinity, null, 'drag-oh-ok'),
    release: R('release', { relieved: 0.6, calm: 0.4 }, 0.5, 1.4, 'content', 'drag-drift'),
    fling: R('flick', { calm: 1 }, 0.5, 1.4, 'content', 'drag-drift-away'),
    squeezestart: R(null, { calm: 0.7, surprised: 0.3 }, 0.4, Infinity, null, 'squeeze-in'),
    squeezesoft: R('release', { calm: 0.5, comforted: 0.5 }, 0.55, 1.4, 'coo', 'squeeze-soft'),
    squeezehard: R('release', { surprised: 0.4, playful: 0.6 }, 0.6, 1.4, 'boing', 'squeeze-amused'),
    rest: { warm: { calm: 1 }, excited: { happy: 1 }, both: { calm: 0.5, happy: 0.5 } },
  },
  noomi: {
    energy: 0.5, tickleAt: 4, dizzyAt: 10,
    tap: [
      R('tap', { calm: 0.6, curious: 0.4 }, 0.5, 1.3, 'coo', 'tap-sleepy-peek', { poke: 0.7 }),
      R('yawn', { exhausted: 0.5, calm: 0.5 }, 0.5, 2, 'content', 'tap-yawn', { poke: 0.6 }),
      R('tap', { happy: 0.5, calm: 0.5 }, 0.45, 1.3, 'tap', 'tap-dreamy-smile', { poke: 0.7 }),
    ],
    tickle: R('flick', { frustrated: 0.5, exhausted: 0.5 }, 0.55, 1.8, 'grumble', 'tap-sleepy-grump', { poke: 0.6 }),
    doubletap: [
      R('doubleTap', { surprised: 1 }, 0.7, 1.6, 'surprise', 'double-awake'),
      R('nod', { happy: 0.5, calm: 0.5 }, 0.5, 1.6, 'coo', 'double-mm'),
    ],
    holdstart: R(null, { calm: 0.7, comforted: 0.3 }, 0.65, Infinity, 'hum', 'hold-snuggle'),
    holdlong: R(null, { calm: 0.5, exhausted: 0.5 }, 0.7, Infinity, null, 'hold-doze'),
    holdend: R('yawn', { calm: 0.6, happy: 0.4 }, 0.55, 2.2, 'content', 'hold-stretch'),
    strokeslow: R(null, { calm: 0.5, loved: 0.5 }, 0.6, Infinity, 'coo', 'stroke-dreamy'),
    strokefast: R(null, { frustrated: 0.4, exhausted: 0.6 }, 0.5, Infinity, 'grumble', 'stroke-too-much'),
    strokeend: R('idle', { calm: 1 }, 0.55, 2, 'content', 'stroke-after'),
    dragstart: R(null, { surprised: 0.5, exhausted: 0.5 }, 0.45, Infinity, null, 'drag-wha'),
    release: R('yawn', { calm: 0.7, surprised: 0.3 }, 0.5, 1.8, 'content', 'drag-yawn'),
    fling: R('flick', { frustrated: 0.6, exhausted: 0.4 }, 0.5, 1.6, 'grumble', 'drag-grumpy'),
    squeezestart: R(null, { calm: 0.6, surprised: 0.4 }, 0.4, Infinity, null, 'squeeze-in'),
    squeezesoft: R('release', { calm: 0.6, comforted: 0.4 }, 0.55, 1.6, 'coo', 'squeeze-soft'),
    squeezehard: R('doubleTap', { surprised: 0.7, happy: 0.3 }, 0.6, 1.6, 'surprise', 'squeeze-startled'),
    rest: { warm: { calm: 1 }, excited: { happy: 1 }, both: { calm: 0.6, happy: 0.4 } },
  },
};

export function profileFor(id) { return { ...BASE, ...(PROFILES[id] || {}) }; }

// Gentle style: no jumps, no jolts (shared by Weather, Hushbeat and Nightlight).
export const GENTLE_REACT = Object.freeze({ hop: 'nod', doubleTap: 'nod', celebrate: 'nod', flick: 'tap', shiver: 'tap', glitchBurst: 'tap' });
const NO_JUMP = { hop: 'nod', doubleTap: 'nod', celebrate: 'nod' };

/** A rig reaction made calmer: gentle → GENTLE_REACT; reduced (only) → no jumps. Falsy kinds pass through. */
export function softened(kind, { gentle = false, reduced = false } = {}) {
  if (!kind) return kind;
  if (gentle) return Object.hasOwn(GENTLE_REACT, kind) ? GENTLE_REACT[kind] : kind;   // own keys only (never 'toString'…)
  if (reduced) return Object.hasOwn(NO_JUMP, kind) ? NO_JUMP[kind] : kind;
  return kind;
}

export class Personality {
  /**
   * @param {string} mallowId
   * @param {{seed?:number, style?:'gentle'|'balanced'|'playful'}} [o]
   */
  constructor(mallowId, o = {}) {
    this.id = mallowId;
    this.p = profileFor(mallowId);
    this.rand = rng((o.seed ?? 1) ^ hash(mallowId));
    this.style = o.style || 'balanced';
    this.mood = { warmth: 0, excitement: 0, tickle: 0 };
    this.last = {};        // gesture → last variant index
    this.history = [];     // recent tags (max 12)
    this.count = 0;
    this.filter = null;    // (out, gesture, d) → response | null, after the style (e.g. Nightlight's night filter)
  }

  setStyle(s) { this.style = s; }
  setFilter(fn) { this.filter = typeof fn === 'function' ? fn : null; }

  /** Advance mood decay. dt in seconds. */
  tick(dt) {
    const m = this.mood;
    m.warmth = approach(m.warmth, 0, 30, dt);
    m.excitement = approach(m.excitement, 0, 14, dt);
    m.tickle = approach(m.tickle, 0, 3, dt);
  }

  /** Resting expression from the Mallow's mood, or null for its neutral face. */
  restExpression() {
    const { warmth: w, excitement: e } = this.mood;
    if (w < 0.25 && e < 0.25) return null;
    const r = this.p.rest;
    const mix = w > 0.25 && e > 0.25 ? r.both : w >= e ? r.warm : r.excited;
    return { mix, i: clamp(Math.max(w, e) * 0.55, 0.15, 0.5) };
  }

  /**
   * @param {string} gesture  tap | doubletap | holdstart | holding | holdend | strokestart | stroke | strokeend | dragstart | dragend | squeezestart | squeezeend
   * @param {object} d        gesture data from the Gesture Engine
   * @returns {object|null}   response (see header)
   */
  respond(gesture, d = {}) {
    const p = this.p, m = this.mood;
    let r = null;
    switch (gesture) {
      case 'tap': {
        m.tickle = clamp(m.tickle + 0.3, 0, 3);
        m.excitement = clamp(m.excitement + 0.08 * p.energy, 0, 1);
        if (d.streak >= p.dizzyAt) r = p.dizzy;
        else if (d.steady && d.streak >= 4) r = { ...p.groove, beat: d.interval };
        else if (d.streak >= p.tickleAt) r = p.tickle;
        else r = this._pick('tap', p.tap);
        break;
      }
      case 'doubletap':
        m.excitement = clamp(m.excitement + 0.2 * p.energy, 0, 1);
        r = this._pick('doubletap', p.doubletap);
        break;
      case 'holdstart': m.warmth = clamp(m.warmth + 0.1, 0, 1); r = p.holdstart; break;
      case 'holding':
        m.warmth = clamp(m.warmth + 0.0025, 0, 1);
        if (d.dur > 4000 && !this._held) { this._held = true; r = p.holdlong; }
        break;
      case 'holdend': this._held = false; r = p.holdend; break;
      case 'strokestart': m.warmth = clamp(m.warmth + 0.05, 0, 1); this._strokeKind = null; break;
      case 'stroke': {
        const kind = d.speed > 900 ? 'strokefast' : 'strokeslow';
        if (kind === 'strokefast') m.tickle = clamp(m.tickle + 0.02, 0, 3);
        else m.warmth = clamp(m.warmth + 0.004, 0, 1);
        if (kind !== this._strokeKind) { this._strokeKind = kind; r = p[kind]; }
        break;
      }
      case 'strokeend': this._strokeKind = null; r = p.strokeend; break;
      case 'dragstart': r = p.dragstart; break;
      case 'dragend':
        if (d.converted) return null;
        m.excitement = clamp(m.excitement + 0.1 * p.energy, 0, 1);
        r = d.fling ? p.fling : p.release;
        break;
      case 'squeezestart': r = p.squeezestart; break;
      case 'squeezeend': {
        const hard = Math.abs(d.peak ?? d.amount ?? 0) > 0.35;
        m.warmth = clamp(m.warmth + (hard ? 0.05 : 0.12), 0, 1);
        if (hard) m.excitement = clamp(m.excitement + 0.12 * p.energy, 0, 1);
        r = hard ? p.squeezehard : p.squeezesoft;
        break;
      }
      default: return null;
    }
    if (!r) return null;
    this.count++;
    const out = this._styled({ ...r });
    const res = this.filter ? this.filter(out, gesture, d) : out;
    if (!res) return null;
    this.history.push(res.tag);
    if (this.history.length > 12) this.history.shift();
    return res;
  }

  _pick(key, variants) {
    if (!Array.isArray(variants)) return variants;
    let i = Math.floor(this.rand() * variants.length);
    if (variants.length > 1 && i === this.last[key]) i = (i + 1 + Math.floor(this.rand() * (variants.length - 1))) % variants.length;
    this.last[key] = i;
    return variants[i];
  }

  // gentle: smaller, slower answers and no jumps; playful: a little bigger
  _styled(r) {
    if (this.style === 'gentle') {
      r.i = (r.i ?? 0.6) * 0.7;
      const k = softened(r.react, { gentle: true });
      if (k !== r.react) r.react = k;     // only mapped kinds are written (no new keys)
      if (r.voice === 'giggle') r.voice = 'coo';
      r.poke = (r.poke ?? 1) * 0.6;
    } else if (this.style === 'playful') {
      r.i = clamp((r.i ?? 0.6) * 1.15, 0, 1);
      r.poke = (r.poke ?? 1) * 1.2;
    }
    return r;
  }
}
