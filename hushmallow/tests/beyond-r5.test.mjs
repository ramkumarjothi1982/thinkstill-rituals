// Another Angle (hushmallow Beyond), review round 5 (13 Oct 2026): the grief gate and feelings said plainly.
//   1. bereavement() reads only a death the person names (a person or a pet): never "lost my mum's ring",
//      "lost my dad's car keys", "my son passed and I'm so proud" or "my daughter passed! she got into uni".
//      When it fires, Zuzu answers gently and, with sharing on, the server answers it (no task, no mechanic).
//   2. A feeling said plainly ("I feel empty", "I can't stop crying") is real, and it is the fact: never
//      "what your mind added", never "one way to read what happened", never told to check a fact.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { authoredScene, sceneParts, candidatePatterns, bereavement, griefScene, feelingOf, feelingScene, feelingGuard, framesAsGuess, FEELING_ORDER } from '../src/beyond/authored.js';
import { serverGrief, passedAlone } from '../src/beyond/grief.js';
import { feelingStatement, feelingClause, FEELING_LOOK } from '../src/beyond/feelings.js';
import { GRIEF, FEELING, MECHANIC_LINES, mechanicLines, EXPLORE } from '../src/beyond/lines.js';
import { checkText } from '../src/engine/safety.js';
import { MECHANIC_MODULES } from '../src/beyond/mechanics/index.js';

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
/** What a scene says aloud or shows as a line. */
const said = (s) => [s.subtitle_line_1, s.subtitle_line_2, s.known_fact, s.possible_assumption, s.practical_next_step, s.alternative_angle].filter(Boolean);

