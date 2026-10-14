// The owner's decision 'Ask before every world' (14 Oct 2026), after a fresh review showed the word lists keep missing
// ways of telling a death: on the main screen, after every Tell whose words are ordinary, and before any Thought Mallow
// is made or any world starts or takes the words, the Mallow asks one gentle choice — "Shall we play with this, or just
// be with it?" — so a death is never played without the person choosing it. Detected losses (deathTalk, livingLoss,
// strongLoss, a chosen grief-family feeling) still go straight to the gentle path with no question; crisis, care and the
// wish to follow someone who died still route to support first. The question replaces the "Is this about losing
// someone?" check-in wherever both would apply (never two questions in a row). Plus the reviews' main-screen P3 items:
// the visit stays quiet after an unanswered question, one Support control at a time, the ocean opens gently in a gentle
// visit, and the scrim's deepening over a bright spot is pill-shaped and only as deep as the spot needs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief } from '../src/hushfold/input-overlay.js';
import { tellRoute, askOutcome } from '../src/app/scenes/hushfold.js';
import { PLAY_CHECK, SHARED_LINES } from '../src/hushfold/lines.js';
import { hotAlpha, hotSpot, luminance } from '../src/hushfold/subtitles.js';
import { WORLDS } from '../src/hushfold/flow/registry.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const P = await import('./probes/r12.mjs');
await loadGrief();
const m = { checkText };
const hf = read('src/app/scenes/hushfold.js');

/** Where a first Tell of these words goes on the main screen (readSafety, then afterTell's order: tellRoute). */
function route(t, { emotion = null, chosen = null, visit = 'none', careSaid = false } = {}) {
  const s = readSafety(m, t, true, { emotion });
  const L = ['none', 'concern', 'care', 'crisis'];
  const level = L.indexOf(visit) > L.indexOf(s.level) ? visit : s.level;
  return tellRoute({ level, carried: careSaid && s.level === 'none', chosen });
}

