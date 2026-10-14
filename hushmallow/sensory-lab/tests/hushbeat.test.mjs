// Unit tests for Hushbeat Symphony (spec-hushbeat.md §13): U1–U18.
// U15 covers the kits (core/music-kits.js) and the renderer (core/music-audio.js)
// on the shared FakeAudioContext; the real-DSP listening checks (pitch, loudness,
// clicks, bass band energy) are E10 in tests/e2e-phase3-hushbeat.cjs. U16 covers
// the light (core/music-fx.js: steps only, never drawing) and the performer and
// scene (features/hushbeat/performer.js) on a fake rig and a fake Environment.
// Node only; seeded and deterministic (fake clock and timers):
//   node --test hushmallow/sensory-lab/tests/hushbeat.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MALLOW_IDS } from '../../src/mallows/registry.js';
import { VOICES, quietSound, SoundEngine, MAX_VOICES } from '../core/sound-engine.js';
import { rng } from '../core/math.js';
import {
  MUSIC, CHORDS, SHAPES, voiceFor, degSemi, hz, bassHz, chordAt, ic, consonant, guard, guardDeg,
  pickNote, harmonise, velocity, shapeOf, voicePad, leadPad, BASS_RANGE, SUM_PEAK, LAYER_PEAK,
} from '../core/music-theory.js';
import { BreathClock, Scheduler, Take, softQuantise, encodeMotif, decodeMotif, MAX_STEP } from '../core/music-time.js';
import { MusicEngine, CAPS, PAD_TAIL, BASS_TAIL, MIN_GAP, MAX_RATE } from '../core/music-engine.js';
import { KITS, SOUND_WORDS, TIERS, graph, setTier, currentTier, warmNoise } from '../core/music-kits.js';
import { MusicAudio } from '../core/music-audio.js';
import { Player, bodyPoint } from '../features/hushbeat/player.js';
import { COPY } from '../features/hushbeat/copy.js';
import { HUSHBEAT_MOTIF_RE, ComfortDNA, sanitize, itemKey, describeTune } from '../core/comfort-dna.js';
import { MemoryComfortStore } from '../adapters/comfort-store.js';
import { DEFAULTS, Prefs } from '../core/prefs.js';
import { collectStrings, lintCopy } from './lib/copy-lint.mjs';
import { NETWORK, scanFiles } from './lib/static-scan.mjs';
import { installAudioGlobals, FakeAudioContext, reaches } from './lib/fake-audio.mjs';
import { FlashGate } from '../core/effects.js';
import { PULSE_GAPS } from '../core/environment.js';
import { NoteBead, BeadPool, BeatGlow, PhraseRibbon, HarmonyArc, BreathHalo, POOL, RIBBON, BEAD, GLOW_MAX, KICK_GAP } from '../core/music-fx.js';
import { TRAITS, Performer, Scene, Cue, grooveStep } from '../features/hushbeat/performer.js';
import { REACTIONS } from '../../src/mallows/reactions.js';
import { PRESETS } from '../../src/mallows/expressions.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const mod = (a, n) => ((a % n) + n) % n;
const PAIRS = MALLOW_IDS.flatMap((a) => MALLOW_IDS.filter((b) => b !== a).map((b) => [a, b]));
const ANHEMITONIC = MALLOW_IDS.filter((id) => MUSIC[id].shape !== 'spiral');

// ------------------------------------------------------------ helpers --
/** Fake performance clock and timers: advance() runs every timer at its own time. */
function fakeTime(start = 100) {
  let T = start, ids = 0;
  const timers = new Map();
  const advance = (s) => {
    const end = T + s;
    for (;;) {
      let next = null, nid = 0;
      for (const [id, x] of timers) if (x.at <= end + 1e-12 && (!next || x.at < next.at || (x.at === next.at && id < nid))) { next = x; nid = id; }
      if (!next) break;
      timers.delete(nid);
      T = Math.max(T, next.at);
      next.fn();
    }
    T = end;
  };
  return {
    now: () => T,
    setTimer(fn, ms) { const id = ++ids; timers.set(id, { at: T + Math.max(0, ms) / 1000, fn }); return id; },
    clearTimer(id) { timers.delete(id); },
    get timers() { return timers.size; },
    advance,
    jump(s) { T += s; },   // time passes with the main thread blocked: no timers run
  };
}

const GEO = Object.freeze({ cx: 100, base: 300, w: 200, h: 200 });   // the body spans x 0–200, y 100–300

function rig({ lead = 'boppo', friend = null, sink = null, quality = 'high', seed = 7, start = 100, inhale = 4, exhale = 6 } = {}) {
  const time = fakeTime(start);
  const clock = new BreathClock({ now: time.now, inhale, exhale });
  const scheduler = new Scheduler({ now: time.now, setTimer: time.setTimer, clearTimer: time.clearTimer });
  const events = [];
  const engine = new MusicEngine({ clock, scheduler, now: time.now, sink, quality, rand: rng(seed), onEvent: (e) => events.push(e) });
  const parts = [engine.part(0, lead)];
  if (friend) parts.push(engine.part(1, friend));
  const players = parts.map((p) => new Player(p, { geo: () => GEO, now: time.now }));
  return { time, clock, scheduler, engine, parts, players, events };
}

const notesOf = (evs, f = () => true) => evs.filter((e) => e.kind === 'note' && !e.ghost && f(e));
const isGrid = (clock, t, div, swing = 0.5) => Math.abs(clock.nextGrid(t - 1e-4, div, swing) - t) < 1e-7;
const onSomeGrid = (clock, t, swing) => [1, 2, 4, 8].some((d) => isGrid(clock, t, d, swing));

// Companion._autoStroke's exact data: 40 stroke events, 30 ms apart, over 1.2 s
function autoStroke(R, slot = 0, w = 80) {
  const pl = R.players[slot], cx = 100, cy = 160;
  pl.gesture('strokestart', { x: cx - w, y: cy });
  for (let i = 1; i <= 40; i++) {
    R.time.advance(0.03);
    const ph = i / 40, x = cx + Math.sin(ph * Math.PI * 3) * w, vx = Math.cos(ph * Math.PI * 3) * w * Math.PI * 3 / 1.2;
    pl.gesture('stroke', { x, y: cy + Math.sin(ph * Math.PI * 6) * 6, vx, vy: 0, speed: Math.abs(vx) * 0.6 });
  }
  pl.gesture('strokeend', { dur: 1200, dist: w * 6 });
}

// One gesture as the Companion would report it: [time, type, data]
const XY = (r) => ({ x: 20 + r() * 160, y: 110 + r() * 180 });
function gestureEvents(kind, t0, r) {
  const p = XY(r), on = { ...p, onBody: true }, out = [[t0, 'contact', on]];
  switch (kind) {
    case 'tap': out.push([t0 + 0.03, 'tap', { ...p, streak: 1 }]); break;
    case 'double': out.push([t0 + 0.04, 'tap', p], [t0 + 0.14, 'contact', on], [t0 + 0.2, 'doubletap', p]); break;
    case 'hold': {
      const d = 0.4 + r() * 2.6;
      out.push([t0 + 0.48, 'holdstart', p]);
      for (let k = 0.6; k < 0.48 + d; k += 0.25) out.push([t0 + k, 'holding', { ...p, y: p.y - 40 * r(), dur: k }]);
      out.push([t0 + 0.48 + d, 'holdend', p]);
      break;
    }
    case 'up': {
      out.push([t0 + 0.1, 'dragstart', { x0: p.x, y0: p.y, ...p }]);
      for (let i = 1; i <= 6; i++) out.push([t0 + 0.1 + i * 0.05, 'drag', { x: p.x, y: p.y - 15 * i, dx: 0, dy: -15 * i, vx: 0, vy: -300 }]);
      out.push([t0 + 0.45, 'dragend', { x: p.x, y: p.y - 90, dx: 0, dy: -90, fling: r() < 0.4, converted: false }]);
      break;
    }
    case 'press': {
      out.push([t0 + 0.1, 'dragstart', { x0: p.x, y0: p.y, ...p }]);
      for (let i = 1; i <= 8; i++) out.push([t0 + 0.1 + i * 0.06, 'drag', { x: p.x, y: p.y + 12 * i, dx: 0, dy: 12 * i, vx: 0, vy: 200 }]);
      out.push([t0 + 0.7 + r(), 'dragend', { x: p.x, y: p.y + 96, dx: 0, dy: 96, fling: false, converted: false }]);
      break;
    }
    case 'stroke': {
      out.push([t0 + 0.08, 'dragstart', { x0: p.x, y0: p.y, ...p }], [t0 + 0.12, 'drag', { ...p, dx: 10, dy: 0, vx: 300, vy: 0 }]);
      out.push([t0 + 0.2, 'dragend', { ...p, dx: 10, dy: 0, fling: false, converted: true }], [t0 + 0.2, 'strokestart', p]);
      const n = 10 + Math.floor(r() * 50), fast = r() < 0.4;
      for (let i = 1; i <= n; i++) {
        const vx = Math.cos(i / 6) * (fast ? 1500 : 500);
        out.push([t0 + 0.2 + i * 0.03, 'stroke', { x: 100 + Math.sin(i / 6) * 70, y: p.y, vx, vy: 0, speed: Math.abs(vx) }]);
      }
      out.push([t0 + 0.2 + n * 0.03 + 0.01, 'strokeend', { dur: n * 30, dist: 400 }]);
      break;
    }
    case 'squeeze': {
      out.push([t0 + 0.05, 'contact', { ...XY(r), onBody: true }], [t0 + 0.05, 'squeezestart', {}]);
      const n = 5 + Math.floor(r() * 30);
      for (let i = 1; i <= n; i++) out.push([t0 + 0.05 + i * 0.04, 'squeeze', { amount: Math.min(1, i / 12) }]);
      out.push([t0 + 0.1 + n * 0.04, 'squeezeend', { amount: 0.5 }]);
      break;
    }
    case 'key': return [[t0, 'degree', { n: 1 + Math.floor(r() * 7) }]];
    case 'together': return [[t0, 'together', {}]];
    default:
  }
  return out;
}

const KINDS = ['tap', 'tap', 'tap', 'tap', 'double', 'hold', 'up', 'press', 'stroke', 'squeeze', 'key', 'together'];

/** A seeded run of n gestures (bursts at 20 per second), on one Mallow or spread over two. */
function simulate(R, { n = 1000, seed = 1, burst = 0.35 } = {}) {
  const r = rng(seed), evs = [], free = [0, 0];
  let t = R.time.now() + 0.3;
  for (let i = 0; i < n; i++) {
    const slot = R.players.length > 1 && r() < 0.5 ? 1 : 0;
    t += r() < burst ? 0.05 : 0.05 + r() * 0.6;
    const t0 = Math.max(t, free[slot]);
    let kind = KINDS[Math.floor(r() * KINDS.length)];
    if (kind === 'together' && R.players.length < 2) kind = 'tap';
    const list = gestureEvents(kind, t0, r);
    for (const [tt, type, d] of list) evs.push({ t: tt, slot, type, d, end: list[list.length - 1][0] });
    free[slot] = list[list.length - 1][0] + 0.02;
  }
  evs.sort((a, b) => a.t - b.t);
  const busyUntil = [0, 0];
  for (const e of evs) {
    R.time.advance(Math.max(0, e.t - R.time.now()));
    busyUntil[e.slot] = Math.max(busyUntil[e.slot], e.end);
    const pl = R.players[e.slot];
    if (e.type === 'degree') pl.degree(e.d.n);
    else if (e.type === 'together') R.engine.together();
    else pl.gesture(e.type, e.d);
    R.players.forEach((p, i) => p.watchdog(R.time.now(), R.time.now() < busyUntil[i]));
  }
  R.time.advance(1);
  R.players.forEach((p) => p.watchdog(R.time.now(), false));
  R.time.advance(12);
}

/**
 * Every pair of pitches that sound at the same time, rebuilt from the event stream with the
 * engine's own rules (a note counts for `ring`; released layers for PAD_TAIL / BASS_TAIL).
 * → list of clashes (interval class 1 or 6)
 */
function clashes(events) {
  const segs = [], byId = new Map(), pad = [null, null], bass = [null, null];
  const open = (a, pcs, tag) => pcs.map((pc) => { const s = { a, b: Infinity, pc, tag }; segs.push(s); return s; });
  const close = (list, b) => { if (list) for (const s of list) s.b = Math.min(s.b, b); };
  for (const e of events) {
    switch (e.kind) {
      case 'note': if (!e.ghost) { const s = { a: e.t, b: e.t + e.ring, pc: e.semi, tag: `${e.src}#${e.id}@${e.slot}` }; segs.push(s); byId.set(e.id, s); } break;
      case 'noteOff': { const s = byId.get(e.id); if (s) s.b = s.a > e.t ? s.a : Math.min(s.b, e.t + 0.06); break; }   // not started yet: never sounds
      case 'duck': { const s = byId.get(e.id); if (s) s.b = Math.max(s.a + 0.25, Math.min(s.b, e.t + 0.1)); break; }
      case 'bend': {
        const s = byId.get(e.id);
        if (!s) break;
        if (e.start) s.b = Infinity;
        if (e.end === 'handoff') s.b = Math.min(s.b, e.t + 0.12);
        if (e.end === 'snap') { s.b = e.t; const n = { a: e.t, b: e.t + e.ring, pc: e.semi, tag: `${s.tag}~` }; segs.push(n); byId.set(e.id, n); }
        break;
      }
      case 'padOn': close(pad[e.slot], e.t); pad[e.slot] = open(e.t, e.semis, `pad@${e.slot}`); break;
      case 'padSet': if (e.semis) { close(pad[e.slot], e.t); pad[e.slot] = open(e.t, e.semis, `pad@${e.slot}`); } break;
      case 'padOff': close(pad[e.slot], e.t + PAD_TAIL); pad[e.slot] = null; break;
      case 'bassOn': close(bass[e.slot], e.t); bass[e.slot] = open(e.t, [e.semi], `bass@${e.slot}`); break;
      case 'bassSet': if (e.semi != null) { close(bass[e.slot], e.t); bass[e.slot] = open(e.t, [e.semi], `bass@${e.slot}`); } break;
      case 'bassOff': close(bass[e.slot], e.t + BASS_TAIL); bass[e.slot] = null; break;
      default:
    }
  }
  segs.sort((x, y) => x.a - y.a);
  const active = [], bad = [];
  for (const s of segs) {
    if (!(s.b > s.a)) continue;
    for (let i = active.length - 1; i >= 0; i--) if (active[i].b <= s.a + 1e-9) active.splice(i, 1);
    for (const o of active) if (!consonant(o.pc, s.pc)) bad.push(`${o.tag}(${o.pc}) × ${s.tag}(${s.pc}) at ${s.a.toFixed(3)}`);
    active.push(s);
  }
  return bad;
}

// semitones above the lead's root from a frequency (octave folds included)
const semisFromHz = (V, f) => 12 * Math.log2(f / V.rootHz);
function outOfScale(events, V) {
  const bad = [];
  for (const e of notesOf(events)) {
    const s = semisFromHz(V, e.hz), r = Math.round(s);
    if (Math.abs(s - r) > 0.01 || !V.scale.includes(mod(r, 12))) bad.push(`${e.src} ${e.hz.toFixed(2)} Hz`);
  }
  for (const e of events) for (const s of e.kind === 'padOn' || (e.kind === 'padSet' && e.semis) ? e.semis : e.kind.startsWith('bass') && e.semi != null ? [e.semi] : []) {
    if (!V.scale.includes(mod(s, 12))) bad.push(`${e.kind} ${s}`);
  }
  return bad;
}

