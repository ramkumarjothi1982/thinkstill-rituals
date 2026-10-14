// Another Angle (hushmallow Beyond), review round 8 (13 Oct 2026): the coordinator's round-2 guidance.
//   1. The default is flipped: the fact-vs-guess framing only with an explicit interpretive marker of their own
//      (markers.js), and then only that clause is the guess; a stated event, a wrong, a feeling or a loss gets the
//      acknowledging mechanics with lines that treat it as real (authored and server scenes alike).
//   2. The backstop is a bag of words with no idiom blanks: no framing and no playful line; death talk → gentle,
//      anything else → kind. Idiom blanks stay only inside deathTalk, and only those that cannot hide a death.
//   3. A feeling (with or without about / over / with / because …) is real, never a guess or a worst case.
//   4. framesAsGuess knows every framing the app authors and the server's equivalents; a server grief answer plays
//      its lines only when both acknowledge.
//   5. Escalation is read more widely, never for someone still alive, routed on close and while typing, and sticky.
// The probe table is tests/probes/r8.mjs (every probe of both round-1 reviews, with its route).
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as P from './probes/r8.mjs';
import { deathTalk, deathEscalation, wantsToFollow, stillAlive, serverLoss, serverGrief, griefLinesOk, livingLoss } from '../src/beyond/grief.js';
import { BAG, bagWords, framingAllowed, gentleRoute, harmRoute, framesAsGuess, acknowledges, FRAMING_MECHANICS } from '../src/beyond/backstop.js';
import { clauses, markerKinds, hasMarker, guessClause, factClause } from '../src/beyond/markers.js';
import { authoredScene, sceneParts, feelingOf, fairAnger, angerUnsaid, feelingGuard, guessGuard, framesScene, ownFactPair, ownStep, FACT_ASK, GUESS_ASK, eventKind } from '../src/beyond/authored.js';
import { AUTHORED_PAIRS, MECHANIC_LINES, FRIEND_LINES, EXPLORE, EXPLORE_ASK, EXPLORE_EMPTY, WAITING, FEELING, KIND, GRIEF, SAFETY, ANGER_PAIRS, AUTHORED_ALT, mechanicLines } from '../src/beyond/lines.js';
import { GENERAL, SCENARIOS } from '../src/ultra/frameworks.js';
import { checkText } from '../src/engine/safety.js';
import { MECHANIC_MODULES } from '../src/beyond/mechanics/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const text = (x) => (Array.isArray(x) ? x[0] : x);

/** The route the orchestrator takes for these words (another-angle.js afterTell → startAngle). */
function routeOf(t) {
  const lv = checkText(t).level;
  if (lv === 'crisis' || lv === 'care') return lv;
  if (deathEscalation(t)) return 'follow';
  if (gentleRoute(t)) return 'gentle';
  if (feelingOf(t)) return 'feeling';
  if (framingAllowed(t)) return 'guess';
  if (fairAnger(t)) return 'anger';
  return 'kind';
}
/** Every round of the authored path ("Show me another angle"), until it says it has nothing more. */
function rounds(t) {
  const out = [], exclude = [], usedAngles = [];
  for (let i = 0; i < 11; i++) {
    const s = authoredScene(t, { exclude, usedAngles });
    out.push(s);
    if (s.exhausted || s.grief) break;
    exclude.push(s.reasoning_pattern);
    if (s.angle_id) usedAngles.push(s.angle_id);
    if (s.alt_id) usedAngles.push(s.alt_id);
  }
  return out;
}
/** True when a scene would frame the words as a guess anywhere: its mechanic, a line, or a mechanic's own line. */
const framed = (s) => framesScene(s) || [s.subtitle_line_1, s.subtitle_line_2, s.practical_next_step, s.possible_assumption, s.alternative_angle].some(framesAsGuess)
  || framesAsGuess(JSON.stringify(mechanicLines(s.mechanic, s)));
/** The server answers the review stubbed (each frames the words one way or another), and one that is kind. */
const stub = (o) => ({ source: 'server', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', mechanic: 'pull_apart', mallow_character: 'zuzu', emotion: 'worry', situation_type: 'other',
  known_fact: 'What you wrote happened.', possible_assumption: 'That it means the worst.', alternative_angle: 'They might be busy.', practical_next_step: 'Check one fact you’re unsure about, instead of guessing.',
  subtitle_line_1: 'What you wrote is the part that actually happened.', subtitle_line_2: 'What it means is still a question, not an answer.', safety_status: 'ok', ...o });
