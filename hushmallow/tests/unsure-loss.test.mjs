// The owner's decision 'Ask when unsure' (14 Oct 2026), and the round-5 semantic review's fixes (review round 12).
//
// Five semantic reviews kept finding new ways to say that someone died, so when the app is not sure it ASKS: a person, a
// pet or a pregnancy beside a softer loss cue that nothing else reads as a loss (backstop.js unsureLoss) gets "Is this
// about losing someone?" on both screens, before any Thought Mallow, world, framing or request. A grief-family feeling
// chosen always counts as a loss. Crisis, care and a wish to follow the one who died always come first.
//
// Every probe of the round-5 review (tests/probes/r12.mjs, verbatim) is read here with its expected route on both
// screens (gentle / check-in / care / ordinary), and the measurements the owner asked for are pinned.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import * as GR from '../src/beyond/grief.js';
import { unsureLoss, lossRoute, griefFeeling, GRIEF_FEELINGS, strongLoss, bagWords, framingAllowed, FRAMING_MECHANICS } from '../src/beyond/backstop.js';
import { angerUnsaid, angerAnswer, fairAnger, guessGuard, feelingGuard, speaksAnger, authoredScene, gentleScene, framesScene, candidatePatterns } from '../src/beyond/authored.js';
import { hasMarker } from '../src/beyond/markers.js';
import { LOSS_CHECK as MAIN_CHECK } from '../src/hushfold/lines.js';
import { LOSS_CHECK, AUTHORED_PAIRS, GRIEF, SAFETY } from '../src/beyond/lines.js';
import { getEmotion } from '../src/data/emotions.js';
import { norm, PERSON, PET } from '../src/beyond/death-words.js';
import { visit, STUBS } from './probes/r10-replay.mjs';
import * as P from './probes/r12.mjs';

const R10 = await import('./probes/r10.mjs');
const R11 = await import('./probes/r11.mjs');
await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };

/** The main screen's route (input-overlay readSafety, lossAware, grief loaded). */
function main(t, emotion = null) {
  const r = readSafety({ checkText }, t, true, { emotion });
  if (r.level === 'crisis' || r.level === 'care') return 'care';
  if (r.level === 'concern') return r.category === 'loss' ? 'gentle' : 'care';
  return r.unsure ? 'check-in' : 'ordinary';
}
/** Another Angle's route (afterTell → startAngle): the safety check and an escalation first, then lossRoute. */
function angle(t, emotion = null) {
  const c = checkText(t);
  // (r3-esc) a suicide named is care too, whatever the clause (another-angle.js afterTell suicideDeath)
  if (c.level === 'crisis' || c.level === 'care' || GR.deathEscalation(t) || GR.suicideDeath(t)) return 'care';
  const r = lossRoute(t, { emotion });
  return r === 'gentle' ? 'gentle' : r === 'ask' ? 'check-in' : 'ordinary';
}
const both = (t, emotion = null) => [main(t, emotion), angle(t, emotion)];
const DEATH_ALL = [...new Set([
  ...P.R5_DEATH.map(([, t]) => t), ...P.R5_B2.map(([, t]) => t), ...P.R5_COMMON_FRAMED, ...P.R5_EXOTIC_FRAMED, ...P.R5_QUOTED, ...P.R5_MAIN_MISS,
  ...P.R5_KIND, ...P.R5_PRACTICAL_SAID, ...P.R5_WENT_HOME, ...P.R5_R3_CROSS, ...P.R5_R3_DEATH, ...P.AP_PREGNANCY,
])];
/** (r3-esc, by design) the overdoses among the round-5 deaths name a suicide death word: care on both screens now (5 were gentle). */
const R3_OVERDOSE_CARE = ['my brother ODed in his flat', "my friend od'd at a party", 'my friend ODd', 'my friend od d', 'my friend ODd last night and everyone blames me'];
const expectedDeath = (t) => (P.R5_DEATH_CARE.includes(t) || R3_OVERDOSE_CARE.includes(t) ? 'care' : P.R5_DEATH_CHECK_IN.includes(t) ? 'check-in' : 'gentle');
const WHO = new RegExp(`\\b(?:${PERSON}|${PET})(?:s|es)?\\b`, 'iu');
const framed = (R) => R.scenes.some((s) => !s.grief && (FRAMING_MECHANICS.has(s.mechanic) || framesScene(s)));

