// Render farm: turns a direction into a finished, verified MP4 through
// resumable 90-frame segments rendered by worker processes.
//
//   import { render } from './render/farm.mjs';
//   await render({ direction: 'my-brain-at-2am-v2', workers: 2 });        (CLI: hm render)
//
// Pipeline for one job (a job directory holds all of its state):
//   preflight   the frozen v2 and the live app match their hash-locks; disk space
//   compiled    a dry run in an engine page: cues.json with the cue log and the
//               per-frame audio curves (R12: the only source of curves), the
//               direction's meta (runtime and score are chosen from it, R3), the
//               sub-frame count per frame, the job key and the segment plan
//   segments    N worker processes (render/worker.mjs) claim and render segments
//   encoded     segments joined with concat -c copy into video.mp4, then checked:
//               ffprobe frame count = frames, zero decode errors, an IDR every 30
//               frames (so at every segment start)
//   scored      the score named by meta.score, rendered from cues.json
//   muxed       final.mp4: video + AAC 48 kHz, faststart, provenance stamp;
//               provenance.json next to it
// The plan's later states (drafted and final-queued with WP-02's profiles; QA and
// review with WP-05) slot into JOB_STATES without changing this flow.
//
// Resume: rerun with --resume (or the same arguments, which give the same job
// key and directory). Segments with a valid .done are kept; a segment that was
// mid-way when the job died is rendered again, so a kill loses at most the
// segments that were in progress (one per worker).

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STUDIO, assertWritable, studioRel } from './lib/paths.mjs';
import { checkFrozen, checkAppTree } from './lib/frozen.mjs';
import { treeHash, gitInfo, playwrightVersion, machineInfo, directionSource, jobKey, assetReport, stamp } from './lib/provenance.mjs';
import { ENCODERS, GOP, VF_FROM_GL, x264Args, concatSegments, probeVideo, decodeErrors, idrFrames, psnrVideos, ffmpegInfo, transcode } from './encode.mjs';
import { planSegments, segPaths, readDone, readJson, writeJsonAtomic, segmentStatus, clearFailures, recordFailure, lockFile, releaseLock, staleReason, SEGMENT_FRAMES, sha256File } from './segment.mjs';
import { EngineSession, ENGINE_ARGS, FRAME_TIMEOUT_MS, withTimeout } from './worker.mjs';
import { scoreJob, muxJob } from './mux.mjs';
import { withHeavyLock } from './lib/heavy-lock.mjs';
import { PROFILES, DEFAULT_PROFILE, resolveProfile } from '../engine/render/profiles.js';

const WORKER = fileURLToPath(new URL('./worker.mjs', import.meta.url));

/** Job states in pipeline order (PHASE2-PLAN operations). WP-01 drives the ones marked in the header. */
export const JOB_STATES = Object.freeze(['created', 'compiled', 'drafted', 'final-queued', 'segments', 'encoded', 'scored', 'muxed', 'qa', 'review']);
export const RUNS_DIR = path.join(STUDIO, 'runs');
export const DISK_WARN_GB = 5, DISK_REFUSE_GB = 3;

/**
 * Full-length pixel goldens: for these directions, a full render at the default
 * parameters must reproduce every frame hash of the in-order reference render
 * (qa/golden/v2/sequential-frames.json, whose re-encode is the approved master).
 */
export const SEQUENTIAL_GOLDENS = Object.freeze({
  'my-brain-at-2am-v2': { file: 'qa/golden/v2/sequential-frames.json', params: { width: 1080, height: 1920, scale: 1, seed: 20261013, mark: null, textKeys: 'content', profile: 'exact', features: null } },
  // the same film composed from specs/golden/t01-v2.json (WP-03) must reproduce the same frames
  'composer/t01-v2': { file: 'qa/golden/v2/sequential-frames.json', params: { width: 1080, height: 1920, scale: 1, seed: 20261013, mark: null, textKeys: 'content', profile: 'exact', features: null } },
});

