// QA main sweep (blocking): the Mallow's face after something heavy. On the concerned stage the Mallow never grins —
// no idle hop with an open mouth, no wide-mouthed squeeze grin, no sparkle or big eyes — whatever touches it: the
// classic rig's own squeeze, MallowTouch's depth-driven squeeze face, a reaction (tap, release, double tap,
// celebrate), a touch persona's overlay, a stretch or a yawn. An ordinary visit still grins exactly as before.
//
// Runs the real rig.js (headless, as MallowTouch's face brain) against a minimal fake DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const noop = () => {};
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
const fakeCanvas = () => ({ width: 1, height: 1, style: {}, tabIndex: -1, setAttribute: noop, removeAttribute: noop, remove: noop,
  addEventListener: noop, removeEventListener: noop, getContext: () => ctx2d });
globalThis.document ||= { hidden: false, createElement: () => fakeCanvas(), addEventListener: noop, removeEventListener: noop };
globalThis.Image ||= class { constructor() { this.width = 8; this.height = 8; this.naturalWidth = 8; this.naturalHeight = 8; }
  set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); } get src() { return this._src; } };
globalThis.requestAnimationFrame ||= () => 0;
globalThis.cancelAnimationFrame ||= noop;

const { MallowRig, setStageFloor, getStageFloor } = await import('../src/mallows/rig.js');
const { STAGES, STAGE_LIMITS, stageLimits, applyStageLimits, resolveExpression } = await import('../src/mallows/expressions.js');
const { MALLOWS } = await import('../src/mallows/registry.js');
const { TOUCH_PERSONA } = await import('../src/mallows/touch/persona.js');

const IDS = ['pipzi', 'boppo', 'loomi', 'blubi', 'zuzu', 'glitzi', 'noomi'];
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

async function rigFor(id, stage) {
  const rig = new MallowRig({}, { id, headless: true, interactive: false, particles: true });
  await rig.loaded;
  if (stage) rig.setStage(stage, { quiet: true, instant: true });
  return rig;
}
/** Step the whole rig (springs, body, cycles, particles) for `secs` and return the largest face values seen. */
function run(rig, secs, each = null) {
  const peak = { smile: -9, open: -9, sparkle: -9, eyeScale: -9, hop: 0, parts: 0, kinds: new Set() };
  for (let t = 0; t < secs; t += 1 / 60) {
    each?.(t);
    rig._tick(1 / 60, t);
    const v = rig.val;
    peak.smile = Math.max(peak.smile, v.mouthSmile); peak.open = Math.max(peak.open, v.mouthOpen);
    peak.sparkle = Math.max(peak.sparkle, v.sparkle); peak.eyeScale = Math.max(peak.eyeScale, v.eyeScale);
    peak.hop = Math.max(peak.hop, Math.abs(rig.body.hop || 0), Math.abs(rig.body.hopV || 0));
    peak.parts = Math.max(peak.parts, rig.particles?.list?.length || 0);
    for (const o of rig.overlays) peak.kinds.add(o.kind);
  }
  return peak;
}
const ceil = (L, k, ref) => Math.max(L.max[k], ref[k]);
// (the face springs may overshoot their goal by a few hundredths on the way: the goal itself is held exactly)
const SPRING = 0.06;

test('face r1: the concerned stage carries its limits; applyStageLimits holds a grin down to the attentive face', () => {
  const L = stageLimits('concerned');
  assert.ok(L && L === STAGE_LIMITS.hushed, 'concerned names the hushed limits');
  assert.equal(stageLimits('neutral'), null);
  assert.equal(stageLimits('playful'), null);
  for (const id of IDS) {
    const s = STAGES.concerned, ref = resolveExpression(MALLOWS[id], s.mix, s.intensity, s.extra);
    // the resting concerned face itself is never changed by its own limits
    const same = applyStageLimits({ ...ref }, L, ref);
    for (const k of Object.keys(ref)) assert.equal(same[k], ref[k], `${id}.${k} untouched`);
    // a full grin put on top is held down
    const grin = applyStageLimits({ ...ref, mouthSmile: 1, mouthOpen: 1.2, sparkle: 2, eyeScale: 1.25, heartEyes: 1, closedCurve: -1, fxSpark: 1, tongue: 0.8 }, L, ref);
    assert.ok(grin.mouthSmile <= 0.2 + 1e-9 && grin.mouthOpen <= 0.1 + 1e-9, `${id}: smile ${grin.mouthSmile} open ${grin.mouthOpen}`);
    assert.ok(grin.sparkle <= ceil(L, 'sparkle', ref) + 1e-9 && grin.eyeScale <= 1 + 1e-9 && grin.heartEyes === 0 && grin.fxSpark === 0 && grin.tongue === 0);
    assert.ok(grin.closedCurve >= Math.min(L.min.closedCurve, ref.closedCurve) - 1e-9, `${id}: no happy ^ ^ arc`);
  }
});

