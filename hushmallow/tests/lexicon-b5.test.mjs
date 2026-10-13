// Integration B5 (12 Oct 2026): the Another Angle server's own safety list (W6 r3,
// server/another-angle/src/safety/extra-lexicon.js) merged into the shared lexicon
// (src/data/safety-lexicon.js), so the app's check, which runs before anything is
// sent, is never the weaker one. Regression tests: what the merge catches, and the
// everyday wording next to it that must stay none.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { checkText, safetyCopy } from '../src/engine/safety.js';
import { interpret } from '../src/engine/interpret.js';
import * as LEX from '../src/data/safety-lexicon.js';

const root = fileURLToPath(new URL('../', import.meta.url));

const level = (t) => checkText(t).level;

test('B5: the server’s medicine, cutting and not-existing wordings are crisis in the app too (self-harm)', () => {
  for (const t of [
    'I took a load of paracetamol', 'I took a load of paracetamol an hour ago', 'I have taken a handful of tablets', "I've swallowed a packet of paracetamol",
    'I took the whole box of sleeping pills', 'I took 30 paracetamol', 'took like 20 paracetamol', 'just took loads of ibuprofen', 'I took all of my antidepressants at once',
    "I've taken more pills than I should have", "I OD'd last night", 'I have the pills lined up', 'How many paracetamol would it take', "I've been stockpiling my pills.",
    "I've been saving up my tablets.", "I've started cutting again", "I've been cutting", 'I keep cutting at night', 'Cutting again. I hate myself.',
    'I relapsed and went back to cutting.', 'I keep wanting to cut again', 'I cut myself again last night', 'I keep scratching myself until I bleed',
    'I just want to not exist', "I don't want to exist any more", 'I wish I could cease to exist', "i wish i'd never been born", 'I should never have been born',
    "There's no point in me being alive", 'There is no point living', 'no point in going on', "I don't see the point in living any more", 'What is the point of living',
    "I'm tired of being alive", 'I want my life to be over', 'I want to not wake up tomorrow', 'I wish I could fall asleep and never wake up',
    "I can't keep living like this any more", 'I have a plan to end it', "I'm standing on the bridge", 'Nobody would care if I died', 'I keep thinking about dying',
    'I keep looking up ways to die', "I'm so done with life.", 'There is no way out.', 'I just want to sleep forever.', 'I want to go to sleep and not wake up.',
    "I don't think anyone would notice if I wasn't around.", "Nobody would care if I wasn't here any more.", 'Life is pointless.', "I'm a burden.",
    'I want to vanish forever', "I'd be better off gone", "I'm going to jump", "I'm thinking of jumping off the roof",
  ]) {
    const r = checkText(t);
    assert.equal(r.level, 'crisis', `${t} → ${r.level}`);
    assert.equal(r.category, 'self-harm', `${t} → ${r.category}`);
    assert.equal(interpret(t).safety.level, 'crisis', `interpret: ${t}`);
  }
});

test('B5: someone else in danger is crisis (the app checks the first person first, so the copy may be the self-harm one)', () => {
  for (const t of [
    'My friend is cutting herself again.', "My friend told me she's been cutting herself again.", 'My brother has been starving himself.', 'She cut herself again last night.',
    'My friend says she wants to end her life', 'My friend took a load of paracetamol', 'My friend overdosed last night', 'My sister has started cutting again', 'My son is self harming',
    'My brother told me he is planning to end his life', 'She keeps saying she wants to die', "My friend says she doesn't want to be alive any more", 'He wants to end it all',
    'My mate keeps talking about ending his life', 'My friend is going to jump off the bridge', 'My friend says she is going to jump', 'She said she would hurt herself tonight',
  ]) assert.equal(level(t), 'crisis', t);
  // the someone-else copy where no first-person pattern reads the words first ('my friend overdosed' still meets
  // the app's own 'overdos…' crisis entry first; the server blanks the other-person spans before that check)
  for (const t of ['My friend is cutting herself again.', 'My brother told me he is planning to end his life', 'She said she would hurt herself tonight']) {
    assert.equal(checkText(t).category, 'someone-in-danger', t);
  }
});

