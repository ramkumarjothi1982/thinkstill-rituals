/* The Glorious Mess Auction — drawings.
 *   Strokes are stored compactly: points on a 256×256 grid, one byte per coordinate, base64 per stroke.
 *   Passes: 0 = the face (graphite), 1 = the hair/extra (marker), 2 = the signature (ink).
 *   Bubble companions "draw blind" too: a generator walks a pen through a portrait while its sense of place drifts,
 *   each Bubble in its own style (Rush overshoots, Loopie spirals, Still draws one serene line, Glitch draws in pixels…).
 *   Rendering adds line boil — the drawing jitters a few times a second like hand-drawn animation, so the messes live. */
import type { Slug } from '../../room/protocol';

export type Pt = [number, number];
export interface Stroke { p: number; pts: Pt[]; }
export interface Enc { p: number; d: string; }

/* ---------------- encoding ---------------- */
const b64e = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const b64d = (s: string) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
export function encode(strokes: Stroke[]): Enc[] {
  return strokes.filter(s => s.pts.length > 0).map(s => {
    const u = new Uint8Array(s.pts.length * 2);
    s.pts.forEach(([x, y], i) => { u[i * 2] = Math.max(0, Math.min(255, Math.round(x))); u[i * 2 + 1] = Math.max(0, Math.min(255, Math.round(y))); });
    return { p: s.p, d: b64e(u) };
  });
}
export function decode(enc: Enc[] | null | undefined): Stroke[] {
  if (!Array.isArray(enc)) return [];
  const out: Stroke[] = [];
  for (const e of enc) {
    try { const u = b64d(String(e.d)); const pts: Pt[] = []; for (let i = 0; i + 1 < u.length; i += 2) pts.push([u[i], u[i + 1]]); if (pts.length) out.push({ p: e.p === 1 ? 1 : e.p === 2 ? 2 : 0, pts }); } catch (err) { /* skip a broken stroke */ }
  }
  return out;
}
/** Server-side validation: shape, size limits, decodable. Returns the cleaned encoding or null. */
export function cleanEnc(enc: any, maxPts: number): Enc[] | null {
  if (!Array.isArray(enc) || enc.length > 120) return null;
  let total = 0; const out: Enc[] = [];
  for (const e of enc) {
    if (!e || typeof e.d !== 'string' || e.d.length > 4000 || !/^[A-Za-z0-9+/=]*$/.test(e.d)) return null;
    const n = Math.floor((e.d.length * 3) / 8); total += n; if (total > maxPts) return null;
    out.push({ p: e.p === 1 ? 1 : e.p === 2 ? 2 : 0, d: e.d });
  }
  return out;
}

/* ---------------- simplification (Ramer–Douglas–Peucker) ---------------- */
export function simplify(pts: Pt[], eps = 0.9): Pt[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1, bd = 0;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > bd) { bd = d; best = i; } }
    if (bd > eps && best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/* ---------------- rendering ---------------- */
export const INK = ['#2b2440', '#d6336c', '#2a5fd6'];
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** Draw strokes into a square of `size` px at (x, y). `boil` (px) jitters points; `t` drives it; `upto` (0..1) draws on. */
export function drawStrokes(g: CanvasRenderingContext2D, strokes: Stroke[], x: number, y: number, size: number, o: { t?: number; boil?: number; seed?: number; upto?: number; width?: number; colors?: string[]; passes?: number[] } = {}) {
  const k = size / 256, frame = Math.floor((o.t || 0) * 7), amp = o.boil || 0, seed = o.seed || 0;
  const cols = o.colors || INK;
  let total = 0; for (const s of strokes) total += s.pts.length;
  let budget = o.upto == null ? Infinity : Math.floor(total * Math.max(0, Math.min(1, o.upto)));
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  strokes.forEach((s, si) => {
    if (budget <= 0) return;
    if (o.passes && !o.passes.includes(s.p)) return;
    const n = Math.min(s.pts.length, budget); budget -= n;
    g.strokeStyle = cols[s.p] || cols[0];
    g.lineWidth = Math.max(1.2, (o.width || (s.p === 2 ? 2.2 : s.p === 1 ? 4.2 : 3.2)) * k);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const [px, py] = s.pts[i];
      const jx = amp ? (hash(seed + si * 131 + i * 7.3 + frame * 17.1) - 0.5) * 2 * amp : 0, jy = amp ? (hash(seed + si * 97 + i * 5.1 + frame * 23.7) - 0.5) * 2 * amp : 0;
      const X = x + px * k + jx, Y = y + py * k + jy;
      if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    if (n === 1) { const [px, py] = s.pts[0]; g.lineTo(x + px * k + 0.1, y + py * k); }
    g.stroke();
  });
  g.restore();
}

/* ---------------- Bubbles draw blind ---------------- */
type R = () => number;
interface Pen { ox: number; oy: number; rot: number; sc: number; }
function drift(p: Pen, r: R, amt: number) { p.ox += (r() - 0.5) * amt * 2; p.oy += (r() - 0.5) * amt * 2; p.rot += (r() - 0.5) * amt * 0.02; p.sc *= 1 + (r() - 0.5) * amt * 0.012; p.ox *= 0.92; p.oy *= 0.92; }
function put(p: Pen, x: number, y: number): Pt { const dx = (x - 128) * p.sc, dy = (y - 128) * p.sc, c = Math.cos(p.rot), s = Math.sin(p.rot); return [128 + p.ox + dx * c - dy * s, 128 + p.oy + dx * s + dy * c]; }
function wob(pts: Pt[], r: R, amt: number, freq = 1): Pt[] { let a = 0, b = 0; return pts.map(([x, y], i) => { if (i % Math.max(1, Math.round(3 / freq)) === 0) { a = (r() - 0.5) * amt; b = (r() - 0.5) * amt; } return [x + a, y + b] as Pt; }); }
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] { const o: Pt[] = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; }
function spiral(cx: number, cy: number, r: number, turns: number, n: number): Pt[] { const o: Pt[] = []; for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2; o.push([cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t]); } return o; }
function zig(x0: number, y0: number, x1: number, y1: number, n: number, amp: number): Pt[] { const o: Pt[] = []; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; for (let i = 0; i <= n; i++) { const t = i / n, s = (i % 2 ? 1 : -1) * amp; o.push([x0 + dx * t + nx * s, y0 + dy * t + ny * s]); } return o; }
const map = (p: Pen, pts: Pt[]) => pts.map(([x, y]) => put(p, x, y));
const pixel = (pts: Pt[], q: number): Pt[] => { const o: Pt[] = []; pts.forEach(([x, y], i) => { const X = Math.round(x / q) * q, Y = Math.round(y / q) * q; if (i && o.length) { const [lx, ly] = o[o.length - 1]; if (lx !== X && ly !== Y) o.push([X, ly]); } o.push([X, Y]); }); return o; };

