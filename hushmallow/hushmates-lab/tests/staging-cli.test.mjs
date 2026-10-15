// Each staging command run as the owner's cloud session runs it (node tools/<tool>.mjs …), against
// the Management API stand-in, so a command can't break in a way the function-level tests can't see
// (a name not in scope, a flag read wrongly, a refusal that never happens). No network is used:
// the stand-in is on this computer, and the Supabase project's own address is never reached.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { standIn, emptyDatabase, TOKEN, REF, STAGING } from './management-api-stand-in.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://hushmates-staging.pages.dev';
const ROOT_SECRET = 'q7Vd-Lm2#xR9pT4!wZ6nB8@kH3sJ5cF1yG0uE-cli-test-only';
const noLocalSecrets = !existsSync(join(ROOT, '.data', 'staging.env'));

/** Run a tool with only what a cloud session would have (and the stand-in's address). → { code, out } */
function run(tool, args, extraEnv) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(ROOT, 'tools', tool), ...args], {
      cwd: ROOT,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, SUPABASE_ACCESS_TOKEN: TOKEN, HUSHMATES_STAGING_ROOT_SECRET: ROOT_SECRET, ...extraEnv },
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => child.kill('SIGKILL'), 60e3);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out }); });
  });
}

test('the deploy command: a dry run against the stand-in reads, says what it would do, and finds nothing in the way', { skip: !noLocalSecrets && 'a .data/staging.env is here (the root secret would be refused beside it)' }, async () => {
  const db = await emptyDatabase();
  const s = await standIn({ database: db.name, project: STAGING });
  try {
    const r = await run('staging-deploy.mjs', ['--project-ref', REF, '--site', SITE], { HUSHMATES_MANAGEMENT_API: s.base });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /A dry run: reading only/);
    assert.match(r.out, /root secret/);
    assert.match(r.out, /The dry run found nothing in the way/);
    assert.ok(!/is not defined|TypeError|ReferenceError/.test(r.out), r.out);
    assert.ok(!r.out.includes(ROOT_SECRET) && !r.out.includes(TOKEN), 'a secret was printed');
    assert.ok(s.state.calls.every((c) => c.startsWith('GET') || c.endsWith('/database/query')), s.state.calls.join(', '));
    assert.deepEqual(s.state.problems, []);
  } finally { await s.close(); await db.drop(); }
});

test('every staging command refuses a project that isn’t the staging-only one, before reading keys or data', { skip: !noLocalSecrets && 'a .data/staging.env is here' }, async () => {
  const db = await emptyDatabase();
  const s = await standIn({ database: db.name, project: { ...STAGING, name: 'hushmallow' } });
  try {
    for (const tool of ['staging-deploy.mjs', 'staging-check.mjs', 'staging-e2e.mjs']) {
      s.state.calls.length = 0;
      const r = await run(tool, ['--project-ref', REF, '--site', SITE], { HUSHMATES_MANAGEMENT_API: s.base });
      assert.notEqual(r.code, 0, `${tool}: ${r.out}`);
      assert.match(r.out, /refused|⛔/, `${tool}: ${r.out}`);
      assert.match(r.out, /staging/i, `${tool}: ${r.out}`);
      assert.ok(!/is not defined|TypeError|ReferenceError/.test(r.out), `${tool}: ${r.out}`);
      assert.ok(!s.state.calls.some((c) => c.includes('api-keys') || c.includes('/secrets') || (c.endsWith('/database/query') && tool !== 'staging-deploy.mjs')), `${tool} read keys or data before refusing: ${s.state.calls.join(', ')}`);
      assert.ok(!r.out.includes(ROOT_SECRET) && !r.out.includes(TOKEN), `${tool} printed a secret`);
    }
  } finally { await s.close(); await db.drop(); }
});

test('the Management API address can only be overridden to a stand-in on this computer', async () => {
  const r = await run('staging-check.mjs', ['--project-ref', REF, '--site', SITE], { HUSHMATES_MANAGEMENT_API: 'https://api.example.com' });
  assert.notEqual(r.code, 0);
  assert.match(r.out, /only for a test stand-in/);
  assert.ok(!r.out.includes(TOKEN));
});
