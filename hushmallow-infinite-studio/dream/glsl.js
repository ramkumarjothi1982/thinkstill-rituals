// Shaders of the dream stage (the "Feel Something?" world).
//
// Every animated term is driven by uPh, the loop phase (2π over the whole
// video), and only ever through integer harmonics of it, so the last frame
// flows into the first without a seam. Coordinates are design px, y down,
// through the engine's world camera (CAM from the approved v2 shaders).

import { COMMON, CAM } from '../engine/renderer/glsl-v2.js';

export { COMMON, CAM };

// pastel iridescence (thin film / mother-of-pearl): a cosine palette kept light
const IRID = `
const float TAU = 6.28318530718;
vec3 irid(float x) { return 0.62 + 0.38 * cos(TAU * (x + vec3(0.0, 0.31, 0.62))); }
vec3 pearl(float x, float k) { return mix(vec3(1.0, 0.97, 1.0), irid(x), k); }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
`;

// ------------------------------------------------------------------ sky --
// The whole background in one pass: gradient sky, the luminous pearl spiral
// (which becomes the dream tunnel when its bands travel outward), silk ribbons
// and pearl nebula of the dreamscape, bokeh, star dust, a warm halo for the
// settled universe and the soft ring wave of Noomi's boop.
export const SKY_FS = `
in vec2 vUv;
${CAM}
uniform float uPh;
uniform vec2 uCenter;        // spiral centre (world px)
uniform float uSpiral;       // spiral strength
uniform float uBand;         // band phase (twist + travel); its loop change is an integer
uniform float uArms;         // integer
uniform float uTight;        // log-radius frequency
uniform float uDream;        // dreamscape: ribbons + nebula
uniform float uWarm;         // the warm, settled Mallow universe
uniform float uPulseR;       // boop ring radius (px), amplitude
uniform float uPulseA;
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform vec3 uHalo;
uniform float uBokeh; uniform float uStars;
uniform float uParallax;
out vec4 frag;
${COMMON}
${IRID}
float bokehLayer(vec2 sp, float cell, float seed, float drift, float rad) {
  vec2 g = sp / cell + vec2(seed * 7.1, -drift);
  vec2 id = floor(g), f = fract(g) - 0.5;
  float h = hash12(id + seed);
  if (h < 0.62) return 0.0;
  vec2 o = (vec2(hash12(id + 3.1 + seed), hash12(id + 8.7 + seed)) - 0.5) * 0.5;
  float r = rad * (0.55 + 0.45 * hash12(id + 5.3));
  float d = length(f - o);
  float disc = smoothstep(r, r - 0.035, d);
  float rim = smoothstep(r - 0.06, r - 0.01, d) * disc;
  float tw = 0.75 + 0.25 * sin(uPh * 2.0 + h * TAU);
  return (disc * 0.55 + rim * 0.45) * tw * (h - 0.62) * 2.6;
}
void main() {
  vec2 sp = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);          // screen px, y down
  float zb = 1.0 + (uZoom - 1.0) * uParallax;                         // the sky moves less than the stage
  vec2 w = (sp - uRes * 0.5) / zb + uFocus;
  vec2 p = w - uCenter;
  float r = length(p) / 1000.0;
  float a = atan(p.y, p.x);
  float yN = sp.y / uRes.y;

  // sky gradient: deep indigo at the top (type sits there), violet, a rosy haze low
  vec3 col = mix(uTop, uMid, smoothstep(0.0, 0.55, yN));
  col = mix(col, uLow, smoothstep(0.5, 1.0, yN));
  // nebula: pearl clouds drifting on a loop
  vec2 lp = vec2(cos(uPh), sin(uPh)) * 0.35;
  float n1 = fbm(w * 0.0016 + lp + 3.0), n2 = fbm(w * 0.0031 - lp * 1.3 + 11.0);
  vec3 neb = irid(n1 * 1.3 + n2 * 0.6 + 0.15) * smoothstep(0.35, 0.85, n1 * 0.7 + n2 * 0.5);
  col += neb * (0.05 + 0.14 * uDream + 0.05 * uWarm);

  // the spiral: soft satin bands on a logarithmic spiral, brightest toward its heart
  float fade = smoothstep(0.035, 0.16, r);
  float s = a * uArms / TAU + log(max(r, 1e-3)) * uTight - uBand;
  float c1 = 0.5 + 0.5 * cos(TAU * s);
  float body = pow(c1, 2.5), core = pow(c1, 12.0);
  float sheen = pow(0.5 + 0.5 * cos(TAU * s - 0.85), 34.0);
  float depth = exp(-r * 1.25);
  vec3 sc = pearl(s * 0.21 + r * 0.9 + 0.08, 0.62);
  vec3 spiral = sc * (0.10 * body + 0.32 * core + 0.55 * sheen) * (0.25 + 0.95 * depth);
  // a second, fainter counter-layer gives the bands depth (never a moiré: wide and soft)
  float s2 = -a * (uArms - 2.0) / TAU + log(max(r, 1e-3)) * uTight * 0.6 - uBand * 0.5;
  float c2 = pow(0.5 + 0.5 * cos(TAU * s2), 6.0);
  spiral += pearl(s2 * 0.17 + 0.5, 0.5) * c2 * 0.06 * depth;
  col += spiral * uSpiral * fade;
  // the heart of the spiral: a soft pearl glow behind Noomi
  col += uHalo * (exp(-r * r * 26.0) * 0.55 + exp(-r * 3.2) * 0.12) * (0.55 + 0.45 * uSpiral);

  // the warm universe: a quiet golden halo and slow rays instead of the bands
  float halo = exp(-pow((r - 0.36) / 0.2, 2.0));
  float rays = pow(0.5 + 0.5 * cos(a * 9.0 + uPh * 1.0 + sin(a * 3.0)), 6.0) * exp(-r * 2.4) * smoothstep(0.05, 0.25, r);
  col += (uHalo * halo * 0.22 + vec3(1.0, 0.82, 0.62) * rays * 0.07) * uWarm;

  // silk ribbons of the dreamscape (satin: a bright crease, a soft body)
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float base = 520.0 + fi * 330.0;
    float y = base + 120.0 * sin(w.x * (0.0042 + fi * 0.0007) + uPh * (fi + 1.0) + fi * 1.9)
                   + 55.0 * sin(w.x * 0.011 - uPh * 2.0 + fi * 4.1);
    float wd = 46.0 + 20.0 * sin(w.x * 0.006 + uPh + fi);
    float d = (w.y - y) / wd;
    float prof = exp(-d * d * 1.6);
    float crease = exp(-pow((d + 0.32) * 4.2, 2.0));
    vec3 rc = pearl(w.x * 0.0006 + fi * 0.23 + uPh / TAU, 0.75);
    col += rc * (prof * 0.10 + crease * 0.22) * uDream * (0.75 + 0.25 * sin(fi * 2.3 + w.x * 0.002));
  }

  // bokeh and star dust (drifting a whole number of cells per loop)
  float bk = bokehLayer(sp, 170.0, 1.0, uPh / TAU * 2.0, 0.22) + bokehLayer(sp * 1.0 + vec2(60.0, 0.0), 290.0, 2.0, uPh / TAU, 0.28) * 0.8;
  col += pearl(sp.x * 0.001 + sp.y * 0.0004, 0.7) * bk * 0.075 * uBokeh;
  vec2 sg = sp / 34.0;
  vec2 sid = floor(sg);
  float sh = hash12(sid + 41.0);
  if (sh > 0.955) {
    vec2 so = fract(sg) - 0.5 - (vec2(hash12(sid + 2.0), hash12(sid + 9.0)) - 0.5) * 0.6;
    float tw = 0.5 + 0.5 * sin(uPh * floor(2.0 + sh * 40.0 - 38.0) + sh * 60.0);
    col += vec3(0.9, 0.9, 1.0) * exp(-dot(so, so) * 180.0) * tw * 0.55 * uStars * (1.0 - 0.6 * smoothstep(0.55, 1.0, yN));
  }

  // the boop: one soft pearl ring rolling outward (no flash)
  float rp = length(p);
  float ring = exp(-pow((rp - uPulseR) / 46.0, 2.0)) + 0.4 * exp(-pow((rp - uPulseR * 0.72) / 70.0, 2.0));
  col += pearl(a / TAU + uPulseR * 0.001, 0.6) * ring * uPulseA * 0.55;

  frag = vec4(col, 1.0);
}`;

