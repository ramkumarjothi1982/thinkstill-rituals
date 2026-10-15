// G-DIR (composer/validate.js): the golden passes, and each seeded fault fails
// exactly its own rule (PHASE2-PLAN "every gate has at least one seeded fault
// fixture, and each fixture must fail exactly its own gate").

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gdir, THRESHOLDS } from '../../composer/validate.js';
import { MOVES } from '../../composer/moves/index.js';
import { composeNode, registryWith, specWith, baseData } from '../parity/composer-fixtures.mjs';

const golden = composeNode();
const base = () => structuredClone(golden.direction);
const rules = (d) => [...new Set(gdir(d).errors.map((e) => e.rule))].sort();

test('the golden T01 direction passes G-DIR in well under 3 s (warnings are the calibrated provisional ones)', () => {
  const t0 = process.hrtime.bigint();
  const r = gdir(golden);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.deepEqual(r.errors, []);
  assert.equal(r.pass, true);
  // Q5: v2's own values are the limits; the plan's stricter values warn. The frozen score's absolute-time
  // layers are accepted for the approved film only.
  assert.deepEqual(r.warnings.map((w) => w.rule).sort(), ['audio:absolute-layers', 'craft:c1-kink', 'craft:c1-kink', 'safety:spin-ramp-change', 'text:glass-rail', 'text:reading-clear']);
  assert.deepEqual(r.warnings.filter((w) => w.rule === 'craft:c1-kink').map((w) => w.message.split(':')[0]).sort(), ['body.inflate.breath', 'env.breath']);
  assert.ok(ms < 3000, `${ms} ms`);
  assert.equal(r.metrics.subframes, 1991);
  assert.equal(r.metrics.samples, 2441);
});

test('the FU-4 rules measure v2 inside every limit', () => {
  const m = gdir(golden).metrics;
  // spin: the thoughts' orbit peaks at 0.31 turns/s (limit 1; close-up 0.3 only past 25 % of the frame) with a 0.72 s ramp
  assert.deepEqual(m.spin.map((s) => s.id), ['thoughts']);
  assert.ok(Math.abs(m.spin[0].peak - 0.3098) < 1e-3 && m.spin[0].ramp > 0.7 && m.spin[0].cover < 0.1 && m.spin[0].close === null, JSON.stringify(m.spin));
  // the plan's stricter per-change reading (a warning, Q5): the orbit stops at the turn, 0.101 turns/s in 0.37 s, a 0.29 s ramp
  const c = m.spin[0].rampChange;
  assert.ok(Math.abs(c.dw - 0.101) < 2e-3 && Math.abs(c.dur - 0.367) < 0.01 && Math.abs(c.ramp - 0.29) < 0.01 && Math.abs(c.t - 6.63) < 0.01, JSON.stringify(c));
  // pulses: the glow pulse swings over half its 3.75 s period
  assert.deepEqual(m.pulses, [{ channel: 'mallow.glowPulse', ramp: 1.875, at: 0.938 }]);
  // the face stays inside the silhouette's inscribed ellipse (worst: the left blush at 4 s)
  assert.ok(m.faceInSilhouette.rho > 0.85 && m.faceInSilhouette.rho < 0.9 && m.faceInSilhouette.feature === 'blush L', JSON.stringify(m.faceInSilhouette));
  // C1: the only kink is the breath handover at 14.0 s, 1.26× the envelope's range per s (limit 1.5×, plan 0.05× warns)
  assert.equal(m.c1.worst.channel, 'env.breath');
  assert.ok(m.c1.worst.perRange > 1.2 && m.c1.worst.perRange < THRESHOLDS.c1KinkCalibrated, JSON.stringify(m.c1.worst));
  assert.deepEqual(m.c1.kinks.map((k) => [k.channel, k.calibrated]), [['body.inflate.breath', true], ['env.breath', true]]);
  // everything outside the breath envelope is C1 to numerical precision, far under the plan's strict limit
  assert.ok(m.c1.strict.perRange < 1e-5, JSON.stringify(m.c1.strict));
  assert.ok(m.c1.checked > 200, `${m.c1.checked} break points checked`);
  // audio: the one cue time field (spin_up's until) sits on a cue; the frozen score is the absolute-layers one
  assert.deepEqual(m.audioTimes, { fields: 1, score: 'soundtrack-v2', layers: 'absolute' });
});

