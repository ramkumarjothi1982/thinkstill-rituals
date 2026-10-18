// tests/helpers/cost.mjs: the speed budgets are judged at budget × this machine's factor, which only a machine slower
// at every kind of reference work raises, never a slower rule, and never a costlier GC alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PerformanceObserver } from 'node:perf_hooks';
import { machine, machineFactor, measure, nodeFlags, within, REFERENCE_MS, REFERENCE_NOISE, MAX_FACTOR } from './helpers/cost.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const KINDS = Object.keys(REFERENCE_MS);
const times = (k) => Object.fromEntries(KINDS.map((kind) => [kind, REFERENCE_MS[kind] * (typeof k === 'number' ? k : k[kind])]));
const BUDGET_FILES = ['r4', 'r5', 'r6', 'risk-concepts', 'risk-screen', 'raindrop-lagoon', 'hushfold'];
const m = (factor) => ({ factor, ratios: Object.fromEntries(KINDS.map((k) => [k, factor])) });

test('cost: the machine factor is the slowdown every kind of reference work shows, never below 1', () => {
  assert.deepEqual(KINDS, ['regex', 'strings', 'loops', 'scan']);
  // as fast as the reference machine, or faster: the written budget, exactly
  assert.equal(machineFactor(times(1)).factor, 1);
  assert.equal(machineFactor(times(0.4)).factor, 1);
  // within the reference machine's own spread: still the written budget (it is never loosened there)
  assert.ok(machineFactor(times(1 + REFERENCE_NOISE)).factor - 1 < 1e-9);
  // a machine twice as slow at everything: twice the budget (less the reference machine's spread)
  assert.ok(Math.abs(machineFactor(times(2)).factor - 2 / (1 + REFERENCE_NOISE)) < 1e-9);
  // slower at only some kinds (as under V8's --jitless): only what every kind shows is credited
  const some = machineFactor(times({ regex: 3.7, strings: 1.02, loops: 6.1, scan: 4.4 }));
  assert.equal(some.factor, 1);
  const most = machineFactor(times({ regex: 3, strings: 2.2, loops: 2.6, scan: 2.9 }));
  assert.ok(Math.abs(most.factor - 2.2 / (1 + REFERENCE_NOISE)) < 1e-9);
  assert.ok(Math.abs(most.ratios.regex - 3) < 1e-9);
  // a costlier GC alone (as under node --stress-compaction: the allocating kinds 1.5-4.5x, SCAN 1.04x): nothing credited,
  // and on a machine slower and GC-bound, only what the work that allocates nothing shows
  assert.equal(machineFactor(times({ regex: 1.49, strings: 4.5, loops: 3.9, scan: 1.04 })).factor, 1);
  assert.ok(Math.abs(machineFactor(times({ regex: 2.9, strings: 6, loops: 5, scan: 1.6 })).factor - 1.6 / (1 + REFERENCE_NOISE)) < 1e-9);
});