// ------------------------------------------------------------------------------------------- the words --
test('the question\'s words: short, kind, never assuming, no "AI"; two real choices, Play first; about 45 s (review r2 P2)', () => {
  assert.equal(PLAY_CHECK.ask, 'Shall we play with this, or just be with it?');
  assert.equal(PLAY_CHECK.play, 'Play with it');
  assert.equal(PLAY_CHECK.stay, 'Just be with it');
  assert.equal(PLAY_CHECK.ms, 45000);
  assert.equal(PLAY_CHECK.calm, 'Somewhere calm');
  assert.equal(PLAY_CHECK.calmMs, 12000);
  for (const l of [PLAY_CHECK.ask, PLAY_CHECK.play, PLAY_CHECK.stay, PLAY_CHECK.be, PLAY_CHECK.calm]) {
    assert.doesNotMatch(l, /\bAI\b|Hushmallow|died|death|dead|loss|losing|grief|sad|sorry|support|help/i, l);
    assert.ok(l.length <= 48, l);
  }
  // "Just be with it" answers with a line that assumes nothing and asks nothing more (the quiet choice that follows is a
  // statement with two chips, never a second question)
  assert.doesNotMatch(PLAY_CHECK.be, /\?/);
  assert.doesNotMatch(SHARED_LINES.careAsk[0], /\?/);
  // the brand test scans every source string; the question is one of them
  assert.match(read('src/hushfold/lines.js'), /export const PLAY_CHECK = Object\.freeze\(\{/);
});

// --------------------------------------------------------------------------------- the decision logic --
test('tellRoute: crisis, then care answered earlier (carried), then care / distress / a named loss (support), else the question', () => {
  assert.equal(tellRoute({ level: 'crisis' }), 'crisis');
  assert.equal(tellRoute({ level: 'crisis', carried: true }), 'crisis');
  assert.equal(tellRoute({ level: 'care' }), 'support');
  assert.equal(tellRoute({ level: 'concern' }), 'support');
  assert.equal(tellRoute({ level: 'concern', carried: true }), 'carried');
  assert.equal(tellRoute({ level: 'care', carried: true }), 'carried');
  assert.equal(tellRoute({ level: 'none' }), 'ask');
  assert.equal(tellRoute({ level: 'none', carried: true }), 'ask', 'nothing heavy in the visit: asked');
  assert.equal(tellRoute({}), 'ask');
  // "Play with it" already chosen for these words (the free tier, back from the plans page with a plan): not asked twice
  assert.equal(tellRoute({ level: 'none', chosen: 'play' }), 'play');
  // ...but a choice never outranks safety
  assert.equal(tellRoute({ level: 'crisis', chosen: 'play' }), 'crisis');
  assert.equal(tellRoute({ level: 'concern', chosen: 'play' }), 'support');
  // there is no route to a Thought Mallow or a world without the person's choice
  for (const level of ['none', 'concern', 'care', 'crisis']) for (const carried of [false, true]) assert.notEqual(tellRoute({ level, carried }), 'play');
});

test('askOutcome: Play, Just be with it, no answer or Back (quiet), a new Tell opened over it (asked again for those words)', () => {
  assert.equal(askOutcome('play'), 'play');
  assert.equal(askOutcome('stay'), 'stay');
  assert.equal(askOutcome(null), 'quiet');
  assert.equal(askOutcome(undefined), 'quiet');
  assert.equal(askOutcome(false), 'quiet');
  assert.equal(askOutcome(null, { telling: true }), 'retold');
  assert.equal(askOutcome('play', { telling: true }), 'play');
});

test('every path from real words: ordinary → asked; a loss the lists only suspect → asked once (never two questions); a named loss → gentle, never asked', () => {
  // ordinary Tells: the question, before anything is made of them
  for (const t of [...P.R5_ORDINARY, 'I am furious that the train was cancelled again', 'I\'m so angry my boss ignored me again', 'I am worried about my exam tomorrow']) {
    assert.equal(route(t), 'ask', t);
  }
  // the unsure ones (lossRoute 'ask', the old check-in): the same one question
  for (const t of [...P.R5_DEATH_CHECK_IN, ...P.ORDINARY_CHECK_IN]) {
    assert.equal(readSafety(m, t, true).unsure, true, `unsure: ${t}`);
    assert.equal(route(t), 'ask', t);
  }
  // deaths the words name (deathTalk, livingLoss, strongLoss): straight to the gentle path, no question
  for (const t of ['my dad died last week', 'We lost Dad in March.', 'my cat was put to sleep today', 'the funeral is on friday', 'my nan has dementia and doesnt know who i am',
    'a drunk driver took my brother from us', 'my grandma passed away peacefully in her sleep']) {
    assert.equal(route(t), 'support', t);
  }
  // a grief-family feeling chosen, whatever the words: gentle, no question
  for (const emotion of ['grief', 'mourning', 'bereft', 'heartache', 'heartbreak', 'anticipatory-grief']) assert.equal(route('I keep thinking about the weekend', { emotion }), 'support', emotion);
  for (const emotion of ['sadness', 'anger', 'anxiety']) assert.equal(route('I keep thinking about the weekend', { emotion }), 'ask', emotion);
  // crisis and care: support first, as before (the wish to follow someone who died is care)
  assert.equal(route('I want to die'), 'crisis');
  assert.equal(route('he finally hit me'), 'support');
  assert.equal(route('My nan died and I want to be with her'), 'support');
  assert.equal(readSafety(m, 'My nan died and I want to be with her', true).level, 'care');
  // more ordinary words later in a visit whose care was answered: the short acknowledgement and the quiet choice
  assert.equal(route('anyway the bus was late again', { visit: 'care', careSaid: true }), 'carried');
  // a crisis earlier in the visit holds whatever is sent next
  assert.equal(route('anyway the bus was late again', { visit: 'crisis', careSaid: true }), 'crisis');
});

test('the reviews\' misses (semantic score 4: 41 death probes that reached a Thought Mallow; browser score 7: 10 more) are all asked first now', () => {
  const SEM = [
    "my dad's time came last week and I still can't believe it", "it's been a year since he went and it doesn't get easier", 'my old girl had to be put down this morning',
    'said bye to Pepper at the vets today', 'we lost our Kev to the drink in march', "the baby's heart wasn't beating at the scan", 'she came too early and only stayed with us for an hour',
    'the pregnancy didn\'t continue', 'it was the drink that finished him off', 'one year today since the accident that took her', 'we had to let Bella go, the vet said she was in too much pain',
    "I keep thinking about the last conversation I had with my grandad before the stroke. I was rushing and I said I'd call him at the weekend and I never did, and now I'll never get the chance. Everyone says it's not my fault.",
    'my gran slipped off in her sleep on sunday', 'the vet came to the house for Milo this morning', 'my budgie is pining for the fjords', 'my uncle returned to Allah this morning',
    'baba is with Allah now', 'my dad got his heavenly reward', "we're sitting with my bubbe's body tonight", 'my grandad kicked it last night', "my uncle's brown bread, mate",
    'our cat got hit on the road last night', 'my goldfish was floating when I got home', 'I had a d&c on monday', 'my waters broke at 19 weeks and he was too little',
    "my hcg levels dropped and the doctor said it's not progressing", 'I passed the pregnancy at home', 'the sac was empty at our 8 week scan', 'we found out at the 12 week scan there was nothing there',
    "we've lost another one, that's three now", 'covid had him in a week', 'my granmda is gone',
  ];
  const UI = ["my sister's memorial is tomorrow", 'the coroner called about my brother', 'the vet said there was nothing more they could do', "I'm clearing out my late father's flat",
    'my daughter would have been ten today', 'I held her hand until the end', "my mum's anniversary is coming up and I keep crying", 'nobody mentions my brother anymore since the accident',
    "I can't stop looking at the last photo of my dog", 'I still set a plate for him at dinner'];
  for (const t of [...SEM, ...UI]) {
    const r = route(t);
    // asked, or (where a list now reads it, or the lexicon reads care) support first — never a Thought Mallow before a choice
    assert.ok(r === 'ask' || r === 'support' || r === 'crisis', `${t} → ${r}`);
  }
  // the probes the old check-in caught still reach one question, not two
  for (const t of P.R5_DEATH_CHECK_IN) assert.equal(route(t), 'ask', t);
});

// ------------------------------------------------------------------------------- the scene, in order --
test('afterTell: crisis, carried, support, then the question — before the plans page, any Thought Mallow and any world', () => {
  const after = between(hf, 'async function afterTell(', 'async function askPlay(');
  const order = ["if (safety?.level === 'crisis') {", 'if (carried && gentle()) {', "if (safety?.level === 'care' || safety?.level === 'concern') {",
    "if (tellRoute({ level: safety?.level || 'none', carried, chosen }) === 'ask') {"];
  const at = order.map((s) => after.indexOf(s));
  at.forEach((i, k) => assert.ok(i > 0, order[k]));
  for (let k = 1; k < at.length; k++) assert.ok(at[k - 1] < at[k], `${order[k - 1]} before ${order[k]}`);
  const ask = at[3];
  for (const later of ["if (!ent.has('paid'))", 'spawnThought(text', 'startFlow(', 'warmWorld(', "stageMallow.react('nod')", "lines.pick(mallowId, 'ack'"]) {
    assert.ok(ask < after.indexOf(later), `the question comes before ${later}`);
  }
  // the safety level of the visit is applied before any branch (unchanged)
  assert.ok(after.indexOf("if (LEVELS.indexOf(S.level) > LEVELS.indexOf(safety?.level || 'none'))") < at[0]);
  const branch = after.slice(ask, after.indexOf("if (!ent.has('paid'))"));
  assert.match(branch, /const out = askOutcome\(await askPlay\(kept\), \{ telling: !!overlay \}\);/);
  assert.match(branch, /if \(out === 'stay'\) \{ await beWithIt\(\{ emotion, intention \}\); return; \}/);
  assert.match(branch, /if \(out === 'quiet'\) \{ quietAfterAsk\(\); return; \}/);
  assert.match(branch, /if \(out === 'retold'\) \{ holdForAsk\(false\); return; \}/);
  assert.match(branch, /holdForAsk\(false, \{ play: true \}\);\s*endSoft\(\);\s*\}/, 'Play: the world that waited carries on, the quiet is over, and the flow is exactly as before');
  // the free tier: "Play with it" leads to the plans page with the choice kept, so back with a plan it is not asked twice
  assert.match(after, /app\.state\.pendingTell = \{ input, emotion, intention, chosen: 'play', at: Date\.now\(\) \};/);
  assert.match(between(hf, 'async function resumePendingTell() {', 'function offerRetell('), /afterTell\(\{ text: p\.input\?\.text \|\| '', [^\n]*chosen: p\.chosen \|\| null \}\)/);
  // the old check-in is gone from the scene: one question only, whatever the unsure flag says
  assert.doesNotMatch(hf, /askAboutLoss|LOSS_CHECK|lossCheck|safety\?\.unsure|detail\.unsure/);
});

test('the question: attentive, nothing playful, real buttons in the live region, its own Back layer; a world waits under its veil', () => {
  const fn = between(hf, 'async function askPlay(words = null) {', 'let askHold = null;');
  assert.match(fn, /S\.told = true;\s*S\.asking = true;\s*stageMallow\.setStage\(CARE_FACE, \{ quiet: true \}\);/);
  // the world pauses first (its own passing lines go with the pause), then the question
  assert.ok(fn.indexOf('holdForAsk(true);') < fn.indexOf('subtitles.choice(PLAY_CHECK.ask'));
  assert.match(fn, /pushLayer\('ask'\);/);
  // (equal weight, coordinator default: neither chip is primary; "Play with it" first in reading order)
  assert.match(fn, /subtitles\.choice\(PLAY_CHECK\.ask, \[\{ label: PLAY_CHECK\.play, value: 'play', onPick: pick\('play'\) \}, \{ label: PLAY_CHECK\.stay, value: 'stay', onPick: pick\('stay'\) \}\],/);
  assert.doesNotMatch(fn, /primary/);
  assert.match(fn, /timeoutMs: PLAY_CHECK\.ms, transient: true, ask: true, focus: true, waitHidden: true, interrupt: !subtitles\.holding/);
  assert.match(fn, /finally \{\s*S\.asking = false;\s*popLayer\('ask'\);[\s\S]*?focusTell\(\);/);
  // squeezing stays quiet while it waits (and for the rest of a quiet visit)
  assert.match(hf, /if \(softNow\(\)\) return;\s+\/\/ after something heavy, or "Just be with it"[^\n]*\n\s*if \(S\.asking\) return;/);
  // Back lets it go, as no answer would; no reload while it waits
  assert.match(hf, /if \(!overlay && !readEl && !panel\?\.isOpen && !sheets\.length && !layer\.ask\) return null;/);
  assert.match(hf, /if \(k === 'ask'\) subtitles\.drop\(\(o\) => o\.ask\);/);
  assert.match(between(hf, 'safeForUpdate() {', 'return view;'), /if \(S\.asking\) return false;/);
  // the subtitles' chips are real 46 px <button>s, announced through the live region (unchanged, shared with every choice)
  const subs = read('src/hushfold/subtitles.js');
  assert.match(subs, /h\('button', \{ class: `hf-chip\$\{o\.primary \? ' primary' : ''\}\$\{o\.soft \? ' soft' : ''\}`, type: 'button'/);
  assert.match(subs, /const liveEl = h\('div', \{ class: 'hf-sublive', role: 'status', 'aria-live': 'polite'/);
  assert.match(read('src/ui/hushfold.css'), /\.hf-chip \{ min-height: 46px;/);
});

test('in a world: it pauses while the question waits (no Paused pill or line), Play carries it on, and nothing else\'s hold is undone', () => {
  const hold = between(hf, 'function holdForAsk(on, { play = false } = {}) {', 'function releaseSoftHold() {');
  // on: only a running world it may pause (the person's own Pause stays theirs: paused: false)
  assert.match(hold, /if \(askHold \|\| !worldMode \|\| S\.finishing \|\| !flowRef \|\| flowRef\.stub\) return;/);
  assert.match(hold, /askHold = \{ paused: !st\.paused \};\s*if \(askHold\.paused\) \{ try \{ flowRef\.pause\?\.\(\); \}/);
  // off: only what this hold paused, never over a safety hold; the phone sheet or a sheet over it carries it on when it closes
  assert.match(hold, /if \(!\(h0\?\.paused \|\| soft\) \|\| !worldMode \|\| S\.finishing \|\| !flowRef \|\| flowRef\.stub \|\| S\.hold\) \{ panel\?\.update\(\); return; \}/);
  assert.match(hold, /if \(sheetHold\) \{ sheetHold\.paused = true; return; \}/);
  assert.match(hold, /if \(held\) \{ held\.wantPaused = false; return; \}/);
  assert.match(hold, /if \(st\.phase !== 'finished' && st\.paused\) \{ pausedPill\.hidden = true; try \{ flowRef\.resume\?\.\(\); \}/);
  // the director's 'pause' for it shows no Paused pill and no "Paused" line: it is not the person pausing it
  assert.match(between(hf, 'function onPaused(on) {', 'function resumeFlow() {'), /if \(held \|\| \(on && \(sheetHold\?\.paused \|\| askHold\)\)\) \{ panel\?\.update\(\); return; \}/);
  // a world that ends meanwhile forgets it
  assert.match(between(hf, 'function endWorldMode() {', 'function onMeltBegins('), /S\.softHold = false; askHold = null;/);
});

test('"Just be with it": nothing made of the words, one gentle line and one soft chip (never a second question), no support line; in a world held quietly until it goes', () => {
  const be = between(hf, 'async function beWithIt({ emotion, intention }) {', 'function quietAfterAsk() {');
  assert.match(be, /softVisit\(\);/);
  assert.match(be, /stage\?\.thoughts\.release\(900\);/, 'the thoughts on stage drift off softly');
  assert.doesNotMatch(be, /spawnThought|startFlow|careBeat|noteSafety|supportPill|SHARED_LINES\.support/, 'no Thought Mallow, no world, no support line, no Support pill');
  // in a world: it stays under its veil, held quietly (no Paused pill), the words never given to it
  assert.match(be, /askHold = null;\s*S\.hold = 'quiet'; S\.softHold = true;\s*pausedPill\.hidden = true;\s*try \{ flowRef\.setThoughts\?\.\(null\); \}/);
  assert.match(be, /S\.quietBeat = softChoice\(\{ emotion, intention \}\)/);
  assert.doesNotMatch(be, /careChoice|Stay here quietly/, 'never the second choice');
  const soft = between(hf, 'async function softChoice(', 'function quietAfterAsk() {');
  // the one line with the one soft chip: a calm world only (never "Glitzi's storm, taken slowly"), fading after ~12 s
  assert.match(soft, /const gw = await gentleWorld\(\{ calmOnly: true \}\);/);
  assert.match(soft, /subtitles\.choice\(again \? null : PLAY_CHECK\.be, \[\{ label: PLAY_CHECK\.calm, value: 'calm', soft: true \}\],/);
  assert.match(soft, /timeoutMs: PLAY_CHECK\.calmMs, transient: true, soft: true/);
  assert.match(soft, /playCalm\(\{ emotion, intention, worldId: gw\.worldId, safety: null, soft: true \}\)/);
  // let go: a world held quietly for it ends quietly (at home nothing more: staying is the default)
  assert.match(soft, /if \(S\.hold === 'quiet' && S\.softHold && worldMode\) endQuietWorld\(\);/);
  // the calm world, played as a gentle session with no words (careChoice's and the soft chip's alike)
  const choice = between(hf, 'async function careChoice({ emotion, intention, safety, soft = false }) {', 'function calmTheWorld(');
  assert.match(choice, /const gw = await gentleWorld\(\{ calmOnly: soft \}\);/);
  assert.match(choice, /playCalm\(\{ emotion, intention, worldId: gw\.worldId, safety, soft \}\);/);
  assert.match(choice, /startFlow\(\{ emotion: emotion \|\| S\.emotion, intention: calm, input: null, safety, worldId, soft \}\);/);
  assert.match(choice, /gentle: \{ level: S\.level, category: S\.category, \.\.\.\(soft \? \{ soft: true \} : \{\}\) \}/, 'the free tier: the plans page keeps it gentle');
  // stay (or no answer) ends a world held quietly; somewhere calm melts into the calm world (calmTheWorld), unheld
  assert.match(choice, /if \(S\.hold === 'care' \|\| S\.hold === 'quiet'\) \{ S\.hold = null; S\.softHold = false; pausedPill\.hidden = true; \}/);
  assert.match(choice, /if \(worldMode && flowRef && !flowRef\.stub && !S\.finishing\) \{ calmTheWorld\(worldId\); return; \}/);
  assert.match(choice, /\} else if \(S\.hold === 'quiet' && worldMode\) \{/);
  // (a question asked for new words over it takes the stage: its answer decides, never this choice's let-go)
  assert.match(choice, /if \(v == null && S\.asking\) return;/);
  // nothing to offer: a world held quietly still ends quietly, never left under its veil
  assert.match(choice, /if \(!gw\) \{ if \(S\.hold === 'quiet' && worldMode\) endQuietWorld\(\); else say\(SHARED_LINES\.careQuiet\); return; \}/);
  // the calm world after it: no words, a gentle session (calm only, its gentle lines, no garden offers)
  const start = between(hf, 'async function startFlow(', 'async function warmWorld(');
  assert.match(start, /if \(gentle\(\) \|\| soft\) wordsCur = null;/);
  assert.match(start, /gentle: gentle\(\) \|\| soft \}\);/);
  // a Tell opened and closed over the held world brings the soft chip back, alone — never the support line
  const close = between(hf, 'onClose: (reason, meta = {}) => {', 'pushLayer(\'overlay\');');
  assert.match(close, /const soft = S\.softHold && !gentle\(\);\s*if \(!soft\) S\.careSaid = true;/);
  assert.match(close, /soft \? softChoice\(\{ again: true \}\)/);
});

test('no answer, or Back: nothing made of the words, the stage stays quiet; a world that waited stays paused with its Resume theirs', () => {
  const q = between(hf, 'function quietAfterAsk() {', '/**\n   * The feeling the words themselves suggest');
  assert.match(q, /softVisit\(\);\s*stageMallow\.setStage\(CARE_FACE, \{ quiet: true \}\);/);
  assert.doesNotMatch(q, /\bsay\(|spawnThought|startFlow|careBeat|careChoice|endQuietWorld|\.finish\?\./);
  assert.match(q, /pausedPill\.hidden = false;/);
});

test('the visit stays quiet after "Just be with it" or an unanswered question (review P3): no quips, invitations, hellos or cheery lines; support stays where it was', () => {
  const sv = between(hf, 'function softVisit() {', 'function noteSafety(');
  assert.match(sv, /S\.soft = true;\s*app\.state\.hfSoft = true;/);
  assert.doesNotMatch(sv, /supportPill|noteSafety|setStageFloor|keepSafety|S\.level/, 'nothing heavy was said: no Support pill, no level');
  assert.match(hf, /const softNow = \(\) => gentle\(\) \|\| !!S\.soft;/);
  assert.match(hf, /soft: !!app\.state\.hfSoft,/, 'kept for the page session (memory only)');
  const uses = [
    ['function onMallowTouch(e) {', /if \(softNow\(\)\) return;/],
    ['const canInvite = () =>', /!softNow\(\)/],
    ['async function switchMallow(dir) {', /if \(softNow\(\)\) \{/],
    ['async function pickFeeling(id) {', /if \(e && !softNow\(\)\) say\(/],
    ['async function pickIntention(id) {', /if \(id === 'play' && !softNow\(\)\) say\(/],
    ['function onFinished() {', /else if \(softNow\(\)\) bye = say\(SHARED_LINES\.careQuiet\);/],
    ['function onFlowError(d) {', /say\(softNow\(\) \? SHARED_LINES\.careQuiet : SHARED_LINES\.stub\[0\]\)/],
    ['async function setFeeling(id', /if \(softNow\(\)\) stageMallow\.setStage\(CARE_FACE/],
    ['function openTellNow(prompt) {', /stageMallow\.setStage\(softNow\(\) \? CARE_FACE : 'listening'/],
  ];
  for (const [start, re] of uses) { const i = hf.indexOf(start); assert.ok(i >= 0, start); assert.match(hf.slice(i, i + 4000), re, start); }
  assert.match(hf, /const quiet = \(\) => [^;]*!softNow\(\);/, 'no opening nudge');
  // the Support pill is still only gentle()'s: shown by noteSafety, careBeat and careAgain alone (never "Just be with it")
  const shows = [...hf.matchAll(/supportPill\.hidden = false;/g)].map((x) => x.index);
  const fns = ['function noteSafety(r) {', 'async function careBeat(', 'async function careAgain('].map((f) => [hf.indexOf(f), hf.indexOf('\n  }\n', hf.indexOf(f))]);
  assert.equal(shows.length, 3);
  for (const i of shows) assert.ok(fns.some(([a, b]) => i > a && i < b), `at ${i}`);
});

// --------------------------------------------------------------------------------------- P3: one Support --
test('one Support control at a time while typing (review P3 at 320): the dock\'s pill steps away under the open overlay', () => {
  const open = between(hf, 'function openTellNow(prompt) {', 'onSubmit: (r) => afterTell(');
  assert.ok(open.indexOf('supportUnder(true);') > 0 && open.indexOf('supportUnder(true);') < open.indexOf('overlay = inputMod.openInput('));
  const close = between(hf, 'onClose: (reason, meta = {}) => {', 'pushLayer(\'overlay\');');
  assert.ok(close.indexOf('supportUnder(false);') > close.indexOf('noteSafety(meta.safety);'));
  const fn = between(hf, 'function supportUnder(on) {', 'function showTell(on) {');
  assert.match(fn, /supportPill\.classList\.toggle\('is-under', !!on\);\s*supportPill\.inert = !!on;/);
  assert.match(fn, /setAttribute\('aria-hidden', 'true'\)/);
  // (it takes no room in the dock and the layout reads it as away)
  assert.match(read('src/ui/hushfold.css'), /\.hf-dock \.hf-pill\.is-under \{ position: absolute; opacity: 0; pointer-events: none !important;/);
  assert.match(between(hf, 'function dockTop(', 'const panelSheet'), /e\.classList\.contains\('is-under'\)/);
});

// ------------------------------------------------------------------------------ P3: the ocean, gently --
test('a gentle session\'s ocean opens with a gentle line, never "Ahh. The storm became a sea." (review P3), and keeps its quip', () => {
  const ocean = WORLDS.find((w) => w.id === 'luminous-ocean');
  assert.equal(ocean.dialogue.arrive[0], 'Ahh. The storm became a sea.', 'the ordinary melt keeps its line');
  const g = ocean.dialogue.gentle;
  assert.ok(g && g.intro?.length && g.arrive?.length);
  assert.equal(g.chop, null, 'no "Splashy." in a gentle session');
  for (const l of [...g.intro, ...g.arrive]) assert.doesNotMatch(l, /storm|splash|\bAI\b|!|haha|fun/i, l);
  const src = read('src/hushfold/flow/worlds/luminous-ocean.js');
  assert.match(src, /function line\(k\) \{\s*const d = ctx\.entry\.dialogue \|\| \{\};\s*return ctx\.gentle && d\.gentle && k in d\.gentle \? d\.gentle\[k\] : d\[k\];/);
  for (const k of ['intro', 'arrive', 'chop']) assert.match(src, new RegExp(`say\\(line\\('${k}'\\)\\)`), k);
  assert.doesNotMatch(src, /say\(ctx\.entry\.dialogue\?\.(intro|arrive|chop)\)/);
});

// ------------------------------------------------------------------------------- P3: the scrim, softly --
test('hotAlpha: the deepening over a bright spot is only as deep as the spot needs to read as the sky round it — never a dark blot', () => {
  const D = [9, 6, 28];
  const over = ([r, g, b], k) => luminance(r + (D[0] - r) * k, g + (D[1] - g) * k, b + (D[2] - b) * k);
  const cases = [
    { core: [255, 250, 225], sky: [110, 175, 230], a: 0.78, name: 'the daytime sun on a blue sky' },
    { core: [245, 240, 255], sky: [92, 70, 160], a: 0.6, name: 'Noomi\'s moon on a violet night' },
    { core: [255, 236, 180], sky: [200, 170, 120], a: 0.84, name: 'a low sun on a warm orchard' },
  ];
  for (const { core, sky, a, name } of cases) {
    const t = hotAlpha(core, sky, a);
    assert.ok(t > 0 && t <= 0.8, `${name}: ${t}`);
    const k = 1 - (1 - a) * (1 - t);
    // under both layers the spot's core reads no lighter than the sky under the scrim alone (no muddy disc)…
    assert.ok(over(core, k) <= over(sky, a) * 1.08 + 1e-4, `${name}: core ${over(core, k)} vs sky ${over(sky, a)}`);
    // …and no darker than a little below it (no blot): the old fixed 0.8 was far darker than the sky round it
    assert.ok(over(core, k) >= over(sky, a) * 0.6, `${name}: not a blot`);
    const kOld = 1 - (1 - a) * (1 - 0.8);
    assert.ok(over(core, kOld) <= over(core, k) + 1e-9, `${name}: never deeper than the old blot`);
  }
  // nothing brighter than the sky: nothing added; the cap holds; bad input adds nothing
  assert.equal(hotAlpha([90, 70, 150], [92, 70, 160], 0.6), 0);
  assert.ok(hotAlpha([255, 255, 255], [10, 8, 30], 0.5, { max: 0.5 }) <= 0.5);
  assert.equal(hotAlpha(null, [1, 1, 1], 0.5), 0);
  assert.equal(hotAlpha([255, 255, 255], [1, 1, 1], 1), 0);
  // hotSpot reports the spot's core and the sky round it
  const cols = 48, rows = 12, d = new Uint8ClampedArray(cols * rows * 4);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const sun = Math.hypot(i - 38, j - 4) < 4; const px = sun ? [255, 250, 225] : [110, 175, 230]; d.set([...px, 255], (j * cols + i) * 4); }
  const s = hotSpot(d);
  assert.ok(s && s.a === 0.8);
  assert.deepEqual(s.core, [255, 250, 225]);
  assert.deepEqual(s.sky, [110, 175, 230]);
});

test('the scrim is right from a line\'s first frame (no ~0.9 s muddy disc) and its deepening keeps to the pill\'s shape', () => {
  const subs = read('src/hushfold/subtitles.js');
  // a line starts fresh (no fade from the default scrim), is sampled again in the frame's rAF after its last placing — before
  // it is first painted — then later looks deepen in; one quick look at 160 ms
  assert.match(subs, /h\('div', \{ class: `hf-sub \$\{kind\} fresh` \}/);
  assert.match(subs, /requestAnimationFrame\(\(\) => \{ if \(!destroyed && cur\?\.lineEl === node\) \{ jumpNext = true; layout\(\); settle\(node\); \} \}\);/);
  const settle = between(subs, 'function settle(node) {', 'function adaptScrim(node) {');
  assert.match(settle, /const key = sampleScrim\(node\);/);
  assert.match(settle, /requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => node\.classList\.remove\('fresh'\)\)\);/);
  assert.match(settle, /setTimeout\([^\n]*rescrim\(\); \}, 160\);/);
  // a choice's prompt (the question itself) too
  assert.match(between(subs, 'function showChoice() {', 'function choose(value, {'), /requestAnimationFrame\(\(\) => \{ if \(!destroyed && cur === mine && mine\.lineEl === node\) \{ layout\(\); settle\(node\); \} \}\);/);
  // a realm still fading in is read as it will be, and the deeper scrim kept
  const ss = between(subs, 'function sampleScrim(node) {', 'function lineNode(line) {');
  assert.match(ss, /const whole = seen\.partial \? sampleBackdrop\(node\.getBoundingClientRect\(\), layers, \{ full: true \}\) : null;/);
  assert.match(ss, /a = Math\.max\(scrimFor\(brightPixel\(data\)\), whole \? scrimFor\(brightPixel\(whole\)\) : 0\);/);
  // (in the sky's own colour since review r2: hotTint, ask-r2-main.test.mjs)
  assert.match(ss, /const tint = hs \? hotTint\(hs\.core, hs\.sky, a, \{ max: hs\.a \}\) : null;\s*ha = tint \? tint\.a : 0;/);
  assert.match(subs, /g\.globalAlpha = full \? 1 : Math\.min\(1, a\);/);
  const css = read('src/ui/hushfold.css');
  assert.match(css, /\.hf-sub\.fresh, \.hf-sub\.fresh::before \{ transition: none; \}/);
  // the deepening: the scrim's own box, radius and feather — nothing hangs past the pill
  const before = css.match(/\.hf-sub::before \{[^}]*\}/)[0], after = css.match(/\.hf-sub::after \{[^}]*\}/)[0];
  for (const k of ['inset: -14px -24px -16px;', 'border-radius: 999px;']) { assert.ok(before.includes(k) && after.includes(k), k); }
  assert.match(before, /filter: blur\(12px\)/);
  assert.match(after, /filter: blur\(12px\)/);
});
