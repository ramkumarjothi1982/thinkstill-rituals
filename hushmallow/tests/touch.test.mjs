// MallowTouch: the soft-body solver, the gesture reader, the touch personas
// and the rig seams they rely on. Run: node --test hushmallow/tests/touch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SoftBody, SUBSTEP, MAX_SUBSTEPS } from '../src/mallows/touch/softbody.js';
import { TouchReader, GESTURE } from '../src/mallows/touch/gestures.js';
import { TOUCH_PERSONA } from '../src/mallows/touch/persona.js';
import { MALLOWS, MALLOW_IDS, maskAlpha, MASK_SIZE } from '../src/mallows/registry.js';
import { faceRectSrc, facePartsSrc, addTicker, removeTicker } from '../src/mallows/rig.js';

const BOPPO = TOUCH_PERSONA.boppo.material;
const body = (o = {}) => new SoftBody({ cols: 21, rows: 21, aspect: 0.99, material: BOPPO, ...o });
const run = (sb, frames, fn, dt = 1 / 60) => { for (let f = 0; f < frames; f++) { fn?.(f); sb.step(dt); } };
const finite = (a) => a.every((v) => Number.isFinite(v));
const topY = (sb) => { let y = Infinity; for (let k = 0; k < sb.n; k++) y = Math.min(y, sb.positions[2 * k + 1]); return y; };
const press = (sb, x, y, frames = 90) => { sb.grab(1, x, y, 0.3); run(sb, frames, (f) => sb.press(1, x, y, Math.min(1, f / 30), 0.21)); };

test('softbody: the lattice, uvs and culled mesh are well formed', () => {
  const sb = body({ uvRect: [0.1, 0.2, 0.9, 0.95], mask: (u, v) => ((u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.25 ? 1 : 0) });
  assert.equal(sb.n, 441);
  assert.equal(sb.positions.length, 882);
  assert.equal(sb.triAll.length, 20 * 20 * 6);
  assert.ok(sb.indices.length < sb.triAll.length && sb.indices.length > 0, 'mask culls the transparent corners');
  assert.ok(Math.max(...sb.indices) < sb.n);
  assert.deepEqual([sb.uvs[0], sb.uvs[1]].map((v) => +v.toFixed(3)), [0.1, 0.2]);
  assert.deepEqual([sb.uvs[2 * 440], sb.uvs[2 * 440 + 1]].map((v) => +v.toFixed(3)), [0.9, 0.95]);
  assert.equal(sb.boundary.length, 80);
  assert.ok(Math.abs(sb.restArea - 0.99) < 1e-6, 'rest area = aspect × 1');
});

test('softbody: rest is perfectly still (idle shows the untouched art)', () => {
  const sb = body();
  run(sb, 600);
  assert.ok(sb.energy < 1e-12, `energy ${sb.energy}`);
  for (let k = 0; k < sb.positions.length; k++) assert.ok(Math.abs(sb.positions[k] - sb.rest[k]) < 1e-6);
});

test('softbody: a squeeze dents, bulges the sides, then settles back to rest', () => {
  const sb = body();
  const w0 = sb.bounds().w;
  press(sb, 0.5, 0.4);
  const b = sb.bounds();
  assert.ok(b.w > w0 * 1.02, `sides bulge: ${b.w.toFixed(3)} vs ${w0.toFixed(3)}`);
  sb.computeShading();
  let maxC = 0;
  for (let k = 0; k < sb.n; k++) maxC = Math.max(maxC, sb.shade[3 * k]);
  assert.ok(maxC > 0.5, `the dent compresses the skin under the finger (${maxC.toFixed(2)})`);
  sb.release(1);
  run(sb, 300);
  assert.ok(sb.energy < 1e-4, `settled: ${sb.energy}`);
  assert.ok(Math.abs(sb.bounds().w - w0) < 0.002);
});

test('softbody: release rebounds past rest (delayed jelly overshoot), reduced motion does not', () => {
  for (const rm of [false, true]) {
    const sb = body({ reducedMotion: rm });
    sb.setRest({ squash: 0.1 });
    press(sb, 0.5, 0.45, 60);
    sb.release(1);
    sb.setRest({});
    if (!rm) sb.deform('squash', -2.4);
    let minTop = Infinity;
    run(sb, 120, () => { minTop = Math.min(minTop, topY(sb)); });
    if (rm) assert.ok(minTop > -0.01, `reduced motion: no overshoot (${minTop.toFixed(3)})`);
    else assert.ok(minTop < -0.04, `pops up past its rest height (${minTop.toFixed(3)})`);
    run(sb, 240);
    assert.ok(sb.energy < 1e-3, `settles (${rm}) ${sb.energy}`);
  }
});

test('softbody: area is preserved within tolerance under squeeze, stretch and squash', () => {
  const A0 = body().restArea;
  // a two-finger stretch narrows the waist instead of growing
  const sb = body();
  sb.grab(1, 0.3, 0.5, 0.18); sb.grab(2, 0.7, 0.5, 0.18);
  run(sb, 90, (f) => { const d = Math.min(0.16, f * 0.004); sb.move(1, 0.3 - d, 0.5, 1); sb.move(2, 0.7 + d, 0.5, 1); });
  const b = sb.bounds();
  assert.ok(b.w > 1.1, `stretched wider (${b.w.toFixed(3)})`);
  assert.ok(Math.abs(sb.area - A0) / A0 < 0.08, `stretch area ${sb.area.toFixed(3)} vs ${A0.toFixed(3)}`);
  assert.ok(b.h < 0.99, 'and shorter: volume goes somewhere');
  // a squeeze adds only the dent volume back
  const sq = body();
  press(sq, 0.5, 0.45);
  assert.ok(sq.area >= A0 * 0.98 && sq.area < A0 * 1.15, `squeeze area ${sq.area.toFixed(3)}`);
  // squash rest shapes keep close to unit area
  const r = body().setRest({ squash: 0.3 });
  assert.ok(Math.abs(r.restArea - A0) / A0 < 0.12);
});

test('softbody: no NaN, no explosion under extreme input', () => {
  const sb = body();
  sb.grab(1, 0.5, 0.5, 0.3);
  sb.grab(2, 0.2, 0.2, 0.3);
  sb.grab(3, NaN, 0.2, 0.3);           // ignored
  sb.press(4, Infinity, 0, 1, 0.2);    // ignored
  for (let f = 0; f < 240; f++) {
    const s = f % 2 ? 1 : -1;
    sb.move(1, 0.5 + s * 40, 0.5 - s * 25, 1);        // teleporting far off the body
    sb.press(2, 0.2 + s * 0.4, 0.2, 1, 0.2);
    sb.move(2, NaN, 3, 1);                             // ignored
    sb.impulse(s * 500, -s * 500);
    sb.deform('squash', s * 1e9);
    sb.swirl(0.5, 0.5, 0.2, s * 1e6);
    sb.step(f % 3 ? 1 / 60 : 0.5);
  }
  assert.ok(finite(sb.positions) && finite(sb.vel), 'positions and velocities stay finite');
  assert.ok(Number.isFinite(sb.energy));
  sb.releaseAll();
  run(sb, 900);
  assert.ok(finite(sb.positions));
  assert.ok(sb.energy < 1e-3, `recovers to rest: ${sb.energy}`);
  // zero, negative and huge time steps
  assert.equal(sb.step(0), 0); assert.equal(sb.step(-1), 0); assert.equal(sb.step(NaN), 0);
  assert.equal(sb.step(10), MAX_SUBSTEPS, 'a stalled frame runs at most 4 substeps');
});

test('softbody: deterministic, fixed substeps, the same at 30/60/120 Hz', () => {
  const script = (hz) => {
    const sb = body();
    const frames = Math.round(2 * hz);
    sb.grab(1, 0.5, 0.4, 0.3);
    for (let f = 0; f < frames; f++) {
      const t = f / hz;
      if (t < 1) { sb.press(1, 0.5 + 0.1 * Math.sin(t * 6), 0.4, Math.min(1, t * 2), 0.21); sb.move(1, 0.5 + 0.1 * Math.sin(t * 6), 0.4, 0.4); }
      else if (sb.ptr.size) sb.release(1, { vx: 1, vy: -0.5 });
      sb.step(1 / hz);
    }
    return sb.positions;
  };
  const a = script(60), b = script(60);
  assert.deepEqual(Array.from(a), Array.from(b), 'bit-identical replays');
  const c = script(120), d = script(30);
  let e1 = 0, e2 = 0;
  for (let k = 0; k < a.length; k++) { e1 = Math.max(e1, Math.abs(a[k] - c[k])); e2 = Math.max(e2, Math.abs(a[k] - d[k])); }
  assert.ok(e1 < 0.03 && e2 < 0.05, `frame-rate independent (120 Hz Δ ${e1.toFixed(4)}, 30 Hz Δ ${e2.toFixed(4)})`);
  assert.equal(SUBSTEP, 1 / 120);
});

test('softbody: a press near the top edge pushes a real notch into the outline', () => {
  const sb = body();
  const k = 10; // top-centre particle
  press(sb, 0.5, 0.08);
  assert.ok(sb.positions[2 * k + 1] > 0.04, `top edge pushed down ${sb.positions[2 * k + 1].toFixed(3)}`);
  const side = body();
  press(side, 0.06, 0.55);
  const left = side.positions[2 * (11 * 21)];
  assert.ok(left > 0.03 && left < 0.25, `side dents in smoothly (${left.toFixed(3)})`);
});

test('softbody: a fast jiggle keeps the outline smooth (no crumpling)', () => {
  const sb = body();
  sb.grab(1, 0.5, 0.55, 0.3);
  const turn = (P, B, t) => { const m = B.length, a = B[(t + m - 1) % m], b = B[t], c = B[(t + 1) % m];
    const ux = P[2 * b] - P[2 * a], uy = P[2 * b + 1] - P[2 * a + 1], vx = P[2 * c] - P[2 * b], vy = P[2 * c + 1] - P[2 * b + 1];
    return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); };
  let worst = 0;
  run(sb, 180, (f) => {
    const x = 0.5 + 0.09 * Math.sin(2 * Math.PI * 5 * f / 60);
    sb.press(1, x, 0.55, 0.8, 0.21); sb.move(1, x, 0.55, 0.4);
    for (let t = 0; t < sb.boundary.length; t++) worst = Math.max(worst, Math.abs(turn(sb.positions, sb.boundary, t) - turn(sb.rest, sb.boundary, t)));
  });
  assert.ok(worst < 0.6, `outline kink ${worst.toFixed(2)} rad at a 5 Hz jiggle`);
});

