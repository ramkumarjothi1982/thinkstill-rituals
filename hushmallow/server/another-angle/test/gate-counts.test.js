// Counts, time spans and names in the quality gate, after the third review.
//
// Two failures that point in opposite directions:
//  * Invented counts about other people slipped through when every question
//    line was read as a suggestion ("Which of the four friends who came would
//    you see again soon?" for "Only three people came…").
//  * Ordinary steps were refused unless they used one of a few listed verbs
//    or nouns ("Work on your CV for fifteen minutes tonight", "Plan three
//    cheap meals from the cupboard").
// So the tests below are built as matrices (verb × noun × count, verb × time
// span) rather than from one run's sentences, and every invented count the
// review found is a true positive here. Inputs are synthetic.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualityGate } from '../src/gate.js';
import { CASES } from '../eval/cases.js';
import { PATTERN_INTERACTION } from '../src/vocab.js';

const text = (id) => CASES.find((c) => c.id === id).text;
const scene = (over) => ({
  emotion: 'worry', situation_type: 'other', reasoning_pattern: 'practical_problem', interaction_type: 'assemble_step',
  mallow_character: 'boppo', safety_status: 'ok', known_fact: '', possible_assumption: '', alternative_angle: '', practical_next_step: '',
  subtitle_line_1: 'A plan you can see is easier to hold than a worry.', subtitle_line_2: 'Which one could you start on tonight?', ...over,
});
const invented = (sc, t) => qualityGate(scene(sc), { text: t }).failures.filter((f) => f.code === 'invented_detail');
const passes = (sc, t) => assert.deepEqual(invented(sc, t).map((f) => f.message), [], JSON.stringify(sc));
const fails = (sc, t) => assert.ok(invented(sc, t).length > 0, `expected invented_detail: ${JSON.stringify(sc)}`);
/** The same line as line 2 and as the step. */
const both = (line, check, t) => {
  check({ subtitle_line_2: line, practical_next_step: 'Make a short plan tonight.' }, t);
  check({ practical_next_step: line }, t);
};

const INPUTS = [
  text('unc-redundancy'), // three weeks
  text('ho-payday'), // £40, next Friday
  text('dis-birthday'), // three people
  "He hasn't replied to my message for five hours.",
  text('self-driving'), // the third time
  text('ho-new-city'), // two months, every night
];

// --- blocking 1: invented counts about other people ------------------------------

test('a question about the situation is not a step: an invented count in it is a fact', () => {
  for (const [t, l2] of [
    [text('dis-birthday'), 'Which of the four friends who came would you see again soon?'],
    [text('shame-cried'), 'Did the six people in that meeting say anything to you afterwards?'],
    [text('shame-party'), 'Were the five people at the table really watching you that closely?'],
    ['Everyone laughed at me in the meeting.', 'Were the three people who laughed the ones whose view counts?'],
    [text('dis-birthday'), 'What about the ten people who did not come is really bothering you?'],
    [text('soc-invite'), 'Could you ask one of the twelve people she invited what happened?'],
    [text('soc-invite'), 'Did she invite you to Friday drinks before, at least?'],
  ]) fails({ subtitle_line_2: l2 }, t);
});

test('inside a step, a count followed by a clause about the past is a fact again', () => {
  const T = {
    bday: text('dis-birthday'), party: text('shame-party'), cried: text('shame-cried'), invite: text('soc-invite'),
    laughed: 'Everyone laughed at me in the meeting.', wait: text('unc-redundancy'), read: text('rel-read'),
  };
  for (const [k, line] of [
    ['bday', 'Which of the four friends who came would you see again soon?'],
    ['bday', 'Which of the four friends would you see again soon?'],
    ['bday', 'Invite the four friends who came round for tea next week.'],
    ['bday', 'Message the two friends who came and say thanks.'],
    ['bday', 'Ask the five people who stayed away what happened.'],
    ['bday', 'Two friends came, so invite them round next week.'],
    ['bday', 'Since four people came, plan a small dinner with them.'],
    ['bday', 'Could you ask those six people why they stayed away?'],
    ['party', 'Ask the three colleagues who saw it what they actually remember.'],
    ['party', 'Could you ask the four people at your table what they remember?'],
    ['party', 'Ask the three colleagues who were there what they remember.'],
    ['cried', 'Thank the four colleagues who checked on you afterwards.'],
    ['cried', 'Which of the three teammates who saw it would you talk to first?'],
    ['invite', 'Ask one of the five friends she invited what happened.'],
    ['invite', 'Ask the four friends she invited whether they knew.'],
    ['laughed', 'Ask the two people who laughed loudest what they meant.'],
    ['laughed', 'Which of the five who laughed would you ask about it?'],
    ['wait', 'You have waited for four weeks, so ask HR for a date.'],
    ['wait', 'After four weeks of silence, email HR for a date.'],
    ['wait', 'Update your CV for four weeks, then decide.'],
    ['read', 'Since he has had two days to reply, send one short message.'],
    ['read', 'Ask him about the four messages you sent yesterday.'],
  ]) both(line, fails, T[k]);
  // The run-2 case: past occasions are a fact, a choice from the past is not.
  fails({ practical_next_step: 'Write down the three times you froze in a presentation before.' }, text('anx-presentation'));
  passes({ practical_next_step: 'Write down the three things you loved most about that flat.' }, text('dis-flat'));
  passes({ subtitle_line_2: 'Write down the three things that made you love it.' }, text('dis-flat'));
  passes({ practical_next_step: 'Name two decisions this month that went the way you planned.' }, text('work-fraud'));
});

