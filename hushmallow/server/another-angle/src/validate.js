// Request validation. Strict: unknown fields are rejected so client bugs and
// probing show up immediately. The person's text is normalised only for
// transport safety (NFC, control characters, whitespace) and never reworded.

import { normaliseEmotion, normaliseIntention, PATTERNS } from './vocab.js';

export const TEXT_MAX = 600;
export const PREVIOUS_MAX = 4;
export const PREVIOUS_LINE_MAX = 200;
export const ANGLE_BODY_MAX_BYTES = 8192;
export const SESSION_BODY_MAX_BYTES = 20000;

// C0/C1 controls (except tab and newline), zero-width and bidi controls.
// eslint-disable-next-line no-control-regex
const STRIP = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/gu;

/** @param {string} s */
export function cleanText(s) {
  return s.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(STRIP, '')
    .replace(/[  ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** @typedef {{ ok: false, code: string, field: string, message: string }} Invalid */

/** @param {string} code @param {string} field @param {string} message @returns {Invalid} */
const bad = (code, field, message) => ({ ok: false, code, field, message });

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: { text: string, emotion: string | null, intention: ReturnType<typeof normaliseIntention>, previous: { subtitle_line_1: string, subtitle_line_2: string, reasoning_pattern?: string }[] } } | Invalid}
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
  if (len < 1 || !/[\p{L}\p{N}]/u.test(text)) return bad('empty_text', 'text', 'text is empty.');
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
      previous.push(item);
    }
  }
  return { ok: true, value: { text, emotion, intention, previous } };
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: { invite: string | null, signedTransaction: string | null, platform: string | null } } | Invalid}
 */
export function validateSessionRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('invalid_body', '', 'Body must be a JSON object.');
  const b = /** @type {Record<string, unknown>} */ (body);
  for (const k of Object.keys(b)) if (!['invite', 'signed_transaction', 'platform', 'app_version'].includes(k)) return bad('unknown_field', k.slice(0, 40), `Unknown field "${k.slice(0, 40)}".`);
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
    },
  };
}
