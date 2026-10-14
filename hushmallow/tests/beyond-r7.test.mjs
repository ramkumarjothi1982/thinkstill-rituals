// Another Angle (hushmallow Beyond), review round 7 (13 Oct 2026): the coordinator's design decision.
//   A. Recall first: deathTalk(text) fires on any death or loss word about anyone or anything alive, apostrophes
//      optional, with only a short list of unambiguous idioms set aside (death-words.js).
//   B. The gentle path's lines are true whether or not anyone died; the server's own grief lines play only when it
//      answered with grief or a loss; an ordinary server scene for death talk never plays its mechanic.
//   C. The backstop: beside any death or harm word, no path frames the words as a fact and a guess.
//   D. Death talk that wants to be with, join or follow the one who died goes to the care path (nothing is sent).
//   E. Review polish: the notice's session code, fair anger's wrong is the fact, "sick with dread" is a feeling,
//      FRAMER.md's origins, the consent card carries what the overlay's clause says.
// The probe tables live in tests/probes/death-talk.mjs (reviewers extend them there).
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as P from './probes/death-talk.mjs';
import { deathTalk, wantsToFollow, deathEscalation, serverGrief, serverLoss, livingLoss } from '../src/beyond/grief.js';
import { harmWords, harmRoute, framingAllowed, gentleRoute, FRAMING_MECHANICS, framesAsGuess } from '../src/beyond/backstop.js';
import { authoredScene, sceneParts, gentleScene, feelingOf, harmGuard, ownFactPair, ownStep, fairAnger, angerSplit, angerUnsaid, FEELING_ORDER } from '../src/beyond/authored.js';
import { GRIEF, SAFETY, FEELING, KIND, MECHANIC_LINES, mechanicLines } from '../src/beyond/lines.js';
import { checkText } from '../src/engine/safety.js';
import { MECHANIC_MODULES } from '../src/beyond/mechanics/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

/** Every round of the authored path for `text`, until it says it has nothing more ("Show me another angle"). */
function rounds(text) {
  const out = [], exclude = [], usedAngles = [];
  for (let i = 0; i < 11; i++) {
    const s = authoredScene(text, { exclude, usedAngles });
    out.push({ scene: s, parts: sceneParts(text, s) });
    if (s.exhausted || s.grief) break;
    exclude.push(s.reasoning_pattern);
    if (s.angle_id) usedAngles.push(s.angle_id);
    if (s.alt_id) usedAngles.push(s.alt_id);
  }
  return out;
}
const said = (s) => [s.subtitle_line_1, s.subtitle_line_2, s.known_fact, s.possible_assumption, s.practical_next_step, s.alternative_angle].filter(Boolean);
/** The framing the backstop forbids (and the gentle lines never use). */
const FRAMING = /what your mind|mind might be adding|one way to read|is what happened|still an open question|open question|check one fact|instead of guessing|what did you actually|what might it mean|another explanation|facts are still unclear|worst case|want to test/i;
/** What a gentle line may never name or imply. */
const ASSUMES = /\b(?:died|dies|dead|death|grief|griev\w*|loss|lost|losing|them|they|miss\w*|passed|gone|funeral|heaven|sorry for|in peace)\b|Missing them|Grief isn/i;
// (r8: return_responsibility too, for something someone did to them: "What someone else did is theirs to carry")
const KIND_STEPS = new Set(['assemble_step', 'soften_harshness', 'separate_one', 'return_responsibility']);

