// The scene JSON: the schema sent to the model (structured outputs) and the
// strict validator the server runs on whatever comes back.
//
// Structured outputs enforce types, enums, required fields and
// additionalProperties:false at generation time, but not string lengths
// (minLength/maxLength are not supported there), so lengths are stated in the
// descriptions for the model and enforced here and in the quality gate.

import {
  SCENE_EMOTIONS, SITUATIONS, PATTERNS, INTERACTIONS, MALLOWS, SAFETY_STATUSES,
  PATTERN_INTERACTION, PATTERN_MALLOWS, EMOTION_MALLOWS,
} from './vocab.js';

export const SCENE_FIELDS = /** @type {const} */ ([
  'emotion', 'situation_type', 'reasoning_pattern', 'known_fact', 'possible_assumption',
  'alternative_angle', 'practical_next_step', 'interaction_type', 'mallow_character',
  'subtitle_line_1', 'subtitle_line_2', 'safety_status',
]);

/**
 * @typedef {{
 *   emotion: string, situation_type: string, reasoning_pattern: keyof typeof PATTERN_INTERACTION,
 *   known_fact: string, possible_assumption: string, alternative_angle: string,
 *   practical_next_step: string, interaction_type: string, mallow_character: string,
 *   subtitle_line_1: string, subtitle_line_2: string, safety_status: 'ok' | 'care' | 'crisis'
 * }} Scene
 */

/** @param {string} description */
const str = (description) => ({ type: 'string', description });
/** @param {readonly string[]} values @param {string} description */
const oneOf = (values, description) => ({ type: 'string', enum: [...values], description });

/** JSON schema for output_config.format (structured outputs subset only). */
export const SCENE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [...SCENE_FIELDS],
  properties: {
    emotion: oneOf(SCENE_EMOTIONS, 'The main feeling. Prefer the feeling the person chose unless their words clearly say otherwise.'),
    situation_type: oneOf(SITUATIONS, 'Area of life. "unclear" only when there is no real situation to work with.'),
    reasoning_pattern: oneOf(PATTERNS, 'The one pattern that best fits what is bothering them most.'),
    known_fact: str('What the person actually knows, using only what they wrote. One sentence, at most 20 words. Addressed to "you".'),
    possible_assumption: str('What they might be adding or assuming. One sentence, at most 20 words, or "" if nothing is being assumed.'),
    alternative_angle: str('Another plausible way to see it that leaves room for the original worry being right. One sentence, at most 24 words.'),
    practical_next_step: str('One small, concrete action within their control, or a deliberate choice to pause. One sentence, at most 20 words.'),
    interaction_type: oneOf(INTERACTIONS, 'The mechanic paired with reasoning_pattern.'),
    mallow_character: oneOf(MALLOWS, 'Zuzu by default; another Mallow only when its role clearly fits.'),
    subtitle_line_1: str('First subtitle: exactly one short sentence, at most 22 words.'),
    subtitle_line_2: str('Second subtitle: exactly one short sentence, at most 22 words. Both lines together: 15 to 35 words.'),
    safety_status: oneOf(SAFETY_STATUSES, '"crisis" for any self-harm, suicide or danger; "care" for abuse, violence, threats, harassment, discrimination or feeling unsafe; otherwise "ok".'),
  },
});

/** Hard ceilings (characters) — the gate applies the word limits. */
export const FIELD_MAX_CHARS = Object.freeze({
  known_fact: 160, possible_assumption: 160, alternative_angle: 200, practical_next_step: 160,
  subtitle_line_1: 170, subtitle_line_2: 170,
});

const ENUMS = {
  emotion: SCENE_EMOTIONS, situation_type: SITUATIONS, reasoning_pattern: PATTERNS,
  interaction_type: INTERACTIONS, mallow_character: MALLOWS, safety_status: SAFETY_STATUSES,
};

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/u;

/**
 * Strictly validate an unknown value as a Scene. Enum values are matched
 * case-insensitively (structured outputs may change capitalisation) and
 * returned in canonical lower case; strings are trimmed and single-spaced.
 * @param {unknown} value
 * @returns {{ ok: true, scene: Scene } | { ok: false, errors: string[] }}
 */
export function validateScene(value) {
  /** @type {string[]} */
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['The answer was not a JSON object.'] };
  const obj = /** @type {Record<string, unknown>} */ (value);
  for (const key of Object.keys(obj)) if (!SCENE_FIELDS.includes(/** @type {any} */ (key))) errors.push(`Unexpected field "${key.slice(0, 40)}".`);
  /** @type {Record<string, string>} */
  const out = {};
  for (const field of SCENE_FIELDS) {
    const v = obj[field];
    if (typeof v !== 'string') { errors.push(`Field "${field}" must be a string.`); continue; }
    if (CONTROL.test(v)) { errors.push(`Field "${field}" contains control characters.`); continue; }
    const s = v.replace(/\s+/g, ' ').trim();
    const allowed = /** @type {Record<string, readonly string[]>} */ (ENUMS)[field];
    if (allowed) {
      const lower = s.toLowerCase();
      if (!allowed.includes(lower)) { errors.push(`Field "${field}" has a value outside the allowed list.`); continue; }
      out[field] = lower;
      continue;
    }
    const max = /** @type {Record<string, number>} */ (FIELD_MAX_CHARS)[field];
    if (s.length > max) { errors.push(`Field "${field}" is longer than ${max} characters.`); continue; }
    if (field !== 'possible_assumption' && s.length === 0) { errors.push(`Field "${field}" is empty.`); continue; }
    out[field] = s;
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, scene: /** @type {Scene} */ (/** @type {unknown} */ (out)) };
}

/**
 * Deterministic fix-ups that never change meaning: interaction_type follows
 * the reasoning pattern, and the Mallow must suit the pattern or the feeling
 * (otherwise the pattern's default Mallow). Returns what was changed.
 * @param {Scene} scene
 * @returns {{ scene: Scene, changed: string[] }}
 */
export function normaliseScene(scene) {
  const changed = [];
  const s = { ...scene };
  const mech = PATTERN_INTERACTION[s.reasoning_pattern];
  if (s.interaction_type !== mech) { s.interaction_type = mech; changed.push('interaction_type'); }
  const suited = new Set(['zuzu', ...PATTERN_MALLOWS[s.reasoning_pattern], ...(EMOTION_MALLOWS[s.emotion] || [])]);
  if (!suited.has(s.mallow_character)) { s.mallow_character = PATTERN_MALLOWS[s.reasoning_pattern][0]; changed.push('mallow_character'); }
  return { scene: s, changed };
}
