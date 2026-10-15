// The risk screener (src/beyond/risk-screen.js; owner, 15 Oct 2026: "review the detection architecture rather than continuing
// to add narrow phrases"). Unit tests for the normaliser, the frames, the scoring and the context; the dev set's recall by kind;
// the false-positive budgets on the builder's own sets written before calibration (tests/probes/risk-sets.mjs); readSafety on
// both screens; the Another Angle replay with the check-in; the structure that keeps the check-in before anything is made,
// played or sent; and its cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalise, canonical, frames, riskScreen, CARE_AT, CHECK_AT, HISTORY } from '../src/beyond/risk-screen.js';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import { DEATH_CARE, askOutcome } from '../src/app/scenes/hushfold.js';
import { CHECK_IN, PLAY_CHECK } from '../src/hushfold/lines.js';
import { CHECK_IN as ANGLE_CHECK_IN, SAFETY } from '../src/beyond/lines.js';
import { goodbye } from '../src/beyond/angle-first.js';
import { visit, STUBS } from './probes/r10-replay.mjs';
import * as D from './probes/risk-dev.mjs';
import { EVERYDAY, GRIEF } from './probes/risk-sets.mjs';
import * as H from './probes/risk-holdout.mjs';

await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const main = (t, o = {}) => readSafety({ checkText }, t, true, o);
// (Another Angle's Tell overlay: no grief rules, the screener on — openInput's own readSafety passes `screen: true` on both screens)
const angle = (t, o = {}) => readSafety({ checkText }, t, false, { screen: true, ...o });
const lv = (t, o) => riskScreen(t, o).level;
const pct = (n, d) => Math.round((100 * n) / d);

// ------------------------------------------------------------------------------------------------------- normalise --
test('normalise: misspellings, leet, spaced letters, repeated letters, texting, accents, zero-width and emoji', () => {
  const cases = [
    ['i wnat to dei', 'i want to die'], ['I wanna d i e', 'i want to die'], ['k1ll myslef 2nite', 'kill myself tonight'], ['i want 2 d1e', 'i want to die'],
    ['im gonna end it tonite', "i'm going to end it tonight"], ['diiiie', 'die'], ['su1c1de', 'suicide'], ['S.U.I.C.I.D.E', 'suicide'], ['k*ll myself', 'kill myself'],
    ['my husbnd died and i dont wana live', "my husband died and i don't want to live"], ['i cnt go on', "i can't go on"], ['goooodbye everyone', 'goodbye everyone'],
    ['grandmas gone and i wish i was gone 2', 'grandmas gone and i wish i was gone too'], ['wanna b w her', 'want to be with her'], ['café naïve', 'cafe naive'],
    ['i want to die 😭😭', 'i want to die'], ['d​ie', 'die'], ['i want to unalive myself', 'i want to kill myself'], ['kms', 'kill myself'],
    ['ill be gone soon', "i'll be gone soon"], ['i feel ill', 'i feel ill'], ['my id card', 'my id card'], ['sucide is the only way out', 'suicide is the only way out'],
  ];
  for (const [t, want] of cases) assert.equal(normalise(t), want, t);
});

test('normalise never "corrects" an ordinary word (the protected list, first letters, four-letter words only by a slip)', () => {
  for (const t of ['my wife died', 'i like my life', 'i want to dye my hair', 'i want to diet', 'we dine at six', 'tie your laces', 'the kiln is hot', 'i hang out with friends',
    'i have a cold', 'i hear you', 'the world is big', 'i tried my best', 'doing well', 'down the road', 'save it for later', 'a quiet night', 'i read it', 'finally home',
    'the tables are set', 'thought so', 'though not today', 'what a place', 'the bride was late', 'i made a joint decision', 'holding hands', 'a little nose bleed']) {
    assert.equal(normalise(t), t.toLowerCase(), t);
  }
});

test('canonical: contractions written out, possessives run on, sentences and clauses kept apart', () => {
  assert.equal(canonical("i'm done. tonight i'll end it."), ' i am done . tonight i will end it . ');
  assert.equal(canonical("i won't wake up, i'd rather not"), ' i will not wake up , i would rather not . ');
  assert.equal(canonical("i wish i'd died"), ' i wish i had died . ');
  assert.equal(canonical("the dog's lead"), ' the dogs lead . ');
});

