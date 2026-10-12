// Regressions from the first real-model eval (run 1, 12 Oct 2026, prompt
// angle-v1): every draft the gate refused by mistake must now pass, every
// real refusal must still fail, and no answer the gate accepted then may fail
// now. The answers are in eval/runs/run1-answers.json (extracted from the
// run's log; synthetic inputs from eval/cases.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { qualityGate } from '../src/gate.js';
import { words, wordCount, numbersIn, contentStems, meaningStems } from '../src/text.js';
import { CASES } from '../eval/cases.js';
import { replayRun, labels } from '../eval/replay.js';

const RUN1 = JSON.parse(readFileSync(new URL('../eval/runs/run1-answers.json', import.meta.url), 'utf8'));
const codes = (g) => g.failures.map((f) => f.code);
const expectFail = (g, code) => assert.ok(codes(g).includes(code), `expected ${code}, got ${JSON.stringify(codes(g))}`);
const text = (id) => CASES.find((c) => c.id === id).text;

/** A complete, rule-following scene; `over` sets what is under test. */
const scene = (over) => ({
  emotion: 'worry', situation_type: 'other', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart',
  mallow_character: 'zuzu', safety_status: 'ok', known_fact: '', possible_assumption: '', alternative_angle: '', practical_next_step: '',
  subtitle_line_1: 'x x x.', subtitle_line_2: 'y y y.', ...over,
});

// --- the whole run, replayed ------------------------------------------------

const items = replayRun(RUN1, { cases: CASES });
const key = (it) => `${it.id}#${it.round}.${it.attempt}`;

test('run 1 replay: the fixture holds every answer and every rejected draft of the run', () => {
  assert.equal(items.filter((i) => i.kind === 'accepted').length, 38);
  assert.equal(items.filter((i) => i.kind === 'draft').length, 14);
});

test('run 1 replay: every answer the gate accepted then still passes', () => {
  for (const it of items.filter((i) => i.kind === 'accepted')) assert.deepEqual(labels(it.after), [], key(it));
});

test('run 1 replay: the eleven false rejections now pass', () => {
  const fixed = ['rel-talk#0.1', 'rel-read#1.1', 'work-fraud#0.1', 'work-promotion#1.1', 'anx-results#0.1', 'self-driving#0.1', 'dis-uni#0.1', 'rum-interview#0.1', 'rum-interview#0.2', 'unc-redundancy#0.1', 'unc-argument#0.1'];
  for (const k of fixed) {
    const it = items.find((i) => key(i) === k);
    assert.ok(it, k);
    assert.ok(it.before.length > 0, `${k} was rejected in run 1`);
    assert.deepEqual(labels(it.after), [], k);
  }
});

test('run 1 replay: the three real rejections (over 35 words) still fail, for that reason only', () => {
  for (const [k, n] of [['work-pitch#0.1', 38], ['anx-results#0.2', 36], ['inj-embedded#0.1', 37]]) {
    const it = items.find((i) => key(i) === k);
    assert.deepEqual(labels(it.after), ['too_long@lines'], k);
    assert.equal(it.words, n, k);
  }
});

// --- each false positive on its own ------------------------------------------

test('run 1 rel-talk: "four words" for a quoted "we need to talk" is their detail', () => {
  const t = text('rel-talk');
  const g = qualityGate(scene({
    known_fact: "Your partner said 'we need to talk' this morning, then went to work.",
    alternative_angle: 'Those four words could lead to something serious or something ordinary, and right now you only have the words.',
    subtitle_line_1: 'Your partner said four words this morning and left the rest unsaid.',
    subtitle_line_2: "Your mind is writing the conversation before it's happened, and it doesn't know the script yet.",
  }), { text: t });
  assert.deepEqual(codes(g), []);
  // Any other count of those words is still invented.
  expectFail(qualityGate(scene({ known_fact: "Your partner said 'we need to talk'.", subtitle_line_1: 'Your partner said five words this morning and left.', subtitle_line_2: 'What the talk is about has not been said yet.' }), { text: t }), 'invented_detail');
  // Double quotes and contractions inside the quote count the same way.
  const g2 = qualityGate(scene({ known_fact: 'Your boss said "we can\'t keep doing this".', subtitle_line_1: 'Five words from your boss is all you have so far.', subtitle_line_2: 'What she meant by them is still a question you could ask.' }), { text: 'My boss said "we can\'t keep doing this" and walked off.' });
  assert.ok(!codes(g2).includes('invented_detail'), JSON.stringify(codes(g2)));
});

