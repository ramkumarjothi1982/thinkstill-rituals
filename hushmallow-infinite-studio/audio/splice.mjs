// The loop's splice (WP-04 R3; R7 on the gate's seam step).
//
// The circular render makes the score continuous across the loop: nothing ends or
// starts at the seam. The project's gate then reads the seam as the raw step
// |x[0] − x[N−1]| and wants it below −60 dBFS (G-AUDIO seamStep). On a continuous
// loop that step is the waveform's own slope at the splice: one sample's change
// of the bed, the sleeping breath and the reverb tails sounding there. Measured on
// T01's default score the slope near the seam has an RMS step of −48 dBFS (the bed
// alone −50.7, the cue sounds and breath −51.5, everything else below −65), so any
// one splice point reads under −60 with a chance of about one in seven (14 % of the
// points within ±1 ms of the default's seam; 5 % under −66): the round-2 render read
// −41.7. Keeping layers "off" the seam cannot reach −60 without a hole: it would
// take ≥ 12 dB less of the bed and the breath at the seam, an audible dip the
// circular render exists to remove.
//
// What a loop editor does instead is splice where the waveform is flat. The
// picture's loop point is fixed, so the score shifts its whole circular mix by
// k samples (|k| ≤ SPLICE.maxShift: 1 ms, far inside any A/V sync tolerance —
// the gate's own is 20 ms for a loud hit) to the nearby point where both channels'
// slopes are smallest, and verifies that point as delivered: through the
// loop-aware AAC encode exactly as audio/loop-aac.mjs muxes it (the codec adds its
// own error at the seam, ±5 dB), the raw step must be at most SEAM_STEP_TARGET
// (−63 dBFS: the gate's limit with a 3 dB margin) and the discontinuity estimate
// below −60. The shift must not move the film off its cues either: the gate's
// global A/V offset (its onset-strength correlation with the cue log, in 5 ms
// steps) is read on the delivered audio too and must stay within ±20 ms — a shift
// of a fraction of a millisecond can tip that coarse detector where its lag-0 match
// barely leads (Boppo's leads by 0.7 of 8.5 unshifted). Candidates are tried
// flattest first; the first that passes all three is the splice.
// Deterministic: the same mix always gives the same splice.

import fs from 'node:fs';
import { rawStepAt, globalOffset, LIMITS } from './check.mjs';
import { encodeLoopDelivery, SEAM_STEP_TARGET } from './loop-aac.mjs';
import { mkWorkTemp } from '../render/lib/paths.mjs';

export const SR = 48000;
export const SPLICE = Object.freeze({ maxShift: 48, tries: 12, alignments: 2 });
const db = (v) => 20 * Math.log10(Math.max(v, 1e-12));

/** The loop shifted by k samples: out[i] = y[i + k] (circular, interleaved stereo). */
export function rotate(y, k) {
  const n = y.length / 2, out = new Float32Array(y.length);
  for (let i = 0; i < n; i++) { const j = (((i + k) % n) + n) % n; out[2 * i] = y[2 * j]; out[2 * i + 1] = y[2 * j + 1]; }
  return out;
}

/** The signal as a 24-bit WAV will hold it (the delivered encode reads score.wav). */
export function quantize24(y) {
  const q = new Float32Array(y.length), s = 8388608;
  for (let i = 0; i < y.length; i++) q[i] = Math.max(-s, Math.min(s - 1, Math.round(y[i] * s))) / s;
  return q;
}

/** Splice candidates within ±maxShift samples, flattest first: [{ k, stepDbfs }] (the raw wrap step if spliced there). */
export function spliceCandidates(y, maxShift = SPLICE.maxShift) {
  const out = [];
  for (let k = -maxShift; k <= maxShift; k++) out.push({ k, stepDbfs: +db(rawStepAt(y, k)).toFixed(2) });
  return out.sort((a, b) => a.stepDbfs - b.stepDbfs || Math.abs(a.k) - Math.abs(b.k) || a.k - b.k);
}

/**
 * Splice a mastered circular mix (interleaved Float32Array of `duration` s; `cues`: the
 * cue log, for the offset check).
 * → { y (the spliced loop, 24-bit exact), k, ms, wavStepDbfs, delivered: { stepDbfs, clickDbfs, offsetMs, offsetMargin, pad, tries }, pass, tried: [...] }
 */
export function spliceLoop(y, duration, { cues, log = () => {}, maxShift = SPLICE.maxShift, tries = SPLICE.tries } = {}) {
  const q = quantize24(y);
  const onCue = (z) => { const o = globalOffset(z, cues); return { ...o, pass: Math.abs(o.lagMs) <= LIMITS.offsetMs }; };
  // the flattest candidates (already flat enough in the WAV) whose shift keeps the film on its cues
  // (both checked on the WAV first: cheap); if none is flat enough, the flattest few are still tried
  const all = spliceCandidates(q, maxShift).filter((c) => onCue(rotate(q, c.k)).pass);
  const flat = all.filter((c) => c.stepDbfs <= SEAM_STEP_TARGET);
  const cands = (flat.length ? flat : all).slice(0, tries);
  const tmp = mkWorkTemp('hm-splice-');
  const tried = [];
  let best = null;
  try {
    for (const c of cands) {
      const z = rotate(q, c.k);
      const d = encodeLoopDelivery(z, duration, tmp, { tries: SPLICE.alignments });     // (muxLoop walks the same alignments in the same order)
      const o = onCue(d.y);
      const pass = d.pass && o.pass;
      const r = { k: c.k, wavStepDbfs: c.stepDbfs, delivered: { stepDbfs: d.stepDbfs, clickDbfs: d.clickDbfs, offsetMs: o.lagMs, offsetMargin: +o.margin.toFixed(3), preRollFrames: d.frames, pad: d.pad, tries: d.tries }, pass };
      tried.push(r);
      if (!best || (pass && !best.pass) || (pass === best.pass && d.stepDbfs < best.delivered.stepDbfs)) best = { ...r, y: z };
      if (pass) break;
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (!best) throw new Error(`splice: no shift within ±${maxShift} samples keeps the global A/V offset within ±${LIMITS.offsetMs} ms`);
  const ms = +((best.k / SR) * 1000).toFixed(3);
  log(`splice: ${best.k} samples (${ms} ms): wrap step ${best.wavStepDbfs} dBFS in the WAV, ${best.delivered.stepDbfs} delivered (target ≤ ${SEAM_STEP_TARGET}), click ${best.delivered.clickDbfs}, A/V offset ${best.delivered.offsetMs} ms (margin ${best.delivered.offsetMargin}); ${tried.length} candidate(s) tried${best.pass ? '' : ' — NONE PASSES'}`);
  return { ...best, ms, tried };
}
