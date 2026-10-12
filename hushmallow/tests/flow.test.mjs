// Hushflow (W4) tests: the world registry and deterministic selection, the
// discovery state machines, the pace tracker, the Static Storm charge field
// and the realm core's per-call easing override.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { WORLDS, REQUIRED_FIELDS, STATUS, createRegistry, selectNext, fitScore, missingFields, isPlayable, hash01, FLOW_EMOTIONS, FLOW_INTENTIONS } from '../src/hushfold/flow/registry.js';
import { createSlowingDetector, createStillnessDetector, createSettleDetector, createPace, slowness, PACE } from '../src/hushfold/flow/discovery.js';
import { ChargeField, FIELD, gridFor } from '../src/hushfold/flow/worlds/storm-field.js';
import { createRealmCore, REALM_HORIZON, REALMS, resolveRealmId } from '../src/world/realm.js';
import { createVelocity, VELOCITY } from '../src/hushfold/flow/velocity.js';
import { planStormLayout, LAYOUT, cardSizeMax } from '../src/hushfold/flow/worlds/storm-layout.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const DT = 1 / 60;

// ------------------------------------------------------------- registry --
test('registry: every world carries the brief §16 fields, unique ids, valid links', () => {
  const ids = new Set();
  for (const w of WORLDS) {
    assert.deepEqual(missingFields(w), [], `${w.id} is missing fields`);
    assert.ok(!ids.has(w.id), `duplicate id ${w.id}`); ids.add(w.id);
    assert.ok(Object.values(STATUS).includes(w.status), `${w.id} status`);
    assert.equal(typeof w.load, 'function');
    assert.ok(w.fits?.emotions && w.fits?.intentions, `${w.id} fits`);
    for (const n of w.next) assert.ok(WORLDS.some((x) => x.id === n), `${w.id} → unknown next ${n}`);
    for (const [id, d] of Object.entries(w.discoveries || {})) {
      assert.ok(Array.isArray(d.lines) && d.lines.length >= 1 && d.lines.length <= 3, `${w.id}/${id} lines`);
      for (const l of d.lines) assert.ok(l.length <= 60, `short subtitle lines: "${l}"`);
    }
  }
  assert.ok(REQUIRED_FIELDS.length >= 16);
});

test('registry: the two pilot worlds, honest status and skill ids', () => {
  const storm = WORLDS.find((w) => w.id === 'static-storm');
  const ocean = WORLDS.find((w) => w.id === 'luminous-ocean');
  assert.ok(storm && ocean);
  assert.equal(storm.status, STATUS.PLAYABLE);
  assert.notEqual(ocean.status, STATUS.PLAYABLE, 'the ocean is not built yet, so it must never be offered');
  assert.equal(storm.memory.skillId, 'slowing-down');
  assert.equal(ocean.memory.skillId, 'a-little-more-room');
  assert.deepEqual(storm.discoveries.slowing.lines, ['See what happened?', 'You changed your pace.', 'The world responded.']);
  assert.ok(storm.next.includes('luminous-ocean'));
  assert.equal(storm.horizon, REALM_HORIZON['static-storm']);
});

test('registry: user-facing lines follow the brand and wording rules', () => {
  const text = JSON.stringify(WORLDS.map((w) => [w.dialogue, w.discoveries]));
  assert.ok(!/\bAI\b/.test(text), 'never "AI"');
  assert.ok(!/Hushmallow|HUSHMALLOW|HushMallow/.test(text), 'brand is always lowercase');
  assert.ok(!/\b(cure|cures|treat|treats|guarantee)\b/i.test(text), 'no cure claims');
  assert.ok(!/\bcolor\b|\bcalm(ed)? you\b/i.test(text));
  const src = readFileSync(`${root}src/hushfold/flow/registry.js`, 'utf8');
  assert.ok(!/\b(strike|burn|smash|explode)\b/i.test(src.replace(/never strike/gi, '')), 'no violent verbs');
});

test('fitScore: unknown feelings fall back to "other", unknown intentions to 0.6', () => {
  const storm = WORLDS[0];
  assert.equal(fitScore(storm, 'angry', 'calm'), 1);
  assert.equal(fitScore(storm, 'nonsense', 'calm'), storm.fits.emotions.other);
  assert.equal(fitScore(storm, 'angry', 'nonsense'), 0.6);
  assert.ok(FLOW_EMOTIONS.length === 8 && FLOW_INTENTIONS.length === 5);
});

