// Shaders of the dream2 stage: a layered, projected Hushfold world.
//
// Camera model (dream2/camera.js): a pinhole camera at (cam.x, cam.h, cam.z)
// looking along +Z over a mirror lake at height 0; F = 1000 px focal length;
// the horizon sits at screen y = uHorizon. Every layer is placed at a real
// depth, so a move of the camera gives true parallax between the aurora, the
// clouds, the hills, the lake and the characters.
//
// Every animated term uses integer harmonics of uPh (2π per loop), so the last
// frame flows into the first.

import { COMMON } from '../engine/renderer/glsl-v2.js';
export { ORB_VS, ORB_FS, PART_VS, PART_FS } from '../dream/glsl.js';

const HEAD = `
const float TAU = 6.28318530718;
const float F = 1000.0;
uniform vec2 uRes; uniform vec3 uCam; uniform float uHorizon; uniform float uPh;
${COMMON}
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec2 loopV(float k, float r) { return vec2(cos(uPh * k), sin(uPh * k)) * r; }
// screen px (y down) → world (X, Y) on a vertical layer at depth Z
vec2 onLayer(vec2 sp, float Z) { float d = max(Z - uCam.z, 1.0); return vec2(uCam.x + (sp.x - uRes.x * 0.5) * d / F, uCam.y + (uHorizon - sp.y) * d / F); }
`;

