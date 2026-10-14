// The frame finish: bloom (bright pass at 1/4, blurred, plus a wider 1/8 blur),
// then the post pass to the canvas (tone shoulder, split-tone grade, vignette,
// the 2D overlay, grain + dither) and the optional corner mark.
//
// Logic and GL calls are the approved v2 renderer's renderFrame tail.

import { setUniforms, texture, updateTexture } from '../../gl.js';
import { blur, copy } from './filters.js';

/**
 * Bloom from `src` (the accumulated HDR frame) into T.q2. eighth: the wide 1/8
 * blur (off in the draft profile, whose bloom is the 1/4 blur at the same total
 * weight, 0.7 + 0.6).
 */
export function bloom(r, src, post, { eighth = true } = {}) {
  const gl = r.gl, T = r.t;
  gl.useProgram(r.p.bright.p);
  T.q1.bind();
  setUniforms(gl, r.p.bright, { uTex: { tex: src.tex, unit: 0 }, uThresh: post.bloomThresh });
  r.fs.draw();
  blur(r, T.q1, T.q2, T.q1, 1.6);
  blur(r, T.q1, T.q2, T.q1, 3.2);
  if (!eighth) { copy(r, T.q1, T.q2, 1.3); return; }
  copy(r, T.q1, T.e1);
  blur(r, T.e1, T.e2, T.e1, 2.5);
  copy(r, T.e1, T.q2, 0.6);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  copy(r, T.q1, T.q2, 0.7);
  gl.disable(gl.BLEND);
}

/** Upload the overlay canvas into the renderer's overlay texture (created on first use). */
export function uploadOverlay(r, overlayCanvas) {
  const gl = r.gl;
  if (!r.overlayTex) r.overlayTex = texture(gl, overlayCanvas, { mip: false });
  else updateTexture(gl, r.overlayTex, overlayCanvas, { mip: false });
}

/**
 * Post-process `src` + bloom (T.q2) + overlay to the canvas, then the corner
 * mark. overlayCanvas: uploaded and composited (null: no overlay this frame).
 */
export function finish(r, src, center, overlayCanvas) {
  const gl = r.gl, T = r.t, post = center.post;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, r.outW, r.outH);
  const m = r.meter;
  if (overlayCanvas) { m?.begin('overlay.upload'); uploadOverlay(r, overlayCanvas); m?.end('overlay.upload'); }
  const overlayOn = !!overlayCanvas;
  m?.begin('post');
  const pp = r.p.post;
  gl.useProgram(pp.p);
  setUniforms(gl, pp, {
    uScene: { tex: src.tex, unit: 0 }, uBloom: { tex: T.q2.tex, unit: 1 },
    uOverlay: { tex: r.overlayTex || T.q2.tex, unit: 2 }, uOverlayOn: overlayOn ? 1 : 0,
    uExposure: post.exposure, uBloomAmt: post.bloom, uContrast: post.contrast, uSat: post.sat,
    uShadowTint: post.shadowTint, uHighTint: post.highTint, uVignette: post.vignette, uGrain: post.grain, uTime: post.time,
  });
  r.fs.draw();
  // after post: grain, grade and vignette never touch the mark
  if (r.marks) r.marks.draw(gl, r.outW, r.outH, r.scale);
  m?.end('post');
}