const STUBS = {
  pullApart: stub(),
  shrink: stub({ reasoning_pattern: 'catastrophising', mechanic: 'shrink_projection', interaction_type: 'shrink_projection', subtitle_line_1: 'The worst case is one possibility.', subtitle_line_2: 'There’s also a best case, and a most likely one.' }),
  shrinkKind: stub({ reasoning_pattern: 'catastrophising', mechanic: 'shrink_projection', interaction_type: 'shrink_projection', known_fact: '', possible_assumption: '', alternative_angle: '', practical_next_step: '', subtitle_line_1: 'That sounds like a lot right now.', subtitle_line_2: 'One small thing could help.' }),
  mindRead: stub({ reasoning_pattern: 'mind_reading', mechanic: 'open_interpretations', interaction_type: 'open_interpretations', subtitle_line_1: 'That’s a guess about what’s going on inside someone else.', subtitle_line_2: 'Guesses can be right, and they can be wrong.' }),
  overgen: stub({ reasoning_pattern: 'overgeneralisation', mechanic: 'separate_one', interaction_type: 'separate_one', emotion: 'grief', subtitle_line_1: 'This is one moment, even if it feels like a pattern.', subtitle_line_2: 'Can you think of one time it went differently?' }),
  mindLoss: stub({ reasoning_pattern: 'mind_reading', mechanic: 'open_interpretations', interaction_type: 'open_interpretations', situation_type: 'loss', subtitle_line_1: 'That’s a guess about what’s going on inside someone else.', subtitle_line_2: 'Guesses can be right, and they can be wrong.' }),
  griefKind: stub({ situation_type: 'loss', emotion: 'grief', mechanic: 'pull_apart', subtitle_line_1: 'That sounds so hard.', subtitle_line_2: 'You loved him, and that love is still here.' }),
};
/**
 * What plays for a server answer (another-angle.js startAngle → griefMode, or the scene through feelingGuard and
 * guessGuard, then playScene's guessGuard): { gentle: lines } or { scene }.
 */
function played(t, res) {
  if (gentleRoute(t) || serverLoss(res, t, { heavy: () => false })) return { gentle: griefLinesOk(res) && serverLoss(res, t) ? [res.subtitle_line_1, res.subtitle_line_2] : 'authored' };
  return { scene: guessGuard(guessGuard(feelingGuard(res, t), t), t) };
}

// ---------------------------------------------------------------- the probe table --
test('r8 probe table: every probe of both reviews takes its route (all of them, with the counts)', () => {
  const lists = [
    [P.DEATH_MISSES, ['gentle']], [P.IDIOM_DEATHS, ['gentle']], [P.FEELINGS, ['feeling']], [P.FEELING_WITH_GUESS, ['guess']], [P.ANGER, ['anger']], [P.ANGER_WITH_GUESS, ['guess']],
    [P.EVENTS, ['kind', 'feeling']], [P.GUESSES, ['guess']], [P.ILLNESS, ['kind']], [P.FALSE_ALARMS, ['gentle']], [P.THING_DIED, ['kind']], [P.STORY_FALSE_ALARMS, ['kind']], [P.GAME_CRASH, ['kind']],
    [P.FOLLOW, ['follow', 'crisis', 'care']], [P.NOT_FOLLOW, ['gentle']], [P.LEXICON.map(([t]) => t), ['crisis', 'care']],
  ];
  let n = 0;
  for (const [list, want] of lists) for (const item of list) { n++; const r = routeOf(text(item)); assert.ok(want.includes(r), `${text(item)} → ${r} (want ${want.join('|')})`); }
  assert.ok(n >= 150, `${n} probes`);
  for (const [t, lv] of P.LEXICON) assert.equal(checkText(t).level, lv, t);
});

// ------------------------------------------------------------- 1. the flipped default --
test('r8.1: without an interpretive marker nothing frames the words as a guess, in any round (events, wrongs, feelings, losses, bag words)', () => {
  for (const item of [...P.EVENTS, ...P.ANGER, ...P.FEELINGS, ...P.ILLNESS, ...P.GAME_CRASH, ...P.DEATH_MISSES, ...P.IDIOM_DEATHS, ...P.FALSE_ALARMS, ...P.THING_DIED, ...P.STORY_FALSE_ALARMS, ...P.NOT_FOLLOW]) {
    const t = text(item);
    assert.equal(framingAllowed(t), false, t);
    for (const s of rounds(t)) assert.ok(!framed(s), `${t} → ${s.mechanic}: ${s.subtitle_line_1} | ${s.subtitle_line_2}`);
  }
});

