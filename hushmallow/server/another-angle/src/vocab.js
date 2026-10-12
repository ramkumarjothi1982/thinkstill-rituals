// Controlled vocabulary for Another Angle (hushmallow Beyond).
//
// Every value the model may return is drawn from these lists, and the client
// renderer (src/beyond/ in the app) maps them to authored scenes. Changing a
// value here is an API change: bump SCHEMA_VERSION and tell the client.

export const SCHEMA_VERSION = 'scene-v1';

/** The seven approved Mallows. Zuzu is the signature guide for Another Angle. */
export const MALLOWS = /** @type {const} */ (['zuzu', 'glitzi', 'noomi', 'loomi', 'blubi', 'boppo', 'pipzi']);

/**
 * The ten reasoning patterns, each paired with exactly one authored
 * interaction mechanic (brief 2 §4). The pairing is fixed: the server
 * normalises `interaction_type` to the pattern's mechanic.
 */
export const PATTERNS = /** @type {const} */ ([
  'fact_vs_assumption', 'catastrophising', 'personalisation', 'all_or_nothing', 'mind_reading',
  'overgeneralisation', 'rumination', 'practical_problem', 'self_criticism', 'valid_anger',
]);

/** reasoning_pattern → interaction_type (the hands-on mechanic in the client). */
export const PATTERN_INTERACTION = /** @type {const} */ ({
  fact_vs_assumption: 'pull_apart', // pull two connected Thought Mallows apart
  catastrophising: 'shrink_projection', // slowly resize an exaggerated future projection
  personalisation: 'return_responsibility', // move imagined responsibility back where it belongs
  all_or_nothing: 'reveal_spectrum', // reveal the spectrum between two extremes
  mind_reading: 'open_interpretations', // open several interpretations, none claimed true
  overgeneralisation: 'separate_one', // lift one event out of a larger collection
  rumination: 'let_loop_drift', // let a looping thought keep moving without grabbing it
  practical_problem: 'assemble_step', // assemble one small actionable next step
  self_criticism: 'soften_harshness', // soften a harsh verdict without erasing accountability
  valid_anger: 'find_boundary', // identify the boundary or response that may be needed
});

export const INTERACTIONS = /** @type {string[]} */ (Object.values(PATTERN_INTERACTION));

/** interaction_type → reasoning_pattern (the pairing is one-to-one). */
export const INTERACTION_PATTERN = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(PATTERN_INTERACTION).map(([p, i]) => [i, p])));

/**
 * reasoning_pattern → the closest THOUGHT_PATTERNS id in the app's authored
 * engine (src/ultra/frameworks.js), so the offline/fallback path can start
 * from the same idea (fallback.hint.authored_pattern). practical_problem and
 * valid_anger are not thinking traps, so they have no counterpart: the
 * authored engine's next steps cover them. test/schema.test.js checks every
 * id exists in the app.
 */
export const PATTERN_TO_AUTHORED = /** @type {const} */ ({
  fact_vs_assumption: 'feelings-as-proof',
  catastrophising: 'worst-case-jump',
  personalisation: 'spotlight-on-me',
  all_or_nothing: 'all-or-nothing',
  mind_reading: 'mind-reading',
  overgeneralisation: 'always-never',
  rumination: 'what-if-loop',
  practical_problem: null,
  self_criticism: 'big-label',
  valid_anger: null,
});

/**
 * Which Mallows suit each pattern (first = default). Zuzu is always allowed.
 * Roles from brief 2 §7: Glitzi anger/boundaries, Noomi rumination/rest,
 * Loomi calm, Blubi sadness, Boppo self-compassion/action, Pipzi curiosity.
 */
export const PATTERN_MALLOWS = /** @type {const} */ ({
  fact_vs_assumption: ['zuzu', 'pipzi', 'loomi', 'blubi'],
  catastrophising: ['loomi', 'zuzu', 'noomi', 'blubi'],
  personalisation: ['boppo', 'zuzu', 'blubi'],
  all_or_nothing: ['zuzu', 'pipzi', 'boppo'],
  mind_reading: ['pipzi', 'zuzu', 'loomi', 'blubi'],
  overgeneralisation: ['zuzu', 'pipzi', 'blubi', 'boppo'],
  rumination: ['noomi', 'loomi', 'zuzu'],
  practical_problem: ['boppo', 'zuzu', 'pipzi', 'glitzi'],
  self_criticism: ['boppo', 'blubi', 'zuzu'],
  valid_anger: ['glitzi', 'zuzu', 'boppo'],
});

