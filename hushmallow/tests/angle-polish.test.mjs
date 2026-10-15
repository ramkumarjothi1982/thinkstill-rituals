// The QA sweep after Another Angle review round 11 (the angle-polish unit): the Tell's feeling chips beside a loss, a feeling
// the words give to someone else, anger never attributed when another feeling is told, and the consent card's reading area.
// Detection itself (grief.js, backstop.js, markers.js, the safety lexicons) is unchanged: these read what it finds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpret, suggestedFeelings, LOSS_FIT, LOSS_OFFER } from '../src/engine/interpret.js';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief, lossIn } from '../src/hushfold/input-overlay.js';
import { authoredScene, guessGuard, feelingGuard, angerAnswer, angerUnsaid, ownAnger, fairAnger, sceneParts, unsaidLead } from '../src/beyond/authored.js';
import { framesAsGuess } from '../src/beyond/backstop.js';
import { CUE_COVER, nextNoticeStop, PROVIDER_RETENTION, PROVIDER_SAFETY_HOLD, PROVIDER_USE, PROVIDER_DELETE } from '../src/beyond/consent.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
await loadGrief();
const m = { checkText };
/** What the overlay suggests for these words (input-overlay read(): the loss flag and the level it passes). */
function chips(t, lossAware) {
  const safety = readSafety(m, t, lossAware);
  const loss = !!t.trim() && (safety.category === 'loss' || lossIn(t));
  return suggestedFeelings(interpret(t), { loss, level: safety.level });
}
const LOSS_TELLS = {
  miscarriage: 'At the 12 week scan there was no heartbeat. I should have rested more.',
  covid: 'covid took my grandad',
  nan: 'my nan died last week',
};

// ------------------------------------------------------------------------------------------------- 1. loss chips --
test('beside a loss the chips suggest only Grief and Sad, on the main screen and in Another Angle (the QA sweep’s three Tells)', () => {
  for (const [k, t] of Object.entries(LOSS_TELLS)) {
    for (const aware of [true, false]) {
      const s = chips(t, aware);
      assert.deepEqual(s, ['grief', 'sadness'], `${k} (lossAware ${aware}) → ${s}`);
    }
  }
  // the words' own reading would have echoed the self-blame (the QA screenshot: "Rested •", "Obligated •")
  assert.deepEqual(suggestedFeelings(interpret(LOSS_TELLS.miscarriage)), ['rested', 'obligated']);
  // what the words read that fits a loss stays (after grief and sadness), anything else never
  assert.deepEqual(chips('I miss her so much since she died, I feel so lonely', false), ['grief', 'sadness', 'loneliness']);
  for (const t of Object.values(LOSS_TELLS)) for (const id of chips(t, false)) assert.ok(LOSS_FIT.has(id), id);
  assert.deepEqual([...LOSS_OFFER], ['grief', 'sadness']);
  // grief.js through the overlay: deathTalk, livingLoss and strongLoss (the main screen's backstop) all count
  assert.equal(lossIn('my nan has dementia and doesnt know who i am'), true);
  assert.equal(lossIn('the big c got my grandad'), true);
  assert.equal(lossIn(''), false);
});

test('ordinary Tells keep their chips (no loss is read in fifty of them; their suggestions are as before)', async () => {
  const R11 = await import('./probes/r11.mjs');
  assert.deepEqual(R11.MAIN_ORDINARY_50.filter((t) => lossIn(t)), []);
  const before = {
    'I was fuming and gutted and so embarrassed': ['fury', 'disappointment', 'embarrassment'],
    'I feel anxious about my exam tomorrow': ['anxiety'],
    'My boss embarrassed me in front of everyone.': ['embarrassment'],
    'I am so relieved the exam is over': ['relief'],
    'I keep replaying what I said in the meeting': ['overthinking'],
    'I am so angry at my sister': ['anger'],
  };
  for (const [t, ids] of Object.entries(before)) {
    assert.deepEqual(chips(t, true), ids, t);
    assert.deepEqual(chips(t, false), ids, t);
  }
  // a safety cue still never gets a positive feeling (h23 (d)), and distress named stays offered
  assert.deepEqual(chips('he hit me and I am relieved he left', true), []);
  assert.deepEqual(chips('I feel hopeless', true), ['hopelessness']);
});