test('r8.1: a server scene that frames words without a marker plays on a kind mechanic with the authored kind lines (every stub)', () => {
  for (const item of [...P.EVENTS, ...P.ANGER, ...P.FEELINGS, ...P.ILLNESS, ...P.GAME_CRASH]) {
    const t = text(item);
    for (const [name, res] of Object.entries(STUBS)) {
      const out = played(t, res);
      if (out.gentle) { assert.ok(serverLoss(res, t, { heavy: () => false }), `${t} ${name}`); continue; }
      const s = out.scene;
      assert.ok(!framed(s), `${t} (${name}) → ${s.mechanic}: ${s.subtitle_line_1} | ${s.subtitle_line_2}`);
      assert.ok(!FRAMING_MECHANICS.has(s.mechanic), `${t} (${name}) → ${s.mechanic}`);
      assert.equal(s.possible_assumption || '', '', `${t} (${name})`);
      // a framing stub's lines never play: the authored kind (or feeling) lines do (review r9: even kind lines on a
      // framing reading or mechanic, shrinkKind, and every realistic paraphrase, STUBS.realistic*)
      assert.equal(s.source, 'authored', `${t} (${name})`);
    }
  }
});

test('r8.1: with a marker only that clause is the guess, never the stated event (authored and server)', () => {
  for (const [t, clause] of [...P.GUESSES, ...P.ANGER_WITH_GUESS, ...P.FEELING_WITH_GUESS]) {
    assert.equal(guessClause(t), clause, t);
    if (feelingOf(t)) continue;
    assert.equal(framingAllowed(t), true, t);
    const fact = factClause(t);
    for (const s of rounds(t)) {
      const p = sceneParts(t, s);
      if (s.possible_assumption) assert.equal(s.possible_assumption, `What your mind might be adding: “${clause}”.`, t);
      if (s.mechanic === 'pull_apart') { assert.ok(p.guessAsk || p.guess === clause, `${t} → ${p.guess}`); if (fact) assert.notEqual(p.guess, fact, t); }
      for (const l of [s.subtitle_line_1, s.subtitle_line_2]) for (const q of String(l).matchAll(/“([^”]+)”/gu)) if (/one way to read|is a guess|forecast/.test(l)) assert.equal(q[1], clause, `${t} → ${l}`);
    }
    // a server scene that reads the stated event as the guess gives way to the clause
    const s = guessGuard(stub({ possible_assumption: `That ${fact || 'it happened'} at all.`, subtitle_line_1: `“${fact || t}” is one way to read it.`, subtitle_line_2: 'Guesses can be right, and they can be wrong.' }), t);
    assert.equal(s.possible_assumption, `What your mind might be adding: “${clause}”.`, t);
    if (fact) assert.doesNotMatch(s.subtitle_line_1, new RegExp(`“${fact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}” is one way to read`), t);
  }
  // the feeling beside a thought stays real: it is the fact, the thought the guess
  assert.equal(factClause('I’m worried I’ll fail the exam'), 'I’m worried');
  assert.deepEqual(ownFactPair('I’m worried', 'I’ll fail the exam', false, 'I’m worried I’ll fail the exam'), ['“I’m worried” is real.', '“I’ll fail the exam” is one way to read it.']);
});

