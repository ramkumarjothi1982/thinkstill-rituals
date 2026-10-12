// Luminous Ocean (W4b) tests: the sea's physics (dispersion, decay, the stroke → swell
// mapping, row recurrences, Stokes drift), the wake, the camera, the screen layout, the
// discoveries and the completion rules — plus a headless run of the world inside the
// director (a fake DOM): strokes make different seas, the thought drifts away and back,
// a storm melts into the ocean and hands over its thought, postcards and ground lines.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SEA, dispersion, strokeWave, strokePacket, calibrateDrift, Sea, Wake, makeCamera, project, unproject, scaleAt } from '../src/hushfold/flow/worlds/ocean-sea.js';
import { planOcean, OCEAN, bubbleSize, createLongWavesDetector, createDistanceDetector, createOceanProgress } from '../src/hushfold/flow/worlds/ocean-rules.js';
import { createRegistry, WORLDS, STATUS } from '../src/hushfold/flow/registry.js';

const DT = 1 / 60;
const SIZES = [[390, 844], [375, 812], [430, 932], [320, 568], [1280, 800], [844, 390]];
const bandFor = (H) => ({ x: 0, y: 76, w: 0, h: Math.min(156, Math.max(118, Math.round(H * 0.17))) });
function camFor(W, H, textW = 245, n = 7) {
  const plan = planOcean({ W, H, band: bandFor(H), mallow: null, textW, n });
  return { plan, cam: makeCamera({ W, H, hy: plan.hy, homeY: plan.homeY, waterY: plan.waterY }) };
}

// -------------------------------------------------------------- physics --
test('dispersion: the audit constants exactly — a 400 px swell rolls for ~30 s, a 50 px ripple fades in ~1.5 s', () => {
  assert.deepEqual([SEA.G, SEA.SIGMA, SEA.NU, SEA.BETA0], [59.5, 18400, 40.7, 0.0233]);
  const big = dispersion(400), small = dispersion(50);
  assert.ok(Math.abs(big.period - 6.26) < 0.06, `T(400) = ${big.period}`);
  assert.ok(Math.abs(big.life - 30) < 0.5, `life(400) = ${big.life}`);
  assert.ok(Math.abs(small.period - 0.95) < 0.03, `T(50) = ${small.period}`);
  assert.ok(Math.abs(small.life - 1.5) < 0.05, `life(50) = ${small.life}`);
  // ω² = g·k + σ·k³ and c_g = dω/dk
  const k = big.k, h = 1e-6, w = (kk) => Math.sqrt(SEA.G * kk + SEA.SIGMA * kk ** 3);
  assert.ok(Math.abs((w(k + h) - w(k - h)) / (2 * h) - big.cg) < 1e-3);
});

test('stroke → swell: slow long strokes make long swells, quick flicks short chop; k·A never above 0.45', () => {
  const U = 390;
  const slow = strokeWave(0.6 * U, 0.12 * U, U), flick = strokeWave(40, 2.2 * U, U), mid = strokeWave(0.3 * U, 0.5 * U, U);
  assert.ok(slow.lambda >= 0.6 * U, `slow λ ${slow.lambda}`);
  assert.ok(slow.s > 0.95);
  assert.ok(flick.lambda < 0.13 * U && flick.A < 3, `flick λ ${flick.lambda} A ${flick.A}`);
  assert.ok(mid.lambda > flick.lambda && mid.lambda < slow.lambda);
  for (const len of [10, 50, 150, 300, 600]) for (const v of [20, 80, 200, 500, 1500]) { const w = strokeWave(len, v, U); assert.ok(w.k * w.A <= 0.4501, `${len},${v}: kA ${w.k * w.A}`); }
});

test('sea: a long slow swell outlives a flick — chop is gone in seconds, the swell still rolls after 25 s', () => {
  const sea = new Sea();
  const U = 390;
  const L = strokeWave(0.6 * U, 0.1 * U, U), F = strokeWave(40, 2 * U, U);
  const a = sea.launch({ x: 0, z: 600, dx: 0, dz: 1, lambda: L.lambda, A: L.A, len: 900 });
  const b = sea.launch({ x: 0, z: 600, dx: 1, dz: 0, lambda: F.lambda, A: F.A, len: 60 });
  const ida = sea.id[a], idb = sea.id[b];
  for (let t = 0; t < 3; t += DT) sea.step(DT);
  assert.ok(sea.alive(idb) < 0.15 * F.A, `chop after 3 s: ${sea.alive(idb)} of ${F.A}`);
  assert.ok(sea.alive(ida) > 0.75 * L.A, `swell after 3 s: ${sea.alive(ida)}`);
  for (let t = 3; t < 25; t += DT) sea.step(DT);
  assert.equal(sea.alive(idb), 0, 'the flick has faded away');
  assert.ok(sea.alive(ida) > 0.1 * L.A, 'the swell still rolls at 25 s');
  assert.ok(sea.dominantPeriod() > 5, `dominant period ${sea.dominantPeriod()}`);
});

test('sea: the envelope travels at the group velocity; the crest sits under the fingertip at release', () => {
  const sea = new Sea(), o = {};
  const i = sea.launch({ x: 0, z: 1000, ax: 0, az: 1000, dx: 0, dz: 1, lambda: 300, A: 10, len: 600, free: false });
  for (let t = 0; t < 1; t += DT) sea.step(DT);           // sculpting: amplitude eases up, nothing travels
  sea.release(i);
  sea.prepare(); sea.sample(0, 1000, o);
  assert.ok(o.h > 0.95 * o.amp, 'a crest under the fingertip');
  const cg = dispersion(300).cg;
  for (let t = 0; t < 10; t += DT) sea.step(DT);
  // find the envelope peak along z
  let best = 0, bz = 0;
  for (let z = 800; z < 2200; z += 4) { sea.sample(0, z, o); if (o.amp > best) { best = o.amp; bz = z; } }
  assert.ok(Math.abs(bz - (1000 + cg * 10)) < 25, `envelope at ${bz}, expected ${1000 + cg * 10}`);
});