// ------------------------------------------------------------------ 1. grief --
/** A death named (a person or a pet): 'loss'; grieving without a death named: 'grief'. */
const LOSSES = [
  ['My grandad died last month and I can’t stop crying.', 'loss'], ['I miss my dog so much since he died.', 'loss'], ['My mum passed away and I feel empty.', 'loss'],
  ['Since my nan died I can’t concentrate.', 'loss'], ['We had to have our cat put down yesterday.', 'loss'], ['I lost my best friend to cancer in the spring.', 'loss'],
  ['It was my granddad’s funeral today.', 'grief'], ['I’ve been grieving for months.', 'grief'], ['My friend’s mum died and I don’t know what to say.', 'loss'],
  ['My dad passed away last year and Christmas is hard.', 'loss'], ['My grandma passed on last week.', 'loss'], ['I lost my mum last year.', 'loss'],
  ['I lost my dad in March and I still can’t believe it.', 'loss'], ['I lost my baby at 20 weeks.', 'loss'], ['It’s the anniversary of my dad’s death tomorrow.', 'loss'],
  ['It’s a year since my brother died.', 'loss'], ['RIP Grandad, I miss you.', 'loss'], ['My nan is gone now and the house feels empty.', 'loss'],
  ['I visited my mum’s grave today.', 'grief'], ['The vet put our dog down this morning.', 'loss'], ['My hamster died and I feel silly for being this sad.', 'loss'],
  ['My husband died suddenly in June.', 'loss'], ['She died before I could say goodbye.', 'loss'], ['My uncle was killed in a car crash.', 'loss'],
  ['My sister is dead and nobody talks about it.', 'loss'], ['My late wife loved this time of year.', 'loss'], ['My cat had to be put to sleep.', 'loss'],
  ['Ever since Dad died I can’t sleep.', 'loss'], ['Mum died two years ago and it still hurts.', 'loss'], ['I’m going to a funeral tomorrow and dreading it.', 'grief'],
  ['Today is the anniversary of the day she died.', 'loss'], ['My best friend passed away in a car accident.', 'loss'], ['I lost my son two years ago.', 'loss'],
  ['Rest in peace Nana.', 'loss'], ['My grandad’s death anniversary is today.', 'loss'], ['I miss my dad, he’s gone now.', 'loss'],
  // review r6: the contraction stuck to the person, boy / girl / ex, "the death of", "losing", "watching … die"
  ['My dad\'s dead.', 'loss'], ['My dad’s dead.', 'loss'], ['My mum\'s dead and I miss her.', 'loss'], ['Mum\'s died.', 'loss'], ['My dog\'s died.', 'loss'], ['My dog’s died.', 'loss'],
  ['My grandad\'s just died.', 'loss'], ['My nan\'s dead.', 'loss'], ['Dad\'s been dead a year now.', 'loss'], ['Our cat\'s been put down.', 'loss'],
  ['My little boy died in hospital.', 'loss'], ['My little girl died.', 'loss'], ['My baby boy died.', 'loss'], ['My boy died last year.', 'loss'], ['My ex died…', 'loss'],
  ['After the death of my father…', 'loss'], ['Losing my dad was the hardest thing.', 'loss'], ['My best friend\'s dead.', 'loss'], ['My husband\'s passed.', 'loss'],
  ['Watching my grandma die was the worst thing.', 'loss'], ['My mum\'s passed.', 'loss'],
  ['My grandmother, who I was really close to, died last week.', 'loss'], ['My nan who I loved so much passed away.', 'loss'], ['I wish my dad hadn’t died.', 'loss'],
  ['My best friend Sam died in the summer.', 'loss'], ['We scattered Grandad’s ashes on Sunday.', 'grief'], ['My dog Max was put down on Friday.', 'loss'],
  ['My grandad has not long died.', 'loss'], ['MY DOG DIED', 'loss'], ['I lost my husband to a heart attack.', 'loss'], ['My parents both died when I was young.', 'loss'],
  ['Mum and Dad died in a crash.', 'loss'], ['I cried at the cemetery today.', 'grief'], ['RIP to my little cat.', 'loss'], ['We had to put our dog down.', 'loss'],
  ['It’s been a year since my dad died and people expect me to be over it.', 'loss'], ['Since losing my mum I don’t enjoy anything.', 'loss'],
  ['I can’t believe she’s dead.', 'loss'], ['We buried our dog in the garden.', 'loss'], ['My brother took his own life last year.', 'loss'], ['I had a miscarriage last month.', 'loss'],
  ['My nan is no longer with us.', 'loss'], ['I miss my cat, she was put to sleep on Monday.', 'loss'], ['My aunt, bless her, passed away.', 'loss'],
];
/** Not a death: idioms, objects, exams, imagined or nearly, gone somewhere, 'passed' alone. */
const NOT_LOSSES = [
  // the review's four
  'I lost my mum’s ring and she’ll be furious with me.', 'I lost my dad’s car keys and he’s going to kill me.', 'My son passed and I’m so proud but I failed again.', 'my daughter passed! she got into uni',
  // 'passed' alone is never a death, and passing something is not
  'My son passed his driving test and I didn’t.', 'My brother passed his exams and I feel like the failure of the family.', 'My sister passed me in the corridor and didn’t say hi.',
  'My son passed and I’m so proud.', 'My dad passed last year.', 'My dog passed his training class!', 'My mum passed her driving test at 50!', 'My son has passed every exam this year.',
  'My daughter passed her grade 5 piano!', 'Grandad passed out at dinner.',
  // passed on something
  'My mum passed on the message but nobody listened.', 'My friend passed on my CV to her manager.', 'My mum passed on her recipe to me.', 'Our teacher passed on the news to the class.', 'My sister passed on the flu to me.',
  // lost something of theirs, or lost them somewhere, or lost touch
  'I lost my keys again.', 'I lost my sister in the supermarket for ten minutes and panicked.', 'I lost my temper with my son.', 'I lost my friend’s number.', 'I lost my dad’s watch that he gave me.',
  'I lost my dog in the park but we found him.', 'I lost my kids’ school letters.', 'I lost my mum at the shops.', 'I lost my granny’s necklace.', 'I lost my dog’s lead.', 'I lost my brother’s trust.',
  'I lost my best friend after a stupid argument.', 'I’ve lost my sister, she won’t speak to me.', 'I lost my dad to drink.', 'My cat is lost and I can’t find her.',
  // things that "die"
  'My phone died in the middle of the call.', 'My plants died while I was away.', 'The battery died on the way home.', 'My baby monitor died in the night.', 'My dad’s car died on the motorway.', 'My mum’s laptop passed away lol',
  // idioms
  'My boss gives me grief about everything.', 'Good grief, what a week.', 'If you don’t revise it’s your funeral.', 'My grandad would be turning in his grave.', 'I made a grave mistake at work.',
  'My boss put me down in front of everyone.', 'RIP my phone, it fell in the bath.', 'I nearly died of embarrassment.', 'I died laughing at the meeting.', 'My mum is dead set on me becoming a doctor.',
  'My dad is dead to me after what he did.', 'I’m getting so much grief from my mum about my grades.', 'My plans came to grief.', 'I’ll take this secret to the grave.', 'My brother killed it at karaoke.',
  'My mum would kill me if she found out.', 'I ripped up the letter from my dad.', 'Dead tired after work today.', 'My friend died her hair pink.', 'RIP my social life.', 'Rest in peace to my old phone.',
  'My brother is dead keen on football.', 'My boyfriend is dead to me.', 'My teacher put me down in front of the class.', 'I put my dog down for a nap.', 'We put our cat down on the bed.',
  // nearly, feared, imagined, dreamt, a story
  'My dad nearly died in a car crash.', 'I’m scared my mum will die.', 'What if my dad died while I was away?', 'I dreamt my mum died and woke up crying.', 'I’m afraid that if my nan died I would fall apart.',
  'My grandad is dying.', 'My dad has cancer and I’m scared he’ll die.', 'My cat died in my dream.', 'My son nearly passed away in hospital.', 'My dog nearly got killed by a car.', 'My brother was nearly killed.',
  'I keep worrying my nan will pass away.', 'He died in the game and I lost the match.', 'She died in the film and I cried.', 'In the game my character died again.',
  // gone somewhere, not gone
  'My dad’s gone to work and I’m alone with the baby.', 'My girlfriend is gone now, she left me for someone else.', 'She’s gone to her mum’s for the weekend.', 'My dad left. He’s gone now.',
  'He’s gone now, thank god, the party was too loud.', 'The anniversary of our first date is coming up and he forgot.', 'I buried my face in my hands.',
  // review r6: lost, but not to a death (moved, remarried, a missing pet, still alive)
  'I lost my sister when she moved to Spain.', 'I lost my dad when he remarried and stopped calling.', 'I lost my cat last night and I’ve put posters up everywhere.',
  'I lost my dog yesterday, he slipped his lead in the woods.', 'I lost my mum to dementia, she doesn’t know who I am.',
];

