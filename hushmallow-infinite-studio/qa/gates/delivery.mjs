// G-FINAL delivery: the generalised render/verify.mjs (which is frozen; this
// is its fork for Phase 2).
//
//   H.264 High, yuv420p, BT.709 tags, 1080x1920, 30 fps; exactly 30 x D frames;
//   duration within +/-0.03 s; faststart (moov before mdat); zero decode errors
//   (counted by the pixel pass's own decode, so the video is decoded once);
//   AAC 48 kHz stereo whose length equals the video's.
//   provenance  the stamp in the MP4's comment tag replaces verify.mjs's mtime
//               freshness check: a farm render's stamp must name the job whose
//               provenance.json describes exactly this file (final.sha256); a
//               composer direction must carry the spec's fingerprint; a legacy
//               render's stamp must name a commit that is in this history while
//               the frozen v2 still matches its hash-lock.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { STUDIO } from '../../render/lib/paths.mjs';
import { check, gate } from './verdict.mjs';

export function ffprobe(file) {
  return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
}

/** Top-level MP4 atoms in file order (type, offset, size), up to the first mdat. */
export function topAtoms(file) {
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;
  const out = [];
  try {
    let off = 0;
    const h = Buffer.alloc(16);
    while (off + 8 <= size && out.length < 64) {
      fs.readSync(fd, h, 0, 16, off);
      let len = h.readUInt32BE(0);
      const type = h.toString('latin1', 4, 8);
      if (len === 1) len = Number(h.readBigUInt64BE(8));
      else if (len === 0) len = size - off;
      if (len < 8) break;
      out.push({ type, offset: off, size: len });
      if (type === 'mdat' || type === 'moov' && out.some((a) => a.type === 'mdat')) break;
      off += len;
    }
  } finally {
    fs.closeSync(fd);
  }
  return out;
}

const STAMP_FARM = /^hushmallow-infinite-studio (\S+) @ ([0-9a-f]{12}|unknown)(-dirty)? job ([0-9a-f]{12})$/;
const STAMP_LEGACY = /^hushmallow-infinite-studio (\S+) @ ([0-9a-f]{12})$/;

function isAncestor(sha) {
  try { execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { cwd: STUDIO, stdio: 'ignore' }); return true; } catch { return false; }
}

/** The provenance check: what the stamp claims, against what QA can verify. */
export async function provenanceCheck(ctx, stampText) {
  const p = ctx.provenance;
  if (!stampText) return check('fail', null, null, 'no provenance stamp in the MP4 comment tag');
  const farm = STAMP_FARM.exec(stampText), legacy = STAMP_LEGACY.exec(stampText);
  if (farm) {
    if (!p) return check('fail', stampText, null, 'a farm stamp, but no provenance.json next to the video to verify it against');
    const problems = [];
    if (p.final?.sha256 && p.final.sha256 !== ctx.videoSha256) problems.push(`provenance.json describes another final.mp4 (${p.final.sha256.slice(0, 12)})`);
    if (!p.final?.sha256) problems.push('provenance.json has no final.sha256');
    if (p.job?.key?.slice(0, 12) !== farm[4]) problems.push(`stamp job ${farm[4]} is not provenance job ${p.job?.key?.slice(0, 12)}`);
    if (p.job?.direction !== farm[1]) problems.push(`stamp direction ${farm[1]} is not provenance direction ${p.job?.direction}`);
    if (ctx.spec && ctx.direction?.meta?.fingerprint && ctx.direction.meta.fingerprint !== ctx.spec.fingerprint) problems.push('the direction was compiled from another spec (fingerprint)');
    if (problems.length) return check('fail', stampText, null, problems.join('; '));
    return check(farm[3] ? 'warn' : 'pass', stampText, null, `stamp names job ${farm[4]} of ${farm[1]} at ${farm[2]}${farm[3] ? ' from uncommitted code (-dirty)' : ''}; provenance.json describes this exact file`);
  }
  if (legacy) {
    const { checkFrozen } = await import('../../render/lib/frozen.mjs');
    const frozen = checkFrozen();
    const anc = isAncestor(legacy[2]);
    const pinned = ctx.evidence?.video?.sha256;
    const problems = [];
    if (!anc) problems.push(`commit ${legacy[2]} is not in this history`);
    if (!frozen.ok) problems.push(`the frozen v2 changed (${frozen.summary})`);
    if (pinned && pinned !== ctx.videoSha256) problems.push(`the render evidence pins another file (${pinned.slice(0, 12)})`);
    if (problems.length) return check('fail', stampText, null, problems.join('; '));
    return check('pass', stampText, null, `legacy stamp: ${legacy[1]} at ${legacy[2]} (in this history); the frozen v2 matches its hash-lock${pinned ? '; the file is the one the render evidence pins' : ''}`);
  }
  return check('fail', stampText, null, `unrecognised provenance stamp "${stampText.slice(0, 80)}"`);
}

