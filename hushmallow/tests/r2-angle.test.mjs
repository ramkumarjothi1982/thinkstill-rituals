// Final round 2, unit "Another Angle and detection" (the two final reviews of 'Ask before every world', 8dd972c).
//
//   1. the wish to do what someone who died did is CARE on both screens with nothing sent: a structural rule (grief.js
//      followsTheAct), never a longer list; and the gentle path never sends a suicide death beside a first-person future
//   2. Another Angle: every new Tell is asked again, the same words included; only the gentle answers are remembered
//   3. the question let go (no answer, Back): the rest of the visit stays quiet
//   4. death words about a thing, a place, an event, a game, a book or a creature: asked first, never the gentle path
//   5. "Just be with it" for ordinary words is a quiet path of its own: no safety level sent home, the ordinary goodbye
//   6. the question: kept words, never timed out while the page is hidden, about 45 s, focus on its first answer
//   7. a grief-family feeling with no words is gentle; the two answers carry equal weight; "Just be with it" is asked again
//
// The reviews' phrasings are read verbatim from tests/probes/r2-angle.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import * as GR from '../src/beyond/grief.js';
import { lossRoute, bagWords, FRAMING_MECHANICS } from '../src/beyond/backstop.js';
import { framesScene } from '../src/beyond/authored.js';
import { firstStep, answerKey, questionClock, goodbye, QUESTION_BACK_MS, BE_ASKS_AGAIN, ASK_BEFORE_ANGLE } from '../src/beyond/angle-first.js';
import { ANGLE_CHOICE, BE_WITH, GRIEF, SAFETY, END } from '../src/beyond/lines.js';
import { tellRoute } from '../src/app/scenes/hushfold.js';
import { visit, STUBS, ALL_SCENE_STUBS } from './probes/r10-replay.mjs';
import * as P from './probes/r2-angle.mjs';
import * as R12 from './probes/r12.mjs';
import * as R13 from './probes/r13.mjs';

await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const AA = read('src/beyond/another-angle.js');

/** The main screen's route (input-overlay readSafety, lossAware): care | gentle | question | ordinary. */
function main(t, emotion = null) {
  const r = readSafety({ checkText }, t, true, { emotion });
  if (r.level === 'crisis' || r.level === 'care') return 'care';
  if (r.level === 'concern') return r.category === 'loss' ? 'gentle' : 'care';
  return r.unsure ? 'question' : 'ordinary';
}
/** Another Angle's route (afterTell → startAngle → firstStep): care | gentle | question | ordinary. */
function angle(t, emotion = null) {
  const c = checkText(t);
  // (r3-esc) a suicide named is care too, whatever the clause (another-angle.js afterTell suicideDeath)
  if (c.level === 'crisis' || c.level === 'care' || GR.deathEscalation(t) || GR.suicideDeath(t)) return 'care';
  const step = firstStep(t, { emotion });
  if (step === 'gentle') return 'gentle';
  assert.equal(step, 'choice', `${t}: every other Tell is asked first`);
  return lossRoute(t, { emotion }) === 'ask' ? 'question' : 'ordinary';
}
const framed = (R) => R.scenes.some((s) => !s.grief && (FRAMING_MECHANICS.has(s.mechanic) || framesScene(s)));

// ------------------------------------------------------------------------- 1. the escalation --
test('item 1: every escalation phrasing of the semantic review, verbatim, is care on both screens with 0 requests (every stub)', () => {
  assert.equal(P.SEM_ESC_POS.length, 18);
  for (const t of P.SEM_ESC_POS) {
    assert.deepEqual([main(t), angle(t)], ['care', 'care'], t);
    assert.equal(GR.deathEscalation(t), true, t);
    for (const s of ['none', ...ALL_SCENE_STUBS]) {
      const R = visit(t, { server: STUBS[s] || null });
      assert.ok(['follow', 'care', 'crisis'].includes(R.route), `${t} @${s}: ${R.route}`);
      assert.deepEqual([R.requests, R.asked, R.mechanics.length, R.scenes.length], [0, false, 0, 0], `${t} @${s}`);
    }
  }
  // the main screen's reading has the shape every escalation has (care / death-follow; r3-esc: its own category, it was 'unsafe')
  assert.deepEqual(readSafety({ checkText }, P.SEM_ESC_POS[0], true), { level: 'care', category: 'death-follow', matched: null });
});