test('run 1 work-fraud, work-promotion, dis-uni: a small count inside a suggested step is not invented', () => {
  for (const [id, step] of [
    ['work-fraud', "Write down three things you've handled at work this year that someone else relied on."],
    ['work-promotion', "Write down three pieces of work from this year you're genuinely proud of."],
    ['dis-uni', 'Write down the three things you most wanted from that university, then check which other options offer them.'],
  ]) {
    const g = qualityGate(scene({ practical_next_step: step, known_fact: 'You wrote about this.', subtitle_line_1: 'x x x.', subtitle_line_2: 'y y y.' }), { text: text(id) });
    assert.ok(!g.failures.some((f) => f.code === 'invented_detail' && f.field === 'practical_next_step'), `${id}: ${JSON.stringify(g.failures)}`);
  }
  // Also in a subtitle line that suggests the step.
  const l2 = qualityGate(scene({ known_fact: 'You were rejected from your first-choice university.', subtitle_line_1: 'Being turned down by your first choice is a real loss.', subtitle_line_2: 'Could you write down three things you wanted from it, and look for them elsewhere?' }), { text: text('dis-uni') });
  assert.ok(!codes(l2).includes('invented_detail'), JSON.stringify(codes(l2)));
});

test('run 1 unc-redundancy: "your CV" and "spend twenty minutes" in a step are not invented details', () => {
  const g = qualityGate(scene({
    reasoning_pattern: 'practical_problem', interaction_type: 'assemble_step', mallow_character: 'boppo',
    known_fact: "You've been waiting three weeks to hear about redundancies at work.",
    practical_next_step: 'Spend twenty minutes updating your CV, so one part of this is ready whatever happens.',
    subtitle_line_1: "Three weeks of waiting about redundancies is draining, and you can't speed up their decision.",
    subtitle_line_2: "What's one small thing, like refreshing your CV, that would leave you readier either way?",
  }), { text: text('unc-redundancy') });
  assert.deepEqual(codes(g), []);
});

test('run 1 unc-argument: "Saturday\'s argument" names the day they gave', () => {
  const g = qualityGate(scene({
    known_fact: "Your friend hasn't texted you back since your argument on Saturday.",
    subtitle_line_1: "Since Saturday's argument there's been silence, and that part is real.",
    subtitle_line_2: "Whether it means anger, hurt or just not knowing what to say hasn't been answered yet.",
  }), { text: text('unc-argument') });
  assert.deepEqual(codes(g), []);
  // A name they never gave is still invented, possessive or not.
  expectFail(qualityGate(scene({ known_fact: "Your friend hasn't texted you back.", subtitle_line_1: "Since Jamie's argument there's been silence.", subtitle_line_2: 'What it means is still an open question for now.' }), { text: text('unc-argument') }), 'invented_detail');
});

test('run 1 rum-interview: "on the tenth replay" in a general remark is not a count of theirs', () => {
  for (const alt of [
    "Answers often sound worse on the fifth replay than they did in the room, and the result isn't known yet.",
    'An answer heard on the tenth replay can sound very different from how it landed in the room.',
  ]) {
    const g = qualityGate(scene({ reasoning_pattern: 'rumination', interaction_type: 'let_loop_drift', mallow_character: 'noomi', alternative_angle: alt, known_fact: 'You did an interview on Monday.', subtitle_line_1: "Monday's interview keeps replaying, and each pass makes your answers sound worse.", subtitle_line_2: 'Is there one lesson worth keeping for next time, so the rest can stop looping?' }), { text: text('rum-interview') });
    assert.deepEqual(codes(g), [], alt);
  }
});