test('sea.row: the per-row recurrences match direct sampling (and survive envelopes far off the row)', () => {
  const sea = new Sea();
  sea.launch({ x: -300, z: 900, dx: 0.3, dz: 1, lambda: 260, A: 14, len: 700 });
  sea.launch({ x: 2400, z: 1400, dx: -1, dz: 0.2, lambda: 90, A: 3, len: 120 });   // centre far to one side
  sea.ringAt(200, 700, 120, 4);
  for (let t = 0; t < 2; t += DT) sea.step(DT);
  sea.prepare();
  const n = 40, H = new Float32Array(n), HX = new Float32Array(n), HZ = new Float32Array(n), GX = new Float32Array(n), GZ = new Float32Array(n), A = new Float32Array(n), o = {};
  for (const z of [400, 900, 1400, 3000]) {
    const x0 = -1200, step = 70;
    sea.row(z, x0, step, n, 1e-6, 0, H, HX, HZ, GX, GZ, A, false);
    for (let c = 0; c < n; c++) {
      sea.sample(x0 + c * step, z, o);
      assert.ok(Math.abs(H[c] - o.h) < 1e-3 * (1 + Math.abs(o.h)), `h at z=${z} c=${c}: ${H[c]} vs ${o.h}`);
      assert.ok(Math.abs(HZ[c] - o.hz) < 1e-3 * (1 + Math.abs(o.hz)), 'slope');
      assert.ok(Math.abs(A[c] - o.amp) < 1e-3 * (1 + o.amp), 'amp');
    }
  }
});

test('Stokes drift: swells sent away carry a floater away, towards you bring it back; 3–4 slow long strokes reach 4·Z0', () => {
  for (const [W, H] of SIZES.slice(0, 5)) {
    const { plan, cam } = camFor(W, H);
    const U = Math.min(W, H), gain = calibrateDrift(cam, U);
    const sea = new Sea(), o = {};
    let z = cam.Z0, x = 0;
    const strokeAt = (dir) => {
      // one unhurried stroke through the thought's spot, as a person would draw it: from in front of the
      // hero up to just past the thought (away), or from just beyond it down to the hero (towards you)
      const yA = cam.homeY + 0.55 * (cam.waterY - cam.homeY);
      const yT = cam.hy + cam.Hw * scaleAt(cam, z);
      const y0 = dir > 0 ? yA : Math.max(cam.hy + 4, yT - 20), y1 = dir > 0 ? Math.max(cam.hy + 4, yT - 20) : yA;
      const P = strokePacket(cam, U, { x0: W / 2, y0, x1: W / 2, y1, len: Math.abs(y1 - y0), speed: 0.2 * U });
      sea.launch(P);
    };
    const run = (sec) => { for (let t = 0; t < sec; t += 1 / 30) { sea.prepare(); sea.sample(x, z, o); z = Math.max(cam.Z0 * 0.98, z + (o.uz / SEA.STOKES) * gain / 30); x += (o.ux / SEA.STOKES) * gain / 30; sea.step(1 / 30); } };
    strokeAt(1); run(9);
    const after1 = z / cam.Z0;
    assert.ok(after1 > 1.4 && after1 < 2.6, `${W}×${H}: one stroke → ${after1.toFixed(2)}·Z0`);
    for (let k = 0; k < 3; k++) { strokeAt(1); run(9); }
    assert.ok(z / cam.Z0 >= 4, `${W}×${H}: four strokes → ${(z / cam.Z0).toFixed(2)}·Z0`);
    run(14);                         // (the earlier swells roll on for a while: let them pass)
    const far = z;
    strokeAt(-1); run(10);
    assert.ok(z < far - 0.5 * cam.Z0, `${W}×${H}: a stroke towards you brings it back (${(far / cam.Z0).toFixed(2)} → ${(z / cam.Z0).toFixed(2)})`);
    assert.ok(plan.home.y < plan.mallow.top, 'home is above the hero');
  }
});

test('wake: a finger dip ripples outwards and dies away (stable); a hushed patch goes still much faster', () => {
  const w = new Wake(98, 120);
  w.inject(196, 240, -0.6, 2);
  let peak = 0;
  for (let i = 0; i < 2400; i++) { w.step(); if (i > 30) for (let q = 0; q < w.n; q++) peak = Math.max(peak, Math.abs(w.h[q])); }
  assert.ok(peak < 1, `bounded (${peak})`);
  let m = 0; for (let q = 0; q < w.n; q++) m = Math.max(m, Math.abs(w.h[q]));
  assert.ok(m < 0.004, `after 40 s it has died away (${m})`);
  const a = new Wake(60, 60), b = new Wake(60, 60);
  b.hush.fill(1);
  a.inject(120, 120, -0.6, 2); b.inject(120, 120, -0.6, 2);
  for (let i = 0; i < 60; i++) { a.step(); b.step(); }
  assert.ok(b.energy() < 0.05 * a.energy(), `hushed ${b.energy()} vs ${a.energy()}`);
});

test('camera: project ∘ unproject is the identity on the water; the home row is s = 0.5; up the screen is away', () => {
  const { plan, cam } = camFor(390, 844);
  const o = {}, p = {};
  for (const [sx, sy] of [[30, 400], [195, 500], [360, 700], [200, 840]]) {
    unproject(cam, sx, sy, o); project(cam, o.x, o.z, 0, p);
    assert.ok(Math.abs(p.x - sx) < 1e-6 && Math.abs(p.y - sy) < 1e-6);
  }
  unproject(cam, 195, plan.homeY, o);
  assert.ok(Math.abs(o.s - 0.5) < 1e-9 && Math.abs(o.z - cam.Z0) < 1e-6);
  const a = unproject(cam, 195, 600, {}), b = unproject(cam, 195, 500, {});
  assert.ok(b.z > a.z);
  // the near water is seen at a grazing angle: a ring at the hero's waterline is flattened to ≈ 0.6
  const s = (cam.waterY - cam.hy) / cam.Hw;
  assert.ok(Math.abs(s * cam.Hw / cam.Z0 - 0.6) < 1e-6);
});

