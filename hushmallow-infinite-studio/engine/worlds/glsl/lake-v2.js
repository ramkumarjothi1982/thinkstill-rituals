// The approved v2 lake-world shader text (stage2/renderer.js, frozen), byte for
// byte: the water displacement, the world pass (sky + lake) and the per-sub-frame
// reflection composite. Same rule as renderer/glsl-v2.js: the exact profile
// compiles exactly these strings; never edit them (the fast variants are built
// from worlds/glsl/{noise,sky,water}.js).

import { COMMON, CAM } from '../../renderer/glsl-v2.js';

// water surface displacement: ripple rings (in perspective) + slow swell + agitation chop
export const WATER = `
uniform float uTime; uniform float uAgitation; uniform float uLoop;
// everything that moves on its own is periodic over the loop, so frame N-1 flows into frame 0
float loopA() { return 6.2831853 * uTime / uLoop; }
float scrollNoise(vec2 p, vec2 vel) {
  return mix(vnoise(p - vel * uTime), vnoise(p - vel * (uTime - uLoop)), uTime / uLoop);
}
uniform vec4 uRip[8]; uniform float uRipN;     // x, y(world), t-since, amp
vec2 waterDisp(vec2 w, float depth, out float crest) {
  float persp = 0.13 + depth / 700.;
  vec2 disp = vec2(0.);
  crest = 0.;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uRipN) break;
    vec4 r = uRip[i];
    vec2 q = w - r.xy;
    q.y /= max(0.12, persp);
    float dist = length(q);
    float rad = r.z * 240.;
    float k = (dist - rad) / (30. + r.z * 22.);
    float env = exp(-k * k) * r.w * exp(-r.z * 0.9) * smoothstep(0., 0.06, r.z);
    float wave = sin(k * 3.1) * env;
    disp += q / max(dist, 1e-3) * wave * 17.0;
    crest += max(0., wave) * 0.55 + abs(wave) * 0.1;
  }
  float sw = scrollNoise(vec2(w.x * 0.004, w.y * 0.11), vec2(0., 0.35)) - 0.5;
  float n1 = vnoise(vec2(w.x * 0.03, w.y * 0.12 - uTime * 1.3)) - 0.5;
  float n2 = vnoise(vec2(w.x * 0.017 + 9., w.y * 0.07 + uTime * 0.9)) - 0.5;
  disp += vec2(sw * 1.5, sw * 4.0) * (0.5 + 0.5 * smoothstep(400., 0., depth));
  disp += vec2(n1, n2 * 0.4) * uAgitation * 16.;
  return disp;
}
`;

