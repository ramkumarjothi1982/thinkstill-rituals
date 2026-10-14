// Runtime v3 (engine/runtime/direction-runtime.js) in Node: importable without
// a page, the stage interface it exposes, and what it refuses before setup.
// Rendering itself is covered in the page by tests/parity/composer-v2-*.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDirectionRuntime, RUNTIME } from '../../engine/runtime/direction-runtime.js';
import { FRAME } from '../../composer/compose.js';
import { composeNode, goldenSpec } from '../parity/composer-fixtures.mjs';

test('runtime v3 exposes the stage interface every runtime has, with no module-level state', () => {
  const { direction } = composeNode();
  const a = createDirectionRuntime({ direction }), b = createDirectionRuntime({ direction });
  assert.equal(RUNTIME, 'v3');
  for (const k of ['setup', 'state', 'overlay', 'subframes', 'probes', 'dispose']) assert.equal(typeof a[k], 'function', k);
  assert.equal(a.contract, 'v3');
  assert.deepEqual([a.meta.fps, a.meta.duration, a.meta.shutter, a.meta.runtime, a.meta.score], [30, 15, 0.4, 'v3', 'soundtrack-v2']);
  assert.equal(a.module, undefined, 'no singleton module: Stage.init never refuses a second v3 direction (R4)');
  assert.notEqual(a.meta, b.meta);
  assert.deepEqual(a.probes().map((p) => p.label), ['cover', 'gag', 'impact', 'peak', 'ritual-mid', 'eyes-open', 'end-card', 'rest-end']);
});

test('a spec input composes at setup (in the page); its meta comes from the frame model until then', () => {
  const rt = createDirectionRuntime({ spec: goldenSpec() });
  assert.equal(rt.direction, null);
  assert.deepEqual([rt.meta.fps, rt.meta.duration, rt.meta.shutter, rt.meta.subframes], [FRAME.fps, 15, FRAME.shutter, FRAME.subframes]);
});

test('it refuses what it cannot render faithfully', () => {
  assert.throws(() => createDirectionRuntime({}), /direction.*spec/);
  const { direction } = composeNode();
  assert.throws(() => createDirectionRuntime({ direction: { ...direction, schema: 'hm-direction/2' } }), /hm-direction\/3/);
});
