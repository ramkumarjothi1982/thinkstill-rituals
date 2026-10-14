// Typed channels (composer/channels.js): ownership windows, ordering (R5),
// duplicate times, merge rules, and evaluators that reproduce motion.js and
// the v2 formulas bit for bit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelSet, CompileError, checkChannels, compileExpr, evaluator, channelTable, CATALOGUE, BODY_DOFS, FACE_V2 } from '../../composer/channels.js';
import { Track, Impulses, Hops, Blinks, noise1, smoothstep, TAU, ease } from '../../engine/motion.js';

const rule = (fn) => { try { fn(); } catch (e) { return e.rule || e.message; } return null; };

test('unsorted keys within one move are a compile error (R5)', () => {
  const s = new ChannelSet({ D: 15 });
  s.setWriter('M-A', 1);
  s.own('body.squash', 0, 15);
  s.key('body.squash', 3.0, 0.1);
  assert.equal(rule(() => s.key('body.squash', 2.0, 0.2)), 'channel:unsorted');
});

test('keys from several moves are merged and sorted before the Track is built (R5 fix)', () => {
  const s = new ChannelSet({ D: 15 });
  s.setWriter('LATE', 2); s.own('body.lean', 5, 15); s.key('body.lean', 6, 0.04, { f: 2, z: 0.8 });
  s.setWriter('EARLY', 1); s.own('body.lean', 0, 5); s.key('body.lean', 1, -0.03); s.key('body.lean', 2, 0.01);
  const built = s.build()['body.lean'];
  assert.deepEqual(built.keys.map((k) => [k.t, k.by]), [[1, 'EARLY'], [2, 'EARLY'], [6, 'LATE']]);
  const f = evaluator(built);
  const ref = new Track(0, { f: 2.2, z: 0.75 }).to(1, -0.03).to(2, 0.01).to(6, 0.04, { f: 2, z: 0.8 });
  for (const t of [0.5, 1.5, 3, 6.5, 9]) assert.ok(Object.is(f(t), ref.value(t)), `t=${t}`);
  // the bug the sort prevents: inserting in write order (late move first) silently breaks the track
  const naive = new Track(0, { f: 2.2, z: 0.75 }).to(6, 0.04, { f: 2, z: 0.8 }).to(1, -0.03).to(2, 0.01);
  assert.notEqual(naive.value(1.5), ref.value(1.5));
});

test('duplicate spline times are a compile error, within one move and across moves', () => {
  const s = new ChannelSet({ D: 15 });
  s.setWriter('C', 1); s.own('cam.zoom', 0, 15); s.key('cam.zoom', 0, 1); s.key('cam.zoom', 5, 1.04); s.key('cam.zoom', 5, 1.05);
  assert.equal(rule(() => s.build()), 'channel:duplicate-spline-time');
  const s2 = new ChannelSet({ D: 15 });
  s2.setWriter('A', 1); s2.own('props.p.radius', 0, 7); s2.key('props.p.radius', 0, 1);
  s2.setWriter('B', 2); s2.own('props.p.radius', 7, 15); s2.key('props.p.radius', 7, 1);
  s2.setWriter('A', 1); assert.equal(rule(() => s2.key('props.p.radius', 7, 2)), 'channel:ownership');   // A cannot reach into B's window
  const s3 = new ChannelSet({ D: 15 });
  s3.setWriter('A', 1); s3.own('cam.y', 0, 7.5); s3.key('cam.y', 7, 960);
  s3.setWriter('B', 2); s3.own('cam.y', 7.5, 15); s3.key('cam.y', 7.5, 950);
  assert.equal(rule(() => s3.build()), null);
});

