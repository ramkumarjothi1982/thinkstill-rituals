// render/segment.mjs: the segment plan and the files that make the farm
// resumable and safe for parallel workers (locks, .done, attempts).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import {
  planSegments, segPaths, tryLock, lockFile, touchLock, releaseLock, staleReason, processStart, readDone, writeDone,
  recordFailure, isFailed, clearFailures, segmentStatus, writeJsonAtomic, readJson, sha256File, STALE_LOCK_MS, MAX_ATTEMPTS, SEGMENT_FRAMES,
} from '../../render/segment.mjs';

const tmpJob = () => mkWorkTemp('seg-test-');

test('plan: 90-frame segments covering the range, the last one short', () => {
  assert.equal(SEGMENT_FRAMES, 90);
  assert.deepEqual(planSegments(0, 450).map((s) => [s.k, s.a, s.b]), [[0, 0, 90], [1, 90, 180], [2, 180, 270], [3, 270, 360], [4, 360, 450]]);
  assert.deepEqual(planSegments(0, 600).at(-1), { k: 6, a: 540, b: 600 });
  assert.deepEqual(planSegments(30, 75, 20).map((s) => [s.a, s.b]), [[30, 50], [50, 70], [70, 75]]);
  assert.throws(() => planSegments(10, 10), /bad frame range/);
  assert.throws(() => planSegments(0, 10, 0), /bad segment size/);
});

test('a lock is exclusive while its owner lives, and released only by its owner', () => {
  const job = tmpJob();
  try {
    const a = tryLock(job, 0, { worker: 0 });
    assert.ok(a && a.reclaimed === null);
    assert.equal(tryLock(job, 0, { worker: 1 }), null, 'a live lock cannot be taken');
    assert.ok(tryLock(job, 1, { worker: 1 }), 'other segments are independent');
    releaseLock({ ...a, info: { ...a.info, since: 'someone else' } });
    assert.ok(fs.existsSync(a.file), 'a lock that is no longer ours is left alone');
    releaseLock(a);
    assert.ok(!fs.existsSync(a.file));
    assert.ok(tryLock(job, 0, { worker: 1 }));
  } finally { fs.rmSync(job, { recursive: true, force: true }); }
});

test('a lock whose owner died (kill -9) is reclaimed at once', () => {
  const job = tmpJob();
  try {
    const dead = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
    const pid = Number(dead.stdout);
    fs.mkdirSync(path.dirname(segPaths(job, 2).lock), { recursive: true });
    fs.writeFileSync(segPaths(job, 2).lock, JSON.stringify({ pid, pidStart: '1', host: os.hostname(), since: 'x', worker: 9 }));
    const l = tryLock(job, 2, { worker: 0 });
    assert.ok(l, 'reclaimed');
    assert.match(l.reclaimed, /owner pid \d+ is gone/);
    assert.equal(readJson(l.file).pid, process.pid);
  } finally { fs.rmSync(job, { recursive: true, force: true }); }
});

test('a lock reused by another process (pid recycled) is stale; an untouched live lock goes stale after 10 min', () => {
  const host = os.hostname();
  assert.match(staleReason({ pid: process.pid, pidStart: 'not-my-start', host }) ?? '', /reused/);
  assert.equal(staleReason({ pid: process.pid, pidStart: processStart(process.pid), host }), null, 'our own fresh lock is live');
  const now = 1e12;
  assert.equal(STALE_LOCK_MS, 600000);
  assert.equal(staleReason({ pid: 1, host: 'remote-host' }, { now, mtimeMs: now - 9 * 60e3 }), null, 'a remote owner touched 9 min ago is live');
  assert.match(staleReason({ pid: 1, host: 'remote-host' }, { now, mtimeMs: now - 11 * 60e3 }) ?? '', /not touched for 660 s/);
  assert.match(staleReason({ pid: process.pid, pidStart: processStart(process.pid), host }, { now, mtimeMs: now - STALE_LOCK_MS - 1 }) ?? '', /not touched/,
    'a hung (alive but silent) owner loses the lock after 10 min');
  assert.equal(staleReason(null, { now, mtimeMs: now - 1000 }), null, 'a lock being written is not stale');
  assert.equal(staleReason(null, { now, mtimeMs: now - 6000 }), 'unreadable lock');
});

test('stale reclaim through the file system: a lock untouched for > 10 min is taken over; touching keeps it alive', () => {
  const job = tmpJob();
  try {
    const l = tryLock(job, 3, { worker: 0, host: 'other-host' });
    const old = new Date(Date.now() - STALE_LOCK_MS - 5000);
    fs.utimesSync(l.file, old, old);
    const taken = tryLock(job, 3, { worker: 1 });
    assert.ok(taken);
    assert.match(taken.reclaimed, /not touched/);
    const l2 = tryLock(job, 4, { worker: 0, host: 'other-host' });
    fs.utimesSync(l2.file, old, old);
    touchLock(l2);
    assert.equal(tryLock(job, 4, { worker: 1 }), null, 'touched again: live');
  } finally { fs.rmSync(job, { recursive: true, force: true }); }
});

