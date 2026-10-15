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
//   3. 'beat me', whoever does it ('my uncle', 'the older boys', 'dad', 'my step dad'), is violence; 'beat me up', 'beat me with
//      a belt', 'beat me in the face' are. (Round 4: a game reads too, 'beat me at chess', as it did on 931fbb0.)
//   4. a danger with 'all' or 'both' between ("we're all in danger") is crisis. (Round 4: a negated danger, 'nobody is in
//      danger', reads as crisis, as it did on 931fbb0.)
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
// Round 4 (both independent verifiers failed rounds 1-3, /tmp/claude-0/hf/verify-lex.json and verify-lex2.json, because the
// parts that took flags away kept losing real disclosures): the change is STRICTLY ADDITIVE against 931fbb0. Every rule the
// lexicon had is kept verbatim and in its place, the idiom guards are the ones it had (pinned below), and the new rules only
// add readings, so no sentence 931fbb0 read as care or crisis reads lower, plain or lossAware. What was taken away is back:
// 'beat me' reads whatever follows (no game list), the negated danger is not blanked (no 'nobody … in danger' guard, no TURN),
// 'the doctor touched me on my chest to check my heartbeat' is care again. Games ('beat me at chess') and a purely negated
// danger ('nobody is in danger') are pinned below as STILL FLAGGED: known false alarms, on the safe side. A new rule leaves out
// what it should (a small child at play, a pet, a doctor's check, an idiom after 'breathing') inside itself, never by
// blanking text. tools/beyond/lexicon-diff.mjs is the gate: every string in the tests and every sentence in both reports, read
// on both trees, LOST 0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
// (round 4) the games: still flagged, as on 931fbb0 (known false alarms, the safe side)
const BEAT_GAMES = [
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

test("lexicon gaps 3: 'beat me' is violence, a blow or a game (round 4: the games still flagged, as on 931fbb0)", () => {
  assert.equal(BEAT_POS.length, 15);
  assert.equal(BEAT_GAMES.length, 15);
  for (const t of [...BEAT_POS, ...BEAT_GAMES]) for (const r of both(t)) assert.deepEqual([r.level, r.category], ['care', 'violence'], `${t} → ${show(r)}`);
  // the fear of it, or a blow to come, is unsafe ("scared he'll beat me", 'he will beat me if I tell'); the new rules for it
  // leave a game out (NOT_A_GAME: "afraid he'll beat me at chess" stays none, as tests/safety-qa.probes.mjs pins it), and what
  // 931fbb0's rule read still reads ("scared she'll beat me on points")
  for (const t of ["I'm scared he'll beat me in the face", "I'm scared she'll beat me on points", 'he will beat me if i tell',
    "my dad's going to beat me when he gets home", "I'm scared the older boys will beat me"]) {
    for (const r of both(t)) assert.deepEqual([r.level, r.category], ['care', 'unsafe'], `${t} → ${show(r)}`);
  }
  for (const t of ["I'm afraid he'll beat me at chess", 'she is going to beat me at tennis']) for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
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
// (round 4) a negated danger: still flagged, as on 931fbb0 (known false alarms, the safe side)
const DANGER_NEGATED = [
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

test('lexicon gaps 4: a danger is crisis, negated or not (round 4: nothing blanks a negated danger, as on 931fbb0)', () => {
  assert.equal(DANGER_POS.length, 15);
  assert.equal(DANGER_NEGATED.length, 15);
  // (931fbb0's own negation scope reads three as none, with an adverb before 'in danger' or 'not' itself: they stay none)
  const scoped = ['no-one is really in danger', "we're not in danger any more", 'none of my friends are actually in danger'];
  for (const t of [...DANGER_POS, ...DANGER_NEGATED.filter((x) => !scoped.includes(x)), 'nobody is in danger but my mum',
    'nobody is in danger but my mum thinks so', 'nobody in my family is in danger right now']) {
    for (const r of both(t)) assert.deepEqual([r.level, r.category], ['crisis', 'someone-in-danger'], `${t} → ${show(r)}`);
  }
  for (const t of scoped) for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
});

// --------------------------------------------------------------------------------- the measured ones --
test('lexicon gaps: the measured sentences, verbatim (and the one left alone)', () => {
  const want = [
    ['he touched me inappropriately', 'care', 'abuse'],
    ["she's not breathing", 'crisis', 'someone-in-danger'],
    // (round 4: still flagged, as on 931fbb0)
    ['my brother beat me at chess again', 'care', 'violence'],
    ['he beat me at fifa', 'care', 'violence'],
    ['no members of my family are actually in danger', 'crisis', 'someone-in-danger'],
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
  // (round 4: the games still flagged, as on 931fbb0)
  for (const t of ['she beat me in the final', 'he beat me to it', 'he beat me on points', 'he beat me at chess']) care(t, 'violence');
  for (const t of ['he beat me up', 'he beat me with a stick']) care(t, 'violence');
  // (round 4: a negated danger still flagged, as on 931fbb0; 'not in danger any more' never read)
  for (const t of ['nobody is in danger', 'none of us are in danger', 'no-one is in danger']) crisis(t);
  none("we're not in danger any more");
  for (const t of ["no one knows I'm in danger", "nobody believes I'm in danger", 'no one can help, my sister is in danger']) crisis(t);
});

// ------------------------------------------------------------------------------- round 3: the verifier --
// Every sentence in the independent verifier's report on the first pass (verify-lex.json), verbatim: the blocking ones read
// again (each was care or crisis on 931fbb0, or a disclosure missed on both trees). (Round 4) Of the false alarms it listed,
// those 931fbb0 read (the races, the calm negated dangers, the doctor) read as they did, still flagged; the new rules' own
// false alarms (a child at play, an idiom after 'breathing') are none.
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
  // polish: races (care/violence on 931fbb0; round 4: still flagged, the safe side)
  races: ['he beat me to the bus stop', 'she beat me to the car', 'my brother beat me to the bathroom', 'he beat me to school', 'she beat me to work',
    'my sister beat me to bed', 'he beat me home'],
  // polish: purely negated (crisis on 931fbb0; round 4: still flagged, the safe side)
  dangerCalm: ["no one's life is in danger", "nobody's job is in danger", 'no one is in danger, but it was scary', "nobody's in danger but it is scary"],
  // polish, left: a 'but' and another subject with 'is' is exactly how the danger above is told ("but my dad's friend is"),
  // so these still read; a false alarm is the small cost
  dangerLeft: ['nobody is in danger but my dog is sick', 'nobody is in danger but my mum is worried'],
  // polish, fixed: a child or a sibling touching as children do (none on 931fbb0, care on the first pass)
  touchPlay: ['my nephew keeps touching me with sticky hands', 'my sister keeps touching me in the car', 'the baby keeps touching me',
    'my little brother won\'t stop touching me on the arm'],
  // polish: a doctor at work (care on 931fbb0; round 4: still flagged, the safe side)
  doctor: ['the doctor touched me on my chest to check my heartbeat'],
  // polish, fixed: idioms after 'breathing' (none on 931fbb0, crisis on the first pass)
  breathIdiom: ["he's not breathing a single word", "she's not breathing easy until the results come", "he isn't breathing easy",
    "my brother's not breathing on my food anymore"],
  // polish, noted: a stranger groping now reads as abuse (the abuse helpline first), still care
  groped: ['a man on the train groped me without asking', "someone groped me where I didn't want"],
};

test('lexicon gaps r3: every sentence of the verifier\'s report reads as it should', () => {
  const is = (t, level, category) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], [level, category], `${t} → ${show(r)}`); };
  assert.deepEqual(Object.values(R3).map((l) => l.length), [29, 3, 6, 14, 4, 10, 15, 7, 4, 2, 4, 1, 4, 2]);
  for (const t of [...R3.beatBlow, ...R3.beatWho, ...R3.races]) is(t, 'care', 'violence');
  for (const t of R3.beatFear) is(t, 'care', 'unsafe');
  for (const t of [...R3.dangerTurned, ...R3.dangerAll, ...R3.dangerLeft, ...R3.dangerCalm, ...R3.breath]) is(t, 'crisis', 'someone-in-danger');
  for (const t of [...R3.touchPart, ...R3.groped, ...R3.doctor]) is(t, 'care', 'abuse');
  for (const t of R3.touchPlay) for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
  for (const t of R3.breathIdiom) {
    assert.equal(plain(t).level, 'none', `${t} → ${show(plain(t))}`);
    assert.ok(['none', 'concern'].includes(main(t).level), `${t} → ${show(main(t))}`);
  }
});

test("lexicon gaps r3: 'beat me' is a blow, and (round 4) a game, a contest or a race reads too, as on 931fbb0", () => {
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
  // a game, a contest or a race (at / in + a game, to somewhere, home, on points, by so much, fair and square, a score): still
  // flagged, the known false alarms on the safe side (round 3 read them as none and lost real blows with them)
  for (const t of ['he beat me at cards', 'she beat me at pool', 'he beat me at darts', 'he beat me at football', 'he beat me in the quiz',
    'she beat me in the exam results', 'he beat me at scrabble', 'she beat me at monopoly', 'he beat me at arm wrestling', 'she beat me at a game of chess',
    'he beat me in a race', 'she beat me at rock paper scissors', 'he beat me to the punch', 'he beat me on the leaderboard', 'she beat me on aggregate',
    'he beat me by two goals', 'she beat me by 3 points', 'he beat me 6-2', 'she beat me 3-1 in the final', 'he beat me hands down', 'she beat me with ease',
    'he beats me every time we play', 'she beat me in straight sets', 'he beat me in the semi-final', 'my friend beat me in the 100m',
    'he beat me in the first round', 'she beat me with a perfect score', 'he beat me by miles', 'she beat me in the spelling bee',
    'he beat me in the egg and spoon race', 'my brother beat me at video games', 'she beat me there by 10 minutes', 'he beat me back home',
    'my brother beat me with a last-minute goal', 'she beat me in maths', 'he beat me in the polls']) violence(t);
  // and what never named a person: 'beats me', a level, the computer
  for (const t of ['it beats me why he did that', 'beats me', 'this level beat me again', 'the computer beat me at chess']) none(t);
});

test('lexicon gaps r3: a danger reads, negated or not (round 4: nothing blanks it, as on 931fbb0)', () => {
  const crisis = (t) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], ['crisis', 'someone-in-danger'], `${t} → ${show(r)}`); };
  const none = (t) => { for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`); };
  for (const t of ['nobody is in danger, I am', "no one is in danger, I'm the one who is", 'nobody is in danger though', 'nobody is in danger until he gets home',
    'nobody is in danger anymore, he left but he is coming back', 'nobody is in danger, he is here with a knife', 'nobody is in danger now',
    'no one is in danger apart from my mum', 'my kids are both in danger', 'they are all in danger']) crisis(t);
  // purely negated, or followed by something calm: still flagged, the known false alarms on the safe side (round 3 blanked them
  // and lost real dangers with them)
  for (const t of ['nobody is in danger, everyone is fine', "no one is in danger, we're all safe", "no one is in danger, it's over",
    'no one is in danger, the kids are asleep', "no one's in danger, i'm just stressed", 'nobody is in danger, I just wanted to talk',
    "nobody is in danger, let's talk", 'there was a fire but nobody is in danger', "nobody's life is in danger, it's fine",
    'nobody is in danger, my sister is safe']) crisis(t);
  // (what 931fbb0's own negation scope reads as none stays none)
  none('no one is actually in danger right now');
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

// ------------------------------------------------------------------------- round 4: the second report --
// Every sentence in the second verifier's report (verify-lex2.json), verbatim. Blocking: what rounds 1-3 lost (care or crisis
// on 931fbb0) reads again, and what both trees missed reads now. Polish: the games and the negated dangers read as 931fbb0 read
// them (still flagged, the safe side); of the new rules' own false alarms, a pet and an idiom after 'breathing' are left out,
// the rest read (nothing in the words tells them apart: the small cost).
const R4 = {
  // blocking 1-3: 'beat me' that rounds 1-3 read as a game or a race, after 'when i play', 'back home', 'with a goal post'
  // (care/violence on 931fbb0, and 'used to beat me back home' missed on it)
  beatLost: ['my dad beats me when i play music too loud', 'my dad beats me whenever i play outside',
    'my mum beats me if i play on my phone', 'he beats me every time i play video games instead of homework',
    'my dad beats me when i compete and lose', 'my dad beat me again when i played my music',
    'my dad beat me back home before we came here', 'my father used to beat me back home in syria', 'he beat me back home',
    'he beat me home and then hit me', 'my brother beat me with a goal post', 'my dad beat me in the door frame',
    'he beat me in my exam week', 'he beat me at exam time', 'he beat me in boxing gloves', 'my dad beat me at the last match'],
  // blocking 1: the fear of it (care/unsafe on 931fbb0)
  beatFear: ["i'm scared my dad will beat me if i play badly"],
  // blocking 4: a danger that only looks negated (crisis on 931fbb0)
  dangerLost: ["no one's in danger as long as i do what he says", 'nobody is in danger, he only hits me',
    'nobody is in danger as long as i stay in my room', "no one's in danger, so long as i keep quiet",
    "no one is in danger provided he doesn't drink", 'no one is in danger while he sleeps',
    'nobody is in danger, he only threatened us', 'no one is in danger, my dad has a knife',
    'no one is in danger, he has a gun', 'no one is in danger, he hit her again', 'no one is in danger, he hit my mum',
    'nobody is in danger. he said he would kill us', 'no one is in danger. we have to hide from him',
    "no one is in danger at school, it's at home", "nobody's in danger at school. it's at home that it happens",
    'no one is in danger, my dad was drinking and threw a chair', 'none of us are in danger, he was only joking about the gun',
    'no one is in danger, he went to get his gun', "no one's in danger, he locked us in",
    'nobody is in danger, he took my sister', 'no one is in danger, she took all her pills', 'no one is in danger, i think',
    'no one is in danger, he says', "no one is in danger, he promised he wouldn't do it again"],
  // blocking 4: 'is hurting us' (missed on both trees)
  hurtingUs: ['i told the teacher no one was in danger but my dad is hurting us'],
  // blocking 5: not breathing, a contracted subject left out after 'and', more of the family and of the people around, two
  // places (missed on both trees)
  breath: ["he's collapsed and isn't breathing", "she's unconscious and not breathing", "he's on the floor and not breathing",
    "my mum's collapsed and isn't breathing", "she's turning blue and not breathing", 'hes passed out and not breathing',
    "nanny's not breathing please help", "aunty isn't breathing", 'my twin isnt breathing', "uncle isn't breathing",
    "auntie's not breathing", "nanny isn't breathing", 'bro isnt breathing', 'sis is not breathing',
    "my nanny's not breathing", "my aunty isn't breathing", "my grandson isn't breathing", 'my granddaughter is not breathing',
    "my teammate isn't breathing", "my neighbour isn't breathing", "my patient isn't breathing",
    "the man next to me on the train isn't breathing", 'the man next to me on the bus is not breathing'],
  // blocking 5: someone else who can't breathe, a baby or beside an emergency (concern on both trees)
  cantBreathe: ["my baby can't breathe", "he can't breathe and his lips are blue", "my friend is choking and can't breathe"],
  // blocking 6: unwanted touching (missed on both trees)
  touch: ['he keeps grabbing my chest in the corridor', 'a man on the bus rubbed his hand on my thigh and i froze',
    'my uncle reaches under my nightie at night', 'my babysitter touches my front bottom', 'he touched my chest',
    'he grabbed my chest', 'he felt my bum', 'he felt my boobs', 'he was feeling my thigh', 'he pinched my bum',
    'he slapped my bum', 'he put his fingers in me', 'he put his fingers inside me', 'his hand went up my skirt',
    'he ran his hand up my leg', 'he slipped his hand into my knickers', 'he reached into my pants',
    'he put his hand down the back of my jeans', 'he touched under my top', 'he touched my lady bits',
    'he touched me where my pants go', 'my cousin made me touch his thing', 'he made me touch it',
    'my coach touches my leg in a weird way', 'he rubbed himself against me', 'he pressed himself against me on the bus',
    'he touched my body'],
  // blocking 7: the people who beat (missed on both trees)
  beatWho: ['my step dad beat me', 'my step mum beats me', 'my mums boyfriend beat me', 'dad beat me last night', 'mum beats me',
    'me dad beat me', 'grandpa beat me', 'they both beat me', 'a man beat me at a football match'],
  // polish 1-2: games, new with the people who beat (first list) or read on 931fbb0 (second): still flagged, the safe side
  games: ['my grandad beat me at dominoes', 'my little brother beat me at hide and seek', 'my nan beat me at bingo',
    'my uncle beat me at backgammon', 'my cousin beat me at mahjong', 'my friend beat me at the pub quiz',
    'my kids beat me at just dance', 'the kids beat me at musical chairs', 'my nephew beat me at pokemon',
    'my grandma beat me at rummikub', 'my daughter beat me at tetris', 'he beat me at among us',
    'she beat me on the first lap', 'my sister beat me at the arcade games', 'he beat me at the quiz night',
    'my brother beat me at go', 'my husband beat me at bananagrams', 'she beat me at the bake off',
    'he beat me in the chess club final', 'my brother beat me in our bet', 'she beat me to the punchline'],
  // polish 3: the new touching rules' false alarms: a pet is left out (none); the rest read, as nothing in the words tells
  // them apart (care, the small cost)
  touchPet: ['my cat keeps touching my bum with her paw', 'the kitten touched my boobs'],
  touchFlagged: ['the physio rubbed my thigh where the muscle was sore', 'the masseuse rubbed my thighs',
    "my son keeps grabbing my boobs, he's 1", 'the baby put her hand down my top', 'my toddler put his hand in my bra',
    'my nephew grabbed my bum to stand up', 'my boyfriend put his hand on my thigh at the cinema and it was sweet'],
  // polish 4: idioms after 'breathing' (none: BREATH_IDIOM)
  breathIdiom: ["she's not breathing on the window to draw pictures anymore", "he isn't breathing the smoke in",
    "my mum's not breathing in the fumes anymore"],
  // polish 5: negated dangers that 931fbb0 reads: still flagged, the safe side
  dangerCalm: ['no one is in danger, the dog is just barking', 'nobody is in danger, but my exam is tomorrow',
    'nobody is in danger, but i feel sad', 'no one is in danger, but i need to talk',
    "no one is in danger right now, i'm just anxious", 'no one is in danger now that the storm has passed',
    "no one is in danger, we're just arguing", 'nobody is in danger, my parents are just divorcing',
    "no one is in danger, but i'm stressed about exams", "nobody is in danger but i'm lonely",
    "no one's in danger, my cat is just ill", 'nobody is in danger, my phone is broken though',
    'nobody is in danger but my dog is sick', 'nobody is in danger but my mum is worried'],
};

test("lexicon gaps r4: every sentence of the second verifier's report reads as it should", () => {
  const is = (t, level, category) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], [level, category], `${t} → ${show(r)}`); };
  assert.deepEqual(Object.values(R4).map((l) => l.length), [16, 1, 24, 1, 23, 3, 27, 9, 21, 2, 7, 3, 14]);
  for (const t of [...R4.beatLost, ...R4.hurtingUs, ...R4.beatWho, ...R4.games]) is(t, 'care', 'violence');
  for (const t of R4.beatFear) is(t, 'care', 'unsafe');
  for (const t of [...R4.dangerLost, ...R4.breath, ...R4.cantBreathe, ...R4.dangerCalm]) is(t, 'crisis', 'someone-in-danger');
  for (const t of [...R4.touch, ...R4.touchFlagged]) is(t, 'care', 'abuse');
  for (const t of R4.touchPet) for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
  for (const t of R4.breathIdiom) {
    assert.equal(plain(t).level, 'none', `${t} → ${show(plain(t))}`);
    assert.ok(['none', 'concern'].includes(main(t).level), `${t} → ${show(main(t))}`);
  }
});

test('lexicon gaps r4: strictly additive: the idiom guards and the old rules are 931fbb0\'s, the new ones only add', () => {
  // the idiom guards blank text for every rule, so they are exactly 931fbb0's (19, in order; tools/beyond/lexicon-diff.mjs
  // checks every other rule is still there verbatim and in order, and that nothing 931fbb0 read as care or crisis reads lower)
  assert.equal(HARM_LEXICON.idiomGuards.length, 19);
  assert.match(createHash('sha256').update(JSON.stringify(HARM_LEXICON.idiomGuards)).digest('hex'), /^c0d1da179764faef/);
  const rules = (L) => [...L.crisis, ...L.crisisOther, ...Object.values(L.care).flat()];
  // (fix round, 15 Oct 2026) + 1: the detection fix added one care rule, additively (the threat still being made, care/threat)
  assert.equal(rules(HARM_LEXICON).length, 157 + 36 + 1, "931fbb0's 157 crisis, someone-in-danger and care rules, this pass's 36, and the detection fix's 1");
  assert.deepEqual([CONCERN_LEXICON.length, HARM_OTHERS_LEXICON.length], [46, 2], 'the concern and harm-others lists are untouched');
  // what rounds 1-3 took away reads again, on both readings: a game, a negated danger, the doctor's check, an idiom 931fbb0 read
  const is = (t, level, category) => { for (const r of both(t)) assert.deepEqual([r.level, r.category], [level, category], `${t} → ${show(r)}`); };
  for (const t of ['he beat me at chess', 'my brother beat me at fifa again', 'he beat me in the shower', 'he beat me back home',
    'my dad beats me when i play music too loud']) is(t, 'care', 'violence');
  for (const t of ['nobody is in danger', "nobody's in danger, the fire is out", 'no one is in danger, he has a gun']) is(t, 'crisis', 'someone-in-danger');
  is('the doctor touched me on my chest to check my heartbeat', 'care', 'abuse');
  is("I'm scared he'll beat me on the way home", 'care', 'unsafe');
  // the new rules' own exclusions stay inside them: a pet, a small child at play, a doctor's check, an idiom after 'breathing'
  for (const t of ['my cat keeps touching me with her paw', 'my little brother keeps touching me to annoy me', 'the baby keeps grabbing my boobs',
    'the doctor felt my chest', 'she rubbed my chest with vicks', 'the dog humped me', "my boss can kiss my ass", "i can't feel my body"]) {
    for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
  }
  // ...and a few more of each family the reports asked for
  for (const t of ['he put his hand in my pants', 'she touched my bum', 'he kissed my breasts', 'he hugs me in a creepy way', 'he keeps grinding on me',
    'my brother keeps touching me there']) is(t, 'care', 'abuse');
  for (const t of ['my step-dad beat me', "my mum's bf beats me", 'they keep kicking us', "he's choking me", 'my dad is beating me']) is(t, 'care', 'violence');
  for (const t of ['he will beat me if i tell', "my dad's going to beat me when he gets home", "I'm scared the older boys will beat me"]) is(t, 'care', 'unsafe');
  for (const t of ["someone's collapsed and isn't breathing", "the baby's not breathing", 'my baby is choking on a grape', "my dad can't breathe help",
    "we're both in danger"]) is(t, 'crisis', 'someone-in-danger');
  for (const t of ["she's choking up at the wedding", 'the song touched me in a strange way', "my uncle's cat keeps touching me"]) {
    for (const r of both(t)) assert.equal(r.level, 'none', `${t} → ${show(r)}`);
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
    'touched my touched my private ', 'he put his hand down my ', 'the baby keeps touching me and ', 'beat me by two by a by ',
    // round 4: the new rules' subjects and places (the word before a touch, the people who beat, two places, an emergency)
    'he was then just also touching my ', "my mums dads boyfriends step dad ", 'the man next to me on the bus at the ', "he can't breathe and his ",
    'my friend is choking and he is ', 'his hand went up my his hand went ', 'keeps touching me there keeps ', 'they both all beat ']) {
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
