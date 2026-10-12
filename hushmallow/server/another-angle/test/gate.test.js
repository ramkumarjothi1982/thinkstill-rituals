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
  // Clause-aware hedging.
  for (const [line, bad] of [
    ["Even if your boss is annoyed, that doesn't decide whether you're good at your job.", false],
    ["It's possible that, after a long day, your boss is simply tired.", false],
    ['Your boss might not have read it yet, and your boss is probably busy.', true],
    ['Your boss was trying to help, even if the delivery was clumsy.', true],
    ['Your boss may be stressed, but your boss definitely respects you.', true],
  ]) {
    const has = codes(gate(0, { alternative_angle: line })).includes('claims_others_minds');
    assert.equal(has, bad, line);
  }
  // Quoting the person's own words is not a claim.
  const quoted = qualityGate(anchor(1, {
    subtitle_line_1: '"Nobody likes me" is a heavy sentence to carry from one quiet evening.',
    subtitle_line_2: 'Who did you actually hear from this week?',
    known_fact: 'You wrote "nobody likes me" after a quiet evening.',
  }), { text: 'Nobody likes me. It was a quiet evening.' });
  assert.ok(!codes(quoted).includes('claims_others_minds'), JSON.stringify(codes(quoted)));
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

// --- Regressions from the W6 review (12 Oct 2026) ---------------------------

/** A full, rule-following scene for an input, so only the field under test can fail. */
const sceneFor = (over) => ({
  emotion: 'hurt', situation_type: 'relationship', reasoning_pattern: 'valid_anger', possible_assumption: '',
  interaction_type: 'find_boundary', mallow_character: 'blubi', safety_status: 'ok', ...over,
});

test('a faithful known_fact passes; doubting the person\'s account is not required (eval rel-anniversary)', () => {
  const text = 'My girlfriend forgot our anniversary and just said sorry like it was nothing.';
  const base = sceneFor({
    alternative_angle: 'Being hurt by a brushed-off apology is a reasonable response.',
    practical_next_step: 'Tell your girlfriend plainly what the anniversary meant to you.',
    subtitle_line_1: 'A forgotten anniversary and a quick sorry can land harder than the date itself.',
    subtitle_line_2: 'What would a real apology from your girlfriend need to include for you?',
  });
  for (const kf of [
    'Your girlfriend forgot your anniversary and said sorry quickly.',
    'You said your girlfriend forgot your anniversary.',
    'Your girlfriend forgot your anniversary.',
  ]) assert.deepEqual(codes(qualityGate({ ...base, known_fact: kf }, { text })), [], kf);
  // Line 1 may restate it too.
  for (const l1 of ['Your girlfriend forgot your anniversary, and that sorry sounded like a shrug.', 'She forgot your anniversary, and the quick sorry stung more than the date.']) {
    assert.deepEqual(codes(qualityGate({ ...base, known_fact: 'Your girlfriend forgot your anniversary.', subtitle_line_1: l1 }, { text })), [], l1);
  }
  // A new motive is still a claim, even in known_fact and line 1.
  expectFail(qualityGate({ ...base, known_fact: 'Your girlfriend forgot your anniversary because she does not care.' }, { text }), 'claims_others_minds');
  expectFail(qualityGate({ ...base, subtitle_line_1: 'Your girlfriend forgot your anniversary, and she clearly doesn\'t care.' }, { text }), 'claims_others_minds');
  // The regeneration message no longer steers towards doubt ("may have forgotten").
  const msg = qualityGate({ ...base, known_fact: 'Your girlfriend forgot because she does not care.' }, { text }).failures.find((f) => f.code === 'claims_others_minds').message;
  assert.match(msg, /never cast doubt on what they said happened/);
  assert.doesNotMatch(msg, /only offer that as a possibility/);
});