// --------------------------------------------------------------- layout --
const ov = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
test('layout: the band stays clear; the thought, its words, the hero and the bubbles never overlap; 20 px edges', () => {
  for (const [W, H] of SIZES) for (const tw of [0, 60, 245, 330]) {
    const band = bandFor(H);
    const p = planOcean({ W, H, band, mallow: null, textW: tw, n: 7 });
    const tag = `${W}×${H} text=${tw}`;
    const bb = band.y + band.h;
    assert.ok(p.hy > bb + 20, `${tag}: sky under the band (${p.hy})`);
    const body = { x0: p.home.x - p.home.r, x1: p.home.x + p.home.r, y0: p.home.y - p.home.r, y1: p.home.y + p.home.r };
    assert.ok(body.y0 >= bb && body.x0 >= OCEAN.EDGE && body.x1 <= W - OCEAN.EDGE, `${tag}: the thought on screen, under the band`);
    assert.ok(!ov(body, p.rects.mallow), `${tag}: the thought clear of the hero`);
    if (tw) {
      const P = p.rects.plate;
      assert.ok(P, `${tag}: a words plate`);
      assert.ok(P.y0 + 4 >= bb, `${tag}: the words under the band (${P.y0} < ${bb})`);
      assert.ok(!ov(P, p.rects.mallow), `${tag}: the words clear of the hero`);
      assert.ok(P.x0 + 4 >= OCEAN.EDGE - 0.5 && P.x1 - 4 <= W - OCEAN.EDGE + 0.5, `${tag}: the words inside the edges`);
    }
    for (let a = 0; a < p.slots.length; a++) {
      const s = p.slots[a], B = { x0: s.x - s.D / 2, x1: s.x + s.D / 2, y0: s.y - s.D / 2, y1: s.y + s.D / 2 };
      assert.ok(B.x0 >= OCEAN.EDGE - 0.5 && B.x1 <= W - OCEAN.EDGE + 0.5 && B.y0 >= bb && B.y1 <= p.floor, `${tag}: bubble ${a} on screen`);
      assert.ok(!ov(B, p.rects.mallow) && !ov(B, p.rects.thought) && !(p.rects.plate && ov(B, p.rects.plate)), `${tag}: bubble ${a} clear`);
      assert.ok(s.D >= OCEAN.BUBBLE_TIGHT - 0.01 || s.d > 6, `${tag}: bubble ${a} ≥ 36 px until 6·Z0 (${s.D} at ${s.d})`);
      for (let c = a + 1; c < p.slots.length; c++) { const t = p.slots[c]; assert.ok(Math.hypot(s.x - t.x, s.y - t.y) >= (s.D + t.D) / 2 + OCEAN.BUBBLE_GAP - 0.5, `${tag}: bubbles ${a}/${c} apart`); }
    }
    if (H >= 800 && W < 500) assert.ok(p.slots.length >= 2, `${tag}: room for some bubbles (${p.slots.length})`);
  }
  assert.equal(bubbleSize(0.1, 9, 390), OCEAN.BUBBLE_FAR);
});

test('layout (review r2): every photo has a place on the smallest phone, beside the hero rather than on it — smaller, never overlapping', () => {
  for (const [W, H] of [[320, 568], [375, 812], [390, 844]]) {
    const band = bandFor(H);
    for (const plate of [{ w: 196, h: 59, lines: 2 }, { w: 277, h: 38, lines: 1 }]) {
      const p = planOcean({ W, H, band, mallow: null, plate, n: 7 });
      // (review r3: the thought's clear zone is reserved, so on the smallest phone one photo of seven may take turns far out)
      assert.ok(p.slots.length >= (W <= 320 ? 6 : 7), `${W}×${H} (${plate.lines} line): ${p.slots.length} slots for 7 photos`);
      for (const s of p.slots) {
        const B = { x0: s.x - s.D / 2, x1: s.x + s.D / 2, y0: s.y - s.D / 2, y1: s.y + s.D / 2 };
        assert.ok(!ov(B, p.rects.mallow), `${W}×${H}: a bubble on the hero`);
        assert.ok(!ov(B, p.rects.zone), `${W}×${H}: a bubble in the thought's clear zone`);
        assert.ok(s.D >= OCEAN.BUBBLE_TIGHT - 0.01 || s.d > 6, `${W}×${H}: a near bubble of ${s.D} px`);
      }
    }
  }
});

test('sea (review r2): the wind carries nothing — only the person’s swells (and the storm’s seed swells) drift a floater', () => {
  const sea = new Sea(), o = {};
  sea.launch({ x: 0, z: 400, dx: 0, dz: 1, lambda: 120, A: 3, len: 300, user: false });            // a wind ripple
  sea.prepare(); sea.sample(0, 400, o);
  assert.equal(o.uz, 0, 'a background ripple moves nothing');
  assert.ok(Math.abs(o.h) > 0 || o.amp > 0, '…though it is still there to see');
  const seed = new Sea();
  seed.launch({ x: 0, z: 400, dx: 0, dz: 1, lambda: 300, A: 6, len: 600, user: false, carry: true, seed: true });
  seed.prepare(); seed.sample(0, 400, o);
  assert.ok(o.uz > 0 && o.uuz === 0, 'a storm line rolling away carries, and is not counted as the person’s');
  // the gold crest light of a seed swell fades with its age
  const X = { CHOP: new Float32Array(8), chopMax: 50, GOLD: new Float32Array(8), goldSec: 5 };
  const H8 = () => new Float32Array(8);
  seed.row(400, -40, 10, 8, 10, 0, H8(), H8(), H8(), H8(), H8(), H8(), true, null, 0, X);
  const g0 = Math.max(...X.GOLD);
  for (let t = 0; t < 6; t += 0.1) seed.step(0.1);
  seed.row(400, -40, 10, 8, 10, 0, H8(), H8(), H8(), H8(), H8(), H8(), true, null, 0, X);
  assert.ok(g0 > 0 && Math.max(...X.GOLD) === 0, `gold at first (${g0.toFixed(3)}), gone after its few seconds`);
});

test('progress (review r2): one long swell’s period is not a sea, and nothing completes before real play', () => {
  const p = createOceanProgress();
  for (let k = 0; k < 4; k++) p.stroke({ lambdaU: 0.8 });
  let r;
  for (let t = 0; t < 14; t += DT) r = p.update(DT, { dist: 1.2, period: 7, down: false, swells: 1, played: 20 + t });
  assert.ok(!r.complete, 'a single swell rolling with a long period: not yet');
  for (let t = 0; t < 12; t += DT) r = p.update(DT, { dist: 1.2, period: 7, down: false, swells: 3, played: 34 + t * 0.2 });
  assert.ok(!r.complete, 'a sustained sea, but under 40 s of play: not yet');
  for (let t = 0; t < 4; t += DT) r = p.update(DT, { dist: 1.2, period: 7, down: false, swells: 3, played: 40 + t });
  assert.ok(r.complete, 'a sustained sea after 40 s of play, hands off: the invitation to drift on');
});

// ----------------------------------------------------------- discoveries --
test('long-waves: two flicks, then a slow long stroke → fires a moment later while the swell rolls; never without the contrast', () => {
  const alive = () => 5;
  const d = createLongWavesDetector();
  d.stroke({ t: 1, id: 1, lambdaU: 0.12, s: 0, lenU: 0.1 });
  d.stroke({ t: 2, id: 2, lambdaU: 0.12, s: 0, lenU: 0.1 });
  d.stroke({ t: 4, id: 3, lambdaU: 0.9, s: 0.95, lenU: 0.6, period: 6.5 });
  assert.equal(d.update(4.5, alive), null, 'not at once');
  const ev = d.update(5.2, alive);
  assert.equal(ev?.id, 'long-waves');
  assert.equal(ev.evidence.flicks, 2);
  assert.equal(d.update(9, alive), null, 'once');
  // a long stroke with no flicks first, or flicks long ago, or a long but quick stroke: nothing
  const e = createLongWavesDetector();
  e.stroke({ t: 1, id: 1, lambdaU: 0.9, s: 0.95, lenU: 0.6 });
  assert.equal(e.update(5, alive), null);
  e.stroke({ t: 2, id: 2, lambdaU: 0.12, s: 0, lenU: 0.1 }); e.stroke({ t: 3, id: 3, lambdaU: 0.12, s: 0, lenU: 0.1 });
  e.stroke({ t: 4, id: 4, lambdaU: 0.7, s: 0.4, lenU: 0.7 });
  assert.equal(e.update(8, alive), null, 'long but not slow');
  e.stroke({ t: 30, id: 5, lambdaU: 0.9, s: 0.95, lenU: 0.6 });
  assert.equal(e.update(32, alive), null, 'the flicks were too long ago');
  // the swell has already gone when the line would show: no line
  const f = createLongWavesDetector();
  f.stroke({ t: 1, id: 1, lambdaU: 0.1, s: 0, lenU: 0.1 }); f.stroke({ t: 1.5, id: 2, lambdaU: 0.1, s: 0, lenU: 0.1 });
  f.stroke({ t: 2, id: 3, lambdaU: 0.8, s: 0.9, lenU: 0.5 });
  assert.equal(f.update(4, () => 0), null);
});