test('B5: coercion, touching, monitoring, family violence and image threats are care, never an angle', () => {
  for (const [t, category] of [
    ['my partner forces me to have sex', 'abuse'], ['My uncle touches me and I hate it', 'abuse'], ['My partner checks my phone every night.', 'abuse'],
    ['My boyfriend forces me to do things', 'abuse'], ['He pressures me into sex', 'abuse'], ['He made me have sex', 'abuse'], ["He doesn't stop when I say no", 'abuse'],
    ["I didn't consent", 'abuse'], ['My stepdad touched me', 'abuse'], ['He touches me down there', 'abuse'], ['He touched me and I froze', 'abuse'],
    ['He forced himself on me', 'abuse'], ['She locked me in my room for hours', 'abuse'], ["He made me do things I didn't want to", 'abuse'],
    ['My step-dad hits me', 'violence'], ['my dad sometimes hits me', 'violence'], ['my grandad hits me', 'violence'], ['He put his hands round my neck', 'violence'],
    ['My dad beats my mum', 'violence'], ['My stepdad hits my mum', 'violence'],
    ['Someone at school keeps calling me names.', 'harassment'], ['My boss keeps touching my shoulder and I hate it.', 'harassment'], ['He keeps asking me for nudes', 'harassment'],
    ['A man touched me on the bus', 'harassment'], ['He rubbed himself against me on the train', 'harassment'],
    ["They said they'd share my nudes", 'threat'], ['He said he will hurt me if I leave', 'threat'], ["I'm scared he'll hurt me", 'unsafe'], ["I'm scared for my safety", 'unsafe'],
  ]) {
    const r = checkText(t);
    assert.equal(r.level, 'care', `${t} → ${r.level}`);
    assert.equal(r.category, category, `${t} → ${r.category}`);
  }
});

test('B5: everyday wording near the merged patterns stays none (the three the plan names first)', () => {
  for (const t of [
    // integration plan B5 step 2
    'overdosing on caffeine', 'I keep overdosing on caffeine before exams', 'hurting myself at the gym', 'I keep hurting myself at the gym',
    "I don't want to live with my parents", 'i dont want to live with my parents anymore',
    // the server's own everyday lists
    "I'm so tired I could sleep forever.", "There's no way out of this contract until March.", "I can't see a way out of this car park.", "I'm done with this job.",
    "I've been saving up for a holiday.", 'Collecting my pills from the pharmacy stressed me out.', 'She cut herself a slice of cake.', 'He cut himself shaving.',
    'I feel like a burden on the team this week.', 'My boss keeps checking my work.', 'I took two paracetamol for my headache', 'I took all my meds on time today',
    'I take a handful of tablets every morning for my heart', "I've started cutting back on sugar again", 'I keep cutting corners at work', "I've been cutting my own hair",
    "I'm cutting the grass", 'They started cutting costs again', 'I keep cutting and pasting the wrong file', 'My hairdresser is cutting my fringe again',
    "I've been cutting down on caffeine", 'I keep hitting myself in the face with my phone when I fall asleep', "I'd rather not wake up early tomorrow",
    "There's no point going on about it", "There's no point living in London if you can't afford it", "There's no point in going on holiday this year",
    "I'm tired of living with my parents", 'I wish I had been born in the eighties', "I can't live like this, my flat is a mess", 'Ways to end it with my boyfriend nicely',
    'My phone is going to die', 'My plants want to die', 'The vet said she was going to die soon', 'My friend wants to end it with her boyfriend',
    'My mum forces me to do my homework', 'My boss forces me to do things I am not paid for', 'He makes me sleep with the light on',
    'My teacher touched me on the shoulder to get my attention', 'It hits me hard when I see old photos', 'My mum will kill me if I tell her I failed',
    'My parents shared my photos without my consent', 'My flatmate locked me out by accident', 'My mum touched my hair and said it looked nice',
    'My sister is going to jump on the trampoline', 'I want to cut my hair short', 'I have the urge to cut back on sugar', 'I want to be gone by five',
    'I jumped to conclusions again', 'I want to cut ties with her', 'The team would be better off with a new manager',
    // found while merging: the server's patterns without the app's everyday exceptions (guards added in B5)
    "I'm going to jump off the diving board", "I'm thinking of jumping off the high board at the pool", 'Nobody would care if I died my hair green',
    'i keep cutting myself off mid sentence', "I'm done with living in London", "I'm done with life admin", "I've got my meds ready for the trip",
    'I want to not exist on social media for a week', "he's cutting himself off from his friends", "she's burning herself out",
    "I can't see the point in going on holiday", 'I want to sleep and not wake up until noon', 'My boss threatened my bonus', "I'm on the roof terrace with friends",
  ]) {
    const r = checkText(t);
    assert.equal(r.level, 'none', `${t} → ${r.level} (${r.matched})`);
  }
});