test('the overlay reads the loss for its chips only: readSafety is unchanged, Sad leads the rest of a heavy row', () => {
  const ov = read('src/hushfold/input-overlay.js');
  assert.match(ov, /const loss = !!t\.trim\(\) && \(safety\.category === 'loss' \|\| lossIn\(t\)\);/);
  assert.match(ov, /suggested = m\.suggestedFeelings \? m\.suggestedFeelings\(reading, \{ loss, level: safety\.level \}\) :/);
  assert.match(ov, /heavyRow \? \['sadness', \.\.\.quick\.filter\(\(id\) => id !== 'sadness'\)\] : quick/);
  // (grief.js is loaded on every screen for the chips; the safety reading still only with lossAware)
  assert.match(ov, /\n  loadGrief\(\);\n/);
  for (const t of Object.values(LOSS_TELLS)) assert.deepEqual(readSafety(m, t, false), checkText(t), t);
});

// --------------------------------------------------------------------------------- 2. someone else's feeling --
test('a feeling the words give to someone else is never suggested as theirs', () => {
  for (const t of ['my mum didnt call me back, she must be angry with me', 'she’s so pissed off with me', 'my boss was furious', 'I feel anxious and he seems annoyed',
    'my mum went to bed without saying goodnight, she must be upset with me', 'they were livid', 'my dog is anxious']) {
    const r = interpret(t);
    const theirs = r.emotions.filter((e) => e.target === 'other').map((e) => e.id);
    assert.ok(theirs.length, `${t}: read as someone else's`);
    for (const id of theirs) assert.ok(!suggestedFeelings(r).includes(id), `${t} → ${id}`);
    for (const e of r.emotions.filter((x) => x.target === 'other')) assert.ok(e.confidence < 0.5, t);
  }
  assert.deepEqual(suggestedFeelings(interpret('my mum didnt call me back, she must be angry with me')), []);
  assert.deepEqual(suggestedFeelings(interpret('I feel anxious and he seems annoyed')), ['anxiety']);
  // their own stays theirs
  for (const [t, id] of [['I’m angry she is late', 'anger'], ['she makes me so angry', 'anger'], ['I am so angry at my sister', 'anger'], ['everyone was laughing and I felt so embarrassed', 'embarrassment']]) {
    assert.ok(suggestedFeelings(interpret(t)).includes(id), t);
  }
});

// ------------------------------------------------------------------------------------- 4. anger never attributed --
const ANGER_WORDS = /\b(?:anger|angry|furious|fury|rage|mad|livid|fuming)\b/i;
const said = (s) => [s.subtitle_line_1, s.subtitle_line_2, s.practical_next_step, s.alternative_angle].filter(Boolean);
const SERVER = {
  overgen: { source: 'server', reasoning_pattern: 'overgeneralisation', interaction_type: 'separate_one', mechanic: 'separate_one', mallow_character: 'zuzu', emotion: 'embarrassment',
    known_fact: 'Your boss embarrassed you in front of everyone.', possible_assumption: '', alternative_angle: '', practical_next_step: 'Write down one thing that went well this week.',
    subtitle_line_1: 'The embarrassing moment is one event, even if it feels like a pattern.', subtitle_line_2: 'One moment is not every moment.', safety_status: 'ok' },
  anger: { source: 'server', reasoning_pattern: 'valid_anger', interaction_type: 'find_boundary', mechanic: 'find_boundary', mallow_character: 'glitzi', emotion: 'anger',
    known_fact: 'Your boss embarrassed you in front of everyone.', possible_assumption: '', alternative_angle: 'Your anger is telling you something.', practical_next_step: 'Decide what you would say next time.',
    subtitle_line_1: 'Being angry about this makes sense.', subtitle_line_2: 'What would you want to ask for?', safety_status: 'ok' },
  pull: { source: 'server', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', mechanic: 'pull_apart', mallow_character: 'zuzu', emotion: null,
    known_fact: 'Your boss spoke to you in a meeting.', possible_assumption: 'Everyone thinks less of you.', alternative_angle: 'They might not have noticed.', practical_next_step: 'Check one fact.',
    subtitle_line_1: 'What happened is one thing.', subtitle_line_2: 'What it means is still open.', safety_status: 'ok' },
};
const played = (t, res, emotion = null) => guessGuard(guessGuard(feelingGuard(res, t, { emotion }), t, { emotion }), t, { emotion });
/** "Show me another angle" through the authored scenes until they run out. */
function rounds(t, emotion = null) {
  const out = [], exclude = [];
  for (let i = 0; i < 8; i++) { const s = authoredScene(t, { emotion, exclude }); out.push(s); if (s.exhausted) break; exclude.push(s.reasoning_pattern); }
  return out;
}

