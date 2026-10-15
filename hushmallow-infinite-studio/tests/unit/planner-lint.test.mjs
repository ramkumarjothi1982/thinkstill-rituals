// Copy lint: a superset of templates/validate-library.mjs. Every library
// string passes; every bad-copy fixture is rejected by exactly the rule it
// is about (the one documented exception: an emoji is never Latin-1, so the
// emoji fixture also fails latin1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, policy } from '../property/support.mjs';
import { hooksOf, linePools, resolutionsOf } from '../../planner/library.mjs';
import { lintString, lintHook, lintLine, lintEnd, lintLineSet, lintGrief, lintCopy, lintCaption, lintHashtag, countRun, errorsOf, readingWindow, timeClassesOf } from '../../planner/lint-copy.mjs';
import { compilePolicy, termRegex, gluedForm } from '../../planner/policy.mjs';
import { clockTimes, clockClasses, maskClockTimes } from '../../planner/time-words.mjs';
import { indexLibrary } from '../../planner/library.mjs';
import { loadCapabilities } from '../../planner/capabilities.mjs';
import { emptyLedger } from '../../planner/ledger.mjs';
import { planBatch } from '../../planner/pick.mjs';
import { checkSpec } from '../../planner/gspec.mjs';
import { sealSpec } from '../../planner/fingerprint.mjs';
import { sha256Hex } from '../../planner/canonical.mjs';

const rules = (issues) => [...new Set(errorsOf(issues).map((i) => i.rule))].sort();
const ctx = (extra = {}) => ({ lib, policy, ...extra });

test('every library string passes the planner lint (652 texts)', () => {
  let n = 0;
  const bad = [];
  const check = (where, issues) => { n++; for (const i of errorsOf(issues)) bad.push(`${where}: ${i.message}`); };
  for (const t of lib.templates.values()) {
    hooksOf(t).forEach((h) => check(t.id, lintHook(h, ctx())));
    linePools(t).forEach((p, k) => p.forEach((l) => check(t.id, lintLine(l, k, ctx()))));
    resolutionsOf(t).forEach((r) => check(t.id, lintEnd(r.lines, ctx())));
    (t.nameWords || []).forEach((w) => check(t.id, lintString(w, 'name-word', ctx())));
  }
  lib.raw.brand.closers.forEach((c) => check('closer', lintEnd(c, ctx())));
  assert.equal(n, 652);
  assert.deepEqual(bad, []);
});

test('superset: every per-string rule of the library validator rejects its fixture, and only that rule', () => {
  const cases = [
    [() => lintHook(['IIIII IIIII IIIII IIIII IIIII III'], ctx()), ['hook-length']],        // 33 chars, narrow enough to fit the layout
    [() => lintHook(['Me trying to sleep'], ctx()), ['hook-caps']],
    [() => lintHook(['WHY? WHY ME?'], ctx()), ['hook-punct']],
    [() => lintHook(['RED', 'BLUE', 'GREEN'], ctx()), ['hook-lines']],                   // (ONE / TWO / THREE would also be a count)
    [() => lintHook(['MY THERAPIST SAYS HI'], ctx()), ['medical']],
    [() => lintEnd(['Visit Hushmallow today.'], ctx()), ['brand-case']],
    [() => lintLine('Sleepy \u{1F634}', 0, ctx()), ['emoji', 'latin1']],                 // every emoji is outside Latin-1
    [() => lintLine('Thinking about it all over again', 0, ctx()), ['line-length']],        // 32 chars, still wraps 17 + 14
    [() => lintLine('Incomprehensibilities.', 0, ctx()), ['line-wrap']],
    [() => lintLine('One more breath.', 0, ctx()), ['line-breath']],
    [() => lintEnd(['Feelings can rest here a while.'], ctx()), ['end-length']],
    [() => lintString('Nervous', 'name-word', ctx()), ['name-case']],
  ];
  for (const [fn, want] of cases) assert.deepEqual(rules(fn()), want);
});

test('superset: the validator\'s own fixtures are all rejected', () => {
  // templates/validate-library.mjs self-test fixtures (anxiety, breathing instruction, lowercase hook,
  // nervous system, 2 AM on an afternoon template, a ritual too long for 10 s is a G-SPEC rule)
  assert.ok(rules(lintLine('Anxiety again.', 0, ctx())).includes('medical'));
  assert.ok(rules(lintEnd(['Breathe in for four.'], ctx())).includes('breath-hold'));
  assert.ok(rules(lintHook(['me at 2 am'], ctx())).includes('hook-caps'));
  assert.ok(rules(lintEnd(['Calm your nervous system.'], ctx())).includes('medical'));
  assert.deepEqual(rules(lintHook(['ME TRYING TO SLEEP', 'AT 2 AM...'], ctx({ tod: 'afternoon' }))), ['time-word']);
});

test('tone/topic blocklist: one fixture per category', () => {
  const cases = {
    'topic:self-harm': 'I want to hurt myself.', 'topic:death': 'I could just die.', 'topic:illness': 'Feeling a bit sick.',
    'topic:body-food': 'Diet starts Monday.', 'topic:alcohol': 'Wine o\'clock, again.', 'topic:drugs': 'Need more caffeine.',
    'topic:appearance': 'Ugly crying again.', 'topic:self-hatred': 'I feel so stupid.', 'topic:catastrophe': 'Total disaster day.',
  };
  for (const [rule, text] of Object.entries(cases)) assert.deepEqual(rules(lintLine(text, 0, ctx())).filter((r) => r.startsWith('topic:')), [rule], text);
  // explicit phrases on top of single words (the library uses 'snack', 'guilt', 'coffee', 'latte' on their own)
  const phrases = { 'topic:body-food': 'Snack guilt again.', 'topic:alcohol': 'Drinks after work?', 'topic:drugs': 'Getting high tonight.', 'topic:illness': 'Caught a cold.' };
  for (const [rule, text] of Object.entries(phrases)) assert.deepEqual(rules(lintLine(text, 0, ctx())).filter((r) => r.startsWith('topic:')), [rule], text);
  for (const ok of ['After this snack.', 'Coffee: spilled.', 'Perfect latte art.']) assert.deepEqual(rules(lintLine(ok, 0, ctx())), [], ok);
  assert.deepEqual(rules(lintString('Guilt is heavier than the task.', 'caption', ctx())), [], 'a T07 resolution');
  // whole words only: deadline, I'll, trip, public, skill are not hits
  for (const ok of ['THE DEADLINE IS TOMORROW.', "I'LL START AT 3:00.", 'THE WEEK BEFORE MY TRIP', "'NICE WORK' IN PUBLIC", 'A NEW SKILL']) {
    assert.deepEqual(rules(lintHook([ok], ctx())).filter((r) => r.startsWith('topic:')), [], ok);
  }
});

