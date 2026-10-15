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
// isn't that he really hit me", "no one at home is actually in danger") does
// not count; a double negation or a past view does not govern it ("not a day
// goes by that I don't want to actually die"). FILLERS, SECOND_PASS,
// fillerFreeCopy and the scope block below are kept identical to the app's
// (test/safety-fillers.test.js compares them).

import { HARM_LEXICON, HARM_COPY, CONCERN_LEXICON } from './shared-lexicon.js';
import { EXTRA_LEXICON, GENERAL_CARE } from './extra-lexicon.js';
import { riskScreen, normalise } from './risk-screen.js';

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
  // negation and a denial: "it's not just that he hit me" says that he did,
  // and so do "that doesn't just mean" and "I'm not just saying".
  free: F`(?<!\b(?:not|[a-z]+n't|dont|didnt|doesnt|isnt|wasnt|arent|werent|aint|wont|cant) )just|just(?! (?:that|like|as if|as though|mean|means|meant|saying|say|said|because|cos|coz)\b)|finally|finaly|actually|really|realy|rly|literally|basically|totally|honestly|genuinely|always|sometimes|often|also|then|still|kinda|sorta|even(?! (?:though|so)\b)|(?<!\bfor )ever(?! (?:again|since|after)\b)|(?<!\b(?:a|an|the|what|this|that|these|those|any|some|every|which|my|your|his|her|our|their|no|one|same|its) )(?:kind|sort) of`,
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
const NEG_WORDS = F`not|never|no|nor|cannot|[a-z]+n't|dont|didnt|doesnt|wont|wouldnt|cant|couldnt|shouldnt|isnt|wasnt|arent|werent|aint|hasnt|havent|hadnt|mustnt|dnt|dont't|doesnt't|didnt't`;
const AUX_WORDS = F`am|is|are|was|were|be|been|being|do|does|did|would|will|could|can|should|might|must|may|shall|has|have|had`;
const ADV_WORDS = F`necessarily|truly|personally|exactly|particularly|definitely|certainly|really|actually|honestly|seriously|genuinely|totally|completely|entirely|literally|usually|normally|currently|technically|specifically|consciously|deliberately|intentionally|ever|even|quite|so|too|yet|at all`;
// Who can be a subject: the fillers' people, 'anyone', 'people', and family
// and friends in the plural ("my kids", "the baby").
const PERSON_WORDS = F`${FILLERS.subject}|anyone|anybody|everyone|everybody|people|(?:my|our|his|her|their|your|the|[a-z]+'s) (?:kids|children|parents|friends|brothers|sisters|sons|daughters|siblings|cousins|grandparents|family|flatmates|housemates|roommates|classmates|neighbou?rs|baby|babies)`;
// A word in a noun phrase or after a preposition: never a helper, a
// negation, a pronoun, a joiner or a verb of knowing or saying.
const WORD = F`(?:(?!(?:${AUX_WORDS}|${NEG_WORDS}|i|he|she|we|they|you|it|me|him|us|them|and|or|but|if|when|that|who|which|because|so|to|of|for|about|than|then|what|why|how|where|want|wants|wanna|know|knows|think|thinks|say|says|said|tell|tells|told)\b)[a-z]+(?:'s)?)`;
// Where someone is: 'here', 'at home', 'on the trip', 'around me', 'at my mum's house'.
const LOC = F`(?:here|there|nearby|around (?:here|me|us|him|her|them)|(?:at|in|on|near|from|inside|outside|with|around) (?:(?:the|my|our|his|her|their|your|this|that|a|an) )?${WORD}(?: ${WORD})?)`;
// A noun phrase: 'my kids', 'the baby', 'my little brother' (never "it's", "that's").
const NP = F`(?:(?:my|our|his|her|their|your|the|this|that|these|those|both|all|some|most|many|(?!(?:it|that|there|what|he|she|who|here|where|how|this)'s)[a-z]+'s) ${WORD}(?: ${WORD})?)`;
const HELPERS = F`${AUX_WORDS}|going to|gonna|about to|still|also`;