// a synthetic catalogue for selection rules
const fake = (id, extra = {}) => ({ id, status: STATUS.PLAYABLE, fits: { emotions: { angry: 1, sad: 0.5, other: 0.5 }, intentions: { calm: 1 } }, next: [], ...extra });
const LIST = [fake('a', { next: ['c'] }), fake('b'), fake('c'), fake('d'), fake('e', { fits: { emotions: { angry: 0 }, intentions: { calm: 1 } } }), fake('f', { status: STATUS.PLANNED })];

test('selectNext: deterministic, never the current world, never unbuilt, never a zero fit', () => {
  const st = { current: 'a', emotion: 'angry', intention: 'calm', history: [], seed: 7, sessionCount: 3 };
  const r1 = selectNext(LIST, st), r2 = selectNext(LIST, st);
  assert.deepEqual(r1, r2);
  assert.notEqual(r1.id, 'a');
  for (let s = 0; s < 40; s++) {
    const r = selectNext(LIST, { ...st, seed: s });
    assert.ok(!['a', 'e', 'f'].includes(r.id), `picked ${r.id}`);
  }
});

test('selectNext: the authored next link wins ties; favourites come first', () => {
  assert.equal(selectNext(LIST, { current: 'a', emotion: 'angry', intention: 'calm' }).id, 'c');
  assert.equal(selectNext(LIST, { current: 'a', emotion: 'angry', intention: 'calm', favourites: ['d'] }).id, 'd');
});

test('selectNext: never one of the last 3 played while others remain; relaxes to the oldest', () => {
  const withFresh = [...LIST, fake('g')];
  const r = selectNext(withFresh, { current: 'a', emotion: 'angry', intention: 'calm', history: ['b', 'c', 'd'] });
  assert.equal(r.id, 'g', 'the one suitable world not played recently');
  assert.equal(r.reason, 'fresh');
  // only b, c, d are suitable and all were just played → the one played longest ago
  const small = [fake('a'), fake('b'), fake('c'), fake('d')];
  const rr = selectNext(small, { current: 'a', emotion: 'angry', intention: 'calm', history: ['c', 'b', 'd'] });
  assert.equal(rr.reason, 'relaxed');
  assert.equal(rr.id, 'c');
});

test('selectNext: a rotation bag per feeling × intention plays everything before repeating', () => {
  const list = [fake('a'), fake('b'), fake('c'), fake('d')];
  let bags = {}, current = 'a', history = [];
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const r = selectNext(list, { current, emotion: 'angry', intention: 'calm', bags, history, seed: 1 });
    seen.push(r.id); bags = r.bags; history = [...history, current]; current = r.id;
  }
  assert.equal(new Set(seen.slice(0, 3)).size, 3, `first cycle repeats: ${seen}`);
  const other = selectNext(list, { current: 'a', emotion: 'sad', intention: 'calm', bags });
  assert.equal(other.key, 'sad|calm');
  assert.ok(!bags['sad|calm']);
});

test('selectNext: nothing suitable → null, and the real registry never offers the unbuilt ocean', () => {
  assert.equal(selectNext([fake('a')], { current: 'a', emotion: 'angry' }).id, null);
  const reg = createRegistry();
  const r = reg.select({ current: 'static-storm', emotion: 'anxious', intention: 'let-go' });
  assert.equal(r.id, null);
  assert.equal(reg.select({ current: null, emotion: 'angry', intention: 'calm' }).id, 'static-storm');
  assert.ok(reg.playable('static-storm') && !reg.playable('luminous-ocean'));
  assert.ok(hash01('x') >= 0 && hash01('x') < 1 && hash01('x') === hash01('x'));
  assert.ok(isPlayable({ status: STATUS.DEV }));
});

// ------------------------------------------------------------ discovery --
/** Drive the slowing detector with a scripted sequence of phases. */
function runSlowing(phases, opts) {
  const d = createSlowingDetector(opts);
  let light = 0, ev = null, t = 0;
  for (const ph of phases) {
    for (let s = 0; s < ph.sec; s += DT) {
      light += (ph.drain || 0) * DT;
      const e = d.update(DT, { down: ph.down ?? true, fast: !!ph.fast, s: ph.s ?? 0, Q: ph.Q ?? 0.9, light });
      t += DT;
      if (e && !ev) ev = { ...e, t };
    }
  }
  return { d, ev };
}

