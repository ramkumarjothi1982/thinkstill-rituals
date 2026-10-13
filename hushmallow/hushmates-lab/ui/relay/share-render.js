// The share story, drawn on a canvas (no network, nothing uploaded). One
// renderer serves the live preview, the 9:16 picture and the short video, so
// what the person sees is exactly what they keep.
//
// Honesty rules (enforced by what the scene passes in, and again here):
//   - counts are the journey's real human count; a Mallow never counts
//   - a person's words appear only if that writer allowed it (`shareable`)
//   - a Mallow perspective is always labelled automatically generated
//   - nothing is invented to fill a gap: fewer people means fewer petals

import { MALLOWS } from '../mallows-data.js';

export const W = 1080;
export const H = 1920;
const INK = '#1F1640';
const INK2 = '#4B4366';
const INK3 = '#7A7290';
const SERIF = 'Fraunces, Georgia, serif';
const SANS = 'Manrope, "Nunito Sans", system-ui, sans-serif';
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];

export const HUMAN_LABEL = 'A Hushmate’s perspective';
export const MALLOW_LABEL = 'A Mallow perspective · Automatically generated';

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
  try { await Promise.all(['500 64px Fraunces', 'italic 500 64px Fraunces', '800 30px Manrope', '600 30px Manrope'].map((f) => document.fonts.load(f))); } catch { /* system fonts */ }
}

