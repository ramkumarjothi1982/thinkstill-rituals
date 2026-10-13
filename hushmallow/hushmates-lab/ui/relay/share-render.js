// The share story, drawn on a canvas (no network, nothing uploaded). One
// renderer serves the live preview, the 9:16 picture and the short video, so
// what the person sees is exactly what they keep.
//
// Honesty rules (enforced by what the scene passes in, and again here):
//   - counts are the journey's real human count; a Mallow never counts
//   - a person's words appear only if that writer allowed it (`shareable`)
//   - every perspective carries its own label from the service, so a Mallow's
//     is never shown as a person's and a canned example is never called
//     automatically generated
//   - nothing is invented to fill a gap: fewer people means fewer petals
//   - the only picture drawn in is the author's own Mallow, from this site

import { MALLOWS, art } from '../mallows-data.js';

export const W = 1080;
export const H = 1920;
const INK = '#1F1640';
const INK2 = '#4B4366';
const INK3 = '#6A6285';
const SERIF = 'Fraunces, Georgia, serif';
const SANS = 'Manrope, "Nunito Sans", system-ui, sans-serif';
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];

/** Only a fallback: every item from the service brings its own label. */
export const HUMAN_LABEL = 'A Hushmate’s perspective';
const MALLOW_FALLBACK = 'A Mallow perspective';

/**
 * The item's own honest label. A Mallow's always says it is a Mallow's (and
 * keeps whatever the service says about its source); a missing label never
 * becomes a claim the item can't back up.
 */
export function honestLabel(p) {
  const own = typeof p?.label === 'string' ? p.label.trim() : '';
  if (p?.kind === 'mallow') return /\bmallow\b/i.test(own) ? own : MALLOW_FALLBACK;
  return own || HUMAN_LABEL;
}

/** The lines of the story, from real numbers only. */
export function storyLines(d) {
  const n = d.humans;
  const count = n > 0 ? `${NUM[n] || n} ${n === 1 ? 'stranger' : 'strangers'} saw it differently.`
    : d.hasMallow ? 'My Mallow found another way to see it.'
      : 'It travelled through Hushfold, and came home.';
  return {
    open: 'I released one thought into the world…',
    count,
    back: 'Here’s what came back.',
    end: 'What would they see in yours?',
  };
}

export async function loadFonts() {
  try { await Promise.all(['500 64px Fraunces', 'italic 500 64px Fraunces', '800 32px Manrope', '500 32px Manrope'].map((f) => document.fonts.load(f))); } catch { /* system fonts */ }
}

// The author's Mallow, loaded once from this site (same origin, so the canvas
// can still be exported). If it can't load, the story is drawn without it.
const ARTS = new Map();
const LOADING = new Map();
export function loadArt(id) {
  const m = MALLOWS[id];
  if (!m || typeof Image === 'undefined') return Promise.resolve(null);
  if (ARTS.has(m.id)) return Promise.resolve(ARTS.get(m.id));
  if (!LOADING.has(m.id)) {
    LOADING.set(m.id, new Promise((resolve) => {
      const img = new Image();
      const done = (ok) => {
        clearTimeout(timer);
        img.onload = null; img.onerror = null;
        LOADING.delete(m.id);
        if (ok && img.naturalWidth > 0) { ARTS.set(m.id, img); resolve(img); } else resolve(null);
      };
      const timer = setTimeout(() => done(false), 8000);
      img.onload = () => (img.decode ? img.decode().then(() => done(true), () => done(true)) : done(true));
      img.onerror = () => done(false);
      img.decoding = 'async';
      img.src = art(m.id);
    }));
  }
  return LOADING.get(m.id);
}
/** Everything the story draws with: the type and the author's Mallow. */
export function prepare(mallowId) { return Promise.all([loadFonts(), loadArt(mallowId)]); }

