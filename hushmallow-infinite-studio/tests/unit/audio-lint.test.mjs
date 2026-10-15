// audio/lint-recipes.mjs + audio/lint-shapes.mjs: banned recipes (ringtone, alarm,
// heartbeat, messenger pop, jump scare) are rejected by name and by shape, under
// any name and at any pitch, interval, attack or level; the approved v2 sounds
// pass, alone and repeated by a direction; silence is declared; recipes never name
// absolute times; every cue has a recipe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lintRecipe, lintRecipes, lintCoverage, lintEvents, shapes, sounds, probe, calibrateLoud, LOUD, SHAPE, ENGINE_FX } from '../../audio/lint-recipes.mjs';
import { RECIPES } from '../../audio/recipes/index.mjs';
import { buildScore, sparkleTexture, V2_SEED } from '../../audio/score.mjs';
import { MOVES } from '../../composer/moves/index.js';
import { studioPath } from '../../render/lib/paths.mjs';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const rules = (r) => [...new Set(lintRecipe(r).map((f) => f.rule))].sort();
const recipe = (id, emit, extra = {}) => ({ id, cue: 'thought', role: 'foley', tags: [], doc: 'a test recipe', emit, ...extra });
const beep = (R, t, f, d = 0.06, o = {}) => R.S(t, 'blip', { f, a: 0.004, d, peak: 0.04, ...o });
const has = (r, cat) => rules(r).includes(`banned:${cat}`);
const clean = (r, why = r.id) => assert.deepEqual(rules(r), [], why);
/** the shapes of a few events written directly */
const shaped = (synth, engine = []) => shapes({ synth, engine });

test('every recipe in the registry is clean (the approved v2 sounds pass every net)', () => {
  assert.deepEqual(lintRecipes(), []);
  assert.ok(Object.keys(RECIPES).length >= 23);
});

test('banned by name: ringtone, alarm, heartbeat, messenger pop and jump scare recipes are rejected whatever they sound like', () => {
  const soft = (R, c) => R.S(c.t, 'bell', { f: 1046.5, peak: 0.01, decay: 0.6 });
  assert.deepEqual(rules(recipe('t/phone-ringtone', soft)), ['banned:ringtone']);
  assert.deepEqual(rules(recipe('t/wake', soft, { doc: 'the alarm clock goes off' })), ['banned:alarm']);
  assert.deepEqual(rules(recipe('t/pulse', soft, { tags: ['heartbeat'] })), ['banned:heartbeat']);
  assert.deepEqual(rules(recipe('t/msg', soft, { doc: 'a messenger notification pop' })), ['banned:messenger-pop']);
  assert.deepEqual(rules(recipe('t/boo', soft, { tags: ['jump-scare', 'stinger'] })), ['banned:jump-scare']);
});

test('banned by shape, under innocent names', () => {
  assert.ok(has(recipe('t/twinkle', (R, c) => { for (let k = 0; k < 6; k++) beep(R, c.t + k * 0.1, k % 2 ? 1320 : 1100); }), 'ringtone'));
  assert.ok(has(recipe('t/dots', (R, c) => { for (let k = 0; k < 4; k++) beep(R, c.t + k * 0.25, 2000); }), 'alarm'));
  assert.ok(has(recipe('t/thud', (R, c) => { R.S(c.t, 'blip', { f: 70, f1: 50, d: 0.12, peak: 0.05 }); R.S(c.t + 0.25, 'blip', { f: 60, f1: 45, d: 0.12, peak: 0.04 }); }), 'heartbeat'));
  assert.ok(has(recipe('t/hello', (R, c) => { beep(R, c.t, 880, 0.05); beep(R, c.t + 0.08, 1318.5, 0.05); }), 'messenger-pop'));
  assert.ok(has(recipe('t/hit', (R, c) => R.S(c.t, 'noiseHit', { filter: 'highpass', f: 800, a: 0.0005, d: 0.3, peak: 0.09 })), 'jump-scare'));
  assert.ok(has(recipe('t/big', (R, c) => R.E(c.t, 'fx', 'crackle', { intensity: 1 }, 1)), 'jump-scare'));
  assert.deepEqual(shapes(probe(RECIPES['v2/blink'], 2, {})), [], 'v2\'s double blink is two cues, not a beep train');
});

test('the WP-04 R1 and R2 verifier evasions are all rejected, each in its own category', () => {
  const bell = (R, t, f, decay) => R.S(t, 'bell', { f, peak: 0.03, decay });
  const cases = [
    // R1
    ['alarm', 'alarm 550 Hz × 6 every 0.25 s', (R, c) => { for (let k = 0; k < 6; k++) beep(R, c.t + k * 0.25, 550); }],
    ['alarm', 'alarm 2 kHz × 6 every 0.7 s', (R, c) => { for (let k = 0; k < 6; k++) beep(R, c.t + k * 0.7, 2000); }],
    ['alarm', 'band-pass noise beeps (Q 30)', (R, c) => { for (let k = 0; k < 6; k++) R.S(c.t + k * 0.25, 'noiseHit', { filter: 'bandpass', f: 2000, q: 30, a: 0.003, d: 0.08, peak: 0.05 }); }],
    ['ringtone', 'two-pitch trill, timing jittered 18 %', (R, c) => { [0, 0.1, 0.22, 0.3, 0.42, 0.5].forEach((dt, k) => beep(R, c.t + dt, k % 2 ? 1320 : 1100)); }],
    ['heartbeat', '210 Hz lub-dub', (R, c) => { R.S(c.t, 'blip', { f: 210, f1: 150, d: 0.12, peak: 0.05 }); R.S(c.t + 0.25, 'blip', { f: 210, f1: 150, d: 0.12, peak: 0.04 }); }],
    ['heartbeat', 'the Mallow\'s press twice', (R, c) => { R.E(c.t, 'mallow', 'press', { intensity: 0.5 }, 0.3); R.E(c.t + 0.3, 'mallow', 'press', { intensity: 0.4 }, 0.3); }],
    ['messenger-pop', 'short bells 880 → 1318.5', (R, c) => { bell(R, c.t, 880, 0.1); bell(R, c.t + 0.08, 1318.5, 0.1); }],
    ['messenger-pop', '3.2 → 4.2 kHz', (R, c) => { beep(R, c.t, 3200, 0.05); beep(R, c.t + 0.08, 4200, 0.05); }],
    ['jump-scare', 'a 0.11 bright noise hit, 2 ms attack', (R, c) => R.S(c.t, 'noiseHit', { filter: 'highpass', f: 800, a: 0.002, d: 0.3, peak: 0.11 })],
    ['jump-scare', 'three hits stacked', (R, c) => { for (let k = 0; k < 3; k++) R.S(c.t, 'noiseHit', { filter: 'highpass', f: 800, a: 0.003, d: 0.3, peak: 0.1 }); }],
    // R2 (/home/user/hm-work/verify-wp04r2/lint-evade2.mjs, which passed nine of these)
    ['jump-scare', 'noise peak 0.9, 11 ms attack', (R, c) => R.S(c.t, 'noiseHit', { filter: 'highpass', f: 800, a: 0.011, d: 0.5, peak: 0.9 })],
    ['jump-scare', 'blip peak 0.9, 11 ms attack', (R, c) => R.S(c.t, 'blip', { f: 300, a: 0.011, d: 0.5, peak: 0.9 })],
    ['jump-scare', 'air burst peak 0.9, 11 ms attack', (R, c) => R.S(c.t, 'air', { f0: 2000, f1: 8000, q: 0.5, a: 0.011, r: 0.4, peak: 0.9 })],
    ['jump-scare', 'bell peak 0.9', (R, c) => R.S(c.t, 'bell', { f: 600, peak: 0.9, decay: 1 })],
    ['alarm', '4 noise hits 31 ms apart (a buzz)', (R, c) => { for (let k = 0; k < 4; k++) R.S(c.t + k * 0.031, 'noiseHit', { filter: 'lowpass', f: 3000, a: 0.003, d: 0.3, peak: 0.14 }); }],
    ['heartbeat', 'lub 60 Hz, dub 90 Hz (a fifth up), × 2 at 0.8 s', (R, c) => { for (const o of [0, 0.8]) { R.S(c.t + o, 'blip', { f: 60, f1: 45, d: 0.12, peak: 0.08 }); R.S(c.t + o + 0.28, 'blip', { f: 90, f1: 70, d: 0.1, peak: 0.06 }); } }],
    ['heartbeat', 'band-pass noise thumps 150/120 Hz, Q 1', (R, c) => { for (const o of [0, 0.85]) { R.S(c.t + o, 'noiseHit', { filter: 'bandpass', f: 150, q: 1, a: 0.004, d: 0.12, peak: 0.08 }); R.S(c.t + o + 0.3, 'noiseHit', { filter: 'bandpass', f: 120, q: 1, a: 0.004, d: 0.1, peak: 0.06 }); } }],
    ['heartbeat', 'kick-style thump 450 → 40 Hz twice', (R, c) => { R.S(c.t, 'blip', { f: 450, f1: 40, glide: 0.04, d: 0.15, peak: 0.08 }); R.S(c.t + 0.3, 'blip', { f: 450, f1: 40, glide: 0.04, d: 0.15, peak: 0.06 }); }],
    ['heartbeat', '3 lub-dubs, jittered period', (R, c) => { for (const o of [0, 0.82, 1.71]) { R.S(c.t + o, 'blip', { f: 60, f1: 45, d: 0.12, peak: 0.08 }); R.S(c.t + o + 0.28, 'blip', { f: 95, f1: 75, d: 0.1, peak: 0.06 }); } }],
    ['alarm', '8 beeps every 0.25 s, +60 cents each', (R, c) => { for (let k = 0; k < 8; k++) beep(R, c.t + k * 0.25, 2000 * Math.pow(2, (0.6 * k) / 12), 0.06); }],
    ['alarm', '8 beeps alternating 2000/2080 Hz', (R, c) => { for (let k = 0; k < 8; k++) beep(R, c.t + k * 0.25, k % 2 ? 2080 : 2000); }],
    ['alarm', '5 beeps every 1.6 s', (R, c) => { for (let k = 0; k < 5; k++) beep(R, c.t + k * 1.6, 2500); }],
    ['alarm', 'siren glide up/down × 4', (R, c) => { for (let k = 0; k < 4; k++) { R.S(c.t + k * 0.5, 'blip', { f: 700, f1: 1400, glide: 0.25, a: 0.01, d: 0.25, peak: 0.04 }); R.S(c.t + k * 0.5 + 0.25, 'blip', { f: 1400, f1: 700, glide: 0.25, a: 0.01, d: 0.25, peak: 0.04 }); } }],
    ['alarm', 'beeps alternating sine/triangle', (R, c) => { for (let k = 0; k < 8; k++) R.S(c.t + k * 0.25, 'blip', { f: 2000, a: 0.004, d: 0.06, peak: 0.04, type: k % 2 ? 'triangle' : 'sine' }); }],
    ['ringtone', '7-note figure × 2', (R, c) => { const f = [1318, 1175, 740, 831, 1109, 988, 587]; for (let rep = 0; rep < 2; rep++) f.forEach((x, k) => beep(R, c.t + rep * 1.0 + k * 0.12, x)); }],
    ['ringtone', '2-note figure 0.5 s apart × 3', (R, c) => { for (let k = 0; k < 6; k++) beep(R, c.t + k * 0.5, k % 2 ? 1320 : 1100, 0.3); }],
    ['messenger-pop', 'two short notes descending 1318 → 880', (R, c) => { beep(R, c.t, 1318.5, 0.05); beep(R, c.t + 0.08, 880, 0.05); }],
    ['messenger-pop', 'two notes rising, 0.2 s decay', (R, c) => { beep(R, c.t, 880, 0.2); beep(R, c.t + 0.1, 1318.5, 0.2); }],
  ];
  for (const [cat, name, emit] of cases) assert.ok(has(recipe('t/x', emit), cat), `${name}: ${rules(recipe('t/x', emit)).join(', ') || 'passes'}`);
});

