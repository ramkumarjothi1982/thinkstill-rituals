// Final round 3, unit ESCALATION (the independent check of d1b0333, score 5.5, blocking item 1).
//
//   1. a suicide named about anyone (grief.js suicideDeath) is CARE on both screens, whatever the clause: the gentle care lines
//      that assume nothing, the Support pill, no question, no world, no "Somewhere calm", no Thought Mallow, and in Another Angle
//      0 server requests (never client.angle, so never /v1/session either). By design "…and I'm going to a support group tonight"
//      is care too (the owner-safe default: a suicide bereavement is a known risk; a calm "support is here" costs nothing)
//   2. any other death named, then a first-person clause about the self ending (grief.js selfEnding): care, 0 requests
//   3. the check's 12 misses, verbatim, plus this unit's own phrasings, written before reading the check (tests/probes/r3-esc.mjs)
//
// Structure, not phrases: the rules read a recognised death or suicide word and the shape of the clause; no test sentence is
// written into grief.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import * as GR from '../src/beyond/grief.js';
import { goodbye } from '../src/beyond/angle-first.js';
import { SAFETY } from '../src/beyond/lines.js';
import { SHARED_LINES } from '../src/hushfold/lines.js';
import { DEATH_CARE } from '../src/app/scenes/hushfold.js';
import { visit, STUBS, ALL_SCENE_STUBS } from './probes/r10-replay.mjs';
import * as R5 from './probes/r5.mjs';
import * as R6 from './probes/r6.mjs';
import * as P from './probes/r3-esc.mjs';
import * as R2 from './probes/r2-angle.mjs';
import * as R12 from './probes/r12.mjs';
import * as R13 from './probes/r13.mjs';

await loadGrief();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const AA = read('src/beyond/another-angle.js');
const HF = read('src/app/scenes/hushfold.js');
const STUB_NAMES = ['none', ...ALL_SCENE_STUBS, 'care', 'crisis', 'error'];

/** The main screen's reading (input-overlay readSafety, lossAware). */
const mainRead = (t) => readSafety({ checkText }, t, true);
const isCare = (r) => r.level === 'care' || r.level === 'crisis';
/** Another Angle, every server answer: care (or crisis), 0 requests, no question, no mechanic, no Thought Mallow scene. */
function angleCare(t, lines = null) {
  for (const s of STUB_NAMES) {
    const R = visit(t, { server: STUBS[s] || null });
    assert.ok(['care', 'follow', 'crisis'].includes(R.route), `${t} @${s}: ${R.route}`);
    assert.deepEqual([R.requests, R.asked, R.mechanics.length, R.scenes.length], [0, false, 0, 0], `${t} @${s}`);
    if (lines && R.route !== 'crisis') assert.deepEqual(R.careLines, lines, `${t} @${s}: its lines`);
  }
}

// ------------------------------------------------------------------------- the check's twelve --
test('the check\'s 12 misses, verbatim, are care on both screens with 0 requests (every server answer)', () => {
  assert.equal(P.CHECK_MISSES.length, 12);
  for (const t of P.CHECK_MISSES) {
    const r = mainRead(t);
    assert.ok(isCare(r), `${t}: main ${r.level}`);
    // (a care reading grief.js made: no world offered beside it, hushfold.js DEATH_CARE)
    if (r.level === 'care') assert.ok(DEATH_CARE.has(r.category), `${t}: ${r.category}`);
    assert.ok(GR.deathCare(t), t);
    angleCare(t);
  }
  // all but one say something about the self as well: the wish to follow's lines
  const follow = P.CHECK_MISSES.filter((t) => GR.deathEscalation(t));
  assert.equal(follow.length, 12, P.CHECK_MISSES.filter((t) => !GR.deathEscalation(t)).join(' | '));
  for (const t of follow) assert.equal(visit(t, { server: STUBS.grief }).route, 'follow', t);
});

