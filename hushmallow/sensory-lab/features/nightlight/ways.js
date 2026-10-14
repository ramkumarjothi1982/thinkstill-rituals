// Mallow Nightlight: how each Mallow keeps you company at night (pure data
// plus the night response filter; no DOM).
//
// Seven characters, seven bedtimes: Noomi is already yawning, Loomi barely
// notices, Blubi snuggles into its own glow, Zuzu's spirals slow down, Boppo
// tries two tiny bounces and gives up, Pipzi whispers sparks, and Glitzi
// keeps one eye open longest. Each answers a sleepy touch in its own way,
// dreams in its own way, and has its own sign that it is still there.
//
// Gentle style alone is not enough at night (each Mallow's own `tap`
// reaction still hops, bursts or sparks), so nightFilter() is installed with
// Personality.setFilter and runs after the gentle style: no jumps, no
// giggles, no excited faces, softer pokes, and tags that start with 'night-'.
//
// Glitzi's glitch values stay ≤ 0.75: the rig bursts above 0.8.

import { lightAnchor } from '../../core/environment.js';
import { clamp, lerp, rng, hash } from '../../core/math.js';

// ------------------------------------------------------------ worlds --
/** The base night mood (the realm's mood axes; warmth comes from the Light setting). */
export const NIGHT_MOOD = Object.freeze({ agitation: 0.03, heaviness: 0.12, clarity: 0.8 });
/** During the fade heaviness rises by up to this much (mist rolls in, the moon dims), capped per world. */
export const FADE_HEAVY = 0.15;

const lookOf = (id) => { const [nx, ny] = lightAnchor(id); return Object.freeze({ nx, ny }); };
const scene = (id, { mood = {}, transform = 0, maxHeavy, warmthCap = 0.7, texture }) => Object.freeze({
  mood: Object.freeze({ ...NIGHT_MOOD, ...mood }), transform, maxHeavy, warmthCap, look: lookOf(id), texture, ok: true,
});

/**
 * The five realms that can be night worlds, each with its night mood.
 *   maxHeavy  heaviness never goes above this (the lagoon rains above 0.35)
 *   warmthCap warmth never goes above this (the storm warms toward a dawn glow)
 *   look      the world's main light (REALM_GEO via lightAnchor), where the Mallow looks up to
 *   texture   the night bed's noise texture (features/nightlight/bed.js)
 *   ok        a screenshot review may set false: the world then maps to moonmilk-cove
 */
export const NIGHT_SCENES = Object.freeze({
  'moonmilk-cove': scene('moonmilk-cove', { maxHeavy: 0.3, texture: 'waves' }),
  'raindrop-lagoon': scene('raindrop-lagoon', { maxHeavy: 0.3, texture: 'waves' }),
  'spiral-observatory': scene('spiral-observatory', { mood: { clarity: 0.95 }, maxHeavy: 0.3, texture: 'air' }),   // dome open, one crisp galaxy
  'spark-festival': scene('spark-festival', { mood: { heaviness: 0.58, clarity: 0.8 }, warmthCap: 0.5, maxHeavy: 0.7, texture: 'hush' }),   // after closing: about half the lanterns still lit
  'static-storm': scene('static-storm', { mood: { agitation: 0, heaviness: 0.2, clarity: 0.85 }, warmthCap: 0.3, transform: 0.3, maxHeavy: 0.35, texture: 'hush' }),   // calmed
});
export const NIGHT_REALMS = Object.keys(NIGHT_SCENES);
export const FALLBACK_WORLD = 'moonmilk-cove';
/** The painted plain night (environment 'stage'): no realm. */
export const PLAIN_SCENE = Object.freeze({ mood: null, transform: 0, maxHeavy: 0, warmthCap: 1, look: Object.freeze({ nx: 0.5, ny: 0.2 }), texture: 'air', ok: true });