test('more banned shapes under innocent names: slow attacks, drifting and scooped beeps, transposed figures, tri-tones', () => {
  const cases = [
    ['jump-scare', '0.9 sine, 30 ms attack', (R, c) => R.S(c.t, 'blip', { f: 300, a: 0.03, d: 0.5, peak: 0.9 })],
    ['jump-scare', '0.9 sine, 100 ms attack', (R, c) => R.S(c.t, 'blip', { f: 300, a: 0.1, d: 0.5, peak: 0.9 })],
    ['jump-scare', 'a stinger: noise swelling to 0.5 in 200 ms', (R, c) => R.S(c.t, 'noiseHit', { filter: 'lowpass', f: 4000, a: 0.2, d: 0.5, peak: 0.5 })],
    ['jump-scare', 'engine fx stacked within 50 ms', (R, c) => { for (let k = 0; k < 3; k++) R.E(c.t + k * 0.02, 'fx', 'snap', { intensity: 1 }, 0.35); }],
    ['jump-scare', 'loud tones stacked', (R, c) => { R.S(c.t, 'blip', { f: 300, a: 0.004, d: 0.3, peak: 0.1 }); R.S(c.t + 0.005, 'blip', { type: 'triangle', f: 600, a: 0.004, d: 0.3, peak: 0.1 }); }],
    ['jump-scare', 'engine voices stacked to full force', (R, c) => { R.E(c.t, 'mallow', 'surprise', { intensity: 1 }, 0.5); R.E(c.t, 'fx', 'snap', { intensity: 1 }, 0.5); }],
    ['alarm', '3 beeps every 3.5 s', (R, c) => { for (let k = 0; k < 3; k++) beep(R, c.t + k * 3.5, 2500); }],
    ['alarm', '6 beeps falling a semitone each', (R, c) => { for (let k = 0; k < 6; k++) beep(R, c.t + k * 0.3, 2000 * Math.pow(2, -k / 12)); }],
    ['alarm', '4 scooped beeps (180 cents in 5 ms) every 0.25 s', (R, c) => { for (let k = 0; k < 4; k++) beep(R, c.t + k * 0.25, 1800, 0.06, { f1: 2000, glide: 0.005 }); }],
    ['alarm', 'held 0.4 s beeps × 3', (R, c) => { for (let k = 0; k < 3; k++) beep(R, c.t + k * 0.8, 1000, 0.02, { h: 0.4 }); }],
    ['alarm', 'a square-wave buzzer', (R, c) => beep(R, c.t, 220, 0.05, { type: 'square', h: 0.6, peak: 0.03 })],
    ['alarm', 'a two-cycle siren', (R, c) => { for (let k = 0; k < 4; k++) R.S(c.t + k * 0.4, 'blip', { f: k % 2 ? 1400 : 700, f1: k % 2 ? 700 : 1400, glide: 0.4, a: 0.01, d: 0.4, peak: 0.03 }); }],
    ['alarm', 'a beep train with filler notes between', (R, c) => { for (let k = 0; k < 4; k++) { beep(R, c.t + k * 0.4, 2000); beep(R, c.t + k * 0.4 + 0.2, 2600 + 300 * k); } }],
    ['alarm', 'ping beeps × 4', (R, c) => { for (let k = 0; k < 4; k++) R.S(c.t + k * 0.3, 'ping', { f: 3000, rise: 1.01, peak: 0.03, decay: 0.12 }); }],
    ['alarm', 'short bell dings × 4 (decay 0.3)', (R, c) => { for (let k = 0; k < 4; k++) R.S(c.t + k * 0.3, 'bell', { f: 2000, peak: 0.02, decay: 0.3 }); }],
    ['alarm', 'an engine sound repeated four times at 0.4 s', (R, c) => { for (let k = 0; k < 4; k++) R.E(c.t + k * 0.4, 'fx', 'snap', { intensity: 0.3 }, 0.3); }],
    ['alarm', 'a broadband buzzer train (4 noise hits at 0.3 s)', (R, c) => { for (let k = 0; k < 4; k++) R.S(c.t + k * 0.3, 'noiseHit', { filter: 'highpass', f: 3000, a: 0.002, d: 0.05, peak: 0.01 }); }],
    ['alarm', 'beep-beep', (R, c) => { beep(R, c.t, 3000, 0.05); beep(R, c.t + 0.15, 3000, 0.05); }],
    ['heartbeat', 'noise lub, tone dub', (R, c) => { R.S(c.t, 'noiseHit', { filter: 'bandpass', f: 120, q: 1.5, a: 0.005, d: 0.12, peak: 0.08 }); R.S(c.t + 0.3, 'blip', { f: 80, f1: 60, d: 0.1, peak: 0.05 }); }],
    ['heartbeat', 'lub-dub with a click on top', (R, c) => { for (const o of [0, 0.3]) { R.S(c.t + o, 'blip', { f: 70, f1: 50, d: 0.12, peak: 0.06 }); R.S(c.t + o, 'noiseHit', { filter: 'highpass', f: 3000, a: 0.002, d: 0.02, peak: 0.01 }); } }],
    ['heartbeat', 'two low noise thumps', (R, c) => { R.S(c.t, 'noiseHit', { filter: 'lowpass', f: 500, a: 0.004, d: 0.1, peak: 0.05 }); R.S(c.t + 0.3, 'noiseHit', { filter: 'lowpass', f: 450, a: 0.004, d: 0.1, peak: 0.04 }); }],
    ['heartbeat', 'the Mallow\'s tap twice', (R, c) => { R.E(c.t, 'mallow', 'tap', { intensity: 0.5 }, 0.3); R.E(c.t + 0.25, 'mallow', 'tap', { intensity: 0.4 }, 0.3); }],
    ['messenger-pop', 'a descending tri-tone', (R, c) => { beep(R, c.t, 1568, 0.12); beep(R, c.t + 0.12, 1318.5, 0.12); beep(R, c.t + 0.24, 1046.5, 0.12); }],
    ['messenger-pop', 'two short bells falling', (R, c) => { R.S(c.t, 'bell', { f: 1318.5, peak: 0.03, decay: 0.3 }); R.S(c.t + 0.15, 'bell', { f: 988, peak: 0.03, decay: 0.3 }); }],
    ['messenger-pop', 'a narrow-noise two-tone', (R, c) => { R.S(c.t, 'noiseHit', { filter: 'bandpass', f: 1000, q: 20, a: 0.003, d: 0.08, peak: 0.08 }); R.S(c.t + 0.1, 'noiseHit', { filter: 'bandpass', f: 1500, q: 20, a: 0.003, d: 0.08, peak: 0.08 }); }],
    ['ringtone', 'a figure repeated a tone higher', (R, c) => { [0, 2].forEach((st, rep) => [1046.5, 1318.5, 1568].forEach((x, k) => beep(R, c.t + rep * 0.45 + k * 0.15, x * Math.pow(2, st / 12)))); }],
    ['ringtone', 'a 10-note figure × 2', (R, c) => { const f = [1318, 1175, 740, 831, 1109, 988, 587, 659, 880, 784]; for (let rep = 0; rep < 2; rep++) f.forEach((x, k) => beep(R, c.t + rep * 1.3 + k * 0.13, x)); }],
  ];
  for (const [cat, name, emit] of cases) assert.ok(has(recipe('t/x', emit), cat), `${name}: ${rules(recipe('t/x', emit)).join(', ') || 'passes'}`);
});

