// dream2 renderer (WebGL2): a projected, layered Hushfold world with the seven
// Mallows, the emotion orbs and particles; finished with the approved v2 post.
//
// Per output frame:
//   1 sky       above-horizon world at the frame's centre time → T.sky
//   2 refl      the characters mirrored in the lake, half resolution → T.refl
//   3 lake      sky + mirror lake + reflections + mist → T.bg
//   4 bgBlur    1/4-res blur of T.bg: what the glass orbs refract
//   5 per sub-frame (true motion blur): only the moving foreground (particles,
//               Mallows, orbs, back to front) → T.fg, averaged into T.fgAcc
//   6 compose   T.bg under T.fgAcc → T.scene;  7 bloom;  8 post + type → canvas
// Characters are placed by the direction in screen space (dream2/camera.js
// projects them), so every pass draws with the identity camera.

import { program, setUniforms, texture, updateTexture, target, fullscreen, FS_VERT, gridMesh } from '../engine/gl.js';
import { MESH_VS, BLUR_FS, COPY_FS, BRIGHT_FS, ACC_FS, postFS } from '../engine/renderer/glsl-v2.js';
import { SKY_FS, LAKE_FS, ORB_VS, ORB_FS, MALLOW_FS, PART_VS, PART_FS, COMPOSE_FS } from './glsl.js';

const MAX_PARTS = 4096, PSTRIDE = 10;
const IDCAM = { x: 540, y: 960, zoom: 1 };

