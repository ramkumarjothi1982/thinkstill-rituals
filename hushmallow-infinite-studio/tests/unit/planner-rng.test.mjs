import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stream, seedOf, fnv1a } from '../../planner/rng.mjs';

test('a stream is a pure function of (seed, name)', () => {
  const a = stream(4991633, 'gag'), b = stream(4991633, 'gag');
  const xs = Array.from({ length: 100 }, () => a.next()), ys = Array.from({ length: 100 }, () => b.next());
  assert.deepEqual(xs, ys);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
});

test('named streams are independent: drawing from one never shifts another', () => {
  const plain = stream(7, 'hook');
  const ref = Array.from({ length: 20 }, () => plain.next());
  const busy = stream(7, 'gag');
  for (let i = 0; i < 1000; i++) busy.next();
  const again = stream(7, 'hook');
  assert.deepEqual(Array.from({ length: 20 }, () => again.next()), ref);
  const lines = stream(7, 'lines');
  assert.notDeepEqual(Array.from({ length: 20 }, () => lines.next()), ref);
  assert.notEqual(stream(7, 'hook').next(), stream(8, 'hook').next());
  assert.notEqual(stream(7, 'hook').next(), stream(7, 'hooks').next());
});

test('seedOf and fnv1a are stable known values (a change would re-seed every plan)', () => {
  assert.equal(fnv1a(''), 0x811c9dc5);
  assert.equal(fnv1a('a'), 0xe40c292c);
  assert.equal(seedOf(42, 0, 0), seedOf('42', '0', '0'));
  assert.notEqual(seedOf(42, 0, 0), seedOf(42, 0, 1));
  assert.equal(stream(1, 'x').u32(), stream(1, 'x').u32());
});

test('distribution: uniform mean, int range, weighted picks in proportion', () => {
  const r = stream(123, 'dist');
  let sum = 0;
  const buckets = new Array(10).fill(0);
  const N = 100000;
  for (let i = 0; i < N; i++) { const x = r.next(); sum += x; buckets[Math.floor(x * 10)]++; }
  assert.ok(Math.abs(sum / N - 0.5) < 0.005, `mean ${sum / N}`);
  for (const b of buckets) assert.ok(Math.abs(b / N - 0.1) < 0.006, `bucket ${b / N}`);
  const ints = new Set(Array.from({ length: 2000 }, () => r.int(7)));
  assert.deepEqual([...ints].sort(), [0, 1, 2, 3, 4, 5, 6]);
  const counts = { a: 0, b: 0 };
  for (let i = 0; i < 40000; i++) counts[r.pick(['a', 'b'], [3, 1])]++;
  assert.ok(Math.abs(counts.a / 40000 - 0.75) < 0.01, `weighted ${counts.a / 40000}`);
  assert.equal(r.pick([]), undefined);
  assert.throws(() => r.pick(['a'], [0]), /sum to > 0/);
});

test('seeds must be uint32', () => {
  for (const bad of [-1, 1.5, 2 ** 32, '3', NaN]) assert.throws(() => stream(bad, 'x'), /uint32/);
});