test('softbody: rest shape follows the expression (squash, breath, droop, cheek puff, shrink, lean)', () => {
  const sb = body();
  const h0 = sb.bounds().h;
  sb.setRest({ squash: 0.2 });
  let b = (() => { const s = body().setRest({ squash: 0.2 }); s.reset(); return s.bounds(); })();
  assert.ok(b.h < h0 && b.w > 1, 'squash: shorter and wider');
  const s2 = body().setRest({ breath: 0.014 }); s2.reset(); assert.ok(s2.bounds().h > h0, 'breath in: taller');
  const s3 = body().setRest({ shrink: 1 }); s3.reset(); assert.ok(s3.bounds().w < 0.9);
  const s4 = body().setRest({ lean: 0.2 }); s4.reset(); assert.ok(s4.positions[2 * 10] > s4.q0[2 * 10] + 0.1, 'lean tips the top');
  const s5 = body().setRest({ puffL: 1, puffR: 1, cheekV: 0.65 }); s5.reset();
  const E = s5.rowExtents(); assert.ok(E[3 * 13 + 2] - E[3 * 13 + 1] > E[3 * 2 + 2] - E[3 * 2 + 1], 'cheeks puff at cheek height');
  for (const s of [s2, s3, s4, s5]) { run(s, 120); assert.ok(s.energy < 1e-6, 'a rest shape is an equilibrium'); }
});