test('"Nobody likes me.": the person\'s feeling restated as theirs passes; stated as fact it does not', () => {
  const text = 'Nobody likes me.';
  const base = sceneFor({
    emotion: 'loneliness', situation_type: 'social', reasoning_pattern: 'overgeneralisation', interaction_type: 'separate_one', mallow_character: 'zuzu',
    possible_assumption: 'You might be turning a few painful moments into a rule about everyone.',
    alternative_angle: 'How people feel about you is usually mixed and harder to read than it seems.',
    practical_next_step: 'Send one low-stakes message to someone you have enjoyed talking to.',
    subtitle_line_1: '"Nobody" is a very big word for one quiet evening.',
    subtitle_line_2: 'Who did you actually hear from this week?',
  });
  for (const kf of ['You feel like nobody likes you.', 'You feel that nobody likes you.', 'Right now it feels like nobody likes you.']) {
    assert.deepEqual(codes(qualityGate({ ...base, known_fact: kf }, { text })), [], kf);
  }
  assert.deepEqual(codes(qualityGate({ ...base, known_fact: 'You feel like nobody likes you.', subtitle_line_1: 'When it feels like nobody likes you, every quiet moment can look like proof.' }, { text })), []);
  // Agreeing with the overgeneralisation is not a restatement.
  expectFail(qualityGate({ ...base, known_fact: 'Nobody likes you.' }, { text }), 'claims_others_minds');
  expectFail(qualityGate({ ...base, subtitle_line_1: 'Nobody likes you, and that is heavy to carry.' }, { text }), 'claims_others_minds');
  // The gate's own earlier test scene now passes as a whole.
  assert.deepEqual(codes(qualityGate(anchor(1, { subtitle_line_1: '"Nobody" is a very big word for one quiet evening.', subtitle_line_2: 'Who did you actually hear from this week?', known_fact: 'You feel like nobody likes you.' }), { text })), []);
});

test('"My dad never says he\'s proud of me": a negated report is not mind-reading', () => {
  const text = "My dad never says he's proud of me.";
  const base = sceneFor({
    reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', mallow_character: 'zuzu',
    possible_assumption: "You might be assuming that silence means he isn't proud.",
    alternative_angle: 'Some people find it hard to say things they still feel.',
    practical_next_step: 'Decide whether you want to tell your dad what hearing it would mean to you.',
    subtitle_line_1: 'Not hearing it from your dad can hurt for years.',
    subtitle_line_2: 'Whether he feels it and whether he says it may be two different things.',
  });
  for (const kf of ["Your dad hasn't told you he's proud of you.", "Your dad never says he's proud of you."]) {
    assert.deepEqual(codes(qualityGate({ ...base, known_fact: kf }, { text })), [], kf);
  }
  // Asserting what he feels is still a claim, even with "even if" after it.
  expectFail(qualityGate({ ...base, alternative_angle: 'Your dad is proud of you even if he never says it.' }, { text }), 'claims_others_minds');
  expectFail(qualityGate({ ...base, subtitle_line_2: 'Your dad is proud of you, he just struggles to say it.' }, { text }), 'claims_others_minds');
});

test('"My boss ignored me": the event restated passes; a denial or a motive does not', () => {
  const text = 'My boss ignored me in the meeting.';
  const base = sceneFor({
    emotion: 'hurt', situation_type: 'work', reasoning_pattern: 'mind_reading', interaction_type: 'open_interpretations', mallow_character: 'pipzi',
    possible_assumption: 'You might be reading the silence as a judgement of you.',
    alternative_angle: 'Your boss could have been distracted, rushed or focused on something else entirely.',
    practical_next_step: 'If it keeps bothering you, ask your boss a short, neutral question about your point.',
    subtitle_line_1: 'Being passed over in a meeting can sting for the rest of the day.',
    subtitle_line_2: 'There are several reasons your boss might not have responded, and only some are about you.',
  });
  assert.deepEqual(codes(qualityGate({ ...base, known_fact: 'Your boss ignored you in the meeting.' }, { text })), []);
  expectFail(qualityGate({ ...base, known_fact: "Your boss didn't ignore you in the meeting." }, { text }), 'claims_others_minds');
  expectFail(qualityGate({ ...base, known_fact: 'Your boss ignored you because he resents you.' }, { text }), 'claims_others_minds');
  expectFail(qualityGate({ ...base, subtitle_line_2: 'Your boss ignored you because he was busy.' }, { text }), 'claims_others_minds');
  // Attitudes the person reported are restated as theirs, never as fact.
  expectFail(qualityGate({ ...base, known_fact: 'Your boss hates you.' }, { text: 'My boss hates me.' }), 'claims_others_minds');
  assert.ok(!codes(qualityGate({ ...base, known_fact: 'You feel that your boss hates you.' }, { text: 'My boss hates me.' })).includes('claims_others_minds'));
});

