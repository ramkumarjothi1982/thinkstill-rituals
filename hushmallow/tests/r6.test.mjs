// Final round 6 (the independent check of integ/final-r5, 59a743a, score 6.5: /tmp/claude-0/hf/check-r5.json). Its blocking item
// and its first polish item: goodbye notes and wishes to die that name NO death got the play question on both screens, and could
// be sent after "Another angle" (deathCare read a self-ending clause only beside a recognised death). grief.js noteShape reads the
// note itself, by its shape, with no death needed: a farewell frame, or a first-person future absence or ending, care unless an
// everyday bound is in its sentence or the next ("see you Monday", "at work", "for the weekend", "my train is here"). It is care
// on the main screen (readSafety → deathCare 'follow': category 'death-follow', the Support pill, no world, nothing offered) and in
// Another Angle (afterTell, readDraft and griefMode: careMode with the follow lines, nothing sent, never the question).
//
// The two structural guarantees still hold (tests/r5.test.mjs): griefMode has no client call, and the detection gate's LOST_CARE,
// LOST_SELF_GENTLE and GENTLE_SENT stay 0 (noteShape only ever adds care).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import { noteShape, deathCare } from '../src/beyond/grief.js';
import { DEATH_CARE } from '../src/app/scenes/hushfold.js';
import { SAFETY } from '../src/beyond/lines.js';
import { visit, STUBS } from './probes/r10-replay.mjs';
import * as P from './probes/r6.mjs';

await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const AA = read('src/beyond/another-angle.js');
const EVERY_STUB = [null, ...Object.keys(STUBS).map((k) => STUBS[k]).filter((s) => typeof s === 'function')];
const mainRead = (t) => readSafety({ checkText }, t, true);
const isCare = (r) => r.level === 'care' || r.level === 'crisis';
function counted(s) { const c = { n: 0 }; return [s ? (x, o) => { c.n++; return s(x, o); } : null, c]; }
/** Care (or crisis) on the main screen with a death-care category; in Another Angle care with every server answer, 0 requests, never asked. */
function careBoth(t) {
  const r = mainRead(t);
  assert.ok(isCare(r), `${t}: main ${r.level}/${r.category}`);
  if (r.level === 'care') assert.ok(DEATH_CARE.has(r.category) || DEATH_CARE.has(r.deathCare), `${t}: ${r.category}`);
  for (const s of EVERY_STUB) {
    const [server, c] = counted(s);
    const R = visit(t, { server });
    assert.ok(['care', 'follow', 'crisis'].includes(R.route), `${t}: ${R.route}`);
    assert.deepEqual([c.n, R.requests, R.asked, R.mechanics.length], [0, 0, false, 0], t);
    if (R.route !== 'crisis') assert.deepEqual(R.careLines, SAFETY.follow, `${t}: the follow lines`);
  }
}
/** Care on either screen (the main screen's reading, or Another Angle's route with an ordinary server answer). */
const careEither = (t) => isCare(mainRead(t)) || ['care', 'follow', 'crisis'].includes(visit(t, { server: STUBS.pull }).route);

// ------------------------------------------------------------------------------ the check's own lists --
test('check-r5 blocking: the 15 goodbye notes with no death named are care on both screens, 0 requests, never the question', () => {
  assert.equal(P.NOTES_15.length, 15);
  for (const t of P.NOTES_15) {
    assert.equal(noteShape(t), true, t);
    assert.equal(deathCare(t), 'follow', t);
    // none names a death: the lexicon read none (or concern) and the death readings nothing, before this round
    assert.notEqual(checkText(t).level, 'crisis', t);
    assert.equal(mainRead(t).category, 'death-follow', t);
    careBoth(t);
  }
});

test('check-r5 polish 1: the 9 own-first wishes that missed care are care on both screens, 0 requests', () => {
  assert.equal(P.WISHES_9.length, 9);
  for (const t of P.WISHES_9) {
    assert.equal(noteShape(t), true, t);
    // (15 Oct 2026) the lexicon also reads the words in one spelling (risk-screen.js normalise): "i wnat to dei" is "i want to
    // die", crisis, as typed without the slip; otherwise the death care
    const r = mainRead(t);
    assert.ok(r.category === 'death-follow' || r.level === 'crisis', `${t}: ${r.level} ${r.category}`);
    careBoth(t);
  }
});

