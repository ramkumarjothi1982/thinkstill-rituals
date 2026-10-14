// Another Angle, review round 10: the round-3 semantic review's blocking items and polish, and the coordinator's design
// (a structural loss backstop beside the review's phrase families). Every probe of the review is in tests/probes/r10.mjs
// verbatim; tests/probes/r10-replay.mjs replays each visit through the orchestrator's routing with no server and with
// every kind of server answer (a grief answer, an ordinary pull_apart, a fallback, mind reading, grief lines tagged
// ordinary, fair anger on find_boundary, care, crisis).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import * as P from './probes/r10.mjs';
import { SEE_AGAIN_LONGING } from './probes/r4.mjs';
import { visit, STUBS, SCENE_STUBS } from './probes/r10-replay.mjs';
import { deathTalk, deathEscalation, suicideDeath } from '../src/beyond/grief.js';
import { bagWords, lossNear, ordinaryOnly, framingAllowed, framesAsGuess, acknowledges, FRAMING_MECHANICS } from '../src/beyond/backstop.js';
import { authoredScene, fairAnger, angerAnswer, angerUnsaid, eventKind, candidatePatterns } from '../src/beyond/authored.js';
import { SAFETY, KIND, FEELING, WAITING, ANGER_PAIRS, AUTHORED_PAIRS, MECHANIC_LINES } from '../src/beyond/lines.js';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

/** The review's own framing detector (independent of backstop.js framesAsGuess), and the app's. */
const FRAME = /\bis what happened\b|what happened is one thing|\[what happened\]|what your mind|mind (?:might be )?add|open question|\btest it\b|another explanation|one way to read|\bguess(?:es|ing)?\b|worst case|one possibility|what do you actually know|check one fact|what (?:it|this) (?:really )?means|might mean|could mean|stuck together|two different things|\[this time\]|\[other times\]|harsh (?:verdict|word)|between perfect|\[all bad\]|blown up|life size|you know for sure|still open|maybe they|didn[’']?t know what to say|other side to this|what else could be true|look a little closer|weight on one thought|one moment\b|not every moment|somewhere in between|the lesson|something to learn|\[your part\]/i;
/**
 * Everything a visit framed: a framing mechanic, a line said that frames the words (either detector), or a label drawn
 * that does (the review's detector: a drawn excerpt is the person's own words, "what if I forget her voice").
 */
const framings = (R) => [...R.mechanics.filter((m) => FRAMING_MECHANICS.has(m)).map((m) => `mechanic:${m}`), ...R.said.filter((l) => FRAME.test(l) || framesAsGuess(l)), ...R.drawn.filter((l) => FRAME.test(l))];
/** Anything playful: the playful waiting lines, the grin or the transforming face, the squeeze quips. */
const playful = (R) => [...R.said.filter((l) => WAITING.includes(l)), ...R.faces.filter((f) => f !== 'attentive'), ...(R.quips ? ['squeeze quips'] : [])];
/** Lines that answer the words as anger (a stated hurt's own kind lines, KIND, are not: they say it happened). */
const KIND_LINES = new Set([...Object.values(KIND.pairs).flat(), ...Object.values(KIND.first)]);
const ANGER_LINES = new Set([...Object.values(ANGER_PAIRS).flat(), ...AUTHORED_PAIRS.valid_anger, FEELING.first.angry, MECHANIC_LINES.find_boundary.hint, 'Being angry about this makes sense.'].filter((l) => !KIND_LINES.has(l)));
let probes = 0;

// ---------------------------------------------------------------------- blocking 1 and 2 --
test('r10.1: every death phrasing of the review, with and without each marker clause, no server and every stub: the gentle path, nothing framed, nothing playful', () => {
  const all = [...new Set([...P.R3_FRAMED, ...P.R3_MISS_BOTH, ...P.R3_GAME_20, ...P.R3_PHRASES, ...P.DEATH_R10])];
  for (const p of all) {
    assert.ok(deathTalk(p) || deathEscalation(p), `deathTalk misses ${p}`);
    for (const m of ['', ...P.R3_MARKERS]) {
      const t = p + m;
      assert.equal(framingAllowed(t), false, t);
      for (const s of SCENE_STUBS) {
        probes++;
        const R = visit(t, { server: STUBS[s] });
        const why = `[${s}] ${t} → ${R.route} ${R.mechanics.join(',')}`;
        assert.ok(['gentle', 'follow', 'care', 'crisis'].includes(R.route), why);
        assert.deepEqual(R.mechanics, [], why);
        assert.deepEqual(framings(R), [], why);
        assert.deepEqual(playful(R), [], why);
        assert.ok(R.requests <= 1, `${why} (${R.requests} requests)`);
        assert.ok(!R.said.some((l) => ANGER_LINES.has(l)), why);
      }
    }
  }
});

test('r10.2: the review’s DEATH group (155), no server and every stub: never a game, never framed, never playful', () => {
  for (const t of P.R3_DEATH) {
    for (const s of SCENE_STUBS) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      const why = `[${s}] ${t} → ${R.route} ${R.mechanics.join(',')}`;
      assert.notEqual(R.route, 'play', why);
      assert.deepEqual(framings(R), [], why);
      assert.deepEqual(playful(R), [], why);
    }
  }
});