test('B5: what the guards blank never hides a disclosure next to it', () => {
  for (const t of ['I took all my pills on time today and then I took a load of paracetamol', 'my plants want to die and so do I, I want to die',
    "I'm done with life admin. I'm done with life.", 'my meds are ready for the trip but I have the pills lined up for tonight']) {
    assert.equal(level(t), 'crisis', t);
  }
  assert.equal(level('My boss threatened my bonus and threatened my family'), 'care');
});

test('B5: the support titles never say "reframe" (the feature is Another Angle), and the copy is otherwise unchanged', () => {
  assert.equal(LEX.HARM_COPY.crisis.title, 'Let’s pause Another Angle');
  for (const c of Object.values(LEX.HARM_COPY.care)) assert.doesNotMatch(c.title, /reframe/i);
  assert.equal(LEX.HARM_COPY.care.abuse.title, 'This one needs real support');
  assert.equal(LEX.HARM_COPY.crisisOther.title, 'Someone might be in danger');
  assert.match(safetyCopy(checkText('I want to kill myself')).message, /emergency number/);
  assert.doesNotMatch(JSON.stringify(LEX.HARM_COPY), /\bAI\b/);
});

test('B5: the merged lexicon is plain data, compiles without lookbehind, stays fast, and the server copy is synced', () => {
  const all = [...LEX.HARM_LEXICON.idiomGuards, ...LEX.HARM_LEXICON.crisis, ...LEX.HARM_LEXICON.crisisOther, ...Object.values(LEX.HARM_LEXICON.care).flat()];
  for (const src of all) {
    assert.doesNotThrow(() => new RegExp(src, 'gi'), src);
    assert.doesNotMatch(src, /\(\?<[=!]/, `no lookbehind: ${src.slice(0, 80)}`);
  }
  assert.equal(new Set(LEX.HARM_LEXICON.crisis).size, LEX.HARM_LEXICON.crisis.length, 'no duplicate crisis entries');
  const long = 'i took my tablets and i keep cutting the grass and i dont know, no point, my friend said '.repeat(25);
  const t0 = performance.now();
  checkText(long);
  assert.ok(performance.now() - t0 < 150, 'checkText on 2,000 characters stays fast');
  // the server's pre-check reads a verbatim copy (npm run sync:lexicon in server/another-angle)
  assert.equal(readFileSync(`${root}server/another-angle/src/safety/shared-lexicon.js`, 'utf8'), readFileSync(`${root}src/data/safety-lexicon.js`, 'utf8'));
});

// B5 review (13 Oct 2026). A guard blanks its words before every check, the server's included (the server
// compiles the shared guards before its own list), so a guard that reaches past its idiom hides a disclosure on
// both sides. The first ten were crisis on the server before B5 and the next three in the app too; the B5 guards
// made them none on both. Every one must stay crisis.
const B5_REVIEW_MUST_BE_CRISIS = [
  'I just want to sleep and never wake up at all', 'I want to fall asleep and not wake up at all', 'I want to not exist on this earth any more',
  "I can't see any point in going on at all", 'My friend has been cutting herself a lot lately', 'My sister is cutting herself a lot again',
  'She keeps starving herself some days', 'my daughter is burning herself some nights', 'I am done with living here on this earth',
  'All my pills are lined up for bed and I want it to be over',
  'I do not see the point in going on with my life', 'I would rather not exist on this planet', "I don't see the point of carrying on with anything",
  // the same guards, probed further: each idiom's own words with a disclosure in place of its object
  "I'm done with living at all", "I'm done with living in pain", "I'm done with living in this body", "I'm done with living with this pain",
  "I'm done with living on this earth", "I'm done with living here.", "I'm done with living here, I'm going to end it",
  'my pills are ready for tonight', 'my pills are lined up for the morning', 'All my pills are ready for the end', 'I want to not exist on this planet',
  "She's been cutting herself a lot", "She's cutting herself a little every night", 'My brother keeps burning himself a lot', 'He keeps starving himself some weeks',
  "I can't see the point in going on with my life", "I don't see the point in going on at all", 'I want to sleep and never wake up at all',
  'I want to fall asleep and never wake up for good', "I'm on the roof terrace edge and I want to jump",
  // next to the new everyday guards below
  "I'm going to jump off the bridge after the call", "I'm about to jump off a building", "I'm ready to jump from the tower", "I'm going to jump",
  'I want to stop living', 'I want to stop living for good', "I just want to stop living. I'm living out of a suitcase",
  'I have a plan to end it', 'I have a plan to end it with pills', "I have a plan to end it with my friend's pills", "I have a plan to end it with my dad's gun",
  "I can't see a way out", 'There is no way out of this', "There's no way out of this life", "I'd be better off gone", "I'd be better off gone from this world",
  "What's the point of trying any more", 'What is the point of trying any more with my life',
];

test('B5 review: the narrowed guards never blank a crisis disclosure (each was hidden by a B5 guard)', () => {
  for (const t of B5_REVIEW_MUST_BE_CRISIS) {
    const r = checkText(t);
    assert.equal(r.level, 'crisis', `${t} → ${r.level}`);
    assert.equal(interpret(t).safety.level, 'crisis', `interpret: ${t}`);
  }
  // a threat or a blow is still care next to the everyday 'threatened us with a parking ticket', 'hitting … with pillows'
  for (const t of ['He threatened us with a knife', 'He threatened me with a gun', 'My dad keeps hitting my daughter with a belt', 'My husband hits my son',
    'He threatened us with a parking ticket and then he threatened my family']) {
    assert.equal(level(t), 'care', t);
  }
});

test('B5 review: no single guard reaches past its idiom (its span never holds the disclosure)', () => {
  // Each must-be-crisis phrase is blanked by one guard at a time and checked again, so a guard that blanks too
  // much fails here by name, even where another pattern happens to catch the whole phrase.
  const guards = LEX.HARM_LEXICON.idiomGuards.map((src) => new RegExp(src, 'gi'));
  for (const t of B5_REVIEW_MUST_BE_CRISIS) {
    for (const g of guards) {
      g.lastIndex = 0;
      const blanked = t.replace(g, (m) => ' '.repeat(m.length));
      if (blanked === t) continue;
      assert.equal(checkText(blanked).level, 'crisis', `guard /${g.source.slice(0, 80)}…/ hides: ${t}`);
    }
  }
});

test('B5 review: everyday wording the merged server patterns read as crisis or care stays none in the free input', () => {
  for (const t of [
    // the review's probe (none in the app before B5, crisis or care after it)
    "I'm going to jump off the call in five minutes", "I'm about to jump off a meeting with my boss", "I'm ready to jump from this job to a better one",
    'I need to stop living paycheck to paycheck', 'I just want to stop living out of a suitcase', "I want to stop living for other people's approval",
    'I have a plan to end it with my girlfriend kindly', "I don't see a way out of this mess at work", "I can't see a way out of this argument with my sister",
    "I'd be better off gone from this company", 'What is the point of trying any more with this diet',
    'He threatened us with a parking ticket', 'My son keeps hitting my daughter with pillows',
    // close variants
    "I'll jump off the zoom in a minute", "I'm about to jump from one project to another", 'I want to stop living out of my car',
    'I need to stop living for the weekend', 'I want to end it with my boyfriend', "I can't see a way out of this argument", "I'd be better off gone from this team",
    "What's the point of trying any more at this game", 'He threatened me with detention', 'My boss threatened us with overtime',
    'My son keeps hitting my daughter with cushions', "I'm done with living here, I'm moving to Leeds", "I'm done with living with my parents",
    "I'm done with living at home", "I'm done with living out of a suitcase", 'My tablets are ready for the morning', "I'd rather not exist online",
    'He cut himself a break', "I don't see the point in going on about it", "I don't see the point in going on to university",
    "I can't see the point in carrying on with this course", 'I want to sleep and not wake up till 10am', 'I want to sleep and never wake up early again',
  ]) {
    const r = checkText(t);
    assert.equal(r.level, 'none', `${t} → ${r.level} (${r.matched})`);
  }
});