test('softbody: outputs (bounds, rowExtents, locate, sample, shading) agree', () => {
  const sb = body();
  const b = sb.bounds();
  assert.ok(Math.abs(b.x0) < 1e-6 && Math.abs(b.x1 - 0.99) < 1e-6 && Math.abs(b.y1 - 1) < 1e-6);
  const E = sb.rowExtents();
  assert.equal(E.length, 63);
  assert.ok(Math.abs(E[3 * 20] - 1) < 1e-6 && Math.abs(E[3 * 20 + 2] - 0.99) < 1e-6);
  const l = sb.locate(0.495, 0.5);
  assert.ok(l && Math.abs(l.u - 0.5) < 1e-3 && Math.abs(l.v - 0.5) < 1e-3);
  assert.equal(sb.locate(-0.2, 0.5), null);
  const p = sb.sample(0.25, 0.75);
  assert.ok(Math.abs(p.x - 0.2475) < 1e-6 && Math.abs(p.y - 0.75) < 1e-6);
  const S = sb.computeShading();
  assert.ok(S.every((v) => Math.abs(v) < 1e-6), 'no shading at rest: the approved art is untouched');
});

test('softbody: a pull past the material limit slips', () => {
  const sb = body();
  sb.grab(1, 0.9, 0.5, 0.3);
  let slipped = false;
  run(sb, 90, (f) => { sb.move(1, 0.9 + f * 0.01, 0.5, 1); if (sb.lastSlip) slipped = true; });
  assert.ok(slipped, 'slip reported');
  assert.ok(sb.ptr.get(1).fade < 0.01, 'and the grip has let go');
});

// ------------------------------------------------------------ gestures --
const reader = (o) => { const r = new TouchReader({ hit: () => true, bodySize: () => 240, centre: () => ({ x: 100, y: 100 }), ...o }); const ev = []; r.on('*', (k, d) => ev.push([k, d])); return [r, ev]; };
const kinds = (ev) => ev.map(([k]) => k);

test('gestures: hold depth grows with time (no pressure needed) and kneading deepens it', () => {
  const [r] = reader();
  r.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 });
  r.update(GESTURE.holdTau);
  const d1 = r.state.depth;
  assert.ok(Math.abs(d1 - (1 - Math.exp(-1))) < 0.02, `depth after τ: ${d1.toFixed(3)}`);
  r.update(3);
  assert.ok(r.state.depth > 0.99);
  const [k] = reader();
  k.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 });
  for (let i = 1; i <= 15; i++) k.pointer({ type: 'move', id: 1, x: 100 + (i % 2) * 6, y: 100, t: 0.2 + i * 0.01 });
  k.update(0.35);
  const [s] = reader(); s.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 }); s.update(0.35);
  assert.ok(k.state.depth > s.state.depth + 0.05, 'kneading presses deeper');
});

test('gestures: tap, double tap and the single-tap delay', () => {
  const [r, ev] = reader();
  r.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 });
  r.pointer({ type: 'up', id: 1, x: 101, y: 100, t: 0.1 });
  r.update(0.2);
  assert.ok(!kinds(ev).includes('tap'), 'waits for a second tap');
  r.update(0.5);
  assert.ok(kinds(ev).includes('tap'));
  const [d, ev2] = reader();
  d.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 }); d.pointer({ type: 'up', id: 1, x: 100, y: 100, t: 0.08 });
  d.pointer({ type: 'down', id: 2, x: 102, y: 101, t: 0.2 }); d.pointer({ type: 'up', id: 2, x: 102, y: 101, t: 0.27 });
  d.update(1);
  assert.ok(kinds(ev2).includes('doubleTap'));
  assert.ok(!kinds(ev2).includes('tap'), 'a double tap is not also a tap');
});

test('gestures: flick needs speed and distance; a pause before letting go is not a flick', () => {
  const [r, ev] = reader();
  r.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 });
  for (let i = 1; i <= 6; i++) r.pointer({ type: 'move', id: 1, x: 100 + i * 20, y: 100, t: 0.1 + i * 0.012 });
  r.pointer({ type: 'up', id: 1, x: 220, y: 100, t: 0.175 });
  const up = ev.find(([k]) => k === 'up')[1];
  assert.equal(up.kind, 'flick');
  assert.ok(up.speed > GESTURE.flickSpeed);
  const [p, ev2] = reader();
  p.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 });
  for (let i = 1; i <= 6; i++) p.pointer({ type: 'move', id: 1, x: 100 + i * 20, y: 100, t: 0.1 + i * 0.012 });
  p.pointer({ type: 'up', id: 1, x: 220, y: 100, t: 0.6 });
  assert.equal(ev2.find(([k]) => k === 'up')[1].kind, 'release');
});

test('gestures: pull, two-finger stretch (clamped) and twist', () => {
  const [r, ev] = reader();
  r.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 });
  r.pointer({ type: 'move', id: 1, x: 140, y: 100, t: 0.5 });
  assert.equal(r.pointers[0].pull, 1);
  const [s, ev2] = reader();
  s.pointer({ type: 'down', id: 1, x: 80, y: 100, t: 0 });
  s.pointer({ type: 'down', id: 2, x: 120, y: 100, t: 0 });
  assert.ok(kinds(ev2).includes('stretchStart'));
  s.pointer({ type: 'move', id: 1, x: 60, y: 100, t: 0.1 }); s.pointer({ type: 'move', id: 2, x: 140, y: 100, t: 0.1 });
  s.update(0.1);
  assert.equal(s.state.stretch, GESTURE.stretchMax, 'clamped to 1.6');
  s.pointer({ type: 'move', id: 2, x: 100, y: 140, t: 0.2 }); s.update(0.2);
  assert.ok(s.state.twist > 0.5, 'twist reads the axis turning');
  s.pointer({ type: 'up', id: 1, x: 60, y: 100, t: 0.3 });
  assert.ok(kinds(ev2).includes('stretchEnd'));
  void ev;
});