test('embarrassed, humiliated, ashamed: never anger’s scene or lines, with or without a server scene (the QA sweep’s boss)', () => {
  const told = [['My boss embarrassed me in front of everyone.'], ['My boss humiliated me in front of everyone.'], ['My teacher humiliated me in front of the whole class'],
    ['I’m so ashamed, my boss shouted at me in front of everyone'], ['My boss shouted at me in front of everyone and I felt so small'],
    ['My boss shouted at me in front of everyone', 'embarrassment'], ['My boss shouted at me in front of everyone', 'shame'], ['My boss shouted at me in front of everyone', 'hurt']];
  for (const [t, emotion = null] of told) {
    const why = `${t} [${emotion || 'no chip'}]`;
    assert.equal(fairAnger(t), true, why);
    assert.equal(angerUnsaid(t, emotion), true, why);
    assert.equal(angerAnswer(t, { emotion }), false, why);
    const scenes = [...rounds(t, emotion), ...Object.values(SERVER).map((res) => played(t, res, emotion))];
    for (const s of scenes) {
      assert.notEqual(s.reasoning_pattern, 'valid_anger', why);
      assert.notEqual(s.mechanic, 'find_boundary', why);
      assert.notEqual(s.feeling, 'angry', why);
      for (const l of said(s)) assert.doesNotMatch(l, ANGER_WORDS, `${why} → ${l}`);
      // (round 11: the wrong is never the mind's guess)
      assert.equal(s.possible_assumption, '', why);
      for (const l of said(s)) assert.equal(framesAsGuess(l), false, `${why} → ${l}`);
      assert.ok(sceneParts(t, s).guessAsk, `${why}: nothing of theirs is the guess`);
    }
  }
  // the scene that acknowledges it: the one moment lifted out first, on a stated event's own lines
  const boss = authoredScene('My boss embarrassed me in front of everyone.');
  assert.deepEqual([boss.mechanic, boss.feeling, boss.subtitle_line_1], ['separate_one', 'hurt', 'This is real, and it’s taking up a lot of room.']);
  assert.equal(unsaidLead('My boss embarrassed me in front of everyone.'), 'separate_one');
  const withMock = played('My boss embarrassed me in front of everyone.', SERVER.overgen);
  assert.deepEqual([withMock.mechanic, withMock.feeling], ['separate_one', 'hurt']);
  assert.equal(withMock.wrong, true);
});

test('fair anger told as anger still gets its acknowledgement ("I’m furious my boss shouted at me")', () => {
  for (const [t, emotion = null] of [['I’m furious my boss shouted at me'], ['My boss embarrassed me in front of everyone and I’m fuming'], ['My boss embarrassed me in front of everyone', 'anger'],
    ['My boss shouted at me in front of everyone'], ['My manager took the credit for my idea again.']]) {
    const why = `${t} [${emotion || 'no chip'}]`;
    assert.equal(angerAnswer(t, { emotion }), true, why);
    const s = authoredScene(t, { emotion });
    assert.deepEqual([s.reasoning_pattern, s.mechanic, s.subtitle_line_1], ['valid_anger', 'find_boundary', 'Being angry about this makes sense.'], why);
    assert.equal(played(t, SERVER.anger, emotion).subtitle_line_1, 'Being angry about this makes sense.', why);
  }
  // someone else's anger is never theirs
  assert.equal(ownAnger('my boss was furious and humiliated me in front of everyone'), false);
  assert.equal(ownAnger('I’m furious my boss shouted at me'), true);
  assert.equal(ownAnger('it makes me so angry'), true);
});

