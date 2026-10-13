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
// Two passes (added 13 Oct 2026). The lexicon matches the person and the verb
// next to each other ("he hit me"), so a filler word in between ("he finally
// hit me", "she always hits me") used to slip through. The first pass is the
// original check, unchanged. The second runs the same guards and rules on a
// copy without short filler words (fillerFreeCopy below), and the more
// serious of the two results wins, so nothing the first pass finds is ever
// lost. Negations are never removed, and a second-pass match that only
// works by stepping over one ("he never really hurt me") does not count,
// unless the sentence goes on with before / until / again. The server's
// pre-check (server/another-angle/src/safety/index.js) mirrors this.
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

// ------------------------------------------------ second pass: fillers --
// Kept identical to FILLERS in server/another-angle/src/safety/index.js
// (test/safety-fillers.test.js compares them).
const F = String.raw;
export const FILLERS = Object.freeze({
  // Removed wherever another word follows them (never at the end of a clause,
  // where the lexicon's lookaheads may read them).
  free: F`just|finally|actually|really|literally|basically|totally|honestly|always|sometimes|often|also|then|still|kinda|sorta|even(?! (?:though|if|so)\b)|(?<!\bfor )ever(?! (?:again|since|after)\b)|(?<!\b(?:a|an|the|what|this|that|these|those|any|some|every|which|my|your|his|her|our|their|no|one|same|its) )(?:kind|sort) of`,
  // Removed only straight after a subject, a helper verb or 'to' ("he
  // already hit me", "want to seriously hurt him"): the lexicon reads them
  // after a phrase ("taking my life seriously", "over already").
  positional: F`seriously|already|again`,
  subject: F`i|he|she|they|we|you|someone|somebody|(?:my|[a-z]+'s) (?:best |close |little |big |older |younger |new |old )?(?:friend|mate|bestie|partner|boyfriend|girlfriend|husband|wife|ex|bf|gf|fianc[eé]e?|mum|mom|mam|dad|mother|father|parent|step-?(?:dad|mum|mom|father|mother|brother|sister)|sister|brother|sibling|son|daughter|child|kid|cousin|niece|nephew|aunt|auntie|uncle|nan|gran|grandma|grandad|granddad|grandpa|flatmate|housemate|roommate|classmate|colleague|boss|manager|teacher|coach|tutor|carer|neighbou?r)`,
  helper: F`[a-z]+'(?:s|ve|d|ll|m|re)|has|have|had|is|was|are|were|am|will|would|could|should|might|must|can|do|does|did|to`,
  // Filler 'like' only straight after a subject and before a verb ("he like
  // hit me"), never 'I like him', 'feel like', 'like that' or 'would like to'.
  likeNot: F`me|you|him|her|them|us|it|its|this|that|these|those|a|an|the|my|your|his|our|their|to|when|how|what|i|he|she|they|we|someone|somebody|anyone|anybody|everyone|everybody|people|being|so|no|nothing|anything|everything|any|some|myself|yourself|himself|herself|themselves`,
  // 'keeps hitting me', 'started to punch me' → 'hits me', 'punches me'
  // (the violence rules list these forms).
  force: { hit: 'hits', punch: 'punches', kick: 'kicks', slap: 'slaps', choke: 'chokes', strangle: 'strangles', beat: 'beats', shove: 'shoves', smack: 'smacks', attack: 'attacks', grab: 'grabs' },
  forceIng: { hitting: 'hit', punching: 'punch', kicking: 'kick', slapping: 'slap', choking: 'choke', strangling: 'strangle', beating: 'beat', shoving: 'shove', smacking: 'smack', attacking: 'attack', grabbing: 'grab' },
  // 'I keep wanting to die', 'I've started wishing I was dead' → 'want', 'wish'
  wishIng: { wanting: 'want', wishing: 'wish', hoping: 'hope', praying: 'pray' },
});

