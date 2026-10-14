// The lake world (Moonmilk Cove in v2): a moonlit sky over mirror-still water.
//
// Two passes, following the plan's world-module interface:
//   renderWorld(S)        sky + water, once per frame from the centre state,
//                         into the renderer's HDR world target
//   compositeReflection   per sub-frame: the Mallow's mirrored copy (rendered
//                         by the renderer into a small target) composited onto
//                         the water, distorted by the same ripples
//
// The exact profile compiles the approved v2 shader text (glsl/lake-v2.js);
// faster variants are added by the performance pass behind profile features.

import { program, setUniforms, FS_VERT } from '../gl.js';
import { WORLD_FS, REFL_FS } from './glsl/lake-v2.js';

export class LakeWorld {
  /** r: the renderer (gl, programs, cam(), fs). */
  constructor(r) {
    this.r = r;
    const gl = r.gl;
    this.p = {
      world: program(gl, FS_VERT, WORLD_FS, 'world'),
      refl: program(gl, FS_VERT, REFL_FS, 'reflection'),
    };
  }

  /** Ripples, time, agitation and loop length (the uniforms WATER needs). */
  rip(prog, S) {
    const rip = new Float32Array(32);
    const list = (S.world.ripples || []).slice(0, 8);
    list.forEach((q, i) => rip.set([q.x, q.y, q.age, q.amp], i * 4));
    setUniforms(this.r.gl, prog, { uTime: S.t, uAgitation: S.world.agitation, uRipN: list.length, uLoop: S.world.loop || 15 });
    this.r.gl.uniform4fv(prog.u.uRip, rip);
  }

  /** Sky + lake (everything that barely moves within a frame) → target. */
  renderWorld(S, target) {
    const r = this.r, gl = r.gl, w = S.world, pw = this.p.world;
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