test('fewer needless regenerations: "how much you matter to them", "simply note", "can mean", "some people", time boxes', () => {
  // "how much you matter" is not the affirmation "you matter".
  assert.ok(!codes(gate(1, { possible_assumption: 'You might be reading it as a sign of how much you matter to him.' })).includes('generic_affirmation'));
  expectFail(gate(1, { subtitle_line_2: 'Remember that you matter, whatever the message says.' }), 'generic_affirmation');
  // "simply"/"clearly" only when dismissive.
  assert.ok(!codes(gate(0, { practical_next_step: 'Simply note what was said and when, then decide.' })).includes('condescending'));
  expectFail(gate(0, { subtitle_line_2: 'You could simply move on from what your boss said in front of everyone.' }), 'condescending');
  expectFail(gate(1, { subtitle_line_2: "You're clearly overreacting to five hours without a reply." }), 'condescending');
  // "can" and "some people" hedge a general statement.
  const dinner = 'I said something stupid at dinner and everyone went quiet.';
  assert.ok(!codes(qualityGate(anchor(4, { alternative_angle: 'A pause at a dinner table can mean people are thinking, not judging.' }), { text: dinner })).includes('claims_others_minds'));
  expectFail(qualityGate(anchor(4, { alternative_angle: 'Everyone at that dinner was judging you.' }), { text: dinner }), 'claims_others_minds');
  // Time boxes in an action, and vague idioms, are not invented details; a new number in a fact still is.
  assert.ok(!codes(gate(2, { practical_next_step: 'Spend the next twenty minutes on the first question you lost marks on.' })).includes('invented_detail'));
  assert.ok(!codes(gate(1, { alternative_angle: 'Silence can come from a dead phone, a busy shift or a hundred ordinary things.' })).includes('invented_detail'));
  expectFail(gate(1, { subtitle_line_1: 'Six hours without a reply is a fact.' }), 'invented_detail');
  expectFail(gate(1, { known_fact: 'Your message has gone twenty minutes without a reply.' }), 'invented_detail');
});

test('another angle with the same pattern as the angle just shown is rejected, even when paraphrased', () => {
  const prev = [{ subtitle_line_1: ANCHORS[1].scene.subtitle_line_1, subtitle_line_2: ANCHORS[1].scene.subtitle_line_2, reasoning_pattern: 'fact_vs_assumption' }];
  for (const [l1, l2] of [
    ['Five hours of silence from him is real.', 'What that silence means has not been decided yet.'],
    ['The five hours are the only solid part of this.', 'Everything the silence seems to say is still a guess.'],
  ]) {
    const g = gate(1, { subtitle_line_1: l1, subtitle_line_2: l2 }, { previous: prev });
    expectFail(g, 'repeats_previous');
    assert.match(g.failures.find((f) => f.code === 'repeats_previous').message, /different reasoning_pattern/);
  }
  // An older angle with the same pattern only blocks a close repeat.
  const older = [prev[0], { subtitle_line_1: 'Checking again will not make the message arrive.', subtitle_line_2: 'What could the next hour hold that has nothing to do with him?', reasoning_pattern: 'rumination' }];
  const distinct = gate(1, { subtitle_line_1: 'Your message is sitting unanswered, and that part is real.', subtitle_line_2: 'Could you decide now when you will check again?' }, { previous: older });
  assert.ok(!codes(distinct).includes('repeats_previous'), JSON.stringify(codes(distinct)));
});

// --- Regressions from the W6 review, round 2 (12 Oct 2026) ------------------

/** A rule-following scene; `over` sets the fields under test. */
const r2Scene = (over) => ({
  emotion: 'loneliness', situation_type: 'social', reasoning_pattern: 'overgeneralisation', interaction_type: 'separate_one',
  mallow_character: 'zuzu', safety_status: 'ok', possible_assumption: '', alternative_angle: 'There could be more than one reason for this.',
  practical_next_step: 'Message one person you trust today.', known_fact: 'It feels like nobody likes you.',
  subtitle_line_1: 'It feels like nobody likes you right now, and that is a heavy feeling.', subtitle_line_2: 'Who did you actually hear from this week?', ...over,
});