test('overlapping ownership windows are a compile error; writes outside a window or without one too', () => {
  const s = new ChannelSet({ D: 15 });
  s.setWriter('G-JOLT', 1); s.own('face.eyeOpen', 0.26, 0.98);
  s.setWriter('AFTER', 2);
  assert.equal(rule(() => s.own('face.eyeOpen', 0.9, 3)), 'channel:ownership');
  s.own('face.eyeOpen', 0.98, 3);                                          // touching windows are fine ([from, to))
  assert.equal(rule(() => s.key('face.eyeOpen', 0.5, 1)), 'channel:ownership');   // in G-JOLT's window
  assert.equal(rule(() => s.key('face.squint', 1, 1)), 'channel:ownership');       // never owned
  assert.equal(rule(() => s.key('nope.channel', 1, 1)), 'channel:unknown');
  assert.equal(rule(() => s.own('face.blink', 0, 1)), 'channel:ownership');        // merged channels have no owner
  const t1 = new ChannelSet({ D: 15 }); t1.setWriter('X', 1); t1.term('body.inflate.pant', { type: 'sine', amp: 0.01, freq: 1, env: 'pant' });
  t1.setWriter('Y', 2); assert.equal(rule(() => t1.term('body.inflate.pant', { type: 'sine', amp: 0.02, freq: 1, env: 'pant' })), 'channel:ownership');
});

test('key times outside [−P, D] are refused', () => {
  const s = new ChannelSet({ D: 15, P: 0 });
  s.setWriter('A', 1); s.own('body.squash', -1, 16);
  assert.equal(rule(() => s.key('body.squash', -0.1, 0)), 'channel:time');
  const p = new ChannelSet({ D: 15, P: 0.5 });
  p.setWriter('A', 1); p.own('body.squash', -0.5, 16);
  p.key('body.squash', -0.4, 0.02);
  p.key('body.squash', 14.9, 0);
  assert.equal(rule(() => p.key('body.squash', 15.2, 0)), 'channel:time');
  assert.equal(rule(() => new ChannelSet({ D: 15, P: 0.5 }).push('face.blink', { t: -0.6, close: 0.07, hold: 0.02, open: 0.13 })), 'channel:time');
});

test('checkChannels refuses a malformed direction: unsorted keys, duplicates, overlaps, keys outside windows', () => {
  const ok = { type: 'track', v0: 0, f: 3, z: 0.8, keys: [{ t: 1, v: 0.1, f: 3, z: 0.8, by: 'A' }, { t: 2, v: 0, f: 3, z: 0.8, by: 'A' }], windows: [{ by: 'A', from: 0, to: 15 }] };
  assert.deepEqual(checkChannels({ 'body.squash': ok }, 15), []);
  const unsorted = { ...ok, keys: [ok.keys[1], ok.keys[0]] };
  assert.deepEqual(checkChannels({ 'body.squash': unsorted }, 15).map((e) => e.rule), ['channel:unsorted']);
  const dup = { type: 'spline', keys: [{ t: 0, v: 1, by: 'A' }, { t: 0, v: 2, by: 'A' }], windows: [{ by: 'A', from: 0, to: 15 }] };
  assert.deepEqual(checkChannels({ 'cam.zoom': dup }, 15).map((e) => e.rule), ['channel:duplicate-spline-time']);
  const overlap = { ...ok, windows: [{ by: 'A', from: 0, to: 8 }, { by: 'B', from: 7, to: 15 }] };
  assert.deepEqual(checkChannels({ 'body.squash': overlap }, 15).map((e) => e.rule), ['channel:ownership']);
  const outside = { ...ok, windows: [{ by: 'A', from: 5, to: 15 }] };
  assert.deepEqual(checkChannels({ 'body.squash': outside }, 15).map((e) => e.rule), ['channel:ownership', 'channel:ownership']);
});

