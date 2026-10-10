/* Emotional Rollercoaster — the 3D park and the ride. Every rider's track is real geometry in its own lane; the camera
 * rides behind your cart through drops, loops, corkscrews and tunnels while the other riders' carts rise and fall on
 * the parallel tracks beside you. Sky and ground are split along the true horizon, so loops turn the world over. */
import { Projector, DrawList, Cam, V3, glowSprite, grainTile } from '../../gfx/projector';
import { Track, atTime, atS, speedAt, SEG_L, X0, X_END } from './track';
import { Moment, N_SEG, T_PRE, T_SEG } from './content';

export type Faces = (slug: string, mood: string) => CanvasImageSource | null;
export interface Rider { pid: string; avatar: string; name: string; human: boolean; track: Track; color: string; }
export const LANE = 7;
export const RIDER_COLORS = ['#ffd27a', '#7fd8ff', '#ff8fb3', '#a6f0a0'];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hash = (n: number) => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };

export function segAt(t: number) { return t < T_PRE ? -1 : Math.min(N_SEG, Math.floor((t - T_PRE) / T_SEG)); }
export const laneZ = (k: number, n: number) => (k - (n - 1) / 2) * LANE;

/** Where a rider's cart is at ride time t, given whose track they ride for each segment. */
export function cartAt(riders: Rider[], idx: number, t: number, assign: (pid: string, seg: number) => string) {
  const n = riders.length, me = riders[idx];
  const seg = segAt(t);
  const ownerOf = (sg: number) => (sg < 0 || sg >= N_SEG ? me.pid : assign(me.pid, sg));
  const owner = ownerOf(seg);
  const oi = Math.max(0, riders.findIndex(r => r.pid === owner));
  const tr = riders[oi].track;
  let smp = atTime(tr, t);
  const visiting = owner !== me.pid;
  if (visiting) smp = atS(tr, smp.s - 2.6);
  let z = laneZ(oi, n), hop = 0;
  // hop between lanes around each junction
  const tj = seg >= 0 && seg < N_SEG ? T_PRE + seg * T_SEG : -99;
  if (seg >= 1 && t - tj < 0.45) {
    const prev = Math.max(0, riders.findIndex(r => r.pid === ownerOf(seg - 1)));
    if (prev !== oi) { const k = (t - tj) / 0.45; z = laneZ(prev, n) + (laneZ(oi, n) - laneZ(prev, n)) * k; hop = Math.sin(k * Math.PI) * 2.2; }
  }
  return { smp, z, hop, visiting, owner, tr };
}