// ================================================================== U1 ==
test('U1 VOICES roots and scales equal the production kits; MUSIC and the sound words cover all seven Mallows', () => {
  const src = readFileSync(here('../../src/engine/audio.js'), 'utf8');
  const kits = {};
  for (const m of src.matchAll(/(\w+): makeKit\(\{\s*root: ([\d.]+), scale: \[([\d, ]+)\]/g)) kits[m[1]] = { root: +m[2], scale: m[3].split(',').map(Number) };
  for (const id of MALLOW_IDS) {
    assert.ok(kits[id], `${id} kit parsed`);
    assert.equal(VOICES[id].root, kits[id].root, `${id} root`);
    assert.deepEqual(VOICES[id].scale, kits[id].scale, `${id} scale`);
    const m = MUSIC[id];
    assert.ok(m, `${id} MUSIC`);
    for (const k of ['meter', 'grid', 'swing', 'prog', 'tap', 'walk', 'phrase', 'decay', 'send', 'peak', 'repeatMax', 'shape', 'shimmer']) assert.ok(m[k] != null, `${id}.${k}`);
    assert.equal(m.shape, shapeOf(VOICES[id].scale), `${id} shape matches its scale`);
    assert.ok([3, 4].includes(m.meter) && m.prog.length === 4 && m.walk.length === 4, `${id} meter, loop and walk`);
    for (const r of m.prog) assert.ok(CHORDS[m.shape][r], `${id} progression root ${r} has a chord`);
    assert.ok(m.tap[0] < m.tap[1] && m.tap[1] - m.tap[0] >= 7, `${id} tap window`);
    assert.ok(m.phrase.rise.length && m.phrase.fall.length && m.phrase.max >= 2, `${id} phrase style`);
    // every tap note is a real melody pitch below the fold
    for (let d = m.tap[0]; d <= m.tap[1]; d++) assert.ok(hz(voiceFor(id), degSemi(VOICES[id].scale, d)) <= 2400);
  }
  assert.deepEqual(Object.keys(MUSIC).sort(), [...MALLOW_IDS].sort());
  assert.equal(Object.keys(COPY.soundWords).length, 7);
  for (const id of MALLOW_IDS) assert.match(COPY.soundWords[id], /^[a-z ]+$/);
  // meters per the spec: 4/4 for Boppo, Pipzi and Glitzi; 3/4 for the others
  assert.deepEqual(MALLOW_IDS.filter((id) => MUSIC[id].meter === 4).sort(), ['boppo', 'glitzi', 'pipzi']);
  // the per-Mallow phrase grids differ (sound personality)
  assert.ok(new Set(MALLOW_IDS.map((id) => JSON.stringify([MUSIC[id].grid, MUSIC[id].swing, MUSIC[id].phrase]))).size === 7);
  // every Mallow has its whole instrument, in the engine's units
  assert.deepEqual(Object.keys(KITS).sort(), [...MALLOW_IDS].sort());
  for (const id of MALLOW_IDS) {
    const k = KITS[id];
    for (const fn of ['note', 'shimmer', 'held', 'bass', 'pad']) assert.equal(typeof k[fn], 'function', `${id}.${fn}`);
    assert.equal(k.send, MUSIC[id].send, `${id} send`);
    assert.equal(k.peak, MUSIC[id].peak, `${id} peak`);
  }
  assert.equal(SOUND_WORDS, COPY.soundWords, 'the sound words live in the linted copy table');
});

// ================================================================== U2 ==
test('U2 chords use only scale tones, root first, no semitone or tritone; the guard is a no-op for pentatonic scales', () => {
  for (const [shape, table] of Object.entries(CHORDS)) {
    const scale = SHAPES[shape];
    for (const [root, tones] of Object.entries(table)) {
      assert.equal(tones[0], +root, `${shape} ${root}: root first`);
      for (const t of tones) assert.ok(scale.includes(t), `${shape} ${root}: ${t} in scale`);
      for (let i = 0; i < tones.length; i++) for (let j = i + 1; j < tones.length; j++) assert.ok(consonant(tones[i], tones[j]), `${shape} ${root}: ${tones[i]}–${tones[j]}`);
    }
  }
  // the pentatonics contain no semitone or tritone at all, so nothing can ever clash
  for (const s of [SHAPES.maj, SHAPES.min]) for (const a of s) for (const b of s) assert.ok(consonant(a, b));
  const r = rng(3);
  for (const id of ANHEMITONIC) {
    const V = voiceFor(id);
    for (let d = -7; d <= 14; d++) for (let k = 0; k < 20; k++) {
      const sounding = Array.from({ length: 1 + Math.floor(r() * 6) }, () => degSemi(V.scale, Math.floor(r() * 30) - 10));
      assert.equal(guardDeg(d, sounding, V), d, `${id} deg ${d}`);
      assert.equal(guard(degSemi(V.scale, d), sounding, V), degSemi(V.scale, d));
    }
  }
  // Zuzu's spiral scale [0,2,3,7,8] has two semitones and a tritone: the guard moves notes off them
  const Z = voiceFor('zuzu');
  for (let k = 0; k < 400; k++) {
    const sounding = [];
    for (let i = 0; i < 1 + Math.floor(r() * 3); i++) {   // a mutually consonant sounding set, as the engine keeps it
      const s = degSemi(Z.scale, Math.floor(r() * 15) - 5);
      if (sounding.every((x) => consonant(x, s))) sounding.push(s);
    }
    const d = Math.floor(r() * 12) - 4, g = guardDeg(d, sounding, Z);
    assert.ok(sounding.every((x) => consonant(x, degSemi(Z.scale, g))), `zuzu ${d} vs ${sounding} → ${g}`);
  }
  assert.equal(guardDeg(1, [8], Z) !== 1, true, 'zuzu: 2 against 8 (a tritone) moves');
});

// ================================================================== U3 ==
test('U3 pickNote: in scale and window, leaps ≤ 5, repeat limit, chord tones on strong beats, a walk of its own per Mallow', () => {
  const r = rng(11), seqs = [];
  for (const id of MALLOW_IDS) {
    const V = voiceFor(id);
    const st = { prev: null, walkI: 0, repeats: 0, lastT: -1e9 };
    let prev = null, run = 0, t = 0;
    for (let i = 0; i < 400; i++) {
      t += 0.05 + r() * 0.3;
      const strong = r() < 0.4, chord = chordAt(V, Math.floor(r() * 4));
      const { deg, semi } = pickNote(V, st, { band01: r(), strong, chord, t });
      assert.ok(deg >= V.tapLo && deg <= V.tapHi, `${id}: ${deg} inside the tap window`);
      assert.equal(semi, degSemi(V.scale, deg));
      assert.ok(V.scale.includes(mod(semi, 12)), `${id}: in scale`);
      if (prev != null) assert.ok(Math.abs(deg - prev) <= 5, `${id}: leap ${prev} → ${deg}`);
      run = deg === prev ? run + 1 : 1;
      assert.ok(run <= V.repeatMax, `${id}: ${run} repeats (max ${V.repeatMax})`);
      if (strong) assert.ok(chord.tones.includes(mod(semi, 12)), `${id}: a chord tone on a strong beat`);
      prev = deg;
    }
    // the same input gives each Mallow its own melodic habit
    const s2 = { prev: null, walkI: 0, repeats: 0, lastT: -1e9 };
    seqs.push(Array.from({ length: 8 }, (_, i) => pickNote(V, s2, { band01: 0.5, t: i * 0.3 }).deg).join(','));
    // digit keys: an exact degree, walk steps skipped
    assert.equal(pickNote(V, { prev: 2, walkI: 1, repeats: 1, lastT: 0 }, { deg: V.tapHi + 2, t: 0.1 }).deg, V.tapHi + 2);
  }
  assert.equal(new Set(seqs).size, 7, `seven different walks: ${seqs.join(' | ')}`);
  // Glitzi may repeat three times; the others twice
  assert.equal(MUSIC.glitzi.repeatMax, 3);
  // the walk restarts from the touch height after 2 s
  const V = voiceFor('boppo'), st = { prev: null, walkI: 0, repeats: 0, lastT: -1e9 };
  pickNote(V, st, { band01: 0, t: 0 });
  assert.equal(pickNote(V, st, { band01: 1, t: 5 }).deg, V.tapHi);
});

// ================================================================== U4 ==
test('U4 fuzz: 1000 seeded gestures solo × 7 and duet × 42 with bursts of 20/s: no semitone or tritone sounds together, all in key', () => {
  let total = 0;
  const runs = [...MALLOW_IDS.map((id) => [id, null]), ...PAIRS];
  runs.forEach(([lead, friend], i) => {
    const R = rig({ lead, friend, seed: 100 + i });
    simulate(R, { n: friend ? 600 : 1000, seed: 500 + i });
    const n = notesOf(R.events).length;
    total += n;
    assert.ok(n > 200, `${lead}${friend ? `+${friend}` : ''}: ${n} notes`);
    assert.deepEqual(clashes(R.events).slice(0, 5), [], `${lead}${friend ? `+${friend}` : ''}: clashes`);
    assert.deepEqual(outOfScale(R.events, R.parts[0].V).slice(0, 5), [], `${lead}${friend ? `+${friend}` : ''}: in the lead's key`);
    assert.equal(R.scheduler.pending, 0, 'the scheduler empties');
    assert.equal(R.time.timers, 0, 'no timers left');
  });
  assert.ok(total > 20000);
});

// ================================================================== U5 ==
test('U5 200 taps in 2 s: 70 ms per Mallow, ≤ 14/s overall, the rest ghosts; voice caps per tier; softer when dense; summed peaks ≤ 0.45', () => {
  for (const quality of ['high', 'medium', 'low']) {
    const R = rig({ lead: 'pipzi', friend: 'noomi', quality });
    for (let i = 0; i < 200; i++) {
      const pl = R.players[i % 2];
      pl.gesture('contact', { x: 100, y: 120 + (i * 37) % 170, onBody: true });
      R.time.advance(0.005);
      pl.gesture('tap', { x: 100, y: 150 });
      R.time.advance(0.005);
    }
    R.time.advance(5);
    const all = R.events.filter((e) => e.kind === 'note'), real = all.filter((e) => !e.ghost), ghosts = all.filter((e) => e.ghost);
    assert.equal(all.length, 200, 'every touch is answered (a note or a ghost bead)');
    assert.ok(ghosts.length > 100 && real.length >= 20, `${quality}: ${real.length} notes, ${ghosts.length} ghosts`);
    for (const slot of [0, 1]) {
      const ts = real.filter((e) => e.slot === slot).map((e) => e.t).sort((a, b) => a - b);
      for (let i = 1; i < ts.length; i++) assert.ok(ts[i] - ts[i - 1] >= MIN_GAP - 1e-9, `${quality} slot ${slot}: ${ts[i] - ts[i - 1]}`);
    }
    for (const x of real) assert.ok(real.filter((e) => e.t > x.t - 1 && e.t <= x.t).length <= MAX_RATE, `${quality}: ≤ 14 in a second`);
    // voices alive at each onset (a stolen voice ends at its noteOff)
    const offs = new Map(R.events.filter((e) => e.kind === 'noteOff').map((e) => [e.id, e.t]));
    const caps = CAPS[quality];
    const ids = { 0: 'pipzi', 1: 'noomi' };
    for (const x of real) {
      const alive = real.filter((e) => e.t <= x.t && x.t < Math.min(e.t + e.dur, offs.get(e.id) ?? Infinity));
      assert.ok(alive.length <= caps.total, `${quality}: ${alive.length} voices`);
      assert.ok(alive.filter((e) => e.slot === x.slot).length <= caps.part, `${quality}: per Mallow`);
      const sum = alive.reduce((s, e) => s + MUSIC[ids[e.slot]].peak * e.vel * Math.exp(-(x.t - e.t) / MUSIC[ids[e.slot]].decay), 0);
      assert.ok(sum <= SUM_PEAK + 1e-9, `${quality}: summed peak ${sum.toFixed(3)}`);
    }
    // the first note is the loudest: density softens what follows
    const later = real.filter((e) => e.t > real[0].t + 1).map((e) => e.vel);
    assert.ok(later.length && Math.max(...later) < real[0].vel, `${quality}: velocity falls with density`);
  }
  // velocity() itself
  assert.ok(velocity({ base: 0.75, downbeat: true }) > velocity({ base: 0.75, offsetMs: 30 }));
  assert.ok(velocity({ base: 0.75, offsetMs: 30 }) > velocity({ base: 0.75, offsetMs: 200 }));
  assert.ok(velocity({ onsets1s: 12 }) < velocity({ onsets1s: 0 }) * 0.6);
  assert.ok(Math.abs(velocity({ base: 0.75, offsetMs: 200, gentle: true }) - 0.75 * 0.88 * 0.8) < 1e-9);
  assert.ok(velocity({ base: 1, sumLevel: 0.43, peak: 0.1, downbeat: true }) <= 0.2 + 1e-9);
});

// ================================================================== U6 ==
function fakePart(id = 'boppo') {
  const calls = [];
  let n = 0;
  const rec = (name) => (...a) => { calls.push([name, ...a]); return undefined; };
  return {
    V: voiceFor(id), calls,
    names: () => calls.map((c) => c[0]),
    strike: (o) => { calls.push(['strike', o]); return ++n; },
    phraseStart: (o) => { calls.push(['phraseStart', o]); return o.reuse ?? ++n; },
    ...Object.fromEntries(['ring', 'chord', 'bloom', 'padStart', 'padBright', 'padEnd', 'bendStart', 'bend', 'bendEnd', 'duck',
      'bassStart', 'bassAmount', 'bassEnd', 'phraseMove', 'phraseEnd'].map((k) => [k, rec(k)])),
  };
}

test('U6 player: the contact note becomes what the gesture makes it; act paths strike their own; the watchdog ends stuck states', () => {
  const time = fakeTime();
  const mk = () => { const part = fakePart(); return { part, pl: new Player(part, { geo: () => GEO, now: time.now }) }; };
  const on = (x = 100, y = 150) => ({ x, y, onBody: true });

  { const { part, pl } = mk(); pl.gesture('contact', on()); pl.gesture('tap', { x: 100, y: 150 });
    assert.deepEqual(part.names(), ['strike', 'ring']); assert.equal(part.calls[1][1], 1); assert.equal(pl.state, 'idle'); }
  { const { part, pl } = mk(); pl.gesture('contact', on()); pl.gesture('holdstart', { x: 100, y: 150 }); pl.gesture('holding', { x: 100, y: 120 }); pl.gesture('holdend', {});
    assert.deepEqual(part.names(), ['strike', 'bloom', 'padBright', 'padEnd'], 'a hold blooms the contact note, no second strike'); }
  { const { part, pl } = mk(); pl.gesture('contact', on()); pl.gesture('contact', on(60, 200)); pl.gesture('squeezestart', {});
    pl.gesture('squeeze', { amount: 0.4 }); pl.gesture('squeeze', { amount: -0.2 }); pl.gesture('squeezeend', {});
    assert.deepEqual(part.names(), ['strike', 'duck', 'bassStart', 'bassAmount', 'bassAmount', 'bassEnd'], 'a second finger: duck + bass, no second strike');
    assert.equal(part.calls[4][1], 0, 'spreading apart is no bass'); }
  { const { part, pl } = mk(); pl.gesture('contact', on()); pl.gesture('dragstart', { x0: 100, y0: 150, x: 100, y: 160 });
    pl.gesture('drag', { dx: 0, dy: 10 }); pl.gesture('drag', { dx: 0, dy: 40 }); pl.gesture('drag', { dx: 0, dy: 80 }); pl.gesture('dragend', { dy: 80 });
    assert.deepEqual(part.names(), ['strike', 'bendStart', 'bend', 'duck', 'bassStart', 'bassAmount', 'bassEnd'], 'press down = bass');
    assert.equal(part.calls[2][1], 0, 'no upward bend while pressing'); }
  { const { part, pl } = mk(); pl.gesture('contact', on()); pl.gesture('dragstart', { x0: 100, y0: 150, x: 100, y: 140 });
    pl.gesture('drag', { dx: 0, dy: -45 }); pl.gesture('dragend', { dy: -90, fling: true });
    assert.deepEqual(part.names(), ['strike', 'bendStart', 'bend', 'bendEnd'], 'drag up = bend');
    assert.ok(Math.abs(part.calls[2][1] - 45 / (0.45 * GEO.h)) < 1e-9); assert.deepEqual(part.calls[3][1], { fling: true }); }
  { const { part, pl } = mk(); pl.gesture('contact', on()); time.advance(0.3); pl.gesture('dragstart', { x0: 100, y0: 150, x: 110, y: 150 });
    pl.gesture('dragend', { converted: true }); pl.gesture('strokestart', { x: 120, y: 150 }); pl.gesture('stroke', { x: 130, y: 150, vx: 500, speed: 500 }); pl.gesture('strokeend', {});
    assert.deepEqual(part.names(), ['strike', 'bendStart', 'bendEnd', 'phraseStart', 'phraseMove', 'phraseEnd'], 'a converted drag hands off into a phrase');
    assert.deepEqual(part.calls[2][1], { handoff: true }); assert.equal(part.calls[3][1].reuse, null, 'the contact note is too old to reuse'); }
  { const { part, pl } = mk(); pl.gesture('contact', on()); time.advance(0.05); pl.gesture('strokestart', { x: 120, y: 150 });
    assert.equal(part.calls[1][1].reuse, 1, 'a fresh contact note is the first phrase note'); }
  // button and key paths: no contact, each strikes its own note
  { const { part, pl } = mk(); pl.gesture('tap', { x: 100, y: 150, streak: 1 }); pl.gesture('doubletap', { x: 100, y: 150 });
    pl.gesture('holdstart', { x: 100, y: 150 }); pl.gesture('holdend', {});
    time.advance(0.1); pl.gesture('strokestart', { x: 90, y: 150 }); pl.gesture('strokeend', {});
    time.advance(0.1); pl.gesture('squeezestart', {}); pl.gesture('squeeze', { amount: 0.5 }); pl.gesture('squeezeend', {});
    time.advance(0.1); pl.gesture('dragstart', { x0: 100, y0: 110, x: 100, y: 110 }); pl.gesture('drag', { dx: 0, dy: -60 }); pl.gesture('dragend', { dy: -90 });
    assert.deepEqual(part.names(), ['strike', 'strike', 'chord', 'padStart', 'padEnd', 'phraseStart', 'phraseEnd', 'bassStart', 'bassAmount', 'bassEnd', 'strike', 'bendStart', 'bend', 'bendEnd']);
    assert.equal(part.calls[0][1].vel, 0.7, 'button notes are a little softer'); }
  // a hold that breaks into a drag does not strike again
  { const { part, pl } = mk(); pl.gesture('contact', on()); pl.gesture('holdstart', {}); pl.gesture('holdend', {}); pl.gesture('dragstart', { x0: 100, y0: 150, x: 100, y: 180 });
    pl.gesture('drag', { dy: 40 }); pl.gesture('dragend', { dy: 40 });
    assert.deepEqual(part.names(), ['strike', 'bloom', 'padEnd', 'bendStart', 'duck', 'bassStart', 'bassEnd']); assert.equal(part.calls[3][1], null); }
  // a second finger during a press: the bass carries on into the squeeze
  { const { part, pl } = mk(); pl.gesture('contact', on()); pl.gesture('dragstart', { x0: 100, y0: 150 }); pl.gesture('drag', { dy: 50 });
    pl.gesture('contact', on(50, 200)); pl.gesture('dragend', { dy: 50, cancelled: true }); pl.gesture('squeezestart', {}); pl.gesture('squeeze', { amount: 0.6 }); pl.gesture('squeezeend', {});
    assert.deepEqual(part.names(), ['strike', 'bendStart', 'duck', 'bassStart', 'bassAmount', 'bassEnd']); }
  // off-body contacts belong to the breath router; contacts mid-gesture strike nothing
  { const { part, pl } = mk(); pl.gesture('contact', { x: 5, y: 5, onBody: false }); assert.equal(pl.state, 'idle');
    pl.gesture('contact', on()); pl.gesture('contact', on()); assert.deepEqual(part.names(), ['strike']); }
  // watchdog: a pending pointer cancelled by the browser emits nothing; the stuck state ends
  { const { part, pl } = mk(); pl.gesture('contact', on()); assert.equal(pl.state, 'struck');
    assert.equal(pl.watchdog(time.now() + 0.3, false), false, 'not yet');
    assert.equal(pl.watchdog(time.now() + 0.7, true), false, 'still touching');
    assert.equal(pl.watchdog(time.now() + 0.7, false), true); assert.equal(pl.state, 'idle');
    pl.gesture('contact', on()); pl.gesture('holdstart', {}); assert.equal(pl.watchdog(time.now() + 5, false), true);
    assert.deepEqual(part.names(), ['strike', 'strike', 'bloom', 'padEnd'], 'a stuck hum is ended'); }
  // digit keys: degrees from the bottom of the tap window
  { const { part, pl } = mk(); pl.degree(1); pl.degree(7); pl.degree(9);
    assert.deepEqual(part.calls.map((c) => c[1].deg), [part.V.tapLo, part.V.tapLo + 6]); }
  assert.deepEqual(bodyPoint(GEO, 100, 300), { y01: 0, x01: 0 });
  assert.deepEqual(bodyPoint(GEO, 200, 100), { y01: 1, x01: 1 });
});

// ================================================================== U7 ==
test('U7 engine timing: touch notes at now(); phrase notes 2+ on the grid; ≥ 3 per auto stroke; resolve on a beat; roll of 3; bass on beats and bar lines', () => {
  for (const id of MALLOW_IDS) {
    for (const offset of [0, 0.13, 0.41]) {
      const R = rig({ lead: id });
      R.time.advance(offset);
      // immediate events carry exactly now(): no added delay
      R.players[0].gesture('contact', { x: 100, y: 150, onBody: true });
      const first = R.events.at(-1);
      assert.equal(first.t, R.time.now(), `${id}: the contact note is at now()`);
      assert.equal(first.immediate, true);
      R.players[0].gesture('tap', { x: 100, y: 150 });
      R.time.advance(2.5);
      const t0 = R.time.now(), from = R.events.length;
      autoStroke(R);
      R.time.advance(4);
      const ph = notesOf(R.events.slice(from), (e) => e.src === 'phrase');
      assert.ok(ph.length >= 3, `${id}: ${ph.length} phrase notes in a 1.2 s stroke`);
      assert.equal(ph[0].t, t0, `${id}: note 1 at once`);
      const V = R.parts[0].V;
      for (const e of ph.slice(1)) assert.ok(onSomeGrid(R.clock, e.t, V.swing), `${id}: ${e.t - t0} on the grid`);
      const res = ph.filter((e) => e.resolve);
      assert.equal(res.length, 1, `${id}: one resolve`);
      assert.ok(isGrid(R.clock, res[0].t, 1), `${id}: the resolve is on a beat`);
      assert.ok(chordAt(V, R.clock.barOf(res[0].t)).tones.includes(mod(res[0].semi, 12)), `${id}: the resolve is a chord tone`);
      const pe = R.events.find((e) => e.kind === 'phraseEnd');
      assert.ok(res[0].t > pe.t && res[0].t - pe.t <= R.clock.beatS + MIN_GAP + 1e-9, `${id}: on the next beat`);
    }
  }
  // the chord roll: the second tap's note opens into its chord on the next 16ths
  for (const id of MALLOW_IDS) {
    const R = rig({ lead: id }), pl = R.players[0];
    pl.gesture('contact', { x: 100, y: 200, onBody: true }); R.time.advance(0.04); pl.gesture('tap', { x: 100, y: 200 });
    R.time.advance(0.1);
    const from = R.events.length;
    pl.gesture('contact', { x: 100, y: 200, onBody: true }); R.time.advance(0.06); pl.gesture('doubletap', { x: 100, y: 200 });
    R.time.advance(1.5);
    const ns = notesOf(R.events.slice(from));
    // a 3-note chord (Zuzu's v chord has only two tones)
    if (id === 'zuzu') assert.ok(ns.length >= 2, `zuzu: ${ns.length} chord notes`);
    else assert.equal(ns.length, 3, `${id}: a 3-note chord`);
    for (const e of ns.slice(1)) { assert.equal(e.src, 'chord'); assert.ok(isGrid(R.clock, e.t, 4), `${id}: roll on 16ths`); assert.ok(e.t - ns[0].t >= MIN_GAP); }
    const pcs = new Set(ns.map((e) => mod(e.semi, 12)));
    assert.equal(pcs.size, ns.length, `${id}: distinct chord tones`);
    assert.ok(ns.every((e, i) => i === 0 || e.semi > ns[i - 1].semi), `${id}: rolled upward`);
  }
  // the bass throbs on beats and glides to the new root at bar lines
  for (const id of MALLOW_IDS) {
    const R = rig({ lead: id }), pl = R.players[0], V = R.parts[0].V;
    pl.gesture('squeezestart', {}); pl.gesture('squeeze', { amount: 0.5 });
    R.time.advance(R.clock.barS * 4.2);
    pl.gesture('squeezeend', {});
    R.time.advance(1);
    const beats = R.events.filter((e) => e.kind === 'bassBeat');
    assert.ok(beats.length >= V.meter * 4 - 1, `${id}: ${beats.length} throbs`);
    for (const b of beats) assert.ok(isGrid(R.clock, b.t, 1), `${id}: throb on a beat`);
    const on = R.events.find((e) => e.kind === 'bassOn');
    assert.ok(on.hz >= BASS_RANGE[0] && on.hz < BASS_RANGE[1], `${id}: bass ${on.hz} Hz`);
    const glides = R.events.filter((e) => e.kind === 'bassSet' && e.semi != null);
    assert.ok(glides.length >= 2, `${id}: the bass follows the loop`);
    for (const g of glides) {
      const bar = R.clock.barOf(g.t + 1e-6);
      assert.ok(Math.abs(R.clock.barTime(bar) - g.t) < 1e-7, `${id}: glide at a bar line`);
      assert.equal(g.semi, chordAt(V, bar).root, `${id}: the new root`);
      assert.equal(g.glide, 0.12);
    }
    assert.ok(R.events.some((e) => e.kind === 'bassOff'));
    assert.equal(R.scheduler.pending, 0);
  }
});

// ================================================================== U8 ==
test('U8 hold: a pad of ≥ 2 tones until padEnd; it voice-leads to the new chord at every bar line', () => {
  for (const id of MALLOW_IDS) {
    const R = rig({ lead: id }), pl = R.players[0], V = R.parts[0].V;
    R.time.advance(0.3);
    pl.gesture('contact', { x: 100, y: 180, onBody: true });
    R.time.advance(0.48);
    pl.gesture('holdstart', { x: 100, y: 180 });
    const on = R.events.find((e) => e.kind === 'padOn');
    assert.ok(on, `${id}: padOn`);
    assert.equal(on.from, notesOf(R.events)[0].id, `${id}: the contact note blooms`);
    assert.equal(Math.max(...on.semis), notesOf(R.events)[0].semi, `${id}: the note is on top`);
    assert.ok(new Set(on.semis.map((s) => mod(s, 12))).size >= 2 && on.hzs.length === 3);
    R.time.advance(R.clock.barS * 3.5);
    const sets = R.events.filter((e) => e.kind === 'padSet' && e.semis);
    assert.ok(sets.length >= 3, `${id}: ${sets.length} chord changes`);
    for (const s of sets) {
      const bar = R.clock.barOf(s.t + 1e-6);
      assert.ok(Math.abs(R.clock.barTime(bar) - s.t) < 1e-7, `${id}: at a bar line`);
      assert.equal(s.glide, 0.4);
      assert.ok(new Set(s.semis.map((x) => mod(x, 12))).size >= 2, `${id}: ≥ 2 tones`);
      for (const x of s.semis) assert.ok(chordAt(V, bar).tones.includes(mod(x, 12)), `${id}: ${x} in the bar's chord`);
    }
    assert.ok(R.events.some((e) => e.kind === 'padSet' && e.shimmer), `${id}: the shimmer joins after 4 s`);
    assert.ok(!R.events.some((e) => e.kind === 'padOff'), 'no release while held');
    pl.gesture('holdend', {});
    assert.equal(R.events.at(-1).kind, 'padOff');
    R.time.advance(2);
    assert.equal(R.scheduler.pending, 0);
  }
  // voicing helpers
  assert.deepEqual(voicePad(7, [0, 4, 7]), [0, 4, 7]);
  assert.deepEqual(voicePad(4, [0, 4, 7]), [-5, 0, 4]);
  assert.deepEqual(voicePad(7, [7, 2]), [-5, 2, 7]);
  const v = leadPad([0, 4, 7], [9, 0, 4]);
  assert.deepEqual(v, [0, 4, 9]);
});

// ================================================================== U9 ==
test('U9 breath clock: breath = 4 bars; 8 % per bar at bar lines; continuous beat; clamps; leading; monotonic grid; the level rises on the inhale', () => {
  const time = fakeTime(50);
  const make = (o = {}) => new BreathClock({ now: time.now, ...o });
  assert.equal(make({ meter: 4 }).bpm, 96);
  assert.equal(make({ meter: 3 }).bpm, 72);
  assert.ok(Math.abs(make({ meter: 4, inhale: 5, exhale: 7 }).bpm - 80) < 1e-9);
  assert.ok(Math.abs(make({ meter: 3, inhale: 5, exhale: 7 }).bpm - 60) < 1e-9);
  assert.ok(Math.abs(make({ meter: 4, inhale: 3.5, exhale: 5 }).bpm / 96 - 10 / 8.5) < 1e-9);
  assert.equal(make({ meter: 4 }).cycle, 10);
  // clamps: cycle 7–15 s, 48–120 bpm
  assert.equal(make({ meter: 4, inhale: 1, exhale: 1 }).target, 7);
  assert.equal(make({ meter: 4, inhale: 1, exhale: 1 }).bpm, 120);
  assert.equal(make({ meter: 3, inhale: 10, exhale: 12 }).target, 15);
  assert.equal(make({ meter: 3, inhale: 10, exhale: 12 }).bpm, 48);

  // a target change lands only at bar lines, ≤ 8 % per bar, with the beat continuous
  const c = make({ meter: 4 });
  time.advance(0.7);
  c.setTiming({ inhale: 3.5, exhale: 5 });
  const goal = 16 * 60 / 8.5;
  assert.equal(c.at(time.now()).bpm, 96, 'not mid-bar');
  let bpm = 96, bars = 0;
  for (let i = 0; i < 20; i++) {
    const tb = c.barTime(c.at(time.now()).bar + 1);
    const before = c.at(tb - 1e-6).beat;
    time.advance(tb - time.now() + 1e-4);
    const now = c.at(time.now());
    assert.ok(Math.abs(now.beat - before - (1e-4 + 1e-6) / (60 / now.bpm)) < 1e-6, 'the beat does not jump');
    assert.ok(now.bpm / bpm <= 1 + MAX_STEP + 1e-9, `≤ 8 %: ${bpm} → ${now.bpm}`);
    if (now.bpm !== bpm) bars++;
    bpm = now.bpm;
  }
  assert.ok(Math.abs(bpm - goal) < 1e-6, 'reaches the target');
  assert.equal(bars, 3, '96 → 103.7 → 112.0 → 112.9: three bar lines');
  assert.equal(c.cycle.toFixed(6), (8.5).toFixed(6));

  // leading: 3 s in + 5 s out → an 8 s target; it applies from the next bar line
  const L = make({ meter: 3 });
  time.advance(0.5);
  const t0 = time.now();
  L.lead('in', t0);
  assert.equal(L.leading, 'in');
  const lv = [0.5, 1.5, 2.5].map((dt) => { time.advance(t0 + dt - time.now()); return L.at(time.now()).level; });
  assert.ok(lv[0] < lv[1] && lv[1] < lv[2], `the visible breath follows the press in: ${lv}`);
  time.advance(t0 + 3 - time.now());
  const top = L.at(time.now()).level;
  L.lead('out', time.now());
  assert.equal(L.at(time.now()).level, top, 'no jump on letting go');
  time.advance(1);
  assert.ok(L.at(time.now()).level < top, 'and it falls');
  time.advance(t0 + 8 - time.now());
  L.lead('in', time.now());
  assert.equal(L.target, 8);
  L.lead('out', time.now() + 1);
  // the lead lets go after 10 s without a new press, then drifts back over two breaths
  time.advance(12);
  L.at(time.now());
  assert.equal(L.leading, null);
  assert.equal(L.target, 10);

  // nextGrid is monotonic and strictly after t
  const g = make({ meter: 3 });
  let last = -Infinity;
  for (let t = 50; t < 60; t += 0.0137) {
    for (const [div, swing] of [[1, 0.5], [2, 0.5], [2, 0.62], [4, 0.5]]) {
      const n = g.nextGrid(t, div, swing);
      assert.ok(n > t, 'strictly after');
      if (div === 2 && swing === 0.62) { assert.ok(n >= last); last = n; }
    }
  }
  // swing puts the off-beat late
  const s = make({ meter: 3 }), b0 = s.beatTime(0);
  assert.ok(Math.abs(s.nextGrid(b0 + 1e-6, 2, 0.62) - (b0 + 0.62 * s.beatS)) < 1e-9);

  // the clock's own breath rises over the inhale (bar 1, downbeat) and falls over the exhale
  const o = make({ meter: 4 }), start = o.beatTime(0);
  const at = (f) => o.at(start + f * o.cycle);
  assert.ok(at(0).level < 0.01 && at(0).phase === 'in');
  assert.ok(at(0.1).level < at(0.2).level && at(0.2).level < at(0.39).level);
  assert.ok(at(0.4).level > 0.99);
  assert.ok(at(0.6).level < at(0.4).level && at(0.6).phase === 'out');
  assert.ok(at(0.99).level < 0.01);
  const near = o.nearest(start + 0.03);
  assert.equal(near.beat, 0); assert.ok(near.downbeat && near.strong);
  assert.equal(o.nearest(start + 2 * o.beatS + 0.02).strong, true, '4/4: beat 3 is strong');
  assert.equal(o.nearest(start + o.beatS).strong, false);
});

// ================================================================= U10 ==
test('U10 duet: harmonies within 400 ms; two hums bloom into ≥ 3 pitch classes; friend register; answers; together', () => {
  let thirds = 0, pairs = 0;
  for (const [lead, friend] of PAIRS) {
    // the friend's register stays within half an octave of its own root
    const V = voiceFor(friend, lead);
    assert.ok(Math.abs(Math.log2(V.rootHz / VOICES[friend].root)) <= 0.5 + 1e-9, `${friend} with ${lead}`);
    assert.deepEqual(V.scale, VOICES[lead].scale);
    assert.equal(V.meter, MUSIC[lead].meter);
    assert.deepEqual(V.tapLo, MUSIC[friend].tap[0]);

    for (const gap of [0.1, 0.25, 0.39]) {
      const R = rig({ lead, friend });
      R.time.advance(0.2 + gap);
      R.players[0].gesture('contact', { x: 100, y: 120 + gap * 200, onBody: true });
      R.time.advance(gap);
      R.players[1].gesture('contact', { x: 100, y: 250 - gap * 200, onBody: true });
      const [a, b] = notesOf(R.events);
      const h = R.events.find((e) => e.kind === 'harmony');
      assert.ok(h, `${lead}+${friend}: harmony`);
      assert.equal(h.interval, ic(a.semi, b.semi));
      assert.ok([0, 3, 4, 5].includes(h.interval), `${lead}+${friend}: ic ${h.interval}`);
      pairs++;
      if (h.interval === 3 || h.interval === 4) thirds++;
    }
    // beyond 400 ms the friend plays its own note
    { const R = rig({ lead, friend }); R.players[0].gesture('contact', { x: 100, y: 150, onBody: true }); R.time.advance(0.5);
      R.players[1].gesture('contact', { x: 100, y: 150, onBody: true }); assert.ok(!R.events.some((e) => e.kind === 'harmony')); }

    // two hums: one chord of ≥ 3 pitch classes, at every bar of the loop
    const R = rig({ lead, friend });
    R.players[0].gesture('holdstart', { x: 100, y: 160 });
    R.time.advance(0.2);
    R.players[1].gesture('holdstart', { x: 100, y: 200 });
    assert.ok(R.events.some((e) => e.kind === 'bloom' && e.on), `${lead}+${friend}: bloom`);
    const cur = [null, null], seen = [];
    for (let k = 0; k < 9; k++) {
      R.time.advance(R.clock.barS / 2);
      for (const e of R.events) if ((e.kind === 'padOn' || e.kind === 'padSet') && e.semis) cur[e.slot] = e.semis;
      seen.push(new Set([...cur[0], ...cur[1]].map((s) => mod(s, 12))).size);
    }
    assert.ok(seen.every((n) => n >= 3), `${lead}+${friend}: pitch classes per half bar ${seen}`);
    R.players[1].gesture('holdend', {});
    assert.ok(R.events.some((e) => e.kind === 'bloom' && !e.on));
    assert.deepEqual(clashes(R.events), []);
  }
  // mostly 3rds and 6ths: only the 2nd of a major pentatonic (the 4th of a minor one, Zuzu's 2) has no
  // third in the scale, and there the friend takes the 5th
  assert.ok(thirds / pairs > 0.65, `mostly 3rds and 6ths: ${thirds}/${pairs}`);
  for (const id of MALLOW_IDS) {
    const V = voiceFor(id);
    for (const s of V.scale) {
      const third = V.scale.some((x) => [3, 4].includes(ic(x, s)));
      assert.equal([3, 4].includes(ic(harmonise(s, V), s)), third, `${id}: ${s} → a third whenever the scale has one`);
    }
  }

  // two basses: a 5th or an octave apart
  for (const [lead, friend] of PAIRS) {
    const R = rig({ lead, friend });
    R.players[0].gesture('squeezestart', {}); R.players[1].gesture('squeezestart', {});
    const [a, b] = R.events.filter((e) => e.kind === 'bassOn');
    const i = ic(a.semi, b.semi);
    assert.ok(i === 5 || i === 0, `${lead}+${friend}: basses a 5th or an octave apart (ic ${i})`);
    if (i === 0) assert.ok(Math.abs(Math.log2(b.hz / a.hz)) > 0.9, `${lead}+${friend}: an octave, not a unison`);
    R.time.advance(R.clock.barS * 4.5);
    assert.deepEqual(clashes(R.events), []);
  }

  // answers: the idle friend replays the phrase a third up, on a beat ≥ 250 ms later, at most once per 2 bars
  for (const [lead, friend] of [['boppo', 'loomi'], ['zuzu', 'pipzi'], ['glitzi', 'noomi'], ['noomi', 'blubi']]) {
    const R = rig({ lead, friend });
    R.time.advance(0.3);
    autoStroke(R, 0);
    const pe = R.events.find((e) => e.kind === 'phraseEnd');
    R.time.advance(R.clock.barS * 3);
    const ans = notesOf(R.events, (e) => e.src === 'answer');
    assert.ok(ans.length >= 2 && ans.length <= 4, `${lead}+${friend}: ${ans.length} answer notes`);
    assert.ok(ans.every((e) => e.slot === 1));
    const resolve = notesOf(R.events, (e) => e.resolve)[0];
    assert.ok(isGrid(R.clock, ans[0].t, 1), 'the answer starts on a beat');
    assert.ok(ans[0].t - pe.t >= 0.25 && ans[0].t - resolve.t >= 0.25 - 1e-9, 'at least 250 ms after the call');
    // a second call whose answer would start within 2 bars of the first gets none
    const n0 = ans.length;
    const S = rig({ lead, friend });
    S.time.advance(0.3);
    autoStroke(S, 0);
    const first = () => notesOf(S.events, (e) => e.src === 'answer');
    while (!first().length) S.time.advance(0.05);
    S.time.advance(S.clock.beatS * 1.5);   // the answer has played
    const pl = S.players[0];
    pl.gesture('strokestart', { x: 40, y: 160 });
    for (let k = 1; k <= 10; k++) { S.time.advance(0.03); pl.gesture('stroke', { x: 40 + 12 * k, y: 160, vx: 400, vy: 0, speed: 400 }); }
    pl.gesture('strokeend', {});
    S.time.advance(S.clock.barS * 3);
    const all = first();
    assert.ok(all.every((e) => e.t - all[0].t < 2 * S.clock.barS), `${lead}+${friend}: at most one answer per 2 bars`);
    assert.ok(n0 >= 2);
    // any strike cancels a pending answer
    const Q = rig({ lead, friend });
    Q.time.advance(0.3);
    autoStroke(Q, 0);
    Q.time.advance(0.05);
    Q.players[0].gesture('tap', { x: 100, y: 150 });
    Q.time.advance(Q.clock.barS * 3);
    assert.equal(notesOf(Q.events, (e) => e.src === 'answer').length, 0, `${lead}+${friend}: cancelled by a strike`);
    // answers can be switched off
    const O = rig({ lead, friend });
    O.engine.setAnswers(false);
    autoStroke(O, 0);
    O.time.advance(O.clock.barS * 3);
    assert.equal(notesOf(O.events, (e) => e.src === 'answer').length, 0);
  }

  // together(): lead + friend at once, consonant
  for (const [lead, friend] of PAIRS) {
    const R = rig({ lead, friend });
    R.time.advance(0.5);
    const [ia, ib] = R.engine.together();
    assert.ok(ia != null && ib != null);
    const [a, b] = notesOf(R.events);
    assert.equal(a.t, b.t);
    assert.ok(![1, 2, 6].includes(ic(a.semi, b.semi)), `${lead}+${friend}: together ic ${ic(a.semi, b.semi)}`);
    assert.ok(R.events.some((e) => e.kind === 'harmony'));
  }
  // harmonise() never answers with ic 1, 2 or 6
  for (const [lead, friend] of PAIRS) {
    const V = voiceFor(friend, lead);
    for (let s = -12; s <= 24; s++) if (V.scale.includes(mod(s, 12))) assert.ok(![1, 2, 6].includes(ic(harmonise(s, V), s)));
  }
});

// ================================================================= U11 ==
test('U11 scheduler: time order, look-ahead, stops when empty, drops late events, cancels by tag', () => {
  const time = fakeTime(10);
  const s = new Scheduler({ now: time.now, setTimer: time.setTimer, clearTimer: time.clearTimer });
  const fired = [];
  s.at(10.5, (t) => fired.push(['c', t, time.now()]), 'x');
  s.at(10.2, (t) => fired.push(['a', t, time.now()]));
  s.at(10.3, (t) => fired.push(['b', t, time.now()]), 'x');
  assert.equal(s.running, true);
  assert.equal(s.pending, 3);
  time.advance(0.05);
  assert.equal(fired.length, 0, 'nothing yet');
  time.advance(0.05);
  assert.deepEqual(fired.map((f) => f[0]), ['a'], 'fires up to 120 ms early');
  assert.ok(fired[0][2] >= 10.2 - 0.12 - 1e-9 && fired[0][2] <= 10.2);
  assert.equal(fired[0][1], 10.2, 'with its exact time');
  s.cancel('x');
  time.advance(1);
  assert.deepEqual(fired.map((f) => f[0]), ['a'], 'cancelled by tag');
  assert.equal(s.running, false);
  assert.equal(time.timers, 0, 'no timers once empty');
  // order, including events scheduled from inside a callback
  for (const t of [11.4, 11.2, 11.3]) s.at(t, (x) => { fired.push(['o', x]); if (x === 11.2) s.at(11.25, (y) => fired.push(['in', y])); });
  time.advance(1);
  assert.deepEqual(fired.slice(1).map((f) => f[1]), [11.2, 11.25, 11.3, 11.4]);
  assert.equal(time.timers, 0);
  // late: the main thread was blocked; an event > 50 ms late is dropped (its drop callback runs), never played late
  const dropped = [];
  const base = time.now();
  s.at(base + 0.4, () => fired.push(['late']), null, (t) => dropped.push(t));
  s.at(base + 0.65, () => fired.push(['ok']));
  time.jump(0.69);   // the timer due at once could only run now: 290 ms and 40 ms late
  time.advance(0);
  assert.ok(!fired.some((f) => f[0] === 'late'), 'dropped');
  assert.deepEqual(dropped, [base + 0.4]);
  assert.ok(fired.some((f) => f[0] === 'ok'), 'an event 0–50 ms late still plays');
  assert.equal(s.dropped, 1);
  // cancel by id, clear, stop
  const id = s.at(20, () => fired.push(['never']));
  s.cancel(id);
  s.at(21, () => fired.push(['never']));
  s.clear();
  time.advance(15);
  assert.ok(!fired.some((f) => f[0] === 'never'));
  assert.equal(time.timers, 0);
});

// ================================================================= U12 ==
test('U12 take: segments after a gap, caps, best(), replay keeps order and degrees on the grid, soft quantise, motif codec', () => {
  const tk = new Take({ gapS: 6 });
  tk.barS = 2;
  for (let i = 0; i < 4; i++) tk.add({ beat: i, slot: 0, kind: 'n', deg: i, vel: 0.7 }, i * 0.5);
  assert.equal(tk.length, 4);
  tk.add({ beat: 20, slot: 0, kind: 'n', deg: 9, vel: 0.7 }, 1.5 + 4.1);   // > min(2 bars = 4 s, 6 s)
  assert.equal(tk.length, 1, 'a new take after the gap');
  assert.deepEqual(tk.best().map((e) => e.deg), [0, 1, 2, 3], 'the previous take while the new one is short');
  assert.equal(tk.best()[0].beat, 0, 'beats from 0');
  tk.add({ beat: 21, slot: 1, kind: 'b', deg: 0, len: 2 }, 6);
  tk.add({ beat: 22, slot: 0, kind: 'h', deg: 4, len: 3 }, 6.5);
  assert.deepEqual(tk.best().map((e) => e.kind), ['n', 'b', 'h'], 'the current take once it has 3');
  const big = new Take();
  for (let i = 0; i < 60; i++) big.add({ beat: i * 0.5, kind: 'n', deg: 1 }, i * 0.2);
  assert.equal(big.length, 48, 'at most 48 events');
  const wide = new Take({ gapS: 100 });
  wide.barS = 100;
  for (let i = 0; i < 40; i++) wide.add({ beat: i * 3, kind: 'n', deg: 1 }, i);
  const b = wide.best();
  assert.ok(b.at(-1).beat <= 63.75, `at most 64 beats: ${b.at(-1).beat}`);
  assert.equal(softQuantise(1.1, 2), 1.1 + (1 - 1.1) * 0.75);
  assert.equal(softQuantise(1.1, 2, 0), 1.1);
  assert.equal(softQuantise(0.3, 4, 1), 0.25);

  // play, replay: same order and degrees, on the soft-quantised grid, not recorded again
  for (const id of ['boppo', 'loomi', 'glitzi']) {
    const R = rig({ lead: id }), pl = R.players[0];
    for (const n of [1, 3, 5, 2, 4]) { pl.degree(n); R.time.advance(0.37); }
    pl.gesture('squeezestart', {}); R.time.advance(1.3); pl.gesture('squeezeend', {});
    R.time.advance(0.4);
    const best = R.engine.take.best();
    assert.equal(best.length, 6);
    assert.deepEqual(best.map((e) => e.kind), ['n', 'n', 'n', 'n', 'n', 'b']);
    const takeLen = R.engine.take.length;
    const from = R.events.length;
    R.time.advance(0.11);
    R.engine.replay(best);
    assert.equal(R.engine.replaying, true);
    R.time.advance(R.clock.barS * 6);
    assert.equal(R.engine.replaying, false);
    const evs = R.events.slice(from);
    const rp = notesOf(evs, (e) => e.src === 'replay');
    assert.deepEqual(rp.map((e) => e.deg), best.filter((e) => e.kind === 'n').map((e) => e.deg), `${id}: same degrees in order`);
    const on = evs.find((e) => e.kind === 'replay' && e.on);
    const sb = Math.round(R.clock.at(R.clock.nextGrid(on.t, 1)).beat);
    rp.forEach((e, i) => assert.ok(Math.abs(e.t - R.clock.beatTime(sb + softQuantise(best[i].beat, R.parts[0].V.grid, 0.75))) < 1e-7, `${id}: on time`));
    assert.ok(evs.some((e) => e.kind === 'bassOn'), 'the bass is replayed');
    assert.ok(evs.some((e) => e.kind === 'replay' && !e.on && e.done), 'replay finished');
    assert.equal(R.engine.take.length, 0, 'replay notes are not recorded (a new take starts)');
    assert.ok(takeLen >= 6);
    // stop() ends it at once
    const h = R.engine.replay(best);
    R.time.advance(R.clock.beatS * 2);
    h.stop();
    assert.equal(R.engine.replaying, false);
    assert.ok(R.events.at(-1).kind === 'replay' && R.events.at(-1).stopped);
    const n = R.events.length;
    R.time.advance(5);
    assert.ok(!notesOf(R.events.slice(n), (e) => e.src === 'replay').length, 'nothing after stop');
  }

  // codec
  const evs = [
    { beat: 0, slot: 0, kind: 'n', deg: -7, vel: 0.99 }, { beat: 0.25, slot: 1, kind: 'n', deg: 14, vel: 0.11 },
    { beat: 3.5, slot: 0, kind: 'b', deg: 0, len: 4 }, { beat: 63.75, slot: 1, kind: 'h', deg: 2, len: 9 },
  ];
  const m = encodeMotif(evs);
  assert.match(m, HUSHBEAT_MOTIF_RE);
  assert.equal(m.length, 20);
  const back = decodeMotif(m);
  assert.deepEqual(back.map((e) => [e.beat, e.slot, e.kind, e.deg]), evs.map((e) => [e.beat, e.slot, e.kind, e.deg]));
  assert.deepEqual(back.map((e) => (e.kind === 'n' ? Math.round(e.vel / 0.11) : e.len)), [9, 1, 4, 9]);
  assert.equal(encodeMotif(back), m, 'round trip');
  const many = Array.from({ length: 60 }, (_, i) => ({ beat: i, kind: 'n', deg: i % 10, vel: 0.5 }));
  assert.match(encodeMotif(many), HUSHBEAT_MOTIF_RE, 'capped at 48 tokens and 255 steps');
  for (const junk of ['', 'junk', 'zzzzz', '00x01', '00n0', '00n00', 'w0n01', '00nm1', '00n01'.repeat(49), null, 42, {}]) assert.equal(decodeMotif(junk), null, `junk: ${junk}`);
  assert.equal(encodeMotif([]), '');
  // a real take encodes into a valid motif
  const R = rig({ lead: 'pipzi' });
  simulate(R, { n: 40, seed: 9 });
  assert.match(encodeMotif(R.engine.take.best()), HUSHBEAT_MOTIF_RE);
});

// ================================================================= U13 ==
test('U13 Comfort DNA keeps tunes: cleaned, stable key, round trip, capped at 6 without evicting others, suggested, nothing while off', async () => {
  const R = rig({ lead: 'boppo', friend: 'loomi' });
  simulate(R, { n: 30, seed: 4 });
  const motif = encodeMotif(R.engine.take.best());
  assert.match(motif, HUSHBEAT_MOTIF_RE);
  const dna = new ComfortDNA(new MemoryComfortStore());
  await dna.load();
  dna.toggleFavourite({ kind: 'pocket', id: 'soft-breath' });
  const item = { kind: 'hushbeat', mallow: 'boppo', friend: 'loomi', pace: 'natural', motif };
  assert.equal(dna.toggleFavourite(item), true);
  const kept = dna.favourites()[0];
  assert.deepEqual(kept, { kind: 'hushbeat', id: 'hushbeat', mallow: 'boppo', friend: 'loomi', pace: 'natural', motif });
  assert.equal(itemKey(kept), itemKey(item));
  assert.equal(dna.isFavourite(item), true);
  const n = motif.match(/.{5}/g).filter((t) => t[2] === 'n' || t[2] === 'N').length;
  assert.equal(describeTune(kept), `Boppo & Loomi tune · ${n} note${n === 1 ? '' : 's'} · Natural`);
  // a bad friend and a bad motif are dropped, the combination kept
  dna.toggleFavourite({ kind: 'hushbeat', mallow: 'pipzi', friend: 'pipzi', pace: 'warp', motif: 'not a motif' });
  assert.deepEqual(dna.favourites()[0], { kind: 'hushbeat', id: 'hushbeat', mallow: 'pipzi', pace: 'natural' });
  assert.equal(describeTune(dna.favourites()[0]), 'Pipzi tune · Natural');
  // sanitize round-trips
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(dna.data))), dna.data);
  // 7 keeps: at most 6 tunes, the Pocket favourite stays
  for (let i = 0; i < 7; i++) dna.toggleFavourite({ kind: 'hushbeat', mallow: MALLOW_IDS[i], pace: 'livelier', motif: encodeMotif([{ beat: 0, kind: 'n', deg: i, vel: 0.5 }]) });
  const favs = dna.favourites();
  assert.equal(favs.filter((f) => f.kind === 'hushbeat').length, 6);
  assert.ok(favs.some((f) => f.kind === 'pocket' && f.id === 'soft-breath'), 'never evicts a Pocket favourite');
  assert.ok(dna.suggestions(12).some((s) => s.kind === 'hushbeat' && s.reason === 'favourite'));
  // personalisation off: nothing offered
  dna.setEnabled(false);
  assert.deepEqual(dna.favourites(), []);
  assert.deepEqual(dna.suggestions(), []);
});

