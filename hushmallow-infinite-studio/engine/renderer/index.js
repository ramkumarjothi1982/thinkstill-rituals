// Hushmallow Studio renderer (WebGL2).
//
// Per output frame: N sub-frames are rendered into an HDR buffer and
// accumulated (true motion blur), then a filmic finish (bloom, tone mapping,
// split-tone grade, vignette, grain + dither) and the 2D overlay (type) are
// composited to the canvas.
//
// Sub-frame passes
//   1 reflection  Mallow mesh mirrored about its contact line → half-res, blurred
//   2 world       sky + water (once per frame, worlds/lake.js) under the
//                 reflection composite (ripples distort the mirrored Mallow)
//   3 glass(back) thought bubbles behind the Mallow (frosted over a blurred copy)
//   4 mallow      deformed hi-res mesh with deformation-aware lighting
//   5 glass(front), particles
//
// Engine fork of stage2/renderer.js (frozen). WP-01 made design size and render
// scale parameters (uRes stays in design space; targets, viewport, blur texel
// radii and the grain grid follow the output size), cached text textures by
// content (R4), freed GL resources per direction and logged every raster with
// its magnification. WP-02 split it into passes (renderer/passes/*, the world
// in worlds/lake.js) and added quality profiles (render/profiles.js):
//   - the exact profile runs the approved pipeline: the v2 shader text byte for
//     byte (renderer/glsl-v2.js, worlds/glsl/lake-v2.js) and the v2 sequence of
//     passes (frame-exact.js), so it stays bit-identical to the goldens;
//   - optional `meter` hooks ({ begin(name), end(name) }) around every pass, for
//     hm bench (tools/bench.mjs supplies them; the engine reads no clock).

import { program, setUniforms, texture, updateTexture, target, fullscreen, FS_VERT, gridMesh } from '../gl.js';
import { assetLog } from '../runtime/asset-log.js';
import { canvasKey } from '../runtime/hash.js';
import { resolveProfile } from '../render/profiles.js';
import { LakeWorld } from '../worlds/lake.js';
import { meshFS, UNDER_FS } from './glsl-fast.js';
import { MESH_VS, MESH_FS, BLUR_FS, COPY_FS, BRIGHT_FS, GLASS_VS, GLASS_FS, PART_VS, PART_FS, postFS, ACC_FS } from './glsl-v2.js';
import { renderFrameExact, renderSubExact } from './frame-exact.js';
import { renderFrameFast } from './frame-fast.js';
import { FacePass } from './passes/face.js';
import { bakeRestNormals, alphaOf, trimmedIndex, indexedGrid } from './passes/normals.js';

/** The design space of the approved v2 (and the default of every direction). */
export const DESIGN_W = 1080, DESIGN_H = 1920;

/**
 * R14: the mirrored reflection pass ignores camera roll, so a rolled camera
 * would put the reflection in the wrong place. Brand rules forbid roll anyway
 * (the composer has no roll channel); the renderer refuses it instead of
 * drawing a wrong frame.
 */
export function assertNoRoll(cam) {
  if (cam.roll) throw new Error(`camera roll ${cam.roll} is not supported: the reflection pass ignores roll (R14) and brand rules forbid it`);
}

