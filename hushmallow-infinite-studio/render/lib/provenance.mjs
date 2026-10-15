// Provenance for render jobs: what produced a video, exactly enough to re-render
// it bit for bit, and the job key that makes --resume safe.
//
//   job key       sha256 of everything that decides a segment's bytes: the
//                 direction id and its module's sha256, the engine tree hash,
//                 the live app's tree hash, render parameters, encoder
//                 arguments, the Chromium build and its flags. A segment
//                 rendered under another key is never reused.
//   provenance    the key and its parts, plus git state, tool versions
//                 (Node, Playwright 1.56.1, the Chromium build, WebGL
//                 renderer, ffmpeg/x264), the machine, every file the engine
//                 page fetched with its sha256, every raster used as a texture
//                 with its maximum magnification, timings and runtime errors.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { STUDIO, REPO } from './paths.mjs';
import { listFiles, hashFiles, formatManifest, sha256 } from './tree-hash.mjs';

/** JSON with sorted keys, so equal values always hash equally. */
export function canonicalJson(v) {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

export const hashValue = (v) => crypto.createHash('sha256').update(canonicalJson(v)).digest('hex');

/** Tree hash of a studio directory (sha256 of its sha256sum-style manifest). */
export function treeHash(rel) {
  const dir = path.join(STUDIO, rel);
  const files = listFiles(dir).filter((f) => !/(^|\/)(node_modules|__pycache__)\//.test(f));
  return { files: files.length, sha256: sha256(formatManifest(hashFiles(dir, files))) };
}

/** git HEAD, branch and whether the studio has uncommitted changes. */
export function gitInfo() {
  const git = (...a) => execFileSync('git', a, { cwd: STUDIO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    const status = git('status', '--porcelain', '--', '.');
    return { sha: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD'), dirty: status.split('\n').some((l) => l.trim() && !/\b(runs|output)\//.test(l)) };
  } catch {
    return { sha: null, branch: null, dirty: null };
  }
}

/** Installed Playwright version (pinned to 1.56.1 in package.json). */
export function playwrightVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(STUDIO, 'node_modules', 'playwright', 'package.json'), 'utf8')).version; } catch { return null; }
}

export function machineInfo() {
  const cpus = os.cpus();
  return { cores: cpus.length, cpu: cpus[0]?.model?.trim() || null, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1), os: `${os.type()} ${os.release()}`, node: process.version };
}

/** Absolute source file of a registry direction (engine/directions.js entry.src is relative to engine/). */
export function directionSource(entry) {
  return path.resolve(STUDIO, 'engine', entry.src);
}

/**
 * The parts that decide a job's segment bytes, and their hash. runtimeTrees
 * (composer directions only: the code outside engine/ that runtime v3 runs,
 * e.g. { composer, planner }) is left out when absent, so v2 keys are unchanged.
 */
export function jobKey({ direction, directionSha256, engineTree, appTree, params, encoderArgs, chromium, chromiumArgs, runtimeTrees }) {
  const parts = { direction, directionSha256, engineTree, appTree, params, encoderArgs, chromium, chromiumArgs };
  if (runtimeTrees) parts.runtimeTrees = runtimeTrees;
  return { key: hashValue(parts), parts };
}

/**
 * The job's assets: every file the engine pages fetched (url → sha256; one
 * hash per URL across all segments, otherwise an asset changed mid-job and
 * that is an error), and every raster with its maximum magnification.
 * served: [{ url, sha256, bytes }] lists; snapshots: asset-log snapshots.
 */
export function assetReport(servedLists, snapshots) {
  const files = new Map(), conflicts = [];
  for (const list of servedLists) {
    for (const f of list || []) {
      const prev = files.get(f.url);
      if (prev && prev.sha256 !== f.sha256) conflicts.push({ url: f.url, a: prev.sha256, b: f.sha256 });
      else if (!prev) files.set(f.url, { url: f.url, sha256: f.sha256, bytes: f.bytes });
    }
  }
  const maxMag = {};
  const rasters = new Map();
  for (const s of snapshots) {
    if (!s) continue;
    for (const [role, m] of Object.entries(s.maxMagnification || {})) maxMag[role] = Math.max(maxMag[role] ?? 0, m);
    for (const r of s.rasters || []) if (!rasters.has(r.role)) rasters.set(r.role, r);
  }
  const rasterList = [...rasters.values()].map((r) => ({
    ...r,
    sha256: r.url ? files.get(r.url)?.sha256 ?? null : null,
    maxMagnification: maxMag[r.role] ?? null,
  }));
  const loaded = rasterList.filter((r) => r.kind === 'image');
  return {
    files: [...files.values()].sort((a, b) => a.url.localeCompare(b.url)),
    rasters: rasterList,
    maxMagnification: loaded.length ? Math.max(...loaded.map((r) => r.maxMagnification ?? 0)) : null,
    conflicts,
  };
}

/** The one-line stamp written into the MP4's comment tag. */
export function stamp({ job, git }) {
  return `hushmallow-infinite-studio ${job.direction} @ ${git?.sha ? git.sha.slice(0, 12) : 'unknown'}${git?.dirty ? '-dirty' : ''} job ${job.key.slice(0, 12)}`;
}

/**
 * The stamps QA can verify (qa/gates/delivery.mjs):
 *   farm    "hushmallow-infinite-studio <direction> @ <commit12>[-dirty] job <key12>"
 *   remux   a farm stamp + " remux <key12>": the farm's picture with a new score (hm remux, FU-5);
 *           the remux record in the provenance next to the file has that key
 *   legacy  "hushmallow-infinite-studio <direction> @ <commit12>" (render/render.mjs)
 */
export const STAMP_RE = /^hushmallow-infinite-studio (\S+) @ ([0-9a-f]{12}|unknown)(-dirty)? job ([0-9a-f]{12})(?: remux ([0-9a-f]{12}))?$/;
export const LEGACY_STAMP_RE = /^hushmallow-infinite-studio (\S+) @ ([0-9a-f]{12})$/;

/** → { kind: 'farm', direction, commit, dirty, job, remux (key12 or null), farm (the stamp without its remux part) } | { kind: 'legacy', direction, commit } | null */
export function parseStamp(text) {
  const t = String(text ?? '');
  let m = STAMP_RE.exec(t);
  if (m) return { kind: 'farm', direction: m[1], commit: m[2], dirty: !!m[3], job: m[4], remux: m[5] ?? null, farm: t.replace(/ remux [0-9a-f]{12}$/, '') };
  m = LEGACY_STAMP_RE.exec(t);
  if (m) return { kind: 'legacy', direction: m[1], commit: m[2] };
  return null;
}

/** The stamp of a remux of a farm render (a re-remux replaces the previous remux part). */
export function remuxStamp(farmStamp, key) {
  const st = typeof farmStamp === 'string' ? parseStamp(farmStamp) : farmStamp;
  if (st?.kind !== 'farm') throw new Error('remuxStamp: not a farm stamp');
  return `${st.farm} remux ${key.slice(0, 12)}`;
}

/** Relative path inside the repository, for readable records. */
export const repoRel = (p) => path.relative(REPO, p).split(path.sep).join('/');
