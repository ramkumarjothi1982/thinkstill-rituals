// HUSHMALLOW ULTRA · "Another Angle" rule engine.
//
// Pure, deterministic functions over the authored library in frameworks.js.
// No randomness, no clock, no network, no generated language: every sentence
// shown to the person is either authored in frameworks.js / below, or is the
// person's own words dropped into an authored template.
//
// Detection is rule-based (keyword lists and regular expressions) and is only
// ever a SUGGESTION: the UI shows it for the person to confirm or correct, and
// there is always a general fallback.
//
// Plain ES module, no dependencies. Works in browsers and Node.

import {
  THOUGHT_PATTERNS, SCENARIOS, GENERAL, ALL_FRAMEWORKS, HARM_LEXICON, HARM_COPY,
  GUIDE_LINES, CAMEO_STAGES, ANGLE_KINDS, getScenario, getPattern,
} from './frameworks.js';

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/**
 * Light, length-preserving clean-up used before any matching: curly quotes and
 * apostrophes become straight ones, and runs of whitespace become one space.
 * Indices returned by detectPatterns() refer to this tidied text.
 */
export function tidyInput(text) {
  return String(text ?? '')
    .replace(/[‘’‛ʼ`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const capFirst = (s) => s.replace(/^(["'“‘(\s]*)(\p{Ll})/u, (_, pre, ch) => pre + ch.toUpperCase());
const fixLoneI = (s) => s.replace(/(^|[\s"“(])i(?=$|[\s.,!?;:'’])/g, '$1I');
const stripEndPunct = (s) => s.replace(/[\s.,;:!?…]+$/u, '');

/** Tidy a user phrase for display: trim, single spaces, capital first letter, lone "i" → "I". */
export function tidyPhrase(text) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s ? capFirst(fixLoneI(s)) : '';
}

/** Like tidyPhrase, and make sure it ends with sentence punctuation. */
export function tidySentence(text) {
  const s = tidyPhrase(text);
  if (!s) return '';
  return /[.!?…]["”’')]*$/u.test(s) ? s : `${s}.`;
}

const asText = (x) => (x && typeof x === 'object' ? (x.text ?? '') : (x ?? ''));

/** Small stable string hash (FNV-1a) used for deterministic picks. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

const compileList = (list) => list.map((src) => new RegExp(src, 'i'));
const SAFETY = {
  guards: HARM_LEXICON.idiomGuards.map((src) => new RegExp(src, 'gi')),
  crisis: compileList(HARM_LEXICON.crisis),
  crisisOther: compileList(HARM_LEXICON.crisisOther),
  care: Object.entries(HARM_LEXICON.care).map(([category, list]) => [category, compileList(list)]),
};

function firstHit(regexes, text) {
  for (const re of regexes) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

/**
 * Decide whether reframing is appropriate for this text.
 * → { reframeAppropriate, level: 'none'|'care'|'crisis', category, title, message, resources, matched }
 * Crisis: self-harm or suicide, or someone else in danger. Care: abuse,
 * violence, threats, harassment, discrimination, feeling unsafe.
 */
export function checkSafety(text) {
  let t = tidyInput(text);
  // Blank out common idioms ("this deadline is killing me", "dying to know").
  for (const re of SAFETY.guards) t = t.replace(re, (m) => ' '.repeat(m.length));

  let hit = firstHit(SAFETY.crisis, t);
  if (hit) {
    return {
      reframeAppropriate: false, level: 'crisis', category: 'self-harm',
      title: HARM_COPY.crisis.title, message: HARM_COPY.crisis.message,
      resources: HARM_COPY.crisis.resources, stillHere: HARM_COPY.stillHere, matched: hit,
    };
  }
  hit = firstHit(SAFETY.crisisOther, t);
  if (hit) {
    return {
      reframeAppropriate: false, level: 'crisis', category: 'someone-in-danger',
      title: HARM_COPY.crisisOther.title, message: HARM_COPY.crisisOther.message,
      resources: HARM_COPY.crisisOther.resources, stillHere: HARM_COPY.stillHere, matched: hit,
    };
  }
  for (const [category, regexes] of SAFETY.care) {
    hit = firstHit(regexes, t);
    if (hit) {
      const copy = HARM_COPY.care[category];
      return {
        reframeAppropriate: false, level: 'care', category,
        title: copy.title, message: copy.message,
        resources: HARM_COPY.careResources, stillHere: HARM_COPY.stillHere, matched: hit,
      };
    }
  }
  return {
    reframeAppropriate: true, level: 'none', category: null,
    title: '', message: '', resources: [], stillHere: '', matched: null,
  };
}

// ---------------------------------------------------------------------------
// Scenario matching
// ---------------------------------------------------------------------------

const PHRASE_WEIGHT = 3;
const KEYWORD_WEIGHT = 1;
const L = String.raw`[\p{L}\p{N}_]`;

/** Compile one lexicon entry: '*' = word continues, "'" optional, '-' or space flexible. */
function compileTerm(term) {
  const body = term.toLowerCase().trim()
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, `${L}*`)
    .replace(/'/g, "'?")
    .replace(/-/g, '[- ]?')
    .replace(/ +/g, '\\s+');
  return new RegExp(`(?<!${L})${body}(?!${L})`, 'iu');
}

const LEXICONS = new Map(SCENARIOS.map((s) => [s.id, {
  phrases: s.detect.phrases.map((p) => [p, compileTerm(p)]),
  keywords: s.detect.keywords.map((k) => [k, compileTerm(k)]),
}]));

/**
 * Rank scenarios for a piece of text. Phrases weigh 3, keywords 1, each
 * counted once. Ties keep library order. Returns up to `limit` scenarios with
 * a score above zero, then always the general framework last.
 * → [{ scenario, score, matched: [terms], confidence: 'likely'|'maybe'|'fallback' }]
 */
export function matchScenarios(text, { limit = 3 } = {}) {
  const t = tidyInput(text);
  const scored = [];
  if (t) {
    SCENARIOS.forEach((scenario, order) => {
      const lex = LEXICONS.get(scenario.id);
      const matched = [];
      let score = 0;
      for (const [term, re] of lex.phrases) if (re.test(t)) { matched.push(term); score += PHRASE_WEIGHT; }
      for (const [term, re] of lex.keywords) if (re.test(t)) { matched.push(term); score += KEYWORD_WEIGHT; }
      if (score > 0) scored.push({ scenario, score, matched, order });
    });
  }
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  const top = scored.slice(0, Math.max(0, limit)).map(({ scenario, score, matched }) => ({
    scenario, score, matched, confidence: score >= 4 ? 'likely' : 'maybe',
  }));
  top.push({ scenario: GENERAL, score: 0, matched: [], confidence: 'fallback' });
  return top;
}

// ---------------------------------------------------------------------------
// Splitting a thought into "what happened" and "what my brain added"
// ---------------------------------------------------------------------------

const A = "['’]";
const SUBJ = String.raw`(?:i|i${A}m|i${A}ve|i${A}ll|i${A}d|she|he|they|it|it${A}s|everyone|everybody|nobody|no one|people|we|you|that|this|my \w+|his \w+|her \w+|their \w+)`;
const HEDGE = String.raw`(?:i (?:just )?think(?: that)?|i feel like|i feel that|i guess|i bet|i reckon|i${A}m sure(?: that)?|i just know(?: that)?|i know that|i believe(?: that)?|i suppose)`;
const ADV = String.raw`(?:obviously|clearly|probably|maybe|surely|so|which|because|now)`;

// Each splitter marks a cut. Text matched by the splitter itself (connectors
// like "so", "because", "which means") is dropped from both sides.
const SPLITTERS = [
  new RegExp(String.raw`,?\s+(?:and so|which means(?: that)?|which meant(?: that)?|meaning(?: that)?|because|cos|'cause|’cause)\s+`, 'giu'),
  new RegExp(String.raw`(?:,\s*|\s+)(?:and |but )?so\s+(?=${SUBJ}\b|${HEDGE}\b|now\b|obviously\b|clearly\b|probably\b)`, 'giu'),
  new RegExp(String.raw`,?\s+(?:but|and)\s+(?=${SUBJ}\b|${HEDGE}\b)`, 'giu'),
  new RegExp(String.raw`,\s*(?=(?:${SUBJ}|${HEDGE}|${ADV})\b)`, 'giu'),
  new RegExp(String.raw`\s+(?=${HEDGE}\b)`, 'giu'),
  new RegExp(String.raw`\s+(?=${SUBJ}(?:${A}s|${A}re| is| are)? (?:must|probably|obviously|clearly|definitely)\b)`, 'giu'),
];

const LEADING_CONNECTOR = /^(?:and so|and then|and now|and|but|so|because|cos|which means(?: that)?|meaning(?: that)?|then)\s+/i;
const LEADING_HEDGE = new RegExp(`^(${HEDGE})\\s*,?\\s*`, 'iu');

const INTERP_CUES = [
  /\b(?:must|probably|obviously|clearly|definitely|surely)\b/i,
  /\b(?:always|never|everyone|everybody|no ?one|nobody|everything|nothing)\b/i,
  /\b(?:hates?|hating|can['’]?t stand|doesn['’]?t care|don['’]?t care|doesn['’]?t (?:like|want|love|respect)|don['’]?t (?:like|want|love|respect))\b/i,
  /\bi['’]?m (?:so |such |a |an |just |completely |totally |really |the |basically )*(?:terrible|stupid|useless|failure|idiot|loser|pathetic|worthless|hopeless|awful|rubbish|boring|unlovable|weird|ugly|not good enough|mess|joke|burden|fraud|incompetent|dumb|behind)\b/i,
  /\b(?:will never|won['’]?t ever|never going to|going to (?:fail|lose|leave|hate|get fired)|gonna|i['’]?ll never)\b/i,
  /\b(?:ruined|ruins|ruin)\b/i,
  /\b(?:deliberately|on purpose|intentionally|purposely|secretly)\b/i,
  /\bthinks? (?:i['’]?m|i am|that i)\b/i,
  /\b(?:ignoring|avoiding|judging|blanking) me\b/i,
  /\b(?:annoyed|angry|mad|disappointed|fed up|bored|sick) (?:with|at|of) me\b/i,
  /\bshould(?:n['’]?t)?(?: have)?\b/i,
  /\b(?:means?|meant) (?:that )?(?:i|they|she|he|it)\b/i,
  /\b(?:i feel|it feels|feels like)\b/i,
];

const FACT_CUES = [
  /\b(?:said|says|replied|responded|answered|sent|texted|messaged|emailed|called|rang|posted|cancell?ed|criticis(?:ed|es)|criticiz(?:ed|es)|told|asked|wrote|commented|interrupted|invited|left|gave|marked|rejected|turned down|shouted|yelled|laughed|forgot|missed|failed|lost|paid|spent|went|came|saw|read|got|didn['’]?t get|scored|looked at|rolled (?:her|his|their) eyes|snapped)\b/i,
  /\b(?:hasn['’]?t|has not|haven['’]?t|have not|didn['’]?t|did not|wasn['’]?t|was not|weren['’]?t|were not)\s+(?:yet\s+)?(?:replied|reply|responded|respond|answered|answer|called|call|texted|text|messaged|message|invited|invite|said|say|been invited|come|turned up|shown up|got back|gotten back|read)\b/i,
  /\d/,
  /\b(?:yesterday|today|tonight|last (?:night|week|month|year)|this (?:morning|afternoon|evening|week)|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:hours?|days?|minutes?|weeks?) ago)\b/i,
  /["“”]|‘[^’]+’/,
];

const REPORTING = /\b(?:said|says|told (?:me|us|them|him|her)|wrote|asked|commented|replied|texted|messaged|emailed|posted|called me)\b/i;

function countWords(s) {
  const m = s.trim().match(/[\p{L}\p{N}'’]+/gu);
  return m ? m.length : 0;
}

/** Cut one sentence into clauses using SPLITTERS; returns [{text, cue}] raw pieces. */
function cutSentence(sentence) {
  const cuts = [];
  for (const re of SPLITTERS) {
    for (const m of sentence.matchAll(re)) cuts.push({ start: m.index, end: m.index + m[0].length, cue: m[0].trim().replace(/^,\s*/, '') });
  }
  cuts.sort((a, b) => a.start - b.start || b.end - a.end);
  const pieces = [];
  let last = 0;
  let pendingCue = '';
  for (const c of cuts) {
    if (c.start < last) continue; // overlaps an accepted cut
    const left = sentence.slice(last, c.start);
    if (countWords(left) < 2) continue; // never leave a one-word stub ("Yesterday,")
    pieces.push({ text: left, cue: pendingCue });
    pendingCue = c.cue;
    last = c.end;
  }
  pieces.push({ text: sentence.slice(last), cue: pendingCue });
  return pieces;
}

function classify(text, hedges) {
  const interp = [];
  const fact = [];
  for (const h of hedges) interp.push({ kind: 'interpretation', text: h });
  // Reported speech ("She said I'm useless") is something that happened:
  // judgement words after a reporting verb belong to the quote, not the person.
  const report = REPORTING.exec(text);
  const cutoff = report ? report.index : Infinity;
  for (const re of INTERP_CUES) { const m = re.exec(text); if (m && m.index < cutoff) interp.push({ kind: 'interpretation', text: m[0] }); }
  for (const re of FACT_CUES) { const m = re.exec(text); if (m) fact.push({ kind: 'fact', text: m[0] }); }
  const interpScore = interp.length + hedges.length; // a stripped "I think" counts double
  const factScore = fact.length;
  let guess = 'unsure';
  if (interpScore > factScore) guess = 'interpretation';
  else if (factScore > interpScore) guess = 'fact';
  return { guess, cues: [...fact, ...interp] };
}

/**
 * Split a thought into clauses and guess which are "what happened" (fact)
 * and which are "what my brain added" (interpretation). Guesses are only
 * suggestions; the UI lets the person move clauses between piles.
 * → [{ id, text, guess: 'fact'|'interpretation'|'unsure', cues: [{kind, text}] }]
 */
export function splitThought(text) {
  const raw = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  const sentences = raw
    .split(/(?<=[.!?…])\s+(?=["“‘'(]?[\p{L}\p{N}])|\s*[;\n]+\s*|\s+[–—-]\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [];
  let carryHedges = [];
  for (const sentence of sentences) {
    for (const piece of cutSentence(sentence)) {
      let t = piece.text.trim().replace(/^[,;:]\s*/, '');
      const hedges = [...carryHedges];
      carryHedges = [];
      // Strip leading connectors and hedges ("so", "because", "I think").
      for (let guard = 0; guard < 4; guard++) {
        const before = t;
        t = t.replace(LEADING_CONNECTOR, '');
        const h = LEADING_HEDGE.exec(t);
        if (h) { hedges.push(tidyPhrase(h[1])); t = t.slice(h[0].length); }
        if (t === before) break;
      }
      const cueWord = piece.cue && LEADING_HEDGE.test(piece.cue) ? '' : piece.cue;
      t = stripEndPunct(t.trim());
      if (!t || countWords(t) === 0) { carryHedges = hedges; continue; }
      const { guess, cues } = classify(t, hedges);
      if (cueWord && /^(?:so|and so|because|which means|which meant|meaning)/i.test(cueWord)) {
        cues.push({ kind: 'link', text: cueWord.replace(/^(?:,\s*)/, '') });
      }
      out.push({ id: `c${out.length + 1}`, text: tidyPhrase(t), guess, cues });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Thinking-habit detection
// ---------------------------------------------------------------------------

const PATTERN_RES = THOUGHT_PATTERNS.map((p) => ({ pattern: p, res: p.triggers.map((src) => new RegExp(src, 'gi')) }));

/**
 * Find thinking habits that might be in the mix (suggestions only).
 * → [{ pattern, matches: [{ text, index }] }] ordered by first appearance,
 * then library order. `index` refers to tidyInput(text).
 */
export function detectPatterns(text) {
  const t = tidyInput(text);
  if (!t) return [];
  const found = [];
  PATTERN_RES.forEach(({ pattern, res }, order) => {
    const byIndex = new Map();
    for (const re of res) {
      for (const m of t.matchAll(re)) {
        const prev = byIndex.get(m.index);
        if (!prev || m[0].length > prev.text.length) byIndex.set(m.index, { text: m[0], index: m.index });
      }
    }
    if (byIndex.size) {
      const matches = [...byIndex.values()].sort((a, b) => a.index - b.index);
      found.push({ pattern, matches, order });
    }
  });
  found.sort((a, b) => a.matches[0].index - b.matches[0].index || a.order - b.order);
  return found.map(({ pattern, matches }) => ({ pattern, matches }));
}

// ---------------------------------------------------------------------------
// Angles, evidence and next steps
// ---------------------------------------------------------------------------

/** Order the angle kinds are dealt in; the two "honesty" kinds come early. */
const KIND_ORDER = ['context', 'benign', 'worry-partly-true', 'neutral', 'not-enough-info', 'growth', 'self-compassion'];

function resolveScenario(s) {
  if (s && typeof s === 'object' && s.id) return getScenario(s.id) || s;
  return getScenario(s) || GENERAL;
}

function patternIdsFrom(patterns, interpretation) {
  const list = patterns ?? detectPatterns(interpretation || '');
  const ids = [];
  for (const p of list) {
    const id = typeof p === 'string' ? p : (p?.pattern?.id ?? p?.id);
    if (id && getPattern(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function fillThought(text, thought) {
  const t = stripEndPunct(tidyPhrase(thought));
  if (t) return text.replace(/\{thought\}/g, t);
  return text.replace(/“\{thought\}”/g, 'That first thought').replace(/\{thought\}/g, 'that first thought');
}

/**
 * Build the ordered list of "another angle" cards for a scenario.
 * Scenario angles are dealt round-robin by kind (so neighbours differ), with
 * one pattern-derived general angle slotted into each round. Kept angles come
 * first. 'worry-partly-true' and 'not-enough-info' are always present.
 * → [{ id, text, kind, source: 'scenario'|'pattern'|'general', patternId?, kept }]
 */
export function buildAngles(scenarioOrId, { interpretation = '', patterns, kept = [], maxPatternAngles = 3 } = {}) {
  const sc = resolveScenario(scenarioOrId);
  const keptIds = new Set((kept || []).map((k) => (typeof k === 'string' ? k : k?.id)).filter(Boolean));
  const source = sc.id === GENERAL.id ? 'general' : 'scenario';

  const lanes = new Map(KIND_ORDER.map((k) => [k, []]));
  for (const a of sc.angles) lanes.get(a.kind)?.push({ ...a, source });
  // Guarantee the two honesty kinds, borrowing from the general framework.
  for (const must of ['worry-partly-true', 'not-enough-info']) {
    if (!lanes.get(must).length) {
      const g = GENERAL.angles.find((a) => a.kind === must);
      if (g) lanes.get(must).push({ ...g, source: 'general' });
    }
  }

  const patternLane = [];
  const pids = patternIdsFrom(patterns, interpretation);
  // First angle from each pattern, then second angles, capped.
  for (let round = 0; round < 2; round++) {
    for (const pid of pids) {
      const a = GENERAL.patternKit[pid]?.angles[round];
      if (a && patternLane.length < maxPatternAngles) {
        patternLane.push({ ...a, text: fillThought(a.text, interpretation), source: 'pattern', patternId: pid });
      }
    }
  }

  const dealt = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    KIND_ORDER.forEach((kind, i) => {
      const lane = lanes.get(kind);
      if (lane.length) { dealt.push(lane.shift()); remaining = true; }
      if (i === 1 && patternLane.length) { dealt.push(patternLane.shift()); remaining = true; }
    });
    if (patternLane.length) remaining = true;
  }

  const seen = new Set();
  const unique = dealt.filter((a) => (seen.has(a.id) ? false : seen.add(a.id)));
  const keptFirst = [...unique.filter((a) => keptIds.has(a.id)), ...unique.filter((a) => !keptIds.has(a.id))];
  return keptFirst.map((a) => ({ ...a, kept: keptIds.has(a.id) }));
}

/**
 * Evidence cards for a scenario, with "doesn't quite fit" cards from any
 * detected thinking habits appended. The person picks which apply.
 */
export function buildEvidence(scenarioOrId, { interpretation = '', patterns } = {}) {
  const sc = resolveScenario(scenarioOrId);
  const extra = [];
  for (const pid of patternIdsFrom(patterns, interpretation)) {
    for (const c of GENERAL.patternKit[pid]?.against || []) extra.push({ ...c, patternId: pid });
  }
  return {
    supports: sc.evidence.supports.slice(),
    against: [...sc.evidence.against, ...extra],
    missing: sc.evidence.missing.slice(),
  };
}

/** Next-step cards: the scenario's own, then one per detected habit (deduped). */
export function buildNextSteps(scenarioOrId, { interpretation = '', patterns } = {}) {
  const sc = resolveScenario(scenarioOrId);
  const steps = sc.nextSteps.slice();
  for (const pid of patternIdsFrom(patterns, interpretation)) {
    const s = GENERAL.patternKit[pid]?.nextStep;
    if (s && !steps.some((x) => x.id === s.id)) steps.push({ ...s, patternId: pid });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Composing the finished "another angle"
// ---------------------------------------------------------------------------

const LABELS = {
  fact: 'What happened',
  interpretation: 'What my brain added',
  supports: 'What fits the worry',
  against: 'What doesn’t quite fit',
  missing: 'What I don’t know yet',
  angle: 'Another angle',
  next: 'My next move',
};

function listText(items) {
  const parts = (items || []).map((x) => stripEndPunct(tidyPhrase(asText(x)))).filter(Boolean);
  return parts.length ? `${parts.join('; ')}.` : '';
}

const lowerFirst = (s) => (/^[A-Z][a-z’']/.test(s) && !/^I\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/**
 * Put the person's own words and chosen cards into an authored layout.
 * Only tidies capitalisation and end punctuation; never rewrites wording.
 * → { lines: [{ key, label, text }], summary, text }
 */
export function composeAngle({ fact = '', interpretation = '', evidence = {}, keptAngles = [], nextStep = '' } = {}) {
  const lines = [];
  const f = tidySentence(asText(fact));
  const i = stripEndPunct(tidyPhrase(asText(interpretation)));
  if (f) lines.push({ key: 'fact', label: LABELS.fact, text: f });
  if (i) lines.push({ key: 'interpretation', label: LABELS.interpretation, text: `“${i}”` });
  for (const bucket of ['supports', 'against', 'missing']) {
    const t = listText(evidence?.[bucket]);
    if (t) lines.push({ key: bucket, label: LABELS[bucket], text: t });
  }
  const angles = (keptAngles || []).map((a) => tidySentence(asText(a))).filter(Boolean);
  for (const a of angles) lines.push({ key: 'angle', label: LABELS.angle, text: a });
  const step = tidySentence(asText(nextStep));
  if (step) lines.push({ key: 'next', label: LABELS.next, text: step });

  const parts = [];
  if (f) parts.push(f);
  if (i) parts.push(`My first thought was “${i}”.`);
  const missing = (evidence?.missing || []).map((x) => stripEndPunct(tidyPhrase(asText(x)))).filter(Boolean);
  if (missing.length) parts.push(`What I don’t know yet: ${lowerFirst(missing[0])}.`);
  if (angles.length) parts.push(`Another way to see it: ${angles[0]}`);
  if (i && angles.length) parts.push('My first thought might still be right — it just isn’t the only possibility.');
  if (step) parts.push(`My next move: ${lowerFirst(step)}`);
  const summary = parts.length ? parts.join(' ') : 'Nothing here yet. Start with what happened.';

  return { lines, summary, text: lines.map((l) => `${l.label}: ${l.text}`).join('\n') };
}

// ---------------------------------------------------------------------------
// Guide and cameo lines
// ---------------------------------------------------------------------------

/**
 * The authored line for a stage of the flow. At CAMEO_STAGES ('angles',
 * 'done') the scenario's cameo Mallow speaks; elsewhere the guide does
 * (falling back to Zuzu's line for a stage the guide doesn't have). The
 * 'safety' stage always uses the guide's gentle line, never a joke.
 * → { mallow, role: 'guide'|'cameo', stage, text }
 */
export function pickCameo(scenarioOrId, stage = 'welcome') {
  const sc = resolveScenario(scenarioOrId);
  const st = typeof stage === 'string' ? stage : 'welcome';
  if (CAMEO_STAGES.includes(st) && sc.cameo?.lines?.length) {
    const lines = sc.cameo.lines;
    const idx = st === 'done' ? lines.length - 1 : 0;
    return { mallow: sc.cameo.mallow, role: 'cameo', stage: st, text: lines[idx] };
  }
  const guide = GUIDE_LINES[sc.guide] ? sc.guide : 'zuzu';
  let mallow = guide;
  let pool = GUIDE_LINES[guide][st];
  if (!pool || !pool.length) { mallow = 'zuzu'; pool = GUIDE_LINES.zuzu[st] || GUIDE_LINES.zuzu.welcome; }
  const text = pool[hash(`${sc.id}:${st}`) % pool.length];
  return { mallow, role: 'guide', stage: st, text };
}

export { ANGLE_KINDS, ALL_FRAMEWORKS };