test('Latin-1 only, clean spacing', () => {
  assert.ok(rules(lintLine('Привет there.', 0, ctx())).includes('latin1'));
  assert.ok(rules(lintLine('Smart “quotes” here.', 0, ctx())).includes('latin1'), 'copy stores ASCII; typographic quotes are a render transform');
  assert.ok(!rules(lintLine('Naïve café plans.', 0, ctx())).includes('latin1'), 'Latin-1 letters are fine');
  assert.ok(rules(lintLine('Two  spaces.', 0, ctx())).includes('spacing'));
  assert.ok(rules(lintLine(' Leading.', 0, ctx())).includes('spacing'));
});

test('caution terms are errors unless whitelisted for that exact string', () => {
  assert.ok(rules(lintEnd(['You will feel better.'], ctx())).includes('caution'));
  assert.deepEqual(rules(lintHook(['SAYING YES TO BE NICE', 'AND REGRETTING IT INSTANTLY'], ctx())), [], 'the T13 hook is whitelisted');
  assert.ok(rules(lintHook(['FIXED IT INSTANTLY'], ctx())).includes('caution'), 'the whitelist is per string, not per term');
});

test('brand, app and song names: plain, inflected and in app contexts', () => {
  assert.deepEqual(rules(lintLine('Checking Instagram.', 0, ctx())), ['name:app']);
  assert.deepEqual(rules(lintLine('Starbucks line again.', 0, ctx())), ['name:brand']);
  assert.deepEqual(rules(lintLine('Baby shark on repeat.', 0, ctx())), ['name:song']);
  for (const t of ['Another Zoom.', 'Zoom call at 9.', 'Slack ping at 9.', 'Teams call at 3.', 'Seen on Messenger.', 'Watching Twitch.', 'Googled it twice.', 'Instagrammed it.', 'Snapchatting again.', 'Facetimed Mum.', 'Ubered home.']) {
    assert.deepEqual(rules(lintLine(t, 0, ctx())), ['name:app'], t);
  }
  assert.deepEqual(rules(lintLine('Kindle at bedtime.', 0, ctx())), ['name:brand']);
  assert.deepEqual(rules(lintLine('Mario Kart rage.', 0, ctx())), ['name:brand']);
  // the everyday words stay legal
  for (const ok of ['Zoom in on that.', 'Cut me some slack.', 'Our teams did fine.', 'My eye twitched.', 'Kindling the fire.', 'Bumbling around.', 'Shoot the messenger.']) {
    assert.deepEqual(rules(lintLine(ok, 0, ctx())), [], ok);
  }
  assert.ok(termRegex('google+').test('GOOGLING'), "'+' terms inflect");
  assert.ok(!termRegex('bumble app').test('bumbling'), 'plain terms do not');
});

test('breath-hold phrasing: holds, counts and holds after a breath', () => {
  const holds = ['Hold your breath now.', 'Held my breath again.', 'Hold breath, then let go.', 'Holding in a breath.', 'Breathe deep and hold.',
    'Inhale and hold it.', 'Breath held, all good.', 'Pause your breathing.', 'Stop breathing for a bit.', 'Breathe in for 4.',
    'Try the 4-7-8 thing.', 'Counting to ten.', 'Floating underwater.', 'Breathe in. Hold it.',
    // on-screen breathing instructions (story-library medicalTherapyFlags); no library string has a breath word
    'Take a deep breath.', 'Inhale slowly, friend.', 'Breathe. You are okay.'];
  for (const t of holds) assert.ok(rules(lintEnd([t], ctx())).includes('breath-hold'), t);
  // library strings with 'hold' or 'held' and no breath, and a hold in another sentence than the breath
  for (const ok of ['Hold it together...', "Thoughts get quieter when they're held softly.", 'HOLDING IN THE BEST NEWS OF MY ENTIRE LIFE']) {
    assert.ok(!rules(lintEnd([ok], ctx())).includes('breath-hold'), ok);
  }
});

test('time words must match the chosen time of day (lines included, with exemptions)', () => {
  assert.deepEqual(rules(lintHook(['ME TRYING TO SLEEP', 'AT 2 AM...'], ctx({ tod: 'afternoon' }))), ['time-word']);
  assert.deepEqual(rules(lintHook(['ME TRYING TO SLEEP', 'AT 2 AM...'], ctx({ tod: 'late-night' }))), []);
  assert.deepEqual(rules(lintLine('Feels so far tonight.', 2, ctx({ tod: 'midday' }))), ['time-word']);
  assert.deepEqual(rules(lintLine('Alarm at 6:30.', 0, ctx({ tod: 'dusk' }))), [], 'exempted: a thought about tomorrow');
  assert.deepEqual(rules(lintEnd(['Not every thought', 'needs an answer tonight.'], ctx({ tod: 'golden' }))), ['time-word']);
});

test('every spelling of an explicit clock time pins the time of day', () => {
  const late = ['Up at 2:00 AM.', 'Up at 3 a.m. again.', 'Up at 3am.', 'TWO AM THOUGHTS', 'Up at 02:00.', 'Midnight snack.', '11 at night.', 'Two at night, again.'];
  for (const t of late) {
    assert.deepEqual(rules(lintLine(t, 0, ctx({ tod: 'afternoon' }))), ['time-word'], t);
    assert.deepEqual(rules(lintLine(t, 0, ctx({ tod: 'late-night' }))), [], t);
  }
  // "3 in the morning" is 3 AM to the planner (one clock phrase), but the library validator reads its MORNING
  // keyword: the validator's reading is the floor (FU-3), so no time of day fits, and the text is never planned
  for (const tod of ['morning', 'late-night', 'night', 'afternoon']) assert.deepEqual(rules(lintLine('Up 3 in the morning.', 0, ctx({ tod }))), ['time-word'], tod);
  assert.deepEqual(timeClassesOf('Up 3 in the morning.', { lib, policy }), []);
  assert.match(errorsOf(lintLine('Up 3 in the morning.', 0, ctx())).find((i) => i.rule === 'time-word').message, /library validator reads morning\|pre-dawn\|misty-morning .* the planner reads late-night\|night/);
  assert.deepEqual(rules(lintLine('Lunch at noon.', 0, ctx({ tod: 'late-night' }))), ['time-word']);
  assert.deepEqual(rules(lintLine('Still up at 4 p.m.', 0, ctx({ tod: 'morning' }))), ['time-word']);
  assert.deepEqual(rules(lintLine('Home by 7 in the evening.', 0, ctx({ tod: 'morning' }))), ['time-word']);
  // ambiguous times (no AM/PM) pin nothing, like the library's "6:30"
  for (const t of ['Up at 2:00.', 'Three o\'clock again.', 'See you at 3.']) assert.equal(timeClassesOf(t, { lib, policy }), null, t);
  // contradictory time words fit no ToD at all, even without a spec
  assert.deepEqual(rules(lintHook(['MORNING? IT IS 2 A.M.'], ctx())), ['time-word']);
  // parser details: hours and their classes
  assert.deepEqual(clockTimes('From 11:30 p.m. to 2am, then 13:05 and noon').map((t) => t.hour), [23, 2, 13, 12]);
  assert.deepEqual(clockClasses('8:15 AM', policy.lint.clockTimes.hours), ['morning', 'pre-dawn', 'misty-morning']);
  assert.equal(clockClasses('2 amazing days', policy.lint.clockTimes.hours), null, '"2 am" must be a whole word');
});

