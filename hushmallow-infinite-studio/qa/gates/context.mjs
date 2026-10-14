// What QA judges, and everything it needs to judge it.
//
// A QA target is one of:
//   v2                          the approved v2 (qa/fixtures/v2/target.json)
//   <manifest>.json             an hm-qa-target/1 manifest: explicit paths (fixtures use these)
//   <variant or job dir>        a directory holding final.mp4 (runs/<batch>/<id>/ or a farm job)
//   <file>.mp4                  a bare video: only the gates that need nothing else run
//   <batch dir>                 a directory whose sub-directories hold final.mp4 (expands to many)
//
// The context gathers: the video and its sha256, the spec (spec.json), the
// compiled direction (direction.json, the farm job's registry entry, or the
// legacy map below), the cue log, the render provenance (provenance.json, or
// a committed render-evidence file for the legacy v2), the score id and plan,
// and where the report goes. Paths in a manifest are relative to it.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { STUDIO, WORK, studioPath, studioRel } from '../../render/lib/paths.mjs';

export const TARGET_SCHEMA = 'hm-qa-target/1';
export const V2_TARGET = studioPath('qa', 'fixtures', 'v2', 'target.json');

/**
 * Directions rendered by the legacy route have no direction.json; the
 * composer reproduces the approved v2 bit for bit from specs/golden/t01-v2.json
 * (WP-03), so QA uses that compiled direction for its geometry.
 */
export const LEGACY = Object.freeze({
  'my-brain-at-2am-v2': {
    direction: 'specs/golden/t01-v2.direction.json',
    sequentialGolden: 'qa/golden/v2/sequential-frames.json',
    score: 'soundtrack-v2',
    goldenPlan: 'qa/golden/v2/plan-v2.json',
  },
});

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const maybe = (f) => (f && fs.existsSync(f) ? f : null);
export const sha256File = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

/** Expand a CLI target into a list of target descriptors { kind, path }. */
export function expandTarget(target) {
  if (target === 'v2') return [{ kind: 'manifest', path: V2_TARGET }];
  const p = path.resolve(target);
  if (!fs.existsSync(p)) throw new Error(`QA target ${target} does not exist`);
  const st = fs.statSync(p);
  if (st.isFile() && p.endsWith('.json')) return [{ kind: 'manifest', path: p }];
  if (st.isFile() && /\.(mp4|mov|m4v)$/i.test(p)) return [{ kind: 'video', path: p }];
  if (st.isDirectory()) {
    if (fs.existsSync(path.join(p, 'final.mp4'))) return [{ kind: 'dir', path: p }];
    const subs = fs.readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory() && fs.existsSync(path.join(p, e.name, 'final.mp4')))
      .map((e) => ({ kind: 'dir', path: path.join(p, e.name) }));
    if (subs.length) return subs.sort((a, b) => a.path.localeCompare(b.path));
    throw new Error(`${target}: no final.mp4 in it or in its sub-directories`);
  }
  throw new Error(`QA target ${target}: not a directory, a .json manifest or a video`);
}

/** The compiled direction of a farm job (engine/directions.js entry), or a legacy mapping. */
async function directionOfJob(job) {
  const id = job?.direction;
  if (!id) return {};
  if (LEGACY[id]) return { legacy: { id, ...LEGACY[id] }, directionFile: studioPath(LEGACY[id].direction) };
  try {
    const { DIRECTIONS } = await import(pathToFileURL(studioPath('engine', 'directions.js')).href);
    const entry = Object.hasOwn(DIRECTIONS, id) ? DIRECTIONS[id] : null;
    if (entry && entry.src.endsWith('.json')) return { directionFile: path.resolve(STUDIO, 'engine', entry.src) };
  } catch { /* the registry is optional for QA */ }
  return {};
}

/**
 * Build the context of one target descriptor. opts: { stage, out, ledger, corpus, at, capabilities }.
 */
