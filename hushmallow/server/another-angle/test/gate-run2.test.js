// Regressions from the second real-model eval (run 2, 12 Oct 2026, prompt
// angle-v2) and from the review of the first round of gate fixes. Run 2 was
// written by a different prompt from the one the run-1 fixes were fitted to,
// so it is the nearest thing to held-out data the gate has: every answer the
// gate accepted then must still pass, and each false rejection is pinned
// here. The answers are in eval/runs/run2-answers.json (extracted from the
// run's log; synthetic inputs from eval/cases.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { qualityGate } from '../src/gate.js';
import { stem } from '../src/text.js';
import { CASES } from '../eval/cases.js';
import { replayRun, labels } from '../eval/replay.js';

const RUN2 = JSON.parse(readFileSync(new URL('../eval/runs/run2-answers.json', import.meta.url), 'utf8'));
const codes = (g) => g.failures.map((f) => f.code);
const text = (id) => CASES.find((c) => c.id === id).text;
const scene = (over) => ({
  emotion: 'worry', situation_type: 'other', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart',
  mallow_character: 'zuzu', safety_status: 'ok', known_fact: 'x', possible_assumption: '', alternative_angle: '', practical_next_step: '',
  subtitle_line_1: 'x x x.', subtitle_line_2: 'y y y.', ...over,
});

const items = replayRun(RUN2, { cases: CASES });
const key = (it) => `${it.id}#${it.round}.${it.attempt}`;

test('run 2 replay: the fixture holds every answer and every rejected draft of the run', () => {
  assert.equal(RUN2.prompt, 'angle-v2');
  assert.equal(items.filter((i) => i.kind === 'accepted').length, 40);
  assert.equal(items.filter((i) => i.kind === 'draft').length, 6);
});

test('run 2 replay: every answer the gate accepted then still passes', () => {
  for (const it of items.filter((i) => i.kind === 'accepted')) assert.deepEqual(labels(it.after), [], key(it));
});

test('run 2 replay: three false rejections now pass; the real ones still fail, for that reason only', () => {
  for (const k of ['anx-presentation#0.1', 'soc-invite#0.1', 'self-driving#1.1']) {
    const it = items.find((i) => key(i) === k);
    assert.ok(it.before.length > 0, k);
    assert.deepEqual(labels(it.after), [], k);
  }
  for (const [k, n] of [['work-pitch#0.1', 36], ['shame-party#0.1', 40], ['dis-flat#0.1', 37]]) {
    const it = items.find((i) => key(i) === k);
    assert.deepEqual(labels(it.after), ['too_long@lines'], k);
    assert.equal(it.words, n, k);
  }
});

test('run 2 self-driving: the next attempt, looked at ahead, is not a miscount; as something done it is', () => {
  const t = text('self-driving');
  const inv = (l2, tt = t) => codes(qualityGate(scene({ subtitle_line_1: 'A b c d.', subtitle_line_2: l2 }), { text: tt })).includes('invented_detail');
  assert.ok(!inv('What would you actually tell that friend to do before booking test number four?'));
  // Not an eval input: the held-out cases stay out of the gate's tests where they can.
  const lunch = 'My sister has cancelled our lunch for the third time this month.';
  assert.ok(!inv('If she cancels a fourth time, what would you want to say?', lunch));
  for (const l2 of ["You've failed a fourth time.", 'After a fourth test, which fault keeps turning up?', 'Before booking test number five, which fault would you fix?']) assert.ok(inv(l2), l2);
  assert.ok(inv('She has cancelled a fourth time now.', lunch));
});

// --- each run-2 false positive on its own ---------------------------------------

test('run 2 anx-presentation: "say them aloud three times" in a step is a count of what to do', () => {
  const g = qualityGate(scene({ practical_next_step: 'Write your first two sentences on a card and say them aloud three times today.' }), { text: text('anx-presentation') });
  assert.ok(!codes(g).includes('invented_detail'), JSON.stringify(g.failures));
  // A count of past occasions is still a fact.
  const g2 = qualityGate(scene({ practical_next_step: 'Write down the three times you froze in a presentation before.' }), { text: text('anx-presentation') });
  assert.ok(codes(g2).includes('invented_detail'));
});

test('run 2 dis-flat: "the three things you loved most" is a choice to make, not a count of the past', () => {
  const g = qualityGate(scene({ practical_next_step: 'Write down the three things you loved most about that flat to guide your next search.' }), { text: text('dis-flat') });
  assert.ok(!codes(g).includes('invented_detail'), JSON.stringify(g.failures));
});

