// Write jail: run a studio job in a view of the machine where the only
// writable places are STUDIO and WORK.
//
// Why: "nothing is written outside the studio root" must not depend on every
// tool remembering to call assertWritable(). Inside the jail the kernel
// refuses (EROFS) every write outside STUDIO and WORK, for the job and for
// every process it starts (Chromium, ffmpeg, python), and the frozen v2
// paths are read-only as well, so a render pointed at output/v2/ fails
// instead of overwriting the approved files.
//
// How: a private mount namespace (`unshare --mount`, propagation private).
// Inside it:
//   - STUDIO and WORK are bind-mounted onto themselves and stay writable;
//   - /tmp and /var/tmp become a fresh directory under WORK/tmp (removed when
//     the job ends), and /dev/shm a private tmpfs;
//   - each paths.FROZEN entry is bind-mounted onto itself read-only;
//   - every other storage mount ('/', /dev, …) is remounted read-only, per
//     mount point (MS_BIND|MS_REMOUNT) and only inside the namespace: the host
//     and every other process keep their read-write view.
// It needs CAP_SYS_ADMIN (the studio machine runs everything as root). It is a
// guard rail against mistakes, not a security boundary: a root process can
// leave it on purpose (for example through /proc/<host pid>/root). Anything
// that lands outside the studio anyway is caught afterwards by
// render/lib/write-audit.mjs, which inspects the host's view.
//
// Use:
//   node render/lib/write-jail.mjs -- <cmd...>   run a command confined (npm scripts do this);
//                                                exit code passes through
//   await confine();                             first statement of an entry script: re-runs the
//                                                script confined (a no-op when already confined)
//   node render/lib/write-jail.mjs --status      is this process confined? (exit 0 yes, 1 no)
// HM_JAIL=off runs without the jail and says so on stderr: only for machines
// without mount namespaces. Every guard and the write audit still apply.

import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STUDIO, WORK, WORK_TMP, FROZEN, isInside } from './paths.mjs';

const SELF = fileURLToPath(import.meta.url);
export const JAIL_VAR = 'HM_JAIL';                     // '1' inside the jail; 'off' disables it
export const HOST_PID_VAR = 'HM_JAIL_HOST_PID';        // the launcher, which stays in the host namespace
const TMP_VAR = 'HM_JAIL_TMP';

// Filesystems that can hold files. Everything else (proc, sysfs, cgroup,
// devpts, mqueue, …) is kernel state, not storage, and is left alone.
export const STORAGE_FS = new Set(['ext2', 'ext3', 'ext4', 'xfs', 'btrfs', 'f2fs', 'zfs', 'overlay', 'tmpfs', 'ramfs',
  'devtmpfs', 'vfat', 'exfat', 'ntfs3', 'fuseblk', '9p', 'virtiofs', 'nfs', 'nfs4', 'cifs', 'squashfs']);
const PRIVATE = ['/tmp', '/var/tmp', '/dev/shm'];     // replaced by private mounts inside the jail

const unescape = (s) => s.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));

/** Parse /proc/<pid>/mountinfo. → [{ mountPoint, options: [...], fstype, source }] in mount order (later = on top). */
export function parseMountinfo(text) {
  return text.split('\n').filter(Boolean).map((line) => {
    const [pre, post] = line.split(' - ');
    const f = pre.split(' ');
    const [fstype, source] = post.split(' ');
    return { mountPoint: unescape(f[4]), options: f[5].split(','), fstype, source: unescape(source) };
  });
}
export const readMounts = (pid = 'self') => parseMountinfo(fs.readFileSync(`/proc/${pid}/mountinfo`, 'utf8'));

/** The mount that holds `p`: the deepest mount point containing it, topmost if stacked. */
export function mountFor(p, mounts) {
  let best = null;
  for (const m of mounts) if (isInside(p, m.mountPoint) && (!best || m.mountPoint.length >= best.mountPoint.length)) best = m;
  return best;
}
const isRo = (m) => m.options.includes('ro');

/**
 * The mount(8) calls that build the jail, in order (pure, so it is unit-tested
 * without root). `mounts` is the namespace's table before any change.
 * → [ [arg, …], … ]
 */
