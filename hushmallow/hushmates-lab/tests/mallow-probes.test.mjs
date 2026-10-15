// Every phrasing the adversarial reviews of the safety screen and the Mallow library found
// (tests/fixtures/mallow-probes.json), held to what each should get. Each library case is asked of
// every Mallow, three times over. Keyword rules are a floor, not a guarantee: these keep each fix
// from undoing another, and give the clinical review (docs/READINESS.md) a list to start from.
// The library's protective word lists are a floor too (core/perspectives.js, "the Tier 0 floor"):
// whatever 0037d57, 9012d6f or 2a67f1b kept away stays away. P.floor pins every phrasing the
// independent checks found; P.floorAccepted pins the over-caution that floor brings back, for Tier A. Their
// entries are [label, checks, where from, phrasing]: the phrasing last, as every fixture group's reader expects.

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
    // a time after the mood word, and "depressed" or "struggling" before anything, is still about a person
    ['worry', 'My son has been really down the past few weeks and has not replied to my messages.'],
    ['worry', 'She seems low the past month and has stopped texting back.'],
    ['worry', "My friend has been depressed the whole year and now she won't answer my messages."],
    ['worry', 'My mum is low at the moment and has not replied to my texts.'],
    ['worry', 'She has been depressed the whole time and has not replied to my messages.'],
    ['worry', 'He has been struggling the last month and has stopped texting back.'],
    ['worry', 'She is struggling by herself and has not replied to my messages.'],
    ['worry', 'My brother has been struggling at uni and has not replied to my messages in a week.'],
    ['worry', 'He has been really low at night and has not replied to my texts.'],
    ['worry', "My mate has been down by himself all week and hasn't texted back."],
    ['worry', 'Mum has been struggling under all the pressure and stopped texting back.'],
    ['worry', 'My best friend has been struggling to get out of bed and has not replied to my messages.'],
    ['worry', 'My friend that has been really down has not replied to my messages in a week.'],
    ['worry', "She has been feeling really low and hasn't replied to my messages."],
    ['worry', 'My dad is feeling down at the moment and stopped texting back.'],
    ['sadness', 'She has been depressed the whole time'],
    ['worry', 'He has been struggling the last month'],
    ['worry', 'She is struggling by herself'],
    ['worry', 'My mum is low at the moment'],
  ]) await check(label, text, (r) => silenceIds.has(r.angleId) || habit(r) || /^pd-ang/.test(r.angleId), 'a worrying silence, or a loss');
  // a parent whose moods can't be predicted: never "faces are hard to read", "this is a chance to practise checking
  // in" or a thinking habit ("they might be thinking about something that has nothing to do with you")
  for (const [label, text] of [
    ['sadness', 'My dad snapped at me again, I never know what mood he will be in.'],
    ['worry', 'I never know what mood my dad will be in and he seemed annoyed at me again.'],
    ['sadness', 'I never know what mood my dad will be in and he seemed annoyed at me again.'],
    ['worry', 'I tiptoe around my stepdad, he seemed annoyed with me again tonight.'],
    ['confusion', 'I tiptoe around my stepdad, he seemed annoyed with me again tonight.'],
    ['worry', "I'm always on edge around him, and he seemed annoyed with me today."],
    ['sadness', "I'm always on edge around him, and he seemed annoyed with me today."],
    ['worry', 'My mum has mood swings and she seemed annoyed with me again.'],
  ]) await check(label, text, (r) => moodIds.has(r.angleId) || habit(r), 'a volatile parent');
  // a mistake that hurt someone: no "everyone makes mistakes" and no thinking habit ("other people might be busy
  // thinking about their own stuff"); a device is what died only as the subject ("my phone died")
  for (const [label, text] of [
    ['sadness', 'I made a mistake at work and a patient got hurt.'], ['sadness', 'I made a mistake with his dose and he ended up in ICU.'],
    ['sadness', 'I made a mistake and my son fell and broke his arm.'], ['sadness', 'I made a mistake and crashed the car with my sister in it.'],
    ['worry', 'The kid behind the car died because I reversed.'], ['worry', "I made a mistake and my son's friend in the car died."],
    ['confusion', "I made a mistake and my son's friend in the car died."], ['worry', 'I made a mistake and the boy in the car died.'],
    ['frustration', 'I made a mistake and the boy in the car died.'], ['worry', 'My mistake meant the man on the phone died before help came.'],
    ['worry', 'I made a mistake and she is at the hospital because of me.'], ['anger', 'I made a mistake and she is at the hospital because of me.'],
    ['loneliness', 'I made a mistake and she is at the hospital because of me.'], ['worry', 'I made a mistake and he ended up in a hospital bed.'],
    ['sadness', 'I made a mistake and he ended up in a hospital bed.'], ['worry', 'I messed up and now he is in a coma.'],
    ['worry', 'I made a mistake and she is with the doctor at the hospital because of me.'],
  ]) await check(label, text, (r) => mistakeIds.has(r.angleId) || habit(r), 'a mistake that hurt someone');
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
    ['excitement', 'The rollercoaster was so scary but we screamed the whole way, can not wait to go again!'],
    ['joy', 'They all shouted surprise at my party, best night ever.'], ['joy', 'Dad yelled happy birthday from the garden.'],
    ['joy', 'My mum screamed with joy when I told her I got in!'], ['joy', 'My girlfriend screamed when I proposed, she said yes!'],
    ['joy', 'My dad shouted us all dinner for my birthday!']]) await check(label, text, (r) => !bright(r), 'good news gets a bright opener');
  // a partner or parent who shouts, told with good news, is still harm: tender openers
  for (const [label, text] of [['joy', 'He screams at me less now, things are so much better.'], ['joy', 'My husband is so much better now, he only yelled once this week!'],
    ['joy', 'My dad only shouted twice this week, things are getting better!'], ['joy', "Mum yells less now that she's sober, I'm so happy."],
    ['excitement', "My boyfriend yelled less this month and we're going on holiday!"]]) await check(label, text, bright, 'harm beside good news gets a tender opener');
  assert.deepEqual(wrong, []);
  assert.ok(answered > 1500, `only ${answered} answers were checked`);
});

