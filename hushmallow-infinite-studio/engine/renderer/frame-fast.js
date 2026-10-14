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
//   fgAccum    premultiplied foreground accumulation (P5). The world is constant
//              within a frame, so instead of copying it under every sub-frame
//              (full-res copy + full-res accumulate per sub-frame), each
//              sub-frame's moving layers are drawn over transparent black into
//              FG and accumulated as Σ w·FG; once per frame the sum is
//              composited over the world: accum = Σ w·FG + world·(1 − Σ w·α_FG),
//              which equals Σ w·(FG over world) exactly in real arithmetic. Every
//              pass is scissored to the screen box of what it draws (reflection,
//              glass, mesh, particles), and the Mallow's mirror image is drawn
//              at 1/4 resolution from a 48×48 mesh (it is blurred and
//              ripple-distorted anyway). The frosted glass samples a 1/4-res
//              composite of the world and the foreground so far.

import { assetLog } from '../runtime/asset-log.js';
import { setUniforms } from '../gl.js';
import { blur, copy, accumulate } from './passes/filters.js';
import { drawMallow } from './passes/mesh.js';
import { drawGlass } from './passes/glass.js';
import { drawParticles } from './passes/particles.js';
import { bloom, finish } from './passes/post.js';
import { renderSubExact } from './frame-exact.js';

// ------------------------------------------------------------ boxes (P5) --
// Screen boxes are [x0, y0, x1, y1] in output px, top-down, half-open; null = empty.

const union = (a, b) => (!a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);

