// Minimal WebGL2 toolkit for the studio renderer: programs, textures,
// framebuffers (8-bit and half-float HDR), a fullscreen triangle and a
// dynamic mesh. No dependencies.

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 unavailable');
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');
  return gl;
}

export function program(gl, vsSrc, fsSrc, name = 'program') {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, '#version 300 es\nprecision highp float;\nprecision highp int;\n' + src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      const lines = src.split('\n').map((l, i) => `${i + 3}: ${l}`).join('\n');
      throw new Error(`${name} ${type === gl.VERTEX_SHADER ? 'VS' : 'FS'}: ${log}\n${lines}`);
    }
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${name} link: ${gl.getProgramInfoLog(p)}`);
  const uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  const attribs = {};
  const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < na; i++) {
    const info = gl.getActiveAttrib(p, i);
    attribs[info.name] = gl.getAttribLocation(p, info.name);
  }
  return { p, u: uniforms, a: attribs, name };
}

/** Set uniforms by name: numbers → float, arrays → vecN / matN, {tex, unit} → sampler. */
export function setUniforms(gl, prog, values) {
  for (const [k, v] of Object.entries(values)) {
    const loc = prog.u[k];
    if (loc == null) continue;
    if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (typeof v === 'boolean') gl.uniform1i(loc, v ? 1 : 0);
    else if (v && v.tex) { gl.activeTexture(gl.TEXTURE0 + v.unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(loc, v.unit); }
    else if (Array.isArray(v) || v instanceof Float32Array) {
      if (v.length === 2) gl.uniform2fv(loc, v);
      else if (v.length === 3) gl.uniform3fv(loc, v);
      else if (v.length === 4) gl.uniform4fv(loc, v);
      else if (v.length === 9) gl.uniformMatrix3fv(loc, false, v);
      else if (v.length === 16) gl.uniformMatrix4fv(loc, false, v);
      else gl.uniform1fv(loc, v);
    } else if (v && v.int != null) gl.uniform1i(loc, v.int);
  }
}

export function texture(gl, source, { mip = true, wrap = 'clamp', flipY = false, premultiply = true } = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  const w = wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (mip) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  return t;
}

export function updateTexture(gl, tex, source, { mip = true, premultiply = true } = {}) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
  if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
}

/** Render target. hdr → RGBA16F (linear, filterable); msaa → multisampled renderbuffer resolved on demand. */
export function target(gl, w, h, { hdr = false, msaa = 0, depth = false } = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, hdr ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  let msFb = null, msRb = null;
  if (msaa) {
    msFb = gl.createFramebuffer();
    msRb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, msRb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, msaa, hdr ? gl.RGBA16F : gl.RGBA8, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msRb);
  }
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`framebuffer incomplete ${status} (${w}x${h} hdr=${hdr} msaa=${msaa})`);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const t = {
    tex, fb, w, h, msFb,
    /** bind for drawing (the MSAA buffer when present) */
    bind() { gl.bindFramebuffer(gl.FRAMEBUFFER, msFb || fb); gl.viewport(0, 0, w, h); },
    /** resolve MSAA → texture */
    resolve() {
      if (!msFb) return;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);
      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.LINEAR);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    },
  };
  return t;
}

/** Fullscreen triangle VAO (attribute aPos in clip space, vUv 0..1). */
export function fullscreen(gl) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return { draw() { gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); } };
}

export const FS_VERT = `
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** A grid mesh with per-vertex dynamic attributes (interleaved float buffer). */
export function gridMesh(gl, cols, rows, attribSizes) {
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
  const idx = new Uint32Array(cols * rows * 6);
  let k = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = b;
      idx[k++] = b; idx[k++] = c; idx[k++] = d;
    }
  }
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return {
    cols, rows, stride, data, nVerts,
    upload() { gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data); },
    draw() { gl.bindVertexArray(vao); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null); },
  };
}