test('face r1: on the concerned stage no squeeze grins — MallowTouch depth, the classic rig press, persona faces, stretch', async () => {
  for (const id of IDS) {
    const rig = await rigFor(id, 'concerned');
    assert.equal(rig.hushed, true, `${id} hushed`);
    const ref = rig._limits().ref, L = rig._limits().lim;
    // MallowTouch: a full-depth squeeze (the persona's own face hook too: Pipzi's sparks, Glitzi's static…)
    rig.opts.touchFace = (goal, T, r) => TOUCH_PERSONA[id]?.face?.(goal, T, r);
    rig.setTouch({ depth: 1, stretch: 1, held: 3 });
    let g = rig._composeTargets(1 / 60);
    assert.ok(g.mouthSmile <= ceil(L, 'mouthSmile', ref) + 1e-9, `${id} touch smile ${g.mouthSmile}`);
    assert.ok(g.mouthOpen <= ceil(L, 'mouthOpen', ref) + 1e-9, `${id} touch open ${g.mouthOpen}`);
    assert.ok(g.sparkle <= ceil(L, 'sparkle', ref) + 1e-9 && g.eyeScale <= 1 + 1e-9, `${id} touch eyes`);
    assert.equal(g.fxSpark, 0, `${id} no sparks`);
    assert.ok(g.cheekPuff > 0.3, `${id}: still reads as a squeeze (cheeks puff)`);
    // a long stretch ("ooh"): the mouth stays closed
    rig.setTouch({ depth: 0, stretch: 1.5, held: 0 });
    g = rig._composeTargets(1 / 60);
    assert.ok(g.mouthOpen <= ceil(L, 'mouthOpen', ref) + 1e-9, `${id} stretch open ${g.mouthOpen}`);
    rig.setTouch(null);
    // the classic rig's own held squeeze
    rig.press = { squeezed: true, t0: 0, x: 0, y: 0, x0: 0, y0: 0 };
    g = rig._composeTargets(1 / 60);
    assert.ok(g.mouthSmile <= ceil(L, 'mouthSmile', ref) + 1e-9 && g.mouthOpen <= ceil(L, 'mouthOpen', ref) + 1e-9, `${id} press smile ${g.mouthSmile} open ${g.mouthOpen}`);
    rig.press = null;
  }
});

test('face r1: on the concerned stage reactions keep the face soft — no hop, no sparkle, nothing burst round the face', async () => {
  for (const id of IDS) {
    const rig = await rigFor(id, 'concerned');
    const L = rig._limits().lim, ref = rig._limits().ref;
    for (const kind of ['tap', 'release', 'doubleTap', 'celebrate', 'hop', 'gasp', 'success']) {
      rig.react(kind);
      const p = run(rig, 1.2);
      assert.ok(p.smile <= ceil(L, 'mouthSmile', ref) + SPRING, `${id} ${kind}: smile ${p.smile.toFixed(2)}`);
      assert.ok(p.open <= ceil(L, 'mouthOpen', ref) + SPRING, `${id} ${kind}: open ${p.open.toFixed(2)}`);
      assert.ok(p.sparkle <= ceil(L, 'sparkle', ref) + SPRING && p.eyeScale <= 1 + SPRING, `${id} ${kind}: eyes`);
      assert.equal(p.hop, 0, `${id} ${kind}: no hop`);
      assert.equal(p.parts, 0, `${id} ${kind}: no particles`);
    }
    // a persona overlay (Boppo's jiggle bounce, Blubi's happy tears, MallowTouch's jiggle grin)
    rig.overlay({ mouthOpen: 0.9, mouthSmile: 1, eyeOpen: 0, closedCurve: -1, blush: 2.3, tears: 0.4, bounce: 0.5 }, { dur: 1.2, fx: { kind: 'drop', n: 8 } });
    const p = run(rig, 1.4);
    assert.ok(p.smile <= ceil(L, 'mouthSmile', ref) + SPRING && p.open <= ceil(L, 'mouthOpen', ref) + SPRING && p.parts === 0, `${id} overlay`);
  }
});

