// Golden capture of the approved v2 ("My Brain at 2 AM" v2), before anything changes.
//
//   node tools/golden/capture-v2.mjs                   full capture (≈ 7 min, exclusive heavy lock)
//   node tools/golden/capture-v2.mjs --skip-pixels     state / cues / plan only (≈ 30 s)
//   options: --out-dir <dir> (default qa/golden/v2)  --frames-dir <dir> (default WORK/golden/v2/frames)
//
// Committed (small) under qa/golden/v2/:
//   state.ndjson.gz    numeric state at all 450 frame centres + every sub-frame time (2,441 rows,
//                      plus the extra 0.98 s landing golden), with the face parameters drawn
//   mesh-hashes.json   sha256 of the soft-body mesh buffer (main + mirrored) per state row
//   subframes.json     subframes(t) per frame
//   cues.json          the cue log;  curves.json  per-frame audio curves (from the dry run)
//   plan-v2.json       buildPlanV2's event list for that cue log
//   frames.sha256      sha256sum of the 16 lossless PNG frames
//   determinism.json   SwiftShader run-to-run / out-of-order / sequential / flags measurements
//   manifest.json      provenance, counts, tolerances, per-frame hashes and PSNR vs the approved MP4
// Not committed (large): the 16 PNG frames in WORK/golden/v2/frames/.
//
// The capture refuses to run unless the frozen v2 and the live app match their hash-locks.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { GOLDEN_V2, WORK_GOLDEN_V2, STUDIO, assertWritable, studioPath } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { checkFrozen, checkAppTree, FROZEN_MANIFEST } from '../../render/lib/frozen.mjs';
import { hashFile, sha256, formatManifest } from '../../render/lib/tree-hash.mjs';
import { encodePNG } from '../../render/lib/png.mjs';
import * as V2 from './v2-harness.mjs';
import { writeNdjsonGz, writeJSON, readJSON, compareDeep } from './compare.mjs';
import { planV2 } from './plan-v2.mjs';
import { diffStats, psnrAgainstVideo, shuffled } from './pixels.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const OUT = assertWritable(opt('out-dir', GOLDEN_V2));
const FRAMES_DIR = assertWritable(opt('frames-dir', path.join(WORK_GOLDEN_V2, 'frames')));
const SKIP_PIXELS = args.includes('--skip-pixels');
const APPROVED_MP4 = studioPath('output', 'v2', 'my-brain-at-2am-v2.mp4');
const APPROVED_CUES = studioPath('output', 'v2', 'cues.json');

const T0 = performance.now();
const log = (...a) => console.log(`[golden ${((performance.now() - T0) / 1000).toFixed(1).padStart(6)} s]`, ...a);
const rel = (f) => path.relative(STUDIO, f);

// ------------------------------------------------------------------ state --
async function captureState() {
  const env = await V2.launch({ args: V2.LEGACY_ARGS });
  try {
    const { page, info } = await V2.openStage(env, { probe: true });
    if (info.frames !== 450 || info.fps !== V2.FPS) throw new Error(`unexpected stage info ${JSON.stringify(info)}`);
    const environment = { chromium: env.browser.version(), webgl: await V2.glInfo(page) };
    const { cues } = await V2.cueLog(page);                    // emitted by setup(), before any frame
    const rows = await V2.sampleAllStates(page, info.frames, { onChunk: (b, n) => { if (b % 150 === 0) log(`states: ${b}/${n} frames`); } });
    const { curves } = await V2.cueLog(page);                  // one per renderFrame: the dry-run curves
    const extraIdx = V2.GOLDEN_TIMES.map(V2.frameIndex).filter((i) => !Number.isInteger(i));
    const extra = await V2.sampleIndices(page, extraIdx);
    return { info, environment, cues, curves, rows, extra };
  } finally {
    await env.close();
  }
}

// ----------------------------------------------------------------- pixels --
/** Render each golden in its own fresh page (no history at all). */
async function runCold(env, order) {
  const out = new Map();
  for (const t of order) {
    const { page } = await V2.openStage(env);
    out.set(t, await V2.renderRaw(page, V2.frameIndex(t)));
    await page.close();
  }
  return out;
}

/** Render the given frame indices one after another in a single page. */
async function runInPage(env, indices) {
  const { page } = await V2.openStage(env);
  const out = [];
  for (const i of indices) out.push([i, await V2.renderRaw(page, i)]);
  await page.close();
  return out;
}

function compareRun(name, desc, pairs, ref) {
  const frames = pairs.map(([t, buf]) => ({ t, ...diffStats(ref.get(t), buf) }));
  const r = { name, desc, frames: frames.length, identical: frames.filter((f) => f.identical).length, maxAbs: Math.max(...frames.map((f) => f.maxAbs)), detail: frames.filter((f) => !f.identical) };
  log(`${name}: ${r.identical}/${r.frames} bit-identical, max |Δ| ${r.maxAbs}/255`);
  return r;
}

