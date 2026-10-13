// Pixel comparisons for golden frames: exact diff statistics between two RGBA
// buffers, and PSNR of a lossless frame against a frame of an encoded MP4
// measured the way the approved render encoded it (full-range RGB →
// BT.709 limited-range yuv420p), so only the codec's loss is measured.

import { spawnSync } from 'node:child_process';

/** → { identical, maxAbs (0..255), differing (channel values), differingPixels } */
export function diffStats(a, b) {
  if (a.length !== b.length) throw new Error(`diffStats: size ${a.length} vs ${b.length}`);
  let maxAbs = 0, differing = 0, differingPixels = 0;
  for (let p = 0; p < a.length; p += 4) {
    let px = false;
    for (let c = 0; c < 4; c++) {
      const d = Math.abs(a[p + c] - b[p + c]);
      if (d) { differing++; px = true; if (d > maxAbs) maxAbs = d; }
    }
    if (px) differingPixels++;
  }
  return { identical: differing === 0, maxAbs, differing, differingPixels };
}

/** The colour conversion of render/render.mjs (after its vflip). */
export const ENCODE_VF = 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p';

/**
 * PSNR (dB) of a lossless PNG frame against frame `n` of `video`, in yuv420p.
 * → { y, u, v, average } (Infinity when identical)
 */
export function psnrAgainstVideo(png, video, n) {
  const graph = `[0:v]${ENCODE_VF}[g];[1:v]select='eq(n\\,${n})',setpts=PTS-STARTPTS[m];[g][m]psnr`;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', png, '-i', video, '-lavfi', graph, '-frames:v', '1', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /PSNR y:(\S+) u:(\S+) v:(\S+) average:(\S+)/.exec(r.stderr || '');
  if (!m) throw new Error(`ffmpeg psnr failed for frame ${n}: ${(r.stderr || '').slice(-400)}`);
  const num = (s) => (s === 'inf' ? Infinity : Number(s));
  return { y: num(m[1]), u: num(m[2]), v: num(m[3]), average: num(m[4]) };
}

/** Seeded Fisher–Yates shuffle (mulberry32), for reproducible "out of order" runs. */
export function shuffled(xs, seed = 0x5eed) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
