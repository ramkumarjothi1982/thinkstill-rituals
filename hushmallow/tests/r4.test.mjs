// Final round 4 (the independent check of integ/final-r3 931fbb0, score 6: /tmp/claude-0/hf/check-r3.json).
//
//   1. blocking item 1: the check's eight clause SHAPES in grief.js selfEnding (a conditional absence; happier / better dead; asking
//      to die or be taken; a wish, an intent or a rumination and an act that ends a life; going where they went, "go there" after
//      heaven; the grave or the ground with them; wishing I'd died instead; typos in the wish and the verb): the check's 35 and this
//      unit's own 30 are care on both screens with 0 requests; false care on 60 grief negatives this unit wrote stays ≤ 3/60
//   2. blocking item 2: "killed him self", "hung them self" (SELF3), "died by his own hand" (suicideDeath): care, 0 requests
//   3. blocking item 3: the speaker's everyday sayings inside a figurative frame ("I'm dead lol", "I died when he said that", "I
//      killed myself laughing", "I'll die if he sees me like this") are no death talk (death-words.js whoDied): the ordinary question
//   4. the structural safety net (grief.js keepLocal): on the gentle path, after the death, any first-person clause with a death,
//      ending, absence or afterlife word keeps the words on the phone: Another Angle sends nothing (the authored gentle lines), and
//      the main screen's gentle path shows its Support pill and offers no world (readSafety `supportFirst`): never care
//
// (Final round 5, the check of integ/final-r4 and the detection gate, tools/beyond/detection-gate.mjs) changed pins, each marked
// "(final round 5)" below: item 3's sayings are the speaker's again (the gentle path, as at 931fbb0: round 4's frames turned real
// notes into the play question); the polish's four exceptions are care again (nothing 931fbb0 read as care may read lower); and
// Another Angle's gentle path sends nothing at all, so "asks the server as before" is now 0 requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import * as GR from '../src/beyond/grief.js';
import { whoDied, norm, blankOrdinary } from '../src/beyond/death-words.js';
import { lossRoute } from '../src/beyond/backstop.js';
import { SAFETY, GRIEF } from '../src/beyond/lines.js';
import { DEATH_CARE } from '../src/app/scenes/hushfold.js';
import { visit, STUBS, ALL_SCENE_STUBS } from './probes/r10-replay.mjs';
import * as P from './probes/r4.mjs';

await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const AA = read('src/beyond/another-angle.js');
const HF = read('src/app/scenes/hushfold.js');
const IO = read('src/hushfold/input-overlay.js');
const STUB_NAMES = ['none', ...ALL_SCENE_STUBS, 'care', 'crisis', 'error'];
const mainRead = (t) => readSafety({ checkText }, t, true);
const isCare = (r) => r.level === 'care' || r.level === 'crisis';
/** Another Angle, every server answer: care (or crisis), 0 requests, no question, no mechanic, no scene. */
function angleCare(t) {
  for (const s of STUB_NAMES) {
    const R = visit(t, { server: STUBS[s] || null });
    assert.ok(['care', 'follow', 'crisis'].includes(R.route), `${t} @${s}: ${R.route}`);
    assert.deepEqual([R.requests, R.asked, R.mechanics.length, R.scenes.length], [0, false, 0, 0], `${t} @${s}`);
  }
}
/** Both screens: care, a care grief.js made carries DEATH_CARE (no world), and Another Angle sends nothing. */
function careBoth(t) {
  const r = mainRead(t);
  assert.ok(isCare(r), `${t}: main ${r.level}/${r.category}`);
  if (r.level === 'care') assert.ok(DEATH_CARE.has(r.category), `${t}: ${r.category}`);
  angleCare(t);
}

// ------------------------------------------------------------------------- blocking item 1 --
test('blocking 1: the check\'s 35 misses, verbatim, are care on both screens with 0 requests (every server answer)', () => {
  assert.equal(P.CHECK_ESC_ALL.length, 35);
  for (const t of P.CHECK_ESC_ALL) {
    assert.equal(GR.deathCare(t), 'follow', t);
    careBoth(t);
  }
  // each shape on its own (the clause rule reads the shape, after any death)
  for (const t of P.CHECK_ESC.absent) assert.equal(GR.selfEnding(t), true, t);
  for (const t of [...P.CHECK_ESC.asking, ...P.CHECK_ESC.act, ...P.CHECK_ESC.where]) assert.equal(GR.selfEnding(t) || GR.wantsToFollow(t), true, t);
  // the typos are read as meant
  for (const t of P.CHECK_ESC.typo) assert.equal(GR.deathEscalation(t), true, t);
  // "my son died and i'm going to jump": the lexicon's concern (distress) no longer wins over the self ending
  assert.deepEqual(mainRead("my son died and i'm going to jump"), { level: 'care', category: 'death-follow', matched: null });
});

