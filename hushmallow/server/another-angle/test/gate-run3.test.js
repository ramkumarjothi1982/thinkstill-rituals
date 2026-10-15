// Regressions from the third real-model eval (run 3, 12 Oct 2026, prompt
// angle-v4). Quality was good, but all three fallbacks came from gate false
// positives, and the regeneration recovered none of them:
//  * a repetition count inside a step ("say your opening two sentences out
//    loud three times") read as an invented fact;
//  * "until they feel familiar", where "they" is the lines, read as a claim
//    about other people's feelings;
//  * "who cares" inside a kind reframe ("…who could make that evening, not
//    who cares") read as the shrug "Who cares?";
//  * a third angle of ho-cancelled read as a repeat because "three
//    cancellations" (the person's own "third time") and the friend and the
//    month counted as shared new words.
// Each fix is general and pinned below with the true positives it must keep.
// The answers are in eval/runs/run3-answers.json (extracted from the run's
// log; synthetic inputs from eval/cases.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { qualityGate } from '../src/gate.js';
import { PATTERNS, PATTERN_INTERACTION } from '../src/vocab.js';
import { CASES } from '../eval/cases.js';
import { replayRun, labels } from '../eval/replay.js';

const RUN3 = JSON.parse(readFileSync(new URL('../eval/runs/run3-answers.json', import.meta.url), 'utf8'));
const codes = (g) => g.failures.map((f) => f.code);
const text = (id) => CASES.find((c) => c.id === id).text;
const scene = (over) => ({
  emotion: 'worry', situation_type: 'other', reasoning_pattern: 'catastrophising', interaction_type: 'shrink_projection',
  mallow_character: 'loomi', safety_status: 'ok', known_fact: 'x', possible_assumption: '', alternative_angle: '', practical_next_step: '',
  subtitle_line_1: 'The freeze you keep picturing is a fear rehearsal, not the script.', subtitle_line_2: 'y y y.', ...over,
});
const failure = (g, code, field) => g.failures.find((f) => f.code === code && (!field || f.field === field));

const items = replayRun(RUN3, { cases: CASES });
const key = (it) => `${it.id}#${it.round}.${it.attempt}`;

// --- the run as a whole ------------------------------------------------------------

test('run 3 replay: the fixture holds every answer and every rejected draft of the run', () => {
  assert.equal(RUN3.prompt, 'angle-v4');
  assert.equal(RUN3.results.length, 49);
  assert.equal(items.filter((i) => i.kind === 'accepted').length, 50);
  assert.equal(items.filter((i) => i.kind === 'draft').length, 6);
});

test('run 3 replay: every answer the gate accepted then still passes', () => {
  for (const it of items.filter((i) => i.kind === 'accepted')) assert.deepEqual(labels(it.after), [], key(it));
});

test('run 3 replay: all six rejected drafts were false rejections and now pass', () => {
  for (const k of ['anx-presentation#0.1', 'anx-presentation#0.2', 'dis-birthday#0.1', 'dis-birthday#0.2', 'ho-cancelled#2.1', 'ho-cancelled#2.2']) {
    const it = items.find((i) => key(i) === k);
    assert.ok(it, k);
    assert.ok(it.before.length > 0, k);
    assert.deepEqual(labels(it.after), [], k);
  }
});

// --- a. a repetition count inside a step ---------------------------------------------