test('typed with a slip: "i wnat to dei", "wanna di", "i wana dye" are a wish to die; "dye my hair" never is', () => {
  for (const t of ['i wnat to dei', 'i just wanna di', 'i wana dye', 'i wnna dei', 'i want to dei so bad', 'i wnt to die']) careBoth(t);
  for (const t of ['i want to dye my hair blue', 'i want to dye it purple', 'i could die for a pizza', 'i just wanna die of embarrassment']) assert.equal(noteShape(t), false, t);
});

// ------------------------------------------------------------------------------ false care --
test('the 40 everyday sentences written before the rule: false care ≤ 4/40 on either screen (0 today)', () => {
  assert.equal(P.NEGATIVES_40.length, 40);
  assert.equal(new Set(P.NEGATIVES_40).size, 40);
  const fc = P.NEGATIVES_40.filter(careEither);
  assert.ok(fc.length <= 4, `false care ${fc.length}/40: ${fc.join(' | ')}`);
  assert.deepEqual(fc, []);
  // and each still gets the question (or the check-in) in Another Angle, never care
  for (const t of P.NEGATIVES_40) assert.equal(noteShape(t), false, t);
});

test('four held-out sets of 40 (each measured before the rule was changed for it): only the known false care', () => {
  const all = [P.HELD_OUT_B, P.HELD_OUT_C, P.HELD_OUT_D, P.HELD_OUT_E];
  for (const set of all) assert.equal(set.length, 40);
  const fc = all.flat().filter(careEither);
  assert.deepEqual(fc, P.KNOWN_FALSE_CARE, 'the false alarms to watch (one noteShape, three the lexicon\'s own crisis)');
  assert.deepEqual(fc.filter((t) => noteShape(t)), ['after i\'m gone the flat will be yours to tidy', 'i want to die my hair pink', 'lol i want to die, this video is so funny']);
  // the lexicon's crisis is not this round's: noteShape adds nothing there
  for (const t of fc.filter((x) => x !== 'after i\'m gone the flat will be yours to tidy')) assert.equal(checkText(t).level, 'crisis', t);
});

test('a goodbye said to the one who died is grief, never a note (noteShape reads no frame beside a death)', () => {
  for (const t of P.GRIEF_GOODBYES) assert.equal(noteShape(t), false, t);
  // the gentle path keeps them (never care from this round)
  for (const t of ['rip nan, thank you for everything, goodbye', 'my cat was put down, bye forever little one', 'goodbye my sweet boy, run free over the rainbow bridge',
    'my uncle died, don\'t blame yourself mum, there was nothing you could do', 'my nan passed, i wrote letters for everyone to read at the funeral']) {
    const r = mainRead(t);
    assert.deepEqual([r.level, r.category], ['concern', 'loss'], t);
    assert.equal(visit(t, { server: STUBS.pull }).route, 'gentle', t);
  }
  // but the self's own absence after a death is still read ("my dog died and soon I'll be gone too")
  assert.equal(noteShape('my dog died and soon i\'ll be gone too'), true);
});

test('third-person absences and fears are never read: "she won\'t be around much longer", "my dog won\'t be here much longer"', () => {
  for (const t of ['she won\'t be around much longer, the doctors said', 'my dog won\'t be here much longer', 'they won\'t be here much longer, the lease ends',
    'you won\'t be around much longer if you keep eating like that', 'i\'m not ready to go', 'i don\'t want to die', 'i\'m not going to end things',
    // (the lexicon's own everyday lines, tests/hushfold.test.mjs: a sleep bounded, a breakup, a hyperbole)
    'I want to sleep and not wake up until noon', 'I wanna end it with him', 'I want to end it with her tonight', 'I\'m going to die of boredom in this meeting']) assert.equal(noteShape(t), false, t);
});

