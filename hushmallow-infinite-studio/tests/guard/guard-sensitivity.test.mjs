// The guards must actually fire. Each check runs against a throw-away git
// repository under WORK/tmp (laid out like REPO: an app, a studio with frozen
// paths, and an unrelated file), and real edits are made there. The real
// frozen v2 and the real app are never touched.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { checkFrozen, checkAppTree, currentFrozenHashes, currentAppHashes, repoChangesOutsideStudio } from '../../render/lib/frozen.mjs';
import { formatManifest } from '../../render/lib/tree-hash.mjs';

let root, repo, studio, app, frozenManifest, appManifest;
const FROZEN = ['stage2/', 'output/v2/', 'render/render.mjs'];
const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo, encoding: 'utf8' });
const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true }); fs.writeFileSync(path.join(repo, rel), text); };

before(() => {
  root = mkWorkTemp('guard-sens-');
  repo = path.join(root, 'repo');
  studio = path.join(repo, 'studio');
  app = path.join(repo, 'app');
  fs.mkdirSync(repo);
  git('init', '-q');
  write('README.md', 'repo\n');
  write('app/src/registry.js', 'export const A = 1;\n');
  write('app/.gitignore', '*.pyc\n');
  write('studio/.gitignore', 'output/v2/*.log\n');
  write('studio/stage2/renderer.js', 'export const R = 1;\n');
  write('studio/output/v2/cues.json', '{}\n');
  write('studio/render/render.mjs', '// legacy\n');
  write('studio/render/serve.mjs', '// not frozen\n');
  git('add', '-A');
  git('commit', '-qm', 'init');
  frozenManifest = path.join(root, 'frozen.sha256');
  appManifest = path.join(root, 'app-tree.sha256');
  fs.writeFileSync(frozenManifest, formatManifest(currentFrozenHashes({ studio, frozen: FROZEN })));
  fs.writeFileSync(appManifest, formatManifest(currentAppHashes(app)));
});
after(() => fs.rmSync(root, { recursive: true, force: true }));

const frozen = () => checkFrozen({ manifest: frozenManifest, studio, frozen: FROZEN });
const appTree = () => checkAppTree({ manifest: appManifest, appDir: app });

test('frozen guard: clean, then fires on an edit, an addition and a deletion; ignores ignored files and unfrozen files', () => {
  assert.equal(frozen().ok, true);
  write('studio/stage2/renderer.js', 'export const R = 2;\n');
  assert.deepEqual(frozen().changed, ['stage2/renderer.js']);
  git('checkout', '--', 'studio/stage2/renderer.js');
  write('studio/stage2/new-pass.js', '//\n');
  assert.deepEqual(frozen().added, ['stage2/new-pass.js'], 'untracked additions under a frozen dir count');
  fs.rmSync(path.join(studio, 'stage2/new-pass.js'));
  fs.rmSync(path.join(studio, 'render/render.mjs'));
  assert.deepEqual(frozen().missing, ['render/render.mjs']);
  git('checkout', '--', 'studio/render/render.mjs');
  write('studio/output/v2/render.log', 'scratch\n');          // ignored by the studio .gitignore
  write('studio/render/serve.mjs', '// edited, but not frozen\n');
  assert.equal(frozen().ok, true);
});

test('app guard: fires on edits, deletions and new files (ignored ones included)', () => {
  assert.equal(appTree().ok, true);
  write('app/src/registry.js', 'export const A = 2;\n');
  assert.deepEqual(appTree().changed, ['app/src/registry.js']);
  git('checkout', '--', 'app/src/registry.js');
  write('app/src/cache.pyc', 'x');                          // git-ignored, still a write into the app
  assert.deepEqual(appTree().added, ['app/src/cache.pyc']);
  fs.rmSync(path.join(app, 'src/cache.pyc'));
  assert.equal(appTree().ok, true);
});

test('outside-writes guard: reports edits, new files and renames outside the studio, never inside', () => {
  const outside = () => repoChangesOutsideStudio({ repo, studio });
  write('studio/notes.md', 'inside is fine\n');
  assert.deepEqual(outside(), []);
  write('README.md', 'edited\n');
  write('stray.txt', 'oops\n');
  assert.deepEqual(outside().map((l) => l.slice(3)).sort(), ['README.md', 'stray.txt']);
  git('checkout', '--', 'README.md');
  fs.rmSync(path.join(repo, 'stray.txt'));
  git('mv', 'studio/render/serve.mjs', 'serve.mjs');           // a rename that leaves the studio
  assert.equal(outside().length, 1);
  git('mv', 'serve.mjs', 'studio/render/serve.mjs');
  assert.deepEqual(outside(), []);
});
