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
import { PATTERNS, PATTERN_INTERACTION, PATTERN_TO_AUTHORED, AUTHORED_TO_PATTERN, PATTERN_MALLOWS, mallowFor } from './vocab.js';
import { AUTHORED_PAIRS, AUTHORED_ALT } from './lines.js';

// strong cues the authored habits don't name (practical problems, fair anger, replaying)
const CUES = {
  rumination: /\b(?:replay\w*|keep (?:thinking|going over|going back to|coming back to)|can'?t stop (?:thinking|replaying|going over)|over and over|round and round|going round in circles)\b/i,
  valid_anger: /\b(?:unfair|furious|fuming|livid|seething|rude|disrespect\w*|took (?:the |all the )?credit|shouted at|yelled at|humiliat\w*|so angry|really angry|angry (?:at|with|that|about)|cancell?ed on me(?: again)?|lied to me|went behind my back|talked over me|interrupt\w* me|embarrassed me|belittled me|made fun of me|mocked me|put me down|undermin\w* me)\b/i,
  practical_problem: /\b(?:deadline|interview|rent|bills?|overdraft|debt|promot\w*|appraisal|job hunt\w*|exam (?:is|on|next|tomorrow)|how do i|what do i do|what should i do|need to (?:decide|sort|fix|find|choose)|too much to do)\b/i,
};
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
  const factP = pieces.find((p) => p.guess === 'fact') || (pieces.length > 1 ? pieces.find((p) => p.guess === 'unsure') : null);
  const guessP = pieces.find((p) => p.guess === 'interpretation' && p !== factP) || (pieces.length > 1 ? pieces[pieces.length - 1] : null);
  const fact = factP ? exactPhrase(text, factP.text) : '';
  const guess = guessP && guessP !== factP ? exactPhrase(text, guessP.text) : '';
  return { fact, guess, pieces };
}

/** "always", "never", or "nobody" / "everyone" as the subject of the sentence ("Nobody likes me"), not "in front of everyone". */
function strongAlways(text, m) {
  if (/^(?:always|never|every (?:single )?time|nothing ever|constantly|all the time)$/i.test(m.text)) return true;
  const before = String(text).replace(/[‘’]/g, "'").slice(0, m.index).trimEnd();
  return !before || /[.!?,;:]$|\b(?:and|but|so|because|cos|like|feels like|that)$/i.test(before);
}

/** Someone else is in the story (mind-reading and "it's all on me" need another person to make sense). */
const OTHERS = /\b(?:he|she|they|them|him|her|his|their|people|everyone|everybody|nobody|no one|someone|anyone|boss|manager|colleague|friend|friends|partner|mum|mom|dad|sister|brother|teacher|team|group|family|boyfriend|girlfriend|husband|wife|kids?|son|daughter|neighbour)\b/i;
const BLAME = /\b(?:fault|blame|because of me|let (?:them|everyone|the team) down)\b/i;
const LOOPY = new Set(['overthinking', 'restlessness', 'anxiety', 'worry']);

/** Candidate patterns for this text, most fitting first (deterministic). */
export function candidatePatterns(text, { emotion = null, hint = null, scenario = null } = {}) {
  const out = [];
  const add = (p) => { if (p && PATTERNS.includes(p) && !out.includes(p)) out.push(p); };
  // the fallbacks below only offer a scene that can make sense for these words
  const fits = (p) => {
    if (p === 'mind_reading') return OTHERS.test(text);
    if (p === 'personalisation') return OTHERS.test(text) || BLAME.test(text);
    if (p === 'valid_anger') return CUES.valid_anger.test(text) || ANGRY.has(emotion);
    if (p === 'rumination') return CUES.rumination.test(text) || LOOPY.has(emotion) || /\bwhat if\b/i.test(text);
    return true;
  };
  const maybe = (p) => { if (p && fits(p)) add(p); };
  if (hint) add(hint);
  if (CUES.rumination.test(text)) add('rumination');
  if (CUES.valid_anger.test(text)) add('valid_anger');
  let found = [];
  try { found = detectPatterns(text); } catch { found = []; }
  // "everyone" / "nobody" are everywhere in ordinary speech: the generic always/never habit waits its turn
  for (const f of found) if (f.pattern.id !== 'always-never') add(AUTHORED_TO_PATTERN[f.pattern.id]);
  if (CUES.practical_problem.test(text)) add('practical_problem');
  const always = found.find((f) => f.pattern.id === 'always-never');
  if (always && always.matches.some((m) => strongAlways(text, m))) add('overgeneralisation');
  if (scenario && scenario !== GENERAL) for (const id of scenario.likelyPatterns || []) maybe(AUTHORED_TO_PATTERN[id]);
  if (always) add('overgeneralisation');
  if (emotion && EMOTION_DEFAULT[emotion]) maybe(EMOTION_DEFAULT[emotion]);
  for (const p of ROTATION) maybe(p);
  return out;
}

