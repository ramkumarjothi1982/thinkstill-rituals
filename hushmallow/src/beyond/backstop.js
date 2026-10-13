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
//   bagWords(text)       → true when any whole word or phrase of the bag is in the words
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

import { norm, blankOrdinary } from './death-words.js';
import { deathTalk, livingLoss } from './grief.js';
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
].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|')})(?![\\p{L}\\p{N}])`, 'iu');
/** Lower case, every apostrophe out, hyphens as spaces (no idiom is ever blanked here). */
const bagText = (text) => String(text ?? '').normalize('NFKC').toLowerCase().replace(/[‘’ʼ`´']/gu, '').replace(/[‐‑-]/gu, ' ').replace(/\s+/gu, ' ');
export const bagWords = (text) => BAG.test(bagText(text));
/** (the r7 name for the backstop's words) */
export const harmWords = bagWords;

/** The r7 harm set, read with the ordinary idioms blanked (only for reading a server's loss scene, serverGrief). */
const HEAVY = /\b(?:die|dies|died|dying|dead|death|deaths|kill|kills|killed|killing|murder|murders|murdered|funeral|funerals|grave|graves|passed|passing|lost|losing|gone|grief|grieving|grieve|bury|buried|burial|hospital|hospitals|cancer|terminal|miscarriage|miscarried|accident|accidents|crash|crashed|assault|assaulted|attack|attacked|abused|abuse|raped|rape|stabbed|suicide|overdose|overdosed|coma|icu|hospice|chemo|tumou?r)\b/iu;
export function heavyHarm(text) {
  return HEAVY.test(blankOrdinary(norm(text)));
}
/** null: no bag word; 'gentle': death talk or someone alive but going; 'kind': any other bag word. */
export function harmRoute(text) {
  if (deathTalk(text) || livingLoss(text)) return 'gentle';
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
  return !!deathTalk(text) || livingLoss(text);
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
  'judgement on your worth', 'one view of you', 'a numbers problem', 'their opinion', 'final verdict', 'a few seconds out of', 'set a ceiling', 'measure the worth',
  "doesn[’']?t (?:actually )?say anything about you",
].join('|'), 'iu');
export const framesAsGuess = (line) => FRAMES.test(String(line || ''));

/** What a gentle line never does: ask, reframe, minimise, look on the bright side, or speak of thoughts and facts. */
const REFRAMES = /\?|\b(?:should|try|instead|actually|maybe|perhaps|possible|possibly|likely|chance|evidence|prove|pattern|always|never|everyone|nobody|angle|perspective|thought|thoughts|thinking|mind|fact|facts|true|truth|lesson|learn|silver lining|at least|move on|moving on|get over|better place|everything happens|for a reason|meant to be|stronger|bright side|look on|cheer up|smile|fun|squish|could|might)\b/iu;
/** A line the gentle path may say (a server's grief answer): it frames nothing, asks nothing, reframes nothing. */
export function acknowledges(line) {
  const l = String(line || '').trim();
  return !!l && l.length <= 120 && !framesAsGuess(l) && !REFRAMES.test(l);
}
