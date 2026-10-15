import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existingNames, secretsToSet, workerMissing } from '../scripts/ci-secrets.mjs';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('../scripts/ci-secrets.mjs', import.meta.url));

test('existing secret names are read from `wrangler secret list` output, warnings and all', () => {
  assert.deepEqual([...existingNames('[{"name":"TOKEN_SIGNING_KEY","type":"secret_text"}]')], ['TOKEN_SIGNING_KEY']);
  assert.deepEqual([...existingNames('▲ [WARNING] something\n[{"name":"A","type":"secret_text"},{"name":"B","type":"secret_text"}]\n')], ['A', 'B']);
  assert.equal(existingNames('Error: not found'), null);
  assert.equal(existingNames('[not json'), null);
});

test('signing keys are generated only when missing; the API key is passed through', () => {
  let n = 0;
  const gen = () => `generated-${++n}`;
  assert.deepEqual(secretsToSet(new Set(), { ANTHROPIC_API_KEY: 'sk-1' }, gen), { ANTHROPIC_API_KEY: 'sk-1', TOKEN_SIGNING_KEY: 'generated-1', IP_HASH_KEY: 'generated-2' });
  assert.deepEqual(secretsToSet(new Set(['TOKEN_SIGNING_KEY', 'IP_HASH_KEY']), {}, gen), {});
  assert.deepEqual(secretsToSet(new Set(['TOKEN_SIGNING_KEY', 'IP_HASH_KEY']), { TESTER_INVITE_CODES: 'A,B' }, gen), { TESTER_INVITE_CODES: 'A,B' });
  assert.ok(secretsToSet(new Set(), {}).TOKEN_SIGNING_KEY.length >= 40, 'random keys are long');
});

test('the CLI writes a private file, never prints values, and refuses to rotate on unreadable output', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ci-secrets-'));
  const list = join(dir, 'list.json');
  const out = join(dir, 'out.json');
  writeFileSync(list, '[{"name":"TOKEN_SIGNING_KEY","type":"secret_text"}]');
  const { stdout } = await run(process.execPath, [SCRIPT, list, out, '--list-ok'], { env: { ...process.env, ANTHROPIC_API_KEY: 'sk-secret-value' } });
  assert.match(stdout, /Secrets to set: ANTHROPIC_API_KEY, IP_HASH_KEY/);
  assert.ok(!stdout.includes('sk-secret-value'));
  const written = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(Object.keys(written).sort(), ['ANTHROPIC_API_KEY', 'IP_HASH_KEY']);
  assert.ok(!stdout.includes(written.IP_HASH_KEY));
  assert.equal(statSync(out).mode & 0o077, 0, 'not readable by others');
  writeFileSync(list, 'garbage');
  await assert.rejects(run(process.execPath, [SCRIPT, list, out, '--list-ok']));
});

test('only "Worker not found" counts as a first deploy', () => {
  // wrangler 4.x wording, and the raw API errors (10007, legacy-env 10090).
  assert.ok(workerMissing('✘ [ERROR] Worker "hushmallow-another-angle" not found.\n\nIf this is a new Worker, run `wrangler deploy` first to create it.'));
  assert.ok(workerMissing('✘ [ERROR] Worker "hushmallow-another-angle" (env: dev) not found.'));
  assert.ok(workerMissing('A request to the Cloudflare API failed.\n  This Worker does not exist on your account. [code: 10007]'));
  assert.ok(workerMissing('… [code: 10090]'));
  // As wrangler prints it in CI: coloured, with ANSI escape codes around the words.
  assert.ok(workerMissing('\x1b[31m✘ \x1b[41;31m[\x1b[41;97mERROR\x1b[41;31m]\x1b[0m \x1b[1mWorker "hushmallow-another-angle-staging" (env: staging) not found.\x1b[0m\n\n  If this is a new Worker, run `wrangler deploy` first to create it.'));
  assert.ok(!workerMissing('\x1b[31m✘ \x1b[41;31m[\x1b[41;97mERROR\x1b[41;31m]\x1b[0m \x1b[1mInvalid account ID set in the `CLOUDFLARE_ACCOUNT_ID` environment variable.\x1b[0m'));
  // Anything else must not regenerate the signing keys.
  for (const err of [
    '✘ [ERROR] A request to the Cloudflare API (/accounts/x/workers/scripts/y/secrets) failed.\n  Authentication error [code: 10000]',
    'Error: getaddrinfo ENOTFOUND api.cloudflare.com',
    'fetch failed: socket hang up',
    '✘ [ERROR] Too many requests [code: 971]',
    '',
  ]) assert.equal(workerMissing(err), false, err);
});

test('the CLI fails the job on a list error that is not "Worker not found", and generates keys only when it is', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ci-secrets-'));
  const err = join(dir, 'list.err');
  const out = join(dir, 'out.json');
  writeFileSync(err, '✘ [ERROR] Authentication error [code: 10000]');
  const failed = await run(process.execPath, [SCRIPT, '--list-error', err, out]).then(() => null, (e) => e);
  assert.ok(failed, 'exits non-zero');
  assert.match(failed.stderr, /Refusing to generate new signing keys/);
  assert.throws(() => readFileSync(out), 'no secrets file written');
  writeFileSync(err, '✘ [ERROR] Worker "hushmallow-another-angle" not found.');
  const first = await run(process.execPath, [SCRIPT, '--list-error', err, out], { env: { ...process.env, ANTHROPIC_API_KEY: '', TESTER_INVITE_CODES: '' } });
  assert.match(first.stdout, /first deploy/);
  assert.match(first.stdout, /TOKEN_SIGNING_KEY, IP_HASH_KEY/);
  assert.match(first.stdout, /::warning title=No ANTHROPIC_API_KEY/);
  assert.match(first.stdout, /::notice title=Testing sessions are open to anyone/);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(out, 'utf8'))).sort(), ['IP_HASH_KEY', 'TOKEN_SIGNING_KEY']);
  // A successful list without --list-ok is a usage error, not a silent first deploy.
  await assert.rejects(run(process.execPath, [SCRIPT, err, out]));
});
