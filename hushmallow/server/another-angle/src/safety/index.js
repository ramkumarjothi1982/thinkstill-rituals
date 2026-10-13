// Safety pre-check and post-check for Another Angle.
//
// Same algorithm and order as the app's src/engine/safety.js (crisis →
// someone in danger → care → concern), over the shared lexicon copy plus the
// server-only extras. A crisis or care result means: no model call, no
// reframe, the authored support copy instead.
//
// Two passes, as in the app (13 Oct 2026): the original check, unchanged,
// then the same guards and rules on a copy without filler words ("he
// finally hit me" → "he hit me"); the more serious result wins, and a
// second-pass match that a negation in its own clause governs ("I don't
// necessarily want to really die", "at no point did he actually hit me", "it
// isn't that he really hit me") does not count. FILLERS, SECOND_PASS,
// fillerFreeCopy and the scope block below are kept identical to the app's
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
 *   force: Readonly<Record<string, string>>, forceIng: Readonly<Record<string, string>>, wishIng: Readonly<Record<string, string>>,
 *   short: Readonly<Record<string, string>> }>}
 */
export const FILLERS = Object.freeze({
  // Removed wherever another word follows them (never at the end of a clause,
  // where the lexicon's lookaheads may read them). 'just' stays between a
  // negation and a denial: "it's not just that he hit me" says that he did.
  free: F`(?<!\b(?:not|[a-z]+n't|dont|didnt|doesnt|isnt|wasnt|arent|werent|aint|wont|cant) )just|just(?! (?:that|like|as if|as though)\b)|finally|finaly|actually|really|realy|rly|literally|basically|totally|honestly|genuinely|always|sometimes|often|also|then|still|kinda|sorta|even(?! (?:though|so)\b)|(?<!\bfor )ever(?! (?:again|since|after)\b)|(?<!\b(?:a|an|the|what|this|that|these|those|any|some|every|which|my|your|his|her|our|their|no|one|same|its) )(?:kind|sort) of`,
  // Removed only straight after a subject, a helper verb or 'to' ("he
  // already hit me", "want to seriously hurt him"): the lexicon reads them
  // after a phrase ("taking my life seriously", "over already").
  positional: F`seriously|already|again`,
  subject: F`i|he|she|they|we|you|someone|somebody|(?:my|[a-z]+'s) (?:best |close |little |big |older |younger |new |old )?(?:friend|mate|bestie|partner|boyfriend|girlfriend|husband|wife|ex|bf|gf|fianc[eé]e?|mum|mom|mam|dad|mother|father|parent|step-?(?:dad|mum|mom|father|mother|brother|sister)|sister|brother|sibling|son|daughter|child|kid|cousin|niece|nephew|aunt|auntie|uncle|nan|gran|grandma|grandad|granddad|grandpa|flatmate|housemate|roommate|classmate|colleague|boss|manager|teacher|coach|tutor|carer|neighbou?r)`,
  helper: F`[a-z]+'(?:s|ve|d|ll|m|re)|has|have|had|is|was|are|were|am|will|would|could|should|might|must|can|do|does|did|to`,
  // Filler 'like' only straight after a subject and before a verb ("he like
  // hit me"), never 'I like him', 'feel like', 'like that' or 'would like to'.
  likeNot: F`me|you|him|her|them|us|it|its|this|that|these|those|a|an|the|my|your|his|our|their|to|when|how|what|i|he|she|they|we|someone|somebody|anyone|anybody|everyone|everybody|people|being|so|no|nothing|anything|everything|any|some|myself|yourself|himself|herself|themselves`,
  // 'keeps hitting me', 'started to punch me', 'keeps on hurting me' → 'hits me', 'punches me', 'hurts me'
  // (the violence rules list these forms).
  force: { hit: 'hits', hurt: 'hurts', punch: 'punches', kick: 'kicks', slap: 'slaps', choke: 'chokes', strangle: 'strangles', beat: 'beats', shove: 'shoves', smack: 'smacks', attack: 'attacks', grab: 'grabs' },
  forceIng: { hitting: 'hit', hurting: 'hurt', punching: 'punch', kicking: 'kick', slapping: 'slap', choking: 'choke', strangling: 'strangle', beating: 'beat', shoving: 'shove', smacking: 'smack', attacking: 'attack', grabbing: 'grab' },
  // 'I keep wanting to die', 'I've started wishing I was dead' → 'want', 'wish'
  wishIng: { wanting: 'want', wishing: 'wish', hoping: 'hope', praying: 'pray' },
  // 'my bf hit me' → 'my boyfriend hit me' (the server's extra rules already
  // know bf and gf; the shared lexicon's lists of people do not)
  short: { bf: 'boyfriend', gf: 'girlfriend' },
});