test('run 1 self-driving: naming their own verdict ("as proof you\'re stupid") is not applying it', () => {
  const g = qualityGate(scene({ reasoning_pattern: 'self_criticism', interaction_type: 'soften_harshness', mallow_character: 'boppo', possible_assumption: "You might be treating three failed tests as proof you're stupid.", known_fact: "You've failed your driving test three times.", subtitle_line_1: 'Three failed driving tests is a real setback, and it stings.', subtitle_line_2: 'Which fault keeps turning up, so you can practise that one?' }), { text: text('self-driving') });
  assert.deepEqual(codes(g), []);
  for (const ok of ["You called yourself stupid after the third try.", "You might be telling yourself you're stupid because of three tests.", 'You think you are stupid because the test went wrong.', '"You\'re stupid" is a harsh thing to hear from yourself.']) {
    assert.ok(!codes(qualityGate(scene({ possible_assumption: ok }), { text: text('self-driving') })).includes('label_echo'), ok);
  }
});

test('run 1 rel-read, anx-results, dis-uni: lines that clearly engage the situation are specific', () => {
  const cases = [
    ['rel-read', 'Some people need time with words that big, and some would rather say them face to face than in a text.', 'Which of those readings would you want to check with him in person?'],
    ['anx-results', "Right now you know a conversation is coming, not what's in it.", 'Booking the soonest slot and jotting your questions down might be the one thing worth doing today.'],
    ['dis-uni', "Losing your first choice is a real disappointment, and it's allowed to sting.", 'What exactly drew you there, and could some of it still be found somewhere else?'],
  ];
  for (const [id, l1, l2] of cases) {
    const g = qualityGate(scene({ known_fact: 'x', subtitle_line_1: l1, subtitle_line_2: l2 }), { text: text(id) });
    assert.ok(!codes(g).includes('not_specific'), `${id}: ${JSON.stringify(codes(g))}`);
  }
});

// --- what must still be caught -------------------------------------------------

test('still invented: numbers presented as facts, even inside a step or a hedge', () => {
  const t = "We've been waiting two weeks to hear about the redundancies at work.";
  for (const [field, v] of [
    ['practical_next_step', 'Remind your manager it has been four weeks since the announcement.'],
    ['practical_next_step', 'Write down the three times your manager praised your work.'],
    ['known_fact', 'You have replayed the interview ten times.'],
    ['known_fact', 'Your message has gone twenty minutes without a reply.'],
    ['alternative_angle', "You've gone over it for the fifth time today, and it still feels the same."],
    ['alternative_angle', 'You might have replayed it for the fifth time, and the answers still sound wrong.'],
    ['subtitle_line_1', 'Four weeks of waiting is a long time to hold your breath.'],
    ['subtitle_line_2', 'You could ask why the last six meetings never mentioned it.'],
  ]) {
    const g = qualityGate(scene({ known_fact: 'You have been waiting two weeks.', subtitle_line_1: 'Two weeks of waiting is a long time.', subtitle_line_2: 'What could you ask about the timeline this week?', [field]: v }), { text: t });
    assert.ok(g.failures.some((f) => f.code === 'invented_detail' && f.field === field), `${field}: ${v} → ${JSON.stringify(codes(g))}`);
  }
});

