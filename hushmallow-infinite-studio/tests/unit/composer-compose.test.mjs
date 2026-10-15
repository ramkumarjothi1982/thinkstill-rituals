// compose(): the golden spec, determinism, the direction contract, hard
// failures, the planner seam, and the move contract of every registered move.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { studioPath } from '../../render/lib/paths.mjs';
import { validateSchema } from '../../planner/spec-schema.mjs';
import { compose } from '../../composer/compose.js';
import { gdir } from '../../composer/validate.js';
import { gcost, predict, COST_MODELS } from '../../composer/cost.js';
import { MOVES } from '../../composer/moves/index.js';
import { loadComposer } from '../../planner/composer-bridge.mjs';
import { createScene } from '../../composer/scene.js';
import { loadGoldenV2, compareDeep } from '../../tools/golden/compare.mjs';
import { composeNode, goldenSpec, specWith, baseData, lib } from '../parity/composer-fixtures.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(studioPath(rel), 'utf8'));
const golden = loadGoldenV2();

test('the golden spec composes into a direction that validates against the frozen contract', async () => {
  const { direction } = await compose(goldenSpec());
  assert.deepEqual(validateSchema(direction, read('composer/schemas/direction-v3.schema.json')), []);
  assert.equal(direction.meta.runtime, 'v3');
  assert.deepEqual(direction.moves.map((m) => m.id), ['acting/idle-breath', 'G-JOLT', 'acting/aftermath-startled', 'M-ORBIT', 'TURN-SQUEEZE', 'R-BREATH', 'close/content-card', 'LP-RETURN', 'C-DRIFT-IN', 'A-COLD-DIP-WARM']);
  assert.ok(direction.moves.every((m) => m.cell.status === 'approved' && /^sha256:/.test(m.cell.version)));
});

test('compose is deterministic: byte-identical JSON on every run, and the v2 cells use no randomness at all', () => {
  const a = JSON.stringify(composeNode().direction), b = JSON.stringify(composeNode().direction);
  assert.equal(a, b);
  const other = composeNode({ spec: specWith((s) => { s.seed = 1234567; }) }).direction;
  const strip = (d) => JSON.stringify({ ...d, meta: { ...d.meta, id: 0, spec: 0, fingerprint: 0 } });
  assert.equal(strip(other), strip(JSON.parse(a)), 'another seed gives the same direction: nothing in the v2 moves is random');
});

test('the cue log is v2\'s, emission order and payloads included (G-CUES, Node side)', () => {
  const { direction } = composeNode();
  const log = direction.cues.map((c) => ({ t: +c.t.toFixed(4), type: c.type, ...c.data }));
  assert.equal(JSON.stringify(log), JSON.stringify(golden.cues.cues));
});

test('Node dry run: curves and sub-frame counts equal the goldens (curves to Node\'s Math.pow, counts exactly)', () => {
  const { direction } = composeNode();
  // the page measures the glass text; give the Node direction the page's boxes (from the golden state) to compare
  const L = {};
  for (const r of golden.states) for (const b of [...r.S.bubblesBack, ...r.S.bubblesFront]) L[b.textTex.$tex] ??= { hw: b.hw, hh: b.hh };
  for (const it of direction.props[0].items) Object.assign(it.layout, L[it.tex], { w: (L[it.tex].hw - 38) * 2 });
  const sc = createScene(direction);
  const curves = Array.from({ length: 450 }, (_, i) => ({ t: +(i / 30).toFixed(4), ...sc.state(i / 30).audio }));
  const res = compareDeep(golden.curves.curves, curves, { tol: 1e-9 });
  assert.ok(res.equal, JSON.stringify(res.diffs.slice(0, 3)));
  assert.deepEqual(Array.from({ length: 450 }, (_, i) => sc.subframes(i / 30)), golden.subframes.frames);
});

