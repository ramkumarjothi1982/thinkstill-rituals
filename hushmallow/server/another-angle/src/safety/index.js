// Safety pre-check and post-check for Another Angle.
//
// Same algorithm and order as the app's src/engine/safety.js (crisis →
// someone in danger → care → concern), over the shared lexicon copy plus the
// server-only extras. A crisis or care result means: no model call, no
// reframe, the authored support copy instead.

import { HARM_LEXICON, HARM_COPY, CONCERN_LEXICON } from './shared-lexicon.js';
import { EXTRA_LEXICON, GENERAL_CARE } from './extra-lexicon.js';

/** @param {readonly string[]} list @param {string} [flags] */
const compile = (list, flags = 'i') => list.map((src) => new RegExp(src, flags));

/** @type {Record<string, readonly string[]>} */
const EXTRA_CARE = EXTRA_LEXICON.care;
/** @type {Record<string, readonly string[]>} */
const SHARED_CARE = HARM_LEXICON.care;
const CARE_CATEGORIES = Object.keys(HARM_LEXICON.care);
for (const k of Object.keys(EXTRA_CARE)) if (!CARE_CATEGORIES.includes(k)) CARE_CATEGORIES.push(k);

const RULES = {
  guards: compile([...HARM_LEXICON.idiomGuards, ...EXTRA_LEXICON.idiomGuards], 'gi'),
  crisis: compile([...HARM_LEXICON.crisis, ...EXTRA_LEXICON.crisis]),
  crisisOther: compile([...HARM_LEXICON.crisisOther, ...EXTRA_LEXICON.crisisOther]),
  // Third-person constructions ("my brother took an overdose") are blanked
  // before the first-person crisis check, so they get the "someone might be
  // in danger" copy unless the person also writes about themselves.
  otherSpans: compile(EXTRA_LEXICON.crisisOther, 'gi'),
  care: CARE_CATEGORIES.map((category) => /** @type {[string, RegExp[]]} */ ([
    category,
    compile([...(SHARED_CARE[category] || []), ...(EXTRA_CARE[category] || [])]),
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
  let self = t;
  for (const re of RULES.otherSpans) self = self.replace(re, (m) => ' '.repeat(m.length));
  if (firstHit(RULES.crisis, self)) return { level: 'crisis', category: 'self-harm' };
  if (firstHit(RULES.crisisOther, t)) return { level: 'crisis', category: 'someone-in-danger' };
  for (const [category, regexes] of RULES.care) if (firstHit(regexes, t)) return { level: 'care', category };
  if (firstHit(RULES.concern, t)) return { level: 'concern', category: 'distress' };
  return { level: 'none', category: null };
}

// Run every rule once while the module loads. V8 compiles a regular
// expression on its first use; doing that here puts the cost in the Worker's
// startup budget instead of the first request's CPU time (README "Costs").
export function warmSafety() {
  const sample = 'warm up the safety rules once: i took it, he said, my friend, cutting, no point.';
  for (const list of [RULES.guards, RULES.crisis, RULES.crisisOther, RULES.otherSpans, RULES.concern, ...RULES.care.map(([, r]) => r)]) {
    for (const re of list) { re.lastIndex = 0; re.test(sample); re.lastIndex = 0; }
  }
  checkSafety(sample);
  for (const re of OUTPUT_HARM) re.test(sample);
}

/**
 * @typedef {{ level: 'care' | 'crisis', category: string, title: string, message: string,
 *   resources: readonly { readonly label: string, readonly detail: string }[], still_here: string, source: 'lexicon' | 'model' }} Support
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
    return { level, category: other ? 'someone-in-danger' : 'self-harm', title: titleFor(level, c.title), message: c.message, resources: c.resources, still_here: HARM_COPY.stillHere, source };
  }
  const copy = HARM_COPY.care[category || ''] || GENERAL_CARE;
  return { level, category: category && copy !== GENERAL_CARE ? category : 'general', title: titleFor(level, copy.title), message: copy.message, resources: HARM_COPY.careResources, still_here: HARM_COPY.stillHere, source };
}

// "Reframe" is jargon the gate never lets the model say, and the feature is
// called Another Angle. Until the shared copy is reworded (asked of the
// Hushfold shell, which owns src/data/safety-lexicon.js), titles that still
// say "reframe" are replaced here; once they change, the shared titles are
// used as they are.
const SERVER_TITLES = { crisis: 'Let’s pause Another Angle', care: 'This one needs real support' };
/** @param {'care' | 'crisis'} level @param {string} title */
function titleFor(level, title) {
  return /reframe/i.test(title) ? SERVER_TITLES[level] : title;
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
    const text = scene[f] || '';
    const r = checkSafety(text);
    if (r.level === 'crisis' || r.level === 'care') return false;
    if (OUTPUT_HARM.some((re) => re.test(tidyForSafety(text)))) return false;
  }
  return true;
}

// Second-person harm language the first-person lexicon would not see.
const OUTPUT_HARM = [
  /\b(?:kill|killing|hurt|hurting|harm|harming|cut|cutting|burn|burning|starve|starving|punish|punishing) yourself\b/i,
  /\bend(?:ing)? your (?:own )?life\b/i,
  /\btake your (?:own )?life\b/i,
  /\bsuicid\w*/i,
  /\bself[- ]?harm\w*/i,
  /\boverdos\w*/i,
  /\b(?:want|wanting|wish) to die\b/i,
  /\bweapons?\b|\bpoison\w*/i,
];

warmSafety();