test('slowing: fast with high charge, then a slow grounding run → fires once, with evidence', () => {
  const { d, ev } = runSlowing([{ sec: 1.3, fast: true, Q: 1.1 }, { sec: 2.2, s: 0.9, drain: 6 }]);
  assert.ok(ev, 'should fire');
  assert.equal(ev.id, 'slowing');
  assert.ok(ev.evidence.fastMs >= 1000 && ev.evidence.slowMs >= 1800 && ev.evidence.drained > 0);
  assert.ok(ev.evidence.qBefore >= 1.0);
  assert.ok(ev.t > 1.3 + 1.79 && ev.t < 1.3 + 1.9, `fires as the slow run reaches 1.8 s (t=${ev.t})`);
  assert.equal(d.update(DT, { down: true, fast: false, s: 1, Q: 0.5, light: 999 }), null, 'only once');
});

test('slowing: never fires without the contrast that the line describes', () => {
  // only slow
  assert.equal(runSlowing([{ sec: 6, s: 1, drain: 6 }]).ev, null);
  // fast but the storm was not charged
  assert.equal(runSlowing([{ sec: 1.5, fast: true, Q: 0.3 }, { sec: 3, s: 1, drain: 6, Q: 0.3 }]).ev, null);
  // and the charge rising only after the fast moment has passed does not arm it either
  assert.equal(runSlowing([{ sec: 1.5, fast: true, Q: 0.3 }, { sec: 3, s: 1, drain: 6, Q: 0.9 }]).ev, null);
  // too little fast movement (0.8 s)
  assert.equal(runSlowing([{ sec: 0.8, fast: true }, { sec: 3, s: 1, drain: 6 }]).ev, null);
  // slow, but over an already-grounded sky: nothing drained, so the world did not respond
  assert.equal(runSlowing([{ sec: 1.5, fast: true }, { sec: 3, s: 1, drain: 0 }]).ev, null);
  // the slow run starts more than 6 s after the fast moment
  assert.equal(runSlowing([{ sec: 1.5, fast: true }, { sec: 6.5, down: false }, { sec: 3, s: 1, drain: 6 }]).ev, null);
  // slow runs that keep breaking (>0.25 s) never reach 1.8 s
  const broken = []; for (let i = 0; i < 5; i++) broken.push({ sec: 1.0, s: 1, drain: 6 }, { sec: 0.4, s: 0.2 });
  assert.equal(runSlowing([{ sec: 1.5, fast: true }, ...broken]).ev, null);
});

test('slowing: brief wobbles (< 0.25 s) out of the slow band are forgiven; markFired restores', () => {
  const wob = []; for (let i = 0; i < 4; i++) wob.push({ sec: 0.6, s: 0.9, drain: 6 }, { sec: 0.1, s: 0.3, drain: 0 });
  assert.ok(runSlowing([{ sec: 1.5, fast: true }, ...wob]).ev);
  const d = createSlowingDetector(); d.markFired();
  assert.equal(d.fired, true);
});

test('stillness: two ground pulses that drained → fires; blocked while slowing waits; resets after a gap', () => {
  const step = (d, sec, m) => { let ev = null; for (let s = 0; s < sec; s += DT) ev = ev || d.update(DT, { pulse: false, fast: false, blocked: false, ...m }); return ev; };
  let d = createStillnessDetector({ drainMin: 3 });
  step(d, 7, {});
  assert.equal(d.update(DT, { pulse: true, pulseDrain: 2 }), null);
  step(d, 1.6, {});
  const ev = d.update(DT, { pulse: true, pulseDrain: 2 });
  assert.equal(ev?.id, 'stillness');
  assert.equal(ev.evidence.pulses, 2);
  d = createStillnessDetector({ drainMin: 3 });
  step(d, 7, {});
  d.update(DT, { pulse: true, pulseDrain: 2 }); step(d, 1.6, {});
  assert.equal(d.update(DT, { pulse: true, pulseDrain: 2, blocked: true }), null);
  d = createStillnessDetector({ drainMin: 3 });
  step(d, 7, {});
  d.update(DT, { pulse: true, pulseDrain: 2 }); step(d, 4, {});
  assert.equal(d.update(DT, { pulse: true, pulseDrain: 2 }), null, 'a long gap starts a new hold');
  d = createStillnessDetector({ drainMin: 3 });
  d.update(DT, { pulse: true, pulseDrain: 5, fast: true }); step(d, 1.6, {});
  assert.equal(d.update(DT, { pulse: true, pulseDrain: 5 }), null, 'not right after rushing');
});

