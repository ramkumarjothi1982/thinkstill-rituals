// Unit tests for Mallow Nightlight (spec-nightlight.md §13): U1–U18, plus U19–U24
// (slice 2: the frame-clock timeline and moments, the five modes on a fake api, world helpers;
// slice 3: the night sound facade, bedPlan and NightBed; slice 4: the settings sheet's view and
// the stylesheet's scope, night tokens and no-blur rules). Node only; every clock,
// timer and random source is injected, so results are exact:
//   node --test hushmallow/sensory-lab/tests/nightlight.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  STORE_KEY, TIMER_MINUTES, ARRIVE_S, fadeSeconds, levelsAt, validRecord, SessionClock, DisplayLevels,
  MAX_EXTRA_MIN, ENDED_KEEP_MS, NO_TIMER_MAX_MS, saveRecord, loadRecord, clearRecord,
} from '../features/nightlight/session.js';
import {
  MODES_ORDER, SPEEDS, MOTIONS, MOTION_RULES, NIGHT_DEFAULTS, NIGHT_KEYS, cleanField, cleanNight, storedFields,
  defaultsFromDNA, effectiveMotion, tempIndex, tempAt, NightSettings,
} from '../features/nightlight/settings.js';
import {
  TEMPS, MALLOW_SHIFT, envGains, mallowGains, lightColour, tempColour, mixHex, luminance, nightLook, chromeTokens, LightLimiter,
} from '../features/nightlight/look.js';
import { NIGHT_CAPS, PACE, fpsFor, FramePacer } from '../core/frame-pacer.js';
import {
  SPEED_K, BreathPacer, SleepyScript, SLEEPY_KINDS, BIG_EVENTS, STRETCH, SPACING_S, TOUCH_QUIET_S, rampFor, LEAD_MIN_S,
} from '../features/nightlight/pacing.js';
import {
  NIGHT_SCENES, NIGHT_REALMS, NIGHT_WAYS, NIGHT_SET, SLEEPY_PEEK, AROUSED, NIGHT_REACTS, NIGHT_VOICES, NIGHT_K, NIGHT_I_FLOOR, REST, PLAIN_SCENE,
  FALLBACK_WORLD, FADE_HEAVY, nightWorld, nightMood, nightSet, nightFilter, nightVoice, restFor, peekFor, waysFor,
} from '../features/nightlight/ways.js';
import { COPY, clock, endTitle, pct } from '../features/nightlight/copy.js';
import { Personality, PROFILES } from '../core/personality.js';
import { Prefs, DEFAULTS } from '../core/prefs.js';
import { SoundEngine } from '../core/sound-engine.js';
import { ComfortDNA } from '../core/comfort-dna.js';
import { MemoryComfortStore } from '../adapters/comfort-store.js';
import { REALM_GEO, lightAnchor } from '../core/environment.js';
import { MALLOWS, MALLOW_IDS } from '../../src/mallows/registry.js';
import { REALM_IDS } from '../../src/world/realm.js';
import { PARAM_NAMES } from '../../src/mallows/expressions.js';
import { installAudioGlobals, reaches } from './lib/fake-audio.mjs';
import { collectStrings, lintCopy } from './lib/copy-lint.mjs';
import { NETWORK, scanFiles, filesUnder } from './lib/static-scan.mjs';
import { MODES, TOUCHES, SWELL, LIVE, Timeline, Moments, startMode } from '../features/nightlight/modes.js';
import { MARGIN, boxGround, stillDpr } from '../features/nightlight/world.js';
import { FaceMixer } from '../core/expression-engine.js';
import { ScreenWake, WAKE_MAX_MS } from '../core/screen-wake.js';
import { BED, TEXTURES, PAD_LP, padFreq, nightSound, bedPlan, NightBed } from '../features/nightlight/bed.js';
import { VOICES } from '../core/sound-engine.js';
import { sheetView, fadeMinutes } from '../features/nightlight/sheet.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const MIN = 60e3;
const T0 = Date.UTC(2026, 9, 14, 21, 30);   // a fixed evening
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/** A clock and a SessionClock on it. */
function session(opts = {}, start = T0) {
  const time = { t: start };
  const c = new SessionClock({ now: () => time.t, ...opts });
  c.start();
  return { c, time };
}

/** Fake timers: advance(ms) runs due callbacks in time order. */
function fakeTimers() {
  let now = 0, id = 0;
  const timers = new Map();
  return {
    setTimeout: (fn, ms) => { timers.set(++id, { at: now + (ms || 0), fn }); return id; },
    clearTimeout: (h) => { timers.delete(h); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]); now = due[1].at; due[1].fn();
      }
      now = end;
    },
    get pending() { return timers.size; },
  };
}

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

// ================================================================== U1 ==
test('U1 SessionClock: phases change exactly at 15 s, fadeFrom and endsAt; No timer never fades; fadeSeconds', () => {
  assert.equal(fadeSeconds(10, true), 200);
  assert.equal(fadeSeconds(20, true), 400);
  assert.equal(fadeSeconds(30, true), 480);
  assert.equal(fadeSeconds(45, true), 480);
  assert.equal(fadeSeconds(60, true), 480);
  for (const m of [10, 20, 30, 45, 60]) assert.equal(fadeSeconds(m, false), 10);
  assert.equal(fadeSeconds(0, true), 0);
  assert.deepEqual(TIMER_MINUTES, [10, 20, 30, 45, 60, 0]);
  assert.equal(STORE_KEY, 'hm.sensorylab.nightlight.session.v1');

  const { c } = session({ minutes: 30, fade: true });
  const t0 = c.startedAt;
  assert.equal(c.endsAt, t0 + 30 * MIN);
  assert.equal(c.fadeFrom, c.endsAt - 480e3);
  assert.equal(c.phase(t0), 'arriving');
  assert.equal(c.phase(t0 + ARRIVE_S * 1000 - 1), 'arriving');
  assert.equal(c.phase(t0 + ARRIVE_S * 1000), 'steady');
  assert.equal(c.phase(c.fadeFrom - 1), 'steady');
  assert.equal(c.phase(c.fadeFrom), 'fading');
  assert.equal(c.phase(c.endsAt - 1), 'fading');
  assert.equal(c.phase(c.endsAt), 'ended');
  assert.equal(c.remaining(t0), 30 * MIN);
  assert.equal(c.remaining(c.endsAt + 5000), 0);

  const off = session({ minutes: 10, fade: false }).c;
  assert.equal(off.endsAt - off.fadeFrom, 10e3, 'fade off: a 10 s settle');

  const none = session({ minutes: 0 }).c;
  assert.equal(none.endsAt, null);
  assert.equal(none.fadeFrom, null);
  for (const h of [1, 6, 11.9]) {
    const t = none.startedAt + h * 3600e3;
    assert.equal(none.phase(t), 'steady');
    assert.deepEqual(none.levels(t, {}), { world: 1, mallow: 1, sound: 1, u: 0 });
    assert.equal(none.remaining(t), Infinity);
  }
});

// ================================================================== U2 ==
test('U2 through a fade: world, Mallow and sound never rise; the world reaches 0.5 first; all are 0 at endsAt', () => {
  for (const [minutes, fade] of [[10, true], [30, true], [60, true], [20, false]]) {
    const { c } = session({ minutes, fade });
    const span = c.endsAt - c.fadeFrom, out = {};
    let prev = { world: 1, mallow: 1, sound: 1 }, worldHalf = null, mallowHalf = null;
    for (let i = 0; i <= 1000; i++) {
      const t = c.fadeFrom - 0.05 * span + (1.1 * span * i) / 1000;
      const l = c.levels(t, out);
      for (const k of ['world', 'mallow', 'sound']) {
        assert.ok(l[k] <= prev[k] + 1e-12, `${k} rose at ${i} (${minutes} min)`);
        assert.ok(l[k] >= 0 && l[k] <= 1);
      }
      if (worldHalf == null && l.world <= 0.5) worldHalf = t;
      if (mallowHalf == null && l.mallow <= 0.5) mallowHalf = t;
      prev = { world: l.world, mallow: l.mallow, sound: l.sound };
    }
    assert.ok(worldHalf < mallowHalf, 'the world falls asleep before the Mallow');
    assert.deepEqual(c.levels(c.endsAt, {}), { world: 0, mallow: 0, sound: 0, u: 1 });
  }
  // the shape itself
  const l = levelsAt(0.5, {});
  assert.ok(l.world < l.mallow, 'mid-fade the Mallow is still brighter than its world');
  assert.ok(near(levelsAt(0.75, {}).world, 0));
  assert.ok(near(levelsAt(0.35, {}).mallow, 1));
  assert.ok(near(levelsAt(0.5, {}).sound, 0.25));
});

// ================================================================== U3 ==
test('U3 clock jumps: −1 h never adds time; +1 h ends early; levels depend only on now', () => {
  const { c, time } = session({ minutes: 30 });
  time.t += 10 * MIN;
  const r1 = c.remaining();
  const rev = c.rev;
  time.t -= 3600e3;                                   // the clock goes back an hour
  assert.equal(c.remaining(), r1, 'remaining unchanged by a backwards jump');
  assert.equal(c.phase(), 'steady');
  assert.ok(c.rev > rev, 'a shift is a change worth saving');
  time.t += 1000;
  assert.equal(c.remaining(), r1 - 1000, 'then time passes as usual');
  time.t -= 1500;                                     // a small wobble is held still
  assert.equal(c.remaining(), r1 - 1000);
  time.t += 1500;
  assert.equal(c.remaining(), r1 - 1000);
  time.t += 3600e3;                                   // forward an hour: ends early, never late
  assert.equal(c.phase(), 'ended');
  assert.equal(c.remaining(), 0);

  // the same session sampled densely or sparsely shows the same levels at the same time
  const a = session({ minutes: 20 }), b = session({ minutes: 20 });
  const out = {};
  const checkpoints = [12, 15, 17, 18.5, 19.2, 19.9, 20].map((m) => T0 + m * MIN);
  const dense = [], sparse = [];
  for (let t = T0; t <= T0 + 20 * MIN; t += 16) { a.time.t = t; const l = a.c.levels(undefined, out); if (checkpoints.includes(t)) dense.push(l.world, l.mallow, l.sound); }
  for (const t of checkpoints) { b.time.t = t; const l = b.c.levels(undefined, out); sparse.push(l.world, l.mallow, l.sound); }
  assert.deepEqual(dense, sparse);
  // explicit t is pure: asking about an earlier time never shifts the session
  const { c: p } = session({ minutes: 30 });
  const ends = p.endsAt;
  p.phase(p.endsAt + 1); p.levels(T0 - 3600e3, {}); p.remaining(T0 + 5 * MIN);
  assert.equal(p.endsAt, ends);
});