// ------------------------------------------------------------ helpers --
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const win = (t, a, b) => ease((t - a) / (b - a));                    // 0 → 1 between a and b
const fade = (t, a, b, c, d) => Math.min(win(t, a, b), 1 - win(t, c, d));
const lerp = (a, b, k) => a + (b - a) * k;
const hexA = (hex, a) => { const v = hex.replace('#', ''); const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const fontPx = (font) => parseFloat(font.match(/(\d+(?:\.\d+)?)px/)?.[1]) || 40;

function wrap(x, text, maxW, maxLines = 8) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (x.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && x.measureText(`${last}…`).width > maxW) last = last.replace(/\s*\S+$/, '');
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}
/** The narrowest width that keeps the same number of lines, so they come out even (no orphan). */
function balanced(x, text, maxW, maxLines) {
  const n = wrap(x, text, maxW, 99).length;
  if (n < 2 || n > maxLines) return maxW;
  let lo = maxW / (n + 1);
  let hi = maxW;
  for (let i = 0; i < 16 && hi - lo > 1; i++) {
    const mid = (lo + hi) / 2;
    if (wrap(x, text, mid, 99).length <= n) hi = mid; else lo = mid;
  }
  return hi;
}
/** Lines of text from a first baseline at y; returns the baseline after the last line. */
function text(x, str, cx, y, { font, colour = INK, maxW = 880, lh, align = 'center', maxLines = 8, alpha = 1, balance = false }) {
  if (alpha <= 0) return y + measure(x, str, font, maxW, lh || Math.round(fontPx(font) * 1.25), maxLines);
  x.save();
  x.globalAlpha *= alpha;
  x.font = font;
  x.fillStyle = colour;
  x.textAlign = align;
  x.textBaseline = 'alphabetic';
  const step = lh || Math.round(fontPx(font) * 1.25);
  const lines = wrap(x, str, balance ? balanced(x, str, maxW, maxLines) : maxW, maxLines);
  lines.forEach((l, i) => x.fillText(l, cx, y + i * step));
  x.restore();
  return y + lines.length * step;
}
function measure(x, str, font, maxW, lh, maxLines = 8) { x.save(); x.font = font; const n = wrap(x, str, maxW, maxLines).length; x.restore(); return n * lh; }