test('settle: needs to have been charged, then quiet for 2 s', () => {
  const s = createSettleDetector();
  for (let t = 0; t < 3; t += DT) assert.equal(s.update(DT, 0.05), false, 'never charged → no settling');
  s.update(DT, 0.8);
  let fired = false, at = 0;
  for (let t = 0; t < 3; t += DT) if (s.update(DT, 0.1)) { fired = true; at = t; }
  assert.ok(fired && at >= 1.95 && at <= 2.05, `settles after 2 s (${at})`);
  assert.equal(s.settled, true);
});

test('pace: slowness bands, stillness after 0.6 s, calibration only ever lowers "fast"', () => {
  const U = 390;
  assert.equal(slowness(0, U), 1);
  assert.equal(slowness(0.12 * U, U), 1);
  assert.equal(slowness(0.65 * U, U), 0);
  assert.ok(slowness(0.4 * U, U) > 0.2 && slowness(0.4 * U, U) < 0.8);
  const gentle = createPace({ U });
  assert.equal(gentle.fastPx, PACE.touch.fastU * U);
  for (let t = 0; t < 4; t += DT) gentle.update(DT, true, 260);
  assert.ok(gentle.calibrated);
  assert.ok(gentle.fastPx < PACE.touch.fastU * U && gentle.fastPx >= PACE.touch.minFastU * U, `gentle movers can reach fast (${gentle.fastPx})`);
  const rusher = createPace({ U });
  for (let t = 0; t < 4; t += DT) rusher.update(DT, true, 2000);
  assert.equal(rusher.fastPx, PACE.touch.fastU * U, 'a fast scribbler is always fast');
  const still = createPace({ U });
  let r; for (let t = 0; t < 0.5; t += DT) r = still.update(DT, true, 5);
  assert.equal(r.still, false);
  for (let t = 0; t < 0.15; t += DT) r = still.update(DT, true, 5);
  assert.equal(r.still, true);
  assert.equal(still.update(DT, true, 2000).band, 'fast');
  assert.ok(PACE.mouse.fastU > PACE.touch.fastU, 'mice have their own constants');
});

// ------------------------------------------------------- pointer speed --
// paths: distance travelled d (px) → position
const zigPath = (A) => (d) => { const k = Math.floor(d / (2 * A)), u = (d % (2 * A)) / (2 * A); return [200 + (k % 2 ? A - u * 2 * A : -A + u * 2 * A), 400]; };
const circlePath = (R) => (d) => [200 + Math.cos(d / R) * R, 400 + Math.sin(d / R) * R];
const linePath = (d) => [20 + d, 400];
/** Median smoothed speed over the last 1.5 s of a 2 s gesture at a true speed. */
function seen(path, speed, hz) {
  const v = createVelocity();
  v.reset(...path(0), 0);
  const out = [];
  for (let i = 1; i <= 2 * hz; i++) { const t = i / hz; out.push(v.sample(...path(t * speed), t)); }
  const tail = out.slice(Math.floor(hz / 2)).sort((a, b) => a - b);
  return tail[tail.length >> 1];
}

test('speed: scribbles, zigzags and circles read at their true speed (path length, scalar EMA), 60 and 120 Hz', () => {
  const U = 390, fast = PACE.touch.fastU * U;
  const cases = [['scribble ±60 px', zigPath(60), 1500], ['scribble ±40 px', zigPath(40), 1200], ['zigzag ±105 px', zigPath(105), 1400],
    ['circles r 60', circlePath(60), 1400], ['circles r 120', circlePath(120), 1400], ['straight line', linePath, 1400]];
  for (const hz of [60, 120]) {
    for (const [name, path, v] of cases) {
      const s = seen(path, v, hz);
      assert.ok(s >= 0.85 * v && s <= 1.05 * v, `${name} at ${hz} Hz: true ${v} px/s, seen ${Math.round(s)}`);
      assert.ok(s > fast, `${name} at ${hz} Hz counts as fast (${Math.round(s)} > ${Math.round(fast)})`);
    }
    for (const v of [50, 130, 220]) {
      const s = seen(linePath, v, hz);
      assert.ok(Math.abs(s - v) < 0.05 * v, `a slow stroke at ${v} px/s reads ${Math.round(s)}`);
      assert.ok(slowness(s, U) > 0.05, `${v} px/s is in the slow band`);
    }
  }
});

