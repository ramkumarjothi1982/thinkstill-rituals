// Pose contracts and the bridge mechanism (composer/poses.js, moves/acting/bridge.js).
// FU-4: junctions are judged on compiled channel values, every channel the
// entry pose declares (whether or not the exit pose mentions it), and G-DIR
// checks every declared pose against the compiled direction.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSES, SHUT, POSE_TOL, pose, mismatches, compatible, planBridges, satisfies, closedEyed, eyeGateAt } from '../../composer/poses.js';
import { channelTable } from '../../composer/channels.js';
import { createScene } from '../../composer/scene.js';
import { MOVES } from '../../composer/moves/index.js';
import { composeNode, registryWith, specWith, dataWithCells, dataWithPack, baseData } from '../parity/composer-fixtures.mjs';
import { gdir } from '../../composer/validate.js';
import { validateSchema } from '../../planner/spec-schema.mjs';
import fs from 'node:fs';
import { studioPath } from '../../render/lib/paths.mjs';

const ASLEEP = Object.keys(POSES.asleep);
const poseRules = (r) => r.errors.filter((e) => e.rule.startsWith('pose:'));

/** A track channel definition: keys [[t, v, opts?]], owned by `by` over `win` (default: no windows). */
const track = (v0, keys = [], { f = 3, z = 0.9, by = 'A', windows = [] } = {}) => ({
  type: 'track', v0, f, z, keys: keys.map(([t, v, o = {}]) => ({ t, v, by, ...o })), windows,
});

/** The channels with a planned bridge's keys added (what moves/acting/bridge.js writes), evaluated. */
function withBridges(channels, bridges) {
  const out = structuredClone(channels);
  for (const b of bridges) for (const m of b.channels) {
    const def = out[m.channel] ?? track(0, [], { f: 3, z: 0.9 });
    def.keys.push({ t: b.at, v: m.to, ease: m.ease, dur: m.dur, by: 'acting/bridge' });
    if (m.release) def.keys.push({ t: b.until, v: m.release.v, by: 'acting/bridge' });
    def.keys.sort((x, y) => x.t - y.t);
    out[m.channel] = def;
  }
  return channelTable(out);
}

test('every move that leads a span declares entry and exit poses from the pose table', () => {
  for (const m of Object.values(MOVES)) {
    if (!m.span || m.kind === 'camera' || m.kind === 'arc') continue;
    assert.ok(POSES[m.entry], `${m.id} entry ${m.entry}`);
    assert.ok(POSES[m.exit], `${m.id} exit ${m.exit}`);
  }
  assert.throws(() => pose('floating'), /unknown pose/);
  assert.equal(pose(POSES.calm), POSES.calm, 'a pose object passes through');
});

test('declarations only: a channel the exit pose leaves unconstrained is a mismatch (the M0 audit probes)', () => {
  for (const name of Object.keys(POSES)) assert.ok(compatible(name, name), name);
  // the audit: mismatches('alert','squeezed') returned only face.eyeOpen; mismatches('startled','asleep') skipped
  // closedCurve, browAlpha, mouthOpen, body.squash and body.lift
  assert.deepEqual(mismatches('alert', 'squeezed').map((m) => m.channel), ['face.eyeOpen', 'face.squint']);
  assert.deepEqual(mismatches('startled', 'asleep').map((m) => m.channel), ASLEEP);
  const mm = mismatches('alert', 'asleep');
  assert.deepEqual(mm.map((m) => m.channel), ASLEEP);
  assert.deepEqual(mm.find((m) => m.channel === 'face.squint'), undefined);
  assert.deepEqual(mm.find((m) => m.channel === 'face.closedCurve'), { channel: 'face.closedCurve', have: null, value: null, want: [0.95, 1.05], to: 1 });
  assert.equal(mm[0].to, 0);
  assert.ok(!compatible('startled', 'squeezed'));
});

