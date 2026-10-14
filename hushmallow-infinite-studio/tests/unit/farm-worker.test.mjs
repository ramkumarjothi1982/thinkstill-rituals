// render/worker.mjs and render/farm.mjs pieces that need no browser: the
// watchdog, frame hashing, the engine URL, segment claiming order, job status
// and the hm render / hm status command lines.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { flipRows } from '../../render/lib/png.mjs';
import { withTimeout, WatchdogError, topDownSha256, engineUrl, outputSize, claimNext, ENGINE_ARGS, FRAME_TIMEOUT_MS, STUDIO_URL } from '../../render/worker.mjs';
import { planSegments, tryLock, writeDone, segPaths, recordFailure, sha256File } from '../../render/segment.mjs';
import { jobStatus, parseRange, DEFAULTS, JOB_STATES, diskCheck, sequentialGoldenCheck } from '../../render/farm.mjs';
import { parseArgs } from '../../cli/commands/render.mjs';

const HM = fileURLToPath(new URL('../../cli/hm.mjs', import.meta.url));

test('watchdog: a frame that takes too long rejects with WatchdogError; a late rejection is not unhandled', async () => {
  assert.equal(FRAME_TIMEOUT_MS, 60000);
  await assert.rejects(withTimeout(new Promise(() => {}), 50, 'frame 7'), (e) => e instanceof WatchdogError && /frame 7 took longer than 0 s/.test(e.message));
  assert.equal(await withTimeout(Promise.resolve(3), 50, 'x'), 3);
  const late = new Promise((_, reject) => setTimeout(() => reject(new Error('page closed')), 80));
  await assert.rejects(withTimeout(late, 20, 'y'), WatchdogError);
  await new Promise((r) => setTimeout(r, 100));          // the late rejection must not crash the process
});

test('frame hash: sha256 of the top-down rows, computed on the bottom-up buffer without copying', () => {
  const w = 7, h = 5, buf = crypto.randomBytes(w * h * 4);
  assert.equal(topDownSha256(buf, w, h), crypto.createHash('sha256').update(flipRows(buf, w, h)).digest('hex'));
});

test('engine URL, output size and the explicit SwiftShader flags (R2)', () => {
  const p = { ...DEFAULTS, direction: 'my-brain-at-2am-v2' };
  assert.equal(engineUrl(p), `${STUDIO_URL}/engine/index.html?direction=my-brain-at-2am-v2&w=1080&h=1920&scale=1&seed=20261013`);
  assert.match(engineUrl({ ...p, scale: 0.5, mark: 'DRAFT' }), /scale=0\.5&seed=20261013&mark=DRAFT$/);
  assert.deepEqual(outputSize({ width: 1080, height: 1920, scale: 0.5 }), { width: 540, height: 960 });
  assert.deepEqual(outputSize({ width: 1080, height: 1920, scale: 1 / 3 }), { width: 360, height: 640 });
  assert.ok(ENGINE_ARGS.includes('--use-angle=vulkan') && ENGINE_ARGS.includes('--enable-unsafe-swiftshader'));
  assert.ok(!ENGINE_ARGS.includes('--use-angle=swiftshader'), 'measured in WP-00: changes pixels and is 3.7x slower');
});

