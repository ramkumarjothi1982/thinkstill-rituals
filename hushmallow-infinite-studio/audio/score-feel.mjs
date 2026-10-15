// Original score for "Feel Something?" (videos/feel-something.js), 100 % synthesised in code.
//
//   node audio/score-feel.mjs <cues.json> <out.wav> [--report <file.json>]
//
// Rendered offline in headless Chromium by audio/render-offline.mjs (the studio's
// fork of the approved v2 renderer and mastering) through the app's own Hushmallow
// sound engine (each Mallow speaks with its own kit) plus the studio's synthesis.
// No samples, no music library, no paid or cloud services.
//
// Musical design: 96 BPM, so the 20 s loop is exactly 8 bars (32 beats); every
// visual accent in the direction sits on this grid.
//   harmony   Fmaj9 · Am9 · Dm9 · Fmaj7#11 · Gsus · Cmaj9 · Fmaj9→Gsus · Cmaj9 — the
//             last bar resolves home and flows back into the first across the seam
//   pads      every chord voice is a sustained "swell" whose pan slowly orbits the
//             listener, each voice at its own phase: a swirling stereo field
//   ostinato  a repeating 8th-note arpeggio, its notes circling left↔right every two
//             bars, with a dotted-8th ping-pong echo
//   pulse     a soft heartbeat: half-time in the hook, on every beat in the dream
//             tunnel, gentle in the connection, on every beat for the brand
//   motif     "hush-mal-low", a 3-note celesta signature (G5–E5–C6): at the very
//             start and on the logo
//   foley     every on-screen event has its own sound: reveals by material (liquid,
//             tangle, fire crackle, a lone star, racing thoughts, a bloom), Noomi's
//             reactions in her voice, the boop, each Mallow's emergence in its own
//             voice on a rising pentatonic step, the hello wave as a melody
// Circular render: the tail past 20 s is wrapped onto the start and the realm bed
// crossfades into itself, so the loop has no seam and no fade.

import fs from 'node:fs';
import { renderMix, masterToWav } from './render-offline.mjs';
import { mulberry32 } from './soundtrack.mjs';

const SR = 48000, PRE = 1.0, LAT = 0.012, TAIL = 4.0, XFADE = 1.0, SEED = 20261015;
const BEAT = 0.625, BAR = 4 * BEAT;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const smoothstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
function spline(keys, t) {   // piecewise linear is enough for levels
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return va + (vb - va) * (t - a) / (b - a); }
  return keys[keys.length - 1][1];
}

// chords per half-bar (8 bars × 2): midi notes, low voicing
const F9 = [41, 53, 57, 60, 64, 67], AM9 = [45, 52, 57, 60, 64, 71], DM9 = [38, 50, 57, 60, 65, 64 + 5], FL = [41, 53, 57, 64, 69, 71],
  GS = [43, 55, 60, 62, 67, 69], C9 = [36, 48, 55, 59, 62, 64], C9b = [36, 52, 55, 59, 62, 67];
const HALF = [F9, F9, AM9, AM9, DM9, DM9, FL, FL, GS, GS, C9, C9, F9, GS, C9b, C9b];
const chordAt = (t) => HALF[clamp(Math.floor(((t % 20) + 20) % 20 / (BAR / 2)), 0, 15)];

