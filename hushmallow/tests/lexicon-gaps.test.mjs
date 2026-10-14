// Final round 3, lexicon gaps (measured on 931fbb0 through readSafety): four gaps in the one shared safety lexicon
// (src/data/safety-lexicon.js; the Another Angle server keeps a byte-identical copy), fixed structurally and narrowly. The
// lexicon's principle holds: a false alarm is a small cost, missing someone in danger is not.
//   1. unwanted sexual touching, whoever does it, is care (abuse, so the abuse helpline still comes first): touched / touches /
//      touching / groped / fondled + me + inappropriately, there, under my…, where I didn't want, without asking; 'inappropriately
//      touched me', 'felt me up', 'made me touch him', 'he keeps touching me'. An ordinary touch stays none ('touched me on the
//      shoulder to get my attention', 'the film really touched me', 'touched me deeply').
//   2. someone else not breathing, now, contracted or not ("she's not breathing", "my dad isn't breathing", 'is not breathing
//      properly', 'has stopped breathing'): crisis, someone in danger. The speaker ("I'm not breathing properly because of my
//      cold") never is. A plain past 'my baby stopped breathing' is how a death is told: it keeps the loss path (beyond-r8).
//   3. 'beat me' at a game, in a contest or a race ('beat me at chess', 'in the final', 'to it', 'on points') is never violence;
//      'beat me up', 'beat me with a belt', 'beat me in the face' still are.
//   4. a clearly negated danger ('nobody is in danger', 'no members of my family are actually in danger') is not crisis; the
//      negation has to be the subject of the danger clause itself ('no one knows I'm in danger' still is).
// Each list (15 that must read, 15 that must not) was written before the rules; the measured sentences are pinned verbatim.
// Round 3 (the independent verifier failed the first pass: /tmp/claude-0/hf/verify-lex.json, every sentence pinned below):
//   3. the default flipped: 'beat me' is a blow unless a game, a contest or a race is named (BEAT_GAME: 'at chess', 'in the
//      final', 'to it', 'to the bus stop', 'home', 'on points', 'by two goals', 'fair and square', '6-2'); a place, a time or
//      the harm after it is a blow again ('in the shower', 'on the way home', 'at the weekend', 'to the point where', 'to
//      tears'), and the people who beat are more than the old list ('my uncle', 'the older boys', 'beat me with a belt').
//   4. only a purely negated danger is blanked (TURN): nothing after it turns the meaning ('but', 'only me', 'just me', 'yet',
//      'unless', 'if', 'now'…) and no other subject follows with is / are ("no one's in danger, my mum is"); "we're all in
//      danger" reads.
//   1. a private part touched ('he touched my privates', 'he put his hand down my pants', 'touched me down below') is care; a
//      small child or a brother or sister who keeps touching is not, unless something says it is unwanted in that way.
//   2. the phone spellings ('shes', 'hes', 'theyre', 'its'), a relative with no 'my' ('dad isn't breathing'), 'the old man on
//      the floor', 'she collapsed and isn't breathing', 'barely breathing'; never 'not breathing a single word', 'breathing
//      easy', 'breathing on my food'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText, checkTextFirstPass } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import { HARM_LEXICON, CONCERN_LEXICON, HARM_OTHERS_LEXICON } from '../src/data/safety-lexicon.js';

await loadGrief();

/** The main screen's reading (input-overlay readSafety, lossAware) and the plain one (lossAware off: checkText). */
const main = (t) => readSafety({ checkText }, t, true);
const plain = (t) => readSafety({ checkText }, t, false);
const both = (t) => [main(t), plain(t)];
const show = (r) => `${r.level}/${r.category}${r.matched ? ` [${r.matched}]` : ''}`;

// ------------------------------------------------------------------------------------- 1. touching --
const TOUCH_POS = [
  'he touched me inappropriately',
  'My coach touched me inappropriately after practice',
  'she touches me inappropriately when we are alone',
  "my uncle touched me where I didn't want him to",
  'someone at the party touched me there and I froze',
  'he touched me under my clothes',
  'my brother keeps touching me and I hate it',
  'he made me touch him',
  'she made me touch her and said not to tell',
  'my boss inappropriately touched me at the work do',
  'Tom fondled me on the sofa',
  'a man on the train groped me without asking',
  'he felt me up in the corridor',
  "my mum's friend was touching me under my skirt",
  "our neighbour won't stop touching me",
];
const TOUCH_NEG = [
  'he touched me on the shoulder to get my attention',
  'the film really touched me',
  'your message touched me',
  'her speech touched me deeply',
  "that song touched me in a way I can't explain",
  'he touched me on the arm and said sorry',
  'it touched me that he remembered my birthday',
  'the ball touched me before it went in',
  'his letter touched me there and then',
  'she touched me under my chin and laughed',
  'my sister made me touch her slime',
  'the teacher made me touch base with my tutor',
  'my cat keeps touching me with her paw',
  'my little brother keeps touching me to annoy me',
  'what you said touched me so much',
];

