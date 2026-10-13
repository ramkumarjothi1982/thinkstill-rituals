// Integration H2 + H3 (shell passes 2 and 3) and their leftovers: the shell drives the director's own safety
// pause and finish, swaps the host halfway through a melt, runs the real ThoughtLayer in the one loop with the
// director, caps the Thought Mallows, clears saved progress after a crisis even on a reload, never suggests a
// positive feeling for distressing words, and the rig's attentive face has no grin and nothing over the face.
// Static checks on the shell (its behaviour is checked in the browser), plus the pure parts run for real.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { interpret, suggestedFeelings } from '../src/engine/interpret.js';
import { MALLOWS, MALLOW_IDS } from '../src/mallows/registry.js';
import { STAGES, resolveExpression } from '../src/mallows/expressions.js';
import { ParticleField } from '../src/mallows/particles.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');
const scene = read('src/app/scenes/hushfold.js');
const fnBody = (src, start, end) => { const a = src.indexOf(start); assert.ok(a >= 0, start); const b = src.indexOf(end, a + start.length); return src.slice(a, b > a ? b : undefined); };

// ------------------------------------------------------------------ H3 --
test('H3: the shell runs the real ThoughtLayer: no placeholder, the director ticks in the stage with the layer as its thoughts', () => {
  assert.doesNotMatch(scene, /placeholders\.js/, 'the 2D placeholder thought is gone');
  assert.doesNotMatch(scene, /thought: null/);
  assert.doesNotMatch(scene, /handThought|worldThought/);
  const flow = fnBody(scene, 'function getFlow() {', '/** The world paused or resumed');
  assert.match(flow, /const layer = stage \? await stage\.whenThoughts\(\) : null;/);
  assert.match(flow, /thoughts: gentle\(\) \|\| !layer \? null : stage\.thoughts, ticker: stage\.worldTicker, subtitleBand: \(\) => bandPx \|\| null,/);
  // a paused world holds its thoughts still (a safety pause lets them drift off first), and lets go on resume
  assert.match(flow, /f\.on\?\.\('pause', \(d\) => \{ if \(d\?\.reason !== 'safety'\) stage\?\.freeze\(true\); onPaused\(true\); \}\);/);
  assert.match(flow, /f\.on\?\.\('resume', \(\) => \{ stage\?\.freeze\(false\); onPaused\(false\); \}\);/);
  // the stage options: off the Mallow (room for its hop), inside the room layout() leaves, haptics, live sound
  const enter = fnBody(scene, 'async enter() {', 'leave() {');
  assert.match(enter, /keepOut: \(\) => mallowAvoidRect\(\), bounds: \(\) => thoughtBounds, haptic: \(k\) => app\.haptic\?\.\(k\),/);
  assert.match(enter, /audio: \{ fx: \(n, o\) => \(prefs\.get\('sound'\) \? app\.audio\?\.fx\?\.\(n, o\) : false\) \}/);
  // the stage joins the shared loop after the hero is up
  assert.ok(enter.indexOf('stage.start();') > enter.indexOf('await rigP;'));
  // layout fills the bounds in place, and hides the tags in a short strip over the phone sheet
  const lay = fnBody(scene, 'function layout() {', 'let resizeT');
  assert.match(lay, /thoughtBounds\.top = \(ov\?\.height \? ov\.bottom : regionTop\) \+ 10;/);
  assert.match(lay, /thoughtBounds\.bottom = Math\.max\(thoughtBounds\.top \+ 60, Math\.min\(dockTop\(\), panelTop\(\)\) - 10\);/);
  assert.match(lay, /stage\?\.thoughts\.hideTags\(tagsAway\);/);
  assert.doesNotMatch(lay, /moveHome/, 'the layer places the thoughts itself');
  // a world owns the thought's touches; the newest rides in, the others drift off; it comes back near
  const onWorld = fnBody(scene, 'function onWorld(d) {', 'function hostMallow(');
  assert.match(onWorld, /router\.setWorld\(\(r\) => flowRef\?\.pointer\?\.\(r\), \{ thoughts: true \}\);/);
  assert.match(onWorld, /const primary = gentle\(\) \? null : stage\?\.thoughts\.primary;\s*stage\?\.thoughts\.release\(900, \(stage\?\.thoughts\.list \|\| \[\]\)\.filter\(\(t\) => t !== primary\)\);/);
  const end = fnBody(scene, 'function endWorldMode() {', 'function onFinished()');
  assert.match(end, /stage\?\.freeze\(false\);/);
  assert.match(end, /back\.moveHome\(thoughtHome\); back\.closer\?\.\(0\);/);
  // the QA hook
  assert.match(enter, /get thoughts\(\) \{ return stage\?\.thoughts; \}/);
  // the stub flow takes the new calls
  assert.match(fnBody(scene, 'function createStubFlow() {', '// the worlds read prefs live'), /setThoughts\(\) \{\}, setGentle\(\) \{\}, hold\(\) \{ return false; \}/);
});

