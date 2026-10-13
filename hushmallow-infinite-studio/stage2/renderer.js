// Hushmallow Studio renderer v2 (WebGL2).
//
// Per output frame: N sub-frames are rendered into an HDR buffer and
// accumulated (true motion blur), then a filmic finish (bloom, tone mapping,
// split-tone grade, vignette, grain + dither) and the 2D overlay (type) are
// composited to the canvas.
//
// Sub-frame passes
//   1 reflection  Mallow mesh mirrored about its contact line → half-res, blurred
//   2 world       sky (gradient, moon, stars, haze, shafts) + water (fresnel,
//                 moon column, ripples distorting the reflection, contact shadow)
//   3 glass(back) thought bubbles behind the Mallow (frosted over a blurred copy)
//   4 mallow      deformed hi-res mesh with deformation-aware lighting
//   5 glass(front), particles

import { program, setUniforms, texture, updateTexture, target, fullscreen, FS_VERT, gridMesh } from './gl.js';

const W = 1080, H = 1920;

// ------------------------------------------------------------------ GLSL --
const COMMON = `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
`;

// world-space camera: screen = (world - focus) * zoom + centre (pixels, y down)
const CAM = `
uniform vec2 uRes; uniform vec2 uFocus; uniform float uZoom; uniform float uRoll;
vec2 worldToClip(vec2 w) {
  vec2 d = (w - uFocus) * uZoom;
  float c = cos(uRoll), s = sin(uRoll);
  d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  vec2 sp = d + uRes * 0.5;
  return vec2(sp.x / uRes.x * 2. - 1., 1. - sp.y / uRes.y * 2.);
}
vec2 screenToWorld(vec2 sp) {
  vec2 d = sp - uRes * 0.5;
  float c = cos(-uRoll), s = sin(-uRoll);
  d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  return d / uZoom + uFocus;
}
`;