test('review round 2: "Nobody likes me." — a quantity word is no hedge for what other people feel about you', () => {
  const text = 'Nobody likes me.';
  for (const l2 of [
    'Plenty of people like you, even if it is hard to see today.', 'Lots of people care about you more than you realise.',
    'Many people like you, even on days like this.', 'Some people like you more than you know.', 'Sometimes people like you more than they show.',
    'Your friends like you more than you think.', 'People like you more than you give them credit for.',
    'The people around you probably like you more than you think.', 'Think of all the people who care about you deeply.',
  ]) expectFail(qualityGate(r2Scene({ subtitle_line_2: l2 }), { text }), 'claims_others_minds');
  // A general statement about how people work still counts as a hedge.
  for (const ok of ['Some people find it hard to say what they feel out loud.', 'Many people feel this way after a quiet week, even when it is not the whole story.']) {
    assert.ok(!codes(qualityGate(r2Scene({ alternative_angle: ok }), { text })).includes('claims_others_minds'), ok);
  }
  // Contradicting the person's feeling is its own failure.
  expectFail(qualityGate(r2Scene({ subtitle_line_2: "That isn't true at all, and you know it deep down." }), { text }), 'contradicts_person');
});

test('review round 2: plural people and "the people around you" are third parties too', () => {
  const text = 'My teachers think I am lazy.';
  const base = { known_fact: 'You feel your teachers think you are lazy.', subtitle_line_1: 'Feeling judged as lazy by your teachers is heavy to carry into every lesson.' };
  expectFail(qualityGate(r2Scene({ ...base, subtitle_line_2: 'Your teachers think you are lazy, and that hurts to hear.' }), { text }), 'claims_others_minds');
  expectFail(qualityGate(r2Scene({ ...base, known_fact: 'Your teachers think you are lazy.' }), { text }), 'claims_others_minds');
  assert.ok(!codes(qualityGate(r2Scene({ ...base, subtitle_line_2: 'It feels like your teachers think you are lazy.' }), { text })).includes('claims_others_minds'));
  for (const noun of ['bosses', 'managers', 'tutors', 'neighbours', 'parents']) {
    expectFail(qualityGate(r2Scene({ subtitle_line_2: `Your ${noun} respect you more than you know.` }), { text: `My ${noun} ignore me.` }), 'claims_others_minds');
  }
});

test('review round 2: motives, certainties and predictions about other people are claims', () => {
  for (const [text, line] of [
    ['My colleague got promoted instead of me.', 'Your colleague got the promotion because your manager prefers them.'],
    ['My friend invited everyone except me.', 'Your friend left you out on purpose to send a message.'],
    ['My mum shouted at me.', 'She clearly has no respect for you and never has.'],
    ["My partner hasn't replied for hours.", 'He will reply soon once he has finished whatever he is doing.'],
    ["I failed my exam. I'm useless.", 'Your teachers know how capable you are.'],
    ['My friend invited everyone except me.', 'It was probably an oversight rather than anything personal.'],
    ['My friend invited everyone except me.', 'It was nothing personal, just a small party.'],
  ]) expectFail(qualityGate(r2Scene({ known_fact: text.replace(/^My /, 'Your ').replace(/\bme\b/, 'you'), subtitle_line_2: line }), { text }), 'claims_others_minds');
  // Offered as possibilities, the same ideas pass.
  for (const [text, line] of [
    ['My friend invited everyone except me.', 'It might have been an oversight rather than anything personal.'],
    ["My partner hasn't replied for hours.", 'He might reply soon, or the silence could be about something else entirely.'],
    ['My friend invited everyone except me.', 'It could feel deliberate, but you do not know yet why you were left out.'],
  ]) assert.ok(!codes(qualityGate(r2Scene({ subtitle_line_2: line, known_fact: 'Your friend invited everyone except you.' }), { text })).includes('claims_others_minds'), line);
});

