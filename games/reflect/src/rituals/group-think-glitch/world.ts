/* Group Think Glitch — the rooftop party as one deterministic 3D world. Every camera renders the same state at time t,
 * so scrubbing, the four rigs, the ceiling reveal and the rewind finale all show exactly the same event.
 *
 * Sightlines are authored, not faked: from the doorway the cat sits exactly behind the cake (and later drops behind the
 * cloth); from Glitch's phone a tall gift hides the stool; the balcony and the DJ booth can see it. */
import { Projector, DrawList, Cam, lookAt, box, cylinder, poly, sprite, glowSprite, grainTile, floorDecal, V3, shade } from '../../gfx/projector';
import { CamId } from './content';

export type Faces = (slug: string, mood: string) => CanvasImageSource | null;
export type Look = CamId | 'ceiling' | 'hero';
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const path = (t: number, keys: [number, V3][]): V3 => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const k = ease(seg(t, keys[i - 1][0], keys[i][0])); const a = keys[i - 1][1], b = keys[i][1]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
  }
  return keys[keys.length - 1][1];
};
const hash = (n: number) => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };

export const BUBBLE_GLOW: Record<string, string> = {
  rush: 'rgba(255,90,110,1)', patch: 'rgba(255,170,80,1)', glitch: 'rgba(150,120,255,1)', sync: 'rgba(90,170,255,1)',
  loopie: 'rgba(90,225,255,1)', drop: 'rgba(80,210,255,1)', still: 'rgba(150,235,200,1)'
};

/* ---------------- camera rigs ---------------- */
export const RIGS: Record<Look, { from: V3; to: V3; fov: number }> = {
  door: { from: [-1.5, 0.95, -0.9], to: [-0.5, 0.8, 2.2], fov: 0.82 },
  balcony: { from: [1.2, 5.0, 4.6], to: [-0.55, 0.5, 2.35], fov: 0.62 },
  phone: { from: [2.05, 1.08, 0.9], to: [-1.0, 0.45, 1.9], fov: 0.8 },
  booth: { from: [0.75, 1.75, 5.9], to: [-0.4, 0.7, 2.1], fov: 0.8 },
  ceiling: { from: [-0.4, 8.6, 2.12], to: [-0.4, 0, 2.2], fov: 0.95 },
  hero: { from: [3.6, 2.6, -2.2], to: [-0.5, 0.7, 2.3], fov: 0.9 }
};
export function rigCam(id: Look, t: number): Cam {
  const r = RIGS[id];
  const c = lookAt(r.from, r.to, r.fov);
  if (id === 'phone') { // handheld: breathing sway + a jolt at the splat
    const j = Math.max(0, 1 - Math.abs(t - 4.9) * 3);
    c.yaw += Math.sin(t * 2.1) * 0.012 + Math.sin(t * 7.3) * 0.004 + j * 0.03 * Math.sin(t * 40);
    c.pitch += Math.sin(t * 1.7) * 0.01 + j * 0.02;
    c.roll = Math.sin(t * 1.3) * 0.02;
  }
  return c;
}
/** The hook's establishing shot: a crane move from high over the street down into the party (k: 0..1). */
const SWEEP: [number, V3, V3, number][] = [
  [0, [7.5, 7.5, -8.5], [-0.2, 0.4, 2.4], 0.95],
  [0.5, [4.4, 2.9, -3.2], [-0.4, 0.7, 2.3], 0.9],
  [1, [-1.4, 1.05, -1.5], [-0.5, 0.74, 2.3], 0.86]
];
export function sweepCam(k: number): Cam {
  k = clamp(k, 0, 1);
  let i = 1; while (i < SWEEP.length - 1 && k > SWEEP[i][0]) i++;
  const a = SWEEP[i - 1], b = SWEEP[i], u = ease(seg(k, a[0], b[0]));
  const L3 = (p: V3, q: V3): V3 => [lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u)];
  return lookAt(L3(a[1], b[1]), L3(a[2], b[2]), lerp(a[3], b[3], u));
}

export { stateAt, hotspotAnchor, CAKE_REST, STOOL, worldToUV, uvToWorld } from './timeline';
export type { WorldState } from './timeline';
import { stateAt, WorldState, STOOL } from './timeline';

/* ---------------- static scenery (built once) ---------------- */
interface Building { x: number; z: number; w: number; d: number; top: number; c: [number, number, number]; seed: number; dist: number; lit: number; beacon: boolean; }
const HAZE: [number, number, number] = [176, 92, 136];
const BUILDINGS: Building[] = (() => {
  const out: Building[] = []; let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ring = (n: number, d0: number, d1: number, t0: number, t1: number, w0: number, w1: number) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + r() * 0.8) / n) * Math.PI * 2, dist = d0 + r() * (d1 - d0);
      out.push({ x: Math.cos(a) * dist, z: 2.4 + Math.sin(a) * dist, w: w0 + r() * (w1 - w0), d: w0 + r() * (w1 - w0), top: t0 + r() * (t1 - t0), c: [28 + r() * 16, 26 + r() * 16, 58 + r() * 24], seed: Math.floor(r() * 1e6), dist, lit: 0.22 + r() * 0.5, beacon: false });
    }
  };
  ring(14, 36, 52, -16, 8, 7, 12);
  ring(22, 72, 105, -22, 26, 9, 16);
  ring(28, 140, 190, -12, 44, 12, 22);
  out.sort((a, b) => b.top - a.top).slice(0, 5).forEach(b => (b.beacon = true));
  out.sort((a, b) => b.dist - a.dist);
  return out;
})();
const STARS: [number, number, number][] = (() => { const o: [number, number, number][] = []; for (let i = 0; i < 90; i++) o.push([hash(i * 3 + 1) * Math.PI * 2, 0.18 + Math.pow(hash(i * 3 + 2), 0.7) * 1.2, hash(i * 3 + 3)]); return o; })();
const CLOUDS: [number, number, number, number][] = [[0.3, 0.07, 2.2, 0.9], [1.2, 0.12, 1.6, 0.7], [2.4, 0.09, 2.6, 0.8], [3.3, 0.16, 1.8, 0.6], [4.4, 0.06, 2.4, 0.9], [5.4, 0.13, 2.0, 0.7]];
const SUN_YAW = 0.55;
const LIGHT_POLES: V3[] = [[-4.6, 2.6, -0.6], [-4.6, 2.6, 5.2], [3.6, 2.6, 5.2], [3.6, 2.6, -0.6]];
function catenary(a: V3, b: V3, sag: number, n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) { const k = i / n; out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * sag, lerp(a[2], b[2], k)]); }
  return out;
}
const STRINGS: V3[][] = [
  catenary(LIGHT_POLES[0], LIGHT_POLES[1], 0.55, 14), catenary(LIGHT_POLES[1], LIGHT_POLES[2], 0.6, 16),
  catenary(LIGHT_POLES[2], LIGHT_POLES[3], 0.55, 14)
];
const BUNTING: V3[] = catenary([-4.6, 2.15, 5.98], [3.6, 2.15, 5.98], 0.45, 18);
const BUNTING2: V3[] = catenary([-4.6, 2.1, -0.55], [-4.6, 2.1, 5.15], 0.4, 14);
const FLAG_COLS = ['#ff6f91', '#ffd166', '#4ecdc4', '#fff4e6', '#a78bfa'];
const BULB_COLORS = ['rgba(255,214,140,1)', 'rgba(255,190,120,1)', 'rgba(255,236,190,1)', 'rgba(255,170,150,1)'];
const POOLS: V3[] = [[-3.6, 0.003, 0.4], [-3.4, 0.003, 4.3], [2.6, 0.003, 4.4], [2.7, 0.003, 0.2], [-0.6, 0.003, 2.0], [-1.6, 0.003, 3.6], [0.9, 0.003, 1.0]];

