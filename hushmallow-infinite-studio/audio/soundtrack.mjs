// Hushmallow Infinite Studio — original soundtrack for a cue log.
//
//   node audio/soundtrack.mjs <cues.json> <out.wav>
//   debug: --raw mix.f32 (also dump the un-normalised mix)  --mute engine,synth,ticks,crickets,swirl,pad,bed
//
// Renders the full soundtrack (48 kHz stereo, pcm_s24le, exactly `duration`
// seconds) from the cue log written by `node render/render.mjs --dry`.
// Every sound is synthesised; there are no samples and no paid services:
//
//   • the Hushmallow sound engine (../hushmallow/src/engine/audio.js — 100 %
//     procedural Web Audio, project-owned) supplies Noomi's voice (music box /
//     celesta gestures), the ritual fx (bubble, chime, breathe-in/-out, swish)
//     and the Moonmilk Cove ambience bed. The engine file is only READ: the
//     page fetches it as text and appends one export line in memory.
//   • this file adds the studio's own synthesis on top: clock tick-tock,
//     distant crickets, the cartoon eye-pop and boing, blink clicks, tail-dot
//     blips, squishy pops, the orbit swirl + tension tone, breath air, the
//     squash-and-release, dissolve sparkles and the warm transformation pad.
//
// How it works
//   1. Node turns the cue log into a plan: which sound plays when, plus
//      automation curves sampled from the per-frame `curves` (orbit, anx,
//      agitation, warmth, …). All plan randomness is a seeded mulberry32.
//   2. Headless Chromium (Playwright) renders the plan in an
//      OfflineAudioContext. Math.random is seeded before any page code runs,
//      so the engine's noise buffers / reverb / micro-detune are reproducible.
//      Engine voices schedule at `ctx.currentTime + 12 ms` and some filter
//      sweeps start "now", so the render is suspended at each engine cue and
//      the engine sees a currentTime chosen to land the sound on the frame.
//   3. Node normalises to -16 LUFS integrated (EBU R128, measured by ffmpeg)
//      with a look-ahead true-peak limiter (ceiling -2 dBTP, ≤ -1.5 dBTP
//      measured) and writes the WAV with ffmpeg.
//
// Timing: everything is routed through the engine's gentle master chain
// (high-pass, high-shelf cut, low-pass, soft compressor, limiter). Its two
// DynamicsCompressors delay the signal by 2 × 6 ms, so every source is
// scheduled LAT = 12 ms early; the audible onset then lands on the cue time
// (QA measures it: audio/qa.py). A 1 s pre-roll is rendered and discarded so
// the bed, crickets and reverb are already alive at frame 0 (0.3 s fade-in).
//
// Determinism: same cues.json → bit-identical WAV. Math.random is seeded, Voice
// self-disposal (main-thread timing) is disabled, and node inputs are kept at
// ≤ 2 connections so Chromium's summing order cannot vary (offlineDeterminism).
//
// Phone translation: phone speakers roll off below ~350-400 Hz, so every key
// gesture (startle, bubbles, squash-and-release, open, chime) carries its shape
// in the 0.6-2.5 kHz band; low layers (thuds, the pad's root) are support for
// headphones only, and the warm pad is high-passed so the calm stays light.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from '../render/serve.mjs';

const SR = 48000;
const PRE = 1.0;            // pre-roll (s): rendered then discarded, so the night is already alive at frame 0
const LAT = 0.012;          // master-chain look-ahead (2 compressors × 6 ms)
const SEED = 20261013;      // same seed as the video render
const TARGET_LUFS = -16;
const MAX_TP = -1.5;        // dBTP, hard requirement
const CEILING_DBTP = -2.0;  // limiter ceiling on the 4× oversampled estimate (0.5 dB margin)
const ENGINE_URL = '/hushmallow/src/engine/audio.js';

// ---------------------------------------------------------------- helpers --

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smoothstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const st = (semis) => Math.pow(2, semis / 12);
const r4 = (x) => Math.round(x * 1e4) / 1e4;

// linear interpolation of the per-frame curves (30 fps) at any time t
function curveSampler(curves, fps) {
  return (key, t) => {
    const u = clamp(t * fps, 0, curves.length - 1);
    const i = Math.floor(u), f = u - i;
    const a = curves[i][key], b = curves[Math.min(i + 1, curves.length - 1)][key];
    return a + (b - a) * f;
  };
}

// ThoughtField layout: the orbit ellipse and each thought's home (offset from Noomi's head).
// The swirl needs it so that each whoosh peaks when its bubble passes in front of Noomi.
// The source of truth is the video module (videos/<video>.js); the cue log does not carry
// it, so it is read from the module's source text (read-only, never executed) and
// cross-checked against the cue log: every bubble / mini cue's pan is home.x / 420
// (stage/components/thought-bubbles.js). If the module cannot be read or does not
// match, the layout below (my-brain-at-2am at the time of writing) is used instead.
const FALLBACK_LAYOUT = {
  orbit: { start: 5.0, full: 5.5, rx: 196, ry: 76, cy: -200 },
  bubbles: [[-168, -128], [150, -222], [182, -78]],
  minis: [[-262, -12], [262, -170], [-40, -318], [-250, -262]],
};

function thoughtLayout(log) {
  if (log.thoughtField?.orbit && Array.isArray(log.thoughtField.bubbles)) return { ...log.thoughtField, source: 'cues.json' };
  const fail = (why) => { console.warn(`[soundtrack] thought layout: ${why}; using the built-in layout`); return { ...FALLBACK_LAYOUT, source: 'fallback' }; };
  let src;
  try {
    src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'videos', `${log.video}.js`), 'utf8');
  } catch { return fail(`videos/${log.video}.js not readable`); }
  const num = (re, s = src) => { const m = s.match(re); return m ? parseFloat(m[1]) : NaN; };
  const field = src.slice(Math.max(0, src.indexOf('new ThoughtField(')));   // the field's options object
  const between = (a, b) => { const i = field.indexOf(a), j = i < 0 ? -1 : field.indexOf(b, i); return i < 0 || j < 0 ? '' : field.slice(i, j); };
  const homes = (s) => [...s.matchAll(/home:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g)].map((m) => [+m[1], +m[2]]);
  const orbitSrc = between('orbit: {', 'speed:');
  const L = {
    orbit: { start: num(/orbitStart:\s*([\d.]+)/), full: num(/orbitFull:\s*([\d.]+)/),
      rx: num(/\brx:\s*(-?[\d.]+)/, orbitSrc), ry: num(/\bry:\s*(-?[\d.]+)/, orbitSrc), cy: num(/\bcy:\s*(-?[\d.]+)/, orbitSrc) },
    bubbles: homes(between('bubbles: [', 'minis: [')),
    minis: homes(between('minis: [', 'orbit: {')),
    source: `videos/${log.video}.js`,
  };
  if (!Object.values(L.orbit).every(Number.isFinite) || !L.bubbles.length) return fail('orbit / homes not found in the module');
  for (const c of log.cues) {
    const h = c.type === 'bubble' ? L.bubbles[c.id] : c.type === 'mini' ? L.minis[c.id - 10] : undefined;
    if ((c.type === 'bubble' || c.type === 'mini') && (!h || Math.abs(clamp(h[0] / 420, -1, 1) - c.pan) > 1e-3)) {
      return fail(`module does not match the cue log (${c.type} ${c.id})`);
    }
  }
  return L;
}