// ------------------------------------------------------------ faces --
/** Always applied through the face mixer's `set`: the scripts own every yawn and sigh, nothing pops or bounces. */
export const NIGHT_SET = Object.freeze({
  fxZzz: 0, fxHeart: 0, fxStar: 0, fxSpark: 0, fxNote: 0, fxQuestion: 0, fxExclaim: 0, fxSigh: 0,
  bounce: 0, tremble: 0, yawnCycle: 0, sighCycle: 0,
});
/** The sleepy peek (rig.peekParams) when a Mallow has none of its own: half-open, soft, a small smile. */
export const SLEEPY_PEEK = Object.freeze({ eyeOpen: 0.38, lidTop: 0.4, closedCurve: 0.2, browTilt: -0.1, mouthSmile: 0.7 });
export const PEEK_S = 1.4;
/** Expression presets the night filter replaces with the Mallow's nightMix. */
export const AROUSED = Object.freeze(['excited', 'surprised', 'playful', 'confused', 'frustrated', 'angry', 'anxious', 'scared']);
export const NIGHT_REACTS = Object.freeze(['nod', 'yawn', 'sigh', 'release']);
export const NIGHT_VOICES = Object.freeze(['coo', 'hum', 'content']);
/** Night strength: expression intensity, hold, poke, voice and touch-sound scales. */
export const NIGHT_K = Object.freeze({ i: 0.8, hold: 1.2, poke: 0.5, voice: 0.5, touch: 0.6 });
/**
 * A response's intensity never goes below this at night: the rig wakes its own
 * idle reactions (Boppo's hop, Pipzi's sparks, Glitzi's shards) whenever the
 * intensity is under 0.6, and a tap's expression is held for over a second.
 * The resting faces sit at 0.62 or more for the same reason (restFor).
 */
export const NIGHT_I_FLOOR = 0.62;
/** The stretch styles (squeeze target; float and melt are per Mallow). */
export const STRETCH_STYLES = Object.freeze({ tall: Object.freeze({ squeeze: -0.28 }), float: Object.freeze({ squeeze: -0.28, inflate: 0.6, float: 0.4 }), melt: Object.freeze({ squeeze: 0.25 }) });

const F = Object.freeze;
const GRIN = F({ mouthSmile: 1, closedCurve: -1, eyeOpen: 0.15 });

/**
 * Per Mallow:
 *   world      its night world (a NIGHT_SCENES key); mood: its own touches to that world; warmthBias: + warmth there
 *   closedEyes its eyes rest closed (peeks instead of blinks)
 *   greet      the arrival moment: { kind, at (s after arriving), … }
 *   sign       the steady sleepy sign: min (face floors), drowse ({ key: [at d = 0, at d = 1] } face values that follow drowsiness)
 *   set, fx    constant face values on top of NIGHT_SET
 *   stretch    { style: tall | float | melt, … extras }
 *   tapReact   what the rig's `tap` reaction becomes: a kind, null (none), or a list to pick from
 *   voice      what a tap / giggle / surprise / boing voice becomes (null: silent); grumble: keeps its own grumble
 *   nightMix   replaces any excited, surprised, playful… expression
 *   peek       its peek params (null: SLEEPY_PEEK)
 *   answer     what a drowsy tap adds: overlay (+ dur), set (face values for dur), min (floors for dur), burst (particles)
 *   dream      its dream moment (deep asleep, Sleepy); stillHere: its sign after you have been away for more than 30 s
 */
