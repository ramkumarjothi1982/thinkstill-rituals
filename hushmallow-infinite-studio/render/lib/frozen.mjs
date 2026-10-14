// Hash-locks for the two things Phase 2 must never change:
//
//   1. the approved v2 (paths.FROZEN): EVERY file on disk under the frozen
//      paths, git-ignored files included. Two manifests, because git can only
//      reproduce one part of it:
//        qa/golden/v2/frozen.sha256        files git tracks (identical in every clone)
//        qa/golden/v2/frozen-local.sha256  files git does not track (ignored render
//                                          passes and logs that exist only in the
//                                          checkout where v2 was rendered)
//   2. the live app (../hushmallow), recorded in qa/golden/app-tree.sha256
//      over every file on disk (ignored files included, .git excluded).
//
// Both guards enumerate the filesystem, not git, so a file that a .gitignore
// hides (e.g. a render pass written into output/v2/) is still seen: as
// "changed" if it overwrote a locked file, as "added" if it is new.
//
// All manifests are plain `sha256sum` files, so they can also be checked by hand:
//   (cd hushmallow-infinite-studio && sha256sum -c qa/golden/v2/frozen.sha256 qa/golden/v2/frozen-local.sha256)
//   (cd <repo> && sha256sum -c hushmallow-infinite-studio/qa/golden/app-tree.sha256)
// The sha256 of a manifest file is its "tree hash", used in provenance. Used
// by tests/guard/*, hm guard, the golden capture preflight, and (from WP-01)
// the render farm, which refuses to run when a lock is broken.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO, REPO, HUSHMALLOW, FROZEN, GOLDEN_V2, APP_TREE_MANIFEST } from './paths.mjs';
import { hashFile, listFiles, parseManifest, formatManifest, diffManifest, describeDiff, sha256 } from './tree-hash.mjs';

export const FROZEN_MANIFEST = path.join(GOLDEN_V2, 'frozen.sha256');
export const FROZEN_LOCAL_MANIFEST = path.join(GOLDEN_V2, 'frozen-local.sha256');

// Every function takes its roots as options (defaulting to the real studio),
// so tests can prove each check against a throw-away git repository.
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });

/** Studio-relative files present on disk under the frozen paths (ignored files included), sorted. */
export function frozenFilesOnDisk({ studio = STUDIO, frozen = FROZEN } = {}) {
  const out = [];
  for (const f of frozen) {
    const abs = path.join(studio, f);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) out.push(...listFiles(abs, { base: studio }));
    else out.push(f);
  }
  return [...new Set(out)].sort();
}

/**
 * The frozen file set split by what git knows about it:
 *   tracked:   every file git tracks under the frozen paths (even if deleted from disk)
 *   untracked: files on disk under the frozen paths that git does not track
 *              (ignored or not), i.e. what only frozen-local.sha256 can lock
 */
export function frozenFileSet({ studio = STUDIO, frozen = FROZEN } = {}) {
  const tracked = git(['ls-files', '-z', '--', ...frozen], studio).split('\0').filter(Boolean).sort();
  const known = new Set(tracked);
  return { tracked, untracked: frozenFilesOnDisk({ studio, frozen }).filter((r) => !known.has(r)) };
}

/** { rel: sha256 } of every file on disk under the frozen paths right now. */
export function currentFrozenHashes({ studio = STUDIO, frozen = FROZEN } = {}) {
  return Object.fromEntries(frozenFilesOnDisk({ studio, frozen }).map((r) => [r, hashFile(path.join(studio, r))]));
}

/** sha256 of a manifest file's bytes (the tree hash), or null if it does not exist. */
export const manifestHash = (file) => (fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null);

/**
 * True when `dir` is inside a *linked* git worktree (`git worktree add`), as
 * opposed to the repository's main checkout. Git never materialises ignored
 * files in a new worktree, so frozen-local entries are optional there.
 */
export function isLinkedWorktree(dir = STUDIO) {
  const [gitDir, commonDir] = git(['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir'], dir).trim().split('\n');
  return path.resolve(gitDir) !== path.resolve(commonDir);
}

function readManifest(file) {
  if (!fs.existsSync(file)) throw new Error(`${file} is missing; record it with node tools/golden/freeze.mjs`);
  return parseManifest(fs.readFileSync(file, 'utf8'));
}

/**
 * Check the frozen v2 against both manifests.
 * → { ok, changed, missing, added, notMaterialised, summary, treeHash, localTreeHash, linkedWorktree }
 *
 * - changed: a locked file's bytes differ (tracked or ignored, it makes no difference);
 * - missing: a locked file is gone. In a linked worktree, frozen-local entries that
 *   were simply never checked out are reported as `notMaterialised` instead;
 * - added:   any file on disk under a frozen path that neither manifest lists, whether
 *   git ignores it or not. Frozen means no additions either.
 */
export function checkFrozen({
  manifest = FROZEN_MANIFEST, localManifest = FROZEN_LOCAL_MANIFEST, studio = STUDIO, frozen = FROZEN,
  linkedWorktree = isLinkedWorktree(studio),
} = {}) {
  const tracked = readManifest(manifest);
  const local = readManifest(localManifest);
  const both = Object.keys(local).filter((r) => r in tracked);
  if (both.length) throw new Error(`listed in both frozen manifests: ${both.join(', ')}`);
  const d = diffManifest({ ...tracked, ...local }, currentFrozenHashes({ studio, frozen }));
  const notMaterialised = linkedWorktree ? d.missing.filter((r) => r in local) : [];
  const missing = d.missing.filter((r) => !notMaterialised.includes(r));
  const r = { ...d, missing, ok: !d.changed.length && !missing.length && !d.added.length };
  return {
    ...r, notMaterialised, summary: describeDiff(r), linkedWorktree,
    treeHash: manifestHash(manifest), localTreeHash: manifestHash(localManifest),
  };
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
 * must always be empty. Writes anywhere else on the machine, ignored files
 * in the repository included, are caught by render/lib/write-audit.mjs.
 * → [ 'XY path', … ] in `git status --porcelain` form
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
