// The person's own words inside a ritual.
//
// `full` is exactly what they typed (shown in the reading overlay); `token`
// is the short excerpt the ritual's objects carry. The excerpt is chosen
// mechanically (first clause that fits) and the person can edit it by hand.
// Nothing is reworded, analysed or sent anywhere. Canvas text is drawn with
// fillText, so it's always literal (never parsed as markup).

import { FONT, wrap, clamp, rgba, glow } from './fx.js';
import { getEmotion } from '../data/emotions.js';

export const TOKEN_MAX = 42;

/** A short excerpt of `text` for in-scene objects: the first clause that fits, else a word-boundary cut. */
export function excerpt(text, max = TOKEN_MAX) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const clauses = t.split(/(?<=[.!?;:])\s+|\s+[—–-]\s+|,\s+/).map((c) => c.trim()).filter(Boolean);
  for (const c of clauses) if (c.length <= max && c.split(' ').length >= 3) return c.replace(/[.,;:]$/, '');
  const words = t.split(' ');
  let out = '';
  for (const w of words) { if ((out ? out.length + 1 : 0) + w.length > max - 1) break; out = out ? `${out} ${w}` : w; }
  return (out || t.slice(0, max - 1)).replace(/[.,;:]$/, '') + '…';
}

/** Words for one ritual run. */
export function createWords(input = {}) {
  const full = String(input.text || '').replace(/\s+/g, ' ').trim();
  const names = (input.emotions || []).map((e) => getEmotion(e.id)?.name).filter(Boolean);
  const own = full.length > 0;
  const fallback = names.length ? names.slice(0, 2).join(' · ') : 'this feeling';
  let token = own ? excerpt(full) : fallback;
  const subs = new Set();
  return {
    full: own ? full : '',
    own,
    feelings: names,
    get token() { return token; },
    /** Manual excerpt/edit by the person (trimmed to TOKEN_MAX). */
    setToken(s) {
      const v = String(s || '').replace(/\s+/g, ' ').trim().slice(0, TOKEN_MAX);
      token = v || (own ? excerpt(full) : fallback);
      for (const fn of subs) fn(token);
    },
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

/**
 * Draw words in a material style. Returns {w, h} of the block.
 *   style: 'light' (glowing ink on dark), 'plate' (readable glass plate), 'etched' (engraved into metal/stone),
 *          'ink' (dark ink on a light surface), 'ember' (warm glowing), 'frost' (cool frosted)
 */
export function drawWords(g, text, x, y, { style = 'plate', size = 16, weight = 600, maxWidth = 240, lines = 2, alpha = 1, rot = 0,
  colour, glowColour = '#ffd98a', align = 'center' } = {}) {
  if (!text || alpha <= 0.01) return { w: 0, h: 0 };
  g.save();
  g.translate(x, y); if (rot) g.rotate(rot);
  g.globalAlpha *= clamp(alpha);
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
  const ls = wrap(g, text, maxWidth, lines), lh = size * 1.2, h = ls.length * lh;
  let w = 0; for (const l of ls) w = Math.max(w, g.measureText(l).width);
  const ax = align === 'center' ? 0 : align === 'right' ? -w / 2 : w / 2;
  const each = (fn) => ls.forEach((l, i) => fn(l, -h / 2 + lh * (i + 0.5)));
  switch (style) {
    case 'plate': {
      g.fillStyle = 'rgba(12,8,34,0.58)';
      rr(g, ax - w / 2 - 12, -h / 2 - 7, w + 24, h + 14, Math.min(18, (h + 14) / 2)); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = colour || '#fffaf0'; g.shadowColor = rgba(glowColour, 0.6); g.shadowBlur = 8;
      each((l, ly) => g.fillText(l, 0, ly));
      break;
    }
    case 'etched': {
      g.fillStyle = 'rgba(0,0,0,0.55)'; each((l, ly) => g.fillText(l, 0.8, ly + 1.1));
      g.fillStyle = 'rgba(255,255,255,0.35)'; each((l, ly) => g.fillText(l, -0.6, ly - 0.7));
      g.fillStyle = colour || '#e9d2b0'; each((l, ly) => g.fillText(l, 0, ly));
      break;
    }
    case 'ink': {
      g.fillStyle = colour || '#2a1f45'; g.shadowColor = 'rgba(255,255,255,0.5)'; g.shadowBlur = 2;
      each((l, ly) => g.fillText(l, 0, ly));
      break;
    }
    case 'ember': case 'light': case 'frost': {
      const gc = style === 'ember' ? '#ff8a3d' : style === 'frost' ? '#9fe6ff' : glowColour;
      glow(g, 0, 0, Math.max(w * 0.7, h), gc, 0.28);
      g.shadowColor = 'rgba(6,4,22,0.95)'; g.shadowBlur = 7;
      g.fillStyle = colour || (style === 'ember' ? '#fff0d8' : style === 'frost' ? '#f2fcff' : '#ffffff');
      each((l, ly) => g.fillText(l, 0, ly));
      g.shadowColor = rgba(gc, 0.9); g.shadowBlur = 14;
      each((l, ly) => g.fillText(l, 0, ly));
      break;
    }
    default: each((l, ly) => g.fillText(l, 0, ly));
  }
  g.restore();
  return { w: w + 24, h: h + 14 };
}

function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