const FORCE_BASE = Object.keys(FILLERS.force).join('|');
const FORCE_ING = Object.keys(FILLERS.forceIng).join('|');
const forceFromIng = (ing) => FILLERS.force[FILLERS.forceIng[ing.toLowerCase()]];
const FILLER_STEPS = [
  // ", like, " / ", honestly, " standing alone between commas
  [new RegExp(F`\s*,\s*(?:${FILLERS.free}|${FILLERS.positional}|like)\s*,\s*`, 'gi'), ' '],
  [new RegExp(F`\b(?:${FILLERS.free}) (?=[a-z0-9'])`, 'gi'), ''],
  [new RegExp(F`(?<=(?:^|[\s,])(?:${FILLERS.subject}|${FILLERS.helper}) )(?:${FILLERS.positional}) (?=[a-z0-9'])`, 'gi'), ''],
  [new RegExp(F`(?<=(?:^|[\s,])(?:${FILLERS.subject}) )like (?!(?:${FILLERS.likeNot})\b)(?=[a-z])`, 'gi'), ''],
  // 'keep on hurting me' → 'keep hurting me' (the lexicon knows 'keeps hurting', 'keep cutting')
  [/\b(keep|keeps|kept|keeping) on (?=[a-z]+ing\b)/gi, '$1 '],
  [new RegExp(F`\b(?:keep|keeps|kept|keeping|start|starts|started|starting|began|begun) (${Object.keys(FILLERS.wishIng).join('|')})\b`, 'gi'), (_, ing) => FILLERS.wishIng[ing.toLowerCase()]],
  [new RegExp(F`\b(?:keep|keeps|kept|keeping) (${FORCE_ING})(?= me\b)`, 'gi'), (_, ing) => forceFromIng(ing)],
  [new RegExp(F`\b(?:start|starts|started|starting|began|begun) (?:to (${FORCE_BASE})|(${FORCE_ING}))(?= me\b)`, 'gi'),
    (_, base, ing) => (base ? FILLERS.force[base.toLowerCase()] : forceFromIng(ing))],
  [/\b(?:start|starts|started|starting) to (?=[a-z])/gi, ''],
];

/**
 * The tidied text without filler words, for the second pass. Only ever
 * deletes words (and turns 'keeps hitting' into 'hits'); negations stay.
 */
export function fillerFreeCopy(tidied) {
  let c = String(tidied ?? '');
  for (const [re, to] of FILLER_STEPS) c = c.replace(re, to);
  return c.replace(/ {2,}/g, ' ').trim();
}

// Kept identical to the server's SECOND_PASS (compared by its test).
export const SECOND_PASS = Object.freeze({
  // Idioms that only need blanking once fillers are gone: 'she just hit me up'
  // is a message, not a blow. (The first pass is left exactly as it was.)
  guards: Object.freeze([
    F`\b(?:hit|hits|hitting) (?:me|us) up\b(?! against\b)`,
    F`\b(?:hit|hits) (?:me|us) back (?:with (?:an?|the|some|my|his|her|their) (?:answer|reply|response|quote|price|update|decision|text|message|email|call|date)|later|tomorrow|soon|when|about|on (?:this|that|it))\b`,
    // 'she just grabbed me a seat', 'he finally beat me to it'
    F`\b(?:grab|grabs|grabbed|grabbing) (?:me|us) (?:a|an|some|one|another)\b`,
    F`\b(?:beat|beats|beaten) (?:me|us) to (?:it|the (?:punch|bathroom|shower|loo|toilet|front|finish|finish line|top|answer|post|draw|chase|seat|last one|car|door|bus|queue))\b`,
    // 'dye' spelt 'die': 'my sister really wants to die her hair pink'
    F`\b(?:die|dies|died) (?:my|her|his|their|your|our) (?:hair|fringe|roots|beard|eyebrows)\b`,
    // games and group chats: 'he always beats me at tennis', 'she literally
    // kicked me out of the group chat'
    F`\b(?:beat|beats|beating|beaten) (?:me|us) (?:at|in) (?:chess|tennis|table tennis|ping pong|cards|poker|football|golf|squash|badminton|basketball|netball|scrabble|monopoly|mario kart|fifa|games?|video games|everything|running|races?|the race|arm wrestling|pool|darts|bowling|quizzes|trivia|maths|math|exams?|tests?)\b`,
    F`\b(?:kick|kicks|kicked|kicking) (?:me|us) (?:out of|off) (?:the |our |my |a |his |her |their )?(?:group chat|group|chat|game|team|class|lesson|club|band|server|discord|call|meeting|squad|match|league|course|whatsapp|channel)\b`,
  ]),
  negation: F`\b(?:not|never|no|nobody|noone|nothing|none|nowhere|neither|nor|cannot|[a-z]+n't|dont|didnt|doesnt|wont|cant|isnt|wasnt|arent|werent|hasnt|havent|hadnt|shouldnt|wouldnt|couldnt|mustnt|aint)\b`,
  // Words that deny what follows them: "it's not like he really hit me",
  // "I don't think he'd ever really hurt me" (but never "I can't believe he
  // actually hit me" or "nobody knows he always hits me", which tell it).
  denial: F`(?:\bnot (?:like|that|as if|as though|saying|because|sure)|\b(?:don'?t|do not|didn'?t|did not|never|wouldn'?t|would not|can'?t say|cannot say) (?:think|believe|reckon|mean|say|said|claim|suppose|imagine|expect|feel like)|\bdoubt|\bno way)(?: that)?\s*$`,
  // ...unless the sentence goes on to say it did happen: "he never hurt me
  // until last year", "he'd never hit me before", "never hit me again".
  unless: F`^[^.!?;]*?\b(?:before|until|till|again)\b`,
});