function background(x, d, t) {
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FFF8F3'); g.addColorStop(0.5, '#F6EFFF'); g.addColorStop(1, '#FFF1EA');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const blob = (cx, cy, r, c) => { const gg = x.createRadialGradient(cx, cy, 0, cx, cy, r); gg.addColorStop(0, c); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.fillRect(0, 0, W, H); };
  const s = Math.sin(t * 0.35);
  blob(140 + s * 40, 220, 760, 'rgba(255,186,219,.55)');
  blob(960 - s * 50, 520, 820, 'rgba(191,230,255,.62)');
  blob(540, 1760 + s * 30, 940, 'rgba(205,184,255,.45)');
  blob(540, 900, 600, hexA(d.tint, 0.22));
  // soft clouds drifting
  x.save();
  x.fillStyle = 'rgba(255,255,255,.55)';
  for (const [cx0, cy, rx, ry, sp] of [[180, 1180, 260, 70, 14], [880, 1320, 300, 80, -10], [560, 1560, 380, 90, 8], [300, 420, 220, 56, -12]]) {
    const cx = cx0 + Math.sin(t * 0.2 + cy) * sp;
    x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(cx - rx * 0.35, cy - ry * 0.55, rx * 0.5, ry * 0.9, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(cx + rx * 0.3, cy - ry * 0.45, rx * 0.42, ry * 0.8, 0, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

function petal(x, cx, cy, R, angle, colours, grow) {
  if (grow <= 0) return;
  x.save();
  x.translate(cx, cy);
  x.rotate(angle);
  x.scale(0.4 + 0.6 * grow, 0.4 + 0.6 * grow);
  x.globalAlpha *= Math.min(1, grow * 1.4);
  const L = R * 1.05;
  const g = x.createLinearGradient(0, -R * 0.9, 0, -R - L);
  g.addColorStop(0, colours.body); g.addColorStop(0.65, colours.glow); g.addColorStop(1, '#FFFFFF');
  x.fillStyle = g;
  x.shadowColor = hexA(colours.glow, 0.7); x.shadowBlur = 30;
  x.beginPath();
  x.moveTo(0, -R * 0.9);
  x.bezierCurveTo(-R * 0.3, -R - L * 0.25, -R * 0.26, -R - L * 0.72, 0, -R - L);
  x.bezierCurveTo(R * 0.26, -R - L * 0.72, R * 0.3, -R - L * 0.25, 0, -R * 0.9);
  x.fill();
  x.restore();
}
function star(x, cx, cy, s, colour, alpha) {
  if (alpha <= 0) return;
  x.save(); x.globalAlpha *= alpha; x.translate(cx, cy);
  x.fillStyle = '#fff'; x.strokeStyle = colour; x.lineWidth = s * 0.12;
  x.beginPath();
  x.moveTo(0, -s); x.quadraticCurveTo(s * 0.14, -s * 0.14, s, 0); x.quadraticCurveTo(s * 0.14, s * 0.14, 0, s);
  x.quadraticCurveTo(-s * 0.14, s * 0.14, -s, 0); x.quadraticCurveTo(-s * 0.14, -s * 0.14, 0, -s);
  x.fill(); x.stroke(); x.restore();
}
/** The orb with one petal per person (grown by `bloom`, 0..n) and, if the Mallow helped, its star. */
function orb(x, d, cx, cy, R, { bloom = 99, starAlpha = 1, breathe = 0 } = {}) {
  const petals = d.petals || [];
  const n = petals.length;
  petals.forEach((p, i) => {
    const m = MALLOWS[p.mallow] || MALLOWS.loomi;
    petal(x, cx, cy, R, (i * 2 * Math.PI) / 5 + (n === 1 ? 0.35 : 0), m, Math.max(0, Math.min(1, bloom - i)));
  });
  const r = R * (1 + breathe * 0.02);
  x.save();
  const halo = x.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.9);
  halo.addColorStop(0, hexA(d.tint, 0.45)); halo.addColorStop(1, hexA(d.tint, 0));
  x.fillStyle = halo; x.beginPath(); x.arc(cx, cy, r * 1.9, 0, Math.PI * 2); x.fill();
  const sphere = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.08, cx, cy, r);
  sphere.addColorStop(0, '#FFFFFF'); sphere.addColorStop(0.32, hexA(d.tint, 0.95)); sphere.addColorStop(0.8, '#A88BFF'); sphere.addColorStop(1, '#7E62F0');
  x.fillStyle = sphere; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(cx - r * 0.34, cy - r * 0.5, r * 0.32, r * 0.17, -0.45, 0, Math.PI * 2); x.fill();
  x.restore();
  if (d.mallowPetal) {
    const m = MALLOWS[d.mallowPetal.mallow] || MALLOWS.noomi;
    x.save(); x.globalAlpha *= 0.4 * starAlpha; x.strokeStyle = m.deep; x.setLineDash([R * 0.05, R * 0.09]); x.lineWidth = R * 0.018;
    x.beginPath(); x.arc(cx, cy, R * 1.55, 0, Math.PI * 2); x.stroke(); x.restore();
    star(x, cx + R * 1.55 * Math.sin(0.62), cy - R * 1.55 * Math.cos(0.62), R * 0.16, m.deep, starAlpha);
  }
}

// The Mallow stands under the orb, its head just below the orb's lowest light.
// Sizes are in orb radii so the pair scales together.
const ORB_TOP = 2.08;     // the top petal's tip, above the orb's centre
const FIG_TOP = 1.62;     // the Mallow's head, below the orb's centre (clear of the star's ring)
const FIG_W = 2.8;        // the Mallow's width (the app's stage: the orb is about 0.7 of it)
const ratioOf = (d) => { const m = MALLOWS[d.mallow]; return m ? m.h / m.w : 0.95; };
/** How far the pair reaches below the orb's centre (the pillow's lowest edge), in orb radii; just the orb's light without the art. */
const pairBelow = (d) => (ARTS.get(MALLOWS[d.mallow]?.id) ? FIG_TOP + FIG_W * ratioOf(d) * 1.15 : ORB_TOP);

/** The landing page's three-cloud pillow (kit-pillow), in a box of w × h whose top is at y. */
function pillow(x, cx, y, w, h) {
  x.save();
  // a soft lilac shadow under it
  const sy = y + h * 0.86;
  x.save(); x.translate(cx, sy); x.scale(1, 0.22);
  const sh = x.createRadialGradient(0, 0, 0, 0, 0, w * 0.5);
  sh.addColorStop(0, 'rgba(120,90,200,.26)'); sh.addColorStop(1, 'rgba(120,90,200,0)');
  x.fillStyle = sh; x.beginPath(); x.arc(0, 0, w * 0.5, 0, Math.PI * 2); x.fill();
  x.restore();
  // [left, width, bottom, height] as fractions of the box, like the three spans
  for (const [l, pw, b, ph] of [[0, 1, 0, 0.62], [0.12, 0.44, 0.28, 0.7], [0.44, 0.46, 0.24, 0.66]]) {
    const rx = (pw * w) / 2;
    const ry = (ph * h) / 2;
    const ex = cx - w / 2 + l * w + rx;
    const ey = y + h - b * h - ry;
    x.save(); x.translate(ex, ey); x.scale(1, ry / rx);
    const g = x.createRadialGradient(0, -rx * 0.3, 0, 0, -rx * 0.3, rx * 1.2);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.7, '#F7EEFF'); g.addColorStop(1, '#EADCFF');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, Math.PI * 2); x.fill();
    x.restore();
  }
  x.restore();
}
/** The author's own Mallow on its pillow: `layer` 'back' (glow and pillow) or 'front' (the art). */
function figure(x, d, cx, top, w, layer, { alpha = 1, t = 0 } = {}) {
  const m = MALLOWS[d.mallow];
  const img = m && ARTS.get(m.id);
  if (!img || alpha <= 0) return;                   // no art: the story is told without it
  const fh = w * (m.h / m.w);
  x.save(); x.globalAlpha *= alpha;
  if (layer === 'back') {
    const hy = top + fh * 0.55;
    const g = x.createRadialGradient(cx, hy, 0, cx, hy, w * 0.95);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.45, hexA(m.glow, 0.28)); g.addColorStop(1, hexA(m.glow, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, hy, w * 0.95, 0, Math.PI * 2); x.fill();
    pillow(x, cx, top + fh * 0.73, w * 1.8, fh * 0.42);
  } else {
    const b = Math.sin((t * 2 * Math.PI) / (m.breath || 5));       // breathing, as in the app
    x.translate(cx, top + fh);
    x.scale(1 - b * 0.012, 1 + b * 0.02);
    x.drawImage(img, -w / 2, -fh, w, fh);
  }
  x.restore();
}
/** The orb and, under it, the author's Mallow on its cloud pillow. */
function pair(x, d, cx, cy, R, o = {}) {
  const top = cy + R * FIG_TOP;
  const w = R * FIG_W;
  figure(x, d, cx, top, w, 'back', o);
  orb(x, d, cx, cy, R, o);
  figure(x, d, cx, top, w, 'front', o);
}

