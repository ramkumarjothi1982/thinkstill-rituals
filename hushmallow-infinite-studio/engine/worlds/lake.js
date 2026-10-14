// The lake world (Moonmilk Cove in v2): a moonlit sky over mirror-still water.
//
// Two passes, following the plan's world-module interface:
//   renderWorld(S)        sky + water, once per frame from the centre state,
//                         into the renderer's HDR world target
//   compositeReflection   per sub-frame: the Mallow's mirrored copy (rendered
//                         by the renderer into a small target) composited onto
//                         the water, distorted by the same ripples
//
// The exact profile compiles the approved v2 shader text (glsl/lake-v2.js).
// With the profile feature worldFast (P4) the world pass is split in two
// (glsl/sky.js): the sky is rendered once into a half-float layer, only where
// each of its terms can be non-zero, and the water samples that layer for its
// mirror image instead of evaluating the whole sky a second time. With
// worldPasses (P4b) the work is split by region with scissored draws instead
// of branches (SwiftShader runs both sides of a branch): the sky layer's
// smooth terms at 1/2 resolution, the stars, hills and moon each only where
// they are, and the water shader only from the horizon's row down.

import { program, setUniforms, target, FS_VERT } from '../gl.js';
import { WORLD_FS, REFL_FS } from './glsl/lake-v2.js';
import { skyFS, skyLowFS, skyComposeFS, SKY_COPY_FS, worldFastFS } from './glsl/sky.js';

/** Screen px below the horizon the sky layer also covers: the mirror's ripple displacement (≤ ~15 px) plus room. */
export const SKY_MARGIN = 48;

export class LakeWorld {
  /**
   * r: the renderer (gl, cam(), fs, sizes). opts.fast: the worldFast variant;
   * opts.split: the fast world's passes split by region (worldPasses, P4b);
   * opts.octaves / opts.clouds: draft quality (fbm octaves, stratus on/off).
   */
  constructor(r, { fast = false, split = false, octaves = 5, clouds = true } = {}) {
    this.r = r;
    this.fast = fast;
    this.split = fast && split;
    const gl = r.gl;
    this.p = {
      world: program(gl, FS_VERT, WORLD_FS, 'world'),
      refl: program(gl, FS_VERT, REFL_FS, 'reflection'),
    };
    if (fast) {
      this.p.sky = program(gl, FS_VERT, skyFS({ octaves, clouds }), 'sky');
      this.p.worldFast = program(gl, FS_VERT, worldFastFS({ octaves }), 'world-fast');
      this.skyLayer = target(gl, r.outW, r.outH, { hdr: true });
    }
    if (this.split) {
      this.p.skyLow = program(gl, FS_VERT, skyLowFS({ octaves, clouds }), 'sky-low');
      for (const part of ['plain', 'hills', 'moon']) this.p[`sky-${part}`] = program(gl, FS_VERT, skyComposeFS({ octaves, part }), `sky-${part}`);
      this.p.skyCopy = program(gl, FS_VERT, SKY_COPY_FS, 'sky-copy');
      this.skyLow = target(gl, Math.ceil(r.outW / 2), Math.ceil(r.outH / 2), { hdr: true });
    }
  }

  /** Ripples, time, agitation and loop length (the uniforms WATER needs). */
  rip(prog, S) {
    const rip = new Float32Array(32);
    const list = (S.world.ripples || []).slice(0, 8);
    list.forEach((q, i) => rip.set([q.x, q.y, q.age, q.amp], i * 4));
    setUniforms(this.r.gl, prog, { uTime: S.t, uAgitation: S.world.agitation, uRipN: list.length, uLoop: S.world.loop || 15 });
    this.r.gl.uniform4fv(prog.u.uRip, rip);
  }

  /** The sky uniforms, shared by the approved world pass and the fast sky pass. */
  skyUniforms(w) {
    return {
      uZenith: w.zenith, uHigh: w.high, uHorizon: w.horizon, uHaze: w.haze,
      uMoon: w.moon, uMoonCol: w.moonCol, uMoonGlow: w.moonGlow, uHaloCol: w.haloCol,
      uStars: w.stars, uClouds: w.clouds || 0, uCloudLit: w.cloudLit || [0.5, 0.5, 0.6], uCloudDark: w.cloudDark || [0.05, 0.05, 0.1],
      uHillCol: w.hillCol || w.horizon, uHorizonY: w.horizonY, uSkyCam: w.skyCam,
    };
  }