export const WORLD_FS = `
in vec2 vUv;
${CAM}
${COMMON}
${WATER}
uniform vec3 uZenith; uniform vec3 uHigh; uniform vec3 uHorizon; uniform vec3 uHaze;
uniform vec3 uMoon; uniform vec3 uMoonCol; uniform float uMoonGlow; uniform vec3 uHaloCol;
uniform float uStars;
uniform float uClouds; uniform vec3 uCloudLit; uniform vec3 uCloudDark;   // stratus coverage + moonlit / shadow colour
uniform vec3 uHillCol;
uniform float uHorizonY;                       // world y of the horizon
uniform vec3 uWaterNear; uniform vec3 uWaterFar;
uniform float uFresnel;
uniform float uReflAmt; uniform float uContactY; uniform vec2 uContact; // x, halfwidth (world)
uniform float uShadow;
uniform vec3 uSkyCam;                          // sky camera: focus x, y, zoom (the far layer moves less)
out vec4 frag;

// ---- sky, in sky-layer coordinates (horizon at uHorizonY)
vec3 sky(vec2 w, out float discOut) {
  float h = clamp((uHorizonY - w.y) / 1150., 0., 1.);
  vec3 c = mix(uHorizon, uHigh, smoothstep(0.0, 0.42, h));
  c = mix(c, uZenith, smoothstep(0.38, 1.0, h));
  // low haze over the far water
  float la = loopA();
  float hz = fbm(vec2(w.x * 0.0016 + 0.1 * cos(la), w.y * 0.008 + 0.05 * sin(la)));
  c = mix(c, uHaze, smoothstep(0.32, 0.0, h) * (0.3 + 0.3 * hz));

  vec2 mp = uMoon.xy; float mr = uMoon.z;
  float d = length(w - mp), dd = max(d - mr, 0.);
  // stars: sparse, slow twinkle, fading toward the horizon and the moon
  vec2 g = floor(w / 7.0);
  float s = hash12(g);
  float star = step(0.9972, s) * smoothstep(0.18, 0.7, h) * smoothstep(mr * 2.5, mr * 6.0, d);
  float tw = 0.6 + 0.4 * sin(la * floor(2. + 7. * hash12(g + 7.)) + s * 40.);
  vec2 f = fract(w / 7.0) - 0.5 - (vec2(hash12(g + 3.), hash12(g + 5.)) - 0.5) * 0.5;
  float sz = 0.16 + 0.14 * hash12(g + 11.);
  c += vec3(0.85, 0.88, 1.0) * star * tw * smoothstep(sz, 0.0, length(f)) * uStars * 1.4;

  // moon halo (atmospheric scatter): tight core glow + a wide soft bloom
  float glow = exp(-dd / (mr * 0.45)) * 0.42 + exp(-dd / (mr * 2.2)) * 0.22 + exp(-dd / (mr * 8.0)) * 0.10;
  // moon disc: crisp limb, soft maria, gentle limb darkening
  vec2 mq = (w - mp) / mr;
  float disc = 1. - smoothstep(mr - 1.2, mr + 1.2, d);
  float maria = smoothstep(0.48, 0.72, fbm(mq * 1.7 + vec2(5.2, 1.3)));
  float fine = fbm(mq * 7.0 + 2.0);
  float limb = pow(max(1. - dot(mq, mq), 0.), 0.22);
  vec3 moon = uMoonCol * (0.80 + 0.2 * limb) * (1. - 0.16 * maria - 0.05 * fine);

  // stratus: long thin moonlit bands drifting across the moon
  float cl = 0.;
  vec3 cloud = uCloudDark;
  if (uClouds > 0.002) {
    vec2 cp = vec2(w.x * 0.0016 + 0.17 * cos(la), w.y * 0.0085 + 0.03 * sin(la));
    cp += vec2(1.1, 0.35) * (vec2(fbm(cp * vec2(0.7, 1.3) + 7.0), fbm(cp * vec2(0.9, 1.1) + 2.3)) - 0.5);
    float n = fbm(cp) * (0.75 + 0.5 * vnoise(vec2(w.x * 0.0009 - 0.09 * cos(la), 4.0 + 0.09 * sin(la))));
    float band = smoothstep(0.12, 0.42, h) * smoothstep(0.95, 0.62, h);
    cl = smoothstep(0.66 - 0.32 * uClouds, 0.92 - 0.26 * uClouds, n) * band * min(1., uClouds * 1.6);
    // thin edges near the moon light up (silver lining); thick cores stay dusky
    float near = exp(-dd / (mr * 3.2)) + 0.35 * exp(-dd / (mr * 10.0));
    float thin = 1. - smoothstep(0.15, 0.85, cl);
    cloud = mix(uCloudDark, uCloudLit, clamp(near * (0.35 + 0.9 * thin), 0., 1.));
  }
  c += uHaloCol * glow * uMoonGlow * (1. - 0.6 * cl);
  c = mix(c, moon, disc * (1. - 0.85 * cl));
  discOut = disc * (1. - 0.85 * cl);
  c = mix(c, cloud, cl * 0.88);

  // far hills: two low, hazy rolling ridges that give the lake scale
  float hx = w.x * 0.0019;
  float r1 = uHorizonY - (8. + 34. * pow(0.5 + 0.5 * sin(hx * 2.3 + 0.9), 1.6) + 14. * fbm(vec2(hx * 2.0, 3.7)));
  float r2 = uHorizonY - (4. + 20. * pow(0.5 + 0.5 * sin(hx * 3.7 + 2.6), 2.0) + 8. * fbm(vec2(hx * 3.1, 9.1)));
  vec3 far = mix(uHillCol, uHaze, 0.55);
  c = mix(c, far, smoothstep(r1 - 1.0, r1 + 1.0, w.y) * 0.85);
  c = mix(c, mix(uHillCol, uHaze, 0.22), smoothstep(r2 - 1.0, r2 + 1.0, w.y));
  return c;
}

vec2 skyWorld(vec2 sp) { return (sp - uRes * 0.5) / uSkyCam.z + uSkyCam.xy; }
vec2 worldToScreen(vec2 w) { return (w - uFocus) * uZoom + uRes * 0.5; }

void main() {
  vec2 sp = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 w = screenToWorld(sp);
  if (w.y < uHorizonY) {
    float dsk;
    frag = vec4(sky(skyWorld(sp), dsk), 1.);
    return;
  }
  // ---- water: a still lake seen at a grazing angle
  float depth = (w.y - uHorizonY);                 // px below the horizon (world)
  float crest;
  vec2 disp = waterDisp(w, depth, crest);
  // mirror about the horizon (compressed for perspective), seen through the sky camera
  float fres = mix(0.38, 1.0, exp(-depth / (260. * uFresnel)));
  vec2 mirrorW = vec2(w.x, uHorizonY - depth * 0.85) + disp * vec2(1., 0.6);
  float mdisc;
  vec3 rs = sky(skyWorld(worldToScreen(mirrorW)), mdisc);
  rs += uMoonCol * mdisc * 0.9;            // the moon is far brighter than the sky: its reflection stays luminous
  vec3 reflected = rs;   // the Mallow's reflection is composited per sub-frame (REFL_FS)
  vec3 water = mix(uWaterNear, uWaterFar, exp(-depth / 420.));
  vec3 col = mix(water, reflected, clamp(fres * uReflAmt * 1.3, 0., 1.));
  // moon glitter path: only when the surface is broken up
  float mx = (uMoon.x - uSkyCam.x) * uSkyCam.z + uRes.x * 0.5;  // moon's screen x
  float colw = 16. + depth * 0.22;
  float glit = scrollNoise(vec2(w.x * 0.06, w.y * 0.4), vec2(0., 0.8));
  float streak = exp(-pow((sp.x - mx - disp.x * 0.6) / colw, 2.)) * smoothstep(0.45, 0.9, glit);
  col += uHaloCol * streak * (0.04 + 0.4 * uAgitation) * uMoonGlow * exp(-depth / 900.);
  // ripple crests catch the moonlight
  col += uHaloCol * crest * 0.2 * uMoonGlow;
  // soft contact shadow / occlusion where the Mallow sits on the water
  vec2 cq = (w - vec2(uContact.x, uContactY)) / vec2(uContact.y * 1.1, uContact.y * 0.1);
  col *= 1. - uShadow * exp(-dot(cq, cq) * 1.6);
  // a breath of haze right at the horizon line
  col = mix(col, uHaze, exp(-depth / 14.) * 0.35);
  frag = vec4(col, 1.);
}
`;