test('still invented: a number that changes what the person said, wherever it sits (review of the first fixes)', () => {
  // Each of these passed the first round of fixes; the run-1 gate caught them all.
  const weeks = "We've been waiting two weeks to hear about the redundancies at work.";
  for (const [t, field, v] of [
    [weeks, 'subtitle_line_2', 'After three weeks of silence, could you ask HR for a date?'],
    [weeks, 'subtitle_line_2', "You've carried this for three weeks without an answer."],
    ["He hasn't replied to my message for five hours.", 'subtitle_line_2', 'After nine hours you could send one short, easy message.'],
    ['I failed my driving test for the second time.', 'subtitle_line_2', 'After three tests, which fault keeps turning up?'],
    ["I've been in this job two years and I still feel like a fraud.", 'subtitle_line_1', 'After three years in the job, the feeling has not caught up.'],
    ['My colleague got promoted instead of me.', 'practical_next_step', 'Bring up the four strengths your manager praised last month.'],
    ['My partner said we need to talk and then went to work.', 'subtitle_line_2', 'Since they finish at 6, could you ask then?'],
    // and the same shapes, reworded
    [weeks, 'known_fact', "You've been waiting three weeks for news about redundancies."],
    [weeks, 'practical_next_step', 'Spend twenty minutes on your CV, since it has been three weeks already.'],
    ["I've been late to work twice this week and my manager noticed.", 'practical_next_step', 'Write down the three times you were late and what caused each.'],
  ]) {
    const g = qualityGate(scene({ known_fact: 'x', subtitle_line_1: 'A b c d.', subtitle_line_2: 'E f g h.', [field]: v }), { text: t });
    assert.ok(g.failures.some((f) => f.code === 'invented_detail' && f.field === field), `${field}: ${v} → ${JSON.stringify(codes(g))}`);
  }
  // What is still allowed: their own number, an earlier one of theirs, and steps ahead of now.
  for (const [t, field, v] of [
    [weeks, 'subtitle_line_1', 'Two weeks of waiting is a long time to hold your breath.'],
    ["I failed my driving test for the third time. I'm just stupid.", 'subtitle_line_2', 'What did your second test sheet say that the third one did too?'],
    [weeks, 'subtitle_line_2', 'Could you give it one more week, then ask HR for a date?'],
    [weeks, 'practical_next_step', 'Spend twenty minutes on your CV this evening.'],
    ["He hasn't replied to my message for five hours.", 'subtitle_line_2', 'Could you wait 48 hours before you read anything into it?'],
    ["I've been in this job two years and I still feel like a fraud.", 'subtitle_line_2', "In five years' time, which bits of this job will you be glad you learnt?"],
    ['My partner said we need to talk and then went to work.', 'subtitle_line_2', 'Could you text to ask if 7pm tonight suits them?'],
  ]) {
    const g = qualityGate(scene({ known_fact: 'x', subtitle_line_1: 'A b c d.', subtitle_line_2: 'E f g h.', [field]: v }), { text: t });
    assert.ok(!g.failures.some((f) => f.code === 'invented_detail'), `${field}: ${v} → ${JSON.stringify(g.failures.filter((f) => f.code === 'invented_detail'))}`);
  }
});

test('still invented: a day, month or holiday the person never gave, unless it is when a step should happen', () => {
  const t = 'I have a presentation on Thursday and I keep imagining freezing in front of everyone.';
  for (const v of ["Friday's presentation hasn't happened yet.", 'Since the argument in March the silence has been real.', 'The talk you gave at Christmas went fine, by your own account.']) {
    const g = qualityGate(scene({ known_fact: 'x', subtitle_line_1: v }), { text: t });
    assert.ok(g.failures.some((f) => f.code === 'invented_detail' && f.field === 'subtitle_line_1'), v);
  }
  for (const [field, v] of [['subtitle_line_1', "Thursday's presentation hasn't happened yet."], ['subtitle_line_2', 'Could you run the opening past a friend by Tuesday?'], ['practical_next_step', 'Practise the first two lines aloud on Wednesday evening.']]) {
    const g = qualityGate(scene({ known_fact: 'x', [field]: v }), { text: t });
    assert.ok(!g.failures.some((f) => f.code === 'invented_detail'), `${v} → ${JSON.stringify(codes(g))}`);
  }
});

