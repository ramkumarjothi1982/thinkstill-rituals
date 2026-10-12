// Another Angle (hushmallow Beyond) — the controlled vocabulary the client
// renders, and the one checkpoint every scene passes before it is shown.
//
// A mirror of server/another-angle/src/vocab.js (schema "scene-v1"): ten
// reasoning patterns, each paired with exactly one authored mechanic, and the
// seven approved Mallows. The renderer never runs anything the server sends:
// it only picks from these lists, and validateScene() refuses any scene that
// is not made of them (tests/beyond.test.mjs keeps the two copies identical).
//
// Pure ES module, no DOM. Works in browsers and Node.

export const SCHEMA_VERSION = 'scene-v1';

export const MALLOW_IDS = Object.freeze(['zuzu', 'glitzi', 'noomi', 'loomi', 'blubi', 'boppo', 'pipzi']);

export const PATTERNS = Object.freeze([
  'fact_vs_assumption', 'catastrophising', 'personalisation', 'all_or_nothing', 'mind_reading',
  'overgeneralisation', 'rumination', 'practical_problem', 'self_criticism', 'valid_anger',
]);

/** reasoning_pattern → interaction_type (the hands-on mechanic). */
export const PATTERN_INTERACTION = Object.freeze({
  fact_vs_assumption: 'pull_apart',
  catastrophising: 'shrink_projection',
  personalisation: 'return_responsibility',
  all_or_nothing: 'reveal_spectrum',
  mind_reading: 'open_interpretations',
  overgeneralisation: 'separate_one',
  rumination: 'let_loop_drift',
  practical_problem: 'assemble_step',
  self_criticism: 'soften_harshness',
  valid_anger: 'find_boundary',
});
export const MECHANICS = Object.freeze(Object.values(PATTERN_INTERACTION));
export const INTERACTION_PATTERN = Object.freeze(Object.fromEntries(Object.entries(PATTERN_INTERACTION).map(([p, i]) => [i, p])));
/** Short spellings used in the build notes (accepted, never sent). */
export const INTERACTION_ALIASES = Object.freeze({ let_loop: 'let_loop_drift', soften_harsh: 'soften_harshness' });

