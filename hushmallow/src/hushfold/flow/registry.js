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
    // the person picks a different feeling mid-storm (the storm's own charge follows it)
    feeling: {
      more: ['More charge? That’s allowed too.'],
      less: ['A little less charge.', 'The storm heard you.'],
      other: ['Noted. The storm’s listening.'],
    },
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
  // a gentle session (after something heavy was shared) never plays it: charge, glitches and bolts
  calm: false,
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
  realm: null,               // its own renderer (worlds/luminous-ocean.js): sky, sea and dawn are drawn by the world
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
  scene: 'A deep teal ocean at night under the resolved storm’s dawn: luminous crest lines in perspective, a glittering dawn path that the waves break up, '
    + 'bioluminescent wakes and plankton, the storm’s last clouds; a mirror-calm finish where the dawn path brightens.',
  touch: [
    { gesture: 'Slow, long strokes', effect: 'Raise long rolling swells that live for many seconds.' },
    { gesture: 'Quick flicks', effect: 'Make short chop that fades in a moment.' },
    { gesture: 'Strokes away from you', effect: 'Carry floating things towards the horizon; strokes towards you bring them back.' },
    { gesture: 'Holding still on the water', effect: 'Hushes the water locally: a calm pool of mirror round the fingertip.' },
    { gesture: 'Tapping the water', effect: 'Rings out a soft circle of swells (tap behind something to send it away).' },
    { gesture: 'Tapping a bubble', effect: 'Lifts it and makes it glow.' },
    { gesture: 'Any touch', effect: 'An instant bioluminescent wake follows the finger.' },
  ],
  mallow: { id: 'loomi', behaviour: 'Floats in the foreground on a buoyancy spring with a lip of water across its lowest tenth, tilting with the slope; '
    + 'curious in chop, calmer and sleepier as the swells lengthen; watches the finger, else the thought; a tiny hop on a big crest.' },
  input: {
    words: 'The person’s exact words stay on the Thought Mallow as it rides the swells, readable at every distance.',
    photos: { becomes: 'bubbles floating on the swells', change: 'they drift further away or closer, never sink', shape: 'bubble', standIn: 'the seven Mallow cards',
      // (a gentle session: no Mallow card faces — no grin, no spiral eyes — on the water; the person's own photos stay theirs)
      gentle: 'the stand-in cards become plain bubbles, a soft light in each card’s colour' },
  },
  progression: [
    'The storm’s grounded lines arrive as the first gentle swells.',
    'Quick flicks make chop; slow long strokes make the whole sea roll.',
    'Discovery: the thought drifts further away through the person’s own swells.',
    'Natural completion: long swells and a sustained slow sea (or the thought far out), after real play; then the dawn path brightens.',
  ],
  dialogue: {
    intro: ['Mm. Open water.', 'Take your time.'],
    arrive: ['Ahh. The storm became a sea.'],
    chop: ['Splashy.'],
    // a gentle session (after a death, a loss or harm, or "Just be with it", and "Somewhere calm"): the sea opens quietly,
    // never with a quip about the storm it came from, and keeps its playful asides to itself (no chop line)
    gentle: { intro: ['Somewhere quiet.', 'Take all the time you need.'], arrive: ['It’s quieter here.', 'Take all the time you need.'], chop: null },
    drift: ['You can bring it closer too.', 'Your choice.'],
    complete: 'The sea’s rolling slowly now. Stay, or drift on?',
    completeStay: 'The sea’s rolling slowly now. Stay as long as you like.',
    feeling: {
      more: ['A little more wind out there.', 'The sea can take it.'],
      less: ['The wind’s dropping.', 'The sea heard you.'],
      other: ['Noted. The sea’s listening.'],
    },
  },
  discoveries: {
    // about pace, not distance: nothing to keep here (the ocean's tool is offered with 'distance')
    'long-waves': { skillId: null, offer: false, lines: ['Slow and long…', '…and the whole sea rolls.'] },
    distance: { skillId: 'a-little-more-room', lines: ['Look how far it drifted.', 'Still there. Still yours.', 'Just more sea in between.'] },
  },
  sound: {
    ambience: 'blue-drift',
    holds: { hum: 'swells with the sea’s energy and deepens with its dominant period' },
    fx: ['a soft swish as a long swell is let go', 'a drip for quick chop (120 ms apart at most)', 'a bubble note when a bubble is lifted', 'a chime at a discovery', 'bloom at the end'],
  },
  haptics: ['soft as a long swell is let go', 'light when a bubble is lifted', 'success at a discovery'],
  completion: {
    rule: 'At least four long swells, and either the thought ≥ 4·Z0 away for 5 s or a dominant period ≥ 5 s held for 10 s with three of the person’s long swells rolling; then 2 s idle, and never before 40 s of play.',
    after: 'Swells damp, the dawn path brightens beside Loomi, the next world is prefetched.',
  },
  transition: {
    next: 'moonmilk-cove',
    melt: 'In from the storm: the mask spreads from the storm’s horizon (0.655 H); after the midpoint the ocean’s horizon rises to 0.44 H over 3 s. Out: from the ocean horizon.',
    handoff: 'In: the storm’s ground lines become the first gentle swells, postcards turn into bubbles in place and settle on the water, the Thought Mallow glides down and lands; '
      + 'the ambience crossfades. Reduced motion: a straight crossfade with everything already in place. Out: floating things keep their places.',
  },
  memory: { skillId: 'a-little-more-room' },
  accessibility: {
    tapAlt: 'A tap makes a ring of gentle swells; holding still hushes the water.',
    reducedMotion: 'Amplitude ×0.4, drift ×0.6, bob ×0.3, no twinkle, no hop; the melt is a straight crossfade.',
    lowStimulation: '36 crest rows and half the glow.',
    precision: 'Strokes work anywhere on the water.',
  },
  playtest: { results: [], note: 'Built 12 Oct; browser-checked with CDP touch (Chromium/SwiftShader). Not yet playtested with real users or on a phone.' },
  status: STATUS.PLAYABLE,
  // calm: a gentle session may play it (no words, no charge: open water at its own pace)
  calm: true,
  fits: {
    emotions: { anxious: 1, overwhelmed: 1, sad: 0.8, lonely: 0.8, restless: 0.7, frustrated: 0.7, angry: 0.6, other: 0.6 },
    intentions: { 'let-go': 1, calm: 0.9, distract: 0.8, steady: 0.7, play: 0.6 },
  },
  next: ['moonmilk-cove'],
  load: () => import('./worlds/luminous-ocean.js'),
};

