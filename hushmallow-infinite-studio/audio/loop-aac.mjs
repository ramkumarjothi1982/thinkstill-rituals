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
// audio on both sides (its last whole AAC frames before frame 0, its first PAD
// seconds after D), so the decoder's first and last samples come from frames
// whose overlap holds the loop's own continuation and nothing is new at the seam.
//
// No pre-roll behind an edit list (lead decision 2026-10-14, OWNER-DECISIONS: a
// player or transcoder that ignores MP4 edit lists played WP-04's loop 1.02 s
// late). The pre-roll is a whole number of AAC frames (PRE_FRAMES × 1024 samples),
// and those frames are physically dropped from the bitstream (ADTS, frame by
// frame) before the mux: the first frame kept decodes the last pre-roll frame,
// incomplete, and is exactly the standard 1024-sample encoder priming every AAC
// MP4 skips (the approved master's edit list: media time 1024). The delivered
// file therefore has the plain mux's edit list and nothing more: its audio starts
// at t = 0 in every player that honours the priming, and lies 1024 samples
// (21.3 ms) late in one that does not, exactly like the approved master. The
// presentation is set to exactly D (the edit's segment duration and the track and
// movie durations, written in place), so a looping player never plays the
// encoder's last partial frame. The video stream is copied as before; A/V sync is
// unchanged (the decoded audio lines up with score.wav at lag 0, which muxLoop
// checks, together with the edit list).
//
// What remains is the codec's own error: the loop's two ends are coded at
// different phases of AAC's 1024-sample frame grid (15 s = 703.125 frames), so
// the decoded error steps where the file loops. Measured over T01 voiced by the
// 7 Mallows (docs/wp/WP-04.md): −51 to −77 dBFS at 192 kb/s, −62 to −81 at
// 256 kb/s, against −22 to −49 for the plain mux. So a loop is delivered at
// 256 kb/s, and the mux verifies its own output: it tries pre-roll lengths
// (PRE_FRAMES + k frames: each warms the encoder up differently) until the decoded
// seam passes both seam checks as the QA gate reads them from the MP4: the raw
// wrap step |x[0] − x[N−1]| at most SEAM_STEP_TARGET (the gate's −60 dBFS with a
// 3 dB margin) and the discontinuity estimate below −60 dBFS, keeping the best if
// none does. The score chooses its loop's splice so that one does
// (audio/splice.mjs). Deterministic: the same score always picks the same encode.
//
// A non-circular score (the frozen v2 route) keeps the plain mux at 192 kb/s:
// it is not a loop, and its approved master was built that way.
//
// Two ways to deliver the codec's priming (FU-5; `edit`, OWNER-DECISIONS "audio
// pre-roll"), measured on T01's hm-score loop (docs/wp/FU-5.md):
//   'priming'  (default) the above: the standard 1024-sample priming edit and no
//              other, presenting exactly D. Players that honour edit lists (every
//              browser, phone player and ffmpeg) hear the loop seamlessly (wrap step
//              −86 dBFS); one that ignores them hears it 21.3 ms late.
//   'trim'     no edit list at all: one more frame is dropped, so the first frame kept
//              decodes the loop's own first 1024 samples, and the last packet lasts only
//              what is left of D (stts), so the audio presents exactly D and starts at
//              t = 0 even with -ignore_editlist. But AAC cannot reconstruct a stream's
//              first frame (its overlap partner is gone): those 21.3 ms come back at
//              about 2 dB SNR and every loop clicks (wrap step −26 dBFS), in every player.
// The picture never carries an offset (negative composition offsets instead of the
// B-frame delay edit), so a player that ignores edit lists shows frame 0 at t = 0.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkWorkTemp } from '../render/lib/paths.mjs';
import { clickAt, rawStepAt, LIMITS } from './check.mjs';