// ================================================================= U14 ==
test('U14 visual-only and audible runs make the identical music (sink null, ready, or not ready)', () => {
  const strip = (evs) => JSON.stringify(evs.map(({ heard, audioT, ctxNow, ...e }) => e));
  const ready = { ready: true, event(ev) { ev.heard = true; ev.audioT = 1; ev.ctxNow = 0.5; return true; } };
  const notReady = { ready: false, event() { return false; } };
  for (const [lead, friend] of [['boppo', null], ['zuzu', 'pipzi'], ['noomi', 'glitzi']]) {
    const runs = [null, ready, notReady].map((sink) => {
      const R = rig({ lead, friend, sink, seed: 7 });
      simulate(R, { n: 300, seed: 21 });
      return strip(R.events);
    });
    assert.ok(runs[0].length > 1000);
    assert.equal(runs[1], runs[0], `${lead}: a ready sink changes nothing`);
    assert.equal(runs[2], runs[0], `${lead}: a locked sink changes nothing`);
  }
  // first touch on a phone: the contact note was unheard (audio locked); the tap after unlock re-strikes it
  const sink = { ready: false, event() { return this.ready; } };
  const R = rig({ lead: 'blubi', sink });
  R.players[0].gesture('contact', { x: 100, y: 150, onBody: true });
  sink.ready = true;
  R.time.advance(0.08);
  R.players[0].gesture('tap', { x: 100, y: 150 });
  const ns = notesOf(R.events);
  assert.equal(ns.length, 2);
  assert.equal(ns[1].restrike, true);
  assert.equal(ns[1].id, ns[0].id, 'the same note, heard now');
  assert.equal(ns[1].t, R.time.now());
  // a heard note is never re-struck
  R.time.advance(0.3);
  R.players[0].gesture('contact', { x: 100, y: 150, onBody: true }); R.time.advance(0.08); R.players[0].gesture('tap', { x: 100, y: 150 });
  assert.equal(notesOf(R.events).length, 3);
  assert.ok(!notesOf(R.events)[2].restrike);
  // a hold started while locked stays silent: nothing is re-sent when it is released after unlock (no stale burst)
  const s2 = { ready: false, event() { return this.ready; } };
  const Q = rig({ lead: 'noomi', sink: s2 });
  Q.players[0].gesture('contact', { x: 100, y: 150, onBody: true });
  Q.time.advance(0.48); Q.players[0].gesture('holdstart', { x: 100, y: 150 });
  Q.time.advance(1); s2.ready = true; Q.players[0].gesture('holdend', {});
  Q.time.advance(3);
  assert.equal(notesOf(Q.events).length, 1, 'only the (unheard) contact note');
  assert.equal(Q.events.filter((e) => e.kind === 'padOn').length, 1);
});