test('gestures: jiggle, circular massage and stroke', () => {
  const [j, ev] = reader();
  j.pointer({ type: 'down', id: 1, x: 100, y: 100, t: 0 });
  for (let i = 1; i <= 24; i++) j.pointer({ type: 'move', id: 1, x: 100 + (i % 2 ? 18 : -18), y: 100, t: 0.3 + i * 0.03 });
  assert.ok(kinds(ev).includes('jiggle'));
  const [m, ev2] = reader();
  m.pointer({ type: 'down', id: 1, x: 140, y: 100, t: 0 });
  for (let i = 1; i <= 120; i++) { const a = (i / 40) * Math.PI * 2; m.pointer({ type: 'move', id: 1, x: 100 + Math.cos(a) * 40, y: 100 + Math.sin(a) * 40, t: 0.2 + i * 0.02 }); }
  m.update(2.6);
  const ms = ev2.filter(([k]) => k === 'massage');
  assert.ok(ms.length >= 3, `massage ticks: ${ms.length}`);
  assert.equal(ms.at(-1)[1].dir, 1, 'clockwise on screen');
  assert.ok(m.state.turns > 1.5, `turns ${m.state.turns.toFixed(2)}`);
  assert.ok(!kinds(ev2).includes('jiggle'), 'circling is not jiggling');
  const [s, ev3] = reader();
  s.pointer({ type: 'down', id: 1, x: 40, y: 100, t: 0 });
  for (let i = 1; i <= 10; i++) s.pointer({ type: 'move', id: 1, x: 40 + i * 16, y: 100 + i, t: 0.02 + i * 0.025 });
  const st = ev3.find(([k]) => k === 'stroke');
  assert.ok(st, 'stroke detected');
  assert.ok(st[1].dx > 0.9, 'stroke direction');
  // a slow drag after resting the finger is a pull, not a stroke
  const [p, ev4] = reader();
  p.pointer({ type: 'down', id: 1, x: 40, y: 100, t: 0 });
  for (let i = 1; i <= 10; i++) p.pointer({ type: 'move', id: 1, x: 40 + i * 16, y: 100, t: 0.6 + i * 0.05 });
  assert.ok(!kinds(ev4).includes('stroke'));
});

test('gestures: mouse Shift-drag and trackpad pinch stretch; keyboard squeezes and taps', () => {
  const [r, ev] = reader();
  r.pointer({ type: 'down', id: 9, x: 100, y: 100, t: 0, shift: true, mouse: true });
  assert.equal(r.ptrs.size, 2, 'two virtual fingers');
  r.pointer({ type: 'move', id: 9, x: 160, y: 100, t: 0.2 }); r.update(0.2);
  assert.ok(r.state.stretch > 1.3);
  r.pointer({ type: 'up', id: 9, x: 160, y: 100, t: 0.3 });
  assert.equal(r.ptrs.size, 0);
  const [w] = reader();
  w.wheel({ x: 100, y: 100, deltaY: -30, t: 0 }); w.wheel({ x: 100, y: 100, deltaY: -30, t: 0.05 }); w.update(0.06);
  assert.ok(w.state.stretch > 1.5, 'pinch out stretches');
  w.update(0.5);
  assert.equal(w.ptrs.size, 0, 'pinch ends when the wheel stops');
  const [k, ev2] = reader();
  k.key({ type: 'down', key: ' ', t: 0 }); k.update(1);
  assert.ok(k.state.depth > 0.8, 'holding Space squeezes');
  k.key({ type: 'up', key: ' ', t: 1.1 });
  k.key({ type: 'down', key: 'Enter', t: 2 }); k.update(3);
  assert.ok(kinds(ev2).includes('tap'));
  void ev;
});

test('gestures: off-body touches are ignored, at most two fingers', () => {
  const [r] = reader({ hit: (x) => x < 200 });
  assert.equal(r.pointer({ type: 'down', id: 1, x: 300, y: 100, t: 0 }), false);
  assert.equal(r.pointer({ type: 'down', id: 2, x: 100, y: 100, t: 0 }), true);
  r.pointer({ type: 'down', id: 3, x: 110, y: 100, t: 0 });
  assert.equal(r.pointer({ type: 'down', id: 4, x: 120, y: 100, t: 0 }), false);
  assert.equal(r.pointer({ type: 'move', id: 2, x: NaN, y: 0, t: 0.1 }), false);
});

// ------------------------------------------------------------ personas --
test('personas: all seven Mallows have the audited material and stay in range', () => {
  assert.deepEqual(Object.keys(TOUCH_PERSONA).sort(), [...MALLOW_IDS].sort());
  const audit = { glitzi: [0.32, 0.7, 0.15, 0.9, 0.26, 0.3], zuzu: [0.22, 0.6, 0.3, 0.95, 0.32, 0.4], blubi: [0.16, 0.5, 0.35, 0.965, 0.38, 0.45],
    boppo: [0.28, 0.55, 0.3, 0.94, 0.36, 0.4], pipzi: [0.26, 0.6, 0.3, 0.95, 0.34, 0.42], loomi: [0.2, 0.55, 0.25, 0.9, 0.3, 0.38], noomi: [0.14, 0.45, 0.4, 0.92, 0.4, 0.4] };
  for (const [id, p] of Object.entries(TOUCH_PERSONA)) {
    const m = p.material;
    assert.deepEqual([m.kG, m.kL, m.beta, m.damp, m.dMax, m.maxStretch], audit[id], id);
    // every persona's material makes a stable, settling body
    const sb = new SoftBody({ material: m });
    sb.deform('shear', 3); sb.deform('squash', -2.4);
    run(sb, 360);
    assert.ok(sb.energy < 1e-4, `${id} settles`);
  }
  // Blubi wobbles longest, Glitzi is the densest
  const ring = (id) => { const sb = new SoftBody({ material: TOUCH_PERSONA[id].material }); sb.deform('shear', 2); let e = 0; run(sb, 60); e = sb.energy; return e; };
  assert.ok(ring('blubi') > ring('glitzi'));
});

test('personas: face hooks only touch existing expression params', async () => {
  const { PARAMS } = await import('../src/mallows/expressions.js');
  const rig = { body: { glitchBurst: 0, burstRows: [] }, time: 10, opts: { reducedMotion: false, audio: null }, cycles: {}, id: 'x' };
  for (const [id, p] of Object.entries(TOUCH_PERSONA)) {
    if (!p.face) continue;
    const goal = {}; for (const k of Object.keys(PARAMS)) goal[k] = PARAMS[k][0];
    const keys = new Set(Object.keys(goal));
    p.face(goal, { depth: 0.8, stretch: 1.4, speed: 900, calm: 0.5, jiggle: 0.5, held: 3.5, massageRate: 6, twistRate: 1 }, rig);
    for (const k of Object.keys(goal)) assert.ok(keys.has(k), `${id} adds unknown param ${k}`);
    for (const v of Object.values(goal)) assert.ok(Number.isFinite(v), id);
  }
});