test('the check\'s one negative that was care is care by design now (a suicide named, whatever the clause)', () => {
  for (const t of P.CHECK_BY_DESIGN) {
    assert.equal(GR.suicideDeath(t), true, t);
    assert.equal(GR.deathEscalation(t), false, t);
    assert.deepEqual(mainRead(t), { level: 'care', category: 'suicide-loss', matched: null }, t);
    angleCare(t, SAFETY.careGentle);
  }
});

// ------------------------------------------------------------------------- rule 1: a suicide named --
test('rule 1: every suicide named (written before reading the check) is care, gently, on both screens with 0 requests', () => {
  assert.ok(P.OWN_SUICIDE.length >= 20);
  for (const t of P.OWN_SUICIDE) {
    assert.equal(GR.suicideDeath(t), true, t);
    const r = mainRead(t);
    assert.ok(isCare(r), `${t}: main ${r.level}`);
    if (r.level === 'care') assert.equal(r.category, GR.deathEscalation(t) ? 'death-follow' : 'suicide-loss', t);
    angleCare(t, r.level === 'care' && !GR.deathEscalation(t) ? SAFETY.careGentle : null);
  }
  // the ordinary words that use the same verbs name no suicide
  for (const t of P.OWN_SUICIDE_NEG) assert.equal(GR.suicideDeath(t), false, t);
  // OD'd as typed, any case (the apostrophe says it); with it taken out only in capitals, never "odd"
  for (const t of ["my brother od'd", "she OD'd last night", 'my cousin O.D.’d', 'my friend ODed', 'he ODd at a party']) assert.equal(GR.suicideDeath(t), true, t);
  for (const t of ['my brother is odd', 'my mum had odd socks on', 'that was an odd day']) assert.equal(GR.suicideDeath(t), false, t);
  // "own" says it; without it a person must be the subject (never a disease, an accident)
  for (const t of ['cancer took her life', 'the crash took his life', 'the accident took their lives', 'he took his life in his hands on that bike']) assert.equal(GR.suicideDeath(t), false, t);
  // the earlier sets' suicide deaths, gentle by design until now, are care
  for (const t of [...R2.SUICIDE_FUTURE, 'my uncle killed himself years ago and we still miss him', 'my dad killed himself']) {
    assert.equal(GR.deathCare(t), 'suicide', t);
    angleCare(t, SAFETY.careGentle);
  }
});

