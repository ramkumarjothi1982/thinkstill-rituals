// The Hushfold shell (W3): shared safety detector, flow store, authored
// lines, subtitle timing/placement, router seams and privacy guards.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { checkText, legacySafety, safetyCopy } from '../src/engine/safety.js';
import * as LEX from '../src/data/safety-lexicon.js';
import * as F from '../src/ultra/frameworks.js';
import { checkSafety } from '../src/ultra/reframe-engine.js';
import { interpret } from '../src/engine/interpret.js';
import { createStore } from '../src/engine/storage.js';
import {
  saveProgress, loadProgress, clearProgress, validateProgress, sanitizeState, favouriteWorlds, toggleFavouriteWorld,
  isFavouriteWorld, drawFromBag, favouritesFirst, seededRng, PROGRESS_MAX_AGE_MS,
} from '../src/engine/flow-store.js';
import { createLines, MALLOW_LINES, SHARED_LINES, QUICK_FEELINGS, INTENTIONS, fillLine, flowEmotion, squeezeKind } from '../src/hushfold/lines.js';
import { readingMs, placeBand, normaliseSpeed, SUBTITLE_SPEEDS, scrimFor, brightPixel, luminance, contrastRatio, SCRIM_MIN, SCRIM_MAX } from '../src/hushfold/subtitles.js';
import { createInputRouter } from '../src/hushfold/input-router.js';
import { countWord } from '../src/v3/tray.js';
import { createPrefs } from '../src/app/prefs.js';
import { getEmotion } from '../src/data/emotions.js';
import { MALLOW_IDS } from '../src/mallows/registry.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');
const memStore = () => createStore({ backend: 'memory' });

// ------------------------------------------------------------ safety --
test('safety: the phrases the 12 Oct audit found missing are caught on the free path', () => {
  const cases = [
    ['My friend said she wants to kill herself', 'crisis', 'someone-in-danger'],
    ['I want to disappear forever', 'crisis', 'self-harm'],
    ['my partner threatens me', 'care', 'threat'],
    ['nobody would miss me', 'crisis', 'self-harm'],
    ['Honestly no one would even notice if I was gone', 'crisis', 'self-harm'],
    ['I keep thinking of ending it', 'crisis', 'self-harm'],
    ['been thinking about ending it all', 'crisis', 'self-harm'],
    ['there’s no reason to go on', 'crisis', 'self-harm'],
  ];
  for (const [t, level, category] of cases) {
    const r = checkText(t);
    assert.equal(r.level, level, t);
    assert.equal(r.category, category, t);
    assert.ok(r.matched, t);
    // interpret() delegates and keeps its old shape (care reads as concern)
    assert.equal(interpret(t).safety.level, level === 'care' ? 'concern' : level, t);
  }
});

test('safety: the common phrasings the 12 Oct review found missing (checkText and interpret alike)', () => {
  for (const t of ['I wanna die', 'i just wanna die', 'honestly i just wanna die', 'I wanna end it', 'I wish I could die', 'I wish I could just die',
    'I want to sleep and never wake up', 'I just want to go to sleep and not wake up', "I'd rather be dead", 'I would rather be dead', 'I’d rather die',
    'I wish I was never born', 'I wish I’d never been born', 'I should never have been born', 'I took a bunch of pills', 'I took all my tablets',
    'took too many pills', "what's the point of living", 'I want it all to end', 'I wish I could disappear forever', 'I want to just die']) {
    const r = checkText(t);
    assert.equal(r.level, 'crisis', `${t} → ${r.level}`);
    assert.equal(r.category, 'self-harm', t);
    assert.equal(interpret(t).safety.level, 'crisis', t);
  }
  // concern: keep support close, without treating it as a crisis
  for (const [t, category] of [['I feel like dying', 'distress'], ['I wish I could just disappear', 'distress'],
    ['I want to hurt someone', 'harm-others'], ["I'm going to hurt him", 'harm-others'], ['I want to kill my boss', 'harm-others']]) {
    const r = checkText(t);
    assert.equal(r.level, 'concern', `${t} → ${r.level}`);
    assert.equal(r.category, category, t);
    assert.equal(interpret(t).safety.level, 'concern', t);
  }
  // and the everyday wording next to them stays none
  for (const t of ['I wanna end it with him', 'I want to end it with her tonight', 'I wanna diet before the wedding', 'I wanna die of embarrassment',
    "I'm going to die of boredom in this meeting", 'I’d rather die than wear that', 'I took all my pills on time today', 'I want to sleep and not wake up until noon',
    "what's the point of living in London if you never go out", 'I want it all to stop for a minute', 'I could kill him', 'I want to hurt his feelings']) {
    const r = checkText(t);
    assert.equal(r.level, 'none', `${t} → ${r.level} (${r.matched})`);
  }
});

