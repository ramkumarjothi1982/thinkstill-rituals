// QA main sweep (major): the side panel at tablet widths. Portrait tablets (768×1024) use the bottom sheet that holds a
// world (as on a phone); landscape tablets and desktops keep the side panel, and then the Mallow, the lines, the dock,
// the thoughts and the worlds' plans keep to the free width left of it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const fnBody = (src, start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a, `${start} … ${end}`); return src.slice(a, b); };
const { panelIsSheet, PANEL_SHEET_QUERY } = await import('../src/hushfold/side-panel.js');
const { planOcean, OCEAN } = await import('../src/hushfold/flow/worlds/ocean-rules.js');

test('layout r1: the panel is a bottom sheet on phones and portrait tablets, a side panel on landscape tablets and desktops', () => {
  for (const [w, h] of [[320, 568], [390, 844], [430, 932], [768, 1024], [820, 1180], [834, 1194]]) assert.equal(panelIsSheet(w, h), true, `${w}×${h} sheet`);
  for (const [w, h] of [[1024, 768], [1180, 820], [1280, 800], [844, 390], [1366, 1024]]) assert.equal(panelIsSheet(w, h), false, `${w}×${h} side`);
  // the stylesheet uses the same rule
  const css = read('src/ui/hushfold.css');
  assert.ok(css.includes(`@media ${PANEL_SHEET_QUERY} {\n  .hf-panel { top: auto;`), 'the sheet CSS is behind PANEL_SHEET_QUERY');
  assert.doesNotMatch(css, /@media \(max-width: 699px\) \{\n  \.hf-panel/);
});

test('layout r1: beside an open side panel the stage keeps to the free width (Mallow, lines, dock, thoughts, the world)', () => {
  const scene = read('src/app/scenes/hushfold.js');
  assert.match(scene, /const panelSheet = \(\) => !!panel\?\.isOpen && \(sheetRule \? sheetRule\(\) : innerWidth < 700\);/);
  const right = fnBody(scene, 'function stageRight() {', 'function panelTop()');
  assert.match(right, /if \(!panel\?\.isOpen \|\| panelSheet\(\)\) return innerWidth;/);
  assert.match(right, /innerWidth - w/);
  const lay = fnBody(scene, 'function layout() {', 'let plannedHero');
  assert.match(lay, /const vw = stageRight\(\), vh = innerHeight;/, 'the Mallow is sized and centred in the free width');
  assert.match(lay, /dock\.style\.right = vw < innerWidth \? `\$\{innerWidth - vw\}px` : '';/, 'the dock keeps to it');
  assert.match(scene, /bounds: \(\) => \(\{ top: bandTop\(\), bottom: Math\.min\(dockTop\(\), panelTop\(\)\) - 12, left: 0, right: stageRight\(\) \}\),/, 'the lines keep to it');
  assert.match(fnBody(scene, 'const safeRect = () => {', 'function createStubFlow()'), /return \{ x: 20, y: top, w: stageRight\(\) - 40, h: bottom - top \};/, 'the worlds plan in it');
  // the subtitles honour a right bound (and only what is beside them across that width pushes them)
  const subs = read('src/hushfold/subtitles.js');
  assert.match(subs, /el\.style\.right = right != null \? `\$\{Math\.round\(innerWidth - right\)\}px` : '';/);
  assert.match(subs, /blocks = blocks\.filter\(/);
  // the director hands worlds the free width; the storm plans its postcards in it and re-plans when it changes
  assert.match(read('src/hushfold/flow/director.js'), /get freeW\(\) \{ const s = shellSafe\(\); return/);
  const storm = read('src/hushfold/flow/worlds/static-storm.js');
  assert.match(storm, /return planStormLayout\(\{ W: freeW\(\), H, safe: ctx\.safe,/);
  assert.match(storm, /function keyNow\(\) \{[^\n]*\$\{fw\}`/);
  const ocean = read('src/hushfold/flow/worlds/luminous-ocean.js');
  assert.match(ocean, /plate: pl, x1: XR \}\);/);
  assert.match(ocean, /Math\.abs\(fw - layoutFreeW\) > 4/, 'the ocean re-plans when the free width changes');
});

test('layout r1: planOcean keeps the thought, its words and every bubble left of x1 (the sea still spans W)', () => {
  const band = { x: 0, y: 76, w: 1024, h: 130 };
  for (const [W, H, x1, hero] of [[1024, 768, 664, { left: 232, top: 458, right: 433, bottom: 668 }], [1280, 800, 920, { left: 357, top: 481, right: 564, bottom: 708 }]]) {
    const full = planOcean({ W, H, band, mallow: { ...hero, width: hero.right - hero.left, height: hero.bottom - hero.top }, n: 7, textW: 300 });
    assert.ok(full.slots.some((s) => s.x + s.D / 2 > x1), `${W}: without x1 some bubbles lie where the panel would be`);
    const p = planOcean({ W, H, band, mallow: { ...hero, width: hero.right - hero.left, height: hero.bottom - hero.top }, n: 7, textW: 300, x1 });
    assert.equal(p.W, W);
    assert.ok(p.slots.length >= 5, `${W}: room for most bubbles (${p.slots.length})`);
    for (const s of p.slots) assert.ok(s.x + s.D / 2 <= x1 - OCEAN.EDGE + 0.5, `${W}: bubble ends at ${Math.round(s.x + s.D / 2)} (x1 ${x1})`);
    assert.ok(p.home.x + p.home.r <= x1 - OCEAN.EDGE + 0.5, `${W}: the thought`);
    if (p.rects.plate) assert.ok(p.rects.plate.x1 <= x1 - OCEAN.EDGE + 5, `${W}: its words`);
  }
});