test('with compiled values every declared entry channel is judged by its value alone', () => {
  const value = (vals) => (ch) => vals[ch];
  // declarations mismatch, values match: no bridge needed
  assert.deepEqual(mismatches('alert', 'squeezed', { value: value({ 'face.eyeOpen': 0, 'face.squint': 0.8 }) }), []);
  // declarations match, values do not: the value wins
  const mm = mismatches('calm', 'calm', { value: value({ 'face.eyeOpen': 0.5, 'face.mouthSmile': 0.85, 'face.squint': 0 }) });
  assert.deepEqual(mm.map((m) => [m.channel, m.value]), [['face.eyeOpen', 0.5]]);
  // a missing or non-finite value is never in range
  assert.deepEqual(mismatches('calm', 'calm', { value: value({ 'face.mouthSmile': 0.85, 'face.squint': 0 }) }).map((m) => m.channel), ['face.eyeOpen']);
  // the slack is perceptual: a spring dipping 1e-5 under 0 is shut, 0.11 is not
  assert.deepEqual(mismatches('squeezed', 'squeezed', { value: value({ 'face.eyeOpen': -1e-5, 'face.squint': 1 }) }), []);
  assert.deepEqual(mismatches('squeezed', 'squeezed', { value: value({ 'face.eyeOpen': 0.11, 'face.squint': 1 }) }).map((m) => m.channel), ['face.eyeOpen']);
  assert.equal(POSE_TOL, 1e-3);
  assert.deepEqual([...SHUT], [0, 0.1]);
  for (const p of ['asleep', 'squeezed', 'calm']) assert.deepEqual(POSES[p]['face.eyeOpen'].slice(0, 2), [...SHUT], `${p}: one shared "shut"`);
});

test('the eye gate holds only where a recorded closure shut the eyes, until a move keys them again', () => {
  assert.equal(closedEyed('closed-tube'), true);
  assert.equal(closedEyed('open-socket'), false);
  const open = POSES.alert['face.eyeOpen'];
  // shut eyes meet an opening pose only when gated
  assert.equal(satisfies('face.eyeOpen', 0, open), false, 'shut is not open');
  assert.equal(satisfies('face.eyeOpen', 0, open, { gated: true }), true, 'held shut by the gate');
  assert.equal(satisfies('face.eyeOpen', 0.4, open, { gated: true }), false, 'half open is neither');
  assert.equal(satisfies('face.eyeOpen', 1, SHUT, { gated: true }), false, 'open eyes never meet a shut pose');
  assert.equal(satisfies('face.browAlpha', 0, POSES.spiralling['face.browAlpha'], { gated: true }), false, 'only the eyes are gated');
  const vals = { 'face.eyeOpen': 0, 'face.browAlpha': 0.3 };
  assert.deepEqual(mismatches('squeezed', 'alert', { value: (ch) => vals[ch] }).map((m) => m.channel), ['face.eyeOpen']);
  assert.deepEqual(mismatches('squeezed', 'alert', { value: (ch) => vals[ch], gated: true }), []);
  // where a closure holds: from its time until the next eyeOpen key strictly between it and the query time
  const snap = { t: 0.4, by: 'G-JOLT', asked: 1.32, k: 0.3, gate: 0.5 };
  const keys = [{ t: 3.42, v: 0.12, by: 'M-ORBIT' }, { t: 3.9, v: 1.04, by: 'M-ORBIT' }];
  const at = eyeGateAt([snap], keys);
  assert.equal(at(0.3), null, 'not before the closure');
  assert.equal(at(0.4), snap, 'from the closure on');
  assert.equal(at(2.72), snap);
  assert.equal(at(3.42), snap, 'a key at the query time has not moved the eyes yet');
  assert.equal(at(3.5), null, 'a later key is a move deciding the eyes itself');
  assert.equal(at(14.3), null);
  // an intent the gate closed writes its own shut key at the closure time: that key does not end it
  const intent = { t: 6.95, by: 'TEST-INTENT', asked: 0.675, k: 0.5, gate: 0.5 };
  assert.equal(eyeGateAt([intent], [...keys, { t: 6.95, v: 0, by: 'TEST-INTENT' }])(7.4), intent);
  // only the closure of an opening counts; no closures, no gate (whatever the face style)
  assert.equal(eyeGateAt([{ ...snap, asked: 0.05 }], [])(1), null, 'asked for shut eyes: nothing was closed');
  assert.equal(eyeGateAt([], keys)(1), null);
  assert.equal(eyeGateAt(undefined, undefined)(1), null);
});