// ----------------------------------------------------------------- orbs --
// One emotion as a glass sphere: refracted, inverted sky, a thin-film rim, a
// window highlight, and inside it the feeling itself in its own material.
//   kind 0 sadness: shimmering blue liquid      3 loneliness: a tiny drifting star
//   kind 1 anxiety: a tangled lavender ribbon   4 overthinking: spinning thought bubbles
//   kind 2 anger:   a swirling orange flame     5 happiness: a glowing golden bloom
// uMorph (0→1) is the feeling's own transformation just before its Mallow
// emerges: the liquid lifts into a spiral, the ribbon untangles into a calm
// ring, the flame softens into a flower, the star finds companions, the
// thoughts slow into one ring, the bloom opens fully.
export const ORB_VS = `
layout(location=0) in vec2 aPos;
${CAM}
uniform vec4 uOrb;         // centre x, y (world), radius (world px)
uniform vec2 uSquash;
out vec2 vQ; out vec2 vScreen; out vec2 vCScreen;
void main() {
  vec2 q = aPos * 1.6;                       // room for the outer glow
  vQ = q;
  vec4 clip = vec4(worldToClip(uOrb.xy + q * uOrb.z * uSquash), 0., 1.);
  vec4 cc = vec4(worldToClip(uOrb.xy), 0., 1.);
  vScreen = clip.xy * 0.5 + 0.5;
  vCScreen = cc.xy * 0.5 + 0.5;
  gl_Position = clip;
}`;

