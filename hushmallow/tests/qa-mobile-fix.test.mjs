// Mobile QA fix round (16 Oct 2026): the launch-relevant findings of the mobile QA pass on the release candidate.
// Each was reproduced and re-checked in a real browser (Playwright, touch) at the size it was found at; these keep
// the fixes in place.
//   M1  320×568 at text size Largest: a V3 ritual's play area ran under the ritual dock (Molten Tempo's rim under the
//       words chip, so it could not be turned past halfway). The stage now keeps clear of the dock at every size.
//   m2  touch targets under 44 px: .chip, the Settings Volume slider, the Thought Mallow's words tag.
//   m3  a V3 ritual's first Mallow line covered the play dial (its bubble sat just above the small Mallow in the dock).
//   m4  the small tappable Mallow in a V3 ritual's dock stuck a few px out of the viewport at every size (and, found in
//       review: kept inside by its whole layer, on a phone on its side its body was pushed out of its spot).
//   (and, found by the gesture sweep of all 240 built rituals: world law 19's own hint could not be followed; found in
//   review: a second finger on its anchor could stop tap-to-set for good, or take over another finger's trace, and a
//   finger only resting on the anchor kept every trace begun there from counting.)
// Run: node --test hushmallow/tests/qa-mobile-fix.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const fnBody = (src, start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a, `${start} … ${end}`); return src.slice(a, b); };
const { stageRect, wantsCompact, keepBodyInside, MALLOW_NUDGE, STAGE_MIN, STAGE_FLOOR, STAGE_GAP } = await import('../src/v3/stage-fit.js');

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
  assert.match(host, /import \{ stageRect, wantsCompact(, keepBodyInside)? \} from '\.\/stage-fit\.js';/);
  const lay = fnBody(host, 'function layout() {', 'function placeMallow(');
  assert.doesNotMatch(lay, /Math\.max\(220/, 'no floor that pushes the stage under the dock');
  // the dock is measured again after each toggle (compacting the title can bring it up the screen): played through the
  // host in qa-mobile-review.test.mjs (2)
  assert.match(lay, /titleBox\.classList\.remove\('v3-compact'\);\n\s+if \(wantsCompact\(titleBottom\(\), dockTop\(\)\)\) titleBox\.classList\.add\('v3-compact'\);/);
  assert.match(lay, /Object\.assign\(stage, stageRect\(\{ left: scene\.left, width: scene\.width, titleBottom: titleBottom\(\), dockTop: dockTop\(\), barBottom: bar \}\)\);/);
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

// the small Mallow as fitBetween places it in the dock (Playwright, HM-0001, Glitzi; before it is kept inside): its
// layer's box, its body's box (the rig's framing), the dock's spot, where the words chip and Tap instead begin, and the
// viewport less its safe-area insets (320×568 at text size Largest has the same dock as 320×568)
const MALLOW_IN_DOCK = [
  // [label, layer, body, spot, controls' left, area]
  ['320×568', { left: -2.7, top: 436.7, right: 112.7, bottom: 570 }, { left: 17.2, top: 481.9, right: 92.8, bottom: 554 }, { left: 20, top: 474, right: 90, bottom: 552 }, 100, { left: 0, top: 0, right: 320, bottom: 568 }],
  ['375×812', { left: 5, top: 656.7, right: 119, bottom: 817.3 }, { left: 24.7, top: 726.7, right: 99.3, bottom: 798 }, { left: 20, top: 700, right: 104, bottom: 796 }, 114, { left: 0, top: 0, right: 375, bottom: 812 }],
  ['390×844', { left: 3.4, top: 686.5, right: 120.6, bottom: 851 }, { left: 23.6, top: 758, right: 100.4, bottom: 831.3 }, { left: 20, top: 732, right: 104, bottom: 828 }, 114, { left: 0, top: 0, right: 390, bottom: 844 }],
  ['430×932', { left: -2.7, top: 774.5, right: 126.8, bottom: 939 }, { left: 19.6, top: 838.3, right: 104.4, bottom: 919.3 }, { left: 20, top: 820, right: 104, bottom: 916 }, 114, { left: 0, top: 0, right: 430, bottom: 932 }],
  ['820×1180', { left: 136.8, top: 1022.5, right: 287.3, bottom: 1187 }, { left: 162.7, top: 1073.2, right: 261.3, bottom: 1167.3 }, { left: 170, top: 1068, right: 254, bottom: 1164 }, 264, { left: 0, top: 0, right: 820, bottom: 1180 }],
  ['1280×800', { left: 364.9, top: 644.7, right: 519.1, bottom: 805.3 }, { left: 391.5, top: 689.6, right: 492.5, bottom: 786 }, { left: 400, top: 688, right: 484, bottom: 784 }, 494, { left: 0, top: 0, right: 1280, bottom: 800 }],
  ['390×844, an iPhone’s notch and home bar (47, 34)', { left: 3.4, top: 652.5, right: 120.6, bottom: 817 }, { left: 23.6, top: 724, right: 100.4, bottom: 797.3 }, { left: 20, top: 698, right: 104, bottom: 794 }, 114, { left: 0, top: 47, right: 390, bottom: 810 }],
  // a phone on its side: the layer is far wider than the body
  ['667×375', { left: -35.3, top: 268.5, right: 145.3, bottom: 356.7 }, { left: 23.4, top: 285.8, right: 86.6, bottom: 346.1 }, { left: 20, top: 281, right: 90, bottom: 359 }, 100, { left: 0, top: 0, right: 667, bottom: 375 }],
  ['667×375, a notch at the side (0, 47, 21, 47)', { left: -35.3, top: 247.5, right: 145.3, bottom: 335.7 }, { left: 23.4, top: 264.8, right: 86.6, bottom: 325.1 }, { left: 20, top: 260, right: 90, bottom: 338 }, 100, { left: 47, top: 0, right: 620, bottom: 354 }],
  ['568×320', { left: -35.3, top: 220.7, right: 145.3, bottom: 295.8 }, { left: 28.1, top: 235.4, right: 81.9, bottom: 286.8 }, { left: 20, top: 226, right: 90, bottom: 304 }, 100, { left: 0, top: 0, right: 568, bottom: 320 }],
  ['568×320, a notch at the side (0, 47, 21, 47)', { left: -35.3, top: 199.7, right: 145.3, bottom: 274.8 }, { left: 28.1, top: 214.4, right: 81.9, bottom: 265.8 }, { left: 20, top: 205, right: 90, bottom: 283 }, 100, { left: 47, top: 0, right: 521, bottom: 299 }],
];

test('m4: the small Mallow in a V3 ritual’s dock stays on screen, inside the safe-area insets, and over its spot', () => {
  const move = (b, f) => ({ left: b.left + f.dx, top: b.top + f.dy, right: b.right + f.dx, bottom: b.bottom + f.dy });
  const inside = (b, a) => b.left >= a.left - 1e-9 && b.right <= a.right + 1e-9 && b.top >= a.top - 1e-9 && b.bottom <= a.bottom + 1e-9;
  for (const [label, layer, body, spot, controls, area] of MALLOW_IN_DOCK) {
    const f = keepBodyInside(layer, body, area);
    assert.equal(f.k, 1, `${label}: it only moves`);
    const b = move(body, f), L = move(layer, f);
    const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
    assert.ok(inside(b, area), `${label}: the body is on screen, inside the insets: ${JSON.stringify(b)}`);
    assert.ok(cx >= spot.left && cx <= spot.right && cy >= spot.top && cy <= spot.bottom, `${label}: the body's centre (${cx}, ${cy}) is over its spot`);
    // the layer comes in by a nudge at most: in portrait (a layer not much wider than the body) that is all of it, as
    // before, by a few px; on its side, part of its transparent margin stays off screen
    if (layer.right - layer.left < 2 * (body.right - body.left)) {
      assert.ok(inside(L, area), `${label}: in portrait all of the layer is on screen too: ${JSON.stringify(L)}`);
      assert.ok(Math.abs(f.dx) <= 3 && Math.abs(f.dy) <= 8, `${label}: by a few px only (${f.dx}, ${f.dy})`);
    }
    else assert.ok(Math.abs(f.dx) <= MALLOW_NUDGE * (body.right - body.left) + 1e-9 || f.dx === area.left - body.left, `${label}: dx ${f.dx}`);
    // and with no inset beside it, the body is clear of the words chip and Tap instead
    if (!area.left) assert.ok(b.right <= controls, `${label}: the body ends at ${b.right}, the controls begin at ${controls}`);
  }
  // a body already inside, with its layer, stays put; a body bigger than the area shrinks about its centre to fit
  assert.deepEqual(keepBodyInside({ left: 0, top: 0, right: 60, bottom: 60 }, { left: 10, top: 10, right: 50, bottom: 50 }, { left: 0, top: 0, right: 100, bottom: 100 }), { dx: 0, dy: 0, k: 1 });
  const big = keepBodyInside({ left: -80, top: -10, right: 180, bottom: 110 }, { left: -50, top: 0, right: 150, bottom: 100 }, { left: 0, top: 0, right: 100, bottom: 200 });
  assert.equal(big.k, 0.5);
  assert.equal(big.dx, 0);
  // the host keeps the body inside where it puts the Mallow, from the rig's framing, with the insets measured live
  // (played through the host in qa-mobile-review.test.mjs (3))
  const host = read('src/v3/host.js');
  const place = fnBody(host, 'function placeMallow(mode = phaseName) {', 'const resizeFns');
  assert.match(place, /\} else world\.fitBetween\(r\.top - 8, r\.bottom \+ 2, \{ maxScale: 0\.42, x: \(\(r\.left \+ r\.width \/ 2\) \/ innerWidth\) \* 100 \}\);\n    keepMallowInside\(\);/);
  assert.match(place, /padding: 'env\(safe-area-inset-top, 0px\) env\(safe-area-inset-right, 0px\) env\(safe-area-inset-bottom, 0px\) env\(safe-area-inset-left, 0px\)'/);
  assert.match(place, /const f = world\.bodyFrame\?\.\(\) \|\|/);
  assert.match(fnBody(host, 'function cleanup() {', 'function finish('), /insetProbe\.remove\(\);/);
});

