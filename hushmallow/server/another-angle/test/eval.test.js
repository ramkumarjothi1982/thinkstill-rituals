import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from '../eval/cases.js';
import { validateAngleRequest } from '../src/validate.js';
import { checkSafety } from '../src/safety/index.js';

const run = promisify(execFile);
const TOOL = fileURLToPath(new URL('../../../tools/angle-eval.mjs', import.meta.url));

test('eval inputs: 30+ realistic cases across the brief\'s categories, plus safety and injection probes', () => {
  const realistic = CASES.filter((c) => !['safety', 'injection', 'unclear'].includes(c.category));
  assert.ok(realistic.length >= 30, `${realistic.length} realistic cases`);
  for (const cat of ['relationships', 'work', 'anxiety', 'jealousy', 'shame', 'self-criticism', 'disappointment', 'rumination', 'uncertainty']) {
    assert.ok(CASES.some((c) => c.category === cat), cat);
  }
  assert.equal(CASES.filter((c) => c.category === 'safety').length, 3);
  assert.equal(CASES.filter((c) => c.category === 'injection').length, 2);
  assert.ok(CASES.filter((c) => c.followUp).length >= 5, 'several "another angle" follow-ups');
  assert.equal(new Set(CASES.map((c) => c.id)).size, CASES.length, 'unique ids');
  for (const c of CASES) assert.ok(validateAngleRequest({ consent: true, text: c.text, emotion: c.emotion, intention: c.intention }).ok, c.id);
});

test('eval cases: no ordinary case trips the word list (the safety probes skip it in the eval)', () => {
  // The probes are measured against the model with the word list skipped, so
  // improving the shared lexicon never turns this test red.
  for (const c of CASES.filter((x) => x.category !== 'safety')) assert.ok(!['crisis', 'care'].includes(checkSafety(c.text).level), c.id);
});

test('the eval prints a cost estimate and sends nothing without --yes', async () => {
  const { stdout } = await run(process.execPath, [TOOL], { env: { ...process.env, ANTHROPIC_API_KEY: 'sk-test-not-real' }, timeout: 60000 });
  assert.match(stdout, /Estimated cost: about \$\d+\.\d\d \(worst case \$\d+\.\d\d\)/);
  assert.match(stdout, /Nothing was sent\. Re-run with --yes/);
  const noKey = await run(process.execPath, [TOOL], { env: { ...process.env, ANTHROPIC_API_KEY: '' }, timeout: 60000 });
  assert.match(noKey.stdout, /Set ANTHROPIC_API_KEY/);
});

test('the eval dry run (--mock) runs every case through the pipeline and writes a report', async () => {
  const out = mkdtempSync(join(tmpdir(), 'angle-eval-'));
  const { stdout } = await run(process.execPath, [TOOL, '--mock', '--out', out], { timeout: 120000 });
  assert.match(stdout, /Report: /);
  const md = readdirSync(out).find((f) => f.endsWith('-mock.md'));
  assert.ok(md);
  const text = readFileSync(join(out, md), 'utf8');
  assert.match(text, /MOCK PROVIDER/);
  assert.match(text, /\| Injection leaks \| 0 \|/);
  assert.match(text, /\| Cost \| \$0\.000 \|/);
  assert.match(text, /\| Answers over 15 s \/ over 28 s \/ timed out \| \d+ \/ \d+ \/ \d+ \|/, 'production timeouts');
  assert.match(text, /\| Safety probes flagged by the model alone \(word list skipped\) \| 3\/3 \|/);
  assert.match(text, /## Gate rejections/);
  assert.match(text, /Word list: \*\*(?:crisis|care|none|concern)\*\* \(skipped for this probe/);
  for (const c of CASES) assert.ok(text.includes(`### ${c.id} `), c.id);
});
