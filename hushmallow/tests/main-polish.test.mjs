// Final main-screen polish (integ/final-main-polish): the urgent support sheet's calls, the first world from the
// words, reduced motion in the ocean, a heavy Tell inside a world, and the minors of the final QA sweep.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const support = await import('../src/app/scenes/support.js');

test('support: the region comes from the time zone first, the language only when the zone names no place', () => {
  const { supportRegion } = support;
  assert.equal(supportRegion({ timeZone: 'Europe/London', languages: ['en-US'] }), 'GB', 'en-US phones in the UK');
  assert.equal(supportRegion({ timeZone: 'Europe/Dublin' }), 'IE');
  assert.equal(supportRegion({ timeZone: 'America/Chicago', languages: ['en-GB'] }), 'US');
  assert.equal(supportRegion({ timeZone: 'America/Indiana/Indianapolis' }), 'US');
  assert.equal(supportRegion({ timeZone: 'Pacific/Honolulu' }), 'US');
  assert.equal(supportRegion({ timeZone: 'America/Toronto' }), 'CA');
  assert.equal(supportRegion({ timeZone: 'America/Mexico_City', languages: ['en-US'] }), null, 'a place the lines do not cover');
  assert.equal(supportRegion({ timeZone: 'Asia/Kolkata', languages: ['en-GB'] }), null);
  assert.equal(supportRegion({ timeZone: 'UTC', languages: ['en-GB'] }), 'GB', 'UTC: the language decides');
  assert.equal(supportRegion({ timeZone: null, languages: ['fr', 'en-US'] }), 'US');
  assert.equal(supportRegion({ timeZone: 'Etc/UTC', languages: ['de-DE'] }), null);
  assert.equal(supportRegion({}), null);
});

test('support: the urgent calls dial only numbers the sheet already lists, emergency first', () => {
  const { urgentCalls, SUPPORT_LINES, emergencyNumber } = support;
  const known = new Set(['999', '911', '112', ...SUPPORT_LINES.filter((l) => l.tel).map((l) => l.tel)]);
  assert.match(SUPPORT_LINES.find((l) => l.id === 'emergency').how, /999, 911, 112/, 'the three emergency numbers are the card\'s own');
  for (const r of ['GB', 'IE', 'US', 'CA', null]) {
    const calls = urgentCalls(r);
    assert.ok(calls.length >= 2, r);
    assert.equal(calls[0].id, 'emergency');
    assert.equal(calls[0].href, `tel:${emergencyNumber(r)}`);
    for (const c of calls) if (c.href.startsWith('tel:')) assert.ok(known.has(c.href.slice(4)), `${r}: ${c.href} is a listed number`);
  }
  assert.equal(emergencyNumber('GB'), '999');
  assert.equal(emergencyNumber('US'), '911');
  assert.equal(emergencyNumber(null), '112');
  assert.equal(urgentCalls('GB')[1].href, 'tel:116123', 'the UK: Samaritans');
  assert.equal(urgentCalls('US')[1].href, 'tel:988', 'the US: 988');
  assert.equal(urgentCalls(null)[1].href, 'https://findahelpline.com', 'elsewhere: Find A Helpline lists the local crisis lines');
});

test('support: abuse, violence and threats put Find A Helpline first and say it lists domestic-abuse services', () => {
  const { supportLines, abuseFirst } = support;
  for (const c of ['abuse', 'violence', 'threat']) {
    const ls = supportLines(c);
    assert.equal(ls[0].id, 'findahelpline', c);
    assert.match(ls[0].how, /domestic-abuse services/);
    assert.equal(ls.length, 4, 'nothing added, nothing dropped');
    assert.ok(abuseFirst(c));
  }
  for (const c of [null, 'unsafe', 'harassment', 'discrimination', 'loss', 'self']) assert.equal(supportLines(c)[0].id, 'emergency', String(c));
  const src = read('src/app/scenes/support.js');
  assert.doesNotMatch(src.replace(/\/\/[^\n]*/g, ''), /0808|1-800|799-7233/, 'no new numbers');
  // the urgent sheet: the calls come before the cards and the foot's "I'm safe — continue"
  const body = src.slice(src.indexOf('const body = urgent'));
  assert.ok(body.indexOf("class: 'support-calls'") > 0 && body.indexOf("class: 'support-calls'") < body.indexOf('...lines.map(card)'));
  // (the scene's support sheet reads the visit's category when the Support pill names none)
  assert.match(src, /app\?\.state\?\.hfSafety\?\.category/);
});