test('speed: touch jitter on a resting finger is not movement; the direction vector is separate from speed', () => {
  const v = createVelocity();
  v.reset(100, 100, 0);
  let r = 7;
  const jit = () => { r = (r * 16807) % 2147483647; return (r / 2147483647 - 0.5) * 1.6; };
  for (let i = 1; i <= 240; i++) v.sample(100 + jit(), 100 + jit(), i / 120);
  assert.ok(v.speed < PACE.touch.stillU * 390, `±0.8 px jitter reads ${v.speed.toFixed(1)} px/s`);
  // a scribble: big path speed, small net velocity (it goes nowhere)
  const w = createVelocity(); const path = zigPath(60);
  w.reset(...path(0), 0);
  for (let i = 1; i <= 240; i++) w.sample(...path((i / 120) * 1500), i / 120);
  assert.ok(w.speed > 1200 && Math.hypot(w.vx, w.vy) < 0.4 * w.speed, `speed ${Math.round(w.speed)}, |v| ${Math.round(Math.hypot(w.vx, w.vy))}`);
  // a straight stroke: the vector points along it
  const l = createVelocity(); l.reset(0, 0, 0);
  for (let i = 1; i <= 60; i++) l.sample(i * 10, 0, i / 120);
  assert.ok(l.vx > 1100 && Math.abs(l.vy) < 1, 'direction of travel');
});

test('speed: a finger that stops sending events slows to still (stale after its usual gap, τ 0.12 s); a fast stroke registers within 3 frames', () => {
  const U = 390;
  const v = createVelocity();
  v.reset(40, 400, 0);
  for (let i = 1; i <= 24; i++) v.sample(40 + i * 12.5, 400, i / 120);     // 0.2 s at 1500 px/s
  assert.ok(v.speed > 1000);
  assert.equal(v.idle(1 / 60, 0.03), false, 'a normal gap between events is not a stop');
  let quiet = 0;
  for (let f = 0; f < 60; f++) { quiet += 1 / 60; v.idle(1 / 60, quiet); }
  assert.ok(v.speed < PACE.touch.stillU * U, `1 s without events → ${v.speed.toFixed(2)} px/s`);
  // a slow event stream (8 Hz) is not mistaken for stopping between its events
  const slow = createVelocity(); slow.reset(0, 0, 0);
  for (let i = 1; i <= 16; i++) slow.sample(i * 40, 0, i / 8);
  assert.ok(slow.staleSec > 0.15 && slow.staleSec <= VELOCITY.STALE_MAX_SEC, `stale after ${slow.staleSec.toFixed(3)} s at 8 Hz`);
  assert.equal(slow.idle(1 / 60, 0.1), false);
  // speeding up registers quickly: a 1500 px/s stroke is past 'fast' (702) within 3 frames at 120 Hz
  const quick = createVelocity(); quick.reset(0, 0, 0);
  let n = 0; while (quick.speed < PACE.touch.fastU * U && n < 60) { n++; quick.sample(n * 12.5, 0, n / 120); }
  assert.ok(n <= 6, `fast after ${n} events (${(n / 2).toFixed(1)} frames)`);
});

/**
 * The pure pipeline the director and the storm run each frame: 120 Hz events → speed →
 * pace band → 'slowing' detector. phases: { sec, path?(d), speed?, down? (default true), drain? }.
 */
function play(phases, U = 390) {
  const v = createVelocity(), pace = createPace({ U }), det = createSlowingDetector({ drainScale: 8 });
  let light = 0, ev = null, t = 0, quiet = 0, wasDown = false, d = 0, last = null;
  const bands = [];
  for (const ph of phases) {
    const down = ph.down ?? true;
    d = 0;
    for (let s = 0; s < ph.sec - 1e-9; s += DT) {
      if (down && !wasDown) { const p0 = (ph.path || linePath)(0); v.reset(p0[0], p0[1], t); quiet = 0; }
      if (down && ph.path) {
        for (const h of [0.5, 1]) { d += ph.speed * DT / 2; const p = ph.path(d); v.sample(p[0], p[1], t + h * DT); }
        quiet = 0;
      } else quiet += DT;
      v.idle(DT, quiet);
      wasDown = down;
      t += DT;
      const b = pace.update(DT, down, down ? v.speed : 0);
      light += (ph.drain || 0) * DT;
      last = b.band; bands.push(b.band);
      const e = det.update(DT, { down, fast: b.fast, s: b.s, Q: 0.9, light });
      if (e && !ev) ev = { ...e, t };
    }
  }
  return { ev, det, last, bands, v };
}

