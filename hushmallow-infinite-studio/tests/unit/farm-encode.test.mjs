// render/encode.mjs on tiny synthetic clips: encoder arguments, segment
// encodes joined with concat -c copy, and the probes that verify the result.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import {
  ENCODERS, GOP, x264Args, rawEncodeArgs, spawnEncoder, concatSegments, probeVideo, decodeErrors, idrFrames, parseAnnexB, psnrVideos, ffmpegInfo, VF_FROM_GL,
  encodeMaster, h264StreamSha256, PREVIEW_MAX_BYTES,
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

async function encode(out, from, to, encoder = 'qp15', frameAt = frame) {
  const enc = spawnEncoder(rawEncodeArgs({ width: W, height: H, fps: FPS, out, encoder }));
  for (let i = from; i < to; i++) enc.stdin.write(frameAt(i));
  enc.stdin.end();
  await enc.done;
  return out;
}

/** Grainy frames (seeded noise over a moving gradient): what makes CRF's rate control carry state. */
function grainy(i) {
  const buf = frame(i);
  let x = (i + 1) * 2654435761 >>> 0;
  for (let k = 0; k < buf.length; k++) {
    if (k % 4 === 3) continue;
    x = (x * 1664525 + 1013904223) >>> 0;
    buf[k] = Math.max(0, Math.min(255, buf[k] + ((x >>> 24) % 41) - 20));
  }
  return buf;
}

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const yuv = (args) => sha(spawnSync('ffmpeg', ['-v', 'error', '-nostdin', ...args, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], { maxBuffer: 1 << 28 }).stdout);

test('encoder arguments: closed 30-frame GOPs, no scene cuts, pinned threads, the approved colour pipeline', () => {
  assert.equal(GOP, 30);
  const a = x264Args('qp15').join(' ');
  for (const s of ['-c:v libx264', '-preset slow', '-qp 15', '-tune film', '-g 30', '-keyint_min 30', 'keyint=30:min-keyint=30:scenecut=0:open-gop=0:direct=spatial', '-threads 2', '-color_primaries bt709', '-pix_fmt yuv420p', '-profile:v high']) {
    assert.ok(a.includes(s), `${s} in ${a}`);
  }
  assert.equal(VF_FROM_GL, 'vflip,scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p');
  assert.ok(ENCODERS.qp15.segmentSafe && !ENCODERS.crf16.segmentSafe);
  // the lossless intermediate and the master (Q4(b))
  const l = x264Args('lossless').join(' ');
  for (const s of ['-preset ultrafast', '-qp 0', '-profile:v high444', 'keyint=30:min-keyint=30:scenecut=0:open-gop=0', '-threads 2']) assert.ok(l.includes(s), `${s} in ${l}`);
  assert.ok(!l.includes('-tune') && !l.includes('-level'), 'lossless: no tune, no level');
  assert.ok(ENCODERS.lossless.intermediate && ENCODERS.lossless.segmentSafe && ENCODERS.crf16.master && ENCODERS.crf20.preview);
  // the master is exactly render/render.mjs's x264 arguments (the approved master), plus threads=6, the count x264 chose for it
  const m = x264Args('crf16');
  assert.deepEqual(m, ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'film', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-g', '30', '-keyint_min', '30', '-threads', '6', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', '30']);
  const render = fs.readFileSync(new URL('../../render/render.mjs', import.meta.url), 'utf8');
  assert.ok(render.includes("'-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-tune', 'film',") && render.includes("'-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-g', '30', '-keyint_min', '30',"), 'the frozen render.mjs still uses these arguments');
  assert.deepEqual(x264Args('crf20', { crf: 24 }).slice(4, 6), ['-crf', '24'], 'a coarser preview');
  assert.equal(PREVIEW_MAX_BYTES, 15e6);
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
    const enc = spawnEncoder(rawEncodeArgs({ width: W, height: H, fps: FPS, out, encoder: 'qp15', keyframeEvery: 20 }));
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

test('lossless segments decode to exactly the converted frames; the master pass over them equals a single-pass master bit for bit', async () => {
  const dir = mkWorkTemp('enc-master-');
  try {
    const N = 75;
    // the reference: the master encoder's single pass over the raw frames
    const single = await encode(path.join(dir, 'single.mp4'), 0, N, 'crf16', grainy);
    // segments of uneven length, lossless
    const segs = [];
    for (const [a, b] of [[0, 30], [30, 50], [50, 75]]) segs.push(await encode(path.join(dir, `seg-${a}.mp4`), a, b, 'lossless', grainy));
    const raw = path.join(dir, 'frames.rgba');
    fs.writeFileSync(raw, Buffer.concat(Array.from({ length: N }, (_, i) => grainy(i))));
    const want = yuv(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(FPS), '-i', raw, '-vf', VF_FROM_GL]);
    const list = path.join(dir, 'l.txt');
    fs.writeFileSync(list, segs.map((f) => `file '${f}'`).join('\n'));
    assert.equal(yuv(['-f', 'concat', '-safe', '0', '-i', list]), want, 'the joined lossless segments are the converted frames, bit for bit');
    const out = path.join(dir, 'master.mp4'), prev = path.join(dir, 'preview.mp4');
    const r = encodeMaster(segs, out, { fps: FPS, previewOut: prev });
    assert.ok(r.ms >= 0);
    assert.equal(h264StreamSha256(out), h264StreamSha256(single), 'segmented master == single pass (H.264 stream bit-identical)');
    const q = psnrVideos(single, out);
    assert.equal(q.identical, N);
    const p = probeVideo(out);
    assert.deepEqual([p.frames, p.codec, p.profile, p.pixFmt, p.color], [N, 'h264', 'High', 'yuv420p', 'bt709/bt709/bt709']);
    assert.deepEqual(decodeErrors(out), []);
    assert.equal(idrFrames(out)[0], 0);
    assert.equal(probeVideo(prev).frames, N, 'the preview comes from the same decode');
    const alone = path.join(dir, 'master-alone.mp4');
    encodeMaster(segs, alone, { fps: FPS });
    assert.equal(h264StreamSha256(alone), h264StreamSha256(out), 'encoding the preview alongside does not change the master');
    assert.throws(() => encodeMaster(segs, path.join(dir, 'x.mp4'), { encoder: 'qp15' }), /not a master encoder/);
    assert.throws(() => encodeMaster([...segs, path.join(dir, 'gone.mp4')], path.join(dir, 'x.mp4')), /segment .* is missing/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
