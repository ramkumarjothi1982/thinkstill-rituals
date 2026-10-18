// The live mobile sweep of the release candidate (17 Oct 2026), the Hushfold's keyboard and screen-reader findings. Each
// was reproduced in Chromium on a local build at 375×667 (a fresh profile: a first visit) and checked again after the fix.
//   1. a first visit: the Tell pill never appeared unless the Mallow was squeezed three times, though the side panel
//      ("Worlds begin when you tell a Mallow what's up.") and the Mallow's answer to a feeling picked there point to it.
//      Opening the panel now brings the pill, as on a returning visit; the squeeze invitation keeps its own timing (D4).
//   2. Tab 4 on a first visit focused the hidden Tell pill (opacity 0, half under the screen's bottom edge): hidden, it is
//      out of reach now (inert, aria-hidden), as the Support pill under the Tell overlay is, and the focus still comes back
//      to it when the Tell overlay it opened closes (by Escape, Back or the overlay's own ✕: the review found the ✕ lost it).
//   3. (the side panel's plan button, WCAG 2.5.3 Label in Name: panel.test.mjs)
//   4. on phones the side panel's bottom sheet covers the dock, and Shift+Tab from its first control went to the Tell pill
//      behind it: while the sheet covers the dock, the dock is out of reach.
// Run: node --test hushmallow/tests/hushfold-a11y.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, `${a} … ${b}`); return src.slice(i, j); };
const hf = read('src/app/scenes/hushfold.js');

/** A pill as showTell sees it: its classes, its inert and its attributes. */
function fakePill(cls = ['hf-pill', 'is-hidden']) {
  const c = new Set(cls), attrs = new Map();
  return {
    inert: false,
    classList: { contains: (k) => c.has(k), toggle: (k, on) => { if (on ?? !c.has(k)) c.add(k); else c.delete(k); } },
    setAttribute: (k, v) => attrs.set(k, String(v)), removeAttribute: (k) => attrs.delete(k), getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
  };
}