/** The main feeling in the scene (all are ids in the app's emotion taxonomy, src/data/emotions.js). */
export const SCENE_EMOTIONS = /** @type {const} */ ([
  'anger', 'frustration', 'resentment', 'anxiety', 'worry', 'fear', 'stress', 'overwhelm',
  'sadness', 'disappointment', 'hurt', 'grief', 'loneliness', 'rejection', 'embarrassment',
  'shame', 'guilt', 'jealousy', 'envy', 'insecurity', 'confusion', 'uncertainty',
  'overthinking', 'restlessness', 'regret',
]);

/** Emotions that also make a Mallow suitable whatever the pattern. */
export const EMOTION_MALLOWS = /** @type {Record<string, readonly string[]>} */ ({
  anger: ['glitzi'], frustration: ['glitzi'], resentment: ['glitzi'],
  sadness: ['blubi'], disappointment: ['blubi'], hurt: ['blubi'], grief: ['blubi'],
  loneliness: ['blubi'], rejection: ['blubi'],
  anxiety: ['loomi'], worry: ['loomi'], fear: ['loomi'], stress: ['loomi'], overwhelm: ['loomi', 'noomi'],
  overthinking: ['noomi'], restlessness: ['noomi', 'loomi'],
  shame: ['boppo', 'blubi'], guilt: ['boppo'], regret: ['boppo', 'noomi'], embarrassment: ['boppo', 'pipzi'],
  confusion: ['pipzi'], uncertainty: ['pipzi', 'loomi'],
});

/** Feelings where the reveal must never be jokey. */
export const HEAVY_EMOTIONS = new Set(['grief', 'hurt', 'shame', 'sadness', 'loneliness', 'rejection', 'guilt', 'fear']);

/** Area of life. 'unclear' = nothing to work with (the server answers with a fallback, no scene). */
export const SITUATIONS = /** @type {const} */ ([
  'work', 'study', 'relationship', 'friendship', 'family', 'social', 'health', 'money',
  'self_image', 'loss', 'uncertainty', 'conflict', 'other', 'unclear',
]);

export const SAFETY_STATUSES = /** @type {const} */ (['ok', 'care', 'crisis']);

/**
 * Intentions the person may pick in the input overlay (W3 openInput chips).
 * Accepted spellings → canonical id. The label is passed to the model as context.
 */
export const INTENTIONS = /** @type {const} */ ({
  calm: 'Calm me down',
  let_go: 'Help me let go',
  distract: 'Distract me gently',
  steady: 'Help me feel steady',
  play: 'Let me just play',
});

/** @type {Record<string, keyof typeof INTENTIONS>} */
export const INTENTION_ALIASES = {
  calm: 'calm', 'calm-me-down': 'calm', calm_me_down: 'calm',
  let_go: 'let_go', 'let-go': 'let_go', 'help-me-let-go': 'let_go', help_me_let_go: 'let_go',
  distract: 'distract', 'distract-me-gently': 'distract', distract_me_gently: 'distract',
  steady: 'steady', 'feel-steady': 'steady', 'help-me-feel-steady': 'steady', help_me_feel_steady: 'steady',
  play: 'play', 'just-play': 'play', 'let-me-just-play': 'play', let_me_just_play: 'play',
};

/** Emotion chip spellings (W3 input overlay) → taxonomy id. */
export const EMOTION_ALIASES = {
  angry: 'anger', anxious: 'anxiety', sad: 'sadness', overwhelmed: 'overwhelm', frustrated: 'frustration',
  lonely: 'loneliness', restless: 'restlessness', worried: 'worry', embarrassed: 'embarrassment',
  ashamed: 'shame', guilty: 'guilt', jealous: 'jealousy', envious: 'envy', hurt: 'hurt',
  disappointed: 'disappointment', confused: 'confusion', stressed: 'stress', scared: 'fear', afraid: 'fear',
  rejected: 'rejection', insecure: 'insecurity', uncertain: 'uncertainty',
};

