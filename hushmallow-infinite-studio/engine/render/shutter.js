// How far anything moves on screen while the shutter is open (profile feature
// adaptiveFloor, PHASE2-PLAN perf step P6).
//
// The approved direction samples at least 3 sub-frames per frame
// (subframes() → max(3, ceil(d / 2))). Measured in the WP-00 audit, 202 of
// v2's 450 frames move less than 2 px during the shutter; for those a single
// sample at the frame's centre is enough, because every motion is an analytic
// function of time (no stepped ghosts to hide). The direction's own estimate
// cannot be reused (it is clamped to 3 before the engine sees it), so the
// engine measures the displacement itself, from the states at the two ends of
// the shutter, in output px:
//   - every mesh vertex inside the body's silhouette box, through each state's
//     camera (body motion, squash and stretch, camera moves; the reflection is
//     its mirror image),
//   - glass bubbles: centre motion plus scale change times half-width, as the
//     direction measures them,
//   - particles: centre motion,
//   - the face's own motion (blinks, looks, mouth), face/cache.js feature points.
// A change in the number of bubbles or particles counts as motion (Infinity).

import { captureFaces } from '../face/cache.js';

export const STILL_PX = 2;     // below this, one centred sample is enough

function screenPoints(S, stub, artSize, scale) {
  S.buildMesh(stub, false);
  const [aw, ah] = artSize, [cx, baseY, halfW, h] = S.mallow.bodyBox;
  const x0 = (cx - halfW) / aw, x1 = (cx + halfW) / aw, y0 = (baseY - h) / ah, y1 = baseY / ah;
  const { data, stride, nVerts } = stub, cam = S.cam, out = [];
  for (let o = 0; o < nVerts * stride; o += stride) {
    const u = data[o + 2], v = data[o + 3];
    if (u < x0 || u > x1 || v < y0 || v > y1) continue;
    out.push(((data[o] - cam.x) * cam.zoom) * scale, ((data[o + 1] - cam.y) * cam.zoom) * scale);
  }
  return out;
}

const camPt = (S, x, y, scale) => [((x - S.cam.x) * S.cam.zoom) * scale, ((y - S.cam.y) * S.cam.zoom) * scale];

/**
 * Shutter displacement (output px) between states a and b (the two ends of the
 * shutter). ctx: { renderer, facePass, stubs: [stubA, stubB] } — CPU-only meshes
 * in the renderer's grid layout.
 */
export function shutterDisplacement(a, b, { renderer: r, facePass, stubs }) {
  const k = r.scale;
  let d = 0;
  if (stubs && a.buildMesh && b.buildMesh && a.mallow?.bodyBox) {
    const pa = screenPoints(a, stubs[0], r.artSize, k), pb = screenPoints(b, stubs[1], r.artSize, k);
    for (let i = 0; i < pa.length; i += 2) d = Math.max(d, Math.hypot(pa[i] - pb[i], pa[i + 1] - pb[i + 1]));
  }
  for (const key of ['bubblesBack', 'bubblesFront']) {
    const la = a[key] || [], lb = b[key] || [];
    if (la.length !== lb.length) return Infinity;
    for (let i = 0; i < la.length; i++) {
      const [ax, ay] = camPt(a, la[i].x, la[i].y, k), [bx, by] = camPt(b, lb[i].x, lb[i].y, k);
      d = Math.max(d, Math.hypot(ax - bx, ay - by) + Math.abs(la[i].scale - lb[i].scale) * la[i].hw * a.cam.zoom * k);
    }
  }
  const qa = a.particles || [], qb = b.particles || [];
  if (qa.length !== qb.length) return Infinity;
  for (let i = 0; i < qa.length; i++) {
    const [ax, ay] = camPt(a, qa[i].x, qa[i].y, k), [bx, by] = camPt(b, qb[i].x, qb[i].y, k);
    d = Math.max(d, Math.hypot(ax - bx, ay - by));
  }
  if (facePass) {
    const fa = captureFaces(a)[0], fb = captureFaces(b)[0];
    if (fa && fb) {
      const art = facePass.quantiser(fa.face).motionArt(fa.params, fb.params);
      if (art > 0) d = Math.max(d, art * facePass.artToOutput(a));
    }
  }
  return d;
}
