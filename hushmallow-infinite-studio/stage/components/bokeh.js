// Foreground bokeh: a few large, out-of-focus glowing orbs very close to the
// lens. They drift slowly, move against the camera more than anything else
// (strong parallax) and stay in the lower corners / edges, away from text
// and the Mallow's face. They warm from lavender to moonmilk gold.

import { clamp, lerp, mixHex, rgba, TAU, makeCanvas } from './anim.js';

const ORBS = [
  { x: 0.06, y: 0.9, r: 150, c0: '#8f7bff', c1: '#ffcf8f', a: 0.16, sp: 0.21, ph: 0.3 },
  { x: 0.95, y: 0.84, r: 120, c0: '#b9a6ff', c1: '#ffb48a', a: 0.14, sp: 0.17, ph: 2.1 },
  { x: 0.88, y: 0.97, r: 190, c0: '#6f5fe0', c1: '#ffd9a0', a: 0.12, sp: 0.13, ph: 4.0 },
  { x: 0.16, y: 1.02, r: 210, c0: '#7a62d8', c1: '#ffc4a0', a: 0.1, sp: 0.11, ph: 1.2 },
  { x: -0.02, y: 0.62, r: 95, c0: '#c9b8ff', c1: '#fff0c8', a: 0.1, sp: 0.25, ph: 5.1 },
  { x: 1.03, y: 0.56, r: 80, c0: '#9fc8ff', c1: '#ffe6b0', a: 0.09, sp: 0.23, ph: 3.3 },
];

export class Bokeh {
  constructor(W = 1080, H = 1920) {
    this.W = W; this.H = H;
    // one soft disc sprite with a faint brighter rim (lens-like)
    const s = 256;
    this.sprite = makeCanvas(s, s);
    const g = this.sprite.getContext('2d');
    const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, 'rgba(255,255,255,0.55)');
    rg.addColorStop(0.72, 'rgba(255,255,255,0.62)');
    rg.addColorStop(0.86, 'rgba(255,255,255,0.8)');
    rg.addColorStop(0.95, 'rgba(255,255,255,0.25)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
    this.tinted = makeCanvas(s, s);
    this.tctx = this.tinted.getContext('2d');
  }

  draw(ctx, t, cam, warm = 0) {
    const { W, H } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const o of ORBS) {
      const col = mixHex(o.c0, o.c1, warm);
      const tc = this.tctx;
      tc.globalCompositeOperation = 'source-over';
      tc.clearRect(0, 0, 256, 256);
      tc.drawImage(this.sprite, 0, 0);
      tc.globalCompositeOperation = 'source-in';
      tc.fillStyle = col;
      tc.fillRect(0, 0, 256, 256);
      // parallax: near-lens objects slide ~2.4× the camera offset
      const px = -(cam.x - 360) * 2.4 * 1.5 - (cam.ox || 0) * 1.4;
      const py = -(cam.y - 760) * 1.6 * 1.5 - (cam.oy || 0) * 1.4;
      const zoomK = 1 + (cam.zoom - 1) * 1.8;
      const x = W / 2 + (o.x * W - W / 2) * zoomK + Math.sin(t * o.sp + o.ph) * 26 + px;
      const y = H / 2 + (o.y * H - H / 2) * zoomK + Math.cos(t * o.sp * 0.8 + o.ph) * 18 + py;
      const r = o.r * zoomK * (1 + 0.05 * Math.sin(t * 0.7 + o.ph));
      ctx.globalAlpha = o.a * (0.8 + 0.2 * Math.sin(t * 0.9 + o.ph * 2));
      ctx.drawImage(this.tinted, x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
}