/** A Bubble's blind self-portrait (face pass and hair pass), deterministic for a seed. */
export function bubblePortrait(slug: Slug, r: R): Stroke[] {
  const pen: Pen = { ox: (r() - 0.5) * 20, oy: (r() - 0.5) * 16, rot: (r() - 0.5) * 0.2, sc: 0.9 + r() * 0.2 };
  const calm = slug === 'still' ? 0.25 : slug === 'rush' ? 1.8 : 1;
  const out: Stroke[] = [];
  const add = (p: number, pts: Pt[]) => out.push({ p, pts: pts.map(([x, y]) => [Math.max(2, Math.min(253, x)), Math.max(2, Math.min(253, y))] as Pt) });
  const hx = 128, hy = 112, hr = 62 + r() * 14;
  // head outline: never quite closes
  let head = arc(hx, hy, hr * (slug === 'glitch' ? 1 : 0.95), hr * (slug === 'drop' ? 1.08 : 1), -Math.PI * 0.6, Math.PI * 1.45 + (r() - 0.3) * 0.5 * calm, 30);
  if (slug === 'drop') head = [[hx, hy - hr * 1.5], ...arc(hx, hy + 6, hr * 0.9, hr * 0.95, -Math.PI * 0.15, Math.PI * 1.15, 24), [hx - 4, hy - hr * 1.45]];
  if (slug === 'loopie') head = [...head, ...arc(hx + 4, hy + 3, hr * 0.9, hr * 0.93, Math.PI * 1.4, Math.PI * 2.6, 14)];
  if (slug === 'glitch') head = pixel(arc(hx, hy, hr, hr * 0.9, -Math.PI * 0.6, Math.PI * 1.4, 18), 14);
  const still = slug === 'still';
  const one: Pt[] = [];   // Still draws everything as one continuous line
  const push = (pts: Pt[], p = 0) => { if (still) one.push(...pts); else add(p, pts); };
  push(wob(map(pen, head), r, 3 * calm));
  drift(pen, r, 24 * calm);
  // eyes
  const ex = 26 + r() * 10, ey = hy - 12;
  for (const s of [-1, 1]) {
    let eye: Pt[];
    if (slug === 'loopie') eye = spiral(hx + s * ex, ey, 13, 2.4, 22);
    else if (slug === 'rush') eye = [[hx + s * ex - 9, ey - 9], [hx + s * ex + 9, ey + 9], [hx + s * ex, ey], [hx + s * ex + 9, ey - 9], [hx + s * ex - 9, ey + 9]];
    else if (still) eye = arc(hx + s * ex, ey, 10, 5, 0.1, Math.PI - 0.1, 8);
    else if (slug === 'glitch') eye = pixel(arc(hx + s * ex, ey, 9, 9, 0, Math.PI * 2, 10), 6);
    else eye = arc(hx + s * ex, ey, 8 + r() * 4, 9 + r() * 4, 0, Math.PI * 2, 12);
    push(wob(map(pen, eye), r, 2 * calm));
    if (slug === 'sync') { drift(pen, r, 3); } else drift(pen, r, 16 * calm);
  }
  if (slug === 'drop') for (const s of [-1, 1]) add(0, wob(map(pen, [[hx + s * ex, ey + 12], [hx + s * ex + s * 3, ey + 34], [hx + s * ex + s * 1, ey + 52]]), r, 2));
  // nose
  if (slug !== 'glitch') push(map(pen, [[hx + 2, hy - 2], [hx - 6, hy + 14], [hx + 6, hy + 16]]));
  drift(pen, r, 26 * calm);
  // mouth (often ends up somewhere else entirely)
  let mouth = arc(hx, hy + 30, 24 + r() * 10, 10 + r() * 8, 0.15, Math.PI - 0.15, 12);
  if (slug === 'rush') mouth = zig(hx - 26, hy + 34, hx + 26, hy + 34, 8, 6);
  if (slug === 'loopie') mouth = [...arc(hx, hy + 30, 24, 10, 0.1, Math.PI - 0.1, 8), ...spiral(hx - 24, hy + 32, 8, 1.4, 10)];
  if (slug === 'glitch') mouth = pixel(arc(hx, hy + 30, 26, 12, 0.2, Math.PI - 0.2, 8), 8);
  push(wob(map(pen, mouth), r, 2.5 * calm));
  drift(pen, r, 26 * calm);
  // shoulders / body, usually detached
  let body = arc(hx, hy + hr + 64, hr * 1.25, 52, Math.PI * 1.08, Math.PI * 1.92, 16);
  if (slug === 'glitch') body = pixel(body, 12);
  push(wob(map(pen, body), r, 3 * calm));
  if (slug === 'sync') add(0, map(pen, [[hx - 6, hy + hr + 30], [hx + 10, hy + hr + 46], [hx - 2, hy + hr + 48], [hx + 12, hy + hr + 66]]));
  if (slug === 'patch') for (const [x, y] of [[hx - hr * 0.7, hy - hr * 0.4], [hx + hr * 0.6, hy + hr * 0.5]] as Pt[]) { add(0, map(pen, [[x - 9, y - 9], [x + 9, y + 9]])); add(0, map(pen, [[x - 9, y + 9], [x + 9, y - 9]])); }
  if (still) add(0, wob(one, r, 0.8));
  // hair pass (marker): each Bubble's own idea of hair
  drift(pen, r, 30 * calm);
  const top = hy - hr;
  let hair: Pt[][] = [];
  if (slug === 'rush') hair = Array.from({ length: 6 }, (_, i) => zig(hx - 50 + i * 20, top + 4, hx - 60 + i * 24 + (r() - 0.5) * 20, top - 42 - r() * 20, 3, 4));
  else if (slug === 'loopie') hair = [Array.from({ length: 60 }, (_, i) => { const t = i / 59, a = t * Math.PI * 9; return [hx - 60 + t * 120 + Math.cos(a) * 9, top - 10 + Math.sin(a) * 9] as Pt; })];
  else if (slug === 'drop') hair = [-1, 0, 1].map(s => [[hx + s * 34, top - 34], [hx + s * 34 - 7, top - 18], [hx + s * 34, top - 10], [hx + s * 34 + 7, top - 18], [hx + s * 34, top - 34]] as Pt[]);
  else if (still) hair = [Array.from({ length: 30 }, (_, i) => { const t = i / 29; return [hx - 56 + t * 112, top - 6 - Math.sin(t * Math.PI) * 26 - Math.sin(t * Math.PI * 3) * 5] as Pt; })];
  else if (slug === 'sync') hair = [-1, 1].map(s => [[hx + s * 20, top], [hx + s * 34, top - 22], [hx + s * 22, top - 22], [hx + s * 40, top - 48]] as Pt[]);
  else if (slug === 'glitch') hair = [pixel([[hx, top], [hx, top - 40], [hx + 20, top - 40], [hx + 20, top - 60]], 10), pixel([[hx - 30, top + 2], [hx - 44, top - 30]], 10)];
  else hair = [[[hx - 46, top + 4], [hx + 46, top - 6], [hx + 40, top + 14], [hx - 40, top + 22], [hx - 46, top + 4]], [[hx - 6, top - 4], [hx + 6, top + 18]], [[hx + 8, top - 4], [hx - 4, top + 18]]];
  hair.forEach(hs => add(1, wob(map(pen, hs), r, 2 * calm)));
  return out;
}

/** A signature scribble: loops of a cursive name, smaller towards the end. */
export function scribble(r: R, x0 = 150, y0 = 228, w = 90): Pt[] {
  const o: Pt[] = []; const n = 70, loops = 5 + Math.floor(r() * 4);
  for (let i = 0; i <= n; i++) { const t = i / n, a = t * loops * Math.PI * 2; const amp = 9 * (1 - t * 0.6) * (0.7 + r() * 0.3); o.push([x0 + t * w + Math.cos(a) * 4, y0 - Math.abs(Math.sin(a)) * amp + (i % 9 === 0 ? -4 : 0)]); }
  o.push([x0 - 4, y0 + 6], [x0 + w + 6, y0 + 4]);
  return o;
}