test('distance: fires past 4·Z0 only through the person’s own swells; then "back" once it comes 1.5·Z0 closer', () => {
  const d = createDistanceDetector();
  let dist = 1, ev = null;
  // pushed out by the storm's seed swells only: not the person's doing
  for (let i = 0; i < 400 && !ev; i++) { dist += 0.01; ev = d.update(DT, { dist, out: 0.01, outUser: 0 }); }
  assert.equal(ev, null, 'not the person’s swells');
  const e = createDistanceDetector();
  dist = 1; ev = null;
  for (let i = 0; i < 400 && !ev; i++) { dist += 0.01; ev = e.update(DT, { dist, out: 0.01, outUser: 0.009 }); }
  assert.equal(ev?.id, 'distance');
  assert.ok(ev.evidence.dist >= 4);
  let back = null;
  for (let i = 0; i < 300 && !back; i++) { dist -= 0.01; back = e.update(DT, { dist, out: 0, outUser: 0 }); }
  assert.equal(back?.id, 'back');
  assert.ok(back.evidence.from - back.evidence.to >= 1.5);
});

test('progress: monotonic, moved by the person’s swells; completion needs 4 long swells + distance or a long period, then 2 s idle', () => {
  const p = createOceanProgress();
  let last = 0;
  const step = (sec, m) => { let r; for (let t = 0; t < sec; t += DT) { r = p.update(DT, m); assert.ok(r.p >= last - 1e-9, 'monotonic'); last = r.p; } return r; };
  step(5, { dist: 1, period: 0, down: false });
  assert.equal(last, 0, 'nothing happens by itself');
  for (let k = 0; k < 3; k++) p.stroke({ lambdaU: 0.8 });
  p.stroke({ lambdaU: 0.1 });
  let r = step(12, { dist: 1.2, period: 6, down: true });
  assert.ok(!r.complete, 'three long swells are not enough');
  p.stroke({ lambdaU: 0.9 });
  r = step(1, { dist: 1.2, period: 6, down: true });
  assert.ok(!r.complete, 'a finger is still on the water');
  r = step(2.2, { dist: 1.2, period: 6, down: false });
  assert.ok(r.complete && r.p === 1, 'the period held ≥ 10 s, then 2 s idle');
  // the distance route
  const q = createOceanProgress();
  for (let k = 0; k < 4; k++) q.stroke({ lambdaU: 0.7 });
  let rr; for (let t = 0; t < 6; t += DT) rr = q.update(DT, { dist: 4.2, period: 2, down: false });
  assert.ok(rr.complete);
  const snap = q.snapshot(), q2 = createOceanProgress(); q2.restore(snap);
  assert.ok(q2.complete && q2.long === 4);
});

// ------------------------------------------------------- headless world --
function installFakeDom() {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const noop = () => {};
  const ctx2d = (c) => new Proxy({
    canvas: c,
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 8.4 }), getTransform: () => ({ a: 1, e: 0 }),
  }, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => { const c = { style: {}, className: '', width: 0, height: 0, children: [], setAttribute() {}, append(...x) { this.children.push(...x); }, remove() {}, addEventListener() {}, removeEventListener() {}, clientWidth: 390, clientHeight: 844 }; c.getContext = () => ctx2d(c); return c; };
  globalThis.document = { createElement: () => el(), addEventListener() {}, removeEventListener() {}, hidden: false };
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return { el, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
const fakeMallow = (W, H) => {
  const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
  const r = { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B, bottom, width: B, height: B, cx: W / 2, cy: bottom - B / 2 };
  const m = { floats: [], reacts: [], rect: () => r, bodyRect: () => r, react(k) { m.reacts.push(k); }, setEmotion() {}, lookAt() {}, float(f) { m.floats.push(f); } };
  return m;
};
const fakeThought = () => ({ id: 't', token: 'My boss embarrassed me today.', text: 'My boss embarrassed me today.', x: 0, y: 0, z: 0, scale: 1, state: { tension: 0.6 }, react() {}, hitTest: () => false, pointer() {} });
/** Drive a real-time-ish stroke through the director (60 Hz moves). */
function stroke(D, x0, y0, x1, y1, pxPerSec, id = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round((len / pxPerSec) * 30));
  let t = D.debug.time * 1000;
  D.pointer({ type: 'down', id, x: x0, y: y0, t, pointerType: 'touch' });
  for (let i = 1; i <= n; i++) { t += 1000 / 30; D.pointer({ type: 'move', id, x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, t, pointerType: 'touch' }); D.debug.step(1 / 30); }
  D.pointer({ type: 'up', id, x: x1, y: y1, t: t + 16, pointerType: 'touch' });
}
const steps = (D, sec, dt = 1 / 15) => { for (let t = 0; t < sec; t += dt) D.debug.step(dt); };