test('r8.1: the markers (mind reading, overgeneralising, catastrophising, labelling, should), and what is never one', () => {
  const kinds = (t) => [...markerKinds(t)].sort().join(',');
  for (const [t, k] of [['she must hate me', 'mind'], ['My boss thinks I’m lazy', 'mind'], ['he doesn’t care about me', 'mind'], ['they’re laughing at me', 'mind'], ['she wants me to fail', 'mind'],
    ['My mum is furious with me.', 'mind'], ['He never listens to me.', 'over'], ['I always mess everything up.', 'over'], ['nothing ever works', 'over'], ['every time I try it goes wrong', 'over'],
    ['What if I fail?', 'cata'], ['I’m going to fail', 'cata'], ['they’ll laugh at me', 'cata'], ['I’ve ruined everything', 'cata'], ['it’ll be a disaster', 'cata'],
    ['I’m such an idiot', 'label'], ['I’m useless', 'label'], ['I should have known', 'should'], ['I shouldn’t have said it', 'should']]) assert.ok(kinds(t).split(',').includes(k), `${t} → ${kinds(t)}`);
  // a stated past act, a feeling, a plan: never a marker
  for (const t of ['My mate never paid me back', 'Nobody came to my party.', 'They laughed at me when I tripped', 'My dad always said I would amount to nothing', 'I’ve never been good at maths',
    'I feel anxious all the time about work', 'I feel sick about the exam.', 'I should call my mum.', 'I’m going to the shops', 'It always rains on my birthday', 'My colleague talked about me behind my back',
    'Everything is fine, I just feel tired', 'He won’t let me go out']) assert.equal(hasMarker(t), false, `${t} → ${kinds(t)}`);
  // only "I feel like / that …" is a thought
  assert.equal(hasMarker('I feel like everyone hates me'), true);
  assert.equal(hasMarker('I feel anxious about everything'), false);
  // a comma splits only before a new clause
  assert.deepEqual(clauses('I am a useless, useless person.').map((c) => c.text), ['I am a useless, useless person']);
  assert.deepEqual(clauses('My sister ignored me at the party, she must hate me.').map((c) => c.text), ['My sister ignored me at the party', 'she must hate me']);
});

test('r8.1: wrongs done to them are fair anger (the reviewer’s twenty): the wrong is the fact, find_boundary first, never a guess', () => {
  for (const t of P.ANGER) {
    assert.equal(fairAnger(t), true, t);
    const all = rounds(t);
    // (a wrong told with embarrassment, not anger, the angle-polish QA: the one moment lifted out first, never find_boundary)
    const unsaid = angerUnsaid(t);
    assert.equal(all[0].mechanic, unsaid ? 'separate_one' : 'find_boundary', t);
    for (const s of all) {
      assert.ok((unsaid ? ['separate_one', 'return_responsibility', 'assemble_step', 'soften_harshness'] : ['find_boundary', 'return_responsibility', 'assemble_step']).includes(s.mechanic), `${t} → ${s.mechanic}`);
      assert.equal(s.possible_assumption, '', t);
      assert.ok(!framed(s), `${t} → ${s.subtitle_line_1}`);
    }
  }
  // a server answer that frames the wrong gives way to fair anger's own scenes (find_boundary first)
  for (const t of P.ANGER) for (const res of [STUBS.pullApart, STUBS.mindRead, STUBS.shrink]) {
    const s = played(t, res).scene;
    assert.equal(s.mechanic, angerUnsaid(t) ? 'separate_one' : 'find_boundary', `${t} → ${s.mechanic}`);
    assert.ok(!framed(s), t);
  }
  // the explore prompts and waiting lines follow the gate: a feeling's, never "Want to test it?" or "What else could be true?"
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /feel = feelingOf\(S\.text\) \|\| \(framingAllowed\(S\.text\) \? null : \{ kind: 'low' \}\);[\s\S]{0,200}const lines = feel \? FEELING\.waiting : WAITING/);
  assert.match(src, /const gentle = !!scene\.feeling \|\| !framingAllowed\(S\.text\);\s*let remaining = gentle \? EXPLORE\.filter/);
});

test('r8.1: a stated event plays the kind scenes with lines that treat it as real ("hurt": its weight goes back with them)', () => {
  assert.equal(eventKind('My sister ignored me at the party.'), 'hurt');
  assert.equal(eventKind('I didn’t get the job.'), 'event');
  const ev = rounds('I didn’t get the job.');
  for (const s of ev) if (s.feeling) assert.ok(!framed(s), s.subtitle_line_1);
  const hurt = rounds('My sister ignored me at the party.');
  assert.ok(hurt.some((s) => s.mechanic === 'return_responsibility' && s.subtitle_line_1 === KIND.pairs.return_responsibility[0]), hurt.map((s) => s.mechanic).join(', '));
  assert.equal(hurt[0].subtitle_line_1, KIND.first.hurt);
  for (const l of [...Object.values(KIND.first), ...Object.values(KIND.pairs).flat(), ...Object.values(KIND.steps)]) assert.equal(framesAsGuess(l), false, l);
});

