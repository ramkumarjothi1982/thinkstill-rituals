/* Emotional Rollercoaster — the side view: the track editor (your five moments) and the station reveal (every track
 * overlaid, divergence points pulsing). Same mapping for both, so a track looks the same in the editor and the reveal. */
import { Track, atTime, B, AMP, SEG_L, X0 } from './track';
import { Moment, N_SEG, Mod } from './content';
import { momentIcon } from './ride';

export interface Map2 { x0: number; x1: number; y0: number; y1: number; W: number; H: number; top: number; bottom: number; }
export function mapFor(W: number, H: number, top = 0.14, bottom = 0.1): Map2 { return { x0: X0 - 9, x1: X0 + N_SEG * SEG_L + 5, y0: -1.5, y1: 27.5, W, H, top, bottom }; }
export const sx = (m: Map2, x: number) => ((x - m.x0) / (m.x1 - m.x0)) * m.W;
export const sy = (m: Map2, y: number) => m.H * (1 - m.bottom) - ((y - m.y0) / (m.y1 - m.y0)) * m.H * (1 - m.top - m.bottom);
export const wy = (m: Map2, py: number) => m.y0 + ((m.H * (1 - m.bottom) - py) / (m.H * (1 - m.top - m.bottom))) * (m.y1 - m.y0);
export const segOfX = (m: Map2, px: number) => { const x = m.x0 + (px / m.W) * (m.x1 - m.x0); return Math.max(0, Math.min(N_SEG - 1, Math.floor((x - X0) / SEG_L))); };

export function drawBackdrop(g: CanvasRenderingContext2D, m: Map2) {
  const { W, H } = m;
  const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#2a1f5e'); sk.addColorStop(0.55, '#b4568a'); sk.addColorStop(0.85, '#ff9a76'); sk.addColorStop(1, '#ffc98a');
  g.fillStyle = sk; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(42,31,74,0.55)';
  for (let i = 0; i < 18; i++) { const x = (i / 18) * W, hh = H * (0.08 + ((i * 37) % 11) / 11 * 0.12); g.fillRect(x, sy(m, 0) - hh, W / 18 + 1, hh); }
  // ferris wheel silhouette
  const fx = W * 0.82, fy = sy(m, 0) - H * 0.3, fr = H * 0.22;
  g.strokeStyle = 'rgba(42,31,74,0.7)'; g.lineWidth = Math.max(1, W * 0.004);
  g.beginPath(); g.arc(fx, fy, fr, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr); g.stroke(); }
  g.fillStyle = '#2f5a35'; g.fillRect(0, sy(m, 0), W, H - sy(m, 0));
  // baseline: the height every moment starts and ends at
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(0, sy(m, B)); g.lineTo(W, sy(m, B)); g.stroke(); g.setLineDash([]);
}

export function drawProfile(g: CanvasRenderingContext2D, m: Map2, tr: Track, color: string, width: number, alpha = 1, supports = true) {
  const S = tr.samples;
  g.save(); g.globalAlpha = alpha;
  if (supports) {
    g.strokeStyle = 'rgba(40,28,60,0.55)'; g.lineWidth = Math.max(1, width * 0.35);
    for (let i = 0; i < S.length; i += 9) { const p = S[i]; if (p.x < m.x0 || p.x > m.x1 || Math.cos(p.ang) < 0.4 || p.y < 1) continue; g.beginPath(); g.moveTo(sx(m, p.x), sy(m, p.y)); g.lineTo(sx(m, p.x), sy(m, 0)); g.stroke(); }
  }
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = 'rgba(20,12,30,0.8)'; g.lineWidth = width + 2.5;
  g.beginPath(); let started = false;
  for (const p of S) { if (p.x < m.x0 - 2 || p.x > m.x1 + 2) { started = false; continue; } const X = sx(m, p.x), Y = sy(m, p.y); if (!started) { g.moveTo(X, Y); started = true; } else g.lineTo(X, Y); }
  g.stroke();
  g.strokeStyle = color; g.lineWidth = width;
  g.beginPath(); started = false;
  for (const p of S) { if (p.x < m.x0 - 2 || p.x > m.x1 + 2) { started = false; continue; } const X = sx(m, p.x), Y = sy(m, p.y); if (!started) { g.moveTo(X, Y); started = true; } else g.lineTo(X, Y); }
  g.stroke();
  // tunnels drawn as dark tubes over the rails
  g.strokeStyle = 'rgba(30,18,50,0.75)'; g.lineWidth = width * 3.2;
  g.beginPath(); started = false;
  for (const p of S) { if (!p.tunnel) { started = false; continue; } const X = sx(m, p.x), Y = sy(m, p.y); if (!started) { g.moveTo(X, Y); started = true; } else g.lineTo(X, Y); }
  g.stroke();
  g.restore();
}

export function modIcon(g: CanvasRenderingContext2D, mod: Mod, x: number, y: number, s: number, col = '#fff') {
  g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.5, s * 0.1); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (mod === 'smooth') { g.moveTo(-s * 0.45, s * 0.15); g.bezierCurveTo(-s * 0.2, -s * 0.35, s * 0.2, -s * 0.35, s * 0.45, s * 0.15); }
  else if (mod === 'drop') { g.moveTo(-s * 0.45, s * 0.05); g.lineTo(-s * 0.1, -s * 0.35); g.lineTo(s * 0.05, s * 0.4); g.lineTo(s * 0.45, s * 0.2); }
  else if (mod === 'loop') { g.moveTo(-s * 0.45, s * 0.3); g.lineTo(-s * 0.05, s * 0.3); g.arc(0, 0, s * 0.3, Math.PI / 2, Math.PI / 2 + Math.PI * 1.9, true); g.moveTo(s * 0.05, s * 0.3); g.lineTo(s * 0.45, s * 0.3); }
  else if (mod === 'tunnel') { g.arc(0, s * 0.2, s * 0.38, Math.PI, 0); g.moveTo(-s * 0.45, s * 0.2); g.lineTo(s * 0.45, s * 0.2); }
  else { for (let i = 0; i <= 20; i++) { const u = i / 20, X = -s * 0.45 + u * s * 0.9, Y = Math.sin(u * Math.PI * 3) * s * 0.25; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } }
  g.stroke(); g.restore();
}

