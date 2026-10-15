// Weather Weaver — how each Mallow feels the weather (the pure half: decide).
//
// decide(input, mem, rnd) turns what is happening in the world into a short
// list of actions for the Mallow: one-shot reactions to weather events (a
// strike, drops on its head, a light shaft reaching it, a swell arriving…)
// and continuous coupling (resting face per weather, gaze, wind lean, glow
// from light on the body, slow moonlit breathing, basking). Every Mallow
// reads the same weather in character (FEEL): Glitzi delights in strikes and
// pretends not to bask, Blubi melts, Zuzu counts drops and spins in the wind,
// Boppo bounces, Pipzi sparks, Loomi barely blinks, Noomi dozes.
//
// Rules: 1.2 s between one-shot reactions (a minor beat such as a drip never
// holds back a bigger one; a priority beat such as a gap, light reaching it or
// shelter waits up to 2.5 s for its turn instead of being dropped), 2.5–6 s per
// event type, 4 s between voices; the same tag never twice in a row; while the Mallow is
// being touched only its gaze moves; strikes habituate (full, then half with
// no hop, then a glance); the gentle style and reduced motion never hop,
// celebrate or double-tap (softened(), core/personality.js), and gentle
// lowers intensity ×0.7 and turns giggles into coos. Reaction kinds come from
// src/mallows/reactions.js (shared or the Mallow's own) and mixes from the
// expression PRESETS. WeatherReactor (below) applies the actions to a Companion.
//
// Actions: {type:'react', react, mix, i, hold, voice, tag, ev (the event it answers)} · {type:'rest', mix, i} ·
// {type:'face', min, set, dur?} (dur: a passing face; none: the continuous one) ·
// {type:'gaze', x, y} (null = the Mallow's own gaze) · {type:'nudge', lean, squash, shear, hop} ·
// {type:'brush', x, y, vx, vy} · {type:'poke', x, y, s} · {type:'inflate', v} ·
// {type:'particles', fx: {kind, n}} · {type:'peek', x, y, dur}

import { clamp, rng } from './math.js';
import { softened } from './personality.js';

export const CLOSED_EYES = ['blubi', 'loomi', 'noomi'];
export const EVENT_TYPES = ['arrive', 'strike', 'hit-body', 'sheltered', 'gap', 'light-through', 'bask', 'bask-late', 'moonlit', 'moon-leave',
  'gust', 'eddy', 'revealed', 'wave-arrive', 'constellation', 'gift', 'kindle', 'heat', 'resolved', 'front', 'touch-wet', 'snuggle', 'lulled', 'puddle-hop', 'idle'];
export const GAP = 1.2, VOICE_GAP = 4, POKE_GAP = 0.25;
export const COOL = Object.freeze({
  arrive: 2.5, strike: 2.5, 'hit-body': 3, sheltered: 6, gap: 6, 'light-through': 5, bask: 5, 'bask-late': 2.5, moonlit: 5, 'moon-leave': 4,
  gust: 3, eddy: 4, revealed: 5, 'wave-arrive': 2.5, constellation: 3, gift: 3, kindle: 3, heat: 3, resolved: 2.5, front: 4, 'touch-wet': 3,
  snuggle: 2.5, lulled: 6, 'puddle-hop': 1.2, idle: 6,
});
// beats that wait (one at a time, up to 2.5 s) for the 1.2 s gap instead of being dropped
const PRIORITY = new Set(['arrive', 'resolved', 'constellation', 'gift', 'gap', 'light-through', 'sheltered', 'snuggle', 'bask-late', 'puddle-hop', 'resolved-after']);
const NO_JUMP = new Set(['hop', 'doubleTap', 'celebrate']);
// small, frequent beats (drips, gusts, swells…): they never hold back a bigger moment such as a strike
const MINOR = new Set(['hit-body', 'gust', 'eddy', 'wave-arrive', 'kindle', 'touch-wet']);
const POSITIVE = new Set(['happy', 'excited', 'playful', 'loved', 'proud', 'hopeful', 'calm', 'relieved', 'comforted', 'awe']);
export const isPositiveMix = (mix) => {
  if (!mix) return false;
  let pos = 0, all = 0;
  for (const k in mix) { all += mix[k]; if (POSITIVE.has(k)) pos += mix[k]; }
  return all > 0 && pos / all >= 0.6;
};

// response: { react, mix, i, hold, voice, tag, face?, fx?, peek?, peekClosed?, inflate?, gazeUp?, lean?, then? }
const R = (react, mix, i, hold, voice, tag, extra = {}) => ({ react, mix, i, hold, voice, tag, ...extra });

// Resting face per weather (companion.restOverride); storm blends curious → hopeful by progress.
export const REST = Object.freeze({
  sunshine: { mix: { happy: 0.6, loved: 0.4 }, i: 0.45 },
  wind: { mix: { playful: 0.6, curious: 0.4 }, i: 0.4 },
  fog: { mix: { curious: 0.7, calm: 0.3 }, i: 0.4 },
  rain: { mix: { calm: 0.5, curious: 0.5 }, i: 0.4 },
  moonlight: { mix: { calm: 0.6, comforted: 0.4 }, i: 0.45 },
  starlight: { mix: { awe: 0.7, curious: 0.3 }, i: 0.45 },
  warm: { mix: { comforted: 0.7, loved: 0.3 }, i: 0.45 },
});

