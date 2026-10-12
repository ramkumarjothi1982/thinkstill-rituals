// Draws a soft body's lattice textured with a Mallow's living skin (the rig's
// face-animated artwork canvas). WebGL when available: one small vertex
// buffer per frame, the skin re-uploaded only when its face changed. The
// fragment shader adds the squish light: compressed areas deepen in colour,
// stretched areas thin and glow, and each finger leaves a soft dent shadow
// with a lit rim. Without WebGL the same mesh is drawn with Canvas 2D
// textured triangles.

const VS = `
attribute vec2 aPos; attribute vec2 aUV; attribute float aComp;
uniform vec2 uView; varying vec2 vUV; varying float vComp; varying vec2 vPos;
void main() {
  vUV = aUV; vComp = aComp; vPos = aPos;
  vec2 c = aPos / uView * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uDent[2]; uniform float uGlow; uniform vec3 uTint; uniform float uTintAmt;
varying vec2 vUV; varying float vComp; varying vec2 vPos;
void main() {
  vec4 c = texture2D(uTex, vUV);
  if (c.a < 0.003) discard;
  vec3 rgb = c.rgb / max(c.a, 0.001);
  // squish light
  float comp = clamp(vComp, -0.6, 0.8);
  rgb *= 1.0 - 0.16 * max(comp, 0.0);
  rgb = mix(rgb, rgb * rgb * 1.25, 0.18 * max(comp, 0.0));
  rgb += vec3(0.10, 0.11, 0.14) * max(-comp, 0.0);
  // finger dents: shadow in the middle, lit rim around
  for (int i = 0; i < 2; i++) {
    vec4 d = uDent[i];
    if (d.w > 0.001) {
      float r = length(vPos - d.xy) / d.z;
      float shadow = exp(-r * r * 2.2) * d.w;
      float rim = exp(-pow((r - 1.05) * 2.6, 2.0)) * d.w;
      rgb *= 1.0 - 0.22 * shadow;
      rgb += vec3(0.16, 0.15, 0.18) * rim * 0.55;
    }
  }
  rgb = mix(rgb, rgb * uTint * 1.4, uTintAmt);
  rgb += rgb * uGlow * 0.18;
  gl_FragColor = vec4(rgb * c.a, c.a);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

export function createMeshRenderer(canvas, body) {
  let gl = null;
  try {
    gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: false })
      || canvas.getContext('experimental-webgl');
  } catch { gl = null; }
  if (gl) {
    try { return glRenderer(gl, canvas, body); } catch (e) { console.warn('[mallow-touch] WebGL unavailable, using 2D', e); }
  }
  return canvasRenderer(canvas, body);
}

function glRenderer(gl, canvas, body) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  gl.useProgram(prog);
  const loc = {
    aPos: gl.getAttribLocation(prog, 'aPos'), aUV: gl.getAttribLocation(prog, 'aUV'), aComp: gl.getAttribLocation(prog, 'aComp'),
    uView: gl.getUniformLocation(prog, 'uView'), uTex: gl.getUniformLocation(prog, 'uTex'), uDent: gl.getUniformLocation(prog, 'uDent'),
    uGlow: gl.getUniformLocation(prog, 'uGlow'), uTint: gl.getUniformLocation(prog, 'uTint'), uTintAmt: gl.getUniformLocation(prog, 'uTintAmt'),
  };
  const n = body.n;
  const posBuf = gl.createBuffer(), uvBuf = gl.createBuffer(), compBuf = gl.createBuffer(), idxBuf = gl.createBuffer();
  const pos = new Float32Array(n * 2), uv = new Float32Array(n * 2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, body.tris, gl.STATIC_DRAW);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  let texW = 0, texH = 0, lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  const dents = new Float32Array(8);

  return {
    kind: 'webgl',
    get lost() { return lost; },
    /**
     * map(k) → [sx, sy]: screen position (CSS px) of node k.
     * uvOf(k) → [u, v] texture coordinates.
     */
    draw({ skin, skinChanged, map, uvOf, W, H, dpr, dentList = [], glow = 0, tint = null, tintAmt = 0 }) {
      if (lost) return;
      const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      gl.viewport(0, 0, cw, ch);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (skinChanged || skin.width !== texW || skin.height !== texH) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, skin);
        texW = skin.width; texH = skin.height;
      }
      for (let k = 0; k < n; k++) {
        const p = map(k); pos[k * 2] = p[0]; pos[k * 2 + 1] = p[1];
        const t = uvOf(k); uv[k * 2] = t[0]; uv[k * 2 + 1] = t[1];
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.aPos); gl.vertexAttribPointer(loc.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.aUV); gl.vertexAttribPointer(loc.aUV, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, compBuf); gl.bufferData(gl.ARRAY_BUFFER, body.comp, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.aComp); gl.vertexAttribPointer(loc.aComp, 1, gl.FLOAT, false, 0, 0);
      dents.fill(0);
      dentList.slice(0, 2).forEach((d, i) => dents.set([d.x, d.y, Math.max(1, d.r), d.depth], i * 4));
      gl.uniform2f(loc.uView, W, H);
      gl.uniform1i(loc.uTex, 0);
      gl.uniform4fv(loc.uDent, dents);
      gl.uniform1f(loc.uGlow, glow);
      gl.uniform3f(loc.uTint, ...(tint || [1, 1, 1]));
      gl.uniform1f(loc.uTintAmt, tintAmt);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.drawElements(gl.TRIANGLES, body.tris.length, gl.UNSIGNED_SHORT, 0);
    },
    destroy() { try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ } },
  };
}

// Canvas 2D fallback: textured triangles via affine transforms.
function canvasRenderer(canvas, body) {
  const ctx = canvas.getContext('2d');
  return {
    kind: '2d',
    lost: false,
    draw({ skin, map, uvOf, W, H, dpr, dentList = [] }) {
      const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      const sw = skin.width, sh = skin.height;
      const T = body.tris;
      for (let i = 0; i < T.length; i += 3) {
        const a = T[i], b = T[i + 1], c = T[i + 2];
        const [x0, y0] = map(a), [x1, y1] = map(b), [x2, y2] = map(c);
        const [u0, v0] = uvOf(a), [u1, v1] = uvOf(b), [u2, v2] = uvOf(c);
        const s0x = u0 * sw, s0y = v0 * sh, s1x = u1 * sw, s1y = v1 * sh, s2x = u2 * sw, s2y = v2 * sh;
        const den = (s1x - s0x) * (s2y - s0y) - (s2x - s0x) * (s1y - s0y);
        if (Math.abs(den) < 1e-6) continue;
        const m11 = ((x1 - x0) * (s2y - s0y) - (x2 - x0) * (s1y - s0y)) / den;
        const m12 = ((y1 - y0) * (s2y - s0y) - (y2 - y0) * (s1y - s0y)) / den;
        const m21 = ((x2 - x0) * (s1x - s0x) - (x1 - x0) * (s2x - s0x)) / den;
        const m22 = ((y2 - y0) * (s1x - s0x) - (y1 - y0) * (s2x - s0x)) / den;
        const dx = x0 - m11 * s0x - m21 * s0y, dy = y0 - m12 * s0x - m22 * s0y;
        // grow each triangle a hair so seams don't show
        const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, g = 0.6;
        const ex = (x, y) => [x + Math.sign(x - cx) * g, y + Math.sign(y - cy) * g];
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.moveTo(...ex(x0, y0)); ctx.lineTo(...ex(x1, y1)); ctx.lineTo(...ex(x2, y2)); ctx.closePath();
        ctx.clip();
        ctx.setTransform(m11 * dpr, m12 * dpr, m21 * dpr, m22 * dpr, dx * dpr, dy * dpr);
        ctx.drawImage(skin, 0, 0);
        ctx.restore();
      }
      // dent shading
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      for (const d of dentList.slice(0, 2)) {
        if (d.depth < 0.01) continue;
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 1.3);
        g.addColorStop(0, `rgba(10,6,30,${0.22 * d.depth})`);
        g.addColorStop(0.7, 'rgba(10,6,30,0)');
        g.addColorStop(0.85, `rgba(255,255,255,${0.12 * d.depth})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(d.x - d.r * 1.3, d.y - d.r * 1.3, d.r * 2.6, d.r * 2.6);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    destroy() {},
  };
}
