// No secret in any tracked file of the repository: the scan of the app suite
// (hushmallow/tools/secret-scan.mjs, tests/no-secrets.test.mjs), run here too.
// The server's workflow runs only this suite and the app's runs only for app
// paths, so a key pasted into src/config.js, a doc or the repository root
// fails this suite as well.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { describe, scanTree, trackedFiles } from '../../../tools/secret-scan.mjs';

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));

test('no tracked file of the repository holds a secret (git ls-files from the repository root)', () => {
  const files = trackedFiles(REPO);
  for (const f of ['hushmallow/server/another-angle/src/config.js', 'hushmallow/server/another-angle/wrangler.toml', 'hushmallow/docs/STAGING.md', 'README.md']) assert.ok(files.includes(f), `${f} is scanned`);
  assert.deepEqual(scanTree(REPO).map(describe), []);
});
