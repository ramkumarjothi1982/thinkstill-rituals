// Another Angle (hushmallow Beyond), review round 6 (13 Oct 2026): the grief gate both ways, and feelings with a
// contraction after "I". (Round 7 replaced the precise gate with deathTalk, recall first: every loss below still
// fires; of the "not a loss" probes the idioms stay ordinary and the rest take the gentle path, which never assumes
// anyone died. beyond-r7.test.mjs and tests/probes/death-talk.mjs hold the new tables.)
//   1. A death said with the contraction stuck to the person ("my dad's dead", "Mum's died", "our cat's been put
//      down", "my husband's passed"), about a boy, a girl or an ex, as "the death of my father", "losing my dad
//      was…", "watching my grandma die" or "since my dad dying" is a loss: never a game. Someone dying now ("my dad
//      is dying", "I'm watching my mum die") or a death feared ("losing my mum would break me") is not.
//   2. "Lost my sister when she moved to Spain", "lost my dad when he remarried", a cat that's missing (posters),
//      a dog that slipped its lead, "lost my mum to dementia, she doesn't know who I am": never grief. A person
//      still alive but going is answered gently ('heavy'), never as a game either.
//   3. "I'm feeling low", "I've been feeling empty", "I've felt numb", "im feeling sad", and jealous, insecure,
//      helpless, stuck, trapped, disappointed, sick with nerves: a feeling, the fact, never the guess.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { authoredScene, sceneParts, deathTalk, feelingOf, feelingGuard, fairAnger, FEELING_ORDER } from '../src/beyond/authored.js';
import { serverGrief, livingLoss, serverLoss } from '../src/beyond/grief.js';
import { GRIEF } from '../src/beyond/lines.js';
import { feelingClause, feelingOpens, feelingStatement } from '../src/beyond/feelings.js';
import { FEELING } from '../src/beyond/lines.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

/** Every round of the authored path for `text`, until it says it has nothing more ("Show me another angle"). */
function rounds(text) {
  const out = [], exclude = [], usedAngles = [];
  for (let i = 0; i < 11; i++) {
    const s = authoredScene(text, { exclude, usedAngles });
    out.push({ scene: s, parts: sceneParts(text, s) });
    if (s.exhausted || s.grief) break;
    exclude.push(s.reasoning_pattern);
    if (s.angle_id) usedAngles.push(s.angle_id);
    if (s.alt_id) usedAngles.push(s.alt_id);
  }
  return out;
}
const said = (s) => [s.subtitle_line_1, s.subtitle_line_2, s.known_fact, s.possible_assumption, s.practical_next_step, s.alternative_angle].filter(Boolean);
/** The framing a feeling (or a loss) must never get. */
const FACT_CHECK = /what your mind|mind might be adding|one way to read|is what happened|check one fact|instead of guessing|what did you actually|what might it mean|another explanation|facts are still unclear/i;

