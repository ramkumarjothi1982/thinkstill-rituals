// Original score for "Feel Something?" v3 (videos/feel-something-v3.js), synthesised in code.
//
//   node audio/score-feel-v3.mjs <cues.json> <out dir> [--treatment t1|t2|t3]
//     → <out>/score.wav (mastered), <out>/stems/{pads,lead,rhythm,sfx,bed}.wav, <out>/score-report.json
//
// Rendered offline in headless Chromium (audio/render-offline.mjs) through the app's own
// Hushmallow sound engine (each Mallow speaks in its own voice) plus the studio's instruments.
// No samples, no music library, no paid or cloud services.
//
// One signature theme, the Hushmallow theme, grown out of the "hush-mal-low" logo motif
// (G E C': a fall of a third, then a leap of a sixth). 96 BPM, the 20 s loop = 8 bars, and the
// harmony follows the emotional journey rather than a loop of four chords:
//
//   bar 1  Am9 · Fmaj7         CURIOSITY      the theme's question, sung by the Mallow voice over
//                                             a slow, dragging drone; two heartbeats under the light
//   bar 2  Dm9 · Fm6           VULNERABILITY  the floor drops away: drone, felt piano, the voice
//                                             alone; the borrowed minor iv (A♭) is the tear
//   bar 3  C/E · Fmaj9         CONNECTION     warmth arrives with Blubi: bass, choir "oo", a soft
//                                             pulse; the hug lands on Fmaj9
//   bar 4  Dm9 Em7 Fmaj7 G6sus WONDER         the bass climbs one step per arrival, the voice climbs
//                                             with it, a swirling arpeggio and a riser build
//   bar 5  C · G/B             JOY            the drop on Boppo's landing: the theme at full height,
//                                             the whole band, the pile bouncing on the beat
//   bar 6  Am9 · Fmaj9         BELONGING      half time, choir and voice, the slow blink as a chime,
//                                             your light landing as a music box
//   bar 7  C · Fmaj9/C         BRAND          the logo motif rings out; home, then the warm plagal
//   bar 8  Am9 · G6sus                        the theme's last phrase climbs back into bar 1 (G6sus →
//                                             Am9: the loop never quite ends)
//
// Treatments (same theme, same character sounds; the arrangement differs):
//   t1  dream-pop electronic (primary): Mallow-voice lead, drone, supersaws, sub, claps and hats
//   t2  felt piano and strings: piano lead, string ensemble, choir, marimba, soft kick / pulse
//   t3  hypnotic lullaby: music box and voice, a heavy swirling drone, a constant heartbeat, no drop

import fs from 'node:fs';
import path from 'node:path';
import { renderMix, masterToWav, writeWav24, openRenderer, SR as RSR } from './render-offline.mjs';
import { mulberry32 } from './soundtrack.mjs';

const SR = 48000, PRE = 1.0, TAIL = 4.0, XFADE = 1.0, SEED = 20261015;
const BEAT = 0.625, BAR = 4 * BEAT;
const bt = (n) => n * BEAT;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const NOTE = (s) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return 12 * (Number(m[3]) + 1) + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const N = (x) => (typeof x === 'string' ? NOTE(x) : x);

// harmony: bass root (octave 2) and an upper voicing around middle C
const CH = {
  Am9: { root: 45, v: [60, 64, 67, 71] }, Fmaj7: { root: 41, v: [57, 60, 64, 69] }, Dm9: { root: 38, v: [57, 60, 64, 65] },
  Fm6: { root: 41, v: [56, 60, 62, 65] }, 'C/E': { root: 40, v: [55, 60, 62, 67] }, Fmaj9: { root: 41, v: [57, 60, 64, 67] },
  Em7: { root: 40, v: [55, 59, 62, 64] }, G6sus: { root: 43, v: [55, 60, 62, 64] }, C: { root: 36, v: [60, 64, 67, 72] },
  'G/B': { root: 47, v: [55, 59, 62, 67] }, 'Fmaj9/C': { root: 36, v: [57, 60, 64, 67] },
};
const PROG = [[0, 'Am9'], [2, 'Fmaj7'], [4, 'Dm9'], [6, 'Fm6'], [8, 'C/E'], [10, 'Fmaj9'], [12, 'Dm9'], [13, 'Em7'], [14, 'Fmaj7'], [15, 'G6sus'],
  [16, 'C'], [18, 'G/B'], [20, 'Am9'], [22, 'Fmaj9'], [24, 'C'], [26, 'Fmaj9/C'], [28, 'Am9'], [30, 'G6sus']];
const chordAtBeat = (b) => { const x = ((b % 32) + 32) % 32; let k = 0; while (k + 1 < PROG.length && PROG[k + 1][0] <= x + 1e-6) k++; return CH[PROG[k][1]]; };
const spans = () => PROG.map(([b0, name], k) => ({ b0, b1: k + 1 < PROG.length ? PROG[k + 1][0] : 32, name, c: CH[name] }));

