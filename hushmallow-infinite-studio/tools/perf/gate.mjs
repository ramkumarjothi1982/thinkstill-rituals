// hm bench gate — the G-PIXEL gate of a profile (or of one feature) on the 16 golden times.
//
//   hm bench gate --b final                                  final against the exact goldens
//   hm bench gate --a final --a-features -worldFast --b final  one step: with vs without a feature
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
import { resolveProfile, featureLabel } from '../../engine/render/profiles.js';
import { psnr, ssim, diffSummary, clampBox, fmtDb } from './metrics.mjs';

export const GATE_DIR = path.join(WORK, 'gate');
const W = 1080, H = 1920;
const P0 = { direction: 'my-brain-at-2am-v2', width: W, height: H, scale: 1, seed: 20261013 };

const manifest = () => JSON.parse(fs.readFileSync(path.join(GOLDEN_V2, 'manifest.json'), 'utf8'));

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

/**
 * Run the gate. o: { a, aFeatures, b, bFeatures, label, out, savePng, thresholds:
 * { psnr, facePsnr, faceSsimMean, faceSsimMin }, log } → result record
 */
export async function gate(o = {}) {
  const log = o.log || console.log;
  const m = manifest();
  const frames = m.frames;
  const A = side(o.a || 'golden', o.aFeatures), B = side(o.b || 'final', o.bFeatures);
  const label = o.label || `${(o.a || 'golden')}${o.aFeatures ? `[${o.aFeatures}]` : ''}-vs-${o.b || 'final'}${o.bFeatures ? `[${o.bFeatures}]` : ''}`.replace(/[^a-z0-9+\-[\]]+/gi, '_');
  const outDir = assertWritable(o.out || path.join(GATE_DIR, label));
  fs.mkdirSync(outDir, { recursive: true });
  const t = o.thresholds || {};
  return withHeavyLock({ mode: 'shared', label: `gate ${label}` }, async () => {
    const session = await EngineSession.start({ log: (x) => log(`[gate] ${x}`) });
    let imgA, imgB, boxes;
    try {
      boxes = await faceBoxes(session, frames);
      imgA = A.golden ? frames.map((f) => decodePNG(fs.readFileSync(path.join(m.framesDir, f.file))).data) : await renderSide(session, A, frames, log);
      imgB = B.golden ? frames.map((f) => decodePNG(fs.readFileSync(path.join(m.framesDir, f.file))).data) : await renderSide(session, B, frames, log);
    } finally {
      await session.close();
    }
    const rows = frames.map((f, k) => {
      const box = clampBox(boxes[k], W, H);
      const a = imgA[k], b = imgB[k];
      const row = {
        t: f.t, i: f.i, psnr: psnr(a, b, W, H), facePsnr: psnr(a, b, W, H, box), faceSsim: ssim(a, b, W, H, box),
        box, ...diffSummary(a, b),
      };
      if (o.savePng) {
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
    const result = {
      schema: 'hm-gate/1', label, at: new Date().toISOString(), a: A.label, b: B.label, frames: rows.length,
      summary, checks, pass: checks.every((c) => c.pass), rows, outDir,
    };
    const json = JSON.stringify(result, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 1);
    fs.writeFileSync(path.join(outDir, 'gate.json'), json + '\n');
    return result;
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

export function parseGateArgs(argv) {
  const o = { thresholds: {} };
  const map = { a: 'a', b: 'b', 'a-features': 'aFeatures', 'b-features': 'bFeatures', label: 'label', out: 'out' };
  const th = { 'min-psnr': 'psnr', 'min-face-psnr': 'facePsnr', 'min-face-ssim-mean': 'faceSsimMean', 'min-face-ssim-min': 'faceSsimMin' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k === 'save-png') { o.savePng = true; continue; }
    if (!(k in map) && !(k in th)) throw new Error(`unknown option ${argv[i]}`);
    if (i + 1 >= argv.length) throw new Error(`${argv[i]} needs a value`);
    const v = argv[++i];
    if (k in map) o[map[k]] = v;
    else { o.thresholds[th[k]] = Number(v); if (!Number.isFinite(o.thresholds[th[k]])) throw new Error(`${argv[i - 1]} needs a number`); }
  }
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { confine } = await import('../../render/lib/write-jail.mjs');
  await confine();
  try {
    const r = await gate(parseGateArgs(process.argv.slice(2)));
    console.log(formatGate(r));
    process.exitCode = r.pass ? 0 : 1;
  } catch (e) {
    console.error(`gate: ${e.stack || e.message}`);
    process.exitCode = 2;
  }
}
