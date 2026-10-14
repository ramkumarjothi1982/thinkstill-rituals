// tools/perf/video_metrics.py on tiny synthetic films (1080×1920, 6 frames):
// the loop-seam numbers, and the two-video comparison that WP-02's "unchanged
// within 2 %" criterion reads, including the seam inside the face box.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO, mkWorkTemp } from '../../render/lib/paths.mjs';

const TOOL = path.join(STUDIO, 'tools/perf/video_metrics.py');

/** A 6-frame 1080×1920 clip: a test pattern moving `speed` px per frame (x264 QP 0, lossless). */
function clip(file, speed) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=1080x1920:rate=30,scroll=h=${speed / 1080}`, '-frames:v', '6',
    '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv444p', file]);
  return file;
}

const metrics = (...args) => JSON.parse(execFileSync('python3', ['-I', TOOL, ...args], { encoding: 'utf8', maxBuffer: 1 << 24 }));

test('video metrics: two equal films are within 2 %, face-box seam included; a different one is not', () => {
  const dir = mkWorkTemp('video-metrics-');
  try {
    const a = clip(path.join(dir, 'a.mp4'), 4), b = clip(path.join(dir, 'b.mp4'), 4), c = clip(path.join(dir, 'c.mp4'), 40);
    const [ma, , same] = metrics(a, b, '--face', '250,855,825,1239');
    assert.equal(ma.frames, 6);
    assert.ok(ma.seamFace && ma.seamFace.seam > 0, 'the face-box seam is measured');
    assert.deepEqual(Object.keys(same.relativeChange).filter((k) => k.startsWith('seamFace.')).sort(),
      ['seamFace.median', 'seamFace.p90', 'seamFace.quietMedian', 'seamFace.seam'], 'the face-box seam is compared');
    assert.equal(same.within2pct, true);
    const [, , diff] = metrics(a, c, '--face', '250,855,825,1239');
    assert.equal(diff.within2pct, false);
    assert.ok(Math.abs(diff.relativeChange['seamFace.median']) > 0.02);
    // without --face only the whole frame is compared
    const [, , whole] = metrics(a, b);
    assert.ok(!Object.keys(whole.relativeChange).some((k) => k.startsWith('seamFace.')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
