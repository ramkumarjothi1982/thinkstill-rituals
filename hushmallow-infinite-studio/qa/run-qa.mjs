// QA suite v1 (WP-05): every gate from G-SPEC to G-DUPES on one rendered
// video, written as qa/report.json.
//
//   node qa/run-qa.mjs <target> [options]           (CLI: hm qa <target>)
//   import { runQa } from './qa/run-qa.mjs';         → report
//
// One target (see qa/gates/context.mjs for what a target can be):
//   1. the plan/compile gates on what was rendered: G-SPEC, G-DIR, G-COST
//      (qa/gates/spec-gates.mjs); G-DIR/G-COST never run on a spec G-SPEC refused
//   2. the direction's per-frame geometry (qa/gates/geometry.mjs) and the brand
//      probes (qa/gates/probes.mjs: the engine's LogoCard and corner marks)
//   3. in parallel: one decode of the video through every pixel gate
//      (qa/gates/pixels.py), the audio gate (qa/gates/audio.py), and the
//      determinism re-render (qa/gates/determinism.mjs, final stage only)
//   4. the gates that combine them: delivery, fidelity (+ magnification log),
//      brand marks, allowlist, G-AUDIO (+ recipes), G-DUPES
//   5. the report: every gate as { pass, warn, status, checks, metrics,
//      artefacts }, the verdict (pass | fail | incomplete), the signature,
//      timings and provenance. It satisfies the QA contract of docs/SPEC.md
//      (video.sha256, spec.fingerprint, gates with boolean pass), which
//      planner/export.mjs enforces before an export.
//
// Stages: 'final' (default) judges a finished video with every gate; 'draft'
// judges draft frames: the plan/compile gates, G-DRAFT and the brand mark.
// QA holds a shared slot of the heavy-job lock for the whole target.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STUDIO, studioPath, studioRel, assertWritable } from '../render/lib/paths.mjs';
import { expandTarget, loadContext } from './gates/context.mjs';
import { gate, notRunGate, reportVerdict } from './gates/verdict.mjs';

export const REPORT_SCHEMA = 'hm-qa/1';
export const THRESHOLDS_FILE = studioPath('qa', 'gates', 'thresholds.json');
const GATES_DIR = studioPath('qa', 'gates');

/** The report's gate order, and the stage each gate belongs to. */
export const GATE_ORDER = Object.freeze([
  ['G-SPEC', 'both'], ['G-DIR', 'both'], ['G-COST', 'both'],
  ['G-DRAFT:safezone', 'both'], ['G-DRAFT:readability', 'both'], ['G-DRAFT:layout', 'both'],
  ['G-FINAL:delivery', 'final'], ['G-FINAL:determinism', 'final'], ['G-FINAL:flash', 'final'], ['G-FINAL:seam', 'final'],
  ['G-FINAL:fidelity', 'final'], ['G-FINAL:figure-ground', 'final'], ['G-FINAL:realm-likeness', 'final'], ['G-FINAL:logo', 'final'],
  ['G-FINAL:brand-marks', 'both'], ['G-FINAL:allowlist', 'final'], ['G-AUDIO', 'final'], ['G-DUPES', 'final'],
]);
const PIXEL_GATES = {
  final: ['G-FINAL:flash', 'G-FINAL:seam', 'G-DRAFT:safezone', 'G-DRAFT:readability', 'G-FINAL:fidelity', 'G-FINAL:figure-ground',
    'G-FINAL:realm-likeness', 'G-FINAL:logo', 'G-FINAL:brand-marks', 'G-DUPES', 'review'],
  draft: ['G-DRAFT:safezone', 'G-DRAFT:readability', 'G-FINAL:brand-marks', 'review'],
};
const MARK_LABELS = ['DRAFT', 'INTERNAL', 'DRAFT · INTERNAL'];

