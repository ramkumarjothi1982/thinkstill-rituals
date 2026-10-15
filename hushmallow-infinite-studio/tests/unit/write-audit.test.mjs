// write-audit: globs, the exemption list, storage roots, the baseline file,
// and scanning through a host-view prefix. (The end-to-end sensitivity test
// lives in tests/guard/guard-sensitivity.test.mjs.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mkWorkTemp, STUDIO, WORK, isInside } from '../../render/lib/paths.mjs';
import { parseMountinfo } from '../../render/lib/write-jail.mjs';
import { spawnSync, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import {
  globToRegExp, coveredBy, EXTERNAL_WRITERS, storageRoots, readBaseline, armBaseline, scanChanged, snapshotListing, readListing,
  compileCacheKey, npmCompileCache, findNpmRoots, gitConfigEntries, gitConfigChanges, gitLayout, allowedRoots, gitConfigFiles,
  matchesExactly, worktreePlaces, auditScope, TOUCH_EPS_MS,
} from '../../render/lib/write-audit.mjs';

test('globToRegExp: * stays within one path segment, other characters are literal', () => {
  const re = globToRegExp('/tmp/claude-*/x.json');
  assert.ok(re.test('/tmp/claude-0/x.json'));
  assert.ok(!re.test('/tmp/claude-0/a/x.json'));
  assert.ok(!re.test('/tmp/claude-0/xxjson'));
});

test('coveredBy matches a path or any of its ancestors', () => {
  const pats = [{ glob: '/tmp/claude-*/*/*/tasks', reason: 'r' }];
  assert.ok(coveredBy('/tmp/claude-0/proj/sess/tasks/b1.output', pats));
  assert.equal(coveredBy('/tmp/claude-0/proj/sess/scratchpad/tasks/x', pats), null);
});

test('the exemption list is narrow: every entry has a reason, and none covers places studio work could stray into', () => {
  for (const x of EXTERNAL_WRITERS) assert.ok(x.reason.length > 5, `${x.glob} needs a reason`);
  const stray = ['/home/user/x.txt', '/home/user/thinkstill-rituals/x', '/root/x', '/root/.cache/x', '/tmp/x', '/tmp/hm/x', '/var/tmp/x',
    '/dev/shm/x', '/etc/x.conf', '/usr/local/lib/x', '/tmp/claude-0/proj/sess/scratchpad/probe.txt', '/tmp/claude-0/x', STUDIO + '/../x'];
  const writes = EXTERNAL_WRITERS.filter((x) => x.scope === 'all');
  for (const p of stray) assert.equal(coveredBy(path.resolve(p), writes), null, `${p} must not be exempt`);
  for (const p of [STUDIO, WORK]) assert.equal(coveredBy(p, EXTERNAL_WRITERS), null);
  // create/remove-only entries: just the harness's own session directories and the scratchpad directory itself, by exact
  // path (FU-1 round 2): a file or directory inside a scratchpad is never covered
  const remove = EXTERNAL_WRITERS.filter((x) => x.scope === 'remove');
  assert.deepEqual(remove.map((x) => x.glob), ['/tmp/claude-*/*/*', '/tmp/claude-*/*/*/scratchpad']);
  for (const p of ['/tmp/claude-0/proj/sess', '/tmp/claude-0/proj/sess/scratchpad']) assert.ok(matchesExactly(p, remove), p);
  for (const p of ['/tmp/claude-0/proj/sess/scratchpad/old.txt', '/tmp/claude-0/proj/sess/scratchpad/newdir', '/tmp/claude-0/proj/sess/other', '/tmp/claude-0/proj', '/tmp/x']) {
    assert.ok(!matchesExactly(p, remove), `${p} must not be exempt`);
  }
  for (const p of ['/tmp/x', '/home/user/x', '/root/.npm/_logs/x.log', '/tmp/claude-0/x']) assert.equal(coveredBy(p, writes), null, `${p} must not be exempt`);
  // touch-only entries: just /tmp ITSELF (the harness's per-command cwd file), never anything below it
  const touch = EXTERNAL_WRITERS.filter((x) => x.scope === 'touch');
  assert.deepEqual(touch.map((x) => x.glob), ['/tmp']);
  assert.ok(matchesExactly('/tmp', touch));
  for (const p of ['/tmp/claude-0', '/tmp/claude-0/proj/sess/scratchpad', '/tmp/x', '/home/user', '/']) assert.ok(!matchesExactly(p, touch), `${p} must not be touch-exempt`);
});

test('worktree places: git\'s and the harness\'s worktree containers may be created and emptied; only the git directory and admin dirs may churn', () => {
  const layout = { gitDir: '/repo/.git', top: '/repo', mainTop: '/repo', worktreeDirs: [], otherWorktrees: ['/repo/.claude/worktrees/wf-1', '/repo/deep/wt/x'] };
  const w = worktreePlaces(layout, ['/repo/.claude/worktrees/wf-0']);
  for (const p of ['/repo/.git/worktrees', '/repo/.git/worktrees/wf-1', '/repo/.claude', '/repo/.claude/worktrees', '/repo/deep', '/repo/deep/wt']) assert.ok(matchesExactly(p, w.places), p);
  for (const p of ['/repo', '/repo/.git', '/repo/.git/hooks', '/repo/hushmallow-infinite-studio', '/repo/.claude/settings.json', '/repo/.git/worktrees/wf-1/hooks']) assert.ok(!matchesExactly(p, w.places), `${p} is not a worktree place`);
  // the git directory and each worktree's admin directory change with nothing left behind (lock files); the checkout's top
  // level and the worktree containers do not (FU-1 round 2): a create-then-delete there is a finding
  for (const p of ['/repo/.git', '/repo/.git/worktrees/wf-1']) assert.ok(matchesExactly(p, w.touch), p);
  for (const p of ['/repo', '/repo/.claude', '/repo/.claude/worktrees', '/repo/.git/worktrees', '/repo/.git/hooks', '/repo/deep']) assert.ok(!matchesExactly(p, w.touch), `${p} must not be touch-exempt`);
  assert.deepEqual(worktreePlaces(undefined), { places: [], touch: [] });
});

test('gitLayout names the main checkout, and the real audit scope carries it (for the worktree places)', () => {
  const layout = gitLayout();
  assert.ok(layout.top && layout.mainTop && isInside(STUDIO, layout.top));
  const s = auditScope({ layout });
  assert.equal(s.layout, layout);
  assert.ok(s.removable.includes(path.join(layout.gitDir, 'worktrees')), 'git removes <git>/worktrees itself when the last worktree goes');
  assert.ok(TOUCH_EPS_MS >= 10 && TOUCH_EPS_MS <= 25, 'about three times the worst gap measured under load (6.1 ms), no wider');
});

test('storageRoots: writable storage mounts only (no kernel filesystems, no read-only mounts, nothing under /proc or /sys)', () => {
  const t = parseMountinfo([
    '1 0 0:1 / / rw - ext4 a rw', '2 1 0:2 / /dev rw - devtmpfs d rw', '3 2 0:3 / /dev/shm rw - tmpfs t rw',
    '4 2 0:4 / /dev/pts rw - devpts p rw', '5 1 0:5 / /proc rw - proc p rw', '6 1 0:6 / /sys/fs/cgroup rw - tmpfs t rw',
    '7 1 0:7 / /opt/x ro - squashfs s ro', '8 1 0:8 / /mnt/ro ro - ext4 b rw',
  ].join('\n'));
  assert.deepEqual(storageRoots(t), ['/', '/dev', '/dev/shm']);
});

test('the baseline: arming needs a reason, records who, and keeps earlier baselines', () => {
  const d = mkWorkTemp('baseline-');
  try {
    const file = path.join(d, 'outside-writes.json');
    const opts = { file, listing: false, configFiles: [] };
    assert.throws(() => armBaseline({ ...opts, reason: 'short' }), /reason/);
    armBaseline({ ...opts, reason: 'first reviewed baseline', by: 'WP-00', now: Date.UTC(2026, 9, 13, 23) });
    armBaseline({ ...opts, reason: 'second reviewed baseline', by: 'integrator', now: Date.UTC(2026, 9, 14) });
    const b = readBaseline(file);
    assert.deepEqual([b.since, b.armedBy, b.sinceMs], ['2026-10-14T00:00:00.000Z', 'integrator', Date.UTC(2026, 9, 14)]);
    assert.deepEqual(b.previous, [{ since: '2026-10-13T23:00:00.000Z', armedBy: 'WP-00', reason: 'first reviewed baseline' }]);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('scanChanged sees through a host-view prefix and reports host paths, newer-than-baseline files only (directories on request)', async () => {
  const host = mkWorkTemp('hostview-');          // stands in for /proc/<pid>/root
  try {
    fs.mkdirSync(path.join(host, 'tmp/sub'), { recursive: true });
    fs.mkdirSync(path.join(host, 'skip'));
    fs.writeFileSync(path.join(host, 'tmp/old'), 'x');
    await new Promise((r) => setTimeout(r, 30));
    const sinceMs = Date.now();
    await new Promise((r) => setTimeout(r, 30));
    fs.writeFileSync(path.join(host, 'tmp/sub/new'), 'x');
    fs.writeFileSync(path.join(host, 'skip/new'), 'x');
    fs.mkdirSync(path.join(host, 'tmp/emptydir'));
    const r = scanChanged({ roots: ['/'], prune: ['/skip'], sinceMs, prefix: host });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.files.map((f) => f.path), ['/tmp/sub/new']);
    assert.ok(r.files[0].ctimeMs >= sinceMs);
    const d = scanChanged({ roots: ['/'], prune: ['/skip'], sinceMs, prefix: host, dirs: true });
    assert.deepEqual(d.dirs.map((x) => x.path).sort(), ['/tmp', '/tmp/emptydir', '/tmp/sub']);
  } finally { fs.rmSync(host, { recursive: true, force: true }); }
});

test('the directory listing: names per directory through a host-view prefix, pruned like the audit, hash-checked on read', () => {
  const host = mkWorkTemp('listing-');
  try {
    for (const d of ['etc/x', 'skip/deep', 'tmp']) fs.mkdirSync(path.join(host, d), { recursive: true });
    for (const f of ['etc/a', 'etc/x/b', 'skip/deep/c', 'tmp/d']) fs.writeFileSync(path.join(host, f), '1');
    const m = snapshotListing({ roots: ['/'], prune: ['/skip'], prefix: host });
    assert.deepEqual([...m].sort(), [['/', ['etc', 'tmp']], ['/etc', ['a', 'x']], ['/etc/x', ['b']], ['/tmp', ['d']]]);
    // round trip through arming, and tamper detection
    const dir = path.join(host, 'store');
    const b = armBaseline({ reason: 'listing round trip', file: path.join(dir, 'b.json'), listingDir: dir, configFiles: [],
      scope: { prefix: host, listingRoots: ['/'], prune: ['/skip', '/store'] } });
    assert.deepEqual([b.listing.dirs, b.listing.entries], [4, 6]);
    assert.deepEqual([...readListing(b.listing, dir)].sort(), [...m].sort());
    fs.appendFileSync(path.join(dir, b.listing.file), 'x');
    assert.throws(() => readListing(b.listing, dir), /altered/);
    fs.rmSync(path.join(dir, b.listing.file));
    assert.throws(() => readListing(b.listing, dir), /missing/);
  } finally { fs.rmSync(host, { recursive: true, force: true }); }
});

// A cache entry as Node writes it: magic, code length, cache length, code crc32, cache crc32, V8 data.
const cacheEntry = (code, magic = 0x8adfdbb2) => {
  const h = Buffer.alloc(20);
  h.writeUInt32LE(magic, 0); h.writeUInt32LE(code.length, 4); h.writeUInt32LE(4, 8); h.writeUInt32LE(zlib.crc32(code) >>> 0, 12);
  return Buffer.concat([h, Buffer.from('v8!!')]);
};

test('npm compile cache: an entry is attributed only when its name is the cache key of an npm file and its header matches that file', () => {
  const m = mkWorkTemp('npmcache-');
  try {
    const npm = path.join(m, 'npm'), cache = path.join(m, 'tmp/node-compile-cache/v22.22.0-x64-0-0');
    fs.mkdirSync(path.join(npm, 'lib'), { recursive: true }); fs.mkdirSync(cache, { recursive: true }); fs.mkdirSync(path.join(m, 'studio'));
    const put = (rel, text) => { fs.writeFileSync(path.join(m, rel), text); return path.join(m, rel); };
    const cjs = put('npm/lib/cli.js', 'module.exports = 1;\n'), esm = put('npm/lib/chalk.mjs', 'export default 2;\n');
    const other = put('npm/lib/other.js', 'module.exports = 3;\n'), studio = put('studio/tool.mjs', 'export const x = 1;\n');
    const entry = (name, code, magic) => { const p = path.join(cache, name); fs.writeFileSync(p, cacheEntry(Buffer.from(code), magic)); return p; };
    const v = npmCompileCache({ npmRoots: [npm] });
    assert.equal(v.attribute(entry(compileCacheKey(0, cjs), fs.readFileSync(cjs))), cjs);                          // CommonJS: path key
    assert.equal(v.attribute(entry(compileCacheKey(1, pathToFileURL(esm).href), fs.readFileSync(esm))), esm);      // ESM: file: URL key
    assert.equal(v.attribute(entry(compileCacheKey(0, other), 'module.exports = 4;\n')), null);                    // npm's key, different code
    assert.equal(v.attribute(entry(compileCacheKey(0, studio), fs.readFileSync(studio))), null);                   // a studio module
    assert.equal(v.attribute(entry('deadbeef', 'x')), null);                                                       // unknown key
    fs.writeFileSync(path.join(cache, compileCacheKey(0, cjs)), cacheEntry(fs.readFileSync(cjs), 0x12345678));
    assert.equal(v.attribute(path.join(cache, compileCacheKey(0, cjs))), null);                                    // wrong magic
    assert.equal(v.attribute(cjs), null);                                                                          // not in a cache dir
  } finally { fs.rmSync(m, { recursive: true, force: true }); }
});

test('npm compile cache, for real: a cold `npm run hm -- help` writes only entries the audit verifies as npm\'s own modules', { timeout: 60_000 }, () => {
  const tmp = mkWorkTemp('npm-cold-');
  try {
    const r = spawnSync('npm', ['run', '--silent', 'hm', '--', 'help'], { cwd: STUDIO, encoding: 'utf8', env: { ...process.env, TMPDIR: tmp } });
    assert.equal(r.status, 0, r.stderr);
    const dirs = fs.readdirSync(path.join(tmp, 'node-compile-cache'));
    const entries = dirs.flatMap((d) => fs.readdirSync(path.join(tmp, 'node-compile-cache', d)).map((n) => path.join(tmp, 'node-compile-cache', d, n)));
    const v = npmCompileCache();
    const sources = entries.map((e) => v.attribute(e));
    assert.ok(entries.length > 50, `npm wrote ${entries.length} cache entries`);
    assert.deepEqual(entries.filter((e, i) => !sources[i]), [], 'cache entries that are not npm\'s own modules');
    assert.ok(sources.every((s) => findNpmRoots().some((root) => s.startsWith(`${root}/`))));
    // nothing else landed in the private TMPDIR: the studio's own processes do not enable the cache
    assert.deepEqual(fs.readdirSync(tmp), ['node-compile-cache']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('git config: entries hash their values; routine branch/remote keys may change, anything else is reported', () => {
  const d = mkWorkTemp('gitcfg-');
  try {
    const f = path.join(d, 'config');
    const cfg = (...kv) => { for (let i = 0; i < kv.length; i += 2) execFileSync('git', ['config', '--file', f, '--add', kv[i], kv[i + 1]]); };
    cfg('core.bare', 'false', 'remote.origin.url', 'https://example.invalid/secret-token@repo', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');
    const before = gitConfigEntries(f);
    assert.ok(before.every((e) => !e.includes('secret')), 'values are never stored');
    cfg('branch.claude/x.remote', 'origin', 'branch.claude/x.merge', 'refs/heads/claude/x');       // git push -u
    execFileSync('git', ['config', '--file', f, 'remote.origin.url', 'https://proxy.invalid/repo']); // harness proxy URL
    assert.deepEqual(gitConfigChanges(before, gitConfigEntries(f)), []);
    cfg('core.hooksPath', '/tmp/hooks', 'alias.st', '!sh -c evil', 'include.path', '/tmp/x.cfg', 'remote.origin.uploadpack', 'evil');
    execFileSync('git', ['config', '--file', f, 'core.sshCommand', 'evil']);
    assert.deepEqual(gitConfigChanges(before, gitConfigEntries(f)).map((c) => `${c.key} ${c.change}`),
      ['alias.st added', 'core.hookspath added', 'core.sshcommand added', 'include.path added', 'remote.origin.uploadpack added']);
    assert.deepEqual(gitConfigChanges(gitConfigEntries(f), before).map((c) => c.change), ['removed', 'removed', 'removed', 'removed', 'removed']);
    const later = gitConfigEntries(f);
    execFileSync('git', ['config', '--file', f, 'alias.st', 'status']);
    assert.deepEqual(gitConfigChanges(later, gitConfigEntries(f)), [{ key: 'alias.st', change: 'changed' }]);
    assert.equal(gitConfigEntries(path.join(d, 'none')), null);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('git directory: only the data git commands write is exempt; hooks, info, description and config are audited', () => {
  const layout = gitLayout();
  const allowed = allowedRoots({ layout });
  const exempt = (rel) => allowed.some((a) => isInside(path.join(layout.gitDir, rel), a.path));
  for (const rel of ['objects/ab/cdef', 'refs/heads/main', 'logs/HEAD', 'index', 'HEAD', 'COMMIT_EDITMSG', 'FETCH_HEAD', 'packed-refs']) assert.ok(exempt(rel), rel);
  for (const rel of ['hooks/pre-commit', 'hooks/post-checkout', 'info/exclude', 'info/attributes', 'description', 'config', 'branches/x', 'modules/x/config', 'unknown-file']) {
    assert.ok(!exempt(rel), `${rel} must be audited`);
  }
  assert.ok(gitConfigFiles(layout).includes(path.join(layout.gitDir, 'config')));
});

test('linked worktree admin dirs: git\'s own data and the harness base marker are exempt, anything else there is audited', () => {
  const layout = { gitDir: '/repo/.git', worktreeDirs: ['/repo/.git/worktrees/wp-x'], otherWorktrees: ['/repo/.claude/worktrees/wp-x'] };
  const allowed = allowedRoots({ studio: '/repo/studio', work: '/work', layout });
  const exempt = (p) => allowed.some((a) => isInside(p, a.path));
  for (const n of ['HEAD', 'index', 'gitdir', 'commondir', 'logs/HEAD', 'CLAUDE_BASE']) assert.ok(exempt(`/repo/.git/worktrees/wp-x/${n}`), n);
  for (const n of ['config.worktree', 'hooks/pre-commit', 'unknown-file']) assert.ok(!exempt(`/repo/.git/worktrees/wp-x/${n}`), `${n} must be audited`);
  assert.ok(exempt('/repo/.claude/worktrees/wp-x/studio/x.js'), 'the other checkout itself is checked by its own guards');
});
