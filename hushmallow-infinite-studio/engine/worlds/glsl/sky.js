// The fast lake world (profile feature worldFast, PHASE2-PLAN perf step P4).
//
// The approved world pass (lake-v2.js WORLD_FS, ~0.6–0.9 s per frame on
// SwiftShader) computes every term of the sky for every pixel, and computes the
// whole sky a second time for every water pixel (the mirror image). The fast
// variant:
//   1 evaluates each sky term only where it can be non-zero, with the same
//     arithmetic where it is evaluated:
//       - the moon's maria/fine fbm only on the disc (disc = 0 for d >= r + 1.2),
//       - the stars' twinkle and shape only in star cells (step(0.9972, s)),
//       - the haze fbm only below h = 0.32 (its weight is 0 above),
//       - the stratus fbm only inside the cloud band (band = 0 outside 0.12..0.95),
//       - the hills only in the 60 px above the horizon (the ridges reach 56 px);
//   2 renders the sky ONCE into a half-float texture (rgb = sky, a = the moon's
//     visible disc), for the screen rows above the horizon plus a margin for
//     the mirror's ripple displacement (SKY_FS);
//   3 copies that texture for the sky pixels, and lets each water pixel SAMPLE
//     it (bilinear) at the mirrored point, instead of re-evaluating the sky
//     (WORLD_FAST_FS). The mirror is minified 0.85× vertically, so sampling
//     only softens sub-pixel detail (stars) in the reflection.
// Draft quality knobs: fbm octaves (noise.js) and clouds off.

import { CAM } from '../../renderer/glsl-v2.js';
import { noiseGLSL } from './noise.js';
import { WATER_GLSL } from './water.js';

const SKY_UNIFORMS = `
uniform vec3 uZenith; uniform vec3 uHigh; uniform vec3 uHorizon; uniform vec3 uHaze;
uniform vec3 uMoon; uniform vec3 uMoonCol; uniform float uMoonGlow; uniform vec3 uHaloCol;
uniform float uStars;
uniform float uClouds; uniform vec3 uCloudLit; uniform vec3 uCloudDark;
uniform vec3 uHillCol;
uniform float uHorizonY;
uniform vec3 uSkyCam;
`;

/** The sky in sky-layer coordinates; discOut: the visible moon disc (for its reflection). */
const skyFn = (clouds) => `
vec3 sky(vec2 w, out float discOut) {
  float h = clamp((uHorizonY - w.y) / 1150., 0., 1.);
  vec3 c = mix(uHorizon, uHigh, smoothstep(0.0, 0.42, h));
  c = mix(c, uZenith, smoothstep(0.38, 1.0, h));
  float la = loopA();
  // low haze over the far water (weight 0 at h >= 0.32)
  if (h < 0.32) {
    float hz = fbm(vec2(w.x * 0.0016 + 0.1 * cos(la), w.y * 0.008 + 0.05 * sin(la)));
    c = mix(c, uHaze, smoothstep(0.32, 0.0, h) * (0.3 + 0.3 * hz));
  }
  vec2 mp = uMoon.xy; float mr = uMoon.z;
  float d = length(w - mp), dd = max(d - mr, 0.);
  // stars: only cells that hold one
  vec2 g = floor(w / 7.0);
  float s = hash12(g);
  if (s >= 0.9972) {
    float star = smoothstep(0.18, 0.7, h) * smoothstep(mr * 2.5, mr * 6.0, d);
    float tw = 0.6 + 0.4 * sin(la * floor(2. + 7. * hash12(g + 7.)) + s * 40.);
    vec2 f = fract(w / 7.0) - 0.5 - (vec2(hash12(g + 3.), hash12(g + 5.)) - 0.5) * 0.5;
    float sz = 0.16 + 0.14 * hash12(g + 11.);
    c += vec3(0.85, 0.88, 1.0) * star * tw * smoothstep(sz, 0.0, length(f)) * uStars * 1.4;
  }
  float glow = exp(-dd / (mr * 0.45)) * 0.42 + exp(-dd / (mr * 2.2)) * 0.22 + exp(-dd / (mr * 8.0)) * 0.10;
  // moon disc: the maria and limb only where the disc is
  float disc = 1. - smoothstep(mr - 1.2, mr + 1.2, d);
  vec3 moon = uMoonCol;
  if (disc > 0.) {
    vec2 mq = (w - mp) / mr;
    float maria = smoothstep(0.48, 0.72, fbm(mq * 1.7 + vec2(5.2, 1.3)));
    float fine = fbm(mq * 7.0 + 2.0);
    float limb = pow(max(1. - dot(mq, mq), 0.), 0.22);
    moon = uMoonCol * (0.80 + 0.2 * limb) * (1. - 0.16 * maria - 0.05 * fine);
  }
  float cl = 0.;
  vec3 cloud = uCloudDark;
  ${clouds ? `if (uClouds > 0.002) {
    float band = smoothstep(0.12, 0.42, h) * smoothstep(0.95, 0.62, h);
    if (band > 0.) {
      vec2 cp = vec2(w.x * 0.0016 + 0.17 * cos(la), w.y * 0.0085 + 0.03 * sin(la));
      cp += vec2(1.1, 0.35) * (vec2(fbm(cp * vec2(0.7, 1.3) + 7.0), fbm(cp * vec2(0.9, 1.1) + 2.3)) - 0.5);
      float n = fbm(cp) * (0.75 + 0.5 * vnoise(vec2(w.x * 0.0009 - 0.09 * cos(la), 4.0 + 0.09 * sin(la))));
      cl = smoothstep(0.66 - 0.32 * uClouds, 0.92 - 0.26 * uClouds, n) * band * min(1., uClouds * 1.6);
      float near = exp(-dd / (mr * 3.2)) + 0.35 * exp(-dd / (mr * 10.0));
      float thin = 1. - smoothstep(0.15, 0.85, cl);
      cloud = mix(uCloudDark, uCloudLit, clamp(near * (0.35 + 0.9 * thin), 0., 1.));
    }
  }` : '// clouds off (draft profile)'}
  c += uHaloCol * glow * uMoonGlow * (1. - 0.6 * cl);
  c = mix(c, moon, disc * (1. - 0.85 * cl));
  discOut = disc * (1. - 0.85 * cl);
  c = mix(c, cloud, cl * 0.88);
  // far hills: only in the band they can reach (ridges rise at most 56 px)
  if (w.y > uHorizonY - 60.) {
    float hx = w.x * 0.0019;
    float r1 = uHorizonY - (8. + 34. * pow(0.5 + 0.5 * sin(hx * 2.3 + 0.9), 1.6) + 14. * fbm(vec2(hx * 2.0, 3.7)));
    float r2 = uHorizonY - (4. + 20. * pow(0.5 + 0.5 * sin(hx * 3.7 + 2.6), 2.0) + 8. * fbm(vec2(hx * 3.1, 9.1)));
    vec3 far = mix(uHillCol, uHaze, 0.55);
    c = mix(c, far, smoothstep(r1 - 1.0, r1 + 1.0, w.y) * 0.85);
    c = mix(c, mix(uHillCol, uHaze, 0.22), smoothstep(r2 - 1.0, r2 + 1.0, w.y));
  }
  return c;
}
vec2 skyWorld(vec2 sp) { return (sp - uRes * 0.5) / uSkyCam.z + uSkyCam.xy; }
`;

