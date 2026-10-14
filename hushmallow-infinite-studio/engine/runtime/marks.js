// DRAFT / INTERNAL corner mark, burned into renders that are not for publishing.
//
// Drawn by the renderer straight onto the output after post-processing, so
// grade, vignette and grain never touch it and it stays legible at any render
// scale. It sits in the top-left corner: the right rail belongs to the
// platform's buttons and the logo card is never covered. A render without a
// mark is pixel-for-pixel what it would be without this module.
//
//   new Marks('DRAFT')            → renderer option { marks }
//   new Marks('DRAFT · INTERNAL')

import { program, setUniforms, texture } from '../gl.js';

const VS = `
uniform vec4 uRect;          // x0, y0, x1, y1 in clip space
out vec2 vUv;
void main() {
  // two triangles from gl_VertexID: no vertex buffer needed
  vec2 c = vec2(float(gl_VertexID == 1 || gl_VertexID == 2 || gl_VertexID == 4), float(gl_VertexID >= 2 && gl_VertexID != 3));
  vUv = vec2(c.x, 1. - c.y);
  gl_Position = vec4(mix(uRect.xy, uRect.zw, c), 0., 1.);
}`;
const FS = `in vec2 vUv; uniform sampler2D uTex; out vec4 frag; void main() { frag = texture(uTex, vUv); }`;

export class Marks {
  /** label: the text; size: cap height in design px; margin: from the corner in design px. */
  constructor(label, { size = 30, margin = 28 } = {}) {
    if (!label || typeof label !== 'string') throw new Error('Marks needs a label');
    this.label = label;
    this.size = size;
    this.margin = margin;
    this.ready = null;
  }

  /** The mark as a premultiplied 2D canvas at output resolution (k = output px per design px). */
  canvas(k) {
    const size = this.size * k, padX = size * 0.7, padY = size * 0.42;
    const font = `600 ${size}px "Fredoka", ui-rounded, system-ui, sans-serif`;
    const m = document.createElement('canvas').getContext('2d');
    m.font = font;
    const w = Math.ceil(m.measureText(this.label).width + padX * 2), h = Math.ceil(size * 1.25 + padY * 2);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(12, 8, 30, 0.72)';
    g.beginPath(); g.roundRect(0, 0, w, h, h / 2); g.fill();
    g.strokeStyle = 'rgba(255, 196, 92, 0.95)';
    g.lineWidth = Math.max(1, size * 0.08);
    g.beginPath(); g.roundRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, h / 2); g.stroke();
    g.font = font;
    g.fillStyle = '#ffd88a';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(this.label, w / 2, h / 2 + size * 0.04);
    return c;
  }

  init(gl, outW, outH, k) {
    const c = this.canvas(k);
    const x0 = this.margin * k, y0 = this.margin * k;
    const toClip = (x, y) => [x / outW * 2 - 1, 1 - y / outH * 2];
    const [cx0, cy0] = toClip(x0, y0), [cx1, cy1] = toClip(x0 + c.width, y0 + c.height);
    this.ready = {
      prog: program(gl, VS, FS, 'marks'),
      tex: texture(gl, c, { mip: false }),
      rect: [cx0, cy1, cx1, cy0],
      vao: gl.createVertexArray(),
      size: [c.width, c.height],
    };
  }

  /** Draw onto the currently bound framebuffer (the output), premultiplied over. */
  draw(gl, outW, outH, k = 1) {
    if (!this.ready) this.init(gl, outW, outH, k);
    const r = this.ready;
    gl.useProgram(r.prog.p);
    setUniforms(gl, r.prog, { uRect: r.rect, uTex: { tex: r.tex, unit: 0 } });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(r.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }
}
