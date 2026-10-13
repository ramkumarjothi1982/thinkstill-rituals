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
import { AUTHORED_PAIRS, AUTHORED_ALT, GRIEF, FEELING } from './lines.js';
import { bereavement, passedAlone, livingLoss } from './grief.js';
import { feelingStatement, feelingClause, feelingOpens } from './feelings.js';

// strong cues the authored habits don't name (practical problems, fair anger, replaying)
const CUES = {
  rumination: /\b(?:replay\w*|keep (?:thinking|going over|going back to|coming back to)|can'?t stop (?:thinking|replaying|going over)|over and over|round and round|going round in circles)\b/i,
  valid_anger: /\b(?:unfair|furious|fuming|livid|seething|rude|disrespect\w*|took (?:the |all the )?credit|shouted at|yelled at|humiliat\w*|so angry|really angry|angry (?:at|with|that|about)|cancell?ed on me(?: again)?|lied to me|went behind my back|talked over me|interrupt\w* me|embarrassed me|belittled me|made fun of me|mocked me|put me down|undermin\w* me)\b/i,
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
/** The person's own fair anger in the words (not someone's anger at them). */
export function fairAnger(text) {
  return CUES.valid_anger.test(String(text ?? '').replace(ANGRY_AT_ME, ' ').replace(FEEL_HUMILIATED, ' '));
}
/**
 * A loss (someone, or a pet, has died: grief.js reads only the words a person uses for a death, never
 * 'passed' alone or "lost my mum's ring"). Grief is not a thought to fix: never a mechanic or a
 * fact/assumption split; Zuzu answers gently (griefScene) and, with sharing on, the server may answer it.
 */
export { bereavement };
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
/** Patterns whose habit angle (quoting the words) beats the situation's own angle. */
const KIT_FIRST = new Set(['self_criticism', 'all_or_nothing', 'overgeneralisation', 'catastrophising']);
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

/** The person's words split (by the authored engine) into "what happened" and "what my mind added", as exact phrases. */
function split(text) {
  let pieces = [];
  try { pieces = splitThought(text); } catch { pieces = []; }
  // a verdict on themselves ("I’m a horrible mother") is never "what happened": it is what the mind added
  pieces = pieces.map((p) => (p.guess !== 'interpretation' && HARSH.test(String(p.text || '')) ? { ...p, guess: 'interpretation' } : p));
  // a feeling of their own ("I feel empty", "I can’t stop crying", "I’m feeling unsafe") is what is so, never
  // what the mind added (feelingOpens: a feeling word the list doesn't name still opens as one)
  pieces = pieces.map((p) => (feelingOpens(p.text) && !HARSH.test(String(p.text || '')) ? { ...p, guess: 'fact', feeling: true } : p));
  const factP = pieces.find((p) => p.guess === 'fact') || (pieces.length > 1 ? pieces.find((p) => p.guess === 'unsure') : null);
  const lastP = pieces.length > 1 ? pieces[pieces.length - 1] : null;
  const guessP = pieces.find((p) => p.guess === 'interpretation' && p !== factP && readsAsGuess(p.text)) || (lastP && lastP !== factP && readsAsGuess(lastP.text) ? lastP : null);
  const fact = factP ? exactPhrase(text, factP.text) : '';
  const guess = guessP && guessP !== factP ? exactPhrase(text, guessP.text) : '';
  return { fact, guess, pieces };
}

/**
 * A piece the engine was unsure of, taken as "what my mind added" only when it reads like one: about someone
 * else, ahead in time, a verdict or an extreme. What the person says about themselves, now ("I haven’t started",
 * "I can’t stop crying", "I feel empty"), is something that happened, never their mind's addition.
 */
const SELF_NOW = /^(?:(?:and|but|so|now|still) )?(?:i|i['’]ve|i['’]m|i am|i have|i had|i was|i feel|i felt|i keep|i can['’]?t|i cannot|i don['’]?t|i didn['’]?t|i haven['’]?t|i hadn['’]?t|i wasn['’]?t|i still|i just|i've)\b/iu;
function readsAsGuess(piece) {
  const p = String(piece || '');
  if (feelingOpens(p) && !HARSH.test(p)) return false;
  if (!SELF_NOW.test(p)) return true;
  return MINDY.test(p) || FUTURE.test(p) || EXTREME.test(p) || HARSH.test(p);
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
  const out = [];
  const add = (p) => { if (p && PATTERNS.includes(p) && !out.includes(p)) out.push(p); };
  let found = [];
  try { found = detectPatterns(text); } catch { found = []; }
  const has = (id) => found.some((f) => f.pattern.id === id);
  const always = found.find((f) => f.pattern.id === 'always-never');
  const strong = !!always && always.matches.some((m) => strongAlways(text, m));
  // the fallbacks below only offer a scene that can make sense for these words (a scene that doesn't fit
  // is never played to fill a gap: when the fitting ones run out, Zuzu says so)
  const fits = (p) => {
    if (p === 'mind_reading') return OTHERS.test(text) && (MINDY.test(text) || has('mind-reading'));
    if (p === 'personalisation') return (BLAME.test(text) || has('spotlight-on-me')) && !fairAnger(text);
    if (p === 'valid_anger') return fairAnger(text) || ANGRY.has(emotion);
    if (p === 'rumination') return CUES.rumination.test(text) || LOOPY.has(emotion) || /\bwhat if\b/i.test(text);
    if (p === 'overgeneralisation') return strong;
    if (p === 'self_criticism') return HARSH.test(text) || has('big-label') || has('should-rules');
    if (p === 'catastrophising') return FUTURE.test(text) || has('worst-case-jump') || has('future-reading') || ANXIOUS.has(emotion);
    if (p === 'all_or_nothing') return EXTREME.test(text) || has('all-or-nothing') || has('only-the-bad-bit') || has('shrinking-the-good');
    if (p === 'practical_problem') return CUES.practical_problem.test(text) || (!!scenario && scenario !== GENERAL && !fairAnger(text)) || ['overwhelm', 'stress'].includes(emotion);
    return true;
  };
  const maybe = (p) => { if (p && fits(p)) add(p); };
  if (hint) add(hint);
  if (CUES.rumination.test(text)) add('rumination');
  if (fairAnger(text)) add('valid_anger');
  // a habit the engine found in the words, when its scene makes sense for them ("everyone" / "nobody" are
  // everywhere in ordinary speech: always/never only counts when it is the subject: "Nobody likes me")
  for (const f of found) if (f.pattern.id !== 'always-never') maybe(AUTHORED_TO_PATTERN[f.pattern.id]);
  // a harsh label of their own the engine's list doesn't name ("I’m a horrible mother") is that habit too
  if (HARSH.test(text)) maybe('self_criticism');
  if (CUES.practical_problem.test(text)) add('practical_problem');
  if (strong) add('overgeneralisation');
  if (scenario && scenario !== GENERAL) for (const id of scenario.likelyPatterns || []) maybe(AUTHORED_TO_PATTERN[id]);
  if (emotion && EMOTION_DEFAULT[emotion]) maybe(EMOTION_DEFAULT[emotion]);
  for (const p of ROTATION) maybe(p);
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
    const clause = pieces.map((p) => exactPhrase(text, p.text)).find((c) => c && c.toLowerCase().includes(m.toLowerCase()));
    const c = String(clause || '').replace(/[\s.,;:!?…]+$/u, '');
    return c && words(c) <= 9 ? c : '';
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
  // someone has died: never a mechanic or a fact/assumption split (the orchestrator plays griefScene gently)
  if (bereavement(t)) return griefScene(t, { emotion });
  // a feeling said plainly ("I feel empty", "I feel sad since my sister moved away"): acknowledged, with one
  // small kind step (feelingScene), never a reading of what happened
  const feel = feelingOf(t);
  if (feel) return feelingScene(t, feel.kind, { emotion, exclude, hint });
  let scenario = GENERAL;
  // a situation is trusted only on a real match (two keywords, or a phrase), never on one stray word
  try { const m = matchScenarios(t, { limit: 1 })[0]; scenario = m && m.score >= 2 ? m.scenario : GENERAL; } catch { scenario = GENERAL; }
  // someone did something to them: the situations about one's own slip ("awkward moment") would make light of it
  if (fairAnger(t) && SELF_CAUSED.has(scenario.id)) scenario = GENERAL;
  let detected = [];
  try { detected = detectPatterns(t); } catch { detected = []; }
  const cands = candidatePatterns(t, { emotion, hint, scenario });
  // every scene that fits these words has been shown: say so (exhausted), never play one that doesn't fit
  const fresh = cands.find((p) => !exclude.includes(p));
  const exhausted = !fresh;
  const pattern = fresh || cands[0] || 'fact_vs_assumption';
  const authoredId = PATTERN_TO_AUTHORED[pattern];
  const { fact, guess, pieces } = split(t);
  // only an interpretation was told ("Nobody likes me"): the words are the assumption, not the fact
  const allGuess = pieces.length > 0 && pieces.every((p) => p.guess === 'interpretation');
  const used = new Set(usedAngles);

  // the reveal: the habit's own angle when that habit is really in their words (it quotes them), or the matched
  // situation's own angle of the right kind (habits that judge the person first, situations first otherwise),
  // else the authored pair. Fair anger and replaying always use the authored pair: it speaks to the mechanic,
  // and a situation's angle could make light of a real wrong.
  let angleId = null, l1 = null, l2 = null;
  const ownPair = pattern === 'valid_anger' || pattern === 'rumination';
  // (a harsh label the engine's own list doesn't name, "I’m a horrible mother", still gets the label's angles)
  const harshAt = authoredId === 'big-label' ? HARSH.exec(t) : null;
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
  if (!ownPair) {
    if (KIT_FIRST.has(pattern)) { if (!fromKit()) fromScenario(); } else if (!fromScenario()) fromKit();
  }
  // fact versus assumption from their own words ("“My chest felt tight today” is what happened.") rather than
  // the bare authored pair, which says nothing about what they told; and never that bare pair as the first angle
  // while another scene still fits these words
  if (!l1 && pattern === 'fact_vs_assumption') {
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
  if (pattern === 'valid_anger') alternative = AUTHORED_ALT.valid_anger;
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
    const s = pattern === 'valid_anger' ? ((ANGER_SCENARIOS.has(scenario.id) && steps.find((x) => x.kind === 'boundary')) || GENERAL.nextSteps.find((x) => x.kind === 'boundary'))
      : kinds.map((k) => steps.find((x) => x.kind === k)).find(Boolean) || steps[0];
    step = s && words(s.text) <= 26 ? s.text : (GENERAL.nextSteps.find((x) => x.kind === (kinds[0] || 'act'))?.text || '');
    // no situation matched: the general step is about nothing they said, so a frame around their own words
    // (or a step for the practical problem they named) replaces it where one fits
    if (scenario === GENERAL) step = ownStep(pattern, t, { fact, guess, allGuess }) || step;
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

  return {
    source: 'authored',
    reasoning_pattern: pattern,
    interaction_type: PATTERN_INTERACTION[pattern],
    mechanic: PATTERN_INTERACTION[pattern],
    mallow_character: mallow,
    emotion: emotion || null,
    situation_type: null,
    known_fact: fact && !sameWords(fact, guess) && quotable(fact) ? `What you know: ${quoted(fact)}.` : allGuess ? KNOWN_SMALLER : quotable(t) ? `What you know is what you told me: ${quoted(t)}.` : KNOWN_TOLD,
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
    ...(exhausted ? { exhausted: true } : {}),
  };
}

/** The longest of their words a subtitle line quotes (characters, without the end punctuation). */
const LINE_QUOTE = 64;
const bare = (q) => String(q || '').replace(/[.!?…]+$/u, '').trim();
/** Fact versus assumption in their own words, or null when nothing of theirs fits a line whole. */
function ownFactPair(fact, guess, allGuess, t) {
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
function ownStep(pattern, t, { fact, guess, allGuess }) {
  const g = bare(guess || (allGuess ? t : '')), q = (s) => s && s.length <= 48;
  if (pattern === 'practical_problem') return (PRACTICAL_STEPS.find(([re]) => re.test(t)) || [])[1] || '';
  if (['fact_vs_assumption', 'mind_reading', 'catastrophising', 'personalisation'].includes(pattern) && q(g)) return `Check one fact about “${g}”, instead of guessing.`;
  if (pattern === 'self_criticism') {
    const hit = HARSH.exec(t);
    const label = hit ? wholeLabel(t, hit[0]) : '';
    if (q(label)) return `Try saying what happened, instead of “${bare(label)}”.`;
  }
  void fact;
  return '';
}

/**
 * The scene for a loss (bereavement(text)): no mechanic, no reasoning pattern, no other angle to show;
 * an authored, validating pair (lines.js GRIEF). The orchestrator plays it gently and keeps support close.
 */
export function griefScene(text, { emotion = null } = {}) {
  const kind = bereavement(text) || 'grief';
  const [l1, l2] = GRIEF[kind] || GRIEF.grief;
  return {
    source: 'authored', grief: true, reasoning_pattern: null, interaction_type: null, mechanic: null,
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
  // 'passed' alone after a person, with no exam or pride in the words: answered gently, never as a death and
  // never as a game ("“My dad passed last year” is what happened" would make light of a death)
  if (passedAlone(t)) return { kind: 'heavy' };
  // someone still alive but going ("I lost my mum to dementia, she doesn’t know who I am"): not a death, and
  // never a game ("“she doesn’t know who I am” is one way to read it" would make light of it)
  if (livingLoss(t)) return { kind: 'heavy' };
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
});
function feelingOrder(kind, hint = null) {
  const order = [...(FEELING_ORDER[kind] || FEELING_ORDER.low)];
  // the server's hint leads only when it is one of these (its pull_apart never is)
  const h = hint ? PATTERN_INTERACTION[hint] : null;
  if (h && order.includes(h)) { order.splice(order.indexOf(h), 1); order.unshift(h); }
  return order;
}
/** Lines that would frame a feeling as a guess about what happened, or send it to be checked. */
const FRAMES_A_FEELING = /what (?:your|the) mind (?:added|adds|might be adding)|one way to read|is what happened|the part that (?:actually )?happened|check (?:one|a|the) facts?|instead of guessing|what do you actually know|what did you actually see/i;
/** A line that would read what happened as a guess or send it to be checked (never said over a feeling or a loss). */
export const framesAsGuess = (line) => FRAMES_A_FEELING.test(String(line || ''));
/** The mechanics a feeling may play, whoever chose them (fair anger's own line too, for an angry feeling). */
const FEELING_PLAYS = new Set(['assemble_step', 'soften_harshness', 'separate_one']);
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
  if ([scene.subtitle_line_1, scene.subtitle_line_2, scene.practical_next_step].some((l) => FRAMES_A_FEELING.test(String(l || '')))) {
    return feelingScene(text, feel.kind, { emotion, exclude });
  }
  const plays = FEELING_PLAYS.has(scene.mechanic) || (feel.kind === 'angry' && scene.mechanic === 'find_boundary');
  // (only the mechanic the client plays changes: the pattern and interaction stay the server's for its records)
  return { ...scene, feeling: feel.kind, mechanic: plays ? scene.mechanic : 'assemble_step', practical_next_step: scene.practical_next_step || FEELING.steps[feel.kind] || FEELING.steps.low };
}

/** A feeling's scene (feelingStatement): in the server's shape, with `feeling` set to its kind. */
export function feelingScene(text, kind = 'low', { emotion = null, exclude = [], hint = null } = {}) {
  const order = feelingOrder(kind, hint);
  const fresh = order.find((m) => !exclude.includes(INTERACTION_PATTERN[m]));
  const mechanic = fresh || order[0];
  const pair = FEELING.pairs[mechanic];
  const l1 = mechanic === 'assemble_step' ? (FEELING.first[kind] || pair[0]) : pair[0];
  return {
    source: 'authored', feeling: kind,
    reasoning_pattern: INTERACTION_PATTERN[mechanic], interaction_type: mechanic, mechanic,
    // a gentle Mallow for low, lonely and tearful feelings; Zuzu for the rest (nobody bouncy)
    mallow_character: ['low', 'lonely', 'crying', 'heavy'].includes(kind) ? 'blubi' : 'zuzu',
    emotion: emotion || null, situation_type: null,
    known_fact: FEELING.known, possible_assumption: '', alternative_angle: '',
    practical_next_step: FEELING.steps[kind] || FEELING.steps.low,
    subtitle_line_1: l1, subtitle_line_2: pair[1], safety_status: 'ok',
    authored_pattern: null, angle_id: null, alt_id: null, scenario_id: null,
    ...(fresh ? {} : { exhausted: true }),
  };
}

const HARSH = /\b(?:i['’]?m|i am|i feel like)(?: (?:so|such|a|an|just|completely|totally|really|basically|the|absolute|total|complete|utter|utterly|literally|actually|massive|huge|biggest))* (?:stupid|an? idiot|idiot|a failure|failure|a loser|loser|useless|terrible|pathetic|worthless|hopeless|incompetent|a disaster|disaster|a mess|mess|a joke|joke|a fraud|fraud|a burden|burden|awful|horrible|rubbish|selfish|lazy|disgusting|unlovable|not good enough|not enough|too much|dumb|thick|clueless|(?:an? )?bad (?:person|friend|mum|mom|mother|dad|father|parent|daughter|son|sister|brother|partner|wife|husband|girlfriend|boyfriend|human|employee|student|teacher|colleague))\b/iu;
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
  const { fact: f0, guess: g0, pieces } = split(t);
  // only an interpretation was told ("Nobody likes me"): there is no fact in the words to show
  const allGuess = pieces.length > 0 && pieces.every((p) => p.guess === 'interpretation');
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

  // (the whole label as typed: "I’m a terrible person", never "I’m a terrible")
  const harshHit = HARSH.exec(t);
  let harsh = harshHit ? wholeLabel(t, harshHit[0]) : '';
  if (!harsh) { try { const big = detectPatterns(t).find((f) => f.pattern.id === 'big-label'); harsh = big ? wholeLabel(t, big.matches[0].text) : ''; } catch { /* none */ } }
  // no harsh word of their own: the scene's (a server's assumption), or their words when short, else an authored name for it
  if (!harsh) harsh = (server && firstWhole(scene.possible_assumption, 70)) || (g0 && g0.length <= 48 ? g0 : '') || (t.length <= 48 ? t : '') || HARSH_NAME;
  // a feeling's plate (soften) carries the feeling as they said it, never a name for a verdict
  if (scene?.feeling) harsh = excerpt(t, WORDS_MAX);

  // the heaviest weight: the blame as they put it ("it's my fault"), else the part their mind added
  const bm = BLAME_PHRASE.exec(t);
  const weight = bm ? excerpt(bm[0].trim(), 44) : g0 && !sameWords(g0, f0) && g0.length <= 44 ? g0 : '';

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