test('H3 / (j): at most 3 Thought Mallows at home, 2 below 360 px, 1 in a world; the oldest drift off, never removed', () => {
  assert.match(scene, /const thoughtCap = \(inWorld = false\) => \(inWorld \? 1 : innerWidth < 360 \? 2 : 3\);/);
  const spawn = fnBody(scene, 'async function spawnThought(', 'let readTh = null;');
  assert.match(spawn, /if \(!stage \|\| !text \|\| gentle\(\)\) return null;/, 'never after something heavy');
  assert.match(spawn, /const L = await stage\.whenThoughts\(\);\s*if \(!L \|\| S\.left \|\| gentle\(\)\) return null;/);
  assert.match(spawn, /const live = L\.list\.filter\(\(t\) => !t\.leaving\);\s*const over = live\.length - thoughtCap\(inWorld\) \+ 1;\s*if \(over > 0\) L\.release\(900, live\.slice\(0, over\)\);/);
  assert.doesNotMatch(scene, /thoughts\.remove\(|L\.remove\(/, 'a thought is let go (it fades), never taken away');
  // the exact words go to the layer (it shows their start, cut at a word); the shell never shortens them
  assert.match(spawn, /L\.add\(\{ text, emotion, intensity: [^}]*\},\s*\{ from: [^}]*\}, home: thoughtHome \}\);/);
  // in a world: the world is told about its new thought (one per world, owner P7)
  assert.match(spawn, /if \(inWorld && worldMode\) \{ try \{ flowRef\?\.setThoughts\?\.\(stage\.thoughts\); \}/);
  assert.match(fnBody(scene, 'async function afterTell(', 'async function gentleWorld('), /if \(text\) spawnThought\(text, emotion, \{ inWorld: worldMode \}\);/);
  // the read words give the focus back to their tag
  assert.match(fnBody(scene, 'function closeRead() {', '// ------------------------------------------------------ panel'), /const tag = readTh \? stage\?\.thoughts\.tagOf\(readTh\) : null;/);
});