// the Hushmallow theme: [beat, note, beats, velocity]
const THEME = [
  [0, 'G5', 1, 0.85], [1, 'E5', 0.5, 0.75], [1.5, 'C6', 1.5, 0.9], [3, 'B5', 0.5, 0.7], [3.5, 'A5', 0.5, 0.7],                 // the question
  [4.12, 'G5', 1.3, 0.6], [5.62, 'F5', 0.45, 0.5], [6.25, 'Ab5', 1.15, 0.66], [7.45, 'G5', 0.5, 0.5],                           // the tear (played behind the beat)
  [8, 'E5', 1, 0.75], [9, 'G5', 0.5, 0.75], [9.5, 'C6', 1.5, 0.9], [11, 'D6', 0.5, 0.75], [11.5, 'C6', 0.5, 0.7],              // warmth
  [12, 'A5', 1, 0.72], [13, 'B5', 1, 0.78], [14, 'C6', 1, 0.84], [15, 'D6', 1, 0.9],                                         // one step per arrival
  [16, 'E6', 1, 1.0], [17, 'D6', 0.5, 0.85], [17.5, 'C6', 0.5, 0.85], [18, 'D6', 1, 0.9], [19, 'B5', 0.5, 0.8], [19.5, 'G5', 0.5, 0.8],   // joy
  [20, 'G5', 1, 0.8], [21, 'E5', 0.5, 0.7], [21.5, 'C6', 1.5, 0.85], [23, 'B5', 0.5, 0.65], [23.5, 'A5', 0.5, 0.65],           // belonging
  [24, 'C6', 1, 0.85], [25, 'G5', 0.5, 0.75], [25.5, 'E5', 0.5, 0.75], [26, 'A5', 1.5, 0.8], [27.5, 'G5', 0.5, 0.7],           // home
  [28, 'E5', 1.5, 0.7], [29.5, 'D5', 0.5, 0.6], [30, 'C5', 0.5, 0.6], [30.5, 'D5', 0.5, 0.65], [31, 'E5', 1, 0.7],             // back to the question
];
const SECTION = (b) => (b < 4 ? 'curiosity' : b < 8 ? 'vulnerability' : b < 12 ? 'connection' : b < 16 ? 'wonder' : b < 20 ? 'joy' : b < 24 ? 'belonging' : b < 28 ? 'brand' : 'tag');

