// Mesh renderers for MallowTouch.
//
//   Tier A  MeshRenderer — WebGL1, one context per stage (never per Mallow).
//           The live skin canvas is a premultiplied texture, updated with
//           texSubImage2D of only the face rect that changed. Lighting comes
//           from the solver: compression darkens, a pseudo-normal from the
//           dent field catches a specular streak, a rim glow in the Mallow's
//           own colour rises while squeezed, the face trails the body by a
//           uv offset, and Glitzi's glitch lines + slice bursts are drawn in
//           the shader so its skin no longer redraws every frame.
//           Context loss → onLost (the stage drops to tier B) → restore.
//   Tier B  drawTriangleWarp — Canvas 2D affine triangles on a coarse grid
//           (every other solver vertex), each clipped and grown a hair to
//           hide seams.
//   Tier C  drawStripWarp — the old strip warp, with each strip's width and
//           offset from the solver's row extents. No seams, cheapest.

const VS = `
attribute vec2 aPos;
attribute vec2 aUv;
attribute vec3 aShade;
attribute float aFace;
uniform mat3 uM;
uniform vec2 uLag;
varying vec2 vUv;
varying vec3 vShade;
void main() {
  vec3 p = uM * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  vUv = aUv + uLag * aFace;
  vShade = aShade;
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform vec2 uSrc;
uniform vec3 uRimCol;
uniform float uRim;
uniform float uLight;
uniform float uSpec;
uniform vec4 uGl[9];
uniform float uGlOn;
uniform float uGlThick;
uniform vec3 uBurst[6];
varying vec2 vUv;
varying vec3 vShade;
void main() {
  vec2 uv = vUv;
  for (int i = 0; i < 6; i++) {
    vec3 b = uBurst[i];
    if (b.z > 0.0 && abs(uv.y - b.x) < b.z) uv.x += b.y;
  }
  vec4 c = texture2D(uTex, uv);
  if (c.a < 0.003) discard;
  vec3 rgb = c.rgb;
  if (uGlOn > 0.5) {
    vec2 sp = uv * uSrc;
    for (int i = 0; i < 9; i++) {
      vec4 g = uGl[i];
      float band = 1.0 - smoothstep(uGlThick * 0.5 - 0.7, uGlThick * 0.5 + 0.7, abs(sp.y - g.x));
      float t = (sp.x - g.y) / g.z;
      if (band > 0.0 && t > 0.0 && t < 1.0) {
        vec3 col = mix(mix(vec3(0.243, 0.91, 1.0), vec3(1.0), smoothstep(0.3, 0.55, t)), vec3(1.0, 0.239, 0.949), smoothstep(0.55, 0.8, t));
        float a = g.w * band * smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(0.8, 1.0, t));
        rgb = rgb * (1.0 - a) + col * a * c.a;
      }
    }
  }
  // light from the deformation: squeezed skin sinks and darkens, the walls of
  // a dent and the bulges facing the light catch a soft specular streak.
  // Highlights are screened on (never past white) and gentler on pale skin,
  // so a light Mallow keeps its texture at full squeeze.
  vec3 n = normalize(vec3(vShade.y, vShade.z, 1.0));
  vec3 L = normalize(vec3(-0.5, -0.78, 0.38));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float comp = clamp(vShade.x, -0.6, 1.6);
  float diff = dot(n, L) - L.z;
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114)) / max(c.a, 0.004);
  float pale = smoothstep(0.5, 0.9, lum);
  float shade = (1.0 - 0.16 * comp * uLight) * (1.0 + 0.55 * diff * uLight);
  rgb = min(rgb * clamp(shade, 0.55, mix(1.22, 1.06, pale)), vec3(c.a));
  float spec = max(pow(max(dot(n, H), 0.0), 26.0) - pow(H.z, 26.0), 0.0) * uLight;
  float sp = clamp(spec * 0.42 * uSpec * (1.0 - 0.65 * pale), 0.0, 0.6);
  rgb += (vec3(c.a) - rgb) * sp * vec3(1.0, 0.98, 1.0);
  if (uRim > 0.001) {
    float a1 = texture2D(uTex, uv + vec2(uTexel.x * 4.0, 0.0)).a;
    float a2 = texture2D(uTex, uv - vec2(uTexel.x * 4.0, 0.0)).a;
    float a3 = texture2D(uTex, uv + vec2(0.0, uTexel.y * 4.0)).a;
    float a4 = texture2D(uTex, uv - vec2(0.0, uTexel.y * 4.0)).a;
    float edge = c.a * (1.0 - min(min(a1, a2), min(a3, a4)));
    rgb += (vec3(c.a) - rgb) * uRimCol * clamp(edge * uRim * (1.0 - 0.5 * pale), 0.0, 1.0);
  }
  gl_FragColor = vec4(rgb, c.a);
}`;