test('safety: every phrase the old free detector caught is still caught', () => {
  for (const t of ['I want to kill myself', 'thinking about hurting myself', 'I have been cutting myself', 'suicidal', 'I just want to end it all',
    'end my life', "I don't want to be here", 'I do not want to wake up', 'no reason to live', 'better off dead', 'everyone is better off without me',
    'I want to die', 'self harm', 'self-harming again', 'took an overdose']) {
    assert.equal(checkText(t).level, 'crisis', t);
    assert.equal(interpret(t).safety.level, 'crisis', t);
  }
  for (const t of ["I can't cope", 'I feel hopeless', 'I feel worthless', 'he hurts me', 'unsafe at home', 'I was abused']) {
    assert.notEqual(checkText(t).level, 'none', t);
    assert.equal(interpret(t).safety.level, 'concern', t);
  }
});

test('safety: everyday idioms stay none, including near-misses of the new phrases', () => {
  for (const t of ['this deadline is killing me', 'I could kill for a coffee', "I'm dying to know what she said", 'I nearly died laughing',
    'I want to die of embarrassment', 'I want to end it with him', 'thinking of ending it with him', "I'm thinking about ending things with my landlord off the record",
    'I felt threatened by her success', 'It suddenly hit me that I forgot her birthday', "My boss criticised my work. I think I'm terrible at my job.",
    'My boss embarrassed me today.', 'I miss my mum', 'Nobody replied in the group chat', '']) {
    const r = checkText(t);
    assert.equal(r.level, 'none', `${t} → ${r.level} (${r.matched})`);
  }
});

