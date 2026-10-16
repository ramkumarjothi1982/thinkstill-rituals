// Mobile QA fix round, review (16 Oct 2026): what the review of the fix round found, played through the real V3 host
// (src/v3/host.js) in node on a tiny DOM (helpers/v3-host-dom.mjs) with mock timers.
//   1. a line the host says a moment later (the closing move's, the finale's, a loop round's) still came after Finish
//      or Leave, over the next scene: it could replace the landing check-in's own line.
//   2. the first stage after begin() (the one the engine is made with) read the dock's top before the title compacted:
//      on a phone on its side it ran under the dock until the ResizeObserver laid it out again a frame later.
// Run: node --test hushmallow/tests/qa-mobile-review.test.mjs
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installHostDom, startHost } from './helpers/v3-host-dom.mjs';

const LANDING = 'Thank you for telling me. Want something gentler, or someone real to talk to?';
// 390×844: the title, the dock and its spot where the browser lays them out
const PHONE = { W: 390, H: 844, rects: { title: { left: 20, top: 66, width: 350, height: 160 }, dock: { left: 20, top: 730, width: 350, height: 100 }, spot: { left: 20, top: 732, width: 84, height: 96 } } };

let current = null;
async function play(code, opts = {}) {
  current?.ac.abort();                                     // one run at a time (they share globalThis.__hm3)
  mock.timers.reset();
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  const dom = installHostDom({ ...PHONE, ...opts });
  current = await startHost(dom, code);
  current.frames(1);
  return current;
}
/** The ritual ends now (Leave aborts; Finish is the end card's I'm done and a loop round's Finish), the landing says its
 *  line, and a few seconds go by: no line of the ended ritual's may come after it. */
async function endThenLanding(r, how) {
  if (how === 'leave') r.ac.abort();
  else if (how === 'finish') globalThis.__hm3.finishNow();
  else r.btn('.v3-done').click();
  const at = Date.now();
  r.ctx.say(LANDING, { who: 'landing' });
  r.frames(250);                                           // 4 s
  for (let i = 0; i < 5; i++) await Promise.resolve();     // (the run's promise settles)
  const after = r.said.filter((s) => s.at >= at).map((s) => s.text);
  return after;
}
const until = (r, fn, n = 2000) => { for (let i = 0; i < n && !fn(); i++) r.frames(1); assert.ok(fn(), 'reached'); };

test('1: no line of a ritual comes after Finish or Leave (the landing check-in keeps its own)', async (t) => {
  t.after(() => { current?.ac.abort(); mock.timers.reset(); });
  const cases = [
    // [what, ritual, how it ends, how far it is played first]
    ['the opening line (650 ms in), Finish at once', 'HM-0901', 'finish', () => {}],
    ['the closing move’s line (900 ms in), Leave', 'HM-0901', 'leave', (r) => assert.equal(r.tapThrough('play'), 'law')],
    ['the closing move’s line (900 ms in), Finish', 'HM-0901', 'finish', (r) => assert.equal(r.tapThrough('play'), 'law')],
    ['the finale’s line (500 ms in) after a closing move, Leave', 'HM-0901', 'leave', (r) => { r.tapThrough('play'); assert.equal(r.tapThrough('law'), 'finale'); }],
    ['the finale’s line (500 ms in) after a gate law, Leave', 'HM-0001', 'leave', (r) => assert.equal(r.tapThrough('play'), 'finale')],
    ['the finale’s line (500 ms in) after a gate law, Finish', 'HM-0001', 'finish', (r) => assert.equal(r.tapThrough('play'), 'finale')],
    ['a loop round’s line (900 ms into round 3), its Finish button', 'HM-0001', 'done', (r) => {
      r.tapThrough('play'); until(r, () => r.phase() === 'end');
      globalThis.__hm3.keepPlaying();
      r.frames(1);
      assert.equal(globalThis.__hm3.round, 2);
      r.tapThrough('play'); until(r, () => globalThis.__hm3.round === 3);
      assert.ok(r.btn('.v3-done'), 'a loop round has Finish');
    }],
  ];
  const late = [];
  for (const [what, code, how, before] of cases) {
    const r = await play(code);
    before(r);
    const after = await endThenLanding(r, how);
    if (after.length !== 1 || after[0] !== LANDING) late.push(`${what}: ${JSON.stringify(after)}`);
    if (how !== 'leave') assert.equal(r.done.value?.completed, true, `${what}: the run resolved`);
    mock.timers.reset();
  }
  assert.deepEqual(late, [], 'lines after the end');
});