function fillThought(template, thought) {
  const t = String(thought || '').replace(/[\s.,;:!?…]+$/u, '');
  if (t && t.length <= 60) return template.replace(/\{thought\}/g, t);
  return template.replace(/“\{thought\}”/g, 'That first thought').replace(/\{thought\}/g, 'that first thought');
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
  let scenario = GENERAL;
  // a situation is trusted only on a real match (two keywords, or a phrase), never on one stray word
  try { const m = matchScenarios(t, { limit: 1 })[0]; scenario = m && m.score >= 2 ? m.scenario : GENERAL; } catch { scenario = GENERAL; }
  // someone did something to them: the situations about one's own slip ("awkward moment") would make light of it
  if (CUES.valid_anger.test(t) && SELF_CAUSED.has(scenario.id)) scenario = GENERAL;
  let detected = [];
  try { detected = detectPatterns(t); } catch { detected = []; }
  const pattern = candidatePatterns(t, { emotion, hint, scenario }).find((p) => !exclude.includes(p))
    || ROTATION.find((p) => !exclude.includes(p)) || ROTATION[exclude.length % ROTATION.length];
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
  const hit = authoredId ? detected.find((f) => f.pattern.id === authoredId) : null;
  const fromKit = () => {
    if (!hit || !GENERAL.patternKit[authoredId]) return false;
    const a = GENERAL.patternKit[authoredId].angles.find((x) => !used.has(x.id));
    if (!a) return false;
    const m = exactPhrase(t, hit.matches[0].text);
    const thought = guess && m && guess.toLowerCase().includes(m.toLowerCase()) ? guess : (m || guess);
    angleId = a.id; [l1, l2] = linesFrom(fillThought(a.text, /^\p{Lu}|^I\b/u.test(thought) ? thought : ''), pattern);
    return true;
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
  if (!l1) [l1, l2] = AUTHORED_PAIRS[pattern];

  // "another explanation": a different angle from the same situation (never the one just revealed)
  let alternative = '', altId = null;
  if (pattern === 'valid_anger') alternative = AUTHORED_ALT.valid_anger;
  else {
    try {
      const angles = buildAngles(scenario, { interpretation: guess, patterns: authoredId ? [authoredId] : [] });
      const alt = angles.find((a) => a.id !== angleId && !used.has(a.id) && ['benign', 'context', 'not-enough-info', 'neutral'].includes(a.kind) && words(a.text) <= 30 && !/\{thought\}/.test(a.text));
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
  } catch { step = ''; }

  const quoted = (s) => `“${excerpt(s, 90).replace(/[.!?…]+$/u, '')}”`;
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
    known_fact: fact && !sameWords(fact, guess) ? `What you know: ${quoted(fact)}.` : allGuess ? KNOWN_SMALLER : `What you know is what you told me: ${quoted(t)}.`,
    possible_assumption: guess && !sameWords(guess, fact) ? `What your mind might be adding: ${quoted(guess)}.` : allGuess && t ? `What your mind might be adding: ${quoted(t)}.` : '',
    alternative_angle: alternative,
    practical_next_step: step,
    subtitle_line_1: l1,
    subtitle_line_2: l2,
    safety_status: 'ok',
    authored_pattern: authoredId,
    angle_id: angleId,
    alt_id: altId,
    scenario_id: scenario.id,
  };
}

const HARSH = /\b(?:i'?m|i am|i feel like)(?: (?:so|such|a|an|just|completely|totally|really|basically|the|absolute|total|complete|utter|utterly|literally|actually|massive|huge|biggest))* (?:stupid|an? idiot|idiot|a failure|failure|a loser|loser|useless|terrible|pathetic|worthless|hopeless|incompetent|a disaster|disaster|a mess|mess|a joke|joke|a fraud|fraud|a burden|burden|awful|rubbish|not good enough|not enough|too much|dumb|thick|clueless)\b/i;
/** The blame the person put on themselves, as typed ("it's my fault"), for the heaviest weight. */
const BLAME_PHRASE = /\b(?:it'?s|it is|it was|that'?s|that was|all|this is|was)?\s*(?:all\s+)?(?:my fault|on me|because of me|my own fault|down to me|i ruined it|i let (?:them|everyone|the team|her|him) down)\b/iu;

/** The question a side asks when the words give it nothing real to show (never a copy of the other side). */
export const FACT_ASK = 'What did you actually see or hear?';
export const GUESS_ASK = 'What might it mean?';
/** Authored possibilities for mind reading, after the scene's own alternative (lines.js has the same three). */
const OTHER_MEANINGS = ['It might mean something smaller.', 'It might be about them, not you.', 'It might not mean anything yet.'];

const norm = (s) => String(s ?? '').toLowerCase().replace(/[‘’`´]/g, "'").replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
/** Two lines that say the same thing (same words, ignoring case and punctuation), or one inside the other. */
export function sameWords(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x === y || (x.length > 12 && y.includes(x)) || (y.length > 12 && x.includes(y));
}
/** A scene line short enough to sit by an object: its first sentence when that fits, else cut at a word. */
export function shortLine(s, max = 72) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const first = sentences(t)[0] || t;
  return first.length <= max ? first : excerpt(t, max);
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
  let fact = server ? shortLine(scene.known_fact) : '';
  if (!fact && f0 && !(allGuess && sameWords(f0, g0))) fact = excerpt(f0, 46);
  if (!fact && !allGuess && t) fact = excerpt(t, 46);
  let guess = server ? shortLine(scene.possible_assumption) : '';
  if (!guess && g0 && !sameWords(g0, fact)) guess = excerpt(g0, 46);
  if (!guess && allGuess && !sameWords(t, fact)) guess = excerpt(t, 46);
  if (guess && sameWords(guess, fact)) guess = '';
  const factAsk = !fact, guessAsk = !guess;

  const harshHit = HARSH.exec(t);
  let harsh = harshHit ? harshHit[0] : '';
  if (!harsh) { try { const big = detectPatterns(t).find((f) => f.pattern.id === 'big-label'); harsh = big ? exactPhrase(t, big.matches[0].text) : ''; } catch { /* none */ } }

  // the heaviest weight: the blame as they put it ("it's my fault"), else the part their mind added
  const bm = BLAME_PHRASE.exec(t);
  const weight = bm ? excerpt(bm[0].trim(), 28) : g0 && !sameWords(g0, f0) ? excerpt(g0, 28) : '';

  // mind reading: the scene's own other explanation first, then the authored possibilities (three, all different)
  const alternatives = [];
  const alt = shortLine(scene?.alternative_angle, 80);
  if (alt && !sameWords(alt, guess) && !sameWords(alt, t)) alternatives.push(alt);
  for (const o of OTHER_MEANINGS) if (alternatives.length < 3 && !alternatives.some((a) => sameWords(a, o))) alternatives.push(o);

  return {
    excerpt: excerpt(t, 46),
    // one line's worth, for a crowded small screen
    excerptShort: excerpt(t, 28),
    fact: fact || FACT_ASK,
    guess: guess || GUESS_ASK,
    factAsk, guessAsk,
    harsh: harsh ? excerpt(harsh, 30) : excerpt(g0 || t, 30),
    weight,
    alternatives,
    steps: chunkStep(scene?.practical_next_step || ''),
    source: server ? 'server' : 'authored',
  };
}

/** A sentence in three pieces, broken at natural joins (for the assemble mechanic). */
const JOIN_BEFORE = /^(?:and|or|but|then|so|to|before|after|when|while|until|if|how|what|that|which|with|without|for|about|by|from|into|instead|because|rather)$/i;
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
  const join = (i) => (inList[i] ? 4 : 0) + (/[.!?]$/.test(w[i - 1]) ? -2 : /[;:\u2013\u2014]$/.test(w[i - 1]) ? -2.2 : /,$/.test(w[i - 1]) ? (inList[i] ? -0.4 : -1.6) : 0)
    + (JOIN_BEFORE.test(w[i]) && !inList[i] ? -1.2 : 0) + (NO_END.test(w[i - 1].replace(/[,;:]$/, '')) && !/[,;:]$/.test(w[i - 1]) ? 1.6 : 0);
  let best = [Math.round(n / 3), Math.round((2 * n) / 3)], score = Infinity;
  for (let a = 1; a < n - 1; a++) {
    for (let b = a + 1; b < n; b++) {
      const lens = [a, b - a, n - b];
      const sc = join(a) + join(b) + 0.35 * (Math.max(...lens) - Math.min(...lens)) + lens.reduce((t, l) => t + Math.max(0, l - 6), 0);
      if (sc < score - 1e-9) { score = sc; best = [a, b]; }
    }
  }
  const [a, b] = best;
  return [w.slice(0, a).join(' '), w.slice(a, b).join(' '), w.slice(b).join(' ')].map((x) => x.replace(/[,;:.\u2013\u2014]$/u, '').trim());
}