test('lexicon gaps 1: unwanted sexual touching, whoever does it, is care (abuse) on both readings; an ordinary touch stays none', () => {
  assert.equal(TOUCH_POS.length, 15);
  assert.equal(TOUCH_NEG.length, 15);
  for (const t of TOUCH_POS) for (const r of both(t)) assert.deepEqual([r.level, r.category], ['care', 'abuse'], `${t} → ${show(r)}`);
  for (const t of TOUCH_NEG) for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
});

// ------------------------------------------------------------------------------------ 2. breathing --
const BREATH_POS = [
  "she's not breathing",
  "he's not breathing",
  "they're not breathing",
  "someone's not breathing",
  "my dad isn't breathing",
  "he isn't breathing and his lips are blue",
  // (the list's 'she stopped breathing', a plain past, is how a death is told: pinned below as the loss path)
  "she's stopped breathing",
  'my baby has stopped breathing',
  'my friend is not breathing properly',
  'help my mum isnt breathing',
  "my sister's not breathing",
  "he's stopped breathing",
  "they aren't breathing",
  'my grandad just stopped breathing',
  "the baby isn't breathing",
];
const BREATH_NEG = [
  "I'm not breathing properly because of my cold",
  "I'm not breathing right, my nose is blocked",
  "she's not breathing a word about it to anyone",
  'he finally stopped breathing down my neck at work',
  "he's not breathing through his nose",
  "they're not breathing a sigh of relief yet",
  "this fabric isn't breathing at all",
  "she's breathing fine now",
  'the wine is not breathing yet, open it earlier',
  'I stopped breathing for a second when I saw the bill',
  "I've stopped breathing through my mouth at night",
  'he stopped breathing so heavily once he calmed down',
  "my brother isn't breathing new life into the band",
  "she's not breathing hard any more after the run",
  "we're not breathing the same air as them any more",
];

test('lexicon gaps 2: someone else not breathing, now, is crisis (someone in danger); the speaker and the idioms never are', () => {
  assert.equal(BREATH_POS.length, 15);
  assert.equal(BREATH_NEG.length, 15);
  for (const t of BREATH_POS) for (const r of both(t)) assert.deepEqual([r.level, r.category], ['crisis', 'someone-in-danger'], `${t} → ${show(r)}`);
  for (const t of BREATH_NEG) {
    // (the plain reading says nothing; the main screen's loss readings may still read a death word, never more)
    assert.equal(plain(t).level, 'none', `${t} → ${show(plain(t))}`);
    assert.ok(['none', 'concern'].includes(main(t).level), `${t} → ${show(main(t))}`);
  }
  // a plain past is how a death is told: the loss path on the main screen, as tests/beyond-r8.test.mjs pins it ('my baby
  // stopped breathing' is one of its deaths), never the urgent sheet; with a call for help straight after, it is now
  for (const t of ['she stopped breathing', 'my baby stopped breathing', 'my dad stopped breathing last year and died']) {
    assert.notEqual(plain(t).level, 'crisis', t);
    assert.deepEqual([main(t).level, main(t).category], ['concern', 'loss'], t);
  }
  for (const t of ['she stopped breathing, help', 'he stopped breathing what do i do', 'my son stopped breathing right now']) {
    assert.deepEqual([plain(t).level, plain(t).category], ['crisis', 'someone-in-danger'], t);
  }
  // a stranger where they are is someone too
  for (const t of ["the man next to me isn't breathing", 'a woman on the street is not breathing']) assert.equal(plain(t).level, 'crisis', t);
});