// ------------------------------------------------------------------------------- the reading --
test('unsureLoss, griefFeeling and lossRoute are re-exported from grief.js (input-overlay loads only that module), like strongLoss', () => {
  assert.equal(GR.unsureLoss, unsureLoss);
  assert.equal(GR.griefFeeling, griefFeeling);
  assert.equal(GR.lossRoute, lossRoute);
  assert.equal(GR.strongLoss, strongLoss);
});

test('unsureLoss: a person, a pet or a pregnancy beside a softer loss cue, only when nothing else reads a loss', () => {
  const POS = [
    ...P.R5_DEATH_CHECK_IN, 'my mum is up there now', 'my grandad has moved on', 'my dad will never walk me down the aisle', 'my mum wont be at my wedding',
    'my aunt is no longer suffering', 'my nan isnt in pain anymore', 'my dog went to the farm', 'they found my uncle in his flat', 'my dog had to be put to rest',
    'my best friend is not here anymore', 'my nan is in gods hands now', 'my uncle went to meet jesus', 'my sister didnt see her 20th birthday', 'my boss had to let him go',
    'my cat went to sleep at the vets', 'the flu got my mum this week',
  ];
  for (const t of POS) assert.equal(unsureLoss(t), true, t);
  const NEG = [
    // no person, pet or pregnancy word
    'I lost my keys again', 'it was over in a minute', 'the match went badly', 'we went to the beach', 'heaven knows why',
    // a person, but no softer cue (or only its everyday sense)
    "my mum didn't call me back, she must be angry with me", 'my boss always ignores me', 'my colleagues went to lunch without me, they must not like me',
    "my friend found my old diary, now she thinks I'm a freak", 'my dad left the room without saying goodbye, he must be furious', 'my brother left for uni today',
    'my friend left the group chat', 'my mum is resting after her shift', 'my colleague said goodbye to everyone but me', 'my brother is never around any more',
    'my cat is at the vet for a check-up', 'my mum is in hospital for a minor op', 'dads in hospital for a knee operation', 'my grandad said goodbye at the station',
    'my sister is such an angel', 'my brother took me to the park', 'my mum took ages to reply', 'my team won and my dad was happy', 'my brother beat me at chess',
    'my dad loves star wars', 'we had chicken wings with my uncle',
    // death talk (deathTalk / livingLoss / strongLoss read it): never unsure, the gentle path directly
    'my dad died last week', 'we let our dog go peacefully at home', 'my nan has dementia', 'the big c got my grandad',
  ];
  for (const t of NEG) assert.equal(unsureLoss(t), false, t);
  assert.equal(unsureLoss(''), false);
  assert.equal(unsureLoss('   '), false);
});

test('lossRoute: gentle for death talk, someone alive but going, a strong cue or a grief-family feeling; ask when unsure; else null', () => {
  assert.equal(lossRoute('my dad died'), 'gentle');
  assert.equal(lossRoute('my nan has dementia'), 'gentle');
  assert.equal(lossRoute('the big c got my grandad'), 'gentle');
  assert.equal(lossRoute('my dad isnt here anymore'), 'ask');
  assert.equal(lossRoute('my boss always ignores me'), null);
  for (const id of GRIEF_FEELINGS) {
    assert.ok(getEmotion(id), `${id} is a feeling of the A–Z list`);
    assert.equal(griefFeeling(id), true, id);
    // chosen with ordinary words, or with words the check-in would ask about: the gentle path, no question
    assert.equal(lossRoute('my boss always ignores me', { emotion: id }), 'gentle', id);
    assert.equal(lossRoute('my dad isnt here anymore', { emotion: id }), 'gentle', id);
  }
  for (const id of ['sadness', 'anger', 'loneliness', 'sorrow', 'longing', null, '']) assert.equal(griefFeeling(id), false, String(id));
  assert.deepEqual([...GRIEF_FEELINGS].sort(), ['anticipatory-grief', 'bereft', 'grief', 'heartache', 'heartbreak', 'mourning']);
});

