// The fault-fixture list (FU-5): every QA gate has at least one fixture, and the
// direction-only faults hit exactly their own gate when the gates judge them in Node
// (the full fixture suite, HM_QA_FIXTURES=1, runs every gate on every fixture).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { studioPath } from '../../render/lib/paths.mjs';
import { GATE_ORDER, loadThresholds } from '../../qa/run-qa.mjs';
import { loadFixtures, makeDirection } from '../../qa/fixtures/build.mjs';

const golden = () => JSON.parse(fs.readFileSync(studioPath('specs', 'golden', 't01-v2.direction.json'), 'utf8'));
const twin = () => JSON.parse(fs.readFileSync(studioPath('qa', 'fixtures', 'v2', 'spec.production.json'), 'utf8'));

test('every gate the report orders has at least one fault fixture', () => {
  const f = loadFixtures();
  const covered = new Set(f.fixtures.map((x) => x.expect.gate));
  const missing = GATE_ORDER.map(([g]) => g).filter((g) => !covered.has(g));
  assert.deepEqual(missing, [], `gates without a fixture: ${missing.join(', ')}`);
  assert.equal(f.fixtures.filter((x) => x.render).map((x) => x.expect.gate).join(), 'G-FINAL:determinism', 'only the determinism fixture needs the re-render');
});

test('direction ops change exactly what they name and never the golden direction', () => {
  const base = golden(), before = JSON.stringify(base);
  const a = makeDirection('prop-param', { prop: 'thoughts', path: ['swell'], value: { amount: 2, dur: 0.2 } }, base);
  assert.deepEqual(a.props[0].params.swell, { amount: 2, dur: 0.2 });
  const b = makeDirection('drop-cue', { by: 'M-ORBIT', type: 'wince' }, base);
  assert.equal(b.cues.length, base.cues.length - 1);
  assert.ok(!b.cues.some((c) => c.by === 'M-ORBIT' && c.type === 'wince'));
  assert.equal(makeDirection('meta', { subframes: 16 }, base).meta.subframes, 16);
  assert.equal(JSON.stringify(base), before, 'the base direction is untouched');
  assert.throws(() => makeDirection('drop-cue', { by: 'M-ORBIT', type: 'nope' }, base), /no cue M-ORBIT:nope/);
  assert.throws(() => makeDirection('prop-param', { prop: 'nope', path: ['x'], value: 1 }, base), /no prop nope/);
  assert.throws(() => makeDirection('bogus', {}, base), /unknown direction op/);
});

test('the direction-only faults fail exactly their own gate: layout, G-DIR, G-COST', async () => {
  const { directionGeometry } = await import('../../qa/gates/geometry.mjs');
  const { layoutGate } = await import('../../qa/gates/layout.mjs');
  const { gdir } = await import('../../composer/validate.js');
  const { gcost } = await import('../../composer/cost.js');
  const T = loadThresholds(), spec = twin();
  const judge = (d) => ({ layout: layoutGate(directionGeometry(d, { frames: 450, fps: 30 }), T), dir: gdir(d, { spec }), cost: gcost(d, { spec }) });
  const v2 = judge(golden());
  assert.ok(v2.layout.pass && v2.dir.pass && v2.cost.pass, 'the golden direction passes all three');
  const defs = Object.fromEntries(loadFixtures().fixtures.filter((x) => x.make.direction).map((x) => [x.id, x]));
  const run = (id) => judge(makeDirection(defs[id].make.direction.op, defs[id].make.direction.params, golden()));
  const balloon = run('ballooning-cards');
  assert.equal(balloon.layout.pass, false);
  assert.equal(balloon.layout.checks.propCoverFace.status, 'fail', JSON.stringify(balloon.layout.metrics));
  assert.ok(balloon.dir.pass && balloon.cost.pass, 'the cards only balloon once their words are gone: G-DIR and G-COST pass');
  const cue = run('unemitted-cue');
  assert.deepEqual(cue.dir.errors.map((e) => e.rule), ['audio:unemitted']);
  assert.ok(cue.layout.pass && cue.cost.pass);
  const flood = run('subframe-flood');
  assert.deepEqual(flood.cost.errors.map((e) => e.rule), ['cost:budget']);
  assert.ok(flood.dir.pass && flood.layout.pass);
});
