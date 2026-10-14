// Guard: the approved v2 never changes. Every file on disk under the frozen
// paths, git-ignored ones included, is locked in qa/golden/v2/frozen.sha256
// (tracked) or qa/golden/v2/frozen-local.sha256 (untracked: the ignored render
// pass and logs of the approved render).
// If this fails you edited, added or deleted a frozen file: revert it and
// fork/copy instead.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { STUDIO, FROZEN, mkWorkTemp } from '../../render/lib/paths.mjs';
import { FROZEN_MANIFEST, FROZEN_LOCAL_MANIFEST, checkFrozen, frozenFileSet } from '../../render/lib/frozen.mjs';
import { parseManifest, formatManifest } from '../../render/lib/tree-hash.mjs';

const read = (f) => parseManifest(fs.readFileSync(f, 'utf8'));
const underFrozen = (r) => FROZEN.some((f) => (f.endsWith('/') ? r.startsWith(f) : r === f));

test('every frozen v2 file matches its recorded sha256; none added, none missing (ignored files included)', (t) => {
  const r = checkFrozen();
  if (r.notMaterialised.length) t.diagnostic(`linked worktree: ${r.notMaterialised.length} local-only files not checked out here (${r.notMaterialised.join(', ')})`);
  assert.ok(r.ok, `frozen v2 changed — ${r.summary}. Revert it (git checkout -- <file>, or delete what you added); fork instead of editing.`);
});

test('the manifests cover every frozen path and nothing else, and never list a file twice', () => {
  const tracked = Object.keys(read(FROZEN_MANIFEST));
  const local = Object.keys(read(FROZEN_LOCAL_MANIFEST));
  for (const f of FROZEN) {
    assert.ok(tracked.some((r) => (f.endsWith('/') ? r.startsWith(f) : r === f)), `no manifest entry for frozen path ${f}`);
  }
  for (const r of [...tracked, ...local]) assert.ok(underFrozen(r), `${r} is in a manifest but not under a frozen path`);
  assert.deepEqual(local.filter((r) => tracked.includes(r)), []);
  for (const key of ['stage2/renderer.js', 'videos/my-brain-at-2am-v2.js', 'output/v2/my-brain-at-2am-v2.mp4', 'assets/noomi/noomi-art.png']) {
    assert.ok(tracked.includes(key), `${key} must be hash-locked (tracked)`);
  }
  // the approved render's ignored artefacts: git cannot see them, the lock must
  for (const key of ['output/v2/my-brain-at-2am-v2.video.mp4', 'output/v2/render.log', 'output/v2/test.wav']) {
    assert.ok(local.includes(key), `${key} must be hash-locked (local)`);
  }
});

test('the frozen file set is read from disk, not from git: ignored files under output/v2 are in it', (t) => {
  const { untracked } = frozenFileSet();
  const ignored = execFileSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', 'output/v2'], { cwd: STUDIO, encoding: 'utf8' })
    .split('\0').filter(Boolean);
  t.diagnostic(`git-ignored files under output/v2: ${ignored.length}; untracked files the guard hashes: ${untracked.length}`);
  for (const f of ignored) assert.ok(untracked.includes(f), `${f} is git-ignored but invisible to the frozen guard`);
});

test('the check is sensitive: a tampered manifest is reported as changed / missing / added', () => {
  const recorded = read(FROZEN_MANIFEST);
  const keys = Object.keys(recorded);
  const d = mkWorkTemp('frozen-');
  try {
    const tampered = { ...recorded, [keys[0]]: '0'.repeat(64), 'stage2/ghost.js': 'f'.repeat(64) };
    delete tampered[keys[1]];
    const file = path.join(d, 'frozen.sha256');
    fs.writeFileSync(file, formatManifest(tampered));
    const r = checkFrozen({ manifest: file });
    assert.equal(r.ok, false);
    assert.deepEqual(r.changed, [keys[0]]);
    assert.deepEqual(r.missing, ['stage2/ghost.js']);
    assert.deepEqual(r.added, [keys[1]]);
    // and the same for the local manifest (only meaningful where the local files exist)
    if (!r.linkedWorktree) {
      const local = read(FROZEN_LOCAL_MANIFEST);
      const [first] = Object.keys(local);
      const lfile = path.join(d, 'frozen-local.sha256');
      fs.writeFileSync(lfile, formatManifest({ ...local, [first]: '0'.repeat(64) }));
      assert.deepEqual(checkFrozen({ localManifest: lfile }).changed, [first]);
    }
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('the v2-approved tag holds the same bytes for every tracked frozen file it contains', (t) => {
  let tagged;
  try { tagged = execFileSync('git', ['rev-parse', '--verify', '--quiet', 'v2-approved^{commit}'], { cwd: STUDIO, encoding: 'utf8' }).trim(); } catch { tagged = null; }
  if (!tagged) { t.skip('tag v2-approved not present in this clone'); return; }
  const recorded = read(FROZEN_MANIFEST);
  const studioInRepo = path.basename(STUDIO);
  const inTag = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', tagged, '--', '.'], { cwd: STUDIO, encoding: 'utf8' })
    .split('\n').filter(Boolean));
  let compared = 0;
  for (const [rel, hash] of Object.entries(recorded)) {
    if (!inTag.has(rel)) continue;              // ls-tree from the studio cwd prints studio-relative paths
    const blob = execFileSync('git', ['cat-file', 'blob', `${tagged}:${studioInRepo}/${rel}`], { cwd: STUDIO, maxBuffer: 256 << 20 });
    assert.equal(execFileSync('sha256sum', [], { input: blob, encoding: 'utf8' }).split(' ')[0], hash, `${rel} differs from v2-approved`);
    compared++;
  }
  t.diagnostic(`${compared}/${Object.keys(recorded).length} frozen files compared against v2-approved (${tagged.slice(0, 12)})`);
  assert.ok(compared >= Object.keys(recorded).length - 1, 'at most the later preview copy may be absent from the tag');
});
