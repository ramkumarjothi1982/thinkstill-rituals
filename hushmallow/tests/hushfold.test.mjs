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

// review round 3 (12 Oct): the whole probe list, run as a test. Levels: crisis opens the urgent
// sheet; concern keeps support close (passive or ambiguous wishes, distress, wanting to hurt someone)
const PROBE = {
  crisis: ['I want to kill myself', 'i wanna die', 'I want to disappear forever', 'nobody would miss me', 'thinking of ending it',
    'I want to stop existing', 'I keep thinking about dying', "I don't want to wake up tomorrow", "I've been cutting again", 'I started self harming',
    'I have the pills ready', "I'm done with life", 'i want to kill my self', 'I took a bunch of pills', "I'm going to end it tonight",
    'no one would care if I died', "I'd be better off dead", 'I want to die', 'I just want it all to stop', "I'm suicidal", 'I want to end my life',
    "I can't go on", 'Everyone would be better off without me', 'i want to unalive myself', "I'm thinking of taking my own life",
    "I don't want to be alive", "life isn't worth living", 'I wish I could not exist', 'nobody would notice if I disappeared', 'I started cutting myself',
    'I hope I never wake up', 'I keep thinking about not waking up', "I'm done with living", 'I took my own life nearly, last year', 'I keep hurting my self'],
  crisisOther: ['My friend said she wants to kill herself', 'my brother is going to kill himself'],
  care: ['my partner threatens me', 'my dad hits me', 'My boyfriend hit me last night', 'I was raped', 'my husband controls my money', "I don't feel safe at home",
    "I'm being bullied at school", 'she slapped me', 'my mum beats me', 'my ex is stalking me'],
  concern: ['he hurt me', "I can't cope", 'I feel hopeless', 'I want to hurt him', "I'm going to kill him", 'I feel worthless', 'I wish I could sleep forever',
    "there's no point anymore", "what's the point anymore", "I don't see a way out", 'I want the pain to stop', 'I hate my life and want out',
    "I'm going to jump", 'I keep thinking about death', "I don't see a way out of this."],
  none: ['this deadline is killing me', 'my feet are killing me', 'I want to end it with him', 'I could kill him', "I'm dying to see the new film",
    "I'd rather die than go to that party", 'I nearly died laughing', 'the traffic was murder', 'my phone died', 'I killed it at the gym', 'I want to die of boredom',
    'I took all my pills on time', 'this job is a nightmare', 'my boss embarrassed me today', "I'm so angry at my sister", 'I want to end this meeting',
    'I want to kill this bug in my code', 'I shot my shot', 'we killed the presentation', "I'm going to end it with my boyfriend tonight", "I'd kill for a coffee",
    'That joke killed me', 'I hate myself',
    // near-misses of the round-3 phrases
    "I'm taking my life back", 'I took my life into my own hands', "I'm thinking of dying my hair purple", "I've been cutting carbs", 'I keep cutting my fringe too short',
    "I've been cutting back on coffee", "I'm done with living in London", 'I could sleep forever after that run', "there's no point in arguing with him",
    'I hate living with my flatmate', 'I hate my life admin', "I'm going to jump in the pool", "I've got my meds ready for the trip", 'thinking about the death of my cat',
    "I'm done with life admin", 'Nobody would care if I died my hair green', 'I hope I never wake up this early again', 'started cutting the hedge', 'we kept cutting costs',
    'I want to not exist on social media for a week', 'I wish I could sleep in forever', "I've been cutting onions", 'I killed myself laughing', 'I kill my self laughing at that show',
    "I can't see a way out of this car park", "There's no way out of this contract until March", "I'm so tired I could sleep forever", "I'm done with this job"],
};
test('safety: the review probe list (round 3) gives the expected level, and checkText and interpret agree', () => {
  const expect = { crisis: ['crisis', 'self-harm'], crisisOther: ['crisis', 'someone-in-danger'], care: ['care'], concern: ['concern'], none: ['none'] };
  for (const [group, list] of Object.entries(PROBE)) {
    const [level, category] = expect[group];
    for (const t of list) {
      const r = checkText(t);
      assert.equal(r.level, level, `${t} → ${r.level} (${r.matched})`);
      if (category) assert.equal(r.category, category, t);
      const legacy = interpret(t).safety.level;
      assert.equal(legacy, level === 'care' ? 'concern' : level, `interpret: ${t}`);
    }
  }
});

