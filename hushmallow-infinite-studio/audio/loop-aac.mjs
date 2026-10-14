// Loop-aware AAC for circular scores (WP-04; R7 on the delivered file).
//
// An AAC encoder sees the start of its input as a step up from silence and the
// end as a step down into it: the first and last frames are reconstructed with
// pre-echo and zero padding. So a score that loops perfectly as a WAV still
// clicks where the MP4 loops. Measured on the default T01 score: the seam's
// discontinuity estimate (audio/check.mjs) is −108.7 dBFS in score.wav and
// −32.8 dBFS after the mux render/mux.mjs does today (−i score.wav −c:a aac −t D).
//
// The fix keeps the encoder inside the loop: it encodes the loop with its own
// audio on both sides (its last PAD seconds before frame 0, its first PAD
// seconds after D), then muxes that stream shifted by −PAD with negative
// timestamps kept. The MP4 edit list then skips the pre-roll (media_time =
// PAD·SR + the encoder's priming) and presents exactly D seconds. The decoder's
// first and last samples come from frames whose overlap holds the loop's own
// continuation, so nothing is new at the seam. The video stream is copied as
// before; A/V sync is unchanged (the decoded audio lines up with score.wav at
// lag 0, which muxLoop checks).
//
// What remains is the codec's own error: the loop's two ends are coded at
// different phases of AAC's 1024-sample frame grid (15 s = 703.125 frames), so
// the decoded error steps where the file loops. Measured over T01 voiced by the
// 7 Mallows (docs/wp/WP-04.md): −51 to −77 dBFS at 192 kb/s, −62 to −81 at
// 256 kb/s, against −22 to −49 for the plain mux; the step tracks the codec
// error's own discontinuity there within 1–2 dB. So a loop is delivered at
// 256 kb/s, and the mux verifies its own output: it tries frame alignments (the
// pre-roll lengthened by 128 samples at a time) until the decoded seam passes both
// seam checks as the QA gate reads them from the MP4: the raw wrap step
// |x[0] − x[N−1]| at most SEAM_STEP_TARGET (the gate's −60 dBFS with a 3 dB margin)
// and the discontinuity estimate below −60 dBFS, keeping the best if none does.
// The score chooses its loop's splice so that one does (audio/splice.mjs).
// Deterministic: the same score always picks the same alignment.
//
// A non-circular score (the frozen v2 route) keeps the plain mux at 192 kb/s:
// it is not a loop, and its approved master was built that way.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkWorkTemp } from '../render/lib/paths.mjs';
import { clickAt, rawStepAt, LIMITS } from './check.mjs';

export const SR = 48000;
export const PAD = 1.0;                 // seconds of the loop's own audio on each side of it
export const BITRATE = '192k';          // the plain mux, as render/mux.mjs (and the approved master)
export const LOOP_BITRATE = '256k';     // a loop: the codec's seam residual below −60 dBFS on all 7 kits (see above)
export const ALIGN_TRIES = 8;           // frame alignments tried: pre-roll PAD + k × 128 samples, k < 8 (one frame)
export const SEAM_STEP_TARGET = LIMITS.seamStep - 3;   // dBFS: the delivered raw wrap step, with a 3 dB margin under the gate's limit
const aacArgs = (bitrate = BITRATE) => ['-c:a', 'aac', '-b:a', bitrate, '-ar', String(SR), '-ac', '2'];

function ffmpeg(args, opts = {}) {
  const p = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-loglevel', 'error', ...args], { maxBuffer: 1 << 30, ...opts });
  if (p.status !== 0) throw new Error(`ffmpeg failed (${p.status}): ${String(p.stderr).slice(-1500)}`);
  return p.stdout;
}

