// Another Angle, review round 11: the round-4 semantic review's blocking items and polish, and the coordinator's decision
// for the main screen (a strong-cue loss backstop, backstop.js strongLoss, read by input-overlay readSafety). Every probe
// of the review is in tests/probes/r11.mjs verbatim; tests/probes/r10-replay.mjs replays each visit through the
// orchestrator's routing with no server and with every kind of server answer (the review's eleven stubs, care, crisis).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as P from './probes/r11.mjs';
import { visit, STUBS, ALL_SCENE_STUBS } from './probes/r10-replay.mjs';
import { deathTalk, deathEscalation } from '../src/beyond/grief.js';
import { bagWords, lossNear, strongLoss, ordinaryOnly, framingAllowed, framesAsGuess, FRAMING_MECHANICS } from '../src/beyond/backstop.js';
import { angerAnswer, candidatePatterns, eventKind, serverLinesKeep } from '../src/beyond/authored.js';
import { markerKinds } from '../src/beyond/markers.js';
import { SAFETY, KIND, WAITING, ANGER_PAIRS, AUTHORED_PAIRS, FEELING, MECHANIC_LINES } from '../src/beyond/lines.js';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

/** The round-4 review's framing detector (its detect.mjs FRAME, with its anger lines), beside the app's framesAsGuess. */
const FRAME = /\bis what happened\b|what happened is one thing|\[what happened\]|what your mind|mind (?:might be )?add|open question|\btest it\b|another explanation|one way to read|\bguess(?:es|ing)?\b|worst case|one possibility|what do you actually know|check one fact|what (?:it|this) (?:really )?means|might mean|could mean|stuck together|two different things|\[this time\]|\[other times\]|harsh (?:verdict|word)|between perfect|\[all bad\]|blown up|life size|you know for sure|still open|maybe they|didn[’']?t know what to say|other side to this|what else could be true|look a little closer|weight on one thought|one moment\b|not every moment|somewhere in between|the lesson|something to learn|\[your part\]|being angry about this|anger is pointing/i;
/** What a visit framed: a framing mechanic, a line said, or a label drawn that is not the person's own words. */
function framings(R) {
  const own = (l) => { const x = l.trim().replace(/…$/u, '').toLowerCase(); return x && R.text.toLowerCase().includes(x); };
  return [...R.mechanics.filter((m) => FRAMING_MECHANICS.has(m)).map((m) => `mechanic:${m}`),
    ...[...R.said, ...R.drawn.filter((l) => !own(l))].filter((l) => FRAME.test(l) || framesAsGuess(l))];
}
/** Anything playful: the playful waiting lines, the playful or transforming face, the squeeze quips, noPlay unset. */
const playful = (R) => [...R.said.filter((l) => WAITING.includes(l)), ...R.faces.filter((f) => f !== 'attentive'), ...(R.quips ? ['squeeze quips'] : []),
  ...(!R.noPlay && !['follow', 'care', 'crisis'].includes(R.route) ? ['noPlay=false'] : [])];
/** Anger: find_boundary, an anger line, or the anger look on a played scene (the review's anger()). */
const KIND_LINES = new Set([...Object.values(KIND.pairs).flat(), ...Object.values(KIND.first)]);
const ANGER_LINES = new Set([...Object.values(ANGER_PAIRS).flat(), ...AUTHORED_PAIRS.valid_anger, FEELING.first.angry, MECHANIC_LINES.find_boundary.hint, 'Being angry about this makes sense.', 'Your anger is pointing at something that matters.'].filter((l) => !KIND_LINES.has(l)));
const anger = (R) => [...(R.mechanics.includes('find_boundary') ? ['find_boundary'] : []), ...R.said.filter((l) => ANGER_LINES.has(l) || /being angry about this|anger is pointing|makes sense to be angry/i.test(l)),
  ...(R.look === 'pattern:valid_anger' && R.route === 'play' ? ['anger look'] : [])];
const ASSUMES = /shouldn[’']?t have happened/i;
let probes = 0;

/** A death phrasing on one stub: the gentle path (or care / crisis), nothing framed, nothing playful, no anger. */
function gentleEverywhere(t, stubs = ALL_SCENE_STUBS) {
  for (const s of stubs) {
    probes++;
    const R = visit(t, { server: STUBS[s] });
    const why = `[${s}] ${t} → ${R.route} ${R.mechanics.join(',')}`;
    assert.ok(['gentle', 'follow', 'care', 'crisis'].includes(R.route), why);
    assert.deepEqual(R.mechanics, [], why);
    assert.deepEqual(framings(R), [], why);
    assert.deepEqual(playful(R), [], why);
    assert.deepEqual(anger(R), [], why);
    assert.ok(R.requests <= 1, `${why} (${R.requests} requests)`);
  }
}

// ---------------------------------------------------------------------- blocking 1 and 2 --
test('r11.1: the review’s 14 phrasings outside every list, its quoted visits, and the kind-path ones: death talk, the gentle path on every stub, with and without each marker clause', () => {
  const all = [...new Set([...P.R4_MISS, ...P.R4_PLAYFUL, ...P.R4_KIND, ...P.R4_KIND_B2])];
  for (const p of all) {
    assert.ok(deathTalk(p), `deathTalk misses ${p}`);
    assert.equal(bagWords(p), true, p);
    for (const m of ['', ...P.R4_MARKERS]) {
      assert.equal(framingAllowed(p + m), false, p + m);
      gentleEverywhere(p + m);
    }
  }
  for (const t of P.R4_QUOTED) { assert.ok(deathTalk(t), t); gentleEverywhere(t); }
});

test('r11.2: the review’s DEATH set (95) on every stub, and x its six markers; batch 2 (43) x its two markers: never a game, never framed, never playful', () => {
  for (const t of P.R4_DEATH) {
    assert.ok(deathTalk(t) || deathEscalation(t) || checkText(t).level !== 'none', `not read: ${t}`);
    for (const m of ['', ...P.R4_MARKERS]) gentleEverywhere(t + m, m ? ['none', 'pull', 'fallback', 'mind', 'harsh', 'spectrum', 'catas', 'anger', 'angerLines'] : ALL_SCENE_STUBS);
  }
  assert.equal(P.R4_B2.length, 43);
  for (const t of P.R4_B2) {
    assert.ok(deathTalk(t), `deathTalk misses ${t}`);
    for (const m of ['', ...P.R4_B2_MARKERS]) gentleEverywhere(t + m, ['none', 'pull', 'grief', 'griefish', 'angerLines']);
  }
});

test('r11.3: a server care answer beside death talk or a bag word is SAFETY.careGentle, never “shouldn’t have happened” (startAngle and griefMode)', () => {
  for (const t of [...P.R4_MISS, ...P.R4_KIND, ...P.R4_KIND_B2, ...P.R4_DEATH, ...P.R4_B2]) {
    if (deathEscalation(t) || checkText(t).level !== 'none') continue;
    probes++;
    const R = visit(t, { server: STUBS.care });
    assert.equal(R.route, 'care', t);
    assert.deepEqual(R.careLines, SAFETY.careGentle, t);
    assert.ok(!R.said.some((l) => ASSUMES.test(l)), t);
  }
  // a bag word on the kind path (no death talk) too, and plain words keep SAFETY.care
  for (const t of ['I lost my keys and my boss thinks Im useless', 'the scan showed no problems and everyone thinks Im overreacting']) {
    probes++;
    assert.deepEqual(visit(t, { server: STUBS.care }).careLines, SAFETY.careGentle, t);
  }
  assert.deepEqual(visit('my boss always ignores me', { server: STUBS.care }).careLines, SAFETY.care);
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /if \(res\.status === 'care'\) \{ careMode\(\{ lines: serverCareLines\(\) \}\); return; \}/);
  assert.match(src, /return gentleRoute\(S\.text\) \|\| bagWords\(S\.text\) \? SAFETY\.careGentle : SAFETY\.care;/);
});

// --------------------------------------------------------------- blocking 3: the main screen --
test('r11.4: the main-screen Tell: the review’s 27 misses and every family the coordinator named are concern / loss; ordinary Tells stay none', async () => {
  await loadGrief();
  const main = (t) => readSafety({ checkText }, t, true);
  assert.equal(new Set(P.R4_MAIN_27).size, 27);
  for (const t of [...P.R4_MAIN_27, ...P.MAIN_FAMILIES]) {
    probes++;
    assert.deepEqual([main(t).level, main(t).category], ['concern', 'loss'], t);
  }
  for (const t of P.MAIN_NONE_R4) { probes++; assert.equal(main(t).level, 'none', t); }
  assert.equal(P.MAIN_ORDINARY_50.length, 50);
  const alarms = P.MAIN_ORDINARY_50.filter((t) => main(t).category === 'loss');
  assert.deepEqual(alarms, P.MAIN_ORDINARY_FALSE_ALARMS);
  probes += 50;
  // the review's escalation sets on the main screen: care for every positive, concern (never care, never none) for every negative
  for (const t of P.R4_ESC_POS) { probes++; assert.ok(['care', 'crisis'].includes(main(t).level), t); }
  for (const t of P.R4_ESC_NEG) { probes++; assert.equal(main(t).level, 'concern', t); }
});

test('r11.5: strongLoss (the main screen’s backstop): a person beside a strong cue, never the weak cues or their idioms; Another Angle reads it too', () => {
  for (const t of P.STRONG_POS) { probes++; assert.equal(strongLoss(t), true, t); assert.equal(bagWords(t), true, t); }
  for (const t of P.STRONG_NEG) { probes++; assert.equal(strongLoss(t), false, t); }
  // the weak cues alone, beside a person
  for (const cue of ['went', 'left', 'gone', 'goodbye', 'without', 'anymore', 'found', 'sitting', 'rest', 'last time', 'birthday']) {
    probes++;
    assert.equal(strongLoss(`my nan ${cue} xx`), false, `nan + ${cue}`);
  }
  // the coordinator's strong cues, each beside a person
  for (const t of ['covid took my grandad from us', 'the virus got my nan', 'my nan had no heartbeat', 'my nan was unresponsive', 'my nan succumbed', 'my nan departed',
    'my nan was buried', 'my nans ashes', 'my nans urn', 'my nan is an angel now', 'my nan is in heaven', 'my nan was laid to rest', 'my nan is in the ground',
    'shiva for my nan', 'my nan never came home', 'my nan never woke', 'they couldnt save my nan', 'it would have been my nans 90th']) {
    probes++;
    assert.equal(strongLoss(t), true, t);
  }
  // no person needed for a heartbeat lost at a scan
  for (const t of ['there was no heartbeat on the screen', 'the scan showed no heartbeat']) assert.equal(strongLoss(t), true, t);
});

// ---------------------------------------------------- fair anger beside a death or a bag word --
test('r11.6: fair anger beside a bag word or death talk: never find_boundary, an anger line or the anger look (polish 1), on any stub', () => {
  for (const t of P.R4_ANGER_LOOK) {
    assert.equal(angerAnswer(t), false, t);
    assert.notEqual(candidatePatterns(t)[0], 'valid_anger', t);
    for (const s of ALL_SCENE_STUBS) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      assert.notEqual(R.look, 'pattern:valid_anger', `[${s}] ${t}`);
      assert.deepEqual(anger(R), [], `[${s}] ${t}`);
      assert.deepEqual(framings(R), [], `[${s}] ${t}`);
    }
  }
  assert.equal(visit('my friend ODd last night and everyone blames me', { server: STUBS.anger }).route, 'gentle');
  // fair anger with no bag word still looks like anger
  assert.equal(candidatePatterns('My boss embarrassed me in front of everyone')[0], 'valid_anger');
});