/** the parameter x in [lo, hi] at which f(x) crosses `target` (f monotonic), by bisection */
const solve = (f, target, lo, hi) => {
  const up = f(hi) > f(lo);
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if ((f(m) < target) === up) lo = m; else hi = m; }
  return (lo + hi) / 2;
};
/** the sound model of one studio event (its first part) */
const part = (e) => sounds({ synth: [e] })[0];

test('each limit, walked from both sides, past the boundary', () => {
  const N = SHAPE.note, L = SHAPE.lubDub, P = SHAPE.pop, R = SHAPE.ring, S = SHAPE.steady, T = SHAPE.trill;
  // a beep vs a chime: a struck steady tone up to 0.5 s is a signal note (three at 0.5 s: an alarm); a longer-ringing
  // one is a chime (three: a gag; four: an alarm)
  const dings = (n, decay) => Array.from({ length: n }, (_, k) => ({ t: 1 + k * 0.5, inst: 'bell', f: 1568, peak: 0.02, decay }));
  assert.ok(shaped(dings(3, N.maxStruck - 0.003)).includes('alarm'), `bells ringing ${N.maxStruck} s are beeps`);
  assert.deepEqual(shaped(dings(3, N.maxStruck + 0.05)), [], 'three longer-ringing bells are chimes');
  assert.ok(shaped(dings(SHAPE.train.tones, N.maxStruck + 0.05)).includes('alarm'), 'four chimes at a steady interval are an alarm');
  // a beep holds its pitch: ≥ 85 % of its energy within ±25 cents; a little less is a chirp (three chirps are a gag,
  // four at 0.25 s a machine)
  const glided = (t, g) => ({ t, inst: 'blip', f: 2000, f1: 2000 * Math.pow(2, g / 1200), glide: 0.02, a: 0.004, d: 0.06, peak: 0.04 });
  const held = (g) => part(glided(0, g)).held;
  const still = solve(held, S.share + 0.02, 0, 400), moving = solve(held, S.share - 0.02, 0, 400);
  const train = (n, g) => Array.from({ length: n }, (_, k) => glided(1 + k * 0.25, g));
  assert.ok(shaped(train(3, still)).includes('alarm'), `${still.toFixed(0)} cents of glide: still a beep`);
  assert.deepEqual(shaped(train(3, moving)), [], `${moving.toFixed(0)} cents of glide: a chirp`);
  assert.ok(shaped(train(SHAPE.mechanical.fast, moving)).includes('alarm'));
  // drift: each repeat may move ≤ 150 cents (below a whole tone); a whole-tone step is a melody
  const climb = (step) => Array.from({ length: 4 }, (_, k) => ({ t: 1 + k * 0.6, inst: 'blip', f: 1500 * Math.pow(2, (k * step) / 1200), a: 0.004, d: 0.06, peak: 0.04 }));
  assert.ok(shaped(climb(SHAPE.drift)).includes('alarm'));
  assert.ok(!shaped(climb(200)).includes('alarm'), 'a whole-tone scale of beeps is not one beep repeating');
  // trains: up to 4 s apart
  const slow = (gap) => Array.from({ length: 3 }, (_, k) => ({ t: 1 + k * gap, inst: 'blip', f: 2500, a: 0.004, d: 0.06, peak: 0.04 }));
  assert.ok(shaped(slow(SHAPE.train.maxGap)).includes('alarm'));
  assert.deepEqual(shaped(slow(SHAPE.train.maxGap + 0.2)), []);

  // a lub-dub: two body thumps 0.15–0.45 s apart, standing out from their neighbours
  const thump = (t, f, o = {}) => ({ t, inst: 'blip', f, f1: f * 0.75, d: 0.12, peak: 0.05, ...o });
  assert.ok(shaped([thump(1, 80), thump(1 + L.max, 70)]).includes('heartbeat'));
  assert.deepEqual(shaped([thump(1, 80), thump(1 + L.max + 0.02, 70)]), []);
  assert.deepEqual(shaped([thump(1, 80), thump(1 + L.min - 0.02, 70)]), []);
  assert.deepEqual(shaped([thump(1, 80), thump(1.3, 80), thump(1.6, 80)]), [], 'evenly spaced thumps bounce; they do not beat like a heart');
  // low: its energy sits ≤ 340 Hz
  const fAt = (hz) => solve((f) => part(thump(0, f)).hz, hz, 40, 2000);
  const below = fAt(L.lowHz * 0.97), above = fAt(L.lowHz * 1.03);
  assert.ok(shaped([thump(1, below), thump(1.3, below)]).includes('heartbeat'), `energy at ${(L.lowHz * 0.97).toFixed(0)} Hz`);
  assert.deepEqual(shaped([thump(1, above), thump(1.3, above)]), [], `energy at ${(L.lowHz * 1.03).toFixed(0)} Hz`);
  // … and its pitch does not rise (a bloop is not a thump)
  const bloop = (t, glide) => ({ t, inst: 'blip', f: 90, f1: 90 * Math.pow(2, glide / 1200), glide: 0.05, d: 0.12, peak: 0.05 });
  assert.ok(shaped([bloop(1, L.maxRise - 20), bloop(1.3, L.maxRise - 20)]).includes('heartbeat'));
  assert.deepEqual(shaped([bloop(1, L.maxRise + 20), bloop(1.3, L.maxRise + 20)]), []);
  // it peaks within half the lub-dub interval (else the two beats merge into one swell)
  const d = 0.3, slowAttack = (a) => [thump(1, 80, { a }), thump(1 + d, 70, { a })];
  assert.ok(shaped(slowAttack(L.attackShare * d - 0.01)).includes('heartbeat'));
  assert.deepEqual(shaped(slowAttack(L.attackShare * d + 0.01)), []);
  // its body (above −20 dB) lasts at most 1.5 s
  const bodied = (h) => [thump(1, 80, { h }), thump(1.3, 70, { h })];
  const hFor = (body) => solve((h) => part(thump(0, 80, { h })).body, body, 0, 3);
  assert.ok(shaped(bodied(hFor(L.maxBody - 0.05))).includes('heartbeat'));
  assert.deepEqual(shaped(bodied(hFor(L.maxBody + 0.05))), []);
  // it is in the foreground: a louder sound just before it masks it
  const hitBefore = (gap) => [1, 1.3].flatMap((t) => [{ t: t - gap, inst: 'blip', f: 900, f1: 1800, glide: 0.03, d: 0.06, peak: 0.02 * L.maskRatio * 1.2 }, thump(t, 80, { peak: 0.02 })]);
  assert.deepEqual(shaped(hitBefore(L.maskSec - 0.02)), [], 'thumps in the wake of a louder sound');
  assert.ok(shaped(hitBefore(L.maskSec + 0.02)).includes('heartbeat'));

  // a pop: two signal notes ≤ 0.3 s apart, at least a whole tone apart
  const two = (gap, st) => [{ t: 1, inst: 'blip', f: 1000, a: 0.004, d: 0.1, peak: 0.04 }, { t: 1 + gap, inst: 'blip', f: 1000 * Math.pow(2, st / 12), a: 0.004, d: 0.1, peak: 0.04 }];
  assert.ok(shaped(two(P.max, 2)).includes('messenger-pop'));
  assert.ok(shaped(two(0.1, -2)).includes('messenger-pop'));
  assert.deepEqual(shaped(two(P.max + 0.05, 2)), []);
  assert.deepEqual(shaped(two(0.1, 1.5)), []);
  // … two chirps of the same kind within 150 ms
  const drips = (gap, st) => [0, 1].map((k) => ({ t: 1 + k * gap, inst: 'blip', f: 980 * Math.pow(2, (k * st) / 12), f1: 980 * Math.pow(2, (k * st) / 12) * 0.55, glide: 0.045, a: 0.003, d: 0.14, peak: 0.05 }));
  assert.ok(shaped(drips(P.chirpMax - 0.01, 7)).includes('messenger-pop'));
  assert.deepEqual(shaped(drips(P.chirpMax + 0.01, 7)), []);
  assert.deepEqual(shaped(drips(0.1, 1.5)), [], 'a semitone and a half apart: one drip again');
  // … two long-ringing notes louder than v2's own celesta pairs
  const peakFor = (eff) => solve((pk) => part({ t: 0, inst: 'bell', f: 784, peak: pk, decay: 0.7 }).eff, eff, 0, 1);
  const chimes = (pk) => [{ t: 1, inst: 'bell', f: 784, peak: pk, decay: 0.7 }, { t: 1.11, inst: 'bell', f: 784 * 1.5, peak: pk, decay: 0.7 }];
  assert.ok(shaped(chimes(peakFor(LOUD.chimePair * 1.05))).includes('messenger-pop'));
  assert.deepEqual(shaped(chimes(peakFor(LOUD.chimePair * 0.95))), []);

  // a ring: two steady tones 50–250 cents apart held ≥ 0.3 s, repeated within 6 s or held ≥ 1 s
  const burst = (t, c, { h = 0.4, ratio = 1 } = {}) => [{ t, inst: 'blip', f: 440, a: 0.01, h, d: 0.03, peak: 0.03 }, { t, inst: 'blip', f: 440 * Math.pow(2, c / 1200), a: 0.01, h, d: 0.03, peak: 0.03 * ratio }];
  const ring = (c, gap = 0.6, o = {}) => [...burst(1, c, o), ...burst(1 + gap, c, o)];
  assert.ok(shaped(ring(R.dual[1] - 10)).includes('ringtone'));
  assert.deepEqual(shaped(ring(R.dual[1] + 10)), [], 'a major third is a chord');
  assert.ok(shaped(ring(R.dual[0] + 10)).includes('ringtone'));
  assert.deepEqual(shaped(ring(R.dual[0] - 10)), []);
  assert.ok(shaped(ring(150, R.maxGap - 0.1)).includes('ringtone'));
  assert.deepEqual(shaped(ring(150, R.maxGap + 0.2)), []);
  assert.ok(shaped(ring(150, 0.6, { ratio: R.level + 0.05 })).includes('ringtone'));
  assert.deepEqual(shaped(ring(150, 0.6, { ratio: R.level - 0.05 })), [], 'one tone with a quiet neighbour does not beat');
  const hFor2 = (body) => solve((h) => part({ t: 0, inst: 'blip', f: 440, a: 0.01, h, d: 0.03, peak: 0.03 }).body, body, 0, 3);
  assert.ok(shaped(ring(150, 0.8, { h: hFor2(R.body + 0.02) })).includes('ringtone'));
  assert.deepEqual(shaped(ring(150, 0.8, { h: hFor2(R.body - 0.02) })), []);
  assert.ok(shaped(burst(1, 150, { h: hFor2(R.held + 0.05) })).includes('ringtone'), 'one burst held past a second');
  assert.deepEqual(shaped(burst(1, 150, { h: hFor2(R.held - 0.05) })), []);
  // … one plain tone held ≥ 0.8 s, repeated within 6 s (the 425 Hz European ring)
  const tone = (t, h) => ({ t, inst: 'blip', f: 425, a: 0.01, h, d: 0.05, peak: 0.03 });
  assert.ok(shaped([tone(1, hFor2(R.single + 0.05)), tone(6, hFor2(R.single + 0.05))]).includes('ringtone'));
  assert.deepEqual(shaped([tone(1, hFor2(R.single - 0.05)), tone(6, hFor2(R.single - 0.05))]), []);
  assert.deepEqual(shaped([tone(1, 1.6)]), [], 'one long tone is a note');
  // … or a trill: a vibrato ≥ 10 Hz and ≥ 50 cents deep
  const trill = (rate, cents) => [1, 1.6].map((t) => ({ t, inst: 'blip', f: 1000, a: 0.005, h: 0.4, d: 0.05, peak: 0.03, vib: { rate, cents, decay: 100 } }));
  assert.ok(shaped(trill(T.rate + 1, T.cents + 5)).includes('ringtone'));
  assert.deepEqual(shaped(trill(T.rate - 1, T.cents + 5)), [], 'a slower vibrato is a voice');
  assert.deepEqual(shaped(trill(T.rate + 1, T.cents - 5)), [], 'a shallower one is a shimmer');
  // a figure: up to 24 signal notes played again; 3+ notes of any length; two chimes played again are a doorbell
  const scale = [0, 2, 4, 5, 7, 9, 11];
  const fig = (n) => Array.from({ length: 2 * n }, (_, k) => ({ t: 1 + k * 0.12, inst: 'blip', f: 880 * Math.pow(2, (scale[(k % n) % 7] + 12 * Math.floor((k % n) / 7)) / 12), a: 0.004, d: 0.06, peak: 0.04 }));
  assert.ok(shaped(fig(SHAPE.figure.maxLen)).includes('ringtone'), `a ${SHAPE.figure.maxLen}-note figure played again`);
  const bells = (n, reps) => Array.from({ length: n * reps }, (_, k) => ({ t: 1 + k * 0.2, inst: 'bell', f: [784, 1046.5, 1318.5][k % n], peak: 0.015, decay: 0.8 }));
  assert.ok(shaped(bells(SHAPE.figure.chimeLen, 2)).includes('ringtone'));
  assert.deepEqual(shaped(bells(SHAPE.figure.chimeLen - 1, 3)), [], 'ding-dong, ding-dong, ding-dong');

  // jump scare: v2's maxima + 3 dB, for the level, its noise and the Mallow's voice
  const hit = (peak) => [{ t: 1, inst: 'blip', f: 300, a: 0.011, d: 0.5, peak }];
  const at = LOUD.rise / Math.SQRT1_2;
  assert.ok(shaped(hit(at * 1.02)).includes('jump-scare'));
  assert.deepEqual(shaped(hit(at * 0.98)), []);
  const hush = (pk) => [{ t: 1, inst: 'noiseHit', filter: 'lowpass', f: 2000, a: 0.003, d: 0.3, peak: pk }];
  const nAt = solve((pk) => part(hush(pk)[0]).eff, LOUD.noise, 0, 2);
  assert.ok(shaped(hush(nAt * 1.02)).includes('jump-scare'), 'noise below the bright band');
  assert.deepEqual(shaped(hush(nAt * 0.98)), []);
  const voice = (trim) => shapes({ engine: [{ t: 1, kind: 'mallow', name: 'surprise', opts: { intensity: 1 }, trim }] });
  assert.ok(voice(LOUD.voice + 0.02).includes('jump-scare'));
  assert.deepEqual(voice(LOUD.voice - 0.02), []);
  // a slow swell is a crescendo, not a scare
  assert.deepEqual(shaped([{ t: 1, inst: 'air', a: 1, r: 1, f0: 600, f1: 900, q: 0.8, peak: 0.25 }]), []);
});

