// hm bench — render-time benchmark of a direction under a quality profile.
//
//   node cli/hm.mjs bench [direction] [--profile final] [--features -worldFast] [--runs 3]
//                         [--sample windows|all|a:b|every:N] [--out file.json] [--label text] [--no-passes]
//
// Always under the EXCLUSIVE heavy-job lock (CONVENTIONS §3: benchmark numbers
// count only on an exclusive machine). Each run opens fresh engine pages and
// renders the sample twice:
//   1 timing pass  frames rendered and read back through the binary frame sink
//                  exactly as a render worker does (render + readback critical
//                  path), timed from Node: ms per frame, and the 15 s film
//                  predicted from it (mean ms per frame × frames)
//   2 pass split   the same frames with per-pass meter hooks: a 1×1 readPixels
//                  fence before and after every pass (SwiftShader runs WebGL
//                  asynchronously; gl.finish() does not wait in Chromium), timed
//                  with the page's REAL clock, captured by an init script before
//                  the engine's virtual clock replaces performance.now. The
//                  fences serialise the GPU, so the split adds up to a little
//                  more than the timing pass; "unattributed" is the rest.
// The result is the median of the runs for every number (default 3 runs).
//
// The default sample is 6 windows of 8 consecutive frames spread evenly over
// the film (48 of 450 frames for v2): consecutive frames keep per-frame caches
// (the face) realistic, and the spread covers every act of the story.
// --sample all renders every frame (a full-film timing without the encoder).
//
// The engine itself never reads a clock (determinism guard): every timer here
// lives in this tool and the page script it injects.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORK, assertWritable } from '../render/lib/paths.mjs';
import { withHeavyLock } from '../render/lib/heavy-lock.mjs';
import { EngineSession, engineUrl, outputSize } from '../render/worker.mjs';
import { resolveProfile, featureLabel } from '../engine/render/profiles.js';

export const BENCH_DIR = path.join(WORK, 'bench');

/** Frame indices of a sample spec for a film of `frames` frames. */
export function sampleFrames(spec, frames) {
  if (spec === 'all') return Array.from({ length: frames }, (_, i) => i);
  let m = /^every:(\d+)$/.exec(spec);
  if (m) return Array.from({ length: Math.ceil(frames / Number(m[1])) }, (_, k) => k * Number(m[1]));
  m = /^(\d+):(\d+)$/.exec(spec);
  if (m) { const a = Number(m[1]), b = Math.min(frames, Number(m[2])); return Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k); }
  m = /^windows(?::(\d+)x(\d+))?$/.exec(spec);
  if (m) {
    const n = Number(m[1] || 6), len = Number(m[2] || 8), out = [];
    for (let w = 0; w < n; w++) { const a = Math.round((w * frames) / n); for (let k = 0; k < len && a + k < frames; k++) out.push(a + k); }
    return out;
  }
  throw new Error(`bad --sample ${spec} (windows[:NxL] | all | a:b | every:N)`);
}

const median = (xs) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[(s.length - 1) >> 1] : null; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/** Page-side meter: fence + real clock around every pass. Installed with page.evaluate. */
function installMeter() {
  const st = window.__engine.stage, gl = st.gl, now = window.__hmRealNow;
  const fbo = gl.createFramebuffer(), tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  const px = new Uint8Array(4);
  const fence = () => {
    const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  };
  const acc = { ms: {}, n: {}, open: {} };
  window.__hmMeter = { acc, fence, now };
  st.setMeter({
    begin(name) { fence(); acc.open[name] = now(); },
    end(name) { fence(); acc.ms[name] = (acc.ms[name] || 0) + now() - acc.open[name]; acc.n[name] = (acc.n[name] || 0) + 1; },
  });
}

async function openBenchPage(session, p) {
  const { width, height } = outputSize(p);
  const page = await session.browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error(`[page] ${e.message}`));
  // the real clock, before engine/runtime/clock.js swaps performance.now for virtual time
  await page.addInitScript(() => { window.__hmRealNow = performance.now.bind(performance); });
  await page.goto(session.base + engineUrl(p));
  const info = await page.evaluate(() => window.__engine.ready);
  return { page, info };
}