test('blocking 1: this unit\'s own 30 (one wording each, written before they were run) are care on both screens with 0 requests', () => {
  assert.equal(P.OWN_ESC.length, 30);
  assert.equal(new Set(P.OWN_ESC).size, 30);
  for (const t of P.OWN_ESC) {
    assert.equal(GR.deathCare(t), 'follow', t);
    careBoth(t);
  }
});

test('blocking 1: the wish TURNED around is still no wish, and no shape reads past a condition or a plan', () => {
  for (const t of [
    "my dad died and it wouldn't be better if i wasn't here", "my dad died and i don't want to drive into the river", "my mum died and i don't want god to take me",
    "my dad died and i would never go where he went", 'my nan died and i hope i make it to christmas',
    'my dad died and i want to drive into town to see my aunt', 'my brother died and i want to jump on a plane home', 'my mum died and she used to take me to church',
    'my dad died and he took me fishing every summer', 'my mum died and i want to go where she went on holiday every year',
    'my nan died and i want to be there for my grandad', 'my dad is in heaven and i want to go there one day', 'my aunt died and my uncle said he would take me in',
    'my wife died and i want to visit where she is buried',
  ]) assert.equal(GR.deathCare(t), null, t);
  // (final round 5) the condition about being seen, and "wish I had gone to see him" (the "wish I was gone" tail is gone again),
  // are care again, as at 931fbb0 (false care, the safe side: known issues)
  for (const t of ["my dad died and i'll die if he sees me like this", 'my grandad died and i wish i had gone to see him more']) assert.equal(GR.deathCare(t), 'follow', t);
});

test('blocking 1, the polish: false care on grief stays low (0 of this unit\'s 60, 0 of the check\'s three from grief.js)', () => {
  assert.equal(P.OWN_GRIEF_60.length, 60);
  const care = P.OWN_GRIEF_60.filter((t) => GR.deathCare(t) || isCare(mainRead(t)));
  console.log('r4 false care on 60 grief negatives:', care.length, JSON.stringify(care));
  assert.ok(care.length <= 3, care.join(' | '));
  assert.equal(care.length, 0, care.join(' | '));
  // (final round 5: these were the gentle path; 931fbb0 read them as care, and the gate keeps that) the check's three and the
  // earlier rounds' bare "I want to see him again" are care on both screens, 0 requests (false care, the safe side: known issues)
  for (const t of [...P.CHECK_FALSE_CARE, ...P.SEE_AGAIN_LONGING]) {
    assert.equal(GR.deathCare(t), 'follow', t);
    careBoth(t);
  }
  // …while "again soon", "in heaven" stay care
  for (const t of ['my wife died and I want to see her again soon', 'my grandad died and I want to see him again in heaven']) assert.equal(GR.deathCare(t), 'follow', t);
  // the lexicon's two (crisis) stay the lexicon's: the safety lexicons are another unit's
  for (const t of P.CHECK_LEXICON_CARE) assert.equal(checkText(t).level, 'crisis', t);
  // and every negative is the gentle path on both screens, never the question (a death is named)
  for (const t of P.OWN_GRIEF_60) {
    assert.equal(lossRoute(t), 'gentle', t);
    assert.equal(visit(t, { server: STUBS.grief }).route, 'gentle', t);
  }
});

// ------------------------------------------------------------------------- blocking item 2 --
test('blocking 2: "killed him self", "died by his own hand" are a suicide named: care, gently, 0 requests on both screens', () => {
  for (const t of [...P.CHECK_SUICIDE, ...P.OWN_SUICIDE]) {
    assert.equal(GR.suicideDeath(t), true, t);
    assert.deepEqual(mainRead(t), { level: 'care', category: 'suicide-loss', matched: null }, t);
    angleCare(t);
    assert.deepEqual(visit(t, { server: STUBS.grief }).careLines, SAFETY.careGentle, t);
  }
  for (const t of P.OWN_SUICIDE_NEG) assert.equal(GR.suicideDeath(t), false, t);
  // the reflexive with the space keeps the earlier exceptions ("killed him self laughing", "shot him self in the foot")
  for (const t of ['he killed him self laughing at that', 'my brother shot him self in the foot at paintball']) assert.equal(GR.suicideDeath(t), false, t);
});

