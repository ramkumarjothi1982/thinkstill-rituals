// Fix round (main screen), after the phase C evaluation of fb1bae2:
//   1. the safety floor: the ordinary question carries a third, equal chip "I'm not okay" (the check-in's "Not really"),
//      and the Support pill is up whenever the question is;
//   2. the lexicon's distress alone is asked the check-in, and "I'm okay — let's play" lifts it for the visit;
//   3/4. after the care line and after "Not really": [See support] [Stay here quietly], focused, named, no clock;
//   5. the urgent sheet while typing: below the words, never taking the focus out of them, a 700 ms tap guard, shown
//      again on Send; 6/7. focus never left on the page; sheets make what is behind them inert and give the focus back;
//   8. a choice's clock waits under a sheet; 9. call names start with their words, calls first after "Not really";
//   10. the grief line; 11. the attentive face after the check-in; 12. Finish beside the ocean's last line;
//   13. pendingTell keeps the reading and the check-in; 14. no update under the person's Thought Mallow;
//   15. a reload keeps routing flags, never the category; 16. the dictation hint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { tellRoute, askOutcome } from '../src/app/scenes/hushfold.js';
import { PLAY_CHECK, CHECK_IN, SHARED_LINES } from '../src/hushfold/lines.js';
import { createSubtitles } from '../src/hushfold/subtitles.js';
import { DICTATION_NOTE, URGENT_IDLE_MS } from '../src/hushfold/input-overlay.js';
import * as support from '../src/app/scenes/support.js';
import { recallVisitSafety, rememberVisitSafety, forgetVisitSafety, visitFlags, VISIT_SAFETY_KEY } from '../src/app/visit-safety.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const hf = read('src/app/scenes/hushfold.js');
const io = read('src/hushfold/input-overlay.js');
const ui = read('src/app/ui.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------- a fake DOM --
// (enough for the real subtitles and the real openSheet: elements with classes, attributes, children, events, focus, inert)
function installDom() {
  const KEYS = ['document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame', 'innerWidth', 'innerHeight'];
  const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  let doc = null;
  class El extends EventTarget {
    constructor(tag) {
      super();
      this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null;
      this.hidden = false; this._text = ''; this.attrs = new Map(); this.inert = false;
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
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.root; }
    get offsetHeight() { return 0; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); if (k === 'class') this.className = v; if (k === 'hidden') this.hidden = true; if (k === 'id') this.id = String(v); }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    hasAttribute(k) { return this.attrs.has(k); }
    removeAttribute(k) { this.attrs.delete(k); if (k === 'hidden') this.hidden = false; }
    append(...nodes) { for (const n of nodes) { if (n == null) continue; const c = typeof n === 'object' ? n : doc.createTextNode(n); c.parentNode?.children && (c.parentNode.children = c.parentNode.children.filter((x) => x !== c)); c.parentNode = this; this.children.push(c); } }
    replaceChildren(...nodes) { for (const c of this.children) c.parentNode = null; this.children = []; this._text = ''; this.append(...nodes); }
    remove() { const p = this.parentNode; if (p) { p.children = p.children.filter((c) => c !== this); this.parentNode = null; } }
    focus() { if (this.inert || this.closest('[inert]')) return; doc.activeElement = this; }
    click() { this.dispatchEvent(Object.assign(new Event('click', { cancelable: true }), { detail: 0 })); }
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: this._bottom || 0, width: 0, height: 0 }; }
    *all() { for (const c of this.children) { yield c; yield* c.all(); } }
    matches(sel) {
      return sel.split(',').map((x) => x.trim()).some((x) => {
        // (a descendant selector: the last part here, the rest on an ancestor)
        if (/\s/.test(x)) { const parts = x.split(/\s+/); const last = parts.pop(); if (!this.matches(last)) return false; for (let n = this.parentNode; n && n.nodeType === 1; n = n.parentNode) if (n.matches(parts.join(' '))) return true; return false; }
        if (x.includes(':not(')) return false;
        if (x === '[inert]') return this.inert;
        if (x.startsWith('.')) return this._cls.has(x.slice(1));
        if (x.startsWith('[') && x.endsWith(']')) return this.attrs.has(x.slice(1, -1).split('=')[0]);
        if (x.startsWith('#')) return this.id === x.slice(1);
        return this.tagName === x.toUpperCase();
      });
    }
    closest(sel) { for (let n = this; n && n.nodeType === 1; n = n.parentNode) if (n.matches?.(sel)) return n; return null; }
    querySelector(sel) { for (const n of this.all()) if (n.nodeType === 1 && n.matches(sel)) return n; return null; }
    querySelectorAll(sel) { return [...this.all()].filter((n) => n.nodeType === 1 && n.matches(sel)); }
    contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  }
  doc = new EventTarget();
  doc.root = new El('html');
  Object.assign(doc, { body: new El('body'), activeElement: null, hidden: false, createRange: () => { throw new Error('no ranges here'); } });
  doc.root.append(doc.body);
  doc.createElement = (t) => new El(t);
  doc.createElementNS = (_ns, t) => new El(t);
  doc.createTextNode = (s) => Object.assign(new El('#text'), { nodeType: 3, _text: String(s) });
  doc.getElementById = (id) => doc.root.querySelector(`#${id}`);
  doc.querySelector = (s) => doc.root.querySelector(s);
  doc.querySelectorAll = (s) => doc.root.querySelectorAll(s);
  const scene = new El('main'); scene.setAttribute('id', 'scene');
  const fx = new El('div'); fx.setAttribute('id', 'fx-layer');
  const sheetRoot = new El('div'); sheetRoot.setAttribute('id', 'sheet-root');
  doc.body.append(fx, scene, sheetRoot);
  doc.activeElement = doc.body;
  const win = new EventTarget();
  Object.assign(globalThis, { document: doc, window: win, requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout, innerWidth: 390, innerHeight: 844 });
  const chips = () => [...doc.body.all()].filter((n) => n._cls?.has('hf-chip'));
  const chipsRow = () => [...doc.body.all()].find((n) => n._cls?.has('hf-chips'));
  return { doc, El, scene, fx, sheetRoot, chips, chipsRow, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const prefs = { get: () => 1, set() {}, onChange: () => () => {} };

// ------------------------------------------------------------------------------------- 1. the safety floor --
test('1. the ordinary question has a third chip of equal weight, last: "I’m not okay" is the check-in’s "Not really"', () => {
  assert.equal(PLAY_CHECK.notOkay, 'I’m not okay');
  assert.equal(askOutcome('notreally'), 'notreally');
  const ask = between(hf, 'async function askPlay(words = null) {', 'function focusTell() {');
  // three chips, none primary, in this order
  const at = ask.indexOf('subtitles.choice(PLAY_CHECK.ask');
  const call = ask.slice(at, ask.indexOf('timeoutMs: PLAY_CHECK.ms', at));
  assert.ok(at > 0 && call.length > 40);
  assert.ok(call.indexOf('PLAY_CHECK.play') < call.indexOf('PLAY_CHECK.stay') && call.indexOf('PLAY_CHECK.stay') < call.indexOf('PLAY_CHECK.notOkay'));
  assert.doesNotMatch(call, /primary/);
  assert.match(call, /\{ label: PLAY_CHECK\.notOkay, value: 'notreally', onPick: pick\('notreally'\) \}/);
  // "Not really" and "I'm not okay" share one path
  assert.match(between(hf, 'async function afterTell(', 'async function askPlay('), /if \(out === 'notreally'\) \{ await careLite\(\{ emotion, intention \}\); return; \}/);
  // the Support pill is up for every question, and goes with an ordinary answer unless the visit wants it
  assert.match(ask, /supportPill\.hidden = false; layout\(\);/);
  assert.match(hf, /const supportWanted = \(\) => gentle\(\) \|\| !!S\.checked \|\| !!S\.asking;/);
  // the same question is the in-world one (one askPlay, a world waiting under its veil)
  assert.match(ask, /holdForAsk\(true\);/);
  // short, plain, no clinical words
  assert.ok(PLAY_CHECK.notOkay.length <= 16);
  assert.doesNotMatch(PLAY_CHECK.notOkay, /crisis|suicid|harm|help|!/i);
});

// ---------------------------------------------------------------------------------- 2. distress alone --
test('2. distress alone is asked the check-in; "I’m okay — let’s play" lifts it; care, crisis, a loss and death care never', () => {
  assert.equal(tellRoute({ level: 'concern', liftable: true }), 'ask', 'the check-in instead of support first');
  assert.equal(tellRoute({ level: 'concern' }), 'support', 'any other concern (a loss, harm-others): support first as before');
  assert.equal(tellRoute({ level: 'care', liftable: true }), 'support', 'care is never lifted');
  assert.equal(tellRoute({ level: 'crisis', liftable: true }), 'crisis');
  assert.equal(tellRoute({ level: 'concern', carried: true, liftable: true }), 'carried', 'after "Not really" (careSaid) later Tells are carried');
  const lift = between(hf, 'function liftable() {', 'function liftConcern() {');
  assert.match(lift, /if \(S\.level !== 'concern' \|\| S\.crisis \|\| S\.deathCare \|\| S\.supportFirst \|\| S\.noResume \|\| S\.notOkay\) return false;/);
  assert.match(lift, /return S\.seen\.size > 0 && \[\.\.\.S\.seen\]\.every\(\(c\) => c === 'distress'\);/);
  const lc = between(hf, 'function liftConcern() {', '/**\n   * (fix round) The visit');
  assert.match(lc, /if \(!liftable\(\)\) return false;/);
  assert.match(lc, /S\.level = 'none'; S\.category = null; S\.care = false; S\.careSaid = false;/);
  assert.match(lc, /forgetVisitSafety\(\);/, 'nothing kept for a reload');
  assert.match(lc, /markChecked\(\{ attentive: true \}\);/, 'the pill stays, the face stays attentive');
  const after = between(hf, 'async function afterTell(', 'async function askPlay(');
  assert.match(after, /const lift = safety\?\.level === 'concern' && liftable\(\);/);
  assert.match(after, /S\.askCheck = !!safety\?\.check \|\| lift;/);
  assert.match(after, /if \(out === 'play' && lift\) lifted = liftConcern\(\);/);
  // every category is noted, so a loss or harm-others at the same level is never lifted with the distress
  assert.match(between(hf, 'function noteSafety(r) {', 'function noteNoResume('), /if \(r\?\.level && r\.level !== 'none'\) S\.seen\.add\(r\.category \|\| r\.level\);/);
  // typed and closed unsent, distress alone is said once and stays liftable (never 'carried')
  assert.match(hf, /if \(liftable\(\)\) S\.concernSaid = true; else S\.careSaid = true;/);
});

// -------------------------------------------------------------------- 3/4. the care and "Not really" chips --
test('3/4. after the care line and after "Not really": [See support] [Stay here quietly], focused, named, no clock', async () => {
  assert.equal(SHARED_LINES.supportAsk[0], 'Would you like to see who can help?');
  assert.equal(CHECK_IN.helpAsk, SHARED_LINES.supportAsk[0]);
  const sc = between(hf, 'async function supportChoice() {', 'async function gentleWorld(');
  assert.match(sc, /subtitles\.choice\(ask, \[\{ label: CHECK_IN\.support, value: 'support', primary: true \}, \{ label: CHECK_IN\.quiet, value: 'stay' \}\],\s*\{ who: M\(\)\.name, colour: M\(\)\.colours\.glow, focus: true, label: ask \}\);/);
  assert.doesNotMatch(sc, /timeoutMs/, 'it never goes by itself');
  assert.match(between(hf, 'async function careLite(', 'async function supportChoice('), /await supportChoice\(\);/);
  const choice = between(hf, 'async function careChoice(', 'function calmTheWorld(');
  assert.match(choice, /if \(S\.deathCare \|\| S\.supportFirst\) \{ await supportChoice\(\); return; \}/);
  assert.match(choice, /if \(!gw && care\) \{ await supportChoice\(\); return; \}/);
  assert.match(choice, /\.\.\.\(care \? \[\{ label: CHECK_IN\.support, value: 'support', primary: true \}\] : \[\]\)/);
  assert.doesNotMatch(choice, /timeoutMs/);
  // the real subtitles: the chips are a group named by its label, the first chip focused, and with no clock nothing goes
  const dom = installDom();
  try {
    const subs = createSubtitles({ root: dom.doc.body, prefs });
    let v = 'pending';
    subs.choice('Would you like to see who can help?', [{ label: 'See support', value: 'support', primary: true }, { label: 'Stay here quietly', value: 'stay' }], { focus: true, label: 'Would you like to see who can help?' }).then((x) => { v = x; });
    await sleep(320);
    assert.equal(dom.chipsRow().getAttribute('aria-label'), 'Would you like to see who can help?');
    assert.equal(dom.doc.activeElement?.textContent, 'See support');
    await sleep(400);
    assert.equal(v, 'pending', 'no clock');
    dom.chips()[0].click();
    await sleep(500);
    assert.equal(v, 'support');
    subs.destroy();
  } finally { dom.restore(); }
});

// ------------------------------------------------------------------------- 8. the clock under a sheet --
test('8. a choice’s clock waits while a sheet covers the stage, and has time again once it is seen', async () => {
  const dom = installDom();
  try {
    const subs = createSubtitles({ root: dom.doc.body, prefs });
    let v = 'pending';
    subs.choice('Q', [{ label: 'A', value: 'a' }], { timeoutMs: 150, hiddenBackMs: 200, transient: true }).then((x) => { v = x; });
    await sleep(60);
    subs.cover(true);
    await sleep(450);
    assert.equal(v, 'pending', 'covered: no time-out (it would have fired at 150 ms)');
    subs.cover(false);
    await sleep(60);
    assert.equal(v, 'pending', 'seen again: its time left, at least');
    await sleep(700);
    assert.equal(v, null, 'then it lets go as before');
    // a choice that shows while a sheet already covers the stage starts its clock only once it is seen
    let w = 'pending';
    subs.cover(true);
    subs.choice('Q2', [{ label: 'A', value: 'a' }], { timeoutMs: 60, hiddenBackMs: 60 }).then((x) => { w = x; });
    await sleep(500);
    assert.equal(w, 'pending');
    subs.cover(false);
    await sleep(700);
    assert.equal(w, null);
    subs.destroy();
  } finally { dom.restore(); }
  // the scene covers the subtitles with every sheet it tracks
  const track = between(hf, 'function trackSheet(sheet) {', '/**\n   * The support sheet');
  assert.match(track, /subtitles\.cover\(true\);/);
  assert.match(track, /if \(!sheets\.length\) subtitles\.cover\(false\);/);
});

// ------------------------------------------------------------------------------------ 5/7. the sheets --
test('7. openSheet: the focus goes to the heading (never ✕), what is behind it is inert, and the focus comes back', async () => {
  const dom = installDom();
  try {
    const { openSheet } = await import('../src/app/ui.js');
    const pill = new dom.El('button'); pill.setAttribute('data-sheet-return', '1');
    const opener = new dom.El('button');
    dom.scene.append(pill, opener);
    opener.focus();
    const sh = openSheet({ title: 'Support', body: 'x' });
    await sleep(20);
    assert.equal(dom.scene.inert, true, 'the scene is out of reach');
    assert.equal(dom.fx.inert, true, 'the stage too');
    assert.equal(dom.sheetRoot.inert, false);
    await sleep(520);
    assert.equal(dom.doc.activeElement?.tagName, 'H2', 'the heading, never the ✕');
    // a second sheet: the first goes out of reach too, and back when the second closes
    const two = openSheet({ title: 'A–Z', body: 'y' });
    await sleep(20);
    assert.equal(sh.el.inert, true);
    two.close();
    assert.equal(sh.el.inert, false);
    // closed: in reach again at once; the focus back to the opener
    sh.close();
    assert.equal(dom.scene.inert, false);
    assert.equal(dom.fx.inert, false);
    await sleep(520);
    assert.equal(dom.doc.activeElement, opener);
    // the opener gone: the scene's return control (the Support pill), never the page itself
    const lone = new dom.El('button'); dom.scene.append(lone); lone.focus();
    const s3 = openSheet({ title: 'Support', body: 'z' });
    await sleep(520);
    lone.remove();
    s3.close();
    await sleep(520);
    assert.equal(dom.doc.activeElement, pill);
  } finally { dom.restore(); }
  assert.doesNotMatch(between(ui, 'export function openSheet(', 'function sceneReturns('), /\|\| closeBtn\)\?\.focus/, 'never the ✕ first');
});