test('readSafety (the main screen): unsure is level none with `unsure`; a grief-family feeling is concern / loss; crisis, care and an escalation win', () => {
  const m = { checkText };
  assert.deepEqual(readSafety(m, 'my dad isnt here anymore', true), { ...checkText('my dad isnt here anymore'), unsure: true });
  assert.equal(readSafety(m, 'my boss always ignores me', true).unsure, undefined);
  const g = readSafety(m, 'my boss always ignores me', true, { emotion: 'grief' });
  assert.deepEqual([g.level, g.category], ['concern', 'loss']);
  // (no words at all: the feeling alone)
  assert.deepEqual([readSafety(m, '', true, { emotion: 'mourning' }).level, readSafety(m, '', true, { emotion: 'mourning' }).category], ['concern', 'loss']);
  // the heavier readings always come first and route as now
  assert.equal(readSafety(m, 'I want to die', true, { emotion: 'grief' }).level, 'crisis');
  assert.equal(readSafety(m, 'my dad isnt here anymore and I want to die', true).level, 'crisis');
  assert.equal(readSafety(m, 'my brother died and Id like to be with him', true, { emotion: 'grief' }).level, 'care');
  assert.equal(readSafety(m, 'he finally hit me and my dad isnt here anymore', true).level, 'care');
  // without lossAware (Another Angle's overlay) the reading is exactly checkText, whatever the feeling
  for (const t of ['my dad isnt here anymore', 'my boss always ignores me']) assert.deepEqual(readSafety(m, t, false, { emotion: 'grief' }), checkText(t));
  // the overlay sends the feeling it chose, and hands the scene the flag (input.safety.detail.unsure)
  const ov = read('src/hushfold/input-overlay.js');
  assert.match(ov, /safety = t \|\| chosenEmotion \? readSafety\(m, t, lossAware, \{ emotion: chosenEmotion \}\)/);
  assert.match(ov, /detail: \{ level: safety\.level, category: safety\.category, \.\.\.\(safety\.unsure \? \{ unsure: true \} : \{\}\) \}/);
});

// ---------------------------------------------------------- (a) the round-5 review's death probes --
test('r12 (a): every death probe of the round-5 review reaches the gentle path directly or the check-in, on both screens (none reaches neither)', () => {
  assert.equal(P.R5_DEATH.length, 85);
  assert.equal(P.R5_B2.length, 42);
  const tally = { gentle: 0, 'check-in': 0, care: 0, neither: 0 };
  for (const t of DEATH_ALL) {
    const want = expectedDeath(t);
    assert.deepEqual(both(t), [want, want], t);
    tally[want]++;
  }
  // with the review's marker clauses too (a death with a guess beside it is still a death)
  for (const t of [...P.R5_COMMON_FRAMED, ...P.R5_KIND, ...P.R5_R3_CROSS].filter((x) => expectedDeath(x) === 'gentle')) {
    for (const m of P.R5_R3_MARKERS) assert.deepEqual(both(t + m), ['gentle', 'gentle'], t + m);
  }
  for (const t of P.R5_DEATH_CHECK_IN) for (const m of P.R5_R3_MARKERS) assert.ok(['check-in', 'gentle', 'care'].includes(angle(t + m)) && angle(t + m) === main(t + m) || main(t + m) === 'care', t + m);
  assert.deepEqual(tally, { gentle: DEATH_ALL.length - P.R5_DEATH_CHECK_IN.length - P.R5_DEATH_CARE.length - R3_OVERDOSE_CARE.length, 'check-in': P.R5_DEATH_CHECK_IN.length, care: 3 + R3_OVERDOSE_CARE.length, neither: 0 });
  // (r3-esc) every suicide death word among them is care, and only those (plus R5_DEATH_CARE)
  assert.deepEqual(DEATH_ALL.filter((t) => GR.suicideDeath(t) && !P.R5_DEATH_CARE.includes(t)), R3_OVERDOSE_CARE);
  // of the review's 85 + 42 (its own tags): no common phrasing and no exotic one reaches neither
  const tagged = [...P.R5_DEATH, ...P.R5_B2];
  assert.deepEqual(tagged.filter(([, t]) => !['gentle', 'check-in', 'care'].includes(angle(t))), []);
});

test('r12: the review’s escalation probes go to care on both screens; its negatives never do (they are the gentle path)', () => {
  for (const t of [...P.R5_ESC_POS, ...P.R5_R3_ESC_POS]) assert.deepEqual(both(t), ['care', 'care'], t);
  for (const t of [...P.R5_ESC_NEG, ...P.R5_R3_ESC_NEG]) {
    assert.equal(GR.deathEscalation(t), false, t);
    // (the safety lexicon's own reading stands: "i dont want to go on walks without him" reads crisis there)
    const lex = checkText(t).level;
    assert.deepEqual(both(t), lex === 'crisis' || lex === 'care' ? ['care', 'care'] : ['gentle', 'gentle'], t);
  }
});