// Kept identical to the app's SECOND_PASS (compared by test/safety-fillers.test.js).
/**
 * @type {Readonly<{ guards: readonly string[], negation: string, npi: string, clauseBreak: string, openEnd: string, viewEnd: string,
 *   frontOnly: string, scopeNegation: string, person: string, subject: string, helper: string, helperLead: string, predicate: string, self: string,
 *   tight: string, negSubjectGap: string, inversion: string, frame: string, because: string, stance: string, firstPerson: string,
 *   clauseStart: string, believe: string, shock: string, outer: string, unless: string, until: string, wish: string, pastNeg: string,
 *   carry: string }>}
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
  negation: F`\b(?:not|never|no|nobody|noone|nothing|none|nowhere|neither|nor|cannot|[a-z]+n't|dont|didnt|doesnt|wont|cant|isnt|wasnt|arent|werent|hasnt|havent|hadnt|shouldnt|wouldnt|couldnt|mustnt|aint|dnt)\b`,
  // A match that starts 'anyone' or 'who' is worded for a negation before it
  // ("I don't think anyone would ever really notice if I was gone"), so no
  // negation before it governs it.
  npi: F`^(?:anyone|anybody|any one|anything|who)\b`,
  // Where a clause ends in the tidied text: . ! ? ; … and every comma, and
  // before 'but', 'and I', 'so' + a subject, and 'because' / 'cos' (but not
  // "it's not because", which denies what follows it).
  clauseBreak: F`(?:[!?;…]|\.(?!\d))+|,|\bbut\b|(?<!\b(?:not|isn'?t|isnt|wasn'?t|wasnt|ain'?t|aint)(?: (?:really|actually|honestly|necessarily|entirely|totally|simply|purely|literally|even))* )\b(?:because|cos|coz|cuz)\b|\band(?= i\b)|\bso(?= (?:${PERSON_WORDS})(?![\w-]))`,
  // ...unless the comma or dots went with a filler after one of these
  // ("he... finally hit me", "I don't, like, really want to die")...
  openEnd: F`(?:^|[^\w'])(?:${FILLERS.subject}|${FILLERS.helper}|${NEG_WORDS}|wanna|gonna|gotta)\s*$`,
  // ...or a filler set off by commas went after a view ("I don't think, like,
  // I want to really die" reads as "I don't think I want to really die")...
  viewEnd: F`(?:^|[^\w'])(?:think|believe|reckon|suppose|guess|mean|say|saying|said|doubt)\s*$`,
  // ...or the comma comes after a fronted negation alone ("never, not once,
  // has he").
  frontOnly: F`^[\s,.…—–-]*(?:(?:never(?: once| ever)?|not (?:once|ever|even once|one (?:single )?time|a single time)|at no (?:point|time|stage)|in no way|by no means|under no circumstances|ever|once)[\s,.…—–-]*)+$`,
  // The negations a clause can hold: fronted ones that can come before a
  // helper and its subject ("at no point did he"), negative subjects ("no one
  // is"), denials without a negation word ("I doubt", "it's a lie that") and
  // the plain ones.
  scopeNegation: F`(?<fronted>\b(?:at no (?:point|time|stage)|in no way|under no circumstances|by no means|not (?:once|one (?:single )?time|a single time|even once|ever)|never(?: once| ever)?|no (?:way|chance)|nor)\b)|(?<negsubj>\b(?:no[- ]?one|nobody|nothing|none|neither)\b(?: of (?:us|you|them|these|those|(?:my|the|his|her|their|our) [a-z]+)\b)?)|(?<denial>(?<!\b(?:no|don'?t|dont|do not|never|without(?: a| any)?|beyond(?: a| any)?) )\bdoubt(?:s|ed)?\b|\ba (?:total |complete |big )?lie\b|\b(?:untrue|false)\b(?= that\b))|(?<plain>\b(?:${NEG_WORDS}|nowhere)\b)`,
  // A match that starts with its own subject ("he hit me").
  person: F`(?<![\w'])(?:${PERSON_WORDS})(?![\w-])`,
  // Otherwise the match's subject stands straight before it, with only helpers
  // and adverbs after it: a person ("I don't think he would"), a person and
  // where they are ("anyone at home is"), or a noun phrase ("the kids are");
  // the last two only before a helper (helper, helperLead).
  subject: F`(?<![\w'])(?:(?<person>${PERSON_WORDS})(?![\w-])(?<loc>(?: ${LOC})?)|(?<np>${NP}))(?<aux>(?:'(?:s|d|ll|m|re|ve))?(?: (?:${HELPERS}|${ADV_WORDS}))*)\s*$`,
  helper: F`^'(?:s|d|ll|m|re|ve)|\b(?:${AUX_WORDS})\b`,
  helperLead: F`^(?:'(?:s|d|ll|m|re|ve)|(?:${AUX_WORDS})\b)`,
  predicate: F`^(?:'(?:s|d|ll|m|re|ve)|(?:${AUX_WORDS}|want|wants|wanted|wanna|wish|wishes|wished|need|needs|needed|hope|hopes|hoped|mean|means|meant|plan|plans|planned|planning|try|tries|tried|trying|going|gonna|ready|about)\b)`,
  self: F`^(?:i|we)(?![\w-])`,
  // With no subject in between, what may stand between a negation and the
  // match ("I don't necessarily want to really die")...
  tight: F`^(?: (?:${ADV_WORDS}|${AUX_WORDS}|have to|got to|want|wants|wanted|wanting|wanna|wish|wishes|wished|need|needs|needed|mean|means|meant|intend|intends|intended|plan|plans|planned|planning|try|tries|tried|trying|going|gonna|gotta|to|ready|about|hope|hoped|feel|felt|like|seem|seems|seemed))*\s*$`,
  // ...or between a negative subject and the match: where they are, a short
  // relative clause, helpers ("nobody here is", "no one at home is", "no one
  // I know is", "nobody who lives here is", "none of us are"; never "nobody
  // else is", which says someone is), when the match is what the negative
  // subject does or is (predicate: never "no one at home life isn't worth
  // living").
  negSubjectGap: F`^(?: (?:${LOC}|(?:(?:who|that) )?(?:i|we|you) (?:know|love|care about|live with|work with)|(?:who|that) (?:lives?|lived|works?|worked|stays?|stayed|goes|went|is|was|are|were)|today|tonight|now|right now|of (?:us|you|them|these|those|(?:my|the|his|her|their|our) [a-z]+)|${ADV_WORDS}|${AUX_WORDS}))*\s*$`,
  // A fronted negation, then a helper, then the subject ("never in my life
  // has he", "never in all the time we've been together has he", "not one
  // time has he", "in no way did he"); never across a view or a joiner
  // ("never did I think he would").
  inversion: F`^,?(?: (?!(?:${NEG_WORDS}|think|thinks|thought|know|knows|knew|believe|believed|say|says|said|told|realised|realized|imagined|expected|guessed|feel|felt|and|but|or|so|because|if|when|where|why|how|what|then)\b)[a-z0-9']+,?){0,12}? (?:${AUX_WORDS})\s*$`,
  // Denials straight before the subject, whoever says them: "it's not like",
  // "it isn't that", "it's not true that", "there's no chance", "no way",
  // "it's a lie that", "it's false that", "that doesn't mean".
  frame: F`^(?:not (?:like|that|as if|as though|true|the case)|(?:is|was|are|were|ai)n'?t (?:like|that|as if|as though|true|the case)|no (?:way|chance)(?: in hell)?|a (?:total |complete |big )?lie|untrue|false|(?:does|do|did)(?:n'?t| not)(?: (?:${ADV_WORDS}))? mean)(?: that)?(?: (?:${ADV_WORDS}))*\s*$`,
  // "It's not because I want to die" denies it in the first person only ("it's
  // not because he hits me" says he does).
  because: F`^(?:not|(?:is|was|ai)n'?t)(?: (?:${ADV_WORDS}))* (?:because|cos|coz|cuz)(?: (?:${ADV_WORDS}))*\s*$`,
  // ...and views, in the first person (firstPerson) or with no subject at the
  // start of a clause (clauseStart): "I don't think", "I don't want you to
  // think", "I didn't say", "I'm not saying", "I'm not trying to say", "I
  // don't mean to say", "I'm not telling you", "please don't think", "not
  // saying", "I'm not sure", "I can't say", "I doubt". A view of what one
  // thinks or believes is in the present only ("I didn't think he would hurt
  // me" says he did); never "I can't believe", "the police didn't believe".
  stance: F`^(?:(?:don'?t|dont|do not|doesn'?t|doesnt|does not|wouldn'?t|wouldnt|would not)(?: (?:${ADV_WORDS}))? (?:think|believe|reckon|suppose|imagine|expect|guess|feel like)|(?:not|never|don'?t|dont|do not|doesn'?t|doesnt|does not|didn'?t|didnt|did not|wouldn'?t|wouldnt|would not|won'?t|wont)(?: (?:${ADV_WORDS}))? (?:mean|meant|say|said|claim(?:ed)?|suggest(?:ed)?|imply|implied)(?: to (?:say|suggest|imply|sound like))?|(?:don'?t|dont|do not|didn'?t|didnt|did not)(?: (?:${ADV_WORDS}))? want (?:you|people|anyone|anybody|everyone|everybody|them|him|her|(?:my|the|his|her|their|our) [a-z]+) to (?:think|believe|assume|imagine|worry)|not (?:(?:${ADV_WORDS}) )?(?:saying|suggesting|claiming|implying|sure|certain|convinced)|not (?:(?:${ADV_WORDS}) )?(?:trying|going|meaning) to (?:say|suggest|claim|imply|make out)|not (?:(?:${ADV_WORDS}) )?telling (?:you|anyone|anybody|people|them|him|her|everyone|my [a-z]+)|(?:can'?t|cant|cannot|couldn'?t|couldnt) say|doubts?)(?: that)?(?: (?:${ADV_WORDS}))*\s*$`,
  firstPerson: F`(?:^|[^\w'])(?:i|we)(?:'(?:m|d|ll|ve|re))?(?: (?:do|does|did|would|will|am|is|are|was|were|have|had|just|still|also|like|${ADV_WORDS}))*\s*$`,
  clauseStart: F`^[\s,.;:!?…—–-]*(?:(?:please|pls|plz|and|but|so|just|honestly|look|listen|ok|okay|um|uh|well)[\s,]+)*$`,
  // "I still don't believe he hit me" is shock that he did, not a denial
  // (shock is read in the tidied clause, where 'still' has not been removed).
  believe: F`\bbeliev`,
  shock: F`\bstill (?:just )?(?:don'?t|dont|do not) (?:really |honestly )?believe\b`,
  // A negation inside a clause after an outer one is a double negation, and
  // tells it: "not a day goes by that I don't", "I can't remember a day I
  // didn't", "there isn't a night I don't".
  outer: F`\b(?:not|never) (?:a|one|a single) (?:day|night|morning|moment|minute|hour|week|time)\b|\bno (?:day|night|moment|morning)\b|\b(?:can'?t|cant|cannot|couldn'?t|couldnt|don'?t|dont|do not) (?:remember|recall|think of) (?:a|one|the last|any) (?:day|night|time|moment|morning)\b|\bthere(?:'s| is| was|'s been| has been| have been) (?:not|never|no)(?: (?:a|one|a single))? (?:day|night|time|moment|morning)\b|\bthere (?:isn'?t|isnt|wasn'?t|wasnt|hasn'?t been|hasnt been) (?:a|one|a single) (?:day|night|time|moment|morning)\b|\b(?:hardly|barely|scarcely) (?:a|any|one) (?:day|night|time|moment)\b`,
  // A governed match still counts when, within four words after it, the
  // sentence says it did happen, how much, or who it is true of: "...hurt me
  // again", "I've never wanted to die more than now / like I do tonight / so
  // badly / the way I do now", "it's not like he hit me hard", "no one is in
  // danger except me / but me / but my mum", "I'm not saying he really hit
  // me, but he did", "I don't want to really die but I do" (never "any more
  // than you do", "so much as", "but my mum thinks so").
  unless: F`^(?:[^\w']+[\w']+){0,3}?[^\w']+(?:again|(?<!\bany )more|so much(?! as\b)|this much|that much|as much as|(?:like|the way) (?:i|we|you|he|she|they) (?:do|does|did|am|is|are|was|were|have|has|had)|(?:so|this|that|too|very) bad(?:ly)?|as bad(?:ly)? as|badly|(?:so |that |too |very )?hard|every (?:day|night|time|week)|all the time|except|apart from|other than|but (?:me|us|him|her|them)|but (?:my|his|her|their|our|the) ${WORD}(?: (?:and (?:my |his |her |their |our |the )?)?${WORD})?(?=\s*(?:$|[^\w\s']))|but (?:(?:i|he|she|they|we|it|you|part of me|some of me|my ${WORD}) )?(?:still )?(?:do|does|did|has|have|had|was|were|is|am|would|will)(?: (?:too|anyway|sometimes|now|though|still|again))?(?=\s*(?:$|[^\w\s'])))(?![\w'])`,
  // ...and before / until / till say it happened after all ("he never hurt me
  // until last year", "I never wanted to die until now"), but not after a wish
  // in the present ("I don't want to die before I see my kids grow up", "I
  // never want to die before my mum does"): see wish and pastNeg.
  until: F`^(?:[^\w']+[\w']+){0,3}?[^\w']+(?:before|until|till|til)(?![\w'])`,
  wish: F`\b(?:want|wants|wanna|wish|wishes|hope|hopes)\b`,
  pastNeg: F`(?:^|[^\w'])(?:didn'?t|didnt|hadn'?t|hadnt|wasn'?t|wasnt|weren'?t|werent|(?:did|had|was|were) not)$`,
  // (straight after a comma or as 'but me' too: "he never really hurt me,
  // until last year", "no one is in danger but me")
  carry: F`^\s*,?\s*(?:until|till|til|before|but (?:me|us|him|her|them|my|his|her|their|our|the|i|he|she|they|we|it|you|part|some|still|do|does|did|has|have|had|was|were|is|am|would|will))(?![\w'])`,
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
// commas, and before 'but', 'and I', 'so' + a subject and 'because' / 'cos'
// (not after "it's not": "it's not because I want to die" is one thought). A
// comma or dots that only set off a filler ("he... finally hit me", "I
// don't, like, really want to die", "I don't think, like, I want to die"),
// dots of hesitation after a subject ("I... don't think") and the commas of
// a fronted negation ("never, not once, has he") do not split a clause.
// In that clause a negation governs the match when:
//   - only helpers, adverbs and verbs such as 'want to' stand between them
//     ("I don't necessarily want to really die");
//   - it is the match's own subject, with where they are or who they are
//     ("no one at home is really in danger", "no one I know is", "none of
//     the people at the party are");
//   - it is fronted before a helper and the match's subject ("at no point
//     did he actually hit me", "never in my life has he");
//   - or it denies what follows it, straight before the subject: whoever says
//     it ("it isn't that he really hit me", "there's no chance he would",
//     "that doesn't mean I want to die"), in the first person ("it's not
//     because I want to die"), or as the speaker's view ("I don't think the
//     kids are really in danger", "I don't want you to think I want to die",
//     "please don't think", "I doubt anyone here is").
// Anything else in between, above all a new subject with its own verb,
// starts a thought the negation does not reach, and the match counts ("I
// don't know why I want to really die", "I can't stop thinking I want to
// actually die", "I don't think anyone knows he always hits me", "it's not
// just that he actually hit me"). So do a double negation ("not a day goes
// by that I don't want to actually die"), a past view ("I didn't think I'd
// ever want to actually die"), matches worded for a negation before them
// ('anyone would notice if I was gone') and negations the phrase spells out
// itself ("don't feel safe", "nobody would miss me"). A match that only fits
// by stepping over a negation ("he never really hurt me") is governed too.
// A governed match counts again when, within four words after it in its
// clause, the sentence says it did happen, how much, or who it is true of
// ("...hurt me again", "I've never wanted to really die more than now / like
// I do tonight", "it's not like he hit me hard", "no one is actually in
// danger except me / but me"), or says before / until / till, except after a
// wish in the present ("he never really hurt me until last year" counts; "I
// don't want to actually die before I see my kids grow up" does not).
// Only the nearest negations, a few words back, are looked at, so long text
// stays cheap.
const SCOPE = {
  negation: new RegExp(SECOND_PASS.negation, 'gi'),
  npi: new RegExp(SECOND_PASS.npi, 'i'),
  clauseBreak: new RegExp(SECOND_PASS.clauseBreak, 'gi'),
  openEnd: new RegExp(SECOND_PASS.openEnd, 'i'),
  viewEnd: new RegExp(SECOND_PASS.viewEnd, 'i'),
  frontOnly: new RegExp(SECOND_PASS.frontOnly, 'i'),
  token: new RegExp(SECOND_PASS.scopeNegation, 'gi'),
  anyToken: new RegExp(SECOND_PASS.scopeNegation, 'i'),
  leadPerson: new RegExp(`^${SECOND_PASS.person}`, 'i'),
  subject: new RegExp(SECOND_PASS.subject, 'i'),
  helper: new RegExp(SECOND_PASS.helper, 'i'),
  helperLead: new RegExp(SECOND_PASS.helperLead, 'i'),
  predicate: new RegExp(SECOND_PASS.predicate, 'i'),
  self: new RegExp(SECOND_PASS.self, 'i'),
  tight: new RegExp(SECOND_PASS.tight, 'i'),
  negSubjectGap: new RegExp(SECOND_PASS.negSubjectGap, 'i'),
  inversion: new RegExp(SECOND_PASS.inversion, 'i'),
  frame: new RegExp(SECOND_PASS.frame, 'i'),
  because: new RegExp(SECOND_PASS.because, 'i'),
  stance: new RegExp(SECOND_PASS.stance, 'i'),
  firstPerson: new RegExp(SECOND_PASS.firstPerson, 'i'),
  clauseStart: new RegExp(SECOND_PASS.clauseStart, 'i'),
  believe: new RegExp(SECOND_PASS.believe, 'i'),
  shock: new RegExp(SECOND_PASS.shock, 'i'),
  outer: new RegExp(SECOND_PASS.outer, 'gi'),
  anyOuter: new RegExp(SECOND_PASS.outer, 'i'),
  unless: new RegExp(SECOND_PASS.unless, 'i'),
  until: new RegExp(SECOND_PASS.until, 'i'),
  wish: new RegExp(SECOND_PASS.wish, 'i'),
  pastNeg: new RegExp(SECOND_PASS.pastNeg, 'i'),
  carry: new RegExp(SECOND_PASS.carry, 'i'),
  hesitation: /^(?:\.{2,}|…)+$/,
  pause: /\s*(?:\.{2,}|…|—|–|--)+\s*/g,
  // how far back a negation can reach (characters of its clause), and how
  // many of the nearest ones are looked at for each match
  reach: 200,
  nearest: 6,
  /** @type {Map<RegExp, RegExp>} */
  sticky: new Map(),
  /** @type {Map<RegExp, RegExp>} */
  global: new Map(),
};