test('goodbye: a garden offer left unanswered folds into its chip, unseen, while the world says goodbye', () => {
  const gi = read('src/hushfold/garden-install.js');
  const hold = gi.slice(gi.indexOf('export function holdInstall('), gi.indexOf('export const installHeldNow'));
  assert.match(hold, /openOffer\?\.__fold\?\.\(\)/, 'an open offer folds');
  assert.match(hold, /openCard\?\.__fold\?\.\(\)/, 'a card already showing folds into its saved chip');
  assert.match(gi, /b\.classList\.toggle\('is-held', installHeld\);/, 'the chip waits unseen while held');
  assert.match(gi, /\.hm-chip\.is-held \{ visibility: hidden; pointer-events: none; \}/);
  assert.match(gi, /if \(installHeld\) fold\(true\);/, 'an offer made while held starts folded');
  assert.match(gi, /el\.__fold = \(\) => fold\(true\);/);
  const scene = read('src/app/scenes/hushfold.js');
  const fin = scene.slice(scene.indexOf('function onFinished() {'), scene.indexOf('function holdOffer(on) {'));
  assert.ok(fin.indexOf('holdOffer(true);') > 0 && fin.indexOf('holdOffer(true);') < fin.indexOf('later(() => {'), 'held before the world melts away');
  assert.match(fin, /Promise\.resolve\(bye\)\.then\(\(\) => later\(\(\) => holdOffer\(false\), 300\)\);/, 'let go once the closing line has been said');
  assert.match(fin, /later\(\(\) => holdOffer\(false\), 8000\);/, 'and never held long');
  assert.match(scene, /S\.left = true;\s*offerCtl\?\.abort\(\);\s*holdOffer\(false\);/, 'leaving lets go');
});

test('goodbye: a band that fits nowhere never runs past the bottom bound (the dock is below it)', async () => {
  const { placeBand } = await import('../src/hushfold/subtitles.js');
  // 320×568 home: the card the offer used to unfold into over the top, the Mallow below it: the largest band left is
  // the last one, under the Mallow, and the line used to start there and run over the Tell pill
  const bounds = { top: 72, bottom: 491 };
  const p = placeBand(bounds, [{ top: 72, bottom: 300 }, { top: 330, bottom: 430 }], 120);
  assert.equal(p.fits, false);
  assert.ok(p.y + 120 <= bounds.bottom, JSON.stringify(p));
  assert.ok(p.y >= bounds.top);
  // fitting bands are placed as before
  const q = placeBand(bounds, [{ top: 285, bottom: 470 }], 120);
  assert.ok(q.fits && q.y + 120 <= 285 - 6);
});

test('subtitles: the control pill steps out with the line in the gap between two lines (never alone on the stage)', () => {
  const src = read('src/hushfold/subtitles.js');
  const adv = src.slice(src.indexOf('function advance() {'), src.indexOf('function finish(result) {'));
  assert.match(adv, /else if \(!paused\) ctl\.classList\.add\('gap'\);/);
  assert.match(src, /function showCtl\(on\) \{\s*clearTimeout\(hideCtlTimer\);\s*ctl\.classList\.remove\('gap'\);/);
  const css = read('src/ui/hushfold.css');
  assert.match(css, /\.hf-subctl\.gap \{ opacity: 0 !important;[^}]*pointer-events: none !important;/);
  assert.doesNotMatch(css.match(/\.hf-subctl\.gap \{[^}]*\}/)[0], /visibility/, 'it keeps its focus (a held line\'s Continue)');
});