test('safety: one lexicon for free and Beyond paths (frameworks re-exports it)', () => {
  assert.equal(F.HARM_LEXICON, LEX.HARM_LEXICON);
  assert.equal(F.HARM_COPY, LEX.HARM_COPY);
  assert.ok(Object.isFrozen(LEX.HARM_LEXICON.crisis));
  // Beyond's checker sees the added phrases too
  assert.equal(checkSafety('nobody would miss me').level, 'crisis');
  assert.equal(checkSafety('thinking of ending it').level, 'crisis');
  // the lexicon is plain data so the Another Angle server can copy it
  assert.doesNotMatch(read('src/data/safety-lexicon.js'), /^import /m);
  // free code never imports the Beyond-only modules for safety
  assert.doesNotMatch(read('src/engine/safety.js'), /ultra\//);
  assert.doesNotMatch(read('src/engine/interpret.js'), /ultra\//);
});

test('safety: legacy shape and authored copy', () => {
  assert.deepEqual(legacySafety({ level: 'care', category: 'threat' }), { level: 'concern', reason: 'threat' });
  assert.deepEqual(legacySafety({ level: 'none', category: null }), { level: 'none', reason: null });
  assert.match(safetyCopy(checkText('I want to kill myself')).message, /emergency number/);
  assert.match(safetyCopy(checkText('my friend wants to kill herself')).title, /danger/i);
  assert.equal(safetyCopy(checkText('hello')), null);
  // interpret never carries the matched words around
  assert.equal(interpret('I want to kill myself').safety.detail.matched, undefined);
});

// -------------------------------------------------------- flow store --
test('flow store: progress round-trips, is versioned, expires and keeps no words', () => {
  const store = memStore();
  const now = 1_800_000_000_000;
  const rec = saveProgress(store, { worldId: 'static-storm', idx: 1, sequence: ['static-storm', 'luminous-ocean'], step: 0.42, emotion: 'anger', intention: 'calm', mallow: 'glitzi', seed: 7,
    state: { v: 1, light: 0.3, photoState: [{ i: 0, grounded: true }], note: 'My boss embarrassed me', words: ['my boss'] } }, { now });
  assert.equal(rec.worldId, 'static-storm');
  const back = loadProgress(store, now + 1000);
  assert.equal(back.step, 0.42);
  assert.deepEqual(back.sequence, ['static-storm', 'luminous-ocean']);
  assert.equal(back.state.light, 0.3);
  assert.equal(back.state.note, undefined, 'free text is dropped');
  assert.deepEqual(back.state.words, [], 'free text in arrays is dropped');
  assert.doesNotMatch(JSON.stringify(store.get('hushfold.progress')), /boss/i);
  // too old, from the future, wrong version, or free text as an id → gone
  assert.equal(loadProgress(store, now + PROGRESS_MAX_AGE_MS + 5000), null);
  assert.equal(store.get('hushfold.progress', null), null, 'an expired record is removed');
  assert.equal(validateProgress({ v: 2, worldId: 'x', savedAt: now }, now), null);
  assert.equal(validateProgress({ v: 1, worldId: 'my boss embarrassed me', savedAt: now }, now), null);
  assert.equal(validateProgress({ v: 1, worldId: 'static-storm', savedAt: now + 3_600_000 }, now), null);
  assert.equal(validateProgress({ v: 1, worldId: 'static-storm', savedAt: now, emotion: 'I feel awful' }, now).emotion, null);
  // saveHistory off: nothing written, any old record cleared
  saveProgress(store, { worldId: 'static-storm' }, { now });
  assert.equal(saveProgress(store, { worldId: 'static-storm' }, { now, enabled: false }), null);
  assert.equal(store.get('hushfold.progress', null), null);
  saveProgress(store, { worldId: 'static-storm' }, { now });
  clearProgress(store);
  assert.equal(loadProgress(store, now), null);
  // oversize world state is refused
  const big = { v: 1, xs: Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => 123456.789)) };
  assert.equal(validateProgress({ v: 1, worldId: 'w', savedAt: now, state: big }, now).state, undefined);
  assert.deepEqual(sanitizeState({ a: 'ok-id', b: 'two words', c: [1, 'x y', true], d: { e: NaN } }), { a: 'ok-id', c: [1, true], d: {} });
});

test('flow store: favourite worlds are explicit, de-duplicated and validated', () => {
  const store = memStore();
  assert.deepEqual(favouriteWorlds(store), []);
  assert.equal(toggleFavouriteWorld(store, 'static-storm'), true);
  assert.equal(toggleFavouriteWorld(store, 'luminous-ocean'), true);
  assert.deepEqual(favouriteWorlds(store), ['luminous-ocean', 'static-storm']);
  assert.equal(isFavouriteWorld(store, 'static-storm'), true);
  assert.equal(toggleFavouriteWorld(store, 'static-storm'), false);
  assert.deepEqual(favouriteWorlds(store), ['luminous-ocean']);
  assert.equal(toggleFavouriteWorld(store, 'not an id!'), false);
  assert.deepEqual(favouritesFirst(store, ['a', 'luminous-ocean', 'b']), ['luminous-ocean', 'a', 'b']);
  store.set('hushfold.favourites', { v: 9, ids: ['x'] });
  assert.deepEqual(favouriteWorlds(store), [], 'a record from another version reads as empty');
});

