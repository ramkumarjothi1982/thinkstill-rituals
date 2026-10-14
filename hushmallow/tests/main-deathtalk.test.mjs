// The main screen's Tell reads death and loss talk too (input-overlay readSafety with lossAware):
// a death is never made into a Thought Mallow or a playful world. Another Angle keeps its own grief path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';

const m = { checkText };
await loadGrief();
const level = (t, aware = true) => readSafety(m, t, aware).level;

test('death and loss talk is concern on the main screen, never none', () => {
  for (const t of ['My dad died last week', 'my dads dead and i miss him', 'We lost Dad in March.', 'my cat was put to sleep today',
    'My son died in Fortnite', 'my nan has dementia and doesnt know who i am', 'the funeral is on friday']) assert.equal(level(t), 'concern', t);
});
test('a wish to follow the one who died is care', () => {
  for (const t of ['My nan died and I want to be with her', 'my mum died and i just want to join her']) assert.equal(level(t), 'care', t);
});
test('it never lowers what the safety check found, and ordinary words stay ordinary', () => {
  assert.equal(level('I want to die'), 'crisis');
  assert.equal(level('he finally hit me'), 'care');
  for (const t of ['my phone died', 'My boss embarrassed me in front of everyone today', 'I failed my exam and feel stupid']) assert.equal(level(t), 'none', t);
});
test('without lossAware (Another Angle) the reading is exactly checkText', () => {
  for (const t of ['My dad died last week', 'My nan died and I want to be with her', 'I want to die']) assert.deepEqual(readSafety(m, t, false), checkText(t));
});
test('the Hushfold opens its Tell with lossAware, and the overlay reads it on typing, on Send and on close', () => {
  const hf = readFileSync(new URL('../src/app/scenes/hushfold.js', import.meta.url), 'utf8');
  const ov = readFileSync(new URL('../src/hushfold/input-overlay.js', import.meta.url), 'utf8');
  assert.match(hf, /lossAware: true/);
  // (review r12: on Send with the feeling they chose, a grief-family one counting as a loss)
  assert.equal((ov.match(/(?<!function )readSafety\((?:m|modsNow), (?:t|ta\.value), lossAware(?:, \{ emotion: chosenEmotion \})?\)/g) || []).length, 3);
});

// (review r11, the coordinator's decision for the main screen) every death phrasing the round-4 review found outside the
// lists reaches readSafety through deathTalk (concern / loss), and a person beside a strong loss cue does through grief.js
// strongLoss; the weak cues (went, left, without, goodbye, anymore) and the full bag stay inside Another Angle, so these
// ordinary Tells are still a Thought Mallow and a world.
const R11 = await import('./probes/r11.mjs');
test('r11: the review’s 27 main-screen misses, and the coordinator’s families, are concern / loss', () => {
  assert.equal(new Set(R11.R4_MAIN_27).size, 27);
  for (const t of [...R11.R4_MAIN_27, ...R11.MAIN_FAMILIES]) {
    const r = readSafety(m, t, true);
    assert.deepEqual([r.level, r.category], ['concern', 'loss'], t);
  }
  // a person beside a strong cue, outside deathTalk's own families
  for (const t of ['the big c got my grandad', 'that horrible illness got my nan in the end', 'the doctors said my dad was unresponsive']) assert.equal(level(t), 'concern', t);
});
test('r11: the coordinator’s ordinary main-screen Tells stay none; fifty ordinary Tells, no loss false alarm', () => {
  for (const t of ['my mum went to bed without saying goodnight, she must be upset with me', 'my dad left the room without saying goodbye', 'my girlfriend went out with her friends tonight',
    'I lost my keys again', 'my phone died', 'I killed it at work today', 'this traffic is murder', 'my plant died', 'my sister took my charger', 'my brother got a new job',
    'the party is dead']) assert.equal(level(t), 'none', t);
  assert.equal(R11.MAIN_ORDINARY_50.length, 50);
  assert.deepEqual(R11.MAIN_ORDINARY_50.filter((t) => readSafety(m, t, true).category === 'loss'), []);
});
test('r11: readSafety reads strongLoss only after crisis, care and escalation, and only when the level is none', () => {
  const ov = readFileSync(new URL('../src/hushfold/input-overlay.js', import.meta.url), 'utf8');
  // (review r12: through grief.js lossRoute, deathTalk, livingLoss and strongLoss as before, a grief-family feeling, and
  // the check-in's 'ask'; the r11 reading stands as the fallback)
  assert.match(ov, /if \(r\.level !== 'none'\) return r;\n\s+const route = griefNow\.lossRoute \? griefNow\.lossRoute\(t, \{ emotion \}\)\n\s+: \(griefNow\.deathTalk\(t\) \|\| griefNow\.livingLoss\?\.\(t\) \|\| griefNow\.strongLoss\?\.\(t\) \? 'gentle' : null\);\n\s+if \(route === 'gentle'\) return \{ level: 'concern', category: 'loss', matched: null \};/);
  assert.equal(level('I want to die'), 'crisis');
  assert.equal(level('my brother died and Id like to be with him'), 'care');
});
