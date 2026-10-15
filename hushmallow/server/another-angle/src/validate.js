// Request validation. Strict: unknown fields are rejected so client bugs and
// probing show up immediately. The person's text is normalised only for
// transport safety (NFC, control and invisible characters, whitespace) and
// never reworded.

import { normaliseEmotion, normaliseIntention, PATTERNS, INTERACTIONS, MALLOWS, PATTERN_INTERACTION, INTERACTION_PATTERN } from './vocab.js';

export const TEXT_MAX = 600;
export const PREVIOUS_MAX = 4;
export const PREVIOUS_LINE_MAX = 200;
export const ANGLE_BODY_MAX_BYTES = 16384;
export const SESSION_BODY_MAX_BYTES = 20000;

// Taken out of the person's text (and the earlier angles) before any check and
// before the prompt (15 Oct 2026, security review 1): C0/C1 controls (except
// tab and newline) and every default-ignorable or format character, so nothing
// invisible can split a word for the safety checks or carry words past them to
// the model. That is zero-width spaces and joiners, bidi controls and isolates
// (202A–202E, 2066–2069), the soft hyphen, the combining grapheme joiner, word
// joiners and invisible operators (2060–206F), variation selectors (FE00–FE0F,
// E0100–E01EF), Hangul fillers (115F, 1160, 3164, FFA0), Unicode tag
// characters (E0000–E007F: invisible ASCII a model can still read) and the
// rest of Default_Ignorable_Code_Point and of the format category (Cf); plus
// the combining marks for symbols (20D0–20FF), which no English text needs.
// The shared risk screener folds lookalike letters on its own copy
// (risk-screen.js normalise); the words themselves are never changed.
// eslint-disable-next-line no-control-regex
const STRIP = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\p{Default_Ignorable_Code_Point}\p{Cf}\u20D0-\u20FF\u{E0000}-\u{E0FFF}]/gu;
// Blank characters that stand for a space are a space (no-break and the other
// Unicode spaces, the braille blank); line and paragraph separators are new lines.
const SPACES = /[\p{Zs}\u2800]+/gu;

/** @param {string} s */
export function cleanText(s) {
  return s.replace(/\r\n?|[\u2028\u2029]/g, '\n').replace(/\t/g, ' ').replace(STRIP, '').normalize('NFC')
    .replace(SPACES, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** @typedef {{ ok: false, code: string, field: string, message: string }} Invalid */

/** @param {string} code @param {string} field @param {string} message @returns {Invalid} */
const bad = (code, field, message) => ({ ok: false, code, field, message });

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: { text: string, emotion: string | null, intention: ReturnType<typeof normaliseIntention>, previous: { subtitle_line_1: string, subtitle_line_2: string, reasoning_pattern?: string }[], requestId: string | null } } | Invalid}
 */
