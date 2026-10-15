// Render worker: one headless Chromium that renders a job's segments.
//
//   node render/worker.mjs --job <dir> [--job <dir> …] [--worker k] [--workers n] [--frame-timeout s] [--tee file]
//   (started by render/farm.mjs, one process per worker; confined to the write
//   jail and holding one shared slot of the heavy-job lock)
//
// Per segment the worker
//   1. claims it (render/segment.mjs lock: O_EXCL, stale locks reclaimed),
//   2. renders it in a FRESH page (a new JS realm and WebGL context for every
//      video, R4), primed so the first frame equals the in-order render, or
//      continues in the page that just rendered the previous segment,
//   3. reads every frame back as raw bytes through the local frame sink (binary
//      POST instead of ~404 ms of base64; the upload overlaps the next frame's
//      render, so the render waits only for readPixels and one copy), hashes it
//      (sha256 of the top-down RGBA, the same hash as the goldens) and pipes it
//      into the segment's own x264 encoder (render/encode.mjs; lossless for the
//      master pass the farm runs once every segment is done),
//   4. writes .done with the frame hashes once the MP4 is complete.
// A frame that takes longer than the watchdog limit (60 s) aborts the attempt;
// the browser is restarted, and the segment is retried up to twice before it
// is marked failed (render/segment.mjs). Curves never come from here (R12):
// the farm's dry run is their only source.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { STUDIO } from './lib/paths.mjs';
import { startServer, REPO_ROOT } from './serve.mjs';
import { rawEncodeArgs, spawnEncoder } from './encode.mjs';
import {
  segPaths, tryLock, touchLock, releaseLock, readDone, writeDone, isFailed, recordFailure, readJson, sha256File,
} from './segment.mjs';

/**
 * Chromium flags. The first four are the approved render's (render/render.mjs);
 * the last two opt in to software WebGL explicitly (R2: the automatic SwiftShader
 * fallback is deprecated). WP-00 measured this pair bit-identical to the legacy
 * flags at the same speed; '--use-angle=swiftshader' changes pixels and is 3.7x
 * slower (qa/golden/v2/determinism.json), so it is never used.
 */
export const ENGINE_ARGS = Object.freeze([
  '--disable-gpu-vsync', '--disable-frame-rate-limit', '--force-color-profile=srgb', '--font-render-hinting=none',
  '--use-angle=vulkan', '--enable-unsafe-swiftshader',
]);

/** A frame (render + readback) that takes longer than this aborts the segment attempt. */
export const FRAME_TIMEOUT_MS = 60_000;

/** URL path of the studio under the static server (works in any git worktree). */
export const STUDIO_URL = `/${path.relative(REPO_ROOT, STUDIO).split(path.sep).join('/')}`;

export class WatchdogError extends Error {
  constructor(what, ms) { super(`watchdog: ${what} took longer than ${(ms / 1000).toFixed(0)} s`); this.name = 'WatchdogError'; }
}

