// Mallow expression system.
//
// An expression is a set of target values for continuous rig parameters.
// Emotions are blended (mixed emotions), scaled by intensity, then filtered
// through each Mallow's personality so the same emotion reads differently on
// Glitzi than on Boppo.  The rig springs every parameter toward its target,
// so any change of emotion is a smooth, physical transition.

// name: [default, spring group]
export const PARAMS = {
  // eyes
  eyeOpen: [1, 'eye'], closedCurve: [0.6, 'eye'], lidTop: [0, 'eye'], lidBot: [0, 'eye'],
  lidSlant: [0, 'eye'], wink: [0, 'eye'], lookX: [0, 'gaze'], lookY: [0, 'gaze'],
  irisScale: [1, 'eye'], eyeScale: [1, 'eye'], sparkle: [1, 'cheek'], heartEyes: [0, 'cheek'],
  wet: [0, 'cheek'], tears: [0, 'cheek'], gazeDart: [0, 'cheek'], blinkRate: [1, 'cheek'],
  // brows
  browAlpha: [0, 'brow'], browY: [0, 'brow'], browTilt: [0, 'brow'], browCurve: [0, 'brow'], browAsym: [0, 'brow'],
  // mouth
  mouthSmile: [0.5, 'mouth'], mouthOpen: [0, 'mouth'], mouthWidth: [1, 'mouth'], mouthRound: [0, 'mouth'],
  mouthWave: [0, 'mouth'], mouthSkew: [0, 'mouth'], mouthPout: [0, 'mouth'], tongue: [0, 'mouth'],
  mouthTremble: [0, 'cheek'],
  // cheeks
  blush: [1, 'cheek'], blushLines: [0, 'cheek'], cheekPuff: [0, 'cheek'], sweat: [0, 'cheek'],
  // body
  bounce: [0, 'body'], bounceRate: [1.4, 'body'], tremble: [0, 'body'], droop: [0, 'body'],
  squashBias: [0, 'body'], leanBias: [0, 'body'], tiltBias: [0, 'body'], shrink: [0, 'body'],
  breath: [1, 'body'], breathRate: [0.22, 'body'], glow: [0, 'body'], float: [0, 'body'],
  yawnCycle: [0, 'body'], sighCycle: [0, 'body'],
  // signature systems
  glitch: [0, 'cheek'], spin: [0.25, 'cheek'], spinJitter: [0, 'cheek'], spiralHue: [0, 'cheek'],
  // ambient effects (emitter strength)
  fxSpark: [0, 'fx'], fxHeart: [0, 'fx'], fxRain: [0, 'fx'], fxSteam: [0, 'fx'], fxZzz: [0, 'fx'],
  fxQuestion: [0, 'fx'], fxExclaim: [0, 'fx'], fxStar: [0, 'fx'], fxNote: [0, 'fx'], fxSigh: [0, 'fx'],
};

export const PARAM_NAMES = Object.keys(PARAMS);

// Parameters that turn on only once an emotion is strong enough:
// [start, full] intensity.
const GATES = {
  tears: [0.5, 0.95], fxRain: [0.6, 1], fxSteam: [0.45, 0.9], fxExclaim: [0.35, 0.8],
  fxQuestion: [0.25, 0.7], fxHeart: [0.3, 0.8], fxStar: [0.35, 0.85], fxSpark: [0.25, 0.8],
  fxZzz: [0.35, 0.8], yawnCycle: [0.4, 0.8], tremble: [0.3, 0.9], sweat: [0.25, 0.75],
  blushLines: [0.35, 0.8], cheekPuff: [0.2, 0.7], fxNote: [0.3, 0.8], mouthTremble: [0.25, 0.8],
  heartEyes: [0.55, 0.95], wink: [0.2, 0.6], tongue: [0.35, 0.8],
};

