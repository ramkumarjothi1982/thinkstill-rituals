// Full-screen helper passes shared by every pipeline: separable blur, copy with
// gain, and the HDR accumulation of one sub-frame. Logic and GL calls are the
// approved v2 renderer's (_blur, _copy and the accumulate step of renderFrame).

import { setUniforms } from '../../gl.js';

/**
 * Two-pass 9-tap Gaussian src → tmp → dst. radius is in texels of a full-scale
 * render; scaled so the blur is the same in design space at any render scale.
 * boxes (optional, P5b tightPasses): { tmp, dst } texel boxes [x0, y0, x1, y1]
 * (top-down) each pass is scissored to; the caller sizes them with blurReach().
 */
export function blur(r, src, tmp, dst, radius = 1, boxes = null) {
  const gl = r.gl, p = r.p.blur;
  const k = radius * r.scale;
  gl.useProgram(p.p);
  tmp.bind();
  if (boxes) scissorTexels(gl, tmp, boxes.tmp);
  setUniforms(gl, p, { uTex: { tex: src.tex, unit: 0 }, uDir: [k / src.w, 0] });
  r.fs.draw();
  dst.bind();
  if (boxes) scissorTexels(gl, dst, boxes.dst);
  setUniforms(gl, p, { uTex: { tex: tmp.tex, unit: 0 }, uDir: [0, k / tmp.h] });
  r.fs.draw();
  if (boxes) gl.disable(gl.SCISSOR_TEST);
}

/** Texels a blur(radius) pass reads on either side of its own: the outer tap (3.23 k) plus the bilinear neighbour. */
export const blurReach = (r, radius) => Math.ceil(3.2307692308 * radius * r.scale) + 1;

/** Scissor to a top-down texel box [x0, y0, x1, y1] of target t (GL's y is bottom-up). */
export function scissorTexels(gl, t, b) {
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(b[0], t.h - b[3], b[2] - b[0], b[3] - b[1]);
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
