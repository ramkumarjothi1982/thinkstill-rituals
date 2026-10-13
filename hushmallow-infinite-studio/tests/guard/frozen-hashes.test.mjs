// Guard: the approved v2 never changes (qa/golden/v2/frozen.sha256).
// If this fails you edited a frozen file: revert it and fork/copy instead.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { STUDIO, FROZEN, mkWorkTemp } from '../../render/lib/paths.mjs';
import { FROZEN_MANIFEST, checkFrozen } from '../../render/lib/frozen.mjs';
import { parseManifest, formatManifest } from '../../render/lib/tree-hash.mjs';

test('every frozen v2 file matches its recorded sha256; none added, none missing', () => {
  const r = checkFrozen();
  assert.ok(r.ok, `frozen v2 changed — ${r.summary}. Revert it (git checkout -- <file>); fork instead of editing.`);
});

test('the manifest covers every frozen path, and nothing else', () => {
  const recorded = Object.keys(parseManifest(fs.readFileSync(FROZEN_MANIFEST, 'utf8')));
  for (const f of FROZEN) {
    assert.ok(recorded.some((r) => (f.endsWith('/') ? r.startsWith(f) : r === f)), `no manifest entry for frozen path ${f}`);
  }
  for (const r of recorded) {
    assert.ok(FROZEN.some((f) => (f.endsWith('/') ? r.startsWith(f) : r === f)), `${r} is in the manifest but not under a frozen path`);
  }
  for (const key of ['stage2/renderer.js', 'videos/my-brain-at-2am-v2.js', 'output/v2/my-brain-at-2am-v2.mp4', 'assets/noomi/noomi-art.png']) {
    assert.ok(recorded.includes(key), `${key} must be hash-locked`);
  }
});

test('the check is sensitive: a tampered manifest is reported as changed / missing / added', () => {
  const recorded = parseManifest(fs.readFileSync(FROZEN_MANIFEST, 'utf8'));
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
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('the v2-approved tag holds the same bytes for every frozen file it contains', (t) => {
  let tagged;
  try { tagged = execFileSync('git', ['rev-parse', '--verify', '--quiet', 'v2-approved^{commit}'], { cwd: STUDIO, encoding: 'utf8' }).trim(); } catch { tagged = null; }
  if (!tagged) { t.skip('tag v2-approved not present in this clone'); return; }
  const recorded = parseManifest(fs.readFileSync(FROZEN_MANIFEST, 'utf8'));
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
