// render/encode.mjs on tiny synthetic clips: encoder arguments, segment
// encodes joined with concat -c copy, and the probes that verify the result.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import {
  ENCODERS, GOP, x264Args, rawEncodeArgs, spawnEncoder, concatSegments, probeVideo, decodeErrors, idrFrames, parseAnnexB, psnrVideos, ffmpegInfo, VF_FROM_GL,
} from '../../render/encode.mjs';

const W = 64, H = 48, FPS = 30;

/** A deterministic moving gradient, RGBA with bottom-up rows like WebGL readPixels. */
function frame(i) {
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = ((H - 1 - y) * W + x) * 4;
    buf[o] = (x * 4 + i * 3) & 255; buf[o + 1] = (y * 5 + i * 7) & 255; buf[o + 2] = ((x ^ y) + i) & 255; buf[o + 3] = 255;
  }
  return buf;
}

async function encode(out, from, to, encoder = 'qp15') {
  const enc = spawnEncoder(rawEncodeArgs({ width: W, height: H, fps: FPS, out, encoder }));
  for (let i = from; i < to; i++) enc.stdin.write(frame(i));
  enc.stdin.end();
  await enc.done;
  return out;
}

test('encoder arguments: closed 30-frame GOPs, no scene cuts, pinned threads, the approved colour pipeline', () => {
  assert.equal(GOP, 30);
  const a = x264Args('qp15').join(' ');
  for (const s of ['-c:v libx264', '-preset slow', '-qp 15', '-tune film', '-g 30', '-keyint_min 30', 'keyint=30:min-keyint=30:scenecut=0:open-gop=0:direct=spatial', '-threads 2', '-color_primaries bt709', '-pix_fmt yuv420p', '-profile:v high']) {
    assert.ok(a.includes(s), `${s} in ${a}`);
  }
  assert.equal(VF_FROM_GL, 'vflip,scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p');
  assert.ok(ENCODERS.qp15.segmentSafe && !ENCODERS.crf16.segmentSafe);
  assert.throws(() => x264Args('nope'), /unknown encoder/);
  const r = rawEncodeArgs({ width: 1080, height: 1920, fps: 30, out: 'x.mp4' });
  assert.deepEqual(r.slice(r.indexOf('-f'), r.indexOf('-f') + 8), ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1080x1920', '-framerate', '30']);
});

test('Annex-B parser: one entry per picture (first slice), IDR vs non-IDR', () => {
  const nal = (type, firstMbZero = true) => Buffer.from([0, 0, 0, 1, type, firstMbZero ? 0x88 : 0x00, 0x12]);
  const s = Buffer.concat([nal(7), nal(8), nal(6), nal(5), nal(1), nal(1, false), nal(1), Buffer.from([0, 0, 1, 5, 0x80])]);
  assert.deepEqual(parseAnnexB(s), ['IDR', 'non-IDR', 'non-IDR', 'IDR']);
});

test('segments joined with concat -c copy decode bit-identically to one single-pass encode', async () => {
  const dir = mkWorkTemp('enc-test-');
  try {
    const single = await encode(path.join(dir, 'single.mp4'), 0, 180);
    const segs = [];
    for (const [a, b] of [[0, 90], [90, 180]]) segs.push(await encode(path.join(dir, `seg-${a}.mp4`), a, b));
    const joined = concatSegments(segs, path.join(dir, 'joined.mp4'));
    const p = probeVideo(joined);
    assert.equal(p.frames, 180);
    assert.equal(p.codec, 'h264');
    assert.equal(`${p.width}x${p.height}`, `${W}x${H}`);
    assert.equal(p.color, 'bt709/bt709/bt709');
    assert.deepEqual(decodeErrors(joined), []);
    assert.deepEqual(idrFrames(joined), [0, 30, 60, 90, 120, 150], 'an IDR every 30 frames, so at the segment start too');
    const q = psnrVideos(single, joined);
    assert.equal(q.frames, 180);
    assert.equal(q.identical, 180, `segmented vs single pass: ${JSON.stringify(q)}`);
    assert.equal(q.average, Infinity);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a failing encoder rejects with its stderr; killing it is safe', async () => {
  const bad = spawnEncoder(['-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '0x0', '-i', '-', '-f', 'null', '-']);
  bad.stdin.end();
  await assert.rejects(bad.done, /ffmpeg exited/);
  const dir = mkWorkTemp('enc-kill-');
  try {
    const enc = spawnEncoder(rawEncodeArgs({ width: W, height: H, fps: FPS, out: path.join(dir, 'x.mp4') }));
    enc.stdin.write(frame(0));
    enc.kill();
    await assert.rejects(enc.done);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('ffmpeg has libx264 and aac', () => {
  const f = ffmpegInfo();
  assert.ok(f.libx264 && f.aac, JSON.stringify(f));
  assert.match(f.version, /^ffmpeg version/);
});

test('a single-pass reference with forced IDRs at segment starts matches segments of any length', async () => {
  const dir = mkWorkTemp('enc-test-');
  try {
    const out = path.join(dir, 'single.mp4');
    const enc = spawnEncoder(rawEncodeArgs({ width: W, height: H, fps: FPS, out, keyframeEvery: 20 }));
    for (let i = 0; i < 70; i++) enc.stdin.write(frame(i));
    enc.stdin.end();
    await enc.done;
    assert.deepEqual(idrFrames(out), [0, 20, 40, 60]);
    const segs = [];
    for (const [a, b] of [[0, 20], [20, 40], [40, 60], [60, 70]]) segs.push(await encode(path.join(dir, `s${a}.mp4`), a, b));
    const q = psnrVideos(out, concatSegments(segs, path.join(dir, 'joined.mp4')));
    assert.equal(q.identical, 70, JSON.stringify(q));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