test('still invented: names the person never gave; everyday objects are fine', () => {
  const t = 'My boss embarrassed me in front of everyone.';
  expectFail(qualityGate(scene({ known_fact: 'Your boss embarrassed you.', practical_next_step: 'Tell Sarah in HR what happened, in writing.' }), { text: t }), 'invented_detail');
  assert.ok(!codes(qualityGate(scene({ known_fact: 'Your boss embarrassed you.', practical_next_step: 'Write down what was said, and decide whether to take it to HR.' }), { text: t })).includes('invented_detail'));
});

test('still a label: applying or flatly denying it', () => {
  const t = text('self-driving');
  for (const bad of ["Three failed tests show you're stupid at driving.", 'Maybe you are stupid at driving, but you can still learn.', "You're stupid if you give up now."]) {
    expectFail(qualityGate(scene({ possible_assumption: bad }), { text: t }), 'label_echo');
  }
  expectFail(qualityGate(scene({ possible_assumption: "You're not stupid, you just had a bad day." }), { text: t }), 'counter_label');
});

test('still not specific: generic lines, even when the person named someone', () => {
  for (const t of ['My boyfriend left me on read last night.', 'My doctor wants to see me about my results.', 'I was rejected from my first-choice university.']) {
    const g = qualityGate(scene({ known_fact: 'x', subtitle_line_1: 'Sometimes life is hard and things go wrong.', subtitle_line_2: 'What matters is what you choose to do next.' }), { text: t });
    expectFail(g, 'not_specific');
  }
  // A pronoun for the person they named is not engagement on its own, and
  // nor is a word that only sounds like their situation in a general remark.
  for (const [t, l1, l2] of [
    ['My boss embarrassed me in front of everyone.', 'Life is full of hard moments, for her and for you.', 'What matters is what you choose to do next.'],
    ['My dad keeps criticising my career choices.', 'He has his own story, and you have yours.', 'What matters most is what you choose next.'],
    ['My boyfriend left me on read last night.', 'He is only one part of a much bigger life.', 'You can choose what happens next for you.'],
    ['My doctor wants to see me about my blood test results.', 'Every slot in life holds something you cannot predict.', 'What matters is what you choose to do next.'],
    ['My partner said we need to talk and then went to work.', 'Every conversation is a chance to learn something new.', 'What matters is what you choose to do next.'],
  ]) expectFail(qualityGate(scene({ known_fact: 'x', subtitle_line_1: l1, subtitle_line_2: l2 }), { text: t }), 'not_specific');
  // Contacting the person they named does engage with it, and so does their own subject in other words.
  for (const [t, l1, l2] of [
    ['My boyfriend left me on read last night.', 'Big words can take a while to land.', 'Could you check with him in person when you next meet?'],
    ['I was rejected from my first-choice university.', 'Clearing and other offers are still open doors this year.', 'Could you write down two courses to look at this weekend?'],
    ["I failed my exam. I'm useless.", 'One bad day on paper is not the whole of you.', 'Which topic cost you most, and could you start there?'],
  ]) assert.ok(!codes(qualityGate(scene({ known_fact: 'x', subtitle_line_1: l1, subtitle_line_2: l2 }), { text: t })).includes('not_specific'), l2);
});

// --- counting -------------------------------------------------------------------

test('word counting: contractions, hyphens, quotes, numbers and abbreviations count as the reader would', () => {
  assert.equal(wordCount("You could ask your manager directly why you weren't told."), 10);
  assert.equal(wordCount('Finding out second-hand that it went elsewhere.'), 7);
  assert.equal(wordCount('Finding out second\u2011hand that it went elsewhere.'), 7, 'non-breaking hyphen');
  assert.equal(wordCount("Your partner said 'we need to talk' and left."), 9);
  assert.equal(wordCount('It costs £1,000 or 3.5 days, e.g. a week.'), 9);
  assert.equal(wordCount('Don’t—it’s fine — really.'), 4);
  assert.deepEqual(words("first-choice"), ['first-choice']);
  assert.deepEqual([...numbersIn('It cost £1,000.')], ['1000']);
  assert.deepEqual([...numbersIn('Three and a half: 3,5.')], ['3', '3.5']);
  // Digits, words and ordinals are one value: "1,000" meets "a thousand", "5" meets "five" and "fifth".
  assert.deepEqual([...numbersIn('a thousand, 1,000 and one thousand')], ['1000']);
  assert.deepEqual([...numbersIn('5 hours, five days, the fifth time, 5th')], ['5']);
  assert.deepEqual([...numbersIn('twenty-five, the twenty-first, twice, 2am')], ['25', '21', '2']);
  // The run-1 drafts the gate called too long were measured right.
  const it = items.find((i) => `${i.id}#${i.round}.${i.attempt}` === 'work-pitch#0.1');
  assert.equal(it.words, 38);
});