/** @typedef {{ start: number, end: number, norm: string, idx: Int32Array, tokens: RegExpMatchArray[], outers: number[] }} Clause */
/** @typedef {{ neg: string, gap: string }} Governor */
/**
 * @typedef {{ clause: Int32Array, map: number[] | null, tidied: string, text: string, hasNegation: boolean,
 *   clauses: Map<number, Clause>, governors: Map<string, Governor | null> }} Scope
 */

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
 * The text just before `a` (from a space, so no word is cut).
 * @param {string} s @param {number} a
 */
function tailBefore(s, a) {
  const from = a > 64 ? s.lastIndexOf(' ', a - 64) : 0;
  return s.slice(from < 0 ? 0 : from, a);
}

/**
 * The clause of every character of the copy, counted in the tidied text.
 * @param {string} tidied @param {string} copy @param {number[]} map
 */
function clausesOf(tidied, copy, map) {
  const kept = new Uint8Array(tidied.length);
  for (let i = 0; i < copy.length; i++) if (copy[i] !== ' ') kept[map[i]] = 1;
  const cut = new Uint8Array(tidied.length);
  let last = 0;
  for (const b of tidied.matchAll(SCOPE.clauseBreak)) {
    const k = b.index ?? 0;
    let removed = true;
    for (let j = k; j < k + b[0].length; j++) if (kept[j]) { removed = false; break; }
    // punctuation that went with a filler, and dots of hesitation, are inside a
    // clause when what comes before is a subject, a helper, a negation or 'to'
    // ("he... finally hit me", "I... don't think he would"), and punctuation
    // that went with a filler after a view too ("I don't think, like, I")
    if (removed || SCOPE.hesitation.test(b[0])) {
      let a = k;
      while (removed && a > 0 && !kept[a - 1]) a--;
      const before = tailBefore(tidied, a);
      if (SCOPE.openEnd.test(before) || (removed && SCOPE.viewEnd.test(before))) continue;
    }
    // "never, not once, has he": the commas of a fronted negation
    if (b[0] === ',' && SCOPE.frontOnly.test(tidied.slice(last, k))) continue;
    cut[k] = 1;
    last = k;
  }
  const of = new Int32Array(tidied.length);
  for (let i = 0, id = 0; i < tidied.length; i++) of[i] = (id += cut[i]);
  const clause = new Int32Array(copy.length);
  for (let i = 0; i < copy.length; i++) clause[i] = of[map[i]];
  return clause;
}

