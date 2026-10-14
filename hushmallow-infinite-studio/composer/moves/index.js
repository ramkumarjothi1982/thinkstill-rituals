// Move registry. Static imports (constant specifiers) so the determinism
// guard follows every move; a spec naming a move that is not here cannot be
// composed (compose() fails with rule 'move:unbuilt', never falls back).
//
// The move contract is documented in docs/ARCHITECTURE.md §3.

import idleBreath from './acting/idle-breath.js';
import aftermathStartled from './acting/aftermath-startled.js';
import bridge from './acting/bridge.js';
import gJolt from './gags/G-JOLT.js';
import mOrbit from './metaphors/M-ORBIT.js';
import turnSqueeze from './turns/TURN-SQUEEZE.js';
import rBreath from './rituals/R-BREATH.js';
import contentCard from './close/content-card.js';
import lpReturn from './loops/LP-RETURN.js';
import cDriftIn from './cameras/C-DRIFT-IN.js';
import aColdDipWarm from './arcs/A-COLD-DIP-WARM.js';

export const MOVES = Object.freeze(Object.fromEntries(
  [idleBreath, aftermathStartled, bridge, gJolt, mOrbit, turnSqueeze, rBreath, contentCard, lpReturn, cDriftIn, aColdDipWarm].map((m) => [m.id, m]),
));

/** Moves whose cells live in the tuning matrix (everything but the composer's own bridge). */
export const TUNABLE = Object.freeze(Object.keys(MOVES).filter((id) => id !== 'acting/bridge'));

/** The move module for an id, or a CompileError-shaped failure. registry defaults to MOVES. */
export function moveOf(id, registry = MOVES) {
  if (!Object.hasOwn(registry, id)) {
    const e = new Error(`move:unbuilt: "${id}" has no module in composer/moves (built: ${Object.keys(registry).join(', ')})`);
    e.rule = 'move:unbuilt';
    throw e;
  }
  return registry[id];
}

/**
 * Slot order (PHASE2-PLAN composer stage 3): cover-idle, gag, aftermath,
 * metaphor, turn, ritual, close, loop, camera, arc. Weather and dressing
 * moves join at the end when realms offer them (WP-14+).
 */
export function movesForSpec(spec, registry = MOVES) {
  const gag = moveOf(spec.gag.id, registry);
  const seq = [
    ['cover-idle', 'acting/idle-breath'],
    ['gag', spec.gag.id],
    ['aftermath', gag.next?.aftermath ?? null],
    ['metaphor', spec.metaphor],
    ['turn', spec.turn],
    ['ritual', spec.ritual],
    ['close', 'close/content-card'],
    ['loop', spec.loop],
    ['camera', spec.camera],
    ['arc', spec.arc],
  ].filter(([, id]) => id);
  return seq.map(([slot, id], rank) => ({ slot, id, rank: rank + 1, move: moveOf(id, registry) }));
}