/* ---------------- procedural sprites ---------------- */
const spriteCache = new Map<string, HTMLCanvasElement>();
function mk(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  let c = spriteCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  spriteCache.set(key, c);
  return c;
}
/** A ginger tabby with a white chest — readable at dusk from far away. Drawn facing right, feet at the bottom centre. */
export function catSprite(pose: string): HTMLCanvasElement {
  return mk('cat-' + pose, 200, 200, (g) => {
    g.translate(100, 192);
    const fur = '#e58a3a', dark = '#b8612a', light = '#f6b26b', chest = '#fff3e3';
    const stretch = pose === 'jump' ? 1.25 : 1;
    const loaf = pose === 'loaf';
    // tail
    g.strokeStyle = fur; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath();
    if (loaf) { g.moveTo(-34, -10); g.bezierCurveTo(-56, -6, -40, 6, -6, 2); }
    else { g.moveTo(-30, -22); g.bezierCurveTo(-74, -30, -70, pose === 'sit' ? -104 : -76, -46, pose === 'sit' ? -112 : -86); }
    g.stroke();
    g.strokeStyle = dark; g.lineWidth = 4;
    if (!loaf) for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-64 + i * 6, -60 - i * 16, 7, 0.2, 1.4); g.stroke(); }
    // body
    const by = loaf ? -24 : pose === 'crouch' ? -26 : -40 * stretch, bh = loaf ? 24 : pose === 'crouch' ? 24 : 34 * stretch;
    const bg = g.createLinearGradient(0, by - bh, 0, by + bh); bg.addColorStop(0, light); bg.addColorStop(1, fur);
    g.fillStyle = bg; g.beginPath(); g.ellipse(0, by, loaf ? 46 : 38, bh, 0, 0, Math.PI * 2); g.fill();
    // stripes
    g.strokeStyle = dark; g.lineWidth = 5;
    for (let i = -2; i <= 1; i++) { g.beginPath(); g.moveTo(i * 13 - 4, by - bh + 4); g.quadraticCurveTo(i * 13 + 4, by - bh * 0.3, i * 13 - 2, by); g.stroke(); }
    // chest
    if (!loaf) { g.fillStyle = chest; g.beginPath(); g.ellipse(18, by + 4, 15, bh * 0.55, 0, 0, Math.PI * 2); g.fill(); }
    // legs
    g.fillStyle = fur;
    if (!loaf) { g.fillRect(-22, -14, 13, 14); g.fillRect(10, -14, 13, 14); g.fillStyle = chest; g.fillRect(-22, -5, 13, 5); g.fillRect(10, -5, 13, 5); }
    // head
    const hy = loaf ? -44 : pose === 'crouch' ? -46 : pose === 'jump' ? -96 : -84, hx = loaf ? 30 : 22;
    g.fillStyle = fur; g.beginPath(); g.arc(hx, hy, 27, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(hx - 22, hy - 10); g.lineTo(hx - 16, hy - 46); g.lineTo(hx - 2, hy - 22); g.fill();
    g.beginPath(); g.moveTo(hx + 4, hy - 22); g.lineTo(hx + 20, hy - 46); g.lineTo(hx + 25, hy - 8); g.fill();
    g.fillStyle = '#ffb3a7'; g.beginPath(); g.moveTo(hx - 17, hy - 16); g.lineTo(hx - 14, hy - 36); g.lineTo(hx - 6, hy - 20); g.fill();
    g.beginPath(); g.moveTo(hx + 8, hy - 20); g.lineTo(hx + 18, hy - 36); g.lineTo(hx + 20, hy - 14); g.fill();
    g.fillStyle = chest; g.beginPath(); g.ellipse(hx + 4, hy + 10, 14, 9, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = dark; g.lineWidth = 4;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(hx + i * 7, hy - 25); g.lineTo(hx + i * 6, hy - 15); g.stroke(); }
    // eyes catch the string lights
    g.fillStyle = '#c8f56a'; g.shadowColor = '#e8ff8a'; g.shadowBlur = 10;
    g.beginPath(); g.ellipse(hx - 9, hy - 2, 6, 7, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(hx + 13, hy - 2, 6, 7, 0, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0; g.fillStyle = '#1a1a1a'; g.fillRect(hx - 10, hy - 7, 3, 10); g.fillRect(hx + 12, hy - 7, 3, 10);
    g.fillStyle = '#ff8fa0'; g.beginPath(); g.moveTo(hx + 1, hy + 5); g.lineTo(hx + 7, hy + 5); g.lineTo(hx + 4, hy + 9); g.fill();
    // whiskers
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(hx + 4 + s * 8, hy + 8 + i * 3); g.lineTo(hx + 4 + s * 30, hy + 4 + i * 7); g.stroke(); }
  });
}
export function cakeSprite(): HTMLCanvasElement {
  return mk('cake', 160, 160, (g) => {
    const tier = (y: number, w: number, h: number) => {
      const gr = g.createLinearGradient(80 - w / 2, 0, 80 + w / 2, 0); gr.addColorStop(0, '#f0dccf'); gr.addColorStop(0.45, '#fffaf3'); gr.addColorStop(1, '#d6bfb1');
      g.fillStyle = gr; g.fillRect(80 - w / 2, y - h, w, h);
      g.fillStyle = '#ff8fb3'; g.fillRect(80 - w / 2, y - h, w, 7);
      for (let x = 80 - w / 2 + 6; x < 80 + w / 2; x += 12) { g.beginPath(); g.arc(x, y - h + 7, 4.5, 0, Math.PI); g.fill(); }
    };
    tier(150, 120, 44); tier(106, 88, 34); tier(72, 58, 28);
    g.fillStyle = '#7ec8ff'; g.fillRect(70, 22, 4, 22); g.fillRect(86, 22, 4, 22);
    g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(72, 18, 3, 6, 0, 0, Math.PI * 2); g.ellipse(88, 18, 3, 6, 0, 0, Math.PI * 2); g.fill();
  });
}