// pitches (Hz): C major pentatonic, the key of Noomi's kit and the realm hum
const N = { C3: 130.81, G3: 196.0, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880.0, C6: 1046.5, D6: 1174.66, E6: 1318.51,
  G6: 1567.98, A6: 1760.0, C7: 2093.0, D7: 2349.32, E7: 2637.02 };

// ------------------------------------------------------------- the plan --
// Node decides WHAT plays WHEN (this function is the cue → sound map);
// the page (renderInPage) decides HOW each instrument sounds.

function buildPlan(log) {
  const { duration: DUR, fps, cues, curves } = log;
  const C = curveSampler(curves, fps);
  const rnd = mulberry32(SEED ^ 0x51ab1e);
  const rr = (a, b) => a + rnd() * (b - a);
  const engine = [];   // { t, kind: 'mallow'|'fx', name, opts, trim, cut? }
  const synth = [];    // { t, inst, ...params }  — custom instruments (see renderInPage)
  const E = (t, kind, name, opts = {}, trim = 1, cut = null) => engine.push({ t, kind, name, opts, trim, cut });
  const S = (t, inst, p) => synth.push({ t, inst, ...p });

  const of = (type) => cues.filter((c) => c.type === type).sort((a, b) => a.t - b.t);
  const first = (type) => of(type)[0];
  const startle = first('startle')?.t ?? 1.8;
  const close = first('close')?.t ?? 7.0;
  const exhale = first('exhale') || { t: 9.0, dur: 1.2 };
  const bubblePan = Object.fromEntries(of('bubble').map((c) => [c.id, c.pan]));
  const miniPan = Object.fromEntries(of('mini').map((c) => [c.id, c.pan]));
  const hardBlinks = of('blink').filter((c) => !c.soft);
  const ping = first('ping')?.t ?? startle - 0.3;
  const open = first('open')?.t ?? exhale.t + 2.3;
  const chimeT = first('chime')?.t ?? DUR - 1.6;
  const releaseT = first('release')?.t ?? null;

  for (const c of cues) {
    const t = c.t;
    switch (c.type) {
      case 'ping': // the unwanted memory arrives: a delicate music-box twinkle
        E(t, 'mallow', 'tap', { intensity: 0.3 }, 0.5);
        S(t + 0.045, 'bell', { f: N.A6, peak: 0.008, decay: 0.55, partials: 'celesta', send: 0.45 });
        S(t + 0.10, 'bell', { f: N.E7, peak: 0.0035, decay: 0.4, partials: 'celesta', send: 0.45 });
        break;

      case 'startle': // THE comedic beat: cartoon eye-pop ON the frame + Noomi's surprise + a tiny boing
        // still the loudest gesture of the piece, but ~4 LU above the mix, not a stinger
        S(t, 'blip', { f: 340, f1: 1500, glide: 0.045, a: 0.0015, h: 0.012, d: 0.055, peak: 0.07, lp: 4200, send: 0.12 });
        S(t, 'blip', { type: 'triangle', f: 170, f1: 750, glide: 0.045, a: 0.0015, h: 0.012, d: 0.06, peak: 0.034, lp: 1800 });
        S(t + 0.02, 'blip', { type: 'triangle', f: 235, f1: 440, glide: 0.07, a: 0.006, d: 0.42, peak: 0.035, lp: 1600, send: 0.15,
          vib: { rate: 14, cents: 70, decay: 0.4 } });
        E(t, 'mallow', 'surprise', { intensity: 0.9 }, 0.33);
        break;

      case 'blink':
        if (c.soft) { // sleepy, adorable: one tiny celesta tink
          S(t, 'bell', { f: N.G6, peak: 0.024, decay: 0.55, partials: 'celesta', send: 0.4, lp: 5200 });
        } else {      // comedic wide-eyed double blink: "bip" … "bip" (second one higher)
          const k = hardBlinks.indexOf(c);
          const f = k === 0 ? 1320 : 1500;
          S(t, 'blip', { f, f1: f * 0.84, glide: 0.022, a: 0.0015, d: 0.04, peak: 0.065, lp: 3600, send: 0.1 });
          S(t, 'blip', { f: f / 2, a: 0.0015, d: 0.025, peak: 0.03, lp: 2000 });
        }
        break;

      case 'glance': // eyes slide sideways, suspicious: a soft little swish toward the glance
        E(t, 'fx', 'swish', { intensity: 0.15, pan: -0.45, pitch: 0.8 }, 0.75);
        break;

      case 'tail': { // the three dots of a thought bubble: tiny ascending blips
        const base = [[N.C6, N.D6, N.E6], [N.D6, N.E6, N.G6], [N.E6, N.G6, N.A6]][clamp(c.id, 0, 2)] || [N.C6, N.D6, N.E6];
        const f = base[clamp(c.step, 0, 2)];
        S(t, 'blip', { f, f1: f * 1.06, glide: 0.015, a: 0.002, d: 0.05, peak: 0.024, pan: c.pan, lp: 4200, send: 0.2 });
        break;
      }

      case 'bubble': { // a thought bubble pops in: round squishy "bloop", one pentatonic step higher each time
        const i = clamp(c.id, 0, 2);
        // Higher pitches read louder, so trims step down as the pitch steps up. The layers are
        // flammed by a few ms (heard as one "bloop", but their peaks no longer stack); the
        // music-box note has the crispest attack, so it leads, exactly on the frame.
        E(t, 'mallow', 'tap', { intensity: 0.5, pan: c.pan, pitch: [1, st(3), st(7)][i] }, [0.66, 0.66, 0.58][i]);
        S(t + 0.006, 'noiseHit', { filter: 'lowpass', f: 1900, f1: 380, sweep: 0.06, a: 0.003, d: 0.07, peak: 0.036, q: 1.2, pan: c.pan });
        E(t + 0.012, 'fx', 'bubble', { intensity: 1, note: [0, 2, 4][i], pan: c.pan }, [1.05, 0.95, 0.76][i]);
        S(t + 0.024, 'blip', { f: 230 * st([0, 4, 9][i]), f1: 470 * st([0, 4, 9][i]), glide: 0.035, a: 0.005, d: 0.15, peak: 0.045, pan: c.pan, lp: 1800 });
        break;
      }

      case 'mini': { // small glyph bubbles (?, !, …, ?!): smaller, higher blips — escalation
        const i = clamp(c.id - 10, 0, 3);
        E(t, 'fx', 'bubble', { intensity: 0.8, note: 5 + i, pan: c.pan }, [1.5, 1.42, 1.34, 1.25][i]);
        S(t + 0.012, 'bell', { f: [N.G6, N.A6, N.C7, N.D7][i], peak: 0.016, decay: 0.25, partials: 'celesta', pan: c.pan, send: 0.2 });
        break;
      }

      case 'panic': // overwhelm squash: a soft low wobble under the swirl
        S(t + 0.01, 'blip', { type: 'triangle', f: 200, f1: 140, glide: 0.09, a: 0.008, d: 0.2, peak: 0.045, lp: 900,
          vib: { rate: 9, cents: 40, decay: 0.2 } });
        break;

      case 'inhale': { // one deep, slow inhale; cut cleanly at the puffed-cheek hold
        const hold = first('hold')?.t ?? t + (c.dur || 1.5);
        const dur = clamp(c.dur || 1.5, 1, 3);
        E(t, 'fx', 'breathe-in', { duration: dur, intensity: 0.7 }, 0.38, { at: hold - 0.1, fade: 0.14 });
        S(t, 'air', { dur: hold - t + 0.06, a: hold - t - 0.12, r: 0.16, f0: 750, f1: 1600, q: 0.9, peak: 0.07, width: 0.25, send: 0.2 });
        break;
      }

      case 'exhale': { // long exhale + the soft circle of calm rolling out
        const dur = clamp((c.dur || 1.2) + 0.3, 1, 3);
        E(t, 'fx', 'breathe-out', { duration: dur, intensity: 0.7 }, 0.31);
        E(t, 'mallow', 'press', { intensity: 0.4 }, 0.33);           // the body squishes wide (soft)
        E(t + 0.05, 'mallow', 'sigh', { intensity: 0.35 }, 0.3);
        S(t, 'air', { dur: dur + 0.2, a: 0.12, r: dur, f0: 1300, f1: 420, q: 0.7, peak: 0.07, width: 0.65, send: 0.3 });
        break;
      }

      case 'dissolve': // each thought loses its words → glassy chime (the cloud of sparkles is added below)
        E(t, 'fx', 'chime', { intensity: 0.35, pitch: [st(3), 1, st(-5)][clamp(c.id, 0, 2)], pan: (bubblePan[c.id] || 0) * 0.8 }, 0.19);
        break;
      case 'dissolveMini':
        E(t, 'fx', 'chime', { intensity: 0.25, pitch: { 10: st(7), 11: st(5), 12: st(-2), 13: st(3) }[c.id] || 1, pan: (miniPan[c.id] || 0) * 0.8 }, 0.13);
        break;

      // The squash-and-release must read on a phone speaker (nothing below ~350 Hz survives), so
      // the gesture itself lives in the mids: Noomi's squeeze / release an octave up, a band-passed
      // squelch and a mid boing. The low thud / sub-boing only add weight on headphones.
      case 'squish': // satisfying squash: squelch sweeping down + the squeezed glide, held until the release
        // the squeezed glide is held, then cut just before the release: a beat of anticipation
        E(t, 'mallow', 'squeeze', { intensity: 0.7, pitch: 2 }, 0.2,
          releaseT && releaseT > t + 0.12 ? { at: releaseT - 0.08, fade: 0.05 } : null);
        S(t, 'noiseHit', { filter: 'bandpass', f: 1800, f1: 600, sweep: 0.11, a: 0.003, d: 0.12, peak: 0.08, q: 1.5 });
        S(t, 'blip', { f: 215, f1: 118, glide: 0.09, a: 0.004, d: 0.16, peak: 0.058, lp: 1200 });
        break;
      case 'release': // … and elastic release: stretch pop + springy boing, jelly wobble
        E(t, 'mallow', 'release', { intensity: 0.7, pitch: 2 }, 0.32);
        S(t, 'blip', { f: 620, f1: 1250, glide: 0.035, a: 0.002, d: 0.06, peak: 0.08, lp: 3000, send: 0.1 });
        S(t, 'blip', { type: 'triangle', f: 420, f1: 840, glide: 0.07, a: 0.004, d: 0.5, peak: 0.05, lp: 2600, send: 0.2,
          vib: { rate: 7.5, cents: 85, decay: 0.5 } });
        S(t, 'blip', { f: 210, f1: 420, glide: 0.07, a: 0.004, d: 0.4, peak: 0.026, lp: 1200, vib: { rate: 7.5, cents: 85, decay: 0.5 } });
        break;

      case 'open': // eyes open halfway, tiny peaceful smile: warm, content glide + a tiny celesta smile on the frame
        E(t, 'mallow', 'comfort', { intensity: 0.3, pitch: 2 }, 0.35);
        S(t, 'bell', { f: N.G5, peak: 0.02, decay: 0.7, partials: 'celesta', send: 0.4, lp: 5000 });
        S(t + 0.11, 'bell', { f: N.C6, peak: 0.015, decay: 0.8, partials: 'celesta', send: 0.45, lp: 5000 });
        break;

      case 'chime': // logo pillow + hushmallow.com: the soothing closing chime, let it ring
        E(t, 'mallow', 'success', { intensity: 0.55 }, 0.38);   // gentle: clearly below the startle
        break;

      case 'sleep': // drifting back to sleep, under the chime
        E(t, 'mallow', 'sigh', { intensity: 0.3 }, 0.7);
        break;

      default: break; // sweat, hold, close, endline: carried by the beds (see below), no discrete sound
    }
  }

  // ---- dissolve sparkle cloud: tiny high sine pings, panned randomly, drifting up, fading out (~9.1 → 11)
  const d0 = Math.min(...of('dissolve').concat(of('dissolveMini')).map((c) => c.t), exhale.t + 0.08);
  const sparkleNotes = [N.C6, N.D6, N.E6, N.G6, N.A6, N.C7, N.D7, N.E7];
  for (let t = d0; t < d0 + 1.95;) {
    const age = t - d0;
    const level = Math.exp(-age / 0.75);
    const f = sparkleNotes[Math.floor(rnd() * sparkleNotes.length)] * (rnd() < 0.15 ? 0.5 : 1);
    S(t, 'ping', { f, rise: 1.012 + 0.01 * rnd(), peak: 0.011 * (0.5 + 0.5 * rnd()) * (0.25 + 0.75 * level),
      decay: rr(0.14, 0.32), pan: rr(-0.85, 0.85), send: 0.45 });
    t += lerp(0.035, 0.11, age / 1.95) * rr(0.6, 1.4);
  }

  // ---- transient windows: the clock keeps out of the way of every pop
  const transient = cues.filter((c) => ['ping', 'startle', 'blink', 'glance', 'tail', 'bubble', 'mini', 'panic'].includes(c.type)).map((c) => c.t);
  const clear = (t) => {
    for (const ct of transient) if (t > ct - 0.085 && t < ct + 0.06) return ct + 0.06;
    return null;
  };

  // ---- clock tick-tock: 1/s until the startle; resumes ~3.0 s and accelerates with anx (≤ 3/s); stops at close
  const ticks = [];
  const addTick = (t) => { const hi = ticks.length % 2 === 0; ticks.push({ t: r4(t), hi, peak: 0.042 * (1 + 0.6 * C('anx', Math.max(0, t))) }); };
  for (let t = -0.85; t < startle - 0.1; t += 1) addTick(t);
  {
    let t = Math.max(startle + 0.9, (first('glance')?.t ?? startle + 0.8) + 0.3);   // after the blink/glance gag (~2.9 s)
    while (t < close - 0.03) {
      let moved = clear(t);
      while (moved !== null) { t = moved; moved = clear(t); }
      if (t >= close - 0.03) break;
      addTick(t);
      const rate = clamp(1 + 2.2 * Math.pow(C('anx', t), 0.7), 1, 3.2);
      t += 1 / rate;
    }
  }

  // ---- distant crickets: scene 1 until the startle (they stop dead — comedic), back very softly in the calm ending
  const crickets = [];
  for (const [f, pan, period, pulses] of [[4150, -0.55, 0.64, 3], [3880, 0.6, 0.83, 4]]) {
    const ev = [];
    const chirps = (from, to, amp, fadeIn = 0) => {
      for (let t = from + rnd() * period; t < to; t += period * rr(0.85, 1.15)) {
        const k = fadeIn ? smoothstep(from, from + fadeIn, t) : 1;
        for (let p = 0; p < pulses; p++) {
          const tp = t + p * 0.031;
          if (tp + 0.018 < to) ev.push({ t: r4(tp), dur: 0.018, amp: amp * k * (p === 0 ? 0.75 : 1) });
        }
      }
    };
    chirps(-PRE, startle, 0.0075);
    chirps(open + 0.4, DUR - 0.5, 0.0042, 1.2);
    crickets.push({ f, pan, ev });
  }

  // ---- orbit swirl: per-thought band-passed noise whooshes that follow the actual orbit
  //      (angle = ∫orbit dt, as stage/components/thought-bubbles.js): each whoosh swells as its
  //      thought passes in front of Noomi and pans with the rotation; brighter and louder with speed.
  //      When Noomi closes its eyes the anxiety drops but the thoughts keep circling, so from `close`
  //      the level follows the orbit speed alone (anx held at its close value) and the swirl winds
  //      down with the visible orbit (~7 → 9 s), muffled and a little softer under the inhale.
  const LAY = thoughtLayout(log);
  const ORB = LAY.orbit;
  const homes = [...LAY.bubbles.map(([x, y]) => [x, y, 0]), ...LAY.minis.map(([x, y]) => [x, y, 1])];
  const orbitAt = curves.map((c, i) => [i / fps, c.orbit]).filter(([, o]) => o > 0.01);
  const orbitMax = Math.max(0.5, ...curves.map((c) => c.orbit));    // normalise to this video's top speed
  const sw = { t0: Math.max(0, ORB.start - 0.4), t1: Math.min(DUR, (orbitAt.length ? orbitAt[orbitAt.length - 1][0] : close + 2) + 0.4), dt: 0.01 };
  const n = Math.round((sw.t1 - sw.t0) / sw.dt) + 1;
  const ang = new Float64Array(n); // ∫ orbit dt from 0
  {
    let acc = 0; const h = 1 / 240;
    for (let tt = h / 2; tt < sw.t0; tt += h) acc += C('orbit', tt) * h;
    ang[0] = acc;
    for (let i = 1; i < n; i++) {
      const ta = sw.t0 + (i - 1) * sw.dt;
      for (let s = 0; s < 4; s++) acc += C('orbit', ta + (s + 0.5) * sw.dt / 4) * sw.dt / 4;
      ang[i] = acc;
    }
  }
  const angAtStart = (() => { let acc = 0; const h = 1 / 240; for (let tt = h / 2; tt < ORB.start; tt += h) acc += C('orbit', tt) * h; return acc; })();
  const anxAtClose = C('anx', close);
  const items = homes.map(() => ({ gain: [], pan: [], fc: [] }));
  const tension = { gain: [], freq: [] }, muffle = [];
  for (let i = 0; i < n; i++) {
    const t = sw.t0 + i * sw.dt;
    const orbit = C('orbit', t), anx = C('anx', t);
    const sp = clamp(orbit / orbitMax, 0, 1);
    const calm = smoothstep(close, close + 0.8, t);
    // level: builds with speed × anxiety; from close on it follows the speed alone (anx held)
    const drive = t < close ? Math.pow(sp, 1.15) * (0.4 + 0.6 * anx) : Math.pow(sp, 0.85) * (0.4 + 0.6 * anxAtClose);
    const A = 0.075 * drive * (1 - 0.15 * calm);
    const om = smoothstep(ORB.start, ORB.full, t);
    const fBase = 450 * Math.pow(1750 / 450, Math.pow(sp, 0.8)) * (1 - 0.15 * calm);
    homes.forEach(([hx, hy, mini], k) => {
      const base = Math.atan2((hy - ORB.cy) / ORB.ry, hx / ORB.rx);
      const a = base + (ang[i] - angAtStart) * (mini ? 1.35 : 1);
      const front = (1 + Math.sin(a)) / 2;                 // 1 = passing in front of Noomi
      const it = items[k];
      it.gain.push(r4(A * om * (0.1 + 0.9 * Math.pow(front, 4)) * (mini ? 0.5 : 1)));   // a whoosh per pass (big thoughts lead)
      // full-width rotation: each whoosh sweeps across the stereo field as its thought passes in front
      it.pan.push(r4(clamp(1.5 * Math.cos(a) * om + (hx / 420) * (1 - om), -1, 1)));
      it.fc.push(Math.round(clamp(fBase * (mini ? 1.12 : 1) * (1 + 0.15 * Math.sin(a)), 200, 2000)));
    });
    // an undertone only (≈ -4 dB under the whooshes); after close it relaxes over the inhale instead of snapping off
    const tAnx = t < close ? anx : Math.max(anx, anxAtClose * Math.exp(-(t - close) / 0.6));
    tension.gain.push(r4(0.007 * Math.pow(tAnx, 1.6)));
    tension.freq.push(r4(N.G3 * st(1.0 * tAnx)));
    muffle.push(Math.round(lerp(2400, 1200, smoothstep(close, close + 0.8, t))));
  }
  const swirl = { ...sw, n, items: items.map((it, k) => ({ ...it, q: homes[k][2] ? 2.0 : 1.6, offset: r4(rr(0, 2.5)) })), tension, muffle, layout: LAY.source };

  // ---- warm transformation pad: C major add9, slow swell from the exhale, gently gone by ~14.5 s.
  //      Voiced light (thin root, the colour in the 4th/5th octave) and high-passed in the renderer,
  //      so the calm is warm without a muddy low end and still reads on a phone.
  const pad = {
    t0: exhale.t, dt: 0.02, hp: 170,
    notes: [[N.C3, 0.3], [N.G3, 0.45], [N.D4, 0.45], [N.E4, 0.55], [N.G4, 0.4], [N.C5, 0.35], [N.E5, 0.2]],
    peak: 0.0175, env: [], lp: [],
  };
  for (let t = pad.t0; t <= DUR + 1e-9; t += pad.dt) {
    const up = smoothstep(pad.t0, pad.t0 + 1.9, t);
    const down = t < chimeT - 1.4 ? 1 : lerp(1, 0.3, smoothstep(chimeT - 1.4, chimeT + 0.3, t)) * (1 - smoothstep(DUR - 1.3, DUR - 0.4, t));
    pad.env.push(r4(up * down * (0.85 + 0.15 * C('warm', t))));
    pad.lp.push(Math.round(800 + 900 * C('warm', t)));
  }

  // ---- ambience: the engine's moonmilk-cove bed, mood following the curves every 0.1 s
  const mood = [];
  for (let t = -PRE; t <= DUR + 1e-9; t += 0.1) {
    const tc = clamp(t, 0, DUR);
    mood.push({ t: r4(t), m: { agitation: r4(C('agitation', tc)), heaviness: r4(C('heaviness', tc)), clarity: r4(C('clarity', tc)), warmth: r4(C('warmth', tc)) } });
  }
  const firstBubble = first('bubble')?.t ?? startle + 1.4;
  const bed = {
    realm: 'moonmilk-cove', fadeIn: 0.8, mood,
    // sparse music-box events of the bed only in the quiet stretches (before the ping, after the eyes open)
    tickWindows: [[-0.9, ping - 0.75], [open + 0.25, chimeT - 0.8]],
    // bed level: present but low; dips a little under the swirl peak, rises in the warm ending
    level: [[-PRE, 1.0], [startle + 0.2, 1.0], [firstBubble - 0.06, 0.88], [ORB.start + 0.4, 0.85], [close - 0.1, 0.7],
      [exhale.t - 0.4, 0.85], [open + 0.2, 0.9], [DUR - 1.0, 0.9]],
  };

  return {
    SR, PRE, DUR, LAT, engineUrl: ENGINE_URL,
    engine: engine.sort((a, b) => a.t - b.t), synth: synth.sort((a, b) => a.t - b.t),
    ticks, crickets, swirl, pad, bed,
    // fade-in starts at -12 dB (frame 0 is already the night, not silence) and opens fully by 0.3 s
    fade: { inEnd: 0.3, inFloor: 0.25, outStart: DUR - 0.6 },
  };
}

