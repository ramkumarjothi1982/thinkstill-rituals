// Write audit: has anything on this machine, outside the places studio work
// may write, been written or deleted since the guard was armed?
//
// The write jail (write-jail.mjs) stops studio jobs from writing outside
// STUDIO and WORK. This audit is the detection half and does not care which
// process wrote or how: it looks at the filesystem afterwards, against the
// committed baseline (qa/guard/outside-writes.json).
//
// Findings, on every writable storage mount:
//   written   a file or symlink whose ctime is newer than the baseline;
//   deleted   a name that existed when the guard was armed and is gone now.
//             Arming records a listing (names only) of every directory, kept in
//             WORK with its sha256 in the baseline. A removal, rename or rmdir
//             bumps the parent directory's ctime, so only directories changed
//             since the baseline are compared with that listing. Removing a
//             linked worktree (git worktree remove) is not a finding;
//   touched   a directory that changed since the baseline with nothing left to
//             show for it: no name it held at arming is gone, and no entry in it
//             was created or renamed when it last changed (birth time or ctime
//             within TOUCH_EPS_MS of the directory's mtime). That is a file or
//             directory created and deleted again between two audits (a rename
//             away and back bumps the entry's own ctime: written). A directory
//             whose ctime is later than its mtime had its mode, owner or
//             attributes changed: touched as well;
//   created   a directory that did not exist at arming (mkdir is a write, even
//             when the directory is empty);
//   git-config  a key of the repository's git config added, changed or removed,
//             except routine branch/remote keys (see below).
// Nothing is reported inside
//   - STUDIO (this checkout) or WORK (shared scratch): where studio work belongs;
//   - another worktree of this repository: that checkout's own guards check it;
//   - the git data that ordinary git commands write (objects, refs, logs,
//     index, HEAD, …; GIT_INTERNALS below). The rest of the git directory is
//     audited like any file: hooks/, info/, description, branches/, and any
//     unknown file. The git config is rewritten by git itself (push -u,
//     branch -u), so its CONTENT is checked instead of its ctime: a new or
//     changed key that is not routine (core.hooksPath, alias.*, filter.*,
//     include.path, credential.helper, … anything not on the routine list) is
//     a finding;
//   - EXTERNAL_WRITERS: a short, reviewed list of places the agent harness and
//     the sandbox infrastructure write to on their own;
//   - ATTRIBUTED writers, whose every file is verified: npm's own V8 compile
//     cache. npm (>= 10.9, lib/cli.js) calls module.enableCompileCache() before
//     it reads any configuration, so every `npm run …`, the studio's included,
//     writes bytecode for npm's OWN modules to $TMPDIR/node-compile-cache when
//     they are not cached yet. No studio setting can move it (only the caller's
//     NODE_COMPILE_CACHE / NODE_DISABLE_COMPILE_CACHE / TMPDIR can), and child
//     processes do not inherit it. An entry is accepted only if its name is
//     Node's cache key for a file inside npm's installation AND its header holds
//     that file's exact length and CRC32; any other cache entry is a finding.
//     `node cli/hm.mjs …` (no npm) writes nothing outside at all.
// An agent's scratchpad (/tmp/claude-*/…/scratchpad) is deliberately NOT
// exempt: the studio's rule is that scratch goes to WORK.
//
// ctime, not mtime: every write, chmod, rename or link bumps it, and it
// cannot be set back (touch -d changes mtime only). A directory keeps only the
// time of its LAST change, so known limits remain:
//   - a create-then-delete in a directory that changes again visibly afterwards
//     (an entry created or renamed into it, or a name removed) is masked by that
//     later change. In practice that is where the harness writes constantly:
//     /root (.claude.json), /tmp/claude-* (its own state);
//   - three kinds of place change with nothing left behind in normal operation,
//     so a 'touch' exemption covers the directory itself (exact path, never what
//     is below it): /tmp (the harness's per-command cwd file), the git directory
//     (lock files of every git command) and the places git and the harness put
//     linked worktrees (the repository's top level, .claude/, .claude/worktrees/,
//     <git>/worktrees/). A create-then-delete directly there is not detected; a
//     file left there still is (written, and git status for the repository);
//   - the harness and boot-provisioning exemptions are trusted.
// Inside the jail the audit reads the host's view (write-jail hostRoot()), so
// it sees the real /tmp and /dev/shm.

