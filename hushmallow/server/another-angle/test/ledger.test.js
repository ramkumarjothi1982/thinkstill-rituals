import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ledger, ledgerClient, memoryLedgerNamespace, memoryStorage } from '../src/limits/ledger.js';
import { CLOCK_START } from './helpers.js';
import { memoryRateLimiter, allow } from '../src/limits/ratelimit.js';
import { costMicros, worstCaseMicros, rateFor } from '../src/cost.js';

// The days below are 12 and 13 Oct 2026, so the ledger's clock is that day too
// (on the real clock, the alarm would clear them once the date is past the 14th).
const onTheDay = () => CLOCK_START;

test('take enforces a daily limit; give refunds; days are separate', async () => {
  const l = ledgerClient(memoryLedgerNamespace({ now: onTheDay }));
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
  const l = ledgerClient(memoryLedgerNamespace({ now: onTheDay }));
  const cap = 1_000_000;
  assert.ok((await l.take('global', 'spend', '2026-10-12', cap, 600_000)).ok);
  assert.equal((await l.take('global', 'spend', '2026-10-12', cap, 600_000)).ok, false, 'second reservation would pass the cap');
  await l.settle('global', 'spend', '2026-10-12', 600_000, 25_000);
  assert.equal((await l.peek('global', 'spend', '2026-10-12')).used, 25_000);
  assert.ok((await l.take('global', 'spend', '2026-10-12', cap, 600_000)).ok);
});

test('concurrent takes never exceed the limit (one request at a time per object)', async () => {
  const l = ledgerClient(memoryLedgerNamespace({ now: onTheDay }));
  const results = await Promise.all(Array.from({ length: 25 }, () => l.take('dev:x', 'angles', '2026-10-12', 10)));
  assert.equal(results.filter((r) => r.ok).length, 10);
});

test('old days are cleaned up and bad requests are refused', async () => {
  const storage = memoryStorage();
  const obj = new Ledger({ storage }, undefined, { now: onTheDay });
  const call = (op, body) => obj.fetch(new Request(`https://ledger/${op}`, { method: 'POST', body: JSON.stringify(body) }));
  await call('take', { key: 'angles', day: '2026-10-01', limit: 5 });
  await call('take', { key: 'angles', day: '2026-10-12', limit: 5 });
  assert.deepEqual([...storage.map.keys()], ['angles:2026-10-12']);
  assert.equal((await call('take', { key: 'Angles!', day: '2026-10-12', limit: 5 })).status, 400);
  assert.equal((await call('drop', { key: 'angles', day: '2026-10-12' })).status, 404);
});

test('a day\'s counters go two days after the day by the alarm, even if the object is never written to again', async () => {
  let t = Date.parse('2026-10-12T10:00:00Z');
  const storage = memoryStorage();
  const obj = new Ledger({ storage }, undefined, { now: () => t });
  const call = (op, body) => obj.fetch(new Request(`https://ledger/${op}`, { method: 'POST', body: JSON.stringify(body) }));
  await call('take', { key: 'angles', day: '2026-10-12', limit: 5 });
  assert.equal(storage.alarm, Date.parse('2026-10-15T00:00:00Z'), 'set for 00:00 UTC two days after the day ends');
  t = Date.parse('2026-10-13T09:00:00Z');
  await call('take', { key: 'sessions', day: '2026-10-13', limit: 5 });
  assert.equal(storage.alarm, Date.parse('2026-10-15T00:00:00Z'), 'a later day never pushes the alarm back');
  await call('peek', { key: 'angles', day: '2026-10-13' });
  assert.deepEqual([...storage.map.keys()].sort(), ['angles:2026-10-12', 'sessions:2026-10-13']);
  // nothing is written again; the runtime fires the alarm (and clears it)
  t = Date.parse('2026-10-15T00:00:00Z');
  storage.alarm = null;
  await obj.alarm();
  assert.deepEqual([...storage.map.keys()], ['sessions:2026-10-13'], 'the 12th is gone, the 13th is kept');
  assert.equal(storage.alarm, Date.parse('2026-10-16T00:00:00Z'), 'and the alarm waits for the 13th');
  t = Date.parse('2026-10-16T00:00:30Z');
  storage.alarm = null;
  await obj.alarm();
  assert.equal(storage.map.size, 0, 'nothing kept');
  assert.equal(storage.alarm, null, 'and no alarm left');
  // a give or settle on an older day than the alarm brings the alarm forward
  await call('take', { key: 'angles', day: '2026-10-16', limit: 5 });
  await call('give', { key: 'angles', day: '2026-10-15' });
  assert.equal(storage.alarm, Date.parse('2026-10-18T00:00:00Z'));
  assert.equal(typeof Ledger.prototype.alarm, 'function', 'the Durable Object class has the alarm handler (src/index.js exports it)');
});

test('the in-memory ledger runs the same alarms: an idle device\'s count is gone two days after its day', async () => {
  let t = Date.parse('2026-10-12T22:00:00Z');
  const ns = memoryLedgerNamespace({ now: () => t });
  const l = ledgerClient(ns);
  await l.take('dev:idle', 'angles', '2026-10-12', 20);
  await l.take('ip:net', 'sessions', '2026-10-12', 10);
  await l.take('global', 'spend', '2026-10-12', 1_000_000, 500);
  t = Date.parse('2026-10-14T23:59:59Z');
  await ns.runAlarms();
  assert.equal((await l.peek('dev:idle', 'angles', '2026-10-12')).used, 1, 'kept until two days after the day');
  t = Date.parse('2026-10-15T00:00:00Z');
  // the next request to any object runs the alarms that are due first (here the busy global one)
  await l.take('global', 'spend', '2026-10-15', 1_000_000, 500);
  for (const name of ['dev:idle', 'ip:net']) assert.ok(!ns.instances.has(name), `${name}: nothing kept, the object is gone`);
  assert.equal((await l.peek('dev:idle', 'angles', '2026-10-12')).used, 0);
  assert.equal((await l.peek('global', 'spend', '2026-10-12')).used, 0, 'the global day is cleared too');
  assert.equal((await l.peek('global', 'spend', '2026-10-15')).used, 500, 'today is kept');
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
