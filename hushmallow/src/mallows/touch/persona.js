// How each Mallow feels to touch: its material and its reactions. Only the
// existing expression params, REACTIONS and particle styles are used, so
// every response stays inside each character's approved personality.
//
//   material  kG / kL (global / local stiffness → wobble frequency), beta (how
//             far it squashes and stretches as a whole), damp (velocity kept
//             per 1/60 s → how long it wobbles), dMax (deepest squeeze),
//             maxStretch (a pull slips past this, in body heights)
//   face(goal, T, rig)   every frame while touched or soothed (T = rig.touch)
//   on*(mt, info)        gesture moments; return true to replace the default

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const mat = (kG, kL, beta, damp, dMax, maxStretch) => Object.freeze({ kG, kL, beta, damp, dMax, maxStretch });

export const TOUCH_PERSONA = {
  // dense and resistant; its static rises with pressure and quiets when slowed
  glitzi: {
    material: mat(0.32, 0.7, 0.15, 0.9, 0.26, 0.3),
    face(goal, T, rig) {
      const d = T.depth || 0;
      if (d > 0.01) goal.glitch = lerp(goal.glitch, 0.6 + 1.4 * d, ss(0.02, 0.3, d));
      // intentional slowing: slow strokes and massage bring the static down
      if (T.calm > 0.01) goal.glitch = lerp(goal.glitch, 0.08, clamp(T.calm * 1.25, 0, 1));
      if (T.jiggle > 0.01) goal.glitch = Math.max(goal.glitch, lerp(goal.glitch, 2, T.jiggle));
      // fast fingers slice the picture (a burst every few frames, never strobing)
      const b = rig.body;
      if (!rig.opts.reducedMotion && T.speed > 700 && b.glitchBurst <= 0 && rig.time - (rig._touchBurstT || 0) > 0.4) {
        rig._touchBurstT = rig.time;
        b.glitchBurst = clamp(T.speed / 3000, 0.15, 0.5);
        b.burstRows = [[Math.random(), Math.random() * 2 - 1], [Math.random(), Math.random() * 2 - 1], [Math.random(), Math.random() * 2 - 1]];
      }
    },
    onRelease(mt, { depth }) {
      if (depth > 0.4) { mt.rig.react('glitchBurst'); return true; }
      return false;
    },
  },

  // spirals follow the finger: massage turns them, a twist counter-rotates them
  zuzu: {
    material: mat(0.22, 0.6, 0.3, 0.95, 0.32, 0.4),
    face(goal, T) {
      if (T.massageRate) goal.spin = clamp(T.massageRate * 0.55, -6, 6);
      if (Math.abs(T.twistRate || 0) > 0.2) goal.spin = clamp(-T.twistRate * 1.2, -6, 6);
      if (T.jiggle > 0.01) { goal.spinJitter = Math.max(goal.spinJitter, T.jiggle); goal.fxQuestion = Math.max(goal.fxQuestion, 0.5 * T.jiggle); }
      if (T.calm > 0.01 && !T.massageRate) goal.spin = lerp(goal.spin, 0.1, T.calm);
    },
    onJiggle(mt) { mt.rig.particles?.burst?.({ kind: 'question', n: 1 }); return false; },
  },

  // the softest and wobbliest; beautifully dramatic
  blubi: {
    material: mat(0.16, 0.5, 0.35, 0.965, 0.38, 0.45),
    face(goal, T) {
      if ((T.stretch || 1) > 1.35) { const w = ss(1.35, 1.55, T.stretch); goal.wet = Math.max(goal.wet, w); goal.mouthTremble = Math.max(goal.mouthTremble, 0.6 * w); }
    },
    onStroke(mt, { strokes }) {
      if (strokes === 3) {
        mt.rig.overlay({ tears: 0.4, closedCurve: -1, eyeOpen: 0, mouthSmile: 1, mouthOpen: 0.4, blush: 2.3 }, { dur: 2.2, fx: [{ kind: 'drop', n: 8 }, { kind: 'ring', n: 2 }], sound: 'comfort' });
      }
      return false;
    },
    onSlip(mt) { mt.rig.react('flick'); return true; },
  },

  // the more you squeeze, the higher the bounce
  boppo: {
    material: mat(0.28, 0.55, 0.3, 0.94, 0.36, 0.4),
    onRelease(mt, { depth }) {
      if (depth < 0.25) return false;
      const rig = mt.rig, b = rig.body;
      rig.react('release');
      if (b.grounded && !rig.opts.reducedMotion) {
        b.hopV = Math.sqrt(2 * 9.8 * 1.2 * depth * 0.14); b.grounded = false;
      }
      rig.particles?.burst?.({ kind: 'pop', n: Math.round(4 + 10 * depth) });
      return true;
    },
    onJiggle(mt) {
      mt.rig.overlay({ bounce: 0.5, bounceRate: 2.4, mouthOpen: 0.9, mouthSmile: 1, eyeOpen: 0, closedCurve: -1, blush: 2 }, { dur: 1.2, sound: 'tap' });
      return true;
    },
  },

  // squeezing charges sparks; letting go spends them
  pipzi: {
    material: mat(0.26, 0.6, 0.3, 0.95, 0.34, 0.42),
    face(goal, T) {
      if (T.depth > 0.01) goal.fxSpark = Math.max(goal.fxSpark, T.depth);
      if ((T.stretch || 1) > 1.12) { const w = ss(1.12, 1.4, T.stretch); goal.mouthWidth = lerp(goal.mouthWidth, 1.4, w); goal.mouthOpen = lerp(goal.mouthOpen, 1.1, w); goal.mouthRound = lerp(goal.mouthRound, 0, w); }
    },
    onRelease(mt, { depth }) {
      if (depth < 0.2) return false;
      mt.rig.react('release');
      mt.rig.particles?.burst?.({ kind: 'spark', n: Math.round(6 + 24 * depth) });
      return true;
    },
  },

  // heavy, slow, unbothered: flicks only lean it, massage floats it
  loomi: {
    material: mat(0.2, 0.55, 0.25, 0.9, 0.3, 0.38),
    flickScale: 0.5,
    face(goal, T) {
      if (T.calm > 0.01) goal.float = lerp(goal.float, 0.8, T.calm);
    },
    onMassage(mt) { mt.rig.particles?.burst?.({ kind: 'ring', n: 1 }); return false; },
  },

  // pillowy; a long hold lulls it to sleep
  noomi: {
    material: mat(0.14, 0.45, 0.4, 0.92, 0.4, 0.4),
    face(goal, T, rig) {
      const held = T.held || 0;
      if (held > 2.5) {
        const w = ss(2.5, 4.5, held);
        goal.eyeOpen = lerp(goal.eyeOpen, 0, w);
        goal.closedCurve = lerp(goal.closedCurve, 1, w);
        goal.breathRate = lerp(goal.breathRate, 0.1, w);
        goal.fxZzz = Math.max(goal.fxZzz, 0.6 * w);
        if (!rig._lulled) { rig._lulled = true; rig.cycles.yawnT = rig.time; rig.opts.audio?.play?.(rig.id, 'yawn'); }
      } else rig._lulled = false;
    },
    onMassage(mt) { mt.rig.particles?.burst?.({ kind: 'moon', n: 3 }); return false; },
  },
};

export const MALLOW_TOUCH_IDS = Object.keys(TOUCH_PERSONA);

export function personaFor(id) { return TOUCH_PERSONA[id] || { material: mat(0.24, 0.58, 0.3, 0.94, 0.34, 0.4) }; }