// ---------------------------------------------------------------------------------------- 3. beat me --
const BEAT_POS = [
  'he beat me up',
  'my dad beat me with a belt',
  'my husband beat me last night',
  'he beat me in the face',
  'she beat me on the head with a shoe',
  'my boyfriend beat me to a pulp',
  'he beat me',
  'my stepdad beats me',
  'he beat me black and blue',
  'my partner has beaten me',
  'he beat me until I passed out',
  'they beat me in front of my kids',
  'my brother beat me at home when mum was out',
  'my ex beat me in the stomach',
  'my dad beats me with his belt',
];
const BEAT_NEG = [
  'my brother beat me at chess again',
  'he beat me at fifa',
  'she beat me in the final',
  'he beat me to it',
  'he beat me on points',
  'my sister beats me at everything',
  'my dad beat me at golf on sunday',
  'they beat me in the race by a second',
  'she beat me to the last slice of cake',
  'he beat me on penalties',
  'my boyfriend beat me in the pub quiz',
  'someone beat me to the parking space',
  'my friend has beaten me at tennis three times',
  'he beat me fair and square',
  'she beat me again at mario kart',
];

test("lexicon gaps 3: 'beat me' at a game, in a contest or a race is never violence; a blow still is", () => {
  assert.equal(BEAT_POS.length, 15);
  assert.equal(BEAT_NEG.length, 15);
  for (const t of BEAT_POS) for (const r of both(t)) assert.deepEqual([r.level, r.category], ['care', 'violence'], `${t} → ${show(r)}`);
  for (const t of BEAT_NEG) for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
  // the fear of a blow reads the same way ("scared he'll beat me": unsafe), and a game there is no fear of harm
  assert.deepEqual([plain("I'm scared he'll beat me in the face").level, plain("I'm scared he'll beat me in the face").category], ['care', 'unsafe']);
  for (const t of ["I'm afraid he'll beat me at chess", "I'm scared she'll beat me on points"]) assert.equal(plain(t).level, 'none', t);
});

// ----------------------------------------------------------------------------------------- 4. danger --
const DANGER_POS = [
  "no one knows I'm in danger",
  "nobody believes I'm in danger",
  'no one can help, my sister is in danger',
  'my sister is in danger',
  'no one listens and my brother is in danger',
  'nobody cares that my friend is in danger',
  "no one is coming and she's in danger",
  'none of the teachers believe me but my friend is in real danger',
  'nobody but me knows she is in danger',
  'no one is in danger except me',
  'nobody is in danger but me',
  'nobody else is in danger',
  'nobody thinks he is in danger',
  'no one realises my dad is in serious danger',
  'the police said nobody was hurt but my friend is in danger',
];
const DANGER_NEG = [
  'no members of my family are actually in danger',
  'nobody is in danger',
  'no one is in danger',
  'no-one is really in danger',
  'none of us are in danger',
  "we're not in danger any more",
  'no one at home is in danger',
  'nobody here is in danger',
  'none of the kids are in danger',
  'no members of staff are in danger',
  'nobody in my family is in danger',
  'noone is in danger, it was a false alarm',
  'no one I know is in danger',
  'none of my friends are actually in danger',
  "nobody's in danger, the fire is out",
];

test('lexicon gaps 4: a clearly negated danger is not crisis; a negation that does not govern the danger clause changes nothing', () => {
  assert.equal(DANGER_POS.length, 15);
  assert.equal(DANGER_NEG.length, 15);
  for (const t of DANGER_POS) for (const r of both(t)) assert.deepEqual([r.level, r.category], ['crisis', 'someone-in-danger'], `${t} → ${show(r)}`);
  for (const t of DANGER_NEG) for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
  // 'but my mum' says she is; (round 3) so does any 'but' after it, 'but my mum thinks so' too: only a purely negated danger
  // is blanked, and 'right now' says it may not last (the first pass pinned 'nobody in my family is in danger right now' as
  // none; it reads again, as it did on 931fbb0)
  assert.equal(plain('nobody is in danger but my mum').level, 'crisis');
  for (const t of ['nobody is in danger but my mum thinks so', 'nobody in my family is in danger right now']) assert.equal(plain(t).level, 'crisis', t);
});

