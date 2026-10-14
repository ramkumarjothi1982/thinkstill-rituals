// audio/lint-recipes.mjs + audio/lint-shapes.mjs: banned recipes (ringtone, alarm,
// heartbeat, messenger pop, jump scare) are rejected by name and by shape, under
// any name and at any pitch, interval, attack or level; the approved v2 sounds
// pass, alone and repeated by a direction; silence is declared; recipes never name
// absolute times; every cue has a recipe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lintRecipe, lintRecipes, lintCoverage, lintEvents, shapes, probe, calibrateLoud, LOUD, SHAPE } from '../../audio/lint-recipes.mjs';
import { RECIPES } from '../../audio/recipes/index.mjs';
import { buildScore } from '../../audio/score.mjs';
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

test('each limit, walked from both sides', () => {
  const N = SHAPE.note, L = SHAPE.lubDub;
  // a beep vs a chime: a struck steady tone up to 0.5 s is a signal note; three of them at 0.5 s are an alarm, three chimes are not
  const dings = (decay) => { const s = []; for (let k = 0; k < 3; k++) s.push({ t: 1 + k * 0.5, inst: 'bell', f: 1568, peak: 0.02, decay }); return s; };
  assert.ok(shaped(dings(N.maxStruck)).includes('alarm'), `bells ringing ${N.maxStruck} s are beeps`);
  assert.deepEqual(shaped(dings(N.maxStruck + 0.05)), [], 'longer-ringing bells are chimes');
  // a beep holds its pitch: 99 cents of glide is still a beep, 110 is a chirp (three chirps are a gag, four at 0.25 s a machine)
  const train = (n, glide) => Array.from({ length: n }, (_, k) => ({ t: 1 + k * 0.25, inst: 'blip', f: 2000, f1: 2000 * Math.pow(2, glide / 1200), glide: 0.02, a: 0.004, d: 0.06, peak: 0.04 }));
  assert.ok(shaped(train(3, SHAPE.steadyCents - 1)).includes('alarm'));
  assert.deepEqual(shaped(train(3, SHAPE.steadyCents + 10)), []);
  assert.ok(shaped(train(SHAPE.mechanical.fast, SHAPE.steadyCents + 10)).includes('alarm'));
  // drift: each repeat may move ≤ 150 cents (below a whole tone); a whole-tone step is a melody
  const climb = (step) => Array.from({ length: 4 }, (_, k) => ({ t: 1 + k * 0.6, inst: 'blip', f: 1500 * Math.pow(2, (k * step) / 1200), a: 0.004, d: 0.06, peak: 0.04 }));
  assert.ok(shaped(climb(SHAPE.drift)).includes('alarm'));
  assert.ok(!shaped(climb(200)).includes('alarm'), 'a whole-tone scale of beeps is not one beep repeating');
  // trains: up to 4 s apart
  const slow = (gap) => Array.from({ length: 3 }, (_, k) => ({ t: 1 + k * gap, inst: 'blip', f: 2500, a: 0.004, d: 0.06, peak: 0.04 }));
  assert.ok(shaped(slow(SHAPE.train.maxGap)).includes('alarm'));
  assert.deepEqual(shaped(slow(SHAPE.train.maxGap + 0.2)), []);
  // a lub-dub: two body thumps 0.15–0.45 s apart, standing out from their neighbours; 250 Hz and below
  const thump = (t, f) => ({ t, inst: 'blip', f, f1: f * 0.75, d: 0.12, peak: 0.05 });
  assert.ok(shaped([thump(1, 80), thump(1 + L.max, 70)]).includes('heartbeat'));
  assert.deepEqual(shaped([thump(1, 80), thump(1 + L.max + 0.02, 70)]), []);
  assert.deepEqual(shaped([thump(1, 80), thump(1 + L.min - 0.02, 70)]), []);
  assert.ok(shaped([thump(1, 260), thump(1.3, 260)]).includes('heartbeat'), '260 → 195 Hz: its energy sits at ~ 240 Hz');
  assert.deepEqual(shaped([thump(1, 320), thump(1.3, 320)]), [], 'a tom at ~ 300 Hz is above the heart\'s sounds');
  assert.deepEqual(shaped([thump(1, 80), thump(1.3, 80), thump(1.6, 80)]), [], 'evenly spaced thumps bounce; they do not beat like a heart');
  // a pop: two signal notes ≤ 0.3 s apart, at least a whole tone apart
  const two = (gap, st) => [{ t: 1, inst: 'blip', f: 1000, a: 0.004, d: 0.1, peak: 0.04 }, { t: 1 + gap, inst: 'blip', f: 1000 * Math.pow(2, st / 12), a: 0.004, d: 0.1, peak: 0.04 }];
  assert.ok(shaped(two(SHAPE.pop.max, 2)).includes('messenger-pop'));
  assert.ok(shaped(two(0.1, -2)).includes('messenger-pop'));
  assert.deepEqual(shaped(two(SHAPE.pop.max + 0.05, 2)), []);
  assert.deepEqual(shaped(two(0.1, 1.5)), []);
  // jump scare: v2's fastest 50 ms rise + 3 dB
  const hit = (peak) => [{ t: 1, inst: 'blip', f: 300, a: 0.011, d: 0.5, peak }];
  const at = LOUD.rise / Math.SQRT1_2;
  assert.ok(shaped(hit(at * 1.02)).includes('jump-scare'));
  assert.deepEqual(shaped(hit(at * 0.98)), []);
  // a slow swell is a crescendo, not a scare
  assert.deepEqual(shaped([{ t: 1, inst: 'air', a: 1, r: 1, f0: 600, f1: 900, q: 0.8, peak: 0.25 }]), []);
});