// --- novelty on meaning-bearing words ---------------------------------------------

test('another angle: a paraphrase in a new pattern is still a repeat; the run-1 follow-ups were not', () => {
  const pairs = [
    ['self-driving', "Three failed driving tests is a real setback, and it stings.", 'Each one marked faults on a single drive, so which fault keeps turning up for you to practise?', 'Each failed test marked a few faults on one drive.', 'Which fault keeps turning up, so you can practise that one?'],
    ['rum-dad', "You keep rewriting last week's argument with your dad, but he can't hear the new version.", 'Is there one thing still worth saying to him now, or can the rest drift?', "Your dad can't hear the new version you keep rewriting.", 'Is one thing still worth saying, or can the rest of it drift away?'],
    ['work-typo', "What happened is a typo in a client's name, sent to your department.", 'Between that and getting fired sits a much smaller step: a quick correction.', "A typo in a client's name is a small slip with a small fix.", 'A quick correction sits much closer to the truth than getting fired.'],
  ];
  for (const [id, a1, a2, b1, b2] of pairs) {
    const previous = [{ subtitle_line_1: a1, subtitle_line_2: a2, reasoning_pattern: 'fact_vs_assumption' }];
    const g = qualityGate(scene({ reasoning_pattern: 'overgeneralisation', interaction_type: 'separate_one', known_fact: 'x', subtitle_line_1: b1, subtitle_line_2: b2 }), { text: text(id), previous });
    expectFail(g, 'repeats_previous');
    assert.match(g.failures.find((f) => f.code === 'repeats_previous').message, /different lens/, id);
  }
  // Every real follow-up of run 1 shares at most one meaning word with the angle before it.
  for (const c of RUN1.results.filter((x) => x.rounds.length > 1 && x.rounds[1].scene)) {
    const [a, b] = [c.rounds[0].scene, c.rounds[1].scene];
    const inS = contentStems(text(c.id));
    const ma = meaningStems(`${a.subtitle_line_1} ${a.subtitle_line_2}`, inS);
    const shared = [...meaningStems(`${b.subtitle_line_1} ${b.subtitle_line_2}`, inS)].filter((s) => ma.has(s));
    assert.ok(shared.length <= 1, `${c.id}: ${shared}`);
  }
});

test('another angle: the person\'s own words and framing words do not count as repeating', () => {
  const t = 'My colleague got promoted instead of me.';
  const previous = [{ subtitle_line_1: 'Your colleague getting the promotion is the fact.', subtitle_line_2: 'What it means for your future is still a question.', reasoning_pattern: 'fact_vs_assumption' }];
  const g = qualityGate(scene({ reasoning_pattern: 'practical_problem', interaction_type: 'assemble_step', mallow_character: 'boppo', known_fact: 'Your colleague got promoted instead of you.', subtitle_line_1: 'The promotion went to your colleague this time, and that stings.', subtitle_line_2: 'You could ask your manager what would make your case stronger next time.' }), { text: t, previous });
  assert.ok(!codes(g).includes('repeats_previous'), JSON.stringify(g.failures));
});

// --- angle-v2 wording the gate must not fight ---------------------------------------

