// Duet stagecraft: where two Mallows stand so that both are on the world's stage prop.
//
// Every Hushfold realm paints one prop for one Mallow in the middle of the screen: a river stone, a
// wooden dais, a cushion, an astrolabe dais, a meadow island (the cove's sand and the storm's floor are
// open ground). A duet's pair needs a wider one, so it frames the world closer when the prop is too
// small: the realm's canvas is laid out larger than the screen around the prop (the realm repaints at
// that size, nothing is stretched), so the prop grows while its top stays on the ground line, and the
// two stages close in so each Mallow stands on it. The world is framed at most ZOOM_MAX times closer;
// past that the Mallows are drawn smaller instead. Pure: no DOM, Node-testable.

/**
 * The top of each realm's prop: its half-width is c · min(W, a·H) in the realm canvas's own px (from
 * src/world/realms/*.js, read-only: tests/hushbeat.test.mjs checks these numbers against that code).
 * null: open ground, any x stands on it.
 */
export const PEDESTAL = Object.freeze({
  'blue-drift': Object.freeze([0.34, 0.52]),             // the river stone: rx 0.46 of a 0.74 U sprite, U = min(W, 0.52 H)
  'spark-festival': Object.freeze([0.32, 0.55]),         // the wooden dais: min(0.34 W, 0.32 u), u = min(W, 0.55 H)
  'raindrop-lagoon': Object.freeze([0.34, Infinity]),    // the cushion: rx 0.46 of a 0.74 W sprite
  'spiral-observatory': Object.freeze([0.46, Infinity]), // the astrolabe dais: rx 0.46 W
  'sunpop-orchard': Object.freeze([0.56, Infinity]),     // the meadow island: rx 0.56 W
  'moonmilk-cove': null,                                  // moonlit sand
  'static-storm': null,                                   // the cracked floor
});

export const FIT = 0.64;      // stage-screen's fitFor: a body is at most this share of its stage's width…
export const BAND = 0.58;     // …and of the free band above the ground (the floor less the top bar)
export const TOPBAR = 96;     // px: stage-screen's band = floor − 96
export const EDGE = 0.92;     // the bodies keep inside this share of the prop's half-width (its rim shows beside them)
export const ZOOM_MAX = 2;    // the world is framed at most this much closer, on each axis

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const past = (v) => (v >= 0.5 ? -Math.round(v) : 0);   // px past a screen edge, as an inset
// a Mallow's outer edge from the middle, per px of body: half a stage (the body is FIT of it) and half a body
const SPAN = (0.5 / FIT + 0.5) / EDGE;

/** The prop's half-width (px) for a realm canvas of W × H, or Infinity (open ground, or no realm). */
export function pedestalHalf(realm, W, H) {
  const p = realm && Object.hasOwn(PEDESTAL, realm) ? PEDESTAL[realm] : null;
  return p ? p[0] * Math.min(W, p[1] * H) : Infinity;
}

/**
 * Frame a duet.
 * @param {{realm:string|null, W:number, H:number, ground:number, cap:number}} o
 *   W, H: the screen (px); ground: the realm's ground line (0..1 of H, where the Mallows' feet are with the
 *   tray closed); cap: the widest a stage may be (px)
 * @returns {{w:number, body:number, zoom:number, world:{top:number, right:number, bottom:number, left:number}}}
 *   w: each stage's width (the two meet in the middle); body: the body size that gives (px, stage-screen's
 *   measure); zoom: how much closer the world is framed (1: as solo); world: the realm container's insets
 *   (px, ≤ 0: past the screen's edges)
 */
export function duetLayout({ realm, W, H, ground, cap }) {
  const floor = clamp(ground, 0.5, 0.98) * H;
  const b0 = Math.max(1, Math.min(FIT * cap, BAND * (floor - TOPBAR)));
  const p = realm && Object.hasOwn(PEDESTAL, realm) ? PEDESTAL[realm] : null;
  let Wn = W, Hn = H, body = b0;
  if (p && pedestalHalf(realm, W, H) < SPAN * b0) {
    const [c, a] = p, need = SPAN * b0;
    Wn = clamp(need / c, W, W * ZOOM_MAX);                          // the prop grows with the canvas width…
    if (Number.isFinite(a)) Hn = clamp(need / (c * a), H, H * ZOOM_MAX);   // …and its height, where that limits it
    body = Math.min(b0, pedestalHalf(realm, Wn, Hn) / SPAN);
  }
  const ky = Hn / H, side = past((Wn - W) / 2);
  return {
    w: Math.floor(Math.min(cap, body / FIT)),
    body,
    zoom: Math.max(Wn / W, ky),
    // grown about the prop: its centre stays at the screen's middle and its top on the ground line
    world: { top: past((ky - 1) * floor), right: side, bottom: past((ky - 1) * (H - floor)), left: side },
  };
}