// ================================================================== U4 ==
test('U4 restart from now, extend, stop soon; displayed levels never rise except after extend (≥ 2 s)', () => {
  const { c, time } = session({ minutes: 30 });
  time.t += 5 * MIN;
  c.restart({ minutes: 10 });
  assert.equal(c.startedAt, time.t);
  assert.equal(c.endsAt, time.t + 10 * MIN);
  assert.equal(c.fadeFrom, c.endsAt - 200e3);
  assert.equal(c.phase(), 'steady', 'a timer change does not arrive again');
  c.restart({ minutes: 0 });
  assert.equal(c.endsAt, null);
  c.restart({ minutes: 20, fade: false });
  assert.equal(c.endsAt - c.fadeFrom, 10e3);

  // "A little longer"
  const s = session({ minutes: 30 });
  s.time.t = s.c.fadeFrom + 60e3;
  const [e0, f0] = [s.c.endsAt, s.c.fadeFrom];
  assert.equal(s.c.extend(10), true);
  assert.equal(s.c.endsAt - e0, 600e3);
  assert.equal(s.c.fadeFrom - f0, 600e3);
  assert.equal(s.c.phase(), 'steady', 'back out of the fade');
  let n = 1;
  while (s.c.extend(10)) n++;
  assert.equal(n, MAX_EXTRA_MIN / 10, 'capped');
  assert.equal(s.c.canExtend, false);
  s.time.t = s.c.endsAt + 1;
  assert.equal(s.c.extend(10), false, 'nothing to extend once ended');
  assert.equal(session({ minutes: 0 }).c.extend(10), false, 'No timer');

  // "Fade out now" from steady, from mid-fade (keeps its progress), and with No timer
  const q = session({ minutes: 30 });
  q.time.t += 3 * MIN;
  assert.equal(q.c.stopSoon(12), true);
  assert.equal(q.c.fadeFrom, q.time.t);
  assert.equal(q.c.endsAt, q.time.t + 12e3);
  assert.equal(q.c.phase(), 'fading');
  const m = session({ minutes: 30 });
  m.time.t = m.c.fadeFrom + 240e3;                    // u = 0.5
  const before = m.c.levels(undefined, {});
  assert.equal(m.c.stopSoon(12), true);
  const after = m.c.levels(undefined, {});
  for (const k of ['world', 'mallow', 'sound']) assert.ok(near(before[k], after[k], 1e-9), `${k} carries on from where it was`);
  assert.equal(m.c.remaining(), 6e3);
  const z = session({ minutes: 0 });
  z.time.t += 2 * 3600e3;
  assert.equal(z.c.stopSoon(), true);
  assert.equal(z.c.endsAt, z.time.t + 12e3);

  // displayed levels: a target that wanders up and down never pulls them up…
  const d = new DisplayLevels();
  const rand = (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  let target = { world: 1, mallow: 1, sound: 1 };
  for (let i = 0; i < 2000; i++) {
    const v = rand();
    target = { world: v, mallow: Math.min(1, v + 0.2), sound: v * v };
    const prev = [d.world, d.mallow, d.sound];
    d.step(0.05, target);
    assert.ok(d.world <= prev[0] + 1e-12 && d.mallow <= prev[1] + 1e-12 && d.sound <= prev[2] + 1e-12, `rose at ${i}`);
  }
  // …and they follow it down with a 0.8 s half-life
  const e = new DisplayLevels();
  e.step(0.8, { world: 0, mallow: 0, sound: 0 });
  assert.ok(near(e.world, 0.5, 1e-9));
  // after extend they ease back up over 2 s, no faster
  const r = new DisplayLevels().snap({ world: 0.2, mallow: 0.3, sound: 0.1 });
  r.rise();
  const up = { world: 1, mallow: 1, sound: 1 };
  let t = 0, last = 0.2;
  while (t < 1.95) { r.step(0.05, up); t += 0.05; assert.ok(r.world >= last - 1e-12 && r.world < 1 - 1e-3, `still rising at ${t.toFixed(2)} s`); last = r.world; }
  r.step(0.05, up); r.step(0.05, up);
  assert.ok(near(r.world, 1) && near(r.mallow, 1) && near(r.sound, 1), 'there after 2 s');
  assert.equal(r.rising, false);
  // snap (start, return from hidden) sets them at once
  const sn = new DisplayLevels().snap({ world: 0.4, mallow: 0.6, sound: 0.2 });
  assert.deepEqual([sn.world, sn.mallow, sn.sound], [0.4, 0.6, 0.2]);
});

// ================================================================== U5 ==
test('U5 restore: resume, ended, stale, left, malformed and tampered records', () => {
  const { c, time } = session({ minutes: 30, mode: 'breathe' });
  time.t += 12 * MIN;
  const rec = JSON.stringify(c.toJSON());
  const back = SessionClock.restore(rec, () => time.t);
  assert.ok(back instanceof SessionClock);
  assert.equal(back.endsAt, c.endsAt, 'same deadline');
  assert.equal(back.fadeFrom, c.fadeFrom);
  assert.equal(back.mode, 'breathe');
  assert.equal(back.phase(), 'steady');
  assert.equal(JSON.parse(JSON.stringify(c)).leftAt, undefined, 'JSON.stringify passes a key, never a leftAt');

  // ended less than 6 h ago → the end view; 6 h or more → fresh
  assert.deepEqual(SessionClock.restore(rec, () => c.endsAt + 5 * 3600e3), { ended: true, endsAt: c.endsAt });
  assert.deepEqual(SessionClock.restore(rec, () => c.endsAt), { ended: true, endsAt: c.endsAt });
  assert.equal(SessionClock.restore(rec, () => c.endsAt + ENDED_KEEP_MS), null);

  // leftAt: more than 5 s ago → fresh; 5 s or less → resume
  assert.equal(SessionClock.restore(c.toJSON(time.t - 5001), () => time.t), null);
  assert.ok(SessionClock.restore(c.toJSON(time.t - 5000), () => time.t) instanceof SessionClock);
  assert.ok(SessionClock.restore(c.toJSON(time.t - 200), () => time.t) instanceof SessionClock);

  // No timer: within 12 h resumes, after 12 h fresh
  const none = session({ minutes: 0 }).c.toJSON();
  assert.ok(SessionClock.restore(none, () => none.startedAt + 11 * 3600e3) instanceof SessionClock);
  assert.equal(SessionClock.restore(none, () => none.startedAt + NO_TIMER_MAX_MS + 1), null);

  // malformed and tampered
  const good = c.toJSON();
  const now = () => time.t;
  const bad = [
    'not json', '', 'null', '[]', '42',
    { ...good, v: 2 },
    { ...good, startedAt: '1700000000000' },
    { ...good, startedAt: NaN },
    { ...good, endsAt: Infinity },
    { ...good, fadeFrom: null },
    { ...good, endsAt: good.startedAt - 1, fadeFrom: good.startedAt - 2 },     // endsAt < startedAt
    { ...good, minutes: 60, endsAt: good.startedAt + 62 * MIN, fadeFrom: good.startedAt + 54 * MIN },   // span > 61 min
    { ...good, fadeFrom: good.endsAt - 481e3 },                                // fade > 480 s
    { ...good, startedAt: time.t + 61e3, endsAt: time.t + 61e3 + 30 * MIN, fadeFrom: time.t + 61e3 + 22 * MIN },   // future start
    { ...good, mode: 'disco' },
    { ...good, mode: '__proto__' },
    { ...good, minutes: 25 },
    { ...good, fade: 'yes' },
    { ...good, extra: -10 },
    { ...good, extra: 1e6 },
    { ...good, leftAt: 'soon' },
    { ...good, endsAt: null },                                                 // a deadline with half its fields
    { ...good, endsAt: null, fadeFrom: null },                                 // a 30-minute timer with no deadline
  ];
  for (const b of bad) assert.equal(SessionClock.restore(typeof b === 'string' ? b : JSON.stringify(b), now), null, JSON.stringify(b));
  assert.equal(validRecord({ ...good, minutes: 60, endsAt: good.startedAt + 61 * MIN, fadeFrom: good.startedAt + 53 * MIN }, time.t), true, '61 min is allowed');
  // an extended session (+10 min) stays valid after a reload
  const x = session({ minutes: 60 });
  x.time.t = x.c.fadeFrom + 1000;
  x.c.extend(10);
  x.time.t += 1000;
  assert.ok(SessionClock.restore(JSON.stringify(x.c), () => x.time.t) instanceof SessionClock);

  // storage helpers: the record round-trips; blocked storage never throws
  const store = memStorage();
  assert.equal(loadRecord(store, now), null, 'nothing stored: fresh');
  assert.equal(saveRecord(store, c), true);
  assert.equal(JSON.parse(store.getItem(STORE_KEY)).endsAt, c.endsAt);
  assert.equal(loadRecord(store, now).endsAt, c.endsAt);
  saveRecord(store, c, time.t - 60e3);
  assert.equal(loadRecord(store, now), null, 'left a minute ago: fresh');
  assert.equal(clearRecord(store), true);
  assert.equal(store.getItem(STORE_KEY), null);
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.equal(saveRecord(blocked, c), false);
  assert.equal(loadRecord(blocked, now), null);
  assert.equal(clearRecord(blocked), false);
  assert.equal(loadRecord(null, now), null);
});

// ================================================================== U6 ==
test('U6 nightLook: the Mallow never dims below its world, ≥ 2.5× at low brightness, monotonic, no NaN', () => {
  const out = {};
  const grid = [0, 0.1, 0.25, 0.35, 0.5, 0.75, 0.9, 1];
  let prevB = null;
  for (let b = 0.05; b <= 1.0001; b += 0.05) {
    for (const Lm of grid) for (const Lw of grid.filter((w) => w <= Lm)) {
      const l = nightLook({ brightness: b, temp: 0.5, world: Lw, mallow: Lm, glowHex: '#fff4c8' }, out);
      for (const k of ['worldB', 'mallowB', 'glow', 'haloAlpha', 'warmth']) assert.ok(Number.isFinite(l[k]), k);
      assert.ok(l.mallowB >= l.worldB - 1e-12, `mallowB ≥ worldB at B ${b.toFixed(2)}, Lw ${Lw}, Lm ${Lm}`);
      if (Lw === 0) assert.ok(l.worldB <= 0.02);
    }
    const steady = nightLook({ brightness: b, temp: 0.5, world: 1, mallow: 1 }, {});
    if (b <= 0.2 + 1e-9) assert.ok(steady.mallowB / steady.worldB >= 2.5, `ratio at B ${b.toFixed(2)}: ${(steady.mallowB / steady.worldB).toFixed(2)}`);
    assert.ok(steady.mallowB >= 0.45, 'the floor');
    if (prevB) for (const k of ['worldB', 'mallowB', 'glow', 'haloAlpha']) assert.ok(steady[k] >= prevB[k], `${k} grows with brightness`);
    prevB = { ...steady };
  }
  // monotonic in the levels
  for (const k of ['world', 'mallow']) {
    let prev = -1;
    for (let v = 0; v <= 1.0001; v += 0.05) {
      const l = nightLook({ brightness: 0.4, world: k === 'world' ? v : 1, mallow: k === 'mallow' ? v : 1 }, {});
      const x = k === 'world' ? l.worldB : l.mallowB;
      assert.ok(x >= prev); prev = x;
    }
  }
  // junk in, sane numbers out; the arrays are reused
  const j = nightLook({ brightness: NaN, temp: 'warm', world: undefined, mallow: -3, glowHex: 7 }, out);
  for (const k of ['worldB', 'mallowB', 'glow', 'haloAlpha', 'warmth']) assert.ok(Number.isFinite(j[k]));
  const g = out.mallowGrade;
  nightLook({ brightness: 0.8, temp: 1 }, out);
  assert.equal(out.mallowGrade, g, 'no allocation per frame');
  assert.ok(near(out.mallowGrade[2], out.mallowGain[2] * out.mallowB));
  assert.match(out.light, /^#[0-9a-f]{6}$/);
});

// ================================================================== U7 ==
test('U7 colour temperature: blue falls Moon → Ember; the Mallow shifts ≤ 40 % of the world; light lies between', () => {
  assert.deepEqual(TEMPS.map((t) => t[0]), [...COPY.sheet.light.names]);
  let prevBlue = Infinity;
  for (let i = 0; i <= 40; i++) {
    const temp = i / 40, e = envGains(temp), m = mallowGains(temp);
    assert.ok(e[2] < prevBlue, `blue strictly falls at ${temp}`); prevBlue = e[2];
    for (let c = 0; c < 3; c++) {
      assert.ok(e[c] <= 1 && m[c] <= 1 && e[c] > 0);
      assert.ok(1 - m[c] <= MALLOW_SHIFT * (1 - e[c]) + 1e-12, 'Mallow shift ≤ 40 % of the world\'s');
    }
  }
  assert.deepEqual(envGains(0), [...TEMPS[0][1]]);
  assert.deepEqual(envGains(1), [...TEMPS[4][1]]);
  assert.ok(mallowGains(1)[2] >= 0.7, 'the rig grade\'s blue stays ≥ 0.7 even at Ember');
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (const glow of ['#fff4c8', '#3ee8ff', '#ffd23a', '#cdb6ff']) {
    for (const temp of [0, 0.25, 0.5, 0.75, 1]) {
      const L = rgb(lightColour(glow, temp)), A = rgb(glow), B = rgb(tempColour(temp));
      for (let c = 0; c < 3; c++) assert.ok(L[c] >= Math.min(A[c], B[c]) - 1 && L[c] <= Math.max(A[c], B[c]) + 1, `${glow} @ ${temp}`);
    }
  }
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#fff', '#000', 0), '#ffffff');
  assert.equal(mixHex('nonsense', '#ffffff', 1), '#ffffff');
  // the chrome tokens follow the light; the chrome text stays readable on near-black
  const tok = chromeTokens(nightLook({ temp: 0 }, {}));
  assert.match(tok['--nl-light'], /^#[0-9a-f]{6}$/);
  assert.match(tok['--nl-chip-on'], /^rgba\(/);
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const t of ['#e9e3fa', '#cfc6ea', '#a79dcb', '#fff1dc']) assert.ok(contrast(t, '#0a081a') >= 4.5, t);
});

// ================================================================== U8 ==
test('U8 LightLimiter: rises ≥ 300 ms (600 for touch); 20 requests a second give ≤ 1 brightening start per 2 s', () => {
  let T = 0;
  const lim = new LightLimiter({ now: () => T });
  const first = lim.request(0.4);
  assert.deepEqual(first, { k: 0.4, riseMs: 600 });
  T = 5000;
  assert.equal(lim.request(1, { riseMs: 50 }).riseMs, 300, 'never faster than 300 ms');
  const starts = [];
  T = 10000;
  for (let i = 0; i < 20 * 20; i++) { if (lim.request(0.4)) starts.push(T); T += 50; }   // 20 s of 20 taps a second
  assert.ok(starts.length >= 9 && starts.length <= 10, `${starts.length} starts`);
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= 2000);
  T += 3000;
  assert.ok(lim.request(0.4), 'the next start after the gap');
  for (let i = 0; i < 3; i++) { T += 100; assert.equal(lim.request(0.4), null, 'extra taps only extend the hold'); }
  const log = lim.log;
  assert.equal(log.length, 32);
  assert.ok(log.some((e) => !e.ok) && log.some((e) => e.ok));
  assert.deepEqual(Object.keys(log[0]).sort(), ['kind', 'ok', 't']);
});

// ================================================================== U9 ==
test('U9 frame caps: the table, touch and event boosts, fading, Still, the low tier, hidden and ended', () => {
  for (const [mode, cap] of Object.entries(NIGHT_CAPS)) {
    assert.equal(fpsFor({ mode, phase: 'steady' }), cap);
    assert.equal(fpsFor({ mode, phase: 'fading', worldLevel: 0.8 }), Math.min(cap, 12));
    assert.equal(fpsFor({ mode, phase: 'fading', worldLevel: 0.29 }), 8);
    assert.ok(fpsFor({ mode, phase: 'steady', motion: 'still' }) <= 10);
    assert.equal(fpsFor({ mode, phase: 'steady', quality: 'low' }), Math.max(8, Math.round(cap * 0.8)));
    assert.equal(fpsFor({ mode, phase: 'arriving' }), 30);
    assert.equal(fpsFor({ mode, phase: 'steady', event: true }), 30);
    assert.equal(fpsFor({ mode, phase: 'steady', event: true, quality: 'low' }), 24);
    assert.equal(fpsFor({ mode, phase: 'steady', interacting: true }), null, 'display rate while touched');
    assert.equal(fpsFor({ mode, phase: 'steady', interacting: true, quality: 'low' }), 30);
    assert.equal(fpsFor({ mode, phase: 'steady', interacting: true, motion: 'still' }), null, 'touch stays direct at any Movement');
    assert.equal(fpsFor({ mode, phase: 'ended', interacting: true }), 0);
    assert.equal(fpsFor({ mode, phase: 'steady', hidden: true, interacting: true }), 0);
  }
  assert.deepEqual(NIGHT_CAPS, { moonlight: 15, breathe: 24, sleepy: 15, drift: 20, quiet: 10 });
  assert.equal(fpsFor({ mode: 'quiet', phase: 'steady', quality: 'low' }), 8);
  assert.equal(fpsFor({ mode: 'moonlight', phase: 'fading', worldLevel: 0.1, quality: 'low' }), 8, 'never below 8');
  assert.equal(fpsFor({ mode: 'drift', phase: 'arriving', motion: 'still' }), 10);
  assert.equal(fpsFor({ mode: 'toString', phase: 'steady' }), PACE.steady, 'own keys only');

  let T = 0;
  const p = new FramePacer({ now: () => T });
  const calls = [];
  const rig = { setFrameCap: (c) => calls.push(c) };
  const st = { mode: 'moonlight', phase: 'steady', motion: 'gentle', quality: 'medium', worldLevel: 1 };
  assert.equal(p.apply(rig, st), 15);
  assert.equal(p.apply(rig, st), 15);
  assert.deepEqual(calls, [15], 'setFrameCap only on change');
  p.touch();
  assert.equal(p.interacting, true);
  assert.equal(p.apply(rig, st), null);
  T = 2499; assert.equal(p.cap(st), null);
  T = 2500; assert.equal(p.cap(st), 15, 'the touch boost lasts 2.5 s');
  p.event(1000);
  assert.equal(p.cap(st), 30);
  p.event(200);
  T = 3400; assert.equal(p.cap(st), 30, 'a shorter event never cuts a longer one');
  T = 3500; assert.equal(p.cap(st), 15);
  assert.equal(p.apply(rig, { ...st, phase: 'ended' }), 0);
  assert.deepEqual(calls, [15, null, 0]);
  p.reset();
  assert.equal(p.applied, null);
});

// ================================================================= U10 ==
test('U10 BreathPacer: durations, level range, gentle rate, leading, slow-down, one turn per phase', () => {
  for (const [id, k] of Object.entries(SPEED_K)) assert.equal(k, SPEEDS[id].k);
  for (const speed of ['slowest', 'slow', 'natural']) {
    const timing = { inhale: 4, exhale: 6 };
    const b = new BreathPacer({ ...timing, speedK: SPEED_K[speed], slowOverS: 1e9 });
    const dur = {}, seen = [];
    let phase = b.phase, since = 0;
    for (let i = 0; i < 3 * 20 * 30; i++) {
      const o = b.step(0.01);
      since += 0.01;
      assert.ok(o.level >= 0 && o.level <= 1);
      if (o.turned) {
        seen.push(o.phase);
        (dur[phase] ||= []).push(since);
        phase = o.phase; since = 0;
      }
    }
    const k = SPEED_K[speed];
    for (const [p, want] of [['in', 4 * k], ['holdIn', 0.3], ['out', 6 * k], ['holdOut', 0.7]]) {
      for (const d of dur[p]) assert.ok(Math.abs(d - want) < 0.02, `${speed} ${p}: ${d.toFixed(3)} vs ${want}`);
    }
    assert.ok(Math.abs(b.period - (10 * k + 1)) < 1e-6);
    for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1], 'turned fires once per phase');
  }

  // rate: ≤ 0.1 per 50 ms, through random leads and releases
  const b = new BreathPacer({ inhale: 3.5, exhale: 5, speedK: 1 });
  const rand = (() => { let x = 11; return () => ((x = (x * 48271) % 2147483647) / 2147483647); })();
  let prev = b.level;
  for (let i = 0; i < 4000; i++) {
    if (rand() < 0.02) b.lead(rand() < 0.5);
    const o = b.step(0.05);
    assert.ok(Math.abs(o.level - prev) <= 0.1 + 1e-9, `jumped at ${i}`);
    prev = o.level;
  }

  // leading: an inhale from here lasting ≥ 1.2 s, held at the top, then an exhale from here
  const l = new BreathPacer({ inhale: 4, exhale: 6 });
  for (let i = 0; i < 60; i++) l.step(0.05);              // partway into the first inhale
  for (let i = 0; i < 60; i++) l.step(0.05);
  const at = l.level;
  assert.ok(at > 0.5 && at < 1);
  l.lead(true);
  let o = l.step(0.05), t = 0.05;
  assert.equal(o.turned, true);
  assert.equal(o.phase, 'in');
  while (l.phase === 'in') { l.step(0.05); t += 0.05; }
  assert.ok(t >= LEAD_MIN_S - 1e-9, `led inhale lasted ${t.toFixed(2)} s`);
  for (let i = 0; i < 200; i++) l.step(0.05);             // ten seconds held
  assert.equal(l.phase, 'holdIn', 'held at the top while led');
  assert.ok(near(l.level, 1));
  l.lead(false);
  o = l.step(0.05);
  assert.equal(o.phase, 'out');
  assert.ok(o.level > 0.95, 'the exhale starts from where it was (no snap)');
  // a lead from low down never snaps up
  const s = new BreathPacer({ inhale: 4, exhale: 6 });
  while (s.phase !== 'holdOut') s.step(0.05);
  s.lead(true);
  assert.ok(s.step(0.05).level < 0.1);

  // the slow-down: × 1.12 at most, reached at 600 s
  const w = new BreathPacer({ inhale: 4, exhale: 6 });
  const p0 = w.period;
  for (let i = 0; i < 700 * 10; i++) w.step(0.1);
  assert.ok(near(w.period, (10 * 1.12) + 1, 1e-9));
  assert.ok(w.period / p0 <= 1.12 + 1e-9);
  assert.ok(w.cycle >= 2, 'cycles counted for the first-two-cycles captions');
});

