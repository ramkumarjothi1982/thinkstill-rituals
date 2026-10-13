import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { checkSafety, supportPayload, outputIsSafe } from '../src/safety/index.js';
import { HARM_LEXICON } from '../src/safety/shared-lexicon.js';
import { VISIBLE_FIELDS } from '../src/gate.js';
import { anchor } from './helpers.js';

const APP_LEXICON = new URL('../../../src/data/safety-lexicon.js', import.meta.url);

test('the shared lexicon is an exact copy of the app\'s (run `npm run sync:lexicon` if this fails)', { skip: !existsSync(APP_LEXICON) && 'app lexicon not in this checkout' }, () => {
  const ours = readFileSync(new URL('../src/safety/shared-lexicon.js', import.meta.url), 'utf8');
  const theirs = readFileSync(APP_LEXICON, 'utf8');
  assert.equal(ours, theirs);
});

test('the server catches at least everything the app\'s detector catches', { skip: !existsSync(APP_LEXICON) && 'app lexicon not in this checkout' }, async () => {
  const app = await import(new URL('../../../src/engine/safety.js', import.meta.url).href).catch(() => null);
  if (!app || typeof app.checkText !== 'function') return;
  const samples = [
    'I want to kill myself', 'nobody would miss me', "I've been thinking of ending it", 'my friend wants to kill herself',
    'I want to disappear forever', 'my partner threatens me', 'he hit me last night', 'I am being bullied at work',
    'I can\'t cope any more', 'this deadline is killing me', 'my boss embarrassed me in front of everyone',
  ];
  for (const s of samples) {
    const a = app.checkText(s).level;
    const b = checkSafety(s).level;
    const rank = { none: 0, concern: 1, care: 2, crisis: 3 };
    assert.ok(rank[b] >= rank[a], `${s}: app=${a} server=${b}`);
  }
});

test('crisis phrases (including the ones the audit found missed) stop the reframe', () => {
  for (const s of [
    'I want to kill myself', 'Honestly nobody would miss me', "I've been thinking of ending it all", 'I want to disappear forever',
    'I took all my pills', "What's the point of living", 'There is no reason to go on', 'I keep hurting myself',
    'everyone would be better off without me', 'I want it all to stop for good',
  ]) {
    const r = checkSafety(s);
    assert.equal(r.level, 'crisis', s);
    assert.equal(r.category, 'self-harm', s);
  }
  for (const s of ['My friend wants to kill herself', 'She said she would hurt herself tonight', 'my brother took an overdose']) {
    assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'someone-in-danger' }, s);
  }
});

test('harm disclosures are care, never reframed', () => {
  const cases = [
    ['My partner threatens me when I go out', 'threat'], ['He hit me last night', 'violence'], ['I am being bullied at work', 'harassment'],
    ['My ex keeps stalking me', 'harassment'], ['I was sexually assaulted', 'abuse'], ['They called me a slur because I am gay', 'discrimination'],
    ["I don't feel safe at home", 'unsafe'], ['He won\'t let me see my friends', 'abuse'],
  ];
  for (const [s, cat] of cases) assert.deepEqual(checkSafety(s), { level: 'care', category: cat }, s);
});

test('everyday idioms and ordinary worries are not flagged', () => {
  for (const s of [
    'This deadline is killing me', 'I nearly died of embarrassment in the meeting', "I'm dying to know if I got the job",
    'My boss embarrassed me in front of everyone', "He hasn't replied for five hours", 'I want to end it with my boyfriend',
    'I failed my exam and I feel useless',
  ]) assert.equal(checkSafety(s).level, 'none', s);
  assert.equal(checkSafety("I can't cope with this workload").level, 'concern');
});

test('support payloads carry the authored copy and resources, never the person\'s words', () => {
  const text = 'nobody would miss me if I was gone';
  const r = checkSafety(text);
  const s = supportPayload(r.level === 'crisis' ? 'crisis' : 'care', r.category, 'lexicon');
  assert.equal(s.level, 'crisis');
  assert.ok(s.resources.some((x) => /116 123/.test(x.detail)));
  assert.ok(!JSON.stringify(s).includes('miss me'));
  assert.ok(!('matched' in r));
  const g = supportPayload('care', null, 'model');
  assert.equal(g.category, 'general');
  assert.match(g.message, /support/);
});

test('output post-check rejects harm language in what the model wrote', () => {
  assert.equal(outputIsSafe(anchor(1), VISIBLE_FIELDS), true);
  assert.equal(outputIsSafe(anchor(1, { subtitle_line_2: 'Maybe you want to hurt yourself over a message.' }), VISIBLE_FIELDS), false);
});