// ---------------------------------------------------------------- sky ---
// Everything above the horizon (and, mirrored, what the lake reflects).
export const SKY_FS = `
in vec2 vUv;
${HEAD}
uniform vec3 uZenith, uMid, uLow, uGlow;   // sky gradient + the warm horizon glow
uniform vec3 uMoon;                        // moon: screen x, y, radius
uniform vec3 uMoonCol; uniform float uMoonGlow;
uniform float uAurora; uniform vec3 uAurA, uAurB, uAurC;
uniform float uCloud; uniform vec3 uCloudLit, uCloudDark;
uniform float uRays, uStars, uHills;
uniform vec3 uHillNear, uHillFar;
uniform vec3 uFeel; uniform float uFeelAmt;
out vec4 frag;

float cloudField(vec2 w, float sc, float seed) {
  vec2 p = w * sc + vec2(seed, seed * 1.7) + loopV(1.0, 0.25);
  float d = fbm(p + vec2(fbm(p * 0.7 + 3.1), fbm(p * 0.7 - 1.7)) * 0.8);
  return d;
}

void main() {
  vec2 sp = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  float v = uHorizon - sp.y;                       // px above the horizon (negative below)
  float vA = max(v, 0.0);
  float h01 = clamp(vA / max(uHorizon, 1.0), 0.0, 1.0);
  // gradient
  vec3 col = mix(uLow, uMid, smoothstep(0.0, 0.32, h01));
  col = mix(col, uZenith, smoothstep(0.28, 1.0, h01));
  // warm glow on the horizon under the moon, tinted by the feeling of the moment
  float gx = (sp.x - uMoon.x) / 620.0;
  col += (uGlow + uFeel * uFeelAmt * 0.6) * exp(-gx * gx) * exp(-vA / 260.0) * 0.55;

  // aurora: soft curtains far away, their lower edge brightest, gently waving
  if (uAurora > 0.002 && v > 300.0) {
    vec3 aur = vec3(0.0);
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      vec2 w = onLayer(sp, 26000.0 + fk * 6000.0);
      float base = 520.0 + fk * 170.0 + 260.0 * (fbm(vec2(w.x * 0.00018 + fk * 7.0, fk) + loopV(1.0, 0.35)) - 0.5);
      float vv = v;
      float edge = smoothstep(base - 40.0, base + 30.0, vv);
      float fall = exp(-max(vv - base, 0.0) / (240.0 + fk * 60.0));
      // soft folds, not bars: a gentle striation whose phase wanders, inside drifting patches
      float stri = 0.78 + 0.22 * sin(w.x * 0.0011 + fbm(vec2(w.x * 0.00025, fk * 3.0) + loopV(2.0, 0.3)) * 12.0 + uPh * (fk + 1.0));
      float curtainPatch = smoothstep(0.3, 0.68, fbm(vec2(w.x * 0.00007 + fk * 4.0, fk) + loopV(1.0, 0.25)));
      float a = edge * fall * stri * curtainPatch;
      vec3 c = mix(uAurA, uAurB, smoothstep(0.0, 0.7, (vv - base) / 380.0));
      c = mix(c, uAurC, smoothstep(0.5, 1.0, (vv - base) / 520.0));
      aur += c * a * (0.75 - fk * 0.18);
    }
    col += aur * uAurora * smoothstep(80.0, 260.0, v);
  }

  // moon: a soft pearl disc with a halo
  vec2 md = sp - uMoon.xy;
  float mr = length(md);
  float disc = smoothstep(uMoon.z + 1.5, uMoon.z - 1.5, mr);
  // maria, a limb that darkens gently, a warm-to-cool tint across the disc: a moon, not a sticker
  vec2 mq = md / uMoon.z;
  float maria = smoothstep(0.45, 0.7, fbm(mq * 1.6 + 5.0)) * 0.22 + smoothstep(0.55, 0.8, fbm(mq * 4.0 + 9.0)) * 0.1;
  float limb = sqrt(max(0.0, 1.0 - dot(mq, mq)));
  vec3 mcol = uMoonCol * (0.78 + 0.22 * limb) * (1.0 - maria) * mix(vec3(1.04, 1.0, 0.95), vec3(0.95, 0.98, 1.05), mq.x * 0.5 + 0.5);
  col = mix(col, mcol * 1.15, disc);
  col += uMoonCol * (exp(-mr / (uMoon.z * 1.6)) * 0.28 + exp(-mr / (uMoon.z * 5.0)) * 0.2 + exp(-mr / (uMoon.z * 16.0)) * 0.12) * uMoonGlow * (1.0 - disc);

  // two cloud banks at real depths, lit from the moon (silver linings)
  if (uCloud > 0.002) {
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      float Z = k == 0 ? 11000.0 : 5200.0;
      vec2 w = onLayer(sp, Z);
      float band = smoothstep(k == 0 ? 500.0 : 120.0, k == 0 ? 1500.0 : 520.0, w.y) * (1.0 - smoothstep(k == 0 ? 3600.0 : 1700.0, k == 0 ? 5200.0 : 2600.0, w.y));
      if (band <= 0.0) continue;
      float sc = k == 0 ? 0.00042 : 0.00075;
      float d = cloudField(w * vec2(1.0, 2.4), sc, 3.0 + fk * 11.0) * band;
      vec2 toMoon = normalize(uMoon.xy - sp + vec2(1e-3)) * vec2(1.0, -1.0);
      float d2 = cloudField((w + toMoon * (k == 0 ? 340.0 : 160.0)) * vec2(1.0, 2.4), sc, 3.0 + fk * 11.0) * band;
      float a = smoothstep(0.42, 0.72, d) * uCloud * (k == 0 ? 0.85 : 0.75);
      float lit = clamp((d - d2) * 5.0 + 0.35, 0.0, 1.0);
      float nearMoon = exp(-length(sp - uMoon.xy) / 700.0);
      vec3 cc = mix(uCloudDark, uCloudLit, lit) + uMoonCol * nearMoon * lit * 0.35;
      cc += (uGlow + uFeel * uFeelAmt * 0.5) * exp(-max(v, 0.0) / 300.0) * 0.25;
      col = mix(col, cc, a);
    }
  }

  // light shafts from the moon, between the clouds
  if (uRays > 0.002) {
    vec2 rd = sp - uMoon.xy;
    float ra = atan(rd.y, rd.x);
    float n = fbm(vec2(cos(ra), sin(ra)) * 4.0 + loopV(1.0, 0.4) + 2.0);
    float shafts = pow(smoothstep(0.42, 0.78, n), 2.0) * exp(-length(rd) / 900.0) * smoothstep(uMoon.z, uMoon.z * 3.0, length(rd));
    col += uMoonCol * shafts * uRays * 0.3 * step(0.0, v + 40.0);
  }

  // pearl hills on the horizon, hazed by distance
  if (uHills > 0.002 && v < 80.0 && v > -60.0) {
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      vec2 w = onLayer(sp, k == 0 ? 16000.0 : 7000.0);
      float hgt = (k == 0 ? 420.0 : 230.0) * (0.35 + 0.65 * fbm(vec2(w.x * (k == 0 ? 0.00022 : 0.0005) + fk * 5.0, fk)));
      float hy = w.y;
      float inside = smoothstep(hgt + 6.0, hgt - 6.0, hy) * step(-50.0, hy);
      vec3 hc = mix(uHillFar, uHillNear, fk);
      hc += uGlow * 0.25 * exp(-max(hy, 0.0) / 120.0);
      col = mix(col, hc, inside * uHills);
    }
  }
  frag = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------- lake ---
// Composites the world: above the horizon the sky as rendered; below it a calm
// mirror lake reflecting the sky and the characters (reflection pass), with a
// slow swell, ripple rings in world space, a glitter path under the moon and
// low mist drifting across the water and the horizon.
export const LAKE_FS = `
in vec2 vUv;
${HEAD}
uniform sampler2D uSky; uniform sampler2D uRefl;
uniform vec3 uWaterNear, uWaterFar, uMoonCol, uMistCol, uGlow;
uniform vec3 uMoon;
uniform float uMist, uReflAmt, uSwell, uStars;
uniform vec4 uRip[8];            // world x, z, age (s), amplitude
out vec4 frag;
void main() {
  vec2 sp = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  float dv = sp.y - uHorizon;
  vec3 col;
  if (dv <= 0.5) {
    col = texture(uSky, vUv).rgb;
    float v = -dv;
  // stars (at infinity: only the camera's turn would move them; it never turns)
    vec2 sg = sp / 30.0 + vec2(uCam.x * 0.002, 0.0);
    vec2 sid = floor(sg);
    float sh = hash12(sid + 41.0);
    if (sh > 0.94 && v > 60.0) {
    vec2 so = fract(sg) - 0.5 - (vec2(hash12(sid + 2.0), hash12(sid + 9.0)) - 0.5) * 0.6;
    float tw = 0.55 + 0.45 * sin(uPh * floor(3.0 + sh * 50.0 - 47.0) + sh * 60.0);
      col += vec3(0.95, 0.93, 1.0) * exp(-dot(so, so) * 220.0) * tw * uStars * smoothstep(60.0, 400.0, v) * (sh - 0.94) * 14.0;
    }

  } else {
    float d = F * uCam.y / dv;                         // distance along the view to the water
    vec2 wp = vec2(uCam.x + (sp.x - uRes.x * 0.5) * d / F, uCam.z + d);
    // swell + ripple rings → a small normal
    vec2 nrm = vec2(0.0);
    vec2 q = wp * vec2(0.0045, 0.009);
    nrm += (vec2(fbm(q + loopV(2.0, 0.6)), fbm(q + 7.3 - loopV(2.0, 0.6))) - 0.5) * 0.9 * uSwell;
    for (int i = 0; i < 8; i++) {
      vec4 r = uRip[i];
      if (r.w <= 0.0) continue;
      vec2 rv = wp - r.xy; rv.y *= 1.0;
      float rr = length(rv);
      float front = r.z * 520.0;
      float env = exp(-pow((rr - front) / (60.0 + r.z * 90.0), 2.0)) * exp(-r.z * 1.3) * r.w;
      nrm += normalize(rv + 1e-3) * sin((rr - front) * 0.06) * env * 1.6;
    }
    float persp = clamp(1.0 - dv / (uRes.y - uHorizon + 1.0), 0.0, 1.0);
    vec2 off = nrm * vec2(26.0, 14.0) * (0.35 + 0.65 * (1.0 - persp));
    vec2 muv = vec2(sp.x + off.x, uHorizon - dv * 0.98 + off.y);           // mirrored sky
    vec3 sky = texture(uSky, vec2(muv.x / uRes.x, 1.0 - clamp(muv.y, 0.0, uRes.y) / uRes.y)).rgb;
    float fres = 0.32 + 0.6 * pow(persp, 2.2);
    vec3 water = mix(uWaterNear, uWaterFar, pow(persp, 1.5));
    col = mix(water, sky, fres * uReflAmt);
    // the characters, mirrored (half-res pass), distorted by the same normal
    vec4 rf = texture(uRefl, vec2((sp.x + off.x * 2.4) / uRes.x, 1.0 - (sp.y + off.y * 1.6) / uRes.y));
    float rk = 0.5 * (0.55 + 0.45 * persp);
    col = col * (1.0 - rf.a * rk) + rf.rgb * rk;
    // glitter path under the moon
    float gx = (sp.x - uMoon.x) / (60.0 + dv * 0.5);
    float glit = smoothstep(0.62, 0.95, vnoise(wp * vec2(0.03, 0.06) + loopV(6.0, 1.5) + nrm * 3.0));
    col += uMoonCol * glit * exp(-gx * gx) * (0.55 + 0.45 * persp) * 0.45;
  }
  // mist: a soft band on the horizon and slow drifting wisps low over the water
  float hz = exp(-abs(dv) / 70.0) * 0.55 + exp(-abs(dv) / 260.0) * 0.25;
  float wisp = 0.0;
  if (dv > 0.0) {
    float d = F * uCam.y / max(dv, 1.0);
    vec2 wp = vec2(uCam.x + (sp.x - uRes.x * 0.5) * d / F, uCam.z + d);
    wisp = smoothstep(0.45, 0.8, fbm(wp * vec2(0.0016, 0.004) + loopV(1.0, 0.8))) * smoothstep(0.0, 140.0, dv) * (1.0 - smoothstep(380.0, 860.0, dv));
  }
  col = mix(col, uMistCol + uGlow * 0.2, clamp((hz + wisp * 0.55) * uMist, 0.0, 0.9));
  frag = vec4(col, 1.0);
}`;

// --------------------------------------------------------------- mallow --
// The approved artwork (or, for the six companions, the app rig's living
// skin: the approved face-cleaned body with its animated face) on the
// soft-body mesh, relit relative to its own baked lighting (the v2 model),
// plus: soft focus by depth (mip bias), atmospheric haze, a fade, the glow of
// emerging from a feeling, a coloured rim from the environment and the
// feeling-light spilled by a nearby orb. uReflect darkens the mirror pass.
export const MALLOW_FS = `
in vec2 vUv; in float vComp; in float vBend;
uniform sampler2D uArt; uniform sampler2D uFace; uniform sampler2D uNormal;
uniform float uHasNormal, uHasFace;
uniform vec4 uBodyBox;
uniform vec2 uArtSize;
uniform vec3 uLightDir; uniform vec3 uKey; uniform vec3 uRim; uniform float uRimAmt;
uniform float uSpec; uniform vec3 uSpecCol; uniform vec3 uGlowCol; uniform float uGlow;
uniform vec3 uAmbient; uniform float uSSS;
uniform float uLod; uniform vec4 uHaze; uniform float uFade; uniform vec3 uEmergeCol; uniform float uEmerge;
uniform vec4 uSpill;            // feeling light: rgb, amount
uniform float uSpillSide;       // -1 left .. 1 right: where the light comes from
uniform float uReflect;
out vec4 frag;
${COMMON}
vec3 domeNormal(vec2 uv) {
  vec2 px = uv * uArtSize;
  vec2 p = vec2((px.x - uBodyBox.x) / uBodyBox.z, ((uBodyBox.y - px.y) / uBodyBox.w - 0.5) * 2.);
  float r = pow(pow(abs(p.x), 4.) + pow(abs(p.y), 4.), 0.25);
  float e = smoothstep(0.35, 1.02, r);
  vec2 dir = normalize(vec2(sign(p.x) * pow(abs(p.x), 3.), sign(p.y) * pow(abs(p.y), 3.)) + 1e-5);
  return normalize(vec3(dir * e * 1.35, 1.0 - e * 0.55));
}
void main() {
  vec4 art = texture(uArt, vUv, uLod);
  vec4 face = uHasFace > 0.5 ? texture(uFace, vUv, uLod) : vec4(0.0);
  vec4 albedo = face + art * (1. - face.a);
  if (albedo.a < 0.002) discard;
  vec3 col = pow(albedo.rgb / max(albedo.a, 1e-4), vec3(2.2));
  vec3 n0 = domeNormal(vUv);
  if (uHasNormal > 0.5) { vec3 nm = texture(uNormal, vUv, 3.5).xyz * 2. - 1.; n0 = normalize(mix(n0, nm, 0.6)); }
  vec3 n = normalize(n0 + vec3(vBend * 0.55, 0., 0.) + vec3(0., (vComp - 1.) * 0.25, 0.));
  vec3 L = normalize(uLightDir);
  float d0 = 0.78 + 0.22 * dot(n0, L), d1 = 0.78 + 0.22 * dot(n, L);
  col *= d1 / d0;
  float sq = clamp(vComp - 1., -0.4, 0.6);
  col *= 1. + uSSS * sq * vec3(0.10, 0.08, 0.05);
  col = mix(col, col * vec3(1.03, 1.0, 1.06), clamp(-sq, 0., 1.) * 0.5);
  col *= uKey;
  col += uAmbient * 0.06;
  col += uGlowCol * uGlow * (0.35 + 0.65 * n.z) * (1. - face.a * 0.6);
  vec3 Hh = normalize(L + vec3(0., 0., 1.));
  float sp = pow(max(dot(n, Hh), 0.), 36.) * (0.6 + 0.4 * vnoise(vUv * 180.));
  col += uSpecCol * sp * uSpec * (1. - face.a);
  float rim = pow(clamp(1. - n.z, 0., 1.), 2.6);
  col += uRim * rim * uRimAmt * (1. - face.a);
  // feeling light from a nearby orb: wraps the side that faces it
  float side = clamp(0.5 + 0.5 * n.x * uSpillSide + 0.25 * n.z, 0.0, 1.0);
  col += uSpill.rgb * uSpill.a * side * (0.4 + 0.6 * rim);
  col = mix(col, uEmergeCol * (1.2 + 0.8 * rim), uEmerge * (0.55 + 0.45 * rim));
  col = mix(col, uHaze.rgb, uHaze.a);
  col = mix(col, col * vec3(0.5, 0.56, 0.78), uReflect);
  float a = albedo.a * uFade;
  frag = vec4(col * a, a);
}`;

// ------------------------------------------------------------- compose ---
// final scene = world (with the lake and its reflections) under the averaged,
// premultiplied foreground of the sub-frames
export const COMPOSE_FS = `
in vec2 vUv;
uniform sampler2D uBg; uniform sampler2D uFg;
out vec4 frag;
void main() { vec4 f = texture(uFg, vUv); vec3 b = texture(uBg, vUv).rgb; frag = vec4(b * (1.0 - f.a) + f.rgb, 1.0); }`;
