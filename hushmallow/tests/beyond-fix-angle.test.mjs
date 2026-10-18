// Another Angle, the fix round (Phase C usability, a11y, privacy, regressions and the blind H1 evaluation):
//   1. the safety floor: the question's third answer of equal weight, "I’m not okay" (exactly the check-in's "Not really"),
//      and the Support pill while any question is up
//   2. the lexicon's concern that is not a loss (distress, wanting to hurt someone) asks the check-in, never the plain question
//   3. the server's own crisis or care (the model's safety check) is support, never Zuzu's own angle; its care lines fit
//   4. focus and announcements (Send on care, crisis and gentle; the question let go; "Not really"; the consent card)
//   5. the Memory Garden offer left alone counts as "Not now": the end choices follow, never a folded chip with no way on
//   6. after the check-in's "I’m okay", Zuzu stays attentive for the rest of the visit
//   7. the offline note comes before the mechanic's instruction
//   8. "Delete my Another Angle data" removes the older Another Angle's sealed predictions (they hold typed words)
// tests/probes/r10-replay.mjs mirrors the routing (the detection gate and the evaluators read Another Angle through it).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { visit, STUBS } from './probes/r10-replay.mjs';
import { ANGLE_CHOICE, CHECK_IN, SAFETY, ARRIVAL } from '../src/beyond/lines.js';
import { deleteAngleData, hasAngleData, ANGLE_EXTRA_KEYS, STORE_KEYS } from '../src/beyond/consent.js';
import { createAngleClient } from '../src/beyond/angle-client.js';
import { checkText } from '../src/engine/safety.js';
import { createStore } from '../src/engine/storage.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const AA = read('src/beyond/another-angle.js');
const EVERY = [null, ...Object.values(STUBS).filter((s) => typeof s === 'function')];
const counting = (s) => { const box = { n: 0 }; box.server = s ? (x, o) => { box.n++; return s(x, o); } : null; return box; };

const ORDINARY = ['My boss embarrassed me in front of everyone.', 'I failed my maths test', 'He hasn’t replied to my message for five hours.'];
// the lexicon's concern, no loss, nothing the risk screener reads (before: the plain question with only the Support pill)
const CONCERN = ['I can’t cope with anything anymore', 'I feel completely hopeless', 'I feel worthless', 'i hate myself', 'I want to hurt him so badly'];

// ------------------------------------------------------------------------------------------ 1. the safety floor --
test('1: the question has a third answer of equal weight, "I’m not okay": support first, nothing sent, no angle for the visit', () => {
  assert.equal(ANGLE_CHOICE.notOkay, 'I’m not okay');
  assert.ok(ANGLE_CHOICE.notOkay.length <= 64);
  const q = between(AA, 'const FIRST_QUESTION = {', 'async function askFirst(');
  assert.match(q, /choice: \{ ask: ANGLE_CHOICE\.ask, ms: ANGLE_CHOICE\.ms, options: \[\{ label: ANGLE_CHOICE\.angle, value: 'angle' \}, \{ label: ANGLE_CHOICE\.be, value: 'be' \}, \{ label: ANGLE_CHOICE\.notOkay, value: 'notreally' \}\] \}/);
  assert.doesNotMatch(between(q, 'choice:', "'check-in':"), /primary/, 'equal weight');
  const start = between(AA, 'async function startAngle(', 'const FIRST_QUESTION = {');
  const choice = start.slice(start.indexOf("} else if (step === 'choice' || step === 'check-in') {"));
  assert.ok(choice.indexOf("if (v === 'notreally') return careLite();") > 0 && choice.indexOf("if (v === 'notreally') return careLite();") < choice.indexOf('client.angle('), 'before any request');
  // careLite: exactly the check-in's "Not really" (no client call, support first, S.notReally for the visit)
  const lite = between(AA, 'async function careLite(', '/** The words → a Thought Mallow');
  assert.match(lite, /S\.notReally = true; S\.keepSupport = true; S\.noPlay = true;/);
  assert.doesNotMatch(lite, /client\s*(?:\.|\?\.)|spawnThought|playScene/);
  assert.ok(start.indexOf('if (S.notReally) return careLite();') < start.indexOf('client.angle('));
  // the replay: every server, ordinary words, "I’m not okay" → care-lite, nothing sent
  for (const t of ORDINARY) for (const s of EVERY) {
    const c = counting(s);
    const R = visit(t, { server: c.server, walk: 1, answer: 'notreally' });
    assert.deepEqual([R.question, R.route, R.requests, c.n, R.requestsBeforeAnswer], ['choice', 'carelite', 0, 0, 0], t);
    assert.deepEqual(R.careLines, [CHECK_IN.heard]);
  }
});

