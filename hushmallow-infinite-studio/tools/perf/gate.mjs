// hm bench gate — the G-PIXEL gate of a profile (or of one feature) on the 16 golden times.
//
//   hm bench gate --b final                                  final against the exact goldens
//   hm bench gate --a final --a-features -worldFast --b final  one step: with vs without a feature
//   hm bench gate --steps both                               every feature's step gate, both ways
//
// A and B are each 'golden' (the 16 lossless exact goldens in WORK/golden/v2,
// i.e. the exact profile without re-rendering it), or a profile with optional
// feature overrides, rendered here. For every golden time it reports:
//   - PSNR over RGB of the full frame,
//   - PSNR and SSIM (luma, 11-tap Gaussian) inside the face box, which is carried
//     from art space to the screen through the frame's own deformed mesh
//     (tools/perf/page-probe.js),
//   - the largest per-channel difference and the share of differing pixels,
// and checks the thresholds given (PHASE2-PLAN perf plan: P3 face-box PSNR >= 42 dB,
// P4 >= 50, P5 >= 48, P6 >= 45, P7 >= 50; final vs exact: PSNR >= 45 on all 16,
// face-box SSIM mean >= 0.995 and min >= 0.98).
//
// --steps runs the step gate of every feature (STEP_GATES: the perf plan's
// tolerance, plus the face floor) in one session, in the two ways a feature can
// be switched on its own:
//   off  final without the feature against final (what bisecting a regression does)
//   on   the approved pipeline plus the feature (and the features it builds on)
//        against the approved pipeline plus only those bases (the goldens when
//        it has none)
// A combination that loses a layer (the face, the reflection) fails its gate.
//
// A rendered profile renders the 16 times in one page, in golden order. That is
// valid for every profile with the faceCache feature, whose frames do not depend
// on render history (tests/golden/engine-profiles.test.mjs); a profile without it
// (the exact profile: Face.tmp history, CONVENTIONS §7) is rendered cold, one
// fresh page per frame, like the goldens. Renders hold a shared heavy-lock slot.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORK, GOLDEN_V2, assertWritable } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { decodePNG, encodePNG, flipRows } from '../../render/lib/png.mjs';
import { EngineSession } from '../../render/worker.mjs';
import { FEATURES, resolveProfile, featureLabel, basesOf } from '../../engine/render/profiles.js';
import { psnr, ssim, diffSummary, clampBox, fmtDb } from './metrics.mjs';

export const GATE_DIR = path.join(WORK, 'gate');
const W = 1080, H = 1920;
const P0 = { direction: 'my-brain-at-2am-v2', width: W, height: H, scale: 1, seed: 20261013 };

const manifest = () => JSON.parse(fs.readFileSync(path.join(GOLDEN_V2, 'manifest.json'), 'utf8'));

/**
 * The G-PIXEL tolerance of every feature's own step (PHASE2-PLAN perf plan; the
 * follow-up steps P4b and P5b keep the tolerance of the step they extend). Every
 * feature must have one (tests/unit/perf-tools.test.mjs), so each can be gated alone.
 */
export const STEP_GATES = Object.freeze({
  overlaySkip: Object.freeze({ identical: true }),      // P2: bit-identical
  faceCache: Object.freeze({ facePsnr: 42 }),           // P3: face-box PSNR >= 42 dB (+ owner A/B)
  faceFastGlow: Object.freeze({ facePsnr: 42 }),        // P3b: as P3
  worldFast: Object.freeze({ psnr: 50 }),               // P4
  fgAccum: Object.freeze({ psnr: 48 }),                 // P5
  adaptiveFloor: Object.freeze({ psnr: 45 }),           // P6
  meshNormalTex: Object.freeze({ psnr: 50 }),           // P7
  worldPasses: Object.freeze({ psnr: 50 }),             // P4b: P4's
  tightPasses: Object.freeze({ psnr: 48 }),             // P5b: P5's
});
/** Every step gate also needs the face where it belongs: P3's face-box tolerance, the loosest face gate of the plan. */
export const FACE_FLOOR_DB = 42;