test('2. the Tell pill, hidden, is out of reach: no Tab stop, nothing a screen reader finds; shown, it is back in reach', () => {
  // from the start (a first visit): hidden, inert and aria-hidden
  assert.match(hf, /const tellBtn = h\('button', \{ class: 'hf-pill is-hidden', type: 'button', inert: '', 'aria-hidden': 'true', 'data-hf': 'tell'/);
  // showTell itself, run on a pill
  const fn = between(hf, 'function showTell(on) {', '\n  }\n');
  const showTell = new Function('tellBtn', 'stage', 'layout', `${fn}\n  }\n  return showTell;`);
  const pill = fakePill();
  let laid = 0;
  const show = showTell(pill, {}, () => { laid++; });
  show(true);
  assert.deepEqual([pill.classList.contains('is-hidden'), pill.inert, pill.getAttribute('aria-hidden')], [false, false, null], 'shown: in reach');
  show(false);
  assert.deepEqual([pill.classList.contains('is-hidden'), pill.inert, pill.getAttribute('aria-hidden')], [true, true, 'true'], 'hidden (under the overlay): out of reach');
  show(true);
  assert.deepEqual([pill.classList.contains('is-hidden'), pill.inert, pill.getAttribute('aria-hidden')], [false, false, null]);
  assert.equal(laid, 3, 'the dock changed each time: laid out again');
  // (the scene's other focus moves already keep to a shown pill)
  assert.match(between(hf, 'function focusTell() {', 'function focusHome() {'), /if \(!tellBtn\.classList\.contains\('is-hidden'\)\) tellBtn\.focus/);
});

test('2. the focus still comes back to the Tell pill when the Tell overlay it opened closes — by Escape, Back or its own ✕ (the pill was out of reach as the overlay gave it back)', () => {
  // the overlay gives the focus back to its opener before it calls onClose (input-overlay.js close): the pill is hidden then,
  // so that does nothing; and the overlay itself stays a moment longer (its fade), its ✕ still holding the focus if it was used
  const ovSrc = read('src/hushfold/input-overlay.js');
  const close = between(ovSrc, 'function close(reason = \'close\') {', '\n  }\n');
  assert.ok(close.indexOf('opener.focus?.(') > 0 && close.indexOf('opener.focus?.(') < close.indexOf('onClose?.(reason'));
  assert.ok(close.indexOf('setTimeout(() => el.remove(), ') > 0 && close.indexOf('setTimeout(() => el.remove(), ') < close.indexOf('onClose?.(reason'), 'still there as onClose runs');
  assert.match(ovSrc, /h\('button', \{ class: 'close', type: 'button', 'aria-label': 'Close', onclick: \(\) => close\('button'\) \}/);
  const open = between(hf, 'function openTellNow(prompt) {', 'onSubmit: (r) => afterTell(');
  const from = open.indexOf('const fromPill = document.activeElement === tellBtn;');
  assert.ok(from > 0 && from < open.indexOf('showTell(false);'), 'read before the pill steps away');
  const onClose = between(hf, 'onClose: (reason, meta = {}) => {', 'pushLayer(\'overlay\');');
  assert.match(onClose, /showTell\(true\);\s*if \(fromPill && reason !== 'submit'\) focusBackToTell\(ov\?\.el\);/, 'once the pill is in reach again, never after Send');
  // focusBackToTell itself, run where the focus is as onClose runs
  const fn = between(hf, 'function focusBackToTell(ovEl) {', '\n  }\n');
  const doc = { body: { name: 'body' }, activeElement: null };
  const tellBtn = { name: 'tell', focus() { doc.activeElement = tellBtn; } };
  const x = { name: '✕' };
  const ovEl = { contains: (n) => n === ovEl || n === x };
  const heading = { name: 'the urgent sheet\'s heading' }, other = { name: 'Settings' };
  const focusBack = new Function('document', 'tellBtn', `${fn}\n  }\n  return focusBackToTell;`)(doc, tellBtn);
  const at = (a, el = ovEl) => { doc.activeElement = a; focusBack(el); return doc.activeElement.name; };
  assert.equal(at(doc.body), 'tell', 'Escape, Back: the focus left on the page');
  assert.equal(at(x), 'tell', 'its own ✕ (Enter, Space or a tap): the focus on the ✕ as it fades out (review: lost to the page)');
  assert.equal(at(doc.body, undefined), 'tell');
  assert.equal(at(heading), 'the urgent sheet\'s heading', 'never taken from the urgent sheet the overlay gave it to');
  assert.equal(at(other), 'Settings', 'nor from a control it has gone to meanwhile');
  assert.equal(at(other, undefined), 'Settings');
});

test('1. a first visit: opening the side panel brings the Tell pill its words point to; the squeeze invitation keeps its timing (D4)', () => {
  const toggle = between(hf, 'async function togglePanel() {', '\n  }\n');
  const opened = toggle.indexOf('p.open();');
  assert.ok(opened > 0 && toggle.indexOf('if (!overlay) showTell(true);') > opened, 'shown as the panel opens (never under the Tell overlay)');
  assert.doesNotMatch(toggle, /S\.invited/, 'not an invitation: the squeeze invitation still comes in its own time');
  // the panel's own words (at home) and the Mallow's answer to a feeling picked there, which point to it
  assert.match(read('src/hushfold/side-panel.js'), /: 'Worlds begin when you tell a Mallow what’s up\.';/);
  assert.match(between(hf, 'async function pickFeeling(id) {', 'async function pickIntention('), /if \(e && !softNow\(\)\) say\(lines\.pick\(mallowId, 'ack'/);
  // the squeeze-first opening and the invitation, as they were: a first visit's opening only nudges
  const opening = between(hf, 'async function opening() {', '\n  }\n');
  const first = opening.slice(opening.lastIndexOf('} else {'));
  assert.doesNotMatch(first, /showTell|S\.invited/);
  assert.match(first, /nudgeT = later\(\(\) => \{ if \(quiet\(\)\) say\(lines\.pick\(mallowId, 'nudge'\)\); \}, 3200\);/);
  assert.match(hf, /if \(canInvite\(\) && S\.reactions >= 3 && t - S\.firstTouchAt > 5500 && !subtitles\.busy\) \{ invite\(\); return; \}/);
  assert.match(hf, /const canInvite = \(\) => !S\.invited && /);
});

test('4. phones: while the side panel\'s bottom sheet covers the dock, the dock is out of reach (no Tab stop behind the sheet)', () => {
  const lay = between(hf, 'function layout() {', 'const topB = ');
  assert.match(lay, /const covered = panelSheet\(\);\s*if \(dock\.inert !== covered\) dock\.inert = covered;/);
  // the sheet only (a side panel leaves the dock in the free width beside it): the same rule the CSS lays it out by
  assert.match(hf, /const panelSheet = \(\) => !!panel\?\.isOpen && \(sheetRule \? sheetRule\(\) : innerWidth < 700\);/);
  // laid out as it opens, and again as it closes (closed first: isOpen is false by then), so the dock is back in reach
  assert.ok(between(hf, 'async function togglePanel() {', '\n  }\n').includes('layout();'));
  assert.match(between(hf, 'panel ||= createSidePanel({', 'return panel;'), /onClose: \(\) => \{[^\n]*layout\(\);/);
  const pclose = between(read('src/hushfold/side-panel.js'), 'close() {', 'toggle()');
  assert.ok(pclose.indexOf('isOpen = false;') >= 0 && pclose.indexOf('isOpen = false;') < pclose.indexOf('onClose?.()'));
});