// --------------------------------------------------------------------------------------------------------- frames --
test('frames: each family read by meaning, with its slots, not by the sentence', () => {
  const ids = (t) => frames(normalise(t)).hits.map((h) => h.id);
  const has = (t, id) => assert.ok(ids(t).includes(id), `${t}: ${ids(t).join(', ')}`);
  has('i really just want to die', 'end-wish');
  has('i keep thinking about ending it all', 'end-ideate');
  has("i've counted out all the pills", 'means-hoard');
  has('i have been stockpiling my tablets', 'means-hoard');
  has("i've been saving up my meds for when i'm ready", 'means-hoard');
  has('i counted my tablets twice', 'means-count');
  has('by the time you read this', 'fw-read-this');
  has('my will is on the desk and the passwords are in the envelope', 'fw-affairs');
  has("i won't be a burden much longer", 'ab-wont-be-long');
  has("everyone will be happier when i'm not around", 'bu-better-off-when');
  has("i've decided tonight is the night", 'now-decided');
  has('my dad died last year', 'death-named');
});

test('frames: idioms, negation and other people are not the self ending', () => {
  const none = ["i'm dying to see the new film", 'i nearly died laughing', 'this commute is killing me', 'i killed it at the gig', "i'm dead tired", 'i could sleep forever after that shift',
    "i don't want to die", "i'm not going to kill myself", 'i would never kill myself', 'he wants to kill himself', 'i want them to die', 'i want to dye my hair pink',
    'i want to end it with him', "i'll be gone for the weekend", "i won't wake up tomorrow unless i set three alarms"];
  for (const t of none) assert.ok(!frames(normalise(t)).hits.some((h) => h.cat === 'end' && h.w >= 2), `${t}: ${JSON.stringify(frames(normalise(t)).hits)}`);
});

test('weak everyday bounds dampen a frame; they never take the self ending or a means held by the self below the check-in', () => {
  assert.equal(lv('goodbye everyone'), 'check');
  assert.equal(lv('goodbye everyone, see you monday'), null);
  assert.equal(lv('goodbye everyone. see you on monday'), null, 'the next sentence bounds it too');
  assert.equal(lv("i won't be around much longer, my train is here"), null);
  assert.equal(lv('i want to die, this homework is endless'), 'check', 'dampened, never cancelled');
  assert.equal(lv("i've saved up all my pills, see you at work"), 'check');
});

// ------------------------------------------------------------------------------------------------------- scoring --
test('scoring: one cue is a check-in; cues that combine are care', () => {
  assert.equal(CARE_AT, 6); assert.equal(CHECK_AT, 3);
  assert.equal(lv('goodbye world'), 'check');
  assert.equal(lv('this is my last message to you all'), 'check');
  assert.equal(lv("i'm so tired of everything"), 'check');
  assert.equal(lv("i'm so tired of everything. goodbye everyone"), 'care', 'burden + farewell');
  assert.equal(lv('this is it. i love you all. i\'m sorry.'), 'care', 'three farewells: a note');
  assert.equal(lv("i'm done. tonight i end it."), 'care', 'an ending with its time, beside a burden');
  assert.equal(lv("i won't wake up tomorrow and that's okay"), 'care');
  assert.equal(lv("it'll all be over soon and you won't have to carry me anymore"), 'care');
  assert.equal(lv('i want to kill myself'), 'care');
  assert.equal(lv("i'm dying to see the new film"), null);
  assert.equal(lv('my grandpa died last week'), null, 'a death named is never a risk by itself');
  assert.equal(lv('my dad died and i want to be with him'), 'check', 'a death named beside the self joining: asked first (grief.js reads it as care)');
  assert.equal(main('my dad died and i want to be with him').level, 'care', 'the reading as a whole: care');
  // a death named beside hopelessness: a bereavement's known risk, lifted to the check-in's level only — beside the loss, the gentle
  // path with support first (DECISIONS.md: held, never care from the death alone)
  assert.equal(lv("my dad died and i can't go on"), 'check');
  assert.equal(riskScreen("my dad died and i can't go on").score > riskScreen("i can't go on").score, true);
  const held = main("my dad died and i can't go on");
  // (the lexicon's own reading stands: "can't go on" is its crisis)
  assert.ok(['care', 'crisis'].includes(held.level) || (held.level === 'concern' && held.supportFirst), JSON.stringify(held));
  assert.equal(lv("my dad died, i want out"), 'check');
  assert.equal(lv("my dad died and i've counted out all the pills"), 'care', 'care without the death is care beside it');
});