test('review round 2: other weak answers from the probe set are caught', () => {
  expectFail(qualityGate(r2Scene({ subtitle_line_2: 'You are clever and capable and you will do brilliantly next time.' }), { text: "I failed my exam. I'm useless." }), 'generic_affirmation');
  expectFail(qualityGate(r2Scene({ subtitle_line_2: 'Maybe consider whether you contributed to it by being unprepared.' }), { text: 'My boss embarrassed me in front of everyone.' }), 'blame');
  const g = qualityGate(r2Scene({ subtitle_line_2: 'Just study harder next time and the result will definitely be better.' }), { text: "I failed my exam. I'm useless." });
  expectFail(g, 'false_reassurance');
  expectFail(g, 'condescending');
  // "capable of learning" is the brief's own example, not an affirmation.
  assert.ok(!codes(gate(2, {})).includes('generic_affirmation'));
});

test('review round 2: rumination may "keep going"; only the cheer is rejected', () => {
  const sister = r2Scene({ emotion: 'overthinking', reasoning_pattern: 'rumination', interaction_type: 'let_loop_drift', mallow_character: 'noomi', known_fact: 'You and your sister argued last night.' });
  for (const [text, l1, l2] of [
    ['I keep thinking about the argument with my sister last night.', 'The argument can keep going round in your head without you following it.', 'Is there one thing you would actually want to say to your sister?'],
    ['I keep replaying the meeting where I froze.', 'The loop can keep going without you having to ride it again.', 'Freezing in one meeting is a moment, not a verdict on your work.'],
    ['I keep replaying the argument I had with my dad last week.', 'Rewriting the argument in your head can keep going for ever without changing a word of it.', 'Is there one thing you would still want to say to your dad now?'],
  ]) assert.deepEqual(codes(qualityGate({ ...sister, known_fact: text.startsWith('I keep replaying the meeting') ? 'You froze in a meeting.' : sister.known_fact, subtitle_line_1: l1, subtitle_line_2: l2 }, { text })), [], l1);
  for (const cheer of ['Just keep going and the argument will fade.', 'Keep going, you have handled harder days with your sister.', 'Whatever your sister said, keep going!']) {
    expectFail(qualityGate({ ...sister, subtitle_line_1: cheer }, { text: 'I keep thinking about the argument with my sister last night.' }), 'generic_affirmation');
  }
});

test('review round 2: "liked a photo" is something he did (eval case jeal-ex)', () => {
  const jeal = r2Scene({ emotion: 'jealousy', situation_type: 'relationship', reasoning_pattern: 'mind_reading', interaction_type: 'open_interpretations', mallow_character: 'pipzi' });
  const a = qualityGate({ ...jeal, known_fact: 'Your boyfriend liked a photo of his ex.', subtitle_line_1: 'A like on a photo is a tap, and what it means is still a guess.', subtitle_line_2: 'If it keeps bothering you, could you ask him about it calmly?' }, { text: "My boyfriend liked his ex's photo." });
  assert.deepEqual(codes(a), []);
  const text = "My partner keeps liking his ex's photos on Instagram.";
  const b = qualityGate({ ...jeal, known_fact: "Your partner has liked his ex's photos on Instagram more than once.", subtitle_line_1: 'Each like is a tap on a screen, and what it means to him is still unknown.', subtitle_line_2: 'Could you tell him how it lands for you, without needing to prove anything?' }, { text });
  assert.deepEqual(codes(b), []);
  for (const l2 of ['He liked a photo, and that is all you actually know so far.', 'Your boyfriend liked a photo; what it means is still open.']) {
    assert.deepEqual(codes(qualityGate({ ...jeal, known_fact: 'Your boyfriend liked a photo of his ex.', subtitle_line_1: 'A like on a photo is a tap on a screen.', subtitle_line_2: l2 }, { text: "My boyfriend liked his ex's photo." })), [], l2);
  }
  // Liking a person is still a feeling.
  expectFail(qualityGate({ ...jeal, subtitle_line_2: 'He still likes his ex, and you can decide what to do with that.' }, { text }), 'claims_others_minds');
});

test('review round 2: engagement sees irregular verbs and stems ("rewrote" / "rewritten", "like" / "liking")', () => {
  const text = 'My manager rewrote my whole report without telling me.';
  const g = qualityGate(r2Scene({
    emotion: 'frustration', situation_type: 'work', reasoning_pattern: 'valid_anger', interaction_type: 'find_boundary', mallow_character: 'glitzi',
    known_fact: 'Your manager rewrote your report without telling you.',
    subtitle_line_1: 'Having your work rewritten without a word is frustrating.',
    subtitle_line_2: 'You could ask what needed changing, so next time the feedback comes before the rewrite.',
  }), { text });
  assert.deepEqual(codes(g), []);
});

