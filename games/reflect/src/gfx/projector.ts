/* A tiny 3D projector for canvas: perspective cameras, painter's-algorithm draw lists, shaded polygons and billboards.
 * Used by rituals that need one world seen from several places (Group Think Glitch) or a camera that rides a track
 * (Emotional Rollercoaster). World units are metres: x right, y up, z forward. */

export interface Cam { x: number; y: number; z: number; yaw: number; pitch: number; roll?: number; fov: number; }
export interface P2 { x: number; y: number; d: number; s: number; }
export type V3 = [number, number, number];

export function lookAt(from: V3, to: V3, fov: number, roll = 0): Cam {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz));
  return { x: from[0], y: from[1], z: from[2], yaw, pitch, roll, fov };
}
export function lerpCam(a: Cam, b: Cam, t: number): Cam {
  const L = (p: number, q: number) => p + (q - p) * t;
  let dy = b.yaw - a.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
  return { x: L(a.x, b.x), y: L(a.y, b.y), z: L(a.z, b.z), yaw: a.yaw + dy * t, pitch: L(a.pitch, b.pitch), roll: L(a.roll || 0, b.roll || 0), fov: L(a.fov, b.fov) };
}

export class Projector {
  w = 1; h = 1; f = 1;
  private cy = 1; private sy = 0; private cp = 1; private sp = 0; private cr = 1; private sr = 0;
  cam: Cam = { x: 0, y: 1, z: -3, yaw: 0, pitch: 0, fov: 1 };
  near = 0.08;
  /** `fov` is vertical for frames at least this wide; narrower (portrait) frames keep the same horizontal view and see
   * more above and below instead of losing the sides. */
  designAspect = 1.1;
  /** principal point (screen position of the view axis); a magnifier shifts it to zoom around any point */
  ox = 0.5; oy = 0.5;
  set(cam: Cam, w: number, h: number, f?: number, ox?: number, oy?: number) {
    this.cam = cam; this.w = w; this.h = h;
    const tv = Math.tan(cam.fov / 2);
    this.f = f || Math.min((h / 2) / tv, (w / 2) / (tv * this.designAspect));
    this.ox = ox ?? w / 2; this.oy = oy ?? h / 2;
    this.cy = Math.cos(-cam.yaw); this.sy = Math.sin(-cam.yaw);
    this.cp = Math.cos(cam.pitch); this.sp = Math.sin(cam.pitch);
    this.cr = Math.cos(-(cam.roll || 0)); this.sr = Math.sin(-(cam.roll || 0));
  }
  /** camera-space coordinates (z = depth) */
  toCam(x: number, y: number, z: number): V3 {
    let X = x - this.cam.x, Y = y - this.cam.y, Z = z - this.cam.z;
    // yaw (around y)
    const x1 = X * this.cy + Z * this.sy, z1 = -X * this.sy + Z * this.cy;
    // pitch (around x)
    const y2 = Y * this.cp - z1 * this.sp, z2 = Y * this.sp + z1 * this.cp;
    // roll (around z)
    const x3 = x1 * this.cr - y2 * this.sr, y3 = x1 * this.sr + y2 * this.cr;
    return [x3, y3, z2];
  }
  project(x: number, y: number, z: number): P2 | null {
    const c = this.toCam(x, y, z);
    if (c[2] < this.near) return null;
    const k = this.f / c[2];
    return { x: this.ox + c[0] * k, y: this.oy - c[1] * k, d: c[2], s: k };
  }
  /** world point under a screen point, on the horizontal plane y = planeY */
  unproject(sx: number, sy: number, planeY: number): V3 | null {
    // ray direction in camera space
    const dx = (sx - this.ox) / this.f, dy = -(sy - this.oy) / this.f;
    // inverse roll
    const rx = dx * this.cr + dy * this.sr, ry = -dx * this.sr + dy * this.cr, rz = 1;
    // inverse pitch
    const y1 = ry * this.cp + rz * this.sp, z1 = -ry * this.sp + rz * this.cp;
    // inverse yaw
    const wx = rx * this.cy - z1 * this.sy, wz = rx * this.sy + z1 * this.cy, wy = y1;
    if (Math.abs(wy) < 1e-6) return null;
    const t = (planeY - this.cam.y) / wy;
    if (t <= 0) return null;
    return [this.cam.x + wx * t, planeY, this.cam.z + wz * t];
  }
}

/** Painter's list: collect drawables with a depth, draw far → near. */
export class DrawList {
  items: { d: number; fn: (g: CanvasRenderingContext2D) => void }[] = [];
  add(d: number, fn: (g: CanvasRenderingContext2D) => void) { this.items.push({ d, fn }); }
  flush(g: CanvasRenderingContext2D) { this.items.sort((a, b) => b.d - a.d); for (const it of this.items) it.fn(g); this.items.length = 0; }
}

/** Shade a base colour by a light factor (0..1.4). */
export function shade(rgb: [number, number, number], k: number, tint?: [number, number, number], tk = 0): string {
  let r = rgb[0] * k, g = rgb[1] * k, b = rgb[2] * k;
  if (tint) { r = r * (1 - tk) + tint[0] * tk; g = g * (1 - tk) + tint[1] * tk; b = b * (1 - tk) + tint[2] * tk; }
  return `rgb(${Math.min(255, r) | 0},${Math.min(255, g) | 0},${Math.min(255, b) | 0})`;
}

export type Fill = string | ((g: CanvasRenderingContext2D, sp: P2[]) => string | CanvasGradient | CanvasPattern);

/** Add a shaded world-space polygon (all points must be in front of the camera, otherwise it is skipped). `fill` may
 * be a function of the projected points (for gradients that follow the face). */