test('1: the Support pill is in the dock while any question is up, whatever the words read as', () => {
  const dock = between(AA, 'function dockShow(', '// ---------------------------------------------------------- focus --');
  assert.match(dock, /supportPill\.hidden = !\(S\.keepSupport \|\| S\.care \|\| S\.crisis\) \|\| !support;\s*if \(asking && support\) supportPill\.hidden = false;/);
  const ask = between(AA, 'async function askFirst(kind) {', 'let stopClock = null;');
  assert.match(ask, /dockShow\(\{ asking: true \}\);/);
  assert.doesNotMatch(ask, /dockShow\(\{\}\)/);
});

// --------------------------------------------------------------------------------------- 2. concern → check-in --
test('2: the lexicon’s concern (not a loss) asks the check-in, never the plain question; nothing sent before the answer', () => {
  for (const t of CONCERN) {
    const lx = checkText(t);
    assert.equal(lx.level, 'concern', t);
    assert.notEqual(lx.category, 'loss', t);
    for (const s of EVERY) {
      const c = counting(s);
      const R = visit(t, { server: c.server, walk: 1, answer: null });
      assert.deepEqual([R.asked, R.question, R.route, R.requestsBeforeAnswer, c.n], [true, 'check', 'quiet', 0, 0], `${t}`);
      assert.ok(R.said.includes(CHECK_IN.ask), t);
    }
    // "Not really": care-lite, nothing sent; "I’m okay": the angle (the server reads them again); "Just be with it": its path
    const c = counting(STUBS.pull);
    assert.deepEqual([visit(t, { server: c.server, walk: 1, answer: 'notreally' }).route, c.n], ['carelite', 0], t);
    const ok = visit(t, { server: STUBS.pull, walk: 1, answer: 'angle' });
    assert.deepEqual([ok.route, ok.requests], ['play', 1], t);
    assert.deepEqual([visit(t, { server: STUBS.pull, walk: 1, answer: 'be' }).route], ['be'], t);
  }
  // ordinary words still get the plain question; a loss still goes to the gentle path first, with no question
  for (const t of ORDINARY) assert.equal(visit(t, { server: STUBS.pull, walk: 1, answer: null }).question, 'choice', t);
  for (const t of ['my grandpa died last week', 'our cat was put down yesterday']) {
    const R = visit(t, { server: STUBS.pull, walk: 1, answer: null });
    assert.deepEqual([R.route, R.asked, R.requests], ['gentle', false, 0], t);
  }
  // the scene: these words' own concern sets the check-in (S.check) before startAngle reads it
  const after = between(AA, 'async function afterTell(', 'function firstLook(');
  assert.match(after, /if \(\[seen, checkText\(S\.text\), lexN\]\.some\(distressOf\)\) \{ S\.check = true; S\.keepSupport = true; \}/);
  assert.ok(after.indexOf('distressOf') < after.indexOf('startAngle('));
  assert.match(AA, /const distressOf = \(r\) => r\?\.level === 'concern' && r\.category !== 'loss';/);
});

