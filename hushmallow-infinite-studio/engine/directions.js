// Direction registry and runtime selection.
//
// A render job names a direction by id. The id is only a lookup key: the
// runtime that renders it is chosen from the direction's meta.runtime, and the
// score from meta.score; nothing is ever routed by an id suffix (R3). Modules
// are loaded through constant import() thunks so the determinism guard can
// follow every one of them (a computed import is a finding, see CONVENTIONS §6).
//
// Entries: { src (module path relative to engine/, hashed into the job key),
//   load (constant import thunk of the same path), meta (fields the module
//   cannot carry itself: the frozen v2 module predates meta.runtime), dev (test
//   fixture, hidden from `hm render --list`) }.
//
// Composer output (direction.json, runtime 'v3') arrives with WP-03: it is data,
// fetched rather than imported, and rendered by engine/runtime/direction-runtime.js.

import { adaptV2 } from './runtime/adapter-v2.js';

export const DIRECTIONS = Object.freeze({
  'my-brain-at-2am-v2': {
    src: '../videos/my-brain-at-2am-v2.js',
    load: () => import('../videos/my-brain-at-2am-v2.js'),
    meta: { runtime: 'v2', score: 'soundtrack-v2' },
  },
  // test fixtures (engine/dev/fixtures): small, fast directions for the farm's own tests
  'dev/text-a': { src: './dev/fixtures/text-a.js', load: () => import('./dev/fixtures/text-a.js'), dev: true },
  'dev/text-b': { src: './dev/fixtures/text-b.js', load: () => import('./dev/fixtures/text-b.js'), dev: true },
  'dev/nan': { src: './dev/fixtures/nan.js', load: () => import('./dev/fixtures/nan.js'), dev: true },
  'dev/hang': { src: './dev/fixtures/hang.js', load: () => import('./dev/fixtures/hang.js'), dev: true },
  'dev/v3-probe': { src: './dev/fixtures/v3-probe.js', load: () => import('./dev/fixtures/v3-probe.js'), dev: true },
});

/** Runtimes by meta.runtime. Each turns (module namespace, meta) into a direction. */
export const RUNTIMES = Object.freeze({
  v2: adaptV2,
  v3: (mod, meta) => {
    throw new Error(`direction ${meta.id}: runtime 'v3' (composer direction.json) is not installed yet; engine/runtime/direction-runtime.js arrives with WP-03`);
  },
});

/** The effective meta of a registry entry: the module's own meta plus the entry's. Conflicts are errors. */
export function effectiveMeta(id, entry, own = {}) {
  for (const [k, v] of Object.entries(entry.meta || {})) {
    if (own[k] !== undefined && own[k] !== v) throw new Error(`direction ${id}: meta.${k} is ${JSON.stringify(own[k])} in the module but ${JSON.stringify(v)} in the registry`);
  }
  const meta = { ...own, ...entry.meta, id: own.id ?? id };
  if (!meta.runtime) throw new Error(`direction ${id}: no meta.runtime (declare it in the module, or in its registry entry)`);
  return meta;
}

/** Load a registered direction and wrap it in the runtime its meta names. */
export async function loadDirection(id) {
  const entry = Object.hasOwn(DIRECTIONS, id) ? DIRECTIONS[id] : null;
  if (!entry) throw new Error(`unknown direction "${id}" (registered: ${Object.keys(DIRECTIONS).join(', ')})`);
  const mod = await entry.load();
  const meta = effectiveMeta(id, entry, mod.default?.meta);
  const runtime = Object.hasOwn(RUNTIMES, meta.runtime) ? RUNTIMES[meta.runtime] : null;
  if (!runtime) throw new Error(`direction ${id}: unknown runtime "${meta.runtime}" (have: ${Object.keys(RUNTIMES).join(', ')})`);
  return runtime(mod, meta);
}