test('merge rules: impulses and ripples sum in time order, blinks merge by max, overlapping hops are refused', () => {
  const s = new ChannelSet({ D: 15 });
  s.setWriter('B', 2); s.push('body.squash.kicks', { t: 9.32, amp: 0.08, f: 1.5, z: 0.3 });
  s.setWriter('A', 1); s.push('body.squash.kicks', { t: 0.98, amp: 0.27, f: 3, z: 0.24 });
  const b = s.build()['body.squash.kicks'];
  assert.deepEqual(b.list.map((k) => k.t), [0.98, 9.32]);
  const ref = new Impulses().kick(0.98, 0.27, 3, 0.24).kick(9.32, 0.08, 1.5, 0.3);
  const f = evaluator(b);
  for (const t of [1, 2, 9.5, 12]) assert.ok(Object.is(f(t), ref.value(t)));
  const bl = new ChannelSet({ D: 15 });
  bl.setWriter('A', 1); bl.push('face.blink', { t: 1.42, close: 0.07, hold: 0.02, open: 0.13 });
  bl.setWriter('B', 2); bl.push('face.blink', { t: 1.45, close: 0.07, hold: 0.02, open: 0.13 });
  const fb = evaluator(bl.build()['face.blink']);
  const rb = new Blinks().add(1.42).add(1.45);
  for (const t of [1.43, 1.47, 1.5, 1.6]) assert.ok(Object.is(fb(t), rb.value(t)));
  const h = new ChannelSet({ D: 15 });
  h.setWriter('A', 1); h.push('body.lift.hops', { t0: 0.4, t1: 0.98, h: 165 });
  h.setWriter('B', 2); h.push('body.lift.hops', { t0: 0.9, t1: 1.2, h: 30 });
  assert.equal(rule(() => h.build()), 'channel:overlap');
  assert.ok(Object.is(evaluator({ type: 'hops', list: [{ t0: 0.4, t1: 0.98, h: 165 }] })(0.6), new Hops().add(0.4, 0.98, 165).value(0.6)));
});

test('envelope expressions evaluate exactly like the v2 formulas (operand order kept)', () => {
  // v2: sleepEnv, pantEnv and restAt (videos/my-brain-at-2am-v2.js)
  const sleepEnv = (t) => (1 - smoothstep(0.18, 0.34, t)) + Math.max(0.7 * smoothstep(10.8, 11.8, t), smoothstep(13.3, 14.4, t));
  const pantEnv = (t) => smoothstep(1.3, 2.0, t) * (1 - smoothstep(6.95, 7.3, t));
  const restAt = (t) => Math.max(0, Math.min(1, (1 - smoothstep(0.17, 0.25, t)) + smoothstep(14.2, 14.5, t)));
  const fs = compileExpr({ add: [{ sub: [1, { ss: [0.18, 0.34] }] }, { max: [{ mul: [0.7, { ss: [10.8, 11.8] }] }, { ss: [13.3, 14.4] }] }] });
  const fp = compileExpr({ mul: [{ ss: [1.3, 2.0] }, { sub: [1, { ss: [6.95, 7.3] }] }] });
  const fr = compileExpr({ clamp: [{ add: [{ sub: [1, { ss: [0.17, 0.25] }] }, { ss: [14.2, 14.5] }] }, 0, 1] });
  for (let i = 0; i <= 3000; i++) {
    const t = i * 0.005;
    assert.ok(Object.is(fs(t), sleepEnv(t)) && Object.is(fp(t), pantEnv(t)) && Object.is(fr(t), restAt(t)), `t=${t}`);
  }
  assert.equal(rule(() => compileExpr({ ss: [2, 1] })), 'expr');
  assert.equal(rule(() => compileExpr({ pow: [1, 2] })), 'expr');
});