// -------------------------------------------------------------------- A. recall --
test('r7.A: the review’s misses, false alarms and 100+ more are death talk (apostrophes optional, misspellings too)', () => {
  assert.ok(P.DEATH_TALK.length >= 100, `${P.DEATH_TALK.length} probes`);
  for (const text of P.REVIEW_MISSES) assert.ok(deathTalk(text), text);
  for (const text of P.REVIEW_FALSE_ALARMS) assert.ok(deathTalk(text), text);
  for (const text of P.DEATH_TALK) assert.ok(['loss', 'grief'].includes(deathTalk(text)), text);
  for (const text of P.GRIEF_ONLY) assert.equal(deathTalk(text), 'grief', text);
  // the same words with and without the apostrophe, straight or curly
  for (const [a, b, c] of [['my dad’s dead', 'my dad\'s dead', 'my dads dead'], ['she’s gone', 'she\'s gone', 'shes gone'], ['he didn’t make it', 'he didn\'t make it', 'he didnt make it'], ['Mum’s passed', 'Mum\'s passed', 'Mums passed']])
    assert.ok(deathTalk(a) && deathTalk(b) && deathTalk(c), a);
});

test('r7.A: only the short list of unambiguous idioms is set aside (a gadget, dead tired, dying to, killing it, lost my keys, passed my test)', () => {
  assert.ok(P.NOT_DEATH_TALK.length >= 60, `${P.NOT_DEATH_TALK.length} probes`);
  for (const text of P.NOT_DEATH_TALK) assert.equal(deathTalk(text), null, text);
  // a near miss, an imagined death are never set aside; (r2-angle item 4) a game's or a film's death naming no one of their own is
  // (asked the one question first), while "My son died in Fortnite" names someone and stays death talk
  for (const text of ['My dad nearly died.', 'What if my mum dies?', 'I dreamt my nan died.', 'My son died in Fortnite and smashed his controller.']) assert.ok(deathTalk(text), text);
  for (const text of P.STORY_DEATHS) assert.equal(deathTalk(text), null, text);
  // (the server's own loss reading beside one still plays gently: grief.js serverLoss reads them with `stories: false`)
  for (const text of P.STORY_DEATHS) assert.ok(deathTalk(text, { stories: false }), text);
  // the idioms never blank a death beside them
  for (const text of ['My phone died and my dad died.', 'I lost my keys at my nan’s funeral.', 'I passed my test the day my grandad died.', 'I’m dead tired since Mum passed.']) assert.ok(deathTalk(text), text);
});

// --------------------------------------------------------------- B. the gentle path --
test('r7.B: every gentle line is true whether or not someone died: no death, grief, loss, "them" or missing anyone', () => {
  const lines = [GRIEF.heard, ...GRIEF.loss, ...GRIEF.grief, ...GRIEF.heavy, GRIEF.ask, GRIEF.squeeze];
  assert.equal(GRIEF.heard, 'Thank you for telling me.');
  assert.equal(GRIEF.squeeze, 'Take all the time you need.');
  for (const l of lines) {
    assert.doesNotMatch(l, ASSUMES, l);
    assert.doesNotMatch(l, FRAMING, l);
    assert.doesNotMatch(l, /\bAI\b|angle|reframe|fact|guess|mind|squish|fun\b/i, l);
    assert.ok(l.length <= 60, l);
  }
  // the choices stay: squeeze, support, finish
  assert.deepEqual(GRIEF.options.map((o) => o.value), ['squeeze', 'support', 'finish']);
});