export async function loadContext(desc, opts = {}) {
  const c = {
    kind: desc.kind, source: desc.path, label: null, stage: opts.stage || 'final',
    video: null, videoSha256: null, spec: null, specFile: null, direction: null, directionFile: null,
    cues: null, cuesFile: null, provenance: null, provenanceFile: null, evidence: null, job: null, legacy: null,
    score: null, plan: null, planSource: null, outDir: null, ledgerDir: opts.ledger || null, corpus: [...(opts.corpus || [])],
    capabilities: opts.capabilities || null, at: opts.at || null, expect: null, fixture: false,
  };
  if (desc.kind === 'manifest') {
    const m = readJson(desc.path);
    if (m.schema !== TARGET_SCHEMA) throw new Error(`${desc.path}: not an ${TARGET_SCHEMA} manifest`);
    const rel = (p) => (p ? path.resolve(path.dirname(desc.path), p) : null);
    c.label = m.label || path.basename(path.dirname(desc.path));
    c.video = rel(m.video);
    c.specFile = rel(m.spec);
    c.directionFile = rel(m.direction);
    c.cuesFile = rel(m.cues);
    c.provenanceFile = rel(m.provenance);
    if (m.evidence) c.evidence = readJson(rel(m.evidence));
    if (m.legacy) c.legacy = { id: m.legacy, ...LEGACY[m.legacy] };
    c.score = m.score || null;
    if (m.plan) { c.plan = readJson(rel(m.plan)); c.planSource = studioRel(rel(m.plan)) ?? rel(m.plan); }
    c.stage = opts.stage || m.stage || 'final';
    c.outDir = opts.out || (m.out ? rel(m.out) : path.join(WORK, 'qa', c.label));
    if (!opts.ledger && m.ledger) c.ledgerDir = m.ledger === 'empty' ? 'empty' : rel(m.ledger);
    if (m.corpus) c.corpus.push(...[].concat(m.corpus).map(rel));
    if (!opts.capabilities && m.capabilities) c.capabilities = m.capabilities === 'open' ? 'open' : rel(m.capabilities);
    if (!opts.at && m.at) c.at = m.at;
    c.expect = m.expect || null;
    c.fixture = !!m.fixture;
    c.description = m.description || null;
  } else if (desc.kind === 'dir') {
    const d = desc.path;
    c.label = path.basename(d);
    c.video = path.join(d, 'final.mp4');
    c.specFile = maybe(path.join(d, 'spec.json'));
    c.directionFile = maybe(path.join(d, 'direction.json'));
    c.cuesFile = maybe(path.join(d, 'cues.json'));
    c.provenanceFile = maybe(path.join(d, 'provenance.json'));
    c.job = maybe(path.join(d, 'job.json')) ? readJson(path.join(d, 'job.json')) : null;
    if (!c.directionFile) Object.assign(c, await directionOfJob(c.job));
    const sp = maybe(path.join(d, 'score-plan.json'));
    if (sp) { c.plan = readJson(sp); c.planSource = sp; }
    c.outDir = opts.out || path.join(d, 'qa');
  } else {
    c.label = path.basename(desc.path).replace(/\.[^.]+$/, '');
    c.video = desc.path;
    c.outDir = opts.out || path.join(WORK, 'qa', c.label);
  }
  if (c.video && !fs.existsSync(c.video)) throw new Error(`${c.label}: video ${c.video} does not exist`);
  if (c.video) c.videoSha256 = sha256File(c.video);
  if (c.specFile) c.spec = readJson(c.specFile);
  if (c.directionFile) {
    const d = readJson(c.directionFile);
    c.direction = d.direction && d.direction.schema ? d.direction : d;
  }
  if (c.cuesFile) c.cues = readJson(c.cuesFile);
  if (c.provenanceFile) c.provenance = readJson(c.provenanceFile);
  c.score = c.score || c.provenance?.job?.info?.score || c.direction?.meta?.score || c.legacy?.score || null;
  c.fps = c.direction?.meta?.fps || c.cues?.fps || 30;
  c.duration = c.spec?.duration || c.direction?.meta?.duration || c.cues?.duration || null;
  return c;
}

/**
 * The score plan for G-AUDIO's hum and closing-contour checks: score-plan.json
 * when the score wrote one (WP-04), else a replay of buildPlanV2 for the frozen
 * soundtrack-v2 score (deterministic from the cue log).
 */
export async function scorePlan(ctx) {
  if (ctx.plan) return { plan: ctx.plan, source: ctx.planSource };
  if (ctx.score === 'soundtrack-v2' && ctx.cues) {
    const { planV2 } = await import('../../tools/golden/plan-v2.mjs');
    return { plan: await planV2(ctx.cues), source: 'buildPlanV2(cues.json) (frozen audio/soundtrack-v2.mjs)' };
  }
  return { plan: null, source: null };
}