export function buildPlan(log, { treatment = 't1' } = {}) {
  const { duration: DUR, cues } = log;
  if (Math.abs(DUR - 32 * BEAT) > 1e-9) throw new Error(`score-feel-v3: expects the 32-beat (20 s) loop, got ${DUR} s`);
  const TR = treatment;
  const rnd = mulberry32(SEED);
  const synth = [], engine = [];
  // instrument balance (set by ear-proxy review: audio/README, tools/audio-review.py --profile v3)
  const GAIN = { sub: 0.33, bass: 0.6, kick: 0.72, pulse: 0.75, vox: 2.2, drone: 2.4, swell: 2.2, pluck: 1.8, saw: 2.6, choir: 2.0, clap: 1.1, hat: 1.3 };
  // section dynamics: the drums drive the wonder and the drop; the opening is a touch fuller
  const SEC_GAIN = TR === 't3'
    ? { rhythm: { vulnerability: 0.6, joy: 1.3 }, pads: { vulnerability: 0.6, joy: 1.15 }, lead: { curiosity: 1.15, joy: 1.2 } }
    : { rhythm: { wonder: 1.3, joy: 1.75, brand: 1.2 }, pads: { curiosity: 1.25, vulnerability: 0.72 }, lead: { curiosity: 1.2, vulnerability: 0.85 } };
  const S = (stem, t, inst, p) => {
    const g = (GAIN[inst] ?? 1) * (SEC_GAIN[stem]?.[SECTION(((t / BEAT) % 32 + 32) % 32)] ?? 1);
    synth.push({ stem, t, inst, ...p, ...(p.peak !== undefined ? { peak: p.peak * g } : {}) });
  };
  const E = (t, kind, name, opts = {}, trim = 1, kit = null) => engine.push({ t, kind, name, opts, trim, cut: null, ...(kit ? { kit } : {}) });
  const of = (type) => cues.filter((c) => c.type === type);
  const cue1 = (type, k = 0) => of(type)[k];

  // ================================================================ the theme
  const sec = (b) => SECTION(b);
  const voice = (t, m, beats, v, from, opt = {}) => {
    const s = sec(t / BEAT);
    const vowel = s === 'joy' ? 'ah' : s === 'brand' ? 'oh' : 'oo';
    const peak = 0.0105 * v * ({ vulnerability: 0.7, curiosity: 0.9, joy: 1.15, belonging: 0.85 }[s] ?? 1);
    const p = { f: hz(m), len: beats * BEAT * 0.92, peak, vowel, pan: 0, send: s === 'vulnerability' ? 0.65 : 0.45, vib: s === 'vulnerability' ? 22 : 15, from: from ? hz(from) : 0, glide: 0.07, ...opt };
    S('lead', t, 'vox', p);
    // ping-pong echoes (a dotted eighth): the voice circles the listener
    S('lead', t + 0.75 * BEAT, 'vox', { ...p, peak: p.peak * 0.3, pan: -0.65, lp: 2600, send: 0.6 });
    S('lead', t + 1.5 * BEAT, 'vox', { ...p, peak: p.peak * 0.12, pan: 0.65, lp: 2000, send: 0.7 });
  };
  const piano = (t, m, beats, v = 0.7, pan = 0, peak = 0.034) => S('lead', t, 'piano', { f: hz(N(m)), len: beats * BEAT, v, peak, pan, send: 0.34 });
  const bell = (t, m, peak, decay = 1.0, pan = 0, send = 0.55) => S('lead', t, 'bell', { f: hz(N(m)), peak, decay, partials: 'celesta', pan, send, lp: 7500 });
  let prev = null;
  for (const [b, n, beats, v] of THEME) {
    const m = NOTE(n), t = bt(b), s = sec(b);
    const from = prev != null && Math.abs(m - prev) <= 9 && s !== 'joy' ? prev : null;     // the voice slides between close notes
    if (TR === 't1') {
      voice(t, m, beats, v, from);
      if (s === 'vulnerability') piano(t + 0.02, m - 12, beats, 0.5 * v, 0.1, 0.03);
      if (s === 'joy') voice(t + 0.012, m - 12, beats, v * 0.45, null, { pan: 0.2, send: 0.35 });   // an octave below, doubling
    } else if (TR === 't2') {
      piano(t, m, beats, v, 0.08);
      if (s === 'joy' || s === 'brand') piano(t + 0.01, m - 12, beats, v * 0.6, -0.1);
    } else {
      bell(t, m + 12 * (s === 'vulnerability' ? 0 : 0), 0.017 * v, 1.4, 0.15 * Math.sin(b), 0.6);
      voice(t, m - 12, beats, v * 0.75, from ? from - 12 : null, { vowel: 'oo', send: 0.65 });
    }
    prev = m;
  }

  // ================================================================ harmony
  for (const sp of spans()) {
    const t0 = bt(sp.b0), dur = bt(sp.b1 - sp.b0), s = sec(sp.b0), c = sp.c;
    // the drone: deep, dragging, circling — under the quiet sections (t3: always)
    const droneOn = TR === 't3' || ['curiosity', 'vulnerability', 'belonging', 'tag'].includes(s);
    if (droneOn && TR !== 't2') {
      const deep = s === 'vulnerability';
      S('pads', t0 - 0.25, 'drone', { f: hz(c.root + 12), a: 0.5, h: dur - 0.3, r: 0.9, peak: (TR === 't3' ? 0.0062 : 0.0048) * (deep ? 1.15 : 1), lp0: deep ? 240 : 320, lp1: deep ? 700 : 1100, rate: 0.16, warble: 10, wrate: 0.35, drag: deep ? 14 : 6, orbit: TR === 't3' ? 0.2 : 0.12, width: 0.85, phase: sp.b0 * 0.7, send: 0.5, subK: 0.55 });
      S('pads', t0 - 0.25, 'drone', { f: hz(c.v[2]), a: 0.6, h: dur - 0.4, r: 1.0, peak: (TR === 't3' ? 0.0028 : 0.0018), lp0: 600, lp1: 1800, rate: 0.23, warble: 12, wrate: 0.29, orbit: 0.17, width: 0.9, phase: 2.1 + sp.b0, send: 0.6, subK: 0 });
    }
    // warm swell pads (all treatments) in curiosity, connection, belonging, brand
    if (['curiosity', 'connection', 'belonging', 'brand', 'tag'].includes(s) || (TR === 't3' && s !== 'vulnerability')) {
      c.v.forEach((m, k) => S('pads', t0 - 0.12, 'swell', { f: hz(m), a: 0.55, h: Math.max(0.1, dur - 0.7), r: 1.1, peak: 0.0024 * (s === 'connection' || s === 'belonging' ? 1.3 : 1), pan: 0, width: 0.8, orbit: 0.12 + 0.02 * k, phase: k * 1.3 + sp.b0, detune: 7, lp0: 900, lp1: 2200, send: 0.55 }));
    }
    if (TR === 't1') {
      // supersaws: gated eighths through the wonder (the filter opening), sustained and pumping in the joy and brand
      if (s === 'wonder') {
        const k0 = sp.b0 - 12;
        for (let e8 = 0; e8 < 2 * (sp.b1 - sp.b0); e8++) if (!(sp.b0 === 15 && e8 === 1)) c.v.forEach((m) => S('pads', t0 + e8 * BEAT / 2, 'saw', { f: hz(m), len: BEAT * 0.32, a: 0.008, r: 0.12, peak: 0.0026 + 0.0006 * k0, lp0: 700 + 500 * k0 + 120 * e8, lp1: 1400 + 700 * k0 + 200 * e8, open: 0.05, width: 0.75, send: 0.3 }));
      }
      if (s === 'joy' || s === 'brand') c.v.concat([c.v[0] - 12]).forEach((m) => S('pads', t0, 'saw', { f: hz(m), len: dur - 0.1, a: 0.02, r: 0.4, peak: s === 'joy' ? 0.0042 : 0.0032, lp0: 1200, lp1: s === 'joy' ? 5200 : 3600, lp2: 2200, open: 0.35, width: 0.85, send: 0.35 }));
    }
    if (TR === 't2') {
      // the string ensemble carries the harmony everywhere but the bare vulnerability bar
      if (s !== 'vulnerability') c.v.forEach((m) => S('pads', t0 - 0.05, 'strings', { f: hz(m), len: dur - 0.1, a: s === 'joy' ? 0.15 : 0.5, r: 0.9, peak: 0.0046 * (s === 'joy' ? 1.25 : s === 'wonder' ? 1.1 : 1), lp0: 700, lp1: s === 'joy' ? 4600 : 3000, send: 0.45 }));
      else c.v.forEach((m, k) => S('pads', t0 + 0.03 * k, 'piano', { f: hz(m), len: dur, v: 0.38, peak: 0.03, pan: -0.3 + 0.2 * k, send: 0.4 }));
    }
    if (TR !== 't2' && s === 'vulnerability') {
      // felt-piano chords, rolled and late, under the voice
      c.v.forEach((m, k) => S('lead', t0 + 0.06 + 0.05 * k, 'piano', { f: hz(m), len: dur, v: 0.35, peak: 0.028, pan: -0.3 + 0.2 * k, send: 0.42 }));
    }
    // choir: the hug, the belonging, the brand
    if (['connection', 'belonging', 'brand'].includes(s) && sp.b0 !== 8) {
      c.v.forEach((m, k) => S('pads', t0 - 0.1, 'choir', { f: hz(m), len: dur - 0.2, a: 0.6, r: 1.2, vowel: s === 'brand' ? 'a' : 'o', peak: 0.0024 * (TR === 't3' ? 0.8 : 1), pan: (k - 1.5) * 0.35, send: 0.65 }));
    }
  }

  // ================================================================ arpeggios: the hypnotic repeating pattern
  const PAT = [0, 2, 1, 3, 2, 4, 1, 3];
  for (let s16 = 0; s16 < 128; s16++) {
    const b = s16 / 4, t = bt(b), s = sec(b);
    let on = false, peak = 0, decay = 0.4;
    if (TR === 't3') { on = s16 % 2 === 0; peak = 0.009 * (s === 'joy' ? 1.3 : s === 'vulnerability' ? 0.6 : 1); decay = 0.7; }
    else if (s === 'wonder' || s === 'joy') { on = true; peak = s === 'joy' ? 0.011 : 0.006 + 0.004 * ((b - 12) / 4); decay = 0.3; }
    else if (s === 'connection' || s === 'belonging' || s === 'brand') { on = s16 % 2 === 0; peak = 0.007; decay = 0.5; }
    if (b >= 15.5 && b < 16) on = false;                                   // the breath before the drop
    if (!on) continue;
    const c = chordAtBeat(b + 0.01);
    const tones = [...new Set(c.v.map((m) => { let x = m; while (x < 72) x += 12; while (x > 88) x -= 12; return x; }))].sort((a, z) => a - z);
    const m = tones[PAT[(s16 >> (TR === 't3' || !(s === 'wonder' || s === 'joy') ? 1 : 0)) % 8] % tones.length];
    const pan = 0.85 * Math.sin(2 * Math.PI * s16 / 24);                  // circling (a 6-beat orbit against the 4-beat bar)
    if (TR === 't3') S('lead', t, 'bell', { f: hz(m + 12), peak: peak * 0.9, decay, partials: 'celesta', pan, send: 0.6, lp: 7000 });
    else S('pads', t, 'pluck', { f: hz(m), decay, peak: peak * (s16 % 4 === 0 ? 1.15 : 0.9), pan, send: 0.35, lp: TR === 't2' ? 3600 : 6500 });
    if (TR === 't1' && (s === 'wonder' || s === 'joy')) S('pads', t + 0.75 * BEAT, 'pluck', { f: hz(m), decay: 0.25, peak: peak * 0.3, pan: -pan, send: 0.5, lp: 3000 });
  }

  // ================================================================ bass
  const sub = (t, m, beats, peak) => S('rhythm', t, 'sub', { f: hz(m), len: beats * BEAT - 0.04, peak, lp: 380, oct: 0.22, drive: 1.9 });
  const bass = (t, m, beats, peak) => S('rhythm', t, 'bass', { f: hz(m), len: beats * BEAT - 0.05, peak, lp: 620 });
  for (const sp of spans()) {
    const s = sec(sp.b0), r = sp.c.root, t0 = bt(sp.b0), nb = sp.b1 - sp.b0;
    if (TR === 't1') {
      if (s === 'curiosity' || s === 'tag') sub(t0, r, nb, 0.02);
      else if (s === 'vulnerability') { if (sp.b0 === 6) sub(t0 + 0.05, r, nb, 0.011); }
      else if (s === 'connection') { sub(t0, r, nb, 0.024); bass(t0, r + 12, nb, 0.008); }
      else if (s === 'wonder') for (let e8 = 0; e8 < 2 * nb; e8++) { if (sp.b0 === 15 && e8 === 1) continue; sub(t0 + e8 * BEAT / 2, r, 0.45, 0.022); if (e8 % 2) bass(t0 + e8 * BEAT / 2, r + 12, 0.4, 0.009); }
      else if (s === 'joy' || s === 'brand') for (let e8 = 0; e8 < 2 * nb; e8++) { const off = e8 % 2 === 1; sub(t0 + e8 * BEAT / 2, r + (off ? 12 : 0), 0.45, off ? 0.016 : 0.028); }
      else if (s === 'belonging') { sub(t0, r, nb, 0.024); bass(t0 + bt(1.5), r + 12, 0.5, 0.007); }
    } else if (TR === 't2') {
      if (s !== 'vulnerability') bass(t0, r + 12, nb, s === 'joy' ? 0.02 : 0.015);
      if (s === 'joy' || s === 'wonder') bass(t0 + bt(1), r + 12, 0.9, 0.011);
    } else {
      sub(t0, r, nb, s === 'vulnerability' ? 0.012 : 0.018);
    }
  }

  // ================================================================ rhythm
  const kick = (t, peak, d) => S('rhythm', t, 'kick', { peak, d });
  const clap = (t, peak, pan = 0.1) => S('rhythm', t, 'clap', { peak, pan, send: 0.35 });
  const hat = (t, peak, d = 0.035) => S('rhythm', t, 'hat', { peak, d, pan: 0.4 * Math.sin(t * 1.7) });
  const shaker = (t, peak) => S('rhythm', t, 'shaker', { peak, pan: 0.35 * Math.sin(t * 2.1) });
  const heart = (t, k = 1) => { S('rhythm', t, 'pulse', { f: hz(45), peak: 0.036 * k, d: 0.24, lp: 1400 }); S('rhythm', t, 'noiseHit', { filter: 'lowpass', f: 1600, f1: 500, sweep: 0.05, a: 0.002, d: 0.05, peak: 0.01 * k }); S('rhythm', t + BEAT / 4, 'pulse', { f: hz(45), peak: 0.012 * k, d: 0.16, lp: 700 }); };
  for (let b = 0; b < 32; b++) {
    const t = bt(b), s = sec(b), ib = b % 4;
    if (TR === 't3') {
      if (ib === 0 || ib === 2) heart(t, s === 'joy' ? 1.0 : s === 'vulnerability' ? 0.6 : 0.8);
      if (s === 'joy' || s === 'wonder') for (let k = 0; k < 4; k += 2) shaker(t + k * BEAT / 4, 0.01);
      continue;
    }
    if (s === 'curiosity' && (b === 2 || b === 3)) heart(t, TR === 't1' ? 1.7 : 1.2);                       // the light's heartbeat
    if (s === 'vulnerability' && (b === 4 || b === 6)) heart(t + 0.04, 0.55);        // slower, softer
    if (s === 'connection') { if (ib === 0 || ib === 2) kick(t, 0.02, 0.3); for (let k = 0; k < 4; k += 2) shaker(t + k * BEAT / 4, 0.011); }
    if (s === 'wonder') {
      kick(t, 0.028 + 0.003 * (b - 12));
      if (TR === 't1') { for (let k = 0; k < (b === 15 ? 2 : 4); k++) hat(t + k * BEAT / 4, (k % 2 ? 0.007 : 0.01) * (1 + 0.25 * (b - 12))); if (b === 13 || b === 15) clap(t, 0.04); }
      else { shaker(t, 0.012); shaker(t + BEAT / 2, 0.012); }
    }
    if (s === 'joy') {
      kick(t, ib === 0 ? 0.05 : 0.042);
      if (TR === 't1') { if (ib % 2 === 1) clap(t, 0.055); hat(t + BEAT / 2, 0.016, 0.16); for (let k = 0; k < 4; k++) shaker(t + k * BEAT / 4 + (k % 2 ? 0.016 : 0), k % 2 ? 0.014 : 0.02); }
      else { if (ib % 2 === 1) S('rhythm', t, 'snap', { peak: 0.04, pan: 0.15, send: 0.4 }); for (let k = 0; k < 4; k += 2) shaker(t + k * BEAT / 4, 0.016); }
    }
    if (s === 'belonging') { if (ib === 0) kick(t, 0.036); if (ib === 2 && b !== 22) (TR === 't1' ? clap : (tt, p) => S('rhythm', tt, 'snap', { peak: p, pan: 0.1, send: 0.4 }))(t, 0.035); if (TR === 't1') { hat(t, 0.007); hat(t + BEAT / 2, 0.009); } }
    if (s === 'brand') { if (ib % 2 === 0) kick(t, ib === 0 ? 0.045 : 0.034); if (ib % 2 === 1) (TR === 't1' ? clap : (tt, p) => S('rhythm', tt, 'snap', { peak: p, pan: 0.1, send: 0.4 }))(t, 0.04); for (let k = 0; k < 4; k += 2) shaker(t + k * BEAT / 4, 0.012); }
    if (s === 'tag' && b === 28) kick(t, 0.03);
  }
  if (TR !== 't3') {
    // the build into the drop: a clap / snap roll and a riser
    for (let k = 0; k < 6; k++) (TR === 't1' ? clap : (tt, p) => S('rhythm', tt, 'snap', { peak: p, pan: (k - 4) * 0.1, send: 0.4 }))(bt(15) + k * BEAT / 8, 0.012 + 0.004 * k, (k - 4) * 0.1);
    S('rhythm', bt(16) - 0.06, 'riser', { dur: bt(4) - 0.06, peak: TR === 't1' ? 0.034 : 0.024, f1: 6200 });
    S('rhythm', bt(16), 'kick', { peak: TR === 't1' ? 0.07 : 0.05, d: 0.5 });
  }
  S('rhythm', bt(32) - 0.01, 'riser', { dur: 1.2, peak: 0.012, f1: 3500 });             // the soft lift back into bar 1

  // ================================================================ the characters and their world
  const pent = ['C6', 'D6', 'E6', 'G6', 'A6', 'C7'].map(NOTE);
  const KIT = { blubi: 'blubi', loomi: 'loomi', pipzi: 'pipzi', glitzi: 'glitzi', zuzu: 'zuzu', boppo: 'boppo', noomi: 'noomi' };
  for (const c of cues) {
    const t = c.t, pan = c.pan || 0;
    switch (c.type) {
      case 'glance': E(t, 'fx', 'swish', { intensity: 0.1, pan, pitch: 0.85 }, 0.35); break;
      case 'curious': E(t, 'mallow', 'surprise', { intensity: 0.26 }, 0.15, 'noomi'); break;
      case 'lean_in': S('sfx', t, 'air', { a: 0.4, r: 0.6, f0: 500, f1: 1100, q: 0.9, peak: 0.01, width: 0.5, send: 0.3 }); break;
      case 'touch':        // fingertip on the light: a glassy touch
        E(t, 'fx', 'glass', { intensity: 0.4, pan, pitch: 1.1 }, 0.32);
        S('sfx', t, 'ping', { f: hz(88), rise: 1.01, peak: 0.032, decay: 0.6, pan, send: 0.5 });
        break;
      case 'melt':         // it melts into her: a soft inward breath and a low bloom
        S('sfx', t - 0.15, 'air', { a: 0.25, r: 0.9, f0: 2400, f1: 600, q: 0.8, peak: 0.016, width: 0.7, send: 0.55 });
        bell(t, 'C5', 0.012, 2.0, pan, 0.7);
        break;
      case 'tear':         // the tear: one clear music-box note, and the drop
        bell(t, c.side === 'L' ? 'E6' : 'C6', 0.046, 1.6, pan, 0.5);
        bell(t + 0.004, c.side === 'L' ? 'E7' : 'C7', 0.008, 0.6, pan, 0.55);
        E(t + 0.6, 'fx', 'drip', { intensity: 0.32, pan }, 0.22);
        break;
      case 'look_down': E(t, 'mallow', 'sigh', { intensity: 0.22 }, 0.14, 'noomi'); break;
      case 'hop': E(t, 'mallow', 'hop', { intensity: 0.4, pan }, 0.2, KIT[c.mallow]); break;
      case 'land':
        S('sfx', t, 'blip', { f: hz(chordAtBeat(t / BEAT).root + 24), f1: hz(chordAtBeat(t / BEAT).root + 31), glide: 0.06, a: 0.003, d: 0.12, peak: 0.022, lp: 2600, pan, send: 0.35 });
        S('sfx', t, 'noiseHit', { filter: 'bandpass', f: 1400, f1: 480, sweep: 0.1, a: 0.003, d: 0.1, peak: 0.02, q: 1.4, pan });
        if (c.mallow === 'loomi') E(t + 0.05, 'mallow', 'squeeze', { intensity: 0.25, pan }, 0.14, 'loomi');
        break;
      case 'empathy': E(t, 'mallow', 'sigh', { intensity: 0.32, pan }, 0.18, 'blubi'); break;
      case 'hug':          // the hug: both voices, warm air, a rising chime
        E(t, 'mallow', 'comfort', { intensity: 0.42, pan: -0.3 }, 0.22, 'blubi');
        E(t + 0.12, 'mallow', 'comfort', { intensity: 0.36, pan: 0.1 }, 0.2, 'noomi');
        S('sfx', t - 0.1, 'air', { a: 0.35, r: 1.4, f0: 400, f1: 1300, q: 0.7, peak: 0.016, width: 0.9, send: 0.6 });
        [72, 76, 79, 84].forEach((m, k) => bell(t + 0.04 + k * 0.06, m, 0.009, 1.4, (k - 1.5) * 0.3, 0.6));
        break;
      case 'talk': {       // Blubi talks it out: its own voice, syllable by syllable
        const n = Math.round(c.dur / 0.2);
        for (let k = 0; k < n; k++) E(t + k * 0.2 + 0.03 * Math.sin(k * 2.3), 'mallow', k % 3 === 2 ? 'press' : 'tap', { intensity: 0.22 + 0.06 * Math.sin(k * 1.7), pan: -0.35, pitch: 1 + 0.12 * Math.sin(k * 1.31) }, 0.12, 'blubi');
        break;
      }
      case 'float': S('sfx', t, 'air', { a: 0.6, r: 0.5, f0: 2600, f1: 900, q: 0.8, peak: 0.012, width: 0.6, send: 0.5 }); break;
      case 'breath_in': S('sfx', t, 'air', { a: c.dur * 0.95, r: 0.2, f0: 500, f1: 1200, q: 1.0, peak: 0.024, width: 0.5, send: 0.35 }); break;
      case 'breath_out': S('sfx', t, 'air', { a: 0.12, r: c.dur * 1.4, f0: 1100, f1: 380, q: 0.9, peak: 0.026, width: 0.7, send: 0.45 }); E(t + 0.05, 'mallow', 'sigh', { intensity: 0.3, pan: 0.5 }, 0.16, 'loomi'); break;
      case 'rise':         // a light lifts out of the lake
        S('sfx', t, 'air', { a: 0.7, r: 0.35, f0: 300, f1: 2400, q: 1.1, peak: 0.016, width: 0.6, send: 0.5 });
        S('sfx', t, 'blip', { f: hz(60), f1: hz(72), glide: 0.5, a: 0.02, d: 0.4, peak: 0.008, lp: 1800, pan, send: 0.5 });
        break;
      case 'emerge':       // it becomes its Mallow: the next note of the rising line
        S('sfx', t, 'blip', { f: 700, f1: 1400, glide: 0.04, a: 0.002, d: 0.06, peak: 0.02, lp: 4200, pan, send: 0.2 });
        bell(t + 0.01, pent[['pipzi', 'glitzi', 'zuzu', 'boppo'].indexOf(c.mallow)], 0.02, 1.1, pan, 0.5);
        break;
      case 'land_on': {    // plop! onto a friend's head: a squishy boing, and the friend's "oof"
        S('sfx', t, 'blip', { f: hz(chordAtBeat(t / BEAT).root + 31), f1: hz(chordAtBeat(t / BEAT).root + 24), glide: 0.09, a: 0.003, d: 0.16, peak: 0.024, lp: 2200, pan, send: 0.3 });
        S('sfx', t, 'noiseHit', { filter: 'bandpass', f: 1700, f1: 520, sweep: 0.1, a: 0.003, d: 0.12, peak: 0.026, q: 1.5, pan });
        E(t + 0.04, 'mallow', 'squeeze', { intensity: 0.3, pan }, 0.16, KIT[c.on]);
        break;
      }
      case 'sparks': E(t, 'mallow', 'celebrate', { intensity: 0.45, pan }, 0.22, 'pipzi'); E(t + 0.02, 'fx', 'crackle', { intensity: 0.35, pan }, 0.2); break;
      case 'wink_glitzi': E(t, 'mallow', 'tap', { intensity: 0.35, pan }, 0.18, 'glitzi'); [91, 96].forEach((m, k) => bell(t + 0.05 + k * 0.08, m, 0.01, 0.8, pan, 0.55)); break;
      case 'spiral_slow':  // the racing spirals slow down: a falling run that relaxes
        [0, 0.07, 0.15, 0.25, 0.38, 0.55].forEach((dt, k) => S('sfx', t + dt, 'pluck', { f: hz([88, 86, 84, 81, 79, 76][k]), decay: 0.3 + 0.1 * k, peak: 0.009, pan: pan - 0.05 * k, send: 0.4, lp: 5000 }));
        E(t + 0.6, 'mallow', 'sigh', { intensity: 0.28, pan }, 0.16, 'zuzu');
        break;
      case 'drop':         // the drop: an impact, a bloom of air
        S('sfx', t, 'noiseHit', { filter: 'lowpass', f: 3000, f1: 300, sweep: 0.5, a: 0.004, d: 0.9, peak: 0.03, q: 0.7 });
        S('sfx', t, 'air', { a: 0.02, r: 1.6, f0: 4000, f1: 900, q: 0.6, peak: 0.02, width: 0.95, send: 0.6 });
        break;
      case 'sunburst': E(t, 'mallow', 'celebrate', { intensity: 0.5, pan }, 0.24, 'boppo'); E(t + 0.05, 'fx', 'bloom', { intensity: 0.45, pan }, 0.22); break;
      case 'bounce': {     // the pile bounces: everyone's little hop, a boing up the chord
        const r0 = chordAtBeat(t / BEAT).root;
        S('sfx', t, 'blip', { f: hz(r0 + 24), f1: hz(r0 + 31), glide: 0.07, a: 0.003, d: 0.12, peak: 0.016, lp: 2600, send: 0.3 });
        E(t, 'mallow', 'hop', { intensity: 0.3, pan: -0.3 + 0.3 * c.k }, 0.12, ['pipzi', 'glitzi', 'zuzu'][c.k]);
        break;
      }
      case 'settle': S('sfx', t, 'air', { a: 0.5, r: 0.8, f0: 600, f1: 1500, q: 1.0, peak: 0.012, width: 0.9, send: 0.45 }); break;
      case 'blink_together':   // one slow blink together: down as they close, up as they open
        bell(t, 'E6', 0.012, 1.0, -0.2, 0.6); bell(t + c.dur * 0.75, 'A6', 0.012, 1.4, 0.2, 0.6);
        break;
      case 'gift':         // your light comes back: a music-box run, falling gently
        ['C7', 'G6', 'E6', 'C6', 'G5'].forEach((n, k) => bell(t + k * 0.13, n, 0.011, 1.0, 0.4 - 0.2 * k, 0.6));
        break;
      case 'gift_land':    // …and lands: everyone's fond little sound
        bell(t, 'C6', 0.036, 1.8, 0, 0.5); bell(t + 0.02, 'G6', 0.02, 1.8, 0, 0.5); bell(t + 0.04, 'E7', 0.008, 1.2, 0.2, 0.5);
        ['blubi', 'loomi', 'boppo'].forEach((id, k) => E(t + 0.12 + k * 0.1, 'mallow', 'comfort', { intensity: 0.2, pan: [-0.5, 0.5, 0.2][k] }, 0.1, id));
        break;
      case 'logo': {       // the "hush-mal-low" motif: the theme's own first three notes
        [[0, 79], [0.16, 76], [0.36, 84]].forEach(([dt, m], i) => S('lead', t + dt, 'bell', { f: hz(m), peak: 0.026 * (i === 2 ? 1.15 : 1), decay: i === 2 ? 1.7 : 0.8, partials: 'celesta', pan: [-0.25, 0.25, 0][i], send: 0.55, lp: 7500 }));
        E(t + 0.55, 'mallow', 'success', { intensity: 0.4 }, 0.16, 'noomi');
        break;
      }
      case 'wink': bell(t, 91, 0.016, 0.5, -0.2, 0.4); break;
      case 'hello': {      // the hello ripple across the pile: one Mallow per note
        const run = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6'].map(NOTE);
        S('sfx', t, 'pluck', { f: hz(run[c.k] + 12), decay: 0.5, peak: 0.024, pan: -0.6 + 0.2 * c.k, send: 0.3, lp: 6000 });
        if (c.k % 2 === 0) E(t, 'mallow', 'hop', { intensity: 0.25, pan: -0.6 + 0.2 * c.k }, 0.1, KIT[c.mallow]);
        break;
      }
      case 'return': S('sfx', t, 'ping', { f: hz(pent[5 - c.i]), rise: 0.99, peak: 0.007, decay: 0.4, pan: (c.i - 2.5) * 0.3, send: 0.6 }); if (c.i === 0) S('sfx', t, 'air', { a: 0.5, r: 0.5, f0: 2400, f1: 800, q: 0.9, peak: 0.016, width: 0.8, send: 0.5 }); break;
      case 'merge': E(t, 'fx', 'chime', { intensity: 0.22 }, 0.12); break;
      default: break;
    }
  }

  for (let i = synth.length - 1; i >= 0; i--) if (synth[i].peak !== undefined && !(synth[i].peak > 1e-5)) synth.splice(i, 1);
  for (let i = engine.length - 1; i >= 0; i--) if (!(engine[i].trim > 0.001)) engine.splice(i, 1);
  for (const e of [...engine, ...synth]) e.t = r4(((e.t % DUR) + DUR) % DUR);

  // the realm bed: Noomi's Moonmilk Cove, low; colder in the vulnerability, warmer at dawn
  const curves = log.curves || [];
  const at = (tc) => { if (!curves.length) return { blue: 0, dawn: 0 }; const i = clamp(Math.round(tc * 30), 0, curves.length - 1); return curves[i]; };
  const mood = [];
  for (let t = -PRE; t <= DUR + XFADE + 0.2 + 1e-9; t += 0.1) {
    const tc = ((t % DUR) + DUR) % DUR, C = at(tc);
    mood.push({ t: r4(t), m: { agitation: 0.12, heaviness: r4(0.1 + 0.3 * (C.blue || 0)), clarity: r4(0.5 + 0.3 * (C.dawn || 0)), warmth: r4(0.4 + 0.5 * (C.dawn || 0) - 0.2 * (C.blue || 0)) } });
  }
  const bed = { realm: 'moonmilk-cove', fadeIn: 0.8, mood, tickWindows: [], level: [[-PRE, 0.36], [DUR, 0.36]], circular: { xfade: XFADE } };
  return {
    SR, PRE, DUR, LAT: 0.012, engineUrl: '/hushmallow/src/engine/audio.js', kit: 'noomi',
    engine: engine.sort((a, z) => a.t - z.t), synth: synth.sort((a, z) => a.t - z.t),
    ticks: [], crickets: [], swirl: null, pad: null, bed, fade: null, circular: { tail: TAIL },
  };
}