function chip(x, label, colour, cx, y, alpha = 1) {
  if (!label || alpha <= 0) return;
  x.save(); x.globalAlpha *= alpha;
  x.font = `800 32px ${SANS}`;
  const t = label.toUpperCase();
  const w = x.measureText(t).width + 96;
  x.fillStyle = 'rgba(255,255,255,.92)';
  x.beginPath(); x.roundRect(cx - w / 2, y - 46, w, 66, 33); x.fill();
  x.fillStyle = colour; x.beginPath(); x.arc(cx - w / 2 + 38, y - 13, 11, 0, Math.PI * 2); x.fill();
  x.fillStyle = INK2; x.textAlign = 'center'; x.fillText(t, cx + 16, y);
  x.restore();
}

/** The label's lines: the part before " · " beside the marker, each qualifier after it on its own line. */
function labelLines(x, label, maxW) {
  const out = [];
  label.toUpperCase().split(/\s+·\s+/).forEach((seg) => out.push(...wrap(x, seg, maxW, 3)));
  return out;
}
const LABEL_FONT = `800 32px ${SANS}`;
const LABEL_LH = 42;
/** Someone's words, as a ribbon of light with its own honest label. Returns its height. */
function ribbon(x, p, cx, y, w, { alpha = 1, measureOnly = false, small = false } = {}) {
  const pad = small ? 36 : 48;
  const fs = small ? 44 : 50;
  const lh = small ? 56 : 66;
  const maxLines = small ? 4 : 7;
  const tf = `450 ${fs}px ${SERIF}`;
  const inner = w - pad * 2;
  x.save(); x.font = LABEL_FONT; if ('letterSpacing' in x) x.letterSpacing = '1px';
  const labels = labelLines(x, honestLabel(p), inner - 44);
  x.restore();
  const labelH = 24 + (labels.length - 1) * LABEL_LH;              // first cap top to last baseline
  const textTop = pad + labelH + 30;                               // first line's baseline sits fs*0.8 below
  const th = measure(x, `“${p.text}”`, tf, inner, lh, maxLines);
  const hgt = textTop + Math.round(fs * 0.8) + th - lh + Math.round(fs * 0.3) + pad;
  if (measureOnly || alpha <= 0) return hgt;
  x.save(); x.globalAlpha *= alpha;
  x.shadowColor = 'rgba(70,40,140,.2)'; x.shadowBlur = 50; x.shadowOffsetY = 22;
  x.fillStyle = p.kind === 'mallow' ? 'rgba(250,247,255,.96)' : 'rgba(255,255,255,.95)';
  x.beginPath(); x.roundRect(cx - w / 2, y, w, hgt, 44); x.fill();
  x.restore();
  x.save(); x.globalAlpha *= alpha;
  const m = MALLOWS[p.mallow] || MALLOWS.noomi;
  const lx = cx - w / 2 + pad;
  const base = y + pad + 24;
  if (p.kind === 'mallow') star(x, lx + 14, base - 12, 18, m.deep, 1);
  else { x.fillStyle = m.body; x.beginPath(); x.arc(lx + 14, base - 12, 13, 0, Math.PI * 2); x.fill(); }
  x.font = LABEL_FONT; if ('letterSpacing' in x) x.letterSpacing = '1px';
  x.fillStyle = INK3; x.textAlign = 'left';
  labels.forEach((l, i) => x.fillText(l, lx + 44, base + i * LABEL_LH));
  x.restore();
  text(x, `“${p.text}”`, lx, y + textTop + Math.round(fs * 0.8), { font: tf, colour: INK, maxW: inner, lh, align: 'left', maxLines, alpha });
  return hgt;
}
function brand(x, alpha = 1) {
  text(x, 'Hushmates', W / 2, 150, { font: `italic 500 56px ${SERIF}`, colour: INK, alpha });
}
const CARD_H = 150;
function endCard(x, y, alpha = 1) {
  if (alpha <= 0) return;
  x.save(); x.globalAlpha *= alpha;
  x.fillStyle = 'rgba(31,22,64,.9)'; x.beginPath(); x.roundRect(150, y, W - 300, CARD_H, 75); x.fill();
  x.textAlign = 'center';
  x.fillStyle = '#FFF8F3'; x.font = `800 40px ${SANS}`; x.fillText('Hushmallow', W / 2, y + 64);
  x.font = `500 32px ${SANS}`; x.fillStyle = 'rgba(255,248,243,.85)'; x.fillText('A softer space for feelings.', W / 2, y + 112);
  x.restore();
}

