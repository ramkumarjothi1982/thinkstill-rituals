import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REFERENCE, policy } from '../property/support.mjs';
import { hookTokens, jaccard, sameHook, slotDiff, distanceOk } from '../../planner/distance.mjs';

const base = () => JSON.parse(JSON.stringify(REFERENCE));

test('hook tokens and Jaccard: a reworded hook is the same hook', () => {
  assert.deepEqual([...hookTokens(['ME TRYING TO SLEEP', 'AT 2 AM...'])], ['me', 'trying', 'to', 'sleep', 'at', '2', 'am']);
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['a', 'b'])), 1);
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['c'])), 0);
  assert.ok(sameHook(['ME TRYING TO SLEEP', 'AT 2 AM...'], ['ME TRYING TO SLEEP AT 3 AM'], policy), 'token Jaccard 6/8 >= 0.5');
  assert.ok(!sameHook(['ME TRYING TO SLEEP', 'AT 2 AM...'], ['LIGHTS OFF. BRAIN ON.'], policy));
  assert.ok(sameHook('ME TRYING TO SLEEP / AT 2 AM...', ['ME TRYING TO SLEEP', 'AT 2 AM...'], policy), 'ledger strings and line arrays compare alike');
});

test('slot differences: counts the library rule slots, weights the rest', () => {
  const a = base();
  const b = base();
  assert.deepEqual(slotDiff(a, b, policy).differ, []);
  b.copy.lines = ['That email I sent.', 'Was that rude?', 'Why am I like this?'];
  const d = slotDiff(a, b, policy);
  assert.deepEqual(d.differ, ['lines']);
  assert.equal(d.parts.lines, 2, 'three changed lines weigh the full 2');
  b.copy.lines = [a.copy.lines[0], a.copy.lines[1], 'Why am I like this?'];
  assert.ok(Math.abs(slotDiff(a, b, policy).parts.lines - 2 / 3) < 1e-9, 'one changed line weighs 2/3');
});

test('distance rule: >= 3 slots, one of them Mallow or hook, and weighted >= 6', () => {
  const a = base();
  // only copy-free slots that are not Mallow or hook: 3 slots differ but neither Mallow nor hook
  const b = { ...base(), ritual: 'R-CLOUDWRAP', gag: { id: 'G-SINK', intensity: 1 }, metaphor: 'M-ECHO' };
  let r = distanceOk(a, b, policy);
  assert.equal(r.ok, false);
  assert.match(r.reason, /neither mallow nor hook/);
  // hook + lines only: 2 slots
  const c = base();
  c.copy.hook = ['LIGHTS OFF. BRAIN ON.'];
  c.copy.lines = ['That email I sent.', 'Was that rude?', 'Why am I like this?'];
  r = distanceOk(a, c, policy);
  assert.equal(r.ok, false);
  assert.match(r.reason, /only 2 rule slots/);
  // hook + lines + ritual: 3 slots, weighted 3 + 2 + 2 = 7
  c.ritual = 'R-CLOUDWRAP';
  r = distanceOk(a, c, policy);
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.diff.weighted, 7);
  // seed-only and overlay-only differences are the same video
  const d = { ...base(), seed: 1, worldJitter: { hue: 5, warmth: 0, exposure: 0 } };
  assert.equal(distanceOk(a, d, policy).ok, false);
});

test('works on ledger "visible" objects (gag as an id, dressing as strings)', () => {
  const a = base();
  const v = { ...base(), gag: 'G-JOLT', dressing: [], hook: a.copy.hook, lines: a.copy.lines, end: a.copy.end };
  delete v.copy;
  assert.deepEqual(slotDiff(a, v, policy).differ, []);
});
