// ffmpeg/x264 for the render farm: segment encoders, concat, and the probes
// that check the result (frame count, decode errors, IDR positions, PSNR).
//
// Segments must be invisible. A 90-frame segment is encoded on its own, then
// the segments are joined with the concat demuxer and `-c copy`, so the joined
// stream must equal what one encoder would have produced from all frames in
// one pass. Measured in WP-01 (450 frames of v2, 5 segments, docs/wp/WP-01.md):
//   - CRF 16 (x264 rate control as in the approved render): 49.5 dB against the
//     single pass, with almost every frame different. CRF carries state across
//     GOPs: MB-tree looks 50 frames ahead across keyframes, I-frame QPs come
//     from a decaying average of earlier frames, and direct=auto adapts from
//     earlier B-frames. So CRF is not segment-invariant.
//   - constant QP with direct=spatial and scenecut=0 keeps every GOP self-
//     contained: the joined segments decode bit-identically to the single pass
//     (all 450 frames). QP 15 matches CRF 16's quality against the same source
//     (SSIM 0.9866 vs 0.9857, PSNR-Y 44.93 vs 44.72 dB) at +6 % size.
// Hence the segment encoder 'qp15' below is the farm's default; 'crf16' is kept
// for single-pass work only.
//
// Frames arrive as raw RGBA with bottom-up rows (WebGL readPixels) and are
// flipped and converted exactly as the approved render did (vflip, full-range
// RGB → BT.709 limited-range yuv420p). x264 threads are pinned so the output
// does not depend on the machine's core count.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** GOP layout shared by every encoder: an IDR every 30 frames, closed GOPs, no scene-cut keyframes. */
export const GOP = 30;

export const ENCODERS = Object.freeze({
  qp15: {
    summary: 'x264 slow, constant QP 15, GOP-local (segment-invariant); the farm default',
    rate: ['-qp', '15'],
    x264: `keyint=${GOP}:min-keyint=${GOP}:scenecut=0:open-gop=0:direct=spatial`,
    segmentSafe: true,
  },
  crf16: {
    summary: 'x264 slow, CRF 16 (the approved render\'s rate control); NOT segment-invariant',
    rate: ['-crf', '16'],
    x264: `keyint=${GOP}:min-keyint=${GOP}:scenecut=0:open-gop=0`,
    segmentSafe: false,
  },
  crf20: {
    summary: 'x264 slow, CRF 20 preview copy (single pass from the master)',
    rate: ['-crf', '20'],
    x264: `keyint=${GOP}:min-keyint=${GOP}:scenecut=0:open-gop=0`,
    segmentSafe: false,
  },
});

/** The colour pipeline of the approved render (render/render.mjs): flip, full → limited range, BT.709. */
export const VF_FROM_GL = 'vflip,scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p';

/** x264 output arguments for an encoder name. */
export function x264Args(encoder = 'qp15', { fps = 30, threads = 2 } = {}) {
  const e = ENCODERS[encoder];
  if (!e) throw new Error(`unknown encoder ${encoder} (have: ${Object.keys(ENCODERS).join(', ')})`);
  return [
    '-c:v', 'libx264', '-preset', 'slow', ...e.rate, '-tune', 'film',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-g', String(GOP), '-keyint_min', String(GOP),
    '-x264-params', e.x264, '-threads', String(threads),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-r', String(fps),
  ];
}

/**
 * Full ffmpeg argv: raw RGBA (bottom-up) frames on stdin → H.264 MP4 at `out`.
 * keyframeEvery: also force an IDR every that many frames (a single-pass
 * reference for segments whose length is not a multiple of GOP).
 */
export function rawEncodeArgs({ width, height, fps, out, encoder = 'qp15', threads = 2, keyframeEvery = 0 }) {
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

/** Re-encode a video stream (e.g. the CRF 20 preview). */
export function transcode(input, out, { encoder = 'crf20', fps = 30, threads = 2, extra = [] } = {}) {
  const r = run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', input, '-map', '0:v:0', '-map', '0:a?', ...x264Args(encoder, { fps, threads }), '-c:a', 'copy', ...extra, '-movflags', '+faststart', out]);
  if (r.status !== 0) throw new Error(`transcode failed: ${r.stderr.toString().trim()}`);
  return out;
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