test('first world: a confident reading of the words steers it when no feeling was tapped (never chosen for the person)', async () => {
  const { interpret, suggestedFeelings } = await import('../src/engine/interpret.js');
  const { flowEmotion } = await import('../src/hushfold/lines.js');
  const { registry } = await import('../src/hushfold/flow/registry.js');
  const { getEmotion } = await import('../src/data/emotions.js');
  const world = (t) => { const s = suggestedFeelings(interpret(t))[0] || null; const fe = s ? flowEmotion(s, getEmotion(s)?.family) : null; return registry.select({ emotion: fe, intention: null, gentle: false, favourites: [] })?.id; };
  assert.equal(world('I\'m so angry my boss ignored me again'), 'static-storm', 'an angry Tell reaches Glitzi\'s storm');
  assert.equal(world('I am furious at my sister'), 'static-storm');
  assert.equal(world('I\'m worried about tomorrow'), 'luminous-ocean');
  assert.equal(registry.select({ emotion: null })?.id, 'luminous-ocean', 'no reading: as before');
  const scene = read('src/app/scenes/hushfold.js');
  const after = scene.slice(scene.indexOf('async function afterTell('), scene.indexOf('async function gentleWorld('));
  // after the safety branches (care, crisis and loss take their own paths) and only when nothing was tapped
  assert.ok(after.indexOf('const heard = !emotion && !gentle() ? await wordsFeeling(reading) : null;') > after.indexOf("if (!ent.has('paid'))"));
  assert.match(after, /const steer = emotion \|\| heard \|\| S\.emotion;/);
  assert.match(after, /startFlow\(\{ emotion: steer,/);
  assert.match(after, /warmWorld\(\{ emotion: steer,/);
  // the reading is never made the person's feeling: no setFeeling, no acknowledgement, no S.emotion
  assert.doesNotMatch(after, /setFeeling\(heard|S\.emotion = heard|emotion: heard/);
  assert.match(after, /if \(emotion\) spoken = say\(lines\.pick\(mallowId, 'ack'/);
  assert.match(scene, /return m\.suggestedFeelings\?\.\(reading\)\?\.\[0\] \|\| null;/);
});

test('a death, a loss or harm told inside a world: no Resume pill, no ▶ or panel Resume; quiet ends it, calm melts', async () => {
  const scene = read('src/app/scenes/hushfold.js');
  const fn = (a, b) => scene.slice(scene.indexOf(a), scene.indexOf(b, scene.indexOf(a) + a.length));
  // loss (grief.js: concern 'loss'; a wish to follow is care) and every care-level disclosure take the world away
  assert.match(scene, /const takesWorldAway = \(r\) => !!r && \(r\.category === 'loss' \|\| r\.level === 'care'\);/);
  assert.match(fn('function noteSafety(r) {', 'function noteNoResume('), /^function noteSafety\(r\) \{\s*noteNoResume\(r\);/, 'sticky, even when the level does not rise');
  assert.match(fn('async function afterTell(', 'async function wordsFeeling('), /noteSafety\(safety\);\s*noteNoResume\(safety\);/);
  // the quiet hold: no pill, nothing resumes it but the calm world asked for
  assert.match(fn('function onPaused(on) {', 'function resumeFlow()'), /if \(on && \(S\.hold === 'crisis' \|\| S\.hold === 'quiet'\)\) \{ pausedPill\.hidden = true;/);
  assert.match(fn('function resumeFlow() {', 'let worldMode'), /if \(S\.hold === 'crisis' \|\| S\.hold === 'quiet'\) \{ panel\?\.update\(\); return; \}/);
  assert.match(scene, /locked: S\.hold === 'crisis' \|\| S\.hold === 'quiet' \}\),/, 'the panel\'s Pause/Resume, Stay longer and Drift on are locked');
  assert.match(fn('async function careBeat(', 'async function careAgain('), /S\.hold = S\.noResume \? 'quiet' : 'care'; if \(S\.hold === 'quiet'\) pausedPill\.hidden = true;/);
  const choice = fn('async function careChoice(', 'function calmTheWorld(');
  assert.match(choice, /if \(S\.hold === 'care' \|\| S\.hold === 'quiet'\) \{ S\.hold = null; pausedPill\.hidden = true; \}/, 'the calm world, asked for, plays unheld');
  assert.match(choice, /\} else if \(S\.hold === 'quiet' && worldMode\) \{[\s\S]*?endQuietWorld\(\);/, 'staying quietly (or no answer) ends the world quietly');
  assert.match(fn('function endQuietWorld() {', 'function safetyHold('), /flowRef\.finish\?\.\(\{ reason: 'safety' \}\);[\s\S]*?if \(worldMode && !S\.finishing\) onFinished\(\);/);
  // only calm worlds are offered, and a charged world is never offered to pick up in a gentle visit
  assert.match(fn('async function gentleWorld()', 'async function careBeat('), /\(!S\.noResume \|\| registry\.get\(id\)\?\.calm === true\)/);
  assert.match(fn('async function resumableNow()', 'function resumeSaved()'), /if \(gentle\(\) && registry\.get\(p\.worldId\)\?\.calm !== true\) return null;/);
  // distress alone keeps owner P4's Resume
  assert.match(scene, /S\.hold = S\.noResume \? 'quiet' : 'care';/);
  // a Tell opened inside a world never pre-presses a feeling chosen for an earlier Tell
  const open = fn('function openTellNow(prompt) {', 'async function afterTell(');
  assert.match(open, /emotion: again\?\.emotion \|\| null, intention:/);
  assert.doesNotMatch(open, /emotion: S\.emotion/);
  const { SHARED_LINES } = await import('../src/hushfold/lines.js');
  assert.deepEqual(SHARED_LINES.careAsk, ['We can stay here quietly. Or somewhere calm, if you’d like.'], 'neutral after a death or abuse (minor 7a)');
});

test('320×568: the folded offer lies in the subtitle band\'s free time, never on the hero; a line takes the band back', () => {
  const gi = read('src/hushfold/garden-install.js');
  const box = gi.slice(gi.indexOf('function placeBox('), gi.indexOf('let openCard = null'));
  // clear of everything; then in the band's free time; then over a world's decoration; only then over the body
  const order = ["tryIn(regions.clear)", "obstacles.filter((o) => !o.band), 'band')", "obstacles.filter((o) => !o.decor), 'decor')", "tryIn(regions.face, obstacles, 'face')"].map((k) => box.indexOf(k));
  assert.ok(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])), JSON.stringify(order));
  assert.match(gi, /if \(o && r\.kind === 'band'\) o\.band = true;/);
  // a line comes onto it: if the only place left is over the Mallow, it folds into its chip instead
  const offer = gi.slice(gi.indexOf('export function offerSave('), gi.indexOf('function note('));
  assert.match(offer, /const off = \(t\) => t === 'clear' \|\| t === 'band' \|\| t === 'decor';\s*if \(off\(was\) && !off\(tier\)\) fold\(true\);/);
  // the chip moves off a line too (or waits unseen), and a line still fading in already counts
  const chip = gi.slice(gi.indexOf('function showChip('), gi.indexOf('function hideChip('));
  assert.match(chip, /const stopBand = onBandChange\(\(\) => \{[\s\S]*?if \(b\.classList\.contains\('is-blocked'\) \|\| obstacleRects\(\)\.some\(\(o\) => hits\(r, o, 4\)\)\) place\(\);/);
  assert.match(chip, /stopLeave\(\); stopBand\(\);/);
  assert.match(gi, /e\.matches\('\.hf-sub'\) \? shownRect\(e\) : visibleRect\(e\)/);
  // the shell: the band is the lines' while one is up; free otherwise; and the lines never step round an offer in it
  const scene = read('src/app/scenes/hushfold.js');
  assert.match(scene, /band && \(linesUp\(\) \? band : \{ \.\.\.band, kind: 'band' \}\)/);
  assert.match(scene, /\.\.\.\(installMod\?\.installAvoidRects\?\.\(\) \|\| \[\]\)\.filter\(\(r\) => !inWorldBand\(r\)\)/);
});

test('Noomi\'s concerned stage is attentive: eyes open, brows soft, no doze — from the expressions data, not the rig', async () => {
  const E = await import('../src/mallows/expressions.js');
  const { MALLOWS } = await import('../src/mallows/registry.js');
  const s = E.STAGES.concerned;
  const noomi = E.resolveExpression(MALLOWS.noomi, s.mix, s.intensity, s.extra);
  assert.ok(noomi.eyeOpen >= 0.6, `eyes open (${noomi.eyeOpen})`);
  assert.ok(noomi.browAlpha > 0.5, 'brows seen');
  assert.equal(noomi.fxZzz, 0); assert.equal(noomi.yawnCycle, 0);
  assert.ok(noomi.blush <= 1, 'the blush down');
  assert.ok(noomi.mouthSmile <= 0.2 && noomi.mouthOpen <= 0.1, 'no grin');
  // the stage limits hold it as before (the resting face for this Mallow is the reference)
  const lim = E.stageLimits('concerned');
  const g = E.applyStageLimits({ ...noomi, mouthSmile: 1, eyeOpen: 1.4 }, lim, noomi);
  assert.ok(g.mouthSmile <= 0.2 && g.eyeOpen <= 1);
  // everyone else's concerned face is unchanged by Noomi's own
  const without = { ...s.extra }; delete without.byMallow;
  for (const id of Object.keys(MALLOWS).filter((m) => m !== 'noomi')) assert.deepEqual(E.resolveExpression(MALLOWS[id], s.mix, s.intensity, s.extra), E.resolveExpression(MALLOWS[id], s.mix, s.intensity, without), id);
  assert.doesNotMatch(read('src/mallows/rig.js'), /byMallow/, 'no rig change');
});

test('subtitle scrim: a bright spot behind it (the daytime sun) is found and deepened; a sky, a night or a cloud band is not', async () => {
  const { hotSpot } = await import('../src/hushfold/subtitles.js');
  const cols = 48, rows = 12;
  const img = (px) => { const d = new Uint8ClampedArray(cols * rows * 4); for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const [r, g, b] = px(i, j); const k = (j * cols + i) * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255; } return d; };
  const sky = [110, 175, 230], sun = [255, 250, 225], night = [30, 24, 70], cloud = [235, 240, 248];
  // the sun at the box's top right, over a bright blue sky
  const s = hotSpot(img((i, j) => (Math.hypot(i - 38, (j - 4) * 1) < 4 ? sun : sky)));
  assert.ok(s, 'found');
  assert.ok(Math.abs(s.x - 38.5 / 48) < 0.05 && Math.abs(s.y - 4.5 / 12) < 0.12, JSON.stringify(s));
  assert.ok(s.r > 0.05 && s.r < 0.4 && s.a >= 0.7);
  assert.equal(hotSpot(img(() => sky)), null, 'an even sky');
  assert.equal(hotSpot(img(() => night)), null, 'a night realm');
  assert.equal(hotSpot(img((i, j) => (j < 5 ? cloud : sky))), null, 'a cloud band across the box is not a spot');
  assert.equal(hotSpot(null), null);
  const css = read('src/ui/hushfold.css');
  assert.match(css, /radial-gradient\(circle at var\(--hf-hot-x, 50%\) var\(--hf-hot-y, 50%\)/);
});

test('the garden installation never lies on the person\'s words: the ripple beside them, the flight round them, each tag cut out', () => {
  const src = read('src/hushfold/garden-install.js');
  const hf = read('src/app/scenes/hushfold.js');
  // the Hushfold hands it the thoughts (soft) and their words tags, live, from the layer's own record (no forced layout)
  assert.match(hf, /avoid: offerAvoid, words: thoughtWords,/);
  assert.match(hf, /function thoughtWords\(\) \{[\s\S]{0,400}soft: true[\s\S]{0,300}Lr\.tagRect\?\.\(th\)/);
  assert.match(src, /export async function keepDiscovery\(\{[^)]*words = null/);
  assert.match(src, /playInstall\(\{ app, skillId, mallow, origin, face, avoid, words, from,/);
  // the ripple's rings (≈1.1 S each side) form clear of them, as near the crown as can be (never down to the eyes)
  assert.match(src, /const ring = \(x, y\) => \(\{ left: x - S \* 1\.1, right: x \+ S \* 1\.1/);
  assert.match(src, /const down = geom \? Math\.max\(0, geom\.face\.top - S \* 0\.3 - F\.y\) : 0;/);
  assert.match(src, /ripOffWords\(obstacles\);\n\s+placeCard\(\);/);
  // the flight: the other bow, a wider one, the portal from the other side, then the ripple's next clear place;
  // clear of the thoughts if it can be, of the tags always when any way is; chosen again as it sets off
  assert.match(src, /const WAYS = \[\[0, 0\.2\], \[1, 0\.2\], \[0, 0\.32\], \[1, 0\.32\]\];/);
  assert.match(src, /for \(const set of tags\.length < words\.length \? \[words, tags\] : \[words\]\)/);
  assert.match(src, /for \(const c of ripFree\) \{ F\.x = c\.x; F\.y = c\.y; if \(tryWays\(set\)\) return; \}/);
  assert.match(src, /if \(travelK > 0 && !rebowed && manual == null\) rebow\(\);/);
  assert.match(src, /flightOffWords\(!!at\);\n\s+motesOffWords\(\);/);
  // (with reduced motion nothing flies: only the ripple's place counts)
  assert.match(src, /if \(!words\.length \|\| reduced\) return;/);
  // whatever moves afterwards: each frame cuts the tags out of what it paints
  assert.match(src, /const holes = liveTags\(\);[\s\S]{0,400}g\.clip\('evenodd'\);[\s\S]{0,120}\(reduced \? frameReduced : frameFull\)\(t\);\n\s+if \(holes\.length\) g\.restore\(\);/);
});