// Generic responses (each Mallow overrides some in FEEL.beats).
const ARRIVE = {
  sunshine: [R('hop', { happy: 0.7, curious: 0.3 }, 0.55, 1.6, 'content', 'arrive-sun-hop'), R('nod', { happy: 0.6, loved: 0.4 }, 0.5, 1.6, 'content', 'arrive-sun-nod')],
  wind: [R('hop', { playful: 0.7, curious: 0.3 }, 0.55, 1.4, 'giggle', 'arrive-wind-hop'), R('nod', { playful: 0.6, happy: 0.4 }, 0.5, 1.4, 'giggle', 'arrive-wind-nod')],
  fog: [R(null, { curious: 0.8, calm: 0.2 }, 0.5, 2, null, 'arrive-fog-look', { peekClosed: true }), R('nod', { curious: 0.7, calm: 0.3 }, 0.45, 2, 'coo', 'arrive-fog-nod')],
  rain: [R('nod', { calm: 0.5, curious: 0.5 }, 0.5, 1.6, 'coo', 'arrive-rain-nod'), R(null, { curious: 0.6, calm: 0.4 }, 0.5, 1.6, 'coo', 'arrive-rain-look', { gazeUp: true })],
  storm: [R(null, { curious: 0.7, surprised: 0.3 }, 0.5, 2, null, 'arrive-storm-look', { gazeUp: true }), R('nod', { curious: 0.8, hopeful: 0.2 }, 0.45, 2, null, 'arrive-storm-nod')],
  moonlight: [R('sigh', { calm: 0.6, comforted: 0.4 }, 0.55, 2, 'hum', 'arrive-moon-sigh'), R('nod', { calm: 0.7, comforted: 0.3 }, 0.5, 2, 'hum', 'arrive-moon-nod')],
  starlight: [R(null, { awe: 0.8, curious: 0.2 }, 0.65, 2, 'coo', 'arrive-stars-awe', { gazeUp: true }), R('nod', { awe: 0.7, happy: 0.3 }, 0.6, 2, 'coo', 'arrive-stars-nod')],
  warm: [R('comfort', { comforted: 0.7, loved: 0.3 }, 0.55, 1.8, 'content', 'arrive-warm-comfort'), R('nod', { comforted: 0.6, happy: 0.4 }, 0.5, 1.8, 'content', 'arrive-warm-nod')],
};
const RESOLVED = {
  sunshine: R('celebrate', { happy: 0.6, loved: 0.4 }, 0.7, 2, 'giggle', 'resolved-sun'),
  wind: R('success', { playful: 0.5, calm: 0.5 }, 0.6, 1.8, 'content', 'resolved-wind'),
  fog: R('nod', { happy: 0.5, curious: 0.5 }, 0.6, 1.8, 'coo', 'resolved-fog', { peekClosed: true }),
  rain: R('success', { happy: 0.6, relieved: 0.4 }, 0.65, 1.8, 'content', 'resolved-rain'),
  storm: R('success', { relieved: 0.5, hopeful: 0.5 }, 0.65, 2, 'content', 'resolved-storm'),
  moonlight: R('sigh', { calm: 0.6, comforted: 0.4 }, 0.65, 2.4, 'hum', 'resolved-moon'),
  starlight: R('celebrate', { awe: 0.7, happy: 0.3 }, 0.7, 2, 'coo', 'resolved-stars'),
  warm: R('comfort', { comforted: 0.6, loved: 0.4 }, 0.7, 2.2, 'content', 'resolved-warm'),
};
const BASE = {
  strike: R('shiver', { surprised: 0.6, curious: 0.4 }, 0.5, 1.4, 'surprise', 'strike-flinch'),
  'hit-body': R(null, null, 0, 0, null, 'drip-blink', { face: { set: { eyeOpen: 0.25 }, dur: 0.25 }, peekClosed: true }),
  sheltered: R(null, { comforted: 0.7, hopeful: 0.3 }, 0.6, 2, 'coo', 'sheltered-look-up', { gazeUp: true }),
  gap: R('gasp', { hopeful: 0.6, surprised: 0.4 }, 0.6, 1.8, 'surprise', 'gap-gasp', { gazeUp: true }),
  'light-through': R(null, { hopeful: 0.6, awe: 0.4 }, 0.7, 2, 'coo', 'light-through', { face: { min: { glow: 1 }, dur: 2 }, inflate: 0.15, gazeUp: true }),
  bask: R(null, { loved: 0.5, comforted: 0.5 }, 0.7, 2.5, 'content', 'bask'),
  'bask-late': R(null, { loved: 0.6, happy: 0.4 }, 0.6, 2, null, 'bask-late'),
  moonlit: R(null, { calm: 0.6, comforted: 0.4 }, 0.65, 3, 'hum', 'moonlit'),
  'moon-leave': R(null, { curious: 0.5, calm: 0.5 }, 0.4, 1.4, null, 'moon-look-after', { peekClosed: true }),
  gust: R(null, { playful: 0.6, surprised: 0.4 }, 0.45, 1.2, null, 'gust-look'),
  eddy: R(null, { playful: 0.6, curious: 0.4 }, 0.45, 1.2, null, 'eddy-look'),
  revealed: R(null, { curious: 0.5, happy: 0.5 }, 0.55, 1.6, 'coo', 'revealed', { peekClosed: true }),
  'wave-arrive': R(null, { happy: 0.6, playful: 0.4 }, 0.5, 1.2, null, 'wave-bob'),
  constellation: [R('celebrate', { awe: 0.5, happy: 0.5 }, 0.7, 2, 'giggle', 'constellation'), R('success', { awe: 0.6, happy: 0.4 }, 0.65, 1.8, 'content', 'constellation-glow')],
  gift: [R('success', { loved: 0.8, happy: 0.2 }, 0.7, 2, 'coo', 'gift', { fx: { kind: 'star', n: 6 } }), R('comfort', { loved: 0.7, awe: 0.3 }, 0.7, 2, 'coo', 'gift-hug', { fx: { kind: 'star', n: 6 } })],
  kindle: null,
  heat: [R('comfort', { comforted: 0.6, loved: 0.4 }, 0.6, 1.8, 'content', 'heat-third'), R('nod', { comforted: 0.5, happy: 0.5 }, 0.55, 1.6, 'content', 'heat-third-glow')],
  front: R(null, { curious: 0.7, surprised: 0.3 }, 0.45, 2, null, 'front-look'),
  'touch-wet': R('shiver', { playful: 0.6, happy: 0.4 }, 0.5, 1, null, 'shake-sprinkle', { fx: { kind: 'drop', n: 4 } }),
  snuggle: R('comfort', { comforted: 0.8, calm: 0.2 }, 0.6, 2, 'coo', 'snuggle'),
  lulled: R('yawn', { calm: 0.8, comforted: 0.2 }, 0.5, 2.4, null, 'rain-lulled', { fx: { kind: 'z', n: 1 } }),
  'puddle-hop': [R('hop', { happy: 0.7, playful: 0.3 }, 0.7, 1, 'giggle', 'puddle-hop'), R('hop', { playful: 0.6, excited: 0.4 }, 0.7, 1, 'giggle', 'puddle-hop-2')],
  // 12–20 s without a weather touch: it looks over at the weather's lead element (closed eyes peek)
  idle: [R(null, { curious: 0.6, happy: 0.4 }, 0.35, 1.4, null, 'idle-look', { peekClosed: true }), R(null, { curious: 0.7, calm: 0.3 }, 0.3, 1.4, null, 'idle-wonder', { peekClosed: true })],
};
// a strong gust (k > 0.6) across the body: a squint into the wind
const GUST_STRONG = R(null, { playful: 0.5, surprised: 0.5 }, 0.5, 1.2, null, 'gust-squint', { face: { set: { lidTop: 0.42 }, dur: 0.7 } });