export function jailPlan({ mounts, writable = [STUDIO, WORK], frozen = FROZEN.map((f) => path.join(STUDIO, f)), privTmp, exists = fs.existsSync }) {
  const plan = [];
  // 1. writable roots and private temp space: new mounts, so the read-only
  //    remounts below (which target mount points by path) never reach them
  for (const w of writable) plan.push(['--bind', w, w]);
  if (exists('/tmp')) plan.push(['--bind', path.join(privTmp, 'tmp'), '/tmp']);
  if (exists('/var/tmp')) plan.push(['--bind', path.join(privTmp, 'var-tmp'), '/var/tmp']);
  if (exists('/dev/shm')) plan.push(['-t', 'tmpfs', '-o', 'mode=1777,nosuid,nodev', 'tmpfs', '/dev/shm']);
  // 2. frozen v2: read-only islands inside the writable studio
  for (const f of frozen.filter((p) => exists(p))) plan.push(['--bind', f, f], ['-o', 'remount,bind,ro', f]);
  // 3. everything else that can hold files: read-only. Mount points the jail
  //    has just covered (private temp, writable roots) are skipped, because a
  //    remount by path would hit the new mount on top instead.
  const covered = new Set([...PRIVATE, ...writable]);
  const seen = new Set();
  for (const m of mounts) {
    if (!STORAGE_FS.has(m.fstype) || isRo(m) || covered.has(m.mountPoint) || seen.has(m.mountPoint)) continue;
    if (['/proc', '/sys'].some((v) => isInside(m.mountPoint, v))) continue;
    seen.add(m.mountPoint);
    plan.push(['-o', 'remount,bind,ro', m.mountPoint]);
  }
  return plan;
}

/** Check a built jail: '/' read-only, writable roots and /tmp writable, frozen paths read-only. → [problem, …] */
export function verifyJail(mounts, { writable = [STUDIO, WORK], frozen = FROZEN.map((f) => path.join(STUDIO, f)), exists = fs.existsSync } = {}) {
  const problems = [];
  const at = (p) => mountFor(p, mounts);
  if (!isRo(at('/'))) problems.push('/ is writable');
  for (const w of [...writable, '/tmp']) if (isRo(at(w))) problems.push(`${w} is read-only`);
  for (const f of frozen.filter((p) => exists(p))) if (!isRo(at(f))) problems.push(`frozen ${f} is writable`);
  return problems;
}

/** True when this process runs inside the write jail (checked against the mount table, not just the env). */
export function isConfined() {
  if (process.env[JAIL_VAR] !== '1') return false;
  try { return isRo(mountFor('/', readMounts())); } catch { return false; }
}

/**
 * Path prefix under which the HOST's filesystem is visible from here: '' outside
 * the jail; inside it, the launcher's root (/proc/<host pid>/root), which shows
 * the real /tmp and /dev/shm instead of the jail's private ones. Read-only
 * inspections (the write audit) use it.
 */
export function hostRoot() {
  if (!isConfined()) return '';
  const p = `/proc/${process.env[HOST_PID_VAR]}/root`;
  fs.accessSync(p, fs.constants.R_OK);   // throws if the launcher is gone: better than auditing the wrong view
  return p;
}

const signum = (sig) => ({ SIGHUP: 1, SIGINT: 2, SIGKILL: 9, SIGTERM: 15 })[sig] ?? 1;

/** Spawn and forward the usual termination signals; resolve with the exit code (128+n for a signal). */
function supervise(file, args, opts, onExit = () => {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: 'inherit', ...opts });
    const fwd = ['SIGINT', 'SIGTERM', 'SIGHUP'].map((s) => [s, () => child.kill(s)]);
    for (const [s, h] of fwd) process.on(s, h);
    const done = () => { for (const [s, h] of fwd) process.off(s, h); onExit(); };
    child.on('error', (e) => { done(); reject(e); });
    child.on('exit', (code, sig) => { done(); resolve(code ?? 128 + signum(sig)); });
  });
}