/** 4th-order high-pass on an interleaved stereo loop, run circularly (seamless). */
function highpassLoop(x, fc) {
  const n = x.length / 2, w = 2 * Math.PI * fc / SR, cs = Math.cos(w), out = new Float32Array(x.length);
  const stages = [0.5412, 1.3066].map((q) => { const al = Math.sin(w) / (2 * q), a0 = 1 + al; return { b0: (1 + cs) / 2 / a0, b1: -(1 + cs) / a0, b2: (1 + cs) / 2 / a0, a1: -2 * cs / a0, a2: (1 - al) / a0 }; });
  for (let ch = 0; ch < 2; ch++) {
    const st = stages.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      let v = x[2 * i + ch];
      stages.forEach((c, k) => { const z = st[k]; const y = c.b0 * v + c.b1 * z.x1 + c.b2 * z.x2 - c.a1 * z.y1 - c.a2 * z.y2; z.x2 = z.x1; z.x1 = v; z.y2 = z.y1; z.y1 = y; v = y; });
      if (pass === 1) out[2 * i + ch] = v;
    }
  }
  return out;
}

/**
 * Gain curves over the loop (circular). pads: pumped by the kick (the "drag" of the electronic
 * treatment, deepest in the joy); lead: steps back a little under the big sound moments;
 * all music swells gently with the shared breath.
 */