test('slowing: a real fast scribble arms it and a slow stroke afterwards fires it', () => {
  const r = play([{ sec: 1.6, path: zigPath(60), speed: 1500 }, { sec: 2.6, path: linePath, speed: 100, drain: 5 }]);
  assert.ok(r.ev, 'fires');
  assert.ok(r.ev.evidence.fastMs >= 1000 && r.ev.evidence.slowMs >= 1800, JSON.stringify(r.ev.evidence));
  assert.ok(r.bands.slice(10, 90).filter((b) => b === 'fast').length > 70, 'the scribble is fast nearly all the time');
});

test('slowing: time spent resting after a short fast moment never arms it (no events while resting)', () => {
  // 0.2 s fast, then the finger rests with no events for 3 s, then a long slow stroke that drains
  const r = play([{ sec: 0.2, path: linePath, speed: 1500 }, { sec: 3 }, { sec: 3, path: linePath, speed: 100, drain: 5 }]);
  assert.equal(r.ev, null, 'the line would not be true');
  assert.equal(r.det.state, 'idle');
  // and the resting finger reads as still
  const rest = play([{ sec: 0.4, path: zigPath(60), speed: 1500 }, { sec: 1.2 }]);
  assert.equal(rest.last, 'still', 'a stopped finger is still');
  assert.ok(rest.v.speed < PACE.touch.stillU * 390);
});

// --------------------------------------------------------------- layout --
/** The hero Mallow as the Hushfold shell places it in a world, and the director's band and safe rect. */
function stormScreen(W, H) {
  const B = Math.max(130, Math.min(W * 0.58, H * 0.27, 300)), bottom = Math.min(H * 0.885, H - 76);
  const mallow = { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B, bottom, width: B, height: B };
  const band = { x: 0, y: 76, w: W, h: Math.min(156, Math.max(118, Math.round(H * 0.17))) };
  const safe = { x: 20, y: band.y + band.h + 6, w: W - 40, h: mallow.top - 14 - (band.y + band.h + 6) };
  return { W, H, mallow, band, safe };
}
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

test('storm layout: the subtitle band stays clear; postcards, the words and Glitzi never overlap; 20 px edges', () => {
  const sizes = [[320, 568], [375, 667], [375, 812], [390, 844], [430, 932], [844, 390], [1280, 800]];
  for (const [W, H] of sizes) for (const n of [0, 3, 7]) for (const tw of [0, 120, 245, 330]) {
    const sc = stormScreen(W, H);
    const p = planStormLayout({ ...sc, n, thought: tw ? { textW: tw } : null });
    const tag = `${W}×${H} n=${n} text=${tw}`;
    assert.equal(p.slots.length, n, `${tag}: every postcard has a place`);
    const bandBottom = sc.band.y + sc.band.h;
    const boxes = p.slots.map((q) => ({ x0: q.x - p.s / 2, y0: q.y - p.s / 2, x1: q.x + p.s / 2, y1: q.y + p.s / 2 }));
    const glitzi = { x0: sc.mallow.left, y0: sc.mallow.top, x1: sc.mallow.right, y1: sc.mallow.bottom };
    boxes.forEach((b, i) => {
      assert.ok(b.y0 >= bandBottom + 4, `${tag}: postcard ${i} under the band (${b.y0.toFixed(1)} ≥ ${bandBottom + 4})`);
      assert.ok(b.x0 >= LAYOUT.EDGE - 0.01 && b.x1 <= W - LAYOUT.EDGE + 0.01, `${tag}: postcard ${i} keeps 20 px from the edges`);
      assert.ok(!hit(b, glitzi), `${tag}: postcard ${i} clear of Glitzi`);
      for (let j = 0; j < i; j++) assert.ok(!hit(b, boxes[j]), `${tag}: postcards ${i} and ${j} overlap`);
      if (p.thought) for (const r of [p.thought.R.body, p.thought.R.plate]) assert.ok(!hit(b, r), `${tag}: postcard ${i} covers the thought`);
    });
    if (p.thought) {
      const R = p.thought.R;
      assert.ok(R.top >= bandBottom, `${tag}: the thought is under the band`);
      assert.ok(R.plate.x0 >= LAYOUT.EDGE - 0.01 && R.plate.x1 <= W - LAYOUT.EDGE + 0.01, `${tag}: the words plate keeps 20 px from the edges`);
      assert.ok(!hit(R.all, glitzi), `${tag}: the words are clear of Glitzi`);
    }
  }
});