// ======================================================= engine cleanup ==
test('releaseAll and dispose end every layer, phrase, queued note and timer', () => {
  const R = rig({ lead: 'pipzi', friend: 'zuzu' });
  R.players[0].gesture('holdstart', { x: 100, y: 150 });
  R.players[1].gesture('squeezestart', {});
  R.players[1].gesture('squeeze', { amount: 0.7 });
  R.time.advance(0.6);
  assert.equal(R.engine.holding, true, 'a hum and a bass are held');
  R.players[0].gesture('strokestart', { x: 50, y: 150 });
  R.engine.replay([{ beat: 0, slot: 0, kind: 'n', deg: 1, vel: 0.6 }, { beat: 1, slot: 0, kind: 'n', deg: 2, vel: 0.6 }, { beat: 2, slot: 1, kind: 'n', deg: 3, vel: 0.6 }]);
  assert.ok(R.scheduler.pending > 0);
  // a phrase note decided inside the look-ahead (120 ms) but not yet sounding never starts
  R.players[0].gesture('stroke', { x: 60, y: 150, vx: 500, speed: 500 });
  while (!notesOf(R.events).some((e) => e.t > R.time.now())) { R.time.advance(0.01); R.players[0].gesture('stroke', { x: 60, y: 150, vx: 500, speed: 500 }); }
  const ahead = notesOf(R.events).filter((e) => e.t > R.time.now());
  R.engine.releaseAll();
  R.players.forEach((p) => p.reset());
  for (const e of ahead) assert.ok(R.events.some((x) => x.kind === 'noteOff' && x.id === e.id), 'a queued note is called off');
  const kinds = R.events.map((e) => e.kind);
  assert.ok(kinds.includes('padOff') && kinds.includes('bassOff'));
  assert.ok(R.events.some((e) => e.kind === 'replay' && e.stopped));
  for (const p of R.parts) {
    const { bass, pad, phrase, bending } = p.state;
    assert.deepEqual({ bass, pad, phrase, bending }, { bass: 0, pad: 0, phrase: false, bending: false });
  }
  assert.deepEqual(R.players.map((p) => p.state), ['idle', 'idle']);
  assert.equal(R.engine.holding, false);
  assert.equal(R.scheduler.pending, 0);
  assert.equal(R.time.timers, 0);
  const n = R.events.length;
  R.time.advance(5);
  assert.equal(R.events.length, n, 'nothing plays afterwards');
  // removing the friend fades its layers; dispose clears everything
  R.players[1].gesture('holdstart', {});
  R.engine.removePart(1);
  assert.equal(R.events.at(-1).kind, 'padOff');
  assert.equal(R.events.at(-1).fade, 0.6);
  R.players[0].gesture('squeezestart', {});
  R.engine.dispose();
  assert.equal(R.scheduler.pending, 0);
  assert.equal(R.time.timers, 0);
});

