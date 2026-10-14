// Face parameters and specs: the neutral (rest) pose of the closed-eye style and
// the two ways a face spec is built (from the approved app rig, or from the
// derived hi-res measurements). Verbatim from stage2/face.js (frozen).

export const NEUTRAL = {
  eyeOpen: 0, eyeOpenL: 1, eyeOpenR: 1, blink: 0, closedCurve: 1, squint: 0,
  lidTop: 0, lidBot: 0, lidSlant: 0, lookX: 0, lookY: 0, irisScale: 1, eyeScale: 1, eyeStretch: 1, sparkle: 0,
  browAlpha: 0, browY: 0, browTilt: 0,
  mouthSmile: 1, mouthOpen: 0, mouthRound: 0, mouthWidth: 1, mouthWave: 0, mouthWavePhase: 0, mouthSkew: 0, mouthY: 0,
  blush: 0, catchX: 0.34, catchY: -0.4,
};

/** Approved rig face spec (439×420 sprite px) → hi-res art px via an affine fit. */
export function specFromRig(rigFace, k, ox, oy) {
  const P = (x, y) => [x * k + ox, y * k + oy];
  const eye = (e) => ({ x: e.x * k + ox, y: e.y * k + oy, hw: e.hw * k, sag: e.sag * k, lw: e.lw * k, r: e.rx * k, irisR: e.irisR * k, irisOff: [e.irisOff[0] * k, e.irisOff[1] * k] });
  const brow = (b) => ({ p0: P(...b.p0), c: P(...b.c), p1: P(...b.p1), lw: b.lw * k });
  return {
    line: rigFace.line,
    eyes: { L: eye(rigFace.eyes.L), R: eye(rigFace.eyes.R) },
    brows: { L: brow(rigFace.brows.L), R: brow(rigFace.brows.R) },
    mouth: { x: rigFace.mouth.x * k + ox, y: rigFace.mouth.y * k + oy, w: rigFace.mouth.w * k, sag: rigFace.mouth.sag * k, lw: rigFace.mouth.lw * k },
    cheeks: { L: [...P(rigFace.cheeks.L[0], rigFace.cheeks.L[1]), rigFace.cheeks.L[2] * k], R: [...P(rigFace.cheeks.R[0], rigFace.cheeks.R[1]), rigFace.cheeks.R[2] * k], colour: rigFace.cheeks.colour },
  };
}

/**
 * Face spec from tools/derive_noomi_hires.py measurements (art px of noomi-clean.png):
 * the closed eyes / mouth are the skeleton-fitted quadratic Béziers of the painted
 * strokes; open-eye size follows the approved rig ratio (36/44 of the closed half-width);
 * brows (expression-only, not in the painting) come from the rig, placed over each eye.
 */
export function specFromDerived(j, rigFace, k = 2.70) {
  const eye = (e, side) => {
    const { p0, c, p1 } = e.bezier;
    const inner = side === 'L' ? p1 : p0, outer = side === 'L' ? p0 : p1;
    const x = (p0[0] + p1[0]) / 2, y = (p0[1] + p1[1]) / 2;
    const midY = 0.25 * p0[1] + 0.5 * c[1] + 0.25 * p1[1];
    const re = rigFace.eyes[side];
    return {
      x, y, hw: (p1[0] - p0[0]) / 2, sag: midY - y, lw: e.coreWidth,
      tilt: (inner[1] - outer[1]) / 2,           // inner corner lower (+) / higher (−) than the outer
      cxOff: c[0] - x,                            // the painted arc is not perfectly symmetric
      r: e.openEyeSocket.rx, irisR: re.irisR * k, irisOff: [re.irisOff[0] * k, re.irisOff[1] * k],
    };
  };
  const L = eye(j.eyeL, 'L'), R = eye(j.eyeR, 'R');
  const brow = (b, e, re) => {
    const dx = e.x - re.x * k, dy = e.y - re.y * k;   // rig brows keep their offset from the rig eye
    const P = (q) => [q[0] * k + dx, q[1] * k + dy];
    return { p0: P(b.p0), c: P(b.c), p1: P(b.p1), lw: b.lw * k };
  };
  const m = j.mouth.bezier;
  const mx = (m.p0[0] + m.p1[0]) / 2, my = (m.p0[1] + m.p1[1]) / 2;
  return {
    line: rigFace.line,
    eyes: { L, R },
    brows: { L: brow(rigFace.brows.L, L, rigFace.eyes.L), R: brow(rigFace.brows.R, R, rigFace.eyes.R) },
    mouth: { x: mx, y: my, w: m.p1[0] - m.p0[0], sag: 0.25 * m.p0[1] + 0.5 * m.c[1] + 0.25 * m.p1[1] - my, lw: j.mouth.coreWidth, cxOff: m.c[0] - mx, tilt: (m.p1[1] - m.p0[1]) / 2 },
    cheeks: { L: [...j.cheeks.L.center, j.cheeks.L.radius], R: [...j.cheeks.R.center, j.cheeks.R.radius], colour: rigFace.cheeks.colour },
    colors: j.eyeL.colors,
  };
}