export const SR = 48000;
export const FRAME = 1024;              // samples per AAC frame
export const PRIMING = 1024;            // the encoder's delay: the one edit an AAC MP4 carries (the approved master's media time)
export const PRE_FRAMES = 47;           // the loop's own audio before frame 0: 47 frames (1.003 s), dropped before the mux
export const PAD = 1.0;                 // seconds of the loop's own audio after D (cut by the mux)
export const BITRATE = '192k';          // the plain mux, as render/mux.mjs (and the approved master)
export const LOOP_BITRATE = '256k';     // a loop: the codec's seam residual below −60 dBFS on all 7 kits (see above)
export const ALIGN_TRIES = 8;           // encodes tried: pre-roll PRE_FRAMES + k frames, k < 8
export const SEAM_STEP_TARGET = LIMITS.seamStep - 3;   // dBFS: the delivered raw wrap step, with a 3 dB margin under the gate's limit
export const AUDIO_EDITS = Object.freeze(['priming', 'trim']);   // how the codec's priming is delivered (see above)
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

/** The loop with its own audio around it: [last `pad` s | the loop | first `post` s] (interleaved stereo; pad may be given in samples as { samples }). */
export function loopExtended(x, pad = PAD, post = pad) {
  const n = x.length / 2, p = typeof pad === 'object' ? pad.samples : Math.round(pad * SR), q = Math.round(post * SR);
  if (p > n || q > n) throw new Error(`loop-aac: pad ${p} / ${q} samples is longer than the loop`);
  const y = new Float32Array(2 * (n + p + q));
  y.set(x.subarray(2 * (n - p)), 0);
  y.set(x, 2 * p);
  y.set(x.subarray(0, 2 * q), 2 * (n + p));
  return y;
}

/** The frames of an ADTS stream (each a subarray, header included). */
export function adtsFrames(buf) {
  const out = [];
  for (let i = 0; i < buf.length;) {
    if (i + 7 > buf.length || buf[i] !== 0xff || (buf[i + 1] & 0xf6) !== 0xf0) throw new Error(`loop-aac: no ADTS frame at byte ${i}`);
    const len = ((buf[i + 3] & 0x03) << 11) | (buf[i + 4] << 3) | (buf[i + 5] >> 5);
    if (len < 7 || i + len > buf.length) throw new Error(`loop-aac: bad ADTS frame length ${len} at byte ${i}`);
    out.push(buf.subarray(i, i + len));
    i += len;
  }
  return out;
}

/** The score with silence around it (a score that is not a loop): `pre` samples before, `post` seconds after. */
export function silenceExtended(x, pre, post = PAD) {
  const n = x.length / 2, q = Math.round(post * SR);
  const y = new Float32Array(2 * (n + pre + q));
  y.set(x, 2 * pre);
  return y;
}

/**
 * Encode a loop (interleaved Float32Array) to AAC with `frames` whole frames of its own
 * audio before it and PAD seconds after it (silence instead when not `circular`), then drop
 * those frames from the bitstream: the ADTS file written to `aacPath` starts with the frame
 * that decodes the last pre-roll frame (the priming the mux's edit list skips) and then the
 * loop from its first sample. edit 'trim': one frame more is dropped, so the file starts with
 * the frame that decodes the loop's first 1024 samples, and holds exactly the frames that
 * cover the loop. → { aac, frames }
 */
