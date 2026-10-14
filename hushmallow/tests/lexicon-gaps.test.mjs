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
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText, checkTextFirstPass } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import { HARM_LEXICON } from '../src/data/safety-lexicon.js';

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
  'nobody in my family is in danger right now',
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
  // 'but my mum thinks so' says nobody is; 'but my mum' says she is
  assert.equal(plain('nobody is in danger but my mum thinks so').level, 'none');
  assert.equal(plain('nobody is in danger but my mum').level, 'crisis');
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
  for (const t of ['she beat me in the final', 'he beat me to it', 'he beat me on points']) none(t);
  for (const t of ['he beat me up', 'he beat me with a stick']) care(t, 'violence');
  for (const t of ['nobody is in danger', "we're not in danger any more", 'none of us are in danger', 'no-one is in danger']) none(t);
  for (const t of ["no one knows I'm in danger", "nobody believes I'm in danger", 'no one can help, my sister is in danger']) crisis(t);
});

// ----------------------------------------------------------------------------------------- the rules --
test('lexicon gaps: the rules stay plain data, without lookbehind, copied to the server, and cheap on 2,000 characters', () => {
  const app = readFileSync(new URL('../src/data/safety-lexicon.js', import.meta.url));
  const server = readFileSync(new URL('../server/another-angle/src/safety/shared-lexicon.js', import.meta.url));
  assert.ok(app.equals(server), 'npm run sync:lexicon in server/another-angle');
  const all = [...HARM_LEXICON.idiomGuards, ...HARM_LEXICON.crisisOther, ...Object.values(HARM_LEXICON.care).flat()];
  for (const src of all) assert.doesNotMatch(src, /\(\?<[=!]/, src);
  // input built to make the new rules work hard (near misses of each), compared with the first pass measured alongside, as
  // tests/safety-scope-round4.test.mjs does
  const median = (xs) => xs.sort((a, b) => a - b)[xs.length >> 1];
  for (const seed of ['no members of my family at home i know are ', 'none of the people at the party in the house ', 'my best friend next to the man is not breat ',
    'he beat me at at in on to the ', 'he beat me in the by two at ', 'touched me under my touched me there and ', 'nobody of my family in the house is in danger except ',
    "she's not breathing she's still not ", 'keeps touching me keeps touching me on the ', 'made me touch her made me touch his ']) {
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