test('world: slow long strokes and flicks make different seas; the thought drifts away and back; discoveries are true', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844;
    const mallow = fakeMallow(W, H), thought = fakeThought();
    const said = [], found = [], offers = [];
    const subtitles = { say(lines, o) { said.push({ lines: [].concat(lines), kind: o?.kind }); return Promise.resolve(); }, choice: () => new Promise(() => {}), clear() {} };
    const registry = createRegistry(WORLDS);
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, subtitles, registry, ticker: fakeTicker(), store: memStore(), reducedMotion: false, safeRect: () => ({ x: 20, y: 64, w: W - 40, h: 400 }) });
    D.on('discovery', (e) => found.push(e)); D.on('offer', (e) => offers.push(e));
    await D.start({ worldId: 'luminous-ocean', emotion: 'anxious', intention: 'let-go' });
    const w = D.world;
    assert.ok(w, 'the ocean started');
    steps(D, 1.5);
    assert.ok(mallow.floats.length > 15, "the hero floats (float() every frame)");
    // three quick flicks: short chop that fades
    for (let k = 0; k < 3; k++) { stroke(D, 120 + k * 50, 700, 150 + k * 50, 690, 1100, 2); steps(D, 0.15); }
    const choppy = w.metrics;
    assert.ok(choppy.chop > 0.01, `chop ${choppy.chop}`);
    assert.ok(choppy.period < 2.6, `short period after flicks (the person's swells): ${choppy.period}`);
    steps(D, 3);
    assert.ok(w.metrics.chop < 0.3 * choppy.chop, 'the chop fades in a few seconds');
    // a slow, long stroke away from you (up the screen through the thought)
    const tz0 = w.metrics.dist;
    stroke(D, W / 2 + 10, 720, W / 2, 430, 0.18 * 390, 3);
    steps(D, 1.6);
    assert.ok(w.metrics.period > 4, `a long rolling swell (period ${w.metrics.period})`);
    assert.ok(found.some((e) => e.id === 'long-waves'), 'flicks, then slow and long: the discovery');
    assert.equal(offers.length, 0, '"long-waves" offers nothing');
    // the thought drifts away with more swells…
    for (let k = 0; k < 4 && !found.some((e) => e.id === 'distance'); k++) { stroke(D, W / 2 + 6 * k, 720, W / 2, w.debug.surfaceY(Math.max(1.2, w.metrics.dist * 0.8)) - 30, 0.2 * 390, 4); steps(D, 8); }
    const far = w.metrics.dist;
    assert.ok(far > tz0 + 2, `drifted away: ${tz0.toFixed(2)} → ${far.toFixed(2)}`);
    assert.ok(found.some((e) => e.id === 'distance'), 'Look how far it drifted.');
    steps(D, 0.2);
    await new Promise((r) => setTimeout(r, 0));     // (the offer follows the discovery's lines)
    assert.ok(offers.some((e) => e.skillId === 'a-little-more-room'), 'A Little More Room is offered');
    assert.ok(w.metrics.dist <= OCEAN.CAP + 1e-6, 'never beyond 9·Z0');
    // …and comes back with swells sent towards you
    for (let k = 0; k < 3; k++) { stroke(D, W / 2, w.debug.surfaceY(w.metrics.dist) - 20, W / 2, 760, 0.2 * 390, 5); steps(D, 8); }
    assert.ok(w.metrics.dist < far - 1, `brought closer: ${far.toFixed(2)} → ${w.metrics.dist.toFixed(2)}`);
    assert.ok(said.some((s) => s.lines.includes('You can bring it closer too.')), 'the drift-back line');
    // still visible and on screen the whole time; its words never under the band
    const T = w.debug.thought;
    assert.ok(T.alpha > 0.9 && T.sx > 20 && T.sx < W - 20);
    // saved progress: ids and numbers only, small, and it survives the flow-store sanitiser and a restore
    const { sanitizeState } = await import('../src/engine/flow-store.js');
    const st = w.serialize();
    assert.deepEqual(sanitizeState(st), st);
    assert.ok(JSON.stringify(st).length < 2048, `${JSON.stringify(st).length} chars`);
    assert.ok(!JSON.stringify(st).includes('boss'), 'never the person’s words');
    assert.ok(st.discoveries.includes('distance') && st.discoveries.includes('long-waves'));
    assert.ok(w.restore(st));
  } finally { D?.destroy(); dom.restore(); }
});

test('world (review r3): strokes in the sky shape nothing — no progress, no long swells, no "long-waves"; the water begins at the horizon line', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const mallow = fakeMallow(W, H), thought = fakeThought(), found = [];
      const subtitles = { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} };
      const sized = () => Object.assign(dom.el(), { clientWidth: W, clientHeight: H });
      D = createHushflow({ worldEl: sized(), fxEl: sized(), mallow, thought, subtitles, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
      D.on('discovery', (e) => found.push(e.id));
      await D.start({ worldId: 'luminous-ocean', emotion: 'anxious', intention: 'let-go' });
      const w = D.world;
      steps(D, 1.5);
      const hy = w.debug.hy, U = Math.min(W, H);
      assert.equal(w.debug.cam.W, W, 'the world has the screen size');
      const userPackets = () => { const s = w.debug.sea; let n = 0; for (let i = 0; i < s.max; i++) if (s.on[i] && s.user[i]) n++; return n; };
      // two quick flicks and six slow, long strokes, all in the sky (the review's case: under the subtitle band too)
      for (let k = 0; k < 2; k++) { stroke(D, 60 + 40 * k, hy - 40, 90 + 40 * k, hy - 46, 1100, 2); steps(D, 0.2); }
      for (let k = 0; k < 6; k++) { const y = Math.max(40, hy - 30 - (k % 3) * 40); stroke(D, 30, y, W - 30, y + 10, 0.2 * U, 3); steps(D, 1.5); }
      assert.equal(userPackets(), 0, `${W}×${H}: no swell from the sky`);
      assert.equal(w.metrics.long, 0, `${W}×${H}: no long swells counted`);
      assert.ok(w.progress < 0.01, `${W}×${H}: no progress (${w.progress})`);
      assert.equal(w.metrics.period, 0, `${W}×${H}: no period of the person's sea`);
      assert.ok(!found.includes('long-waves'), `${W}×${H}: '…and the whole sea rolls.' is never said of an unchanged sea`);
      // a sliver along the far horizon, beyond where the thought may drift: a ripple there at most, and it does not count
      // either (on a short screen the water just under the horizon line is already nearer than that: it counts there)
      if (w.debug.surfaceY(OCEAN.CAP) > hy + 13) {
        stroke(D, 40, hy + 10, W - 40, hy + 12, 0.2 * U, 4); steps(D, 1);
        assert.equal(w.metrics.long, 0, `${W}×${H}: a stroke along the horizon is not a long swell`);
      }
      // a stroke from the sky down onto the water: it starts at the horizon line, and that swell does count
      stroke(D, W * 0.2, hy - 60, W * 0.24, Math.min(H - 80, hy + 0.55 * U), 0.2 * U, 5); steps(D, 0.5);
      const s = w.debug.sea, cam = w.debug.cam;
      let mine = -1; for (let i = 0; i < s.max; i++) if (s.on[i] && s.user[i] && (mine < 0 || s.id[i] > s.id[mine])) mine = i;
      assert.ok(mine >= 0 && s.vis[mine] === 1, `${W}×${H}: the water part of the stroke made a visible swell`);
      const px = s.peakPx(mine, cam, OCEAN.CAP * cam.Z0);
      assert.ok(px >= 3, `${W}×${H}: it stands ${px.toFixed(1)} px tall on the visible water`);
      assert.equal(w.metrics.long, 1, `${W}×${H}: …and it counts`);
      D.destroy(); D = null;
    }
  } finally { D?.destroy(); dom.restore(); }
});

