// The guards must actually fire. Each check runs against a throw-away git
// repository under WORK/tmp (laid out like REPO: an app, a studio with frozen
// paths and the real .gitignore pattern for output/v2, and an unrelated file),
// and real edits are made there. The real frozen v2 and the real app are
// never touched. The write audit is proven on a throw-away directory tree (a
// miniature machine).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import {
  checkFrozen, checkAppTree, frozenFileSet, currentAppHashes, repoChangesOutsideStudio, isLinkedWorktree,
} from '../../render/lib/frozen.mjs';
import { formatManifest, hashFiles } from '../../render/lib/tree-hash.mjs';
import zlib from 'node:zlib';
import { auditOutsideWrites, armBaseline, readBaseline, npmCompileCache, compileCacheKey } from '../../render/lib/write-audit.mjs';

let root, repo, studio, app, frozenManifest, localManifest, appManifest;
const FROZEN = ['stage2/', 'output/v2/', 'render/render.mjs'];
// (no signing: the sandbox signs commits with a helper in /tmp, which the jail's private /tmp does not have)
const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8' });
const write = (rel, text, base = repo) => { fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true }); fs.writeFileSync(path.join(base, rel), text); };

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
  // the studio's real rule: everything in output/v2 is ignored except the whitelisted deliverables
  write('studio/.gitignore', 'output/v2/*\n!output/v2/cues.json\n');
  write('studio/stage2/renderer.js', 'export const R = 1;\n');
  write('studio/output/v2/cues.json', '{}\n');
  write('studio/output/v2/render.log', 'approved render log\n');      // ignored, but part of the frozen v2
  write('studio/render/render.mjs', '// legacy\n');
  write('studio/render/serve.mjs', '// not frozen\n');
  git('add', '-A');
  git('commit', '-qm', 'init');
  // freeze exactly as tools/golden/freeze.mjs does: tracked and untracked files in separate manifests
  const { tracked, untracked } = frozenFileSet({ studio, frozen: FROZEN });
  assert.deepEqual(untracked, ['output/v2/render.log']);
  frozenManifest = path.join(root, 'frozen.sha256');
  localManifest = path.join(root, 'frozen-local.sha256');
  appManifest = path.join(root, 'app-tree.sha256');
  fs.writeFileSync(frozenManifest, formatManifest(hashFiles(studio, tracked)));
  fs.writeFileSync(localManifest, formatManifest(hashFiles(studio, untracked)));
  fs.writeFileSync(appManifest, formatManifest(currentAppHashes(app)));
});
after(() => fs.rmSync(root, { recursive: true, force: true }));

const frozen = (dir = studio) => checkFrozen({ manifest: frozenManifest, localManifest, studio: dir, frozen: FROZEN });
const appTree = () => checkAppTree({ manifest: appManifest, appDir: app });

test('frozen guard: clean, then fires on an edit, an addition and a deletion of tracked files; ignores unfrozen files', () => {
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
  write('studio/render/serve.mjs', '// edited, but not frozen\n');
  assert.equal(frozen().ok, true);
  git('checkout', '--', 'studio/render/serve.mjs');
});

test('frozen guard sees git-ignored files: a new render pass is "added", an overwritten or deleted ignored file is caught', () => {
  const ignored = (rel) => { try { execFileSync('git', ['check-ignore', '-q', rel], { cwd: studio, stdio: 'ignore' }); return true; } catch { return false; } };
  assert.ok(ignored('output/v2/new-render.mp4') && ignored('output/v2/render.log'), 'precondition: both files are git-ignored');
  assert.ok(!ignored('output/v2/cues.json'), 'precondition: the whitelisted deliverable is not');
  write('studio/output/v2/new-render.mp4', 'pass\n');                 // what render.mjs --out output/v2 would write
  assert.deepEqual(frozen().added, ['output/v2/new-render.mp4']);
  fs.rmSync(path.join(studio, 'output/v2/new-render.mp4'));
  write('studio/output/v2/render.log', 'overwritten by a later render\n');
  assert.deepEqual(frozen().changed, ['output/v2/render.log']);
  fs.rmSync(path.join(studio, 'output/v2/render.log'));
  const r = frozen();
  assert.deepEqual([r.ok, r.missing], [false, ['output/v2/render.log']], 'deleting an ignored frozen file in the main checkout is a change');
  write('studio/output/v2/render.log', 'approved render log\n');
  assert.equal(frozen().ok, true);
});