// ----------------------------------------------------------------- 2. the bag of words --
test('r8.2: the backstop is a bag of words with no idiom blanks (each of the coordinator’s words), never the framing', () => {
  const words = ['die', 'dies', 'died', 'dying', 'dead', 'death', 'deceased', 'passed', 'pass away', 'killed', 'kill', 'murder', 'murdered', 'funeral', 'grave', 'buried', 'cremated', 'ashes',
    'grief', 'grieving', 'mourning', 'bereaved', 'lost', 'loss', 'gone', 'survive', 'survived', 'didn’t make it', 'make it', 'hospital', 'hospice', 'icu', 'life support', 'cancer', 'terminal',
    'accident', 'crash', 'overdose', 'miscarriage', 'stillborn', 'suicide', 'assault', 'attacked', 'abused', 'raped',
    // review r1: illness and emergency
    'coma', 'chemo', 'tumour', 'intensive care', 'a and e', 'run over', 'hit by a car', 'missing'];
  for (const w of words) {
    assert.equal(bagWords(`and then ${w} and she thinks I’m useless`), true, w);
    assert.equal(framingAllowed(`and then ${w} and she thinks I’m useless`), false, w);
  }
  // whole words only, apostrophes out ("didn’t make it" = "didnt make it"), no idiom set aside
  for (const t of ['I lost my keys and my boss thinks I’m useless.', 'My phone died and now she thinks I ignored her', 'I passed my test but everyone thinks I cheated.', 'didnt make it']) assert.equal(bagWords(t), true, t);
  for (const t of ['I tripped on the stairs', 'she must hate me', 'Nobody likes me.', 'diet', 'passenger seat']) assert.equal(bagWords(t), false, t);
  assert.ok(BAG instanceof RegExp);
  // death talk → gentle; any other bag word → kind
  for (const t of [...P.DEATH_MISSES, ...P.IDIOM_DEATHS]) assert.equal(harmRoute(t), 'gentle', t);
  for (const t of P.ILLNESS) { assert.equal(harmRoute(t), 'kind', t); for (const s of rounds(t)) assert.ok(s.feeling && !framed(s), `${t} → ${s.mechanic}`); }
  // no playful line beside one: the orchestrator reads it while typing, on close and on Send
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /if \(S\.grief \|\| S\.noPlay\) return;/);
  assert.match(src, /if \(gentleRoute\(t\) \|\| bagWords\(t\)\) \{\s*S\.noPlay = true;/);
  assert.match(src, /if \(S\.noPlay \|\| S\.level !== 'none'\) careFace\(\); else zt\?\.setStage\('playful'\);/);
});

