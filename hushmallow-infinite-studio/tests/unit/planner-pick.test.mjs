import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { lib, policy, realCtx, openCtx, capsFrom } from '../property/support.mjs';
import { planBatch, planSpec, intensityCap } from '../../planner/pick.mjs';
import { emptyLedger } from '../../planner/ledger.mjs';
import { sha256Hex } from '../../planner/canonical.mjs';

const review = (ctx, count, seed, extra = {}) => planBatch({ ...ctx, mode: 'review', count, seed, batch: 't', ...extra });

test('only enabled cells, packs and presets are sampled (today: T01 / Noomi / late night / 15 s)', () => {
  const r = review(realCtx(), 500, 1);
  assert.equal(r.specs.length, 500);
  for (const s of r.specs) {
    assert.equal(s.template, 'T01-brain-at-2am');
    assert.equal(s.mallow, 'noomi');
    assert.equal(s.tod, 'late-night');
    assert.equal(s.duration, 15);
    assert.deepEqual([s.gag.id, s.metaphor, s.turn, s.ritual, s.loop, s.camera, s.arc], ['G-JOLT', 'M-ORBIT', 'TURN-SQUEEZE', 'R-BREATH', 'LP-RETURN', 'C-DRIFT-IN', 'A-COLD-DIP-WARM']);
    assert.ok(Object.values(s.cells).every((v) => v === 'approved'));
    assert.equal(s.internal, true, 'review specs carry the INTERNAL mark');
  }
});

test('review mode samples candidate cells; production never does', () => {
  const raw = {
    schema: 'hm-capabilities/1', mallows: { noomi: { status: 'approved' } },
    realms: { 'moonmilk-cove': { status: 'approved', tods: { 'late-night': 'approved' }, durations: { 15: 'approved' }, weather: { clear: 'approved' }, dressing: {}, dressingBudget: { maxItems: 2, maxCostMs: 60 } } },
    moves: Object.fromEntries([['G-JOLT', 'gag', 'approved'], ['G-SINK', 'gag', 'candidate'], ['M-ORBIT', 'metaphor', 'approved'], ['TURN-SQUEEZE', 'turn', 'approved'], ['R-BREATH', 'ritual', 'approved'],
      ['LP-RETURN', 'loop', 'approved'], ['C-DRIFT-IN', 'camera', 'approved'], ['A-COLD-DIP-WARM', 'arc', 'approved']].map(([id, kind, s]) => [id, { kind, cells: { noomi: s } }])),
  };
  const caps = capsFrom(raw);
  const ctx = { lib, policy, caps, ledger: emptyLedger() };
  const rev = review(ctx, 300, 3, { distinct: false });
  assert.ok(rev.specs.some((s) => s.gag.id === 'G-SINK' && s.cells['G-SINK/noomi'] === 'candidate'));
  const prod = planBatch({ ...ctx, mode: 'production', count: 1, seed: 3, batch: 'p', channel: 'tiktok', start: '2026-11-03' });
  for (let seed = 0; seed < 200; seed++) {
    const one = planBatch({ ...ctx, mode: 'production', count: 1, seed, batch: 'p', channel: 'tiktok', start: '2026-11-03' });
    assert.equal(one.specs[0].gag.id, 'G-JOLT');
  }
  assert.equal(prod.specs.length, 1);
});

test('primary Mallows weigh 3, secondaries 1 (T01: noomi, zuzu primary; blubi, glitzi secondary)', (t) => {
  const r = review(openCtx(), 8000, 5, { constraints: { template: ['T01'] }, distinct: false });
  const primary = r.specs.filter((s) => ['noomi', 'zuzu'].includes(s.mallow)).length / r.specs.length;
  t.diagnostic(`primary share ${primary.toFixed(4)} of 8000 T01 specs (expected 0.75)`);
  assert.ok(Math.abs(primary - 0.75) < 0.02, `primary share ${primary}`);
});

test('the signature gag is used about 40% of the time where feasible', (t) => {
  const r = review(openCtx(), 20000, 12, { constraints: { template: ['T01'], mallow: ['noomi'] }, distinct: false });
  const sig = r.specs.filter((s) => s.gag.id === 'G-JOLT').length / r.specs.length;
  t.diagnostic(`signature share ${sig.toFixed(4)} of 20000 T01/noomi specs (expected 0.40, sd 0.0035)`);
  assert.ok(Math.abs(sig - 0.4) < 0.0125, `signature share ${sig}`);
  // where the signature is not listed for the template, it never appears
  const t03 = review(openCtx(), 2000, 6, { constraints: { template: ['T03'], mallow: ['noomi'] }, distinct: false });
  assert.ok(t03.specs.every((s) => s.gag.id !== 'G-JOLT'));
});

