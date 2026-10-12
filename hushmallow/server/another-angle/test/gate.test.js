import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualityGate } from '../src/gate.js';
import { ANCHORS, anchor } from './helpers.js';

const codes = (g) => g.failures.map((f) => f.code);
const gate = (i, over, ctx = {}) => qualityGate(anchor(i, over), { text: ANCHORS[i].text, ...ctx });
const expectFail = (g, code) => assert.ok(codes(g).includes(code), `expected ${code}, got ${JSON.stringify(codes(g))}`);

test('the five strong answers from the brief pass the gate', () => {
  for (const a of ANCHORS) {
    const g = qualityGate(a.scene, { text: a.text });
    assert.deepEqual(g.failures, [], a.text);
    assert.ok(g.stats.words >= 15 && g.stats.words <= 35);
  }
});

test('the weak answers from the brief are rejected for the right reasons', () => {
  const a = gate(0, { subtitle_line_1: 'Remember that you are worthy and valuable.', subtitle_line_2: 'Practise self-love.' });
  expectFail(a, 'generic_affirmation');
  expectFail(a, 'too_short');
  expectFail(a, 'not_specific');
  const b = gate(1, { subtitle_line_1: "Don't worry.", subtitle_line_2: 'He probably loves you.' });
  expectFail(b, 'false_reassurance');
  expectFail(b, 'claims_others_minds');
  const c = gate(2, { subtitle_line_1: 'Believe in yourself.', subtitle_line_2: 'You are amazing.' });
  expectFail(c, 'generic_affirmation');
  expectFail(c, 'too_short');
});

test('length: 15–35 words in total, each line at most 22 words, one sentence per line', () => {
  const long = 'Your boss may have been unfair in that meeting today and it is reasonable to feel stung by the way it was handled in front of people.';
  expectFail(gate(0, { subtitle_line_1: long }), 'line_too_long');
  expectFail(gate(0, { subtitle_line_1: long, subtitle_line_2: long }), 'too_long');
  expectFail(gate(1, { subtitle_line_1: 'Five hours is a fact. It is only that.' }), 'line_sentence_count');
  expectFail(gate(1, { subtitle_line_2: 'What it means is still open' }), 'line_unfinished');
  expectFail(gate(1, { subtitle_line_2: 'Busy? Asleep? Something else?' }), 'too_many_questions');
  expectFail(gate(1, { known_fact: 'Your message to him has now gone five whole hours without any reply at all, which is a long time to wait for anyone.' }), 'field_too_long');
  expectFail(gate(1, { practical_next_step: 'Wait a bit. Then check.' }), 'field_sentences');
});

test('abbreviations do not split sentences', () => {
  const g = gate(1, { subtitle_line_2: 'What it means, e.g. busy or asleep, is still an unanswered question.' });
  assert.ok(!codes(g).includes('line_sentence_count'), JSON.stringify(codes(g)));
});

test('stock empathy openers, jargon and pattern names are rejected', () => {
  expectFail(gate(1, { subtitle_line_1: 'I understand how you feel about the five hours.' }), 'empathy_opener');
  expectFail(gate(1, { subtitle_line_1: 'That sounds really hard, five hours is a long wait.' }), 'empathy_opener');
  expectFail(gate(1, { subtitle_line_1: "It's completely normal to feel anxious after five hours." }), 'empathy_opener');
  expectFail(gate(1, { subtitle_line_2: 'This is a classic cognitive distortion about the reply.' }), 'therapy_jargon');
  expectFail(gate(1, { subtitle_line_2: 'You might be catastrophising about what the reply means.' }), 'therapy_jargon');
  expectFail(gate(4, { subtitle_line_2: 'Try a grounding exercise to stop ruminating on the moment.' }), 'therapy_jargon');
  expectFail(gate(0, { subtitle_line_1: 'Your feelings are valid after what your boss did.' }), 'therapy_jargon');
  expectFail(gate(2, { subtitle_line_2: 'An ACT approach would help you with the exam result.' }), 'therapy_jargon');
});