test('r8.2: death talk reads the reviewer’s phrasings, and the idioms that could hide a death are gone', () => {
  for (const t of [...P.DEATH_MISSES, ...P.IDIOM_DEATHS]) { assert.ok(deathTalk(t), t); assert.equal(authoredScene(t).grief, true, t); }
  for (const t of P.STILL_IDIOMS) assert.equal(deathTalk(t), null, t);
  const words = read('src/beyond/death-words.js');
  // "passed out", "passed by" and "passed on the …" are never blanked; a gadget only as the subject
  assert.doesNotMatch(words, /pass\(\?:ed\|es\|ing\)\?\\s\+\(\?:out\|by/);
  assert.match(words, /never "passed out", "passed by" or "passed on the weekend"/);
  for (const t of ['the guy in the car died', 'the man in the car died', 'my friend in the car died']) assert.ok(deathTalk(t), t);
  for (const t of ['my car died', 'my mums car died on the motorway', 'and then my phone died']) assert.equal(deathTalk(t), null, t);
});

// ------------------------------------------------------------------ 3. feelings --
test('r8.3: a feeling about anything (tomorrow, the exam, Monday, the operation) is a feeling: real, never a guess or the worst case', () => {
  for (const t of P.FEELINGS) {
    assert.ok(feelingOf(t), t);
    for (const s of rounds(t)) {
      assert.ok(s.feeling, `${t} → ${s.mechanic}`);
      assert.ok(!framed(s), `${t} → ${s.subtitle_line_1}`);
      assert.doesNotMatch(JSON.stringify(mechanicLines(s.mechanic, s)), /The worst case|What your mind added|Your first guess/, t);
    }
    // the server's framing answer plays as the feeling's own scene
    for (const res of Object.values(STUBS)) { const out = played(t, res); if (out.scene) assert.ok(out.scene.feeling && !framed(out.scene), `${t} → ${out.scene.mechanic}`); }
  }
});

// ---------------------------------------------------------------- 4. the app's framings --
test('r8.4: framesAsGuess knows every framing the app authors (pairs, mechanics, prompts, steps, the library’s angles) and the server’s', () => {
  const frames = (name, list) => { for (const l of list) assert.equal(framesAsGuess(l), true, `${name}: ${l}`); return list.length; };
  let n = 0;
  n += frames('pairs', ['fact_vs_assumption', 'catastrophising', 'all_or_nothing', 'mind_reading', 'overgeneralisation', 'self_criticism'].flatMap((k) => AUTHORED_PAIRS[k]));
  // the review's two: "That’s a guess…" and the overgeneralisation pair
  assert.equal(framesAsGuess('That’s a guess about what’s going on inside someone else.'), true);
  assert.equal(framesAsGuess('This is one moment, even if it feels like a pattern.'), true);
  assert.equal(framesAsGuess('Can you think of one time it went differently?'), true);
  for (const m of ['pull_apart', 'shrink_projection', 'open_interpretations', 'reveal_spectrum', 'separate_one', 'soften_harshness']) n += frames(m, [MECHANIC_LINES[m].hint, MECHANIC_LINES[m].done]);
  n += frames('others', MECHANIC_LINES.open_interpretations.others);
  n += frames('friend', ['fact_vs_assumption', 'catastrophising', 'all_or_nothing', 'mind_reading', 'overgeneralisation'].map((k) => FRIEND_LINES[k]));
  n += frames('explore', [EXPLORE[0].label, EXPLORE[1].label, EXPLORE_ASK, EXPLORE_EMPTY.known_fact, EXPLORE_EMPTY.alternative_angle, EXPLORE_EMPTY.possible_assumption]);
  n += frames('waiting', WAITING);
  n += frames('asks', [FACT_ASK, GUESS_ASK]);
  n += frames('own pair', [...ownFactPair('My sister ignored me', 'she must hate me', false, 'My sister ignored me, she must hate me'), ...ownFactPair('', 'Nobody likes me', true, 'Nobody likes me')]);
  n += frames('own step', [ownStep('mind_reading', 'My sister ignored me, she must hate me', { guess: 'she must hate me' }), ownStep('self_criticism', 'I’m a useless boyfriend.', { guess: '' })]);
  n += frames('kit', Object.entries(GENERAL.patternKit).flatMap(([id, k]) => k.angles.filter((a) => !(id === 'spotlight-on-me' && /Lots of things/.test(a.text))).map((a) => a.text.replace(/\{thought\}/g, 'she must hate me'))));
  n += frames('steps', GENERAL.nextSteps.filter((s) => ['check', 'wait'].includes(s.kind)).map((s) => s.text));
  n += frames('scenario angles', SCENARIOS.flatMap((s) => s.angles).filter((a) => ['not-enough-info', 'benign', 'neutral'].includes(a.kind)).map((a) => a.text));
  n += frames('server', P.SERVER_FRAMINGS);
  assert.ok(n >= 140, `${n} framings pinned`);
  // and never the lines that acknowledge
  for (const l of [...P.NOT_FRAMINGS, ...Object.values(FEELING.first), ...Object.values(FEELING.pairs).flat(), ...Object.values(FEELING.steps), FEELING.friend, ...FEELING.waiting,
    ...Object.values(KIND.pairs).flat(), GRIEF.heard, ...GRIEF.loss, ...GRIEF.grief, ...GRIEF.heavy, GRIEF.ask, GRIEF.squeeze, GRIEF.closed, ...SAFETY.follow, ...SAFETY.care,
    ...Object.values(ANGER_PAIRS).flat(), AUTHORED_ALT.valid_anger, ...AUTHORED_PAIRS.valid_anger, ...AUTHORED_PAIRS.practical_problem, ...AUTHORED_PAIRS.rumination]) assert.equal(framesAsGuess(l), false, l);
});

test('r8.4: a server grief or loss answer plays its lines only when both acknowledge; the review’s stubs fall back to the gentle lines', () => {
  for (const [a, b] of P.GRIEF_LINES_OK) assert.ok(acknowledges(a) && acknowledges(b), a);
  for (const [a, b] of P.GRIEF_LINES_NOT) assert.ok(!(acknowledges(a) && acknowledges(b)), a);
  for (const t of ['my dads dead and i miss him', 'We lost Dad in March.', ...P.DEATH_MISSES]) {
    assert.equal(serverGrief(STUBS.mindLoss, t), false, t);
    assert.equal(serverGrief(STUBS.overgen, t), false, t);
    assert.equal(serverGrief(STUBS.griefKind, t), true, t);
    assert.deepEqual(played(t, STUBS.mindLoss), { gentle: 'authored' }, t);
    assert.deepEqual(played(t, STUBS.overgen), { gentle: 'authored' }, t);
    assert.deepEqual(played(t, STUBS.pullApart), { gentle: 'authored' }, t);
  }
  // the kind route ("my phone died and now she thinks I ignored her"): the framing pair never stays
  for (const res of [STUBS.mindRead, STUBS.overgen]) assert.ok(!framed(played('my phone died and now she thinks I ignored her', res).scene));
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /serverLoss\(res\.scene, S\.text, \{ heavy: heavyWords \}\) && griefLinesOk\(res\.scene\)\) scene = res\.scene;/);
  assert.match(src, /griefMode\(\{ scene: griefLinesOk\(res\.scene\) \? res\.scene : null, asked: true \}\)/);
});