test('no false alarms: musical figures the brand uses pass the shapes', () => {
  clean(recipe('t/arp', (R, c) => [523.25, 659.25, 783.99].forEach((f, k) => R.S(c.t + k * 0.11, 'bell', { f, peak: 0.02, decay: 0.7 }))), 'a rising arpeggio of chimes');
  clean(recipe('t/pair', (R, c) => { R.S(c.t, 'bell', { f: 784, peak: 0.022, decay: 0.7 }); R.S(c.t + 0.11, 'bell', { f: 1046.5, peak: 0.017, decay: 0.8 }); }), 'v2\'s MO-CLOSE celesta pair');
  clean(recipe('t/glide', (R, c) => { beep(R, c.t, 420); R.S(c.t + 0.2, 'blip', { f: 600, f1: 300, glide: 0.1, d: 0.2, peak: 0.03 }); }), 'a note and a glide');
  clean(recipe('t/two', (R, c) => { R.E(c.t, 'fx', 'swish', { intensity: 0.15, pitch: 0.8 }, 0.7); R.E(c.t + 0.35, 'fx', 'swish', { intensity: 0.15, pitch: 0.8 }, 0.7); }), 'two glances');
  clean(recipe('t/three', (R, c) => { for (let k = 0; k < 3; k++) R.E(c.t + k * 0.4, 'fx', 'snap', { intensity: 0.3 }, 0.3); }), 'three snaps (a gag, not a machine)');
  clean(recipe('t/chirps', (R, c) => { for (let k = 0; k < 3; k++) R.S(c.t + k * 0.3, 'blip', { f: 1400, f1: 1176, glide: 0.022, a: 0.0015, d: 0.04, peak: 0.06 }); }), 'three blink chirps');
  clean(recipe('t/chimes', (R, c) => { for (let k = 0; k < 3; k++) R.S(c.t + k * 0.5, 'bell', { f: 1568, peak: 0.02, decay: 0.6 }); }), 'three identical chimes');
  clean(recipe('t/bounce', (R, c) => { for (let k = 0; k < 3; k++) R.S(c.t + k * 0.35, 'blip', { f: 90, f1: 60, d: 0.12, peak: 0.05 }); }), 'three even bounces');
  clean(recipe('t/hits', (R, c) => { for (let k = 0; k < 6; k++) R.S(c.t + k * 0.009, 'noiseHit', { filter: 'lowpass', f: 3000 + 50 * k, a: 0.003, d: 0.4, peak: 0.12 }); }), 'six quiet hits within 50 ms stay within 3 dB of v2\'s landing');
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

test('jump-scare limits are v2\'s own maxima + 3 dB (recomputed from the approved recipes and the approved v2 score)', () => {
  const log = readJson(studioPath('output', 'v2', 'cues.json'));
  const { plan } = buildScore({ log }, { compat: 'v2-score' });
  const v2 = calibrateLoud(RECIPES, [{ engine: plan.engine, synth: plan.synth }]);
  for (const k of ['rise', 'riser', 'bright']) assert.ok(Math.abs(LOUD[k] / (v2[k] * Math.SQRT2) - 1) < 0.01, `${k}: limit ${LOUD[k]}, v2 ${v2[k].toFixed(4)} + 3 dB = ${(v2[k] * Math.SQRT2).toFixed(4)}`);
  assert.ok(LOUD.engine > v2.engine, `engine: ${LOUD.engine} over v2's ${v2.engine}`);
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
