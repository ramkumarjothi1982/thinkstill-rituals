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

/** How far the Mallow's layer may move its body to bring its own margins on screen, as a share of the body's size. */
export const MALLOW_NUDGE = 1 / 6;

/**
 * The small Mallow as fitBetween placed it (its body centred in the dock's spot): the scale (≤ 1, about the body's
 * centre, only if the body is bigger than the area) and then the shift that keep its visible body inside the area (the
 * viewport less its safe-area insets). The layer round the body (its canvas, mostly transparent) comes inside too, but
 * only by a nudge (MALLOW_NUDGE of the body's size): on a phone on its side the layer is far wider than the body, and
 * bringing all of it in pushed the body out of its spot, behind the words chip and Tap instead.
 * layer, body: boxes as placed (left/top/right/bottom, viewport px). Returns { dx, dy, k }.
 */
export function keepBodyInside(layer, body, area, { nudge = MALLOW_NUDGE } = {}) {
  const bw = body.right - body.left, bh = body.bottom - body.top;
  const k = Math.min(1, (area.right - area.left) / bw, (area.bottom - area.top) / bh);
  const cx = (body.left + body.right) / 2, cy = (body.top + body.bottom) / 2;
  const at = (b) => ({ left: cx + (b.left - cx) * k, top: cy + (b.top - cy) * k, right: cx + (b.right - cx) * k, bottom: cy + (b.bottom - cy) * k });
  const B = at(body), L = at(layer);
  // per axis: the shift that brings the layer in, at most a nudge, and always one that keeps the body in
  const axis = (lo, hi, bLo, bHi, a0, a1, cap) => {
    const want = lo < a0 ? a0 - lo : hi > a1 ? a1 - hi : 0;
    return Math.min(a1 - bHi, Math.max(a0 - bLo, Math.max(-cap, Math.min(cap, want))));
  };
  return {
    dx: axis(L.left, L.right, B.left, B.right, area.left, area.right, nudge * bw * k),
    dy: axis(L.top, L.bottom, B.top, B.bottom, area.top, area.bottom, nudge * bh * k),
    k,
  };
}
