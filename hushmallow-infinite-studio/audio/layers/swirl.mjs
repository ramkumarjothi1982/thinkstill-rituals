// Layer MO-ORBIT: the orbit swirl. One band-passed noise whoosh per orbiting
// thought, swelling as it passes in front of the Mallow (the bf curve), panned
// by its position (bx), brighter and louder with the orbit speed (spin), and
// muffled and dying away at the turn's squeeze. MO-HUM's tension tone shares
// its timeline and muffle (hum.mjs). Automation every 10 ms from the dry-run
// curves (R12); noise offsets draw from the score's shared stream.
//
//   v2 (compat)    the timeline starts at a hard-coded 2.9 s, exactly 3 whooshes,
//                  pans = curve pan (x / 420) x 1.2
//   fix R10        the timeline starts 0.1 s before the first thought arrives (2.9 s
//                  in T01) and there is one whoosh per orbit item in the curves
//   fix R11        pans come from world x through the one score pan constant
//                  (composer/audio.js PAN.cueNorm, the cue pans' 400 px)
//   fix "swirl at spin_up"  the whooshes start at the metaphor's spin_up cue,
//                  ramping in over 0.5 s (v2 let them sound from 2.9 s)

import { clamp, lerp, r4, smoothstep } from './util.mjs';

/** How many orbit items the curves carry (bx0, bx1, …). */
export function orbitItems(curves) {
  let n = 0;
  while (curves.length && Object.hasOwn(curves[0], `bx${n}`)) n++;
  return n;
}

/**
 * L: layer context; t0: timeline start; count: whooshes; panAt(i, t);
 * whooshRamp(t) | null; whoosh: MO-ORBIT on; tension: hum() result | null.
 * → the plan's swirl block (or null when neither whooshes nor hum sound).
 */
export function swirl(L, { t0, count, panAt, whooshRamp = null, whoosh = true, tension = null }) {
  const { A, C, curves, rr } = L;
  if (!whoosh && !tension) return null;
  const inhale = A.inhale(), squeeze = A.squeeze();
  const sw = { t0, t1: inhale.t + 1.2, dt: 0.01 };
  const n = Math.round((sw.t1 - sw.t0) / sw.dt) + 1;
  if (!(n > 1)) throw new Error(`score: the swirl timeline ${sw.t0}..${sw.t1} s is empty`);
  const spinMax = Math.max(0.5, ...curves.map((c) => c.spin || 0));
  const items = (whoosh ? Array.from({ length: count }, (_, i) => i) : []).map(() => ({ gain: [], pan: [], fc: [] }));
  const ten = tension ? { gain: [], freq: [] } : null, muffle = [];
  for (let k = 0; k < n; k++) {
    const t = sw.t0 + k * sw.dt;
    const sp = clamp(C('spin', t) / spinMax, 0, 1), cold = C('cold', t);
    const stop = 1 - smoothstep(squeeze - 0.02, squeeze + 0.35, t);
    const A0 = 0.07 * (0.15 + 0.85 * Math.pow(sp, 1.1)) * (0.5 + 0.5 * cold) * stop;
    const ramp = whooshRamp ? whooshRamp(t) : 1;
    items.forEach((it, i) => {
      const front = C(`bf${i}`, t), alpha = C(`ba${i}`, t);
      it.gain.push(r4(whooshRamp ? A0 * alpha * (0.15 + 0.85 * Math.pow(front, 3)) * ramp : A0 * alpha * (0.15 + 0.85 * Math.pow(front, 3))));
      it.pan.push(panAt(i, t));
      it.fc.push(Math.round(clamp(500 * Math.pow(1700 / 500, Math.pow(sp, 0.8)) * (1 + 0.15 * (front - 0.5)), 200, 2000)));
    });
    if (ten) { ten.gain.push(tension.gainAt(t, cold)); ten.freq.push(tension.freqAt(t, cold)); }
    muffle.push(Math.round(lerp(2400, 900, smoothstep(squeeze - 0.1, squeeze + 0.3, t))));
  }
  return { ...sw, n, items: items.map((it) => ({ ...it, q: 1.6, offset: r4(rr(0, 2.5)) })), tension: ten, muffle, layout: 'cues.json' };
}