// ================================================================= U11 ==
function runScript(opts, secs, { dt = 0.05, touchAt = [], holdAt = null } = {}) {
  const s = new SleepyScript(opts), evs = [];
  for (let i = 0, n = Math.round(secs / dt); i < n; i++) {
    const t = (i + 1) * dt;
    const e = s.step(dt);
    if (e) evs.push({ ...e, d: s.d });
    if (touchAt.some((x) => Math.abs(x - t) < dt / 2)) s.touch();
    if (holdAt != null && Math.abs(holdAt - t) < dt / 2) s.holdLong();
  }
  return { s, evs };
}

test('U11 SleepyScript: seeded, spaced, uneven; touch, holdLong, motion and closed eyes', () => {
  const opts = { seed: 1234, speedK: 1, rampS: 600 };
  const a = runScript(opts, 900).evs, b = runScript(opts, 900).evs;
  assert.deepEqual(a, b, 'deterministic');
  assert.notDeepEqual(runScript({ ...opts, seed: 99 }, 900).evs, a, 'a different seed, a different evening');

  for (const seed of [1, 2, 3, 42, 777, 9001]) {
    const { evs } = runScript({ seed, speedK: 1, rampS: 600 }, 1200);
    const yawn = evs.find((e) => e.kind === 'yawn'), stretch = evs.find((e) => e.kind === 'stretch');
    assert.ok(yawn.t <= 25 + 1e-6, `seed ${seed}: first yawn at ${yawn.t}`);
    assert.ok(stretch.t >= 45 - 1e-6 && stretch.t <= 60 + 1e-6, `seed ${seed}: first stretch at ${stretch.t}`);
    const big = evs.filter((e) => BIG_EVENTS.includes(e.kind) && !e.follow);
    const allBig = evs.filter((e) => BIG_EVENTS.includes(e.kind));
    for (let i = 1; i < allBig.length; i++) if (!allBig[i].follow) assert.ok(allBig[i].t - allBig[i - 1].t >= SPACING_S - 1e-6, `seed ${seed}: big moments ${allBig[i - 1].kind}@${allBig[i - 1].t} and ${allBig[i].kind}@${allBig[i].t}`);
    assert.ok(big.length > 3);
    for (const st of evs.filter((e) => e.kind === 'stretch')) {
      const end = st.t + STRETCH.ramp + STRETCH.hold + STRETCH.release;
      const settle = evs.find((e) => e.kind === 'settle' && e.follow && e.t >= st.t);
      assert.ok(settle && settle.t >= end - 1e-6 && settle.t <= end + 2 + 1e-6, `seed ${seed}: a settle within 2 s after the stretch at ${st.t}`);
      assert.ok(st.d < 0.6, 'no stretch once d ≥ 0.6');
    }
    for (const e of evs.filter((x) => x.kind === 'dream')) assert.ok(e.d >= 0.85, 'dreams only when deep asleep');
    for (const e of evs.filter((x) => x.kind === 'nod')) assert.ok(e.d >= 0.6 && e.d < 0.85);
    assert.ok(!evs.some((e) => e.kind === 'peek'), 'open eyes blink, never peek');
    // intervals vary: blinks are uneven, never the same twice in a row
    const blinks = evs.filter((e) => e.kind === 'blink').map((e) => e.t);
    const gaps = blinks.slice(1).map((t, i) => t - blinks[i]);
    const mean = gaps.reduce((x, y) => x + y, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((x, y) => x + (y - mean) ** 2, 0) / gaps.length);
    assert.ok(sd > 0.5, `blink SD ${sd.toFixed(2)}`);
    for (let i = 1; i < gaps.length; i++) assert.ok(Math.abs(gaps[i] - gaps[i - 1]) > 1e-6, 'no equal neighbours');
    assert.ok(evs.some((e) => e.kind === 'blink' && e.double) || blinks.length < 8, 'some blinks are doubled');
  }

  // nothing within 3 s of a touch; a touch lowers d by 0.15
  const touches = [30, 70, 71.5, 140, 200, 260];
  const { evs: te, s: ts } = runScript({ seed: 5, rampS: 600 }, 300, { touchAt: touches });
  for (const e of te) for (const t of touches) assert.ok(!(e.t > t && e.t < t + TOUCH_QUIET_S - 1e-6), `${e.kind} at ${e.t} right after a touch at ${t}`);
  const s = new SleepyScript({ seed: 1, rampS: 100 });
  for (let i = 0; i < 1000; i++) s.step(0.05);                // 50 s → d 0.5
  assert.ok(near(s.d, 0.5, 1e-6));
  s.touch();
  assert.ok(near(s.d, 0.35, 1e-6));
  assert.equal(s.stage, 'settling');
  s.holdLong();
  assert.ok(s.d >= 0.9, 'asleep in your hand');
  assert.equal(s.stage, 'asleep');
  void ts;

  // Less and Still: stretches become settles; Still has no dreams
  for (const motion of ['less', 'still']) {
    const { evs } = runScript({ seed: 8, rampS: 300, motion }, 1500);
    assert.ok(!evs.some((e) => e.kind === 'stretch'));
    assert.ok(evs.some((e) => e.kind === 'settle'));
    if (motion === 'still') assert.ok(!evs.some((e) => e.kind === 'dream'));
  }
  // closed-eyed Mallows peek instead of blinking
  const { evs: ce } = runScript({ seed: 3, rampS: 600, closedEyes: true }, 600);
  assert.ok(ce.some((e) => e.kind === 'peek'));
  assert.ok(!ce.some((e) => e.kind === 'blink'));
  assert.ok(ce.filter((e) => e.kind === 'peek').every((e) => e.d < 0.7));

  // force() plays on the next step (a forced stretch still brings its settle)
  const f = new SleepyScript({ seed: 2 });
  f.step(0.05);
  f.force('stretch');
  const fe = f.step(0.05);
  assert.equal(fe.kind, 'stretch');
  let follow = null;
  for (let i = 0; i < 100 && !follow; i++) { const e = f.step(0.05); if (e?.follow) follow = e; }
  assert.equal(follow?.kind, 'settle');
  f.force('nonsense');
  assert.ok(SLEEPY_KINDS.every((k) => typeof k === 'string'));

  // the drowsiness ramp
  assert.equal(rampFor(0, true, 1), 600);
  assert.equal(rampFor(10, true, 1), 180);                     // 0.4 × (600 − 200 − 15) = 154 → 180
  assert.ok(near(rampFor(30, true, 1), 0.4 * (1800 - 480 - 15)));      // 522 s
  assert.equal(rampFor(60, true, 1), 720);                           // capped
  assert.equal(rampFor(60, true, 1.25), 720, 'animation speed never changes when drowsiness arrives');
  assert.equal(rampFor(30, true, 1.25), rampFor(30, true, 1));
  assert.equal(rampFor(60, false, 1), 720);
});

// ================================================================= U12 ==
const SEQ = [
  ...Array.from({ length: 12 }, (_, i) => ['tap', { streak: i + 1, steady: i % 3 === 2, interval: 420 }]),
  ['doubletap', {}], ['tap', { streak: 1 }], ['doubletap', {}],
  ['holdstart', {}], ['holding', { dur: 1500 }], ['holding', { dur: 4500 }], ['holdend', {}],
  ['strokestart', {}], ['stroke', { speed: 400 }], ['stroke', { speed: 1300 }], ['stroke', { speed: 300 }], ['strokeend', {}],
  ['dragstart', {}], ['dragend', { fling: false }], ['dragstart', {}], ['dragend', { fling: true }],
  ['squeezestart', {}], ['squeezeend', { peak: 0.2 }], ['squeezestart', {}], ['squeezeend', { peak: 0.6 }],
];