test('r5.1: a death the person names is a bereavement (a person or a pet; died, passed away, lost my…, RIP, a grave, a pet put down)', () => {
  assert.ok(LOSSES.length >= 30);
  for (const [text, kind] of LOSSES) assert.equal(bereavement(text), kind, text);
});

test('r5.1: nothing else is: "lost my mum’s ring", "passed" alone, objects, idioms, imagined, nearly, gone somewhere', () => {
  assert.ok(NOT_LOSSES.length >= 30);
  for (const text of NOT_LOSSES) assert.equal(bereavement(text), null, text);
});

test('r5.1: a false alarm never says someone died (no grief lines, no "Missing them"), and the scene is an ordinary one', () => {
  for (const text of NOT_LOSSES) {
    for (const { scene } of rounds(text)) {
      assert.notEqual(scene.grief, true, text);
      // (their own words quoted back are theirs: only Zuzu's own words are read here)
      for (const line of said(scene)) assert.doesNotMatch(line.replace(/“[^”]*”/gu, '“…”'), /Missing them|Grief isn|Loss is heavy|died|passed away|death|funeral/i, `${text} → ${line}`);
    }
  }
  // the review's four, each its own ordinary scene with a mechanic
  for (const text of NOT_LOSSES.slice(0, 4)) assert.ok(authoredScene(text).mechanic, text);
});

test('r5.1: a loss still never plays a mechanic or a fact/assumption split, and its lines never name a death themselves', () => {
  for (const [text] of LOSSES) {
    // every round of the authored path (one: a loss has no other angle), and none of them a game
    const all = rounds(text);
    assert.equal(all.length, 1, text);
    for (const { scene } of all) { assert.equal(scene.grief, true, text); assert.equal(scene.mechanic, null, text); assert.equal(scene.interaction_type, null, text); }
    const s = authoredScene(text);
    assert.equal(s.grief, true, text);
    assert.equal(s.mechanic, null, text);
    assert.equal(s.known_fact, '', text);
    assert.equal(s.possible_assumption, '', text);
    // never a death quoted back: the lines name no one and no way of dying
    for (const line of [s.subtitle_line_1, s.subtitle_line_2]) assert.doesNotMatch(line, /died|dead|passed|killed|funeral|grave|your (?:mum|dad|nan|grandad|dog|cat)/i, line);
  }
  assert.deepEqual(griefScene('My grandad died.').subtitle_line_1, GRIEF.loss[0]);
  assert.deepEqual(griefScene('I’m going to a funeral tomorrow.').subtitle_line_1, GRIEF.grief[0]);
  // a loss with a crisis in it is crisis first (the app's own check runs before any grief)
  assert.equal(checkText('My mum died and I want to die too.').level, 'crisis');
});