test('1: after Finish or Leave the host no longer moves the Mallow (the end card’s placing, a relayout a frame later)', async (t) => {
  t.after(() => { current?.ac.abort(); mock.timers.reset(); });
  // the end card places the Mallow beside it a frame after it shows
  {
    const r = await play('HM-0001');
    r.tapThrough('play');
    until(r, () => r.phase() === 'end');
    globalThis.__hm3.finishNow();
    const n = r.world.places.length;
    r.frames(20);
    assert.deepEqual(r.world.places.slice(n), [], 'nothing placed after Finish');
    mock.timers.reset();
  }
  // the title or the dock changed size (the ResizeObserver lays out again on the next frame); the ritual is left first
  {
    const r = await play('HM-0901', { resizeObserver: true });
    r.frames(5);
    r.dom.observed(r.dom.title);
    r.ac.abort();
    const n = r.world.places.length;
    r.frames(20);
    assert.deepEqual(r.world.places.slice(n), [], 'nothing placed after Leave');
    mock.timers.reset();
  }
});

// the scene's column as the browser lays it out (Playwright, HM-0001): the top bar, the title in full and compacted,
// and the dock, which sits at the foot of the screen unless the title pushes it down (a phone on its side: the column
// is taller than the screen, so compacting the title brings the dock back up)
const COLUMN = [
  // [label, W, H, full title { top, height }, compact title, the dock's top at the foot, dock height, compacts]
  ['568×320 at text size Largest', 568, 320, [64, 176], [60, 147], 208, 96, true],
  ['568×320 with a notch’s insets (0, 47, 21, 47)', 568, 320, [64, 149], [60, 124], 187, 96, true],
  ['320×568 at text size Largest', 320, 568, [64, 204], [60, 175], 456, 96, true],
  ['390×844', 390, 844, [64, 163], [60, 137], 730, 98, false],
];
function columnDom([, W, H, full, comp, foot, dockH]) {
  const title = (el) => { const [top, height] = el.classList.contains('v3-compact') ? comp : full; return { left: 20, top, width: W - 40, height }; };
  const dockTop = () => { const r = title(document.querySelector('#scene .move-title')); return Math.max(foot, r.top + r.height); };
  return {
    W, H,
    rects: {
      bar: { left: 20, top: 14, width: W - 40, height: 44 }, title,
      dock: () => ({ left: 20, top: dockTop(), width: W - 40, height: dockH }),
      spot: () => ({ left: 20, top: dockTop() + 18, width: 70, height: 78 }),
    },
  };
}

test('2: the stage the engine is made with (the first, in begin()) already keeps clear of the dock, wherever compacting moves it', async (t) => {
  t.after(() => { current?.ac.abort(); mock.timers.reset(); });
  const { STAGE_GAP } = await import('../src/v3/stage-fit.js');
  const bad = [];
  for (const row of COLUMN) {
    current?.ac.abort(); mock.timers.reset();
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
    const dom = installHostDom(columnDom(row));
    current = await startHost(dom, 'HM-0001');
    current.frames(1);
    const st = { ...globalThis.__hm3.stage };
    const dockTop = dom.dock.getBoundingClientRect().top;
    const compact = dom.title.classList.contains('v3-compact');
    if (st.v !== 1) bad.push(`${row[0]}: not begin()'s own layout (v${st.v})`);
    if (compact !== row[7]) bad.push(`${row[0]}: compact ${compact}`);
    if (st.y + st.h > dockTop - STAGE_GAP + 0.01) bad.push(`${row[0]}: the stage ends at ${st.y + st.h}, ${st.y + st.h - dockTop} px past the dock's top (${dockTop})`);
    if (st.y < 58 + STAGE_GAP - 0.01) bad.push(`${row[0]}: the stage starts above the top bar (${st.y})`);
    // laid out again (a resize, the ResizeObserver): the same title and the same stage, every time (no flip-flop)
    for (let i = 0; i < 3; i++) dom.resize();
    current.frames(1);
    const st2 = globalThis.__hm3.stage;
    if (dom.title.classList.contains('v3-compact') !== compact) bad.push(`${row[0]}: the title flipped`);
    if (st2.y !== st.y || st2.h !== st.h) bad.push(`${row[0]}: laid out again, the stage moved (${st.y}+${st.h} → ${st2.y}+${st2.h})`);
  }
  assert.deepEqual(bad, []);
});
