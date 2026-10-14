// Face cache (profile feature faceCache, PHASE2-PLAN perf step P3; fixes R1).
//
// The approved renderer redraws the face for every sub-frame (1,991 redraws in
// v2, ~35 % of render time), even on held poses: its cache key holds
// mouthWavePhase = t·4.2, which changes every sub-frame. With the cache:
//   - parameters are QUANTISED with a perceptual quantum per parameter, derived
//     from the face spec so that one quantum moves no drawn point more than
//     STEP_PX art px (0.25 px ≈ 0.14 output px at v2's 0.56 scale), or changes
//     an opacity by at most 1/255;
//   - the face is DRAWN FROM THE QUANTISED VALUES, so the canvas is a pure
//     function of the key: a cache hit is exact, and a frame never depends on
//     the frames rendered before it (segments may start anywhere);
//   - mouthWavePhase is dropped while mouthWave < 0.01 (the wave is then below
//     0.1 px) and taken modulo 2π otherwise;
//   - at rest (rest >= REST_FULL = 0.999 on every sub-frame) the face is not
//     tracked at all (the perf plan's "skip when rest >= 0.999"): the pristine
//     painting is the albedo there, and the face canvas only masks the spec,
//     rim and glow terms over the painted face. The canvas holds the REST POSE
//     instead (restPose(): the neutral pose the painting shows, quantised like
//     any pose, so a neutral face keeps its key across the window's edges), and
//     the whole rest window costs at most one draw on entry, cache hits after.
//     "Skip" is not "keep whatever the canvas last held": that would make a
//     frame depend on the frames rendered before it, and the mask would follow
//     an expression the painting does not show. The rest test
//     (tools/perf/rest-test.mjs) measures this pose;
//   - the face is drawn once per frame, at the centre time, and per sub-frame
//     only while it moves more than motionPx (1.5 output px) during the shutter
//     (blinks, eye pops). Body motion blur on the face is unchanged: the face
//     canvas is in art space and the mesh deforms it per sub-frame.
// The renderer side lives in renderer/passes/face.js.

import { NEUTRAL } from './params.js';
import { clamp, lerp, eyeGeom } from './geometry.js';

/** Largest art-px move of a drawn point per quantum. */
export const STEP_PX = 0.25;
/** At or above this rest weight on every sub-frame the painting covers the face: the canvas holds the rest pose. */
export const REST_FULL = 0.999;
/** Opacity quantum: half an 8-bit step. */
const ALPHA_Q = 1 / 510;

/**
 * Capture policy for one drawFace() call. A direction draws its face through a
 * closure (S.drawFace = () => face.draw(params)); while `capture` is an array,
 * Face.draw records { face, params } there instead of drawing, which is how the
 * renderer learns the parameters of every sub-frame without a direction change.
 */
export const facePolicy = { capture: null };

/** Run S.drawFace() in capture mode. → [{ face, params }] (empty when the state has no face). */
export function captureFaces(S) {
  if (!S.drawFace) return [];
  const rec = [];
  facePolicy.capture = rec;
  try { S.drawFace(); } finally { facePolicy.capture = null; }
  return rec;
}

const TAU = Math.PI * 2;

export class FaceQuantiser {
  /** spec: the face spec (eyes, brows, mouth, cheeks) the face is drawn from. */
  constructor(spec, { stepPx = STEP_PX } = {}) {
    this.spec = spec;
    const eyes = [spec.eyes.L, spec.eyes.R];
    const r = Math.max(...eyes.map((e) => e.r)), ir = Math.max(...eyes.map((e) => e.irisR));
    const sag = Math.max(...eyes.map((e) => Math.abs(e.sag))), hw = Math.max(...eyes.map((e) => e.hw));
    const mw = spec.mouth.w, msag = Math.abs(spec.mouth.sag), unit = r * 0.42;
    // art px a drawn point moves per unit of each parameter: upper bounds read off
    // eyeGeom / drawEye / drawBrow / drawMouth (features.js), allowing for eye scale and stretch
    const eyeTravel = 2.6 * r + 2 * sag;
    this.sens = {
      eyeOpen: eyeTravel, eyeOpenL: eyeTravel, eyeOpenR: eyeTravel, blink: eyeTravel, lidTop: eyeTravel, lidBot: eyeTravel,
      closedCurve: 2.7 * sag, squint: sag + 0.06 * hw, lidSlant: 0.6 * r,
      lookX: r, lookY: r, irisScale: 1.3 * ir, eyeScale: 2.2 * r, eyeStretch: 2 * r,
      browY: unit, browTilt: 1.6 * unit,
      mouthSmile: msag + 1, mouthOpen: 0.5 * mw, mouthRound: 0.5 * mw, mouthWidth: mw, mouthWave: 0.06 * mw,
      mouthSkew: 0.1 * mw, mouthY: 1, catchX: ir, catchY: ir,
    };
    this.alpha = new Set(['sparkle', 'browAlpha', 'blush']);
    this.stepPx = stepPx;
    this.mw = mw;
  }

  /** The quantum of parameter `k` (value of mouthWave already quantised, for the phase). */
  quantum(k, waveQ) {
    if (this.alpha.has(k)) return ALPHA_Q;
    if (k === 'mouthWavePhase') return this.stepPx / Math.max(1e-6, Math.abs(waveQ) * 0.06 * this.mw);
    const s = this.sens[k];
    return s ? this.stepPx / s : 1 / 2000;       // unknown parameters: the approved key's rounding
  }