test('item 1: the rule is structural: this unit\'s own variants are care, their ordinary neighbours and the review\'s negatives never are', () => {
  for (const t of P.ESC_STRUCT_POS) assert.deepEqual([main(t), angle(t)], ['care', 'care'], t);
  for (const t of [...P.ESC_NEG, ...P.ESC_STRUCT_NEG]) {
    assert.equal(GR.deathEscalation(t), false, t);
    // (r3-esc, by design) a negative that names a suicide is care on both screens now, with the gentle care lines: one
    if (GR.suicideDeath(t)) { assert.equal(t, 'my uncle killed himself years ago and we still miss him'); assert.deepEqual([main(t), angle(t)], ['care', 'care'], t); continue; }
    assert.notEqual(main(t), 'care', t);
    assert.notEqual(angle(t), 'care', t);
  }
  assert.ok(P.ESC_NEG.length >= 15, `${P.ESC_NEG.length} negatives`);
  // the brief's own three
  for (const t of ['my dad died and I want to do the same course he did', "my grandad died and I'll go the same way to school he took me", 'mum died and I might visit her grave']) assert.equal(main(t), 'gentle', t);
  // every earlier escalation set holds: positives care, negatives not
  for (const t of [...R12.R5_ESC_POS, ...R12.R5_R3_ESC_POS, ...R13.ESCALATION_POS]) assert.equal(GR.deathEscalation(t), true, t);
  for (const t of [...R12.R5_ESC_NEG, ...R12.R5_R3_ESC_NEG, ...R13.ESCALATION_NEG]) assert.equal(GR.deathEscalation(t), false, t);
  // it is a rule, not a list: the clause pieces are read, never the review's sentences
  const src = read('src/beyond/grief.js');
  const code = src.split('\n').filter((l) => !/^\s*(?:\/\/|\/?\*)/.test(l)).join('\n');
  for (const t of P.SEM_ESC_POS) assert.ok(!code.toLowerCase().includes(t.toLowerCase().replace(/'/g, '')), `not pinned as a phrase: ${t}`);
  assert.match(src, /export function followsTheAct\(text\)/);
  assert.match(between(src, 'export function deathEscalation(', '// --------------------------------------------------------------- the server --'), /followsTheAct\(text\)/);
  console.log('r2-angle escalation counts:', JSON.stringify({ reviewPositives: P.SEM_ESC_POS.length, ownPositives: P.ESC_STRUCT_POS.length, negatives: P.ESC_NEG.length, ownNegatives: P.ESC_STRUCT_NEG.length }));
});

test('item 1: a fear, a "never", someone else, a plan or dying old is not the wish (after a death that was not a suicide)', () => {
  assert.equal(GR.followsTheAct("my mum died of cancer and I'm scared I'll go the same way"), false);
  assert.equal(GR.followsTheAct("my dad drank himself to death and I don't want to go the same way"), false);
  assert.equal(GR.followsTheAct("my nan died peacefully and I want to go the same way when I'm old"), false);
  // after a suicide, fear of doing the same is care too (support first, nothing sent)
  assert.equal(GR.deathEscalation("my dad killed himself and I'm scared I'll go the same way"), true);
  // "I can't stop thinking about doing the same" is not a "never"
  assert.equal(GR.deathEscalation('my mate killed himself and I cant stop thinking about doing the same'), true);
  // OD'd as typed (never "odd")
  assert.equal(GR.suicideDeath("since mum OD'd"), true);
  assert.equal(GR.deathTalk('my mum had odd shoes on today'), null);
});

test('item 1: the gentle path never sends a suicide death beside a first-person future: care, said gently, 0 requests', () => {
  for (const t of P.SUICIDE_FUTURE) {
    assert.equal(GR.suicideFuture(t), true, t);
    assert.equal(GR.deathEscalation(t), false, t);
    for (const s of ['none', ...ALL_SCENE_STUBS, 'care', 'crisis']) {
      const R = visit(t, { server: STUBS[s] || null });
      assert.deepEqual([R.route, R.requests, R.careLines], ['care', 0, SAFETY.careGentle], `${t} @${s}`);
    }
    // (r3-esc, by design) the main screen too: care ('suicide-loss'), its gentle line, no world (it was the gentle path)
    assert.equal(main(t), 'care', t);
    assert.deepEqual(readSafety({ checkText }, t, true), { level: 'care', category: 'suicide-loss', matched: null }, t);
  }
  // (r3-esc) a suicide death with no future clause is care too now, said gently, nothing sent (it went gently and was sent)
  assert.equal(GR.suicideFuture('my uncle killed himself years ago and we still miss him'), false);
  assert.deepEqual((({ route, requests, careLines }) => [route, requests, careLines])(visit('my uncle killed himself years ago and we still miss him', { server: STUBS.grief })), ['care', 0, SAFETY.careGentle]);
  const grief = between(AA, 'async function griefMode(', 'const heavySeen = ');
  assert.ok(grief.indexOf('if (suicideDeath(S.text)) { noteSuicide(); careMode({ lines: SAFETY.careGentle }); return; }') < grief.indexOf('client.angle('));
});

// ------------------------------------------------------------------------- 4. the weak death words --
test('item 4: death words about a thing, a place, an event, a game, a book or a creature are asked first on both screens, never gentle', () => {
  for (const t of [...P.SEM_ORDINARY, ...R12.R5_STORY_ORDINARY]) {
    assert.equal(GR.deathTalk(t), null, t);
    assert.equal(lossRoute(t), null, t);
    assert.deepEqual([main(t), angle(t)], ['ordinary', 'ordinary'], t);
    assert.equal(tellRoute({ level: readSafety({ checkText }, t, true).level }), 'ask', t);
    const R = visit(t, { answer: null });
    assert.deepEqual([R.route, R.question, R.requests], ['quiet', 'choice', 0], t);
  }
  // a person or a pet of their own beside the same words stays gentle, with no question (r3-esc, by design: "my dad killed himself"
  // names a suicide, so it is care on both screens now)
  for (const t of P.KEEP_GENTLE) assert.deepEqual([main(t), angle(t)], t === 'my dad killed himself' ? ['care', 'care'] : ['gentle', 'gentle'], t);
});

test('item 4: every r12 / r13 death set keeps its route; only the two "by design" game deaths moved to the question', () => {
  const sets = {};
  const route = (t) => `${main(t)}/${angle(t)}`;
  for (const [name, P_] of [['r12', R12], ['r13', R13]]) {
    for (const [k, v] of Object.entries(P_)) {
      if (!/DEATH|COMMON|EXOTIC|MISS|UI_B1|RECALL_GENTLE|FAMILY_PAIRS|GRIEF/.test(k) || /ORDINARY|NOT|NEG|PAIRS_NOT/.test(k)) continue;
      // (an entry is the words, or a tuple holding them: the longest string in it)
      const items = (Array.isArray(v) ? v : Object.values(v || {}).flat()).map((it) => (Array.isArray(it) ? it.filter((x) => typeof x === 'string').sort((a, b) => b.length - a.length)[0] : it)).filter((t) => typeof t === 'string');
      const c = (sets[`${name}.${k}`] = {});
      for (const t of items) c[route(t)] = (c[route(t)] || 0) + 1;
      // a death is never "ordinary" on either screen unless its set says the question (the review's asked deaths)
      for (const t of items) assert.ok(!route(t).includes('ordinary') || lossRoute(t) === null, `${name}.${k}: ${t}`);
    }
  }
  console.log('r2-angle r12/r13 death sets (main/angle):', JSON.stringify(sets));
  for (const t of R12.R5_STORY_ORDINARY) assert.equal(lossRoute(t), null, t);
  assert.deepEqual([R12.R5_BY_DESIGN.length, R12.R5_ORDINARY_GENTLE.length], [0, 0]);
});

// ------------------------------------------------------------------------- 2. the resend --
test('item 2: after "Another angle" the same words sent again (case and punctuation changed) are asked again; only "Show me another angle" plays without it', () => {
  const [t, again] = P.SEM_RESEND;
  assert.equal(answerKey(t), answerKey(again));
  // the reviewer's words read as the question (no detected loss): asked, then a mechanic; the resend is asked again
  assert.equal(firstStep(t), 'choice');
  assert.equal(firstStep(again, { said: 'angle' }), 'choice', 'an angle chosen is never remembered');
  assert.equal(firstStep(again, { said: 'else', ask: true }), 'choice');
  assert.equal(firstStep(t, { another: true }), 'play', 'inside an angle they chose');
  for (const s of ['none', ...ALL_SCENE_STUBS]) {
    const first = visit(t, { server: STUBS[s] || null, answer: 'angle', walk: 1 });
    assert.deepEqual([first.asked, first.requestsBeforeAnswer], [true, 0], `${t} @${s}`);
    const resend = visit(again, { server: STUBS[s] || null, answer: null });
    assert.deepEqual([resend.route, resend.asked, resend.requests, resend.scenes.length, resend.mechanics.length], ['quiet', true, 0, 0, 0], `${again} @${s}`);
  }
  // only the gentle answers are kept; the Tell opens empty after any answer, an angle included
  const start = between(AA, 'async function startAngle(', 'const FIRST_QUESTION = {');
  assert.deepEqual([...start.matchAll(/S\.answers\.set\(key, '(\w+)'\)/g)].map((m) => m[1]), ['be', 'yes']);
  assert.match(between(AA, 'function openTellNow() {', 'let draftT = 0;'), /const prefill = S\.keepWords \? S\.text : '';/);
});

// ------------------------------------------------------------------------- 3. quiet after the question --
test('item 3: the question left unanswered, or closed with Back, keeps the rest of the visit quiet (no squeeze quips)', () => {
  const quiet = between(AA, 'function quietAfterAsk() {', 'async function waitingLines(');
  // (set first, before anything that may return early: a new Tell opened over the question too)
  assert.match(quiet, /^function quietAfterAsk\(\) \{\s*S\.noPlay = true;\s*if \(S\.left \|\| overlay \|\| S\.phase !== 'asking'\) return;/);
  // Back drops the question (null), which is quietAfterAsk too
  assert.match(AA, /if \(layer\.lossCheck && \(!token \|\| token === layer\.lossCheck\)\) \{ layer\.lossCheck = 0; subs\?\.drop\(\(o\) => o\.lossCheck\); \}/);
  assert.match(between(AA, 'async function startAngle(', 'const FIRST_QUESTION = {'), /if \(v !== 'angle' && v !== 'else'\) \{ quietAfterAsk\(\); return; \}/);
  // and squeezing then says nothing
  assert.match(between(AA, 'function onZuzuTouch(e) {', 'async function makeTouch('), /if \(S\.grief \|\| S\.noPlay\) return;/);
  for (const t of ['I was holding her hand when she went', 'I am worried about my exam tomorrow', ...P.SEM_ORDINARY.slice(0, 3)]) {
    const R = visit(t, { answer: null });
    assert.deepEqual([R.route, R.noPlay, R.quips], ['quiet', true, false], t);
  }
});

// ------------------------------------------------------------------------- 5. "Just be with it" --
test('item 5: "Just be with it" for ordinary words: its own quiet path; Finish goes home with no safety, the ordinary goodbye, and the next home Tell is asked', () => {
  const t = P.UI_BE_FINISH.angle;
  for (const s of ['none', ...ALL_SCENE_STUBS]) {
    const R = visit(t, { server: STUBS[s] || null, answer: 'be' });
    assert.deepEqual([R.route, R.requests, R.grief, R.finishLevel], ['be', 0, false, 'none'], `${t} @${s}`);
    assert.deepEqual(R.finishLines, END.finish, `${t} @${s}`);
    // nothing heavy was seen: no "See support"
    assert.deepEqual(R.beOptions, ['squeeze', 'finish'], `${t} @${s}`);
    assert.ok(!R.said.some((l) => GRIEF.loss.includes(l) || l === GRIEF.heard), R.said.join(' | '));
  }
  // the real goodbye (another-angle.js finish reads angle-first.js goodbye): no safety level home after "Just be with it"
  assert.deepEqual(goodbye({ level: 'none', grief: false }), { heavy: false, lines: 'end', params: {} });
  // a quiet visit ("Just be with it": S.noPlay) stays quiet at home: the Hushfold's softVisit, never a safety level
  assert.deepEqual(goodbye({ level: 'none', grief: false, noPlay: true }), { heavy: false, lines: 'end', params: { soft: true } });
  assert.deepEqual(goodbye({ level: 'none', grief: true, noPlay: true }), { heavy: true, lines: 'safety', params: { safety: { level: 'concern' } } });
  assert.deepEqual(goodbye({ level: 'none', grief: true }), { heavy: true, lines: 'safety', params: { safety: { level: 'concern' } } });
  assert.deepEqual(goodbye({ level: 'care', care: true }), { heavy: true, lines: 'safety', params: { safety: { level: 'care' } } });
  const fin = between(AA, 'async function finish() {', '// ------------------------------------------------------- the view --');
  assert.match(fin, /const bye = goodbye\(S\);/);
  assert.match(fin, /app\.go\('home', bye\.params\);/);
  // beWithIt never takes the grief path's state, support or lines
  const be = between(AA, 'async function beWithIt() {', 'async function unclear(');
  assert.match(be, /S\.beOnly = true; S\.noPlay = true;/);
  assert.doesNotMatch(be, /S\.grief\s*=|S\.keepSupport\s*=|S\.level\s*=|noteSafety|GRIEF\.|SAFETY\.|client\.|griefMode\(/);
  assert.match(be, /const opts = heavySeen\(\) \? BE_WITH\.optionsHeavy : BE_WITH\.options;/);
  // home after it: the Hushfold has no params.safety, so its next ordinary Tell is asked the play question
  const home = readSafety({ checkText }, P.UI_BE_FINISH.home, true);
  assert.equal(tellRoute({ level: home.level, carried: false }), 'ask');
  // "See support" after "Just be with it" only when something heavy was seen
  assert.deepEqual(visit('I lost my job today and I feel awful', { answer: 'be' }).beOptions, ['squeeze', 'support', 'finish']);
  assert.deepEqual(visit('we had to let our dog go', { answer: 'be' }).beOptions, ['squeeze', 'support', 'finish']);
  assert.equal(BE_WITH.line, 'Okay. Let’s just be with it for a while.');
});

// ------------------------------------------------------------------------- 6. the question's clock and focus --
test('item 6: the question lasts about 45 s, never counts while the page is hidden, and leaves at least 10 s after it comes back', () => {
  assert.equal(ANGLE_CHOICE.ms, 45000);
  let clock = 0, timers = [], fired = 0;
  const doc = { hidden: false, l: null, addEventListener(_, f) { this.l = f; }, removeEventListener() { this.l = null; } };
  const deps = { doc, now: () => clock, setTimer: (fn, ms) => { const t = { fn, at: clock + ms }; timers.push(t); return t; }, clearTimer: (t) => { timers = timers.filter((x) => x !== t); } };
  const run = (to) => { clock = to; for (const t of timers.filter((x) => x.at <= clock)) { timers = timers.filter((x) => x !== t); t.fn(); } };
  const stop = questionClock(45000, () => fired++, deps);
  run(30000);
  assert.equal(fired, 0);
  // hidden at 30 s: nothing counts for ten minutes
  doc.hidden = true; doc.l();
  run(630000);
  assert.equal(fired, 0, 'never times out while the page is hidden');
  // back: 15 s were left
  doc.hidden = false; doc.l();
  run(630000 + 14000);
  assert.equal(fired, 0);
  run(630000 + 15000);
  assert.equal(fired, 1);
  stop();
  // hidden with 2 s left: at least QUESTION_BACK_MS after it comes back
  clock = 0; timers = []; fired = 0;
  const stop2 = questionClock(45000, () => fired++, deps);
  run(43000); doc.hidden = true; doc.l(); run(50000); doc.hidden = false; doc.l();
  run(50000 + QUESTION_BACK_MS - 1); assert.equal(fired, 0);
  run(50000 + QUESTION_BACK_MS); assert.equal(fired, 1);
  stop2();
  // hidden from the start: it waits to be seen; stopped, it never fires
  clock = 0; timers = []; fired = 0; doc.hidden = true;
  const stop3 = questionClock(45000, () => fired++, deps);
  run(100000); assert.equal(fired, 0);
  stop3(); doc.hidden = false; doc.l?.(); run(200000); assert.equal(fired, 0);
  // wired in: its own clock (not the subtitles' timeout), the words kept while it is up, focus on its first answer
  const ask = between(AA, 'async function askFirst(kind) {', 'let stopClock = null;');
  assert.match(ask, /S\.keepWords = true;/);
  assert.match(ask, /questionClock\(q\.ms, \(\) => \{ if \(seq === S\.seq\) subs\?\.drop\(\(o\) => o\.lossCheck\); \}\)/);
  assert.doesNotMatch(ask, /timeoutMs/);
  assert.match(ask, /focusFirstChoice\(\);/);
  const focus = between(AA, 'function focusFirstChoice() {', 'function quietAfterAsk() {');
  assert.match(focus, /querySelector\?\.\('\.hf-chips:not\(\[hidden\]\) button'\)\?\.focus\?\.\(\{ preventScroll: true \}\)/);
  assert.match(focus, /INPUT\|TEXTAREA\|SELECT/, 'never out of a text field');
  assert.match(AA, /stopClock\?\.\(\);\s*removeEventListener\('resize', onResize\);/, 'stopped on leave');
});

// ------------------------------------------------------------------------- 7. polish --
test('item 7: a grief-family feeling with no words is gentle (nothing sent); equal weight for the two answers; "Just be with it" is asked again', () => {
  for (const e of ['grief', 'mourning', 'bereft', 'heartache', 'heartbreak', 'anticipatory-grief']) {
    for (const s of ['none', 'grief', 'pull']) {
      const R = visit('', { emotion: e, server: STUBS[s] || null });
      assert.deepEqual([R.route, R.asked, R.requests], ['gentle', false, 0], `${e} @${s}`);
      assert.deepEqual([R.scenes[0].subtitle_line_1, R.scenes[0].subtitle_line_2], [...GRIEF.grief], e);
    }
  }
  // another feeling with no words is still "a few more words?"
  assert.equal(visit('', { emotion: 'anxiety' }).route, 'unclear');
  assert.match(between(AA, 'async function afterTell(', 'function firstLook('), /if \(\(!S\.text \|\| !hasWords\(S\.text\)\) && griefFeeling\(S\.emotion\)\) \{ griefMode\(\{ asked: true \}\); return; \}/);
  // equal weight: neither chip is primary, "Another angle" first
  const q = between(AA, 'const FIRST_QUESTION = {', 'async function askFirst(');
  assert.match(q, /options: \[\{ label: ANGLE_CHOICE\.angle, value: 'angle' \}, \{ label: ANGLE_CHOICE\.be, value: 'be' \}\]/);
  assert.doesNotMatch(between(q, 'choice:', "'check-in':"), /primary/);
  // "Just be with it", then the same words: asked again (as on the main screen); nothing sent before the answer
  assert.equal(BE_ASKS_AGAIN, true);
  assert.equal(ASK_BEFORE_ANGLE, true);
  for (const t of ['I am worried about my exam tomorrow', 'we had to let our dog go']) {
    assert.equal(firstStep(t, { said: 'be' }), 'choice', t);
    const R = visit(t, { said: 'be', answer: 'angle', walk: 1, server: STUBS.pull });
    assert.deepEqual([R.asked, R.requestsBeforeAnswer], [true, 0], t);
  }
});