export const NIGHT_WAYS = F({
  noomi: F({
    world: 'moonmilk-cove', warmthBias: 0, mood: null, closedEyes: true,
    greet: F({ kind: 'yawn', at: 8 }),
    sign: F({ min: F({}), drowse: F({}) }),
    set: F({}), fx: F({ fxStar: 0.06 }),
    stretch: F({ style: 'float' }),
    tapReact: F([null, null, 'yawn']), voice: 'coo', grumble: true,
    nightMix: F({ calm: 0.6, comforted: 0.4 }),
    peek: null,
    answer: F({ kind: 'peek' }),
    dream: F({ kind: 'float', min: F({ float: 0.45 }), dur: 3, burst: F({ kind: 'moon', n: 1 }) }),
    stillHere: F({ kind: 'peek' }),
  }),
  loomi: F({
    world: 'raindrop-lagoon', warmthBias: 0, mood: F({ heaviness: 0.1 }), closedEyes: true,   // blue hour, no rain
    greet: F({ kind: 'sway', at: 1.5, min: F({ float: 0.3 }) }),
    sign: F({ min: F({ float: 0.3 }), drowse: F({}) }),
    set: F({}), fx: F({}),
    stretch: F({ style: 'melt' }),
    tapReact: null, voice: null, grumble: false,                                                // stays asleep, makes no sound
    nightMix: F({ calm: 0.8, comforted: 0.2 }),
    peek: null,
    answer: F({ kind: 'smile', overlay: F({ mouthSmile: 1, closedCurve: -1 }), dur: 1.8, min: F({ float: 0.5 }) }),
    dream: F({ kind: 'drift', nudge: F({ lean: 0.12 }), min: F({ float: 0.45 }), dur: 3 }),
    stillHere: F({ kind: 'smile', overlay: F({ mouthSmile: 1, closedCurve: -1 }), dur: 1.6 }),
  }),
  blubi: F({
    world: 'raindrop-lagoon', warmthBias: 0, mood: null, closedEyes: true,
    greet: F({ kind: 'snuggle', at: 1.5, overlay: F({ blush: 2, closedCurve: -0.8 }), dur: 2 }),
    sign: F({ min: F({ blush: 1.6 }), drowse: F({}) }),
    set: F({}), fx: F({}),
    stretch: F({ style: 'tall' }),
    tapReact: 'nod', voice: 'coo', grumble: false,
    nightMix: F({ comforted: 0.65, calm: 0.35 }),
    peek: null,
    answer: F({ kind: 'blush', min: F({ blush: 2.2 }), dur: 1.8 }),
    dream: F({ kind: 'blush', min: F({ blush: 2.2 }), dur: 3 }),
    stillHere: F({ kind: 'blush', min: F({ blush: 2 }), dur: 1.6 }),
  }),
  zuzu: F({
    world: 'spiral-observatory', warmthBias: 0, mood: null, closedEyes: false,
    greet: F({ kind: 'swirl', at: 1.5, overlay: F({ spin: 0.5, spiralHue: 0.3 }), dur: 2 }),
    sign: F({ min: F({}), drowse: F({ spin: F([0.25, 0.04]) }) }),                              // spirals slow as it gets sleepy
    set: F({ spin: 0.25 }), fx: F({}),
    stretch: F({ style: 'tall', overlay: F({ spin: 0.3 }) }),
    tapReact: null, voice: 'coo', grumble: false,
    nightMix: F({ calm: 0.75, comforted: 0.25 }),
    peek: null,
    answer: F({ kind: 'swirl', overlay: F({ spin: 0.5, spiralHue: 0.3 }), dur: 2 }),
    dream: F({ kind: 'smile', overlay: F({ mouthSmile: 0.9 }), dur: 1.2 }),
    stillHere: F({ kind: 'spin', overlay: F({ spin: 1.2 }), dur: 2.2 }),
  }),
  boppo: F({
    world: 'moonmilk-cove', warmthBias: 0.15, mood: null, closedEyes: false,                    // a peach glow over the cove
    greet: F({ kind: 'bounces', at: 1.2, squash: F([0.15, 0.08]), gap: 0.7 }),                  // softer each time, then stillness (never a hop)
    sign: F({ min: F({}), drowse: F({}) }),
    set: F({}), fx: F({}),
    stretch: F({ style: 'tall', yawn: true }),
    tapReact: 'nod', voice: 'coo', grumble: false,
    nightMix: F({ comforted: 0.6, happy: 0.4 }),
    peek: null,
    answer: F({ kind: 'grin', overlay: GRIN, dur: 1.4 }),
    dream: F({ kind: 'bounce', nudge: F({ squash: 0.15 }) }),
    stillHere: F({ kind: 'grin', overlay: GRIN, dur: 1.6 }),
  }),
  pipzi: F({
    world: 'spark-festival', warmthBias: 0, mood: null, closedEyes: false,
    greet: F({ kind: 'sparks', at: 1.5, burst: F({ kind: 'spark', n: 2 }) }),
    sign: F({ min: F({}), drowse: F({ fxSpark: F([0.08, 0]) }) }),                              // whisper sparks, fewer as it dozes
    set: F({}), fx: F({ fxSpark: 0.08 }),
    stretch: F({ style: 'tall', yawn: true }),
    tapReact: null, voice: 'coo', grumble: false,
    nightMix: F({ calm: 0.5, comforted: 0.5 }),
    peek: null,
    answer: F({ kind: 'sparks', burst: F({ kind: 'spark', n: 2 }) }),
    dream: F({ kind: 'spark', burst: F({ kind: 'spark', n: 1 }) }),
    stillHere: F({ kind: 'spark', burst: F({ kind: 'spark', n: 1 }) }),
  }),
  glitzi: F({
    world: 'static-storm', warmthBias: 0, mood: null, closedEyes: false,
    greet: F({ kind: 'side-eye', at: 1.5, overlay: F({ lookX: 0.6, lidTop: 0.45 }), dur: 2 }),
    sign: F({ min: F({}), drowse: F({ glitch: F([0.6, 0.25]) }), eyesLast: true }),             // glitch lines dim; eyes close last
    set: F({ glitch: 0.6 }), fx: F({}),
    stretch: F({ style: 'tall', set: F({ glitch: 0.75 }), setDur: 0.5 }),                       // a shake-off, never above 0.8
    tapReact: null, voice: 'grumble', grumble: true,
    nightMix: F({ proud: 0.4, calm: 0.6 }),
    peek: null,
    answer: F({ kind: 'one-eye', overlay: F({ eyeOpen: 0.85, wink: 1, lidTop: 0.35 }), dur: 1.6, set: F({ glitch: 0.75 }) }),
    dream: F({ kind: 'glow', glowAdd: 0.2, dur: 3 }),
    stillHere: F({ kind: 'one-eye', overlay: F({ eyeOpen: 0.85, wink: 1, lookX: -0.6 }), dur: 1.8 }),
  }),
});
export const NIGHT_WAY_IDS = Object.keys(NIGHT_WAYS);

