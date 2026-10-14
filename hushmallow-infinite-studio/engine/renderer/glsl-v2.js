// The approved v2 shader text (stage2/renderer.js, frozen), byte for byte.
//
// The exact profile compiles exactly these strings, so its pixels stay those of
// the approved render (bit-identical to the goldens). They were cut out of the
// WP-01 renderer.js mechanically, and tests/unit/engine-shaders.test.mjs pins the
// sha256 of every exact-profile program source built from them. Never edit this
// file: a faster variant of a pass gets its own shader next to that pass
// (renderer/passes/*), gated by its own PSNR check against the exact profile.
//
// The lake world's shaders (WATER, WORLD_FS, REFL_FS) live in
// worlds/glsl/lake-v2.js under the same rule.

export const COMMON = `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
`;

// world-space camera: screen = (world - focus) * zoom + centre (pixels, y down)
export const CAM = `
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

export const MESH_VS = `
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

export const MESH_FS = `
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

export const BLUR_FS = `
in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 frag;
void main() {
  vec4 c = texture(uTex, vUv) * 0.2270270270;
  c += texture(uTex, vUv + uDir * 1.3846153846) * 0.3162162162;
  c += texture(uTex, vUv - uDir * 1.3846153846) * 0.3162162162;
  c += texture(uTex, vUv + uDir * 3.2307692308) * 0.0702702703;
  c += texture(uTex, vUv - uDir * 3.2307692308) * 0.0702702703;
  frag = c;
}`;

export const COPY_FS = `in vec2 vUv; uniform sampler2D uTex; uniform float uGain; out vec4 frag; void main() { frag = texture(uTex, vUv) * uGain; }`;

export const BRIGHT_FS = `in vec2 vUv; uniform sampler2D uTex; uniform float uThresh; out vec4 frag;
void main() { vec3 c = texture(uTex, vUv).rgb; float l = dot(c, vec3(.2126,.7152,.0722)); frag = vec4(c * smoothstep(uThresh, uThresh + 0.35, l), 1.); }`;

// glass thought bubble (SDF rounded rect), frosted over the blurred scene
export const GLASS_VS = `
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
export const GLASS_FS = `
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
export const PART_VS = `
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aInst;     // world x, y, radius, alpha
layout(location=2) in vec3 aCol;
${CAM}
out vec2 vL; out float vA; out vec3 vC;
void main() { vL = aPos; vA = aInst.w; vC = aCol; gl_Position = vec4(worldToClip(aInst.xy + aPos * aInst.z), 0., 1.); }`;
export const PART_FS = `in vec2 vL; in float vA; in vec3 vC; out vec4 frag;
void main() { float r = length(vL); float core = exp(-r * r * 9.) ; float halo = exp(-r * r * 2.2) * 0.35; float a = (core + halo) * vA * smoothstep(1., 0.7, r); frag = vec4(vC * a, a * 0.6); }`;

// The grain grid is the output pixel grid; at the defaults this is literally the
// stage2 shader text (vec2(1080., 1920.)), so the compiled shader is the same.
export const glslFloat = (v) => (Number.isInteger(v) ? `${v}.` : String(v));
export const postFS = (outW, outH) => `
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
  float g = hash12(vUv * vec2(${glslFloat(outW)}, ${glslFloat(outH)}) + fract(uTime * 7.13) * 100.) - 0.5;
  c += g * uGrain + (hash12(vUv * 1931. + uTime) - 0.5) / 255.;
  frag = vec4(c, 1.);
}`;

export const ACC_FS = `in vec2 vUv; uniform sampler2D uTex; uniform float uW; out vec4 frag; void main() { frag = texture(uTex, vUv) * uW; }`;
