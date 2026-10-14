// Text width estimates from planner/metrics/fredoka-metrics.json (written by
// tools/font-metrics.mjs from the render's own Chromium). The planner uses
// them to pre-lint layout: the hook must auto-fit between 76 and 50 px, end
// card and bubble rows must fit their boxes. The page measures real text
// again at compile time (composer/layout.js); the planner's margin
// (policy.layout.margin) keeps its estimate on the safe side.

import fs from 'node:fs';
import { studioPath } from '../render/lib/paths.mjs';
import { typographic } from './typography.mjs';

export const METRICS_FILE = studioPath('planner', 'metrics', 'fredoka-metrics.json');
let cached = null;

/** The committed Fredoka metrics (cached). */
export function loadMetrics(file = METRICS_FILE) {
  if (file !== METRICS_FILE) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!cached) cached = JSON.parse(fs.readFileSync(file, 'utf8'));
  return cached;
}

export { typographic } from './typography.mjs';

/**
 * Width in px of one line of text (already typographic) at weight/size, with
 * canvas letterSpacing `tracking` px after every character. Throws on a
 * character the metrics do not cover (copy lint admits Latin-1 only).
 */
export function measureText(text, { weight, size, tracking = 0, metrics = loadMetrics() }) {
  const w = metrics.weights[String(weight)];
  if (!w) throw new Error(`no Fredoka metrics for weight ${weight}`);
  const chars = [...text];
  let units = 0;
  for (let i = 0; i < chars.length; i++) {
    const adv = w.advance[chars[i]];
    if (adv === undefined) throw new Error(`no Fredoka metrics for character U+${chars[i].codePointAt(0).toString(16).padStart(4, '0')} in "${text}"`);
    units += adv;
    if (i + 1 < chars.length) units += w.kern[chars[i] + chars[i + 1]] || 0;
  }
  return (size * units) / metrics.unitsPerEm + tracking * chars.length;
}

/**
 * Largest whole-pixel size in [min, max] at which every line fits maxWidth
 * (after multiplying the estimate by margin), or null when even min overflows.
 */
export function fitSize(lines, { weight, tracking = 0, max, min, maxWidth, margin = 1, metrics = loadMetrics() }) {
  for (let size = max; size >= min; size--) {
    if (lines.every((l) => measureText(typographic(l), { weight, size, tracking, metrics }) * margin <= maxWidth)) return size;
  }
  return null;
}
