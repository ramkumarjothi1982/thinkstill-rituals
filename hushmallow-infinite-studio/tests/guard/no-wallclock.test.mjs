// Guard: no wall-clock time or unseeded randomness in engine/ or composer/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDIO } from '../../render/lib/paths.mjs';
import { scanSource, scanDirs, stripComments, DETERMINISTIC_DIRS } from '../../render/lib/determinism-scan.mjs';

test('engine/ and composer/ contain no Math.random, Date.now or performance.now', (t) => {
  const r = scanDirs(STUDIO);
  t.diagnostic(`scanned ${r.scanned.length} files in ${DETERMINISTIC_DIRS.join(', ')}${r.missing.length ? ` (not created yet: ${r.missing.join(', ')})` : ''}`);
  for (const a of r.allowed) t.diagnostic(`opt-out ${a.file}:${a.line} ${a.api} — ${a.reason}`);
  assert.deepEqual(r.findings.map((f) => `${f.file}:${f.line} ${f.api}: ${f.text}`), []);
});

// The scanner itself must catch what it claims to catch, or the guard above is vacuous.
const cases = [
  ['const x = Math.random();', ['Math.random']],
  ['const t0 = Date.now(), t1 = performance.now();', ['Date.now', 'performance.now']],
  ['const f = Math . random;', ['Math.random']],
  ['if (Math.random == null) {}', ['Math.random']],
  ['const s = `${Date.now()}`;', ['Date.now']],
  ['const s = "// not a comment"; Date.now();', ['Date.now']],
  ["log('uses Math.random');", ['Math.random']],
  ['// Math.random and Date.now are banned here', []],
  ['/* performance.now()\n   Date.now() */ const a = 1;', []],
  ['Math.random = mulberry32(seed);', []],
  ['performance.now = () => state.nowMs;', []],
  ['Date.now = () => epoch + nowMs;', []],
  ['const real = performance.now.bind(performance); // hm-allow-wallclock: real timer kept for profiling only', []],
];

for (const [src, want] of cases) {
  test(`scanner: ${JSON.stringify(src).slice(0, 70)}`, () => {
    assert.deepEqual(scanSource(src).findings.map((f) => f.api).sort(), [...want].sort());
  });
}

test('scanner: an opt-out needs a reason, and is reported', () => {
  assert.equal(scanSource('Date.now(); // hm-allow-wallclock:').findings.length, 1);
  const r = scanSource('x = Date.now(); // hm-allow-wallclock: progress log only');
  assert.equal(r.findings.length, 0);
  assert.deepEqual(r.allowed.map((a) => [a.api, a.line, a.reason]), [['Date.now', 1, 'progress log only']]);
});

test('scanner: comment stripping keeps line numbers', () => {
  const src = '/* a\n b */\nconst x = Math.random();';
  assert.equal(stripComments(src).split('\n').length, 3);
  assert.equal(scanSource(src).findings[0].line, 3);
});