/* ---------------- background (sky + city), cached per camera and size ---------------- */
const bgCache = new Map<string, HTMLCanvasElement>();
const PB = new Projector();
function drawSky(g: CanvasRenderingContext2D, w: number, h: number, P: Projector, look: Look | 'sweep') {
  const cam = P.cam;
  if (look === 'ceiling') {
    // straight down: the street far below
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
    gr.addColorStop(0, '#1b1838'); gr.addColorStop(1, '#090818');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const x = hash(i * 7 + 1) * w, y = hash(i * 7 + 2) * h; g.fillStyle = i % 3 ? 'rgba(255,200,120,0.5)' : 'rgba(255,80,90,0.5)'; g.fillRect(x, y, 1 + hash(i) * 2, 1); }
    return;
  }
  const hor = P.oy + Math.tan(cam.pitch) * P.f;
  const sky = g.createLinearGradient(0, hor - P.f * 1.6, 0, hor);
  sky.addColorStop(0, '#070a24'); sky.addColorStop(0.38, '#1b1d52'); sky.addColorStop(0.62, '#432c6c'); sky.addColorStop(0.82, '#a24f7c'); sky.addColorStop(0.94, '#f08a6c'); sky.addColorStop(1, '#ffc58a');
  g.fillStyle = sky; g.fillRect(0, 0, w, Math.max(0, hor + 2));
  g.fillStyle = '#1a1532'; if (hor < h) g.fillRect(0, hor, w, h - hor);
  // afterglow where the sun went down
  const sun = P.project(cam.x + Math.sin(SUN_YAW) * 1000, cam.y + 20, cam.z + Math.cos(SUN_YAW) * 1000);
  if (sun) {
    const R = P.f * 1.4;
    const sg = g.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, R);
    sg.addColorStop(0, 'rgba(255,214,150,0.75)'); sg.addColorStop(0.25, 'rgba(255,150,110,0.32)'); sg.addColorStop(1, 'rgba(255,120,120,0)');
    g.fillStyle = sg; g.fillRect(sun.x - R, sun.y - R, R * 2, R * 2);
  }
  // stars, fading toward the afterglow
  for (const [yaw, el, b] of STARS) {
    const q = P.project(cam.x + Math.sin(yaw) * Math.cos(el) * 1000, cam.y + Math.sin(el) * 1000, cam.z + Math.cos(yaw) * Math.cos(el) * 1000);
    if (!q || q.x < 0 || q.x > w || q.y < 0 || q.y > hor) continue;
    const toSun = Math.abs(Math.atan2(Math.sin(yaw - SUN_YAW), Math.cos(yaw - SUN_YAW)));
    const a = clamp((el - 0.15) * 2.5, 0, 1) * clamp(toSun / 1.6, 0.1, 1) * (0.35 + b * 0.65);
    g.fillStyle = `rgba(255,248,235,${a})`; g.fillRect(q.x, q.y, b > 0.85 ? 2 : 1.2, b > 0.85 ? 2 : 1.2);
  }
  // clouds lit from below on the sunset side
  for (const [yaw, el, len, th] of CLOUDS) {
    const q = P.project(cam.x + Math.sin(yaw) * 900, cam.y + Math.tan(el) * 900, cam.z + Math.cos(yaw) * 900);
    if (!q) continue;
    const L = P.f * len * 0.35, T = P.f * th * 0.05;
    const warm = 1 - Math.abs(Math.atan2(Math.sin(yaw - SUN_YAW), Math.cos(yaw - SUN_YAW))) / Math.PI;
    for (let i = 0; i < 5; i++) {
      const ox = (hash(i + yaw * 10) - 0.5) * L, oy = (hash(i * 3 + yaw * 7) - 0.5) * T * 1.4, rx = L * (0.3 + 0.25 * hash(i * 5 + yaw)), ry = T * (0.7 + 0.5 * hash(i * 9 + yaw));
      const cg = g.createLinearGradient(0, q.y + oy - ry, 0, q.y + oy + ry);
      cg.addColorStop(0, `rgba(${(60 + 40 * warm) | 0},${(44 + 20 * warm) | 0},${(98 + 10 * warm) | 0},0.55)`);
      cg.addColorStop(1, `rgba(${(200 + 55 * warm) | 0},${(110 + 60 * warm) | 0},${(130 - 20 * warm) | 0},${0.35 + 0.35 * warm})`);
      g.fillStyle = cg; g.beginPath(); g.ellipse(q.x + ox, q.y + oy, rx, ry, 0, 0, Math.PI * 2); g.fill();
    }
  }
}
function drawCity(g: CanvasRenderingContext2D, P: Projector) {
  const cam = P.cam;
  const order = BUILDINGS.slice().sort((a, b) => Math.hypot(b.x - cam.x, b.z - cam.z) - Math.hypot(a.x - cam.x, a.z - cam.z));
  for (const b of order) {
    const f = clamp((b.dist - 22) / 190, 0, 0.82);
    const col = (k: number) => shade([lerp(b.c[0], HAZE[0], f), lerp(b.c[1], HAZE[1], f), lerp(b.c[2], HAZE[2], f)], k);
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, y0 = -90, y1 = b.top;
    const faces: { pts: V3[]; k: number; u: V3; n: number }[] = [];
    if (cam.z < z0) faces.push({ pts: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], k: 0.95, u: [1, 0, 0], n: b.w });
    if (cam.z > z1) faces.push({ pts: [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], k: 0.8, u: [-1, 0, 0], n: b.w });
    if (cam.x < x0) faces.push({ pts: [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], k: 0.7, u: [0, 0, -1], n: b.d });
    if (cam.x > x1) faces.push({ pts: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], k: 0.75, u: [0, 0, 1], n: b.d });
    for (const fc of faces) {
      const sp = fc.pts.map(p => P.project(p[0], p[1], p[2]));
      if (sp.some(q => !q)) continue;
      g.fillStyle = col(fc.k);
      g.beginPath(); g.moveTo(sp[0]!.x, sp[0]!.y); for (let i = 1; i < 4; i++) g.lineTo(sp[i]!.x, sp[i]!.y); g.closePath(); g.fill();
      // windows
      const p0 = fc.pts[0];
      const cols = Math.max(2, Math.floor(fc.n / 2.6)), rows = Math.min(16, Math.floor((b.top + 30) / 3.3));
      const cw = fc.n / cols;
      const wa = 0.85 * (1 - f * 0.65);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const hv = hash(b.seed + r * 131 + c * 7919 + fc.k * 1000);
        if (hv > b.lit) continue;
        const along = (c + 0.28) * cw, y = b.top - (r + 0.45) * 3.3;
        const a = P.project(p0[0] + fc.u[0] * along, y, p0[2] + fc.u[2] * along);
        const e = P.project(p0[0] + fc.u[0] * (along + cw * 0.44), y - 1.4, p0[2] + fc.u[2] * (along + cw * 0.44));
        if (!a || !e) continue;
        const warm = hash(b.seed + r * 17 + c);
        g.fillStyle = warm < 0.75 ? `rgba(255,${(200 + warm * 40) | 0},${(130 + warm * 50) | 0},${wa})` : `rgba(170,215,255,${wa * 0.8})`;
        g.fillRect(Math.min(a.x, e.x), Math.min(a.y, e.y), Math.max(1, Math.abs(e.x - a.x)), Math.max(1, Math.abs(e.y - a.y)));
      }
    }
    // a warm rim on the roofline facing the afterglow
    const r0 = P.project(x0, y1, z0), r1 = P.project(x1, y1, z0);
    if (r0 && r1 && cam.z < z0) { g.strokeStyle = `rgba(255,170,130,${0.25 * (1 - f)})`; g.lineWidth = 1; g.beginPath(); g.moveTo(r0.x, r0.y); g.lineTo(r1.x, r1.y); g.stroke(); }
  }
}
function background(look: Look | 'sweep', cam: Cam, w: number, h: number): HTMLCanvasElement {
  const key = look + ':' + w + 'x' + h + (look === 'sweep' ? ':' + cam.x.toFixed(2) + cam.y.toFixed(2) + cam.z.toFixed(2) : '');
  let c = bgCache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  PB.set(cam, w, h);
  drawSky(g, w, h, PB, look);
  if (look !== 'ceiling') drawCity(g, PB);
  if (look !== 'sweep') { if (bgCache.size > 24) bgCache.clear(); bgCache.set(key, c); }
  return c;
}

