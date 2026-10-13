// On-screen text in the Hushmallow voice: Fredoka (the app's display face),
// night-ink outline for phone readability over any background, optional
// moonmilk-gold highlight words, and a soft per-word "squishy" entrance.
//
//   const cap = new Caption({
//     lines: ['ME TRYING TO SLEEP', '*AT 2 AM...*'],   // *word* = highlight colour
//     x: 540, y: 380, size: 92, weight: 700,
//     enterAt: 0.35, stagger: 0.07, exitAt: 6.9, exitDur: 0.5,
//   });
//   cap.draw(ctx, t);

import { clamp, lerp, springStep, smoothstep, ease } from './anim.js';

export const BRAND = {
  text: '#f7f3ff', ink: '#120c32', gold: '#ffd98a', calm: '#8fe3ff', care: '#ff9ccf',
  font: '"Fredoka", ui-rounded, system-ui, sans-serif',
};

export class Caption {
  constructor(o) {
    this.o = {
      x: 540, y: 400, size: 80, weight: 700, lineHeight: 1.08, letterSpacing: 0,
      color: BRAND.text, highlight: BRAND.gold, outline: BRAND.ink, outlineW: 0.16, glow: 'rgba(170,140,255,0.55)',
      enterAt: 0, stagger: 0.06, wordDur: 0.55, style: 'pop', exitAt: Infinity, exitDur: 0.5,
      shadow: true, ...o,
    };
    if (!Number.isFinite(this.o.exitAt)) this.o.exitAt = 1e9;   // smoothstep(∞,∞) would be NaN
    this.words = null;
  }

  _layout(ctx) {
    const o = this.o;
    ctx.font = `${o.weight} ${o.size}px ${BRAND.font}`;
    const words = [];
    let idx = 0;
    o.lines.forEach((line, li) => {
      const toks = line.split(' ').filter(Boolean).map((w) => {
        const hi = /^\*.*\*$/.test(w) || /^\*/.test(w) || /\*$/.test(w);
        return { raw: w, text: w.replace(/\*/g, ''), hi };
      });
      // a highlight span "*AT 2 AM...*" marks every word between the stars
      let inSpan = false;
      for (const tk of toks) {
        const starts = tk.raw.startsWith('*'), ends = tk.raw.endsWith('*');
        if (starts) inSpan = true;
        tk.hi = inSpan;
        if (ends) inSpan = false;
      }
      const space = ctx.measureText(' ').width;
      const widths = toks.map((tk) => ctx.measureText(tk.text).width + o.letterSpacing * tk.text.length);
      const total = widths.reduce((s, w) => s + w, 0) + space * (toks.length - 1);
      let x = o.x - total / 2;
      const y = o.y + li * o.size * o.lineHeight;
      toks.forEach((tk, i) => {
        words.push({ ...tk, x: x + widths[i] / 2, y, w: widths[i], i: idx++, line: li });
        x += widths[i] + space;
      });
    });
    this.words = words;
  }

  /** 0..1 visibility of the whole caption at time t (for layout decisions elsewhere). */
  visibility(t) {
    const o = this.o;
    const inV = smoothstep(o.enterAt, o.enterAt + 0.25, t);
    const outV = 1 - smoothstep(o.exitAt, o.exitAt + o.exitDur, t);
    return Math.min(inV, outV);
  }

  draw(ctx, t) {
    const o = this.o;
    if (t < o.enterAt - 0.01 || t > o.exitAt + o.exitDur + 0.01) return;
    if (!this.words) this._layout(ctx);
    ctx.save();
    ctx.font = `${o.weight} ${o.size}px ${BRAND.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    const exitK = smoothstep(o.exitAt, o.exitAt + o.exitDur, t);
    for (const w of this.words) {
      const tw = t - (o.enterAt + w.i * o.stagger);
      if (tw < 0) continue;
      let a, s, dy, rot = 0;
      if (o.style === 'fade') {
        const k = ease.outCubic(clamp(tw / o.wordDur));
        a = k; s = lerp(0.96, 1, k); dy = lerp(o.size * 0.18, 0, k);
      } else {
        // soft reveal (brand rule: no bouncing/shaking text): a gentle rise
        // with the faintest marshmallow settle, no rotation
        const sp = springStep(tw, 2.0, 0.72);
        a = clamp(tw / 0.18);
        s = lerp(0.86, 1, sp);
        dy = lerp(o.size * 0.28, 0, clamp(sp));
      }
      a *= 1 - exitK;
      const exitDy = -exitK * o.size * 0.25;
      if (a <= 0.003) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w.x, w.y + dy + exitDy - o.size * 0.33);
      ctx.rotate(rot);
      // squash/stretch the word around its centre (Mallow-like softness)
      ctx.scale(s * (1 + (1 - s) * 0.2), s);
      ctx.translate(0, o.size * 0.33);
      // soft glow halo
      if (o.shadow) {
        ctx.shadowColor = o.glow;
        ctx.shadowBlur = o.size * 0.45;
        ctx.fillStyle = o.outline;
        ctx.fillText(w.text, 0, 0);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }
      // night-ink outline for contrast on any background
      ctx.strokeStyle = o.outline;
      ctx.lineWidth = o.size * o.outlineW;
      ctx.strokeText(w.text, 0, 0);
      // fill: subtle vertical gradient for a soft, pillowy face
      const col = w.hi ? o.highlight : o.color;
      const g = ctx.createLinearGradient(0, -o.size * 0.75, 0, o.size * 0.1);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.55, col);
      g.addColorStop(1, w.hi ? '#ffbf6e' : '#e3dcff');
      ctx.fillStyle = g;
      ctx.fillText(w.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
}