export const loadThresholds = () => JSON.parse(fs.readFileSync(THRESHOLDS_FILE, 'utf8'));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** Run a Python gate script: python3 -I <script> <job.json> <out.json>. → parsed out.json */
export function runPython(script, job, workDir, name) {
  const jobFile = path.join(workDir, `${name}.job.json`), outFile = path.join(workDir, `${name}.out.json`);
  fs.writeFileSync(jobFile, JSON.stringify(job));
  fs.rmSync(outFile, { force: true });
  return new Promise((resolve, reject) => {
    const t0 = process.hrtime.bigint();
    const p = spawn('python3', ['-I', path.join(GATES_DIR, script), jobFile, outFile], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stdout.resume();
    p.stderr.on('data', (d) => { err += d; });
    p.once('error', reject);
    p.once('close', (code) => {
      if (code !== 0 || !fs.existsSync(outFile)) return reject(new Error(`${script} exited ${code}: ${err.trim().split('\n').slice(-6).join(' | ')}`));
      const out = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      out.wallSeconds = Number(process.hrtime.bigint() - t0) / 1e9;
      resolve(out);
    });
  });
}

/** Logo probes wanted for a direction: each LogoCard at full alpha and full scale. */
export function logoWindows(direction, fps, frames) {
  const out = [];
  for (const it of direction?.text || []) {
    if (it.kind !== 'logocard') continue;
    const o = { enterAt: 13, exitAt: 1e9, ...it.opts };
    const f0 = Math.ceil((o.enterAt + 0.7) * fps - 1e-9), f1 = Math.min(frames - 1, Math.floor(o.exitAt * fps + 1e-9));
    if (f1 >= f0) out.push({ id: it.id, opts: it.opts, t: (f0 + f1) / 2 / fps, frames: [f0, f1] });
  }
  return out;
}

function toolVersions() {
  const v = {};
  try { v.python = execFileSync('python3', ['-I', '-c', 'import sys,numpy,cv2,scipy;print(sys.version.split()[0],numpy.__version__,cv2.__version__,scipy.__version__)'], { encoding: 'utf8' }).trim(); } catch { v.python = null; }
  try { v.ffmpeg = execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0]; } catch { v.ffmpeg = null; }
  try { v.git = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: STUDIO, encoding: 'utf8' }).trim(); } catch { v.git = null; }
  v.node = process.version;
  return v;
}

/** Copy an artefact list's paths to report-relative form. */
const relArt = (outDir, list) => (list || []).map((a) => ({ ...a, file: path.relative(outDir, a.file) }));

/**
 * QA one target descriptor. opts: { stage, out, ledger, corpus, at, render (bool), log, capabilities, gates }
 * → report (also written to <outDir>/report.json)
 */