export class Renderer {
  /**
   * opts: { width, height } design space (default 1080×1920); scale: render scale
   * (output = round(width·scale) × round(height·scale)); marks: a runtime/marks.js
   * instance drawn after post (or null); textKeys: 'content' (default) or 'legacy'
   * (stage2's cache by caller key alone; only for the R4 sensitivity test);
   * profile: a resolved render/profiles.js profile (default: exact).
   */
  constructor(gl, { width = DESIGN_W, height = DESIGN_H, scale = 1, marks = null, textKeys = 'content', profile = resolveProfile('exact') } = {}) {
    if (!(width > 0 && height > 0 && scale > 0)) throw new Error(`bad render size ${width}x${height} @ ${scale}`);
    this.gl = gl;
    this.W = width; this.H = height; this.scale = scale;
    this.outW = Math.round(width * scale); this.outH = Math.round(height * scale);
    this.marks = marks;
    this.profile = profile;
    this.meter = null;                    // { begin(name), end(name) } from hm bench, or null
    if (textKeys !== 'content' && textKeys !== 'legacy') throw new Error(`textKeys must be content|legacy, got ${textKeys}`);
    this.textKeys = textKeys;
    const W = this.outW, H = this.outH;
    const sz = (v, d) => Math.max(1, Math.round(v / d));
    this.fs = fullscreen(gl);
    this.world = new LakeWorld(this, { fast: !!profile.features.worldFast });
    this.p = {
      mesh: program(gl, MESH_VS, profile.features.faceFastGlow || profile.features.meshNormalTex
        ? meshFS({ faceBox: !!profile.features.faceFastGlow, normalTex: !!profile.features.meshNormalTex }) : MESH_FS, 'mesh'),
      blur: program(gl, FS_VERT, BLUR_FS, 'blur'),
      copy: program(gl, FS_VERT, COPY_FS, 'copy'),
      bright: program(gl, FS_VERT, BRIGHT_FS, 'bright'),
      glass: program(gl, GLASS_VS, GLASS_FS, 'glass'),
      part: program(gl, PART_VS, PART_FS, 'particles'),
      post: program(gl, FS_VERT, postFS(W, H), 'post'),
      acc: program(gl, FS_VERT, ACC_FS, 'accumulate'),
    };
    this.t = {
      world: target(gl, W, H, { hdr: true }),
      scene: target(gl, W, H, { hdr: true }),
      accum: target(gl, W, H, { hdr: true }),
      refl: target(gl, sz(W, 2), sz(H, 2), { hdr: true }),
      reflB: target(gl, sz(W, 2), sz(H, 2), { hdr: true }),
      q1: target(gl, sz(W, 4), sz(H, 4), { hdr: true }),
      q2: target(gl, sz(W, 4), sz(H, 4), { hdr: true }),
      e1: target(gl, sz(W, 8), sz(H, 8), { hdr: true }),
      e2: target(gl, sz(W, 8), sz(H, 8), { hdr: true }),
    };
    // quad VAO for glass/particles
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.instBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * 7 * 512, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 28, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
    this.quadVao = vao;
    this.instData = new Float32Array(7 * 512);
    // text textures: the cache is keyed by content hash (R4); textTex maps the key a
    // direction asked for to the texture it got, for introspection (golden probes)
    this.texCache = new Map();
    this.textTex = new Map();
    // the fast pipeline and its passes (profile features; none in the exact profile)
    const f = profile.features;
    this.facePass = f.faceCache ? new FacePass(this, { fast: !!f.faceFastGlow }) : null;
    if (f.fgAccum) {
      // P5: the foreground of one sub-frame, its weighted sum, and the 1/4-res mirror image
      this.t.fg = target(gl, W, H, { hdr: true });
      this.t.fgAcc = target(gl, W, H, { hdr: true });
      this.t.reflQ = target(gl, sz(W, 4), sz(H, 4), { hdr: true });
      this.t.reflQB = target(gl, sz(W, 4), sz(H, 4), { hdr: true });
      this.p.under = program(gl, FS_VERT, UNDER_FS, 'under');
      this.fgDirty = this.accDirty = null;      // boxes still to clear in fg / fgAcc (textures start zeroed)
    }
    this.fastPipeline = !!(this.facePass || f.fgAccum);
  }

  setMallow({ artImg, pristineImg, faceCanvas, normalImg, cols = 96, rows = 96 }) {
    const gl = this.gl;
    this.disposeMallow();                    // a second setMallow no longer leaks the first (R4)
    this.artTex = texture(gl, artImg, { mip: true });
    this.pristineTex = pristineImg ? texture(gl, pristineImg, { mip: true }) : this.artTex;
    this.faceCanvas = faceCanvas;
    this.faceTex = texture(gl, faceCanvas, { mip: true });
    this.normalTex = normalImg ? texture(gl, normalImg, { mip: true, premultiply: false }) : null;
    this.mesh = gridMesh(gl, cols, rows, [2, 2, 1, 1]);
    this.reflMesh = gridMesh(gl, cols, rows, [2, 2, 1, 1]);
    if (this.profile.features.fgAccum) {
      // P5: the mirror image from a half-density grid: built at full density on the CPU, then decimated
      this.reflMeshQ = gridMesh(gl, cols / 2, rows / 2, [2, 2, 1, 1]);
      this.reflStub = { cols, rows, stride: 6, nVerts: (cols + 1) * (rows + 1), data: new Float32Array((cols + 1) * (rows + 1) * 6), upload() {} };
    }
    this.artSize = [artImg.width, artImg.height];
    // every raster drawn through the Mallow mesh shares its UVs, so they share its magnification
    this.meshRasters = ['art', ...(pristineImg ? ['pristine'] : []), 'face', ...(normalImg ? ['normal'] : [])];
    if (this.profile.features.meshNormalTex) {
      // P7: which grid cells can show anything (trimmed on the first frame, once the face box is known)
      this.meshAlphas = [alphaOf(artImg), ...(pristineImg ? [alphaOf(pristineImg)] : [])];
    }
    assetLog.texture('art', artImg);
    if (pristineImg) assetLog.texture('pristine', pristineImg);
    assetLog.texture('face', faceCanvas, { procedural: true });
    if (normalImg) assetLog.texture('normal', normalImg);
  }