test('.done is trusted only for the same job key and an intact MP4', () => {
  const job = tmpJob();
  try {
    const p = segPaths(job, 0);
    fs.mkdirSync(p.dir, { recursive: true });
    fs.writeFileSync(p.mp4, 'segment bytes');
    writeDone(job, 0, { key: 'K', a: 0, b: 90, hashes: ['h'], mp4: { size: 13, sha256: sha256File(p.mp4) } });
    assert.ok(readDone(job, 0, 'K'));
    assert.equal(readDone(job, 0, 'OTHER'), null, 'another job key');
    fs.writeFileSync(p.mp4, 'segment bytez');
    assert.ok(readDone(job, 0, 'K', { verifyHash: false }), 'same size passes the cheap check');
    assert.equal(readDone(job, 0, 'K'), null, 'but not the hash check');
    fs.writeFileSync(p.mp4, 'short');
    assert.equal(readDone(job, 0, 'K', { verifyHash: false }), null, 'size changed');
    fs.rmSync(p.mp4);
    assert.equal(readDone(job, 0, 'K', { verifyHash: false }), null, 'MP4 missing');
  } finally { fs.rmSync(job, { recursive: true, force: true }); }
});

test('each segment gets 2 retries, then is marked failed; failures can be cleared', () => {
  const job = tmpJob();
  try {
    assert.equal(MAX_ATTEMPTS, 3);
    assert.deepEqual(recordFailure(job, 1, new Error('watchdog: frame 100 took longer than 60 s')), { count: 1, failed: false });
    assert.deepEqual(recordFailure(job, 1, 'browser crashed'), { count: 2, failed: false });
    assert.ok(!isFailed(job, 1));
    assert.deepEqual(recordFailure(job, 1, 'again'), { count: 3, failed: true });
    assert.ok(isFailed(job, 1));
    const f = readJson(segPaths(job, 1).failed);
    assert.equal(f.errors.length, 3);
    assert.match(f.errors[0].error, /watchdog/);
    clearFailures(job, 1);
    assert.ok(!isFailed(job, 1));
    assert.equal(readJson(segPaths(job, 1).attempts), null);
  } finally { fs.rmSync(job, { recursive: true, force: true }); }
});

test('segment status distinguishes done, running, stale, failed and pending', () => {
  const job = tmpJob();
  try {
    const segs = planSegments(0, 50, 10);
    const p0 = segPaths(job, 0);
    fs.mkdirSync(p0.dir, { recursive: true });
    fs.writeFileSync(p0.mp4, 'x');
    writeDone(job, 0, { key: 'K', a: 0, b: 10, hashes: [], mp4: { size: 1, sha256: sha256File(p0.mp4) }, ms: 1000, subframes: 30 });
    tryLock(job, 1, { worker: 0 });
    fs.writeFileSync(segPaths(job, 2).lock, JSON.stringify({ pid: 999999999, host: os.hostname(), since: 'x' }));
    for (let i = 0; i < 3; i++) recordFailure(job, 3, 'boom');
    const st = segmentStatus(job, segs, 'K');
    assert.deepEqual(st.map((s) => s.state), ['done', 'running', 'stale', 'failed', 'pending']);
    assert.equal(st[0].ms, 1000);
    assert.match(st[2].stale, /gone/);
  } finally { fs.rmSync(job, { recursive: true, force: true }); }
});

test('atomic JSON writes leave no temp files behind', () => {
  const dir = tmpJob();
  try {
    const f = path.join(dir, 'a', 'b.json');
    writeJsonAtomic(f, { x: 1 });
    writeJsonAtomic(f, { x: 2 });
    assert.deepEqual(readJson(f), { x: 2 });
    assert.deepEqual(fs.readdirSync(path.dirname(f)), ['b.json']);
    assert.equal(readJson(path.join(dir, 'missing.json')), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the farm lock (one farm per job) never times out while its owner lives, and is reclaimed once it died', () => {
  const dir = tmpJob();
  try {
    const file = path.join(dir, 'farm.lock');
    const mine = lockFile(file, { role: 'farm' }, { staleMs: Infinity });
    const old = new Date(Date.now() - 24 * 3600e3);
    fs.utimesSync(file, old, old);
    assert.equal(lockFile(file, { role: 'farm' }, { staleMs: Infinity }), null, 'a day of silence from a live farm is fine');
    const dead = Number(spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout);
    fs.writeFileSync(file, JSON.stringify({ ...mine.info, pid: dead }));
    const next = lockFile(file, { role: 'farm' }, { staleMs: Infinity });
    assert.match(next?.reclaimed ?? '', /is gone/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
