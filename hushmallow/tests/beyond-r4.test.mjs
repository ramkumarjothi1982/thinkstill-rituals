// Another Angle (hushmallow Beyond), verification round 4 (13 Oct 2026): what the review of the final fix
// round found on the authored path (B2), the consent and notice text (B3) and the labels of two mechanics (B1).
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { authoredScene, sceneParts, candidatePatterns, bereavement, griefScene, wholeLabel, fairAnger } from '../src/beyond/authored.js';
import { AUTHORED_PAIRS, GRIEF } from '../src/beyond/lines.js';
import { checkText } from '../src/engine/safety.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

/** Every round of the authored path for `text`, until it says it has nothing more ("Show me another angle"). */
function rounds(text, { emotion = null } = {}) {
  const out = [], exclude = [], usedAngles = [];
  for (let i = 0; i < 11; i++) {
    const s = authoredScene(text, { emotion, exclude, usedAngles });
    out.push({ scene: s, parts: sceneParts(text, s) });
    if (s.exhausted || s.grief) break;
    exclude.push(s.reasoning_pattern);
    if (s.angle_id) usedAngles.push(s.angle_id);
    if (s.alt_id) usedAngles.push(s.alt_id);
  }
  return out;
}

const REVIEW_INPUTS = [
  'My sister ignored me at the party, she must hate me.', 'Everyone at work thinks I’m boring.', 'He must be annoyed with me.',
  'I failed my exam and I’ll never get into uni.', 'I had an argument with my mum and now the whole family is against me.',
  'My colleague took credit for my work in the meeting.', 'Nobody ever invites me anywhere.',
  'I forgot my friend’s birthday. I’m a terrible person.', 'I’m a useless boyfriend.',
  'My friend didn’t reply to my message and I think she’s angry with me.', 'I think my boss is angry at me for being late.',
  'My grandad died last month and I can’t stop crying.', 'I miss my dog so much since he died.', 'My mum passed away and I feel empty.',
  'My chest felt tight today and I’m sure something terrible is going to happen.', 'I have three essays due on Monday and I haven’t started.',
  'My manager moved our one-to-one again and didn’t say why, and now I keep thinking she is planning to let me go before the end of the quarter.',
  'I’m a horrible mother.', 'I’m such a bad friend.', 'I’m a terrible cook and everyone knows it.', 'I’m an awful sister.',
  'I am a useless, useless person.', 'I’m a stupid idiot.', 'I feel like a bad person for saying no.',
];
// a label quoted by its adjective alone after an article ("“I’m a terrible”"): the noun it describes is missing
const ADJ = '(?:stupid|useless|terrible|pathetic|worthless|hopeless|incompetent|awful|rubbish|dumb|thick|clueless|horrible|bad|selfish|lazy|ugly|weak|disgusting|crap|cruel|mean|boring|weird|lousy|dreadful)';
const CUT_LABEL_QUOTE = new RegExp(`\\b(?:a|an)\\s+(?:(?:so|such|really|total|complete|absolute|utter)\\s+)*${ADJ}[,.!?]?”`, 'iu');
const CUT_LABEL_END = new RegExp(`\\b(?:a|an)\\s+(?:(?:so|such|really|total|complete|absolute|utter)\\s+)*${ADJ}[,.!?]?$`, 'iu');

test('B2.1: a quoted label is the whole phrase, never cut after its adjective (“I’m a terrible person”, not “I’m a terrible”)', () => {
  assert.equal(wholeLabel('I forgot my friend’s birthday. I’m a terrible person.', 'I’m a terrible'), 'I’m a terrible person');
  assert.equal(wholeLabel('I’m a useless boyfriend.', "I'm a useless"), 'I’m a useless boyfriend');
  assert.equal(wholeLabel('I’m a terrible, terrible person', 'I’m a terrible'), '');
  assert.equal(wholeLabel('I’m a terrible at maths', 'I’m a terrible'), '');
  assert.equal(wholeLabel('I’m useless at this', 'I’m useless'), 'I’m useless');
  for (const text of REVIEW_INPUTS) {
    for (const { scene, parts } of rounds(text)) {
      for (const line of [scene.subtitle_line_1, scene.subtitle_line_2, scene.practical_next_step, scene.known_fact, scene.possible_assumption]) {
        assert.doesNotMatch(String(line || ''), CUT_LABEL_QUOTE, `${text} → ${line}`);
      }
      // the tags the mechanics draw: the verdict (soften), the weight (return), the fact and the guess (pull apart)
      for (const tag of [parts.harsh, parts.weight, parts.fact, parts.guess]) assert.doesNotMatch(String(tag || ''), CUT_LABEL_END, `${text} → tag ${tag}`);
    }
  }
  const [first] = rounds('I forgot my friend’s birthday. I’m a terrible person.');
  assert.equal(first.scene.subtitle_line_1, '“I’m a terrible person” squashes a whole person into one word.');
  assert.equal(first.parts.harsh, 'I’m a terrible person');
  assert.equal(rounds('I’m a useless boyfriend.')[0].parts.harsh, 'I’m a useless boyfriend');
});

