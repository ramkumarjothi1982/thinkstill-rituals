// Screening for feelings and perspectives. Deterministic rules only: the
// app's own safety lexicon (src/ultra/reframe-engine.js checkSafety, shared
// with Reframe and the Another Angle server), the contact/link/money rules,
// and a few patterns for identifying details, unkindness and diagnosis.
// Rules are a floor, not a guarantee: reports and human moderators are the
// safety layer, and the interface says so.

import { checkSafety } from '../../src/ultra/reframe-engine.js';
import { HARM_COPY } from '../../src/ultra/frameworks.js';
import { checkMessage, normaliseText, charCount } from './text-policy.js';

// Every rule reads a normalised copy, a reading; the person's own words are stored as they wrote them.
// - Compatibility forms (NFKC): full-width or stylised letters and digits ("ｅｎｄ ｉｔ", "０７７００").
// - Curly quotes read straight: phones type you’re, the rules say you're.
// - Accents and other combining marks are dropped ("kíll", "k̶i̶l̶l̶").
// - Cyrillic and Greek letters that look like Latin ones read as Latin ("kіll" with a Cyrillic і).
// Invisible characters and fillers (format characters, variation selectors, Hangul fillers, the blank
// Braille cell), and line breaks, can each be read two ways, and the safety rules read every way: the words
// are held back if any reading flags them (Tier 0 review). Reading only one way let words through:
// - joined, the probe the other rules read: an invisible character is dropped, so a word it splits reads
//   whole ("k͏ill", "kill️"), and every run of whitespace, line breaks too, reads as one space ("I wanna  die",
//   "I wanna\ndie"), as the shared lexicon already reads them;
// - split: an invisible character or filler reads as the space it looks like, so it can't run two words
//   together ("kill\u2800myself", "wanna\u3164die"), and a line break stays one, so the next line's first word isn't
//   read as the rest of the sentence above ("I hope I never wake up\nidk").
const INVISIBLE = /[\p{Default_Ignorable_Code_Point}\u115F\u1160\u3164\uFFA0\u2800]/gu;
// what normaliseText deletes besides (C0/C1 controls but tab and line breaks); for the split reading, a space
const CONTROL = /[\u0000-\u0008\u000E-\u001F\u007F-\u0084\u0086-\u009F]/g;
const LOOKALIKE = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', һ: 'h', ӏ: 'l', ԛ: 'q', ԝ: 'w', ɡ: 'g',
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', І: 'I', Ј: 'J', Ѕ: 'S',
  α: 'a', ε: 'e', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x',
  Α: 'A', Β: 'B', Ε: 'E', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X', Ζ: 'Z',
};
const LOOKALIKE_RE = new RegExp(`[${Object.keys(LOOKALIKE).join('')}]`, 'g');
const readingOf = (text, { invisible, lines }) => {
  const s = text.normalize('NFKC').replace(/[‘’ʼ′]/g, "'").replace(/[“”″]/g, '"').normalize('NFKD')
    .replace(INVISIBLE, invisible).replace(CONTROL, invisible).replace(/\p{M}/gu, '').normalize('NFC')
    .replace(LOOKALIKE_RE, (c) => LOOKALIKE[c]);
  return lines === ' ' ? s.replace(/[\s\u0085]+/g, ' ')
    : s.replace(/\r\n?|[\v\f\u0085\u2028\u2029]/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/ ?\n[\s]*/g, '\n').trim();
};
const probeOf = (text) => readingOf(text, { invisible: '', lines: ' ' });
// Every combination of the two choices. The joined ones read the stored words (normaliseText has already
// dropped zero-width and control characters); the split ones read the words as they came, where those show as spaces.
const READINGS = [[{ invisible: '', lines: ' ' }, 'text'], [{ invisible: ' ', lines: '\n' }, 'raw'], [{ invisible: '', lines: '\n' }, 'text'], [{ invisible: ' ', lines: ' ' }, 'raw']];
const SAFETY_READS = 2000;
const firstChars = (text, n) => (text.length <= n ? text : Array.from(text).slice(0, n).join(''));
/**
 * The readings the safety rules read: every reading of the first 2,000 characters (a very long paste costs little)
 * and, when a caller accepts more (maxChars), of everything it accepts, so nothing it could release is unread.
 */
function readingsOf(input, text, maxChars) {
  const raw = String(input ?? '');
  const out = new Set();
  for (const n of new Set([SAFETY_READS, Math.max(SAFETY_READS, Number(maxChars) || 0)])) {
    for (const [how, from] of READINGS) out.add(readingOf(firstChars(from === 'raw' ? raw : text, n), how));
  }
  return [...out];
}

