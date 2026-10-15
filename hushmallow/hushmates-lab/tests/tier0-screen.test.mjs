// The Tier 0 self-assessment's fixes to the screen (docs/safety/TIER0_SELF_ASSESSMENT.md §4). Each is a bug
// in a rule's own intent, or a block on a catcher's words: none adds new crisis vocabulary, which waits for
// the clinical review's single batch (docs/CRISIS_DETECTION.md §3, step 5). These phrasings are held here,
// not in tests/fixtures/mallow-probes.json, so the blind review sheets keep their ids.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { screenFeeling, screenReframe } from '../core/feeling-safety.js';
import { normaliseText } from '../core/text-policy.js';
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

test('Tier 0 review: "not breathing" is about a pet only when the pet is who isn’t breathing; "breathing down my neck" is an idiom', () => {
  // the pet is the subject: distressing, but 000 isn't the answer
  for (const t of ['My cat’s not breathing properly', 'My old cat’s not breathing', 'The dog, he’s not breathing', 'My boss has finally stopped breathing down my neck'])
    assert.equal(outcome(feeling(t)), 'release', t);
  // a pet mentioned earlier doesn't make a person a pet
  for (const t of ['My dog barked and then my dad’s not breathing', 'My baby’s not breathing', 'My little brother isn’t breathing'])
    assert.equal(outcome(feeling(t)), 'danger', t);
});

test('Tier 0: double spaces, line breaks, accents, invisible marks and look-alike letters read like the plain words', () => {
  for (const t of ['I wanna  die', 'I wanna\ndie', 'I am  a burden', 'I want to hang  myself', 'k͏ill myself', 'kill️ myself', 'k\u{E0020}ill myself',
    'I want to kíll myself', 'I want to k̶i̶l̶l̶ myself', 'kㅤill myself', 'I want to kіll myself', 'I want to kill mysеlf', 'I’m ѕuicidal']) assert.equal(outcome(feeling(t)), 'crisis', JSON.stringify(t));
  assert.equal(outcome(feeling('Café  closed early\nso I went home')), 'release');
});

test('Tier 0 review: a filler between two words, or a line break after them, never lets the words through', () => {
  // a filler or invisible character between two words reads as the space it looks like: it can't run them together
  for (const t of ['I want to kill\u2800myself', 'I wanna\u3164die', 'I want to kill\u200Bmyself', 'I want to kill\u034Fmyself',
    'I want to kill\u{E0020}myself', 'I want to kill\u17B4myself', 'I want to kill\u00A0myself']) assert.equal(outcome(feeling(t)), 'crisis', JSON.stringify(t));
  assert.equal(screenReframe('Go hang\u2800yourself').code, 'unkind');
  // a line break ends the thought: the next line isn't read as the rest of the sentence above
  for (const t of ['I hope I never wake up\nidk', 'I’m so tired of living\nin this flat', 'I don’t want to live\nwith my mum anymore'])
    assert.equal(outcome(feeling(t)), 'crisis', JSON.stringify(t));
  // the everyday sentences are still released, and the words are stored as they were written
  for (const t of ['I’m so tired of living in this flat', 'Café\u2800closed early\nso I went home', 'Long day\uFE0F\n\nbed now']) {
    const r = feeling(t);
    assert.equal(r.ok, true, JSON.stringify(t));
    assert.equal(r.text, normaliseText(t), 'the person’s own words were changed');
  }
});

test('Tier 0: crisis words are answered with support even when the feeling is too long', () => {
  const r = feeling(`I want to kill myself. ${'and everything is too much '.repeat(25)}`);
  assert.equal(outcome(r), 'crisis');
  assert.equal(feeling('a'.repeat(501)).code, 'too-long');
  assert.equal(screenReframe(`You could just kill yourself. ${'x'.repeat(300)}`).code, 'unkind');
});

test('Tier 0 review: when a caller accepts more than 2,000 characters, every one of them is read', () => {
  const long = `${'and the day went on and on '.repeat(80)}I want to kill myself`;
  assert.ok(long.length > 2000);
  assert.equal(outcome(screenFeeling(long, { minChars: 1, maxChars: Infinity })), 'crisis');   // the Mallow library and service
  assert.equal(outcome(screenFeeling(long, { minChars: 1, maxChars: 5000 })), 'crisis');
  assert.equal(outcome(screenReframe(long, { minChars: 1, maxChars: 100000 })), 'crisis');
  assert.equal(screenFeeling(long, { maxChars: 500 }).code, 'too-long');                         // and never released either
});

