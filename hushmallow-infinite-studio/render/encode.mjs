// ffmpeg/x264 for the render farm: segment encoders, the master pass, concat,
// and the probes that check the result (frame count, decode errors, IDR
// positions, PSNR, the H.264 stream hash).
//
// Segments must be invisible. Measured in WP-01 (450 frames of v2, 5 segments,
// docs/wp/WP-01.md):
//   - CRF 16 per segment (x264 rate control as in the approved render): 49.5 dB
//     against the single pass, with almost every frame different. CRF carries
//     state across GOPs: MB-tree looks 50 frames ahead across keyframes, I-frame
//     QPs come from a decaying average of earlier frames, and direct=auto adapts
//     from earlier B-frames. So CRF is not segment-invariant.
//   - constant QP with direct=spatial and scenecut=0 keeps every GOP self-
//     contained: segments joined with concat -c copy decode bit-identically to
//     the single pass, but QP 15 is 34 % larger than the approved master.
// Owner decision Q4(b) (OWNER-DECISIONS, lead decision 2026-10-14, FU-5): keep
// CRF 16. Each segment is encoded LOSSLESSLY ('lossless': x264 QP 0, ultrafast,
// so cheap that it no longer competes with the renderer for the CPU), and the
// master is ONE pass over the joined frames ('crf16': the approved render's own
// arguments, render/render.mjs, with the thread count x264 chose for it). The
// lossless intermediate decodes to exactly the yuv420p frames the colour
// conversion produced, so the master equals a single-pass encode of the frames
// bit for bit, however the film was segmented (tests/unit/farm-encode.test.mjs,
// hm render --tee-single-pass). The preview (CRF 20) is encoded from the same
// decode in the same pass. 'qp15' and 'draft' stay segment-invariant encoders
// whose segments are joined with concat -c copy (no master pass): draft keeps
// its speed, and qp15 is kept for comparisons.
//
// Frames arrive as raw RGBA with bottom-up rows (WebGL readPixels) and are
// flipped and converted exactly as the approved render did (vflip, full-range
// RGB → BT.709 limited-range yuv420p). x264 threads are pinned so the output
// does not depend on the machine's core count.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** GOP layout shared by every encoder: an IDR every 30 frames, closed GOPs, no scene-cut keyframes. */
export const GOP = 30;

export const ENCODERS = Object.freeze({
  lossless: {
    summary: 'x264 ultrafast, lossless (QP 0): the segment intermediate; the master is one pass over the joined frames',
    preset: 'ultrafast',
    rate: ['-qp', '0'],
    profile: 'high444', level: null, tune: null,        // lossless needs High 4:4:4 Predictive (also for 4:2:0)
    x264: `keyint=${GOP}:min-keyint=${GOP}:scenecut=0:open-gop=0`,
    segmentSafe: true,
    intermediate: true,
  },
  qp15: {
    summary: 'x264 slow, constant QP 15, GOP-local (segment-invariant); joined with concat -c copy (WP-01\'s farm default)',
    rate: ['-qp', '15'],
    x264: `keyint=${GOP}:min-keyint=${GOP}:scenecut=0:open-gop=0:direct=spatial`,
    segmentSafe: true,
  },
  crf16: {
    // exactly render/render.mjs's arguments (no -x264-params: x264 clamps keyint_min to 16 and keeps
    // scenecut 40), and threads=6: what x264 chose for the approved master on the 4-core studio machine
    // (its SEI reads threads=6), pinned so the master does not depend on the machine
    summary: 'x264 slow, CRF 16: the approved render\'s arguments; the master, one pass over every frame (NOT segment-invariant)',
    rate: ['-crf', '16'],
    x264: null,
    threads: 6,
    segmentSafe: false,
    master: true,
  },
  draft: {
    summary: 'x264 veryfast, constant QP 20, GOP-local (segment-invariant); review drafts',
    preset: 'veryfast',
    rate: ['-qp', '20'],
    x264: `keyint=${GOP}:min-keyint=${GOP}:scenecut=0:open-gop=0:direct=spatial`,
    segmentSafe: true,
  },
  crf20: {
    // preset fast (WP-02, measured on v2's final master): 22.7 s instead of 61.6 s (slow, 2 threads),
    // 46.46 dB against the master instead of 45.98, 9.8 MB instead of 10.7
    summary: 'x264 fast, CRF 20 preview copy (from the lossless frames in the master pass, else from the master)',
    preset: 'fast',
    rate: ['-crf', '20'],
    x264: `keyint=${GOP}:min-keyint=${GOP}:scenecut=0:open-gop=0`,
    threads: 4,
    segmentSafe: false,
    preview: true,
  },
});

/** The shareable preview's size limit (OWNER-DECISIONS Q3: previews of 15 MB or less). */
export const PREVIEW_MAX_BYTES = 15e6;

/** The colour pipeline of the approved render (render/render.mjs): flip, full → limited range, BT.709. */
export const VF_FROM_GL = 'vflip,scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p';