/* ---------------- rendering ---------------- */
export interface RenderOpts {
  look: Look | 'sweep';
  faces: Faces;
  hideCast?: boolean;           // finale group photo uses its own staging
  debugHide?: string[];         // occlusion tests: render without e.g. the cat
  focal?: number; ox?: number; oy?: number;   // magnifier: same camera, longer focal length, shifted centre
  bg?: (g: CanvasRenderingContext2D) => void; // draw the background yourself (the magnifier samples the main plate)
}

const L = new DrawList();
const P = new Projector();
export function projector() { return P; }

/** Sky + city for a camera: cached plates for fixed rigs; the handheld phone shifts its plate by the sway. */
export function drawBackground(g: CanvasRenderingContext2D, w: number, h: number, look: Look | 'sweep', cam: Cam) {
  if (look === 'phone') {
    const base = lookAt(RIGS.phone.from, RIGS.phone.to, RIGS.phone.fov);
    const plate = background('phone', base, w, h);
    PB.set(base, w, h);
    const dyaw = cam.yaw - base.yaw, dp = cam.pitch - base.pitch;
    g.save(); g.translate(w / 2, h / 2); g.rotate(cam.roll || 0); g.translate(-w / 2 - dyaw * PB.f, -h / 2 + dp * PB.f);
    g.drawImage(plate, -12, -12, w + 24, h + 24); g.restore();
  } else if (look === 'sweep') {
    PB.set(cam, w, h); drawSky(g, w, h, PB, 'sweep'); drawCity(g, PB);
  } else {
    g.drawImage(background(look, cam, w, h), 0, 0);
  }
}