/**
 * Per Mallow: loves, wary, home weather, closed eyes, constellation shape, bask / moonlit coupling,
 * resting-face overrides, signature particles and its own beats (by event, or event-weather).
 */
export const FEEL = Object.freeze({
  glitzi: {
    loves: ['storm', 'wind'], wary: ['sunshine'], home: 'storm', closed: false, shape: 'polygon', signature: { kind: 'shard', n: 12 },
    bask: { inflate: 0.2, glow: 0.9 }, moonlit: { breathRate: 0.14, glow: 0.8 },
    rest: { sunshine: { mix: { proud: 1 }, i: 0.45 } },
    beats: {
      strike: R('glitchBurst', { excited: 0.6, playful: 0.4 }, 0.7, 1.4, 'giggle', 'glitzi-strike-delight'),   // never a flinch
      'hit-body': R('flick', { frustrated: 0.5, proud: 0.5 }, 0.45, 1.1, 'grumble', 'glitzi-drip-huff', { face: { set: { lidTop: 0.55, mouthSkew: 0.6 }, dur: 1 } }),
      bask: R(null, { proud: 1 }, 0.55, 2, null, 'glitzi-bask-proud', { face: { set: { lidTop: 0.45 }, dur: 2 }, then: { type: 'bask-late', after: 2 } }),
      'bask-late': R(null, { loved: 0.6, embarrassed: 0.4 }, 0.6, 2, null, 'glitzi-bask-caught'),
      moonlit: R(null, { proud: 0.5, calm: 0.5 }, 0.55, 2.5, null, 'glitzi-moon-pretend', { lean: true }),
      sheltered: R(null, { proud: 0.5, comforted: 0.5 }, 0.5, 2, null, 'glitzi-sheltered-fine', { gazeUp: true }),
      gap: R('gasp', { proud: 0.5, hopeful: 0.5 }, 0.55, 1.6, null, 'glitzi-gap-pretend'),
      gust: R(null, { playful: 0.6, excited: 0.4 }, 0.5, 1.2, 'giggle', 'glitzi-gust-whee'),
      constellation: R('glitchBurst', { proud: 0.6, happy: 0.4 }, 0.6, 1.6, null, 'glitzi-constellation-order'),
      // the storm passing is the payoff: a proud sparkle and its shards, not the glitchy celebrate (its glitch
      // bars hid the eyes and mouth just as the caption and its line appear)
      'resolved-storm': R('success', { proud: 0.6, happy: 0.4 }, 0.7, 2, 'giggle', 'glitzi-home-resolved', { fx: { kind: 'shard', n: 12 } }),
    },
  },
  blubi: {
    loves: ['rain', 'moonlight'], wary: ['storm', 'fog'], home: 'rain', closed: true, shape: 'cascade', signature: { kind: 'drop', n: 10 },
    bask: { inflate: 0.3, glow: 0.9 }, moonlit: { breathRate: 0.14, glow: 0.8 },
    rest: { storm: { mix: { curious: 0.7, anxious: 0.3 }, i: 0.35 } },
    beats: {
      strike: R('shiver', { surprised: 0.6, curious: 0.4 }, 0.5, 1.6, 'surprise', 'blubi-strike-shiver'),
      'hit-body': R(null, { happy: 0.7, loved: 0.3 }, 0.5, 1.2, null, 'blubi-drip-blush', { face: { min: { blush: 1.6 }, dur: 1.2 }, fx: { kind: 'drop', n: 2 } }),
      'light-through': R(null, { relieved: 0.6, happy: 0.4 }, 0.7, 2.2, 'content', 'blubi-light-tears', { face: { set: { wet: 0.6 }, min: { glow: 1 }, dur: 2.2 }, inflate: 0.15, gazeUp: true }),
      'arrive-fog': R(null, { curious: 0.7, sad: 0.3 }, 0.35, 2.5, null, 'blubi-fog-wet-eyes', { face: { set: { wet: 0.5 }, dur: 2.5 }, peek: true }),
      revealed: R('comfort', { comforted: 0.6, happy: 0.4 }, 0.6, 1.8, 'coo', 'blubi-revealed-comfort', { peek: true }),
      moonlit: R(null, { loved: 0.7, calm: 0.3 }, 0.7, 3, 'coo', 'blubi-moon-melt'),
      sheltered: R(null, { loved: 0.6, comforted: 0.4 }, 0.65, 2, 'coo', 'blubi-sheltered-melt', { gazeUp: true }),
    },
  },
  zuzu: {
    loves: ['starlight', 'wind'], wary: [], home: 'starlight', closed: false, shape: 'spiral', signature: { kind: 'ring', n: 3 },
    bask: { inflate: 0.25, glow: 0.9 }, moonlit: { breathRate: 0.14, glow: 0.8 }, rest: {},
    beats: {
      strike: R('gasp', { awe: 0.5, surprised: 0.5 }, 0.55, 1.4, 'surprise', 'zuzu-strike-wow'),
      eddy: R(null, { confused: 1 }, 0.6, 1, null, 'zuzu-eddy-dizzy', { face: { min: { spin: 3, spinJitter: 0.6 }, dur: 1 } }),
      'wave-arrive': R(null, { curious: 0.6, awe: 0.4 }, 0.55, 1.5, null, 'zuzu-wave-reflection', { face: { set: { lookY: 0.6 }, dur: 1.5 } }),
      'hit-body': R(null, { curious: 0.7, playful: 0.3 }, 0.45, 1, null, 'zuzu-drip-count', { face: { min: { gazeDart: 0.8 }, dur: 1 } }),
      constellation: R('celebrate', { awe: 0.7, excited: 0.3 }, 0.7, 2, 'giggle', 'zuzu-constellation-spiral'),
    },
  },
  boppo: {
    loves: ['sunshine', 'warm'], wary: ['storm'], home: 'sunshine', closed: false, shape: 'arc', signature: { kind: 'pop', n: 10 },
    bask: { inflate: 0.4, glow: 1.2 }, moonlit: { breathRate: 0.14, glow: 0.8 }, rest: {},
    beats: {
      strike: R('gasp', { surprised: 0.7, hopeful: 0.3 }, 0.5, 1.4, 'surprise', 'boppo-strike-eep'),
      bask: R('hop', { happy: 0.6, loved: 0.4 }, 0.8, 2, 'giggle', 'boppo-bask-glow'),
      'light-through': R('hop', { happy: 0.7, hopeful: 0.3 }, 0.75, 1.6, 'giggle', 'boppo-light-bounce', { face: { min: { glow: 1 }, dur: 2 }, inflate: 0.15 }),
      'resolved-rain': R('shiver', { playful: 0.6, happy: 0.4 }, 0.55, 1.1, null, 'boppo-rain-shake', { fx: { kind: 'drop', n: 8 }, then: { type: 'puddle-hop', after: 1.3, twice: true } }),
    },
  },
  pipzi: {
    loves: ['starlight', 'warm'], wary: ['fog'], home: 'warm', closed: false, shape: 'ring', signature: { kind: 'spark', n: 14 },
    bask: { inflate: 0.3, glow: 0.9 }, moonlit: { breathRate: 0.14, glow: 0.8 }, rest: {}, cool: { kindle: 1 },
    beats: {
      strike: R('gasp', { excited: 0.5, surprised: 0.5 }, 0.55, 1.2, 'surprise', 'pipzi-strike-ooh', { fx: { kind: 'spark', n: 3 } }),
      kindle: R(null, { excited: 0.5, happy: 0.5 }, 0.5, 1, null, 'pipzi-kindle-spark', { fx: { kind: 'spark', n: 3 } }),
      'arrive-rain': R(null, { determined: 0.6, calm: 0.4 }, 0.5, 2, null, 'pipzi-rain-determined'),
      'resolved-rain': R('hop', { excited: 0.7, happy: 0.3 }, 0.75, 1.6, 'giggle', 'pipzi-rain-fizz', { fx: { kind: 'spark', n: 12 } }),
      moonlit: R(null, { calm: 0.5, happy: 0.5 }, 0.55, 2.5, null, 'pipzi-moon-whisper', { fx: { kind: 'spark', n: 2 } }),
      revealed: R('hop', { relieved: 0.5, excited: 0.5 }, 0.6, 1.4, 'giggle', 'pipzi-revealed-phew'),
    },
  },
  loomi: {
    loves: ['wind', 'fog'], wary: [], home: 'wind', closed: true, shape: 'drift', signature: { kind: 'ribbon', n: 4 },
    bask: { inflate: 0.2, glow: 0.9 }, moonlit: { breathRate: 0.14, glow: 0.8 },
    rest: { wind: { mix: { calm: 1 }, i: 0.4 } },
    beats: {
      strike: R('nod', { calm: 1 }, 0.3, 1, null, 'loomi-strike-blink'),
      gust: R(null, { calm: 0.6, playful: 0.4 }, 0.45, 1.5, null, 'loomi-gust-float', { face: { min: { float: 0.6 }, dur: 1.5 } }),
      'wave-arrive': R(null, { calm: 0.7, happy: 0.3 }, 0.5, 1.6, null, 'loomi-wave-serene'),
      gap: R('nod', { calm: 0.5, hopeful: 0.5 }, 0.4, 1.5, null, 'loomi-gap-nice'),
    },
  },
  noomi: {
    loves: ['moonlight', 'starlight', 'fog'], wary: ['sunshine', 'storm'], home: 'moonlight', closed: true, shape: 'crescent', signature: { kind: 'moon', n: 10 },
    bask: { inflate: 0.2, glow: 0.9 }, moonlit: { breathRate: 0.12, glow: 0.85 },
    rest: { sunshine: { mix: { calm: 0.7, happy: 0.3 }, i: 0.4 } },
    beats: {
      strike: R('gasp', { surprised: 0.6, curious: 0.4 }, 0.45, 1.2, null, 'noomi-strike-peek', { peek: true, then: { type: 'snuggle', after: 1.4 } }),
      snuggle: R('comfort', { comforted: 0.8, calm: 0.2 }, 0.6, 2, 'coo', 'noomi-snuggle'),
      'arrive-sunshine': R('yawn', { calm: 0.6, happy: 0.4 }, 0.5, 2.2, null, 'noomi-sun-yawn', { then: { type: 'bask-late', after: 2.3 } }),
      'bask-late': R(null, { calm: 0.6, happy: 0.4 }, 0.5, 2, null, 'noomi-sun-squint', { face: { set: { lidTop: 0.4 }, dur: 2 } }),
      bask: R(null, { calm: 0.6, happy: 0.4 }, 0.55, 2.5, null, 'noomi-bask-squint', { face: { set: { lidTop: 0.4 }, dur: 2.5 } }),
      moonlit: R('sigh', { calm: 0.7, comforted: 0.3 }, 0.7, 3, 'hum', 'noomi-moon-dream'),
      lulled: R('yawn', { calm: 0.8, comforted: 0.2 }, 0.5, 2.4, null, 'noomi-rain-lulled', { fx: { kind: 'z', n: 1 } }),
      constellation: R('sigh', { awe: 0.5, calm: 0.5 }, 0.6, 2.2, 'coo', 'noomi-constellation-dream'),
      revealed: R(null, { calm: 0.6, happy: 0.4 }, 0.5, 1.8, null, 'noomi-revealed-dream', { peek: true }),
    },
  },
});