/**
 * The clauses of the copy of `tidied` (one clause for all of it if the
 * mapped copy is not `copy`; it always is, and the tests check it).
 * @param {string} tidied @param {string} copy
 * @returns {Scope}
 */
function scopeOf(tidied, copy) {
  const { text, map } = fillerFreeCopyMapped(tidied);
  const same = text === copy;
  return {
    clause: same ? clausesOf(tidied, text, map) : new Int32Array(copy.length), map: same ? map : null, tidied,
    text: '', hasNegation: false, clauses: new Map(), governors: new Map(),
  };
}

/**
 * Start `ctx` on `text` (the copy, or the copy with some spans blanked).
 * @param {Scope} ctx @param {string} text
 */
function useText(ctx, text) {
  if (ctx.text === text) return;
  ctx.text = text;
  ctx.hasNegation = SCOPE.anyToken.test(text);
  ctx.clauses = new Map();
  ctx.governors = new Map();
}

/**
 * The clause of `text` at `pos`: where it starts and ends, its words with
 * dots and dashes read as a space ("never... has he"), its negations and
 * where its double negations end. Worked out once per clause.
 * @param {Scope} ctx @param {string} text @param {number} pos
 * @returns {Clause}
 */
function clauseAt(ctx, text, pos) {
  useText(ctx, text);
  const c = ctx.clause[pos] ?? 0;
  const known = ctx.clauses.get(c);
  if (known) return known;
  let start = pos;
  while (start > 0 && ctx.clause[start - 1] === c) start--;
  let end = pos;
  while (end < text.length && ctx.clause[end] === c) end++;
  const raw = text.slice(start, end);
  const idx = new Int32Array(raw.length + 1);
  let norm = '';
  let last = 0;
  for (const p of raw.matchAll(SCOPE.pause)) {
    const k = p.index ?? 0;
    for (let j = last; j < k; j++) idx[j] = norm.length + j - last;
    norm += raw.slice(last, k);
    for (let j = k; j < k + p[0].length; j++) idx[j] = norm.length;
    norm += ' ';
    last = k + p[0].length;
  }
  for (let j = last; j <= raw.length; j++) idx[j] = norm.length + j - last;
  norm += raw.slice(last);
  const tokens = ctx.hasNegation ? [...norm.matchAll(SCOPE.token)] : [];
  const outers = ctx.hasNegation ? [...norm.matchAll(SCOPE.outer)].map((o) => (o.index ?? 0) + o[0].length) : [];
  const clause = { start, end, norm, idx, tokens, outers };
  ctx.clauses.set(c, clause);
  return clause;
}