export const DEFAULTS = Object.freeze({
  width: 1080, height: 1920, scale: 1, seed: 20261013,
  segmentFrames: SEGMENT_FRAMES, encoder: 'qp15', preroll: 1, mark: null, textKeys: 'content',
  profile: DEFAULT_PROFILE, features: null,
});

// ------------------------------------------------------------------ jobs --

export const jobFile = (jobDir) => path.join(jobDir, 'job.json');
export const farmLockFile = (jobDir) => path.join(jobDir, 'farm.lock');
export const readJob = (jobDir) => readJson(jobFile(jobDir));
export const writeJob = (jobDir, job) => writeJsonAtomic(jobFile(jobDir), job);

function setState(jobDir, job, state, extra = {}) {
  if (!JOB_STATES.includes(state) && state !== 'failed') throw new Error(`unknown job state ${state}`);
  job.state = state;
  job.history = [...(job.history || []), { state, at: new Date().toISOString(), ...extra }];
  writeJob(jobDir, job);
}

/** The registry entry and source hash of a direction (engine/directions.js, imported in Node). */
export async function resolveDirection(id) {
  const { DIRECTIONS } = await import(pathToFileURL(path.join(STUDIO, 'engine', 'directions.js')).href);
  const entry = Object.hasOwn(DIRECTIONS, id) ? DIRECTIONS[id] : null;
  if (!entry) throw new Error(`unknown direction "${id}" (registered: ${Object.keys(DIRECTIONS).filter((k) => !DIRECTIONS[k].dev).join(', ')})`);
  const src = directionSource(entry);
  return { id, entry, src, sha256: sha256File(src) };
}

/** Free space of the filesystem holding `dir`, against the plan's disk guard. */
export function diskCheck(dir) {
  let d = path.resolve(dir);
  while (!fs.existsSync(d)) d = path.dirname(d);
  const st = fs.statfsSync(d);
  const freeGB = (st.bavail * st.bsize) / 2 ** 30;
  return { freeGB: +freeGB.toFixed(1), level: freeGB < DISK_REFUSE_GB ? 'refuse' : freeGB < DISK_WARN_GB ? 'warn' : 'ok' };
}

/** Refuse to render when the approved v2 or the live app has changed (they are hash-locked). */
export function preflight() {
  const frozen = checkFrozen();
  if (!frozen.ok) throw new Error(`the frozen v2 changed: ${frozen.summary}`);
  const app = checkAppTree();
  if (app.changed.length || app.missing.length || app.added.length) throw new Error(`the live app changed (render refused): ${app.summary}`);
  return { frozenTree: frozen.treeHash, appTree: app.treeHash };
}

/** The job's key: everything that decides segment bytes (render/lib/provenance.mjs). */
export function computeKey({ params, direction, appTree, session }) {
  const keyParams = {
    width: params.width, height: params.height, scale: params.scale, seed: params.seed,
    frames: params.frames, segmentFrames: params.segmentFrames, encoder: params.encoder,
    preroll: params.preroll, mark: params.mark, textKeys: params.textKeys,
    profile: params.profile, features: params.features,
  };
  return jobKey({
    direction: direction.id, directionSha256: direction.sha256, engineTree: treeHash('engine').sha256, appTree, params: keyParams,
    // a compiled composer direction (JSON, runtime v3) is evaluated by composer/ code (and the planner's typography)
    runtimeTrees: direction.src.endsWith('.json') ? { composer: treeHash('composer').sha256, planner: treeHash('planner').sha256 } : undefined,
    encoderArgs: { encoder: ENCODERS[params.encoder], gop: GOP, vf: VF_FROM_GL, args: x264Args(params.encoder) },
    chromium: session.version, chromiumArgs: session.args,
  });
}

/** Parse "a:b" (frames) into [a, b]. */
export function parseRange(s) {
  if (s == null) return null;
  const m = /^(\d+):(\d+)$/.exec(String(s));
  if (!m || Number(m[2]) <= Number(m[1])) throw new Error(`--frames wants a:b with b > a, got ${s}`);
  return [Number(m[1]), Number(m[2])];
}