export function renderWorld(g: CanvasRenderingContext2D, w: number, h: number, cam: Cam, s: WorldState, o: RenderOpts) {
  P.set(cam, w, h, o.focal, o.ox, o.oy);
  const t = s.t;
  if (o.bg) o.bg(g); else drawBackground(g, w, h, o.look, cam);
  // aircraft beacons blink on the tallest towers
  if (o.look !== 'ceiling' && Math.floor(t * 1.2) % 2 === 0) for (const b of BUILDINGS) if (b.beacon) {
    const q = P.project(b.x, b.top + 0.6, b.z);
    if (q) { g.globalCompositeOperation = 'lighter'; const r = Math.max(4, q.s * 3); g.drawImage(glowSprite('rgba(255,60,60,1)'), q.x - r, q.y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over'; }
  }
  // rooftop deck: planks with a little colour variation
  for (let i = 0; i < 20; i++) {
    const x0 = -5 + i * 0.45, x1 = x0 + 0.45, v = 0.86 + 0.12 * hash(i * 13 + 5);
    poly(P, L, [[x0, 0, -1.2], [x1, 0, -1.2], [x1, 0, 6], [x0, 0, 6]], shade([98, 66, 54], v, [255, 160, 120], 0.05), undefined, 60);
  }
  L.flush(g);
  // floor decals in true perspective: rug, warm light pools, the table's soft shadow
  const RUG: V3 = [0, 0.002, 2.2];
  fillDisc(g, RUG, 1.55, 0, '#3e5e6b');
  fillDisc(g, RUG, 0.93, 0.87, '#e9c46a');
  fillDisc(g, RUG, 0.76, 0.68, '#e76f51');
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; fillDisc(g, [Math.cos(a) * 0.815, 0.003, 2.2 + Math.sin(a) * 0.815], 0.04, 0, '#f4e3c3', 8); }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; fillDisc(g, [Math.cos(a) * 1.3, 0.003, 2.2 + Math.sin(a) * 1.3], 0.06, 0, i % 2 ? '#2f4a55' : '#4f7380', 8); }
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const c of POOLS) {
    const d = Math.hypot(c[0] - cam.x, c[1] - cam.y, c[2] - cam.z);
    if (d > 4.2) floorDecal(P, null, c, 1.6, (gg) => { const gr = gg.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(255,184,118,0.24)'); gr.addColorStop(1, 'rgba(255,170,110,0)'); gg.fillStyle = gr; gg.beginPath(); gg.arc(0, 0, 1, 0, Math.PI * 2); gg.fill(); }, 0, g);
    else for (let k = 0; k < 10; k++) fillDisc(g, c, 1.6 * (1 - k / 10.5), 0, 'rgba(255,184,118,0.026)', 24);
  }
  g.restore();
  for (let k = 0; k < 5; k++) fillDisc(g, [0, 0.004, 2.2], 1.25 * (1 - k / 6), 0, 'rgba(10,6,20,0.11)', 24, 1, 0.66);
  // parapet walls with a warm cap
  const wall: [number, number, number] = [66, 56, 80];
  box(P, L, [-0.5, 0, -1.25], [9, 0.55, 0.12], wall); box(P, L, [-0.5, 0, 6.05], [9, 0.55, 0.12], wall);
  box(P, L, [-5.05, 0, 2.4], [0.12, 0.55, 7.3], wall); box(P, L, [4.05, 0, 2.4], [0.12, 0.55, 7.3], wall);
  // DJ booth at the back: deck, glowing panel, speakers
  box(P, L, [0.9, 0, 5.45], [1.5, 0.92, 0.55], [34, 30, 46]);
  poly(P, L, [[0.17, 0.2, 5.17], [1.63, 0.2, 5.17], [1.63, 0.32, 5.17], [0.17, 0.32, 5.17]], (gg, sp) => { const gr = gg.createLinearGradient(sp[0].x, 0, sp[1].x, 0); const hue = (t * 60) % 360; gr.addColorStop(0, `hsl(${hue},90%,62%)`); gr.addColorStop(0.5, `hsl(${(hue + 120) % 360},90%,62%)`); gr.addColorStop(1, `hsl(${(hue + 240) % 360},90%,62%)`); return gr; }, undefined, -0.02);
  box(P, L, [-0.2, 0, 5.5], [0.5, 1.3, 0.45], [26, 24, 34]); box(P, L, [2.0, 0, 5.5], [0.5, 1.3, 0.45], [26, 24, 34]);
  for (const sx of [-0.2, 2.0]) for (const sy of [0.4, 0.95]) { const q = P.project(sx, sy, 5.27); if (q) { const r = q.s * 0.15; L.add(q.d - 0.03, (gg) => { gg.fillStyle = '#0d0c14'; gg.beginPath(); gg.arc(q.x, q.y, r, 0, Math.PI * 2); gg.fill(); gg.strokeStyle = 'rgba(160,140,255,0.5)'; gg.lineWidth = Math.max(1, r * 0.12); gg.stroke(); }); } }
  // light poles, string lights and bunting
  for (const p of LIGHT_POLES) box(P, L, [p[0], 0, p[2]], [0.06, p[1], 0.06], [40, 36, 44]);
  STRINGS.forEach((str, si) => {
    for (let i = 0; i < str.length - 1; i++) {
      const a = P.project(str[i][0], str[i][1], str[i][2]), b = P.project(str[i + 1][0], str[i + 1][1], str[i + 1][2]);
      if (!a || !b) continue;
      L.add((a.d + b.d) / 2, (gg) => { gg.strokeStyle = 'rgba(20,16,20,0.8)'; gg.lineWidth = Math.max(0.6, a.s * 0.012); gg.beginPath(); gg.moveTo(a.x, a.y); gg.lineTo(b.x, b.y); gg.stroke(); });
      const tw = 0.8 + 0.2 * Math.sin(t * 3 + i * 1.7 + si);
      const col = BULB_COLORS[(i + si) % BULB_COLORS.length];
      sprite(P, L, null, [str[i][0], str[i][1] - 0.05, str[i][2]], 0.55 * tw, { ay: 0.5, draw: (gg, size) => { gg.globalCompositeOperation = 'lighter'; gg.drawImage(glowSprite(col), -size / 2, -size / 2, size, size); gg.fillStyle = '#fff6e0'; gg.beginPath(); gg.arc(0, 0, Math.max(0.8, size * 0.06), 0, Math.PI * 2); gg.fill(); } });
    }
  });
  for (const str of [BUNTING, BUNTING2]) for (let i = 0; i < str.length - 1; i++) {
    const a = str[i], b = str[i + 1], m: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.26, (a[2] + b[2]) / 2];
    const sway = Math.sin(t * 2 + i) * 0.03;
    poly(P, L, [a, b, [m[0] + sway, m[1], m[2] + sway]], FLAG_COLS[i % FLAG_COLS.length]);
  }
  // table: cloth to the floor, a runner, a scalloped hem
  const wob = s.wobble;
  const cloth: [number, number, number] = [246, 236, 232];
  const tx0 = -0.9 + wob, tx1 = 0.9 + wob, tz0 = 1.7, tz1 = 2.7, ty = 0.76;
  poly(P, L, [[tx0, ty, tz0], [tx1, ty, tz0], [tx1, ty, tz1], [tx0, ty, tz1]], shade(cloth, 1.06, [255, 190, 150], 0.1));
  const sideFill = (k: number) => (gg: CanvasRenderingContext2D, sp: { x: number; y: number }[]) => { const top = Math.min(...sp.map(p => p.y)), bot = Math.max(...sp.map(p => p.y)); const gr = gg.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, shade(cloth, k, [255, 180, 140], 0.1)); gr.addColorStop(1, shade(cloth, k * 0.72, [120, 80, 140], 0.2)); return gr; };
  if (cam.z < tz0) poly(P, L, [[tx0, 0.01, tz0], [tx1, 0.01, tz0], [tx1, ty, tz0], [tx0, ty, tz0]], sideFill(0.9));
  if (cam.z > tz1) poly(P, L, [[tx0, 0.01, tz1], [tx1, 0.01, tz1], [tx1, ty, tz1], [tx0, ty, tz1]], sideFill(0.82));
  if (cam.x < tx0) poly(P, L, [[tx0, 0.01, tz0], [tx0, 0.01, tz1], [tx0, ty, tz1], [tx0, ty, tz0]], sideFill(0.76));
  if (cam.x > tx1) poly(P, L, [[tx1, 0.01, tz0], [tx1, 0.01, tz1], [tx1, ty, tz1], [tx1, ty, tz0]], sideFill(0.8));
  poly(P, L, [[tx0, ty + 0.002, 2.08], [tx1, ty + 0.002, 2.08], [tx1, ty + 0.002, 2.32], [tx0, ty + 0.002, 2.32]], '#ff8fb3', undefined, -0.01);
  if (cam.z < tz0) poly(P, L, [[tx0, 0.62, tz0 - 0.002], [tx1, 0.62, tz0 - 0.002], [tx1, 0.7, tz0 - 0.002], [tx0, 0.7, tz0 - 0.002]], '#ff8fb3', undefined, -0.01);
  // the stool (the cat's perch) — no back, so the booth can see who sits on it
  cylinder(P, L, [STOOL[0], 0, STOOL[2]], 0.035, 0.42, [70, 46, 40], 1, undefined, 8);
  cylinder(P, L, [STOOL[0], 0.42, STOOL[2]], 0.2, 0.04, [150, 96, 70], 1, [176, 116, 84], 16);
  // gifts: a stack at the back-left, a tall one in the middle (it blocks the phone's view of the stool), a small one
  const gift = (c: V3, sz: V3, rgb: [number, number, number], ribbon: string) => {
    box(P, L, c, sz, rgb, 1, [255, 170, 130], 0.1);
    const q = P.project(c[0], c[1] + sz[1] + 0.05, c[2]);
    if (q) L.add(q.d - 0.2, (gg) => { const r = q.s * 0.06; gg.fillStyle = ribbon; gg.beginPath(); gg.ellipse(q.x - r, q.y, r, r * 0.6, -0.4, 0, Math.PI * 2); gg.ellipse(q.x + r, q.y, r, r * 0.6, 0.4, 0, Math.PI * 2); gg.fill(); });
  };
  gift([-0.26 + wob, ty, 2.56], [0.3, 0.26, 0.24], [110, 196, 214], '#ffd166');
  gift([-0.24 + wob, ty + 0.26, 2.56], [0.22, 0.18, 0.18], [240, 178, 92], '#ff6f91');
  gift([0.08 + wob, ty, 2.42], [0.34, 0.52, 0.3], [167, 139, 250], '#fff4e6');
  gift([0.62 + wob, ty, 2.45], [0.24, 0.15, 0.24], [255, 111, 145], '#ffd166');
  gift([0.54 + wob, ty, 1.95], [0.28, 0.3, 0.3], [126, 214, 160], '#ff6f91');
  // cake: three tiers with candles; then a tumbling sprite; then a splat
  if (s.cakeOn) {
    const [cx, cy, cz] = s.cake;
    const tilt = s.cakeTilt;
    const tiers: [number, number, number][] = [[0.28, 0.17, 0], [0.21, 0.14, 0.17], [0.14, 0.12, 0.31]];
    for (const [r, hh, y0] of tiers) {
      const x = cx + wob - tilt * (y0 + 0.05);
      cylinder(P, L, [x, cy + y0, cz], r, hh - 0.035, [255, 246, 238], 1.08, undefined, 22, [255, 200, 170], 0.06);
      cylinder(P, L, [x, cy + y0 + hh - 0.035, cz], r + 0.006, 0.035, [255, 150, 190], 1.05, [255, 190, 214], 22);
    }
    for (const dx of [-0.05, 0.05]) {
      const base: V3 = [cx + wob + dx - tilt * 0.45, cy + 0.43, cz];
      cylinder(P, L, base, 0.01, 0.07, [126, 200, 255], 1, undefined, 6);
      const fl = 0.9 + 0.1 * Math.sin(t * 23 + dx * 40);
      sprite(P, L, null, [base[0], base[1] + 0.1, base[2]], 0.16 * fl, { ay: 0.5, draw: (gg, size) => { gg.globalCompositeOperation = 'lighter'; gg.drawImage(glowSprite('rgba(255,190,90,1)'), -size / 2, -size / 2, size, size); gg.fillStyle = '#fff2b0'; gg.beginPath(); gg.ellipse(0, 0, size * 0.06, size * 0.13, 0, 0, Math.PI * 2); gg.fill(); } });
    }
  } else if (!s.splat) {
    sprite(P, L, cakeSprite(), [s.cake[0], s.cake[1] + 0.25, s.cake[2]], 0.6, { ay: 0.5, rot: s.cakeRot });
  }
  if (s.splat) {
    const k = clamp((t - 4.82) * 6, 0, 1);
    floorDecal(P, L, s.splatAt, 0.42 * k + 0.001, (gg) => {
      gg.fillStyle = '#fff4ec'; gg.beginPath();
      for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2, r = 0.8 + 0.2 * Math.sin(i * 2.7) + (i % 3 === 0 ? 0.25 : 0); if (i) gg.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.85); else gg.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.85); }
      gg.fill();
      gg.fillStyle = '#ff9cbf'; gg.beginPath(); gg.arc(0.05, 0, 0.42, 0, Math.PI * 2); gg.fill();
      gg.fillStyle = '#f2dccf'; for (let i = 0; i < 7; i++) { gg.beginPath(); gg.arc(Math.cos(i * 2.1) * 1.15, Math.sin(i * 2.1) * 1.0, 0.08, 0, Math.PI * 2); gg.fill(); }
    }, 0.05);
    if (t < 5.6) for (let i = 0; i < 12; i++) {
      const a = i * 2.4, u = (t - 4.82) * 1.6, x = s.splatAt[0] + Math.cos(a) * u * (0.4 + (i % 3) * 0.2), z = s.splatAt[2] + Math.sin(a) * u * 0.5, y = Math.max(0.02, 0.6 * u - 2.4 * u * u + 0.05);
      sprite(P, L, null, [x, y, z], 0.05, { ay: 0.5, draw: (gg, size) => { gg.fillStyle = i % 2 ? '#fff' : '#ff9cbf'; gg.beginPath(); gg.arc(0, 0, size / 2, 0, Math.PI * 2); gg.fill(); } });
    }
  }
  // balloons + their ribbon across the floor
  const weight: V3 = [-1.65, 0, 1.0];
  box(P, L, [weight[0], 0, weight[2]], [0.12, 0.08, 0.12], [80, 70, 90]);
  const bal: [V3, string][] = [[[-1.75 + s.tug * 0.3, 1.9, 0.95], '#ff5d8f'], [[-1.5 + s.tug * 0.4, 2.05, 1.08], '#ffd166'], [[-1.6 + s.tug * 0.35, 2.25, 0.86], '#5ec8ff']];
  for (const [p, col] of bal) {
    const bob = Math.sin(t * 1.3 + p[0] * 5) * 0.03;
    const a = P.project(weight[0], 0.08, weight[2]), b = P.project(p[0], p[1] - 0.18 + bob, p[2]);
    if (a && b) L.add((a.d + b.d) / 2 + 0.01, (gg) => { gg.strokeStyle = 'rgba(240,240,250,0.6)'; gg.lineWidth = 1; gg.beginPath(); gg.moveTo(a.x, a.y); gg.quadraticCurveTo((a.x + b.x) / 2 + 6, (a.y + b.y) / 2, b.x, b.y); gg.stroke(); });
    sprite(P, L, null, [p[0], p[1] + bob, p[2]], 0.38, { ay: 0.5, draw: (gg, size) => { const gr = gg.createRadialGradient(-size * 0.15, -size * 0.18, size * 0.04, 0, 0, size * 0.5); gr.addColorStop(0, '#fff'); gr.addColorStop(0.22, col); gr.addColorStop(1, shadeHex(col, 0.5)); gg.fillStyle = gr; gg.beginPath(); gg.ellipse(0, 0, size * 0.42, size * 0.5, 0, 0, Math.PI * 2); gg.fill(); gg.fillStyle = shadeHex(col, 0.6); gg.beginPath(); gg.moveTo(-size * 0.05, size * 0.5); gg.lineTo(size * 0.05, size * 0.5); gg.lineTo(0, size * 0.44); gg.fill(); } });
  }
  const rib: V3[] = [[weight[0], 0.01, weight[2]], [-1.42, 0.01 + s.tug * 0.12, 1.42], [-0.95, 0.01, 1.68]];
  for (let i = 0; i < rib.length - 1; i++) {
    const a = P.project(rib[i][0], rib[i][1], rib[i][2]), b = P.project(rib[i + 1][0], rib[i + 1][1], rib[i + 1][2]);
    if (a && b) L.add((a.d + b.d) / 2 + 0.02, (gg) => { gg.strokeStyle = '#ffd166'; gg.lineWidth = Math.max(1.2, a.s * 0.014); gg.beginPath(); gg.moveTo(a.x, a.y); gg.lineTo(b.x, b.y); gg.stroke(); });
  }
  if (!o.hideCast) drawCast(s, o.faces, t, o.debugHide || []);
  L.flush(g);
}