test('reading-time pre-check: every copy element is one readable text on its beat-clock window', () => {
  assert.ok(Math.abs(readingWindow(lib.clocks[10], 2) - 1.3) < 1e-9);
  assert.ok(Math.abs(readingWindow(lib.clocks[10], 'hook', { duration: 10 }) - 2.34) < 1e-9, 'cyclic: HOOK_OUT + (D - HOOK_IN)');
  assert.equal(readingWindow(lib.clocks[10], 'hook', { duration: 10, hookWindow: 'first-view' }), 2);
  assert.ok(Math.abs(readingWindow(lib.clocks[15], 'end') - 2.4) < 1e-9);
  const long = 'Time to replay it again.';   // 24 chars: 1.45 s > the 1.3 s L3 window at 10 s
  assert.deepEqual(rules(lintLine(long, 2, ctx({ duration: 10 }))), ['reading-time']);
  assert.deepEqual(rules(lintLine(long, 2, ctx({ duration: 15 }))), []);
  assert.deepEqual(rules(lintLine(long, 3, ctx({ duration: 15 }))), ['line-slot'], 'the 15 s clock has no L4');
  // the hook is read as one block: 44 chars need 2.45 s, the 10 s clock shows it 2.34 s, the 15 s clock 3.06 s
  const hook = ['TRYING TO SLEEP BUT MY', 'BRAIN HAS OTHER PLANS'];
  assert.deepEqual(rules(lintHook(hook, ctx({ duration: 10 }))), ['reading-time']);
  assert.deepEqual(rules(lintHook(hook, ctx({ duration: 15 }))), []);
  assert.deepEqual(rules(lintHook(['ME TRYING TO SLEEP', 'AT 2 AM...'], ctx({ duration: 10 }))), [], '29 chars: 1.7 s, floored to 2.0 s');
  // the end card too: 46 chars need 2.55 s; the 15 s card shows 2.4 s
  assert.deepEqual(rules(lintEnd(['Thoughts get quieter', "when they're held softly."], ctx({ duration: 15 }))), ['reading-time']);
  assert.deepEqual(rules(lintEnd(['Give your feelings', 'somewhere soft to land.'], ctx({ duration: 15 }))), [], 'the approved v2 end card fits');
  const strict = compilePolicy({ ...JSON.parse(JSON.stringify(policy)), reading: { ...policy.reading, hookWindow: 'first-view' } });
  assert.deepEqual(rules(lintHook(['ME TRYING TO SLEEP AT 2 AM', 'AND STILL GOING...'], ctx({ duration: 12, policy: strict }))), ['reading-time'], 'first-view is stricter');
  assert.deepEqual(rules(lintHook(['ME TRYING TO SLEEP AT 2 AM', 'AND STILL GOING...'], ctx({ duration: 12 }))), []);
});

test('layout pre-check with the Fredoka metrics', () => {
  assert.deepEqual(rules(lintHook(['W'.repeat(30)], ctx())), ['layout-hook']);
  assert.deepEqual(rules(lintHook(['MY BRAIN HAS 40 TABS OPEN', 'AND 3 ARE FROZEN'], ctx())), []);
  const wide = compilePolicy({ ...JSON.parse(JSON.stringify(policy)), layout: { ...policy.layout, end: { ...policy.layout.end, maxWidth: 300 } } });
  assert.deepEqual(rules(lintEnd(['Give your feelings'], ctx({ policy: wide }))), ['layout-end']);
});

test('set rules: first words, question marks, grief pairing', () => {
  assert.deepEqual(rules(lintLineSet(['Did they notice?', 'Did I laugh right?', 'Why me.'])), ['lines-first-word']);
  assert.deepEqual(rules(lintLineSet(['Was it me?', 'Did they?', 'Why me?'])), ['lines-questions']);
  const hook = ['WHEN YOU WANT TO TELL THEM', 'SOMETHING AND REMEMBER'];
  assert.deepEqual(rules(lintGrief('T14-missing-someone', hook, ['They\'d love this.', 'Too far away.', 'Hug in the mail, please.'], policy)), ['grief-pairing']);
  assert.deepEqual(rules(lintGrief('T14-missing-someone', hook, ['They\'d love this.', 'Too far away.', 'Missing them a lot.'], policy)), []);
  assert.deepEqual(rules(lintGrief('T14-missing-someone', ['MISSING SOMEONE', 'IN THE QUIET MOMENTS'], ['a', 'b', 'Hug in the mail, please.'], policy)), []);
});

test('lintCopy reports where each issue is; lintCaption checks every line', () => {
  const issues = lintCopy({ hook: ['ME TRYING TO SLEEP', 'AT 2 AM...'], lines: ['Wine time.', 'Was that rude?', 'Why am I like this?'], end: { kind: 'resolution', text: ['All good.'] }, nameWord: null },
    ctx({ template: 'T01-brain-at-2am', tod: 'afternoon', duration: 15 }));
  const where = Object.fromEntries(errorsOf(issues).map((i) => [i.rule, i.where]));
  assert.equal(where['time-word'], 'hook');
  assert.equal(where['topic:alcohol'], 'lines[0]');
  assert.deepEqual(rules(lintCaption('FINE\n\nVisit HUSHMALLOW.com', { lib })), ['brand-case']);
});

// ---- round 3 -------------------------------------------------------------------------------------