// Twenty-seven base expressions. Values are absolute targets.
export const PRESETS = {
  neutral: {},
  happy: { eyeOpen: 0.92, closedCurve: -1, lidBot: 0.32, sparkle: 1.35, browY: 0.25, browTilt: 0.1,
    mouthSmile: 1, mouthOpen: 0.5, mouthWidth: 1.1, blush: 1.45, bounce: 0.35, bounceRate: 1.7, glow: 0.4, fxSpark: 0.25 },
  excited: { eyeOpen: 1.22, eyeScale: 1.12, irisScale: 1.08, sparkle: 1.9, browY: 0.65, mouthSmile: 1,
    mouthOpen: 1, mouthWidth: 1.15, blush: 1.6, bounce: 0.9, bounceRate: 2.4, glow: 0.8, fxStar: 0.6, fxSpark: 0.6 },
  playful: { wink: 1, closedCurve: -1, lookX: 0.35, browY: 0.3, browAsym: 0.4, mouthSmile: 0.95, mouthSkew: 0.6,
    mouthOpen: 0.3, tongue: 0.75, bounce: 0.45, bounceRate: 1.9, tiltBias: 6, fxNote: 0.45, blush: 1.25 },
  loved: { eyeOpen: 0.72, closedCurve: -1, lidBot: 0.3, heartEyes: 1, irisScale: 1.15, sparkle: 1.3, browTilt: 0.35,
    browY: 0.2, mouthSmile: 0.9, mouthOpen: 0.18, blush: 2, glow: 1, fxHeart: 0.7, breath: 1.25 },
  proud: { eyeOpen: 0.78, lidTop: 0.28, closedCurve: -0.6, browY: 0.35, browTilt: -0.15, mouthSmile: 0.85, mouthSkew: 0.3,
    mouthOpen: 0.12, squashBias: -0.07, tiltBias: -4, glow: 0.6, fxStar: 0.3 },
  hopeful: { eyeOpen: 1.06, lookY: -0.55, irisScale: 1.06, sparkle: 1.5, browY: 0.45, browTilt: 0.32, mouthSmile: 0.55,
    mouthOpen: 0.15, glow: 0.65, float: 0.3, squashBias: -0.05 },
  calm: { eyeOpen: 0.12, lidTop: 0.55, closedCurve: 1, browY: -0.05, browTilt: 0.05, mouthSmile: 0.6, mouthOpen: 0,
    breath: 1.45, breathRate: 0.12, bounce: 0, glow: 0.3, spin: 0.12, glitch: 0.15, float: 0.2 },
  relieved: { eyeOpen: 0.18, closedCurve: 0.7, browY: 0.2, browTilt: 0.4, mouthSmile: 0.6, mouthOpen: 0.3, mouthRound: 0.45,
    breath: 1.5, sighCycle: 0.8, fxSigh: 0.6, squashBias: 0.04 },
  comforted: { mouthOpen: 0.05, eyeOpen: 0.22, closedCurve: -0.5, lidBot: 0.3, browTilt: 0.32, mouthSmile: 0.75, blush: 1.45, glow: 0.6,
    breath: 1.3, breathRate: 0.15, fxHeart: 0.2 },
  curious: { eyeOpen: 1.1, eyeScale: 1.06, browY: 0.4, browAsym: 0.65, lookX: 0.3, lookY: -0.1, mouthSmile: 0.15,
    mouthRound: 0.35, mouthOpen: 0.22, tiltBias: 9, leanBias: 0.3, fxQuestion: 0.2 },
  surprised: { eyeOpen: 1.35, eyeScale: 1.18, irisScale: 0.85, browY: 1, mouthRound: 1, mouthOpen: 0.85, mouthSmile: 0,
    squashBias: -0.1, fxExclaim: 0.7, sparkle: 1.2 },
  awe: { eyeOpen: 1.25, eyeScale: 1.12, irisScale: 1.15, sparkle: 1.95, lookY: -0.45, browY: 0.7, browTilt: 0.25,
    mouthRound: 0.8, mouthOpen: 0.5, mouthSmile: 0.3, glow: 1.2, float: 0.45, fxStar: 0.5 },
  confused: { mouthOpen: 0.05, eyeOpen: 0.95, browAsym: 1, browTilt: 0.2, lookX: -0.3, lookY: -0.35, mouthSmile: -0.15, mouthWave: 0.6,
    mouthSkew: -0.5, tiltBias: -10, fxQuestion: 0.7, spin: 0.6, spinJitter: 0.6 },
  anxious: { mouthOpen: 0.1, eyeOpen: 1.1, irisScale: 0.8, browY: 0.35, browTilt: 0.8, browAlpha: 0.8, mouthSmile: -0.35, mouthWave: 0.8,
    mouthWidth: 0.75, sweat: 0.8, tremble: 0.4, gazeDart: 1, blinkRate: 2.4, squashBias: 0.03, spinJitter: 0.8, glitch: 0.9 },
  scared: { mouthSmile: -0.35, eyeOpen: 1.3, eyeScale: 1.15, irisScale: 0.62, browY: 0.8, browTilt: 0.9, browAlpha: 1, mouthRound: 0.7,
    mouthOpen: 0.45, mouthWidth: 0.6, mouthTremble: 0.6, sweat: 0.6, tremble: 0.8, squashBias: 0.1, leanBias: -0.4,
    fxExclaim: 0.3, glitch: 1.1 },
  sad: { eyeOpen: 0.6, lidTop: 0.35, lidSlant: -0.75, lookY: 0.45, wet: 1, tears: 0.6, browTilt: 0.9, browAlpha: 0.9,
    browY: -0.1, mouthSmile: -0.8, mouthOpen: 0.06, mouthTremble: 0.4, mouthWidth: 0.8, blush: 0.7, droop: 0.7,
    breath: 0.8, breathRate: 0.15, squashBias: 0.06, fxRain: 0.3, sparkle: 0.6, glitch: 0.15 },
  disappointed: { eyeOpen: 0.58, lidTop: 0.42, lookY: 0.55, lidSlant: -0.35, browTilt: 0.6, browAlpha: 0.6, browY: -0.12,
    mouthSmile: -0.55, mouthOpen: 0, mouthWidth: 0.85, mouthSkew: 0.15, droop: 0.55, sighCycle: 0.7, blush: 0.8,
    sparkle: 0.6, glitch: 0.3, spin: 0.08 },
  lonely: { mouthOpen: 0, eyeOpen: 0.55, lidTop: 0.3, lidSlant: -0.4, lookX: -0.6, lookY: 0.3, wet: 0.55, browTilt: 0.6, browAlpha: 0.6,
    mouthSmile: -0.45, mouthWidth: 0.7, droop: 0.5, shrink: 0.35, breath: 0.7, sparkle: 0.6 },
  guilty: { mouthOpen: 0, eyeOpen: 0.5, lidTop: 0.4, lookY: 0.85, lookX: 0.3, browTilt: 0.7, browAlpha: 0.7, browY: -0.2, mouthSmile: -0.4,
    mouthSkew: 0.3, mouthWidth: 0.7, droop: 0.6, shrink: 0.3, sweat: 0.3, leanBias: -0.15 },
  embarrassed: { mouthOpen: 0.08, eyeOpen: 0.42, closedCurve: -1, lidBot: 0.35, lookX: 0.7, lookY: 0.4, browTilt: 0.5, browAlpha: 0.5,
    mouthSmile: 0.35, mouthWave: 0.5, mouthWidth: 0.7, blush: 2.3, blushLines: 1, sweat: 0.4, shrink: 0.25, tiltBias: 6 },
  jealous: { mouthOpen: 0, eyeOpen: 0.7, lidTop: 0.45, lidBot: 0.2, lookX: 0.9, browTilt: -0.5, browAlpha: 0.8, browAsym: 0.4,
    mouthSmile: -0.4, mouthPout: 0.8, mouthSkew: 0.5, cheekPuff: 0.45, leanBias: -0.25, glitch: 0.9 },
  disgusted: { mouthOpen: 0.22, eyeOpen: 0.55, lidBot: 0.45, lidTop: 0.25, lookX: 0.6, browTilt: -0.3, browAlpha: 0.7, browAsym: 0.7,
    mouthSmile: -0.6, mouthSkew: -0.8, mouthWave: 0.4, mouthWidth: 0.8, tongue: 0.45, leanBias: -0.5, squashBias: 0.05 },
  angry: { eyeOpen: 0.6, lidTop: 0.3, lidSlant: 0.95, irisScale: 0.85, browAlpha: 1, browY: -0.6, browTilt: -1,
    mouthSmile: -0.85, mouthWidth: 0.75, mouthOpen: 0.15, cheekPuff: 0.6, blush: 0.7, tremble: 0.35, squashBias: 0.08,
    glow: 0.6, fxSteam: 0.65, glitch: 1.7, spin: 1, spinJitter: 0.5 },
  frustrated: { mouthOpen: 0, eyeOpen: 0.45, lidTop: 0.4, lidSlant: 0.6, browAlpha: 0.9, browTilt: -0.6, browY: -0.4, mouthSmile: -0.5,
    mouthWave: 0.5, cheekPuff: 1, mouthPout: 0.4, fxSteam: 0.35, sighCycle: 1, tremble: 0.15, glitch: 1.1 },
  exhausted: { mouthOpen: 0, eyeOpen: 0.22, lidTop: 0.75, closedCurve: 1, lookY: 0.4, browTilt: 0.3, browY: -0.3, mouthSmile: -0.2,
    yawnCycle: 1, droop: 0.9, breath: 1.3, breathRate: 0.1, fxZzz: 0.7, squashBias: 0.1, bounce: 0, glitch: 0.2, spin: 0.08 },
  bored: { mouthOpen: 0, eyeOpen: 0.5, lidTop: 0.55, lookX: -0.5, lookY: 0.2, browY: -0.2, mouthSmile: -0.25, mouthSkew: 0.4,
    mouthWidth: 0.7, droop: 0.4, sighCycle: 0.5, spin: 0.1 },
  determined: { mouthOpen: 0, eyeOpen: 0.85, lidTop: 0.2, lidSlant: 0.4, browAlpha: 1, browTilt: -0.5, browY: -0.15, mouthSmile: 0.25,
    mouthWidth: 0.78, squashBias: -0.05, glow: 0.5, fxSpark: 0.2 },
};

