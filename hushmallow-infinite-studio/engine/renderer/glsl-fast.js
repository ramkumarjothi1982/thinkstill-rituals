// Shaders of the fast pipeline (every profile but exact). Each variant keeps the
// approved math (renderer/glsl-v2.js) and changes only what its profile feature
// names; the feature's PSNR gate measures the difference (WP-02).

import { COMMON } from './glsl-v2.js';

/**
 * The Mallow mesh, fast variants.
 *   faceBox    (faceFastGlow) the face texture covers only the face box: uFaceBox =
 *              [u0, v0, du, dv] maps art UV into it, transparent outside
 */
export function meshFS({ faceBox = false } = {}) {
  return `
in vec2 vUv; in float vComp; in float vBend;
uniform sampler2D uArt; uniform sampler2D uFace; uniform sampler2D uNormal; uniform sampler2D uPristine;
uniform float uRest;
uniform float uHasNormal;
uniform vec4 uBodyBox;
uniform vec2 uArtSize;
uniform vec3 uLightDir; uniform vec3 uKey; uniform vec3 uRim; uniform float uRimAmt;
uniform float uSpec; uniform vec3 uSpecCol; uniform vec3 uGlowCol; uniform float uGlow;
uniform vec3 uAmbient; uniform float uSSS; uniform float uReflect;
uniform float uExposure;
${faceBox ? 'uniform vec4 uFaceBox;' : ''}
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
  vec4 art = texture(uArt, vUv);
${faceBox ? `  vec2 fuv = (vUv - uFaceBox.xy) / uFaceBox.zw;
  vec4 face = texture(uFace, fuv) * step(0., fuv.x) * step(fuv.x, 1.) * step(0., fuv.y) * step(fuv.y, 1.);` : '  vec4 face = texture(uFace, vUv);'}
  vec4 albedo = face + art * (1. - face.a);
  if (uRest > 0.001) albedo = mix(albedo, texture(uPristine, vUv), uRest);
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
  col = mix(col, col * vec3(0.72, 0.78, 1.0), uReflect);
  frag = vec4(col * uExposure * albedo.a, albedo.a);
}
`;
}

/** The world behind the glass (P5): foreground over world, resampled to the target (1/4 res). */
export const UNDER_FS = `in vec2 vUv; uniform sampler2D uFg; uniform sampler2D uBg; out vec4 frag;
void main() { vec4 f = texture(uFg, vUv); frag = vec4(f.rgb + texture(uBg, vUv).rgb * (1. - f.a), 1.); }`;
