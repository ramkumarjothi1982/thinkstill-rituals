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
import { auditOutsideWrites, armBaseline, readBaseline, npmCompileCache, compileCacheKey, allowedRoots } from '../../render/lib/write-audit.mjs';

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
  // a linked worktree checked out inside the repository (as the agent harness does under .claude/worktrees/)
  // is another checkout with its own guards, not a write; anything else next to it still is
  git('worktree', 'add', '-q', '--detach', path.join(repo, '.claude/worktrees/wp-x'));
  assert.deepEqual(outside(), []);
  write('.claude/notes.txt', 'not a worktree\n');
  assert.deepEqual(outside().map((l) => l.slice(3)), ['.claude/notes.txt']);
  fs.rmSync(path.join(repo, '.claude/notes.txt'));
  git('worktree', 'remove', '--force', path.join(repo, '.claude/worktrees/wp-x'));
  fs.rmSync(path.join(repo, '.claude'), { recursive: true, force: true });
  assert.deepEqual(outside(), []);
});

test('write audit: fires on writes, deletions and git config changes outside the allowed places after arming; verifies npm cache entries', async () => {
  // a miniature machine: one storage root with a studio, WORK, harness dirs, a git directory, an npm install and "the rest of the disk"
  const m = path.join(root, 'machine');
  const at = (rel) => path.join(m, rel);
  for (const d of ['studio', 'work', 'harness/state', 'home/user/logs', 'tmp/agent/sess/scratchpad', 'tmp/agent/old-sess/scratchpad', 'etc', 'git/objects', 'git/hooks', 'git/worktrees/wp-01', 'wt/wp-01/src', 'npm/lib', 'tmp/node-compile-cache/v22-x']) fs.mkdirSync(at(d), { recursive: true });
  write('wt/wp-01/src/x.js', 'a linked worktree\n', m);
  write('git/worktrees/wp-01/gitdir', 'admin\n', m);
  for (const f of ['etc/old.conf', 'etc/keep.conf', 'home/user/logs/a.log', 'home/user/logs/b.log', 'home/user/logs/c.log', 'tmp/agent/sess/scratchpad/old.txt', 'tmp/agent/old-sess/scratchpad/x.png']) write(f, 'before arming\n', m);
  write('npm/lib/cli.js', 'module.exports = 1;\n', m);
  execFileSync('git', ['config', '--file', at('git/config'), 'core.bare', 'false']);
  const scope = {
    prefix: '', roots: [m], listingRoots: [m],
    allowed: [{ path: at('studio'), why: 'studio' }, { path: at('work'), why: 'WORK' }, { path: at('git/objects'), why: 'git data' }],
    externalWriters: [{ glob: at('harness'), reason: 'harness', scope: 'all' }, { glob: at('tmp/*/*'), reason: 'harness sessions', scope: 'remove' }, { glob: at('tmp/*/*/scratchpad'), reason: 'scratchpad dir', scope: 'remove' }],
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
  fs.rmSync(at('tmp/agent/old-sess'), { recursive: true });                          // the harness removing an old session directory
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
  fs.rmSync(at('tmp/agent/sess/scratchpad/old.txt'));                               // a file in a live session's scratchpad (FU-1 round 2: not exempt)
  execFileSync('git', ['config', '--file', at('git/config'), 'core.hooksPath', '/tmp/hooks']);
  a = audit();
  assert.equal(a.ok, false);
  assert.deepEqual(show(a), [
    'deleted etc/keep.conf', 'written etc/old.conf', 'git-config git/config (core.hookspath added)', 'written git/hooks/pre-commit',
    'written home/user/link', 'deleted home/user/logs (a directory with 3 entries at arming)', 'written home/user/stray.txt',
    'deleted tmp/agent/sess/scratchpad/old.txt', 'written tmp/agent/sess/scratchpad/probe.txt', 'written tmp/node-compile-cache/v22-x/deadbeef',
  ]);
  // a missing or altered listing is an error, never a silent pass
  const b = readBaseline(at('work/baseline.json'));
  fs.appendFileSync(path.join(at('work/guard'), b.listing.file), 'x');
  assert.match(audit().errors.join('\n'), /altered/);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('write audit: a file created and deleted again leaves a touched directory; new directories and metadata changes are reported; harness, git and worktree churn is not', async () => {
  // FU-1. A second miniature machine with a git checkout laid out as the real one (top level, .git, linked worktrees
  // under .claude/worktrees), the harness's places, and directories studio work could stray into.
  const m = path.join(root, 'machine2');
  const at = (rel) => path.join(m, rel);
  for (const d of ['studio', 'work', 'home/user', 'etc', 'srv', 'root', 'tmp/agent/sess/scratchpad', 'repo/.git/objects', 'repo/.claude/worktrees/wf0/src', 'repo/.git/worktrees/wf0']) fs.mkdirSync(at(d), { recursive: true });
  for (const f of ['home/user/keep.txt', 'etc/a.conf', 'srv/data', 'root/.claude.json', 'repo/.claude/worktrees/wf0/src/x.js', 'repo/.git/worktrees/wf0/HEAD', 'repo/.git/HEAD']) write(f, 'before arming\n', m);
  const layoutWith = (worktrees) => ({
    gitDir: at('repo/.git'), top: at('repo'), mainTop: at('repo'),
    worktreeDirs: worktrees.map((w) => at(`repo/.git/worktrees/${w}`)), otherWorktrees: worktrees.map((w) => at(`repo/.claude/worktrees/${w}`)),
  });
  const scopeFor = (layout) => {
    const allowed = allowedRoots({ studio: at('studio'), work: at('work'), layout });
    const externalWriters = [                                                           // as EXTERNAL_WRITERS has them
      { glob: at('root/.claude.json'), reason: 'harness config, rewritten atomically', scope: 'all' },
      { glob: at('tmp/*/*/tasks'), reason: 'harness task output', scope: 'all' },
      { glob: at('tmp/*/*'), reason: 'harness session directories', scope: 'remove' },
      { glob: at('tmp/*/*/scratchpad'), reason: 'harness scratchpad directory', scope: 'remove' },
      { glob: at('tmp'), reason: 'harness cwd files', scope: 'touch' },
    ];
    return {
      prefix: '', roots: [m], listingRoots: [m], layout, allowed, externalWriters, worktrees: layout.otherWorktrees,
      prune: [...allowed.map((a) => a.path), at('root/.claude.json')], removable: [...layout.otherWorktrees, path.join(layout.gitDir, 'worktrees')],
    };
  };
  const arm = async (layout, file) => { await sleep(60); armBaseline({ reason: 'miniature machine 2', file, scope: scopeFor(layout), configFiles: [], listingDir: at('work/guard') }); await sleep(60); };
  const audit = (layout, file) => auditOutsideWrites({ baseline: readBaseline(file), scope: scopeFor(layout), configFiles: [], listingDir: at('work/guard'), attributors: [] });
  const show = (a) => a.findings.map((f) => `${f.kind} ${path.relative(m, f.path)}${f.detail ? ` (${f.detail})` : ''}`);
  const b1 = at('work/b1.json');
  await arm(layoutWith(['wf0']), b1);

  // silent: the harness rewrites its config atomically and creates and deletes its cwd file in tmp; a new harness session;
  // git takes and drops its index lock; a worktree is added and removed; then the last one goes, with its containers
  write('root/.claude.json.tmp', 'new\n', m); fs.renameSync(at('root/.claude.json.tmp'), at('root/.claude.json'));
  write('tmp/claude-ab12-cwd', '/x\n', m); fs.rmSync(at('tmp/claude-ab12-cwd'));
  fs.mkdirSync(at('tmp/agent/sess2/scratchpad'), { recursive: true }); fs.mkdirSync(at('tmp/agent/sess2/tasks'));
  write('repo/.git/index.lock', 'x', m); fs.rmSync(at('repo/.git/index.lock'));
  write('repo/.claude/worktrees/wf1/src/y.js', 'a worktree\n', m); write('repo/.git/worktrees/wf1/HEAD', 'x\n', m);
  for (const d of ['repo/.claude/worktrees/wf1', 'repo/.git/worktrees/wf1', 'repo/.claude/worktrees/wf0', 'repo/.git/worktrees/wf0']) fs.rmSync(at(d), { recursive: true });
  fs.rmSync(at('repo/.claude'), { recursive: true }); fs.rmSync(at('repo/.git/worktrees'), { recursive: true });
  let a = audit(layoutWith([]), b1);
  assert.deepEqual([show(a), a.errors], [[], []]);
  // a worktree added after arming (its containers are created again), whose own index lock is taken and dropped later
  write('repo/.claude/worktrees/wf3/src/w.js', 'a worktree\n', m); write('repo/.git/worktrees/wf3/HEAD', 'x\n', m);
  await sleep(60);
  write('repo/.git/worktrees/wf3/index.lock', 'x', m); fs.rmSync(at('repo/.git/worktrees/wf3/index.lock'));
  a = audit(layoutWith(['wf3']), b1);
  assert.deepEqual([show(a), a.errors], [[], []]);

  // reported: a directory created first, then (after it) a file created and deleted in home/user; one in the agent's
  // scratchpad (a harness place, but touching it is not the harness's); a new empty directory; a chmod
  fs.mkdirSync(at('home/user/tmpdir')); write('home/user/tmpdir/f', 'x', m); fs.rmSync(at('home/user/tmpdir/f'));
  fs.mkdirSync(at('etc/newdir'));
  await sleep(60);
  write('home/user/probe.txt', 'created and deleted again\n', m); fs.rmSync(at('home/user/probe.txt'));
  write('tmp/agent/sess/scratchpad/p.txt', 'x', m); fs.rmSync(at('tmp/agent/sess/scratchpad/p.txt'));
  fs.chmodSync(at('srv'), 0o700);
  a = audit(layoutWith(['wf3']), b1);
  assert.equal(a.ok, false);
  assert.deepEqual(show(a), [
    'created etc/newdir (a new directory)',
    'touched home/user (changed with nothing left to show for it: a file or directory created and deleted again)',
    'created home/user/tmpdir (a new directory)',
    'touched srv (its mode, owner or attributes changed)',
    'touched tmp/agent/sess/scratchpad (changed with nothing left to show for it: a file or directory created and deleted again)',
  ]);

  // a worktree container that held anything else at arming is not housekeeping: its removal is a deletion
  write('repo/.claude/worktrees/wf2/src/z.js', 'a worktree\n', m); write('repo/.git/worktrees/wf2/HEAD', 'x\n', m);
  write('repo/.claude/settings.json', '{}\n', m);
  const b2 = at('work/b2.json');
  await arm(layoutWith(['wf2', 'wf3']), b2);
  for (const d of ['repo/.claude', 'repo/.git/worktrees']) fs.rmSync(at(d), { recursive: true });
  a = audit(layoutWith([]), b2);
  assert.deepEqual(show(a).filter((l) => l.startsWith('deleted')), ['deleted repo/.claude (a directory with 2 entries at arming)']);
});

test('write audit (FU-1 round 2): exempt places are exact paths, a removal explains only its owner\'s directory, the checkout\'s top level is audited, and a subdirectory\'s own churn explains nothing', async () => {
  // A third miniature machine laid out like the real one: WORK inside home/user, the checkout (top level, .git, the
  // studio) and the harness's session directories with a scratchpad holding files from an earlier phase.
  const m = path.join(root, 'machine3');
  const at = (rel) => path.join(m, rel);
  for (const d of ['repo/studio', 'repo/.git/objects', 'home/user/work/guard', 'tmp/agent/sess/scratchpad', 'tmp/agent/old-sess/scratchpad', 'etc', 'srv', 'root']) fs.mkdirSync(at(d), { recursive: true });
  for (const f of ['home/user/keep.txt', 'repo/README.md', 'repo/.git/HEAD', 'tmp/agent/sess/scratchpad/old.txt', 'tmp/agent/sess/scratchpad/aq1.png',
    'tmp/agent/old-sess/scratchpad/m1.py', 'etc/app.conf', 'srv/data']) write(f, 'before arming\n', m);
  const layout = { gitDir: at('repo/.git'), top: at('repo'), mainTop: at('repo'), worktreeDirs: [], otherWorktrees: [] };
  const allowed = allowedRoots({ studio: at('repo/studio'), work: at('home/user/work'), layout });
  const scope = () => ({
    prefix: '', roots: [m], listingRoots: [m], layout, allowed, worktrees: [], removable: [path.join(layout.gitDir, 'worktrees')],
    prune: allowed.map((a) => a.path),
    externalWriters: [
      { glob: at('tmp/*/*/tasks'), reason: 'harness task output', scope: 'all' },
      { glob: at('tmp/*/*'), reason: 'harness session directories', scope: 'remove' },
      { glob: at('tmp/*/*/scratchpad'), reason: 'harness scratchpad directory', scope: 'remove' },
      { glob: at('tmp'), reason: 'harness cwd files', scope: 'touch' },
    ],
  });
  const file = at('home/user/work/b.json');
  await sleep(60);
  armBaseline({ reason: 'miniature machine 3', file, scope: scope(), configFiles: [], listingDir: at('home/user/work/guard') });
  await sleep(60);
  const audit = () => auditOutsideWrites({ baseline: readBaseline(file), scope: scope(), configFiles: [], listingDir: at('home/user/work/guard'), attributors: [] });
  const show = () => audit().findings.map((f) => `${f.kind} ${path.relative(m, f.path)}`);

  // silent: an atomic replace (write a temporary file, rename it over) and a hard link; the harness removes an old session
  // and starts a new one (session dir, scratchpad, tasks); git's index lock; a new job directory in WORK
  write('etc/app.conf.tmp', 'new\n', m); fs.renameSync(at('etc/app.conf.tmp'), at('etc/app.conf'));
  fs.linkSync(at('srv/data'), at('srv/data.bak'));
  fs.rmSync(at('tmp/agent/old-sess'), { recursive: true });
  fs.mkdirSync(at('tmp/agent/new-sess/scratchpad'), { recursive: true }); fs.mkdirSync(at('tmp/agent/new-sess/tasks'));
  write('repo/.git/index.lock', 'x', m); fs.rmSync(at('repo/.git/index.lock'));
  fs.mkdirSync(at('home/user/work/job-1'));
  assert.deepEqual(show(), ['written etc/app.conf', 'written srv/data', 'written srv/data.bak'], 'only the replaced and linked files themselves');
  await sleep(60);
  // the documented limit: once the owner removed a session from tmp/agent, a create-then-delete there is masked (until re-arm)
  write('tmp/agent/stray', 'x', m); fs.rmSync(at('tmp/agent/stray'));
  assert.ok(!show().some((l) => l.endsWith(' tmp/agent')));
  await sleep(60);

  // reported (the verifier's probes): a new empty directory in the scratchpad (W1) and directly in a session directory;
  // a create-then-delete in the checkout's top level (W2); a scratchpad file from the earlier phase deleted (W3); a
  // create-then-delete in home/user followed at once by a new job directory in WORK (W4); one in etc followed at once by
  // a write into an existing file there; one in a NEW session directory's scratchpad
  fs.mkdirSync(at('tmp/agent/sess/scratchpad/newdir'));
  fs.mkdirSync(at('tmp/agent/sess/other'));
  write('repo/stray.tmp', 'x', m); fs.rmSync(at('repo/stray.tmp'));
  fs.rmSync(at('tmp/agent/sess/scratchpad/old.txt'));
  write('home/user/stray.txt', 'x', m); fs.rmSync(at('home/user/stray.txt')); fs.mkdirSync(at('home/user/work/new-job'));
  write('etc/stray', 'x', m); fs.rmSync(at('etc/stray')); fs.appendFileSync(at('etc/app.conf'), 'more\n');
  write('tmp/agent/new-sess/scratchpad/p', 'x', m); fs.rmSync(at('tmp/agent/new-sess/scratchpad/p'));
  assert.deepEqual(show(), [
    'touched etc', 'written etc/app.conf', 'touched home/user', 'touched repo', 'written srv/data', 'written srv/data.bak',
    'touched tmp/agent/new-sess/scratchpad', 'created tmp/agent/sess/other', 'created tmp/agent/sess/scratchpad/newdir',
    'deleted tmp/agent/sess/scratchpad/old.txt',
  ]);
  // the top level's finding names the one legitimate cause the audit cannot see (a worktree lifecycle between two arms)
  assert.match(audit().findings.find((f) => f.path === at('repo')).detail, /linked worktree's \.claude\/ created and removed since arming/);
});