// ------------------------------------------------------------------------------------------- 3 and 5. layout --
test('the consent card: a sheet on short screens, the More below cue in its own row (never over a line), the approved lines word for word', () => {
  const css = read('src/beyond/styles.js');
  assert.match(css, /@media \(max-height: 700px\) \{\n  \.bx-consent \{ top: calc\(var\(--safe-top, 0px\) \+ 60px\); bottom: calc\(var\(--safe-bottom, 0px\) \+ 10px\); max-height: none;/);
  assert.match(css, /\.bx-more \{ position: relative; flex: none; align-self: center;/);
  assert.doesNotMatch(css, /\.bx-has-more \.bx-scroll \{[^}]*mask-image/);
  assert.match(css, /\.bx-more\.bx-end \{ visibility: hidden; \}/);
  assert.match(css, /\.bx-after \{ text-align: right; text-wrap: balance; \}/);
  assert.match(css, /\.bx-link \{[^}]*padding: 0 4px 0 0;/);
  assert.equal(CUE_COVER, 0);
  const fake = { scrollHeight: 899, clientHeight: 287, scrollTop: 0, clientTop: 0, getBoundingClientRect: () => ({ top: 0 }) };
  assert.equal(nextNoticeStop(fake), 287);
  // Zuzu waits out of sight below the sheet while it is open
  const aa = read('src/beyond/another-angle.js');
  assert.match(aa, /const CONSENT_SHEET_H = 700;/);
  assert.match(aa, /let cy = sheetNotice \? vh \+ B : dockTop\(\) - 14 - B \/ 2;/);
  // the four approved lines (DECISIONS.md), word for word
  assert.equal(PROVIDER_RETENTION, 'Anthropic doesn’t use your words to train its AI. It usually deletes them within 30 days.');
  assert.equal(PROVIDER_SAFETY_HOLD, 'If its automatic safety checks flag a message as breaking its rules, Anthropic can keep it for up to 2 years. It also keeps anything the law requires it to.');
  assert.equal(PROVIDER_USE, 'Anthropic uses your words only to prepare your perspective, to keep its service safe, and where the law requires. It isn’t sent your account or photos, but it sees anything you type, names included.');
  assert.equal(PROVIDER_DELETE, 'Anthropic’s copy is usually deleted within 30 days (kept longer only if flagged or the law requires it). We can’t delete it sooner from here.');
});

test('cards keep their padding, the first guess keeps its name and centres once landed, a quoted line starts with a capital', () => {
  const css = read('src/beyond/styles.js');
  const title = css.match(/\.bx-tag\.card \.bx-card-title \{[^}]*\}/)[0];
  assert.doesNotMatch(title, /nowrap/);
  assert.match(title, /white-space: normal; text-wrap: balance;/);
  const oi = read('src/beyond/mechanics/open-interpretations.js');
  assert.doesNotMatch(oi, /classList\.add\('untitled'\)|classList\?\.add\('untitled'\)/);
  assert.equal((oi.match(/tags\.guessW\.el\.classList\??\.remove\('guess'\)/g) || []).length, 2);
  const aa = read('src/beyond/another-angle.js');
  const cap = aa.match(/const capOpen = \(t\) => [^\n]+/)[0];
  const capOpen = new Function(`${cap.replace('const capOpen = ', 'return ')}`)();
  assert.equal(capOpen('“she must be angry with me” is a guess about what’s going on inside someone else.'), '“She must be angry with me” is a guess about what’s going on inside someone else.');
  assert.equal(capOpen('Being angry about this makes sense.'), 'Being angry about this makes sense.');
  assert.equal(capOpen('What you know: “my boss…”.'), 'What you know: “my boss…”.');
  assert.match(aa, /return subs\.say\(capOpen\(text\),/);
});