/** Timing pass: render + readback per frame, timed from Node. → { perFrame: [ms], subframes } */
async function timingPass(session, p, frames) {
  const { page, info } = await openBenchPage(session, p);
  const { width, height } = outputSize(p);
  const sink = session.server.addSink(() => {}, { bytes: width * height * 4 });
  const perFrame = [];
  let subframes = 0;
  try {
    for (const i of frames) {
      const t0 = performance.now();
      const res = await page.evaluate((i) => window.__engine.render(i), i);
      await page.evaluate((u) => window.__engine.readback(u), sink.url(i));
      perFrame.push(performance.now() - t0);
      subframes += res.n;
    }
    await page.evaluate(() => window.__engine.flush());
  } finally {
    sink.close();
    await page.close();
  }
  return { info, perFrame, subframes };
}

/** Pass split: the same frames with fences + the page's real clock around every pass. */
async function passPass(session, p, frames) {
  const { page } = await openBenchPage(session, p);
  try {
    await page.evaluate(installMeter);
    const frameMs = [];
    for (const i of frames) {
      frameMs.push(await page.evaluate((i) => {
        const { fence, now } = window.__hmMeter;
        fence();
        const t0 = now();
        window.__engine.render(i);
        return now() - t0;
      }, i));
    }
    const acc = await page.evaluate(() => ({ ms: window.__hmMeter.acc.ms, n: window.__hmMeter.acc.n }));
    return { frameMs, ...acc };
  } finally {
    await page.close();
  }
}

/**
 * Benchmark a direction. → result record (also written to `out`).
 * o: { direction, profile, features, runs, sample, passes, out, label, log }
 */
export async function bench(o = {}) {
  const direction = o.direction || 'my-brain-at-2am-v2';
  const profile = resolveProfile(o.profile || 'final', { features: o.features || null });
  const runs = o.runs ?? 3, sampleSpec = o.sample || 'windows', log = o.log || console.log;
  const p = { direction, width: 1080, height: 1920, scale: o.scale ?? profile.scale, seed: 20261013, profile: profile.name, features: o.features || null };
  const label = o.label || `${direction}-${profile.name}${o.features ? `-${o.features.replace(/[^a-z0-9+-]+/gi, '')}` : ''}`;
  const out = assertWritable(o.out || path.join(BENCH_DIR, `${label}.json`));
  return withHeavyLock({ mode: 'exclusive', label: `bench ${label}` }, async () => {
    const load0 = os.loadavg();
    const session = await EngineSession.start({ args: o.args, log: (m) => log(`[bench] ${m}`) });
    const perRun = [];
    let info = null, frames = null;
    try {
      for (let r = 0; r < runs; r++) {
        if (!frames) {
          // the film length comes from the direction itself
          const probe = await openBenchPage(session, p);
          info = probe.info;
          await probe.page.close();
          frames = sampleFrames(sampleSpec, info.frames);
        }
        const t = await timingPass(session, p, frames);
        const mean = t.perFrame.reduce((s, x) => s + x, 0) / t.perFrame.length;
        const run = {
          frames: frames.length, subframes: t.subframes, msPerFrame: mean, msPerSubframe: (mean * frames.length) / t.subframes,
          filmSeconds: (mean * info.frames) / 1000,
        };
        if (o.passes !== false) {
          const s = await passPass(session, p, frames);
          const frameTotal = s.frameMs.reduce((a, x) => a + x, 0);
          run.passes = Object.fromEntries(Object.entries(s.ms).map(([k, v]) => [k, v / frames.length]));
          run.counts = Object.fromEntries(Object.entries(s.n).map(([k, v]) => [k, v]));
          run.meteredMsPerFrame = frameTotal / frames.length;
          run.passes.unattributed = run.meteredMsPerFrame - Object.values(s.ms).reduce((a, x) => a + x, 0) / frames.length;
        }
        perRun.push(run);
        log(`[bench] ${label} run ${r + 1}/${runs}: ${mean.toFixed(0)} ms/frame, ${t.subframes} sub-frames, film ${(run.filmSeconds / 60).toFixed(2)} min`);
      }
    } finally {
      await session.close();
    }
    const passNames = [...new Set(perRun.flatMap((r) => Object.keys(r.passes || {})))];
    const result = {
      schema: 'hm-bench/1', label, direction, profile: profile.name, features: featureLabel(profile), overrides: o.features || null,
      at: new Date().toISOString(), machine: { cores: os.cpus().length, loadavg1AtStart: +load0[0].toFixed(2) }, lock: 'exclusive',
      chromium: session.version, chromiumArgs: session.args,
      sample: { spec: sampleSpec, frames: frames.length, of: info.frames, indices: frames }, runs,
      median: {
        msPerFrame: r1(median(perRun.map((r) => r.msPerFrame))),
        msPerSubframe: r1(median(perRun.map((r) => r.msPerSubframe))),
        filmSeconds: r1(median(perRun.map((r) => r.filmSeconds))),
        filmMinutes: +(median(perRun.map((r) => r.filmSeconds)) / 60).toFixed(2),
        subframes: median(perRun.map((r) => r.subframes)),
        ...(o.passes !== false ? {
          meteredMsPerFrame: r1(median(perRun.map((r) => r.meteredMsPerFrame))),
          passes: Object.fromEntries(passNames.map((k) => [k, r1(median(perRun.map((r) => r.passes?.[k] ?? 0)))])),
          counts: Object.fromEntries([...new Set(perRun.flatMap((r) => Object.keys(r.counts || {})))].map((k) => [k, median(perRun.map((r) => r.counts?.[k] ?? 0))])),
        } : {}),
      },
      perRun,
    };
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
    return { ...result, file: out };
  });
}