export const ORB_FS = `
in vec2 vQ; in vec2 vScreen; in vec2 vCScreen;
uniform vec4 uOrb;
uniform float uKind, uReveal, uMorph, uAlpha, uPh, uSeed, uGlow, uFlash, uZoom;
uniform vec3 uGlowCol;
uniform sampler2D uBg;
out vec4 frag;
${COMMON}
${IRID}
float loopNoise(vec2 p, float k) { return fbm(p + vec2(cos(uPh * k), sin(uPh * k)) * 0.9); }

// ---- the veil: before a feeling is named, a milky pearl swirl
vec4 veil(vec2 c, float z) {
  vec2 cr = rot2(uPh * 1.0 + uSeed * 6.0) * c;
  float v = loopNoise(cr * 1.1 + uSeed * 3.0, 2.0);
  float swirl = 0.5 + 0.5 * sin(atan(cr.y, cr.x) * 2.0 + length(c) * 5.0 - uPh * 2.0 + v * 3.0);
  vec3 col = mix(vec3(0.85, 0.82, 1.0), pearl(v * 0.8 + uSeed, 0.5), 0.45) * (0.35 + 0.35 * z) + uGlowCol * 0.22 * (0.4 + 0.6 * swirl);
  col += vec3(1.0, 0.95, 1.1) * pow(swirl, 6.0) * 0.18;
  return vec4(col * 0.75, 0.42 * smoothstep(1.0, 0.75, length(c)));
}

// ---- 0 sadness: blue liquid sloshing in the sphere (rises into a spiral when it transforms)
vec4 sadness(vec2 c, float z) {
  float m = uMorph;
  vec2 cs = c;
  cs = rot2(m * 2.4 * (1.0 - length(c))) * cs;                 // lifts into a swirl
  float lvl = 0.12 - m * 0.9 + 0.07 * sin(cs.x * 2.6 + uPh * 6.0) + 0.035 * sin(cs.x * 6.1 - uPh * 9.0 + 1.0);
  float under = smoothstep(lvl - 0.025, lvl + 0.025, cs.y);
  float inS = smoothstep(1.0, 0.95, length(c));
  float dd = clamp(cs.y - lvl, 0.0, 2.0);
  vec3 light = vec3(0.16, 0.55, 1.5), deep = vec3(0.015, 0.07, 0.42);
  vec3 col = mix(light, deep, smoothstep(0.0, 0.95, dd));
  float caus = pow(abs(sin(cs.x * 8.0 + uPh * 5.0 + sin(cs.y * 7.0 - uPh * 4.0) * 1.6)), 10.0);
  col += vec3(0.4, 0.75, 1.6) * caus * 0.45 * smoothstep(0.5, 0.0, dd);
  float men = exp(-pow((cs.y - lvl) / 0.03, 2.0));
  // a few tiny rising bubbles (a whole number of rises per loop)
  float bub = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float y = 0.85 - fract(uPh / TAU * (3.0 + fi) + fi * 0.37) * 1.4;
    vec2 bp = vec2(-0.45 + fi * 0.3 + 0.05 * sin(uPh * 4.0 + fi), y);
    float br = 0.045 + 0.015 * fi / 3.0;
    float bd = length(c - bp);
    bub += smoothstep(br, br - 0.015, bd) * smoothstep(br - 0.03, br, bd) * step(lvl, y);
  }
  vec3 rgb = col * (0.7 + 0.3 * z) + vec3(0.7, 0.9, 1.6) * men * 0.9 + vec3(0.8, 0.95, 1.4) * bub * 0.8;
  return vec4(rgb * under * inS + vec3(0.7, 0.9, 1.6) * men * inS * 0.6, (under * 0.93 + men * 0.5) * inS);
}

// ---- 1 anxiety: a tangled ribbon (untangles into a calm, tilted ring)
vec3 ribbonAt(float u) {
  float p1 = uPh * 2.0, p2 = uPh * 3.0;
  vec3 tangled = vec3(0.56 * sin(3.0 * u + 0.7 + 0.15 * sin(p1)) + 0.17 * sin(7.0 * u + p2 * 0.0 + 1.0 + 0.3 * sin(p2)),
                      0.5 * sin(2.0 * u + 1.3 + 0.2 * cos(p1)) + 0.2 * cos(5.0 * u + 0.4 * sin(p2)),
                      cos(3.0 * u + 2.1) * 0.8 + 0.2 * sin(5.0 * u));
  vec3 calm = vec3(0.58 * cos(u), 0.2 * sin(u), sin(u));
  float m = smoothstep(0.0, 1.0, uMorph);
  return mix(tangled, calm, m);
}
vec4 anxiety(vec2 c, float z) {
  const int N = 72;
  float w = 0.075;
  float bestD = 1e9, bestZ = -9.0, nearD = 1e9, bestDepth = 0.0;
  vec3 a = ribbonAt(0.0);
  for (int i = 1; i <= N; i++) {
    vec3 b = ribbonAt(TAU * float(i) / float(N));
    vec2 pa = c - a.xy, ba = b.xy - a.xy;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float d = length(pa - ba * h);
    float zz = mix(a.z, b.z, h);
    nearD = min(nearD, d);
    // over/under at crossings: depth wins only by a clear margin, so neighbouring segments blend seamlessly
    float score = zz * 1.5 - d / w;
    if (d < w && score > bestZ) { bestZ = score; bestD = d; bestDepth = zz; }
    a = b;
  }
  if (bestZ < -8.0) { bestD = nearD; bestDepth = 0.0; }
  float k = bestD / w;
  float body = smoothstep(1.0, 0.82, k);
  float shade = sqrt(max(0.0, 1.0 - k * k));
  vec3 lav = vec3(0.62, 0.42, 1.25);
  vec3 col = lav * (0.3 + 0.7 * shade) + vec3(1.0, 0.9, 1.3) * pow(shade, 18.0) * 0.8;
  col *= mix(0.42, 1.08, bestDepth * 0.5 + 0.5);
  // a faint lavender haze in the sphere
  vec3 haze = vec3(0.3, 0.2, 0.55) * 0.25 * smoothstep(1.0, 0.0, length(c));
  return vec4(col * body + haze * (1.0 - body), body + 0.25 * (1.0 - body) * smoothstep(1.0, 0.0, length(c)));
}

// ---- 2 anger: a swirling flame (softens into a warm coral flower)
vec4 anger(vec2 c, float z) {
  float r = length(c);
  vec2 cs = rot2(1.1 * (1.0 - r) + sin(uPh * 2.0) * 0.25) * c;
  float sc = fract(uPh / TAU * 6.0);
  float nA = fbm(cs * 2.6 + vec2(0.0, sc * 1.6) + 4.0), nB = fbm(cs * 2.6 + vec2(0.0, (sc - 1.0) * 1.6) + 4.0);
  float n = mix(nA, nB, sc);
  float tear = length(vec2(c.x * (1.25 + c.y * 0.55), (c.y - 0.12) * 0.92));
  float flame = smoothstep(0.78, 0.18, tear + (n - 0.5) * 0.85 + max(0.0, -c.y) * 0.25 * n);
  vec3 fc = mix(vec3(0.9, 0.08, 0.02), vec3(1.6, 0.48, 0.06), smoothstep(0.0, 0.55, flame));
  fc = mix(fc, vec3(1.9, 1.3, 0.55), smoothstep(0.6, 1.0, flame));
  // the calm form: a coral flower with soft petals
  float a = atan(c.y, c.x) + uPh;
  float pr = 0.66 * (0.52 + 0.48 * pow(abs(cos(3.0 * a)), 0.7));
  float flower = smoothstep(pr, pr - 0.05, r);
  vec3 flc = mix(vec3(2.0, 0.6, 0.35), vec3(2.4, 1.5, 0.9), smoothstep(pr, 0.0, r)) * (0.75 + 0.25 * z);
  flc = mix(flc, vec3(2.6, 1.8, 0.6), smoothstep(0.16, 0.0, r));
  float m = smoothstep(0.0, 1.0, uMorph);
  float A = mix(flame * 0.95, flower, m);
  vec3 C = mix(fc * flame, flc * flower, m);
  vec3 ember = vec3(0.6, 0.12, 0.03) * 0.3 * smoothstep(1.0, 0.2, r) * (1.0 - A);
  return vec4(C + ember, A + 0.2 * (1.0 - A) * smoothstep(1.0, 0.2, r));
}

// ---- 3 loneliness: one small star adrift in a deep sphere (then companions arrive)
float star4(vec2 d, float s) {
  float core = exp(-dot(d, d) / (s * s * 0.06));
  float sp = exp(-abs(d.x) / (s * 0.05)) * exp(-abs(d.y) / (s * 0.75)) + exp(-abs(d.y) / (s * 0.05)) * exp(-abs(d.x) / (s * 0.75));
  return core + sp * 0.6;
}
vec4 loneliness(vec2 c, float z) {
  float r = length(c);
  vec3 deep = mix(vec3(0.05, 0.06, 0.22), vec3(0.01, 0.01, 0.07), smoothstep(0.0, 1.0, r));
  vec2 sp = vec2(0.24 * sin(uPh * 2.0), 0.16 * sin(uPh * 3.0 + 1.0));
  float tw = 0.85 + 0.15 * sin(uPh * 8.0);
  vec3 col = deep + vec3(1.3, 1.15, 0.85) * star4(c - sp, 0.22) * tw;
  // companions: a little galaxy gathers around it
  float m = uMorph;
  float gal = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float on = smoothstep(fi / 12.0, fi / 12.0 + 0.15, m);
    float ang = fi * 2.399 + uPh * 2.0;
    float rad = 0.18 + 0.05 * fi;
    vec2 p = sp * (1.0 - m) + vec2(cos(ang), sin(ang)) * rad * vec2(1.0, 0.75);
    gal += star4(c - p, 0.14 + 0.05 * hash12(vec2(fi, 3.0))) * on;
  }
  float swirl = fbm(rot2(r * 3.0 - uPh) * c * 3.0 + 2.0);
  col += vec3(1.0, 0.95, 1.25) * gal + vec3(0.35, 0.22, 0.8) * swirl * m * 0.6 * smoothstep(0.9, 0.1, r);
  return vec4(col, 0.82 * smoothstep(1.0, 0.92, r));
}

// ---- 4 overthinking: tiny thought bubbles racing round (they slow into one calm ring)
vec4 overthinking(vec2 c, float z) {
  vec3 col = vec3(0.0); float A = 0.0;
  float m = smoothstep(0.0, 1.0, uMorph);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float k = 3.0 + fi;                                   // whole turns per loop
    float ang = mix(uPh * k + fi * 1.3, fi * TAU / 5.0 + uPh * 2.0, m);
    vec2 e = vec2(0.5 - fi * 0.04, 0.26 + fi * 0.05);
    vec2 p = rot2(fi * 0.7 * (1.0 - m)) * (vec2(cos(ang), sin(ang)) * mix(e, vec2(0.42), m));
    float br = mix(0.13 + 0.025 * fi, 0.12, m);
    float d = length(c - p);
    float inside = smoothstep(br, br - 0.02, d);
    float rim = smoothstep(br - 0.05, br - 0.005, d) * inside;
    float hl = exp(-dot(c - p - vec2(-0.35, -0.38) * br, c - p - vec2(-0.35, -0.38) * br) / (br * br * 0.04));
    vec3 bc = vec3(0.85, 0.75, 1.4) * 0.25 + vec3(0.95, 0.85, 1.4) * rim * 0.9 + vec3(1.5) * hl;
    col = col * (1.0 - inside) + bc * inside;
    A = max(A, inside * 0.9);
  }
  float glow = exp(-dot(c, c) * 6.0) * m;
  col += vec3(1.2, 1.0, 1.7) * glow * 0.6;
  return vec4(col + vec3(0.25, 0.18, 0.45) * 0.3 * (1.0 - A), max(A, 0.18 * smoothstep(1.0, 0.0, length(c))) + glow * 0.3);
}

// ---- 5 happiness: a golden bloom breathing open
vec4 happiness(vec2 c, float z) {
  float r = length(c);
  float a = atan(c.y, c.x);
  float open = 0.8 + 0.07 * sin(uPh * 4.0) + uMorph * 0.25;
  float rot = uPh;
  float p1 = open * 0.66 * (0.45 + 0.55 * pow(abs(cos(4.0 * (a + rot * 0.25))), 0.8));
  float p2 = open * 0.42 * (0.45 + 0.55 * pow(abs(cos(4.0 * (a + rot * 0.25) + 0.785)), 0.8));
  float l1 = smoothstep(p1, p1 - 0.04, r), l2 = smoothstep(p2, p2 - 0.035, r);
  vec3 g1 = mix(vec3(1.5, 0.85, 0.12), vec3(1.6, 1.25, 0.55), smoothstep(0.0, p1, r)) * (0.7 + 0.3 * z);
  vec3 g2 = mix(vec3(1.6, 1.0, 0.25), vec3(1.75, 1.45, 0.75), smoothstep(0.0, p2, r));
  vec3 col = g1 * l1;
  col = mix(col, g2, l2);
  float cd = smoothstep(0.16, 0.13, r);
  float seeds = pow(abs(sin(a * 9.0) * sin(r * 60.0)), 6.0) * cd;
  col = mix(col, vec3(1.5, 0.75, 0.12) * (0.8 + 0.4 * seeds), cd);
  vec3 warm = vec3(0.9, 0.55, 0.12) * 0.35 * exp(-r * r * 3.0);
  float A = max(l1, cd);
  return vec4(col + warm * (1.0 - A), A + 0.3 * (1.0 - A) * exp(-r * r * 3.0));
}

void main() {
  vec2 q = vQ;
  float d = length(q);
  float R = uOrb.z * uZoom;                               // radius in screen px
  float aa = 1.4 / R;
  float inside = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);
  float z = sqrt(max(0.0, 1.0 - d * d));
  vec3 col = vec3(0.0);
  if (inside > 0.0) {
    // an inverted, magnified sky seen through the sphere
    vec2 ruv = vCScreen + (vScreen - vCScreen) * -0.45;
    vec3 bg = texture(uBg, ruv).rgb;
    col = bg * 0.6 * mix(vec3(1.0), uGlowCol * 0.6 + 0.4, 0.35);
    vec2 c = q / 0.86;
    vec4 content;
    int k = int(uKind + 0.5);
    if (k == 0) content = sadness(c, z);
    else if (k == 1) content = anxiety(c, z);
    else if (k == 2) content = anger(c, z);
    else if (k == 3) content = loneliness(c, z);
    else if (k == 4) content = overthinking(c, z);
    else content = happiness(c, z);
    vec4 v = veil(c, z);
    content = mix(v, content, uReveal);
    col = col * (1.0 - content.a) + content.rgb;
    // glass: thin-film rim, a window highlight, a small hot spot, a lower rim reflection
    float fres = pow(d, 3.5);
    col = col * (1.0 - fres * 0.35) + irid(d * 1.2 + atan(q.y, q.x) / TAU + uPh / TAU + uSeed) * fres * 0.75;
    vec2 hq = (q - vec2(-0.36, -0.42)) * vec2(1.0, 1.45);
    col += vec3(1.0) * smoothstep(0.32, 0.12, length(hq)) * 0.32;
    col += vec3(1.4) * exp(-dot(q - vec2(-0.42, -0.5), q - vec2(-0.42, -0.5)) * 260.0) * 0.9;
    col += vec3(0.9, 0.95, 1.1) * smoothstep(0.8, 0.97, d) * smoothstep(0.1, 0.7, q.y) * smoothstep(0.7, 0.0, abs(q.x)) * 0.35;
    col += uGlowCol * uFlash * (0.25 + 0.35 * z);
  }
  // outer glow in the feeling's colour
  float og = exp(-max(d - 1.0, 0.0) * R / 22.0) * (1.0 - inside) * smoothstep(1.6, 1.25, d);
  vec3 glow = uGlowCol * og * (uGlow + uFlash * 0.8) * 0.7;
  frag = vec4((col * inside + glow) * uAlpha, inside * uAlpha);
}`;