/** A Mallow's night ways (Noomi's for an unknown id: the most sleepy fallback). */
export const waysFor = (id) => (Object.hasOwn(NIGHT_WAYS, id) ? NIGHT_WAYS[id] : NIGHT_WAYS.noomi);

// ------------------------------------------------------------ world choice --
/**
 * The night world for a Mallow and the Comfort DNA environment pref (SHARED C15):
 *   'stage'                       → the painted plain night (realmId null)
 *   a night realm (scene ok)      → that realm with its night mood
 *   a day realm, 'auto', or junk  → the Mallow's own night world (moonmilk-cove if its scene is not ok)
 * → { realmId | null, mood | null, transform, scene, own } (own: it is the Mallow's own world, so its touches apply)
 */
export function nightWorld(mallowId, envPref, { temp = 0.5, heavy = 0, scenes = NIGHT_SCENES } = {}) {
  const w = waysFor(mallowId);
  let realmId;
  if (envPref === 'stage') realmId = null;
  else if (typeof envPref === 'string' && Object.hasOwn(scenes, envPref) && scenes[envPref].ok) realmId = envPref;
  else realmId = Object.hasOwn(scenes, w.world) && scenes[w.world].ok ? w.world : FALLBACK_WORLD;
  const sc = realmId == null ? PLAIN_SCENE : scenes[realmId] || NIGHT_SCENES[FALLBACK_WORLD];
  const world = { realmId, mood: null, transform: sc.transform, scene: sc, own: realmId === w.world, mallowId: Object.hasOwn(NIGHT_WAYS, mallowId) ? mallowId : null };
  world.mood = realmId == null ? null : nightMood(world, { temp, heavy });
  return world;
}

/**
 * The realm mood for a night world at a Light setting and a fade step:
 * the scene's night mood, the Mallow's own touches in its own world,
 * warmth = 0.2 + 0.5·temp (+ its warmthBias) up to the world's cap,
 * heaviness + 0.15·heavy up to the world's maxHeavy. No allocation with `out`.
 */
export function nightMood(world, { temp = 0.5, heavy = 0 } = {}, out = {}) {
  const sc = world?.scene || NIGHT_SCENES[FALLBACK_WORLD];
  const base = sc.mood || NIGHT_MOOD;
  const w = world?.mallowId ? NIGHT_WAYS[world.mallowId] : null;
  const own = !!(w && world.own);
  const bias = own && w.mood ? w.mood : null;
  const T = clamp(Number.isFinite(temp) ? temp : 0.5, 0, 1), H = clamp(Number.isFinite(heavy) ? heavy : 0, 0, 1);
  out.agitation = bias?.agitation ?? base.agitation;
  out.clarity = bias?.clarity ?? base.clarity;
  const heaviness = bias?.heaviness ?? base.heaviness;
  out.heaviness = Math.min(Math.max(sc.maxHeavy, heaviness), heaviness + FADE_HEAVY * H);
  out.warmth = Math.min(sc.warmthCap, 0.2 + 0.5 * T + (own ? w.warmthBias : 0));
  return out;
}

// ------------------------------------------------------------ faces over time --
/** NIGHT_SET plus the Mallow's set and fx, with its drowsy values at drowsiness d, into `out` (no allocation with out). */
export function nightSet(mallowId, d = 0, out = {}) {
  const w = waysFor(mallowId), k = clamp(Number.isFinite(d) ? d : 0, 0, 1);
  for (const key in NIGHT_SET) out[key] = NIGHT_SET[key];
  for (const key in w.set) out[key] = w.set[key];
  for (const key in w.fx) out[key] = w.fx[key];
  const dr = w.sign.drowse;
  for (const key in dr) out[key] = lerp(dr[key][0], dr[key][1], k);
  return out;
}

