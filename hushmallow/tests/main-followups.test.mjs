// The follow-ups after the final main-screen and Another Angle polish (two independent verifiers): the Tell's feeling
// suggestions (interpret.js), a world held quietly after a closed Tell, Resume only after a loss or a care-level disclosure,
// the More Room offer meeting a line at 320, the goodbye line, the ocean words at 320, the scrim's bright spot and the
// abuse support sheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpret, suggestedFeelings, LOSS_FIT } from '../src/engine/interpret.js';
import { checkText } from '../src/engine/safety.js';
import { readSafety, loadGrief, lossIn } from '../src/hushfold/input-overlay.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
await loadGrief();
const m = { checkText };
/** What the overlay suggests for these words (input-overlay read(): the loss flag and the level it passes). */
function chips(t, lossAware = true) {
  const safety = readSafety(m, t, lossAware);
  const loss = !!t.trim() && (safety.category === 'loss' || lossIn(t));
  return suggestedFeelings(interpret(t), { loss, level: safety.level });
}

// ------------------------------------------------------------------------------- 8a. the someone-else rule --
test('generic "you" is the person: their feeling keeps its suggestion', () => {
  assert.deepEqual(chips('you just feel so lonely when you move to a new city'), ['loneliness']);
  assert.deepEqual(chips('you get so anxious before exams'), ['anxiety']);
  assert.deepEqual(chips('you feel so stupid when you forget a name'), suggestedFeelings(interpret('I feel so stupid when I forget a name')));
});

test('a feeling shared with someone is the person’s too', () => {
  assert.deepEqual(chips('me and my brother were furious about it'), ['fury']);
  assert.deepEqual(chips('my mum is angry and so am I'), ['anger']);
  assert.deepEqual(chips('my mum is angry, and so am I'), ['anger']);
  assert.deepEqual(chips('my dog was scared of the fireworks and so was I'), ['fear']);
  assert.deepEqual(chips('my sister was upset and I was too'), ['sadness']);
  assert.deepEqual(chips('my brother and I were furious about it'), ['fury']);
});

test('a feeling the words give to someone else alone is still never suggested as theirs', () => {
  for (const t of ['my mum didnt call me back, she must be angry with me', 'my boss was furious at the team today', 'he seems really upset with me',
    'my friend is so annoyed with me', 'they looked disappointed', 'my dad gets so mad', 'everyone was angry at me', 'my sister is jealous of me',
    'my mum and dad were furious', 'my sister was upset and so was my mum']) {
    assert.deepEqual(chips(t), [], t);
  }
  assert.deepEqual(chips('he was angry so I got scared'), ['fear']);
  assert.deepEqual(chips('my teacher is disappointed in me and I feel ashamed'), ['shame']);
  assert.deepEqual(chips('she makes me so angry'), ['anger']);
});

// --------------------------------------------------------------------- 8b. stated feelings beside a loss --
test('beside a loss a feeling the person states outright stays after Grief and Sad', () => {
  assert.deepEqual(chips('my dad died and I feel guilty that I wasnt there'), ['grief', 'sadness', 'guilt']);
  assert.deepEqual(chips('we had to put our dog down yesterday, I feel so guilty'), ['grief', 'sadness', 'guilt']);
  assert.deepEqual(chips('my wife died and I am so angry at the doctors'), ['grief', 'sadness', 'anger']);
  assert.deepEqual(chips('my mum has dementia and doesnt recognise me anymore, I feel so frustrated with myself'), ['grief', 'sadness', 'frustration']);
  assert.deepEqual(chips('my grandma passed away peacefully in her sleep, I am relieved she isnt in pain'), ['grief', 'sadness', 'relief']);
  for (const t of ['my dad died and I feel guilty that I wasnt there', 'my wife died and I am so angry at the doctors']) {
    assert.deepEqual(chips(t, false), chips(t, true), `Another Angle reads the same: ${t}`);
  }
});