// ---------------------------------------------------------------------------- escalation --
test('r11.7: escalation: the review’s 32 positives are care with nothing sent (the exotic one too); its 32 negatives never care', () => {
  for (const t of [...P.R4_ESC_POS, ...P.R4_ESC_EXOTIC]) {
    for (const s of ['none', 'pull', 'grief', 'fallback', 'care']) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      assert.ok(['follow', 'care', 'crisis'].includes(R.route), `[${s}] ${t} → ${R.route} (esc=${deathEscalation(t)}, lexicon=${checkText(t).level})`);
      assert.equal(R.requests, 0, t);
    }
  }
  assert.equal(deathEscalation('my mum died and I want to lie down next to her forever'), true);
  for (const t of P.R4_ESC_NEG) {
    for (const s of ['none', 'pull', 'grief']) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      assert.ok(!['follow', 'care'].includes(R.route), `[${s}] ${t} → ${R.route}`);
      assert.deepEqual(framings(R).filter((l) => !(s === 'grief' && R.scenes.some((x) => x.subtitle_line_1 === l || x.subtitle_line_2 === l))), [], `[${s}] ${t}`);
      assert.deepEqual(playful(R), [], `[${s}] ${t}`);
    }
  }
});

// ------------------------------------------------------------------- blocking 4: over-blocking --
/** The review's criterion: the framing allowed, a played scene that is not a feeling's, a framing (or label) mechanic. */
const angled = (t) => {
  const R = visit(t, { walk: 4 });
  return framingAllowed(t) && R.route === 'play' && R.scenes.some((s) => !s.feeling) && R.mechanics.some((m) => FRAMING_MECHANICS.has(m) || ['soften_harshness', 'separate_one', 'return_responsibility'].includes(m));
};
test('r11.8: over-blocking: the review’s forty worries and the builder’s forty get their angle (both at least 75%; the one lost is the lexicon’s crisis)', async () => {
  const { WORRIES } = await import('./probes/r10.mjs');
  const lost = P.R4_WORRIES.filter((t) => { probes++; return !angled(t); });
  assert.deepEqual(lost, Object.keys(P.R4_WORRIES_NOT_ANGLED));
  assert.ok(P.R4_WORRIES.length - lost.length >= 30, `${P.R4_WORRIES.length - lost.length}/40`);
  assert.equal(checkText(P.R4_WORRIES_CRISIS[0]).level, 'crisis');
  const lostB = WORRIES.filter((t) => { probes++; return !angled(t); });
  assert.deepEqual(lostB, []);
  for (const t of P.R4_WORRIES_LOST_R10) { assert.equal(lossNear(t), false, t); assert.equal(bagWords(t), false, t); assert.equal(framingAllowed(t), true, t); }
  for (const t of P.R4_WORRIES_NO_MARKER) assert.ok(markerKinds(t).size > 0, t);
});

