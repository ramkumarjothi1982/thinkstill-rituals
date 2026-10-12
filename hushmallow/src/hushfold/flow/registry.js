// The Hushflow world registry.
//
// One entry per world, carrying every field of the owner's brief §16 (id and
// title, emotional purpose, source technique, evidence classification, scene,
// touch mechanics, Mallow behaviour, user-input integration, progression,
// dialogue, sound and haptics, completion and transition, Memory Garden
// reward, accessibility, playtest results, implementation status). Pure data
// plus a deterministic selector — importable in Node, no DOM. A world's code
// is loaded only when it is about to play (`loadWorld` → import()).
//
// Skill ids name Memory Garden tools; their wording lives in
// src/hushfold/skills.js (W5). Nothing here is shown to the person except
// the dialogue lines.

export const REGISTRY_VERSION = 1;

/** The feelings the person can pick (ids are stable; labels are the chips' text). */
export const FLOW_EMOTIONS = Object.freeze([
  { id: 'angry', label: 'Angry' }, { id: 'anxious', label: 'Anxious' }, { id: 'sad', label: 'Sad' },
  { id: 'overwhelmed', label: 'Overwhelmed' }, { id: 'frustrated', label: 'Frustrated' }, { id: 'lonely', label: 'Lonely' },
  { id: 'restless', label: 'Restless' }, { id: 'other', label: 'Something else' },
]);
/** What the person would like from the experience. */
export const FLOW_INTENTIONS = Object.freeze([
  { id: 'calm', label: 'Calm me down' }, { id: 'let-go', label: 'Help me let go' }, { id: 'distract', label: 'Distract me gently' },
  { id: 'steady', label: 'Help me feel steady' }, { id: 'play', label: 'Let me just play' },
]);

/** Implementation status values. Only 'playable' worlds are ever offered. */
export const STATUS = Object.freeze({ PLAYABLE: 'playable', IN_PROGRESS: 'in-progress', PLANNED: 'planned', DEV: 'dev' });

/** Every entry must carry these (brief §16). */
export const REQUIRED_FIELDS = Object.freeze([
  'id', 'title', 'purpose', 'technique', 'evidence', 'scene', 'touch', 'mallow', 'input', 'progression',
  'dialogue', 'sound', 'haptics', 'completion', 'transition', 'memory', 'accessibility', 'playtest', 'status',
]);