// --------------------------------------------------------------- mallow --
// The approved artwork on the soft-body mesh, relit relative to its own baked
// lighting (the v2 mesh shader's model), plus what the dream stage needs: soft
// focus for Mallows far behind (mip bias), atmospheric haze, a fade and the
// pearl glow of a Mallow emerging from (or returning into) its feeling.
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
  // emerging from a feeling: lit from within by its colour, edges first
  col = mix(col, uEmergeCol * (1.2 + 0.8 * rim), uEmerge * (0.55 + 0.45 * rim));
  col = mix(col, uHaze.rgb, uHaze.a);
  float a = albedo.a * uFade;
  frag = vec4(col * a, a);
}`;

// ------------------------------------------------------------ particles --
// Instanced: soft glow motes, four-point sparkles, petals and the soft
// elliptical light pools under the floating Mallows.
export const PART_VS = `
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aA;       // x, y, radius, alpha
layout(location=2) in vec4 aB;       // r, g, b, kind
layout(location=3) in vec2 aC;       // rotation, aspect
${CAM}
out vec2 vL; out float vAlpha; out vec3 vCol; out float vKind;
void main() {
  vL = aPos; vAlpha = aA.w; vCol = aB.rgb; vKind = aB.a;
  vec2 o = aPos * aA.z * vec2(aC.y, 1.0);
  float c = cos(aC.x), s = sin(aC.x);
  o = vec2(c * o.x - s * o.y, s * o.x + c * o.y);
  gl_Position = vec4(worldToClip(aA.xy + o), 0., 1.);
}`;
export const PART_FS = `
in vec2 vL; in float vAlpha; in vec3 vCol; in float vKind;
out vec4 frag;
void main() {
  float r = length(vL);
  int k = int(vKind + 0.5);
  float a;
  if (k == 0) {                // glow mote
    a = (exp(-r * r * 9.) + exp(-r * r * 2.2) * 0.35) * smoothstep(1., 0.7, r);
  } else if (k == 1) {         // four-point sparkle
    float sp = exp(-abs(vL.x) * 28.) * exp(-abs(vL.y) * 2.6) + exp(-abs(vL.y) * 28.) * exp(-abs(vL.x) * 2.6);
    a = (sp * 0.9 + exp(-r * r * 30.)) * smoothstep(1., 0.6, r);
  } else if (k == 2) {         // petal (soft lens shape, lit edge)
    float d = length(vec2(vL.x * 1.0, vL.y * 1.9));
    a = smoothstep(1.0, 0.82, d) * (0.75 + 0.25 * smoothstep(0.4, 1.0, -vL.y + 0.3));
  } else {                     // light pool (soft ellipse, normal blending)
    a = exp(-r * r * 3.2) * smoothstep(1., 0.8, r);
  }
  frag = vec4(vCol * a * vAlpha, k == 3 ? a * vAlpha : a * vAlpha * 0.35);
}`;
