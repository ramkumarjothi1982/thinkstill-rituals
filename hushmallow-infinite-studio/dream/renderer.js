// Dream stage renderer (WebGL2): several Mallows, emotion orbs and a
// procedural dreamscape, finished with the approved v2 post (bloom, the
// art-preserving tone shoulder, split-tone grade, vignette, grain).
//
// Per output frame:
//   1 sky       the background, once per frame at the frame's centre time → T.bg
//   2 bgBlur    a 1/4-resolution blurred copy (what the glass orbs refract)
//   3 per sub-frame (true motion blur): sky copy, then every Mallow and orb
//               back to front, particles behind and in front → T.scene,
//               averaged into T.accum
//   4 bloom     bright pass at 1/4 resolution, blurred
//   5 post      grade + the type overlay → canvas
//
// Reuses the engine's GL toolkit and the approved v2 shader text for the mesh
// vertex stage, blur, copy, bright pass, accumulation and post.

import { program, setUniforms, texture, updateTexture, target, fullscreen, FS_VERT, gridMesh } from '../engine/gl.js';
import { MESH_VS, BLUR_FS, COPY_FS, BRIGHT_FS, ACC_FS, postFS } from '../engine/renderer/glsl-v2.js';
import { SKY_FS, ORB_VS, ORB_FS, MALLOW_FS, PART_VS, PART_FS } from './glsl.js';

const MAX_PARTS = 2048, PSTRIDE = 10;

export class DreamRenderer {
  constructor(gl, { width = 1080, height = 1920, scale = 1 } = {}) {
    this.gl = gl;
    this.W = width; this.H = height;
    this.outW = Math.round(width * scale); this.outH = Math.round(height * scale);
    const W = this.outW, H = this.outH, q = (v) => Math.max(1, Math.round(v / 4));
    this.fs = fullscreen(gl);
    this.p = {
      sky: program(gl, FS_VERT, SKY_FS, 'sky'),
      orb: program(gl, ORB_VS, ORB_FS, 'orb'),
      mallow: program(gl, MESH_VS, MALLOW_FS, 'mallow'),
      part: program(gl, PART_VS, PART_FS, 'particles'),
      blur: program(gl, FS_VERT, BLUR_FS, 'blur'),
      copy: program(gl, FS_VERT, COPY_FS, 'copy'),
      bright: program(gl, FS_VERT, BRIGHT_FS, 'bright'),
      acc: program(gl, FS_VERT, ACC_FS, 'accumulate'),
      post: program(gl, FS_VERT, postFS(W, H), 'post'),
    };
    this.t = {
      bg: target(gl, W, H, { hdr: true }),
      scene: target(gl, W, H, { hdr: true }),
      accum: target(gl, W, H, { hdr: true }),
      bq1: target(gl, q(W), q(H), { hdr: true }),
      bq2: target(gl, q(W), q(H), { hdr: true }),
      q1: target(gl, q(W), q(H), { hdr: true }),
      q2: target(gl, q(W), q(H), { hdr: true }),
    };
    // unit quad for orbs, and the same quad instanced for particles
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    this.orbVao = gl.createVertexArray();
    gl.bindVertexArray(this.orbVao);
    const qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
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
  }

  /** Register a Mallow: its approved art (and for Noomi the face canvas and derived normal map). */
  addMallow(id, { artImg, faceCanvas = null, normalImg = null, sil, cols = 72, rows = 72 }) {
    const gl = this.gl;
    const m = {
      id, sil, artSize: [artImg.width, artImg.height],
      art: texture(gl, artImg, { mip: true }),
      face: faceCanvas ? texture(gl, faceCanvas, { mip: true }) : null,
      faceCanvas,
      normal: normalImg ? texture(gl, normalImg, { mip: true, premultiply: false }) : null,
      mesh: gridMesh(gl, cols, rows, [2, 2, 1, 1]),
    };
    this.mallows.set(id, m);
    return m;
  }

  updateFace(id) {
    const m = this.mallows.get(id);
    if (m?.face) updateTexture(this.gl, m.face, m.faceCanvas, { mip: true });
  }

  cam(prog, cam) {
    setUniforms(this.gl, prog, { uRes: [this.W, this.H], uFocus: [cam.x, cam.y], uZoom: cam.zoom, uRoll: 0 });
  }

