// The classic Express → Encounter path (Journey's "What's on your mind?", the landing's "Another ritual", anything that
// sets app.state.input) reads the words the way the Hushfold's Tell reads them before anything playful (fix round,
// 15 Oct 2026): src/app/scenes/encounter.js readWordsSafety / gateRoute / noteVisitSafety, used by express.js too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const E = await import('../src/app/scenes/encounter.js');

test('classic gate: the main screen’s reading decides what comes first, in tellRoute’s order', async () => {
  const cases = [
    ['I feel so hopeless, I want to kill myself', 'crisis'],
    ['I have been giving my things away to people', 'care'],
    ['he hits me when he drinks', 'care'],
    ['my grandpa died last week', 'loss'],
    ['I want to hurt him', 'concern'],
    ['I can’t cope anymore', 'concern'],
    ['i’m so tired of everything', 'check'],
    ['i wnat to dei', 'crisis'],            // a misspelling the whole reading catches (risk-screen.js normalise)
    ['I am anxious about my exam tomorrow', 'offer'],
    ['my boss moved the deadline again', 'offer'],
  ];
  for (const [text, want] of cases) {
    const r = await E.readWordsSafety({ text, emotions: [{ id: 'anxiety', confidence: 1 }] });
    assert.ok(r, `a reading for ${text}`);
    assert.equal(E.gateRoute(r), want, `${text} → ${JSON.stringify(r)}`);
  }
  // a grief-family feeling chosen counts as a loss, words or not (readSafety's emotion)
  assert.equal(E.gateRoute(await E.readWordsSafety({ text: '', emotions: [{ id: 'grief' }] })), 'loss');
  assert.equal(E.gateRoute(await E.readWordsSafety({ text: 'it was a long week', emotions: ['mourning'] })), 'loss');
  assert.equal(E.gateRoute(await E.readWordsSafety({ text: '', emotions: [] })), 'offer');
});

test('classic gate: order, the visit, and answers already given', () => {
  const R = E.gateRoute;
  const visit = { level: 'care', category: 'violence' };
  assert.equal(R({ level: 'crisis' }, { visit }), 'crisis');
  assert.equal(R({ level: 'care', category: 'self-risk' }, { visit }), 'care');
  assert.equal(R({ level: 'concern', category: 'loss' }), 'loss');
  assert.equal(R({ level: 'concern', category: 'distress' }), 'concern');
  // ordinary words after something heavy earlier in the visit: carried (before the check-in, as on the main screen)
  assert.equal(R({ level: 'none', check: true }, { visit }), 'carried');
  assert.equal(R({ level: 'none' }, { visit }), 'carried');
  assert.equal(R({ level: 'none', check: true }), 'check');
  assert.equal(R({ level: 'none', unsure: true }), 'ask');
  // "I'm okay — let's play" / "Play with it" for these very words: not asked twice ("Another ritual")
  assert.equal(R({ level: 'none', check: true }, { answered: true }), 'offer');
  assert.equal(R({ level: 'none', unsure: true }, { answered: true }), 'offer');
  // an answer never lowers anything heavier
  assert.equal(R({ level: 'concern', category: 'loss' }, { answered: true }), 'loss');
  assert.equal(R(null), 'offer');
});

test('classic gate: the more serious reading wins and keeps every flag', () => {
  const S = E.strongerSafety;
  assert.deepEqual(S({ level: 'none', check: true }, { level: 'concern', category: 'loss', supportFirst: true }), { level: 'concern', category: 'loss', supportFirst: true });
  assert.deepEqual(S({ level: 'care', category: 'violence' }, { level: 'concern', category: 'loss', deathCare: 'death-follow' }), { level: 'care', category: 'violence', deathCare: 'death-follow' });
  assert.deepEqual(S({ level: 'none', check: true }, { level: 'none', unsure: true }), { level: 'none', category: null, check: true, unsure: true });
  assert.deepEqual(S(null, { level: 'crisis', category: 'self-harm' }), { level: 'crisis', category: 'self-harm' });
  assert.equal(S(null, null), null);
});