/** The peek params a Mallow uses at night (rig.peekParams). */
export const peekFor = (id) => waysFor(id).peek || SLEEPY_PEEK;

// ------------------------------------------------------------ resting faces --
export const REST = Object.freeze({
  moonlight: F({ mix: F({ calm: 0.55, comforted: 0.45 }), i: 0.64 }),
  breathe: F({ mix: F({ calm: 0.8, comforted: 0.2 }), i: 0.66 }),
  drift: F({ mix: F({ calm: 0.75, comforted: 0.25 }), i: 0.64 }),
  quiet: F({ mix: F({ calm: 0.9, comforted: 0.1 }), i: 0.7 }),
  asleep: F({ mix: F({ calm: 0.75, exhausted: 0.25 }), i: 0.75 }),   // fading, below a Mallow level of 0.35
});

/**
 * The resting face for a mode (Companion.restOverride). Every intensity is
 * ≥ 0.62, which also keeps the rig's own idle reactions (Boppo's hop, Pipzi's
 * sparks) asleep: they fire only below 0.6. Sleepy follows drowsiness d and
 * returns a new object (call it when d has moved by ≥ 0.02: the director
 * compares the new rest with the last one it applied).
 */
export function restFor(mode, d = 0) {
  if (mode === 'sleepy') {
    const k = clamp(Number.isFinite(d) ? d : 0, 0, 1);
    return { mix: { calm: 0.7, comforted: 0.3 * (1 - k), exhausted: 0.25 * k }, i: 0.62 + 0.18 * k };
  }
  return Object.hasOwn(REST, mode) ? REST[mode] : REST.moonlight;
}

// ------------------------------------------------------------ the night filter --
const pick = (v, rand) => (Array.isArray(v) ? v[Math.floor(rand() * v.length) % v.length] ?? null : v ?? null);

function nightVoiceKind(w, kind) {
  if (!kind) return kind ?? null;
  if (NIGHT_VOICES.includes(kind)) return kind;
  if (kind === 'grumble' && w.grumble) return kind;
  return w.voice;
}

/**
 * The night filter for one Mallow: (response, gesture, data) → response | null.
 *   reactions  nod, yawn, sigh and release stay; a `tap` becomes the Mallow's tapReact;
 *              anything else becomes nod for tap and double-tap gestures and nothing otherwise
 *   voices     coo, hum and content stay (grumble for Glitzi and Noomi); the rest become its night voice
 *   faces      a mix with any AROUSED preset becomes its nightMix
 *   strength   i × 0.8 (never below 0.62), hold × 1.2, poke × 0.5; tag 'night-' + tag
 * Tap streaks (tickle, dizzy) pass through the same rules. Never mutates the
 * response it is given; `rand` (seeded per Mallow by default) picks from lists.
 */
export function nightFilter(mallowId, { rand = rng(hash(`night:${mallowId}`)) } = {}) {
  const w = waysFor(mallowId);
  return (r, gesture) => {
    if (!r) return null;
    const o = { ...r };
    if (o.react) {
      if (o.react === 'tap') o.react = pick(w.tapReact, rand);
      else if (!NIGHT_REACTS.includes(o.react)) o.react = gesture === 'tap' || gesture === 'doubletap' ? 'nod' : null;
      if (!o.react) delete o.react;
    }
    if (o.voice) {
      o.voice = nightVoiceKind(w, o.voice);
      if (!o.voice) delete o.voice;
    }
    if (o.mix && AROUSED.some((k) => o.mix[k] > 0)) o.mix = w.nightMix;
    o.i = Math.max(NIGHT_I_FLOOR, (o.i ?? 0.6) * NIGHT_K.i);
    if (o.hold != null) o.hold *= NIGHT_K.hold;
    o.poke = (o.poke ?? 1) * NIGHT_K.poke;
    o.tag = `night-${o.tag ?? 'touch'}`;
    return o;
  };
}

/**
 * The voice map for the night sound facade (soundFacade's `voice` option):
 * (id, kind, i) → [kind, i × 0.5] | null. Coo, hum and content (and grumble
 * for Glitzi and Noomi) pass; anything else becomes the Mallow's night voice,
 * or silence for Loomi.
 */
export function nightVoice(mallowId) {
  const w = waysFor(mallowId);
  return (id, kind, i = 0.6) => {
    const k = nightVoiceKind(w, kind);
    return k ? [k, (Number.isFinite(i) ? i : 0.6) * NIGHT_K.voice] : null;
  };
}