test('no false alarms: musical figures the brand uses pass the shapes', () => {
  clean(recipe('t/arp', (R, c) => [523.25, 659.25, 783.99].forEach((f, k) => R.S(c.t + k * 0.11, 'bell', { f, peak: 0.02, decay: 0.7 }))), 'a rising arpeggio of chimes');
  clean(recipe('t/pair', (R, c) => { R.S(c.t, 'bell', { f: 784, peak: 0.022, decay: 0.7 }); R.S(c.t + 0.11, 'bell', { f: 1046.5, peak: 0.017, decay: 0.8 }); }), 'v2\'s MO-CLOSE celesta pair');
  clean(recipe('t/fifth', (R, c) => { R.S(c.t, 'bell', { f: 1046.5, peak: 0.022, decay: 0.7 }); R.S(c.t + 0.11, 'bell', { f: 1568, peak: 0.017, decay: 0.8 }); }), 'MO-CLOSE\'s resolution a fifth up (arrangeClose)');
  clean(recipe('t/dissolve', (R, c) => [Math.pow(2, 3 / 12), 1, Math.pow(2, -5 / 12)].forEach((p, k) => R.E(c.t + k * 0.2, 'fx', 'chime', { intensity: 0.35, pitch: p, pan: 0.5 }, 0.13))), 'v2\'s three dissolve chimes');
  clean(recipe('t/glide', (R, c) => { beep(R, c.t, 420); R.S(c.t + 0.2, 'blip', { f: 600, f1: 300, glide: 0.1, d: 0.2, peak: 0.03 }); }), 'a note and a glide');
  clean(recipe('t/two', (R, c) => { R.E(c.t, 'fx', 'swish', { intensity: 0.15, pitch: 0.8 }, 0.7); R.E(c.t + 0.35, 'fx', 'swish', { intensity: 0.15, pitch: 0.8 }, 0.7); }), 'two glances');
  clean(recipe('t/three', (R, c) => { for (let k = 0; k < 3; k++) R.E(c.t + k * 0.4, 'fx', 'snap', { intensity: 0.3 }, 0.3); }), 'three snaps (a gag, not a machine)');
  clean(recipe('t/chirps', (R, c) => { for (let k = 0; k < 3; k++) R.S(c.t + k * 0.3, 'blip', { f: 1400, f1: 1176, glide: 0.022, a: 0.0015, d: 0.04, peak: 0.06 }); }), 'three blink chirps');
  clean(recipe('t/double', (R, c) => { R.S(c.t, 'blip', { f: 1320, f1: 1109, glide: 0.022, a: 0.0015, d: 0.04, peak: 0.06 }); R.S(c.t + 0.24, 'blip', { f: 1500, f1: 1260, glide: 0.022, a: 0.0015, d: 0.04, peak: 0.06 }); }), 'v2\'s double blink, the second higher');
  clean(recipe('t/chimes', (R, c) => { for (let k = 0; k < 3; k++) R.S(c.t + k * 0.5, 'bell', { f: 1568, peak: 0.02, decay: 0.6 }); }), 'three identical chimes');
  clean(recipe('t/bounce', (R, c) => { for (let k = 0; k < 3; k++) R.S(c.t + k * 0.35, 'blip', { f: 90, f1: 60, d: 0.12, peak: 0.05 }); }), 'three even bounces');
  clean(recipe('t/hits', (R, c) => { for (let k = 0; k < 6; k++) R.S(c.t + k * 0.009, 'noiseHit', { filter: 'lowpass', f: 3000 + 50 * k, a: 0.003, d: 0.4, peak: 0.03 }); }), 'six quiet noise hits within 50 ms stay under v2\'s landing + 3 dB');
  clean(recipe('t/thrum', (R, c) => R.E(c.t, 'fx', 'thrum', { intensity: 0.6 }, 0.8)), 'one warm thrum');
  clean(recipe('t/settle', (R, c) => R.E(c.t, 'fx', 'settle', { intensity: 0.6 }, 0.8)), 'one settle');
  clean(recipe('t/pluck', (R, c) => [0, 2, 4, 7].forEach((n, k) => R.E(c.t + k * 0.35, 'fx', 'pluck', { intensity: 0.4, note: n }, 0.5))), 'an unhurried rising pluck line, once');
  clean(recipe('t/drips', (R, c) => [0, 3].forEach((n, k) => R.E(c.t + k * 0.3, 'fx', 'drip', { intensity: 0.4, note: n }, 0.5))), 'two drips, unhurried');
  clean(recipe('t/vib', (R, c) => R.S(c.t, 'blip', { f: 600, a: 0.02, h: 0.6, d: 0.3, peak: 0.02, vib: { rate: 6, cents: 40, decay: 0.9 } })), 'a held note with a gentle vibrato');
});