const feelOf = (id) => (Object.hasOwn(FEEL, id) ? FEEL[id] : FEEL.zuzu);

/** Fresh reactor memory (one per Mallow screen). */
export function createMemory() {
  return { t: 0, weather: null, lastReact: -99, lastTag: null, lastMinor: false, lastVoice: -99, lastPoke: -99, byType: {}, strikes: 0, pending: null, follow: [],
    restKey: '', faceKey: '', inflate: 0, evInflate: 0, evInflateUntil: -1, lastEvent: null, rainT: 0, lulled: false, lastCondT: null };
}

/** The resting face for a weather at progress p (per-Mallow overrides; storm turns hopeful as it clears). */
export function restFor(mallowId, w, p = 0) {
  const own = feelOf(mallowId).rest[w];
  if (w === 'storm') {
    p = clamp(p, 0, 1);
    if (own) {   // e.g. Blubi: curious with a light anxious, then hopeful
      const mix = {};
      for (const k in own.mix) mix[k] = own.mix[k] * (1 - p);
      mix.hopeful = (mix.hopeful || 0) + p;
      return { mix, i: own.i + (0.45 - own.i) * p };
    }
    return { mix: { curious: 1 - p, hopeful: p }, i: 0.45 };
  }
  return own || REST[w] || null;
}