const STATIC_STORM = {
  id: 'static-storm',
  title: 'Glitzi’s Static Storm',
  version: 1,
  realm: 'static-storm',
  horizon: 0.655,
  palette: { sky: '#17135c', deep: '#05061f' },
  purpose: 'Notice the charge, then discover what slowing down does to it: a gap opens before you react.',
  technique: {
    name: 'Intentional slowing',
    related: ['Responding rather than reacting', 'A pause before acting (DBT-inspired)', 'Increasing the pause between thoughts (contemplative inspiration)'],
  },
  evidence: {
    classification: 'Moderate – mechanism family',
    skill: 'Intentionally Slow',
    related: [{ skill: 'Reaction Gap', classification: 'Moderate – treatment-derived' }],
    basis: 'Arousal-decreasing activities tend to reduce anger, while arousal-increasing ones (including venting) do not reliably help.',
    sources: ['pubmed 38518585'],
    framing: 'Fast scribbling is framed as noticing the charge, never as letting it out to feel better; relief is tied only to slowing.',
  },
  scene: 'A crystalline night storm over a cracked glass floor: violet thunderheads rim-lit cyan and magenta, corrupted constellations, glitch bands. '
    + 'Grounded light snaps the constellations true, heals the floor into a golden mandala and raises a dawn on the horizon.',
  touch: [
    { gesture: 'Fast strokes', effect: 'Crackling charge gathers along the path and arcs jump between charged patches; the storm agitates within a frame.' },
    { gesture: 'Slow strokes', effect: 'Draw warm gold ground lines that drink the nearby charge and slide down into the floor.' },
    { gesture: 'Holding still', effect: 'Sends gold ground pulses that drain the charge around the finger.' },
    { gesture: 'Slow circles round the Thought Mallow', effect: 'Ground it almost twice as fast; a fast drag only makes it fizz.' },
    { gesture: 'A slow stroke through a postcard', effect: 'Grounds it back to its own colours.' },
  ],
  mallow: {
    id: 'glitzi',
    behaviour: 'Starts bristling and glitchy, gasps at the first big surge, leans towards calm as light is grounded, '
      + 'sighs at the discovery and is comforted whenever a postcard grounds.',
  },
  input: {
    words: 'The person’s exact words ride on the Thought Mallow tethered in the storm: ember-lit while it crackles, soft light once it settles.',
    photos: { becomes: 'charged postcards hanging on ropes from the cloud deck', change: 'each grounds back to its own colours', shape: 'card', standIn: 'the seven Mallow cards' },
  },
  progression: [
    'Pre-charged from the chosen feeling and its intensity.',
    'Fast movement adds charge: allowed, noticed, never punished.',
    'Slow movement and stillness ground it into light; progress is only the light grounded.',
    'Discovery: you changed your pace and the world responded.',
    'Natural completion: the storm goes quiet and a dawn rises. It stays playable.',
  ],
  dialogue: {
    intro: ['Everything’s crackling in here.'],
    charge: ['That’s a lot of charge.', 'Totally allowed.'],
    thoughtSettled: ['Still your thought.', 'Just not crackling now.'],
    complete: 'The storm’s gone quiet. Stay, or drift on?',
    completeStay: 'The storm’s gone quiet. Stay as long as you like.',
  },
  discoveries: {
    slowing: { skillId: 'slowing-down', lines: ['See what happened?', 'You changed your pace.', 'The world responded.'] },
    stillness: { skillId: 'slowing-down', lines: ['You held still.', 'The storm let go a little.'] },
  },
  sound: {
    ambience: 'static-storm',
    holds: { charge: 'level follows the charge, pitch the speed of the finger', ground: 'swells while light is being grounded' },
    fx: ['soft crackle on fast segments (40 ms apart at most)', 'a glass note per postcard as it grounds', 'settle when the Thought Mallow calms'],
  },
  haptics: ['tick, at most 10 per second, while moving fast', 'soft when grounding starts', 'success at the discovery'],
  completion: {
    rule: 'All the light grounded (p ≥ 1), or p ≥ 0.7 with the storm nearly quiet (Q < 0.15) and two postcards grounded; then 1.5 s with the finger lifted.',
    after: 'The storm stays playable. Stay, or drift on; with Auto-flow it drifts on after 4 s of rest.',
  },
  transition: {
    next: 'luminous-ocean',
    melt: 'A noise-mask melt spreading from the shared horizon line (0.655 H) with a molten seam.',
    handoff: 'Grounded lines become the first swells, postcards become bubbles in place, the Thought Mallow lands on the water.',
  },
  memory: { skillId: 'slowing-down' },
  accessibility: {
    tapAlt: 'Hold a finger still anywhere: ground pulses do the slow work, no strokes needed.',
    reducedMotion: 'Arcs become a soft shimmer, no glitch bands or bolts, postcards hang still.',
    lowStimulation: 'Fewer particles and softer contrast.',
    precision: 'Every gesture works anywhere in the sky; nothing needs a precise target.',
  },
  playtest: { results: [], note: 'Not yet playtested with real users.' },
  status: STATUS.PLAYABLE,
  fits: {
    emotions: { angry: 1, frustrated: 1, restless: 0.9, overwhelmed: 0.75, anxious: 0.6, other: 0.5, sad: 0.2, lonely: 0.15 },
    intentions: { calm: 1, steady: 0.8, play: 0.7, 'let-go': 0.6, distract: 0.5 },
  },
  next: ['luminous-ocean'],
  load: () => import('./worlds/static-storm.js'),
};