test('r5.1: grief in the orchestrator: gentle first, the server may answer with sharing on, its mechanic never plays', () => {
  const src = read('src/beyond/another-angle.js');
  const grief = src.slice(src.indexOf('async function griefMode('), src.indexOf('async function unclear('));
  // Zuzu says first that they said it, and never the waiting lines about "another side"
  assert.match(grief, /const heard = say\(GRIEF\.heard, \{ mallow: 'zuzu', interrupt: true \}\);/);
  assert.doesNotMatch(grief, /WAITING|waitingLines|spawnThought|playScene|loadMechanic|startAngle|setStage\('playful'\)/);
  // with sharing on, one request; crisis and care from the server still route; a fallback runs the app's check again
  assert.match(grief, /if \(!scene && !asked && serverMode\(\)\) \{[\s\S]*client\.angle\(\{ text: S\.text, emotion: S\.emotion, intention: S\.intention, previous: \[\] \}\)/);
  assert.equal((grief.match(/client\.angle\(/g) || []).length, 1, 'one request at most');
  // the server's lines are never said over a loss when they would read it as a guess
  assert.match(grief, /!framesAsGuess\(res\.scene\.subtitle_line_1\) && !framesAsGuess\(res\.scene\.subtitle_line_2\)\) scene = res\.scene;/);
  assert.match(grief, /sleep\(devBudget \|\| ANGLE_BUDGET_MS\)/);
  assert.match(grief, /res\?\.status === 'crisis'\) \{ crisisMode\(\); return; \}/);
  assert.match(grief, /res\?\.status === 'care'\) \{ careMode\(\); return; \}/);
  assert.match(grief, /const again = checkText\(S\.text\);/);
  // the server's two lines (or the authored pair); never its mechanic
  assert.match(grief, /if \(!scene\) scene = griefScene\(S\.text, \{ emotion: S\.emotion \}\);\s*else scene = \{ \.\.\.scene, grief: true, mechanic: null \};/);
  assert.match(grief, /await say\(scene\.subtitle_line_1, \{ mallow: 'zuzu' \}\);[\s\S]*await say\(scene\.subtitle_line_2, \{ mallow: 'zuzu' \}\);/);
  // startAngle: a loss goes to griefMode (no Thought Mallow); a server scene that reads as grief plays gently too
  const start = src.slice(src.indexOf('async function startAngle('), src.indexOf('async function waitingLines('));
  assert.match(start, /if \(bereavement\(S\.text\)\) return griefMode\(\);/);
  assert.ok(start.indexOf('bereavement(S.text)') < start.indexOf('spawnThought()'));
  assert.match(start, /if \(res\.status === 'ok' && res\.scene && serverGrief\(res\.scene, S\.text\)\) \{ griefMode\(\{ scene: framesAsGuess\(res\.scene\.subtitle_line_1\) \|\| framesAsGuess\(res\.scene\.subtitle_line_2\) \? null : res\.scene, asked: true \}\); return; \}/);
  assert.equal(framesAsGuess('What happened is the part that actually happened.'), true);
  assert.equal(framesAsGuess('A year is not a deadline for missing your dad.'), false);
  // the gentle lines
  assert.equal(GRIEF.heard, 'Thank you for telling me.');
  for (const l of [GRIEF.heard, ...GRIEF.loss, ...GRIEF.grief, GRIEF.ask, GRIEF.squeeze]) assert.doesNotMatch(l, /\bAI\b|angle|reframe|fact|guess|mind/i, l);
});

test('r5.1: "passed" alone after a person is never read as a death, and never played as a game either', () => {
  for (const text of ['My dad passed last year.', 'My dad passed last year and Christmas is hard.', 'Since Mum passed I can’t sleep.', 'My grandad passed in March.']) {
    assert.equal(bereavement(text), null, text);
    assert.equal(passedAlone(text), true, text);
    const s = authoredScene(text);
    assert.equal(s.grief, undefined, text);
    assert.equal(s.feeling, 'heavy', text);
    assert.equal(s.subtitle_line_1, 'That sounds like a lot to carry.', text);
    for (const { scene } of rounds(text)) {
      assert.ok(FEELING_MECHANICS.includes(scene.mechanic), `${text} → ${scene.mechanic}`);
      for (const line of said(scene)) assert.doesNotMatch(line, /died|death|Missing them|Grief|what happened|one way to read|check one fact/i, `${text} → ${line}`);
    }
  }
  // an exam, a result, being proud, passing someone by: an ordinary scene
  for (const text of ['My son passed and I’m so proud but I failed again.', 'my daughter passed! she got into uni', 'My son passed his driving test and I didn’t.',
    'My sister passed me in the corridor and didn’t say hi.', 'My brother passed his exams and I feel like the failure of the family.', 'My mum passed her driving test at 50!']) {
    assert.equal(passedAlone(text), false, text);
    assert.notEqual(authoredScene(text).feeling, 'heavy', text);
  }
});