const FORCE_BASE = Object.keys(FILLERS.force).join('|');
const FORCE_ING = Object.keys(FILLERS.forceIng).join('|');
const COMMA_FILLER = `${FILLERS.free}|${FILLERS.positional}|like`;
// Punctuation that can set a filler off: 'he... finally hit me', 'he
// (finally) hit me', 'he—finally—hit me', 'he finally, hit me'.
const LEAD = F`(?:\.{2,}|…|—|–|--|\()`;
const TRAIL = F`(?:,|\.{2,}|…|—|–|--|\))`;
/** @param {string} ing */
const forceFromIng = (ing) => FILLERS.force[FILLERS.forceIng[ing.toLowerCase()]];
/** @type {[RegExp, string | ((m: string, ...groups: string[]) => string)][]} */
const FILLER_STEPS = [
  // ", like, " / ", honestly, " standing alone between commas, and chains of
  // them (", honestly, like, ")
  [new RegExp(F`\s*,\s*(?:${COMMA_FILLER})(?:\s*,\s*(?:${COMMA_FILLER}))*\s*,\s*`, 'gi'), ' '],
  // ...or set off by other punctuation straight after a subject, a helper or
  // 'to' ("he... finally hit me", "he (finally) hit me", "he finally, hit
  // me", "I want to really, really die")
  [new RegExp(F`(?<=(?:^|[\s,(])(?:${FILLERS.subject}|${FILLERS.helper}))(?:\s*${LEAD}\s*(?:${COMMA_FILLER})(?:\s+(?:${COMMA_FILLER}))*\s*${TRAIL}?|(?:\s+(?:${COMMA_FILLER}))+\s*${TRAIL})\s*(?=[a-z0-9'])`, 'gi'), ' '],
  [new RegExp(F`\b(?:${FILLERS.free}) (?=[a-z0-9'])`, 'gi'), ''],
  [new RegExp(F`(?<=(?:^|[\s,])(?:${FILLERS.subject}|${FILLERS.helper}) )(?:${FILLERS.positional}) (?=[a-z0-9'])`, 'gi'), ''],
  [new RegExp(F`(?<=(?:^|[\s,])(?:${FILLERS.subject}) )like (?!(?:${FILLERS.likeNot})\b)(?=[a-z])`, 'gi'), ''],
  // ...and straight after 'to' ("I want to like die", "I wanna like end it");
  // 'I want to like him' and 'I'd like to' stay.
  [new RegExp(F`(?<=\b(?:to|wanna|gonna|gotta) )like (?!(?:${FILLERS.likeNot})\b)(?=[a-z])`, 'gi'), ''],
  // ...after 'be' ("I'd rather be like dead", "never been like born") and
  // before 'forever' ("disappear like forever"); 'be like him' stays.
  [new RegExp(F`(?<=\b(?:be|been|being) )like (?!(?:${FILLERS.likeNot})\b)(?=[a-z])`, 'gi'), ''],
  [/(?<=[a-z] )like (?=for ?ever\b)/gi, ''],
  // 'keep on hurting me' → 'keep hurting me' (the lexicon knows 'keeps hurting', 'keep cutting')
  [/\b(keep|keeps|kept|keeping) on (?=[a-z]+ing\b)/gi, '$1 '],
  [new RegExp(F`\b(?:keep|keeps|kept|keeping|start|starts|started|starting|began|begun) (${Object.keys(FILLERS.wishIng).join('|')})\b`, 'gi'), (_, ing) => FILLERS.wishIng[ing.toLowerCase()]],
  // "she's started hitting me", 'he has started to hit me' → 'she started hitting me'
  [new RegExp(F`(?<=[a-z])(?:'s|'ve|'re|'m| has| have| had| is| are| was| were| am)(?= (?:start|starts|started|starting|began|begun) (?:to (?:${FORCE_BASE})|(?:${FORCE_ING})) me\b)`, 'gi'), ''],
  [new RegExp(F`\b(?:keep|keeps|kept|keeping) (${FORCE_ING})(?= me\b)`, 'gi'), (_, ing) => forceFromIng(ing)],
  [new RegExp(F`\b(?:start|starts|started|starting|began|begun) (?:to (${FORCE_BASE})|(${FORCE_ING}))(?= me\b)`, 'gi'),
    (_, base, ing) => (base ? FILLERS.force[base.toLowerCase()] : forceFromIng(ing))],
  [/\b(?:start|starts|started|starting) to (?=[a-z])/gi, ''],
  [new RegExp(F`\b(my|your|his|her|their|our) (${Object.keys(FILLERS.short).join('|')})\b`, 'gi'), (_, who, w) => `${who} ${FILLERS.short[w.toLowerCase()]}`],
  // 'like' for 'about' before an amount: 'I took like a whole bottle of my pills'
  [/(?<=\b(?:took|taken|take|taking|swallowed|swallow|swallowing|downed|necked|had) )like (?=(?:a|an|all|about|half|the|loads|lots|twenty|thirty|forty|fifty|a hundred|[0-9]+)\b)/gi, ''],
];