test('law 19 (Anchor and Explore): its own hints, followed with one finger, finish it; two fingers still do', async () => {
  const { createLaw } = await import('../src/v3/laws.js');
  let t = 0;
  // the stage at 320×568, text size Largest (a three-line prompt)
  const L = () => ({ stage: { x: 12, y: 245, w: 296, h: 201, cx: 160, cy: 345.5, s: 0.72 }, now: () => t, sound() {}, haptic() {}, react() {}, setPrompt() {},
    words: { token: 'my words' }, pal: { glow: '#ffffff' }, photos: { n: 0 }, particles: { emit() {} } });
  const swipe = (law, h, id) => {
    law.down({ ...h.from, id });
    for (let i = 1; i <= 12; i++) law.move({ x: h.from.x + ((h.to.x - h.from.x) * i) / 12, y: h.from.y + ((h.to.y - h.from.y) * i) / 12, id });
    law.up({ ...h.to, id });
  };
  // one finger, as the ghost shows: tap the anchor, then trace out from it to each light (the first trace begins on the
  // anchor: it used to take the anchor again and never count, so the law stayed at a quarter at every size)
  const one = createLaw(19, L());
  const h0 = one.hint();
  assert.ok(h0.tap, 'first: tap the anchor');
  one.down({ ...h0.tap, id: 1 }); one.up({ ...h0.tap, id: 1 });
  assert.equal(one.progress, 0.25);
  for (let k = 0; k < 3; k++) {
    const h = one.hint();
    if (k === 0) assert.deepEqual(h.from, h0.tap, 'the first trace starts on the anchor');
    swipe(one, h, 2 + k);
    assert.equal(one.progress, 0.5 + k * 0.25, `light ${k + 1}`);
  }
  t = 5;
  assert.equal(one.done, true);
  assert.equal(one.hint(), null);
  // two fingers: one holds the anchor while another traces (from the anchor or anywhere)
  t = 0;
  const two = createLaw(19, L());
  const a = two.hint().tap;
  two.down({ ...a, id: 1 });
  for (let k = 0; k < 3; k++) swipe(two, k === 0 ? { from: { x: a.x + 60, y: a.y }, to: two.hint().to } : two.hint(), 10 + k);
  assert.equal(two.progress, 1);
  two.up({ ...a, id: 1 });
  t = 5;
  assert.equal(two.done, true);
  // Tap instead still sets the anchor, then each press lights the next light
  t = 0;
  const tap = createLaw(19, L());
  for (let i = 0; i < 4; i++) tap.assist();
  assert.equal(tap.progress, 1);
});