test('a hook or end card is one text: every phrase rule also reads its rows joined', () => {
  // each pair: the rows pass one by one; joined they say the banned phrase
  const ends = {
    'topic:self-harm': ['I want to hurt', 'myself today.'], 'topic:death': ['Rest in', 'peace, old me.'],
    medical: ['Calm your nervous', 'system tonight.'], 'name:song': ['Hey, Taylor', 'Swift fans.'], 'name:brand': ['Grab a Burger', 'King on the way.'],
    'topic:body-food': ['Snack', 'guilt is real.'], 'breath-hold': ['Okay... 2...', '3... 4.'],
  };
  for (const [rule, rows] of Object.entries(ends)) {
    for (const r of rows) assert.ok(!rules(lintEnd([r], ctx())).includes(rule), `row "${r}" alone is clean of ${rule}`);
    const found = errorsOf(lintEnd(rows, ctx()));
    assert.ok(found.some((i) => i.rule === rule && /across the row break/.test(i.message)), `${rows.join(' / ')}: ${JSON.stringify(found.map((i) => i.rule))}`);
  }
  const hooks = { 'topic:self-harm': ['WHEN YOU WANT TO END', 'IT ALL'], 'topic:catastrophe': ['ME AT THE END OF THE', 'WORLD'], medical: ['MY NERVOUS', 'SYSTEM AT 2 AM'] };
  for (const [rule, rows] of Object.entries(hooks)) assert.ok(rules(lintHook(rows, ctx())).includes(rule), rows.join(' / '));
  // breath split over the rows: the breath word itself is now caught in each row, and the hold across them
  assert.deepEqual(rules(lintEnd(['Hold your', 'breath now.'], ctx())), ['breath-hold', 'breath-word', 'medical']);
  // ... and joined they say 'holding my breath', an inflection of the banned 'hold my breath' (FU-3)
  assert.deepEqual(rules(lintHook(['ME HOLDING MY', 'BREATH AT 2 AM'], ctx())), ['breath-hold', 'breath-word', 'medical']);
  // the verifier's combined copy: G-SPEC's lintCopy now refuses both elements
  const issues = errorsOf(lintCopy({ hook: ['WHEN YOU WANT TO END', 'IT ALL'], lines: ['Was that weird?', 'Did I say that?', 'Why am I like this?'], end: { kind: 'resolution', text: ['Hold your', 'breath now.'] }, nameWord: null },
    ctx({ template: 'T01-brain-at-2am', tod: 'late-night', duration: 15 })));
  assert.deepEqual([...new Set(issues.filter((i) => i.where === 'hook').map((i) => i.rule))], ['topic:self-harm']);
  assert.ok(issues.some((i) => i.where === 'end' && i.rule === 'medical'));
  // a phrase already inside one row is reported once, and the whitelisted T13 hook stays clean when joined
  assert.equal(errorsOf(lintEnd(['Your panic attack', 'is valid.'], ctx())).filter((i) => i.term === 'panic attack').length, 1);
  assert.deepEqual(rules(lintHook(['SAYING YES TO BE NICE', 'AND REGRETTING IT INSTANTLY'], ctx())), []);
});

test('the planner never picks, and G-SPEC refuses, library copy that is banned only across its rows', () => {
  // a library with split-banned copy added to T01 (a what-if: the real library has none)
  const raw = structuredClone(lib.raw);
  const t01 = raw.templates.find((t) => t.id === 'T01-brain-at-2am');
  t01.hook.variants.push(['WHEN YOU WANT TO END', 'IT ALL'], ['WHEN THE CEILING', 'GETS INTERESTING']);
  t01.resolution.variants.push(['I want to hurt', 'myself today.'], ['Calm your nervous', 'system tonight.'], ['Quiet thoughts', 'can wait.']);
  const lib2 = indexLibrary(raw, { sha256: sha256Hex(JSON.stringify(raw)) });
  const c2 = { lib: lib2, policy, caps: loadCapabilities(lib2), ledger: emptyLedger() };
  const r = planBatch({ ...c2, mode: 'review', count: 400, seed: 33, batch: 'split-probe' });
  assert.equal(r.specs.length, 400);
  const bad = new Set(['WHEN YOU WANT TO END IT ALL', 'I want to hurt myself today.', 'Calm your nervous system tonight.']);
  for (const s of r.specs) {
    assert.ok(!bad.has(s.copy.hook.join(' ')), s.id);
    assert.ok(!bad.has(s.copy.end.text.join(' ')), s.id);
  }
  // control: clean copy added the same way is reachable, so the split copy was excluded by the lint, not by chance
  assert.ok(r.specs.some((s) => s.copy.hook.join(' ') === 'WHEN THE CEILING GETS INTERESTING'), 'the clean added hook is planned');
  assert.ok(r.specs.some((s) => s.copy.end.text.join(' ') === 'Quiet thoughts can wait.'), 'the clean added resolution is planned');
  // hand the split copy to G-SPEC on an otherwise planned spec: library membership passes, the lint does not
  const s = sealSpec({ ...structuredClone(r.specs[0]), copy: { ...r.specs[0].copy, hook: ['WHEN YOU WANT TO END', 'IT ALL'], end: { kind: 'resolution', text: ['I want to hurt', 'myself today.'] } } });
  const g = checkSpec(s, { ...c2, batchSpecs: [s] });
  const ids = g.errors.map((e) => e.rule);
  assert.ok(!ids.includes('copy:hook') && !ids.includes('copy:end'), `both are library entries here: ${ids}`);
  assert.ok(ids.includes('lint:topic:self-harm'), ids.join());
  assert.ok(g.errors.filter((e) => e.rule === 'lint:topic:self-harm').length >= 2, 'the hook and the end card are both refused');
});