/**
 * The tidied text without filler words, for the second pass. Only ever
 * deletes words (and turns 'keeps hitting' into 'hits', 'my bf' into 'my
 * boyfriend'); negations stay.
 * @param {string} tidied
 */
export function fillerFreeCopy(tidied) {
  let c = String(tidied ?? '');
  for (const [re, to] of FILLER_STEPS) c = typeof to === 'string' ? c.replace(re, to) : c.replace(re, to);
  return c.replace(/ {2,}/g, ' ').trim();
}

// Words for the scope of a negation (SECOND_PASS below; the same on both sides).
const NEG_WORDS = F`not|never|no|nor|cannot|[a-z]+n't|dont|didnt|doesnt|wont|wouldnt|cant|couldnt|shouldnt|isnt|wasnt|arent|werent|aint|hasnt|havent|hadnt|mustnt`;
const AUX_WORDS = F`am|is|are|was|were|be|been|being|do|does|did|would|will|could|can|should|might|must|may|shall|has|have|had`;
const ADV_WORDS = F`necessarily|truly|personally|exactly|particularly|definitely|certainly|really|actually|honestly|seriously|genuinely|totally|completely|entirely|literally|usually|normally|currently|technically|specifically|consciously|deliberately|intentionally|ever|even|quite|so|too|yet|at all`;
const PERSON_WORDS = F`${FILLERS.subject}|anyone|anybody|everyone|everybody|people`;

// Kept identical to the app's SECOND_PASS (compared by test/safety-fillers.test.js).
/**
 * @type {Readonly<{ guards: readonly string[], negation: string, npi: string, clauseBreak: string, openEnd: string,
 *   scopeNegation: string, person: string, between: string, tight: string, negSubjectGap: string, inversion: string,
 *   frame: string, stance: string, firstPerson: string, unless: string, carry: string }>}
 */