function mixCurves(plan, log, DUR, TR) {
  const n = Math.round(DUR * SR), pads = new Float32Array(n).fill(1), lead = new Float32Array(n).fill(1), bedG = new Float32Array(n).fill(1);
  const kicks = plan.synth.filter((e) => e.stem === 'rhythm' && e.inst === 'kick').map((e) => e.t);
  const key = log.cues.filter((c) => ['hug', 'drop', 'logo', 'gift_land'].includes(c.type)).map((c) => c.t);
  const depth = (t) => (TR === 't1' ? (t >= 10 && t < 12.5 ? 0.42 : t >= 7.5 && t < 10 ? 0.3 : 0.2) : TR === 't2' ? 0.08 : 0);
  const curves = log.curves || [];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let g = 1;
    const dp = depth(t);
    if (dp > 0) for (const tk of kicks) { let d = t - tk; if (d < -DUR / 2) d += DUR; if (d > DUR / 2) d -= DUR; if (d > -0.006 && d < 0.6) g *= 1 - dp * (d < 0 ? (d + 0.006) / 0.006 : Math.exp(-d / 0.14)); }
    let k = 1;
    for (const tc of key) { let d = t - tc; if (d < -DUR / 2) d += DUR; if (d > -0.03 && d < 0.6) k = Math.min(k, 1 - 0.12 * (d < 0 ? (d + 0.03) / 0.03 : Math.exp(-d / 0.25))); }
    const C = curves.length ? curves[Math.min(curves.length - 1, Math.round(t * 30))] : null;
    const breath = C ? 1 + 3.0 * (C.breath || 0) : 1;            // the music breathes with Loomi (breath ≤ 0.075)
    pads[i] = g * breath; lead[i] = k; bedG[i] = 0.5 + 0.5 * g;
  }
  return { pads, lead, bedG };
}