/** x264 output arguments for an encoder name (threads: the encoder's own count, else 2, unless given). */
export function x264Args(encoder = 'lossless', { fps = 30, threads, crf = null } = {}) {
  const e = ENCODERS[encoder];
  if (!e) throw new Error(`unknown encoder ${encoder} (have: ${Object.keys(ENCODERS).join(', ')})`);
  const rate = crf === null ? e.rate : ['-crf', String(crf)];
  const tune = e.tune === undefined ? 'film' : e.tune, level = e.level === undefined ? '4.2' : e.level;
  return [
    '-c:v', 'libx264', '-preset', e.preset || 'slow', ...rate, ...(tune ? ['-tune', tune] : []),
    '-pix_fmt', 'yuv420p', '-profile:v', e.profile || 'high', ...(level ? ['-level', level] : []), '-g', String(GOP), '-keyint_min', String(GOP),
    ...(e.x264 ? ['-x264-params', e.x264] : []), '-threads', String(threads ?? e.threads ?? 2),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-r', String(fps),
  ];
}

/**
 * Full ffmpeg argv: raw RGBA (bottom-up) frames on stdin → H.264 MP4 at `out`.
 * keyframeEvery: also force an IDR every that many frames (a single-pass
 * reference for segments whose length is not a multiple of GOP).
 */
export function rawEncodeArgs({ width, height, fps, out, encoder = 'lossless', threads, keyframeEvery = 0 }) {
  return [
    '-y', '-hide_banner', '-loglevel', 'error', '-nostdin',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-framerate', String(fps), '-i', '-',
    ...x264Args(encoder, { fps, threads }),
    ...(keyframeEvery ? ['-force_key_frames', `expr:eq(mod(n,${keyframeEvery}),0)`] : []),
    '-vf', VF_FROM_GL,
    '-f', 'mp4', out,
  ];
}

/**
 * Spawn an encoder that reads frames on stdin. → { stdin, done (resolves on exit 0,
 * rejects otherwise with ffmpeg's stderr), kill() }
 */
export function spawnEncoder(argv, { bin = 'ffmpeg' } = {}) {
  const p = spawn(bin, argv, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
  p.stdin.on('error', () => {});           // EPIPE when ffmpeg dies: reported through `done`
  const done = new Promise((resolve, reject) => {
    p.once('error', reject);
    p.once('close', (code, sig) => (code === 0 ? resolve() : reject(new Error(`${bin} exited ${code ?? sig}: ${err.trim()}`))));
  });
  done.catch(() => {});                    // observed by the caller; never an unhandled rejection
  return { stdin: p.stdin, done, pid: p.pid, kill: () => { try { p.kill('SIGKILL'); } catch { /* gone */ } } };
}

function run(bin, args, { maxBuffer = 1 << 30, input } = {}) {
  const r = spawnSync(bin, args, { maxBuffer, input });
  if (r.error) throw r.error;
  return r;
}

/** Join segment files (same encoder settings) with the concat demuxer and stream copy. */
export function concatSegments(files, out) {
  const list = `${out}.concat.txt`;
  fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  try {
    const r = run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
    if (r.status !== 0) throw new Error(`concat failed: ${r.stderr.toString().trim()}`);
  } finally {
    fs.rmSync(list, { force: true });
  }
  return out;
}

/** Re-encode a video stream (e.g. the CRF 20 preview from the master); audio is copied. */
export function transcode(input, out, { encoder = 'crf20', fps = 30, threads, crf = null, extra = [] } = {}) {
  const r = run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', input, '-map', '0:v:0', '-map', '0:a?', ...x264Args(encoder, { fps, threads, crf }), '-c:a', 'copy', ...extra, '-movflags', '+faststart', out]);
  if (r.status !== 0) throw new Error(`transcode failed: ${r.stderr.toString().trim()}`);
  return out;
}

/**
 * The master pass (Q4(b)): decode the joined lossless segments once and encode every
 * frame in one x264 pass with the master encoder; with `previewOut`, the preview is
 * encoded from the same decoded frames in the same process (its own x264 instance).
 * Video only: the score is muxed afterwards. → { out, previewOut, ms }
 */
export function encodeMaster(files, out, { encoder = 'crf16', fps = 30, previewOut = null, previewEncoder = 'crf20' } = {}) {
  if (!ENCODERS[encoder]?.master) throw new Error(`${encoder} is not a master encoder`);
  for (const f of files) if (!fs.existsSync(f)) throw new Error(`master pass: segment ${f} is missing`);
  const list = `${out}.concat.txt`;
  fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const t0 = process.hrtime.bigint();
  try {
    const input = ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'concat', '-safe', '0', '-i', list];
    const master = [...x264Args(encoder, { fps }), '-movflags', '+faststart', out];
    const args = previewOut
      ? [...input, '-filter_complex', '[0:v:0]split=2[m][p]', '-map', '[m]', ...master, '-map', '[p]', ...x264Args(previewEncoder, { fps }), '-movflags', '+faststart', previewOut]
      : [...input, '-map', '0:v:0', ...master];
    const r = run('ffmpeg', args);
    if (r.status !== 0) throw new Error(`master pass failed: ${r.stderr.toString().trim()}`);
  } finally {
    fs.rmSync(list, { force: true });
  }
  return { out, previewOut, ms: Math.round(Number(process.hrtime.bigint() - t0) / 1e6) };
}

