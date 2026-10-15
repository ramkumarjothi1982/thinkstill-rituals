// The owner's decision 'Ask before every world' (14 Oct 2026), Another Angle and detection.
//
// A fresh reviewer showed word lists keep missing ways to say that someone died, so the person chooses: after every Tell,
// before anything is sent or played, Zuzu asks "Shall we look at this from another angle, or just be with it?"
// (src/beyond/angle-first.js, its switch ASK_BEFORE_ANGLE; lines.js ANGLE_CHOICE). Detected losses still go straight to the
// gentle path; crisis, care and the wish to follow someone who died route to support first. The question replaces the 'Ask
// when unsure' check-in in Another Angle (never two questions in a row).
//
// The two reviews of 'Ask when unsure' are read here verbatim (tests/probes/r13.mjs), each phrasing with its route under the
// new design on both screens, beside this unit's pins for the families that over-fired (item 3), the escalation gap (item 4),
// the recall the reviews named (item 5) and the polish (item 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import * as GR from '../src/beyond/grief.js';
import { lossRoute, unsureLoss, FRAMING_MECHANICS, framesAsGuess, acknowledges } from '../src/beyond/backstop.js';
import { angerUnsaid, angerAnswer, framesScene } from '../src/beyond/authored.js';
import { ASK_BEFORE_ANGLE, firstStep, answerKey } from '../src/beyond/angle-first.js';
import { ANGLE_CHOICE, LOSS_CHECK, GRIEF, WAITING, BE_WITH } from '../src/beyond/lines.js';
import { visit, STUBS, ALL_SCENE_STUBS } from './probes/r10-replay.mjs';
import * as P from './probes/r13.mjs';

await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };

/** The main screen's route (input-overlay readSafety, lossAware, grief loaded): what unit S's afterTell reads. */
function main(t, emotion = null) {
  const r = readSafety({ checkText }, t, true, { emotion });
  if (r.level === 'crisis' || r.level === 'care') return 'care';
  // (distress the lexicon reads as concern: the main screen's support beat)
  if (r.level === 'concern') return r.category === 'loss' ? 'gentle' : 'care';
  return r.unsure ? 'question' : 'ordinary';
}
/** Another Angle's route (afterTell → startAngle → angle-first.js firstStep): the safety check and an escalation first. */
function angle(t, emotion = null) {
  const c = checkText(t);
  // (r3-esc) a suicide named is care too, whatever the clause (another-angle.js afterTell suicideDeath)
  if (c.level === 'crisis' || c.level === 'care' || GR.deathEscalation(t) || GR.suicideDeath(t)) return 'care';
  const step = firstStep(t, { emotion });
  if (step === 'gentle') return 'gentle';
  assert.equal(step, 'choice', `${t}: every other Tell is asked first`);
  return lossRoute(t, { emotion }) === 'ask' ? 'question' : 'ordinary';
}
/** (r3-esc) The reviews' phrasings that name a suicide, gentle until final round 3: care by design now (grief.js suicideDeath). */
const R3_SUICIDE_CARE = new Set(["my mate's brother topped himself", 'my cousin offed himself last year']);
const GROUPS = ['SEM_B1_COMMON', 'SEM_B1_EXOTIC', 'SEM_B2_REGRESSIONS', 'SEM_B3_RESEND', 'SEM_B4_ORDINARY', 'SEM_B5_WORRIES', 'SEM_POLISH', 'SEM_PROVEN', 'UI_B1', 'UI_EVERYDAY', 'UI_AT_PEACE', 'UI_LEXICON', 'UI_PROVEN'];
const framed = (R) => R.scenes.some((s) => !s.grief && (FRAMING_MECHANICS.has(s.mechanic) || framesScene(s)));