export const SECOND_PASS = Object.freeze({
  // Idioms that only need blanking once fillers are gone: 'she just hit me up'
  // is a message, not a blow. (The first pass is left exactly as it was.)
  guards: Object.freeze([
    F`\b(?:hit|hits|hitting) (?:me|us) up\b(?! (?:against|the (?:side|back|front|head|face)|side|round|around|across)\b)`,
    F`\b(?:hit|hits) (?:me|us) back (?:with (?:an?|the|some|my|his|her|their) (?:answer|reply|response|quote|price|update|decision|text|message|email|call|date)|later|tomorrow|soon|about|on (?:this|that|it)|when (?:you|u|he|she|they|we|i)(?:'re|'s|'m|'ve)?(?: (?:are|is|am|was|were|have|has|had|get|gets|got|find|finds))? (?:free|ready|done|back|home|sure|able|out|a chance|a minute|a moment|a sec|the chance|time)|when (?:you|u|he|she|they|we|i) (?:can|know|knows|hear|hears|decide|decides|text|texts|message|messages|dm|dms|email|emails))\b`,
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
    F`\b(?:beat|beats|beating|beaten) (?:me|us) (?:at|in) (?:(?:a|the) )?(?:chess|tennis|table tennis|ping pong|cards|poker|football|golf|squash|badminton|basketball|netball|scrabble|monopoly|mario kart|fifa|games?|video games|everything|running|races?|arm wrestling|pool|darts|bowling|quizzes|trivia|maths|math|exams?|tests?)\b`,
    // words, not blows: 'she always attacks me in debates' (never in arguments
    // or meetings, where it can be a blow)
    F`\b(?:attack|attacks|attacked|attacking) (?:me|us) (?:in|during) (?:(?:a|the|every) )?(?:debates?|comments|reviews?|interviews?)\b`,
    F`\b(?:kick|kicks|kicked|kicking) (?:me|us) (?:out of|off) (?:the |our |my |a |his |her |their )?(?:group chat|group|chat|game|team|class|lesson|club|band|server|discord|call|meeting|squad|match|league|course|whatsapp|channel)\b`,
    // leaving a group or the internet, not life: 'I want to actually stop
    // existing online for a bit' (the shared rule's own exception, for the
    // server's extra rule)
    F`\b(?:stop existing|not exist(?:ing)?|cease to exist|stop being alive)(?= (?:online|on (?:social media|socials|the internet|instagram|insta|tiktok|twitter|facebook|snapchat|whatsapp|discord)|in (?:the|this|that|our|my) (?:group|chat|office|class|team))\b)`,
  ]),
  // Negation words inside a match (masked to see whether it steps over one).
  negation: F`\b(?:not|never|no|nobody|noone|nothing|none|nowhere|neither|nor|cannot|[a-z]+n't|dont|didnt|doesnt|wont|cant|isnt|wasnt|arent|werent|hasnt|havent|hadnt|shouldnt|wouldnt|couldnt|mustnt|aint)\b`,
  // A match that starts 'anyone' or 'who' is worded for a negation before it
  // ("I don't think anyone would ever really notice if I was gone"), so no
  // negation before it governs it.
  npi: F`^(?:anyone|anybody|any one|anything|who)\b`,
  // Where a clause ends in the tidied text: . ! ? ; … and every comma, and
  // before 'but', 'because', 'cos', 'and I' and 'so' + a subject.
  clauseBreak: F`(?:[!?;…]|\.(?!\d))+|,|\b(?:but|because|cos|coz)\b|\band(?= i\b)|\bso(?= (?:${PERSON_WORDS})(?![\w-]))`,
  // ...unless the comma or dots went with a filler after one of these
  // ("he... finally hit me", "I don't, like, really want to die").
  openEnd: F`(?:^|[^\w'])(?:${FILLERS.subject}|${FILLERS.helper}|${NEG_WORDS}|wanna|gonna|gotta)\s*$`,
  // The negations a clause can hold: fronted ones that can come before a
  // helper and its subject ("at no point did he"), negative subjects ("no one
  // is"), denials without a negation word ("I doubt", "it's a lie that") and
  // the plain ones.
  scopeNegation: F`(?<fronted>\b(?:at no (?:point|time|stage)|in no way|under no circumstances|by no means|not (?:once|one (?:single )?time|a single time|even once|ever)|never(?: once| ever)?|no (?:way|chance)|nor)\b)|(?<negsubj>\b(?:no[- ]?one|nobody|nothing|none|neither)\b(?: of (?:us|you|them|these|those|(?:my|the|his|her|their|our) [a-z]+)\b)?)|(?<denial>(?<!\b(?:no|don'?t|dont|do not|never|without(?: a| any)?|beyond(?: a| any)?) )\bdoubt(?:s|ed)?\b|\ba (?:total |complete |big )?lie\b|\b(?:untrue|false)\b(?= that\b))|(?<plain>\b(?:${NEG_WORDS}|nowhere)\b)`,
  // A subject: of the match when it starts with one, or the last one between
  // the negation and the match.
  person: F`(?<![\w'])(?:${PERSON_WORDS})(?![\w-])`,
  // What may stand between that subject and the match: helpers and adverbs.
  between: F`^(?:'(?:s|d|ll|m|re|ve))?(?: (?:${AUX_WORDS}|${ADV_WORDS}|going to|gonna|about to|still|also))*\s*$`,
  // With no subject in between, what may stand between a negation and the
  // match ("I don't necessarily want to really die")...
  tight: F`^(?: (?:${ADV_WORDS}|${AUX_WORDS}|have to|got to|want|wants|wanted|wanting|wanna|wish|wishes|wished|need|needs|needed|mean|means|meant|intend|intends|intended|plan|plans|planned|planning|try|tries|tried|trying|going|gonna|gotta|to|ready|about|hope|hoped|feel|felt|like|seem|seems|seemed))*\s*$`,
  // ...or a negative subject and the match ("nobody here is", "none of us
  // are"; never "nobody else is", which says someone is).
  negSubjectGap: F`^(?: (?:here|there|around|today|tonight|now|right now|in (?:here|there|(?:my|the|this|our|his|her|their) [a-z]+)|of (?:us|you|them|these|those|(?:my|the|his|her|their|our) [a-z]+)|${ADV_WORDS}|${AUX_WORDS}))*\s*$`,
  // A fronted negation, then a helper, then the subject ("never in my life
  // has he", "not one time has he", "in no way did he").
  inversion: F`^(?: (?:in|on|at|during|for|of|over|since|throughout|after|all|my|his|her|their|our|your|the|this|that|these|those|whole|entire|life|lives|relationship|marriage|years?|months?|weeks?|days?|nights?|times?|once|single|one|two|three|four|five|ten|twenty|[0-9]+|a|an|so|far|yet|ever|even|again))*? (?:${AUX_WORDS})\s*$`,
  // Denials straight before the subject, whoever says them: "it's not like",
  // "it isn't that", "it's not true that", "there's no chance", "no way",
  // "it's a lie that", "it's false that".
  frame: F`^(?:not (?:like|that|as if|as though|true|the case)|(?:is|was|are|were|ai)n'?t (?:like|that|as if|as though|true|the case)|no (?:way|chance)(?: in hell)?|a (?:total |complete |big )?lie|untrue|false)(?: that)?(?: (?:${ADV_WORDS}))*\s*$`,
  // ...and views, in the first person only (firstPerson): "I don't think",
  // "I didn't say", "I'm not saying", "I'm not sure", "I can't say", "I doubt"
  // (never "I can't believe", "the police didn't believe").
  stance: F`^(?:(?:not|never|don'?t|dont|didn'?t|didnt|doesn'?t|doesnt|wouldn'?t|wouldnt|won'?t|wont)(?: (?:${ADV_WORDS}))? (?:think|believe|reckon|mean|say|said|claim(?:ed)?|suggest(?:ed)?|suppose|imagine|expect|feel like)|not (?:(?:${ADV_WORDS}) )?(?:saying|suggesting|claiming|implying|sure|certain|convinced)|(?:can'?t|cant|cannot|couldn'?t|couldnt) say|doubt(?:s|ed)?)(?: that)?(?: (?:${ADV_WORDS}))*\s*$`,
  firstPerson: F`(?:^|[^\w'])(?:i|we)(?:'(?:m|d|ll|ve|re))?(?: (?:do|does|did|would|will|am|is|are|was|were|have|had|just|still|also|like|${ADV_WORDS}))*\s*$`,
  // ...unless it goes on to say it did happen, or who it is true of, within
  // four words: "he never hurt me until last year", "he'd never hit me
  // before", "never hit me again", "I've never wanted to die more than now",
  // "no one is in danger except me".
  unless: F`^(?:[^\w']+[\w']+){0,3}?[^\w']+(?:before|until|till|again|more than|so much|this much|as much as|except|apart from|other than|besides|but (?:me|us|him|her|them|my))\b`,
  // (straight after a comma or as 'but me' too: "he never really hurt me,
  // until last year", "no one is in danger but me")
  carry: F`^\s*,?\s*(?:until|till|before|but (?:me|us|him|her|them|my))\b`,
});