/**
 * Run `cmd args` inside the write jail. → Promise<exit code>
 * Already confined: runs it directly. HM_JAIL=off: runs it unconfined, with a warning.
 */
export async function runJailed(cmd, args = [], { env = process.env, cwd = process.cwd() } = {}) {
  if (isConfined()) return supervise(cmd, args, { env, cwd });
  if (env[JAIL_VAR] === 'off') {
    process.stderr.write(`[write-jail] HM_JAIL=off: running WITHOUT the write jail: ${cmd} ${args.join(' ')}\n`);
    return supervise(cmd, args, { env, cwd });
  }
  fs.mkdirSync(WORK_TMP, { recursive: true });
  const privTmp = fs.mkdtempSync(path.join(WORK_TMP, 'jail-'));
  const jailEnv = { ...env, [HOST_PID_VAR]: String(process.pid), [TMP_VAR]: privTmp };
  delete jailEnv[JAIL_VAR];
  return supervise('unshare', ['--mount', '--propagation', 'private', '--', process.execPath, SELF, '--inside', '--', cmd, ...args],
    { env: jailEnv, cwd }, () => fs.rmSync(privTmp, { recursive: true, force: true }));
}

/**
 * First statement of an entry script: unless already confined, run this same
 * script (same node flags and arguments) inside the jail, then exit with its
 * code. Static imports have run by then, so entry scripts import only modules
 * that do no work at import time (true of render/lib/* and cli/lib/*).
 */
export async function confine() {
  if (isConfined()) return;
  if (process.env[JAIL_VAR] === 'off') {
    process.stderr.write('[write-jail] HM_JAIL=off: running WITHOUT the write jail\n');
    return;
  }
  process.exit(await runJailed(process.execPath, [...process.execArgv, ...process.argv.slice(1)]));
}

// Inside the new namespace (spawned by runJailed through unshare): build the
// jail, verify it, then run the job.
async function inside(cmd, args) {
  const hostPid = process.env[HOST_PID_VAR], privTmp = process.env[TMP_VAR];
  // Safety first: these remounts must never run in the host's namespace,
  // where they would make the machine's root filesystem read-only for everyone.
  if (!hostPid || !privTmp) throw new Error('--inside is internal: use runJailed() or `write-jail.mjs -- <cmd>`');
  if (fs.readlinkSync('/proc/self/ns/mnt') === fs.readlinkSync(`/proc/${hostPid}/ns/mnt`)) {
    throw new Error('refusing to build the jail: not in a private mount namespace');
  }
  if (!isInside(privTmp, WORK_TMP)) throw new Error(`private tmp must be under ${WORK_TMP}: ${privTmp}`);
  for (const d of ['tmp', 'var-tmp']) { fs.mkdirSync(path.join(privTmp, d)); fs.chmodSync(path.join(privTmp, d), 0o1777); }
  for (const a of jailPlan({ mounts: readMounts(), privTmp })) execFileSync('mount', a, { stdio: ['ignore', 'ignore', 'pipe'] });
  const problems = verifyJail(readMounts());
  if (problems.length) throw new Error(`jail verification failed: ${problems.join('; ')}`);
  const env = { ...process.env, [JAIL_VAR]: '1', TMPDIR: '/tmp' };
  delete env[TMP_VAR];
  process.exitCode = await supervise(cmd, args, { env });
}

async function main(argv) {
  const sep = argv.indexOf('--');
  const opts = sep < 0 ? argv : argv.slice(0, sep);
  const [cmd, ...args] = sep < 0 ? [] : argv.slice(sep + 1);
  if (opts.includes('--status')) {
    const on = isConfined();
    console.log(on ? `confined: writable ${STUDIO}, ${WORK}, private /tmp; everything else read-only` : 'not confined');
    return on ? 0 : 1;
  }
  if (!cmd) {
    console.error('usage: node render/lib/write-jail.mjs -- <cmd> [args...]   |   --status');
    return 2;
  }
  if (opts.includes('--inside')) { await inside(cmd, args); return process.exitCode ?? 0; }
  return runJailed(cmd, args);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
    console.error(`[write-jail] ${e.message}`);
    process.exitCode = 1;
  });
}
