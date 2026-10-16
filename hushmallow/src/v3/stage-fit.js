// V3 STAGE FIT — where a V3 ritual's play area (the stage every engine and
// world law draws in and reads touches from) goes. Pure geometry: the host
// measures, these decide.
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