const SECOND = {
  guards: compile([...HARM_LEXICON.idiomGuards, ...EXTRA_LEXICON.idiomGuards, ...SECOND_PASS.guards], 'gi'),
};

// ------------------------------------ second pass: the scope of a negation --
// From this line to "end of the scope block" the text is the same in
// src/engine/safety.js and server/another-angle/src/safety/index.js (both
// tests compare it).
//
// A second-pass match does not count, at any level, when a negation in its
// own clause governs it. Clauses: the tidied text split at . ! ? ; … and
// commas, and before 'but', 'because', 'cos', 'and I' and 'so' + a subject
// (a comma or dots that only set off a filler inside a clause, as in "he...
// finally hit me" or "I don't, like, really want to die", and dots of
// hesitation after a subject, as in "I... don't think", do not split it).
// In that clause a negation governs the match when:
//   - only helpers, adverbs and verbs such as 'want to' stand between them
//     ("I don't necessarily want to really die"), or it is the match's own
//     subject ("no one here is really in danger", "none of us are");
//   - it is fronted before the match's subject ("at no point did he
//     actually hit me", "never in my life has he", "not one time has he");
//   - or it denies what follows it, straight before the subject ("it isn't
//     that he really hit me", "there's no chance he would", "it's a lie
//     that"), and in the first person when it is someone's view ("I don't
//     think", "I'm not saying", "I doubt"; never "the police didn't believe
//     he really hit me").
// Anything else in between, above all a new subject with its own verb,
// starts a thought the negation does not reach, and the match counts ("I
// don't know why I want to really die", "I can't stop thinking I want to
// actually die", "I don't think anyone knows he always hits me", "it's not
// just that he actually hit me"). So do matches worded for a negation before
// them ('anyone would notice if I was gone') and negations the phrase spells
// out itself ("don't feel safe", "nobody would miss me"). A match that only
// fits by stepping over a negation ("he never really hurt me") is governed
// too. A governed match counts again when before / until / till / again,
// a comparison or an exception comes within four words after it in its
// clause, or before / until / till straight after a comma ("he never really
// hurt me until last year", "...hurt me again", "..., until last year", "I've
// never wanted to really die more than now", "no one is actually in danger
// except me", "...but me").
const SCOPE = {
  negation: new RegExp(SECOND_PASS.negation, 'gi'),
  npi: new RegExp(SECOND_PASS.npi, 'i'),
  clauseBreak: new RegExp(SECOND_PASS.clauseBreak, 'gi'),
  openEnd: new RegExp(SECOND_PASS.openEnd, 'i'),
  token: new RegExp(SECOND_PASS.scopeNegation, 'gi'),
  anyToken: new RegExp(SECOND_PASS.scopeNegation, 'i'),
  person: new RegExp(SECOND_PASS.person, 'gi'),
  leadPerson: new RegExp(`^${SECOND_PASS.person}`, 'i'),
  between: new RegExp(SECOND_PASS.between, 'i'),
  tight: new RegExp(SECOND_PASS.tight, 'i'),
  negSubjectGap: new RegExp(SECOND_PASS.negSubjectGap, 'i'),
  inversion: new RegExp(SECOND_PASS.inversion, 'i'),
  frame: new RegExp(SECOND_PASS.frame, 'i'),
  stance: new RegExp(SECOND_PASS.stance, 'i'),
  firstPerson: new RegExp(SECOND_PASS.firstPerson, 'i'),
  unless: new RegExp(SECOND_PASS.unless, 'i'),
  carry: new RegExp(SECOND_PASS.carry, 'i'),
  hesitation: /^(?:\.{2,}|…)+$/,
  pause: /\s*(?:\.{2,}|…|—|–|--)+\s*/g,
  /** @type {Map<RegExp, RegExp>} */
  sticky: new Map(),
  /** @type {Map<RegExp, RegExp>} */
  global: new Map(),
};