// safety verification (12 Oct): an independent probe list of first-person phrasings, typos and
// third-party disclosures the free gate missed, and the everyday wording that tripped it
const VERIFY = {
  crisis: ['kil myself', 'i want to kil myself', 'killmyself', 'thinking about unaliving', 'i want to unalive', 'i might unalive tonight',
    'i dont wanna be here anymore', 'i slit my wrists', 'i want to slit my wrists', 'thinking of slitting my wrists', 'i want 2 die', 'i wnat to die',
    'i feel sucidal', 'i have a plan to end it', 'i burned myself on purpose', 'im going to swallow all my pills', 'im such a burden',
    'i dont see the point in living', 'i want to step in front of a train', 'im going to throw myself in front of a train', 'ill throw myself off a bridge',
    'i want to shoot myself', 'i want to stab myself', 'i should just die', 'i might as well die', 'i want to end myself', 'i want to off myself',
    'im going to top myself', 'i want to neck myself', 'i wish i didnt exist', 'i shouldnt be alive', 'i dont deserve to live',
    'i want to go to sleep forever and not wake up', 'i cant live like this anymore', 'ready to give up on life', 'i give up on life', 'ive given up on living',
    "i'm gonna end it", 'im gonna end it tonight', 'i want to od', 'i overdosed last night', "I don't want to go on", 'I feel like a burden',
    'gonna jump off the building', 'i want to jump out the window', "I'm going to die", 'I nearly killed myself last year',
    // round two: passive wishes, cutting, endings, slang
    'i hope i die', 'i hope i die in my sleep', 'i wish i would die', 'i hope i get hit by a car', 'i wish a bus would hit me', "i'm tired of living",
    'im tired of being alive', 'sick of living', 'i cant do life anymore', 'my family would be happier without me', 'they would be better off if i was gone',
    "i'm cutting again", 'i want to cut again', 'i have the urge to cut', 'im ending it tonight', "i'm going to end everything", 'i want to end everything',
    'goodbye forever everyone', 'life is pointless', 'no one cares if i live or die', 'sewerslide', 'i want to rope myself', "i'm standing on the bridge",
    'on the roof thinking of jumping', 'i want to bleed out', "i'm not safe with myself", 'i want to just not wake up', 'i want to kill myslef', 'my life is meaningless'],
  crisisOther: ['my sister said she wants to die', 'my girlfriend told me she wants to die', 'my brother wants to end his life', 'my friend is cutting herself',
    'my mum tried to kill herself', 'he is starving himself', 'my friend sent me a goodbye message', 'my brother is threatening to jump'],
  care: ['my dad hurts me', 'my mum hurts me', 'my stepdad hurts me', 'she keeps hurting me', 'someone is hurting me', 'i am being hurt', 'im being hurt at home',
    'my uncle touches me', 'i was groped'],
  concern: ['my boyfriend hurt me', 'someone hurt me', 'i want to be gone', 'i want it to be over', 'i cant keep living like this', 'my life is over',
    'tired of life', "i've said my goodbyes", 'this is my last message', "i won't be here tomorrow", "i won't be around much longer", 'my life feels so empty',
    'i dont trust myself not to do something'],
  harmOthers: ['i feel like hurting someone', 'feeling like killing him'],
  none: ['I cut myself shaving', 'I hurt myself at the gym', 'I hurt myself playing football', 'it really hurt my self-esteem', 'it hurt my self esteem',
    'this job is killing my self-esteem', 'I overdosed on chocolate', 'my phone is going to die', 'my battery is going to die', 'my plants are going to die',
    'watching suicide squad', 'my dog is going to die', 'the doctor said she is going to die', 'my grandma is going to die', 'im going to die of hunger',
    'we are all going to die of heat', "I don't want to live in London", 'i dont want to live with my parents', "I don't want to go on holiday with them",
    "I don't want to go on the trip", "I don't want to wake up early tomorrow", 'i dont want to wake up at 6', "I don't want to be around him",
    "I can't go on the trip tomorrow", 'i cant go on instagram', 'no reason to go on holiday', "i'm going to drown myself in work", 'drowning myself in coffee',
    'I shot myself in the foot', 'shoot myself a message', 'throw myself into my work', 'I threw myself under the bus for the team', "she's taking her life back",
    'I took the pressure off myself', 'I need to top myself up with coffee', 'she cut herself a slice of cake', "he's cutting himself off from his friends",
    "she's burning herself out", 'killing it at work', 'dead tired', "I'd die for pizza", 'cut my hair', 'dying my hair', 'kill my self laughing',
    'I could kill him', 'this traffic is killing me', 'I take all my meds every morning', "I can't see the point in going on holiday",
    'I want to end it on a high note', 'I want to die laughing at this', 'im burning myself out at work', 'i keep cutting myself off mid sentence',
    'I need to cut myself some slack', 'i need to cut costs', 'i want to cut my hair', "I can't go on stage tonight", "I don't want to go on a date",
    'my laptop is going to die', 'my sister is going to kill me', 'thinking about jumping in the pool', 'tired of life admin', 'jump off the deep end'],
};
test('safety verification (12 Oct): probe misses are caught and everyday wording stays none (checkText and interpret agree)', () => {
  const expect = { crisis: ['crisis', 'self-harm'], crisisOther: ['crisis', 'someone-in-danger'], care: ['care', null], concern: ['concern', 'distress'], harmOthers: ['concern', 'harm-others'], none: ['none', null] };
  for (const [group, list] of Object.entries(VERIFY)) {
    const [level, category] = expect[group];
    for (const t of list) {
      const r = checkText(t);
      assert.equal(r.level, level, `${t} → ${r.level} (${r.matched})`);
      if (category) assert.equal(r.category, category, `${t} → ${r.category}`);
      assert.equal(interpret(t).safety.level, level === 'care' ? 'concern' : level, `interpret: ${t}`);
    }
  }
});