/**
 * The subject of the match `found` in `head` (its clause up to the match):
 * its own first word, or what stands straight before it.
 * @param {string} head @param {string} found
 */
function subjectOf(head, found) {
  if (SCOPE.leadPerson.test(found)) return { start: head.length, lead: true, self: SCOPE.self.test(found) };
  const sp = head.length > 120 ? head.indexOf(' ', head.length - 120) : 0;
  const from = sp < 0 ? head.length : sp;
  const s = SCOPE.subject.exec(head.slice(from));
  const g = (s && s.groups) || {};
  // a noun phrase, or a person and where they are, only before a helper
  if (!s || ((g.np || g.loc) && !SCOPE.helper.test(g.aux || '') && !SCOPE.helperLead.test(found))) return { start: -1, lead: false, self: false };
  return { start: from + (s.index ?? 0), lead: false, self: SCOPE.self.test(g.person || '') };
}

/**
 * Whether the negation `n`, at `ns` in `at.head`, governs the match.
 * @param {RegExpMatchArray} n @param {number} ns
 * @param {{ head: string, found: string, subj: { start: number, lead: boolean, self: boolean }, outerEnd: number, cut: boolean, shock: () => boolean }} at
 */
function governs(n, ns, at) {
  const { head, subj } = at;
  const g = n.groups || {};
  const ne = ns + n[0].length;
  // "not a day goes by that I don't…": a double negation tells it
  if (at.outerEnd >= 0 && at.outerEnd <= ns) return false;
  const gap = head.slice(ne);
  if (g.negsubj) return !subj.lead && SCOPE.predicate.test(at.found) && SCOPE.negSubjectGap.test(gap);
  if (subj.start < ne) return SCOPE.tight.test(gap);
  if (g.fronted && SCOPE.inversion.test(head.slice(ne, subj.start))) return true;
  const pre = head.slice(ns, subj.start);
  if (SCOPE.frame.test(pre)) return true;
  if (SCOPE.because.test(pre)) return subj.self;
  if (!SCOPE.stance.test(pre)) return false;
  const before = head.slice(0, ns);
  if (!SCOPE.firstPerson.test(before) && (at.cut || !SCOPE.clauseStart.test(before))) return false;
  return !(SCOPE.believe.test(pre) && at.shock());
}

/**
 * The negation in the match's own clause that governs it, if any: the
 * nearest few, within reach.
 * @param {string} text @param {RegExpExecArray} m @param {() => Scope} scope
 * @returns {Governor | null}
 */
function governor(text, m, scope) {
  const ctx = scope();
  useText(ctx, text);
  if (!ctx.hasNegation) return null;
  // several rules can match the same words
  const key = `${m.index}:${m[0]}`;
  const known = ctx.governors.get(key);
  if (known !== undefined) return known;
  const gov = findGovernor(ctx, text, m);
  ctx.governors.set(key, gov);
  return gov;
}

/**
 * @param {Scope} ctx @param {string} text @param {RegExpExecArray} m
 * @returns {Governor | null}
 */
function findGovernor(ctx, text, m) {
  const cl = clauseAt(ctx, text, m.index);
  const hn = cl.idx[m.index - cl.start] ?? 0;
  const first = cl.tokens[0];
  if (!first || (first.index ?? 0) + first[0].length > hn) return null;
  let from = 0;
  if (hn > SCOPE.reach) {
    const sp = cl.norm.indexOf(' ', hn - SCOPE.reach);
    from = sp < 0 || sp > hn ? hn : sp;
  }
  const head = cl.norm.slice(from, hn);
  let outerEnd = -1;
  for (const e of cl.outers) if (e <= hn) outerEnd = e - from;
  const at = {
    head, found: m[0], subj: subjectOf(head, m[0]), outerEnd, cut: from > 0,
    shock: () => !!ctx.map && SCOPE.shock.test(ctx.tidied.slice(ctx.map[cl.start] ?? 0, ctx.map[m.index] ?? 0)),
  };
  /** @type {[RegExpMatchArray, number][]} */
  const near = [];
  for (let i = cl.tokens.length - 1; i >= 0 && near.length < SCOPE.nearest; i--) {
    const n = cl.tokens[i];
    const ns = (n.index ?? 0) - from;
    if (ns + n[0].length > head.length) continue;
    if (ns < 0) break;
    near.push([n, ns]);
  }
  for (let k = 0; k < near.length; k++) {
    const [n, ns] = near[k];
    if (!governs(n, ns, at)) continue;
    // ...unless an earlier negation in turn denies that one ("it's not that I
    // don't want to die", "that doesn't mean I don't", "never have I not";
    // never one said twice in a row, "I never never want to")
    const inner = head.slice(ns);
    const outerAt = { ...at, head: head.slice(0, ns), found: inner, subj: subjectOf(head.slice(0, ns), inner), shock: () => false };
    if (near.slice(k + 1).some(([o, os]) => /\S/.test(head.slice(os + o[0].length, ns)) && governs(o, os, outerAt))) continue;
    return { neg: head.slice(Math.max(0, ns - 6), ns + n[0].length), gap: head.slice(ns + n[0].length) };
  }
  return null;
}

/**
 * A double negation before the match in its clause ("not a day goes by
 * that he doesn't…"), for a match that steps over its own negation.
 * @param {string} text @param {RegExpExecArray} m @param {() => Scope} scope
 */
