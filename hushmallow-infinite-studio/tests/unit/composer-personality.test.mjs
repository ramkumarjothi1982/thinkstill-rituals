// Personality and acting layers: an exact identity for Noomi, the reference
// performer, and real transforms for any other performer; the eye gate; intents
// through the app's expression presets; the single breath envelope (R11).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalityOf, adaptPreset, intentTargets, applyPersonality, REFERENCE } from '../../composer/personality.js';
import { autoBlinks, breathEnvelope, resolver } from '../../composer/acting.js';
import { ChannelSet, channelTable } from '../../composer/channels.js';
import { smoothstep, clamp, spring, lerp } from '../../engine/motion.js';
import { PERSONALITY } from '../../../hushmallow/src/mallows/expressions.js';
import { composeNode, dataWithPack, bitEqual, registryWith, specWith, dataWithCells, baseData } from '../parity/composer-fixtures.mjs';
import { MOVES } from '../../composer/moves/index.js';

const sansProvenance = ({ direction }) => ({ channels: direction.channels, cues: direction.cues, props: direction.props, text: direction.text, body: direction.body, face: direction.face, anchors: direction.anchors });

test('Noomi is the reference performer: amp 1, tempo 1, reaction lag 0', () => {
  const p = personalityOf(baseData().pack);
  assert.deepEqual([p.amp, p.tempo, p.reactLag], [REFERENCE.amp, REFERENCE.tempo, REFERENCE.reactLag]);
});

test('for Noomi the personality pass is an exact identity: every number of the direction bit-identical with and without it', () => {
  const on = composeNode(), off = composeNode({ options: { personality: false } });
  assert.ok(on.report.personality.keysScaled > 20 && on.report.personality.lagged > 0, 'the pass really ran over the keys');
  const diffs = bitEqual(sansProvenance(on), sansProvenance(off));
  assert.deepEqual(diffs.slice(0, 5), []);
});

test('for Noomi the acting layer adds nothing on T01: no seeded blinks, no micro-noise, no bridges, identical direction', () => {
  const on = composeNode(), off = composeNode({ options: { acting: false } });
  assert.deepEqual(on.report.acting, { blinks: [], microNoise: false, bridges: [] });
  assert.deepEqual(bitEqual(sansProvenance(on), sansProvenance(off)).slice(0, 5), []);
});

test('a different performer is transformed: amplitude, tempo and lag, with the impact still landing by 1.0 s', () => {
  const data = dataWithPack((p) => { p.personality.amp = 0.6; p.personality.tempo = 0.8; p.personality.reactLag = 0.12; });
  const ref = composeNode().direction.channels, got = composeNode({ data }).direction.channels;
  const key = (ch, by, i) => ch['body.squash'].keys.filter((k) => k.by === by)[i];
  // the jolt's launch: −0.26 at full amplitude → ×0.6; spring 6 Hz → ×0.8
  assert.ok(Math.abs(key(got, 'G-JOLT', 1).v - 0.6 * key(ref, 'G-JOLT', 1).v) < 1e-12);
  assert.ok(Math.abs(key(got, 'G-JOLT', 1).f - 0.8 * key(ref, 'G-JOLT', 1).f) < 1e-12);
  // reaction keys are delayed, but never past the 1.0 s impact limit: lag clamps to 1.0 − 0.98
  assert.ok(Math.abs(key(got, 'G-JOLT', 1).t - (key(ref, 'G-JOLT', 1).t + 0.02)) < 1e-12);
  assert.equal(key(got, 'G-JOLT', 4).t, key(ref, 'G-JOLT', 4).t, 'the impact itself does not move');
  assert.ok(Math.abs(got['body.lift.hops'].list[0].h - 0.6 * 165) < 1e-9);
  const easedRef = ref['body.inflate'].keys.find((k) => k.ease), eased = got['body.inflate'].keys.find((k) => k.ease);
  assert.ok(Math.abs(eased.dur - easedRef.dur / 0.8) < 1e-12, 'eased durations stretch with tempo');
  // face springs follow tempo, face values do not scale with body amplitude
  const eo = (ch) => ch['face.eyeOpen'].keys[0];
  assert.ok(Math.abs(eo(got).f - 0.8 * eo(ref).f) < 1e-12 && eo(got).v === eo(ref).v);
});

