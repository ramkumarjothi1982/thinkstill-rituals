// Mobile QA fix round (16 Oct 2026): the launch-relevant findings of the mobile QA pass on the release candidate.
// Each was reproduced and re-checked in a real browser (Playwright, touch) at the size it was found at; these keep
// the fixes in place.
//   M1  320×568 at text size Largest: a V3 ritual's play area ran under the ritual dock (Molten Tempo's rim under the
//       words chip, so it could not be turned past halfway). The stage now keeps clear of the dock at every size.
//   m2  touch targets under 44 px: .chip, the Settings Volume slider, the Thought Mallow's words tag.
// Run: node --test hushmallow/tests/qa-mobile-fix.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const fnBody = (src, start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a, `${start} … ${end}`); return src.slice(a, b); };
const { stageRect, wantsCompact, STAGE_MIN, STAGE_FLOOR, STAGE_GAP } = await import('../src/v3/stage-fit.js');

// what the browser measured on the release candidate (Playwright, HM-0001 Molten Tempo): the title's bottom in full and
// compacted, and the dock's top (the scene column is 20…W-20 on a phone, 480 wide and centred on a tablet)
const PHONES = [
  // [label, W, H, titleBottom (full), titleBottom (compact; = full where it never compacts), dockTop]
  ['320×568 Largest, a three-line prompt', 320, 568, 268, 235, 456],
  ['320×568 Largest, a two-line prompt (Pause Gate)', 320, 568, 240, 207, 456],
  ['320×568', 320, 568, 213, 213, 456],
  ['390×844', 390, 844, 227, 227, 730],
  ['390×844 Largest', 390, 844, 256, 256, 730],
  ['820×1180 tablet', 820, 1180, 231, 231, 1066],
];

test('M1: the V3 stage never reaches under the dock, at any size or text size (the old floor of 220 px did)', () => {
  for (const [label, W, H, full, compact, dockTop] of PHONES) {
    const scene = { left: W > 700 ? (W - 520) / 2 + 20 : 20, width: W > 700 ? 480 : W - 40 };
    const short = wantsCompact(full, dockTop);
    const st = stageRect({ ...scene, titleBottom: short ? compact : full, dockTop, barBottom: 58 });
    assert.ok(st.y + st.h <= dockTop - STAGE_GAP + 0.01, `${label}: the stage ends at ${st.y + st.h}, the dock starts at ${dockTop}`);
    assert.ok(st.y >= (short ? compact : full) + STAGE_GAP - 0.01, `${label}: the stage starts below the title`);
    assert.ok(st.h >= STAGE_FLOOR, `${label}: ${st.h} px is room to play`);
    assert.ok(st.s >= 0.72 && st.s <= 1.45, `${label}: scale ${st.s}`);
    assert.equal(st.cx, st.x + st.w / 2); assert.equal(st.cy, st.y + st.h / 2);
    // the old rule: max(220, band) — under the dock exactly where QA found it
    const old = Math.max(220, dockTop - 10 - (full + 10));
    if (label.startsWith('320×568 Largest')) assert.ok(full + 10 + old > dockTop, `${label}: the release candidate's stage ran under the dock`);
  }
  // the title compacts only when the stage would be short of what the engines are made for
  assert.equal(wantsCompact(268, 456), true);
  assert.equal(wantsCompact(230, 732), false);
  assert.equal(wantsCompact(456 - 2 * STAGE_GAP - STAGE_MIN, 456), false);
  assert.equal(wantsCompact(456 - 2 * STAGE_GAP - STAGE_MIN + 1, 456), true);
  // a band shorter than STAGE_FLOOR (a phone on its side) grows up behind the title (whose words never take touches),
  // never down under the dock, and never above the top bar
  const side = stageRect({ left: 20, width: 528, titleBottom: 180, dockTop: 220, barBottom: 30 });
  assert.equal(side.y + side.h, 210);
  assert.equal(side.h, STAGE_FLOOR);
  const tiny = stageRect({ left: 20, width: 528, titleBottom: 120, dockTop: 150, barBottom: 58 });
  assert.equal(tiny.y, 68, 'not above the top bar');
  assert.equal(tiny.y + tiny.h, 140, 'still never under the dock');
});

