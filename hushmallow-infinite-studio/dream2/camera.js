// The dream2 camera: a pinhole at (x, h, z) looking along +Z over a mirror lake
// (height 0). Design space is 1080 × 1920; F = 1000 px, so something 1000 world
// units in front of the camera is drawn at 1 px per world unit.
//   cam = { x, h (eye height), z (dolly), horizon (screen y of the horizon) }

export const F = 1000, W = 1080, H = 1920;

/** World point → screen { x, y, k (px per world unit), d (depth from the camera) }. */
export function project(cam, X, Y, Z) {
  const d = Math.max(1, Z - cam.z), k = F / d;
  return { x: W / 2 + (X - cam.x) * k, y: cam.horizon - (Y - cam.h) * k, k, d };
}

/** The point on the lake (height 0) seen at screen (sx, sy) below the horizon → { X, Z }. */
export function onWater(cam, sx, sy) {
  const d = F * cam.h / Math.max(1e-3, sy - cam.horizon);
  return { X: cam.x + (sx - W / 2) * d / F, Z: cam.z + d };
}