test('5. the urgent sheet beside the words: not modal, the words in reach, the focus left in them; a tap in 700 ms ignored', async () => {
  const dom = installDom();
  try {
    const { openSheet } = await import('../src/app/ui.js');
    const root = new dom.El('div'); dom.scene.append(root);
    const overlay = new dom.El('div'); overlay._bottom = 300;
    const ta = new dom.El('textarea'); overlay.append(ta);
    const other = new dom.El('button');
    root.append(overlay, other);
    ta.focus();
    const sh = openSheet({ title: 'You’re not alone in this', body: 'x', focus: false, beside: overlay, guardMs: 700 });
    await sleep(20);
    assert.equal(sh.el.getAttribute('aria-modal'), 'false');
    assert.equal(dom.scene.inert, false, 'the overlay’s branch stays in reach');
    assert.equal(root.inert, false); assert.equal(overlay.inert, false);
    assert.equal(other.inert, true, 'everything else behind it is out of reach');
    assert.equal(dom.fx.inert, true);
    assert.ok(Number.parseInt(sh.backdrop.style.top, 10) >= 300, 'the backdrop starts below the words');
    // (the guard is the sheet's capture listener: a tap dispatched at the sheet reaches it first)
    const tap = (detail = 1) => { const e = Object.assign(new Event('click', { cancelable: true }), { detail }); sh.el.dispatchEvent(e); return e.defaultPrevented; };
    assert.equal(tap(), true, 'a tap as it appears: ignored');
    await sleep(520);
    assert.equal(dom.doc.activeElement, ta, 'the focus stays in the words');
    assert.equal(tap(), true, 'still inside its first 700 ms: ignored');
    assert.equal(tap(0), false, 'a key press (Enter, Space) always goes through');
    await sleep(260);
    assert.equal(tap(), false, 'after 700 ms a tap is a tap');
    // Send: the sheet becomes the one modal layer and the focus goes to its heading
    sh.focusIn();
    assert.equal(sh.el.getAttribute('aria-modal'), 'true');
    assert.ok(overlay.closest('[inert]'), 'the words behind it are out of reach now');
    assert.equal(dom.doc.activeElement?.tagName, 'H2');
    sh.close();
    await sleep(520);
  } finally { dom.restore(); }
  // the overlay: beside while typing, focus kept, idle once, Send shows it again or takes the focus in
  assert.match(io, /urgent = openSupportSheet\(\{ urgent: true, \.\.\.\(beside \? \{ beside: el, focus: false \} : \{\}\) \}\) \|\| null;/);
  assert.match(io, /else if \(safety\.level === 'crisis' && !urgent\?\.open\) openUrgent\(\{ typing: false \}\);/, 'closed while typing: Send shows it again');
  assert.match(io, /if \(urgent\?\.open\) urgent\.focusIn\?\.\(\);/);
  assert.match(io, /urgent\.focusIn\?\.\(\{ modal: false \}\);/, 'idle: once, still beside the words');
  assert.equal(URGENT_IDLE_MS, 8000);
  assert.equal(support.URGENT_GUARD_MS, 700);
  assert.match(read('src/app/scenes/support.js'), /guardMs: urgent \? URGENT_GUARD_MS : 0,/);
  assert.match(read('src/ui/hushfold.css'), /\.hushfold\.hf-sheet-open \.hf-input:not\(\[data-sheet-beside\]\)/);
});

