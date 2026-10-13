// End card: the approved Hushmallow wordmark + hushmallow.com.
//
// The approved logo (assets/source/brand/hushmallow-logo.webp) is black
// lettering on white with the mascot as the "o". Two treatments:
//   'pill'     (default) the logo exactly as approved, multiplied onto a soft
//              cream "pillow" so no pixel of the mark is altered
//   'knockout' lettering reversed to the app's text colour for dark scenes,
//              mascot "o" kept in full colour (only if the brand allows it)
//
//   const card = new EndCard({ appearAt: 13.4, y: 600 }); await card.load(); card.draw(ctx, t);

import { clamp, lerp, smoothstep, springStep, ease, makeCanvas, TAU } from './anim.js';
import { BRAND } from './captions.js';

const LOGO_URL = new URL('../../../hushmallow/assets/source/brand/hushmallow-logo.webp', import.meta.url).href;

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

export class EndCard {
  constructor(o = {}) {
    this.o = { appearAt: 13.4, x: 540, y: 600, logoW: 470, mode: 'pill', url: 'hushmallow.com', urlSize: 54, gap: 92, ...o };
  }

  async load() {
    const img = await loadImg(LOGO_URL);
    // crop to the mark's own bounds (the file has wide white margins)
    const c = makeCanvas(img.width, img.height);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y += 2) {
      for (let x = 0; x < c.width; x += 2) {
        const i = (y * c.width + x) * 4;
        if (d[i] + d[i + 1] + d[i + 2] < 700) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
    }
    const pad = 6;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(c.width - 1, x1 + pad); y1 = Math.min(c.height - 1, y1 + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    this.logo = makeCanvas(w, h);
    this.logo.getContext('2d').drawImage(img, x0, y0, w, h, 0, 0, w, h);
    this.aspect = h / w;
    if (this.o.mode === 'knockout') this.knock = this._knockout(this.logo);
    this._pill();
  }

  _knockout(src) {
    const c = makeCanvas(src.width, src.height);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height);
    const p = im.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], gg = p[i + 1], b = p[i + 2];
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      const sat = mx ? (mx - mn) / mx : 0;
      if (sat > 0.16 && mx > 60) { p[i + 3] = 255; continue; }   // mascot: keep colour
      const L = (r + gg + b) / 765;
      p[i] = 247; p[i + 1] = 243; p[i + 2] = 255; p[i + 3] = Math.round((1 - L) * 255);
    }
    g.putImageData(im, 0, 0);
    return c;
  }

  _pill() {
    const o = this.o;
    const lw = o.logoW, lh = lw * this.aspect;
    const pw = lw + 84, ph = lh + 46;
    const pad = 60;
    const c = makeCanvas(pw + pad * 2, ph + pad * 2);
    const g = c.getContext('2d');
    g.translate(pad, pad);
    const r = ph / 2;
    const rr = () => { g.beginPath(); g.roundRect(0, 0, pw, ph, r); };
    // soft glow around the pillow
    g.save();
    g.shadowColor = 'rgba(255,214,160,0.75)';
    g.shadowBlur = 40;
    rr(); g.fillStyle = '#fffaf2'; g.fill();
    g.restore();
    // pillowy cream body
    rr();
    const bg = g.createLinearGradient(0, 0, 0, ph);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, '#fff3e4');
    g.fillStyle = bg;
    g.fill();
    // logo, untouched: multiply keeps black black and the mascot's colours exact on white
    g.save();
    rr(); g.clip();
    g.globalCompositeOperation = 'multiply';
    g.drawImage(this.logo, (pw - lw) / 2, (ph - lh) / 2, lw, lh);
    g.restore();
    // a hairline lavender edge so it reads as a soft object, not a sticker
    rr();
    g.strokeStyle = 'rgba(185,166,255,0.55)';
    g.lineWidth = 2;
    g.stroke();
    this.pill = c;
    this.pw = pw; this.ph = ph;
  }

  draw(ctx, t) {
    const o = this.o;
    const tt = t - o.appearAt;
    if (tt < 0 || !this.logo) return;
    const sp = springStep(tt, 1.6, 0.55);
    const a = smoothstep(0, 0.45, tt);
    ctx.save();
    ctx.translate(o.x, o.y);
    // gentle "landing" — a soft squash as the pillow settles
    const wob = Math.exp(-tt * 5) * Math.sin(tt * 14) * 0.04;
    ctx.scale(lerp(0.9, 1, sp) * (1 + wob), lerp(0.9, 1, sp) * (1 - wob));
    ctx.globalAlpha = a;
    if (o.mode === 'knockout') {
      const lw = o.logoW, lh = lw * this.aspect;
      ctx.shadowColor = 'rgba(20,12,50,0.8)';
      ctx.shadowBlur = 18;
      ctx.drawImage(this.knock, -lw / 2, -lh / 2, lw, lh);
      ctx.shadowBlur = 0;
    } else {
      ctx.drawImage(this.pill, -this.pill.width / 2, -this.pill.height / 2);
      // one slow light sweep across the pillow
      const u = clamp((tt - 0.35) / 1.1);
      if (u > 0 && u < 1) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-this.pw / 2, -this.ph / 2, this.pw, this.ph, this.ph / 2);
        ctx.clip();
        ctx.globalCompositeOperation = 'screen';
        const sx = lerp(-this.pw * 0.7, this.pw * 0.7, ease.inOutSine(u));
        const g = ctx.createLinearGradient(sx - 90, 0, sx + 90, 0);
        g.addColorStop(0, 'rgba(255,240,210,0)');
        g.addColorStop(0.5, `rgba(255,236,200,${0.55 * Math.sin(Math.PI * u)})`);
        g.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-this.pw / 2, -this.ph / 2, this.pw, this.ph);
        ctx.restore();
      }
    }
    ctx.restore();

    // hushmallow.com
    const ua = smoothstep(0.22, 0.7, tt);
    if (ua > 0.002) {
      ctx.save();
      ctx.globalAlpha = ua;
      ctx.font = `600 ${o.urlSize}px ${BRAND.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const y = o.y + this.ph / 2 + o.gap - (1 - ease.outCubic(clamp((tt - 0.22) / 0.6))) * 14;
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,190,120,0.55)';
      ctx.shadowBlur = 26;
      ctx.strokeStyle = BRAND.ink;
      ctx.lineWidth = o.urlSize * 0.16;
      ctx.strokeText(o.url, 0 + o.x, y);
      ctx.shadowBlur = 0;
      const g = ctx.createLinearGradient(0, y - o.urlSize * 0.5, 0, y + o.urlSize * 0.5);
      g.addColorStop(0, '#fff6dc');
      g.addColorStop(1, BRAND.gold);
      ctx.fillStyle = g;
      ctx.fillText(o.url, o.x, y);
      ctx.restore();
    }
  }
}