// ------------------------------------------------------------------------------- 3. the server's own safety --
const flagged = {
  crisis: () => ({ status: 'crisis', scene: null, support: { level: 'crisis', category: 'self-harm', source: 'model' }, keep_support_close: true }),
  careModel: () => ({ status: 'care', scene: null, support: { level: 'care', category: 'general', source: 'model' }, keep_support_close: true }),
  careScreen: () => ({ status: 'care', scene: null, support: { level: 'care', category: 'self-risk', source: 'screen' }, keep_support_close: true }),
  careAbuse: () => ({ status: 'care', scene: null, support: { level: 'care', category: 'abuse', source: 'lexicon' }, keep_support_close: true }),
  // a scene the model marked crisis / care that would fail validateScene (an unknown pattern): still support
  invalidCrisis: (t) => ({ status: 'ok', scene: { ...STUBS.pull(t).scene, reasoning_pattern: 'nope', safety_status: 'crisis' } }),
  invalidCare: (t) => ({ status: 'ok', scene: { ...STUBS.pull(t).scene, reasoning_pattern: 'nope', safety_status: 'care' } }),
};
test('3: the server’s crisis or care for words the app reads as ordinary is support, never Zuzu’s own angle', () => {
  for (const t of ORDINARY) {
    for (const [name, s] of Object.entries(flagged)) {
      const R = visit(t, { server: s, walk: 1, answer: 'angle' });
      const want = /crisis/i.test(name) ? 'crisis' : 'care';
      assert.equal(R.route, want, `${name}: ${t}`);
      assert.deepEqual([R.mechanics.length, R.scenes.length, R.requests], [0, 0, 1], `${name}: nothing played (${t})`);
    }
    // the care lines fit who caught it: the model's own check or the risk screener → the follow lines; the lexicon's → its own
    assert.deepEqual(visit(t, { server: flagged.careModel, walk: 1, answer: 'angle' }).careLines, SAFETY.follow, t);
    assert.deepEqual(visit(t, { server: flagged.careScreen, walk: 1, answer: 'angle' }).careLines, SAFETY.follow, t);
    assert.deepEqual(visit(t, { server: flagged.invalidCare, walk: 1, answer: 'angle' }).careLines, SAFETY.follow, t);
    assert.deepEqual(visit(t, { server: flagged.careAbuse, walk: 1, answer: 'angle' }).careLines, SAFETY.care, t);
    assert.deepEqual(visit(t, { server: STUBS.care, walk: 1, answer: 'angle' }).careLines, SAFETY.care, 'no category: as before');
  }
  // the scene: support before the authored engine, and its category picks the care lines
  const start = between(AA, 'async function startAngle(', 'const FIRST_QUESTION = {');
  for (const s of ["if (res.status === 'crisis') { crisisMode(); return; }", "if (res.status === 'care') { careMode({ lines: serverCareLines() }); return; }"]) {
    assert.ok(start.indexOf(s) > start.indexOf('const res = await req;') && start.indexOf(s) < start.indexOf('authoredScene('), s);
  }
  assert.match(start, /if \(res\.status === 'care'\) S\.careOf = res\.category \|\| null;/);
  assert.match(between(AA, 'function serverCareLines() {', 'function screen('), /if \(S\.careOf === 'general' \|\| S\.careOf === 'self-risk'\) return SAFETY\.follow;/);
  // the wait for a perspective stays long enough for the model's own check (a model-caught crisis took up to 11 s)
  assert.match(AA, /const ANGLE_BUDGET_MS = 18000;/);
});

