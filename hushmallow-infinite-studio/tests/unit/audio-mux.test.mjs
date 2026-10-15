// render/mux.mjs with WP-04's score: a farm job whose score-plan.json says the score is
// circular is muxed loop-aware (audio/loop-aac.mjs), so the delivered MP4 loops as cleanly
// as score.wav; any other job keeps the plain AAC mux the approved master was built with.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { muxJob, SCORES } from '../../render/mux.mjs';
import { decodeAudio, lagSamples, mp4Info, adtsFrames, PRIMING } from '../../audio/loop-aac.mjs';
import { rawStepAt, clickAt } from '../../audio/check.mjs';
import { writeWav24 } from '../../audio/render-offline.mjs';
import { mkWorkTemp, studioPath } from '../../render/lib/paths.mjs';

const SR = 48000, D = 2;
const db = (v) => 20 * Math.log10(v);

function job(dir, circular) {
  assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=0x203040:s=108x192:r=30:d=${D}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(dir, 'video.mp4')]).status, 0);
  // a circular score: whole cycles of two tones in the loop, spliced where it is flat (its first sample at a crest)
  const n = D * SR, y = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) { const t = i / SR; y[2 * i] = y[2 * i + 1] = 0.3 * Math.cos(2 * Math.PI * 220 * t) + 0.1 * Math.cos(2 * Math.PI * 660 * t); }
  writeWav24(y, path.join(dir, 'score.wav'));
  fs.writeFileSync(path.join(dir, 'score-plan.json'), JSON.stringify({ schema: 'hm-score-plan/1', DUR: D, ...(circular ? { circular: { tail: 4, splice: 0 } } : {}) }));
  return { y, job: { direction: 't', info: { duration: D, title: 't', score: 'hm-score' } } };
}

test('the farm knows the generic score', () => {
  assert.equal(SCORES['hm-score'], 'audio/score.mjs');
});

test('a circular score is muxed loop-aware: exactly D seconds at lag 0, the seam as clean as the WAV\'s', async () => {
  const dir = mkWorkTemp('audio-mux-loop-');
  try {
    const { y, job: j } = job(dir, true);
    const logs = [];
    await muxJob(dir, j, { stamp: 'test', log: (l) => logs.push(l) });
    assert.match(logs.join('\n'), /loop-aware AAC/);
    const out = decodeAudio(path.join(dir, 'final.mp4'), D);
    assert.equal(out.length, y.length, 'exactly D seconds');
    assert.equal(lagSamples(y, out), 0);
    assert.ok(db(rawStepAt(out, 0)) < -60, `delivered wrap step ${db(rawStepAt(out, 0)).toFixed(1)} dBFS`);
    assert.ok(db(clickAt(out, 0)) < -60);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a score that is not circular keeps the plain mux (and its click where the file restarts)', async () => {
  const dir = mkWorkTemp('audio-mux-plain-');
  try {
    const { job: j } = job(dir, false);
    const logs = [];
    await muxJob(dir, j, { stamp: 'test', log: (l) => logs.push(l) });
    assert.match(logs.join('\n'), /video \+ AAC score/);
    const out = decodeAudio(path.join(dir, 'final.mp4'), D);
    assert.ok(db(clickAt(out, 0)) > -50, 'the plain AAC encode steps in from silence at the start');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the loop carries no pre-roll behind its edit list: the priming edit alone, presenting exactly D, as the approved master does', async () => {
  const dir = mkWorkTemp('audio-mux-preroll-');
  try {
    const { y, job: j } = job(dir, true);
    await muxJob(dir, j, { stamp: 'test', log: () => {} });
    const out = path.join(dir, 'final.mp4');
    const snd = mp4Info(out).tracks.find((t) => t.handler === 'soun');
    assert.deepEqual(snd.edits, [[D * 1000, PRIMING]], 'the standard 1024-sample priming, nothing hidden');
    assert.equal(snd.duration, D * 1000);
    const approved = mp4Info(studioPath('output', 'v2', 'my-brain-at-2am-v2.mp4')).tracks.find((t) => t.handler === 'soun');
    assert.deepEqual(approved.edits, [[15000, PRIMING]], 'the approved master\'s own edit list');
    // a player that ignores edit lists hears the score 1024 samples (21 ms) late, exactly as with the approved master (WP-04: 1.02 s)
    const raw = spawnSync('ffmpeg', ['-v', 'error', '-ignore_editlist', '1', '-i', out, '-map', '0:a:0', '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 }).stdout;
    const z = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
    assert.equal(lagSamples(y, z, 2048), PRIMING);
    const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,duration:format=duration', '-of', 'json', out], { encoding: 'utf8' }).stdout);
    assert.deepEqual(probe.streams.map((s) => +s.duration), [D, D]);
    assert.equal(+probe.format.duration, D);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('ADTS frames are read by their own lengths; a broken stream is refused', () => {
  const frame = (len) => { const b = Buffer.alloc(len); b[0] = 0xff; b[1] = 0xf1; b[3] = (len >> 11) & 0x03; b[4] = (len >> 3) & 0xff; b[5] = (len & 0x07) << 5; return b; };
  const s = Buffer.concat([frame(9), frame(300), frame(7)]);
  assert.deepEqual(adtsFrames(s).map((f) => f.length), [9, 300, 7]);
  assert.throws(() => adtsFrames(Buffer.concat([frame(9), Buffer.from([0, 1, 2, 3, 4, 5, 6, 7])])), /no ADTS frame/);
  assert.throws(() => adtsFrames(frame(300).subarray(0, 100)), /bad ADTS frame length/);
});