// the Mallow's mirror image composited onto the (once-per-frame) water, per sub-frame
export const REFL_FS = `
in vec2 vUv;
${CAM}
${COMMON}
${WATER}
uniform float uHorizonY; uniform float uFresnel; uniform float uReflAmt;
uniform sampler2D uRefl; uniform float uContactY; uniform vec2 uContact; uniform float uShadow;
out vec4 frag;
void main() {
  vec2 sp = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 w = screenToWorld(sp);
  if (w.y < uHorizonY) discard;
  float depth = w.y - uHorizonY;
  float crest;
  vec2 disp = waterDisp(w, depth, crest);
  vec2 ruv = (sp + disp * uZoom) / uRes;
  vec4 refl = texture(uRefl, vec2(ruv.x, 1. - ruv.y));
  if (refl.a < 0.002) discard;
  float fade = exp(-max(0., w.y - uContactY) / 900.);
  float fres = mix(0.38, 1.0, exp(-depth / (260. * uFresnel)));
  float a = clamp(refl.a * fade, 0., 1.) * clamp(fres * uReflAmt * 1.3, 0., 1.);
  vec2 cq = (w - vec2(uContact.x, uContactY)) / vec2(uContact.y * 1.1, uContact.y * 0.1);
  float sh = 1. - uShadow * exp(-dot(cq, cq) * 1.6);
  frag = vec4(refl.rgb / max(refl.a, 1e-3) * sh * a, a);
}
`;
