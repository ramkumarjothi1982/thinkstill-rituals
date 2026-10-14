// Runtime 'v2': renders a direction module written to the v2 contract, i.e.
// the approved videos/my-brain-at-2am-v2.js, on the engine.
//
// The v2 contract (docs/design/map-v2-code.md §3) is a default export
// { meta, setup(stage), state(t, stage, {center}), overlay?(ctx, t, stage),
//   subframes?(t, stage) } that runs as a module-level singleton.
//
// How the frozen module ends up on engine code: it imports '../stage2/*.js'.
// engine/index.html declares an import map that redirects exactly those URLs
// to the engine's own copies (softbody, face, type, motion, and stage.js for
// loadImage/silhouette), so the module runs on the engine's renderer, face,
// soft body and type with zero edits to the frozen file. The stage API it
// calls (renderer.setMallow, renderer.textTexture, cue) is the engine Stage.
//
// What the adapter adds:
//   - meta.runtime comes from the registry (engine/directions.js): the frozen
//     module predates the field, and the runtime is never inferred from an id (R3)
//   - dispose(): the module's singletons cannot be reset, so a v2 module is set
//     up at most once per page (Stage.init refuses a second time; the worker
//     reloads the page for every video, R4)
// The R18 guard on subframes() lives in Stage.subframesAt and covers every runtime.

const REQUIRED = ['setup', 'state'];

/** Wrap a v2-contract module namespace into the engine's direction interface. */
export function adaptV2(mod, meta) {
  const d = mod?.default;
  if (!d || typeof d !== 'object') throw new Error(`runtime v2: ${meta.id} has no default export`);
  for (const k of REQUIRED) if (typeof d[k] !== 'function') throw new Error(`runtime v2: ${meta.id} must export ${k}()`);
  for (const k of ['fps', 'duration']) if (!(meta[k] > 0)) throw new Error(`runtime v2: ${meta.id} meta.${k} must be > 0`);
  return {
    contract: 'v2',
    module: mod,
    meta,
    setup: (stage) => d.setup(stage),
    // the module's own functions, called exactly as stage2 called them
    state: d.state,
    overlay: typeof d.overlay === 'function' ? d.overlay : null,
    subframes: typeof d.subframes === 'function' ? d.subframes : null,
    dispose() { /* nothing to release on the module side; the stage frees the GL resources */ },
  };
}
