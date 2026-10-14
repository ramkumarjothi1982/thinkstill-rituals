// Another Angle (hushmallow Beyond), review round 9 (13 Oct 2026): the two round-2 reviews, fixed at the root.
//   S1. deathTalk reads misspelt and unusual deaths ("ded", "diied", "the vet put him to sleep", "my pops passed", "hit by
//       a train", "first christmas without mum", "would have been my dad's 60th"), and the bag of words reads them too.
//   S2. Server lines are an allowlist by reading: without an interpretive marker only fair anger, a practical problem or
//       replaying may say its own lines (never a framing mechanic, a framing line, or an excuse for a wrong); with one,
//       a framing pair that is not about the marked clause gives way to the clause's own.
//   S3. Escalation: "wishing", a death after the wish ("be with my dad, he died"), "who passed", heaven, typos.
//   S4. Someone still alive (dying, intensive care, might not make it, close to death) is never care.
//   U2. assemble_step's pile fits the play area at 320x568, so each piece's words sit on its own pill.
// The probe table is tests/probes/r9.mjs (every probe of both round-2 reviews, verbatim, with its route).
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as P from './probes/r9.mjs';
import * as P8 from './probes/r8.mjs';
import { SEE_AGAIN_LONGING } from './probes/r4.mjs';
/** (final round 4, the check of integ/final-r3, polish) the bare "I want to see him again" is longing: grief, never care. */
const LONGING = new Set(SEE_AGAIN_LONGING);
import { deathTalk, deathEscalation, wantsToFollow, stillAlive, serverLoss, griefLinesOk } from '../src/beyond/grief.js';
import { bagWords, framingAllowed, gentleRoute, framesAsGuess, acknowledges, heavyHarm, FRAMING_MECHANICS } from '../src/beyond/backstop.js';
import { markerKinds, hasMarker, ownLabel } from '../src/beyond/markers.js';
import { authoredScene, sceneParts, feelingOf, fairAnger, feelingGuard, guessGuard, framesScene, serverLinesKeep, SERVER_KEEPS } from '../src/beyond/authored.js';
import { mechanicLines, KIND, FEELING, GRIEF, SAFETY, ANGER_PAIRS, AUTHORED_PAIRS, MECHANIC_LINES } from '../src/beyond/lines.js';
import { GENERAL, SCENARIOS } from '../src/ultra/frameworks.js';
import { checkText } from '../src/engine/safety.js';
import { MECHANIC_MODULES } from '../src/beyond/mechanics/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

/** The route the orchestrator takes for these words (another-angle.js afterTell → startAngle). */
function routeOf(t) {
  const lv = checkText(t).level;
  if (lv === 'crisis' || lv === 'care') return lv;
  if (deathEscalation(t)) return 'follow';
  if (gentleRoute(t)) return 'gentle';
  if (feelingOf(t)) return 'feeling';
  if (framingAllowed(t)) return 'guess';
  if (fairAnger(t)) return 'anger';
  return 'kind';
}
/** Every round of the authored path ("Show me another angle"), until it says it has nothing more. */
function rounds(t) {
  const out = [], exclude = [], usedAngles = [];
  for (let i = 0; i < 11; i++) {
    const s = authoredScene(t, { exclude, usedAngles });
    out.push(s);
    if (s.exhausted || s.grief) break;
    exclude.push(s.reasoning_pattern);
    if (s.angle_id) usedAngles.push(s.angle_id);
    if (s.alt_id) usedAngles.push(s.alt_id);
  }
  return out;
}
const framed = (s) => framesScene(s) || [s.subtitle_line_1, s.subtitle_line_2, s.practical_next_step, s.possible_assumption, s.alternative_angle].some(framesAsGuess)
  || framesAsGuess(JSON.stringify(mechanicLines(s.mechanic, s)));