export async function qaOne(desc, opts = {}) {
  const log = opts.log || (() => {});
  const T = loadThresholds();
  const t0 = process.hrtime.bigint();
  const ctx = await loadContext(desc, opts);
  ctx.at = ctx.at || opts.at || new Date().toISOString();       // the CLI edge reads the clock, never a gate
  const outDir = assertWritable(ctx.outDir);
  const work = path.join(outDir, 'work'), artDir = path.join(outDir, 'artefacts');
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(artDir, { recursive: true });
  const stage = ctx.stage;
  const timings = {};
  if (ctx.video && !ctx.direction && ctx.spec) {
    // a variant without direction.json: compose its spec in Node (font-metrics shim) for the geometry
    try {
      const { compose } = await import('../composer/compose.js');
      const c = await compose(ctx.spec);
      ctx.direction = c.direction ?? c;
      ctx.directionFile = 'composed in Node from spec.json (shim layout)';
      ctx.fps = ctx.direction.meta.fps;
      ctx.duration = ctx.duration ?? ctx.direction.meta.duration;
      ctx.score = ctx.score || ctx.direction.meta.score || null;
    } catch (e) {
      log(`  no direction: the spec does not compose (${e.message.slice(0, 120)})`);
    }
  }
  const lap = (k, a) => { timings[k] = Math.round(Number(process.hrtime.bigint() - a) / 1e6) / 1000; };
  log(`QA ${ctx.label} (${stage})`);

  // 1. plan and compile gates
  const { gspecGate, gdirGate, gcostGate } = await import('./gates/spec-gates.mjs');
  let a = process.hrtime.bigint();
  const gates = {};
  gates['G-SPEC'] = await gspecGate(ctx);
  gates['G-DIR'] = await gdirGate(ctx, gates['G-SPEC']);
  gates['G-COST'] = await gcostGate(ctx, gates['G-SPEC'], T);
  lap('specGates', a);

  let py = null, au = null, det = null, geometry = null, signature = null, audioPlan = { plan: null, planSource: null };
  if (ctx.video) {
    // 2. geometry and probes
    const frames = Math.round((ctx.duration || 15) * ctx.fps);
    let geometryFile = null;
    if (ctx.direction) {
      a = process.hrtime.bigint();
      const { directionGeometry } = await import('./gates/geometry.mjs');
      geometry = directionGeometry(ctx.direction, { frames, fps: ctx.fps });
      geometryFile = path.join(work, 'geometry.json');
      fs.writeFileSync(geometryFile, JSON.stringify(geometry));
      lap('geometry', a);
    }
    a = process.hrtime.bigint();
    const { ffprobe } = await import('./gates/delivery.mjs');
    const vs = ffprobe(ctx.video).streams.find((s) => s.codec_type === 'video');
    const k = Math.round((vs.width / 1080) * 1000) / 1000;
    const logos = stage === 'final' ? logoWindows(ctx.direction, ctx.fps, frames) : [];
    const { makeProbes } = await import('./gates/probes.mjs');
    const probes = await makeProbes({ logos: logos.map((l) => ({ id: l.id, opts: l.opts, t: l.t })), marks: MARK_LABELS.map((label) => ({ label, k })) }, { log });
    lap('probes', a);
    const markBox = probes.marks.length ? [0, 0, Math.max(...probes.marks.map((m) => (m.x + m.w) / k)) + 12, Math.max(...probes.marks.map((m) => (m.y + m.h) / k)) + 12] : null;
    const realmRef = ctx.direction ? studioPath('qa', 'fixtures', 'ref', 'realms', `${ctx.direction.realm.id}.json`) : null;
    const pixelJob = {
      video: ctx.video, fps: ctx.fps, framesExpected: frames, stage, gates: opts.gates?.length ? PIXEL_GATES[stage].filter((g) => opts.gates.includes(g) || g === 'review') : PIXEL_GATES[stage],
      geometryFile, art: ctx.direction ? studioPath(ctx.direction.mallow.assets.pristine) : null,
      logoProbes: probes.logos.map((p) => ({ ...p, frames: logos.find((l) => l.id === p.id).frames })),
      markProbes: probes.marks, markBox, realmRef: realmRef && fs.existsSync(realmRef) ? realmRef : null, realm: ctx.direction?.realm?.id || null,
      artefacts: artDir, threads: 2,
    };
    // 3. pixels, audio and determinism in parallel
    const { audioJob, audioGate } = await import('./gates/audio-gate.mjs');
    const jobs = [];
    a = process.hrtime.bigint();
    jobs.push(runPython('pixels.py', pixelJob, work, 'pixels').then((r) => { py = r; timings.pixels = Math.round(r.wallSeconds * 1000) / 1000; },
      (e) => { py = { error: e.message }; }));
    if (stage === 'final') {
      const aj = await audioJob(ctx, artDir);
      audioPlan = { plan: aj.plan, planSource: aj.planSource };
      jobs.push(runPython('audio.py', aj.job, work, 'audio').then((r) => { au = r; timings.audio = Math.round(r.wallSeconds * 1000) / 1000; },
        (e) => { au = { error: e.message }; }));
      if (opts.render !== false) {
        const { runDeterminism } = await import('./gates/determinism.mjs');
        const n = T.gates['G-FINAL:determinism'].frames;
        const d0 = process.hrtime.bigint();
        jobs.push(runDeterminism(ctx, { frames: n, log }).then((r) => { det = r; lap('determinism', d0); }, (e) => { det = { error: e.message }; }));
      }
    }
    await Promise.all(jobs);
    lap('parallel', a);

    // 4. the gates
    const P = (id) => (py && !py.error ? py.gates[id] : null);
    const fromPy = (id, extra = {}) => {
      if (py?.error) return notRunGate(`the pixel pass failed: ${py.error}`);
      const r = P(id);
      if (!r) return notRunGate('not measured in this stage');
      return gate(r.checks, { metrics: r.metrics, artefacts: relArt(outDir, r.artefacts), ...extra });
    };
    gates['G-DRAFT:safezone'] = fromPy('G-DRAFT:safezone');
    gates['G-DRAFT:readability'] = fromPy('G-DRAFT:readability');
    const { layoutGate } = await import('./gates/layout.mjs');
    gates['G-DRAFT:layout'] = layoutGate(geometry, T);
    const { brandMarksGate } = await import('./gates/brand-marks.mjs');
    gates['G-FINAL:brand-marks'] = py?.error ? notRunGate(`the pixel pass failed: ${py.error}`) : brandMarksGate(ctx, P('G-FINAL:brand-marks'));
    if (stage === 'final') {
      const { deliveryGate } = await import('./gates/delivery.mjs');
      gates['G-FINAL:delivery'] = await deliveryGate(ctx, py?.error ? null : py, T);
      gates['G-FINAL:determinism'] = opts.render === false ? notRunGate('skipped (--no-render)')
        : det?.error ? notRunGate(`the re-render failed: ${det.error}`) : gate(det.checks, { metrics: det.metrics });
      for (const id of ['G-FINAL:flash', 'G-FINAL:seam', 'G-FINAL:figure-ground', 'G-FINAL:realm-likeness', 'G-FINAL:logo']) gates[id] = fromPy(id);
      const { magnificationCheck, allowlistGate } = await import('./gates/allowlist.mjs');
      const fid = P('G-FINAL:fidelity');
      gates['G-FINAL:fidelity'] = py?.error ? notRunGate(`the pixel pass failed: ${py.error}`)
        : gate({ ...fid.checks, magnification: magnificationCheck(ctx, T) }, { metrics: fid.metrics, artefacts: relArt(outDir, fid.artefacts) });
      gates['G-FINAL:allowlist'] = allowlistGate(ctx, T);
      gates['G-AUDIO'] = au?.error ? notRunGate(`audio.py failed: ${au.error}`) : await audioGate(ctx, au, audioPlan.plan, audioPlan.planSource, T);
      if (gates['G-AUDIO'].artefacts === undefined) gates['G-AUDIO'].artefacts = relArt(outDir, au?.artefacts);
      signature = P('G-DUPES') ? { ...P('G-DUPES').signature, audio: au?.signature || null } : null;
      const { dupesGate } = await import('./gates/dupes.mjs');
      gates['G-DUPES'] = await dupesGate(ctx, signature, T);
    }
  } else {
    for (const [id, st] of GATE_ORDER) if (!gates[id] && (st === 'both' || stage === 'final')) gates[id] = notRunGate('no video in this target');
  }

  // 5. the report, gates in plan order (only the stage's own)
  const ordered = {};
  for (const [id, st] of GATE_ORDER) if (gates[id] && (st === 'both' || stage === 'final')) ordered[id] = gates[id];
  lap('total', t0);
  const thrBytes = fs.readFileSync(THRESHOLDS_FILE);
  const report = {
    schema: REPORT_SCHEMA,
    target: { label: ctx.label, kind: ctx.kind, source: studioRel(ctx.source) ?? ctx.source, description: ctx.description || null },
    stage,
    at: ctx.at,
    video: ctx.video ? { file: studioRel(ctx.video) ?? ctx.video, sha256: ctx.videoSha256, bytes: fs.statSync(ctx.video).size } : null,
    spec: ctx.spec ? { id: ctx.spec.id, fingerprint: ctx.spec.fingerprint, file: studioRel(ctx.specFile) ?? ctx.specFile, mode: ctx.spec.mode, template: ctx.spec.template, mallow: ctx.spec.mallow } : null,
    direction: ctx.direction ? { id: ctx.direction.meta.id, file: studioRel(ctx.directionFile) ?? ctx.directionFile, realm: ctx.direction.realm?.id, score: ctx.score } : null,
    ...reportVerdict(ordered),
    gates: ordered,
    signature,
    review: { artefacts: relArt(outDir, py?.gates?.review?.artefacts) },
    expect: ctx.expect,
    timings: { ...timings, pixelsPerGate: py?.timings || null, decodeSeconds: py?.decode?.seconds ?? null },
    thresholds: { file: studioRel(THRESHOLDS_FILE), sha256: sha256(thrBytes) },
    tools: toolVersions(),
    render: ctx.provenance ? { job: ctx.provenance.job?.id, key: ctx.provenance.job?.key, direction: ctx.provenance.job?.direction, params: ctx.provenance.job?.params }
      : ctx.evidence ? { evidence: ctx.evidence.source } : null,
  };
  const file = path.join(outDir, 'report.json');
  report.reportFile = studioRel(file) ?? file;
  fs.writeFileSync(file, `${JSON.stringify(report, null, 1)}\n`);
  return report;
}