test('flow store: rotation bags never repeat within a round, are deterministic and honour avoid', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const run = () => { const store = memStore(); return Array.from({ length: 15 }, () => drawFromBag(store, 'anger|calm', ids)); };
  const seq = run();
  assert.deepEqual(seq, run(), 'deterministic');
  for (let r = 0; r < 3; r++) assert.equal(new Set(seq.slice(r * 5, r * 5 + 5)).size, 5, `round ${r} has no repeats`);
  for (let r = 1; r < 3; r++) assert.notEqual(seq[r * 5], seq[r * 5 - 1], 'a round never starts with the last one');
  const store = memStore();
  const first = drawFromBag(store, 'k', ids, { avoid: ['a', 'b', 'c', 'd'] });
  assert.equal(first, 'e');
  assert.equal(drawFromBag(store, 'k', ['only'], {}), 'only');
  assert.equal(drawFromBag(store, 'k', [], {}), null);
  // the pool can change: removed items are skipped
  const s2 = memStore();
  drawFromBag(s2, 'p', ['x', 'y', 'z']);
  assert.ok(['x', 'y'].includes(drawFromBag(s2, 'p', ['x', 'y'])));
  const r = seededRng('seed');
  assert.ok(r() >= 0 && r() < 1);
});

// ------------------------------------------------------------- lines --
const MOMENTS = ['nudge', 'justPlay', 'thought', 'return'];
const ACKS = [...QUICK_FEELINGS.map(([id]) => id), 'other', 'none'];
function allStrings(x, out = []) {
  if (typeof x === 'string') out.push(x);
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => allStrings(v, out));
  return out;
}

test('lines: every Mallow has every moment, short, authored, British and AI-free', () => {
  assert.deepEqual(Object.keys(MALLOW_LINES).sort(), [...MALLOW_IDS].sort());
  for (const id of MALLOW_IDS) {
    const m = MALLOW_LINES[id];
    for (const k of MOMENTS) assert.ok(m[k]?.length, `${id}.${k}`);
    for (const k of ['hold', 'tap', 'flick']) assert.ok(m.first[k]?.length, `${id}.first.${k}`);
    for (const k of ['squeeze', 'release', 'tap', 'doubleTap', 'flick', 'stretch', 'massage', 'stroke', 'jiggle']) assert.ok(m.squeeze[k]?.length, `${id}.squeeze.${k}`);
    for (const k of ACKS) assert.ok(m.ack[k]?.length, `${id}.ack.${k}`);
    assert.deepEqual(m.invite[0], ['Something bothering you?', 'Want to tell me?'], `${id} opens with the canonical invitation`);
    for (const pair of m.invite) assert.equal(pair.length, 2);
  }
  const strings = [...allStrings(MALLOW_LINES), ...allStrings(SHARED_LINES)];
  assert.ok(strings.length > 250);
  for (const s of strings) {
    assert.ok(s.length <= 90, `too long for one subtitle: ${s}`);
    assert.doesNotMatch(s, /\bAI\b|chatbot|\bbot\b/i, s);
    assert.doesNotMatch(s, /\b(color|favorite|practicing|cozy|realize|organize|center)\b/i, `American spelling: ${s}`);
    assert.doesNotMatch(s, /\b(cure|treat(ment)?|therapy|diagnos\w*|disorder|guarantee)\b/i, `clinical claim: ${s}`);
    assert.doesNotMatch(s, /\bI understand\b|\bI know how you feel\b/i, `claims to understand: ${s}`);
    assert.doesNotMatch(s, /Hushmallow|HUSHMALLOW/, s);
  }
  // acknowledgements echo the chosen feeling only, never the person's text
  for (const id of MALLOW_IDS) for (const s of allStrings(MALLOW_LINES[id].ack)) assert.doesNotMatch(s, /\{text\}|\{words\}/);
  // safety lines never joke
  for (const s of [...SHARED_LINES.support, ...SHARED_LINES.supportCare, ...SHARED_LINES.supportConcern, ...SHARED_LINES.harmOthers, ...SHARED_LINES.careAsk, ...SHARED_LINES.careQuiet]) assert.doesNotMatch(s, /!|haha|squish/i);
  // no chat-style stage directions in subtitles
  for (const s of strings) assert.doesNotMatch(s, /\*[^*]+\*/, `stage direction: ${s}`);
});

