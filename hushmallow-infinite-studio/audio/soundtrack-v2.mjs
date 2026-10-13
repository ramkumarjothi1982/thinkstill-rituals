// Original soundtrack for "My Brain at 2 AM" v2 (stage v2 cue log).
//
//   node audio/soundtrack-v2.mjs <cues.json> <out.wav>
//
// Same instruments, engine and mastering as audio/soundtrack.mjs (100 %
// procedural: the project-owned Hushmallow sound engine + the studio's own
// synthesis, rendered offline in headless Chromium, -16 LUFS, ≤ -1.5 dBTP);
// only the cue → sound plan is new. Every sound is tied to a physical event
// on screen so it reads as foley, not as a soundtrack laid on top:
//
//   sleep        moonmilk-cove night bed, distant crickets, a slow sleeping breath
//   flinch/take  a muffled "mm?", then the eye-pop, a rubbery boing and Noomi's surprise
//   jump/land    a little water "plip" on take-off; a heavy, wet jelly landing:
//                flump + squelch + water bloop + a wobbling tail; the ripple answers
//   aftermath    "bip … bip" double blink, swishes on the glances, a clock that won't stop
//   thoughts     each glass thought pops in with a bubble + glass ting (rising steps);
//                whooshes follow their orbit (panned by position), the clock speeds up,
//                a low tension tone creeps up
//   squeeze      the swirl muffles and stops dead — near-silence
//   breath       one long inhale (air rising), a glassy shimmer at the crest, a long exhale;
//                the body's squash-and-release; a deep water bloom for the calm ring
//   dissolve     glass chimes + a cloud of tiny rising sparkles as the thoughts become light
//   warm         a light C-major add9 pad blooms with the moonlight
//   ending       eyes open: a warm content glide + celesta; logo: the soothing closing chime;
//                the crickets return and the sleeping breath resumes — it loops into frame 0
//
// The night bed, crickets and sleeping breath run continuously across the loop
// seam (a 1 s pre-roll renders the "previous" night), and the end fade only dips
// to 70 %, so the 15 s loop restarts without a hole.

import { main, N, mulberry32 } from './soundtrack.mjs';

const SR = 48000, PRE = 1.0, LAT = 0.012, SEED = 20261013;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smoothstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const st = (s) => Math.pow(2, s / 12);
const r4 = (x) => Math.round(x * 1e4) / 1e4;

function curveSampler(curves, fps) {
  return (key, t) => {
    const u = clamp(t * fps, 0, curves.length - 1);
    const i = Math.floor(u), f = u - i;
    const a = curves[i][key] ?? 0, b = curves[Math.min(i + 1, curves.length - 1)][key] ?? 0;
    return a + (b - a) * f;
  };
}

