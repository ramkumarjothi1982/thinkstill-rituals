// Character-specific one-shot reactions.  Each reaction is a short facial
// overlay (attack / hold / release), body impulses, a particle burst in the
// Mallow's signature style, a sound from its sound identity and optional
// haptics.  The same gesture deliberately reads differently on each Mallow.
//
// impulse: squash (jelly squish), hop (jump height, body heights), lean,
//          shear (wobble), tilt, spin (full pirouette), glitch (slice burst)

const H = { light: 10, soft: [8, 30, 8], pop: [14], buzz: [6, 20, 6, 20, 6] };

export const REACTIONS = {
  _shared: {
    squeezeFace: { eyeOpen: 0, closedCurve: -1, mouthRound: 0.55, mouthOpen: 0.35, mouthSmile: 0.3, blush: 2, browY: 0.3 },
    tap: { dur: 0.6, params: { closedCurve: -1, eyeOpen: 0.4, mouthSmile: 1 }, impulse: { squash: 0.2 }, sound: 'tap', haptic: H.light },
    doubleTap: { dur: 1, params: { eyeOpen: 1.3, eyeScale: 1.15, mouthRound: 1, mouthOpen: 0.9 }, impulse: { hop: 0.8 }, sound: 'surprise', haptic: H.pop },
    flick: { dur: 1, params: { browTilt: -0.7, browAlpha: 1, mouthPout: 0.8, lidTop: 0.3 }, impulse: { shear: 0.7 }, sound: 'offended', haptic: H.light },
    release: { dur: 0.7, params: { closedCurve: -1, eyeOpen: 0.3, mouthSmile: 1, mouthOpen: 0.35 }, impulse: { squash: -0.3 }, sound: 'release', haptic: H.soft },
    idle: { dur: 1.2, params: { lookX: 0.5 }, impulse: { shear: 0.15 } },
    celebrate: { dur: 2, params: { eyeOpen: 1.1, sparkle: 2, mouthSmile: 1, mouthOpen: 1, blush: 2 }, impulse: { hop: 1.1 }, sound: 'celebrate', haptic: [10, 40, 10, 40, 20] },
    comfort: { dur: 1.6, params: { closedCurve: -0.6, eyeOpen: 0.2, mouthSmile: 0.8, blush: 1.8 }, impulse: { squash: 0.15 }, fx: { kind: 'heart', n: 3 }, sound: 'comfort' },
    nod: { dur: 0.7, params: { lookY: 0.4, closedCurve: -0.5 }, impulse: { squash: 0.25, tilt: 0.05 }, sound: 'tap' },
    gasp: { dur: 0.8, params: { eyeOpen: 1.3, mouthRound: 1, mouthOpen: 0.7, browY: 0.9 }, impulse: { squash: -0.3 }, fx: { kind: 'exclaim', n: 1 }, sound: 'surprise' },
    shiver: { dur: 0.9, params: { tremble: 1, mouthWave: 0.8 }, impulse: { shear: 0.4 } },
    sigh: { dur: 1.4, params: { eyeOpen: 0.1, mouthRound: 0.5, mouthOpen: 0.3 }, impulse: { squash: 0.35 }, fx: { kind: 'puff', n: 3 }, sound: 'sigh' },
    hop: { dur: 0.6, params: { mouthOpen: 0.6 }, impulse: { hop: 0.6 }, sound: 'hop' },
    yawn: { dur: 2.2, params: { mouthRound: 1, mouthOpen: 1.15, eyeOpen: 0, browY: 0.5 }, impulse: { squash: -0.25 }, sound: 'yawn' },
    success: { dur: 0.7, params: { sparkle: 1.8, mouthSmile: 1, mouthOpen: 0.5, closedCurve: -1 }, impulse: { squash: 0.25, hop: 0.25 }, sound: 'success', haptic: H.light },
  },

  glitzi: {
    squeezeFace: { lidTop: 0.6, lidSlant: 0.5, mouthSmile: -0.5, mouthWave: 0.7, glitch: 1.8, browAlpha: 1, browTilt: -0.6, lookX: 0 },
    tap: { dur: 0.75, params: { glitch: 1.9, lidTop: 0.15, lookX: -0.5, lookY: -0.6, mouthSkew: 0.6, mouthSmile: -0.2 },
      impulse: { squash: 0.15, glitch: 0.35 }, fx: { kind: 'shard', n: 6 }, sound: 'tap', haptic: H.buzz },
    doubleTap: { dur: 1.3, params: { glitch: 2, lidTop: 0, eyeOpen: 1.25, lookX: 0, lookY: 0, mouthRound: 0.8, mouthOpen: 0.6 },
      impulse: { glitch: 0.6, hop: 0.6 }, fx: [{ kind: 'shard', n: 16 }, { kind: 'pixelHeart', n: 1 }], sound: 'surprise', haptic: H.buzz },
    flick: { dur: 1.2, params: { lidTop: 0.55, lidSlant: 1, browAlpha: 1, browTilt: -1, browY: -0.5, mouthSmile: -0.9, glitch: 2, lookX: 0 },
      impulse: { shear: 0.8, glitch: 0.5 }, fx: { kind: 'shard', n: 8 }, sound: 'offended', haptic: H.buzz },
    release: { dur: 0.8, params: { lidTop: 0.2, mouthSkew: 0.7, mouthSmile: 0.4, glitch: 1.2 }, impulse: { squash: -0.3 }, sound: 'release' },
    idle: { dur: 1.3, params: { lookX: -0.7, lookY: -0.7, lidTop: 0.25, glitch: 1.4 }, impulse: { glitch: 0.3 }, fx: { kind: 'shard', n: 2 } },
    glitchBurst: { dur: 0.7, params: { glitch: 2, eyeOpen: 1.2, lidTop: 0, lookX: 0 }, impulse: { glitch: 0.8, squash: 0.25 }, fx: { kind: 'shard', n: 14 }, sound: 'surprise', haptic: H.buzz },
    celebrate: { dur: 2.2, params: { glitch: 1.3, lidTop: 0.1, lookX: 0, mouthSmile: 0.8, mouthSkew: 0.5, mouthOpen: 0.4, heartEyes: 0.6 },
      impulse: { hop: 0.9, glitch: 0.4 }, fx: [{ kind: 'shard', n: 14 }, { kind: 'pixelHeart', n: 3 }], sound: 'celebrate', haptic: H.buzz },
  },

  blubi: {
    squeezeFace: { eyeOpen: 0, closedCurve: -1, mouthSmile: 0.8, mouthRound: 0.4, mouthOpen: 0.3, blush: 2.4 },
    tap: { dur: 0.9, params: { blush: 2.3, closedCurve: -1, mouthSmile: 1, mouthOpen: 0.35 },
      impulse: { squash: 0.3, shear: 0.25 }, fx: { kind: 'drop', n: 4 }, sound: 'tap', haptic: H.soft },
    doubleTap: { dur: 1.3, params: { eyeOpen: 1.2, mouthRound: 0.9, mouthOpen: 0.8, blush: 2.3 },
      impulse: { hop: 0.9 }, fx: [{ kind: 'drop', n: 10 }, { kind: 'ring', n: 2 }], sound: 'splash', haptic: H.pop },
    flick: { dur: 1.4, params: { eyeOpen: 0.7, wet: 1, mouthSmile: -0.7, mouthTremble: 0.8, browTilt: 0.9, browAlpha: 1, mouthPout: 0.6 },
      impulse: { shear: 0.9 }, fx: { kind: 'drop', n: 2 }, sound: 'offended', haptic: H.light },
    idle: { dur: 1.2, params: { blush: 1.8, closedCurve: -0.4 }, impulse: { shear: 0.35, squash: 0.15 } },
    celebrate: { dur: 2.2, params: { closedCurve: -1, mouthSmile: 1, mouthOpen: 0.7, blush: 2.4, tears: 0.4 },
      impulse: { hop: 0.8 }, fx: [{ kind: 'drop', n: 12 }, { kind: 'ring', n: 3 }], sound: 'celebrate', haptic: H.soft },
  },

  zuzu: {
    squeezeFace: { lidTop: 0.5, lidBot: 0.4, mouthRound: 0.7, mouthOpen: 0.5, spin: 3, spiralHue: 1 },
    tap: { dur: 0.9, params: { spin: 4, spiralHue: 1, mouthRound: 0.6, mouthOpen: 0.6 },
      impulse: { squash: 0.15, tilt: 0.1 }, fx: { kind: 'ring', n: 2 }, sound: 'tap', haptic: H.light },
    doubleTap: { dur: 1.4, params: { spin: 6, spiralHue: 1, mouthOpen: 1, mouthSmile: 1 },
      impulse: { spin: 1, hop: 0.5 }, fx: [{ kind: 'ring', n: 4 }, { kind: 'star', n: 6 }], sound: 'surprise', haptic: H.pop },
    flick: { dur: 1.4, params: { spin: 5, spinJitter: 1, mouthWave: 1, mouthSmile: -0.2, tiltBias: -12 },
      impulse: { shear: 0.8, tilt: 0.3 }, fx: { kind: 'question', n: 1 }, sound: 'offended' },
    idle: { dur: 1.5, params: { spin: 1.6, tiltBias: 10, spiralHue: 0.5 }, impulse: { tilt: 0.08 } },
    celebrate: { dur: 2.2, params: { spin: 5, spiralHue: 1, mouthOpen: 1, mouthSmile: 1 },
      impulse: { spin: 1, hop: 0.8 }, fx: [{ kind: 'ring', n: 5 }, { kind: 'star', n: 10 }], sound: 'celebrate', haptic: H.pop },
  },

  boppo: {
    squeezeFace: { eyeOpen: 0, closedCurve: -1, mouthSmile: 1, mouthOpen: 0.6, blush: 2.2 },
    tap: { dur: 0.7, params: { eyeScale: 1.2, mouthOpen: 1, sparkle: 2 },
      impulse: { hop: 0.65 }, fx: { kind: 'pop', n: 6 }, sound: 'tap', haptic: H.pop },
    doubleTap: { dur: 1.2, params: { eyeScale: 1.25, mouthOpen: 1.1, sparkle: 2, blush: 2 },
      impulse: { hop: 1.6 }, fx: [{ kind: 'pop', n: 16 }, { kind: 'star', n: 6 }], sound: 'surprise', haptic: [12, 30, 12] },
    flick: { dur: 1.1, params: { eyeScale: 1.2, mouthRound: 1, mouthOpen: 0.8, browY: 0.9 },
      impulse: { shear: 1, hop: 0.3 }, fx: { kind: 'pop', n: 3 }, sound: 'offended' },
    idle: { dur: 0.8, params: { mouthOpen: 0.7 }, impulse: { hop: 0.35 } },
    celebrate: { dur: 2.2, params: { eyeScale: 1.2, sparkle: 2, mouthOpen: 1.1, blush: 2 },
      impulse: { hop: 1.4 }, fx: [{ kind: 'pop', n: 18 }, { kind: 'star', n: 8 }], sound: 'celebrate', haptic: [12, 30, 12, 30, 12] },
  },

  pipzi: {
    squeezeFace: { eyeOpen: 0, closedCurve: -1, mouthOpen: 0.8, mouthSmile: 1, blush: 2.4, sparkle: 2 },
    tap: { dur: 0.7, params: { eyeScale: 1.15, mouthOpen: 1.15, blush: 2, sparkle: 2 },
      impulse: { hop: 0.45, squash: 0.15 }, fx: { kind: 'spark', n: 10 }, sound: 'tap', haptic: H.pop },
    doubleTap: { dur: 1.3, params: { eyeScale: 1.25, eyeOpen: 1.3, mouthOpen: 1.2, sparkle: 2 },
      impulse: { hop: 1.1 }, fx: [{ kind: 'spark', n: 24 }, { kind: 'ribbon', n: 4 }], sound: 'surprise', haptic: [10, 25, 10, 25, 10] },
    flick: { dur: 1.1, params: { mouthRound: 1, mouthOpen: 0.9, browY: 1, eyeScale: 1.2, mouthPout: 0.3 },
      impulse: { shear: 0.9 }, fx: { kind: 'exclaim', n: 1 }, sound: 'offended' },
    idle: { dur: 0.9, params: { sparkle: 2, mouthOpen: 1.1, eyeScale: 1.1 }, impulse: { hop: 0.3 }, fx: { kind: 'spark', n: 4 } },
    celebrate: { dur: 2.2, params: { eyeScale: 1.2, sparkle: 2, mouthOpen: 1.2, blush: 2.2 },
      impulse: { hop: 1.3 }, fx: [{ kind: 'spark', n: 30 }, { kind: 'ribbon', n: 6 }], sound: 'celebrate', haptic: [10, 25, 10, 25, 10] },
  },

  loomi: {
    squeezeFace: { closedCurve: -0.6, mouthSmile: 0.9, mouthSkew: 0.3, blush: 1.6 },
    tap: { dur: 1.3, params: { closedCurve: -1, mouthSmile: 1, mouthOpen: 0.2 },
      impulse: { squash: 0.12, lean: 0.15 }, fx: { kind: 'ring', n: 1 }, sound: 'tap', haptic: H.light },
    doubleTap: { dur: 1.8, params: { eyeOpen: 0.9, mouthRound: 0.6, mouthOpen: 0.4, float: 1 },
      impulse: { hop: 0.5 }, fx: [{ kind: 'ring', n: 3 }, { kind: 'ribbon', n: 3 }], sound: 'surprise', haptic: H.soft },
    flick: { dur: 1.6, params: { closedCurve: 0.5, mouthSkew: 0.7, mouthSmile: 0.3, lidTop: 0.4 },
      impulse: { lean: 0.6 }, sound: 'offended' },
    idle: { dur: 2, params: { float: 0.8, closedCurve: -0.3 }, impulse: { lean: 0.12 } },
    celebrate: { dur: 2.4, params: { closedCurve: -1, mouthSmile: 1, mouthOpen: 0.4, float: 1, glow: 1.2 },
      impulse: { hop: 0.5 }, fx: [{ kind: 'ribbon', n: 6 }, { kind: 'ring', n: 3 }], sound: 'celebrate', haptic: H.soft },
  },

  noomi: {
    squeezeFace: { eyeOpen: 0, closedCurve: -0.8, mouthRound: 0.5, mouthOpen: 0.3, blush: 2 },
    tap: { dur: 1.2, params: { eyeOpen: 0.55, lookY: -0.3, mouthRound: 0.5, mouthOpen: 0.35 },
      impulse: { squash: 0.15 }, fx: [{ kind: 'moon', n: 4 }, { kind: 'z', n: 1 }], sound: 'tap', haptic: H.light },
    doubleTap: { dur: 1.6, params: { eyeOpen: 1.3, eyeScale: 1.12, mouthRound: 1, mouthOpen: 0.8, browAlpha: 1, browY: 0.9 },
      impulse: { hop: 0.6 }, fx: [{ kind: 'moon', n: 12 }, { kind: 'exclaim', n: 1 }], sound: 'surprise', haptic: H.soft },
    flick: { dur: 1.6, params: { eyeOpen: 0.7, lidTop: 0.45, browAlpha: 1, browTilt: -0.5, mouthSmile: -0.4, mouthPout: 0.5 },
      impulse: { shear: 0.5 }, fx: { kind: 'z', n: 2 }, sound: 'offended' },
    idle: { dur: 2.2, params: { closedCurve: 1, squashBias: 0.06, mouthRound: 0.4, mouthOpen: 0.15 }, impulse: { tilt: 0.06 }, fx: { kind: 'z', n: 1 } },
    celebrate: { dur: 2.4, params: { eyeOpen: 1.1, mouthSmile: 1, mouthOpen: 0.6, glow: 1.2, float: 0.8 },
      impulse: { hop: 0.5 }, fx: [{ kind: 'moon', n: 16 }, { kind: 'cloud', n: 2 }], sound: 'celebrate', haptic: H.soft },
  },
};
