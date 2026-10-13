// On-screen type for stage v2: quiet, premium, legible on a phone.
//
// Fredoka (the app's display face), white, no outlines: a soft ink shadow
// gives contrast over any sky. Each line is pre-rendered once and faded as a
// single image (clean group opacity). Motion is a gentle rise + fade only —
// brand rule: no bouncing or shaking text.
//
//   const t = new TextBlock({ lines: ['ME TRYING TO SLEEP', 'AT 2 AM...'], y: 300, size: 74, enterAt: 0, exitAt: 2.8 });
//   t.draw(ctx, time);
//   const card = new LogoCard({ y: 560, enterAt: 12.6, exitAt: 14.35 }); await card.load(); card.draw(ctx, time);

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const FONT = '"Fredoka", ui-rounded, system-ui, sans-serif';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

/** A line of text as a sprite: soft ink shadow + white fill with a faint moonlit gradient. */
export function lineSprite(text, o) {
  const font = `${o.weight} ${o.size}px ${FONT}`;
  const m = canvas(4, 4).getContext('2d');
  m.font = font;
  if (o.tracking) m.letterSpacing = `${o.tracking}px`;
  const w = m.measureText(text).width;
  const pad = Math.ceil(o.size * 0.9);
  const c = canvas(w + pad * 2, o.size * 1.4 + pad * 2);
  const g = c.getContext('2d');
  g.font = font;
  if (o.tracking) g.letterSpacing = `${o.tracking}px`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const baseY = pad + o.size * 1.0;
  g.translate(c.width / 2, baseY);
  // contrast: two soft shadows (wide ambient + tight contact), no outline
  g.fillStyle = o.shadowCol || 'rgba(8,5,34,0.62)';
  g.shadowColor = o.shadowCol || 'rgba(8,5,34,0.62)';
  g.shadowBlur = o.size * 0.55;
  g.fillText(text, 0, o.size * 0.04);
  g.shadowBlur = o.size * 0.14;
  g.fillText(text, 0, o.size * 0.03);
  g.shadowBlur = 0; g.shadowColor = 'transparent';
  const gr = g.createLinearGradient(0, -o.size * 0.78, 0, o.size * 0.08);
  gr.addColorStop(0, o.top || '#ffffff');
  gr.addColorStop(1, o.color || '#ece6ff');
  g.fillStyle = gr;
  g.fillText(text, 0, 0);
  return { canvas: c, ax: c.width / 2, ay: baseY, w };
}

export class TextBlock {
  constructor(o) {
    this.o = { x: 540, y: 300, size: 72, weight: 600, lineHeight: 1.16, tracking: 0, enterAt: 0, stagger: 0.12,
      rise: 22, inDur: 0.6, exitAt: 1e9, exitDur: 0.45, color: '#ece6ff', ...o };
    this.sprites = this.o.lines.map((l) => lineSprite(l, this.o));
  }
  visibility(t) {
    const o = this.o;
    return Math.min(smoothstep(o.enterAt, o.enterAt + o.inDur, t), 1 - smoothstep(o.exitAt, o.exitAt + o.exitDur, t));
  }
  draw(ctx, t, alphaMul = 1) {
    const o = this.o;
    const exitK = smoothstep(o.exitAt, o.exitAt + o.exitDur, t);
    if (exitK >= 1) return;
    this.sprites.forEach((sp, i) => {
      const tl = t - (o.enterAt + i * o.stagger);
      const k = o.enterAt <= -1 ? 1 : outCubic(clamp(tl / o.inDur));
      const a = k * (1 - exitK) * alphaMul;
      if (a <= 0.003) return;
      const y = o.y + i * o.size * o.lineHeight + (1 - k) * o.rise - exitK * o.rise * 0.5;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.drawImage(sp.canvas, o.x - sp.ax, y - sp.ay);
      ctx.restore();
    });
  }
}

const LOGO_URL = new URL('../../hushmallow/assets/source/brand/hushmallow-logo.webp', import.meta.url).href;

/**
 * The approved wordmark (black lettering on white, mascot as the "o") placed
 * untouched on a soft off-white plate — the brand supplies no reversed
 * version, so it is never recoloured — with hushmallow.com beneath it.
 */
export class LogoCard {
  constructor(o = {}) {
    this.o = { x: 540, y: 560, logoW: 400, url: 'hushmallow.com', urlSize: 46, gap: 70, enterAt: 13, exitAt: 1e9, exitDur: 0.4, ...o };
  }
  async load() {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = LOGO_URL; });
    const c = canvas(img.width, img.height);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
      const i = (y * c.width + x) * 4;
      if (d[i] + d[i + 1] + d[i + 2] < 700) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    const pad = 6;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(c.width - 1, x1 + pad); y1 = Math.min(c.height - 1, y1 + pad);
    this.logo = canvas(x1 - x0 + 1, y1 - y0 + 1);
    this.logo.getContext('2d').drawImage(img, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, x1 - x0 + 1, y1 - y0 + 1);
    this.aspect = this.logo.height / this.logo.width;
    // plate
    const o = this.o, lw = o.logoW, lh = lw * this.aspect;
    const pw = lw + 76, ph = lh + 40, sh = 50;
    const pc = canvas(pw + sh * 2, ph + sh * 2);
    const q = pc.getContext('2d');
    q.translate(sh, sh);
    const rr = () => { q.beginPath(); q.roundRect(0, 0, pw, ph, ph / 2); };
    q.save(); q.shadowColor = 'rgba(8,5,34,0.45)'; q.shadowBlur = 34; q.shadowOffsetY = 10; rr(); q.fillStyle = '#fbf8f4'; q.fill(); q.restore();
    rr();
    const bg = q.createLinearGradient(0, 0, 0, ph);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#f6f1ec');
    q.fillStyle = bg; q.fill();
    q.save(); rr(); q.clip(); q.globalCompositeOperation = 'multiply';
    q.drawImage(this.logo, (pw - lw) / 2, (ph - lh) / 2, lw, lh);
    q.restore();
    this.plate = pc; this.pw = pw; this.ph = ph;
    this.url = lineSprite(o.url, { size: o.urlSize, weight: 500, tracking: 1, color: '#efe9ff' });
  }
  draw(ctx, t) {
    const o = this.o;
    const tt = t - o.enterAt;
    if (tt < 0 || !this.plate) return;
    const exitK = smoothstep(o.exitAt, o.exitAt + o.exitDur, t);
    if (exitK >= 1) return;
    const k = outCubic(clamp(tt / 0.7));
    const a = smoothstep(0, 0.5, tt) * (1 - exitK);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(o.x, o.y + (1 - k) * 18);
    const s = lerp(0.97, 1, k);          // uniform scale only: the mark is never distorted
    ctx.scale(s, s);
    ctx.drawImage(this.plate, -this.plate.width / 2, -this.plate.height / 2);
    ctx.restore();
    const ua = smoothstep(0.25, 0.7, tt) * (1 - exitK);
    if (ua > 0.003) {
      const y = o.y + this.ph / 2 + o.gap + (1 - outCubic(clamp((tt - 0.25) / 0.6))) * 12;
      ctx.save();
      ctx.globalAlpha = ua;
      ctx.drawImage(this.url.canvas, o.x - this.url.ax, y - this.url.ay + o.urlSize * 0.36);
      ctx.restore();
    }
  }
}
