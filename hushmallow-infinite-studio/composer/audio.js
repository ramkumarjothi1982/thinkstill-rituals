// Picture ↔ sound constants: one source of truth for what the score reads
// from the picture (PHASE2-PLAN principle "one source of truth per constant").
//
// Pans. v2 normalises cue pans by 400 px and the per-frame curve pans by
// 420 px (audit R11). Both are kept here, named, so the approved cue log and
// curves stay byte-equal; WP-04 decides whether the score unifies them.

import { clamp } from '../engine/motion.js';

export const PAN = Object.freeze({ centre: 540, cueNorm: 400, cueMax: 0.8, curveNorm: 420 });

/** Cue pan of a world x: clamp((x − 540) / 400, −0.8, 0.8), as v2's cue log. */
export const cuePan = (x) => clamp((x - PAN.centre) / PAN.cueNorm, -PAN.cueMax, PAN.cueMax);