test('world: a storm melts into the ocean — horizon from 0.655H to 0.44H, postcards become bubbles in place, the thought lands, lines become swells', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844;
    const mallow = fakeMallow(W, H), thought = fakeThought();
    const subtitles = { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} };
    // a stand-in storm that is complete and hands over like the real one
    const cards = [{ i: 0, x: 90, y: 260, w: 70, h: 52, rot: 0.08, state: 'grounded' }, { i: 1, x: 300, y: 300, w: 70, h: 52, rot: -0.1, state: 'grounded' }];
    const STORM = { ...WORLDS[0], load: async () => ({ create: () => ({ prepare() {}, enter() {}, frame() {}, pointer() {}, outro() {}, intro() {}, get progress() { return 1; }, get complete() { return true; }, get metrics() { return {}; },
      handoff: () => ({ horizonY: 0.655 * H, seeds: [[[60, 300], [160, 296], [260, 300]], [[100, 380], [220, 384]]], thought: { x: 120, y: 470, scale: 1, tension: 0.3, r: 30, labelW: 300 }, photos: cards, energy: 0.1 }),
      serialize: () => ({ v: 1 }), restore() {}, pause() {}, resume() {}, destroy() {} }) }) };
    const registry = createRegistry([STORM, WORLDS[1]]);
    const photos = { n: 2, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, photos, subtitles, registry, ticker: fakeTicker(), store: memStore(), reducedMotion: false });
    const melts = [];
    D.on('melt', (e) => melts.push(e));
    await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
    assert.ok(D.next());
    for (let i = 0; i < 40 && !D.incoming; i++) { D.debug.step(1 / 60); await new Promise((r) => setTimeout(r, 5)); }
    for (let i = 0; i < 200 && D.state.phase !== 'melting'; i++) { D.debug.step(1 / 60); await new Promise((r) => setTimeout(r, 2)); }
    assert.equal(D.state.phase, 'melting');
    const ocean = D.incoming;
    assert.ok(Math.abs(ocean.debug.hy - 0.655 * H) < 2, `starts on the storm's horizon (${ocean.debug.hy})`);
    // postcards turn into bubbles in place, the thought starts where it hung
    const b0 = ocean.debug.bubbles;
    assert.equal(b0.length, 2);
    assert.ok(Math.abs(b0[0].sx - 90) < 1 && Math.abs(b0[0].sy - 260) < 1, 'bubble 0 where postcard 0 was');
    assert.ok(Math.abs(ocean.debug.thought.sx - 120) < 1 && Math.abs(ocean.debug.thought.sy - 470) < 1, 'the thought where it hung');
    assert.ok(ocean.debug.sea.active >= 2, 'the ground lines became the first swells');
    const ys = [];
    for (let i = 0; i < 30 * 7; i++) { D.debug.step(1 / 30); if (i % 15 === 0) ys.push(ocean.debug.hy); }
    assert.equal(D.state.worldId, 'luminous-ocean');
    for (let i = 1; i < ys.length; i++) assert.ok(ys[i] <= ys[i - 1] + 1e-6, 'the horizon only rises');
    steps(D, 1);
    assert.ok(Math.abs(ocean.debug.hy - 0.44 * H) < 3, `the ocean horizon at 0.44 H (${ocean.debug.hy})`);
    assert.ok(ocean.debug.bubbles.every((b) => b.state === 'float'), 'the bubbles float on the water');
    assert.ok(ocean.debug.thought.landed && ocean.debug.thought.landK >= 1, 'the thought landed');
    assert.ok(Math.abs(ocean.metrics.dist - 1) < 0.15, `…at its home on the water (${ocean.metrics.dist})`);
    assert.deepEqual(melts.map((m) => m.k), [0, 1]);
  } finally { D?.destroy(); dom.restore(); }
});