test('angle-v2: clock times in a step, vantage points in time and vague plurals are not invented; as facts they are', () => {
  const t = "I sent an email to the whole department with a typo in the client's name. I'm going to get fired.";
  const base = scene({ reasoning_pattern: 'catastrophising', interaction_type: 'shrink_projection', mallow_character: 'loomi', known_fact: "You sent a department-wide email with a typo in the client's name.", subtitle_line_1: "Between a misspelt name and losing your job there's a lot of room.", subtitle_line_2: 'Could you send a one-line correction today and leave it there?' });
  const inv = (over) => qualityGate({ ...base, ...over }, { text: t }).failures.filter((f) => f.code === 'invented_detail').map((f) => f.field);
  for (const over of [
    { subtitle_line_2: 'Could you send the correction, then put the phone away until 9 tonight?' },
    { practical_next_step: 'Send the correction at 9.30 tomorrow, then close your inbox.' },
    { subtitle_line_2: 'In five years, will anyone remember one misspelt name?' },
    { alternative_angle: 'Six months from now, this email may be one of hundreds in their inbox.' },
  ]) assert.deepEqual(inv(over), [], JSON.stringify(over));
  for (const [field, v] of [
    ['known_fact', 'You sent it at 9 this morning.'],
    ['subtitle_line_1', 'You sent it at 9 this morning to everyone.'],
    ['subtitle_line_1', 'Five years in this job and one typo is all you are worried about.'],
    ['known_fact', 'In five years you have never made a typo before.'],
  ]) assert.deepEqual(inv({ [field]: v }), [field], v);
});

test('angle-v2: answers that reframe in line 1 and carry the step in line 2 pass (they restate little)', () => {
  const probes = [
    ['rel-talk', 'fact_vs_assumption', 'Four words this morning, and your mind has already written the rest.', 'Could you text to ask when tonight suits them to talk?'],
    ['rel-read', 'fact_vs_assumption', "Big words often get a slow reply, and a slow reply isn't an answer yet.", 'Could you ask him in person next time, rather than reading the silence?'],
    ['work-promotion', 'practical_problem', 'One decision about one role is not a ruling on your future there.', 'Could you ask your manager what would make your case stronger next time?'],
    ['work-fraud', 'self_criticism', 'Two years of the job getting done is evidence too, not just the feeling.', 'Could you write down three things you handled that someone relied on?'],
    ['jeal-replaced', 'all_or_nothing', 'A new friend can sit beside you rather than in your seat.', 'Could you suggest a plan this week, just the two of you?'],
    ['dis-birthday', 'fact_vs_assumption', 'Three people chose to spend your birthday with you.', 'Could you message one of them tonight to say you were glad they came?'],
    ['unc-argument', 'fact_vs_assumption', 'Silence since Saturday could be hurt, pride or not knowing how to start.', 'Could you send one short message that opens the door without reopening the argument?'],
    ['anx-results', 'catastrophising', 'A doctor asking to see you tells you how they share results, not what they are.', 'Could you book the soonest slot and jot your questions down today?'],
    ['rum-interview', 'rumination', 'Each replay of Monday makes the answers sound worse than they did in the room.', 'Is there one lesson worth noting for next time, so the rest can rest?'],
    ['self-biscuits', 'self_criticism', 'One evening of biscuits says more about the evening than about you.', 'What was going on in the hour before you opened the packet?'],
    ['soc-class', 'overgeneralisation', 'A quiet start in a new class is a start, not the whole term.', 'Could you ask the person next to you one small question about the class?'],
  ];
  for (const [id, pattern, l1, l2] of probes) {
    const g = qualityGate(scene({ reasoning_pattern: pattern, known_fact: '', subtitle_line_1: l1, subtitle_line_2: l2 }), { text: text(id) });
    assert.deepEqual(g.failures.filter((f) => f.field !== 'known_fact').map((f) => f.code), [], id);
    assert.ok(g.stats.words >= 16 && g.stats.words <= 29, `${id}: ${g.stats.words}`);
  }
});
