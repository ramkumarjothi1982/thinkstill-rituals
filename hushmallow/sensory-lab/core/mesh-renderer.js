// Mesh renderer: draws the Mallow's skin (approved art + animated face) through
// the deformed soft-body mesh.
//
// WebGL first (one draw call, seamless, GPU texture filtering), drawing into an
// offscreen canvas that the rig composites onto its visible 2-D canvas in the
// same frame. Each vertex carries a light term from the local area change, so
// squashed regions deepen slightly and stretched ones thin and brighten — the
// art reads as a soft material, never as a flat warped picture.
// Falls back to Canvas 2D textured triangles if WebGL is missing or lost.

const VS = `
attribute vec2 aPos; attribute vec2 aUv; attribute float aShade;
uniform vec2 uRes; varying vec2 vUv; varying float vShade;
void main() {
  vec2 c = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
  vUv = aUv; vShade = aShade;
}`;
const FS = `
precision mediump float;
uniform sampler2D uTex; varying vec2 vUv; varying float vShade;
uniform float uShadeK; uniform float uGloss; uniform float uHaze; uniform vec2 uHi; uniform vec2 uHiR;
void main() {
  vec4 c = texture2D(uTex, vUv);
  // premultiplied colour: brighten (stretch) or deepen (squash) without touching alpha
  float s = vShade * uShadeK;
  vec3 rgb = s > 0.0 ? mix(c.rgb, vec3(c.a), s * 0.35) : c.rgb * (1.0 + s * 0.45);
  // wet highlight pinned to the body (texture space), so it rides the wobble
  if (uGloss > 0.0) {
    vec2 d = (vUv - uHi) / uHiR;
    rgb += vec3(c.a) * exp(-dot(d, d) * 2.2) * uGloss * (0.55 + max(s, 0.0));
  }
  rgb = mix(rgb, vec3(c.a), uHaze);
  gl_FragColor = vec4(min(rgb, vec3(c.a)), c.a);
}`;