test('run 2 self-driving: "like proof that you\'re stupid" names their verdict, it does not apply it', () => {
  const t = text('self-driving');
  assert.ok(!codes(qualityGate(scene({ possible_assumption: "Three failed tests might feel like proof that you're stupid in general." }), { text: t })).includes('label_echo'));
  // Each use is checked on its own: a frame covers only the use it ends on.
  for (const bad of ["You might be treating it as proof you're stupid, and honestly you are stupid.", "You called yourself stupid, but you're stupid only if you stop."]) {
    assert.ok(codes(qualityGate(scene({ possible_assumption: bad }), { text: t })).includes('label_echo'), bad);
  }
});

test('run 2 soc-invite: "only she knows" leaves her reasons open; "as a friend" can describe their friendship', () => {
  const t = text('soc-invite');
  const g = qualityGate(scene({
    known_fact: 'Your friend invited everyone except you to her birthday.',
    subtitle_line_1: 'Being left off her birthday list hurts, and the reason is still something only she knows.',
    subtitle_line_2: 'Could you tell her simply that you felt left out, and ask what happened?',
    possible_assumption: "You might be reading it as proof she doesn't value you as a friend.",
  }), { text: t });
  assert.deepEqual(codes(g), []);
  // Still caught: her reasons as fact, and a speaker claiming friendship.
  assert.ok(codes(qualityGate(scene({ subtitle_line_1: 'She knows why she left you out, and it was on purpose.' }), { text: t })).includes('claims_others_minds'));
  for (const v of ['As a friend, I think you should ask her.', 'Speaking as a friend, she was probably busy.']) {
    assert.ok(codes(qualityGate(scene({ alternative_angle: v }), { text: t })).includes('human_claim'), v);
  }
});

// --- review of the first round of fixes ---------------------------------------------

test('line 2 and the step may restate what the person said happened before suggesting something', () => {
  const g1 = qualityGate(scene({ reasoning_pattern: 'valid_anger', interaction_type: 'find_boundary', subtitle_line_1: 'A quick sorry for a day that mattered can sting more than the forgetting.', subtitle_line_2: 'Since she forgot the day, you could tell her calmly that it mattered.' }), { text: text('rel-anniversary') });
  assert.ok(!codes(g1).includes('claims_others_minds'), JSON.stringify(g1.failures));
  const late = "I've been late to work twice this week and my manager noticed.";
  const g2 = qualityGate(scene({ subtitle_line_1: 'Twice in one week is a pattern you can fix.', subtitle_line_2: 'Your manager noticed, so a quick word about your plan could help.' }), { text: late });
  assert.ok(!codes(g2).includes('claims_others_minds'), JSON.stringify(g2.failures));
  // A new guess about their mind is still a claim there.
  for (const l2 of ['Your manager noticed and thinks you are careless, so say sorry.', 'Since she forgot, she clearly does not care about the day.']) {
    const g = qualityGate(scene({ subtitle_line_1: 'Twice in one week is a pattern you can fix.', subtitle_line_2: l2 }), { text: l2.includes('manager') ? late : text('rel-anniversary') });
    assert.ok(codes(g).includes('claims_others_minds'), l2);
  }
});

test('well-known phrases count as quoted: "three words" for "I told him I loved him"', () => {
  const g = qualityGate(scene({ subtitle_line_1: 'Three words that big can take a while to answer.', subtitle_line_2: 'Could you ask him in person, rather than reading the silence?' }), { text: text('rel-read') });
  assert.ok(!codes(g).includes('invented_detail'), JSON.stringify(g.failures));
  const g2 = qualityGate(scene({ subtitle_line_1: 'Three words got one word back, and that stung.', subtitle_line_2: 'Could you ask her what thanks meant to her?' }), { text: 'I told my girlfriend I love you and she said thanks.' });
  assert.ok(!codes(g2).includes('invented_detail'), JSON.stringify(g2.failures));
  // Any other count of them is still invented.
  assert.ok(codes(qualityGate(scene({ subtitle_line_1: 'Four words that big can take a while to answer.' }), { text: text('rel-read') })).includes('invented_detail'));
});

test('"two or three people" inside a step is a count of what to do', () => {
  const g = qualityGate(scene({ subtitle_line_1: 'A new class is new for everyone in it.', subtitle_line_2: 'Could you ask two or three people one small question this week?' }), { text: text('soc-class') });
  assert.ok(!codes(g).includes('invented_detail'), JSON.stringify(g.failures));
});

test('stems: a plain plural of a listed word is that word ("courses" meets "course" and "university")', () => {
  assert.equal(stem('courses'), stem('course'));
  assert.equal(stem('courses'), stem('university'));
  assert.equal(stem('topics'), stem('exam'));
});