test('beside a loss a word the reading merely found is still not echoed back', () => {
  // (the self-blame of a pregnancy loss: "rested", "obligated"; a pleasant feeling that was, not is: "excited")
  assert.deepEqual(chips('At the 12 week scan there was no heartbeat. I should have rested more.'), ['grief', 'sadness']);
  assert.deepEqual(chips('we had a miscarriage on sunday, I was so excited to be a mum'), ['grief', 'sadness']);
  assert.deepEqual(chips('my nan died last week'), ['grief', 'sadness']);
  for (const id of chips('covid took my grandad')) assert.ok(LOSS_FIT.has(id), id);
  // stated outright, but not as theirs: someone else's anger beside a loss
  assert.deepEqual(chips('my dad died and my mum is so angry at the doctors'), ['grief', 'sadness']);
});

// --------------------------------------------------------------------------- 8c. moved, touched (a doing) --
test('"moved" and "touched" are feelings only when the words say so', () => {
  assert.deepEqual(chips('I feel so lonely since I moved'), ['loneliness']);
  for (const t of ['my best friend moved to Spain', 'we moved house last week', 'I was moved to a new team', 'she moved away',
    'everyone has moved on', 'he touched me', 'she touched my arm']) {
    const r = interpret(t);
    assert.ok(!r.emotions.some((e) => e.id === 'moved' || e.id === 'touched'), `${t}: ${r.emotions.map((e) => e.id)}`);
  }
  for (const [t, id] of [['I was so moved by the film', 'moved'], ['that really moved me', 'moved'], ['it moved me to tears', 'moved'],
    ['I was deeply moved', 'moved'], ['I feel moved', 'moved'], ['moved', 'moved'], ['I was so touched by her card', 'touched'],
    ['that touched me', 'touched'], ['it touched my heart', 'touched']]) {
    assert.ok(interpret(t).emotions.some((e) => e.id === id && e.confidence >= 0.6), `${t} reads ${id}`);
  }
});

// ------------------------------------------------------------- 1. a world held quietly after a closed Tell --
const scene = read('src/app/scenes/hushfold.js');
const fnOf = (a, b) => scene.slice(scene.indexOf(a), scene.indexOf(b, scene.indexOf(a) + a.length));