export class MeshRenderer {
  constructor({ prefer = 'webgl' } = {}) {
    this.canvas = document.createElement('canvas');
    this.mode = '2d';
    if (prefer === 'webgl') this._initGL();
    if (this.mode === '2d') this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (this.disposed) return;
      // the 2-D path keeps the Mallow on screen until the page is reloaded
      this.mode = '2d'; this.gl = null;
      const c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height;
      this.canvas = c; this.ctx = c.getContext('2d');
    });
  }

  _initGL() {
    let gl = null;
    try {
      gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    } catch { gl = null; }
    if (!gl) return;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    try {
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      this.prog = prog;
      this.loc = {
        aPos: gl.getAttribLocation(prog, 'aPos'), aUv: gl.getAttribLocation(prog, 'aUv'), aShade: gl.getAttribLocation(prog, 'aShade'),
        uRes: gl.getUniformLocation(prog, 'uRes'), uTex: gl.getUniformLocation(prog, 'uTex'),
        uShadeK: gl.getUniformLocation(prog, 'uShadeK'), uGloss: gl.getUniformLocation(prog, 'uGloss'), uHaze: gl.getUniformLocation(prog, 'uHaze'),
        uHi: gl.getUniformLocation(prog, 'uHi'), uHiR: gl.getUniformLocation(prog, 'uHiR'),
      };
      this.bPos = gl.createBuffer(); this.bUv = gl.createBuffer(); this.bShade = gl.createBuffer(); this.bIdx = gl.createBuffer();
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      this.gl = gl;
      this.mode = 'webgl';
    } catch (err) {
      console.warn('[sensory-lab] WebGL unavailable, using 2D mesh', err);
      this.gl = null;
      this.canvas = document.createElement('canvas');
    }
  }

  /**
   * Material look. look: {shade, gloss, haze}; hi / hiR: highlight centre and radii in texture space.
   * (The Canvas 2D fallback draws the plain art.)
   */
  setLook(look = {}, hi = [0.35, 0.3], hiR = [0.16, 0.1]) {
    this.look = { shade: look.shade ?? 1, gloss: look.gloss ?? 0, haze: look.haze ?? 0, hi, hiR };
  }

  /** Static mesh topology: triangle indices and per-vertex texture coords. */
  setMesh(tri, uv) {
    this.tri = tri; this.uv = uv; this.nTri = tri.length;
    this.shade = new Float32Array(uv.length / 2);
    const gl = this.gl;
    if (!gl) return;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tri, gl.STATIC_DRAW);
    this.setUv(uv);
  }

  setUv(uv) {
    this.uv = uv;
    const gl = this.gl;
    if (!gl) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
  }

  resize(w, h, dpr) {
    const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    this.w = w; this.h = h; this.dpr = dpr;
  }

  /**
   * @param {HTMLCanvasElement} tex  skin canvas
   * @param {boolean} texDirty       re-upload the skin this frame
   * @param {Float32Array} pos       vertex positions, CSS px (x0,y0,x1,y1,…)
   * @param {Float32Array} shade     per-vertex light term (−1..1)
   */
  draw(tex, texDirty, pos, shade) {
    if (this.mode === 'webgl' && this.gl) return this._drawGL(tex, texDirty, pos, shade);
    return this._draw2D(tex, pos);
  }

  _drawGL(tex, texDirty, pos, shade) {
    const gl = this.gl, L = this.loc;
    if (gl.isContextLost()) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    if (texDirty || !this._uploaded) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
      this._uploaded = true;
    }
    gl.uniform1i(L.uTex, 0);
    gl.uniform2f(L.uRes, this.w, this.h);
    const lk = this.look || { shade: 1, gloss: 0, haze: 0, hi: [0.35, 0.3], hiR: [0.16, 0.1] };
    gl.uniform1f(L.uShadeK, lk.shade); gl.uniform1f(L.uGloss, lk.gloss); gl.uniform1f(L.uHaze, lk.haze);
    gl.uniform2f(L.uHi, lk.hi[0], lk.hi[1]); gl.uniform2f(L.uHiR, lk.hiR[0], lk.hiR[1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(L.aPos);
    gl.vertexAttribPointer(L.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv);
    gl.enableVertexAttribArray(L.aUv);
    gl.vertexAttribPointer(L.aUv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bShade);
    gl.bufferData(gl.ARRAY_BUFFER, shade, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(L.aShade);
    gl.vertexAttribPointer(L.aShade, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx);
    gl.drawElements(gl.TRIANGLES, this.nTri, gl.UNSIGNED_SHORT, 0);
  }

  // textured triangles: clip each one and map the skin with an affine transform
  _draw2D(tex, pos) {
    const ctx = this.ctx, d = this.dpr, T = this.tri, uv = this.uv;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const tw = tex.width, th = tex.height;
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t], b = T[t + 1], c = T[t + 2];
      let x0 = pos[a * 2] * d, y0 = pos[a * 2 + 1] * d, x1 = pos[b * 2] * d, y1 = pos[b * 2 + 1] * d, x2 = pos[c * 2] * d, y2 = pos[c * 2 + 1] * d;
      const u0 = uv[a * 2] * tw, v0 = uv[a * 2 + 1] * th, u1 = uv[b * 2] * tw, v1 = uv[b * 2 + 1] * th, u2 = uv[c * 2] * tw, v2 = uv[c * 2 + 1] * th;
      const den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
      if (Math.abs(den) < 1e-6) continue;
      // grow each triangle by ~0.7 device px so neighbours overlap (no hairline seams)
      const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
      const grow = (x, y) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + dx / l * 0.7, y + dy / l * 0.7]; };
      const [ex0, ey0] = grow(x0, y0), [ex1, ey1] = grow(x1, y1), [ex2, ey2] = grow(x2, y2);
      const A = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / den;
      const B = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / den;
      const C = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / den;
      const D = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / den;
      const E = x0 - A * u0 - C * v0, F = y0 - B * u0 - D * v0;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(ex0, ey0); ctx.lineTo(ex1, ey1); ctx.lineTo(ex2, ey2); ctx.closePath();
      ctx.clip();
      ctx.setTransform(A, B, C, D, E, F);
      ctx.drawImage(tex, 0, 0);
      ctx.restore();
      x0 = y0 = x1 = y1 = x2 = y2 = 0;
    }
  }

  dispose() {
    this.disposed = true;
    const gl = this.gl;
    if (gl) {
      gl.deleteBuffer(this.bPos); gl.deleteBuffer(this.bUv); gl.deleteBuffer(this.bShade); gl.deleteBuffer(this.bIdx);
      gl.deleteTexture(this.tex); gl.deleteProgram(this.prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
  }
}