// --------------------------------------------------------------- compile --

/** Dry run in an engine page: cue log, curves, meta, sub-frames. Writes cues.json and job.info. */
export async function compile({ jobDir, job, session, log }) {
  const { page, info } = await withTimeout(session.openPage(job.params), 120_000, 'dry-run page setup');
  try {
    const dry = await withTimeout(page.evaluate((n) => window.__engine.dryRun(n), info.frames), 600_000, 'dry run');
    for (const e of dry.errors) log(`dry run: ${e.kind}: ${e.message}`);
    const range = job.params.frames || [0, info.frames];
    if (range[1] > info.frames) throw new Error(`--frames ${range.join(':')} is beyond the direction's ${info.frames} frames`);
    // the score's input, in the shape render/render.mjs wrote: the dry run is its only source (R12)
    writeJsonAtomic(path.join(jobDir, 'cues.json'), { video: info.id, title: info.title, fps: info.fps, duration: info.duration, cues: dry.cues, curves: dry.curves });
    job.info = info;
    job.frames = range;
    job.subframes = dry.subframes;
    job.segments = planSegments(range[0], range[1], job.params.segmentFrames);
    job.dryRunErrors = dry.errors;
    job.webgl = await page.evaluate(() => window.__engine.glInfo());
    setState(jobDir, job, 'compiled', { frames: range, segments: job.segments.length, subframes: dry.subframes.slice(range[0], range[1]).reduce((s, n) => s + n, 0) });
    log(`compiled: ${info.title} (runtime ${info.runtime}, score ${info.score ?? 'none'}), frames ${range[0]}-${range[1] - 1}, ${job.segments.length} segment(s), ${dry.cues.length} cues, ${dry.curves.length} curve samples`);
  } finally {
    await page.close().catch(() => {});
  }
}

// -------------------------------------------------------------- segments --

/**
 * Run worker processes until every segment of every job is done or failed.
 * Each worker gets all jobs and renders them in order with one browser (a fresh
 * page per video, R4). A worker that dies is replaced; the segment it held gets
 * a failed attempt (render/segment.mjs).
 * jobs: [{ jobDir, job }]. → { [jobDir]: segment status }
 */
export async function runSegments(jobs, { workers = 1, frameTimeoutMs = FRAME_TIMEOUT_MS, tee = null, log = console.log, maxRespawns = 3 } = {}) {
  const statusAll = () => Object.fromEntries(jobs.map(({ jobDir, job }) => [jobDir, segmentStatus(jobDir, job.segments, job.key)]));
  const pendingCount = () => Object.values(statusAll()).flat().filter((s) => s.state !== 'done' && s.state !== 'failed').length;
  if (!pendingCount()) return statusAll();
  const W = Math.max(1, Math.min(workers, pendingCount()));
  const logDir = path.join(jobs[0].jobDir, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  let respawns = 0;
  const startOne = (w) => new Promise((resolve) => {
    const args = [WORKER, ...jobs.flatMap(({ jobDir }) => ['--job', jobDir]), '--worker', String(w), '--workers', String(W), '--frame-timeout', String(frameTimeoutMs / 1000)];
    if (tee && W === 1 && jobs.length === 1) args.push('--tee', tee);
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: process.env });
    const logFile = fs.createWriteStream(path.join(logDir, `worker-${w}.log`), { flags: 'a' });
    const relay = (stream) => {
      let rest = '';
      stream.on('data', (d) => {
        const lines = (rest + d).split('\n');
        rest = lines.pop();
        for (const l of lines) { logFile.write(`${l}\n`); log(l); }
      });
    };
    relay(child.stdout);
    relay(child.stderr);
    child.on('exit', (code, sig) => {
      logFile.end();
      resolve({ w, pid: child.pid, code: code ?? sig });
    });
  });
  const running = new Map();
  const launch = (w) => running.set(w, startOne(w));
  for (let w = 0; w < W; w++) launch(w);
  while (running.size) {
    const r = await Promise.race(running.values());
    running.delete(r.w);
    if (r.code === 0) continue;
    // the worker died: count an attempt for any segment it still held, then replace it
    for (const { jobDir, job } of jobs) {
      for (const s of segmentStatus(jobDir, job.segments, job.key)) {
        if (s.owner?.pid !== r.pid) continue;
        const f = recordFailure(jobDir, s.k, `worker ${r.w} (pid ${r.pid}) exited ${r.code}`);
        log(`${job.id} segment ${s.k}: worker died (exit ${r.code}); attempt ${f.count}${f.failed ? ', marked FAILED' : ''}`);
        fs.rmSync(segPaths(jobDir, s.k).lock, { force: true });
      }
    }
    if (pendingCount() && respawns < maxRespawns) { respawns++; log(`restarting worker ${r.w} (${respawns}/${maxRespawns})`); launch(r.w); }
  }
  return statusAll();
}