// ----------------------------------------------------------- rig seams --
test('rig: the face rect covers every pixel the face-cleaned body differs from the approved art', () => {
  // measured with numpy: |original − body| > 8 bbox per Mallow, source px [x0, x1, y0, y1]
  const diff = { glitzi: [55, 327, 149, 296], blubi: [79, 346, 161, 339], zuzu: [39, 336, 105, 333], boppo: [57, 320, 92, 298],
    pipzi: [63, 369, 99, 362], loomi: [62, 306, 159, 310], noomi: [82, 361, 207, 325] };
  for (const id of MALLOW_IDS) {
    const [x0, y0, x1, y1] = faceRectSrc(MALLOWS[id]);
    const d = diff[id];
    assert.ok(x0 <= d[0] && x1 >= d[1] && y0 <= d[2] && y1 >= d[3], id);
    const parts = facePartsSrc(MALLOWS[id]);
    assert.ok(parts.eyes && parts.mouth && parts.cheeks, `${id} parts`);
  }
});

test('rig: shared ticker add/remove is safe without a browser', () => {
  const fn = () => {};
  assert.equal(addTicker(fn), fn);
  removeTicker(fn);
  assert.equal(addTicker('nope'), 'nope');
});

test('registry: mask sampling is bilinear and clamped', () => {
  const N = MASK_SIZE, m = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = N / 2; i < N; i++) m[j * N + i] = 1;
  assert.equal(maskAlpha(m, 0.1, 0.5), 0);
  assert.equal(maskAlpha(m, 0.9, 0.5), 1);
  const mid = maskAlpha(m, 0.5, 0.5);
  assert.ok(mid > 0.2 && mid < 0.8, `edge blends (${mid})`);
  assert.equal(maskAlpha(m, -5, 9), 0);
  assert.equal(maskAlpha(null, 0.1, 0.1), 1);
});

// ------------------------------------------- MallowTouch core (no DOM) --
// The real MallowTouch gesture → body → face glue (_setup, _initBody,
// _initReader, _physics), driven by synthetic fingers at 60 Hz. The rig is a
// stand-in that records reactions and turns their impulses into soft-body
// kicks exactly as MallowRig.react does.
import { MallowTouch } from '../src/mallows/touch/mallow-touch.js';
import { REACTIONS } from '../src/mallows/reactions.js';

function touchCore(id, { rm = false } = {}) {
  const log = { reacts: [], sounds: [], haptics: [], events: [] };
  const m = MALLOWS[id], q = 640 / Math.max(...m.size);
  const mt = Object.create(MallowTouch.prototype);
  const rig = {
    id, mallow: m, q, skin: { width: Math.round(m.size[0] * q), height: Math.round(m.size[1] * q) }, assets: { mask: null },
    body: { hop: 0, hopV: 0, tilt: 0, spin: 0, lean: 0, grounded: true, glitchBurst: 0, burstRows: [] },
    val: { float: 0, tremble: 0, breath: 1, squashBias: 0, droop: 0, shrink: 0, cheekPuff: 0, glitch: 0 },
    time: 0, breathPhase: 0, overlays: [], opts: { reducedMotion: rm, audio: null }, cycles: {}, particles: { burst() {}, list: [], cloud: 0 },
    react(kind) {
      log.reacts.push(kind);
      const r = REACTIONS[id]?.[kind] || REACTIONS._shared[kind], imp = r?.impulse || {}, k = rm ? 0.25 : 1;
      mt._impulse({ squash: (imp.squash || 0) * 6 * k, lean: (imp.lean || 0) * 4 * k, shear: (imp.shear || 0) * 5 * k }, kind);
      return this;
    },
    overlay() { log.reacts.push('overlay'); return this; },
    lookAt() {}, setTouch(T) { this.touch = T; }, describe() { return id; }, on() {},
  };
  mt._setup({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) },
    { id, reducedMotion: rm, haptic: (k) => log.haptics.push(k), audio: { play: (_, n) => log.sounds.push(n) } });
  mt.rig = rig;
  mt._initBody(); mt._initReader();
  mt.view.w = 390; mt.view.h = 844;
  mt.place({ x: 195, y: 430 }, { instant: true });
  mt._settle();
  mt.ready = true;
  mt.on('touch', (e) => log.events.push(e.kind));
  let t = 1;
  const frame = (n = 1) => { for (let i = 0; i < n; i++) { t += 1 / 60; rig.time += 1 / 60; mt._physics(1 / 60, t); } };
  const ptr = (type, x, y, pid = 1) => mt.reader.pointer({ type, id: pid, x, y, t });
  const rect = () => mt.bodyRect();
  const top = () => { const sb = mt.sb; let y = Infinity, r = Infinity; for (let k = 0; k < sb.n; k++) { y = Math.min(y, sb.positions[2 * k + 1]); r = Math.min(r, sb.rest[2 * k + 1]); } return r - y; };
  return { mt, log, frame, ptr, rect, top };
}
const UPSET = ['gasp', 'flick', 'glitchBurst', 'release'];

test('core: three natural 150 px strokes calm the Mallow — no gasp, flick or slip', () => {
  for (const id of ['blubi', 'glitzi', 'noomi']) {
    const c = touchCore(id);
    for (let s = 0; s < 3; s++) {
      const r = c.rect(), x0 = r.cx - 0.32 * r.width, y0 = r.cy - 0.12 * r.height;
      c.ptr('down', x0, y0); c.frame(2);
      for (let i = 1; i <= 18; i++) { c.ptr('move', x0 + (150 * i) / 18, y0 + i * 0.6); c.frame(); }
      c.ptr('up', x0 + 150, y0 + 10.8); c.frame(42);
    }
    const strokes = c.log.events.filter((k) => k === 'stroke').length;
    assert.equal(strokes, 3, `${id}: ${c.log.events.join(',')}`);
    assert.ok(c.mt.touch.calm > 0.5, `${id} calm ${c.mt.touch.calm.toFixed(2)}`);
    assert.ok(!c.log.events.includes('slip') && !c.log.events.includes('pull'), `${id} events ${c.log.events.join(',')}`);
    assert.ok(!c.log.reacts.some((k) => UPSET.includes(k)), `${id} reactions ${c.log.reacts.join(',')}`);
    assert.ok(!c.log.sounds.includes('surprise') && !c.log.sounds.includes('offended'), `${id} sounds ${c.log.sounds.join(',')}`);
  }
});