// Twenty headline expressions requested for the studio, plus extras above.
export const PRESET_IDS = Object.keys(PRESETS);

// Personality: how each Mallow interprets emotions.
//   eyeGate  : for Mallows whose approved face has closed eyes, how strong
//              an emotion must be before their eyes open
//   energy   : multiplier on bouncing / hopping / trembling
//   overrides: per-emotion partial targets layered over the generic preset
export const PERSONALITY = {
  glitzi: {
    energy: 0.9, eyeGate: null,
    overrides: {
      neutral: {},
      happy: { glitch: 1.1, lookX: 0.15, lidTop: 0.15, mouthSmile: 0.7, mouthSkew: 0.5, mouthOpen: 0.25, fxSpark: 0.7 },
      excited: { glitch: 1.4, lidTop: 0, lookX: 0 },
      angry: { glitch: 2, lidTop: 0.34, lookX: 0.08, lookY: 0.05, fxSteam: 0.3, browTilt: -1.5, browY: -0.9 },
      frustrated: { browTilt: -1.1, browY: -0.6, glitch: 1.5 },
      sad: { glitch: 0.1, lidTop: 0.2, lookX: 0, lookY: 0.2, irisScale: 1.12, sparkle: 1.2, wet: 1 },
      lonely: { glitch: 0.15, lookX: -0.4 },
      calm: { glitch: 0.08, lidTop: 0.6, eyeOpen: 0.8 },
      playful: { glitch: 1.2, lookX: 0.5, tongue: 0.9 },
      loved: { glitch: 0.6, lookX: 0.2, lidTop: 0.25, heartEyes: 0.7 },
      surprised: { glitch: 1.4, lookX: 0 },
      scared: { lookX: 0 },
      embarrassed: { lookX: 0.9, glitch: 0.9 },
      proud: { lookX: 0.4, lidTop: 0.38, glitch: 0.8 },
    },
  },
  blubi: {
    energy: 0.75, eyeGate: [0.38, 0.85],
    overrides: {
      sad: { droop: 1, tears: 0.95, eyeOpen: 0.35, wet: 1, fxRain: 0.5, mouthTremble: 0.6 },
      happy: { bounce: 0.6, blush: 1.9, eyeOpen: 0 },
      anxious: { blinkRate: 3, tremble: 0.25, squashBias: 0.06, eyeOpen: 0.75 },
      loved: { blush: 2.3, fxHeart: 0.9 },
      lonely: { tears: 0.5, shrink: 0.45 },
      comforted: { blush: 1.9, glow: 0.8 },
      // beautifully dramatic: hurt-angry, wobbly and teary rather than fierce
      angry: { browTilt: -1.4, browY: -0.7, browAlpha: 1, mouthPout: 0.75, mouthTremble: 0.5, wet: 0.7, cheekPuff: 1, blush: 1.6, glitch: 0 },
      jealous: { lookX: -0.8, mouthPout: 1, wet: 0.5, browTilt: 0.3, cheekPuff: 0.7 },
      frustrated: { browTilt: -1.2, browAlpha: 1, mouthWave: 0.8, cheekPuff: 1, mouthTremble: 0.3 },
    },
  },
  zuzu: {
    energy: 0.85, eyeGate: null,
    overrides: {
      anxious: { spinJitter: 1, spin: 1.3, eyeOpen: 1.05 },
      happy: { spiralHue: 1, spin: 1.4, lidBot: 0.15 },
      excited: { spiralHue: 1, spin: 2.2 },
      calm: { spin: 0.1, spinJitter: 0, eyeOpen: 0.75, lidTop: 0.3 },
      confused: { spin: 0.9, spinJitter: 1 },
      sad: { spin: 0.06, lidTop: 0.4, spiralHue: 0 },
      angry: { spin: 1.6, spinJitter: 0.7 },
      curious: { spin: 0.8, spiralHue: 0.4 },
      exhausted: { spin: 0.04, eyeOpen: 0.3 },
      loved: { spiralHue: 0.7, spin: 0.5, heartEyes: 0 },
      surprised: { spin: 2.6 },
    },
  },
  boppo: {
    energy: 1.15, eyeGate: null,
    overrides: {
      excited: { bounce: 1, bounceRate: 2.7, eyeScale: 1.2 },
      sad: { mouthPout: 0.6, droop: 0.8, bounce: 0, glow: 0, sparkle: 0.4 },
      surprised: { eyeScale: 1.3, mouthRound: 1, mouthOpen: 1 },
      happy: { bounce: 0.6, mouthOpen: 0.7 },
      playful: { bounce: 0.7 },
    },
  },
  pipzi: {
    energy: 1.1, eyeGate: null,
    overrides: {
      happy: { blush: 2, fxSpark: 0.7, mouthOpen: 0.9 },
      angry: { mouthPout: 0.6, cheekPuff: 1, mouthOpen: 0.05 },
      frustrated: { mouthPout: 0.9, cheekPuff: 1 },
      excited: { bounceRate: 2.9, fxSpark: 1 },
      sad: { mouthPout: 0.5, mouthOpen: 0.15 },
      surprised: { mouthOpen: 1.1 },
    },
  },
  loomi: {
    energy: 0.55, eyeGate: [0.45, 0.9],
    overrides: {
      calm: { float: 0.65, breath: 1.65 },
      anxious: { eyeOpen: 0.72, browTilt: 0.7, tremble: 0.1, gazeDart: 0.4, mouthWave: 0.3, sweat: 0.4 },
      scared: { eyeOpen: 0.9, tremble: 0.3 },
      happy: { bounce: 0.22, closedCurve: -1, mouthOpen: 0.25, eyeOpen: 0 },
      excited: { bounce: 0.5 },
      // unbothered, even when bothered: a flat slit and a sideways mouth
      angry: { eyeOpen: 0.42, lidTop: 0.55, lidSlant: 0.6, browTilt: -1.3, browY: -0.5, browAlpha: 1, mouthSmile: -0.4, mouthSkew: 0.7, cheekPuff: 0.3, tremble: 0, fxSteam: 0.2 },
      jealous: { eyeOpen: 0.45, lidTop: 0.6, lookX: 0.9, mouthSkew: 0.8, browAsym: 0.8, mouthPout: 0.4 },
      frustrated: { eyeOpen: 0.4, lidTop: 0.55, browTilt: -1, browAlpha: 1, sighCycle: 1.4, mouthSkew: 0.5, fxSigh: 0.6 },
    },
  },
  noomi: {
    energy: 0.5, eyeGate: [0.5, 0.95],
    overrides: {
      exhausted: { yawnCycle: 1.3, fxZzz: 0.9 },
      excited: { eyeOpen: 1.3, eyeScale: 1.1 },
      surprised: { eyeOpen: 1.35 },
      sad: { eyeOpen: 0.08, mouthTremble: 0.55, breathRate: 0.1, tears: 0.7 },
      calm: { float: 0.5, fxZzz: 0.15 },
      happy: { closedCurve: -1, float: 0.25, eyeOpen: 0 },
      bored: { yawnCycle: 0.6 },
      // grumpy-sleepy: woken up cross
      angry: { eyeOpen: 0.5, lidTop: 0.6, lidSlant: 0.8, browTilt: -1.4, browY: -0.6, browAlpha: 1, mouthPout: 0.9, cheekPuff: 0.8, fxZzz: 0, fxSteam: 0.3 },
      jealous: { eyeOpen: 0.45, lidTop: 0.6, lookX: 0.85, mouthPout: 0.9, browTilt: -0.4, browAlpha: 0.8 },
      frustrated: { eyeOpen: 0.3, lidTop: 0.7, browTilt: -1.1, browAlpha: 1, yawnCycle: 0, sighCycle: 1.2, mouthPout: 0.6, cheekPuff: 0.9 },
    },
  },
};