/**
 * The two sides and thresholds of `feature`'s step gate, switched `mode` = 'off'
 * (final without it vs final) or 'on' (exact + its bases vs exact + its bases + it).
 * → { feature, mode, a, aFeatures, b, bFeatures, thresholds }
 */
export function stepGate(feature, mode) {
  if (!Object.hasOwn(STEP_GATES, feature)) throw new Error(`no step gate for feature "${feature}"`);
  const g = STEP_GATES[feature];
  const thresholds = { ...g, facePsnr: Math.max(g.facePsnr ?? FACE_FLOOR_DB, FACE_FLOOR_DB) };
  if (mode === 'off') return { feature, mode, a: 'final', aFeatures: `-${feature}`, b: 'final', bFeatures: null, thresholds };
  if (mode !== 'on') throw new Error(`step mode must be off or on, got ${mode}`);
  const bases = basesOf(feature).reverse().map((f) => `+${f}`);
  return {
    feature, mode,
    a: bases.length ? 'exact' : 'golden', aFeatures: bases.length ? bases.join(',') : null,
    b: 'exact', bFeatures: [...bases, `+${feature}`].join(','), thresholds,
  };
}

/** Golden frames to measure: all 16 (spec null or 'all'), or the listed frame indices ("33,135"). */
export function pickFrames(frames, spec) {
  if (spec == null || spec === 'all') return frames;
  const want = String(spec).split(',').map((x) => Number(x.trim()));
  const missing = want.filter((i) => !frames.some((f) => f.i === i));
  if (missing.length) throw new Error(`--frames: ${missing.join(', ')} not among the golden frame indices (${frames.map((f) => f.i).join(', ')})`);
  return frames.filter((f) => want.includes(f.i));
}

/** A side: 'golden' or { profile, features }. → { label, cold, params } */
function side(name, features) {
  if (name === 'golden') return { label: 'golden (exact)', golden: true };
  const profile = resolveProfile(name, { features });
  return {
    label: `${profile.name}${features ? ` [${features}]` : ''} (${featureLabel(profile)})`,
    params: { ...P0, profile: profile.name, features: features || null },
    // without the face cache, frames depend on render history (Face.tmp): render them cold, like the goldens
    cold: !profile.features.faceCache,
  };
}

const goldenImages = (m, frames) => frames.map((f) => decodePNG(fs.readFileSync(path.join(m.framesDir, f.file))).data);

/** Render the golden indices with one side. → [RGBA top-down Buffer] */
async function renderSide(session, s, frames, log) {
  const sink = session.server.addSink((i, buf) => { got = buf; }, { bytes: W * H * 4 });
  let got = null, page = null;
  const out = [];
  try {
    for (const f of frames) {
      if (!page || s.cold) { await page?.close(); ({ page } = await session.openPage(s.params)); }
      await page.evaluate((i) => window.__engine.render(i), f.i);
      await page.evaluate((u) => window.__engine.readback(u), sink.url(0));
      await page.evaluate(() => window.__engine.flush());
      out.push(flipRows(Buffer.from(got), W, H));
    }
    log(`[gate] rendered ${frames.length} frames: ${s.label}`);
  } finally {
    await page?.close();
    sink.close();
  }
  return out;
}

/** Face boxes (output px) of the golden times, from an exact page (state only, nothing rendered). */
async function faceBoxes(session, frames) {
  const { page } = await session.openPage({ ...P0, profile: 'exact' });
  try {
    await page.evaluate(async () => { window.__perfProbe = await import(`${location.pathname.replace(/engine\/index\.html$/, '')}tools/perf/page-probe.js`); });
    return await page.evaluate((ts) => ts.map((t) => window.__perfProbe.faceBox(t)), frames.map((f) => f.t));
  } finally {
    await page.close();
  }
}

const gateLabel = (a, aF, b, bF) => `${a}${aF ? `[${aF}]` : ''}-vs-${b}${bF ? `[${bF}]` : ''}`.replace(/[^a-z0-9+\-[\]]+/gi, '_');
const toJson = (x) => JSON.stringify(x, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 1);