test('lexicon entries are valid regular expressions', () => {
  for (const list of [HARM_LEXICON.idiomGuards, HARM_LEXICON.crisis, HARM_LEXICON.crisisOther, ...Object.values(HARM_LEXICON.care)]) {
    for (const src of list) assert.doesNotThrow(() => new RegExp(src, 'i'), src);
  }
});

test('server-only additions catch the review\'s missed crisis wordings (sent to W3 for the shared lexicon)', () => {
  for (const s of [
    "I've been stockpiling my pills.", "I've been saving up my tablets.", "I'm so done with life.", "I don't see a way out anymore.",
    'There is no way out.', 'I just want to sleep forever.', 'I want to go to sleep and not wake up.',
    "I don't think anyone would notice if I wasn't around.", 'Nobody would care if I wasn\'t here any more.',
    'Life is pointless.', "I'm a burden.",
  ]) assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'self-harm' }, s);
  for (const s of ['My friend is cutting herself again.', "My friend told me she's been cutting herself again.", 'My brother has been starving himself.', 'She cut herself again last night.']) {
    assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'someone-in-danger' }, s);
  }
  assert.deepEqual(checkSafety('My partner checks my phone every night.'), { level: 'care', category: 'abuse' });
  assert.deepEqual(checkSafety('Someone at school keeps calling me names.'), { level: 'care', category: 'harassment' });
  assert.deepEqual(checkSafety('My boss keeps touching my shoulder and I hate it.'), { level: 'care', category: 'harassment' });
});

test('the additions leave everyday wording alone', () => {
  for (const s of [
    "I'm so tired I could sleep forever.", "There's no way out of this contract until March.", "I can't see a way out of this car park.",
    "I'm done with this job.", "I've been saving up for a holiday.", 'Collecting my pills from the pharmacy stressed me out.',
    'She cut herself a slice of cake.', 'He cut himself shaving.', 'I feel like a burden on the team this week.', 'My boss keeps checking my work.',
  ]) assert.equal(checkSafety(s).level, 'none', s);
});

// --- Regressions from the W6 review, round 2 (12 Oct 2026) -------------------
// Every one of these returned "none" before, so a model timeout or refusal
// would have sent the person to the authored reframe engine.

test('review round 2: the eight missed disclosures now stop the reframe', () => {
  for (const s of ['I took a load of paracetamol', 'I took a load of paracetamol an hour ago', "I've started cutting again", 'I just want to not exist', "i wish i'd never been born", "There's no point in me being alive"]) {
    assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'self-harm' }, s);
  }
  assert.deepEqual(checkSafety('My friend says she wants to end her life'), { level: 'crisis', category: 'someone-in-danger' });
  assert.deepEqual(checkSafety('my partner forces me to have sex'), { level: 'care', category: 'abuse' });
  assert.deepEqual(checkSafety('My uncle touches me and I hate it'), { level: 'care', category: 'abuse' });
});

test('medicines: more than a dose, taken or about to be, is crisis (first person) or someone in danger', () => {
  for (const s of [
    'I have taken a handful of tablets', "I've swallowed a packet of paracetamol", 'I took the whole box of sleeping pills', 'I took 30 paracetamol',
    'just took loads of ibuprofen', 'I took all of my antidepressants at once', "I OD'd last night", 'I have the pills lined up', 'How many paracetamol would it take',
  ]) assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'self-harm' }, s);
  for (const s of ['My friend took a load of paracetamol', 'My friend overdosed last night']) assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'someone-in-danger' }, s);
  // Idiom guards: an ordinary dose, or medicine taken as prescribed.
  for (const s of ['I took two paracetamol for my headache', 'I took all my meds on time today', 'I take a handful of tablets every morning for my heart']) assert.equal(checkSafety(s).level, 'none', s);
});

test('cutting and other self-harm in the first person; "cutting corners" and "cutting back" are not', () => {
  for (const s of [
    "I've been cutting", 'I keep cutting at night', "I'm cutting again", 'Cutting again. I hate myself.', 'I started cutting myself again', 'I relapsed and went back to cutting.',
    'I burned myself on purpose', 'I cut myself again last night', 'I keep scratching myself until I bleed',
  ]) assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'self-harm' }, s);
  for (const s of ['My sister has started cutting again', 'My son is self harming']) assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'someone-in-danger' }, s);
  for (const s of [
    "I've started cutting back on sugar again", 'I keep cutting corners at work', "I've been cutting my own hair", "I'm cutting the grass", 'They started cutting costs again',
    'I keep cutting and pasting the wrong file', 'My hairdresser is cutting my fringe again', "I've been cutting down on caffeine", 'I keep hitting myself in the face with my phone when I fall asleep',
  ]) assert.equal(checkSafety(s).level, 'none', s);
});