test('review round 2: ordinals and "a dozen" are not invented numbers (eval case self-driving)', () => {
  const sc = r2Scene({ emotion: 'disappointment', reasoning_pattern: 'self_criticism', interaction_type: 'soften_harshness', mallow_character: 'boppo' });
  const drive = "I failed my driving test for the third time. I'm just stupid.";
  assert.deepEqual(codes(qualityGate({ ...sc, known_fact: 'You have failed your driving test three times.', subtitle_line_1: 'Three failed tests tell you the driving test is hard for you, not that you are stupid.', subtitle_line_2: 'Which part tripped you up each time?' }, { text: drive })), []);
  const cancel = 'My friend cancelled on me for the third time.';
  assert.deepEqual(codes(qualityGate({ ...sc, reasoning_pattern: 'valid_anger', interaction_type: 'find_boundary', mallow_character: 'glitzi', known_fact: 'Your friend has cancelled on you three times.', subtitle_line_1: 'Three cancellations is a pattern worth naming, not something to swallow.', subtitle_line_2: 'You could tell your friend plainly that it hurts and ask what is going on.' }, { text: cancel })), []);
  const date = "I said something stupid on a first date and now he won't text back.";
  assert.deepEqual(codes(qualityGate({ ...sc, reasoning_pattern: 'mind_reading', interaction_type: 'open_interpretations', mallow_character: 'pipzi', known_fact: 'He has not texted back since the date.', subtitle_line_1: 'One awkward comment and a quiet phone are two separate things.', subtitle_line_2: 'The silence could be about a dozen things, and only one of them is what you said.' }, { text: date })), []);
  // A new number is still an invented detail.
  expectFail(qualityGate({ ...sc, subtitle_line_1: 'Four failed tests tell you the driving test is hard for you.' }, { text: drive }), 'invented_detail');
  // A harsh label applied (not contrasted) is still rejected.
  expectFail(qualityGate({ ...sc, subtitle_line_1: 'Maybe you are stupid at driving, but you can still learn.' }, { text: drive }), 'label_echo');
});

test('review round 2: a person called Claude can be named; the gate still rejects talk of models', () => {
  const text = "Claude hasn't texted me since Friday.";
  const sc = r2Scene({ emotion: 'worry', situation_type: 'relationship', reasoning_pattern: 'mind_reading', interaction_type: 'open_interpretations', mallow_character: 'pipzi', known_fact: "Claude hasn't texted you since Friday." });
  assert.deepEqual(codes(qualityGate({ ...sc, subtitle_line_1: "Claude hasn't texted since Friday, and that gap is all you actually know.", subtitle_line_2: 'Could you send one easy message and see what comes back?' }, { text })), []);
  expectFail(qualityGate({ ...sc, subtitle_line_2: 'Claude, the model behind this, cannot know why your friend is quiet.' }, { text: 'My friend has gone quiet.' }), 'ai_mention');
});

test('review round 2: a short detail in known_fact counts ("You got a B.")', () => {
  const g = qualityGate(r2Scene({ emotion: 'worry', reasoning_pattern: 'catastrophising', interaction_type: 'shrink_projection', mallow_character: 'loomi', known_fact: 'You got a B.', subtitle_line_1: 'A B is the fact; their disappointment is still a prediction.', subtitle_line_2: 'What would you say to them if you walked in proud of it?' }), { text: 'I got a B and my parents will be so disappointed.' });
  assert.deepEqual(codes(g), []);
});

test('review round 2: the repeats_previous message asks for what the rule checks', () => {
  const prev = [{ subtitle_line_1: ANCHORS[1].scene.subtitle_line_1, subtitle_line_2: ANCHORS[1].scene.subtitle_line_2, reasoning_pattern: 'fact_vs_assumption' }];
  const f = gate(1, { subtitle_line_1: 'The five hours are the only solid part of this.', subtitle_line_2: 'Everything the silence seems to say is still a guess.' }, { previous: prev }).failures.find((x) => x.code === 'repeats_previous');
  assert.match(f.message, /Use a different reasoning_pattern/);
  assert.doesNotMatch(f.message, /only if none does/);
});
