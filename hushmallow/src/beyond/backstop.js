// Another Angle: the gate for the fact-vs-guess framing, and its backstop (review rounds 7 and 8).
//
// The default is flipped (review r8): the framing ("what happened" / "what your mind added", "a guess about what's
// going on inside someone else", "what it means is still an open question", "one way to read it", the worst case,
// "Want to test it?", "Check one fact", "another explanation") is used ONLY when the person's words carry an
// explicit interpretive marker (markers.js), and then only the clause that carries it is the guess. Everything
// else (a stated event, something someone did to them, a feeling, a loss) gets the acknowledging mechanics.
//
// The backstop sits on top of that, independently: a bag of words over the raw lower-cased text with every
// apostrophe taken out, with NO idiom set aside ("lost my keys" and "my phone died" count too). Any of them means
// no framing ever (authored or server) and no playful line; death talk (grief.js) goes to the gentle path, the rest
// to the kind mechanics.
//
//   bagWords(text)       → true when any whole word or phrase of the bag is in the words, the structural loss backstop
//                          fires (lossNear), or death talk does (grief.js deathTalk, its phrase families included)
//   lossNear(text)       → (review r10) a person or a pet word within four words of a loss cue ("covid took my grandad",
//                          "my sister is in the ground now"), or a heartbeat lost at a scan: a bag hit
//   strongLoss(text)     → (review r11) lossNear with the strong cues only (taken from us, a killer that got them, a
//                          heartbeat, unresponsive, buried, an angel, heaven, never woke, couldn't save…): the main
//                          screen's backstop (input-overlay readSafety), where a false alarm costs the support beat
//   unsureLoss(text)     → (owner decision 'Ask when unsure', 14 Oct 2026) nothing above reads a loss, but a person, a pet
//                          or a pregnancy sits beside a softer loss cue: both screens ask "Is this about losing someone?"
//   griefFeeling(id)     → a grief-family feeling chosen (grief, mourning, bereft, heartache, heartbreak, anticipatory grief)
//   lossRoute(text, {emotion}) → 'gentle' | 'ask' | null: how a Tell reaches the gentle path on both screens (final round 3: a
//                          weak death word only about a person or a pet; about someone unknown, 'ask'; about a thing, null)
//   ordinaryOnly(text)   → (review r10) the only bag words are ordinary idioms ("I passed my driving test!"): neutral lines
//   harmWords(text)      → bagWords (the r7 name)
//   harmRoute(text)      → null (no bag word) | 'gentle' (death talk, someone alive but going) | 'kind' (the rest)
//   heavyHarm(text)      → a harm word no ordinary idiom explains (a server loss scene beside one reads as grief)
//   framingAllowed(text) → true only with an interpretive marker and no bag word, death talk or living loss
//   gentleRoute(text)    → true for the words the gentle path answers (death talk, livingLoss)
//   FRAMING_MECHANICS    → the mechanics that play the framing (they never mount without it)
//   framesAsGuess(line)  → true when a line frames what was said as a guess, a forecast, a habit, a label, or sends it
//                          to be checked (every framing the app authors, and the server's equivalents: tests pin them)
//   acknowledges(line)   → a line the gentle path may say: it frames nothing, asks nothing, reframes nothing
//
// Pure ES module, no DOM. Deterministic.

import { norm, blankOrdinary, PERSON, PET, BARE, THING, KILLERS, ORDINALS } from './death-words.js';
import { deathTalk, livingLoss, weakDeath } from './grief.js';
import { hasMarker } from './markers.js';

/**
 * The bag (the coordinator's list, review r8, plus the illness and emergency words review r1 found): read as whole
 * words or phrases over the lower-cased words with every apostrophe out ("didn’t make it" → "didnt make it").
 */
