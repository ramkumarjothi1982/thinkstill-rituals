// QA main sweep (minors): a world's title card over the person's travelling thought (the ocean's cold start at 390),
// and the main screen's tap targets.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const { bandFree, placeBand } = await import('../src/hushfold/subtitles.js');

test('lines r1: bandFree — a place inside the bounds with nothing on it (DOMRect-like or the director\'s {x, y, w, h})', () => {
  const bounds = { top: 68, bottom: 760 };
  assert.equal(bandFree(bounds, [], 120, 40), true);
  assert.equal(bandFree(bounds, [], 40, 40), false, 'above the bounds');
  assert.equal(bandFree(bounds, [], 740, 40), false, 'below the bounds');
  assert.equal(bandFree(bounds, [{ top: 300, bottom: 360 }], 120, 40), true, 'a thought further down');
  assert.equal(bandFree(bounds, [{ top: 150, bottom: 200 }], 120, 40), false, 'something moved onto it');
  assert.equal(bandFree(bounds, [{ x: 0, y: 166, w: 390, h: 30 }], 120, 40), true, '6 px gap below it is enough');
  assert.equal(bandFree(bounds, [{ x: 0, y: 164, w: 390, h: 30 }], 120, 40), false);
  assert.equal(bandFree(bounds, [null, { top: 10, bottom: 10 }], 120, 40), true, 'empty and missing blocks are ignored');
});

test('lines r1: a showing line stays put while its place is free; a new line jumps to its place and is placed again as it grows', () => {
  // the ocean's cold start: the title sits in the band; as the thought travels down the free band above it grows, and
  // placeBand alone would take the title down with it (bottom-aligned, close above the thought) — into its path
  const bounds = { top: 68, bottom: 760 };
  const before = placeBand(bounds, [{ top: 225, bottom: 305 }], 30);
  const after = placeBand(bounds, [{ top: 380, bottom: 480 }], 30);
  assert.ok(after.y > before.y + 100, 'placeBand by itself follows the thought down');
  assert.equal(bandFree(bounds, [{ top: 380, bottom: 480 }], before.y, 30), true, 'where it was is still free: it stays');
  const subs = read('src/hushfold/subtitles.js');
  const lay = subs.slice(subs.indexOf('  function layout() {'), subs.indexOf('/** Deepen the scrim'));
  assert.match(lay, /const keep = !jumpNext && placedOnce && \(!!liveEl\.firstChild \|\| !chipsEl\.hidden\) && bandFree\(b, blocks, lastY, need\);/);
  assert.match(lay, /if \(!placedOnce \|\| jumpNext \|\| Math\.abs\(y - lastY\) > 140\)/, 'a new line jumps (never glides in from the last line\'s place)');
  const show = subs.slice(subs.indexOf('  function showLine() {'), subs.indexOf('  function fadeOut('));
  assert.ok(show.indexOf('jumpNext = true;') < show.indexOf('layout();'));
  assert.match(show, /requestAnimationFrame\(\(\) => \{ if \(!destroyed && cur\?\.lineEl === node\) \{ jumpNext = true; layout\(\); \} \}\);/);
  // the title in story type wraps differently once its face arrives: the line is measured and placed again
  assert.match(subs, /new ResizeObserver\(resized\)/);
  assert.match(subs, /document\.fonts\?\.addEventListener\?\.\('loadingdone', onFonts\)/);
  assert.match(subs, /sizeObs\?\.disconnect\(\);/);
  // the shell keeps the lines off where the storm is taking the thought too, in a world's first seconds
  assert.match(read('src/app/scenes/hushfold.js'), /avoid: \(\) => \[mallowAvoidRect\(\), \.\.\.\(stage\?\.thoughts\.rects\(\) \|\| \[\]\), thoughtRestRect\(\),/);
});

test('targets r1: the main screen\'s controls are 44 px at least (subtitle pill and Continue, overlay close and mic, chips, plan)', () => {
  const css = read('src/ui/hushfold.css').replace(/\s+/g, ' ');
  const px = (sel, prop) => { const m = new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[^}]*?${prop}: (\\d+)px`).exec(css); assert.ok(m, `${sel} ${prop}`); return +m[1]; };
  assert.ok(px('.hf-subctl button', 'height') >= 44 && px('.hf-subctl button', 'min-width') >= 44, 'pause, replay, next, speed and the held line\'s Continue');
  assert.ok(px('.hf-input .close', 'height') >= 44 && px('.hf-input .close', 'width') >= 44, 'the overlay\'s close (its CSS is the shell\'s)');
  assert.ok(px('.hf-input .mic', 'height') >= 44 && px('.hf-input .mic', 'width') >= 44);
  assert.ok(px('.hf-opt', 'min-height') >= 44, 'feeling and intention chips (overlay and panel)');
  assert.ok(px('.hf-panel .plan', 'min-height') >= 44);
  assert.ok(px('.hf-pill', 'min-height') >= 44 && px('.hf-chip', 'min-height') >= 44 && px('.hf-btn', 'height') >= 44);
});