test('lines: deterministic rotation without repeats, canonical invitation first', () => {
  const store = memStore();
  const lines = createLines({ store });
  assert.deepEqual(lines.invitation('glitzi'), ['Something bothering you?', 'Want to tell me?']);
  assert.notDeepEqual(lines.invitation('glitzi'), ['Something bothering you?', 'Want to tell me?'], 'a return visit hears the other one');
  const n = MALLOW_LINES.blubi.squeeze.squeeze.length;
  const seen = Array.from({ length: n }, () => lines.pick('blubi', 'squeeze', { kind: 'squeeze' }));
  assert.equal(new Set(seen).size, n, 'no repeats until every line has had its turn');
  const again = createLines({ store: memStore() });
  const other = Array.from({ length: n }, () => again.pick('blubi', 'squeeze', { kind: 'squeeze' }));
  assert.deepEqual(other, seen, 'same order for the same history');
  // store-backed: indices only, no words
  assert.doesNotMatch(JSON.stringify(store.get('hushfold.lines')), /[A-Za-z]{4,} [A-Za-z]{4,}/);
  // rig kinds map onto the squeeze vocabulary
  assert.equal(squeezeKind('press'), 'squeeze');
  assert.equal(squeezeKind('doubleTap'), 'doubleTap');
  assert.equal(squeezeKind('wave'), null);
  assert.ok(lines.pick('zuzu', 'first', { kind: 'doubleTap' }));
  assert.ok(lines.pick('loomi', 'stub'));
});

test('lines: acknowledgements echo a chosen feeling, and feeling ids map to the Hushflow registry', () => {
  const lines = createLines({ store: memStore() });
  const e = getEmotion('embarrassment');
  assert.match(lines.pick('blubi', 'ack', { emotion: 'embarrassment', feelingName: e.name }), /^Embarrassment\./);
  assert.match(fillLine('{Feeling}. Okay, {feeling}.', { feelingName: 'Hurt' }), /^Hurt\. Okay, hurt\.$/);
  for (const [id] of QUICK_FEELINGS) assert.ok(getEmotion(id), `${id} exists in data/emotions.js`);
  assert.deepEqual(QUICK_FEELINGS.map(([id]) => flowEmotion(id)), ['angry', 'anxious', 'sad', 'overwhelmed', 'frustrated', 'lonely', 'restless']);
  assert.equal(flowEmotion('fury', getEmotion('fury')?.family), 'angry');
  assert.equal(flowEmotion('embarrassment', 'shame'), 'other');
  assert.equal(flowEmotion(null), null);
});

test('lines: the chip ids are exactly the Hushflow registry ids (when W4’s registry is present)', async () => {
  let reg = null;
  try { reg = await import('../src/hushfold/flow/registry.js'); } catch { /* W4 not landed */ }
  if (!reg?.FLOW_INTENTIONS) return;
  assert.deepEqual(INTENTIONS.map(([id]) => id), reg.FLOW_INTENTIONS.map((x) => x.id));
  const ids = new Set(reg.FLOW_EMOTIONS.map((x) => x.id));
  for (const [id] of QUICK_FEELINGS) assert.ok(ids.has(flowEmotion(id)), id);
});