test('approved v2 sounds repeated by a direction are not banned patterns: every recipe and payload, × 2 and × 3, at steady gaps from 0.2 to 2 s', () => {
  const flagged = [];
  for (const [id, r] of Object.entries(RECIPES)) for (const p of [{}, { soft: true }, { i: 1 }, { amp: 1 }]) for (const reps of [2, 3]) for (const gap of [0.2, 0.3, 0.45, 0.5, 0.7, 0.9, 1.2, 1.4, 2]) {
    const ev = { engine: [], synth: [] };
    for (let k = 0; k < reps; k++) { const x = probe(r, 1 + k * gap, p); ev.engine.push(...x.engine); ev.synth.push(...x.synth); }
    const f = lintEvents(ev);
    if (f.length) flagged.push(`${id} ${JSON.stringify(p)} ×${reps} every ${gap} s: ${f.map((x) => x.message).join('; ')}`);
  }
  assert.deepEqual(flagged, []);
});

test('buildScore scores a direction that repeats cues at a steady interval (a triple blink, three glances, three ripples)', () => {
  const d = readJson(studioPath('specs', 'golden', 't01-v2.direction.json')), log = readJson(studioPath('output', 'v2', 'cues.json'));
  const like = (type, t) => ({ ...d.cues.find((c) => c.type === type), t });
  const extra = [like('blink', 1.9), like('glance', 2.55), like('ripple', 1.6), like('ripple', 2.02)];
  const dir = { ...d, cues: [...d.cues, ...extra] };
  const cues = dir.cues.map((c) => ({ t: +c.t.toFixed(4), type: c.type, ...c.data }));
  const { report } = buildScore({ log: { ...log, cues }, direction: dir }, {});
  const times = (type) => report.cues.filter((c) => c.type === type).map((c) => c.t).sort((a, b) => a - b);
  assert.deepEqual(times('blink').slice(0, 3), [1.42, 1.66, 1.9], 'blinks every 0.24 s');
  assert.deepEqual(times('glance'), [1.85, 2.2, 2.55], 'glances every 0.35 s');
  assert.deepEqual(times('ripple'), [1.18, 1.6, 2.02], 'ripples every 0.42 s');
});

test('jump-scare and level limits are v2\'s own maxima + 3 dB (recomputed from the approved recipes and the approved v2 score)', () => {
  const log = readJson(studioPath('output', 'v2', 'cues.json'));
  const { plan } = buildScore({ log }, { compat: 'v2-score' });
  const v2 = calibrateLoud(RECIPES, [{ engine: plan.engine, synth: plan.synth }]);
  for (const k of ['rise', 'riser', 'noise', 'bright', 'voice', 'chimePair']) {
    assert.ok(Math.abs(LOUD[k] / (v2[k] * Math.SQRT2) - 1) < 0.01, `${k}: limit ${LOUD[k]}, v2 ${v2[k].toFixed(4)} + 3 dB = ${(v2[k] * Math.SQRT2).toFixed(4)}`);
  }
  assert.ok(LOUD.engine > v2.engine && LOUD.engine < 1, `engine: ${LOUD.engine} over v2's ${v2.engine}, under full force`);
});