test('B2.1: “horrible”, “awful” and “a bad friend” are harsh labels too, and their scene comes first', () => {
  for (const [text, label] of [['I’m a horrible mother.', 'I’m a horrible mother'], ['I’m such a bad friend.', 'I’m such a bad friend'], ['I’m an awful sister.', 'I’m an awful sister']]) {
    const [first] = rounds(text);
    assert.equal(first.scene.reasoning_pattern, 'self_criticism', text);
    assert.equal(first.parts.harsh, label, text);
    assert.equal(first.scene.subtitle_line_1, `“${label}” squashes a whole person into one word.`, text);
  }
});

test('B2.2: someone else’s anger at them is mind reading, never their own fair anger', () => {
  for (const text of ['My friend didn’t reply to my message and I think she’s angry with me.', 'I think my boss is angry at me for being late.',
    'My mum is furious with me.', 'I’m sure he’s annoyed with me.', 'She’s been really upset with me all week.']) {
    assert.equal(fairAnger(text), false, text);
    assert.ok(!candidatePatterns(text).includes('valid_anger'), text);
    const all = rounds(text);
    assert.equal(all[0].scene.reasoning_pattern, 'mind_reading', `${text} → ${all.map((r) => r.scene.reasoning_pattern).join(', ')}`);
    for (const { scene } of all) assert.notEqual(scene.mechanic, 'find_boundary', text);
  }
  // their own anger still reads as fair anger
  for (const text of ['I’m so angry with my boss.', 'I’m angry at him for lying.', 'My colleague took credit for my work in the meeting.', 'She’s angry with me and I’m furious about it.']) {
    assert.equal(fairAnger(text), true, text);
    assert.equal(rounds(text)[0].scene.reasoning_pattern, 'valid_anger', text);
  }
});

test('B2.3: a loss is never a thinking error: no mechanic, no fact/assumption split, an authored validating pair', () => {
  for (const text of ['My grandad died last month and I can’t stop crying.', 'I miss my dog so much since he died.', 'My mum passed away and I feel empty.',
    'My dad passed last year and Christmas is hard.', 'Since my nan died I can’t concentrate.', 'We had to have our cat put down yesterday.',
    'I lost my best friend to cancer in the spring.', 'It was my granddad’s funeral today.', 'I’ve been grieving for months.', 'My friend’s mum died and I don’t know what to say.']) {
    assert.ok(bereavement(text), text);
    const s = authoredScene(text);
    assert.equal(s.grief, true, text);
    assert.equal(s.mechanic, null, text);
    assert.notEqual(s.interaction_type, 'pull_apart', text);
    assert.equal(s.known_fact, '', text);
    assert.equal(s.possible_assumption, '', text);
    assert.equal(s.subtitle_line_2, 'Grief isn’t a thought to fix.', text);
    assert.ok([GRIEF.loss[0], GRIEF.grief[0]].includes(s.subtitle_line_1), text);
    // whatever the round, never a game
    for (const { scene } of rounds(text)) assert.equal(scene.mechanic, null, text);
  }
  assert.equal(authoredScene('My grandad died last month and I can’t stop crying.').subtitle_line_1, 'Missing them this much makes sense.');
  assert.deepEqual(griefScene('It was the funeral today.').subtitle_line_1, GRIEF.grief[0]);
  // not a loss
  for (const text of ['My phone died in the middle of the call.', 'My boss gives me grief about everything.', 'Good grief, what a week.', 'My dad nearly died in a car crash.',
    'My son passed his driving test and I didn’t.', 'My plants died while I was away.', 'I lost my keys again.', 'The battery died on the way home.']) {
    assert.equal(bereavement(text), null, text);
    assert.notEqual(authoredScene(text).grief, true, text);
  }
});