/** A compact text table of a bench result (passes sorted by cost). */
export function formatBench(r) {
  const m = r.median, lines = [];
  lines.push(`${r.label}: profile ${r.profile} (features ${r.features}), ${r.sample.frames}/${r.sample.of} frames (${r.sample.spec}), median of ${r.runs}, exclusive lock`);
  lines.push(`  ${m.msPerFrame} ms/frame, ${m.msPerSubframe} ms/sub-frame, ${m.subframes} sub-frames in the sample → film ${m.filmSeconds} s (${m.filmMinutes} min)`);
  if (m.passes) {
    lines.push(`  pass split (ms per frame, fenced; metered frame ${m.meteredMsPerFrame} ms):`);
    for (const [k, v] of Object.entries(m.passes).sort((a, b) => b[1] - a[1])) lines.push(`    ${k.padEnd(16)} ${String(v).padStart(8)}${m.counts?.[k] != null ? `   (${m.counts[k]}×)` : ''}`);
  }
  return lines.join('\n');
}

// ------------------------------------------------------------------- CLI --

export function parseBenchArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2);
    if (k === 'no-passes') { o.passes = false; continue; }
    if (!['profile', 'features', 'runs', 'sample', 'out', 'label', 'scale'].includes(k)) throw new Error(`unknown option --${k}`);
    if (i + 1 >= argv.length) throw new Error(`--${k} needs a value`);
    o[k] = argv[++i];
  }
  if (o.runs !== undefined) { o.runs = Number(o.runs); if (!(Number.isInteger(o.runs) && o.runs > 0)) throw new Error('--runs must be a positive integer'); }
  if (o.scale !== undefined) { o.scale = Number(o.scale); if (!(o.scale > 0)) throw new Error('--scale must be > 0'); }
  o.direction = o._[0];
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { confine } = await import('../render/lib/write-jail.mjs');
  await confine();
  try {
    const r = await bench(parseBenchArgs(process.argv.slice(2)));
    console.log(formatBench(r));
    console.log(`written: ${r.file}`);
  } catch (e) {
    console.error(`bench: ${e.stack || e.message}`);
    process.exitCode = 1;
  }
}