test('3: the client honours the model’s own crisis or care before validating the scene, and passes the category on', async () => {
  const HEALTH = { ok: true, service: 'another-angle', prompt_version: 'angle-v5', schema_version: 'scene-v1', provider: 'anthropic', configured: { signing_key: true, provider_key: true } };
  const run = async (angle) => {
    const fetchImpl = async (url) => {
      const res = (status, data) => ({ status, json: async () => data });
      if (url.endsWith('/v1/health')) return res(200, HEALTH);
      if (url.endsWith('/v1/session')) return res(200, { status: 'ok', token: 'tok', expires_at: new Date(Date.now() + 3600e3).toISOString() });
      return res(200, angle);
    };
    return createAngleClient({ store: createStore({ backend: 'memory' }), endpoint: 'https://angle.example.workers.dev', fetchImpl }).angle({ text: 'My boss embarrassed me.' });
  };
  const t = 'My boss embarrassed me.';
  assert.deepEqual(await run(flagged.crisis()), { status: 'crisis', keepSupportClose: true, category: 'self-harm' });
  assert.deepEqual(await run(flagged.careModel()), { status: 'care', keepSupportClose: true, category: 'general' });
  assert.deepEqual(await run(flagged.invalidCare(t)), { status: 'care', keepSupportClose: true, category: 'general' });
  assert.deepEqual(await run(flagged.invalidCrisis(t)), { status: 'crisis', keepSupportClose: true, category: 'general' });
  // a category that is not a plain id is dropped (never shown, never words)
  assert.equal((await run({ status: 'care', support: { category: 'Some <b>words</b>' } })).category, null);
  // an invalid scene that is not flagged is still an error (the authored engine, after the app's own check)
  assert.equal((await run({ status: 'ok', scene: { ...STUBS.pull(t).scene, reasoning_pattern: 'nope' } })).status, 'error');
});

// --------------------------------------------------------------------------------------- 4. focus and announcing --
test('4: the focus goes to support after Send on care, crisis and gentle, never to the page', () => {
  const care = between(AA, 'async function careMode(', 'function gentleNote(');
  assert.match(care, /dockShow\(\{ finish: true \}\);\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*if \(!sheets\.length\) focusIfLost\(supportPill\);/);
  assert.ok(care.indexOf('focusChipsWhenShown(SAFETY.careOptions[0].label);') < care.indexOf('const v = await choose(SAFETY.careAsk, SAFETY.careOptions);'));
  const crisis = between(AA, 'function crisisMode(', 'async function careMode(');
  assert.match(crisis, /if \(!sheets\.length\) focusIfLost\(supportPill\);/);
  const grief = between(AA, 'async function griefMode(', 'const heavySeen = ');
  assert.match(grief, /if \(!sheets\.length\) focusIfLost\(supportPill\);/);
  assert.ok(grief.indexOf('focusChipsWhenShown(GRIEF.options[0].label);') < grief.indexOf('const v = await choose(GRIEF.ask, GRIEF.options'));
  // a sheet closed over a control that has gone: the stage's next control (after crisis words, Support first)
  assert.match(between(AA, 'function trackSheet(sheet) {', '/** The support sheet'), /if \(!S\.left\) later\(afterSheet, 560\);/);
  assert.match(between(AA, 'function afterSheet() {', 'function focusChipsWhenShown('), /if \(S\.crisis && \(onLine \|\| focusLost\(\)\)\) focusIfLost\(supportPill, \{ always: true \}\);/);
  // the subtitles never take the focus out of an open sheet
  assert.match(AA, /document\.addEventListener\('focusin', onFocusIn, true\);/);
  assert.match(AA, /document\.removeEventListener\('focusin', onFocusIn, true\);/);
  // focus is lost on the page, the hidden heading, a hidden control, or the closing overlay; never out of a text field
  const lost = between(AA, 'function focusLost() {', 'const inTextField');
  assert.match(lost, /a === document\.body/);
  assert.match(lost, /a === heading/);
  assert.match(lost, /!overlay && a\.closest\?\.\('\.hf-input'\)/);
  assert.match(between(AA, 'function focusIfLost(', '/** The control that comes next'), /if \(S\.left \|\| overlay \|\| consentCard \|\| inTextField\(\)\) return false;/);
});