// ------------------------------------------------- offline determinism --
// Installed in the page with page.addInitScript() before any page code runs.

function offlineDeterminism() {
  // 1. never let a Voice dispose itself on 'ended' (that runs on the main thread at a
  //    non-deterministic moment); offline there is nothing to leak.
  Object.defineProperty(AudioScheduledSourceNode.prototype, 'onended', { configurable: true, get() { return null; }, set() {} });

  // 2. Chromium sums the connections of a node input in hash-set order (i.e. by memory address),
  //    so with 3+ simultaneous inputs the float additions happen in a different order on every
  //    launch (±1e-6 jitter). Two inputs are exact (a+b == b+a), so every input is kept at ≤ 2
  //    connections: extra ones are folded into a chain of 2-input summing gains, whose order is
  //    fixed by creation order. Pure graph plumbing, inaudible, engine untouched.
  //    connect()/disconnect() keep their Web Audio meaning: connecting twice is a no-op, and
  //    src.disconnect(dest) also works after src was folded into a summing gain in front of dest.
  const connect = AudioNode.prototype.connect, disconnect = AudioNode.prototype.disconnect;
  const ins = new WeakMap();     // destination node → its (≤ 2) direct sources
  const outs = new WeakMap();    // source node → destination nodes it feeds directly
  const standsFor = new WeakMap(); // summing gain → the destination it was created in front of
  const list = (m, k, make) => m.get(k) || m.set(k, make()).get(k);
  const link = (s, d) => { connect.call(s, d); list(ins, d, () => []).push(s); list(outs, s, () => new Set()).add(d); };
  const forget = (s, d) => { const l = ins.get(d); const i = l ? l.indexOf(s) : -1; if (i >= 0) l.splice(i, 1); outs.get(s)?.delete(d); };
  // the node through which `s` feeds `d`: d itself, or the summing gain standing in for d (or null)
  const via = (s, d) => { for (const x of outs.get(s) || []) if (x === d || standsFor.get(x) === d) return x; return null; };
  AudioNode.prototype.connect = function (dest, output, input) {
    if (!(dest instanceof AudioNode) || output || input) return connect.apply(this, arguments);
    if (via(this, dest)) return dest;              // already connected (directly or folded)
    const l = ins.get(dest) || [];
    if (l.length >= 2) {                           // fold the two current inputs into a summer
      const [p, q] = l, sum = this.context.createGain();
      standsFor.set(sum, dest);
      link(p, sum); link(q, sum); link(sum, dest);
      disconnect.call(p, dest); forget(p, dest);
      disconnect.call(q, dest); forget(q, dest);
    }
    link(this, dest);
    return dest;
  };
  AudioNode.prototype.disconnect = function (dest, ...rest) {
    if (dest === undefined) { for (const d of outs.get(this) || []) forget(this, d); return disconnect.call(this); }
    if (dest instanceof AudioNode && rest.length === 0) {
      // if the connection was folded, cut it at the summing gain; if it never existed, the
      // native call throws InvalidAccessError, exactly as without this patch
      const d = via(this, dest) || dest;
      disconnect.call(this, d); forget(this, d);
      return undefined;
    }
    return disconnect.call(this, dest, ...rest);
  };
}