/** sha256 of a file's H.264 elementary stream (Annex B, as ffmpeg -c copy -f h264 writes it): the picture, whatever the container. */
export function h264StreamSha256(file) {
  const r = run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'h264', '-']);
  if (r.status !== 0) throw new Error(`h264 stream of ${file}: ${r.stderr.toString().trim()}`);
  return crypto.createHash('sha256').update(r.stdout).digest('hex');
}

/** Stream facts from ffprobe, with an exact decoded frame count. */
export function probeVideo(file) {
  const r = run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
    'stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_read_frames,color_primaries,color_transfer,color_space:format=duration',
    '-of', 'json', file]);
  if (r.status !== 0) throw new Error(`ffprobe ${file}: ${r.stderr.toString().trim()}`);
  const j = JSON.parse(r.stdout.toString());
  const s = j.streams?.[0] || {};
  return {
    codec: s.codec_name, profile: s.profile, pixFmt: s.pix_fmt, width: s.width, height: s.height,
    fps: s.r_frame_rate, frames: Number(s.nb_read_frames), duration: Number(j.format?.duration),
    color: [s.color_primaries, s.color_transfer, s.color_space].join('/'),
  };
}

/** Decoder complaints for a full decode (empty array = clean). */
export function decodeErrors(file) {
  const r = run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-f', 'null', '-']);
  return r.stderr.toString().split('\n').map((l) => l.trim()).filter(Boolean);
}

/**
 * Picture types in decode order, read from the H.264 bitstream itself: one entry
 * per coded picture, 'IDR' (NAL type 5) or 'non-IDR' (type 1). In a closed-GOP
 * stream an IDR's decode index is also its display index.
 */
export function pictureTypes(file) {
  const r = run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'h264', '-']);
  if (r.status !== 0) throw new Error(`bitstream dump failed: ${r.stderr.toString().trim()}`);
  return parseAnnexB(r.stdout);
}

/** Coded pictures of an Annex-B H.264 stream (first slice of each picture: first_mb_in_slice == 0). */
export function parseAnnexB(buf) {
  const out = [];
  const n = buf.length;
  for (let i = 0; i + 4 < n; i++) {
    if (buf[i] !== 0 || buf[i + 1] !== 0) continue;
    let h;
    if (buf[i + 2] === 1) h = i + 3;
    else if (buf[i + 2] === 0 && buf[i + 3] === 1) h = i + 4;
    else continue;
    const type = buf[h] & 0x1f;
    // first_mb_in_slice is ue(v); it is 0 exactly when the first payload bit is 1
    if ((type === 1 || type === 5) && (buf[h + 1] & 0x80)) out.push(type === 5 ? 'IDR' : 'non-IDR');
    i = h;
  }
  return out;
}

/** Frame indices of the IDR pictures of a video. */
export function idrFrames(file) {
  return pictureTypes(file).flatMap((t, i) => (t === 'IDR' ? [i] : []));
}

/**
 * Decoded PSNR of `b` against `a` (same frame count). → { y, u, v, average,
 * frames, identical (frames with infinite PSNR), minFrame: {n, average} }
 */
export function psnrVideos(a, b, { statsFile } = {}) {
  const stats = statsFile || `${b}.psnr.log`;
  const esc = stats.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-i', a, '-i', b, '-lavfi', `[0:v][1:v]psnr=stats_file='${esc}'`, '-f', 'null', '-']);
  const m = /PSNR y:(\S+) u:(\S+) v:(\S+) average:(\S+)/.exec(r.stderr.toString());
  if (!m) throw new Error(`psnr failed: ${r.stderr.toString().slice(-500)}`);
  const num = (s) => (s === 'inf' ? Infinity : Number(s));
  const rows = fs.readFileSync(stats, 'utf8').trim().split('\n').map((l) => {
    const f = Object.fromEntries(l.trim().split(/\s+/).map((kv) => kv.split(':')));
    return { n: Number(f.n) - 1, average: num(f.psnr_avg) };
  });
  if (!statsFile) fs.rmSync(stats, { force: true });
  const finite = rows.filter((x) => Number.isFinite(x.average));
  const min = finite.reduce((lo, x) => (!lo || x.average < lo.average ? x : lo), null);
  return {
    y: num(m[1]), u: num(m[2]), v: num(m[3]), average: num(m[4]),
    frames: rows.length, identical: rows.length - finite.length, minFrame: min,
  };
}

/** `ffmpeg -version` first line, and whether libx264 and aac are available. */
export function ffmpegInfo() {
  const v = run('ffmpeg', ['-hide_banner', '-version']);
  const enc = run('ffmpeg', ['-hide_banner', '-encoders']).stdout.toString();
  const pv = run('ffprobe', ['-hide_banner', '-version']);
  return {
    version: v.stdout.toString().split('\n')[0].trim(),
    ffprobe: pv.status === 0 ? pv.stdout.toString().split('\n')[0].trim() : null,
    libx264: /\blibx264\b/.test(enc),
    aac: /\baac\b/.test(enc),
  };
}
