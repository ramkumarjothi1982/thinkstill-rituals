// The asset-derivation tests (tools/derive/tests, Python unittest, WP-07) as one
// node:test, so `hm test derive` runs them with the other suites.
//
// tools/derive/tests/run.py takes the shared heavy-job lock itself (it re-execs
// through render/lib/heavy-lock.mjs unless a lease is already held), so this
// wrapper does not: the 3 synthetic end-to-end derivations need a CPU slot,
// the rest are fast unit tests. `python3 -I` keeps the studio's directories off
// sys.path except through run.py's own insert, and run.py writes no bytecode.
// Outputs go to WORK (/home/user/hm-work/derive-test), never to assets/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RUN = fileURLToPath(new URL('../../tools/derive/tests/run.py', import.meta.url));
const STUDIO = fileURLToPath(new URL('../../', import.meta.url));

test('tools/derive: the Python unittest suite passes (tests/run.py, incl. the synthetic equivalence derivations)', { timeout: 1800000 }, async (t) => {
  const { code, out } = await new Promise((resolve, reject) => {
    const child = spawn('python3', ['-I', RUN], { cwd: STUDIO, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { out += c; });
    child.once('error', reject);
    child.once('close', (code, sig) => resolve({ code: code ?? `signal ${sig}`, out }));
  });
  // unittest's summary lines ("Ran 58 tests in 141.1s", "OK (skipped=1)") make the verdict readable in the report.
  for (const l of out.split('\n').filter((l) => /^(Ran \d+ tests|OK|FAILED)/.test(l))) t.diagnostic(l);
  assert.equal(code, 0, `python3 -I tools/derive/tests/run.py failed:\n${out.split('\n').slice(-60).join('\n')}`);
});
