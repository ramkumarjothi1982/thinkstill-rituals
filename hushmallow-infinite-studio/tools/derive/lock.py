"""Run a derivation inside the studio's heavy-job lock (render/lib/heavy-lock.mjs).

A derivation saturates the 4-core machine for minutes, so it must never share
it with renders, golden captures or benchmarks: their timings would be
distorted and two jobs would each take twice as long. Every entry script of
tools/derive calls ensure_heavy_lock() first:

  * already inside a lease (HM_HEAVY_LOCK is set, e.g. started through
    `npm run derive` or `node render/lib/heavy-lock.mjs --exclusive -- ...`):
    run as is;
  * otherwise: re-exec this very command through the lock CLI in exclusive
    mode. Exclusive waits for running render workers to finish and keeps new
    ones out until the derivation ends, which is how derivations are scheduled
    outside render windows. The CLI also runs the command inside the write
    jail (render/lib/write-jail.mjs), where assets/noomi/ and the rest of the
    frozen v2 are read-only at the kernel level.

`--no-lock` (handled by the callers) skips this for fast unit tests only.
"""
import os
import shutil
import sys

from . import paths

ENV_KEY = 'HM_HEAVY_LOCK'
LOCK_CLI = os.path.join(paths.STUDIO, 'render', 'lib', 'heavy-lock.mjs')


def parse_lease(value):
    """Parse an HM_HEAVY_LOCK value ("exclusive@<dir>" or "shared:<w>@<dir>")
    into (mode, weight, dir), or None when it is missing or malformed."""
    if not value or '@' not in value:
        return None
    head, _, where = value.partition('@')
    if head == 'exclusive':
        return ('exclusive', 0, where)
    if head.startswith('shared:') and head[7:].isdigit():
        return ('shared', int(head[7:]), where)
    return None


def held_lease(env=None):
    return parse_lease((env if env is not None else os.environ).get(ENV_KEY))


def lock_command(argv, label, mode='exclusive', python=None):
    """The command line that re-runs `argv` (a python script plus its args)
    under the heavy lock (`mode`: 'exclusive' for derivations and timings,
    'shared' for short test runs)."""
    if mode not in ('exclusive', 'shared'):
        raise ValueError(f'heavy-lock mode must be exclusive or shared, not {mode!r}')
    node = shutil.which('node') or 'node'
    return [node, LOCK_CLI, f'--{mode}', '--label', label, '--',
            python or sys.executable, '-I', *argv]


def ensure_heavy_lock(argv, label, mode='exclusive'):
    """Return when the process holds a heavy-lock lease; otherwise replace the
    process with the same command run under the lock (never returns)."""
    if held_lease() is not None:
        return
    cmd = lock_command(argv, label, mode)
    print(f'[derive] taking the {mode} heavy-job lock ({label}); waiting for running jobs if any',
          file=sys.stderr, flush=True)
    os.execv(cmd[0], cmd)