/** Reject with a WatchdogError if `promise` does not settle within `ms`. */
export function withTimeout(promise, ms, what) {
  let timer;
  const p = Promise.resolve(promise);
  p.catch(() => {});                 // a late rejection after the watchdog fired is expected, not unhandled
  return Promise.race([
    p,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new WatchdogError(what, ms)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

/** Output size of a job's render (design size × scale, rounded). */
export const outputSize = (p) => ({ width: Math.round(p.width * p.scale), height: Math.round(p.height * p.scale) });

/** The engine page URL for a job's parameters. */
export function engineUrl(p) {
  const q = new URLSearchParams({ direction: p.direction, w: String(p.width), h: String(p.height), scale: String(p.scale), seed: String(p.seed) });
  if (p.mark) q.set('mark', p.mark);
  if (p.textKeys && p.textKeys !== 'content') q.set('textKeys', p.textKeys);
  if (p.profile && p.profile !== 'exact') q.set('profile', p.profile);
  if (p.features) q.set('features', p.features);
  return `${STUDIO_URL}/engine/index.html?${q}`;
}

/** sha256 of an RGBA frame with bottom-up rows, as if the rows were top-down (no copy). */
export function topDownSha256(buf, width, height) {
  const h = crypto.createHash('sha256'), row = width * 4;
  for (let y = height - 1; y >= 0; y--) h.update(buf.subarray(y * row, (y + 1) * row));
  return h.digest('hex');
}

/**
 * A static server + headless Chromium with the engine flags. Every file the
 * pages fetch is hashed (served()), for the job's asset log.
 */
export class EngineSession {
  static async start({ args = ENGINE_ARGS, log = () => {} } = {}) {
    const s = new EngineSession();
    s.log = log;
    s.args = [...args];
    s.files = new Map();
    s.server = await startServer(0, {
      onServe: ({ url, bytes }) => {
        if (!s.files.has(url)) s.files.set(url, { url, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
      },
    });
    s.base = `http://127.0.0.1:${s.server.address().port}`;
    const { chromium } = await import('playwright');
    s.browser = await chromium.launch({ args: s.args });
    s.version = s.browser.version();
    return s;
  }

  /** Every file delivered to the pages so far: [{ url, sha256, bytes }]. */
  served() { return [...this.files.values()].sort((a, b) => a.url.localeCompare(b.url)); }

  /** A fresh engine page for job parameters `p`, set up and ready. → { page, info } */
  async openPage(p) {
    const { width, height } = outputSize(p);
    const page = await this.browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.on('console', (m) => { if (m.type() === 'error') this.log(`[page] ${m.text()}`); });
    page.on('pageerror', (e) => this.log(`[page] error ${e.message}`));
    try {
      await page.goto(this.base + engineUrl(p));
      const info = await page.evaluate(() => window.__engine.ready);
      return { page, info };
    } catch (e) {
      await page.close().catch(() => {});
      throw e;
    }
  }

  async close() {
    try { await withTimeout(this.browser.close(), 30_000, 'browser close'); } catch { /* the process dies with us anyway */ }
    this.server.close();
  }
}

const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/**
 * Render one segment of a job and write its .done record.
 * cont: { page, next } carries the page across consecutive segments of one worker.
 * tee: optional { write(buf, i) } that also receives every frame (acceptance check).
 */
export async function renderSegment({ session, job, jobDir, seg, lock, cont, log = () => {}, frameTimeoutMs = FRAME_TIMEOUT_MS, tee = null, worker = 0 }) {
  const { k, a, b } = seg;
  const p = job.params, { width, height } = outputSize(p), fps = job.info.fps;
  const files = segPaths(jobDir, k);
  const t0 = performance.now();
  let page = cont.page, primed = null;
  if (!page || cont.next !== a) {
    if (page) await page.close().catch(() => {});
    cont.page = null;
    page = (await withTimeout(session.openPage(p), Math.max(frameTimeoutMs, 60_000), 'page setup')).page;
    primed = await withTimeout(page.evaluate(([a, n]) => window.__engine.prime(a, n), [a, p.preroll]),
      frameTimeoutMs * Math.max(1, p.preroll), `prime before frame ${a}`);
    for (const e of primed.errors) log(`${job.id} prime: ${e.kind}: ${e.message}`);
  }
  cont.page = page;
  cont.next = -1;                                   // until this segment completes, the page is mid-way

  fs.mkdirSync(files.dir, { recursive: true });
  fs.rmSync(files.part, { force: true });
  const enc = spawnEncoder(rawEncodeArgs({ width, height, fps, out: files.part, encoder: p.encoder }));
  const frameBytes = width * height * 4;
  const hashes = new Array(b - a);
  const hashing = [];
  const sentAt = new Array(b - a), deliveryMs = [];
  let expected = a;
  const sink = session.server.addSink(async (i, buf) => {
    if (i !== expected) throw new Error(`frame ${i} arrived, expected ${expected}`);
    expected++;
    deliveryMs.push(performance.now() - sentAt[i - a]);
    enc.stdin.write(buf);
    tee?.write(buf, i);
    // hash after the response is sent, while the page renders the next frame
    hashing.push(new Promise((resolve) => setImmediate(() => { hashes[i - a] = topDownSha256(buf, width, height); resolve(); })));
    // back-pressure only when the encoder falls behind by more than a few frames
    if (enc.stdin.writableLength > 3 * frameBytes) await once(enc.stdin, 'drain');
  }, { bytes: frameBytes });

  const renderMs = [], readbackMs = [], errors = [];
  let subframes = 0;
  try {
    for (let i = a; i < b; i++) {
      const f = await withTimeout((async () => {
        const s0 = performance.now();
        const res = await page.evaluate((i) => window.__engine.render(i), i);
        const s1 = performance.now();
        sentAt[i - a] = s1;
        await page.evaluate((u) => window.__engine.readback(u), sink.url(i));
        return { res, render: s1 - s0, readback: performance.now() - s1 };
      })(), frameTimeoutMs, `frame ${i}`);
      renderMs.push(f.render);
      readbackMs.push(f.readback);
      subframes += f.res.n;
      for (const e of f.res.errors) { errors.push({ frame: i, ...e }); log(`${job.id} frame ${i}: ${e.kind}: ${e.message}`); }
      touchLock(lock);
      if ((i - a) % 30 === 0 || i === b - 1) log(`${job.id} segment ${k}: frame ${i} (${(i - a + 1)}/${b - a}), ${f.render.toFixed(0)} ms render + ${f.readback.toFixed(0)} ms readback`);
    }
    await withTimeout(page.evaluate(() => window.__engine.flush()), frameTimeoutMs, `upload of frame ${b - 1}`);
    if (expected !== b) throw new Error(`sink received frames up to ${expected - 1}, expected ${b - 1}`);
    await Promise.all(hashing);
    enc.stdin.end();
    await withTimeout(enc.done, 300_000, `encoder of segment ${k}`);
    fs.renameSync(files.part, files.mp4);
  } catch (e) {
    enc.kill();
    fs.rmSync(files.part, { force: true });
    throw e;
  } finally {
    sink.close();
  }
  const assets = await withTimeout(page.evaluate(() => window.__engine.assets()), frameTimeoutMs, 'asset log');
  const ms = performance.now() - t0;
  writeDone(jobDir, k, {
    key: job.key, a, b, frames: b - a, hashes,
    mp4: { file: path.basename(files.mp4), size: fs.statSync(files.mp4).size, sha256: sha256File(files.mp4) },
    ms: Math.round(ms), subframes, worker, pid: process.pid, chromium: session.version,
    freshPage: !!primed, primed: primed ? { a: primed.a, replayed: primed.replayed } : null,
    timing: {
      // readback: what the render waits for (readPixels + copy, plus the previous upload if it
      // were still running); delivery: from readback() until the sink holds the frame
      renderMedianMs: r1(median(renderMs)), readbackMedianMs: r1(median(readbackMs)),
      readbackP95Ms: r1(pct(readbackMs, 0.95)), readbackMaxMs: r1(Math.max(...readbackMs)),
      deliveryMedianMs: r1(median(deliveryMs)), deliveryP95Ms: r1(pct(deliveryMs, 0.95)),
      perSubframeMs: r1(renderMs.reduce((s, x) => s + x, 0) / Math.max(1, subframes)),
    },
    errors, served: session.served(), assets,
  });
  cont.next = b;
  log(`${job.id} segment ${k} done: frames ${a}-${b - 1} in ${(ms / 1000).toFixed(1)} s, readback median ${median(readbackMs).toFixed(1)} ms (delivery ${median(deliveryMs).toFixed(1)} ms)`);
}

/** Claim the next segment: the one after `prev` if possible (keeps the page warm), else the first free one from `start`. */
export function claimNext(jobDir, job, prev, start, owner) {
  const segs = job.segments;
  const from = prev === null ? start : prev + 1;
  const order = [...segs.slice(from), ...segs.slice(0, from)];
  for (const seg of order) {
    if (isFailed(jobDir, seg.k) || readDone(jobDir, seg.k, job.key, { verifyHash: false })) continue;
    const lock = tryLock(jobDir, seg.k, owner);
    if (!lock) continue;
    if (isFailed(jobDir, seg.k) || readDone(jobDir, seg.k, job.key, { verifyHash: false })) { releaseLock(lock); continue; }
    return { seg, lock };
  }
  return null;
}

/**
 * A single-pass encoder fed with every frame in order (acceptance check of the segmented
 * encode): with a master encoder, the master's own single pass over the raw frames (the
 * master pass over the lossless segments must reproduce it bit for bit); otherwise the
 * segment encoder with IDRs where the segments have them.
 */
function makeTee(file, job, log) {
  const p = job.params, { width, height } = outputSize(p);
  const enc = spawnEncoder(rawEncodeArgs(p.master
    ? { width, height, fps: job.info.fps, out: file, encoder: p.master }
    : { width, height, fps: job.info.fps, out: file, encoder: p.encoder, keyframeEvery: p.segmentFrames }));
  let next = job.segments[0].a, broken = false;
  return {
    write(buf, i) {
      if (broken) return;
      if (i !== next) { broken = true; enc.kill(); log(`tee: frame ${i} out of order (expected ${next}); single-pass reference abandoned`); return; }
      next++;
      enc.stdin.write(buf);
    },
    async end() {
      if (broken) { fs.rmSync(file, { force: true }); return false; }
      enc.stdin.end();
      await enc.done;
      return next === job.segments.at(-1).b;
    },
  };
}

/**
 * Render segments until none is left for this worker. jobDirs: the jobs, in
 * order; one browser serves them all and every video gets fresh pages (R4).
 */
export async function runWorker({ jobDirs, worker = 0, workers = 1, log = console.log, frameTimeoutMs = FRAME_TIMEOUT_MS, tee: teeFile = null }) {
  let session = null, rendered = 0;
  try {
    for (const jobDir of jobDirs) {
      const job = readJson(path.join(jobDir, 'job.json'));
      if (!job?.key || !job.segments) throw new Error(`${jobDir}: not a compiled job (run the farm)`);
      const start = Math.floor((worker * job.segments.length) / workers);
      const tee = teeFile && jobDirs.length === 1 ? makeTee(teeFile, job, log) : null;
      let cont = { page: null, next: -1 }, prev = null;
      for (;;) {
        const claim = claimNext(jobDir, job, prev, start, { worker, job: job.id });
        if (!claim) break;
        const { seg, lock } = claim;
        if (lock.reclaimed) log(`${job.id} segment ${seg.k}: took over a stale lock (${lock.reclaimed})`);
        try {
          session ??= await EngineSession.start({ log });
          await renderSegment({ session, job, jobDir, seg, lock, cont, log, frameTimeoutMs, tee, worker });
          prev = seg.k;
          rendered++;
        } catch (e) {
          const f = recordFailure(jobDir, seg.k, e);
          log(`${job.id} segment ${seg.k}: attempt ${f.count} failed: ${e.message}${f.failed ? ' -> marked FAILED' : ' -> will be retried'}`);
          // a failed attempt can leave a hung page or a broken browser: start clean
          await session?.close();
          session = null;
          cont = { page: null, next: -1 };
          prev = null;
        } finally {
          releaseLock(lock);
        }
      }
      // the next video starts in a fresh page
      await cont.page?.close().catch(() => {});
      if (tee) log(`tee: single-pass reference ${(await tee.end()) ? 'complete' : 'incomplete'}`);
    }
  } finally {
    await session?.close();
  }
  return { rendered };
}

// ------------------------------------------------------------------- CLI --

async function cli(argv) {
  const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  const jobDirs = argv.flatMap((a, i) => (a === '--job' ? [path.resolve(argv[i + 1])] : []));
  if (!jobDirs.length) { console.error('usage: node render/worker.mjs --job <dir> [--job <dir> …] [--worker k] [--workers n] [--frame-timeout s] [--tee file]'); return 2; }
  const worker = Number(opt('worker', 0)), workers = Number(opt('workers', 1));
  const frameTimeoutMs = Number(opt('frame-timeout', FRAME_TIMEOUT_MS / 1000)) * 1000;
  const log = (m) => console.log(`[worker ${worker}] ${m}`);
  // started by the farm with an IPC channel: if the farm dies (even kill -9), stop too
  if (process.send) {
    process.channel?.unref();                       // the channel alone must not keep a finished worker alive
    process.on('disconnect', () => { log('farm went away; stopping'); process.exit(130); });
  }
  const { withHeavyLock } = await import('./lib/heavy-lock.mjs');
  const ids = jobDirs.map((d) => readJson(path.join(d, 'job.json'))?.id ?? path.basename(d));
  const res = await withHeavyLock({ mode: 'shared', label: `render ${ids.join(',')} w${worker}` },
    () => runWorker({ jobDirs, worker, workers, log, frameTimeoutMs, tee: opt('tee', null) }));
  log(`finished: ${res.rendered} segment(s) rendered`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { confine } = await import('./lib/write-jail.mjs');
  await confine();
  cli(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.error(`[worker] ${e.stack || e.message}`); process.exitCode = 1; });
}