test('the eye gate: closed-eye Mallows open only when intensity × opening reaches the gate (the app\'s own gate for Noomi)', () => {
  const pack = baseData().pack;
  assert.deepEqual(pack.face.eyeGate, PERSONALITY.noomi.eyeGate, 'pack gate is the app gate');
  const p = personalityOf(pack);
  assert.equal(p.eyesOpen(1, 1.32), 1.32);
  assert.equal(p.eyesOpen(0.38, 1.32), 1.32);                              // 0.5016 ≥ 0.5
  assert.equal(p.eyesOpen(0.3, 1.32), 0);
  // a gentle spec: the jolt and its aftermath keep the painted eyes shut
  const gentle = composeNode({ spec: specWith((s) => { s.gag.intensity = 0.3; }), data: (() => { const d = baseData(); const t = structuredClone(d.tuning); t['G-JOLT'].cells.noomi.ranges.intensity = [0.3, 1, 1]; return { ...d, tuning: t }; })() });
  const eyeKeys = gentle.direction.channels['face.eyeOpen'].keys;
  assert.deepEqual(gentle.direction.provenance.eyeGate.map((c) => [c.by, c.t, c.asked]), [['G-JOLT', 0.4, 1.32]], 'the closure is recorded at the snap');
  assert.ok(!eyeKeys.some((k) => k.by === 'G-JOLT' || k.by === 'acting/aftermath-startled'), 'no opening from the gag or the aftermath');
  assert.ok(eyeKeys.some((k) => k.by === 'M-ORBIT' && k.v > 1), 'the escalation still opens them to chase the thoughts');
});

test('intents expand through the pack, falling back to the app presets through the adapter', () => {
  const pack = baseData().pack;
  const s = adaptPreset('surprised', 'noomi', pack.face.neutral);
  assert.equal(s.eyeOpen, 1.35, 'Noomi\'s app override');
  assert.equal(s.mouthSmile, pack.face.neutral.mouthSmile + (0 - 0.5), 'app neutral smile 0.5 maps to the painted rest');
  const happy = adaptPreset('happy', 'noomi', pack.face.neutral);
  assert.equal(happy.blush, 1.45 - 1, 'app blush 1 is the painted cheek; v2 blush is the extra flush');
  assert.equal(happy.eyeOpen, 0, 'Noomi keeps her eyes shut when happy (app override)');
  const own = intentTargets({ ...pack, face: { ...pack.face, intents: { surprised: { eyeOpen: 1.2 } } } }, 'surprised');
  assert.equal(own.eyeOpen, 1.2, 'the pack wins over the app');
  assert.throws(() => intentTargets(pack, 'nonsense'), /intent/);

  // a move writing an intent: keys appear in the move's own window, gated and scaled by amount. It is a
  // pose-honest turn (FU-4: poses are judged on compiled values): a flash of surprise as the stop hits, then
  // TURN-SQUEEZE's own squeeze and letting go, so it really exits 'squeezed' where the ritual starts
  const turn = MOVES['TURN-SQUEEZE'];
  const zoneOf = (chs) => Object.fromEntries(chs.map((c) => [c, ['TURN-0.05', 'RITUAL0']]));
  const mover = {
    ...turn, id: 'TEST-INTENT', library: undefined, summary: 'test fixture: writes an intent', cues: { squeeze: { recipe: 'test' } },
    owns: { ...turn.owns, ...zoneOf(['face.mouthRound', 'face.irisScale', 'face.eyeScale', 'face.sparkle']) },
    compile(ctx, A, p) { ctx.intent('surprised', ctx.at(A.TURN, -0.05), { amount: ctx.spec.gag.intensity }); turn.compile(ctx, A, p); },
  };
  const run = (amount) => {
    const spec = specWith((x) => { x.turn = mover.id; x.gag.intensity = amount; });
    const d = dataWithCells([mover.id], spec);
    d.tuning['G-JOLT'].cells.noomi.ranges.intensity = [0.3, 1, 1];
    return composeNode({ spec, data: d, moves: registryWith(mover) });
  };
  const full = run(1);
  const k = (c, ch) => c.direction.channels[ch].keys.find((x) => x.by === 'TEST-INTENT');
  assert.equal(k(full, 'face.eyeOpen').v, 1.35, 'surprised at full amount: Noomi\'s eyes open to 1.35');
  assert.equal(k(full, 'face.mouthOpen').v, 0.85);
  assert.ok(full.report.personality.intents > 3);
  // at amount 0.5 the opening (0.675) is gated shut: 0.5 · 0.675 < 0.5; the mouth still scales
  const half = run(0.5);
  assert.equal(k(half, 'face.eyeOpen').v, 0);
  assert.equal(k(half, 'face.mouthOpen').v, 0.425);
  // the closure is recorded at the intent's key time, for the pose contracts (poses.js eyeGateAt); the
  // jolt at intensity 0.5 opens (0.5 × 1.32 ≥ 0.5), so it is the only one. Nothing is closed at full amount
  assert.deepEqual(half.direction.provenance.eyeGate, [{ t: 6.95, by: 'TEST-INTENT', asked: 0.675, k: 0.5, gate: 0.5 }]);
  assert.equal(full.direction.provenance.eyeGate, undefined);
});