// ------------------------------------------------------------------------------------------------------- context --
test(`context: the visit's last ${HISTORY} Tells combine with these words; an ordinary message never inherits anything`, () => {
  for (const [h, t, want] of D.CONTEXT) {
    const r = riskScreen(t, { history: h });
    assert.ok(want === 'care' ? r.level === 'care' : !!r.level, `${h} → ${t}: ${r.level}`);
  }
  assert.equal(riskScreen('goodbye everyone', { history: ["i'm so tired of everything"] }).context, true);
  for (const [h, t] of D.CONTEXT_NONE) assert.equal(riskScreen(t, { history: h }).level, null, `${h} → ${t}`);
  // a time word alone after a heavy Tell: the check-in at most, never care from what was said before
  assert.notEqual(riskScreen('see you tomorrow', { history: ['i want to die'] }).level, 'care');
  // only the last three count
  assert.equal(riskScreen('goodbye everyone', { history: ["i'm so tired of everything", 'ok', 'fine', 'sure'] }).context, false);
});

// --------------------------------------------------------------------------------------------- dev set, by kind --
test('the dev set: recall by kind (the screener alone; the figures the report quotes)', () => {
  const by = {};
  for (const [t, kind, want] of [...D.POSITIVES, ...D.CHECK_GRIEF_RISK]) {
    const r = riskScreen(t);
    const k = by[kind] ||= { n: 0, care: 0, check: 0, wantCare: 0, careOfWantCare: 0 };
    k.n++; if (r.level === 'care') k.care++; else if (r.level === 'check') k.check++;
    if (want === 'care') { k.wantCare++; if (r.level === 'care') k.careOfWantCare++; }
  }
  for (const [h, t] of D.CONTEXT) { const r = riskScreen(t, { history: h }); const k = by.context ||= { n: 0, care: 0, check: 0 }; k.n++; if (r.level === 'care') k.care++; else if (r.level === 'check') k.check++; }
  const rows = Object.entries(by).map(([k, v]) => `${k}: ${v.n} · care ${v.care} (${pct(v.care, v.n)}%) · care|check ${v.care + v.check} (${pct(v.care + v.check, v.n)}%)`);
  console.log(`  dev recall by kind:\n    ${rows.join('\n    ')}`);
  // (after a death, grief.js reads the joining and following itself: the screener alone need not)
  for (const [kind, v] of Object.entries(by)) assert.ok(v.care + v.check >= (kind === 'grief-risk' ? 0.85 : 0.95) * v.n, `${kind}: ${v.care + v.check}/${v.n} handled`);
  assert.equal(by.explicit.care, by.explicit.n);
  assert.equal(by.misspelled.care, by.misspelled.n);
});

// ----------------------------------------------------------------------------------- false positives (budgets) --
test('false positives on the builder\'s own sets written before calibration: check-in ≤ 15%, care ≤ 3% of 80 everyday; care ≤ 5% of 40 griefs', () => {
  assert.equal(EVERYDAY.length, 80); assert.equal(GRIEF.length, 40);
  const ev = EVERYDAY.map((t) => lv(t)), gr = GRIEF.map((t) => lv(t));
  const evCheck = ev.filter((l) => l === 'check').length, evCare = ev.filter((l) => l === 'care').length, grCare = gr.filter((l) => l === 'care').length;
  console.log(`  screener: everyday check ${evCheck}/80, care ${evCare}/80; grief check ${gr.filter((l) => l === 'check').length}/40, care ${grCare}/40`);
  assert.ok(evCheck <= 12, `check-in ${evCheck}/80`);
  assert.ok(evCare <= 2, `care ${evCare}/80`);
  assert.ok(grCare <= 2, `grief care ${grCare}/40`);
  // ordinary grief keeps the gentle path on the main screen (the reading as a whole): never care from the screener
  for (const t of GRIEF) assert.notEqual(main(t).category, 'self-risk', t);
  const gentle = GRIEF.filter((t) => { const r = main(t); return r.level === 'concern' && r.category === 'loss'; }).length;
  assert.ok(gentle >= 36, `gentle ${gentle}/40`);
});

