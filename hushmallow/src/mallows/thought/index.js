// Thought Mallows and Belief Mallows (HUSHFOLD §3 W2, stage 2).
//
//   import { ThoughtLayer, createThought, createBelief } from '../mallows/thought/index.js';
//
//   const layer = new ThoughtLayer({ ctx2d, tagRoot, keepOut: () => hero.bodyRect(), onRead });
//   const th = layer.add(createThought({ text, emotion, intensity }), { from, home });
//   const b = layer.add(createBelief({ text, prop: 'stone' }), { x, y });
//
// For a host (the Hushfold stage, src/hushfold/stage.js, draws a layer in the shared Mallow loop):
//   new ThoughtLayer({ ctx2d, tagRoot, keepOut, bounds, onRead, reducedMotion, lowStim, haptic, audio, textScale: () => k })
//   layer.release(900)                   every thought fades off; release(900, th) / release(900, [a, b]) only those
//   layer.primary                        the newest thought not leaving (th.leaving: released, fading off)
//   layer.relayout()                     plan the stage again now (bounds or hero moved)
//   th.opacity = a                       a world's fade, 0 … 1 (eases back to 1 a second after the last write)
//   .tm-tag { z-index: var(--tm-z, 1) }  the words sit under the host's sheets and panels
//
// thought.js  the model: SoftBody 10×10 jelly, TouchReader gestures, verbs, motion, siblings
// belief.js   Belief Mallows (1.4×) with a stone, shell, tangled thread or luminous charm
// styles.js   feelings → looks (pure; Node-tested): tints, faces, motion, effects, verbs
// render.js   the 2D drawing (vector jelly, simple face, effects, props, rope)
// layer.js    ThoughtLayer: drawing many, the word tags (DOM, textContent only), routing

export { ThoughtMallow, createThought, THOUGHT_MATERIAL, PT, FX_GEOM } from './thought.js';
export { BeliefMallow, createBelief, PROPS, PROP_WEIGHT, beliefStyle } from './belief.js';
export { ThoughtLayer } from './layer.js';
export { mouthGeom } from './render.js';
export { THOUGHT_STYLES, THOUGHT_KINDS, CALM_TINT, BELIEF_TINTS, SHAPE, TAG_MIN_PX, normaliseEmotion, styleFor, deriveLook, tagBudget, tagLines, wordsOf, firstWords, mixOk } from './styles.js';