test('round 3 clock spellings: dots, spelled minutes, o\'clock AM, military hours, quarter-to, whole phrases', () => {
  const late = ['At 2.30am again.', 'Two-thirty a.m.', 'At 2 o\'clock AM.', 'It is 0200 hours.', 'Quarter to three AM.', '2 oh five a.m.',
    'Two-ish AM.', 'At 3 in the a.m.', 'At oh-two-hundred.'];
  for (const t of late) {
    for (const tod of ['afternoon', 'morning', 'golden']) assert.deepEqual(rules(lintLine(t, 0, ctx({ tod }))), ['time-word'], `${t} on ${tod}`);
    assert.deepEqual(rules(lintLine(t, 0, ctx({ tod: 'late-night' }))), [], `${t} on late-night`);
  }
  // a clock phrase with the library's MORNING keyword inside: the validator's MORNING is the floor, so it fits nothing
  for (const t of ['Two o\'clock in the morning.', 'Up at 3 this morning.', 'Half past two in the morning.']) {
    assert.deepEqual(timeClassesOf(t, { lib, policy }), [], t);
    for (const tod of ['late-night', 'morning']) assert.deepEqual(rules(lintLine(t, 0, ctx({ tod }))).filter((r) => r === 'time-word'), ['time-word'], `${t} on ${tod}`);
  }
  assert.deepEqual(clockTimes('Quarter to five AM, ten to six in the morning, quarter to one a.m.').map((t) => t.hour), [4, 5, 0], 'quarter to five is 4:45');
  assert.deepEqual(clockTimes('quarter-to-five am, 3 in the night, twelve thirty at night').map((t) => t.hour), [4, 3, 0]);
  assert.deepEqual(clockTimes('two o\'clock in the morning').length, 1, 'one phrase, one time');
  assert.equal(maskClockTimes('MORNING? IT IS 2 A.M.'), 'MORNING? IT IS       ');
  assert.deepEqual(rules(lintHook(['MORNING? IT IS 2 A.M.'], ctx())), ['time-word'], 'a keyword outside the clock phrase still counts');
  // not clock times: counts, prices, words
  for (const t of ['1000 hours of practice.', 'Only 19.99 today.', '2 amazing days.', 'Up at 2:00.']) assert.equal(timeClassesOf(t, { lib, policy }), null, t);
});

test('planner time phrases: late night, sunrise and sunset pin their times of day like library time words', () => {
  assert.deepEqual(timeClassesOf('Late night thoughts.', { lib, policy }), ['late-night', 'night']);
  for (const tod of ['afternoon', 'morning']) assert.deepEqual(rules(lintLine('Late night thoughts.', 0, ctx({ tod }))), ['time-word']);
  assert.deepEqual(rules(lintLine('Late night thoughts.', 0, ctx({ tod: 'late-night' }))), []);
  assert.deepEqual(rules(lintLine('Sunrise already?', 0, ctx({ tod: 'late-night' }))), ['time-word']);
  assert.deepEqual(rules(lintLine('Sunrise already?', 0, ctx({ tod: 'morning' }))), []);
  assert.deepEqual(rules(lintLine('Sunset vibes.', 0, ctx({ tod: 'golden' }))), []);
  assert.deepEqual(rules(lintLine('Sunset vibes.', 0, ctx({ tod: 'morning' }))), ['time-word']);
  for (const t of ['The witching hour.', 'After dark again.']) assert.deepEqual(timeClassesOf(t, { lib, policy }), ['late-night', 'night'], t);
  // recollections and plans stay free, as in the library ('What I said at lunch.')
  for (const t of ['Last night was a lot.', 'This evening plans.', 'Breakfast at 2.', 'Too late to move away?']) assert.equal(timeClassesOf(t, { lib, policy }), null, t);
});

test('round 3 breath rules: holds without a breath word, counts, techniques; no breath word in hooks and end cards', () => {
  const holds = ['Hold for a count of four.', 'Hold... 2... 3... 4.', 'Hold that air in.', 'Lungs full, hold still.', 'Keep it in. Hold. Release.',
    'In through the nose.', 'Don\'t let the air out.', 'And hold.', 'Count of five, then go.', 'Hold it for a few seconds.', 'One, two, three, go.',
    '4 in, 7 hold, 8 out.', 'Air in, air out.', 'Fill your lungs.'];
  for (const t of holds) {
    assert.ok(rules(lintLine(t, 0, ctx())).includes('breath-hold'), `line: ${t}`);
    assert.ok(rules(lintEnd([t], ctx())).includes('breath-hold'), `end: ${t}`);
    assert.ok(rules(lintHook([t.toUpperCase()], ctx())).includes('breath-hold'), `hook: ${t}`);
  }
  for (const ok of ['Hold it together...', 'Still counts.', 'Tiny steps still count.', 'Hold on, what?', 'Keep the air fryer on.', 'ME ON HOLIDAY STILL', '40 TABS AND 3 FROZEN']) {
    assert.ok(!rules(lintEnd([ok], ctx())).includes('breath-hold'), ok);
  }
  assert.equal(countRun('Hold... 2... 3... 4.'), '2... 3... 4');
  assert.equal(countRun('Four, three, two and one.'), 'Four, three, two and one');
  assert.equal(countRun('2 of 3, then 4 more'), null, 'words between the numbers');
  // breath words: an error in a hook or end card (policy.lint.breathWords), still the validator's line-breath in lines
  assert.deepEqual(rules(lintEnd(['You can breathe now.'], ctx())), ['breath-word'], 'no pattern needed: the word is enough');
  assert.deepEqual(rules(lintEnd(['A breather is allowed.'], ctx())), ['breath-word']);
  assert.deepEqual(rules(lintHook(['ME AFTER ONE DEEP BREATH'], ctx())), ['breath-word']);
  assert.deepEqual(rules(lintLine('A breather is allowed.', 0, ctx())), ['line-breath']);
});

test('round 3 names and topics: spacing variants, more names, body image and appearance', () => {
  for (const [t, rule] of [['Coca Cola at 3.', 'name:brand'], ['Tik-Tok again.', 'name:app'], ['Face Time with Mum.', 'name:app'], ['PS5 all night.', 'name:brand'],
    ['Photoshop it out.', 'name:app'], ['Wii bowling night.', 'name:brand'], ['Big Mac craving.', 'name:brand'], ['Hinge date tonight.', 'name:app'],
    ['My Squishmallows.', 'name:brand'], ['Twinkle twinkle star.', 'name:song'], ['Red-Bull wings.', 'name:brand'], ['Kitkat break.', 'name:brand'],
    ['On the Gram.', 'name:app'], ['My Legos everywhere.', 'name:brand']]) {
    assert.deepEqual(rules(lintLine(t, 0, ctx())).filter((r) => r.startsWith('name:')), [rule], t);
  }
  for (const ok of ['I phone my mum.', 'On the door hinge.', 'Linked in spirit.', 'Calm down a bit.', 'Kit and Kat.', 'Post it later.']) assert.deepEqual(rules(lintLine(ok, 0, ctx())), [], ok);
  for (const [t, rule] of [['I hate my body.', 'topic:self-hatred'], ['I look so old.', 'topic:body-image'], ['Hating how I look.', 'topic:self-hatred'],
    ['You look awful.', 'topic:body-image'], ['Glow up season.', 'topic:body-image'], ['Grey hairs again.', 'topic:body-image'], ['Want to disappear.', 'topic:self-harm'],
    ['My melatonin.', 'topic:illness'], ['Took a Xanax.', 'topic:illness'], ['Guaranteed to help.', 'topic:claims'], ['Instant calm.', 'topic:claims']]) {
    assert.deepEqual(rules(lintLine(t, 0, ctx())).filter((r) => r.startsWith('topic:')), [rule], t);
  }
  // the library's own lines stay legal (checked for all 652 texts above); spot checks of the near misses
  for (const ok of ['They look so serious.', 'That looks fun.', 'Look at me go!']) assert.deepEqual(rules(lintLine(ok, 0, ctx())), [], ok);
  assert.deepEqual(rules(lintHook(['ME: ACTING NORMAL.', 'MY BODY: VIBRATING'], ctx())), []);
  assert.deepEqual(rules(lintEnd(['Big feelings make', 'small tasks look huge.'], ctx())), []);
});

