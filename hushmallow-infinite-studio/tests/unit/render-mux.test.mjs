// render/mux.mjs timing (FU-5): the picture is never offset by an edit list, and the
// AAC priming is delivered as the audio edit mode says. 'priming' (default) keeps the
// standard 1024-sample edit, so the loop is seamless wherever edit lists are honoured;
// 'trim' (the lead decision read literally) carries no edit list at all, so the sound
// starts at t = 0 and lasts exactly D even with -ignore_editlist, and the test records
// what that costs: AAC cannot rebuild a stream's first frame, so the loop clicks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { muxJob, deliveryTiming, AUDIO_EDIT_DEFAULT, AUDIO_EDIT_MODES } from '../../render/mux.mjs';
import { decodeAudio, lagSamples, mp4Info, PRIMING } from '../../audio/loop-aac.mjs';
import { rawStepAt, clickAt } from '../../audio/check.mjs';
import { writeWav24 } from '../../audio/render-offline.mjs';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { timingCheck } from '../../qa/gates/delivery.mjs';

const SR = 48000, D = 2;
const db = (v) => 20 * Math.log10(v);

/** A job directory: a B-frame H.264 picture (2-frame composition delay) and a circular or plain score. */
function job(dir, circular) {
  assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=s=108x192:r=30:d=${D}`, '-c:v', 'libx264', '-bf', '3', '-pix_fmt', 'yuv420p', path.join(dir, 'video.mp4')]).status, 0);
  const n = D * SR, y = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) { const t = i / SR; y[2 * i] = y[2 * i + 1] = 0.3 * Math.cos(2 * Math.PI * 220 * t) + 0.1 * Math.cos(2 * Math.PI * 331 * t); }   // repeats only every 1 s: the lag search cannot alias
  writeWav24(y, path.join(dir, 'score.wav'));
  fs.writeFileSync(path.join(dir, 'score-plan.json'), JSON.stringify({ schema: 'hm-score-plan/1', DUR: D, ...(circular ? { circular: { tail: 4, splice: 0 } } : {}) }));
  return { y, job: { direction: 't', info: { duration: D, title: 't', score: 'hm-score' } } };
}

const probe = (file, ignore) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', ...(ignore ? ['-ignore_editlist', '1'] : []), '-show_entries', 'stream=codec_type,start_time,duration', '-of', 'json', file], { encoding: 'utf8' }).stdout).streams;
const decodeIgnoring = (file) => {
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-ignore_editlist', '1', '-i', file, '-map', '0:a:0', '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 }).stdout;
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
};

test('modes: priming is the default', () => {
  assert.equal(AUDIO_EDIT_DEFAULT, 'priming');
  assert.deepEqual([...AUDIO_EDIT_MODES], ['priming', 'trim']);
});

test('the picture is presented from t = 0 with no edit-list offset (plain, loop and video-only muxes)', async () => {
  for (const [circular, audio] of [[false, true], [true, true], [false, false]]) {
    const dir = mkWorkTemp('render-mux-pic-');
    try {
      const { job: j } = job(dir, circular);
      const src = mp4Info(path.join(dir, 'video.mp4')).tracks.find((t) => t.handler === 'vide');
      assert.ok(src.edits[0][1] > 0, 'x264 with B-frames: the source carries the 2-frame delay as an edit');
      const rec = await muxJob(dir, j, { audio, stamp: 'test', log: () => {} });
      assert.equal(rec.pictureOffset, 0, JSON.stringify(rec.tracks));
      const v = probe(path.join(dir, 'final.mp4'), true).find((s) => s.codec_type === 'video');
      assert.equal(+v.start_time, 0, 'ignoring edit lists, frame 0 is at t = 0');
      assert.equal(+v.duration, D);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test('priming (default): the standard 1024-sample edit, the loop seamless as honoured; 21.3 ms late if edit lists are ignored', async () => {
  const dir = mkWorkTemp('render-mux-priming-');
  try {
    const { y, job: j } = job(dir, true);
    const rec = await muxJob(dir, j, { stamp: 'test', log: () => {} });
    const out = path.join(dir, 'final.mp4');
    assert.equal(rec.audioEdit, 'priming');
    assert.deepEqual(rec.tracks.find((t) => t.handler === 'soun').edits, [[D * 1000, PRIMING]]);
    const z = decodeAudio(out, D);
    assert.equal(lagSamples(y, z), 0);
    assert.ok(db(rawStepAt(z, 0)) < -60 && db(clickAt(z, 0)) < -60, 'seamless where edit lists are honoured');
    assert.equal(lagSamples(y, decodeIgnoring(out), 2048), PRIMING);
    assert.equal(mp4Info(out).tracks.find((t) => t.handler === 'soun').media.duration, D * SR + PRIMING, 'the media ends at priming + D, as the approved master\'s (no trailing partial frame)');
    const s = probe(out, true);
    assert.deepEqual(s.map((x) => [x.codec_type, +x.start_time, +(+x.duration).toFixed(4)]), [['video', 0, D], ['audio', 0, +(D + PRIMING / SR).toFixed(4)]], 'ignoring edit lists: only the 21.3 ms priming differs');
    assert.equal((await timingCheck(out, D)).status, 'pass');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('trim: no edit list on any track; with -ignore_editlist the sound starts at t = 0 and lasts exactly as long as the picture; every loop clicks', async () => {
  for (const circular of [true, false]) {
    const dir = mkWorkTemp('render-mux-trim-');
    try {
      const { y, job: j } = job(dir, circular);
      const rec = await muxJob(dir, j, { stamp: 'test', audioEdit: 'trim', log: () => {} });
      const out = path.join(dir, 'final.mp4');
      assert.equal(rec.audioEdit, 'trim');
      for (const t of mp4Info(out).tracks) assert.deepEqual(t.edits, [], `${t.handler}: no edit list`);
      assert.equal(mp4Info(out).tracks.find((t) => t.handler === 'soun').media.duration, D * SR, 'the sound media is exactly D (its last packet trimmed in stts)');
      const s = probe(out, true);
      assert.deepEqual(s.map((x) => [x.codec_type, +x.start_time, +x.duration]), [['video', 0, D], ['audio', 0, D]], '-ignore_editlist: audio duration = video duration');
      const z = decodeIgnoring(out);
      assert.equal(lagSamples(y, z, 2048), 0, 'the score at lag 0 in a player that ignores edit lists');
      assert.equal((await timingCheck(out, D)).status, 'pass');
      if (circular) {
        // the price: the first AAC frame is rebuilt without its overlap partner, so the loop steps at the seam
        const d = decodeAudio(out, D);
        assert.ok(db(rawStepAt(d, 0)) > -40, `the trimmed loop clicks: wrap step ${db(rawStepAt(d, 0)).toFixed(1)} dBFS`);
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test('delivery timing check: a pre-roll hidden behind the sound edit fails; a picture offset warns', async () => {
  const dir = mkWorkTemp('render-mux-timing-');
  try {
    const { job: j } = job(dir, false);
    const v = path.join(dir, 'video.mp4'), wav = path.join(dir, 'score.wav');
    // WP-04's old loop: 1 s of pre-roll behind the edit list
    const pre = path.join(dir, 'pre.mp4');
    assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', v, '-itsoffset', '-1', '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-t', String(D), '-avoid_negative_ts', 'disabled', '-movflags', '+faststart', pre]).status, 0);
    const c = await timingCheck(pre, D);
    assert.equal(c.status, 'fail', JSON.stringify(c));
    assert.match(c.detail, /pre-roll behind its edit list/);
    // the source picture (B-frame delay as an edit) muxed the old way
    const old = path.join(dir, 'old.mp4');
    assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', v, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-t', String(D), '-movflags', '+faststart', old]).status, 0);
    const o = await timingCheck(old, D);
    assert.equal(o.status, 'warn');
    assert.match(o.detail, /picture carries a 66\.7 ms edit-list offset/);
    assert.equal((await deliveryTiming(old)).pictureOffset > 0, true);
    await muxJob(dir, j, { stamp: 'test', log: () => {} });
    assert.equal((await timingCheck(path.join(dir, 'final.mp4'), D)).status, 'pass');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the preview stays shareable: over its size limit it is encoded again from the master, 2 CRF steps coarser, at most twice', async () => {
  const { makePreview } = await import('../../render/farm.mjs');
  const dir = mkWorkTemp('render-preview-');
  try {
    const { job: j } = job(dir, false);
    j.info.fps = 30;
    const logs = [];
    const big = await makePreview(dir, j, { audio: true, stamp: 'test', maxBytes: 1e9, log: (l) => logs.push(l) });
    assert.deepEqual([big.crf, big.withinLimit, big.from], [20, true, 'the master'], 'within the limit at CRF 20 (no preview picture from a master pass here: encoded from the master)');
    const tiny = await makePreview(dir, j, { audio: true, stamp: 'test', maxBytes: 1000, log: (l) => logs.push(l) });
    assert.equal(tiny.crf, 24, 'CRF 20 → 22 → 24, then it stops');
    assert.equal(tiny.withinLimit, false, 'and says so');
    assert.ok(tiny.bytes < big.bytes);
    assert.equal(logs.filter((l) => /encoding it again/.test(l)).length, 2);
    assert.match(logs.at(-1), /STILL OVER/);
    const t = await deliveryTiming(path.join(dir, 'preview.mp4'));
    assert.equal(t.pictureOffset, 0, 'the preview is muxed like the final');
    assert.ok(!fs.existsSync(path.join(dir, 'preview-video.mp4')), 'its picture intermediate is removed');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