const LUMINOUS_OCEAN = {
  id: 'luminous-ocean',
  title: 'Loomi’s Luminous Ocean',
  version: 1,
  realm: 'blue-drift',
  horizon: 0.44,
  palette: { sky: '#0a3f55', deep: '#062433' },
  purpose: 'Watch a thought from a little further away: slow, long strokes roll swells that carry it towards the horizon, still there, still yours.',
  technique: {
    name: 'Cognitive defusion and decentring (ACT)',
    related: ['Observing the mind like a movie', 'Non-identification with passing thoughts (contemplative inspiration)'],
  },
  evidence: {
    classification: 'Moderate – treatment-derived',
    skill: 'Cloud Witness',
    related: [{ skill: 'Thought Is Not Order', classification: 'Moderate – treatment-derived' }, { skill: 'Room for This', classification: 'Moderate – treatment-derived' }],
    basis: 'Watching a thought from a little further away can make it feel less like an order. It does not make it untrue, and it does not have to disappear.',
    sources: ['pubmed 38615492'],
    framing: 'The thought is never sunk, deleted or washed away; drifting back is normal and welcome.',
  },
  scene: 'A deep teal ocean at night under the resolved storm’s dawn: luminous crest lines in perspective, bioluminescent wakes, a mirror-calm finish.',
  touch: [
    { gesture: 'Slow, long strokes', effect: 'Raise long rolling swells that live for many seconds.' },
    { gesture: 'Quick flicks', effect: 'Make short chop that fades in a moment.' },
    { gesture: 'Strokes away from you', effect: 'Carry floating things towards the horizon; strokes towards you bring them back.' },
    { gesture: 'Holding still on the water', effect: 'Hushes the water locally.' },
    { gesture: 'Tapping a bubble', effect: 'Lifts it and makes it glow.' },
  ],
  mallow: { id: 'loomi', behaviour: 'Floats in the foreground on a buoyancy spring, tilting with the slope; grows sleepier as the swells lengthen.' },
  input: {
    words: 'The person’s exact words stay on the Thought Mallow as it rides the swells, readable at every distance.',
    photos: { becomes: 'bubbles floating on the swells', change: 'they drift further away or closer, never sink', shape: 'bubble', standIn: 'the seven Mallow cards' },
  },
  progression: [
    'The storm’s grounded lines arrive as the first gentle swells.',
    'Quick flicks make chop; slow long strokes make the whole sea roll.',
    'Discovery: the thought drifts further away through the person’s own swells.',
    'Natural completion: long swells and a dominant slow period, then the moon path brightens.',
  ],
  dialogue: {
    drift: ['You can bring it closer too.', 'Your choice.'],
    complete: 'The sea’s rolling slowly now. Stay, or drift on?',
    completeStay: 'The sea’s rolling slowly now. Stay as long as you like.',
  },
  discoveries: {
    'long-waves': { skillId: 'a-little-more-room', lines: ['Slow and long…', '…and the whole sea rolls.'] },
    distance: { skillId: 'a-little-more-room', lines: ['Look how far it drifted.', 'Still there. Still yours.', 'Just more sea in between.'] },
  },
  sound: { ambience: 'blue-drift', holds: { hum: 'deepens with the dominant swell period' }, fx: ['bubble with a note when a bubble is lifted'] },
  haptics: ['soft as a long swell is launched'],
  completion: {
    rule: 'At least four long swells, and either the thought ≥ 4·Z0 away for 5 s or a dominant period ≥ 5 s held for 10 s; then 2 s idle.',
    after: 'Swells damp, the moon path brightens, the next world is prefetched.',
  },
  transition: { next: null, melt: 'Noise-mask melt from the ocean horizon.', handoff: 'Floating things keep their places.' },
  memory: { skillId: 'a-little-more-room' },
  accessibility: {
    tapAlt: 'A tap makes a ring of gentle swells; holding still hushes the water.',
    reducedMotion: 'Amplitude ×0.4, drift ×0.6, bob ×0.3, no twinkle.',
    lowStimulation: '36 crest rows and half the glow.',
    precision: 'Strokes work anywhere on the water.',
  },
  playtest: { results: [], note: 'Not built yet.' },
  status: STATUS.PLANNED,
  fits: {
    emotions: { anxious: 1, overwhelmed: 1, sad: 0.8, lonely: 0.8, restless: 0.7, frustrated: 0.7, angry: 0.6, other: 0.6 },
    intentions: { 'let-go': 1, calm: 0.9, distract: 0.8, steady: 0.7, play: 0.6 },
  },
  next: [],
  load: () => import('./worlds/luminous-ocean.js'),
};

export const WORLDS = Object.freeze([STATIC_STORM, LUMINOUS_OCEAN]);