// soft elliptical blobs (contact shadow, aura)
const BVS = `
attribute vec2 aQ;
uniform vec4 uRect;   // cx, cy, rx, ry in clip space
varying vec2 vQ;
void main() { vQ = aQ; gl_Position = vec4(uRect.xy + aQ * uRect.zw, 0.0, 1.0); }`;
const BFS = `
precision mediump float;
uniform vec4 uCol;    // premultiplied by the shader
uniform float uInner;
varying vec2 vQ;
void main() {
  float d = length(vQ);
  float a = uCol.a * (1.0 - smoothstep(uInner, 1.0, d));
  if (a < 0.002) discard;
  gl_FragColor = vec4(uCol.rgb * a, a);
}`;

export function webglAvailable(strict = false) {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { failIfMajorPerformanceCaveat: strict });
    const ok = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch { return false; }
}

export class MeshRenderer {
  /** @param {HTMLCanvasElement} canvas  @param {{strict?:boolean, onLost?:Function, onRestored?:Function}} o */
  constructor(canvas, o = {}) {
    this.canvas = canvas;
    this.o = o;
    this.bodies = new Map();
    this.lost = false;
    this._scratch = new Map();
    this._mat = new Float32Array(9);
    this._noGlitch = new Float32Array(36);
    this._noBurst = new Float32Array(18);
    this._onLost = (e) => { e.preventDefault(); this.lost = true; this.o.onLost?.(); };
    this._onRestored = () => { this.lost = false; this._init(); for (const [k, b] of this.bodies) this._uploadBody(k, b); this.o.onRestored?.(); };
    canvas.addEventListener('webglcontextlost', this._onLost);
    canvas.addEventListener('webglcontextrestored', this._onRestored);
    this.ok = this._init();
  }