// ---------------------------------------------------------------- worlds 5–7 --
// Built lab-only in their workstreams (docs/workstreams/world-*.md), switched on by the owner (16 Oct). Their entries
// live here, not in the world files, so the registry never imports world code (each world file re-exports its own).

const MOONMILK_COVE = {
  id: 'moonmilk-cove',
  title: 'Noomi’s Moonmilk Cove',
  version: 1,
  realm: 'moonmilk-cove',
  horizon: 0.5,              // the realm's (REALM_HORIZON['moonmilk-cove'], moonmilk-cove-rules.js COVE.HORIZON)
  palette: { sky: '#2a2668', deep: '#15123d' },
  purpose: 'Let a short rest be enough: rest a finger, or simply do nothing, and the moon fills — the things left to do are still there, and resting was allowed.',
  technique: {
    name: 'Permission to rest (acceptance and self-kindness)',
    related: ['A realistic one-minute rest with no task attached', 'Mental holiday (contemplative inspiration)', 'Empty space and stillness'],
  },
  evidence: {
    classification: 'Moderate – treatment-derived skill',
    skill: 'Permission to Rest',
    basis: 'Rest can be a valid response even if tasks remain; a realistic one-minute rest permission with no productivity task.',
    sources: ['skills.js S.rest'],
    framing: 'Rest is never scored against doing: moving is allowed and only pauses the rest; the shells (things left to do) never vanish, they wait.',
  },
  scene: 'A sleepy crescent cove under a huge milky moon: lavender water, a shimmering moon path, a pearly shore with little pinging shells, a slow lighthouse. '
    + 'Rest fills the moon from a crescent to full; the tide stills to a mirror, more stars come out and a moonmilk aurora unfurls.',
  touch: [
    { gesture: 'Resting a finger still, anywhere', effect: 'A pool of moonmilk blooms under it in slow breath rings; the cove hushes and the moon fills.' },
    { gesture: 'Leaving the cove alone (after the first touch)', effect: 'Counts as rest too: doing nothing fills the moon.' },
    { gesture: 'Moving fingers', effect: 'Draw moonmilk ribbons that marble and dissolve; the tide gets a little busier; rest pauses, never resets.' },
    { gesture: 'Tapping a shell', effect: 'It hops and chimes: still there, waiting.' },
    { gesture: 'Tapping a lantern', effect: 'The photo glows warmer and bobs.' },
    { gesture: 'Resting a finger on the Thought Mallow', effect: 'Rests with it: its cradle rocks slower and its tension eases.' },
  ],
  mallow: { id: 'noomi', behaviour: 'Sleepy and soft; watches the finger, else the thought; grows calmer and sleepier as the moon fills; sighs at the full moon.' },
  input: {
    words: 'The person’s exact words stay on the Thought Mallow resting in a crescent moon-cradle on the water, always readable.',
    photos: { becomes: 'little arched lanterns floating on the far water', change: 'they glow warmer when tapped and as the rest deepens', shape: 'arch', standIn: 'the seven Mallow cards',
      gentle: 'the stand-in cards become plain lantern light in each card’s colour' },
  },
  progression: [
    'The cove starts a little restless with the chosen feeling; the shells ping now and then.',
    'Resting a finger (or leaving the cove alone after the first touch) fills the moon; moving only pauses it.',
    'Discovery: an unbroken rest of 15 s with the things left to do still there.',
    'Natural completion: a full moon (60 s of rest in all); the tide stills to a mirror. It stays playable.',
  ],
  dialogue: {
    intro: ['Mm. The cove’s sleepy tonight.', 'Those little shells keep pinging. Things left to do.'],
    hint: ['Rest a finger anywhere.', 'They’ll wait.'],
    busy: ['Busy hands are allowed too.', 'Rest is here whenever you want it.'],
    thoughtRest: ['Your thought can rest too.', 'Still yours.'],
    half: ['Half a moon.', 'A little at a time counts too.'],
    gentle: {
      intro: ['Somewhere quiet.', 'Rest here as long as you like.'],
      hint: ['You can rest a finger anywhere.'],
      busy: null, half: null,
      thoughtRest: ['It can rest here too.'],
    },
    complete: 'A full moon of rest. What comes next is yours. Stay, or drift on?',
    completeStay: 'A full moon of rest. Stay as long as you like.',
    feeling: {
      more: ['A busier tide tonight.', 'Rest is still here.'],
      less: ['The tide’s settling.', 'The cove heard you.'],
      other: ['Noted. The cove’s listening.'],
    },
  },
  discoveries: {
    rest: { skillId: 'permission-to-rest', lines: ['You rested.', 'The shells are still there.', 'And that was allowed.'] },
    waited: { skillId: null, offer: false, lines: ['Still there.', 'It waited for you.'] },
  },
  sound: {
    ambience: 'moonmilk-cove',
    holds: { hum: 'a low hum while resting, warmer as the rest deepens' },
    fx: ['a soft shimmer when a rest settles', 'a faint drip as a shell pings (never while resting)', 'a glass chime when a shell is tapped', 'a bubble note for a lantern', 'a chime at a discovery', 'bloom at the full moon'],
  },
  haptics: ['soft when a rest settles under the finger', 'light when a shell or a lantern is tapped', 'success at a discovery'],
  completion: {
    rule: 'Rest ≥ 60 s in all (a finger resting still, or no touch for ≥ 3 s after the first touch), then 1.2 s with no finger moving.',
    after: 'The moon stays full, the tide a mirror; resting still blooms moonmilk. Stay as long as you like, or Finish / Drift on.',
  },
  transition: {
    next: 'raindrop-lagoon',
    melt: 'In: the mask spreads from the outgoing world’s horizon; the cove’s horizon is 0.5 H. Out: from the cove’s horizon.',
    handoff: 'In: the Thought Mallow glides from where it was into its cradle; photos glide into lanterns. Reduced motion: fades in place. Out: the thought and the lanterns keep their places.',
  },
  memory: { skillId: 'permission-to-rest' },
  accessibility: {
    tapAlt: 'No gesture is needed at all: after one touch, leaving the cove alone fills the moon.',
    reducedMotion: 'No rocking or bobbing, ribbons fade without marbling, breath rings become a steady glow, glides become fades, the hint holds still.',
    lowStimulation: 'Fewer motes and softer ribbons; the realm’s low-stimulation contrast.',
    precision: 'Rest works anywhere on the screen; shells and lanterns have 44 px targets.',
  },
  playtest: { results: [], note: 'Built 15 Oct; browser-checked with CDP touch (Chromium) in the dev lab. Not yet playtested with real users or on a phone.' },
  status: STATUS.PLAYABLE,
  // a rest world: calm, quiet, no charge — fit for a gentle session
  calm: true,
  fits: {
    emotions: { overwhelmed: 1, sad: 0.9, anxious: 0.85, lonely: 0.8, restless: 0.7, frustrated: 0.6, angry: 0.5, other: 0.7 },
    intentions: { calm: 1, steady: 0.9, 'let-go': 0.8, distract: 0.6, play: 0.5 },
  },
  next: ['raindrop-lagoon'],
  load: () => import('./worlds/moonmilk-cove.js'),
};

