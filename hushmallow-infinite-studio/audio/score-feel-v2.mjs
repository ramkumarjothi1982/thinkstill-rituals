// Original score for "Feel Something?" v2 (videos/feel-something-v2.js), synthesised in code.
//
//   node audio/score-feel-v2.mjs <cues.json> <out dir>
//     → <out>/score.wav (mastered mix), <out>/stems/{music,rhythm,sfx,bed}.wav (at the mix's gain),
//       <out>/score-report.json
//
// Rendered offline in headless Chromium (audio/render-offline.mjs: the studio's fork of
// the approved renderer and mastering) through the app's own Hushmallow sound engine
// (each Mallow speaks in its own voice) plus the studio's instruments. No samples, no
// music library, no paid or cloud services.
//
// 96 BPM, 4/4: the 20 s loop is 8 bars. The music carries the story:
//   bar 1  Am9 · Fmaj9      the question: a felt-piano phrase that ends unresolved, a heartbeat
//                           under the pulsing feeling
//   bar 2  Cadd9 · G/B      the split blooms: the melody leaps up, strings and a soft groove enter;
//                           the reveals begin, each feeling sounding its own note in its own colour
//   bar 3  Am9 · Em7        sadness (felt piano + a drop), anxiety (a trembling pluck), anger (a low
//                           thump), loneliness (one high bell and its echoes), overthinking (a racing
//                           music box), happiness (a bright glockenspiel chord)
//   bar 4  Fmaj7#11         the hum: choir and strings swell, the groove locks in, a swirling 16th
//                           ostinato; each Mallow emerges on the next note of a rising line
//   bar 5  G6sus · G        the line climbs to the top; everyone hops; a riser into…
//   bar 6  Cmaj9            dawn: the arrival. "Feel what you feel": the band breathes out and drops
//                           away, choir and strings breathe with the Mallows
//   bar 7  Am9 · G6         "Meet your Mallows": eyes open on a celesta arpeggio; the line-up lands
//                           with the "hush-mal-low" motif
//   bar 8  C · Am9          the hello wave is a melody (one Mallow per note), the wink, then the
//                           question phrase returns and flows into bar 1
// Mixed from four stems (music, rhythm, sfx, bed): the music breathes with the kick (gentle
// sidechain) and steps back under the key moments; circular render and mastering, so the loop has
// no seam.

import fs from 'node:fs';
import path from 'node:path';
import { renderMix, masterToWav, writeWav24, openRenderer, SR as RSR } from './render-offline.mjs';
import { mulberry32 } from './soundtrack.mjs';

const SR = 48000, PRE = 1.0, LAT = 0.012, TAIL = 4.0, XFADE = 1.0, SEED = 20261016;
const BEAT = 0.625, BAR = 4 * BEAT;
const bt = (n) => n * BEAT;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const NOTE = (s) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return 12 * (Number(m[3]) + 1) + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };

// harmony per half bar (bass root, upper voicing)
const CH = {
  Am9: { bass: 45, v: [57, 60, 64, 67, 71] }, Fmaj9: { bass: 41, v: [53, 57, 60, 64, 67] }, Cadd9: { bass: 48, v: [55, 60, 62, 64, 67] },
  'G/B': { bass: 47, v: [55, 59, 62, 67, 69] }, Em7: { bass: 40, v: [52, 55, 59, 62, 66] }, Fmaj7s11: { bass: 41, v: [53, 57, 60, 64, 71] },
  G6sus: { bass: 43, v: [55, 60, 62, 64, 67] }, G: { bass: 43, v: [55, 59, 62, 67, 69] }, Cmaj9: { bass: 48, v: [52, 55, 59, 62, 64] },
  G6: { bass: 43, v: [55, 59, 62, 64, 67] }, C: { bass: 48, v: [52, 55, 60, 64, 67] },
};
const HALF = ['Am9', 'Fmaj9', 'Cadd9', 'G/B', 'Am9', 'Em7', 'Fmaj7s11', 'Fmaj7s11', 'G6sus', 'G', 'Cmaj9', 'Cmaj9', 'Am9', 'G6', 'C', 'Am9'];
const chordAt = (t) => CH[HALF[clamp(Math.floor((((t % 20) + 20) % 20) / (BAR / 2)), 0, 15)]];