const FAULTS = {
  'structure:unsorted': (d) => { const k = d.channels['body.squash'].keys; [k[1], k[2]] = [k[2], k[1]]; },
  'structure:duplicate-spline-time': (d) => { const k = d.channels['cam.zoom'].keys; k.splice(2, 0, { ...k[2], v: 1.01 }); },
  'structure:ownership': (d) => { d.channels['face.eyeOpen'].windows.push({ by: 'INTRUDER', from: 1, to: 2 }); },
  'structure:nan': (d) => { d.channels['body.lean'].keys[1].v = 1e308; d.channels['body.lean'].keys[2].v = -1e308; d.channels['body.lean'].keys[2].f = 1e308; },
  'structure:forbidden': (d) => { d.channels['cam.roll'] = { type: 'const', value: 0.1, by: 'X' }; },
  'loop:closure': (d) => { d.channels['cam.y'].keys.at(-1).v = 990; },
  'loop:rest': (d) => { d.channels['env.rest'].expr = { clamp: [{ add: [{ sub: [1, { ss: [0.02, 0.1] }] }, { ss: [14.2, 14.5] }] }, 0, 1] }; },
  'loop:props': (d) => { d.props[0].items[2].dissolve = 14.8; d.props[0].params.afterDissolve = 0.6; },
  'camera:zoom': (d) => { d.channels['cam.zoom'].keys[3].v = 1.2; },
  'deform:stretch': (d) => { d.channels['body.squash'].keys[1].v = -0.4; },
  'text:safe-zone': (d) => { d.text.find((x) => x.id === 'end').opts.y = 1240; },
  'text:reading': (d) => { d.text.find((x) => x.id === 'end').opts.exitAt = 13.5; },
  'safety:breath': (d) => { d.anchors.exhale = d.anchors.crest + 0.5; },
  'craft:impact': (d) => { d.anchors.IMPACT = 1.2; },
  'audio:recipe': (d) => { d.cues.push({ t: 5, type: 'jump_scare', data: {}, by: 'M-ORBIT' }); },
  'audio:unemitted': (d) => { d.cues = d.cues.filter((c) => c.type !== 'wince'); },
  // FU-4: the plan rules WP-03 left out
  'safety:spin': (d) => { for (const k of d.channels['props.thoughts.phase'].keys) if (k.t >= 7) k.v += 3.85; },   // 1.43 turns/s
  'safety:spin-ramp': (d) => { d.channels['props.thoughts.phase'].keys.find((k) => k.t === 6.2).v = 1.6; },        // 0.41 turns/s, a 0.34 s ramp
  'safety:pulse': (d) => { d.channels['mallow.glowPulse'].period = 0.2; },                                           // swings in 0.1 s
  'deform:face': (d) => { d.mallow.faceSpec.mouth.y += 520; },
  'craft:c1': (d) => { Object.assign(d.channels['body.lean'].keys.find((k) => k.t === 2.2), { ease: 'outCubic', dur: 0.3 }); },
  'audio:absolute-time': (d) => { d.cues.find((c) => c.type === 'spin_up').data.until = 6.5; },
  'audio:absolute-layers': (d) => { d.meta.fingerprint = `sha256:${'0'.repeat(64)}`; },                              // the frozen score on another film
  'audio:score': (d) => { d.meta.score = 'mystery-score'; },
  'pose:exit': (d) => { const k = d.channels['face.eyeOpen'].keys; k.splice(k.findIndex((x) => x.by === 'TURN-SQUEEZE'), 1); },
  'pose:bridge': (d) => { d.provenance.bridges = [{ after: 'G-JOLT', before: 'M-ORBIT', at: 1, channels: [] }]; },
};