test('storm layout: postcards are ≥ 0.2U on standard phones (0.19U at 375×812), and use the room beside Glitzi in landscape', () => {
  for (const [W, H, min] of [[390, 844, 0.2], [430, 932, 0.2], [375, 812, 0.185]]) {
    const U = Math.min(W, H);
    for (const n of [3, 7]) {
      const p = planStormLayout({ ...stormScreen(W, H), n, thought: { textW: 245 } });
      assert.ok(p.s >= Math.floor(min * U), `${W}×${H} n=${n}: ${p.s} px ≥ ${(min * U).toFixed(0)}`);
      assert.ok(p.s <= cardSizeMax(n, U) + 1e-6);
    }
  }
  const p = planStormLayout({ ...stormScreen(844, 390), n: 7, thought: { textW: 245 } });
  assert.ok(p.thought.name.startsWith('side'), `landscape: the thought sits beside Glitzi (${p.thought.name})`);
});

// --------------------------------------------------------- charge field --
const field = () => new ChargeField({ x: 0, y: 70, w: 390, h: 560, q0: 0.7, seed: 3 });

test('field: about 512 square-ish cells for any rect; deterministic seeding', () => {
  for (const [w, h] of [[390, 560], [320, 380], [1280, 600]]) {
    const { cols, rows } = gridFor(w, h);
    assert.ok(cols * rows > 440 && cols * rows < 600, `${w}×${h}: ${cols}×${rows}`);
    assert.ok(Math.abs(w / cols - h / rows) / (w / cols) < 0.25, 'square-ish cells');
  }
  assert.deepEqual(Array.from(field().q), Array.from(field().q));
});

test('field: fast strokes add charge (never light); draining turns exactly the charge removed into light', () => {
  const f = field();
  const t0 = f.total(), l0 = f.light;
  const added = f.deposit(50, 200, 340, 220, 1.2);
  assert.ok(added > 3, `deposit adds charge (${added})`);
  assert.ok(Math.abs(f.total() - (t0 + added)) < 1e-3);
  assert.equal(f.light, l0, 'fast movement never counts as progress');
  const before = f.total();
  const d = f.drain(195, 210, FIELD.DRAIN_RATE, 0.5);
  assert.ok(d > 0);
  assert.ok(Math.abs(before - f.total() - d) < 1e-3, 'conservation');
  assert.ok(Math.abs(f.light - d) < 1e-6);
  const p = f.drainDisk(100, 400, 90, FIELD.PULSE_RATE, 0.5);
  assert.ok(p > 0 && f.light > d);
});

test('field: physics never creates light, never lowers the storm\'s own floor', () => {
  const f = field();
  f.deposit(50, 300, 340, 320, 2);
  const floor = Float32Array.from(f.f), l = f.light;
  for (let i = 0; i < 600; i++) f.step(DT);
  assert.equal(f.light, l);
  for (let i = 0; i < f.n; i++) assert.ok(f.q[i] >= f.f[i] - 1e-3 || f.q[i] >= 0, 'stays non-negative');
  let sum0 = 0, sum1 = 0; for (let i = 0; i < f.n; i++) { sum0 += floor[i]; sum1 += f.f[i]; }
  assert.equal(sum1, sum0, 'the floor only drops by grounding');
  assert.ok(f.storminess() > 0.3, 'the storm does not calm itself');
});

test('field: fast scribbling alone never progresses; slow grounding completes in 15–60 s', () => {
  const f = field();
  let px = 200, py = 300;
  for (let t = 0, ph = 0; t < 30; t += DT) { ph += DT * 9; const x = 195 + Math.sin(ph) * 150, y = 300 + Math.sin(ph * 1.7) * 120; f.deposit(px, py, x, y, 1); px = x; py = y; f.step(DT); }
  assert.equal(f.progress, 0);
  assert.ok(f.storminess() > 1.1, 'and the storm looks it');
  const g = field();
  let x = 40, y = 110, dir = 1, row = 0, t = 0;
  const s = slowness(130, 390);           // a gentle, real-world pace
  while (t < 120 && g.progress < 1) {
    x += dir * 130 * DT;
    if (x > 350 || x < 40) { dir *= -1; row++; y = 110 + ((row * 41) % 500); x = Math.max(40, Math.min(350, x)); }
    g.drain(x, y, FIELD.DRAIN_RATE * s, DT); g.step(DT); t += DT;
  }
  assert.ok(g.progress >= 1, 'completes');
  assert.ok(t > 15 && t < 60, `slow grounding takes ${t.toFixed(1)} s`);
});