test('Tier 0: threats, fear of going home and stalking show 1800RESPECT', () => {
  for (const t of ['He says he will kill me', 'I am afraid to go home', 'He stalks me']) {
    const r = feeling(t);
    assert.equal(r.code, 'support', t);
    assert.ok(lines(r).includes('1800RESPECT'), `${t}: ${lines(r).join(', ')}`);
  }
});

test('Tier 0: words telling a reader to hurt themselves never reach catchers; quoted, they are answered as harassment', () => {
  // never a bare refusal: the writer may be saying them to themselves, so the crisis screen answers (Tier 0 review)
  for (const t of ['kys whoever catches this', 'I keep telling myself kys', 'Whoever reads this, you are pathetic and should kill yourself',
    'Please don’t kill yourself', 'It can feel like nobody would miss you']) assert.equal(outcome(feeling(t)), 'crisis', t);
  const quoted = feeling('Someone at school messaged me telling me to kys');
  assert.equal(quoted.code, 'support');
  assert.equal(quoted.level, 'care');
  // everyday sayings aren't incitement
  for (const t of ['My mum says cut yourself some slack', 'Sometimes you just have to cut yourself some slack']) assert.equal(outcome(feeling(t)), 'release', t);
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

test('Tier 0 review: kind words that say not to, sayings and how things can feel pass; pushes still don’t', () => {
  for (const t of ['Don’t hurt yourself over this', 'Please don’t be too hard on yourself — and never hurt yourself', 'Cut yourself some slack',
    'You might shoot yourself in the foot by quitting now', 'It can feel like everyone hates you, but that isn’t what’s happening',
    'When you’re this low it can feel like nobody would miss you, and that feeling lies', 'Take the pressure off yourself for a bit',
    'You might think everyone hates you, but they don’t']) assert.equal(screenReframe(t).ok, true, t);
  for (const t of ['Why not just kill yourself', 'why not hurt yourself', 'Don’t hesitate, just hang yourself', 'You should off yourself',
    'I think nobody would miss you', 'I feel like everyone hates you', 'Honestly it seems like nobody would miss you',
    'You feel like trash and nobody would miss you']) assert.equal(screenReframe(t).code, 'unkind', t);
});

test('Tier 0 review: advice about food, weight, medication and school is refused as advice, not for the words alone', () => {
  for (const t of ['You’ll feel lighter after a good rest', 'Losing weight isn’t the point, you matter as you are',
    'Please don’t stop taking your meds without talking to your GP', 'It’s not a good idea to stop taking your meds suddenly',
    'Counting calories when you’re stressed can make things worse, be gentle with yourself', 'Please don’t skip meals, your body needs fuel',
    'What school of thought says you have to have it all figured out?']) assert.equal(screenReframe(t).ok, true, t);
  for (const t of ['You should lose some weight', 'Maybe just lose a few kilos', 'You’d feel better if you lost some weight', 'Only eat 800 calories',
    'Stick to 800 calories a day', 'Cut your calories', 'Try counting calories', 'Why not skip dinner', 'Stop taking your meds without asking your doctor',
    'Stop taking your meds suddenly', 'What school do you go to?', 'Which school are you at?']) assert.equal(screenReframe(t).code, 'unsafe', t);
});

test('Tier 0 review: a helpline number is left out of the phone rule only when it stands alone', () => {
  // someone's own number with a helpline's digits inside it is still a phone number
  for (const t of ['Ring 0412 13 11 14 after six', 'Try 04 13 11 14 22 tonight', '13 11 14 22 33 44 any time'])
    assert.equal(feeling(t).code, 'contact', t);
  assert.equal(screenReframe('You could ring 0412 13 11 14 tonight').code, 'contact');
  for (const t of ['Lifeline (13 11 14) or Beyond Blue (1300 22 4636) are there any time.', 'Lifeline is on 13 11 14 (24/7).',
    'You could call 1800RESPECT on 1800 737 732, any time.']) assert.equal(screenReframe(t).ok, true, t);
});

test('Tier 0: an Australian postcode with its context is refused as identifying', () => {
  assert.equal(feeling('I live in Fitzroy VIC 3065 and I feel so lonely lately').code, 'identifying');
  assert.equal(feeling('My postcode is 3065 and nobody here talks to me').code, 'identifying');
  assert.equal(feeling('I ran 5000 steps today and felt good').ok, true);
  // a state is written as states are: ordinary words with four digits after them aren't an address (Tier 0 review)
  for (const t of ['I live in Fitzroy Vic 3065 and nobody knows me', 'Glenelg SA 5045 feels so far from home']) assert.equal(feeling(t).code, 'identifying', t);
  for (const t of ['Year 12 is done and act 2026 of my life starts now', 'The Privacy Act 1988 training at work made me anxious', 'My wa 6000 steps goal slipped'])
    assert.equal(feeling(t).ok, true, t);
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