test('false reassurance, cure claims, blame, condescension and forgiveness pressure are rejected', () => {
  expectFail(gate(1, { subtitle_line_2: 'Everything will be fine once he finally replies to the message.' }), 'false_reassurance');
  expectFail(gate(0, { subtitle_line_2: 'Nobody noticed it as much as you think they did in that room.' }), 'false_reassurance');
  expectFail(gate(1, { subtitle_line_2: "Taking a breath will make you feel better about the message." }), 'cure_claim');
  expectFail(gate(0, { subtitle_line_2: 'You overreacted a little to what your boss said in front of everyone.' }), 'blame');
  expectFail(gate(1, { subtitle_line_2: 'Obviously five hours of silence is no big deal for a message.' }), 'condescending');
  expectFail(gate(0, { subtitle_line_2: 'The best thing is to let it go and focus on your next week at work.' }), 'forgive_pressure');
});

test('never mentions AI or claims to be human', () => {
  expectFail(gate(1, { subtitle_line_1: 'As an AI, I see five hours without a reply as a fact.' }), 'ai_mention');
  expectFail(gate(1, { subtitle_line_1: 'Our AI noticed five hours without a reply is a fact.' }), 'ai_mention');
  expectFail(gate(1, { subtitle_line_1: "I've been there, and five hours without a reply is a fact." }), 'human_claim');
});

test('claims about other people\'s minds are rejected unless offered as possibilities', () => {
  expectFail(gate(1, { subtitle_line_2: "He's probably just busy with work and will reply soon." }), 'claims_others_minds');
  expectFail(gate(1, { subtitle_line_2: 'He cares about you and the message matters to him.' }), 'claims_others_minds');
  expectFail(gate(0, { subtitle_line_2: 'Your boss was trying to help, even if the delivery in front of everyone was clumsy.' }), 'claims_others_minds');
  expectFail(gate(0, { alternative_angle: "It wasn't personal; your boss treats everyone like that." }), 'claims_others_minds');
  expectFail(gate(0, { subtitle_line_2: 'No one is judging you for what your boss said in the meeting.' }), 'claims_others_minds');
  // Hedged or asked, the same idea is fine.
  for (const ok of [
    'He might be busy, asleep, or simply not looking at the message yet.',
    'Could he be busy, or is the silence filling in a story you dread?',
  ]) assert.ok(!codes(gate(1, { subtitle_line_2: ok })).includes('claims_others_minds'), ok);
  // Describing what someone did is a fact, not mind-reading.
  assert.ok(!codes(gate(0, { known_fact: 'Your boss embarrassed you in front of everyone.' })).includes('claims_others_minds'));
});

test('harsh labels are neither repeated nor flatly denied', () => {
  expectFail(gate(2, { subtitle_line_2: "You're useless at exams, but that can change with practice." }), 'label_echo');
  expectFail(gate(2, { subtitle_line_2: "You're not useless, you just had one bad exam day." }), 'counter_label');
});

test('British spelling is required, but the person\'s own words are respected', () => {
  expectFail(gate(0, { subtitle_line_2: "Your boss's behavior in front of everyone is something you can document." }), 'american_spelling');
  expectFail(gate(2, { subtitle_line_2: 'You can realize a lot from one failed exam about what to study.' }), 'american_spelling');
  expectFail(gate(2, { practical_next_step: 'Pick one exam topic to practice every evening this week.' }), 'american_spelling');
  // "size" and "prize" are not -ize Americanisms.
  assert.ok(!codes(gate(2, { subtitle_line_2: "It didn't measure the size of what you're capable of learning." })).includes('american_spelling'));
  // The person wrote "mom", so the reply may too.
  const g = qualityGate(anchor(1, { subtitle_line_1: 'Your mom not replying for five hours is a fact.' }), { text: "My mom hasn't replied to my message for five hours." });
  assert.ok(!codes(g).includes('american_spelling'), JSON.stringify(codes(g)));
});