// ------------------------------------------------ (b) the check-in on ordinary Tells: false alarms --
test('r12 (b): the check-in on ordinary Tells that mention a person or a pet stays rare (≤ 20%), and each one is pinned', () => {
  const ordinary = [...R10.WORRIES, ...R11.R4_WORRIES, ...R11.MAIN_ORDINARY_50];
  assert.equal(ordinary.length, 130);
  const withWho = ordinary.filter((t) => WHO.test(norm(t)));
  const asked = withWho.filter((t) => main(t) === 'check-in');
  assert.deepEqual(asked, ['my dog ran off in the park but we found him', 'my cat went missing for a day and came back']);
  assert.ok(asked.length / withWho.length <= 0.2, `${asked.length}/${withWho.length}`);
  // the round-5 review's own ordinary sets: ordinary, but for the pinned check-ins and the game deaths
  for (const t of [...P.R5_ORDINARY, ...P.R5_MAIN_ORDINARY, ...P.R5_MAIN_PINNED, ...P.R5_WORRIES, ...P.R5_ANGER, ...P.R5_FEELINGS, ...ordinary]) {
    // (the safety lexicon's own reading stands: "my mum went through my phone" is care there, "Im always a burden" crisis)
    const lex = checkText(t).level;
    const want = lex === 'crisis' || lex === 'care' ? 'care' : P.R5_ORDINARY_GENTLE.includes(t) ? 'gentle' : P.ORDINARY_CHECK_IN.includes(t) ? 'check-in' : 'ordinary';
    assert.deepEqual(both(t), [want, want], t);
  }
  // the owner's example: no check-in, the normal flow
  assert.deepEqual(both('my mum didnt call me back, she must be angry with me'), ['ordinary', 'ordinary']);
});

// ---------------------------------------------------------------- (c) worries keep their angle --
test('r12 (c): worries keep their angle (≥ 75%), the check-in answered "Something else" where it asks', () => {
  for (const [name, list, floor] of [['r5', P.R5_WORRIES, 0.95], ['r10', R10.WORRIES, 0.95], ['r11', R11.R4_WORRIES, 0.95]]) {
    const kept = list.filter((t) => framed(visit(t)));
    assert.ok(kept.length / list.length >= floor, `${name}: ${kept.length}/${list.length}`);
  }
  // the five the review lost to weak cues all keep it now
  for (const t of P.R5_POLISH.worriesLost) { assert.equal(framingAllowed(t), true, t); assert.ok(framed(visit(t)), t); }
  // and the marker recall the review named
  for (const t of ['my best friend posted a photo with someone else, she must have a new best friend', 'my brother took my side for once, he must want something',
    'my best mate is sitting with someone else at lunch, he must have replaced me', "my teacher kept me back after class, I'm in so much trouble"]) assert.equal(hasMarker(t), true, t);
});

