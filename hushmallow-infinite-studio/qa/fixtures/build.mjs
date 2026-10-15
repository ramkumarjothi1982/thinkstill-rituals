// Build the QA fault fixtures (qa/fixtures/fixtures.json) into WORK/qa-fixtures.
//
//   node qa/fixtures/build.mjs [--force] [--only id,id]        (or: hm qa fixtures --build)
//
// Each fixture is the approved v2 with one fault, written as an hm-qa-target/1
// manifest (WORK/qa-fixtures/<id>/target.json) next to whatever it needs:
//   video.mp4     faulted media (qa/fixtures/make_fixtures.py), or the approved file itself
//   spec.json     a faulted spec (sealed, so only the fault is wrong), or the v2 production twin
//   evidence.json the v2 render evidence, pinned to this fixture's video (a fixture is a render
//                 whose provenance is in order; only its fault differs)
//   direction.json a faulted compiled direction (the golden T01 direction with one change)
//   provenance.json a faulted farm provenance (frame hashes the direction does not reproduce)
//   corpus.jsonl  a G-DUPES corpus (the duplicate fixture)
// Fixture manifests use an empty ledger, so the studio ledger never changes a
// fixture's verdict. The faulted media (the slow part) is re-made only when
// what shapes it changes: the fixture's `make` block, make_fixtures.py or the
// approved video (media key), or with --force; the manifest, spec, evidence and
// corpus are cheap and always rewritten. Large media stay in WORK; nothing here
// is committed.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WORK, studioPath, assertWritable } from '../../render/lib/paths.mjs';
import { loadContext, V2_TARGET, sha256File } from '../gates/context.mjs';

export const FIXTURES_FILE = studioPath('qa', 'fixtures', 'fixtures.json');
export const FIXTURE_ROOT = path.join(WORK, 'qa-fixtures');
const MAKE = studioPath('qa', 'fixtures', 'make_fixtures.py');
const SELF = fileURLToPath(import.meta.url);

export const loadFixtures = () => JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const writeJson = (f, v) => fs.writeFileSync(f, `${JSON.stringify(v, null, 1)}\n`);