/** G-FINAL delivery. py: the pixel pass output (decode frames and errors). */
export async function deliveryGate(ctx, py, T) {
  const L = T.gates['G-FINAL:delivery'];
  const pr = ffprobe(ctx.video);
  const v = pr.streams.find((s) => s.codec_type === 'video');
  const a = pr.streams.find((s) => s.codec_type === 'audio');
  const D = ctx.duration ?? Number(pr.format.duration);
  const fps = ctx.fps || 30;
  const want = Math.round(D * fps);
  const atoms = topAtoms(ctx.video);
  const moov = atoms.findIndex((x) => x.type === 'moov'), mdat = atoms.findIndex((x) => x.type === 'mdat');
  const frames = py?.decode?.frames ?? null;
  const errs = py?.decode?.errorCount ?? null;
  const color = v ? [v.color_primaries, v.color_transfer, v.color_space].join('/') : null;
  const vdur = v ? Number(v.duration) : null, adur = a ? Number(a.duration) : null;
  const ok = (b) => (b ? 'pass' : 'fail');
  const checks = {
    codec: check(ok(v?.codec_name === L.codec && v?.profile === L.profile), `${v?.codec_name} ${v?.profile}`, `${L.codec} ${L.profile}`, `video codec ${v?.codec_name} (${v?.profile})`),
    pixFmt: check(ok(v?.pix_fmt === L.pixFmt), v?.pix_fmt, L.pixFmt, `pixel format ${v?.pix_fmt}`),
    color: check(ok(color === L.color), color, L.color, `colour tags ${color}`),
    size: check(ok(v?.width === L.size[0] && v?.height === L.size[1]), `${v?.width}x${v?.height}`, L.size.join('x'), `resolution ${v?.width}x${v?.height}`),
    fps: check(ok(v?.r_frame_rate === L.fps), v?.r_frame_rate, L.fps, `frame rate ${v?.r_frame_rate}`),
    frames: frames === null ? check('not-run', null, want, 'the pixel pass did not decode the video')
      : check(ok(frames === want), frames, want, `${frames} frames decoded, ${want} expected (${fps} x ${D} s)`),
    duration: check(ok(Math.abs(Number(pr.format.duration) - D) <= L.durationTol), Number(pr.format.duration), D, `container duration ${pr.format.duration} s (D ${D} +/- ${L.durationTol})`),
    faststart: check(ok(moov >= 0 && (mdat < 0 || moov < mdat)), atoms.map((x) => x.type).join(' '), 'moov before mdat', `top-level atoms: ${atoms.map((x) => x.type).join(', ')}`),
    decodeErrors: errs === null ? check('not-run', null, 0, 'the pixel pass did not decode the video')
      : check(ok(errs === 0), errs, 0, errs ? `${errs} decode errors: ${(py.decode.errors || []).slice(0, 2).join(' | ')}` : 'decoded with zero errors'),
    audio: check(ok(a?.codec_name === L.audioCodec && Number(a?.sample_rate) === L.audioRate && a?.channels === L.audioChannels),
      a ? `${a.codec_name} ${a.sample_rate} Hz x${a.channels}` : 'none', `${L.audioCodec} ${L.audioRate} Hz x${L.audioChannels}`, a ? `audio ${a.codec_name} ${a.sample_rate} Hz, ${a.channels} channels` : 'no audio stream'),
    avLength: check(ok(a && Math.abs(adur - vdur) <= L.avLengthTol), a ? Math.round((adur - vdur) * 1e4) / 1e4 : null, L.avLengthTol, a ? `audio ${adur} s vs video ${vdur} s` : 'no audio stream'),
    provenance: await provenanceCheck(ctx, pr.format.tags?.comment || null),
  };
  return gate(checks, { metrics: { bytes: Number(pr.format.size), bitrate: Number(pr.format.bit_rate), container: pr.format.format_name, stamp: pr.format.tags?.comment || null } });
}
