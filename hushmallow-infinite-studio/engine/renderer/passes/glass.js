// Glass thought bubbles: frosted SDF rounded rects over a blurred copy of what
// is behind them. Logic and GL calls are the approved v2 renderer's _drawGlass.

import { setUniforms } from '../../gl.js';
import { assetLog } from '../../runtime/asset-log.js';

export function drawGlass(r, S, list, blurTex) {
  const gl = r.gl, p = r.p.glass;
  gl.useProgram(p.p);
  r.cam(p, S.cam);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(r.quadVao);
  assetLog.glassMagnification(list, S.cam.zoom * r.scale);   // the text rasters' magnification (asset log; no pixel effect)
  for (const b of list) {
    setUniforms(gl, p, {
      uRect: [b.x, b.y, b.hw, b.hh], uScale: b.scale, uSquash: b.squash || [1, 1], uRot: b.rot || 0,
      uRadius: b.radius, uAlpha: b.alpha, uTextAlpha: b.textAlpha,
      uBlur: { tex: blurTex, unit: 0 }, uText: { tex: b.textTex, unit: 1 },
      uTint: b.tint || [0.93, 0.92, 1.0], uEdge: b.edge || [1, 1, 1], uStress: b.stress || 0, uGlowUp: b.glowUp || 0,
    });
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  gl.bindVertexArray(null);
  gl.disable(gl.BLEND);
}
