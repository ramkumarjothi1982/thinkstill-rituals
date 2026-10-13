// Cinematic finishing pass applied to the composed frame:
//   bloom      — soft highlight glow (downsampled, blurred, screened back)
//   grade      — scene tint via soft-light (cool 2 AM violet ↔ warm moonlight)
//   vignette   — gentle edge falloff that keeps the eye on the Mallow
//   grain      — fine animated film grain; also dithers 8-bit banding out of
//                the dark purple sky gradients before H.264 encoding

import { clamp, lerp, rgba, makeCanvas, rng } from './anim.js';

export class Grade {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.small = makeCanvas(W / 4, H / 4);
    this.sctx = this.small.getContext('2d', { willReadFrequently: false });
    this.small2 = makeCanvas(W / 4, H / 4);
    this.s2ctx = this.small2.getContext('2d');
    // grain tiles (luma noise, mid-grey centred) — 4 tiles cycled per frame
    this.grain = [];
    const R = rng(4242);
    const gw = 540, gh = 960;
    for (let k = 0; k < 4; k++) {
      const c = makeCanvas(gw, gh);
      const g = c.getContext('2d');
      const img = g.createImageData(gw, gh);
      for (let i = 0; i < gw * gh; i++) {
        // triangular distribution, slightly chunky like 35mm
        const n = (R() + R() - 1) * 0.5 + 0.5;
        const v = Math.round(n * 255);
        img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      this.grain.push(c);
    }
  }

  /**
   * src: composed frame canvas (W×H). Draws the graded result into dst ctx.
   * p: { bloom, bloomThreshold, tint:{color, amount}, warm:{color, amount}, vignette, grain, frame, lift }
   */
  apply(dst, src, p) {
    const { W, H } = this;
    dst.save();
    if (!p.grainOnly) {
      if (p.base) dst.filter = p.base;           // e.g. 'contrast(1.1) saturate(1.06)'
      dst.drawImage(src, 0, 0);
      dst.filter = 'none';
    }

    // --- bloom: bright-pass approximated by contrast-boosted downsample
    if (p.bloom > 0) {
      const s = this.sctx, s2 = this.s2ctx;
      const w = this.small.width, h = this.small.height;
      s.save();
      s.clearRect(0, 0, w, h);
      // bright-pass: pull mids down, keep highlights (a soft threshold)
      s.filter = `brightness(${p.bloomGain ?? 0.72}) contrast(${p.bloomContrast ?? 3.4}) saturate(1.2)`;
      s.drawImage(src, 0, 0, w, h);
      s.restore();
      s2.save();
      s2.clearRect(0, 0, w, h);
      s2.filter = `blur(${p.bloomRadius ?? 14}px)`;
      s2.drawImage(this.small, 0, 0);
      s2.restore();
      dst.globalCompositeOperation = 'screen';
      dst.globalAlpha = clamp(p.bloom, 0, 1);
      dst.imageSmoothingQuality = 'high';
      dst.drawImage(this.small2, 0, 0, W, H);
      dst.globalAlpha = 1;
    }

    // --- grade: soft-light colour washes (top → bottom gradient)
    for (const g of [p.tint, p.warm]) {
      if (!g || g.amount <= 0.003) continue;
      dst.globalCompositeOperation = 'soft-light';
      const lg = dst.createLinearGradient(0, 0, 0, H);
      lg.addColorStop(0, rgba(g.top || g.color, g.amount));
      lg.addColorStop(1, rgba(g.bottom || g.color, g.amount * (g.bottomK ?? 0.7)));
      dst.fillStyle = lg;
      dst.fillRect(0, 0, W, H);
    }

    // --- warm moonlight glow from the moon side (additive, very soft)
    if (p.glow && p.glow.amount > 0.003) {
      dst.globalCompositeOperation = 'screen';
      const { x, y, r, color, amount } = p.glow;
      const rg = dst.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rgba(color, amount));
      rg.addColorStop(0.5, rgba(color, amount * 0.35));
      rg.addColorStop(1, rgba(color, 0));
      dst.fillStyle = rg;
      dst.fillRect(0, 0, W, H);
    }

    // --- vignette
    if (p.vignette > 0) {
      dst.globalCompositeOperation = 'multiply';
      const cx = W / 2, cy = H * (p.vignetteCy ?? 0.55);
      const vg = dst.createRadialGradient(cx, cy, H * 0.28, cx, cy, H * 0.78);
      vg.addColorStop(0, 'rgba(255,255,255,1)');
      vg.addColorStop(0.6, `rgba(${lerp(255, 120, p.vignette) | 0},${lerp(255, 100, p.vignette) | 0},${lerp(255, 170, p.vignette) | 0},1)`);
      vg.addColorStop(1, `rgba(${lerp(255, 40, p.vignette) | 0},${lerp(255, 30, p.vignette) | 0},${lerp(255, 70, p.vignette) | 0},1)`);
      dst.fillStyle = vg;
      dst.fillRect(0, 0, W, H);
    }

    // --- grain (overlay around mid-grey ≈ neutral)
    if (p.grain > 0) {
      dst.globalCompositeOperation = 'overlay';
      dst.globalAlpha = p.grain;
      const tile = this.grain[(p.frame || 0) % this.grain.length];
      const ox = ((p.frame || 0) * 137) % 2, oy = ((p.frame || 0) * 71) % 2;
      dst.imageSmoothingEnabled = false;
      dst.drawImage(tile, -ox, -oy, W + 2, H + 2);
      dst.imageSmoothingEnabled = true;
      dst.globalAlpha = 1;
    }

    // --- fade to/from black (or ink)
    if (p.fade && p.fade.amount > 0.002) {
      dst.globalCompositeOperation = 'source-over';
      dst.fillStyle = rgba(p.fade.color || '#05040f', p.fade.amount);
      dst.fillRect(0, 0, W, H);
    }
    dst.restore();
  }
}