test('r8.4: the framing mechanics (and a label’s or a habit’s own lines) never mount without a marker', async () => {
  const fake = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  globalThis.OffscreenCanvas ??= class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return fake(); } };
  const tags = () => { const list = new Set(); return { add(text) { const t = { text, w: 90, h: 30, el: { style: { setProperty() {} } }, at() { return t; }, own() { return t; }, rect: () => null, set() { return t; }, title_() { return t; }, hide() { return t; }, remove() { list.delete(t); } }; list.add(t); return t; }, rects: () => [], clear() { list.clear(); }, texts: () => [...list].map((x) => x.text), layout() {}, remeasure() {} }; };
  const mount = async (mech, t, scene) => (await MECHANIC_MODULES[mech]()).mount({ g: fake(), area: () => ({ x: 16, y: 170, w: 358, h: 400 }), from: { x: 195, y: 360, r: 36 }, scene, parts: sceneParts(t, scene), lines: mechanicLines(mech, scene), text: t, emotion: 'anxiety', tags: tags(), reducedMotion: () => true, lowStim: () => false, hint() {}, choose: async () => null, haptic() {}, fx() {}, progress() {}, kick() {}, say() {} });
  for (const mech of ['pull_apart', 'shrink_projection', 'open_interpretations', 'reveal_spectrum', 'separate_one', 'soften_harshness']) {
    for (const t of ['My sister ignored me at the party.', 'I feel sick about the exam.', 'My ex cheated on me']) await assert.rejects(async () => mount(mech, t, { mechanic: mech }), /never for these words/, `${mech}: ${t}`);
    (await mount(mech, 'My sister ignored me at the party, she must hate me.', { mechanic: mech })).destroy();
  }
  // a kind scene on separate_one / soften_harshness plays (its own lines)
  for (const mech of ['separate_one', 'soften_harshness']) (await mount(mech, 'My sister ignored me at the party.', { mechanic: mech, feeling: 'hurt' })).destroy();
  // the browser gate's fixture words carry the markers its framing mechanics need
  const scenes = JSON.parse(read('tools/beyond/scenes.json'));
  for (const mech of ['pull_apart', 'shrink_projection', 'open_interpretations', 'reveal_spectrum', 'separate_one', 'soften_harshness']) assert.equal(framingAllowed(scenes[mech].text), true, mech);
});

// ---------------------------------------------------------------- 5. escalation --
test('r8.5: wanting to be with, beside or follow the one who died is care; at a living person’s bedside, or someone else’s, never', () => {
  for (const t of P.FOLLOW) assert.ok(['follow', 'crisis', 'care'].includes(routeOf(t)), t);
  for (const t of P.FOLLOW.filter((x) => checkText(x).level === 'none')) assert.equal(deathEscalation(t), true, t);
  for (const t of P.NOT_FOLLOW) { assert.equal(deathEscalation(t), false, t); assert.ok(deathTalk(t), t); }
  // still alive: wanting to be at their side is love; the plainest wishes still count
  for (const t of ['my nan is dying and I want to be with her', 'my dad is in hospice and I want to be with him', 'my mum is on life support and I need to be with her']) assert.equal(stillAlive(t), true, t);
  assert.equal(stillAlive('My nan died and I want to be with her'), false);
  assert.equal(deathEscalation('my nan is dying and I want to die with her'), true);
  // the possessive is never the one who died ("my brother's kids")
  assert.equal(wantsToFollow('my brother died and I want to be with my brothers kids'), false);
});