test('seeded auto-blinks fill long open holds only: deterministic, away from impacts and rest windows', () => {
  const s = new ChannelSet({ D: 15, neutral: baseData().pack.face.neutral });
  s.setWriter('T', 1); s.own('face.eyeOpen', 0, 15); s.key('face.eyeOpen', 0.5, 1, { f: 4, z: 1 }); s.key('face.eyeOpen', 13, 0, { f: 4, z: 1 });
  s.term('env.rest', { type: 'expr', expr: 0 });
  const built = s.build();
  const mk = (seed) => { let x = seed; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
  const a = autoBlinks(built, { rate: [3.5, 7], rnd: mk(7), avoid: [6], D: 15 });
  const b = autoBlinks(built, { rate: [3.5, 7], rnd: mk(7), avoid: [6], D: 15 });
  assert.deepEqual(a, b);
  assert.ok(a.length >= 1, JSON.stringify(a));
  for (let i = 1; i < a.length; i++) assert.ok(a[i] - a[i - 1] >= 3.5 - 1e-9 && a[i] - a[i - 1] <= 7 + 1e-9);
  assert.ok(a.every((t) => Math.abs(t - 6) >= 0.3 && t > 0.5 && t < 13 - 0.3));
  // the golden direction blinks often enough on its own
  assert.deepEqual(composeNode().report.acting.blinks, []);
});

test('the breath envelope is ONE exported function of the direction, equal to v2\'s picture envelope (R11, picture side)', () => {
  const env = breathEnvelope(composeNode().direction);
  const sleepEnv = (t) => (1 - smoothstep(0.18, 0.34, t)) + Math.max(0.7 * smoothstep(10.8, 11.8, t), smoothstep(13.3, 14.4, t));
  for (let i = 0; i <= 1500; i++) assert.ok(Object.is(env(i / 100), sleepEnv(i / 100)), `t=${i / 100}`);
  // the term v2's score dropped (0.7·smoothstep(10.8, 11.8)) is in it: breathing resumes at 70 % after the ritual
  assert.equal(env(11.9), 0.7);
});

test('look-at targets come from the same controller the runtime renders: v2\'s lookAtBubble formula', () => {
  const { direction } = composeNode();
  const d = baseData();
  const R = resolver({ A: direction.anchors, posts: new Map(), provisional: direction.channels, props: direction.props, pack: d.pack, faceSpec: d.faceSpec, silhouette: d.silhouette });
  // v2: eyeC = [540, 1300 − (sil.baseY − (L.y + R.y)/2)·0.56]; bubble 0 at t + 0.12
  const eyeC = [540, 1300 - (d.silhouette.baseY - (d.faceSpec.eyes.L.y + d.faceSpec.eyes.R.y) / 2) * 0.56];
  assert.deepEqual(R.eyeCentre, eyeC);
  const t = 3.25, b = R.propAt('thoughts', 0, t + 0.12);
  const dx = b.x - eyeC[0], dy = b.y - eyeC[1], dd = Math.hypot(dx, dy);
  assert.deepEqual(R.lookAt('thoughts', 0, t), [clamp(dx / dd * 1.05, -0.85, 0.85), clamp(dy / dd * 0.95, -0.9, 0.5)]);
  // and the orbit controller is v2's bubbleAt (first thought, arrival): x = lerp(HEAD.x, cx + rx·R·cos(slot + phase), spring(t − 3, 1.6, 0.62))
  const k = spring(t + 0.12 - 3, 1.6, 0.62), ph = channelTable(direction.channels).get('props.thoughts.phase')(t + 0.12);
  assert.ok(Object.is(b.x, lerp(540, 540 + 270 * 1 * Math.cos(Math.PI + ph), k)));
});

test('applyPersonality on an empty set is harmless; the reference factors leave keys untouched in place', () => {
  const s = new ChannelSet({ D: 15 });
  s.setWriter('A', 1); s.own('body.squash', 0, 15); s.key('body.squash', 1, -0.26, { f: 6, z: 0.5, react: true });
  const before = JSON.stringify([...s.defs.values()].map((d) => d.keys));
  applyPersonality(s, { id: 'x', face: { neutral: {} }, personality: {} });
  assert.equal(JSON.stringify([...s.defs.values()].map((d) => d.keys)), before);
});