/* ---------------- procedural art ---------------- */
const cache = new Map<string, HTMLCanvasElement>();
function mk(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) { let c = cache.get(key); if (c) return c; c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); cache.set(key, c); return c; }
export function momentIcon(icon: string, size = 96): HTMLCanvasElement {
  return mk('icon-' + icon + size, size, size, (g) => {
    const s = size;
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (icon === 'alarm') {
      g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(s * 0.5, s * 0.55, s * 0.32, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff6ea'; g.beginPath(); g.arc(s * 0.5, s * 0.55, s * 0.25, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(s * 0.26, s * 0.24, s * 0.1, 0, Math.PI * 2); g.arc(s * 0.74, s * 0.24, s * 0.1, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2b2540'; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(s * 0.5, s * 0.55); g.lineTo(s * 0.5, s * 0.38); g.moveTo(s * 0.5, s * 0.55); g.lineTo(s * 0.63, s * 0.62); g.stroke();
      g.strokeStyle = '#2b2540'; g.lineWidth = s * 0.04; g.beginPath(); g.moveTo(s * 0.2, s * 0.92); g.lineTo(s * 0.8, s * 0.12); g.stroke();
    } else if (icon === 'brunch') {
      g.fillStyle = '#fff6ea'; g.beginPath(); g.ellipse(s * 0.5, s * 0.6, s * 0.4, s * 0.16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd166'; g.beginPath(); g.arc(s * 0.42, s * 0.55, s * 0.12, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * 0.42, s * 0.55, s * 0.2, s * 0.09, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffb703'; g.beginPath(); g.arc(s * 0.42, s * 0.55, s * 0.06, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c96a3a'; g.fillRect(s * 0.58, s * 0.48, s * 0.18, s * 0.1);
      g.strokeStyle = '#ff4d5e'; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(s * 0.18, s * 0.22); g.lineTo(s * 0.82, s * 0.86); g.stroke();
    } else if (icon === 'jacket') {
      g.fillStyle = '#5aaaff'; g.beginPath(); g.moveTo(s * 0.3, s * 0.18); g.lineTo(s * 0.5, s * 0.28); g.lineTo(s * 0.7, s * 0.18); g.lineTo(s * 0.88, s * 0.42); g.lineTo(s * 0.76, s * 0.5); g.lineTo(s * 0.74, s * 0.88); g.lineTo(s * 0.26, s * 0.88); g.lineTo(s * 0.24, s * 0.5); g.lineTo(s * 0.12, s * 0.42); g.closePath(); g.fill();
      g.strokeStyle = '#2b5c99'; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(s * 0.5, s * 0.28); g.lineTo(s * 0.5, s * 0.88); g.stroke();
      g.fillStyle = '#ffd166'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(s * 0.82 - i * 0.02 * s, s * 0.14 + i * s * 0.03, s * 0.03, 0, Math.PI * 2); g.fill(); }
    } else if (icon === 'chat') {
      g.fillStyle = '#a6f0a0'; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(s * 0.12, s * 0.2, s * 0.62, s * 0.4, s * 0.1) : g.rect(s * 0.12, s * 0.2, s * 0.62, s * 0.4); g.fill();
      g.beginPath(); g.moveTo(s * 0.62, s * 0.58); g.lineTo(s * 0.7, s * 0.72); g.lineTo(s * 0.5, s * 0.6); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(s * 0.3, s * 0.55, s * 0.58, s * 0.3, s * 0.1) : g.rect(s * 0.3, s * 0.55, s * 0.58, s * 0.3); g.fill();
      g.fillStyle = '#8a7f99'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(s * (0.46 + i * 0.13), s * 0.7, s * 0.035, 0, Math.PI * 2); g.fill(); }
    } else if (icon === 'pizza') {
      g.fillStyle = '#e9b44c'; g.beginPath(); g.moveTo(s * 0.5, s * 0.9); g.lineTo(s * 0.14, s * 0.22); g.quadraticCurveTo(s * 0.5, s * 0.06, s * 0.86, s * 0.22); g.closePath(); g.fill();
      g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(s * 0.5, s * 0.82); g.lineTo(s * 0.2, s * 0.28); g.quadraticCurveTo(s * 0.5, s * 0.16, s * 0.8, s * 0.28); g.closePath(); g.fill();
      g.fillStyle = '#d64545'; [[0.42, 0.36], [0.6, 0.4], [0.5, 0.58]].forEach(([x, y]) => { g.beginPath(); g.arc(s * x, s * y, s * 0.06, 0, Math.PI * 2); g.fill(); });
    } else {
      g.fillStyle = '#ffd27a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.18 : s * 0.42; g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); } g.closePath(); g.fill();
    }
  });
}
function treeSprite(v: number) {
  return mk('tree' + v, 120, 160, (g) => {
    g.fillStyle = '#3b2a1e'; g.fillRect(54, 100, 12, 60);
    const hue = 95 + v * 30;
    for (let i = 0; i < 4; i++) { const gr = g.createRadialGradient(60 - 10 + i * 6, 50 + i * 8, 4, 60, 60 + i * 10, 46); gr.addColorStop(0, `hsl(${hue},45%,42%)`); gr.addColorStop(1, `hsl(${hue - 10},45%,18%)`); g.fillStyle = gr; g.beginPath(); g.arc(60 + (i % 2 ? 14 : -14) * (i > 1 ? 0.5 : 1), 52 + i * 12, 40 - i * 5, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(255,170,120,0.55)'; g.lineWidth = 3; g.beginPath(); g.arc(60, 46, 38, -2.4, -0.6); g.stroke();
  });
}
function ferrisSprite() {
  return mk('ferris', 400, 440, (g) => {
    const cx = 200, cy = 200, R = 180;
    g.strokeStyle = '#2b2346'; g.lineWidth = 10; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 90, 440); g.moveTo(cx, cy); g.lineTo(cx + 90, 440); g.stroke();
    g.strokeStyle = '#3d3366'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
    for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; g.fillStyle = i % 2 ? '#ffd27a' : '#ff8fb3'; g.beginPath(); g.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 5, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.fillStyle = ['#ff6b6b', '#5aaaff', '#ffd166', '#a6f0a0'][i % 4]; g.fillRect(cx + Math.cos(a) * R - 14, cy + Math.sin(a) * R + 4, 28, 22); }
  });
}
function tentSprite() {
  return mk('tent', 300, 240, (g) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff4e6' : '#e63946'; g.beginPath(); g.moveTo(150, 20); g.lineTo(20 + i * 32.5, 160); g.lineTo(20 + (i + 1) * 32.5, 160); g.closePath(); g.fill(); }
    g.fillStyle = '#c1121f'; g.fillRect(20, 160, 260, 70); g.fillStyle = '#1d1838'; g.fillRect(125, 175, 50, 55);
    g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(150, 0); g.lineTo(170, 14); g.lineTo(150, 22); g.fill();
  });
}
export function cartSprite(color: string) {
  return mk('cart' + color, 160, 110, (g) => {
    const gr = g.createLinearGradient(0, 40, 0, 110); gr.addColorStop(0, color); gr.addColorStop(1, '#1d1838');
    g.fillStyle = gr; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(8, 44, 144, 58, 18) : g.rect(8, 44, 144, 58); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(16, 60, 128, 6);
    g.fillStyle = '#2b2540'; g.fillRect(30, 96, 22, 12); g.fillRect(108, 96, 22, 12);
    g.strokeStyle = '#d9d4e8'; g.lineWidth = 5; g.beginPath(); g.moveTo(34, 50); g.quadraticCurveTo(80, 28, 126, 50); g.stroke();
  });
}