// ------------------------------------------------------------------------------ recall beyond the check --
test('own note variants (written as the held-out negatives): care on both screens, only the known misses left to the question', () => {
  const all = [...P.OWN_ESC_A, ...P.OWN_ESC_C, ...P.OWN_ESC_D, ...P.OWN_ESC_E];
  assert.equal(all.length, 90);
  const missed = all.filter((t) => !careEither(t));
  // (15 Oct 2026) no new miss; the risk screener now reads some of the known ones as care ("i'm not going to be here tomorrow, i'm sorry")
  assert.deepEqual(missed.filter((t) => !P.KNOWN_MISSES.includes(t)), []);
  for (const t of all.filter((x) => !P.KNOWN_MISSES.includes(x))) {
    const r = mainRead(t);
    assert.ok(isCare(r), `${t}: main ${r.level}`);
    const R = visit(t, { server: STUBS.pull });
    assert.deepEqual([R.requests, R.asked, R.mechanics.length], [0, false, 0], t);
  }
});

// ------------------------------------------------------------------------------ structural --
test('structural: deathCare reads noteShape; Another Angle reads it in afterTell (before any angle), readDraft and griefMode', () => {
  const g = read('src/beyond/grief.js');
  assert.match(between(g, 'export function deathCare(', '\n}'), /if \(deathEscalation\(text\)\) return 'follow';\s*if \(noteShape\(text\)\) return 'follow';\s*if \(suicideDeath\(text\)\) return 'suicide';/);
  assert.match(AA, /import \{ deathEscalation, suicideDeath, serverLoss, griefLinesOk, keepLocal, noteShape \} from '\.\/grief\.js';/);
  const after = between(AA, 'async function afterTell(', 'function firstLook(');
  assert.match(after, /if \(noteShape\(S\.text\)\) S\.follow = true;/);
  const route = after.indexOf('if (noteShape(S.text)) { noteFollow(); careMode({ lines: SAFETY.follow }); return; }');
  assert.ok(route > after.indexOf('if (deathEscalation(S.text)) { noteFollow();'), 'beside the wish to follow');
  assert.ok(route < after.indexOf('startAngle('), 'before any angle: nothing is sent, never the question');
  assert.ok(route < after.indexOf('readDraft(S.text)'));
  assert.match(between(AA, 'function readDraft(', 'function serverCareLines('), /if \(!S\.follow && noteShape\(t\)\) noteFollow\(\);/);
  const grief = between(AA, 'async function griefMode(', 'const heavySeen = ');
  assert.ok(grief.indexOf('if (noteShape(S.text)) { noteFollow(); careMode({ lines: SAFETY.follow }); return; }') >= 0);
  assert.ok(grief.indexOf('noteShape(S.text)') < grief.indexOf('say(GRIEF.heard'));
  // the replay mirrors it
  const rp = read('tests/probes/r10-replay.mjs');
  assert.match(rp, /if \(noteShape\(text\)\) \{ S\.follow = true; return care\(SAFETY\.follow\); \}/);
});

test('main screen: typed and closed, or seen while typing, a note is care too (the overlay reports death-follow; the scene offers no world)', () => {
  const ov = read('src/hushfold/input-overlay.js');
  assert.match(ov, /const dc = griefNow\.deathCare \? griefNow\.deathCare\(t\)/);
  const hf = read('src/app/scenes/hushfold.js');
  assert.match(hf, /if \(DEATH_CARE\.has\(r\?\.category\)\) S\.deathCare = true;/);
  // the lexicon's care beside a note keeps the lexicon's category and carries the death-care reading
  const r = mainRead('my dad hits me and this is my goodbye to everyone');
  assert.equal(r.level, 'care');
  assert.equal(r.deathCare, 'death-follow');
});

test('cheap: noteShape on 600 characters (the Tell\'s limit) of its own worst repeats stays well under 50 ms', () => {
  for (const s of ['goodbye everyone ', 'tell mum i love ', 'i won\'t be here ', 'by the time you read this ', 'when i\'m ', 'i\'ll be gone ', 'sorry for everything ', 'not ']) {
    const t = s.repeat(Math.ceil(600 / s.length)).slice(0, 600);
    noteShape(t);
    const runs = [];
    for (let k = 0; k < 5; k++) { const a = performance.now(); noteShape(t); runs.push(performance.now() - a); }
    runs.sort((x, y) => x - y);
    assert.ok(runs[2] < 50, `${JSON.stringify(s)}: ${runs[2].toFixed(1)} ms`);
  }
});
