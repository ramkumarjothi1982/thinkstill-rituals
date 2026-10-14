// Recipe registry: every cue recipe the score can play, by id.
//
// A cue's recipe is named by the move that emits the cue (composer/moves:
// cues: {type: {recipe}}); the score only looks it up here. A missing recipe
// is a hard failure, never a silent skip (R10). Recipes are static imports, so
// the registry is the whole catalogue the banned-recipe lint checks
// (audio/lint-recipes.mjs).

import { RECIPES_V2 } from './v2.mjs';

/** The composer's own cue: 'scene' carries the loop length (no sound). */
const COMPOSER = [
  {
    id: 'composer/scene', cue: 'scene', role: 'anchor', layers: ['breath'], tags: ['loop'],
    silent: 'carries the loop length; the sleeping breath and the circular render follow it',
    doc: 'the scene (loop length)',
    emit() {},
  },
];

function registry(list) {
  const out = {};
  for (const r of list) {
    if (Object.hasOwn(out, r.id)) throw new Error(`recipes: duplicate id ${r.id}`);
    out[r.id] = Object.freeze(r);
  }
  return Object.freeze(out);
}

export const RECIPES = registry([...COMPOSER, ...RECIPES_V2]);

/** The recipe for an id, or a hard failure naming who asked for it. */
export function recipeOf(id, { registry: reg = RECIPES, by = null } = {}) {
  if (!Object.hasOwn(reg, id)) {
    throw new Error(`score: no recipe '${id}'${by ? ` (asked for by ${by})` : ''}; recipes: ${Object.keys(reg).join(', ')}`);
  }
  return reg[id];
}