// --------------------------------------------------------- subtitles --
test('subtitles: reading time follows clamp(1400 + 55·chars, 2400, 7000) ÷ speed', () => {
  assert.equal(readingMs('Hi'), 2400);
  assert.equal(readingMs('x'.repeat(40)), 1400 + 55 * 40);
  assert.equal(readingMs('x'.repeat(400)), 7000);
  assert.equal(readingMs('x'.repeat(40), 1.5), Math.round((1400 + 55 * 40) / 1.5));
  assert.equal(readingMs('x'.repeat(40), 0.75), Math.round((1400 + 55 * 40) / 0.75));
  assert.equal(normaliseSpeed(3), 1);
  assert.deepEqual(SUBTITLE_SPEEDS, [0.75, 1, 1.25, 1.5]);
});

test('subtitles: the band sits clear of the Mallow and Thought Mallows', () => {
  const bounds = { top: 70, bottom: 780 };
  const mallow = { top: 360, bottom: 614 };
  const a = placeBand(bounds, [mallow], 120);
  assert.ok(a.fits);
  assert.ok(a.y + 120 <= mallow.top - 12 + 0.5 && a.y >= bounds.top, 'above the Mallow, close to it');
  // not enough room above: goes below, top-aligned
  const b = placeBand(bounds, [{ top: 120, bottom: 614 }], 120);
  assert.ok(b.fits && b.y >= 614 + 12);
  // a thought next to the Mallow is avoided as well
  const c = placeBand(bounds, [mallow, { top: 250, bottom: 330 }], 90);
  for (const blk of [mallow, { top: 250, bottom: 330 }]) assert.ok(c.y + 90 <= blk.top || c.y >= blk.bottom, JSON.stringify(c));
  // nothing fits: the largest band, never above the top bound
  const d = placeBand({ top: 70, bottom: 300 }, [{ top: 90, bottom: 280 }], 200);
  assert.equal(d.fits, false);
  assert.ok(d.y >= 70);
});

// ------------------------------------------------------ shell seams --
test('router: home is the Hushfold, classic and garden routes, update guard, prefs wiring', () => {
  const main = read('src/app/main.js');
  assert.match(main, /home: \(\) => import\('\.\/scenes\/hushfold\.js'\)/);
  assert.match(main, /classic: \(\) => import\('\.\/scenes\/home\.js'\)/);
  assert.match(main, /garden: \(\) => import\('\.\/scenes\/garden\.js'\)/);
  assert.match(main, /current\?\.safeForUpdate\?\.\(\) \?\? true/);
  assert.match(main, /app\.applyUpdateIfSafe = /);
  assert.match(main, /if \(k === 'haptics'\) app\.world\.setHaptics\(v\)/);
  assert.match(main, /if \(k === 'lowStim'\) app\.world\.setLowStim\(v\)/);
  assert.match(main, /OPTIONAL_SCENES = \{ garden:/);
  assert.match(main, /app\.pushLayer = /);
  const world = read('src/app/world.js');
  assert.doesNotMatch(world, /\|\| true/, 'low stimulation really turns Mallow particles off');
  for (const fn of ['setLayerSize', 'bodyRect', 'setHaptics', 'setLowStim']) assert.match(world, new RegExp(`${fn}\\(`));
  assert.match(world, /crossfadeMs = 900/);
  assert.match(world, /interactive = true/);
  const scene = read('src/app/scenes/hushfold.js');
  for (const k of ['get blockBack()', 'safeForUpdate()', 'spawnThought', "title: ''"]) assert.ok(scene.includes(k), k);
  assert.match(scene, /requireEntitlement\(ent, 'paid'\)/, 'Hushflow is enforced in code, not only in the UI');
});

test('touch: the Hushfold root never takes a touch; only .hf-ui does (classic home too)', () => {
  const css = read('src/ui/hushfold.css').replace(/\s+/g, ' ');
  assert.match(css, /\.hushfold \{[^}]*pointer-events: none !important/);
  assert.match(css, /\.hushfold \.hf-ui \{ pointer-events: auto; \}/);
  assert.match(css, /\.home \{ pointer-events: none !important; \}/);
  assert.match(css, /\.hf-subs \{[^}]*pointer-events: none/);
  // inputs ≥16px; no text under 13px in the Hushfold stylesheet
  assert.match(css, /textarea \{[^}]*font-size: max\(16px/);
  for (const m of css.matchAll(/(\d+(?:\.\d+)?)px\)?\s*\/[\d.]+ var\(--hf-ff/g)) assert.ok(+m[1] >= 13, m[0]);
});

test('privacy: nothing in the Hushfold shell stores or sends words or photos', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? walk(`${d}/${f.name}`) : f.name.endsWith('.js') ? [`${d}/${f.name}`] : []));
  const files = [...walk(`${root}src/hushfold`), `${root}src/app/scenes/hushfold.js`, `${root}src/engine/flow-store.js`, `${root}src/engine/safety.js`, `${root}src/app/emotion-picker.js`];
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|toDataURL|innerHTML/, f);
  }
  // the person's words reach the DOM through textContent only
  const overlay = read('src/hushfold/input-overlay.js'), stage = read('src/hushfold/stage.js');
  assert.match(stage, /tag\.textContent = excerpt\(text\)/);
  assert.doesNotMatch(overlay + stage, /\bhtml:/);
});