test('B2.3: grief in the orchestrator: no request, no Thought Mallow, nothing playful, support close', () => {
  const src = read('src/beyond/another-angle.js');
  const start = src.slice(src.indexOf('async function startAngle('), src.indexOf('async function waitingLines('));
  assert.ok(start.indexOf('bereavement(S.text)') > 0 && start.indexOf('bereavement(S.text)') < start.indexOf('client.angle('), 'a loss is caught before any request');
  assert.ok(start.indexOf('bereavement(S.text)') < start.indexOf('spawnThought()'), 'and before the Thought Mallow');
  const grief = src.slice(src.indexOf('async function griefMode('), src.indexOf('async function unclear('));
  assert.match(grief, /S\.grief = true; S\.keepSupport = true/);
  assert.match(grief, /supportPill\.hidden = false/);
  assert.doesNotMatch(grief, /client\.|startAngle|playScene|setStage\('playful'\)/);
  assert.match(src, /if \(S\.grief\) return;/, 'no playful squeeze lines after a loss');
  assert.match(src, /const heavy = S\.crisis \|\| S\.care \|\| S\.grief;/, 'Finish says the calm lines');
  // its lines hold the brand rule and the one-short-sentence rule
  for (const l of [...GRIEF.loss, ...GRIEF.grief, GRIEF.ask, GRIEF.squeeze]) { assert.ok(l.length <= 60, l); assert.doesNotMatch(l, /\bAI\b|angle|reframe/i, l); }
});

test('B2.4: the first angle is never the bare fact/assumption pair; it uses their own fact and guess', () => {
  const BARE = AUTHORED_PAIRS.fact_vs_assumption;
  for (const text of REVIEW_INPUTS) {
    const [first] = rounds(text);
    if (first.scene.grief) continue;
    assert.ok(!(first.scene.subtitle_line_1 === BARE[0] && first.scene.subtitle_line_2 === BARE[1]), `${text} → the bare pair first`);
  }
  const chest = rounds('My chest felt tight today and I’m sure something terrible is going to happen.')[0].scene;
  assert.equal(chest.subtitle_line_1, '“My chest felt tight today” is what happened.');
  assert.equal(chest.subtitle_line_2, '“something terrible is going to happen” is one way to read it.');
});

test('B2.4: a first-person fact (“I haven’t started”) is never “what your mind added”; the essays are a practical problem', () => {
  const text = 'I have three essays due on Monday and I haven’t started.';
  const all = rounds(text);
  assert.equal(all[0].scene.reasoning_pattern, 'practical_problem');
  assert.equal(all[0].scene.practical_next_step, 'Pick one piece of work and write just its first few lines today.');
  for (const { scene, parts } of all) {
    assert.doesNotMatch(scene.possible_assumption, /haven’t started/, scene.possible_assumption);
    assert.doesNotMatch(parts.guess, /haven’t started/);
  }
  for (const t of ['My grandad died last month and I can’t stop crying.', 'I failed the test and I feel awful.', 'I sent the email and I haven’t heard back.']) {
    const p = sceneParts(t, { source: 'authored' });
    assert.doesNotMatch(p.guess, /^I (?:can’t stop|feel|haven’t)/, `${t} → ${p.guess}`);
  }
  // what is a guess stays one
  assert.equal(sceneParts('My sister ignored me at the party, she must hate me.', {}).guess, 'she must hate me');
  assert.equal(sceneParts('I failed my exam and I’ll never get into uni.', {}).guess, 'I’ll never get into uni');
});

test('B2.4: with no situation matched, a step quotes their own words instead of a general one', () => {
  const s = rounds('My sister ignored me at the party, she must hate me.')[0].scene;
  assert.equal(s.practical_next_step, 'Check one fact about “she must hate me”, instead of guessing.');
  const u = rounds('I’m a useless boyfriend.')[0].scene;
  assert.equal(u.practical_next_step, 'Try saying what happened, instead of “I’m a useless boyfriend”.');
});

test('B2: the safety check still comes first (a loss with a crisis in it is crisis, never grief)', () => {
  assert.equal(checkText('My mum died and I want to die too.').level, 'crisis');
  const src = read('src/beyond/another-angle.js');
  const after = src.slice(src.indexOf('async function afterTell('), src.indexOf('function firstLook('));
  assert.ok(after.indexOf("if (S.level === 'crisis')") < after.indexOf('startAngle('), 'crisis before any angle (and before grief)');
});
