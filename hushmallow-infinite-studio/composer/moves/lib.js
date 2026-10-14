// Small helpers shared by move modules.

/**
 * Intensity scaling that is exact at full intensity: amount(k)(hi, lo) is hi
 * at k = 1 (bit for bit: hi − 0) and lo at k = 0. Moves are tuned at full
 * intensity on the reference performer, so k = 1 reproduces the tuned numbers.
 */
export const amount = (k) => (hi, lo) => hi - (hi - lo) * (1 - k);

/** owns map: every channel in `channels` owned on [from, to). */
export const zone = (channels, from, to) => Object.fromEntries(channels.map((c) => [c, [from, to]]));

/** Pan of a world x for cues (one definition, shared with the score: composer/audio.js). */
export { cuePan } from '../audio.js';