const RAINDROP_LAGOON = {
  id: 'raindrop-lagoon',
  title: 'Blubi’s Raindrop Lagoon',
  version: 1,
  realm: 'raindrop-lagoon',
  horizon: 0.6,
  palette: { sky: '#0e3f8f', deep: '#06205a' },
  purpose: 'Notice what is here and give it a word: “This is…”. A named feeling can be a little easier to hold.',
  technique: {
    name: 'Affect labelling (putting feelings into words)',
    related: ['Mindful noting', 'Emotional granularity', 'Emotional expression (in words, not venting)'],
  },
  evidence: {
    classification: 'Promising – component evidence',
    skill: 'A Word for the Feeling',
    related: [{ skill: 'Two Feelings at Once', classification: 'Promising – component evidence' }],
    basis: 'Early research on putting feelings into words supports parts of this. hushmallow itself hasn’t been studied.',
    sources: ['skills.js name-it'],
    framing: 'Naming is offered, never required: “unsure” counts, two words are allowed, any word can be given back, and nothing is scored.',
  },
  scene: 'Blubi’s blue-hour lagoon in pink haze: soft rain, cushion lily pads, a mirror lagoon with ripple rings. Frosted feeling drops hang round the Thought Mallow; '
    + 'each word given eases the rain, and sitting with it turns the hanging drops to rising light.',
  touch: [
    { gesture: 'Holding a drop still', effect: 'It swells and clears in the hand and its word surfaces; moving fogs it again until the word is clear.' },
    { gesture: 'Carrying a clear drop to the thought', effect: 'It falls in with a plink and the thought’s tag reads “This is…” and the word.' },
    { gesture: 'A second word', effect: 'Sits beside the first; a third takes the oldest one’s place and that one floats back up.' },
    { gesture: 'Tapping a word on the tag', effect: 'Gives it back: the drop floats up to hang again.' },
    { gesture: 'Tapping a drop', effect: 'It clears by itself; tap the thought (or the word) to give it, anywhere else to let it float back.' },
    { gesture: 'Touching the water', effect: 'Soft rings and a drip; a drag leaves a trail of rings. Play only, never progress.' },
  ],
  mallow: {
    id: 'blubi',
    behaviour: 'Tender and a little tearful in the rain; leans in and watches the drop in the hand, nods at each word given, '
      + 'is comforted as the rain turns to light. In a gentle session, attentive and soft (never a grin).',
  },
  input: {
    words: 'The person’s exact words stay on the Thought Mallow above it, readable all the time; the named feelings go on its own tag, never into their words.',
    photos: { becomes: 'glass raindrops holding each photo, hanging among the feeling drops', change: 'a tap makes one glow and ring the water', shape: 'drop', standIn: 'the seven Mallow cards',
      gentle: 'the stand-in cards become plain soft lights in each card’s colour' },
  },
  progression: [
    'Soft rain from the chosen feeling; frosted drops hang round the thought.',
    'Holding a drop still clears it: its word surfaces.',
    'Giving a word eases the thought and the rain; a second word sits side by side.',
    'Discovery: you gave it a word.',
    'Natural completion: a word kept, and a quiet moment with it; the rain turns to light. It stays playable.',
  ],
  dialogue: {
    intro: ['Oh… it’s raining a little.', 'Hold a drop still. Look inside.'],
    arrive: ['Soft rain here.', 'Hold a drop still. Look inside.'],
    fog: ['Hold it still a moment.', 'Let the word come clear.'],
    carry: ['Now bring it to your thought.'],
    unsure: ['“Unsure” counts too.'],
    back: ['That’s fine. Try another.'],
    // a gentle session (after a death, a loss or harm, or "Just be with it"): quiet lines, no asides
    gentle: { intro: ['Soft rain here.', 'Take all the time you need.'], arrive: ['Soft rain here.', 'Take all the time you need.'], back: null },
    complete: 'The rain’s turning to light. Stay, or drift on?',
    completeStay: 'The rain’s turning to light. Stay as long as you like.',
    feeling: {
      more: ['The rain heard you.', 'A little more of it.'],
      less: ['The rain’s easing.', 'The lagoon heard you.'],
      other: ['Noted. New drops are forming.'],
    },
  },
  discoveries: {
    named: { skillId: 'name-it', lines: ['You gave it a word.', 'It has a name now.', 'Sometimes that makes it a little easier to hold.'] },
    // two at once is allowed: nothing more to keep (the lagoon's tool is offered with 'named')
    both: { skillId: null, offer: false, lines: ['Two at once.', 'Side by side is allowed.'] },
  },
  sound: {
    ambience: 'raindrop-lagoon',
    holds: { hum: 'rises as a drop clears in the hand' },
    fx: ['lens-focus when a word comes clear', 'drop-in as a word falls into the thought', 'a drip for touches on the water (120 ms apart at most)', 'a bubble note as a word floats back', 'a chime at a discovery', 'bloom at the end'],
  },
  haptics: ['light as a drop is taken', 'soft when its word comes clear', 'soft as it falls into the thought', 'success at a discovery'],
  completion: {
    rule: 'A word given and kept, and 8 s of quiet with it (no drop in hand), after at least 25 s of play; then 2 s with no finger down.',
    after: 'The rain stops and the hanging drops rise as light. The lagoon stays playable: words can still be given and given back.',
  },
  transition: {
    next: 'sunpop-orchard',
    melt: 'In: the mask spreads from the outgoing world’s horizon; the lagoon’s own is 0.6 H. Out: from 0.6 H.',
    handoff: 'In: the Thought Mallow glides from where it was to its place over the lagoon, postcards or bubbles glide in and become glass drops, '
      + 'the feeling drops condense one by one. Reduced motion: a crossfade, the thought fading out where it was and in at its place. Out: things keep their places.',
  },
  memory: { skillId: 'name-it' },
  accessibility: {
    tapAlt: 'Tap a drop and it clears by itself; tap the thought or the word to give it. Holding anywhere in the air draws the nearest drop to the finger.',
    reducedMotion: 'No sway, bob or arcs; drops fade where they are and appear where they go; slower, sparser rain; the melt is a crossfade.',
    lowStimulation: 'Half the rain and splashes, softer contrast (the realm’s low-stimulation layer).',
    precision: 'Drops are at least 46 px with a 16 px margin; the thought accepts a drop anywhere on it, its words or its tag.',
  },
  playtest: { results: [], note: 'Built 15 Oct in the dev lab; browser-checked in Chromium at 390×844, 360×780 and 320×568. Not yet playtested with real users or on a phone.' },
  status: STATUS.PLAYABLE,
  // a gentle session never plays it by itself: naming can feel heavier right after something heavy (skills.js care)
  calm: false,
  fits: {
    emotions: { sad: 1, lonely: 0.9, overwhelmed: 0.85, anxious: 0.8, frustrated: 0.7, other: 0.8, angry: 0.6, restless: 0.5 },
    intentions: { steady: 1, calm: 0.8, 'let-go': 0.7, distract: 0.5, play: 0.5 },
  },
  next: ['sunpop-orchard'],
  load: () => import('./worlds/raindrop-lagoon.js'),
};

