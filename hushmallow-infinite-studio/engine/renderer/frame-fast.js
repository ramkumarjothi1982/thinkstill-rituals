// The optimised frame pipeline (every profile but exact). Same frame model as
// the approved pipeline (frame-exact.js): the world once per frame from the
// centre state, N sub-frames of the moving things accumulated in HDR, bloom,
// post. Each optimisation of WP-02's performance pass is a profile feature
// (render/profiles.js), switched here:
//
//   faceCache  the face is drawn once per frame from quantised parameters, and
//              per sub-frame only while it moves (passes/face.js). The draw is
//              issued after the world pass, so the CPU canvas work overlaps the
//              GPU's world rendering.

import { accumulate } from './passes/filters.js';
import { bloom, finish } from './passes/post.js';
import { renderSubExact } from './frame-exact.js';

export function renderFrameFast(r, subStates, center, overlayCanvas) {
  const gl = r.gl, T = r.t, m = r.meter;
  const face = r.facePass ? r.facePass.plan(subStates, center) : null;
  const wgt = 1 / subStates.length;
  m?.begin('world');
  r.renderWorld(center);
  m?.end('world');
  if (face?.once) r.facePass.draw(face.face, face.once);
  T.accum.bind();
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  subStates.forEach((S, k) => {
    if (face?.perSub) r.facePass.draw(face.face, face.perSub[k]);
    renderSubExact(r, S);
    m?.begin('accum');
    T.accum.bind();
    accumulate(r, T.scene, wgt);
    m?.end('accum');
  });
  m?.begin('bloom');
  bloom(r, T.accum, center.post);
  m?.end('bloom');
  finish(r, T.accum, center, overlayCanvas);
}