test('world (review r3): the melt never pops or tangles — every bubble eases (≤ 8 px a 1/30 s step), none crosses another, none covers another, the thought or the hero', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    // the storms the review played by touch (the postcards and thought where they hung), and seven photos
    const CASES = [
      { W: 390, H: 844, n: 3, cards: [[0, 80, 274, 80], [1, 194, 274, 73], [2, 312, 270, 101]], th: [105, 435] },
      { W: 320, H: 568, n: 3, cards: [[1, 171, 238, 58], [2, 258, 234, 80]], th: [86, 256] },
      { W: 390, H: 844, n: 7, cards: [[0, 70, 250, 70], [3, 150, 270, 64], [5, 236, 262, 72], [6, 318, 280, 76]], th: [190, 440] },
      { W: 320, H: 568, n: 7, cards: [[0, 60, 220, 56], [2, 150, 236, 56], [4, 250, 228, 60]], th: [160, 300] },
      // (the lab rig's own body box at 320×568, taller than it is wide, and the postcards where a touch-played storm left them)
      { W: 320, H: 568, n: 3, cards: [[1, 175, 238, 58], [2, 259, 234, 80]], th: [86, 256], hero: { left: 79, right: 241, top: 323, bottom: 490 } },
    ];
    for (const C of CASES) {
      const { W, H } = C, tag = `${W}×${H} with ${C.n} photos`;
      const sized = () => Object.assign(dom.el(), { clientWidth: W, clientHeight: H });
      const mallow = fakeMallow(W, H), thought = fakeThought();
      if (C.hero) { const r = { ...C.hero, width: C.hero.right - C.hero.left, height: C.hero.bottom - C.hero.top, cx: (C.hero.left + C.hero.right) / 2, cy: (C.hero.top + C.hero.bottom) / 2 }; mallow.rect = mallow.bodyRect = () => r; }
      const cards = C.cards.map(([i, x, y, w]) => ({ i, x, y, w, h: w * 0.75, rot: 0.06, state: 'grounded' }));
      const STORM = { ...WORLDS[0], load: async () => ({ create: () => ({ prepare() {}, enter() {}, frame() {}, pointer() {}, outro() {}, intro() {}, get progress() { return 1; }, get complete() { return true; }, get metrics() { return {}; },
        handoff: () => ({ horizonY: 0.655 * H, seeds: [[[40, 0.7 * H], [W / 2, 0.7 * H + 4], [W - 40, 0.7 * H]]], thought: { x: C.th[0], y: C.th[1], scale: 1, tension: 0.3, r: 30, labelW: 260 }, photos: cards, energy: 0.1 }),
        serialize: () => ({ v: 1 }), restore() {}, pause() {}, resume() {}, destroy() {} }) }) };
      const photos = { n: C.n, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) };
      D = createHushflow({ worldEl: sized(), fxEl: sized(), mallow, thought, photos, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} }, registry: createRegistry([STORM, WORLDS[1]]), ticker: fakeTicker(), store: memStore(), reducedMotion: false });
      await D.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
      assert.ok(D.next());
      for (let i = 0; i < 300 && D.state.phase !== 'melting'; i++) { D.debug.step(1 / 60); await new Promise((r) => setTimeout(r, 2)); }
      assert.equal(D.state.phase, 'melting', tag);
      const ocean = D.incoming;
      let prev = null, worstStep = 0, worstAt = null, overlapB = 0, overlapAt = null, overlapT = 0, overlapH = 0;
      const B = mallow.rect();
      // every bubble's way, step by step (to check no two cross each other's way at the same time)
      const path = new Map();
      for (let step = 0; step < 30 * 16; step++) {
        D.debug.step(1 / 30);
        const w = D.state.worldId === 'luminous-ocean' && !D.incoming ? D.world : ocean;
        const bs = w.debug.bubbles.filter((b) => b.alpha > 0.3 && b.state !== 'leave'), T = w.debug.thought, rr = T.r * T.surf;
        if (prev) for (const b of bs) { const p = prev.get(b.i); if (p) { const d = Math.hypot(b.sx - p[0], b.sy - p[1]); if (d > worstStep) { worstStep = d; worstAt = { step, i: b.i, from: p, to: [b.sx, b.sy], st: b.state }; } } }
        for (let a = 0; a < bs.length; a++) for (let c = a + 1; c < bs.length; c++) { const o = (bs[a].D + bs[c].D) / 2 - Math.hypot(bs[a].sx - bs[c].sx, bs[a].sy - bs[c].sy); if (o > overlapB) { overlapB = o; overlapAt = { step, a: [bs[a].i, bs[a].state, Math.round(bs[a].sx), Math.round(bs[a].sy), Math.round(bs[a].D)], c: [bs[c].i, bs[c].state, Math.round(bs[c].sx), Math.round(bs[c].sy), Math.round(bs[c].D)] }; } }
        if (T.alpha * T.vis > 0.3) for (const b of bs) overlapT = Math.max(overlapT, b.D / 2 + rr - Math.hypot(b.sx - T.sx, b.sy - T.sy));
        for (const b of bs) { const ox = Math.min(b.sx + b.D / 2, B.right - 0.06 * B.width) - Math.max(b.sx - b.D / 2, B.left + 0.06 * B.width), oy = Math.min(b.sy + b.D / 2, B.bottom) - Math.max(b.sy - b.D / 2, B.top + 2); if (ox > 0 && oy > 0) overlapH = Math.max(overlapH, Math.min(ox, oy)); }
        prev = new Map(w.debug.bubbles.map((b) => [b.i, [b.sx, b.sy]]));
        for (const b of w.debug.bubbles) { if (!path.has(b.i)) path.set(b.i, []); path.get(b.i).push([b.sx, b.sy, step]); }
      }
      assert.equal(D.state.worldId, 'luminous-ocean', `${tag}: the melt finished`);
      const w = D.world;
      assert.ok(worstStep <= 8, `${tag}: a bubble moved ${worstStep.toFixed(1)} px in one step ${JSON.stringify(worstAt)}`);
      assert.ok(overlapB <= 0.5, `${tag}: two bubbles overlapped by ${overlapB.toFixed(1)} px ${JSON.stringify(overlapAt)}`);
      assert.ok(overlapT <= 0.5, `${tag}: a bubble covered the thought by ${overlapT.toFixed(1)} px`);
      assert.equal(overlapH, 0, `${tag}: a bubble on the hero (${overlapH.toFixed(1)} px)`);
      // no two glides cross each other's way at the same time (within half a second): a tangle. (One bubble following
      // where another went a moment before, down the same lane beside the hero, is not one.)
      const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
      const ids = [...path.keys()];
      for (let a = 0; a < ids.length; a++) for (let c = a + 1; c < ids.length; c++) {
        const P = path.get(ids[a]), Q = path.get(ids[c]);
        for (let t = 1; t < P.length; t++) {
          const p0 = P[t - 1], p1 = P[t];
          if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.2) continue;
          for (let u = 1; u < Q.length; u++) {
            const q0 = Q[u - 1], q1 = Q[u];
            if (Math.abs(q1[2] - p1[2]) > 15 || Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) < 0.2) continue;
            const x = cr(p0, p1, q0) * cr(p0, p1, q1) < 0 && cr(q0, q1, p0) * cr(q0, q1, p1) < 0;
            assert.ok(!x, `${tag}: bubbles ${ids[a]} and ${ids[c]} cross each other's way at step ${p1[2]}`);
          }
        }
      }
      assert.equal(w.metrics.bubbles + w.metrics.waiting, C.n, `${tag}: every photo is still there`);
      D.destroy(); D = null;
    }
  } finally { D?.destroy(); dom.restore(); }
});

test('world: reduced motion (+ low stimulation) — a straight crossfade with everything already in place', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844;
    const mallow = fakeMallow(W, H), thought = fakeThought();
    const STORM = { ...WORLDS[0], load: async () => ({ create: () => ({ prepare() {}, enter() {}, frame() {}, pointer() {}, get progress() { return 1; }, get complete() { return true; }, get metrics() { return {}; },
      handoff: () => ({ horizonY: 0.655 * H, seeds: [], thought: { x: 120, y: 470, scale: 1, tension: 0.3 }, photos: [], energy: 0 }), serialize: () => ({ v: 1 }), restore() {}, pause() {}, resume() {}, destroy() {} }) }) };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, registry: createRegistry([STORM, WORLDS[1]]), ticker: fakeTicker(), store: memStore(), reducedMotion: true, lowStimulation: true, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} } });
    await D.start({ worldId: 'static-storm' });
    D.next();
    for (let i = 0; i < 200 && D.state.phase !== 'melting'; i++) { D.debug.step(1 / 60); await new Promise((r) => setTimeout(r, 2)); }
    const ocean = D.incoming;
    assert.ok(Math.abs(ocean.debug.hy - 0.44 * H) < 2, 'no rising horizon: already at 0.44 H');
    assert.ok(!ocean.debug.thought.from, 'the thought is already on the water');
    steps(D, 2);
    assert.equal(D.state.worldId, 'luminous-ocean', 'the crossfade took ~1.6 s');
  } finally { D?.destroy(); dom.restore(); }
});

