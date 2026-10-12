// Shared safety check for every piece of free text the person types.
//
// One detector for the free Hushfold input, the classic express screen and
// Another Angle (hushmallow Beyond), built from src/data/safety-lexicon.js.
// It never interprets or rewrites anything; it only decides how carefully the
// app should respond:
//   crisis   self-harm or suicide, or someone else in danger right now
//            → openSupport(app, {urgent:true}), no Thought Mallow, no world
//              that transforms the words, a persistent Support chip
//   care     abuse, violence, threats, harassment, discrimination, feeling
//            unsafe → Support chip, never reframed
//   concern  distress words (can't cope, hopeless…), or wanting to hurt
//            someone else → keep support close, nothing playful
//   none     everything else
// Everyday idioms ("this deadline is killing me") are blanked out first.
//
// Pure ES module, no DOM. Works in browsers and Node.

import { HARM_LEXICON, HARM_COPY, CONCERN_LEXICON, HARM_OTHERS_LEXICON } from '../data/safety-lexicon.js';

const compile = (list, flags = 'i') => list.map((src) => new RegExp(src, flags));
const RULES = {
  guards: compile(HARM_LEXICON.idiomGuards, 'gi'),
  crisis: compile(HARM_LEXICON.crisis),
  crisisOther: compile(HARM_LEXICON.crisisOther),
  care: Object.entries(HARM_LEXICON.care).map(([category, list]) => [category, compile(list)]),
  concern: compile(CONCERN_LEXICON),
  harmOthers: compile(HARM_OTHERS_LEXICON),
};

/** Length-preserving tidy: straight quotes, single spaces, 2,000 characters at most. */
export function tidyForSafety(text) {
  return String(text ?? '')
    .slice(0, 2000)
    .replace(/[‘’‛ʼ`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstHit(regexes, text) {
  for (const re of regexes) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

/**
 * checkText(text) → { level: 'none'|'concern'|'care'|'crisis', category, matched }
 * category: 'self-harm' | 'someone-in-danger' | 'abuse' | 'violence' | 'threat'
 *           | 'harassment' | 'discrimination' | 'unsafe' | 'distress' | 'harm-others' | null
 * matched: the phrase that matched (for tests and logs on this device only).
 */
export function checkText(text) {
  let t = tidyForSafety(text);
  if (!t) return { level: 'none', category: null, matched: null };
  for (const re of RULES.guards) t = t.replace(re, (m) => ' '.repeat(m.length));

  let hit = firstHit(RULES.crisis, t);
  if (hit) return { level: 'crisis', category: 'self-harm', matched: hit };
  hit = firstHit(RULES.crisisOther, t);
  if (hit) return { level: 'crisis', category: 'someone-in-danger', matched: hit };
  for (const [category, regexes] of RULES.care) {
    hit = firstHit(regexes, t);
    if (hit) return { level: 'care', category, matched: hit };
  }
  hit = firstHit(RULES.harmOthers, t);
  if (hit) return { level: 'concern', category: 'harm-others', matched: hit };
  hit = firstHit(RULES.concern, t);
  if (hit) return { level: 'concern', category: 'distress', matched: hit };
  return { level: 'none', category: null, matched: null };
}

/** The authored copy for a result (title, message, resources), or null for none/concern. */
export function safetyCopy(result) {
  if (!result || result.level === 'none' || result.level === 'concern') return null;
  if (result.level === 'crisis') {
    const c = result.category === 'someone-in-danger' ? HARM_COPY.crisisOther : HARM_COPY.crisis;
    return { title: c.title, message: c.message, resources: c.resources, stillHere: HARM_COPY.stillHere };
  }
  const c = HARM_COPY.care[result.category];
  return c ? { title: c.title, message: c.message, resources: HARM_COPY.careResources, stillHere: HARM_COPY.stillHere } : null;
}

/** Shape used by interpret() and older callers: care is reported as 'concern'. */
export function legacySafety(result) {
  if (result.level === 'crisis') return { level: 'crisis', reason: result.category };
  if (result.level === 'care' || result.level === 'concern') return { level: 'concern', reason: result.category };
  return { level: 'none', reason: null };
}