test('people are a unit: their "three people" is not "four friends", but a step may invite two', () => {
  const t = text('dis-birthday');
  fails({ subtitle_line_1: 'Four friends came, and they chose you.' }, t);
  fails({ subtitle_line_1: 'Two friends chose your birthday over everything else.' }, t);
  passes({ subtitle_line_1: 'Three people chose your birthday over everything else that night.' }, t);
  both('Invite two friends round for tea next week.', passes, t);
  both('Message one of the three this week to plan a catch-up.', passes, t);
});

test('"twice" and a length of time are facts outside a step, even at two', () => {
  fails({ subtitle_line_1: 'Your boss has done this twice this week, which is a pattern.', subtitle_line_2: 'Ask for feedback to come privately from now on.' }, text('inj-embedded'));
  fails({ subtitle_line_1: 'Two days of silence after words that big is a lot.' }, text('rel-read'));
  // Theirs, or inside a step, they are fine.
  passes({ subtitle_line_1: 'Two late mornings in one week point to a cause you can find.' }, "I've been late to work twice this week and my manager noticed.");
  both('Ring her twice this week, just to say hello.', passes, text('ho-new-city'));
});

// --- blocking 2: steps in ordinary words ---------------------------------------------

test('matrix: a small count before any plural noun is fine inside a step, in line 2 or the step', () => {
  const verbs = ['Write down', 'List', 'Pick', 'Plan', 'Choose', 'Name', 'Note', 'Try', 'Make', 'Find', 'Book', 'Cook', 'Send', 'Draft', 'Mute', 'Save'];
  const nouns = ['costs', 'bills', 'meals', 'emails', 'calls', 'pages', 'topics', 'mistakes', 'walks', 'drafts', 'chores', 'questions', 'friends', 'evenings', 'recipes', 'habits', 'goals', 'faults', 'accounts', 'boundaries', 'requests'];
  for (const t of INPUTS) for (const v of verbs) for (const n of nouns) for (const k of ['three', '4']) {
    both(`${v} ${k} ${n} for this week.`, passes, t);
  }
  // With words between, and written the other way round.
  for (const st of ['Plan three cheap meals from what is already in the cupboard.', 'Pick four meals you can make from what is in the cupboard.', 'Plan five dinners for under eight pounds each.',
    'Set a daily budget of six pounds until Friday.', 'List your next five spends before you make them.', 'Write down three things you could change before payday.']) {
    both(st, passes, text('ho-payday'));
  }
});

test('matrix: a time span is fine inside a step, whatever the verb', () => {
  const verbs = ['Update your CV', 'Work on your budget', 'Read through your contract', 'Tidy your room', 'Sit outside', 'Walk round the block', 'Look at job listings', 'Practise the manoeuvre', 'Go through your emails'];
  const spans = ['for twenty minutes', 'for fifteen minutes tonight', 'for ten minutes before bed', 'over three evenings', 'for two evenings this week'];
  for (const t of INPUTS) for (const v of verbs) for (const sp of spans) both(`${v} ${sp}.`, passes, t);
  for (const t of INPUTS) {
    for (const st of ['Go for a twenty-minute walk after work.', 'Set a fifteen-minute timer and update your CV.', 'Take a ten-minute break before you decide.',
      'Book a thirty-minute call with a friend.', 'Call the bank and ask about a three-day overdraft buffer.', 'Knock and offer him a five-minute sorry, no lecture.']) both(st, passes, t);
  }
});

test('their own units are checked first, so a step never hides a changed number', () => {
  const t = 'We have been waiting two weeks to hear about the redundancies.';
  for (const st of ['Update your CV for three weeks, then decide.', 'After three weeks of waiting, ask HR for a date.', 'Since it has been three weeks, ask HR for a date.']) both(st, fails, t);
  // Looking ahead from their number is not changing it.
  for (const st of ['Give it another three weeks before you chase.', 'Spend twenty minutes on your CV this weekend.', 'In three weeks, will this still be the worry?']) both(st, passes, t);
});

test('a condition about the future belongs to the suggestion after it', () => {
  passes({ subtitle_line_2: 'If someone mentions it on Monday, could you have one light line ready?' }, text('shame-party'));
  fails({ subtitle_line_2: 'Since four people saw it, could you have one light line ready?' }, text('shame-party'));
});