test('hashtags: banned terms inside glued words are caught, carriers excuse innocent words, fail closed', () => {
  const tag = (t) => rules(lintHashtag(t, { lib, policy }));
  assert.deepEqual(tag('#anxietyrelief'), ['medical']);
  assert.deepEqual(tag('#therapytok'), ['medical']);
  assert.ok(tag('#selfharmawareness').includes('topic:self-harm'));
  assert.ok(tag('#mentalhealth').includes('caution'));
  assert.deepEqual(tag('#tiktokmademebuyit'), ['name:app']);
  assert.deepEqual(tag('#netflixnight'), ['name:app']);
  assert.deepEqual(tag('#holdyourbreath'), ['breath-hold', 'medical']);
  assert.deepEqual(tag('#cocacola'), ['name:brand']);
  assert.deepEqual(tag('#anxiety_relief'), ['medical'], 'underscores do not hide a term');
  // carriers: library copy words ('still') and policy carriers ('pillow', 'chill'); a term no carrier covers still fails
  for (const ok of ['#hushmallow', '#stillcounts', '#pillowtalk', '#chillvibes', '#fluffy', '#illustration', '#bigfeelings', '#cozyvibes', '#sundayscaries', '#smallwins']) assert.deepEqual(tag(ok), [], ok);
  assert.ok(tag('#chillpill').includes('topic:illness'), 'chill covers its own ill, not the pill after it');
  assert.deepEqual(tag('#ig'), ['name:app'], 'a 2-letter term is a hit as the whole tag');
  assert.equal(gluedForm('panic attack'), 'panicattack');
  assert.equal(gluedForm('re:\\bfoo'), null);
  // lintCaption runs it on every tag, once per term
  const cap = errorsOf(lintCaption('FINE\n\nAll good.\n\n#hushmallow #anxietyrelief #starbucks', { lib }));
  assert.deepEqual(cap.map((i) => `${i.rule}:${i.term}`), ['name:brand:starbucks', 'medical:anxiety']);
});

// ---- FU-3: inflections and derived forms, the validator floor for time words, hashtags --------------

test('FU-3: topic lemmas match every inflection (the round-4 reviewer probe), derived words are lemmas of their own', () => {
  const cases = {
    'topic:drugs': ['Smoked again.', 'Vaped all night.', 'Drugged up.', 'Smokes a lot.', 'Smokers outside.', 'Heroin.', 'Got baked.', 'Shrooms again.', 'Lit a joint.'],
    'topic:body-food': ['Dieted all week.', 'Binging again.', 'Starved by noon.', 'Weighed myself.', 'Workouts.', 'Diets.', 'Lost five pounds.', 'Skipped lunch again.', 'Ate way too much.'],
    'topic:illness': ['Puking again.', 'Vomiting.', 'Coughing all night.', 'Sickly feeling.', 'Fevers.', 'Coughs and sneezes.', 'Allergies again.', 'Broke my arm.', 'Ozempic talk.', 'Took an Adderall.'],
    'topic:death': ['Murdering it.', 'Funerals.', 'Corpses.', 'Grieving again.', 'Cemetery walk.', 'Passing away.'],
    'topic:self-harm': ['Self harming.', 'Selfharm.', 'Self-harming.', 'Overdosed.', 'Overdosing.', 'Suicidal thoughts.', 'No reason to live.', 'I want to vanish.', 'Thinking of ending it.'],
    'topic:alcohol': ['Wines.', 'Margarita time.', 'Day drinking.', 'Alcoholics.', 'Got wasted.'],
    'topic:appearance': ['Uglier today.', 'Selfies again.', 'So pretty today.'],
    'topic:self-hatred': ['Stupidest idea.', 'Idiots.', 'Losers.', 'Failures pile up.', 'Hated my life.', 'I am a mess.', 'Such a moron.'],
    'topic:catastrophe': ['Disasters.', 'Nuclear war.', 'The world is ending.', 'Apocalyptic.'],
  };
  for (const [rule, texts] of Object.entries(cases)) for (const t of texts) assert.ok(rules(lintLine(t, 0, ctx())).includes(rule), `${t}: ${rules(lintLine(t, 0, ctx()))}`);
  // the library's banned medical terms are lemmas too (a planner addition on top of the validator's exact terms)
  for (const t of ['Diagnosed again.', 'Panicking a bit.', 'Healed by tea.', 'Therapies.']) assert.deepEqual(rules(lintLine(t, 0, ctx())), ['medical'], t);
  // innocent words that only look like a listed lemma: no derivation, '=' entries exact, notForms
  for (const ok of ['Weighted blanket mode.', 'Ripped jeans again.', 'Weeding the garden.', 'Gravity wins again.', 'Ginger tea, please.', 'Singing loudly.',
    'Public speaking.', 'Warm hugs only.', 'Award night.', 'Little treats.', 'Shooting star!', 'Dinner was good.', 'The winner is me.']) {
    assert.deepEqual(rules(lintLine(ok, 0, ctx())), [], ok);
  }
});

