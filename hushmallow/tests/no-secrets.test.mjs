// No secret in git: every tracked file (git ls-files from the repository
// root, binaries skipped) is free of Stripe secret and restricted keys and
// webhook signing secrets, Supabase secret keys, service_role JWTs and access
// tokens, Anthropic keys, Brevo SMTP and API keys and private keys
// (tools/secret-scan.mjs). Publishable
// keys are public and pass. ALLOW holds only the two deliberate fakes, each by
// its exact line. tools/build-site.sh scans every tracked file before each build
// (a checkout whose git fails stops the build; an export with no .git has every
// file read from disk instead, never skipped)
// and the site it assembles after, with no allow-list (tools/site/check.mjs,
// section 7), and tools/hooks/pre-commit (repository root) refuses a commit
// whose staged lines add one. .env files, like .dev.vars, are never tracked.
// Every fixture is built at run time, so this file holds no secret-shaped string.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLOW, SECRET_PATTERNS, addedLines, describe, findSecrets, lineHash, scanFiles, scanTree, secretsInLine, trackedFiles, walkFiles } from '../tools/secret-scan.mjs';

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
  'a Brevo SMTP or API key': [['xsmtpsib', '0f'.repeat(32), 'Ab'.repeat(8)].join('-'), ['xkeysib', 'a1'.repeat(32), 'Zq'.repeat(8)].join('-')],
  'a private key': [['-----BEGIN', 'PRIVATE KEY-----'].join(' '), ['-----BEGIN', 'EC', 'PRIVATE KEY-----'].join(' '), ['-----BEGIN', 'OPENSSH', 'PRIVATE KEY-----'].join(' ')],
  'a Supabase service_role JWT': [jwt({ iss: 'supabase', ref: 'abcdefghijklmnopqrst', role: 'service_role', iat: 1, exp: 2 })],
};
// public by design, or a name in prose and code: never flagged
const PUBLIC = [
  `pk_live_${'h'.repeat(24)}`, `pk_test_${'i'.repeat(24)}`, `sb_publishable_${'j'.repeat(24)}`,
  jwt({ iss: 'supabase', ref: 'abcdefghijklmnopqrst', role: 'anon', iat: 1, exp: 2 }),
  `mask_test_${'k'.repeat(12)}`, `disk_live_${'l'.repeat(12)}`,
  'the rk_test_ key', 'an rk_live_… key', 'its whsec_ value', 'sb_secret_ or service_role', 'sk-ant-…', 'a PRIVATE KEY file',
  'a Brevo SMTP key (xsmtpsib-…)', 'an xkeysib- key',
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
      // escapes and percent-encodings end in a letter: "\n", "\t", %3D, %3A, curl -u
      for (const line of [v, `STRIPE_SECRET_KEY=${v}`, `const k = '${v}';`, `"key":"${v}"`, `?k=%22${v}`, `"A=1\\n${v}"`, `"a\\t${v}"`, `key%3D${v}`, `%3A${v}`, `curl -u${v}:`]) {
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
  const links = mkdtempSync(join(tmpdir(), 'hm-secrets-link-'));
  try {
    const env = { ...gitEnv };
    for (const k of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'HM_AUTH_MODE', 'CF_PAGES_BRANCH']) delete env[k];
    // built through a linked path to the checkout: every step still runs
    const link = join(links, 'repo');
    symlinkSync(repo, link);
    const log = execFileSync('bash', [join(link, 'hushmallow/tools/build-site.sh'), out, 'sec1'], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(log, /secret scan: no secrets in tracked files/, 'every tracked file is scanned before the build');
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
    for (const check of [join(root, 'tools/site/check.mjs'), join(link, 'hushmallow/tools/site/check.mjs')]) {
      const cli = spawnSync(process.execPath, [check, out, 'sec1'], { env, encoding: 'utf8' });
      assert.equal(cli.status, 1, `${check}: ${cli.stdout}${cli.stderr}`);
      assert.match(cli.stderr, /check: 3 problems/);
      for (const v of [rk, wh, allowedLine.match(/sb_secret_\w+/)[0]]) assert.ok(!cli.stderr.includes(v) && !cli.stdout.includes(v), 'a secret is never printed');
    }
  } finally { rmSync(out, { recursive: true, force: true }); rmSync(links, { recursive: true, force: true }); }
});