test('planBridges on compiled channels: an entry channel the exit pose never mentions is bridged into range', () => {
  // A exits 'alert' (says nothing of squint); B enters 'squeezed' (squint 0.5–1) and exits 'calm' (squint ≤ 0.1)
  const channels = {
    'face.eyeOpen': track(0, [[1, 1, { f: 4, z: 0.9 }]], { windows: [{ by: 'A', from: 0, to: 3 }] }),
    'face.squint': track(0),
  };
  const seq = [{ id: 'A', entry: 'asleep', exit: 'alert', span: [0, 3] }, { id: 'B', entry: 'squeezed', exit: 'calm', span: [3.5, 6] }];
  const [b] = planBridges(seq, { channels, end: 15 });
  assert.deepEqual([b.after, b.before, b.at, b.until], ['A', 'B', 3, 3.5]);
  assert.deepEqual(b.channels.map((m) => m.channel), ['face.eyeOpen', 'face.squint']);
  for (const m of b.channels) { assert.equal(m.ease, 'inOutSine'); assert.equal(m.dur, 0.5); }
  const T = withBridges(channels, [b]);
  for (const [ch, lo, hi] of [['face.eyeOpen', 0, 0.1], ['face.squint', 0.5, 1]]) {
    const v = T.get(ch)(3.5);
    assert.ok(v >= lo - POSE_TOL && v <= hi + POSE_TOL, `${ch} lands in [${lo}, ${hi}] at the entry: ${v}`);
  }
  // nobody owns squint after the entry and holding it would break B's exit pose: released at the entry
  const sq = b.channels.find((m) => m.channel === 'face.squint');
  assert.deepEqual(sq.release, { v: 0 });
  assert.deepEqual(sq.own, [3, 15]);
  assert.ok(T.get('face.squint')(6) <= 0.1, `released squint is back in calm's range by B's exit: ${T.get('face.squint')(6)}`);
  // eyeOpen's bridge value is inside calm's range too: it holds, owned in the gap only
  const eo = b.channels.find((m) => m.channel === 'face.eyeOpen');
  assert.deepEqual([eo.release, eo.own], [null, [3, 3.5]]);
});

test('planBridges aims through the residual of a still-settling spring, and refuses a bridge that cannot land', () => {
  // A keys the eyes open to 1.2 at 2.95 on a slow spring: at B's entry (3.4) they are still under 'alert' (0.8)
  // with 0.41 to go. The bridge aims past the preferred 1.0 by that residual, clamped to the range (1.3), so the
  // channel lands inside the range at the entry AND rests inside it afterwards
  const seq = [{ id: 'A', exit: 'squeezed', span: [0, 3] }, { id: 'B', entry: 'alert', span: [3.4, 6] }];
  const rising = { 'face.eyeOpen': track(0, [[2.95, 1.2, { f: 0.8, z: 1 }]]), 'face.browAlpha': track(0.3) };
  const [b] = planBridges(seq, { channels: rising });
  const m = b.channels[0];
  assert.deepEqual(b.channels.map((x) => x.channel), ['face.eyeOpen']);
  assert.ok(m.value < 0.8, `still under the range: ${m.value}`);
  assert.equal(m.to, 1.3, 'aimed past the preferred value by the residual, clamped to the range');
  assert.ok(m.landing >= 0.8 && m.landing <= 1.3, `lands in range: ${m.landing}`);
  const T = withBridges(rising, [b]);
  assert.ok(Math.abs(T.get('face.eyeOpen')(3.4) - m.landing) < 1e-9, 'the evaluated channel lands where planned');
  assert.ok(Math.abs(T.get('face.eyeOpen')(9) - 1.3) < 1e-3, 'and rests at the aimed value');
  // eyes keyed shut at 2.9 on a slower spring: 0.44 open at the entry. Landing them shut would need a rest
  // value below shut, so no bridge can do it: the previous move is too slow for its own exit
  const closing = { 'face.eyeOpen': track(1, [[2.9, 0, { f: 0.6, z: 1 }]]), 'face.squint': track(0.8) };
  const shutSeq = [{ id: 'A', exit: 'alert', span: [0, 3] }, { id: 'B', entry: 'squeezed', span: [3.4, 6] }];
  assert.throws(() => planBridges(shutSeq, { channels: closing }), (e) => e.rule === 'pose:bridge-short' && /face\.eyeOpen is still 0\.4\d\d from where A sends it/.test(e.message));
});