/** A registry over a list of entries (the default one, or a test / dev-lab list). */
export function createRegistry(list = WORLDS) {
  const byId = new Map(list.map((e) => [e.id, e]));
  const loading = new Map();
  return {
    list,
    get(id) { return byId.get(id) || null; },
    has(id) { return byId.has(id); },
    playable(id) { const e = byId.get(id); return !!e && isPlayable(e); },
    /** import() the world's module once; a failed load can be tried again. */
    load(id) {
      const e = byId.get(id);
      if (!e?.load) return Promise.reject(new Error(`No world ${id}`));
      if (!loading.has(id)) loading.set(id, Promise.resolve().then(() => e.load()).catch((err) => { loading.delete(id); throw err; }));
      return loading.get(id);
    },
    /** Start loading without waiting (and without an unhandled rejection). */
    prefetch(id) { if (byId.has(id) && isPlayable(byId.get(id))) this.load(id).catch(() => {}); },
    select(state) { return selectNext(list, state); },
  };
}

export const registry = createRegistry();

export function isPlayable(entry) { return entry?.status === STATUS.PLAYABLE || entry?.status === STATUS.DEV; }

/** Missing §16 fields of an entry ([] when complete). */
export function missingFields(entry) { return REQUIRED_FIELDS.filter((k) => entry?.[k] == null); }

/** How well a world suits a feeling and an intention (0..1). Unknown ids fall back to 'other' / a neutral 0.6. */
export function fitScore(entry, emotion, intention) {
  const fe = entry?.fits?.emotions || {}, fi = entry?.fits?.intentions || {};
  const e = emotion && fe[emotion] != null ? fe[emotion] : (fe.other ?? 0.5);
  const i = intention && fi[intention] != null ? fi[intention] : 0.6;
  return e * i;
}

/** FNV-1a string hash → 0..1 (stable tie-breaks, no randomness). */
export function hash01(s) {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h / 4294967296;
}

/**
 * Pick the next world. Deterministic: the same state always gives the same
 * answer. Rules, in order:
 *   1. only playable worlds that suit the feeling × intention, never the current one;
 *   2. never one of the last 3 played (if that leaves none, the one played longest ago);
 *   3. a rotation bag per `${emotion}|${intention}`: every suitable world plays once before any repeats;
 *   4. favourites first, then the current world's authored next[] links, then the best fit,
 *      then hash(seed | sessionCount | id).
 * state: { current, emotion, intention, history: [ids, oldest first], favourites: [ids], bags: {key: [ids]},
 *          seed, sessionCount, exclude: [ids] }
 * Returns { id | null, bags (updated copy), key, reason: 'fresh' | 'relaxed' | 'none' }.
 */
export function selectNext(list, state = {}) {
  const { current = null, emotion = null, intention = null, history = [], favourites = [], bags = {}, seed = 0, sessionCount = 0, exclude = [] } = state;
  const key = `${emotion || 'any'}|${intention || 'any'}`;
  const fav = new Set(favourites);
  const out = { ...bags };
  const cur = list.find((e) => e.id === current) || null;
  const pool = list.filter((e) => isPlayable(e) && e.id !== current && !exclude.includes(e.id) && fitScore(e, emotion, intention) > 0);
  if (!pool.length) return { id: null, bags: out, key, reason: 'none' };
  const recent = history.slice(-3);
  let candidates = pool.filter((e) => !recent.includes(e.id));
  let reason = 'fresh';
  if (!candidates.length) {
    // every suitable world was just played: take the one played longest ago
    const lastAt = (id) => history.lastIndexOf(id);
    const oldest = Math.min(...pool.map((e) => lastAt(e.id)));
    candidates = pool.filter((e) => lastAt(e.id) === oldest);
    reason = 'relaxed';
  }
  let drawn = new Set(bags[key] || []);
  let undrawn = candidates.filter((e) => !drawn.has(e.id));
  if (!undrawn.length) { drawn = new Set(); undrawn = candidates; }
  const score = (e) => [
    fav.has(e.id) ? 1 : 0,
    cur?.next?.includes(e.id) ? 1 : 0,
    Math.round(fitScore(e, emotion, intention) * 1000),
    hash01(`${seed}|${sessionCount}|${e.id}`),
  ];
  let best = null, bs = null;
  for (const e of undrawn) {
    const s = score(e);
    if (!bs || s[0] > bs[0] || (s[0] === bs[0] && (s[1] > bs[1] || (s[1] === bs[1] && (s[2] > bs[2] || (s[2] === bs[2] && s[3] > bs[3])))))) { best = e; bs = s; }
  }
  drawn.add(best.id);
  out[key] = [...drawn];
  return { id: best.id, bags: out, key, reason };
}
