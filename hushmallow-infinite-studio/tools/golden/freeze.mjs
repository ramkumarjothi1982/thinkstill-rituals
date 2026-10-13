// Record the hash-locks (run once, in WP-00; re-running is a deliberate act).
//
//   node tools/golden/freeze.mjs            write both manifests if they do not exist yet
//   node tools/golden/freeze.mjs --check    verify both against the current tree (exit 1 on drift)
//   node tools/golden/freeze.mjs --force    overwrite: only with an owner-approved reason, since it
//                                           silently re-defines "approved v2" / "untouched app"
//
// Writes qa/golden/v2/frozen.sha256 (every git-tracked file under paths.FROZEN)
// and qa/golden/app-tree.sha256 (every file of ../hushmallow, REPO-relative).

import path from 'node:path';
import { STUDIO, APP_TREE_MANIFEST } from '../../render/lib/paths.mjs';
import {
  FROZEN_MANIFEST, frozenFileSet, currentFrozenHashes, currentAppHashes, writeManifest, checkFrozen, checkAppTree,
} from '../../render/lib/frozen.mjs';

const args = process.argv.slice(2);
const rel = (f) => path.relative(STUDIO, f);

if (args.includes('--check')) {
  const f = checkFrozen(), a = checkAppTree();
  console.log(`frozen v2: ${f.ok ? 'OK' : `DRIFT — ${f.summary}`}  (tree ${f.treeHash})`);
  console.log(`live app:  ${a.ok ? 'OK' : `DRIFT — ${a.summary}`}  (tree ${a.treeHash})`);
  process.exitCode = f.ok && a.ok ? 0 : 1;
} else {
  const force = args.includes('--force');
  const { untracked } = frozenFileSet();
  if (untracked.length) throw new Error(`untracked files under frozen paths (commit or delete them first): ${untracked.join(', ')}`);
  const frozen = currentFrozenHashes();
  const app = currentAppHashes();
  console.log(`${rel(FROZEN_MANIFEST)}: ${Object.keys(frozen).length} files, tree ${writeManifest(FROZEN_MANIFEST, frozen, { force })}`);
  console.log(`${rel(APP_TREE_MANIFEST)}: ${Object.keys(app).length} files, tree ${writeManifest(APP_TREE_MANIFEST, app, { force })}`);
}