test('hard failures, never fallbacks: unbuilt moves, missing presets, untuned cells, out-of-range params', () => {
  const rule = (f) => { try { f(); } catch (e) { return e.rule; } return null; };
  assert.equal(rule(() => composeNode({ spec: specWith((s) => { s.metaphor = 'M-ECHO'; }) })), 'move:unbuilt');
  assert.equal(rule(() => composeNode({ spec: specWith((s) => { s.tod = 'dusk'; }) })), 'realm:tod');
  assert.equal(rule(() => composeNode({ spec: specWith((s) => { s.weather = 'mist'; }) })), 'realm:weather');
  assert.equal(rule(() => composeNode({ spec: specWith((s) => { s.dressing = [{ id: 'lighthouse', variant: 1 }]; }) })), 'realm:dressing');
  assert.equal(rule(() => composeNode({ spec: specWith((s) => { s.gag.intensity = 0.5; }) })), 'param:range', 'the cell approves 0.8–1');
  const d = baseData();
  const t = structuredClone(d.tuning); t['M-ORBIT'].cells.noomi.status = 'untuned';
  assert.equal(rule(() => composeNode({ data: { ...d, tuning: t } })), 'cell:untuned');
  const t2 = structuredClone(d.tuning); delete t2['R-BREATH'].cells.noomi;
  assert.equal(rule(() => composeNode({ data: { ...d, tuning: t2 } })), 'cell:missing');
  assert.equal(rule(() => composeNode({ data: { ...d, faceSpec: null } })), 'pack:measured');
});

test('gag intensity scales the jolt and is exact at 1; every planner intensity still passes G-DIR', () => {
  const full = composeNode().direction, soft = composeNode({ spec: specWith((s) => { s.gag.intensity = 0.8; }) }).direction;
  assert.equal(full.channels['body.lift.hops'].list[0].h, 165);
  assert.ok(Math.abs(soft.channels['body.lift.hops'].list[0].h - (165 - (165 - 59.4) * 0.2)) < 1e-9);
  assert.ok(soft.channels['body.squash.kicks'].list[0].amp < full.channels['body.squash.kicks'].list[0].amp);
  assert.deepEqual(gdir(soft).errors, []);
});

test('the planner\'s seam loads the real composer and its gates (planner/composer-bridge.mjs)', async () => {
  const c = await loadComposer();
  assert.ok(c && typeof c.compose === 'function' && typeof c.gdir === 'function' && typeof c.gcost === 'function');
  const compiled = await c.compose(goldenSpec(), { lib });
  assert.equal(c.gdir(compiled, { spec: goldenSpec(), lib }).pass, true);
  const g = c.gcost(compiled, { spec: goldenSpec(), lib });
  assert.equal(g.pass, true);
  assert.equal(g.metrics.model, 'final');
});

test('G-COST: the exact model predicts the measured v2 render; the final model (refit, tests/unit/composer-cost.test.mjs) fits the budget', () => {
  const { direction } = composeNode();
  const exact = predict(direction, COST_MODELS.exact);
  assert.equal(exact.subframes, 1991);
  assert.ok(Math.abs(exact.seconds - 1337.6) / 1337.6 < 0.01, `${exact.seconds} s vs 1,337.6 s measured (WP-01 run A)`);
  const r = gcost(direction, { spec: goldenSpec() });
  assert.equal(r.pass, true);
  assert.ok(r.metrics.predictedMin <= 11 && r.metrics.subframes === 1587, JSON.stringify(r.metrics));
  assert.deepEqual(r.warnings, []);
  const slow = structuredClone(direction); slow.meta.subframes = 16;   // every frame at 16 sub-frames
  assert.equal(gcost(slow, { spec: { quality: 'exact' } }).pass, true, 'exact has no budget (goldens only)');
});

test('every registered move honours the move contract (composer/schemas/move.schema.json)', () => {
  const sch = read('composer/schemas/move.schema.json');
  for (const m of Object.values(MOVES)) {
    const shape = { ...m, compile: true, ...(m.publishes ? { publishes: true } : {}), ...(m.seam ? { seam: true } : {}) };
    assert.deepEqual(validateSchema(shape, sch), [], m.id);
    for (const [type, c] of Object.entries(m.cues)) assert.ok(c.recipe, `${m.id} cue ${type} has a recipe`);
  }
});