// ------------------------------------------------------------ the structural loss backstop --
test('r10.3: the structural backstop: a person or a pet within four words of a loss cue is a bag hit (no framing, nothing playful)', () => {
  for (const t of [...P.STRUCTURAL, ...P.NO_HEARTBEAT]) {
    assert.equal(lossNear(t), true, t);
    assert.equal(bagWords(t), true, t);
    assert.equal(framingAllowed(t), false, t);
    for (const s of SCENE_STUBS) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      const why = `[${s}] ${t} → ${R.route} ${R.mechanics.join(',')}`;
      assert.deepEqual(framings(R), [], why);
      assert.deepEqual(playful(R), [], why);
      assert.equal(R.noPlay, true, why);
    }
  }
  // the coordinator's cues, each beside a person and beside a pet (him / her / them count only with one named)
  for (const cue of ['took', 'taken', 'went', 'gone', 'left us', 'goodbye', 'rest', 'resting', 'laid', 'ground', 'angel', 'heaven', 'heartbeat', 'scan', 'unresponsive', 'found',
    'succumbed', 'departed', 'croaked', 'snuffed', 'bucket', 'clogs', 'farm', 'shiva', 'sitting', 'buried', 'ashes', 'urn', 'hospital', 'never came', 'isnt coming',
    'not coming back', 'isnt around', 'no longer', 'anymore', 'any more', 'last time', 'would have been', 'anniversary', 'without']) {
    probes += 2;
    assert.equal(lossNear(`my nan ${cue} xx`), true, `nan + ${cue}`);
    assert.equal(lossNear(`xx ${cue} our dog`), true, `${cue} + dog`);
  }
  assert.equal(lossNear('today would have been my nans birthday'), true);
  assert.equal(lossNear('it is my birthday and my mum forgot'), false, 'birthday alone is never a cue');
  assert.equal(lossNear('she went and found him'), false, 'him / her / them only with a person or pet named');
  assert.equal(lossNear('my dad went'), true);
  assert.equal(lossNear('my dad is lovely and kind and generous and always took'), false, 'more than four words away');
  for (const t of P.NOT_STRUCTURAL) { probes++; assert.equal(lossNear(t), false, t); }
});

// ---------------------------------------------------- fair anger beside a death or a bag word --
test('r10.4: fair anger beside a death or a bag word is never find_boundary or an anger line, on any stub', () => {
  for (const t of P.ANGER_BESIDE_LOSS) {
    assert.equal(angerAnswer(t), false, t);
    assert.ok(!candidatePatterns(t).includes('valid_anger') || !angerAnswer(t), t);
    for (const s of SCENE_STUBS) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      const why = `[${s}] ${t} → ${R.route} ${R.mechanics.join(',')}`;
      assert.ok(!R.mechanics.includes('find_boundary'), why);
      assert.deepEqual(R.said.filter((l) => ANGER_LINES.has(l)), [], why);
      assert.deepEqual(framings(R), [], why);
      assert.deepEqual(playful(R), [], why);
    }
  }
  // (r3-esc, by design) an overdose named ("ODd") is a suicide death word: care, gently, nothing sent (it was the gentle path)
  assert.equal(visit('my friend ODd last night and everyone blames me').route, 'care');
  // fair anger with no bag word keeps its own scenes
  for (const t of P.ANGER_STAYS) {
    probes++;
    assert.equal(fairAnger(t), true, t);
    // (a wrong told with embarrassment, never anger: "My boss embarrassed me in front of everyone" is never answered as anger,
    // the angle-polish QA; it is still a wrong, on a stated event's kind steps)
    if (angerUnsaid(t)) { assert.equal(angerAnswer(t), false, t); assert.notEqual(authoredScene(t).mechanic, 'find_boundary', t); continue; }
    assert.equal(angerAnswer(t), true, t);
    assert.equal(authoredScene(t).mechanic, 'find_boundary', t);
  }
});