/* ---------------- scene layout (static) ---------------- */
interface Prop { x: number; z: number; kind: 'tree' | 'lamp'; v: number; }
let PROPS: Prop[] = [];
let propsFor = -1;
function props(n: number) {
  if (propsFor === n) return PROPS;
  propsFor = n; PROPS = [];
  const edge = laneZ(n - 1, n) + LANE * 0.5 + 4;
  for (let i = 0; i < 70; i++) {
    const x = -40 + i * 4.2 + hash(i * 3) * 3, side = i % 2 ? 1 : -1, z = side * (edge + 3 + hash(i * 7) * 30);
    PROPS.push({ x, z, kind: i % 5 === 0 ? 'lamp' : 'tree', v: hash(i * 11) });
  }
  return PROPS;
}

/* ---------------- sky and ground split along the real horizon ---------------- */
export function skyGround(g: CanvasRenderingContext2D, P: Projector, W: number, H: number, night: number) {
  const c = P.cam;
  // camera forward vector (yaw/pitch as in Projector)
  const fx = Math.sin(c.yaw) * Math.cos(c.pitch), fy = Math.sin(c.pitch), fz = Math.cos(c.yaw) * Math.cos(c.pitch);
  const grass = night > 0.5 ? '#1f2a24' : '#3d6b3a';
  g.fillStyle = grass; g.fillRect(0, 0, W, H);
  let hx = fx, hz = fz; const hl = Math.hypot(hx, hz);
  if (hl < 0.02) { if (fy > 0) { g.fillStyle = '#231a4a'; g.fillRect(0, 0, W, H); } return; }
  hx /= hl; hz /= hl;
  const sx = -hz, sz = hx;                       // horizontal side vector
  const D = 4000;
  const a = P.project(c.x + hx * D + sx * D * 0.8, c.y, c.z + hz * D + sz * D * 0.8);
  const b = P.project(c.x + hx * D - sx * D * 0.8, c.y, c.z + hz * D - sz * D * 0.8);
  const up = P.project(c.x + hx * D, c.y + D * 0.3, c.z + hz * D);
  if (!a || !b || !up) return;
  // half-plane of the sky: the side of line ab where "up" projects
  const nx = -(b.y - a.y), ny = b.x - a.x;
  const sideUp = (up.x - a.x) * nx + (up.y - a.y) * ny;
  const sign = sideUp >= 0 ? 1 : -1;
  const corners: [number, number][] = [[0, 0], [W, 0], [W, H], [0, H]];
  const poly: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const p = corners[i], q = corners[(i + 1) % 4];
    const dp = ((p[0] - a.x) * nx + (p[1] - a.y) * ny) * sign, dq = ((q[0] - a.x) * nx + (q[1] - a.y) * ny) * sign;
    if (dp >= 0) poly.push(p);
    if ((dp >= 0) !== (dq >= 0)) { const k = dp / (dp - dq); poly.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]); }
  }
  if (poly.length < 3) return;
  const len = Math.hypot(nx, ny) || 1, ux = (nx / len) * sign, uy = (ny / len) * sign;
  const span = Math.max(W, H) * 1.2;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const gr = g.createLinearGradient(mx, my, mx + ux * span, my + uy * span);
  if (night > 0.5) { gr.addColorStop(0, '#3a2a5e'); gr.addColorStop(0.3, '#1b1640'); gr.addColorStop(1, '#07061a'); }
  else { gr.addColorStop(0, '#ffc98a'); gr.addColorStop(0.08, '#ff9a76'); gr.addColorStop(0.3, '#c65d8a'); gr.addColorStop(0.65, '#4a2f7a'); gr.addColorStop(1, '#141235'); }
  g.fillStyle = gr; g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
  // sun low ahead, stars high up
  const sun = P.project(c.x + 3000, 120, c.z - 900);
  if (sun && night < 0.5) { const r = P.f * 0.06; const sg = g.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, r * 9); sg.addColorStop(0, 'rgba(255,240,200,0.95)'); sg.addColorStop(0.15, 'rgba(255,200,140,0.45)'); sg.addColorStop(1, 'rgba(255,170,120,0)'); g.fillStyle = sg; g.fillRect(sun.x - r * 9, sun.y - r * 9, r * 18, r * 18); g.fillStyle = '#fff2d0'; g.beginPath(); g.arc(sun.x, sun.y, r, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 60; i++) {
    const az = hash(i * 5) * Math.PI * 2, el = 0.35 + hash(i * 9) * 1.1;
    const q = P.project(c.x + Math.cos(az) * Math.cos(el) * 3000, c.y + Math.sin(el) * 3000, c.z + Math.sin(az) * Math.cos(el) * 3000);
    if (q) { g.fillStyle = `rgba(255,250,240,${(night > 0.5 ? 0.9 : 0.4) * (0.4 + hash(i) * 0.6)})`; g.fillRect(q.x, q.y, 1.5, 1.5); }
  }
  // skyline of the park at the horizon
  g.fillStyle = night > 0.5 ? '#120f26' : '#2a1f4a';
  for (let i = 0; i < 24; i++) {
    const ang = -1.2 + i * 0.1, d = 900, hh = 25 + hash(i * 3) * 60;
    const p0 = P.project(c.x + Math.cos(ang) * d, 0, c.z + Math.sin(ang) * d), p1 = P.project(c.x + Math.cos(ang + 0.1) * d, hh, c.z + Math.sin(ang + 0.1) * d);
    if (p0 && p1) g.fillRect(Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.abs(p1.x - p0.x) + 1, Math.abs(p1.y - p0.y));
  }
}