export function poly(P: Projector, L: DrawList, pts: V3[], fill: Fill, stroke?: string, depthBias = 0) {
  const sp: P2[] = [];
  let d = 0;
  for (const p of pts) { const q = P.project(p[0], p[1], p[2]); if (!q) return; sp.push(q); d += q.d; }
  d = d / sp.length + depthBias;
  L.add(d, (g) => {
    g.beginPath(); g.moveTo(sp[0].x, sp[0].y);
    for (let i = 1; i < sp.length; i++) g.lineTo(sp[i].x, sp[i].y);
    g.closePath(); g.fillStyle = typeof fill === 'function' ? fill(g, sp) : fill; g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
  });
}

/** Axis-aligned box with simple directional shading: top bright, the side facing the camera mid, the other dark. */
export function box(P: Projector, L: DrawList, c: V3, size: V3, rgb: [number, number, number], light = 1, tint?: [number, number, number], tk = 0) {
  const [x, y, z] = c, [w, h, d] = size;
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
  const cam = P.cam;
  const faces: [V3[], number][] = [];
  faces.push([[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], 1.15]);
  if (cam.z < z0) faces.push([[[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], 0.8]);
  if (cam.z > z1) faces.push([[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 0.7]);
  if (cam.x < x0) faces.push([[[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 0.62]);
  if (cam.x > x1) faces.push([[[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], 0.66]);
  if (cam.y < y0) faces.push([[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], 0.4]);
  for (const [pts, k] of faces) poly(P, L, pts, shade(rgb, k * light, tint, tk));
}

/** Vertical cylinder (cake tiers, stools) approximated with n sides; draws the visible side band and the top. */
export function cylinder(P: Projector, L: DrawList, c: V3, r: number, h: number, rgb: [number, number, number], light = 1, top?: [number, number, number], n = 18, tint?: [number, number, number], tk = 0) {
  const ring = (y: number) => { const out: V3[] = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([c[0] + Math.cos(a) * r, y, c[2] + Math.sin(a) * r]); } return out; };
  const lo = ring(c[1]), hi = ring(c[1] + h);
  const cam = P.cam;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mx = (lo[i][0] + lo[j][0]) / 2 - c[0], mz = (lo[i][2] + lo[j][2]) / 2 - c[2];
    const facing = mx * (cam.x - c[0]) + mz * (cam.z - c[2]);
    if (facing <= 0) continue;
    const k = 0.8 + 0.28 * Math.max(0, (mx * -0.41 + mz * -0.91) / r);
    poly(P, L, [lo[i], lo[j], hi[j], hi[i]], shade(rgb, k * light, tint, tk), undefined, -0.001);
  }
  if (cam.y > c[1] + h) poly(P, L, hi, shade(top || rgb, 1.12 * light, tint, tk), undefined, -0.002);
}

/** A camera-facing image (Bubble characters, props). `hgt` is the world height of the sprite. */
export function sprite(P: Projector, L: DrawList, img: CanvasImageSource | null, at: V3, hgt: number, opts: { ax?: number; ay?: number; rot?: number; sx?: number; sy?: number; alpha?: number; draw?: (g: CanvasRenderingContext2D, size: number) => void; bias?: number } = {}) {
  const q = P.project(at[0], at[1], at[2]);
  if (!q) return;
  const size = hgt * q.s;
  if (size < 1) return;
  L.add(q.d + (opts.bias || 0), (g) => {
    g.save();
    g.translate(q.x, q.y);
    if (opts.rot) g.rotate(opts.rot);
    g.scale(opts.sx || 1, opts.sy || 1);
    if (opts.alpha != null) g.globalAlpha *= opts.alpha;
    if (opts.draw) opts.draw(g, size);
    else if (img) g.drawImage(img, -size * (opts.ax ?? 0.5), -size * (opts.ay ?? 1), size, size);
    g.restore();
  });
}

/** Draw something flat on the ground (shadows, light pools, splats, the investigation spotlight). The unit disc of the
 * callback (radius 1 around 0,0) maps onto a disc of radius `r` around `c` on the plane y = c[1], using the local
 * affine approximation of the perspective — exact enough for decals up to a couple of metres. */
export function floorDecal(P: Projector, L: DrawList | null, c: V3, r: number, draw: (g: CanvasRenderingContext2D) => void, depthBias = 0, g0?: CanvasRenderingContext2D) {
  const o = P.project(c[0], c[1], c[2]);
  const a = P.project(c[0] + r, c[1], c[2]);
  const b = P.project(c[0], c[1], c[2] + r);
  if (!o || !a || !b) return;
  const fn = (g: CanvasRenderingContext2D) => {
    g.save();
    g.transform(a.x - o.x, a.y - o.y, b.x - o.x, b.y - o.y, o.x, o.y);
    draw(g);
    g.restore();
  };
  if (L) L.add(o.d + depthBias, fn); else if (g0) fn(g0);
}

/** Cached soft glow sprite (string lights, flashes, bokeh). */
const glowCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(color: string, size = 64): HTMLCanvasElement {
  const key = color + size;
  let c = glowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, color); gr.addColorStop(0.25, color.replace(/[\d.]+\)$/, '0.45)')); gr.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}

/** Film grain tile, generated once. */
let grain: HTMLCanvasElement | null = null;
export function grainTile(): HTMLCanvasElement {
  if (grain) return grain;
  grain = document.createElement('canvas'); grain.width = grain.height = 128;
  const g = grain.getContext('2d')!, d = g.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 18; }
  g.putImageData(d, 0, 0);
  return grain;
}