test('classic gate: a heavy reading is kept for the visit the Hushfold’s way (the level only, rising)', () => {
  const data = new Map();
  const ss = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { value: ss, configurable: true });
  try {
    const app = { state: {} };
    E.noteVisitSafety(app, { level: 'none', check: true });
    assert.equal(app.state.hfSafety, undefined, 'nothing heavy: nothing kept');
    E.noteVisitSafety(app, { level: 'concern', category: 'loss', matched: 'secret words' });
    assert.deepEqual(app.state.hfSafety, { level: 'concern', category: 'loss', crisisSpoken: false });
    const kept = JSON.parse(ss.getItem('hm2:visit-safety'));
    // (the tab keeps routing flags only since the fix round: never the words, nor the category)
    assert.deepEqual(Object.keys(kept).sort(), ['at', 'crisisSpoken', 'level'], 'never the words, nor the category');
    E.noteVisitSafety(app, { level: 'crisis', category: 'self-harm' }, { crisisSpoken: true });
    assert.deepEqual(app.state.hfSafety, { level: 'crisis', category: 'self-harm', crisisSpoken: true });
    // a reading that rules out any ritual offer (a suicide named) is kept across a reload as noWorld, not as its category
    const app2 = { state: {} };
    data.clear();
    E.noteVisitSafety(app2, { level: 'care', category: 'suicide-loss' });
    assert.deepEqual(JSON.parse(ss.getItem('hm2:visit-safety')).noWorld, true);
    assert.equal(JSON.parse(ss.getItem('hm2:visit-safety')).category, undefined);
    data.clear();
    E.noteVisitSafety(app, { level: 'crisis', category: 'self-harm' }, { crisisSpoken: true });
    E.noteVisitSafety(app, { level: 'concern', category: 'distress' });
    assert.equal(app.state.hfSafety.level, 'crisis', 'it only rises');
    assert.equal(JSON.parse(ss.getItem('hm2:visit-safety')).level, 'crisis');
  } finally {
    if (prev) Object.defineProperty(globalThis, 'sessionStorage', prev); else delete globalThis.sessionStorage;
  }
});

test('classic gate: every way in reads the words before a ritual is dealt', () => {
  const enc = read('src/app/scenes/encounter.js');
  const enter = enc.slice(enc.indexOf('async enter() {'), enc.indexOf('leave() {', enc.indexOf('async enter() {')));
  assert.ok(enter.indexOf('await decide()') >= 0 && enter.indexOf('await decide()') < enter.indexOf('await deal()'), 'the reading comes before the deal');
  assert.match(enter, /if \(route !== 'offer'\) \{ gate\(route, r, visit\); return; \}/);
  // the check-in and the question use the main screen's own words (src/hushfold/lines.js)
  assert.match(enc, /gentleCard\(CHECK_IN\.ask, \[btn\(CHECK_IN\.okay, \(\) => goOn\(\)\), btn\(CHECK_IN\.notReally, \(\) => notReally\(\)\), btn\(CHECK_IN\.stay, \(\) => beWithIt\(\)\)\]\)/);
  assert.match(enc, /gentleCard\(PLAY_CHECK\.ask, /);
  // Another Angle's door shows only beside a ritual offer
  assert.doesNotMatch(enc.slice(0, enc.indexOf('function angleRow()')), /ultraRow\.append/);
  // Express reads with the same function as it is typed and when "Meet a Mallow" is tapped
  const ex = read('src/app/scenes/express.js');
  assert.match(ex, /import \{ readWordsSafety, noteVisitSafety \} from '\.\/encounter\.js';/);
  const proceed = ex.slice(ex.indexOf('async function proceed()'), ex.indexOf('return {', ex.indexOf('async function proceed()')));
  assert.ok(proceed.indexOf('await readWordsSafety(') >= 0 && proceed.indexOf('await readWordsSafety(') < proceed.indexOf("app.go('encounter')"));
  // the ways in that the gate covers
  assert.match(read('src/app/scenes/landing.js'), /function another\(\) \{ app\.go\('encounter', \{\}\); \}/);
  assert.match(read('src/app/scenes/journey.js'), /app\.go\(ent\.has\('paid'\) \? 'express' : 'plans'\)/);
});

test('express: the dictation tip promises only what the app does', () => {
  const ex = read('src/app/scenes/express.js');
  assert.match(ex, /'Tip: tap the mic on your keyboard to talk instead\. hushmallow keeps your words on this phone\. Your keyboard’s dictation follows your phone’s settings\.'/);
  assert.doesNotMatch(ex, /Your words stay on this phone/);
});