/** QA every target behind one CLI argument (a batch expands to its variants). */
export async function runQa(target, opts = {}) {
  const { withHeavyLock } = await import('../render/lib/heavy-lock.mjs');
  const out = [];
  for (const desc of expandTarget(target)) {
    out.push(await withHeavyLock({ mode: 'shared', label: `qa ${path.basename(desc.path)}` }, () => qaOne(desc, opts)));
  }
  return out;
}

/** One line per gate for the terminal. */
export function formatReport(r) {
  const mark = (g) => (g.pass === true ? (g.warn ? 'WARN' : 'PASS') : g.pass === false ? 'FAIL' : 'N/A ');
  const lines = [`${r.target.label}: ${r.status.toUpperCase()} (${r.stage}; ${r.timings.total} s)`];
  for (const [id, g] of Object.entries(r.gates)) {
    const bad = Object.entries(g.checks || {}).filter(([, c]) => c.status === 'fail' || (c.status === 'not-run' && !c.reportOnly) || c.status === 'warn');
    const why = g.reason || bad.map(([k, c]) => `${k}: ${c.detail}`).join(' | ');
    lines.push(`  ${mark(g)}  ${id}${why ? `  ${why.slice(0, 220)}` : ''}`);
  }
  return lines.join('\n');
}

// ------------------------------------------------------------------ CLI --