  /** The water uniforms. */
  waterUniforms(w) {
    return {
      uWaterNear: w.waterNear, uWaterFar: w.waterFar, uFresnel: w.fresnel,
      uReflAmt: w.reflAmt, uContactY: w.contactY, uContact: w.contact, uShadow: w.shadow,
    };
  }

  /**
   * The screen rows (output px from the top) the fast sky layer must hold, or
   * null when the fast path cannot serve this camera: the deepest visible
   * water mirrors to a point above the frame, which a screen-sized layer does
   * not hold (never in v2; the approved pass then renders the frame).
   */
  skyRows(S) {
    const r = this.r, cam = S.cam, h = S.world.horizonY;
    const hs = (h - cam.y) * cam.zoom + r.H / 2;                         // the horizon on screen (design px)
    const deepest = r.H / 2 / cam.zoom + cam.y - h;                      // world px of water below the horizon
    if (deepest > 0 && hs - 0.85 * deepest * cam.zoom - SKY_MARGIN < 0) return null;
    return Math.min(r.outH, Math.max(1, Math.ceil((hs + SKY_MARGIN) * r.scale)));
  }

  /** Sky + lake (everything that barely moves within a frame) → target. */
  renderWorld(S, target) {
    const r = this.r, gl = r.gl, w = S.world;
    const rows = this.fast ? this.skyRows(S) : null;
    if (rows == null) {
      // the approved world pass, call for call
      const pw = this.p.world;
      target.bind();
      gl.useProgram(pw.p);
      r.cam(pw, S.cam);
      setUniforms(gl, pw, {
        uZenith: w.zenith, uHigh: w.high, uHorizon: w.horizon, uHaze: w.haze,
        uMoon: w.moon, uMoonCol: w.moonCol, uMoonGlow: w.moonGlow, uHaloCol: w.haloCol,
        uStars: w.stars, uClouds: w.clouds || 0, uCloudLit: w.cloudLit || [0.5, 0.5, 0.6], uCloudDark: w.cloudDark || [0.05, 0.05, 0.1],
        uHillCol: w.hillCol || w.horizon, uHorizonY: w.horizonY,
        uWaterNear: w.waterNear, uWaterFar: w.waterFar, uFresnel: w.fresnel,
        uReflAmt: w.reflAmt, uContactY: w.contactY, uContact: w.contact, uShadow: w.shadow, uSkyCam: w.skyCam,
      });
      this.rip(pw, S);
      r.fs.draw();
      return;
    }
    if (this.split) return this.renderSplit(S, target, rows);
    // 1 the sky layer, for the rows above the horizon (+ the mirror's margin)
    const ps = this.p.sky;
    this.skyLayer.bind();
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, r.outH - rows, r.outW, rows);
    gl.useProgram(ps.p);
    r.cam(ps, S.cam);
    setUniforms(gl, ps, this.skyUniforms(w));
    this.rip(ps, S);
    r.fs.draw();
    gl.disable(gl.SCISSOR_TEST);
    // 2 the frame: sky pixels from the layer, water mirroring it
    this.drawWorldFast(S, target, rows);
  }

  /** The fast world pass (sky pixels copied from the layer, water mirroring it) into the bound region of target. */
  drawWorldFast(S, target, rows) {
    const r = this.r, gl = r.gl, w = S.world, pw = this.p.worldFast;
    target.bind();
    gl.useProgram(pw.p);
    r.cam(pw, S.cam);
    setUniforms(gl, pw, {
      uMoon: w.moon, uMoonCol: w.moonCol, uMoonGlow: w.moonGlow, uHaloCol: w.haloCol, uHaze: w.haze,
      uHorizonY: w.horizonY, uSkyCam: w.skyCam, ...this.waterUniforms(w),
      uSky: { tex: this.skyLayer.tex, unit: 0 }, uSkyMaxY: rows / r.scale - 1,
    });
    this.rip(pw, S);
    r.fs.draw();
  }

  /**
   * P4b (worldPasses): the same layer and frame from scissored draws, each
   * running only the terms its region needs. Rows and boxes are output px,
   * top-down; every boundary keeps a row of margin on the side of the
   * shader that still holds the branch.
   */
  renderSplit(S, target, rows) {
    const r = this.r, gl = r.gl, w = S.world, k = r.scale, sc = w.skyCam;
    const cut = (t, x0, y0, x1, y1) => {           // scissor to a top-down box of target t
      gl.scissor(x0, t.h - y1, x1 - x0, y1 - y0);
      return y1 > y0 && x1 > x0;
    };
    const draw = (p, uniforms) => {
      gl.useProgram(p.p);
      r.cam(p, S.cam);
      setUniforms(gl, p, uniforms);
      this.rip(p, S);
      r.fs.draw();
    };
    const sky = this.skyUniforms(w);
    gl.enable(gl.SCISSOR_TEST);
    // 1a the smooth terms at 1/2 resolution (one more row for the bilinear reads of the last one)
    const L = this.skyLow;
    L.bind();
    cut(L, 0, 0, L.w, Math.min(L.h, Math.ceil(rows / 2) + 1));
    draw(this.p.skyLow, sky);
    // 1b the full-resolution layer: above the hills band, the band, then the moon's box over both
    const low = { ...sky, uSkyLow: { tex: L.tex, unit: 0 } };
    const skyY = (wy) => ((wy - sc[1]) * sc[2] + r.H / 2) * k;              // sky-layer world y → output row
    const band = Math.max(0, Math.min(rows, Math.floor(skyY(w.horizonY - 60)) - 1));
    this.skyLayer.bind();
    if (cut(this.skyLayer, 0, 0, r.outW, band)) draw(this.p['sky-plain'], low);
    if (cut(this.skyLayer, 0, band, r.outW, rows)) draw(this.p['sky-hills'], low);
    // the disc's 1.2 px edge plus two low texels (in sky px) are evaluated term by term
    const mr = w.moon[2] + 1.2 + (2 * r.W / L.w) / sc[2];
    const mx = ((w.moon[0] - sc[0]) * sc[2] + r.W / 2) * k, my = skyY(w.moon[1]), mrad = mr * sc[2] * k + 2;
    if (cut(this.skyLayer, Math.max(0, Math.floor(mx - mrad)), Math.max(0, Math.floor(my - mrad)),
      Math.min(r.outW, Math.ceil(mx + mrad)), Math.min(rows, Math.ceil(my + mrad)))) draw(this.p['sky-moon'], low);
    // 2 the frame: the rows wholly above the horizon copied, the water shader from the horizon's row down
    const hs = ((w.horizonY - S.cam.y) * S.cam.zoom + r.H / 2) * k;
    const water = Math.max(0, Math.min(r.outH, Math.floor(hs) - 1));
    target.bind();
    if (cut(target, 0, 0, r.outW, water)) draw(this.p.skyCopy, { uSky: { tex: this.skyLayer.tex, unit: 0 } });
    if (cut(target, 0, water, r.outW, r.outH)) this.drawWorldFast(S, target, rows);
    gl.disable(gl.SCISSOR_TEST);
  }

  /** The mirrored Mallow (reflTex, premultiplied) over the water of the bound target. */
  compositeReflection(S, reflTex) {
    const r = this.r, gl = r.gl, w = S.world, pr = this.p.refl;
    gl.useProgram(pr.p);
    r.cam(pr, S.cam);
    setUniforms(gl, pr, {
      uHorizonY: w.horizonY, uFresnel: w.fresnel, uReflAmt: w.reflAmt, uRefl: { tex: reflTex, unit: 0 },
      uContactY: w.contactY, uContact: w.contact, uShadow: w.shadow,
    });
    this.rip(pr, S);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    r.fs.draw();
    gl.disable(gl.BLEND);
  }
}