/** The Bubbles and the cat. Bubble art is circular and never cropped; each gets a contact shadow and a soft rim glow. */
function drawCast(s: WorldState, faces: Faces, t: number, hide: string[]) {
  const actor = (slug: string, pos: V3, mood: string, hgt = 0.62, rot = 0, extra?: (gg: CanvasRenderingContext2D, size: number) => void, lean = 0, bob = 0, squash = 0) => {
    const sh = P.project(pos[0], 0.004, pos[2]);
    if (sh) L.add(sh.d + 0.3, (gg) => { gg.fillStyle = 'rgba(8,4,16,0.42)'; gg.beginPath(); gg.ellipse(sh.x, sh.y, hgt * sh.s * 0.34 * (1 - bob * 2), hgt * sh.s * 0.08, 0, 0, Math.PI * 2); gg.fill(); });
    const img = faces(slug, mood);
    sprite(P, L, img, [pos[0] + lean, pos[1] + 0.02 + bob, pos[2]], hgt, {
      ay: 1, rot, draw: (gg, size) => {
        gg.save(); gg.globalCompositeOperation = 'lighter'; gg.globalAlpha *= 0.32;
        gg.drawImage(glowSprite(BUBBLE_GLOW[slug] || 'rgba(255,255,255,1)'), -size * 0.75, -size * 1.25, size * 1.5, size * 1.5); gg.restore();
        const sx = 1 + squash, sy = 1 - squash;
        if (img) gg.drawImage(img, -size / 2 * sx, -size * sy, size * sx, size * sy);
        else { gg.fillStyle = '#7aa7ff'; gg.beginPath(); gg.arc(0, -size / 2, size * 0.45, 0, Math.PI * 2); gg.fill(); }
        if (extra) extra(gg, size);
      }
    });
  };
  const sq = s.rushBob > 0 ? Math.cos(t * 18) * 0.04 : 0;
  actor('rush', s.rush, s.mood.rush, 0.64, s.rushRot, (gg, size) => {
    if (s.spill < 0.02) { gg.fillStyle = '#c9b8a6'; gg.fillRect(size * 0.18, -size * 0.52, size * 0.42, size * 0.05); for (let i = 0; i < 3; i++) { gg.fillStyle = ['#ff7a59', '#7ce0ff', '#ffd166'][i]; gg.fillRect(size * (0.22 + i * 0.12), -size * 0.66, size * 0.08, size * 0.14); } }
    if (s.iced) { gg.fillStyle = '#fff6ee'; gg.beginPath(); gg.arc(-size * 0.28, -size * 0.32, size * 0.09, 0, Math.PI * 2); gg.arc(size * 0.3, -size * 0.3, size * 0.08, 0, Math.PI * 2); gg.fill(); gg.fillStyle = '#ff9cbf'; gg.beginPath(); gg.arc(-size * 0.26, -size * 0.3, size * 0.035, 0, Math.PI * 2); gg.arc(size * 0.31, -size * 0.29, size * 0.03, 0, Math.PI * 2); gg.fill(); }
  }, s.rushLean, s.rushBob, sq);
  if (s.spill > 0 && s.spill < 1) for (let i = 0; i < 3; i++) {
    const k = s.spill, x = s.rush[0] + 0.25 + i * 0.12 + k * (0.3 + i * 0.15), z = s.rush[2] + 0.1 * i + k * 0.2, y = Math.max(0.05, 0.62 + 1.2 * k - 2.3 * k * k);
    sprite(P, L, null, [x, y, z], 0.08, { ay: 0.5, rot: k * 6 + i, draw: (gg, size) => { gg.fillStyle = ['#ff7a59', '#7ce0ff', '#ffd166'][i]; gg.fillRect(-size / 3, -size / 2, size * 0.66, size); } });
  }
  actor('patch', s.patch, s.mood.patch, 0.62);
  actor('glitch', s.glitchPos, s.mood.glitch, 0.62, 0, (gg, size) => {
    gg.fillStyle = '#20232e'; gg.fillRect(-size * 0.52, -size * 0.62, size * 0.16, size * 0.26);
    if (s.flash > 0) { gg.globalCompositeOperation = 'lighter'; const r = size * (0.6 + s.flash * 1.4); gg.drawImage(glowSprite('rgba(255,255,255,1)'), -size * 0.44 - r / 2, -size * 0.5 - r / 2, r, r); }
  });
  actor('sync', s.syncPos, s.mood.sync, 0.58);
  actor('loopie', s.loopiePos, s.mood.loopie, 0.56);
  // the cat (and, while pawing, a paw that really reaches the cake)
  if (hide.includes('cat')) return;
  const shc = P.project(s.cat[0], s.cat[1] < 0.2 ? 0.006 : 0.463, s.cat[2]);
  if (shc) L.add(shc.d + 0.2, (gg) => { gg.fillStyle = 'rgba(0,0,0,0.3)'; gg.beginPath(); gg.ellipse(shc.x, shc.y, 0.16 * shc.s, 0.04 * shc.s, 0, 0, Math.PI * 2); gg.fill(); });
  sprite(P, L, catSprite(s.catPose), [s.cat[0], s.cat[1] + s.catHop, s.cat[2]], 0.46, { ay: 0.96 });
  if (s.pawK > 0) {
    const a = P.project(-0.68, 0.8, 2.8), b = P.project(lerp(-0.68, -0.84, s.pawK), lerp(0.8, 0.92, s.pawK), lerp(2.8, 2.42, s.pawK));
    if (a && b) L.add(Math.min(a.d, b.d) - 0.01, (gg) => { const wdt = Math.max(2, a.s * 0.05); gg.strokeStyle = '#e58a3a'; gg.lineCap = 'round'; gg.lineWidth = wdt; gg.beginPath(); gg.moveTo(a.x, a.y); gg.lineTo(b.x, b.y); gg.stroke(); gg.fillStyle = '#fff3e3'; gg.beginPath(); gg.arc(b.x, b.y, wdt * 0.75, 0, Math.PI * 2); gg.fill(); });
  }
}