test('r5.1: a server scene reads as grief only when it says so (a loss, read as grief)', () => {
  assert.equal(serverGrief({ source: 'server', situation_type: 'loss', emotion: 'grief' }), true);
  assert.equal(serverGrief({ source: 'server', situation_type: 'loss', emotion: 'Mourning' }), true);
  assert.equal(serverGrief({ source: 'server', situation_type: 'loss', emotion: 'disappointment' }), false, 'a lost job is not a death');
  assert.equal(serverGrief({ source: 'server', situation_type: 'work', emotion: 'grief' }), false);
  assert.equal(serverGrief({ source: 'authored', situation_type: 'loss', emotion: 'grief' }), false);
  assert.equal(serverGrief(null), false);
});

// --------------------------------------------------------------- 2. feelings --
const FEELINGS = [
  ['I feel empty', 'low'], ['I feel so alone', 'lonely'], ['I feel numb', 'low'], ['I feel anxious', 'anxious'], ['I feel guilty', 'guilty'],
  ['I can’t stop crying', 'crying'], ['I can\'t stop crying', 'crying'], ['I’m so tired of everything', 'tired'], ['I\'m so tired of everything', 'tired'],
  ['I feel empty.', 'low'], ['I just feel really low today.', 'low'], ['I’m so lonely.', 'lonely'], ['I feel sad and tired.', 'low'],
  ['I feel empty and I can’t stop crying.', 'low'], ['I’ve been crying all day.', 'crying'], ['I feel overwhelmed.', 'anxious'], ['Everything feels too much.', 'low'],
  ['I’m exhausted.', 'tired'], ['Feeling so low today.', 'low'], ['I feel awful.', 'low'], ['I’m really anxious right now.', 'anxious'], ['I feel like crying.', 'crying'],
  ['I’m not okay.', 'low'], ['I feel guilty for saying no.', 'guilty'], ['I keep crying for no reason.', 'crying'], ['I feel on edge all the time.', 'anxious'],
  ['I’m sick of it all.', 'tired'], ['Honestly I just feel numb.', 'low'], ['I feel bad about it.', 'guilty'], ['I feel hopeless.', 'low'], ['I feel anxious and I don’t know why.', 'anxious'],
  ['I feel numb since the breakup.', 'low'], ['I feel lonely at uni.', 'lonely'], ['I feel sad since my sister moved away.', 'low'], ['I feel sad after he left me.', 'low'],
  // review r6: the contraction after "I" ("I'm feeling", "I've been feeling", "I've felt", "im feeling"), and feeling words the list lacked
  ['I\'m feeling really low.', 'low'], ['I’m feeling really low.', 'low'], ['I\'m feeling lonely.', 'lonely'], ['I\'m feeling so anxious.', 'anxious'], ['im feeling sad', 'low'],
  ['I’ve been feeling so lonely.', 'lonely'], ['I\'ve been feeling empty.', 'low'], ['I\'ve felt numb for weeks.', 'low'],
  ['I feel jealous', 'low'], ['I feel jealous of my sister', 'low'], ['I feel insecure', 'low'], ['I feel helpless', 'low'], ['I feel stuck', 'low'], ['I feel trapped', 'low'],
  ['I feel disappointed in myself', 'low'], ['I feel sick with nerves', 'anxious'],
];
const NOT_FEELINGS = [
  'I feel like everyone hates me.', 'I feel like a failure.', 'I feel anxious about tomorrow’s interview.', 'I feel like nobody cares about me.', 'I’m a terrible person.',
  'I feel guilty because she must hate me now.', 'Nobody likes me.', 'I’m useless.', 'I feel like I’ll never be good enough.', 'I’m so angry with my boss.',
  'I feel tired because my boss gives me too much work.', 'I feel lonely since my friends stopped inviting me.', 'I feel like a burden.', 'Everyone thinks I’m boring and I feel sad.',
  'My sister ignored me at the party, she must hate me.', 'I have three essays due on Monday and I haven’t started.',
];
/** The framing a feeling must never get. */
const FACT_CHECK = /what your mind|mind might be adding|one way to read|is what happened|check one fact|instead of guessing|what did you actually|what might it mean|another explanation|facts are still unclear/i;
const FEELING_MECHANICS = ['assemble_step', 'soften_harshness', 'separate_one'];