test('r7.B: the authored path never says "Missing them…" or "Grief isn’t a thought to fix." (only a server grief answer can)', () => {
  const dir = root + 'src/beyond/';
  const files = [...readdirSync(dir).map((f) => `src/beyond/${f}`), ...readdirSync(dir + 'mechanics').map((f) => `src/beyond/mechanics/${f}`)].filter((f) => f.endsWith('.js'));
  for (const f of files) {
    const src = read(f);
    assert.doesNotMatch(src, /['"`]Missing them|['"`]Grief isn[’']t a thought to fix/, f);
  }
  for (const text of [...P.DEATH_TALK, ...P.BACKSTOP]) {
    for (const { scene } of rounds(text)) for (const line of said(scene)) assert.doesNotMatch(line, /Missing them|Grief isn/i, `${text} → ${line}`);
  }
});

test('r7.B: death talk always plays the gentle scene: no mechanic, no game, no fact or guess, a pair from the gentle lines', () => {
  const pairs = [GRIEF.loss, GRIEF.grief, GRIEF.heavy].map((p) => p.join(' | '));
  for (const text of P.DEATH_TALK) {
    const all = rounds(text);
    assert.equal(all.length, 1, text);
    const s = all[0].scene;
    assert.equal(s.grief, true, text);
    assert.equal(s.mechanic, null, text);
    assert.equal(s.interaction_type, null, text);
    assert.equal(s.known_fact, '', text);
    assert.equal(s.possible_assumption, '', text);
    assert.equal(s.alternative_angle, '', text);
    assert.ok(pairs.includes(`${s.subtitle_line_1} | ${s.subtitle_line_2}`), text);
  }
  // Fortnite: the gentle lines, never "Missing them"
  const fortnite = authoredScene('My son died in Fortnite and smashed his controller.');
  assert.deepEqual([fortnite.subtitle_line_1, fortnite.subtitle_line_2], GRIEF.loss);
  assert.deepEqual([gentleScene('It was the funeral today.').subtitle_line_1, gentleScene('My mum is in hospital.').subtitle_line_1], [GRIEF.grief[0], GRIEF.heavy[0]]);
});

test('r7.B: a server answer plays its two lines for death talk only when it reads as grief or a loss; an ordinary scene never does', () => {
  const mock = (o) => ({ source: 'server', situation_type: 'other', emotion: 'worry', reasoning_pattern: 'fact_vs_assumption', mechanic: 'pull_apart', interaction_type: 'pull_apart',
    subtitle_line_1: 'What you wrote is the part that actually happened.', subtitle_line_2: 'What it means is still a question, not an answer.', ...o });
  const kind = { subtitle_line_1: 'That sounds so hard.', subtitle_line_2: 'You can miss him as much as you need to.' };
  for (const text of P.REVIEW_MISSES) {
    // the mock server's ordinary pull_apart scene: never its lines, never its game (authored gentle lines instead)
    assert.equal(serverGrief(mock(), text), false, text);
    assert.equal(serverLoss(mock({ situation_type: 'loss' }), text), true, text);
    assert.equal(serverLoss(mock({ emotion: 'grief' }), text), true, text);
    // (r8) a loss answer's lines are said only when both acknowledge; the mock's framing pair never is
    assert.equal(serverGrief(mock({ situation_type: 'loss' }), text), false, text);
    assert.equal(serverGrief(mock({ situation_type: 'loss', ...kind }), text), true, text);
  }
  const src = read('src/beyond/another-angle.js');
  const grief = src.slice(src.indexOf('async function griefMode('), src.indexOf('async function unclear('));
  // (final round 5, structural: it was "one request at most, crisis and care still route, a fallback re-runs the app's own check")
  // no request at all from the gentle path; a server scene reaches it only from the ordinary path, already read as a loss
  assert.equal((grief.match(/client\.angle\(/g) || []).length, 0);
  assert.doesNotMatch(src.slice(src.indexOf('async function griefMode('), src.indexOf('const heavySeen = ')), /client\.|res\?\.status/);
  assert.match(src, /serverLoss\(res\.scene, S\.text, \{ heavy: heavyWords \}\)\) \{ griefMode\(\{ scene: griefLinesOk\(res\.scene\) \? res\.scene : null, asked: true \}\); return; \}/);
  assert.match(grief, /if \(!scene\) scene = gentleScene\(S\.text, \{ emotion: S\.emotion, kind: told \|\| \(griefFeeling\(S\.emotion\) \? 'grief' : null\) \}\);\s*else scene = \{ \.\.\.scene, grief: true, mechanic: null \};/);
  assert.doesNotMatch(grief, /spawnThought|playScene|loadMechanic|startAngle|setStage\('playful'\)|WAITING\b/);
  assert.match(grief, /careFace\(\);/, 'Zuzu’s attentive face');
  // startAngle sends death talk (and the gentle route) to griefMode before any Thought Mallow or request
  const start = src.slice(src.indexOf('async function startAngle('), src.indexOf('async function waitingLines('));
  // (review r12: lossRoute, every way to the gentle path the main screen reads too)
  assert.ok(start.indexOf("if (route === 'gentle') return griefMode();") >= 0);
  assert.ok(start.indexOf('lossRoute(S.text') < start.indexOf('spawnThought()') && start.indexOf('lossRoute(S.text') < start.indexOf('client.angle('));
});

// ----------------------------------------------------------------- C. the backstop --
test('r7.C: the backstop reads a broad harm set (the review’s misses and 30 more): never the fact-vs-guess framing', () => {
  assert.ok(P.BACKSTOP.length >= P.REVIEW_MISSES.length + 30);
  for (const text of P.BACKSTOP) {
    assert.equal(harmWords(text), true, text);
    assert.equal(framingAllowed(text), false, text);
    for (const { scene, parts } of rounds(text)) {
      assert.ok(!FRAMING_MECHANICS.has(scene.mechanic), `${text} → ${scene.mechanic}`);
      assert.equal(scene.possible_assumption, '', text);
      for (const line of said(scene)) assert.doesNotMatch(line, FRAMING, `${text} → ${line}`);
      for (const l of [scene.subtitle_line_1, scene.subtitle_line_2, scene.practical_next_step]) assert.equal(framesAsGuess(l), false, `${text} → ${l}`);
      if (scene.mechanic) {
        assert.ok(KIND_STEPS.has(scene.mechanic), `${text} → ${scene.mechanic}`);
        assert.ok(scene.feeling, `${text}: a feeling's safe lines and prompts`);
        const L = mechanicLines(scene.mechanic, scene);
        assert.doesNotMatch(JSON.stringify(L), /What your mind added|What happened|The worst case|Your first guess|Something to learn|This time|Other times/, text);
      }
      void parts;
    }
    // the authored fact-and-guess pair and step say nothing for these words
    assert.equal(ownFactPair('It happened', 'it means something', false, text), null, text);
    for (const p of ['fact_vs_assumption', 'mind_reading', 'catastrophising', 'personalisation', 'self_criticism']) assert.equal(ownStep(p, text, { fact: 'x', guess: 'she thinks I’m useless', allGuess: false }), '', `${text} ${p}`);
  }
});

test('r7.C (r8): ordinary apart from the word ("lost my keys", "my phone died") → the kind steps; death talk → the gentle path; the rest → kind', () => {
  for (const text of P.BACKSTOP_KIND) {
    assert.equal(harmRoute(text), 'kind', text);
    assert.equal(gentleRoute(text), false, text);
    const all = rounds(text);
    assert.ok(all.length > 1, text);
    for (const { scene } of all) { assert.ok(KIND_STEPS.has(scene.mechanic), `${text} → ${scene.mechanic}`); assert.ok(scene.guarded || scene.feeling, text); }
  }
  // (r8, the coordinator's rule 2: death talk goes to the gentle path, any other bag word to the kind mechanics)
  for (const text of P.BACKSTOP.filter((t) => !P.BACKSTOP_KIND.includes(t))) {
    const gentle = !!deathTalk(text) || livingLoss(text);
    assert.equal(gentleRoute(text), gentle, text);
    assert.equal(!!authoredScene(text).grief, gentle, text);
    if (!gentle) for (const { scene } of rounds(text)) assert.ok(KIND_STEPS.has(scene.mechanic) && scene.feeling, `${text} → ${scene.mechanic}`);
  }
  // no harm word at all: the framing stays for an ordinary guess
  assert.equal(framingAllowed('My sister ignored me at the party, she must hate me.'), true);
  assert.equal(harmRoute('My sister ignored me at the party, she must hate me.'), null);
});

test('r7.C: a server scene beside a harm word never plays a framing mechanic, its framing lines, or the fact-checking prompts', () => {
  const server = (o) => ({ source: 'server', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', mechanic: 'pull_apart', mallow_character: 'zuzu', emotion: 'worry', situation_type: 'other',
    known_fact: 'You lost your keys.', possible_assumption: 'That your boss thinks you are useless.', alternative_angle: 'Your boss might not have noticed.', practical_next_step: 'Ask one calm question.',
    subtitle_line_1: 'Losing your keys is the part that actually happened.', subtitle_line_2: 'What it means is still a question, not an answer.', safety_status: 'ok', ...o });
  for (const text of P.BACKSTOP_KIND) {
    const framed = harmGuard(server(), text);
    assert.equal(framed.source, 'authored', text);
    assert.ok(KIND_STEPS.has(framed.mechanic) && framed.feeling, text);
    for (const line of said(framed)) assert.doesNotMatch(line, FRAMING, `${text} → ${line}`);
    // (review r9) a framing reading or mechanic never says its own lines, however kind they are
    const kindLines = { known_fact: '', possible_assumption: '', alternative_angle: '', subtitle_line_1: 'That sounds like a rough morning.', subtitle_line_2: 'One small thing could help.' };
    assert.equal(harmGuard(server({ mechanic: 'open_interpretations', ...kindLines }), text).source, 'authored', text);
    // a reading that keeps them (replaying, a practical problem): its own kind lines may stay, on a kind step, with
    // nothing guessed and no "another explanation"
    const moved = harmGuard(server({ reasoning_pattern: 'rumination', interaction_type: 'let_loop_drift', mechanic: 'let_loop_drift', ...kindLines }), text);
    assert.equal(moved.source, 'server', text);
    assert.equal(moved.mechanic, 'assemble_step', text);
    // (review r12) …but never a practical problem's beside a bag word ("real problems have next steps" for a death): the
    // kind steps' own scene
    const kind = harmGuard(server({ reasoning_pattern: 'practical_problem', interaction_type: 'soften_harshness', mechanic: 'soften_harshness', ...kindLines }), text);
    assert.equal(kind.source, 'authored', text);
    assert.ok(KIND_STEPS.has(kind.mechanic) && kind.feeling, text);
    assert.equal(kind.possible_assumption, '', text);
    assert.equal(kind.alternative_angle, '', text);
  }
  // an ordinary text with a marker keeps the server's scene untouched when its guess is the marker's clause (r8)…
  const plain = server({ possible_assumption: 'That she hates you.' });
  assert.equal(harmGuard(plain, 'My sister ignored me at the party, she must hate me.'), plain);
  // …and when it reads something else of theirs as the guess, only the clause is the guess
  assert.equal(harmGuard(server(), 'My sister ignored me at the party, she must hate me.').possible_assumption, 'What your mind might be adding: “she must hate me”.');
  const src = read('src/beyond/another-angle.js');
  // every scene passes the backstop where it plays; explore and the fallback mechanic follow it
  // (r8: the gate runs on every scene where it plays, framingAllowed inside it)
  assert.match(src, /async function playScene\(scene, seq\) \{[\s\S]{0,500}scene = guessGuard\(scene, S\.text, \{ emotion: S\.emotion \}\);/);
  assert.match(src, /scene = guessGuard\(feelingGuard\(res\.scene, S\.text, \{ emotion: S\.emotion, exclude \}\), S\.text, \{ emotion: S\.emotion, exclude \}\);/);
  assert.match(src, /const gentle = !!scene\.feeling \|\| !framingAllowed\(S\.text\);\s*let remaining = gentle \? EXPLORE\.filter/);
  assert.match(src, /choose\(gentle \? \(first \? FEELING\.exploreAsk : FEELING\.exploreMore\) : \(first \? EXPLORE_ASK : EXPLORE_MORE\)/);
  assert.deepEqual(FEELING.explore, ['friend', 'action'], 'never "What do you actually know?" or "another explanation"');
  for (const l of [FEELING.exploreAsk, FEELING.exploreMore]) assert.doesNotMatch(l, /test/i, l);
});

// a 2D context that accepts every call, and tags without DOM (as in beyond-r5.test.mjs)
function fakeCtx2d() {
  const grad = { addColorStop() {} };
  return new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => grad : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
}
globalThis.OffscreenCanvas ??= class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return fakeCtx2d(); } };
function fakeTags() {
  const list = new Set();
  return {
    add(text, o = {}) { const t = { text, title: o.title, w: 90, h: 30, el: { style: { setProperty() {} } }, at() { return t; }, own() { return t; }, rect: () => null, set(x) { t.text = x; return t; }, title_(x) { t.title = x; return t; }, hide() { return t; }, remove() { list.delete(t); } }; list.add(t); return t; },
    rects: () => [], clear() { list.clear(); }, get size() { return list.size; }, texts: () => [...list].map((t) => t.text), layout() {}, remeasure() {},
  };
}
const mountWith = async (mech, text) => {
  const scene = { ...authoredScene('My sister ignored me at the party, she must hate me.'), mechanic: mech, interaction_type: mech };
  const mod = await MECHANIC_MODULES[mech]();
  return mod.mount({
    g: fakeCtx2d(), area: () => ({ x: 16, y: 170, w: 358, h: 400 }), from: { x: 195, y: 360, r: 36 }, scene, parts: sceneParts(text, scene), lines: MECHANIC_LINES[mech], text, emotion: 'anxiety', tags: fakeTags(),
    reducedMotion: () => true, lowStim: () => false, hint() {}, choose: async () => null, haptic() {}, fx() {}, progress() {}, kick() {}, say() {},
  });
};
test('r7.C: pull_apart, shrink_projection and open_interpretations refuse to mount for these words (the orchestrator then plays a kind step)', async () => {
  for (const mech of FRAMING_MECHANICS) {
    for (const text of [...P.REVIEW_MISSES, 'I lost my keys and my boss thinks I’m useless.', 'My mum is in hospital and I think it’s my fault.']) {
      await assert.rejects(async () => mountWith(mech, text), /never for these words/, `${mech}: ${text}`);
    }
    const m = await mountWith(mech, 'My sister ignored me at the party, she must hate me.');
    m.destroy();
  }
});

// ---------------------------------------------------------------- D. escalation --
test('r7.D: death talk that wants to be with, join or follow the one who died is care (25+ each way)', () => {
  assert.ok(P.ESCALATE.length >= 25 && P.NOT_ESCALATE.length >= 25);
  for (const text of P.ESCALATE) assert.equal(deathEscalation(text), true, text);
  for (const text of P.NOT_ESCALATE) assert.equal(deathEscalation(text), false, text);
  assert.equal(deathEscalation('My nan died and I want to be with her'), true);
  // the escalation is read only beside death talk, and never by the safety lexicon (which still runs first)
  assert.equal(deathEscalation('I want to be with her'), false);
  assert.equal(wantsToFollow('I want to be with her'), true);
  assert.equal(checkText('My nan died and I want to be with her').level, 'none', 'the app’s own escalation, not the lexicon’s');
  assert.doesNotMatch(read('src/beyond/grief.js'), /safety-lexicon|engine\/safety/);
});

test('r7.D: in the orchestrator, the care path comes before anything is sent (support pill, no game, its own calm lines)', () => {
  const src = read('src/beyond/another-angle.js');
  const after = src.slice(src.indexOf('async function afterTell('), src.indexOf('function firstLook('));
  assert.match(after, /noteSafety\(seen\);\s*noteSafety\(checkText\(S\.text\)\);\s*if \(S\.level === 'crisis'\) \{ crisisMode\(\); return; \}\s*if \(S\.level === 'care'\) \{ careMode\(\); return; \}[\s\S]{0,260}if \(deathEscalation\(S\.text\)\) \{ noteFollow\(\); careMode\(\{ lines: SAFETY\.follow \}\); return; \}/);
  assert.ok(after.indexOf('deathEscalation(S.text)') < after.indexOf('startAngle('), 'before any angle (nothing is sent)');
  const grief = src.slice(src.indexOf('async function griefMode('), src.indexOf('async function unclear('));
  // (final round 5: griefMode sends nothing at all now; it still reads the escalation first, before its lines)
  assert.ok(grief.indexOf('deathEscalation(S.text)') >= 0 && grief.indexOf('deathEscalation(S.text)') < grief.indexOf('say(GRIEF.heard'), 'griefMode checks it too, before its lines');
  assert.equal(grief.indexOf('client.angle('), -1, 'and sends nothing');
  const care = src.slice(src.indexOf('async function careMode('), src.indexOf('function concernNote('));
  assert.match(care, /S\.care = true; S\.keepSupport = true; S\.level = worse\(S\.level, 'care'\)/);
  assert.match(care, /dropThought\(\); endMechanic\(true\); dismissCompanion\(\);/);
  assert.match(care, /dockShow\(\{ finish: true \}\);/);
  assert.match(care, /await say\(lines, \{ interrupt: true \}\);/);
  assert.match(src, /supportPill\.hidden = !\(S\.keepSupport \|\| S\.care \|\| S\.crisis\)(?: \|\| !support)?;/, 'the support pill shows on care');
  for (const l of SAFETY.follow) { assert.doesNotMatch(l, /\bAI\b|angle|squish|squeez|fun\b|died|death|grief|loss/i, l); assert.ok(l.length <= 70, l); }
});

// ---------------------------------------------------------------- E. polish --
test('r7.E1: the notice says the session code rides on angle and feedback requests (never /v1/session)', () => {
  const src = read('src/beyond/consent.js');
  assert.match(src, /every angle and feedback request carries this phone’s session code\./);
  assert.doesNotMatch(src, /and every request carries/);
  const client = read('src/beyond/angle-client.js');
  assert.match(client, /POST \/v1\/session \{ device_id, platform, app_version, invite\? \}/);
});

test('r7.E2: fair anger: the wrong is the fact, never the mind’s addition; only a clause that reads into it is the guess', () => {
  for (const text of P.FAIR_ANGER) {
    assert.equal(fairAnger(text), true, text);
    const wrong = angerSplit(text).fact;
    assert.ok(wrong, text);
    const all = rounds(text);
    // (a wrong told with embarrassment, not anger, the angle-polish QA: a stated event's kind steps, never anger's own)
    const unsaid = angerUnsaid(text);
    for (const { scene, parts } of all) {
      assert.ok((unsaid ? ['separate_one', 'return_responsibility', 'assemble_step', 'soften_harshness'] : ['find_boundary', 'return_responsibility', 'assemble_step']).includes(scene.mechanic), `${text} → ${scene.mechanic}`);
      assert.equal(scene.possible_assumption, '', `${text} → ${scene.possible_assumption}`);
      if (unsaid) assert.equal(scene.feeling, 'hurt', text);
      else assert.match(scene.known_fact, /^What you know(?: is what you told me)?: “/, text);
      for (const line of said(scene)) assert.doesNotMatch(line, /one way to read|mind might be adding|what your mind|instead of guessing|open question/i, `${text} → ${line}`);
      assert.ok(parts.guessAsk, `${text}: nothing of theirs is the guess`);
    }
    // the weight put back is the wrong itself (when it fits the slab)
    const rr = all.find((r) => r.scene.mechanic === 'return_responsibility');
    assert.ok(rr, text);
    if (wrong.length <= 44) assert.equal(rr.parts.weight, wrong, text);
    assert.equal(rr.scene.subtitle_line_1, unsaid ? KIND.pairs.return_responsibility[0] : 'What they did is theirs to carry, not yours.');
  }
  const boss = authoredScene('My boss shouted at me in front of everyone');
  assert.equal(boss.known_fact, 'What you know: “My boss shouted at me in front of everyone”.');
  assert.equal(boss.possible_assumption, '');
  assert.equal(authoredScene('My boss embarrassed me in front of everyone').possible_assumption, '');
  for (const [text, guess] of P.FAIR_ANGER_WITH_GUESS) {
    assert.equal(angerSplit(text).guess, guess, text);
    for (const { scene, parts } of rounds(text)) {
      if (scene.possible_assumption) assert.equal(scene.possible_assumption, `What your mind might be adding: “${guess}”.`, text);
      assert.ok(parts.guessAsk || parts.guess === guess, `${text} → ${parts.guess}`);
      assert.doesNotMatch(parts.guess, /embarrassed me/, text);
    }
    const pa = rounds(text).map((r) => r.scene).find((s) => s.mechanic === 'pull_apart');
    if (pa) assert.match(pa.subtitle_line_1, /^“My boss embarrassed me in front of everyone” is what happened\.$/);
  }
});

test('r7.E3: "I keep feeling sick with dread" and "I feel sick about tomorrow" are feelings, never the worst case', () => {
  for (const [text, kind] of P.FEELINGS_E3) {
    assert.equal(feelingOf(text)?.kind, kind, text);
    const all = rounds(text);
    assert.equal(all.length, FEELING_ORDER[kind].length + 1, text);
    for (const { scene } of all) {
      assert.notEqual(scene.mechanic, 'shrink_projection', text);
      assert.ok(scene.feeling, text);
      assert.doesNotMatch(JSON.stringify(mechanicLines(scene.mechanic, scene)), /The worst case/, text);
    }
  }
  // (r8: a feeling about any noun is a feeling, "tomorrow's interview" too)
  assert.equal(feelingOf('I feel anxious about tomorrow’s interview.')?.kind, 'anxious');
});

test('r7.E4: FRAMER.md names every origin the production server accepts (wrangler.toml), never "the only origin"', () => {
  const doc = read('docs/FRAMER.md');
  const toml = read('server/another-angle/wrangler.toml');
  const prod = /\[vars\][\s\S]*?ALLOWED_ORIGINS = "([^"]+)"/.exec(toml)[1].split(',');
  assert.deepEqual(prod, ['https://app.hushmallow.com', 'https://hushmallow.pages.dev', 'https://ramkumarjothi1982.github.io']);
  for (const o of prod) assert.ok(doc.includes(`\`${o}\``), o);
  assert.doesNotMatch(doc, /only origin the server/);
});

test('r7.E5: the consent card (shown before anything is sent) carries what the overlay’s server clause says', () => {
  const aa = read('src/beyond/another-angle.js');
  const clause = /const SERVER_CLAUSE = '([^']+)';/.exec(aa)[1];
  assert.equal(clause, 'Only these words, and the feeling and help you pick, go to our secure server for a new perspective, never photos.');
  const src = read('src/beyond/consent.js');
  const lead = /h\('p', \{ class: 'bx-lead' \},\s*'([^']+)'\)/.exec(src)[1];
  const sent = src.match(/'What’s sent\. '\), '([^']+)'/)[1];
  // words, the feeling, the help, our secure server, a perspective, never photos: each on the card, in its lead or "What's sent"
  for (const must of [/your words/i, /the feeling/, /the kind of help you pick/, /our secure server/, /a perspective/, /Never your photos/]) assert.match(`${lead} ${sent}`, must);
  // the card is the notice itself, shown before the first request (arrive → askConsent → invite)
  assert.match(aa, /if \(client && consentState\(store\) === 'unasked'\) \{ await askConsent\(\); if \(S\.left\) return; \}\s*invite\(\);/);
});
