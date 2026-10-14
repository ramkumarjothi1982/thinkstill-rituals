// Prop controllers by id. Each is pure and implements the prop controller
// interface (docs/ARCHITECTURE.md §6): create(prop, channel) → { count, at(i, t) }.
// WP-12 adds rise, lane, stack, fork and loom alongside orbit.

import { orbit } from './orbit.js';

export const CONTROLLERS = Object.freeze({ orbit });

/** The controller a prop names, or a hard error. */
export function controllerOf(prop) {
  const c = Object.hasOwn(CONTROLLERS, prop.controller) ? CONTROLLERS[prop.controller] : null;
  if (!c) throw new Error(`prop ${prop.id}: unknown controller "${prop.controller}" (have: ${Object.keys(CONTROLLERS).join(', ')})`);
  return c;
}
