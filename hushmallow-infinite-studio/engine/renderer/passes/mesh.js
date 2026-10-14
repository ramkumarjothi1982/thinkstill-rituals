// The Mallow mesh pass: the deformed hi-res art (clean body + procedural face,
// cross-faded to the pristine painting at rest), relit relative to the baked
// art lighting. flip draws the mirrored copy for the lake reflection (camera
// roll is never applied to it, see assertNoRoll in renderer/index.js).
//
// Logic and GL calls are the approved v2 renderer's _drawMallow.

import { setUniforms } from '../../gl.js';

export function drawMallow(r, S, mesh, flip) {
  const gl = r.gl, p = r.p.mesh, m = S.mallow;
  gl.useProgram(p.p);
  r.cam(p, S.cam, flip);
  setUniforms(gl, p, {
    // the fast face (faceFastGlow) lives in a texture the size of the face box, placed by uFaceBox
    uArt: { tex: r.artTex, unit: 0 }, uFace: { tex: r.facePass?.boxTex || r.faceTex, unit: 1 }, uFaceBox: r.facePass?.boxUv || [0, 0, 1, 1],
    uNormal: { tex: r.normalTex || r.artTex, unit: 2 }, uHasNormal: r.normalTex ? 1 : 0,
    uBodyBox: m.bodyBox, uArtSize: r.artSize,
    uLightDir: m.light.dir, uKey: m.light.key, uRim: m.light.rim, uRimAmt: m.light.rimAmt,
    uSpec: m.light.spec, uSpecCol: m.light.specCol, uGlowCol: m.light.glowCol, uGlow: m.light.glow,
    uAmbient: m.light.ambient, uSSS: m.light.sss, uReflect: flip ? 1 : 0, uExposure: 1,
    uPristine: { tex: r.pristineTex, unit: 3 }, uRest: m.rest || 0,
    uN0: r.n0 ? { tex: r.n0.tex, unit: 4 } : undefined,            // P7: baked rest normals
  });
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  mesh.draw();
  gl.disable(gl.BLEND);
}
