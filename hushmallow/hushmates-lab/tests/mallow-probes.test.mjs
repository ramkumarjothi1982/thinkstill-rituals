// Every phrasing the adversarial reviews of the safety screen and the Mallow library found
// (tests/fixtures/mallow-probes.json), held to what each should get. Each library case is asked of
// every Mallow, three times over. Keyword rules are a floor, not a guarantee: these keep each fix
// from undoing another, and give the clinical review (docs/READINESS.md) a list to start from.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { screenFeeling } from '../core/feeling-safety.js';
import { libraryProvider } from '../core/perspectives.js';
import { MALLOW_IDS } from '../core/relay-config.js';

const P = JSON.parse(readFileSync(new URL('./fixtures/mallow-probes.json', import.meta.url), 'utf8'));
const screen = (text) => screenFeeling(text, { minChars: 1, maxChars: 10000 });
const lib = libraryProvider();
const picks = async (text, label) => (await Promise.all([0, 1, 2].map((attempt) => Promise.all(MALLOW_IDS.map((mallow) => lib({ text, label, mallow, attempt })))))).flat();
const ids = async (text, label) => (await picks(text, label)).map((r) => r.angleId || r.status);

test('the safety screen: passive wishes not to be here are answered with crisis support', () => {
  const missed = P.crisis.filter((t) => { const r = screen(t); return r.ok || r.level !== 'crisis'; });
  assert.deepEqual(missed, []);
});

test('the safety screen: someone else in danger gets the "Someone might be in danger" screen', () => {
  assert.deepEqual(P.danger.filter((t) => { const r = screen(t); return r.ok || r.level !== 'crisis' || !/danger/i.test(r.support?.title || ''); }), []);
});

test('the safety screen: crisis words beside abuse or bullying still get crisis support; a hurt arm stays care', () => {
  assert.deepEqual(P.crisisNotCare.filter((t) => screen(t).level !== 'crisis'), []);
  assert.deepEqual(P.careNotCrisis.filter((t) => { const r = screen(t); return r.ok || r.level !== 'care'; }), []);
});

test('the safety screen: everyday getaways, other people, alarms and a death told plainly are released', () => {
  assert.deepEqual(P.released.filter((t) => !screen(t).ok), []);
});

test('the Mallow library: the work at home gets load lines and never "your partner seems distant"', async () => {
  const wrong = [];
  for (const text of P.load) for (const label of ['frustration', 'sadness', 'anger', null]) {
    const got = await ids(text, label);
    // with no label, another theme that fits may answer; it still never says the partner seems distant
    if (got.some((id) => /^pd-ang/.test(id)) || (label && got.filter((id) => /^hm-load-/.test(id)).length < got.length / 3)) wrong.push(`${label} · ${text}: ${got.join(' ')}`);
  }
  assert.deepEqual(wrong, []);
});

test('the Mallow library: a death, harm at home, health, mood or money never get chores lines', async () => {
  const wrong = [];
  for (const [label, text] of P.neverLoad) { const got = await ids(text, label); if (got.some((id) => /^hm-load-/.test(id))) wrong.push(`${label} · ${text}: ${got.join(' ')}`); }
  assert.deepEqual(wrong, []);
});

test('the Mallow library: harm, control or a loss never get "your partner seems distant"; real distance keeps it', async () => {
  const wrong = [];
  for (const [label, text] of P.noDistance) { const got = await ids(text, label); if (got.some((id) => /^pd-ang/.test(id))) wrong.push(`no distance · ${label} · ${text}: ${got.join(' ')}`); }
  for (const [label, text] of P.distance) { const got = await ids(text, label); if (!got.some((id) => /^pd-ang/.test(id))) wrong.push(`distance · ${label} · ${text}: ${got.join(' ')}`); }
  assert.deepEqual(wrong, []);
});

test('the Mallow library: a death or pregnancy loss is recognised as grief; passing a test is not', async () => {
  const wrong = [];
  for (const text of P.grief) {
    const got = await ids(text, 'sadness');
    if (!got.some((id) => /^hm-loss-/.test(id)) || got.some((id) => /^(?:hm-load-|pd-ang)/.test(id))) wrong.push(`grief · ${text}: ${got.join(' ')}`);
  }
  for (const [label, text] of P.notGrief) { const got = await ids(text, label); if (got.some((id) => /^hm-loss-/.test(id))) wrong.push(`not grief · ${label} · ${text}: ${got.join(' ')}`); }
  assert.deepEqual(wrong, []);
});