test('r5.2: a feeling said plainly is read as a feeling (twenty and more), and nothing that guesses, judges or plans is', () => {
  assert.ok(FEELINGS.length >= 20);
  for (const [text, kind] of FEELINGS) assert.equal(feelingOf(text)?.kind, kind, text);
  for (const text of NOT_FEELINGS) assert.equal(feelingOf(text), null, text);
  for (const [text] of FEELINGS) {
    const s = feelingStatement(text);
    if (s) assert.ok(FEELING_LOOK[s.kind], text);
  }
});

test('r5.2: a feeling is never "what your mind added", never "one way to read what happened", never told to check a fact', () => {
  for (const [text, kind] of FEELINGS) {
    const all = rounds(text);
    assert.equal(all.length, FEELING_ORDER[kind].length + 1, `${text}: every fitting mechanic, then "that's every angle"`);
    assert.equal(all[all.length - 1].scene.exhausted, true, text);
    for (const { scene, parts } of all) {
      assert.ok(scene.feeling, text);
      assert.ok(FEELING_MECHANICS.includes(scene.mechanic), `${text} → ${scene.mechanic}`);
      assert.notEqual(scene.mechanic, 'pull_apart', text);
      for (const line of said(scene)) assert.doesNotMatch(line, FACT_CHECK, `${text} → ${line}`);
      assert.equal(scene.possible_assumption, '', text);
      // the soften plate carries the feeling as they said it, never "the harshest way to see it"
      assert.doesNotMatch(parts.harsh, /harshest way/i, text);
    }
    // the first is a small, kind step for that kind of feeling, acknowledged in Zuzu's words
    const first = all[0].scene;
    assert.equal(first.practical_next_step, FEELING.steps[kind], text);
    assert.equal(first.subtitle_line_1, first.mechanic === 'assemble_step' ? FEELING.first[kind] : FEELING.pairs[first.mechanic][0], text);
  }
  // the named ones, exactly
  const empty = rounds('I feel empty');
  assert.deepEqual(empty.map((r) => r.scene.mechanic), ['assemble_step', 'soften_harshness', 'separate_one', 'assemble_step']);
  assert.equal(empty[0].scene.subtitle_line_1, 'What you’re feeling is real, and it counts.');
  assert.equal(empty[0].scene.subtitle_line_2, 'One small, kind thing for yourself is plenty for now.');
  assert.equal(rounds('I feel guilty')[0].scene.mechanic, 'soften_harshness');
  assert.equal(rounds('I’m so tired of everything')[1].scene.mechanic, 'separate_one');
  assert.equal(authoredScene('I feel so alone').practical_next_step, 'Send one short message to someone you like, just to say hi.');
  assert.equal(authoredScene('I can’t stop crying').subtitle_line_1, 'Tears like these are real, and they’re allowed.');
  // candidatePatterns (the thought's look, the server's fallback hint) agree: never fact_vs_assumption first
  for (const [text] of FEELINGS) assert.ok(!candidatePatterns(text).includes('fact_vs_assumption'), text);
  // a server hint for a mechanic that fits leads; pull_apart's never does
  assert.equal(feelingScene('I feel empty', 'low', { hint: 'overgeneralisation' }).mechanic, 'separate_one');
  assert.equal(feelingScene('I feel empty', 'low', { hint: 'fact_vs_assumption' }).mechanic, 'assemble_step');
});