test('core: a circular massage soothes and ends softly (no stroke, slip, burst or pop)', () => {
  for (const [id, R, rate] of [['glitzi', 25, 0.8], ['glitzi', 40, 0.8], ['loomi', 35, 0.3], ['blubi', 30, 0.5]]) {
    const c = touchCore(id);
    const r = c.rect(), cx = r.cx, cy = r.cy;
    c.ptr('down', cx + R, cy); c.frame(3);
    for (let i = 1; i <= 240; i++) { const a = (i / 60) * TAU2 * rate; c.ptr('move', cx + R * Math.cos(a), cy + R * Math.sin(a)); c.frame(); }
    const calm = c.mt.touch.calm;
    c.ptr('up', cx + R, cy); c.frame(30);
    const ev = c.log.events.join(',');
    assert.ok(c.log.events.filter((k) => k === 'massage').length >= 2, `${id} r${R} ${rate}: massage ticks (${ev})`);
    assert.ok(!c.log.events.includes('stroke') && !c.log.events.includes('slip'), `${id} r${R}: ${ev}`);
    assert.ok(!c.log.reacts.some((k) => UPSET.includes(k)), `${id} r${R} reactions ${c.log.reacts.join(',')}`);
    assert.ok(calm > 0.2, `${id} r${R} ${rate} turn/s calms (${calm.toFixed(2)})`);
    assert.ok(!c.log.haptics.includes('pop'), 'no pop haptic');
  }
});
const TAU2 = Math.PI * 2;

test('core: every Mallow pops ≥ 8 % above its rest height after a full squeeze (reduced motion: no overshoot)', () => {
  for (const id of MALLOW_IDS) {
    for (const rm of [false, true]) {
      const c = touchCore(id, { rm });
      const r = c.rect();
      c.ptr('down', r.cx, r.top + 0.4 * r.height);
      for (let i = 0; i < 90; i++) { c.ptr('move', r.cx, r.top + 0.4 * r.height); c.frame(); }
      assert.ok(c.mt.touch.depth > 0.9, `${id} squeezed (${c.mt.touch.depth.toFixed(2)})`);
      c.ptr('up', r.cx, r.top + 0.4 * r.height);
      let pop = -1;
      for (let i = 0; i < 90; i++) { c.frame(); pop = Math.max(pop, c.top()); }
      if (rm) assert.ok(pop < 0.01, `${id} reduced motion overshoot ${pop.toFixed(3)}`);
      else assert.ok(pop > 0.08, `${id} pop ${pop.toFixed(3)} (reactions ${c.log.reacts.join(',')})`);
      c.frame(400);
      assert.ok(c.mt.sb.energy < 1e-3, `${id} settles`);
    }
  }
});

test('core: a fast, bent yank past the limit slips once, after a beat; a slow one slides off softly; a flick replaces a slip', () => {
  const c = touchCore('boppo');
  const r = c.rect(), x0 = r.cx + 0.3 * r.width, y0 = r.cy;
  c.ptr('down', x0, y0); c.frame(30);                                 // rest first: a pull
  // a rough, zig-zagging yank at ~1100 px/s: not a hand sliding off
  for (let i = 1; i <= 10; i++) { c.ptr('move', x0 + i * 15, y0 + (i % 2) * 12); c.frame(); }
  c.frame(10);
  assert.equal(c.log.events.filter((k) => k === 'slip').length, 1, c.log.events.join(','));
  assert.equal(c.log.reacts.filter((k) => k === 'gasp').length, 1);
  c.ptr('up', x0 + 150, y0); c.frame(20);
  // the same rest, then a slow straight drag past the limit: the hand slides
  // off the jelly — it glides on, counts as a stroke and never startles
  const s = touchCore('boppo');
  s.ptr('down', x0, y0); s.frame(30);
  for (let i = 1; i <= 40; i++) { s.ptr('move', x0 - i * 4, y0); s.frame(); }
  s.ptr('up', x0 - 160, y0); s.frame(20);
  assert.ok(s.log.events.includes('pull') && !s.log.events.includes('slip'), s.log.events.join(','));
  assert.ok(s.log.events.includes('stroke'), s.log.events.join(','));
  assert.ok(!s.log.reacts.some((k) => UPSET.includes(k)), s.log.reacts.join(','));
  // a fast flick from rest is only a flick
  const f = touchCore('boppo');
  const q = f.rect(), fx = q.cx - 0.2 * q.width, fy = q.cy;
  f.ptr('down', fx, fy); f.frame(1);
  for (let i = 1; i <= 6; i++) { f.ptr('move', fx + 30 * i, fy); f.frame(); }
  f.ptr('up', fx + 180, fy); f.frame(20);
  assert.ok(f.log.events.includes('flick') && !f.log.events.includes('slip'), f.log.events.join(','));
  assert.deepEqual(f.log.reacts, ['flick']);
});

test('softbody: a two-finger stretch pulls in a waist (hourglass), and the waist lets go', () => {
  const sb = body();
  sb.grab(1, 0.2, 0.5, 0.18); sb.grab(2, 0.8, 0.5, 0.18);
  run(sb, 120, (f) => { const d = Math.min(0.15, f * 0.004); sb.move(1, 0.2 - d, 0.5, 1); sb.move(2, 0.8 + d, 0.5, 1); sb.setWaist(1, 2, 0.3); });
  const P = sb.positions, c = sb.cols, rws = sb.rows;
  const colH = (i) => P[2 * ((rws - 1) * c + i) + 1] - P[2 * i + 1];
  assert.ok(colH(10) < colH(4) - 0.06, `middle ${colH(10).toFixed(3)} vs finger column ${colH(4).toFixed(3)}`);
  sb.setWaist(null); sb.releaseAll(); run(sb, 400);
  assert.ok(sb.energy < 1e-4 && Math.abs(colH(10) - 1) < 0.01, 'back to rest');
});

