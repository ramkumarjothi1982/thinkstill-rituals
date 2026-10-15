// Score and mux for the render farm.
//
// The score is chosen from the direction's meta.score (never from its id, R3)
// and rendered from the dry run's cues.json (the only source of curves, R12).
// Each score id maps to the script that renders it; the frozen v2 score is
// audio/soundtrack-v2.mjs, run unchanged as the approved render ran it; WP-04's
// generalised score is audio/score.mjs ('hm-score'), which also writes
// score-plan.json beside score.wav (the plan qa/gates reads).
//
// Mux: the video stream is copied; audio is AAC 192 kb/s, 48 kHz stereo; the
// file is cut to the direction's duration, gets faststart and the provenance
// stamp in its comment tag, as render/render.mjs assembled the approved master.
// A circular score (score-plan.json says so) is muxed loop-aware instead
// (audio/loop-aac.mjs muxLoop: the loop encoded with its own audio around it,
// the pre-roll dropped from the bitstream, the standard priming edit only, the
// seam and A/V sync verified), because a plain AAC encode puts a click back
// where the MP4 loops (R7).
//
// Timing (FU-5): the picture never carries an offset. x264's B-frame delay is
// written as negative composition offsets instead of a 2-frame edit list, so a
// player that ignores edit lists shows frame 0 at t = 0 (with the approved
// master's layout it showed the picture 66.7 ms late, i.e. the sound 45 ms early).
// The codec's priming is delivered as `audioEdit` says (audio/loop-aac.mjs):
// 'priming' (default: the standard 1024-sample edit, as the approved master; the
// loop is seamless wherever edit lists are honoured) or 'trim' (no edit list at
// all; the sound starts at t = 0 everywhere, at the cost of a click at every loop:
// see docs/wp/FU-5.md). The same mux makes preview.mp4 from the preview picture.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { STUDIO } from './lib/paths.mjs';

/** How the codec's priming is delivered (audio/loop-aac.mjs AUDIO_EDITS); the default keeps every loop seamless. */
export const AUDIO_EDIT_DEFAULT = 'priming';
export const AUDIO_EDIT_MODES = Object.freeze(['priming', 'trim']);

/** meta.score → script (studio-relative) taking <cues.json> <out.wav>. */
export const SCORES = Object.freeze({
  'soundtrack-v2': 'audio/soundtrack-v2.mjs',
  'hm-score': 'audio/score.mjs',
});

function runNode(script, args, log) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const relay = (s) => s.on('data', (d) => String(d).split('\n').filter(Boolean).forEach((l) => log(l)));
    relay(p.stdout); relay(p.stderr);
    p.once('error', reject);
    p.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(script)} exited ${code}`))));
  });
}

/** Render score.wav for a compiled job (a heavy job: holds a shared slot of the heavy lock). */
export async function scoreJob(jobDir, job, { log = console.log } = {}) {
  const id = job.info.score;
  if (!Object.hasOwn(SCORES, id)) throw new Error(`direction ${job.direction} names score "${id}", which has no renderer (have: ${Object.keys(SCORES).join(', ')})`);
  const { withHeavyLock } = await import('./lib/heavy-lock.mjs');
  const wav = path.join(jobDir, 'score.wav');
  await withHeavyLock({ mode: 'shared', label: `score ${job.id}` },
    () => runNode(path.join(STUDIO, SCORES[id]), [path.join(jobDir, 'cues.json'), `${wav}.part.wav`], (l) => log(`[score] ${l}`)));
  fs.renameSync(`${wav}.part.wav`, wav);
  return wav;
}

/**
 * The delivered timing of an MP4: each track's edit list, and whether the picture is
 * presented from t = 0 when edit lists are ignored (no edit, or an identity edit).
 */
export async function deliveryTiming(file) {
  const { mp4Info } = await import('../audio/loop-aac.mjs');
  const info = mp4Info(file);
  const tracks = info.tracks.map((t) => ({ handler: t.handler, edits: t.edits, media: t.media }));
  const vid = tracks.find((t) => t.handler === 'vide');
  return { tracks, pictureOffset: vid ? vid.edits.reduce((m, e) => Math.max(m, e[1]), 0) : null };
}

/**
 * final.mp4 from video.mp4 (+ score.wav when audio), stamped; with `video`/`out`, any
 * picture into any file (the preview). → { file, audio, audioEdit, loop, ...timing }
 */
export async function muxJob(jobDir, job, { audio = true, stamp = '', audioEdit = AUDIO_EDIT_DEFAULT, video = path.join(jobDir, 'video.mp4'), out = path.join(jobDir, 'final.mp4'), log = console.log } = {}) {
  if (!AUDIO_EDIT_MODES.includes(audioEdit)) throw new Error(`unknown audio edit ${audioEdit} (have: ${AUDIO_EDIT_MODES.join(', ')})`);
  const wav = path.join(jobDir, 'score.wav'), part = `${out}.part.mp4`;
  const meta = ['-metadata', `comment=${stamp}`, '-metadata', `title=${job.info.title || job.direction}`];
  const planFile = path.join(jobDir, 'score-plan.json');
  const circular = !!(audio && fs.existsSync(planFile) && JSON.parse(fs.readFileSync(planFile, 'utf8')).circular);
  let r = null;
  if (audio && (circular || audioEdit === 'trim')) {
    const { muxLoop, BITRATE } = await import('../audio/loop-aac.mjs');
    r = muxLoop({ video, wav, out: part, duration: job.info.duration, metadata: meta, edit: audioEdit, circular, ...(circular ? {} : { bitrate: BITRATE }) });
  } else {
    const args = audio
      ? ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', video, '-i', wav,
        '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
        '-t', String(job.info.duration), ...meta, '-movflags', '+faststart+negative_cts_offsets', part]
      : ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', video, '-map', '0:v:0', '-c:v', 'copy', ...meta, '-movflags', '+faststart+negative_cts_offsets', part];
    const p = spawnSync('ffmpeg', args, { encoding: 'utf8' });
    if (p.status !== 0) throw new Error(`mux failed: ${p.stderr}`);
  }
  const timing = await deliveryTiming(part);
  if (timing.pictureOffset) throw new Error(`mux: ${path.basename(out)}: the picture carries an edit-list offset (${JSON.stringify(timing.tracks.find((t) => t.handler === 'vide').edits)}); it must be presented from t = 0`);
  fs.renameSync(part, out);
  const what = !audio ? 'video only' : r ? `video + ${circular ? 'loop-aware ' : ''}AAC score, ${audioEdit}: seam step ${r.stepDbfs} dBFS, click ${r.clickDbfs} dBFS, lag ${r.lag}` : 'video + AAC score';
  log(`muxed ${path.basename(out)} (${what})`);
  return { file: path.basename(out), audio, audioEdit: audio ? audioEdit : null, loop: circular, seam: r ? { stepDbfs: r.stepDbfs, clickDbfs: r.clickDbfs, pass: r.seamPass, lag: r.lag } : null, ...timing };
}
