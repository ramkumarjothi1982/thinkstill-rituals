// Segment bookkeeping for the render farm: the plan (90-frame segments), and
// the files that make rendering resumable and safe for parallel workers.
//
// Per segment k, in <job>/seg/:
//   seg-00k.mp4          the encoded segment (written as .mp4.part, renamed on success)
//   seg-00k.done         JSON: frame range, sha256 of every frame's RGBA (top-down),
//                        the MP4's size and sha256, the job key, timings
//   seg-00k.lock         JSON: who renders it now { pid, pidStart, host, worker, since }.
//                        Created with O_EXCL; the owner touches it after every frame.
//   seg-00k.lock.reclaim the short critical section in which a lock may be removed
//                        (a stale lock reclaimed, or a lock released): see lockFile
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
/** A reclaim section is held for microseconds; one silent for this long belongs to a process that died inside it. */
export const RECLAIM_STALE_MS = 10 * 1000;

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

const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** What a lock file is right now: its inode and exact text (null when it does not exist). */
function lockIdentity(file) {
  try {
    const st = fs.statSync(file);
    return { ino: st.ino, mtimeMs: st.mtimeMs, text: fs.readFileSync(file, 'utf8') };
  } catch { return null; }
}
const sameIdentity = (a, b) => !!a && !!b && a.ino === b.ino && a.text === b.text;
const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };

/**
 * Run fn() inside `${file}.reclaim`, the only place where `file` may be removed. The section
 * is entered with O_EXCL, so at most one process is inside it. A section left behind by a
 * process that died inside it (owner gone, or silent for RECLAIM_STALE_MS) is cleared: moved
 * aside, checked to be the one judged dead, and restored otherwise.
 * → fn()'s result, or null when another process holds the section
 */
export function withReclaim(file, fn) {
  const m = `${file}.reclaim`;
  const me = JSON.stringify({ pid: process.pid, pidStart: processStart(process.pid), host: os.hostname(), since: new Date().toISOString(), nonce: crypto.randomBytes(6).toString('hex') });
  for (let round = 0; round < 3; round++) {
    try {
      fs.writeFileSync(m, me, { flag: 'wx' });
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const cur = lockIdentity(m);
      if (!cur) continue;                                        // just released: try again
      if (!staleReason(parse(cur.text), { mtimeMs: cur.mtimeMs, staleMs: RECLAIM_STALE_MS })) return null;
      const grave = `${m}.dead.${process.pid}.${crypto.randomBytes(4).toString('hex')}`;
      try { fs.renameSync(m, grave); } catch { continue; }
      if (!sameIdentity(lockIdentity(grave), cur)) { try { fs.linkSync(grave, m); } catch { /* a new section exists: it stays */ } }
      fs.rmSync(grave, { force: true });
      continue;
    }
    try {
      return fn();
    } finally {
      // leave only our own section (nobody clears a live holder's: it is never stale while we run)
      try { if (fs.readFileSync(m, 'utf8') === me) fs.rmSync(m, { force: true }); } catch { /* already gone */ }
    }
  }
  return null;
}

/**
 * Try to take the lock file `file` for `owner`. Reclaims a stale lock (see
 * staleReason; opts.staleMs overrides the 10-minute silence rule). → { file,
 * info, reclaimed (why the previous lock was stale, or null) }, or null when a
 * live owner holds it.
 *
 * The reclaim is atomic (FU-5): a lock judged stale is removed only inside the
 * reclaim section, and only if the file is still exactly the lock that was judged
 * (same inode, same text). WP-01's version moved whatever was at the path aside, so
 * a reclaimer that had judged a dead owner's lock could remove the fresh lock another
 * reclaimer had just created, and both went on to render the segment. Now of any
 * number of reclaimers exactly one ends up holding the lock (the O_EXCL create after
 * the removal decides), and a live lock is never removed.
 * opts.beforeReclaim(held): test hook, called between judging and reclaiming.
 */
export function lockFile(file, owner = {}, opts = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const info = { pid: process.pid, pidStart: processStart(process.pid), host: os.hostname(), since: new Date().toISOString(), ...owner };
  let reclaimed = null;
  for (let round = 0; round < 4; round++) {
    try {
      fs.writeFileSync(file, JSON.stringify(info) + '\n', { flag: 'wx' });
      return { file, info, reclaimed };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    const seen = lockIdentity(file);
    if (!seen) continue;                                           // released meanwhile: retry
    const held = parse(seen.text);
    const why = staleReason(held, { ...opts, mtimeMs: seen.mtimeMs });
    if (!why) return null;
    opts.beforeReclaim?.(held);
    const removed = withReclaim(file, () => {
      if (!sameIdentity(lockIdentity(file), seen)) return false;   // released or taken over since it was judged: judge again
      fs.rmSync(file, { force: true });
      return true;
    });
    if (removed === null) return null;                             // another process is reclaiming it now
    if (removed) reclaimed = why;
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

/** Release a lock we hold (only if it is still ours), inside the reclaim section, so a reclaimer never sees half of it. */
export function releaseLock(lock) {
  for (let i = 0; i < 100; i++) {
    const r = withReclaim(lock.file, () => {
      const held = readJson(lock.file);
      if (held && held.pid === lock.info.pid && held.since === lock.info.since) fs.rmSync(lock.file, { force: true });
      return true;
    });
    if (r !== null) return;
    sleepMs(2);                                                    // a reclaim section is open: it lasts microseconds
  }
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
