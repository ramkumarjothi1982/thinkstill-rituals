// The render farm end to end on the fixture directions (engine/dev/fixtures,
// render scale 0.25, 10-frame segments; ≈ 1 min in total):
//   - two different specs in one worker: no texture bleed (R4)
//   - segments joined with concat -c copy decode identically to a single pass
//   - kill -9 mid-segment, then --resume: identical frame hashes, at most one
//     segment lost, the stale lock taken over
//   - the per-frame watchdog fires; each segment gets 2 retries, then is failed
// The same checks at full scale on the approved v2 are recorded in docs/wp/WP-01.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { render, renderMany } from '../../render/farm.mjs';
import { segPaths, readJson } from '../../render/segment.mjs';

const HM = fileURLToPath(new URL('../../cli/hm.mjs', import.meta.url));
const FIX = { scale: 0.25, segmentFrames: 10 };
const quiet = () => {};
const hashes = (jobDir) => readJson(path.join(jobDir, 'provenance.json')).frameHashes;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const root = mkWorkTemp('farm-test-');
test.after(() => fs.rmSync(root, { recursive: true, force: true }));
const out = (name) => path.join(root, name);

test('two different specs rendered by one worker show no texture bleed; segments join like a single pass', { timeout: 600000 }, async () => {
  const alone = await render({ direction: 'dev/text-b', out: out('b-alone'), ...FIX, workers: 1, teeSinglePass: true, log: quiet });
  const v = readJson(path.join(alone.jobDir, 'job.json')).verify;
  assert.equal(v.frames, 30);
  assert.equal(v.decodeErrors, 0);
  assert.deepEqual(v.idrFrames, [0, 10, 20], 'every segment starts with an IDR');
  assert.equal(v.singlePass.identical, 30, `joined segments vs single pass: ${JSON.stringify(v.singlePass)}`);
  const [a, b] = await renderMany([{ direction: 'dev/text-a', out: out('a-batch'), ...FIX }, { direction: 'dev/text-b', out: out('b-batch'), ...FIX }], { workers: 1, log: quiet });
  const log = fs.readFileSync(path.join(a.jobDir, 'logs', 'worker-0.log'), 'utf8');
  assert.match(log, /a-batch segment 0 done[\s\S]*b-batch segment 0 done/, 'one worker process rendered both videos');
  assert.deepEqual(hashes(b.jobDir), hashes(alone.jobDir), 'B after A in the same worker == B alone');
  assert.notDeepEqual(hashes(a.jobDir), hashes(b.jobDir));
});

test('kill -9 mid-segment, then --resume: identical frame hashes, at most one segment lost', { timeout: 600000 }, async () => {
  const ref = await render({ direction: 'dev/text-a', out: out('ref'), ...FIX, workers: 1, log: quiet });
  const jobDir = out('killed');
  const child = spawn(process.execPath, [HM, 'render', 'dev/text-a', '--out', jobDir, '--scale', '0.25', '--segment-frames', '10'], { detached: true, stdio: 'ignore' });
  let killedAt = null;
  for (let t = 0; t < 120000 && !killedAt; t += 10) {
    await sleep(10);
    if (fs.existsSync(segPaths(jobDir, 0).done) && fs.existsSync(segPaths(jobDir, 1).lock)) {
      await sleep(250);                                       // a few frames into segment 1
      process.kill(-child.pid, 'SIGKILL');
      killedAt = t;
    }
  }
  assert.ok(killedAt !== null, 'segment 1 was reached');
  await new Promise((r) => child.once('exit', r));
  assert.ok(!fs.existsSync(segPaths(jobDir, 1).done), 'killed mid-segment');
  const done0 = fs.readFileSync(segPaths(jobDir, 0).done, 'utf8');
  await sleep(1000);
  const orphans = spawnSync('pgrep', ['-f', `worker.mjs --job ${jobDir}`], { encoding: 'utf8' }).stdout.trim();
  assert.equal(orphans, '', 'no worker survives the kill');
  const r = spawnSync(process.execPath, [HM, 'render', jobDir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /reusing 1 finished segment\(s\): 0/, 'only segment 1 (in progress at the kill) was lost');
  assert.match(r.stdout, /segment 1: took over a stale lock \(owner pid \d+ is gone\)/);
  assert.equal(fs.readFileSync(segPaths(jobDir, 0).done, 'utf8'), done0, 'segment 0 was not rendered again');
  assert.deepEqual(hashes(jobDir), hashes(ref.jobDir), 'resumed render == uninterrupted render, frame for frame');
});

test('watchdog: a frame over the limit aborts the attempt; 2 retries, then the segment is marked failed', { timeout: 600000 }, async () => {
  const jobDir = out('hang');
  await assert.rejects(render({ direction: 'dev/hang', out: jobDir, scale: 0.25, segmentFrames: 3, workers: 1, frameTimeoutMs: 2000, log: quiet }), /segments not done: 0 \(failed\), 1 \(failed\)/);
  for (const [k, frame] of [[0, 2], [1, 3]]) {
    const f = readJson(segPaths(jobDir, k).failed);
    assert.equal(f.attempts, 3, `segment ${k}: 1 attempt + 2 retries`);
    for (const e of f.errors) assert.match(e.error, new RegExp(`watchdog: frame ${frame} took longer than 2 s`));
  }
  assert.equal(readJson(path.join(jobDir, 'job.json')).state, 'failed');
});