  _init() {
    const gl = this.canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: !!this.o.strict,
    });
    this.gl = gl;
    if (!gl) return false;
    const prog = (vs, fs) => {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) || 'shader');
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) || 'link');
      return p;
    };
    try {
      this.prog = prog(VS, FS);
      this.bprog = prog(BVS, BFS);
    } catch (e) { console.warn('MallowTouch: WebGL shaders failed', e); this.gl = null; return false; }
    const P = this.prog, B = this.bprog;
    this.a = { pos: gl.getAttribLocation(P, 'aPos'), uv: gl.getAttribLocation(P, 'aUv'), shade: gl.getAttribLocation(P, 'aShade'), face: gl.getAttribLocation(P, 'aFace') };
    this.u = {};
    for (const n of ['uM', 'uLag', 'uTex', 'uTexel', 'uSrc', 'uRimCol', 'uRim', 'uLight', 'uSpec', 'uGl', 'uGlOn', 'uGlThick', 'uBurst']) this.u[n] = gl.getUniformLocation(P, n);
    this.ba = gl.getAttribLocation(B, 'aQ');
    this.bu = { rect: gl.getUniformLocation(B, 'uRect'), col: gl.getUniformLocation(B, 'uCol'), inner: gl.getUniformLocation(B, 'uInner') };
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    return true;
  }

  /** Register a mesh: {source canvas, indices, uvs, faceW, n}. */
  addBody(key, spec) {
    const b = { ...spec, tex: null, w: 0, h: 0 };
    this.bodies.set(key, b);
    if (this.gl && !this.lost) this._uploadBody(key, b);
    return b;
  }

  removeBody(key) {
    const b = this.bodies.get(key), gl = this.gl;
    if (b && gl && !this.lost) { gl.deleteTexture(b.tex); for (const k of ['pos', 'uvBuf', 'shadeBuf', 'faceBuf', 'idx']) if (b[k]) gl.deleteBuffer(b[k]); }
    this.bodies.delete(key);
  }

  _uploadBody(key, b) {
    const gl = this.gl;
    if (!gl) return;
    const buf = (data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) => {
      const x = gl.createBuffer(); gl.bindBuffer(target, x); gl.bufferData(target, data, usage); return x;
    };
    b.pos = buf(new Float32Array(b.n * 2), gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    b.shadeBuf = buf(new Float32Array(b.n * 3), gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    b.uvBuf = buf(b.uvs);
    b.faceBuf = buf(b.faceW);
    b.idx = buf(b.indices, gl.ELEMENT_ARRAY_BUFFER);
    b.count = b.indices.length;
    b.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, b.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    b.w = 0; b.h = 0;
    if (b.source) this.updateTexture(key, b.source, null);
  }

  /** Upload the skin: the whole canvas, or only rect {x,y,w,h} — or a list of
   *  such rects (each face part that changed) — with texSubImage2D. */
  updateTexture(key, source, rect) {
    const gl = this.gl, b = this.bodies.get(key);
    if (!gl || this.lost || !b || !source) return 0;
    b.source = source;
    gl.bindTexture(gl.TEXTURE_2D, b.tex);
    let area = 0, isFull = !rect || !!rect.full;
    if (Array.isArray(rect)) { for (const r of rect) { area += r.w * r.h; if (r.full) isFull = true; } if (!rect.length) return 0; } else if (rect) area = rect.w * rect.h;
    const full = isFull || source.width !== b.w || source.height !== b.h || area > 0.6 * source.width * source.height;
    if (full) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      b.w = source.width; b.h = source.height;
      return b.w * b.h;
    }
    if (Array.isArray(rect)) { for (const r of rect) this._subUpload(source, r); return area; }
    this._subUpload(source, rect);
    return area;
  }

  // copy the rect into a reused canvas of exactly that size, upload it
  _subUpload(source, rect) {
    const gl = this.gl;
    const key2 = rect.w + 'x' + rect.h;
    let s = this._scratch.get(key2);
    if (!s) {
      if (this._scratch.size > 10) this._scratch.delete(this._scratch.keys().next().value);
      const c = document.createElement('canvas');
      c.width = rect.w; c.height = rect.h;
      s = { c, g: c.getContext('2d') };
      this._scratch.set(key2, s);
    }
    s.g.globalCompositeOperation = 'copy';
    s.g.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, rect.x, rect.y, gl.RGBA, gl.UNSIGNED_BYTE, s.c);
  }

  resize(cssW, cssH, dpr) {
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.dpr = dpr; this.cssW = cssW; this.cssH = cssH;
  }

  /**
   * Draw one frame.
   * blobs: [{x, y, rx, ry, rgba:[r,g,b,a], inner}] in CSS px (drawn first)
   * items: [{key, positions, shade, m:[a,b,c,d,e,f] body→CSS px, lag:[u,v], rim, rimCol:[r,g,b], light,
   *          glitch: Float32Array(36)|null, glitchThick, burst: Float32Array(18)|null, src:[w,h]}]
   */
  draw(items, blobs = []) {
    const gl = this.gl;
    if (!gl || this.lost) return false;
    const W = this.canvas.width, H = this.canvas.height, dpr = this.dpr || 1;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const sx = (2 * dpr) / W, sy = (-2 * dpr) / H;
    if (blobs.length) {
      gl.useProgram(this.bprog);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.enableVertexAttribArray(this.ba);
      gl.vertexAttribPointer(this.ba, 2, gl.FLOAT, false, 0, 0);
      for (const b of blobs) {
        gl.uniform4f(this.bu.rect, b.x * sx - 1, b.y * sy + 1, b.rx * sx, -b.ry * sy);
        gl.uniform4f(this.bu.col, b.rgba[0], b.rgba[1], b.rgba[2], b.rgba[3]);
        gl.uniform1f(this.bu.inner, b.inner ?? 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.disableVertexAttribArray(this.ba);
    }
    gl.useProgram(this.prog);
    const u = this.u, a = this.a, M = this._mat;
    gl.uniform1i(u.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    for (const it of items) {
      const b = this.bodies.get(it.key);
      if (!b || !b.tex) continue;
      const [ma, mb, mc, md, me, mf] = it.m;
      // column-major: body units → CSS px → clip
      M[0] = ma * sx; M[1] = mb * sy; M[2] = 0;
      M[3] = mc * sx; M[4] = md * sy; M[5] = 0;
      M[6] = me * sx - 1; M[7] = mf * sy + 1; M[8] = 1;
      gl.uniformMatrix3fv(u.uM, false, M);
      gl.uniform2f(u.uLag, it.lag?.[0] || 0, it.lag?.[1] || 0);
      gl.uniform2f(u.uTexel, 1 / (b.w || 1), 1 / (b.h || 1));
      gl.uniform2f(u.uSrc, it.src?.[0] || 1, it.src?.[1] || 1);
      const rc = it.rimCol || [1, 1, 1];
      gl.uniform3f(u.uRimCol, rc[0], rc[1], rc[2]);
      gl.uniform1f(u.uRim, it.rim || 0);
      gl.uniform1f(u.uLight, it.light ?? 1);
      gl.uniform1f(u.uSpec, it.spec ?? 1);
      gl.uniform1f(u.uGlOn, it.glitch ? 1 : 0);
      gl.uniform4fv(u.uGl, it.glitch || this._noGlitch);
      gl.uniform1f(u.uGlThick, it.glitchThick || 3);
      gl.uniform3fv(u.uBurst, it.burst || this._noBurst);
      gl.bindTexture(gl.TEXTURE_2D, b.tex);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, it.positions);
      gl.enableVertexAttribArray(a.pos); gl.vertexAttribPointer(a.pos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.shadeBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, it.shade);
      gl.enableVertexAttribArray(a.shade); gl.vertexAttribPointer(a.shade, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.uvBuf);
      gl.enableVertexAttribArray(a.uv); gl.vertexAttribPointer(a.uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.faceBuf);
      gl.enableVertexAttribArray(a.face); gl.vertexAttribPointer(a.face, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_SHORT, 0);
    }
    // leave no attribute enabled on a buffer a later removeBody may delete
    gl.disableVertexAttribArray(a.pos); gl.disableVertexAttribArray(a.shade);
    gl.disableVertexAttribArray(a.uv); gl.disableVertexAttribArray(a.face);
    return true;
  }

  /** Free everything and give the context back to the browser now (iOS keeps
   *  only a few WebGL contexts alive; waiting for GC strands them). */
  destroy() {
    this.canvas.removeEventListener('webglcontextlost', this._onLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onRestored);
    const gl = this.gl;
    for (const k of [...this.bodies.keys()]) this.removeBody(k);
    if (gl && !this.lost) {
      try { if (this.prog) gl.deleteProgram(this.prog); if (this.bprog) gl.deleteProgram(this.bprog); if (this.quad) gl.deleteBuffer(this.quad); } catch { /* lost */ }
    }
    for (const s of this._scratch.values()) { s.c.width = s.c.height = 0; }
    this._scratch.clear();
    try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* already lost */ }
    this.canvas.width = this.canvas.height = 0;
    this.gl = null;
    this.lost = true;
  }
}