const server = (o) => ({ source: 'server', ...o, mechanic: o.mechanic || o.interaction_type });
/** What plays for a server answer: { gentle } (griefMode) or { scene } (startAngle's guards, then playScene's). */
function played(t, res) {
  if (gentleRoute(t) || serverLoss(res, t, { heavy: heavyHarm })) return { gentle: griefLinesOk(res) && serverLoss(res, t) ? [res.subtitle_line_1, res.subtitle_line_2] : 'authored' };
  return { scene: guessGuard(guessGuard(feelingGuard(res, t), t), t) };
}
/** True when any of a server answer's own lines is said by what plays. */
const saysServer = (out, res) => {
  const lines = [res.subtitle_line_1, res.subtitle_line_2, res.alternative_angle, res.practical_next_step].filter(Boolean);
  if (out.gentle) return Array.isArray(out.gentle) && out.gentle.some((l) => lines.includes(l));
  const s = out.scene;
  return [s.subtitle_line_1, s.subtitle_line_2, s.alternative_angle, s.practical_next_step].some((l) => lines.includes(l));
};

// ---------------------------------------------------------------- the probe table --
test('r9 probe table: every probe of both round-2 reviews takes its route (verbatim, with the counts)', () => {
  const want = {
    death: ['gentle', 'follow', 'crisis', 'care'], follow: ['follow', 'crisis', 'care'],
  };
  let n = 0;
  const check = (t, ok, why) => { n++; const r = routeOf(t); assert.ok(ok(r), `${t} → ${r} (${why})`); };
  for (const t of [...P.SEM_DEATH, ...P.SEM_DEATH2, ...P.DEATH_MISSES_R2, ...P.DEATH_WITH_MARKER]) check(t, (r) => want.death.includes(r), 'gentle / care');
  for (const t of P.SEM_ORDINARY) check(t, (r) => r === (P.SEM_ORDINARY_GENTLE.includes(t) ? 'gentle' : 'kind'), P.SEM_ORDINARY_GENTLE.includes(t) ? 'gentle' : 'kind');
  for (const t of P.SEM_FEELINGS) check(t, (r) => r === 'feeling', 'feeling');
  for (const t of P.SEM_ANGER) check(t, (r) => r === (P.SEM_ANGER_ROUTES[t] || 'anger'), P.SEM_ANGER_ROUTES[t] || 'anger');
  for (const t of P.SEM_MARKERS) check(t, (r) => r === 'guess', 'guess');
  for (const t of [...P.SEM_FOLLOW_POS, ...P.SEM_FOLLOW_POS2, ...P.UI_FOLLOW]) check(t, (r) => (LONGING.has(t) ? r === 'gentle' : want.follow.includes(r)), LONGING.has(t) ? 'gentle (longing, final round 4)' : 'follow');
  for (const t of [...P.SEM_FOLLOW_NEG, ...P.SEM_FOLLOW_NEG2, ...P.ALIVE, ...P.NOT_FOLLOW_R9]) check(t, (r) => r !== 'follow' && r !== 'care', 'never care');
  for (const t of P.NOT_DEATH_R9) { n++; assert.equal(deathTalk(t), null, t); }
  assert.ok(n >= 540, `${n} probes`);
});