test('H3 CSS: the placeholder tag is gone; .tm-tag sits at z 1 and steps back while the phone sheet holds a world', () => {
  const css = read('src/ui/hushfold.css').replace(/\s+/g, ' ');
  assert.doesNotMatch(css, /\.hf-tag\b/);
  assert.match(css, /\.hushfold \.tm-tag \{ z-index: 1; \}/);
  assert.match(css, /body\.hf-world-held #fx-layer > canvas\.hf-stage, body\.hf-world-held \.hushfold \.tm-tag \{ opacity: 0 !important; pointer-events: none !important; \}/);
});

// ------------------------------------------------------------------ H2 --
test('H2: the band, the host halfway through the melt (a soft cross-fade, never on a timer), its art loaded at k 0', () => {
  const flow = fnBody(scene, 'function getFlow() {', '/** The world paused or resumed');
  // (review r2: the melt's start also takes the melting world's lines with it — onMeltBegins, tests/h23-r3)
  assert.match(flow, /f\.on\?\.\('melt', \(d\) => \{ if \(d\?\.k === 0\) onMeltBegins\(d\);/);
  assert.match(fnBody(scene, 'function onMeltBegins(d) {', 'function onFinished() {'), /if \(MALLOWS\[d\?\.mallow\]\) loadMallowAssets\(d\.mallow\)/);
  assert.match(flow, /f\.on\?\.\('host', \(d\) => hostMallow\(d\?\.mallow\)\);/);
  assert.match(scene, /bandPx = Math\.round\(band\);/);
  const host = fnBody(scene, 'function hostMallow(id) {', 'function endWorldMode()');
  assert.match(host, /showMallow\(id, \{ entrance: false, soft: true, hop: true \}\);/);
  assert.doesNotMatch(host, /setTimeout|later\(/, 'never a timer: a paused melt does not move, nor does its host');
  // the soft swap: a picture of the leaving Mallow taken in the shared loop, the swap waits for it, then a cross-fade
  const show = fnBody(scene, 'async function showMallow(', 'let heroGhost = null;');
  assert.match(show, /if \(soft && touchBox\) fade = await crossFadeFrom\(\);[\s\S]*?touchMt\.setMallow\?\.\(id\);/);
  assert.match(show, /fade\.reveal\(\(\) => \{ if \(bounce && touchMt\?\.id === id\) touchMt\.react\('hop'\); \}\)/, 'the small hop as it comes into view');
  const cross = fnBody(scene, 'function crossFadeFrom() {', 'function heroPicture(');
  assert.match(cross, /addTicker\(take\);/);
  assert.match(cross, /box\.style\.opacity = '0';\s*if \(pic\) box\.after\(pic\);/);
  assert.match(cross, /pic\.style\.opacity = '0';/);
  // the first host's art loads with the director; subtitles keep to the world's band
  assert.match(fnBody(scene, 'async function startFlow(', 'async function warmWorld('), /prefetchHost\(worldId\);\s*const flow = await getFlow\(\);/);
  assert.match(fnBody(scene, 'function bandTop() {', '// the pill'), /if \(!worldMode \|\| panelSheet\(\) \|\| !flowRef\?\.subtitleBand\) return shell;/);
});

test('H2: an open garden offer holds the world (let go when it folds); a sheet over a world holds it', () => {
  const offer = fnBody(scene, 'async function onOffer(', 'function offerAvoid()');
  assert.match(offer, /flow\?\.hold\?\.\('offer', true\);[\s\S]*await install\.onOffer\(/);
  assert.match(offer, /finally \{\s*try \{ flow\?\.hold\?\.\('offer', false\); \}/);
  const phase = fnBody(scene, 'const onOfferPhase = (e) => {', '/** The open panel');
  assert.match(phase, /if \(ph === 'fold' \|\| ph === 'close'\) flowRef\.hold\('offer', false\);/);
  assert.match(phase, /else if \(ph === 'unfold' \|\| ph === 'open'\) flowRef\.hold\('offer', true\);/);
  assert.match(fnBody(scene, 'async enter() {', 'leave() {'), /addEventListener\('hm:offer', onOfferPhase\);/);
  assert.match(fnBody(scene, 'leave() {', 'get blockBack()'), /removeEventListener\('hm:offer', onOfferPhase\);/);
  const track = fnBody(scene, 'function trackSheet(sheet) {', '/** The support sheet');
  assert.match(track, /holdForSheet\(true\);/);
  assert.match(track, /if \(!sheets\.length\) \{ root\.classList\.remove\('hf-sheet-open'\); holdForSheet\(false\); \}/);
  const hold = fnBody(scene, 'function holdForSheet(on) {', '/** A sheet closed');
  assert.match(hold, /if \(!h0\?\.paused \|\| !worldMode \|\| S\.finishing \|\| !flowRef \|\| S\.hold \|\| held\) return;/, 'never resumes over a safety hold or the panel hold');
});

test('H2: the full safety hold — the director\'s own safety pause (also while loading), finish for a crisis, a gentle melt after care', () => {
  const hold = fnBody(scene, 'function safetyHold(level) {', '  /**\n   * After a crisis the visit keeps no world');
  assert.match(hold, /const running = flowRef && !flowRef\.stub && \(worldMode \|\| starting > 0\);/, 'a world still loading is held too');
  assert.match(hold, /if \(running\) \{ try \{ flowRef\.setThoughts\?\.\(null\); flowRef\.setGentle\?\.\(true\); \}/);
  assert.match(hold, /flowRef\.setAutoFlow\?\.\(false\); flowRef\.pause\?\.\(\{ reason: 'safety' \}\);/);
  const end = fnBody(scene, 'function endCrisisWorld() {', 'function keepSafety()');
  assert.match(end, /if \(starting && flowRef && !flowRef\.stub && !S\.finishing\) \{ try \{ flowRef\.finish\?\.\(\{ reason: 'safety' \}\); \}/, 'one still loading never enters');
  // a world asked for before the director could take the hold enters held
  assert.match(fnBody(scene, 'async function startFlow(', 'async function warmWorld('), /if \(S\.holdOnWorld && !flow\.stub\) \{ try \{ flow\.pause\?\.\(\{ reason: 'safety' \}\); \}/);
  // care, then "play" in a world: gentle, and a melt into the calm world (never a hard cut)
  const calm = fnBody(scene, 'function calmTheWorld(worldId) {', '/** Start Hushflow');
  assert.match(calm, /flowRef\.setGentle\?\.\(true\);/);
  assert.match(calm, /if \(flowRef\.state\?\.worldId === worldId\) \{ resumeFlow\(\); return; \}/);
  assert.match(calm, /if \(flowRef\.next\?\.\(\{ worldId \}\) === false\) resumeFlow\(\);/);
  assert.match(fnBody(scene, 'async function careChoice(', 'function calmTheWorld('), /if \(worldMode && flowRef && !flowRef\.stub && !S\.finishing\) \{ calmTheWorld\(gw\.worldId\); return; \}/);
});

// ----------------------------------------------------------- leftovers --
test('(i) after a crisis, saved progress is cleared synchronously on the window\'s hide events (after the director\'s save), and on leave', () => {
  const forget = fnBody(scene, 'function forgetProgress() {', '/** Low stimulation');
  assert.match(forget, /forgetOnHide = \(\) => \{ if \(S\.crisis \|\| S\.hold === 'crisis'\) \{ try \{ clearProgress\(store\); \}/);
  assert.doesNotMatch(forget, /setTimeout/, 'a reload\'s page-hide never runs a timer');
  assert.match(forget, /\n\s*addEventListener\('visibilitychange', forgetOnHide\);/, 'on the window: it bubbles there after the document\'s listeners (the director\'s save)');
  assert.doesNotMatch(forget, /document\.addEventListener\('visibilitychange'/);
  assert.match(forget, /addEventListener\('pagehide', forgetOnHide\);/);
  const leave = fnBody(scene, 'leave() {', 'get blockBack()');
  assert.ok(leave.indexOf("if (S.crisis) { try { clearProgress(store); }") > leave.indexOf('flowRef?.destroy?.()'), 'destroy() saves: cleared after it');
  assert.match(leave, /removeEventListener\('pagehide', forgetOnHide\);/);
});

test('(b) a non-calm world keeps its banter to itself after care; (c) later ordinary words get a short acknowledgement', () => {
  const quiet = fnBody(scene, 'const quietWorldLine = (o) => {', 'const flowSubtitles');
  assert.match(quiet, /if \(!gentle\(\) \|\| o\?\.kind !== 'dialogue'\) return false;/);
  assert.match(quiet, /flowReg\?\.registry\?\.get\?\.\(id\)\?\.calm === true/);
  assert.match(scene, /say: \(lines, o\) => \{ if \(S\.hold === 'crisis' \|\| S\.finishing\) return Promise\.resolve\(null\); if \(quietWorldLine\(o\)\) return Promise\.resolve\(null\);/);
  const after = fnBody(scene, 'async function afterTell(', 'async function gentleWorld(');
  assert.match(after, /const carried = !!S\.careSaid && \(safety\?\.level \|\| 'none'\) === 'none';/);
  assert.ok(after.indexOf('if (carried && gentle()) {') > after.indexOf("safety?.level === 'crisis'") && after.indexOf('if (carried && gentle()) {') < after.search(/safety\?\.level === 'care' \|\| safety\?\.level === 'concern'\) \{/));
  const again = fnBody(scene, 'async function careAgain(', 'async function careChoice(');
  assert.match(again, /await say\(CARE_AGAIN, /);
  assert.doesNotMatch(again, /supportCare|supportConcern|harmOthers|pause/, 'not the full care line, and a playing world is not paused');
  assert.match(scene, /const CARE_AGAIN = 'Thank you for telling me\. I’m right here\.';/);
});

test('(e) the world loads during the beat: the director, the likely world\'s code, then its host; started as words return from plans', () => {
  const warm = fnBody(scene, 'async function warmWorld(', 'function prefetchHost(');
  assert.ok(warm.indexOf('const made = getFlow();') < warm.indexOf("import('../../v3/words.js')"));
  assert.match(warm, /reg\.registry\.select\(\{ emotion: fe, intention, gentle: gentle\(\), favourites: favouriteWorlds\(store\) \}\)/);
  assert.ok(warm.indexOf('reg.registry.prefetch?.(pick);') < warm.indexOf('await made;') && warm.indexOf('await made;') < warm.indexOf('prefetchHost(pick)'), 'code first, art last');
  assert.match(fnBody(scene, 'async function afterTell(', 'async function gentleWorld('), /warmWorld\(\{ emotion: emotion \|\| S\.emotion, intention: intention \|\| S\.intention \}\);\s*\/\/[^\n]*\n\s*if \(text\) \{/);
  assert.match(fnBody(scene, 'async function resumePendingTell() {', 'function followOS()') || scene, /if \(p\.input\?\.text\) warmWorld\(\{ emotion: p\.emotion, intention: p\.intention \}\);/);
});

test('(f) reduced motion "system" follows the OS live (MallowTouch reads undefined as "not reduced")', () => {
  const enter = fnBody(scene, 'async enter() {', 'leave() {');
  assert.match(enter, /if \(k === 'motion'\) touchMt\.setReducedMotion\(v === 'system' \? osReduced\(\) : prefs\.reducedMotion\(\)\);/);
  assert.match(enter, /followOS\(\);/);
  const os = fnBody(scene, 'function followOS() {', 'const view = {');
  assert.match(os, /osFn = \(e\) => \{ if \(touchMt && !S\.left\) touchMt\.setReducedMotion\(prefs\.get\('motion'\) === 'system' \? !!e\.matches : prefs\.reducedMotion\(\)\); \};/);
  assert.match(fnBody(scene, 'leave() {', 'get blockBack()'), /osMq\.removeEventListener\('change', osFn\)/);
});

test('(d) no positive feeling is suggested for words with a safety cue; ordinary words still get theirs', () => {
  const none = ['he hit me and I am relieved he left', 'I\'m so relieved but he threatens me', 'I\'m happy to finally be done with life',
    'at peace now, I want to end it', 'I just want to sleep forever'];
  for (const t of none) assert.deepEqual(suggestedFeelings(interpret(t)), [], t);
  // distress named as distress is still offered (a negative feeling is not a misreading)
  assert.deepEqual(suggestedFeelings(interpret('I feel hopeless')), ['hopelessness']);
  assert.ok(suggestedFeelings(interpret('I\'m scared of my partner')).includes('fear'));
  // ordinary words: as before (confident matches, at most 3)
  assert.ok(suggestedFeelings(interpret('I am so relieved the exam is over')).includes('relief'));
  assert.ok(suggestedFeelings(interpret('I was fuming and gutted and so embarrassed')).length <= 3);
  assert.match(read('src/hushfold/input-overlay.js'), /suggested = m\.suggestedFeelings \? m\.suggestedFeelings\(reading\) :/);
});

// ---------------------------------------------------------------- (h) rig --
test('(h) the concerned face: the mouth closed on every Mallow (no grin), nothing drawn over or round the face', () => {
  const c = STAGES.concerned;
  for (const id of MALLOW_IDS) {
    const v = resolveExpression(MALLOWS[id], c.mix, c.intensity, c.extra);
    assert.ok(v.mouthOpen <= 0.05, `${id} mouthOpen ${v.mouthOpen}`);
    assert.equal(v.tongue, 0, id);
    for (const k of ['sighCycle', 'yawnCycle', 'fxExclaim', 'fxQuestion', 'fxSpark', 'fxStar', 'fxHeart', 'fxNote', 'fxRain', 'tears', 'sweat']) assert.equal(v[k], 0, `${id} ${k}`);
  }
});

test('(h) a sigh\'s breath leaves from beside the face as soft wisps; ? and ! sit off the head; no flat disc over the face', () => {
  const m = MALLOWS.loomi;
  const rig = { mallow: m, id: 'loomi', opts: { reducedMotion: false, particles: true, lowStim: false }, S: 1, CX: 200, BASE: 400, H: 600, body: { hop: 0 } };
  const pf = new ParticleField(rig);
  const g = pf.geo();
  pf.burst({ kind: 'puff', n: 6 });
  assert.equal(pf.list.length, 6);
  for (const p of pf.list) {
    assert.ok(Math.abs(p.x - g.cx) >= g.w * 0.5, `puff at ${p.x} is beside the body (${g.cx - g.w / 2}…${g.cx + g.w / 2}), not on the face`);
    assert.ok(p.wisp, 'drawn as a feathered wisp');
    assert.ok(Math.sign(p.vx) === Math.sign(p.x - g.cx), 'drifting away from the face');
  }
  pf.list.length = 0;
  pf.spawn('exclaim');
  assert.ok(pf.list[0].x >= g.cx + g.w * 0.5 && pf.list[0].y < g.top, 'off the head\'s top corner');
});