test('softbody: a glide never slips and leaves no pinned material behind', () => {
  const sb = body();
  sb.grab(1, 0.2, 0.4, 0.3); sb.surface(1);
  let slipped = false;
  run(sb, 60, (f) => { const x = 0.2 + f * 0.012; sb.press(1, x, 0.4, 0.3, 0.21); sb.move(1, x, 0.4, 1); if (sb.lastSlip) slipped = true; });
  assert.ok(!slipped);
  const b = sb.bounds();
  assert.ok(b.x1 < 1.1 && b.x0 > -0.1, `the body is not dragged off with the finger (${b.x0.toFixed(2)}..${b.x1.toFixed(2)})`);
  sb.release(1, { vx: 1, vy: 0 }); run(sb, 600);
  assert.ok(sb.energy < 1e-6);
});

test('softbody: an idle body sleeps (step is free) and wakes on any touch or kick', () => {
  const sb = body();
  run(sb, 30);
  assert.equal(sb.awake, false);
  assert.equal(sb.step(1 / 60), 0, 'asleep: no substeps');
  sb.setRest({});                       // the same rest shape does not wake it
  assert.equal(sb.awake, false);
  sb.impulse(0.5, 0);
  assert.equal(sb.awake, true);
  assert.ok(sb.step(1 / 60) > 0);
  run(sb, 900);
  assert.equal(sb.awake, false, 'falls asleep again once still');
  sb.setRest({ squash: 0.1 });
  assert.equal(sb.awake, true, 'a new rest shape wakes it');
});

test('gestures: an arc of a circle is never a stroke; a gentle 0.25 turn/s circle is a massage; petting counts each pass', () => {
  for (const R of [25, 38, 70]) {
    const [m, ev] = reader();
    m.pointer({ type: 'down', id: 1, x: 100 + R, y: 100, t: 0 });
    for (let i = 1; i <= 90; i++) { const a = (i / 60) * TAU2 * 0.8; m.pointer({ type: 'move', id: 1, x: 100 + R * Math.cos(a), y: 100 + R * Math.sin(a), t: i / 60 }); m.update(i / 60); }
    assert.ok(!kinds(ev).includes('stroke'), `r ${R}: ${kinds(ev).join(',')}`);
  }
  const [g, ev2] = reader();
  g.pointer({ type: 'down', id: 1, x: 140, y: 100, t: 0 });
  for (let i = 1; i <= 240; i++) { const a = (i / 60) * TAU2 * 0.25; g.pointer({ type: 'move', id: 1, x: 100 + 40 * Math.cos(a), y: 100 + 40 * Math.sin(a), t: i / 60 }); g.update(i / 60); }
  assert.ok(kinds(ev2).includes('massageStart'), `slow circle: ${[...new Set(kinds(ev2))].join(',')}`);
  // stroking back and forth without lifting: every pass is a stroke, never a massage
  const [p, ev3] = reader();
  p.pointer({ type: 'down', id: 1, x: 40, y: 100, t: 0 });
  let t = 0;
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i <= 15; i++) { t += 1 / 60; const k = pass % 2 ? 15 - i : i; p.pointer({ type: 'move', id: 1, x: 40 + k * 9, y: 100 + (pass % 2) * 2, t }); p.update(t); }
  }
  assert.equal(kinds(ev3).filter((k) => k === 'stroke').length, 4, kinds(ev3).join(','));
  assert.ok(!kinds(ev3).includes('massageStart'));
  // a stroke that comes to rest grips again (a press), and lifting then is not a tap
  const [q, ev4] = reader();
  q.pointer({ type: 'down', id: 1, x: 40, y: 100, t: 0 });
  for (let i = 1; i <= 10; i++) q.pointer({ type: 'move', id: 1, x: 40 + i * 9, y: 100, t: i / 60 });
  q.update(0.8);
  assert.ok(kinds(ev4).includes('regrip') && q.pointers[0].mode === 'press');
  q.pointer({ type: 'up', id: 1, x: 130, y: 100, t: 0.9 });
  assert.equal(ev4.find(([k]) => k === 'up')[1].kind, 'release');
});

test('core: a stroke that rests a moment before lifting still ends softly; a real press after it pops', () => {
  const c = touchCore('blubi');
  const r = c.rect(), x0 = r.cx - 0.3 * r.width, y0 = r.cy - 0.1 * r.height;
  c.ptr('down', x0, y0); c.frame(1);
  for (let i = 1; i <= 16; i++) { c.ptr('move', x0 + i * 9, y0); c.frame(); }
  c.frame(27);                                   // rests 0.45 s: grips again
  assert.equal(c.mt.reader.pointers[0].mode, 'press');
  c.ptr('up', x0 + 144, y0); c.frame(30);
  assert.ok(!c.log.reacts.includes('release') && !c.log.haptics.includes('pop'), `soft end: ${c.log.reacts.join(',')} / ${c.log.haptics.join(',')}`);
  // …but stroking, then pressing on for a second is a squeeze
  const d = touchCore('blubi');
  d.ptr('down', x0, y0); d.frame(1);
  for (let i = 1; i <= 16; i++) { d.ptr('move', x0 + i * 9, y0); d.frame(); }
  d.frame(90);
  d.ptr('up', x0 + 144, y0); d.frame(5);
  assert.ok(d.log.reacts.includes('release'), d.log.reacts.join(','));
});