import { spawnSync, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { STUDIO, WORK, isInside } from './paths.mjs';
import { STORAGE_FS, readMounts, hostRoot, isConfined, HOST_PID_VAR } from './write-jail.mjs';

export const BASELINE_FILE = path.join(STUDIO, 'qa', 'guard', 'outside-writes.json');
export const LISTING_DIR = path.join(WORK, 'guard');
const SCHEMA = 'hm-write-audit/2';

/**
 * Places written by software that is not the studio (and that jailed studio
 * jobs cannot reach). A pattern covers the path itself and everything below
 * it; '*' matches within one path segment. The scope says which findings it excuses:
 *   'all'     anything (written, deleted, touched, created);
 *   'remove'  the removal of what existed at arming, and new directories (the
 *             harness creates and removes its session directories); files
 *             written there, and directories touched there, are still findings;
 *   'touch'   only the directory ITSELF (exact path) changing with nothing left
 *             behind: transient files a writer creates and deletes there.
 * Add an entry only with a reason, after checking that studio code is not the writer.
 */
export const EXTERNAL_WRITERS = Object.freeze([
  ['/tmp', 'agent harness: every shell command creates and removes its cwd file /tmp/claude-<hex>-cwd, so /tmp itself changes with nothing left behind', 'touch'],
  ['/root/.claude', 'agent harness state: transcripts, tasks, settings, skills'],
  ['/root/.cache/claude-cli-nodejs', 'agent harness logs'],
  ['/home/claude/.claude', 'agent harness remote-session state'],
  ['/root/.gitconfig', 'rewritten by the agent harness at every session start'],
  ['/tmp/claude-*/bash-edit-diff', 'agent harness edit tracking'],
  ['/tmp/claude-*/cache-break-state-*.json', 'agent harness prompt-cache state'],
  ['/tmp/claude-*/*/*/tasks', 'agent harness background-task output (the scratchpad/ next to it is NOT exempt)'],
  ['/tmp/claude-*/*/*', 'agent harness session directories: the harness creates and removes them (files written into scratchpad/ are still findings)', 'remove'],
  ['/tmp/claude-code.log', 'agent harness log'],
  ['/tmp/claude-code-*.diag.log', 'agent harness diagnostics'],
  ['/tmp/claude-command', 'agent harness'],
  ['/tmp/claude-append-system-prompt.txt', 'agent harness'],
  ['/tmp/cc-socks', 'agent harness messaging sockets'],
  ['/tmp/environment-manager*', 'sandbox environment manager'],
  ['/tmp/env-manager.log', 'sandbox environment manager'],
  ['/tmp/mcp-config-*.json', 'sandbox MCP configuration'],
  ['/tmp/codesign-mcp-config.json', 'sandbox code signing'],
  ['/tmp/code-sign', 'sandbox code signing'],
  ['/run/ccr', 'sandbox runtime state'],
  ['/run/sandbox-telemetry', 'sandbox telemetry (own tmpfs)'],
  ['/mnt/sandboxing', 'sandbox tooling'],
  ['/usr/local/bin/environment-manager', 'sandbox environment manager binary'],
  // Rewritten by the sandbox's provisioning every time the VM boots (seen at
  // the 07:49 and 23:16 boots on 2026-10-13, before any session started).
  ['/container_info.json', 'VM provisioning at boot'],
  ['/etc/hostname', 'VM provisioning at boot'],
  ['/etc/hosts', 'VM provisioning at boot'],
  ['/etc/resolv.conf', 'VM provisioning at boot'],
  ['/etc/gitconfig', 'VM provisioning at boot'],
  ['/etc/bazel.bazelrc', 'VM provisioning at boot'],
  ['/etc/profile.d/ccr-agent-proxy-ca.sh', 'VM provisioning at boot: agent proxy'],
  ['/etc/ssl/certs', 'VM provisioning at boot: agent-proxy CA trust'],
  ['/usr/local/share/ca-certificates', 'VM provisioning at boot: agent-proxy CA trust'],
  ['/root/.pki/nssdb', 'VM provisioning at boot: agent-proxy CA trust (NSS)'],
  ['/root/.local/share/pki/nssdb', 'VM provisioning at boot: agent-proxy CA trust (NSS)'],
  ['/root/.ccr', 'VM provisioning at boot: agent-proxy CA bundle and README'],
  ['/root/.claude.json', 'VM provisioning at boot: agent harness configuration'],
  ['/root/.aws/config', 'VM provisioning at boot'],
  ['/root/.boto', 'VM provisioning at boot'],
  ['/root/.npm/_update-notifier-last-checked', 'npm run by the provisioning (studio npm runs disable the notifier in .npmrc)'],
  ['/opt/node22/bin/claude', 'VM provisioning at boot: agent harness launcher link'],
  ['/dev/fd', 'created at every boot (devtmpfs)'],
  ['/dev/stdin', 'created at every boot (devtmpfs)'],
  ['/dev/stdout', 'created at every boot (devtmpfs)'],
  ['/dev/stderr', 'created at every boot (devtmpfs)'],
].map(([glob, reason, scope = 'all']) => Object.freeze({ glob, reason, scope })));

/**
 * The data ordinary git commands write inside the git directory (commit, fetch,
 * push, checkout, merge, rebase, gc, worktree add). Everything else there is
 * audited; the config file is content-checked (ROUTINE_GIT_CONFIG).
 */
export const GIT_INTERNALS = Object.freeze([
  'objects', 'refs', 'logs', 'index', 'HEAD', 'ORIG_HEAD', 'FETCH_HEAD', 'COMMIT_EDITMSG', 'packed-refs', 'shallow',
  'MERGE_HEAD', 'MERGE_MSG', 'MERGE_MODE', 'MERGE_RR', 'AUTO_MERGE', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'SQUASH_MSG',
  'BISECT_LOG', 'BISECT_START', 'BISECT_TERMS', 'BISECT_EXPECTED_REV', 'BISECT_ANCESTORS_OK', 'BISECT_NAMES',
  'rebase-merge', 'rebase-apply', 'sequencer', 'rr-cache', 'lost-found', 'gc.pid', 'gc.log', 'info/refs',
]);
// inside each linked worktree's admin directory (<git>/worktrees/<name>/)
const WORKTREE_INTERNALS = ['HEAD', 'ORIG_HEAD', 'FETCH_HEAD', 'index', 'logs', 'commondir', 'gitdir', 'locked', 'COMMIT_EDITMSG',
  'MERGE_HEAD', 'MERGE_MSG', 'MERGE_MODE', 'AUTO_MERGE', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer', 'BISECT_LOG'];
// written into each linked worktree's admin directory by the agent harness when it creates the
// worktree (the commit the worktree was branched from); not studio code, never executed by git
const HARNESS_WORKTREE_FILES = ['CLAUDE_BASE'];
/** git config keys that git itself rewrites in normal use and that cannot make git run a program. */
export const ROUTINE_GIT_CONFIG = Object.freeze([
  /^branch\..+\.(remote|merge|rebase|pushremote|description)$/,
  /^remote\..+\.(url|fetch|pushurl|push|tagopt|prune|mirror)$/,
  /^core\.(repositoryformatversion|filemode|bare|logallrefupdates|ignorecase|precomposeunicode|symlinks)$/,
  /^gc\.auto$/,
]);

const GLOBS = new Map();
/** Segment-aware glob → RegExp ('*' never crosses '/'). */
export function globToRegExp(glob) {
  if (!GLOBS.has(glob)) {
    const body = glob.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*');
    GLOBS.set(glob, new RegExp(`^${body}$`));
  }
  return GLOBS.get(glob);
}

/** The first pattern that covers `p` (p itself or one of its ancestors), or null. */
export function coveredBy(p, patterns) {
  const res = patterns.map((x) => [x, globToRegExp(x.glob)]);
  for (let q = p; q && q !== '/'; q = path.posix.dirname(q)) {
    for (const [x, re] of res) if (re.test(q)) return x;
  }
  return null;
}
const writersFor = (list, kind) => list.filter((x) => (x.scope ?? 'all') === 'all' || x.scope === kind);
/** True when `p` itself (not an ancestor) matches one of the glob patterns. */
export const matchesExactly = (p, patterns) => patterns.some((x) => globToRegExp(x.glob ?? x).test(p));
/** Two timestamps closer than this belong to the same directory change (a create sets the entry's birth time and the directory's mtime from the same coarse clock; measured gap at most 6.6 ms). */
export const TOUCH_EPS_MS = 50;

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** The repository's git directory and its worktree admin dirs. → { gitDir, top, mainTop, worktreeDirs, otherWorktrees } */
export function gitLayout(studio = STUDIO) {
  const gitDir = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], studio);
  const top = git(['rev-parse', '--show-toplevel'], studio);
  const otherWorktrees = [];
  let mainTop = null;
  for (const line of git(['worktree', 'list', '--porcelain'], studio).split('\n')) {
    const wt = line.startsWith('worktree ') ? line.slice(9) : null;
    if (wt && !mainTop) mainTop = wt;                                            // the first entry is the main checkout
    if (wt && path.resolve(wt) !== path.resolve(top)) otherWorktrees.push(wt);
  }
  const wtRoot = path.join(gitDir, 'worktrees');
  const worktreeDirs = fs.existsSync(wtRoot) ? fs.readdirSync(wtRoot).map((n) => path.join(wtRoot, n)) : [];
  return { gitDir, top, mainTop: mainTop ?? top, worktreeDirs, otherWorktrees };
}