async function main() {
  const args = process.argv.slice(2);
  const [cuesPath, outDir] = args;
  const TR = args.includes('--treatment') ? args[args.indexOf('--treatment') + 1] : 't1';
  if (!cuesPath || !outDir || !['t1', 't2', 't3'].includes(TR)) { console.error('usage: node audio/score-feel-v3.mjs <cues.json> <out dir> [--treatment t1|t2|t3]'); process.exit(2); }
  const log = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
  const plan = buildPlan(log, { treatment: TR });
  const say = (m) => console.log(`[score-feel-v3 ${TR}]`, m);
  const STEMS = ['bed', 'pads', 'lead', 'rhythm', 'sfx'];
  say(`${plan.engine.length} engine voices, ${plan.synth.length} synth events (${STEMS.slice(1).map((s) => `${s} ${plan.synth.filter((e) => e.stem === s).length}`).join(', ')})`);
  const session = await openRenderer();
  const stems = {};
  let bedStats = null;
  try {
    for (const stem of STEMS) {
      const p = { ...plan, synth: plan.synth.filter((e) => e.stem === stem), engine: stem === 'sfx' ? plan.engine : [], bed: { ...plan.bed, mute: stem !== 'bed' } };
      const r = await renderMix(p, { session, bedStats, log: (m) => say(`${stem}: ${m}`) });
      bedStats = bedStats || r.xfade;
      stems[stem] = r.x;
      say(`${stem} rendered`);
    }
  } finally { await session.close(); }
  const D = plan.DUR, n = Math.round(D * SR);
  const cv = mixCurves(plan, log, D, TR);
  const LV = { pads: 1.0, lead: 1.0, rhythm: 0.95, sfx: 0.85, bed: 0.7 };
  const gainOf = (name, i) => LV[name] * (name === 'pads' ? cv.pads[i] : name === 'lead' ? cv.lead[i] : name === 'bed' ? cv.bedG[i] : 1);
  const mix = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) for (const name of STEMS) { const g = gainOf(name, i); mix[2 * i] += stems[name][2 * i] * g; mix[2 * i + 1] += stems[name][2 * i + 1] * g; }
  const hp = highpassLoop(mix, 35);
  fs.mkdirSync(path.join(outDir, 'stems'), { recursive: true });
  const m = masterToWav(hp, path.join(outDir, 'score.wav'), { circular: true, log: (s) => say(s) });
  const gain = Math.pow(10, m.gainDb / 20);
  for (const name of STEMS) {
    const x = stems[name], y = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const g = gainOf(name, i) * gain; y[2 * i] = x[2 * i] * g; y[2 * i + 1] = x[2 * i + 1] * g; }
    writeWav24(y, path.join(outDir, 'stems', `${name}.wav`));
  }
  fs.writeFileSync(path.join(outDir, 'score-report.json'), JSON.stringify({ treatment: TR, engine: plan.engine.length, synth: plan.synth.length, I: m.I, TP: m.TP, LRA: m.LRA, gainDb: m.gainDb, sr: RSR }, null, 1));
  say(`mastered: ${m.I} LUFS, ${m.TP} dBTP, LRA ${m.LRA} LU → ${outDir}/score.wav`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main().catch((e) => { console.error('[score-feel-v3]', e); process.exit(1); });