// --------------------------------------------------------------- choose --
function candidates(id, type, w, k) {
  const F = feelOf(id), b = F.beats;
  if (type === 'arrive') {
    if (b[`arrive-${w}`]) return [b[`arrive-${w}`]];
    if (w === F.home) return [R('celebrate', { excited: 0.5, loved: 0.5 }, 0.75, 2, 'giggle', `${id}-home-${w}`, { fx: F.signature }),
      R('hop', { happy: 0.6, loved: 0.4 }, 0.7, 1.8, 'giggle', `${id}-home-${w}-hop`, { fx: F.signature })];
    if (F.loves.includes(w)) return [R('celebrate', { excited: 0.5, happy: 0.5 }, 0.7, 1.8, 'giggle', `love-${w}`), R('hop', { happy: 0.7, excited: 0.3 }, 0.65, 1.6, 'giggle', `love-${w}-hop`)];
    if (F.wary.includes(w)) return [F.closed ? R(null, { curious: 1 }, 0.3, 2, null, `wary-${w}-peek`, { peek: true }) : R('shiver', { curious: 1 }, 0.3, 2, null, `wary-${w}`),
      R(null, { curious: 0.8, surprised: 0.2 }, 0.3, 2, null, `wary-${w}-look`, { peekClosed: true })];
    return ARRIVE[w] || ARRIVE.starlight;
  }
  if (type === 'resolved') {
    if (b[`resolved-${w}`]) return [b[`resolved-${w}`]];
    if (w === F.home) return [R('celebrate', { excited: 0.5, loved: 0.5 }, 0.75, 2, 'giggle', `${id}-home-resolved`, { fx: F.signature })];
    if (w === 'rain') return [R('shiver', { playful: 0.6, happy: 0.4 }, 0.55, 1.1, null, 'rain-shake-off', { fx: { kind: 'drop', n: 8 }, then: { type: 'resolved-after', after: 1.3 } })];
    return [RESOLVED[w] || RESOLVED.starlight];
  }
  if (type === 'resolved-after') return [RESOLVED[w] || RESOLVED.rain];
  if (type === 'front') {
    return F.wary.includes(w) ? [R(null, { curious: 0.8, surprised: 0.2 }, 0.3, 2, null, 'front-wary', { peekClosed: true })] : [BASE.front];
  }
  if (type === 'gust' && k > 0.6 && !b.gust) return [GUST_STRONG];
  if (type === 'wave-arrive' && k > 0.7 && !b['wave-arrive']) return [R('hop', { playful: 0.6, excited: 0.4 }, 0.7, 1.2, 'giggle', 'wave-big-hop', { fx: { kind: 'drop', n: 6 } })];
  const own = b[`${type}-${w}`] || b[type];
  if (own) return Array.isArray(own) ? own : [own];
  const base = BASE[type];
  return base ? (Array.isArray(base) ? base : [base]) : null;
}

function pickVariant(list, mem, rnd) {
  const n = list.length, start = n > 1 ? Math.floor(rnd() * n) % n : 0;
  for (let j = 0; j < n; j++) { const r = list[(start + j) % n]; if (r.tag !== mem.lastTag) return r; }
  const r = list[0];   // only one, and it just played: a quieter variant with its own tag
  return { ...r, react: r.react ? 'nod' : null, i: r.i * 0.8, tag: `${r.tag}-again` };
}

// --------------------------------------------------------------- decide --
/**
 * input: { mallowId, style ('gentle'|'balanced'|'playful'), reduced, weather, progress,
 *          event?: {type, x, y, k, vx, vy}, cond?: {t, dt, gaze, touch, pool, cluster, front, windAt, energy,
 *          lightOnBody, moonlit, bask, hearth, raining, heat, clusterN, touched}, body?: {cx, top, mid, w, h} }
 * mem: createMemory(), mutated. rnd: () → [0, 1). Returns a fresh array of actions.
 */