test('invented details (numbers, names) are rejected', () => {
  expectFail(gate(1, { subtitle_line_1: 'Six hours without a reply is a fact.' }), 'invented_detail');
  expectFail(gate(0, { subtitle_line_1: "Your boss Sarah's behaviour may have been unfair." }), 'invented_detail');
  // Numbers the person gave are fine, in digits or words.
  const g = qualityGate(anchor(1), { text: "He hasn't replied to my message for 5 hours." });
  assert.deepEqual(codes(g), []);
});

test('links, code, markup, lists, emoji and jokes are rejected', () => {
  expectFail(gate(1, { subtitle_line_2: 'Read more at https://example.com about unanswered messages.' }), 'link_or_code');
  expectFail(gate(1, { subtitle_line_2: 'What it means is <b>still</b> an unanswered question.' }), 'link_or_code');
  expectFail(gate(1, { practical_next_step: 'Call 0800 123 4567 if the message silence feels too much.' }), 'link_or_code');
  expectFail(gate(1, { subtitle_line_2: '- What it means is still an unanswered question.' }), 'list');
  expectFail(gate(1, { subtitle_line_2: 'What it means is still an unanswered question 🙂.' }), 'emoji');
  expectFail(gate(1, { subtitle_line_2: 'What it means is still an unanswered question, lol.' }), 'jokey_tone');
  expectFail(gate(2, { subtitle_line_2: "It didn't measure everything you're capable of learning!" }), 'exclamation');
});

test('the lines must engage the person\'s actual situation', () => {
  const g = gate(2, { subtitle_line_1: 'Sometimes life is hard and things go wrong.', subtitle_line_2: 'What matters is what you choose to do next.' });
  expectFail(g, 'not_specific');
  expectFail(gate(1, { known_fact: 'Something difficult happened today.' }), 'fact_not_from_text');
  // Quoting the person's own word counts as engaging with it.
  const q = qualityGate(anchor(1, {
    subtitle_line_1: '"Nobody" is a very big word for one quiet evening.',
    subtitle_line_2: 'Who did you actually hear from this week?',
    known_fact: 'You feel like nobody likes you.',
  }), { text: 'Nobody likes me.' });
  assert.ok(!codes(q).includes('not_specific'), JSON.stringify(codes(q)));
});

test('another angle must be genuinely different from the angles already shown', () => {
  const prev = [{ subtitle_line_1: ANCHORS[1].scene.subtitle_line_1, subtitle_line_2: ANCHORS[1].scene.subtitle_line_2, reasoning_pattern: 'fact_vs_assumption' }];
  expectFail(gate(1, {}, { previous: prev }), 'repeats_previous');
  expectFail(gate(1, { subtitle_line_2: 'What it means is still a question without an answer.' }, { previous: prev }), 'repeats_previous');
  const fresh = gate(1, {
    reasoning_pattern: 'rumination', interaction_type: 'let_loop_drift', mallow_character: 'noomi',
    subtitle_line_1: 'Checking your phone again will not make the message arrive faster.',
    subtitle_line_2: 'What could you do for the next hour that has nothing to do with him?',
  }, { previous: prev });
  assert.deepEqual(codes(fresh), []);
});

test('painful subjects get no exclamation marks at all', () => {
  const g = qualityGate(anchor(2, { emotion: 'grief', subtitle_line_2: "It didn't measure everything you're capable of learning!" }), { text: ANCHORS[2].text });
  expectFail(g, 'exclamation');
});

test('every failure carries a code, a field and a plain instruction for the regeneration', () => {
  const g = gate(1, { subtitle_line_1: "Don't worry.", subtitle_line_2: 'He probably loves you.' });
  for (const f of g.failures) {
    assert.match(f.code, /^[a-z_]+$/);
    assert.ok(f.field.length > 0);
    assert.ok(f.message.length > 15);
  }
});