test('face r1: on the concerned stage the idle is a quiet look round (15 s with no touch never opens the mouth)', async () => {
  for (const id of IDS) {
    const rig = await rigFor(id, 'concerned');
    const L = rig._limits().lim, ref = rig._limits().ref;
    rig.cycles.idle = 0.5;   // the signature idle is due almost at once (and again every 5-10 s)
    const p = run(rig, 15);
    assert.ok(p.kinds.has('idle-quiet'), `${id}: it still idles (a look and a blink)`);
    assert.ok(!p.kinds.has('idle'), `${id}: never the signature idle (Pipzi's open-mouthed hop)`);
    assert.ok(p.open <= ceil(L, 'mouthOpen', ref) + SPRING, `${id}: idle open ${p.open.toFixed(2)}`);
    assert.ok(p.smile <= ceil(L, 'mouthSmile', ref) + SPRING, `${id}: idle smile ${p.smile.toFixed(2)}`);
    assert.equal(p.hop, 0, `${id}: no idle hop`);
    assert.equal(p.parts, 0, `${id}: no sparks`);
  }
});

test('face r1: an ordinary visit still grins as before (the signature idle and the squeeze face)', async () => {
  const rig = await rigFor('pipzi', 'neutral');
  assert.equal(rig.hushed, false);
  rig.cycles.idle = 0.2;
  const p = run(rig, 2);
  assert.ok(p.kinds.has('idle'), 'the signature idle');
  assert.ok(p.open > 0.9, `Pipzi's idle opens the mouth (${p.open.toFixed(2)})`);
  rig.setTouch({ depth: 1, stretch: 1 });
  const g = rig._composeTargets(1 / 60);
  assert.ok(g.mouthSmile > 0.9 && g.mouthOpen > 0.7, 'the squeeze grin');
  rig.setTouch(null);
  const b = await rigFor('boppo', 'neutral');
  b.react('doubleTap');
  assert.ok(run(b, 1).hop > 0, 'Boppo still hops');
});

test('face r1: a heavy visit\'s floor — every stage lands on concerned, a new Mallow starts on it, and clears', async () => {
  try {
    setStageFloor('concerned');
    assert.equal(getStageFloor(), 'concerned');
    const rig = await rigFor('pipzi');
    assert.equal(rig.stage, 'concerned', 'a new rig arrives on the attentive face');
    assert.ok(rig.val.mouthOpen < 0.1, 'from its first frame (Pipzi\'s own resting mouth is open)');
    rig.setStage('curious');
    assert.equal(rig.stage, 'concerned', 'the plans page\'s curious face lands on concerned');
    rig.setStage('comforting', { quiet: true });
    assert.equal(rig.stage, 'concerned', 'the support sheet\'s heart eyes too');
    // a plain emotion (a ritual's mix) keeps its expression, held inside the limits
    rig.setEmotion({ happy: 1 }, 0.9, { quiet: true });
    assert.equal(rig.hushed, true);
    const g = rig._composeTargets(1 / 60);
    assert.ok(g.mouthSmile <= 0.2 + 1e-9 && g.mouthOpen <= 0.1 + 1e-9, `happy under the floor: ${g.mouthSmile} ${g.mouthOpen}`);
    rig.react('celebrate');
    assert.equal(run(rig, 1.5).hop, 0, 'the plans page\'s celebrate has no hop');
  } finally { setStageFloor(null); }
  assert.equal(getStageFloor(), null);
  const free = await rigFor('pipzi');
  free.setStage('curious');
  assert.equal(free.stage, 'curious', 'without a floor stages are as asked');
});

test('face r1: MallowTouch personas keep the hug soft (Boppo: no bounce; no bursts) and a swapped Mallow keeps the stage', () => {
  const bursts = [];
  const rig = { hushed: true, opts: { reducedMotion: false }, body: { grounded: true, hopV: 0 }, react: noop, particles: { burst: (f) => bursts.push(f) } };
  TOUCH_PERSONA.boppo.onRelease({ rig }, { depth: 0.9 });
  assert.equal(rig.body.hopV, 0, 'no bounce after a deep squeeze');
  assert.equal(rig.body.grounded, true);
  TOUCH_PERSONA.pipzi.onRelease({ rig }, { depth: 0.9 });
  TOUCH_PERSONA.loomi.onMassage({ rig });
  assert.equal(bursts.length, 0, 'no sparks, pops or rings');
  rig.hushed = false;
  TOUCH_PERSONA.boppo.onRelease({ rig }, { depth: 0.9 });
  assert.ok(rig.body.hopV > 0 && bursts.length > 0, 'an ordinary visit bounces and pops');
  // a world's host taking the stage (setMallow → _swapIn) carries the stage itself, not only its mix
  const mt = read('src/mallows/touch/mallow-touch.js');
  assert.match(mt, /if \(old\.stage\) rig\.setStage\(old\.stage, \{ instant: true, quiet: true \}\);/);
});