export function decide(input, mem, rnd = Math.random) {
  const out = [], c = input.cond || null;
  const t = c && Number.isFinite(c.t) ? c.t : Number.isFinite(input.t) ? input.t : mem.t;
  mem.t = t;
  if (input.weather !== mem.weather) { mem.weather = input.weather; mem.rainT = 0; mem.lulled = false; }
  const touched = !!c?.touched;
  if (input.event) eventActions(input, input.event, mem, rnd, out, t, touched);
  if (c) condActions(input, c, mem, rnd, out, t, touched);
  return out;
}

function eventActions(input, ev, mem, rnd, out, t, touched) {
  const id = input.mallowId, F = feelOf(id), w = input.weather, type = ev.type, x = ev.x ?? null, y = ev.y ?? null;
  const gentle = input.style === 'gentle', reduced = !!input.reduced, motion = input.motion ?? 1;
  if (x != null) mem.lastEvent = { x, y, t };
  if (type === 'arrive' && w === 'storm') mem.strikes = 0;
  // body physics that always answer (rate-limited), even when the face is busy
  if (type === 'hit-body' && !touched && t - mem.lastPoke >= POKE_GAP && x != null) { mem.lastPoke = t; out.push({ type: 'poke', x, y, s: 0.12 }); }
  if (type === 'gust' && !touched && input.body) {
    const b = input.body, vx = ev.vx || 0, vy = ev.vy || 0;
    for (let i = 0; i < 3; i++) out.push({ type: 'brush', x: b.cx + (i - 1) * b.w * 0.3, y: b.mid - b.h * (0.25 - 0.2 * Math.abs(i - 1)), vx, vy });
    out.push({ type: 'nudge', lean: Math.sign(vx) * clamp(ev.k ?? 0.5, 0, 1) * 0.5 * motion, squash: 0, shear: 0, hop: 0 });
  }
  if (type === 'wave-arrive' && !touched) {
    const k = clamp(ev.k ?? 0.5, 0, 1.5);
    out.push({ type: 'nudge', lean: (ev.vx ? Math.sign(ev.vx) : 1) * 0.15 * k * motion, squash: 0.3 * k * motion, shear: 0, hop: 0 });
  }
  if (touched) { if (x != null) out.push({ type: 'gaze', x, y }); return; }   // only the gaze moves while touched
  // strikes habituate: full, then half (no hop), then a glance
  let half = false;
  if (type === 'strike') {
    mem.strikes++;
    if (mem.strikes >= 3) { if (x != null) out.push({ type: 'gaze', x, y }); return; }
    half = mem.strikes === 2;
  }
  const cool = (F.cool && F.cool[type]) ?? COOL[type] ?? 2.5;
  const last = mem.byType[type] ?? -99;
  if (t - last < cool) { if (x != null) out.push({ type: 'gaze', x, y }); return; }
  const list = candidates(id, type, w, ev.k ?? 0);
  if (!list) { if (x != null) out.push({ type: 'gaze', x, y }); return; }
  let r = half ? list[0] : pickVariant(list, mem, rnd);   // a habituated strike carries its own '-again' tag
  const expressive = !!(r.react || r.mix);
  if (expressive && t - mem.lastReact < GAP && !(mem.lastMinor && !MINOR.has(type))) {
    // one beat waits at a time; the resolve beat always takes the slot (it is the moment of the session)
    if (PRIORITY.has(type) && (!mem.pending || mem.pending.type === type || type === 'resolved')) mem.pending = { ev: { ...ev }, until: t + 2.5, type };
    if (x != null) out.push({ type: 'gaze', x, y });
    return;
  }
  mem.byType[type] = t;
  if (half) r = { ...r, i: r.i * 0.5, react: NO_JUMP.has(r.react) ? 'nod' : r.react, tag: `${r.tag}-again` };
  emit(out, r, input, mem, t, ev, gentle, reduced);
  if (r.then) {
    mem.follow.push({ type: r.then.type, at: t + r.then.after, x, y });
    if (r.then.twice) mem.follow.push({ type: r.then.type, at: t + r.then.after * 2, x, y });
  }
}

function emit(out, r, input, mem, t, ev, gentle, reduced) {
  const F = feelOf(input.mallowId), b = input.body;
  let react = r.react;
  if (react === 'celebrate' && gentle && ev.type === 'constellation') react = 'success';   // spec: success when gentle
  else react = softened(react, { gentle, reduced });
  let voice = r.voice;
  if (gentle && voice === 'giggle') voice = 'coo';
  if (voice && t - mem.lastVoice < VOICE_GAP) voice = null;
  if (voice) mem.lastVoice = t;
  if (r.react || r.mix) {
    out.push({ type: 'react', react: react || null, mix: r.mix || null, i: clamp(r.i * (gentle ? 0.7 : 1), 0, 1), hold: r.hold, voice: voice || null, tag: r.tag, ev: ev.type });
    mem.lastReact = t;
    mem.lastTag = r.tag;
    mem.lastMinor = MINOR.has(ev.type);
  }
  if (r.face) out.push({ type: 'face', min: r.face.min || null, set: r.face.set || null, dur: r.face.dur || 1 });
  if (r.fx) out.push({ type: 'particles', fx: { kind: r.fx.kind, n: r.fx.n } });
  if ((r.peek || r.peekClosed) && F.closed) {
    const px = ev.x ?? (b ? b.cx : 0), py = ev.y ?? (b ? b.top - 80 : 0);
    out.push({ type: 'peek', x: px, y: py, dur: 1.1 });
  }
  // an event's puff (light reaching it) is a passing one: conditions let it go once its face has passed
  if (r.inflate) {
    mem.evInflate = r.inflate; mem.evInflateUntil = t + (r.face?.dur || 2);
    if (r.inflate > mem.inflate) { mem.inflate = r.inflate; out.push({ type: 'inflate', v: r.inflate }); }
  }
  if (r.lean && ev.x != null && b) out.push({ type: 'nudge', lean: Math.sign(ev.x - b.cx) * 0.3 * (input.motion ?? 1), squash: 0, shear: 0, hop: 0 });
  if (r.gazeUp && b) out.push({ type: 'gaze', x: ev.x ?? b.cx, y: Math.min(ev.y ?? b.top - 200, b.top - 120) });
  else if (ev.x != null) out.push({ type: 'gaze', x: ev.x, y: ev.y });
}