test('4: the question let go (Back, its clock) puts the focus on Tell; "Not really" is heard with its chips, focused, never timed out', () => {
  assert.match(AA, /questionClock\(q\.ms, \(\) => \{ if \(seq === S\.seq\) \{ tellFirst\(\); subs\?\.drop\(\(o\) => o\.lossCheck\); \} \}, \{ held: \(\) => sheets\.length > 0 \}\)/);
  assert.match(AA, /if \(layer\.lossCheck && \(!token \|\| token === layer\.lossCheck\)\) \{ layer\.lossCheck = 0; tellFirst\(\); subs\?\.drop\(\(o\) => o\.lossCheck\); \}/);
  const first = between(AA, 'function tellFirst() {', 'function quietAfterAsk() {');
  assert.match(first, /dockShow\(\{ tell: true, asking: true \}\);\s*focusIfLost\(tellPill, \{ always: inChips \}\);/);
  assert.match(between(AA, 'function quietAfterAsk() {', 'async function waitingLines('), /focusIfLost\(tellPill\);/);
  const lite = between(AA, 'async function careLite(', '/** The words → a Thought Mallow');
  assert.match(lite, /const v = await choose\(CHECK_IN\.heard, CHECK_IN\.options, \{ mallow: 'zuzu', interrupt: true, focus: true \}\);/);
  assert.doesNotMatch(lite, /timeoutMs|transient/, 'never timed out, never let go by a Tell');
  assert.equal(CHECK_IN.options[0].label, 'See support');
  // after the consent card: the heading, then the invitation's first answer
  assert.match(between(AA, 'function askConsent() {', 'async function invite() {'), /S\.afterConsent = true;\s*try \{ heading\.focus\(\{ preventScroll: true \}\); \}/);
  assert.match(between(AA, 'async function invite() {', 'function shareAgainNow()'), /if \(S\.afterConsent\) \{ S\.afterConsent = false; focusChipsWhenShown\(ARRIVAL\.tell\); \}/);
  assert.match(AA, /const heading = h\('h1', \{ class: 'sr-only', tabindex: '-1' \}/);
});

test('4: the consent card: "More below" is named by its words, 44 px tall, controls a named region, and hands the focus on as it goes', () => {
  const src = read('src/beyond/consent.js');
  const card = between(src, 'export function openConsent(', 'export function openConsentSheet(');
  assert.match(card, /const scroll = h\('div', \{ class: 'bx-scroll', id: `\$\{uid\}-d`, tabindex: '0', role: 'region', 'aria-label': 'The notice' \}/);
  assert.match(card, /const more = h\('button', \{ type: 'button', class: 'bx-more', 'aria-controls': `\$\{uid\}-d`, style: \{ minHeight: '44px' \},/);
  assert.doesNotMatch(card, /Show more of the notice/, 'no name that hides its visible words (WCAG 2.5.3)');
  assert.match(card, /'More below', h\('span', \{ class: 'bx-more-arrow', 'aria-hidden': 'true' \}, '↓'\)/);
  assert.match(card, /if \(\(hide \|\| \(needed && !show\)\) && document\.activeElement === more\) scroll\.focus\(\{ preventScroll: true \}\);\s*if \(more\.hidden !== hide\) more\.hidden = hide;\s*more\.classList\.toggle\('bx-end', needed && !show\);/);
});

// --------------------------------------------------------------------------------------------- 5. the dead end --
test('5: the Memory Garden offer left alone is "Not now" in Another Angle: the end choices follow', () => {
  const keep = between(AA, 'async function keep() {', 'async function endChoice(');
  assert.match(keep, /foldAsNotNow: true,/);
  const fb = between(AA, 'async function feedback(', 'async function anotherAngle(');
  assert.match(fb, /await keep\(\);\s*return endChoice\(seq\);/);
  const gi = read('src/hushfold/garden-install.js');
  assert.match(gi, /export function offerSave\(\{[^)]*foldAsNotNow = false \} = \{\}\) \{/);
  assert.match(between(gi, '    function fold(force = false', '    armFold();'), /if \(foldAsNotNow\) \{ Promise\.resolve\(\)\.then\(\(\) => close\(false\)\); return; \}/);
  assert.match(gi, /const yes = await offerSave\(\{ skillId, mallow, app, reducedMotion, signal, origin, face, avoid, foldAsNotNow \}\);/);
});

// Just enough DOM for offerSave to run in Node: a copy of tests/garden.test.mjs installInstallDom (kept here, so this round's
// files stay apart), with its `until`.
function installInstallDom({ W = 390, H = 844 } = {}) {
  const KEYS = ['document', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'innerWidth', 'innerHeight', 'devicePixelRatio', 'matchMedia', 'Path2D'];
  const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const noop = () => {};
  const ctx2d = (canvas) => new Proxy({
    canvas, createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createPattern: () => ({}),
    measureText: (s) => ({ width: String(s).length * 8 }), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), getTransform: () => ({ a: 1, e: 0, f: 0 }),
  }, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  let doc = null;
  class El extends EventTarget {
    constructor(tag) {
      super();
      this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null; this.hidden = false; this.id = '';
      this.attrs = new Map(); this.dataset = {}; this._text = ''; this.width = 0; this.height = 0; this.rect = null;
      const cls = new Set(); this._cls = cls;
      this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c),
        toggle: (c, on) => { const v = on === undefined ? !cls.has(c) : !!on; if (v) cls.add(c); else cls.delete(c); return v; } };
      this.style = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
    }
    get className() { return [...this._cls].join(' '); }
    set className(v) { this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this._cls.add(c)); }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children.forEach((c) => { c.parentNode = null; }); this.children = []; this._text = String(v ?? ''); }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.documentElement; }
    get firstChild() { return this.children[0] || null; }
    get offsetWidth() { return this.rect?.width ?? 300; }
    get offsetHeight() { return this.rect?.height ?? 120; }
    get clientWidth() { return this.offsetWidth; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); if (k === 'id') this.id = String(v); }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    removeAttribute(k) { this.attrs.delete(k); }
    append(...nodes) {
      for (const n of nodes) {
        if (n == null) continue;
        const c = typeof n === 'object' ? n : Object.assign(new El('#text'), { _text: String(n) });
        c.remove(); c.parentNode = this; this.children.push(c);
      }
    }
    appendChild(n) { this.append(n); return n; }
    prepend(...nodes) { const old = this.children; this.children = []; this.append(...nodes); this.children.push(...old); }
    replaceChildren(...nodes) { this.textContent = ''; this.append(...nodes); }
    remove() { const p = this.parentNode; if (p) { p.children = p.children.filter((c) => c !== this); this.parentNode = null; } }
    contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
    getBoundingClientRect() {
      const left = this.rect?.left ?? (parseFloat(this.style.left) || 0), top = this.rect?.top ?? (parseFloat(this.style.top) || 0);
      const width = this.offsetWidth, height = this.offsetHeight;
      return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
    }
    getClientRects() { return [this.getBoundingClientRect()]; }
    getContext() { return (this._ctx ||= ctx2d(this)); }
    focus() { doc.activeElement = this; }
    blur() { if (doc.activeElement === this) doc.activeElement = null; }
    click() { this.dispatchEvent(new Event('click')); }
    *all() { for (const c of this.children) { yield c; yield* c.all(); } }
    querySelectorAll(sel) {
      const out = new Set();
      for (const part of String(sel).split(',').map((s) => s.trim())) {
        let m;
        if ((m = /^\.([\w-]+)$/.exec(part))) { for (const e of this.all()) if (e._cls.has(m[1])) out.add(e); }
        else if ((m = /^\.([\w-]+)\s*>\s*\*$/.exec(part))) { for (const e of this.all()) if (e._cls.has(m[1])) e.children.forEach((c) => out.add(c)); }
        else if ((m = /^#([\w-]+)$/.exec(part))) { for (const e of this.all()) if (e.id === m[1]) out.add(e); }
      }
      return [...out];
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  }
  const win = new EventTarget();
  doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null });
  doc.documentElement = new El('html'); doc.head = new El('head'); doc.body = new El('body');
  doc.documentElement.append(doc.head, doc.body);
  doc.createElement = (t) => new El(t);
  doc.createElementNS = (_ns, t) => new El(t);
  doc.createTextNode = (s) => Object.assign(new El('#text'), { _text: String(s) });
  doc.getElementById = (id) => doc.documentElement.querySelector(`#${id}`);
  doc.querySelector = (s) => doc.documentElement.querySelector(s);
  doc.querySelectorAll = (s) => doc.documentElement.querySelectorAll(s);
  Object.assign(globalThis, {
    document: doc, innerWidth: W, innerHeight: H, devicePixelRatio: 1,
    addEventListener: win.addEventListener.bind(win), removeEventListener: win.removeEventListener.bind(win), dispatchEvent: win.dispatchEvent.bind(win),
    requestAnimationFrame: (fn) => setTimeout(() => fn(performance.now()), 16), cancelAnimationFrame: (id) => clearTimeout(id),
    getComputedStyle: (el) => ({ visibility: 'visible', display: el.hidden ? 'none' : 'block', opacity: '1', paddingTop: '0px', paddingBottom: '0px', getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    Path2D: function Path2D() { return new Proxy({}, { get: () => noop }); },
  });
  return {
    doc, El,
    byClass: (c) => doc.body.querySelector(`.${c}`),
    restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } },
  };
}
const until = async (fn, ms = 3000) => {
  const t0 = Date.now();
  for (;;) { const v = fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out'); await new Promise((r) => setTimeout(r, 10)); }
};

test('5: offerSave with foldAsNotNow: left alone it goes as "Not now" (false, no chip); without it, it folds into its chip as before', async () => {
  const dom = installInstallDom();
  try {
    const { offerSave } = await import('../src/hushfold/garden-install.js');
    const body = { left: 100, top: 520, width: 190, height: 200 };
    const ac = new AbortController();
    const v = await Promise.race([
      offerSave({ skillId: 'another-angle', mallow: 'zuzu', reducedMotion: true, signal: ac.signal, origin: () => body, foldAfterMs: 30, foldAsNotNow: true }),
      new Promise((r) => setTimeout(() => r('pending'), 1500)),
    ]);
    assert.equal(v, false, 'resolved as "Not now"');
    assert.equal(dom.byClass('hm-chip'), null, 'no folded chip left behind');
    // the Hushfold's own offer (no flag): unchanged, it folds into its chip and still waits for the answer
    let done = false;
    const p = offerSave({ skillId: 'slowing-down', mallow: 'glitzi', reducedMotion: true, signal: ac.signal, origin: () => body, foldAfterMs: 30 }).then(() => { done = true; });
    await until(() => dom.byClass('hm-chip'));
    assert.equal(done, false);
    ac.abort();
    await p;
  } finally {
    await new Promise((r) => setTimeout(r, 400));
    dom.restore();
  }
});

// ------------------------------------------------------------------------------------------ 6. the quiet face --
test('6: after the check-in’s "I’m okay" the visit stays quiet: Zuzu’s attentive face, no grin, no quips', () => {
  for (const t of ['i cant take it anymore', ...CONCERN]) {
    const R = visit(t, { server: STUBS.pull, walk: 2, answer: 'angle' });
    assert.equal(R.question, 'check', t);
    assert.equal(R.route, 'play', t);
    assert.ok(R.faces.length >= 3 && R.faces.every((f) => f === 'attentive'), `${t}: ${R.faces}`);
    assert.deepEqual([R.noPlay, R.quips], [true, false], t);
  }
  // ordinary words keep the playful reveal
  assert.ok(visit('He hasn’t replied to my message for five hours. He must be annoyed with me.', { server: STUBS.pull, walk: 1, answer: 'angle' }).faces.includes('transforming'));
  const start = between(AA, 'async function startAngle(', 'const FIRST_QUESTION = {');
  assert.match(start, /if \(v !== 'angle'\) \{ quietAfterAsk\(\); return; \}\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*S\.noPlay = true;/);
  assert.match(start, /if \(S\.noPlay \|\| S\.level !== 'none'\) feel \|\|= \{ kind: 'low' \};\s*if \(feel\) careFace\(\); else zt\?\.setEmotion/);
  assert.match(between(AA, 'function openTellNow() {', 'let draftT = 0;'), /if \(S\.level !== 'none' \|\| S\.noPlay\) careFace\(\); else zt\?\.setStage\('listening'\);/);
});

// ------------------------------------------------------------------------------------------ 7. the offline note --
test('7: the offline note comes before the mechanic’s instruction, never between the instruction and its lines', () => {
  assert.equal(ARRIVAL.offlineOnce, 'Zuzu’s own angle this time, worked out on this phone.');
  const play = between(AA, 'async function playScene(', 'function recede(');
  const block = between(play, 'if (mech) {', 'const result = ');
  assert.ok(block.indexOf('if (scene.offlineNote) say(ARRIVAL.offlineOnce') >= 0 && block.indexOf('if (scene.offlineNote) say(ARRIVAL.offlineOnce') < block.indexOf("say(L.hint, { mallow: 'zuzu' });"));
  assert.doesNotMatch(AA, /worked out on this phone\./, 'the line lives in lines.js');
});

// --------------------------------------------------------------------------------------------- 8. privacy --
test('8: "Delete my Another Angle data" removes the sealed predictions too, and counts them as data to delete', () => {
  // (16 Oct 2026, Belief Mallows integrated: kept Belief Mallows are Another Angle data too: tests/belief-mallows.test.mjs)
  assert.deepEqual([...ANGLE_EXTRA_KEYS], ['ultra.sealedPredictions', 'beyond.belief.kept']);
  assert.match(read('src/ultra/another-angle.js'), /const SEAL_KEY = 'ultra\.sealedPredictions';/, 'the key the older Another Angle uses');
  const store = createStore({ backend: 'memory' });
  assert.equal(hasAngleData(store), false);
  store.set('ultra.sealedPredictions', [{ id: 'seal-1', text: 'They will laugh at me', when: 'week', dueAt: 1 }]);
  assert.equal(hasAngleData(store), true, 'only a sealed prediction: the delete row shows');
  store.set(STORE_KEYS.device, 'abcdefghijklmnopqrstuv');
  deleteAngleData(store);
  assert.equal(store.get('ultra.sealedPredictions', null), null);
  assert.equal(store.get(STORE_KEYS.device, null), null);
  assert.equal(hasAngleData(store), false);
  assert.match(read('src/beyond/consent.js'), /your sharing choice, your feedback, any predictions you sealed and any Belief Mallows you kept\./);
});

test('4: the question’s clock never runs out while a support sheet is open over it; once it closes at least QUESTION_BACK_MS is left', async () => {
  const { questionClock, QUESTION_BACK_MS } = await import('../src/beyond/angle-first.js');
  let clock = 0, timers = [], fired = 0, held = false;
  const deps = { doc: null, now: () => clock, setTimer: (fn, t) => { const r = { at: clock + t, fn }; timers.push(r); return r; }, clearTimer: (r) => { timers = timers.filter((x) => x !== r); }, held: () => held };
  const run = (to) => { for (;;) { timers.sort((a, b) => a.at - b.at); const n = timers[0]; if (!n || n.at > to) break; timers.shift(); clock = n.at; n.fn(); } clock = to; };
  const stop = questionClock(45000, () => fired++, deps);
  run(20000); held = true;
  run(200000); assert.equal(fired, 0, 'never while held');
  held = false;
  run(200000 + QUESTION_BACK_MS - 1); assert.equal(fired, 0, 'at least QUESTION_BACK_MS once let go');
  run(200000 + QUESTION_BACK_MS + 600); assert.equal(fired, 1);
  stop();
  // not held: exactly as before (45 s)
  clock = 0; timers = []; fired = 0;
  questionClock(45000, () => fired++, { ...deps, held: () => false });
  run(44999); assert.equal(fired, 0); run(45000); assert.equal(fired, 1);
});