// ------------------------------------------------------------------------- the reviews, verbatim --
test('probe table: every phrasing of both reviews takes its route under the new design, on both screens', () => {
  const counts = {};
  for (const g of GROUPS) {
    const c = (counts[g] = { gentle: 0, question: 0, ordinary: 0, care: 0 });
    for (const [t, want] of P[g]) {
      // (r3-esc, by design) a suicide named is care on both screens, whatever the clause: these two were gentle
      const [wm, wa] = R3_SUICIDE_CARE.has(t) ? ['care', 'care'] : Array.isArray(want) ? want : [want, want];
      const got = [main(t), angle(t)];
      // (the lexicon's own reading may only ever move these to care: the owner's lexicon pass)
      if (g === 'UI_LEXICON') { assert.ok(got.every((r, i) => r === [wm, wa][i] || r === 'care'), `${t}: ${got}`); assert.ok(!got.includes('gentle'), t); }
      else assert.deepEqual(got, [wm, wa], t);
      c[got[1]]++;
    }
  }
  console.log('askall-angle probe counts (Another Angle route):', JSON.stringify(counts));
  // (the reviews' totals: 16 + 25 common and exotic deaths, 24 regressions, 19 ordinary, 7 worries, 10 + 11 browser)
  assert.deepEqual(GROUPS.map((g) => P[g].length), [16, 25, 24, 1, 19, 7, 5, 6, 11, 11, 1, 3, 11]);
});

test('no reviewer death phrasing is ever played without the person choosing it: gentle, the question, or care', () => {
  for (const g of ['SEM_B1_COMMON', 'SEM_B1_EXOTIC', 'UI_B1']) {
    for (const [t] of P[g]) {
      for (const s of ['none', 'pull', 'mind', 'fallback', 'catas']) {
        // (no answer: nothing is sent, made or played)
        const quiet = visit(t, { server: STUBS[s] || null, answer: null });
        assert.ok(quiet.route === 'gentle' || quiet.route === 'quiet' || quiet.route === 'care', `${t} @${s}: ${quiet.route}`);
        if (quiet.route === 'quiet') assert.deepEqual([quiet.requests, quiet.scenes.length, quiet.mechanics.length, quiet.question], [0, 0, 0, 'choice'], `${t} @${s}`);
        // "Just be with it": its own quiet path (r2-angle item 5), nothing sent, no mechanic, never framed
        const be = visit(t, { server: STUBS[s] || null, answer: 'be' });
        assert.equal(be.route, be.asked ? 'be' : R3_SUICIDE_CARE.has(t) ? 'care' : 'gentle', `${t} @${s}`);
        assert.ok(be.mechanics.length === 0 && !framed(be), `${t} @${s}`);
        if (be.asked) assert.equal(be.requests, 0, `${t} @${s}: nothing sent`);
      }
    }
  }
});

// ------------------------------------------------------------------------------ item 3: the families --
test('item 3: each over-firing family, pinned in pairs: the loss stays gentle, the ordinary words never reach the gentle path', () => {
  for (const [family, pairs] of Object.entries(P.FAMILY_PAIRS)) {
    for (const [loss, ordinary] of pairs) {
      assert.deepEqual([main(loss), angle(loss)], ['gentle', 'gentle'], `${family}: ${loss}`);
      assert.ok(GR.deathTalk(loss), `${family}: ${loss}`);
      assert.equal(GR.deathTalk(ordinary), null, `${family}: ${ordinary}`);
      for (const r of [main(ordinary), angle(ordinary)]) assert.ok(r === 'question' || r === 'ordinary', `${family}: ${ordinary} → ${r}`);
    }
  }
  // the review's worry keeps its angle: the one question, and with it switched off it plays (never gentle; beside the cue
  // "never came" its angle is a kind one, as on base 3017cf4)
  const worry = 'my dad never came to my game, he must not care about me';
  assert.equal(lossRoute(worry), null);
  assert.equal(firstStep(worry), 'choice');
  assert.equal(firstStep(worry, { ask: false }), 'play');
  assert.equal(visit(worry, { answer: 'angle', walk: 1 }).route, 'play');
});

// ------------------------------------------------------------------------- item 4: the safety gap --
test('item 4: doing what the one who died did, or joining them, is care (escalation) on both screens, with nothing sent', () => {
  for (const t of P.ESCALATION_POS) {
    assert.equal(GR.deathEscalation(t), true, t);
    assert.deepEqual([main(t), angle(t)], ['care', 'care'], t);
    const R = visit(t, { server: STUBS.pull });
    assert.ok(['follow', 'crisis', 'care'].includes(R.route) && R.requests === 0 && !R.asked, `${t}: ${R.route}`);
  }
  for (const t of P.ESCALATION_NEG) {
    assert.equal(GR.deathEscalation(t), false, t);
    assert.notEqual(main(t), 'care', t);
    assert.notEqual(angle(t), 'care', t);
  }
  // the review's own phrasing, and the pair the owner named
  assert.equal(main('my best friend killed himself and I keep thinking about doing the same'), 'care');
  assert.equal(main('my dad died and I want to do the same course he did'), 'gentle');
  // the reading's shape the main screen relies on: care / death-follow, as every escalation (r3-esc: its own category, so the
  // Hushfold offers no world beside it; it was 'unsafe')
  assert.deepEqual(readSafety({ checkText }, 'my brother died and I might join him', true), { level: 'care', category: 'death-follow', matched: null });
});