test('r5.2: inside a longer message a feeling is what is so, never the guess (ownFactPair, ownStep, sceneParts)', () => {
  for (const text of ['I failed my exam and I feel awful.', 'My boyfriend didn’t reply and I can’t stop crying.', 'Work was awful and I feel so tired of everything.',
    'I feel awful and everyone must hate me.', 'My friend didn’t text back and I feel so alone.', 'I feel guilty because she must hate me now.', 'I feel lonely since my friends stopped inviting me.']) {
    for (const { scene, parts } of rounds(text)) {
      assert.ok(!feelingClause(parts.guess) || parts.guessAsk, `${text} → guess tag ${parts.guess}`);
      for (const line of said(scene)) {
        for (const q of line.match(/“[^”]+”/g) || []) {
          if (feelingClause(q.slice(1, -1))) assert.doesNotMatch(line, /one way to read|mind might be adding|check one fact|instead of guessing|is what happened/i, `${text} → ${line}`);
        }
      }
    }
  }
  // a feeling beside a guess: the feeling is real, the guess is one reading
  const pair = rounds('I feel awful and everyone must hate me.').map((r) => r.scene).find((s) => s.mechanic === 'pull_apart');
  assert.equal(pair.subtitle_line_1, '“I feel awful” is real.');
  assert.equal(pair.subtitle_line_2, '“everyone must hate me” is one way to read it.');
});

test('r5.2: the orchestrator never fact-checks a feeling: its explore prompts, friend line, mechanic lines and fallback', () => {
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /let remaining = scene\.feeling \? EXPLORE\.filter\(\(p\) => FEELING\.explore\.includes\(p\.id\)\) : EXPLORE\.slice\(\);/);
  assert.deepEqual(EXPLORE.filter((p) => FEELING.explore.includes(p.id)).map((p) => p.label), ['What would you tell a friend?', 'Is there one useful action?']);
  assert.match(src, /if \(p\.field === 'friend'\) return scene\.feeling \? FEELING\.friend :/);
  assert.match(src, /choose\(scene\.feeling \? \(first \? FEELING\.exploreAsk : FEELING\.exploreMore\)/, 'never "Want to test it?"');
  assert.match(src, /if \(feel\) careFace\(\); else zt\?\.setEmotion\(\{ curious: 0\.65, playful: 0\.35 \}/, 'no playful face for a feeling');
  for (const l of [FEELING.exploreAsk, FEELING.exploreMore]) assert.doesNotMatch(l, /test|check|know/i, l);
  assert.match(src, /const L = mechanicLines\(scene\.mechanic, scene\);/);
  assert.match(src, /lines: L,/, 'the mechanic gets the scene’s own lines');
  assert.match(src, /const fallback = scene\.feeling \? 'assemble_step' : 'pull_apart';/);
  assert.match(src, /if \(f && FEELING_LOOK\[f\.kind\]\) return FEELING_LOOK\[f\.kind\];/, 'the thought looks like the feeling');
  for (const f of ['soften-harsh.js', 'separate-one.js', 'assemble-step.js']) assert.match(read(`src/beyond/mechanics/${f}`), /const L = ctx\.lines \|\| MECHANIC_LINES\[id\];/, f);
  // a feeling's own lines: no verdict, no lesson, no "every time", no other times
  for (const m of FEELING_MECHANICS) {
    const L = mechanicLines(m, { feeling: 'low' });
    for (const k of ['hint', 'assist', 'done']) assert.ok(L[k], `${m}.${k}`);
    const text = JSON.stringify(L);
    assert.doesNotMatch(text, /verdict|lesson|Something to learn|Other times|This time|every moment|harsh/i, m);
    assert.deepEqual(mechanicLines(m, {}), MECHANIC_LINES[m], `${m}: other scenes keep the mechanic's own`);
  }
  // while it is prepared and over its lines: never "What else could be true?" or "another side"
  assert.match(src, /const lines = feel \? FEELING\.waiting : WAITING, long = feel \? FEELING\.waitingLong : WAITING_LONG;/);
  assert.match(src, /text: scene\.feeling \? FEELING\.title : 'A new perspective'/);
  for (const l of [...FEELING.waiting, ...FEELING.waitingLong, FEELING.title]) assert.doesNotMatch(l, /else could be true|another side|closer|angle|perspective|turning it/i, l);
  assert.doesNotMatch(FEELING.friend, /fact|check|story/i);
  for (const l of [...Object.values(FEELING.first), ...Object.values(FEELING.pairs).flat(), ...Object.values(FEELING.steps), FEELING.known]) assert.doesNotMatch(l, FACT_CHECK, l);
});

test('r5.2: a server scene for a feeling never plays as "What your mind added" either (feelingGuard)', () => {
  const server = (o) => ({ source: 'server', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', mechanic: 'pull_apart', mallow_character: 'zuzu', emotion: 'sadness', situation_type: 'other', known_fact: 'You feel empty.', possible_assumption: '', alternative_angle: '', practical_next_step: '', subtitle_line_1: 'Feeling empty is real, and it deserves care.', subtitle_line_2: 'One small comfort could be enough for today.', safety_status: 'ok', ...o });
  // its own kind lines play, on the feeling's mechanic, with a small step; its pattern stays its own (for its records)
  const g = feelingGuard(server(), 'I feel empty');
  assert.equal(g.mechanic, 'assemble_step');
  assert.equal(g.feeling, 'low');
  assert.equal(g.source, 'server');
  assert.equal(g.subtitle_line_1, 'Feeling empty is real, and it deserves care.');
  assert.equal(g.interaction_type, 'pull_apart');
  assert.equal(g.practical_next_step, FEELING.steps.low);
  assert.equal(feelingGuard(server({ practical_next_step: 'Wrap up warm.' }), 'I feel empty').practical_next_step, 'Wrap up warm.');
  // a mechanic of the feeling's own stays
  assert.equal(feelingGuard(server({ mechanic: 'soften_harshness' }), 'I feel guilty').mechanic, 'soften_harshness');
  assert.equal(feelingGuard(server({ mechanic: 'open_interpretations' }), 'I feel so alone').mechanic, 'assemble_step');
  // lines that would fact-check the feeling give way to Zuzu's own feeling scene (the mock server's placeholder does)
  for (const l1 of ['What happened is the part that actually happened.', '“I feel empty” is one way to read what happened.', 'Check one fact about how you feel.']) {
    const a = feelingGuard(server({ subtitle_line_1: l1 }), 'I feel empty');
    assert.equal(a.source, 'authored', l1);
    assert.equal(a.feeling, 'low');
    assert.equal(a.subtitle_line_1, FEELING.first.low);
  }
  // anything else is untouched
  const other = server({ subtitle_line_1: 'What happened is the part that actually happened.' });
  assert.equal(feelingGuard(other, 'My sister ignored me at the party, she must hate me.'), other);
  assert.equal(feelingGuard({ ...other, source: 'authored' }, 'I feel empty').source, 'authored');
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /scene = feelingGuard\(res\.scene, S\.text, \{ emotion: S\.emotion, exclude \}\);/);
});

// a 2D context that accepts every call, and tags without DOM (as in beyond.test.mjs)
function fakeCtx2d() {
  const grad = { addColorStop() {} };
  return new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => grad : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
}
globalThis.OffscreenCanvas ??= class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return fakeCtx2d(); } };
function fakeTags() {
  const list = new Set();
  return {
    add(text, o = {}) { const t = { text, title: o.title, w: 90, h: 30, el: { style: { setProperty() {} } }, at() { return t; }, own() { return t; }, rect: () => null, set(x) { t.text = x; return t; }, title_(x) { t.title = x; return t; }, hide() { return t; }, remove() { list.delete(t); } }; list.add(t); return t; },
    rects: () => [], clear() { list.clear(); }, get size() { return list.size; }, texts: () => [...list].map((t) => t.text),
    layout() {}, remeasure() {},
  };
}