// The ten named character states used by scenes (listening while the user
// types, concerned when something hurts, and so on).
export const STAGES = {
  neutral: { mix: { neutral: 1 }, intensity: 0 },
  curious: { mix: { curious: 1 }, intensity: 0.6 },
  listening: { mix: { curious: 0.55, calm: 0.45 }, intensity: 0.5, extra: { leanBias: 0.25, tiltBias: 5 } },
  // attentive and soft after something heavy: the mouth closed (no grin, whatever the Mallow's own resting mouth —
  // Zuzu's and Pipzi's are open), and nothing drawn over or round the face (no sighs, ?, !, sparks, hearts or rain)
  concerned: { mix: { sad: 0.45, anxious: 0.25, loved: 0.3 }, intensity: 0.45,
    extra: { leanBias: 0.2, fxRain: 0, tears: 0, mouthOpen: 0.02, mouthRound: 0, tongue: 0, sighCycle: 0, yawnCycle: 0, fxSigh: 0, fxExclaim: 0, fxQuestion: 0,
      fxSpark: 0, fxStar: 0, fxHeart: 0, fxNote: 0, sweat: 0 } },
  playful: { mix: { playful: 1 }, intensity: 0.75 },
  surprised: { mix: { surprised: 1 }, intensity: 0.8 },
  comforting: { mix: { loved: 0.5, calm: 0.5 }, intensity: 0.7, extra: { fxHeart: 0.15 } },
  transforming: { mix: { awe: 0.6, hopeful: 0.4 }, intensity: 0.75, extra: { glow: 1.3 } },
  celebrating: { mix: { excited: 0.7, happy: 0.3 }, intensity: 0.95 },
  resting: { mix: { calm: 0.75, exhausted: 0.25 }, intensity: 0.7, extra: { fxZzz: 0.1, yawnCycle: 0.2 } },
};