export interface EditorOpts { sel: number; cartT: number; face: CanvasImageSource | null; moments: Moment[]; hover?: number; }
export function renderEditor(g: CanvasRenderingContext2D, W: number, H: number, tr: Track, o: EditorOpts) {
  const m = mapFor(W, H);
  drawBackdrop(g, m);
  for (let i = 0; i < N_SEG; i++) {
    const a = sx(m, X0 + i * SEG_L), b = sx(m, X0 + (i + 1) * SEG_L);
    if (i === o.sel) { g.fillStyle = 'rgba(255,214,140,0.16)'; g.fillRect(a, 0, b - a, H); }
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(a, 0); g.lineTo(a, H); g.stroke();
    // the moment, on top
    const ic = momentIcon(o.moments[i].icon, 96), s = Math.min((b - a) * 0.42, H * 0.1);
    g.globalAlpha = i === o.sel ? 1 : 0.75; g.drawImage(ic, (a + b) / 2 - s / 2, H * 0.015, s, s); g.globalAlpha = 1;
  }
  drawProfile(g, m, tr, '#ffd27a', Math.max(2.5, W * 0.008));
  // the feeling pegs
  for (let i = 0; i < N_SEG; i++) {
    const sg = tr.segs[i]; const xm = sx(m, X0 + (i + 0.5) * SEG_L), ym = sy(m, B + sg.h * AMP), y0 = sy(m, B);
    g.strokeStyle = i === o.sel ? 'rgba(255,236,190,0.7)' : 'rgba(255,236,190,0.3)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(xm, y0); g.lineTo(xm, ym); g.stroke(); g.setLineDash([]);
    const r = Math.max(9, W * 0.024) * (i === o.sel ? 1.15 : 1);
    g.fillStyle = i === o.sel ? '#ffd27a' : '#fff6e6'; g.strokeStyle = '#2b2540'; g.lineWidth = 2;
    g.beginPath(); g.arc(xm, ym, r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#2b2540'; g.beginPath(); g.moveTo(xm - r * 0.4, ym - r * 0.1); g.lineTo(xm, ym - r * 0.55); g.lineTo(xm + r * 0.4, ym - r * 0.1); g.moveTo(xm - r * 0.4, ym + r * 0.1); g.lineTo(xm, ym + r * 0.55); g.lineTo(xm + r * 0.4, ym + r * 0.1); g.fill();
    // the module, under the track
    modIcon(g, sg.mod, xm, H * 0.955, Math.min(W * 0.06, H * 0.07), i === o.sel ? '#ffd27a' : 'rgba(255,255,255,0.8)');
  }
  // the test cart rides your track
  const p = atTime(tr, o.cartT);
  const cx = sx(m, p.x), cy = sy(m, p.y);
  const cs = Math.max(14, W * 0.045);
  g.save(); g.translate(cx, cy); g.rotate(-p.ang); g.rotate(p.roll * 0);
  g.fillStyle = '#e63946'; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(-cs * 0.6, -cs * 0.55, cs * 1.2, cs * 0.5, cs * 0.15) : g.rect(-cs * 0.6, -cs * 0.55, cs * 1.2, cs * 0.5); g.fill();
  if (o.face) g.drawImage(o.face, -cs * 0.45, -cs * 1.25, cs * 0.9, cs * 0.9);
  g.restore();
}

/** Every rider's track overlaid on one side view, for the station reveal. */
export function renderOverlay(g: CanvasRenderingContext2D, W: number, H: number, tracks: { tr: Track; color: string; face: CanvasImageSource | null }[], moments: Moment[], pulse: number[], t: number) {
  const m = mapFor(W, H, 0.16, 0.12);
  drawBackdrop(g, m);
  for (let i = 0; i < N_SEG; i++) {
    const a = sx(m, X0 + i * SEG_L), b = sx(m, X0 + (i + 1) * SEG_L);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(a, 0); g.lineTo(a, H); g.stroke();
    const s = Math.min((b - a) * 0.4, H * 0.09);
    g.drawImage(momentIcon(moments[i].icon, 96), (a + b) / 2 - s / 2, H * 0.02, s, s);
    if (pulse[i] > 0) {
      const xm = (a + b) / 2, ym = H * 0.5, r = (b - a) * (0.32 + 0.06 * Math.sin(t * 4)) * pulse[i];
      g.strokeStyle = `rgba(255,214,140,${0.5 + 0.3 * Math.sin(t * 4)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(xm, ym, r, H * 0.36, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  tracks.forEach((x, k) => drawProfile(g, m, x.tr, x.color, Math.max(2.5, W * 0.006), 0.9, k === 0));
  tracks.forEach((x) => {
    const p = x.tr.samples.find(q => q.x >= X0 + 2) || x.tr.samples[0];
    const s = Math.max(22, W * 0.05);
    if (x.face) g.drawImage(x.face, sx(m, p.x) - s / 2 - s * 0.6, sy(m, p.y) - s, s, s);
  });
  return m;
}