// The acceptance set of the M0 follow-up (docs/M0-REPORT.md §9 item 1): the WP-04 round-3 reviewer's
// probes (WORK/verify-wp04r3/lint-evade3.mjs), verbatim. 25 of the 27 passed the WP-04 lint.
const sbeep = (R, t, f, d = 0.06, o = {}) => R.S(t, 'blip', { f: f / Math.pow(2, 110 / 1200), f1: f, glide: 0.002, a: 0.004, d, peak: 0.04, ...o });
const NOKIA = [1318.5, 1174.7, 740, 830.6, 1108.7, 987.8, 587.3, 659.3, 987.8, 880, 554.4, 659.3, 880];
const R3_PROBES = [
  ['ringtone', 'UK phone ring, dual tone 400+450 Hz, 0.4 on 0.2 off 0.4 on', (R, c) => { for (const o of [0, 0.6]) { R.S(c.t + o, 'blip', { f: 400, a: 0.01, h: 0.4, d: 0.03, peak: 0.03 }); R.S(c.t + o, 'blip', { f: 450, a: 0.01, h: 0.4, d: 0.03, peak: 0.03 }); } }],
  ['ringtone', 'UK phone ring x2 cycles (0, 0.6, 3.0, 3.6 s)', (R, c) => { for (const o of [0, 0.6, 3.0, 3.6]) { R.S(c.t + o, 'blip', { f: 400, a: 0.01, h: 0.4, d: 0.03, peak: 0.03 }); R.S(c.t + o, 'blip', { f: 450, a: 0.01, h: 0.4, d: 0.03, peak: 0.03 }); } }],
  ['ringtone', 'US phone ring 440+480 Hz held 2 s', (R, c) => { R.S(c.t, 'blip', { f: 440, a: 0.01, h: 1.95, d: 0.03, peak: 0.03 }); R.S(c.t, 'blip', { f: 480, a: 0.01, h: 1.95, d: 0.03, peak: 0.03 }); }],
  ['ringtone', 'trill bell (vibrato 300 cents at 20 Hz), 0.4 s on x2', (R, c) => { for (const o of [0, 0.6]) R.S(c.t + o, 'blip', { f: 1000, a: 0.005, h: 0.4, d: 0.05, peak: 0.03, vib: { cents: 300, rate: 20 } }); }],
  ['ringtone', '13-note Nokia figure as beeps 0.32 s apart x2', (R, c) => { for (let rep = 0; rep < 2; rep++) NOKIA.forEach((f, k) => beep(R, c.t + rep * 13 * 0.32 + k * 0.32, f, 0.1)); }],
  ['ringtone', 'Nokia figure, scooped beeps 0.13 s apart x2', (R, c) => { for (let rep = 0; rep < 2; rep++) NOKIA.forEach((f, k) => sbeep(R, c.t + rep * 1.9 + k * 0.13, f, 0.08)); }],
  ['ringtone', '4-note marimba-ish figure of 0.55 s pings x3', (R, c) => { const f = [1046.5, 1568, 1318.5, 1568]; for (let rep = 0; rep < 3; rep++) f.forEach((x, k) => R.S(c.t + rep * 0.8 + k * 0.15, 'ping', { f: x, peak: 0.03, decay: 0.55 })); }],
  ['ringtone', '4-note figure on the engine chime (pitched) x3', (R, c) => { const p = [1, 1.498, 1.26, 1.498]; for (let rep = 0; rep < 3; rep++) p.forEach((x, k) => R.E(c.t + rep * 0.8 + k * 0.15, 'fx', 'chime', { intensity: 0.4, pitch: x }, 0.5)); }],
  ['ringtone', '4-note figure on the engine pluck x3', (R, c) => { const p = [1, 1.498, 1.26, 1.498]; for (let rep = 0; rep < 3; rep++) p.forEach((x, k) => R.E(c.t + rep * 0.8 + k * 0.15, 'fx', 'pluck', { intensity: 0.4, pitch: x }, 0.5)); }],
  ['messenger-pop', 'two-tone 880 -> 1318 with 2 ms scoops', (R, c) => { sbeep(R, c.t, 880, 0.05); sbeep(R, c.t + 0.08, 1318.5, 0.05); }],
  ['messenger-pop', 'tri-tone with 2 ms scoops', (R, c) => { sbeep(R, c.t, 1568, 0.12); sbeep(R, c.t + 0.12, 1318.5, 0.12); sbeep(R, c.t + 0.24, 1046.5, 0.12); }],
  ['messenger-pop', 'two sine pings rising a fifth, 0.55 s decay', (R, c) => { R.S(c.t, 'ping', { f: 880, peak: 0.04, decay: 0.55 }); R.S(c.t + 0.1, 'ping', { f: 1318.5, peak: 0.04, decay: 0.55 }); }],
  ['messenger-pop', 'two engine chimes a fifth apart, 0.1 s', (R, c) => { R.E(c.t, 'fx', 'chime', { intensity: 0.5, pitch: 1 }, 0.6); R.E(c.t + 0.1, 'fx', 'chime', { intensity: 0.5, pitch: 1.5 }, 0.6); }],
  ['messenger-pop', 'two engine drips (note 0, 3), 0.1 s', (R, c) => { R.E(c.t, 'fx', 'drip', { intensity: 0.6, note: 0 }, 0.8); R.E(c.t + 0.1, 'fx', 'drip', { intensity: 0.6, note: 3 }, 0.8); }],
  ['alarm', 'beep-beep with 2 ms scoops', (R, c) => { sbeep(R, c.t, 3000, 0.05); sbeep(R, c.t + 0.15, 3000, 0.05); }],
  ['alarm', '3 scooped beeps x2 groups (beep-beep-beep, pause)', (R, c) => { for (const g of [0, 1.0]) for (let k = 0; k < 3; k++) sbeep(R, c.t + g + k * 0.12, 2800, 0.06); }],
  ['alarm', '3 beeps every 1 s, 0.55 s ring (pings)', (R, c) => { for (let k = 0; k < 4; k++) R.S(c.t + k * 1.0, 'ping', { f: 2500, peak: 0.03, decay: 0.55 }); }],
  ['alarm', '4 engine clicks every 1 s', (R, c) => { for (let k = 0; k < 4; k++) R.E(c.t + k * 1.0, 'fx', 'click', { intensity: 0.6 }, 0.8); }],
  ['alarm', '3 scooped beeps every 1.5 s', (R, c) => { for (let k = 0; k < 3; k++) sbeep(R, c.t + k * 1.5, 2500); }],
  ['heartbeat', 'lub-dub, 0.36 s decay (dur > 0.35)', (R, c) => { R.S(c.t, 'blip', { f: 60, f1: 45, a: 0.004, d: 0.36, peak: 0.08 }); R.S(c.t + 0.28, 'blip', { f: 55, f1: 42, a: 0.004, d: 0.36, peak: 0.06 }); }],
  ['heartbeat', 'lub-dub, 55 ms attack', (R, c) => { R.S(c.t, 'blip', { f: 60, f1: 45, a: 0.055, d: 0.12, peak: 0.08 }); R.S(c.t + 0.28, 'blip', { f: 55, f1: 42, a: 0.055, d: 0.1, peak: 0.06 }); }],
  ['heartbeat', 'lub-dub with a 15 ms high click on each beat', (R, c) => { for (const o of [0, 0.28]) { R.S(c.t + o, 'blip', { f: 60, f1: 45, d: 0.12, peak: 0.08 }); R.S(c.t + o, 'noiseHit', { filter: 'highpass', f: 2000, a: 0.002, d: 0.015, peak: 0.09 }); } }],
  ['heartbeat', 'lub-dub on the engine thrum', (R, c) => { R.E(c.t, 'fx', 'thrum', { intensity: 0.6 }, 0.8); R.E(c.t + 0.28, 'fx', 'thrum', { intensity: 0.5 }, 0.7); }],
  ['heartbeat', 'lub-dub on the engine settle', (R, c) => { R.E(c.t, 'fx', 'settle', { intensity: 0.6 }, 0.8); R.E(c.t + 0.28, 'fx', 'settle', { intensity: 0.5 }, 0.7); }],
  ['heartbeat', 'lub-dub 270 Hz tom-ish (energy ~255 Hz)', (R, c) => { R.S(c.t, 'blip', { f: 290, f1: 230, d: 0.12, peak: 0.08 }); R.S(c.t + 0.28, 'blip', { f: 280, f1: 220, d: 0.1, peak: 0.06 }); }],
  ['jump-scare', 'engine snap at intensity 0.8, trim 1 (A 0.89)', (R, c) => R.E(c.t, 'fx', 'snap', { intensity: 0.8 }, 1)],
  ['jump-scare', 'engine crackle 0.8 + synth hit just under the limit', (R, c) => { R.E(c.t, 'fx', 'crackle', { intensity: 0.8 }, 1); R.S(c.t, 'noiseHit', { filter: 'lowpass', f: 5000, a: 0.003, d: 0.4, peak: 0.12 }); }],
];