/**
 * One step of fillerFreeCopy that also keeps, for every character, its index
 * in the tidied text (a replacement points at the start of what it replaced).
 * @param {string} s @param {number[]} map @param {RegExp} re
 * @param {string | ((m: string, ...groups: string[]) => string)} to
 * @returns {[string, number[]]}
 */
function replaceTracked(s, map, re, to) {
  /** @type {number[]} */
  const out = [];
  let last = 0;
  const text = s.replace(re, (/** @type {any[]} */ ...args) => {
    let i = args.length - 1;
    if (typeof args[i] === 'object') i--;
    const match = String(args[0]);
    const offset = Number(args[i - 1]);
    const groups = args.slice(1, i - 1);
    const rep = typeof to === 'function' ? to(match, ...groups) : to.replace(/\$(\d)/g, (_, d) => groups[Number(d) - 1] ?? '');
    for (let k = last; k < offset; k++) out.push(map[k]);
    for (let k = 0; k < rep.length; k++) out.push(map[offset] ?? map[map.length - 1] ?? 0);
    last = offset + match.length;
    return rep;
  });
  for (let k = last; k < s.length; k++) out.push(map[k]);
  return [text, out];
}

/**
 * fillerFreeCopy(tidied) and, for each of its characters, where it was in
 * the tidied text.
 * @param {string} tidied
 * @returns {{ text: string, map: number[] }}
 */