// --------------------------------------------------------------------------------- the measured ones --
test('lexicon gaps: the measured sentences, verbatim (and the one left alone)', () => {
  const want = [
    ['he touched me inappropriately', 'care', 'abuse'],
    ["she's not breathing", 'crisis', 'someone-in-danger'],
    ['my brother beat me at chess again', 'none', null],
    ['he beat me at fifa', 'none', null],
    ['no members of my family are actually in danger', 'none', null],
    // bullying staying close to support is acceptable: left as it was
    ['she keeps spreading lies about me', 'care', 'harassment'],
  ];
  for (const [t, level, category] of want) for (const r of both(t)) assert.deepEqual([r.level, r.category], [level, category], `${t} → ${show(r)}`);
  // the brief's own wording for each fix
  const care = (t, category) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], ['care', category], `${t} → ${show(r)}`); };
  const crisis = (t) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], ['crisis', 'someone-in-danger'], `${t} → ${show(r)}`); };
  const none = (t) => { for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`); };
  for (const t of ['he made me touch her', 'she inappropriately touched me', 'he keeps touching me', 'someone groped me where I didn\'t want',
    'my teacher molested me', 'he touched me without asking']) care(t, 'abuse');
  for (const t of ['the film really touched me', 'your message touched me', 'touched me deeply']) none(t);
  for (const t of ["he's not breathing", "they're not breathing", "someone's not breathing", "she isn't breathing", 'he is not breathing properly']) crisis(t);
  assert.ok(['none', 'concern'].includes(plain("I'm not breathing properly because of my cold").level));
  for (const t of ['she beat me in the final', 'he beat me to it', 'he beat me on points', 'he beat me at chess']) none(t);
  for (const t of ['he beat me up', 'he beat me with a stick']) care(t, 'violence');
  for (const t of ['nobody is in danger', "we're not in danger any more", 'none of us are in danger', 'no-one is in danger']) none(t);
  for (const t of ["no one knows I'm in danger", "nobody believes I'm in danger", 'no one can help, my sister is in danger']) crisis(t);
});

// ------------------------------------------------------------------------------- round 3: the verifier --
// Every sentence in the independent verifier's report on the first pass (verify-lex.json), verbatim: the blocking ones read
// again (each was care or crisis on 931fbb0, or a disclosure missed on both trees), the false alarms it listed are none where
// they were fixed, and the two it listed that are left read as they did (with the reason).
const R3 = {
  // blocking: 'beat me' + at / in / to / on that is not a game (care/violence on 931fbb0, none on the first pass)
  beatBlow: ['he beat me in the shower', 'he beat me in my sleep', 'my dad beat me in the basement', 'he beat me on the way home',
    "he beat me at my nan's house", 'he beat me in public', "he beat me to the point where i couldn't stand", 'he beat me to near death',
    'he beat me on the stairs', 'my boss beat me in his office', 'he beat me at the party', 'he beat me in the morning', 'he beat me at the weekend',
    'he beat me in a rage', 'he beat me in the middle of the street', 'she beat me in the changing rooms', 'my husband beat me on our wedding night',
    'he beat me in the woods', 'they beat me in the lift', 'my dad beats me at the slightest thing', 'my mum beats me at least once a week',
    'my dad beats me in his temper', 'he beat me to tears', 'he beat me on and off for years', 'my stepdad beat me again at the weekend',
    'he beat me twice in one night', 'she beats me on a daily basis', 'my dad beat me on purpose', 'he beat me on the spot'],
  // blocking: the fear of it (care/unsafe on 931fbb0)
  beatFear: ["i'm scared he'll beat me on the way home", "i'm scared she'll beat me on the stairs", "i'm terrified he will beat me on sight"],
  // blocking: whoever beats (missed on both trees)
  beatWho: ['my uncle beat me with a belt', 'my uncle beat me', 'my uncle beat me in the kitchen', 'my grandad beat me', 'the older boys beat me',
    'the older boys beat me in the toilets'],
  // blocking: a danger that only looks negated (crisis on 931fbb0)
  dangerTurned: ['he says no kids are in danger but my little brother is', 'no one is in danger but my mum and dad are', 'nobody is in danger, only me',
    'nobody is in danger, just me', 'no one is in danger, well except me', "no one is in danger yet but he's coming back with a knife",
    "nobody is in danger right now but he said he'll kill us when he gets home", "nobody's in danger unless he comes back",
    "no one is in danger but my mum's boyfriend hits her", 'no one is in danger, he said, but my sister is', 'no one is in danger if i stay quiet',
    "no one's in danger, my mum is", 'no one is in danger. my mum is.', "nobody is in danger, but my dad's friend is"],
  // blocking: all / both between (missed on both trees)
  dangerAll: ["no one in my house is safe, we're all in danger", "we're all in danger", 'we are all in danger', 'my family is all in danger'],
  // blocking: a private part (missed on both trees)
  touchPart: ['my uncle touched my private parts', 'he touched my privates', 'my stepdad touches my private parts', 'he touched my boobs',
    'he touched my vagina', 'he touched my penis', 'he grabbed my breasts', 'he put his hand down my pants', 'he put his hand up my skirt',
    'he touched me down below'],
  // blocking: not breathing (missed on both trees; main screen concern/loss for the last relative)
  breath: ['shes not breathing', 'hes not breathing', 'theyre not breathing', "dad isn't breathing", "mum's not breathing", 'mom is not breathing',
    "grandma isn't breathing", "nan's not breathing", 'dad stopped breathing call an ambulance', "my granny isn't breathing",
    "the old man on the floor isn't breathing", "she collapsed and isn't breathing", 'my friend is unconscious and not breathing',
    'my baby is blue and not breathing', "he's barely breathing"],
  // polish, fixed: races, not blows (care/violence on 931fbb0)
  races: ['he beat me to the bus stop', 'she beat me to the car', 'my brother beat me to the bathroom', 'he beat me to school', 'she beat me to work',
    'my sister beat me to bed', 'he beat me home'],
  // polish, fixed: purely negated (crisis on 931fbb0)
  dangerCalm: ["no one's life is in danger", "nobody's job is in danger", 'no one is in danger, but it was scary', "nobody's in danger but it is scary"],
  // polish, left: a 'but' and another subject with 'is' is exactly how the danger above is told ("but my dad's friend is"),
  // so these still read; a false alarm is the small cost
  dangerLeft: ['nobody is in danger but my dog is sick', 'nobody is in danger but my mum is worried'],
  // polish, fixed: a child or a sibling touching as children do, and a doctor at work (none on 931fbb0, care on the first pass;
  // the doctor was care on 931fbb0 too)
  touchPlay: ['my nephew keeps touching me with sticky hands', 'my sister keeps touching me in the car', 'the baby keeps touching me',
    'my little brother won\'t stop touching me on the arm', 'the doctor touched me on my chest to check my heartbeat'],
  // polish, fixed: idioms after 'breathing' (none on 931fbb0, crisis on the first pass)
  breathIdiom: ["he's not breathing a single word", "she's not breathing easy until the results come", "he isn't breathing easy",
    "my brother's not breathing on my food anymore"],
  // polish, noted: a stranger groping now reads as abuse (the abuse helpline first), still care
  groped: ['a man on the train groped me without asking', "someone groped me where I didn't want"],
};

test('lexicon gaps r3: every sentence of the verifier\'s report reads as it should', () => {
  const is = (t, level, category) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], [level, category], `${t} → ${show(r)}`); };
  assert.deepEqual(Object.values(R3).map((l) => l.length), [29, 3, 6, 14, 4, 10, 15, 7, 4, 2, 5, 4, 2]);
  for (const t of [...R3.beatBlow, ...R3.beatWho]) is(t, 'care', 'violence');
  for (const t of R3.beatFear) is(t, 'care', 'unsafe');
  for (const t of [...R3.dangerTurned, ...R3.dangerAll, ...R3.dangerLeft, ...R3.breath]) is(t, 'crisis', 'someone-in-danger');
  for (const t of [...R3.touchPart, ...R3.groped]) is(t, 'care', 'abuse');
  for (const t of [...R3.races, ...R3.dangerCalm, ...R3.touchPlay]) for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
  for (const t of R3.breathIdiom) {
    assert.equal(plain(t).level, 'none', `${t} → ${show(plain(t))}`);
    assert.ok(['none', 'concern'].includes(main(t).level), `${t} → ${show(main(t))}`);
  }
});

test("lexicon gaps r3: 'beat me' is a blow unless a game, a contest or a race is named", () => {
  const violence = (t) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], ['care', 'violence'], `${t} → ${show(r)}`); };
  const none = (t) => { for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`); };
  // the harm itself after 'to', and the places and times a game word can name
  for (const t of ['he beat me to a pulp', 'he beat me to death nearly', 'he beat me to the point i passed out', 'he beat me to the ground',
    'he beat me within an inch of my life', 'he beat me in the pool', 'he beat me at the football', 'he beat me at football practice',
    'he beat me in the heat of the moment', 'he beat me 2-3 times a week', 'he beat me with a golf club', 'he beat me with a belt last time',
    'he beat me in the face and left marks', 'he beat me, missing my eye by inches', 'he beat me at the match', 'he beat me at night',
    'he beat me in front of everyone at the final', 'my dad beats me every time we argue', 'he beats me if i lose at chess',
    // whoever does it, and with what
    "my mum's boyfriend beat me", 'a man beat me in the park', 'the kids at school beat me', 'some lads beat me', 'he used to beat me',
    'he would beat me if i talked back', 'beat me with his fists', 'my little brother beat me']) violence(t);
  // the evidence of a game: at / in + a game or a contest, a race to somewhere, home, on points, by so much, fair and square, a score
  for (const t of ['he beat me at cards', 'she beat me at pool', 'he beat me at darts', 'he beat me at football', 'he beat me in the quiz',
    'she beat me in the exam results', 'he beat me at scrabble', 'she beat me at monopoly', 'he beat me at arm wrestling', 'she beat me at a game of chess',
    'he beat me in a race', 'she beat me at rock paper scissors', 'he beat me to the punch', 'he beat me on the leaderboard', 'she beat me on aggregate',
    'he beat me by two goals', 'she beat me by 3 points', 'he beat me 6-2', 'she beat me 3-1 in the final', 'he beat me hands down', 'she beat me with ease',
    'he beats me every time we play', 'she beat me in straight sets', 'he beat me in the semi-final', 'my friend beat me in the 100m',
    'he beat me in the first round', 'she beat me with a perfect score', 'he beat me by miles', 'she beat me in the spelling bee',
    'he beat me in the egg and spoon race', 'my brother beat me at video games', 'she beat me there by 10 minutes', 'he beat me back home',
    'my brother beat me with a last-minute goal', 'she beat me in maths', 'he beat me in the polls',
    // and what never named a person: 'beats me', a level, the computer
    'it beats me why he did that', 'beats me', 'this level beat me again', 'the computer beat me at chess']) none(t);
});