// ---------------------------------------------------------------- finish --

/** Join the segments into video.mp4 and prove the join is clean. → verification record */
export function encodeVideo(jobDir, job, { log = console.log } = {}) {
  const files = job.segments.map((s) => segPaths(jobDir, s.k).mp4);
  const out = path.join(jobDir, 'video.mp4');
  concatSegments(files, `${out}.part.mp4`);
  fs.renameSync(`${out}.part.mp4`, out);
  const expected = job.frames[1] - job.frames[0];
  const probe = probeVideo(out);
  const errors = decodeErrors(out);
  const idr = idrFrames(out);
  // each segment is its own closed-GOP stream: an IDR at its start and every GOP frames after it
  // (with 90-frame segments that is exactly every 30 frames of the video)
  const wantIdr = job.segments.flatMap((s) => Array.from({ length: Math.ceil((s.b - s.a) / GOP) }, (_, i) => s.a - job.frames[0] + i * GOP));
  const segStarts = job.segments.map((s) => s.a - job.frames[0]);
  const v = {
    frames: probe.frames, expectedFrames: expected, decodeErrors: errors.length, decodeErrorLines: errors.slice(0, 10),
    idrFrames: idr, idrAsPlanned: JSON.stringify(idr) === JSON.stringify(wantIdr), segmentStartsAreIdr: segStarts.every((a) => idr.includes(a)),
    codec: probe.codec, profile: probe.profile, pixFmt: probe.pixFmt, size: `${probe.width}x${probe.height}`, fps: probe.fps, color: probe.color,
    duration: probe.duration, bytes: fs.statSync(out).size,
  };
  v.ok = v.frames === expected && v.decodeErrors === 0 && v.idrAsPlanned && v.segmentStartsAreIdr;
  log(`encoded: ${v.frames}/${expected} frames, ${v.decodeErrors} decode errors, IDR at ${idr.length} GOP starts (segment starts ${v.segmentStartsAreIdr ? 'all IDR' : 'NOT all IDR'})`);
  if (!v.ok) throw new Error(`video.mp4 failed verification: ${JSON.stringify(v)}`);
  return v;
}

/**
 * Compare a job's frame hashes with its direction's sequential golden, when one
 * exists and the job renders at the golden's parameters. → null when not applicable.
 */
export function sequentialGoldenCheck(job, hashes) {
  const g = SEQUENTIAL_GOLDENS[job.direction];
  if (!g || Object.entries(g.params).some(([k, v]) => (job.params[k] ?? null) !== v)) return null;
  const file = path.join(STUDIO, g.file);
  if (!fs.existsSync(file)) return null;
  const ref = readJson(file).hashes;
  const [a, b] = job.frames;
  const mismatched = [];
  for (let i = a; i < b; i++) if (hashes[i - a] !== ref[i]) mismatched.push(i);
  return { golden: g.file, frames: b - a, identical: b - a - mismatched.length, mismatched: mismatched.slice(0, 50) };
}

