// tests/helpers/cost.mjs: the speed budgets are judged at budget × this machine's factor, which only a machine slower
// at every kind of reference work raises, never a slower rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { machine, machineFactor, within, REFERENCE_MS, REFERENCE_NOISE, MAX_FACTOR } from './helpers/cost.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const times = (k) => Object.fromEntries(Object.entries(REFERENCE_MS).map(([kind, ms]) => [kind, ms * (typeof k === 'number' ? k : k[kind])]));
const BUDGET_FILES = ['r4', 'r5', 'r6', 'risk-concepts', 'risk-screen', 'raindrop-lagoon', 'hushfold'];

test('cost: the machine factor is the slowdown every kind of reference work shows, never below 1', () => {
  // as fast as the reference machine, or faster: the written budget, exactly
  assert.equal(machineFactor(times(1)).factor, 1);
  assert.equal(machineFactor(times(0.4)).factor, 1);
  // within the reference machine's own spread: still the written budget (it is never loosened there)
  assert.ok(machineFactor(times(1 + REFERENCE_NOISE)).factor - 1 < 1e-9);
  // a machine twice as slow at everything: twice the budget (less the reference machine's spread)
  assert.ok(Math.abs(machineFactor(times(2)).factor - 2 / (1 + REFERENCE_NOISE)) < 1e-9);
  // slower at only some kinds (as under V8's --jitless): only what every kind shows is credited
  const some = machineFactor(times({ regex: 3.7, strings: 1.02, loops: 6.1 }));
  assert.equal(some.factor, 1);
  const most = machineFactor(times({ regex: 3, strings: 2.2, loops: 2.6 }));
  assert.ok(Math.abs(most.factor - 2.2 / (1 + REFERENCE_NOISE)) < 1e-9);
  assert.ok(Math.abs(most.ratios.regex - 3) < 1e-9);
});

test('cost: a budget is judged at budget × factor, the message says how, and a machine past MAX_FACTOR is not judged', () => {
  const m = (factor) => ({ factor, ratios: { regex: factor, strings: factor, loops: factor } });
  const still = (factor) => () => m(factor); // the second timing: the machine as slow as that, right then
  const never = () => { throw new Error('timed again'); };
  // on the reference machine, the written budget: 39.9 passes, 40.1 fails all three readings (and nothing is timed again)
  assert.equal(within(40, () => 39.9, 3, m(1), never).ok, true);
  const miss = within(40, () => 40.1, 3, m(1), never);
  assert.equal(miss.ok, false);
  assert.deepEqual(miss.seen, [40.1, 40.1, 40.1]);
  assert.match(miss.note, /^budget 40 ms × machine factor 1\.00 = 40\.0 ms \(the reference work read regex 1\.00, strings 1\.00, loops 1\.00 × the reference machine's as the file began\)$/);
  // twice as slow a machine, still twice as slow when timed again: twice the budget, no more
  const pass = within(40, () => 79.9, 3, m(2), still(2));
  assert.equal(pass.ok, true);
  assert.match(pass.note, /^budget 40 ms × machine factor 2\.00 = 80\.0 ms \(.* as the file began, regex 2\.00, strings 2\.00, loops 2\.00 just now\)$/);
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
  // past MAX_FACTOR: nothing read, the test fails saying why
  let reads = 0;
  assert.throws(() => within(40, () => { reads++; return 1; }, 3, m(MAX_FACTOR + 0.5)), /^Error: this machine is too slow to judge this budget: factor 4\.50 /);
  assert.equal(reads, 0);
  assert.equal(within(40, () => 150, 3, m(MAX_FACTOR), still(MAX_FACTOR)).ok, true);
  assert.throws(() => within(40, () => 1, 3, m(NaN)), /too slow to judge this budget/);
});

test('cost: the reference work is its own (no imports), and every budget file loads it before any hushmallow module', () => {
  const src = read('tests/helpers/cost.mjs').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // (its code, not its comments)
  assert.doesNotMatch(src, /^\s*import\b|\bimport\s*\(|\brequire\s*\(/m, 'cost.mjs imports nothing: a rule can never run inside the calibration');
  for (const f of BUDGET_FILES) {
    const t = read(`tests/${f}.test.mjs`);
    const imports = [...t.matchAll(/^import\b[^;]*?from\s+'([^']+)'/gms)].map((m) => m[1]);
    const own = imports.filter((p) => !p.startsWith('node:'));
    assert.equal(own[0], './helpers/cost.mjs', `${f}: cost.mjs is its first import after node's (${own.slice(0, 2).join(', ')})`);
    // every CPU reading is judged through within(): no bare comparison of a reading with a number
    assert.match(t, /\bwithin\(/, f);
    assert.doesNotMatch(t, /\bms\s*<\s*\d/, `${f}: a reading compared without the machine factor`);
  }
});

test('cost: this machine was measured', () => {
  for (const k of Object.keys(REFERENCE_MS)) assert.ok(machine.ms[k] > 0 && Number.isFinite(machine.ms[k]), k);
  assert.ok(machine.factor >= 1 && Number.isFinite(machine.factor));
  console.log(`  machine factor ${machine.factor.toFixed(2)} (min ratio ${machine.ratio.toFixed(3)}: ${Object.entries(machine.ratios).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(', ')})`);
});