export function fillerFreeCopyMapped(tidied) {
  let s = String(tidied ?? '');
  /** @type {number[]} */
  let map = [];
  for (let i = 0; i < s.length; i++) map.push(i);
  for (const [re, to] of FILLER_STEPS) [s, map] = replaceTracked(s, map, re, to);
  [s, map] = replaceTracked(s, map, / {2,}/g, ' ');
  const lead = s.length - s.trimStart().length;
  const end = s.trimEnd().length;
  return { text: s.slice(lead, end), map: map.slice(lead, end) };
}

/**
 * The clause of every character of the copy, counted in the tidied text.
 * @param {string} tidied @param {string} copy @param {number[]} map
 */
function clausesOf(tidied, copy, map) {
  const kept = new Uint8Array(tidied.length);
  for (let i = 0; i < copy.length; i++) if (copy[i] !== ' ') kept[map[i]] = 1;
  const cut = new Uint8Array(tidied.length);
  for (const b of tidied.matchAll(SCOPE.clauseBreak)) {
    const k = b.index ?? 0;
    let removed = true;
    for (let j = k; j < k + b[0].length; j++) if (kept[j]) { removed = false; break; }
    // punctuation that went with a filler, and dots of hesitation, are inside a
    // clause when what comes before is a subject, a helper, a negation or 'to'
    // ("he... finally hit me", "I... don't think he would")
    if (removed || SCOPE.hesitation.test(b[0])) {
      let a = k;
      while (removed && a > 0 && !kept[a - 1]) a--;
      if (SCOPE.openEnd.test(tidied.slice(0, a))) continue;
    }
    cut[k] = 1;
  }
  const of = new Int32Array(tidied.length);
  for (let i = 0, id = 0; i < tidied.length; i++) of[i] = (id += cut[i]);
  const clause = new Int32Array(copy.length);
  for (let i = 0; i < copy.length; i++) clause[i] = of[map[i]];
  return clause;
}

/**
 * The clauses of the copy of `tidied`, or one clause for all of it if the
 * mapped copy is not `copy` (it always is; the tests check it).
 * @param {string} tidied @param {string} copy
 */
function scopeOf(tidied, copy) {
  const { text, map } = fillerFreeCopyMapped(tidied);
  return text === copy ? clausesOf(tidied, text, map) : new Int32Array(copy.length);
}

/**
 * Whether the negation `n` (in `head`, the match's clause up to the match)
 * governs the match `found`.
 * @param {string} head @param {RegExpMatchArray} n @param {string} found
 */
function governs(head, n, found) {
  const g = n.groups || {};
  const ns = n.index ?? 0;
  const ne = ns + n[0].length;
  const gap = head.slice(ne);
  // the match's subject: its own first word, or the last one before it
  let sp = -1;
  let se = -1;
  if (SCOPE.leadPerson.test(found)) sp = se = head.length;
  else for (const s of gap.matchAll(SCOPE.person)) { sp = ne + (s.index ?? 0); se = sp + s[0].length; }
  if (sp < 0) return (g.negsubj ? SCOPE.negSubjectGap : SCOPE.tight).test(gap);
  if (!SCOPE.between.test(head.slice(se))) return false;
  if (g.fronted && SCOPE.inversion.test(head.slice(ne, sp))) return true;
  const pre = head.slice(ns, sp);
  if (g.negsubj) return false;
  if (SCOPE.frame.test(pre)) return true;
  return SCOPE.stance.test(pre) && SCOPE.firstPerson.test(head.slice(0, ns));
}

/**
 * Whether a negation in the match's own clause governs it.
 * @param {string} text @param {RegExpExecArray} m @param {() => Int32Array} scope
 */
function negatedInClause(text, m, scope) {
  if (!SCOPE.anyToken.test(text.slice(0, m.index))) return false;
  const clause = scope();
  const c = clause[m.index];
  let cs = m.index;
  while (cs > 0 && clause[cs - 1] === c) cs--;
  // dots and dashes of hesitation read as a space ("never... has he")
  const head = text.slice(cs, m.index).replace(SCOPE.pause, ' ');
  SCOPE.token.lastIndex = 0;
  for (const n of head.matchAll(SCOPE.token)) if (governs(head, n, m[0])) return true;
  return false;
}