// ------------------------------------------------------------ tier B --
/** Coarse triangle list over a SoftBody: every `step`-th lattice vertex, quads
 *  dropped where the fine mesh was culled. Built once per body. */
export function coarseGrid(sb, step = 2) {
  const { cols, rows } = sb;
  const ci = [], cj = [];
  for (let i = 0; i < cols; i += step) ci.push(i);
  if (ci[ci.length - 1] !== cols - 1) ci.push(cols - 1);
  for (let j = 0; j < rows; j += step) cj.push(j);
  if (cj[cj.length - 1] !== rows - 1) cj.push(rows - 1);
  const visible = new Uint8Array((cols - 1) * (rows - 1));
  const T = sb.indices;
  for (let t = 0; t < T.length; t += 3) {
    const k = Math.min(T[t], T[t + 1], T[t + 2]);
    const i = k % cols, j = (k / cols) | 0;
    visible[j * (cols - 1) + Math.min(i, cols - 2)] = 1;
  }
  const tris = [];
  for (let b = 0; b < cj.length - 1; b++) {
    for (let a = 0; a < ci.length - 1; a++) {
      let on = false;
      for (let j = cj[b]; j < cj[b + 1] && !on; j++) for (let i = ci[a]; i < ci[a + 1] && !on; i++) on = !!visible[j * (cols - 1) + i];
      if (!on) continue;
      const p = (i, j) => j * cols + i;
      const A = p(ci[a], cj[b]), B = p(ci[a + 1], cj[b]), C = p(ci[a], cj[b + 1]), D = p(ci[a + 1], cj[b + 1]);
      if ((a + b) % 2 === 0) tris.push(A, B, D, A, D, C); else tris.push(A, B, C, B, D, C);
    }
  }
  return new Uint16Array(tris);
}

/**
 * Draw the skin through a triangle list with affine-mapped, clipped triangles.
 * m: body units → CSS px affine [a,b,c,d,e,f]; dpr: device px per CSS px.
 */