/**
 * Run the gate. o: { a, aFeatures, b, bFeatures, frames, label, out, savePng, thresholds:
 * { psnr, facePsnr, faceSsimMean, faceSsimMin, identical }, log } → result record
 */
export async function gate(o = {}) {
  const log = o.log || console.log;
  const m = manifest();
  const frames = pickFrames(m.frames, o.frames);
  const A = side(o.a || 'golden', o.aFeatures), B = side(o.b || 'final', o.bFeatures);
  const label = o.label || gateLabel(o.a || 'golden', o.aFeatures, o.b || 'final', o.bFeatures);
  const outDir = assertWritable(o.out || path.join(GATE_DIR, label));
  fs.mkdirSync(outDir, { recursive: true });
  return withHeavyLock({ mode: 'shared', label: `gate ${label}` }, async () => {
    const session = await EngineSession.start({ log: (x) => log(`[gate] ${x}`) });
    let imgA, imgB, boxes;
    try {
      boxes = await faceBoxes(session, frames);
      imgA = A.golden ? goldenImages(m, frames) : await renderSide(session, A, frames, log);
      imgB = B.golden ? goldenImages(m, frames) : await renderSide(session, B, frames, log);
    } finally {
      await session.close();
    }
    return compare({ label, A, B, frames, boxes, imgA, imgB, thresholds: o.thresholds, outDir, savePng: o.savePng });
  });
}

/** Measure B against A on every frame, check the thresholds and write gate.json. → result record */
function compare({ label, A, B, frames, boxes, imgA, imgB, thresholds = {}, outDir, savePng = false }) {
  const t = thresholds;
  fs.mkdirSync(outDir, { recursive: true });
  const rows = frames.map((f, k) => {
    const box = clampBox(boxes[k], W, H);
    const a = imgA[k], b = imgB[k];
    const row = {
      t: f.t, i: f.i, psnr: psnr(a, b, W, H), facePsnr: psnr(a, b, W, H, box), faceSsim: ssim(a, b, W, H, box),
      box, ...diffSummary(a, b),
    };
    if (savePng) {
      for (const [tag, img] of [['a', a], ['b', b]]) {
        const file = path.join(outDir, `${tag}-${f.file}`);
        if ((tag === 'a' && !A.golden) || tag === 'b') fs.writeFileSync(file, encodePNG({ width: W, height: H, data: img }));
      }
    }
    return row;
  });
  const fin = (xs) => xs.filter(Number.isFinite);
  const minOf = (xs) => (fin(xs).length ? Math.min(...fin(xs)) : Infinity);
  const summary = {
    minPsnr: minOf(rows.map((r) => r.psnr)),
    meanPsnr: fin(rows.map((r) => r.psnr)).length ? fin(rows.map((r) => r.psnr)).reduce((s, x) => s + x, 0) / fin(rows.map((r) => r.psnr)).length : Infinity,
    minFacePsnr: minOf(rows.map((r) => r.facePsnr)),
    meanFaceSsim: rows.reduce((s, r) => s + r.faceSsim, 0) / rows.length,
    minFaceSsim: Math.min(...rows.map((r) => r.faceSsim)),
    identical: rows.filter((r) => r.differingPixels === 0).length,
    maxAbs: Math.max(...rows.map((r) => r.maxAbs)),
  };
  const checks = [];
  if (t.psnr != null) checks.push({ name: `PSNR >= ${t.psnr} dB on every frame`, pass: summary.minPsnr >= t.psnr, value: summary.minPsnr });
  if (t.facePsnr != null) checks.push({ name: `face-box PSNR >= ${t.facePsnr} dB on every frame`, pass: summary.minFacePsnr >= t.facePsnr, value: summary.minFacePsnr });
  if (t.faceSsimMean != null) checks.push({ name: `face-box SSIM mean >= ${t.faceSsimMean}`, pass: summary.meanFaceSsim >= t.faceSsimMean, value: summary.meanFaceSsim });
  if (t.faceSsimMin != null) checks.push({ name: `face-box SSIM min >= ${t.faceSsimMin}`, pass: summary.minFaceSsim >= t.faceSsimMin, value: summary.minFaceSsim });
  if (t.identical) checks.push({ name: 'bit-identical on every frame', pass: summary.identical === rows.length, value: `${summary.identical}/${rows.length}` });
  const result = {
    schema: 'hm-gate/1', label, at: new Date().toISOString(), a: A.label, b: B.label, frames: rows.length,
    summary, checks, pass: checks.every((c) => c.pass), rows, outDir,
  };
  fs.writeFileSync(path.join(outDir, 'gate.json'), toJson(result) + '\n');
  return result;
}