test('the M0 acceptance set: all 27 WP-04 round-3 reviewer probes are rejected, each in its own category', () => {
  assert.equal(R3_PROBES.length, 27);
  const missed = R3_PROBES.filter(([cat, , emit]) => !has(recipe('t/x', emit), cat)).map(([cat, name, emit]) => `${cat}: ${name} → ${rules(recipe('t/x', emit)).join(', ') || 'passes'}`);
  assert.deepEqual(missed, []);
});

test('every probe class past its boundary: telephone rings, scooped signals, pitched engine voices, heartbeats, engine jump scares', () => {
  const cases = [
    // telephone rings at other pitches and cadences
    ['ringtone', 'a dual-tone ring an octave up (880+960 Hz)', (R, c) => { for (const o of [0, 0.6]) for (const f of [880, 960]) R.S(c.t + o, 'blip', { f, a: 0.01, h: 0.4, d: 0.03, peak: 0.03 }); }],
    ['ringtone', 'a dual-tone ring on triangles, 0.5 s on every 2 s', (R, c) => { for (const o of [0, 2]) for (const f of [425, 475]) R.S(c.t + o, 'blip', { type: 'triangle', f, a: 0.01, h: 0.5, d: 0.03, peak: 0.03 }); }],
    ['ringtone', 'the 425 Hz European ring: 1 s on, 4 s off', (R, c) => { for (const o of [0, 5]) R.S(c.t + o, 'blip', { f: 425, a: 0.01, h: 1, d: 0.05, peak: 0.03 }); }],
    ['ringtone', 'a 25 Hz trill held 1.2 s', (R, c) => R.S(c.t, 'blip', { f: 1200, a: 0.005, h: 1.2, d: 0.05, peak: 0.03, vib: { cents: 200, rate: 25, decay: 5 } })],
    // signals whose onsets are scooped, at any depth
    ['alarm', 'beep-beep, 2400-cent scoops in 2 ms', (R, c) => { for (const o of [0, 0.15]) R.S(c.t + o, 'blip', { f: 3000 / 4, f1: 3000, glide: 0.002, a: 0.004, d: 0.05, peak: 0.04 }); }],
    ['messenger-pop', 'a two-tone with 600-cent scoops in 2 ms', (R, c) => { for (const [o, f] of [[0, 880], [0.08, 1318.5]]) R.S(c.t + o, 'blip', { f: f / Math.SQRT2, f1: f, glide: 0.002, a: 0.004, d: 0.05, peak: 0.04 }); }],
    ['alarm', '3 beeps scooped over their whole 4 ms attack (110 cents)', (R, c) => { for (let k = 0; k < 3; k++) R.S(c.t + k * 0.5, 'blip', { f: 2500 / Math.pow(2, 110 / 1200), f1: 2500, glide: 0.004, a: 0.004, d: 0.06, peak: 0.04 }); }],
    // pitched engine voices
    ['ringtone', 'a 3-note figure on the engine glass, played again', (R, c) => { for (let rep = 0; rep < 2; rep++) [0, 2, 4].forEach((n, k) => R.E(c.t + rep * 0.6 + k * 0.2, 'fx', 'glass', { intensity: 0.4, note: n }, 0.5)); }],
    ['messenger-pop', 'two engine plucks a fifth apart', (R, c) => { R.E(c.t, 'fx', 'pluck', { intensity: 0.4, note: 0 }, 0.5); R.E(c.t + 0.1, 'fx', 'pluck', { intensity: 0.4, note: 3 }, 0.5); }],
    ['messenger-pop', 'two engine bubbles a fifth apart, 0.12 s', (R, c) => { R.E(c.t, 'fx', 'bubble', { intensity: 0.6, note: 0 }, 0.6); R.E(c.t + 0.12, 'fx', 'bubble', { intensity: 0.6, note: 3 }, 0.6); }],
    ['alarm', 'an engine chime four times at 0.9 s', (R, c) => { for (let k = 0; k < 4; k++) R.E(c.t + k * 0.9, 'fx', 'chime', { intensity: 0.3, pan: 0.3 }, 0.2); }],
    ['alarm', 'engine plucks three times at 0.5 s', (R, c) => { for (let k = 0; k < 3; k++) R.E(c.t + k * 0.5, 'fx', 'pluck', { intensity: 0.4 }, 0.5); }],
    ['alarm', 'the engine rotate-tick four times at 0.8 s', (R, c) => { for (let k = 0; k < 4; k++) R.E(c.t + k * 0.8, 'fx', 'rotate-tick', { intensity: 0.4 }, 0.6); }],
    // heartbeats past each old boundary
    ['heartbeat', 'lub-dub, 0.6 s decay tails', (R, c) => { R.S(c.t, 'blip', { f: 60, f1: 45, a: 0.004, d: 0.6, peak: 0.08 }); R.S(c.t + 0.3, 'blip', { f: 55, f1: 42, a: 0.004, d: 0.6, peak: 0.06 }); }],
    ['heartbeat', 'lub-dub, 120 ms attacks 0.3 s apart', (R, c) => { R.S(c.t, 'blip', { f: 60, f1: 45, a: 0.12, d: 0.12, peak: 0.08 }); R.S(c.t + 0.3, 'blip', { f: 55, f1: 42, a: 0.12, d: 0.1, peak: 0.06 }); }],
    ['heartbeat', 'lub-dub with its energy at ~ 320 Hz', (R, c) => { R.S(c.t, 'blip', { f: 340, f1: 280, d: 0.12, peak: 0.06 }); R.S(c.t + 0.28, 'blip', { f: 330, f1: 270, d: 0.1, peak: 0.05 }); }],
    ['heartbeat', 'lub-dub on the engine drop-in\'s thump', (R, c) => { R.E(c.t, 'fx', 'drop-in', { intensity: 0.5 }, 0.5); R.E(c.t + 0.28, 'fx', 'drop-in', { intensity: 0.4 }, 0.5); }],
    ['heartbeat', 'lub-dub, each beat after a quieter tick', (R, c) => { for (const o of [0, 0.3]) { R.S(c.t + o - 0.05, 'blip', { f: 2000, d: 0.02, peak: 0.01 }); R.S(c.t + o, 'blip', { f: 60, f1: 45, d: 0.12, peak: 0.08 }); } }],
    // jump scares through the engine and noise below the bright band
    ['jump-scare', 'engine snap at intensity 0.6, trim 0.8', (R, c) => R.E(c.t, 'fx', 'snap', { intensity: 0.6 }, 0.8)],
    ['jump-scare', 'a kit voice at full force', (R, c) => R.E(c.t, 'mallow', 'surprise', { intensity: 1 }, 0.6)],
    ['jump-scare', 'a 4 kHz low-passed noise burst', (R, c) => R.S(c.t, 'noiseHit', { filter: 'lowpass', f: 4000, a: 0.003, d: 0.3, peak: 0.1 })],
    ['jump-scare', 'engine crackle at full intensity plus a quiet hit', (R, c) => { R.E(c.t, 'fx', 'crackle', { intensity: 1 }, 1); R.S(c.t, 'noiseHit', { filter: 'lowpass', f: 3000, a: 0.003, d: 0.3, peak: 0.06 }); }],
  ];
  const missed = cases.filter(([cat, , emit]) => !has(recipe('t/x', emit), cat)).map(([cat, name, emit]) => `${cat}: ${name} → ${rules(recipe('t/x', emit)).join(', ') || 'passes'}`);
  assert.deepEqual(missed, []);
});

