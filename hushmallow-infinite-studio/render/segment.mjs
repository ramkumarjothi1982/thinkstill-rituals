// Segment bookkeeping for the render farm: the plan (90-frame segments), and
// the files that make rendering resumable and safe for parallel workers.
//
// Per segment k, in <job>/seg/:
//   seg-00k.mp4          the encoded segment (written as .mp4.part, renamed on success)
//   seg-00k.done         JSON: frame range, sha256 of every frame's RGBA (top-down),
//                        the MP4's size and sha256, the job key, timings
//   seg-00k.lock         JSON: who renders it now { pid, pidStart, host, worker, since }.
//                        Created with O_EXCL; the owner touches it after every frame.
//   seg-00k.attempts     JSON: failed attempts { count, errors[] }
//   seg-00k.failed       written after MAX_ATTEMPTS failed attempts (1 + 2 retries)
//
// A segment is done only when its .done record matches the job key and the
// MP4 on disk still has the recorded size and hash, so --resume never trusts a
// half-written or foreign file. A lock is stale, and may be taken over, when
// its owner process is gone (same host, pid and process start time checked),
// or when it has not been touched for STALE_LOCK_MS (a hung or remote owner).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const SEGMENT_FRAMES = 90;
export const STALE_LOCK_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 3;

/** Segments covering frames [from, to): [{ k, a, b }] with b exclusive. */
export function planSegments(from, to, size = SEGMENT_FRAMES) {
  if (!(Number.isInteger(from) && Number.isInteger(to) && to > from && from >= 0)) throw new Error(`bad frame range ${from}:${to}`);
  if (!(Number.isInteger(size) && size > 0)) throw new Error(`bad segment size ${size}`);
  const out = [];
  for (let a = from, k = 0; a < to; a += size, k++) out.push({ k, a, b: Math.min(to, a + size) });
  return out;
}

export function segPaths(jobDir, k) {
  const base = path.join(jobDir, 'seg', `seg-${String(k).padStart(3, '0')}`);
  return {
    dir: path.dirname(base), mp4: `${base}.mp4`, part: `${base}.mp4.part`, done: `${base}.done`,
    lock: `${base}.lock`, attempts: `${base}.attempts`, failed: `${base}.failed`,
  };
}

/** Write JSON atomically (temp file + rename), so a crash never leaves half a record. */
export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 1) + '\n');
  fs.renameSync(tmp, file);
}

export function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

export function sha256File(file) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(1 << 20);
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally { fs.closeSync(fd); }
  return h.digest('hex');
}

// ------------------------------------------------------------------ done --

/** The segment's .done record if it is valid for `key` (MP4 present, size and hash match), else null. */
export function readDone(jobDir, k, key, { verifyHash = true } = {}) {
  const p = segPaths(jobDir, k);
  const d = readJson(p.done);
  if (!d || d.key !== key || d.k !== k) return null;
  try {
    const st = fs.statSync(p.mp4);
    if (st.size !== d.mp4.size) return null;
  } catch { return null; }
  if (verifyHash && sha256File(p.mp4) !== d.mp4.sha256) return null;
  return d;
}

export function writeDone(jobDir, k, record) {
  writeJsonAtomic(segPaths(jobDir, k).done, { schema: 'hm-segment/1', k, ...record });
}

// ----------------------------------------------------------------- locks --

/** Start time of a process (clock ticks since boot, /proc/<pid>/stat field 22), or null if it is gone. */
export function processStart(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] ?? null;   // fields after "(comm)" start at field 3
  } catch { return null; }
}

/** Why a lock is stale, or null if its owner may still be working. */
export function staleReason(lock, { now = Date.now(), mtimeMs = now, host = os.hostname(), staleMs = STALE_LOCK_MS } = {}) {
  // a lock is written right after it is created: unreadable only counts once it has stayed so
  if (!lock) return now - mtimeMs > 5000 ? 'unreadable lock' : null;
  if (lock.host === host) {
    const start = processStart(lock.pid);
    if (start === null) return `owner pid ${lock.pid} is gone`;
    if (lock.pidStart && start !== lock.pidStart) return `owner pid ${lock.pid} was reused by another process`;
  }
  if (now - mtimeMs > staleMs) return `not touched for ${Math.round((now - mtimeMs) / 1000)} s (> ${staleMs / 1000} s)`;
  return null;
}