// ------------------------------------------------------------- 1. the losses --
const LOSSES = [
  // the review's own probes (straight and typographic apostrophes)
  'My dad\'s dead.', 'My dad’s dead.', 'My mum\'s dead and I miss her.', 'Mum\'s died.', 'My dog\'s died.', 'My dog’s died.', 'My grandad\'s just died.', 'My nan\'s dead.',
  'Dad\'s been dead a year now.', 'Our cat\'s been put down.', 'Our cat’s been put down.', 'My little boy died in hospital.', 'My little girl died.', 'My baby boy died.',
  'My boy died last year.', 'My ex died…', 'After the death of my father…', 'Losing my dad was the hardest thing.', 'My best friend\'s dead.', 'My husband\'s passed.',
  'Watching my grandma die was the worst thing.', 'My mum\'s passed.', 'My mum’s died.',
  // more of the same shapes
  'My grandma\'s died and I can\'t stop crying.', 'Our dog\'s died.', 'My brother\'s been killed in a crash.', 'My uncle\'s passed away.', 'My nan\'s passed on.',
  'Since Grandad\'s passed I can\'t sleep.', 'She\'s died.', 'He\'s passed away.', 'My best mate\'s dead.', 'My girlfriend\'s died.', 'My little one died.',
  'The death of our cat hit me hard.', 'Since the death of Mum I\'ve been lost.', 'I saw my dad die.', 'Since my dad dying, nothing\'s the same.', 'My dad dying was the worst thing.',
  'I\'m not over my mum dying.', 'My nan dying of cancer was the hardest year of my life.', 'I had to watch my dog die.', 'Watched my grandad die in hospital.',
  'The pain of losing my dad never goes away.', 'Losing our dog last year broke me.', 'My twin\'s dead.', 'Mum\'s been dead two years.', 'My husband has passed.', 'My dog has passed.',
  'Dad\'s passed.', 'My ex-husband died last week.', 'My baby girl died.', 'My hamster\'s died and I\'m gutted.', 'My son\'s been dead five years today.', 'My boy\'s died.',
  'My stepdad\'s died.', 'My father-in-law\'s died.', 'My dad\'s been killed.', 'Our kitten\'s been put to sleep.', 'My grandad\'s dead, and nobody visits.', 'My dad\'s dead now.',
  'My mum’s tragically passed.',
  // "lost my…" that is still a death
  'I lost my dad when he was 52.', 'I lost my mum when I was 12.', 'I lost my cat yesterday and I miss her so much.', 'I lost my dog when he ran into the road.', 'I lost my nan in 2019.',
  'I lost my mum to dementia last year and the funeral was in May.', 'I lost my dad when he had a heart attack.',
];
/** Not a death (each its own ordinary scene, or answered gently). */
const NOT_LOSSES = [
  // the review's five
  'I lost my sister when she moved to Spain.', 'I lost my dad when he remarried and stopped calling.', 'I lost my cat last night and I’ve put posters up everywhere.',
  'I lost my dog yesterday, he slipped his lead in the woods.', 'I lost my mum to dementia, she doesn’t know who I am.',
  // the contraction is "is" or "has", and the rest is an idiom, a gadget, a test, an exam
  'My dad\'s dead keen on golf.', 'My mum\'s dead against it.', 'My brother\'s dead clever.', 'My dog\'s dead cute.', 'My sister\'s dead good at maths.', 'My dad\'s died his hair blue.',
  'My phone\'s died.', 'My boy\'s killed it at football.', 'My mum\'s passed her driving test!', 'My son\'s passed his exams.', 'My son\'s passed!', 'My girl\'s passed out on the sofa.',
  'My dad\'s dead tired.', 'My cat\'s been put on a diet.', 'Our dog\'s been put in kennels.', 'My boyfriend\'s dead to me.', 'My ex is dead to me.', 'My friend\'s dad\'s car died.',
  'My dad\'s been dead set on it.', 'My sister\'s been dead busy.', 'My boy died laughing.', 'My girl\'s gone to her mum\'s.', 'My husband\'s passed the bar exam.',
  'My little boy\'s passed his swimming test.', 'My girl passed her exam!', 'My dad has passed his test.', 'My mum has passed out.', 'My grandad\'s been put in a home.', 'My grandad\'s gone to bed.',
  // someone dying now, or a death feared or in a story
  'My mum\'s dying to meet you.', 'My dad\'s dying.', 'My grandma is dying.', 'My nan is dying to meet you.', 'I\'m dying to see my mum.', 'My brother\'s dying to go.',
  'I\'m scared of my dad dying.', 'My dad dying is my biggest fear.', 'Watching my mum die would kill me.', 'I\'m watching my nan die slowly.', 'Watching my dad die in the film made me cry.',
  'I watched him die in the game.', 'Losing my mum would break me.', 'I\'m scared of losing my dad.', 'I\'m losing my mum to dementia.', 'The death of my phone.', 'My mum will be the death of me.',
  // losing something, someone somewhere, a friendship
  'I\'m losing my mind.', 'Losing my temper with my kids.', 'I keep losing my dog in the park.', 'I feel like I\'m losing my best friend.', 'Losing my sister to her new boyfriend sucks.',
  'Losing my dad\'s watch was awful.', 'I lost my dad\'s ring.', 'My dog\'s gone missing.', 'I lost my mum in the crowd.', 'I lost my girl to another guy.', 'My son\'s been killed off in the play.',
  // lost, but alive: moved, left, married, came back, escaped, lives elsewhere, dementia or drink
  'I lost my sister when she married him.', 'I lost my dad when he went to prison.', 'I lost my mum when she chose her new husband over me.', 'I lost my cat and she came back two days later.',
  'I lost my dog, he escaped through the fence.', 'I lost my brother, he lives in Australia now.', 'I lost my dad to drink.', 'I lost my mum to dementia.', 'I lost my dad when he left.',
  'I lost my best friend when she moved away.', 'I lost my sister, she stopped speaking to me.', 'I lost my dad last year and he’s still alive, he just won’t see me.',
];

