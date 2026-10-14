// Pose contracts and the bridge mechanism (composer/poses.js, moves/acting/bridge.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSES, pose, mismatches, compatible, planBridges } from '../../composer/poses.js';
import { MOVES } from '../../composer/moves/index.js';
import { composeNode, registryWith, specWith, dataWithCells } from '../parity/composer-fixtures.mjs';
import { gdir } from '../../composer/validate.js';

test('every move that leads a span declares entry and exit poses from the pose table', () => {
  for (const m of Object.values(MOVES)) {
    if (!m.span || m.kind === 'camera' || m.kind === 'arc') continue;
    assert.ok(POSES[m.entry], `${m.id} entry ${m.entry}`);
    assert.ok(POSES[m.exit], `${m.id} exit ${m.exit}`);
  }
  assert.throws(() => pose('floating'), /unknown pose/);
});

test('compatibility: a pose flows into itself; an awake pose does not flow into the painted cover', () => {
  for (const name of Object.keys(POSES)) assert.ok(compatible(name, name), name);
  const mm = mismatches('alert', 'asleep');
  assert.deepEqual(mm.map((m) => m.channel), ['face.eyeOpen', 'face.browAlpha']);
  assert.equal(mm[0].to, 0);
  assert.ok(!compatible('startled', 'squeezed'));
});

test('the v2 sequence chains its poses without a bridge', () => {
  const seq = ['G-JOLT', 'acting/aftermath-startled', 'M-ORBIT', 'TURN-SQUEEZE', 'R-BREATH', 'close/content-card', 'LP-RETURN'].map((id) => MOVES[id]);
  for (let i = 1; i < seq.length; i++) assert.ok(compatible(seq[i - 1].exit, seq[i].entry), `${seq[i - 1].id} → ${seq[i].id}`);
  assert.deepEqual(composeNode().report.acting.bridges, []);
});

test('planBridges: a mismatch with room gets a bridge; without room it is a compile error, never a pop', () => {
  const b = planBridges([{ id: 'A', exit: 'alert', span: [0, 3] }, { id: 'B', entry: 'asleep', span: [3.5, 5] }]);
  assert.equal(b.length, 1);
  assert.deepEqual([b[0].after, b[0].before, b[0].at, b[0].until], ['A', 'B', 3, 3.5]);
  assert.throws(() => planBridges([{ id: 'A', exit: 'alert', span: [0, 3] }, { id: 'B', entry: 'asleep', span: [3.1, 5] }]), (e) => e.rule === 'pose:no-room');
  assert.deepEqual(planBridges([{ id: 'A', exit: 'calm', span: [0, 3] }, { id: 'B', entry: 'calm', span: [3, 5] }]), []);
});

test('the composer inserts a bridge between mismatching moves, inside the gap only', () => {
  // a turn that stops at TURN + 0.1 with the eyes still open, 0.3 s before the ritual expects them squeezed shut
  const early = {
    id: 'TEST-TURN-OPEN', kind: 'turn', summary: 'test fixture: a turn that exits awake', cost: {}, requires: {}, params: {},
    span: ['TURN-0.05', 'TURN+0.1'], entry: 'spiralling', exit: 'alert',
    publishes: (A, at) => ({ squeeze: at(A.TURN, -0.02), relax: at(A.TURN, 0.08) }),
    owns: { 'face.eyeOpen': ['TURN-0.05', 'TURN+0.1'] },
    cues: { squeeze: { recipe: 'test/squeeze' } },
    compile(ctx, A) {
      ctx.post('turn.stop', [ctx.at(A.TURN, -0.05), ctx.at(A.TURN, 0.3)]);
      ctx.key('face.eyeOpen', A.squeeze, 1.0, { f: 4, z: 0.9 });
      ctx.cue(A.squeeze, 'squeeze');
    },
  };
  const spec = specWith((s) => { s.turn = early.id; });
  const moves = registryWith(early);
  const c = composeNode({ spec, data: dataWithCells([early.id], spec), moves });
  assert.deepEqual(c.report.acting.bridges.map((b) => [b.after, b.before, b.channels.join()]), [['TEST-TURN-OPEN', 'R-BREATH', 'face.eyeOpen']]);
  const keys = c.direction.channels['face.eyeOpen'].keys.filter((k) => k.by === 'acting/bridge');
  assert.equal(keys.length, 1);
  assert.ok(keys[0].t > 7.1 && keys[0].t < 7.4, `bridge key inside the gap: ${keys[0].t}`);
  assert.deepEqual(c.direction.channels['face.eyeOpen'].windows.find((w) => w.by === 'acting/bridge'), { by: 'acting/bridge', from: 7.1, to: 7.4 });
  assert.equal(keys[0].v, 0);
  assert.deepEqual(gdir(c, { moves }).errors, []);
  // a bridge cannot take a channel another move owns in the gap
  const greedy = { ...early, id: 'TEST-TURN-GREEDY', owns: { 'face.eyeOpen': ['TURN-0.05', 'RITUAL0'] } };
  const spec2 = specWith((s) => { s.turn = greedy.id; });
  assert.throws(() => composeNode({ spec: spec2, data: dataWithCells([greedy.id], spec2), moves: registryWith(greedy) }), (e) => e.rule === 'pose:bridge-conflict');
});