// --------------------------------------------------------------------------------- 6. focus after Send --
test('6. after Send on the care, crisis and gentle paths the focus waits on the Support pill (never the page itself)', () => {
  const after = between(hf, 'async function afterTell(', 'async function askPlay(');
  assert.match(after, /noteNoResume\(safety\);[\s\S]{0,400}if \(gentle\(\)\) focusHome\(\);/);
  const fh = between(hf, 'function focusHome() {', 'let askHold = null;');
  assert.match(fh, /const to = \[supportPill, tellBtn\]\.find/);
  assert.match(fh, /if \(a && a !== document\.body && !subtitles\.el\.contains\(a\)\) return;/, 'never taken from a field, a sheet or a chip');
  assert.match(hf, /'data-sheet-return': '1', onclick: \(\) => openSupportSheet\(\{ category: pillCategory\(\) \}\)/);
});

// ------------------------------------------------------------------------------------- 9. support.js --
test('9. every call is named by its words first; after "Not really" the calls lead; only listed numbers', () => {
  const known = new Set(['999', '911', '112', ...support.SUPPORT_LINES.filter((l) => l.tel).map((l) => l.tel)]);
  for (const r of ['GB', 'IE', 'US', 'CA', null]) {
    for (const c of [...support.urgentCalls(r), ...support.supportCalls(r), ...support.abuseActions(r)]) {
      assert.ok(c.aria.startsWith(c.label), `${r}: "${c.aria}" starts with "${c.label}" (WCAG 2.5.3)`);
      if (c.href.startsWith('tel:')) assert.ok(known.has(c.href.slice(4)), c.href);
    }
    const calls = support.supportCalls(r);
    assert.deepEqual(calls.map((c) => c.id).slice(1), ['emergency'], 'the crisis line first, then the emergency number');
    assert.ok(calls[0].primary);
  }
  assert.equal(support.urgentCalls('US')[0].aria, 'Call 911 · Emergency services');
  assert.match(support.urgentCalls('GB')[1].aria, /^Call 116 123 · Samaritans \(1 1 6 1 2 3\)$/, 'a grouped number then read a digit at a time');
  for (const c of ['check-in', 'self-risk', 'death-follow']) assert.ok(support.callsFirst(c), c);
  for (const c of [null, 'abuse', 'distress', 'loss']) assert.ok(!support.callsFirst(c), String(c));
  const src = read('src/app/scenes/support.js');
  assert.match(src, /callsFirst\(cat\) \? h\('div', \{ class: 'support-calls', role: 'group', 'aria-label': 'Call someone now' \}, \.\.\.supportCalls\(region\)\.map\(callBtn\)\) : null,/);
  assert.match(src, /label: `Call \$\{l\.show \|\| l\.tel\}`/, 'the card reads "Call 116 123"');
  // the pill opens the calls-first layout while the check-in is up and after "Not really"
  assert.match(between(hf, 'function pillCategory() {', 'function liftable() {'), /if \(S\.notOkay \|\| \(S\.asking && S\.askingCheck\)\) return 'check-in';/);
});