test('r6.1: a death with the contraction stuck to the person, a boy / girl / ex, "the death of", "losing", "watching … die", "since … dying" is a loss', () => {
  assert.ok(LOSSES.length >= 60);
  for (const text of LOSSES) assert.equal(deathTalk(text), 'loss', text);
});

test('r6.1: every round of a loss is grief: never a mechanic, a fact/assumption split, or a line that frames it as a guess', () => {
  for (const text of LOSSES) {
    const all = rounds(text);
    assert.equal(all.length, 1, text);
    const s = all[0].scene;
    assert.equal(s.grief, true, text);
    assert.equal(s.mechanic, null, text);
    assert.equal(s.interaction_type, null, text);
    assert.equal(s.known_fact, '', text);
    assert.equal(s.possible_assumption, '', text);
    for (const line of said(s)) assert.doesNotMatch(line, FACT_CHECK, `${text} → ${line}`);
  }
});

/** Of the "not a loss" probes, the unambiguous idioms (death-words.js): never death talk. */
const IDIOMS = [
  'My dad\'s dead keen on golf.', 'My mum\'s dead against it.', 'My brother\'s dead clever.', 'My dog\'s dead cute.', 'My sister\'s dead good at maths.', 'My dad\'s died his hair blue.',
  // (r8: "My girl's passed out on the sofa." and "My mum has passed out." are death talk now: "passed out" is never blanked)
  'My phone\'s died.', 'My boy\'s killed it at football.', 'My mum\'s passed her driving test!', 'My son\'s passed his exams.', 'My son\'s passed!',
  'My dad\'s dead tired.', 'My boyfriend\'s dead to me.', 'My ex is dead to me.', 'My friend\'s dad\'s car died.', 'My dad\'s been dead set on it.', 'My boy died laughing.',
  'My husband\'s passed the bar exam.', 'My little boy\'s passed his swimming test.', 'My girl passed her exam!', 'My dad has passed his test.', 'My grandad\'s gone to bed.',
  'My mum\'s dying to meet you.', 'My nan is dying to meet you.', 'I\'m dying to see my mum.', 'My mum will be the death of me.', 'I\'m losing my mind.', 'Losing my temper with my kids.', 'I lost my dad\'s ring.',
];
test('r6.2 (r7): the idioms are never death talk; every other probe is, and its lines never say anyone died or that this is grief', () => {
  assert.ok(NOT_LOSSES.length >= 60);
  for (const text of IDIOMS) { assert.ok(NOT_LOSSES.includes(text), text); assert.equal(deathTalk(text), null, text); }
  for (const text of NOT_LOSSES) {
    if (deathTalk(text)) {
      const s = authoredScene(text);
      assert.equal(s.grief, true, text);
      assert.equal(s.mechanic, null, text);
    }
    for (const { scene } of rounds(text)) {
      for (const line of said(scene)) assert.doesNotMatch(line.replace(/“[^”]*”/gu, '“…”'), /Missing them|Grief isn|Loss is heavy|died|passed away|death|funeral|grief|missing/i, `${text} → ${line}`);
    }
  }
});