test('prefs: Hushfold defaults, and Delete everything tells every listener', () => {
  const store = memStore();
  const prefs = createPrefs(store);
  assert.equal(prefs.get('autoFlow'), false);
  assert.equal(prefs.get('subtitleSpeed'), 1);
  assert.equal(prefs.get('textScale'), 1);
  assert.equal(prefs.get('mallow'), null);
  prefs.set('haptics', false); prefs.set('textScale', 1.25);
  const seen = [];
  prefs.onChange((k, v) => seen.push([k, v]));
  prefs.reset();
  assert.deepEqual(seen.sort(), [['haptics', true], ['textScale', 1]]);
});

// ------------------------------------------------------ 12 Oct review --
test('subtitles: the scrim deepens over bright backdrops until white text reads at ≥4.5:1', () => {
  const white = luminance(251, 248, 255);
  // dark realms keep the light touch
  assert.equal(scrimFor([12, 10, 40]), SCRIM_MIN);
  for (const px of [[255, 255, 255], [255, 236, 200], [250, 190, 150], [170, 230, 255], [200, 210, 255], [255, 210, 120]]) {
    const a = scrimFor(px);
    assert.ok(a > SCRIM_MIN && a <= SCRIM_MAX, `${px} → ${a}`);
    // what the glyph edge sees: the scrim's feathered rim (86 %) blended in sRGB
    const k = a * 0.86;
    const bl = luminance(px[0] + (9 - px[0]) * k, px[1] + (6 - px[1]) * k, px[2] + (28 - px[2]) * k);
    assert.ok(contrastRatio(white, bl) >= 4.5, `${px}: ${contrastRatio(white, bl).toFixed(2)}`);
  }
  // the brightest few per cent decide, not the average
  const data = new Uint8ClampedArray(100 * 4);
  for (let i = 0; i < 100; i++) { const v = i >= 94 ? 255 : 20; data.set([v, v, v, 255], i * 4); }
  assert.deepEqual(brightPixel(data), [255, 255, 255]);
});

