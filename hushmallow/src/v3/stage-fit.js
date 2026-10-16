// V3 STAGE FIT — where a V3 ritual's play area (the stage every engine and
// world law draws in and reads touches from) goes, and how the small Mallow
// in the dock stays on screen. Pure geometry: the host measures, these decide.
//
// The stage is the band between the title (the prompt and the world-law chip)
// and the ritual dock, and it never reaches under the dock: the dock's words
// chip and buttons sit above the canvas and would take the touches meant for
// the ritual (QA, 320×568 at text size Largest: Molten Tempo's rim ran under
// the words chip and could not be turned past halfway). The engines are made
// for a stage at least STAGE_MIN tall; when the band is shorter the title
// compacts first (its location line steps out; the prompt and the law stay),
// and if it is still short the stage is simply shorter and the engine fits
// itself into it. Only below STAGE_FLOOR (a phone on its side) does the stage
// grow upwards behind the title, whose words never take touches, rather than
// down under the dock.

export const STAGE_MIN = 220;
export const STAGE_FLOOR = 150;
export const STAGE_GAP = 10;
const SIDE = 12;

/** Does the title need to compact so the stage keeps STAGE_MIN? (title bottom and dock top in viewport px) */
export function wantsCompact(titleBottom, dockTop, { gap = STAGE_GAP, min = STAGE_MIN } = {}) {
  return dockTop - gap - (titleBottom + gap) < min;
}

/**
 * The stage rect: { x, y, w, h, cx, cy, s }. left/width: the scene column; titleBottom/dockTop: viewport px;
 * barBottom: the top bar's bottom (the stage never rises above it).
 */
export function stageRect({ left, width, titleBottom, dockTop, barBottom = 0, gap = STAGE_GAP, floor = STAGE_FLOOR }) {
  const bottom = dockTop - gap;
  let y = titleBottom + gap;
  if (bottom - y < floor) y = Math.max(barBottom + gap, bottom - floor);
  const x = left + SIDE, w = Math.max(1, width - SIDE * 2), h = Math.max(1, bottom - y);
  const s = Math.min(1.45, Math.max(0.72, Math.min(w, h) / 360));
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, s };
}

/**
 * Keeps a box (the small Mallow's layer as placed in the dock: left/top/right/bottom, viewport px) inside an area (the
 * viewport less its safe-area insets): the shift that brings it in, and a scale factor (≤ 1, about its centre) only
 * when it is bigger than the area. The layer's canvas is the Mallow's touch target, so all of it stays on screen.
 */
export function keepInside(box, area) {
  const bw = box.right - box.left, bh = box.bottom - box.top;
  const k = Math.min(1, (area.right - area.left) / bw, (area.bottom - area.top) / bh);
  const cx = (box.left + box.right) / 2, cy = (box.top + box.bottom) / 2;
  const w = bw * k, hgt = bh * k;
  let l = cx - w / 2, t = cy - hgt / 2;
  if (l < area.left) l = area.left; else if (l + w > area.right) l = area.right - w;
  if (t < area.top) t = area.top; else if (t + hgt > area.bottom) t = area.bottom - hgt;
  return { dx: l + w / 2 - cx, dy: t + hgt / 2 - cy, k };
}