export function buildPlan(log) {
  const { duration: DUR, cues } = log;
  if (Math.abs(DUR - 32 * BEAT) > 1e-9) throw new Error(`score-feel-v2: expects the 32-beat (20 s) loop, got ${DUR} s`);
  const rnd = mulberry32(SEED);
  const synth = [], engine = [];
  const S = (stem, t, inst, p) => synth.push({ stem, t, inst, ...p });
  const E = (t, kind, name, opts = {}, trim = 1, kit = null) => engine.push({ t, kind, name, opts, trim, cut: null, ...(kit ? { kit } : {}) });
  const of = (type) => cues.filter((c) => c.type === type);
  const cue1 = (type) => of(type)[0];

  // ================================================================ music
  // --- pads: soft swell in bar 1; strings from the split; choir on the hum, the dawn, the brand
  [[0, 'Am9'], [bt(2), 'Fmaj9']].forEach(([t, c]) => CH[c].v.forEach((m, v) => S('music', t - 0.2, 'swell', {
    f: hz(m + (v >= 2 ? 12 : 0)), a: 0.8, h: BAR / 2 - 0.6, r: 1.4, peak: 0.0034, pan: 0, width: 0.85, orbit: 0.11 + 0.015 * v, phase: v * 1.26, detune: 6, lp0: 1100, lp1: 1800, send: 0.5,
  })));
  for (let h = 2; h < 16; h++) {
    const name = HALF[h];
    if (h > 2 && HALF[h - 1] === name) continue;
    let len = 1; while (h + len < 16 && HALF[h + len] === name) len++;
    const t0 = h * BAR / 2, dur = len * BAR / 2;
    const breathe = t0 >= bt(22) && t0 < bt(24);
    const lvl = { 2: 0.55, 3: 0.55, 4: 0.6, 5: 0.6, 6: 1.0, 8: 0.85, 9: 0.9, 10: 1.0, 12: 0.75, 13: 0.8, 14: 0.95, 15: 0.7 }[h] ?? 0.7;
    for (const m of CH[name].v) {
      S('music', t0 - 0.05, 'strings', { f: hz(m), len: dur - 0.1, a: h === 6 || h === 10 ? 0.9 : 0.45, r: 1.0, peak: 0.0048 * lvl * (breathe ? 0.8 : 1), lp0: 700, lp1: h >= 6 ? 4200 : 3000, send: 0.45 });
    }
  }
  const choir = (t0, name, len, vowel, peak, a = 0.8) => CH[name].v.slice(1).forEach((m, k) => S('music', t0, 'choir', { f: hz(m + 12 * (k >= 2 ? 0 : 1) - 12 + 12), len, a, r: 1.6, vowel, peak, pan: (k - 1.5) * 0.35, send: 0.65 }));
  choir(bt(12) - 0.3, 'Fmaj7s11', BAR - 0.4, 'o', 0.0045, 1.0);
  choir(bt(16) - 0.05, 'G6sus', BAR / 2 - 0.2, 'o', 0.0024, 0.3);
  choir(bt(20) - 0.2, 'Cmaj9', BAR - 0.2, 'a', 0.0034, 0.9);
  choir(bt(28), 'C', BAR / 2, 'a', 0.0028, 0.4);

  // --- felt piano: the theme, chords in the hook, the dawn and the brand
  const P = (t, n, beats, v = 0.7, pan = 0) => S('music', t, 'piano', { f: hz(typeof n === 'string' ? NOTE(n) : n), len: beats * BEAT, v, peak: 0.034, pan, send: 0.32 });
  const roll = (t, name, v = 0.45, spread = 0.045) => [CH[name].bass + 12, ...CH[name].v.slice(1, 4)].forEach((m, k) => P(t + k * spread, m, 2, v * (k === 0 ? 0.9 : 0.7), -0.25 + k * 0.17));
  // bar 1 — the question
  roll(0, 'Am9', 0.42); roll(bt(2), 'Fmaj9', 0.42);
  [[0, 'E5', 1], [1, 'D5', 0.5], [1.5, 'C5', 0.5], [2, 'E5', 1], [3, 'D5', 1.2]].forEach(([b, n, d]) => P(bt(b), n, d, 0.72, 0.1));
  // bar 2 — the split: the leap
  P(bt(4), 'G5', 1.5, 0.82, 0.1); roll(bt(4), 'Cadd9', 0.5, 0.03);
  // bar 3 — understanding
  P(bt(11), 'B4', 1, 0.5, -0.2); P(bt(11) + 0.04, 'E5', 1, 0.48, 0.2);
  // bar 6 — dawn: "Talk it out." … "Feel what you feel."
  roll(bt(20), 'Cmaj9', 0.55, 0.06);
  [[20, 'E5', 2, 0.78], [22, 'D5', 0.5, 0.7], [22.5, 'C5', 1.5, 0.66]].forEach(([b, n, d, v]) => P(bt(b), n, d, v, 0.08));
  // bar 7 — "Meet your Mallows."
  roll(bt(24), 'Am9', 0.5, 0.05); roll(bt(26), 'G6', 0.5, 0.05);
  [[24, 'A4', 1], [25, 'C5', 1], [26, 'E5', 1]].forEach(([b, n, d]) => P(bt(b), n, d, 0.7, 0.1));
  // bar 8 — the brand, then the question returns into bar 1
  roll(bt(28), 'C', 0.55, 0.04); roll(bt(30), 'Am9', 0.42, 0.06);
  [[30.5, 'A4', 0.5], [31, 'C5', 0.5], [31.5, 'D5', 0.5]].forEach(([b, n, d]) => P(bt(b), n, d, 0.55, 0.1));

  // --- ostinato: 8ths after the split, 16ths through the magic, 8ths again after; circling the listener
  const PAT = [0, 2, 4, 1, 3, 2, 4, 1];
  for (let s = 0; s < 128; s++) {
    const t = s * BEAT / 4;
    const sixteen = t >= bt(12) && t < bt(19);
    const eighth = (t >= bt(4) && t < bt(12)) || (t >= bt(24) && t < bt(30.5)) || (t >= bt(19) && t < bt(22));
    if (!sixteen && !(eighth && s % 2 === 0)) continue;
    const tones = [...new Set(chordAt(t + 0.01).v.map((m) => { let x = m; while (x < 72) x += 12; while (x > 88) x -= 12; return x; }))].sort((a, z) => a - z);
    const m = tones[PAT[(sixteen ? s : s / 2) % 8] % tones.length];
    const acc = s % 4 === 0 ? 1.15 : 0.85;
    const pan = 0.88 * Math.sin(2 * Math.PI * s / 32);
    S('music', t, 'pluck', { f: hz(m), decay: sixteen ? 0.32 : 0.5, peak: (sixteen ? 0.016 : 0.0105) * acc, pan, send: 0.35, lp: 7000 });
    if (!sixteen) S('music', t + 3 * BEAT / 4, 'pluck', { f: hz(m), decay: 0.4, peak: 0.0035, pan: -pan, send: 0.55, lp: 3000 });
  }
  // glitter: high celesta points orbiting the listener through the magic
  for (let t = bt(12) + BEAT / 2; t < bt(19.5); t += BEAT / 3) {
    const v = chordAt(t + 0.01).v; let m = v[Math.floor(rnd() * v.length)]; while (m < 88) m += 12;
    S('music', t + rnd() * 0.03, 'ping', { f: hz(m), rise: 1.005, peak: 0.005 + 0.004 * rnd(), decay: 0.25 + rnd() * 0.25, pan: 0.92 * Math.sin(2 * Math.PI * t / BAR), send: 0.65 });
  }

  // --- the "hush-mal-low" signature (G5 E5 C6)
  const motif = (t0, k = 1) => [[0, 79], [0.16, 76], [0.36, 84]].forEach(([dt, m], i) => S('music', t0 + dt, 'bell', { f: hz(m), peak: 0.026 * k * (i === 2 ? 1.15 : 1), decay: i === 2 ? 1.7 : 0.8, partials: 'celesta', pan: [-0.25, 0.25, 0][i], send: 0.55, lp: 7500 }));

  // ================================================================ rhythm
  const kick = (t, peak) => S('rhythm', t, 'kick', { peak });
  const snap = (t, peak, pan = 0.15) => S('rhythm', t, 'snap', { peak, pan, send: 0.4 });
  const shaker = (t, peak) => S('rhythm', t, 'shaker', { peak, pan: 0.35 * Math.sin(t * 2.1) });
  for (let b = 0; b < 32; b++) {
    const t = bt(b), inBar = b % 4;
    const light = b >= 4 && b < 12, magic = b >= 12 && b < 19, dawn = b === 20 || b === 21, meet = b >= 24 && b < 27, brand = b >= 28 && b < 31;
    if (light && inBar % 2 === 0) kick(t, 0.03);
    if (magic || brand) kick(t, inBar === 0 ? 0.038 : 0.03);
    if (dawn && b === 20) kick(t, 0.05);
    if (meet && inBar % 2 === 0) kick(t, 0.03);
    if ((magic || brand) && inBar % 2 === 1) snap(t, 0.05);
    if (light && (b === 9 || b === 11)) snap(t, 0.03);
    for (let k = 0; k < 4; k++) {
      const ts = t + k * BEAT / 4 + (k % 2 ? 0.018 : 0);                    // a little swing
      if (magic || brand) shaker(ts, k % 2 ? 0.02 : 0.028);
      else if ((light || meet) && k % 2 === 0) shaker(ts, 0.014);
    }
  }
  kick(bt(27), 0.045); snap(bt(27), 0.04);                                // the line-up lands with the logo
  // fills and risers into the arrivals
  [bt(18.5), bt(18.75)].forEach((t, k) => snap(t, 0.025 + 0.01 * k, -0.2));
  S('rhythm', bt(12), 'riser', { dur: 1.1, peak: 0.03, f1: 5200 });
  S('rhythm', bt(20), 'riser', { dur: 1.0, peak: 0.028, f1: 5600 });
  S('rhythm', bt(27), 'riser', { dur: 0.9, peak: 0.024, f1: 6000 });
  // bass: in with the split; a moving line through the magic; whole notes at dawn; out for the breath
  const B = (t, m, beats, peak = 0.02) => S('rhythm', t, 'bass', { f: hz(m), len: beats * BEAT - 0.05, peak, lp: 650 });
  for (let h = 2; h < 16; h++) {
    const t0 = h * BAR / 2, c = CH[HALF[h]], b0 = Math.round(t0 / BEAT);
    if (b0 >= 22 && b0 < 24) continue;                                    // the breath: the band drops away
    if (b0 >= 30) continue;
    const busy = (b0 >= 12 && b0 < 19) || (b0 >= 28 && b0 < 30);
    if (busy) { B(t0, c.bass, 1.4, 0.016); B(t0 + bt(1.5), c.bass + 12, 0.4, 0.012); }
    else if (b0 === 20) B(t0, c.bass, 1.9, 0.022);
    else B(t0, c.bass, 1.9, 0.016);
  }
  // the heartbeat of the feeling by the lens (bar 1)
  for (const c of of('orb_pulse')) { S('rhythm', c.t, 'pulse', { f: hz(57), peak: 0.026, d: 0.24, lp: 900 }); S('rhythm', c.t + BEAT / 4, 'pulse', { f: hz(57), peak: 0.012, d: 0.16, lp: 700 }); }

  // ================================================================ feelings, Mallows and foley
  const pent = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'].map(NOTE);
  const revealNote = ['E5', 'D5', 'B4', 'C5', 'E5', 'G5'].map(NOTE);
  const HELP = { blubi: ['comfort', 0.4], loomi: ['sigh', 0.45], pipzi: ['celebrate', 0.45], glitzi: ['tap', 0.4], zuzu: ['surprise', 0.35], boppo: ['celebrate', 0.5] };
  for (const c of cues) {
    const t = c.t, pan = c.pan || 0;
    switch (c.type) {
      case 'glance': E(t, 'fx', 'swish', { intensity: 0.12, pan, pitch: 0.85 }, 0.4); break;
      case 'curious': E(t, 'mallow', 'surprise', { intensity: 0.28 }, 0.16, 'noomi'); break;
      case 'split':        // the boop and the bloom
        S('sfx', t - 0.02, 'noiseHit', { filter: 'bandpass', f: 2100, f1: 700, sweep: 0.1, a: 0.003, d: 0.12, peak: 0.05, q: 1.8 });
        S('sfx', t, 'blip', { f: 620, f1: 300, glide: 0.08, a: 0.002, d: 0.12, peak: 0.04, lp: 2500, send: 0.2 });
        S('sfx', t + 0.02, 'air', { a: 0.12, r: 1.0, f0: 900, f1: 3200, q: 0.8, peak: 0.022, width: 0.9, send: 0.5 });
        [72, 76, 79, 84, 88].forEach((m, k) => S('music', t + 0.03 + k * 0.035, 'bell', { f: hz(m), peak: 0.011, decay: 1.2, partials: 'celesta', pan: (k - 2) * 0.35, send: 0.6, lp: 7500 }));
        break;
      case 'reveal': {     // each feeling sounds its own note, in its own colour
        const m = revealNote[c.i];
        switch (c.kind) {
          case 0: P(t, m, 1.2, 0.7, pan); E(t + 0.05, 'fx', 'drip', { intensity: 0.5, pan }, 0.35); break;
          case 1: for (let k = 0; k < 8; k++) S('music', t + k * 0.055, 'pluck', { f: hz(k % 2 ? m + 2 : m), decay: 0.12, peak: 0.011 * (1 - k * 0.08), pan: pan + (k % 2 ? 0.1 : -0.1), send: 0.3, lp: 4500 }); break;
          case 2: P(t, m, 1, 0.75, pan); P(t, m - 12, 1, 0.6, pan); S('rhythm', t, 'kick', { peak: 0.03, d: 0.25 }); E(t + 0.04, 'fx', 'crackle', { intensity: 0.3, pan }, 0.22); break;
          case 3: [0, 0.31, 0.62, 0.94].forEach((d, k) => S('music', t + d, 'bell', { f: hz(m + 12), peak: 0.02 * Math.pow(0.5, k), decay: 1.2, partials: 'celesta', pan: pan * (k % 2 ? -1 : 1), send: 0.7, lp: 7000 })); break;
          case 4: [0, 3, 7, 12, 15, 19].forEach((iv, k) => S('music', t + k * 0.045, 'pluck', { f: hz(m + iv), decay: 0.28, peak: 0.01, pan: pan + (k - 2.5) * 0.08, send: 0.35, lp: 6000 })); break;
          case 5: [m, m + 4, m + 7, m + 12].forEach((n, k) => S('music', t + k * 0.012, 'bell', { f: hz(n), peak: 0.014, decay: 1.4, partials: 'celesta', pan: pan + (k - 1.5) * 0.15, send: 0.5, lp: 7500 })); E(t + 0.05, 'fx', 'bloom', { intensity: 0.4, pan }, 0.25); break;
          default: break;
        }
        break;
      }
      case 'bead':         // the drop of light meets the water
        S('sfx', t, 'blip', { f: hz(revealNote[c.i] + 12), f1: hz(revealNote[c.i] + 19), glide: 0.05, a: 0.002, d: 0.09, peak: 0.016, lp: 4000, pan, send: 0.45 });
        break;
      case 'understand': E(t, 'mallow', 'comfort', { intensity: 0.3 }, 0.18, 'noomi'); break;
      case 'hum':          // Noomi hums: her voice, the choir rises (above), a soft swell of air
        E(t - 0.25, 'mallow', 'comfort', { intensity: 0.45, pitch: 0.5 }, 0.22, 'noomi');
        S('sfx', t, 'air', { a: 0.6, r: 1.6, f0: 300, f1: 1400, q: 0.7, peak: 0.02, width: 0.9, send: 0.6 });
        break;
      case 'morph': E(t, 'fx', 'glass', { intensity: 0.25, pan, pitch: 1 + c.i * 0.05 }, 0.16); break;
      case 'emerge':       // pop: the next note of the rising line
        S('sfx', t, 'blip', { f: 700, f1: 1400, glide: 0.04, a: 0.002, d: 0.06, peak: 0.022, lp: 4200, pan, send: 0.2 });
        S('music', t + 0.01, 'bell', { f: hz(pent[c.i]), peak: 0.024, decay: 1.1, partials: 'celesta', pan, send: 0.45, lp: 7500 });
        S('music', t + 0.01, 'pluck', { f: hz(pent[c.i] + 12), decay: 0.5, peak: 0.012, pan, send: 0.35, lp: 6000 });
        break;
      case 'land':         // a soft plop on the water, tuned to the chord
        S('sfx', t, 'blip', { f: hz(chordAt(t).bass + 24), f1: hz(chordAt(t).bass + 31), glide: 0.06, a: 0.003, d: 0.12, peak: 0.024, lp: 2600, pan, send: 0.35 });
        S('sfx', t, 'noiseHit', { filter: 'bandpass', f: 1500, f1: 500, sweep: 0.1, a: 0.003, d: 0.1, peak: 0.022, q: 1.4, pan });
        break;
      case 'resolve': { const [g, k] = HELP[c.mallow]; E(t, 'mallow', g, { intensity: k, pan }, 0.22, c.mallow); break; }
      case 'group_hop': E(t, 'mallow', 'hop', { intensity: 0.45 }, 0.2, 'noomi'); break;
      case 'group_land':
        S('sfx', t, 'blip', { f: 210, f1: 100, glide: 0.1, a: 0.003, d: 0.18, peak: 0.03, lp: 900 });
        S('sfx', t, 'noiseHit', { filter: 'bandpass', f: 1700, f1: 500, sweep: 0.1, a: 0.003, d: 0.14, peak: 0.035, q: 1.5 });
        break;
      case 'nuzzle': S('sfx', t, 'noiseHit', { filter: 'bandpass', f: 1400, f1: 700, sweep: 0.12, a: 0.01, d: 0.12, peak: 0.02, q: 1.3, pan: -0.3 }); E(t + 0.05, 'mallow', 'comfort', { intensity: 0.3, pan: -0.4 }, 0.16, 'blubi'); break;
      case 'breath_in': S('sfx', t, 'air', { a: c.dur * 0.95, r: 0.2, f0: 500, f1: 1200, q: 1.0, peak: 0.024, width: 0.5, send: 0.35 }); break;
      case 'breath_out': S('sfx', t, 'air', { a: 0.12, r: c.dur * 1.4, f0: 1100, f1: 380, q: 0.9, peak: 0.026, width: 0.7, send: 0.45 }); break;
      case 'eyes_open': S('music', t, 'bell', { f: hz([81, 84, 88, 91, 93, 96][c.k] - 12), peak: 0.016, decay: 0.8, partials: 'celesta', pan: (c.k - 2.5) * 0.3, send: 0.45, lp: 7500 }); break;
      case 'assemble': S('sfx', t, 'air', { a: 0.5, r: 0.7, f0: 600, f1: 1600, q: 1.0, peak: 0.015, width: 0.9, send: 0.4 }); break;
      case 'lineup_land': S('sfx', t, 'noiseHit', { filter: 'bandpass', f: 1600, f1: 520, sweep: 0.1, a: 0.003, d: 0.14, peak: 0.03, q: 1.5 }); break;
      case 'logo': motif(t + 0.01, 1); E(t + 0.55, 'mallow', 'success', { intensity: 0.4 }, 0.16, 'noomi'); break;
      case 'wave': {       // the hello wave: a melody, one Mallow per note
        const run = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6'].map(NOTE);
        S('music', t, 'pluck', { f: hz(run[c.k]), decay: 0.55, peak: 0.022, pan, send: 0.3, lp: 6000 });
        S('music', t, 'bell', { f: hz(run[c.k] + 12), peak: 0.008, decay: 0.6, partials: 'celesta', pan, send: 0.4, lp: 7500 });
        if (c.k % 2 === 0) E(t, 'mallow', 'hop', { intensity: 0.3, pan }, 0.1, c.mallow);
        break;
      }
      case 'wink': S('music', t, 'bell', { f: hz(91), peak: 0.016, decay: 0.5, partials: 'celesta', pan: -0.2, send: 0.4, lp: 7500 }); break;
      case 'return': S('music', t, 'ping', { f: hz(pent[5 - c.i] + 12), rise: 0.99, peak: 0.007, decay: 0.4, pan: (c.i - 2.5) * 0.3, send: 0.6 }); if (c.i === 0) S('sfx', t, 'air', { a: 0.5, r: 0.5, f0: 2400, f1: 800, q: 0.9, peak: 0.016, width: 0.8, send: 0.5 }); break;
      case 'merge': E(t, 'fx', 'chime', { intensity: 0.22 }, 0.12); break;
      default: break;
    }
  }

  for (let i = synth.length - 1; i >= 0; i--) if (synth[i].peak !== undefined && !(synth[i].peak > 1e-5)) synth.splice(i, 1);
  for (const e of [...engine, ...synth]) e.t = r4(((e.t % DUR) + DUR) % DUR);

  // the realm bed: Noomi's Moonmilk Cove, low; warmer at dawn
  const mood = [];
  for (let t = -PRE; t <= DUR + XFADE + 0.2 + 1e-9; t += 0.1) {
    const tc = ((t % DUR) + DUR) % DUR;
    const dawn = tc > 12.5 && tc < 19.5 ? Math.min(1, (tc - 12.5) / 1.2, (19.5 - tc) / 0.5) : 0;
    mood.push({ t: r4(t), m: { agitation: 0.15, heaviness: 0.1, clarity: r4(0.5 + 0.3 * dawn), warmth: r4(0.4 + 0.5 * dawn) } });
  }
  const bed = { realm: 'moonmilk-cove', fadeIn: 0.8, mood, tickWindows: [], level: [[-PRE, 0.42], [DUR, 0.42]], circular: { xfade: XFADE } };
  return {
    SR, PRE, DUR, LAT, engineUrl: '/hushmallow/src/engine/audio.js', kit: 'noomi',
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

/** Gain curves over the loop (circular): the music breathes with the kick and steps back under key moments. */
function mixCurves(plan, cues, DUR) {
  const n = Math.round(DUR * SR), duck = new Float32Array(n).fill(1), bedG = new Float32Array(n).fill(1);
  const kicks = plan.synth.filter((e) => e.stem === 'rhythm' && e.inst === 'kick').map((e) => e.t);
  const key = cues.filter((c) => ['split', 'emerge', 'logo', 'hum'].includes(c.type)).map((c) => c.t);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let g = 1;
    for (const tk of kicks) { let d = t - tk; if (d < -DUR / 2) d += DUR; if (d > DUR / 2) d -= DUR; if (d > -0.006 && d < 0.6) g *= 1 - 0.2 * (d < 0 ? (d + 0.006) / 0.006 : Math.exp(-d / 0.13)); }
    let k = 1;
    for (const tc of key) { let d = t - tc; if (d < -DUR / 2) d += DUR; if (d > -0.03 && d < 0.6) k = Math.min(k, 1 - 0.16 * (d < 0 ? (d + 0.03) / 0.03 : Math.exp(-d / 0.25))); }
    duck[i] = g * k; bedG[i] = g;
  }
  return { duck, bedG };
}

async function main() {
  const [cuesPath, outDir] = process.argv.slice(2);
  if (!cuesPath || !outDir) { console.error('usage: node audio/score-feel-v2.mjs <cues.json> <out dir>'); process.exit(2); }
  const log = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
  const plan = buildPlan(log);
  const say = (m) => console.log('[score-feel-v2]', m);
  say(`${plan.engine.length} engine voices, ${plan.synth.length} synth events (music ${plan.synth.filter((e) => e.stem === 'music').length}, rhythm ${plan.synth.filter((e) => e.stem === 'rhythm').length}, sfx ${plan.synth.filter((e) => e.stem === 'sfx').length})`);
  const session = await openRenderer();
  const stems = {};
  let bedStats = null;
  try {
    for (const stem of ['bed', 'music', 'rhythm', 'sfx']) {
      const p = {
        ...plan, synth: plan.synth.filter((e) => e.stem === stem), engine: stem === 'sfx' ? plan.engine : [],
        bed: { ...plan.bed, mute: stem !== 'bed' },
      };
      const r = await renderMix(p, { session, bedStats, log: (m) => say(`${stem}: ${m}`) });
      bedStats = bedStats || r.xfade;
      stems[stem] = r.x;
      say(`${stem} rendered`);
    }
  } finally { await session.close(); }
  const D = plan.DUR, n = Math.round(D * SR);
  const { duck, bedG } = mixCurves(plan, log.cues, D);
  const LV = { music: 1.0, rhythm: 0.95, sfx: 0.85, bed: 0.75 };
  const mix = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) {
    const j = 2 * i + c;
    mix[j] = stems.music[j] * LV.music * duck[i] + stems.rhythm[j] * LV.rhythm + stems.sfx[j] * LV.sfx + stems.bed[j] * LV.bed * bedG[i];
  }
  const hp = highpassLoop(mix, 40);
  fs.mkdirSync(path.join(outDir, 'stems'), { recursive: true });
  const m = masterToWav(hp, path.join(outDir, 'score.wav'), { circular: true, log: (s) => say(s) });
  // stems at the mix's gain (they sum to the mix before the limiter)
  const gain = Math.pow(10, m.gainDb / 20);
  for (const [name, x] of Object.entries(stems)) {
    const y = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) { const j = 2 * i + c; y[j] = x[j] * LV[name] * (name === 'music' ? duck[i] : name === 'bed' ? bedG[i] : 1) * gain; }
    writeWav24(y, path.join(outDir, 'stems', `${name}.wav`));
  }
  fs.writeFileSync(path.join(outDir, 'score-report.json'), JSON.stringify({ engine: plan.engine.length, synth: plan.synth.length, I: m.I, TP: m.TP, LRA: m.LRA, gainDb: m.gainDb, sr: RSR }, null, 1));
  say(`mastered: ${m.I} LUFS, ${m.TP} dBTP, LRA ${m.LRA} LU → ${outDir}/score.wav`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main().catch((e) => { console.error('[score-feel-v2]', e); process.exit(1); });