test('U12 nightFilter × 7 Mallows × every gesture × streaks 1–12 × 200 seeds (real Personality)', () => {
  const profilesBefore = JSON.stringify(PROFILES);
  const tapTags = Object.fromEntries(MALLOW_IDS.map((id) => [id, new Set()]));
  let checked = 0;
  for (const id of MALLOW_IDS) {
    const allowedVoices = [...NIGHT_VOICES, ...(id === 'glitzi' || id === 'noomi' ? ['grumble'] : [])];
    for (let seed = 1; seed <= 200; seed++) {
      const plain = new Personality(id, { seed, style: 'gentle' });
      const night = new Personality(id, { seed, style: 'gentle' });
      night.setFilter(nightFilter(id));
      for (const [g, d] of SEQ) {
        const p = plain.respond(g, d), r = night.respond(g, d);
        if (!p) { assert.equal(r, null, `${id} ${g}: the filter never invents a response`); continue; }
        if (!r) continue;
        checked++;
        assert.ok(r.react == null || NIGHT_REACTS.includes(r.react), `${id} ${g}: reaction ${r.react}`);
        assert.ok(r.voice == null || allowedVoices.includes(r.voice), `${id} ${g}: voice ${r.voice}`);
        if (r.mix) for (const k of AROUSED) assert.ok(!(r.mix[k] > 0), `${id} ${g}: ${k} at night`);
        assert.ok(r.poke <= 0.5 * (p.poke ?? 1) + 1e-12, `${id} ${g}: poke`);
        assert.ok(near(r.i, Math.max(NIGHT_I_FLOOR, (p.i ?? 0.6) * NIGHT_K.i), 1e-12));
        assert.ok(r.i >= 0.6, `${id} ${g}: intensity ${r.i} would wake the rig's idle reactions`);
        if (Number.isFinite(p.hold)) assert.ok(near(r.hold, p.hold * NIGHT_K.hold, 1e-12));
        assert.ok(r.tag.startsWith('night-') && r.tag === `night-${p.tag}`);
        if (g === 'tap') tapTags[id].add(r.tag);
      }
    }
  }
  assert.ok(checked > 30000, `${checked} responses checked`);
  assert.equal(JSON.stringify(PROFILES), profilesBefore, 'authored profiles are never mutated');
  // the seven Mallows stay distinct at night
  for (let i = 0; i < MALLOW_IDS.length; i++) for (let j = i + 1; j < MALLOW_IDS.length; j++) {
    const a = [...tapTags[MALLOW_IDS[i]]].sort().join(), b = [...tapTags[MALLOW_IDS[j]]].sort().join();
    assert.notEqual(a, b, `${MALLOW_IDS[i]} and ${MALLOW_IDS[j]} answer taps differently`);
  }
  // the specific night answers
  const f = nightFilter('boppo');
  assert.equal(f({ react: 'hop', mix: { excited: 1 }, i: 0.5, voice: 'giggle', poke: 1, tag: 'tap-hop' }, 'tap').react, 'nod');
  assert.equal(f({ react: 'celebrate', i: 0.5, tag: 'x' }, 'holdend').react, undefined, 'no jumps outside taps');
  assert.equal(f({ react: 'tap', i: 0.5, tag: 'x' }, 'tap').react, 'nod', "Boppo's tap becomes a nod");
  assert.equal(f(null, 'tap'), null);
  const loomi = nightFilter('loomi')({ react: 'tap', mix: { happy: 1 }, i: 0.5, voice: 'tap', tag: 'tap-small-smile' }, 'tap');
  assert.equal(loomi.react, undefined, 'Loomi stays asleep');
  assert.equal(loomi.voice, undefined, '…and makes no sound');
  const glitzi = nightFilter('glitzi')({ react: 'glitchBurst', mix: { surprised: 1 }, i: 0.5, voice: 'surprise', tag: 'tap-glitch' }, 'tap');
  assert.deepEqual([glitzi.react, glitzi.voice, glitzi.mix], ['nod', 'grumble', NIGHT_WAYS.glitzi.nightMix]);
  assert.equal(nightFilter('pipzi')({ voice: 'grumble', i: 0.5, tag: 'x' }, 'stroke').voice, 'coo', 'grumble is Glitzi\'s and Noomi\'s only');
  // Noomi yawns about one tap in three
  const nf = nightFilter('noomi');
  let yawns = 0;
  for (let i = 0; i < 3000; i++) if (nf({ react: 'tap', i: 0.5, tag: 'x' }, 'tap').react === 'yawn') yawns++;
  assert.ok(yawns > 850 && yawns < 1150, `${yawns} yawns in 3000`);
  // the facade's voice map: night voices at half level, everything else mapped or silent
  assert.deepEqual(nightVoice('noomi')('noomi', 'coo', 0.6), ['coo', 0.3]);
  assert.deepEqual(nightVoice('noomi')('noomi', 'giggle', 0.8), ['coo', 0.4]);
  assert.deepEqual(nightVoice('glitzi')('glitzi', 'grumble', 0.4), ['grumble', 0.2]);
  assert.deepEqual(nightVoice('boppo')('boppo', 'grumble', 0.4), ['coo', 0.2]);
  assert.equal(nightVoice('loomi')('loomi', 'tap', 0.6), null);
  assert.deepEqual(nightVoice('loomi')('loomi', 'hum', 0.6), ['hum', 0.3]);
});

// ================================================================= U13 ==
const WAY_FIELDS = ['world', 'warmthBias', 'mood', 'closedEyes', 'greet', 'sign', 'set', 'fx', 'stretch', 'tapReact', 'voice', 'grumble', 'nightMix', 'peek', 'answer', 'dream', 'stillHere'];

test('U13 night worlds: always a night realm or the plain night; calm scenes; every Mallow fully authored', () => {
  const ENVS = ['auto', 'stage', ...REALM_IDS, 'junk', '', null, undefined, '__proto__', 'toString'];
  for (const id of MALLOW_IDS) {
    for (const env of ENVS) {
      const w = nightWorld(id, env);
      if (env === 'stage') { assert.equal(w.realmId, null); assert.equal(w.scene, PLAIN_SCENE); assert.equal(w.mood, null); continue; }
      assert.ok(NIGHT_REALMS.includes(w.realmId), `${id} / ${env}: ${w.realmId}`);
      assert.ok(!['blue-drift', 'sunpop-orchard'].includes(w.realmId));
      if (NIGHT_REALMS.includes(env)) assert.equal(w.realmId, env, 'a chosen night realm is used');
      else assert.equal(w.realmId, NIGHT_WAYS[id].world, 'otherwise the Mallow\'s own night world');
      for (const k of ['agitation', 'heaviness', 'clarity', 'warmth']) assert.ok(w.mood[k] >= 0 && w.mood[k] <= 1);
    }
  }
  // a world a screenshot review switched off maps to the cove
  const scenes = { ...NIGHT_SCENES, 'spark-festival': { ...NIGHT_SCENES['spark-festival'], ok: false } };
  assert.equal(nightWorld('pipzi', 'auto', { scenes }).realmId, FALLBACK_WORLD);
  assert.equal(nightWorld('boppo', 'spark-festival', { scenes }).realmId, 'moonmilk-cove');
  assert.equal(nightWorld('nobody', 'auto').realmId, FALLBACK_WORLD);

  for (const [id, sc] of Object.entries(NIGHT_SCENES)) {
    assert.ok(REALM_IDS.includes(id));
    assert.equal(REALM_GEO[id].sky === 'day', false, `${id} is a night or dusk sky`);
    assert.ok(sc.mood.agitation <= 0.05, `${id} agitation`);
    assert.deepEqual([sc.look.nx, sc.look.ny], lightAnchor(id), 'the light comes from REALM_GEO');
    assert.ok(['waves', 'air', 'hush'].includes(sc.texture));
    assert.equal(sc.ok, true);
    for (const temp of [0, 0.5, 1]) for (const heavy of [0, 0.5, 1]) for (const m of MALLOW_IDS) {
      const mood = nightMood({ ...nightWorld(m, id), scene: sc }, { temp, heavy });
      assert.ok(mood.heaviness <= Math.max(sc.maxHeavy, sc.mood.heaviness) + 1e-12);
      assert.ok(mood.warmth <= sc.warmthCap + 1e-12);
      assert.ok(mood.agitation <= 0.05);
    }
  }
  assert.ok(NIGHT_SCENES['raindrop-lagoon'].maxHeavy <= 0.3, 'the lagoon never rains (it does above 0.35)');
  assert.ok(NIGHT_SCENES['static-storm'].warmthCap <= 0.3, 'no dawn glow in the storm');
  // the fade steps heaviness up, never past the cap; warmth follows the Light setting
  const cove = nightWorld('noomi', 'auto');
  assert.ok(near(nightMood(cove, { heavy: 1 }).heaviness, Math.min(0.3, 0.12 + FADE_HEAVY)));
  assert.ok(nightMood(cove, { temp: 1 }).warmth > nightMood(cove, { temp: 0 }).warmth);
  assert.ok(near(nightMood(nightWorld('boppo', 'auto'), { temp: 0.5 }).warmth, 0.6), 'Boppo\'s cove glows peach');
  assert.ok(near(nightMood(nightWorld('noomi', 'auto'), { temp: 0.5 }).warmth, 0.45));
  assert.ok(near(nightWorld('loomi', 'auto').mood.heaviness, 0.1), 'Loomi\'s blue hour');
  assert.ok(near(nightWorld('blubi', 'auto').mood.heaviness, 0.12));

  // every Mallow has every field, valid face params, and Glitzi never glitches above 0.75
  const PARAMS = new Set(PARAM_NAMES);
  const faceBags = (w) => [w.set, w.fx, w.sign.min, w.sign.drowse, w.greet.overlay, w.greet.min, w.stretch.overlay, w.stretch.set,
    w.answer.overlay, w.answer.min, w.answer.set, w.dream.min, w.dream.overlay, w.stillHere.overlay, w.stillHere.min, w.peek].filter(Boolean);
  for (const id of MALLOW_IDS) {
    const w = NIGHT_WAYS[id];
    for (const f of WAY_FIELDS) assert.ok(Object.hasOwn(w, f), `${id}.${f}`);
    assert.ok(NIGHT_REALMS.includes(w.world));
    assert.equal(w.closedEyes, MALLOWS[id].face.eyeStyle === 'closed', `${id} closedEyes`);
    for (const bag of faceBags(w)) for (const k of Object.keys(bag)) assert.ok(PARAMS.has(k), `${id}: ${k} is a face param`);
    for (const k of Object.keys(w.nightMix)) assert.ok(!AROUSED.includes(k));
    assert.ok(['tall', 'float', 'melt'].includes(w.stretch.style));
    for (const r of [w.tapReact].flat()) assert.ok(r === null || NIGHT_REACTS.includes(r));
    assert.ok(w.voice === null || NIGHT_VOICES.includes(w.voice) || (w.voice === 'grumble' && w.grumble));
    for (const b of [w.greet.burst, w.answer.burst, w.dream.burst, w.stillHere.burst].filter(Boolean)) assert.ok(['spark', 'moon'].includes(b.kind) && b.n <= 2);
    for (const n of [w.dream.nudge].filter(Boolean)) for (const k of Object.keys(n)) assert.ok(['lean', 'squash', 'shear', 'tilt'].includes(k), 'no hops at night');
  }
  const glitches = [];
  (function walk(o, key) {
    if (typeof o === 'number' && key === 'glitch') glitches.push(o);
    else if (Array.isArray(o)) o.forEach((v) => (key === 'glitch' ? glitches.push(v) : walk(v)));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, k);
  })(NIGHT_WAYS.glitzi);
  assert.ok(glitches.length >= 4 && glitches.every((g) => g <= 0.75), `Glitzi glitch values ${glitches}`);
  for (const k of Object.keys(NIGHT_SET)) assert.ok(PARAMS.has(k));
  for (const k of Object.keys(SLEEPY_PEEK)) assert.ok(PARAMS.has(k));
  assert.equal(peekFor('noomi'), SLEEPY_PEEK);
  assert.equal(waysFor('nobody'), NIGHT_WAYS.noomi);

  // the night face base, with drowsy values
  const out = {};
  nightSet('zuzu', 0, out);
  assert.equal(out.spin, 0.25); assert.equal(out.fxZzz, 0); assert.equal(out.yawnCycle, 0);
  nightSet('zuzu', 1, out);
  assert.ok(near(out.spin, 0.04));
  assert.equal(nightSet('glitzi', 0).glitch, 0.6);
  assert.ok(near(nightSet('glitzi', 1).glitch, 0.25));
  assert.equal(nightSet('pipzi', 0).fxSpark, 0.08);
  assert.equal(nightSet('pipzi', 1).fxSpark, 0);
  assert.equal(nightSet('noomi', 0.5).fxStar, 0.06);

  // resting faces keep the rig's idle reactions asleep (they fire below 0.6)
  for (const mode of MODES_ORDER) for (const d of [0, 0.3, 0.7, 1]) assert.ok(restFor(mode, d).i >= 0.62, `${mode} @ ${d}`);
  assert.ok(REST.asleep.i >= 0.62);
  assert.notEqual(restFor('sleepy', 0.4), restFor('sleepy', 0.4), 'Sleepy\'s rest is a new object each time');
  assert.deepEqual(restFor('sleepy', 1).mix, { calm: 0.7, comforted: 0, exhausted: 0.25 });
  assert.equal(restFor('nonsense'), REST.moonlight);
});