export function validateAngleRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('invalid_body', '', 'Body must be a JSON object.');
  const b = /** @type {Record<string, unknown>} */ (body);
  const allowed = ['text', 'emotion', 'intention', 'previous_angles', 'locale', 'consent', 'request_id'];
  for (const k of Object.keys(b)) if (!allowed.includes(k)) return bad('unknown_field', k.slice(0, 40), `Unknown field "${k.slice(0, 40)}".`);

  if (b.consent !== true) return bad('consent_required', 'consent', 'Send "consent": true once the person has agreed to the Another Angle privacy notice.');
  if (b.locale !== undefined && b.locale !== 'en-GB') return bad('unsupported_locale', 'locale', 'Only "en-GB" is supported.');
  if (b.request_id !== undefined && (typeof b.request_id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(b.request_id))) return bad('invalid_request_id', 'request_id', 'request_id must be 8–64 letters, digits or hyphens.');

  if (typeof b.text !== 'string') return bad('invalid_text', 'text', 'text must be a string.');
  const text = cleanText(b.text);
  const len = [...text].length;
  // Emoji or punctuation only ("😭😭😭") is valid: the server answers with an
  // "unclear" fallback without calling the model. Only blank text is refused.
  if (len < 1) return bad('empty_text', 'text', 'text is empty.');
  if (len > TEXT_MAX) return bad('text_too_long', 'text', `text must be at most ${TEXT_MAX} characters (it has ${len}).`);

  let emotion = null;
  if (b.emotion !== undefined && b.emotion !== null) {
    if (typeof b.emotion !== 'string' || b.emotion.length > 40) return bad('invalid_emotion', 'emotion', 'emotion must be one of the app\'s feeling ids.');
    const e = normaliseEmotion(b.emotion);
    if (!e.ok) return bad('invalid_emotion', 'emotion', 'emotion must be one of the app\'s feeling ids.');
    emotion = e.id;
  }
  let intention = null;
  if (b.intention !== undefined && b.intention !== null) {
    if (typeof b.intention !== 'string' || b.intention.length > 40) return bad('invalid_intention', 'intention', 'intention must be one of the intention chips.');
    intention = normaliseIntention(b.intention);
    if (!intention) return bad('invalid_intention', 'intention', 'intention must be one of the intention chips.');
  }

  /** @type {{ subtitle_line_1: string, subtitle_line_2: string, reasoning_pattern?: string }[]} */
  const previous = [];
  if (b.previous_angles !== undefined) {
    if (!Array.isArray(b.previous_angles)) return bad('invalid_previous', 'previous_angles', 'previous_angles must be an array.');
    if (b.previous_angles.length > PREVIOUS_MAX) return bad('too_many_previous', 'previous_angles', `At most ${PREVIOUS_MAX} previous angles.`);
    for (const [i, p] of b.previous_angles.entries()) {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return bad('invalid_previous', `previous_angles[${i}]`, 'Each previous angle must be an object.');
      const o = /** @type {Record<string, unknown>} */ (p);
      for (const k of Object.keys(o)) if (!['subtitle_line_1', 'subtitle_line_2', 'reasoning_pattern', 'interaction_type'].includes(k)) return bad('unknown_field', `previous_angles[${i}].${k.slice(0, 40)}`, 'Unknown field in previous angle.');
      const l1 = typeof o.subtitle_line_1 === 'string' ? cleanText(o.subtitle_line_1) : null;
      const l2 = typeof o.subtitle_line_2 === 'string' ? cleanText(o.subtitle_line_2) : null;
      if (!l1 || !l2 || l1.length > PREVIOUS_LINE_MAX || l2.length > PREVIOUS_LINE_MAX) return bad('invalid_previous', `previous_angles[${i}]`, `Both subtitle lines are required, each at most ${PREVIOUS_LINE_MAX} characters.`);
      /** @type {{ subtitle_line_1: string, subtitle_line_2: string, reasoning_pattern?: string }} */
      const item = { subtitle_line_1: l1.replace(/\n/g, ' '), subtitle_line_2: l2.replace(/\n/g, ' ') };
      if (o.reasoning_pattern !== undefined) {
        if (typeof o.reasoning_pattern !== 'string' || !PATTERNS.includes(/** @type {any} */ (o.reasoning_pattern))) return bad('invalid_previous', `previous_angles[${i}].reasoning_pattern`, 'Unknown reasoning_pattern.');
        item.reasoning_pattern = o.reasoning_pattern;
      }
      // interaction_type is optional; it must be a known mechanic and match
      // the pattern. On its own it stands for its pattern (the novelty check
      // compares patterns, because the mechanic follows the pattern).
      if (o.interaction_type !== undefined) {
        if (typeof o.interaction_type !== 'string' || !INTERACTIONS.includes(o.interaction_type)) return bad('invalid_previous', `previous_angles[${i}].interaction_type`, 'Unknown interaction_type.');
        if (item.reasoning_pattern && /** @type {Record<string, string>} */ (PATTERN_INTERACTION)[item.reasoning_pattern] !== o.interaction_type) {
          return bad('invalid_previous', `previous_angles[${i}].interaction_type`, 'interaction_type does not match reasoning_pattern.');
        }
        item.reasoning_pattern = INTERACTION_PATTERN[o.interaction_type];
      }
      previous.push(item);
    }
  }
  return { ok: true, value: { text, emotion, intention, previous, requestId: typeof b.request_id === 'string' ? b.request_id : null } };
}

/**
 * device_id: a random id the app makes once and keeps (for example 22+
 * base64url characters from crypto.getRandomValues). The server never stores
 * it; it is hashed with IP_HASH_KEY into the session subject, so a new
 * session for the same device keeps the same daily allowance.
 * @param {unknown} body
 * @returns {{ ok: true, value: { invite: string | null, signedTransaction: string | null, platform: string | null, deviceId: string | null } } | Invalid}
 */