export const USAGE = `node qa/run-qa.mjs <target> [<target> ...] [options]     (= hm qa)

  target        v2 | <variant or farm job dir> | <batch dir> | <hm-qa-target/1 manifest.json> | <video.mp4>
  --stage s     final (default: every gate) | draft (G-SPEC, G-DIR, G-COST, G-DRAFT, the brand mark)
  --out dir     report directory (one target only; default: <dir>/qa, or WORK/qa/<label>)
  --no-render   skip the determinism re-render (G-FINAL:determinism is then not run)
  --ledger dir  ledger for G-SPEC and G-DUPES (default ledger/; 'empty' for none)
  --corpus f    extra G-DUPES signature corpus (JSONL), repeatable
  --at iso      reference time (default now)
  --json        print the report(s) as JSON`;

export function parseCli(argv) {
  const o = { targets: [], corpus: [], render: true, json: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw Object.assign(new Error(`${x} needs a value`), { usage: true }); return argv[++i]; };
    if (x === '--stage') o.stage = val();
    else if (x === '--out') o.out = path.resolve(val());
    else if (x === '--no-render') o.render = false;
    else if (x === '--ledger') { const v = val(); o.ledger = v === 'empty' ? 'empty' : path.resolve(v); }
    else if (x === '--corpus') o.corpus.push(path.resolve(val()));
    else if (x === '--at') o.at = new Date(Date.parse(val())).toISOString();
    else if (x === '--json') o.json = true;
    else if (x === '--gates') o.gates = val().split(',');
    else if (x.startsWith('--')) throw Object.assign(new Error(`unknown option ${x}`), { usage: true });
    else o.targets.push(x);
  }
  if (o.stage && !['final', 'draft'].includes(o.stage)) throw Object.assign(new Error('--stage is final or draft'), { usage: true });
  if (!o.targets.length) throw Object.assign(new Error('no target'), { usage: true });
  if (o.out && o.targets.length > 1) throw Object.assign(new Error('--out takes one target'), { usage: true });
  return o;
}

/** CLI body; returns the exit code: 0 pass, 1 a gate failed, 3 incomplete. */
export async function main(argv, { log = console.log } = {}) {
  const o = parseCli(argv);
  const reports = [];
  for (const t of o.targets) reports.push(...await runQa(t, { ...o, log: o.json ? () => {} : log }));
  if (o.json) log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 1));
  else for (const r of reports) log(`${formatReport(r)}\n  report: ${r.reportFile}`);
  if (reports.some((r) => r.pass === false)) return 1;
  if (reports.some((r) => r.pass !== true)) return 3;
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { confine } = await import('../render/lib/write-jail.mjs');
  await confine();
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    console.error(e.usage ? `${e.message}\n\n${USAGE}` : `error: ${e.stack || e.message}`);
    process.exitCode = e.usage ? 2 : 1;
  }
}