function condActions(input, c, mem, rnd, out, t, touched) {
  const id = input.mallowId, F = feelOf(id), w = input.weather;
  const dt = Number.isFinite(c.dt) ? c.dt : mem.lastCondT == null ? 0 : clamp(t - mem.lastCondT, 0, 0.5);
  mem.lastCondT = t;
  // gaze: active touch → light pool → star cluster → front edge → last event (2.5 s) → its own
  const g = c.gaze || c.touch || c.pool || c.cluster || c.front || (mem.lastEvent && t - mem.lastEvent.t < 2.5 ? mem.lastEvent : null);
  out.push(g ? { type: 'gaze', x: g.x, y: g.y } : { type: 'gaze', x: null, y: null });
  if (touched) {
    if (c.hearth) pushFace(out, mem, { glow: 0.9, blush: 1.3 }, null);
    return;
  }
  // deferred priority events and follow-ups
  if (mem.pending && (t - mem.lastReact >= GAP || mem.lastMinor)) {   // a waiting beat never waits behind a minor one
    const p = mem.pending;
    mem.pending = null;
    if (t <= p.until) eventActions(input, p.ev, mem, rnd, out, t, false);
  }
  for (let i = mem.follow.length - 1; i >= 0; i--) {
    const f = mem.follow[i];
    if (t < f.at) continue;
    if (t - mem.lastReact < GAP) { f.at = mem.lastReact + GAP; continue; }
    mem.follow.splice(i, 1);
    mem.byType[f.type] = -99;
    eventActions(input, { type: f.type, x: f.x, y: f.y }, mem, rnd, out, t, false);
  }
  // Noomi gets lulled by rain
  if (w === 'rain' && c.raining) {
    mem.rainT += dt;
    if (!mem.lulled && mem.rainT >= 10 && F.beats.lulled) { mem.lulled = true; eventActions(input, { type: 'lulled' }, mem, rnd, out, t, false); }
  }
  // resting face
  const p = clamp(input.progress ?? 0, 0, 1), key = `${w}:${w === 'storm' ? Math.round(p * 10) : 0}`;
  if (key !== mem.restKey) {
    mem.restKey = key;
    const rf = restFor(id, w, p);
    out.push({ type: 'rest', mix: rf ? rf.mix : null, i: rf ? rf.i : 0 });
  }
  // continuous face: glow from light on the body, moonlit breathing, basking, signature systems
  const light = clamp(c.lightOnBody ?? 0, 0, 1);
  let glow = light * 0.9, blush = 0, float = 0, spin = 0, dart = 0, sparkle = 0, breathRate = null;
  if (c.bask) { glow = Math.max(glow, F.bask.glow); blush = 1.6; }
  if (c.hearth) { glow = Math.max(glow, 0.9); blush = Math.max(blush, 1.3); }
  // Warm glow: glow and blush rise with the heat; Starlight: the eyes sparkle more as a cluster grows
  if (w === 'warm') { const h = clamp(c.heat ?? 0, 0, 1); glow = Math.max(glow, 0.25 + 0.6 * h); blush = Math.max(blush, 0.4 + 0.9 * h); }
  if (w === 'starlight' && c.clusterN > 0) sparkle = 1.2 + 0.1 * Math.min(8, c.clusterN);
  if (c.moonlit) { glow = Math.max(glow, F.moonlit.glow); breathRate = F.moonlit.breathRate; float = 0.3; }
  const e = clamp(c.energy ?? 0, 0, 1);
  if (id === 'zuzu' && w === 'wind') spin = 0.25 + 2.75 * e;
  if (id === 'zuzu' && w === 'rain' && c.raining) dart = 0.8;
  if (id === 'loomi' && w === 'wind') float = Math.max(float, 0.6 * e);
  const min = {};
  if (glow > 0.02) min.glow = +glow.toFixed(2);
  if (blush) min.blush = +blush.toFixed(2);
  if (sparkle) min.sparkle = +sparkle.toFixed(2);
  if (float > 0.02) min.float = +float.toFixed(2);
  if (spin) min.spin = +spin.toFixed(2);
  if (dart) min.gazeDart = dart;
  pushFace(out, mem, min, breathRate != null ? { breathRate } : null);
  // basking puffs the Mallow up warm (moonlight a little); an event's puff holds only while its face lasts
  const inflate = Math.max(c.bask ? F.bask.inflate : c.moonlit ? 0.08 : 0, t < mem.evInflateUntil ? mem.evInflate : 0);
  if (inflate !== mem.inflate) { mem.inflate = inflate; out.push({ type: 'inflate', v: inflate }); }
  // the wind leans it
  const vx = c.windAt ? c.windAt.vx || 0 : 0;
  if (Math.abs(vx) > 40) out.push({ type: 'nudge', lean: clamp(vx / 600, -1, 1) * 0.08 * (input.motion ?? 1), squash: 0, shear: 0, hop: 0 });
}

function pushFace(out, mem, min, set) {
  const key = JSON.stringify([min, set]);
  if (key === mem.faceKey) return;
  mem.faceKey = key;
  out.push({ type: 'face', min: min && Object.keys(min).length ? min : null, set: set || null });
}

// ---------------------------------------------------------------- applier --
const LOG_N = 32;

