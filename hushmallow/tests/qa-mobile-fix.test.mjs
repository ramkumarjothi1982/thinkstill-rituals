// Mobile QA fix round (16 Oct 2026): the launch-relevant findings of the mobile QA pass on the release candidate.
// Each was reproduced and re-checked in a real browser (Playwright, touch) at the size it was found at; these keep
// the fixes in place.
//   M1  320×568 at text size Largest: a V3 ritual's play area ran under the ritual dock (Molten Tempo's rim under the
//       words chip, so it could not be turned past halfway). The stage now keeps clear of the dock at every size.
//   m2  touch targets under 44 px: .chip, the Settings Volume slider, the Thought Mallow's words tag.
//   m3  a V3 ritual's first Mallow line covered the play dial (its bubble sat just above the small Mallow in the dock).
//   m4  the small tappable Mallow in a V3 ritual's dock stuck a few px out of the viewport at every size.
// Run: node --test hushmallow/tests/qa-mobile-fix.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const fnBody = (src, start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a, `${start} … ${end}`); return src.slice(a, b); };
const { stageRect, wantsCompact, keepInside, STAGE_MIN, STAGE_FLOOR, STAGE_GAP } = await import('../src/v3/stage-fit.js');

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
  assert.match(host, /import \{ stageRect, wantsCompact(, keepInside)? \} from '\.\/stage-fit\.js';/);
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

test('m3: a V3 ritual’s Mallow lines keep out of the whole stage (the title band is borrowed instead), live as it moves', () => {
  const host = read('src/v3/host.js');
  assert.match(host, /const stageAvoid = \(\) => \(phaseName === 'end' \? \[\] : \[\{ left: stage\.x, top: stage\.y, right: stage\.x \+ stage\.w, bottom: stage\.y \+ stage\.h \}\]\);/);
  assert.match(host, /const say = \(text, ms = 3400\) => \{ if \(text\) \{ ctx\.say\(text, \{ who: lead\.name, ms, avoid: stageAvoid \}\);/);
  // every line goes through it: the opening, halfway, the law's and the finale's (the law module is handed the same say)
  assert.doesNotMatch(host.replace(/const say = [^\n]*\n/, ''), /ctx\.say\(/);
  assert.match(host, /words: E\.words, photos, sound, haptic, react: \(k\) => react\(k, true\), say, setPrompt,/);
  assert.match(read('src/app/scenes/ritual.js'), /say: \(text, opts\) => say\(world, text, opts\),/, 'the ritual scene passes the options on');
  const ui = read('src/app/ui.js');
  const obs = fnBody(ui, 'function collectObstacles(world, avoid) {', '// the top bar and the dock always stay clear');
  // a rect a ritual passes is a piece however big (a tall phone's stage is more than half the screen); only layers found
  // in the page are let off for their size
  assert.match(obs, /if \(kind === 'piece' && el && \(right - r\.left\) \* \(bottom - r\.top\) > area \* 0\.5\) return;/);
  assert.match(obs, /for \(const r of \(typeof avoid === 'function' \? avoid\(\) : avoid\) \|\| \[\]\) add\(r, 'piece'\);/);
  // a title the line has dimmed is still the title band: no flicker (it was measured as gone once faded, and the line
  // moved off it and back every few hundred ms)
  assert.match(obs, /add\(el\.classList\.contains\('say-dim'\) \? boxRect\(el\) : visibleRect\(el\), 'title', el\)/);
  assert.match(ui, /function boxRect\(el\) \{\n  const r = el\.getBoundingClientRect\(\);\n  return r\.width >= 1 && r\.height >= 1 \? r : null;\n\}/);
});

test('m4: the small Mallow in a V3 ritual’s dock stays on screen, inside the safe-area insets', () => {
  // the layer boxes the browser measured on the release candidate (its canvas is the Mallow's touch target)
  const cases = [
    ['320×568', { left: -3, top: 437, right: 112, bottom: 570 }, { left: 0, top: 0, right: 320, bottom: 568 }],
    ['390×844', { left: 3, top: 687, right: 120, bottom: 852 }, { left: 0, top: 0, right: 390, bottom: 844 }],
    ['820×1180', { left: 137, top: 1023, right: 288, bottom: 1188 }, { left: 0, top: 0, right: 820, bottom: 1180 }],
    ['390×844, an iPhone’s home bar (34 px)', { left: 3, top: 653, right: 121, bottom: 817 }, { left: 0, top: 47, right: 390, bottom: 810 }],
  ];
  for (const [label, box, area] of cases) {
    const f = keepInside(box, area);
    assert.equal(f.k, 1, `${label}: it only moves`);
    const moved = { left: box.left + f.dx, top: box.top + f.dy, right: box.right + f.dx, bottom: box.bottom + f.dy };
    assert.ok(moved.left >= area.left - 1e-9 && moved.right <= area.right + 1e-9 && moved.top >= area.top - 1e-9 && moved.bottom <= area.bottom + 1e-9, `${label}: ${JSON.stringify(moved)}`);
    assert.ok(Math.abs(f.dx) <= 3 && Math.abs(f.dy) <= 8, `${label}: by a few px only (${f.dx}, ${f.dy})`);
  }
  // a box already inside stays put; one bigger than the area shrinks about its centre to fit
  assert.deepEqual(keepInside({ left: 10, top: 10, right: 50, bottom: 50 }, { left: 0, top: 0, right: 100, bottom: 100 }), { dx: 0, dy: 0, k: 1 });
  const big = keepInside({ left: -50, top: 0, right: 150, bottom: 100 }, { left: 0, top: 0, right: 100, bottom: 200 });
  assert.equal(big.k, 0.5);
  assert.equal(big.dx, 0);
  // the host applies it to the layer as placed, in both places it puts the Mallow, with the insets measured live
  const host = read('src/v3/host.js');
  const place = fnBody(host, 'function placeMallow(mode = phaseName) {', 'const resizeFns');
  assert.match(place, /\} else world\.fitBetween\(r\.top - 8, r\.bottom \+ 2, \{ maxScale: 0\.42, x: \(\(r\.left \+ r\.width \/ 2\) \/ innerWidth\) \* 100 \}\);\n    keepMallowInside\(\);/);
  assert.match(place, /padding: 'env\(safe-area-inset-top, 0px\) env\(safe-area-inset-right, 0px\) env\(safe-area-inset-bottom, 0px\) env\(safe-area-inset-left, 0px\)'/);
  assert.match(place, /const fit = keepInside\(\{ left: cx - w \/ 2, top: cy - hh \/ 2, right: cx \+ w \/ 2, bottom: cy \+ hh \/ 2 \},/);
  assert.match(place, /world\.place\(\{ x: \(\(cx \+ fit\.dx\) \/ innerWidth\) \* 100, y: \(\(cy \+ fit\.dy\) \/ innerHeight\) \* 100, scale: ms \* fit\.k \}\)/);
  assert.match(fnBody(host, 'function cleanup() {', 'function finish('), /insetProbe\.remove\(\);/);
});