// --------------------------------------------------------------- the families (review r12) --
test('r12: the round-5 review’s deathTalk families, and what they never read', () => {
  const POS = [
    'we let our dog go peacefully at home', 'we had to let him go at the vets', 'we had to let our cat go at the vet', 'the doctors said there was nothing more they could do and we let her go',
    'they had to let him go in intensive care', 'my mum isnt with us now', 'my mum isnt with us', 'grandad isnt with us now', 'my grandad isnt with us any longer',
    'my mum isnt with us and nobody cares', 'my aunt went home to be with jesus', 'my grandad went home to the lord', 'she went home to glory', 'my old man pegged it last week',
    'my nan pegged it', 'my auntie had a stroke and never recovered', 'my nan never recovered from the fall', 'my horse had to be shot', 'the dog had to be put out of his misery',
    'my brother didnt come home from the war', 'my stepdad wasnt breathing when we found him', 'mum wasnt breathing when i found her', 'my father was taken by the sea',
    'my rabbit was taken by a fox', 'a fox got our chickens last night', 'the tumour beat my dad in the end', 'cancer won in the end', 'the fire took everything including my dog',
    'my nan had gone in the night', 'he had gone by the time we got there', 'dad has gone to the other side', 'the vet helped her cross over', 'my grandad cashed in his chips',
    'my uncle is brown bread', 'my baby boy grew his wings', 'my grandad had a massive heart attack and that was it', 'my freind was kiled in a car crash',
    ...P.AP_PREGNANCY, 'we had to end the pregnancy for medical reasons', 'the doctor said the pregnancy wasnt viable', 'my uncle is six foot under',
    'our little girl only lived for three days', 'my brother never came out of surgery', 'my dad had a heart attack at work and didnt come home',
  ];
  for (const t of POS) assert.ok(GR.deathTalk(t), t);
  const NEG = [
    'my boss let him go', 'we had to let our dog go', 'I let my dog go off the lead', 'we let the cat go outside', 'my sister isnt with us this weekend', 'my dad isnt with us on the trip',
    'he pegged it down the road', 'we pegged it home', 'my dad never recovered from the divorce', 'my nan had a fall last year and never recovered her confidence',
    'the other side of the room', 'we cross over the road', 'we had chicken wings', 'I had brown bread for lunch', 'my team won the cup', 'my dad beat cancer',
    'my dad didnt come home from work until late', 'the fire got my dads car', 'my sister is buried in revision', 'my brother is buried in exams', 'im buried in coursework',
    "my teammates passed to everyone but me, they think I'm rubbish", 'I couldnt save my mum a seat', 'the heart attack scare was nothing in the end',
    'I am not pregnant, phew', 'the pregnancy test was negative', 'my dog went off the lead', 'my brother came home from the army',
  ];
  for (const t of NEG) assert.equal(GR.deathTalk(t), null, t);
  // the regression r11 brought: "went home" set aside, now never before a faith word
  for (const t of P.R5_WENT_HOME) { assert.ok(GR.deathTalk(t), t); assert.equal(bagWords(t), true, t); }
  assert.equal(strongLoss('the fire got my dads car'), false);
  assert.equal(strongLoss('the fire got my dad'), true);
});

// ------------------------------------------- the review's server items (blocking 3 and 5), and the polish --
const PRACTICAL = () => ({ status: 'ok', scene: { reasoning_pattern: 'practical_problem', emotion: 'overwhelm', situation_type: 'work', known_fact: 'There is a lot to do.', possible_assumption: '', alternative_angle: '', practical_next_step: 'Write down the one thing that matters most today.', subtitle_line_1: 'This is a real problem, and real problems have next steps.', subtitle_line_2: 'Pick the smallest one and start there.', safety_status: 'ok', mallow_character: 'zuzu' } });
test('r12: beside a bag word a server’s practical-problem lines never play ("real problems have next steps")', () => {
  for (const t of [...P.R5_PRACTICAL_SAID, 'my nan is in hospital and I cant think', 'I lost my keys and my boss thinks Im useless']) {
    for (const ans of ['else', 'yes']) {
      const R = visit(t, { server: PRACTICAL, answer: ans });
      assert.ok(!R.said.some((l) => /real problems have next steps|smallest one and start there/.test(l)), `${t}: ${R.said.join(' | ')}`);
    }
  }
  const s = guessGuard({ ...PRACTICAL().scene, source: 'server', mechanic: 'assemble_step', interaction_type: 'assemble_step' }, 'I lost my keys and my boss thinks Im useless');
  assert.equal(s.source, 'authored');
  // (ordinary words keep them: a real practical problem)
  const ok = guessGuard({ ...PRACTICAL().scene, source: 'server', mechanic: 'assemble_step', interaction_type: 'assemble_step' }, 'I have three essays due tomorrow and havent started');
  assert.equal(ok.subtitle_line_1, 'This is a real problem, and real problems have next steps.');
});

test('r12: with a marker, a server’s grief lines never play for words with no loss in them (its reading’s authored pair instead)', () => {
  for (const t of P.R5_GRIEFISH) {
    assert.equal(lossRoute(t), null, t);
    const R = visit(t, { server: STUBS.griefish });
    assert.ok(!R.said.some((l) => /Missing them|Grief isn/.test(l)), `${t}: ${R.said.join(' | ')}`);
  }
  const scene = guessGuard({ ...STUBS.griefish().scene, source: 'server', mechanic: 'let_loop_drift', interaction_type: 'let_loop_drift' }, P.R5_GRIEFISH[2]);
  assert.deepEqual([scene.subtitle_line_1, scene.subtitle_line_2], AUTHORED_PAIRS.rumination);
  // (a real loss keeps a server's grief lines: the gentle path)
  assert.equal(visit('my dad died and nobody cares', { server: STUBS.grief }).route, 'gentle');
});

