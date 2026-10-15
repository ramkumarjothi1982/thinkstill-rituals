// G-FINAL delivery: the generalised render/verify.mjs (which is frozen; this
// is its fork for Phase 2).
//
//   H.264 High, yuv420p, BT.709 tags, 1080x1920, 30 fps; exactly 30 x D frames;
//   duration within +/-0.03 s; faststart (moov before mdat); zero decode errors
//   (counted by the pixel pass's own decode, so the video is decoded once);
//   AAC 48 kHz stereo whose length equals the video's.
//   timing      (FU-5) the sound may carry the codec's priming edit (at most 2112
//               samples, presenting the whole film) and nothing more: a longer
//               pre-roll behind an edit list plays late in any player that ignores
//               edit lists (WP-04's 1.02 s); a picture offset (the B-frame delay as
//               an edit list, as in the approved master) warns: such a player shows
//               the picture late.
//   provenance  the stamp in the MP4's comment tag replaces verify.mjs's mtime
//               freshness check: a farm render's stamp must name the job whose
//               provenance.json describes exactly this file (final.sha256); a
//               composer direction must carry the spec's fingerprint; a remux of a
//               farm render (hm remux, FU-5: "<farm stamp> remux <key12>") must also
//               match the remux record in that provenance, and its picture must be
//               the farm's picture, bit for bit (H.264 stream sha256); a legacy
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

/** The most priming an AAC encoder adds (Apple's encoders: 2112 samples; ffmpeg's: 1024). */
export const MAX_PRIMING = 2112;

function isAncestor(sha) {
  try { execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { cwd: STUDIO, stdio: 'ignore' }); return true; } catch { return false; }
}

/** The provenance check: what the stamp claims, against what QA can verify. */
export async function provenanceCheck(ctx, stampText) {
  const p = ctx.provenance;
  if (!stampText) return check('fail', null, null, 'no provenance stamp in the MP4 comment tag');
  const { parseStamp } = await import('../../render/lib/provenance.mjs');
  const st = parseStamp(stampText);
  if (st?.kind === 'farm') {
    const kind = st.remux ? 'a remux stamp' : 'a farm stamp';
    if (!p) return check('fail', stampText, null, `${kind}, but no provenance.json next to the video to verify it against`);
    const problems = [];
    if (p.final?.sha256 && p.final.sha256 !== ctx.videoSha256) problems.push(`provenance.json describes another final.mp4 (${p.final.sha256.slice(0, 12)})`);
    if (!p.final?.sha256) problems.push('provenance.json has no final.sha256');
    if (p.job?.key?.slice(0, 12) !== st.job) problems.push(`stamp job ${st.job} is not provenance job ${p.job?.key?.slice(0, 12)}`);
    if (p.job?.direction !== st.direction) problems.push(`stamp direction ${st.direction} is not provenance direction ${p.job?.direction}`);
    if (ctx.spec && ctx.direction?.meta?.fingerprint && ctx.direction.meta.fingerprint !== ctx.spec.fingerprint) problems.push('the direction was compiled from another spec (fingerprint)');
    let remuxNote = '';
    if (st.remux) {
      const r = p.remux;
      if (!r || r.schema !== 'hm-remux/1' || !r.key?.startsWith(st.remux)) problems.push(`stamp remux ${st.remux} has no matching remux record in the provenance (${r?.key?.slice(0, 12) ?? 'none'})`);
      else {
        if (r.output?.sha256 !== ctx.videoSha256) problems.push(`the remux record describes another file (${r.output?.sha256?.slice(0, 12)})`);
        const { h264StreamSha256 } = await import('../../render/encode.mjs');
        const stream = h264StreamSha256(ctx.video);
        if (stream !== r.picture?.videoStream) problems.push(`the picture is not the one the remux kept (H.264 stream ${stream.slice(0, 12)}, record ${r.picture?.videoStream?.slice(0, 12)})`);
        if (p.videoStream?.sha256 && stream !== p.videoStream.sha256) problems.push(`the picture is not the farm's (H.264 stream ${stream.slice(0, 12)}, farm ${p.videoStream.sha256.slice(0, 12)})`);
        remuxNote = `; remux ${st.remux} keeps the farm's picture (H.264 stream ${stream.slice(0, 12)}${p.videoStream?.sha256 ? ' = the farm record' : ''}) with a new score`;
      }
    }
    if (problems.length) return check('fail', stampText, null, problems.join('; '));
    const dirty = st.dirty || !!p.remux?.git?.dirty && !!st.remux;
    return check(dirty ? 'warn' : 'pass', stampText, null, `stamp names job ${st.job} of ${st.direction} at ${st.commit}${dirty ? ' from uncommitted code (-dirty)' : ''}; provenance describes this exact file${remuxNote}`);
  }
  if (st?.kind === 'legacy') {
    const { checkFrozen } = await import('../../render/lib/frozen.mjs');
    const frozen = checkFrozen();
    const anc = isAncestor(st.commit);
    const pinned = ctx.evidence?.video?.sha256;
    const problems = [];
    if (!anc) problems.push(`commit ${st.commit} is not in this history`);
    if (!frozen.ok) problems.push(`the frozen v2 changed (${frozen.summary})`);
    if (pinned && pinned !== ctx.videoSha256) problems.push(`the render evidence pins another file (${pinned.slice(0, 12)})`);
    if (problems.length) return check('fail', stampText, null, problems.join('; '));
    return check('pass', stampText, null, `legacy stamp: ${st.direction} at ${st.commit} (in this history); the frozen v2 matches its hash-lock${pinned ? '; the file is the one the render evidence pins' : ''}`);
  }
  return check('fail', stampText, null, `unrecognised provenance stamp "${stampText.slice(0, 80)}"`);
}