function outerBefore(text, m, scope) {
  if (!SCOPE.anyOuter.test(text.slice(Math.max(0, m.index - 4 * SCOPE.reach), m.index))) return false;
  const ctx = scope();
  const cl = clauseAt(ctx, text, m.index);
  const hn = cl.idx[m.index - cl.start] ?? 0;
  return cl.outers.some((e) => e <= hn && e >= hn - SCOPE.reach);
}

/**
 * Whether the sentence goes on to say it did happen, how much, or who it is
 * true of, within four words after the match in its clause (or straight
 * after a comma, or as 'but me'): "he never really hurt me until last year",
 * "...again", "...except me". Before / until / till do not count after a
 * wish in the present ("I don't want to die before 30").
 * @param {string} text @param {RegExpExecArray} m @param {() => Scope} scope @param {Governor} gov
 */
function happenedAfter(text, m, scope, gov) {
  const end = m.index + m[0].length;
  const rest = text.slice(end, end + 160);
  if (!SCOPE.unless.test(rest) && !SCOPE.until.test(rest) && !SCOPE.carry.test(rest)) return false;
  const ctx = scope();
  let q = clauseAt(ctx, text, end - 1).end;
  const carried = q < text.length ? SCOPE.carry.exec(text.slice(q, q + 40)) : null;
  if (carried) q = clauseAt(ctx, text, q + carried[0].length - 1).end;
  const after = text.slice(end, q);
  if (SCOPE.unless.test(after)) return true;
  if (!SCOPE.until.test(after)) return false;
  return SCOPE.pastNeg.test(gov.neg) || !SCOPE.wish.test(`${gov.gap} ${m[0]}`);
}

/**
 * Whether a second-pass match leans on a negation: one in its clause governs
 * it, or it only fits by stepping over one (the match still fits with the
 * negation masked out: "he never hurt me" fits '<person> <any word> hurt
 * me'). A negation the phrase itself spells out ("don't feel safe", "nobody
 * would miss me") is the phrase, not a denial of it.
 * @param {RegExp} re @param {string} text @param {RegExpExecArray} m @param {() => Scope} scope
 */
function leansOnNegation(re, text, m, scope) {
  /** @type {Governor | null} */
  let gov = null;
  SCOPE.negation.lastIndex = 0;
  const inner = SCOPE.negation.exec(m[0]);
  SCOPE.negation.lastIndex = 0;
  if (inner) {
    const end = m.index + m[0].length;
    const masked = text.slice(0, m.index) + m[0].replace(SCOPE.negation, (w) => 'x'.repeat(w.length)) + text.slice(end);
    let y = SCOPE.sticky.get(re);
    if (!y) SCOPE.sticky.set(re, (y = new RegExp(re.source, 'iy')));
    y.lastIndex = m.index;
    if (y.test(masked) && !outerBefore(text, m, scope)) gov = { neg: m[0].slice(0, (inner.index ?? 0) + inner[0].length), gap: '' };
  }
  if (!gov && !SCOPE.npi.test(m[0])) gov = governor(text, m, scope);
  return !!gov && !happenedAfter(text, m, scope, gov);
}

/**
 * The first match of any of `regexes` in the copy that does not lean on a
 * negation, or null.
 * @param {RegExp[]} regexes @param {string} text @param {() => Scope} scope
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
  /** @type {Scope | null} */
  let scoped = null;
  const scope = () => scoped || (scoped = scopeOf(t, copy));
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
  // The output check: its second-person rules and the first-person copies, twice.
  for (let i = 0; i < 2; i++) {
    outputHarm("You could tell your boss you'll beat your sister at chess, and nobody would miss you if you left early.");
    outputHarm('Your partner said you were late; maybe ask them what they meant.');
  }
}

/**
 * @typedef {{ level: 'care' | 'crisis', category: string, title: string, message: string,
 *   resources: readonly { readonly label: string, readonly detail: string }[], still_here: string, source: 'lexicon' | 'model' | 'screen' }} Support
 */

/**
 * The input checks before any model call, in order (15 Oct 2026, the risk screener): the lexicon on the words as typed; the
 * lexicon again on their normalised spelling (risk-screen.js normalise: "i wnat to dei", "k1ll myself", "d i e"); then the
 * shared risk screener (risk-screen.js, byte-identical with the app's src/beyond/risk-screen.js), which reads meaning, not
 * phrases. The most serious reading wins.
 *   → { level: 'none' | 'concern' | 'care' | 'crisis', category, source: 'lexicon' | 'screen' | null, check: boolean,
 *       lexicon_level, screen_level }
 *   check: the screener's 'check' (and nothing more serious): the model is still asked, told to judge safety first, and
 *   support is kept close. A client that skips its own check-in still meets the lexicon and the screener's care here.
 * @param {string} text
 */
export function screenInput(text) {
  const raw = checkSafety(text);
  let lex = raw;
  const norm = normalise(text);
  if (norm && norm !== tidyForSafety(text).toLowerCase()) {
    const again = checkSafety(norm);
    if (RANK[again.level] > RANK[lex.level]) lex = again;
  }
  const screen = riskScreen(text);
  const base = { lexicon_level: raw.level, screen_level: screen.level || 'none' };
  if (lex.level === 'crisis' || lex.level === 'care') return { ...lex, source: /** @type {const} */ ('lexicon'), check: false, ...base };
  if (screen.level === 'care') return { level: /** @type {const} */ ('care'), category: 'self-risk', source: /** @type {const} */ ('screen'), check: false, ...base };
  return { ...lex, source: lex.level === 'none' ? null : /** @type {const} */ ('lexicon'), check: screen.level === 'check', ...base };
}

/** The screener's care: someone may be thinking of ending their life (support, never an angle). */
const SELF_RISK_CARE = {
  title: 'This one needs real support',
  message: 'What you’ve written matters, and it sounds like you might be carrying something very heavy. You deserve support from someone who can be with you now. If you might act on these thoughts, call your local emergency number.',
};

/**
 * The authored support payload for a crisis/care result.
 * @param {'care' | 'crisis'} level
 * @param {string | null} category
 * @param {'lexicon' | 'model' | 'screen'} source
 * @returns {Support}
 */