/**
 * Where git and the agent harness create and remove linked worktrees, beside the
 * checkouts themselves (allowed roots): <git>/worktrees and its admin dirs, the
 * main checkout's .claude/ and .claude/worktrees/ (the harness's convention),
 * and every directory between a known worktree and the checkout's top level.
 * → { places: [glob] (may be created, touched, or removed when they held only
 *     worktree places), touch: [path] (may change with nothing left: these
 *     plus the git directory and the top level) }
 */
export function worktreePlaces(layout, worktrees = []) {
  if (!layout?.gitDir) return { places: [], touch: [] };
  const tops = [...new Set([layout.mainTop, layout.top].filter(Boolean))];
  const places = new Set([path.join(layout.gitDir, 'worktrees'), path.join(layout.gitDir, 'worktrees', '*')]);
  for (const t of tops) { places.add(path.join(t, '.claude')); places.add(path.join(t, '.claude', 'worktrees')); }
  for (const wt of [...(layout.otherWorktrees ?? []), ...worktrees]) {
    const t = tops.find((x) => isInside(wt, x) && wt !== x);
    if (t) for (let d = path.dirname(wt); d !== t && isInside(d, t); d = path.dirname(d)) places.add(d);
  }
  return { places: [...places], touch: [...places, layout.gitDir, ...tops] };
}