const smooth = (a, b, x) => {
  if (b <= a) return x >= a ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function baseParams(mallow) {
  const out = {};
  for (const k of PARAM_NAMES) out[k] = PARAMS[k][0];
  Object.assign(out, mallow.face.neutral || {});
  return out;
}

// mix: { presetId: weight } (weights need not sum to 1), intensity 0..1
// Returns absolute target values for every parameter.
export function resolveExpression(mallow, mix, intensity = 0.7, extra = null) {
  const base = baseParams(mallow);
  const pers = PERSONALITY[mallow.id] || { overrides: {}, energy: 1 };
  const entries = Object.entries(mix || {}).filter(([id, w]) => w > 0 && PRESETS[id]);
  const totalW = entries.reduce((s, [, w]) => s + w, 0) || 1;
  const acc = {};
  const wsum = {};
  for (const [id, w] of entries) {
    // mallow.presetOverrides: a re-rigged face's own targets (high-res Glitzi's lids)
    const target = { ...PRESETS[id], ...(pers.overrides?.[id] || {}), ...(mallow.presetOverrides?.[id] || {}) };
    const wi = w / totalW;
    for (const [k, v] of Object.entries(target)) {
      if (!(k in base)) continue;
      // ease-out: a mild feeling already reads clearly (no lingering grin)
      let amt = 1 - (1 - intensity) * (1 - intensity);
      if (GATES[k]) amt *= smooth(GATES[k][0], GATES[k][1], intensity * (w / totalW > 0.3 ? 1 : 0.8));
      if (k === 'eyeOpen' && pers.eyeGate && v > base.eyeOpen) {
        // closed-eyed Mallows keep their eyes shut for soft feelings and only
        // open them when an emotion is strong and genuinely eye-opening
        amt = v < 0.4 ? 0 : amt * smooth(pers.eyeGate[0], pers.eyeGate[1], intensity);
      }
      acc[k] = (acc[k] || 0) + wi * amt * (v - base[k]);
      wsum[k] = (wsum[k] || 0) + wi;
    }
  }
  const out = { ...base };
  for (const k of Object.keys(acc)) out[k] = base[k] + acc[k];
  // energy: personality scales movement-heavy params
  const e = pers.energy ?? 1;
  out.bounce *= e;
  out.tremble *= Math.min(1.2, e + 0.2);
  if (extra) for (const [k, v] of Object.entries(extra)) if (k in out) out[k] = v;
  return out;
}

export function describeExpression(mallow, mix, intensity) {
  const parts = Object.entries(mix || {}).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
  if (!parts.length || parts[0][0] === 'neutral') return `${mallow.name} looks peaceful`;
  const level = intensity < 0.35 ? 'a little ' : intensity > 0.8 ? 'very ' : '';
  return `${mallow.name} looks ${level}${parts.map(([id]) => id).slice(0, 2).join(' and ')}`;
}
