// Safety pre-check and post-check for Another Angle.
//
// Same algorithm and order as the app's src/engine/safety.js (crisis →
// someone in danger → care → concern), over the shared lexicon copy plus the
// server-only extras. A crisis or care result means: no model call, no
// reframe, the authored support copy instead.

import { HARM_LEXICON, HARM_COPY, CONCERN_LEXICON } from './shared-lexicon.js';
import { EXTRA_LEXICON, GENERAL_CARE } from './extra-lexicon.js';

/** @param {string[]} list @param {string} [flags] */
const compile = (list, flags = 'i') => list.map((src) => new RegExp(src, flags));

/** @type {Record<string, string[]>} */
const EXTRA_CARE = EXTRA_LEXICON.care;
const CARE_CATEGORIES = Object.keys(HARM_LEXICON.care);
for (const k of Object.keys(EXTRA_CARE)) if (!CARE_CATEGORIES.includes(k)) CARE_CATEGORIES.push(k);

const RULES = {
  guards: compile(HARM_LEXICON.idiomGuards, 'gi'),
  crisis: compile([...HARM_LEXICON.crisis, ...EXTRA_LEXICON.crisis]),
  crisisOther: compile([...HARM_LEXICON.crisisOther, ...EXTRA_LEXICON.crisisOther]),
  care: CARE_CATEGORIES.map((category) => /** @type {[string, RegExp[]]} */ ([
    category,
    compile([.../** @type {Record<string, string[]>} */ (HARM_LEXICON.care)[category] || [], ...(EXTRA_CARE[category] || [])]),
  ])),
  concern: compile(CONCERN_LEXICON),
};

/** @param {string} text */
export function tidyForSafety(text) {
  return String(text ?? '')
    .slice(0, 2000)
    .replace(/[‘’‛ʼ`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {RegExp[]} regexes @param {string} text */
function firstHit(regexes, text) {
  for (const re of regexes) if (re.test(text)) return true;
  return false;
}

/**
 * @typedef {{ level: 'none' | 'concern' | 'care' | 'crisis', category: string | null }} SafetyResult
 */

/**
 * Classify free text. Never returns the matched words (nothing about the
 * person's text leaves this function).
 * @param {string} text
 * @returns {SafetyResult}
 */
export function checkSafety(text) {
  let t = tidyForSafety(text);
  if (!t) return { level: 'none', category: null };
  for (const re of RULES.guards) t = t.replace(re, (m) => ' '.repeat(m.length));
  if (firstHit(RULES.crisis, t)) return { level: 'crisis', category: 'self-harm' };
  if (firstHit(RULES.crisisOther, t)) return { level: 'crisis', category: 'someone-in-danger' };
  for (const [category, regexes] of RULES.care) if (firstHit(regexes, t)) return { level: 'care', category };
  if (firstHit(RULES.concern, t)) return { level: 'concern', category: 'distress' };
  return { level: 'none', category: null };
}

/**
 * @typedef {{ level: 'care' | 'crisis', category: string, title: string, message: string,
 *   resources: { label: string, detail: string }[], still_here: string, source: 'lexicon' | 'model' }} Support
 */

/**
 * The authored support payload for a crisis/care result.
 * @param {'care' | 'crisis'} level
 * @param {string | null} category
 * @param {'lexicon' | 'model'} source
 * @returns {Support}
 */
export function supportPayload(level, category, source) {
  if (level === 'crisis') {
    const other = category === 'someone-in-danger';
    const c = other ? HARM_COPY.crisisOther : HARM_COPY.crisis;
    return { level, category: other ? 'someone-in-danger' : 'self-harm', title: c.title, message: c.message, resources: c.resources, still_here: HARM_COPY.stillHere, source };
  }
  const copy = /** @type {Record<string, {title: string, message: string}>} */ (HARM_COPY.care)[category || ''] || GENERAL_CARE;
  return { level, category: category && copy !== GENERAL_CARE ? category : 'general', title: copy.title, message: copy.message, resources: HARM_COPY.careResources, still_here: HARM_COPY.stillHere, source };
}

/**
 * Post-check on what the model wrote: visible text must not itself contain
 * crisis or harm language (it never should; this is defence in depth).
 * @param {Record<string, string>} scene
 * @param {readonly string[]} fields
 * @returns {boolean} true when the output is clean
 */
export function outputIsSafe(scene, fields) {
  for (const f of fields) {
    const r = checkSafety(scene[f] || '');
    if (r.level === 'crisis' || r.level === 'care') return false;
  }
  return true;
}