test('term evaluators reproduce v2 dofAt operand order bit for bit', () => {
  const tremble = (t) => smoothstep(3.0, 6.6, t) * (1 - smoothstep(6.95, 7.3, t));
  const T = channelTable({
    'env.tremble': { type: 'expr', expr: { mul: [{ ss: [3.0, 6.6] }, { sub: [1, { ss: [6.95, 7.3] }] }] } },
    'body.squash.tremble': { type: 'noise', env: 'tremble', amp: 0.012, rate: 13, seed: 3 },
    'body.inflate.breath': { type: 'sine', env: 'tremble', amp: 0.03, period: 15 / 4 },
    'body.inflate.pant': { type: 'sine', env: 'tremble', amp: 0.012, freq: 1.7 },
    'body.shimmer.tremble': { type: 'envscale', env: 'tremble', amp: 0.1 },
    'body.shimPhase.tremble': { type: 'ramp', env: 'tremble', rate: 6 },
    'face.mouthWavePhase': { type: 'ramp', rate: 4.2 },
    'mallow.glowPulse': { type: 'pulse', amp: 0.25, period: 15 / 4 },
    'body.shimmer.kicks': { type: 'shimmer', list: [{ t: 0.98, amp: 1, decay: 3, freq: 19 }, { t: 9.32, amp: 0.35, decay: 2, freq: 12 }] },
  });
  for (let i = 0; i <= 1500; i++) {
    const t = i * 0.01, tr = tremble(t);
    assert.ok(Object.is(T.get('body.squash.tremble')(t), tr * 0.012 * noise1(t * 13, 3)));
    assert.ok(Object.is(T.get('body.inflate.breath')(t), 0.03 * Math.sin(TAU * t / (15 / 4)) * tr));
    assert.ok(Object.is(T.get('body.inflate.pant')(t), 0.012 * Math.sin(TAU * 1.7 * t) * tr));
    assert.ok(Object.is(T.get('body.shimmer.tremble')(t), tr * 0.1));
    assert.ok(Object.is(T.get('body.shimPhase.tremble')(t), t * 6 * tr));
    assert.ok(Object.is(T.get('face.mouthWavePhase')(t), t * 4.2));
    assert.ok(Object.is(T.get('mallow.glowPulse')(t), 1 + 0.25 * Math.sin(TAU * t / (15 / 4))));
    let shim = 0, shimP = 0;
    for (const [t0, a, d, w] of [[0.98, 1, 3, 19], [9.32, 0.35, 2, 12]]) if (t > t0) { const k = a * Math.exp(-(t - t0) * d); if (k > shim) { shim = k; shimP = (t - t0) * w; } }
    const [sa, sp] = T.get('body.shimmer.kicks')(t);
    assert.ok(Object.is(sa, shim) && Object.is(sp, shimP));
  }
  // eased track keys use motion.js ease (v2 inhale: inOutSine over crest − inhale)
  const tr = evaluator({ type: 'track', v0: 0, f: 2.4, z: 0.85, keys: [{ t: 7.42, v: 0.21, f: 2.4, z: 0.85, ease: 'inOutSine', dur: 8.9 - 7.42 }] });
  const ref = new Track(0).to(7.42, 0.21, { ease: ease.inOutSine, dur: 8.9 - 7.42 });
  for (const t of [7.5, 8, 8.9, 10]) assert.ok(Object.is(tr(t), ref.value(t)));
});

test('the catalogue: body layers sum in v2 order, every v2 face parameter has a channel, no roll or shake', () => {
  for (const dof of BODY_DOFS) assert.ok(Object.values(CATALOGUE).some((c) => c.dof?.split('+').includes(dof)), dof);
  for (const p of FACE_V2) assert.ok(CATALOGUE[`face.${p}`], p);
  assert.ok(!Object.keys(CATALOGUE).some((k) => /roll|shake/.test(k)));
  const order = (dof) => Object.entries(CATALOGUE).filter(([, c]) => c.dof?.split('+').includes(dof)).sort((a, b) => a[1].order - b[1].order).map(([k]) => k);
  assert.deepEqual(order('squash').slice(0, 3), ['body.squash', 'body.squash.kicks', 'body.squash.tremble']);
  assert.deepEqual(order('inflate'), ['body.inflate', 'body.inflate.breath', 'body.inflate.pant']);
  assert.deepEqual(order('lift'), ['body.lift.hops', 'body.lift']);
  assert.ok(new CompileError('x', 'y') instanceof Error);
});
