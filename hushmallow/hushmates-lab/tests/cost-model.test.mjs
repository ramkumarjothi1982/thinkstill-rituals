// The cost model behind docs/COSTS.md (tools/cost-model.mjs): the arithmetic the tables rest on.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { monthly, overFree, aud, ALL_IN, table } from '../tools/cost-model.mjs';

const item = (bill, start) => bill.items.find(([k]) => k.startsWith(start))?.[1];

test('the beta: 100 people fit the Free plan at A$0; on Pro it is the plan fee alone', () => {
  assert.deepEqual(overFree(100), []);
  assert.equal(monthly(100, { plan: 'free' }).usd, 0);
  assert.equal(monthly(100, { plan: 'pro' }).usd, 25);
  assert.equal(Math.round(aud(25) * 100) / 100, 35.70);
  assert.equal(Math.round(aud(25) * ALL_IN * 100) / 100, 40.45);
});

test('1,000 people pass the Free plan as built (polling), so the model never puts them on it', () => {
  assert.deepEqual(overFree(1000), ['calls', 'egressGb']);
  assert.throws(() => monthly(1000, { plan: 'free' }), /pass the Free plan/);
  assert.deepEqual(overFree(1000, { realtime: true }), []);
  assert.equal(monthly(1000).usd, 30);   // Pro + Small compute beyond the credit
});

test('Edge Function calls are billed per started million beyond the 2 million included', () => {
  const b = monthly(10000);            // 13 million calls → 11 million over → US$22
  assert.equal(item(b, 'Edge Function calls'), 22);
  assert.equal(item(monthly(100000), 'Edge Function calls'), 256);   // 130 M → 128 over
  assert.equal(item(monthly(100000, { realtime: true }), 'Edge Function calls'), 36);   // 19.5 M → 17.5 → 18 started millions
});

test('Realtime adds messages and peak connections beyond what Pro includes', () => {
  const b = monthly(100000, { realtime: true });
  assert.equal(item(b, 'Realtime messages'), 62.5);    // 30 M messages → 25 M over at US$2.50
  assert.equal(item(b, 'Realtime peak connections'), 50);   // 5,000 peak → 4,500 over → 5 started thousands
  assert.equal(item(monthly(1000, { realtime: true }), 'Realtime messages'), 0);
});

test('the tables in docs/COSTS.md are the ones the model prints', () => {
  const doc = readFileSync(new URL('../docs/COSTS.md', import.meta.url), 'utf8');
  for (const realtime of [false, true]) for (const row of table({ realtime }).rows) assert.ok(doc.includes(row), `COSTS.md is missing or has an old row: ${row}`);
});