// ------------------------------------------------------------------------------ item 5: recall --
test('item 5: memorial, coroner, late <relation> (possessive too), nothing more they could do, put down, topped / offed, <ref>s time came: gentle with no question', () => {
  for (const t of P.RECALL_GENTLE) {
    // (r3-esc, by design) "topped himself", "offed himself" name a suicide: care on both screens now, never the gentle path
    assert.deepEqual([main(t), angle(t)], R3_SUICIDE_CARE.has(t) ? ['care', 'care'] : ['gentle', 'gentle'], t);
    assert.equal(firstStep(t), 'gentle', t);
  }
  for (const t of P.RECALL_NOT) assert.notEqual(lossRoute(t), 'gentle', t);
  // put down only with a pet word (or the vet): "my old girl" falls to the question
  assert.equal(lossRoute('my old girl had to be put down this morning'), null);
});

// ------------------------------------------------------------------------------ item 6: polish --
test('item 6: "my uncle\'s brown bread", "I\'ve never felt so stupid", and no waiting line before the choice', () => {
  for (const t of ["my uncle's brown bread", "my uncle's brown bread, mate", 'my uncles brown bread', 'my uncle is brown bread']) assert.equal(lossRoute(t), 'gentle', t);
  for (const t of ['I had brown bread for lunch', "my nan's brown bread is the best", "I love my mum's brown bread recipe"]) assert.notEqual(lossRoute(t), 'gentle', t);
  const stupid = 'my boss shouted at me in front of everyone and I\'ve never felt so stupid';
  assert.equal(angerUnsaid(stupid), true);
  assert.equal(angerAnswer(stupid), false);
  for (const t of ['my boss shouted at me in front of everyone and I have never felt more embarrassed', 'my teacher laughed at me and Ive never felt so small']) assert.equal(angerUnsaid(t), true, t);
  // "There's another side to this…" (a framing) is a waiting line only once they chose an angle: never before the choice
  assert.equal(framesAsGuess(WAITING[0]), true);
  const aa = read('src/beyond/another-angle.js');
  const start = between(aa, 'async function startAngle(', 'const FIRST_QUESTION = {');
  assert.ok(start.indexOf('await askFirst(step)') < start.indexOf('waitingLines(seq)'));
  const ask = between(aa, 'const FIRST_QUESTION = {', 'async function waitingLines(');
  assert.doesNotMatch(ask, /WAITING|waitingLines|say\(/);
  // …and unsure words keep Zuzu's attentive waiting lines after "Another angle"
  assert.match(between(aa, 'async function waitingLines(', 'async function playScene('), /if \(S\.unsure\) feel \|\|= \{ kind: 'low' \};/);
  const R = visit('we had to let our dog go, I think it was my fault', { answer: 'angle' });
  assert.ok(!R.said.some((l) => WAITING.includes(l)), R.said.join(' | '));
});

// ------------------------------------------------------------------- item 7: what the main screen reads --
test('item 7: readSafety and lossRoute keep their outputs and shapes (lossRoute gentle / ask / null; readSafety level / category / unsure)', () => {
  const all = GROUPS.flatMap((g) => P[g].map(([t]) => t));
  for (const t of [...all, ...P.RECALL_GENTLE, ...P.RECALL_NOT, ...P.ESCALATION_POS, ...P.ESCALATION_NEG]) {
    assert.ok(['gentle', 'ask', null].includes(lossRoute(t)), t);
    const r = readSafety({ checkText }, t, true);
    assert.ok(['none', 'concern', 'care', 'crisis'].includes(r.level), t);
    assert.ok('category' in r, t);
    if (r.unsure) assert.deepEqual([r.level, lossRoute(t)], ['none', 'ask'], t);
    if (r.level === 'concern' && r.category === 'loss') assert.equal(lossRoute(t), 'gentle', t);
  }
  assert.deepEqual(readSafety({ checkText }, 'my mum died last week', true), { level: 'concern', category: 'loss', matched: null });
  assert.equal(readSafety({ checkText }, 'we had to let our dog go', true).unsure, true);
  assert.equal(GR.lossRoute, lossRoute);
  assert.equal(GR.unsureLoss, unsureLoss);
});

// ------------------------------------------------------------------ item 1: the question itself --
test('item 1: the question’s words, its two chips (Another angle first), about 45 s (r2-angle item 6), the brand rules', () => {
  assert.equal(ASK_BEFORE_ANGLE, true, 'the owner’s switch is on');
  assert.equal(ANGLE_CHOICE.ask, 'Shall we look at this from another angle, or just be with it?');
  assert.deepEqual([ANGLE_CHOICE.angle, ANGLE_CHOICE.be, ANGLE_CHOICE.ms], ['Another angle', 'Just be with it', 45000]);
  for (const l of [ANGLE_CHOICE.ask, ANGLE_CHOICE.angle, ANGLE_CHOICE.be]) { assert.doesNotMatch(l, /\bAI\b|reframe|died|death|dead|loss|losing/i, l); assert.ok(l.length <= 64, l); }
  // "Just be with it": the gentle pair, which never assumes a death and frames nothing
  for (const l of GRIEF.loss) { assert.equal(acknowledges(l), true, l); assert.doesNotMatch(l, /\b(?:died|death|dead|loss|lost|miss|grief|them)\b/i, l); }
  assert.deepEqual([...GRIEF.loss], ['That sounds like a lot to carry.', 'There’s nothing to fix here. We can just be with it.']);
});

test('item 1: firstStep — a detected loss is gentle with no question; every other Tell is asked first; the switch off brings back the check-in', () => {
  // detected losses and a grief-family feeling: no question
  for (const t of ['my mum died last week', 'my nan has dementia', 'a drunk driver took my brother from us']) assert.equal(firstStep(t), 'gentle', t);
  for (const e of P.SEM_GRIEF_CHIP.gentle) assert.equal(firstStep(P.SEM_GRIEF_CHIP.text, { emotion: e }), 'gentle', e);
  for (const e of P.SEM_GRIEF_CHIP.not) assert.equal(firstStep(P.SEM_GRIEF_CHIP.text, { emotion: e }), 'choice', e);
  // ordinary words and unsure words alike: the one choice (never the check-in too)
  for (const t of ['I am worried about my exam tomorrow', 'we had to let our dog go', 'my dad never came to my football match']) assert.equal(firstStep(t), 'choice', t);
  // "Show me another angle" inside an angle they chose: no question again; (r2-angle item 2) "Another angle" is never remembered,
  // so a new Tell of the same words is asked again
  assert.equal(firstStep('I am worried about my exam tomorrow', { another: true }), 'play');
  assert.equal(firstStep('I am worried about my exam tomorrow', { said: 'angle' }), 'choice');
  // (r2-angle item 7) "Just be with it" remembered is asked again (BE_ASKS_AGAIN, as on the main screen); with that switch off,
  // its quiet path again; the check-in's "Yes, it is" keeps them on the gentle path
  assert.equal(firstStep('we had to let our dog go', { said: 'be' }), 'choice');
  assert.equal(firstStep('we had to let our dog go', { said: 'be', beAgain: false }), 'be');
  assert.equal(firstStep('we had to let our dog go', { said: 'yes', ask: false }), 'told');
  assert.equal(firstStep('we had to let our dog go', { said: 'yes' }), 'told');
  // the switch off: the 'Ask when unsure' check-in for unsure words only, everything else plays as before
  assert.equal(firstStep('we had to let our dog go', { ask: false }), 'check-in');
  assert.equal(firstStep('I am worried about my exam tomorrow', { ask: false }), 'play');
  assert.equal(firstStep('we had to let our dog go', { ask: false, said: 'else' }), 'check-in');
  // the words an answer is kept for: case, apostrophes, punctuation and spacing aside
  assert.equal(answerKey("We had to let our dog go, I think it was my fault."), answerKey('we had to let our dog go I think it was my fault'));
  assert.equal(answerKey('My dad’s gone'), answerKey("my dads gone"));
  assert.notEqual(answerKey('we had to let our dog go'), answerKey('we had to let our cat go'));
});

test('item 1: in Another Angle the question comes before anything is sent, made or played; "Just be with it" sends nothing; crisis, care and an escalation come first', () => {
  const aa = read('src/beyond/another-angle.js');
  assert.match(aa, /import \{ firstStep, answerKey, questionClock, goodbye \} from '\.\/angle-first\.js';/);
  const after = between(aa, 'async function afterTell(', 'function firstLook(');
  for (const first of ["if (S.level === 'crisis') { crisisMode(); return; }", "if (S.level === 'care') { careMode(); return; }", 'if (deathEscalation(S.text)) { noteFollow();']) assert.ok(after.indexOf(first) >= 0 && after.indexOf(first) < after.indexOf('startAngle('), first);
  const start = between(aa, 'async function startAngle(', 'const FIRST_QUESTION = {');
  const asks = start.indexOf('await askFirst(step)');
  assert.ok(start.indexOf("if (route === 'gentle') return griefMode();") < asks, 'a detected loss never asks');
  for (const later of ['spawnThought()', 'client.angle(', 'waitingLines(', 'playScene(', "setEmotion({ curious: 0.65, playful: 0.35 }"]) assert.ok(asks < start.indexOf(later), later);
  assert.match(start, /const step = firstStep\(S\.text, \{ emotion: S\.emotion, another, said: S\.answers\.get\(key\) \|\| null \}\);/);
  // (r2-angle item 5) "Just be with it" is its own quiet path (beWithIt: nothing sent); the check-in's yes is the gentle path;
  // (item 2) only those gentle answers are remembered, never "Another angle"
  assert.match(start, /if \(step === 'be'\) return beWithIt\(\);\s*if \(step === 'told'\) return griefMode\(\{ told: 'loss' \}\);/);
  assert.match(start, /if \(v === 'be'\) \{ S\.answers\.set\(key, 'be'\); return beWithIt\(\); \}/);
  assert.match(start, /if \(v === 'yes'\) \{ S\.answers\.set\(key, 'yes'\); S\.lossSaid = true; S\.noPlay = true; return griefMode\(\{ told: 'loss' \}\); \}/);
  assert.equal((start.match(/S\.answers\.set\(/g) || []).length, 2, 'only the gentle answers are kept');
  const be = between(aa, 'async function beWithIt(', 'async function unclear(');
  assert.doesNotMatch(be, /client\.|spawnThought|playScene|S\.grief = true|S\.keepSupport = true|griefMode\(/);
  const grief = between(aa, 'async function griefMode(', 'const heavySeen = ');
  // (final round 5, structural: the gentle path never sends, whatever the words; it was "asked: no request" before)
  assert.doesNotMatch(grief, /client\.|serverMode\(\)/, 'the gentle path sends nothing');
  const q = between(aa, 'const FIRST_QUESTION = {', 'async function waitingLines(');
  // (r2-angle item 7, a coordinator default) equal weight: the same chip style, "Another angle" first
  // (fix round, the safety floor) a third answer of the same weight, "I'm not okay" (the check-in's "Not really": careLite)
  assert.match(q, /choice: \{ ask: ANGLE_CHOICE\.ask, ms: ANGLE_CHOICE\.ms, options: \[\{ label: ANGLE_CHOICE\.angle, value: 'angle' \}, \{ label: ANGLE_CHOICE\.be, value: 'be' \}, \{ label: ANGLE_CHOICE\.notOkay, value: 'notreally' \}\] \}/);
  // (fix round, the safety floor) the Support pill is in the dock while the question is up (dockShow asking)
  assert.match(q, /S\.phase = 'asking';[\s\S]*?careFace\(\);\s*(?:\/\/[^\n]*\n\s*)*dockShow\(\{ asking: true \}\);\s*layer\.lossCheck = app\.pushLayer\?\.\(\) \|\| 0;/);
  assert.doesNotMatch(q, /client\.|spawnThought|playScene|setStage\('playful'\)/);
  // no squeeze quips while it asks, no reload, Back lets it go
  assert.match(aa, /if \(\['arrive', 'invite', 'squeeze', 'end'\]\.includes\(S\.phase\)/);
  assert.match(aa, /'typing', 'asking'\]\.includes\(S\.phase\)/);
});

test('item 2 (r2-angle item 2): after any answer the Tell opens empty, after an angle too; the words are kept only when the question was let go', () => {
  const aa = read('src/beyond/another-angle.js');
  const open = between(aa, 'function openTellNow() {', 'let draftT = 0;');
  assert.match(open, /const prefill = S\.keepWords \? S\.text : '';/);
  assert.match(open, /hasPlan: true, text: prefill,/);
  assert.match(open, /if \(prefill\) readDraft\(prefill\);/);
  assert.doesNotMatch(aa, /lastGentle/);
  // a new Tell clears it; the question sets it while it is up; any answer clears it again
  assert.match(between(aa, 'async function afterTell(', 'function firstLook('), /S\.keepWords = false;/);
  assert.match(between(aa, 'async function askFirst(', 'let stopClock = null;'), /S\.keepWords = true;/);
  const start = between(aa, 'async function startAngle(', 'const FIRST_QUESTION = {');
  assert.ok(start.indexOf('if (v) S.keepWords = false;') > start.indexOf('await askFirst(step)'));
});

// ---------------------------------------------------------------------------- the replay --
test('replay: the question before any request; Another angle → a mechanic; Just be with it → gentle, nothing sent; no answer → quiet', () => {
  for (const t of ['I am worried about my exam tomorrow', 'my boss always ignores me', 'my dad never came to my football match', 'we had to let our dog go']) {
    for (const s of ALL_SCENE_STUBS) {
      const server = STUBS[s] || null;
      const angleR = visit(t, { server, answer: 'angle', walk: 1 });
      assert.deepEqual([angleR.asked, angleR.question, angleR.requestsBeforeAnswer], [true, 'choice', 0], `${t} @${s}`);
      assert.ok(['play', 'nomore', 'gentle'].includes(angleR.route), `${t} @${s}: ${angleR.route}`);
      const be = visit(t, { server, answer: 'be' });
      assert.deepEqual([be.route, be.requests, be.mechanics.length, be.scenes.length, be.grief], ['be', 0, 0, 0, false], `${t} @${s}`);
      assert.deepEqual(be.said.slice(-4), [BE_WITH.line, BE_WITH.second, BE_WITH.ask, BE_WITH.squeeze], `${t} @${s}`);
      const quiet = visit(t, { server, answer: null });
      assert.deepEqual([quiet.route, quiet.requests, quiet.scenes.length], ['quiet', 0, 0], `${t} @${s}`);
    }
  }
  // offline, "Another angle" plays a mechanic for a worry
  const play = visit('I am worried about my exam tomorrow', { answer: 'angle', walk: 1 });
  assert.equal(play.route, 'play');
  assert.equal(play.mechanics.length, 1);
});

test('replay: resend — after "Just be with it" the same words are asked again (r2-angle item 7); after the check-in’s yes they go gently, nothing sent', () => {
  for (const [t] of P.SEM_B3_RESEND) {
    for (const s of ALL_SCENE_STUBS) {
      // (asked again, before anything is sent; "Just be with it" again is its quiet path, nothing sent)
      const again = visit(t, { server: STUBS[s] || null, said: 'be', answer: 'be' });
      assert.deepEqual([again.route, again.asked, again.requestsBeforeAnswer, again.requests, again.mechanics.length], ['be', true, 0, 0, 0], `${t} @${s}`);
      assert.ok(!framed(again), `${t} @${s}`);
      // (the switch off: the check-in's yes, remembered; its lines may come from the server, never its mechanic)
      const told = visit(t, { server: STUBS[s] || null, said: 'yes', asks: false });
      assert.deepEqual([told.route, told.asked, told.mechanics.length], ['gentle', false, 0], `${t} @${s}`);
    }
    // the reviewer's visit: let our dog go → "Yes" → resend: never return_responsibility, never "on one thought" (r2-angle: the
    // check-in's yes is the remembered loss; after "Just be with it" the resend is asked again, above, and plays only if chosen)
    const R = visit(t, { said: 'yes' });
    assert.ok(!R.said.some((l) => /Lots of things shape|one part of it|on one thought/.test(l)), R.said.join(' | '));
  }
});

test('replay: a detected death is gentle with no question; an escalation is care with no request; the review’s ordinary football match is asked, never gentle', () => {
  for (const s of ALL_SCENE_STUBS) {
    const server = STUBS[s] || null;
    const death = visit('my mum died last week', { server });
    assert.deepEqual([death.route, death.asked], ['gentle', false], s);
    const esc = visit('my best friend killed himself and I keep thinking about doing the same', { server });
    assert.deepEqual([esc.route, esc.requests, esc.asked], ['follow', 0, false], s);
    const match = visit('my dad never came to my football match', { server, answer: null });
    assert.deepEqual([match.route, match.question], ['quiet', 'choice'], s);
  }
});
