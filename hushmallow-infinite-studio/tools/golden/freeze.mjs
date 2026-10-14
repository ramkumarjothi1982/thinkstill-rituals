// Record the hash-locks (run in WP-00; re-running is a deliberate act).
//
//   node tools/golden/freeze.mjs            write each manifest that does not exist yet (existing ones are kept)
//   node tools/golden/freeze.mjs --check    verify all of them against the current tree (exit 1 on drift)
//   node tools/golden/freeze.mjs --force    overwrite: only with an owner-approved reason, since it
//                                           silently re-defines "approved v2" / "untouched app"
//
// Writes
//   qa/golden/v2/frozen.sha256        every git-tracked file under paths.FROZEN
//   qa/golden/v2/frozen-local.sha256  every file on disk under paths.FROZEN that git does not track
//                                     (ignored render passes and logs of the approved render)
//   qa/golden/app-tree.sha256         every file of ../hushmallow, REPO-relative
// Freeze from the main checkout (where v2 was rendered): a linked worktree
// has no ignored files, so it would record an empty frozen-local manifest.

import fs from 'node:fs';
import path from 'node:path';
import { STUDIO, APP_TREE_MANIFEST } from '../../render/lib/paths.mjs';
import { hashFiles } from '../../render/lib/tree-hash.mjs';
import { confine } from '../../render/lib/write-jail.mjs';
import {
  FROZEN_MANIFEST, FROZEN_LOCAL_MANIFEST, frozenFileSet, currentAppHashes, writeManifest, checkFrozen, checkAppTree,
  isLinkedWorktree,
} from '../../render/lib/frozen.mjs';

await confine();                       // re-run inside the write jail (frozen paths read-only)

const args = process.argv.slice(2);
const rel = (f) => path.relative(STUDIO, f);

if (args.includes('--check')) {
  const f = checkFrozen(), a = checkAppTree();
  const extra = f.notMaterialised.length ? ` (${f.notMaterialised.length} local-only files not in this linked worktree)` : '';
  console.log(`frozen v2: ${f.ok ? 'OK' : `DRIFT — ${f.summary}`}  (tree ${f.treeHash}, local ${f.localTreeHash})${extra}`);
  console.log(`live app:  ${a.ok ? 'OK' : `DRIFT — ${a.summary}`}  (tree ${a.treeHash})`);
  process.exitCode = f.ok && a.ok ? 0 : 1;
} else {
  const force = args.includes('--force');
  if (isLinkedWorktree()) throw new Error('freeze from the main checkout: a linked worktree has no ignored files to lock');
  const { tracked, untracked } = frozenFileSet();
  const present = tracked.filter((r) => fs.existsSync(path.join(STUDIO, r)));
  if (present.length !== tracked.length) throw new Error(`tracked frozen files missing on disk: ${tracked.filter((r) => !present.includes(r)).join(', ')}`);
  const plan = [
    [FROZEN_MANIFEST, () => hashFiles(STUDIO, tracked)],
    [FROZEN_LOCAL_MANIFEST, () => hashFiles(STUDIO, untracked)],
    [APP_TREE_MANIFEST, () => currentAppHashes()],
  ];
  for (const [file, compute] of plan) {
    if (fs.existsSync(file) && !force) { console.log(`${rel(file)}: exists, kept (re-freezing needs --force)`); continue; }
    const map = compute();
    console.log(`${rel(file)}: ${Object.keys(map).length} files, tree ${writeManifest(file, map, { force })}`);
    if (file === FROZEN_LOCAL_MANIFEST) for (const r of Object.keys(map)) console.log(`  local-only: ${r}`);
  }
}