/**
 * before / until / till / again, a comparison or an exception within four
 * words after the match, in its clause (or straight after a comma, or 'but
 * me'): "he never really hurt me until last year", "...except me".
 * @param {string} text @param {RegExpExecArray} m @param {() => Int32Array} scope
 */
function happenedAfter(text, m, scope) {
  const end = m.index + m[0].length;
  if (!SCOPE.unless.test(text.slice(end))) return false;
  const clause = scope();
  let q = end;
  while (q < text.length && clause[q] === clause[end - 1]) q++;
  if (SCOPE.carry.test(text.slice(q))) {
    const next = clause[q];
    while (q < text.length && clause[q] === next) q++;
  }
  return SCOPE.unless.test(text.slice(end, q));
}

/**
 * Whether a second-pass match leans on a negation: one in its clause governs
 * it, or it only fits by stepping over one (the match still fits with the
 * negation masked out: "he never hurt me" fits '<person> <any word> hurt
 * me'). A negation the phrase itself spells out ("don't feel safe", "nobody
 * would miss me") is the phrase, not a denial of it.
 * @param {RegExp} re @param {string} text @param {RegExpExecArray} m @param {() => Int32Array} scope
 */
function leansOnNegation(re, text, m, scope) {
  let leans = false;
  SCOPE.negation.lastIndex = 0;
  if (SCOPE.negation.test(m[0])) {
    const end = m.index + m[0].length;
    const masked = text.slice(0, m.index) + m[0].replace(SCOPE.negation, (w) => 'x'.repeat(w.length)) + text.slice(end);
    let y = SCOPE.sticky.get(re);
    if (!y) SCOPE.sticky.set(re, (y = new RegExp(re.source, 'iy')));
    y.lastIndex = m.index;
    leans = y.test(masked);
  }
  if (!leans && !SCOPE.npi.test(m[0])) leans = negatedInClause(text, m, scope);
  return leans && !happenedAfter(text, m, scope);
}

/**
 * The first match of any of `regexes` in the copy that does not lean on a
 * negation, or null.
 * @param {RegExp[]} regexes @param {string} text @param {() => Int32Array} scope
 */
function secondPassHit(regexes, text, scope) {
  for (const re of regexes) {
    if (!re.test(text)) continue; // the usual case, and as cheap as the first pass
    let g = SCOPE.global.get(re);
    if (!g) SCOPE.global.set(re, (g = new RegExp(re.source, 'gi')));
    g.lastIndex = 0;
    for (let m = g.exec(text); m; m = g.exec(text)) {
      if (!m[0]) { g.lastIndex++; continue; }
      if (!leansOnNegation(re, text, m, scope)) return m[0];
    }
  }
  return null;
}
// ------------------------------------------------- end of the scope block --

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
  // the clauses of the copy, worked out once and only when a match needs them
  /** @type {Int32Array | null} */
  let clauses = null;
  const scope = () => clauses || (clauses = scopeOf(t, copy));
  const second = classify(copy, (regexes, s) => secondPassHit(regexes, s, scope), SECOND.guards, first.level);
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
 * @param {(regexes: RegExp[], text: string) => unknown} hitIn
 * @param {RegExp[]} guards
 * @param {SafetyResult['level']} [floor]
 * @returns {SafetyResult}
 */
function classify(t, hitIn, guards, floor = 'none') {
  for (const re of guards) t = t.replace(re, (m) => ' '.repeat(m.length));
  let self = t;
  for (const re of RULES.otherSpans) self = self.replace(re, (m) => ' '.repeat(m.length));
  if (hitIn(RULES.crisis, self)) return { level: 'crisis', category: 'self-harm' };
  if (hitIn(RULES.crisisOther, t)) return { level: 'crisis', category: 'someone-in-danger' };
  if (RANK[floor] >= RANK.care) return { level: 'none', category: null };
  for (const [category, regexes] of RULES.care) if (hitIn(regexes, t)) return { level: 'care', category };
  if (RANK[floor] >= RANK.concern) return { level: 'none', category: null };
  if (hitIn(RULES.concern, t)) return { level: 'concern', category: 'distress' };
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