export function buildPlan(log) {
  const { duration: DUR, cues } = log;
  if (Math.abs(DUR - 32 * BEAT) > 1e-9) throw new Error(`score-feel: expects a 32-beat (20 s) loop, got ${DUR} s`);
  const rnd = mulberry32(SEED);
  const engine = [], synth = [];
  const E = (t, kind, name, opts = {}, trim = 1, kit = null) => engine.push({ t, kind, name, opts, trim, cut: null, ...(kit ? { kit } : {}) });
  const S = (t, inst, p) => synth.push({ t, inst, ...p });
  const of = (type) => cues.filter((c) => c.type === type);

  // ---------------------------------------------------------------- music
  // intensity of the music bed over the story
  const I = (t) => spline([[0, 0.6], [1.8, 0.62], [5.6, 0.72], [6.25, 1], [10.6, 1], [12.4, 0.55], [16.8, 0.62], [17.5, 0.92], [19.3, 0.75], [20, 0.6]], t);
  const bright = (t) => spline([[0, 2000], [6.0, 2100], [7.0, 3400], [10.6, 3400], [12.4, 2200], [17.0, 2400], [17.5, 3000], [20, 2000]], t);

  // pads: one swell per chord voice per half-bar, overlapping (legato), circling at their own phase
  for (let h = 0; h < 16; h++) {
    const t0 = h * BAR / 2, ch = HALF[h];
    if (h > 0 && HALF[h - 1] === ch) continue;                        // a chord that holds keeps sounding
    let len = 1; while (h + len < 16 && HALF[h + len] === ch) len++;
    const dur = len * BAR / 2;
    ch.forEach((m, v) => {
      const bass = v === 0;
      S(t0 - 0.35, 'swell', {
        f: hz(bass ? m + 12 : v >= 2 ? m + 12 : m), a: 0.9, h: Math.max(0.1, dur - 0.9), r: 1.9, peak: (bass ? 0.0035 : v >= 2 ? 0.0042 : 0.0034) * (0.75 + 0.25 * I(t0)),
        pan: 0, width: bass ? 0 : 0.95, orbit: bass ? 0 : 0.1 + 0.015 * v, phase: v * 2 * Math.PI / 5, detune: 5 + v,
        lp0: bass ? 260 : bright(t0) * 0.6, lp1: bass ? 320 : bright(t0 + dur), send: bass ? 0.05 : 0.4,
      });
    });
  }

  // ostinato: 8th notes on the chord's upper tones, contour repeating every bar, circling pan + echo
  const PAT = [0, 2, 1, 3, 2, 4, 3, 1];
  for (let k = 0; k < 64; k++) {
    const t = k * BEAT / 2;
    const tones = [...new Set(chordAt(t + 0.01).slice(1).map((m) => { let x = m; while (x < 72) x += 12; while (x > 86) x -= 12; return x; }))].sort((a, b) => a - b);
    const m = tones[PAT[k % 8] % tones.length];
    const acc = k % 8 === 0 ? 1.25 : k % 2 === 0 ? 1.0 : 0.8;
    const pk = 0.019 * I(t) * acc;
    const pan = 0.92 * Math.sin(2 * Math.PI * k / 16);
    S(t, 'pluck', { f: hz(m), decay: 0.55, peak: pk, pan, send: 0.3, lp: bright(t) * 2.2 });
    S(t + 3 * BEAT / 4, 'pluck', { f: hz(m), decay: 0.45, peak: pk * 0.38, pan: -pan, send: 0.5, lp: bright(t) });
  }

  // pulse: a soft heartbeat on the beat grid
  for (let b = 0; b < 32; b++) {
    const t = b * BEAT;
    const tunnel = t >= 6.25 && t < 11.25, brand = t >= 16.875 && t < 19.4, calm = t >= 11.25 && t < 16.875;
    const on = tunnel || brand || b % 2 === 0;
    if (!on) continue;
    const root = hz(chordAt(t + 0.01)[0] + 24);
    const pk = tunnel ? 0.05 : brand ? 0.042 : calm ? 0.022 : 0.032;
    S(t, 'pulse', { f: root, peak: pk * 0.75, d: 0.22, lp: 900 });
    if (tunnel) S(t + BEAT / 4, 'pulse', { f: root, peak: pk * 0.35, d: 0.16, lp: 600 });       // lub-dub
  }

  // glitter: high celesta pings orbiting the listener through the dream tunnel and the brand moment
  for (const [a, b, dens, lvl] of [[6.25, 11.25, 3, 1], [16.875, 19.3, 2, 0.7], [0, 1.8, 1, 0.5]]) {
    for (let t = a; t < b; t += BEAT / dens) {
      const tones = chordAt(t + 0.01).slice(1).map((m) => { let x = m; while (x < 86) x += 12; return x; });
      const m = tones[Math.floor(rnd() * tones.length)];
      const ang = 2 * Math.PI * (t / (4 * BEAT));
      S(t + rnd() * 0.04, 'ping', { f: hz(m), rise: 1.006, peak: (0.004 + 0.004 * rnd()) * lvl * smoothstep(a, a + 0.6, t) * (1 - smoothstep(b - 0.6, b, t)), decay: 0.25 + rnd() * 0.2, pan: 0.9 * Math.sin(ang), send: 0.6 });
    }
  }

  // the "hush-mal-low" signature
  const motif = (t0, k = 1) => [[0, 79], [0.16, 76], [0.36, 84]].forEach(([dt, m], i) => {
    S(t0 + dt, 'bell', { f: hz(m), peak: 0.03 * k * (i === 2 ? 1.15 : 1), decay: i === 2 ? 1.6 : 0.8, partials: 'celesta', pan: [-0.25, 0.25, 0][i], send: 0.5, lp: 7000 });
  });
  motif(0.04, 0.7);

  // ---------------------------------------------------------------- foley
  const pent = [72, 74, 76, 79, 81, 84, 86];
  const VOICE = { blubi: 'comfort', loomi: 'sigh', pipzi: 'celebrate', glitzi: 'offended', zuzu: 'surprise', boppo: 'celebrate' };
  for (const c of cues) {
    const t = c.t, pan = c.pan || 0;
    switch (c.type) {
      case 'blink':
        S(t, 'blip', { f: 1400, f1: 1180, glide: 0.02, a: 0.0015, d: 0.035, peak: 0.03, lp: 3600, send: 0.1 });
        break;
      case 'glance':
        E(t, 'fx', 'swish', { intensity: 0.15, pan, pitch: 0.85 }, 0.55);
        break;
      case 'curious':
        E(t, 'mallow', 'surprise', { intensity: 0.3, pitch: 1.0 }, 0.2, 'noomi');
        break;
      case 'reveal': {
        // the glass rises, then the feeling's own material
        E(t, 'fx', 'bubble', { intensity: 0.7, note: c.i % 5, pan }, 0.5);
        S(t + 0.02, 'bell', { f: hz(pent[c.i]), peak: 0.016, decay: 0.7, partials: 'celesta', pan, send: 0.45, lp: 6500 });
        const k = c.kind;
        if (k === 0) { E(t + 0.12, 'fx', 'drip', { intensity: 0.6, pan }, 0.5); S(t + 0.14, 'blip', { f: 520, f1: 1100, glide: 0.06, a: 0.003, d: 0.12, peak: 0.03, lp: 2600, pan, send: 0.35 }); }
        if (k === 1) E(t + 0.1, 'fx', 'shimmer', { intensity: 0.45, pan, pitch: 1.12 }, 0.4);
        if (k === 2) { E(t + 0.1, 'fx', 'crackle', { intensity: 0.45, pan }, 0.35); S(t + 0.1, 'noiseHit', { filter: 'bandpass', f: 900, f1: 2400, sweep: 0.25, a: 0.03, d: 0.3, peak: 0.025, q: 0.8, pan }); }
        if (k === 3) E(t + 0.12, 'fx', 'star', { intensity: 0.5, pan }, 0.45);
        if (k === 4) for (let n = 0; n < 5; n++) S(t + 0.1 + n * 0.055, 'blip', { f: 900 + n * 160, f1: 1000 + n * 160, glide: 0.03, a: 0.002, d: 0.04, peak: 0.018, lp: 4000, pan: pan + (n - 2) * 0.12, send: 0.2 });
        if (k === 5) E(t + 0.1, 'fx', 'bloom', { intensity: 0.6, pan }, 0.45);
        break;
      }
      case 'react': {
        const r = [['sigh', 0.35, 0.8], ['squeeze', 0.35, 1.3], ['offended', 0.4, 1], ['sigh', 0.3, 0.7], ['tap', 0.35, 1.2], ['celebrate', 0.45, 1]][c.kind];
        E(t, 'mallow', r[0], { intensity: r[1], pitch: r[2] }, 0.22, 'noomi');
        break;
      }
      case 'hop':
        E(t, 'mallow', 'hop', { intensity: 0.5 }, 0.25, 'noomi');
        break;
      case 'land':
        S(t, 'blip', { f: 200, f1: 95, glide: 0.1, a: 0.003, d: 0.2, peak: 0.04, lp: 900 });
        S(t, 'noiseHit', { filter: 'bandpass', f: 1800, f1: 520, sweep: 0.1, a: 0.003, d: 0.15, peak: 0.06, q: 1.6 });
        S(t + 0.04, 'blip', { type: 'triangle', f: 320, f1: 270, glide: 0.35, a: 0.01, d: 0.45, peak: 0.022, lp: 1500, send: 0.18, vib: { rate: 6.4, cents: 80, decay: 0.5 } });
        break;
      case 'gather':   // the feelings drawn in: a rising magnetic shimmer
        S(t, 'air', { a: 0.55, r: 0.45, f0: 500, f1: 2400, q: 1.0, peak: 0.03, width: 0.7, send: 0.35 });
        E(t + 0.1, 'fx', 'shimmer', { intensity: 0.45 }, 0.35);
        break;
      case 'reach':    // stretching up: a rubbery rising squeak
        S(t, 'blip', { type: 'triangle', f: 330, f1: 820, glide: 0.3, a: 0.02, d: 0.25, peak: 0.024, lp: 2200, send: 0.2, vib: { rate: 9, cents: 40, decay: 0.3 } });
        break;
      case 'boop':     // the signature boop: a squishy press, a round pop, a sparkle
        S(t, 'noiseHit', { filter: 'bandpass', f: 2100, f1: 700, sweep: 0.1, a: 0.003, d: 0.14, peak: 0.07, q: 1.8 });
        S(t, 'blip', { f: 620, f1: 300, glide: 0.08, a: 0.002, d: 0.14, peak: 0.06, lp: 2500, send: 0.2 });
        S(t + 0.1, 'blip', { type: 'triangle', f: 400, f1: 800, glide: 0.07, a: 0.004, d: 0.45, peak: 0.028, lp: 2600, send: 0.25, vib: { rate: 6.5, cents: 85, decay: 0.5 } });
        E(t, 'mallow', 'press', { intensity: 0.5 }, 0.2, 'noomi');
        break;
      case 'pulse':    // the ring rolling out, the world turning: a deep swell, a portal shimmer, a chord bell
        S(t, 'air', { a: 0.35, r: 1.8, f0: 300, f1: 1800, q: 0.7, peak: 0.04, width: 0.8, send: 0.5 });
        [65, 69, 76, 83].forEach((m, i) => S(t, 'swell', { f: hz(m), a: 0.25, h: 0.4, r: 2.2, peak: 0.006, pan: 0, width: 0.9, orbit: 0.35, phase: i * 1.57, detune: 7, lp0: 1500, lp1: 5000, send: 0.6 }));
        E(t + 0.05, 'fx', 'shimmer', { intensity: 0.5 }, 0.35);
        [65, 72, 76, 79].forEach((m, i) => S(t + 0.05 + i * 0.04, 'bell', { f: hz(m + 12), peak: 0.012, decay: 1.6, partials: 'celesta', pan: (i - 1.5) * 0.4, send: 0.6, lp: 7000 }));
        break;
      case 'morph':    // the feeling transforming: a glassy rising shimmer
        E(t, 'fx', 'glass', { intensity: 0.4, pan, pitch: 1 + c.i * 0.06 }, 0.3);
        break;
      case 'emerge': { // pop! the Mallow, in its own voice, on a rising pentatonic step
        S(t, 'blip', { f: 700, f1: 1500, glide: 0.04, a: 0.002, d: 0.08, peak: 0.045, lp: 4200, pan, send: 0.2 });
        S(t, 'noiseHit', { filter: 'highpass', f: 2800, f1: 6000, sweep: 0.15, a: 0.003, d: 0.2, peak: 0.016, pan, send: 0.35 });
        S(t + 0.01, 'bell', { f: hz(pent[c.i]), peak: 0.026, decay: 1.0, partials: 'celesta', pan, send: 0.45, lp: 7000 });
        E(t + 0.06, 'mallow', VOICE[c.mallow] || 'celebrate', { intensity: 0.55, pan }, 0.26, c.mallow);
        for (let n = 0; n < 5; n++) S(t + 0.1 + n * 0.07 + rnd() * 0.03, 'ping', { f: hz(pent[(c.i + n) % 7] + 12), rise: 1.012, peak: 0.006, decay: 0.25, pan: clamp(pan + (rnd() - 0.5) * 0.6, -1, 1), send: 0.5 });
        break;
      }
      case 'giggle':
        E(t, 'mallow', 'celebrate', { intensity: 0.4, pitch: 1.1 }, 0.24, 'noomi');
        break;
      case 'recede':
        S(t, 'air', { a: 0.4, r: 1.4, f0: 1500, f1: 500, q: 0.8, peak: 0.022, width: 0.8, send: 0.5 });
        break;
      case 'fond':
        E(t, 'mallow', 'comfort', { intensity: 0.35 }, 0.24, 'noomi');
        break;
      case 'line':
        S(t, 'bell', { f: hz([76, 79, 84][c.n]), peak: 0.014, decay: 1.0, partials: 'celesta', pan: 0, send: 0.5, lp: 6000 });
        break;
      case 'glow':     // a warm glow from within
        S(t, 'swell', { f: hz(64), a: 0.4, h: 0.3, r: 1.5, peak: 0.01, pan: 0, width: 0.4, orbit: 0.3, phase: 0, lp0: 900, lp1: 2200, send: 0.5 });
        E(t + 0.05, 'fx', 'bloom', { intensity: 0.4 }, 0.3);
        break;
      case 'assemble':
        for (let n = 0; n < 3; n++) S(t + n * 0.25, 'air', { a: 0.5, r: 0.6, f0: 700, f1: 1500, q: 1.0, peak: 0.016, width: 0.9, send: 0.3 });
        break;
      case 'settle':
        if (c.i === 0) {
          S(t, 'blip', { f: 210, f1: 100, glide: 0.1, a: 0.003, d: 0.2, peak: 0.04, lp: 900 });
          S(t, 'noiseHit', { filter: 'bandpass', f: 1700, f1: 500, sweep: 0.1, a: 0.003, d: 0.16, peak: 0.05, q: 1.5 });
        }
        break;
      case 'logo':
        motif(t + 0.02, 1);
        E(t + 0.5, 'mallow', 'success', { intensity: 0.45 }, 0.22, 'noomi');
        break;
      case 'wave': {   // the hello wave: a melody, one Mallow per note, each in its own voice
        S(t, 'pluck', { f: hz(pent[c.k]), decay: 0.6, peak: 0.03, pan, send: 0.3, lp: 5000 });
        E(t, 'mallow', 'hop', { intensity: 0.4, pan }, 0.16, c.mallow);
        break;
      }
      case 'wink':
        S(t, 'bell', { f: hz(91), peak: 0.016, decay: 0.5, partials: 'celesta', pan: -0.2, send: 0.4, lp: 7500 });
        S(t, 'blip', { f: 1700, f1: 1400, glide: 0.02, a: 0.0015, d: 0.03, peak: 0.022, lp: 4000 });
        break;
      case 'return':   // each Mallow back into its feeling: a reversed shimmer
        S(t, 'ping', { f: hz(pent[6 - c.i] + 12), rise: 0.985, peak: 0.008, decay: 0.35, pan, send: 0.55 });
        if (c.i === 0) S(t, 'air', { a: 0.6, r: 0.5, f0: 2200, f1: 700, q: 0.9, peak: 0.02, width: 0.8, send: 0.5 });
        break;
      case 'hook_in':
        E(t, 'fx', 'chime', { intensity: 0.25 }, 0.12);
        break;
      default: break;
    }
  }

  // nothing silent (an exponential envelope cannot target 0), every discrete event inside the loop
  for (let i = synth.length - 1; i >= 0; i--) if (synth[i].peak !== undefined && !(synth[i].peak > 1e-5)) synth.splice(i, 1);
  for (const e of [...engine, ...synth]) e.t = r4(((e.t % DUR) + DUR) % DUR);

  // the realm bed: Noomi's Moonmilk Cove, very low, warmer as the world warms
  const mood = [];
  for (let t = -PRE; t <= DUR + XFADE + 0.2 + 1e-9; t += 0.1) {
    const tc = ((t % DUR) + DUR) % DUR;
    const warm = spline([[0, 0], [10.8, 0], [12.6, 1], [19.1, 1], [19.9, 0], [20, 0]], tc), dream = spline([[0, 0], [6.25, 0], [7.1, 1], [10.6, 1], [12.4, 0.4], [20, 0]], tc);
    mood.push({ t: r4(t), m: { agitation: r4(0.15 + 0.15 * dream), heaviness: 0.1, clarity: r4(0.5 + 0.3 * warm), warmth: r4(0.35 + 0.55 * warm) } });
  }
  const bed = { realm: 'moonmilk-cove', fadeIn: 0.8, mood, tickWindows: [], level: [[-PRE, 0.5], [DUR, 0.5]], circular: { xfade: XFADE } };

  return {
    SR, PRE, DUR, LAT, engineUrl: '/hushmallow/src/engine/audio.js', kit: 'noomi',
    engine: engine.sort((a, b) => a.t - b.t), synth: synth.sort((a, b) => a.t - b.t),
    ticks: [], crickets: [], swirl: null, pad: null, bed, fade: null, circular: { tail: TAIL },
  };
}