test('the dev set as a whole on both screens (readSafety and the replay): every concerning message is handled before anything plays', () => {
  const rows = { main: { care: 0, check: 0, n: 0 }, angle: { care: 0, asked: 0, n: 0 } };
  const missed = [];
  for (const [t] of [...D.POSITIVES, ...D.CHECK_GRIEF_RISK]) {
    const r = main(t);
    rows.main.n++;
    if (r.level === 'care' || r.level === 'crisis') rows.main.care++; else if (r.check || r.supportFirst || r.level === 'concern') rows.main.check++; else missed.push(`main: ${t}`);
    const R = visit(t, { server: STUBS.pull, walk: 1, answer: null });
    rows.angle.n++;
    if (['care', 'follow', 'crisis'].includes(R.route)) rows.angle.care++; else if (R.question === 'check' || R.route === 'gentle') rows.angle.asked++; else missed.push(`angle: ${t}`);
  }
  console.log(`  dev, whole reading: main care ${rows.main.care}/${rows.main.n}, check-in or support first ${rows.main.check}; Another Angle care ${rows.angle.care}/${rows.angle.n}, check-in or gentle ${rows.angle.asked}; missed ${missed.length}${missed.length ? `:\n    ${missed.join('\n    ')}` : ''}`);
  assert.ok(missed.length <= 0.03 * rows.main.n * 2, `${missed.length} missed`);
});

test('the dev set\'s everyday sayings and griefs (the checks\' and round 6\'s): never the screener\'s care', () => {
  for (const t of [...D.CHECK_EVERYDAY, ...D.R6_EVERYDAY, ...D.CHECK_GRIEF]) assert.notEqual(lv(t), 'care', t);
});

test('the builder holdout (written before the final calibration, never tuned against): recorded, not tuned', () => {
  const pos = H.HOLDOUT_POSITIVES.map(([t]) => lv(t)), ctx = H.HOLDOUT_CONTEXT.map(([h, t]) => lv(t, { history: h }));
  const ev = H.HOLDOUT_EVERYDAY.map((t) => lv(t)), gr = H.HOLDOUT_GRIEF.map((t) => lv(t));
  const n = (xs, l) => xs.filter((x) => (l ? x === l : !!x)).length;
  console.log(`  holdout: positives handled ${n(pos)}/${pos.length} (care ${n(pos, 'care')}), context ${n(ctx)}/${ctx.length}; everyday check ${n(ev, 'check')}/${ev.length} care ${n(ev, 'care')}; grief care ${n(gr, 'care')}/${gr.length}`);
  assert.equal(pos.length, 30);
});

// ------------------------------------------------------------------------------------------- readSafety, both --
test('readSafety on both screens: the screener\'s care is care (self-risk), its check is the check-in, misspellings reach the lexicon', () => {
  for (const read of [main, angle]) {
    const care = read("i've counted out all the pills");
    assert.deepEqual([care.level, care.category], ['care', 'self-risk']);
    assert.equal(read("i won't be a burden much longer").category, 'self-risk');
    assert.equal(read('i wnat to dei').level, 'crisis', 'the lexicon reads the normalised words too');
    assert.equal(read('i wanna kil myslef').level, 'crisis');
    assert.equal(read('goodbye world, i love you all').level === 'care' || read('goodbye world, i love you all').check, true);
    assert.equal(read('i failed my maths test').check, undefined);
    assert.equal(read('goodbye everyone, see you monday').check, undefined);
  }
  // the check-in beside nothing more serious; beside distress, support first
  const ck = main('this is my last message to you all');
  assert.ok(ck.level === 'care' || ck.check, JSON.stringify(ck));
  const distress = main("i can't do this anymore");
  assert.equal(distress.level, 'concern'); assert.equal(distress.supportFirst, true);
  // context reaches readSafety
  assert.equal(main('goodbye everyone', { history: ["i'm so tired of everything"] }).level, 'care');
  // ordinary grief: the gentle path, untouched
  for (const t of ['my grandpa died last week', 'our cat was put down yesterday']) assert.deepEqual([main(t).level, main(t).category, !!main(t).supportFirst], ['concern', 'loss', false], t);
  assert.ok(DEATH_CARE.has('self-risk'));
  assert.deepEqual(goodbye({ level: 'care', care: true, category: 'self-risk' }).params, { safety: { level: 'care', category: 'self-risk' } });
});