const SUNPOP_ORCHARD = {
  id: 'sunpop-orchard',
  title: 'Boppo’s Sunpop Orchard',
  version: 1,
  realm: 'sunpop-orchard',
  horizon: 0.665,
  palette: { sky: '#ff9f72', deep: '#e85d78' },
  purpose: 'Notice the tone of your touch, and offer your thought the warmth you would offer a friend.',
  technique: {
    name: 'Self-compassion: a kinder inner voice',
    related: ['Treating yourself as you would a friend', 'Noticing self-critical tone', 'Mental digestion (contemplative inspiration)'],
  },
  evidence: {
    classification: 'Moderate – intervention family',
    skill: 'A Kinder Voice',
    related: [],
    basis: 'Self-compassion practices in general can help with self-criticism and low mood. hushmallow itself hasn’t been studied.',
    sources: ['pubmed 37362192'],
    framing: 'Pokes are allowed and only noticed, never punished; warmth is offered, not forced: no affirmations to repeat, no promise that a thought goes away.',
  },
  scene: 'A warm apricot afternoon in Boppo’s floating orchard: two sunpop trees make an arbour over a swing where the Thought Mallow sits in the shade; '
    + 'sunpops hang down both trees, ripening from lime to gold, and every one given becomes a small light in a crown round the thought. The finish is golden hour with a soft rainbow.',
  touch: [
    { gesture: 'A gentle hold on a sunpop', effect: 'Warms it: a ring of light fills round it and it ripens to gold in under two seconds, then stays cupped under the finger.' },
    { gesture: 'Letting go of a ripe sunpop', effect: 'It floats to the Thought Mallow and becomes a light in its crown; the thought softens a little.' },
    { gesture: 'Holding still anywhere', effect: 'Warms the nearest sunpop more slowly (nothing needs a precise target).' },
    { gesture: 'Quick pokes and fast swipes', effect: 'Sunpops wobble on their stems and a leaf drifts down; nothing ripens and nothing is lost.' },
    { gesture: 'A hand held still on the Thought Mallow', effect: 'Warms it a little, like a hand on a friend’s shoulder.' },
    { gesture: 'A gentle hold on a photo sunpop', effect: 'Its photo warms from misty back to its own colours and sends a little light to the thought.' },
  ],
  mallow: {
    id: 'boppo',
    behaviour: 'Watches the finger, else the thought; nods as a sunpop ripens and gives a small happy hop when a light reaches the thought (in a gentle session: calm and comforted, never grinning); '
      + 'sighs contentedly at golden hour.',
  },
  input: {
    words: 'The person’s exact words ride on the Thought Mallow on the swing, on a readable plate under it; nothing ever covers them.',
    photos: { becomes: 'sunpops with a round window, hanging in the trees', change: 'a gentle hold warms each photo from misty to its own colours', shape: 'circle', standIn: 'the seven Mallow cards',
      gentle: 'the stand-in cards become plain sunpops' },
  },
  progression: [
    'Sunpops hang unripe; Boppo shows a gentle hold once.',
    'Quick pokes wobble them (allowed, noticed); a gentle hold ripens one.',
    'Each ripe sunpop given becomes a light round the thought, and it softens a step.',
    'Discovery: being gentle with it, the way you would be with a friend, softened it.',
    'Natural completion: five lights given after real play; golden hour. It stays playable: sunpops regrow.',
  ],
  dialogue: {
    intro: ['Mm. Sunpops.', 'Try holding one, gently.'],
    arrive: ['Oh! The orchard.', 'Try holding a sunpop, gently.'],
    pokes: ['Boing. That’s allowed.', 'A slow, gentle hold works too.'],
    firstGift: ['That one’s for your thought.'],
    firstGiftEmpty: ['That one’s for the swing.'],
    // a gentle session (after a loss, a death, harm or care): no quips, nothing to cheer about
    gentle: {
      intro: ['Somewhere warm.', 'Take all the time you need.'],
      arrive: ['Somewhere warm.', 'Take all the time you need.'],
      pokes: ['A slow, gentle hold works here.'],
    },
    complete: 'The orchard’s glowing now. Stay, or drift on?',
    completeStay: 'The orchard’s glowing now. Stay as long as you like.',
    feeling: {
      more: ['A bit more weather today.', 'The orchard can hold that.'],
      less: ['A little lighter.', 'The orchard heard you.'],
      other: ['Noted. The orchard’s listening.'],
    },
  },
  discoveries: {
    // about the tone of a touch: nothing to keep here (the orchard's tool is offered with 'kinder')
    'gentle-hands': { skillId: null, offer: false, lines: ['Quick pokes made it wobble.', 'A gentle hold ripened it.'] },
    kinder: { skillId: 'kinder-voice', lines: ['Look. It’s softer now.', 'You were gentle with it,', 'the way you’d be with a friend.'] },
    'kinder-light': { skillId: 'kinder-voice', lines: ['All that warmth came from you.', 'The kind you’d give a friend.'] },
  },
  sound: {
    ambience: 'sunpop-orchard',
    holds: { hum: 'rises softly while a sunpop is being warmed, its pitch following the ripeness' },
    fx: ['a soft pluck for a poke (120 ms apart at most)', 'a bloom as a sunpop ripens', 'a chime as a light reaches the thought, a step higher each time', 'a shimmer at golden hour'],
  },
  haptics: ['light on a poke', 'soft as a sunpop ripens', 'light when a light reaches the thought', 'success at a discovery'],
  completion: {
    rule: 'At least five sunpops given, at least 30 s of play and the thought really softened (the \'kinder\' discovery) — or nine given — then 2 s with every finger lifted.',
    after: 'Golden hour: the realm ripens, a soft rainbow rises behind Boppo, the crown glows. Sunpops keep regrowing; it stays playable.',
  },
  transition: {
    next: null,
    melt: 'In: the mask spreads from the outgoing world’s horizon; sunpops grow in on their stems as it reaches them. Out: from the orchard’s horizon (0.665 H).',
    handoff: 'In: the Thought Mallow glides from where it was to the swing, keeping its words; photos glide into their sunpops. Reduced motion: a crossfade with everything in place. '
      + 'Out: the thought, its tension and the photos where they hang.',
  },
  memory: { skillId: 'kinder-voice' },
  accessibility: {
    tapAlt: 'Holding still anywhere warms the nearest sunpop; no strokes or precise taps are needed.',
    reducedMotion: 'No sway or bob, wobbles damped, a gift fades into the crown instead of gliding, the hint is still; the melt is a straight crossfade.',
    lowStimulation: 'Fewer motes and leaves, softer glow.',
    precision: 'Every sunpop is a 48 px target or more, and a hold anywhere works.',
  },
  playtest: { results: [], note: 'Built 15 Oct; browser-checked in the dev lab (Chromium). Not yet playtested with real users or on a phone.' },
  status: STATUS.PLAYABLE,
  // warm and slow, but it has playful lines and faces: not one of the worlds a gentle session picks by itself
  calm: false,
  // (owner P1) the last world: nothing follows it. It ends with 'Stay as long as you like' and Finish, never a melt
  // back into an earlier world. Move this to the new last world when one is added after it.
  final: true,
  fits: {
    emotions: { sad: 1, lonely: 1, frustrated: 0.8, overwhelmed: 0.75, anxious: 0.7, other: 0.7, restless: 0.55, angry: 0.45 },
    intentions: { steady: 0.9, calm: 0.85, play: 0.85, distract: 0.8, 'let-go': 0.65 },
  },
  next: [],
  load: () => import('./worlds/sunpop-orchard.js'),
};