// ------------------------------------------------------ in-page renderer --
// Runs inside headless Chromium. Self-contained: it may only use `plan`.

async function renderInPage(plan) {
  const { SR, PRE, DUR, LAT } = plan;
  const LEN = Math.round((PRE + DUR) * SR);

  // (offlineDeterminism() has already been installed in this page as an init script)

  // 1. the engine, read-only: fetched as text, one export appended, imported from a Blob URL
  const src = await (await fetch(plan.engineUrl)).text();
  const patched = `${src}\nexport const __hm = { buildGraph, buildMallow, buildFx, startBed, tickBed, setG: (g) => { G = g; }, AMB_LEVEL };\n`;
  const E = (await import(URL.createObjectURL(new Blob([patched], { type: 'text/javascript' })))).__hm;

  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: LEN, sampleRate: SR });
  const g = E.buildGraph(ctx, false);
  g.master.gain.value = 0.6;                 // engine default volume
  g.ambBus.gain.value = E.AMB_LEVEL;         // 0.36, as the app
  // the bed's brown-noise "waves" carry most of their energy below 90 Hz, which phones cannot play
  // and which only eats headroom: high-pass the ambience bus on its way into the master
  const ambHp = ctx.createBiquadFilter(); ambHp.type = 'highpass'; ambHp.frequency.value = 90; ambHp.Q.value = 0.6;
  g.ambBus.disconnect(); g.ambBus.connect(ambHp); ambHp.connect(g.master);
  // engine voices read g.ctx.currentTime; give them a controllable clock
  let now = 0;
  g.ctx = new Proxy(ctx, {
    get(t, p) { if (p === 'currentTime') return now; const v = Reflect.get(t, p, t); return typeof v === 'function' ? v.bind(t) : v; },
  });
  E.setG(g);

  // final fade sits after the engine's dynamics (so the compressor never "sees" it)
  g.out.disconnect();
  const fade = ctx.createGain();
  g.out.connect(fade); fade.connect(ctx.destination);
  {
    // fade-in: a 4 ms ramp from 0 (no step at the very first sample) to inFloor, then a sine rise to 1
    const n = 256, fin = new Float32Array(n), fout = new Float32Array(n), floor = plan.fade.inFloor || 0;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      fin[i] = (floor + (1 - floor) * Math.sin(u * Math.PI / 2)) * Math.min(1, (u * plan.fade.inEnd) / 0.004);
      fout[i] = Math.cos(u * Math.PI / 2) ** 2;
    }
    fade.gain.setValueAtTime(0, 0);
    fade.gain.setValueCurveAtTime(fin, PRE, plan.fade.inEnd);
    fade.gain.setValueCurveAtTime(fout, PRE + plan.fade.outStart, DUR - plan.fade.outStart);
  }

  // scene time → context time for anything that goes through the master chain
  const T = (t) => PRE + t - LAT;

  // studio bus: into the engine master (same EQ / dynamics / reverb as the engine's own voices)
  const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(g.master);
  const wet = ctx.createGain(); wet.gain.value = 1; wet.connect(g.reverbIn);

  const gainNode = (v = 0) => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const biquad = (type, f, q = 0.707) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const f32 = (a) => Float32Array.from(a);
  // an output strip: gain → panner → bus (+ reverb send)
  function strip(pan = 0, send = 0) {
    const inp = gainNode(1);
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    inp.connect(p); p.connect(bus);
    if (send > 0) { const s = gainNode(send); p.connect(s); s.connect(wet); }
    return inp;
  }
  // click-free percussive envelope: 0 → peak (linear a) → hold h → -60 dB (exponential d) → 0
  function envAD(p, t, a, h, d, peak) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (h > 0) p.setValueAtTime(peak, t + a + h);
    p.exponentialRampToValueAtTime(peak * 0.001, t + a + h + d);
    p.linearRampToValueAtTime(0, t + a + h + d + 0.01);
    return t + a + h + d + 0.012;
  }
  function noiseSrc(t, stop, offset = 0, color = 'white') {
    const s = ctx.createBufferSource(); s.buffer = g.noise[color]; s.loop = true;
    s.start(t, offset % (s.buffer.duration - 0.1)); s.stop(stop);
    return s;
  }
  const PARTIALS = {
    celesta: [[1, 1, 1], [2, 0.3, 0.55], [4, 0.08, 0.3]],   // [ratio, level, decay factor], as the engine's
  };

  // ---------------- instruments ----------------
  const INST = {
    // pitched blip with optional glide, low-pass and decaying vibrato (pops, clicks, boings)
    blip(e) {
      const t = T(e.t);
      const o = ctx.createOscillator(); o.type = e.type || 'sine';
      o.frequency.setValueAtTime(e.f, t);
      if (e.f1) o.frequency.exponentialRampToValueAtTime(e.f1, t + (e.glide || 0.05));
      const amp = gainNode(0);
      const end = envAD(amp.gain, t, e.a || 0.002, e.h || 0, e.d || 0.08, e.peak);
      if (e.vib) {
        const l = ctx.createOscillator(); l.frequency.value = e.vib.rate;
        const dg = gainNode(0);
        dg.gain.setValueAtTime(e.vib.cents, t);
        dg.gain.linearRampToValueAtTime(0, t + (e.vib.decay || 0.3));
        l.connect(dg); dg.connect(o.detune); l.start(t); l.stop(end);
      }
      let node = o;
      if (e.lp) { const f = biquad('lowpass', e.lp, 0.6); node.connect(f); node = f; }
      node.connect(amp); amp.connect(strip(e.pan, e.send));
      o.start(t); o.stop(end);
    },
    // additive bell (celesta / glass): sines with their own exponential decays
    bell(e) {
      const t = T(e.t);
      const out = strip(e.pan, e.send);
      const lp = biquad('lowpass', e.lp || 5000, 0.5); lp.connect(out);
      for (const [ratio, amp, dec] of PARTIALS[e.partials || 'celesta']) {
        const f = e.f * ratio; if (f > 7500) continue;
        const o = ctx.createOscillator(); o.frequency.value = f;
        const g1 = gainNode(0); const end = envAD(g1.gain, t, 0.003, 0, e.decay * dec, e.peak * amp);
        o.connect(g1); g1.connect(lp); o.start(t); o.stop(end);
      }
    },
    // a tiny sparkle: sine ping that drifts slightly upward (particles rising like stars)
    ping(e) {
      const t = T(e.t);
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(e.f, t); o.frequency.linearRampToValueAtTime(e.f * e.rise, t + e.decay);
      const a = gainNode(0); const end = envAD(a.gain, t, 0.002, 0, e.decay, e.peak);
      o.connect(a); a.connect(strip(e.pan, e.send)); o.start(t); o.stop(end);
    },
    // filtered noise burst with a cutoff sweep (squish textures)
    noiseHit(e) {
      const t = T(e.t);
      const amp = gainNode(0); const end = envAD(amp.gain, t, e.a || 0.003, 0, e.d || 0.08, e.peak);
      const s = noiseSrc(t, end, (e.t * 7.31) % 2.5, e.color || 'white');
      const f = biquad(e.filter || 'lowpass', e.f, e.q || 0.8);
      f.frequency.setValueAtTime(e.f, t);
      if (e.f1) f.frequency.exponentialRampToValueAtTime(e.f1, t + (e.sweep || 0.08));
      s.connect(f); f.connect(amp); amp.connect(strip(e.pan, e.send));
    },
    // breath air: band-passed noise, raised-cosine swell up over `a`, down over `r`; optional stereo width
    air(e) {
      const t = T(e.t);
      const n = 128, curve = new Float32Array(n);
      const total = e.a + e.r;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * total;
        curve[i] = x < e.a ? (1 - Math.cos(Math.PI * x / e.a)) / 2 : (1 + Math.cos(Math.PI * (x - e.a) / e.r)) / 2;
        curve[i] *= e.peak;
      }
      const sides = e.width ? [-e.width, e.width] : [0];
      sides.forEach((pan, k) => {
        const s = noiseSrc(t, t + total + 0.05, 0.37 + k * 1.13 + (e.t % 1));
        const bp = biquad('bandpass', e.f0, e.q || 0.8);
        bp.frequency.setValueAtTime(e.f0, t); bp.frequency.exponentialRampToValueAtTime(e.f1, t + total);
        const lp = biquad('lowpass', 3000, 0.5);
        const a = gainNode(0); a.gain.setValueCurveAtTime(curve.map((v) => v / Math.sqrt(sides.length)), t, total);
        s.connect(bp); bp.connect(lp); lp.connect(a); a.connect(strip(pan, e.send));
      });
    },
  };

  // wooden clock tick-tock: a noise click through a resonant band-pass + a short sine "body"
  function tick(k) {
    const t = T(k.t);
    const out = strip(0.12, 0.25);
    const lp = biquad('lowpass', 3200, 0.5); lp.connect(out);
    const s = noiseSrc(t, t + 0.08, (k.t * 3.7 + 10) % 2.5);
    const bp = biquad('bandpass', k.hi ? 1650 : 1250, 7);
    const a = gainNode(0); envAD(a.gain, t, 0.0008, 0.002, 0.03, k.peak * 2.2);
    s.connect(bp); bp.connect(a); a.connect(lp);
    const o = ctx.createOscillator(); o.frequency.value = k.hi ? 820 : 610;
    const b = gainNode(0); const end = envAD(b.gain, t, 0.001, 0, 0.028, k.peak * 0.45);
    o.connect(b); b.connect(lp); o.start(t); o.stop(end);
  }

  // distant crickets: sine carrier gated into chirps
  function cricket(c) {
    const o = ctx.createOscillator(); o.frequency.value = c.f;
    const a = gainNode(0);
    a.gain.setValueAtTime(0, 0);
    for (const p of c.ev) {
      const t = T(p.t);
      if (t < 0.01) continue;
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(p.amp, t + 0.004);
      a.gain.linearRampToValueAtTime(p.amp * 0.7, t + p.dur - 0.004);
      a.gain.linearRampToValueAtTime(0, t + p.dur);
    }
    o.connect(a); a.connect(strip(c.pan, 0.5));
    o.start(0); o.stop(LEN / SR);
  }

  // orbit swirl: one band-passed noise whoosh per thought + an uneasy beating tension tone
  function swirl(S) {
    const t0 = T(S.t0), dur = (S.n - 1) * S.dt;
    const sbus = gainNode(1);
    const muffle = biquad('lowpass', S.muffle[0], 0.5);
    muffle.frequency.setValueCurveAtTime(f32(S.muffle), t0, dur);
    sbus.connect(muffle); muffle.connect(bus);
    const send = gainNode(0.25); muffle.connect(send); send.connect(wet);
    for (const it of S.items) {
      const s = noiseSrc(t0, t0 + dur + 0.05, it.offset);
      const bp = biquad('bandpass', it.fc[0], it.q); bp.frequency.setValueCurveAtTime(f32(it.fc), t0, dur);
      const a = gainNode(0); a.gain.setValueCurveAtTime(f32(it.gain), t0, dur);
      const p = ctx.createStereoPanner(); p.pan.setValueCurveAtTime(f32(it.pan), t0, dur);
      s.connect(bp); bp.connect(a); a.connect(p); p.connect(sbus);
    }
    // tension: two sines beating slowly + a soft octave, pitch creeping up with anxiety
    const tg = gainNode(0); tg.gain.setValueCurveAtTime(f32(S.tension.gain), t0, dur);
    const tl = biquad('lowpass', 900, 0.5); tl.connect(tg); tg.connect(sbus);
    for (const [mult, det, type, lvl] of [[1, 0, 'sine', 0.6], [1, 9, 'sine', 0.5], [2, 4, 'triangle', 0.55]]) {
      const o = ctx.createOscillator(); o.type = type; o.detune.value = det;
      o.frequency.setValueCurveAtTime(f32(S.tension.freq.map((f) => f * mult)), t0, dur);
      const lg = gainNode(lvl); o.connect(lg); lg.connect(tl); o.start(t0); o.stop(t0 + dur + 0.05);
    }
  }

  // warm transformation pad: sines + triangles, slightly detuned, slow shared vibrato
  function pad(P) {
    const t0 = T(P.t0), dur = (P.env.length - 1) * P.dt, end = t0 + dur + 0.05;
    const amp = gainNode(0); amp.gain.setValueCurveAtTime(f32(P.env.map((v) => v * P.peak)), t0, dur);
    const lp = biquad('lowpass', P.lp[0], 0.6); lp.frequency.setValueCurveAtTime(f32(P.lp), t0, dur);
    const hp = biquad('highpass', P.hp || 20, 0.707);   // 12 dB/oct: no low-end build-up under the calm
    lp.connect(hp); hp.connect(amp);
    const L = strip(-0.3, 0.35), R = strip(0.3, 0.35);
    amp.connect(L); amp.connect(R);
    const vib = ctx.createOscillator(); vib.frequency.value = 0.23;
    const vd = gainNode(4); vib.connect(vd); vib.start(t0); vib.stop(end);
    const norm = 1 / Math.sqrt(P.notes.length * 2);
    for (const [f, lvl] of P.notes) {
      for (const [type, det, k] of [['sine', -4, 1], ['triangle', 5, 0.45]]) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
        vd.connect(o.detune);
        const og = gainNode(lvl * k * norm); o.connect(og); og.connect(lp);
        o.start(t0); o.stop(end);
      }
    }
  }

  // ---------------- schedule everything that uses explicit times ----------------
  for (const e of plan.synth) INST[e.inst](e);
  for (const k of plan.ticks) tick(k);
  for (const c of plan.crickets) cricket(c);
  if (plan.swirl) swirl(plan.swirl);
  if (plan.pad) pad(plan.pad);

  // ambience bed (engine): started inside the pre-roll, mood automated from the curves
  const B = plan.bed;
  now = 0;
  const bed = E.startBed(B.realm, B.mood[0].m, B.fadeIn);
  if (B.mute) bed.out.disconnect();
  for (const { t, m } of B.mood) if (T(t) > 0.02) bed.bed.apply(m, T(t), 0.12);
  for (const [a, b] of B.tickWindows) {
    g.voices.clear();
    const mm = B.mood.reduce((best, x) => (Math.abs(x.t - (a + b) / 2) < Math.abs(best.t - (a + b) / 2) ? x : best)).m;
    E.tickBed(bed, T(a), T(b), mm);
  }
  g.voices.clear();
  {
    const p = bed.out.gain; // after startBed's own fade-in
    let last = B.fadeIn + LAT;
    for (const [t, v] of B.level) { const tt = Math.max(T(t), last + 0.01); p.linearRampToValueAtTime(v, tt); last = tt; }
  }

  // engine one-shots: suspend the render at each cue so the engine's "now" is real
  const Q = 128 / SR;
  const groups = new Map();
  for (const c of plan.engine) {
    const nowAt = T(c.t) - 0.012;                     // Voice.t = currentTime + 12 ms = T(c.t)
    const ts = Math.floor(nowAt / Q) * Q;
    const key = Math.round(ts / Q);
    if (!groups.has(key)) groups.set(key, { ts, list: [] });
    groups.get(key).list.push({ ...c, nowAt });
  }
  const placed = [];
  for (const { ts, list } of [...groups.values()].sort((a, b) => a.ts - b.ts)) {
    ctx.suspend(ts).then(() => {
      for (const c of list) {
        now = c.nowAt;
        g.voices.clear();
        if (c.kind === 'mallow') E.buildMallow('noomi', c.name, c.opts); else E.buildFx(c.name, c.opts);
        for (const v of g.voices) {
          v.out.gain.value = c.trim;
          if (c.cut) { v.out.gain.setValueAtTime(c.trim, T(c.cut.at)); v.out.gain.linearRampToValueAtTime(0, T(c.cut.at + c.cut.fade)); }
          placed.push({ t: c.t, name: `${c.kind}:${c.name}`, voiceT: +(v.t - PRE).toFixed(4) });
        }
        g.voices.clear();                              // no voice stealing offline
      }
      ctx.resume();
    });
  }

  const buf = await ctx.startRendering();
  const off = Math.round(PRE * SR), n = Math.round(DUR * SR);
  const l = buf.getChannelData(0), r = buf.getChannelData(1);
  const il = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { il[2 * i] = l[off + i]; il[2 * i + 1] = r[off + i]; }
  const u8 = new Uint8Array(il.buffer); let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(bin), placed };
}