/**
 * Snapshot of ALL_EMOTION_IDS from the app's taxonomy (src/data/emotions.js),
 * so the A–Z picker’s choices are accepted. test/schema.test.js checks this
 * stays identical to the app's list.
 */
export const TAXONOMY_EMOTIONS = Object.freeze(`love affection tenderness fondness adoration devotion compassion empathy warmth intimacy trust longing attachment attraction admiration protective nurturing lovesick touched belonging connected cherished seen sympathy infatuation forgiveness appreciated sentimental kinship happy-for-someone joy delight pleasure amusement contentment cheerfulness bliss elation euphoria gratitude relief satisfaction triumph optimism hope excitement giddy playful silly mischievous cheeky glee exhilaration zest enthusiasm carefree savouring celebratory lucky energised schadenfreude freedom uplifted calm serenity peace stillness relaxation ease comfort safety groundedness acceptance centeredness refreshed patience composure unbothered sleepy dreamy clarity in-the-moment reassured rested equanimity pensive curiosity interest wonder fascination intrigue engagement anticipation alertness inspiration motivation eagerness focused openness challenged suspense adventurous surprise amazement awe astonishment wonderstruck shock startle disbelief dumbfounded flabbergasted moved realisation humbled reverence dismay fear anxiety worry nervousness dread panic terror insecurity apprehension unease overwhelm vulnerability on-edge jittery stress angst nervous-excitement fear-of-missing-out sunday-dread imposter-feelings tense spooked threatened powerless helpless trapped pressured overstimulated frazzled rattled suspicion shyness fear-of-failure guarded anger irritation annoyance frustration resentment rage fury bitterness outrage hostility impatience indignation irritable grumpy cranky hangry sulky petty spiteful vindictive scorned defensive provoked aggravation disrespected wronged insulted quarrelsome rebellious taken-advantage-of sadness sorrow grief disappointment hurt heartache despair hopelessness emptiness gloom regret mourning heartbreak melancholy wistful nostalgia saudade bittersweetness disillusionment betrayal dejection discouraged defeated tearful self-pity misery anguish heavy-hearted anticipatory-grief discontent bereft resigned sensitive disgust revulsion contempt distaste aversion repulsion disapproval loathing squeamish the-ick moral-disgust cynicism shame guilt embarrassment humiliation remorse self-consciousness awkwardness sheepish exposed self-critical perfectionistic inadequate worthless foolish secondhand-embarrassment self-loathing qualms apologetic obligated flustered pride confidence self-respect courage empowerment boldness assurance determination proud-of-someone smug accomplished capable vindicated resilient worthy invincible independent respected envy jealousy possessiveness coveting competitiveness comparison begrudging inferiority overshadowed loneliness rejection alienation abandonment exclusion isolation homesickness invisible unappreciated misunderstood judged ghosted unloved disconnected forgotten confusion doubt uncertainty indecision conflicted disorientation hesitation ambivalence lost stuck foggy scattered overthinking bewildered skepticism reluctance boredom apathy indifference dullness restlessness disinterest numbness fatigue burnout flat ennui unmotivated lethargic zoned-out depleted uninspired desire craving yearning lust hunger ambition drive wanting wanderlust temptation urge neediness passion burdened`.split(' '));

const TAXONOMY_SET = new Set(TAXONOMY_EMOTIONS);

/**
 * Normalise an input emotion to a taxonomy id, or return null if unknown.
 * Accepts taxonomy ids, chip adjectives ("anxious") and "something-else" (→ null, valid).
 * @param {string} value
 * @returns {{ ok: true, id: string | null } | { ok: false }}
 */
export function normaliseEmotion(value) {
  const v = String(value).trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (v === 'something-else' || v === 'other' || v === 'not-sure') return { ok: true, id: null };
  if (TAXONOMY_SET.has(v)) return { ok: true, id: v };
  const alias = /** @type {Record<string, string>} */ (EMOTION_ALIASES)[v];
  if (alias) return { ok: true, id: alias };
  return { ok: false };
}

/**
 * @param {string} value
 * @returns {keyof typeof INTENTIONS | null}
 */
export function normaliseIntention(value) {
  const v = String(value).trim().toLowerCase().replace(/\s+/g, '-');
  return INTENTION_ALIASES[v] ?? INTENTION_ALIASES[v.replace(/-/g, '_')] ?? null;
}