test('r5.2: the three mechanics a feeling plays label it as a feeling (never "Something to learn", "This time / Other times")', async () => {
  const text = 'I feel empty';
  for (const mech of FEELING_MECHANICS) {
    const scene = { ...feelingScene(text, 'low'), mechanic: mech, interaction_type: mech };
    const tags = fakeTags();
    const mod = await MECHANIC_MODULES[mech]();
    const m = mod.mount({
      g: fakeCtx2d(), area: () => ({ x: 16, y: 170, w: 358, h: 400 }), from: { x: 195, y: 360, r: 36 },
      scene, parts: sceneParts(text, scene), lines: mechanicLines(mech, scene), text, emotion: 'sadness', tags,
      reducedMotion: () => true, lowStim: () => false, hint() {}, choose: async () => null, haptic() {}, fx() {}, progress() {}, kick() {}, say() {},
    });
    const shown = tags.texts().join(' | ');
    assert.doesNotMatch(shown, /Something to learn|This time|Other times|What your mind added|What happened/, `${mech}: ${shown}`);
    if (mech === 'soften_harshness') assert.match(shown, /I feel empty \| Still you/);
    if (mech === 'separate_one') assert.match(shown, /This feeling/), assert.match(shown, /The rest of you/);
    if (mech === 'assemble_step') assert.match(shown, /One kind step/);
    m.destroy();
  }
});