// ------------------------------------------------------------ mastering --

function ffmpeg(args, opts = {}) {
  const p = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  if (p.status !== 0) throw new Error(`ffmpeg failed (${p.status}): ${p.stderr.slice(-2000)}`);
  return p.stderr;
}

// EBU R128 via ffmpeg's ebur128 (integrated loudness, LRA, true peak)
function measure(f32File) {
  const err = ffmpeg(['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', f32File, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']);
  const s = err.slice(err.lastIndexOf('Summary:'));
  const num = (re) => { const m = s.match(re); return m ? parseFloat(m[1]) : NaN; };
  return { I: num(/I:\s+(-?[\d.]+|-inf) LUFS/), LRA: num(/LRA:\s+(-?[\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

// 4× oversampled peak estimate per frame (max over both channels and the 3 inter-sample points)
function interSamplePeaks(x) {
  const n = x.length / 2, TAPS = 16; // ±16 samples windowed sinc
  const H = [1, 2, 3].map((p) => {
    const h = []; let sum = 0;
    for (let k = -TAPS + 1; k <= TAPS; k++) {
      const u = k - p / 4;
      const w = 0.5 + 0.5 * Math.cos(Math.PI * u / TAPS);
      const v = (u === 0 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u)) * w;
      h.push(v); sum += v;
    }
    return h.map((v) => v / sum);
  });
  const pk = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = Math.max(Math.abs(x[2 * i]), Math.abs(x[2 * i + 1]));
    if (m > 0.25) { // only bother with the expensive part near the top
      for (let c = 0; c < 2; c++) {
        for (const h of H) {
          let acc = 0;
          for (let k = -TAPS + 1, j = 0; k <= TAPS; k++, j++) { const ii = i + k; if (ii >= 0 && ii < n) acc += h[j] * x[2 * ii + c]; }
          m = Math.max(m, Math.abs(acc));
        }
      }
    }
    pk[i] = m;
  }
  return pk;
}

// look-ahead peak limiter (offline: zero latency). gain ≤ ceiling/peak everywhere, smooth attack,
// exponential release. Returns a new buffer.
function limit(x, gainDb, ceilingDb, { lookahead = 0.003, release = 0.09 } = {}) {
  const n = x.length / 2, g0 = 10 ** (gainDb / 20), ceil = 10 ** (ceilingDb / 20);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * g0;
  const pk = interSamplePeaks(y);
  const L = Math.round(lookahead * SR);
  const g1 = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    if (pk[i] > ceil) { const r = ceil / pk[i]; for (let j = Math.max(0, i - L); j <= i; j++) if (g1[j] > r) g1[j] = r; }
  }
  const g2 = new Float32Array(n); let acc = 0; // moving average over L+1 (attack ramp)
  for (let i = 0; i < n; i++) { acc += g1[i]; if (i > L) acc -= g1[i - L - 1]; g2[i] = acc / Math.min(i + 1, L + 1); }
  // g2[k] ≤ ceil/peak[k] holds by construction (every value averaged into it is ≤ that)
  const rel = 1 - Math.exp(-1 / (release * SR));
  let gPrev = 1, reduced = 0;
  for (let i = 0; i < n; i++) {
    let gi = g2[i];
    gi = gi < gPrev ? gi : gPrev + (gi - gPrev) * rel;
    gPrev = gi;
    if (gi < 0.999) reduced++;
    y[2 * i] *= gi; y[2 * i + 1] *= gi;
  }
  return { y, reducedMs: (reduced / SR) * 1000 };
}

// --------------------------------------------------------------- main --

async function main() {
  const args = process.argv.slice(2);
  const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
  const rawPath = flag('--raw');                 // debug: also dump the un-normalised mix (f32le, 48 kHz stereo)
  const mute = (flag('--mute') || '').split(',').filter(Boolean); // debug: engine,synth,ticks,crickets,swirl,pad,bed
  const [cuesPath, outPath] = args;
  if (!cuesPath || !outPath) { console.error('usage: node audio/soundtrack.mjs <cues.json> <out.wav> [--raw mix.f32] [--mute group,…]'); process.exit(2); }
  const log = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
  if (!Array.isArray(log.cues) || !Array.isArray(log.curves)) throw new Error('cues.json needs { cues, curves }');
  const plan = buildPlan(log);
  for (const m of mute) { if (m === 'bed') plan.bed.mute = true; else if (m === 'swirl' || m === 'pad') plan[m] = null; else plan[m] = []; }
  const t0 = Date.now();
  console.log(`[soundtrack] ${log.video}: ${plan.engine.length} engine voices, ${plan.synth.length} synth events, ${plan.ticks.length} ticks; thought layout from ${plan.swirl?.layout ?? 'n/a'}`);

  const server = await startServer(0);
  const browser = await chromium.launch();
  let res;
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('[page]', e.message));
    // seed Math.random BEFORE any page code (the engine's noise, reverb and micro-detune use it)
    await page.addInitScript((seed) => {
      let s = seed >>> 0;
      Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }, SEED);
    await page.addInitScript(offlineDeterminism);
    // a blank same-origin page (the server root serves the repo; the engine is fetched from it)
    await page.route('**/__soundtrack__.html', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>soundtrack</title>' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/__soundtrack__.html`);
    res = await page.evaluate(renderInPage, plan);
  } finally {
    await browser.close();
    server.close();
  }
  const raw = Buffer.from(res.b64, 'base64');
  const x = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const frames = x.length / 2;
  if (frames !== Math.round(plan.DUR * SR)) throw new Error(`rendered ${frames} frames, expected ${Math.round(plan.DUR * SR)}`);
  for (let i = 0; i < x.length; i += 97) if (!Number.isFinite(x[i])) throw new Error('non-finite sample in render');
  // every engine voice must have started exactly at (cue - LAT): the suspend/clock trick worked
  const drift = Math.max(0, ...res.placed.map((p) => Math.abs(p.voiceT - (p.t - LAT))));
  if (res.placed.length !== plan.engine.length || drift > 1e-4) throw new Error(`engine voices misplaced (${res.placed.length}/${plan.engine.length}, drift ${drift})`);
  console.log(`[soundtrack] rendered ${(frames / SR).toFixed(3)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (rawPath) fs.writeFileSync(rawPath, Buffer.from(x.buffer));

  // loudness: measure → gain + true-peak limiter → re-measure, until on target
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-soundtrack-'));
  const tmpF32 = path.join(tmp, 'mix.f32');
  try {
    fs.writeFileSync(tmpF32, Buffer.from(x.buffer));
    const m0 = measure(tmpF32);
    console.log(`[soundtrack] raw mix: ${m0.I} LUFS, ${m0.TP} dBTP, LRA ${m0.LRA} LU`);
    let gain = TARGET_LUFS - m0.I, m = null;
    for (let iter = 0; iter < 6; iter++) {
      const lim = limit(x, gain, CEILING_DBTP);
      fs.writeFileSync(tmpF32, Buffer.from(lim.y.buffer));
      m = measure(tmpF32);
      console.log(`[soundtrack]   gain ${gain.toFixed(2)} dB → ${m.I} LUFS, ${m.TP} dBTP (limiter active ${lim.reducedMs.toFixed(0)} ms)`);
      if (Math.abs(m.I - TARGET_LUFS) <= 0.1 && m.TP <= MAX_TP) break;
      gain += TARGET_LUFS - m.I;
    }
    if (Math.abs(m.I - TARGET_LUFS) > 0.5) console.warn(`[soundtrack] warning: loudness ${m.I} LUFS is off target`);
    if (m.TP > MAX_TP) throw new Error(`true peak ${m.TP} dBTP above ${MAX_TP}`);
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    ffmpeg(['-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', tmpF32, '-map_metadata', '-1', '-c:a', 'pcm_s24le', '-fflags', '+bitexact', '-flags:a', '+bitexact', outPath]);
    console.log(`[soundtrack] wrote ${outPath}: ${m.I} LUFS integrated, ${m.TP} dBTP, LRA ${m.LRA} LU (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export { buildPlan, renderInPage, offlineDeterminism, thoughtLayout };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('[soundtrack]', e); process.exit(1); });
}