test('build-site.sh scans every tracked file first, published or not: a key in a doc, the server or the repository root fails the build', () => {
  // Cloudflare Pages builds every push of every branch, whatever it changes; the workflows filter by path
  const sh = readFileSync(join(root, 'tools/build-site.sh'), 'utf8');
  const at = sh.indexOf('node "$here/tools/secret-scan.mjs"');
  assert.ok(at > 0 && at < sh.indexOf('node "$here/tools/site/auth-config.mjs"'), 'scanned before anything is built');
  const d = tempRepo();
  try {
    // the build's own tools in a repository whose root README holds a key: refused before anything is written
    mkdirSync(join(d, 'hushmallow/tools'), { recursive: true });
    writeFileSync(join(d, 'hushmallow/tools/build-site.sh'), readFileSync(join(root, 'tools/build-site.sh')));
    writeFileSync(join(d, 'hushmallow/tools/secret-scan.mjs'), readFileSync(SCAN));
    const sk = `sk_live_${'R'.repeat(24)}`;
    writeFileSync(join(d, 'README.md'), `# notes\nSTRIPE_SECRET_KEY=${sk}\n`);
    git(d, 'add', '-A');
    const out = join(d, 'dist');
    const r = spawnSync('bash', [join(d, 'hushmallow/tools/build-site.sh'), out, 'sec2'], { cwd: tmpdir(), env: gitEnv, encoding: 'utf8' });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /README\.md:2: a Stripe secret or restricted key \(sk_live_…\)/);
    assert.ok(!r.stderr.includes(sk) && !r.stdout.includes(sk), 'the key is never printed');
    assert.throws(() => lstatSync(out), 'nothing was built');
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// build-site.sh and the scanner in a folder laid out like the repository (<d>/hushmallow/tools/), with these files besides
const buildCopy = (d, files = {}) => {
  mkdirSync(join(d, 'hushmallow/tools'), { recursive: true });
  writeFileSync(join(d, 'hushmallow/tools/build-site.sh'), readFileSync(join(root, 'tools/build-site.sh')));
  writeFileSync(join(d, 'hushmallow/tools/secret-scan.mjs'), readFileSync(SCAN));
  for (const [f, text] of Object.entries(files)) { mkdirSync(dirname(join(d, f)), { recursive: true }); writeFileSync(join(d, f), text); }
};
const BASH = execFileSync('sh', ['-c', 'command -v bash'], { encoding: 'utf8' }).trim();   // by its path: a test may run the build with no git (or bash) on PATH
const buildIn = (d, out, env = gitEnv) => spawnSync(BASH, [join(d, 'hushmallow/tools/build-site.sh'), out, 'sec2'], { cwd: tmpdir(), env, encoding: 'utf8' });

test('build-site.sh in a checkout whose git fails stops the build, never skipping the scan: a bad GIT_DIR, a gitdir that is gone, no git, dubious ownership, a .git git passes over', () => {
  const sk = `sk_live_${'G'.repeat(24)}`;
  const stopped = (r, out, how) => {
    const log = r.stdout + r.stderr;
    assert.equal(r.status, 2, `${how}: ${log}`);
    assert.match(r.stderr, /secret scan: \S+ is a checkout \(it has \.git\) but git cannot list its tracked files/, how);
    assert.doesNotMatch(log, /not a git work tree|every file was read directly|no secrets in/, `${how}: not skipped, not walked`);
    assert.ok(!log.includes(sk), `${how}: the key is never printed`);
    assert.throws(() => lstatSync(out), `${how}: nothing was built`);
  };
  // this repository, git pointed at nothing: the whole site would otherwise be built and published unscanned
  const tmp = mkdtempSync(join(tmpdir(), 'hm-secrets-gitfail-'));
  try {
    const env = { ...gitEnv, GIT_DIR: join(tmp, 'no-such-gitdir') };
    for (const k of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'HM_AUTH_MODE', 'CF_PAGES_BRANCH']) delete env[k];
    const out = join(tmp, 'site');
    stopped(spawnSync('bash', [join(root, 'tools/build-site.sh'), out, 'sec3'], { cwd: tmpdir(), env, encoding: 'utf8' }), out, 'GIT_DIR names no repository');

    // a checkout whose root README holds a key, each with its git broken another way
    const checkout = (name) => { const d = join(tmp, name); mkdirSync(d); git(d, 'init', '-q'); buildCopy(d, { 'README.md': `# notes\nSTRIPE_SECRET_KEY=${sk}\n` }); git(d, 'add', '-A'); return d; };
    // a linked worktree or submodule moved away from its repository: its .git file names a gitdir that is gone
    let d = checkout('moved');
    rmSync(join(d, '.git'), { recursive: true });
    writeFileSync(join(d, '.git'), `gitdir: ${join(tmp, 'gone/.git/worktrees/moved')}\n`);
    stopped(buildIn(d, join(d, 'dist')), join(d, 'dist'), 'a gitdir that is gone');
    // a build image with node but no git
    d = checkout('nogit');
    const bin = join(tmp, 'bin');
    mkdirSync(bin);
    symlinkSync(process.execPath, join(bin, 'node'));
    symlinkSync(execFileSync('sh', ['-c', 'command -v dirname'], { encoding: 'utf8' }).trim(), join(bin, 'dirname'));
    stopped(buildIn(d, join(d, 'dist'), { ...gitEnv, PATH: bin }), join(d, 'dist'), 'no git on PATH');
    // an empty .git inside another repository: git passes over it and answers for the folder above, which tracks none of these files
    const outer = join(tmp, 'outer');
    mkdirSync(outer);
    git(outer, 'init', '-q');
    d = join(outer, 'copy');
    buildCopy(d, { 'README.md': `# notes\nSTRIPE_SECRET_KEY=${sk}\n` });
    mkdirSync(join(d, '.git'));
    const passedOver = buildIn(d, join(d, 'dist'));
    stopped(passedOver, join(d, 'dist'), 'a .git git passes over');
    assert.match(passedOver.stderr, /git takes \S+outer as the work tree/);
    // a checkout owned by another user (a container build, a shared cache): git refuses it (safe.directory)
    if (process.getuid?.() === 0) {
      d = checkout('owned');
      execFileSync('chown', ['-R', '65534:65534', d]);
      const dubious = buildIn(d, join(d, 'dist'));
      stopped(dubious, join(d, 'dist'), 'dubious ownership');
      assert.match(dubious.stderr, /dubious ownership/);
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('build-site.sh in a copy with no .git (an export): every file under the repository root is read directly, so a key in a doc still stops the build', () => {
  const d = mkdtempSync(join(tmpdir(), 'hm-secrets-export-'));
  try {
    const sk = `sk_live_${'E'.repeat(24)}`, wh = `whsec_${'x'.repeat(32)}`;
    buildCopy(d, {
      'README.md': `# notes\nSTRIPE_SECRET_KEY=${sk}\n`,
      'hushmallow/docs/STAGING.md': `the webhook: ${wh}\n`,
      'hushmallow/server/another-angle/.dev.vars': `STRIPE_SECRET_KEY=${sk}\n`,   // gitignored, but an export holding one is itself a leak
      'hushmallow/server/another-angle/node_modules/pkg/fixture.js': `export const k = '${sk}';\n`,   // a dependency: never in git, not read
    });
    const out = join(d, 'dist');
    const r = buildIn(d, out);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /secret scan: 3 secrets in the files under \S+ \(no \.git there, so every file was read directly\)/);
    assert.deepEqual(r.stderr.split('\n').filter((l) => l.startsWith('  ')).map((l) => l.trim()), [
      'README.md:2: a Stripe secret or restricted key (sk_live_…)',
      'hushmallow/docs/STAGING.md:1: a Stripe webhook signing secret (whsec_…)',
      'hushmallow/server/another-angle/.dev.vars:1: a Stripe secret or restricted key (sk_live_…)',
    ]);
    assert.doesNotMatch(r.stderr, /not a git work tree/);
    for (const v of [sk, wh]) assert.ok(!r.stderr.includes(v) && !r.stdout.includes(v), 'a secret is never printed');
    assert.throws(() => lstatSync(out), 'nothing was built');
    // the keys taken out: the walk passes and says what it read (the build then stops here for want of the app)
    writeFileSync(join(d, 'README.md'), '# notes\n');
    writeFileSync(join(d, 'hushmallow/docs/STAGING.md'), 'the webhook: a Worker secret\n');
    rmSync(join(d, 'hushmallow/server/another-angle/.dev.vars'));
    const ok = buildIn(d, out);
    assert.match(ok.stdout, /secret scan: no secrets in the 4 files under \S+ \(no \.git there, so every file was read directly\)/);
    assert.doesNotMatch(ok.stderr, /secret scan:/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('walkFiles: every file under a folder, from disk, the same paths ls-files gives a checkout of it (links not followed; .git and node_modules left out)', () => {
  // every tracked file of this repository is walked
  const walked = walkFiles(repo);
  const has = new Set(walked);
  const missed = trackedFiles(repo).filter((f) => { try { return lstatSync(join(repo, f)).isFile() && !has.has(f); } catch { return false; } });
  assert.deepEqual(missed, [], 'every tracked file is walked');
  assert.deepEqual(walked.filter((f) => /(^|\/)(\.git|node_modules)(\/|$)/.test(f)), [], 'no .git or node_modules file');
  const d = mkdtempSync(join(tmpdir(), 'hm-secrets-walk-'));
  try {
    for (const f of ['z.txt', 'a/b/c.md', '.env', '.git/config', 'node_modules/p/i.js', 'a/node_modules/q/i.js', 'sub/.git']) { mkdirSync(dirname(join(d, f)), { recursive: true }); writeFileSync(join(d, f), 'x\n'); }
    symlinkSync(join(d, 'a'), join(d, 'linked-dir'));
    symlinkSync(join(d, 'z.txt'), join(d, 'linked-file'));
    assert.deepEqual(walkFiles(d), ['.env', 'a/b/c.md', 'z.txt']);
    // an export of this repository (git archive, a tarball with no .git): exactly the files committed at HEAD
    const exp = join(d, 'export');
    mkdirSync(exp);
    execFileSync('sh', ['-c', 'git -C "$1" archive --format=tar HEAD | tar -x -C "$2"', 'sh', repo, exp], { env: gitEnv, stdio: ['ignore', 'ignore', 'pipe'] });
    const committed = git(repo, 'ls-tree', '-r', '-z', 'HEAD').split('\0').filter((l) => l && !l.startsWith('120000 ') && !l.startsWith('160000 ')).map((l) => l.slice(l.indexOf('\t') + 1)).sort();
    assert.deepEqual(walkFiles(exp), committed);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('tools/hooks/pre-commit: a commit whose staged lines add a secret is refused (ALLOW applied); a clean one goes through', () => {
  const hooks = join(repo, 'tools/hooks');
  assert.match(git(repo, 'ls-files', '-s', 'tools/hooks/pre-commit'), /^100755 /, 'tracked as executable');
  assert.ok(readFileSync(join(root, 'README.md'), 'utf8').includes('run `git config core.hooksPath tools/hooks` (from the repository root)'), 'the README says how to turn it on');
  const d = tempRepo();
  try {
    git(d, 'config', 'core.hooksPath', hooks);
    const commit = (msg) => spawnSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', msg], { cwd: d, env: gitEnv, encoding: 'utf8' });
    const count = () => git(d, 'rev-list', '--count', 'HEAD').trim();
    const pk = `pk_live_${'P'.repeat(24)}`, sk = `sk_live_${'K'.repeat(24)}`, wh = `whsec_${'w'.repeat(32)}`;
    const lines = Array.from({ length: 12 }, (_, i) => `const v${i} = ${i};`);
    writeFileSync(join(d, 'app.js'), `${[`const PK = '${pk}';`, ...lines].join('\n')}\n`);
    git(d, 'add', 'app.js');
    let r = commit('a publishable key is public');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout + r.stderr, '', 'quiet on a clean commit');

    // a key on line 3 and line 12 of a changed file (two hunks, a line removed between), a new file with a
    // quoted name whose added line starts with "++ ", and the allowed fake in its own file and in another one
    const changed = [`const PK = '${pk}';`, ...lines];
    changed.splice(2, 0, `const SK = '${sk}';`);
    changed.splice(6, 1);
    changed.splice(11, 0, `const SK2 = '${sk}';`);
    writeFileSync(join(d, 'app.js'), `${changed.join('\n')}\n`);
    writeFileSync(join(d, 'notes "copy".md'), `# notes\n++ ${wh}\n`);
    const [a] = ALLOW.filter((x) => x.file.startsWith('hushmallow/'));
    const allowedLine = readFileSync(join(repo, a.file), 'utf8').split('\n').find((l) => lineHash(l) === a.sha256);
    mkdirSync(join(d, 'hushmallow/tests'), { recursive: true });
    writeFileSync(join(d, a.file), `${allowedLine}\n`);
    writeFileSync(join(d, 'hushmallow/tests/other.test.mjs'), `${allowedLine}\n`);
    git(d, 'add', '-A');
    r = commit('secrets');
    assert.notEqual(r.status, 0, 'refused');
    assert.equal(count(), '1', 'nothing was committed');
    const reported = r.stderr.split('\n').filter((l) => l.startsWith('  ')).map((l) => l.trim());
    assert.deepEqual(reported, [
      'app.js:3: a Stripe secret or restricted key (sk_live_…)',
      'app.js:12: a Stripe secret or restricted key (sk_live_…)',
      'hushmallow/tests/other.test.mjs:1: a Supabase secret key (sb_secret_…)',
      'notes "copy".md:2: a Stripe webhook signing secret (whsec_…)',
    ]);
    assert.match(r.stderr, /commit refused/);
    for (const v of [sk, wh]) assert.ok(!r.stderr.includes(v) && !r.stdout.includes(v), 'a secret is never printed');

    // the values taken out: the commit goes through, the allowed line in its own file included
    writeFileSync(join(d, 'app.js'), `${changed.map((l) => l.replace(`'${sk}'`, 'env.STRIPE_SECRET_KEY')).join('\n')}\n`);
    writeFileSync(join(d, 'notes "copy".md'), '# notes\n++ the whsec_ value is a Worker secret\n');
    rmSync(join(d, 'hushmallow/tests/other.test.mjs'));
    git(d, 'add', '-A');
    r = commit('no secrets');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(count(), '2');

    // no node on PATH: the hook refuses rather than letting a commit through unchecked
    const bin = join(d, 'bin');
    mkdirSync(bin);
    symlinkSync(execFileSync('sh', ['-c', 'command -v dirname'], { encoding: 'utf8' }).trim(), join(bin, 'dirname'));
    const nonode = spawnSync('/bin/sh', [join(hooks, 'pre-commit')], { cwd: d, env: { ...gitEnv, PATH: bin }, encoding: 'utf8' });
    assert.equal(nonode.status, 1);
    assert.match(nonode.stderr, /node is not on PATH, so the secret scan cannot run/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('reached through a symlink (a linked checkout, macOS /tmp), the hook and the command line still scan', () => {
  const d = tempRepo();
  const links = mkdtempSync(join(tmpdir(), 'hm-secrets-link-'));
  try {
    // a clone with the hook and the scanner, reached by a linked path
    mkdirSync(join(d, 'tools/hooks'), { recursive: true });
    mkdirSync(join(d, 'hushmallow/tools'), { recursive: true });
    writeFileSync(join(d, 'tools/hooks/pre-commit'), readFileSync(join(repo, 'tools/hooks/pre-commit')), { mode: 0o755 });
    writeFileSync(join(d, 'hushmallow/tools/secret-scan.mjs'), readFileSync(SCAN));
    git(d, 'add', '-A');
    git(d, 'commit', '-q', '--no-verify', '-m', 'tools');
    const link = join(links, 'clone'), linkRepo = join(links, 'repo');
    symlinkSync(d, link);
    symlinkSync(repo, linkRepo);
    const key = `rk_live_${'L'.repeat(24)}`;
    writeFileSync(join(d, 'config.js'), `export const STRIPE = '${key}';\n`);
    git(d, 'add', 'config.js');
    const at = { cwd: link, env: { ...gitEnv, PWD: link }, encoding: 'utf8' };   // a shell's cd keeps the linked path in PWD
    const commit = (opts) => spawnSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'key'], opts);
    const refused = (r, how) => {
      assert.notEqual(r.status, 0, `${how}: refused`);
      assert.match(r.stderr, /config\.js:1: a Stripe secret or restricted key \(rk_live_…\)/, how);
      assert.ok(!r.stderr.includes(key) && !r.stdout.includes(key), 'the key is never printed');
      assert.equal(git(d, 'rev-list', '--count', 'HEAD').trim(), '1', `${how}: nothing was committed`);
    };
    // the command line by a linked path, tracked files and staged lines
    for (const args of [[], ['--staged']]) {
      const r = spawnSync(process.execPath, [join(link, 'hushmallow/tools/secret-scan.mjs'), ...args], at);
      assert.equal(r.status, 1, `node <link>/hushmallow/tools/secret-scan.mjs ${args.join(' ')}: ${r.stdout}${r.stderr}`);
    }
    // the relative core.hooksPath, committing from the linked clone
    git(d, 'config', 'core.hooksPath', 'tools/hooks');
    refused(commit(at), 'relative hooksPath in a linked clone');
    // an absolute core.hooksPath through a link to this repository
    git(d, 'config', 'core.hooksPath', join(linkRepo, 'tools/hooks'));
    refused(commit({ cwd: d, env: gitEnv, encoding: 'utf8' }), 'linked absolute hooksPath');
  } finally { rmSync(d, { recursive: true, force: true }); rmSync(links, { recursive: true, force: true }); }
});

test('the hook scans a path .gitattributes marks binary or -diff (git would print no lines for it)', () => {
  const d = tempRepo();
  try {
    git(d, 'config', 'core.hooksPath', join(repo, 'tools/hooks'));
    const commit = () => spawnSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'x'], { cwd: d, env: gitEnv, encoding: 'utf8' });
    writeFileSync(join(d, '.gitattributes'), '*.cfg binary\n*.lock -diff\n*.json diff=json\n');
    git(d, 'config', 'diff.json.binary', 'true');   // a diff driver that calls its files binary
    git(d, 'add', '.gitattributes');
    assert.equal(commit().status, 0);
    const sk = `sk_live_${'B'.repeat(24)}`, wh = `whsec_${'d'.repeat(32)}`, rk = `rk_test_${'J'.repeat(24)}`;
    writeFileSync(join(d, 'app.cfg'), `name=x\nkey=${sk}\n`);
    writeFileSync(join(d, 'deps.lock'), `${wh}\n`);
    writeFileSync(join(d, 'data.json'), `{"k":"${rk}"}\n`);
    git(d, 'add', '-A');
    const r = commit();
    assert.notEqual(r.status, 0, 'refused');
    assert.deepEqual(r.stderr.split('\n').filter((l) => l.startsWith('  ')).map((l) => l.trim()), [
      'app.cfg:2: a Stripe secret or restricted key (sk_live_…)',
      'data.json:1: a Stripe secret or restricted key (rk_test_…)',
      'deps.lock:1: a Stripe webhook signing secret (whsec_…)',
    ]);
    assert.equal(git(d, 'rev-list', '--count', 'HEAD').trim(), '1', 'nothing was committed');
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('addedLines: only added lines, numbered from each hunk, whatever they start with', () => {
  const diff = [
    'diff --git a/x.js b/x.js', 'index 1..2 100644', '--- a/x.js', '+++ b/x.js',
    '@@ -2 +2 @@', '-old', '+++ looks like a header', '@@ -9,2 +9,0 @@', '-gone', '-gone too', '@@ -20,0 +19,2 @@', '+-- looks removed', '+\\ looks like a note',
    '\\ No newline at end of file',
    'diff --git a/"t\\303\\251st\\tb.md" b/"t\\303\\251st\\tb.md"', 'new file mode 100644', '--- /dev/null', '+++ "b/t\\303\\251st\\tb.md"', '@@ -0,0 +1 @@', '+@@ -1 +1 @@',
    'diff --git a/a b.md b/a b.md', '--- a/a b.md\t', '+++ b/a b.md\t', '@@ -3,0 +4 @@', '+spaced',
    'diff --git a/gone.js b/gone.js', 'deleted file mode 100644', '--- a/gone.js', '+++ /dev/null', '@@ -1 +0,0 @@', '-x',
  ].join('\n');
  assert.deepEqual(addedLines(diff), [
    { file: 'x.js', line: 2, text: '++ looks like a header' },
    { file: 'x.js', line: 19, text: '-- looks removed' },
    { file: 'x.js', line: 20, text: '\\ looks like a note' },
    { file: 't\u00e9st\tb.md', line: 1, text: '@@ -1 +1 @@' },
    { file: 'a b.md', line: 4, text: 'spaced' },
  ]);
});

test('.env and .env.* are gitignored like .dev.vars, at the repository root too (an .example file stays committable), and none is tracked', () => {
  const ignored = (p) => spawnSync('git', ['-C', repo, 'check-ignore', '--no-index', '-q', p], { env: gitEnv }).status === 0;
  for (const p of ['hushmallow/.env', 'hushmallow/.env.local', 'hushmallow/.env.production', 'hushmallow/server/another-angle/.env', 'hushmallow/server/another-angle/.env.staging', 'hushmallow/tools/.env.development.local',
    'hushmallow/.dev.vars', 'hushmallow/server/another-angle/.dev.vars', 'hushmallow/server/another-angle/.dev.vars.staging']) assert.ok(ignored(p), `${p} is ignored`);
  // at the repository root too, where the README has you run the tests and the git config
  for (const p of ['.env', '.env.local', '.dev.vars', '.dev.vars.staging', 'tools/.env', 'tools/hooks/.env.local', '.github/.env', 'framer/.dev.vars']) assert.ok(ignored(p), `${p} is ignored`);
  for (const p of ['hushmallow/.env.example', 'hushmallow/server/another-angle/.dev.vars.example', 'hushmallow/src/app/config.js', 'hushmallow/src/app/env.js',
    '.env.example', '.dev.vars.example', 'tools/.env.example', 'tools/hooks/pre-commit', 'README.md']) assert.ok(!ignored(p), `${p} is not ignored`);
  assert.deepEqual(trackedFiles(repo).filter((f) => /(^|\/)\.(?:env|dev\.vars)(?:\.|$)/.test(f) && !f.endsWith('.example')), []);
});