for (const [rule, mutate] of Object.entries(FAULTS)) {
  test(`seeded fault fails exactly its own rule: ${rule}`, () => {
    const d = base();
    mutate(d);
    const got = rules(d);
    assert.ok(got.includes(rule), `expected ${rule}, got ${JSON.stringify(gdir(d).errors.slice(0, 4))}`);
    // and only its own gate: every reported rule is in the fault's family (a jump also breaks the slope, a
    // zoom out of range also jumps the rate, a roll channel is also outside the catalogue)
    const family = rule.split(':')[0];
    assert.deepEqual(got.filter((r) => r.split(':')[0] !== family), [], `rules outside ${family} for ${rule}: ${got}`);
  });
}

test('dead intervals: a direction where nothing moves for seconds fails craft:dead', () => {
  const d = base();
  // freeze the body, face, camera and props between 3 and 6 s by stubbing their channels to constants
  for (const [name, def] of Object.entries(d.channels)) {
    if (/^(body|face|cam|props)\./.test(name) && (def.type === 'track' || def.type === 'spline')) {
      d.channels[name] = def.type === 'track' ? { ...def, keys: [] } : { ...def, keys: [{ t: 0, v: def.keys[0].v, by: def.keys[0].by }] };
      d.channels[name].windows = [];
    }
    if (/^(body|face)\./.test(name) && ['impulses', 'hops', 'blinks', 'shimmer'].includes(def.type)) d.channels[name] = { ...def, list: [] };
    if (def.type === 'noise' || def.type === 'sine' || def.type === 'envscale' || (def.type === 'ramp' && name !== 'face.mouthWavePhase')) d.channels[name] = { ...def, amp: 0, rate: def.rate === undefined ? undefined : 0 };
  }
  d.props = [];
  const r = gdir(d);
  assert.ok(r.errors.some((e) => e.rule === 'craft:dead'), JSON.stringify(r.errors.slice(0, 5)));
});

test('thresholds that differ from the plan are the calibrated ones, and documented as such', () => {
  assert.equal(THRESHOLDS.breathExhaleRatio, 1.25);
  assert.equal(THRESHOLDS.restFull, 0.15);
  assert.equal(THRESHOLDS.glassMinAlpha, 0.75);
  assert.equal(golden.direction.mallow.limits.stretchMax, 1.4);
  // FU-4: the plan's values (OWNER-DECISIONS Q5, FU-4 additions). C1's limit is the plan's strict one except at
  // the breath envelope's break points, calibrated on v2's breath handover; the spin ramp is one figure per
  // spinning thing (its per-change reading warns)
  assert.deepEqual([THRESHOLDS.spinMax, THRESHOLDS.spinMaxClose, THRESHOLDS.closeUpCover, THRESHOLDS.spinRamp], [1, 0.3, 0.25, 0.5]);
  assert.deepEqual([THRESHOLDS.spinRipple, THRESHOLDS.spinKink], [0.02, 0.25]);
  assert.equal(THRESHOLDS.pulseRamp, 0.15);
  assert.equal(THRESHOLDS.faceInside, 1);
  assert.deepEqual([THRESHOLDS.c1Kink, THRESHOLDS.c1KinkCalibrated, [...THRESHOLDS.c1CalibratedEnv]], [0.05, 1.5, ['breath']]);
});