  /** Free the current Mallow's textures and meshes (no-op without one). */
  disposeMallow() {
    const gl = this.gl;
    if (!this.artTex) return;
    for (const t of new Set([this.artTex, this.pristineTex, this.faceTex, this.normalTex])) if (t) gl.deleteTexture(t);
    this.mesh?.dispose();
    this.reflMesh?.dispose();
    this.reflMeshQ?.dispose();
    this.facePass?.dispose();
    if (this.n0) { gl.deleteTexture(this.n0.tex); gl.deleteFramebuffer(this.n0.fb); }
    this.n0 = this.n0Box = this.meshAlphas = null;
    this.artTex = this.pristineTex = this.faceTex = this.normalTex = this.faceCanvas = this.mesh = this.reflMesh = this.reflMeshQ = null;
  }

  /** Free everything a direction created: Mallow, text textures, overlay. Programs and targets stay. */
  disposeScene() {
    const gl = this.gl;
    this.disposeMallow();
    for (const t of this.texCache.values()) gl.deleteTexture(t);
    this.texCache.clear();
    this.textTex.clear();
    if (this.overlayTex) { gl.deleteTexture(this.overlayTex); this.overlayTex = null; }
    // P5: the next direction starts from fully cleared foreground buffers
    if (this.t.fg) this.fgDirty = this.accDirty = [0, 0, this.outW, this.outH];
  }

  /**
   * P7: bake the rest normals for the Mallow's body box (again if it changes),
   * and on the first frame swap the mesh for one that draws only the cells
   * that can show anything (the face boxes the face pass has seen are kept).
   */
  prepareMeshPass(center) {
    const bb = center.mallow?.bodyBox;
    if (bb && (!this.n0 || this.n0Box.some((v, i) => v !== bb[i]))) {
      if (this.n0) { this.gl.deleteTexture(this.n0.tex); this.gl.deleteFramebuffer(this.n0.fb); }
      this.n0 = bakeRestNormals(this, bb);
      this.n0Box = [...bb];
    }
    if (this.meshAlphas && this.mesh) {
      const keep = this.facePass ? [...this.facePass.quantisers.keys()].map((face) => face.box) : [];
      const { cols, rows } = this.mesh;
      const trimmed = indexedGrid(this.gl, cols, rows, [2, 2, 1, 1], trimmedIndex(cols, rows, this.meshAlphas, { keep }));
      this.mesh.dispose();
      this.mesh = trimmed;
      this.meshAlphas = null;
    }
  }

  /** Copy every other vertex of a full-density grid (src, CPU) into a half-density mesh and upload it. */
  decimate(src, dst) {
    const k = src.cols / dst.cols, st = src.stride, row = src.cols + 1;
    if (!Number.isInteger(k) || dst.stride !== st) throw new Error(`cannot decimate a ${src.cols}-grid into a ${dst.cols}-grid`);
    for (let j = 0, o = 0; j <= dst.rows; j++) {
      for (let i = 0; i <= dst.cols; i++, o += st) {
        const s = (j * k * row + i * k) * st;
        for (let c = 0; c < st; c++) dst.data[o + c] = src.data[s + c];
      }
    }
    dst.upload();
  }

  updateFace() { updateTexture(this.gl, this.faceTex, this.faceCanvas, { mip: true }); }

  /**
   * A mip-mapped texture for a 2D canvas (bubble text, cards). Cached by the
   * canvas CONTENT, so equal content shares one texture and different content
   * can never be served from another direction's cache entry under the same key.
   */
  textTexture(key, canvas) {
    const ck = this.textKeys === 'legacy' ? `legacy:${key}` : canvasKey(canvas);
    let t = this.texCache.get(ck);
    if (!t) {
      t = texture(this.gl, canvas, { mip: true });
      this.texCache.set(ck, t);
      assetLog.texture(`text:${key}`, canvas, { procedural: true, contentKey: ck });
    }
    this.textTex.set(key, t);
    return t;
  }

  /** Camera uniforms of a pass (uRes stays in design space). flip: the reflection pass, which ignores roll. */
  cam(prog, cam, flip = false) {
    setUniforms(this.gl, prog, { uRes: [this.W, this.H], uFocus: [cam.x, cam.y], uZoom: cam.zoom, uRoll: flip ? 0 : cam.roll || 0 });
  }

  /** Sky + lake (everything that barely moves within a frame) → T.world. */
  renderWorld(S) { this.world.renderWorld(S, this.t.world); }

  /** One sub-frame (moving things only) over the world → T.scene (HDR). */
  renderSub(S) { renderSubExact(this, S); }

  /** Render a full output frame from sub-frame states, finish and composite. */
  renderFrame(subStates, center, overlayCanvas) {
    for (const S of subStates) assertNoRoll(S.cam);
    assertNoRoll(center.cam);
    if (this.fastPipeline) renderFrameFast(this, subStates, center, overlayCanvas);
    else renderFrameExact(this, subStates, center, overlayCanvas);
  }
}
