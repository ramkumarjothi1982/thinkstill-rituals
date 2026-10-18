// The CI reporter that turns a failing test into a GitHub annotation (tests/helpers/gh-annotations.mjs), and
// the Pages workflow running it beside TAP, so a first-run CI failure names its test where the log can't be read.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { annotation } from './helpers/gh-annotations.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));

test('annotation: one ::error line, escaped, naming the file, line and test; parents of a failed subtest are left out', () => {
  const err = Object.assign(new Error('wrapped'), { failureType: 'testCodeFailure', cause: new Error('p95 11.5 ms\nover 10') });
  const line = annotation({ name: 'cheap: p95, under 10 ms', file: '/w/repo/hushmallow/tests/x.test.mjs', line: 217, details: { error: err } }, '/w/repo');
  assert.equal(line, '::error file=hushmallow/tests/x.test.mjs,line=217,title=cheap%3A p95%2C under 10 ms::cheap: p95, under 10 ms: p95 11.5 ms%0Aover 10');
  assert.equal(annotation({ name: 'parent', details: { error: Object.assign(new Error('1 subtest failed'), { failureType: 'subtestsFailed' }) } }), null);
  assert.match(annotation({ name: 'n', details: { error: { cause: 'plain string' } } }), /::n: plain string$/);
  assert.equal(annotation({ name: 'long', details: { error: new Error('x'.repeat(5000)) } }).split('::')[2].length, 1500);
});

test('the reporter, run by node --test beside TAP: a failing test gives its annotation, a passing run gives none', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hm-gh-annotations-'));
  try {
    writeFileSync(join(dir, 'a.test.mjs'), "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('ok', () => {});\ntest('fails', () => { assert.equal(1, 2); });\n");
    writeFileSync(join(dir, 'b.test.mjs'), "import test from 'node:test';\ntest('ok', () => {});\n");
    const reporter = join(repo, 'hushmallow/tests/helpers/gh-annotations.mjs');
    // a node --test started inside a test inherits NODE_TEST_CONTEXT and would report to this run instead
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const run = (file) => {
      try {
        return { out: execFileSync(process.execPath, ['--test', '--test-reporter=tap', '--test-reporter-destination=stdout', `--test-reporter=${reporter}`, '--test-reporter-destination=stdout', file], { cwd: dir, encoding: 'utf8', env }), code: 0 };
      } catch (e) { return { out: String(e.stdout), code: e.status }; }
    };
    const bad = run('a.test.mjs');
    assert.equal(bad.code, 1, 'still fails');
    const lines = bad.out.split('\n').filter((l) => l.startsWith('::error'));
    assert.equal(lines.length, 1, bad.out);
    assert.match(lines[0], /^::error file=a\.test\.mjs,line=4,title=fails::fails: /);
    assert.match(bad.out, /^not ok \d+ - fails$/m, 'TAP still printed');
    const good = run('b.test.mjs');
    assert.equal(good.code, 0);
    assert.ok(!good.out.includes('::error'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the Pages workflow runs the client suite with TAP and the annotations reporter, on every test file', () => {
  const wf = readFileSync(join(repo, '.github/workflows/hushmallow-pages.yml'), 'utf8');
  assert.match(wf, /- run: node --test --test-reporter=tap --test-reporter-destination=stdout --test-reporter=\.\/hushmallow\/tests\/helpers\/gh-annotations\.mjs --test-reporter-destination=stdout hushmallow\/tests\/\*\.test\.mjs\n/);
});