// water surface displacement: ripple rings (in perspective) + slow swell + agitation chop
const WATER = `
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

const MESH_VS = `
layout(location=0) in vec2 aPos;   // world px
layout(location=1) in vec2 aUv;
layout(location=2) in float aComp;
layout(location=3) in float aBend;
${CAM}
uniform float uFlip;              // 1 for the reflection pass (camera ignores roll)
out vec2 vUv; out float vComp; out float vBend;
void main() {
  vUv = aUv; vComp = aComp; vBend = aBend;
  gl_Position = vec4(worldToClip(aPos), 0., 1.);
}
`;

const MESH_FS = `
in vec2 vUv; in float vComp; in float vBend;
uniform sampler2D uArt; uniform sampler2D uFace; uniform sampler2D uNormal; uniform sampler2D uPristine;
uniform float uRest;              // 1 = show the untouched approved painting (face at rest)
uniform float uHasNormal;
uniform vec4 uBodyBox;            // cx, baseY, halfW, height  (in uv-normalised art px / art size)
uniform vec2 uArtSize;
uniform vec3 uLightDir; uniform vec3 uKey; uniform vec3 uRim; uniform float uRimAmt;
uniform float uSpec; uniform vec3 uSpecCol; uniform vec3 uGlowCol; uniform float uGlow;
uniform vec3 uAmbient; uniform float uSSS; uniform float uReflect;   // reflection pass dims/blues
uniform float uExposure;
out vec4 frag;
${COMMON}
vec3 domeNormal(vec2 uv) {
  vec2 px = uv * uArtSize;
  vec2 p = vec2((px.x - uBodyBox.x) / uBodyBox.z, ((uBodyBox.y - px.y) / uBodyBox.w - 0.5) * 2.);
  // rounded-cube (superellipse) profile: flat-ish front, soft curved edges
  float r = pow(pow(abs(p.x), 4.) + pow(abs(p.y), 4.), 0.25);
  float e = smoothstep(0.35, 1.02, r);
  vec2 dir = normalize(vec2(sign(p.x) * pow(abs(p.x), 3.), sign(p.y) * pow(abs(p.y), 3.)) + 1e-5);
  vec3 n = normalize(vec3(dir * e * 1.35, 1.0 - e * 0.55));
  return n;
}
void main() {
  vec4 art = texture(uArt, vUv);
  vec4 face = texture(uFace, vUv);
  vec4 albedo = face + art * (1. - face.a);          // premultiplied over
  if (uRest > 0.001) albedo = mix(albedo, texture(uPristine, vUv), uRest);
  if (albedo.a < 0.002) discard;
  vec3 col = pow(albedo.rgb / max(albedo.a, 1e-4), vec3(2.2));   // sRGB art → linear light
  vec3 n0 = domeNormal(vUv);
  // the derived normal map gives the true body shape (bevel, front bulge, top dimple); only its
  // large-scale form is used (coarse mip): the painting already carries the fine fluff, and
  // relighting every bump would double it (crinkly, grey)
  if (uHasNormal > 0.5) { vec3 nm = texture(uNormal, vUv, 3.5).xyz * 2. - 1.; n0 = normalize(mix(n0, nm, 0.6)); }   // OpenGL convention (G = +Y up)
  // deformation tilts the surface: highlights slide as the body bends
  vec3 n = normalize(n0 + vec3(vBend * 0.55, 0., 0.) + vec3(0., (vComp - 1.) * 0.25, 0.));
  vec3 L = normalize(uLightDir);
  // relight relative to the baked art lighting, so the approved look stays at rest
  float d0 = 0.78 + 0.22 * dot(n0, L), d1 = 0.78 + 0.22 * dot(n, L);
  col *= d1 / d0;
  // subsurface: squeezed fluff gets denser & warmer; stretched gets airier
  float sq = clamp(vComp - 1., -0.4, 0.6);
  col *= 1. + uSSS * sq * vec3(0.10, 0.08, 0.05);
  col = mix(col, col * vec3(1.03, 1.0, 1.06), clamp(-sq, 0., 1.) * 0.5);
  // scene light colour
  col *= uKey;
  col += uAmbient * 0.06;
  // inner lantern glow (the Hushmallow moment): strongest through the thick middle
  col += uGlowCol * uGlow * (0.35 + 0.65 * n.z) * (1. - face.a * 0.6);
  // glossy sheen that moves with the deformation (marshmallow skin)
  vec3 Hh = normalize(L + vec3(0., 0., 1.));
  float sp = pow(max(dot(n, Hh), 0.), 36.) * (0.6 + 0.4 * vnoise(vUv * 180.));
  col += uSpecCol * sp * uSpec * (1. - face.a);
  // rim light from the moon behind
  float rim = pow(clamp(1. - n.z, 0., 1.), 2.6);
  col += uRim * rim * uRimAmt * (1. - face.a);
  col = mix(col, col * vec3(0.72, 0.78, 1.0), uReflect);
  frag = vec4(col * uExposure * albedo.a, albedo.a);
}
`;

const WORLD_FS = `
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
const REFL_FS = `
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

const BLUR_FS = `
in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 frag;
void main() {
  vec4 c = texture(uTex, vUv) * 0.2270270270;
  c += texture(uTex, vUv + uDir * 1.3846153846) * 0.3162162162;
  c += texture(uTex, vUv - uDir * 1.3846153846) * 0.3162162162;
  c += texture(uTex, vUv + uDir * 3.2307692308) * 0.0702702703;
  c += texture(uTex, vUv - uDir * 3.2307692308) * 0.0702702703;
  frag = c;
}`;

const COPY_FS = `in vec2 vUv; uniform sampler2D uTex; uniform float uGain; out vec4 frag; void main() { frag = texture(uTex, vUv) * uGain; }`;

const BRIGHT_FS = `in vec2 vUv; uniform sampler2D uTex; uniform float uThresh; out vec4 frag;
void main() { vec3 c = texture(uTex, vUv).rgb; float l = dot(c, vec3(.2126,.7152,.0722)); frag = vec4(c * smoothstep(uThresh, uThresh + 0.35, l), 1.); }`;

// glass thought bubble (SDF rounded rect), frosted over the blurred scene
const GLASS_VS = `
layout(location=0) in vec2 aPos;
${CAM}
uniform vec4 uRect;      // centre world x,y, half w,h (world px, pre-scale)
uniform float uScale; uniform vec2 uSquash; uniform float uRot;
out vec2 vLocal; out vec2 vScreen;
void main() {
  vec2 local = aPos * (uRect.zw + 64.);          // padding for glow + shadow (both reach zero inside it)
  vLocal = local;
  vec2 p = local * uScale * uSquash;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  vec4 clip = vec4(worldToClip(uRect.xy + p), 0., 1.);
  vScreen = clip.xy * 0.5 + 0.5;
  gl_Position = clip;
}`;
const GLASS_FS = `
in vec2 vLocal; in vec2 vScreen;
uniform vec4 uRect; uniform float uRadius; uniform float uAlpha; uniform float uTextAlpha;
uniform sampler2D uBlur; uniform sampler2D uText; uniform vec3 uTint; uniform vec3 uEdge; uniform float uStress;
uniform float uGlowUp;   // dissolving: the glass turns to warm light
out vec4 frag;
float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
void main() {
  float d = sdRound(vLocal, uRect.zw, uRadius);
  float aa = 1.2;
  float inside = 1. - smoothstep(-aa, aa, d);
  // soft outer glow / shadow
  float fadeOut = smoothstep(58., 30., d);       // outer terms reach exactly zero before the quad edge
  float glow = exp(-max(d, 0.) / 16.) * 0.16 * fadeOut;
  vec3 bg = texture(uBlur, vScreen).rgb;
  // frosted glass: the blurred scene lifted toward a cool white, a lit inner rim
  vec3 glass = mix(bg, uTint, 0.52);
  float edge = smoothstep(-9., 0., d) * inside;
  float topLight = smoothstep(uRect.w, -uRect.w * 0.2, vLocal.y) * 0.14;
  glass += uEdge * (edge * 0.5 + topLight);
  // a glossy sheen: a thin bright crescent just inside the upper edge
  float sheenBand = smoothstep(-14., -7., d) * (1. - smoothstep(-6., -2., d));
  float sheenMask = smoothstep(0.1, -0.85, vLocal.y / uRect.w) * smoothstep(1.0, 0.25, abs(vLocal.x) / uRect.z);
  glass += vec3(1.0) * sheenBand * sheenMask * 0.55;
  glass = mix(glass, glass * vec3(1.0, 0.86, 0.94), uStress * 0.25);
  vec2 tuv = vLocal / (uRect.zw * 2.) + 0.5;
  vec4 txt = texture(uText, vec2(tuv.x, tuv.y));
  vec3 col = mix(glass, txt.rgb / max(txt.a, 1e-3), txt.a * uTextAlpha);
  col = mix(col, vec3(1.0, 0.9, 0.74), uGlowUp * 0.42 * (0.5 + 0.5 * smoothstep(-uRect.w, 0., d)));   // a soft warm glow, never a white block
  float a = inside * uAlpha;
  vec3 halo = (uEdge + vec3(1.2, 0.95, 0.65) * uGlowUp * 1.1) * glow * uAlpha;
  // soft contact shadow beneath (darkens what is behind, outside the glass)
  float shd = exp(-max(sdRound(vLocal - vec2(0., 10.), uRect.zw, uRadius), 0.) / 18.) * (1. - inside) * 0.22 * uAlpha * fadeOut;
  frag = vec4(col * a + halo * (1. - a), a + (glow * 0.6 + shd) * uAlpha * (1. - a));
}`;

// soft glowing particles (instanced points as quads)
const PART_VS = `
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aInst;     // world x, y, radius, alpha
layout(location=2) in vec3 aCol;
${CAM}
out vec2 vL; out float vA; out vec3 vC;
void main() { vL = aPos; vA = aInst.w; vC = aCol; gl_Position = vec4(worldToClip(aInst.xy + aPos * aInst.z), 0., 1.); }`;
const PART_FS = `in vec2 vL; in float vA; in vec3 vC; out vec4 frag;
void main() { float r = length(vL); float core = exp(-r * r * 9.) ; float halo = exp(-r * r * 2.2) * 0.35; float a = (core + halo) * vA * smoothstep(1., 0.7, r); frag = vec4(vC * a, a * 0.6); }`;

const POST_FS = `
in vec2 vUv;
uniform sampler2D uScene; uniform sampler2D uBloom; uniform sampler2D uOverlay;
uniform float uExposure; uniform float uBloomAmt; uniform float uContrast; uniform float uSat;
uniform vec3 uShadowTint; uniform vec3 uHighTint; uniform float uVignette; uniform float uGrain; uniform float uTime;
uniform float uOverlayOn;
out vec4 frag;
${COMMON}
// identity below 0.8 (the approved art keeps its exact colours), a smooth
// shoulder above so glows and bloom roll off instead of clipping
vec3 shoulder(vec3 x) { vec3 k = 0.8 + 0.2 * (1. - exp(-(x - 0.8) / 0.2)); return mix(x, k, step(0.8, x)); }
void main() {
  vec3 c = texture(uScene, vUv).rgb;
  c += texture(uBloom, vUv).rgb * uBloomAmt;
  c *= uExposure;
  c = shoulder(c);
  c = pow(c, vec3(1.0 / 2.2));                 // linear → display
  // split-tone grade (display space)
  float l = dot(c, vec3(.2126, .7152, .0722));
  c *= mix(uShadowTint, uHighTint, smoothstep(0.05, 0.85, l));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uContrast + 0.5;
  // vignette (soft, oval, slightly lower centre)
  vec2 q = (vUv - vec2(0.5, 0.47)) * vec2(1.0, 0.72);
  c *= 1. - uVignette * smoothstep(0.18, 0.62, length(q));
  c = clamp(c, 0., 1.);
  if (uOverlayOn > 0.5) { vec4 o = texture(uOverlay, vec2(vUv.x, 1. - vUv.y)); c = o.rgb + c * (1. - o.a); }
  // fine grain + dither (keeps the deep gradients free of banding)
  float g = hash12(vUv * vec2(1080., 1920.) + fract(uTime * 7.13) * 100.) - 0.5;
  c += g * uGrain + (hash12(vUv * 1931. + uTime) - 0.5) / 255.;
  frag = vec4(c, 1.);
}`;

const ACC_FS = `in vec2 vUv; uniform sampler2D uTex; uniform float uW; out vec4 frag; void main() { frag = texture(uTex, vUv) * uW; }`;

// ----------------------------------------------------------------- class --
export class Renderer {
  constructor(gl) {
    this.gl = gl;
    this.fs = fullscreen(gl);
    this.p = {
      world: program(gl, FS_VERT, WORLD_FS, 'world'),
      refl: program(gl, FS_VERT, REFL_FS, 'reflection'),
      mesh: program(gl, MESH_VS, MESH_FS, 'mesh'),
      blur: program(gl, FS_VERT, BLUR_FS, 'blur'),
      copy: program(gl, FS_VERT, COPY_FS, 'copy'),
      bright: program(gl, FS_VERT, BRIGHT_FS, 'bright'),
      glass: program(gl, GLASS_VS, GLASS_FS, 'glass'),
      part: program(gl, PART_VS, PART_FS, 'particles'),
      post: program(gl, FS_VERT, POST_FS, 'post'),
      acc: program(gl, FS_VERT, ACC_FS, 'accumulate'),
    };
    this.t = {
      world: target(gl, W, H, { hdr: true }),
      scene: target(gl, W, H, { hdr: true }),
      accum: target(gl, W, H, { hdr: true }),
      refl: target(gl, W / 2, H / 2, { hdr: true }),
      reflB: target(gl, W / 2, H / 2, { hdr: true }),
      q1: target(gl, W / 4, H / 4, { hdr: true }),
      q2: target(gl, W / 4, H / 4, { hdr: true }),
      e1: target(gl, W / 8, H / 8, { hdr: true }),
      e2: target(gl, W / 8, H / 8, { hdr: true }),
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
    this.textTex = new Map();
  }

  setMallow({ artImg, pristineImg, faceCanvas, normalImg, cols = 96, rows = 96 }) {
    const gl = this.gl;
    this.artTex = texture(gl, artImg, { mip: true });
    this.pristineTex = pristineImg ? texture(gl, pristineImg, { mip: true }) : this.artTex;
    this.faceCanvas = faceCanvas;
    this.faceTex = texture(gl, faceCanvas, { mip: true });
    this.normalTex = normalImg ? texture(gl, normalImg, { mip: true, premultiply: false }) : null;
    this.mesh = gridMesh(gl, cols, rows, [2, 2, 1, 1]);
    this.reflMesh = gridMesh(gl, cols, rows, [2, 2, 1, 1]);
    this.artSize = [artImg.width, artImg.height];
  }

  updateFace() { updateTexture(this.gl, this.faceTex, this.faceCanvas, { mip: true }); }

  textTexture(key, canvas) {
    let t = this.textTex.get(key);
    if (!t) { t = texture(this.gl, canvas, { mip: true }); this.textTex.set(key, t); }
    return t;
  }

  _cam(prog, cam, flip = false) {
    setUniforms(this.gl, prog, { uRes: [W, H], uFocus: [cam.x, cam.y], uZoom: cam.zoom, uRoll: flip ? 0 : cam.roll || 0 });
  }

  _blur(src, tmp, dst, radius = 1) {
    const gl = this.gl, p = this.p.blur;
    gl.useProgram(p.p);
    tmp.bind();
    setUniforms(gl, p, { uTex: { tex: src.tex, unit: 0 }, uDir: [radius / src.w, 0] });
    this.fs.draw();
    dst.bind();
    setUniforms(gl, p, { uTex: { tex: tmp.tex, unit: 0 }, uDir: [0, radius / tmp.h] });
    this.fs.draw();
  }

  _copy(src, dst, gain = 1) {
    const gl = this.gl, p = this.p.copy;
    gl.useProgram(p.p);
    dst.bind();
    setUniforms(gl, p, { uTex: { tex: src.tex, unit: 0 }, uGain: gain });
    this.fs.draw();
  }

  _drawMallow(S, mesh, flip) {
    const gl = this.gl, p = this.p.mesh, m = S.mallow;
    gl.useProgram(p.p);
    this._cam(p, S.cam, flip);
    setUniforms(gl, p, {
      uArt: { tex: this.artTex, unit: 0 }, uFace: { tex: this.faceTex, unit: 1 },
      uNormal: { tex: this.normalTex || this.artTex, unit: 2 }, uHasNormal: this.normalTex ? 1 : 0,
      uBodyBox: m.bodyBox, uArtSize: this.artSize,
      uLightDir: m.light.dir, uKey: m.light.key, uRim: m.light.rim, uRimAmt: m.light.rimAmt,
      uSpec: m.light.spec, uSpecCol: m.light.specCol, uGlowCol: m.light.glowCol, uGlow: m.light.glow,
      uAmbient: m.light.ambient, uSSS: m.light.sss, uReflect: flip ? 1 : 0, uExposure: 1,
      uPristine: { tex: this.pristineTex, unit: 3 }, uRest: m.rest || 0,
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    mesh.draw();
    gl.disable(gl.BLEND);
  }

  _drawGlass(S, list, blurTex) {
    const gl = this.gl, p = this.p.glass;
    gl.useProgram(p.p);
    this._cam(p, S.cam);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.quadVao);
    for (const b of list) {
      setUniforms(gl, p, {
        uRect: [b.x, b.y, b.hw, b.hh], uScale: b.scale, uSquash: b.squash || [1, 1], uRot: b.rot || 0,
        uRadius: b.radius, uAlpha: b.alpha, uTextAlpha: b.textAlpha,
        uBlur: { tex: blurTex, unit: 0 }, uText: { tex: b.textTex, unit: 1 },
        uTint: b.tint || [0.93, 0.92, 1.0], uEdge: b.edge || [1, 1, 1], uStress: b.stress || 0, uGlowUp: b.glowUp || 0,
      });
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  _drawParticles(S, parts) {
    if (!parts.length) return;
    const gl = this.gl, p = this.p.part;
    const n = Math.min(512, parts.length);
    const d = this.instData;
    for (let i = 0; i < n; i++) {
      const q = parts[i];
      d.set([q.x, q.y, q.r, q.a, q.c[0], q.c[1], q.c[2]], i * 7);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.subarray(0, n * 7));
    gl.useProgram(p.p);
    this._cam(p, S.cam);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.quadVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  _rip(prog, S) {
    const rip = new Float32Array(32);
    const list = (S.world.ripples || []).slice(0, 8);
    list.forEach((r, i) => rip.set([r.x, r.y, r.age, r.amp], i * 4));
    setUniforms(this.gl, prog, { uTime: S.t, uAgitation: S.world.agitation, uRipN: list.length, uLoop: S.world.loop || 15 });
    this.gl.uniform4fv(prog.u.uRip, rip);
  }

  /** Sky + lake (everything that barely moves within a frame) → T.world. */
  renderWorld(S) {
    const gl = this.gl, T = this.t, w = S.world, pw = this.p.world;
    T.world.bind();
    gl.useProgram(pw.p);
    this._cam(pw, S.cam);
    setUniforms(gl, pw, {
      uZenith: w.zenith, uHigh: w.high, uHorizon: w.horizon, uHaze: w.haze,
      uMoon: w.moon, uMoonCol: w.moonCol, uMoonGlow: w.moonGlow, uHaloCol: w.haloCol,
      uStars: w.stars, uClouds: w.clouds || 0, uCloudLit: w.cloudLit || [0.5, 0.5, 0.6], uCloudDark: w.cloudDark || [0.05, 0.05, 0.1],
      uHillCol: w.hillCol || w.horizon, uHorizonY: w.horizonY,
      uWaterNear: w.waterNear, uWaterFar: w.waterFar, uFresnel: w.fresnel,
      uReflAmt: w.reflAmt, uContactY: w.contactY, uContact: w.contact, uShadow: w.shadow, uSkyCam: w.skyCam,
    });
    this._rip(pw, S);
    this.fs.draw();
  }

  /** One sub-frame (moving things only) over the world → T.scene (HDR). */
  renderSub(S) {
    const gl = this.gl, T = this.t, w = S.world;
    // 1 the Mallow mirrored about its contact line (half res, softened)
    T.refl.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    S.buildMesh(this.reflMesh, true);
    this._drawMallow(S, this.reflMesh, true);
    this._blur(T.refl, T.reflB, T.refl, 1.0);
    // 2 world + reflection
    this._copy(T.world, T.scene);
    const pr = this.p.refl;
    gl.useProgram(pr.p);
    this._cam(pr, S.cam);
    setUniforms(gl, pr, {
      uHorizonY: w.horizonY, uFresnel: w.fresnel, uReflAmt: w.reflAmt, uRefl: { tex: T.refl.tex, unit: 0 },
      uContactY: w.contactY, uContact: w.contact, uShadow: w.shadow,
    });
    this._rip(pr, S);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.fs.draw();
    gl.disable(gl.BLEND);
    // 3 glass behind the Mallow (frosted over a blurred copy of the scene)
    if (S.bubblesBack?.length) {
      this._copy(T.scene, T.q1);
      this._blur(T.q1, T.q2, T.q1, 2.2);
      T.scene.bind();
      this._drawGlass(S, S.bubblesBack, T.q1.tex);
    }
    // 4 the Mallow
    S.buildMesh(this.mesh, false);
    T.scene.bind();
    this._drawMallow(S, this.mesh, false);
    // 5 front glass + particles
    if (S.bubblesFront?.length) {
      this._copy(T.scene, T.q1);
      this._blur(T.q1, T.q2, T.q1, 2.2);
      T.scene.bind();
      this._drawGlass(S, S.bubblesFront, T.q1.tex);
    }
    T.scene.bind();
    this._drawParticles(S, S.particles || []);
  }

  /** Render a full output frame from sub-frame states, finish and composite. */
  renderFrame(subStates, center, overlayCanvas) {
    const gl = this.gl, T = this.t, post = center.post;
    this.renderWorld(center);
    T.accum.bind();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const wgt = 1 / subStates.length;
    for (const S of subStates) {
      if (S.drawFace && S.drawFace()) this.updateFace();
      this.renderSub(S);
      T.accum.bind();
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.p.acc.p);
      setUniforms(gl, this.p.acc, { uTex: { tex: T.scene.tex, unit: 0 }, uW: wgt });
      this.fs.draw();
      gl.disable(gl.BLEND);
    }
    // bloom: bright pass at 1/4, blur, plus a wider 1/8 blur
    gl.useProgram(this.p.bright.p);
    T.q1.bind();
    setUniforms(gl, this.p.bright, { uTex: { tex: T.accum.tex, unit: 0 }, uThresh: post.bloomThresh });
    this.fs.draw();
    this._blur(T.q1, T.q2, T.q1, 1.6);
    this._blur(T.q1, T.q2, T.q1, 3.2);
    this._copy(T.q1, T.e1);
    this._blur(T.e1, T.e2, T.e1, 2.5);
    this._copy(T.e1, T.q2, 0.6);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    this._copy(T.q1, T.q2, 0.7);
    gl.disable(gl.BLEND);
    // finish to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    if (overlayCanvas) {
      if (!this.overlayTex) this.overlayTex = texture(gl, overlayCanvas, { mip: false });
      else updateTexture(gl, this.overlayTex, overlayCanvas, { mip: false });
    }
    const pp = this.p.post;
    gl.useProgram(pp.p);
    setUniforms(gl, pp, {
      uScene: { tex: T.accum.tex, unit: 0 }, uBloom: { tex: T.q2.tex, unit: 1 },
      uOverlay: { tex: this.overlayTex || T.q2.tex, unit: 2 }, uOverlayOn: overlayCanvas ? 1 : 0,
      uExposure: post.exposure, uBloomAmt: post.bloom, uContrast: post.contrast, uSat: post.sat,
      uShadowTint: post.shadowTint, uHighTint: post.highTint, uVignette: post.vignette, uGrain: post.grain, uTime: post.time,
    });
    this.fs.draw();
  }
}

export { W, H };