/**
 * Every world, in its authored sequence: the storm → the ocean → the cove → the lagoon → the orchard (each `next[]`
 * names the one after it; the orchard is `final`). The selector follows these links unless a favourite, the rotation
 * bag or the fit says otherwise, and a gentle session only ever plays the `calm` ones (the ocean and the cove).
 */
export const WORLDS = Object.freeze([STATIC_STORM, LUMINOUS_OCEAN, MOONMILK_COVE, RAINDROP_LAGOON, SUNPOP_ORCHARD]);

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
 *   0. nothing follows a `final` world (owner P1: the last one, Boppo’s Sunpop Orchard);
 *   1. only playable worlds that suit the feeling × intention, never the current one —
 *      and in a gentle session (`gentle: true`) only `calm` ones;
 *   2. never one of the last 3 played (if that leaves none, the one played longest ago);
 *   3. a rotation bag per `${emotion}|${intention}`: every suitable world plays once before any repeats;
 *   4. favourites first, then the current world's authored next[] links, then the best fit,
 *      then hash(seed | sessionCount | id).
 * state: { current, emotion, intention, history: [ids, oldest first], favourites: [ids], bags: {key: [ids]},
 *          seed, sessionCount, exclude: [ids], gentle }
 * Returns { id | null, bags (updated copy), key, reason: 'fresh' | 'relaxed' | 'none' }.
 */
export function selectNext(list, state = {}) {
  const { current = null, emotion = null, intention = null, history = [], favourites = [], bags = {}, seed = 0, sessionCount = 0, exclude = [], gentle = false } = state;
  const key = `${emotion || 'any'}|${intention || 'any'}`;
  const fav = new Set(favourites);
  const out = { ...bags };
  const cur = list.find((e) => e.id === current) || null;
  if (cur?.final) return { id: null, bags: out, key, reason: 'none' };
  const pool = list.filter((e) => isPlayable(e) && e.id !== current && !exclude.includes(e.id) && fitScore(e, emotion, intention) > 0 && (!gentle || e.calm === true));
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