test('r6.2 (r7): "lost my <someone>" is death talk whatever follows (the gentle lines are true when they moved away too)', () => {
  for (const text of ['I lost my dad when he was 52.', 'I lost my mum when I was 12.', 'I lost my nan when she had a stroke.', 'I lost my brother while I was at uni.', 'I lost my dog when he ran into the road.', 'I lost my mum when she got sick.',
    'I lost my sister when she moved to Spain.', 'I lost my dad when he remarried.', 'I lost my dad when he went to prison.', 'I lost my mum when she got remarried.', 'I lost my brother when he left.', 'I lost my sister when she started seeing him.']) {
    assert.equal(deathTalk(text), 'loss', text);
    const s = authoredScene(text);
    assert.equal(s.mechanic, null, text);
    assert.deepEqual([s.subtitle_line_1, s.subtitle_line_2], GRIEF.loss, text);
  }
});

test('r6.2 (r7): someone still alive but going (dementia, drink) is answered gently, never a game', () => {
  for (const text of ['I lost my mum to dementia, she doesn’t know who I am.', 'I lost my mum to dementia.', 'I’m losing my dad to drink.', 'My nan has Alzheimer’s and doesn’t recognise me.', 'My grandad doesn’t know who I am any more.']) {
    assert.ok(deathTalk(text) || livingLoss(text), text);
    const all = rounds(text);
    assert.equal(all.length, 1, text);
    assert.equal(all[0].scene.grief, true, text);
    assert.equal(all[0].scene.mechanic, null, text);
    for (const line of said(all[0].scene)) assert.doesNotMatch(line, FACT_CHECK, `${text} → ${line}`);
  }
  assert.equal(livingLoss('My boyfriend doesn’t know me at all.'), false);
  assert.equal(livingLoss('I lost my keys to the house.'), false);
});

test('r6.2 (r7): "\'s passed" (has passed) is death talk; passing an exam or "passed!" is not (r8: "passed out" is, it can hide a death)', () => {
  for (const text of ['My husband\'s passed.', 'My mum\'s passed.', 'Dad\'s passed.', 'My dog has passed.', 'My dad passed last year.', 'Since Mum’s passed I can’t sleep.', 'My girl\'s passed out on the sofa.']) assert.equal(deathTalk(text), 'loss', text);
  for (const text of ['My son\'s passed!', 'My son\'s passed his exams.', 'My husband\'s passed the bar exam.']) assert.equal(deathTalk(text), null, text);
});

test('r6.2 (r7): a server loss scene plays gently for death talk (it sees the whole context), never for a lost job or a phone', () => {
  // (r8: serverLoss reads the scene; serverGrief also needs both lines to acknowledge, below)
  const sc = (o) => ({ source: 'server', situation_type: 'loss', emotion: 'sadness', ...o });
  assert.equal(serverLoss(sc(), 'My nan passed in May and the house is so quiet.'), true);
  assert.equal(serverLoss(sc(), 'Since Grandad passed I can’t sleep.'), true);
  assert.equal(serverLoss(sc({ emotion: 'grief' }), ''), true, 'grief itself, whatever the words');
  assert.equal(serverLoss(sc(), 'I lost my job today.'), false);
  assert.equal(serverLoss(sc(), 'My phone died and I lost my job.'), false);
  assert.equal(serverLoss(sc(), 'My son passed his test and I feel left behind.'), false);
  // (death talk now: the server's own loss answer is its reading of the whole context)
  assert.equal(serverLoss(sc(), 'I’m scared my dad will die.'), true);
  assert.equal(serverLoss(sc(), 'He died in the game and I lost the match.'), true);
  assert.equal(serverLoss(sc({ situation_type: 'other' }), 'My nan passed in May.'), false);
  assert.equal(serverLoss(sc({ source: 'authored' }), 'My nan passed in May.'), false);
  assert.equal(serverLoss(sc()), false);
  assert.equal(serverGrief(sc({ subtitle_line_1: 'The house is so quiet without her.', subtitle_line_2: 'You can miss her as much as you need to.' }), 'My nan passed in May.'), true);
  assert.equal(serverGrief(sc({ subtitle_line_1: 'That’s a guess about what’s going on inside someone else.', subtitle_line_2: 'Guesses can be right, and they can be wrong.' }), 'My nan passed in May.'), false);
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /serverLoss\(res\.scene, S\.text, \{ heavy: heavyWords \}\)/);
});