test('law 19 (Anchor and Explore) with several fingers: every finger but the anchor’s explores, so none stops another’s trace or tap-to-set', async (tt) => {
  const { createLaw } = await import('../src/v3/laws.js');
  const { rgba } = await import('../src/v3/fx.js');
  let t = 0;
  const L = () => ({ stage: { x: 12, y: 245, w: 296, h: 201, cx: 160, cy: 345.5, s: 0.72 }, now: () => t, sound() {}, haptic() {}, react() {}, setPrompt() {},
    words: { token: 'my words' }, pal: { glow: '#ffffff' }, photos: { n: 0 }, particles: { emit() {} } });
  // where that stage puts the three lights
  const WAY = [{ x: 154.08, y: 309.32 }, { x: 225.12, y: 349.52 }, { x: 254.72, y: 301.28 }];
  const fresh = () => { t = 0; const law = createLaw(19, L()); return [law, law.hint().tap]; };
  const steps = (from, to, k) => ({ x: from.x + ((to.x - from.x) * k) / 12, y: from.y + ((to.y - from.y) * k) / 12 });
  const swipe = (law, h, id) => { law.down({ ...h.from, id }); for (let i = 1; i <= 12; i++) law.move({ ...steps(h.from, h.to, i), id }); law.up({ ...h.to, id }); };
  const setByTap = (law, a, id = 1) => { law.down({ ...a, id }); law.up({ ...a, id }); assert.equal(law.progress, 0.25, 'a tap sets the anchor'); };
  /** One finger after that, doing only what the hints show (as the ghost does): does it finish? */
  const followHints = (law, id0 = 100) => {
    for (let n = 0; n < 10; n++) {
      const h = law.hint();
      if (!h) break;
      if (h.tap) { law.down({ ...h.tap, id: id0 + n }); law.up({ ...h.tap, id: id0 + n }); } else swipe(law, h, id0 + n);
    }
    t = 5;
    return law.done;
  };
  await tt.test('(1) a finger resting on the set or held anchor never stops a trace begun on the anchor from counting', () => {
    // (“hold the anchor with one finger while another traces”: the resting finger was taken for the one tracing, so
    // every later trace begun on the anchor counted for nothing, 0.25 for good while it rested)
    for (const how of ['set by a tap', 'held by a finger']) {
      const [law, a] = fresh();
      if (how === 'set by a tap') setByTap(law, a); else law.down({ ...a, id: 1 });
      law.down({ ...a, id: 2 }); law.move({ x: a.x + 1, y: a.y, id: 2 });   // finger 2 comes to rest on the anchor (a pixel's jitter)
      swipe(law, law.hint(), 3);                                            // finger 3 starts on the anchor, as the hint shows
      assert.equal(law.progress, 0.5, `${how}: finger 3 reached the first light`);
      law.move({ x: a.x, y: a.y + 1, id: 2 });
      swipe(law, law.hint(), 4);
      assert.equal(law.progress, 0.75, `${how}: and on from it`);
      swipe(law, law.hint(), 5);
      t = 5;
      assert.equal(law.done, true, `${how}: finished with finger 2 still resting`);
    }
  });
  await tt.test('(2) the anchor not set: two fingers land on it together, the second shifts a pixel, both lift: a tap, it is set', () => {
    // (the second took up a trace that was never cleared, so no tap could set the anchor again: stuck at 0)
    for (const lastUp of [1, 2]) {
      const [law, a] = fresh();
      law.down({ ...a, id: 1 }); law.down({ ...a, id: 2 }); law.move({ x: a.x + 2, y: a.y + 1, id: 2 });
      law.up({ ...a, id: 3 - lastUp }); law.up({ ...a, id: lastUp });
      assert.equal(law.progress, 0.25, `a two-finger tap sets the anchor (finger ${lastUp} up last)`);
      assert.ok(law.hint().from, 'the hint moves on to the first trace');
      assert.equal(followHints(law), true, 'and one finger following the hints finishes it');
    }
  });
  await tt.test('(3) the anchor set: finger B is tracing when finger A comes to rest on the anchor; B’s trace still counts', () => {
    // (A used to take the trace over)
    const [law, a] = fresh();
    setByTap(law, a);
    const from = { x: a.x + 50, y: a.y };
    law.down({ ...from, id: 2 });
    for (let i = 1; i <= 12; i++) { if (i === 3) law.down({ ...a, id: 3 }); if (i > 3) law.move({ x: a.x + (i % 2), y: a.y, id: 3 }); law.move({ ...steps(from, WAY[0], i), id: 2 }); }
    assert.equal(law.progress, 0.5, 'B reached the first light');
    law.up({ ...WAY[0], id: 2 });
    swipe(law, law.hint(), 4);
    assert.equal(law.progress, 0.75, 'A still resting, another finger traces on from the first light');
    law.up({ ...a, id: 3 });
    assert.equal(followHints(law), true);
  });
  await tt.test('(4) the anchor held by finger 1: finger 2 lands on the anchor and traces out from it, then on from each light', () => {
    const [law, a] = fresh();
    law.down({ ...a, id: 1 });
    assert.equal(law.progress, 0.25, 'held');
    swipe(law, { from: a, to: law.hint().to }, 2);
    assert.equal(law.progress, 0.5, 'a trace begun on the held anchor counts');
    for (let k = 0; k < 2; k++) swipe(law, law.hint(), 3 + k);
    assert.equal(law.progress, 1);
    law.up({ ...a, id: 1 });
    t = 5;
    assert.equal(law.done, true);
  });
  await tt.test('(5) one finger doing only what the ghost hints show finishes it', () => {
    const [law] = fresh();
    assert.equal(followHints(law, 1), true);
    assert.equal(law.hint(), null);
  });
  await tt.test('(6) a mouse (one pointer, id 1, for every press): click the anchor, then drag out from it to each light', () => {
    const [law, a] = fresh();
    setByTap(law, a, 1);
    for (let k = 0; k < 3; k++) swipe(law, law.hint(), 1);
    t = 5;
    assert.equal(law.done, true);
  });
  await tt.test('(7) Tap instead sets the anchor, then each press lights the next light', () => {
    const [law] = fresh();
    for (let i = 0; i < 4; i++) law.assist();
    assert.equal(law.progress, 1);
    t = 5;
    assert.equal(law.done, true);
  });
  await tt.test('(8) a light is reached only by a move over it, in order: never by a finger set down on it', () => {
    const [law, a] = fresh();
    setByTap(law, a);
    WAY.forEach((q, k) => { law.down({ ...q, id: 10 + k }); law.up({ ...q, id: 10 + k }); });
    assert.equal(law.progress, 0.25, 'the anchor set: set down and lifted on each light, none reached');
    law.down({ ...WAY[1], id: 20 }); law.move({ x: WAY[1].x + 1, y: WAY[1].y, id: 20 }); law.up({ ...WAY[1], id: 20 });
    assert.equal(law.progress, 0.25, 'a move on the second light does not reach it before the first');
    const [hold, b] = fresh();
    hold.down({ ...b, id: 1 });
    WAY.forEach((q, k) => { hold.down({ ...q, id: 10 + k }); hold.up({ ...q, id: 10 + k }); });
    assert.equal(hold.progress, 0.25, 'the anchor held: set down and lifted on each light, none reached');
    // and a drag begun on the anchor before it was ever set only sets it
    const [drag, c] = fresh();
    swipe(drag, { from: c, to: WAY[0] }, 1);
    assert.equal(drag.progress, 0.25);
    assert.ok(drag.hint().from, 'set: the first trace is next');
  });
  await tt.test('(9) every finger down explores: another finger set down elsewhere never stops a trace from counting', () => {
    // (only the finger down last traced: a thumb resting at the side of the stage took the trace over)
    for (const how of ['set by a tap', 'held by a finger']) {
      const [law, a] = fresh();
      if (how === 'set by a tap') setByTap(law, a); else law.down({ ...a, id: 1 });
      law.down({ ...a, id: 2 });
      for (let i = 1; i <= 12; i++) { if (i === 4) law.down({ x: 30, y: 430, id: 3 }); law.move({ ...steps(a, WAY[0], i), id: 2 }); }
      assert.equal(law.progress, 0.5, `${how}: finger 2 reached the first light, finger 3 resting at the side`);
      law.move({ x: 31, y: 430, id: 3 });
      law.up({ ...WAY[0], id: 2 });
      swipe(law, law.hint(), 4); swipe(law, law.hint(), 5);
      t = 5;
      assert.equal(law.done, true, `${how}: finished with finger 3 still down`);
    }
  });
  await tt.test('(10) each finger draws its own line: no line joins one finger’s trace to another’s', () => {
    // (one trail for every finger: a new trace was drawn joined on to where the last one ended)
    const noop = new Proxy(function () {}, { get: () => noop, apply: () => noop, set: () => true });
    const segs = []; let path = [], at = [0, 0];
    const g = new Proxy({
      createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: (s) => ({ width: String(s).length * 8 }),
      beginPath() { path = []; }, moveTo(x, y) { at = [x, y]; }, lineTo(x, y) { path.push(Math.hypot(x - at[0], y - at[1])); at = [x, y]; },
      stroke() { if (this.strokeStyle === rgba('#bfefff', 0.45)) segs.push(...path); },
    }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
    const had = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');
    globalThis.OffscreenCanvas = class { getContext() { return noop; } };
    try {
      const [law, a] = fresh();
      setByTap(law, a);
      swipe(law, law.hint(), 2);                                           // to the first light, and lifted there
      const from = { x: WAY[0].x, y: WAY[0].y + 50 };
      swipe(law, { from, to: WAY[1] }, 3);                                 // a new trace, begun 50 px from where that one ended
      law.down({ ...a, id: 4 });                                           // a finger resting on the anchor while another traces
      law.down({ ...WAY[1], id: 5 });
      for (let i = 1; i <= 12; i++) { law.move({ x: a.x + (i % 2), y: a.y, id: 4 }); law.move({ ...steps(WAY[1], WAY[2], i), id: 5 }); }
      assert.equal(law.progress, 1);
      law.frame(g, 0, 1 / 60);
      assert.ok(segs.length >= 30, `the traces are drawn (${segs.length} lines)`);
      const long = segs.filter((d) => d > 12);
      assert.deepEqual(long.map((d) => Math.round(d)), [], 'every line drawn is one finger’s step (a step here is 8 px at most)');
    } finally { if (had) Object.defineProperty(globalThis, 'OffscreenCanvas', had); else delete globalThis.OffscreenCanvas; }
  });
  await tt.test('held while another finger traced, then lifted first: the anchor is let go (as before), and a tap sets it again', () => {
    const [law, a] = fresh();
    law.down({ ...a, id: 1 });
    const from = { x: a.x + 60, y: a.y };
    law.down({ ...from, id: 2 }); for (let i = 1; i <= 12; i++) law.move({ ...steps(from, WAY[0], i), id: 2 });
    assert.equal(law.progress, 0.5, 'held, and the first light reached');
    law.up({ ...a, id: 1 }); law.up({ ...WAY[0], id: 2 });
    assert.equal(law.progress, 0.25, 'the anchor let go');
    assert.ok(law.hint().tap, 'tap the anchor');
    assert.equal(followHints(law), true, 'a tap sets it again, and the hints finish it');
  });
});
