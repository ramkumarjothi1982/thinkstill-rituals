// Guard: the live app (../hushmallow) is read-only for the studio. Every file
// on disk is compared with qa/golden/app-tree.sha256 (ignored files included).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { HUSHMALLOW, APP_TREE_MANIFEST, mkWorkTemp } from '../../render/lib/paths.mjs';
import { checkAppTree } from '../../render/lib/frozen.mjs';
import { parseManifest, formatManifest } from '../../render/lib/tree-hash.mjs';

test('no file under ../hushmallow was added, removed or changed', (t) => {
  const r = checkAppTree();
  t.diagnostic(`app tree ${r.treeHash}`);
  assert.ok(r.ok, `the live app changed — ${r.summary}. The app is read-only: restore it (git checkout -- ../hushmallow) and patch in memory instead.`);
});

test('the recorded tree covers the whole app (registry, audio engine, fonts, hi-res art)', () => {
  const keys = Object.keys(parseManifest(fs.readFileSync(APP_TREE_MANIFEST, 'utf8')));
  assert.ok(keys.length >= 200, `only ${keys.length} files recorded`);
  for (const k of ['hushmallow/src/mallows/registry.js', 'hushmallow/src/engine/audio.js', 'hushmallow/assets/fonts/fredoka-latin.woff2', 'hushmallow/assets/source/hires/noomi.webp']) {
    assert.ok(keys.includes(k), `${k} must be in the app tree`);
  }
  assert.ok(keys.every((k) => k.startsWith('hushmallow/') && !k.includes('/.git/')));
});

test('the check is sensitive to edits, deletions and new files', () => {
  const recorded = parseManifest(fs.readFileSync(APP_TREE_MANIFEST, 'utf8'));
  const keys = Object.keys(recorded);
  const d = mkWorkTemp('app-tree-');
  try {
    const tampered = { ...recorded, [keys[3]]: 'a'.repeat(64), 'hushmallow/src/ghost.js': 'b'.repeat(64) };
    delete tampered[keys[5]];
    const file = path.join(d, 'app-tree.sha256');
    fs.writeFileSync(file, formatManifest(tampered));
    const r = checkAppTree({ manifest: file, appDir: HUSHMALLOW });
    assert.equal(r.ok, false);
    assert.deepEqual([r.changed, r.missing, r.added], [[keys[3]], ['hushmallow/src/ghost.js'], [keys[5]]]);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