export function supportPayload(level, category, source) {
  if (level === 'care' && category === 'self-risk') {
    return { level, category, title: SELF_RISK_CARE.title, message: SELF_RISK_CARE.message, resources: HARM_COPY.crisis.resources, still_here: HARM_COPY.stillHere, source };
  }
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
 *
 * Three readings of every visible field (15 Oct 2026, security review 2): the
 * lexicon on the words as written; the lexicon again on the same words turned
 * into the first person (firstPersonCopies: "you should hang yourself" → "I
 * should hang myself", "nobody would miss you" → "nobody would miss me"), so
 * harm aimed at the person reads as the person saying it; and OUTPUT_HARM,
 * second-person means, worthlessness and violence advice the first-person
 * lexicon has no words for ("take all of your pills", "stop eating for a few
 * days", "hit your boss hard"). Any hit: the pipeline gives the authored
 * fallback, never a regeneration that could word the same harm again.
 * Checked against every line the model has written in eval/runs and the
 * real-model run (test/output-harm.test.js): no rejections.
 * @param {Record<string, string>} scene
 * @param {readonly string[]} fields
 * @returns {boolean} true when the output is clean
 */
export function outputIsSafe(scene, fields) {
  for (const f of fields) if (outputHarm(scene[f] || '')) return false;
  return true;
}

/**
 * Whether one line the model wrote reads as harm (outputIsSafe). Never
 * returns the words.
 * @param {string} text
 * @returns {boolean}
 */
export function outputHarm(text) {
  const t = tidyForSafety(text);
  if (!t) return false;
  if (OUTPUT_HARM.some((re) => re.test(t))) return true;
  for (let copy of [t, ...firstPersonCopies(t)]) {
    for (const re of OUTPUT_GUARDS) copy = copy.replace(re, (m) => ' '.repeat(m.length));
    const r = checkSafety(copy);
    if (r.level === 'crisis' || r.level === 'care') return true;
  }
  return false;
}

// Games, not blows, once 'your sister' reads as 'my sister': "you'll beat
// your sister at Scrabble next time".
const OUTPUT_GUARDS = [
  /\b(?:beat|beats|beating|beaten|thrash|thrashing|smash|smashing|destroy|destroying) (?:[\w']+ ){1,3}(?:at|in) (?:a |the |your |my |their )?(?:\w+ )?(?:chess|cards|poker|tennis|table tennis|ping pong|football|golf|squash|badminton|scrabble|monopoly|mario kart|fifa|games?|video games|quiz|quizzes|trivia|darts|pool|bowling|races?|running|arm wrestling|exams?|tests?)\b/gi,
];

// Second person → first person, for the lexicon (written for the person's
// own words). 'you' is a subject ("you should", "you paused") or an object
// ("miss you", "without you there"); where the next word does not settle it,
// both readings are tried: one copy with 'I', one with 'me'.
/** @type {[RegExp, string][]} */
const FIRST_PERSON = [
  [/\byou(?:'re| are)\b/gi, "I'm"],
  [/\byoure\b/gi, "I'm"],
  [/\byou were\b/gi, 'I was'],
  [/\bare you\b/gi, 'am I'],
  [/\bwere you\b/gi, 'was I'],
  [/\byou've\b/gi, "I've"],
  [/\byou'll\b/gi, "I'll"],
  [/\byou'd\b/gi, "I'd"],
  [/\byourselves\b/gi, 'ourselves'],
  [/\byourself\b/gi, 'myself'],
  [/\byours\b/gi, 'mine'],
  [/\byour\b/gi, 'my'],
];

/**
 * The text in the first person, both ways 'you' can be read; [] when it has
 * no second person at all.
 * @param {string} tidied the text after tidyForSafety
 * @returns {string[]}
 */
export function firstPersonCopies(tidied) {
  if (!/\byou/i.test(tidied)) return [];
  let c = tidied;
  for (const [re, to] of FIRST_PERSON) c = c.replace(re, to);
  if (!/\byou\b/i.test(c)) return [c];
  /** @param {string} unsure @returns {string} */
  const read = (unsure) => c.replace(/\byou\b/gi, (_, at) => {
    const next = c.slice(at + 3);
    return YOU_SUBJECT.test(next) ? 'I' : YOU_OBJECT.test(next) ? 'me' : unsure;
  });
  const asI = read('I');
  const asMe = read('me');
  return asI === asMe ? [asI] : [asI, asMe];
}
// 'you' + a helper or a past tense is the subject ("you could", "you paused")...
const YOU_SUBJECT = /^ (?:am|are|were|was|have|had|has|do|did|does|don't|didn't|doesn't|dont|didnt|can|can't|cannot|could|couldn't|should|shouldn't|would|wouldn't|will|won't|might|must|may|need|needn't|ought|shall|[a-z]+ed)\b/i;
// ...and before the end, a stop or a word that never follows a subject, the object ("miss you", "tell you what")
const YOU_OBJECT = /^(?:\s*$|\s*[^\s\w']|\s+(?:to|for|with|at|in|on|about|from|off|up|out|down|back|over|again|too|there|here|if|when|so|because|that|anymore|tonight|today|tomorrow|a|an|the|this|these|those|some|any|what|how|why|much|more|less|enough|anyway|either|yet|around)\b)/i;

// Words for the second-person rules below.
const O = String.raw;
// someone the person could be told to hurt
const TARGET = O`(?:him|her|them|someone|somebody|anyone|people|(?:that|this|the) (?:guy|man|woman|bloke|lad|girl|boy|kid|person)|(?:your|my|his|her|their|the) (?:(?:new|old|ex-|former|line|direct|own|little|big|older|younger|best|step-?) ?)?(?:boss|manager|supervisor|partner|boyfriend|girlfriend|husband|wife|ex|colleague|coworker|co-worker|workmate|friend|mate|flatmate|roommate|housemate|brother|sister|sibling|mum|mom|dad|mother|father|parents?|son|daughter|child|kids?|cousin|uncle|aunt|auntie|nan|gran|grandma|grandad|neighbou?r|teacher|tutor|coach|landlord|landlady|classmate|teammate|team ?mate|bf|gf|bully|bullies))`;
// what turns 'hurt' into advice: "you should…", "maybe just…", "go and…", or the start of a sentence
const ADVICE = O`(?:(?:^|[.!?;:]\s*)|\b(?:you|u) (?:should|need to|have to|ought to|must|want to|wanna|deserve to|get to|are allowed to|'re allowed to|could (?:just|always|go and|even)|can (?:just|always|go and))(?: (?:just|always|really|even|definitely|simply|finally|go and|go))* |\b(?:maybe|perhaps|why not|just|go and|try to|try and|time to|feel free to|don't be afraid to) (?:(?:just|go and|go|really) )*)`;
// a person, not their things ("your manager's decision")
const PERSON_END = O`\b(?!'s|')`;
// words, not blows: 'hit him with the facts', 'kill them with kindness', 'kick your flatmate out'
const NOT_A_BLOW = O`(?! (?:up|out|off|back with|with (?:kindness|love|compassion|praise|questions|facts|the truth|honesty)|with (?:a |an |the |your |some |this |that |those |these |one |two )?(?:\w+ ){0,2}(?:question|questions|request|reply|answer|message|email|text|update|idea|proposal|plan|fact|facts|number|numbers|data|details?|point|points|truth|news|offer|figures|evidence|list|summary|deadline|invoice|bill))\b)`;

// Second-person harm the first-person lexicon has no words for. Kept narrow:
// test/output-harm.test.js runs every real line the model has written
// through these.
const OUTPUT_HARM = [
  /\b(?:kill|killing|hurt|hurting|harm|harming|starve|starving|punish|punishing) yourself\b/i,
  // 'cut yourself some slack' and 'burn yourself out' are what a friend says
  /\b(?:cut|cutting) yourself\b(?! (?:(?:some|a (?:little|bit of)|more) )?(?:slack|a break|off from)\b)/i,
  /\b(?:burn|burning) yourself\b(?! out\b)/i,
  /\bend(?:ing)? your (?:own )?life\b/i,
  /\btake your (?:own )?life\b/i,
  /\bsuicid\w*/i,
  /\bself[- ]?harm\w*/i,
  /\boverdos\w*/i,
  /\b(?:want|wanting|wish) to die\b/i,
  /\bweapons?\b|\bpoison\w*/i,
  // means: pills, hanging, a rope, jumping, starving, cutting, drinking
  /\b(?:take|taking|took|swallow|swallowing|down|downing|neck|necking|have|having) (?:all|the rest|every one|every last one|a (?:handful|bottle|box|packet|load|bunch|stack|pile|whole (?:bottle|box|packet|pack))|loads|lots|a lot|double|twice|extra|more|as many) (?:of )?(?:(?:your|the|those|these|my|his|her) )?(?:\w+ )?(?:pills|tablets|meds|medication|medicine|painkillers|paracetamol|sleeping pills|antidepressants|insulin)\b/i,
  /\b(?:lethal|fatal|deadly) (?:dose|amount)\b/i,
  /\b(?:hang|hanging|hanged) yourself\b/i,
  /\bnoose\b/i,
  /(?<!\b(?:skipping|jump|jumping|tow|climbing|learn the|learning the|know the|knows the|show you the) )\bropes?\b(?! (?:swing|swings|ladder|course|bridge|climb|climbing|walk|light|lights|access|in|into)\b)(?!-)/i,
  /\b(?:jump|jumping|throw yourself|throwing yourself|leap|leaping|step|stepping) (?:off|from) (?:a |an |the |your |that |this |some )?(?:\w+ )?(?:bridge|building|roof|rooftop|cliff|cliff edge|balcony|ledge|tower|tower block|car park|multi-storey|window)\b/i,
  /\b(?:jump|jumping|throw yourself|throwing yourself|step|stepping|walk|walking|lie down|lying down|run|running) (?:in front of|under) (?:a |an |the |that |this |some |oncoming )?(?:\w+ )?(?:train|bus|lorry|truck|car|traffic|tube)\b/i,
  /\b(?:jump|jumping|throw yourself|throwing yourself|step|stepping|walk|walking|run|running|wade|wading) (?:out )?into (?:the |a |oncoming )?(?:traffic|sea|river|canal|lake|road|motorway)\b/i,
  /\b(?:throw|throwing|hurl|hurling) yourself\b/i,
  /(?<!\b(?:don't|do not|dont|never|not|no|try not to|without|stop) )\b(?:stop|stopping|quit|quitting|give up|giving up|skip|skipping) (?:eating|food|meals|all food|drinking water)\b(?=\s*$|\s*[.,;:!?]| (?:for|until|till|so|and|altogether|completely|entirely|at all|for good|anymore|any more|today|tonight|tomorrow|this week|now|again)\b)(?! so (?:late|much|fast|quickly|early|often)\b)/i,
  /\b(?:don't|do not|stop) eat(?:ing)? (?:anything )?(?:for (?:a|two|three|several|a few|the next) (?:\w+ )?(?:days?|weeks?)|until)\b/i,
  /\bgo without (?:food|eating|meals)\b/i,
  /\b(?:cut|slit|slash|slice) (?:your|ur) (?:wrists?|arms?|legs?|skin|thighs?)\b/i,
  /\bdrink(?:ing)? yourself\b/i,
  // worthlessness aimed at the person
  /\b(?:be |are |were |is )?better off without you\b/i,
  /\b(?:nobody|no one|no-one|noone|not one person|no person)\b(?: [\w']+){0,4}? (?:would|will|could|is going to|is gonna|ever)(?: (?:even|ever|really|actually|honestly|truly|probably))* (?:(?:miss|mourn|care about|care if|care that|cry (?:for|over)) you\b|notice (?:if |that |when )?you(?:'re| are| were| was)? (?:gone|missing|dead|not there|weren't there|disappeared|died|vanished|left for good)\b|remember you(?=\s*$|\s*[.,;:!?]| (?:at all|once|after)\b))/i,
  /\b(?:nobody|no one|no-one|noone) (?:misses|cares about|would care about|wants) you\b/i,
  /\byou (?:don't|do not|didn't|did not|no longer) deserve to (?:live|be alive|exist|be here|be happy|be loved|have friends|have anyone|breathe|get better|be forgiven|have a life|have a future)\b/i,
  /\byou deserve (?:to (?:die|suffer|be hurt|be alone|be punished|feel (?:this|that) (?:bad|awful|way)|be in pain)|(?:all )?(?:the |this |that )?(?:pain|suffering)(?! relief\b))\b/i,
  /\byou(?:'re| are) (?:just |really |truly |honestly |simply |nothing but )?(?:worthless|a burden|a waste of (?:space|air|time|oxygen)|pathetic|unlovable|better off dead|a lost cause|beyond help)\b/i,
  /\b(?:the world|everyone|everybody|your (?:family|friends|team|colleagues|kids)) (?:would be|is|are|will be) better (?:off )?without you\b/i,
  // violence advice: hit, punch or hurt a person
  new RegExp(O`\b(?:hit|hitting|punch|punching|slap|slapping|kick|kicking|smack|smacking|thump|thumping|whack|whacking|batter|battering|headbutt|headbutting|stab|stabbing|strangle|strangling|choke|choking|shove|shoving|assault|assaulting|deck|decking|lamp|lamping|knock out|glass|glassing|kill|killing|murder|murdering) ${TARGET}${PERSON_END}${NOT_A_BLOW}`, 'i'),
  new RegExp(O`\b(?:beat|beating|knock|knocking|smash|smashing) (?:${TARGET}|the \w+ out of ${TARGET})(?: \w+)? (?:up|out|senseless|unconscious|to a pulp|black and blue)\b`, 'i'),
  new RegExp(O`\b(?:hurt|hurting|harm|harming|injure|injuring) ${TARGET} back\b`, 'i'),
  new RegExp(O`${ADVICE}(?:hurt|harm|injure|wound|get physical with|lash out at|square up to|rough up|attack|beat) ${TARGET}${PERSON_END}(?! (?:at|in|to)\b)`, 'i'),
];

warmSafety();