// ------------------------------------------------------------------------------------- 10. the grief line --
test('10. a loss is met with a tender line that acknowledges it, assuming nothing, then the calm choice', () => {
  assert.deepEqual(SHARED_LINES.supportGrief, ['I’m so sorry. That’s a lot to carry.']);
  for (const l of SHARED_LINES.supportGrief) {
    assert.doesNotMatch(l, /\b(?:died|death|dead|suicide|grief|grieving|bereave\w*|him|her|them|fix|support)\b|!|haha|squish/i, l);
    assert.ok(l.length <= 60);
  }
  const beat = between(hf, 'async function careBeat(', 'async function careAgain(');
  assert.match(beat, /safety\?\.category === 'loss' \? SHARED_LINES\.supportGrief : SHARED_LINES\.supportConcern/);
  assert.match(hf, /S\.category === 'loss' \? SHARED_LINES\.supportGrief : SHARED_LINES\.supportConcern/, 'typed and closed, the same line');
});

// ------------------------------------------------------------------- 11/12/13/14. faces, Finish, plans, updates --
test('11–14. the attentive face after the check-in; Finish beside the ocean’s last line; pendingTell; no update under a thought', () => {
  assert.match(hf, /const softNow = \(\) => gentle\(\) \|\| !!S\.soft \|\| !!S\.attentive;/);
  const mc = between(hf, 'function markChecked(', 'const supportWanted');
  assert.match(mc, /setStageFloor\(CARE_FACE\);/);
  assert.match(between(hf, 'async function afterTell(', 'async function askPlay('), /if \(out === 'play' && asked\) markChecked\(\{ attentive: true \}\);/);
  // 12
  assert.match(hf, /return subtitles\.choice\(text, \[\{ label: 'Finish', value: 'finish', soft: true \}\]/);
  assert.match(between(hf, 'function finalStayLine(', 'function finishBeside('), /const stay = entry\?\.final \? entry\.dialogue\?\.completeStay : null;/);
  assert.match(between(hf, 'function finalStayLine(', 'function finishBeside('), /if \(flowRef\.state\?\.canNext\) return null;/);
  // 13
  const resume = between(hf, 'async function resumePendingTell() {', 'function offerRetell(');
  assert.match(resume, /heard: p\.heard \|\| null, check: !!p\.check, chosen: p\.chosen \|\| null/);
  assert.match(resume, /if \(p\.check\) markChecked\(\{ attentive: true \}\);/);
  assert.match(resume, /safety: p\.lifted \? \{ level: 'none' \} :/);
  // 14
  assert.match(between(hf, 'safeForUpdate() {', 'return view;'), /if \(\(stage\?\.thoughts\.list\.length \|\| 0\) > 0\) return false;/);
  assert.match(read('src/hushfold/flow/director.js'), /if \(thoughtList\(thoughtsSrc, thoughtOne\)\.some\(\(t\) => t && !t\.leaving\)\) return false;/);
});

// ---------------------------------------------------------------------------- 15. visit safety, 16. the hint --
test('15. a reload keeps the routing flags only, never the category; "I’m okay" after distress alone forgets it', () => {
  const m = new Map();
  const ss = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } };
  rememberVisitSafety({ level: 'concern', category: 'distress', liftable: true }, { ss, now: 1 });
  assert.deepEqual(recallVisitSafety({ ss, now: 2 }), { level: 'concern', crisisSpoken: false, liftable: true });
  assert.doesNotMatch(m.get(VISIT_SAFETY_KEY), /distress|category/);
  // something heavier at the same level is never "distress alone" again; the other flags accumulate
  rememberVisitSafety({ level: 'concern', noResume: true }, { ss, now: 3 });
  assert.deepEqual(recallVisitSafety({ ss, now: 4 }), { level: 'concern', crisisSpoken: false, noResume: true });
  rememberVisitSafety({ level: 'care', abuseFirst: true, noWorld: true }, { ss, now: 5 });
  assert.deepEqual(recallVisitSafety({ ss, now: 6 }), { level: 'care', crisisSpoken: false, abuseFirst: true, noWorld: true, noResume: true });
  assert.deepEqual(visitFlags({ abuseFirst: true, liftable: 'yes', category: 'abuse' }), { abuseFirst: true });
  forgetVisitSafety({ ss });
  assert.equal(m.size, 0);
});

test('16. the dictation hint: hushmallow keeps the words; the keyboard’s dictation follows the phone’s settings', () => {
  assert.equal(DICTATION_NOTE, 'hushmallow keeps your words on this phone. Your keyboard’s dictation follows your phone’s settings.');
  assert.doesNotMatch(io, /Tap the mic on your keyboard and just talk\. Your words stay on this phone\./);
  assert.match(io, /Your device’s dictation works here too, and follows its own settings\. hushmallow keeps your words on this device\./);
});
