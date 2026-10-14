// Full-screen helper passes shared by every pipeline: separable blur, copy with
// gain, and the HDR accumulation of one sub-frame. Logic and GL calls are the
// approved v2 renderer's (_blur, _copy and the accumulate step of renderFrame).

import { setUniforms } from '../../gl.js';

/**
 * Two-pass 9-tap Gaussian src → tmp → dst. radius is in texels of a full-scale
 * render; scaled so the blur is the same in design space at any render scale.
 */
export function blur(r, src, tmp, dst, radius = 1) {
  const gl = r.gl, p = r.p.blur;
  const k = radius * r.scale;
  gl.useProgram(p.p);
  tmp.bind();
  setUniforms(gl, p, { uTex: { tex: src.tex, unit: 0 }, uDir: [k / src.w, 0] });
  r.fs.draw();
  dst.bind();
  setUniforms(gl, p, { uTex: { tex: tmp.tex, unit: 0 }, uDir: [0, k / tmp.h] });
  r.fs.draw();
}

/** dst = src · gain (resampled to dst's size; blending as currently enabled). */
export function copy(r, src, dst, gain = 1) {
  const gl = r.gl, p = r.p.copy;
  gl.useProgram(p.p);
  dst.bind();
  setUniforms(gl, p, { uTex: { tex: src.tex, unit: 0 }, uGain: gain });
  r.fs.draw();
}

/** accum += src · w (additive), into the currently bound target. */
export function accumulate(r, src, w) {
  const gl = r.gl;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(r.p.acc.p);
  setUniforms(gl, r.p.acc, { uTex: { tex: src.tex, unit: 0 }, uW: w });
  r.fs.draw();
  gl.disable(gl.BLEND);
}
