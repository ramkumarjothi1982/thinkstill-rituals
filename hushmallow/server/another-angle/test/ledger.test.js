import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ledger, ledgerClient, memoryLedgerNamespace, memoryStorage } from '../src/limits/ledger.js';
import { memoryRateLimiter, allow } from '../src/limits/ratelimit.js';
import { costMicros, worstCaseMicros, rateFor } from '../src/cost.js';

test('take enforces a daily limit; give refunds; days are separate', async () => {
  const l = ledgerClient(memoryLedgerNamespace());
  for (let i = 0; i < 3; i++) assert.ok((await l.take('dev:a', 'angles', '2026-10-12', 3)).ok);
  const over = await l.take('dev:a', 'angles', '2026-10-12', 3);
  assert.equal(over.ok, false);
  assert.equal(over.remaining, 0);
  await l.give('dev:a', 'angles', '2026-10-12');
  assert.ok((await l.take('dev:a', 'angles', '2026-10-12', 3)).ok);
  assert.ok((await l.take('dev:a', 'angles', '2026-10-13', 3)).ok);
  assert.ok((await l.take('dev:b', 'angles', '2026-10-12', 3)).ok, 'devices are independent');
});

test('spend: reserve the worst case, settle to the real cost', async () => {
  const l = ledgerClient(memoryLedgerNamespace());
  const cap = 1_000_000;
  assert.ok((await l.take('global', 'spend', '2026-10-12', cap, 600_000)).ok);
  assert.equal((await l.take('global', 'spend', '2026-10-12', cap, 600_000)).ok, false, 'second reservation would pass the cap');
  await l.settle('global', 'spend', '2026-10-12', 600_000, 25_000);
  assert.equal((await l.peek('global', 'spend', '2026-10-12')).used, 25_000);
  assert.ok((await l.take('global', 'spend', '2026-10-12', cap, 600_000)).ok);
});

test('concurrent takes never exceed the limit (one request at a time per object)', async () => {
  const l = ledgerClient(memoryLedgerNamespace());
  const results = await Promise.all(Array.from({ length: 25 }, () => l.take('dev:x', 'angles', '2026-10-12', 10)));
  assert.equal(results.filter((r) => r.ok).length, 10);
});

test('old days are cleaned up and bad requests are refused', async () => {
  const storage = memoryStorage();
  const obj = new Ledger({ storage });
  const call = (op, body) => obj.fetch(new Request(`https://ledger/${op}`, { method: 'POST', body: JSON.stringify(body) }));
  await call('take', { key: 'angles', day: '2026-10-01', limit: 5 });
  await call('take', { key: 'angles', day: '2026-10-12', limit: 5 });
  assert.deepEqual([...storage.map.keys()], ['angles:2026-10-12']);
  assert.equal((await call('take', { key: 'Angles!', day: '2026-10-12', limit: 5 })).status, 400);
  assert.equal((await call('drop', { key: 'angles', day: '2026-10-12' })).status, 404);
});

test('rate limiter: fixed window fallback and binding preference', async () => {
  let t = 0;
  const rl = memoryRateLimiter({ limit: 2, periodMs: 1000, now: () => t });
  assert.ok(await allow(undefined, rl, 'ip'));
  assert.ok(await allow(undefined, rl, 'ip'));
  assert.equal(await allow(undefined, rl, 'ip'), false);
  t = 1000;
  assert.ok(await allow(undefined, rl, 'ip'));
  const binding = { async limit() { return { success: false }; } };
  assert.equal(await allow(binding, rl, 'other'), false, 'the binding wins when present');
});

test('cost accounting in micro-dollars', () => {
  assert.equal(rateFor('claude-opus-5-5').output, 20);
  // 1,000 output tokens at $20/MTok = $0.02 = 20,000 micro-dollars.
  assert.equal(costMicros([{ model: 'claude-opus-5-5', input: 0, output: 1000, cacheWrite: 0, cacheRead: 0 }]), 20000);
  assert.equal(costMicros([{ model: 'claude-opus-5-5', input: 200, output: 400, cacheWrite: 0, cacheRead: 3500 }]), 800 + 8000 + 700);
  assert.ok(rateFor('mystery-model').output >= 50, 'unknown models are priced pessimistically');
  const worst = worstCaseMicros({ model: 'claude-opus-5-5', attempts: 2, promptTokens: 4800, maxTokens: 3000 });
  assert.ok(worst > 2 * costMicros([{ model: 'claude-opus-5-5', input: 0, output: 3000, cacheWrite: 4800, cacheRead: 0 }]));
});