/** Box of world-space points [x, y, …] through a camera, grown by pad output px, clamped to the frame. */
function worldBox(r, cam, pts, pad) {
  if (!pts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i], y = pts[i + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const k = r.scale, z = cam.zoom;
  const sx = (x) => ((x - cam.x) * z + r.W / 2) * k, sy = (y) => ((y - cam.y) * z + r.H / 2) * k;
  const b = [Math.floor(sx(x0) - pad), Math.floor(sy(y0) - pad), Math.ceil(sx(x1) + pad), Math.ceil(sy(y1) + pad)];
  b[0] = Math.max(0, b[0]); b[1] = Math.max(0, b[1]); b[2] = Math.min(r.outW, b[2]); b[3] = Math.min(r.outH, b[3]);
  return b[2] > b[0] && b[3] > b[1] ? b : null;
}

/** Vertex positions of a grid mesh as a flat [x, y, …] list (world px). */
function meshPoints({ data, stride, nVerts }) {
  const out = new Array(nVerts * 2);
  for (let v = 0, o = 0; v < nVerts; v++, o += stride) { out[2 * v] = data[o]; out[2 * v + 1] = data[o + 1]; }
  return out;
}

/** Corners of every glass quad (GLASS_VS: (hw + 64, hh + 64) · scale · squash, rotated) as points. */
function glassPoints(list) {
  const out = [];
  for (const b of list) {
    const sq = b.squash || [1, 1];
    const ex = (b.hw + 64) * b.scale * sq[0], ey = (b.hh + 64) * b.scale * sq[1];
    const rad = Math.hypot(ex, ey);
    out.push(b.x - rad, b.y - rad, b.x + rad, b.y + rad);
  }
  return out;
}

function particlePoints(parts) {
  const out = [];
  for (const q of parts.slice(0, 512)) out.push(q.x - q.r, q.y - q.r, q.x + q.r, q.y + q.r);
  return out;
}

/** Apply a box as the GL scissor (GL's y is bottom-up). */
function scissor(r, b) {
  const gl = r.gl;
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(b[0], r.outH - b[3], b[2] - b[0], b[3] - b[1]);
}
const noScissor = (r) => r.gl.disable(r.gl.SCISSOR_TEST);

/** Clear a box of the bound target to transparent black. */
function clearBox(r, b) {
  if (!b) return;
  const gl = r.gl;
  scissor(r, b);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  noScissor(r);
}

/** Largest ripple displacement of the reflection composite, in world px (WATER waterDisp bounds). */
function maxWaterDisp(S) {
  const rip = (S.world.ripples || []).reduce((m, q) => Math.max(m, Math.abs(q.amp)), 0) * 17;
  return rip + 4.5 + 8 * (S.world.agitation || 0) + 2;
}

// ------------------------------------------------------- fgAccum sub-frame --

/** dst (quarter res) = FG + world · (1 − FG.a): the backdrop the frosted glass blurs. */
function backdrop(r, fg, world, dst) {
  const gl = r.gl, p = r.p.under;
  gl.useProgram(p.p);
  dst.bind();
  setUniforms(gl, p, { uFg: { tex: fg.tex, unit: 0 }, uBg: { tex: world.tex, unit: 1 } });
  r.fs.draw();
}

function glassLayer(r, S, list, worldTarget) {
  const T = r.t;
  backdrop(r, T.fg, worldTarget, T.q1);
  blur(r, T.q1, T.q2, T.q1, 2.2);
  T.fg.bind();
  const b = worldBox(r, S.cam, glassPoints(list), 2);
  if (b) scissor(r, b);
  drawGlass(r, S, list, T.q1.tex);
  noScissor(r);
  return b;
}

/** One sub-frame's moving layers over transparent black into T.fg; returns the box it drew in. */
function renderSubFg(r, S, worldTarget) {
  const gl = r.gl, T = r.t, m = r.meter;
  let box = null;
  // FG is transparent outside the previous sub-frame's box: clear just that
  T.fg.bind();
  clearBox(r, r.fgDirty);
  // 1 the Mallow mirrored about its contact line: 48×48 mesh at 1/4 resolution, softened
  m?.begin('sub.reflection');
  T.reflQ.bind();
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  S.buildMesh(r.reflStub, true);
  r.decimate(r.reflStub, r.reflMeshQ);
  drawMallow(r, S, r.reflMeshQ, true);
  blur(r, T.reflQ, T.reflQB, T.reflQ, 0.5);      // = the approved 1.0 at 1/2 resolution, in design px
  m?.end('sub.reflection');
  // 2 the reflection composited onto (transparent) water, only around the mirror image
  m?.begin('sub.composite');
  // reach of the mirror image beyond its mesh: one 1/4-res texel of raster (4 px), the blur
  // (3.23 · 0.5 quarter texels = 6.5 px), bilinear sampling (2 px), plus the ripples' displacement
  const disp = maxWaterDisp(S) * S.cam.zoom * r.scale;
  const rb = worldBox(r, S.cam, meshPoints(r.reflStub), disp + 16 * r.scale + 2);
  if (rb) {
    T.fg.bind();
    scissor(r, rb);
    r.world.compositeReflection(S, T.reflQ.tex);
    noScissor(r);
    box = union(box, rb);
  }
  m?.end('sub.composite');
  // 3 glass behind the Mallow
  if (S.bubblesBack?.length) { m?.begin('sub.glass'); box = union(box, glassLayer(r, S, S.bubblesBack, worldTarget)); m?.end('sub.glass'); }
  // 4 the Mallow
  m?.begin('sub.mesh');
  S.buildMesh(r.mesh, false);
  assetLog.meshMagnification(r.meshRasters, r.mesh, r.artSize, S.cam.zoom * r.scale);
  const mb = worldBox(r, S.cam, meshPoints(r.mesh), 2);
  if (mb) {
    T.fg.bind();
    scissor(r, mb);
    drawMallow(r, S, r.mesh, false);
    noScissor(r);
    box = union(box, mb);
  }
  m?.end('sub.mesh');
  // 5 front glass + particles
  if (S.bubblesFront?.length) { m?.begin('sub.glass'); box = union(box, glassLayer(r, S, S.bubblesFront, worldTarget)); m?.end('sub.glass'); }
  const parts = S.particles || [];
  if (parts.length) {
    m?.begin('sub.particles');
    const pb = worldBox(r, S.cam, particlePoints(parts), 2);
    T.fg.bind();
    drawParticles(r, S, parts);
    box = union(box, pb);
    m?.end('sub.particles');
  }
  r.fgDirty = box;
  return box;
}

// ------------------------------------------------------------------ frame --

export function renderFrameFast(r, subStates, center, overlayCanvas) {
  const gl = r.gl, T = r.t, m = r.meter, f = r.profile.features;
  const face = r.facePass ? r.facePass.plan(subStates, center) : null;
  const wgt = 1 / subStates.length;
  if (!f.fgAccum) {
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
  } else {
    // the world goes straight into the accumulation target; the foreground sum is composited over it at the end
    m?.begin('world');
    r.world.renderWorld(center, T.accum);
    m?.end('world');
    if (face?.once) r.facePass.draw(face.face, face.once);
    T.fgAcc.bind();
    clearBox(r, r.accDirty);
    let frameBox = null;
    subStates.forEach((S, k) => {
      if (face?.perSub) r.facePass.draw(face.face, face.perSub[k]);
      const box = renderSubFg(r, S, T.accum);
      if (box) {
        m?.begin('accum');
        T.fgAcc.bind();
        scissor(r, box);
        accumulate(r, T.fg, wgt);
        noScissor(r);
        m?.end('accum');
        frameBox = union(frameBox, box);
      }
    });
    if (frameBox) {
      m?.begin('composite');
      T.accum.bind();
      scissor(r, frameBox);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      copy(r, T.fgAcc, T.accum);
      gl.disable(gl.BLEND);
      noScissor(r);
      m?.end('composite');
    }
    r.accDirty = frameBox;
  }
  m?.begin('bloom');
  bloom(r, T.accum, center.post);
  m?.end('bloom');
  finish(r, T.accum, center, overlayCanvas);
}