/** Any audio file (or a file's first audio stream) → interleaved stereo Float32Array at 48 kHz; `duration` cuts as the QA gate does. */
export function decodeAudio(file, duration = null) {
  const out = ffmpeg(['-i', file, '-map', '0:a:0', ...(duration ? ['-t', duration.toFixed(6)] : []), '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-']);
  return new Float32Array(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
}

/** The loop with its own audio around it: [last PAD s | the loop | first PAD s] (interleaved stereo). */
export function loopExtended(x, pad = PAD) {
  const n = x.length / 2, p = Math.round(pad * SR);
  if (p > n) throw new Error(`loop-aac: pad ${pad} s is longer than the loop`);
  const y = new Float32Array(2 * (n + 2 * p));
  y.set(x.subarray(2 * (n - p)), 0);
  y.set(x, 2 * p);
  y.set(x.subarray(0, 2 * p), 2 * (n + p));
  return y;
}

/** Encode a loop (interleaved Float32Array) to an AAC .m4a with PAD seconds of its own audio on each side. */
export function encodeLoopAac(x, m4aPath, { pad = PAD, bitrate = LOOP_BITRATE } = {}) {
  const tmp = mkWorkTemp('hm-loopaac-');
  try {
    const f32 = path.join(tmp, 'ext.f32');
    const ext = loopExtended(x, pad);
    fs.writeFileSync(f32, Buffer.from(ext.buffer, ext.byteOffset, ext.byteLength));
    // (no +bitexact flags: they change what ffmpeg's AAC encoder does at the edges, and the loop's
    // delivered click went from −76.5 to −56.8 dBFS with them; the encoder is deterministic without)
    ffmpeg(['-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', f32, ...aacArgs(bitrate), '-map_metadata', '-1', m4aPath]);
    return m4aPath;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * ffmpeg arguments that mux a loop-encoded .m4a (encodeLoopAac) under a picture:
 * the audio is shifted by −pad and its negative timestamps kept, so the edit list
 * presents exactly [0, duration). `video` null → an audio-only MP4.
 */
export function muxLoopArgs({ video = null, m4a, out, duration, pad = PAD, metadata = [] }) {
  const inputs = video ? ['-i', video] : [];
  const maps = video ? ['-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy'] : ['-map', '0:a:0'];
  return ['-y', ...inputs, '-itsoffset', String(-pad), '-i', m4a, ...maps, '-c:a', 'copy', '-avoid_negative_ts', 'disabled',
    '-t', String(duration), ...metadata, '-movflags', '+faststart', out];
}

/** Lag (samples) that best aligns b with a over a 0.2 s window in the middle (±maxLag). */
export function lagSamples(a, b, maxLag = 256) {
  const n = Math.min(a.length, b.length) / 2, from = Math.floor(n / 2), len = Math.round(0.2 * SR);
  let best = 0, bestV = -Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = from; i < from + len; i++) s += a[2 * i] * b[2 * (i + lag)];
    if (s > bestV) { bestV = s; best = lag; }
  }
  return best;
}

/**
 * The loop's AAC as it will be delivered: encoded with its own audio around it, at the
 * first frame alignment whose decoded seam passes (raw wrap step ≤ SEAM_STEP_TARGET and
 * click below −60 dBFS), else the one that misses by least, of ALIGN_TRIES.
 * → { m4a, pad, clickDbfs, stepDbfs, pass, tries, y (the decoded D seconds) }; the .m4a
 * is written to `dir`.
 */
export function encodeLoopDelivery(x, duration, dir, { bitrate = LOOP_BITRATE, tries = ALIGN_TRIES } = {}) {
  let best = null;
  for (let k = 0; k < tries; k++) {
    const pad = PAD + (k * 128) / SR, m4a = path.join(dir, `loop-${k}.m4a`), mp4 = path.join(dir, `loop-${k}.mp4`);
    encodeLoopAac(x, m4a, { pad, bitrate });
    ffmpeg(muxLoopArgs({ m4a, out: mp4, duration, pad }));
    const y = decodeAudio(mp4, duration);
    const click = 20 * Math.log10(clickAt(y, 0)), step = 20 * Math.log10(rawStepAt(y, 0));
    const miss = Math.max(0, step - SEAM_STEP_TARGET, click - LIMITS.seamClick);
    if (!best || miss < best.miss) best = { m4a, pad, clickDbfs: +click.toFixed(1), stepDbfs: +step.toFixed(1), miss, pass: miss === 0, tries: k + 1, y };
    if (miss === 0) break;
  }
  return best;
}

/**
 * Mux a circular score under a picture with loop-aware AAC (the fix above) and check
 * the result: the audio lasts exactly `duration` and lines up with the WAV at lag 0.
 * → { out, lag, frames, pad, clickDbfs, stepDbfs, seamPass, tries }
 */
export function muxLoop({ video, wav, out, duration, bitrate = LOOP_BITRATE, metadata = [] }) {
  const x = decodeAudio(wav);
  if (Math.abs(x.length / 2 - duration * SR) > 0.5) throw new Error(`loop-aac: ${wav} has ${x.length / 2} frames, the loop is ${duration} s`);
  const tmp = mkWorkTemp('hm-loopmux-');
  let enc;
  try {
    enc = encodeLoopDelivery(x, duration, tmp, { bitrate });
    ffmpeg(muxLoopArgs({ video, m4a: enc.m4a, out, duration, pad: enc.pad, metadata }));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const y = decodeAudio(out, duration);
  if (y.length !== x.length) throw new Error(`loop-aac: the muxed audio decodes to ${y.length / 2} frames, expected ${x.length / 2}`);
  const lag = lagSamples(x, y);
  if (lag !== 0) throw new Error(`loop-aac: the muxed audio is ${lag} samples off the score (expected 0)`);
  return { out, lag, frames: y.length / 2, pad: enc.pad, clickDbfs: enc.clickDbfs, stepDbfs: enc.stepDbfs, seamPass: enc.pass, tries: enc.tries };
}

/**
 * What a listener gets from the delivered MP4: the loop through AAC and back, either
 * loop-aware (encodeLoopDelivery, exactly as muxLoop delivers it) or as the plain mux
 * encodes it (−i wav −c:a aac −b:a 192k −t D).
 * → interleaved Float32Array of `duration` s, decoded as the QA gate decodes it.
 */
export function deliveredRoundTrip(x, duration, { loopAware = true, bitrate = null } = {}) {
  const tmp = mkWorkTemp('hm-aacrt-');
  try {
    if (loopAware) return encodeLoopDelivery(x, duration, tmp, { bitrate: bitrate || LOOP_BITRATE }).y;
    const f32 = path.join(tmp, 'x.f32'), mp4 = path.join(tmp, 'a.mp4');
    fs.writeFileSync(f32, Buffer.from(x.buffer, x.byteOffset, x.byteLength));
    ffmpeg(['-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', f32, ...aacArgs(bitrate || BITRATE), '-t', String(duration), '-movflags', '+faststart', mp4]);
    return decodeAudio(mp4, duration);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