// ---------------------------------------------------------------------------------- Another Angle, the replay --
test('Another Angle (replay): care is care with 0 requests; the check-in is asked before anything is sent; "Not really" sends nothing', () => {
  const EVERY = [null, ...Object.values(STUBS).filter((s) => typeof s === 'function')];
  for (const t of ["i've counted out all the pills", "i won't be a burden much longer", "everyone will be happier when i'm not around", "i've been saving up my meds for when i'm ready"]) {
    for (const s of EVERY) {
      let n = 0; const server = s ? (x, o) => { n++; return s(x, o); } : null;
      const R = visit(t, { server, walk: 1 });
      assert.ok(['follow', 'care', 'crisis'].includes(R.route), `${t}: ${R.route}`);
      assert.deepEqual([n, R.asked], [0, false], t);
      if (R.route !== 'crisis') assert.deepEqual(R.careLines, SAFETY.follow);
    }
  }
  const t = "i'm so tired of everything";
  let n = 0; const server = (x, o) => { n++; return STUBS.pull(x, o); };
  const asked = visit(t, { server, walk: 1, answer: null });
  assert.deepEqual([asked.asked, asked.question, asked.requestsBeforeAnswer, asked.route, n], [true, 'check', 0, 'quiet', 0]);
  assert.ok(asked.said.includes(ANGLE_CHECK_IN.ask));
  const lite = visit(t, { server, walk: 1, answer: 'notreally' });
  assert.deepEqual([lite.route, lite.requests, n], ['carelite', 0, 0]);
  const ok = visit(t, { server, walk: 1, answer: 'angle' });
  assert.equal(ok.route, 'play'); assert.equal(ok.requests, 1, '"I\'m okay": the request goes to the server, which checks again');
  const be = visit(t, { server, walk: 1, answer: 'be' });
  assert.deepEqual([be.route, be.requests], ['be', 0]);
  // context: the visit's earlier Tells count
  assert.equal(visit('goodbye everyone', { server: STUBS.pull, history: ["i'm so tired of everything"] }).route, 'follow');
  // ordinary words: the usual question, unchanged
  assert.equal(visit('i failed my maths test', { server: STUBS.pull, walk: 1, answer: null }).question, 'choice');
});