test('run 3 anx-presentation: "say your opening two sentences out loud three times" is a step, not a fact', () => {
  const t = text('anx-presentation');
  const inv = (l2, tt = t) => codes(qualityGate(scene({ subtitle_line_2: l2 }), { text: tt })).includes('invented_detail');
  for (const l2 of [
    'Tonight, say your opening two sentences out loud three times.',
    'Say your opening lines out loud three times tonight.',
    'Practise the opening with a friend three times before Thursday.',
    'Run the first slide past the mirror three times, then stop.',
    'Read the first page of your notes aloud twice before bed.',
  ]) assert.ok(!inv(l2), l2);
  // Still facts: occasions ("the three times you froze"), a count inside a
  // clause about the past, a count before the step, and outside any step.
  for (const l2 of [
    'Write down the three times you froze in a presentation before.',
    'Look back at the three times you froze, then plan the opening.',
    'Read the feedback you got three times last term.',
    'Read the comments your boss made three times.',
    'Read the email he sent you three times.',
    'Check why it went wrong three times before.',
    'Say the opening lines you rehearsed three times last week.',
    'Think about the last three times you spoke in public.',
    'You froze three times, so say the opening out loud.',
  ]) assert.ok(inv(l2), l2);
  assert.ok(inv("Since you've checked the hob four times, leave it now.", text('anx-hob')));
});