test('lexicon gaps r3: a negated danger is blanked only when nothing after it turns the meaning', () => {
  const crisis = (t) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], ['crisis', 'someone-in-danger'], `${t} → ${show(r)}`); };
  const none = (t) => { for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`); };
  for (const t of ['nobody is in danger, I am', "no one is in danger, I'm the one who is", 'nobody is in danger though', 'nobody is in danger until he gets home',
    'nobody is in danger anymore, he left but he is coming back', 'nobody is in danger, he is here with a knife', 'nobody is in danger now',
    'no one is in danger apart from my mum', 'my kids are both in danger', 'they are all in danger']) crisis(t);
  // purely negated, or followed by something calm (a calm subject, 'it', 'that', 'nobody'; 'just' / 'only' not before a person)
  for (const t of ['nobody is in danger, everyone is fine', "no one is in danger, we're all safe", "no one is in danger, it's over",
    'no one is in danger, the kids are asleep', "no one's in danger, i'm just stressed", 'nobody is in danger, I just wanted to talk',
    "nobody is in danger, let's talk", 'there was a fire but nobody is in danger', "nobody's life is in danger, it's fine",
    'nobody is in danger, my sister is safe', 'no one is actually in danger right now']) none(t);
});

test('lexicon gaps r3: a private part, a hand inside the clothes; a child at play, a baby at the breast, the speaker', () => {
  const abuse = (t) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], ['care', 'abuse'], `${t} → ${show(r)}`); };
  const none = (t) => { for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`); };
  for (const t of ['she touched my bum', 'he groped my breasts on the bus', 'my coach rubbed my thigh', 'he put his hand on my thigh',
    'he put his hands inside my knickers', 'he fondled my breasts', 'you touched my privates', 'my cousin touched my privates',
    // 'keeps touching me': an uncle, a cousin, a step-brother still read; a brother or a sister when something says it is unwanted
    'my uncle keeps touching me', 'my cousin keeps touching me', 'my step-brother keeps touching me', 'my brother keeps touching me there',
    'my brother keeps touching me at night', "my brother keeps touching me when we're alone", 'my sister keeps touching me, I hate it',
    'my brother keeps touching me and I hate it']) abuse(t);
  for (const t of ['she touched my bottom lip with her finger', 'I touched my toes', 'he touched my hand', 'my jeans rub my thighs',
    'my shorts rub my inner thighs', 'my seatbelt rubbed my boobs', 'the baby keeps grabbing my boobs', 'my toddler touched my bum',
    'I touched my vagina and it hurt', 'the baby keeps touching me and I love it', 'the toddler keeps touching me with her sticky fingers',
    'my brother keeps touching me', 'he put his hand on my shoulder', 'she put her hand in my pocket']) none(t);
});