test('poses: a declared pose the compiled channels do not hold is an error, wherever it sits in the chain', () => {
  // M-ORBIT claims to start asleep: its compiled eyes are open at L1
  let r = gdir(golden, { moves: registryWith({ ...MOVES['M-ORBIT'], entry: 'asleep' }) });
  assert.deepEqual([...new Set(r.errors.map((e) => e.rule))], ['pose:entry']);
  assert.match(r.errors[0].message, /^M-ORBIT enters 'asleep' at t=3 after acting\/aftermath-startled \(no bridge\), but face\.eyeOpen = 1\.0267 ∉ \[0, 0\.1\]/);
  // R-BREATH claims to leave the face 'content' (eyes open): its compiled eyes are shut and its smile is
  // just under content's; both channels are reported
  r = gdir(golden, { moves: registryWith({ ...MOVES['R-BREATH'], exit: 'content' }) });
  assert.deepEqual(r.errors.map((e) => e.rule), ['pose:exit']);
  assert.match(r.errors[0].message, /^R-BREATH exits 'content' at t=11\.45, but face\.eyeOpen = \S+ ∉ \[0\.8, 1\.2\], face\.mouthSmile = 0\.79\d\d ∉ \[0\.8, 1\.1\]$/);
  // the eyes alone: TURN-SQUEEZE claims to leave the face 'alert' (eyes open, any brows). Only the shut eyes
  // fail, on Noomi exactly as on an open-socket face: no eye-gate closure was recorded on the approved film
  for (const faceStyle of ['closed-tube', 'open-socket']) {
    const d = base();
    d.mallow.faceStyle = faceStyle;
    r = gdir(d, { moves: registryWith({ ...MOVES['TURN-SQUEEZE'], exit: 'alert' }) });
    assert.deepEqual(r.errors.map((e) => e.message), ["TURN-SQUEEZE exits 'alert' at t=7.4, but face.eyeOpen = 1.14e-7 ∉ [0.8, 1.3]"], faceStyle);
  }
  // and the next span's entry, with no gate either side of the ritual or the loop
  r = gdir(golden, { moves: registryWith({ ...MOVES['R-BREATH'], entry: 'alert' }) });
  assert.deepEqual(r.errors.map((e) => e.rule), ['pose:entry']);
  r = gdir(golden, { moves: registryWith({ ...MOVES['LP-RETURN'], entry: 'alert' }) });
  assert.match(r.errors.map((e) => e.message).join(), /^LP-RETURN enters 'alert' at t=14\.3 after close\/content-card \(no bridge\), but face\.eyeOpen = 0\.0259 ∉ \[0\.8, 1\.3\]$/);
  // a declared pose that is not in the table
  r = gdir(golden, { moves: registryWith({ ...MOVES['LP-RETURN'], exit: 'floating' }) });
  assert.deepEqual(r.errors.map((e) => e.rule), ['pose:unknown']);
  assert.ok(gdir(golden).metrics.poses.every((p) => p.ok), 'the v2 chain holds every pose');
});