/** Pass 1: the sky layer (rgb) and the visible moon disc (a), for screen pixels. */
export const skyFS = ({ octaves = 5, clouds = true } = {}) => `
in vec2 vUv;
${CAM}
${noiseGLSL(octaves)}
${WATER_GLSL}
${SKY_UNIFORMS}
out vec4 frag;
${skyFn(clouds)}
void main() {
  vec2 sp = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  float disc;
  vec3 c = sky(skyWorld(sp), disc);
  frag = vec4(c, disc);
}`;

/** Pass 2: sky pixels copied from the sky layer, water pixels mirroring it (sampled). */
export const worldFastFS = ({ octaves = 5 } = {}) => `
in vec2 vUv;
${CAM}
${noiseGLSL(octaves)}
${WATER_GLSL}
uniform vec3 uMoon; uniform vec3 uMoonCol; uniform float uMoonGlow; uniform vec3 uHaloCol; uniform vec3 uHaze;
uniform float uHorizonY;
uniform vec3 uWaterNear; uniform vec3 uWaterFar;
uniform float uFresnel;
uniform float uReflAmt; uniform float uContactY; uniform vec2 uContact;
uniform float uShadow;
uniform vec3 uSkyCam;
uniform sampler2D uSky;
uniform float uSkyMaxY;     // lowest screen y (design px) the sky layer holds this frame
out vec4 frag;
vec2 worldToScreen(vec2 w) { return (w - uFocus) * uZoom + uRes * 0.5; }
void main() {
  vec2 sp = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 w = screenToWorld(sp);
  if (w.y < uHorizonY) {
    frag = vec4(texelFetch(uSky, ivec2(gl_FragCoord.xy), 0).rgb, 1.);
    return;
  }
  float depth = (w.y - uHorizonY);
  float crest;
  vec2 disp = waterDisp(w, depth, crest);
  float fres = mix(0.38, 1.0, exp(-depth / (260. * uFresnel)));
  vec2 mirrorW = vec2(w.x, uHorizonY - depth * 0.85) + disp * vec2(1., 0.6);
  vec2 ms = worldToScreen(mirrorW);
  ms.y = min(ms.y, uSkyMaxY);            // never read rows the sky pass did not write this frame
  vec4 sk = texture(uSky, vec2(ms.x / uRes.x, 1. - ms.y / uRes.y));
  vec3 rs = sk.rgb + uMoonCol * sk.a * 0.9;
  vec3 water = mix(uWaterNear, uWaterFar, exp(-depth / 420.));
  vec3 col = mix(water, rs, clamp(fres * uReflAmt * 1.3, 0., 1.));
  float mx = (uMoon.x - uSkyCam.x) * uSkyCam.z + uRes.x * 0.5;
  float colw = 16. + depth * 0.22;
  float glit = scrollNoise(vec2(w.x * 0.06, w.y * 0.4), vec2(0., 0.8));
  float streak = exp(-pow((sp.x - mx - disp.x * 0.6) / colw, 2.)) * smoothstep(0.45, 0.9, glit);
  col += uHaloCol * streak * (0.04 + 0.4 * uAgitation) * uMoonGlow * exp(-depth / 900.);
  col += uHaloCol * crest * 0.2 * uMoonGlow;
  vec2 cq = (w - vec2(uContact.x, uContactY)) / vec2(uContact.y * 1.1, uContact.y * 0.1);
  col *= 1. - uShadow * exp(-dot(cq, cq) * 1.6);
  col = mix(col, uHaze, exp(-depth / 14.) * 0.35);
  frag = vec4(col, 1.);
}`;