function python(script, job, jobFile, log) {
  fs.writeFileSync(jobFile, JSON.stringify(job));
  return new Promise((resolve, reject) => {
    const p = spawn('python3', ['-I', script, jobFile], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stdout.on('data', (d) => log(String(d).trim()));
    p.stderr.on('data', (d) => { err += d; });
    p.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(script)} ${job.op}: exit ${code}: ${err.trim().slice(-400)}`))));
  });
}

/** Inputs shared by the fixtures: v2 context, geometry, probes, signature, stamp. */
async function shared(log) {
  const v2 = await loadContext({ kind: 'manifest', path: V2_TARGET });
  const dir = path.join(FIXTURE_ROOT, '_shared');
  fs.mkdirSync(assertWritable(dir), { recursive: true });
  const frames = Math.round(v2.duration * v2.fps);
  const geometryFile = path.join(dir, 'geometry.json');
  if (!fs.existsSync(geometryFile)) {
    const { directionGeometry } = await import('../gates/geometry.mjs');
    writeJson(geometryFile, directionGeometry(v2.direction, { frames, fps: v2.fps }));
  }
  const { logoWindows, runPython } = await import('../run-qa.mjs');
  const logos = logoWindows(v2.direction, v2.fps, frames);
  const { makeProbes } = await import('../gates/probes.mjs');
  const probes = await makeProbes({ logos: logos.map((l) => ({ id: l.id, opts: l.opts, t: l.t })), marks: [{ label: 'DRAFT', k: 1 }] }, { log });
  const sigFile = path.join(dir, `v2-signature-${v2.videoSha256.slice(0, 12)}.json`);
  if (!fs.existsSync(sigFile)) {
    const out = await runPython('pixels.py', { video: v2.video, fps: v2.fps, framesExpected: frames, gates: ['G-DUPES'], geometryFile }, dir, 'signature');
    writeJson(sigFile, out.gates['G-DUPES'].signature);
  }
  const stamp = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-of', 'json', v2.video], { encoding: 'utf8' })).format.tags.comment;
  return { v2, geometryFile, logo: { ...probes.logos[0], frames: logos[0].frames }, mark: probes.marks[0], signature: JSON.parse(fs.readFileSync(sigFile, 'utf8')), stamp, frames };
}

/** The faulted spec of a fixture. */
async function makeSpec(op, P, S) {
  const { sealSpec } = await import('../../planner/fingerprint.mjs');
  if (op === 'golden-internal') return { file: studioPath('specs', 'golden', 't01-v2.json'), spec: null };
  if (op === 'line') {
    const s = structuredClone(S.v2.spec);
    s.copy.lines[P.index] = P.text;
    return { spec: sealSpec(s) };
  }
  if (op === 'afternoon-2am') {
    const { loadLibrary } = await import('../../planner/library.mjs');
    const { loadPolicy } = await import('../../planner/policy.mjs');
    const { openCapabilities } = await import('../../planner/capabilities.mjs');
    const { emptyLedger } = await import('../../planner/ledger.mjs');
    const { planSpec } = await import('../../planner/pick.mjs');
    const lib = loadLibrary();
    const r = planSpec({ lib, caps: openCapabilities(lib), policy: loadPolicy(), ledger: emptyLedger(), mode: 'review', seed: P.seed, batch: 'qa-fixtures',
      constraints: { template: [P.template], mallow: [P.mallow], tod: [P.tod] } });
    if (!r.spec) throw new Error(`cannot plan a ${P.template} ${P.mallow} ${P.tod} spec even with every capability open`);
    const s = structuredClone(r.spec);
    s.copy.lines[P.index] = P.text;
    return { spec: sealSpec(s), capabilities: 'open' };
  }
  throw new Error(`unknown spec op ${op}`);
}

/** The faulted compiled direction of a fixture (a copy of the golden T01 direction with one change). */
export function makeDirection(op, P, base) {
  const d = structuredClone(base);
  if (op === 'prop-param') {
    const prop = d.props.find((p) => p.id === P.prop);
    if (!prop) throw new Error(`direction op prop-param: no prop ${P.prop}`);
    let o = prop.params;
    for (const k of P.path.slice(0, -1)) o = o[k];
    o[P.path.at(-1)] = structuredClone(P.value);
  } else if (op === 'drop-cue') {
    const n = d.cues.length;
    d.cues = d.cues.filter((c) => !(c.by === P.by && c.type === P.type));
    if (d.cues.length === n) throw new Error(`direction op drop-cue: no cue ${P.by}:${P.type}`);
  } else if (op === 'meta') {
    Object.assign(d.meta, P);
  } else {
    throw new Error(`unknown direction op ${op}`);
  }
  return d;
}

/** The faulted farm provenance of a fixture: the legacy v2 render described as a farm job whose frame hashes are not v2's. */
async function makeProvenance(op) {
  if (op !== 'tamper-hashes') throw new Error(`unknown provenance op ${op}`);
  const { SEQUENTIAL_GOLDENS } = await import('../../render/farm.mjs');
  const g = SEQUENTIAL_GOLDENS['my-brain-at-2am-v2'];
  const hashes = JSON.parse(fs.readFileSync(studioPath(g.file), 'utf8')).hashes;
  return {
    schema: 'hm-provenance/1', $fixture: 'qa/fixtures/build.mjs: the approved v2 render with every recorded frame hash replaced by a foreign one',
    job: { id: 'fixture-foreign-frame-hashes', direction: 'my-brain-at-2am-v2', params: { ...g.params, preroll: 1 }, info: { score: 'soundtrack-v2', fps: 30, duration: 15 } },
    frameHashes: hashes.map((h) => sha(`${h} foreign`)),
  };
}

/** Build one fixture. → its target.json path */
async function buildOne(def, S, { force, log, date }) {
  const dir = path.join(FIXTURE_ROOT, def.id);
  const m = def.make;
  const media = m.video || m.audio;
  const mediaKey = sha(JSON.stringify(media || null) + fs.readFileSync(MAKE, 'utf8') + S.v2.videoSha256);
  const mediaFile = path.join(dir, 'video.mp4'), mediaRecord = path.join(dir, 'media.json');
  const fresh = media && !force && fs.existsSync(mediaFile) && fs.existsSync(mediaRecord) && JSON.parse(fs.readFileSync(mediaRecord, 'utf8')).key === mediaKey;
  fs.mkdirSync(assertWritable(dir), { recursive: true });
  for (const f of fs.readdirSync(dir)) if (!(fresh && ['video.mp4', 'media.json'].includes(f))) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
  const t0 = process.hrtime.bigint();
  const target = {
    schema: 'hm-qa-target/1', label: `fixture-${def.id}`, fixture: true, description: def.fault,
    spec: S.v2.specFile, direction: S.v2.directionFile, cues: S.v2.cuesFile, evidence: null,
    legacy: 'my-brain-at-2am-v2', score: 'soundtrack-v2', plan: studioPath('qa', 'golden', 'v2', 'plan-v2.json'),
    ledger: 'empty', at: date, expect: def.expect, out: './qa',
  };
  let video = S.v2.video;
  if (media) {
    video = mediaFile;
    if (!fresh) {
      const { withHeavyLock } = await import('../../render/lib/heavy-lock.mjs');
      await withHeavyLock({ mode: 'shared', weight: 2, label: `qa fixture ${def.id}` }, () => python(MAKE, {
        src: S.v2.video, out: video, op: media.op, params: media.params, duration: S.v2.duration, stamp: S.stamp,
        geometryFile: S.geometryFile, logo: { x: S.logo.x, y: S.logo.y, w: S.logo.w, h: S.logo.h, frames: S.logo.frames }, mark: { png: S.mark.png, x: S.mark.x, y: S.mark.y },
      }, path.join(dir, 'make.job.json'), log));
      writeJson(mediaRecord, { key: mediaKey, op: media.op, sha256: sha256File(video), seconds: Math.round(Number(process.hrtime.bigint() - t0) / 1e8) / 10 });
    }
  }
  if (m.spec) {
    target.video = m.spec.op === 'golden-internal' ? S.v2.video : null;
    const r = await makeSpec(m.spec.op, m.spec.params, S);
    if (r.spec) { writeJson(path.join(dir, 'spec.json'), r.spec); target.spec = path.join(dir, 'spec.json'); } else target.spec = r.file;
    if (r.capabilities) target.capabilities = r.capabilities;
    if (m.spec.op !== 'golden-internal') { delete target.direction; delete target.cues; delete target.plan; delete target.legacy; }
  } else {
    target.video = video;
  }
  if (target.video) {
    const ev = structuredClone(S.v2.evidence);
    ev.video = { file: target.video, sha256: sha256File(target.video) };
    if (target.video !== S.v2.video) ev.$fixture = `pinned to the fixture video by qa/fixtures/build.mjs (the fixture stands for a render whose provenance is in order)`;
    if (m.evidence?.op === 'magnify') {
      const r = ev.assets.rasters.find((x) => x.role === m.evidence.params.role);
      r.maxMagnification = m.evidence.params.value;
      ev.assets.maxMagnification = Math.max(ev.assets.maxMagnification, m.evidence.params.value);
      ev.$fixture = `${m.evidence.params.role} raster magnified ${m.evidence.params.value}x (qa/fixtures/build.mjs)`;
    } else if (m.evidence?.op === 'swap-asset') {
      const r = ev.assets.rasters.find((x) => x.role === m.evidence.params.role);
      const f = r && ev.assets.files.find((x) => x.url === r.url);
      if (!f) throw new Error(`swap-asset: the evidence has no served file for the ${m.evidence.params.role} raster`);
      f.sha256 = r.sha256 = sha(`not the approved ${m.evidence.params.role} raster`);
      ev.$fixture = `${m.evidence.params.role} raster (${f.url}) served with a hash on no allowlist (qa/fixtures/build.mjs)`;
    }
    writeJson(path.join(dir, 'evidence.json'), ev);
    target.evidence = path.join(dir, 'evidence.json');
  }
  if (m.direction) {
    const d = makeDirection(m.direction.op, m.direction.params, S.v2.direction);
    writeJson(path.join(dir, 'direction.json'), d);
    target.direction = path.join(dir, 'direction.json');
  }
  if (m.provenance) {
    writeJson(path.join(dir, 'provenance.json'), await makeProvenance(m.provenance.op, m.provenance.params));
    target.provenance = path.join(dir, 'provenance.json');
  }
  if (m.corpus?.op === 'v2-as') {
    const P = m.corpus.params;
    fs.writeFileSync(path.join(dir, 'corpus.jsonl'), `${JSON.stringify({ id: P.id, at: P.at, channel: P.channel, source: 'qa fixture: the approved v2 signature under another id', signature: S.signature })}\n`);
    target.corpus = [path.join(dir, 'corpus.jsonl')];
  }
  // manifest paths relative to the manifest
  for (const k of ['video', 'spec', 'direction', 'cues', 'evidence', 'plan', 'provenance']) if (target[k]) target[k] = path.relative(dir, target[k]);
  if (target.corpus) target.corpus = target.corpus.map((f) => path.relative(dir, f));
  target.build = { mediaKey: media ? mediaKey : null, media: media ? (fresh ? 'kept' : 'made') : 'none', video: target.video ? sha256File(path.resolve(dir, target.video)) : null };
  const targetFile = path.join(dir, 'target.json');
  writeJson(targetFile, target);
  log(`  ${def.id}: ${media ? (fresh ? 'media up to date' : `media made in ${(Number(process.hrtime.bigint() - t0) / 1e9).toFixed(1)} s`) : 'no media'}; manifest written`);
  return targetFile;
}

/** Build every fixture (or `only`). → [{ id, target }] */
export async function buildFixtures({ only = null, force = false, log = console.log } = {}) {
  const defs = loadFixtures();
  const list = defs.fixtures.filter((f) => !only || only.includes(f.id));
  if (only && list.length !== only.length) throw new Error(`unknown fixture(s): ${only.filter((id) => !defs.fixtures.some((f) => f.id === id)).join(', ')}`);
  log(`building ${list.length} fixtures into ${FIXTURE_ROOT}`);
  const S = await shared(log);
  const out = [];
  for (const def of list) out.push({ id: def.id, target: await buildOne(def, S, { force, log, date: defs.date }) });
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  const { confine } = await import('../../render/lib/write-jail.mjs');
  await confine();
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--only');
  await buildFixtures({ force: argv.includes('--force'), only: i >= 0 ? argv[i + 1].split(',') : null });
}