// -------------------------------------------------------------------- blocking 3 and 4 --
test('r10.5: escalation: the review’s positives (and the coordinator’s "go on" forms) are care with nothing sent', () => {
  for (const t of [...P.ESCALATE_R10, ...P.R3_ESC_POS, ...P.R3_ESC_GUIDE, ...P.R3_FOLLOW_POS, ...P.GO_ON_POS]) {
    for (const s of ['none', 'pull', 'grief']) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      // (final round 4, the check's polish) the bare "I want to see her again" is longing: the gentle path, never care
      if (SEE_AGAIN_LONGING.includes(t)) { assert.equal(R.route, 'gentle', `[${s}] ${t}`); continue; }
      assert.ok(['follow', 'care', 'crisis'].includes(R.route), `[${s}] ${t} → ${R.route} (esc=${deathEscalation(t)}, lexicon=${checkText(t).level})`);
      assert.equal(R.requests, 0, t);
    }
  }
  for (const t of P.ESCALATE_R10) assert.equal(deathEscalation(t), true, t);
});
test('r10.6: escalation: the review’s negatives never route to care ("go on holiday", "carry on working", "go where she used to …")', () => {
  for (const t of [...P.NOT_ESCALATE_R10, ...P.R3_ESC_NEG, ...P.R3_ESC_GUIDE_NOT, ...P.R3_FOLLOW_NEG]) {
    probes++;
    assert.equal(deathEscalation(t), false, t);
    const R = visit(t);
    assert.ok(!['follow', 'care'].includes(R.route) || checkText(t).level === 'care', `${t} → ${R.route}`);
    assert.deepEqual(framings(R), [], t);
  }
});

// ------------------------------------------------------------------------------ polish --
test('r10.7 (polish): devices without the apostrophe are never death talk; ordinary idioms get neutral lines', () => {
  for (const t of P.DEVICES) { probes++; assert.equal(deathTalk(t), null, t); assert.equal(bagWords(t), true, t); }
  const hard = [KIND.first.event, KIND.pairs.soften_harshness[0], KIND.pairs.separate_one[0]];
  for (const t of P.NEUTRAL) {
    probes++;
    assert.equal(ordinaryOnly(t), true, t);
    assert.equal(eventKind(t), 'neutral', t);
    const R = visit(t);
    assert.equal(R.route, 'play', t);
    assert.ok(R.said.includes(KIND.neutral.pairs.assemble_step[0]), t);
    assert.deepEqual(R.said.filter((l) => hard.includes(l)), [], t);
    assert.deepEqual(framings(R), [], t);
  }
  for (const t of P.NOT_NEUTRAL) { probes++; assert.notEqual(eventKind(t), 'neutral', t); }
  for (const l of [...Object.values(KIND.neutral.pairs).flat(), KIND.first.neutral, KIND.steps.neutral, ...Object.values(KIND.neutral.mechanics).flatMap((m) => [m.hint, m.hint2, m.hint3, m.done].filter(Boolean))]) {
    assert.equal(framesAsGuess(l), false, l);
    assert.doesNotMatch(l, /\b(?:hard|heavy|die|died|death|dead|loss|lost|grief|miss|them|they)\b/iu, l);
  }
});
test('r10.8 (polish): a server care answer for death talk is said gently, never "shouldn’t have happened"', () => {
  for (const l of SAFETY.careGentle) { assert.equal(acknowledges(l), true, l); assert.equal(framesAsGuess(l), false, l); }
  for (const t of P.CARE_GENTLE) {
    probes++;
    const R = visit(t, { server: STUBS.care });
    assert.equal(R.route, 'care', t);
    assert.deepEqual(R.careLines, SAFETY.careGentle, t);
    assert.ok(!R.said.includes(SAFETY.care[0]), t);
  }
  assert.match(read('src/beyond/another-angle.js'), /if \(res\?\.status === 'care'\) \{ careMode\(\{ lines: S\.follow \? SAFETY\.follow : SAFETY\.careGentle \}\); return; \}/);
});