test('lexicon gaps r3: not breathing, as phones spell it and people say it; never an idiom or a pet', () => {
  const crisis = (t) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], ['crisis', 'someone-in-danger'], `${t} → ${show(r)}`); };
  for (const t of ['its not breathing', 'hes stopped breathing', 'my 2 year old is not breathing', "my baby isn't breathing on my chest",
    'she fell, hit her head and is not breathing', "she's not breathing on her own", 'my nan is unconscious and barely breathing',
    'my husband just collapsed and isnt breathing', 'hes barely breathing', "she's not breathing yet"]) crisis(t);
  for (const t of ["it's not breathing room, it's a cell", "he's not breathing heavily", 'my cat is not breathing', "i'm dizzy and not breathing right",
    "she said I'm stressed and not breathing properly", "my mum isn't breathing down my neck any more"]) {
    assert.equal(plain(t).level, 'none', `${t} → ${show(plain(t))}`);
    assert.ok(['none', 'concern'].includes(main(t).level), `${t} → ${show(main(t))}`);
  }
  // a death told in the past keeps the loss path
  for (const t of ['mum wasnt breathing when i found her', 'my grandad stopped breathing last night and died']) {
    assert.equal(plain(t).level, 'none', t);
    assert.deepEqual([main(t).level, main(t).category], ['concern', 'loss'], t);
  }
});

