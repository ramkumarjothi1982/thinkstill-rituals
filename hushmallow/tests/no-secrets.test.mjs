// No secret in git: every tracked file (git ls-files from the repository
// root, binaries skipped) is free of Stripe secret and restricted keys and
// webhook signing secrets, Supabase secret keys, service_role JWTs and access
// tokens, Anthropic keys and private keys (tools/secret-scan.mjs). Publishable
// keys are public and pass. ALLOW holds only the two deliberate fakes, each by
// its exact line. The site tools/build-site.sh assembles is scanned too, with
// no allow-list (tools/site/check.mjs, section 7).
// Every fixture is built at run time, so this file holds no secret-shaped string.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLOW, SECRET_PATTERNS, describe, findSecrets, lineHash, scanFiles, scanTree, secretsInLine, trackedFiles } from '../tools/secret-scan.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const SCAN = join(root, 'tools/secret-scan.mjs');
// git without this machine's settings or a caller's GIT_DIR (the tests may run inside a hook)
const gitEnv = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, env: gitEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const tempRepo = () => { const d = mkdtempSync(join(tmpdir(), 'hm-secrets-')); git(d, 'init', '-q'); return d; };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.${'s'.repeat(43)}`;
const FAKE = {
  'a Stripe secret or restricted key': [`sk_live_${'a'.repeat(24)}`, `rk_live_${'b'.repeat(24)}`, `sk_test_${'c'.repeat(24)}`, `rk_test_${'d'.repeat(99)}`],
  'a Stripe webhook signing secret': [`whsec_${'e'.repeat(32)}`, `whsec_${'Ab0+/='.repeat(4)}`],
  'a Supabase secret key': [['sb', 'secret', 'f'.repeat(20)].join('_')],
  'a Supabase access token': [`sbp_${'0a'.repeat(20)}`],
  'an Anthropic API key': [['sk', 'ant', 'api03', 'g'.repeat(40)].join('-')],
  'a private key': [['-----BEGIN', 'PRIVATE KEY-----'].join(' '), ['-----BEGIN', 'EC', 'PRIVATE KEY-----'].join(' '), ['-----BEGIN', 'OPENSSH', 'PRIVATE KEY-----'].join(' ')],
  'a Supabase service_role JWT': [jwt({ iss: 'supabase', ref: 'abcdefghijklmnopqrst', role: 'service_role', iat: 1, exp: 2 })],
};
// public by design, or a name in prose and code: never flagged
const PUBLIC = [
  `pk_live_${'h'.repeat(24)}`, `pk_test_${'i'.repeat(24)}`, `sb_publishable_${'j'.repeat(24)}`,
  jwt({ iss: 'supabase', ref: 'abcdefghijklmnopqrst', role: 'anon', iat: 1, exp: 2 }),
  `mask_test_${'k'.repeat(12)}`, `disk_live_${'l'.repeat(12)}`,
  'the rk_test_ key', 'an rk_live_… key', 'its whsec_ value', 'sb_secret_ or service_role', 'sk-ant-…', 'a PRIVATE KEY file',
];

test('every tracked file is free of secrets (git ls-files from the repository root)', () => {
  const files = trackedFiles(repo);
  for (const f of ['hushmallow/src/app/config.js', 'hushmallow/server/another-angle/wrangler.toml', 'hushmallow/docs/PAYMENTS.md', '.github/workflows/another-angle-real.yml']) assert.ok(files.includes(f), `${f} is scanned`);
  assert.deepEqual(scanTree(repo).map(describe), []);
});

test('each pattern finds its secret, inside a line too; public keys and names in prose pass', () => {
  assert.deepEqual(Object.keys(FAKE), SECRET_PATTERNS.map((p) => p.kind), 'a fixture for every pattern');
  for (const [kind, values] of Object.entries(FAKE)) {
    for (const v of values) {
      for (const line of [v, `STRIPE_SECRET_KEY=${v}`, `const k = '${v}';`, `"key":"${v}"`, `?k=%22${v}`]) {
        assert.deepEqual(secretsInLine(line).map((s) => s.kind), [kind], `${kind}: ${line.slice(0, 24)}`);
      }
    }
  }
  for (const v of PUBLIC) assert.deepEqual(secretsInLine(`x ${v} y`), [], v.slice(0, 24));
  assert.deepEqual(findSecrets(`a\nb ${FAKE['a Stripe webhook signing secret'][0]}\nc\n${FAKE['an Anthropic API key'][0]}`).map((s) => [s.line, s.head]), [[2, 'whsec_'], [4, 'sk-ant-']]);
});

test('a tracked file holding a runtime-built rk_test_ key fails the scan; the report never shows the key', () => {
  const d = tempRepo();
  try {
    const key = `rk_test_${'Z9'.repeat(16)}`;
    mkdirSync(join(d, 'src'));
    writeFileSync(join(d, 'src/config.js'), `// config\nexport const STRIPE = '${key}';\n`);
    writeFileSync(join(d, 'clean.md'), 'Set the rk_test_ key as a Worker secret.\n');
    writeFileSync(join(d, 'binary.bin'), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(key)]));
    writeFileSync(join(d, 'untracked.txt'), key);
    git(d, 'add', 'src/config.js', 'clean.md', 'binary.bin');
    assert.deepEqual(scanTree(d), [{ file: 'src/config.js', line: 2, kind: 'a Stripe secret or restricted key', head: 'rk_test_' }]);
    // the command line: exit 1, where and what kind, never the value
    const r = spawnSync(process.execPath, [SCAN], { cwd: d, env: gitEnv, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /src\/config\.js:2: a Stripe secret or restricted key \(rk_test_…\)/);
    assert.ok(!r.stderr.includes(key) && !r.stdout.includes(key), 'the key is never printed');
    git(d, 'rm', '-q', '--cached', 'src/config.js');
    const ok = spawnSync(process.execPath, [SCAN], { cwd: d, env: gitEnv, encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /no secrets in tracked files/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('ALLOW: exactly the two deliberate fakes, each by its exact line', () => {
  assert.deepEqual(ALLOW.map((a) => a.file), ['.github/workflows/another-angle-real.yml', 'hushmallow/tests/security-headers-monitor.test.mjs']);
  // without ALLOW the tree has exactly those two findings
  assert.deepEqual(scanFiles(repo, trackedFiles(repo), { allow: false }).map((f) => `${f.file} ${f.kind}`), ['.github/workflows/another-angle-real.yml an Anthropic API key', 'hushmallow/tests/security-headers-monitor.test.mjs a Supabase secret key']);
  for (const a of ALLOW) {
    assert.ok(a.why, `${a.file}: says why`);
    const lines = readFileSync(join(repo, a.file), 'utf8').split('\n').filter((l) => lineHash(l) === a.sha256);
    assert.equal(lines.length, 1, `${a.file}: the allowed line is there once (not stale)`);
    const [line] = lines;
    assert.ok(secretsInLine(line).length, `${a.file}: the allowed line needs it`);
    assert.deepEqual(findSecrets(line, a.file), [], 'allowed there');
    // only that exact line of that file: edited, or anywhere else, it is reported
    assert.equal(findSecrets(`${line} `, a.file).length, 1, 'one character more');
    assert.equal(findSecrets(line.trim(), a.file).length, 1, 'indented differently');
    assert.equal(findSecrets(line, 'hushmallow/src/app/config.js').length, 1, 'in another file');
    assert.equal(findSecrets(line).length, 1, 'with no file (the site scan)');
  }
});

test('the built site is scanned too, with no allow-list: a key in any published file fails the build, never printed', async () => {
  const out = mkdtempSync(join(tmpdir(), 'hm-secrets-site-'));
  try {
    const env = { ...gitEnv };
    for (const k of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'HM_AUTH_MODE', 'CF_PAGES_BRANCH']) delete env[k];
    const log = execFileSync('bash', [join(root, 'tools/build-site.sh'), out, 'sec1'], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(log, /\d{3,} files scanned for secrets/);
    assert.match(log, /check: ok/);
    const { checkSite } = await import('../tools/site/check.mjs');
    assert.deepEqual((await checkSite(out, 'sec1', { env })).problems, []);
    // a key pasted into src/ (served by Pages), a new file anywhere, and an allowed repository line: each one fails
    const rk = `rk_live_${'Q'.repeat(24)}`, wh = `whsec_${'w'.repeat(32)}`;
    const cfg = join(out, 'v/sec1/src/app/config.js');
    const at = readFileSync(cfg, 'utf8').split('\n').length;
    appendFileSync(cfg, `export const STRIPE = '${rk}';\n`);
    writeFileSync(join(out, 'v/sec1/assets/brand/notes.txt'), `webhook\n${wh}\n`);
    const [a] = ALLOW.filter((x) => x.file.startsWith('hushmallow/'));
    const allowedLine = readFileSync(join(repo, a.file), 'utf8').split('\n').find((l) => lineHash(l) === a.sha256);
    mkdirSync(join(out, 'hushmallow/tests'), { recursive: true });
    writeFileSync(join(out, a.file), `${allowedLine}\n`);
    const r = await checkSite(out, 'sec1', { env });
    assert.deepEqual([...r.problems].sort(), [
      `${a.file}:1: a Supabase secret key (sb_secret_…) is in the site: take it out of the repository and roll it`,
      'v/sec1/assets/brand/notes.txt:2: a Stripe webhook signing secret (whsec_…) is in the site: take it out of the repository and roll it',
      `v/sec1/src/app/config.js:${at}: a Stripe secret or restricted key (rk_live_…) is in the site: take it out of the repository and roll it`,
    ]);
    const cli = spawnSync(process.execPath, [join(root, 'tools/site/check.mjs'), out, 'sec1'], { env, encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /check: 3 problems/);
    for (const v of [rk, wh, allowedLine.match(/sb_secret_\w+/)[0]]) assert.ok(!cli.stderr.includes(v) && !cli.stdout.includes(v), 'a secret is never printed');
  } finally { rmSync(out, { recursive: true, force: true }); }
});