test('r12: the review’s quoted visits are never framed, with no server and every scene stub (asked first where it is not sure)', () => {
  for (const t of P.R5_QUOTED) for (const s of ['none', 'pull', 'mind', 'fallback', 'griefish', 'anger', 'harsh', 'spectrum', 'catas']) {
    const R = visit(t, { server: STUBS[s] || null, answer: 'yes' });
    // (asked first where it is not sure: the gentle answer is "Just be with it", its own quiet path, r2-angle item 5)
    assert.equal(R.route, P.R5_DEATH_CHECK_IN.includes(t) ? 'be' : 'gentle', `${t} @${s}`);
    assert.equal(R.asked, P.R5_DEATH_CHECK_IN.includes(t), `${t} @${s}`);
    assert.ok(!framed(R), `${t} @${s}`);
  }
});

test('r12 polish: buried in revision, passed to, a thing after the person, fair anger that never pays back, the vets', () => {
  for (const t of P.R5_POLISH.buried) assert.deepEqual(both(t), ['ordinary', 'ordinary'], t);
  for (const t of P.R5_POLISH.passedTo) { assert.equal(GR.deathTalk(t), null, t); assert.equal(main(t), 'ordinary', t); }
  for (const t of P.R5_POLISH.fireCar) assert.equal(main(t), 'ordinary', t);
  for (const t of P.R5_POLISH.fairAnger) {
    assert.equal(fairAnger(t), true, t);
    assert.equal(candidatePatterns(t)[0], 'valid_anger', t);
    assert.ok(!framed(visit(t)), t);
  }
  for (const t of P.R5_POLISH.vets) assert.equal(bagWords(t), true, t);
});

// ---------------------------------------------- the Another Angle polish verifier: anger never attributed --
test('AP item 4: embarrassment, shame or hurt said the common ways means no anger is attributed, and a server’s anger answer is not kept', () => {
  for (const e of P.AP_SHAME_ENDINGS) {
    const t = P.AP_BASE + e;
    assert.equal(angerUnsaid(t), true, t);
    assert.equal(angerAnswer(t), false, t);
    const own = authoredScene(t);
    assert.ok(!speaksAnger(own) && own.reasoning_pattern !== 'valid_anger', `${t}: ${own.reasoning_pattern}`);
    for (const stub of ['anger', 'angerLines']) {
      const scene = { ...STUBS[stub]().scene, source: 'server', mechanic: stub === 'anger' ? 'find_boundary' : 'separate_one', interaction_type: stub === 'anger' ? 'find_boundary' : 'separate_one' };
      const played = guessGuard(feelingGuard(scene, t), t);
      assert.ok(!speaksAnger(played), `${t} @${stub}: ${played.subtitle_line_1}`);
    }
  }
  for (const t of P.AP_SHAME_ALSO) assert.equal(angerUnsaid(t), true, t);
  // their own anger stays theirs
  for (const t of [`${P.AP_BASE}I was furious`, `${P.AP_BASE}I was so angry I cried`, 'Im furious my boss shouted at me in front of everyone']) assert.equal(angerAnswer(t), true, t);
});