// ================================================================= U15 ==
// The kits on a bare FakeAudioContext: what each voice schedules, read back from the recorded automation.
const gains = (ac) => ac.nodes.filter((n) => n.kind === 'gain' && n.gain.events.length);
const oscs = (ac) => ac.nodes.filter((n) => n.kind === 'oscillator');
const near = (a, b, tol = 0.003) => Math.abs(a / b - 1) < tol;
// the summed level of every pluck (gains with a linear attack) at time t
const pluckSum = (ac, t) => gains(ac).filter((n) => n.gain.events.some((e) => e.type === 'linear') && [...n.outputs].every((o) => o.kind)).reduce((s, n) => s + n.gain.valueAt(t), 0);   // not LFO depths

test('U15a kits: every note lands on its pitch, starts and ends at zero within its peak; bass, hum and bend voices follow the engine units', () => {
  for (const id of MALLOW_IDS) {
    for (const q of ['high', 'low']) {
      setTier(q);
      // a struck note
      let ac = new FakeAudioContext();
      warmNoise(ac);
      let g = graph(ac, ac.destination);
      const f = 523.25, vel = 0.8, budget = MUSIC[id].peak * vel;
      const end = KITS[id].note(g, 0.1, f, vel, { dur: 0.9 });
      assert.ok(end > 0.15 && end <= 0.1 + 0.9 + 1e-9, `${id} ${q}: the note ends inside its dur (${end})`);
      for (const s of g.srcs) { assert.ok(s.startAt >= 0.1 - 1e-9, `${id}: no source before the note`); assert.ok(s.stopAt <= end + 0.02, `${id}: every source stops with the note`); }
      let mx = 0;
      for (let t = 0.1; t <= end + 0.01; t += 0.001) mx = Math.max(mx, pluckSum(ac, t));
      assert.ok(mx <= budget * 1.001 && mx > budget * 0.5, `${id} ${q}: summed peak ${mx.toFixed(4)} vs ${budget.toFixed(4)}`);
      assert.equal(pluckSum(ac, 0.1), 0, `${id}: starts at zero (no click)`);
      assert.ok(pluckSum(ac, end) < 1e-9, `${id}: ends at zero (no click)`);
      assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(0.25), f)), `${id}: lands on ${f} Hz`);
      if (id === 'glitzi') assert.equal(ac.count('waveShaper') > 0, q === 'high', 'the bit-crush follows the tier');
      // a phrase note glides from the previous one onto its own pitch (the Mallows whose phrases glide; bells strike)
      if (MUSIC[id].phrase.glide) {
      ac = new FakeAudioContext(); g = graph(ac, ac.destination);
      KITS[id].note(g, 0.1, f, vel, { dur: 0.9, glideFrom: f * 0.8, glide: 0.06 });
      assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(0.1), f * 0.8, 0.01) || near(o.frequency.valueAt(0.1), f * 1.6, 0.01)), `${id}: the glide starts at the previous note`);
      assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(0.3), f)), `${id}: and lands on its own`);
      }
      // the shimmer note
      ac = new FakeAudioContext(); warmNoise(ac); g = graph(ac, ac.destination);
      const se = KITS[id].shimmer(g, 0.1, f, 0.35, { dur: 1, glide: 0.3 });
      assert.ok(se > 0.1 && g.srcs.every((s) => s.stopAt <= se + 0.3), `${id}: the shimmer ends`);
      assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(0.6), f, 0.01)), `${id}: the shimmer lands on its pitch`);
    }
    setTier('high');
    // a bent note: follows the finger, snaps, lets go; a duck drops it 9 dB, then away
    let ac = new FakeAudioContext(), g = graph(ac, ac.destination);
    let h = KITS[id].held(g, 0.1, 440, 0.8);
    h.set(440 * 1.12, 0.3, 0.03);
    assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(0.45), 440 * 1.12)), `${id}: the bend follows`);
    const he = h.release(0.5, 0.05, 0.9);
    assert.ok(Math.abs(he - 0.9) < 1e-9 && g.srcs.every((s) => s.stopAt <= 0.9 + 1e-9));
    ac = new FakeAudioContext(); g = graph(ac, ac.destination);
    h = KITS[id].held(g, 0.1, 440, 0.8);
    const amp = [...ac.destination.inputs][0];
    const lvl = amp.gain.valueAt(0.3);
    h.duck(0.3);
    assert.ok(near(amp.gain.valueAt(0.36) / lvl, 0.35 + 0.65 * Math.exp(-3), 0.05), `${id}: −9 dB in 60 ms`);
    assert.ok(amp.gain.valueAt(0.9) < lvl * 0.02, `${id}: then it lets go`);
    // the bass: its level and harmonic layer, a throb, and quiet 0.3 s after letting go (BASS_TAIL)
    ac = new FakeAudioContext(); warmNoise(ac); g = graph(ac, ac.destination);
    const bf = 73.42, b = KITS[id].bass(g, 0.1, bf, 0.5), out = [...ac.destination.inputs][0];
    const level = LAYER_PEAK.bass * (0.35 + 0.65 * 0.5);
    assert.ok(out.gain.valueAt(0.25) > level * 0.95 && out.gain.valueAt(0.25) <= level * 1.26, `${id}: bass level ${out.gain.valueAt(0.25)}`);
    assert.ok(out.gain.valueAt(0.14) > level * 0.9, `${id}: a 40 ms attack`);
    for (const k of [1, 2, 3]) assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(0.5), bf * k)), `${id}: harmonic ${k} (heard on a phone)`);
    b.set(bf * 1.5, 1, 0.6, 0.12);
    assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(0.8), bf * 1.5)), `${id}: glides to the new root`);
    b.beat(1.0, 1);
    const throb = gains(ac).find((n) => n.gain.events.some((e) => e.type === 'target' && e.v > 1.1));
    assert.ok(throb && throb.gain.valueAt(1.04) > 1.1 && throb.gain.valueAt(1.6) < 1.01, `${id}: a soft throb on the beat`);
    const lv = out.gain.valueAt(1.6), be = b.release(1.6, null, { step: 0.5 });
    assert.ok(out.gain.valueAt(1.9) < lv * 0.05, `${id}: quiet 0.3 s after letting go`);
    assert.ok(g.srcs.every((s) => s.stopAt <= be + 1e-9) && be < 2.4, `${id}: the bass ends`);
    // the hum: a ≥ 300 ms attack to LAYER_PEAK.pad × level, voice-leads, quiet a second after letting go (PAD_TAIL)
    ac = new FakeAudioContext(); warmNoise(ac); g = graph(ac, ac.destination);
    const fs = [261.63, 329.63, 392], p = KITS[id].pad(g, 0.1, fs, 0.8, 0.5), pa = [...ac.destination.inputs][0], target = LAYER_PEAK.pad * 0.8;
    assert.ok(pa.gain.valueAt(0.4) < target * 0.75, `${id}: the hum swells in (≥ 300 ms)`);
    assert.ok(pa.gain.valueAt(1.6) > target * 0.95 && pa.gain.valueAt(1.6) <= target * 1.0001, `${id}: to its level`);
    p.set([293.66, 349.23, 440], null, 2, 0.4);
    for (const x of [293.66, 349.23, 440]) assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(2.6), x)), `${id}: the hum moves to ${x}`);
    p.shimmer(3);
    if (id === 'boppo') assert.ok(oscs(ac).some((o) => near(o.frequency.valueAt(3.5), 880)), 'Boppo: an octave joins the hum');
    const pe = p.release(4);
    assert.ok(pa.gain.valueAt(5) < target * 0.04, `${id}: quiet a second after letting go`);
    assert.ok(pe <= 4 + 2.2 + 0.06 && g.srcs.every((s) => s.stopAt <= pe + 1e-9), `${id}: the hum ends`);
  }
  // tiers: fewer bell partials and pad oscillators on the low tier
  const count = (q, fn) => { setTier(q); const ac = new FakeAudioContext(); fn(graph(ac, ac.destination)); return oscs(ac).length; };
  assert.ok(count('low', (g) => KITS.pipzi.note(g, 0, 784, 0.8, { dur: 1 })) < count('high', (g) => KITS.pipzi.note(g, 0, 784, 0.8, { dur: 1 })));
  assert.equal(count('low', (g) => KITS.loomi.pad(g, 0, [196, 247, 294], 0.8, 0.5)), 3);
  assert.equal(count('high', (g) => KITS.loomi.pad(g, 0, [196, 247, 294], 0.8, 0.5)), 6);
  assert.equal(currentTier(), TIERS.high);
});