test('template intensity caps are honoured (T14/T26 <= 0.4, gentle-comic and T09 <= 0.6)', (t) => {
  assert.equal(intensityCap(lib.template('T14'), policy), 0.4);
  assert.equal(intensityCap(lib.template('T26'), policy), 0.4);
  assert.equal(intensityCap(lib.template('T09'), policy), 0.6);
  assert.equal(intensityCap(lib.template('T18'), policy), 0.6);
  assert.equal(intensityCap(lib.template('T01'), policy), 1);
  const r = review(openCtx(), 6000, 7, { distinct: false });
  const max = {};
  for (const s of r.specs) max[s.template] = Math.max(max[s.template] || 0, s.gag.intensity);
  t.diagnostic(`max intensity: T09 ${max['T09-rejection-sting']}, T14 ${max['T14-missing-someone']}, T18 ${max['T18-left-out']}, T26 ${max['T26-nostalgia']} (6000 specs)`);
  for (const s of r.specs) {
    const cap = intensityCap(lib.template(s.template), policy);
    assert.ok(s.gag.intensity <= cap && s.gag.intensity >= policy.intensity.low * cap - 0.01, `${s.template} ${s.gag.intensity} cap ${cap}`);
  }
  assert.ok(r.specs.some((s) => s.template === 'T14-missing-someone'));
});

test('slots respect the library: ritual fits the window, L4 only at 20 s, nameWord only with R-NAMEIT', () => {
  const r = review(openCtx(), 4000, 8, { distinct: false });
  let fourth = 0;
  for (const s of r.specs) {
    assert.ok(lib.rituals[s.ritual].minDur <= lib.ritualWindow(s.duration) + 1e-6);
    if (s.copy.lines.length === 4) { fourth++; assert.equal(s.duration, 20); assert.equal(new Set(s.copy.lines).size, 4); }
    assert.equal(s.copy.nameWord !== null, s.ritual === 'R-NAMEIT');
    assert.ok(lib.todsFor(lib.template(s.template), s.mallow).includes(s.tod));
  }
  assert.ok(fourth > 0);
});

test('byte-reproducible from the seed, in-process and across processes', () => {
  const a = JSON.stringify(review(openCtx(), 300, 9));
  const b = JSON.stringify(review(openCtx(), 300, 9));
  assert.equal(a, b);
  assert.notEqual(a, JSON.stringify(review(openCtx(), 300, 10)));
  const code = `import { lib, policy, openCtx } from ${JSON.stringify(new URL('../property/support.mjs', import.meta.url).href)};
    import { planBatch } from ${JSON.stringify(new URL('../../planner/pick.mjs', import.meta.url).href)};
    process.stdout.write(JSON.stringify(planBatch({ ...openCtx(), mode: 'review', count: 300, seed: 9, batch: 't' })));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', maxBuffer: 256 << 20 });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(sha256Hex(r.stdout), sha256Hex(a));
});

test('10k specs in under 10 s', (t) => {
  const t0 = performance.now();
  const r = review(openCtx(), 10000, 11);
  const ms = performance.now() - t0;
  t.diagnostic(`10,000 distinct specs over the whole library in ${ms.toFixed(0)} ms`);
  assert.equal(r.specs.length, 10000);
  assert.ok(ms < 10000, `${ms.toFixed(0)} ms`);
  const t1 = performance.now();
  const real = review(realCtx(), 10000, 11, { distinct: false });
  assert.equal(real.specs.length, 10000);
  assert.ok(performance.now() - t1 < 10000);
});

test('pinned slots (hm spec new) and honest failure reports', () => {
  const one = planSpec({ ...openCtx(), mode: 'review', seed: 1, batch: 'x', constraints: { template: ['T26'], mallow: ['blubi'], duration: [20], ritual: ['R-SAVOUR'] } });
  assert.equal(one.spec.template, 'T26-nostalgia');
  assert.equal(one.spec.mallow, 'blubi');
  assert.equal(one.spec.duration, 20);
  assert.equal(one.spec.ritual, 'R-SAVOUR');
  const none = planSpec({ ...realCtx(), mode: 'review', seed: 1, batch: 'x', constraints: { template: ['T26'] } });
  assert.equal(none.spec, undefined);
  assert.deepEqual(Object.keys(none.failure.blockedBy), ['no-template']);
  const prod = planBatch({ ...realCtx(), mode: 'production', count: 2, seed: 1, batch: 'p', channel: 'tiktok', start: '2026-11-03' });
  assert.equal(prod.specs.length, 1, 'T01 alone cannot be posted twice in a row');
  assert.ok(prod.failures[0].blockedBy['sequence:repeat-template'] > 0);
  assert.throws(() => planBatch({ ...realCtx(), mode: 'production', count: 1, seed: 1, batch: 'p' }), /channel and a start date/);
  assert.throws(() => planSpec({ ...realCtx(), mode: 'review', seed: 1, batch: 'x', constraints: { mallow: ['nomi'] } }), /unknown mallow nomi/);
  assert.throws(() => planSpec({ ...realCtx(), mode: 'review', seed: 1, batch: 'x', constraints: { template: ['T99'] } }), /unknown template T99/);
});
