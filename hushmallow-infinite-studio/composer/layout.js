// Layout: copy measured with the real font and fitted to the frame.
//
// measure(text, { weight, size, tracking }) → width in px is injected: in the
// render page it is canvas measureText with Fredoka loaded (exact, what the
// engine will draw); in Node it is the font-metrics shim
// (planner/metrics/fredoka-metrics.json, worst error 1.79 %). direction.meta.layout
// records which one measured a direction, and the runtime refuses to render a
// shim-measured direction whose boxes disagree with the page.
//
// Also here: pure re-statements of TextBlock / LogoCard visibility (engine/type.js)
// so G-DIR can check reading time and safe zones without a canvas.

import { typographic } from '../planner/typography.mjs';

/** Text styles (v2 values; the story library's format.layout agrees where it defines them). */
export const TEXT_STYLES = Object.freeze({
  hook: Object.freeze({ y: 286, size: 76, minSize: 50, weight: 600, tracking: 2, maxWidth: 960 }),
  bubble: Object.freeze({ size: 50, weight: 500, lineHeight: 58, padX: 38, padY: 26, ink: '#1b1d57', supersample: 2, wrap: 17 }),
  endText: Object.freeze({ y: 262, size: 62, weight: 500, maxWidth: 960 }),
  logo: Object.freeze({ y: 488, logoW: 360, urlSize: 44, gap: 62 }),
});

/** TextBlock defaults (engine/type.js), for the pure visibility model. */
export const TEXTBLOCK_DEFAULTS = Object.freeze({ x: 540, y: 300, size: 72, weight: 600, lineHeight: 1.16, tracking: 0, enterAt: 0, stagger: 0.12, rise: 22, inDur: 0.6, exitAt: 1e9, exitDur: 0.45 });
export const LOGOCARD_DEFAULTS = Object.freeze({ x: 540, y: 560, logoW: 400, url: 'hushmallow.com', urlSize: 46, gap: 70, enterAt: 13, exitAt: 1e9, exitDur: 0.4 });

/**
 * Wrap text into ≤ 2 rows of ≤ max characters at the word boundary that
 * balances the rows best (the story library's rule, planner/library.mjs wrap2).
 * → rows, or null when it cannot fit.
 */
export function wrap2(text, max) {
  if (text.length <= max) return [text];
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    if (a.length <= max && b.length <= max) {
      const score = Math.abs(a.length - b.length);
      if (!best || score < best.score) best = { rows: [a, b], score };
    }
  }
  return best ? best.rows : null;
}

/** Largest whole-pixel size in [min, max] at which every line fits maxWidth, or null. */
export function fitSize(lines, measure, { weight, tracking = 0, max, min, maxWidth }) {
  for (let size = max; size >= min; size--) {
    if (lines.every((l) => measure(typographic(l), { weight, size, tracking }) <= maxWidth)) return size;
  }
  return null;
}

/** Hook caption: auto-fit from 76 down to 50 px. → { lines, size, widths } */
export function layoutHook(lines, measure, style = TEXT_STYLES.hook) {
  const size = fitSize(lines, measure, { weight: style.weight, tracking: style.tracking, max: style.size, min: style.minSize, maxWidth: style.maxWidth });
  if (size === null) throw new Error(`hook does not fit ${style.maxWidth} px even at ${style.minSize} px: ${JSON.stringify(lines)}`);
  return { lines: lines.map(typographic), size, widths: lines.map((l) => measure(typographic(l), { weight: style.weight, size, tracking: style.tracking })) };
}

/** End card text at its fixed size; refuses copy that does not fit. → { lines, size, widths } */
export function layoutEndText(lines, measure, style = TEXT_STYLES.endText) {
  const widths = lines.map((l) => measure(typographic(l), { weight: style.weight, size: style.size, tracking: 0 }));
  const over = widths.findIndex((w) => w > style.maxWidth);
  if (over >= 0) throw new Error(`end line "${lines[over]}" is ${widths[over].toFixed(1)} px, over ${style.maxWidth} px`);
  return { lines: lines.map(typographic), size: style.size, widths };
}

/**
 * A thought on a glass card: wrapped, measured and padded exactly like v2's
 * bubbleCanvas(). → { lines, w, hw, hh }
 */
export function layoutBubble(text, measure, style = TEXT_STYLES.bubble) {
  const rows = wrap2(text, style.wrap);
  if (!rows) throw new Error(`thought "${text}" cannot wrap into 2 rows of ${style.wrap} characters`);
  const lines = rows.map(typographic);
  const w = Math.max(...lines.map((l) => measure(l, { weight: style.weight, size: style.size, tracking: 0 })));
  const hw = w / 2 + style.padX, hh = (lines.length * style.lineHeight) / 2 + style.padY;
  return { lines, w, hw, hh };
}

/** A measure() for the render page: canvas measureText with the loaded font. */
export function canvasMeasure(doc = globalThis.document) {
  const m = doc.createElement('canvas').getContext('2d');
  return (text, { weight, size, tracking = 0 }) => {
    m.font = `${weight} ${size}px "Fredoka"`;
    m.letterSpacing = tracking ? `${tracking}px` : '0px';
    return m.measureText(text).width;
  };
}

// ---------------------------------------------- text visibility models --

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const outCubic = (t) => 1 - Math.pow(1 - t, 3);

/** Alpha and baseline y of line i of a TextBlock at t (engine/type.js TextBlock.draw). */
export function textLine(opts, t, i) {
  const o = { ...TEXTBLOCK_DEFAULTS, ...opts };
  const exitK = smoothstep(o.exitAt, o.exitAt + o.exitDur, t);
  if (exitK >= 1) return { a: 0, y: o.y };
  const tl = t - (o.enterAt + i * o.stagger);
  const k = o.enterAt <= -1 ? 1 : outCubic(clamp01(tl / o.inDur));
  const a = k * (1 - exitK);
  const y = o.y + i * o.size * o.lineHeight + (1 - k) * o.rise - exitK * o.rise * 0.5;
  return { a: a <= 0.003 ? 0 : a, y };
}

/** Alpha of a LogoCard plate and URL at t (engine/type.js LogoCard.draw). */
export function logoAlpha(opts, t) {
  const o = { ...LOGOCARD_DEFAULTS, ...opts };
  const tt = t - o.enterAt;
  if (tt < 0) return { plate: 0, url: 0 };
  const exitK = smoothstep(o.exitAt, o.exitAt + o.exitDur, t);
  if (exitK >= 1) return { plate: 0, url: 0 };
  return { plate: smoothstep(0, 0.5, tt) * (1 - exitK), url: smoothstep(0.25, 0.7, tt) * (1 - exitK) };
}
