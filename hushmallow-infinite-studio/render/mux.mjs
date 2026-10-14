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
// stamp in its comment tag, exactly as render/render.mjs assembled the
// approved master. A circular score (score-plan.json says so) is muxed
// loop-aware instead (audio/loop-aac.mjs muxLoop: the loop encoded with its own
// audio around it, the edit list presenting exactly the duration, the seam and
// A/V sync verified), because a plain AAC encode puts a click back where the
// MP4 loops (R7).

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { STUDIO } from './lib/paths.mjs';

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

/** final.mp4 from video.mp4 (+ score.wav when audio), stamped. */
export async function muxJob(jobDir, job, { audio = true, stamp = '', log = console.log } = {}) {
  const video = path.join(jobDir, 'video.mp4'), wav = path.join(jobDir, 'score.wav');
  const out = path.join(jobDir, 'final.mp4'), part = `${out}.part.mp4`;
  const meta = ['-metadata', `comment=${stamp}`, '-metadata', `title=${job.info.title || job.direction}`];
  const planFile = path.join(jobDir, 'score-plan.json');
  if (audio && fs.existsSync(planFile) && JSON.parse(fs.readFileSync(planFile, 'utf8')).circular) {
    const { muxLoop } = await import('../audio/loop-aac.mjs');
    const r = muxLoop({ video, wav, out: part, duration: job.info.duration, metadata: meta });
    fs.renameSync(part, out);
    log(`muxed ${path.basename(out)} (video + loop-aware AAC score: seam step ${r.stepDbfs} dBFS, click ${r.clickDbfs} dBFS, lag ${r.lag})`);
    return out;
  }
  const args = audio
    ? ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', video, '-i', wav,
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-t', String(job.info.duration), ...meta, '-movflags', '+faststart', part]
    : ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', video, '-map', '0:v:0', '-c:v', 'copy', ...meta, '-movflags', '+faststart', part];
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`mux failed: ${r.stderr}`);
  fs.renameSync(part, out);
  log(`muxed ${path.basename(out)}${audio ? ' (video + AAC score)' : ' (video only)'}`);
  return out;
}