// Tier 0 (docs/safety/TIER0_SELF_ASSESSMENT.md §3) and its code review: where the library's everyday lines must
// not reach. Every phrasing here passes the screen (a held one would test nothing), and each was answered with
// one of these lines before the fix.
test('the Mallow library: harm at home, a worrying silence, a mistake that hurt someone, a medical test and a death told with "he" each get the right lines', async () => {
  const { SCENARIOS } = await import('../../src/ultra/frameworks.js');
  const { libraryCatalogue } = await import('../core/perspectives.js');
  const of = (...scenarioIds) => new Set(SCENARIOS.filter((s) => scenarioIds.includes(s.id)).flatMap((s) => s.angles.map((a) => a.id)));
  // the situations whose lines explain someone's behaviour away (a bad day, a busy week, a crowded guest list)
  const harmIds = of('partner-distant', 'family-argument', 'seemed-annoyed', 'family-criticism', 'work-criticism', 'appearance-comment', 'not-listened', 'future-worry',
    'plans-cancelled', 'group-chat-ignored', 'no-text-back', 'left-out');
  const silenceIds = of('unanswered-message', 'no-text-back', 'group-chat-ignored', 'plans-cancelled', 'seemed-annoyed', 'left-out');
  const moodIds = of('seemed-annoyed');
  const mistakeIds = of('mistake-judged');
  const gradeIds = of('bad-grade');
  const habit = (r) => /^gen-[a-z]+-[a-z-]+-ang/.test(r.angleId);   // Reframe's thinking-habit kit
  const { openers } = libraryCatalogue();
  const loud = openers.filter((o) => o.family === 'heavy' && !o.tender).map((o) => o.text.split('{adj}')[0]);
  const wrong = []; let answered = 0;
  const check = async (label, text, bad, why) => {
    let ok = 0;
    for (const r of await picks(text, label)) {
      if (r.status !== 'ok') continue;
      ok++;
      if (bad(r)) wrong.push(`${why} · ${label} · ${text}: ${r.angleId} · ${r.text}`);
    }
    if (!ok) wrong.push(`${why} · ${label} · ${text}: held by the screen, so it checks nothing`);
    answered += ok;
  };
  for (const [label, text] of [
    ['anger', 'He calls me names and puts me down every night.'],
    ['worry', 'I walk on eggshells around him, he gets so angry if I see my friends.'],
    ['sadness', 'My mum screams at me every day and says I am useless.'],
    ['anger', 'My husband ignored my message in the group chat and then screamed at me.'],
    ['frustration', 'My husband cancelled my plans again and shouted at me.'],
    ['sadness', 'My partner keeps cancelling our plans and screams at me if I complain.'],
    ['loneliness', 'My husband stopped texting back when I am out and yells at me when I get home.'],
    ['sadness', 'He puts me down and they all went without me, he made sure I was left out.'],
  ]) await check(label, text, (r) => harmIds.has(r.angleId) || habit(r) || loud.some((o) => r.text.startsWith(o)), 'harm at home');
  for (const [label, text] of [
    ['worry', 'My friend sent me thanks for everything and now she is not answering my messages.'],
    ['worry', 'My daughter has been really low and has not replied to my texts for three days.'],
    ['worry', 'My friend has been really low and nobody in the group chat has heard from her, she ignored my message.'],
    ['worry', 'My mate sent thanks for everything in the group chat and now nobody replied.'],
    ['sadness', 'My brother has been really down and he cancelled our plans again, last minute.'],
    ['worry', 'She has been so low lately and she seemed annoyed with me and was short with me.'],
    ['sadness', 'My friend has been really low and they all went without me to the party, she was not invited either.'],
    ['worry', 'My friend has been so down and I bet she thinks I am annoying, she has not replied.'],
    ['sadness', 'Since mum passed my friends cancelled plans with me, they bailed on me last minute.'],
  ]) await check(label, text, (r) => silenceIds.has(r.angleId) || habit(r) || /^pd-ang/.test(r.angleId), 'a worrying silence, or a loss');
  // a parent whose moods can't be predicted: never "faces are hard to read" or "this is a chance to practise checking in"
  await check('sadness', 'My dad snapped at me again, I never know what mood he will be in.', (r) => moodIds.has(r.angleId), 'a volatile parent');
  for (const text of ['I made a mistake at work and a patient got hurt.', 'I made a mistake with his dose and he ended up in ICU.',
    'I made a mistake and my son fell and broke his arm.', 'I made a mistake and crashed the car with my sister in it.']) await check('sadness', text, (r) => mistakeIds.has(r.angleId), 'a mistake that hurt someone');
  for (const [label, text] of [
    ['worry', 'I have a blood test tomorrow and I am nervous.'],
    ['worry', 'I have a test on Thursday to see if the cancer is back.'],
    ['sadness', 'Another negative test today.'],
    ['worry', 'My IVF results come back tomorrow and I have a test on Monday.'],
    ['sadness', 'The pregnancy test was negative again, another failed round of IVF results.'],
  ]) await check(label, text, (r) => /^hm-exam-/.test(r.angleId) || gradeIds.has(r.angleId), 'a medical or pregnancy test is not an exam');
  await check('sadness', 'I miss him so much since he passed.', (r) => !/^hm-loss-/.test(r.angleId), 'a death told with "he"');
  // good news that mentions drinks or a scary ride keeps its bright openers; plain harm beside good news doesn't
  const bright = (r) => openers.some((o) => o.mallow === r.mallow && o.family === 'bright' && r.text.startsWith(o.text));
  for (const [label, text] of [['joy', 'Had drinks with the girls tonight and laughed so much, best night.'], ['joy', 'We got a bit drunk at the wedding and danced all night, so happy.'],
    ['excitement', 'The rollercoaster was so scary but we screamed the whole way, can not wait to go again!']]) await check(label, text, (r) => !bright(r), 'good news gets a bright opener');
  await check('joy', 'He screams at me less now, things are so much better.', bright, 'harm beside good news gets a tender opener');
  assert.deepEqual(wrong, []);
  assert.ok(answered > 400, `only ${answered} answers were checked`);
});

test('the Mallow library: everyday words keep their lines (the wifi is down, a phone died, an admin slip at a hospital)', async () => {
  const has = async (label, text, re) => (await ids(text, label)).some((id) => re.test(id));
  const missing = [];
  for (const [label, text, re] of [
    ['worry', 'The wifi has been down all day and my friend has not replied to my messages.', /^um-ang/],
    ['worry', 'I have been down to the shops twice and he still has not replied.', /^um-ang/],
    ['worry', 'I made a mistake at the hospital where I work and booked the wrong room.', /^mj-ang/],
    ['worry', 'I have a maths test tomorrow and my heart is racing.', /^hm-exam-/],
  ]) if (!(await has(label, text, re))) missing.push(`${label} · ${text}`);
  assert.deepEqual(missing, []);
});