test('field: snapshot is small and restores the floor and light', () => {
  const f = field();
  f.drain(100, 200, 2, 1); f.drain(300, 400, 2, 1);
  const snap = f.snapshot();
  assert.ok(JSON.stringify(snap).length < 1200, `${JSON.stringify(snap).length} bytes`);
  const g = field();
  assert.ok(g.restore(snap));
  assert.ok(Math.abs(g.light - f.light) < 0.01);
  let diff = 0; for (let i = 0; i < f.n; i++) diff = Math.max(diff, Math.abs(g.f[i] - f.f[i]));
  assert.ok(diff < FIELD.CAP / 35 + 1e-6, `quantised floor within one step (${diff})`);
  assert.equal(field().restore({ c: 1, r: 1, f: 'x', light: 4 }), false, 'a mismatched grid only restores light');
});

// ------------------------------------------------------------ realm core --
const stubCanvas = () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) });

test('realm core: no DOM needed to drive it; per-call tau makes the backdrop answer fast', () => {
  const core = createRealmCore('static-storm', { canvas: stubCanvas(), W: 390, H: 844, dpr: 1, mood: { agitation: 0 } });
  assert.equal(core.horizonY, Math.round(844 * 0.655));
  const ease = (tau) => {
    const c = createRealmCore('static-storm', { canvas: stubCanvas(), W: 390, H: 844, dpr: 1, mood: { agitation: 0 } });
    c.setMood({ agitation: 1 }, tau ? { tau } : undefined);
    for (let i = 0; i < 21; i++) c.tick(1000 / 60);   // 0.35 s
    return c.st.raw.agitation;
  };
  const fast = ease(0.35), slow = ease();
  assert.ok(fast > 0.6 && fast < 0.66, `τ 0.35 s → ~63% after 0.35 s (${fast})`);
  assert.ok(slow > 0.2 && slow < 0.24, `default τ 1.4 s → ~22% (${slow})`);
  const t = createRealmCore('blue-drift', { canvas: stubCanvas(), W: 390, H: 844, dpr: 1 });
  t.transform(1, { tau: 0.6 }); for (let i = 0; i < 36; i++) t.tick(1000 / 60);
  assert.ok(t.st.p > 0.6, `transform τ override (${t.st.p})`);
  assert.equal(resolveRealmId('glitzi'), 'static-storm');
  for (const id of Object.keys(REALMS)) assert.ok(REALM_HORIZON[id] > 0.4 && REALM_HORIZON[id] < 0.7, id);
});

test('realm core: the realm sources still match the horizon table', () => {
  for (const [id, frac] of Object.entries(REALM_HORIZON)) {
    const src = readFileSync(`${root}src/world/realms/${id}.js`, 'utf8');
    assert.ok(src.includes(`H * ${frac}`), `${id} draws its horizon at H × ${frac}`);
  }
});

test('progress: the storm\'s saved state passes the flow-store sanitiser intact (ids and numbers only)', async () => {
  const fs = await import('../src/engine/flow-store.js');
  const f = field(); f.drain(100, 200, 2, 1);
  const w = { v: 1, seed: 123456, progress: 0.42, complete: false, field: f.snapshot(), discoveries: ['slowing'],
    photoState: Array.from({ length: 7 }, (_, i) => ({ i, grounded: i < 2, q: 0.5 })), thought: { q: 0.3, settled: false }, elapsed: 31 };
  const st = { w, d: ['slowing'], o: ['slowing-down'], i: 0.7, c: 0 };
  assert.deepEqual(fs.sanitizeState(st), st);
  assert.ok(JSON.stringify(st).length < 2048);
  const g = field();
  assert.ok(g.restore(fs.sanitizeState(st).w.field));
  // and words could never ride along: free text is dropped by the store
  assert.equal(fs.sanitizeState({ token: 'My boss embarrassed me' }).token, undefined);
});