/* ---------------- tracks ---------------- */
export function drawTrack(P: Projector, L: DrawList, tr: Track, z: number, color: string, sFrom: number, sTo: number, tunnelDim: boolean) {
  const S = tr.samples;
  let i0 = 0; while (i0 < S.length - 1 && S[i0].s < sFrom) i0++;
  const CH = 6;
  for (let i = Math.max(1, i0); i < S.length && S[i].s < sTo; i += CH) {
    const j1 = Math.min(S.length - 1, i + CH);
    const pts: { l: any; r: any; c: any; smp: any }[] = [];
    let ok = true, dsum = 0;
    for (let j = i - 1; j <= j1; j++) {
      const p = S[j];
      const ux = -Math.sin(p.ang), uy = Math.cos(p.ang);
      const cr = Math.cos(p.roll), sr = Math.sin(p.roll);
      // right vector (+z) rolled around the forward axis
      const rx = ux * sr, ry = uy * sr, rz = cr;
      const g2 = 0.75;
      const l = P.project(p.x - rx * g2, p.y - ry * g2, z - rz * g2), r = P.project(p.x + rx * g2, p.y + ry * g2, z + rz * g2), c = P.project(p.x - ux * 0.35, p.y - uy * 0.35, z);
      if (!l || !r || !c) { ok = false; break; }
      pts.push({ l, r, c, smp: p }); dsum += c.d;
    }
    if (!ok || pts.length < 2) continue;
    const d = dsum / pts.length;
    const tunnel = pts.some(p => p.smp.tunnel);
    const wmax = Math.max(3, P.w / 70);
    L.add(d, (g) => {
      const wd = Math.max(1, Math.min(wmax, pts[0].c.s * 0.18));
      // ties
      g.strokeStyle = tunnel && tunnelDim ? '#2a2236' : '#5a4a6e'; g.lineWidth = Math.max(1, wd * 0.6);
      g.beginPath(); for (let k = 0; k < pts.length; k += 2) { g.moveTo(pts[k].l.x, pts[k].l.y); g.lineTo(pts[k].r.x, pts[k].r.y); } g.stroke();
      // rails
      g.strokeStyle = color; g.lineWidth = wd;
      g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p.l.x, p.l.y) : g.moveTo(p.l.x, p.l.y)); g.stroke();
      g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p.r.x, p.r.y) : g.moveTo(p.r.x, p.r.y)); g.stroke();
      g.strokeStyle = 'rgba(20,14,30,0.85)'; g.lineWidth = wd * 1.4;
      g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p.c.x, p.c.y) : g.moveTo(p.c.x, p.c.y)); g.stroke();
    });
    // supports down to the ground (only where the track is upright)
    const p = S[i];
    if (p.y > 1.2 && Math.cos(p.ang) > 0.3 && Math.abs(Math.sin(p.roll)) < 0.5 && i % 12 < CH) {
      const top = P.project(p.x, p.y - 0.4, z), bot = P.project(p.x, 0, z);
      if (top && bot) L.add((top.d + bot.d) / 2 + 0.5, (g) => { g.strokeStyle = 'rgba(60,48,84,0.9)'; g.lineWidth = Math.max(1, top.s * 0.25); g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(bot.x, bot.y); g.stroke(); });
    }
    // tunnel rings
    if (tunnel && i % 18 < CH) {
      const q = S[i], R = 2.8, ring: any[] = [];
      for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI * 2; const pp = P.project(q.x - Math.sin(q.ang) * (Math.sin(a) * R + 0.6), q.y + Math.cos(q.ang) * (Math.sin(a) * R + 0.6), z + Math.cos(a) * R); if (!pp) { ring.length = 0; break; } ring.push(pp); }
      if (ring.length) L.add(ring.reduce((m, r) => m + r.d, 0) / ring.length - 0.2, (g) => { g.strokeStyle = 'rgba(140,110,200,0.9)'; g.lineWidth = Math.max(1, ring[0].s * 0.3); g.beginPath(); ring.forEach((r, k) => k ? g.lineTo(r.x, r.y) : g.moveTo(r.x, r.y)); g.stroke(); g.fillStyle = 'rgba(30,20,50,0.35)'; g.fill(); for (let k = 0; k < 12; k += 3) { g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(ring[k].x, ring[k].y, Math.max(1.5, ring[k].s * 0.15), 0, Math.PI * 2); g.fill(); } });
    }
  }
}

