// engine/directions.js and the routing rules (R3): the runtime comes from
// meta.runtime and the score from meta.score, never from an id suffix; every
// direction module is loaded through a constant import() the guard can follow.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO } from '../../render/lib/paths.mjs';
import { DIRECTIONS, RUNTIMES, effectiveMeta } from '../../engine/directions.js';
import { adaptV2 } from '../../engine/runtime/adapter-v2.js';
import { SCORES, scoreJob } from '../../render/mux.mjs';

test('every registry entry: src exists, and its import thunk names exactly that path', () => {
  for (const [id, e] of Object.entries(DIRECTIONS)) {
    assert.ok(fs.existsSync(path.resolve(STUDIO, 'engine', e.src)), `${id}: ${e.src}`);
    // modules are imported, compiled composer directions (JSON) fetched, both with a constant path
    const call = e.src.endsWith('.json') ? `loadDirectionJson('${e.src}')` : `import('${e.src}')`;
    assert.ok(e.load.toString().includes(call), `${id}: load() must be ${call} with a constant specifier`);
  }
  assert.equal(DIRECTIONS['my-brain-at-2am-v2'].src, '../videos/my-brain-at-2am-v2.js', 'the frozen module, used as is');
});

test('meta: the registry supplies what a module cannot carry; conflicts and a missing runtime are errors', () => {
  const frozen = DIRECTIONS['my-brain-at-2am-v2'];
  const m = effectiveMeta('my-brain-at-2am-v2', frozen, { id: 'my-brain-at-2am-v2', fps: 30, duration: 15 });
  assert.equal(m.runtime, 'v2');
  assert.equal(m.score, 'soundtrack-v2');
  assert.throws(() => effectiveMeta('x', frozen, { runtime: 'v3' }), /meta.runtime is "v3" in the module but "v2" in the registry/);
  assert.throws(() => effectiveMeta('x', {}, { fps: 30 }), /no meta.runtime/);
  assert.equal(effectiveMeta('anything-v2', {}, { runtime: 'v3' }).runtime, 'v3', 'an id ending in -v2 does not make it runtime v2');
  assert.equal(effectiveMeta('plain-id', {}, { runtime: 'v2' }).runtime, 'v2', 'and an id without the suffix can be v2');
});

test('runtimes: v2 wraps a v2-contract module; v3 renders a composer direction (WP-03)', () => {
  assert.deepEqual(Object.keys(RUNTIMES), ['v2', 'v3']);
  const mod = { default: { meta: {}, setup() {}, state() { return 1; } } };
  const d = adaptV2(mod, { id: 't', fps: 30, duration: 1, runtime: 'v2' });
  assert.equal(d.contract, 'v2');
  assert.equal(d.state, mod.default.state, 'the module\'s own state(), called as stage2 called it');
  assert.equal(d.overlay, null);
  assert.equal(d.subframes, null);
  assert.throws(() => adaptV2({ default: { setup() {} } }, { id: 't', fps: 30, duration: 1 }), /must export state/);
  assert.throws(() => adaptV2({ default: { setup() {}, state() {} } }, { id: 't', fps: 0, duration: 1 }), /meta.fps/);
  assert.throws(() => RUNTIMES.v3({}, { id: 'x' }), /runtime 'v3' renders a composer direction\.json; this module carries none/);
});

test('the score is chosen from meta.score, not from the direction id', async () => {
  assert.deepEqual(Object.keys(SCORES), ['soundtrack-v2']);
  await assert.rejects(scoreJob('/nonexistent', { direction: 'my-brain-at-2am-v2', info: { score: 'other' } }), /names score "other", which has no renderer/);
});

test('no suffix routing anywhere in the engine or the farm (R3)', () => {
  const files = [
    ...['farm', 'worker', 'segment', 'encode', 'mux', 'serve'].map((f) => `render/${f}.mjs`),
    ...fs.readdirSync(path.join(STUDIO, 'engine'), { recursive: true }).filter((f) => /\.(m?js|html)$/.test(f)).map((f) => `engine/${f}`),
  ];
  for (const f of files) {
    const src = fs.readFileSync(path.join(STUDIO, f), 'utf8');
    assert.ok(!/endsWith\(\s*['"`]-v2/.test(src) && !/-v2\$\//.test(src), `${f} routes by an id suffix`);
  }
});