// ================================================================= U14 ==
test('U14 settings: cleanNight field by field, Comfort DNA defaults, only changed fields stored, effectiveMotion', async () => {
  assert.deepEqual({ ...cleanNight(null) }, { ...NIGHT_DEFAULTS });
  assert.deepEqual({ ...cleanNight('junk') }, { ...NIGHT_DEFAULTS });
  const good = { mode: 'drift', brightness: 0.62, temp: 0.8, speed: 'natural', volume: 0.333, minutes: 45, fade: false, motion: 'still', keepAwake: true, quietSound: true };
  const c = cleanNight(good);
  assert.deepEqual({ ...c }, { ...good, brightness: 0.6, temp: 0.75, volume: 0.33 });
  assert.ok(Object.isFrozen(c));
  // each bad field is dropped on its own; the good ones stay
  const BAD = { mode: 'disco', brightness: '0.5', temp: NaN, speed: 'fast', volume: Infinity, minutes: 25, fade: 'yes', motion: 'wild', keepAwake: 1, quietSound: null };
  for (const k of NIGHT_KEYS) {
    const raw = { ...good, [k]: BAD[k] };
    const out = cleanNight(raw);
    assert.equal(out[k], NIGHT_DEFAULTS[k], `${k} dropped`);
    for (const other of NIGHT_KEYS.filter((x) => x !== k)) assert.equal(out[other], c[other], `${other} kept when ${k} is bad`);
  }
  // ranges clamp
  assert.equal(cleanField('brightness', 0), 0.05);
  assert.equal(cleanField('brightness', 7), 1);
  assert.equal(cleanField('volume', -1), 0);
  assert.equal(cleanField('temp', 2), 1);
  // own keys only: inherited and prototype names are never read
  const proto = JSON.parse('{"__proto__": {"mode": "quiet"}, "constructor": {"mode": "quiet"}, "brightness": 0.8}');
  assert.equal(cleanNight(proto).mode, 'moonlight');
  assert.equal(cleanNight(proto).brightness, 0.8);
  assert.equal(cleanNight(Object.create({ mode: 'quiet' })).mode, 'moonlight');
  assert.equal(cleanField('speed', 'toString'), undefined);
  assert.equal(cleanField('speed', 'constructor'), undefined);
  assert.deepEqual(storedFields({ brightness: 0.3, nonsense: 1, mode: 'x' }), { brightness: 0.3 });
  assert.equal(Object.hasOwn(cleanNight(proto), 'constructor'), false);

  // Comfort DNA defaults
  const dna = new ComfortDNA(new MemoryComfortStore());
  await dna.load();
  assert.deepEqual({ ...defaultsFromDNA(dna) }, { ...NIGHT_DEFAULTS }, 'DNA defaults → Nightlight defaults');
  assert.deepEqual({ ...defaultsFromDNA(null) }, { ...NIGHT_DEFAULTS });
  for (const [pace, speed] of [['slower', 'slowest'], ['natural', 'slow'], ['livelier', 'natural']]) {
    dna.set('animationSpeed', pace);
    assert.equal(defaultsFromDNA(dna).speed, speed);
  }
  for (const [comfort, mode] of [[['breathe'], 'breathe'], [['quiet'], 'quiet'], [['float'], 'drift'], [['glow'], 'moonlight'],
    [['hold'], 'sleepy'], [['stroke'], 'sleepy'], [['squeeze'], 'moonlight'], [['squeeze', 'float', 'quiet'], 'drift'], [[], 'moonlight']]) {
    dna.set('comfort', comfort);
    assert.equal(defaultsFromDNA(dna).mode, mode, comfort.join());
  }
  dna.set('comfort', ['quiet']);
  dna.setEnabled(false);
  assert.deepEqual({ ...defaultsFromDNA(dna) }, { ...NIGHT_DEFAULTS }, 'personalisation off → defaults');
  dna.setEnabled(true);
  assert.equal(defaultsFromDNA({ get() { throw new Error('boom'); } }).mode, 'moonlight', 'a broken DNA never breaks the screen');

  // NightSettings: memory at once, prefs later, only the changed fields, always a new object
  const prefs = new Prefs(memStorage());
  const timers = fakeTimers();
  const s = new NightSettings(prefs, dna, timers);
  assert.equal(s.get().mode, 'quiet', 'the first mode from what helps');
  const seen = [];
  const off = s.onChange((k, v) => seen.push([k, v]));
  assert.equal(s.set('brightness', 0.63), true);
  assert.equal(s.get().brightness, 0.65);
  assert.equal(prefs.get('nightlight'), null, 'not written yet');
  timers.advance(399);
  assert.equal(prefs.get('nightlight'), null);
  timers.advance(1);
  assert.deepEqual(prefs.get('nightlight'), { brightness: 0.65 }, 'only what the person changed');
  const first = prefs.get('nightlight');
  s.set('minutes', 20, { persist: 'now' });
  assert.notEqual(prefs.get('nightlight'), first, 'a new object every time (Prefs skips the same reference)');
  assert.deepEqual(prefs.get('nightlight'), { brightness: 0.65, minutes: 20 });
  assert.equal(s.set('minutes', 25), false, 'invalid values are refused');
  assert.equal(s.set('nonsense', 1), false);
  assert.deepEqual(seen, [['brightness', 0.65], ['minutes', 20]]);
  s.set('temp', 1, { persist: false });
  assert.equal(timers.pending, 0);
  assert.equal(prefs.get('nightlight').temp, undefined);
  s.flush();
  assert.equal(prefs.get('nightlight').temp, 1);
  // reload after a Reset; a second screen reads what the first stored
  assert.equal(new NightSettings(prefs, dna, timers).get().minutes, 20);
  prefs.reset();
  s.reload();
  assert.equal(s.get().minutes, 30);
  assert.equal(s.get().brightness, 0.4);
  // a damaged stored value never breaks it
  prefs.set('nightlight', { brightness: 'loud', minutes: 10, __proto__: { mode: 'quiet' } });
  assert.equal(new NightSettings(prefs, null, timers).get().minutes, 10);
  assert.equal(new NightSettings(prefs, null, timers).get().brightness, 0.4);
  off();
  s.set('volume', 0.2);
  s.destroy();
  assert.equal(prefs.get('nightlight').volume, 0.2, 'destroy flushes');
  assert.equal(seen.length, 3, 'unsubscribed (brightness, minutes, temp before)');

  // Movement
  assert.equal(effectiveMotion('gentle', false), 'gentle');
  assert.equal(effectiveMotion('gentle', true), 'less');
  assert.equal(effectiveMotion('less', true), 'less');
  assert.equal(effectiveMotion('still', true), 'still');
  assert.equal(effectiveMotion('junk', false), 'gentle');
  assert.deepEqual(MOTIONS, ['gentle', 'less', 'still']);
  assert.equal(MOTION_RULES.less.inflate, 0.4);
  assert.equal(MOTION_RULES.still.inflate, 0);
  assert.equal(MOTION_RULES.less.drift, 0.3);
  assert.equal(MOTION_RULES.less.twinkle, 0.5);
  assert.equal(MOTION_RULES.less.live, false);
  assert.equal(MOTION_RULES.still.animated, false);
  assert.deepEqual([0, 1, 2, 3, 4].map(tempAt), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual([0, 0.25, 0.5, 0.75, 1].map(tempIndex), [0, 1, 2, 3, 4]);
  assert.deepEqual(Object.fromEntries(Object.entries(SPEEDS).map(([k, v]) => [k, v.rig])), { slowest: 0.62, slow: 0.75, natural: 0.9 });
});

// ================================================================= U15 ==
const SPEC_BANNED = /treat|cure|therap|insomnia|disorder|diagnos|clinical|medical|melatonin|blue light|sleep better|streak|score/i;

test('U15 copy: no sleep, health, streak or score claims (one disclaimer); short strings; the clock and end title', () => {
  const restLines = MALLOW_IDS.flatMap((id) => MALLOWS[id].voice.rest);
  assert.equal(restLines.length >= 7, true);
  const strings = [...collectStrings(COPY), ...collectStrings(NIGHT_WAYS), ...restLines];
  assert.ok(strings.length > 80);
  assert.deepEqual(lintCopy(strings, { allow: [COPY.disclaimer], extra: [SPEC_BANNED] }), []);
  assert.equal(lintCopy([COPY.disclaimer], { extra: [SPEC_BANNED] }).length > 0, true, 'the disclaimer is the one allowed mention');
  assert.equal(new Set(lintCopy(['Helps you sleep better', 'no streaks', 'Soft light'], { extra: [SPEC_BANNED] }).map((h) => h.text)).size, 2, 'the lint works');
  for (const s of strings) assert.ok(!/H[u]shmallow/.test(s));

  // every visible string ≤ 70 characters (the screen-reader stage label and the footnote disclaimer are longer by design)
  const { aria, disclaimer, ...visible } = COPY;
  void aria; void disclaimer;
  const rendered = [
    ...collectStrings(visible),
    COPY.subtitle('Breathing Together', 'Glitzi'), COPY.subtitleShort('Breathing Together', '11:30 pm'), COPY.subtitleShort('Quiet Company', null),
    COPY.status.fading('11:30 pm'), COPY.say.start('Glitzi', '11:30 pm'), COPY.say.mode('Breathing Together'), COPY.say.brightness(100),
    COPY.end.finished('11:42 pm'), ...MALLOW_IDS.flatMap((id) => MALLOWS[id].voice.rest.map((l) => COPY.end.line(l, MALLOWS[id].name))),
    COPY.sheet.fade.sub(8), COPY.sheet.timer.ends('11:40 pm'), COPY.sheet.timer.aria(60),
    ...Object.values(sheetView({ endsAt: T0, locale: 'en-US' })).map((r) => [r.text, r.sub]).flat().filter(Boolean),
  ];
  for (const s of rendered) assert.ok(s.length <= 70, `${s.length}: ${s}`);
  assert.match(COPY.aria.stage('Noomi'), /^Noomi in the night\. Tap to say goodnight/);
  assert.equal(COPY.subtitle(COPY.modes.moonlight.name, 'Noomi'), 'Moonlight · Noomi');
  assert.deepEqual(MODES_ORDER.map((m) => COPY.modes[m].label), ['Moonlight', 'Breathe', 'Sleepy', 'Drift', 'Quiet']);
  assert.deepEqual(MODES_ORDER.map((m) => COPY.modes[m].name), ['Moonlight', 'Breathing Together', 'Sleepy Companion', 'Ambient Drift', 'Quiet Company']);
  assert.equal(COPY.say.brightness(pct(0.4)), 'Brightness 40 %.');
  assert.equal(COPY.say.start('Noomi', '23:30'), 'Nightlight on with Noomi until 23:30.');
  assert.equal(COPY.say.start('Noomi', null), 'Nightlight on with Noomi.');

  // Intl clock and the end card's first line
  const at = new Date(2026, 9, 14, 23, 42).getTime();
  assert.equal(clock(at, 'en-GB'), '23:42');
  assert.match(clock(at, 'en-US'), /^11:42\s?PM$/i);
  assert.equal(endTitle(at, 23, 'en-GB'), 'Nightlight finished at 23:42.');
  assert.equal(endTitle(at, 4, 'en-GB'), 'Nightlight finished at 23:42.');
  assert.equal(endTitle(at, 5, 'en-GB'), 'Good morning.');
  assert.equal(endTitle(at, 10, 'en-GB'), 'Good morning.');
  assert.equal(endTitle(at, 11, 'en-GB'), 'Nightlight finished at 23:42.');
  assert.equal(endTitle(new Date(2026, 9, 15, 7, 5).getTime(), undefined, 'en-GB'), 'Good morning.');
});

// ================================================================= U17 ==
// ================================================================= U16 ==
/** A document that can hide, and a navigator whose wake lock records requests (or refuses them). */
function fakeDoc() {
  const L = new Set();
  return {
    hidden: false,
    addEventListener(t, fn) { if (t === 'visibilitychange') L.add(fn); },
    removeEventListener(t, fn) { L.delete(fn); },
    set(h) { this.hidden = h; for (const fn of [...L]) fn(); },
    get listeners() { return L.size; },
  };
}
function fakeNav({ reject = false, throws = false } = {}) {
  const nav = { calls: 0, sentinels: [] };
  nav.wakeLock = {
    request(type) {
      nav.calls++;
      if (throws) throw new Error('SecurityError');
      if (reject) return Promise.reject(new Error('NotAllowedError'));
      const s = { type, released: false, L: new Set(),
        release() { if (!this.released) { this.released = true; for (const fn of [...this.L]) fn(); } return Promise.resolve(); },
        addEventListener(t, fn) { if (t === 'release') this.L.add(fn); }, removeEventListener(t, fn) { this.L.delete(fn); } };
      nav.sentinels.push(s);
      return Promise.resolve(s);
    },
  };
  return nav;
}
const flush = () => new Promise((r) => setTimeout(r, 0));

test('U16 ScreenWake: opt-in, only while visible, let go when hidden, asked again on return, one refusal, an hour at most', async () => {
  const doc = fakeDoc(), nav = fakeNav(), tm = fakeTimers();
  const w = new ScreenWake({ nav, doc, setTimeout: tm.setTimeout, clearTimeout: tm.clearTimeout });
  assert.equal(w.supported, true);
  assert.equal(w.wanted, false);
  doc.set(true); doc.set(false); await flush();
  assert.equal(nav.calls, 0, 'off by default: nothing is ever requested unasked');

  // no request while hidden; the return to visible asks
  doc.set(true);
  w.want(true); await flush();
  assert.equal(nav.calls, 0, 'no request while hidden');
  assert.equal(w.wanted, true);
  doc.set(false); await flush();
  assert.equal(nav.calls, 1);
  assert.equal(w.held, true);
  w.want(true); await flush();
  assert.equal(nav.calls, 1, 'one lock at a time');

  // hidden lets go (and keeps wanting); visible asks again
  doc.set(true); await flush();
  assert.equal(w.held, false);
  assert.equal(nav.sentinels[0].released, true, 'released when hidden');
  assert.equal(w.wanted, true);
  doc.set(false); await flush();
  assert.equal(nav.calls, 2, 're-requested on return');
  assert.equal(w.held, true);

  // the browser lets go on its own; refresh() (pageshow / resume) asks again
  nav.sentinels[1].release(); await flush();
  assert.equal(w.held, false);
  w.refresh(); await flush();
  assert.equal(nav.calls, 3);
  assert.equal(w.held, true);

  // want(false): released, and visibility no longer asks
  w.want(false); await flush();
  assert.equal(w.held, false);
  assert.equal(nav.sentinels[2].released, true);
  doc.set(true); doc.set(false); await flush();
  assert.equal(nav.calls, 3);

  // an hour at most
  w.want(true); await flush();
  assert.equal(w.held, true);
  tm.advance(WAKE_MAX_MS - 1);
  assert.equal(w.wanted, true);
  tm.advance(2); await flush();
  assert.equal(w.wanted, false, 'released at maxMs');
  assert.equal(w.held, false);
  doc.set(true); doc.set(false); await flush();
  assert.equal(nav.calls, 4, 'and not asked again after expiring');

  // a request that resolves after the page was hidden is let go at once (the return asks again)
  w.want(true); doc.set(true); await flush();
  assert.equal(w.held, false);
  assert.equal(nav.sentinels.at(-1).released, true);
  doc.set(false); await flush();
  assert.equal(w.held, true);

  w.destroy();
  assert.equal(doc.listeners, 0, 'destroy removes its listener');
  assert.equal(w.held, false);
  assert.equal(tm.pending, 0, 'and its timer');
  w.want(true); await flush();
  assert.equal(w.wanted, false, 'a destroyed wake never asks');

  // a refusal: wanted false, onFail once, never retried in a loop
  const doc2 = fakeDoc(), bad = fakeNav({ reject: true });
  let fails = 0;
  const w2 = new ScreenWake({ nav: bad, doc: doc2, onFail: () => fails++ });
  w2.want(true); await flush();
  assert.equal(w2.wanted, false);
  assert.equal(w2.failed, true);
  assert.equal(fails, 1);
  doc2.set(true); doc2.set(false); w2.refresh(); await flush(); await flush();
  assert.equal(bad.calls, 1, 'never retried');
  assert.equal(fails, 1);
  w2.destroy();
  const w3 = new ScreenWake({ nav: fakeNav({ throws: true }), doc: fakeDoc(), onFail: () => fails++ });
  w3.want(true); await flush();
  assert.equal(w3.wanted, false); assert.equal(fails, 2, 'a request that throws counts as a refusal');
  w3.destroy();

  // unsupported: no throw, never wanted
  for (const n of [{}, undefined, { wakeLock: {} }]) {
    const u = new ScreenWake({ nav: n, doc: fakeDoc() });
    assert.equal(u.supported, false);
    assert.doesNotThrow(() => { u.want(true); u.refresh(); u.release(); });
    assert.equal(u.wanted, false);
    u.destroy();
  }
  assert.doesNotThrow(() => new ScreenWake({ nav: undefined, doc: undefined }).destroy(), 'no document either: still no throw');
});

test('U17 shared contracts: Personality.setFilter, prefs.nightlight, SoundEngine setTrim and rest', async () => {
  const p = new Personality('boppo', { seed: 3, style: 'gentle' });
  p.setFilter(() => null);
  assert.equal(p.respond('tap', { streak: 1 }), null, 'a filter can silence a response');
  p.setFilter((r) => ({ ...r, tag: `x-${r.tag}` }));
  assert.match(p.respond('tap', { streak: 1 }).tag, /^x-/);
  p.setFilter(null);
  assert.equal(p.filter, null);
  assert.doesNotMatch(p.respond('tap', { streak: 1 }).tag, /^x-/, 'null restores the plain response');
  p.setFilter('not a function');
  assert.equal(p.filter, null);

  assert.equal(DEFAULTS.nightlight, null);
  assert.equal(Object.hasOwn(DEFAULTS, 'nightlight'), true);

  const restore = installAudioGlobals({ active: true });
  const s = new SoundEngine({ volume: 0.8 });
  try {
    s.unlock();
    await new Promise((r) => setTimeout(r, 0));
    const c = s.ctx;
    s.setTrim(0.5);
    assert.ok(near(s.master.gain.last('target').v, 0.4), 'master = volume × trim');
    s.setTrim(NaN);
    assert.equal(s.trim, 1);
    s.setTrim(0.25);
    s.rest();
    assert.equal(s.resting, true);
    assert.equal(c.state, 'suspended');
    restore.setHidden(true); restore.setHidden(false);
    assert.equal(c.state, 'suspended', 'resting blocks the resume on becoming visible');
    s.unlock();
    assert.equal(s.resting, false, 'the next gesture clears it');
    assert.equal(c.state, 'running');
    s.setTrim(1);
    assert.equal(s.debug().trim, 1);
  } finally { s.dispose(); restore(); }
});

// ================================================================= U18 ==
const NL = here('../features/nightlight/');
const PURE = ['session.js', 'settings.js', 'look.js', 'pacing.js', 'ways.js', 'copy.js', 'modes.js', 'bed.js'].map((f) => NL + f).concat(here('../core/frame-pacer.js'));
const OWNED = [...new Set([...filesUnder(NL), here('../features/nightlight.js'), here('../core/frame-pacer.js'), here('../core/screen-wake.js')].filter((f) => existsSync(f)))];

test('U18 static scan: no network, workers, notifications or setInterval; wake lock only in screen-wake.js; pure modules have no DOM', () => {
  assert.ok(OWNED.length >= PURE.length);
  assert.deepEqual(scanFiles(OWNED, { forbid: [...NETWORK, /\bsetInterval\b/, /navigator\.wakeLock/, /wakeLock\.request/],
    allow: { 'navigator\\.wakeLock': ['core/screen-wake.js'], 'wakeLock\\.request': ['core/screen-wake.js'] } }), []);
  assert.deepEqual(scanFiles([here('../styles/nightlight.css')], { forbid: [...NETWORK, /@import/] }), [], 'the stylesheet loads nothing');
  assert.deepEqual(scanFiles(PURE, { forbid: [/\bdocument\b/, /\bwindow\b/, /AudioContext/, /\blocalStorage\b/, /\bsessionStorage\b/, /requestAnimationFrame/, /\bnavigator\b/] }), []);
  // the scan itself works
  assert.equal(scanFiles([here('./lib/static-scan.mjs')], { forbid: [/\bfetch\s*\(/] }).length, 0);
  assert.ok(MALLOW_IDS.every((id) => Object.hasOwn(NIGHT_WAYS, id)), 'the pure modules import in Node and cover every Mallow');
});

// ================================================================= U19 ==
/** A rig and a scene, faked just enough for the modes (records what they do). */
function fakeScene(id = 'boppo', { motion = 'gentle', quality = 'medium', phase = 'steady', settings = {}, live = true } = {}) {
  const log = [];
  const rig = {
    overlays: [], squeeze: { target: 0 }, inflateTarget: 0, peekParams: null, opts: { particles: true, reducedMotion: motion !== 'gentle' },
    faceOverride: { set: {}, min: {} },
    setFaceOverride(o) { this.faceOverride = { set: o.set || {}, min: o.min || {} }; },
    overlay(kind, params, dur) { this.overlays = this.overlays.filter((o) => o.kind !== kind); this.overlays.push({ kind, params, dur }); log.push(['overlay', kind]); return this; },
    react(kind) { log.push(['react', kind]); return this; },
    nudge(o) { log.push(['nudge', o]); return this; },
    peek(x, y, dur) { log.push(['peek', dur]); },
    setSqueeze(v) { this.squeeze.target = v; },
    setInflate(v) { this.inflateTarget = v; },
    lookAtScreen(x, y) { log.push(['look', Math.round(x), Math.round(y)]); },
    particles: { burst(spec) { log.push(['burst', spec.kind, spec.n]); } },
  };
  const world = {
    isLive: false, realmId: 'moonmilk-cove', plain: false, W: 390, drift: [0, 0], lives: 0, stills: 0,
    goLive() { if (!live) return false; this.isLive = true; this.lives++; return true; },
    goStill() { if (this.isLive) { this.isLive = false; this.stills++; } return true; },
    setDrift(x, y) { this.drift = [x, y]; },
  };
  const sky = { gain: 1, breath: null, attracted: null, setHaloGain(k) { this.gain = k; }, setBreath(b) { this.breath = b; }, attract(x, y) { this.attracted = [x, y]; }, pickFirefly: () => 0, firefly: (i, out) => { out.x = 100; out.y = 400; return true; } };
  const pacer = { events: [], event(ms) { this.events.push(ms); } };
  const limiter = new LightLimiter({ now: () => clockMs.t });
  const clockMs = { t: 0 };
  const face = new FaceMixer(rig, ['base', 'mode', 'event', 'fade']);
  const S = { ...NIGHT_DEFAULTS, ...settings };
  const companion = { restOverride: null };
  const api = {
    id, ways: waysFor(id), rig, companion, face, sky, world, pacer, limiter, look: { glow: 0.55 }, levels: { world: 1, mallow: 1 },
    rand: (() => { let x = 0.37; return () => (x = (x * 9301 + 49297) % 233280 / 233280); })(),
    rules: () => MOTION_RULES[motion], motion: () => motion, speedK: () => 1, timing: () => ({ inhale: 4, exhale: 6 }), quality: () => quality,
    phase: () => phase, settings: () => S, warm: () => 0, light: () => ({ x: 270, y: 240 }), captions: [], caption(t) { this.captions.push(t); }, quiet: null, setQuiet(b) { this.quiet = b; },
  };
  api.moments = new Moments(api);
  const run = (ctl, secs, dt = 1 / 20) => { for (let t = 0; t < secs; t += dt) { clockMs.t += dt * 1000; api.moments.step(dt); ctl.tick(dt); face.apply(); } };
  return { api, rig, face, world, sky, pacer, log, run, clockMs, companion };
}

test('U19 Timeline and Moments: frame-clock callbacks; authored moments route pinned keys through the mixer and release their own layers only', () => {
  const tl = new Timeline(), seen = [];
  tl.add(0.5, () => seen.push('b')).add(0.2, () => seen.push('a')).add(2, () => seen.push('c'));
  tl.step(0.1); assert.deepEqual(seen, []);
  tl.step(0.5); assert.deepEqual(seen, ['a', 'b']);
  tl.clear(); tl.step(5); assert.deepEqual(seen, ['a', 'b'], 'cleared callbacks never run');
  assert.equal(tl.size, 0);

  // Zuzu's answer swirl: spin is pinned by the night base (set), so it goes through 'evo:swirl'; spiralHue stays an overlay
  const z = fakeScene('zuzu');
  z.face.set('base', 'spin', 0.25); z.face.apply();
  z.api.moments.play(NIGHT_WAYS.zuzu.answer);
  z.face.apply();
  assert.equal(z.face.out.set.spin, 0.5, 'the swirl wins over the pinned base spin while it plays');
  const ov = z.rig.overlays.find((o) => o.kind === 'nl-swirl');
  assert.ok(ov && !('spin' in ov.params) && ov.params.spiralHue === 0.3);
  z.run({ tick() {} }, 2.5);
  assert.equal(z.face.out.set.spin, 0.25, 'and the base comes back when it ends');

  // Blubi's blush floor, replayed: the first release must not cut the second short
  const b = fakeScene('blubi');
  b.api.moments.play(NIGHT_WAYS.blubi.answer);   // min blush 2.2 for 1.8 s
  b.run({ tick() {} }, 1.2);
  b.api.moments.play(NIGHT_WAYS.blubi.answer);
  b.run({ tick() {} }, 1.0);
  assert.equal(b.face.out.min.blush, 2.2, 'still blushing: the replay owns the release');
  b.run({ tick() {} }, 1.2);
  assert.equal(b.face.out.min.blush, undefined);

  // Pipzi's whisper sparks, Boppo's two soft bounces (never a hop), Noomi's sleepy peek, Glitzi's glow dream
  const p = fakeScene('pipzi'); p.api.moments.play(NIGHT_WAYS.pipzi.answer);
  assert.deepEqual(p.log.filter((e) => e[0] === 'burst'), [['burst', 'spark', 2]]);
  const bo = fakeScene('boppo'); bo.api.moments.play(NIGHT_WAYS.boppo.greet); bo.run({ tick() {} }, 1.5);
  assert.deepEqual(bo.log.filter((e) => e[0] === 'nudge').map((e) => e[1]), [{ squash: 0.15 }, { squash: 0.08 }], 'softer each time');
  const still = fakeScene('boppo', { motion: 'still' }); still.api.moments.play(NIGHT_WAYS.boppo.greet); still.run({ tick() {} }, 1.5);
  assert.equal(still.log.filter((e) => e[0] === 'nudge').length, 0, 'no body impulses with Movement Still');
  const n = fakeScene('noomi'); n.api.moments.play(NIGHT_WAYS.noomi.stillHere);
  assert.deepEqual(n.log.at(-1), ['peek', 1.4]);
  const g = fakeScene('glitzi'); g.api.moments.play(NIGHT_WAYS.glitzi.dream); g.face.apply();
  assert.ok(near(g.face.out.min.glow, 0.55 + 0.2));
  // every moment asks the pacer for smooth frames while it plays
  assert.ok(p.pacer.events.length === 1 && p.pacer.events[0] >= 300);
  g.api.moments.clear(); g.face.apply();
  assert.equal(g.face.out.min.glow, undefined, 'clear() drops every moment layer');
});

// ================================================================= U20 ==
test('U20 the five modes on a fake api: rests ≥ 0.62, Moonlight swell and limiter, Breathe inflate by Movement, Sleepy stretch and asleep-in-hand, Drift window, Quiet silence; stop() releases', () => {
  assert.deepEqual(Object.keys(MODES), MODES_ORDER);
  for (const m of MODES_ORDER) {
    assert.equal(MODES[m].name, COPY.modes[m].name);
    assert.equal(MODES[m].cap, NIGHT_CAPS[m]);
    const bed = MODES[m].bed;
    assert.ok(bed.factor > 0 && bed.factor <= 1 && bed.pad >= 0 && bed.texture >= 0);
    const f = fakeScene('boppo');
    const ctl = startMode(m, f.api);
    assert.equal(ctl.id, m);
    assert.ok(f.companion.restOverride.i >= 0.62, `${m} rests at ${f.companion.restOverride.i}`);
    f.run(ctl, 3);
    ctl.stop(); f.face.apply();
    assert.deepEqual(f.face.layers.find((l) => l.owner === 'mode').set, {}, `${m}: stop releases the mode layer`);
    assert.equal(f.rig.inflateTarget, 0);
    assert.equal(f.rig.squeeze.target, 0);
  }
  assert.equal(startMode('nonsense', fakeScene().api).id, 'moonlight');

  // Moonlight: the glow floor follows the light; a tap swells (rising over 600 ms); a second tap inside 2 s only holds it longer
  const mo = fakeScene('boppo'), ml = startMode('moonlight', mo.api);
  mo.run(ml, 1);
  const floor = mo.face.out.min.glow;
  assert.ok(floor >= 0.55 * 0.88 - 1e-9 && floor <= 0.55 * 1.12 + 1e-9);
  ml.event({ type: 'tap' });
  mo.run(ml, 0.1); const g100 = mo.face.out.min.glow;
  mo.run(ml, 0.6); const g700 = mo.face.out.min.glow;
  assert.ok(g700 - g100 > 0.2, `${g100} → ${g700}`);
  ml.event({ type: 'tap' });
  assert.equal(mo.api.limiter.log.filter((e) => e.ok).length, 1, 'one brightening start');
  assert.ok(mo.sky.gain > 1.2, 'the halo swells with the lamp');

  // Breathe: inflate follows the level × Movement (Gentle 1, Less 0.4, Still 0); a press leads the inhale; captions for two cycles
  for (const [motion, k] of [['gentle', 1], ['less', 0.4], ['still', 0]]) {
    const f = fakeScene('blubi', { motion }), br = startMode('breathe', f.api);
    let max = 0;
    for (let i = 0; i < 200; i++) { f.run(br, 0.05); max = Math.max(max, f.rig.inflateTarget); }
    assert.ok(k === 0 ? max === 0 : max > 0.9 * k && max <= k + 1e-9, `${motion}: inflate max ${max}`);
    assert.equal(f.face.out.set.breath, 0, "the rig's own breathing bob stops");
    if (motion === 'gentle') {
      assert.deepEqual(f.api.captions.slice(0, 2), [COPY.captions.in, COPY.captions.out]);
      br.event({ type: 'press' });
      f.run(br, 1.5);
      assert.ok(br.breath.leading && ['in', 'holdIn'].includes(br.breath.phase), 'a held press leads the inhale');
      br.event({ type: 'pressend' });
      f.run(br, 0.1);
      assert.equal(br.breath.phase, 'out');
    }
  }

  // Sleepy: a forced stretch ramps the squeeze down to −0.28 and back, its settle follows; Less turns it into a settle
  const sl = fakeScene('boppo'), sc = startMode('sleepy', sl.api);
  sc.script.force('stretch');
  let min = 0, after = 0;
  for (let i = 0; i < 120; i++) { sl.run(sc, 0.05); min = Math.min(min, sl.rig.squeeze.target); if (min < -0.27) after = Math.max(after, sl.rig.squeeze.target); }
  assert.ok(min < -0.27 && after > 0, `stretch ${min}, settle ${after}`);
  assert.ok(sl.log.some((e) => e[0] === 'overlay' && e[1] === 'nl-stretch'));
  assert.ok(sl.log.some((e) => e[0] === 'react' && e[1] === 'sigh'), 'the settle ends with a sigh');
  // a 4 s hold: asleep in your hand; a stroke makes it drowsier
  sc.event({ type: 'hold' }); sl.run(sc, 4.2); sc.event({ type: 'holdend' });
  assert.ok(sc.script.d >= 0.9);
  sl.run(sc, 0.05);
  assert.ok(sl.companion.restOverride.i > 0.75, 'the rest follows drowsiness');
  const less = fakeScene('boppo', { motion: 'less' }), lc = startMode('sleepy', less.api);
  lc.script.force('stretch');
  let lmin = 0;
  for (let i = 0; i < 60; i++) { less.run(lc, 0.05); lmin = Math.min(lmin, less.rig.squeeze.target); }
  assert.equal(lmin, 0, 'no negative squeeze with Movement Less');
  const st = fakeScene('boppo'), stc = startMode('sleepy', st.api);
  stc.event({ type: 'stroke' }); const d0 = stc.script.d; st.run(stc, 5); stc.event({ type: 'strokeend' });
  assert.ok(stc.script.d > d0 + 0.15, 'stroking: drowsier at 0.04/s');

  // Drift: the live window opens on capable tiers, closes after 3 min, reopens for 45 s after a touch; never with Less or on low
  const dr = fakeScene('noomi'), dc = startMode('drift', dr.api);
  dr.run(dc, 0.2);
  assert.equal(dr.world.isLive, true);
  assert.ok(Math.abs(dr.world.drift[0]) <= 6 && Math.abs(dr.world.drift[1]) <= 2);
  dr.run(dc, LIVE.firstS, 0.5);
  assert.equal(dr.world.isLive, false, 'closed after the first 3 minutes');
  dc.event({ type: 'offtap', x: 120, y: 500 });
  assert.deepEqual(dr.sky.attracted, [120, 500]);
  dr.run(dc, 0.5);
  assert.equal(dr.world.isLive, true, 'a touch reopens it');
  dr.run(dc, LIVE.touchS + 1, 0.5);
  assert.equal(dr.world.isLive, false);
  assert.ok(dr.face.out.min.float >= 0.3, "Noomi floats a little more in Drift");
  for (const [o, why] of [[{ motion: 'less' }, 'Less'], [{ quality: 'low' }, 'low tier'], [{ phase: 'fading' }, 'fading']]) {
    const f = fakeScene('noomi', o), c = startMode('drift', f.api);
    f.run(c, 1);
    assert.equal(f.world.lives, 0, `no live window: ${why}`);
  }
  // with the session clock (ms) the window is wall time: a slow device (little frame time) never keeps it longer
  const wc = fakeScene('noomi'), wcc = startMode('drift', wc.api), T0 = 1.7e12;
  wcc.tick(0.05, T0);
  assert.equal(wc.world.isLive, true);
  wcc.tick(0.05, T0 + (LIVE.firstS - 1) * 1000);
  assert.equal(wc.world.isLive, true, 'inside the first 3 min of clock time');
  assert.ok(Math.abs(wcc.liveLeft - 1) < 1e-6);
  wcc.tick(0.05, T0 + LIVE.firstS * 1000 + 50);
  assert.equal(wc.world.isLive, false, 'closed after 3 min of clock time, after only 0.15 s of frames');
  wcc.event({ type: 'tap' });
  wcc.tick(0.05, T0 + 200e3);
  assert.equal(wc.world.isLive, true, 'a touch reopens it for 45 s of clock time');
  wcc.tick(0.05, T0 + 200e3 - 3600e3);   // the clock is set back an hour: the window keeps its length
  assert.ok(wcc.liveLeft <= LIVE.touchS + 1e-6 && wc.world.isLive);
  wcc.tick(0.05, T0 + 200e3 - 3600e3 + (LIVE.touchS + 0.1) * 1000);
  assert.equal(wc.world.isLive, false);
  wcc.stop();
  const fail = fakeScene('noomi', { live: false }), fc = startMode('drift', fail.api);
  fail.run(fc, 1);
  dc.stop();
  assert.equal(dr.world.isLive, false);
  assert.deepEqual(dr.world.drift, [0, 0]);

  // Quiet: silent unless the person asked for sound; stop() gives the voice back
  const q = fakeScene('loomi'), qc = startMode('quiet', q.api);
  assert.equal(q.api.quiet, true);
  qc.stop();
  assert.equal(q.api.quiet, false);
  const q2 = fakeScene('loomi', { settings: { quietSound: true } }); startMode('quiet', q2.api);
  assert.equal(q2.api.quiet, false);
  assert.deepEqual(TOUCHES.includes('offtap') && SWELL.k === 0.4 && SWELL.riseS >= 0.6, true);

  // slice 3 wiring: rests go through api.rest (the screen holds the asleep face over them during the fade);
  // Breathe swells the bed's texture with each phase and its depth follows the fade; Drift's glints ring the bell
  const w = fakeScene('blubi'), rests = [], swells = [], bells = [];
  w.api.rest = (r) => rests.push(r);
  w.api.bed = { breathe: (ph, secs) => swells.push([ph, secs]), chime: () => bells.push(1) };
  let ik = 1;
  w.api.inflateK = () => ik;
  const wb = startMode('breathe', w.api);
  assert.deepEqual(rests, [REST.breathe]);
  assert.equal(w.companion.restOverride, null, 'the mode never sets the rest itself when the screen offers rest()');
  let wmax = 0;
  for (let i = 0; i < 300; i++) { w.run(wb, 0.05); wmax = Math.max(wmax, w.rig.inflateTarget); }
  assert.ok(swells[0][0] === 'in' && near(swells[0][1], 4), 'the first in-breath swells over its own length');
  assert.ok(swells.some(([ph]) => ph === 'out') && swells.every(([ph, secs]) => ['in', 'out', 'holdIn', 'holdOut'].includes(ph) && secs > 0));
  ik = 0.4; let wlow = 0;
  for (let i = 0; i < 300; i++) { w.run(wb, 0.05); wlow = Math.max(wlow, w.rig.inflateTarget); }
  assert.ok(wmax > 0.9 && wlow <= 0.4 + 1e-9, `the fade makes the breath shallower (${wmax} → ${wlow})`);
  wb.stop();
  assert.deepEqual(swells.at(-1), [null, undefined], 'stop hands the texture back');
  const wd = startMode('drift', w.api);
  assert.equal(typeof w.sky.onGlint, 'function');
  w.sky.onGlint(0); w.sky.onGlint(1);
  assert.equal(bells.length, 2, 'every glint asks; the bed keeps them ≥ 20 s apart');
  wd.stop();
  assert.equal(w.sky.onGlint, null);
});

// ================================================================= U21 ==
test('U21 world helpers: the overhanging box maps the ground line; still DPR per tier', () => {
  assert.equal(MARGIN, 8);
  const H = 844, base = 0.84;
  const gy = boxGround(base, H);
  assert.ok(near(-MARGIN + gy * (H + 2 * MARGIN), base * H), 'the ground stays exactly where the Mallow stands');
  assert.equal(stillDpr('low'), 1);
  assert.ok(stillDpr('medium') <= 1.25 && stillDpr('high') <= 1.5 && stillDpr('high') >= 1);
});

// ================================================================= U22 ==
test('U22 night sound: the facade, bedPlan, and NightBed on AmbientBed (textures, pad, fade-in, breath, bell; Touch sounds do not silence it)', async () => {
  // the facade: softer touches, no thuds, only sleepy voices; setQuiet silences everything
  const calls = [];
  const engine = {
    ready: true, muted: false, unlock() { calls.push(['unlock']); },
    poke: (m, i) => calls.push(['poke', i]), squish: (m, a) => calls.push(['squish', a]), release: (m, v) => calls.push(['release', v]),
    impact: () => calls.push(['impact']), settle: () => calls.push(['settle']),
    stretch: () => ({ update: (a) => calls.push(['stretch', a]), end() {} }), brush: () => ({ update: (a) => calls.push(['brush', a]), end() {} }),
    voice: (id, kind, i) => { calls.push(['voice', id, kind, i]); return true; },
  };
  const f = nightSound(engine, 'boppo');
  f.poke({}, 1); f.impact({}, 1); f.voice('boppo', 'giggle', 0.8); f.voice('boppo', 'hum', 0.6);
  assert.deepEqual(calls, [['poke', NIGHT_K.touch], ['voice', 'boppo', 'coo', 0.8 * NIGHT_K.voice], ['voice', 'boppo', 'hum', 0.6 * NIGHT_K.voice]], 'pokes × 0.6, no impact, a giggle becomes a coo');
  calls.length = 0;
  f.setQuiet(true);
  assert.equal(f.quiet, true);
  f.poke({}, 1); f.settle({}); f.stretch({}).update(1); assert.equal(f.voice('boppo', 'coo', 1), null);
  assert.deepEqual(calls, [], 'silent Quiet: no touch sounds, no voice');
  f.unlock(); assert.deepEqual(calls, [['unlock']], 'unlock still forwards');
  f.setQuiet(false); calls.length = 0; f.poke({}, 1);
  assert.deepEqual(calls, [['poke', NIGHT_K.touch]]);
  const loomi = nightSound(engine, 'loomi');
  calls.length = 0;
  assert.equal(loomi.voice('loomi', 'tap', 0.6), null, 'Loomi stays asleep and silent');
  assert.deepEqual(calls, []);

  // bedPlan: on only when it should sound; levels follow the mode's split × the displayed sound level
  const plan = bedPlan({ split: MODES.moonlight.bed, sound: 1, volume: 0.5 });
  assert.deepEqual({ ...plan, gain: +plan.gain.toFixed(6) }, { pad: 0.6, texture: 0.4, on: true, gain: 0.035 });
  for (const m of MODES_ORDER) {
    const p = bedPlan({ split: MODES[m].bed, sound: 1, volume: 1 });
    assert.ok(p.gain <= BED.peak + 1e-12 && p.pad <= 1 && p.texture <= 1, `${m}: never above the bed's peak`);
  }
  const q = bedPlan({ split: MODES.quiet.bed, sound: 1 });
  assert.ok(q.on && q.texture === 0 && near(q.pad, 0.5), 'Quiet with Sound on: a faint pad only');
  for (const [why, o] of [['silent Quiet', { silent: true }], ['Volume 0', { volume: 0 }], ['sound below 0.03', { sound: 0.02 }],
    ['ended', { ended: true }], ['hidden', { hidden: true }], ['leaving', { leaving: true }], ['no mode', { split: null }]]) {
    assert.equal(bedPlan({ split: MODES.moonlight.bed, sound: 1, volume: 1, ...o }).on, false, `off: ${why}`);
  }
  const mid = bedPlan({ split: MODES.drift.bed, sound: 0.5, volume: 1, silent: true });
  assert.ok(!mid.on && near(mid.texture, 0.35) && near(mid.pad, 0.15), 'levels are kept while off (a rebuild starts at the right mix)');
  assert.equal(padFreq(0), PAD_LP.moon); assert.equal(padFreq(1), PAD_LP.ember); assert.ok(padFreq(0.5) < 900 && padFreq(0.5) > 380);

  // NightBed on the real Sound Engine with the fake audio context
  const restore = installAudioGlobals({ active: false });
  const s = new SoundEngine({ volume: 0.7 });
  try {
    let now = 0;
    const bed = new NightBed(s, { mallowId: 'noomi', texture: 'waves', quality: 'medium', temp: 0.5 });
    const step = async (ms = 150) => { now += ms; bed.tick(now); await flush(); };
    bed.want(bedPlan({ split: MODES.moonlight.bed, sound: 1, volume: 0.5 }));
    await step(); await step();
    assert.equal(bed.alive, false); assert.equal(s.ctx, null, 'nothing before the first gesture');
    restore.setActive(true); s.unlock(); await flush();
    s.setParts({ fx: false });   // Touch sounds off: the bed has its own controls (SHARED C7)
    for (let i = 0; i < 4 && !bed.alive; i++) await step();
    assert.equal(bed.alive, true, 'built once ready, even with Touch sounds off');
    const c = s.ctx, v = [...s.live].find((x) => x.keep);
    assert.ok(v && v.dur === 600 && reaches(v.out, c.destination), 'one long keep voice on the bus');
    const fadeIn = v.out.gain.last('linear');
    assert.ok(fadeIn.v === 1 && near(fadeIn.t - v.t, BED.fadeIn), 'rises from silence over 4 s');
    // the waves texture: looping brown noise → lowpass 520 Hz, Q 0.4 → level → 0.08 Hz amplitude LFO (40 %)
    const lp = c.nodes.find((n) => n.kind === 'biquad' && n.type === 'lowpass' && n.frequency.value === 520);
    assert.ok(lp && near(lp.Q.value, 0.4));
    const texGain = [...lp.outputs][0];
    assert.ok(near(texGain.gain.value, 0.4 * BED.peak), 'texture level × peak');
    assert.ok(c.nodes.some((n) => n.kind === 'oscillator' && near(n.frequency.value, 0.08)), 'the waves LFO');
    // the pad on Noomi's own root: root/4, a fifth above, root/2 (triangle); lowpass at the Light's frequency with a slow LFO
    const root = VOICES.noomi.root;
    for (const fr of [root / 4, root / 4 * 2 ** (7 / 12), root / 2 * 1.003]) assert.ok(c.nodes.some((n) => n.kind === 'oscillator' && near(n.frequency.value, fr, 1e-6)), `pad tone ${fr}`);
    const padLp = c.nodes.find((n) => n.kind === 'biquad' && n.type === 'lowpass' && near(n.frequency.value, padFreq(0.5)));
    assert.ok(padLp, 'pad lowpass from the Light');
    assert.ok(c.nodes.some((n) => n.kind === 'oscillator' && near(n.frequency.value, BED.padLfo)));
    // the Light warms: the pad darkens (eased)
    bed.setTemp(1); await step(1000);
    assert.equal(padLp.frequency.last('target').v, PAD_LP.ember);
    // levels follow at most once a second; on / off at once
    const n0 = texGain.gain.of('target').length;
    bed.want(bedPlan({ split: MODES.moonlight.bed, sound: 0.5, volume: 0.5 })); await step(300);
    assert.equal(texGain.gain.of('target').length, n0, 'not yet: ≤ 1 Hz');
    await step(800);
    const tgt = texGain.gain.last('target');
    assert.ok(near(tgt.v, 0.2 * BED.peak) && tgt.tau === BED.tau, 'eased with τ 1.5 s');
    // Breathe: one linear ramp per phase; the plan leaves the texture alone while breathing
    bed.want(bedPlan({ split: MODES.breathe.bed, sound: 1, volume: 0.5 })); bed.touch(); await step();
    bed.breathe('in', 4);
    const up = texGain.gain.last('linear');
    assert.ok(near(up.v, 0.45 * BED.peak) && near(up.t - c.currentTime, 4), `in-breath swell ${up.v}`);
    bed.breathe('holdIn', 0.3);
    assert.equal(texGain.gain.last('linear'), up, 'holds leave the swell where it is');
    bed.breathe('out', 6);
    assert.ok(near(texGain.gain.last('linear').v, 0.45 * BED.breathLow * BED.peak));
    const nt = texGain.gain.of('target').length;
    await step(1100);
    assert.equal(texGain.gain.of('target').length, nt, 'no plan target while breathing');
    bed.breathe(null); await step();
    assert.ok(near(texGain.gain.last('target').v, 0.45 * BED.peak), 'stopping hands the texture back');
    // Drift's bell: only while playing, ≥ 20 s apart, soft
    const bells = [];
    s.chime = (id, st, i) => bells.push([id, st, i]);
    bed.want(bedPlan({ split: MODES.drift.bed, sound: 1, volume: 0.5 })); await step();
    assert.equal(bed.chime(now), true);
    assert.equal(bed.chime(now + 19000), false, 'not within 20 s');
    assert.equal(bed.chime(now + 20001), true);
    assert.ok(bells.length === 2 && bells.every(([id, st, i]) => id === 'noomi' && st >= 0 && st < 5 && i <= BED.chimeI));
    bed.want(bedPlan({ split: MODES.drift.bed, sound: 0.3, volume: 0.5 }));
    assert.equal(bed.chime(now + 60000), false, 'no bell once the bed is below half its level');
    // stopAll (mute, hidden, the voice cap): not alive; the next tick rebuilds with a fresh fade-in
    s.stopAll();
    assert.equal(bed.alive, false);
    bed.want(bedPlan({ split: MODES.drift.bed, sound: 1, volume: 0.5 }));
    await step(); await step();
    assert.equal(bed.alive, true); assert.equal(bed.debug().builds, 2);
    // off: let go over 1.5 s; end(2): sources stop by ~2.1 s
    bed.want(bedPlan({ split: MODES.drift.bed, sound: 1, volume: 0 })); await step();
    assert.equal(bed.alive, false, 'Volume 0: let go');
    bed.want(bedPlan({ split: MODES.drift.bed, sound: 1, volume: 0.5 })); await step(); await step();
    const v2 = [...s.live].find((x) => x.keep && x.srcs.some((q2) => !q2.stopAt));
    bed.end(2);
    assert.equal(bed.alive, false);
    assert.ok(v2.srcs.every((q2) => q2.stopAt != null && q2.stopAt <= c.currentTime + 2.11), 'every source stops after the 2 s fade');
    // a new world brings its own texture (the hush texture sits at 0.7 of the level)
    const bed2 = new NightBed(s, { mallowId: 'glitzi', texture: 'hush' });
    bed2.want(bedPlan({ split: MODES.moonlight.bed, sound: 1, volume: 0.5 }));
    for (let i = 0; i < 4 && !bed2.alive; i++) { now += 150; bed2.tick(now); await flush(); }
    const hushLp = c.nodes.filter((n) => n.kind === 'biquad' && n.type === 'lowpass' && n.frequency.value === TEXTURES.hush.f).at(-1);
    assert.ok(hushLp && near([...hushLp.outputs][0].gain.value, 0.4 * BED.peak * TEXTURES.hush.gain));
    bed2.setTexture('air');
    assert.equal(bed2.alive, false, 'the old texture lets go…');
    for (let i = 0; i < 4 && !bed2.alive; i++) { now += 150; bed2.tick(now); await flush(); }
    assert.ok(bed2.alive && c.nodes.some((n) => n.kind === 'biquad' && n.type === 'bandpass' && n.frequency.value === TEXTURES.air.f), '…and the air texture comes in');
    bed2.destroy();
    assert.equal(new NightBed(s, { mallowId: 'nobody', texture: 'nonsense' }).texture, 'air', 'unknown ids fall back');
  } finally { s.dispose(); restore(); }
});

// ================================================================= U23 ==
test('U23 settings sheet: what every row shows (values, names, sub-labels, disabled and hidden rows)', () => {
  const base = { ...NIGHT_DEFAULTS };
  const v = sheetView({ settings: base, endsAt: T0 + 30 * MIN, locale: 'en-GB', wakeSupported: true });
  assert.deepEqual([v.brightness.value, v.brightness.text, v.light.value, v.light.text, v.speed.value], [40, '40 %', 2, 'Warm', 'slow']);
  assert.deepEqual([v.volume.value, v.volume.text, v.volume.muted], [50, '50 %', false]);
  assert.equal(v.timer.value, 30);
  assert.equal(v.timer.sub, `Ends at ${clock(T0 + 30 * MIN, 'en-GB')}`);
  assert.deepEqual([v.fade.value, v.fade.disabled, v.fade.sub], [true, false, 'Light, sound and movement ease down over the last 8 minutes']);
  assert.deepEqual([v.motion.value, v.motion.gentle, v.motion.sub], ['gentle', true, '']);
  assert.deepEqual([v.wake.shown, v.wake.value, v.wake.sub], [true, false, COPY.sheet.wake.sub]);
  assert.equal(v.fadeNow.hidden, false);
  // the Light names, and brightness / volume at their ends
  assert.deepEqual([0, 0.25, 0.5, 0.75, 1].map((t) => sheetView({ settings: { ...base, temp: t } }).light.text), ['Moon', 'Soft', 'Warm', 'Candle', 'Ember']);
  assert.equal(sheetView({ settings: { ...base, brightness: 0.05 } }).brightness.text, '5 %');
  assert.equal(sheetView({ settings: { ...base, volume: 0 } }).volume.text, '0 %');
  // No timer: "Runs until you close it", and the fade needs a timer
  const none = sheetView({ settings: { ...base, minutes: 0 }, endsAt: null });
  assert.deepEqual([none.timer.sub, none.fade.disabled, none.fade.sub], [COPY.sheet.timer.none, true, COPY.sheet.fade.needsTimer]);
  // …but after "Fade out now" it has an end time
  assert.match(sheetView({ settings: { ...base, minutes: 0 }, endsAt: T0 + 12e3, locale: 'en-GB', fading: true }).timer.sub, /^Ends at /);
  // fade off; the fade length per timer (a third of the session, 2–8 min)
  assert.equal(sheetView({ settings: { ...base, fade: false } }).fade.sub, COPY.sheet.fade.offSub);
  assert.deepEqual(TIMER_MINUTES.map(fadeMinutes), [3, 7, 8, 8, 8, 0]);
  assert.equal(sheetView({ settings: { ...base, minutes: 10 } }).fade.sub, COPY.sheet.fade.sub(3));
  // the device asks for less motion: Gentle is disabled and the effective choice is Less (Still stays Still)
  const red = sheetView({ settings: base, labReduced: true });
  assert.deepEqual([red.motion.value, red.motion.gentle, red.motion.sub], ['less', false, COPY.sheet.motion.reduced]);
  assert.equal(sheetView({ settings: { ...base, motion: 'still' }, labReduced: true }).motion.value, 'still');
  // the wake lock: unsupported hides the choice; a refusal shows "Not available right now" until it is turned on again
  assert.equal(sheetView({ settings: base }).wake.shown, false);
  assert.equal(sheetView({ settings: base, wakeSupported: true, wakeFailed: true }).wake.sub, COPY.sheet.wake.failed);
  assert.equal(sheetView({ settings: { ...base, keepAwake: true }, wakeSupported: true, wakeFailed: true }).wake.sub, COPY.sheet.wake.sub);
  // muted: "Sound is off" with Turn on; fading: "Fade out now" is hidden
  assert.equal(sheetView({ settings: base, soundOn: false }).volume.muted, true);
  assert.equal(sheetView({ settings: base, fading: true }).fadeNow.hidden, true);
  // every row's text fits the sheet (≤ 70 characters), with no claims
  const texts = TIMER_MINUTES.flatMap((m) => [true, false].map((f) => sheetView({ settings: { ...base, minutes: m, fade: f }, endsAt: m ? T0 : null, locale: 'en-US', labReduced: true, wakeSupported: true, wakeFailed: true })))
    .flatMap((x) => Object.values(x).flatMap((r) => [r.text, r.sub])).filter(Boolean);
  for (const t of texts) assert.ok(t.length <= 70, t);
  assert.deepEqual(lintCopy(texts, { extra: [SPEC_BANNED] }), []);
});

// ================================================================= U24 ==
/** The rules of a stylesheet: [{ media, selectors: [...], body }] (comments dropped; one level of @media). */
function cssRules(src) {
  const text = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const walk = (s, media) => {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf('{', i);
      if (open < 0) break;
      const head = s.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < s.length && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; }
      const body = s.slice(open + 1, j - 1);
      if (head.startsWith('@media')) walk(body, head);
      else out.push({ media, selectors: head.split(',').map((x) => x.trim()).filter(Boolean), body });
      i = j;
    }
  };
  walk(text, null);
  return out;
}