// ------------------------------------------------------------ helpers --
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const win = (t, a, b) => ease((t - a) / (b - a));                    // 0 → 1 between a and b
const fade = (t, a, b, c, d) => Math.min(win(t, a, b), 1 - win(t, c, d));
const hexA = (hex, a) => { const v = hex.replace('#', ''); const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

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
function text(x, str, cx, y, { font, colour = INK, maxW = 880, lh, align = 'center', maxLines = 8, alpha = 1 }) {
  if (alpha <= 0) return y;
  x.save();
  x.globalAlpha *= alpha;
  x.font = font;
  x.fillStyle = colour;
  x.textAlign = align;
  x.textBaseline = 'alphabetic';
  const step = lh || Math.round((parseFloat(font.match(/(\d+(?:\.\d+)?)px/)?.[1]) || 40) * 1.25);
  const lines = wrap(x, str, maxW, maxLines);
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
function chip(x, label, colour, cx, y, alpha = 1) {
  if (!label || alpha <= 0) return;
  x.save(); x.globalAlpha *= alpha;
  x.font = `800 30px ${SANS}`;
  const t = label.toUpperCase();
  const w = x.measureText(t).width + 96;
  x.fillStyle = 'rgba(255,255,255,.92)';
  x.beginPath(); x.roundRect(cx - w / 2, y - 46, w, 66, 33); x.fill();
  x.fillStyle = colour; x.beginPath(); x.arc(cx - w / 2 + 38, y - 13, 11, 0, Math.PI * 2); x.fill();
  x.fillStyle = INK2; x.textAlign = 'center'; x.fillText(t, cx + 16, y);
  x.restore();
}
/** Someone's words, as a ribbon of light with its honest label. Returns its height. */
function ribbon(x, p, cx, y, w, alpha = 1, measureOnly = false, small = false) {
  const pad = small ? 40 : 52;
  const fs = small ? 38 : 50;
  const lh = small ? 50 : 66;
  const lines = small ? 4 : 7;
  const tf = `450 ${fs}px ${SERIF}`;
  const th = measure(x, `“${p.text}”`, tf, w - pad * 2, lh, lines);
  const hgt = pad + 34 + 26 + th + pad - 22;
  if (measureOnly || alpha <= 0) return hgt;
  x.save(); x.globalAlpha *= alpha;
  x.shadowColor = 'rgba(70,40,140,.22)'; x.shadowBlur = 50; x.shadowOffsetY = 22;
  x.fillStyle = p.kind === 'mallow' ? 'rgba(250,247,255,.96)' : 'rgba(255,255,255,.95)';
  x.beginPath(); x.roundRect(cx - w / 2, y, w, hgt, 44); x.fill();
  x.restore();
  x.save(); x.globalAlpha *= alpha;
  const m = MALLOWS[p.mallow] || MALLOWS.noomi;
  const lx = cx - w / 2 + pad;
  if (p.kind === 'mallow') star(x, lx + 12, y + pad + 4, 16, m.deep, 1);
  else { x.fillStyle = m.body; x.beginPath(); x.arc(lx + 12, y + pad + 4, 12, 0, Math.PI * 2); x.fill(); }
  x.font = `800 24px ${SANS}`; x.fillStyle = INK3; x.textAlign = 'left';
  x.fillText((p.kind === 'mallow' ? MALLOW_LABEL : HUMAN_LABEL).toUpperCase(), lx + 40, y + pad + 13);
  x.restore();
  text(x, `“${p.text}”`, lx, y + pad + 34 + fs + 4, { font: tf, colour: INK, maxW: w - pad * 2, lh, align: 'left', maxLines: lines, alpha });
  return hgt;
}
function brand(x, alpha = 1) {
  text(x, 'Hushmates', W / 2, 168, { font: `italic 500 56px ${SERIF}`, colour: INK, alpha });
}
function endCard(x, y, alpha = 1) {
  if (alpha <= 0) return;
  x.save(); x.globalAlpha *= alpha;
  x.fillStyle = 'rgba(31,22,64,.9)'; x.beginPath(); x.roundRect(150, y, W - 300, 150, 75); x.fill();
  x.textAlign = 'center';
  x.fillStyle = '#FFF8F3'; x.font = `800 40px ${SANS}`; x.fillText('Hushmallow', W / 2, y + 64);
  x.font = `500 32px ${SANS}`; x.fillStyle = 'rgba(255,248,243,.85)'; x.fillText('A softer space for feelings.', W / 2, y + 112);
  x.restore();
}

// --------------------------------------------------------------- story --
/**
 * d = { tint, label, labelColour, words, humans, petals, mallowPetal, hasMallow, picks: [{kind, text, mallow}] }
 * → { duration, draw(ctx, t), still(ctx) }
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

  function draw(x, t) {
    x.save();
    background(x, d, t);
    brand(x, 0.9);
    // 1. the opening line and (if chosen) the words, then the orb rises
    const a1 = fade(t, 0.1, 0.9, t1 - 0.4, t1 + 0.2);
    let y = text(x, L.open, W / 2, 330, { font: `500 64px ${SERIF}`, maxW: 860, lh: 80, alpha: a1 });
    if (d.words) text(x, `“${d.words}”`, W / 2, y + 40, { font: `italic 450 44px ${SERIF}`, colour: INK2, maxW: 820, lh: 60, maxLines: 4, alpha: a1 * win(t, 0.6, 1.4) });
    // one orb throughout: it rises in and blooms with the count, waits up top while
    // perspectives come back, then settles for the invitation
    const rise = win(t, 0.4, 2.2);
    const up = picks.length ? win(t, t2 - 0.3, t2 + 0.6) : 0;
    const down = win(t, t3 - 0.1, t3 + 0.9);
    const lerp = (a, b, k) => a + (b - a) * k;
    let cy = lerp(1670, 1110, rise);
    let R = 150;
    cy = lerp(cy, 420, up); R = lerp(R, 92, up);
    cy = lerp(cy, 860, down); R = lerp(R, 150, down);
    const bloom = n ? Math.max(0, (t - (t1 - 0.2)) / ((COUNT - 1.2) / Math.max(n, 1))) : 0;
    x.save(); x.globalAlpha *= rise;
    orb(x, d, W / 2, cy, R, { bloom, starAlpha: win(t, t1 + 1.6, t1 + 2.4), breathe: Math.sin(t * 2) });
    x.restore();
    // 2. the count, and the feeling's name
    const a2 = fade(t, t1 + 0.4, t1 + 1.2, t2 - 0.4, t2 + 0.2);
    text(x, L.count, W / 2, 1560, { font: `500 66px ${SERIF}`, maxW: 880, lh: 82, alpha: a2 });
    chip(x, d.label, d.labelColour, W / 2, 1470, a2);
    // 3. what came back, one at a time
    if (picks.length) {
      const a3 = fade(t, t2, t2 + 0.6, t3 - 0.3, t3 + 0.3);
      text(x, L.back, W / 2, 720, { font: `500 60px ${SERIF}`, alpha: a3 });
      picks.forEach((p, i) => {
        const s = t2 + i * EACH;
        const a = fade(t, s + 0.2, s + 0.9, s + EACH - 0.4, s + EACH + 0.1);
        if (a <= 0) return;
        const hgt = ribbon(x, p, W / 2, 0, 920, 1, true);
        x.save(); x.translate(0, (1 - a) * 40);
        ribbon(x, p, W / 2, 1180 - hgt / 2, 920, a);
        x.restore();
      });
    }
    // 4. the invitation and the end card
    const a4 = win(t, t3 + 0.1, t3 + 0.9);
    if (a4 > 0) {
      text(x, L.end, W / 2, 1360, { font: `500 70px ${SERIF}`, maxW: 820, lh: 86, alpha: a4 });
      endCard(x, H - 300, a4);
    }
    x.restore();
  }

  /** One frame that tells it all: for the picture and for reduced motion. Up to two perspectives fit. */
  function still(x) {
    x.save();
    background(x, d, 0);
    brand(x);
    const show = picks.slice(0, 2);
    const tight = show.length > 0;
    let y = text(x, L.open, W / 2, tight ? 290 : 320, { font: `500 ${tight ? 54 : 60}px ${SERIF}`, maxW: 880, lh: tight ? 66 : 76 });
    if (d.words) y = text(x, `“${d.words}”`, W / 2, y + 20, { font: `italic 450 ${tight ? 36 : 42}px ${SERIF}`, colour: INK2, maxW: 820, lh: tight ? 48 : 56, maxLines: tight ? 2 : 3 });
    const R = tight ? (d.words ? 64 : 78) : 150;
    const oy = y + R * 2.1 + 14;
    orb(x, d, W / 2, oy, R);
    y = oy + R * 1.75 + 36;
    if (d.label) { chip(x, d.label, d.labelColour, W / 2, y + 46, 1); y += 96; }
    y = text(x, L.count, W / 2, y + 52, { font: `500 ${tight ? 54 : 62}px ${SERIF}`, maxW: 900, lh: tight ? 66 : 76 });
    const endY = H - (tight ? 236 : 360);
    if (show.length) {
      y = text(x, L.back, W / 2, y + 24, { font: `italic 500 40px ${SERIF}`, colour: INK2 }) + 6;
      for (const p of show) {
        const hh = ribbon(x, p, W / 2, 0, 940, 1, true, true);
        if (y + hh > endY - 70) break;
        ribbon(x, p, W / 2, y, 940, 1, false, true);
        y += hh + 20;
      }
    }
    text(x, L.end, W / 2, endY, { font: `500 ${tight ? 46 : 54}px ${SERIF}`, maxW: 860, lh: 60 });
    endCard(x, H - (tight ? 190 : 270));
    x.restore();
  }
  return { duration, draw, still };
}

/** The picture: a PNG of the still frame. */
export async function renderPicture(story) {
  await loadFonts();
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
  await loadFonts();
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