/**
 * Applies decide()'s actions to a Companion through public APIs only: rig.react,
 * nudge, brush, poke, peek, setInflate and lookAtScreen, director.play,
 * sound.voice, companion.restOverride, and a FaceMixer the feature passes in
 * (owner 'mode' for the continuous face, 'event' for a passing one), so this
 * module imports nothing new. Conditions are decided at most 10 times a second
 * (which also drains decide()'s follow-ups and deferred priority events).
 */
export class WeatherReactor {
  /**
   * @param {object} companion  the screen's Companion
   * @param {{mallowId?:string, sound?:object|null, mixer?:object|null, style?:string, reduced?:boolean, motion?:number, seed?:number}} [o]
   */
  constructor(companion, { mallowId = companion?.id, sound = null, mixer = null, style = 'balanced', reduced = false, motion = 1, seed = 11 } = {}) {
    this.c = companion;
    this.rig = companion.rig;
    this.id = mallowId;
    this.sound = sound;
    this.mixer = mixer;
    this.mem = createMemory();
    this.rnd = rng(seed);
    this.t = 0;
    this._acc = 0;
    this._faceUntil = -1;
    this._log = Array.from({ length: LOG_N }, () => ({ t: 0, type: '', tag: '', react: null }));
    this._logN = 0;
    this.body = { cx: 0, top: 0, bottom: 0, mid: 0, w: 1, h: 1 };
    this._in = { mallowId, style, reduced: !!reduced, motion, weather: null, progress: 0, event: null, cond: null, body: this.body, t: 0 };
    this.destroyed = false;
  }

  /** The weather now and how far it has been reshaped. */
  weather(id, progress = 0) { this._in.weather = id; this._in.progress = progress; }
  setStyle(s) { this._in.style = s || 'balanced'; }
  setReduced(b) { this._in.reduced = !!b; }
  setMotion(k) { this._in.motion = Number.isFinite(+k) ? +k : 1; }

  /** Is the Mallow being touched right now (hold, drag, squeeze or stroke)? */
  get touched() { const c = this.c; return !!(c.hold || c.drag || c.sq || c.stroking); }

  _input() {
    const i = this._in;
    if (this.rig.bodyRect) this.rig.bodyRect(this.body);
    i.t = this.t;
    return i;
  }

  /** A weather event: {x, y, k, vx, vy} (stage px). Returns the actions applied. */
  event(type, d = {}) {
    if (this.destroyed) return [];
    const i = this._input();
    i.event = { type, x: d.x ?? null, y: d.y ?? null, k: d.k ?? 0, vx: d.vx ?? 0, vy: d.vy ?? 0 };
    i.cond = null;
    const acts = decide(i, this.mem, this.rnd);
    i.event = null;
    this._apply(acts, type);
    return acts;
  }

  /**
   * Continuous coupling, every frame: cond {gaze, touch, pool, cluster, front, windAt, energy,
   * lightOnBody, moonlit, bask, hearth, raining, heat (Warm glow 0..1), clusterN (stars at the fingertip)}
   * (a reused object; t, dt and touched are filled here).
   */
  conditions(cond, dt) {
    if (this.destroyed) return;
    this.t += dt;
    this._acc += dt;
    if (this._faceUntil >= 0 && this.t >= this._faceUntil) { this._faceUntil = -1; this.mixer?.release('event'); this.mixer?.apply(); }
    if (this._acc < 0.1) return;
    cond.t = this.t; cond.dt = this._acc; cond.touched = this.touched;
    this._acc = 0;
    const i = this._input();
    i.cond = cond;
    const acts = decide(i, this.mem, this.rnd);
    i.cond = null;
    this._apply(acts, null);
    this.mixer?.apply();
  }

  _apply(acts, evType) {
    const c = this.c, rig = this.rig, m = this.mixer;
    for (const a of acts) {
      switch (a.type) {
        case 'react':
          if (a.mix) c.director.play(a.mix, a.i, a.hold);
          if (a.react) rig.react(a.react);
          if (a.voice) this.sound?.voice(this.id, a.voice, a.i);
          this._note(a.ev || evType || 'follow', a.tag, a.react);
          break;
        case 'rest': c.restOverride = a.mix ? { mix: a.mix, i: a.i } : null; break;
        case 'face': {
          if (!m) break;
          const owner = a.dur ? 'event' : 'mode';
          m.release(owner);
          if (a.min) for (const k in a.min) m.min(owner, k, a.min[k]);
          if (a.set) for (const k in a.set) m.set(owner, k, a.set[k]);
          if (a.dur) { this._faceUntil = this.t + a.dur; m.apply(); }
          break;
        }
        case 'gaze': if (a.x != null) rig.lookAtScreen(a.x, a.y); break;   // none: the rig's own gaze returns by itself
        case 'nudge': rig.nudge?.(a); break;
        case 'brush': rig.brush(a.x, a.y, a.vx, a.vy); break;
        case 'poke': rig.poke(a.x, a.y, a.s); break;
        case 'inflate': rig.setInflate(a.v); break;
        case 'particles': if (rig.opts?.particles && rig.ready) rig.particles?.burst(a.fx); break;
        case 'peek': rig.peek(a.x, a.y, a.dur); break;
        default: break;
      }
    }
  }

  _note(type, tag, react) {
    const e = this._log[this._logN++ % LOG_N];
    e.t = +this.t.toFixed(2); e.type = type; e.tag = tag; e.react = react || null;
  }

  /** The last 32 reactions, oldest first: [{t, type, tag, react}]. */
  get log() {
    const n = Math.min(LOG_N, this._logN), out = [];
    for (let k = this._logN - n; k < this._logN; k++) out.push({ ...this._log[k % LOG_N] });
    return out;
  }

  /** Hand the Mallow back exactly as it was: no resting face, face override, inflate or weather gaze. */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.c.restOverride = null;
    this.mixer?.clear();
    this.rig.setInflate?.(0);
    this.rig.lookAtScreen?.(null);
  }
}