test('U24 stylesheet: every rule scoped to .nightlight, night tokens, no blur, no !important, 40 px controls, every viewport', () => {
  const css = readFileSync(here('../styles/nightlight.css'), 'utf8');
  const rules = cssRules(css);
  assert.ok(rules.length > 40);
  const unscoped = rules.flatMap((r) => r.selectors).filter((sel) => !/^\.(screen\.)?nightlight\b/.test(sel));
  assert.deepEqual(unscoped, [], 'every selector starts with .nightlight or .screen.nightlight (SHARED §2)');
  assert.ok(!/!important/.test(css), 'no !important');
  assert.ok(!/@import/.test(css), 'no @import (linked after lab.css, SHARED C19)');
  // no blur at night: every backdrop-filter is none
  const blur = [...css.matchAll(/(?:-webkit-)?backdrop-filter\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  assert.ok(blur.length >= 2 && blur.every((v) => v === 'none'), JSON.stringify(blur));
  const noBlur = rules.find((r) => /backdrop-filter:\s*none/.test(r.body));
  for (const sel of ['.chips', '.icon-btn', '.end-card', '.sheet']) assert.ok(noBlur.selectors.some((x) => x.endsWith(sel)), `no blur on ${sel}`);
  // the night tokens (spec §8) on .screen.nightlight, in either theme
  const root = rules.find((r) => r.selectors.includes('.screen.nightlight') && !r.media).body.replace(/\s+/g, ' ');
  for (const [k, val] of [['--text-1', '#e9e3fa'], ['--text-2', '#cfc6ea'], ['--text-3', '#a79dcb'], ['--chrome', 'rgba(8, 6, 22, 0.66)'],
    ['--chrome-line', 'rgba(255, 255, 255, 0.12)'], ['--glass-strong', 'rgba(10, 8, 26, 0.95)'], ['--chip-on-text', '#fff1dc'], ['--accent', '#e8c690']]) {
    assert.ok(root.includes(`${k}: ${val}`), `${k}: ${val}`);
  }
  assert.match(root, /--chip-on: var\(--nl-chip-on, rgba\(255, 214, 150, 0\.24\)\)/);
  assert.match(root, /color-scheme: dark/);
  assert.match(root, /background: #000/);
  // the sheet is opaque (nothing glows through it), and its scrim is clear (the live preview)
  assert.match(root, /--nl-sheet: #[0-9a-f]{6}\b/);
  assert.ok(rules.some((r) => r.selectors.includes('.nightlight .sheet-scrim') && /background:\s*transparent/.test(r.body)));
  // range inputs: 40 px high, at most min(180 px, 46 vw) wide; every sheet choice ≥ 40 px
  const range = rules.find((r) => r.selectors.includes('.nightlight .nl-range')).body;
  assert.match(range, /height:\s*40px/); assert.match(range, /width:\s*min\(180px,\s*46vw\)/);
  // the sticky Done: an opaque pill (::after) on an opaque strip the sheet's full width (::before), so rows scroll
  // under it and never show through or beside it
  const doneAfter = rules.find((r) => r.selectors.includes('.nightlight .sheet .done::after') && /inset:/.test(r.body)).body;
  assert.match(doneAfter, /background:[^;]*var\(--nl-sheet\)/);
  const doneStrip = rules.find((r) => r.selectors.includes('.nightlight .sheet .done::before') && /left:/.test(r.body)).body;
  assert.match(doneStrip, /left:\s*calc\(-1 \* var\(--nl-pad\)\)/); assert.match(doneStrip, /bottom:\s*calc\(-1 \* var\(--nl-padb\)\)/);
  assert.match(doneStrip, /var\(--nl-sheet\)/);
  const segBtn = rules.find((r) => r.selectors.includes('.nightlight .nl-seg button')).body;
  assert.match(segBtn, /min-width:\s*40px/); assert.match(segBtn, /min-height:\s*40px/);
  // the viewports: narrow (≤ 360), short landscape (≤ 420 tall, the time in the subtitle), the side panel
  // (wide, and short landscape), and reduced motion
  const medias = new Set(rules.map((r) => r.media).filter(Boolean));
  for (const m of ['(max-width: 360px)', '(max-height: 420px)', '(min-width: 900px), (max-height: 420px) and (min-width: 540px)', '(prefers-reduced-motion: reduce)']) {
    assert.ok([...medias].some((x) => x === `@media ${m}`), m);
  }
  // less motion: the chrome fades in 200 ms, the sheet fades instead of sliding
  assert.ok(rules.some((r) => r.selectors.includes('.nightlight.nl-calm .sheet') && /opacity:\s*0/.test(r.body)));
  assert.ok(!new RegExp('H' + 'ushmallow').test(css));
});