/** Everything known about how this job was made (render/lib/provenance.mjs). */
export function buildProvenance(jobDir, job, { session = null, extra = {} } = {}) {
  const dones = job.segments.map((s) => readDone(jobDir, s.k, job.key, { verifyHash: false }));
  const assets = assetReport(dones.map((d) => d?.served), dones.map((d) => d?.assets));
  const readback = dones.flatMap((d) => (d?.timing?.readbackMedianMs != null ? [d.timing.readbackMedianMs] : []));
  const ff = ffmpegInfo();
  return {
    schema: 'hm-provenance/1',
    job: { id: job.id, direction: job.direction, key: job.key, keyParts: job.keyParts, params: job.params, frames: job.frames, info: job.info },
    git: gitInfo(),
    trees: { engine: treeHash('engine'), frozen: job.preflight?.frozenTree, app: job.preflight?.appTree },
    tools: {
      node: process.version, playwright: playwrightVersion(), chromium: job.keyParts?.chromium ?? session?.version ?? null,
      chromiumArgs: job.keyParts?.chromiumArgs ?? [...ENGINE_ARGS], webgl: job.webgl ?? null, ffmpeg: ff.version, libx264: ff.libx264,
    },
    machine: machineInfo(),
    encoder: { name: job.params.encoder, ...ENCODERS[job.params.encoder], args: x264Args(job.params.encoder, { fps: job.info.fps }) },
    segments: dones.map((d, i) => (d ? { k: d.k, frames: [d.a, d.b], ms: d.ms, subframes: d.subframes, worker: d.worker, freshPage: d.freshPage, primed: d.primed, timing: d.timing, mp4: d.mp4, errors: d.errors } : { k: i, missing: true })),
    frameHashes: dones.flatMap((d) => d?.hashes ?? []),
    readbackMedianMs: readback.length ? +(readback.reduce((s, x) => s + x, 0) / readback.length).toFixed(1) : null,
    runtimeErrors: [...(job.dryRunErrors || []).map((e) => ({ phase: 'dry run', ...e })), ...dones.flatMap((d) => (d?.errors || []).map((e) => ({ phase: `segment ${d.k}`, ...e })))],
    assets,
    ...extra,
  };
}

// ---------------------------------------------------------------- render --

/**
 * Job parameters from per-job options. The profile (engine/render/profiles.js)
 * supplies the defaults it owns (render scale, encoder, corner mark); explicit
 * options win; DEFAULTS fill the rest.
 */
export function jobParams(o) {
  const params = { ...DEFAULTS };
  const name = o.profile ?? DEFAULT_PROFILE;
  const profile = resolveProfile(name, { features: o.features ?? null });   // throws on an unknown profile or feature
  if (profile.encoder === null) throw new Error(`profile ${name} renders stills, not a video (use hm proof)`);
  Object.assign(params, { profile: name, scale: profile.scale, encoder: profile.encoder, mark: profile.mark });
  for (const k of Object.keys(DEFAULTS)) if (o[k] !== undefined && o[k] !== null) params[k] = o[k];
  params.direction = o.direction;
  params.frames = o.frames || null;
  if (!ENCODERS[params.encoder]) throw new Error(`unknown encoder ${params.encoder}`);
  return params;
}

/** Whether a job writes preview.mp4: asked for explicitly, or its profile has one. */
export const wantsPreview = (params, asked) => asked ?? !!PROFILES[params.profile]?.preview;

/**
 * Create or reopen one job and compile it. → { jobDir, job, upToDate }
 */