// ------------------------------------------------------------------------- blocking item 3 --
test('blocking 3 (final round 5): the speaker\'s everyday sayings are the speaker\'s again: never the play question, nothing sent', () => {
  // (final round 5: round 4 read these as no death, the ordinary question; its frames also turned real notes, "when you read this
  // I'll be dead", into the play question, so they are gone) the speaker always counts: the gentle path (a false gentle, the safe
  // side: a known issue), or care where 931fbb0 read care; never asked to play, and Another Angle sends nothing
  assert.equal(P.CHECK_IDIOMS.length, 14);
  assert.equal(P.OWN_IDIOMS.length, 15);
  const routes = {};
  for (const t of [...P.CHECK_IDIOMS, ...P.OWN_IDIOMS]) {
    const r = mainRead(t);
    const k = isCare(r) ? 'care' : r.level === 'concern' ? 'gentle' : r.unsure ? 'ask' : 'play';
    routes[k] = (routes[k] || 0) + 1;
    // (asked only when the dead one is no one: a thing, never the speaker)
    if (k === 'play' || k === 'ask') { assert.notEqual(whoDied(blankOrdinary(norm(t)), 'loss'), 'self', t); continue; }
    for (const s of STUB_NAMES) {
      const R = visit(t, { server: STUBS[s] || null, answer: null });
      assert.equal(R.requests, 0, `${t} @${s}`);
      assert.equal(R.asked, false, `${t} @${s}`);
    }
  }
  console.log('r5 the speaker\'s sayings (29):', JSON.stringify(routes));
  // the ones about a thing, never the speaker ("I killed my plants again"), may still be asked
  assert.ok((routes.gentle || 0) + (routes.care || 0) >= 24, JSON.stringify(routes));
  // "I'll die if he sees me like this" is care again, as at 931fbb0 (the gate)
  assert.equal(GR.selfEnding("i'll die if he sees me like this"), true);
  assert.equal(GR.selfEnding("my dad died and i'll die if he sees me like this"), true);
});

test('blocking 3: a real disclosure or a wish still counts (the lexicon\'s crisis or care, or the gentle path), never an everyday saying', () => {
  const who = (t) => whoDied(blankOrdinary(norm(t)), 'loss');
  // ("I tried to kill myself" is the lexicon's alone: "kill" is no weak death word)
  for (const t of P.SELF_REAL_ESC.filter((x) => !/tried/u.test(x))) assert.equal(who(t), 'self', t);
  assert.equal(mainRead('I nearly killed myself last year').level, 'crisis');
  assert.equal(mainRead('I tried to kill myself').level, 'crisis');
  assert.equal(mainRead('I want to die').level, 'crisis');
  assert.equal(mainRead('I feel like dying').level, 'concern');
  // a wish is never a saying, whatever the frame; nor is a feeling ("I feel dead inside"), nor a frame-less near death
  for (const t of ['i want to die lol', 'i feel dead inside', 'i nearly died last year', 'i nearly died when my appendix burst', "i'm dying", 'i want to die haha']) assert.equal(who(t), 'self', t);
  // (final round 5) the frames are gone: the speaker counts, whatever is round the words
  for (const t of ["i'm dead lol", 'i died when he said that', 'i killed myself laughing']) assert.equal(who(t), 'self', t);
});