test('run 3 regeneration feedback: a number in a step is told that the step may count what to do', () => {
  const f = failure(qualityGate(scene({ subtitle_line_2: 'Read the email he sent you three times.' }), { text: text('anx-presentation') }), 'invented_detail');
  assert.match(f.message, /the number "three"/);
  assert.match(f.message, /may count what to do, with the count tied to the action \("write two lines", "say them out loud three times"/);
  assert.match(f.message, /must not restate or add facts about what happened/);
  // Outside a step it says where a count may go instead.
  const g = failure(qualityGate(scene({ subtitle_line_1: 'Seven months of this is a long time to carry it.' }), { text: text('shame-cried') }), 'invented_detail');
  assert.match(g.message, /a count belongs only inside a suggested step/);
});

// --- b. "they" that means a thing --------------------------------------------------------

test('run 3 anx-presentation: "until they feel familiar" is about the lines, not other people', () => {
  const minds = (l2, t) => codes(qualityGate(scene({ subtitle_line_2: l2 }), { text: t })).includes('claims_others_minds');
  const pres = text('anx-presentation');
  for (const l2 of [
    'Tonight, say your opening lines out loud until they feel familiar.',
    'Practise lines out loud until they feel familiar.',
    'Write the first two sentences on a card and read them until they feel easy.',
    'Read your notes aloud tonight until they feel less like a script.',
    "Let's run the opening lines until they feel natural.",
  ]) assert.ok(!minds(l2, pres), l2);
  // A plural thing before it in a text that names nobody: a thing too.
  assert.ok(!minds('Write the worries down so they feel smaller on paper.', 'I keep thinking my exam results will be terrible.'));
  // People: a person word, a name or an owner ("their plans", "your friend's
  // texts") anywhere before it, a feeling or mind word a thing is not said
  // to have, or nothing before it at all.
  const fri = 'My friend cancelled on me for the third time this month.';
  for (const [l2, t] of [
    ['Tell your friend the plans hurt, and they will understand.', fri],
    ['Your friend saw the plans change, and they feel let down.', fri],
    ['After your messages they probably think you are too keen.', fri],
    ["Your friend's texts were short because they need space.", fri],
    ['Their plans keep changing because they feel bad about it.', fri],
    ['The cancelled plans stopped because they feel guilty.', fri],
    ['Ask your friend about the plans, since they feel strange about it.', fri],
    ['They feel fine about the plans, so suggest something closer.', fri],
    ['They will notice you freezing, so practise the opening twice.', pres],
    ['Tonight, say them out loud until they feel familiar.', pres],
  ]) assert.ok(minds(l2, t), l2);
});

test('run 3 regeneration feedback: claims_others_minds names the words, and says to name the thing a "they" means', () => {
  const f = failure(qualityGate(scene({ subtitle_line_2: 'Tonight, say them out loud until they feel familiar.' }), { text: text('anx-presentation') }), 'claims_others_minds', 'subtitle_line_2');
  assert.match(f.message, /The words that read that way: "they feel"\./);
  assert.match(f.message, /If "they" there means a thing rather than people, name the thing instead/);
  const g = failure(qualityGate(scene({ subtitle_line_2: 'Your boss is probably just busy with the client.' }), { text: 'My boss ignored my email.' }), 'claims_others_minds', 'subtitle_line_2');
  assert.match(g.message, /"your boss is probably just busy"/);
  assert.doesNotMatch(g.message, /name the thing/);
});

// --- c. "who cares" in a kind reframe ---------------------------------------------------

test('run 3 dis-birthday: "who could come, not who cares" is a kind reading; the shrug and other put-downs still fail', () => {
  const t = text('dis-birthday');
  const l1 = 'Three people chose to spend your birthday evening with you.';
  const cond = (l2) => codes(qualityGate(scene({ subtitle_line_1: l1, subtitle_line_2: l2 }), { text: t }));
  for (const l2 of [
    "The empty seats count who couldn't come, not who cares.",
    'A turnout of three tells you who could make that evening, not who cares.',
    'The guest list shows who was free, not who cares about you.',
    'Which of the three who came shows you who cares most?',
    'Who cares most about you, the ones who came or the ones who could not?',
  ]) assert.ok(!cond(l2).includes('condescending'), l2);
  for (const [l2, code] of [
    ['Who cares about the empty seats when three people came?', 'condescending'],
    ['Honestly, who cares how many came to your birthday drinks?', 'condescending'],
    ['Three people came to your drinks, so who cares about the rest?', 'condescending'],
    ['Three people came to your drinks, and who cares?', 'condescending'],
    ["You're overreacting about three people at your birthday drinks.", 'blame'],
    ["It's really not a big deal that only three people came.", 'condescending'],
    ['Just get over it, three people came to your birthday drinks.', 'condescending'],
    ['Obviously three people at your birthday drinks is plenty.', 'condescending'],
    ['You should know that three people at birthday drinks is normal.', 'condescending'],
    ['You should know by now that birthday drinks are always small.', 'condescending'],
    ['Calm down, three people came to your birthday drinks.', 'condescending'],
  ]) assert.ok(cond(l2).includes(code), `${l2}: ${cond(l2)}`);
});

test('run 3 regeneration feedback: a content rule quotes the words that tripped it', () => {
  const f = failure(qualityGate(scene({ subtitle_line_2: 'Honestly, who cares how many came to your birthday drinks?' }), { text: text('dis-birthday') }), 'condescending');
  assert.match(f.message, /The words that tripped this check: "who cares"\./);
  const g = failure(qualityGate(scene({ subtitle_line_2: 'Remember that you matter, whatever the message says.' }), { text: 'He has not replied.' }), 'generic_affirmation');
  assert.match(g.message, /"you matter"/);
});

// --- d. a third angle that is genuinely new ----------------------------------------------

const HO_PREV = [
  { subtitle_line_1: 'Three cancellations in a month is a pattern worth naming out loud.', subtitle_line_2: 'What it says about you is still a question only your friend can answer.', reasoning_pattern: 'fact_vs_assumption' },
  { subtitle_line_1: 'Being cancelled on three times this month would hurt almost anyone.', subtitle_line_2: 'Would you rather tell them it hurt, or let them suggest the next plan?', reasoning_pattern: 'valid_anger' },
];
const third = (l1, l2, pattern, previous = HO_PREV, t = text('ho-cancelled')) => qualityGate(scene({
  emotion: 'hurt', situation_type: 'friendship', reasoning_pattern: pattern, interaction_type: PATTERN_INTERACTION[pattern], known_fact: 'Your friend has cancelled on you three times this month.',
  subtitle_line_1: l1, subtitle_line_2: l2,
}), { text: t, previous });

test('run 3 ho-cancelled: both third-angle drafts make a new point; they share only the person\'s own details with angles 1–2', () => {
  const drafts = [
    ['Three cancellations in one month is a lot to carry.', 'Which months before this did your friend actually turn up?'],
    ["Three cancelled plans this month suggest the way you two plan isn't working.", 'Next time, suggest something short and close to them, then see whether it holds.'],
  ];
  for (const [l1, l2] of drafts) {
    for (const p of PATTERNS) {
      const g = third(l1, l2, p);
      // A pattern an earlier angle used is still a repeat (its scene was played).
      if (HO_PREV.some((x) => x.reasoning_pattern === p)) assert.match(failure(g, 'repeats_previous').message, /same reasoning_pattern/, p);
      else assert.ok(!codes(g).includes('repeats_previous'), `${p}: ${JSON.stringify(g.failures)}`);
    }
  }
});

test('novelty: the person\'s own numbers in any form are theirs; real repeats still fail', () => {
  // A restatement said twice, in a new pattern, is still a repeat.
  const restated = [{ subtitle_line_1: 'Your friend cancelled three times this month.', subtitle_line_2: 'What it says about you is still a question only your friend can answer.', reasoning_pattern: 'fact_vs_assumption' }];
  const g1 = third('This month your friend cancelled three times.', 'Which months before this did they actually turn up?', 'overgeneralisation', restated);
  assert.match(failure(g1, 'repeats_previous').message, /Line 1 is close to the angle just shown's line 1/);
  // A line sharing a new word beyond theirs ("hurt", "almost anyone") is still close.
  const g2 = third('Three cancellations this month would hurt almost anyone, honestly.', 'Which months before this did your friend actually turn up?', 'overgeneralisation');
  assert.match(failure(g2, 'repeats_previous').message, /Line 1 is close to angle 2's line 1\. Rewrite that line/);
  // The same new point in other words is still a repeat, and the message
  // names the shared words and only the lenses no earlier pattern used.
  const g3 = third('Saying out loud that it hurt is a pattern worth naming.', 'Let your friend suggest the next plan this time.', 'practical_problem');
  const m = failure(g3, 'repeats_previous').message;
  assert.match(m, /it repeats "loud", "pattern", "naming"/);
  assert.doesNotMatch(m, /what you know versus what you're assuming/);
  assert.match(m, /The person's own details \(their people, event and numbers\) may stay/);
  // "Three" after "the third time" is their number; "four" is not (and is invented anyway).
  const prev = [{ subtitle_line_1: 'Three cancellations are a lot to hold.', subtitle_line_2: 'Which plans did your friend keep this year?', reasoning_pattern: 'overgeneralisation' }];
  assert.ok(!codes(third('Three cancellations can still sit beside years of turning up.', 'Would you rather name it to them, or plan something smaller?', 'valid_anger', prev)).includes('repeats_previous'));
});

// --- review of the run-3 fixes: true positives the first fixes let through ------------
//
// An independent review probed each fix with 92 new lines and found 40 that
// the angle-v4 gate caught and the first fixes passed. Each rule was tightened
// at its root; the probes are pinned here with the run-3 lines they must still
// pass.

const minds = (l1, l2, t) => qualityGate(scene({ known_fact: 'You told me what happened.', subtitle_line_1: l1, subtitle_line_2: l2 }), { text: t });
const mindsAt2 = (g) => g.failures.some((f) => f.code === 'claims_others_minds' && f.field === 'subtitle_line_2');

test('review: "they" with a person anywhere before it, or a feeling not on the thing list, is people', () => {
  const T = {
    team: ['We lost the match and I missed an easy shot.', 'One missed shot is one moment of the match, not the whole result.'],
    grades: ['I got a C in maths and I have to tell my parents.', 'A C in maths is one grade on one subject this term.'],
    party: ['I had a party and only a few people came.', 'A small turnout says more about the evening than about you.'],
    driving: ['I failed my driving test again.', 'Another failed driving test is a skill still forming, not a ceiling.'],
    exam: ['My exam results come out tomorrow and I feel sick.', 'Tomorrow is the day you find out, not the day it was decided.'],
    sister: ['My sister did not reply to my long texts.', 'No reply to long texts leaves the meaning of the silence open.'],
    pres: [text('anx-presentation'), "The freeze you keep picturing is a fear rehearsal, not Thursday's script."],
    gym: ['I feel like everyone at the gym watches me.', 'Feeling watched at the gym is a feeling, not a headcount.'],
  };
  for (const [k, l2] of [
    // Caught by the angle-v4 gate, passed by the first fix.
    ['team', 'Your teammates saw the score, and they feel frustrated with you.'],
    ['grades', 'Show your parents the grades tonight; they will feel relieved.'],
    ['grades', 'Show your parents the results, and they feel reassured straight away.'],
    ['party', 'Send your friends the photos so they feel included.'],
    ['party', 'Your friends saw the photos and they felt excluded.'],
    ['party', 'The guests saw the empty chairs, and they feel sympathetic.'],
    ['driving', 'They feel relaxed around nervous drivers, so book the next test.'],
    ['exam', 'They feel generous when marking borderline papers, so try to sleep.'],
    ['sister', 'Your texts were long, so they feel pressured to reply properly.'],
    ['gym', 'The regulars see the effort, and they feel inspired by it.'],
    ['gym', 'The regulars see newcomers every week, and they feel welcoming.'],
    ['pres', 'Your colleagues have seen the slides, and they feel confident in you.'],
    ['party', 'Text the people who came the photos, since they feel appreciated.'],
    ['team', 'Your coach and the subs saw it, and they feel the miss was bad luck.'],
    // A feeling on the thing list, but a person before it, or nothing at all.
    ['team', 'Your teammates saw the replays and they feel normal about it.'],
    ['team', 'The players watched the replays, and they feel familiar with them.'],
    ['team', 'Your friends read the texts and they feel lighter now.'],
    ['team', 'They feel lighter after a loss, so text the team tonight.'],
    // Kept from the angle-v4 gate.
    ['team', 'Your teammates watched the replays and they feel annoyed about the miss.'],
    ['driving', 'Examiners see nervous drivers daily, and they feel nothing but patience.'],
    ['sister', 'The long texts landed late, and they feel overwhelmed by them.'],
    ['pres', 'Tell the audience your first point clearly and they will feel engaged.'],
    ['grades', 'Your parents read the report cards, and they feel disappointed.'],
    ['party', 'Invite the neighbours next time; they feel left out otherwise.'],
    ['sister', 'Give it a day; they need more time to read texts that long.'],
  ]) assert.ok(mindsAt2(minds(T[k][1], l2, T[k][0])), l2);
  // Things: a plural thing before "they" (in the sentence, or in line 1 for
  // line 2), no person, and a feeling a thing can have.
  for (const [k, l2, l1] of [
    ['pres', 'Tonight, say your opening lines out loud until they feel familiar.'],
    ['pres', 'Read your notes aloud tonight until they feel less like a script.'],
    ['pres', 'Practise the opening lines until they feel automatic.'],
    ['pres', "Read Thursday's slides aloud until they feel familiar."],
    ['pres', 'Your lines need more practice, so say them until they feel natural.'],
    ['exam', 'Write the worries down so they feel smaller on paper.'],
    ['exam', 'Read the worries back tomorrow; they often feel smaller in daylight.'],
    ['sister', 'Reread the texts tomorrow; they may feel shorter after a night.'],
    ['pres', 'They feel easier every time you say them out loud.', 'Your opening lines are the hardest part of Thursday.'],
  ]) assert.ok(!mindsAt2(minds(l1 || T[k][1], l2, T[k][0])), l2);
  // The same line 2 after a line 1 with no thing in it is people.
  assert.ok(mindsAt2(minds(T.pres[1], 'They feel easier every time you say them out loud.', T.pres[0])));
});

test('review: "often" and "usually" frame a typical reading, as angle-v5 asks; after a claim they hedge nothing', () => {
  const t = 'My sister has not replied to my message for two days.';
  const l1 = 'Two days without a reply from your sister is the only fact so far.';
  for (const l2 of [
    'A slow reply often means she is busy, not upset with you.',
    'Usually a quiet sister is a busy one, and she is busy this week.',
    'Your sister is often slow to reply when she is busy.',
  ]) assert.ok(!mindsAt2(minds(l1, l2, t)), l2);
  for (const l2 of [
    'She is upset with you, as she often is.',
    'She is definitely upset, and she usually is.',
    'A slow reply means she is busy, not upset with you.',
  ]) assert.ok(mindsAt2(minds(l1, l2, t)), l2);
});

test('review: the "name the thing" hint comes only where a thing could be meant', () => {
  const t = 'My friend cancelled on me again.';
  const l1 = 'Another cancellation from your friend is worth naming plainly.';
  const msg = (l2) => failure(minds(l1, l2, t), 'claims_others_minds', 'subtitle_line_2').message;
  assert.doesNotMatch(msg("They're probably embarrassed, so text them something light tonight."), /name the thing/);
  assert.match(msg("They're probably embarrassed, so text them something light tonight."), /"they are probably embarrassed"/);
  assert.match(msg('Read your plans back until they feel unfair to you.'), /If "they" there means a thing rather than people, name the thing instead/);
});

test('review: a count after a clause about a noun belongs to that clause, not to the step', () => {
  const A = ['My boss keeps criticising my reports.', 'Feedback on your reports can point to one fixable habit at a time.'];
  const B = ['My flatmate never locks the front door.', 'An unlocked front door is a house rule worth agreeing out loud.'];
  const C = ['My friend cancelled on me again.', 'Another cancellation from your friend is worth naming plainly to them.'];
  const D = ['I keep being late for work.', 'Late mornings usually have one cause you can find and change.'];
  const E = [text('anx-presentation'), "The freeze you keep picturing is a fear rehearsal, not Thursday's script."];
  const inv = ([t, l1], l2) => failure(qualityGate(scene({ subtitle_line_1: l1, subtitle_line_2: l2 }), { text: t }), 'invented_detail', 'subtitle_line_2');
  for (const [c, l2] of [
    // Caught by the angle-v4 gate, passed by the first fix: a second
    // determiner after a noun, or a verb form after one, starts a clause.
    [A, 'Read the comments your boss makes three times a week, then pick one.'],
    [A, 'Go over the reports your boss returns three times a month, then ask.'],
    [D, 'Look at the trains arriving late three times this week, then plan around them.'],
    [B, 'Look at the bins overflowing three times this month, then raise it together.'],
    [A, 'Read the report redone three times and find the one fix that matters.'],
    [A, 'Go over the meetings running over three times this month, then raise it.'],
    [A, 'Read the letter slid under your door three times before replying to it.'],
    [C, 'Try the cafe your friend picks three times a month, and suggest it again.'],
    [E, 'Rehearse the slides your manager reworks three times a week, then stop.'],
    // "Twice" with a habitual frequency after such a clause (missed by both).
    [B, 'Check the door your flatmate leaves open twice a week, then talk it through.'],
    [D, 'Try the bus route running late twice a week, or leave a bit earlier.'],
    [C, 'Write down the plans falling through twice this month, then tell your friend.'],
    [D, 'Check the alarm going off late twice a week, then set a second one.'],
    [D, 'Look at the deadlines slipping twice this month, then ask for help.'],
    [B, 'Check the lock your landlord changes twice a year, then ask for a spare.'],
    [D, 'Do the commute your sister drives twice a week, and time it tonight.'],
    [E, 'Practise the opening your team rewrites twice a week, then sleep.'],
    [A, 'Read the comments that your boss makes three times a week.'],
    [A, 'Look at the plans people cancel three times a month.'],
    [D, 'Check the trains that run late twice a week, then leave earlier.'],
  ]) assert.ok(inv(c, l2), l2);
  // Steps: the action's object, particles and phrases led by a preposition.
  for (const l2 of [
    'Tonight, say your opening two sentences out loud three times.',
    'Read your first slide aloud twice, then put the notes away.',
    'Practise the opening with a friend three times before Thursday.',
    'Say it slowly and clearly three times.',
    'Say that three times before bed.',
    'Do this three times a day until Thursday.',
    'Read your notes and the slides aloud twice.',
    'Practise your lines standing up three times.',
    'Practise saying it three times tonight.',
    'Say "I can do this" three times before you go in.',
    'Read the first slide in front of the mirror three times.',
    'Read your team meeting notes three times.',
    'Rehearse the first two lines three times a day until Thursday.',
    'Say it to her three times, slowly.',
  ]) assert.ok(!inv(E, l2), l2);
  assert.ok(!inv(C, 'Read your message to your friend out loud twice before you send it.'));
  assert.ok(!inv(D, 'Check your alarm settings twice tonight, then go to bed.'));
  // The message says which words made it a fact.
  assert.match(inv(A, 'Read the comments your boss makes three times a week, then pick one.').message, /"the comments your boss makes three times a week" describes what happens, so it reads as a fact about their situation, not part of the step/);
  assert.match(inv(C, 'Text the friend who cancelled four times and ask what is going on.').message, /"the friend who cancelled four times" describes what happened/);
});

test('review: "who cares" is a shrug unless it names the people who care', () => {
  const bd = text('dis-birthday');
  const l1 = 'Three people chose to spend your birthday evening with you.';
  const cond = (l2, t = bd) => codes(qualityGate(scene({ subtitle_line_1: l1, subtitle_line_2: l2 }), { text: t })).includes('condescending');
  const wk = 'I cried at work today and everyone saw.';
  const ex = 'I made a typo in an email to my whole team.';
  for (const [l2, t] of [
    ['In the end who cares how many came to your birthday drinks?'],
    ['At the end of the day who cares about the empty seats?'],
    ['Three people came and who cares about the rest of them?'],
    ['Then who cares how many turned up to your drinks?'],
    ['Because who cares about a headcount at birthday drinks?'],
    ['So really who cares about the people who stayed home?'],
    ['Let us be honest who cares about the empty chairs?'],
    ['Who cares about you crying at work for a minute?', wk],
    ['Who cares about you tearing up in front of everyone today?', wk],
    ['Who cares enough to notice one typo in a team email?', ex],
    ['Who cares more about a typo than the actual message?', ex],
    ['Who cares deeply about one typo in an email anyway?', ex],
    ['Who cares most about typos, and does it change anything?', ex],
    ['One typo and who cares, the email still did its job.', ex],
    ['Who cares for typos in a busy team inbox, really?', ex],
    ['A typo in an email, who cares about something that small?', ex],
    ['Who on earth cares how many people came to your drinks?'],
    ['Who even really cares how many came to your drinks?'],
    ['Seriously, who cares about the rest of them?'],
    ['Who cares if only three people came?'],
  ]) assert.ok(cond(l2, t), l2);
  for (const l2 of [
    "The empty seats count who couldn't come, not who cares.",
    'A turnout of three tells you who could make that evening, not who cares.',
    'Which of the three who came shows you who cares most?',
    'Which of your team would you check with about who cares most?',
    'Three people came, and each one is someone who cares about you.',
    'A small turnout cannot show you who cares.',
    "You'll find out who cares by who stays in touch.",
    'A headcount says nothing about who cares.',
    'Ask yourself who cares about you, not who turned up.',
    'Who cares most about you, the ones who came or the ones who could not?',
  ]) assert.ok(!cond(l2), l2);
});

test('review: a restatement in the person\'s own words is a repeat; three shared details at 0.6 are not', () => {
  const BOSS = 'My boss criticised my report in front of the team.';
  const rep = (prev, l1, l2) => codes(qualityGate(scene({ reasoning_pattern: 'valid_anger', interaction_type: 'find_boundary', known_fact: 'Your boss criticised your report in front of the team.', subtitle_line_1: l1, subtitle_line_2: l2 }), { text: BOSS, previous: [prev] })).includes('repeats_previous');
  // Five of their words at a line Jaccard of 0.71: the event said again.
  assert.ok(rep({ subtitle_line_1: 'Your boss criticised your report in front of the whole team.', subtitle_line_2: 'Could you ask for the feedback in writing this week?', reasoning_pattern: 'practical_problem' },
    'In front of the team, your boss criticised the report you wrote.', 'Would you rather raise it with her privately, or note it down first?'));
  assert.ok(rep({ subtitle_line_1: 'Your boss criticised your report in front of the team.', subtitle_line_2: 'Which point in the feedback could you fix first?', reasoning_pattern: 'practical_problem' },
    'Criticising your report in front of the team was your boss choosing the room.', 'Would you rather raise the setting privately, or keep a note of it?'));
  // A new point with their details is not.
  assert.ok(!rep({ subtitle_line_1: 'Your boss criticised your report in front of the team.', subtitle_line_2: 'Could you ask for the feedback in writing this week?', reasoning_pattern: 'practical_problem' },
    'Being corrected in front of colleagues can sting far more than the words.', 'Would you rather raise how it was done, or only what was said?'));
  // Run 3's ho-cancelled draft 1 shares three of their words with angle 2's
  // line 1 (three, cancelled, month; 0.60) and makes a different point.
  assert.ok(!codes(third('Three cancellations in one month is a lot to carry.', 'Which months before this did your friend actually turn up?', 'overgeneralisation')).includes('repeats_previous'));
});

// --- the replay records what it could not know ---------------------------------------

test('replay: a draft keeps its recorded pattern; without one, a follow-up that fell back assumes an unused pattern', () => {
  const run = { results: [{ id: 'ho-cancelled', rounds: [
    { status: 'ok', scene: { ...scene({}), ...HO_PREV[0] }, meta: { gate: 'pass', drafts: [] } },
    { status: 'fallback', scene: null, meta: { gate: 'fail', drafts: [
      { attempt: 1, lines: ['Three cancellations in one month is a lot to carry.', 'Which months before this did your friend actually turn up?'], failures: [{ code: 'repeats_previous', field: 'lines' }] },
      { attempt: 2, pattern: 'fact_vs_assumption', lines: ['Three cancellations in one month is a lot to carry.', 'Which months before this did your friend actually turn up?'], failures: [{ code: 'repeats_previous', field: 'lines' }] },
    ] } },
  ] }] };
  const [a, b] = replayRun(run, { cases: CASES }).filter((i) => i.kind === 'draft');
  assert.deepEqual(labels(a.after), []);
  assert.deepEqual(labels(b.after), ['repeats_previous@lines']);
});

test('extract-log reads a draft\'s pattern and what the regeneration was told, and still reads older reports', async () => {
  const run = promisify(execFile);
  const dir = mkdtempSync(join(tmpdir(), 'extract-'));
  const md = [
    '# Another Angle eval — test', '', 'Model `m` (effort low); judge `j` (judge-v1); prompt angle-v5.', '',
    '## Gate rejections', '',
    '- **dis-birthday**, attempt 1 (overgeneralisation): “Three people came.” / “Who cares about the rest?”',
    '  - `condescending` on subtitle_line_2: “Who cares about the rest?”',
    '    - told: Avoid condescending words. The words that tripped this check: "Who cares".',
    '- **dis-birthday**, attempt 2: “Three people came.” / “Thank the three who came.”',
    '  - `too_short` on lines', '',
    '## Cases', '', '### dis-birthday — disappointment', '',
    'status **fallback** (quality); gate fail [condescending, too_short]; attempts 2; 3.0 s', '',
  ].join('\n');
  writeFileSync(join(dir, 'log.txt'), md);
  await run(process.execPath, [fileURLToPath(new URL('../eval/extract-log.mjs', import.meta.url)), join(dir, 'log.txt'), join(dir, 'out.json')]);
  const out = JSON.parse(readFileSync(join(dir, 'out.json'), 'utf8'));
  const [d1, d2] = out.results[0].rounds[0].meta.drafts;
  assert.equal(d1.pattern, 'overgeneralisation');
  assert.equal(d1.failures[0].message, 'Avoid condescending words. The words that tripped this check: "Who cares".');
  assert.equal(d2.pattern, undefined);
  assert.equal(d2.failures[0].message, undefined);
});