  /**
   * Quantise a full parameter set.
   * → { P (values to draw), key (string) }
   */
  quantise(params) {
    const P = { ...NEUTRAL, ...params };
    const q = {}, idx = [];
    const keys = Object.keys(P).sort();
    const round = (k, v, qk) => { const n = Math.round(v / qk); q[k] = n * qk; idx.push(`${k}:${n}`); };
    for (const k of keys) {
      if (k === 'mouthWavePhase') continue;
      const v = P[k];
      if (typeof v !== 'number') { q[k] = v; idx.push(`${k}=${JSON.stringify(v)}`); continue; }
      round(k, v, this.quantum(k));
    }
    if (Math.abs(q.mouthWave) < 0.01) { q.mouthWavePhase = 0; idx.push('mouthWavePhase:off'); }
    else {
      // a whole number of steps per turn, so the phase grid wraps onto itself
      const steps = Math.ceil(TAU / this.quantum('mouthWavePhase', q.mouthWave));
      const n = Math.round(((((P.mouthWavePhase % TAU) + TAU) % TAU) / TAU) * steps) % steps;
      q.mouthWavePhase = (n * TAU) / steps;
      idx.push(`mouthWavePhase:${n}/${steps}`);
    }
    return { P: q, key: idx.join(',') };
  }

  /**
   * What the face canvas holds while the painting covers the face (rest >=
   * REST_FULL on every sub-frame), whatever the direction's parameters: the
   * neutral pose, which is the face the painting shows (engine/dev/rest-test.html
   * compares this pose with it). Quantised like every other pose, so the
   * neutral face of a cross-fade has the same key and is not drawn again at
   * the window's edges. → { P, key }
   */
  restPose() {
    return this.quantise(NEUTRAL);
  }

  /** How far the drawn face moves between two parameter sets, in art px (faceMotionArt). */
  motionArt(Pa, Pb) {
    return faceMotionArt(this.spec, Pa, Pb);
  }
}

/**
 * How far a face drawn from `spec` moves between two parameter sets, in art px:
 * the largest displacement of its feature points (eye corners and lid curves,
 * iris centres, mouth corners and middle, brow ends). An estimate in the spirit
 * of the direction's own subframes() probe, used to decide whether a frame
 * needs per-sub-frame face redraws (passes/face.js) and whether the shutter
 * sees motion (render/shutter.js).
 */
export function faceMotionArt(spec, Pa, Pb) {
  const a = featurePoints(spec, Pa), b = featurePoints(spec, Pb);
  let d = 0;
  for (let i = 0; i < a.length; i++) d = Math.max(d, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]));
  return d;
}

/** Feature points of a face (art px), same count and order for any parameters. */
export function featurePoints(spec, params) {
  const P = { ...NEUTRAL, ...params }, pts = [];
  for (const side of ['L', 'R']) {
    const e = spec.eyes[side], g = eyeGeom(e, side, P);
    pts.push([g.xin, g.yin], [g.xout, g.yout], g.up[0], g.up[1], g.lo[0], g.lo[1]);
    const ir = e.irisR * P.irisScale * P.eyeScale;
    const lx = clamp(P.lookX, -1, 1), ly = clamp(P.lookY, -1, 1);
    pts.push([g.ex + e.irisOff[0] * P.eyeScale + lx * (g.rx - ir) * 0.85, g.ey + e.irisOff[1] * P.eyeScale + ly * (g.ry - ir) * 0.8]);
    const b = spec.brows?.[side];
    if (b) {
      // brows move by their lift and tilt, weighted by how visible they are (continuous in opacity)
      const vis = clamp(P.browAlpha * 4, 0, 1), unit = e.r * 0.42;
      const lift = -P.browY * unit * vis, tilt = P.browTilt * unit * 1.55 * vis;
      pts.push([b.p0[0], b.p0[1] + lift - tilt], [b.p1[0], b.p1[1] + lift + tilt]);
    }
  }
  const M = spec.mouth;
  const s = clamp(P.mouthSmile, -1.2, 1.2), o = clamp(P.mouthOpen, 0, 1.4), r = clamp(P.mouthRound, 0, 1);
  const W = M.w * clamp(P.mouthWidth, 0.3, 1.5) * (1 - 0.5 * r);
  const y0 = M.y + P.mouthY, skew = P.mouthSkew * M.w * 0.1;
  const depth = o * M.w * 0.42 * (1 + 0.2 * r) * (1 - 0.35 * r);
  const sag = M.sag * s * (1 - 0.6 * r);
  pts.push([M.x - W / 2, y0 + skew], [M.x + W / 2, y0 - skew], [M.x, y0 + sag + depth]);
  // three points along the (wavy) lip line, as drawMouth places them
  const amp = P.mouthWave * M.w * 0.06;
  for (const u of [0.25, 0.5, 0.75]) {
    const wv = Math.sin(u * Math.PI * 3 + P.mouthWavePhase) * amp * Math.sin(Math.PI * u);
    pts.push([lerp(M.x - W / 2, M.x + W / 2, u), y0 + lerp(skew, -skew, u) + 4 * u * (1 - u) * sag + wv]);
  }
  return pts;
}
