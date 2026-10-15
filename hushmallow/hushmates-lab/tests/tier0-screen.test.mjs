// The Tier 0 self-assessment's fixes to the screen (docs/safety/TIER0_SELF_ASSESSMENT.md §4). Each is a bug
// in a rule's own intent, or a block on a catcher's words: none adds new crisis vocabulary, which waits for
// the clinical review's single batch (docs/CRISIS_DETECTION.md §3, step 5). These phrasings are held here,
// not in tests/fixtures/mallow-probes.json, so the blind review sheets keep their ids.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { screenFeeling, screenReframe } from '../core/feeling-safety.js';
import { HARM_LEXICON, HARM_COPY } from '../../src/ultra/frameworks.js';
import { checkSafety, tidyInput } from '../../src/ultra/reframe-engine.js';

const feeling = (text) => screenFeeling(text, { minChars: 3, maxChars: 500 });
const outcome = (r) => (r.ok ? 'release' : r.code === 'support' ? (r.support.title === 'Someone might be in danger' ? 'danger' : r.level) : r.code);
const lines = (r) => r.support.resources.map((x) => x.label);

test('Tier 0: the everyday blanking never hides "I don’t want to live at all", "…with this any more" or "…at this point"', () => {
  for (const t of ['I don’t want to live at this point', 'I don’t want to live at all', 'I don’t want to live with this anymore',
    'I don’t want to be here for another day', 'I don’t want to live with what I did', 'I don’t want to live in my own skin anymore',
    'I don’t want to live with these thoughts', 'I don’t want to live with depression anymore']) assert.equal(outcome(feeling(t)), 'crisis', t);
  // the everyday ones it was written for are still released
  for (const t of ['I don’t wanna live with my mum anymore, we fight all the time', 'I don’t want to live in this city anymore.',
    'I don’t wanna live in Melbourne anymore.', 'I no longer want to live with my parents.', 'I don’t want to be here at work today.']) assert.equal(outcome(feeling(t)), 'release', t);
});

test('Tier 0: "He’s not breathing" gets the someone-in-danger screen, however it is contracted', () => {
  for (const t of ['He’s not breathing', 'She’s not breathing', 'My friend’s not breathing', 'She isn’t breathing', 'He is not breathing', 'My dad has stopped breathing']) assert.equal(outcome(feeling(t)), 'danger', t);
  assert.equal(outcome(feeling('I can’t stop breathing so fast when I panic')), 'release');
  assert.equal(outcome(feeling('Our old cat, she’s not breathing properly and the vet’s closed')), 'release');
});

test('Tier 0: double spaces, line breaks, accents, invisible marks and look-alike letters read like the plain words', () => {
  for (const t of ['I wanna  die', 'I wanna\ndie', 'I am  a burden', 'I want to hang  myself', 'k͏ill myself', 'kill️ myself', 'k\u{E0020}ill myself',
    'I want to kíll myself', 'I want to k̶i̶l̶l̶ myself', 'kㅤill myself', 'I want to kіll myself', 'I want to kill mysеlf', 'I’m ѕuicidal']) assert.equal(outcome(feeling(t)), 'crisis', JSON.stringify(t));
  assert.equal(outcome(feeling('Café  closed early\nso I went home')), 'release');
});

test('Tier 0: crisis words are answered with support even when the feeling is too long', () => {
  const r = feeling(`I want to kill myself. ${'and everything is too much '.repeat(25)}`);
  assert.equal(outcome(r), 'crisis');
  assert.equal(feeling('a'.repeat(501)).code, 'too-long');
  assert.equal(screenReframe(`You could just kill yourself. ${'x'.repeat(300)}`).code, 'unkind');
});

test('Tier 0: threats, fear of going home and stalking show 1800RESPECT', () => {
  for (const t of ['He says he will kill me', 'I am afraid to go home', 'He stalks me']) {
    const r = feeling(t);
    assert.equal(r.code, 'support', t);
    assert.ok(lines(r).includes('1800RESPECT'), `${t}: ${lines(r).join(', ')}`);
  }
});

test('Tier 0: words telling a reader to hurt themselves never reach catchers; quoted, they are answered as harassment', () => {
  assert.equal(feeling('kys whoever catches this').code, 'unkind');
  assert.equal(feeling('Whoever reads this, you are pathetic and should kill yourself').code, 'unkind');
  const quoted = feeling('Someone at school messaged me telling me to kys');
  assert.equal(quoted.code, 'support');
  assert.equal(quoted.level, 'care');
});

test('Tier 0: a perspective that incites, advises harm or asks personal questions never reaches the writer; naming a helpline does', () => {
  for (const t of ['Go hang yourself', 'k y s', 'kill urself', 'You should just die', 'No one would miss you', 'The world would be better without you', 'Everyone hates you'])
    assert.equal(screenReframe(t).code, 'unkind', t);
  for (const t of ['Try skipping dinner, you’ll feel lighter', 'Stop taking your antidepressants, they’re poison', 'Drink until you forget',
    'How old are you? We should meet up', 'Send me a pic', 'Maybe he hits you because you provoke him', 'You are so fat'])
    assert.equal(screenReframe(t).code, 'unsafe', t);
  for (const t of ['You could call 1800RESPECT on 1800 737 732, any time.', 'Lifeline is there on 13 11 14 whenever you need it.',
    'Maybe a rest would help you feel lighter tomorrow.', 'It sounds like you’ve been carrying this weight for a long time.'])
    assert.equal(screenReframe(t).ok, true, t);
  assert.equal(screenReframe('Could you ring 0412 345 678 instead?').code, 'contact');
  assert.equal(feeling('I called 13 11 14 last night and it helped').ok, true);
});

test('Tier 0: an Australian postcode with its context is refused as identifying', () => {
  assert.equal(feeling('I live in Fitzroy VIC 3065 and I feel so lonely lately').code, 'identifying');
  assert.equal(feeling('My postcode is 3065 and nobody here talks to me').code, 'identifying');
  assert.equal(feeling('I ran 5000 steps today and felt good').ok, true);
});

// The shared lexicon belongs to the main app (Reframe). Hushmates relies on it, so a change there must be
// reviewed by Hushmates' safety lead before it ships here: update this hash only after that review.
test('Tier 0: the shared safety lexicon is the one Hushmates reviewed', () => {
  const pinned = createHash('sha256').update(JSON.stringify({
    lexicon: HARM_LEXICON, stillHere: HARM_COPY.stillHere, checkSafety: checkSafety.toString(), tidyInput: tidyInput.toString(),
  })).digest('hex');
  assert.equal(pinned, PINNED_LEXICON, 'src/ultra changed the safety lexicon: Hushmates’ safety lead reviews it first (docs/CRISIS_DETECTION.md §3.5)');
});
const PINNED_LEXICON = '9373e702ac23d1b2abc132cb9591a71d0c71a4502adb466679b27a69894b9752';