test('world: no words and no photos (a gentle world for care) — still a whole sea, it completes on the long-period route', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, mallow = fakeMallow(W, H), found = [];
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought: null, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} } });
    D.on('discovery', (e) => found.push(e.id));
    await D.start({ worldId: 'luminous-ocean', emotion: 'sad', intention: 'calm' });
    const w = D.world;
    steps(D, 1);
    assert.equal(w.metrics.dist, null, 'no thought, no distance');
    for (let k = 0; k < 5; k++) { stroke(D, W / 2 + 20 * k - 30, 790, W / 2 + 20 * k - 20, 420, 0.18 * 390, 7); steps(D, 1.5); }
    assert.ok(!w.complete, `not before 40 s of play (${w.metrics.played.toFixed(0)} s)`);
    for (let k = 0; k < 30 && !w.complete; k++) steps(D, 1);
    assert.ok(w.complete, `complete on the period route (long ${w.metrics.long}, period ${w.metrics.period.toFixed(1)}, played ${w.metrics.played.toFixed(0)} s)`);
    assert.ok(w.metrics.played >= 40, 'after real play');
    assert.ok(!found.includes('distance'));
  } finally { D?.destroy(); dom.restore(); }
});

test('world (review r2): a bobbing hero never re-plans the screen; the thought keeps its own tension; nothing is drawn on the hero; strokes towards you bring it back from anywhere', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 320, H = 568;
    // a hero whose box moves with the float the world asks for (as the lab's rig and MallowTouch do)
    const B = Math.min(W * 0.58, H * 0.27, 300), bottom = Math.min(H * 0.885, H - 76);
    let lift = 0;
    const box = () => { const dy = -lift * B; return { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B + dy, bottom: bottom + dy, width: B, height: B, cx: W / 2, cy: bottom - B / 2 + dy }; };
    const mallow = { rect: box, bodyRect: box, react() {}, setEmotion() {}, lookAt() {}, float(f) { lift = f.lift || 0; } };
    const thought = { ...fakeThought(), state: {} };
    const registry = createRegistry(WORLDS);
    const subtitles = { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} };
    const photos = { n: 7, draw: () => ({ w: 1, h: 1 }), size: () => ({ w: 1, h: 1 }) };
    D = createHushflow({ worldEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), fxEl: Object.assign(dom.el(), { clientWidth: W, clientHeight: H }), mallow, thought, photos, subtitles, registry, ticker: fakeTicker(), store: memStore(), reducedMotion: false });
    await D.start({ worldId: 'luminous-ocean', emotion: 'anxious', intention: 'let-go', intensity: 0.9 });
    const w = D.world;
    steps(D, 1);
    const n0 = w.debug.layouts.n, t0 = w.debug.thought.tension;
    // a big sea rocking the hero while nobody touches: the bob alone never re-plans
    for (let k = 0; k < 3; k++) { stroke(D, 40 + 240 * (k % 2), 520, 40 + 240 * (k % 2), 270, 0.2 * W, 3); steps(D, 2); }
    const nPlay = w.debug.layouts.n;
    steps(D, 20);
    assert.equal(w.debug.layouts.n, nPlay, `no relayout from the hero's own bob (${nPlay} → ${w.debug.layouts.n})`);
    assert.ok(nPlay - n0 <= 0, 'none while playing either');
    // the thought's tension: its own feeling, moved only by the person's sea
    assert.ok(t0 > 0.7, `an anxious, intense thought starts tense (${t0.toFixed(2)})`);
    // nothing on the hero, ever: the thought, its words and every bubble, checked every step through a session
    let worst = 0;
    const check = () => {
      const h = box(), hb = { x0: h.left + 0.06 * B, x1: h.right - 0.06 * B, y0: h.top + 2, y1: h.bottom };
      for (const a of w.avoid()) {
        if (a.kind !== 'thought' && a.kind !== 'bubble') continue;
        const r = { x0: a.x + 4, y0: a.y + 4, x1: a.x + a.w - 4, y1: a.y + a.h - 4 };
        const o = Math.max(0, Math.min(r.y1, hb.y1) - Math.max(r.y0, hb.y0)) * (Math.min(r.x1, hb.x1) > Math.max(r.x0, hb.x0) ? 1 : 0);
        worst = Math.max(worst, o);
      }
    };
    const stepCheck = (sec) => { for (let t = 0; t < sec; t += 1 / 15) { D.debug.step(1 / 15); check(); } };
    for (let k = 0; k < 4; k++) { stroke(D, 36 + 248 * (k % 2), 530, 36 + 248 * (k % 2), w.debug.hy + 12, 0.2 * W, 4); stepCheck(4); }
    stepCheck(8);
    const far = w.metrics.dist;
    assert.ok(far >= 3, `drifted out (${far.toFixed(2)})`);
    // towards you, starting well in front of the far thought (30 px below the horizon, at the side): it still comes back
    for (let k = 0; k < 4; k++) { stroke(D, 36 + 248 * (k % 2), w.debug.hy + 30, 36 + 248 * (k % 2), 530, 0.2 * W, 5); stepCheck(3); }
    stepCheck(6);
    assert.ok(w.metrics.dist < far - 1.5, `brought back from anywhere: ${far.toFixed(2)} → ${w.metrics.dist.toFixed(2)}`);
    assert.equal(worst, 0, `nothing drawn on the hero (worst overlap ${worst.toFixed(1)} px)`);
    assert.ok(w.metrics.bubbles + w.metrics.waiting === 7 && w.metrics.bubbles >= 6, `the photos float (${w.metrics.bubbles} + ${w.metrics.waiting} waiting)`);
  } finally { D?.destroy(); dom.restore(); }
});

test('world (review r2): with nobody touching, the thought’s tension holds (it never calms by itself)', async () => {
  const dom = installFakeDom();
  let D = null;
  try {
    const { createHushflow } = await import('../src/hushfold/flow/director.js');
    const W = 390, H = 844, mallow = fakeMallow(W, H), thought = { ...fakeThought(), state: {} };
    D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), mallow, thought, registry: createRegistry(WORLDS), ticker: fakeTicker(), store: memStore(), reducedMotion: false, subtitles: { say: () => Promise.resolve(), choice: () => new Promise(() => {}), clear() {} } });
    await D.start({ worldId: 'luminous-ocean', emotion: 'anxious', intention: 'calm', intensity: 0.9 });
    const w = D.world;
    steps(D, 1);
    const a = w.debug.thought.tension;
    steps(D, 25);
    const b = w.debug.thought.tension;
    assert.ok(a > 0.7 && Math.abs(b - a) < 0.02, `tension ${a.toFixed(2)} → ${b.toFixed(2)} with no touch`);
    assert.ok(thought.state.tension > 0.7, 'and the handle carries it');
  } finally { D?.destroy(); dom.restore(); }
});

test('registry: the ocean is playable and its module loads', async () => {
  const reg = createRegistry();
  assert.equal(reg.get('luminous-ocean').status, STATUS.PLAYABLE);
  const m = await reg.load('luminous-ocean');
  assert.equal(typeof m.create, 'function');
});
