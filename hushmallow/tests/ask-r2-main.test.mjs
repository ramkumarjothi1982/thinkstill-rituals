// The main screen's 'ask before every world', round 2 (the final reviews of 8dd972c: browser 7.5/10, semantic 6/10):
//   1. (P2) the question left unanswered or closed with Back keeps the person's words for the next Tell; its clock is
//      ~45 s and waits while the page is hidden; the keyboard focus goes to the first choice, and back to Tell after;
//   2. (P2) back home from Another Angle after "Just be with it" is never a loss: only a real safety level raises it;
//   3. (P3 races) a world arriving under the question waits under its veil; "Play with it" is the person's from the tap;
//      "Play with it" ends a quiet visit; the no-plan retell keeps the choice made before the plans page;
//   4. (P3 layout) asking over a world folds its postcards away (and the thought, when there is no room clear of it);
//      the Mallow's accessible label is attentive while it asks; the scrim over a warm sun keeps the sky's colour;
//   5. the coordinator's defaults: equal weight for the two answers; after "Just be with it" one gentle line and one
//      soft chip, "Somewhere calm", that fades after ~12 s — at home staying is the default, in a world it ends quietly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sameWords, tellRoute, askOutcome } from '../src/app/scenes/hushfold.js';
import { PLAY_CHECK } from '../src/hushfold/lines.js';
import { createSubtitles, hotTint, hotAlpha, luminance, HIDDEN_BACK_MS } from '../src/hushfold/subtitles.js';
import { describeExpression, STAGES } from '../src/mallows/expressions.js';
import { MALLOWS } from '../src/mallows/registry.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const hf = read('src/app/scenes/hushfold.js');
const subsSrc = read('src/hushfold/subtitles.js');
const css = read('src/ui/hushfold.css');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------- a fake DOM --
// (enough of one for the real subtitles: elements with classes, attributes, children, events and focus; a document that
// is an EventTarget with a `hidden` the test sets, so visibilitychange can be sent)
function installDom() {
  const KEYS = ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'innerWidth', 'innerHeight'];
  const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  let doc = null;
  class El extends EventTarget {
    constructor(tag) {
      super();
      this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null;
      this.hidden = false; this._text = ''; this.attrs = new Map();
      const props = new Map();
      this.style = { setProperty: (k, v) => props.set(k, v), getPropertyValue: (k) => props.get(k) ?? '', removeProperty: (k) => props.delete(k) };
      const cls = new Set(); this._cls = cls;
      this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c),
        toggle: (c, on) => { const v = on === undefined ? !cls.has(c) : !!on; if (v) cls.add(c); else cls.delete(c); return v; } };
    }
    get className() { return [...this._cls].join(' '); }
    set className(v) { this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this._cls.add(c)); }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children = []; this._text = String(v ?? ''); }
    get firstChild() { return this.children[0] || null; }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.body; }
    get offsetHeight() { return 0; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); if (k === 'class') this.className = v; if (k === 'hidden') this.hidden = true; }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    removeAttribute(k) { this.attrs.delete(k); if (k === 'hidden') this.hidden = false; }
    append(...nodes) { for (const n of nodes) { if (n == null) continue; const c = typeof n === 'object' ? n : doc.createTextNode(n); c.parentNode = this; this.children.push(c); } }
    replaceChildren(...nodes) { for (const c of this.children) c.parentNode = null; this.children = []; this._text = ''; this.append(...nodes); }
    remove() { const p = this.parentNode; if (p) { p.children = p.children.filter((c) => c !== this); this.parentNode = null; } }
    focus() { doc.activeElement = this; }
    click() { this.dispatchEvent(new Event('click')); }
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
    *all() { for (const c of this.children) { yield c; yield* c.all(); } }
    querySelector(sel) { const c = sel.replace(/^\./, ''); for (const n of this.all()) if (n._cls?.has(c)) return n; return null; }
    contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  }
  doc = new EventTarget();
  Object.assign(doc, { body: new El('body'), activeElement: null, hidden: false, createRange: () => { throw new Error('no ranges here'); } });
  doc.createElement = (t) => new El(t);
  doc.createElementNS = (_ns, t) => new El(t);
  doc.createTextNode = (s) => Object.assign(new El('#text'), { nodeType: 3, _text: String(s) });
  Object.assign(globalThis, { document: doc, requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout, innerWidth: 390, innerHeight: 844 });
  const chips = () => [...doc.body.all()].filter((n) => n._cls?.has('hf-chip'));
  const chipsRow = () => [...doc.body.all()].find((n) => n._cls?.has('hf-chips'));
  const setHidden = (h) => { doc.hidden = h; doc.dispatchEvent(new Event('visibilitychange')); };
  return { doc, chips, chipsRow, setHidden, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const prefs = { get: () => 1, set() {}, onChange: () => () => {} };

// ======================================================================= 1. the words kept, the clock, focus --
test('the question\'s clock is ~45 s (was 20 s): long enough to read slowly, with a screen reader or a keyboard', () => {
  assert.equal(PLAY_CHECK.ms, 45000);
  assert.ok(HIDDEN_BACK_MS >= 10000, 'seen again after the page was hidden: at least 10 s more to answer');
});

test('left unanswered, or closed with Back, the words wait for the next Tell (retell, as after the plans page); an answer lets them go', () => {
  const after = between(hf, 'async function afterTell(', 'async function askPlay(');
  // kept as the question is asked (so a Tell opened over it, or after it went, opens with them), never after something heavy
  assert.match(after, /const kept = text && !gentle\(\) \? \(retell = \{ text, emotion: emotion \|\| null, intention: intention \|\| null \}\) : null;\s*const out = askOutcome\(await askPlay\(kept\)/);
  // answered (Play or Just be with it): let go at the tap, only if they are still these words
  const ask = between(hf, 'async function askPlay(words = null) {', 'function focusTell() {');
  assert.match(ask, /const pick = \(v\) => \(\) => \{ picked = v; if \(words && retell === words\) retell = null; \};/);
  // the Tell opens with them (their feeling too), and an unsent close keeps what is in the box (unchanged)
  const open = between(hf, 'function openTellNow(prompt) {', 'pushLayer(\'overlay\');');
  assert.match(open, /const again = retell && !gentle\(\) \? retell : null;/);
  assert.match(open, /emotion: again\?\.emotion \|\| null, intention: S\.intention \|\| again\?\.intention \|\| null, hasPlan: ent\.has\('paid'\), text: again\?\.text \|\| '',/);
  assert.match(open, /if \(retell\) retell = reason === 'submit' \? null : \(ov\?\.text\?\.trim\(\) \? \{ \.\.\.retell, text: ov\.text \} : null\);/);
  // quietAfterAsk (no answer, Back) never lets them go
  assert.doesNotMatch(between(hf, 'function quietAfterAsk() {', 'async function wordsFeeling('), /retell = null/);
});

test('the question takes the keyboard focus to its first choice, waits while the page is hidden, and the focus comes back to Tell', () => {
  const ask = between(hf, 'async function askPlay(words = null) {', 'function focusTell() {');
  assert.match(ask, /focus: true, waitHidden: true/);
  assert.match(ask, /finally \{[\s\S]*focusTell\(\);\s*\}/);
  const ft = between(hf, 'function focusTell() {', 'let askHold = null;');
  // never from a Tell opened over it (its text field has the focus), only from the stage or the vanished chips
  assert.match(ft, /if \(S\.left \|\| overlay \|\| typeof document === 'undefined'\) return;/);
  assert.match(ft, /if \(a && a !== document\.body && !subtitles\.el\.contains\(a\)\) return;/);
  assert.match(ft, /tellBtn\.focus\?\.\(\{ preventScroll: true \}\);/);
});

test('real subtitles: a choice with focus has the first chip focused (never taken from a text field)', async () => {
  const dom = installDom();
  try {
    const subs = createSubtitles({ root: dom.doc.body, prefs });
    subs.choice('Shall we play with this, or just be with it?', [{ label: 'Play with it', value: 'play' }, { label: 'Just be with it', value: 'stay' }], { focus: true, transient: true, ask: true });
    await sleep(10);
    assert.equal(dom.doc.activeElement?.textContent, 'Play with it');
    subs.destroy();
    // typing in the Tell's text field: the focus stays there
    const subs2 = createSubtitles({ root: dom.doc.body, prefs });
    const ta = dom.doc.createElement('textarea'); dom.doc.body.append(ta); ta.focus();
    subs2.choice('Shall we…?', [{ label: 'Play with it', value: 'play' }], { focus: true });
    await sleep(10);
    assert.equal(dom.doc.activeElement, ta);
    // a choice without focus (the invitation, the soft chip) never moves it
    dom.doc.activeElement = null;
    subs2.clear();
    subs2.choice('Want to tell me?', [{ label: 'Tell me', value: 'tell' }]);
    await sleep(10);
    assert.equal(dom.doc.activeElement, null);
    subs2.destroy();
  } finally { dom.restore(); }
});

test('real subtitles: waitHidden — the clock stops while the page is hidden and gives at least hiddenBackMs once it is seen again', async () => {
  const dom = installDom();
  try {
    const subs = createSubtitles({ root: dom.doc.body, prefs });
    let v = 'pending';
    subs.choice('Q', [{ label: 'A', value: 'a' }], { timeoutMs: 120, waitHidden: true, hiddenBackMs: 200, transient: true }).then((x) => { v = x; });
    await sleep(40);
    dom.setHidden(true);
    await sleep(400);
    assert.equal(v, 'pending', 'hidden: no time-out (it would have fired at 120 ms)');
    dom.setHidden(false);
    await sleep(120);
    assert.equal(v, 'pending', 'seen again: at least hiddenBackMs more');
    await sleep(700);
    assert.equal(v, null, 'then it times out as before');
    // hidden from the start: the clock only starts once it is seen
    let w = 'pending';
    dom.setHidden(true);
    subs.choice('Q2', [{ label: 'A', value: 'a' }], { timeoutMs: 60, waitHidden: true, hiddenBackMs: 60 }).then((x) => { w = x; });
    await sleep(300);
    assert.equal(w, 'pending');
    dom.setHidden(false);
    await sleep(700);
    assert.equal(w, null);
    // without waitHidden the clock runs while hidden (every other choice, unchanged)
    let u = 'pending';
    dom.setHidden(true);
    subs.choice('Q3', [{ label: 'A', value: 'a' }], { timeoutMs: 60 }).then((x) => { u = x; });
    await sleep(700);
    assert.equal(u, null);
    dom.setHidden(false);
    subs.destroy();
  } finally { dom.restore(); }
});

test('real subtitles: a choice let go by its clock fades its chips out with the line (never a pop); a tapped one goes at once', async () => {
  const dom = installDom();
  try {
    const subs = createSubtitles({ root: dom.doc.body, prefs });
    const p = subs.choice(PLAY_CHECK.be, [{ label: PLAY_CHECK.calm, value: 'calm', soft: true }], { timeoutMs: 40, transient: true, soft: true });
    await sleep(15);
    const [chip] = dom.chips();
    assert.ok(chip._cls.has('soft'), 'the soft chip has its own quiet style');
    assert.ok(!chip._cls.has('primary'));
    await sleep(60);
    assert.ok(dom.chipsRow()._cls.has('out') && !dom.chipsRow().hidden, 'fading with the line');
    assert.equal(await p, null);
    assert.ok(!dom.chipsRow()._cls.has('out') && dom.chipsRow().hidden, 'then gone');
    // tapped: the chips go at once, the value is the person's
    const q = subs.choice('Q', [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }], {});
    await sleep(15);
    dom.chips()[1].click();
    assert.ok(dom.chipsRow().hidden);
    assert.equal(await q, 'b');
    subs.destroy();
  } finally { dom.restore(); }
});

// ===================================================================================== 2. back from Another Angle --
test('back from Another Angle: only a real safety level raises the visit; "Just be with it" there sets at most the quiet state', () => {
  const enter = between(hf, 'async enter() {', 'leave() {');
  assert.match(enter, /if \(LEVELS\.indexOf\(params\.safety\?\.level\) > 0\) \{ if \(params\.safety\.level === 'crisis'\) S\.crisisSpoken = true; noteSafety\(params\.safety\); S\.careSaid = true; \}/);
  assert.doesNotMatch(enter, /if \(params\.safety\?\.level\) \{/, 'a level of "none" (or anything else) never brings the Support pill or careSaid');
  assert.match(enter, /if \(params\.soft === true \|\| params\.safety\?\.soft === true\) softVisit\(\);/);
  // (the quiet state is set before the Mallow's first frame: no entrance hop, the attentive face)
  assert.ok(enter.indexOf('softVisit();') < enter.indexOf('const rigP = showMallow(mallowId, { entrance: !softNow() });'));
  // softVisit never touches the level, the Support pill or careSaid (unchanged)
  assert.doesNotMatch(between(hf, 'function softVisit() {', 'function endSoft() {'), /noteSafety|supportPill|careSaid|S\.level/);
  // and with nothing heavy in the visit, a later Tell is asked (never 'carried', never support)
  assert.equal(tellRoute({ level: 'none', carried: false }), 'ask');
  assert.equal(tellRoute({ level: 'none', carried: true }), 'ask');
});

// ===================================================================================================== 3. races --
test('(a) a world arriving under the question waits under its veil (never plays on under it), folded, with no title over it', () => {
  const ow = between(hf, 'function onWorld(d) {', 'function heroWaitsForWords() {');
  assert.match(ow, /if \(!hold && !quietArrival && S\.asking\) \{\s*foldWorld\(true\);\s*later\(\(\) => \{ if \(S\.asking && worldMode && !S\.finishing\) \{ holdForAsk\(true\);[^\n]*\}, prefs\.reducedMotion\(\) \? 420 : 800\);/);
  // (its host arrives on the attentive face, as the question asks: never the storm's glare under it)
  assert.match(ow, /holdForAsk\(true\); stageMallow\?\.setStage\?\.\(CARE_FACE, \{ quiet: true \}\);/);
  assert.equal((hf.match(/if \(softNow\(\) \|\| S\.asking\) stageMallow\??\.setStage\?\.\(CARE_FACE, \{ quiet: true \}\);/g) || []).length, 2, 'showMallow, both stages');
  // (answered in that first moment, "Just be with it" still holds it quietly: beWithIt pauses a world not yet held)
  assert.match(between(hf, 'async function beWithIt(', 'async function softChoice('), /if \(!flowRef\.state\?\.paused\) flowRef\.pause\?\.\(\);/);
  assert.match(ow, /if \(d\?\.title && !d\.from && !hold && !S\.asking && !quietArrival\) subtitles\.say\(/);
  // the world's own pause and clears (and a world starting) never take the shell's question or soft chip with them
  assert.match(hf, /const isAsk = \(o\) => !!\(o\?\.ask \|\| o\?\.soft\);/);
  assert.match(hf, /clear: \(\) => subtitles\.clear\(\{ keep: isAsk \}\), pause: \(\) => subtitles\.clear\(\{ keepHeld: true, keep: isAsk \}\),/);
  assert.match(between(hf, 'async function startFlow(', 'async function warmWorld('), /if \(!subtitles\.holding\) subtitles\.clear\(\{ keep: isAsk \}\);/);
  // ...and one arriving after "Just be with it" is held quietly and ends quietly
  assert.match(between(hf, 'async function beWithIt(', 'async function softChoice('), /if \(!worldMode && starting > 0\) S\.softArrive = true;/);
  assert.match(ow, /if \(quietArrival\) \{\s*S\.hold = 'quiet'; S\.softHold = true; pausedPill\.hidden = true;/);
});

test('real subtitles: clear({ keep }) leaves the question on screen, its clock running and its promise waiting; the rest goes', async () => {
  const dom = installDom();
  try {
    const subs = createSubtitles({ root: dom.doc.body, prefs });
    let v = 'pending';
    subs.choice('Shall we play with this, or just be with it?', [{ label: 'Play with it', value: 'play' }, { label: 'Just be with it', value: 'stay' }], { ask: true, transient: true, timeoutMs: 5000 }).then((x) => { v = x; });
    const line = subs.say('Everything’s crackling in here.', { kind: 'dialogue' });
    await sleep(10);
    // the world pausing under it (flowSubtitles.pause), and clearing
    subs.clear({ keepHeld: true, keep: (o) => !!o.ask });
    subs.clear({ keep: (o) => !!o.ask });
    assert.equal(await line, false, 'the world\'s passing line goes');
    await sleep(10);
    assert.equal(v, 'pending', 'the question is still waiting');
    assert.equal(dom.chips().length, 2, 'its chips still there');
    assert.ok(!dom.chipsRow().hidden);
    dom.chips()[0].click();
    await sleep(500);
    assert.equal(v, 'play');
    // without keep (as before): a transient choice goes
    let w = 'pending';
    subs.choice('Q', [{ label: 'A', value: 'a' }], { transient: true }).then((x) => { w = x; });
    await sleep(10);
    subs.clear({ keepHeld: true });
    await sleep(10);
    assert.equal(w, null);
    subs.destroy();
  } finally { dom.restore(); }
});

test('(b) "Play with it" is the person\'s from the tap: a Tell opened within the line\'s fade never drops it', async () => {
  const ask = between(hf, 'async function askPlay(words = null) {', 'function focusTell() {');
  assert.match(ask, /\{ label: PLAY_CHECK\.play, value: 'play', onPick: pick\('play'\) \}, \{ label: PLAY_CHECK\.stay, value: 'stay', onPick: pick\('stay'\) \}/);
  assert.match(ask, /return picked \|\| v;/);
  // what the subtitles hand back when a Tell opens inside the fade (suspend: the transient choice resolves null)…
  const dom = installDom();
  try {
    const subs = createSubtitles({ root: dom.doc.body, prefs });
    let picked = null;
    const p = subs.choice('Q', [{ label: 'Play with it', value: 'play', onPick: () => { picked = 'play'; } }, { label: 'Just be with it', value: 'stay' }], { transient: true, ask: true });
    await sleep(10);
    dom.chips()[0].click();
    await sleep(120);   // (inside the 420 ms fade)
    subs.suspend();     // the Tell opens
    const v = await p;
    assert.equal(v, null, 'the subtitles alone would read it as no answer');
    // …and what the scene makes of it: the tap's own answer wins
    assert.equal(askOutcome(picked || v, { telling: true }), 'play');
    assert.equal(askOutcome(null, { telling: true }), 'retold', 'no tap: a Tell opened over the question is a new one');
    subs.destroy();
  } finally { dom.restore(); }
});

test('(c) "Play with it" ends a quiet visit: faces, squeeze lines and the goodbye are as they always were (never after something heavy)', () => {
  const es = between(hf, 'function endSoft() {', 'function noteSafety(');
  assert.match(es, /S\.soft = false;\s*app\.state\.hfSoft = false;/);
  assert.match(es, /if \(!gentle\(\)\) stageMallow\?\.setStage\?\.\('neutral', \{ quiet: true \}\);/);
  assert.doesNotMatch(es, /S\.level|supportPill|setStageFloor/);
  const after = between(hf, 'async function afterTell(', 'async function askPlay(');
  assert.match(after, /holdForAsk\(false, \{ play: true \}\);\s*endSoft\(\);/);
  // softNow() is gentle() || S.soft: with S.soft cleared, an ordinary visit is ordinary again
  assert.match(hf, /const softNow = \(\) => gentle\(\) \|\| !!S\.soft;/);
});

test('(d) no plan: Play → plans → Back → "Tell me again" → Send unchanged keeps the choice (never asked the same words twice)', () => {
  // the words offered back carry the choice made before the plans page…
  assert.match(between(hf, 'function offerRetell(p) {', 'later(async () => {'), /retell = \{ text: p\.input\.text, emotion: p\.emotion \|\| null, intention: p\.intention \|\| null, chosen: p\.chosen \|\| null \};/);
  // …sent unchanged (case, punctuation, spacing aside) it is still chosen: tellRoute 'play' (the plans page again, or the world)
  assert.match(hf, /onSubmit: \(r\) => afterTell\(again\?\.chosen === 'play' && sameWords\(r\?\.text, again\.text\) \? \{ \.\.\.r, chosen: 'play' \} : r\),/);
  assert.equal(tellRoute({ level: 'none', chosen: 'play' }), 'play');
  assert.equal(tellRoute({ level: 'concern', chosen: 'play' }), 'support', 'a choice never outranks safety');
  // the free tier's pendingTell always says chosen: 'play' after "Play with it" (unchanged)
  assert.match(hf, /app\.state\.pendingTell = \{ input, emotion, intention, chosen: 'play', at: Date\.now\(\) \};/);
});

test('sameWords: the same words as the person sees them; changed words are new words', () => {
  assert.ok(sameWords('I keep replaying the meeting where I froze', 'i keep replaying the meeting where i froze!!'));
  assert.ok(sameWords('  I’m so   angry, my boss… ', "I'm so angry my boss"), 'curly or straight apostrophes, spaces and ellipses aside');
  assert.ok(sameWords('Ça va', 'ça va.'));
  assert.ok(!sameWords('I keep replaying the meeting', 'I keep replaying the meeting where I froze'));
  assert.ok(!sameWords('my nan', 'my dad'));
  assert.ok(!sameWords('', ''), 'no words are never "the same words"');
  assert.ok(!sameWords(null, undefined));
  assert.ok(!sameWords('...', '!!!'));
});

// ===================================================================================================== 4. layout --
test('asking over a world folds its postcards away (and the thought when even then there is no room), and gives them back', () => {
  const fw = between(hf, 'function foldWorld(on) {', 'function askOverThought() {');
  assert.match(fw, /const v = !!on && worldMode && !S\.finishing && !S\.left;/);
  assert.match(fw, /document\.body\.classList\.toggle\('hf-ask-fold', v\)/);
  assert.match(fw, /if \(!v\) foldThought\(false\);/);
  assert.match(fw, /if \(!thoughtFolded && askOverThought\(\)\) foldThought\(true\);/);
  // the lines keep clear only of what can be seen
  assert.match(hf, /\.\.\.\(thoughtFolded \? \[\] : \[\.\.\.\(stage\?\.thoughts\.rects\(\) \|\| \[\]\), thoughtRestRect\(\)\]\),/);
  assert.match(hf, /\.\.\.\(flowRef\?\.avoid\?\.\(\) \|\| \[\]\)\.filter\(\(r\) => !folded \|\| \(r\?\.kind === 'thought' && !thoughtFolded\)\)/);
  // folded while the question is up, and for the soft chip in a world held for "Just be with it" (no flicker between them)
  const ask = between(hf, 'async function askPlay(words = null) {', 'function focusTell() {');
  assert.ok(ask.indexOf('holdForAsk(true);') < ask.indexOf('foldWorld(true);'));
  assert.match(ask, /if \(picked !== 'stay'\) foldWorld\(false\);/);
  const sc = between(hf, 'async function softChoice(', 'function quietAfterAsk() {');
  assert.match(sc, /if \(S\.softHold\) foldWorld\(true\);/);
  assert.match(sc, /foldWorld\(false\); playCalm\(/);
  // a world that ends takes the fold with it; leaving the scene too
  assert.match(between(hf, 'function endWorldMode() {', 'function onMeltBegins('), /if \(folded\) \{ folded = false; document\.body\.classList\.remove\('hf-ask-fold'\); \}\s*foldThought\(false\);/);
  assert.match(hf, /'hf-world-held', 'hf-ask-fold', 'hf-ask-fold-thought'\);/);
  assert.match(css, /body\.hf-ask-fold #fx-layer > canvas\.hf-front \{ opacity: 0 !important;/);
  assert.match(css, /body\.hf-ask-fold-thought #fx-layer > canvas\.hf-stage, body\.hf-ask-fold-thought \.hushfold \.tm-tag \{ opacity: 0 !important; pointer-events: none !important;/);
});

test('the Mallow\'s accessible label while it asks (the attentive face): attentive, never "looks sad and loved"', () => {
  assert.equal(STAGES.concerned.describe, 'is listening, attentive');
  for (const id of Object.keys(MALLOWS)) {
    const m = MALLOWS[id];
    const d = describeExpression(m, STAGES.concerned.mix, STAGES.concerned.intensity, 'concerned');
    assert.equal(d, `${m.name} is listening, attentive`);
    assert.doesNotMatch(d, /sad|loved|anxious/);
  }
  // other faces are described from their mix, as before
  assert.match(describeExpression(MALLOWS.boppo, { happy: 1 }, 0.6, null), /^Boppo looks happy$/);
  assert.match(describeExpression(MALLOWS.boppo, { neutral: 1 }, 0, 'neutral'), /^Boppo looks peaceful$/);
  assert.match(read('src/mallows/rig.js'), /describe\(\) \{ return describeExpression\(this\.mallow, this\.mix, this\.intensity, this\.stage\); \}/);
});

test('hotTint: the deepening over a warm sun keeps the colour of the sky round it (no grey or olive disc), only as deep as needed', () => {
  const D = [9, 6, 28];
  const mix = (p, c, k) => p.map((v, i) => v + (c[i] - v) * k);
  const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0; const d = mx - mn;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
  const cases = [
    { core: [255, 250, 225], sky: [240, 150, 130], a: 0.68, name: 'Boppo\'s sun on a salmon sky (320, review r2)' },
    { core: [255, 250, 225], sky: [110, 175, 230], a: 0.78, name: 'the daytime sun on a blue sky' },
    { core: [245, 240, 255], sky: [92, 70, 160], a: 0.6, name: 'Noomi\'s moon on a violet night' },
    { core: [255, 236, 180], sky: [200, 170, 120], a: 0.84, name: 'a low sun on a warm orchard' },
  ];
  for (const { core, sky, a, name } of cases) {
    const t = hotTint(core, sky, a);
    assert.ok(t && t.a > 0 && t.a <= 0.8, `${name}: ${JSON.stringify(t)}`);
    assert.ok(t.rgb.every((v) => Number.isInteger(v) && v >= 0 && v <= 255), name);
    const under = mix(sky, D, a);                       // the sky round it, under the scrim alone
    const got = mix(mix(core, D, a), t.rgb, t.a);       // the spot's core, under both layers
    const want = under.map((v) => v * 0.86);
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(got[i] - want[i]) <= 3, `${name}: channel ${i} ${got[i].toFixed(1)} vs ${want[i].toFixed(1)}`);
    // the same hue as the sky round it (the old navy-only deepening left a warm sun a grey of another hue)…
    const dh = Math.abs(hue(got) - hue(under)); assert.ok(Math.min(dh, 360 - dh) <= 12, `${name}: hue ${hue(got).toFixed(0)} vs ${hue(under).toFixed(0)}`);
    // …a touch darker than it, never a dark blot
    assert.ok(luminance(...got) <= luminance(...under) && luminance(...got) >= luminance(...under) * 0.55, `${name}: luminance`);
  }
  // the review's case: hotAlpha (navy only) left the sun's core far from the sky's hue — the murky disc
  { const { core, sky, a } = cases[0]; const k = hotAlpha(core, sky, a); const old = mix(mix(core, D, a), D, k), under = mix(sky, D, a);
    const dh = Math.abs(hue(old) - hue(under)); assert.ok(Math.min(dh, 360 - dh) > 20, 'the old deepening changed the hue'); }
  // nothing brighter than the sky: nothing added; the cap holds; bad input adds nothing
  assert.equal(hotTint([90, 70, 150], [92, 70, 160], 0.6), null);
  assert.ok(hotTint([255, 255, 255], [10, 8, 30], 0.5, { max: 0.5 }).a <= 0.5);
  assert.equal(hotTint(null, [1, 1, 1], 0.5), null);
  assert.equal(hotTint([255, 255, 255], [1, 1, 1], 1), null);
  // wired: the scrim sets the deepening's colour with its alpha, and the CSS layer draws in it
  const ss = between(subsSrc, 'function sampleScrim(node) {', 'function lineNode(line) {');
  assert.match(ss, /const tint = hs \? hotTint\(hs\.core, hs\.sky, a, \{ max: hs\.a \}\) : null;/);
  assert.match(ss, /node\.style\.setProperty\('--hf-hot-rgb', tint\.rgb\.join\(', '\)\);/);
  assert.match(css, /rgba\(var\(--hf-hot-rgb, 9, 6, 28\), var\(--hf-hot-a, 0\)\) 0,/);
});

// ========================================================================================= 5. the coordinator's defaults --
test('equal weight: the two answers share one chip style, "Play with it" first in reading order (nothing nudges towards play)', () => {
  const ask = between(hf, 'async function askPlay(words = null) {', 'function focusTell() {');
  const opts = ask.slice(ask.indexOf('subtitles.choice(PLAY_CHECK.ask'), ask.indexOf('return picked || v;'));
  assert.doesNotMatch(opts, /primary|soft: true/);
  assert.ok(opts.indexOf('PLAY_CHECK.play') < opts.indexOf('PLAY_CHECK.stay'));
});

test('after "Just be with it": one gentle line and one optional soft chip, "Somewhere calm", fading after ~12 s — never a second question', () => {
  assert.equal(PLAY_CHECK.be, 'Okay. Let’s just be with it for a while.');
  assert.doesNotMatch(PLAY_CHECK.be, /\?/);
  assert.equal(PLAY_CHECK.calm, 'Somewhere calm');
  assert.ok(PLAY_CHECK.calmMs >= 10000 && PLAY_CHECK.calmMs <= 15000);
  const be = between(hf, 'async function beWithIt(', 'async function softChoice(');
  assert.doesNotMatch(be, /careChoice|subtitles\.choice|say\(/, 'no second choice, nothing else said');
  const sc = between(hf, 'async function softChoice(', 'function quietAfterAsk() {');
  // one item: the line is the chip's prompt (again: the chip alone, after a Tell opened and closed over it)
  assert.match(sc, /subtitles\.choice\(again \? null : PLAY_CHECK\.be, \[\{ label: PLAY_CHECK\.calm, value: 'calm', soft: true \}\],/);
  assert.equal((sc.match(/subtitles\.choice\(/g) || []).length, 1);
  assert.match(sc, /timeoutMs: PLAY_CHECK\.calmMs, transient: true, soft: true/);
  assert.doesNotMatch(sc, /focus: true/, 'the optional chip never takes the focus');
  // at home: let go, nothing more (staying is the default); in a world held for it: it ends quietly; tapped: the calm world
  assert.match(sc, /if \(S\.hold === 'quiet' && S\.softHold && worldMode\) endQuietWorld\(\);\s*else foldWorld\(false\);/);
  assert.match(sc, /if \(v === 'calm' && gw && !S\.crisis\) \{ foldWorld\(false\); playCalm\(\{ emotion, intention, worldId: gw\.worldId, safety: null, soft: true \}\); return; \}/);
  // anything newer decides instead (a Tell sent meanwhile, its question, a Tell open over it)
  assert.match(sc, /const gen = S\.tellGen;/);
  assert.match(sc, /if \(S\.left \|\| gen !== S\.tellGen\) return;/);
  assert.match(sc, /if \(v == null && \(overlay \|\| S\.asking\)\) return;/);
  assert.match(between(hf, 'async function afterTell(', 'const carried ='), /S\.tellGen\+\+;/);
  // the calm world it opens: a calm one only, a gentle session with no words (plan or no plan)
  assert.match(sc, /const gw = await gentleWorld\(\{ calmOnly: true \}\);/);
  const pc = between(hf, 'function playCalm(', 'function calmTheWorld(');
  assert.match(pc, /startFlow\(\{ emotion: emotion \|\| S\.emotion, intention: calm, input: null, safety, worldId, soft \}\);/);
  assert.match(pc, /S\.holdOnWorld = null; S\.softArrive = false;/);
  // the soft chip's style: quieter than a choice, still 46 px; let go, it fades (with reduced motion too)
  assert.match(css, /\.hf-chip\.soft \{ background: rgba\(18, 13, 44, 0\.46\);/);
  assert.match(css, /\.hf-chips\.out \{ animation: hfFadeOut 420ms/);
  assert.match(css, /\.hf-sub\.out, \.hf-chips\.out, \.hf-input\.out \{ animation-name: hfFadeOut !important; \}/);
});