test('r8.5: escalation routes while typing, on close and on Send, and stays (rewording never undoes it)', () => {
  const src = read('src/beyond/another-angle.js');
  // on close: the typed words are read before the level routes; care uses the follow lines
  assert.match(src, /const typed = String\(overlay\?\.text \?\? ''\);\s*overlay = null;/);
  assert.match(src, /if \(reason !== 'submit'\) \{[\s\S]{0,160}readDraft\(typed\);[\s\S]{0,240}else if \(S\.level === 'care'\) careMode\(\);/);
  // while typing: the draft is read as it changes (as the overlay reads crisis and care)
  assert.match(src, /ta\?\.addEventListener\('input', \(\) => \{ clearTimeout\(draftT\); draftT = setTimeout\(\(\) => \{ draftT = 0; if \(overlay\) readDraft\(overlay\.text\); \}, DRAFT_MS\); \}\);/);
  assert.match(src, /function readDraft\(text\) \{[\s\S]{0,140}if \(deathEscalation\(t\)\) noteFollow\(\);/);
  // sticky: care for the visit, and its own lines from then on
  assert.match(src, /function noteFollow\(\) \{\s*S\.follow = true;\s*noteSafety\(\{ level: 'care', category: 'death-follow' \}\);/);
  assert.match(src, /async function careMode\(\{ lines = S\.follow \? SAFETY\.follow : SAFETY\.care \} = \{\}\)/);
  // on Send: the visit's level first (care seen before still holds), then the words sent
  assert.match(src, /noteSafety\(checkText\(S\.text\)\);\s*if \(S\.level === 'crisis'\) \{ crisisMode\(\); return; \}\s*if \(S\.level === 'care'\) \{ careMode\(\); return; \}[\s\S]{0,260}if \(deathEscalation\(S\.text\)\) \{ noteFollow\(\); careMode\(\{ lines: SAFETY\.follow \}\); return; \}/);
  // noteSafety only raises the level (never lowered by rewording)
  assert.match(src, /if \(!lv \|\| !LEVELS\.includes\(lv\) \|\| worse\(S\.level, lv\) === S\.level\) return;/);
});

// ------------------------------------------------------------------- UI review --
test('r8 UI: death talk typed and closed gets a quiet word and support close, never a playful line; Finish lands with support', () => {
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /else if \(gentleRoute\(typed\)\) gentleNote\(\);/);
  const note = src.slice(src.indexOf('function gentleNote('), src.indexOf('function concernNote('));
  assert.match(note, /S\.grief = true; S\.keepSupport = true; S\.noPlay = true;/);
  assert.match(note, /careFace\(\);/);
  assert.match(note, /say\(GRIEF\.closed/);
  assert.doesNotMatch(note, /ZUZU_SQUEEZE|playful|hop/);
  for (const l of [GRIEF.closed]) { assert.doesNotMatch(l, /\b(?:died|dead|death|grief|loss|lost|them|they|miss\w*|passed|gone)\b/i, l); assert.equal(framesAsGuess(l), false); }
  // Finish after the gentle path: the Hushfold gets a safety level, so its Support pill and attentive face are there
  const fin = src.slice(src.indexOf('async function finish('), src.indexOf('// ------------------------------------------------------- the view --'));
  // (r2-angle item 5: angle-first.js goodbye, pinned in tests/r2-angle.test.mjs: the grief path sends concern home)
  assert.match(fin, /app\.go\('home', bye\.params\);/);
  assert.match(fin, /const lines = bye\.lines === 'safety' \? SAFETY\.finish : END\.finish;/);
  // the gentle path never offers Finish or support twice (its chips carry them while the choice is up)
  const grief = src.slice(src.indexOf('async function griefMode('), src.indexOf('async function unclear('));
  assert.match(grief, /dockShow\(\{ tell: true, support: false \}\);\s*const v = await choose\(GRIEF\.ask, GRIEF\.options/);
  assert.deepEqual(GRIEF.options.map((o) => o.value), ['squeeze', 'support', 'finish']);
  // while death talk is typed Zuzu turns attentive (the overlay's suggested face never overrides it)
  assert.match(src, /face: \(f\) => \{ if \(S\.level === 'none' && !S\.heavyDraft\) zt\?\.setEmotion/);
  assert.doesNotMatch(read('src/beyond/death-words.js'), /safety-lexicon/);
  assert.equal(livingLoss('My nan has dementia and doesn’t know who I am.'), true);
});
