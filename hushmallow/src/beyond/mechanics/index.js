// The ten Another Angle mechanics, one per reasoning pattern (vocab.js).
//
// The shared mechanic contract:
//   mount(ctx) → { id, frame(dt, t) → bool, pointer(e) → bool, hitTest(x, y),
//                  assist(), avoid() → rects, done: Promise<{moves, ms, …}>,
//                  settled (getter), destroy() }
//   ctx: { g (2D context, CSS px), area() → {x, y, w, h}, from: {x, y, r},
//          scene, parts: {excerpt, fact, guess, harsh, steps}, lines (lines.js mechanicLines: the
//          scene's own, a feeling's over the mechanic's), text, emotion,
//          tags (kit.makeTags), reducedMotion(), lowStim(), hint(line),
//          choose(prompt, options) → Promise<value>, haptic(kind), fx(name, opts),
//          progress(0..1), kick() }
// Every mechanic: real touch (drag, hold, pinch, stroke, draw), a tap
// alternative on the objects themselves, and assist() for the dock's pill and
// keyboard / switch users. Nothing completes by itself.

export const MECHANIC_MODULES = Object.freeze({
  pull_apart: () => import('./pull-apart.js'),
  shrink_projection: () => import('./shrink-projection.js'),
  return_responsibility: () => import('./return-responsibility.js'),
  reveal_spectrum: () => import('./reveal-spectrum.js'),
  open_interpretations: () => import('./open-interpretations.js'),
  separate_one: () => import('./separate-one.js'),
  let_loop_drift: () => import('./let-loop.js'),
  assemble_step: () => import('./assemble-step.js'),
  soften_harshness: () => import('./soften-harsh.js'),
  find_boundary: () => import('./find-boundary.js'),
});

const loaded = new Map();
/** The mechanic module for an interaction_type (loads once). */
export function loadMechanic(id) {
  const load = MECHANIC_MODULES[id];
  if (!load) return Promise.reject(new Error(`No mechanic ${id}`));
  if (!loaded.has(id)) loaded.set(id, load().catch((e) => { loaded.delete(id); throw e; }));
  return loaded.get(id);
}
export function prefetchMechanic(id) { loadMechanic(id).catch(() => {}); }