test('frozen guard in a linked worktree: never-checked-out ignored files are not "missing", but additions and edits still fire', () => {
  const wt = path.join(root, 'wt');
  git('worktree', 'add', '-q', '--detach', wt);
  const wtStudio = path.join(wt, 'studio');
  assert.equal(isLinkedWorktree(wtStudio), true);
  assert.equal(isLinkedWorktree(studio), false);
  let r = frozen(wtStudio);
  assert.deepEqual([r.ok, r.notMaterialised, r.missing], [true, ['output/v2/render.log'], []]);
  write('output/v2/render.log', 'a new render in the worktree\n', wtStudio);
  assert.deepEqual(frozen(wtStudio).changed, ['output/v2/render.log']);
  write('output/v2/extra.wav', 'x', wtStudio);
  r = frozen(wtStudio);
  assert.deepEqual([r.ok, r.added], [false, ['output/v2/extra.wav']]);
  git('worktree', 'remove', '--force', wt);
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

test('outside-writes guard (git): reports edits, new files and renames outside the studio, never inside', () => {
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

test('write audit: fires on writes, deletions and git config changes outside the allowed places after arming; verifies npm cache entries', async () => {
  // a miniature machine: one storage root with a studio, WORK, harness dirs, a git directory, an npm install and "the rest of the disk"
  const m = path.join(root, 'machine');
  const at = (rel) => path.join(m, rel);
  for (const d of ['studio', 'work', 'harness/state', 'home/user/logs', 'tmp/agent/sess/scratchpad', 'etc', 'git/objects', 'git/hooks', 'git/worktrees/wp-01', 'wt/wp-01/src', 'npm/lib', 'tmp/node-compile-cache/v22-x']) fs.mkdirSync(at(d), { recursive: true });
  write('wt/wp-01/src/x.js', 'a linked worktree\n', m);
  write('git/worktrees/wp-01/gitdir', 'admin\n', m);
  for (const f of ['etc/old.conf', 'etc/keep.conf', 'home/user/logs/a.log', 'home/user/logs/b.log', 'home/user/logs/c.log', 'tmp/agent/sess/scratchpad/old.txt']) write(f, 'before arming\n', m);
  write('npm/lib/cli.js', 'module.exports = 1;\n', m);
  execFileSync('git', ['config', '--file', at('git/config'), 'core.bare', 'false']);
  const scope = {
    prefix: '', roots: [m], listingRoots: [m],
    allowed: [{ path: at('studio'), why: 'studio' }, { path: at('work'), why: 'WORK' }, { path: at('git/objects'), why: 'git data' }],
    externalWriters: [{ glob: at('harness'), reason: 'harness', scope: 'all' }, { glob: at('tmp/*/*'), reason: 'harness sessions', scope: 'remove' }],
  };
  scope.prune = [...scope.allowed.map((a) => a.path), at('harness')];
  scope.removable = [at('wt/wp-01'), at('git/worktrees/*')];
  const opts = { scope, configFiles: [at('git/config')], listingDir: at('work/guard') };
  await new Promise((r) => setTimeout(r, 30));
  armBaseline({ reason: 'miniature machine', file: at('work/baseline.json'), ...opts });
  await new Promise((r) => setTimeout(r, 30));
  const audit = () => auditOutsideWrites({ baseline: readBaseline(at('work/baseline.json')), attributors: [npmCompileCache({ npmRoots: [at('npm')] })], ...opts });
  const show = (a) => a.findings.map((f) => `${f.kind} ${path.relative(m, f.path)}${f.detail ? ` (${f.detail})` : ''}`);

  // allowed: inside the studio, WORK, harness state, git data; a git config rewrite with the same content
  write('studio/out.mp4', 'inside\n', m);
  write('work/seg.mp4', 'scratch\n', m);
  write('harness/state/log.json', 'harness\n', m);
  write('git/objects/ab/cdef', 'blob\n', m);
  fs.rmSync(at('tmp/agent/sess/scratchpad/old.txt'));                               // the harness tidying its session dir
  fs.rmSync(at('wt/wp-01'), { recursive: true }); fs.rmSync(at('git/worktrees/wp-01'), { recursive: true });   // git worktree remove
  execFileSync('git', ['config', '--file', at('git/config'), 'core.bare', 'false']);
  const code = fs.readFileSync(at('npm/lib/cli.js'));                                // npm's own compile cache, verified
  const head = Buffer.alloc(16); head.writeUInt32LE(0x8adfdbb2, 0); head.writeUInt32LE(code.length, 4); head.writeUInt32LE(zlib.crc32(code) >>> 0, 12);
  fs.writeFileSync(at(`tmp/node-compile-cache/v22-x/${compileCacheKey(0, at('npm/lib/cli.js'))}`), head);
  let a = audit();
  assert.deepEqual([a.ok, show(a), a.errors, a.attributed.map((x) => path.relative(m, x.source))], [true, [], [], ['npm/lib/cli.js']]);

  // findings: writes outside (an agent scratchpad included), a modified old file, a symlink, a forged cache entry,
  // a git hook, a deleted file, a deleted directory, and a git config key that can run a program
  write('home/user/stray.txt', 'outside the repository\n', m);
  write('tmp/agent/sess/scratchpad/probe.txt', 'an agent scratchpad is outside too\n', m);
  fs.appendFileSync(at('etc/old.conf'), 'modified after the baseline\n');
  fs.symlinkSync('/nowhere', at('home/user/link'));
  write('tmp/node-compile-cache/v22-x/deadbeef', 'not npm\n', m);
  write('git/hooks/pre-commit', '#!/bin/sh\n', m);
  fs.rmSync(at('etc/keep.conf'));
  fs.rmSync(at('home/user/logs'), { recursive: true });
  execFileSync('git', ['config', '--file', at('git/config'), 'core.hooksPath', '/tmp/hooks']);
  a = audit();
  assert.equal(a.ok, false);
  assert.deepEqual(show(a), [
    'deleted etc/keep.conf', 'written etc/old.conf', 'git-config git/config (core.hookspath added)', 'written git/hooks/pre-commit',
    'written home/user/link', 'deleted home/user/logs (a directory with 3 entries at arming)', 'written home/user/stray.txt',
    'written tmp/agent/sess/scratchpad/probe.txt', 'written tmp/node-compile-cache/v22-x/deadbeef',
  ]);
  // a missing or altered listing is an error, never a silent pass
  const b = readBaseline(at('work/baseline.json'));
  fs.appendFileSync(path.join(at('work/guard'), b.listing.file), 'x');
  assert.match(audit().errors.join('\n'), /altered/);
});