/** Which Mallows suit each pattern (first = default). Zuzu is always allowed. */
export const PATTERN_MALLOWS = Object.freeze({
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

/**
 * reasoning_pattern → the closest THOUGHT_PATTERNS id of the authored engine
 * (src/ultra/frameworks.js). Same table as the server's PATTERN_TO_AUTHORED.
 */
export const PATTERN_TO_AUTHORED = Object.freeze({
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

/** Every authored thinking habit → the scene it plays as (the offline path). */
export const AUTHORED_TO_PATTERN = Object.freeze({
  'feelings-as-proof': 'fact_vs_assumption',
  'worst-case-jump': 'catastrophising',
  'future-reading': 'catastrophising',
  'spotlight-on-me': 'personalisation',
  'all-or-nothing': 'all_or_nothing',
  'only-the-bad-bit': 'all_or_nothing',
  'shrinking-the-good': 'all_or_nothing',
  'mind-reading': 'mind_reading',
  'always-never': 'overgeneralisation',
  'what-if-loop': 'rumination',
  'big-label': 'self_criticism',
  'should-rules': 'self_criticism',
  'comparison-trap': 'fact_vs_assumption',
});

export const SAFETY_STATUSES = Object.freeze(['ok', 'care', 'crisis']);
/** The four feedback buttons → the server's rating ids. */
export const RATINGS = Object.freeze({ helped: 'helped', another: 'another_angle', notRelevant: 'not_relevant', squeeze: 'just_squeeze' });

/** Ceilings (characters) a scene's strings may use on screen. */
export const FIELD_MAX = Object.freeze({ known_fact: 200, possible_assumption: 200, alternative_angle: 240, practical_next_step: 200, subtitle_line_1: 200, subtitle_line_2: 200 });

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/gu;
const LINKISH = /(?:https?:|www\.|<\/?[a-z][^>]*>|\{\{|\bjavascript:)/i;
/** The brand language rule, enforced on whatever arrives (never shown, even if a model slipped). */
const TECH_WORDS = /\bAI\b|\bA\.I\.|artificial intelligence|language model|chat ?bot|\bLLM\b|as an assistant/i;

/** A string fit for a subtitle: trimmed, single-spaced, no controls; '' when unfit. */
export function cleanLine(value, max = 200) {
  if (typeof value !== 'string') return '';
  const s = value.normalize('NFC').replace(CONTROL, '').replace(/\s+/g, ' ').trim();
  if (!s || s.length > max || LINKISH.test(s) || TECH_WORDS.test(s)) return '';
  return s;
}

export function normaliseMechanic(id) {
  const v = String(id ?? '').trim().toLowerCase();
  const m = INTERACTION_ALIASES[v] || v;
  return MECHANICS.includes(m) ? m : null;
}

/** The Mallow that leads a scene: the server's choice when it is allowed for the pattern, else the pattern's default. */
export function mallowFor(pattern, wanted = null) {
  const allowed = PATTERN_MALLOWS[pattern] || ['zuzu'];
  if (wanted && MALLOW_IDS.includes(wanted)) return wanted;
  return allowed[0] || 'zuzu';
}

/**
 * The client's own check of a scene (whatever the server already checked).
 * → a normalised scene { …fields, mechanic } or null (unusable: play the authored engine instead).
 * The pairing pattern → mechanic is fixed here too: a mismatched interaction_type
 * is replaced by the pattern's own mechanic, never trusted.
 */
export function validateScene(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const pattern = String(raw.reasoning_pattern ?? '').trim().toLowerCase();
  if (!PATTERNS.includes(pattern)) return null;
  const safety = String(raw.safety_status ?? 'ok').trim().toLowerCase();
  if (!SAFETY_STATUSES.includes(safety)) return null;
  const l1 = cleanLine(raw.subtitle_line_1, FIELD_MAX.subtitle_line_1);
  const l2 = cleanLine(raw.subtitle_line_2, FIELD_MAX.subtitle_line_2);
  if (safety === 'ok' && (!l1 || !l2)) return null;
  const mechanic = PATTERN_INTERACTION[pattern];
  const wanted = String(raw.mallow_character ?? '').trim().toLowerCase();
  return {
    reasoning_pattern: pattern,
    interaction_type: mechanic,
    mechanic,
    mallow_character: mallowFor(pattern, MALLOW_IDS.includes(wanted) ? wanted : null),
    emotion: typeof raw.emotion === 'string' ? raw.emotion.slice(0, 40) : null,
    situation_type: typeof raw.situation_type === 'string' ? raw.situation_type.slice(0, 40) : null,
    known_fact: cleanLine(raw.known_fact, FIELD_MAX.known_fact),
    possible_assumption: cleanLine(raw.possible_assumption, FIELD_MAX.possible_assumption),
    alternative_angle: cleanLine(raw.alternative_angle, FIELD_MAX.alternative_angle),
    practical_next_step: cleanLine(raw.practical_next_step, FIELD_MAX.practical_next_step),
    subtitle_line_1: l1,
    subtitle_line_2: l2,
    safety_status: safety,
  };
}

/** What "Show me another angle" sends back: the lines already shown (newest last, at most four). */
export function previousAngles(shown = []) {
  return shown.filter((s) => s && s.subtitle_line_1 && s.subtitle_line_2 && PATTERNS.includes(s.reasoning_pattern)).slice(-4).map((s) => ({
    subtitle_line_1: s.subtitle_line_1.slice(0, 200),
    subtitle_line_2: s.subtitle_line_2.slice(0, 200),
    reasoning_pattern: s.reasoning_pattern,
    interaction_type: PATTERN_INTERACTION[s.reasoning_pattern],
  }));
}