// ------------------------------------------------------------------------- item 4: the safety net --
// (final round 6) "I'm ready to go" is a first-person future ending (grief.js noteShape, the check of integ/final-r5): care now, with
// nothing sent; the other borderline wishes stay the gentle path, held
const NOW_CARE = ["my husband passed and i'm ready to go"];
test('item 4: the check\'s borderline wishes and the sea are the gentle path with NOTHING sent (every server answer), never care', () => {
  for (const t of NOW_CARE) {
    assert.equal(GR.deathCare(t), 'follow', t);
    for (const s of STUB_NAMES) assert.deepEqual([visit(t, { server: STUBS[s] || null }).route, visit(t, { server: STUBS[s] || null }).requests], ['follow', 0], `${t} @${s}`);
  }
  for (const t of [...P.CHECK_BORDERLINE, ...P.CHECK_SEA].filter((x) => !NOW_CARE.includes(x))) {
    assert.equal(GR.keepLocal(t), true, t);
    assert.equal(GR.deathCare(t), null, `${t}: never care`);
    for (const s of STUB_NAMES) {
      const R = visit(t, { server: STUBS[s] || null });
      // (final round 5: R.held is the net's reading, whatever the server; nothing is sent from the gentle path anyway)
      assert.deepEqual([R.route, R.requests, R.held], ['gentle', 0, true], `${t} @${s}`);
      // the authored gentle lines (lines.js GRIEF via gentleScene), support close (GRIEF.ask offers it)
      assert.ok(R.said.includes(GRIEF.heard[0] ?? GRIEF.heard) || R.said.some((l) => [GRIEF.heard].flat().includes(l)), `${t}: heard`);
      assert.equal(R.scenes[0]?.source === 'server', false, `${t}: never the server's lines`);
    }
    // the main screen: still the gentle path (concern), the Support pill (careBeat), and no world (supportFirst)
    const r = mainRead(t);
    assert.equal(r.level, 'concern', t);
    assert.equal(r.supportFirst, true, t);
  }
});

test('item 4: ordinary deaths: the gentle path, and Another Angle sends nothing for them now (final round 5)', () => {
  for (const t of P.ORDINARY_DEATHS) {
    assert.equal(GR.keepLocal(t), false, t);
    assert.deepEqual(mainRead(t), { level: 'concern', category: 'loss', matched: null }, t);
    // (final round 5: it was 1 request and the server's lines with sharing on) the authored gentle lines, 0 requests
    const R = visit(t, { server: STUBS.grief });
    assert.deepEqual([R.route, R.requests, R.held], ['gentle', 0, false], t);
    assert.notEqual(R.scenes[0].source, 'server', t);
  }
  // the net's count on this unit's 60 grief negatives: held local (not sent), never care
  const held = P.OWN_GRIEF_60.filter((t) => GR.keepLocal(t));
  console.log('r4 safety net on 60 grief negatives (kept local, not care):', held.length, JSON.stringify(held));
  assert.ok(held.length <= 6, held.join(' | '));
  for (const t of held) assert.deepEqual([visit(t, { server: STUBS.grief }).requests, GR.deathCare(t)], [0, null], t);
  // the one who died is taken out first: their death never fires it ("he's gone", "his grave", "watched her die")
  for (const t of ["my best mate died and i can't believe he's gone", 'my mum died and i went to her grave today', 'my nan died and i watched her die in hospital',
    'my dad died and i keep thinking about the day he died', 'cancer killed my mum and i miss her', 'my grandma died and i wish i had been there at the end',
    'my mum died and i want to scatter her ashes in the sea', 'my dad died and i went over to my aunts', 'my nan died and i live with my grandad now']) assert.equal(GR.keepLocal(t), false, t);
  // everything the check called borderline, in other words, is held too
  for (const t of ['my wife died and i just want it all to be over', 'my dad died and i give up', 'my mum died and i cant do this anymore', 'my son died and theres no point',
    'my dad died and i want to be with him in heaven someday', 'my husband died and i keep driving past the bridge', 'my nan died and i just want to sleep and not wake up',
    'my dad died and part of me wants to disappear', 'my dad died and nothing matters, nothing left', 'my dad died and i dont see the point of anything']) assert.equal(GR.keepLocal(t), true, t);
});

test('item 4 in Another Angle (final round 5): griefMode sends nothing at all; the unsure path reads the net before its request', () => {
  // (final round 5: it was "griefMode reads the net before its request") the gentle path has no client call, whatever the words
  const grief = between(AA, 'async function griefMode(', 'const heavySeen = ');
  assert.doesNotMatch(grief, /client\.|serverMode\(\)/);
  // the authored gentle lines, support close (the Support pill, GRIEF.ask)
  assert.ok(grief.indexOf('if (!scene) scene = gentleScene(') > 0);
  assert.match(grief, /supportPill\.hidden = false;/);
  // unsure words with the net's words: "Another angle" plays Zuzu's own angle, nothing sent
  const start = between(AA, 'async function startAngle(', 'const FIRST_QUESTION = {');
  const at = start.indexOf('S.local = S.unsure && keepLocal(S.text);');
  assert.ok(at > 0 && at < start.indexOf('client.angle('), 'before the request');
  assert.match(start, /const req = serverMode\(\) && !S\.local\s*\?/);
  assert.match(AA, /import \{[^}]*\bkeepLocal\b[^}]*\} from '\.\/grief\.js';/);
  // still never care: the gentle path reads the care rules first
  assert.ok(grief.indexOf('if (deathEscalation(S.text))') < grief.indexOf('say(GRIEF.heard') && grief.indexOf('if (suicideDeath(S.text))') < grief.indexOf('say(GRIEF.heard'));
});