// ----------------------------------------------------------------- S1. death talk --
test('r9 S1: misspelt and unusual deaths are death talk: the gentle path, nothing framed, nothing playful (with a marker too)', () => {
  for (const t of [...P.DEATH_MISSES_R2, ...P.DEATH_WITH_MARKER, ...P.SEM_DEATH, ...P.SEM_DEATH2]) {
    assert.ok(deathTalk(t), t);
    assert.equal(gentleRoute(t), true, t);
    assert.equal(framingAllowed(t), false, t);
    const s = authoredScene(t);
    assert.equal(s.grief, true, t);
    assert.equal(s.mechanic, null, t);
  }
  // the orchestrator's noPlay follows gentleRoute or a bag word (no hop, no playful squeeze line, no ZUZU_SQUEEZE)
  assert.match(read('src/beyond/another-angle.js'), /if \(gentleRoute\(t\) \|\| bagWords\(t\)\) \{\s*S\.noPlay = true;/);
  // the bag of words reads the misspellings and phrasings on its own (never framed even if deathTalk missed one)
  for (const w of P.BAG_R9) { assert.equal(bagWords(`and ${w} and she thinks I am useless`), true, w); assert.equal(framingAllowed(`and ${w} and she thinks I am useless`), false, w); }
  // a gadget's part before "died" is the gadget; an operation's sleep is not a death; a passed application is not one
  for (const t of P.NOT_DEATH_R9) assert.equal(deathTalk(t), null, t);
  // the semantic review's server stubs never reach a mechanic for these words: one gentle answer, the authored lines
  for (const t of P.DEATH_MISSES_R2) for (const res of Object.values(P.REALISTIC)) assert.ok(played(t, server(res)).gentle, t);
});

// ------------------------------------------------------------- S2. the server's lines --
test('r9 S2: without a marker the server says its own lines only for fair anger, a practical problem or replaying', () => {
  assert.deepEqual([...SERVER_KEEPS].sort(), ['practical_problem', 'rumination', 'valid_anger']);
  const texts = [...P.SEM_FEELINGS, ...P.SEM_ANGER.filter((t) => !framingAllowed(t)), ...P8.EVENTS, ...P8.ILLNESS];
  let runs = 0;
  for (const t of texts) {
    assert.equal(framingAllowed(t), false, t);
    for (const [name, res0] of Object.entries(P.REALISTIC)) {
      const res = server(res0);
      const out = played(t, res);
      runs++;
      assert.ok(!saysServer(out, res), `${t} (${name}) said the server's lines`);
      if (out.scene) { assert.ok(!framed(out.scene), `${t} (${name}) → ${out.scene.mechanic}: ${out.scene.subtitle_line_1}`); assert.ok(!FRAMING_MECHANICS.has(out.scene.mechanic), `${t} (${name})`); }
    }
    // every framing reading, whatever its lines say (kind ones too), plays the authored scene
    for (const pattern of ['fact_vs_assumption', 'mind_reading', 'catastrophising', 'overgeneralisation', 'all_or_nothing', 'self_criticism', 'personalisation']) {
      const res = server({ ...P.REALISTIC.realistic_fact, reasoning_pattern: pattern, interaction_type: 'assemble_step', subtitle_line_1: 'That sounds like a lot right now.', subtitle_line_2: 'One small thing could help.', practical_next_step: '', alternative_angle: '', known_fact: '' });
      const out = played(t, res);
      if (out.scene) assert.equal(out.scene.source, 'authored', `${t} (${pattern})`);
    }
  }
  assert.ok(runs >= 300, `${runs} server runs`);
  // a reading that keeps them, with kind lines, plays them (on a kind mechanic, nothing guessed)
  const kept = server({ reasoning_pattern: 'valid_anger', interaction_type: 'find_boundary', mallow_character: 'glitzi', emotion: 'anger', situation_type: 'family', known_fact: '', possible_assumption: '', alternative_angle: '', practical_next_step: 'Tell her what you need from her next time.', subtitle_line_1: 'That was your private space, and it was crossed.', subtitle_line_2: 'Wanting it respected makes sense.', safety_status: 'ok' });
  assert.equal(serverLinesKeep(kept, 'My sister read my diary.'), true);
  const k = played('My sister read my diary.', kept).scene;
  assert.equal(k.source, 'server');
  assert.equal(k.subtitle_line_1, 'That was your private space, and it was crossed.');
  // the real UI case (review E2): fair anger excused with "another explanation" never plays, even on a kept reading
  const ex = server(P.REALISTIC.excuse);
  assert.equal(serverLinesKeep(ex, 'My sister read my diary.'), false);
  const e = played('My sister read my diary.', ex).scene;
  assert.equal(e.source, 'authored');
  assert.equal(e.mechanic, 'find_boundary');
  assert.ok(!saysServer({ scene: e }, ex));
  // a framing mechanic never says the server's lines, whatever the reading
  assert.equal(serverLinesKeep(server({ ...kept, interaction_type: 'pull_apart' }), 'My sister read my diary.'), false);
  // personalisation keeps its lines only beside blame they put on themselves ("it's my fault"), on return_responsibility
  const blame = server({ reasoning_pattern: 'personalisation', interaction_type: 'return_responsibility', known_fact: 'The party didn’t go the way you hoped.', possible_assumption: '', alternative_angle: '', practical_next_step: 'Ask one guest what they enjoyed most.', subtitle_line_1: 'A party has lots of moving parts, and you were one.', subtitle_line_2: 'Which piece of it was really yours to carry?' });
  assert.equal(serverLinesKeep(blame, 'The party went badly and it’s my fault.'), true);
  assert.equal(serverLinesKeep(blame, 'The party went badly.'), false);
});

test('r9 S2: with a marker, only the marked clause is the guess: a framing pair about something else, an excuse, or a "what you know" that carries the guess gives way', () => {
  const t = 'My boss embarrassed me in front of everyone and now everyone thinks I’m useless.';
  assert.equal(framingAllowed(t), true);
  for (const [name, res0] of Object.entries(P.REALISTIC)) {
    const res = server(res0);
    const s = played(t, res).scene;
    // the wrong is never excused ("Maybe they didn't notice.", "Is it possible she was just curious?")…
    if (['realistic_mind', 'excuse'].includes(name)) assert.ok(![s.subtitle_line_1, s.subtitle_line_2].some((l) => [res.subtitle_line_1, res.subtitle_line_2].includes(l)), `${name}: ${s.subtitle_line_1} | ${s.subtitle_line_2}`);
    for (const l of [s.subtitle_line_1, s.subtitle_line_2, s.alternative_angle]) assert.doesNotMatch(String(l), /\b(?:maybe|perhaps|is it possible)\b/i, `${name}: ${l}`);
    // …the guess is only the clause, and the wrong is never quoted as "one way to read it"
    if (s.possible_assumption) assert.match(s.possible_assumption, /everyone thinks I’m useless/, name);
    for (const l of [s.subtitle_line_1, s.subtitle_line_2]) assert.doesNotMatch(String(l), /“My boss embarrassed me[^”]*” is one way/, name);
  }
  // the dev mock's "What you wrote: “…”" (the whole message, the guess clause in it) gives way to the stated event
  const t2 = 'Everyone at work thinks I am useless because I missed one deadline.';
  const mock = server({ reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', known_fact: `What you wrote: “${t2}”`, possible_assumption: 'That everyone at work thinks you are useless.', alternative_angle: '', practical_next_step: '', subtitle_line_1: '“Everyone at work thinks I am useless” is one way to read it.', subtitle_line_2: 'Guesses can be right, and they can be wrong.' });
  const g = guessGuard(mock, t2);
  assert.equal(g.known_fact, 'What you know: “I missed one deadline”.');
  assert.equal(g.subtitle_line_1, mock.subtitle_line_1);
  // a self-label is never lifted out of someone else's view ("I am useless" out of "everyone thinks I am useless")
  assert.equal(ownLabel(t2), null);
  assert.ok(!markerKinds(t2).has('label'));
  assert.equal(sceneParts(t2, server({ reasoning_pattern: 'self_criticism', interaction_type: 'soften_harshness', possible_assumption: '' })).harsh, 'Everyone at work thinks I am useless');
  for (const s of rounds(t2)) assert.doesNotMatch(`${s.subtitle_line_1} ${s.subtitle_line_2}`, /“I am useless”/, s.reasoning_pattern);
  // mind reading quotes the clause they typed, never a situation's invented "pointing out fixes"
  assert.equal(authoredScene(t2).subtitle_line_1, '“Everyone at work thinks I am useless” is a guess about what’s going on inside someone else.');
  // their own label still counts ("I think I'm useless", "I'm so stupid")
  for (const x of ['he called me stupid and now I think I’m useless', 'I failed my driving test. I’m so stupid.', 'I know I’m a failure']) assert.ok(markerKinds(x).has('label'), x);
  for (const x of ['My mum says I’m lazy', 'she thinks I’m such an idiot']) assert.equal(ownLabel(x), null, x);
});

test('r9 S2: a feeling with its time words stays a feeling ("I feel anxious all the time." carries no marker)', () => {
  for (const t of ['I feel anxious all the time.', 'I feel anxious all the time', 'I feel low all day', 'I’m so tired lately']) {
    assert.equal(hasMarker(t), false, t);
    assert.ok(feelingOf(t), t);
    for (const res of Object.values(P.REALISTIC)) assert.ok(!saysServer(played(t, server(res)), server(res)), t);
  }
  assert.equal(hasMarker('I feel like a failure all the time'), true);
});

test('r9 S2: fair anger’s mechanics say a stated event’s own lines, never "a lot of weight on one thought"', () => {
  for (const t of ['My boss embarrassed me in front of everyone', 'My sister read my diary', 'My friend lied to me again.']) {
    for (const s of rounds(t)) {
      assert.equal(s.wrong, true, t);
      const L = mechanicLines(s.mechanic, s);
      assert.doesNotMatch(JSON.stringify(L), /one thought|harsh verdict|Something to learn|This time|Other times/, `${t} → ${s.mechanic}`);
      if (s.mechanic === 'return_responsibility') assert.equal(L.hint, KIND.mechanics.return_responsibility.hint);
    }
  }
  assert.equal(framesAsGuess(MECHANIC_LINES.return_responsibility.hint), true);
});

// --------------------------------------------------------------- the app's framings --
test('r9 framesAsGuess: the review’s server paraphrases, the scenarios’ other readings and the mechanics’ own lines', () => {
  for (const l of [...P.SERVER_PARAPHRASES, ...P.APP_FRAMINGS_R9]) assert.equal(framesAsGuess(l), true, l);
  const ctx = SCENARIOS.flatMap((s) => s.angles).filter((a) => ['context', 'benign'].includes(a.kind)).map((a) => a.text);
  assert.ok(ctx.length >= 18);
  for (const l of [...ctx, ...GENERAL.angles?.filter?.((a) => ['context', 'benign'].includes(a.kind)).map((a) => a.text) || []]) assert.equal(framesAsGuess(l), true, l);
  assert.equal(framesAsGuess(MECHANIC_LINES.reveal_spectrum.hint2), true);
  // never the lines that acknowledge
  for (const l of [...Object.values(KIND.first), ...Object.values(KIND.pairs).flat(), ...Object.values(KIND.steps), ...Object.values(FEELING.first), ...Object.values(FEELING.pairs).flat(),
    ...Object.values(FEELING.steps), FEELING.friend, FEELING.known, ...FEELING.waiting, ...FEELING.waitingLong, GRIEF.heard, ...GRIEF.loss, ...GRIEF.grief, ...GRIEF.heavy, GRIEF.ask, GRIEF.closed,
    ...SAFETY.follow, ...SAFETY.care, ...Object.values(ANGER_PAIRS).flat(), ...AUTHORED_PAIRS.valid_anger, ...AUTHORED_PAIRS.practical_problem, ...AUTHORED_PAIRS.rumination, ...P8.NOT_FRAMINGS]) assert.equal(framesAsGuess(l), false, l);
  // a server grief answer from the design plays (its "isn't a thought to fix" frames nothing)
  assert.ok(P.GRIEF_DESIGN.every(acknowledges));
  assert.ok(griefLinesOk({ subtitle_line_1: P.GRIEF_DESIGN[0], subtitle_line_2: P.GRIEF_DESIGN[1] }));
  for (const l of ['It’s just a thought.', 'That thought isn’t true.', 'Maybe he didn’t mean it.']) assert.equal(acknowledges(l), false, l);
});

// ------------------------------------------------------------------ S3, S4. escalation --
test('r9 S3: wanting to follow the one who died is care, however it is said (wishing, named before the death, heaven, typos)', () => {
  for (const t of [...P.SEM_FOLLOW_POS, ...P.SEM_FOLLOW_POS2, ...P.UI_FOLLOW]) {
    const lv = checkText(t).level;
    if (lv === 'crisis' || lv === 'care') continue;
    // (final round 4) the bare "I want to see him again" is longing, grief (the check's polish)
    assert.equal(deathEscalation(t), !LONGING.has(t), t);
  }
  // the wish named before the death: the pronoun or "who" links to the person named just before
  for (const t of ['i want to be with my dad, he died last year', 'I want to be with my son who passed away', 'I want to be with my dad, who died last year', 'I want to join my wife, she died last spring.']) assert.equal(wantsToFollow(t), true, t);
  // never across a mismatch ("he" is never a mum) or onto someone else's
  for (const t of P.NOT_FOLLOW_R9) assert.equal(deathEscalation(t), false, t);
});

test('r9 S4: someone still alive (dying, intensive care, might not make it, close to death) is never care; the plainest wish still is', () => {
  for (const t of [...P.ALIVE, 'my nan is dying and I want to be with her till the end', 'grandad’s on life support and I want to be with him when they switch it off']) {
    assert.equal(stillAlive(t), true, t);
    assert.equal(deathEscalation(t), false, t);
    assert.equal(routeOf(t), 'gentle', t);
  }
  assert.equal(deathEscalation('my dad’s dying and I want to die with him'), true);
  // a death that happened beside "dying" is not only about someone alive
  assert.equal(stillAlive('my dad died and my mum is dying and I want to be with him'), false);
  assert.equal(deathEscalation('my dad died and my mum is dying and I want to be with him'), true);
});

test('r9 UI: escalation while typing shows the overlay’s Support chip; care never shows the pill and the chip together; a quiet reveal', () => {
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /function noteFollow\(\) \{\s*S\.follow = true;\s*noteSafety\(\{ level: 'care', category: 'death-follow' \}\);\s*keepTypingSupport\(\);/);
  assert.match(src, /function keepTypingSupport\(\) \{[\s\S]{0,120}querySelector\?\.\('button\.support'\)[\s\S]{0,400}MutationObserver/);
  const care = src.slice(src.indexOf('async function careMode('), src.indexOf('function gentleNote('));
  assert.match(care, /dockShow\(\{ finish: true, support: false \}\);\s*const v = await choose\(SAFETY\.careAsk, SAFETY\.careOptions\);/);
  const rev = src.slice(src.indexOf('async function reveal('), src.indexOf('function exploreLine('));
  assert.match(rev, /const quiet = S\.noPlay \|\| S\.level !== 'none';\s*if \(quiet\) careFace\(\); else zt\?\.setStage\('transforming'\);/);
  assert.match(rev, /if \(quiet\) careFace\(\); else zt\?\.setStage\('neutral'\);/);
  // while the server is asked nothing frames the words yet (it may answer them as a loss)
  assert.match(src, /if \(serverMode\(\)\) feel \|\|= \{ kind: 'low' \};\s*const lines = feel \? FEELING\.waiting : WAITING/);
});

// ----------------------------------------------------------------- U2. assemble_step --
test('r9 U2: assemble_step’s pile fits the play area with three-line pieces (320x568), each piece inside it, none on another', async () => {
  const fake = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  globalThis.OffscreenCanvas ??= class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return fake(); } };
  // tags measured like the DOM: up to `max` wide, a 17px line per line of words
  const tags = () => { const list = new Set(); return { add(text, o = {}) { const max = o.max || 220; const w = Math.min(max, String(text).length * 7.2); const lines = Math.ceil(String(text).length * 7.2 / max); const t = { text, w, h: lines * 17, el: { style: { setProperty() {} } }, at() { return t; }, own() { return t; }, rect: () => null, set() { return t; }, title_() { return t; }, hide() { return t; }, remove() { list.delete(t); } }; list.add(t); return t; }, rects: () => [], clear() { list.clear(); }, texts: () => [...list].map((x) => x.text), layout() {}, remeasure() {} }; };
  const text = 'I have a deadline on Monday and too much to do.';
  const scene = authoredScene(text);
  assert.equal(scene.mechanic, 'assemble_step');
  for (const area of [{ x: 16, y: 207, w: 288, h: 237 }, { x: 16, y: 230, w: 358, h: 380 }, { x: 16, y: 200, w: 288, h: 200 }]) {
    const parts = sceneParts(text, scene);
    parts.steps = ['Write down the one part', 'the deadline really needs, and start with that today, whatever else is waiting', 'that'];
    const m = (await MECHANIC_MODULES.assemble_step()).mount({ g: fake(), area: () => area, from: { x: area.x + area.w / 2, y: area.y + 40, r: 30 }, scene, parts, lines: mechanicLines('assemble_step', scene), text, emotion: null, tags: tags(), reducedMotion: () => true, lowStim: () => false, hint() {}, choose: async () => null, haptic() {}, fx() {}, progress() {}, kick() {}, say() {} });
    const p = m.probe();
    const pile = p.all.filter((q) => p.pieces.some((x) => x.i === q.i)).sort((a, b) => a.y - b.y);
    assert.equal(pile.length, 3);
    for (const q of pile) assert.ok(q.y - q.h / 2 >= area.y - 0.5 && q.y + q.h / 2 <= area.y + area.h + 0.5, `${JSON.stringify(area)}: piece ${q.i} at ${q.y} (h ${q.h}) leaves the area`);
    for (let i = 1; i < pile.length; i++) assert.ok(pile[i].y - pile[i].h / 2 >= pile[i - 1].y + pile[i - 1].h / 2 - 0.5 || area.h < pile.reduce((s, q) => s + q.h, 0), `${JSON.stringify(area)}: pieces ${pile[i - 1].i} and ${pile[i].i} overlap`);
    m.destroy();
  }
  // the browser gate checks each piece's words sit on its own pill (the review's 35px gap at 320x568)
  assert.match(read('tools/beyond/angle-gate.cjs'), /piece words off their pill by/);
});

// -------------------------------------------------------------------------- polish --
test('r9 polish: /v1/session’s app_version is the build’s date and short name, never cut mid-word; the config names the three origins', async () => {
  const { appVersion } = await import('../src/beyond/angle-client.js');
  const { BUILD } = await import('../src/app/config.js');
  const v = appVersion();
  assert.ok(v.length <= 40, v);
  assert.ok(BUILD.startsWith(v.split(' · ')[0]), v);
  assert.doesNotMatch(v, /\($|\(high|high-re$/);
  assert.equal(appVersion('2026-10-12 · the Hushfold slice (high-res Mallows, MallowTouch)'), '2026-10-12 · the Hushfold slice');
  assert.equal(appVersion('2026-10-12'), '2026-10-12');
  assert.match(read('src/beyond/angle-client.js'), /app_version: appVersion\(\)/);
  const cfg = read('src/app/config.js');
  for (const o of ['app.hushmallow.com', 'hushmallow.pages.dev', 'ramkumarjothi1982.github.io']) assert.match(cfg, new RegExp(o.replace(/\./g, '\\.')), o);
});
