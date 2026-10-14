// write-jail: the mount plan (pure), its verification, and the launcher's
// behaviour (exit codes, signals, confine(), nesting, the safety check).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { parseMountinfo, mountFor, jailPlan, verifyJail } from '../../render/lib/write-jail.mjs';

const JAIL = fileURLToPath(new URL('../../render/lib/write-jail.mjs', import.meta.url));
const node = (args, opts = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', ...opts });

// A table shaped like this machine's (abridged), incl. an escaped space and stacked mounts.
const TABLE = parseMountinfo([
  '25 1 254:0 / / rw,relatime - ext4 /dev/vda rw',
  '26 25 0:5 / /dev rw,relatime - devtmpfs devtmpfs rw',
  '27 26 0:23 / /dev/shm rw,relatime - tmpfs tmpfs rw',
  '28 26 0:24 / /dev/pts rw,relatime - devpts devpts rw',
  '29 25 0:4 / /proc rw,relatime - proc proc rw',
  '30 25 0:21 / /sys rw,relatime - sysfs sysfs rw',
  '31 30 0:26 / /sys/fs/cgroup rw,relatime - tmpfs tmpfs rw',
  '32 25 254:16 / /opt/rclone ro,relatime - squashfs /dev/vdb ro',
  '33 25 0:30 / /run/sandbox-telemetry rw,nosuid - tmpfs tmpfs rw',
  '34 25 254:0 /srv/a\\040b /mnt/a\\040b rw - ext4 /dev/vda rw',
].join('\n'));

test('parseMountinfo decodes fields and octal escapes', () => {
  assert.equal(TABLE.length, 10);
  assert.deepEqual(TABLE[0], { mountPoint: '/', options: ['rw', 'relatime'], fstype: 'ext4', source: '/dev/vda' });
  assert.equal(TABLE[9].mountPoint, '/mnt/a b');
});

test('mountFor finds the deepest (and topmost) mount holding a path', () => {
  assert.equal(mountFor('/dev/shm/x', TABLE).fstype, 'tmpfs');
  assert.equal(mountFor('/devices', TABLE).mountPoint, '/');
  assert.equal(mountFor('/home/user/x', TABLE).mountPoint, '/');
});

test('jailPlan: writable binds and private temp first, frozen islands read-only, every other storage mount read-only', () => {
  const plan = jailPlan({ mounts: TABLE, writable: ['/S', '/W'], frozen: ['/S/stage2', '/S/output/v2', '/S/missing'], privTmp: '/W/tmp/jail-1',
    exists: (p) => p !== '/S/missing' });
  const s = plan.map((a) => a.join(' '));
  assert.deepEqual(s.slice(0, 5), ['--bind /S /S', '--bind /W /W', '--bind /W/tmp/jail-1/tmp /tmp', '--bind /W/tmp/jail-1/var-tmp /var/tmp',
    '-t tmpfs -o mode=1777,nosuid,nodev tmpfs /dev/shm']);
  assert.deepEqual(s.slice(5, 9), ['--bind /S/stage2 /S/stage2', '-o remount,bind,ro /S/stage2', '--bind /S/output/v2 /S/output/v2', '-o remount,bind,ro /S/output/v2']);
  const remounts = s.slice(9);
  assert.deepEqual(remounts, ['-o remount,bind,ro /', '-o remount,bind,ro /dev', '-o remount,bind,ro /run/sandbox-telemetry', '-o remount,bind,ro /mnt/a b']);
  // never: a superblock remount (no 'bind' flag), kernel filesystems, already-ro mounts, or the covered /dev/shm
  assert.ok(plan.every((a) => !a.includes('remount,ro')));
  for (const never of ['/proc', '/sys', '/sys/fs/cgroup', '/dev/pts', '/opt/rclone', '/dev/shm']) {
    assert.ok(!remounts.some((r) => r.endsWith(` ${never}`)), `${never} must not be remounted`);
  }
});

test('verifyJail reports a writable root, a read-only studio or a writable frozen path', () => {
  const opts = { writable: ['/S'], frozen: ['/S/stage2'], exists: () => true };
  const built = parseMountinfo(['1 0 0:1 / / ro - ext4 a ro', '2 1 0:1 /S /S rw - ext4 a rw', '3 1 0:2 / /tmp rw - ext4 a rw',
    '4 2 0:1 /S/stage2 /S/stage2 ro - ext4 a rw'].join('\n'));
  assert.deepEqual(verifyJail(built, opts), []);
  const broken = parseMountinfo(['1 0 0:1 / / rw - ext4 a rw', '2 1 0:1 /S /S ro - ext4 a rw', '3 1 0:2 / /tmp rw - ext4 a rw',
    '4 2 0:1 /S/stage2 /S/stage2 rw - ext4 a rw'].join('\n'));
  assert.deepEqual(verifyJail(broken, opts), ['/ is writable', '/S is read-only', 'frozen /S/stage2 is writable']);
});

test('the CLI passes exit codes and signals through, and confines the command', () => {
  assert.equal(node([JAIL, '--', process.execPath, '-e', 'process.exit(7)']).status, 7);
  assert.equal(node([JAIL, '--', process.execPath, '-e', 'process.kill(process.pid, "SIGTERM")']).status, 143);
  assert.equal(node([JAIL, '--', process.execPath, JAIL, '--status']).status, 0, 'inside: --status says confined');
  assert.equal(node([JAIL, '--']).status, 2, 'no command: usage');
});

test('confine() re-runs an entry script inside the jail, with its arguments; nesting does not build a second jail', () => {
  const d = mkWorkTemp('jail-entry-');
  try {
    const script = path.join(d, 'entry.mjs');
    fs.writeFileSync(script, `import { confine, isConfined } from ${JSON.stringify(JAIL)};
await confine();
console.log(JSON.stringify({ confined: isConfined(), args: process.argv.slice(2), host: process.env.HM_JAIL_HOST_PID }));`);
    const once = JSON.parse(node([script, 'a', 'b c']).stdout);
    assert.deepEqual([once.confined, once.args], [true, ['a', 'b c']]);
    const nested = JSON.parse(node([JAIL, '--', process.execPath, script]).stdout);
    assert.equal(nested.confined, true);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('HM_JAIL=off runs unconfined and says so', () => {
  const r = node([JAIL, '--', process.execPath, '-e', 'process.exit(0)'], { env: { ...process.env, HM_JAIL: 'off' } });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /WITHOUT the write jail/);
});

test('safety: --inside refuses to build a jail in its parent\'s mount namespace (run inside an outer jail, so a bug could not reach the host)', () => {
  const d = mkWorkTemp('jail-safety-');
  try {
    const probe = `const r = require('node:child_process').spawnSync(process.execPath, [${JSON.stringify(JAIL)}, '--inside', '--', 'true'],
      { encoding: 'utf8', env: { ...process.env, HM_JAIL_HOST_PID: String(process.pid), HM_JAIL_TMP: ${JSON.stringify(d)} } });
    console.log(JSON.stringify({ status: r.status, stderr: r.stderr, made: require('node:fs').readdirSync(${JSON.stringify(d)}) }));`;
    const out = JSON.parse(node([JAIL, '--', process.execPath, '-e', probe]).stdout.trim());
    assert.equal(out.status, 1);
    assert.match(out.stderr, /not in a private mount namespace/);
    assert.deepEqual(out.made, [], 'nothing was prepared before the refusal');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