// ------------------------------------------------------------------------------------------------- structure --
test('main screen: the check-in replaces the question with the same machinery; "Not really" is support first and no world', () => {
  assert.deepEqual([CHECK_IN.ask, CHECK_IN.okay, CHECK_IN.notReally, CHECK_IN.stay], ['Before we go on — are you okay right now?', 'I’m okay — let’s play', 'Not really', 'Just be with it']);
  assert.equal(CHECK_IN.heard, 'Thank you for telling me. You don’t have to hold this on your own.');
  assert.equal(CHECK_IN.stay, PLAY_CHECK.stay);
  assert.equal(askOutcome('notreally'), 'notreally');
  const hf = read('src/app/scenes/hushfold.js');
  const after = between(hf, 'async function afterTell(', 'async function askPlay(');
  assert.match(after, /=== 'ask'\) \{\s*\/\/[^\n]*\n\s*S\.askCheck = !!safety\?\.check;/);
  assert.match(after, /const out = askOutcome\(await askPlay\(kept\), \{ telling: !!overlay \}\);/);
  assert.ok(after.indexOf("if (out === 'notreally') { await careLite({ emotion, intention }); return; }") > after.indexOf('askPlay(kept'));
  assert.ok(after.indexOf('askPlay(kept') < after.indexOf('spawnThought('), 'asked before any Thought Mallow');
  assert.ok(after.indexOf('askPlay(kept') < after.indexOf("app.go('plans'"), 'asked before the plans page');
  const ask = between(hf, 'async function askPlay(', 'function focusTell(');
  // (fix round, the safety floor: the Support pill is up for every question now, the check-in's included — and stays after it)
  assert.match(ask, /if \(check\) markChecked\(\);\s*supportPill\.hidden = false; layout\(\);/);
  assert.match(ask, /const v = check \? await askCheckIn\(pick\) : await subtitles\.choice\(PLAY_CHECK\.ask,/);
  assert.match(ask, /subtitles\.choice\(CHECK_IN\.ask, \[\{ label: CHECK_IN\.okay, value: 'play', onPick: pick\('play'\) \}, \{ label: CHECK_IN\.notReally, value: 'notreally', onPick: pick\('notreally'\) \}, \{ label: CHECK_IN\.stay, value: 'stay', onPick: pick\('stay'\) \}\],/);
  assert.match(ask, /timeoutMs: PLAY_CHECK\.ms, transient: true, ask: true, checkIn: true, focus: true, waitHidden: true/);
  assert.doesNotMatch(ask, /primary/, 'equal weight');
  const lite = between(hf, 'async function careLite(', 'async function gentleWorld(');
  assert.match(lite, /noteSafety\(\{ level: 'concern', category: 'check-in', supportFirst: true \}\)/);
  assert.match(lite, /label: CHECK_IN\.support, value: 'support', primary: true/);
  assert.doesNotMatch(lite, /startFlow|playCalm|spawnThought/);
  // the visit's recent Tells: in memory only, the last 3, given to the overlay
  assert.match(hf, /recent: \[\],/);
  assert.match(hf, /history: S\.recent\.slice\(-3\),/);
  assert.doesNotMatch(hf, /store\.set\([^)]*recent/);
});

test('Another Angle: the check-in before anything is sent; "Not really" sends nothing for the rest of the visit', () => {
  assert.deepEqual([ANGLE_CHECK_IN.ask, ANGLE_CHECK_IN.angle, ANGLE_CHECK_IN.notReally, ANGLE_CHECK_IN.be], ['Before we go on — are you okay right now?', 'I’m okay — show me another angle', 'Not really', 'Just be with it']);
  assert.equal(ANGLE_CHECK_IN.options[0].value, 'support');
  const aa = read('src/beyond/another-angle.js');
  const start = between(aa, 'async function startAngle(', 'const FIRST_QUESTION');
  assert.ok(start.indexOf("if (S.check && !another) step = 'check';") < start.indexOf('client.angle('), 'asked before any request');
  assert.ok(start.indexOf("if (v === 'notreally') return careLite();") < start.indexOf('client.angle('));
  assert.ok(start.indexOf('if (S.notReally) return careLite();') < start.indexOf('client.angle('));
  const lite = between(aa, 'async function careLite(', '/** The words → a Thought Mallow');
  assert.doesNotMatch(lite, /client\s*(?:\.|\?\.)/);
  const after = between(aa, 'async function afterTell(', 'function firstLook(');
  assert.ok(after.indexOf("if (scr.level === 'care') { noteSelfRisk(); careMode({ lines: SAFETY.follow }); return; }") < after.indexOf('startAngle('));
  assert.match(aa, /history: S\.recent\.slice\(-3\),/);
});

test('the server keeps a byte-identical copy of the screener (npm run sync:screen)', () => {
  assert.equal(read('server/another-angle/src/safety/risk-screen.js'), read('src/beyond/risk-screen.js'));
  assert.doesNotMatch(read('src/beyond/risk-screen.js'), /^import /m, 'pure: no imports from the app');
});

// ------------------------------------------------------------------------------------------------------- cost --
test('cheap: under 10 ms at 600 characters (median of 7, its own worst repeats)', () => {
  for (const s of ['goodbye everyone ', 'tell mum i love her and ', 'i will not be here ', 'by the time you read this ', 'my mum died and i want to be with her ', 'k i l l ', 'not ', 'i want to ']) {
    const t = s.repeat(Math.ceil(600 / s.length)).slice(0, 600);
    riskScreen(t);
    const runs = [];
    for (let k = 0; k < 7; k++) { const a = performance.now(); riskScreen(t); runs.push(performance.now() - a); }
    runs.sort((x, y) => x - y);
    assert.ok(runs[3] < 10, `${JSON.stringify(s)}: ${runs[3].toFixed(2)} ms`);
  }
});