export async function prepareJob(o, { session, pre, resume = false, retryFailed = false, force = false, log, locks = [] }) {
  const params = jobParams(o);
  if (!ENCODERS[params.encoder].segmentSafe) log(`warning: encoder ${params.encoder} is not segment-invariant; joined segments will differ from a single pass`);
  const direction = await resolveDirection(params.direction);
  const { key, parts } = computeKey({ params, direction, appTree: pre.appTree, session });
  const jobDir = assertWritable(o.out ? path.resolve(o.out) : path.join(RUNS_DIR, 'adhoc', `${params.direction.replace(/[^a-z0-9.-]+/gi, '-')}-${key.slice(0, 12)}`));
  // one farm per job: the lock lives as long as this process (no silence timeout: the farm may wait for hours)
  const farmLock = lockFile(farmLockFile(jobDir), { role: 'farm' }, { staleMs: Infinity });
  if (!farmLock) throw new Error(`${studioRel(jobDir) ?? jobDir} is being rendered by another farm (pid ${readJson(farmLockFile(jobDir))?.pid})`);
  locks.push(farmLock);
  if (farmLock.reclaimed) log(`took over the farm lock of a dead farm (${farmLock.reclaimed})`);
  const disk = diskCheck(jobDir);
  if (disk.level === 'refuse') throw new Error(`only ${disk.freeGB} GB free at ${jobDir}: below the ${DISK_REFUSE_GB} GB floor, no new jobs`);
  if (disk.level === 'warn') log(`warning: only ${disk.freeGB} GB free (warn below ${DISK_WARN_GB} GB)`);
  let job = readJob(jobDir);
  if (job) {
    if (job.key !== key) throw new Error(`${studioRel(jobDir) ?? jobDir} holds another job (key ${job.key.slice(0, 12)}, now ${key.slice(0, 12)}: engine, assets, parameters or Chromium changed); use a new --out`);
    if (job.state === 'muxed' && !force) { log(`up to date: ${path.join(jobDir, 'final.mp4')}`); return { jobDir, job, upToDate: true }; }
    if (!resume) throw new Error(`${studioRel(jobDir) ?? jobDir} has an unfinished job (state ${job.state}); pass --resume to continue it`);
    log(`resuming ${job.id} (state ${job.state})`);
  } else {
    fs.mkdirSync(jobDir, { recursive: true });
    job = { schema: 'hm-job/1', id: path.basename(jobDir), direction: params.direction, params, key, keyParts: parts, preflight: pre, state: null, history: [] };
    setState(jobDir, job, 'created', { key });
  }
  if (!job.info || !fs.existsSync(path.join(jobDir, 'cues.json'))) await compile({ jobDir, job, session, log });
  // resume hygiene: drop .done records whose MP4 no longer verifies; optionally forget failures
  for (const s of job.segments) {
    const p = segPaths(jobDir, s.k);
    if (fs.existsSync(p.done) && !readDone(jobDir, s.k, job.key)) { log(`segment ${s.k}: .done does not verify, rendering it again`); fs.rmSync(p.done, { force: true }); }
    if (retryFailed) clearFailures(jobDir, s.k);
  }
  const reused = segmentStatus(jobDir, job.segments, job.key).filter((s) => s.state === 'done').map((s) => s.k);
  if (reused.length) log(`${job.id}: reusing ${reused.length} finished segment(s): ${reused.join(', ')}`);
  setState(jobDir, job, 'segments', { reused });
  return { jobDir, job, upToDate: false };
}