// --------------------------------------------------------------- story --
/**
 * d = { tint, label, labelColour, words, humans, petals, mallowPetal, hasMallow, mallow, picks: [{kind, label, text, mallow}] }
 * → { duration, draw(ctx, t), still(ctx), stillPicks(ctx), showsMallow(), ready() }
 */
export function makeStory(d) {
  const L = storyLines(d);
  const picks = (d.picks || []).slice(0, 5);
  const OPEN = 3.2;
  const COUNT = 3.4;
  const EACH = 3.6;
  const END = 3.4;
  const t1 = OPEN;
  const t2 = t1 + COUNT;
  const t3 = t2 + picks.length * EACH;
  const duration = t3 + END;
  const n = (d.petals || []).length;

  // Where the orb (and the Mallow under it) stands in each part of the video.
  // Each place keeps the pair clear of what is on screen with it: the
  // wordmark above, the count, the perspectives and the end card below.
  // (the pair reaches 2.08R above the orb's centre and at most 4.75R below it)
  const P_COUNT = { cy: 830, R: 104 };    // 614 → 1324; the name chip starts at 1394
  const P_BACK = { cy: 356, R: 56 };      // 240 → 622 (the wordmark ends at 166); "Here’s what came back." from 700
  const P_END = { cy: 712, R: 110 };      // 483 → 1235; the invitation from 1302; the card from 1620
  const COUNT_Y = 1540;
  const CHIP_Y = 1440;
  const BACK_Y = 742;
  const RIBBON_MID = 1214;
  const END_Y = 1352;
  const CARD_Y = H - 300;

  function draw(x, t) {
    x.save();
    background(x, d, t);
    brand(x, 0.9);
    // 1. the opening line and (if chosen) the words, then the orb and the Mallow rise in
    const a1 = fade(t, 0.1, 0.9, t1 - 0.4, t1 + 0.2);
    const y = text(x, L.open, W / 2, 320, { font: `500 64px ${SERIF}`, maxW: 880, lh: 80, alpha: a1, balance: true });
    if (d.words) text(x, `“${d.words}”`, W / 2, y + 30, { font: `italic 450 44px ${SERIF}`, colour: INK2, maxW: 820, lh: 60, maxLines: 4, alpha: a1 * win(t, 0.6, 1.4), balance: true });
    // one orb throughout: it rises in and blooms with the count, waits up top while
    // perspectives come back, then settles for the invitation
    const rise = win(t, 0.4, 2.2);
    const up = picks.length ? win(t, t2 - 0.4, t2 + 0.4) : 0;          // settled up top before anything appears under it
    const down = win(t, t3 + 0.05, t3 + 1);
    let cy = lerp(1680, P_COUNT.cy, rise);
    let R = P_COUNT.R;
    cy = lerp(cy, P_BACK.cy, up); R = lerp(R, P_BACK.R, up);
    cy = lerp(cy, P_END.cy, down); R = lerp(R, P_END.R, down);
    const bloom = n ? Math.max(0, (t - (t1 - 0.2)) / ((COUNT - 1.2) / Math.max(n, 1))) : 0;
    x.save(); x.globalAlpha *= rise;
    pair(x, d, W / 2, cy, R, { bloom, starAlpha: win(t, t1 + 1.6, t1 + 2.4), breathe: Math.sin(t * 2), t });
    x.restore();
    // 2. the count, and the feeling's name
    const a2 = fade(t, t1 + 0.4, t1 + 1.2, t2 - 0.4, t2 + 0.2);
    text(x, L.count, W / 2, COUNT_Y, { font: `500 66px ${SERIF}`, maxW: 900, lh: 80, alpha: a2, balance: true });
    chip(x, d.label, d.labelColour, W / 2, CHIP_Y, a2);
    // 3. what came back, one at a time
    if (picks.length) {
      const a3 = fade(t, t2 + 0.4, t2 + 1, t3 - 0.3, t3 + 0.3);
      text(x, L.back, W / 2, BACK_Y, { font: `500 60px ${SERIF}`, alpha: a3 });
      picks.forEach((p, i) => {
        const s = t2 + i * EACH;
        const a = fade(t, s + 0.5, s + 1.1, s + EACH - 0.4, s + EACH + 0.1);
        if (a <= 0) return;
        const hgt = ribbon(x, p, W / 2, 0, 920, { measureOnly: true });
        x.save(); x.translate(0, (1 - a) * 40);
        ribbon(x, p, W / 2, Math.max(BACK_Y + 60, RIBBON_MID - hgt / 2), 920, { alpha: a });
        x.restore();
      });
    }
    // 4. the invitation and the end card
    const a4 = win(t, t3 + 0.45, t3 + 1.2);
    if (a4 > 0) {
      text(x, L.end, W / 2, END_Y, { font: `500 70px ${SERIF}`, maxW: 860, lh: 86, alpha: a4, balance: true });
      endCard(x, CARD_Y, a4);
    }
    x.restore();
  }

  /**
   * One frame that tells it all: for the picture and for reduced motion. Up to
   * two perspectives, as many as fit legibly. Returns how many it showed; with
   * `dry` it only works that out and draws nothing.
   */
  function still(x, dry = false) {
    const A = dry ? 0 : 1;                                            // text at alpha 0 is measured, not drawn
    x.save();
    if (!dry) { background(x, d, 0); brand(x); }
    const tight = picks.length > 0;
    const below = pairBelow(d);                                       // measured now: the art may have arrived since
    // the bottom: the invitation and the card
    const cardY = H - (tight ? 196 : 280);
    const endFont = `500 ${tight ? 48 : 56}px ${SERIF}`;
    const endLh = tight ? 60 : 68;
    const endLines = measure(x, L.end, endFont, 900, endLh) / endLh;
    const endY = cardY - 56 - (endLines - 1) * endLh;               // the invitation's first baseline
    // the top: the opening line and (if chosen) the words
    let y = text(x, L.open, W / 2, tight ? 252 : 290, { font: `500 ${tight ? 56 : 62}px ${SERIF}`, maxW: 880, lh: tight ? 66 : 74, balance: true, alpha: A });
    if (d.words) y = text(x, `“${d.words}”`, W / 2, y + 6, { font: `italic 450 ${tight ? 38 : 44}px ${SERIF}`, colour: INK2, maxW: 840, lh: tight ? 50 : 58, maxLines: tight ? 2 : 3, balance: true, alpha: A });
    const top = y - 18;                                               // just under the last line's descenders
    // the middle, top to bottom: the orb and the Mallow, the name, the count, what came back
    const countFont = `500 ${tight ? 54 : 62}px ${SERIF}`;
    const countLh = tight ? 64 : 74;
    const countH = measure(x, L.count, countFont, 900, countLh);
    const chipH = d.label ? 92 : 0;
    const backH = tight ? 84 : 0;
    const limit = endY - (tight ? 80 : 130);                          // keep air above the invitation
    const rib = picks.map((p) => ribbon(x, p, W / 2, 0, 940, { measureOnly: true, small: true }));
    const fixed = 26 + chipH + 30 + countH + backH;                   // gaps and lines below the pair
    const [rMin, rMax] = tight ? [60, 74] : [84, 120];                // the pair stays big enough to read
    const room = (k) => limit - top - fixed - rib.slice(0, k).reduce((a, b) => a + b + 22, 0);
    let shown = Math.min(2, picks.length);
    while (shown > 1 && room(shown) < rMin * (ORB_TOP + below)) shown--;
    const R = Math.max(rMin, Math.min(rMax, room(shown) / (ORB_TOP + below)));
    const spare = Math.max(0, room(shown) - R * (ORB_TOP + below));
    const gap = spare / (tight ? 4 : 3);                              // what's left, shared out as air
    const cy = top + gap * (tight ? 0.6 : 1) + R * ORB_TOP;
    if (!dry) pair(x, d, W / 2, cy, R);
    y = cy + R * below + 26 + gap * (tight ? 0.8 : 0.7);
    if (d.label) { if (!dry) chip(x, d.label, d.labelColour, W / 2, y + 46, 1); y += chipH; }
    y = text(x, L.count, W / 2, y + 30 + countLh * 0.72, { font: countFont, maxW: 900, lh: countLh, balance: true, alpha: A }) - countLh * 0.72;
    let drawn = 0;
    if (tight) {
      y = text(x, L.back, W / 2, y + gap + 52, { font: `italic 500 42px ${SERIF}`, colour: INK2, lh: 52, alpha: A }) - 20;
      for (let i = 0; i < shown; i++) {
        if (y + rib[i] > limit + 40) break;
        if (!dry) ribbon(x, picks[i], W / 2, y, 940, { small: true });
        y += rib[i] + 22;
        drawn++;
      }
    }
    if (!dry) {
      text(x, L.end, W / 2, endY, { font: endFont, maxW: 900, lh: endLh, balance: true });
      endCard(x, cardY);
    }
    x.restore();
    return drawn;
  }
  /** How many of the chosen perspectives the picture has room for (any 2D context can measure). */
  const stillPicks = (x) => still(x, true);
  /** Is the author's Mallow in it? (Only once its art has loaded.) */
  const showsMallow = () => !!ARTS.get(MALLOWS[d.mallow]?.id);
  return { duration, draw, still: (x) => still(x), stillPicks, showsMallow, ready: () => prepare(d.mallow) };
}

/** The picture: a PNG of the still frame. */
export async function renderPicture(story) {
  await story.ready();
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  story.still(cv.getContext('2d'));
  return new Promise((resolve, reject) => cv.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}

/** Can this browser record the story as a video? */
export function videoType() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported?.(t)) || null;
}

/** The short video: the story played once in real time and recorded on this device. */
export async function renderVideo(story, { onProgress, signal } = {}) {
  const type = videoType();
  if (!type) throw new Error('unsupported');
  await story.ready();
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  story.draw(x, 0);
  const stream = cv.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6e6 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { rec.onstop = resolve; });
  rec.start(250);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const step = () => {
      if (signal?.aborted) { resolve(); return; }
      const t = (performance.now() - t0) / 1000;
      story.draw(x, Math.min(t, story.duration));
      onProgress?.(Math.min(1, t / story.duration));
      if (t >= story.duration + 0.2) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await stopped;
  stream.getTracks().forEach((tr) => tr.stop());
  if (signal?.aborted) throw new Error('aborted');
  return new Blob(chunks, { type: type.split(';')[0] });
}