// ------------------------------------------------------------- 3. feelings --
const FEELINGS = [
  ['I\'m feeling really low.', 'low'], ['I’m feeling really low.', 'low'], ['I\'m feeling lonely.', 'lonely'], ['I\'m feeling so anxious.', 'anxious'], ['im feeling sad', 'low'],
  ['I’ve been feeling so lonely.', 'lonely'], ['I\'ve been feeling empty.', 'low'], ['I\'ve felt numb for weeks.', 'low'], ['Ive been feeling down', 'low'], ['i\'m feeling lonely', 'lonely'],
  ['I\'m just feeling so tired.', 'tired'], ['I’m feeling a bit lost.', 'low'], ['I’m really feeling it today, so low.', null],
  ['I feel jealous', 'low'], ['I feel jealous of my sister', 'low'], ['I feel envious of my friends', 'low'], ['I feel insecure', 'low'], ['I feel helpless', 'low'], ['I feel stuck', 'low'],
  ['I feel trapped', 'low'], ['I feel disappointed in myself', 'low'], ['I feel humiliated.', 'low'], ['I feel so humiliated.', 'low'], ['I feel rejected.', 'lonely'], ['I feel abandoned.', 'lonely'],
  ['I feel sick with nerves', 'anxious'], ['I\'m jealous.', 'low'], ['I\'m stuck.', 'low'], ['I feel let down.', 'low'],
  // a hard feeling in a word the lists don't name, and nothing more
  ['I feel unworthy.', 'low'], ['I\'m feeling unsafe.', 'low'],
].filter(([, k]) => k);
const NOT_FEELINGS = [
  'I feel like everyone hates me.', 'I feel sure she hates me.', 'I feel that nobody cares.', 'I\'m feeling like a failure.', 'I feel my boss doesn\'t like me.', 'I feel great today!',
  'I\'m stuck in traffic.', 'I feel like I\'m annoying everyone.', 'I feel as if they\'re laughing at me.', 'He humiliated me in front of everyone.',
];

test('r6.3: "I\'m feeling", "I\'ve been feeling", "I\'ve felt", "im feeling" and the missing feeling words are feelings (and nothing that guesses is)', () => {
  for (const [text, kind] of FEELINGS) assert.equal(feelingOf(text)?.kind, kind, text);
  for (const text of NOT_FEELINGS) assert.equal(feelingOf(text), null, text);
  // the clause reader: the same feeling with or without the contraction
  assert.equal(feelingClause('I\'m feeling low'), feelingClause('I am feeling low'));
  assert.equal(feelingClause('I’ve been feeling empty'), feelingClause('I have been feeling empty'));
  assert.equal(feelingClause('I’ve felt numb'), feelingClause('I have felt numb'));
  assert.equal(feelingStatement('I\'m feeling really low.')?.kind, 'low');
  // "humiliated" of their own is a feeling; done to them by someone it is still fair anger
  assert.equal(fairAnger('I feel humiliated.'), false);
  assert.equal(fairAnger('He humiliated me in front of everyone.'), true);
  assert.equal(fairAnger('I feel humiliated, he shouted at me in front of the team.'), true);
});

test('r6.3: every round for these feelings acknowledges them: never pull_apart, never "what happened", never "check one fact"', () => {
  for (const [text, kind] of FEELINGS) {
    const all = rounds(text);
    assert.equal(all.length, FEELING_ORDER[kind].length + 1, text);
    assert.equal(all[0].scene.practical_next_step, FEELING.steps[kind], text);
    for (const { scene } of all) {
      assert.ok(scene.feeling, text);
      assert.notEqual(scene.mechanic, 'pull_apart', text);
      for (const line of said(scene)) assert.doesNotMatch(line, FACT_CHECK, `${text} → ${line}`);
    }
  }
});