export function buildPlanV2(log) {
  const { duration: DUR, fps, cues, curves } = log;
  const C = curveSampler(curves, fps);
  const rnd = mulberry32(SEED ^ 0x2a2a);
  const rr = (a, b) => a + rnd() * (b - a);
  const engine = [], synth = [];
  const E = (t, kind, name, opts = {}, trim = 1, cut = null) => engine.push({ t, kind, name, opts, trim, cut });
  const S = (t, inst, p) => synth.push({ t, inst, ...p });
  const of = (type) => cues.filter((c) => c.type === type).sort((a, b) => a.t - b.t);
  const at = (type, d) => of(type)[0]?.t ?? d;

  const take = at('take', 0.4), land = at('land', 0.98), squeeze = at('squeeze', 6.98);
  const inhale = of('inhale')[0] || { t: 7.42, dur: 1.48 };
  const exhale = of('exhale')[0] || { t: 9.2, dur: 1.9 };
  const crest = at('crest', 8.9), open = at('eyes_open', 11.7), logo = at('logo', 12.6), sleep = at('drift', 13.5);
  const loop = log.cues.find((c) => c.type === 'scene')?.loop || DUR;

  for (const c of cues) {
    const t = c.t;
    switch (c.type) {
      case 'flinch':   // a dream flinch: a tiny muffled "mm?"
        S(t, 'blip', { type: 'triangle', f: 420, f1: 360, glide: 0.08, a: 0.01, d: 0.1, peak: 0.022, lp: 1400, send: 0.15 });
        break;
      case 'take':     // the comedic beat: eye-pop on the frame, a rubbery boing, Noomi's surprise, air rushing up
        S(t, 'blip', { f: 340, f1: 1500, glide: 0.045, a: 0.0015, h: 0.012, d: 0.055, peak: 0.064, lp: 4200, send: 0.12 });
        S(t, 'blip', { type: 'triangle', f: 170, f1: 750, glide: 0.045, a: 0.0015, h: 0.012, d: 0.06, peak: 0.032, lp: 1800 });
        S(t + 0.02, 'blip', { type: 'triangle', f: 300, f1: 720, glide: 0.12, a: 0.006, d: 0.42, peak: 0.034, lp: 2000, send: 0.15,
          vib: { rate: 13, cents: 80, decay: 0.42 } });
        E(t, 'mallow', 'surprise', { intensity: 0.9, pitch: st(4) }, 0.25);
        S(t + 0.01, 'air', { a: 0.08, r: 0.22, f0: 700, f1: 2200, q: 0.8, peak: 0.03, width: 0.3, send: 0.1 });
        break;
      case 'lift_off': // leaving the water: a small, bright plip
        S(t, 'blip', { f: 820, f1: 1500, glide: 0.03, a: 0.002, d: 0.05, peak: 0.03, lp: 3400, send: 0.25 });
        S(t, 'noiseHit', { filter: 'highpass', f: 2600, a: 0.002, d: 0.09, peak: 0.016, send: 0.2 });
        break;
      case 'land': {   // heavy wet jelly landing
        const a = c.amp ?? 1;
        S(t, 'blip', { f: 190, f1: 92, glide: 0.11, a: 0.003, d: 0.22, peak: 0.055 * a, lp: 900 });                       // flump (headphones)
        S(t, 'noiseHit', { filter: 'bandpass', f: 1900, f1: 520, sweep: 0.12, a: 0.003, d: 0.18, peak: 0.1 * a, q: 1.6 });  // wet squelch
        S(t + 0.008, 'blip', { f: 240, f1: 760, glide: 0.07, a: 0.003, d: 0.12, peak: 0.062 * a, lp: 2600, send: 0.2 });   // water bloop (rising chirp)
        S(t + 0.01, 'noiseHit', { filter: 'highpass', f: 2400, f1: 5200, sweep: 0.2, a: 0.004, d: 0.28, peak: 0.02 * a, send: 0.3 }); // splash hiss
        S(t + 0.05, 'blip', { type: 'triangle', f: 310, f1: 260, glide: 0.4, a: 0.01, d: 0.6, peak: 0.028 * a, lp: 1500, send: 0.18,
          vib: { rate: 6.2, cents: 90, decay: 0.6 } });                                                                         // jelly wobble
        E(t + 0.02, 'mallow', 'press', { intensity: 0.5 }, 0.18);
        break;
      }
      case 'ripple':
        S(t, 'blip', { f: 420, f1: 980, glide: 0.06, a: 0.003, d: 0.1, peak: 0.03 * (c.amp ?? 0.4) / 0.4, lp: 3000, send: 0.35 });
        break;
      case 'blink':
        if (c.soft) S(t, 'bell', { f: N.G6, peak: 0.022, decay: 0.55, partials: 'celesta', send: 0.4, lp: 5200 });
        else {
          const f = of('blink').filter((b) => !b.soft).indexOf(c) === 0 ? 1320 : 1500;
          S(t, 'blip', { f, f1: f * 0.84, glide: 0.022, a: 0.0015, d: 0.04, peak: 0.06, lp: 3600, send: 0.1 });
          S(t, 'blip', { f: f / 2, a: 0.0015, d: 0.025, peak: 0.028, lp: 2000 });
        }
        break;
      case 'glance':
        E(t, 'fx', 'swish', { intensity: 0.15, pan: c.pan ?? 0, pitch: 0.8 }, 0.7);
        break;
      case 'thought': { // a glass thought pops in: bubble + glass ting, a step higher each time
        const i = clamp(c.i ?? 0, 0, 2);
        E(t, 'fx', 'bubble', { intensity: 1, note: [0, 2, 4][i], pan: c.pan }, [0.8, 0.72, 0.6][i]);
        S(t + 0.004, 'noiseHit', { filter: 'lowpass', f: 1900, f1: 380, sweep: 0.06, a: 0.003, d: 0.07, peak: 0.032, q: 1.2, pan: c.pan });
        S(t + 0.018, 'bell', { f: [N.A6, N.C7, N.E7][i], peak: 0.016, decay: 0.6, partials: 'celesta', pan: c.pan, send: 0.4, lp: 6500 });
        break;
      }
      case 'squeeze':
        E(t, 'mallow', 'squeeze', { intensity: 0.5, pitch: 2 }, 0.14, { at: t + 0.3, fade: 0.06 });
        break;
      case 'inhale': {
        const dur = clamp(c.dur || 1.5, 1, 3);
        E(t, 'fx', 'breathe-in', { duration: dur, intensity: 0.7 }, 0.3, { at: t + dur - 0.05, fade: 0.2 });
        S(t, 'air', { a: dur - 0.1, r: 0.3, f0: 600, f1: 1250, q: 1.1, peak: 0.03, width: 0.3, send: 0.25 });
        break;
      }
      case 'crest':   // the stillness at the top of the breath: one high glassy shimmer
        S(t, 'bell', { f: N.E7, peak: 0.009, decay: 1.1, partials: 'celesta', send: 0.6, lp: 7000 });
        S(t + 0.07, 'bell', { f: N.A6, peak: 0.007, decay: 1.2, partials: 'celesta', send: 0.6, lp: 7000 });
        break;
      case 'exhale': {
        const dur = clamp((c.dur || 1.9), 1, 3);
        E(t, 'fx', 'breathe-out', { duration: dur, intensity: 0.7 }, 0.22);
        E(t + 0.06, 'mallow', 'sigh', { intensity: 0.35 }, 0.2);
        S(t, 'air', { a: 0.14, r: dur, f0: 1100, f1: 380, q: 0.9, peak: 0.034, width: 0.65, send: 0.35 });
        break;
      }
      case 'release': // the luxurious squash-and-release + the calm ring blooming over the water
        S(t, 'noiseHit', { filter: 'bandpass', f: 2000, f1: 650, sweep: 0.12, a: 0.004, d: 0.18, peak: 0.085, q: 1.8 });
        S(t, 'blip', { f: 880, f1: 440, glide: 0.1, a: 0.003, d: 0.16, peak: 0.06, lp: 2400 });
        S(t + 0.16, 'blip', { type: 'triangle', f: 420, f1: 840, glide: 0.08, a: 0.004, d: 0.5, peak: 0.026, lp: 2600, send: 0.22,
          vib: { rate: 6.5, cents: 85, decay: 0.55 } });
        E(t + 0.16, 'mallow', 'release', { intensity: 0.6, pitch: 2 }, 0.22);
        S(t + 0.02, 'blip', { f: 150, f1: 300, glide: 0.25, a: 0.02, d: 0.7, peak: 0.03, lp: 700, send: 0.5 });          // deep water bloom (headphones)
        S(t + 0.04, 'blip', { f: 330, f1: 660, glide: 0.2, a: 0.01, d: 0.5, peak: 0.022, lp: 1800, send: 0.55 });
        break;
      case 'dissolve':
        E(t, 'fx', 'chime', { intensity: 0.35, pitch: [st(3), 1, st(-5)][clamp(c.i ?? 0, 0, 2)], pan: (c.pan || 0) * 0.8 }, 0.13);
        break;
      case 'eyes_open':
        E(t, 'mallow', 'comfort', { intensity: 0.3, pitch: 2 }, 0.24);
        S(t, 'bell', { f: N.G5, peak: 0.022, decay: 0.7, partials: 'celesta', send: 0.4, lp: 5000 });
        S(t + 0.11, 'bell', { f: N.C6, peak: 0.017, decay: 0.8, partials: 'celesta', send: 0.45, lp: 5000 });
        break;
      case 'logo':
        E(t, 'mallow', 'success', { intensity: 0.5 }, 0.28);
        break;
      case 'drift':
        E(t, 'mallow', 'sigh', { intensity: 0.28 }, 0.6);
        break;
      default: break;
    }
  }

  // dissolve sparkles: tiny rising pings, sparse, panned around, fading over ~2 s
  const d0 = Math.min(...of('dissolve').map((c) => c.t), exhale.t + 0.2);
  const notes = [N.C6, N.D6, N.E6, N.G6, N.A6, N.C7, N.D7, N.E7];
  for (let t = d0; t < d0 + 2.0;) {
    const age = t - d0, level = Math.exp(-age / 0.8);
    S(t, 'ping', { f: notes[Math.floor(rnd() * notes.length)], rise: 1.012 + 0.01 * rnd(), peak: 0.009 * (0.5 + 0.5 * rnd()) * (0.25 + 0.75 * level),
      decay: rr(0.14, 0.3), pan: rr(-0.85, 0.85), send: 0.45 });
    t += lerp(0.05, 0.13, age / 2) * rr(0.6, 1.4);
  }

  // sleeping breath across the loop seam: inhale swells at k·period (the body's breath phase)
  const period = loop / 4;
  for (let k = -1; k * period < DUR + period; k++) {
    const tc = k * period;                      // inhale centre (inflate rising through zero)
    const env = (t) => (1 - smoothstep(0.18, 0.34, t)) + smoothstep(13.3, 14.4, t);   // as the body
    for (const [t0, a, r, f0, f1, pk] of [[tc - 0.95, 0.95, 0.5, 520, 880, 0.011], [tc + 0.95, 0.4, 1.4, 760, 420, 0.009]]) {
      const mid = t0 + a;
      const w = env(clamp(mid, 0, DUR));
      if (w < 0.05 || t0 < -PRE + 0.05 || t0 > DUR) continue;
      S(t0, 'air', { a, r, f0, f1, q: 0.8, peak: pk * w, send: 0.25 });
    }
  }

  // clock tick-tock (2 AM): quiet 1/s from the start, unsettled after the take, faster with the spiral,
  // stopping dead at the squeeze — then only breath
  const ticks = [];
  const busy = cues.filter((c) => ['take', 'land', 'blink', 'glance', 'thought', 'lift_off'].includes(c.type)).map((c) => c.t);
  const clear = (t) => { for (const ct of busy) if (t > ct - 0.08 && t < ct + 0.08) return ct + 0.08; return null; };
  {
    let t = -0.85;
    while (t < take - 0.12) { ticks.push({ t: r4(t), hi: ticks.length % 2 === 0, peak: 0.034 }); t += 1; }
    t = land + 0.9;
    while (t < squeeze - 0.05) {
      let m = clear(t); while (m !== null) { t = m; m = clear(t); }
      if (t >= squeeze - 0.05) break;
      const cold = C('cold', t), spin = C('spin', t);
      ticks.push({ t: r4(t), hi: ticks.length % 2 === 0, peak: 0.034 * (1 + 0.6 * cold) });
      t += 1 / clamp(1 + 1.2 * cold + 0.6 * spin, 1, 3.2);
    }
  }

  // distant crickets: the sleeping night (stop dead at the take — comedic), back in the calm ending (seamless loop)
  const crickets = [];
  for (const [f, pan, per, pulses] of [[4150, -0.55, 0.64, 3], [3880, 0.6, 0.83, 4]]) {
    const ev = [];
    const chirps = (from, to, amp, fadeIn = 0) => {
      for (let t = from + rnd() * per; t < to; t += per * rr(0.85, 1.15)) {
        const k = fadeIn ? smoothstep(from, from + fadeIn, t) : 1;
        for (let p = 0; p < pulses; p++) { const tp = t + p * 0.031; if (tp + 0.018 < to) ev.push({ t: r4(tp), dur: 0.018, amp: amp * k * (p === 0 ? 0.75 : 1) }); }
      }
    };
    chirps(-PRE, take, 0.0065);
    chirps(open + 0.5, DUR + 0.2, 0.0065, 1.5);
    crickets.push({ f, pan, ev });
  }

  // the orbit swirl: one whoosh per thought, swelling as it passes in front, panned by its position;
  // brighter / louder with the orbit speed; muffles and dies away at the squeeze
  const sw = { t0: 2.9, t1: inhale.t + 1.2, dt: 0.01 };
  const n = Math.round((sw.t1 - sw.t0) / sw.dt) + 1;
  const spinMax = Math.max(0.5, ...curves.map((c) => c.spin || 0));
  const items = [0, 1, 2].map(() => ({ gain: [], pan: [], fc: [] }));
  const tension = { gain: [], freq: [] }, muffle = [];
  for (let k = 0; k < n; k++) {
    const t = sw.t0 + k * sw.dt;
    const sp = clamp(C('spin', t) / spinMax, 0, 1), cold = C('cold', t);
    const stop = 1 - smoothstep(squeeze - 0.02, squeeze + 0.35, t);
    const A = 0.07 * (0.15 + 0.85 * Math.pow(sp, 1.1)) * (0.5 + 0.5 * cold) * stop;
    items.forEach((it, i) => {
      const front = C(`bf${i}`, t), alpha = C(`ba${i}`, t);
      it.gain.push(r4(A * alpha * (0.15 + 0.85 * Math.pow(front, 3))));
      it.pan.push(r4(clamp(C(`bx${i}`, t) * 1.2, -1, 1)));
      it.fc.push(Math.round(clamp(500 * Math.pow(1700 / 500, Math.pow(sp, 0.8)) * (1 + 0.15 * (front - 0.5)), 200, 2000)));
    });
    tension.gain.push(r4(0.0045 * Math.pow(cold, 1.6) * (1 - smoothstep(squeeze, squeeze + 0.5, t))));
    tension.freq.push(r4(N.G3 * st(1.0 * cold)));
    muffle.push(Math.round(lerp(2400, 900, smoothstep(squeeze - 0.1, squeeze + 0.3, t))));
  }
  const swirl = { ...sw, n, items: items.map((it) => ({ ...it, q: 1.6, offset: r4(rr(0, 2.5)) })), tension, muffle, layout: 'cues.json' };

  // the warm transformation pad (C major add9), light and high-passed; gone before the loop seam
  const pad = { t0: inhale.t, dt: 0.02, hp: 170, notes: [[N.C3, 0.3], [N.G3, 0.45], [N.D4, 0.45], [N.E4, 0.55], [N.G4, 0.4], [N.C5, 0.35], [N.E5, 0.2]], peak: 0.0132, env: [], lp: [] };
  for (let t = pad.t0; t <= DUR + 1e-9; t += pad.dt) {
    const pre = 0.18 * smoothstep(inhale.t, crest, t);                  // a hint of it under the inhale
    const up = smoothstep(exhale.t, exhale.t + 1.9, t);
    const down = 1 - smoothstep(logo + 0.6, DUR - 0.35, t);
    pad.env.push(r4(Math.max(pre, up) * down * (0.85 + 0.15 * C('warm', t))));
    pad.lp.push(Math.round(800 + 900 * C('warm', t)));
  }

  // ambience bed (engine moonmilk-cove), mood from the curves
  const mood = [];
  for (let t = -PRE; t <= DUR + 1e-9; t += 0.1) {
    const tc = t < 0 ? t + DUR : t;        // the pre-roll is the end of the loop
    const cold = C('cold', clamp(tc, 0, DUR)), warm = C('warm', clamp(tc, 0, DUR));
    mood.push({ t: r4(t), m: { agitation: r4(clamp(C('agitation', clamp(tc, 0, DUR)) + 0.3 * cold, 0, 1)), heaviness: r4(0.6 * cold), clarity: r4(0.3 + 0.6 * warm), warmth: r4(0.25 + 0.7 * warm) } });
  }
  const bed = {
    realm: 'moonmilk-cove', fadeIn: 0.8, mood,
    tickWindows: [[-0.9, take - 0.3], [open + 0.3, logo - 0.4]],
    level: [[-PRE, 0.85], [take + 0.2, 0.9], [3.0, 0.85], [squeeze - 0.1, 0.62], [exhale.t, 0.8], [open + 0.2, 0.7], [DUR, 0.85]],
  };

  return {
    SR, PRE, DUR, LAT, engineUrl: '/hushmallow/src/engine/audio.js',
    engine: engine.sort((a, b) => a.t - b.t), synth: synth.sort((a, b) => a.t - b.t),
    ticks, crickets, swirl, pad, bed,
    // frame 0 is already the night (pre-roll); the end only dips a little so the loop has no hole
    fade: { inEnd: 0.02, inFloor: 0.85, outStart: DUR - 0.08, outFloor: 0.7 },
  };
}

main(buildPlanV2).catch((e) => { console.error('[soundtrack-v2]', e); process.exit(1); });