// The review's slow, gentle strokes: very slow from the start, and resting a
// moment before stroking (a pull that slides off into a stroke). Every Mallow
// must take three of them as strokes and calm down, with no gasp or flick.
function strokeRun(id, restF, pxs, dist = 150) {
  const c = touchCore(id);
  for (let s = 0; s < 3; s++) {
    const r = c.rect(), x0 = r.cx - 0.32 * r.width, y0 = r.cy - 0.12 * r.height;
    c.ptr('down', x0, y0); c.frame(Math.max(1, restF));
    const n = Math.max(2, Math.round((dist / pxs) * 60));
    for (let i = 1; i <= n; i++) { c.ptr('move', x0 + (dist * i) / n, y0 + i * 0.05); c.frame(); }
    c.ptr('up', x0 + dist, y0 + n * 0.05); c.frame(42);
  }
  return c;
}
test('core: slow strokes (80 px/s, or after resting 0.3–0.5 s) calm every Mallow — never a gasp or flick', () => {
  for (const id of MALLOW_IDS) {
    for (const [restF, pxs] of [[1, 80], [18, 150], [30, 100], [1, 500]]) {
      const c = strokeRun(id, restF, pxs);
      const tag = `${id} rest ${(restF / 60).toFixed(2)} s at ${pxs} px/s: ${c.log.events.join(',')}`;
      assert.equal(c.log.events.filter((k) => k === 'stroke').length, 3, tag);
      assert.ok(c.mt.touch.calm > 0.5, `${tag} calm ${c.mt.touch.calm.toFixed(2)}`);
      assert.ok(!c.log.events.includes('slip'), tag);
      assert.ok(!c.log.reacts.some((k) => UPSET.includes(k)), `${tag} reactions ${c.log.reacts.join(',')}`);
    }
  }
});

test('core: the arrow keys pull (never glide or stroke) and stop short of a slip', () => {
  for (const id of MALLOW_IDS) {
    const c = touchCore(id);
    const cx0 = c.mt.sb.bounds().cx;
    let t = 2;
    for (let i = 0; i < 4; i++) { c.mt.reader.key({ type: 'down', key: 'ArrowRight', t, repeat: i > 0 }); t += 1 / 30; c.frame(2); }
    const p = c.mt.reader.ptrs.get('arrow');
    assert.equal(p.mode, 'pull', id);
    assert.ok(p.pull > 0.5, `${id} pull ${p.pull.toFixed(2)}`);
    c.frame(20);
    const moved = c.mt.sb.bounds().cx - cx0;
    assert.ok(moved > 0.04, `${id} the body follows the key (${moved.toFixed(3)} body units)`);
    for (let i = 0; i < 20; i++) { c.mt.reader.key({ type: 'down', key: 'ArrowRight', t, repeat: true }); t += 1 / 30; c.frame(2); }
    c.mt.reader.key({ type: 'up', key: 'ArrowRight', t }); c.frame(30);
    assert.ok(c.log.events.includes('pull'), `${id}: ${c.log.events.join(',')}`);
    assert.ok(!c.log.events.includes('stroke') && !c.log.events.includes('slip'), `${id}: ${c.log.events.join(',')}`);
    assert.ok(!c.log.reacts.some((k) => UPSET.includes(k)), `${id} reactions ${c.log.reacts.join(',')}`);
  }
});

test('gestures: an immediate drag outwards from an edge pulls; across the body it strokes', () => {
  const mk = () => reader({ centre: () => ({ x: 200, y: 300 }), bodySize: () => 240 });
  const [o, ev] = mk();
  o.pointer({ type: 'down', id: 1, x: 300, y: 300, t: 0 });           // right edge, dragged right at once
  for (let i = 1; i <= 10; i++) o.pointer({ type: 'move', id: 1, x: 300 + i * 6, y: 300, t: i / 60 });
  assert.equal(o.pointers[0].mode, 'pull', kinds(ev).join(','));
  assert.ok(o.pointers[0].pull > 0.5);
  const [s, ev2] = mk();
  s.pointer({ type: 'down', id: 1, x: 300, y: 300, t: 0 });           // the same edge, dragged across the body
  for (let i = 1; i <= 20; i++) s.pointer({ type: 'move', id: 1, x: 300 - i * 6, y: 300, t: i / 60 });
  assert.equal(s.pointers[0].mode, 'glide');
  assert.ok(kinds(ev2).includes('stroke'), kinds(ev2).join(','));
  const [c, ev3] = mk();
  c.pointer({ type: 'down', id: 1, x: 205, y: 300, t: 0 });           // the middle, dragged outwards: a stroke
  for (let i = 1; i <= 20; i++) c.pointer({ type: 'move', id: 1, x: 205 + i * 6, y: 300, t: i / 60 });
  assert.equal(c.pointers[0].mode, 'glide', kinds(ev3).join(','));
});

test('core: place({size}) sets the body height in CSS px; baseSize is the unscaled height', () => {
  const c = touchCore('pipzi');
  const base = c.mt.baseSize;
  assert.ok(base > 100 && base < 340, `base ${base}`);
  c.mt.place({ size: 180 }, { instant: true });
  c.frame(2);
  assert.ok(Math.abs(c.mt._P() - 180) < 0.5, `body height ${c.mt._P().toFixed(1)}`);
  assert.ok(Math.abs(c.mt.goalSt.s - 180 / base) < 1e-6);
  c.mt.place({ scale: 1 }, { instant: true });
  c.frame(2);
  assert.ok(Math.abs(c.mt._P() - base) < 0.5);
});

test('core: a stroke that arrives between two (very slow) frames still slides off into a stroke', () => {
  for (const id of ['glitzi', 'blubi', 'noomi']) {
    const c = touchCore(id);
    const r = c.rect(), x0 = r.cx - 0.32 * r.width, y0 = r.cy - 0.12 * r.height;
    c.ptr('down', x0, y0); c.frame(20);                       // rests first: a pull
    // the whole 150 px slide and the lift are handled before the next frame
    const rd = c.mt.reader;
    let t = rd.t;
    for (let i = 1; i <= 30; i++) { t += 1 / 60; rd.pointer({ type: 'move', id: 1, x: x0 + 5 * i, y: y0, t }); }
    rd.pointer({ type: 'up', id: 1, x: x0 + 150, y: y0, t: t + 0.01 });
    c.frame(40);
    assert.ok(c.log.events.includes('stroke'), `${id}: ${c.log.events.join(',')}`);
    assert.ok(!c.log.events.includes('slip') && !c.log.reacts.some((k) => UPSET.includes(k)), `${id}: ${c.log.events.join(',')} / ${c.log.reacts.join(',')}`);
  }
});
