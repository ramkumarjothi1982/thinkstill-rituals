// The follow-ups after the final main-screen and Another Angle polish (two independent verifiers): the Tell's feeling
// suggestions (interpret.js), a world held quietly after a closed Tell, Resume only after a loss or a care-level disclosure,
// the More Room offer meeting a line at 320, the goodbye line, the ocean words at 320, the scrim's bright spot and the
// abuse support sheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpret, suggestedFeelings, LOSS_FIT } from '../src/engine/interpret.js';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief, lossIn } from '../src/hushfold/input-overlay.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
await loadGrief();
const m = { checkText };
/** What the overlay suggests for these words (input-overlay read(): the loss flag and the level it passes). */
function chips(t, lossAware = true) {
  const safety = readSafety(m, t, lossAware);
  const loss = !!t.trim() && (safety.category === 'loss' || lossIn(t));
  return suggestedFeelings(interpret(t), { loss, level: safety.level });
}

// ------------------------------------------------------------------------------- 8a. the someone-else rule --
test('generic "you" is the person: their feeling keeps its suggestion', () => {
  assert.deepEqual(chips('you just feel so lonely when you move to a new city'), ['loneliness']);
  assert.deepEqual(chips('you get so anxious before exams'), ['anxiety']);
  assert.deepEqual(chips('you feel so stupid when you forget a name'), suggestedFeelings(interpret('I feel so stupid when I forget a name')));
});

test('a feeling shared with someone is the person’s too', () => {
  assert.deepEqual(chips('me and my brother were furious about it'), ['fury']);
  assert.deepEqual(chips('my mum is angry and so am I'), ['anger']);
  assert.deepEqual(chips('my mum is angry, and so am I'), ['anger']);
  assert.deepEqual(chips('my dog was scared of the fireworks and so was I'), ['fear']);
  assert.deepEqual(chips('my sister was upset and I was too'), ['sadness']);
  assert.deepEqual(chips('my brother and I were furious about it'), ['fury']);
});

test('a feeling the words give to someone else alone is still never suggested as theirs', () => {
  for (const t of ['my mum didnt call me back, she must be angry with me', 'my boss was furious at the team today', 'he seems really upset with me',
    'my friend is so annoyed with me', 'they looked disappointed', 'my dad gets so mad', 'everyone was angry at me', 'my sister is jealous of me',
    'my mum and dad were furious', 'my sister was upset and so was my mum']) {
    assert.deepEqual(chips(t), [], t);
  }
  assert.deepEqual(chips('he was angry so I got scared'), ['fear']);
  assert.deepEqual(chips('my teacher is disappointed in me and I feel ashamed'), ['shame']);
  assert.deepEqual(chips('she makes me so angry'), ['anger']);
});

// --------------------------------------------------------------------- 8b. stated feelings beside a loss --
test('beside a loss a feeling the person states outright stays after Grief and Sad', () => {
  assert.deepEqual(chips('my dad died and I feel guilty that I wasnt there'), ['grief', 'sadness', 'guilt']);
  assert.deepEqual(chips('we had to put our dog down yesterday, I feel so guilty'), ['grief', 'sadness', 'guilt']);
  assert.deepEqual(chips('my wife died and I am so angry at the doctors'), ['grief', 'sadness', 'anger']);
  assert.deepEqual(chips('my mum has dementia and doesnt recognise me anymore, I feel so frustrated with myself'), ['grief', 'sadness', 'frustration']);
  assert.deepEqual(chips('my grandma passed away peacefully in her sleep, I am relieved she isnt in pain'), ['grief', 'sadness', 'relief']);
  for (const t of ['my dad died and I feel guilty that I wasnt there', 'my wife died and I am so angry at the doctors']) {
    assert.deepEqual(chips(t, false), chips(t, true), `Another Angle reads the same: ${t}`);
  }
});

test('beside a loss a word the reading merely found is still not echoed back', () => {
  // (the self-blame of a pregnancy loss: "rested", "obligated"; a pleasant feeling that was, not is: "excited")
  assert.deepEqual(chips('At the 12 week scan there was no heartbeat. I should have rested more.'), ['grief', 'sadness']);
  assert.deepEqual(chips('we had a miscarriage on sunday, I was so excited to be a mum'), ['grief', 'sadness']);
  assert.deepEqual(chips('my nan died last week'), ['grief', 'sadness']);
  for (const id of chips('covid took my grandad')) assert.ok(LOSS_FIT.has(id), id);
  // stated outright, but not as theirs: someone else's anger beside a loss
  assert.deepEqual(chips('my dad died and my mum is so angry at the doctors'), ['grief', 'sadness']);
});

// --------------------------------------------------------------------------- 8c. moved, touched (a doing) --
test('"moved" and "touched" are feelings only when the words say so', () => {
  assert.deepEqual(chips('I feel so lonely since I moved'), ['loneliness']);
  for (const t of ['my best friend moved to Spain', 'we moved house last week', 'I was moved to a new team', 'she moved away',
    'everyone has moved on', 'he touched me', 'she touched my arm']) {
    const r = interpret(t);
    assert.ok(!r.emotions.some((e) => e.id === 'moved' || e.id === 'touched'), `${t}: ${r.emotions.map((e) => e.id)}`);
  }
  for (const [t, id] of [['I was so moved by the film', 'moved'], ['that really moved me', 'moved'], ['it moved me to tears', 'moved'],
    ['I was deeply moved', 'moved'], ['I feel moved', 'moved'], ['moved', 'moved'], ['I was so touched by her card', 'touched'],
    ['that touched me', 'touched'], ['it touched my heart', 'touched']]) {
    assert.ok(interpret(t).emotions.some((e) => e.id === id && e.confidence >= 0.6), `${t} reads ${id}`);
  }
});