// Hushmates' own additions to the app's safety lexicon, kept here so the main
// app's Reframe engine is reused unchanged. Words that mean someone may be in
// danger right now: never released to strangers, never sent to an AI provider.
const EXTRA_CRISIS = [
  /\b(?:took|taken|swallowed|necked)\b[^.!?]{0,30}\b(?:pills|tablets|paracetamol|ibuprofen|painkillers|sleeping pills|an overdose)\b/i,
  /\boverdos(?:e|ed|ing)\b/i,
  /\bno point (?:in )?(?:going on|living|carrying on|being here|being alive)\b/i,
  /\b(?:cut|cutting|burn|burning|hurt|hurting|harm|harming)\s+(?:my\s*self|myself)\b|\b(?:harm|harming)\s+my (?:arms?|wrists?|legs?|thighs?|skin)\b/i,
  // cutting or burning a part of the body, unless it is plainly an accident (\"cut my leg shaving\", \"on a fence\")
  /\b(?:cut|cutting|burn|burning)\s+my (?:arms?|wrists?|legs?|thighs?|skin)\b(?!\s+(?:shaving|cooking|chopping|slicing|gardening|by accident|accidentally|on (?:a|an|some|the|broken|barbed|sharp)\b(?! (?:bad|worst|weekends?|nights?|days?)\b)))/i,
  // \"I hurt my wrist at the gym\" is a sports injury: hurting a part of the body counts with intent, or the usual sites (\"hurt my arms\")
  /\b(?:keep|kept|been|started|start|want to|wanna|going to|gonna|need to|urge to|tried to|try to)\s+(?:hurt|hurting)\s+my (?:arms?|wrists?|legs?|thighs?|skin)\b|\b(?:hurt|hurting)\s+my (?:arms?|wrists?|legs?|thighs?|skin)\s+(?:again\b(?!\s+(?:at|playing|training|in|during)\b)|on purpose|deliberately|intentionally|to (?:feel|cope|punish|calm|stop|forget)|when (?:i'?m|i am|i feel|i get|it gets|things get) (?:upset|sad|angry|stressed|overwhelmed|numb|anxious|bad|low|like this))|\b(?:hurt|hurting)\s+my (?:arms|wrists|thighs|skin)\b(?!\s+(?:at|playing|training|lifting|doing|in|during|on|falling|running|from|carrying|climbing|typing|when i fell)\b)/i,
  /\b(?:don'?t|do not) want to (?:be here|wake up|exist|be alive) any ?more\b/i,
  /\b(?:don'?t|do not|no longer) (?:want to|wanna) (?:be here|be alive|live|exist|wake up|go on|be around)\b/i,
  /(?<!(?:don'?t|do not|never) )\bwanna (?:just )?die\b(?! (?:of|from|for|laughing))/i,
  // Passive wishes not to be here, said many ways (the Columbia scale's first question among them), with
  // everyday getaways, other people and alarms left out. All of it is for the clinical review
  // (docs/READINESS.md), with the phrasings in tests/fixtures/mallow-probes.json.
  /(?<!\b(?:kids|children|teenagers|teens|flatmates|housemates|roommates|husband|wife|partner|family|everyone|cats?|dogs?)(?: (?:all|just|always|really|both|often|usually))? )(?<!(?:don'?t|do not|never) )\b(?:want(?:ed)?|wanna|wish(?:ing)? (?:i|that i) (?:could|would)|(?:i'?d|would) rather)(?: to)?(?: just)? (?:disappear|vanish|fade away|not exist|stop existing|cease to exist|not be (?:here|around) any ?more|not be alive)\b(?! (?:to|on|into|off|from|under) (?:a |an |the |my |our |this |that |\w+'s )?(?:good |hot |cosy |own )?(?:beach|holidays?|vacation|trip|road trip|island|bali|countryside|mountains|woods|bush|coast|snow|farm|cabin|books?|(?:video )?games?|series|shows?|films?|music|art|duvet|covers|blankets?|hoodie|bed|bedroom|room|background|crowd|seat|floor|phone|studio|social media|instagram|tiktok|grid|(?:family )?group chat|job|work)\b(?![^.!?]*\b(?:forever|for good|never|not come back|wake up|gone|die|dead|(?:no ?one|nobody) (?:would |will |'?d )?(?:notices?|miss|cares?|cared))\b)| for (?:a|an|the|one|half an?|a few|a couple of) (?:days?|hours?|evenings?|nights?|afternoons?|mornings?|weekend|weeks?|months?|bit)\b(?![^.!?]*\b(?:forever|for good|never|not come back|wake up|gone|die|dead|(?:no ?one|nobody) (?:would |will |'?d )?(?:notices?|miss|cares?|cared))\b)| (?:to|into|on|off|under) (?=((?:(?:a|an|the|this|that|my|our|his|her|their|some|own|whole|face|bottom|of|\w+'s|\w+s') )*))\1(?!(?:void|nothing(?:ness)?|dark(?:ness)?|thin air|ground|earth|world|planet|existence|everything|it all|every ?one|every ?body|people|life|lives|memory|minds?|body|oblivion|abyss|sea|ocean|river|lake|water|waves|bath|sky|heaven|universe|grave|better place|other side|night|traffic|trains?|tracks|bus|cars?|truck|bridge|cliff|roof|edge|ledge)\b)(?=\w)[^.!?]*?\b(?:for (?:a|the|one|a few|a couple of|\d+) (?:days?|nights?|weekend|weeks?|months?|year|summer|holidays)|for hours|all (?:day|weekend|week|summer)|after (?:school|work|exams|uni))\b(?![^.!?]*\b(?:forever|for good|never|not come back|wake up|gone|die|dead|(?:no ?one|nobody) (?:would |will |'?d )?(?:notices?|miss|cares?|cared))\b)|(?<=\bwanted to (?:just )?(?:disappear|vanish)) (?:when|the moment|the second|as soon as|after)\b(?![^.!?]*\b(?:died|dies|dead|death|passed|funeral|killed|left me|broke up|dumped|cheated|(?:hit|hurt|touched) (?:me|us|her|him|my)|abused|raped|diagnosed|lost|miscarr\w*|fighting|yelling|screaming|bullied|bullying|cared|alone|cuts?|cutting|scars?|pills|overdos\w*|woke|wake|gone|hate myself|worthless|forever|for good|never)\b)|(?<=\b(?:embarrass(?:ed|ing)|mortified|cringe\w*)\b(?! (?:of|by|about) (?:myself|me|who i am|my (?:body|face|life|existence)))[^.!?]{0,60}\b(?:disappear|vanish))(?![^.!?]*\b(?:forever|for good|never|not come back|wake up|gone|die|dead|(?:no ?one|nobody) (?:would |will |'?d )?(?:notices?|miss|cares?|cared))\b)|[^.!?]*\b(?:embarrass(?:ed|ing)|mortified|cringe\w*)\b(?! (?:of|by|about) (?:myself|me|who i am|my (?:body|face|life|existence)))(?![^.!?]*\b(?:forever|for good|never|not come back|wake up|gone|die|dead|(?:no ?one|nobody) (?:would |will |'?d )?(?:notices?|miss|cares?|cared))\b))/i,
  /\bwish(?:ing)? (?:that )?i (?:didn'?t|did not|never) exist(?:ed)?\b|\bwish(?:ing)? (?:that )?i(?:'d| had| was| were)? never (?:been )?born\b|\b(?:wish (?:that )?i (?:was|were)|(?:want|wanna)(?: to)?(?: just)? be) gone(?=\s*(?:[.!?,;]|$|forever|for good|any ?more))|\bfeel(?:s|ing)? like (?:just )?(?:disappearing|vanishing|fading away)\b(?!\s+(?:to|for|on|into|from)\b)/i,
  /(?<!(?:don'?t|do not|never) )\b(?:want(?:s|ed)?|wanna|wish(?:ing)? (?:i|that i) (?:could|would|'d)|(?:would|'d) rather|(?:would|'d) (?:love|like|give anything) to|(?:would|'d) be (?:so |so much |much |such )?(?:nice|easier|a relief|fine|okay|ok|good|better|lovely) to|hop(?:e|es|ing) to|pray(?:s|ing)? to|if i could)(?: to)?(?: just)? (?:sleep|go to sleep|fall asleep)\b[^.!?]{0,20}\b(?:never|not|and (?:just )?(?:don'?t|won'?t|wouldn'?t)) (?:ever )?wake up\b(?! (?:early|before|until|till|til\b|at\b(?! all\b)|in time|on time|for (?:once|work|school|ages|hours|\d)|all (?:day|night|weekend|morning)|(?:to|when) (?:an? |the |my |our |his |her )?(?:alarms?|baby|babies|kids?|children|dog|noise|drill|neighbou?r|emails?|phone|crying)))/i,
  /\b(?:sleep|go to sleep|fall asleep|go to bed)\b[^.!?]{0,20}\b(?:hop(?:e|ing)|wish(?:ing)?|pray(?:ing)?) (?:that )?i (?:never|won'?t|don'?t|do not|will not|wouldn'?t) (?:ever )?wake up\b(?! (?:early|before|until|till|til\b|at\b(?! all\b)|in time|on time|for (?:once|work|school|ages|hours|\d)|all (?:day|night|weekend|morning)|(?:to|when) (?:an? |the |my |our |his |her )?(?:alarms?|baby|babies|kids?|children|dog|noise|drill|neighbou?r|emails?|phone|crying)))/i,
  /(?<!(?:don'?t|do not|never) )\b(?:want(?:ed)?|wanna|wish(?:ing)? (?:i|that i) could|(?:i'?d|would) rather)(?: to)? (?:just )?(?:never|not) wake up\b(?! (?:early|before|until|till|til\b|at\b(?! all\b)|in time|on time|for (?:once|work|school|ages|hours|\d)|all (?:day|night|weekend|morning)|(?:to|when) (?:an? |the |my |our |his |her )?(?:alarms?|baby|babies|kids?|children|dog|noise|drill|neighbou?r|emails?|phone|crying)))/i,
  /\b(?:hop(?:e|ing)|pray(?:ing)?|wish(?:ing)?) (?:that )?i(?:'ll| will|'d| would)? (?:just )?(?:go to sleep|fall asleep|sleep|go to bed)\b[^.!?]{0,20}\b(?:never|not|don'?t|won'?t|wouldn'?t|do not|will not) (?:ever )?wake up\b(?! (?:early|before|until|till|til\b|at\b(?! all\b)|in time|on time|for (?:once|work|school|ages|hours|\d)|all (?:day|night|weekend|morning)|(?:to|when) (?:an? |the |my |our |his |her )?(?:alarms?|baby|babies|kids?|children|dog|noise|drill|neighbou?r|emails?|phone|crying)))/i,
  /\b(?:wouldn'?t|would not) mind if i (?:didn'?t|did not|never) wake up\b/i,
  /\bwish i (?:didn'?t|did not) have to wake up(?=\s*(?:[.!?,;]|$|any ?more|ever again|at all))/i,
  /\b(?:want(?:ed)? to|wanna|wish i could|(?:i'?d|would) rather) (?:just )?sleep forever\b/i,
  /\bwish(?:ed|es|ing)? (?:that )?i (?:was|were|could be) dead\b/i,
  /\bwish(?:ed|es|ing)? (?:that )?i(?: would|'?d| could) (?:just )?die\b(?! (?:of|from) (?:embarrassment|shame|cringe|laughter|laughing|boredom)\b| laughing\b)/i,
  /\b(?:i'?d|i would) (?:rather|sooner) (?:be dead|die)\b(?! (?:than|before|instead|of))/i,
  /(?<!(?:don'?t|do not|never) )\b(?:want(?:ed)?|wish) (?:my life|it all) to (?:just )?(?:end|be over)\b(?! (?:well|soon|happily|nicely|on|with|so|in|at|before|for(?! good\b| ever\b))\b|(?<=\bit all to (?:just )?be over) and done with\b)/i,
  /\bwish (?:it all|my life|it would all)(?: would)?(?: just)? (?:end|be over|stop)\b(?! being\b| for (?:a|one|the|a few|a couple of) (?:minutes?|mins?|seconds?|secs?|moments?|bit|while|days?|nights?|evenings?|weekend|hours?)\b)/i,
  /\b(?:want|wanna|wish i could|ready) to (?:just )?stop living\b(?! (?:in|with|for|like|at|on|under|off|out|paycheck|a|my|the|this|that|so|as)\b)/i,
  /\btired of (?:being alive|living|existing|life)\b(?! (?:in|with|at|on|under|like|for|around|off|out|paycheck|admin|here|there|so|as|a|my|the|our|this|that|from|to)\b)/i,
  /\bwhat(?:'?s| is) the (?:point|use) (?:of|in) (?:living(?! (?:in|on|at|together|here|there)\b(?! (?:this|the) (?:world|planet|earth)\b))|going on(?! (?:a|an|the|my|our|this|that|holidays?|dates?|social media|strike|trips?|diets?|to)\b)|being alive|being here|carrying on)\b|\bwhat(?:'?s| is) the (?:point|use) (?:of|in) life\b(?! (?:about|with|like|insurance)\b)/i,
  /\b(?:don'?t|do not) (?:even |really )?care (?:if|whether) i (?:live or die|die|wake up)\b/i,
  /\bhope i (?:get hit by a (?:bus|car|truck)|die)\b(?! (?:early|before|until|late|in time|on time|laughing|of|doing|happy|happily|first|old)\b)(?![^.!?]*\b(?:old age|ripe old|when i'?m (?:old|older|\d+)|at \d{2,3})\b)/i,
  /\bhope i (?:don'?t|never) wake up\b(?=(?: +(?:tomorrow|tonight|ever|again|any ?more|this time|in the morning|morning|honestly|tbh|at all)\b)*(?! +(?!and\b)[a-z0-9]))/i,
  /\b(?:done with|given up on|giving up on) (?:life|living)\b(?! (?:in|with|at|admin|here|like|for|a|my|the|this|that)\b)/i,
  // others better off without me, not missed, a burden
  /\b(?:better off|happier|easier)\b[^.!?]{0,25}\bif i (?:(?:was|were) (?:gone|dead)|(?:wasn'?t|weren'?t|was not|were not) (?:here|around|alive))\b/i,
  /(?<!\b(?:played|did|went|sounded|ran|performed|(?:he|she|ex|girlfriend|boyfriend)(?:'s| is)(?: (?:so|clearly|obviously|honestly))* doing)(?: (?:so|much|a lot|way|far|even))* )\bbetter without me\b/i,
  /\b(?:no ?one|nobody) would (?:even )?(?:miss me|care|notice)\b[^.!?]{0,15}\bif i (?:was gone|were gone|died|disappeared|wasn'?t (?:here|around)|was dead)\b/i,
  /\b(?:i'?m|i am|i (?:just |always |really )?feel like) (?:just |such |only )?a burden\b/i,
  // a method, said with intent, and the most common direct ways of saying it (for the clinical review)
  /\b(?:i'?ve|i have|i'?ve been|i have been) (?:just )?want(?:ed|ing) to (?:just )?(?:disappear|vanish)\b(?! (?:to|on|into|off) )/i,
  /\b(?:have|got|made|making) a plan to (?:end it|end my life|kill myself|die|end things)\b|\bbought (?:a |some )?rope\b(?! (?:for|to tie|swing|ladder|light)\b)|\brelapsed and (?:cut|hurt myself|self[- ]harmed)\b|\b(?:i'?m|i am) ready to die\b(?! (?:of|for|laughing)\b)|\b(?:want|wanna) to (?:fucking|fkn|f\*+ing) die\b/i,
  /\b(?:want|wanna|going|gonna|planning|thinking (?:of|about)) (?:to )?(?:just )?(?:od|overdose|drown myself)\b(?! on\b)|\bthinking (?:about|of) ending (?:it all|my life|it)\b(?! (?:with|for)\b)/i,
  /\b(?:hang|hanging|shoot|shooting) ?my ?self\b(?! in the (?:foot|feet|leg)\b)|\bslit(?:ting)? my (?:wrists?|throat)\b|\bunaliv(?:e|ed|ing)? ?my ?self\b/i,
  /\b(?:want|wanna|going|gonna|planning|ready|about|thinking (?:of|about)|wish i could)(?: to)? (?:just )?(?:jump(?:ing)? (?:off|from) (?:a|the|my|this|that) (?:bridge|building|roof|balcony|cliff|tower)\b(?! (?:into|in)\b)|(?:jump(?:ing)?|step(?:ping)?|throw(?:ing)? myself|walk(?:ing)?) in front of (?:a|an|the) (?:train|bus|car|truck|lorry|tram)\b)/i,
  /\b(?:want|wanna|going|gonna|planning|ready|about|thinking (?:of|about))(?: to)? (?:just )?(?:take|taking|swallow(?:ing)?|down|downing|neck(?:ing)?) (?:all|every one of|the whole|a whole|a load of|a bunch of|loads of)\b[^.!?]{0,20}\b(?:pills|tablets|meds|medication|paracetamol|panadol|painkillers)\b(?! (?:on time|with|as (?:prescribed|directed)|every|each|before|after|at (?!once)|in the morning|for (?:my|the)|from now|properly|regularly|today|this (?:morning|week)))/i,
  /(?<!(?:don'?t|do not|never) )\b(?:want|wanna)(?: to)? (?:just |really )?be dead\b(?! (?:honest|serious|sure|set|right|tired|on|quiet|still|centre|center|last|even|certain|straight|ahead|easy|good|funny)\b)|\b(?:want|wanna) to (?:just|really|honestly|literally|actually|seriously|simply) die\b(?! (?:of|from|for|laughing)\b)|\b(?:don'?t|do not) deserve to (?:live|be alive|exist)\b(?! (?:like|in|with|under|on|at|here|there|this|that|a|an|the|my|so|as|through|without|together|near|next)\b)/i,
];
// Someone else may be in danger: the "Someone might be in danger" screen (for the clinical review too)
const PET = String.raw`(?:cats?|kitt(?:y|ies|ens?)|dogs?|doggos?|pupp(?:y|ies)|pups?|pets?|rabbits?|bunn(?:y|ies)|birds?|budgies?|parrots?|guinea pigs?|hamsters?|horses?|pon(?:y|ies)|fish|goldfish|mouse|mice|rats?|ferrets?|lizards?|snakes?|tortoises?|turtles?|chooks?|chickens?)`;
const EXTRA_DANGER = [
  /(?<!\b(?:part of me|nobody|no ?one|no-one|everyone|everybody|anyone|anybody|who) )\bwants to (?:just )?die\b(?! (?:of|from|for|laughing|alone|on (?:that|this|the|a) hill|at home|in (?:peace|hospital|a hospice|(?:his|her|their) sleep)|peacefully|with dignity|surrounded|on (?:her|his|their) own terms|happy|old|a|an|before|than|instead|(?:her|his|their|my) hair)\b)(?![^.!?]*\b(?:assisted dying|vad|euthanasia)\b)/i,
  /\b(?:doesn'?t|does not|doesnt|no longer) (?:want|wants|wanna) to (?:live|be alive)(?=\s*(?:[.!?,;]|$|any ?more|any longer))/i,
  /\b(?:wants?|wanna|going|planning|threaten(?:s|ed|ing)?|tried|trying) to end (?:his|her|their) (?:own )?life\b(?! of\b)(?![^.!?]*\b(?:assisted dying|vad|euthanasia)\b)|\b(?:talk(?:s|ed|ing)?|think(?:s|ing)?|thought) about ending (?:his|her|their) (?:own )?life\b/i,
  /\b(?:cuts|cutting) (?:himself|herself|themselves|themself)\b(?! (?:on|off|out|shaving|while|by accident|accidentally|some slack|slack|short)\b)/i,
  /\b(?:hang|hanging) (?:himself|herself|themselves|themself)\b(?! out to dry\b)/i,
  // the shared lexicon's "not breathing" rule misses the contracted forms people type: "He's not breathing" (Tier 0).
  // Not about a pet: "My cat's not breathing" or "our old cat, she's not breathing properly" is distressing, but 000
  // isn't the answer. The pet must be who isn't breathing (Tier 0 review: "My dog barked and then my dad's not
  // breathing" is a person), and someone "breathing down my neck" is an idiom.
  new RegExp(String.raw`\b(?:(?<!\b${PET}(?: ?[,;:—–-])? )(?:he|she|they|someone|somebody)|(?:my|our|his|her|their) (?!(?:(?:old|little|poor|baby|sweet|lovely|darling|beautiful|elderly|new) )?${PET}\b)(?:\w+ )?\w+)(?:(?:'s|'re| is| are) not| (?:isn'?t|aren'?t|is not|are not|has stopped|have stopped|stopped)) breathing\b(?! down (?:my|your|ur|his|her|their|our|everyone's|people's) necks?\b)`, 'i'),
];
function extraCrisis(probe) {
  const p = probe.replace(/[’‘]/g, "'");
  if (EXTRA_CRISIS.some((re) => re.test(p))) return { reframeAppropriate: false, level: 'crisis', title: HARM_COPY.crisis.title, message: HARM_COPY.crisis.message, resources: HARM_COPY.crisis.resources, stillHere: STILL_HERE };
  if (EXTRA_DANGER.some((re) => re.test(p))) return { reframeAppropriate: false, level: 'crisis', category: 'someone-in-danger', title: HARM_COPY.crisisOther.title, message: HARM_COPY.crisisOther.message, resources: HARM_COPY.crisisOther.resources, stillHere: STILL_HERE };
  return null;
}
// A care match (abuse, violence, bullying) never hides crisis words. "He hurt my arm" stays violence:
// beside a care match, hurting a part of the body counts as self-harm only when "I" do it.
const MY_BODY = /\b(?:cut|cutting|burn|burning|hurt|hurting|harm|harming)\s+my (?:arms?|wrists?|legs?|thighs?|skin)\b/gi;
const I_HURT_MY_BODY = /\bI(?:'ve|'m|'d)?(?:\s+(?:have|am|was|keep|kept|started|start|been|just|sometimes|still|always|often|again|to|want|wanna|need|needed|going|gonna|can'?t stop|couldn'?t stop|tried))*\s+(?:(?:hurt|hurting|harm|harming)\s+my (?:arms|wrists|legs|thighs|skin)\b|(?:cut|cutting|burn|burning)\s+my (?:arms?|wrists?|legs?|thighs?|skin)\b(?!\s+(?:on\b(?!\s+purpose)|against|trying|pulling|running|falling|getting)\b))/i;
// "I don't want to go on the school camp", "...live with my parents", "...wake up early": the everyday words are
// blanked before any rule reads them (as the lexicon's own idiom guards do); anything else in the feeling is still read.
// Only a concrete everyday place, person or thing counts: "live at all", "live with this any more", "live at this
// point", "live with what I did" or "be here for another day" are never blanked (Tier 0: blanking them hid the
// lexicon's own crisis rule).
const NOT_EVERYDAY = String.raw`(?:(?:this|that|these|those|the|a|my|our|such|own|what|i) )*(?:world|earth|planet|body|head|skin|pain|hell|misery|guilt|shame|fear|regret|darkness|grief|myself|it|way|like|all|what|thoughts?|memories|feelings?|depression|anxiety|illness|condition|trauma|life|point|moment|stage|any ?more|any longer|forever|now|again|existence|reality|person|me|did|done)\b|(?:this|that|these|those)\s*(?:[.!?,;]|$)`;
const EVERYDAY_NOT_WANT = new RegExp(String.raw`\b(?:don'?t|do not|no longer) (?:want to|wanna) (?:go on (?=(?:(?:a|an|the|that|this|my|our|his|her|their|another|school|family|work|uni|class|year \d+|first|second) )*(?:holiday|holidays|vacation|camp|trip|tour|date|dates|excursion|cruise|ride|stage|exchange|retreat|course|plane|flight|bus|train|social media|instagram|tiktok|my phone|the internet)\b)|live (?=(?:with|in|at|near|on) (?!${NOT_EVERYDAY})\w)|be around (?=(?:people|crowds|him|her|them|anyone|anybody|everyone|everybody|you|my|his|her|their|our|family|friends|kids)\b)|be here (?=(?:at|for) (?:this|the|a|an|my|our|work|school|uni|class|christmas|dinner|lunch)\b(?! (?:point|moment|stage|world|earth|long|longer|much)\b))|wake up (?=early\b|so early\b|before\b|at \d|at (?:dawn|six|five|seven|eight)\b|for (?:work|school|uni|class|my|the|a|an)\b|on (?:a |the )?(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|on (?:the )?weekends?\b))`, 'gi');
const everydayBlanked = (probe) => probe.replace(EVERYDAY_NOT_WANT, (m) => ' '.repeat(m.length));
const safetyOf = (raw) => {
  const probe = everydayBlanked(raw);
  const s = checkSafety(probe);
  if (s.reframeAppropriate) return extraCrisis(probe) || s;
  if (s.level === 'crisis') return s;
  return (I_HURT_MY_BODY.test(probe) ? extraCrisis(probe) : extraCrisis(probe.replace(MY_BODY, ' '))) || s;
};
// Every reading is checked and the most serious answer stands: a crisis over care over nothing, and the writer's
// own crisis over someone else in danger. Between equals, the first reading's (the joined one, as before).
const SERIOUS = (s) => (s.reframeAppropriate ? 0 : s.level !== 'crisis' ? 1 : s.category === 'someone-in-danger' ? 2 : 3);
const safetyOfAll = (readings) => readings.map(safetyOf).reduce((a, b) => (SERIOUS(b) > SERIOUS(a) ? b : a));

// Hushmates' own words for the support screen. The lexicon is the app's (Reframe's, reused
// unchanged); its titles and messages talk about reframing, and its helplines are for the UK and
// the US, so both are replaced here. The private beta is in Australia: these are the national
// services' published numbers. To be reviewed before launch by a clinical safety adviser (see
// docs/READINESS.md), and again for any new region.
export const SUPPORT_REGION = 'AU';
// `tel` (digits only) and `link` (https only) make the lines tappable on the support screen.
const AU = {
  now: { label: 'Right now', detail: 'If you or someone else is in immediate danger, call 000.', tel: '000', call: 'Call 000' },
  lifeline: { label: 'Lifeline', detail: 'Call 13 11 14, any time, day or night, or chat online at lifeline.org.au.', tel: '131114', call: 'Call 13 11 14', link: { href: 'https://www.lifeline.org.au/crisis-chat/', text: 'Chat online' } },
  callback: { label: 'Suicide Call Back Service', detail: 'Call 1300 659 467, any time.', tel: '1300659467', call: 'Call 1300 659 467' },
  yarn: { label: '13YARN', detail: 'Call 13 92 76: crisis support by and for Aboriginal and Torres Strait Islander people, any time.', tel: '139276', call: 'Call 13 92 76' },
  respect: { label: '1800RESPECT', detail: 'Call 1800 737 732 about family, domestic or sexual violence, any time.', tel: '1800737732', call: 'Call 1800 737 732' },
  beyondBlue: { label: 'Beyond Blue', detail: 'Call 1300 22 4636 to talk things through with a counsellor, any time.', tel: '1300224636', call: 'Call 1300 22 4636' },
  worried: { label: 'Lifeline', detail: 'Call 13 11 14, any time. They help people who are worried about someone else, too.', tel: '131114', call: 'Call 13 11 14' },
  elsewhere: { label: 'Outside Australia', detail: 'findahelpline.com lists free, confidential helplines in many countries.', link: { href: 'https://findahelpline.com', text: 'Find a helpline' } },
};
/** Crisis lines for the support screen. */
export const SUPPORT_RESOURCES = Object.freeze([AU.now, AU.lifeline, AU.callback, AU.yarn, AU.elsewhere]);
/** "Get support now", from any screen: the same lines, plus family violence and someone to talk things through with. */
export const SUPPORT_NOW_RESOURCES = Object.freeze([AU.now, AU.lifeline, AU.callback, AU.yarn, AU.respect, AU.beyondBlue, AU.elsewhere]);
export const SUPPORT_NOW_MESSAGE = 'Hushmates isn’t an emergency service, and nobody here is watching in real time. If you or someone else is in danger right now, call 000. If you’re not okay, or you’re worried about someone, these services are free and there to talk.';
const GENERAL = [AU.now, AU.lifeline, AU.beyondBlue, AU.elsewhere];
const CARE_LINES = [AU.now, AU.respect, AU.lifeline, AU.elsewhere];
const DANGER_LINES = [AU.now, AU.worried, AU.elsewhere];
const NOT_SENT = 'It won’t be sent out for other perspectives.';
// Under every support message. Hushmates' own line (Tier 0): the shared lexicon's said "The Mallows are still here",
// and at a moment like this the people to turn to are on the lines above, not in the app.
export const STILL_HERE = 'When you’re ready, Hushmates will still be here for the lighter things. For this, the people on these lines are ready to listen now.';
const CARE = {
  abuse: { message: `What you’re describing sounds like it could be abuse. ${NOT_SENT} It’s not your fault, and you don’t deserve it. If you can, tell someone you trust or contact a support service, at your own pace.`, resources: CARE_LINES },
  violence: { message: `Nobody has the right to hurt you. This is something that happened to you, and it matters. ${NOT_SENT} If you can, tell someone you trust, and reach out to a support service or the police when you feel ready.`, resources: CARE_LINES },
  // threats and fear of someone are among the strongest signs of family violence, so these get 1800RESPECT too (Tier 0)
  threat: { message: `Being threatened is serious, and it isn’t something to talk yourself out of. ${NOT_SENT} Keep any messages or notes, tell someone you trust, and contact the police or a support service if you feel at risk.`, resources: CARE_LINES },
  harassment: { message: `Being harassed or bullied isn’t something to see differently, and it isn’t on you to fix. ${NOT_SENT} If you can, save screenshots or notes, tell someone you trust, and use the reporting routes at school, at work or on the app or site.`, resources: GENERAL },
  discrimination: { message: `Being treated unfairly because of who you are is real, and it isn’t something to explain away. Your reaction makes sense. ${NOT_SENT} If you want to, keep a record of what happened and talk to someone you trust, HR, a union or an advice organisation.`, resources: GENERAL },
  unsafe: { title: 'Your safety comes first', message: `Not feeling safe is important information. Please trust it. ${NOT_SENT} If you can, talk to someone you trust or a support service about what’s going on.`, resources: CARE_LINES },
};
const STALKING = /\bstalk\w*|\b(?:follows|followed|following) me\b|\bkeeps? turning up\b|\bturns? up at my\b/i;
function supportOf(safety, probe = '') {
  if (safety.level === 'crisis' && safety.category === 'someone-in-danger') {
    return {
      title: 'Someone might be in danger',
      message: 'If someone might be about to hurt themselves, or is in danger right now, that comes before anything else: call 000. If it’s safe to, stay with them or keep talking to them. You don’t have to handle this alone: a helpline can talk you through what to do.',
      resources: DANGER_LINES, stillHere: STILL_HERE,
    };
  }
  if (safety.level === 'crisis') {
    return {
      title: 'Let’s pause here',
      message: 'What you’ve written sounds really painful, and it matters. It won’t be sent to anyone: you deserve real support with this, right now. If you might act on these thoughts, or you’re not safe, please call 000. If you can, tell someone near you how you’re feeling. You don’t need the right words first.',
      resources: SUPPORT_RESOURCES, stillHere: STILL_HERE,
    };
  }
  const c = CARE[safety.category] || CARE.unsafe;
  const resources = safety.category === 'harassment' && STALKING.test(probe) ? CARE_LINES : c.resources;
  return { title: c.title || 'This one deserves real support', message: c.message, resources, stillHere: STILL_HERE };
}

/** Our own reviewed support copy, for when a Mallow provider's safety check flags a feeling (its own text is never shown). */
export const providerSupport = () => supportOf({ level: 'crisis' });

// The national lines' own numbers are never contact details: a feeling or a perspective may name them (Tier 0).
// Only a number standing alone: one with more digits beside it, or a '+', is someone's own number, so it's left for
// the phone rule ("Ring 0412 13 11 14", Tier 0 review). "13 11 14 (24/7)" still stands alone.
const HELPLINES = /(?<![\d+][\s\-().]{0,3})\b(?:13 ?11 ?14|0477 ?13 ?11 ?14|1300 ?659 ?467|13 ?92 ?76|1800 ?737 ?732|0458 ?737 ?732|1300 ?22 ?4636|1300 ?78 ?99 ?78|1800 ?55 ?1800|1800 ?184 ?527|13 ?11 ?26|1800 ?250 ?015|1800 ?33 ?4673|13 ?14 ?50|1300 ?726 ?306|1300 ?727 ?247)\b(?!(?![\s(]{0,2}24 ?\/ ?7\b)[\s\-().]{0,3}\d)/g;
const withoutHelplines = (probe) => probe.replace(HELPLINES, ' ');

const IDENTIFYING = [
  /\b\d{1,5}\s+[A-Za-z][A-Za-z ]{1,30}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|way|crescent|place|court)\b/i,   // street address
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i,                                   // UK postcode (any case)
  /\b\d{5}(?:-\d{4})?\b(?=.*\b(?:zip|postcode|post code)\b)/i,                 // "90210 is my zip"
  /\b(?:zip|post\s?code)(?:\s+code)?\b[^\d\n]{0,12}\d{5}(?:-\d{4})?\b/i,          // "my zip code is 90210"
  /\b(?:my|our)\s+(?:full\s+|real\s+)?name(?:\s+is|\s*['’]s)\b/i,                // "my name is", "my name’s"
  /\b(?:post\s?code|p\/?code)\b[^\d\n]{0,12}\d{4}\b/i,                           // an Australian postcode, with context
  // or after a state, written as states are (case matters: "act 2026", "sa 1234" or "the Privacy Act 1988" aren't addresses)
  /\b(?:NSW|VIC|Vic|QLD|Qld|SA|WA|TAS|Tas|NT|ACT)\s+\d{4}\b/,
];

// Words that tell the reader to hurt themselves, or that someone shouldn't exist (Tier 0). A catcher's perspective
// with them never reaches the writer. A feeling with them never reaches catchers either, but its writer may be
// talking to themselves ("I keep telling myself kys"), so it's answered with support, never a bare refusal.
const YOURSELF = String.raw`(?:your ?self|ur ?self|yaself|yo ?self|yourselves)\b`;
// Everyday sayings are blanked before these rules read the words (Tier 0 review): "cut yourself some slack",
// "cut yourself off", "shooting yourself in the foot", "take the pressure off yourself", "lay off yourself"
const SAYINGS = new RegExp(String.raw`\bcut ${YOURSELF} (?:(?:some|a little|a bit of|a lot of|a|more) )?(?:slack|break)\b|\bcut ${YOURSELF} (?:off|short)\b|\bshoot(?:ing)? ${YOURSELF} in the f(?:oo|ee)t\b|\bhang(?:ing)? ${YOURSELF} out to dry\b|\b(?:pressure|weight|load|heat|stress|burden|spotlight|blame|focus|attention|eyes|mind|expectations?|guilt|shame|it|that|this|lay|ease) off ${YOURSELF}`, 'gi');
const TELL_HARM = String.raw`\b(?:kill|hang|neck|unalive|off|end|shoot|drown|cut|hurt|harm|starve|stab) ${YOURSELF}`;
const KYS = String.raw`\bk[\s.\-_*]*y[\s.\-_*]*s\b|\bkys+\b`;
const SHOULD_DIE = String.raw`\b(?:you|u|ya)(?: should| need to| ought to|'d better| deserve to| might as well)(?: just| all)? (?:die|be dead|not exist|stop existing|disappear forever|rot|suffer)\b`;
const NOT_MISSED = String.raw`\b(?:no ?one|nobody|no-one) (?:would|will|'d|is going to|gonna|ever) (?:even )?(?:miss|notice|care about|cry for) (?:you|u)\b`;
const BETTER_WITHOUT = String.raw`\b(?:the world|everyone|everybody|we|they|people|your family) (?:would|'d|will) be (?:so much |much )?better (?:off )?without (?:you|u)\b`;
const HATED = String.raw`\b(?:everyone|everybody|people) (?:hates|hate) (?:you|u)\b`;
// In a perspective, words saying not to are care, not a push: "Don't hurt yourself over this", "never hurt
// yourself", "try not to" ("why not" is a push). Shared with the advice rules below.
const NOT_SAID = String.raw`(?<!\b(?:don'?t|do not|dont|never|(?<!\bwhy )not|no need|shouldn'?t|should not|won'?t|will not|mustn'?t)(?: (?:ever|ever again|go|go and|just|suddenly|want to|need to|have to|try to|to))? )`;
// ...and how things can feel isn't a verdict: "It can feel like nobody would miss you, and that feeling lies",
// "You might think everyone hates you". "I think nobody would miss you" or "it seems like…" without a "can" is one.
const AS_IT_FEELS = String.raw`(?<!(?:\b(?:it|you|u|that|this|things|everything|life)(?: (?:can|could|might|may|will|would|must|often|sometimes|probably|really|just|still|always|even|almost))* (?:feels?|felt|feeling)(?: like| as if| as though)?|\b(?:it|that|this|things|everything|life)(?: (?:can|could|might|may|will|would|often|sometimes))+ (?:seems?|looks?)(?: like| as if| as though)?|\bfeeling like|\bas if|\bas though|\b(?:you|u)(?: (?:can|could|might|may|will|would|probably|often|sometimes|start to|begin to|end up))* (?:think|thinking|believe|believing|feel|feeling)(?: like| that)?|\b(?:don'?t|do not|never) (?:think|believe)(?: that)?|\b(?:easy|tempting|natural|normal|common|understandable) to (?:think|believe|feel)(?: like| that)?|\bmakes? (?:you|u) (?:think|believe|feel)(?: like| that)?)(?: (?:that|maybe|honestly|really|literally|just|actually|sometimes|totally|completely|right now))* )`;
const asRules = (list) => list.map((src) => new RegExp(src, 'i'));
// A feeling reads them all, without those two exceptions: from the writer, "don't kill yourself" or "it can feel
// like nobody would miss you" may be about themselves, and holding it back with support is the careful answer.
const INCITES_IN_FEELING = asRules([TELL_HARM, KYS, SHOULD_DIE, NOT_MISSED, BETTER_WITHOUT, HATED]);
const INCITES_IN_PERSPECTIVE = asRules([NOT_SAID + TELL_HARM, KYS, SHOULD_DIE, AS_IT_FEELS + NOT_MISSED, AS_IT_FEELS + BETTER_WITHOUT, AS_IT_FEELS + HATED]);
const incites = (readings, list) => readings.some((r) => {
  const t = r.replace(SAYINGS, (m) => ' '.repeat(m.length));
  return list.some((re) => re.test(t));
});
// For perspectives only: harmful advice and the questions groomers ask. Blocking a catcher's words needs no
// clinical judgement; what perspectives may say beyond this is for the clinical review. Advice, not the bare words
// (Tier 0 review): "You'll feel lighter after a good rest", "Losing weight isn't the point, you matter as you are",
// "Please don't stop taking your meds without talking to your GP" and "what school of thought…" all pass.
const WEIGHT = String.raw`(?:(?:some|a bit of|a little|a few|a few more|more|extra) )?(?:weight|kilos?|kgs?|pounds|lbs)\b`;
const MEDS = String.raw`(?:your |ur )?(?:meds|medication|medicine|tablets|pills|antidepressants)\b`;
// stopping only with a doctor, or slowly, beside a "not" earlier in the sentence, is care: "I'd never tell you to stop
// taking your meds without checking with your GP"; on its own ("Stop taking your meds without asking your doctor") it isn't
const SAID_NOT = String.raw`\b(?:don'?t|do not|dont|never|not|shouldn'?t|should not|mustn'?t|wouldn'?t|won'?t)\b[^.!?]{0,60}`;
const WITH_CARE = String.raw` (?:without (?:first )?(?:talking|speaking|asking|checking)(?: (?:to|with))? (?:your |a |the )?(?:doctor|gp|pharmacist|psychiatrist|prescriber|nurse)|suddenly|cold turkey|on your own|by yourself|all at once)\b`;
const HARMFUL_ADVICE = asRules([
  // eating less, losing weight, counting calories: as advice; and verdicts on a body
  String.raw`${NOT_SAID}\b(?:skip(?:ping)?|stop eating|eat less|cut out|don'?t eat|starve)\b[^.!?]{0,20}\b(?:dinner|lunch|breakfast|meals?|food|carbs|eating)\b`
    + String.raw`|\b(?:(?:you|u|ya)(?: (?:really|honestly|probably|seriously|just))? (?:should|could|need to|ought to|have to|must|gotta|got to|might want to|may want to|could stand to)|(?:try|start)(?: to| and)?|maybe|just|why not|time to|go and)(?: just| really)? (?:lose|drop|shed) ${WEIGHT}`
    + String.raw`|\b(?:try|start) (?:losing|dropping|shedding) ${WEIGHT}|\bif (?:you|u) (?:lost|lose|dropped|drop|shed) ${WEIGHT}|(?:^|[.!?;:\n]\s*)(?:lose|drop|shed) ${WEIGHT}`
    + String.raw`|\b(?:losing|dropping|shedding) ${WEIGHT} (?:would|will|might|could|should) (?:help|fix|solve|sort|make)\b`
    + String.raw`|\beat (?:less than|under|below|no more than|only) \d+|\b(?:only|just) (?:eat|have) \d+ ?(?:cal|cals|calories|kcal)\b|\b\d{3,4} ?(?:cal|cals|calories|kcal) (?:a|per) day\b`
    + String.raw`|${NOT_SAID}\bcut (?:back on |down on )?(?:your |ur )?(?:calories|cals)\b|\b(?:you|u) (?:should|need to|could|must|have to|gotta) (?:count|track) (?:your |ur )?(?:calories|cals|macros)\b|\b(?:try|start) (?:counting|tracking) (?:your |ur )?(?:calories|cals|macros)\b`
    + String.raw`|\b(?:you(?:'re| are)|ur|u r) (?:so |too |really )?(?:fat|ugly|disgusting|a waste of space)\b`,
  // stopping medication, unless the words say not to, or to stop only with a doctor
  String.raw`${NOT_SAID}(?:(?<!${SAID_NOT})\bstop (?:taking )?${MEDS}|\bstop (?:taking )?${MEDS}(?!${WITH_CARE}))|\b(?:meds|medication|antidepressants|pills) (?:are|is) (?:poison|bad for you|a scam|a lie)\b`,
  String.raw`\b(?:drink|get drunk|get high|smoke (?:weed|a joint|a cone)|take (?:a |some )?(?:pills?|xanax|valium|benzos?))\b[^.!?]{0,12}\b(?:until|till|til|to) (?:you )?(?:forget|feel (?:better|nothing)|numb|cope|pass out)\b`,
  String.raw`\bhow old (?:are|r) (?:you|u)\b|\bwhere (?:do |d )?(?:you|u) live\b|\b(?:what|which) school (?:do|did|are|r) (?:you|u)\b|\b(?:we|let'?s|wanna|want to) (?:should )?meet (?:up|irl|in person)\b|\b(?:send|show) (?:me )?(?:a |some )?(?:pics?|photos?|nudes|selfies?)\b|\bare (?:you|u) (?:single|a (?:girl|boy|guy))\b`,
  String.raw`\bbecause (?:you|u) (?:provoke|provoked|asked for|deserve|deserved|let) (?:him|her|them|it)\b`,
]);
// a feeling that quotes what someone said to the writer is harassment, answered with care, not refused
const REPORTED_SPEECH = /\b(?:said|says|told|tells|telling|keeps? saying|kept saying|messag\w*|text(?:s|ed)|wrote|writes|posted|comment\w*|called me|dm(?:s|ed|'d)?|replied|yelled|shouted)\b/i;
// ...but said to themselves ("I keep telling myself kys", "my head tells me…"), they're the writer's own (Tier 0 review)
const SELF_TALK = /\b(?:tell(?:s|ing)?|told|say(?:s|ing)?|said|remind(?:s|ing|ed)?)(?: to)? myself\b|\b(?:my (?:head|brain|mind|thoughts?)|a voice|the voices?|voices) (?:say|says|said|tell|tells|told|keeps? (?:saying|telling))\b/i;

const UNKIND = [
  /\b(?:you(?:'re| are)?|ur|u r)\s+(?:(?:so|being|just|really|very|kind of|a bit)\s+){0,3}(?:stupid|pathetic|worthless|an? idiot|a loser|weak|dramatic|overreacting|crazy|insane|selfish|ridiculous|a baby|attention[- ]seeking)\b/i,
  /\b(?:get over it|grow up|man up|toughen up|stop whining|stop being (?:so )?(?:dramatic|sensitive))\b/i,
  /\b(?:kill yourself|kys)\b/i,
  /\bnobody (?:cares|likes you)\b/i,
];

const DIAGNOSIS = [
  /\b(?:you|they|he|she|your friend|your boss)\b[^.!?]{0,24}?\b(?:have|has|got|is|are|be|being|'re|'s|suffer(?:s|ing)? from)\s+(?:an?\s+|some\s+)?(?:clinical\s+)?(?:depression|depressed|anxiety disorder|an anxiety disorder|adhd|bpd|borderline|ptsd|ocd|bipolar|autis\w*|narcissis\w*|narcissist|psychopath|sociopath|a personality disorder)\b/i,
  /\bsounds like (?:depression|anxiety|adhd|bpd|ptsd|ocd|bipolar|narcissis\w*)\b/i,
  /\b(?:narcissists?|psychopaths?|sociopaths?)\b/i,                          // a label for a person, however it's put
];

const CERTAINTY = /\b(?:definitely|obviously|clearly|for sure|certainly|100%|without a doubt)\b/i;

const words = (s) => normaliseText(s).toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').split(/\s+/).filter((w) => w.length > 2);
export function similarity(a, b) {
  const A = new Set(words(a)); const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both);
}

const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const supportFail = (safety, readings) => {
  const support = supportOf(safety, readings.join('\n'));
  return fail('support', support.message, { level: safety.level, support });
};

/**
 * A feeling about to be released.
 * → { ok: true, text } | { ok: false, code, message } | { ok: false, code: 'support', level, support }
 */
export function screenFeeling(input, { minChars = 3, maxChars = 500 } = {}) {
  const text = normaliseText(input);
  if (!text) return fail('empty', 'Write a thought or a feeling first.');
  // Safety comes before length (Tier 0): crisis words in a feeling a little too long still get support,
  // rather than "try the heart of it", which could mean trimming exactly those words.
  const reads = readingsOf(input, text, maxChars);
  const safety = safetyOfAll(reads);
  // never released to strangers and never sent to an AI provider
  if (!safety.reframeAppropriate) return supportFail(safety, reads);
  if (incites(reads, INCITES_IN_FEELING)) {
    // words telling someone to hurt themselves: when they're what someone said to the writer, that's harassment;
    // otherwise the writer may be saying them to themselves, and the crisis screen is the careful answer (Tier 0 review)
    const all = reads.join('\n');
    return supportFail(REPORTED_SPEECH.test(all) && !SELF_TALK.test(all) ? { level: 'care', category: 'harassment' } : { level: 'crisis' }, reads);
  }
  if (charCount(text) < minChars) return fail('too-short', 'Tell us a little more, even a few words.');
  if (charCount(text) > maxChars) return fail('too-long', `Feelings can be up to ${maxChars} characters. Try the heart of it.`);
  const probe = probeOf(text);
  // (the length was checked on the words as written: the probe can be longer, e.g. "…" becomes "...")
  const rules = checkMessage(withoutHelplines(probe), { maxChars: Infinity });
  if (!rules.ok) {
    const msg = rules.code === 'money' ? rules.message
      : 'Please leave out contact details, links and anything that could identify you or someone else. Other people will read this.';
    return fail(rules.code, msg);
  }
  if (IDENTIFYING.some((re) => re.test(probe))) {
    return fail('identifying', 'Please leave out names, addresses and anything that could identify you or someone else.');
  }
  return { ok: true, text };
}

/**
 * A perspective someone offers. `earlier` are the perspectives already given.
 * → { ok: true, text, nudges[] } | { ok: false, code, message } | { ok: false, code: 'support', level, support }
 * Words suggesting the writer (or someone) may not be safe are answered with support for the writer,
 * and never passed on. nudges (non-blocking, for the interface): 'certainty'
 */
export function screenReframe(input, { minChars = 8, maxChars = 280, earlier = [], threshold = 0.8 } = {}) {
  const text = normaliseText(input);
  if (!text) return fail('empty', 'Write a possibility first.');
  // safety before length, as for feelings
  const reads = readingsOf(input, text, maxChars);
  const safety = safetyOfAll(reads);
  if (!safety.reframeAppropriate && safety.level === 'crisis') return supportFail(safety, reads);
  if (!safety.reframeAppropriate) {
    return fail('unsafe', 'This one can’t be passed on: it touches on something that needs real support rather than a new angle. If you or someone else is in danger, please call 000.');
  }
  if (incites(reads, INCITES_IN_PERSPECTIVE)) return fail('unkind', 'This can’t be passed on. Perspectives here are for kindness, never for telling anyone to hurt themselves.');
  if (reads.some((r) => HARMFUL_ADVICE.some((re) => re.test(r)))) return fail('unsafe', 'This one can’t be passed on: advice about food, weight, medication, drinking or meeting up isn’t something perspectives here can offer, and neither are personal questions. Offer another way of seeing it instead.');
  if (charCount(text) < minChars) return fail('too-short', 'Add a few more words so it can help.');
  if (charCount(text) > maxChars) return fail('too-long', `Perspectives can be up to ${maxChars} characters. Short and kind works best.`);
  // within maxChars, the readings hold every word
  if (reads.some((r) => UNKIND.some((re) => re.test(r)))) return fail('unkind', 'That might land as harsh. Offer a possibility, not a verdict.');
  if (reads.some((r) => DIAGNOSIS.some((re) => re.test(r)))) return fail('diagnosis', 'Please don’t diagnose anyone. Offer another way of seeing it instead.');
  const probe = probeOf(text);
  const rules = checkMessage(withoutHelplines(probe), { maxChars: Infinity });
  if (!rules.ok) return fail(rules.code, rules.code === 'money' ? rules.message : 'Perspectives can’t include contact details, links or usernames.');
  if (IDENTIFYING.some((re) => re.test(probe))) return fail('identifying', 'Please leave out names, addresses and anything that could identify you or someone else.');
  if (earlier.some((e) => similarity(e, text) >= threshold)) {
    return fail('too-similar', 'Someone has already offered something very close to this. Could you see it another way?');
  }
  return { ok: true, text, nudges: CERTAINTY.test(probe) ? ['certainty'] : [] };
}