test('planBridges: no room is a compile error naming the move that last keyed the channel', () => {
  const channels = { 'face.eyeOpen': track(0, [[1, 1]], { by: 'M-EYES' }), 'face.squint': track(0.8) };
  assert.throws(
    () => planBridges([{ id: 'A', exit: 'alert', span: [0, 3] }, { id: 'B', entry: 'squeezed', span: [3.1, 5] }], { channels }),
    (e) => e.rule === 'pose:no-room' && /face\.eyeOpen = 1\.000 ∉ \[0, 0\.1\] \(last keyed by M-EYES at 1 s\)/.test(e.message) && /a bridge needs ≥ 0\.25 s/.test(e.message),
  );
  // declarations only (no channels): the old contract, with unconstrained channels counted
  const b = planBridges([{ id: 'A', exit: 'alert', span: [0, 3] }, { id: 'B', entry: 'asleep', span: [3.5, 5] }]);
  assert.deepEqual(b[0].channels.map((m) => m.channel), ASLEEP);
  assert.deepEqual(planBridges([{ id: 'A', exit: 'calm', span: [0, 3] }, { id: 'B', entry: 'calm', span: [3, 5] }]), []);
  // the eye gate: shut eyes into an opening pose need no bridge where a recorded closure holds them shut ...
  const shut = { 'face.eyeOpen': track(0), 'face.browAlpha': track(0.3) };
  const seq = [{ id: 'A', exit: 'squeezed', span: [0, 3] }, { id: 'B', entry: 'alert', span: [3.5, 5] }];
  const closure = { t: 1, by: 'A', asked: 1.2, k: 0.3, gate: 0.5 };
  assert.deepEqual(planBridges(seq, { channels: shut, eyeGate: [closure] }), []);
  // ... and nowhere else: no closure, or a move keyed the eyes after it (here shut again at 2), means a bridge
  assert.deepEqual(planBridges(seq, { channels: shut })[0].channels.map((m) => [m.channel, m.to]), [['face.eyeOpen', 1]]);
  const rekeyed = { ...shut, 'face.eyeOpen': track(0, [[2, 0]]) };
  assert.deepEqual(planBridges(seq, { channels: rekeyed, eyeGate: [closure] })[0].channels.map((m) => m.channel), ['face.eyeOpen']);
});

test('the v2 sequence chains its poses on compiled values without a bridge', () => {
  const seq = ['G-JOLT', 'acting/aftermath-startled', 'M-ORBIT', 'TURN-SQUEEZE', 'R-BREATH', 'close/content-card', 'LP-RETURN'].map((id) => MOVES[id]);
  for (let i = 1; i < seq.length; i++) assert.ok(compatible(seq[i - 1].exit, seq[i].entry), `${seq[i - 1].id} → ${seq[i].id}`);
  const golden = composeNode();
  assert.deepEqual(golden.report.acting.bridges, []);
  const r = gdir(golden);
  assert.equal(r.metrics.poses.length, 14, 'entry and exit of 7 span moves');
  assert.deepEqual(r.metrics.poses.filter((p) => !p.ok), []);
});

test('performer variants compile with every pose holding: a slower performer, and a gentle gag the eye gate keeps shut', () => {
  // the approved film's jolt opens the eyes: the gate closes nothing, and nothing is recorded
  assert.equal(composeNode().direction.provenance.eyeGate, undefined);
  const slow = composeNode({ data: dataWithPack((p) => { p.personality.amp = 0.6; p.personality.tempo = 0.8; p.personality.reactLag = 0.12; }) });
  assert.deepEqual(poseRules(gdir(slow)), []);
  const gentleData = baseData();
  gentleData.tuning = structuredClone(gentleData.tuning);
  gentleData.tuning['G-JOLT'].cells.noomi.ranges.intensity = [0.3, 1, 1];
  const gentle = composeNode({ spec: specWith((s) => { s.gag.intensity = 0.3; }), data: gentleData });
  // the gate closed G-JOLT's snap (0.3 × 1.32 < 0.5), recorded at the snap, GAG = 0.4 s
  assert.deepEqual(gentle.direction.provenance.eyeGate, [{ t: 0.4, by: 'G-JOLT', asked: 1.32, k: 0.3, gate: 0.5 }]);
  assert.deepEqual(validateSchema(gentle.direction, JSON.parse(fs.readFileSync(studioPath('composer', 'schemas', 'direction-v3.schema.json'), 'utf8'))), [], 'the record is part of the direction schema');
  assert.deepEqual(gentle.report.acting.bridges, [], 'the gate-shut eyes satisfy startled and alert until M-ORBIT keys them');
  const r = gdir(gentle);
  assert.deepEqual(poseRules(r), []);
  assert.deepEqual(r.metrics.poses.filter((p) => p.gate).map((p) => `${p.move} ${p.which}`), ['G-JOLT exit', 'acting/aftermath-startled entry', 'acting/aftermath-startled exit', 'M-ORBIT entry']);
  assert.ok(Math.abs(createScene(gentle.direction).channel('face.eyeOpen')(0.98)) < 1e-9, 'the gag kept the painted eyes shut');
});