test('abuse or a death typed in a running world and the Tell closed without Send: the same gentle beat as after Send, never frozen', () => {
  const close = fnOf('onClose: (reason, meta = {}) => {', 'pushLayer(\'overlay\');');
  // held quietly (no pill, nothing resumes it): the support line, then stay here quietly or somewhere calm (careBeat → careChoice)
  assert.match(close, /if \(!S\.crisis && S\.hold === 'quiet' && worldMode && flowRef && !flowRef\.stub\) \{\s*if \(!S\.quietBeat\) \{/);
  // (held for "Just be with it" alone: the soft chip again, alone — the coordinator's default since review r2)
  assert.match(close, /S\.quietBeat = \(soft \? softChoice\(\{ again: true \}\)\s*: careBeat\(\{ emotion: null, intention: null, safety: \{ level: S\.level, category: S\.category \} \}\)\)/);
  // (one beat at a time; it lets go once done)
  assert.match(close, /\.finally\(\(\) => \{ if \(S\.quietBeat === beat\) S\.quietBeat = null; \}\)/);
  // only when it was not sent (a Send has afterTell's own beat), and never after a crisis (the world ends quietly then)
  assert.ok(close.indexOf("if (reason !== 'submit') {") < close.indexOf('S.quietBeat = (soft ? softChoice('));
  // and careChoice ends a quietly held world quietly on "stay" or no answer, or melts into the calm world asked for
  const choice = fnOf('async function careChoice(', 'function calmTheWorld(');
  assert.match(choice, /\} else if \(S\.hold === 'quiet' && worldMode\) \{[\s\S]*?endQuietWorld\(\);/);
  assert.match(choice, /playCalm\(\{ emotion, intention, worldId: gw\.worldId, safety, soft \}\);/);
  assert.match(fnOf('function playCalm(', 'function calmTheWorld('), /if \(worldMode && flowRef && !flowRef\.stub && !S\.finishing\) \{ calmTheWorld\(worldId\); return; \}/);
});

// ----------------------------------------------------------------------- 7. Resume only after S.noResume --
test('Resume is hidden only after a loss or a care-level disclosure (S.noResume), not after distress alone', async () => {
  const body = fnOf('async function resumableNow()', 'function resumeSaved()');
  assert.match(body, /if \(S\.noResume && registry\.get\(p\.worldId\)\?\.calm !== true\) return null;/);
  assert.doesNotMatch(body, /gentle\(\)/);
  assert.match(body, /\|\| S\.crisis\) return null;/, 'never after a crisis');
  // the director picks up the saved world itself when asked, gently: what the panel offers is what plays
  const dir = read('src/hushfold/flow/director.js');
  assert.match(dir, /if \(id && gentleOn && registry\.get\(id\)\?\.calm !== true && !resuming\) id = null;/);
});

// ------------------------------------------------- 2. the More Room offer meets a line on a small phone (320×568) --
test('320×568: a line coming into the band folds the offer lying there (whatever places it again), never onto the hero or across the face', () => {
  const gi = read('src/hushfold/garden-install.js');
  const offer = gi.slice(gi.indexOf('export function offerSave('), gi.indexOf('function note('));
  const place = offer.slice(offer.indexOf('function place({ fresh = false } = {}) {'), offer.indexOf('let geom = place();'));
  // in place() itself: the band's watch, the shell's relayout once the Mallow lands, a resize all go through it
  assert.match(place, /const prev = fresh \? null : rect, was = fresh \? null : tier, wasForm = form;/);
  // (P1, 15 Oct: never over the Mallow at all — placed again it folds; placed fresh it waits as its chip for room)
  assert.match(place, /if \(geom && !offBody\(p\.tier\)\) \{\s*if \(wasForm\) apply\(wasForm\);\s*if \(!prev\) \{ roomWait = true; return geom; \}\s*if \(!folded\) fold\(true, \{ quick: true \}\);[^\n]*\n\s*return geom;/);
  assert.ok(place.indexOf('fold(true, { quick: true })') < place.indexOf('el.style.left ='), 'it folds where it is: never moved first');
  // (the band's watch no longer decides by itself)
  assert.doesNotMatch(offer, /const off = \(t\) =>/);
  // out of the line's way at once (the line fades in where it lay), and a move whose slide would cross the face hops
  assert.match(gi, /\.hm-offer\.is-folded\.is-quick, \.hm-offer\.is-reduced\.is-folded\.is-quick \{ transition: none; \}/);
  assert.match(gi, /\.hm-offer\.is-hop \{ transition: none !important; opacity: 0 !important; \}/);
  assert.match(place, /const hop = !!\(sweep && f && el\.classList\.contains\('is-in'\) && hits\(sweep, f, 2\) && !hits\(next, f, 2\)/);
  // a tap on the chip places it afresh (not folded again for where it was before) — and with no room off the Mallow
  // yet, the chip stays (glowing) until there is
  assert.match(offer, /const g = place\(\{ fresh: true \}\);[\s\S]*?if \(roomWait\) \{ folded = false; fold\(true, \{ quick: true, waiting: true \}\); return; \}\s*geom = g;\s*folded = false; el\.classList\.remove\('is-folded'\); reveal\(\);/);
});

// ------------------------------------------------------- 3. the goodbye's line, placed knowing where the thought rests --
test('after Finish the closing line waits for the thought to come to rest with its words (1.8 s at most), so it is never moved mid-read', () => {
  const fin = fnOf('function onFinished() {', '/** A world\'s goodbye holds the garden offer folded');
  const cb = fin.slice(fin.indexOf('later(() => {'));
  // the line itself is chosen as before (crisis: the one calm line; gentle: the quiet line; else the Mallow's goodbye)
  assert.match(cb, /if \(S\.crisis\) \{ speakCrisis\(\); \} else if \(softNow\(\)\) bye = say\(SHARED_LINES\.careQuiet\); else bye = say\(lines\.pick\(mallowId, 'finished'\)/);
  // ...said once the thought is home (after the 780 ms re-plan) with its words showing, two looks in a row, or at 1.8 s
  assert.match(cb, /return d < 4 && !!L\.tagRect\(home\);/);
  assert.match(cb, /still = now\(\) - t0 >= 820 && atRest\(\) \? still \+ 1 : 0;\s*if \(still >= 2 \|\| now\(\) - t0 >= 1800\) \{ goodbye\(\); return; \}/);
  // at once with no thought on the stage, or after a crisis
  assert.match(cb, /if \(S\.crisis \|\| !home \|\| home\.leaving \|\| typeof L\?\.tagRect !== 'function'\) \{ goodbye\(\); return; \}/);
  // nothing is said into a new world or after leaving; the chip still comes back after the line (8 s at most)
  assert.match(cb, /const goodbye = \(\) => \{\s*if \(S\.left \|\| worldMode \|\| S\.finishing\) return;/);
  assert.match(cb, /Promise\.resolve\(bye\)\.then\(\(\) => later\(\(\) => holdOffer\(false\), 300\)\);/);
  assert.match(cb, /later\(\(\) => holdOffer\(false\), 8000\);/);
  assert.ok(cb.indexOf('endWorldMode();') < cb.indexOf('const goodbye'), 'after the world has gone');
});

// ------------------------------------------------------------------- 5. the scrim over a bright spot, edges included --
test('the subtitle scrim deepens over a bright spot anywhere under it, its rounded ends and rim included, and looks again in a line\'s first seconds', async () => {
  const { hotSpot } = await import('../src/hushfold/subtitles.js');
  const cols = 48, rows = 12;
  const img = (px) => { const d = new Uint8ClampedArray(cols * rows * 4); for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const [r, g, b] = px(i, j); const k = (j * cols + i) * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255; } return d; };
  const sky = [110, 175, 230], sun = [255, 250, 225];
  // the sun at the box's right end, its top right corner, half outside its right edge: found, where it is
  for (const [cx, cy] of [[44, 6], [46, 2], [48.5, 5], [1, 6]]) {
    const s = hotSpot(img((i, j) => (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) < 3.2 ? sun : sky)));
    assert.ok(s, `found at ${cx},${cy}`);
    assert.ok(Math.abs(s.x - Math.min(47.5, Math.max(0.5, cx)) / cols) < 0.06, `${cx},${cy} → ${JSON.stringify(s)}`);
  }
  const css = read('src/ui/hushfold.css');
  // the scrim itself: the pill; the deepening: its own layer in the pill's own shape and feather (review P3, 14 Oct: never
  // a dark blot hanging past the pill on a bright home), its rounded ends and rim included
  assert.match(css, /\.hf-sub::before \{[^}]*inset: -14px -24px -16px; border-radius: 999px;[^}]*background: rgba\(9, 6, 28, var\(--hf-scrim, 0\.5\)\);/);
  assert.match(css, /\.hf-sub::after \{[^}]*inset: -14px -24px -16px; border-radius: 999px;[^}]*rgba\(var\(--hf-hot-rgb, 9, 6, 28\), var\(--hf-hot-a, 0\)\) calc\(var\(--hf-hot-r, 0px\) \* 0\.75\)[^}]*filter: blur\(12px\);/);
  // (found a moment late, it deepens in)
  assert.match(css, /@property --hf-hot-a \{ syntax: '<number>'; inherits: true; initial-value: 0; \}/);
  const subs = read('src/hushfold/subtitles.js');
  // placed in px from the line's own box (the sampled box is the scrim's: 24 px beside, 14 px above the line)
  assert.match(subs, /node\.style\.setProperty\('--hf-hot-cx', `\$\{Math\.round\(hs\.x \* box\.width - 24\)\}px`\);/);
  assert.match(subs, /node\.style\.setProperty\('--hf-hot-cy', `\$\{Math\.round\(hs\.y \* box\.height - 14\)\}px`\);/);
  // looked at again while the line shows (a line said as the realm still fades in): until two looks agree, four at most
  assert.match(subs, /setInterval\(\(\) => \{ if \(cur\?\.lineEl \|\| !chipsEl\.hidden\) layout\(\); rescrim\(\); \}, 600\)/);
  assert.match(subs, /if \(!n\?\.isConnected \|\| c\.phase === 'out' \|\| \(c\.scrimLooks \|\| 0\) >= 4 \|\| c\.scrimStill >= 2\) return;/);
});

