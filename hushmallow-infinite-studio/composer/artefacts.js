// Review artefacts of a compiled direction, from a dry evaluation only (never
// from a render, R12): the cue list, the per-frame audio curves and sub-frame
// counts, and channel plots as SVG. The plan's compile step writes these next
// to direction.json; the planner's compile command decides where.
//
// The curves here are Node's. The score is always built from the render page's
// own dryRun() (engine/stage.js), which is bit-exact with Chromium's Math.pow;
// Node's agree within ~2e-12 (docs/ARCHITECTURE.md §1), enough for review.

import { createScene } from './scene.js';
import { domain } from './circular.js';

/** { cues, curves, subframes } of a direction, in the engine dryRun()'s shape. */
export function dryRun(direction) {
  const sc = createScene(direction);
  const { fps, duration } = direction.meta;
  const frames = Math.round(fps * duration);
  const curves = [], subframes = [];
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    subframes.push(sc.subframes(t));
    const { audio } = sc.state(t);
    if (audio) curves.push({ t: +t.toFixed(4), ...audio });
  }
  // the cue log as the engine records it: time to 0.1 ms, the payload flattened
  const cues = direction.cues.map((c) => ({ t: +c.t.toFixed(4), type: c.type, ...c.data }));
  return { cues, curves, subframes };
}

const GROUPS = ['body', 'face', 'cam', 'world', 'env', 'props', 'mallow'];
const fmt = (x) => (Math.round(x * 100) / 100).toString();

/**
 * Channel plots: one row per channel (each component of a vector channel is
 * its own line), sampled at `rate` Hz over the composition domain [−P, D − P),
 * each row scaled to its own range, with the named anchors as rules.
 * → SVG text, byte-identical for the same direction.
 */
export function channelPlotSvg(direction, { names = null, rate = 30, width = 1200, row = 36 } = {}) {
  const sc = createScene(direction);
  const { duration: D, P = 0 } = direction.meta;
  const { from: t0, to: t1 } = domain(D, P);
  const list = (names || Object.keys(direction.channels))
    .filter((n) => direction.channels[n])
    .sort((a, b) => GROUPS.indexOf(a.split('.')[0]) - GROUPS.indexOf(b.split('.')[0]) || (a < b ? -1 : a > b ? 1 : 0));
  const label = 190, plotW = width - label - 10, n = Math.round((t1 - t0) * rate);
  const x = (t) => label + ((t - t0) / (t1 - t0)) * plotW;
  const top = 26, height = list.length * row + top + 10;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="monospace" font-size="11">`,
    `<rect width="${width}" height="${height}" fill="#fff"/>`];
  const rules = Object.entries(direction.anchors).filter(([name, t]) => t >= t0 && t <= t1 && !/^[a-z]/.test(name));   // clock anchors (upper case), not sub-anchors
  rules.forEach(([name, t], i) => {
    out.push(`<line x1="${fmt(x(t))}" y1="${top - 4}" x2="${fmt(x(t))}" y2="${height}" stroke="#ddd"/><text x="${fmt(x(t) + 2)}" y="${i % 2 ? 19 : 9}" fill="#999" font-size="9">${name}</text>`);
  });
  list.forEach((name, r) => {
    const f = sc.channel(name), y0 = top + r * row;
    const samples = Array.from({ length: n + 1 }, (_, i) => { const v = f(t0 + (i * (t1 - t0)) / n); return Array.isArray(v) ? v : [v]; });
    const flat = samples.flat().filter(Number.isFinite);
    const lo = Math.min(...flat), hi = Math.max(...flat), span = hi - lo || 1;
    out.push(`<text x="4" y="${y0 + row / 2 + 4}">${name}</text><text x="${label - 4}" y="${y0 + 9}" text-anchor="end" fill="#999" font-size="9">${fmt(hi)}</text><text x="${label - 4}" y="${y0 + row - 4}" text-anchor="end" fill="#999" font-size="9">${fmt(lo)}</text>`);
    for (let c = 0; c < samples[0].length; c++) {
      const pts = samples.map((s, i) => `${fmt(x(t0 + (i * (t1 - t0)) / n))},${fmt(y0 + row - 4 - ((s[c] - lo) / span) * (row - 8))}`);
      out.push(`<polyline fill="none" stroke="${c ? '#c66' : '#36c'}" stroke-width="1" points="${pts.join(' ')}"/>`);
    }
  });
  out.push('</svg>');
  return out.join('\n') + '\n';
}
