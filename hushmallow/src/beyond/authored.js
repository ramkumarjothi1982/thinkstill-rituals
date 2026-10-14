// Another Angle's own engine for the offline path: no endpoint configured,
// no consent, offline, a timeout, or a server "fallback" / error. It builds a
// scene in exactly the server's shape from the authored library
// (src/ultra/frameworks.js via src/ultra/reframe-engine.js), so the same ten
// mechanics play it. Rule-based and deterministic: no randomness, no clock,
// no generated language. Every sentence is authored, or the person's own
// words (an exact substring of what they typed) inside an authored frame.
//
//   authoredScene(text, { emotion, exclude: [patterns], usedAngles: [ids], hint }) → scene
//   sceneParts(text, scene) → { fact, guess, harsh, excerpt, steps: [3 chunks] }  (for the mechanics)
//   exactPhrase(text, phrase) → the same words as they appear in text, or ''
//
// Pure ES module, no DOM.

import { detectPatterns, splitThought, matchScenarios, buildNextSteps, buildAngles } from '../ultra/reframe-engine.js';
import { GENERAL } from '../ultra/frameworks.js';
import { PATTERNS, PATTERN_INTERACTION, INTERACTION_PATTERN, PATTERN_TO_AUTHORED, AUTHORED_TO_PATTERN, PATTERN_MALLOWS, mallowFor } from './vocab.js';
import { AUTHORED_PAIRS, AUTHORED_ALT, ANGER_PAIRS, GRIEF, FEELING, KIND, EVENT_KINDS, MECHANIC_LINES } from './lines.js';
import { deathTalk } from './grief.js';
import { bagWords, gentleRoute, framingAllowed, FRAMING_MECHANICS, framesAsGuess, ordinaryOnly, strongLoss } from './backstop.js';
import { feelingStatement, feelingClause, feelingOpens } from './feelings.js';
import { HARSH, ownLabel, clauses, markerKinds, guessClause } from './markers.js';