/**
 * Run the step gate of every feature (or of the comma list o.only), switched
 * off and/or on (o.steps: 'off' | 'on' | 'both'), in one engine session. Each
 * side is rendered once and kept only while a later step still needs it.
 * → { schema, label, frames, steps: [{ feature, mode, a, b, thresholds, summary, checks, pass }], pass, outDir }
 */
export async function steps(o = {}) {
  const log = o.log || console.log;
  const modes = !o.steps || o.steps === 'both' ? ['off', 'on'] : [o.steps];
  const names = o.only ? String(o.only).split(',').map((x) => x.trim()).filter(Boolean) : Object.keys(FEATURES);
  for (const n of names) if (!Object.hasOwn(FEATURES, n)) throw new Error(`unknown feature "${n}"`);
  const plan = modes.flatMap((mode) => names.map((f) => stepGate(f, mode)));
  const m = manifest();
  const frames = pickFrames(m.frames, o.frames);
  const label = o.label || `steps-${modes.join('+')}`;
  const outDir = assertWritable(o.out || path.join(GATE_DIR, label));
  fs.mkdirSync(outDir, { recursive: true });
  const sides = plan.map((g) => [side(g.a, g.aFeatures), side(g.b, g.bFeatures)]);
  const uses = new Map();
  for (const s of sides.flat()) uses.set(s.label, (uses.get(s.label) || 0) + 1);
  return withHeavyLock({ mode: 'shared', label: `gate ${label}` }, async () => {
    const session = await EngineSession.start({ log: (x) => log(`[gate] ${x}`) });
    const cache = new Map(), results = [];
    const images = async (s) => {
      if (!cache.has(s.label)) cache.set(s.label, s.golden ? goldenImages(m, frames) : await renderSide(session, s, frames, log));
      const img = cache.get(s.label);
      uses.set(s.label, uses.get(s.label) - 1);
      if (uses.get(s.label) === 0) cache.delete(s.label);
      return img;
    };
    try {
      const boxes = await faceBoxes(session, frames);
      for (const [k, g] of plan.entries()) {
        const [A, B] = sides[k];
        const imgA = await images(A), imgB = await images(B);
        const r = compare({ label: `${g.feature}-${g.mode}`, A, B, frames, boxes, imgA, imgB, thresholds: g.thresholds, outDir: path.join(outDir, `${g.feature}-${g.mode}`) });
        const s = r.summary;
        log(`[gate] ${r.pass ? 'PASS' : 'FAIL'} ${g.feature} ${g.mode}: min PSNR ${fmtDb(s.minPsnr)} dB, min face PSNR ${fmtDb(s.minFacePsnr)} dB, face SSIM min ${s.minFaceSsim.toFixed(5)}, identical ${s.identical}/${r.frames}`);
        results.push({ feature: g.feature, mode: g.mode, a: r.a, b: r.b, thresholds: g.thresholds, summary: s, checks: r.checks, pass: r.pass });
      }
    } finally {
      await session.close();
    }
    const out = { schema: 'hm-gate-steps/1', label, at: new Date().toISOString(), frames: frames.map((f) => f.i), steps: results, pass: results.every((r) => r.pass), outDir };
    fs.writeFileSync(path.join(outDir, 'steps.json'), toJson(out) + '\n');
    return out;
  });
}