// The renderer behind a real SoundEngine on the fake context; musical time and audio time advance together.
function audioRig({ lead = 'boppo', friend = null, quality = 'high', seed = 7 } = {}) {
  const restore = installAudioGlobals();
  const sound = new SoundEngine();
  sound.unlock();
  const ac = sound.ctx;
  let T = 100, ids = 0;
  const timers = new Map();
  const setTimer = (fn, ms) => { const id = ++ids; timers.set(id, { at: T + Math.max(0, ms) / 1000, fn }); return id; };
  const clearTimer = (id) => { timers.delete(id); };
  const now = () => T;
  const stats = { maxLive: 0, maxVoices: 0 };
  const sample = () => { stats.maxLive = Math.max(stats.maxLive, sound.live.size); stats.maxVoices = Math.max(stats.maxVoices, audio.voices); };
  const advance = (s) => {
    const end = T + s;
    for (;;) {
      let next = null, nid = 0;
      for (const [id, x] of timers) if (x.at <= end + 1e-12 && (!next || x.at < next.at || (x.at === next.at && id < nid))) { next = x; nid = id; }
      if (!next) break;
      timers.delete(nid);
      if (next.at > T) { ac.advance(next.at - T); T = next.at; }
      next.fn();
      sample();
    }
    if (end > T) { ac.advance(end - T); T = end; }
  };
  const audio = new MusicAudio(sound, { quality, now, setTimer, clearTimer });
  const voices = [];   // every SoundEngine voice made while this rig runs
  const mk = sound._voice.bind(sound);
  // routed at birth (an ended voice is disconnected): voice → musicBus → sound.bus
  sound._voice = (...a) => { const v = mk(...a); v.routed = reaches(v.out, audio.bus) && reaches(audio.bus, sound.bus) && !reaches(v.out, ac.destination, new Set([sound.master])); voices.push(v); return v; };
  const clock = new BreathClock({ now });
  const scheduler = new Scheduler({ now, setTimer, clearTimer });
  const events = [];
  const engine = new MusicEngine({ clock, scheduler, now, sink: audio, quality, rand: rng(seed), onEvent: (e) => { events.push({ ...e, at: T }); sample(); } });
  const parts = [engine.part(0, lead)];
  audio.setPart(0, parts[0]);
  if (friend) { parts.push(engine.part(1, friend)); audio.setPart(1, parts[1]); }
  const players = parts.map((p) => new Player(p, { geo: () => GEO, now }));
  const time = { now, advance, get timers() { return timers.size; } };
  const done = () => { engine.dispose(); audio.dispose(); advance(4); sound.dispose(); restore(); };
  return { sound, ac, audio, clock, scheduler, engine, parts, players, events, voices, stats, time, done };
}

// one of each solo gesture, as the Companion reports them
function everyGesture(R, slot = 0) {
  const pl = R.players[slot], t = R.time;
  pl.gesture('contact', { x: 100, y: 200, onBody: true }); t.advance(0.06); pl.gesture('tap', { x: 100, y: 200, streak: 1 }); t.advance(0.4);
  pl.gesture('contact', { x: 100, y: 180, onBody: true }); t.advance(0.05); pl.gesture('tap', { x: 100, y: 180 }); t.advance(0.12);
  pl.gesture('contact', { x: 100, y: 180, onBody: true }); t.advance(0.05); pl.gesture('doubletap', { x: 100, y: 180 }); t.advance(0.6);
  pl.gesture('contact', { x: 100, y: 150, onBody: true }); t.advance(0.48); pl.gesture('holdstart', { x: 100, y: 150 });
  for (let i = 0; i < 12; i++) { t.advance(0.25); pl.gesture('holding', { x: 100, y: 140 - i * 4, dur: i * 250 }); }
  pl.gesture('holdend', {}); t.advance(0.3);
  pl.gesture('contact', { x: 100, y: 160, onBody: true }); t.advance(0.1); pl.gesture('dragstart', { x0: 100, y0: 160, x: 100, y: 170 });
  for (let i = 1; i <= 10; i++) { t.advance(0.05); pl.gesture('drag', { x: 100, y: 160 + 9 * i, dx: 0, dy: 9 * i, vx: 0, vy: 180 }); }
  t.advance(2.2); pl.gesture('dragend', { x: 100, y: 250, dx: 0, dy: 90, fling: false, converted: false }); t.advance(0.4);
  pl.gesture('contact', { x: 100, y: 200, onBody: true }); t.advance(0.1); pl.gesture('dragstart', { x0: 100, y0: 200, x: 100, y: 190 });
  for (let i = 1; i <= 9; i++) { t.advance(0.05); pl.gesture('drag', { x: 100, y: 200 - 10 * i, dx: 0, dy: -10 * i, vx: 0, vy: -300 }); }
  pl.gesture('dragend', { x: 100, y: 110, dx: 0, dy: -90, fling: true, converted: false }); t.advance(0.5);
  autoStroke(R, slot); t.advance(1);
  pl.gesture('contact', { x: 100, y: 160, onBody: true }); pl.gesture('squeezestart', {});
  for (let i = 1; i <= 20; i++) { t.advance(0.05); pl.gesture('squeeze', { amount: Math.min(1, i / 12) }); }
  t.advance(1.5); pl.gesture('squeezeend', { amount: 0.5 }); t.advance(1);
}

test('U15 MusicAudio on fake audio: every event becomes a tagged music voice in the right place, at the right time and pitch; none when quiet; caps; cleanup', () => {
  for (const id of MALLOW_IDS) {
    const R = audioRig({ lead: id });
    everyGesture(R);
    const kinds = new Set(R.events.map((e) => e.kind));
    for (const k of ['note', 'padOn', 'padSet', 'padOff', 'bassOn', 'bassSet', 'bassBeat', 'bassOff', 'duck', 'bend']) assert.ok(kinds.has(k), `${id}: ${k}`);
    // routing and tags: voice → musicBus → sound.bus (master chain); held layers keep
    const music = R.voices.filter((v) => v.music != null);
    assert.equal(music.length, R.voices.length, `${id}: every voice is tagged music`);
    for (const v of music) {
      assert.ok(v.routed, `${id}: ${v.layer} goes through the music bus and the master chain`);
      assert.equal(v.keep, v.layer !== 'note', `${id}: ${v.layer} keep`);
      assert.ok(['note', 'pad', 'bass', 'glide'].includes(v.layer) && v.music === 0);
    }
    assert.ok(reaches(R.audio.bus, R.sound.bus));
    assert.deepEqual([...new Set(music.map((v) => v.layer))].sort(), ['bass', 'glide', 'note', 'pad'], `${id}: every layer kind sounded`);
    // timing: a touch-started note at currentTime + 5 ms; scheduled ones at their musical time (never earlier than now)
    const notes = notesOf(R.events);
    assert.ok(notes.length >= 12 && notes.every((e) => e.heard === true), `${id}: every note was heard`);
    for (const e of notes) {
      if (e.immediate) assert.ok(Math.abs(e.audioT - e.ctxNow - 0.005) < 1e-9, `${id}: no added delay`);
      else assert.ok(Math.abs(e.audioT - e.ctxNow - Math.max(0.005, e.t - e.at)) < 1e-6, `${id}: ${e.src} on its time`);
    }
    assert.ok(notes.some((e) => !e.immediate && e.t - e.at > 0.02), `${id}: grid notes are scheduled ahead`);
    assert.equal(R.stats.maxLive <= MAX_VOICES, true);
    // stop everything: nothing is left
    R.audio.stopAll();
    R.time.advance(3);
    assert.equal([...R.sound.live].filter((v) => v.music != null).length, 0, `${id}: no music voices after stopAll`);
    R.done();
  }
});