// ------------------------------------------------------------------------------ polish --
test('r11.9 (polish): the review’s ordinary probes: never the gentle path, never a death, grief or missing line, never loss on the main screen; grief lines tagged ordinary never play', async () => {
  await loadGrief();
  const NAMED = /\b(?:die|died|death|dead|grief|griev\w*|mourn\w*|loss|lost|passed|funeral|missing|miss (?:them|him|her)|gone|heaven)\b/i;
  for (const t of P.R4_ORDINARY) {
    assert.equal(readSafety({ checkText }, t, true).category === 'loss', false, t);
    for (const s of ['none', 'pull', 'fallback', 'mind', 'anger', 'harsh', 'griefish', 'grief']) {
      probes++;
      const R = visit(t, { server: STUBS[s] });
      if (s === 'none') assert.notEqual(R.route, 'gentle', t);
      if (s === 'grief' && R.route === 'gentle') continue;
      const own = R.said.filter((l) => NAMED.test(l));
      assert.deepEqual(own, [], `[${s}] ${t}`);
    }
  }
  for (const t of P.R4_GENTLE_FALSE_ALARMS) {
    probes++;
    assert.equal(deathTalk(t), null, t);
    assert.notEqual(visit(t).route, 'gentle', t);
    assert.equal(readSafety({ checkText }, t, true).level, 'none', t);
    assert.deepEqual(framings(visit(t)), [], t);
  }
  // the OD family's noun guard: odd shoes, odd socks, an odd one (never an overdose)
  for (const t of ['my mum had odd shoes on today', 'my brother had odd socks on', 'my friend is odd', 'he had odd ideas']) assert.equal(deathTalk(t), null, t);
  for (const t of ['my friend ODd last night', 'my friend od’d at a party', 'my cousin OD’ed', 'my friend od d']) assert.ok(deathTalk(t), t);
  for (const t of P.R4_GRIEFISH) {
    const R = visit(t, { server: STUBS.griefish });
    assert.ok(!R.said.some((l) => /Missing them|Grief isn/i.test(l)), t);
    assert.equal(serverLinesKeep({ source: 'server', reasoning_pattern: 'rumination', subtitle_line_1: 'Missing them this much makes sense.', subtitle_line_2: 'Grief isn’t a thought to fix.' }, t), false, t);
  }
  // devices and good news (r10 polish, still): neutral, never death talk
  for (const t of ['the batterys dead', 'my headphones are dead']) assert.equal(deathTalk(t), null, t);
  for (const t of ['I passed my driving test!', 'passed my theory test first time', 'my plant died']) { assert.equal(ordinaryOnly(t), true, t); assert.equal(eventKind(t), 'neutral', t); }
});

test('r11.10: the review’s FEELINGS (30) and fair ANGER (21) are never framed as a guess, on every stub', () => {
  for (const t of P.R4_FEELINGS) for (const s of ['none', 'pull', 'fallback', 'mind', 'harsh', 'spectrum', 'catas']) {
    probes++;
    const R = visit(t, { server: STUBS[s] });
    assert.deepEqual(framings(R).filter((l) => !/being angry about this|anger is pointing/i.test(l)), [], `[${s}] ${t}`);
    assert.ok(!R.mechanics.includes('shrink_projection'), `[${s}] ${t}`);
  }
  for (const t of P.R4_ANGER) for (const s of ['none', 'pull', 'fallback', 'mind', 'harsh', 'spectrum', 'catas']) {
    probes++;
    const R = visit(t, { server: STUBS[s] });
    assert.deepEqual(framings(R).filter((l) => !/being angry about this|anger is pointing/i.test(l)), [], `[${s}] ${t}`);
  }
});

test('r11.11: the probe count', () => {
  assert.ok(probes >= 9500, `${probes} probes`);
});