/**
 * The delivered timing (edit lists): the sound may carry the codec priming and nothing more,
 * presenting the film; a picture offset warns. → check
 */
export async function timingCheck(file, D) {
  const { mp4Info } = await import('../../audio/loop-aac.mjs');
  let info;
  try { info = mp4Info(file); } catch (e) { return check('fail', null, null, `cannot read the MP4 boxes: ${e.message}`); }
  const snd = info.tracks.find((t) => t.handler === 'soun'), vid = info.tracks.find((t) => t.handler === 'vide');
  const ms = (v, ts) => Math.round((v / ts) * 1e4) / 10;
  const problems = [], warns = [];
  if (snd) {
    const ts = snd.media?.timescale || 48000;
    if (snd.edits.length > 1) problems.push(`the sound has ${snd.edits.length} edits ${JSON.stringify(snd.edits)}`);
    const e = snd.edits[0];
    if (e) {
      const pre = e[1] * (48000 / ts);
      if (pre > MAX_PRIMING) problems.push(`the sound hides ${ms(e[1], ts)} ms of pre-roll behind its edit list (media time ${e[1]}; the codec priming is at most ${MAX_PRIMING} samples): a player that ignores edit lists plays it that late`);
      if (Math.abs(e[0] / info.timescale - D) > 0.034) problems.push(`the sound's edit presents ${(e[0] / info.timescale).toFixed(3)} s of a ${D} s film`);
    }
  }
  const vOff = vid ? vid.edits.reduce((m, e) => Math.max(m, e[1]), 0) : 0;
  if (vOff > 0) warns.push(`the picture carries a ${ms(vOff, vid.media.timescale)} ms edit-list offset (B-frame delay): a player that ignores edit lists shows it that late`);
  const value = { sound: snd?.edits ?? null, picture: vid?.edits ?? null };
  if (problems.length) return check('fail', value, MAX_PRIMING, problems.join('; '));
  const detail = `sound: ${snd?.edits.length ? `the codec priming only (${snd.edits[0][1]} samples)` : 'no edit list'}; picture: ${vOff ? 'offset' : 'presented from t = 0'}`;
  return check(warns.length ? 'warn' : 'pass', value, MAX_PRIMING, warns.length ? `${detail}; ${warns.join('; ')}` : detail);
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
    timing: await timingCheck(ctx.video, D),
    provenance: await provenanceCheck(ctx, pr.format.tags?.comment || null),
  };
  return gate(checks, { metrics: { bytes: Number(pr.format.size), bitrate: Number(pr.format.bit_rate), container: pr.format.format_name, stamp: pr.format.tags?.comment || null } });
}