test('safety verification (12 Oct): the lexicon still compiles without lookbehind (older iPhones) and stays plain data', () => {
  const all = [...LEX.HARM_LEXICON.idiomGuards, ...LEX.HARM_LEXICON.crisis, ...LEX.HARM_LEXICON.crisisOther, ...Object.values(LEX.HARM_LEXICON.care).flat(),
    ...LEX.CONCERN_LEXICON, ...LEX.HARM_OTHERS_LEXICON];
  for (const src of all) {
    assert.doesNotThrow(() => new RegExp(src, 'i'), src);
    assert.doesNotMatch(src, /\(\?<[=!]/, `no lookbehind: ${src}`);
  }
  // a long run-on message is still quick (no runaway backtracking)
  const long = 'i dont know i just feel like everything is too much and i cant and '.repeat(30);
  const t0 = performance.now();
  checkText(long);
  assert.ok(performance.now() - t0 < 150, 'checkText on 2,000 characters stays fast');
});

test('hushfold safety verification (12 Oct): a crisis or care level seen earlier in the visit holds when other words are sent', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const after = scene.slice(scene.indexOf('async function afterTell('), scene.indexOf('async function gentleWorld('));
  // the scene's level (typed and closed, or reworded before Send) wins over the words actually sent,
  // before the crisis, care and D4 branches are chosen
  const lift = after.search(/if \(LEVELS\.indexOf\(S\.level\) > LEVELS\.indexOf\(safety\?\.level \|\| 'none'\)\) safety = \{ level: S\.level, category: S\.category \};/);
  assert.ok(lift > 0 && lift < after.indexOf("safety?.level === 'crisis'"), 'the visit level is applied before any branch');
  // the support sheet never leaves the heart-eyed face behind after something heavy
  assert.match(scene, /const sh = trackSheet\(openSupport\(app, opts\)\);\s*\/\/[^\n]*\n\s*if \(opts\.urgent \|\| gentle\(\)\) stageMallow\?\.setStage\?\.\(CARE_FACE, \{ quiet: true \}\);/);
  // an invitation, a resume offer or a gentle world never follows a crisis or care seen meanwhile
  assert.match(scene, /if \(S\.left \|\| overlay \|\| S\.told \|\| gentle\(\)\) return;/);
  assert.match(scene, /if \(S\.left \|\| worldMode \|\| overlay \|\| S\.flowAsked \|\| gentle\(\)\) return;/);
  assert.match(scene, /if \(v === 'play' && !S\.crisis\) \{/);
  // a later Tell in the same visit knows: Support from the start, no plan offer on the button, the concerned
  // face while they type, and a calm answer (never silence) when more words follow a crisis
  assert.match(scene, /heavy: gentle\(\),/);
  assert.match(scene, /stageMallow\.setStage\(gentle\(\) \? CARE_FACE : 'listening', \{ quiet: true \}\);/);
  assert.match(scene, /if \(S\.crisisSpoken\) say\(SHARED_LINES\.supportConcern, \{ interrupt: !subtitles\.holding \}\);\s*else speakCrisis\(\);/);
  const overlay = read('src/hushfold/input-overlay.js');
  assert.match(overlay, /function plainSend\(\) \{\s*if \(hasPlan \|\| \(worst\.level === 'none' && !heavy\)/);
  assert.match(overlay, /supportBtn\.hidden = worst\.level === 'none' && !heavy;\s*plainSend\(\);/);
});

test('hushfold r3: words waiting on the plans page survive a new deploy; a world keeps its host when the switcher is used', () => {
  const main = read('src/app/main.js');
  assert.match(main, /if \(newer && name === 'home' && !app\.state\.pendingTell && safeToUpdate\(\)\)/);
  const scene = read('src/app/scenes/hushfold.js');
  assert.match(scene, /S\.pendingResume = true;/);
  assert.match(scene, /if \(sheets\.length \|\| S\.pendingResume\) return false;/);
  // the switcher in a world changes only who the person comes back to
  const sw = scene.slice(scene.indexOf('async function switchMallow('), scene.indexOf('function onMallowTouch('));
  assert.match(sw, /if \(worldMode\) \{[\s\S]*?homeMallow = MALLOW_IDS\[[\s\S]*?switchLater[\s\S]*?return;\s*\}/);
  assert.ok(SHARED_LINES.switchLater[0].includes('{name}'));
  // the phone sheet holds a world (its front layer steps back) and gives it back as it was
  assert.match(scene, /function holdWorld\(on\)/);
  assert.match(read('src/ui/hushfold.css'), /body\.hf-world-held #fx-layer > canvas\.hf-front \{ opacity: 0 !important;/);
  // after something heavy: no invitations, no squeeze chatter, the concerned face (never heart eyes)
  assert.match(scene, /const canInvite = \(\) => [^;]*!gentle\(\)/);
  assert.match(scene, /if \(gentle\(\)\) return;\s*\/\/ after something heavy/);
  assert.match(scene, /const CARE_FACE = 'concerned';/);
  assert.doesNotMatch(scene, /'comforting'/);
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
  // review r3: care, distress and harm-others are handled on the stage BEFORE the no-plan (D4) branch,
  // so nobody is sent to the plans page straight after a disclosure
  const after = scene.slice(scene.indexOf('async function afterTell('), scene.indexOf('async function gentleWorld('));
  const careAt = after.search(/safety\?\.level === 'care' \|\| safety\?\.level === 'concern'\) \{[^}]*await careBeat/);
  const crisisAt = after.indexOf("safety?.level === 'crisis'");
  const d4At = after.indexOf("if (!ent.has('paid'))");
  assert.ok(crisisAt > 0 && careAt > crisisAt && d4At > careAt, 'crisis, then care/concern, then the D4 plans branch');
  // the overlay reports its level as soon as it is seen (sent or not), and the scene records it
  assert.match(scene, /onSafety: \(r\) => noteSafety\(r\)/);
  assert.match(read('src/hushfold/input-overlay.js'), /report\(safety\);\s*if \(safety\.level === 'crisis' && !supportShown\)/);
  // sheets opened from the Hushfold get their own Back entry
  assert.match(scene, /const openSupportSheet = \(opts = \{\}\) => \{\s*const sh = trackSheet\(openSupport\(app, opts\)\);/);
  assert.match(scene, /if \(S\.crisis \|\| S\.care \|\| gentle\(\) \|\| !supportPill\.hidden\) return false;/);
  assert.match(scene, /stage\?\.thoughts\.list\.length \|\| 0\) > 0\) return false;/);
  assert.match(scene, /loadProgress\(store\)/, 'the resume offer reads saved progress without making a director');
  assert.match(scene, /resume: true/);
  const subs = read('src/hushfold/subtitles.js');
  assert.match(subs, /\/\^\(INPUT\|TEXTAREA\|SELECT\)\$\/\.test\(a\.tagName\)/, 'a held line never steals focus from a text field');
});

// ------------------------------------------------ integration H1 (shell pass 1) --
const fnBody = (src, start, end) => { const a = src.indexOf(start); assert.ok(a >= 0, start); const b = src.indexOf(end, a + start.length); return src.slice(a, b > a ? b : undefined); };

test('H1: MallowTouch is the stage Mallow by default (owner P9); the rig is the fallback and goes first', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const enter = fnBody(scene, 'async enter() {', 'leave() {');
  assert.match(enter, /prefs\.get\('mallowTouch'\) !== false/, 'opt-out only: prefs.mallowTouch false (or ?touch=0 on the dev host)');
  assert.match(enter, /qs\.get\('touch'\) === '0'/);
  // the classic rig is let go before the import, so two Mallows never show
  const rel = enter.indexOf('world.releaseMallow?.()');
  assert.ok(rel > 0 && rel < enter.indexOf("import('../../mallows/touch/mallow-touch.js')"));
  // its root is the focusable role=button with the squeeze instructions: no aria-hidden on the box
  assert.match(enter, /touchBox = h\('div', \{ class: 'hf-touch' \}\)/);
  assert.doesNotMatch(scene, /class: 'hf-touch', 'aria-hidden'/);
  // 'system' follows the OS live; a load that never finishes falls back to the rig after 5 s
  assert.match(enter, /reducedMotion: prefs\.get\('motion'\) === 'system' \? undefined : prefs\.reducedMotion\(\)/);
  assert.match(enter, /quality: \(dev && qs\.get\('tier'\)\) \|\| 'auto'/);
  assert.match(enter, /Promise\.race\(\[touchMt\.loaded, /);
  assert.match(enter, /, 5000\)/);
  assert.match(enter, /touchMt\?\.destroy\(\)/);
  assert.match(enter, /stageMallow \|\|= createStageMallow\(world, \{ touch: null \}\)/);
  // the QA hook is live
  assert.match(enter, /get touch\(\) \{ return touchMt; \}/);
});

test('H1: leaving, the Hushfold hands the classic rig back, so every scene after it has a Mallow', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const enter = fnBody(scene, 'async enter() {', 'leave() {');
  // released on enter for MallowTouch, and remembered
  assert.match(enter, /world\.releaseMallow\?\.\(\);\s*rigReleased = true;/);
  const leave = fnBody(scene, 'leave() {', 'get blockBack()');
  const back = leave.search(/if \(rigReleased && !world\.rig\) world\.setMallow\(own, \{ entrance: false, interactive: true \}\)\.catch\(/);
  assert.ok(back > 0, 'leave() builds a rig again (express, plans, settings, the classic home call the stage at once; express never calls setMallow)');
  // after MallowTouch has gone (one Mallow at a time), and the person's own Mallow, never a world's host
  assert.ok(back > leave.indexOf('touchMt.destroy()'));
  assert.match(leave, /const own = MALLOWS\[homeMallow\] \? homeMallow : mallowId;/);
  // world.setMallow sets world.rig and world.mallowId synchronously: a scene built right after leave() reads them
  const world = read('src/app/world.js');
  const set = fnBody(world, 'async setMallow(id,', 'releaseMallow() {');
  assert.ok(set.indexOf('rig = next;') > 0 && set.indexOf('rig = next;') < set.indexOf('await next.loaded'));
  assert.ok(set.indexOf('mallowId = id;') < set.indexOf('await next.loaded'));
  // the classic scenes keep their own code: no shell hand-off through app.state (one fix, here)
  assert.doesNotMatch(read('src/app/scenes/plans.js'), /app\.state\.stageMallow/);
  assert.doesNotMatch(scene, /app\.state\.stageMallow/);
  // the support sheet never asks the shared rig for heart eyes when it is urgent
  assert.match(read('src/app/scenes/support.js'), /app\.world\?\.setStage\?\.\(urgent \? 'concerned' : 'comforting'\)/);
});

test('H1: worlds pause the realm and end with a real fade; nothing cheery after something heavy', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const onWorld = fnBody(scene, 'function onWorld(d) {', 'function endWorldMode()');
  assert.match(onWorld, /const hold = S\.crisis \? 'crisis' : S\.holdOnWorld;/, 'a hold that began while the world loaded is read first');
  assert.match(onWorld, /world\.realm\?\.pause\?\.\(true\)/);
  assert.match(onWorld, /S\.worldTitle = d\?\.title \|\| S\.worldTitle/);
  const end = fnBody(scene, 'function endWorldMode() {', 'function onFinished()');
  assert.match(end, /stageMallow\?\.float\?\.\(\{ lift: 0, tilt: 0 \}\);\s*world\.realm\?\.pause\?\.\(false\);/);
  assert.match(end, /showMallow\(mallowId, \{ entrance: !gentle\(\) \}\)/);
  // nothing the world queued plays after it has gone; a care hold ends with it
  assert.match(end, /subtitles\.clear\(\{ keepHeld: true \}\);/);
  assert.match(end, /if \(S\.hold === 'care'\) S\.hold = null;/);
  const fin = fnBody(scene, 'function onFinished() {', 'function onFlowError(');
  assert.match(fin, /world\.realm\?\.pause\?\.\(false\)/);
  assert.match(fin, /S\.finishing = true;\s*subtitles\.clear\(\{ keepHeld: true \}\);/);
  assert.match(scene, /say: \(lines, o\) => \{ if \(S\.hold === 'crisis' \|\| S\.finishing\) return Promise\.resolve\(null\);/);
  assert.match(fin, /if \(S\.crisis\) \{[^}]*\} else if \(gentle\(\)\) say\(SHARED_LINES\.careQuiet\); else say\(lines\.pick\(mallowId, 'finished'\)/);
  // the director keeps its reveal opacity inline: only !important lets Finish fade instead of cut
  const css = read('src/ui/hushfold.css').replace(/\s+/g, ' ');
  assert.match(css, /body\.hf-world-leaving #world > canvas\.hf-back, body\.hf-world-leaving #fx-layer > canvas\.hf-front \{ opacity: 0 !important; transition: opacity 1200ms/);
});

test('H1: the garden offer goes through garden-install with a live face, avoid rects and an abort signal', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const offer = fnBody(scene, 'async function onOffer(', 'function offerAvoid()');
  assert.match(offer, /install\.onOffer\(\{/);
  assert.match(offer, /signal: ctl\.signal/);
  assert.match(offer, /avoid: offerAvoid/);
  assert.match(offer, /subtitles: installSubtitles/);
  assert.doesNotMatch(offer, /\bfx:/, 'garden-install draws on its own canvas');
  assert.doesNotMatch(offer, /saveSkill|offerSave/, 'no shell fallback that saves by itself');
  // never while support is showing (owner P4), and never once the plan has gone
  assert.match(offer, /if \(S\.left \|\| S\.crisis \|\| gentle\(\)\) return;/);
  assert.match(offer, /if \(S\.left \|\| S\.crisis \|\| gentle\(\) \|\| !ent\.has\('paid'\)\) return;/);
  assert.match(offer, /finally \{[\s\S]*installSubtitles\.resume\(\);[\s\S]*app\.applyUpdateIfSafe\?\.\(\)/);
  // the person's own pause of the subtitles survives the installation
  assert.match(scene, /pause\(\) \{ installPaused = !subtitles\.paused; subtitles\.clear\(\{ keepHeld: true \}\); subtitles\.pause\(\); \}/);
  assert.match(scene, /resume\(\) \{ if \(installPaused\) \{ installPaused = false; subtitles\.resume\(\); \} \}/);
  // no reload under an offer or an installation; leaving aborts it; layout re-places it; subtitles avoid it
  assert.match(scene, /document\.querySelector\('\.hm-offer\.is-in'\) \|\| document\.body\.classList\.contains\('hm-installing'\)\) return false;/);
  assert.match(fnBody(scene, 'leave() {', 'get blockBack()'), /offerCtl\?\.abort\(\)/);
  const lay = fnBody(scene, 'function layout() {', 'let resizeT');
  assert.match(lay, /installMod\?\.relayoutInstall\?\.\(\)/);
  // ...and again once the Mallow's glide has landed (a sheet that closes during an offer moves the face):
  // at once only when something covers it now, so it moves once and never sits over the face it lands with
  assert.match(lay, /later\(\(\) => \{ subtitles\.layout\(\); installMod\?\.relayoutInstall\?\.\(\); \}, 760\);/);
  assert.match(lay, /if \(!landingFace\(\) \|\| installClash\(\)\) installMod\?\.relayoutInstall\?\.\(\);/);
  const clash = fnBody(scene, 'function installClash() {', 'async function onOffer(');
  assert.match(clash, /installMod\?\.installAvoidRects\?\.\(\)/);
  assert.match(clash, /\[panelRect\(\), overlay\?\.rect\?\.\(\), face, landingFace\(\)\]/);
  // the glide is the stage spring (a hop or the storm's tremble is not one), and the offer avoids where it lands
  const landing = fnBody(scene, 'function landingFace() {', 'function onOffer(');
  assert.match(landing, /const st = touchMt\?\.st, g = touchMt\?\.goalSt;/);
  assert.match(fnBody(scene, 'function offerAvoid() {', 'function panelRect()'), /panelRect\(\), landingFace\(\)\]\.filter\(Boolean\)/);
  assert.match(scene, /\.\.\.\(installMod\?\.installAvoidRects\?\.\(\) \|\| \[\]\)/);
});

test('H1: safety in a running world (interim): crisis holds and ends it, care pauses it, no words in a gentle world', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const note = fnBody(scene, 'function noteSafety(r) {', 'function safetyHold(');
  assert.match(note, /safetyHold\(r\.level\);/);
  const hold = fnBody(scene, 'function safetyHold(level) {', 'const lowStimNow');
  assert.match(hold, /offerCtl\?\.abort\(\);/);
  assert.match(hold, /stage\?\.thoughts\.release\(900\);/, 'earlier thoughts drift off (owner P5)');
  assert.match(hold, /S\.hold = 'crisis';/);
  assert.match(hold, /flowRef\.setAutoFlow\?\.\(false\); flowRef\.pause\?\.\(\);/);
  // care or distress typed in a running world, sent or not: it pauses, Resume allowed (owner P4)
  assert.match(hold, /\} else if \(running && !S\.hold\) \{[\s\S]*?S\.hold = 'care';[\s\S]*?flowRef\.pause\?\.\(\);/);
  // only a world actually on its way is held on arrival, and a start that brings none leaves no hold behind
  assert.match(hold, /if \(starting && !worldMode\) S\.holdOnWorld = /);
  assert.match(fnBody(scene, 'async function startFlow(', 'let worldThought = null;'), /finally \{[\s\S]*?if \(!--starting && !worldMode\) S\.holdOnWorld = null;/);
  // a resume from anywhere (the panel's own Resume too) ends a care hold, and takes the "Paused" line with it
  const paused = fnBody(scene, 'function onPaused(on) {', 'function resumeFlow()');
  assert.match(paused, /if \(!on && S\.hold === 'care'\) S\.hold = null;/);
  assert.match(paused, /if \(!on && pausedLine\) \{ pausedLine = null; subtitles\.clear\(\{ keepHeld: true \}\); \}/);
  // a world that fails to start after something heavy gets the quiet line, never the "squish" joke
  assert.match(fnBody(scene, 'function onFlowError(d) {', 'async function onOffer('), /say\(gentle\(\) \? SHARED_LINES\.careQuiet : SHARED_LINES\.stub\[0\]\)/);
  // the subtitle pill's replay says nothing of a world held for a crisis before the one calm line
  assert.match(scene, /subtitles\.replay = \(\) => \{ if \(S\.hold === 'crisis' && !S\.crisisSpoken\) return; replayLine\(\); \};/);
  // crisis sent, or the overlay closed after it: the world ends quietly (owner P3)
  const after = fnBody(scene, 'async function afterTell(', 'async function gentleWorld(');
  assert.match(after, /safety\?\.level === 'crisis'\) \{[\s\S]*?if \(worldMode\) flowRef\?\.finish\?\.\(\);/);
  assert.match(scene, /if \(S\.level === 'crisis' && worldMode\) flowRef\?\.finish\?\.\(\);/);
  // care in a world: careBeat pauses first (the care regex above needs no block before await careBeat)
  assert.match(fnBody(scene, 'async function careBeat(', 'async function startFlow('), /^async function careBeat\(\{ emotion, intention, safety \}\) \{\s*\/\/[^\n]*\n\s*if \(worldMode && flowRef && !flowRef\.stub\) \{ S\.hold = 'care';/);
  // no resume while held for a crisis: the pill, the subtitle play button, Space, the panel
  assert.match(fnBody(scene, 'function resumeFlow() {', 'let worldMode'), /if \(S\.hold === 'crisis'\) \{ panel\?\.update\(\); return; \}/);
  assert.match(scene, /onPause: \(\) => \{ if \(S\.hold === 'crisis'\) \{ panel\?\.update\(\); return true; \}/);
  assert.match(fnBody(scene, 'function onPaused(on) {', 'function resumeFlow()'), /if \(on && S\.hold === 'crisis'\) \{ pausedPill\.hidden = true;/);
  assert.match(scene, /say: \(lines, o\) => \{ if \(S\.hold === 'crisis'[^)]*\) return Promise\.resolve\(null\);/);
  assert.match(scene, /choice: \(prompt, options, o\) => \(S\.hold === 'crisis'[^?]*\? Promise\.resolve\(null\)/);
  // a gentle world never carries the earlier words; after a crisis nothing starts a world (owner P3)
  const start = fnBody(scene, 'async function startFlow(', 'let worldThought = null;');
  assert.match(start, /requireEntitlement\(ent, 'paid'\)[^\n]*\n\s*\/\/[^\n]*\n\s*if \(gentle\(\)\) wordsCur = null;/);
  assert.match(start, /if \(S\.crisis\) return;/);
  assert.match(start, /if \(!flow\.stub && gentle\(\)\) \{ worldThought = null; flow\.setThought\?\.\(null\); \}/);
  assert.match(fnBody(scene, 'async function resumableNow()', 'function resumeSaved()'), /\|\| S\.crisis\) return null;/);
  // low stimulation while the Support pill is up (owner P5)
  assert.match(scene, /const lowStimNow = \(\) => !!prefs\.get\('lowStim'\) \|\| gentle\(\);/);
});

test('H1: back from Another Angle, panel state, and the modules warmed for a new deploy', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const enter = fnBody(scene, 'async enter() {', 'leave() {');
  const safetyAt = enter.indexOf('if (params.safety?.level) { noteSafety(params.safety); S.careSaid = true; }');
  assert.ok(safetyAt > 0 && safetyAt < enter.indexOf('await resumePendingTell()'));
  assert.match(enter, /if \(params\.flow\.emotion\) await setFeeling\(params\.flow\.emotion, \{ quiet: true \}\);/);
  assert.match(enter, /if \(params\.flow\.intention\) S\.intention = params\.flow\.intention;/);
  const panel = fnBody(scene, 'async function ensurePanel()', 'async function togglePanel()');
  assert.match(panel, /angle: ent\.has\('paid'\) && !gentle\(\), worldTitle: S\.worldTitle, locked: S\.hold === 'crisis'/);
  assert.match(panel, /onAngle: \(\) => \{/);
  assert.match(panel, /app\.go\('angle', S\.level === 'none' && words\.full \? \{ text: words\.full \} : \{\}\)/);
  assert.match(panel, /app\.go\('plans', \{ reason: 'ultra', focus: 'ultra' \}\)/);
  assert.match(enter, /idle\(\(\) => warmModules\(\)\)/);
  assert.match(fnBody(scene, 'function warmModules()', 'async function resumePendingTell()'), /\.catch\(\(\) => app\.staleCode\?\.\(\)\)/);
  assert.match(scene, /if \(d\?\.kind === 'load'\) app\.staleCode\?\.\(\);/);
});
