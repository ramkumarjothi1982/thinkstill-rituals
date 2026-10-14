// Mesh-pass precomputation (profile feature meshNormalTex, PHASE2-PLAN perf
// step P7; also R21 "the mesh covers transparent padding").
//
// 1 The rest normal n0 of every art texel depends only on the Mallow: the
//   superellipse dome from the silhouette box blended with the derived normal
//   map's large-scale form. The approved mesh shader recomputes it for every
//   fragment of every sub-frame (pow, smoothstep, two normalisations and a
//   LOD-biased normal-map fetch). bakeRestNormals() renders it once per Mallow
//   into a half-float art-size texture; the fast mesh shader reads it back.
//   The approved shader fetches the normal map at LOD bias 3.5 on top of the
//   screen-space LOD (about 0.2–0.8 for v2's 0.56× Mallow); the bake uses one
//   fixed LOD, 3.5 + BAKE_LOD_BIAS.
// 2 Grid cells whose art and pristine texels are all fully transparent (alpha
//   0), with a margin for mip-mapped and anisotropic sampling, only ever
//   produce discarded fragments. trimmedIndex() lists the other cells, and the
//   fast mesh draws only those (same vertices, fewer triangles).

import { program, setUniforms, target, FS_VERT } from '../../gl.js';
import { COMMON } from '../glsl-v2.js';

/** Screen-space LOD of the approved normal-map fetch for a ~0.6× Mallow: log2(1 / 0.6). */
export const BAKE_LOD_BIAS = 0.74;
/** Margin (art texels) around a cell before it may be called empty: mip level 3 + anisotropy. */
export const TRIM_MARGIN = 16;

const BAKE_FS = `
in vec2 vUv;
uniform sampler2D uNormal; uniform float uHasNormal; uniform vec4 uBodyBox; uniform vec2 uArtSize; uniform float uLod;
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
  vec3 n0 = domeNormal(vUv);
  if (uHasNormal > 0.5) { vec3 nm = textureLod(uNormal, vUv, uLod).xyz * 2. - 1.; n0 = normalize(mix(n0, nm, 0.6)); }
  frag = vec4(n0, 1.);
}`;

/**
 * Bake n0 for the renderer's current Mallow. bodyBox: S.mallow.bodyBox (art px).
 * → a render target { tex, … } (RGBA16F, art size; texel row 0 = art row 0, like the art texture)
 */
export function bakeRestNormals(r, bodyBox) {
  const gl = r.gl;
  const [aw, ah] = r.artSize;
  const t = target(gl, aw, ah, { hdr: true });
  const p = program(gl, FS_VERT, BAKE_FS, 'bake-normals');
  t.bind();
  gl.useProgram(p.p);
  setUniforms(gl, p, {
    uNormal: { tex: r.normalTex || r.artTex, unit: 0 }, uHasNormal: r.normalTex ? 1 : 0,
    uBodyBox: bodyBox, uArtSize: r.artSize, uLod: 3.5 + BAKE_LOD_BIAS,
  });
  r.fs.draw();
  gl.deleteProgram(p.p);
  return t;
}

/**
 * A grid mesh like gl.js gridMesh (same vertex layout and upload/draw/dispose
 * interface, so a direction's buildMesh() fills it unchanged) that draws only
 * the triangles of `index` (trimmedIndex()).
 */
export function indexedGrid(gl, cols, rows, attribSizes, index) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const stride = attribSizes.reduce((s, n) => s + n, 0);
  const nVerts = (cols + 1) * (rows + 1);
  const data = new Float32Array(nVerts * stride);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  let off = 0;
  attribSizes.forEach((n, i) => {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, n, gl.FLOAT, false, stride * 4, off * 4);
    off += n;
  });
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return {
    cols, rows, stride, data, nVerts, triangles: index.length / 3,
    upload() { gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data); },
    draw() { gl.bindVertexArray(vao); gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null); },
    dispose() { gl.deleteVertexArray(vao); gl.deleteBuffer(vbo); gl.deleteBuffer(ibo); },
  };
}

/** Alpha channel (Uint8, row-major) of an image or canvas, at its own size. */
export function alphaOf(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const a = new Uint8Array(c.width * c.height);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
  return { a, w: c.width, h: c.height };
}

/**
 * Triangle indices of the grid cells that can show anything. alphas: alphaOf()
 * of every raster drawn through the mesh with art-size UVs (art, pristine);
 * keep: art-px boxes [x0, y0, x1, y1] that are always drawn (the face box: the
 * face canvas is procedural). A cell is kept when any texel within `margin` of
 * it has alpha > 0 or it touches a keep box.
 * → Uint32Array (same winding as gl.js gridMesh)
 */
export function trimmedIndex(cols, rows, alphas, { keep = [], margin = TRIM_MARGIN } = {}) {
  const { w, h } = alphas[0];
  // integral image of "any raster non-transparent", for O(1) box queries
  const S = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (const r of alphas) if (r.a[y * w + x]) { on = 1; break; }
      run += on;
      S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + run;
    }
  }
  const any = (x0, y0, x1, y1) => {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(w, x1); y1 = Math.min(h, y1);
    if (x1 <= x0 || y1 <= y0) return false;
    return S[y1 * (w + 1) + x1] - S[y0 * (w + 1) + x1] - S[y1 * (w + 1) + x0] + S[y0 * (w + 1) + x0] > 0;
  };
  const out = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x0 = Math.floor((i * w) / cols) - margin, x1 = Math.ceil(((i + 1) * w) / cols) + margin;
      const y0 = Math.floor((j * h) / rows) - margin, y1 = Math.ceil(((j + 1) * h) / rows) + margin;
      const kept = keep.some((k) => k[0] < x1 && k[2] > x0 && k[1] < y1 && k[3] > y0);
      if (!kept && !any(x0, y0, x1, y1)) continue;
      const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      out.push(a, c, b, b, c, d);
    }
  }
  return Uint32Array.from(out);
}