test('r6.3: the backstop: a clause that opens "I feel / I\'m feeling / I\'ve been feeling / I felt" + a describing word is never the guess', () => {
  for (const p of ['I feel unworthy', 'I’m feeling unsafe', 'I’ve been feeling off', 'I felt invisible', 'im feeling weird', 'I feel jealous of my sister', 'I feel happy'])
    assert.equal(feelingOpens(p), true, p);
  for (const p of ['I feel like everyone hates me', 'I feel that nobody cares', 'I feel as if they hate me', 'I feel sure she hates me', 'I feel my boss doesn’t like me', 'I feel the need to leave', 'she must hate me'])
    assert.equal(feelingOpens(p), false, p);
  // inside a longer message the feeling is the fact side, and its lines never read it one way or another
  const mixed = ['I\'m feeling really low and everyone must hate me.', 'I feel unworthy because she ignored me.', 'I’ve been feeling so lonely and nobody texts me back.',
    'I feel jealous of my sister because she always gets everything.', 'My boyfriend didn\'t reply and I\'m feeling sick with nerves.', 'I feel insecure, I think he\'s going to leave me.',
    'I failed my exam and I\'ve felt numb since.', 'I feel trapped in my job and my boss hates me.'];
  for (const text of mixed) {
    for (const { scene, parts } of rounds(text)) {
      assert.ok(!feelingOpens(parts.guess) || parts.guessAsk, `${text} → guess tag ${parts.guess}`);
      for (const line of said(scene)) {
        for (const q of line.match(/“[^”]+”/g) || []) {
          if (feelingOpens(q.slice(1, -1))) assert.doesNotMatch(line, /one way to read|mind might be adding|check one fact|instead of guessing|is what happened/i, `${text} → ${line}`);
        }
      }
    }
  }
  const pair = rounds('I\'m feeling really low and everyone must hate me.').map((r) => r.scene).find((s) => s.mechanic === 'pull_apart');
  assert.equal(pair.subtitle_line_1, '“I\'m feeling really low” is real.');
  assert.equal(pair.subtitle_line_2, '“everyone must hate me” is one way to read it.');
});

test('r6.3: with the mock server, "I\'m feeling really low." gives way to the feeling scene (feelingGuard now finds the feeling)', () => {
  // the mock provider's fact_vs_assumption scene, as it answers these words
  const mock = { source: 'server', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', mechanic: 'pull_apart', mallow_character: 'zuzu', emotion: 'worry', situation_type: 'other',
    known_fact: 'What you wrote: "I\'m feeling really low".', possible_assumption: 'You might be filling in the gaps with the worst version.', alternative_angle: 'There may be more than one way to read this, including yours.',
    practical_next_step: 'Write down what you know for sure, and leave the rest as a question.', subtitle_line_1: 'I\'m feeling really low is the part that actually happened.',
    subtitle_line_2: 'What it means is still a question, not an answer.', safety_status: 'ok' };
  for (const text of ['I\'m feeling really low.', 'I’ve been feeling empty.', 'im feeling sad', 'I feel trapped']) {
    const g = feelingGuard(mock, text);
    assert.equal(g.source, 'authored', text);
    assert.ok(g.feeling, text);
    assert.notEqual(g.mechanic, 'pull_apart', text);
    for (const line of said(g)) assert.doesNotMatch(line, FACT_CHECK, `${text} → ${line}`);
  }
});

// --------------------------------------------------------------- 4. notice --
test('r6.4: the notice says the language and request code ride on an angle request only, and feedback names the Mallow and the version', () => {
  const src = read('src/beyond/consent.js');
  assert.match(src, /Each angle request also carries the app’s language and a one-off random code, and every angle and feedback request carries this phone’s session code\./);
  assert.match(src, /A feedback tap sends which button, which Mallow and what kind of angle it was \(and its version\), never your words\./);
  const client = read('src/beyond/angle-client.js');
  // (what the notice says is what the client sends)
  assert.match(client, /const body = \{ consent: true, text: words, locale: 'en-GB', request_id:/);
  assert.match(client, /const body = \{ rating, reasoning_pattern: scene\.reasoning_pattern, interaction_type: scene\.interaction_type, mallow_character: scene\.mallow_character \};/);
  assert.match(client, /if \(scene\.prompt_version\) body\.prompt_version = scene\.prompt_version;/);
});
