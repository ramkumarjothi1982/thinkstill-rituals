import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existingNames, secretsToSet } from '../scripts/ci-secrets.mjs';

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
  const first = await run(process.execPath, [SCRIPT, '-', out], { env: { ...process.env, ANTHROPIC_API_KEY: '' } });
  assert.match(first.stdout, /TOKEN_SIGNING_KEY, IP_HASH_KEY/);
  assert.match(first.stdout, /::warning title=No ANTHROPIC_API_KEY/);
});
