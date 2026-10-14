import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { REFERENCE, REFERENCE_FINGERPRINT } from '../property/support.mjs';
import { fingerprint, visibleSlots, specId } from '../../planner/fingerprint.mjs';
import { canonical, hashOf } from '../../planner/canonical.mjs';

const clone = (o) => JSON.parse(JSON.stringify(o));

test('the fingerprint of the reference spec is a pinned known value', () => {
  assert.equal(fingerprint(REFERENCE), REFERENCE_FINGERPRINT);
  assert.equal(specId(REFERENCE), 'T01-noomi-late-night-15s-fdde38');
});

test('stable across processes and key order', () => {
  const reordered = Object.fromEntries(Object.entries(clone(REFERENCE)).reverse());
  reordered.copy = Object.fromEntries(Object.entries(reordered.copy).reverse());
  assert.equal(fingerprint(reordered), REFERENCE_FINGERPRINT);
  const code = `import { fingerprint } from ${JSON.stringify(new URL('../../planner/fingerprint.mjs', import.meta.url).href)};
    process.stdout.write(fingerprint(${JSON.stringify(REFERENCE)}));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, REFERENCE_FINGERPRINT);
});

test('invisible slots never change it; every visible slot and the seed do', () => {
  const invisible = [
    (s) => { s.gag.intensity = 0.5; }, (s) => { s.worldJitter = { hue: 3, warmth: 0, exposure: 0 }; }, (s) => { s.sound = { contour: 'rise-1' }; },
    (s) => { s.batch = 'other'; s.index = 7; }, (s) => { s.quality = 'draft'; }, (s) => { s.mode = 'review'; s.internal = true; }, (s) => { s.pins = { library: 'x' }; },
  ];
  for (const f of invisible) { const s = clone(REFERENCE); f(s); assert.equal(fingerprint(s), REFERENCE_FINGERPRINT, f.toString()); }
  const visible = [
    (s) => { s.template = 'T26-nostalgia'; }, (s) => { s.mallow = 'blubi'; }, (s) => { s.realm = 'x'; }, (s) => { s.tod = 'night'; }, (s) => { s.weather = 'mist'; },
    (s) => { s.dressing = [{ id: 'fireflies', variant: 1 }]; }, (s) => { s.duration = 12; }, (s) => { s.gag.id = 'G-SINK'; }, (s) => { s.metaphor = 'M-ECHO'; },
    (s) => { s.turn = 'TURN-STOP'; }, (s) => { s.ritual = 'R-CLOUDWRAP'; }, (s) => { s.loop = 'LP-OBJECT'; }, (s) => { s.camera = 'C-HOLD-WIDE'; },
    (s) => { s.copy.hook = ['LIGHTS OFF. BRAIN ON.']; }, (s) => { s.copy.lines[1] = 'Was that rude?'; }, (s) => { s.copy.end = { kind: 'closer', text: ['Your second brain', 'for feelings.'] }; },
    (s) => { s.copy.nameWord = 'unsure.'; }, (s) => { s.seed += 1; },
  ];
  const seen = new Set([REFERENCE_FINGERPRINT]);
  for (const f of visible) { const s = clone(REFERENCE); f(s); const fp = fingerprint(s); assert.ok(!seen.has(fp), f.toString()); seen.add(fp); }
});

test('dressing is a set: order does not matter', () => {
  const a = { ...clone(REFERENCE), dressing: [{ id: 'b', variant: 1 }, { id: 'a', variant: 2 }] };
  const b = { ...clone(REFERENCE), dressing: [{ id: 'a', variant: 2 }, { id: 'b', variant: 1 }] };
  assert.equal(fingerprint(a), fingerprint(b));
  assert.deepEqual(visibleSlots(a).dressing, ['a#2', 'b#1']);
});

test('canonical JSON sorts keys at every depth and rejects non-finite numbers', () => {
  assert.equal(canonical({ b: 1, a: { d: [3, { y: 1, x: 2 }], c: undefined } }), '{"a":{"d":[3,{"x":2,"y":1}]},"b":1}');
  assert.equal(hashOf({ a: 1, b: 2 }), hashOf({ b: 2, a: 1 }));
  assert.throws(() => canonical({ a: NaN }), /non-finite/);
});