test('claiming: a worker continues with the segment after its last one, starts at its share, skips done and failed', () => {
  const dir = mkWorkTemp('claim-');
  try {
    const job = { id: 't', key: 'K', segments: planSegments(0, 50, 10) };
    const c1 = claimNext(dir, job, null, 2, { worker: 1 });
    assert.equal(c1.seg.k, 2, 'worker 1 of 2 starts at segment floor(1*5/2)');
    const c0 = claimNext(dir, job, null, 0, { worker: 0 });
    assert.equal(c0.seg.k, 0);
    const p = segPaths(dir, 1);
    fs.mkdirSync(p.dir, { recursive: true });
    fs.writeFileSync(p.mp4, 'x');
    writeDone(dir, 1, { key: 'K', a: 10, b: 20, hashes: [], mp4: { size: 1, sha256: sha256File(p.mp4) } });
    for (let i = 0; i < 3; i++) recordFailure(dir, 3, 'boom');
    assert.equal(claimNext(dir, job, 0, 0, { worker: 0 }).seg.k, 4, 'after 0: 1 done, 2 locked, 3 failed');
    assert.equal(claimNext(dir, job, 0, 0, { worker: 0 }), null, 'nothing left');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('job status: segments, ETA from measured ms per sub-frame; frames range parsing; job states', () => {
  const dir = mkWorkTemp('status-');
  try {
    const segments = planSegments(0, 30, 10);
    fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify({ id: 'j', direction: 'dev/text-a', state: 'segments', key: 'K', segments, subframes: Array(30).fill(4), history: [{ state: 'segments', at: 'now' }] }));
    const p = segPaths(dir, 0);
    fs.mkdirSync(p.dir, { recursive: true });
    fs.writeFileSync(p.mp4, 'x');
    writeDone(dir, 0, { key: 'K', a: 0, b: 10, hashes: [], mp4: { size: 1, sha256: sha256File(p.mp4) }, ms: 4000, subframes: 40 });
    tryLock(dir, 1, { worker: 0 });
    const s = jobStatus(dir);
    assert.deepEqual(s.segments, { total: 3, done: 1, running: 1, pending: 1, stale: 0, failed: 0 });
    assert.equal(s.etaSeconds, 8, '80 sub-frames left at 100 ms each, 1 running worker');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.deepEqual(parseRange('0:90'), [0, 90]);
  assert.throws(() => parseRange('9:3'), /b > a/);
  assert.equal(parseRange(undefined), null);
  for (const s of ['compiled', 'drafted', 'final-queued', 'segments', 'encoded', 'scored', 'muxed', 'qa', 'review']) assert.ok(JOB_STATES.includes(s), s);
  assert.ok(['ok', 'warn', 'refuse'].includes(diskCheck('/home/user/hm-work').level));
});

test('sequential golden: applies only at the golden parameters, and names mismatching frames', () => {
  const ref = JSON.parse(fs.readFileSync(new URL('../../qa/golden/v2/sequential-frames.json', import.meta.url), 'utf8')).hashes;
  const job = { direction: 'my-brain-at-2am-v2', params: { ...DEFAULTS }, frames: [0, 450] };
  const ok = sequentialGoldenCheck(job, ref);
  assert.deepEqual({ ...ok, mismatched: ok.mismatched.length }, { golden: 'qa/golden/v2/sequential-frames.json', frames: 450, identical: 450, mismatched: 0 });
  const part = sequentialGoldenCheck({ ...job, frames: [90, 95] }, ref.slice(90, 95).map((h, i) => (i === 2 ? 'x' : h)));
  assert.deepEqual(part.mismatched, [92]);
  assert.equal(sequentialGoldenCheck({ ...job, params: { ...DEFAULTS, scale: 0.5 } }, ref), null);
  assert.equal(sequentialGoldenCheck({ ...job, direction: 'dev/text-a' }, ref), null);
});

test('hm render: options parse; --list shows the registered (non-fixture) directions; hm status runs', () => {
  const o = parseArgs(['my-brain-at-2am-v2', '--workers', '2', '--resume', '--frames', '0:90', '--no-audio']);
  assert.deepEqual(o, { _: ['my-brain-at-2am-v2'], workers: '2', resume: true, frames: '0:90', 'no-audio': true });
  assert.throws(() => parseArgs(['x', '--bogus']), /unknown option --bogus/);
  assert.throws(() => parseArgs(['x', '--workers']), /needs a value/);
  const list = spawnSync(process.execPath, [HM, 'render', '--list'], { encoding: 'utf8' });
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /^my-brain-at-2am-v2\s+\.\.\/videos\/my-brain-at-2am-v2\.js$/m);
  assert.doesNotMatch(list.stdout, /dev\//);
  const bad = spawnSync(process.execPath, [HM, 'render', 'no-such-direction', '--no-audio'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /unknown direction "no-such-direction"/);
  const st = spawnSync(process.execPath, [HM, 'status'], { encoding: 'utf8' });
  assert.equal(st.status, 0, st.stderr);
  assert.match(st.stdout, /disk studio: [\d.]+ GB free/);
  assert.match(st.stdout, /heavy lock/);
});