/**
 * 4th-order high-pass (two Butterworth biquads) on an interleaved stereo loop, run circularly:
 * the filter first runs over the whole loop to reach its steady state, then over it again,
 * so the filtered loop is seamless too. Phones cannot play below ~80 Hz; it only eats headroom.
 */
function highpassLoop(x, fc) {
  const n = x.length / 2, w = 2 * Math.PI * fc / SR, cs = Math.cos(w), out = new Float32Array(x.length);
  const stages = [0.5412, 1.3066].map((q) => {
    const al = Math.sin(w) / (2 * q), a0 = 1 + al;
    return { b0: (1 + cs) / 2 / a0, b1: -(1 + cs) / a0, b2: (1 + cs) / 2 / a0, a1: -2 * cs / a0, a2: (1 - al) / a0 };
  });
  for (let ch = 0; ch < 2; ch++) {
    const st = stages.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        let v = x[2 * i + ch];
        stages.forEach((c, k) => { const z = st[k]; const y = c.b0 * v + c.b1 * z.x1 + c.b2 * z.x2 - c.a1 * z.y1 - c.a2 * z.y2; z.x2 = z.x1; z.x1 = v; z.y2 = z.y1; z.y1 = y; v = y; });
        if (pass === 1) out[2 * i + ch] = v;
      }
    }
  }
  return out;
}

async function main() {
  const [cuesPath, outWav] = process.argv.slice(2);
  if (!cuesPath || !outWav) { console.error('usage: node audio/score-feel.mjs <cues.json> <out.wav>'); process.exit(2); }
  const log = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
  const plan = buildPlan(log);
  console.log(`[score-feel] ${plan.engine.length} engine voices, ${plan.synth.length} synth events`);
  const { x: raw } = await renderMix(plan, { log: (m) => console.log('[score-feel]', m) });
  const x = highpassLoop(raw, 75);
  const m = masterToWav(x, outWav, { circular: true, log: (s) => console.log('[score-feel]', s) });
  console.log(`[score-feel] mastered: ${m.I} LUFS, ${m.TP} dBTP, LRA ${m.LRA} LU → ${outWav}`);
  const ri = process.argv.indexOf('--report');
  if (ri > 0) fs.writeFileSync(process.argv[ri + 1], JSON.stringify({ engine: plan.engine.length, synth: plan.synth.length, I: m.I, TP: m.TP, LRA: m.LRA, gainDb: m.gainDb }, null, 1));
}

main().catch((e) => { console.error('[score-feel]', e); process.exit(1); });
