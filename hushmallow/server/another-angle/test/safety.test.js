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