test('polish 8: the next check, imagined; a month for a step; a five-minute sorry', () => {
  passes({ subtitle_line_1: 'You checked twice; the third check is happening only in your head.', subtitle_line_2: 'Could you agree with yourself to look once, when you get home?' }, text('anx-hob'));
  fails({ subtitle_line_1: "You've now checked a third time, and it is still on your mind." }, text('anx-hob'));
  passes({ subtitle_line_1: 'Your finals are done, so August decides nothing about June.', subtitle_line_2: 'Plan two things you would enjoy in July.' }, text('ho-results'));
  fails({ subtitle_line_1: 'Your results came out in July, and they were fine.' }, text('ho-results'));
  passes({ subtitle_line_1: 'You were right about the door and wrong to shout.', subtitle_line_2: 'Knock and offer him a five-minute sorry, no lecture.' }, text('ho-shouted'));
});

test('polish 5: the regeneration is told why a number read as a fact', () => {
  const [f] = invented({ subtitle_line_2: 'Ask the three colleagues who saw it what they actually remember.' }, text('shame-party'));
  assert.match(f.message, /"three colleagues who saw" presents it as part of what happened, so it reads as a fact about their situation, not part of the step/);
  assert.doesNotMatch(f.message, /is fine/);
  const [g] = invented({ subtitle_line_1: 'Six people saw you cry, and most of them have forgotten.' }, text('shame-cried'));
  assert.match(g.message, /the number "Six"\): "Six people saw" describes what happened, so it reads as a fact about their situation\. /);
  const [g2] = invented({ subtitle_line_1: 'Seven months of this is a long time to carry it.' }, text('shame-cried'));
  assert.match(g2.message, /the number "Seven"\): here it reads as a fact about their situation\./);
  const [h] = invented({ practical_next_step: 'Write down twenty things you handled well this year.' }, text('work-fraud'));
  assert.match(h.message, /only a small count \(up to ten\)/);
});

// --- polish 2: a name at the start of a sentence --------------------------------------

test('an invented name at the start of a line is caught; ordinary openers are not names', () => {
  for (const [t, l] of [
    [text('unc-argument'), 'Sarah may still be working out what to say after Saturday.'],
    [text('rel-read'), 'Tom might need a day before he can answer something that big.'],
    [text('soc-invite'), "Ella's silence is about her, not a verdict on you."],
    [text('work-promotion'), 'Priya got the role, and your case for the next one starts now.'],
  ]) fails({ subtitle_line_1: l }, t);
  for (const [t, l] of [
    [text('anx-presentation'), 'Thursday needs one good opening, not a perfect hour.'],
    [text('unc-manchester'), 'Manchester or family is a choice with more than two shapes.'],
    [text('rel-read'), 'Silence might mean he is still finding the words.'],
    [text('work-typo'), 'Nobody remembers a typo for long once it is corrected.'],
    [text('rum-2am'), 'Daylight might make that comment sound much smaller.'],
    [text('shame-party'), 'Everyone at a work party is busy worrying about themselves.'],
    [text('ho-grief'), 'Reaching for the phone is love that has nowhere to go yet.'],
    [text('jeal-house'), 'Zuzu would point out that buying first is not winning.'],
  ]) passes({ subtitle_line_1: l, subtitle_line_2: 'Which part of it could you look at tonight?' }, t);
});

// --- polish 3: other minds --------------------------------------------------------------

test('feelings and needs stated as fact are claims, in grief and family wording too', () => {
  const minds = (sc, t) => qualityGate(scene({ reasoning_pattern: 'mind_reading', interaction_type: PATTERN_INTERACTION.mind_reading, ...sc }), { text: t }).failures.some((f) => f.code === 'claims_others_minds');
  for (const [t, l1] of [
    [text('ho-grief'), 'Your nan loved those calls as much as you did.'],
    ['My dad died last year and I never told him I was sorry.', 'Your dad loved you, whatever was left unsaid.'],
    [text('ho-grief'), 'Your nan enjoyed every one of those Sunday calls.'],
    [text('ho-shouted'), 'Your son needs a bit of space, and then a short sorry.'],
    [text('ho-shouted'), 'Your son needs time before he can hear an apology.'],
    [text('soc-invite'), 'Missing one invite does not change how much she values you.'],
    ['My sister read my diary and told my mum.', 'Your sister crossed a line and knew it.'],
    [text('ho-shouted'), 'Your son slammed the door and still loves you.'],
  ]) assert.ok(minds({ subtitle_line_1: l1 }, t), l1);
  for (const [t, l1] of [
    [text('ho-grief'), 'Reaching for the phone is a habit built by years of ringing her.'],
    [text('soc-invite'), 'Being left out does not tell you how much she values you.'],
    [text('ho-shouted'), 'He may need a bit of space, and a short sorry could still land.'],
    [text('ho-grief'), 'You loved those calls, and your hand still remembers them.'],
    [text('jeal-ex'), 'Liking a photo is a tap, not a feeling you can read.'],
  ]) assert.ok(!minds({ subtitle_line_1: l1 }, t), l1);
});