/** Join, verify, score and mux a job whose segments are all done. */
export async function finishJob(jobDir, job, { audio: wantAudio = true, preview = false, keepSegments = false, tee = null, log = console.log } = {}) {
  const verify = encodeVideo(jobDir, job, { log });
  if (tee && fs.existsSync(tee)) {
    // JSON has no Infinity: identical streams are recorded as "Infinity" (dB)
    const q = psnrVideos(tee, path.join(jobDir, 'video.mp4'));
    for (const k of ['y', 'u', 'v', 'average']) if (!Number.isFinite(q[k])) q[k] = String(q[k]);
    verify.singlePass = q;
    log(`segmented vs single pass: PSNR ${verify.singlePass.average} dB, ${verify.singlePass.identical}/${verify.singlePass.frames} frames identical`);
  }
  job.verify = verify;
  setState(jobDir, job, 'encoded');
  const fullRange = job.frames[0] === 0 && job.frames[1] === job.info.frames;
  const audio = !!(wantAudio && fullRange && job.info.score);
  if (audio) {
    await scoreJob(jobDir, job, { log });
    setState(jobDir, job, 'scored');
  } else {
    log(`no score: ${!wantAudio ? '--no-audio' : !fullRange ? 'partial frame range' : 'the direction declares no meta.score'}`);
  }
  const prov = buildProvenance(jobDir, job);
  verify.sequentialGolden = sequentialGoldenCheck(job, prov.frameHashes);
  const sg = verify.sequentialGolden;
  if (sg) {
    log(`frame hashes vs ${sg.golden}: ${sg.identical}/${sg.frames} identical`);
    // at the golden's parameters the engine must reproduce the approved frames exactly (G-PIXEL)
    if (sg.identical !== sg.frames) {
      writeJsonAtomic(path.join(jobDir, 'provenance.json'), { ...prov, verify });
      setState(jobDir, job, 'failed', { sequentialGolden: sg });
      throw new Error(`G-PIXEL: ${sg.frames - sg.identical} frame(s) differ from ${sg.golden} (first: ${sg.mismatched.slice(0, 5).join(', ')})`);
    }
  }
  if (prov.assets.conflicts.length) throw new Error(`assets changed during the job: ${JSON.stringify(prov.assets.conflicts)}`);
  await muxJob(jobDir, job, { audio, stamp: stamp({ job, git: prov.git }), log });
  // the preview runs after every render worker has finished: 4 x264 threads (still a fixed count)
  if (preview) transcode(path.join(jobDir, 'final.mp4'), path.join(jobDir, 'preview.mp4'), { encoder: 'crf20', fps: job.info.fps, threads: 4 });
  writeJsonAtomic(path.join(jobDir, 'provenance.json'), { ...prov, verify, final: { file: 'final.mp4', sha256: sha256File(path.join(jobDir, 'final.mp4')) } });
  if (!keepSegments) for (const s of job.segments) fs.rmSync(segPaths(jobDir, s.k).mp4, { force: true });
  setState(jobDir, job, 'muxed', { final: 'final.mp4' });
  log(`done: ${path.join(jobDir, 'final.mp4')}`);
}

/**
 * Render several directions with one set of workers (a batch). jobsOpts: per-job
 * options { direction, out, frames, width, height, scale, seed, encoder, preroll,
 * mark, segmentFrames }. common: { workers, resume, retryFailed, force, audio,
 * preview, keepSegments, frameTimeoutMs, teeSinglePass, log }.
 * → [{ jobDir, job, status }]
 */
export async function renderMany(jobsOpts, common = {}) {
  const log = common.log || ((m) => console.log(`[farm] ${m}`));
  const pre = preflight();
  const locks = [];
  try {
    return await renderLocked(jobsOpts, common, { pre, locks, log });
  } finally {
    for (const l of locks) releaseLock(l);
  }
}

async function renderLocked(jobsOpts, common, { pre, locks, log }) {
  const ids = jobsOpts.map((o) => o.direction ?? path.basename(o.out ?? '')).join(',');
  // compile (dry runs) and finishing hold one shared heavy slot; the workers take their own, so
  // the farm holds none while they run (no nested request, no deadlock)
  const prepared = await withHeavyLock({ mode: 'shared', label: `compile ${ids}` }, async () => {
    const session = await EngineSession.start({ log });
    try {
      const out = [];
      for (const o of jobsOpts) out.push(await prepareJob(o, { session, pre, resume: common.resume, retryFailed: common.retryFailed, force: common.force, log, locks }));
      return out;
    } finally {
      await session.close();               // the workers start their own browsers
    }
  });
  const todo = prepared.filter((p) => !p.upToDate);
  const tee = common.teeSinglePass && todo.length === 1 ? path.join(todo[0].jobDir, 'single-pass.mp4') : null;
  const status = todo.length ? await runSegments(todo, { workers: common.workers || 1, frameTimeoutMs: common.frameTimeoutMs, tee, log }) : {};
  const failures = [];
  for (const { jobDir, job } of todo) {
    const bad = status[jobDir].filter((s) => s.state !== 'done');
    if (bad.length) {
      setState(jobDir, job, 'failed', { segments: bad.map((s) => ({ k: s.k, state: s.state })) });
      failures.push(`${job.id}: segments not done: ${bad.map((s) => `${s.k} (${s.state})`).join(', ')}`);
      continue;
    }
    await withHeavyLock({ mode: 'shared', label: `finish ${job.id}` },
      () => finishJob(jobDir, job, { audio: common.audio !== false, preview: wantsPreview(job.params, common.preview), keepSegments: common.keepSegments, tee, log }));
  }
  if (failures.length) throw new Error(`${failures.join('; ')}; see the logs/ of each job`);
  return prepared.map((p) => ({ ...p, status: status[p.jobDir] ?? segmentStatus(p.jobDir, p.job.segments, p.job.key) }));
}