const SECOND = {
  guards: compile([...HARM_LEXICON.idiomGuards, ...SECOND_PASS.guards], 'gi'),
  negation: new RegExp(SECOND_PASS.negation, 'gi'),
  denial: new RegExp(SECOND_PASS.denial, 'i'),
  unless: new RegExp(SECOND_PASS.unless, 'i'),
  sticky: new Map(),
  global: new Map(),
};

/**
 * Whether a second-pass match leans on a negation: it steps over one (the
 * match still fits with the negation masked out: "he never hurt me" fits
 * '<person> <any word> hurt me'), or a denial comes straight before it.
 * A negation the phrase itself spells out ("don't feel safe", "nobody would
 * miss me") is the phrase, not a denial of it.
 */
function leansOnNegation(re, text, m, denials) {
  const end = m.index + m[0].length;
  let leans = denials && SECOND.denial.test(text.slice(0, m.index));
  SECOND.negation.lastIndex = 0;
  if (!leans && SECOND.negation.test(m[0])) {
    const masked = text.slice(0, m.index) + m[0].replace(SECOND.negation, (w) => 'x'.repeat(w.length)) + text.slice(end);
    let y = SECOND.sticky.get(re);
    if (!y) SECOND.sticky.set(re, (y = new RegExp(re.source, 'iy')));
    y.lastIndex = m.index;
    leans = y.test(masked);
  }
  return leans && !SECOND.unless.test(text.slice(end));
}

function secondPassHit(regexes, text, level) {
  // A denial ("I don't think…") is only weighed for harm done by someone
  // else; for anything about dying, caution wins ("I don't think anyone would
  // ever really notice if I was gone").
  const denials = level !== 'crisis';
  for (const re of regexes) {
    if (!re.test(text)) continue; // the usual case, and as cheap as the first pass
    let g = SECOND.global.get(re);
    if (!g) SECOND.global.set(re, (g = new RegExp(re.source, 'gi')));
    g.lastIndex = 0;
    for (let m = g.exec(text); m; m = g.exec(text)) {
      if (!m[0]) { g.lastIndex++; continue; }
      if (!leansOnNegation(re, text, m, denials)) return m[0];
    }
  }
  return null;
}

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };
const NONE = Object.freeze({ level: 'none', category: null, matched: null });

// One pass. `floor`: the second pass only looks for levels above what the
// first pass already found (anything else could not change the result).
function classify(t, hitIn, guards, floor = 'none') {
  for (const re of guards) t = t.replace(re, (m) => ' '.repeat(m.length));

  let hit = hitIn(RULES.crisis, t, 'crisis');
  if (hit) return { level: 'crisis', category: 'self-harm', matched: hit };
  hit = hitIn(RULES.crisisOther, t, 'crisis');
  if (hit) return { level: 'crisis', category: 'someone-in-danger', matched: hit };
  if (RANK[floor] >= RANK.care) return { ...NONE };
  for (const [category, regexes] of RULES.care) {
    hit = hitIn(regexes, t, 'care');
    if (hit) return { level: 'care', category, matched: hit };
  }
  if (RANK[floor] >= RANK.concern) return { ...NONE };
  hit = hitIn(RULES.harmOthers, t, 'concern');
  if (hit) return { level: 'concern', category: 'harm-others', matched: hit };
  hit = hitIn(RULES.concern, t, 'concern');
  if (hit) return { level: 'concern', category: 'distress', matched: hit };
  return { ...NONE };
}

/**
 * checkText(text) → { level: 'none'|'concern'|'care'|'crisis', category, matched }
 * category: 'self-harm' | 'someone-in-danger' | 'abuse' | 'violence' | 'threat'
 *           | 'harassment' | 'discrimination' | 'unsafe' | 'distress' | 'harm-others' | null
 * matched: the phrase that matched (for tests and logs on this device only).
 */
export function checkText(text) {
  const t = tidyForSafety(text);
  if (!t) return { level: 'none', category: null, matched: null };
  const first = classify(t, firstHit, RULES.guards);
  if (first.level === 'crisis') return first;
  const copy = fillerFreeCopy(t);
  if (copy === t) return first;
  const second = classify(copy, secondPassHit, SECOND.guards, first.level);
  return RANK[second.level] > RANK[first.level] ? second : first;
}

/** The first pass alone: the check exactly as it was before the second pass (for tests). */
export function checkTextFirstPass(text) {
  const t = tidyForSafety(text);
  if (!t) return { level: 'none', category: null, matched: null };
  return classify(t, firstHit, RULES.guards);
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