test('the engine fx model: pitched voices carry their pitch, levels follow A × trim, pan 0 is mono, the Mallow\'s gestures stay opaque', () => {
  const fx = (name, opts = {}, trim = 1) => sounds({ engine: [{ t: 1, kind: 'fx', name, opts, trim }] });
  for (const name of Object.keys(ENGINE_FX)) {
    const ps = fx(name, { intensity: 0.6, note: 2, duration: 2 });
    assert.ok(ps.length >= 1 && ps.every((p) => Number.isFinite(p.eff) && p.eff > 0 && p.dur > 0 && Number.isFinite(p.hz)), name);
  }
  // pitches as the engine plays them (audio.js FX): chime 880·P, pluck 392·P·penta(note), glass 1046.5·penta(note)
  assert.equal(fx('chime', { pitch: 1.5 })[0].hz, 1320);
  assert.ok(Math.abs(fx('pluck', { note: 3 }).find((p) => p.wave === 'triangle').hz - 392 * Math.pow(2, 7 / 12)) < 1e-6);
  assert.ok(Math.abs(fx('glass', { note: 6 })[0].hz - 1046.5 * Math.pow(2, 14 / 12)) < 1e-6, 'penta(6): the second octave\'s step 1');
  assert.ok(fx('drip')[0].chirp && fx('bubble')[0].chirp, 'a drip and a bubble glide');
  assert.ok(fx('click')[0].steady && fx('thrum')[0].steady, 'a click and a thrum hold their pitch');
  // level: A = 0.45 + 0.55 × intensity, times trim; a voice at pan 0 reaches both channels at full gain (+3 dB)
  const eff = (o, trim) => fx('chime', o, trim)[0].eff;
  assert.ok(Math.abs(eff({ intensity: 1, pan: 0.5 }, 0.5) / eff({ intensity: 0, pan: 0.5 }, 0.5) - 1 / 0.45) < 1e-9);
  assert.ok(Math.abs(eff({ pan: 0.5 }, 0.25) * 2 - eff({ pan: 0.5 }, 0.5)) < 1e-12);
  assert.ok(Math.abs(eff({}, 0.5) / eff({ pan: 0.5 }, 0.5) - Math.SQRT2) < 1e-9);
  assert.ok(Math.abs(fx('swish', {})[0].eff - fx('swish', { pan: 0.5 })[0].eff) < 1e-12, 'noise buffers are stereo already');
  // a cut fades the voice
  const cut = sounds({ engine: [{ t: 1, kind: 'fx', name: 'chime', opts: {}, trim: 1, cut: { at: 1.2, fade: 0.05 } }] })[0];
  assert.ok(cut.dur <= 0.25 + 1e-9 && cut.level(0.3) === 0);
  // opaque: the Mallow's gestures, hold-based fx and unknown names
  for (const e of [{ kind: 'mallow', name: 'surprise' }, { kind: 'fx', name: 'charge' }, { kind: 'fx', name: 'no-such-fx' }]) {
    const [p, ...rest] = sounds({ engine: [{ t: 1, opts: {}, trim: 1, ...e }] });
    assert.ok(p.opaque && !p.pitched && rest.length === 0, e.name);
  }
});

test('whole score plans: the approved and every default plan are clean with the sparkle cloud as texture; nothing else passes as a sparkle', () => {
  const log = readJson(studioPath('output', 'v2', 'cues.json'));
  const dir = readJson(studioPath('specs', 'golden', 't01-v2.direction.json')), spec = readJson(studioPath('specs', 'golden', 't01-v2.json'));
  const planLint = (plan, mallow, panSeed, extra = []) => {
    const texture = sparkleTexture(plan, { log, mallow, panSeed });
    return { texture, findings: lintEvents({ engine: plan.engine, synth: [...plan.synth, ...extra] }, { texture }).map((f) => f.rule) };
  };
  // the approved score: its 25 sparkles regenerated exactly, the rest clean; without the texture the cloud reads as pops and trains
  const compat = buildScore({ log }, { compat: 'v2-score' }).plan;
  const v2 = planLint(compat, 'noomi', V2_SEED);
  assert.equal(v2.texture.size, compat.synth.filter((e) => e.inst === 'ping').length);
  assert.equal(v2.texture.size, 25);
  assert.deepEqual(v2.findings, []);
  assert.deepEqual(planLint(readJson(studioPath('qa', 'golden', 'v2', 'plan-v2.json')), 'noomi', V2_SEED).findings, []);
  assert.ok(lintEvents({ engine: compat.engine, synth: compat.synth }).length > 0, 'the cloud alone is full of chance patterns');
  // every Mallow and every contour, the pan seed varied across them (WORK/fu2: 701 plans over 25 seeds, docs/wp/FU-2.md)
  const flagged = [], seeds = [V2_SEED, 7, 4242, 99, 123456];
  let n = 0;
  for (const mallow of ['noomi', 'glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi']) for (const contour of ['arch-1', 'arch-2', 'rise-1', 'rise-2']) {
    const panSeed = seeds[n++ % seeds.length];
    const { plan } = buildScore({ log, direction: { ...dir, mallow: { ...dir.mallow, id: mallow } }, spec }, { sound: { panSeed, contour } });
    const r = planLint(plan, mallow, panSeed);
    if (!r.texture.size || r.findings.length) flagged.push(`${mallow} ${contour} ${panSeed}: ${r.texture.size} sparkles, ${r.findings.join(', ')}`);
  }
  assert.deepEqual(flagged, []);
  // a ping that is not the layer's own (a forged or moved sparkle) is linted like any note
  const forged = compat.synth.filter((e) => e.inst === 'ping').slice(0, 2).map((e) => ({ ...e, peak: 0.04 }));
  const f = planLint({ ...compat, synth: [...compat.synth.filter((e) => e.inst !== 'ping'), ...forged] }, 'noomi', V2_SEED);
  assert.equal(f.texture.size, 0);
  // a banned pattern played inside the cloud is caught
  const t0 = compat.synth.find((e) => e.inst === 'ping').t;
  const inCloud = [0, 0.15].map((o) => ({ t: t0 + 0.4 + o, inst: 'blip', f: 3000, a: 0.004, d: 0.05, peak: 0.04 }));
  assert.ok(planLint(compat, 'noomi', V2_SEED, inCloud).findings.includes('banned:alarm'), 'beep-beep inside the sparkles');
});

test('patterns spread over several cues are caught on the whole score (lintEvents)', () => {
  const each = recipe('t/dot', (R, c) => beep(R, c.t, 1800));
  assert.deepEqual(rules(each), [], 'one beep per cue is clean on its own');
  const ev = { engine: [], synth: [] };
  for (const t of [1, 1.4, 1.8, 2.2]) { const p = probe(each, t); ev.synth.push(...p.synth); }
  assert.deepEqual(lintEvents(ev).map((f) => f.rule), ['banned:alarm']);
  const thud = recipe('t/thud1', (R, c) => R.S(c.t, 'blip', { f: 70, f1: 50, d: 0.12, peak: 0.05 }));
  const hb = { engine: [], synth: [] };
  for (const t of [1, 1.28]) hb.synth.push(...probe(thud, t).synth);
  assert.deepEqual(lintEvents(hb).map((f) => f.rule), ['banned:heartbeat'], 'a lub on one cue and a dub on the next');
});

test('silence is declared; sounding recipes sound', () => {
  assert.deepEqual(rules(recipe('t/quiet', () => {}, { role: 'marker' })), ['silence'], 'a marker says why it is silent');
  assert.deepEqual(rules(recipe('t/quiet', () => {}, { role: 'marker', silent: 'the text carries it' })), []);
  assert.deepEqual(rules(recipe('t/noisy', (R, c) => beep(R, c.t, 900), { role: 'anchor', silent: 'x' })), ['silence']);
  assert.deepEqual(rules(recipe('t/empty', () => {})), ['silence'], 'a foley recipe that plays nothing');
  assert.deepEqual(rules(recipe('t/odd', () => {}, { role: 'music', silent: 'x' })), ['role', 'silence']);
});

test('no absolute times: a recipe whose events do not move with its cue is rejected', () => {
  assert.deepEqual(rules(recipe('t/clock', (R) => beep(R, 2.9, 900))), ['absolute-time']);
  assert.deepEqual(rules(recipe('t/drift', (R, c) => beep(R, c.t, 900 + 10 * c.t))), ['absolute-time']);
  assert.deepEqual(rules(recipe('t/fine', (R, c) => R.E(c.t + 0.1, 'mallow', 'squeeze', { intensity: 0.4 }, 0.2, { at: c.t + 0.3, fade: 0.05 }))), []);
});

test('coverage: the golden direction is fully covered; a move naming a missing recipe or the wrong cue type is caught', () => {
  const d = readJson(studioPath('specs', 'golden', 't01-v2.direction.json'));
  assert.deepEqual(lintCoverage(d, MOVES), []);
  const moves = { ...MOVES, 'TURN-SQUEEZE': { ...MOVES['TURN-SQUEEZE'], cues: { squeeze: { recipe: 'v2/sqeeze' } } } };
  assert.deepEqual(lintCoverage(d, moves).map((f) => f.rule), ['coverage:recipe', 'coverage:cue']);
  const wrong = { ...MOVES, 'TURN-SQUEEZE': { ...MOVES['TURN-SQUEEZE'], cues: { squeeze: { recipe: 'v2/crest' } } } };
  assert.deepEqual(lintCoverage(d, wrong).map((f) => f.rule), ['coverage:type']);
});