export function drawTriangleWarp(ctx, skin, sb, tris, m, dpr, grow = 0.7) {
  const P = sb.positions, UV = sb.uvs;
  const SW = skin.width, SH = skin.height;
  const [ma, mb, mc, md, me, mf] = m;
  for (let t = 0; t < tris.length; t += 3) {
    const i = tris[t], j = tris[t + 1], k = tris[t + 2];
    // destination, device px
    const x0 = (ma * P[2 * i] + mc * P[2 * i + 1] + me) * dpr, y0 = (mb * P[2 * i] + md * P[2 * i + 1] + mf) * dpr;
    const x1 = (ma * P[2 * j] + mc * P[2 * j + 1] + me) * dpr, y1 = (mb * P[2 * j] + md * P[2 * j + 1] + mf) * dpr;
    const x2 = (ma * P[2 * k] + mc * P[2 * k + 1] + me) * dpr, y2 = (mb * P[2 * k] + md * P[2 * k + 1] + mf) * dpr;
    // source, skin px
    const u0 = UV[2 * i] * SW, v0 = UV[2 * i + 1] * SH, u1 = UV[2 * j] * SW, v1 = UV[2 * j + 1] * SH, u2 = UV[2 * k] * SW, v2 = UV[2 * k + 1] * SH;
    const den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
    if (Math.abs(den) < 1e-9) continue;
    const A = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / den;
    const B = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / den;
    const C = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / den;
    const D = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / den;
    const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
    // grow the clip a hair (in device px) so neighbours overlap: no seams
    const g = (x, y) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * grow, y + (dy / l) * grow]; };
    const [gx0, gy0] = g(x0, y0), [gx1, gy1] = g(x1, y1), [gx2, gy2] = g(x2, y2);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.moveTo(gx0, gy0); ctx.lineTo(gx1, gy1); ctx.lineTo(gx2, gy2); ctx.closePath();
    ctx.clip();
    ctx.setTransform(A, C, B, D, x0 - A * u0 - B * v0, y0 - C * u0 - D * v0);
    // only the source triangle's bounding box (cheaper than the whole skin)
    const sx0 = Math.max(0, Math.floor(Math.min(u0, u1, u2)) - 2), sy0 = Math.max(0, Math.floor(Math.min(v0, v1, v2)) - 2);
    const sx1 = Math.min(SW, Math.ceil(Math.max(u0, u1, u2)) + 2), sy1 = Math.min(SH, Math.ceil(Math.max(v0, v1, v2)) + 2);
    if (sx1 > sx0 && sy1 > sy0) ctx.drawImage(skin, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0, sy0, sx1 - sx0, sy1 - sy0);
    ctx.restore();
  }
}

// ------------------------------------------------------------ tier C --
/**
 * Strip warp driven by SoftBody.rowExtents(): each strip of the skin's body
 * band is drawn between that row's left and right particles.
 * uvRect: [u0,v0,u1,v1] of the lattice in the skin; burst(vm) → x shift (body units).
 */
export function drawStripWarp(ctx, skin, sb, m, dpr, uvRect, strips = 44, burst = null) {
  const E = sb.rowExtents();
  const rows = sb.rows;
  const SW = skin.width, SH = skin.height;
  const [u0, v0, u1, v1] = uvRect;
  const sx = u0 * SW, sw = (u1 - u0) * SW;
  ctx.save();
  ctx.setTransform(m[0] * dpr, m[1] * dpr, m[2] * dpr, m[3] * dpr, m[4] * dpr, m[5] * dpr);
  ctx.imageSmoothingEnabled = true;
  const at = (f, o) => { // interpolate row extents at fractional row f
    const j = Math.min(rows - 2, Math.max(0, f | 0)), t = f - j;
    return E[3 * j + o] * (1 - t) + E[3 * (j + 1) + o] * t;
  };
  for (let s = 0; s < strips; s++) {
    const f0 = (s / strips) * (rows - 1), f1 = ((s + 1) / strips) * (rows - 1);
    const y0 = at(f0, 0), y1 = at(f1, 0);
    const fm = (f0 + f1) / 2;
    const xl = at(fm, 1), xr = at(fm, 2);
    const vm = (s + 0.5) / strips;
    const shift = burst ? burst(vm) : 0;
    const syA = (v0 + (v1 - v0) * (s / strips)) * SH, syB = (v0 + (v1 - v0) * ((s + 1) / strips)) * SH;
    const h = (y1 - y0) + 0.9 / Math.max(1e-6, Math.hypot(m[2], m[3]) * dpr);  // overlap by ~1 device px
    ctx.drawImage(skin, sx, syA, sw, Math.max(0.5, syB - syA + 0.5), xl + shift, y0, xr - xl, h);
  }
  ctx.restore();
}