/** Places studio work may write, or that other guards own. → [{ path, why }] */
export function allowedRoots({ studio = STUDIO, work = WORK, layout = gitLayout(studio) } = {}) {
  const out = [{ path: studio, why: 'this studio' }, { path: work, why: 'WORK (shared scratch)' }];
  for (const n of GIT_INTERNALS) out.push({ path: path.join(layout.gitDir, n), why: 'git data written by git commands' });
  for (const d of layout.worktreeDirs) for (const n of WORKTREE_INTERNALS) out.push({ path: path.join(d, n), why: 'git worktree data' });
  for (const d of layout.worktreeDirs) for (const n of HARNESS_WORKTREE_FILES) out.push({ path: path.join(d, n), why: 'agent harness worktree base marker' });
  for (const wt of layout.otherWorktrees) out.push({ path: wt, why: 'another worktree (checked by its own guards)' });
  return out;
}

/** The git config files whose content (not ctime) is audited. */
export function gitConfigFiles(layout = gitLayout()) {
  return [path.join(layout.gitDir, 'config'), ...layout.worktreeDirs.map((d) => path.join(d, 'config.worktree'))];
}

const short = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/** A git config file's entries as sorted 'key=<sha256 of value, 16 hex>' strings (values never stored), or null if absent. */
export function gitConfigEntries(file, prefix = '') {
  if (!fs.existsSync(prefix + file)) return null;
  const r = spawnSync('git', ['config', '--file', prefix + file, '--list', '-z', '--no-includes'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git config --file ${file}: ${r.stderr.trim()}`);
  return r.stdout.split('\0').filter(Boolean).map((e) => {
    const nl = e.indexOf('\n');
    return nl < 0 ? `${e}=` : `${e.slice(0, nl)}=${short(e.slice(nl + 1))}`;
  }).sort();
}

/** Non-routine keys that differ between two entry lists. → [{ key, change: 'added'|'removed'|'changed' }] */
export function gitConfigChanges(before, after, routine = ROUTINE_GIT_CONFIG) {
  const keyOf = (e) => e.slice(0, e.indexOf('='));
  const group = (list) => { const m = new Map(); for (const e of list ?? []) { const k = keyOf(e); m.set(k, [...(m.get(k) ?? []), e].sort()); } return m; };
  const a = group(before), b = group(after);
  const out = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    if (routine.some((re) => re.test(k))) continue;
    const x = (a.get(k) ?? []).join('\n'), y = (b.get(k) ?? []).join('\n');
    if (x !== y) out.push({ key: k, change: !a.has(k) ? 'added' : !b.has(k) ? 'removed' : 'changed' });
  }
  return out.sort((p, q) => p.key.localeCompare(q.key));
}

// ---------------------------------------------------------------- npm's compile cache

const CACHE_ENTRY = /\/node-compile-cache\/[^/]+\/[0-9a-f]{8}$/;
const CACHE_MAGIC = 0x8adfdbb2;
const hex8 = (n) => (n >>> 0).toString(16).padStart(8, '0');
/** Node's compile-cache file name for a module: crc32(<type byte>, <filename>); type 0 = CommonJS path, 1 = ESM file: URL. */
export const compileCacheKey = (type, filename) => hex8(zlib.crc32(Buffer.from(filename), zlib.crc32(Buffer.from([type]))));

/** npm installations on this machine: the one next to this node, and every `npm` on PATH. */
export function findNpmRoots() {
  const roots = new Set();
  const add = (p) => {
    for (let d = p; d && d !== path.dirname(d); d = path.dirname(d)) {
      try { if (JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')).name === 'npm') { roots.add(d); return; } } catch { /* keep walking up */ }
    }
  };
  add(path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin'));
  for (const dir of (process.env.PATH ?? '').split(':')) {
    try { add(path.dirname(fs.realpathSync(path.join(dir, 'npm')))); } catch { /* no npm here */ }
  }
  return [...roots];
}

/**
 * Verifier for npm's own compile cache. attribute(hostPath, prefix) → the npm
 * module the entry was compiled from, or null (then it is a finding).
 */
export function npmCompileCache({ npmRoots = findNpmRoots() } = {}) {
  let index = null;
  const build = () => {
    index = new Map();
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(c?js|mjs)$/.test(e.name)) { index.set(compileCacheKey(0, p), p); index.set(compileCacheKey(1, pathToFileURL(p).href), p); }
      }
    };
    for (const r of npmRoots) walk(r);
    return index;
  };
  return {
    by: "npm's own V8 compile cache",
    attribute(hostPath, prefix = '') {
      if (!CACHE_ENTRY.test(hostPath)) return null;
      const src = (index ?? build()).get(path.basename(hostPath));
      if (!src) return null;
      try {
        const fd = fs.openSync(prefix + hostPath, 'r');
        const head = Buffer.alloc(16);
        try { fs.readSync(fd, head, 0, 16, 0); } finally { fs.closeSync(fd); }
        const code = fs.readFileSync(src);
        const ok = head.readUInt32LE(0) === CACHE_MAGIC && head.readUInt32LE(4) === code.length && head.readUInt32LE(12) === (zlib.crc32(code) >>> 0);
        return ok ? src : null;
      } catch { return null; }
    },
  };
}

// ---------------------------------------------------------------- mounts and scanning

/** Mount points of writable storage filesystems (the places a write can land), from a mount table. */
export function storageRoots(mounts, { exclude = [] } = {}) {
  const roots = new Set();
  for (const m of mounts) {
    if (!STORAGE_FS.has(m.fstype) || m.options.includes('ro') || exclude.includes(m.fstype)) continue;
    if (['/proc', '/sys'].some((v) => isInside(m.mountPoint, v))) continue;
    roots.add(m.mountPoint);
  }
  return [...roots].sort();
}

const findEscape = (p) => p.replace(/[*?[\]\\]/g, '\\$&');
const hasGlob = (g) => /[*?[]/.test(g);
const pruneArgs = (root, prune, prefix) => {
  const skip = prune.filter((p) => isInside(p, root) && p !== root).flatMap((p, i) => [...(i ? ['-o'] : []), '-path', findEscape(prefix + p)]);
  return skip.length ? ['(', ...skip, ')', '-prune', '-o'] : [];
};
/** Run find, → { records: [[type, ctimeMs, hostPath]], errors } (a file vanishing mid-walk is a race, not an error). */
function runFind(roots, prune, prefix, tail) {
  const records = [], errors = [];
  for (const root of roots) {
    if (prune.some((p) => isInside(root, p))) continue;
    const r = spawnSync('find', [prefix + root, '-xdev', ...pruneArgs(root, prune, prefix), ...tail], { encoding: 'utf8', maxBuffer: 1 << 30 });
    if (r.error) throw r.error;
    for (const rec of r.stdout.split('\0')) {
      if (!rec) continue;
      const tab = rec.indexOf('\t'), sp = rec.indexOf(' ');
      records.push([rec.slice(0, sp), Math.round(Number(rec.slice(sp + 1, tab)) * 1000), rec.slice(tab + 1).slice(prefix.length) || '/']);
    }
    for (const l of r.stderr.split('\n')) if (l && !/No such file or directory/.test(l)) errors.push(l);
  }
  return { records, errors };
}

/**
 * Files and symlinks (and, with `dirs`, directories) under `roots` with ctime
 * newer than `sinceMs`, skipping `prune` (absolute paths). All paths are host
 * paths; `prefix` is where the host's filesystem is visible from here.
 * → { files: [{ path, ctimeMs }], dirs: [{ path, ctimeMs }], errors: [line] }
 */
export function scanChanged({ roots, prune = [], sinceMs, prefix = '', dirs = false }) {
  const since = `@${Math.floor(sinceMs / 1000)}.${String(sinceMs % 1000).padStart(3, '0')}`;
  const types = ['(', '-type', 'f', '-o', '-type', 'l', ...(dirs ? ['-o', '-type', 'd'] : []), ')'];
  const { records, errors } = runFind(roots, prune, prefix, [...types, '-newerct', since, '-printf', '%y %C@\\t%p\\0']);
  const out = { files: [], dirs: [], errors };
  for (const [type, ctimeMs, p] of records) (type === 'd' ? out.dirs : out.files).push({ path: p, ctimeMs });
  return out;
}

/** Names in every directory under `roots` (pruned like the audit). → Map<dir, string[]> */
export function snapshotListing({ roots, prune = [], prefix = '' }) {
  const { records, errors } = runFind(roots, prune, prefix, ['-printf', '%y 0\\t%p\\0']);
  if (errors.length) throw new Error(`listing snapshot: ${errors.slice(0, 3).join('; ')}`);
  const listing = new Map();
  for (const [, , p] of records) {
    if (roots.includes(p)) continue;
    const d = path.posix.dirname(p);
    if (!listing.has(d)) listing.set(d, []);
    listing.get(d).push(path.posix.basename(p));
  }
  for (const names of listing.values()) names.sort();
  return listing;
}

const encodeListing = (listing) => zlib.gzipSync([...listing].sort(([a], [b]) => (a < b ? -1 : 1)).map((e) => JSON.stringify(e)).join('\n'), { level: 6 });
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** Load the listing recorded by a baseline, checking its hash. → Map<dir, string[]> (throws if missing or altered) */
export function readListing(info, dir = LISTING_DIR) {
  const file = path.join(dir, info.file);
  if (!fs.existsSync(file)) throw new Error(`the directory listing recorded at arming is missing (${file})`);
  const buf = fs.readFileSync(file);
  if (sha256(buf) !== info.sha256) throw new Error(`the directory listing recorded at arming was altered (${file}: sha256 differs from the baseline)`);
  return new Map(zlib.gunzipSync(buf).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
}

// ---------------------------------------------------------------- baseline

/** Read the committed baseline. → { since (ISO), sinceMs, armedBy, reason, listing?, gitConfig?, previous } */
export function readBaseline(file = BASELINE_FILE) {
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  const sinceMs = Date.parse(b.since);
  if (!Number.isFinite(sinceMs)) throw new Error(`${file}: "since" is not a timestamp: ${b.since}`);
  return { ...b, sinceMs };
}

/**
 * What the audit looks at on this machine (also what arming records).
 * `removable`: places whose removal is not a finding: linked worktrees (git
 * worktree remove deletes the checkout and its admin directory).
 */
export function auditScope({
  prefix = hostRoot(), mounts = readMounts(isConfined() ? process.env[HOST_PID_VAR] : 'self'), layout, allowed, externalWriters = EXTERNAL_WRITERS,
} = {}) {
  const lay = layout ?? (allowed ? null : gitLayout());
  const allow = allowed ?? allowedRoots({ layout: lay });
  const roots = storageRoots(mounts);
  const listingRoots = storageRoots(mounts, { exclude: ['devtmpfs'] });    // device nodes come and go with boots
  // literal (glob-free) exempt places are pruned by find itself, for speed
  const prune = [...allow.map((a) => a.path), ...externalWriters.filter((x) => (x.scope ?? 'all') === 'all' && !hasGlob(x.glob)).map((x) => x.glob)];
  const removable = lay ? [...lay.otherWorktrees, path.join(lay.gitDir, 'worktrees')] : [];
  return { prefix, roots, listingRoots, prune, allowed: allow, externalWriters, removable, layout: lay, worktrees: lay?.otherWorktrees ?? [] };
}

/**
 * (Re)arm the audit: what exists now is accepted. Like re-freezing, it is a
 * reviewed act: the baseline file is committed, a reason is required, and
 * earlier baselines are kept in `previous`. Records the directory listing (in
 * WORK, hash in the baseline) and the git config entries.
 */
export function armBaseline({
  reason, by, file = BASELINE_FILE, now = Date.now(), listing = true, listingDir = LISTING_DIR, scope, configFiles,
}) {
  if (!reason || reason.trim().length < 10) throw new Error('arming the write audit needs a --reason (10+ characters) saying what was reviewed');
  let previous = [];
  if (fs.existsSync(file)) {
    const old = JSON.parse(fs.readFileSync(file, 'utf8'));
    previous = [...(old.previous ?? []), { since: old.since, armedBy: old.armedBy, reason: old.reason }];
  }
  const since = new Date(now).toISOString();
  const b = { schema: SCHEMA, since, armedBy: by || 'unknown', reason: reason.trim() };
  const s = listing ? scope ?? auditScope() : null;
  if (listing) {
    const map = snapshotListing({ roots: s.listingRoots, prune: s.prune, prefix: s.prefix });
    const buf = encodeListing(map);
    const name = `listing-${since.replace(/[:.]/g, '-')}.json.gz`;
    fs.mkdirSync(listingDir, { recursive: true });
    fs.writeFileSync(path.join(listingDir, name), buf);
    b.listing = { file: name, sha256: sha256(buf), dirs: map.size, entries: [...map.values()].reduce((n, v) => n + v.length, 0), roots: s.listingRoots };
    b.worktrees = s.worktrees ?? [];
  }
  b.gitConfig = {};
  for (const f of configFiles ?? gitConfigFiles()) { const e = gitConfigEntries(f); if (e) b.gitConfig[f] = e; }
  b.previous = previous;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(b, null, 2)}\n`);
  return b;
}

// ---------------------------------------------------------------- the audit

/**
 * The directory checks of the audit, for the directories changed since the
 * baseline (`dirs`, from scanChanged), against the listing recorded at arming:
 *   deleted  names recorded at arming that are gone;
 *   created  directories that did not exist at arming;
 *   touched  directories whose last change left nothing to show for it, or whose
 *            metadata changed after it (see the module header).
 * → { findings, exempted }
 */
export function auditDirectories({ dirs, listing, scope: s, baseline = {}, removable = [], inAllowed = () => false }) {
  const pfx = s.prefix ?? '';
  const findings = [];
  let exempted = 0;
  const all = (s.externalWriters ?? []).filter((x) => (x.scope ?? 'all') === 'all');
  const removeExempt = writersFor(s.externalWriters ?? [], 'remove');
  const sessionDirs = (s.externalWriters ?? []).filter((x) => x.scope === 'remove');
  const touchExempt = (s.externalWriters ?? []).filter((x) => x.scope === 'touch');
  const wt = worktreePlaces(s.layout, baseline.worktrees ?? []);
  const listingRoots = s.listingRoots ?? s.roots ?? [];
  const storage = [...(s.roots ?? [])].sort((a, b) => b.length - a.length);
  // a directory is listed when the listing knows it: as a key (it held names), as a name in its parent, or as a root
  const existedAtArming = (d) => listing.has(d) || listingRoots.includes(d) || (listing.get(path.posix.dirname(d)) ?? []).includes(path.posix.basename(d));
  // which find root (storage mount) a path belongs to: the deepest one containing it
  const mountOf = (d) => storage.find((r) => isInside(d, r));
  /** A worktree container whose every name at arming was itself a worktree place: removing it is git's or the harness's housekeeping. */
  const onlyWorktreePlaces = (p, depth = 0) => matchesExactly(p, wt.places) && depth < 8
    && (listing.get(p) ?? []).every((n) => onlyWorktreePlaces(path.posix.join(p, n), depth + 1));
  const ns = (st, k) => Number(st[k]) / 1e6;
  const iso = (ms) => new Date(Math.floor(ms)).toISOString();

  const once = new Set();                                                         // a mount point is listed by both mounts' find
  for (const d of dirs) {
    if (once.has(d.path)) continue;
    once.add(d.path);
    if (!listingRoots.includes(mountOf(d.path))) continue;                       // not listed at arming (device nodes)
    if (inAllowed(d.path) || coveredBy(d.path, all)) { exempted++; continue; }   // everything in and below it is exempt
    let present, st;
    try { present = fs.readdirSync(pfx + d.path); st = fs.lstatSync(pfx + d.path, { bigint: true }); } catch { continue; }   // gone itself: its parent reports it
    const before = listing.get(d.path) ?? [];
    const presentSet = new Set(present);
    // deleted
    const removed = before.filter((n) => !presentSet.has(n));
    for (const name of removed) {
      const p = path.posix.join(d.path, name);
      if (inAllowed(p) || coveredBy(p, removeExempt) || coveredBy(p, removable) || onlyWorktreePlaces(p)) { exempted++; continue; }
      let below = 0;
      for (const [k, v] of listing) if (k === p || k.startsWith(`${p}/`)) below += v.length;
      findings.push({ path: p, kind: 'deleted', ctime: new Date(d.ctimeMs).toISOString(), ...(below && { detail: `a directory with ${below} entries at arming` }) });
    }
    // created
    if (!existedAtArming(d.path)) {
      const npmCache = /\/node-compile-cache(\/[^/]+)?$/.test(d.path);               // its entries are each verified as npm's (attributed)
      if (!(coveredBy(d.path, sessionDirs) || matchesExactly(d.path, wt.places) || npmCache)) {
        findings.push({ path: d.path, kind: 'created', ctime: new Date(d.ctimeMs).toISOString(), detail: 'a new directory' });
        continue;
      }
      exempted++;
    }
    // touched
    if (removed.length || matchesExactly(d.path, touchExempt) || matchesExactly(d.path, wt.touch)) continue;   // explained, or a place that churns by design
    const mtime = ns(st, 'mtimeNs'), ctime = ns(st, 'ctimeNs');
    if (ctime - mtime > TOUCH_EPS_MS) {
      findings.push({ path: d.path, kind: 'touched', ctime: iso(ctime), detail: 'its mode, owner or attributes changed' });
      continue;
    }
    const near = (t) => Math.abs(t - mtime) <= TOUCH_EPS_MS;
    if (near(ns(st, 'birthtimeNs'))) continue;                                     // created then, unchanged since
    const explained = present.some((n) => {
      try { const e = fs.lstatSync(path.posix.join(pfx + d.path, n), { bigint: true }); return near(ns(e, 'birthtimeNs')) || near(ns(e, 'ctimeNs')); } catch { return false; }
    });
    if (!explained) {
      findings.push({ path: d.path, kind: 'touched', ctime: iso(mtime), detail: 'changed with nothing left to show for it: a file or directory created and deleted again' });
    }
  }
  return { findings, exempted };
}

/**
 * The audit. → { ok, since, roots, allowed, findings: [{ path, kind, ctime, detail? }],
 *   attributed: [{ path, by, source }], exempted, errors, ms }
 * Options exist so tests can audit a synthetic tree; the defaults audit the real machine.
 */
export function auditOutsideWrites({
  baseline = readBaseline(), scope, prefix, roots, allowed, externalWriters,
  attributors = [npmCompileCache()], configFiles, listingDir = LISTING_DIR,
} = {}) {
  const t0 = process.hrtime.bigint();
  const s = scope ?? auditScope({ ...(prefix !== undefined && { prefix }), ...(allowed && { allowed }), ...(externalWriters && { externalWriters }) });
  const removable = [...(s.removable ?? []), ...(baseline.worktrees ?? [])].map((glob) => ({ glob }));
  if (roots) { s.roots = roots; s.listingRoots = roots; }
  const pfx = s.prefix;
  const { files, dirs, errors } = scanChanged({ roots: s.roots, prune: s.prune, sinceMs: baseline.sinceMs, prefix: pfx, dirs: true });
  const configs = configFiles ?? gitConfigFiles();
  const inAllowed = (p) => s.allowed.some((a) => isInside(p, a.path));
  const findings = [], attributed = [];
  let exempted = 0;
  // 1. written
  const writeExempt = writersFor(s.externalWriters, 'write');
  for (const f of files) {
    if (inAllowed(f.path) || coveredBy(f.path, writeExempt) || configs.includes(f.path)) { exempted++; continue; }
    const by = attributors.map((a) => [a, a.attribute(f.path, pfx)]).find(([, src]) => src);
    if (by) { attributed.push({ path: f.path, by: by[0].by, source: by[1] }); continue; }
    findings.push({ path: f.path, kind: 'written', ctime: new Date(f.ctimeMs).toISOString() });
  }
  // 2–4. directories changed since the baseline, against the listing recorded at arming
  if (!baseline.listing) errors.push('the baseline records no directory listing, so deletions and touched directories cannot be checked: re-arm (hm guard --arm --reason "…")');
  else if (dirs.length) {
    let listing = null;
    try { listing = readListing(baseline.listing, listingDir); } catch (e) { errors.push(`${e.message}: deletions and touched directories cannot be checked; re-arm after review`); }
    if (listing) {
      const r = auditDirectories({ dirs, listing, scope: s, baseline, removable, inAllowed });
      findings.push(...r.findings);
      exempted += r.exempted;
    }
  }
  // 3. git config: content, not ctime
  if (!baseline.gitConfig) errors.push('the baseline records no git config, so its content cannot be checked: re-arm');
  else {
    for (const f of configs) {
      for (const c of gitConfigChanges(baseline.gitConfig[f] ?? [], gitConfigEntries(f, pfx) ?? [])) {
        findings.push({ path: f, kind: 'git-config', ctime: '', detail: `${c.key} ${c.change}` });
      }
    }
  }
  findings.sort((a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind));
  return {
    ok: !findings.length && !errors.length, since: baseline.since, roots: s.roots, allowed: s.allowed, findings, attributed, exempted, errors,
    ms: Number(process.hrtime.bigint() - t0) / 1e6,
  };
}

/** One-paragraph explanation for a failed audit, with the remedy. */
export function describeAudit(a, limit = 20) {
  if (a.ok) return `nothing written, deleted, created or touched outside the studio since ${a.since}`;
  const label = { written: 'written', deleted: 'DELETED', touched: 'touched', created: 'new directory', 'git-config': 'git config' };
  const lines = a.findings.slice(0, limit).map((f) => `  ${label[f.kind]}: ${f.path}${f.detail ? ` (${f.detail})` : ''}${f.ctime ? `  [${f.ctime}]` : ''}`);
  if (a.findings.length > limit) lines.push(`  … ${a.findings.length - limit} more`);
  for (const e of a.errors) lines.push(`  audit error: ${e}`);
  return [
    `${a.findings.length} change(s) outside the studio root and ${WORK} since ${a.since}:`, ...lines,
    'Studio work writes only to the studio and WORK: move scratch files to WORK/tmp and delete these; restore what was deleted if you can.',
    'A touched directory had a file created and deleted again (nothing is left to remove): find out what wrote there before re-arming.',
    'If the writer is not studio code (harness, OS), add it to EXTERNAL_WRITERS in render/lib/write-audit.mjs with a reason,',
    'or re-arm after review: node cli/hm.mjs guard --arm --reason "<what was reviewed>".',
  ].join('\n');
}