test('FU-3: the reviewer\'s round-4 line probe is refused except for the listed deliberate passes', () => {
  // the six groups of WORK/tmp/vr-wp06-r4/lint-probe.mjs that are topics, names and breath-holds (174 lines, 7 deliberate passes)
  const deliberate = new Set(['One more round.', 'Snorting it.', 'Freckles everywhere.', 'I ruin everything.', 'Total meltdown.', "Don't let it out.", 'Pause at the top.']);
  const probe = ['Cutting again tonight.', 'Done with life.', 'Better off without me.', 'Razor in hand.', 'Wish I was gone.', 'Deceased, basically.', 'My obituary.',
    'Six feet under.', 'Feeling unwell.', 'Sore throat again.', 'Asthma attack.', 'Tummy ache.', 'Back pain.', 'Stomach bug.', 'Chemo day.', 'Diarrhea.',
    'Food poisoning.', 'Injured my knee.', 'Gained a kilo.', 'Fasting today.', 'Keto again.', 'Sugar crash.', 'Junk food night.', 'The scale says no.', 'My BMI.',
    'Counting macros.', 'Mimosa brunch.', 'Bottle of red.', 'Drinking again.', 'Martini night.', 'Liquor run.', 'Sangria please.', 'Bourbon night.', 'Pot brownie.',
    'Bong rip.', 'Pop a molly.', 'Smoked a blunt.', 'Looking cute.', 'Bad skin day.', 'My big nose.', 'Hot or not?', 'I am the worst.', 'I suck.', 'I am trash.',
    'Nobody likes me.', 'Hate my life.', 'Total screwup.', 'Doomsday again.', 'Armageddon vibes.', 'Earthquake drill.', 'Threads post.', 'Tamagotchi.',
    'Post-it notes.', 'Band-Aid on it.', 'Kleenex box.', 'Monopoly night.', 'Bad Romance.', 'Hotline Bling.', 'Blinding Lights.', 'Party in the USA.',
    "Don't Stop Believin'.", 'Rickroll.', 'Big gulp of air.', 'Hold till it hurts.', 'Box it in, 4 by 4.', 'Gasp and freeze.', ...deliberate];
  const missed = probe.filter((t) => !rules(lintLine(t, 0, ctx())).length);
  assert.deepEqual(missed.filter((t) => !deliberate.has(t)), []);
  assert.deepEqual(missed.sort(), [...deliberate].sort(), 'each deliberate pass is still a pass (and documented)');
  // the near misses of the names stay legal
  for (const ok of ['Post it later.', 'A monopoly on naps.', 'Threads of thought.']) assert.deepEqual(rules(lintLine(ok, 0, ctx())), [], ok);
});

test('FU-3: copy lint is a superset of the validator for time words: the validator\'s classes are the floor', () => {
  // the validator reads MORNING in each of these, the clock reads small hours: no time of day fits both
  for (const hook of [["TWO O'CLOCK IN THE MORNING"], ['3 IN THE MORNING AND', 'STILL SCROLLING'], ['UP AT 4 THIS MORNING']]) {
    assert.deepEqual(timeClassesOf(hook.join(' '), { lib, policy }), []);
    for (const tod of ['late-night', 'night', 'morning', 'pre-dawn', 'afternoon']) assert.ok(rules(lintHook(hook, ctx({ tod }))).includes('time-word'), `${hook.join(' / ')} on ${tod}`);
  }
  assert.deepEqual(timeClassesOf("2 O'CLOCK IN THE AFTERNOON", { lib, policy }), ['afternoon', 'midday'], 'readings that agree are untouched');
  // property: wherever the validator reads a time, the planner allows a subset of it (seeded texts from time fragments)
  const frags = ['2 AM', '3 IN THE MORNING', 'MIDNIGHT', 'TONIGHT', 'MORNING', 'AFTER LUNCH', '5 PM', 'BEDTIME', 'ALARM', 'LATE NIGHT', 'SUNRISE', 'NOON',
    "TWO O'CLOCK", '10 AT NIGHT', 'AFTERNOON', 'SUNDAY NIGHT', '02:00', 'AT NIGHT', '9 PM', 'QUARTER TO THREE AM', 'SNOOZE', 'DAWN', '7 IN THE EVENING'];
  let x = 12345, n = 0;
  const rnd = (k) => { x = (x * 1103515245 + 12345) >>> 0; return x % k; };
  for (let i = 0; i < 3000; i++) {
    const text = Array.from({ length: 1 + rnd(3) }, () => frags[rnd(frags.length)]).join(' AND ');
    const v = lib.timeClasses(text), p = timeClassesOf(text, { lib, policy });
    if (!v) continue;
    n++;
    assert.ok(p && p.every((c) => v.includes(c)), `${text}: planner ${p} not within validator ${v}`);
  }
  assert.ok(n > 2000, `${n} texts with validator time words`);
});

test('FU-3: hashtags: inflected and derived lemmas, new names, time words; innocent tags pass', () => {
  const tag = (t) => rules(lintHashtag(t, { lib, policy }));
  for (const [t, rule] of [['#suicidal', 'topic:self-harm'], ['#suicidalthoughts', 'topic:self-harm'], ['#heroin', 'topic:drugs'], ['#ozempic', 'topic:illness'],
    ['#cemetery', 'topic:death'], ['#nuclearwar', 'topic:catastrophe'], ['#kleenex', 'name:brand'], ['#smoking', 'topic:drugs'], ['#selfharming', 'topic:self-harm']]) {
    assert.ok(tag(t).includes(rule), `${t}: ${tag(t)}`);
  }
  // one list goes on every video, so a tag may not name a time of day
  for (const t of ['#2am', '#latenight', '#bedtime', '#brainat2am', '#nightowl', '#4pmslump', '#sundaynight']) assert.deepEqual(tag(t), ['time-word'], t);
  const innocent = ['#hushmallow', '#cozyvibes', '#sleepytime', '#bigfeelings', '#softlife', '#marshmallow', '#overthinking', '#pillowtalk', '#chillvibes', '#smallwins',
    '#sundayscaries', '#socialbattery', '#nostalgia', '#wholesome', '#stillcounts', '#illustration', '#cuddlebuddies', '#studies', '#awareness', '#reward', '#software',
    '#originalcharacter', '#singing', '#weeding', '#goodnight', '#starrynight', '#moonlight', '#teatime', '#naptime', '#snacktime', '#warmhugs', '#blanketfort',
    '#rainyday', '#fireflies', '#lighthouse', '#gardening', '#friday', '#mondaymood', '#cosy', '#kindness'];
  for (const t of innocent) assert.deepEqual(tag(t), [], t);
});

test('FU-3: the brand is one lowercase word, also when split', () => {
  for (const t of ['Hush Mallow time.', 'hush-mallow time.', 'HushMallow time.']) assert.deepEqual(rules(lintLine(t, 0, ctx())), ['brand-case'], t);
  assert.deepEqual(rules(lintHook(['HUSH', 'MALLOW'], ctx())), ['brand-case'], 'across the row break');
  assert.deepEqual(rules(lintEnd(['Download', 'hushmallow.'], ctx())), ['topic:claims'], 'and no call to action');
});

// ---- FU-3 round 2: the stemmer in the lint path, derivation, participle terms, hashtags -----------------------

