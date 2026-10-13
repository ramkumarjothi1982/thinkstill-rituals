// Run a child process with inherited stdio and resolve to its exit code
// (128 + signal number when it was killed), for commands that wrap scripts.

import { spawn } from 'node:child_process';
import os from 'node:os';

export function runInherit(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.once('error', (e) => { console.error(`cannot run ${cmd}: ${e.message}`); resolve(127); });
    child.once('exit', (code, sig) => resolve(code ?? 128 + (os.constants.signals[sig] || 0)));
  });
}

/** Run a Node script with the current Node binary. */
export const runNode = (script, args = [], opts) => runInherit(process.execPath, [script, ...args], opts);