test('item 4 on the main screen: supportFirst offers no world (not even somewhere calm) and keeps the Support pill, without care', () => {
  // readSafety marks it, at the gentle path's level (concern), never care; the lexicon's concern beside a death too
  assert.match(IO, /if \(route === 'gentle'\) return \{ level: 'concern', category: 'loss', matched: null, \.\.\.\(held\(\) \? \{ supportFirst: true \} : \{\}\) \};/);
  assert.deepEqual(mainRead('my dad died and i wish i could just disappear'), { ...checkText('my dad died and i wish i could just disappear'), supportFirst: true });
  // seen while typing at the same level, it still reaches the scene (report)
  assert.match(between(IO, 'function report(r) {', 'let supportShown'), /const first = !!r\.supportFirst && !worst\.supportFirst && r\.level !== 'none';/);
  // the scene: sticky for the visit, and careChoice offers no world before any is looked up (careBeat already showed the pill)
  assert.match(between(HF, 'function noteSafety(r) {', 'function noteNoResume('), /if \(r\?\.supportFirst\) S\.supportFirst = true;/);
  const choice = between(HF, 'async function careChoice(', 'function calmTheWorld(');
  // (fix round: with something to tap — [See support] [Stay here quietly], supportChoice, which offers no world either)
  const no = choice.indexOf('if (S.deathCare || S.supportFirst) { await supportChoice(); return; }');
  { const sc = HF.slice(HF.indexOf('async function supportChoice('), HF.indexOf('async function gentleWorld(')); assert.doesNotMatch(sc, /gentleWorld|playCalm|startFlow|calmTheWorld/); assert.match(sc, /if \(S\.hold === 'quiet' && worldMode\) endQuietWorld\(\);/); }
  assert.ok(no > 0 && no < choice.indexOf('await gentleWorld('), 'before any world is looked up');
  assert.match(between(HF, 'async function careBeat(', 'async function careAgain('), /supportPill\.hidden = false;/);
  // and the gentle path's level is never raised by it
  for (const t of P.CHECK_BORDERLINE.filter((x) => !NOW_CARE.includes(x))) assert.ok(!isCare(mainRead(t)), t);
  for (const t of NOW_CARE) assert.deepEqual([mainRead(t).level, mainRead(t).category], ['care', 'death-follow'], t);
});

// ------------------------------------------------------------------------- rules, not phrases --
test('rules, not phrases: no test sentence is written into grief.js or death-words.js', () => {
  const code = ['src/beyond/grief.js', 'src/beyond/death-words.js'].map(read).join('\n').split('\n').filter((l) => !/^\s*(?:\/\/|\/?\*)/.test(l)).join('\n').toLowerCase();
  for (const t of [...P.CHECK_ESC_ALL, ...P.OWN_ESC, ...P.CHECK_IDIOMS, ...P.OWN_IDIOMS, ...P.CHECK_BORDERLINE, ...P.CHECK_SUICIDE]) {
    assert.ok(!code.includes(norm(t).toLowerCase()), `not pinned as a phrase: ${t}`);
  }
});

test('the new rules stay cheap: 2,000 characters built to make them work hard take a few ms', () => {
  // the fastest of seven runs (see r5.test.mjs): a CI runner's pauses inflate any one run; a bad backtrack slows them all
  const best = (xs) => Math.min(...xs);
  for (const seed of ['i i i i ', 'it would be better it would be ', 'if i if i was ', 'wherever wherever where he ', 'god god take take me ', 'everyone would be so much better off if ',
    'i keep thinking about driving ', 'hope i dont hope i ', 'in heaven and i want to go ', "i'm dead lol i'm dying haha ", 'let me let me let me ', 'over over here here not ']) {
    const t = seed.repeat(Math.ceil(2000 / seed.length)).slice(0, 2000);
    for (const f of [GR.keepLocal, GR.selfEnding]) {
      f(t);
      const xs = [];
      for (let i = 0; i < 7; i++) { const t0 = performance.now(); f(t); xs.push(performance.now() - t0); }
      assert.ok(best(xs) < 40, `${f.name} ${seed}: ${best(xs).toFixed(1)} ms (fastest of 7)`);
    }
  }
});