async function capturePixels() {
  const times = [...V2.GOLDEN_TIMES];
  const runs = [];
  // A — reference: legacy flags, every frame in a fresh page, ascending
  const envA = await V2.launch({ args: V2.LEGACY_ARGS });
  let ref;
  try {
    ref = await runCold(envA, times);
    log(`reference (cold, ascending): ${ref.size} frames`);
  } finally { await envA.close(); }

  // B, C, D — a second browser process: run-to-run, out of order, and sequential history
  const envB = await V2.launch({ args: V2.LEGACY_ARGS });
  try {
    const b = await runCold(envB, [...times].reverse());
    runs.push(compareRun('cold-repeat', 'second browser process, fresh page per frame, descending order', [...b], ref));
    const order = shuffled(times);
    const c = await runInPage(envB, order.map(V2.frameIndex));
    runs.push(compareRun('warm-shuffled', `one page, seeded shuffle: ${order.join(', ')}`, c.map(([i, buf]) => [i / V2.FPS, buf]), ref));
    const seq = await runInPage(envB, [...Array(19).keys(), 6]);          // 0..18 in order (as render.mjs does), then 6 again
    const inRef = seq.filter(([i]) => ref.has(i / V2.FPS));
    runs.push(compareRun('sequential', 'one page, frames 0–18 consecutively like render/render.mjs, then frame 6 re-rendered', inRef.map(([i, buf]) => [i / V2.FPS, buf]), ref));
  } finally { await envB.close(); }

  // E — what carries the history: wipe the face's scratch canvas between two frames
  const envH = await V2.launch({ args: V2.LEGACY_ARGS });
  try {
    const [prev, target] = [V2.frameIndex(0.6), V2.frameIndex(4.5)];
    const { page } = await V2.openStage(envH);
    await page.evaluate(async () => {
      const { Face } = await import('/hushmallow-infinite-studio/stage2/face.js');
      const draw = Face.prototype.draw;
      Face.prototype.draw = function (p) { window.__face = this; return draw.call(this, p); };   // only remembers the instance
    });
    await V2.renderRaw(page, prev);
    await page.evaluate(() => { const g = window.__face.tmp.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, window.__face.tmp.width, window.__face.tmp.height); });
    const wiped = await V2.renderRaw(page, target);
    await page.close();
    runs.push(compareRun('history-cause', `one page: frame ${prev}, then the face's scratch canvas (Face.tmp) is cleared, then frame ${target} (differs when warm, see warm-shuffled)`, [[target / V2.FPS, wiped]], ref));
  } finally { await envH.close(); }

  // F — explicit SwiftShader opt-ins for R2 (WP-01): 3 cold frames each
  const sample = [0, 3.2, 9.6];
  for (const [name, extra] of Object.entries(V2.FLAG_VARIANTS)) {
    const env = await V2.launch({ args: [...V2.LEGACY_ARGS, ...extra] });
    try {
      const t0 = performance.now();
      const got = await runCold(env, sample);
      const r = compareRun(`flags: ${name}`, `fresh page per frame, legacy flags + ${extra.join(' ')}`, [...got], ref);
      r.flags = extra;
      r.msPerFrameInclSetup = Math.round((performance.now() - t0) / sample.length);
      runs.push(r);
    } finally { await env.close(); }
  }
  return { ref, runs };
}