/**
 * Render one direction end to end (see renderMany for the options; per-job and
 * common options may be mixed here). → { jobDir, job, status }
 */
export async function render(opts) {
  return (await renderMany([opts], opts))[0];
}

// ---------------------------------------------------------------- status --

const pickTiming = (d) => (d ? { ms: d.ms, subframes: d.subframes } : {});

/** Summary of a job for hm status: state, segments, ETA. */
export function jobStatus(jobDir) {
  const job = readJob(jobDir);
  if (!job) return null;
  // after the join the segment MP4s are deleted: a muxed job's segments are all done by definition
  const segs = !job.segments ? [] : job.state === 'muxed'
    ? job.segments.map((s) => ({ ...s, state: 'done', ...pickTiming(readJson(segPaths(jobDir, s.k).done)) }))
    : segmentStatus(jobDir, job.segments, job.key);
  const count = (st) => segs.filter((s) => s.state === st).length;
  const done = segs.filter((s) => s.state === 'done');
  // ETA: measured ms per sub-frame of finished segments × the sub-frames still to render
  const perSub = done.length ? done.reduce((s, x) => s + (x.ms || 0), 0) / Math.max(1, done.reduce((s, x) => s + (x.subframes || 0), 0)) : null;
  const left = segs.filter((s) => s.state !== 'done' && s.state !== 'failed')
    .reduce((s, x) => s + (job.subframes ? job.subframes.slice(x.a, x.b).reduce((a, n) => a + n, 0) : (x.b - x.a) * 4.4), 0);
  const running = count('running');
  let farm = null;
  try {
    const held = readJson(farmLockFile(jobDir));
    if (held && !staleReason(held, { mtimeMs: fs.statSync(farmLockFile(jobDir)).mtimeMs, staleMs: Infinity })) farm = { pid: held.pid, since: held.since };
  } catch { /* no farm on this job */ }
  return {
    jobDir, id: job.id, direction: job.direction, state: job.state, key: job.key?.slice(0, 12), farm,
    segments: { total: segs.length, done: count('done'), running, pending: count('pending'), stale: count('stale'), failed: count('failed') },
    etaSeconds: perSub != null && left ? Math.round((left * perSub) / 1000 / Math.max(1, running || 1)) : null,
    final: fs.existsSync(path.join(jobDir, 'final.mp4')) ? path.join(jobDir, 'final.mp4') : null,
    updated: job.history?.at(-1)?.at ?? null,
    detail: segs,
  };
}

/** Job directories (holding job.json) under `root`, newest first. */
export function findJobs(root = RUNS_DIR, depth = 3) {
  const out = [];
  const walk = (d, n) => {
    if (n < 0 || !fs.existsSync(d)) return;
    if (fs.existsSync(path.join(d, 'job.json'))) { out.push(d); return; }
    for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) walk(path.join(d, e.name), n - 1);
  };
  walk(root, depth);
  return out.sort((a, b) => fs.statSync(jobFile(b)).mtimeMs - fs.statSync(jobFile(a)).mtimeMs);
}