// a turn that stops at TURN + 0.1 with the eyes still open, 0.3 s before the ritual expects them squeezed
// shut; it lets the escalation's brows go, as a turn must (the painted cover has no brows)
const early = {
  id: 'TEST-TURN-OPEN', kind: 'turn', summary: 'test fixture: a turn that exits awake', cost: {}, requires: {}, params: {},
  span: ['TURN-0.05', 'TURN+0.1'], entry: 'spiralling', exit: 'alert',
  publishes: (A, at) => ({ squeeze: at(A.TURN, -0.02), relax: at(A.TURN, 0.08) }),
  owns: { 'face.eyeOpen': ['TURN-0.05', 'TURN+0.1'], 'face.browAlpha': ['TURN-0.05', 'TURN+0.1'] },
  cues: { squeeze: { recipe: 'test/squeeze' } },
  compile(ctx, A) {
    ctx.post('turn.stop', [ctx.at(A.TURN, -0.05), ctx.at(A.TURN, 0.3)]);
    ctx.key('face.eyeOpen', A.squeeze, 1.0, { f: 4, z: 0.9 });
    ctx.key('face.browAlpha', A.relax, 0, { f: 2 });
    ctx.cue(A.squeeze, 'squeeze');
  },
};
const composeWithTurn = (turn) => {
  const spec = specWith((s) => { s.turn = turn.id; });
  const moves = registryWith(turn);
  return { c: composeNode({ spec, data: dataWithCells([turn.id], spec), moves }), moves };
};

test('the composer inserts a bridge between mismatching moves, inside the gap only, and it lands', () => {
  const { c, moves } = composeWithTurn(early);
  // eyeOpen is declared by both poses; squint only by the ritual's entry (the audit's gap): both are bridged
  assert.deepEqual(c.report.acting.bridges.map((b) => [b.after, b.before, b.at, b.channels.join()]), [['TEST-TURN-OPEN', 'R-BREATH', 7.1, 'face.eyeOpen,face.squint']]);
  const ch = c.direction.channels;
  const keys = ch['face.eyeOpen'].keys.filter((k) => k.by === 'acting/bridge');
  assert.equal(keys.length, 1);
  assert.deepEqual([keys[0].t, keys[0].ease, +keys[0].dur.toFixed(9)], [7.1, 'inOutSine', 0.3]);
  assert.ok(Math.abs(keys[0].v) < 1e-3, `aimed at shut: ${keys[0].v}`);
  assert.deepEqual(ch['face.eyeOpen'].windows.find((w) => w.by === 'acting/bridge'), { by: 'acting/bridge', from: 7.1, to: 7.4 });
  // the squint is released at the entry (nobody owns it and the ritual exits calm, squint ≤ 0.1)
  const sq = ch['face.squint'].keys.filter((k) => k.by === 'acting/bridge');
  assert.deepEqual(sq.map((k) => k.t), [7.1, 7.4]);
  const sc = createScene(c.direction);
  assert.ok(sc.channel('face.eyeOpen')(7.4) <= 0.1 + POSE_TOL, 'eyes shut at the ritual');
  assert.ok(sc.channel('face.squint')(7.4) >= 0.5 - POSE_TOL, 'squeezed at the ritual');
  const r = gdir(c, { moves });
  assert.deepEqual(r.errors, []);
  assert.ok(r.metrics.poses.every((p) => p.ok));
  // a bridge cannot take a channel another move owns in the gap
  const greedy = { ...early, id: 'TEST-TURN-GREEDY', owns: { ...early.owns, 'face.eyeOpen': ['TURN-0.05', 'RITUAL0'] } };
  assert.throws(() => composeWithTurn(greedy), (e) => e.rule === 'pose:bridge-conflict');
});

test('a channel left out of range for a later pose is caught, not bridged into a pop: brows still up at the painting', () => {
  // the same turn without letting the brows go: no pose before the painted cover mentions brows, and the
  // cover asks for none. The old declarations-only bridge never saw it; now the compile refuses, naming
  // the escalation that raised them
  const lazy = { ...early, id: 'TEST-TURN-LAZY', owns: { 'face.eyeOpen': early.owns['face.eyeOpen'] }, compile(ctx, A) {
    ctx.post('turn.stop', [ctx.at(A.TURN, -0.05), ctx.at(A.TURN, 0.3)]);
    ctx.key('face.eyeOpen', A.squeeze, 1.0, { f: 4, z: 0.9 });
    ctx.cue(A.squeeze, 'squeeze');
  } };
  assert.throws(() => composeWithTurn(lazy), (e) => e.rule === 'pose:no-room'
    && /close\/content-card exits 'asleep' but LP-RETURN enters 'asleep'/.test(e.message)
    && /face\.browAlpha = 0\.780 ∉ \[0, 0\.05\] \(last keyed by M-ORBIT/.test(e.message));
});