test('FU-3 r2: derived forms are refused by the stemmer, not by a list (the round-2 verifier probe)', () => {
  const cases = {
    'topic:self-harm': ['Suicidally sad.'],
    'topic:body-food': ['Starvation mode.', 'Fattening snacks.', 'Fasted all day.', 'Thinspo.', 'Proana tips.'],
    'topic:alcohol': ['Drunken night.', 'Drunkenly.', 'Intoxicated.'],
    'topic:death': ['Deathly tired.', 'Murderous mood.', 'Gravestone rubbing.'],
    'topic:illness': ['Bloody Monday.', 'Sickening.', 'Hospitalized.', 'Medicated.', 'Infected.', 'Feverishly.', 'Vomity.', 'Influenza.'],
    'topic:drugs': ['Addicted again.', 'Addiction.', 'Addict.', 'Smoky room.', 'Druggy haze.'],
    'topic:appearance': ['Ugliness.'],
    'topic:self-hatred': ['Stupidly.', 'Idiocy.', 'Worthlessness.', 'Uselessly.'],
    'topic:catastrophe': ['Catastrophically.', 'Disastrously.', 'Warfare.'],
    'topic:violence': ['Violently.', 'Gunfire.'],
    'topic:claims': ['Downloaded.', 'Downloading.'],
    'topic:clinical': ['Psychological.', 'Neurotic.'],
  };
  for (const [rule, texts] of Object.entries(cases)) for (const t of texts) assert.ok(rules(lintLine(t, 0, ctx())).includes(rule), `${t}: ${rules(lintLine(t, 0, ctx()))}`);
  // the library's banned terms derive too, and a participle term stands for its verb (triggered → trigger)
  for (const t of ['Depressing.', 'Depressive.', 'Traumatized.', 'Traumatised.', 'Insomniac.', 'Symptomatic.', 'Triggers.', 'Trigger warning.', 'Gaslit.', 'Toxicity.', 'Insanely tired.', 'Narcissistic.']) {
    assert.deepEqual(rules(lintLine(t, 0, ctx())), ['medical'], t);
  }
  // the message names the word and how it derives
  const msgs = errorsOf(lintLine('Suicidally sad.', 0, ctx())).map((i) => i.message);
  assert.ok(msgs.some((m) => /self-harm topic \("suicide", as "suicidally": a derivative \(\+al \+ly\) of "suicide"\)/.test(m)), msgs.join(' | '));
  assert.ok(msgs.some((m) => /"suicidally", a derivative \(\+al \+ly\) of the banned medical\/therapy\/safety term "suicide"/.test(m)), msgs.join(' | '));
  // each listed derived word is gone from the lists: the stemmer derives it from its base
  for (const [t, rule] of [['Suicidal thoughts.', 'topic:self-harm'], ['Alcoholic.', 'topic:alcohol'], ['Sickly feeling.', 'topic:illness'], ['Apocalyptic.', 'topic:catastrophe']]) {
    assert.ok(rules(lintLine(t, 0, ctx())).includes(rule), t);
  }
});

test('FU-3 r2: innocent look-alikes pass (weight guard, suffix order, notForms), and the library still does', () => {
  for (const ok of ['Gravity wins again.', 'Gravy on everything.', 'A peace treaty.', 'Hospitality.', 'Weightless, floating.', 'A weighty choice.', 'Ginger tea, please.',
    'Fatal error.', 'Father knows.', 'Warm hugs only.', 'Public speaking.', 'Stability first.', 'My heroine.', 'Deadline again.', 'Little treats.', 'Healthy snack.',
    'Gravely serious.', 'Curation is fun.', 'Riotous colour.', 'Undying love.']) {
    assert.deepEqual(rules(lintLine(ok, 0, ctx())), [], ok);
  }
});

test('FU-3 r2: breath words in every form (thought lines, hooks, end cards)', () => {
  for (const t of ['Exhaling slowly.', 'Inhaling.', 'Breathless.']) assert.ok(rules(lintLine(t, 0, ctx())).includes('line-breath'), t);
  assert.ok(rules(lintHook(['ME EXHALING', 'AT 2 AM'], ctx())).includes('breath-word'));
});

test('FU-3 r2: policy lists stay lemmas: no single-word entry derives from another of its category', () => {
  const kept = new Map([['injury', 'a noun of its own (injure + y is a coincidence of the rules)'], ['boozy', "its stem 'booz' is too short for the hashtag search, so the word is listed for #boozy"]]);
  const morph = policy.compiled.morph;
  for (const [cat, terms] of Object.entries(policy.lint.topics)) {
    if (cat === 'source' || cat.startsWith('$')) continue;
    const singles = terms.filter((t) => /^[a-z]+$/.test(t));
    for (const e of singles) {
      if (kept.has(e)) continue;
      const from = singles.find((l) => l !== e && policy.compiled.topics.find((x) => x.cat === cat && x.term === l).match.test(e));
      assert.equal(from, undefined, `${cat}: "${e}" derives from "${from}"; drop it from the list (the stemmer refuses it)`);
    }
  }
  void morph;
});

test('FU-3 r2: hashtags: derived stems and new lemmas refused; reviewed carriers and notForms pass', () => {
  const tag = (t) => rules(lintHashtag(t, { lib, policy }));
  for (const [t, rule] of [['#starvation', 'topic:body-food'], ['#addicted', 'topic:drugs'], ['#depressing', 'medical'], ['#thinspo', 'topic:body-food'],
    ['#proana', 'topic:body-food'], ['#suicidally', 'topic:self-harm'], ['#traumatized', 'medical'], ['#triggers', 'medical'], ['#gaslit', 'medical'], ['#anorexic', 'topic:body-food']]) {
    assert.ok(tag(t).includes(rule), `${t}: ${tag(t)}`);
  }
  // the innocent tags the round-2 verifier found refused, the notForms, and common words with a term inside
  for (const ok of ['#heroine', '#engine', '#ginger', '#origin', '#spill', '#billboard', '#engrave', '#warrior', '#stewardship', '#grievance', '#gravy', '#treaty',
    '#hospitality', '#weightless', '#father', '#margin', '#audience', '#soldier', '#village', '#million', '#absolutely', '#begun', '#brand', '#whisk', '#bell']) {
    assert.deepEqual(tag(ok), [], ok);
  }
  // still fail closed: a word nobody reviewed that holds a term is refused, with the fix in the message
  const i = errorsOf(lintHashtag('#ginseng', { lib, policy }))[0];
  assert.equal(i.rule, 'topic:alcohol');
  assert.match(i.message, /add the word that contains it to policy\.lint\.hashtags\.carriers/);
});