test('poses: shut eyes meet an opening pose only where a recorded eye-gate closure holds them, and the record is checked', () => {
  // a gentle gag on Noomi: the gate closes G-JOLT's snap (0.3 × 1.32 < 0.5)
  const data = baseData();
  data.tuning = structuredClone(data.tuning);
  data.tuning['G-JOLT'].cells.noomi.ranges.intensity = [0.3, 1, 1];
  const gentle = composeNode({ spec: specWith((s) => { s.gag.intensity = 0.3; }), data });
  const poseErrs = (r) => r.errors.filter((e) => e.rule.startsWith('pose:'));
  let r = gdir(gentle);
  assert.deepEqual(r.errors, []);
  assert.equal(r.metrics.eyeGate, 1);
  // held by the closure until M-ORBIT keys the eyes at 3.42 s
  assert.deepEqual(r.metrics.poses.filter((p) => p.gate).map((p) => [p.move, p.which, p.gate.by]), [
    ['G-JOLT', 'exit', 'G-JOLT'], ['acting/aftermath-startled', 'entry', 'G-JOLT'], ['acting/aftermath-startled', 'exit', 'G-JOLT'], ['M-ORBIT', 'entry', 'G-JOLT']]);
  // the same shut eyes without the record fail every one of those poses
  const bare = structuredClone(gentle.direction);
  delete bare.provenance.eyeGate;
  assert.deepEqual(poseErrs(gdir(bare)).map((e) => `${e.rule} ${e.message.split(' ')[0]}`), ['pose:exit G-JOLT', 'pose:entry acting/aftermath-startled', 'pose:exit acting/aftermath-startled', 'pose:entry M-ORBIT']);
  // past the next eyeOpen key the gate no longer holds: R-BREATH declared to enter 'alert' fails as on the golden
  r = gdir(gentle, { moves: registryWith({ ...MOVES['R-BREATH'], entry: 'alert' }) });
  assert.deepEqual(r.errors.map((e) => e.rule), ['pose:entry']);
  // the record itself (pose:gate): only a closed-eye face has a gate ...
  const mut = (f) => { const d = structuredClone(gentle.direction); f(d); return poseErrs(gdir(d)); };
  assert.deepEqual(mut((d) => { d.mallow.faceStyle = 'open-socket'; }).map((e) => e.rule), ['pose:gate']);
  // ... the closure lies in its writer's window on face.eyeOpen, by a move of the direction ...
  assert.match(mut((d) => { d.provenance.eyeGate[0].t = 7.2; }).map((e) => e.message).join(), /eye-gate closure by G-JOLT at t=7\.2: outside G-JOLT's window on face\.eyeOpen/);
  assert.match(mut((d) => { d.provenance.eyeGate[0].by = 'G-NONE'; }).map((e) => e.message).join(), /G-NONE is not a move of this direction/);
  // ... it closed an opening, and the gate really closes it (intensity × opening under the gate)
  assert.match(mut((d) => { d.provenance.eyeGate[0].asked = 0.05; }).map((e) => e.message).join(), /asked 0\.05, which is not an opening/);
  assert.match(mut((d) => { d.provenance.eyeGate[0].k = 1; }).map((e) => e.message).join(), /intensity 1 × opening 1\.32 reaches the gate 0\.5, so the gate lets it open/);
});

test('spin in a close-up: past 25 % of the frame the orbit may turn 0.3 turns/s at most', () => {
  const d = base();
  Object.assign(d.props[0].params.ellipse, { rx: 540, ry: 420 });                                      // the orbit's disc fills a third of the frame
  const r = gdir(d);
  const close = r.errors.find((e) => e.rule === 'safety:spin' && /while its disc covers/.test(e.message));
  assert.ok(close, JSON.stringify(r.errors.slice(0, 4)));
  assert.match(close.message, /thoughts spins 0\.3\d\d turns\/s at t=6\.\d\d while its disc covers \d\d % of the frame \(close-up max 0\.3\)/);
});

test('C1: a declared kick is exempt; an eased key that starts on a slope is not', () => {
  const m = gdir(golden).metrics.c1;
  assert.ok(!m.kinks.some((k) => /kicks|hops|shimmer|ripples/.test(k.channel)), 'kick channels are never C1-checked');
  const d = base();
  Object.assign(d.channels['body.lean'].keys.find((k) => k.t === 2.2), { ease: 'inOutSine', dur: 0.3 });   // zero slope at both ends
  assert.deepEqual(gdir(d).errors, [], 'an inOutSine key is C1');
});

test('C1: the calibrated limit is the breath envelope\'s alone; the same handover on any other envelope is an error', () => {
  // v2's breath handover, a max of two ramps (1.26× range per s), copied onto the escalation's tremble envelope
  const d = base();
  d.channels['env.tremble'].expr = { mul: [{ max: [{ mul: [0.7, { ss: [3, 4.6] }] }, { ss: [4.2, 6.6] }] }, { sub: [1, { ss: [6.95, 7.3] }] }] };
  const r = gdir(d);
  const c1 = r.errors.filter((e) => e.rule === 'craft:c1');
  assert.ok(c1.length >= 1 && c1.every((e) => /^(env\.tremble|body\.\w+\.tremble): .*\(limit 0\.05× range per s\)$/.test(e.message)), JSON.stringify(r.errors));
  assert.ok(c1.some((e) => e.message.startsWith('env.tremble:')));
  const kink = r.metrics.c1.kinks.find((k) => k.channel === 'env.tremble');
  assert.ok(kink.perRange > 0.05 && kink.perRange < 1.5 && kink.calibrated === false, `under the old blanket limit it would only have warned: ${JSON.stringify(kink)}`);
  // nothing else fails, and the breath envelope keeps its calibrated warning
  assert.deepEqual(r.errors.filter((e) => e.rule !== 'craft:c1'), []);
  assert.ok(r.warnings.some((w) => w.rule === 'craft:c1-kink' && w.message.startsWith('env.breath:')));
});

test('absolute-time layers: the frozen score is accepted for the approved film only; generic-score directions pass', () => {
  const d = base();
  d.meta.score = 'hm-score';
  const r = gdir(d);
  assert.deepEqual(r.errors, []);
  assert.ok(!r.warnings.some((w) => w.rule === 'audio:absolute-layers'));
  assert.deepEqual(r.metrics.audioTimes, { fields: 1, score: 'hm-score', layers: 'cues' });
});
