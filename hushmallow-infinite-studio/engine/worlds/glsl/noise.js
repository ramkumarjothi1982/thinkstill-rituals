// Value noise for the world shaders: hash12, vnoise and fbm with a configurable
// number of octaves (5 = the approved world; the draft profile uses 3). Same
// functions as the approved COMMON chunk (renderer/glsl-v2.js), which the exact
// profile keeps byte for byte.

/** GLSL noise chunk; octaves: fbm octave count (integer >= 1). */
export function noiseGLSL(octaves = 5) {
  if (!(Number.isInteger(octaves) && octaves >= 1)) throw new Error(`fbm octaves must be a positive integer, got ${octaves}`);
  return `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < ${octaves}; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
`;
}