test('cost: a budget is judged at budget × factor, the message says how, and past MAX_FACTOR a reading that needs the factor is not judged', () => {
  const still = (factor) => () => m(factor); // the second timing: the machine as slow as that, right then
  const never = () => { throw new Error('timed again'); };
  // on the reference machine, the written budget: 39.9 passes, 40.1 fails all three readings (and nothing is timed again)
  assert.equal(within(40, () => 39.9, 3, m(1), never).ok, true);
  const miss = within(40, () => 40.1, 3, m(1), never);
  assert.equal(miss.ok, false);
  assert.deepEqual(miss.seen, [40.1, 40.1, 40.1]);
  assert.match(miss.note, /^budget 40 ms × machine factor 1\.00 = 40\.0 ms \(the reference work read regex 1\.00, strings 1\.00, loops 1\.00, scan 1\.00 × the reference machine's as the file began\)$/);
  // twice as slow a machine, still twice as slow when timed again: twice the budget, no more
  const pass = within(40, () => 79.9, 3, m(2), still(2));
  assert.equal(pass.ok, true);
  assert.match(pass.note, /^budget 40 ms × machine factor 2\.00 = 80\.0 ms \(.* as the file began, read regex 2\.00, strings 2\.00, loops 2\.00, scan 2\.00 × the reference machine's just now\)$/);
  const r = within(40, () => 80.1, 3, m(2), never); // (over even the stretched budget: nothing to time again for)
  assert.equal(r.ok, false);
  assert.equal(r.limit, 80);
  // slow as the file began but not now (or less): the smaller factor; a reading under the written budget needs neither
  let timings = 0;
  const once = (factor) => () => { timings++; return m(factor); };
  const back = within(40, () => 60, 3, m(2), once(1));
  assert.deepEqual([back.ok, back.factor, back.limit, back.seen.length, timings], [false, 1, 40, 3, 1]);
  assert.equal(within(40, () => 70, 3, m(2), once(1.6)).factor, 1.6);
  assert.equal(within(40, () => 70, 3, m(2), once(2.5)).factor, 2, 'never more than as the file began');
  assert.equal(within(40, () => 30, 3, m(2), never).ok, true);
  // a bounded re-measure: stops at the first reading under the budget, at most `tries` readings
  const vals = [90, 70, 10];
  let n = 0;
  const b = within(40, () => vals[n++], 3, m(2), still(2));
  assert.deepEqual([b.ok, b.seen, n], [true, [90, 70], 2]);
  // past MAX_FACTOR: a reading under the written budget passes on any machine (nothing timed again for it)
  const fast = within(40, () => 1, 3, m(MAX_FACTOR + 1.6), never);
  assert.deepEqual([fast.ok, fast.factor], [true, MAX_FACTOR + 1.6]);
  // one over it: timed again first, and still past MAX_FACTOR, not judged: the test fails saying why, with the reading
  let reads = 0;
  assert.throws(() => within(40, () => { reads++; return 61; }, 3, m(5.6), still(5.5)),
    /^Error: this machine is too slow to judge this budget: 61\.0 ms for a budget of 40 ms, at a factor of 5\.50 \(.* as the file began, read .* just now; a budget stretches at most 4x: 40 ms would be 220\.0 ms\)$/);
  assert.equal(reads, 1);
  // past it only as the file began (a slow start): judged at the second timing's factor
  timings = 0;
  const start = within(40, () => 61, 3, m(4.2), once(2.8));
  assert.deepEqual([start.ok, start.factor, start.seen, timings], [true, 2.8, [61], 1]);
  assert.equal(within(40, () => 150, 3, m(MAX_FACTOR), still(MAX_FACTOR)).ok, true);
  // a factor that is no number: the written budget still passes, a reading over it is not judged
  assert.equal(within(40, () => 1, 3, m(NaN), never).ok, true);
  assert.throws(() => within(40, () => 41, 3, m(NaN), never), /too slow to judge this budget/);
});

test('cost: the reference work runs in a Node process of its own, with this one\'s flags; if it cannot, the written budgets', () => {
  const failed = measure(() => { throw new Error('spawnSync /usr/bin/node EAGAIN\n(more)'); });
  assert.deepEqual([failed.factor, failed.error], [1, 'spawnSync /usr/bin/node EAGAIN']);
  const r = within(40, () => 41, 3, failed, () => { throw new Error('timed again'); });
  assert.equal(r.ok, false);
  assert.equal(r.note, 'budget 40 ms × machine factor 1.00 = 40.0 ms (the reference work could not be timed (spawnSync /usr/bin/node EAGAIN) as the file began)');
  // a slow machine whose second timing fails: the written budget, saying so
  const again = within(40, () => 50, 3, m(2), () => failed);
  assert.deepEqual([again.ok, again.factor], [false, 1]);
  assert.match(again.note, /, could not be timed \(spawnSync \/usr\/bin\/node EAGAIN\) just now\)$/);
  // V8's flags and --import reach it; a script, a test run, a debugger or a watch never do
  assert.deepEqual(nodeFlags(['--stress-compaction', '-e', 'x()', '--import', './slow.mjs', '--test-reporter', 'tap', '--test-only', '--inspect-brk=0',
    '--input-type=module', '-p', 'y', '--jitless', '--watch']), ['--stress-compaction', '--import', './slow.mjs', '--jitless']);
});

test('cost: the reference work is its own (no imports) and never runs in a test file\'s process; every budget file loads cost.mjs first', () => {
  const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // (its code, not its comments)
  const work = code('tests/helpers/cost-work.mjs');
  assert.doesNotMatch(work, /^\s*import\b|\bimport\s*\(|\brequire\s*\(/m, 'cost-work.mjs imports nothing: a rule can never run inside the calibration');
  const cost = code('tests/helpers/cost.mjs');
  assert.deepEqual([...cost.matchAll(/^\s*import\b[^;]*?from\s+'([^']+)'/gm)].map((x) => x[1]), ['node:child_process']);
  assert.deepEqual(cost.match(/cost-work\.mjs/g), ['cost-work.mjs'], 'cost-work.mjs is only named for the timing process to load');
  assert.match(cost, /const WORK_URL = new URL\('\.\/cost-work\.mjs', import\.meta\.url\)\.href;/);
  for (const f of BUDGET_FILES) {
    const t = read(`tests/${f}.test.mjs`);
    const imports = [...t.matchAll(/^import\b[^;]*?from\s+'([^']+)'/gms)].map((x) => x[1]);
    const own = imports.filter((p) => !p.startsWith('node:'));
    assert.equal(own[0], './helpers/cost.mjs', `${f}: cost.mjs is its first import after node's (${own.slice(0, 2).join(', ')})`);
    // every CPU reading is judged through within(): no bare comparison of a reading with a number
    assert.match(t, /\bwithin\(/, f);
    assert.doesNotMatch(t, /\bms\s*<\s*\d/, `${f}: a reading compared without the machine factor`);
  }
});

test('cost: SCAN allocates nothing (no GC in 300 runs, where each other kind sets off several in 100)', async () => {
  const { WORK } = await import('./helpers/cost-work.mjs'); // (this file times no budget)
  assert.deepEqual(Object.keys(WORK), KINDS);
  let gcs = 0;
  const obs = new PerformanceObserver((list) => { gcs += list.getEntries().length; });
  obs.observe({ entryTypes: ['gc'] });
  const settle = () => new Promise((r) => setTimeout(r, 20));
  const gcsIn = async (f, n) => { await settle(); const g0 = gcs; for (let i = 0; i < n; i++) f(); await settle(); return gcs - g0; };
  try {
    await gcsIn(WORK.scan[0], 100); // (its one-time set-up: compiled, tiered up)
    assert.equal(await gcsIn(WORK.scan[0], 300), 0, 'a GC while SCAN ran');
    for (const k of ['regex', 'strings', 'loops']) assert.ok(await gcsIn(WORK[k][0], 100) >= 3, `${k} allocates`);
  } finally {
    obs.disconnect();
  }
});

test('cost: this machine was measured', () => {
  assert.equal(machine.error, undefined, machine.error);
  for (const k of KINDS) assert.ok(machine.ms[k] > 0 && Number.isFinite(machine.ms[k]), k);
  assert.ok(machine.factor >= 1 && Number.isFinite(machine.factor));
  console.log(`  machine factor ${machine.factor.toFixed(2)} (min ratio ${machine.ratio.toFixed(3)}: ${Object.entries(machine.ratios).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(', ')})`);
});