/**
 * Try to take the lock file `file` for `owner`. Reclaims a stale lock (see
 * staleReason; opts.staleMs overrides the 10-minute silence rule). → { file,
 * info, reclaimed (why the previous lock was stale, or null) }, or null when a
 * live owner holds it.
 */
export function lockFile(file, owner = {}, opts = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const info = { pid: process.pid, pidStart: processStart(process.pid), host: os.hostname(), since: new Date().toISOString(), ...owner };
  let reclaimed = null;
  for (let round = 0; round < 2; round++) {
    try {
      fs.writeFileSync(file, JSON.stringify(info) + '\n', { flag: 'wx' });
      return { file, info, reclaimed };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    let held, mtimeMs;
    try { held = readJson(file); mtimeMs = fs.statSync(file).mtimeMs; } catch { continue; }   // released meanwhile: retry
    const why = staleReason(held, { ...opts, mtimeMs });
    if (!why) return null;
    reclaimed = why;
    // take over: move the stale lock aside first, so of two reclaimers only one can win the create
    const grave = `${file}.stale.${process.pid}`;
    try { fs.renameSync(file, grave); fs.rmSync(grave, { force: true }); } catch { /* another process reclaimed it */ }
  }
  return null;
}

/** Try to take segment k's lock for `owner` ({ worker, job }); see lockFile. */
export function tryLock(jobDir, k, owner = {}, opts = {}) {
  return lockFile(segPaths(jobDir, k).lock, owner, opts);
}

/** Keep a held lock fresh (called after every frame). */
export function touchLock(lock) {
  const t = new Date();
  try { fs.utimesSync(lock.file, t, t); } catch { /* removed under us: the next claim will notice */ }
}

/** Release a lock we hold (only if it is still ours). */
export function releaseLock(lock) {
  const held = readJson(lock.file);
  if (held && held.pid === lock.info.pid && held.since === lock.info.since) fs.rmSync(lock.file, { force: true });
}

// -------------------------------------------------------------- attempts --

/** Record a failed attempt. → { count, failed } (failed once MAX_ATTEMPTS is reached). */
export function recordFailure(jobDir, k, error, { maxAttempts = MAX_ATTEMPTS } = {}) {
  const p = segPaths(jobDir, k);
  const a = readJson(p.attempts) || { count: 0, errors: [] };
  a.count += 1;
  a.errors.push({ at: new Date().toISOString(), pid: process.pid, error: String(error?.message || error).slice(0, 2000) });
  writeJsonAtomic(p.attempts, a);
  const failed = a.count >= maxAttempts;
  if (failed) writeJsonAtomic(p.failed, { k, attempts: a.count, errors: a.errors });
  return { count: a.count, failed };
}

export function isFailed(jobDir, k) { return fs.existsSync(segPaths(jobDir, k).failed); }

/** Forget failures (hm render --resume --retry-failed). */
export function clearFailures(jobDir, k) {
  const p = segPaths(jobDir, k);
  fs.rmSync(p.attempts, { force: true });
  fs.rmSync(p.failed, { force: true });
}

// ---------------------------------------------------------------- status --

/** Per-segment state: done | running | stale | failed | pending (+ attempts, timings). */
export function segmentStatus(jobDir, segments, key, { verifyHash = false } = {}) {
  return segments.map(({ k, a, b }) => {
    const p = segPaths(jobDir, k);
    const attempts = readJson(p.attempts)?.count || 0;
    const done = readDone(jobDir, k, key, { verifyHash });
    if (done) return { k, a, b, state: 'done', attempts, ms: done.ms, subframes: done.subframes };
    if (fs.existsSync(p.failed)) return { k, a, b, state: 'failed', attempts };
    if (fs.existsSync(p.lock)) {
      let held = null, mtimeMs = 0;
      try { held = readJson(p.lock); mtimeMs = fs.statSync(p.lock).mtimeMs; } catch { /* just released */ }
      const stale = held ? staleReason(held, { mtimeMs }) : null;
      return { k, a, b, state: stale ? 'stale' : 'running', attempts, owner: held, stale };
    }
    return { k, a, b, state: 'pending', attempts };
  });
}