export const BAG = new RegExp(`\\b(?:${[
  'die', 'dies', 'died', 'dying', 'dead', 'death', 'deaths', 'deceased', 'passed', 'pass away', 'passing away', 'passes away',
  'killed', 'kill', 'kills', 'killing', 'murder', 'murders', 'murdered', 'funeral', 'funerals', 'grave', 'graves', 'buried', 'bury', 'burial',
  'cremated', 'cremation', 'ashes', 'grief', 'grieving', 'grieve', 'grieved', 'mourning', 'mourn', 'bereaved', 'bereavement',
  'lost', 'loss', 'gone', 'survive', 'survived', 'surviving', 'didnt make it', 'make it', 'hospital', 'hospitals', 'hospice', 'icu', 'intensive care',
  'life support', 'coma', 'cancer', 'chemo', 'chemotherapy', 'radiotherapy', 'tumour', 'tumor', 'terminal', 'accident', 'accidents', 'crash', 'crashed',
  'overdose', 'overdosed', 'miscarriage', 'miscarried', 'stillborn', 'still born', 'suicide', 'suicidal', 'assault', 'assaulted', 'attack', 'attacked',
  'abused', 'abuse', 'raped', 'rape', 'stabbed', 'drowned', 'run over', 'hit by a car', 'hit by a train', 'hit by a bus', 'ambulance', 'paramedics',
  'a and e', 'a&e', 'resus', 'missing', 'rip',
  // (review r9) misspelt deaths, and the phrasings deathTalk missed: a misspelt or unusual death is never framed
  'ded', 'dided', 'diied', 'dieed', 'diedd', 'dide', 'deid', 'diead', 'dieing', 'dyin', 'deaded', 'six feet under', 'put to sleep', 'no longer with us', 'with us anymore', 'with us any more',
  'is no more', 'hit by a lorry', 'hit by a truck', 'hit by a van', 'hit by a motorbike', 'hit by a tram', 'knocked down', 'pregnancy', 'heaven', 'rainbow bridge', 'vet', 'vets',
  // (review r11) the illness named as the subject ("covid got my grandad", "the virus got him"), and the slang
  'covid', 'covid 19', 'corona', 'coronavirus', 'virus', 'bit the dust', 'carked it', 'karked it', 'copped it', 'met his maker', 'met her maker', 'breathed his last',
  'breathed her last', 'pushing up daisies', 'pushing up the daisies',
].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|')}|${[
  // a person (or pet) word beside "dyed" ("my best friend dyed"), "put him down", "first christmas without", "would have been … birthday"
  `(?:${PERSON}|${PET})s?\\s+(?:[a-z]+\\s+){0,2}dyed`, 'put\\s+(?:him|her|them|it)\\s+(?:down|to\\s+sleep)', 'first\\s+[a-z]+(?:\\s+day)?\\s+without',
  'would\\s+(?:have|ve|of)\\s+(?:been|turned)\\s+(?:[a-z0-9]+\\s+){0,3}(?:birthday|anniversary|bday|\\d+)',
].join('|')})(?![\\p{L}\\p{N}])`, 'iu');
/** Lower case, every apostrophe out, hyphens as spaces (no idiom is ever blanked here). */
const bagText = (text) => String(text ?? '').normalize('NFKC').toLowerCase().replace(/[‘’ʼ`´']/gu, '').replace(/[‐‑-]/gu, ' ').replace(/\s+/gu, ' ');

// ------------------------------------------------------------ the structural loss backstop (review r10) --
// Lists alone never converged (euphemisms, slang, a disease or an accident as the subject, a pregnancy lost), so a
// shape counts too: a person or a pet word within four words (either side) of a word that a loss is told with. It
// only ever takes the framing (and the playful lines) away, so a false alarm costs little; a miss costs a death read
// as a guess. No idiom is set aside here either.
/** A person or a pet ("my nan", "our dog", "grandad", "the baby", "mums"); and him / her / them / he / she / they, only beside one. */
const WHO_WORD = new RegExp(`\\b(?:${PERSON}|${PET})(?:s|es)?\\b`, 'giu');
// (review r11: he / she / they too, "i miss my dad so much since he went")
const PRONOUN = /\b(?:him|her|them|he|she|they|hes|shes|theyre|theyve|theyd)\b/giu;
/** The words a loss is told with (the coordinator's list, review r10), as whole words or phrases. */
const LOSS_CUES = [
  'took', 'taken', 'went', 'gone', 'left us', 'goodbye', 'goodbyes', 'rest', 'resting', 'laid', 'ground', 'angel', 'angels', 'heaven', 'heartbeat',
  'scan', 'unresponsive', 'found', 'succumbed', 'departed', 'croaked', 'snuffed', 'bucket', 'clogs', 'farm', 'shiva', 'sitting', 'buried', 'ashes',
  'urn', 'hospital', 'shuffled', 'never came', 'never come', 'isnt coming', 'is not coming', 'not coming back', 'never coming back', 'isnt around',
  'is not around', 'arent around', 'no longer', 'anymore', 'any more', 'last time', 'would have been', 'wouldve been', 'would of been',
  'anniversary', 'without',
  // (review r11) "my grandad bit the dust"
  'bit the dust',
];
const CUE = new RegExp(`\\b(?:${LOSS_CUES.map((w) => w.replace(/ /g, '\\s+')).join('|')})\\b`, 'giu');
/** "birthday" is a cue only beside "would have been" ("today would have been my nans birthday"). */
const WOULD_HAVE_BEEN = /\bwould\s+(?:have|ve|of)\s+been\b|\bwouldve\s+been\b/iu;
const BIRTHDAY = /\b(?:birthday|bday)\b/giu;
/** A pregnancy lost at a scan: no heartbeat, the heartbeat lost, a scan with "no" or "without" (no person needed). */
const NO_HEARTBEAT = /\b(?:no|without\s+a|lost\s+(?:the|its|his|her|their|a|our\s+babys|the\s+babys|babys))\s+heartbeat\b|\bheartbeat\s+(?:had\s+)?(?:stopped|gone)\b/iu;
const NEAR = 4;
/**
 * A wrong someone did that is told with a cue word ("took credit for my work", "went through my phone", "went behind my
 * back"): the cue is explained by the wrong, so fair anger keeps its own scenes (find_boundary). Nothing else is set aside.
 */
const WRONG_CUES = /\btook\s+(?:the\s+|all\s+the\s+|all\s+)?credit\b|\bwent\s+behind\s+(?:my|our|his|her|their)\s+backs?\b|\bwent\s+through\s+(?:all\s+)?(?:my|our)\s+(?:phone|messages|texts|things|stuff|bag|room|diary|journal|emails?|drawers?|pockets?|private\s+\w+|laptop|wallet|purse|notes|letters)\b/giu;
/**
 * A cue word in a sense no loss is told in (measured on ordinary worries, review r10): a time it took ("took ages to
 * reply"), a thing taken ("took my phone"), left out ("went without me"), a mood ("went quiet"), an everyday place ("went
 * to the cinema"), "found out", "the rest of", "sitting next to", a forgotten anniversary. Only these cue words go; the
 * person stays, so any other cue beside them still counts ("went to work and never came home").
 */
const CUE_ASIDE = new RegExp([
  '\\btook\\s+(?:ages|forever|so\\s+long|too\\s+long|longer|a\\s+(?:long\\s+|little\\s+|short\\s+)?(?:time|while)|hours|minutes|days|weeks|months|\\d+\\s+[a-z]+|an?\\s+(?:hour|minute|day|week|month|age|second|look|photo|picture|selfie|break|nap|shower|bath|walk))\\b',
  '\\btook\\s+(?:my|our|his|her|their|the)\\s+(?:phone|charger|seat|place|spot|stuff|things|food|clothes|jumper|hoodie|book|pen|money|keys?|car|bike|turn|side|ideas?|photo|picture|bag|lunch|chips|sweets|snacks|drink|homework|notes|laptop|tablet|ipad|controller|remote|headphones|earbuds|room|bed|bus|train|advice)\\b',
  '\\bwithout\\s+(?:me|us|asking|telling|warning|permission|a\\s+word|knocking|thinking|looking)\\b',
  // (review r11) "went to bed without saying goodnight", "left the room without saying goodbye" (someone alive, in a mood)
  '\\bwithout\\s+(?:even\\s+)?(?:saying|a)\\s+(?:goodbye|goodnight|good\\s+night|night|bye|hello|hi|hey|a\\s+word|anything|thanks|thank\\s+you|sorry)\\b',
  '\\bwent\\s+(?:all\\s+)?(?:quiet|silent|red|mad|crazy|ballistic|mental|off\\s+on\\s+one|on\\s+and\\s+on|on\\s+about|off\\s+at\\s+me|shopping|clubbing)\\b',
  '\\bwent\\s+(?:out\\s+)?(?:to|for)\\s+(?:the\\s+|a\\s+|an\\s+|my\\s+|his\\s+|her\\s+|their\\s+|our\\s+|some\\s+)?(?:cinema|movies|pictures|shops?|shopping|supermarket|park|pub|bar|club|party|gym|school|college|uni|university|work|office|beach|match|game|concert|gig|festival|restaurant|cafe|town|city|library|zoo|pool|meeting|toilet|loo|bathroom|kitchen|class|classes|lesson|lessons|practice|training|interview|dentist|mall|prom|disco|sleepover|bowling|lunch|dinner|breakfast|brunch|tea|coffee|drinks?|a\\s+drink|a\\s+walk|a\\s+run|a\\s+meal|a\\s+curry|a\\s+pizza|nandos|mcdonalds|the\\s+pictures|church|mass|the\\s+mosque|mosque|temple|the\\s+match|football|rugby|netball|swimming|dancing|holiday|camp|the\\s+doctors?|the\\s+gp|hers|his|theirs|someone\\s+elses|a\\s+friends|her\\s+friends|his\\s+friends)\\b',
  // (review r12) a thing of theirs found ("my friend found my old diary"): never a person found
  '\\bfound\\s+(?:my|our|his|her|their|the|a|an|some|all\\s+my)\\s+(?:old\\s+|secret\\s+|new\\s+|private\\s+|hidden\\s+|little\\s+)?(?:diary|diaries|journal|phone|messages|texts|letters?|notes?|stuff|things|keys|wallet|purse|bag|book|books|photos?|pictures?|card|cards|present|presents|gift|gifts|homework|drawings?|search\\s+history|browser\\s+history|history|vape|cigarettes|stash|toys?|ball|charger|money|receipts?|tickets?|passport|ring|watch|necklace|earrings?|glasses|shoes?|coat|jumper|hoodie|clothes|sweets|chocolate|snacks|socks|account|instagram|tiktok|finsta|blog|poems?|song|songs|videos?|browser|laptop|tablet|ipad|games?|report|results?|grades?|essay|exam|test)\\b',
  '\\bfound\\s+out\\b', '\\b(?:the\\s+)?rest\\s+of\\b', '\\bsitting\\s+(?:next\\s+to|with|beside|by\\s+me|on|at|in|there|here|alone|around|together|opposite)\\b',
  '\\bforgot\\s+(?:about\\s+)?(?:our|my|the|his|her|their)\\s+(?:wedding\\s+)?anniversary\\b',
  // (review r12) someone alive and busy, or off with someone else: "resting after her shift", "said goodbye to everyone but me",
  // "is never around any more"
  '\\bresting\\s+(?:after|before|from|on|in|up|at)\\s+(?:her|his|their|the|a|my|work|bed|home)\\b', '\\bgoodbyes?\\s+to\\s+(?:everyone|everybody|all\\s+of\\s+them|the\\s+(?:class|team|group|others))\\b',
  '\\b(?:is|s|are|re)\\s+never\\s+(?:around|home|here|in|about|there)\\s+any\\s*more\\b',
  // (review r11) went out, home, upstairs, to bed, off with, round to ("my girlfriend went out with her friends tonight");
  // "anymore" closing "want to be my friend anymore", "like me anymore" (someone alive, cooling off)
  '\\bwent\\s+(?:out|home(?!\\s+to\\s+(?:be\\s+with|jesus|god|the\\s+lord|glory|heaven|(?:his|her|their)\\s+(?:maker|saviour|savior|lord)))|upstairs|downstairs|up\\s+to\\s+(?:bed|her\\s+room|his\\s+room|their\\s+room)|to\\s+bed|to\\s+sleep\\s+for\\s+the\\s+night|off\\s+with|out\\s+with|round\\s+to|over\\s+to|back\\s+to\\s+(?:work|school|bed|uni|college|the\\s+office))\\b',
  '\\b(?:want|wants|wanna|wanted)\\s+to\\s+be\\s+(?:my|our)\\s+(?:best\\s+)?(?:friend|mate|bestie|girlfriend|boyfriend|partner)s?\\s+any\\s*more\\b',
  '\\b(?:like|likes|liked|love|loves|care\\s+about|cares\\s+about|want|wants|need|needs|trust|trusts|talk\\s+to|talks\\s+to|text|texts|call|calls|invite|invites|fancy|fancies|rate|rates)\\s+(?:me|us)\\s+any\\s*more\\b',
].join('|'), 'giu');
/** Each word's index for a character offset (the words of `t`). */
function wordAt(t) {
  const starts = [...t.matchAll(/[\p{L}\p{N}&]+/gu)].map((m) => m.index);
  return (i) => { let lo = 0, hi = starts.length - 1, k = 0; while (lo <= hi) { const mid = (lo + hi) >> 1; if (starts[mid] <= i) { k = mid; lo = mid + 1; } else hi = mid - 1; } return k; };
}
const spans = (t, re, at) => [...t.matchAll(re)].map((m) => [at(m.index), at(m.index + m[0].length - 1)]);
/**
 * True when a person or a pet word (or him / her / them, with one named) sits within four words of a loss cue, or
 * the words tell of a heartbeat lost at a scan. A bag hit (bagWords): no framing anywhere, and no playful line.
 */
export function lossNear(text) {
  // (a wrong told with a cue word, or a cue word in a sense no loss is told in, is taken out: it neither counts nor
  // stands between a person and another cue, "my dog went to the park and never came back")
  const t = bagText(text).replace(WRONG_CUES, ' ').replace(CUE_ASIDE, ' ');
  if (NO_HEARTBEAT.test(t) || (/\bscan\b/iu.test(t) && /\b(?:no|without)\b/iu.test(t))) return true;
  const at = wordAt(t);
  const who = spans(t, WHO_WORD, at);
  if (!who.length) return false;
  who.push(...spans(t, PRONOUN, at));
  const cues = spans(t, CUE, at);
  if (WOULD_HAVE_BEEN.test(t)) cues.push(...spans(t, BIRTHDAY, at));
  cues.push(...gotCues(t, at));
  return near(who, cues);
}
const near = (who, cues) => who.some(([a, b]) => cues.some(([c, d]) => Math.max(0, c - b, a - d) <= NEAR));
/** Who can be the subject of "got" without it being a loss ("my sister got the bigger room", "when I got home"). */
const GOT_SUBJECT_NOT = new RegExp(`^(?:i|im|ive|id|we|you|he|she|they|it|its|who|that|which|this|there|everyone|everybody|someone|somebody|nobody|people|all|both|us|me|and|or|but|just|also|finally|then|never|only|(?:${PERSON}|${PET})(?:s|es)?)$`, 'iu');
/**
 * (review r11) "got" is a cue only when something that is not a person got them ("the virus got my grandad", "the big c
 * got my dad", "that illness got her"): never "my brother got a new job", "I got home".
 */
function gotCues(t, at) {
  const out = [];
  for (const m of t.matchAll(/\b([a-z0-9]+)\s+(?:(?:has|had|have|finally|eventually|then|just|also|in\s+the\s+end|sadly)\s+)*(?:got|gets)\b/giu)) {
    if (GOT_SUBJECT_NOT.test(m[1])) continue;
    const g = m.index + m[0].lastIndexOf('got') + (m[0].endsWith('gets') ? -1 : 0);
    out.push([at(Math.max(m.index, g)), at(m.index + m[0].length - 1)]);
  }
  return out;
}

// ------------------------------------------------------------ the main screen's strong loss cues (review r11) --
// On the main screen a false alarm opens the support beat (a costlier step than Another Angle's kind mechanics), so
// only the strong cues count there: never went, left, gone, goodbye, without, anymore, found, sitting, rest, last
// time or a birthday on their own. The full bag and the weak cues (lossNear) stay inside Another Angle.
const STRONG = [
  // taken from us ("a drunk driver took my brother from us"), a killer that got them ("the virus got my grandad")
  '\\b(?:took|taken|stole|stolen|snatched|ripped)\\s+(?:[a-z]+\\s+){1,6}?(?:away\\s+)?from\\s+(?:us|this\\s+world|the\\s+world|our\\s+family|our\\s+lives)\\b',
  `\\b(?!(?:flu|sickness)\\b)(?:${KILLERS}|(?:the\\s+)?(?:c|illness|disease|sickness|infection))\\s+(?:(?:has|had|finally|eventually|then|in\\s+the\\s+end|cruelly|sadly)\\s+)*(?:got|gets|took|taken|claimed|stole)\\b`,
  // a heartbeat (never "in a heartbeat", "heard the heartbeat"), unresponsive, succumbed, departed
  '\\bheartbeats?\\b', '\\bheart\\s+(?:stopped|gave\\s+out|gave\\s+up|failed)\\b', '\\bunresponsive\\b',
  '\\bsuccumbed\\b(?!\\s+to\\s+(?:the\\s+)?(?:temptation|peer\\s+pressure|pressure|urge|sleep|exhaustion|boredom|charm|my\\s+charm|tiredness|hunger|cravings?|sales|hype))',
  '\\bdeparted\\b(?!\\s+(?:from\\s+(?:the\\s+)?(?:station|airport|platform|gate|port|terminal|school|office|party|house|room|stage)|at\\s+\\d|on\\s+time|late|early|for|to)\\b)',
  // buried, ashes, an urn, an angel, heaven (never the idioms: "the Ashes", "a tea urn", "such an angel", "thank heavens")
  '\\bburied\\b', '\\bashes\\b', '\\burns?\\b', '\\bangels?\\b', '\\bheaven\\b',
  // laid to rest, in the ground, shiva, never came back or home, never woke, couldn't save, would have been + an ordinal
  '\\blaid\\s+(?:(?:him|her|them|my|our|his|the)\\s+(?:[a-z]+\\s+){0,2})?to\\s+rest\\b', '\\bin\\s+the\\s+ground\\b', '\\bshiva\\b',
  '\\bnever\\s+(?:came|come|made\\s+it)\\s+(?:back|home)\\b',
  '\\bnever\\s+(?:woke|awoke|woken)(?:\\s+up)?\\b(?!\\s+(?:me|us|him|her|them|in\\s+time|on\\s+time|early|once|all\\s+night|at\\s+all|for|during|before|until|till)\\b)',
  '\\b(?:couldnt|could\\s+not|werent\\s+able\\s+to|were\\s+unable\\s+to|wasnt\\s+able\\s+to|was\\s+unable\\s+to|failed\\s+to)\\s+(?:save|revive|resuscitate)\\b(?!\\s+(?:[a-z]+\\s+){0,3}?(?:a\\s+(?:seat|place|spot|space|slice|bit|copy)|money|time|up|enough|any|the\\s+(?:file|game|work|document|photos?)|my\\s+(?:file|game|work|document|photos?))\\b)',
  `\\b(?:would\\s+(?:have|ve|of)|wouldve)\\s+(?:been|turned)\\s+(?:[a-z]+\\s+){0,3}?(?:\\d+(?:st|nd|rd|th)?|${ORDINALS})\\b`,
];
const STRONG_CUE = new RegExp(STRONG.join('|'), 'giu');
/** The strong cues' ordinary senses, taken out first (no loss is told in them). */
const STRONG_ASIDE = new RegExp([
  '\\bin\\s+a\\s+heartbeat\\b',
  '\\b(?:heard|hear|hearing|saw|see|seeing|seen|strong|healthy|good|lovely|beautiful|fast|normal|steady|regular|great|perfect|first|little|amazing)\\s+(?:a\\s+|the\\s+|its\\s+|his\\s+|her\\s+|their\\s+|our\\s+babys\\s+|the\\s+babys\\s+|babys\\s+|a\\s+strong\\s+|a\\s+healthy\\s+|the\\s+little\\s+)?heartbeats?\\b',
  '\\bheartbeats?\\s+(?:was|is|were|are|looked|sounded)\\s+(?:so\\s+|really\\s+|nice\\s+and\\s+)?(?:strong|fine|normal|healthy|good|perfect|great|lovely|steady|fast)\\b',
  '\\b(?:the|watch\\w*|follow\\w*)\\s+ashes\\s+(?:test|series|match|cricket|tour|on\\s+(?:tv|the\\s+radio))\\b|\\bwatching\\s+the\\s+ashes\\b|\\btea\\s+urns?\\b',
  '\\b(?:(?:such|what|absolute|total|real|proper|little|actual|perfect|been|being|is|was|s|like|my|our|bit\\s+of)\\s+)+(?:an?\\s+)?(?:(?:absolute|total|real|proper|little|actual|perfect)\\s+)?angel\\b(?!\\s+(?:now|in\\s+heaven|above|watching|up\\s+there|in\\s+the\\s+sky|with|forever|for\\s+ever)\\b)',
  '\\bangel\\s+(?:delight|cake|food|hair|wings?\\s+costume|costume|number|numbers)\\b|\\bhells\\s+angels\\b|\\bcharlies\\s+angels\\b|\\bguardian\\s+angel\\s+(?:card|necklace|keyring)\\b',
  '\\b(?:thank|thanks|good|for)\\s+heavens?\\b|\\bheavens?\\s+(?:knows|forbid|sake|above|help)\\b|\\bseventh\\s+heaven\\b|\\bheaven\\s+on\\s+earth\\b|\\b(?:is|was|s|pure|absolute|sheer|like|smells\\s+like|tastes\\s+like|looks\\s+like|felt\\s+like|feels\\s+like)\\s+(?:pure\\s+|absolute\\s+|sheer\\s+)?heaven\\b',
  '\\bburied\\s+(?:a|the|his|her|its|their|my)\\s+(?:bone|ball|toy|treasure|time\\s+capsule|head|face|nose|hands|feelings)\\b',
  '\\b(?:holes?|dig\\w*|dug|plant\\w*|seeds?|bulbs?|stuck|stakes?|posts?|sank|sink\\w*|spade|frozen|wet|muddy|footprints?)\\s+(?:[a-z]+\\s+){0,3}?in\\s+the\\s+ground\\b',
].join('|'), 'giu');
/** A scan with "no" or "without" near it, never good news ("the scan showed no problems", "no big deal"). */
const SCAN_NO = /\bscans?\b(?:\s+[a-z]+){0,5}?\s+(?:no|without)\b(?!\s+(?:problems?|issues?|worries|concerns?|signs?\s+of\s+(?:cancer|anything|any|a\s+tumou?r|spread|disease|infection)|cancer|tumou?rs?|changes?|spread|growth|damage|fractures?|breaks?|big\s+deal|need|charge|appointment|wait|queue|pain|bother|longer|one|abnormalit\w*|bleed\w*|clots?|infection|lumps?|shadows?|stones?|cysts?)\b)/iu;
/**
 * The main screen's loss backstop (review r11): a person or a pet word (or him / her / them / he / she / they, with one
 * named) within four words of a STRONG loss cue only, or a heartbeat lost at a scan (no person needed). Read with the
 * ordinary idioms blanked (death-words.js) and the cue words' ordinary senses set aside. input-overlay readSafety
 * reads it as concern / loss: never a Thought Mallow made of a death.
 */
export function strongLoss(text) {
  const raw = blankOrdinary(norm(text)).toLowerCase();
  // (review r12) a person's thing is never the person: "the fire got my dads car" names a car
  const t = raw.replace(WRONG_CUES, ' ').replace(CUE_ASIDE, ' ').replace(STRONG_ASIDE, ' ').replace(OWNED_THING, ' ').replace(/\s+/gu, ' ');
  if (!/\p{L}/u.test(t)) return false;
  if (NO_HEARTBEAT.test(t) || SCAN_NO.test(t)) return true;
  const at = wordAt(t);
  const who = spans(t, WHO_WORD, at);
  if (!who.length) return false;
  who.push(...spans(t, PRONOUN, at));
  return near(who, spans(t, STRONG_CUE, at));
}
/** A person's or a pet's thing ("my dads car", "our dogs lead"): the owner's word goes, the thing stays. */
const OWNED_THING = new RegExp(`\\b(?:${PERSON}|${PET})s\\s+(?=(?:${THING})\\b)`, 'giu');

// ------------------------------------------------- not sure: ask (owner decision 'Ask when unsure', 14 Oct 2026) --
// Five semantic reviews kept finding new ways to say that someone died, and no word list catches them all. So when the
// words name a person, a pet or a pregnancy and carry any softer loss cue, but nothing above reads a death or a loss,
// the app is not sure: it asks ("Is this about losing someone?") instead of guessing. A false alarm costs one tap.
/** A pregnancy or a baby: "the scan", "at 8 weeks", "the bleeding started", "no heartbeat", "I miscarried". */
const PREG_WORD = /\b(?:pregnan(?:cy|cies|t)|bab(?:y|ys|ies)|scans?|weeks?|bleeding|bled|heartbeat|miscarr\w*)\b/giu;
/**
 * The softer loss cues (the owner's broad list, on purpose): gone, went, left, let … go, with us, here any more, any
 * longer, isn't here, never got to, won't see, here to see me, (never) recovered, breathing, found, lost, without, took,
 * taken, got / won / beat (something that is not a person did it), that was it, the end, the other side, cross over,
 * join them, be with them, heaven, God, the Lord, Jesus, glory, an angel, wings, at rest, peaceful(ly), the vet, the
 * doctors, hospital, intensive care, life support, war, viable, terminate, stopped growing, "it was over", "grandas
 * away", asleep, the last time, goodbye.
 */
const SOFT = new RegExp([
  '\\bgone\\b', '\\bwent\\b', '\\bleft\\b', '\\blet\\s+(?:[a-z]+\\s+){1,3}?go\\b(?!\\s+(?:of|out|outside|off|first|on\\s+the))', '\\b(?:not|isnt|arent|wasnt|werent|no\\s+longer)\\s+(?:here\\s+)?with\\s+us\\b',
  '\\bhere\\s+any\\s*more\\b', '\\bany\\s+longer\\b', '\\b(?:isnt|is\\s+not|not|arent|wasnt|aint)\\s+(?:even\\s+|really\\s+)?(?:here|there|around)\\b',
  '\\bnever\\s+(?:got|get|gets|had\\s+the\\s+chance|got\\s+the\\s+chance)\\s+to\\b', '\\b(?:wont|will\\s+not|will\\s+never|wont\\s+ever|never\\s+will|cant|cannot)\\s+(?:ever\\s+)?(?:see|get\\s+to\\s+see|be\\s+(?:there|here|at|around)|meet|hold|hear|walk\\s+me|watch|know|come\\s+to)\\b',
  '\\b(?:didnt|did\\s+not|never)\\s+(?:see|reach|make\\s+it\\s+to|live\\s+to\\s+see|get\\s+to\\s+see)\\s+(?:his|her|their)\\b', '\\bmoved\\s+on\\b(?!\\s+(?:to|from))',
  '\\bup\\s+(?:there|above|in\\s+the\\s+(?:sky|stars|clouds))\\b', '\\b(?:in|among|with)\\s+the\\s+(?:stars|clouds)\\b',
  '\\b(?:here|there|around|alive)\\s+to\\s+(?:see|watch|meet|hear|hold)\\b', '\\brecovered\\b', '\\bbreathing\\b', '\\bfound\\b', '\\blost\\b', '\\bwithout\\b', '\\btook\\b', '\\btaken\\b',
  '\\bthat\\s+was\\s+(?:it|that)\\b', '\\b(?:at|near|to|till|until)\\s+the\\s+(?:very\\s+)?end\\b(?!\\s+of)', '\\bthe\\s+end\\s*(?:$|[.,!?;:…])', '\\bother\\s+side\\b(?!\\s+of)',
  '\\bcross(?:ed|es|ing)?\\s+over\\b(?!\\s+(?:the\\s+(?:road|street|bridge|river|line|border|field|car\\s+park)|to\\s+(?:the\\s+)?(?:road|street|other\\s+side\\s+of)))',
  `\\bjoin(?:ed|s|ing)?\\s+(?:him|her|them|(?:(?:my|our|his|her|their)\\s+)?(?:[a-z]+\\s+)?(?:${PERSON}|${BARE}|${PET})s?)\\b`,
  `\\bbe\\s+with\\s+(?:him|her|them|(?:(?:my|our|his|her|their)\\s+)?(?:[a-z]+\\s+)?(?:${PERSON}|${BARE}|${PET})s?)\\b`,
  `\\b(?:is|s|are|re)\\s+with\\s+(?:(?:my|our|his|her|their)\\s+)?(?:${PERSON}|${BARE})s?\\s+now\\b`,
  '\\bheavens?\\b', '\\b(?:with|to|by|in|home\\s+to|meet|met|before)\\s+(?:god|the\\s+lord|jesus|his\\s+maker|her\\s+maker)\\b', '\\b(?:god|the\\s+lord|jesus)\\s+(?:took|has\\s+(?:taken|him|her)|called|wanted|needed|has\\s+got)\\b',
  '\\bgods\\s+(?:arms|hands|house|garden|side|kingdom)\\b', '\\bglory\\b', '\\bangels?\\b', '\\bwings\\b', '\\b(?:at|to|laid\\s+to|now\\s+at|finally\\s+at|eternal|her|his|their)\\s+rest\\b(?!\\s+of)',
  '\\brest(?:ing)?\\s+(?:now|peacefully|in\\s+peace|easy|with)\\b', '\\bpeaceful(?:ly)?\\b', '\\bvets?\\b', '\\bdoctors?\\b', '\\bhospitals?\\b', '\\bintensive\\s+care\\b', '\\bicu\\b', '\\blife\\s+support\\b',
  '\\bwars?\\b', '\\bviable\\b', '\\bterminat(?:e|ed|es|ing|ion)\\b', '\\bstopped\\s+(?:growing|developing)\\b',
  '\\b(?:it|all|everything|its|it\\s+was|it\\s+is|it\\s+had\\s+been)\\s+(?:was\\s+|is\\s+|s\\s+)?over\\b(?=\\s*(?:$|[.,!?;:…]|(?:and|but|so|then|by|within|before|after|when|in\\s+(?:a|minutes|seconds|hours|days))\\b))',
  `\\b(?:${PERSON}|${BARE}|${PET})s\\s+away\\b`, '\\b(?:is|s|was|are|has\\s+gone|had\\s+gone|gone|slipped|passed)\\s+away\\b(?!\\s+(?:on|for|at|in|with|until|till|til|this|next|from|to|travelling|traveling|working|abroad|again))',
  '\\basleep\\b', '\\blast\\s+time\\b', '\\bgoodbyes?\\b', '\\b(?:never|didnt|did\\s+not)\\s+(?:came|come)\\s+(?:back|home)\\b',
  '\\b(?:no\\s+longer|not|isnt|arent|wasnt)\\s+(?:in\\s+(?:any\\s+)?pain|suffering|hurting)(?:\\s+any\\s*more)?\\b',
].join('|'), 'giu');
/** The softer cues' everyday senses, taken out first (on top of CUE_ASIDE and WRONG_CUES). */
const SOFT_ASIDE = new RegExp([
  // left a room, a group, early, for work, someone on read; went well or badly
  '\\bleft\\s+(?:me|us|him|her|them)\\s+on\\s+(?:read|seen|delivered)\\b', '\\bleft\\s+(?:me|us)\\s+out\\b',
  '\\bleft\\s+(?:the|a|our|my|his|her|their)\\s+(?:room|house|flat|party|chat|group|group\\s+chat|table|game|server|class|lesson|meeting|office|building|pub|club|bar|kitchen|car|bus|train|dishes|washing|lights?|door|window|tap|oven|message|note|comment|review|voicemail|bag|coat|keys|phone|team|band|job|company|course)\\b',
  '\\bleft\\s+(?:early|late|for\\s+(?:work|school|uni|college|the\\s+(?:airport|station|office|day))|work|school|uni|college|home|the\\s+country|town|it|them|everything|without)\\b', '\\bleft\\s+(?:out|behind\\s+(?:at|in))\\b',
  '\\bwent\\s+(?:so\\s+|really\\s+|pretty\\s+)?(?:well|badly|wrong|fine|ok|okay|great|smoothly|alright|to\\s+plan)\\b', '\\bwent\\s+(?:on|and|ahead|along|away\\s+(?:for|on|to))\\b',
  // took me out, took my side, took part; taken to school
  '\\btook\\s+(?:me|us|him|her|them)\\s+(?:to|out|home|for|round|shopping|swimming|bowling|back)\\b', '\\btook\\s+(?:my|his|her|their|our)\\s+side\\b', '\\btook\\s+(?:part|over|off|up|on|out|after|the\\s+(?:last|bigger|best|first|lead|piss|mick|blame))\\b',
  '\\btaken\\s+(?:to|into|for)\\s+(?:school|work|the\\s+(?:park|cinema|shops|zoo|beach|match|pub))\\b',
  // without me, goodbye at the station, goodbye to everyone, the last time I saw, asleep on the sofa
  '\\bgoodbyes?\\s+(?:at|to)\\s+(?:the\\s+)?(?:station|airport|door|gate|gates|school|bus\\s+stop|everyone|everybody|all|the\\s+class|the\\s+team)\\b',
  '\\b(?:fell|falls|falling|was|is|s|were|are)\\s+asleep\\s+(?:on|in|at|during|while|watching|reading|in\\s+front|before|after|again|early|on\\s+the)\\b', '\\b(?:fast|sound)\\s+asleep\\b',
  // found out, found it, found a, found that
  '\\bfound\\s+(?:out|it|that|a|an|some|this|these|them\\s+(?:a|an|some)|time|the\\s+time|my\\s+way|our\\s+way|him\\s+(?:a|an|some))\\b', '\\b(?:found|find|finds)\\s+(?:me|us|him|her|them)\\s+(?:annoying|funny|boring|weird|cute|attractive|irritating|hard|easy)\\b',
  // war idioms, a gadget lost, heaven idioms, chicken wings, the doctors for a check-up
  '\\b(?:at\\s+war\\s+with|war\\s+of\\s+words|price\\s+war|tug\\s+of\\s+war|flame\\s+war|star\\s+wars|war\\s+(?:film|films|movie|movies|game|games|documentary|museum|history|stories|story|hammer)|world\\s+war\\s+(?:one|two|1|2|i|ii)\\s+(?:homework|project|essay|topic|lesson|history))\\b',
  '\\b(?:chicken|hot|buffalo|bbq|spicy|angel)\\s+wings\\b|\\bgives\\s+you\\s+wings\\b', '\\b(?:thank|thanks|good|for)\\s+heavens?\\b|\\bheavens?\\s+(?:knows|forbid|sake|above|help)\\b|\\bseventh\\s+heaven\\b|\\b(?:is|was|s|pure|absolute|sheer|like)\\s+(?:pure\\s+|absolute\\s+|sheer\\s+)?heaven\\b',
  '\\b(?:such|what|absolute|total|real|proper|little|been|being|like)\\s+(?:an?\\s+)?angel\\b(?!\\s+(?:now|in\\s+heaven|above|watching|up\\s+there|in\\s+the\\s+sky))',
  '\\b(?:any\\s+longer\\s+than|took\\s+any\\s+longer|wait\\s+any\\s+longer|stay\\s+any\\s+longer)\\b', '\\bthe\\s+other\\s+side\\s+of\\s+the\\b',
  '\\b(?:it|everything|all)\\s+(?:was\\s+|is\\s+|s\\s+)?over\\s+(?:the\\s+)?(?:top|there|here|nothing|again|soon)\\b',
].join('|'), 'giu');
/** Nothing is wrong: a check-up, a minor op, all clear, doing well, a new baby (the medical cues go). */
const BENIGN = /\b(?:check\s*ups?|checkups?|minor\s+op\w*|routine\s+\w+|all\s+clear|(?:is|was|s|are|were)\s+(?:fine|ok|okay|alright|all\s+right|home\s+now|on\s+the\s+mend|recovering|doing\s+(?:well|fine|ok|okay|better|great))|on\s+the\s+mend|recovering\s+(?:well|nicely|fine)|getting\s+better|fully\s+recovered|(?:knee|hip|ankle|wrist|shoulder|back|eye|tooth|wisdom\s+tooth|foot|hand)\s+op(?:eration)?|for\s+(?:a|an|her|his|their|my|our)\s+(?:op|operation|scan|jab|jabs|injection|vaccination|vaccinations|x\s*ray|appointment|test|tests|check|blood\s+test|booster)|having\s+(?:a|her|his|their|our)\s+baby|had\s+(?:a|her|his|their|our)\s+baby|gave\s+birth|new\s+baby|newborn|baby\s+(?:shower|scan\s+(?:went|was|is)\s+(?:fine|great|good|perfect))|visiting\s+(?:hours|time)|nurse\s+at|works?\s+(?:at|in)\s+(?:the\s+|a\s+)?(?:hospital|vets?|surgery)|is\s+a\s+(?:doctor|vet|nurse))\b/iu;
const MEDICAL_SOFT = /^(?:vets?|doctors?|hospitals?|intensive\s+care|icu|life\s+support|recovered|breathing)$/iu;
/** Who did the winning or the beating, never a person or a team ("my brother beat me at chess", "we won"). */
const BEAT_SUBJECT_NOT = new RegExp(`^(?:i|im|ive|we|you|he|she|they|it|its|who|that|which|this|there|everyone|everybody|someone|somebody|nobody|people|us|me|and|or|but|just|also|team|side|club|united|city|rovers|school|class|(?:${PERSON}|${PET})(?:s|es)?)$`, 'iu');
function beatCues(t, at) {
  const out = [];
  for (const m of t.matchAll(/\b([a-z0-9]+)\s+(?:(?:has|had|finally|eventually|then|in\s+the\s+end|sadly)\s+)*(?:won|beat|got)\b/giu)) {
    if (BEAT_SUBJECT_NOT.test(m[1]) || GOT_SUBJECT_NOT.test(m[1])) continue;
    out.push([at(m.index + m[0].length - 1), at(m.index + m[0].length - 1)]);
  }
  return out;
}
/** How many words apart a person (or a pregnancy word) and a softer cue may sit. */
const NEAR_SOFT = 6;
/**
 * (owner decision 'Ask when unsure') True when nothing reads a death or a loss (deathTalk, livingLoss, strongLoss), but the
 * words name a person, a pet or a pregnancy and carry a softer loss cue near it: the app asks, it never guesses.
 */
export function unsureLoss(text) {
  if (!/\p{L}/u.test(String(text ?? ''))) return false;
  if (deathTalk(text, { sure: true }) || livingLoss(text) || strongLoss(text)) return false;
  // (final round 3) a weak death word about someone or something the words never say is a person or a pet ("pepper died", "my
  // sensei is dead", "the one on the left died"): not sure, so asked (never the gentle path)
  if (weakDeath(text) === 'unknown') return true;
  const raw = blankOrdinary(norm(text)).toLowerCase();
  const t = raw.replace(WRONG_CUES, ' ').replace(CUE_ASIDE, ' ').replace(SOFT_ASIDE, ' ').replace(OWNED_THING, ' ').replace(/\s+/gu, ' ');
  const at = wordAt(t);
  const who = [...spans(t, WHO_WORD, at), ...spans(t, PREG_WORD, at)];
  if (!who.length) return false;
  who.push(...spans(t, PRONOUN, at));
  const benign = BENIGN.test(t);
  const cues = [...t.matchAll(SOFT)].filter((m) => !(benign && MEDICAL_SOFT.test(m[0].trim()))).map((m) => [at(m.index), at(m.index + m[0].length - 1)]);
  cues.push(...beatCues(t, at));
  return cues.some(([c, d]) => who.some(([a, b]) => Math.max(0, c - b, a - d) <= NEAR_SOFT));
}
/** The feelings that are a loss whatever the words say (the A–Z list's grief family): chosen, they always count as one. */
export const GRIEF_FEELINGS = Object.freeze(new Set(['grief', 'mourning', 'bereft', 'heartache', 'heartbreak', 'anticipatory-grief']));
export const griefFeeling = (emotion) => GRIEF_FEELINGS.has(String(emotion ?? '').trim().toLowerCase());
/**
 * How a Tell reaches the gentle path, on both screens (owner decision 'Ask when unsure'): 'gentle' (a grief-family
 * feeling chosen, death talk, someone alive but going, or a person beside a strong loss cue), 'ask' (unsureLoss: the
 * check-in, "Is this about losing someone?"), or null. Crisis, care and a wish to follow the one who died come first,
 * read by the caller. (Owner decision 'Ask before every world', 14 Oct 2026: 'ask' and null are both asked the one
 * question before any world or angle, angle-first.js; 'ask' is the check-in again only with that question switched off.)
 */
export function lossRoute(text, { emotion = null } = {}) {
  // (final round 3: the weak death words only about a person or a pet, deathTalk `sure`; "my motivation is dead" is no loss)
  if (griefFeeling(emotion) || deathTalk(text, { sure: true }) || livingLoss(text) || strongLoss(text)) return 'gentle';
  return unsureLoss(text) ? 'ask' : null;
}

/**
 * The backstop: any word or phrase of the bag, the structural loss backstop (lossNear, and the main screen's strongLoss:
 * Another Angle is never less careful than the main screen), or death talk itself (grief.js: its families are the bag's).
 */
export const bagWords = (text) => BAG.test(bagText(text)) || lossNear(text) || strongLoss(text) || !!deathTalk(text);
/**
 * Words whose only bag words are ordinary idioms ("I passed my driving test!", "lost my keys", "my phone died", "killed
 * it"): nothing hard is told, so a stated event's lines are neutral (authored.js eventKind 'neutral'), never "Something
 * this hard deserves gentleness". Still a bag hit: no framing, nothing playful.
 */
export function ordinaryOnly(text) {
  if (!BAG.test(bagText(text)) || lossNear(text) || deathTalk(text) || livingLoss(text)) return false;
  return !BAG.test(bagText(blankOrdinary(norm(text))));
}
/** (the r7 name for the backstop's words) */
export const harmWords = bagWords;

/** The r7 harm set, read with the ordinary idioms blanked (only for reading a server's loss scene, serverGrief). */
const HEAVY = /\b(?:die|dies|died|dying|dead|death|deaths|kill|kills|killed|killing|murder|murders|murdered|funeral|funerals|grave|graves|passed|passing|lost|losing|gone|grief|grieving|grieve|bury|buried|burial|hospital|hospitals|cancer|terminal|miscarriage|miscarried|accident|accidents|crash|crashed|assault|assaulted|attack|attacked|abused|abuse|raped|rape|stabbed|suicide|overdose|overdosed|coma|icu|hospice|chemo|tumou?r)\b/iu;
export function heavyHarm(text) {
  return HEAVY.test(blankOrdinary(norm(text)));
}
/** null: no bag word; 'gentle': death talk or someone alive but going; 'kind': any other bag word. */
export function harmRoute(text) {
  if (deathTalk(text, { sure: true }) || livingLoss(text)) return 'gentle';
  return bagWords(text) ? 'kind' : null;
}
/**
 * The fact-vs-guess framing may be used for these words: only with an interpretive marker of their own
 * (markers.js), never beside a bag word, death talk or someone alive but going.
 */
export function framingAllowed(text) {
  return hasMarker(text) && !bagWords(text) && !deathTalk(text) && !livingLoss(text);
}
/** The gentle path's words: death talk, or someone alive but going (livingLoss). Never a mechanic, nothing assumed. */
export function gentleRoute(text) {
  return !!deathTalk(text, { sure: true }) || livingLoss(text);
}
/** The mechanics that frame the words as a fact and a guess, a worst case, one meaning among others, or a spectrum. */
export const FRAMING_MECHANICS = Object.freeze(new Set(['pull_apart', 'shrink_projection', 'open_interpretations', 'reveal_spectrum']));

/**
 * Lines that frame what was said as a guess, a forecast, a habit or a label, or send it to be checked: every framing
 * the app authors (lines.js, authored.js, the authored library's angles, the mechanics' own lines) and the server's
 * equivalents (its mock's lines, its prompt's lenses). tests/probes/framings.mjs pins each one.
 */
const FRAMES = new RegExp([
  // a guess, the mind's addition, one meaning among others
  "\\bguess(?:es|ing|ed)?\\b", 'what (?:your|the) mind', 'mind (?:might be |is )?add', 'your mind picked', 'one meaning', 'open the others',
  '(?:one|another|other|more than one|different) ways? (?:to|of) (?:read|see|look at)', 'one way to read', 'all still possible', 'none of these is the answer',
  "what(?:[’']s| is) going on inside", 'inside (?:them|someone|their|other people)', 'haven[’\']?t heard the inside',
  // what happened, the part that happened, facts unclear, what you know
  'is what happened', 'the part that (?:actually )?happened', 'what happened is one thing', 'two different things', 'stuck together',
  'check (?:one|a|the) facts?', 'fact[- ]?check', 'check(?:ing)? in instead', 'what do you actually know', 'what did you actually', 'actually see or hear',
  'what you know for sure', 'know for sure', 'smaller than this thought', 'the rest is still open', 'rest as a question', 'still (?:an )?open question', 'still a question',
  'facts are (?:still )?unclear', '(?:is|are) still unknown', 'not enough to know', 'one data point', 'absence of information',
  "(?:you|we|they) (?:don[’']?t|do not|can[’']?t|cannot|haven[’']?t) (?:yet |really |fully |exactly )?(?:know|tell|read|heard)\\b",
  "doesn[’']?t (?:tell you|settle|automatically say)", 'says very little', 'hard to read', 'hard to know',
  // what it means
  'what (?:it|this|that) (?:really )?means', 'might mean', 'could mean', 'what might it mean', 'what else could be true', 'another side to this', 'look a little closer',
  // another explanation, other readings of someone
  'another explanation', 'other explanations?', 'an explanation that', 'want to test', '\\btest it\\b', 'not a verdict to accept',
  "\\b(?:they|he|she|someone|somebody|anyone|anybody|people|other people|your (?:\\w+ )?(?:colleague|manager|boss|friend|partner|mum|mom|dad|sister|brother|teacher|team|family)|the other person)(?: who did notice)? (?:might|may|could)(?: well| genuinely| even| just)? (?:have|be|not|feel|think|see|need|want|genuinely)\\b",
  "what (?:anyone|anybody|they|people|someone|any one person) (?:else )?(?:thought|thinks|was thinking|were thinking|is thinking)", "know what (?:someone|anyone|they|people) (?:else )?(?:is |are |was )?thinking",
  'not what anyone was thinking', 'busy thinking about their own', 'overestimate how much', 'notice our awkward', 'tone are hard', 'noticed at all',
  // the worst case, a forecast
  'worst case', 'worst cases', 'worst version', 'worst part', 'best case', 'most[- ]likely', 'one possibility', 'possibility, not an event', 'is a forecast', 'forecasts? (?:is|are)',
  'not a fact', "isn[’']?t (?:the same (?:thing )?as )?(?:a )?(?:proof|fact)", 'same thing as proof', 'life size', 'blown up', 'scariest story', 'harshest guess',
  'filling (?:in )?the gaps?', 'fills? the gaps?', 'filling it with', 'not the whole ending', 'if the worst', 'went better than you expect',
  // a habit: always / never, one moment, a pattern
  'one moment', 'not every moment', 'every time', 'other times', 'feels like a pattern', 'times? (?:it|things) went differently', 'even one exception',
  'rarely (?:exactly )?true', 'exactly true', 'loosen an?', 'are powerful, but', 'one event', 'one cancellation is', 'a whole pile',
  // all or nothing, a spectrum
  'somewhere between', 'between perfect and', 'all or nothing', 'partly good', 'all bad', 'all good', 'where on that line', 'not the only bit', 'leaving out',
  // a label, a should
  'harsh (?:word|verdict)', 'squashes a whole person', 'into one word', 'instead of “', 'swap(?:ping)? (?:the|it for)', 'without making it who you are', 'the label',
  'what actually happened', 'something to learn', 'the lesson', '“should”', 'shoulds', 'a rule you', "other people[’']s timelines", 'your whole worth', 'not something you are',
  // facts and assumptions, comparisons, the good bit, a what-if
  'assum\\w+', 'what you wrote is', 'comparing', 'this comparison', 'the good bit', 'luck and help', '[“"]?what[- ]if[”"]?', 'inside your own head', 'is unknown',
  'somewhere in between', 'most things live',
  // another meaning for what happened ("the paper might have been unusually tough", "it might go better than expected")
  "\\b(?:might|may|could) (?:have been|have had|be a one|go better|turn out|have lots of)\\b", 'lots of causes', 'information about', 'final score', 'nobody in particular',
  'judgement on your worth', 'one view of you', 'a numbers problem', 'their opinion', 'final verdict', 'a few seconds out of', 'set a ceiling', 'measure the worth', "don[’']?t measure\\b",
  "doesn[’']?t (?:actually )?say anything about you",
  // (review r9) the authored library's other readings ("People often go quiet when…", "There might be a more ordinary
  // explanation…", "Hindsight makes past choices look obvious"), the mechanics' own ("Now slide the thought to where it
  // really sits.", "That’s a lot of weight on one thought."), and the server's paraphrases of each framing
  '\\boften\\b', '\\busually\\b', "\\b(?:people|they|managers|messages|comments|feeds|exams|some people)\\s+(?:\\w+\\s+)?(?:often|usually|sometimes|tend)\\b", 'tends? to\\b',
  'most (?:people|jobs|of us|common)', 'lots of (?:people|workplaces|applicants|uncertainty|causes)', 'a lot of plans', 'hindsight', 'highlight reels?', '\\bbrains? (?:are|is)\\b',
  '\\bhabits?\\b', 'old scripts', 'explanations?', 'forecasts?', 'predict\\w*', 'not a promise', "hasn[’']?t happened", 'has not happened', 'really sits', 'on one thought',
  "\\b(?:thoughts?|feelings?) (?:aren[’']?t|are not|isn[’']?t|is not) (?:always )?(?:facts?|the truth|true)\\b",
  '\\b(?:maybe|perhaps)\\s+(?:they|he|she|someone|somebody|people|your|it|its|it[’\']s|that|this|there|nobody|no one|the|everyone)\\b',
  "\\b(?:is it possible|it[’']?s possible|could it be|could (?:this|that|it|there) be|is there (?:another|a different|any other))\\b",
  '\\b(?:really|actually|definitely|necessarily) true\\b', '\\bhow (?:do|can|could) you (?:know|be sure)\\b', '\\bevidence\\b', '\\bfor sure\\b',
  '\\bfill(?:ing|s)? in (?:the )?(?:blanks|gaps)\\b', '\\b(?:your|the) (?:mind|brain) (?:is|might|may|could|can|will|picked|adds|added|fills|filled|jumps|jumped|tells|told|says|said|goes|went|wants|likes|loves|tends|has|plays|makes|made|reads|read|sees|saw|races)\\b', '\\bunder (?:a lot of )?pressure\\b', "\\bdidn[’']?t mean (?:to|it)\\b", '\\bjust curious\\b',
  '\\bthink it through\\b', "\\bdidn[’']?t (?:notice|know what to say|realise|realize|see it)\\b", '\\b(?:is|are) (?:a |the )?facts?\\b', '\\bthe facts\\b', '\\bcoincidence\\b',
  '\\bmean (?:many|lots of|a lot of|different|so many|all sorts of) things\\b', '\\bread(?:ing)? (?:minds|their mind|his mind|her mind|into)\\b', '\\bmind[- ]?read\\w*', '\\bjump\\w* to conclusions\\b',
  '\\bwhole story\\b', '\\bwhat are the odds\\b', '\\bas bad as it (?:seems|feels|looks)\\b', '\\banxiety talking\\b', "\\b(?:not (?:be |even )?|isn[’']?t |wasn[’']?t )about you\\b", '\\bnot every\\b',
  '\\bthinking about themselves\\b', '\\btrying to protect you\\b', '\\banother (?:way|reason|side|view|possibility|story)\\b', '\\bother (?:reasons?|possibilit\\w+|ways? to)\\b',
  '\\bdifferent (?:reason|way to see|story)\\b', '\\bmore to (?:it|the story)\\b',
].join('|'), 'iu');
export const framesAsGuess = (line) => FRAMES.test(String(line || ''));

/** What a gentle line never does: ask, reframe, minimise, look on the bright side, or speak of thoughts and facts. */
const REFRAMES = /\?|\b(?:should|try|instead|actually|maybe|perhaps|possible|possibly|likely|chance|evidence|prove|pattern|always|never|everyone|nobody|angle|perspective|thought|thoughts|thinking|mind|fact|facts|true|truth|lesson|learn|silver lining|at least|move on|moving on|get over|better place|everything happens|for a reason|meant to be|stronger|bright side|look on|cheer up|smile|fun|squish|could|might)\b/iu;
/** A line the gentle path may say (a server's grief answer): it frames nothing, asks nothing, reframes nothing. */
export function acknowledges(line) {
  const l = String(line || '').trim();
  // (review r9: a server's "… isn't a thought to fix" frames nothing: the negated phrase alone never counts)
  const said = l.replace(/\b(?:isn[’']?t|is not|aren[’']?t|are not|not)\s+(?:a|an)\s+(?:thought|problem|puzzle)\s+to\s+(?:fix|solve|sort out)\b/giu, ' ');
  return !!l && l.length <= 120 && !framesAsGuess(l) && !REFRAMES.test(said);
}