test('U15 MusicAudio: pitch lands, a queued voice that is called off never sounds, quiet when muted or Visual only, unmute restores held layers', () => {
  // every rendered note has an oscillator on its exact pitch
  const R = audioRig({ lead: 'zuzu', friend: 'loomi' });
  const seen = [];
  const ev0 = R.audio.event.bind(R.audio);
  R.audio.event = (ev) => { const r = ev0(ev); if (r && ev.kind === 'note') seen.push({ ev, v: R.audio.notes.get(ev.id).v }); return r; };
  simulate(R, { n: 160, seed: 5 });
  assert.ok(seen.length > 150);
  for (const { ev, v } of seen) {
    const at = ev.audioT + Math.max(0.12, (ev.glide || 0) * 3);
    assert.ok(v.srcs.some((o) => o.frequency && near(o.frequency.valueAt(at), ev.hz)), `${ev.src} ${ev.hz.toFixed(2)} Hz lands`);
  }
  assert.ok(R.stats.maxLive <= MAX_VOICES && R.stats.maxVoices <= CAPS.high.total + 2, `caps: live ${R.stats.maxLive}, music ${R.stats.maxVoices}`);
  R.done();

  // releaseAll during a stroke: notes decided inside the look-ahead never start
  const Q = audioRig({ lead: 'pipzi' });
  const pl = Q.players[0];
  pl.gesture('strokestart', { x: 50, y: 150 });
  let guardN = 0;
  while (!notesOf(Q.events).some((e) => e.t > Q.time.now()) && guardN++ < 200) { Q.time.advance(0.01); pl.gesture('stroke', { x: 60, y: 150, vx: 500, speed: 500 }); }
  const ahead = notesOf(Q.events).filter((e) => e.t > Q.time.now()).map((e) => ({ e, v: Q.audio.notes.get(e.id).v }));
  assert.ok(ahead.length >= 1);
  Q.engine.releaseAll();
  pl.reset();
  for (const { e, v } of ahead) {
    assert.ok(v.out.gain.valueAt(e.audioT) < 1e-6 && v.out.gain.valueAt(e.audioT + 0.05) < 1e-6, 'a called-off voice is silent when it would have started');
    assert.ok(v.srcs.every((s) => s.stopAt <= e.audioT + 0.011), 'and stops at once');
  }
  // muted: events go on, no voices; unmuting while a hum is held brings it back (reconcile)
  Q.time.advance(1);
  const n0 = Q.voices.length;
  Q.sound.setMuted(true);
  assert.equal(Q.audio.ready, false);
  pl.gesture('contact', { x: 100, y: 150, onBody: true }); Q.time.advance(0.48); pl.gesture('holdstart', { x: 100, y: 150 }); Q.time.advance(0.5);
  assert.equal(Q.voices.length, n0, 'no voices while muted');
  assert.ok(Q.events.some((e) => e.kind === 'padOn'), 'the music itself goes on');
  Q.sound.setMuted(false);
  assert.equal(Q.audio.ready, true);
  assert.equal(Q.audio.reconcile(Q.engine.layers()), 1);
  assert.equal(Q.voices.at(-1).layer, 'pad');
  assert.equal(Q.voices.at(-1).keep, true);
  assert.equal(Q.audio.reconcile(Q.engine.layers()), 0, 'once');
  // a global stop (mute, a hidden page) ends the held layer and marks it gone; reconcile brings it back again
  Q.sound.stopAll();
  assert.equal(Q.audio.layer[0].pad.alive, false);
  assert.equal(Q.audio.reconcile(Q.engine.layers()), 1);
  pl.gesture('holdend', {});
  Q.time.advance(3);
  assert.equal([...Q.sound.live].filter((v) => v.music != null).length, 0, 'the hum let go');
  // Visual only: the bus closes over 300 ms and nothing new is made, yet the music runs on
  const n1 = Q.voices.length, e1 = Q.events.length;
  Q.audio.setAttached(false);
  assert.ok(Q.audio.bus.gain.valueAt(Q.ac.currentTime + 0.5) < 0.01);
  for (let i = 0; i < 10; i++) { pl.gesture('contact', { x: 100, y: 150, onBody: true }); Q.time.advance(0.05); pl.gesture('tap', { x: 100, y: 150 }); Q.time.advance(0.2); }
  assert.equal(Q.voices.length, n1, 'no voices in Visual only');
  assert.ok(Q.events.length >= e1 + 10 && notesOf(Q.events.slice(e1)).every((e) => !e.heard));
  Q.audio.setAttached(true);
  assert.ok(Q.audio.bus.gain.valueAt(Q.ac.currentTime + 0.5) > 0.95);
  pl.gesture('contact', { x: 100, y: 150, onBody: true });
  assert.equal(Q.voices.length, n1 + 1);
  // a bass lets go in its own way: Glitzi steps down a 5th where its key allows
  Q.done();
  const G = audioRig({ lead: 'glitzi' });
  G.players[0].gesture('squeezestart', {}); G.players[0].gesture('squeeze', { amount: 0.6 }); G.time.advance(0.4);
  const bv = G.voices.find((v) => v.layer === 'bass'), semi = G.events.find((e) => e.kind === 'bassOn').semi, f = G.events.find((e) => e.kind === 'bassOn').hz;
  G.players[0].gesture('squeezeend', {});
  const want = G.parts[0].V.scale.includes(mod(semi + 5, 12)) ? f * 2 ** (-7 / 12) : f / 2;
  assert.ok(bv.srcs.some((o) => o.frequency && near(o.frequency.valueAt(G.ac.currentTime + 0.1), want)), 'Glitzi steps down');
  G.done();
});

test('U15 MusicAudio: rapid taps stay under the caps on every tier; dispose lets notes ring out, then nothing is left', () => {
  for (const q of ['high', 'medium', 'low']) {
    const R = audioRig({ lead: 'noomi', friend: 'pipzi', quality: q });
    for (let i = 0; i < 200; i++) {
      const pl = R.players[i % 2];
      pl.gesture('contact', { x: 40 + (i * 37) % 120, y: 120 + (i * 53) % 160, onBody: true });
      R.time.advance(0.004);
      pl.gesture('tap', { x: 100, y: 150 });
      R.time.advance(0.006);
    }
    assert.ok(R.stats.maxLive <= MAX_VOICES, `${q}: live ${R.stats.maxLive}`);
    assert.ok(R.stats.maxVoices <= CAPS[q].total, `${q}: music voices ${R.stats.maxVoices} ≤ ${CAPS[q].total}`);
    // leaving mid-hum and mid-squeeze: layers end at once, a ringing note rings out, all gone within 2.5 s
    R.players[0].gesture('holdstart', {}); R.players[1].gesture('squeezestart', {}); R.players[1].gesture('squeeze', { amount: 0.8 });
    R.time.advance(0.6);
    R.players[0].gesture('contact', { x: 100, y: 120, onBody: true });
    R.engine.dispose();
    R.audio.dispose();
    assert.equal(R.audio.event({ kind: 'note', slot: 0, t: R.time.now(), id: 999, hz: 440, vel: 0.5, dur: 1, immediate: true }), false, 'nothing after dispose');
    R.time.advance(0.5);
    assert.ok([...R.sound.live].some((v) => v.layer === 'note'), 'the last note still rings');
    R.time.advance(2.1);
    assert.equal([...R.sound.live].filter((v) => v.music != null).length, 0, `${q}: all gone within 2.6 s`);
    assert.equal(R.ac.live.size, 0, 'every source ended');
    R.time.advance(0.5);
    assert.equal(R.audio.bus.outputs.size, 0, 'the music bus is disconnected');
    assert.equal(R.time.timers, 0, 'no timers left');
    R.done();
  }
});

// ================================================================= U16 ==
// A rig and Companion with just what the performer touches; every call is recorded.
function fakeStage(id = 'boppo') {
  const calls = { nudge: [], react: [], squeeze: [], press: [], poke: [], inflate: [], play: [], overlay: [], look: 0 };
  const rig = {
    id, ready: true, soft: {}, BASE: 600, W: 390, H: 844, faceOverride: { set: {}, min: {} }, calls,
    setFaceOverride(o = {}) { this.faceOverride = { set: o.set || {}, min: o.min || {} }; },
    bodyRect(out = {}) { Object.assign(out, { cx: 195, top: 400, bottom: 600, mid: 500, w: 220, h: 200, W: 390, H: 844 }); return out; },
    nudge(m) { calls.nudge.push({ ...m }); return this; },
    react(k) { calls.react.push(k); return this; },
    setSqueeze(a) { calls.squeeze.push(a); },
    setPress(x, y, d) { calls.press.push(d); },
    poke(x, y) { calls.poke.push([x, y]); },
    setInflate(v) { calls.inflate.push(v); },
    overlay(k, p) { calls.overlay.push([k, p]); return this; },
    lookAtScreen() { calls.look++; },
  };
  const companion = { rig, director: { play: (...a) => calls.play.push(a) }, restOverride: null, hold: null, sq: null, drag: null, stroking: false };
  return { rig, companion, calls };
}
const csAt = (beat, meter = 4, level = 0.5) => ({ beat, bar: Math.floor(beat / meter), beatInBar: Math.floor(mod(beat, meter)), level });

test('U16 the light: one FlashGate (≤ 3 bright a second, pulse gaps); beads swell over 0.3 s, rise (in place when reduced) and die; pools capped by tier', () => {
  let T = 0;
  const gate = new FlashGate({ max: 3, gaps: PULSE_GAPS, now: () => T });
  const allowed = [];
  for (let i = 0; i < 40; i++) { T = i * 50; if (gate.allow('bead', T)) allowed.push(T); }   // 40 bright beads in 2 s
  for (const t of allowed) assert.ok(allowed.filter((x) => x > t - 1000 && x <= t).length <= 3, 'never more than 3 in any second');
  assert.ok(allowed.length >= 6 && allowed.length <= 9, `${allowed.length}`);
  T = 5000; assert.ok(gate.allow('success', T));
  T = 5500; assert.equal(gate.allow('success', T), false, 'one success per 900 ms');
  // a bead: seen at once (dim), full by 0.3 s, rising, gone at its life
  const b = new NoteBead({ x: 100, y: 200, r: 12, a: 0.5, rise: 56, life: 1.2 });
  assert.ok(b.alpha > 0 && b.alpha < 0.2, `seen at once, dim: ${b.alpha}`);
  b.step(0.1);
  assert.ok(b.alpha < 0.4, `still swelling at 0.1 s: ${b.alpha}`);
  b.step(0.2);
  assert.ok(b.alpha > 0.45, `full by 0.3 s: ${b.alpha}`);
  assert.ok(b.y < 200, 'it rises');
  let alive = true, t = 0.3;
  while (alive && t < 3) { alive = b.step(0.05); t += 0.05; }
  assert.equal(alive, false);
  assert.ok(Math.abs(t - 1.2) < 0.06, `dies at its life: ${t}`);
  const rb = new NoteBead({ x: 100, y: 200, r: 8, a: 0.4, reduced: true, drift: 9 });
  for (let i = 0; i < 10; i++) rb.step(0.05);
  assert.deepEqual([rb.x, rb.y], [100, 200], 'reduced motion: it fades in place');
  const big = new NoteBead({ r: 40, a: 2 });
  assert.ok(big.r <= BEAD.rMax && big.a <= BEAD.aMax, 'r ≤ 14 px, alpha ≤ 0.5');
  // pools: per tier, 3 with reduced motion, shrinking but never growing back
  for (const q of ['high', 'medium', 'low']) {
    const pool = new BeadPool({ cap: POOL[q] });
    for (let i = 0; i < 30; i++) pool.spawn({ x: i, y: 0, r: 6, a: 0.3 });
    assert.equal(pool.alive, POOL[q], q);
    pool.setReduced(true);
    for (let i = 0; i < 30; i++) pool.spawn({ x: i, y: 0, r: 6, a: 0.3 });
    assert.equal(pool.alive, POOL.reduced, `${q} reduced`);
  }
  const pool = new BeadPool({ cap: POOL.high });
  pool.setCap(POOL.low); pool.setCap(POOL.high);
  for (let i = 0; i < 30; i++) pool.spawn({ x: 0, y: 0 });
  assert.equal(pool.alive, POOL.low, 'a pool shrinks, never grows back');
  // a bright bead must pass the gate, else it shows at half strength; a small one is no bright event
  T = 10000;
  const g2 = new FlashGate({ max: 3, gaps: PULSE_GAPS, now: () => T });
  const bp = new BeadPool({ cap: 12, gate: g2 });
  const as = [];
  for (let i = 0; i < 6; i++) as.push(bp.spawn({ r: 12, a: 0.5 }).a);
  assert.deepEqual(as, [0.5, 0.5, 0.5, 0.25, 0.25, 0.25]);
  assert.equal(bp.spawn({ r: 8, a: 0.5 }).a, 0.5);
  // a bend stretches the note's bead upward (≤ 1.8×); the snap springs it back
  const s1 = bp.spawn({ id: 7, hz: 440 });
  bp.bend(7, 440 * 2 ** (4 / 12));
  for (let i = 0; i < 10; i++) bp.step(0.02);
  assert.ok(s1.stretch > 1.2 && s1.stretch <= 1.8, `${s1.stretch}`);
  bp.unbend(7);
  for (let i = 0; i < 10; i++) bp.step(0.03);
  assert.ok(s1.stretch < 1.05);
});

test('U16 floor glow ≤ 0.18, swelling over ≥ 0.3 s at most every 0.6 s; the trail is a ring, 40 % shorter when reduced; arc and halo ease', () => {
  const gl = new BeatGlow({});
  gl.base = 1; gl.level = 1; gl.boost = 1.4;
  assert.ok(gl.kick(1, 0.1));
  assert.equal(gl.kick(1), false, `no second swell within ${KICK_GAP} s`);
  let peakT = 0, peak = 0;
  for (let t = 0; t < 2; t += 0.02) { gl.step(0.02); assert.ok(gl.alpha <= GLOW_MAX + 1e-9); if (gl.k > peak) { peak = gl.k; peakT = t; } }
  assert.ok(peakT >= 0.26, `it rises over ≥ 0.3 s: ${peakT}`);
  assert.ok(gl.kick(1), 'later it may swell again');
  const r = new PhraseRibbon({ max: RIBBON.low });
  for (let i = 0; i < 100; i++) { r.push(i * 5, 0); r.step(0.005); }
  assert.equal(r.n, RIBBON.low);
  const rr = new PhraseRibbon({ max: RIBBON.low, reduced: true });
  for (let i = 0; i < 100; i++) rr.push(i * 5, 0);
  assert.equal(rr.n, Math.round(RIBBON.low * 0.6), '40 % shorter with reduced motion');
  r.end();
  for (let i = 0; i < 30; i++) r.step(0.05);
  assert.equal(r.n, 0, 'the trail fades after the finger lifts');
  r.push(1, 1); r.push(1.5, 1);
  assert.equal(r.n, 1, 'a tiny move is not a new point');
  const arc = new HarmonyArc({});
  arc.pulse(1);
  let mx = 0, mt = 0;
  for (let t = 0; t < 2; t += 0.02) { arc.step(0.02); if (arc.shown > mx) { mx = arc.shown; mt = t; } }
  assert.ok(mx <= 0.5 && mt >= 0.25, `${mx} at ${mt}`);
  arc.hold(true);
  for (let i = 0; i < 100; i++) arc.step(0.05);
  assert.ok(Math.abs(arc.shown - 0.32) < 0.01, 'a bloom holds a steady glow');
  const h = new BreathHalo({});
  h.place(0, 0, 100); h.set(1, 0.5);
  for (let i = 0; i < 200; i++) h.step(0.05);
  assert.ok(Math.abs(h.r - 108) < 0.5 && Math.abs(h.alpha - 0.5) < 0.01, 'the breath swells it by 8 %');
  h.set(0, 0.15); h.step(0.1);
  assert.ok(h.alpha > 0.3, 'its brightness eases over seconds, never snaps');
});

test('U16 TRAITS: every Mallow has its own groove, a singing face, real reactions and a resting face; grooves follow their beats', () => {
  for (const id of MALLOW_IDS) {
    const T = TRAITS[id];
    assert.ok(T, id);
    for (const k of ['entrance', 'proud', 'leave']) assert.ok(REACTIONS[id]?.[T[k]] || REACTIONS._shared[T[k]], `${id} ${k}: ${T[k]}`);
    for (const m of [T.rest, T.proudMix].filter(Boolean)) for (const p of Object.keys(m)) assert.ok(PRESETS[p], `${id}: ${p}`);
    assert.ok(T.sing.open > 0 && T.sing.open <= 1);
    let moves = 0;
    for (let b = 0; b < 16; b++) if (grooveStep(T.groove, csAt(b, MUSIC[id].meter), 1, {})) moves++;
    assert.ok(moves > 0, `${id} moves`);
  }
  assert.equal(new Set(MALLOW_IDS.map((id) => TRAITS[id].groove)).size, 7, 'seven different grooves');
  for (const st of ['hop', 'bounce']) for (let b = 0; b < 8; b++) assert.equal(grooveStep(st, csAt(b), 1, { gentle: true })?.hop ?? 0, 0, 'gentle never hops');
  const lo = [];
  for (let b = 0; b < 24; b++) if (grooveStep('lean', csAt(b, 3), 1)) lo.push(b);
  assert.deepEqual(lo, [0, 6, 12, 18], 'Loomi leans once every 2 bars');
  assert.equal(grooveStep('bob', csAt(1), 1).delay, 0.06, 'Glitzi bobs behind the beat');
  assert.equal(Math.abs(grooveStep('tilt', csAt(1), 0).tilt), 0);
  assert.equal(grooveStep('tilt', csAt(1), 1).tilt, -grooveStep('tilt', csAt(2), 1).tilt, 'Zuzu tilts left and right');
});