test('rule 1 in Another Angle: suicideDeath is read before anything is asked, sent, framed or played', () => {
  const after = between(AA, 'async function afterTell(', 'function firstLook(');
  const at = after.indexOf('if (suicideDeath(S.text)) { noteSuicide(); careMode({ lines: SAFETY.careGentle }); return; }');
  assert.ok(at > after.indexOf('if (deathEscalation(S.text))'), 'after the wish to follow (its own lines)');
  assert.ok(at < after.indexOf('startAngle('), 'before the question or any request');
  // the gentle path never sends a suicide death, whatever the clause (r2-angle item 1 read only a first-person future)
  const grief = between(AA, 'async function griefMode(', 'const heavySeen = ');
  // (final round 5: it was "before its request"; the gentle path sends nothing at all now, and still reads it first)
  assert.ok(grief.indexOf('if (suicideDeath(S.text)) { noteSuicide(); careMode({ lines: SAFETY.careGentle }); return; }') >= 0 && grief.indexOf('client.') < 0);
  assert.doesNotMatch(AA, /suicideFuture/, 'superseded by suicideDeath');
  // typed and closed, or typed and reworded: care for the visit, said gently
  assert.match(between(AA, 'function readDraft(', 'function serverCareLines('), /if \(deathEscalation\(t\)\) noteFollow\(\);\s*\/\/[^\n]*\n\s*else if \(suicideDeath\(t\)\) noteSuicide\(\);/);
  assert.match(AA, /function noteSuicide\(\) \{\s*S\.suicide = true;\s*noteSafety\(\{ level: 'care', category: 'suicide-loss' \}\);\s*keepTypingSupport\(\);/);
  assert.match(AA, /async function careMode\(\{ lines = S\.follow \? SAFETY\.follow : S\.suicide \? SAFETY\.careGentle : SAFETY\.care \} = \{\}\)/);
  // the replay mirrors it (tests/probes/r10-replay.mjs): typed and closed, the visit is care too
  const R = visit('my dad hanged himself in the shed', { server: STUBS.grief });
  assert.deepEqual([R.route, R.requests, R.careLines], ['care', 0, SAFETY.careGentle]);
  // Finish carries the category home, so the Hushfold offers no world either
  assert.deepEqual(goodbye({ level: 'care', care: true, category: 'suicide-loss' }).params, { safety: { level: 'care', category: 'suicide-loss' } });
  assert.deepEqual(goodbye({ level: 'care', care: true, category: 'death-follow' }).params, { safety: { level: 'care', category: 'death-follow' } });
  assert.deepEqual(goodbye({ level: 'care', care: true, category: 'abuse' }).params, { safety: { level: 'care' } });
});

test('rule 1 on the main screen: care with its own gentle line, the Support pill, and no world offered (not even somewhere calm)', () => {
  // (15 Oct 2026) and the risk screener's care (risk-screen.js, category 'self-risk'): the same care path, no world offered
  assert.deepEqual([...DEATH_CARE].sort(), ['death-follow', 'self-risk', 'suicide-loss']);
  assert.deepEqual(mainRead('my brother killed himself last spring'), { level: 'care', category: 'suicide-loss', matched: null });
  assert.deepEqual(mainRead("my son died. I'm next."), { level: 'care', category: 'death-follow', matched: null });
  // the line assumes nothing (no death, no loss, no "them"), acknowledges, and offers support; nothing to fix, nothing playful
  assert.equal(SHARED_LINES.supportLoss.length, 2);
  for (const l of SHARED_LINES.supportLoss) {
    assert.doesNotMatch(l, /\b(?:died|death|dead|loss|lost|grief|grieving|suicide|sorry for|miss|them|him|her|fix)\b|!|haha|squish/i, l);
    assert.ok(l.length <= 60, l);
  }
  assert.match(SHARED_LINES.supportLoss.join(' '), /\b(?:carry|telling)\b/);
  assert.match(SHARED_LINES.supportLoss.join(' '), /\bSupport\b/);
  // careBeat says it; careChoice offers no world after either grief care (a world held quietly ends quietly)
  const beat = between(HF, 'async function careBeat(', 'async function careAgain(');
  assert.match(beat, /safety\?\.category === 'suicide-loss' \? SHARED_LINES\.supportLoss/);
  const choice = between(HF, 'async function careChoice(', 'function calmTheWorld(');
  // (final round 4: and the gentle path the safety net held, S.supportFirst)
  // (fix round: with something to tap — [See support] [Stay here quietly], supportChoice, which offers no world either)
  const no = choice.indexOf('if (S.deathCare || S.supportFirst) { await supportChoice(); return; }');
  { const sc = HF.slice(HF.indexOf('async function supportChoice('), HF.indexOf('async function gentleWorld(')); assert.doesNotMatch(sc, /gentleWorld|playCalm|startFlow|calmTheWorld/); assert.match(sc, /if \(S\.hold === 'quiet' && worldMode\) endQuietWorld\(\);/); }
  assert.ok(no > 0 && no < choice.indexOf('await gentleWorld('), 'before any world is looked up');
  // the flag is sticky for the visit (read on every level seen, raised or not), and restored with the visit's category
  assert.match(between(HF, 'function noteSafety(r) {', 'function noteNoResume('), /^function noteSafety\(r\) \{\s*noteNoResume\(r\);\s*if \(DEATH_CARE\.has\(r\?\.category\)\) S\.deathCare = true;/);
  // typed and closed: the same line
  assert.match(HF, /S\.category === 'suicide-loss' \? SHARED_LINES\.supportLoss : S\.level === 'care' \? SHARED_LINES\.supportCare/);
  // never the question: care goes to support before tellRoute asks
  assert.match(between(HF, 'async function afterTell(', 'function careBeat('), /if \(safety\?\.level === 'care' \|\| safety\?\.level === 'concern'\) \{ if \(!lift\) \{ S\.told = true; S\.careSaid = true; await careBeat/);
});

// ------------------------------------------------------------------------- rule 2: the self ending --
test('rule 2: a death named, then a first-person clause about the self ending, is care on both screens (written before the check)', () => {
  assert.ok(P.OWN_FOLLOW.length >= 25);
  for (const t of P.OWN_FOLLOW) {
    assert.equal(GR.deathEscalation(t), true, t);
    const r = mainRead(t);
    assert.ok(isCare(r), `${t}: main ${r.level}`);
    if (r.level === 'care') assert.equal(r.category, 'death-follow', t);
    angleCare(t);
  }
  for (const t of P.MORE_POS) {
    assert.ok(GR.deathCare(t), t);
    assert.ok(isCare(mainRead(t)), t);
  }
  // the structural pieces, each on its own after a death
  const pieces = [
    'my dad died and I just want to die too', "my dad died and I'd be better off dead", 'my dad died and I cant go on',
    "my dad died and I don't think I'll be here much longer", 'my dad died and theres no reason for me to stay alive',
    "my dad died and it's my turn soon", "my dad died and I'll be the next one", "my dad died and I've been planning mine",
    'my dad died and I keep writing goodbye letters', 'my dad died and I keep looking at the rope in the shed', 'my dad died and I googled how to tie a noose',
    "my dad died and I've been thinking about the train tracks", 'my dad died and I just want to sleep forever', 'my dad died and I might take all of his pills',
  ];
  for (const t of pieces) assert.equal(GR.selfEnding(t), true, t);
});

test('rule 2: its negatives are never care: living, a plan, a keepsake, a place, a turn, someone else, a fear', () => {
  assert.ok(P.OWN_NEG.length >= 20 && P.MORE_NEG.length >= 30);
  // (the safety lexicon reads one of them as crisis on its own: "goodbye letter" — never this unit's rules; the lexicon is not edited)
  const LEXICON = new Set(['I wrote a goodbye letter to my dad to put in his coffin', "my dad died and I don't want to die like he did, so I've stopped smoking"]);
  let lexicon = 0;
  for (const t of [...P.OWN_NEG, ...P.MORE_NEG]) {
    assert.equal(GR.deathCare(t), null, t);
    assert.equal(GR.selfEnding(t), false, t);
    const r = mainRead(t);
    if (LEXICON.has(t)) { assert.equal(checkText(t).level, 'crisis', t); lexicon++; continue; }
    assert.ok(!isCare(r), `${t}: main ${r.level} ${r.category}`);
    const R = visit(t, { server: STUBS.grief });
    assert.ok(!['care', 'follow', 'crisis'].includes(R.route), `${t}: ${R.route}`);
  }
  assert.equal(lexicon, 2);
  // the brief's own: the funeral, living with my aunt, her grave, never forgetting, his garden, next in line, his gun licence, his recipe
  for (const t of ['planning the funeral', "my mum died and I'm going to live with my aunt", 'my nan died, visiting her grave', "my mum died, I'll never forget her",
    'my dad died, I want to keep his garden going', "my uncle died, I'm next in line to speak at the service", 'my dad died, I keep his gun licence papers for the police',
    "my grandad died, I'll follow his recipe"]) assert.equal(GR.deathCare(t), null, t);
  // how someone died is never the self ending: "…and didn't survive", "…and didn't wake up", "might not make it"
  for (const t of ['my sister was in an accident and didnt survive', 'my nan fell asleep and didnt wake up', 'the baby came too early and didnt make it',
    'my mum is in hospital and might not make it']) assert.equal(GR.selfEnding(t), false, t);
});

// ------------------------------------------------------------------------- the earlier sets --
test('the earlier escalation sets hold: positives care, negatives not (the one suicide among them is care by design)', () => {
  for (const t of [...R2.SEM_ESC_POS, ...R2.ESC_STRUCT_POS, ...R12.R5_ESC_POS, ...R12.R5_R3_ESC_POS, ...R13.ESCALATION_POS]) assert.equal(GR.deathEscalation(t), true, t);
  for (const t of [...R2.ESC_NEG, ...R2.ESC_STRUCT_NEG, ...R12.R5_ESC_NEG, ...R12.R5_R3_ESC_NEG, ...R13.ESCALATION_NEG]) assert.equal(GR.deathEscalation(t), false, t);
  // R5_DEATH_CARE stays care
  for (const t of R12.R5_DEATH_CARE) assert.ok(isCare(mainRead(t)), t);
  // a negative that names a suicide is care now, by design, with the gentle care lines (never the wish to follow's)
  const bySuicide = [...R2.ESC_NEG, ...R2.ESC_STRUCT_NEG, ...R12.R5_ESC_NEG, ...R12.R5_R3_ESC_NEG, ...R13.ESCALATION_NEG].filter((t) => GR.suicideDeath(t));
  assert.deepEqual(bySuicide, ['my uncle killed himself years ago and we still miss him']);
  // it is a rule, not a list: no test sentence is written into grief.js
  const code = read('src/beyond/grief.js').split('\n').filter((l) => !/^\s*(?:\/\/|\/?\*)/.test(l)).join('\n').toLowerCase();
  for (const t of [...P.CHECK_MISSES, ...P.OWN_FOLLOW, ...P.OWN_SUICIDE]) assert.ok(!code.includes(t.toLowerCase().replace(/['’]/g, '')), `not pinned as a phrase: ${t}`);
});

test('false care on grief: across every earlier probe set, the self-ending rule fires only on the escalations they pinned', async () => {
  // every phrasing of every earlier round (tests/probes/*.mjs): where selfEnding fires after a death that was not a suicide, the
  // set it comes from is an escalation set (care already); a suicide named is care by design (the gentle care lines)
  const { readdirSync } = await import('node:fs');
  const seen = new Map();
  const walk = (v, src) => { if (typeof v === 'string') { if (/\s/.test(v) && !seen.has(v)) seen.set(v, src); } else if (Array.isArray(v)) v.forEach((x) => walk(x, src)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, src)); };
  for (const f of readdirSync(new URL('./probes/', import.meta.url))) {
    // (15 Oct 2026: the risk screener's own sets, risk-*.mjs, are measured in tests/risk-screen.test.mjs — written as positives and
    // look-alikes for it, not an earlier round's grief phrasings)
    if (!f.endsWith('.mjs') || f === 'r10-replay.mjs' || f === 'r3-esc.mjs' || f.startsWith('risk-')) continue;
    const m = await import(`./probes/${f}`);
    for (const [k, v] of Object.entries(m)) walk(v, `${f}:${k}`);
  }
  let deaths = 0, suicides = 0;
  const outside = [];
  for (const [t, src] of seen) {
    if (!GR.deathTalk(t) && !GR.suicideDeath(t)) continue;
    deaths++;
    if (GR.suicideDeath(t)) { suicides++; continue; }
    // (final round 5: and the known false care the detection gate keeps, care at 931fbb0: tests/probes/r5.mjs KNOWN_FALSE_CARE)
    // (final round 6: and tests/probes/r6.mjs KNOWN_FALSE_CARE, the lexicon's own crisis there)
    if (GR.selfEnding(t) && !/ESC|FOLLOW|GO_ON|ESCALATE/.test(src) && !R5.KNOWN_FALSE_CARE.includes(t) && !R6.KNOWN_FALSE_CARE.includes(t)) outside.push(`${src}: ${t}`);
  }
  console.log('r3-esc false care on grief:', JSON.stringify({ phrasings: seen.size, deaths, suicidesNamed: suicides, selfEndingOutsideEscalationSets: outside.length }));
  assert.deepEqual(outside, []);
  assert.ok(deaths > 1000, `${deaths}`);
  // and every suicide named among them is care with 0 requests and never asked
  for (const [t] of seen) {
    if (!GR.suicideDeath(t)) continue;
    const R = visit(t, { server: STUBS.grief });
    assert.ok(['care', 'follow', 'crisis'].includes(R.route), `${t}: ${R.route}`);
    assert.deepEqual([R.asked, R.requests], [false, 0], t);
  }
});