// ------------------------------------------------------------- 6. the support sheet after abuse, violence or threats --
test('the support sheet after abuse leads with its first actions above the fold (Find A Helpline, then the emergency number), only listed numbers', async () => {
  const support = await import('../src/app/scenes/support.js');
  const { abuseActions, SUPPORT_LINES, emergencyNumber } = support;
  const known = new Set(['999', '911', '112', ...SUPPORT_LINES.filter((l) => l.tel).map((l) => l.tel)]);
  for (const r of ['GB', 'IE', 'US', 'CA', null]) {
    const a = abuseActions(r);
    assert.deepEqual(a.map((x) => x.id), ['findahelpline', 'emergency'], String(r));
    assert.equal(a[0].href, 'https://findahelpline.com');
    assert.ok(a[0].primary && a[0].external);
    assert.equal(a[1].href, `tel:${emergencyNumber(r)}`);
    for (const c of a) if (c.href.startsWith('tel:')) assert.ok(known.has(c.href.slice(4)), `${r}: ${c.href} is a listed number`);
  }
  const src = read('src/app/scenes/support.js');
  // the non-urgent sheet: the actions (abuse family only) come after the intro, before the cards
  const plain = src.slice(src.indexOf(': h(\'div\', {},', src.indexOf('const body = urgent')));
  assert.match(plain, /abuseFirst\(cat\) \? h\('div', \{ class: 'support-calls', role: 'group', 'aria-label': 'Get help' \}, \.\.\.abuseActions\(region\)\.map\(callBtn\)\) : null,\s*\.\.\.lines\.map\(card\)/);
  assert.doesNotMatch(src.replace(/\/\/[^\n]*/g, ''), /0808|1-800|799-7233/, 'no new numbers');
  // what scrolls on below fades out above the foot (never cut mid-line under it)
  const css = read('src/ui/app.css');
  assert.match(css, /\.sheet \.sheet-body \{ -webkit-mask-image: linear-gradient\(to bottom, #000 calc\(100% - 22px\), transparent\); mask-image: linear-gradient\(to bottom, #000 calc\(100% - 22px\), transparent\); \}/);
});

// ------------------------------------------- P1 (15 Oct): the Memory Garden offer never over the Mallow, any screen --
test('P1 320×568: the garden offer never lies over the Mallow — first shown with no room, it waits as its chip and opens by itself once there is', () => {
  const gi = read('src/hushfold/garden-install.js');
  const offer = gi.slice(gi.indexOf('export function offerSave('), gi.indexOf('function note('));
  // the first placement: offered with nothing but the hero's body left, it is never revealed there
  assert.match(offer, /if \(roomWait\) fold\(true, \{ quick: true, waiting: false \}\);\s*else reveal\(\);/);
  assert.match(offer, /const reveal = \(\) => requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => \{ if \(!done && !folded\) el\.classList\.add\('is-in'\); \}\)\);/);
  // waiting: the lines changing, a relayout or a resize try again; it opens only where it is clear of the Mallow
  const room = offer.slice(offer.indexOf('function tryRoom() {'), offer.indexOf('// left alone, it folds'));
  assert.match(room, /if \(done \|\| !folded \|\| !roomWait \|\| installHeld\) return;\s*const g = place\(\{ fresh: true \}\);\s*if \(roomWait\) return;/);
  assert.match(offer, /const stopBand = onBandChange\(\(\) => \{\s*if \(folded && roomWait\) \{ tryRoom\(\); return; \}/);
  assert.match(offer, /el\.__place = \(\) => \{ if \(folded\) tryRoom\(\); else geom = place\(\); \};/);
  assert.match(offer, /const onResize = \(\) => \{ if \(folded\) tryRoom\(\); else geom = place\(\); \};/);
  // the chip itself never lies over the Mallow's body: with no corner clear of it, it waits unseen
  const chip = gi.slice(gi.indexOf('function showChip('), gi.indexOf('function hideChip('));
  assert.match(chip, /const free = clear\(obstacles\) \|\| \(body \? clear\(\[\.\.\.firm, body\]\) : clear\(firm\)\);/);
  assert.match(gi, /\.hm-chip\.is-waiting \{/);
});

// ---------------------------------------- P1 (15 Oct): a stroke that starts on the thought's words stirs the world --
test('P1: a finger setting off from a thought\'s words is a stroke on the stage (the storm stirs), a hold carries the thought, a tap reads', async () => {
  const layer = read('src/mallows/thought/layer.js');
  assert.match(layer, /const TAG_SLOP = 10, TAG_HOLD_MS = 450;/);
  assert.match(layer, /touch-action:none;pointer-events:auto;/, 'the words never become a browser pan');
  assert.match(layer, /el\.addEventListener\('pointerdown', \(e\) => \{ e\.stopPropagation\(\); this\._tagDown\(th, el, e\); \}\);/);
  const down = layer.slice(layer.indexOf('  _tagDown(th, el, e) {'), layer.indexOf('  _makeTag(th) {'));
  assert.match(down, /if \(Math\.hypot\(ev\.clientX - g\.x, ev\.clientY - g\.y\) > TAG_SLOP\) give\('stroke', ev\);/);
  assert.match(down, /g\.timer = setTimeout\(\(\) => \{ if \(this\._tagG === g\) give\('hold', g\.last\); \}, TAG_HOLD_MS\);/);
  // a handed-over touch never reads (the click that may follow is swallowed until a moment after the finger lifts)
  assert.match(layer, /el\.addEventListener\('click', \(\) => \{ const g = this\.tags\.get\(th\); if \(g && nowMs\(\) < \(g\.swallowUntil \|\| 0\)\) return; this\.read\(th\); \}\);/);
  // the shell hands it to the router; the stage passes the option through
  assert.match(read('src/app/scenes/hushfold.js'), /onTagGesture: \(th, kind, e, from\) => !!router\?\.adopt\?\.\(e, \{ kind, from, thought: th \}\),/);
  assert.match(read('src/hushfold/stage.js'), /textScale: textK, onTagGesture \}\);/);
  // the worlds' generous ring round the thought's body never reaches over its words
  for (const f of ['src/hushfold/flow/worlds/static-storm.js', 'src/hushfold/flow/worlds/luminous-ocean.js']) assert.match(read(f), /if \(onWords\(thought, x, y\)\) return false;/, f);
  // the router: a stroke is the world's from where it began (never the thought's or the Mallow's); a hold carries the thought
  const { createInputRouter } = await import('../src/hushfold/input-router.js');
  const listeners = {}, el = { addEventListener: (t, f) => { listeners[t] = f; }, removeEventListener() {}, setPointerCapture() {} };
  const prevDoc = globalThis.document;
  globalThis.document = { addEventListener() {}, removeEventListener() {}, body: { classList: { add() {}, remove() {} } } };
  try {
    const got = [], thoughtGot = [];
    const th = { x: 100, y: 200 };
    const r = createInputRouter({ el, mallow: { hitTest: () => true, pointer: () => got.push('mallow') }, thoughts: { hitTest: () => th, pointer: (t, e) => thoughtGot.push([e.type, e.x, e.y]) } });
    r.setWorld((e) => got.push([e.type, Math.round(e.x), Math.round(e.y)]), { thoughts: true });
    const ev = (id, x, y, t) => ({ pointerId: id, clientX: x, clientY: y, timeStamp: t, pointerType: 'touch' });
    assert.equal(r.adopt(ev(5, 130, 260, 20), { kind: 'stroke', from: { x: 110, y: 250, t: 0 }, thought: th }), true);
    assert.deepEqual(got.slice(0, 2), [['down', 110, 250], ['move', 130, 260]], 'from where it began, then where it is: the world\'s, never the Mallow\'s');
    listeners.pointermove(ev(5, 160, 270, 40));
    listeners.pointerup(ev(5, 170, 270, 60));
    assert.deepEqual(got.slice(2).map((g) => g[0]), ['move', 'up']);
    assert.equal(r.active, 0);
    // a hold: felt on the thought's body (the world owns the thoughts here), the finger's moves as they are
    got.length = 0;
    assert.equal(r.adopt(ev(6, 110, 250, 500), { kind: 'hold', from: { x: 110, y: 250, t: 0 }, thought: th }), true);
    listeners.pointermove(ev(6, 120, 240, 540));
    assert.deepEqual(got, [['down', 100, 200], ['move', 110, 190]]);
    listeners.pointerup(ev(6, 120, 240, 560));
    // no world: a hold carries the thought itself; a stroke is empty space's
    r.setWorld(null);
    assert.equal(r.adopt(ev(7, 110, 250, 600), { kind: 'hold', from: { x: 110, y: 250, t: 0 }, thought: th }), true);
    assert.deepEqual(thoughtGot[0], ['down', 100, 200]);
    listeners.pointerup(ev(7, 110, 250, 620));
    // the same pointer twice, or a hold with no thought: not taken
    assert.equal(r.adopt(ev(8, 1, 1, 0), { kind: 'hold', thought: null }), false);
    r.destroy();
  } finally { globalThis.document = prevDoc; }
});