test('U16 performer: sings its notes at once, glows with a hum, grooves on beat crossings (not in reduced motion), performs a replay, rests, cleans up', () => {
  let T = 50;
  const now = () => T;
  const { rig, companion, calls } = fakeStage('boppo');
  const pool = new BeadPool({ cap: 12 });
  const off = { x: 10, y: 20 };
  const p = new Performer({ companion, slot: 0, pool, off, color: '#ff5ed0', tuning: { style: 'natural' }, now });
  const fo = rig.faceOverride;
  assert.deepEqual({ ...fo.set }, { breath: 0, bounce: 0, fxNote: 0 }, 'the music replaces the rig breathing, idle bounce and floating notes');
  // a touch: a bead at the finger and the mouth open in the same call
  p.apply({ kind: 'note', slot: 0, t: T, id: 1, vel: 0.8, x01: 0, y01: 0.5, src: 'live', immediate: true, hz: 440 }, T);
  assert.ok(fo.min.mouthOpen > 0.5, `mouth ${fo.min.mouthOpen}`);
  const bead = pool.beads.find((x) => x.alive);
  assert.deepEqual([bead.x0, bead.y0], [195 + off.x, 500 + off.y]);
  const still = csAt(0.1);
  for (let i = 0; i < 60; i++) { T += 0.05; p.frame(T, 0.05, still, { playing: false }); }
  assert.equal(fo.min.mouthOpen, undefined, 'the floor goes once the note has gone');
  assert.ok(Math.abs(calls.inflate.at(-1) - 0.4) < 1e-9, 'it breathes: inflation = level × 0.8');
  // a replayed note: sung from the mouth, poked where it was played
  p.apply({ kind: 'note', slot: 0, t: T, id: 2, vel: 0.6, x01: 0.5, y01: 0.2, src: 'replay', hz: 440 }, T);
  assert.deepEqual(calls.poke, [[195 + 0.5 * 220 * 0.42, 600 - 0.2 * 200]]);
  // a hum: it glows, then lets go
  p.apply({ kind: 'padOn', slot: 0, t: T, level: 0.8 }, T);
  for (let i = 0; i < 40; i++) { T += 0.05; p.frame(T, 0.05, still, {}); }
  assert.ok(fo.min.glow > 0.6, `glow ${fo.min.glow}`);
  p.apply({ kind: 'padOff', slot: 0, t: T }, T);
  for (let i = 0; i < 100; i++) { T += 0.05; p.frame(T, 0.05, still, {}); }
  assert.equal(fo.min.glow, undefined);
  // the groove: one nudge per beat crossing while playing
  calls.nudge.length = 0;
  let beat = 8;
  const play = (n, o = { playing: true, barS: 2.5 }) => { for (let i = 0; i < n; i++) { T += 0.05; beat += 0.08; p.frame(T, 0.05, csAt(beat), o); } };
  play(160);
  assert.ok(calls.nudge.length >= 10 && calls.nudge.length <= 13, `≈ one per beat: ${calls.nudge.length} over 12.8 beats`);
  assert.ok(p.debug().grooveLog.every((g) => Number.isInteger(g.beat)), 'on the beats');
  assert.ok(calls.nudge.some((m) => m.hop > 0), 'Boppo hops');
  p.suppress(1000);
  const before = calls.nudge.length;
  play(12);
  assert.equal(calls.nudge.length, before, 'a reaction pauses it');
  p.setReduced(true);
  const r0 = calls.nudge.length;
  play(80);
  assert.equal(calls.nudge.length, r0, 'reduced motion: no groove');
  assert.ok(Math.abs(calls.inflate.at(-1) - 0.2) < 1e-9, 'and half the inflation');
  p.setReduced(false);
  p.setTuning({ style: 'gentle' });
  calls.nudge.length = 0;
  play(80);
  assert.ok(calls.nudge.length > 0 && calls.nudge.every((m) => !m.hop), 'gentle: no hops');
  play(110, { playing: false, barS: 2.5 });   // eases out over 2 bars (5 s)
  calls.nudge.length = 0;
  play(80, { playing: false, barS: 2.5 });
  assert.equal(calls.nudge.length, 0, 'listening: the groove has eased out');
  // a replayed bass squeezes and a replayed hum presses in, never over a live touch
  p.apply({ kind: 'bassOn', slot: 0, t: T, amount: 0.6, src: 'replay' }, T);
  p.apply({ kind: 'bassOff', slot: 0, t: T }, T);
  assert.deepEqual(calls.squeeze, [0.32, 0]);
  companion.sq = {};
  p.apply({ kind: 'bassOn', slot: 0, t: T, amount: 0.6, src: 'replay' }, T);
  companion.sq = null;
  assert.equal(calls.squeeze.length, 2, 'not while the person squeezes');
  p.apply({ kind: 'bassOff', slot: 0, t: T }, T);
  p.apply({ kind: 'padOn', slot: 0, t: T, level: 0.8, src: 'replay' }, T);
  assert.equal(p.debug().performing.press, true);
  p.apply({ kind: 'replay', slot: 0, t: T, on: false, done: true }, T);
  assert.deepEqual(calls.press, [0.06, 0], 'let go when the replay ends');
  // proud and goodbye, in character (softened when gentle)
  p.proud();
  assert.equal(calls.react.at(-1), 'success');
  const pp = fakeStage('pipzi');
  new Performer({ companion: pp.companion, pool, tuning: { style: 'gentle' }, now }).proud();
  assert.equal(pp.calls.react.at(-1), 'nod', 'celebrate → nod when gentle');
  const gz = fakeStage('glitzi'), pz = new Performer({ companion: gz.companion, pool, now });
  pz.proud();
  assert.deepEqual([gz.calls.react.at(-1), Object.keys(gz.calls.play[0][0])], ['tap', ['embarrassed', 'happy']], 'Glitzi: caught out');
  pz.leave();
  assert.equal(gz.calls.react.at(-1), 'tap');
  const zr = fakeStage('zuzu'), pr = new Performer({ companion: zr.companion, pool, reduced: true, now });
  pr.enter();
  assert.equal(zr.calls.react.at(-1), 'nod', 'reduced motion maps reactions as gentle does (doubleTap → nod)');
  const gr = fakeStage('glitzi');
  new Performer({ companion: gr.companion, pool, reduced: true, now }).enter();
  assert.equal(gr.calls.react.at(-1), 'tap', 'glitchBurst → tap');
  // resting, hidden, unmount
  p.rest(true);
  assert.deepEqual(companion.restOverride.mix, TRAITS.boppo.rest);
  p.rest(false);
  assert.equal(companion.restOverride, null);
  p.hush();
  assert.equal(p.groove, 0);
  p.destroy();
  assert.deepEqual(rig.faceOverride, { set: {}, min: {} });
  assert.equal(calls.inflate.at(-1), 0);
});

test('U16 scene: the realm warms and clears with the music, eases back, ≤ 1 mood send per 500 ms; a long hum transforms it; one ripple a bar; one success per replay through the shared gate', () => {
  let T = 100;
  const now = () => T;
  const gate = new FlashGate({ max: 3, gaps: PULSE_GAPS, now: () => T * 1000 });
  const sent = [], pulses = [], transforms = [];
  const env = {
    realm: {}, mood: { agitation: 0.1, heaviness: 0.3, clarity: 0.4, warmth: 0.4 },
    setMood(m) { sent.push({ t: T, ...m }); return true; },
    transform(x) { transforms.push(x); return true; },
    pulse(kind) { const ok = gate.allow(kind, T * 1000); pulses.push({ kind, ok, t: T }); return ok; },
  };
  const { companion } = fakeStage('loomi');
  const scene = new Scene({ env, gate, quality: 'high', now });
  scene.layer = { W: 390, H: 844 };
  const p = new Performer({ companion, pool: scene.pool, now });
  scene.setPerformers([{ performer: p, color: '#a8f0ff', accent: '#ff7cf5' }]);
  const quiet = { onsets1s: 0, bass: 0, pad: 0, bloom: false, harmony1s: 0 };
  let beat = 0;
  const run = (secs, st, o = {}) => {
    for (let i = 0; i < Math.round(secs / 0.05); i++) { T += 0.05; beat += 0.06; scene.step(0.05); scene.frame(T, 0.05, csAt(beat, 3), st, { state: 'listening', groove: 0, ...o }); }
  };
  run(1, quiet);
  assert.deepEqual(scene.start, env.mood, 'the realm\'s own mood is where it starts');
  assert.equal(scene.debug().ringTarget, 0.25, 'listening: a faint ring');
  run(8, { ...quiet, onsets1s: 6, bass: 0.8, pad: 0.8 }, { state: 'playing', groove: 1 });
  const m = sent.at(-1);
  assert.ok(m.clarity > 0.85 && m.warmth > 0.75 && m.heaviness < 0.15 && m.agitation <= 0.35, JSON.stringify(m));
  for (let i = 1; i < sent.length; i++) assert.ok(sent[i].t - sent[i - 1].t >= 0.5 - 1e-9, 'one mood send per 500 ms at most');
  assert.ok(scene.debug().ringTarget >= 0.49, 'playing: the ring up to 0.5');
  assert.ok(transforms.at(-1) > 0.35 && transforms.at(-1) <= 0.5, `a long hum transforms the world toward 0.5: ${transforms.at(-1)}`);
  run(20, quiet, { state: 'resting' });
  const back = sent.at(-1);
  for (const k of Object.keys(env.mood)) assert.ok(Math.abs(back[k] - env.mood[k]) < 0.02, `${k} eased back: ${back[k]}`);
  assert.equal(scene.debug().ringTarget, 0.15, 'resting: dimmer');
  assert.ok(transforms.at(-1) < 0.01);
  for (let i = 0; i < 4; i++) { scene.apply({ kind: 'bassOn', slot: 0, t: T }); T += 0.3; beat += 0.36; scene.frame(T, 0.3, csAt(beat, 3), quiet, { state: 'playing' }); }
  const rip = pulses.filter((x) => x.kind === 'ripple' && x.ok).length;
  assert.ok(rip >= 1 && rip <= 2, `one ripple a bar at most: ${rip} over ${(1.44 / 3).toFixed(2)} bars`);
  T += 2;
  for (let i = 0; i < 3; i++) gate.allow('bead', T * 1000);   // beads have used this second's budget
  scene.apply({ kind: 'replay', slot: 0, t: T, on: false, done: true });
  run(0.5, quiet, { state: 'playing' });
  assert.equal(pulses.filter((x) => x.kind === 'success' && x.ok).length, 0, 'the success waits for the budget');
  run(1, quiet, { state: 'playing' });
  assert.equal(pulses.filter((x) => x.kind === 'success' && x.ok).length, 1, 'then exactly one');
  scene.apply({ kind: 'replay', slot: 0, t: T, on: false, stopped: true });
  run(2, quiet, { state: 'playing' });
  assert.equal(pulses.filter((x) => x.kind === 'success' && x.ok).length, 1, 'a stopped replay is no success');
  scene.destroy();
  assert.equal(scene.step(0.05), false, 'gone from the layer');
});

test('U16 cue: events wait for their moment (in arrival order); a full ring hands over the oldest at once', () => {
  const c = new Cue(4), out = [];
  const fn = (e) => out.push(e.id);
  c.push({ id: 1 }, 1.0, fn); c.push({ id: 2 }, 0.5, fn); c.push({ id: 3 }, 2.0, fn);
  c.drain(0.9, fn);
  assert.deepEqual(out, [2]);
  c.drain(1.5, fn);
  assert.deepEqual(out, [2, 1]);
  for (let i = 4; i <= 7; i++) c.push({ id: i }, 9, (e) => out.push(`early ${e.id}`));
  assert.deepEqual(out, [2, 1, 'early 3']);
  assert.equal(c.pending, 4);
  c.clear();
  assert.equal(c.pending, 0);
});

// ================================================================= U17 ==
const NEW_FILES = ['../core/music-theory.js', '../core/music-time.js', '../core/music-engine.js', '../features/hushbeat/player.js', '../features/hushbeat/copy.js', '../features/hushbeat/performer.js'].map(here);
const AUDIO_FILES = ['../core/music-kits.js', '../core/music-audio.js'].map(here);
const FX_FILES = ['../core/music-fx.js'].map(here);
const FEATURE_FILES = ['../features/hushbeat.js'].map(here);

test('U17 no network, media or DOM in the pure modules; the copy has no therapy, treatment, streak or score words', () => {
  assert.deepEqual(scanFiles([...NEW_FILES, ...AUDIO_FILES, ...FX_FILES, ...FEATURE_FILES], { forbid: NETWORK }), []);
  // the light draws on the canvases it is handed (plus one ring sprite each): no audio, storage, timers or loops
  assert.deepEqual(scanFiles(FX_FILES, { forbid: [/\bwindow\b/, /AudioContext/, /\blocalStorage\b/, /\bsetInterval\b/, /\bsetTimeout\b/, /requestAnimationFrame/] }), []);
  assert.deepEqual(scanFiles(NEW_FILES, { forbid: [/\bdocument\b/, /\bwindow\b/, /AudioContext/, /\blocalStorage\b/, /\bsetInterval\b/] }), []);
  // the audio modules use the SoundEngine's context only: no context of their own, no DOM, no storage, no intervals
  assert.deepEqual(scanFiles(AUDIO_FILES, { forbid: [/\bdocument\b/, /\bwindow\b/, /new\s+\w*AudioContext/, /\.destination\b/, /\blocalStorage\b/, /\bsetInterval\b/] }), []);
  assert.deepEqual(scanFiles(FEATURE_FILES, { forbid: [/new\s+\w*AudioContext/, /\blocalStorage\b/, /\bsetInterval\b/, /\bsessionStorage\b/] }), []);
  const strings = collectStrings(COPY);
  assert.ok(strings.length > 50);
  assert.deepEqual(lintCopy(strings), []);
  assert.deepEqual(lintCopy(['Tap to calm your mind', 'a treatment']).length, 2, 'the lint works');
  for (const s of strings) assert.ok(!/H[u]shmallow/.test(s));
  assert.equal(COPY.subtitle('Boppo'), 'Boppo');
  assert.equal(COPY.subtitle('Boppo', 'Loomi', true), 'Boppo & Loomi · Visual only');
  assert.equal(COPY.friend.title('Boppo'), 'Who joins Boppo?');
  assert.match(COPY.aria.stage('Noomi'), /^Noomi\. Tap for a note/);
});

// ================================================================= U18 ==
test('U18 shared contracts: quietSound is silent and forwards unlock; prefs default musicVisualOnly to false', () => {
  const calls = [];
  const engine = new Proxy({ ready: true, muted: false }, {
    get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); return { update() {}, end() {} }; }),
  });
  const q = quietSound(engine);
  q.poke('jelly', 1); q.squish('jelly', 1); q.release('jelly', 1); q.impact('jelly', 1); q.settle('jelly');
  q.stretch('jelly').update(1, 1); q.brush().update(1); q.stretch('jelly').end();
  assert.equal(q.voice('boppo', 'giggle', 1), null);
  assert.deepEqual(calls, [], 'no sound of its own');
  q.unlock();
  assert.deepEqual(calls, ['unlock']);
  assert.equal(q.ready, true);
  assert.equal(DEFAULTS.musicVisualOnly, false);
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const prefs = new Prefs(storage);
  prefs.set('musicVisualOnly', true);
  assert.equal(new Prefs(storage).get('musicVisualOnly'), true, 'it survives a reload');
  prefs.reset();
  assert.equal(prefs.get('musicVisualOnly'), false);
});