export class Dream2Renderer {
  constructor(gl, { width = 1080, height = 1920, scale = 1 } = {}) {
    this.gl = gl;
    this.W = width; this.H = height;
    this.outW = Math.round(width * scale); this.outH = Math.round(height * scale);
    const W = this.outW, H = this.outH, s = (v, d) => Math.max(1, Math.round(v / d));
    this.fs = fullscreen(gl);
    this.p = {
      sky: program(gl, FS_VERT, SKY_FS, 'sky'),
      lake: program(gl, FS_VERT, LAKE_FS, 'lake'),
      orb: program(gl, ORB_VS, ORB_FS, 'orb'),
      mallow: program(gl, MESH_VS, MALLOW_FS, 'mallow'),
      part: program(gl, PART_VS, PART_FS, 'particles'),
      blur: program(gl, FS_VERT, BLUR_FS, 'blur'),
      copy: program(gl, FS_VERT, COPY_FS, 'copy'),
      bright: program(gl, FS_VERT, BRIGHT_FS, 'bright'),
      acc: program(gl, FS_VERT, ACC_FS, 'accumulate'),
      compose: program(gl, FS_VERT, COMPOSE_FS, 'compose'),
      post: program(gl, FS_VERT, postFS(W, H), 'post'),
    };
    this.t = {
      sky: target(gl, s(W, 2), s(H, 2), { hdr: true }),      // the sky is soft: half resolution (stars are added at full resolution in the lake pass)
      bg: target(gl, W, H, { hdr: true }),
      refl: target(gl, s(W, 2), s(H, 2), { hdr: true }),
      reflB: target(gl, s(W, 2), s(H, 2), { hdr: true }),
      bq1: target(gl, s(W, 4), s(H, 4), { hdr: true }),
      bq2: target(gl, s(W, 4), s(H, 4), { hdr: true }),
      fg: target(gl, W, H, { hdr: true }),
      fgAcc: target(gl, W, H, { hdr: true }),
      scene: target(gl, W, H, { hdr: true }),
      q1: target(gl, s(W, 4), s(H, 4), { hdr: true }),
      q2: target(gl, s(W, 4), s(H, 4), { hdr: true }),
    };
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    this.orbVao = gl.createVertexArray();
    gl.bindVertexArray(this.orbVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.partVao = gl.createVertexArray();
    gl.bindVertexArray(this.partVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.partBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * PSTRIDE * MAX_PARTS, gl.DYNAMIC_DRAW);
    for (const [loc, n, off] of [[1, 4, 0], [2, 4, 4], [3, 2, 8]]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, PSTRIDE * 4, off * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);
    this.partData = new Float32Array(PSTRIDE * MAX_PARTS);
    this.mallows = new Map();
    this.overlayTex = null;
    this.blank = texture(gl, Object.assign(document.createElement('canvas'), { width: 1, height: 1 }), { mip: false });
    this.stats = { skinUploads: 0 };
  }

  /**
   * Register a Mallow. artImg: an image or canvas (a rig skin canvas is re-uploaded with updateArt);
   * faceCanvas / normalImg: Noomi's hi-res face and derived normal map.
   */
  addMallow(id, { artImg, faceCanvas = null, normalImg = null, sil, cols = 64, rows = 64 }) {
    const gl = this.gl;
    const m = {
      id, sil, artSize: [artImg.width, artImg.height], artImg,
      art: texture(gl, artImg, { mip: true }),
      face: faceCanvas ? texture(gl, faceCanvas, { mip: true }) : null, faceCanvas,
      normal: normalImg ? texture(gl, normalImg, { mip: true, premultiply: false }) : null,
      mesh: gridMesh(gl, cols, rows, [2, 2, 1, 1]),
    };
    this.mallows.set(id, m);
    return m;
  }

  updateArt(id) { const m = this.mallows.get(id); updateTexture(this.gl, m.art, m.artImg, { mip: true }); this.stats.skinUploads++; }
  updateFace(id) { const m = this.mallows.get(id); if (m?.face) updateTexture(this.gl, m.face, m.faceCanvas, { mip: true }); }

  cam(prog) { setUniforms(this.gl, prog, { uRes: [this.W, this.H], uFocus: [IDCAM.x, IDCAM.y], uZoom: IDCAM.zoom, uRoll: 0 }); }

  pass(prog, tgt, uniforms) {
    const gl = this.gl;
    if (tgt) tgt.bind(); else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.outW, this.outH); }
    gl.useProgram(prog.p);
    setUniforms(gl, prog, uniforms);
    this.fs.draw();
  }

  blur(src, tmp, radius = 1) {
    this.pass(this.p.blur, tmp, { uTex: { tex: src.tex, unit: 0 }, uDir: [radius / src.w, 0] });
    this.pass(this.p.blur, src, { uTex: { tex: tmp.tex, unit: 0 }, uDir: [0, radius / src.h] });
  }

  clear(tgt) { const gl = this.gl; tgt.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }

  drawMallow(item, reflect = false) {
    const gl = this.gl, P = this.p.mallow, m = this.mallows.get(item.id);
    if (reflect) item.buildRefl(m.mesh); else item.build(m.mesh);
    gl.useProgram(P.p);
    this.cam(P);
    const L = item.light, s = m.sil;
    setUniforms(gl, P, {
      uArt: { tex: m.art, unit: 0 }, uFace: { tex: m.face || this.blank, unit: 1 }, uNormal: { tex: m.normal || this.blank, unit: 2 },
      uHasFace: m.face ? 1 : 0, uHasNormal: m.normal ? 1 : 0,
      uBodyBox: [s.cx, s.baseY, s.halfW, s.h], uArtSize: m.artSize, uFlip: 0,
      uLightDir: L.dir, uKey: L.key, uRim: L.rim, uRimAmt: L.rimAmt, uSpec: L.spec, uSpecCol: L.specCol,
      uGlowCol: L.glowCol, uGlow: L.glow, uAmbient: L.ambient, uSSS: 1,
      uLod: (item.lod || 0) + (reflect ? 1 : 0), uHaze: item.haze || [0, 0, 0, 0], uFade: (item.fade ?? 1) * (reflect ? 0.85 : 1),
      uEmergeCol: item.emergeCol || [1, 1, 1], uEmerge: item.emerge || 0,
      uSpill: item.spill || [0, 0, 0, 0], uSpillSide: item.spillSide || 0, uReflect: reflect ? 1 : 0,
    });
    m.mesh.draw();
  }

  drawOrb(S, o, reflect = false) {
    const gl = this.gl, P = this.p.orb;
    gl.useProgram(P.p);
    this.cam(P);
    const sq = o.squash || [1, 1];
    setUniforms(gl, P, {
      uOrb: [o.x, reflect ? o.ry : o.y, o.r, 0], uSquash: reflect ? [sq[0], -sq[1]] : sq, uKind: o.kind, uReveal: o.reveal, uMorph: o.morph,
      uAlpha: o.alpha * (reflect ? 0.7 : 1), uPh: S.ph, uSeed: o.seed, uGlow: o.glow, uFlash: o.flash || 0, uGlowCol: o.color, uZoom: 1,
      uBg: { tex: this.t.bq1.tex, unit: 0 },
    });
    gl.bindVertexArray(this.orbVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  drawParticles(list) {
    if (!list || !list.length) return;
    const gl = this.gl, P = this.p.part, d = this.partData;
    const n = Math.min(MAX_PARTS, list.length);
    for (let i = 0; i < n; i++) {
      const p = list[i], o = i * PSTRIDE;
      d[o] = p.x; d[o + 1] = p.y; d[o + 2] = p.r; d[o + 3] = p.a;
      d[o + 4] = p.c[0]; d[o + 5] = p.c[1]; d[o + 6] = p.c[2]; d[o + 7] = p.kind || 0;
      d[o + 8] = p.rot || 0; d[o + 9] = p.aspect || 1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d, 0, n * PSTRIDE);
    gl.useProgram(P.p);
    this.cam(P);
    gl.bindVertexArray(this.partVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
    gl.bindVertexArray(null);
  }

  /** Everything in one depth-sorted list: Mallows, orbs and particle groups (each with z). */
  drawLayer(S, reflect = false) {
    const items = [];
    for (const m of S.mallows) if ((m.fade ?? 1) > 0.002 && (!reflect || m.buildRefl)) items.push({ z: m.z, m });
    for (const o of S.orbs) if (o.alpha > 0.002 && (!reflect || o.ry != null)) items.push({ z: o.z, o });
    if (!reflect) for (const g of S.parts || []) items.push({ z: g.z, g });
    items.sort((a, b) => b.z - a.z);                     // far (large z) first
    for (const it of items) {
      if (it.m) this.drawMallow(it.m, reflect);
      else if (it.o) this.drawOrb(S, it.o, reflect);
      else this.drawParticles(it.g.list);
    }
  }

  frame(subs, C, overlay) {
    const gl = this.gl, Wd = C.world;
    const head = { uRes: [this.W, this.H], uCam: [C.cam.x, C.cam.h, C.cam.z], uHorizon: C.cam.horizon, uPh: C.ph };
    gl.disable(gl.BLEND);
    this.pass(this.p.sky, this.t.sky, { ...head, ...Wd.sky });
    // what the mirrored orbs refract: this frame's sky (never the previous frame's background)
    this.pass(this.p.copy, this.t.bq1, { uTex: { tex: this.t.sky.tex, unit: 0 }, uGain: 1 });
    this.blur(this.t.bq1, this.t.bq2, 1.5);
    // reflections of the characters, at the frame's centre time
    this.clear(this.t.refl);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.drawLayer(C, true);
    gl.disable(gl.BLEND);
    this.blur(this.t.refl, this.t.reflB, 1.2);
    const { uRip, ...lake } = Wd.lake;
    gl.useProgram(this.p.lake.p);
    gl.uniform4fv(this.p.lake.u.uRip, uRip);              // vec4[8]: setUniforms only knows scalars and vectors
    this.pass(this.p.lake, this.t.bg, { ...head, ...lake, uStars: Wd.sky.uStars, uSky: { tex: this.t.sky.tex, unit: 0 }, uRefl: { tex: this.t.refl.tex, unit: 1 } });
    // what the orbs refract
    this.pass(this.p.copy, this.t.bq1, { uTex: { tex: this.t.bg.tex, unit: 0 }, uGain: 1 });
    this.blur(this.t.bq1, this.t.bq2, 1.5);
    this.blur(this.t.bq1, this.t.bq2, 2.5);
    // the moving foreground, sub-frame by sub-frame
    this.clear(this.t.fgAcc);
    for (const S of subs) {
      this.clear(this.t.fg);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this.drawLayer(S);
      gl.blendFunc(gl.ONE, gl.ONE);
      this.pass(this.p.acc, this.t.fgAcc, { uTex: { tex: this.t.fg.tex, unit: 0 }, uW: 1 / subs.length });
      gl.disable(gl.BLEND);
    }
    this.pass(this.p.compose, this.t.scene, { uBg: { tex: this.t.bg.tex, unit: 0 }, uFg: { tex: this.t.fgAcc.tex, unit: 1 } });
    // bloom
    const po = C.post;
    this.pass(this.p.bright, this.t.q1, { uTex: { tex: this.t.scene.tex, unit: 0 }, uThresh: po.bloomThresh });
    this.blur(this.t.q1, this.t.q2, 1.5);
    this.blur(this.t.q1, this.t.q2, 3.0);
    this.blur(this.t.q1, this.t.q2, 5.0);
    let ovOn = 0;
    if (overlay) {
      if (!this.overlayTex) this.overlayTex = texture(gl, overlay, { mip: false });
      else updateTexture(gl, this.overlayTex, overlay, { mip: false });
      ovOn = 1;
    }
    this.pass(this.p.post, null, {
      uScene: { tex: this.t.scene.tex, unit: 0 }, uBloom: { tex: this.t.q1.tex, unit: 1 }, uOverlay: { tex: this.overlayTex || this.blank, unit: 2 },
      uExposure: po.exposure, uBloomAmt: po.bloom, uContrast: po.contrast, uSat: po.sat,
      uShadowTint: po.shadowTint, uHighTint: po.highTint, uVignette: po.vignette, uGrain: po.grain, uTime: po.time, uOverlayOn: ovOn,
    });
  }
}
