// Soft glowing particles (instanced quads). Logic and GL calls are the approved
// v2 renderer's _drawParticles.

import { setUniforms } from '../../gl.js';

export function drawParticles(r, S, parts) {
  if (!parts.length) return;
  const gl = r.gl, p = r.p.part;
  const n = Math.min(512, parts.length);
  const d = r.instData;
  for (let i = 0; i < n; i++) {
    const q = parts[i];
    d.set([q.x, q.y, q.r, q.a, q.c[0], q.c[1], q.c[2]], i * 7);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, r.instBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.subarray(0, n * 7));
  gl.useProgram(p.p);
  r.cam(p, S.cam);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(r.quadVao);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  gl.bindVertexArray(null);
  gl.disable(gl.BLEND);
}
