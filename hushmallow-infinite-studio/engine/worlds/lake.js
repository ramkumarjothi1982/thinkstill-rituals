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
// mirror image instead of evaluating the whole sky a second time.

import { program, setUniforms, target, FS_VERT } from '../gl.js';
import { WORLD_FS, REFL_FS } from './glsl/lake-v2.js';
import { skyFS, worldFastFS } from './glsl/sky.js';

/** Screen px below the horizon the sky layer also covers: the mirror's ripple displacement (≤ ~15 px) plus room. */
export const SKY_MARGIN = 48;

export class LakeWorld {
  /**
   * r: the renderer (gl, cam(), fs, sizes). opts.fast: the worldFast variant;
   * opts.octaves / opts.clouds: draft quality (fbm octaves, stratus on/off).
   */
  constructor(r, { fast = false, octaves = 5, clouds = true } = {}) {
    this.r = r;
    this.fast = fast;
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
    const pw = this.p.worldFast;
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