// The wifi that "has been down", a phone that "died" and an admin slip at a hospital used to be here (they kept their
// silence and mistake lines at 2a67f1b). The Tier 0 floor counts them again, as 0037d57 did: they are in
// P.floorAccepted now, held to the careful outcome instead.
test('the Mallow library: everyday words keep their lines (a racing heart before a maths test, Specialist Maths, results from the exams)', async () => {
  const has = async (label, text, re) => (await ids(text, label)).some((id) => re.test(id));
  const missing = [];
  for (const [label, text, re] of [
    ['worry', 'I have a maths test tomorrow and my heart is racing.', /^hm-exam-/],
    ['worry', 'My Specialist Maths exam is tomorrow', /^hm-exam-/],
    ['worry', 'My Specialist Maths exam is tomorrow and I am so nervous.', /^hm-exam-/],
    ['sadness', 'I got my results from the exams today and I failed two subjects', /^(?:hm-exam-|bg-ang)/],
    ['sadness', 'I got the results from my biology exam and I failed.', /^(?:hm-exam-|bg-ang)/],
  ]) if (!(await has(label, text, re))) missing.push(`${label} · ${text}`);
  assert.deepEqual(missing, []);
});

// The Tier 0 floor (core/perspectives.js). Each case is asked of every Mallow, three times over, with the real
// screen; a held one would check nothing. Grief lines need a clear loss; any loss word gets grief's protections.
const FLOOR_CHECKS = async () => {
  const { SCENARIOS } = await import('../../src/ultra/frameworks.js');
  const { libraryCatalogue } = await import('../core/perspectives.js');
  const { openers } = libraryCatalogue();
  const of = (...scenarioIds) => new Set(SCENARIOS.filter((s) => scenarioIds.includes(s.id)).flatMap((s) => s.angles.map((a) => a.id)));
  const silence = of('unanswered-message', 'no-text-back', 'group-chat-ignored', 'plans-cancelled', 'seemed-annoyed', 'left-out');
  const habit = (r) => /^gen-[a-z]+-[a-z-]+-ang/.test(r.angleId);
  const opens = (r, family, pick) => openers.some((o) => o.mallow === r.mallow && o.family === family && pick(o) && r.text.startsWith(o.text));
  const some = (re) => (rs) => rs.some((r) => re.test(r.angleId));
  const none = (re) => (rs) => !rs.some((r) => re.test(r.angleId));
  return {
    grief: some(/^hm-loss-/), nogrief: none(/^hm-loss-/), achieve: some(/^hm-achievement-/),
    tender: (rs) => rs.every((r) => opens(r, 'heavy', (o) => o.tender)), bright: (rs) => rs.every((r) => opens(r, 'bright', () => true)),
    nosilence: (rs) => !rs.some((r) => silence.has(r.angleId)), noregret: none(/^rg-ang/), nomistake: none(/^mj-ang/), nopd: none(/^pd-ang/),
    nomissing: none(/^hm-missing-/), nosa: none(/^sa-ang/), nohabit: (rs) => !rs.some(habit), habit: (rs) => rs.some(habit),
    school: some(/^(?:hm-exam-|bg-ang)/), noschool: none(/^(?:hm-exam-|bg-ang)/),
  };
};
const floorRun = async (cases) => {
  const CHECK = await FLOOR_CHECKS();
  const wrong = [];
  for (const [label, checks, from, text] of cases) {
    const rs = (await picks(text, label)).filter((r) => r.status === 'ok');
    if (!rs.length) { wrong.push(`${from} · ${label} · ${text}: held by the screen, so it checks nothing`); continue; }
    const failed = checks.split(' ').filter((k) => { assert.ok(CHECK[k], `unknown check ${k}`); return !CHECK[k](rs); });
    if (failed.length) wrong.push(`${failed.join(',')} · ${from} · ${label} · ${text}: ${rs.map((r) => r.angleId).join(' ')}`);
  }
  return wrong;
};

test('the Tier 0 floor: every phrasing the independent checks found gets the careful outcome (grief lines only for a clear loss)', async () => {
  assert.ok(P.floor.phrasings.length >= 180, 'the floor cases are all there');
  assert.deepEqual(await floorRun(P.floor.phrasings), []);
});

test('the Tier 0 floor: the over-caution it brings back is still there (accepted, listed for the Tier A review)', async () => {
  assert.deepEqual(await floorRun(P.floorAccepted.phrasings), []);
});