/* ---------------- the ride ---------------- */
export interface RideFrame { riders: Rider[]; me: number; t: number; assign: (pid: string, seg: number) => string; faces: Faces; moments: Moment[]; night?: number; }
const P = new Projector();
const L = new DrawList();
export function rideCamera(f: RideFrame): Cam {
  const c = cartAt(f.riders, f.me, f.t, f.assign);
  const back = atS(c.tr, c.smp.s - 6), ahead = c.smp;
  const ang = back.ang * 0.35 + ahead.ang * 0.65, roll = ahead.roll;
  const ux = -Math.sin(ang), uy = Math.cos(ang);
  const cr = Math.cos(roll);
  const fx = Math.cos(ang), fy = Math.sin(ang);
  const pos: V3 = [ahead.x - fx * 8 + ux * 3.3 * cr, ahead.y + c.hop - fy * 8 + uy * 3.3 * cr + 0.6, c.z + Math.sin(roll) * 3.3];
  const spd = speedAt(c.tr, f.t);
  return { x: pos[0], y: pos[1], z: pos[2], yaw: Math.PI / 2, pitch: ang - 0.2, roll: -roll, fov: 1.0 + clamp((spd - 10) / 30, 0, 0.35) };
}
export function renderRide(g: CanvasRenderingContext2D, W: number, H: number, f: RideFrame, cam?: Cam) {
  const n = f.riders.length;
  const cm = cam || rideCamera(f);
  P.set(cm, W, H);
  const night = f.night || 0;
  skyGround(g, P, W, H, night);
  // the park floor: paths beside the lanes and cross paths, so speed reads against the ground
  const camX = cm.x, half = laneZ(n - 1, n) + LANE * 0.5 + 2;
  g.save(); g.lineCap = 'round';
  const gl = (x0: number, z0: number, x1: number, z1: number, col: string, w: number) => { const a = P.project(x0, 0.02, z0), b = P.project(x1, 0.02, z1); if (!a || !b) return; g.strokeStyle = col; g.lineWidth = Math.max(1, Math.min(w * Math.min(a.s, b.s), P.w / 60)); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); };
  for (let k = 0; k <= n; k++) { const z = laneZ(k, n) - LANE / 2; for (let x = Math.floor((camX - 10) / 8) * 8; x < camX + 160; x += 8) gl(x, z, x + 8, z, night > 0.5 ? 'rgba(80,90,110,0.5)' : 'rgba(233,207,154,0.55)', 0.9); }
  for (let x = Math.ceil((camX - 6) / 12) * 12; x < camX + 160; x += 12) gl(x, -half - 20, x, half + 20, night > 0.5 ? 'rgba(60,70,90,0.4)' : 'rgba(233,207,154,0.3)', 0.6);
  for (let i = 0; i < 90; i++) { const x = Math.floor(camX / 6) * 6 + (i % 30) * 6 + hash(i) * 5, z = (hash(i * 7 + Math.floor(camX / 180)) - 0.5) * 90; const q = P.project(x, 0.05, z); if (!q || q.d > 90) continue; g.fillStyle = ['#ffd166', '#ff8fb3', '#fff4e6'][i % 3]; g.fillRect(q.x, q.y, Math.max(1, q.s * 0.25), Math.max(1, q.s * 0.25)); }
  g.restore();
  // far attractions
  const fw = P.project(150, 0, -110);
  if (fw) { const s = fw.s * 50; L.add(fw.d, (gg) => gg.drawImage(ferrisSprite(), fw.x - s / 2, fw.y - s * 1.1, s, s * 1.1)); }
  const tn = P.project(70, 0, 80);
  if (tn) { const s = tn.s * 26; L.add(tn.d, (gg) => gg.drawImage(tentSprite(), tn.x - s / 2, tn.y - s * 0.8, s, s * 0.8)); }
  // trees and lamps along the route
  for (const pr of props(n)) {
    if (Math.abs(pr.x - cm.x) > 140) continue;
    const q = P.project(pr.x, 0, pr.z); if (!q) continue;
    if (pr.kind === 'tree') { const s = q.s * (7 + pr.v * 4); L.add(q.d, (gg) => gg.drawImage(treeSprite(Math.floor(pr.v * 3)), q.x - s * 0.375, q.y - s, s * 0.75, s)); }
    else { const top = P.project(pr.x, 5, pr.z); if (top) L.add(q.d, (gg) => { gg.strokeStyle = '#2b2346'; gg.lineWidth = Math.max(1, q.s * 0.15); gg.beginPath(); gg.moveTo(q.x, q.y); gg.lineTo(top.x, top.y); gg.stroke(); gg.globalCompositeOperation = 'lighter'; const r = Math.max(4, top.s * 2.2); gg.drawImage(glowSprite('rgba(255,210,140,1)'), top.x - r, top.y - r, r * 2, r * 2); gg.globalCompositeOperation = 'source-over'; }); }
  }
  // moment signs beside the track at the start of each moment
  f.moments.forEach((m, i) => {
    const x = X0 + i * SEG_L + 6, z = laneZ(0, n) - LANE * 0.5 - 5;
    const q = P.project(x, 7, z); if (!q) return;
    const s = q.s * 8;
    L.add(q.d, (gg) => {
      gg.fillStyle = '#2b2346'; gg.fillRect(q.x - s * 0.04, q.y, s * 0.08, q.s * 7);
      gg.fillStyle = '#fff6e6'; gg.beginPath(); (gg as any).roundRect ? (gg as any).roundRect(q.x - s * 0.6, q.y - s * 0.45, s * 1.2, s * 0.5, s * 0.06) : gg.rect(q.x - s * 0.6, q.y - s * 0.45, s * 1.2, s * 0.5); gg.fill();
      gg.drawImage(momentIcon(m.icon), q.x - s * 0.56, q.y - s * 0.42, s * 0.44, s * 0.44);
      gg.fillStyle = '#2b2540'; gg.font = `700 ${Math.max(6, s * 0.1)}px Bungee, Fredoka, system-ui, sans-serif`; gg.textBaseline = 'middle'; gg.textAlign = 'left';
      gg.fillText(m.time, q.x - s * 0.08, q.y - s * 0.3); gg.font = `600 ${Math.max(5, s * 0.075)}px Fredoka, system-ui, sans-serif`;
      gg.fillText(m.short, q.x - s * 0.08, q.y - s * 0.14);
    });
  });
  L.flush(g);
  // tracks (each in its lane), then carts
  const camC = cartAt(f.riders, f.me, f.t, f.assign);
  const myS = camC.smp.s;
  f.riders.forEach((r, k) => drawTrack(P, L, r.track, laneZ(k, n), r.color, myS - 10, myS + 170, false));
  f.riders.forEach((r, k) => {
    const c = cartAt(f.riders, k, f.t, f.assign);
    const p = c.smp, ux = -Math.sin(p.ang), uy = Math.cos(p.ang);
    const pos: V3 = [p.x + ux * 0.9, p.y + uy * 0.9 + c.hop, c.z];
    const q = P.project(pos[0], pos[1], pos[2]); if (!q) return;
    const sz = Math.min(q.s * 2.1, P.h * 0.3);
    const face = f.faces(r.avatar, faceFor(p, f.t, r.avatar));
    L.add(q.d - 0.3, (gg) => {
      gg.save(); gg.translate(q.x, q.y); gg.rotate(-(P.cam.roll || 0) * 0 - (p.ang - P.cam.pitch) * 0 + 0);
      if (face) gg.drawImage(face, -sz * 0.36, -sz * 0.78, sz * 0.72, sz * 0.72);
      gg.drawImage(cartSprite(r.color), -sz * 0.5, -sz * 0.42, sz, sz * 0.69);
      gg.restore();
      if (k !== f.me) { gg.fillStyle = 'rgba(255,255,255,0.9)'; gg.font = `600 ${Math.max(9, sz * 0.13)}px Fredoka, system-ui, sans-serif`; gg.textAlign = 'center'; gg.textBaseline = 'bottom'; gg.fillText(r.human ? r.name : r.name + ' · companion', q.x, q.y - sz * 0.8); }
    });
  });
  L.flush(g);
  // the feel of it: tunnel darkness, wind on drops, fireworks in loops
  const me = camC.smp;
  const spd = speedAt(camC.tr, f.t);
  if (me.tunnel) { g.fillStyle = 'rgba(8,4,20,0.55)'; g.fillRect(0, 0, W, H); }
  if (spd > 16) {
    const k = clamp((spd - 16) / 20, 0, 1);
    g.save(); g.strokeStyle = `rgba(255,255,255,${0.25 * k})`; g.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) { const a = hash(i * 13 + Math.floor(f.t * 20)) * Math.PI * 2, r0 = Math.min(W, H) * (0.3 + hash(i) * 0.3), r1 = r0 + Math.min(W, H) * 0.25 * k; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); g.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); g.stroke(); }
    g.restore();
  }
  const seg = segAt(f.t);
  const myOwner = f.riders.find(r => r.pid === camC.owner);
  if (seg >= 0 && seg < N_SEG && myOwner && myOwner.track.segs[seg] && myOwner.track.segs[seg].mod === 'loop' && Math.cos(me.ang) < 0) fireworks(g, W, H, f.t);
  // vignette + grain
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const gt = grainTile(); g.globalAlpha = 0.35; const ox = (f.t * 977) % 128; for (let y = -ox; y < H; y += 128) for (let x = -ox; x < W; x += 128) g.drawImage(gt, x, y); g.globalAlpha = 1;
  return { seg, speed: spd, tunnel: me.tunnel, inverted: Math.cos(me.ang) < 0 };
}
function faceFor(p: { ang: number; seg: number; tunnel: boolean }, t: number, avatar: string): string {
  if (p.tunnel) return 'worried';
  if (Math.cos(p.ang) < 0) return 'wow';
  const slope = Math.sin(p.ang);
  if (slope < -0.45) return avatar === 'rush' ? 'speed' : 'surprised';
  if (slope > 0.3) return 'determined';
  return (Math.floor(t / 2) % 2) ? 'happy' : 'laugh';
}
export function fireworks(g: CanvasRenderingContext2D, W: number, H: number, t: number) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 4; b++) {
    const k = ((t * 0.9 + b * 0.27) % 1);
    const cx = W * (0.15 + hash(b * 7 + Math.floor(t * 0.9 + b * 0.27)) * 0.7), cy = H * (0.12 + hash(b * 11 + Math.floor(t * 0.9 + b * 0.27)) * 0.3);
    const col = ['255,210,122', '127,216,255', '255,143,179', '166,240,160'][b];
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, r = k * Math.min(W, H) * 0.18; g.fillStyle = `rgba(${col},${(1 - k) * 0.9})`; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r + k * k * 20, 2.2, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
}
export { X_END };
