// On-screen text in the Hushmallow voice: Fredoka (the app's display face),
// night-ink outline for phone readability over any background, optional
// moonmilk-gold highlight words, and a gentle per-word reveal.
//
// Each word is pre-rendered once (glow + outline + fill at full opacity) and
// faded as one image ("group opacity"), so fades go cleanly from white to
// transparent instead of through a muddy outline-showing-through stage.
//
//   const cap = new Caption({
//     lines: ['ME TRYING TO SLEEP', '*AT 2 AM...*'],   // *word* = highlight colour
//     x: 540, y: 380, size: 92, weight: 700,
//     enterAt: 0.35, stagger: 0.07, exitAt: 6.9, exitDur: 0.5,
//   });
//   cap.draw(ctx, t);

import { clamp, lerp, springStep, smoothstep, ease, makeCanvas } from './anim.js';

export const BRAND = {
  text: '#f7f3ff', ink: '#120c32', gold: '#ffd98a', calm: '#8fe3ff', care: '#ff9ccf',
  font: '"Fredoka", ui-rounded, system-ui, sans-serif',
};

/** One word/line rendered at full opacity: soft glow, ink outline, pillowy fill. */
export function textSprite(text, o) {
  const size = o.size;
  const font = `${o.weight} ${size}px ${BRAND.font}`;
  const m = makeCanvas(4, 4).getContext('2d');
  m.font = font;
  const w = m.measureText(text).width;
  const pad = Math.ceil(size * 0.8);
  const c = makeCanvas(w + pad * 2, size * 1.5 + pad * 2);
  const g = c.getContext('2d');
  const baseY = pad + size * 1.05;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  g.miterLimit = 2;
  g.translate(c.width / 2, baseY);
  if (o.shadow !== false) {
    g.shadowColor = o.glow;
    g.shadowBlur = size * 0.45;
    g.fillStyle = o.outline;
    g.fillText(text, 0, 0);
    g.shadowBlur = 0;
    g.shadowColor = 'transparent';
  }
  g.strokeStyle = o.outline;
  g.lineWidth = size * o.outlineW;
  g.strokeText(text, 0, 0);
  const col = o.hi ? o.highlight : o.color;
  const gr = g.createLinearGradient(0, -size * 0.75, 0, size * 0.1);
  gr.addColorStop(0, o.top || '#ffffff');
  gr.addColorStop(0.55, col);
  gr.addColorStop(1, o.hi ? '#ffbf6e' : (o.bottom || '#e3dcff'));
  g.fillStyle = gr;
  g.fillText(text, 0, 0);
  return { canvas: c, ax: c.width / 2, ay: baseY, w };
}

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
    ctx.save();
    ctx.font = `${o.weight} ${o.size}px ${BRAND.font}`;
    const words = [];
    let idx = 0;
    o.lines.forEach((line, li) => {
      const toks = line.split(' ').filter(Boolean).map((w) => ({ raw: w, text: w.replace(/\*/g, ''), hi: false }));
      // a highlight span "*AT 2 AM...*" marks every word between the stars
      let inSpan = false;
      for (const tk of toks) {
        if (tk.raw.startsWith('*')) inSpan = true;
        tk.hi = inSpan;
        if (tk.raw.endsWith('*')) inSpan = false;
      }
      const space = ctx.measureText(' ').width;
      const widths = toks.map((tk) => ctx.measureText(tk.text).width + o.letterSpacing * tk.text.length);
      const total = widths.reduce((s, w) => s + w, 0) + space * (toks.length - 1);
      let x = o.x - total / 2;
      const y = o.y + li * o.size * o.lineHeight;
      toks.forEach((tk, i) => {
        words.push({ ...tk, x: x + widths[i] / 2, y, w: widths[i], i: idx++, line: li, sprite: textSprite(tk.text, { ...o, hi: tk.hi }) });
        x += widths[i] + space;
      });
    });
    ctx.restore();
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
    const exitK = smoothstep(o.exitAt, o.exitAt + o.exitDur, t);
    ctx.save();
    for (const w of this.words) {
      const tw = t - (o.enterAt + w.i * o.stagger);
      if (tw < 0) continue;
      let a, s, dy;
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
      if (a <= 0.003) continue;
      const exitDy = -exitK * o.size * 0.25;
      const sp = w.sprite;
      ctx.globalAlpha = a;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // scale about the word's optical centre (≈ a third of the size above the baseline)
      ctx.translate(w.x, w.y + dy + exitDy - o.size * 0.33);
      ctx.scale(s, s);
      ctx.translate(0, o.size * 0.33);
      ctx.drawImage(sp.canvas, -sp.ax, -sp.ay);
    }
    ctx.restore();
  }
}