test('not existing, never having been born, no point in being alive', () => {
  for (const s of [
    "I don't want to exist any more", "I wish I didn't exist", 'I want to stop existing', 'I wish I had never been born', 'I should never have been born',
    'There is no point living', 'no point in going on', "I don't see the point in living any more", 'What is the point of living', "I'm tired of being alive",
    'I want my life to be over', 'I want to not wake up tomorrow', 'I wish I could fall asleep and never wake up', "I can't keep living like this any more",
    'I have a plan to end it', "I'm standing on the bridge", 'Nobody would care if I died', 'I keep thinking about dying', 'I keep looking up ways to die',
  ]) assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'self-harm' }, s);
  for (const s of [
    "I'd rather not wake up early tomorrow", "There's no point going on about it", "There's no point living in London if you can't afford it",
    "There's no point in going on holiday this year", "I'm tired of living with my parents", 'I wish I had been born in the eighties',
    "I can't live like this, my flat is a mess", 'Ways to end it with my boyfriend nicely',
  ]) assert.equal(checkSafety(s).level, 'none', s);
});

test('someone else wanting to die or end their life is someone in danger', () => {
  for (const s of [
    'My brother told me he is planning to end his life', 'She keeps saying she wants to die', "My friend says she doesn't want to be alive any more",
    'He wants to end it all', 'My mate keeps talking about ending his life',
  ]) assert.equal(checkSafety(s).level, 'crisis', s);
  for (const s of ['My phone is going to die', 'My plants want to die', 'The vet said she was going to die soon', 'My friend wants to end it with her boyfriend']) {
    assert.equal(checkSafety(s).level, 'none', s);
  }
});

test('sexual coercion, touching and violence are care, never reframed', () => {
  const cases = [
    ['My boyfriend forces me to do things', 'abuse'], ['He pressures me into sex', 'abuse'], ['He made me have sex', 'abuse'], ["He doesn't stop when I say no", 'abuse'],
    ["I didn't consent", 'abuse'], ['My stepdad touched me', 'abuse'], ['My coach keeps touching me', 'abuse'], ['He touches me down there', 'abuse'],
    ['He touched me and I froze', 'abuse'], ['My mum’s boyfriend touches me', 'abuse'], ['My dad touches me at night', 'abuse'], ['He forced himself on me', 'abuse'],
    ['She locked me in my room for hours', 'abuse'], ['My step-dad hits me', 'violence'], ['my dad sometimes hits me', 'violence'], ['my grandad hits me', 'violence'],
    ['He put his hands round my neck', 'violence'], ['He keeps asking me for nudes', 'harassment'], ["I'm scared he'll hurt me", 'unsafe'],
  ];
  for (const [s, cat] of cases) assert.deepEqual(checkSafety(s), { level: 'care', category: cat }, s);
  assert.equal(checkSafety('My teacher groped me').level, 'care');
  assert.equal(checkSafety('He said he will hurt me if I leave').level, 'care');
  for (const s of [
    'My mum forces me to do my homework', 'My boss forces me to do things I am not paid for', 'He makes me sleep with the light on',
    'My teacher touched me on the shoulder to get my attention', 'It hits me hard when I see old photos', 'My anxiety sometimes hits me at night',
    'My mum will kill me if I tell her I failed', "I'm worried my boss will kill me", 'My parents shared my photos without my consent',
    'My flatmate locked me out by accident', 'My mum touched my hair and said it looked nice', "I'm banging my head against the wall with this code",
  ]) assert.equal(checkSafety(s).level, 'none', s);
});

test('server-only lexicon entries are valid regular expressions, and the module warms them on load', async () => {
  const { EXTRA_LEXICON } = await import('../src/safety/extra-lexicon.js');
  for (const list of [EXTRA_LEXICON.idiomGuards, EXTRA_LEXICON.crisis, EXTRA_LEXICON.crisisOther, ...Object.values(EXTRA_LEXICON.care)]) {
    for (const src of list) assert.doesNotThrow(() => new RegExp(src, 'i'), src);
  }
  const { warmSafety } = await import('../src/safety/index.js');
  assert.equal(typeof warmSafety, 'function');
});

test('support titles never say "reframe" (jargon the gate bans; the feature is Another Angle)', () => {
  for (const [level, cat] of [['crisis', 'self-harm'], ['crisis', 'someone-in-danger'], ['care', 'abuse'], ['care', 'violence'], ['care', 'threat'], ['care', 'harassment'], ['care', 'discrimination'], ['care', 'unsafe'], ['care', null]]) {
    const p = supportPayload(/** @type {any} */ (level), cat, 'lexicon');
    assert.doesNotMatch(`${p.title} ${p.message} ${p.still_here}`, /reframe/i, `${level}/${cat}`);
    assert.doesNotMatch(`${p.title} ${p.message}`, /\bAI\b/);
  }
});