export function formatGate(r) {
  const s = r.summary, lines = [`gate ${r.label}: A = ${r.a}, B = ${r.b}`];
  lines.push('   t (s)   PSNR    face PSNR  face SSIM   max|Δ|  differing');
  for (const x of r.rows) {
    lines.push(`  ${x.t.toFixed(2).padStart(6)}  ${fmtDb(x.psnr).padStart(6)}  ${fmtDb(x.facePsnr).padStart(9)}  ${x.faceSsim.toFixed(5).padStart(9)}  ${String(x.maxAbs).padStart(7)}  ${(100 * x.differingShare).toFixed(2).padStart(7)} %`);
  }
  lines.push(`  min PSNR ${fmtDb(s.minPsnr)} dB (mean ${fmtDb(s.meanPsnr)}), min face PSNR ${fmtDb(s.minFacePsnr)} dB, face SSIM mean ${s.meanFaceSsim.toFixed(5)} min ${s.minFaceSsim.toFixed(5)}, identical ${s.identical}/${r.frames}, max |Δ| ${s.maxAbs}`);
  for (const c of r.checks) lines.push(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}: ${typeof c.value === 'number' ? (Number.isFinite(c.value) ? +c.value.toFixed(5) : '∞') : c.value}`);
  return lines.join('\n');
}

export function formatSteps(r) {
  const n = r.frames.length;
  const lines = [`gate ${r.label}: every feature's step gate on ${n} golden frames`, '  feature        way   min PSNR  min face PSNR  face SSIM min  identical  gate'];
  for (const x of r.steps) {
    const th = Object.entries(x.thresholds).map(([k, v]) => (k === 'identical' ? 'identical' : `${k} >= ${v}`)).join(', ');
    lines.push(`  ${x.feature.padEnd(14)} ${x.mode.padEnd(4)} ${fmtDb(x.summary.minPsnr).padStart(9)}  ${fmtDb(x.summary.minFacePsnr).padStart(13)}  ${x.summary.minFaceSsim.toFixed(5).padStart(13)}  ${`${x.summary.identical}/${n}`.padStart(9)}  ${x.pass ? 'PASS' : 'FAIL'} (${th})`);
  }
  lines.push(`  ${r.pass ? 'PASS' : 'FAIL'}: ${r.steps.filter((x) => x.pass).length}/${r.steps.length} step gates`);
  return lines.join('\n');
}

export function parseGateArgs(argv) {
  const o = { thresholds: {} };
  const map = { a: 'a', b: 'b', 'a-features': 'aFeatures', 'b-features': 'bFeatures', label: 'label', out: 'out', frames: 'frames', steps: 'steps', only: 'only' };
  const th = { 'min-psnr': 'psnr', 'min-face-psnr': 'facePsnr', 'min-face-ssim-mean': 'faceSsimMean', 'min-face-ssim-min': 'faceSsimMin' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k === 'save-png') { o.savePng = true; continue; }
    if (k === 'identical') { o.thresholds.identical = true; continue; }
    if (!(k in map) && !(k in th)) throw new Error(`unknown option ${argv[i]}`);
    if (i + 1 >= argv.length) throw new Error(`${argv[i]} needs a value`);
    const v = argv[++i];
    if (k in map) o[map[k]] = v;
    else { o.thresholds[th[k]] = Number(v); if (!Number.isFinite(o.thresholds[th[k]])) throw new Error(`${argv[i - 1]} needs a number`); }
  }
  if (o.steps != null) {
    if (!['off', 'on', 'both'].includes(o.steps)) throw new Error(`--steps must be off, on or both, got ${o.steps}`);
    const clash = ['a', 'b', 'aFeatures', 'bFeatures', 'savePng'].filter((x) => o[x] != null);
    if (clash.length || Object.keys(o.thresholds).length) throw new Error('--steps uses each feature\'s own sides and thresholds (STEP_GATES): drop --a, --b, --*-features, thresholds and --save-png');
  } else if (o.only != null) throw new Error('--only needs --steps');
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { confine } = await import('../../render/lib/write-jail.mjs');
  await confine();
  try {
    const o = parseGateArgs(process.argv.slice(2));
    const r = o.steps ? await steps(o) : await gate(o);
    console.log(o.steps ? formatSteps(r) : formatGate(r));
    process.exitCode = r.pass ? 0 : 1;
  } catch (e) {
    console.error(`gate: ${e.stack || e.message}`);
    process.exitCode = 2;
  }
}