test('M1: the host lays the stage out from stage-fit.js, compacting the title first; the title keeps the prompt and the law', () => {
  const host = read('src/v3/host.js');
  assert.match(host, /import \{ stageRect, wantsCompact \} from '\.\/stage-fit\.js';/);
  const lay = fnBody(host, 'function layout() {', 'function placeMallow(');
  assert.doesNotMatch(lay, /Math\.max\(220/, 'no floor that pushes the stage under the dock');
  assert.match(lay, /titleBox\.classList\.remove\('v3-compact'\);\n\s+if \(wantsCompact\(titleBottom\(\), dockTop\)\) titleBox\.classList\.add\('v3-compact'\);/);
  assert.match(lay, /Object\.assign\(stage, stageRect\(\{ left: scene\.left, width: scene\.width, titleBottom: titleBottom\(\), dockTop, barBottom: bar \}\)\);/);
  // measured again whenever the title or the dock changes size (a new prompt, the law chip, the end card)
  assert.match(host, /if \(ro\) \{ if \(titleBox\) ro\.observe\(titleBox\); ro\.observe\(dock\); \}/);
  assert.match(fnBody(host, 'function cleanup() {', 'function finish('), /titleBox\?\.classList\.remove\('v3-compact'\);/);
  // compact: only the location line steps out (it is still announced by the ritual's status line)
  const css = read('src/ui/app.css');
  const rules = [...css.matchAll(/\.move-title\.v3-compact([^{]*)\{([^}]*)\}/g)].map((m) => [m[1].trim(), m[2].trim()]);
  assert.deepEqual(rules.map((r) => r[0]), ['', '.eyebrow', '.v3-law-chip']);
  for (const [sel, body] of rules) if (sel !== '.eyebrow') assert.doesNotMatch(body, /display:\s*none|font|visibility|opacity/, `${sel}: ${body}`);
  assert.match(read('src/app/scenes/ritual.js'), /status\.textContent = `\$\{e\}\. \$\{title\}\. \$\{prompt\}`;/, 'the location is still announced');
});

test('m2: chips, the Settings Volume slider and the Thought Mallow’s words tag are at least 44 px to a finger', () => {
  const css = read('src/ui/app.css');
  assert.match(css, /^\.chip \{ flex: 0 0 auto; min-height: 44px;/m);
  for (const m of css.matchAll(/\.chip\b[^{,]*\{[^}]*min-height:\s*(\d+)px/g)) assert.ok(+m[1] >= 44, m[0]);
  // no chip anywhere is given a smaller inline minimum
  for (const p of ['src/app/scenes/settings.js', 'src/app/scenes/library.js', 'src/app/scenes/landing.js', 'src/app/scenes/express.js', 'src/app/emotion-picker.js']) {
    for (const m of read(p).matchAll(/class: 'chip'[^\n]*minHeight: '(\d+)px'/g)) assert.ok(+m[1] >= 44, `${p}: ${m[0]}`);
  }
  // the slider: 44 px tall inside its row's own padding (the row keeps its height: 14 px padding either side)
  assert.match(css, /\.setting \.range \{ height: 44px; margin-block: -6px; \}/);
  assert.match(css, /\.setting \{ display: flex; align-items: center; gap: 12px; padding: 14px 0;/);
  assert.match(read('src/app/scenes/settings.js'), /h\('input', \{ type: 'range', class: 'range',[^\n]*'aria-label': 'Volume'/);
  // the words tag keeps its look; its target is the invisible ::before, at least 48 px tall and a little wider, and
  // nothing clips it (QA's audit measured the 36 px box; a tap 4 px above or 5 px below it reads the words)
  const layer = read('src/mallows/thought/layer.js');
  const before = /\.tm-tag::before\{([^}]*)\}/.exec(layer)?.[1];
  assert.ok(before, 'the tag has its hit area');
  assert.match(before, /content:"";position:absolute;left:-2px;right:-2px;top:50%;height:max\(100% \+ 4px,(\d+)px\);transform:translateY\(-50%\)/);
  assert.ok(+/max\(100% \+ 4px,(\d+)px\)/.exec(before)[1] >= 44);
  const tag = /\.tm-tag\{([^}]*)\}/.exec(layer)[1];
  assert.doesNotMatch(tag, /overflow\s*:|contain\s*:/, 'nothing clips the hit area');
  assert.match(tag, /pointer-events:auto/);
});
