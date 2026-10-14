// Browser-side helper for the pixel gates (loaded into an engine page by
// tools/perf/gate.mjs): the screen-space face box of a frame, so face-box PSNR
// and SSIM measure exactly the region the face is drawn in.
//
// The face box is known in art px (Face.box: every face draw is clipped to it).
// It is carried to the screen through the deformed mesh of the frame's centre
// state: every mesh vertex whose art position lies in the box (grown by one
// grid cell, so the box is fully covered) is projected with the centre camera.
// Nothing is rendered; the direction's state is only evaluated.

import { Face } from '../../engine/face.js';

let tap = null;
const originalDraw = Face.prototype.draw;
Face.prototype.draw = function draw(params) {
  if (tap) { tap.face = this; return false; }      // armed: report the instance, draw nothing
  return originalDraw.call(this, params);
};

/** → [x0, y0, x1, y1] in output px (top-down), or null when the direction has no face. */
export function faceBox(t, pad = 4) {
  const st = window.__engine.stage, r = st.renderer;
  const S = st.video.state(t, st, { center: true });
  const armed = (tap = {});
  try { S.drawFace?.(); } finally { tap = null; }
  const face = armed.face;
  if (!face) return null;
  const { cols, rows, stride, nVerts } = r.mesh;
  const stub = { cols, rows, stride, nVerts, data: new Float32Array(nVerts * stride), upload() {} };
  S.buildMesh(stub, false);
  const [aw, ah] = r.artSize, cw = aw / cols, ch = ah / rows;
  const [bx0, by0, bx1, by1] = face.box;
  const k = r.scale, cam = S.cam;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let o = 0; o < nVerts * stride; o += stride) {
    const u = stub.data[o + 2] * aw, v = stub.data[o + 3] * ah;
    if (u < bx0 - cw || u > bx1 + cw || v < by0 - ch || v > by1 + ch) continue;
    const sx = ((stub.data[o] - cam.x) * cam.zoom + r.W / 2) * k;
    const sy = ((stub.data[o + 1] - cam.y) * cam.zoom + r.H / 2) * k;
    x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
  }
  return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 + pad), Math.ceil(y1 + pad)];
}