// strong cues the authored habits don't name (practical problems, fair anger, replaying)
const CUES = {
  rumination: /\b(?:replay\w*|keep (?:thinking|going over|going back to|coming back to)|can'?t stop (?:thinking|replaying|going over)|over and over|round and round|going round in circles)\b/i,
  valid_anger: /\b(?:unfair|furious|fuming|livid|seething|rude|disrespect\w*|took (?:the |all the )?credit|shouted at|yelled at|humiliat\w*|so angry|really angry|angry (?:at|with|that|about)|cancell?ed on me(?: again)?|lied to me|went behind my back|talked over me|interrupt\w* me|embarrassed me|belittled me|made fun of (?:me|my)|mocked (?:me|my)|put me down|undermin\w* me|cheated on me|cheating on me|stole (?:my|from me)|stolen (?:my|from me)|nicked my|blamed me|blames me|called me (?:(?:a|an|so|really|such a) )?(?:stupid|fat|ugly|lazy|useless|names|thick|dumb|weird|pathetic|worthless|selfish|crazy|mental|psycho|liar|idiot|loser|failure|disappointment|freak|joke|slut|slag|bitch|cow|drama queen|attention seeker|dramatic|overdramatic|sensitive|\w+)|laughed at me|read my (?:diary|messages|texts|phone|journal|emails?|letters?|notes|private)|went through my (?:phone|messages|things|stuff|bag|room|diary)|told (?:everyone|people|the whole \w+|my \w+) (?:my|about my)|broke (?:his|her|their|a|the|another) promise|dropped me|ghosted me|talked about me behind my back|(?:talking|talked|gossip\w*) (?:about me )?behind my back|refus(?:es|ed|ing) to|never paid me back|never pays (?:me|us) back|never paying (?:me|us) back|(?:won['’]?t|will not|refuses to) pay (?:me|us) back|didn['’]?t pay me back|bullied me|bully(?:ing)? me|threatened me|pushed me|excluded me|dumped me|lied about me|spread (?:rumou?rs|lies)|stood me up|forgot my birthday|snapped at me|insulted me|criticised me in front)\b/i,
  practical_problem: /\b(?:deadline|interview|rent|bills?|overdraft|debt|promot\w*|appraisal|job hunt\w*|exam (?:is|on|next|tomorrow)|how do i|what do i do|what should i do|need to (?:decide|sort|fix|find|choose)|too much to do|due (?:on|by|in|tomorrow|today|tonight|next|this|first thing)|essays?|assignments?|coursework|dissertation|homework|(?:haven['’]?t|have not|not even) started)\b/i,
};
/**
 * Someone else's anger at the person ("I think she's angry with me") is a guess about them (mind reading),
 * never the person's own fair anger: those words are set aside before the fair-anger cue is read.
 */
const ANGRY_AT_ME = /\b(?:(?:so|really|very|quite|a bit|pretty|super) )?(?:angry|furious|fuming|livid|seething|mad|cross|annoyed|upset|pissed off|raging|irritated) (?:at|with) me\b/giu;
/**
 * "I feel humiliated" names a feeling of their own, not a wrong someone did ("he humiliated me in front of
 * everyone" still is one): set aside, like someone's anger at them, before the fair-anger cue is read.
 */
const FEEL_HUMILIATED = /\bi(?:\s+(?:just\s+|really\s+)?(?:feel|felt)|['’]?m\s+(?:just\s+|really\s+)?feeling|['’]?ve\s+(?:been\s+feeling|felt)|\s+am\s+feeling)\s+(?:(?:so|really|very|quite|a bit|completely|totally|utterly|deeply)\s+)*humiliated\b/giu;
/**
 * Someone else's anger guessed at ("he must be furious", "she'll be livid"): a guess about them (mind reading), never
 * the person's own fair anger (review r11).
 */
const ANGER_GUESSED = /\b(?:he|she|they|hes|shes|theyre|everyone|everybody|(?:my|our|his|her|their)\s+\w+)\s+(?:(?:really|probably|surely|just|obviously|clearly)\s+)?(?:must|might|may|will|would|could|ll|is\s+going\s+to|are\s+going\s+to|gonna)\s+(?:be\s+|have\s+been\s+|get\s+)?(?:(?:so|really|absolutely|totally|well)\s+)*(?:angry|furious|fuming|livid|seething|mad|cross|annoyed|raging)\b/giu;
/** The person's own fair anger in the words (not someone's anger at them, nor someone's anger guessed at). */
export function fairAnger(text) {
  return CUES.valid_anger.test(String(text ?? '').replace(/[‘’ʼ`´']/gu, '').replace(ANGRY_AT_ME, ' ').replace(FEEL_HUMILIATED, ' ').replace(ANGER_GUESSED, ' '));
}
/**
 * Fair anger the scenes may answer as anger (find_boundary, its lines, an angry look): never beside a bag word or
 * death talk (review r10: "my friend ODd last night and everyone blames me" is never "Being angry about this makes
 * sense"); those words get a stated event's kind steps, or the gentle path.
 */
export const angerAnswer = (text, { emotion = null } = {}) => fairAnger(text) && !bagWords(text) && !angerUnsaid(text, emotion);
/** The anger family's feelings (a chip they picked): anger they stated. */
const ANGER_CHIPS = new Set(['anger', 'irritation', 'annoyance', 'frustration', 'resentment', 'rage', 'fury', 'bitterness', 'outrage', 'hostility', 'impatience',
  'indignation', 'irritable', 'grumpy', 'cranky', 'hangry', 'sulky', 'petty', 'spiteful', 'vindictive', 'scorned', 'defensive', 'provoked', 'aggravation',
  'disrespected', 'wronged', 'insulted', 'quarrelsome', 'rebellious', 'taken-advantage-of']);
const ANGER_WORD = /\b(?:angry|anger|furious|fury|fuming|livid|seething|raging|rage|enraged|incensed|outraged|infuriat\w*|mad|cross|pissed(?:\s+off)?|annoyed|irritated|wound\s+up|resentful|bitter|frustrated|frustrating)\b/giu;
/** Someone else as the one feeling it ("he was furious", "my boss is so angry", "she's livid"): read just before the word. */
const OTHER_FEELS = new RegExp(`\\b(?:(?:hes|shes|theyre|youre)|(?:he|she|they|you|everyone|everybody|people|(?:(?:my|our|his|her|their|your|the)\\s+)?(?:\\w+\\s+)?(?:mum|mom|mam|mother|dad|father|parents?|nan|gran|grandma|grandad|brother|sister|son|daughter|kids?|husband|wife|partner|boyfriend|girlfriend|ex|friends?|mates?|boss|manager|teacher|colleagues?|coworkers?|team|family|flatmates?|housemates?|neighbou?rs?|landlord|coach))\\s+(?:(?:really|probably|just|obviously|clearly|must|might|may|will|would|could|ll|d|has|had|have|always|still|also)\\s+)*(?:is|was|were|are|s|re|be|been|being|got|gets|getting|seemed|seems|looked|looks|sounded|sounds|became|becomes|went|goes|felt|feels))\\s+(?:(?:so|really|very|absolutely|totally|well|quite|a\\s+bit|pretty|super|properly|completely|fucking|bloody|getting|being)\\s+)*$`, 'iu');
/** Anger of their own in the words ("I'm furious", "it makes me so angry"), never someone's anger at them, guessed at, or theirs. */
export function ownAnger(text) {
  const t = String(text ?? '').replace(/[‘’ʼ`´']/gu, '').replace(ANGRY_AT_ME, ' ').replace(ANGER_GUESSED, ' ');
  for (const m of t.matchAll(ANGER_WORD)) {
    const before = t.slice(Math.max(0, m.index - 80), m.index);
    if (OTHER_FEELS.test(before) || /\b(?:his|her|their|your|its)\s+$/iu.test(before)) continue;
    if (/\b(?:not|never|isnt|wasnt|arent|werent|dont|didnt|no)\s+(?:(?:even|really|that|so|too)\s+)?$/iu.test(before)) continue;
    return true;
  }
  return false;
}
/** Embarrassment or shame, said ("I'm so ashamed") or the wrong's own word for it ("embarrassed me", "made a fool of me"). */
const SHAME_SAID = new RegExp([
  '\\b(?:embarrass(?:ed|ing|ment)|humiliat(?:ed|ing|ion)|ashamed|shamed|shameful|mortif(?:ied|ying)|cringe|cringing|made\\s+a\\s+fool\\s+of\\s+me|made\\s+me\\s+(?:look|feel)\\s+(?:so\\s+|really\\s+)?(?:like\\s+)?(?:a\\s+|an\\s+)?(?:fool|idiot|stupid|small|tiny|useless|worthless|pathetic|silly|thick|dumb))\\b',
  // (the Another Angle polish verifier) said the common ways: "I felt so stupid", "I felt like an idiot", "I felt tiny", "about
  // two inches tall", "like dirt", "I wanted to disappear", "the floor to swallow me", "I went bright red", "couldn't look anyone
  // in the eye"
  "\\bi\\s+(?:felt|feel|was\\s+feeling|am\\s+feeling|m\\s+feeling|just\\s+felt|honestly\\s+felt)\\s+(?:so\\s+|really\\s+|very\\s+|just\\s+|completely\\s+|totally\\s+|utterly\\s+|such\\s+|pretty\\s+|a\\s+bit\\s+)*(?:like\\s+)?(?:a\\s+|an\\s+|such\\s+an?\\s+|a\\s+complete\\s+|a\\s+total\\s+|an\\s+absolute\\s+)?(?:stupid|idiot|fool|small|tiny|little|useless|worthless|pathetic|silly|thick|dumb|crushed|rubbish|dirt|nothing|loser|joke|invisible|exposed|awkward|about\\s+(?:two|2|an?|one)\\s+inch(?:es)?\\s+tall|(?:two|2)\\s+inch(?:es)?\\s+tall|an?\\s+inch\\s+tall)\\b",
  '\\bi\\s+(?:just\\s+|really\\s+|honestly\\s+)?(?:wanted|want|wished|wish)\\s+(?:to\\s+(?:disappear|vanish|hide|die\\s+of\\s+embarrassment|sink\\s+(?:into|through)\\s+the\\s+floor)|the\\s+(?:floor|ground|earth)\\s+to\\s+(?:swallow|open\\s+up)|to\\s+crawl\\s+(?:into|under)\\s+a\\s+hole)\\b',
  '\\bi\\s+(?:went|turned|was|go|turn)\\s+(?:so\\s+|really\\s+|completely\\s+)?(?:bright\\s+)?(?:red|scarlet|crimson|beetroot|pink|purple)\\b|\\bi\\s+blushed\\b',
  "\\bi\\s+(?:could\\s*n[’']?t|could\\s+not|cant|can[’']?t|cannot)\\s+(?:even\\s+)?(?:look\\s+(?:anyone|anybody|them|him|her|people|my\\s+\\w+)\\s+in\\s+the\\s+eyes?|face\\s+(?:anyone|anybody|them|people|going\\s+back))\\b",
].join('|'), 'iu');
/**
 * Hurt said the common ways (the Another Angle polish verifier): "I cried", "I just wanted to cry", "I burst into tears", "it
 * stung", "I felt crushed": a feeling of their own that is not anger.
 */
const HURT_SAID = new RegExp([
  "\\bi\\s+(?:just\\s+|then\\s+|actually\\s+|literally\\s+|nearly\\s+|almost\\s+)?(?:cried|was\\s+crying|started\\s+crying|burst\\s+(?:into\\s+tears|out\\s+crying)|broke\\s+down|was\\s+in\\s+tears|ended\\s+up\\s+(?:crying|in\\s+tears)|went\\s+home\\s+(?:and\\s+)?cried|could\\s+(?:have|ve)\\s+cried|(?:just\\s+|really\\s+)?wanted\\s+to\\s+cry|want\\s+to\\s+cry|was\\s+close\\s+to\\s+tears)\\b",
  '\\b(?:it|that|this|which|what\\s+(?:he|she|they)\\s+said)\\s+(?:really\\s+|actually\\s+|properly\\s+|still\\s+)?stung\\b',
  '\\bi\\s+(?:felt|feel|was|am|m)\\s+(?:so\\s+|really\\s+|just\\s+|completely\\s+|totally\\s+)*(?:crushed|gutted|devastated|heartbroken|upset|wounded)\\b',
].join('|'), 'iu');
/**
 * A feeling of their own in the words that is not anger: embarrassment or shame (SHAME_SAID), hurt ("it really hurt",
 * "that was hurtful"), or any feeling they say they have that is not anger ("I feel so small", "I'm gutted").
 */
function feelingNotAnger(text) {
  const t = String(text ?? '');
  // (apostrophes out first: "couldn’t" and "couldn't" read the same)
  const plain = t.replace(/[‘’ʼ`´']/gu, '');
  if (SHAME_SAID.test(t) || SHAME_SAID.test(plain) || HURT_SAID.test(plain) || /\bhurt(?:ful|s|ing)?\b/iu.test(t)) return true;
  let parts = [];
  try { parts = clauses(t).map((c) => c.text); } catch { parts = [t]; }
  return parts.some((p) => { const k = feelingClause(p); return !!k && k !== 'angry'; });
}
/**
 * Anger they never stated (the QA sweep: "My boss embarrassed me in front of everyone" was answered "Being angry about
 * this makes sense"): a feeling of their own that is not anger, the chip they picked or their words, and no anger of
 * their own in either. Then no scene of anger's own plays (find_boundary, valid_anger, "That anger is pointing at
 * something…", "Your anger might be pointing…"); the wrong is still a wrong (fairAnger: never framed as the mind's guess,
 * never excused), acknowledged on a stated event's kind steps.
 */
export function angerUnsaid(text, emotion = null) {
  if (emotion && ANGER_CHIPS.has(emotion)) return false;
  if (ownAnger(text)) return false;
  return !!emotion || feelingNotAnger(text);
}
/** The shame family's chips: embarrassment or shame picked. */
const SHAME_CHIPS = new Set(['shame', 'guilt', 'embarrassment', 'humiliation', 'remorse', 'self-consciousness', 'awkwardness', 'sheepish', 'exposed', 'self-critical',
  'inadequate', 'worthless', 'foolish', 'secondhand-embarrassment', 'self-loathing', 'flustered']);
/**
 * The kind mechanic that goes first for a wrong told with embarrassment or shame and no anger of their own ("My boss
 * embarrassed me in front of everyone"): separate_one, the one moment lifted out from the rest of them ("This is real,
 * and it's taking up a lot of room." / "There's still more to you than this one thing."). Else null (the kind's order).
 */
export function unsaidLead(text, emotion = null) {
  if (!fairAnger(text) || !angerUnsaid(text, emotion)) return null;
  return (emotion ? SHAME_CHIPS.has(emotion) : SHAME_SAID.test(String(text ?? ''))) ? 'separate_one' : null;
}
/** A line that speaks of anger. */
const ANGER_LINE = /\b(?:anger|angry|furious|fury|rage|raging|mad|livid|fuming|seething|resent\w*|annoyed|irritated)\b/iu;
/** A scene of anger's own: its reading, its mechanic, an angry feeling, or a line that speaks of anger. */
export function speaksAnger(scene) {
  if (!scene) return false;
  if (scene.reasoning_pattern === 'valid_anger' || scene.mechanic === 'find_boundary' || scene.interaction_type === 'find_boundary' || scene.feeling === 'angry') return true;
  // (what Zuzu says, never what they told, quoted back: "What you know: “she was angry”")
  return [scene.subtitle_line_1, scene.subtitle_line_2, scene.practical_next_step, scene.alternative_angle].some((l) => ANGER_LINE.test(String(l || '')));
}
/**
 * Death talk (grief.js: any death or loss word about anyone or anything alive, recall first) and words with a harm
 * word that no ordinary idiom explains (backstop.js) take the gentle path (gentleScene): never a mechanic or a
 * fact/assumption split, and lines that never assume anyone died. With sharing on, the server may answer it.
 */
export { deathTalk, framesAsGuess };
/**
 * Fair anger in two: the wrong (the fact) and, when there is one, the clause with an interpretive marker
 * (markers.js: "everyone thinks I'm useless") that reads into it (the guess). The wrong itself ("My boss embarrassed
 * me in front of everyone") is never the guess.
 */
export function angerSplit(text) {
  const t = String(text ?? '');
  const cl = clauses(t);
  const g = cl.find((c) => c.kinds.size), f = cl.find((c) => !c.kinds.size);
  return { fact: f ? exactPhrase(t, f.text) : '', guess: g ? exactPhrase(t, g.guess) : '' };
}
const EMOTION_DEFAULT = {
  anger: 'valid_anger', frustration: 'valid_anger', resentment: 'valid_anger', irritation: 'valid_anger',
  anxiety: 'catastrophising', worry: 'catastrophising', fear: 'catastrophising', dread: 'catastrophising',
  overwhelm: 'practical_problem', stress: 'practical_problem', restlessness: 'rumination', overthinking: 'rumination',
  sadness: 'fact_vs_assumption', disappointment: 'practical_problem', loneliness: 'mind_reading', rejection: 'mind_reading',
  shame: 'self_criticism', guilt: 'personalisation', embarrassment: 'mind_reading', jealousy: 'fact_vs_assumption', envy: 'fact_vs_assumption',
};
/** When nothing else decides: the order "another angle" walks through. */
export const ROTATION = Object.freeze(['fact_vs_assumption', 'mind_reading', 'all_or_nothing', 'catastrophising', 'practical_problem',
  'overgeneralisation', 'personalisation', 'self_criticism', 'rumination', 'valid_anger']);
/** Which scenario angle kinds suit each pattern's reveal (first that exists wins). */
const ANGLE_KINDS_FOR = {
  fact_vs_assumption: ['not-enough-info', 'neutral', 'context'],
  catastrophising: ['neutral', 'worry-partly-true', 'not-enough-info'],
  personalisation: ['context', 'benign', 'neutral'],
  all_or_nothing: ['neutral', 'growth', 'context'],
  mind_reading: ['benign', 'not-enough-info', 'context'],
  overgeneralisation: ['neutral', 'context', 'not-enough-info'],
  rumination: ['self-compassion', 'growth', 'neutral'],
  practical_problem: ['worry-partly-true', 'growth', 'neutral'],
  self_criticism: ['self-compassion', 'growth', 'neutral'],
  valid_anger: ['self-compassion', 'worry-partly-true', 'context'],
};
const STEP_KINDS_FOR = {
  valid_anger: ['boundary', 'talk', 'act'], practical_problem: ['act', 'check', 'talk'], rumination: ['wait', 'act', 'care'],
  catastrophising: ['check', 'wait', 'act'], self_criticism: ['act', 'care', 'check'], personalisation: ['check', 'talk', 'act'],
  mind_reading: ['check', 'talk', 'wait'], fact_vs_assumption: ['check', 'wait', 'talk'], overgeneralisation: ['check', 'act'],
  all_or_nothing: ['check', 'act'],
};
/**
 * Patterns whose habit angle (quoting the words) beats the situation's own angle (mind reading too, review r9: a
 * situation's "They might be pointing out fixes…" invents what nobody said; "“…” is a guess about what's going on
 * inside someone else" quotes the clause they typed).
 */
const KIT_FIRST = new Set(['self_criticism', 'all_or_nothing', 'overgeneralisation', 'catastrophising', 'mind_reading']);
/** Situations about one's own slip; never used when someone else did the harm. */
const SELF_CAUSED = new Set(['awkward-moment', 'mistake-judged', 'past-regret']);
/** Situations whose boundary steps fit fair anger. */
const ANGER_SCENARIOS = new Set(['credit-promotion', 'not-listened', 'work-criticism', 'family-criticism', 'family-argument', 'plans-cancelled', 'partner-distant', 'appearance-comment']);
const SAD = new Set(['sadness', 'loneliness', 'rejection', 'hurt', 'grief', 'disappointment']);
const ANGRY = new Set(['anger', 'frustration', 'resentment', 'irritation']);

const words = (s) => (String(s).match(/[\p{L}\p{N}'’]+/gu) || []).length;
/** "What do you actually know?" when the words were all interpretation (authored, never a copy of the assumption). */
const KNOWN_SMALLER = 'What you know for sure is probably smaller than this thought.';
/** …and when their words are too long to quote whole (they are never cut). */
const KNOWN_TOLD = 'What you know is what you told me. The rest is still open.';
/** The longest of their words quoted whole in a line (characters), and the longest authored possibility. */
const QUOTE_MAX = 90;
const ALT_MAX = 72;
/** A possibility that reads the other person, not thoughts in general ("They might…", "Your colleague might…"). */
const ABOUT_OTHERS = /^(?:they|he|she|someone|somebody|people|anyone|anybody|your (?:colleague|manager|boss|friend|partner|sister|brother|mum|dad|family|teacher|team)|the (?:other|others|person))\b/i;
/** One whole sentence of at most `max` characters, or '' (a line is never cut to fit). */
export function wholeLine(s, max = ALT_MAX) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t && t.length <= max ? t : '';
}
/** A scene's line for an object: its first sentence, whole, when that fits; else '' (never cut). */
export function firstWhole(s, max = 160) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const first = sentences(t)[0] || t;
  return first.length <= max ? first : '';
}
/**
 * The engine's next steps in Zuzu's own voice: "you", not "I" (the engine wrote some as the person's notes
 * to self: "did my message ask something…"). Words inside quotes, the lines to say, stay as written.
 */
export function secondPerson(step) {
  const parts = String(step || '').split(/(“[^”]*”|"[^"]*")/u);
  const swap = (seg) => seg
    .replace(/\b(?:I am|I’m|I'm)\b/g, 'you’re').replace(/\bI(?:’|')ve\b/g, 'you’ve').replace(/\bI(?:’|')d\b/g, 'you’d').replace(/\bI(?:’|')ll\b/g, 'you’ll')
    .replace(/\bI was\b/g, 'you were').replace(/\bam I\b/g, 'are you').replace(/\bwas I\b/g, 'were you')
    .replace(/\bmyself\b/g, 'yourself').replace(/\bmine\b/g, 'yours').replace(/\bmy\b/g, 'your').replace(/\bMy\b/g, 'Your')
    .replace(/\bme\b/g, 'you').replace(/\bI\b/g, 'you');
  return parts.map((seg, i) => (i % 2 ? seg : swap(seg))).join('').replace(/(^|[.!?]\s+)you/g, (m0, a) => `${a}You`);
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The same phrase as it appears in `text` (exact characters: case, quotes and
 * spacing as typed), found case-insensitively; '' when it isn't there.
 */
export function exactPhrase(text, phrase) {
  const src = String(text ?? ''), p = String(phrase ?? '').trim();
  if (!src || !p) return '';
  const toks = p.split(/\s+/).map((w) => esc(w).replace(/['’‘`´]/g, "['’‘`´]").replace(/["“”]/g, '["“”]'));
  try {
    const m = new RegExp(toks.join('\\s+'), 'iu').exec(src);
    return m ? m[0].replace(/[\s,;:]+$/u, '') : '';
  } catch { return ''; }
}

/** At most `max` characters of the person's words, cut at a word, with an ellipsis (never reworded). */
export function excerpt(text, max = 60) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  let out = '';
  for (const w of t.split(' ')) { if ((out ? out.length + 1 : 0) + w.length > max - 1) break; out = out ? `${out} ${w}` : w; }
  return `${(out || t.slice(0, max - 1)).replace(/[.,;:!?]+$/u, '')}…`;
}

const sentences = (s) => String(s).match(/[^.!?…]+(?:[.!?…]+["”’)]*|$)/gu)?.map((x) => x.trim()).filter(Boolean) || [];

/**
 * The person's words split into "what happened" and "what my mind added", as exact phrases (review r8): only a
 * clause with an interpretive marker (markers.js) is ever the guess, and only the part of it that carries the marker
 * ("I'm worried I'll fail" → "I'll fail"); the stated event, or the feeling, is the fact.
 */
function split(text) {
  const cl = clauses(text);
  const g = cl.find((c) => c.kinds.size);
  const f = cl.find((c) => !c.kinds.size) || (g?.feeling ? { text: g.feeling } : null);
  const pieces = cl.map((c) => ({ text: c.guess, guess: c.kinds.size ? 'interpretation' : 'fact', ...(c.feeling ? { feeling: c.feeling } : {}) }));
  return { fact: f ? exactPhrase(text, f.text) : '', guess: g ? exactPhrase(text, g.guess) : '', pieces };
}

/** "always", "never", or "nobody" / "everyone" as the subject of the sentence ("Nobody likes me"), not "in front of everyone". */
function strongAlways(text, m) {
  if (/^(?:always|never|every (?:single )?time|nothing ever|constantly|all the time)$/i.test(m.text)) return true;
  const before = String(text).replace(/[‘’]/g, "'").slice(0, m.index).trimEnd();
  return !before || /[.!?,;:]$|\b(?:and|but|so|because|cos|like|feels like|that)$/i.test(before);
}

/** Someone else is in the story (mind-reading and "it's all on me" need another person to make sense). */
const OTHERS = /\b(?:he|she|they|them|him|her|his|their|people|everyone|everybody|nobody|no one|someone|anyone|boss|manager|colleague|friend|friends|partner|mum|mom|dad|sister|brother|teacher|team|group|family|boyfriend|girlfriend|husband|wife|kids?|son|daughter|neighbour)\b/i;
/** The person takes the blame on themselves (personalisation needs that, never "someone did this to me"). */
const BLAME = /\b(?:my (?:own )?fault|blame (?:myself|me)|because of me|i ruined|i caused|i spoiled|i let (?:them|everyone|the team|her|him|you) down|all on me|down to me)\b/i;
/** The words read someone else's mind or meaning (what they think, feel, want, or why they did or didn't). */
const MINDY = /\b(?:thinks?|thought (?:i|i'm|me)|must (?:be|think|hate|feel)|judg\w*|hates?|(?:don'?t|doesn'?t|didn'?t) (?:like|want|care)|likes? me|(?:annoyed|upset|angry|furious|mad|cross|fuming|livid|pissed off|irritated) (?:with|at) me|ignor\w*|repl(?:y|ied|ies)|respond\w*|text\w* (?:me )?back|invit\w*|left out|leave me out|excluded|except me|without me|bored of me|boring|laugh\w* at me|talking about me|staring|noticed)\b/i;
/** The words look ahead to something going wrong (catastrophising needs a future to shrink). */
const FUTURE = /\b(?:will|won'?t|going to|gonna|what if|tomorrow|next (?:week|month|time)|never going to|end up|forever|ruin\w*|disaster|worst|fired|dump\w*|dread\w*|scared|afraid|terrified)\b/i;
/** Black-and-white words (all-or-nothing needs two extremes to find the middle of). */
const EXTREME = /\b(?:fail\w*|ruin\w*|disaster|perfect\w*|complete(?:ly)?|total(?:ly)?|useless|pointless|waste|everything|nothing|always|never|worst|best|right or wrong|all or nothing)\b/i;
const LOOPY = new Set(['overthinking', 'restlessness', 'anxiety', 'worry']);
const ANXIOUS = new Set(['anxiety', 'worry', 'fear', 'dread', 'panic', 'stress', 'nervousness']);

/** Candidate patterns for this text, most fitting first (deterministic). */
export function candidatePatterns(text, { emotion = null, hint = null, scenario = null } = {}) {
  // a feeling said plainly: only the mechanics that acknowledge it (never a fact/assumption split)
  const feel = feelingOf(text);
  if (feel) return feelingOrder(feel.kind, hint).map((m) => INTERACTION_PATTERN[m]);
  // fair anger at something someone did: the scenes that acknowledge the wrong (the line it needs, its weight put
  // back with them, one step), and the guess scenes only for a clause that really reads into it
  if (angerAnswer(text, { emotion })) return angerOrder(text, hint);
  const out = [];
  // (anger they never stated, the chip or the words naming another feeling: never anger's own scene, whoever hinted it)
  const unsaid = angerUnsaid(text, emotion);
  // (review r8) the guess scenes only for the marker they need; every other scene acknowledges what was said
  const add = (p) => { if (p && PATTERNS.includes(p) && !out.includes(p) && (!GUESS_PATTERNS.has(p) || fits(p)) && !(p === 'valid_anger' && unsaid)) out.push(p); };
  const M = framingAllowed(text) ? markerKinds(text) : new Set();
  let found = [];
  try { found = detectPatterns(text); } catch { found = []; }
  const has = (id) => found.some((f) => f.pattern.id === id);
  const always = found.find((f) => f.pattern.id === 'always-never');
  const strong = !!always && always.matches.some((m) => strongAlways(text, m));
  // the fallbacks below only offer a scene that can make sense for these words (a scene that doesn't fit
  // is never played to fill a gap: when the fitting ones run out, Zuzu says so)
  function fits(p) {
    // (the guess scenes: only with the interpretive marker each one reads into, markers.js)
    if (p === 'fact_vs_assumption') return M.size > 0;
    if (p === 'mind_reading') return M.has('mind') && OTHERS.test(text);
    if (p === 'overgeneralisation') return M.has('over') && strong;
    if (p === 'self_criticism') return M.has('label') || M.has('should');
    if (p === 'catastrophising') return M.has('cata');
    if (p === 'all_or_nothing') return M.has('over') || M.has('cata') || M.has('label');
    if (p === 'personalisation') return (BLAME.test(text) || has('spotlight-on-me')) && !fairAnger(text);
    if (p === 'valid_anger') return angerAnswer(text, { emotion }) || (ANGRY.has(emotion) && !bagWords(text));
    if (p === 'rumination') return CUES.rumination.test(text) || LOOPY.has(emotion) || /\bwhat if\b/i.test(text);
    if (p === 'practical_problem') return CUES.practical_problem.test(text) || (!!scenario && scenario !== GENERAL && !fairAnger(text)) || ['overwhelm', 'stress'].includes(emotion);
    return false;
  }
  const maybe = (p) => { if (p && fits(p)) add(p); };
  if (hint) add(hint);
  if (CUES.rumination.test(text)) add('rumination');
  // (review r11: never beside a bag word or death talk, so the Thought Mallow is never tinted anger beside a loss)
  if (angerAnswer(text, { emotion })) add('valid_anger');
  // a habit the engine found in the words, when its scene makes sense for them ("everyone" / "nobody" are
  // everywhere in ordinary speech: always/never only counts when it is the subject: "Nobody likes me")
  for (const f of found) if (f.pattern.id !== 'always-never') maybe(AUTHORED_TO_PATTERN[f.pattern.id]);
  // a harsh label of their own the engine's list doesn't name ("I’m a horrible mother") is that habit too
  if (ownLabel(text)) maybe('self_criticism');
  if (CUES.practical_problem.test(text)) add('practical_problem');
  if (strong) add('overgeneralisation');
  if (scenario && scenario !== GENERAL) for (const id of scenario.likelyPatterns || []) maybe(AUTHORED_TO_PATTERN[id]);
  if (emotion && EMOTION_DEFAULT[emotion]) maybe(EMOTION_DEFAULT[emotion]);
  // (the scene each marker reads into comes before the general fact-and-guess one)
  if (M.has('mind')) maybe('mind_reading');
  if (M.has('label') || M.has('should')) maybe('self_criticism');
  if (M.has('cata')) maybe('catastrophising');
  if (M.has('over')) maybe('overgeneralisation');
  for (const p of ROTATION) maybe(p);
  // the general fact-and-guess scene follows the ones each marker reads into (unless the server hinted it)
  const fva = out.indexOf('fact_vs_assumption');
  const last = Math.max(...['mind_reading', 'self_criticism', 'catastrophising', 'overgeneralisation'].map((p) => out.indexOf(p)));
  if (fva >= 0 && last > fva && hint !== 'fact_vs_assumption') { out.splice(fva, 1); out.splice(last, 0, 'fact_vs_assumption'); }
  return out;
}

/** Fair anger's scenes, in the order "Show me another angle" walks (never fact-vs-guess on the wrong itself). */
function angerOrder(text, hint = null) {
  const { guess } = angerSplit(text);
  const M = framingAllowed(text) ? markerKinds(text) : new Set();
  const out = ['valid_anger'];
  if (CUES.rumination.test(text)) out.push('rumination');
  // (only a clause with a marker of its own reads into the wrong: "and now everyone thinks I'm useless")
  if (guess && M.has('mind') && OTHERS.test(guess)) out.push('mind_reading');
  if (guess && M.size && !ownLabel(guess)) out.push('fact_vs_assumption');
  if (M.has('label') || M.has('should')) out.push('self_criticism');
  out.push('personalisation', 'practical_problem');
  if (hint && out.includes(hint)) { out.splice(out.indexOf(hint), 1); out.unshift(hint); }
  return out;
}

/**
 * What a habit's own angle may quote ({thought}): only the words that frame is about, exactly as typed.
 * A label frame ("“…” squashes a whole person into one word") quotes the label itself, three words at
 * most ("I'm useless", "I am boring"); a guess or forecast frame ("“…” is a guess about…") quotes the
 * clause that guesses, nine words at most. Anything else ('' here): that angle is skipped, never filled
 * with a whole sentence it doesn't fit.
 */
const LABEL_KITS = new Set(['big-label']);
/** Words that describe the noun after them ("a terrible person"): a label never ends on one after an article. */
const LABEL_ADJ = /^(?:stupid|useless|terrible|pathetic|worthless|hopeless|incompetent|awful|rubbish|dumb|thick|clueless|horrible|bad|selfish|lazy|ugly|weak|disgusting|crap|crappy|cruel|mean|boring|weird|lousy|dreadful|appalling|toxic|unlovable|unlikeable|unlikable|failed|total|complete|absolute|utter|massive|huge|biggest|such|so|really|just|literally|actually)$/iu;
/** What can follow such a word without being the noun it describes ("terrible at maths", "useless and lazy"). */
const LABEL_STOP = /^(?:and|or|but|so|because|cos|at|to|for|of|in|on|with|who|that|which|when|if|like|than|as|too|really|now|again|today|anyway|right|here|there|lately|sometimes|always|all|the|my|this|that)$/iu;
/**
 * A label as the whole phrase they typed: "I’m a terrible" → "I’m a terrible person", "I’m a useless" →
 * "I’m a useless boyfriend" (the engine's match stops at the adjective). '' when the words after it never
 * name the noun: a quoted label never ends on an adjective after "a", "an" or "such a".
 */
export function wholeLabel(text, phrase) {
  const src = String(text ?? '');
  const p = exactPhrase(src, phrase);
  if (!p) return '';
  const last = (p.split(/\s+/).pop() || '').replace(/[^\p{L}'’-]/gu, '');
  if (!/\b(?:a|an)\b/iu.test(p) || !LABEL_ADJ.test(last)) return p;
  let rest = src.slice(src.indexOf(p) + p.length), out = p;
  for (let i = 0; i < 3; i++) {
    const m = /^ +([\p{L}][\p{L}'’-]*)/u.exec(rest);
    if (!m || LABEL_STOP.test(m[1])) return '';
    out += m[0]; rest = rest.slice(m[0].length);
    if (!LABEL_ADJ.test(m[1])) return out;
  }
  return '';
}
const CLAUSE_KITS = new Set(['mind-reading', 'future-reading']);
function kitThought(kitId, text, hit, pieces) {
  const m = exactPhrase(text, hit?.matches?.[0]?.text || '');
  if (!m) return '';
  if (LABEL_KITS.has(kitId)) { const w = wholeLabel(text, m); return w && words(w) <= 5 ? w : ''; }
  if (CLAUSE_KITS.has(kitId)) {
    // (only the clause with the marker of this kind: "“she must hate me” is a guess", never the stated event)
    const clause = exactPhrase(text, guessClause(text, [kitId === 'mind-reading' ? 'mind' : 'cata'])) || '';
    const c = String(clause || '').replace(/[\s.,;:!?…]+$/u, '');
    void pieces;
    return c && words(c) <= 9 && markerKinds(c).has(kitId === 'mind-reading' ? 'mind' : 'cata') ? c : '';
  }
  return '';
}
/** The always/never habit's lines, about the word they actually used ("nobody", "everyone"), or '' when it doesn't fit. */
function overWord(line, text, hit) {
  const strong = (hit?.matches || []).filter((m) => strongAlways(text, m)).map((m) => m.text);
  if (!strong.length) return '';
  const said = (w) => strong.some((x) => x.toLowerCase() === w);
  if (!/“always”|“never”/.test(line)) return line;
  if (/“always” and “never”/.test(line)) {
    if (said('always') || said('never')) return line;
    // their own word, lower-cased only because it opened their sentence
    const w = strong[0].toLowerCase();
    return `A word like “${w}” is powerful, but it’s rarely exactly true.`;
  }
  if (/loosen an “always”/.test(line)) {
    if (said('always')) return line;
    const w = strong[0].toLowerCase();
    return line.replace(/an “always”/, `${/^[aeiou]/.test(w) ? 'an' : 'a'} “${w}”`);
  }
  return said('always') || said('never') ? line : '';
}

/** Two subtitle lines from one authored angle (or the pattern's authored pair). */
function linesFrom(text, pattern) {
  const pair = AUTHORED_PAIRS[pattern];
  const s = sentences(text);
  if (s.length >= 2 && words(s[0]) <= 22 && words(s[1]) <= 22) return [s[0], s.slice(1).join(' ').split(/(?<=[.!?…])\s/u)[0]];
  if (s.length === 1 && words(s[0]) <= 22) return [s[0], pair[1]];
  return [pair[0], pair[1]];
}

/**
 * The offline scene for the person's words, in the server's shape
 * (+ source:'authored', authored_pattern, angle_id). `exclude` lists the
 * patterns already shown ("Show me another angle" always moves on);
 * `usedAngles` the authored angle ids already used.
 */
export function authoredScene(text, { emotion = null, exclude = [], usedAngles = [], hint = null } = {}) {
  const t = String(text ?? '');
  // death talk, or someone alive but going: the gentle path (gentleScene: no mechanic, no fact/assumption split,
  // nothing assumed), which the orchestrator plays
  if (gentleRoute(t)) return gentleScene(t, { emotion });
  // a feeling said plainly ("I feel empty", "I feel sick about the exam"): acknowledged, with one small kind step
  // (feelingScene), never a reading of what happened
  const feel = feelingOf(t);
  if (feel) return feelingScene(t, feel.kind, { emotion, exclude, hint });
  // any word of the backstop's bag ("I lost my keys and my boss thinks I'm useless", "my mum's in hospital"): the
  // kind-step mechanics with their own safe lines, never a fact-vs-guess game
  if (bagWords(t)) return feelingScene(t, eventKind(t), { emotion, exclude, hint, guarded: true });
  let scenario = GENERAL;
  // a situation is trusted only on a real match (two keywords, or a phrase), never on one stray word
  try { const m = matchScenarios(t, { limit: 1 })[0]; scenario = m && m.score >= 2 ? m.scenario : GENERAL; } catch { scenario = GENERAL; }
  // someone did something to them: the situations about one's own slip ("awkward moment") would make light of it
  if (fairAnger(t) && SELF_CAUSED.has(scenario.id)) scenario = GENERAL;
  let detected = [];
  try { detected = detectPatterns(t); } catch { detected = []; }
  const cands = candidatePatterns(t, { emotion, hint, scenario });
  // every scene that fits these words has been shown: the acknowledging ones for a stated event follow (review r8),
  // then Zuzu says so (exhausted), never playing one that doesn't fit
  const fresh = cands.find((p) => !exclude.includes(p));
  // (no fitting scene, or every one shown, and no marker of their own: the acknowledging ones for a stated event
  // follow; fair anger keeps to its own three)
  if (!cands.length || (!fresh && !framingAllowed(t) && !angerAnswer(t, { emotion }))) {
    const kind = feelingScene(t, eventKind(t), { emotion, exclude, hint, guarded: true, lead: unsaidLead(t, emotion) });
    if (!cands.length || !kind.exhausted) return kind;
  }
  const exhausted = !fresh;
  const pattern = fresh || cands[0] || 'fact_vs_assumption';
  const authoredId = PATTERN_TO_AUTHORED[pattern];
  const anger = fairAnger(t);
  // (a wrong done to them, with anger of their own or no other feeling named: anger's own lines may speak)
  const angry = anger && !angerUnsaid(t, emotion);
  const sp = split(t);
  // fair anger: the wrong is the fact, and only a clause that reads into it may be the guess
  const { fact, guess } = anger ? angerSplit(t) : sp;
  const { pieces } = sp;
  // only an interpretation was told ("Nobody likes me"): the words are the assumption, not the fact
  const allGuess = !anger && pieces.length > 0 && pieces.every((p) => p.guess === 'interpretation');
  const used = new Set(usedAngles);

  // the reveal: the habit's own angle when that habit is really in their words (it quotes them), or the matched
  // situation's own angle of the right kind (habits that judge the person first, situations first otherwise),
  // else the authored pair. Fair anger and replaying always use the authored pair: it speaks to the mechanic,
  // and a situation's angle could make light of a real wrong.
  let angleId = null, l1 = null, l2 = null;
  const ownPair = pattern === 'valid_anger' || pattern === 'rumination' || (anger && !!ANGER_PAIRS[pattern]);
  if (anger && ANGER_PAIRS[pattern]) [l1, l2] = ANGER_PAIRS[pattern];
  // (a harsh label the engine's own list doesn't name, "I’m a horrible mother", still gets the label's angles)
  const harshAt = authoredId === 'big-label' ? ownLabel(t) : null;
  const hit = authoredId ? detected.find((f) => f.pattern.id === authoredId) || (harshAt ? { pattern: { id: 'big-label' }, matches: [{ text: harshAt[0], index: harshAt.index }] } : null) : null;
  const fromKit = () => {
    if (!hit || !GENERAL.patternKit[authoredId]) return false;
    for (const a of GENERAL.patternKit[authoredId].angles) {
      if (used.has(a.id)) continue;
      let line = a.text;
      if (/\{thought\}/.test(line)) {
        const q = kitThought(authoredId, t, hit, pieces);
        if (!q) continue;
        line = line.replace(/\{thought\}/g, q);
      }
      if (authoredId === 'always-never') { line = overWord(line, t, hit); if (!line) continue; }
      angleId = a.id; [l1, l2] = linesFrom(line, pattern);
      return true;
    }
    return false;
  };
  const fromScenario = () => {
    if (scenario === GENERAL) return false;
    for (const kind of ANGLE_KINDS_FOR[pattern]) {
      const a = scenario.angles.find((x) => x.kind === kind && !used.has(x.id));
      if (a) { angleId = a.id; [l1, l2] = linesFrom(a.text, pattern); return true; }
    }
    return false;
  };
  if (!ownPair && !(anger && pattern === 'fact_vs_assumption')) {
    if (KIT_FIRST.has(pattern)) { if (!fromKit()) fromScenario(); } else if (!fromScenario()) fromKit();
  }
  // fact versus assumption from their own words ("“My chest felt tight today” is what happened.") rather than
  // the bare authored pair, which says nothing about what they told; and never that bare pair as the first angle
  // while another scene still fits these words
  if (!l1 && pattern === 'fact_vs_assumption' && (!anger || guess)) {
    const own = ownFactPair(fact, guess, allGuess, t);
    if (own) [l1, l2] = own;
    else if (!exclude.length && !exhausted && !hint) {
      const next = authoredScene(t, { emotion, exclude: ['fact_vs_assumption'], usedAngles, hint });
      if (!next.exhausted && !next.grief) return next;
    }
  }
  if (!l1) [l1, l2] = AUTHORED_PAIRS[pattern];

  // "another explanation": a different angle from the same situation (never the one just revealed), whole and
  // short enough to read as it is; for mind reading only a reading of the other person ("They might…")
  let alternative = '', altId = null;
  // (fair anger: a situation's "other explanation" could excuse a real wrong; only a guess about others is read)
  // (anger they never stated: no "Your anger might be pointing…"; nothing that could excuse the wrong either)
  if (pattern === 'valid_anger' || (anger && pattern !== 'mind_reading')) alternative = angry ? AUTHORED_ALT.valid_anger : '';
  else {
    try {
      const angles = buildAngles(scenario, { interpretation: guess, patterns: authoredId ? [authoredId] : [] });
      const kinds = pattern === 'mind_reading' ? ['benign'] : ['benign', 'context', 'not-enough-info', 'neutral'];
      const alt = angles.find((a) => a.id !== angleId && !used.has(a.id) && kinds.includes(a.kind) && !/\{thought\}/.test(a.text)
        && wholeLine(a.text, ALT_MAX) && (pattern !== 'mind_reading' || ABOUT_OTHERS.test(a.text)));
      alternative = alt ? alt.text : '';
      altId = alt ? alt.id : null;
    } catch { alternative = ''; }
  }

  // one useful action, from the situation's own next steps
  let step = '';
  try {
    const steps = buildNextSteps(scenario, { interpretation: guess, patterns: authoredId ? [authoredId] : [] });
    const kinds = STEP_KINDS_FOR[pattern] || [];
    // fair anger: only a boundary step (a situation's "say something light" could ask them to smooth over a real wrong)
    const s = pattern === 'valid_anger' || (anger && ['personalisation', 'practical_problem'].includes(pattern)) ? ((ANGER_SCENARIOS.has(scenario.id) && steps.find((x) => x.kind === 'boundary')) || GENERAL.nextSteps.find((x) => x.kind === 'boundary'))
      : kinds.map((k) => steps.find((x) => x.kind === k)).find(Boolean) || steps[0];
    step = s && words(s.text) <= 26 ? s.text : (GENERAL.nextSteps.find((x) => x.kind === (kinds[0] || 'act'))?.text || '');
    // no situation matched: the general step is about nothing they said, so a frame around their own words
    // (or a step for the practical problem they named) replaces it where one fits
    // (fair anger keeps its boundary step where the wrong is the subject: no "check one fact" about the wrong)
    if (scenario === GENERAL && !(anger && ['personalisation', 'practical_problem'].includes(pattern))) step = ownStep(pattern, t, { fact, guess, allGuess }) || step;
    // in Zuzu's voice: "you", never the engine's own "my message" / "I wouldn't" (quoted lines to say stay as they are)
    step = secondPerson(step);
  } catch { step = ''; }

  // the person's words, quoted whole (a long one is described instead: never cut)
  const quotable = (q) => String(q || '').replace(/[.!?…]+$/u, '').length <= QUOTE_MAX;
  const quoted = (q) => `“${String(q).replace(/[.!?…]+$/u, '')}”`;
  const lead = scenario.cameo?.mallow;
  const allowed = PATTERN_MALLOWS[pattern] || ['zuzu'];
  let mallow = mallowFor(pattern);
  if (emotion && SAD.has(emotion) && allowed.includes('blubi')) mallow = 'blubi';
  else if (emotion && ANGRY.has(emotion) && allowed.includes('glitzi')) mallow = 'glitzi';
  else if (lead && allowed.includes(lead) && lead !== 'zuzu') mallow = lead;

  // (review r8) without an interpretive marker of their own, nothing here frames the words: a step or an angle that
  // would ("Check one fact…", "They might…") gives way to an acknowledging one
  if (!framingAllowed(t)) {
    if (framesAsGuess(step)) step = secondPerson(GENERAL.nextSteps.find((x) => x.kind === 'act')?.text || KIND.steps.event);
    if (framesAsGuess(l1) || framesAsGuess(l2)) [l1, l2] = framesAsGuess(AUTHORED_PAIRS[pattern][0]) || framesAsGuess(AUTHORED_PAIRS[pattern][1]) ? [l1, l2] : AUTHORED_PAIRS[pattern];
    alternative = framesAsGuess(alternative) ? '' : alternative;
  }
  const scene = {
    source: 'authored',
    reasoning_pattern: pattern,
    interaction_type: PATTERN_INTERACTION[pattern],
    mechanic: PATTERN_INTERACTION[pattern],
    mallow_character: mallow,
    emotion: emotion || null,
    situation_type: null,
    known_fact: fact && !sameWords(fact, guess) && quotable(fact) ? `What you know: ${quoted(fact)}.` : allGuess ? KNOWN_SMALLER : quotable(t) ? `What you know is what you told me: ${quoted(t)}.` : KNOWN_TOLD,
    // (beside fair anger only the clause that reads into the wrong, never the wrong itself)
    possible_assumption: guess && !sameWords(guess, fact) && quotable(guess) ? `What your mind might be adding: ${quoted(guess)}.` : allGuess && t && quotable(t) ? `What your mind might be adding: ${quoted(t)}.` : '',
    alternative_angle: alternative,
    practical_next_step: step,
    subtitle_line_1: l1,
    subtitle_line_2: l2,
    safety_status: 'ok',
    authored_pattern: authoredId,
    angle_id: angleId,
    alt_id: altId,
    scenario_id: scenario.id,
    // (a wrong done to them: the mechanics say a stated event's own lines, never "weight on one thought")
    ...(anger ? { wrong: true } : {}),
    ...(exhausted ? { exhausted: true } : {}),
  };
  // the last word: a scene that would still frame words without a marker plays as an acknowledging one
  if (!framingAllowed(t) && framesScene(scene)) return feelingScene(t, angerAnswer(t, { emotion }) ? 'angry' : eventKind(t), { emotion, exclude, hint, guarded: true, lead: unsaidLead(t, emotion) });
  return scene;
}

/** The guess scenes: each needs an interpretive marker of its own in the words (markers.js). */
const GUESS_PATTERNS = new Set(['fact_vs_assumption', 'mind_reading', 'catastrophising', 'overgeneralisation', 'all_or_nothing', 'self_criticism']);
/** Someone else did something to them ("my sister ignored me", "they left me out", "he took my seat"). */
const HURT_ACT = /\b(?:he|she|they|someone|somebody|people|everyone|(?:my|our|the|his|her|their|a)\s+(?:\w+\s+)?(?:mum|mom|dad|sister|brother|friend|friends|boss|manager|colleague|coworker|teacher|partner|boyfriend|girlfriend|husband|wife|ex|flatmate|housemate|roommate|neighbour|neighbor|coach|landlord|family|cousin|aunt|uncle|nan|grandad|son|daughter|kids?|team|mate|mates|classmates?|group))\s+(?:\w+\s+){0,2}?(?:\w+ed|stole|broke|took|told|said|left|hit|made|gave|threw|kept|sent|let|went|forgot|blocked|ghosted|dumped|shut|cut|wrote|spoke|put|ran|drove|sold|spent|kicked|bit)\s+(?:me|my|us|our|on\s+me|at\s+me|to\s+me|about\s+me|over\s+me)\b/iu;
/**
 * A stated event: something someone did to them ('hurt'), something that happened ('event'), or words whose only bag
 * words are ordinary idioms ('neutral', review r10: "I passed my driving test!", "lost my keys", "my phone died"), whose
 * lines never call it hard.
 */
export function eventKind(text) {
  if (HURT_ACT.test(String(text ?? ''))) return 'hurt';
  return ordinaryOnly(text) ? 'neutral' : 'event';
}

/** The longest of their words a subtitle line quotes (characters, without the end punctuation). */
const LINE_QUOTE = 64;
const bare = (q) => String(q || '').replace(/[.!?…]+$/u, '').trim();
/**
 * Fact versus assumption in their own words, or null when nothing of theirs fits a line whole. Never beside a
 * death or harm word (backstop.js), and never the wrong of fair anger as "one way to read it".
 */
export function ownFactPair(fact, guess, allGuess, t) {
  if (!framingAllowed(t)) return null;
  if (fairAnger(t) && !guess) return null;
  const f = bare(fact), g = bare(guess), all = bare(t);
  const fits = (q) => !!q && q.length <= LINE_QUOTE;
  // a feeling is real, never "what happened" to be read one way or another; with nothing guessed beside it,
  // another scene comes first
  if (feelingOpens(f)) return fits(f) && fits(g) && !sameWords(f, g) && !feelingOpens(g) ? [`“${f}” is real.`, `“${g}” is one way to read it.`] : null;
  // (a feeling is never the guess, whichever side the engine put it on)
  if (feelingOpens(g)) return null;
  if (allGuess && feelingOpens(all)) return null;
  if (fits(f) && fits(g) && !sameWords(f, g)) return [`“${f}” is what happened.`, `“${g}” is one way to read it.`];
  if (allGuess && fits(all)) return [`“${all}” is one way to read what happened.`, 'What you know for sure is probably smaller than this thought.'];
  if (fits(g) && !sameWords(g, f)) return ['What happened is one thing.', `“${g}” is one way to read it.`];
  if (fits(f)) return [`“${f}” is what happened.`, AUTHORED_PAIRS.fact_vs_assumption[1]];
  return null;
}
/** Steps for the practical problem they named (no situation of the library matched it). */
const PRACTICAL_STEPS = [
  [/\b(?:essays?|assignments?|coursework|dissertation|homework)\b/iu, 'Pick one piece of work and write just its first few lines today.'],
  [/\b(?:deadline|due (?:on|by|in|tomorrow|today|tonight|next|this))\b/iu, 'Write down the one part the deadline really needs, and start with that.'],
  [/\binterview\b/iu, 'Write down three things you’d like them to know about you.'],
  [/\b(?:rent|bills?|overdraft|debt)\b/iu, 'Write down the exact amount and the date it’s due, then look at one option.'],
  [/\b(?:how do i|what do i do|what should i do|need to (?:decide|choose))\b/iu, 'Write the options side by side, and sleep on it before choosing.'],
];
/** A next step that quotes their own words (or fits the practical problem they named), or '' when none fits. */
export function ownStep(pattern, t, { fact, guess, allGuess }) {
  const g = bare(guess || (allGuess ? t : '')), q = (s) => s && s.length <= 48;
  // (never "check one fact" beside a death or harm word)
  if (!framingAllowed(t) && pattern !== 'practical_problem') return '';
  if (pattern === 'practical_problem') return (PRACTICAL_STEPS.find(([re]) => re.test(t)) || [])[1] || '';
  if (['fact_vs_assumption', 'mind_reading', 'catastrophising', 'personalisation'].includes(pattern) && q(g)) return `Check one fact about “${g}”, instead of guessing.`;
  if (pattern === 'self_criticism') {
    const hit = ownLabel(t);
    const label = hit ? wholeLabel(t, hit[0]) : '';
    if (q(label)) return `Try saying what happened, instead of “${bare(label)}”.`;
  }
  void fact;
  return '';
}

/**
 * The gentle scene (death talk, or a harm word no idiom explains): no mechanic, no reasoning pattern, no other
 * angle to show; an authored pair that is true whether or not anyone died (lines.js GRIEF). The orchestrator
 * plays it gently and keeps support close.
 */
export function gentleScene(text, { emotion = null, kind: told = null } = {}) {
  // (`kind`: what they told us it is, "Yes, it is" a loss, or a grief-family feeling chosen: 'loss' / 'grief')
  const kind = deathTalk(text) || (GRIEF[told] ? told : null) || 'heavy';
  const [l1, l2] = GRIEF[kind] || GRIEF.heavy;
  return {
    source: 'authored', grief: true, gentle: kind, reasoning_pattern: null, interaction_type: null, mechanic: null,
    mallow_character: 'zuzu', emotion: emotion || null, situation_type: null,
    known_fact: '', possible_assumption: '', alternative_angle: '', practical_next_step: '',
    subtitle_line_1: l1, subtitle_line_2: l2, safety_status: 'ok',
    authored_pattern: null, angle_id: null, alt_id: null, scenario_id: null,
  };
}

/**
 * A feeling of their own, said plainly: the whole message is feelings ("I feel empty", "I can’t stop
 * crying", feelings.js), or feelings and what happened, with nothing read into it ("I feel sad since my
 * sister moved away", "My sister moved away and I feel sad"): no one's mind read, no verdict, nothing feared
 * ahead, no habit the engine names, no situation the library knows better. → { kind } or null.
 */
export function feelingOf(text) {
  const t = String(text ?? '').trim();
  if (!t || fairAnger(t) || HARSH.test(t)) return null;
  const plain = feelingStatement(t);
  if (plain) return plain;
  let pieces = [];
  try { pieces = splitThought(t); } catch { pieces = []; }
  const feels = pieces.filter((p) => feelingClause(p.text));
  if (!feels.length || pieces.some((p) => !feelingOpens(p.text) && p.guess === 'interpretation')) return null;
  const said = t.replace(/\b(?:tired|sick|fed up|done) (?:of|with) (?:everything|it all)\b/giu, ' ');
  if (MINDY.test(said) || FUTURE.test(said) || EXTREME.test(said) || BLAME.test(said) || CUES.rumination.test(said) || CUES.practical_problem.test(said)) return null;
  try { if (detectPatterns(t).length) return null; } catch { return null; }
  try { const m = matchScenarios(t, { limit: 1 })[0]; if (m && m.score >= 2) return null; } catch { /* none */ }
  return { kind: feelingClause(feels[0].text) || 'low' };
}

/**
 * The mechanics a feeling plays, in the order "Show me another angle" walks (each acknowledges the feeling:
 * a small kind step, a gentle stroke, the feeling lifted out from the rest of them). Never pull_apart, never
 * a reading of what happened.
 */
export const FEELING_ORDER = Object.freeze({
  low: ['assemble_step', 'soften_harshness', 'separate_one'],
  heavy: ['assemble_step', 'soften_harshness', 'separate_one'],
  lonely: ['assemble_step', 'soften_harshness', 'separate_one'],
  crying: ['assemble_step', 'soften_harshness', 'separate_one'],
  anxious: ['assemble_step', 'separate_one', 'soften_harshness'],
  tired: ['assemble_step', 'separate_one', 'soften_harshness'],
  guilty: ['soften_harshness', 'assemble_step', 'separate_one'],
  angry: ['assemble_step', 'soften_harshness', 'separate_one'],
  // a stated event (review r8): it happened; someone did it ('hurt': its weight goes back with them too)
  event: ['assemble_step', 'soften_harshness', 'separate_one'],
  // only ordinary idioms ("I passed my driving test!"): neutral lines (review r10)
  neutral: ['assemble_step', 'separate_one', 'soften_harshness'],
  hurt: ['assemble_step', 'return_responsibility', 'soften_harshness'],
});
function feelingOrder(kind, hint = null) {
  const order = [...(FEELING_ORDER[kind] || FEELING_ORDER.low)];
  // the server's hint leads only when it is one of these (its pull_apart never is)
  const h = hint ? PATTERN_INTERACTION[hint] : null;
  if (h && order.includes(h)) { order.splice(order.indexOf(h), 1); order.unshift(h); }
  return order;
}
/* (A line that frames what was said as a guess, or sends it to be checked: backstop.js framesAsGuess.) */
/** The mechanics a feeling or a stated event may play, whoever chose them (fair anger's own line too). */
const FEELING_PLAYS = new Set(['assemble_step', 'soften_harshness', 'separate_one', 'return_responsibility']);
/** …and the ones that acknowledge on their own lines whatever the words (a server's kind choice stays). */
const KIND_PLAYS = new Set(['assemble_step', 'find_boundary', 'return_responsibility', 'let_loop_drift']);
/**
 * A server scene for a feeling said plainly (feelingOf): its lines play when they never frame the feeling as
 * a guess, but on one of the feeling's own mechanics (never pull_apart's "What your mind added" or a first
 * guess), with one small step; lines that would fact-check it give way to the authored feeling scene.
 * Any other scene or words: unchanged.
 */
export function feelingGuard(scene, text, { emotion = null, exclude = [] } = {}) {
  if (!scene || scene.source !== 'server') return scene;
  const feel = feelingOf(text);
  if (!feel) return scene;
  // (review r9: without a marker of their own, only a reading that keeps them may say its own lines, SERVER_KEEPS)
  if ([scene.subtitle_line_1, scene.subtitle_line_2, scene.practical_next_step, scene.known_fact, scene.possible_assumption].some(framesAsGuess)
    || (!framingAllowed(text) && !serverLinesKeep(scene, text, { emotion }))) {
    return feelingScene(text, feel.kind, { emotion, exclude });
  }
  const plays = FEELING_PLAYS.has(scene.mechanic) && scene.mechanic !== 'return_responsibility' || (feel.kind === 'angry' && scene.mechanic === 'find_boundary');
  // (only the mechanic the client plays changes: the pattern and interaction stay the server's for its records)
  return { ...scene, feeling: feel.kind, mechanic: plays ? scene.mechanic : 'assemble_step', possible_assumption: '', alternative_angle: '', practical_next_step: scene.practical_next_step || FEELING.steps[feel.kind] || FEELING.steps.low };
}

/**
 * The gate for any scene (a server's, or one forced by the lab) played for words with no interpretive marker of their
 * own, or beside a bag word: the fact-vs-guess framing is never used. Death talk and the 'gentle' route never get here
 * (the orchestrator plays them gently). A server scene keeps its own lines only when its reading is one that keeps them
 * (SERVER_KEEPS: fair anger, a practical problem, replaying; review r9 made this an allowlist by reading), its mechanic
 * frames nothing and none of its said lines frames the words or excuses a wrong done to them; it then plays on a
 * mechanic that acknowledges (beside a bag word, a kind step with a feeling's safe lines and prompts: `feeling` set,
 * `guarded`). Every other server scene, and an authored framing scene, gives way to the authored kind-step scene.
 * With a marker, a server scene plays with only the marked clause as the guess (onlyTheClause).
 */
export function guessGuard(scene, text, { emotion = null, exclude = [] } = {}) {
  if (!scene || scene.grief) return scene;
  // anger they never stated ("My boss embarrassed me in front of everyone", or the Embarrassed chip): no scene of anger's
  // own, whoever chose it (find_boundary, valid_anger, a line that speaks of anger), but Zuzu's own scene for these words
  // without one (a stated event's kind steps; a wrong done to them is still never the guess)
  if (speaksAnger(scene) && angerUnsaid(text, emotion)) scene = authoredScene(text, { emotion, exclude: [...exclude, 'valid_anger'] });
  // an interpretive marker of their own: the framing may play, but only that clause is the guess (a server's
  // reading of the stated event as the guess gives way to the clause, and its lines to the authored ones)
  if (framingAllowed(text)) return scene.source === 'server' ? noGriefLines(onlyTheClause(scene, text), text) : scene;
  const kind = scene.feeling || feelingOf(text)?.kind || (angerAnswer(text, { emotion }) ? 'angry' : eventKind(text));
  // (fair anger gets its own scenes, the wrong as the fact: find_boundary, its weight put back, one step)
  // (a wrong told with another feeling than anger: the server's own acknowledging mechanic leads, "lift this one moment
  // out", else unsaidLead's; never anger's own)
  const leadFor = () => { const own = unsaidLead(text, emotion); return own && scene.source === 'server' && FEELING_PLAYS.has(scene.mechanic) ? scene.mechanic : own; };
  const kindScene = () => (angerAnswer(text, { emotion }) && !scene.feeling ? authoredScene(text, { emotion, exclude }) : feelingScene(text, kind, { emotion, exclude, guarded: true, lead: leadFor() }));
  if (scene.source !== 'server') {
    // an authored scene that doesn't frame them (fair anger's line, a practical step, replaying, its own blame) stays;
    // beside a bag word only the kind steps' own lines play
    if (framesScene(scene) || (bagWords(text) && !scene.feeling)) return kindScene();
    return scene;
  }
  // a server scene whose reading frames them (whatever its lines say), or whose lines frame them or excuse a wrong
  // done to them: the authored kind scene, with its own lines (review r9: an allowlist by reading, SERVER_KEEPS)
  if (!serverLinesKeep(scene, text, { emotion })) return kindScene();
  // (review r12) beside a bag word a server's practical-problem lines ("real problems have next steps") never play: a
  // death read as a practical problem ("my father was taken by the sea") hears the kind steps' own lines
  if (scene.reasoning_pattern === 'practical_problem' && bagWords(text)) return kindScene();
  // its kind lines stay (as for a feeling): on a mechanic that acknowledges on its own lines (fair anger's line, a
  // step, replaying, its weight put back), else on a kind step with the kind lines (never a framing mechanic, a
  // label's "harsh verdict" or "every time")
  const keep = KIND_PLAYS.has(scene.mechanic) && !bagWords(text);
  return {
    ...scene, ...(keep ? {} : { feeling: kind }), guarded: true,
    mechanic: keep || FEELING_PLAYS.has(scene.mechanic) ? scene.mechanic : 'assemble_step',
    possible_assumption: '', alternative_angle: '',
    practical_next_step: scene.practical_next_step || (EVENT_KINDS.has(kind) ? KIND.steps[kind] : FEELING.steps[kind]) || FEELING.steps.low,
  };
}
/** (the r7 name) */
export const harmGuard = guessGuard;
/**
 * The server's readings whose own lines may play for words with no interpretive marker of their own (review r9): fair
 * anger, a practical problem, replaying. Every other reading (fact versus assumption, mind reading, the worst case,
 * always / never, all or nothing, a verdict on themselves, "you might be one part of it") reads the words as a guess
 * whatever its lines say, so the authored kind or feeling scene plays instead.
 */
export const SERVER_KEEPS = Object.freeze(new Set(['valid_anger', 'practical_problem', 'rumination']));
/** A line that excuses what someone did to them ("Is it possible she was just curious?", "Maybe he didn't mean it"). */
const EXCUSES = /\b(?:maybe|perhaps|possibly|is it possible|it[’']?s possible|could it be|might have|may have|could have|might not have|didn[’']?t mean|did not mean|never meant|wasn[’']?t trying|was just|were just|was only|were only|under (?:a lot of )?pressure|(?:a )?bad day|stressed|didn[’']?t think|didn[’']?t realise|didn[’']?t realize|didn[’']?t know|didn[’']?t notice|not personal|nothing personal|their own (?:stuff|reasons|issues|problems)|(?:his|her|their) side|another side|meant well|good intentions|benefit of the doubt|curious|by accident|accidentally|misunderstand\w*|misread\w*)\b/iu;
/** Someone did something to them (fair anger, or a stated hurt): a line beside it never excuses the act. */
const wrongDone = (text) => fairAnger(text) || eventKind(text) === 'hurt';
/**
 * True when a server scene's own lines may play for words with no interpretive marker: its reading keeps them
 * (SERVER_KEEPS), its mechanic frames nothing, none of its lines frames the words, and beside a wrong done to them
 * none of its lines excuses the act.
 */
export function serverLinesKeep(scene, text, { emotion = null } = {}) {
  if (!scene) return false;
  // (personalisation, only for blame they put on themselves: "it's my fault" is theirs to re-weigh, on return_responsibility)
  const blame = scene.reasoning_pattern === 'personalisation' && BLAME.test(String(text ?? '')) && !fairAnger(text);
  if (!SERVER_KEEPS.has(scene.reasoning_pattern) && !blame) return false;
  // (review r10) beside a bag word or death talk, a server's fair-anger reading never says its lines
  if (scene.reasoning_pattern === 'valid_anger' && !angerAnswer(text, { emotion })) return false;
  if (FRAMING_MECHANICS.has(scene.mechanic) || FRAMING_MECHANICS.has(scene.interaction_type)) return false;
  // (only the lines that are said: a kept scene's assumption and "another explanation" are never shown)
  const said = [scene.subtitle_line_1, scene.subtitle_line_2, scene.practical_next_step, scene.known_fact];
  if (said.some(framesAsGuess)) return false;
  if (wrongDone(text) && said.some((l) => EXCUSES.test(String(l || '')))) return false;
  // (review r11) lines that speak of grief or of missing someone never play for words with no death or loss in them
  // (a server's grief pair tagged ordinary, for "my grandad is visiting next week")
  if (said.some((l) => GRIEF_LINE.test(String(l || ''))) && !lossSignal(text)) return false;
  return true;
}
/**
 * (review r12) With a marker of their own a server scene keeps its lines (onlyTheClause), but never lines that speak of
 * grief or of missing someone for words with no death or loss in them (a server's grief pair tagged ordinary, for "my dad
 * is always working late"): the reading's own authored pair plays instead (AUTHORED_PAIRS).
 */
function noGriefLines(scene, text) {
  if (!scene || ![scene.subtitle_line_1, scene.subtitle_line_2].some((l) => GRIEF_LINE.test(String(l || ''))) || lossSignal(text)) return scene;
  const pair = AUTHORED_PAIRS[scene.reasoning_pattern] || AUTHORED_PAIRS.fact_vs_assumption;
  return { ...scene, subtitle_line_1: pair[0], subtitle_line_2: pair[1] };
}
/**
 * A death or a loss in the words: death talk, someone alive but going, or a person beside a strong loss cue (strongLoss;
 * never the weak cues alone, "my mum is resting after her shift", nor a lost match).
 */
const lossSignal = (text) => gentleRoute(text) || strongLoss(text);
/** A line that speaks of grief, a loss, a death or missing someone (a server's grief answer). */
const GRIEF_LINE = /\b(?:grie\w*|griev\w*|mourn\w*|bereave\w*|loss|lost\s+(?:them|him|her|someone)|died|death|dead|passed|gone|missing\s+(?:them|him|her|someone|you)|miss(?:es|ed)?\s+(?:them|him|her|someone|you)|heaven|rest\s+in\s+peace|funeral|their\s+memory|in\s+memory)\b/iu;
/**
 * True when a scene would frame the person's words as a fact and a guess: its mechanic, a mechanic's own framing
 * lines (an overgeneralisation's "every time", a label's "harsh verdict"), or a line of it.
 */
export function framesScene(scene) {
  if (!scene) return false;
  if (FRAMING_MECHANICS.has(scene.mechanic)) return true;
  if (!scene.feeling && ['separate_one', 'soften_harshness'].includes(scene.mechanic)) return true;
  return [scene.subtitle_line_1, scene.subtitle_line_2, scene.practical_next_step].some(framesAsGuess);
}
/**
 * A server scene for words with a marker: only the marker's clause is the guess. Its assumption keeps its own words
 * when it is about that clause, else the clause itself; a line that quotes something else of theirs as a guess gives
 * way to the authored pair for the pattern.
 */
function onlyTheClause(scene, text) {
  const clause = guessClause(text);
  if (!clause) return scene;
  // (the clause's own words: those the stated event shares, "everyone" in "in front of everyone", never count)
  const fact = new Set(contentWords(split(text).fact));
  const own = contentWords(clause).filter((w) => !fact.has(w)).length ? contentWords(clause).filter((w) => !fact.has(w)) : contentWords(clause);
  const about = (s) => contentWords(s).some((w) => own.includes(w));
  const quotesElse = (line) => framesAsGuess(line) && [...String(line || '').matchAll(/[“"]([^”"]+)[”"]/gu)].some((q) => !about(q[1]));
  // (review r9) beside fair anger, a line that excuses the wrong and is not about the clause ("Maybe they didn't
  // notice.", "Is it possible she was just curious?") never plays: only the clause is read another way
  const l1 = scene.subtitle_line_1, l2 = scene.subtitle_line_2;
  const excuses = (line) => !!line && fairAnger(text) && EXCUSES.test(String(line)) && !about(line);
  const badGuess = !!scene.possible_assumption && !about(scene.possible_assumption);
  const badLines = quotesElse(l1) || quotesElse(l2) || excuses(l1) || excuses(l2);
  if (excuses(scene.alternative_angle)) scene = { ...scene, alternative_angle: '' };
  // (review r9) "what you know" never carries the guess: a known_fact with the clause's own words in it gives way to
  // the stated event (or, with none, to what they told)
  const badKnown = !!scene.known_fact && about(scene.known_fact);
  if (!badGuess && !badLines && !badKnown) return scene;
  const out = { ...scene };
  if (badKnown) {
    const f = split(text).fact;
    out.known_fact = f && !sameWords(f, clause) && f.replace(/[.!?…]+$/u, '').length <= QUOTE_MAX ? `What you know: “${f.replace(/[.!?…]+$/u, '')}”.` : KNOWN_TOLD;
  }
  if (badGuess) out.possible_assumption = `What your mind might be adding: “${clause.replace(/[.!?…]+$/u, '')}”.`;
  if (badLines) {
    const pair = out.reasoning_pattern === 'fact_vs_assumption' ? ownFactPair(split(text).fact, clause, false, text) : null;
    [out.subtitle_line_1, out.subtitle_line_2] = pair || AUTHORED_PAIRS[out.reasoning_pattern] || [out.subtitle_line_1, out.subtitle_line_2];
  }
  return out;
}
const STOP = new Set(['that', 'this', 'with', 'they', 'them', 'their', 'what', 'just', 'have', 'been', 'your', 'mine', 'about', 'from', 'will', 'would', 'into', 'were', 'when', 'then', 'than', 'because', 'might', 'could', 'should', 'there', 'here', 'really', 'still', 'only', 'even', 'some', 'something', 'thing']);
const contentWords = (s) => (String(s || '').toLowerCase().replace(/[‘’']/g, '').match(/\p{L}{4,}/gu) || []).filter((w) => !STOP.has(w)).map((w) => w.replace(/(?:ing|ed|s)$/u, '').replace(/e$/u, ''));

/** A feeling's scene (feelingStatement): in the server's shape, with `feeling` set to its kind. */
export function feelingScene(text, kind = 'low', { emotion = null, exclude = [], hint = null, guarded = false, lead = null } = {}) {
  const order = feelingOrder(kind, hint);
  // (`lead`: one of the kind mechanics that goes first, a wrong told with embarrassment or shame: unsaidLead)
  if (lead && FEELING_PLAYS.has(lead)) { if (order.includes(lead)) order.splice(order.indexOf(lead), 1); order.unshift(lead); }
  const fresh = order.find((m) => !exclude.includes(INTERACTION_PATTERN[m]));
  const mechanic = fresh || order[0];
  // (a stated event's own lines: it happened, it counts; a feeling's: it is real)
  const event = EVENT_KINDS.has(kind);
  const pairs = kind === 'neutral' ? KIND.neutral.pairs : event || !FEELING.pairs[mechanic] ? KIND.pairs : FEELING.pairs;
  const firsts = event ? KIND.first : FEELING.first;
  const pair = pairs[mechanic];
  const l1 = mechanic === 'assemble_step' ? (firsts[kind] || pair[0]) : pair[0];
  return {
    source: 'authored', feeling: kind,
    reasoning_pattern: INTERACTION_PATTERN[mechanic], interaction_type: mechanic, mechanic,
    // a gentle Mallow for low, lonely and tearful feelings; Zuzu for the rest (nobody bouncy)
    mallow_character: ['low', 'lonely', 'crying', 'heavy'].includes(kind) ? 'blubi' : 'zuzu',
    emotion: emotion || null, situation_type: null,
    known_fact: event ? '' : FEELING.known, possible_assumption: '', alternative_angle: '',
    practical_next_step: (event ? KIND.steps[kind] : FEELING.steps[kind]) || FEELING.steps.low,
    subtitle_line_1: l1, subtitle_line_2: pair[1], safety_status: 'ok',
    authored_pattern: null, angle_id: null, alt_id: null, scenario_id: null,
    ...(guarded ? { guarded: true } : {}),
    // (a wrong done to them, told with another feeling than anger: still a wrong, never "weight on one thought")
    ...(fairAnger(text) ? { wrong: true } : {}),
    ...(fresh ? {} : { exhausted: true }),
  };
}

/* (A harsh label of their own: markers.js HARSH.) */
/** A phrase of theirs that only stands inside someone else's view ("thinks I am useless"). */
const VIEWED = (t, phrase) => { const i = String(t).indexOf(phrase); return i >= 0 && !ownLabel(String(t).slice(Math.max(0, i - 60), i + phrase.length)); };
/** The blame the person put on themselves, as typed ("it's my fault"), for the heaviest weight. */
const BLAME_PHRASE = /(?:\b(?:it['’]?s|it is|it was|that['’]?s|that was|this is|was)\s+)?(?:all\s+)?\b(?:my fault|on me|because of me|my own fault|down to me|i ruined it|i let (?:them|everyone|the team|her|him) down)\b/iu;

/** The question a side asks when the words give it nothing real to show (never a copy of the other side). */
export const FACT_ASK = 'What did you actually see or hear?';
export const GUESS_ASK = 'What might it mean?';
/** Authored possibilities for mind reading, after the scene's own alternative: each a reading of the other person (lines.js has the same three). */
const OTHER_MEANINGS = ['They might have something else on their mind.', 'They might not see it the way you fear.', 'They might not have meant it the way it landed.'];
/** The person's words on a tag or card: whole up to this length (a card wraps), shortened at a word only beyond it. */
const WORDS_MAX = 72;
/** The verdict's name when their words carry no harsh word of their own (soften_harshness). */
const HARSH_NAME = 'The harshest way to see it';

const norm = (s) => String(s ?? '').toLowerCase().replace(/[‘’`´]/g, "'").replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
/** Two lines that say the same thing (same words, ignoring case and punctuation), or one inside the other. */
export function sameWords(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x === y || (x.length > 12 && y.includes(x)) || (y.length > 12 && x.includes(y));
}
/**
 * What the mechanics need: the fact and the guess, the harsh verdict for
 * "soften", the heaviest weight, the possibilities for "open", a short
 * excerpt, and the next step cut into three pieces for "assemble".
 *
 * A server scene personalises them (its known_fact, possible_assumption,
 * alternative_angle, practical_next_step: the game uses the structured result).
 * Without one, the person's own words are split by the authored engine
 * (exact phrases, never reworded). Either way the two sides of fact versus
 * assumption are never the same words: a side with nothing real to show asks
 * a question instead (factAsk / guessAsk).
 */
export function sceneParts(text, scene = {}) {
  const t = String(text ?? '').trim();
  const server = scene?.source === 'server';
  const anger = fairAnger(t);
  const sp = split(t);
  // fair anger: the wrong is the fact, and only a clause that reads into it is the guess
  const { fact: f0, guess: g0 } = anger ? angerSplit(t) : sp;
  const { pieces } = sp;
  // only an interpretation was told ("Nobody likes me"): there is no fact in the words to show
  const allGuess = !anger && pieces.length > 0 && pieces.every((p) => p.guess === 'interpretation');
  // (every line here is whole: a card wraps rather than cut a sentence; only words longer than a card can
  // hold are shortened, at a word, the way the Thought Mallow's own tag shows them)
  let fact = server ? firstWhole(scene.known_fact, 160) : '';
  if (!fact && f0 && !(allGuess && sameWords(f0, g0))) fact = excerpt(f0, WORDS_MAX);
  if (!fact && !allGuess && t) fact = excerpt(t, WORDS_MAX);
  let guess = server ? firstWhole(scene.possible_assumption, 160) : '';
  if (!guess && g0 && !sameWords(g0, fact)) guess = excerpt(g0, WORDS_MAX);
  if (!guess && allGuess && !sameWords(t, fact)) guess = excerpt(t, WORDS_MAX);
  if (guess && sameWords(guess, fact)) guess = '';
  const factAsk = !fact, guessAsk = !guess;

  // (the whole label as typed: "I’m a terrible person", never "I’m a terrible"; only a label of their own, never
  // "I am useless" lifted out of "Everyone at work thinks I am useless")
  const harshHit = ownLabel(t);
  let harsh = harshHit ? wholeLabel(t, harshHit[0]) : '';
  if (!harsh) { try { const big = detectPatterns(t).find((f) => f.pattern.id === 'big-label'); harsh = big && ownLabel(big.matches[0].text) && !VIEWED(t, big.matches[0].text) ? wholeLabel(t, big.matches[0].text) : ''; } catch { /* none */ } }
  // no harsh word of their own: the scene's (a server's assumption), or their words when short, else an authored name for it
  if (!harsh) harsh = (server && firstWhole(scene.possible_assumption, 70)) || (g0 && g0.length <= 48 ? g0 : '') || (t.length <= 48 ? t : '') || HARSH_NAME;
  // a feeling's (or a stated event's) plate (soften) carries their words as they said them, never a name for a verdict
  if (scene?.feeling) harsh = excerpt(t, WORDS_MAX);

  // the heaviest weight: the blame as they put it ("it's my fault"), else the part their mind added
  const bm = BLAME_PHRASE.exec(t);
  // (fair anger: the wrong itself, to be put back with whoever did it)
  // (something someone did to them: what they did, to be put back with them)
  const hurt = scene?.feeling === 'hurt' || scene?.feeling === 'angry';
  const weight = bm ? excerpt(bm[0].trim(), 44) : anger || hurt ? (f0 && f0.length <= 44 ? f0 : hurt && t.length <= 44 ? t : '') : g0 && !sameWords(g0, f0) && g0.length <= 44 ? g0 : '';

  // mind reading: the scene's own other explanation first (a server's whole sentence; an authored one only when
  // it reads the other person), then the authored possibilities (three, all different, each about them)
  const alternatives = [];
  const alt = server ? firstWhole(scene?.alternative_angle, 150) : (ABOUT_OTHERS.test(String(scene?.alternative_angle || '').trim()) ? wholeLine(scene.alternative_angle, ALT_MAX) : '');
  if (alt && !sameWords(alt, guess) && !sameWords(alt, t)) alternatives.push(alt);
  for (const o of OTHER_MEANINGS) if (alternatives.length < 3 && !alternatives.some((a) => sameWords(a, o))) alternatives.push(o);

  return {
    excerpt: excerpt(t, WORDS_MAX),
    // one line's worth, for a crowded small screen
    excerptShort: excerpt(t, 28),
    fact: fact || FACT_ASK,
    guess: guess || GUESS_ASK,
    factAsk, guessAsk,
    harsh,
    weight,
    alternatives,
    steps: chunkStep(scene?.practical_next_step || ''),
    source: server ? 'server' : 'authored',
  };
}

/** A sentence in three pieces, broken at natural joins (for the assemble mechanic). */
const JOIN_BEFORE = /^(?:and|or|but|then|so|to|before|after|when|while|until|if|how|what|that|which|with|without|for|about|by|from|into|instead|because|rather)$/i;
const TAKES_TO = /^(?:tends?|needs?|wants?|tr(?:y|ies|ying)|going|able|ha(?:ve|s|d)|got|used|seems?|likes?|hopes?|plans?|ready|easier|harder|starts?|begins?|helps?|learn\w*)$/i;
const NO_END = /^(?:a|an|the|to|your|my|their|our|his|her|its|this|that|of|in|on|at|for|with|or|and|but|is|are|be|was|one|two|three|four|five|ten|few|little|small|short|quick|kind|gentle|new|very|just|you|i|we|they|he|she|it's|can|will|could|would|might|not|no|any|some|each|every|how|what|before|after|if|when)$/i;
export function chunkStep(step) {
  const s = String(step || '').replace(/\s+/g, ' ').trim().replace(/[.!]+$/u, '');
  if (!s) return ['One small', 'doable', 'thing'];
  const w = s.split(' ');
  if (w.length <= 3) return w.length === 3 ? w : [...w, ...Array(3 - w.length).fill('·')].slice(0, 3);
  const n = w.length;
  // a list ("a payment plan, your bank, or a free advice service"): its items belong together, so a cut inside
  // it is the last resort; the clause around it (a colon, a dash, a full stop) is the natural place to cut
  const inList = new Uint8Array(n + 1);
  for (let c = 0; c < n - 1; c++) {
    if (!/,$/.test(w[c])) continue;
    for (let j = c + 1; j < Math.min(n, c + 6); j++) {
      if (/[.;:!?]$/.test(w[j - 1]) && j - 1 > c) break;
      if (/^(?:or|and)$/i.test(w[j])) {
        // the items before the comma (back to the clause's start, at most four words) up to the word after "or"/"and"
        let a = c; while (a > 0 && c - a < 3 && !/[,.;:!?]$/.test(w[a - 1])) a--;
        for (let k = a + 1; k <= Math.min(n - 1, j + 2); k++) inList[k] = 1;
        break;
      }
    }
  }
  // how good a cut just before word i is: punctuation and joining words are good, a dangling little word is not
  // ("Cringe tends | to fade" leaves a verb waiting for its "to")
  const join = (i) => (inList[i] ? 4 : 0) + (/[.!?]$/.test(w[i - 1]) ? -2 : /[;:\u2013\u2014]$/.test(w[i - 1]) ? -2.2 : /,$/.test(w[i - 1]) ? (inList[i] ? -0.4 : -1.6) : 0)
    + (JOIN_BEFORE.test(w[i]) && !inList[i] && !(/^to$/i.test(w[i]) && TAKES_TO.test(w[i - 1])) ? -1.2 : 0) + (NO_END.test(w[i - 1].replace(/[,;:]$/, '')) && !/[,;:]$/.test(w[i - 1]) ? 1.6 : 0)
    + (/^to$/i.test(w[i]) && TAKES_TO.test(w[i - 1]) ? 2.4 : 0);
  // a sentence end inside the step is always a cut (two sentences are never run together in one piece)
  let stop = -1;
  for (let i = 1; i < n; i++) if (/[.!?]["”’)]*$/.test(w[i - 1])) { stop = i; break; }
  let best = [Math.round(n / 3), Math.round((2 * n) / 3)], score = Infinity;
  for (let a = 1; a < n - 1; a++) {
    for (let b = a + 1; b < n; b++) {
      if (stop > 0 && a !== stop && b !== stop) continue;
      const lens = [a, b - a, n - b];
      const sc = join(a) + join(b) + 0.35 * (Math.max(...lens) - Math.min(...lens)) + lens.reduce((t, l) => t + Math.max(0, l - 6), 0);
      if (sc < score - 1e-9) { score = sc; best = [a, b]; }
    }
  }
  const [a, b] = best;
  return [w.slice(0, a).join(' '), w.slice(a, b).join(' '), w.slice(b).join(' ')].map((x) => x.replace(/[,;:.\u2013\u2014]$/u, '').trim());
}