export function validateSessionRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('invalid_body', '', 'Body must be a JSON object.');
  const b = /** @type {Record<string, unknown>} */ (body);
  for (const k of Object.keys(b)) if (!['invite', 'signed_transaction', 'platform', 'app_version', 'device_id'].includes(k)) return bad('unknown_field', k.slice(0, 40), `Unknown field "${k.slice(0, 40)}".`);
  if (b.device_id !== undefined && (typeof b.device_id !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(b.device_id))) return bad('invalid_device_id', 'device_id', 'device_id must be 16–128 letters, digits, "-" or "_" (a random id kept on the device).');
  if (b.invite !== undefined && (typeof b.invite !== 'string' || b.invite.length < 1 || b.invite.length > 64)) return bad('invalid_invite', 'invite', 'invite must be a string of at most 64 characters.');
  if (b.signed_transaction !== undefined && (typeof b.signed_transaction !== 'string' || b.signed_transaction.length > 16000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(b.signed_transaction))) {
    return bad('invalid_transaction', 'signed_transaction', 'signed_transaction must be a compact JWS.');
  }
  if (b.platform !== undefined && !['web', 'ios'].includes(/** @type {string} */ (b.platform))) return bad('invalid_platform', 'platform', 'platform must be "web" or "ios".');
  if (b.app_version !== undefined && (typeof b.app_version !== 'string' || b.app_version.length > 40)) return bad('invalid_app_version', 'app_version', 'app_version must be a short string.');
  return {
    ok: true,
    value: {
      invite: typeof b.invite === 'string' ? b.invite : null,
      signedTransaction: typeof b.signed_transaction === 'string' ? b.signed_transaction : null,
      platform: typeof b.platform === 'string' ? b.platform : null,
      deviceId: typeof b.device_id === 'string' ? b.device_id : null,
    },
  };
}

export const FEEDBACK_RATINGS = /** @type {const} */ (['helped', 'another_angle', 'not_relevant', 'just_squeeze']);

/**
 * Feedback carries no words at all: one of the four buttons, plus which kind
 * of scene it was about. It is only logged as metadata, never stored per person.
 * @param {unknown} body
 * @returns {{ ok: true, value: { rating: string, reasoning_pattern: string | null, interaction_type: string | null, mallow_character: string | null, prompt_version: string | null } } | Invalid}
 */
export function validateFeedbackRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('invalid_body', '', 'Body must be a JSON object.');
  const b = /** @type {Record<string, unknown>} */ (body);
  for (const k of Object.keys(b)) if (!['rating', 'reasoning_pattern', 'interaction_type', 'mallow_character', 'prompt_version'].includes(k)) return bad('unknown_field', k.slice(0, 40), `Unknown field "${k.slice(0, 40)}".`);
  if (!FEEDBACK_RATINGS.includes(/** @type {any} */ (b.rating))) return bad('invalid_rating', 'rating', `rating must be one of ${FEEDBACK_RATINGS.join(', ')}.`);
  /** @param {string} k @param {readonly string[]} list */
  const pick = (k, list) => (b[k] === undefined || b[k] === null ? null : list.includes(/** @type {any} */ (b[k])) ? /** @type {string} */ (b[k]) : undefined);
  const value = {
    rating: /** @type {string} */ (b.rating),
    reasoning_pattern: pick('reasoning_pattern', PATTERNS),
    interaction_type: pick('interaction_type', INTERACTIONS),
    mallow_character: pick('mallow_character', MALLOWS),
  };
  for (const [k, v] of Object.entries(value)) if (v === undefined) return bad('invalid_field', k, `${k} is not one of the allowed values.`);
  if (b.prompt_version !== undefined && b.prompt_version !== null && (typeof b.prompt_version !== 'string' || !/^angle-v\d{1,3}$/.test(b.prompt_version))) return bad('invalid_field', 'prompt_version', 'Unknown prompt_version.');
  // The version of the prompt that wrote the scene being rated (a scene can
  // outlive a deploy on the device), so ratings are counted against it.
  return { ok: true, value: /** @type {any} */ ({ ...value, prompt_version: typeof b.prompt_version === 'string' ? b.prompt_version : null }) };
}