// ----------------------------------------------------------------------------------------- the rules --
test('lexicon gaps: the rules stay plain data, without lookbehind, copied to the server, and cheap on 2,000 characters', () => {
  const app = readFileSync(new URL('../src/data/safety-lexicon.js', import.meta.url));
  const server = readFileSync(new URL('../server/another-angle/src/safety/shared-lexicon.js', import.meta.url));
  assert.ok(app.equals(server), 'npm run sync:lexicon in server/another-angle');
  // every list (round 3: the crisis, concern and harm-others lists too), and each one compiles
  const all = [...HARM_LEXICON.idiomGuards, ...HARM_LEXICON.crisis, ...HARM_LEXICON.crisisOther, ...Object.values(HARM_LEXICON.care).flat(),
    ...CONCERN_LEXICON, ...HARM_OTHERS_LEXICON];
  assert.ok(all.length > 200);
  for (const src of all) { assert.doesNotMatch(src, /\(\?<[=!]/, src); assert.doesNotThrow(() => new RegExp(src, 'i')); }
  assert.doesNotMatch(app.toString(), /\(\?<[=!]/);
  // input built to make the new rules work hard (near misses of each), compared with the first pass measured alongside, as
  // tests/safety-scope-round4.test.mjs does
  const median = (xs) => xs.sort((a, b) => a - b)[xs.length >> 1];
  for (const seed of ['no members of my family at home i know are ', 'none of the people at the party in the house ', 'my best friend next to the man is not breat ',
    'he beat me at at in on to the ', 'he beat me in the by two at ', 'touched me under my touched me there and ', 'nobody of my family in the house is in danger except ',
    "she's not breathing she's still not ", 'keeps touching me keeps touching me on the ', 'made me touch her made me touch his ',
    // round 3: the rest of the message read after each negated danger, the game evidence, the subject left out, the people who beat
    'nobody is in danger, ', "no one's life is in danger and ", 'she collapsed and he fell and ', 'the old man on the floor next to the ',
    'hes shes theyre its mums ', 'he beat me with a with the perfect better ', 'the older boys at school beat me in ', "my mum's boyfriend's friend's ",
    'touched my touched my private ', 'he put his hand down my ', 'the baby keeps touching me and ', 'beat me by two by a by ']) {
    const t = seed.repeat(Math.ceil(2000 / seed.length)).slice(0, 2000);
    checkText(t); checkTextFirstPass(t);
    const full = [], base = [];
    for (let i = 0; i < 9; i++) {
      let t0 = performance.now();
      checkText(t);
      full.push(performance.now() - t0);
      t0 = performance.now();
      checkTextFirstPass(t);
      base.push(performance.now() - t0);
    }
    const ms = median(full);
    assert.ok(ms < 80 && median(base) < 40, `${seed.trim()}: ${ms.toFixed(1)} ms (first pass ${median(base).toFixed(1)} ms)`);
  }
});
