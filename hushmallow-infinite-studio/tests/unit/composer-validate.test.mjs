// G-DIR (composer/validate.js): the golden passes, and each seeded fault fails
// exactly its own rule (PHASE2-PLAN "every gate has at least one seeded fault
// fixture, and each fixture must fail exactly its own gate").

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gdir, THRESHOLDS } from '../../composer/validate.js';
import { MOVES } from '../../composer/moves/index.js';
import { composeNode, registryWith } from '../parity/composer-fixtures.mjs';

const golden = composeNode();
const base = () => structuredClone(golden.direction);
const rules = (d) => [...new Set(gdir(d).errors.map((e) => e.rule))].sort();

test('the golden T01 direction passes G-DIR in well under 3 s (warnings are the calibrated provisional ones)', () => {
  const t0 = process.hrtime.bigint();
  const r = gdir(golden);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.deepEqual(r.errors, []);
  assert.equal(r.pass, true);
  assert.deepEqual(r.warnings.map((w) => w.rule).sort(), ['text:glass-rail', 'text:reading-clear']);
  assert.ok(ms < 3000, `${ms} ms`);
  assert.equal(r.metrics.subframes, 1991);
  assert.equal(r.metrics.samples, 2441);
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
});

test('poses: a direction whose span moves mismatch with no bridge recorded is flagged pose:mismatch', () => {
  const moves = registryWith({ ...MOVES['M-ORBIT'], entry: 'asleep' });     // aftermath exits alert; asleep does not follow it
  const r = gdir(golden, { moves });
  assert.ok(r.warnings.some((w) => w.rule === 'pose:mismatch' && /M-ORBIT enters asleep/.test(w.message)), JSON.stringify(r.warnings));
  assert.ok(!gdir(golden).warnings.some((w) => w.rule === 'pose:mismatch'), 'the v2 chain is clean');
});
