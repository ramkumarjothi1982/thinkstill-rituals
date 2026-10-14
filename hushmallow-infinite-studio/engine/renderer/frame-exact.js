// The approved v2 frame pipeline (stage2/renderer.js renderSub + renderFrame),
// pass for pass and GL call for GL call. The exact profile renders through it,
// which keeps that profile bit-identical to the goldens. The only additions are
// the optional meter hooks (null in every render, set by hm bench), which issue
// no GL call themselves when absent.

import { assetLog } from '../runtime/asset-log.js';
import { blur, copy, accumulate } from './passes/filters.js';
import { drawMallow } from './passes/mesh.js';
import { drawGlass } from './passes/glass.js';
import { drawParticles } from './passes/particles.js';
import { bloom, finish } from './passes/post.js';

/** One sub-frame (moving things only) over the world → T.scene (HDR). */
export function renderSubExact(r, S) {
  const gl = r.gl, T = r.t, m = r.meter;
  // 1 the Mallow mirrored about its contact line (half res, softened)
  m?.begin('sub.reflection');
  T.refl.bind();
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  S.buildMesh(r.reflMesh, true);
  drawMallow(r, S, r.reflMesh, true);
  blur(r, T.refl, T.reflB, T.refl, 1.0);
  m?.end('sub.reflection');
  // 2 world + reflection
  m?.begin('sub.composite');
  copy(r, T.world, T.scene);
  r.world.compositeReflection(S, T.refl.tex);
  m?.end('sub.composite');
  // 3 glass behind the Mallow (frosted over a blurred copy of the scene)
  if (S.bubblesBack?.length) {
    m?.begin('sub.glass');
    copy(r, T.scene, T.q1);
    blur(r, T.q1, T.q2, T.q1, 2.2);
    T.scene.bind();
    drawGlass(r, S, S.bubblesBack, T.q1.tex);
    m?.end('sub.glass');
  }
  // 4 the Mallow
  m?.begin('sub.mesh');
  S.buildMesh(r.mesh, false);
  assetLog.meshMagnification(r.meshRasters, r.mesh, r.artSize, S.cam.zoom * r.scale);
  T.scene.bind();
  drawMallow(r, S, r.mesh, false);
  m?.end('sub.mesh');
  // 5 front glass + particles
  if (S.bubblesFront?.length) {
    m?.begin('sub.glass');
    copy(r, T.scene, T.q1);
    blur(r, T.q1, T.q2, T.q1, 2.2);
    T.scene.bind();
    drawGlass(r, S, S.bubblesFront, T.q1.tex);
    m?.end('sub.glass');
  }
  m?.begin('sub.particles');
  T.scene.bind();
  drawParticles(r, S, S.particles || []);
  m?.end('sub.particles');
}

/** A full output frame: world, N accumulated sub-frames (face redrawn per sub-frame), bloom, post. */
export function renderFrameExact(r, subStates, center, overlayCanvas) {
  const gl = r.gl, T = r.t, m = r.meter;
  m?.begin('world');
  r.renderWorld(center);
  m?.end('world');
  T.accum.bind();
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const wgt = 1 / subStates.length;
  for (const S of subStates) {
    m?.begin('face.draw');
    const dirty = S.drawFace && S.drawFace();
    m?.end('face.draw');
    if (dirty) { m?.begin('face.upload'); r.updateFace(); m?.end('face.upload'); }
    r.renderSub(S);
    m?.begin('accum');
    T.accum.bind();
    accumulate(r, T.scene, wgt);
    m?.end('accum');
  }
  // bloom: bright pass at 1/4, blur, plus a wider 1/8 blur
  m?.begin('bloom');
  bloom(r, T.accum, center.post);
  m?.end('bloom');
  // finish to the canvas
  finish(r, T.accum, center, overlayCanvas);
}