// ------------------------------------------------------------------- main --
async function main() {
  const frozen = checkFrozen(), app = checkAppTree();
  if (!frozen.ok) throw new Error(`frozen v2 differs from its hash-lock (${frozen.summary}); goldens must come from the approved v2`);
  if (!app.ok) throw new Error(`the live app differs from its hash-lock (${app.summary})`);
  log(`preflight ok: frozen tree ${frozen.treeHash.slice(0, 12)}, app tree ${app.treeHash.slice(0, 12)}`);
  fs.mkdirSync(OUT, { recursive: true });

  // 1. state, cues, curves
  const st = await captureState();
  const centres = st.rows.filter((r) => r.k === 'c');
  const subs = st.rows.filter((r) => r.k !== 'c');
  const perFrame = centres.map((r) => r.n);
  const total = perFrame.reduce((a, b) => a + b, 0);
  if (centres.length !== 450 || subs.length !== total) throw new Error(`state count mismatch: ${centres.length} centres, ${subs.length} sub-frames vs Σn ${total}`);
  for (const t of V2.GOLDEN_TIMES) if (V2.frameIndex(t) / V2.FPS !== t) throw new Error(`frame index for ${t}s does not round-trip`);
  log(`states: ${centres.length} frame centres + ${subs.length} sub-frame times = ${st.rows.length} (+${st.extra.length} for the 0.98 s golden)`);

  const approved = readJSON(APPROVED_CUES);
  const cuesMatch = compareDeep(approved.cues, st.cues).equal;
  const curvesMatch = compareDeep(approved.curves, st.curves).equal;
  log(`cue log ${st.cues.length} cues ${cuesMatch ? '==' : '!='} output/v2/cues.json; curves ${st.curves.length} ${curvesMatch ? '==' : '!='} approved`);
  if (!cuesMatch || !curvesMatch) throw new Error('captured cue log / curves differ from the approved output/v2/cues.json');

  const strip = ({ mesh, meshFlip, ...row }) => row;
  const allRows = [...st.rows, ...st.extra.map((r) => ({ ...r, extra: true }))];
  writeNdjsonGz(path.join(OUT, 'state.ndjson.gz'), allRows.map(strip));
  writeJSON(path.join(OUT, 'mesh-hashes.json'), {
    schema: 'hm-golden-mesh/1',
    layout: 'sha256 of the Float32Array (little-endian) the frozen SoftBody.build() fills: 97×97 vertices × [pos.x, pos.y, u, v, comp, bend]; meshFlip = the mirrored reflection mesh',
    order: 'same rows as state.ndjson.gz: [i, k, mesh, meshFlip]',
    rows: allRows.map((r) => [r.i, r.k, r.mesh, r.meshFlip]),
  }, 0);
  const hist = {};
  for (const n of perFrame) hist[n] = (hist[n] || 0) + 1;
  writeJSON(path.join(OUT, 'subframes.json'), {
    schema: 'hm-golden-subframes/1',
    rule: 'N = video.subframes(t) (3..16); sub-frame k of frame i is sampled at t + ((k + 0.5) / N - 0.5) · shutter / fps with t = i / fps (stage2/stage.js)',
    fps: V2.FPS, shutter: 0.4, total, floorCount: hist[3] || 0, histogram: hist,
    frames: perFrame,
    extra: Object.fromEntries(st.extra.filter((r) => r.k === 'c').map((r) => [String(r.t), r.n])),
  }, 0);
  writeJSON(path.join(OUT, 'cues.json'), { video: V2.VIDEO, title: st.info.title, fps: st.info.fps, duration: st.info.duration, cues: st.cues });
  writeJSON(path.join(OUT, 'curves.json'), { video: V2.VIDEO, fps: st.info.fps, duration: st.info.duration, curves: st.curves }, 0);

  // 2. buildPlanV2's event list, from our capture and from the approved cue log
  const plan = await planV2({ video: V2.VIDEO, title: st.info.title, fps: st.info.fps, duration: st.info.duration, cues: st.cues, curves: st.curves });
  const planApproved = await planV2(approved);
  const planMatch = JSON.stringify(plan) === JSON.stringify(planApproved);
  writeJSON(path.join(OUT, 'plan-v2.json'), plan, 0);
  log(`plan-v2: ${plan.engine.length} engine voices, ${plan.synth.length} synth events, ${plan.ticks.length} ticks; ${planMatch ? '==' : '!='} plan from the approved cue log`);
  if (!planMatch) throw new Error('buildPlanV2 differs between the captured and the approved cue log');

  // 3. pixels
  let pixels = null, frames = [];
  if (!SKIP_PIXELS) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    pixels = await capturePixels();
    const sumLines = {};
    for (const t of V2.GOLDEN_TIMES) {
      const i = V2.frameIndex(t);
      const file = path.join(FRAMES_DIR, V2.goldenName(t));
      const rgba = pixels.ref.get(t);
      fs.writeFileSync(file, encodePNG({ width: V2.W, height: V2.H, data: rgba }));
      const png = hashFile(file);
      sumLines[V2.goldenName(t)] = png;
      const n = Number.isInteger(i) ? st.rows.find((r) => r.i === i && r.k === 'c').n : st.extra.find((r) => r.k === 'c').n;
      const psnr = Number.isInteger(i) ? psnrAgainstVideo(file, APPROVED_MP4, i) : null;
      frames.push({ t, i, subframes: n, file: V2.goldenName(t), png, rgba: sha256(rgba), psnrVsApprovedMp4: psnr });
    }
    fs.writeFileSync(path.join(OUT, 'frames.sha256'), formatManifest(sumLines));
    const ps = frames.filter((f) => f.psnrVsApprovedMp4).map((f) => f.psnrVsApprovedMp4.y);
    log(`frames written to ${FRAMES_DIR}; PSNR-Y vs approved MP4: min ${Math.min(...ps).toFixed(2)} dB, mean ${(ps.reduce((a, b) => a + b, 0) / ps.length).toFixed(2)} dB`);
    const run = (name) => pixels.runs.find((r) => r.name === name);
    const repeat = run('cold-repeat'), shuffled = run('warm-shuffled'), seq = run('sequential'), cause = run('history-cause');
    const runToRun = repeat.identical === repeat.frames;
    if (!runToRun && repeat.maxAbs > 1) throw new Error(`SwiftShader run-to-run differences of ${repeat.maxAbs}/255 exceed the 1/255 golden tolerance`);
    writeJSON(path.join(OUT, 'determinism.json'), {
      schema: 'hm-golden-determinism/1',
      reference: 'cold: legacy flags, one fresh page per frame, ascending order (the goldens)',
      runs: pixels.runs,
      findings: {
        runToRun: runToRun ? 'bit-identical across browser processes (SwiftShader is deterministic)' : `differs run to run by up to ${repeat.maxAbs}/255`,
        renderOrder: shuffled.identical === shuffled.frames
          ? 'bit-identical in any render order'
          : `HISTORY-DEPENDENT: ${shuffled.frames - shuffled.identical}/${shuffled.frames} frames differ (max ${shuffled.maxAbs}/255) when another frame was rendered before in the same page; ${seq.identical}/${seq.frames} sequential-start frames match`,
        cause: cause.identical === cause.frames
          ? "the face's scratch canvas (stage2/face.js Face.tmp): tube glows clear only their own bw×bh corner, and a blurred drawImage with a fractional offset reads stale texels from earlier, larger strokes just past it; clearing Face.tmp between frames restores the cold result exactly"
          : 'not isolated (wiping Face.tmp did not restore the cold frame)',
        flags: Object.fromEntries(pixels.runs.filter((r) => r.flags).map((r) => [r.flags.join(' '), `${r.identical}/${r.frames} bit-identical, max ${r.maxAbs}/255, ${r.msPerFrameInclSetup} ms/frame incl. page setup`])),
      },
      pixelTolerance: runToRun ? 0 : repeat.maxAbs,
    });
  }

  // 4. manifest
  const files = {};
  for (const f of ['state.ndjson.gz', 'mesh-hashes.json', 'subframes.json', 'cues.json', 'curves.json', 'plan-v2.json', 'frames.sha256', 'determinism.json', 'sequential-frames.json']) {
    if (fs.existsSync(path.join(OUT, f))) files[f] = hashFile(path.join(OUT, f));
  }
  const prev = fs.existsSync(path.join(OUT, 'manifest.json')) ? readJSON(path.join(OUT, 'manifest.json')) : null;
  const det = fs.existsSync(path.join(OUT, 'determinism.json')) ? readJSON(path.join(OUT, 'determinism.json')) : null;
  writeJSON(path.join(OUT, 'manifest.json'), {
    schema: 'hm-golden-v2/1',
    video: V2.VIDEO, title: st.info.title, fps: st.info.fps, duration: st.info.duration, seed: Number(V2.SEED),
    source: {
      frozenTree: frozen.treeHash, frozenManifest: rel(FROZEN_MANIFEST), appTree: app.treeHash,
      gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: STUDIO, encoding: 'utf8' }).trim(),
      approvedMp4: { file: rel(APPROVED_MP4), sha256: hashFile(APPROVED_MP4) },
    },
    environment: {
      ...st.environment, playwright: '1.56.1', node: process.version,
      ffmpeg: execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0],
      flags: V2.LEGACY_ARGS, viewport: `${V2.W}x${V2.H}@1`, url: `stage2/index.html?video=${V2.VIDEO}&seed=${V2.SEED}`,
    },
    counts: { frames: centres.length, centreStates: centres.length, subframeStates: subs.length, states: st.rows.length, extraStates: st.extra.length, cues: st.cues.length },
    tolerance: {
      state: 1e-9, stateRule: '|a − b| ≤ 1e-9 · max(1, |a|, |b|); mesh hashes, sub-frame counts, cue log and curves exact',
      pixel: det ? det.pixelTolerance : (prev?.tolerance?.pixel ?? null),
      pixelRule: 'max per-channel |Δ| on 0..255 RGBA of a cold render (fresh page per frame); 0 = bit-identical',
    },
    approvedMatch: { cues: cuesMatch, curves: curvesMatch, plan: planMatch },
    framesDir: FRAMES_DIR,
    frames: frames.length ? frames : (prev?.frames ?? []),
    sequential: prev?.sequential,                       // written by tools/golden/sequential-v2.mjs
    files,
  });
  log(`wrote ${rel(OUT)}/{${Object.keys(files).join(', ')}, manifest.json}`);
}

await withHeavyLock({ mode: 'exclusive', label: 'golden capture v2' }, main);