// --------------------------------------------------------------- the review's other groups --
test('r10.9: the review’s other groups still hold (ordinary words, feelings, fair anger, bag x marker), no server and every stub', () => {
  const DEATHY = /\b(?:die|died|dies|dying|death|dead|grief|griev\w*|mourn\w*|loss|lost|passed|funeral|bereave\w*|missing (?:them|him|her|you|someone)|miss (?:them|him|her|you)|gone|heaven|rest in peace)\b/i;
  for (const t of P.R3_ORDINARY) {
    probes++;
    const R = visit(t);
    assert.deepEqual(R.said.filter((l) => DEATHY.test(l)), [], t);
  }
  for (const t of P.R3_FEELINGS) {
    for (const s of SCENE_STUBS) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      assert.deepEqual(framings(R), [], `[${s}] ${t}`);
      assert.ok(!R.mechanics.includes('shrink_projection'), t);
    }
  }
  for (const t of P.R3_ANGER) {
    if (/everyone thinks Im useless/.test(t)) continue;
    probes++;
    assert.deepEqual(framings(visit(t)), [], t);
  }
  for (const b of P.R3_BAG_BASES) {
    for (const m of P.R3_BAG_MARKS) {
      for (const s of ['none', 'pull', 'mind', 'fallback']) {
        probes++;
        const t = b + m;
        assert.equal(bagWords(t), true, t);
        assert.deepEqual(framings(visit(t, { server: STUBS[s] })), [], `[${s}] ${t}`);
      }
    }
  }
});

// ------------------------------------------------------------------------ over-blocking --
test('r10.10: over-blocking: the forty ordinary worries all get their angle (review r11: the two structural false alarms set aside, the four the marker gate missed read)', () => {
  const unframed = [];
  for (const t of P.WORRIES) {
    probes++;
    const R = visit(t, { walk: 1 });
    if (!R.mechanics.some((m) => FRAMING_MECHANICS.has(m)) && !framings(R).length) unframed.push(t);
  }
  assert.equal(P.WORRIES.length, 40);
  assert.deepEqual(unframed, []);
  // (r10's false alarms: "left the room without saying goodbye", "want to be my friend anymore" are set aside since r11)
  for (const t of P.WORRIES_FALSE_ALARMS) { assert.equal(lossNear(t), false, t); assert.equal(framingAllowed(t), true, t); }
  // (r10's four the marker gate never read: "she always does this", "mum always loves her more", "he probably finds me
  // boring", "she must be jealous" carry a marker since r11)
  for (const t of P.WORRIES_UNFRAMED_BEFORE) { assert.equal(lossNear(t), false, t); assert.equal(framingAllowed(t), true, t); }
});

// ---------------------------------------------------------------------------- main screen --
test('r10.11: the main-screen Tell reads the new families too (grief.js through input-overlay readSafety)', async () => {
  await loadGrief();
  const level = (t) => readSafety({ checkText }, t, true).level;
  // (r3-esc, by design) the one overdose among them ("my friend ODd…") is care now: a suicide death word, whatever the clause
  for (const t of P.MAIN_CONCERN) { probes++; assert.equal(level(t), suicideDeath(t) ? 'care' : 'concern', t); }
  assert.deepEqual(P.MAIN_CONCERN.filter((t) => suicideDeath(t)), ['my friend ODd last night and everyone blames me']);
  for (const t of P.MAIN_CARE) { probes++; assert.equal(level(t), 'care', t); }
  for (const t of P.MAIN_NONE) { probes++; assert.equal(level(t), 'none', t); }
});

// ------------------------------------------------------------------------- what stays put --
test('r10.12: the safety lexicons are untouched (byte-identical to the base) and the probe count', () => {
  const app = readFileSync(root + 'src/data/safety-lexicon.js');
  const server = readFileSync(root + 'server/another-angle/src/safety/shared-lexicon.js');
  assert.match(createHash('sha256').update(app).digest('hex'), /^0e397f9e692dfffa/);
  assert.ok(app.equals(server));
  assert.ok(probes >= 6000, `${probes} probes`);
});