  pass(prog, tgt, uniforms) {
    const gl = this.gl;
    if (tgt) tgt.bind(); else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.outW, this.outH); }
    gl.useProgram(prog.p);
    setUniforms(gl, prog, uniforms);
    this.fs.draw();
  }

  blur(src, tmp, radius = 1) {
    const { blur } = this.p;
    this.pass(blur, tmp, { uTex: { tex: src.tex, unit: 0 }, uDir: [radius / src.w, 0] });
    this.pass(blur, src, { uTex: { tex: tmp.tex, unit: 0 }, uDir: [0, radius / src.h] });
  }

  drawSky(C) {
    const gl = this.gl, P = this.p.sky;
    gl.disable(gl.BLEND);
    this.t.bg.bind();
    gl.useProgram(P.p);
    this.cam(P, C.cam);
    setUniforms(gl, P, C.sky);
    this.fs.draw();
    // what the glass refracts: the sky, soft
    this.pass(this.p.copy, this.t.bq1, { uTex: { tex: this.t.bg.tex, unit: 0 }, uGain: 1 });
    this.blur(this.t.bq1, this.t.bq2, 1.5);
    this.blur(this.t.bq1, this.t.bq2, 2.5);
  }

  drawMallow(S, item) {
    const gl = this.gl, P = this.p.mallow, m = this.mallows.get(item.id);
    item.build(m.mesh);
    gl.useProgram(P.p);
    this.cam(P, S.cam);
    const L = item.light;
    const s = m.sil;
    setUniforms(gl, P, {
      uArt: { tex: m.art, unit: 0 }, uFace: { tex: m.face || this.blank, unit: 1 }, uNormal: { tex: m.normal || this.blank, unit: 2 },
      uHasFace: m.face ? 1 : 0, uHasNormal: m.normal ? 1 : 0,
      uBodyBox: [s.cx, s.baseY, s.halfW, s.h], uArtSize: m.artSize, uFlip: 0,
      uLightDir: L.dir, uKey: L.key, uRim: L.rim, uRimAmt: L.rimAmt, uSpec: L.spec, uSpecCol: L.specCol,
      uGlowCol: L.glowCol, uGlow: L.glow, uAmbient: L.ambient, uSSS: 1,
      uLod: item.lod || 0, uHaze: item.haze || [0, 0, 0, 0], uFade: item.fade ?? 1,
      uEmergeCol: item.emergeCol || [1, 1, 1], uEmerge: item.emerge || 0,
    });
    m.mesh.draw();
  }

  drawOrb(S, o) {
    const gl = this.gl, P = this.p.orb;
    gl.useProgram(P.p);
    this.cam(P, S.cam);
    setUniforms(gl, P, {
      uOrb: [o.x, o.y, o.r, 0], uSquash: o.squash || [1, 1], uKind: o.kind, uReveal: o.reveal, uMorph: o.morph,
      uAlpha: o.alpha, uPh: S.ph, uSeed: o.seed, uGlow: o.glow, uFlash: o.flash || 0, uGlowCol: o.color, uZoom: S.cam.zoom,
      uBg: { tex: this.t.bq1.tex, unit: 0 },
    });
    gl.bindVertexArray(this.orbVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  drawParticles(S, list) {
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
    this.cam(P, S.cam);
    gl.bindVertexArray(this.partVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
    gl.bindVertexArray(null);
  }

  drawSub(S) {
    const gl = this.gl;
    gl.disable(gl.BLEND);
    this.pass(this.p.copy, this.t.scene, { uTex: { tex: this.t.bg.tex, unit: 0 }, uGain: 1 });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.drawParticles(S, S.partsBack);
    const items = [...S.mallows.map((m) => ({ z: m.z, m })), ...S.orbs.map((o) => ({ z: o.z, o }))].sort((a, b) => a.z - b.z);
    for (const it of items) {
      if (it.m) { if ((it.m.fade ?? 1) > 0.002) this.drawMallow(S, it.m); } else if (it.o.alpha > 0.002) this.drawOrb(S, it.o);
    }
    this.drawParticles(S, S.partsFront);
    gl.disable(gl.BLEND);
  }

  frame(subs, C, overlay) {
    const gl = this.gl;
    this.drawSky(C);
    // accumulate the sub-frames
    this.t.accum.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const S of subs) {
      this.drawSub(S);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      this.pass(this.p.acc, this.t.accum, { uTex: { tex: this.t.scene.tex, unit: 0 }, uW: 1 / subs.length });
      gl.disable(gl.BLEND);
    }
    // bloom
    const po = C.post;
    this.pass(this.p.bright, this.t.q1, { uTex: { tex: this.t.accum.tex, unit: 0 }, uThresh: po.bloomThresh });
    this.blur(this.t.q1, this.t.q2, 1.5);
    this.blur(this.t.q1, this.t.q2, 3.0);
    this.blur(this.t.q1, this.t.q2, 5.0);
    // overlay (type) and post
    let ovOn = 0;
    if (overlay) {
      if (!this.overlayTex) this.overlayTex = texture(gl, overlay, { mip: false });
      else updateTexture(gl, this.overlayTex, overlay, { mip: false });
      ovOn = 1;
    }
    this.pass(this.p.post, null, {
      uScene: { tex: this.t.accum.tex, unit: 0 }, uBloom: { tex: this.t.q1.tex, unit: 1 }, uOverlay: { tex: this.overlayTex || this.blank, unit: 2 },
      uExposure: po.exposure, uBloomAmt: po.bloom, uContrast: po.contrast, uSat: po.sat,
      uShadowTint: po.shadowTint, uHighTint: po.highTint, uVignette: po.vignette, uGrain: po.grain, uTime: po.time, uOverlayOn: ovOn,
    });
  }
}