test('review round 2, further variants: fillers, urges, vanishing, jumping, coercion, family violence, image threats', () => {
  for (const s of ['took like 20 paracetamol', 'I took way too many pills', "I've taken more pills than I should have", 'I keep wanting to cut again', 'I want to vanish forever', 'I wish I could cease to exist', "I'd be better off gone", "I'm going to jump"]) {
    assert.deepEqual(checkSafety(s), { level: 'crisis', category: 'self-harm' }, s);
  }
  for (const s of ['My friend is going to jump off the bridge', 'My friend says she is going to jump']) assert.equal(checkSafety(s).level, 'crisis', s);
  for (const [s, cat] of [["He made me do things I didn't want to", 'abuse'], ['A man touched me on the bus', 'harassment'], ['He rubbed himself against me on the train', 'harassment'], ['My dad beats my mum', 'violence'], ['My stepdad hits my mum', 'violence'], ["They said they'd share my nudes", 'threat']]) {
    assert.deepEqual(checkSafety(s), { level: 'care', category: cat }, s);
  }
  for (const s of [
    'My sister is going to jump on the trampoline', 'I want to cut my hair short', 'I have the urge to cut back on sugar', 'My boss makes me do things I am not paid for',
    'My coach makes me do things like extra laps', "He hurt my mum's feelings", 'I want to be gone by five', 'I jumped to conclusions again', 'I need to cut down on screen time',
    'I want to cut ties with her', 'The team would be better off with a new manager',
  ]) assert.equal(checkSafety(s).level, 'none', s);
});

// B5 review (13 Oct 2026). The shared guards are blanked before this server's own list is read, so a shared guard
// that reaches past its idiom hides what the server caught before B5. Each of these was crisis on the server before
// the merge (5002158), was blanked to none by a B5 guard or sits next to one, and must be crisis.
const B5_REVIEW_CRISIS = [
  'I just want to sleep and never wake up at all', 'I want to fall asleep and not wake up at all', 'I want to not exist on this earth any more',
  "I can't see any point in going on at all", 'My friend has been cutting herself a lot lately', 'My sister is cutting herself a lot again',
  'She keeps starving herself some days', 'my daughter is burning herself some nights', 'I am done with living here on this earth',
  'All my pills are lined up for bed and I want it to be over', 'I do not see the point in going on with my life',
  'I would rather not exist on this planet', "I don't see the point of carrying on with anything",
  "I'm done with living at all", "I'm done with living in pain", "I'm done with living with this pain", 'my pills are lined up for the morning',
  "She's cutting herself a little every night", 'He keeps starving himself some weeks', "I'm on the roof terrace edge and I want to jump",
  'I want to stop living for good', "I have a plan to end it with my friend's pills", "I'd be better off gone from this world",
  'What is the point of trying any more with my life',
];

test('B5 review: no shared guard hides a disclosure the server caught before the merge', () => {
  for (const s of B5_REVIEW_CRISIS) assert.equal(checkSafety(s).level, 'crisis', s);
  // one shared guard at a time: its span must never hold the disclosure on its own
  const guards = HARM_LEXICON.idiomGuards.map((src) => new RegExp(src, 'gi'));
  for (const s of B5_REVIEW_CRISIS) {
    for (const g of guards) {
      g.lastIndex = 0;
      const blanked = s.replace(g, (m) => ' '.repeat(m.length));
      if (blanked !== s) assert.equal(checkSafety(blanked).level, 'crisis', `guard /${g.source.slice(0, 80)}…/ hides: ${s}`);
    }
  }
  for (const s of ['He threatened us with a knife', 'My dad keeps hitting my daughter with a belt']) assert.equal(checkSafety(s).level, 'care', s);
});

test('B5 review: the shared everyday guards (jump off the call, stop living paycheck to paycheck …) are none here too', () => {
  for (const s of [
    "I'm going to jump off the call in five minutes", "I'm ready to jump from this job to a better one", 'I need to stop living paycheck to paycheck',
    'I just want to stop living out of a suitcase', 'I have a plan to end it with my girlfriend kindly', "I can't see a way out of this argument with my sister",
    "I'd be better off gone from this company", 'What is the point of trying any more with this diet', 'He threatened us with a parking ticket',
    'My son keeps hitting my daughter with pillows', "I'm done with living in London", 'I want to sleep and not wake up until noon',
  ]) assert.equal(checkSafety(s).level, 'none', s);
});
