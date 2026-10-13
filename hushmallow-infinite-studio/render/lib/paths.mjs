// Canonical locations shared by every studio tool, test and work package.
//
// Everything resolves relative to this file, so a git worktree of the repo
// (one per work package) gets its own STUDIO / REPO / HUSHMALLOW, while WORK
// is one shared scratch directory for large, never-committed artefacts
// (golden PNG frames, render segments, temp files) and the heavy-job locks.
//
//   STUDIO      this studio (…/hushmallow-infinite-studio)
//   REPO        the git repository root (STUDIO's parent)
//   HUSHMALLOW  the live app (…/hushmallow): READ-ONLY, never written to
//   WORK        shared scratch, default /home/user/hm-work (env HM_WORK overrides)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STUDIO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const REPO = path.dirname(STUDIO);
export const HUSHMALLOW = path.join(REPO, 'hushmallow');
export const WORK = path.resolve(process.env.HM_WORK || '/home/user/hm-work');

// Derived locations (keep the list short: add a constant only when two or more
// modules need the same place).
export const WORK_TMP = path.join(WORK, 'tmp');
export const LOCK_DIR = path.join(WORK, 'locks');
export const GOLDEN_V2 = path.join(STUDIO, 'qa', 'golden', 'v2');      // committed small golden data
export const WORK_GOLDEN_V2 = path.join(WORK, 'golden', 'v2');         // large golden artefacts (PNG frames)
export const APP_TREE_MANIFEST = path.join(STUDIO, 'qa', 'golden', 'app-tree.sha256');

// The approved v2 ("My Brain at 2 AM" v2), hash-locked in qa/golden/v2/frozen.sha256
// and tagged v2-approved. Entries ending in '/' are whole directories. Nothing
// here is ever edited: fork or copy instead (render/lib/frozen.mjs checks it).
export const FROZEN = Object.freeze([
  'stage/',                         // v1 stage: stage2 still imports its virtual clock (R19)
  'stage2/',
  'videos/my-brain-at-2am-v2.js',
  'audio/soundtrack-v2.mjs',
  'audio/soundtrack.mjs',
  'render/render.mjs',
  'render/verify.mjs',
  'assets/noomi/',
  'output/v2/',
]);

/** Studio-relative POSIX path of `p` (absolute or relative to cwd), or null if outside the studio. */
export function studioRel(p) {
  const abs = path.resolve(p);
  return isInside(abs, STUDIO) ? path.relative(STUDIO, abs).split(path.sep).join('/') : null;
}

/** True when `p` is a frozen v2 file or lies inside a frozen directory. */
export function isFrozen(p) {
  const rel = studioRel(p);
  if (rel === null) return false;
  return FROZEN.some((f) => (f.endsWith('/') ? rel === f.slice(0, -1) || rel.startsWith(f) : rel === f));
}

/** Studio-relative path → absolute. */
export const studioPath = (...p) => path.join(STUDIO, ...p);
/** WORK-relative path → absolute. */
export const workPath = (...p) => path.join(WORK, ...p);

/** True when `p` is `root` itself or lies inside it (lexically, after resolving). */
export function isInside(p, root) {
  const rel = path.relative(path.resolve(root), path.resolve(p));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Throw unless `p` is a place studio code may write to: inside STUDIO or WORK.
 * Tools call this on every output path they accept from the command line, so
 * a typo can never land a file in the live app, in the frozen v2, or
 * elsewhere on the machine. Returns the absolute path.
 */
export function assertWritable(p) {
  const abs = path.resolve(p);
  if (isInside(abs, HUSHMALLOW)) throw new Error(`refusing to write inside the live app (read-only): ${abs}`);
  if (!isInside(abs, STUDIO) && !isInside(abs, WORK)) {
    throw new Error(`refusing to write outside the studio root and ${WORK}: ${abs}`);
  }
  if (isFrozen(abs)) throw new Error(`refusing to write a frozen v2 path (fork it instead): ${studioRel(abs)}`);
  return abs;
}

/** A fresh private temp directory under WORK/tmp (never the system /tmp). */
export function mkWorkTemp(prefix = 'hm-') {
  fs.mkdirSync(WORK_TMP, { recursive: true });
  return fs.mkdtempSync(path.join(WORK_TMP, prefix));
}