export function encodeLoopAac(x, aacPath, { frames = PRE_FRAMES, bitrate = LOOP_BITRATE, edit = 'priming', circular = true } = {}) {
  if (!AUDIO_EDITS.includes(edit)) throw new Error(`loop-aac: unknown edit ${edit} (have: ${AUDIO_EDITS.join(', ')})`);
  const tmp = mkWorkTemp('hm-loopaac-');
  try {
    const f32 = path.join(tmp, 'ext.f32'), full = path.join(tmp, 'ext.aac');
    const ext = circular ? loopExtended(x, { samples: frames * FRAME }, PAD) : silenceExtended(x, frames * FRAME, PAD);
    fs.writeFileSync(f32, Buffer.from(ext.buffer, ext.byteOffset, ext.byteLength));
    // (no +bitexact flags: they change what ffmpeg's AAC encoder does at the edges, and the loop's
    // delivered click went from −76.5 to −56.8 dBFS with them; the encoder is deterministic without)
    ffmpeg(['-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', f32, ...aacArgs(bitrate), '-map_metadata', '-1', '-f', 'adts', full]);
    const fr = adtsFrames(fs.readFileSync(full));
    // priming: the priming frame, then the frames that cover the loop; trim: those frames alone
    const drop = frames + (edit === 'trim' ? 1 : 0), keep = Math.ceil(x.length / 2 / FRAME) + (edit === 'trim' ? 0 : 1);
    if (fr.length < drop + keep) throw new Error(`loop-aac: the encode has ${fr.length} frames, the pre-roll ${drop} and the loop ${keep}`);
    fs.writeFileSync(aacPath, Buffer.concat(fr.slice(drop, drop + keep)));
    return { aac: aacPath, frames };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * ffmpeg arguments that mux a trimmed loop encode (encodeLoopAac) under a picture. 'priming':
 * the audio starts PRIMING samples before 0 with those timestamps kept, so the only edit is
 * the standard priming (follow with presentExactly()). 'trim': no edit list on any track; the
 * audio starts at 0 and its last packet lasts what is left of the duration (setts), so the
 * sound track's media is exactly `duration`. The picture is copied with negative composition
 * offsets, so its first frame is presented at 0 with no edit list. `video` null → audio only.
 */
export function muxLoopArgs({ video = null, aac, out, duration, metadata = [], edit = 'priming' }) {
  const inputs = video ? ['-i', video] : [];
  const maps = video ? ['-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy'] : ['-map', '0:a:0'];
  const flags = ['-movflags', '+faststart+negative_cts_offsets'];
  // the last packet lasts only what is left, so the sound media is exactly (priming +) D, as the approved master's
  const span = Math.round(duration * SR) + (edit === 'trim' ? 0 : PRIMING);
  const n = Math.ceil(span / FRAME), last = span - (n - 1) * FRAME;
  const setts = ['-bsf:a', `setts=time_base=1/${SR}:pts=PTS*TB*${SR}:dts=DTS*TB*${SR}:duration=if(eq(N\\,${n - 1})\\,${last}\\,${FRAME})`];
  if (edit === 'trim') return ['-y', ...inputs, '-i', aac, ...maps, '-c:a', 'copy', ...setts, '-use_editlist', '0', ...metadata, ...flags, out];
  return ['-y', ...inputs, '-itsoffset', String(-PRIMING / SR), '-i', aac, ...maps, '-c:a', 'copy', ...setts, '-avoid_negative_ts', 'disabled',
    ...metadata, ...flags, out];
}

/**
 * The movie and its tracks as an MP4's header boxes describe them: { timescale, duration,
 * tracks: [{ handler, duration (movie timescale), edits: [[segment duration, media time]],
 * media: { timescale, duration } }] }. With `write`, also the byte offsets of the duration
 * fields (presentExactly).
 */
export function mp4Info(file, { write = false } = {}) {
  const b = fs.readFileSync(file);
  const out = { timescale: null, duration: null, tracks: [] };
  const field = (off, v) => ({ off, v, get: () => (v === 1 ? Number(b.readBigUInt64BE(off)) : b.readUInt32BE(off)) });
  const walk = (o, end, trak) => {
    while (o + 8 <= end) {
      let size = b.readUInt32BE(o), h = 8;
      const typ = b.toString('latin1', o + 4, o + 8);
      if (size === 1) { size = Number(b.readBigUInt64BE(o + 8)); h = 16; }
      if (size === 0) size = end - o;
      const c = o + h, v = b[c];
      if (typ === 'trak') { const t = { handler: null, duration: null, edits: [], media: null }; out.tracks.push(t); walk(c, o + size, t); }
      else if (['moov', 'edts', 'mdia'].includes(typ)) walk(c, o + size, trak);
      else if (typ === 'mvhd') { out.timescale = v === 1 ? b.readUInt32BE(c + 20) : b.readUInt32BE(c + 12); out.mvhd = field(c + (v === 1 ? 24 : 16), v); }
      else if (typ === 'tkhd' && trak) trak.tkhd = field(c + (v === 1 ? 28 : 20), v);
      else if (typ === 'mdhd' && trak) trak.media = { timescale: v === 1 ? b.readUInt32BE(c + 20) : b.readUInt32BE(c + 12), duration: v === 1 ? Number(b.readBigUInt64BE(c + 24)) : b.readUInt32BE(c + 16) };
      else if (typ === 'hdlr' && trak) trak.handler = b.toString('latin1', c + 8, c + 12);
      else if (typ === 'elst' && trak) {
        const n = b.readUInt32BE(c + 4), w = v === 1 ? 20 : 12;
        for (let k = 0; k < n; k++) {
          const p = c + 8 + k * w;
          trak.edits.push([v === 1 ? Number(b.readBigUInt64BE(p)) : b.readUInt32BE(p), v === 1 ? Number(b.readBigInt64BE(p + 8)) : b.readInt32BE(p + 4)]);
          if (k === 0) trak.elst0 = field(p, v);
        }
      }
      o += size;
    }
  };
  walk(0, b.length, null);
  out.duration = out.mvhd?.get() ?? null;
  for (const t of out.tracks) t.duration = t.tkhd?.get() ?? null;
  if (write) return { info: out, buffer: b };
  for (const t of out.tracks) { delete t.tkhd; delete t.elst0; }
  delete out.mvhd;
  return out;
}

/**
 * Present the sound track for exactly `seconds`: its edit's segment duration and its track
 * duration, and the movie's duration (the longest track), written in place (same-size
 * fields). (FU-5: the media itself now ends at priming + D, its last packet trimmed in stts,
 * as the approved master's.)
 */
export function presentExactly(file, seconds) {
  const { info, buffer: b } = mp4Info(file, { write: true });
  const snd = info.tracks.filter((t) => t.handler === 'soun');
  if (snd.length !== 1 || !snd[0].elst0 || snd[0].edits.length !== 1) throw new Error(`loop-aac: ${file} has no single sound track with one edit`);
  const dur = Math.round(seconds * info.timescale);
  const put = (f, val) => (f.v === 1 ? b.writeBigUInt64BE(BigInt(val), f.off) : b.writeUInt32BE(val, f.off));
  put(snd[0].elst0, dur);
  put(snd[0].tkhd, dur);
  put(info.mvhd, Math.max(...info.tracks.map((t) => (t === snd[0] ? dur : t.tkhd.get()))));
  fs.writeFileSync(file, b);
}

/** The delivered sound track's edit list must be the standard priming alone, presenting exactly D. */
export function assertNoPreroll(file, duration) {
  const info = mp4Info(file), snd = info.tracks.find((t) => t.handler === 'soun');
  const want = [[Math.round(duration * info.timescale), PRIMING * (snd?.media?.timescale ?? SR) / SR]];
  if (!snd || JSON.stringify(snd.edits) !== JSON.stringify(want)) throw new Error(`loop-aac: ${file}: the sound track's edit list is ${JSON.stringify(snd?.edits)}, expected ${JSON.stringify(want)} (the priming only, exactly D)`);
  return snd.edits;
}

/**
 * The delivered file's timing, by edit mode: 'priming' → assertNoPreroll; 'trim' → no edit list
 * on any track, the sound media exactly D, the picture presented from 0. → the sound track's edits
 */
export function assertDelivery(file, duration, edit = 'priming') {
  if (edit !== 'trim') return assertNoPreroll(file, duration);
  const info = mp4Info(file), snd = info.tracks.find((t) => t.handler === 'soun');
  const bad = info.tracks.filter((t) => t.edits.length);
  if (bad.length) throw new Error(`loop-aac: ${file}: edit lists on ${bad.map((t) => `${t.handler} ${JSON.stringify(t.edits)}`).join(', ')} (trim delivers none)`);
  if (!snd || snd.media.duration !== Math.round(duration * snd.media.timescale)) throw new Error(`loop-aac: ${file}: the sound media lasts ${snd?.media?.duration}/${snd?.media?.timescale}, expected exactly ${duration} s`);
  return snd.edits;
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
 * The loop's AAC as it will be delivered: encoded with its own audio around it and its
 * pre-roll dropped, at the first pre-roll length whose decoded seam passes (raw wrap step
 * ≤ SEAM_STEP_TARGET and click below −60 dBFS), else the one that misses by least, of
 * `tries`. → { aac, frames, pad (the pre-roll dropped, s), clickDbfs, stepDbfs, pass, tries,
 * y (the decoded D seconds) }; the ADTS file is written to `dir`.
 */
export function encodeLoopDelivery(x, duration, dir, { bitrate = LOOP_BITRATE, tries = ALIGN_TRIES, edit = 'priming', circular = true } = {}) {
  let best = null;
  for (let k = 0; k < tries; k++) {
    const frames = PRE_FRAMES + k, aac = path.join(dir, `loop-${k}.aac`), mp4 = path.join(dir, `loop-${k}.mp4`);
    encodeLoopAac(x, aac, { frames, bitrate, edit, circular });
    ffmpeg(muxLoopArgs({ aac, out: mp4, duration, edit }));
    if (edit !== 'trim') presentExactly(mp4, duration);
    const y = decodeAudio(mp4, duration);
    const click = 20 * Math.log10(clickAt(y, 0)), step = 20 * Math.log10(rawStepAt(y, 0));
    const miss = Math.max(0, step - SEAM_STEP_TARGET, click - LIMITS.seamClick);
    if (!best || miss < best.miss) best = { aac, frames, pad: +((frames * FRAME) / SR).toFixed(6), clickDbfs: +click.toFixed(1), stepDbfs: +step.toFixed(1), miss, pass: miss === 0, tries: k + 1, y };
    if (miss === 0) break;
  }
  return best;
}

/**
 * Mux a circular score under a picture with loop-aware AAC (the fix above) and check
 * the result: the audio lasts exactly `duration`, lines up with the WAV at lag 0, and
 * its edit list is the standard priming alone (no pre-roll hidden behind it), or, with
 * edit 'trim', there is no edit list at all. circular false: a score that is not a loop,
 * padded with silence (the 'trim' delivery of the plain mux).
 * → { out, lag, frames (samples), preRollFrames, pad, edits, edit, clickDbfs, stepDbfs, seamPass, tries }
 */
export function muxLoop({ video, wav, out, duration, bitrate = LOOP_BITRATE, metadata = [], edit = 'priming', circular = true }) {
  const x = decodeAudio(wav);
  if (Math.abs(x.length / 2 - duration * SR) > 0.5) throw new Error(`loop-aac: ${wav} has ${x.length / 2} frames, the loop is ${duration} s`);
  const tmp = mkWorkTemp('hm-loopmux-');
  let enc;
  try {
    enc = encodeLoopDelivery(x, duration, tmp, { bitrate, edit, circular, tries: circular ? ALIGN_TRIES : 1 });
    ffmpeg(muxLoopArgs({ video, aac: enc.aac, out, duration, metadata, edit }));
    if (edit !== 'trim') presentExactly(out, duration);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const edits = assertDelivery(out, duration, edit);
  const y = decodeAudio(out, duration);
  if (y.length !== x.length) throw new Error(`loop-aac: the muxed audio decodes to ${y.length / 2} frames, expected ${x.length / 2}`);
  const lag = lagSamples(x, y);
  if (lag !== 0) throw new Error(`loop-aac: the muxed audio is ${lag} samples off the score (expected 0)`);
  return { out, lag, frames: y.length / 2, preRollFrames: enc.frames, pad: enc.pad, edits, edit, clickDbfs: enc.clickDbfs, stepDbfs: enc.stepDbfs, seamPass: enc.pass, tries: enc.tries };
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