// ----------------------------------------------------------------------- the check-in itself --
test('the check-in’s words: the same question on both screens, two real choices, about 20 s, the brand rules', () => {
  assert.deepEqual({ ...MAIN_CHECK }, { ...LOSS_CHECK });
  assert.match(LOSS_CHECK.ask, /Is this about losing someone\?$/);
  assert.equal(LOSS_CHECK.yes, 'Yes, it is');
  assert.equal(LOSS_CHECK.no, 'Something else');
  assert.equal(LOSS_CHECK.ms, 20000);
  for (const l of [LOSS_CHECK.ask, LOSS_CHECK.yes, LOSS_CHECK.no]) { assert.doesNotMatch(l, /\bAI\b|angle|reframe|died|death|dead/i, l); assert.ok(l.length <= 60, l); }
  // the chips are the subtitles' own buttons: real <button>s in a labelled group, the line in a live region, 46 px tall
  const subs = read('src/hushfold/subtitles.js');
  assert.match(subs, /h\('button', \{ class: `hf-chip\$\{o\.primary \? ' primary' : ''\}\$\{o\.soft \? ' soft' : ''\}`, type: 'button'/);
  assert.match(subs, /chipsEl\.setAttribute\('aria-label', prompt \|\| 'Choose'\);/);
  assert.match(subs, /const liveEl = h\('div', \{ class: 'hf-sublive', role: 'status', 'aria-live': 'polite'/);
  assert.match(read('src/ui/hushfold.css'), /\.hf-chip \{ min-height: 46px;/);
});

// (the main screen's check-in is retired by the owner's 'Ask before every world', 14 Oct 2026: every ordinary Tell, unsure
// ones included, is asked "Shall we play with this, or just be with it?" — tests/ask-every-world.test.mjs)

test('Another Angle: Zuzu asks before anything is sent, framed or played (the one choice, or with it switched off the check-in); a gentle answer is griefMode, the other carries on, no answer stays quiet', () => {
  const aa = read('src/beyond/another-angle.js');
  const start = between(aa, 'async function startAngle(', 'const FIRST_QUESTION = {');
  const route = start.indexOf('const route = lossRoute(S.text, { emotion: S.emotion });');
  const asks = start.indexOf('await askFirst(step)');
  assert.ok(route > 0 && asks > route);
  for (const later of ['spawnThought()', 'client.angle(', 'waitingLines(', 'playScene(']) assert.ok(asks < start.indexOf(later), later);
  // (owner decision 'Ask before every world': askall-angle.test.mjs pins the choice; LOSS_CHECK stays for the switch turned off)
  assert.match(start, /if \(step === 'choice' \|\| step === 'check-in'\) \{/);
  // (r2-angle item 5) "Just be with it" is its own quiet path; the check-in's "Yes, it is" is the gentle path
  assert.match(start, /if \(v === 'be'\) \{ S\.answers\.set\(key, 'be'\); return beWithIt\(\); \}/);
  assert.match(start, /if \(v === 'yes'\) \{ S\.answers\.set\(key, 'yes'\); S\.lossSaid = true; S\.noPlay = true; return griefMode\(\{ told: 'loss' \}\); \}/);
  assert.match(start, /if \(v !== 'angle' && v !== 'else'\) \{ quietAfterAsk\(\); return; \}/);
  const fn = between(aa, 'const FIRST_QUESTION = {', 'async function waitingLines(');
  assert.doesNotMatch(fn, /client\.|spawnThought|playScene|setStage\('playful'\)/, 'nothing sent, nothing made, nothing playful');
  assert.match(fn, /careFace\(\);/);
  assert.match(fn, /'check-in': \{ ask: LOSS_CHECK\.ask, ms: LOSS_CHECK\.ms, options: \[\{ label: LOSS_CHECK\.yes, value: 'yes' \}, \{ label: LOSS_CHECK\.no, value: 'else' \}\] \}/);
  // (r2-angle item 6) its own clock (questionClock: never counted while the page is hidden), not the subtitles' timeout
  assert.match(fn, /choose\(q\.ask, q\.options, \{ mallow: 'zuzu', transient: true, lossCheck: true, interrupt: true \}\)/);
  assert.match(fn, /questionClock\(q\.ms, \(\) => \{ if \(seq === S\.seq\) subs\?\.drop\(\(o\) => o\.lossCheck\); \}\)/);
  assert.match(aa, /if \(layer\.lossCheck && \(!token \|\| token === layer\.lossCheck\)\) \{ layer\.lossCheck = 0; subs\?\.drop\(\(o\) => o\.lossCheck\); \}/);
  assert.match(aa, /'typing', 'asking'\]\.includes\(S\.phase\)/, 'no reload while it asks');
  // Zuzu's squeeze quips only in the invitation, squeeze and end phases (never while asking)
  assert.match(aa, /if \(\['arrive', 'invite', 'squeeze', 'end'\]\.includes\(S\.phase\)/);
});

test('Another Angle replay: the question is asked before any request; a gentle answer is gentle, no answer is quiet, the other carries on (a server loss answer still gentle)', () => {
  for (const t of P.R5_DEATH_CHECK_IN) {
    for (const s of ['none', 'pull', 'mind', 'fallback', 'griefish', 'anger', 'grief']) {
      const server = STUBS[s] || null;
      const yes = visit(t, { server, answer: 'yes' });
      assert.ok(yes.asked && yes.requestsBeforeAnswer === 0, `${t} @${s}`);
      // (with the question on, the gentle answer is "Just be with it": its own quiet path, r2-angle item 5; nothing sent)
      assert.deepEqual([yes.route, yes.requests], ['be', 0], `${t} @${s}`);
      assert.ok(!framed(yes) && yes.mechanics.length === 0, `${t} @${s}`);
      // the check-in's "Yes, it is" (the question switched off): the loss pair when Zuzu answers (never the server's mechanic)
      const told = visit(t, { server, answer: 'yes', asks: false });
      assert.equal(told.route, 'gentle', `${t} @${s}`);
      if (!server) assert.deepEqual(told.scenes[0] && [told.scenes[0].subtitle_line_1, told.scenes[0].subtitle_line_2], GRIEF.loss, t);
      const quiet = visit(t, { server, answer: null });
      assert.deepEqual([quiet.route, quiet.requests, quiet.scenes.length], ['quiet', 0, 0], `${t} @${s}`);
      const els = visit(t, { server, answer: 'else' });
      assert.ok(els.asked && els.requestsBeforeAnswer === 0, `${t} @${s}`);
      // a server that reads it as grief or a loss still answers it gently, without asking again; (final round 5) unless the words
      // carry the safety net's (grief.js keepLocal): then "Another angle" plays Zuzu's own angle and nothing is sent at all
      if (GR.keepLocal(t)) assert.deepEqual([els.route, els.requests, els.local], ['play', 0, true], `${t} @${s}`);
      else if (s === 'grief') assert.equal(els.route, 'gentle', t);
      // beside a bag word or a loss cue: never framed, whatever they answered
      if (bagWords(t)) assert.ok(!framed(els), `${t} @${s}`);
    }
  }
  // a grief-family feeling chosen: gentle, no question
  for (const id of GRIEF_FEELINGS) {
    const R = visit('my boss always ignores me', { emotion: id });
    assert.deepEqual([R.route, R.asked], ['gentle', false], id);
    assert.deepEqual([R.scenes[0].subtitle_line_1, R.scenes[0].subtitle_line_2], GRIEF.grief, id);
  }
  // ordinary words: the one choice (owner decision 'Ask before every world'); with it switched off, no question at all
  for (const t of ['my mum didnt call me back, she must be angry with me', 'my boss always ignores me']) {
    assert.deepEqual([visit(t).asked, visit(t).question], [true, 'choice'], t);
    assert.equal(visit(t, { asks: false }).asked, false, t);
  }
  // (the switch off) after the check-in's "Yes, it is" the gentle path sends nothing (final round 5: it was "a server care answer
  // after it is said gently", SAFETY.careGentle): the authored loss pair, 0 requests, whatever the server
  for (const s of Object.keys(STUBS)) {
    const R = visit('my dad isnt here anymore', { server: STUBS[s] || null, answer: 'yes', asks: false });
    assert.deepEqual([R.route, R.requests, R.careLines], ['gentle', 0, null], s);
  }
});

test('gentleScene: what they told the check-in (a loss) or a grief-family feeling picks its pair; death talk keeps its own', () => {
  assert.deepEqual([gentleScene('my dad isnt here anymore', { kind: 'loss' }).subtitle_line_1], [GRIEF.loss[0]]);
  assert.deepEqual([gentleScene('my boss always ignores me', { kind: 'grief' }).subtitle_line_1], [GRIEF.grief[0]]);
  assert.deepEqual([gentleScene('my nan has cancer').subtitle_line_1], [GRIEF.heavy[0]]);
  assert.deepEqual([gentleScene('my dad died', { kind: 'grief' }).subtitle_line_1], [GRIEF.loss[0]]);
  assert.deepEqual([gentleScene('x', { kind: 'nope' }).subtitle_line_1], [GRIEF.heavy[0]]);
});

test('the Support lines link: a 44 px target that never reaches the Not now / Accept row', () => {
  const css = read('src/beyond/styles.js');
  // (the text sits at the bottom of its 44 px box, which reaches up over its own line, never down over the buttons)
  assert.match(css, /\.bx-link \{ display: inline-flex; align-items: flex-end; min-height: 44px; margin: -23px 0 0; padding: 0 4px 0 0;/);
});