/** A disc (or ring, when `inner` > 0) lying on the floor, projected point by point so it stays correct up close. */
function fillDisc(g: CanvasRenderingContext2D, c: V3, r: number, inner: number, fill: string, n = 40, sx = 1, sz = 1) {
  const ring = (rr: number) => { const out: { x: number; y: number }[] = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const q = P.project(c[0] + Math.cos(a) * rr * sx, c[1], c[2] + Math.sin(a) * rr * sz); if (!q) return null; out.push(q); } return out; };
  const o = ring(r); if (!o) return;
  g.beginPath(); g.moveTo(o[0].x, o[0].y); for (let i = 1; i < o.length; i++) g.lineTo(o[i].x, o[i].y); g.closePath();
  if (inner > 0) { const q = ring(inner); if (q) { g.moveTo(q[0].x, q[0].y); for (let i = q.length - 1; i > 0; i--) g.lineTo(q[i].x, q[i].y); g.closePath(); } }
  g.fillStyle = fill; g.fill('evenodd');
}

function shadeHex(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${((n >> 16) & 255) * k | 0},${((n >> 8) & 255) * k | 0},${(n & 255) * k | 0})`;
}

/** Per-camera "lens": colour grade, vignette, grain, flash whiteout and the camera HUD. */
export function lens(g: CanvasRenderingContext2D, w: number, h: number, cam: Look | 'sweep', s: WorldState, hud: boolean) {
  const t = s.t;
  g.save();
  if (cam === 'door') { g.fillStyle = 'rgba(255,150,80,0.07)'; g.fillRect(0, 0, w, h); }
  if (cam === 'balcony') { g.fillStyle = 'rgba(70,130,255,0.1)'; g.fillRect(0, 0, w, h); }
  if (cam === 'booth') {
    const hue = (t * 40) % 360;
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `hsla(${hue},90%,55%,0.06)`; g.fillRect(0, 0, w, h);
    g.drawImage(glowSprite('rgba(255,80,200,1)'), w * 0.65, -h * 0.2, w * 0.7, w * 0.7);
    g.drawImage(glowSprite('rgba(80,160,255,1)'), -w * 0.3, h * 0.1, w * 0.6, w * 0.6);
    g.globalCompositeOperation = 'source-over';
  }
  if (cam === 'phone' && s.flash > 0) { g.fillStyle = `rgba(255,255,255,${0.95 * s.flash})`; g.fillRect(0, 0, w, h); }
  else if (s.flash > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,255,255,${0.18 * s.flash})`; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, cam === 'phone' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.5)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  const gt = grainTile(); g.globalAlpha = cam === 'phone' ? 0.85 : 0.5;
  const ox = (t * 977) % 128, oy = (t * 613) % 128;
  for (let y = -oy; y < h; y += 128) for (let x = -ox; x < w; x += 128) g.drawImage(gt, x, y);
  g.globalAlpha = 1;
  if (hud) {
    const fs = Math.max(11, Math.min(15, w * 0.032));
    g.font = `600 ${fs}px ui-monospace, Menlo, monospace`; g.textBaseline = 'top';
    g.fillStyle = 'rgba(255,255,255,0.9)';
    const tc = '00:00:0' + Math.floor(t) + ':' + String(Math.floor((t % 1) * 24)).padStart(2, '0');
    g.fillText(tc, 12, 12);
    if (Math.floor(t * 2) % 2 === 0 || cam !== 'phone') { g.fillStyle = '#ff4d5e'; g.beginPath(); g.arc(w - 18, 12 + fs / 2, 5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'right'; g.fillText('REC', w - 28, 12); g.textAlign = 'left';
  }
  g.restore();
}

/** A magnified, deterministic close-up of what a camera saw around a world point at time t (polaroids, the reveal).
 * The nominal feed is 400×460; `span` is the size of the region of that feed shown in the close-up. */
const PC = new Projector();
export function closeup(g: CanvasRenderingContext2D, S: number, look: Look, t: number, at: V3, faces: Faces, span = 150) {
  const W0 = 400, H0 = 460;
  const cam = rigCam(look, t);
  PC.set(cam, W0, H0);
  const q = PC.project(at[0], at[1], at[2]);
  const qx = q ? Math.max(span / 2, Math.min(W0 - span / 2, q.x)) : W0 / 2, qy = q ? Math.max(span / 2, Math.min(H0 - span / 2, q.y)) : H0 / 2;
  const m = S / span;
  g.save();
  g.setTransform(m, 0, 0, m, S / 2 - m * qx, S / 2 - m * qy);
  drawBackground(g, W0, H0, look, cam);
  g.restore();
  const s = stateAt(t);
  renderWorld(g, S, S, cam, s, { look, faces, focal: PC.f * m, ox: (W0 / 2 - qx) * m + S / 2, oy: (H0 / 2 - qy) * m + S / 2, bg: () => {} });
  // a little lens character: vignette + grade per camera
  const vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg; g.fillRect(0, 0, S, S);
  if (look === 'door') { g.fillStyle = 'rgba(255,150,80,0.08)'; g.fillRect(0, 0, S, S); }
  if (look === 'balcony') { g.fillStyle = 'rgba(70,130,255,0.1)'; g.fillRect(0, 0, S, S); }
  if (look === 'phone' && s.flash > 0) { g.fillStyle = `rgba(255,255,255,${0.9 * s.flash})`; g.fillRect(0, 0, S, S); }
}

/** Extra actors posed in the world after renderWorld (finale group photo). Uses the projector state of the last
 * renderWorld call, so call it right after rendering the same camera. 'cat' draws the cat. */
export function drawPose(g: CanvasRenderingContext2D, actors: { slug: string; mood: string; pos: V3; hgt?: number; bob?: number }[], faces: Faces) {
  const items = actors.map(a => ({ a, q: P.project(a.pos[0], a.pos[1], a.pos[2]) })).filter(x => x.q).sort((x, y) => y.q!.d - x.q!.d);
  for (const { a } of items) {
    const hgt = a.hgt || 0.62;
    const sh = P.project(a.pos[0], 0.004, a.pos[2]);
    if (sh && a.pos[1] < 0.1) { g.fillStyle = 'rgba(8,4,16,0.42)'; g.beginPath(); g.ellipse(sh.x, sh.y, hgt * sh.s * 0.34, hgt * sh.s * 0.08, 0, 0, Math.PI * 2); g.fill(); }
    const q = P.project(a.pos[0], a.pos[1] + (a.bob || 0), a.pos[2])!;
    if (!q) continue;
    const size = hgt * q.s;
    if (a.slug === 'cat') { g.drawImage(catSprite('sit'), q.x - size / 2, q.y - size * 0.96, size, size); continue; }
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35;
    g.drawImage(glowSprite(BUBBLE_GLOW[a.slug] || 'rgba(255,255,255,1)'), q.x - size * 0.75, q.y - size * 1.25, size * 1.5, size * 1.5); g.restore();
    const img = faces(a.slug, a.mood);
    if (img) g.drawImage(img, q.x - size / 2, q.y - size, size, size);
  }
}
/** Project a world point with the projector state of the last renderWorld call. */
export function projectLast(x: number, y: number, z: number) { return P.project(x, y, z); }
