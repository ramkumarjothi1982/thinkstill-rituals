// Hash-locks for the two things Phase 2 must never change:
//
//   1. the approved v2 (paths.FROZEN), recorded in qa/golden/v2/frozen.sha256
//      over every git-tracked file under the frozen paths;
//   2. the live app (../hushmallow), recorded in qa/golden/app-tree.sha256
//      over every file on disk (ignored files included, .git excluded).
//
// Both manifests are plain `sha256sum` files, so they can also be checked by
// hand:  (cd hushmallow-infinite-studio && sha256sum -c qa/golden/v2/frozen.sha256)
//        (cd <repo> && sha256sum -c hushmallow-infinite-studio/qa/golden/app-tree.sha256)
// The sha256 of a manifest file is the corresponding "tree hash" used in
// provenance. Used by tests/guard/*, the golden capture preflight, and (from
// WP-01) the render farm, which refuses to run when either lock is broken.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO, REPO, HUSHMALLOW, FROZEN, GOLDEN_V2, APP_TREE_MANIFEST } from './paths.mjs';
import { hashFile, listFiles, parseManifest, formatManifest, diffManifest, describeDiff, sha256 } from './tree-hash.mjs';

export const FROZEN_MANIFEST = path.join(GOLDEN_V2, 'frozen.sha256');

// Every function takes its roots as options (defaulting to the real studio),
// so tests can prove each check against a throw-away git repository.
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });

/** Studio-relative files under the frozen paths: tracked by git, and present-but-untracked (not ignored). */
export function frozenFileSet({ studio = STUDIO, frozen = FROZEN } = {}) {
  const list = (args) => git([...args, '-z', '--', ...frozen], studio).split('\0').filter(Boolean);
  return { tracked: list(['ls-files']), untracked: list(['ls-files', '--others', '--exclude-standard']) };
}

/** { rel: sha256 } of what the frozen paths contain right now (tracked files that vanished are left out). */
export function currentFrozenHashes({ studio = STUDIO, frozen = FROZEN } = {}) {
  const { tracked, untracked } = frozenFileSet({ studio, frozen });
  const map = {};
  for (const rel of [...tracked, ...untracked]) {
    const abs = path.join(studio, rel);
    if (fs.existsSync(abs)) map[rel] = hashFile(abs);
  }
  return map;
}

/** sha256 of a manifest file's bytes (the tree hash), or null if it does not exist. */
export const manifestHash = (file) => (fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null);

/**
 * Check the frozen v2 against its manifest.
 * → { ok, changed, missing, added, summary, treeHash }
 * `added` includes new untracked files under a frozen path: frozen means no additions either.
 */
export function checkFrozen({ manifest = FROZEN_MANIFEST, studio = STUDIO, frozen = FROZEN } = {}) {
  const recorded = parseManifest(fs.readFileSync(manifest, 'utf8'));
  const d = diffManifest(recorded, currentFrozenHashes({ studio, frozen }));
  return { ...d, summary: describeDiff(d), treeHash: manifestHash(manifest) };
}

/** Every file of the live app, REPO-relative (e.g. "hushmallow/src/…"), with its sha256. */
export function currentAppHashes(appDir = HUSHMALLOW) {
  const base = path.dirname(appDir);
  const rels = listFiles(appDir, { base });
  return Object.fromEntries(rels.map((r) => [r, hashFile(path.join(base, r))]));
}

/** Check the live app against qa/golden/app-tree.sha256. → { ok, changed, missing, added, summary, treeHash } */
export function checkAppTree({ manifest = APP_TREE_MANIFEST, appDir = HUSHMALLOW } = {}) {
  const recorded = parseManifest(fs.readFileSync(manifest, 'utf8'));
  const d = diffManifest(recorded, currentAppHashes(appDir));
  return { ...d, summary: describeDiff(d), treeHash: manifestHash(manifest) };
}

/**
 * Paths changed in the repository OUTSIDE the studio root (working tree vs
 * HEAD, untracked included, ignored excluded). Studio code may only write
 * inside the studio (and to WORK, which is outside the repository), so this
 * must always be empty.  → [ 'XY path', … ] in `git status --porcelain` form
 */
export function repoChangesOutsideStudio({ repo = REPO, studio = STUDIO } = {}) {
  const studioRel = path.relative(repo, studio).split(path.sep).join('/');
  const entries = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], repo).split('\0');
  const out = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e) continue;
    // porcelain -z: "XY path"; a rename/copy is followed by one extra entry (the source path)
    const paths = [e.slice(3)];
    if (e[0] === 'R' || e[0] === 'C') paths.push(entries[++i]);
    if (paths.some((p) => p !== studioRel && !p.startsWith(`${studioRel}/`))) out.push(e);
  }
  return out;
}

/**
 * (Re)write a manifest. Freezing is a deliberate, reviewed act: refuses to
 * replace an existing manifest unless `force` is set.
 */
export function writeManifest(file, map, { force = false } = {}) {
  if (fs.existsSync(file) && !force) throw new Error(`${path.relative(STUDIO, file)} exists; re-freezing needs --force (and an owner-approved reason)`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, formatManifest(map));
  return manifestHash(file);
}
