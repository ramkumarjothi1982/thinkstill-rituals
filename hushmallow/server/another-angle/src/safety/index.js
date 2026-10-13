// Safety pre-check and post-check for Another Angle.
//
// Same algorithm and order as the app's src/engine/safety.js (crisis →
// someone in danger → care → concern), over the shared lexicon copy plus the
// server-only extras. A crisis or care result means: no model call, no
// reframe, the authored support copy instead.
//
// Two passes, as in the app (13 Oct 2026): the original check, unchanged,
// then the same guards and rules on a copy without filler words ("he
// finally hit me" → "he hit me"); the more serious result wins. FILLERS,
// SECOND_PASS and fillerFreeCopy are kept identical to the app's
// (test/safety-fillers.test.js compares them).

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

// ------------------------------------------------ second pass: fillers --
const F = String.raw;
/**
 * @type {Readonly<{ free: string, positional: string, subject: string, helper: string, likeNot: string,
 *   force: Readonly<Record<string, string>>, forceIng: Readonly<Record<string, string>>, wishIng: Readonly<Record<string, string>> }>}
 */
export const FILLERS = Object.freeze({
  // Removed wherever another word follows them (never at the end of a clause,
  // where the lexicon's lookaheads may read them).
  free: F`just|finally|actually|really|literally|basically|totally|honestly|always|sometimes|often|also|then|still|kinda|sorta|even(?! (?:though|so)\b)|(?<!\bfor )ever(?! (?:again|since|after)\b)|(?<!\b(?:a|an|the|what|this|that|these|those|any|some|every|which|my|your|his|her|our|their|no|one|same|its) )(?:kind|sort) of`,
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
const COMMA_FILLER = `${FILLERS.free}|${FILLERS.positional}|like`;
/** @param {string} ing */
const forceFromIng = (ing) => FILLERS.force[FILLERS.forceIng[ing.toLowerCase()]];
/** @type {[RegExp, string | ((m: string, ...groups: string[]) => string)][]} */
const FILLER_STEPS = [
  // ", like, " / ", honestly, " standing alone between commas, and chains of
  // them (", honestly, like, ")
  [new RegExp(F`\s*,\s*(?:${COMMA_FILLER})(?:\s*,\s*(?:${COMMA_FILLER}))*\s*,\s*`, 'gi'), ' '],
  [new RegExp(F`\b(?:${FILLERS.free}) (?=[a-z0-9'])`, 'gi'), ''],
  [new RegExp(F`(?<=(?:^|[\s,])(?:${FILLERS.subject}|${FILLERS.helper}) )(?:${FILLERS.positional}) (?=[a-z0-9'])`, 'gi'), ''],
  [new RegExp(F`(?<=(?:^|[\s,])(?:${FILLERS.subject}) )like (?!(?:${FILLERS.likeNot})\b)(?=[a-z])`, 'gi'), ''],
  // ...and straight after 'to' ("I want to like die", "I wanna like end it");
  // 'I want to like him' and 'I'd like to' stay.
  [new RegExp(F`(?<=\b(?:to|wanna|gonna|gotta) )like (?!(?:${FILLERS.likeNot})\b)(?=[a-z])`, 'gi'), ''],
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
 * @param {string} tidied
 */
export function fillerFreeCopy(tidied) {
  let c = String(tidied ?? '');
  for (const [re, to] of FILLER_STEPS) c = typeof to === 'string' ? c.replace(re, to) : c.replace(re, to);
  return c.replace(/ {2,}/g, ' ').trim();
}

/** @type {Readonly<{ guards: readonly string[], negation: string, denial: string, unless: string }>} */
export const SECOND_PASS = Object.freeze({
  // Idioms that only need blanking once fillers are gone: 'she just hit me up'
  // is a message, not a blow. (The first pass is left exactly as it was.)
  guards: Object.freeze([
    F`\b(?:hit|hits|hitting) (?:me|us) up\b(?! (?:against|the (?:side|back|front|head|face)|side|round|around|across)\b)`,
    F`\b(?:hit|hits) (?:me|us) back (?:with (?:an?|the|some|my|his|her|their) (?:answer|reply|response|quote|price|update|decision|text|message|email|call|date)|later|tomorrow|soon|about|on (?:this|that|it)|when (?:you|u|he|she|they|we|i)(?:'re|'s|'m|'ve)?(?: (?:are|is|am|was|were|have|has|had|get|gets|got|find|finds))? (?:free|ready|done|back|home|sure|able|out|a chance|a minute|a moment|a sec|the chance|time)|when (?:you|u|he|she|they|we|i) (?:can|know|knows|hear|hears|decide|decides))\b`,
    // words, not blows: 'he always hits me with the truth', 'she really hit me
    // with the best advice' (never 'with a belt', 'with the remote')
    F`\b(?:hit|hits|hitting) (?:me|us) with (?:(?:the|a|an|some|his|her|their|this|that|these|those) )?(?:(?:best|worst|same|latest|usual|big|hard|brutal|honest|cold|harsh|awful|terrible|funniest|weirdest) )?(?:truth|news|facts|advice|jokes?|puns?|questions?|compliments?|comebacks?|reality check|bombshell|details|ideas?|request|proposal|quote|update|offer|bill|deadline|feedback|gossip|memes?)\b`,
    // 'she just grabbed me a seat', 'he finally beat me to it' (but never
    // 'he grabbed me a few times', 'a bit too hard', 'another time')
    F`\b(?:grab|grabs|grabbed|grabbing) (?:me|us) (?:a|an|some|one|another)\b(?! (?:(?:couple|few|number|bunch|handful|load|lot)(?: of)? (?:times|occasions|nights|days|weeks|months|years)|bit|little|second|third|fourth|fifth|time|times|while|moment|minute|night|day|lot)\b)`,
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
  // "I don't think he'd ever really hurt me", "not once has he ever hit me"
  // (but never "I can't believe he actually hit me", "nobody knows he always
  // hits me", "no doubt he actually hit me" or "it's not because he always
  // hits me", which tell it).
  denial: F`(?:\bnot (?:like|that|as if|as though|saying|sure)|\b(?:don'?t|do not|didn'?t|did not|never|wouldn'?t|would not|can'?t say|cannot say) (?:think|believe|reckon|mean|say|said|claim|suppose|imagine|expect|feel like)|(?<!\b(?:no|don'?t|do not|never|without(?: a| any)?|beyond(?: a| any)?) )\bdoubt|\bno way|\b(?:never|not) once (?:did|does|do|has|had|have|was|were|would|will))(?: that)?\s*$`,
  // ...unless the sentence goes on to say it did happen: "he never hurt me
  // until last year", "he'd never hit me before", "never hit me again".
  unless: F`^[^.!?;]*?\b(?:before|until|till|again)\b`,
});

const SECOND = {
  guards: compile([...HARM_LEXICON.idiomGuards, ...EXTRA_LEXICON.idiomGuards, ...SECOND_PASS.guards], 'gi'),
  negation: new RegExp(SECOND_PASS.negation, 'gi'),
  denial: new RegExp(SECOND_PASS.denial, 'i'),
  unless: new RegExp(SECOND_PASS.unless, 'i'),
  /** @type {Map<RegExp, RegExp>} */
  sticky: new Map(),
  /** @type {Map<RegExp, RegExp>} */
  global: new Map(),
};

/**
 * Whether a second-pass match leans on a negation: it steps over one (the
 * match still fits with the negation masked out: "he never hurt me" fits
 * '<person> <any word> hurt me'), or a denial comes straight before it.
 * A negation the phrase itself spells out ("don't feel safe", "nobody would
 * miss me") is the phrase, not a denial of it.
 * @param {RegExp} re @param {string} text @param {RegExpExecArray} m @param {boolean} denials
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

/** @param {RegExp[]} regexes @param {string} text @param {string} level */
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
      if (!leansOnNegation(re, text, m, denials)) return true;
    }
  }
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
  const t = tidyForSafety(text);
  if (!t) return { level: 'none', category: null };
  const first = classify(t, firstHit, RULES.guards);
  if (first.level === 'crisis') return first;
  const copy = fillerFreeCopy(t);
  if (copy === t) return first;
  const second = classify(copy, secondPassHit, SECOND.guards, first.level);
  return RANK[second.level] > RANK[first.level] ? second : first;
}

/**
 * The first pass alone: the check exactly as it was before the second pass (for tests).
 * @param {string} text
 * @returns {SafetyResult}
 */
export function checkSafetyFirstPass(text) {
  const t = tidyForSafety(text);
  if (!t) return { level: 'none', category: null };
  return classify(t, firstHit, RULES.guards);
}

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };

/**
 * One pass of the check: the first on the tidied text, the second on its
 * filler-free copy. `floor`: the second pass only looks for levels above what
 * the first pass already found (anything else could not change the result).
 * @param {string} t
 * @param {(regexes: RegExp[], text: string, level: string) => boolean} hitIn
 * @param {RegExp[]} guards
 * @param {SafetyResult['level']} [floor]
 * @returns {SafetyResult}
 */
function classify(t, hitIn, guards, floor = 'none') {
  for (const re of guards) t = t.replace(re, (m) => ' '.repeat(m.length));
  let self = t;
  for (const re of RULES.otherSpans) self = self.replace(re, (m) => ' '.repeat(m.length));
  if (hitIn(RULES.crisis, self, 'crisis')) return { level: 'crisis', category: 'self-harm' };
  if (hitIn(RULES.crisisOther, t, 'crisis')) return { level: 'crisis', category: 'someone-in-danger' };
  if (RANK[floor] >= RANK.care) return { level: 'none', category: null };
  for (const [category, regexes] of RULES.care) if (hitIn(regexes, t, 'care')) return { level: 'care', category };
  if (RANK[floor] >= RANK.concern) return { level: 'none', category: null };
  if (hitIn(RULES.concern, t, 'concern')) return { level: 'concern', category: 'distress' };
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
  // The second pass: its guards, filler steps and negation checks, twice
  // (V8 compiles a pattern further on its second use).
  for (const s of ["honestly he, like, just keeps on hitting me and I don't think he would ever really hurt me again", 'he never really hurt me, kind of.']) {
    for (let i = 0; i < 2; i++) {
      for (const re of SECOND.guards) { re.lastIndex = 0; re.test(s); re.lastIndex = 0; }
      checkSafety(s);
    }
  }
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