test('input router: a second finger on the Mallow reaches a multi-touch Mallow (two-finger stretch), not the rig', () => {
  const prevDoc = globalThis.document, prevW = globalThis.innerWidth, prevH = globalThis.innerHeight;
  globalThis.document = { addEventListener() {}, removeEventListener() {}, body: { classList: { add() {}, remove() {} } } };
  globalThis.innerWidth = 390; globalThis.innerHeight = 844;
  try {
    const run = (multiTouch) => {
      const el = new EventTarget();
      el.setPointerCapture = () => {};
      const got = [];
      const mallow = { multiTouch, hitTest: () => true, pointer: (r) => got.push(r), bodyRect: () => ({ cx: 0, cy: 0 }), lookAt() {} };
      const router = createInputRouter({ el, mallow, thoughts: null });
      router.setWorld(() => {});
      const ev = (type, id, x, y) => Object.assign(new Event(type, { cancelable: true }), { pointerId: id, clientX: x, clientY: y, pointerType: 'touch' });
      el.dispatchEvent(ev('pointerdown', 1, 180, 400));
      el.dispatchEvent(ev('pointerdown', 2, 220, 420));
      const owners = router.owners;
      el.dispatchEvent(ev('pointermove', 2, 260, 430));
      el.dispatchEvent(ev('pointerup', 1, 180, 400));
      el.dispatchEvent(ev('pointerup', 2, 260, 430));
      router.destroy();
      return { owners, ids: [...new Set(got.map((r) => r.id))], types: got.map((r) => `${r.id}:${r.type}`) };
    };
    const mt = run(true);
    assert.deepEqual(mt.owners, ['mallow', 'mallow']);
    assert.deepEqual(mt.ids, [1, 2]);
    assert.ok(mt.types.includes('2:move') && mt.types.includes('2:up'));
    const rig = run(false);
    assert.deepEqual(rig.owners, ['mallow', 'world'], 'the single-pointer rig gets one finger; the other plays the world');
    assert.deepEqual(rig.ids, [1]);
  } finally { globalThis.document = prevDoc; globalThis.innerWidth = prevW; globalThis.innerHeight = prevH; }
  const stage = read('src/hushfold/stage.js');
  assert.match(stage, /kind: 'rig',[\s\S]*?multiTouch: false/);
  assert.match(stage, /kind: 'touch',[\s\S]*?multiTouch: true/);
});

test('photo tray: a full tray renders no stray "null", and counts in copy are words', () => {
  const tray = read('src/v3/tray.js');
  assert.match(tray, /\.filter\(Boolean\)\)/, 'replaceChildren never receives null');
  assert.doesNotMatch(tray, /\$\{added\} were/);
  assert.equal(countWord(7), 'seven');
  assert.equal(countWord(2), 'two');
});

test('back: a popped layer token goes to the scene, which closes that layer only', () => {
  const main = read('src/app/main.js');
  assert.match(main, /const t = layers\.pop\(\); try \{ const close = current\?\.blockBack; if \(typeof close === 'function'\) close\(t\);/);
  const scene = read('src/app/scenes/hushfold.js');
  assert.match(scene, /return \(token\) => backClose\(token\)/);
  assert.match(scene, /layer\[k\] = 0;   \/\/ its history entry is spent/);
});

test('hushfold: held discoveries survive Tell, care never jokes or auto-starts, update guard covers crisis and thoughts', () => {
  const scene = read('src/app/scenes/hushfold.js');
  assert.match(scene, /subtitles\.clear\(\{ keepHeld: true \}\);\s*subtitles\.suspend\(\);/);
  assert.match(scene, /subtitles\.unsuspend\(\)/);
  assert.match(scene, /safety\?\.level === 'care' \|\| safety\?\.category === 'harm-others'\) \{ await careBeat/);
  assert.match(scene, /if \(S\.crisis \|\| S\.care \|\| !supportPill\.hidden\) return false;/);
  assert.match(scene, /stage\?\.thoughts\.list\.length \|\| 0\) > 0\) return false;/);
  assert.match(scene, /loadProgress\(store\)/, 'the resume offer reads saved progress without making a director');
  assert.match(scene, /resume: true/);
  const subs = read('src/hushfold/subtitles.js');
  assert.match(subs, /\/\^\(INPUT\|TEXTAREA\|SELECT\)\$\/\.test\(a\.tagName\)/, 'a held line never steals focus from a text field');
});
