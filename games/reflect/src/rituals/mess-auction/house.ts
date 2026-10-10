/* The Glorious Mess Auction — the auction house and the museum, painted on canvas.
 * Burgundy velvet, gold leaf, one spotlight on one ridiculous drawing; a brass price board; numbered paddles.
 * Then the Museum of Glorious Messes: a long marble gallery the camera glides along. */
import { glowSprite, grainTile } from '../../gfx/projector';
import { rrect } from '../../actor/picts';
import { Stroke, drawStrokes } from './portrait';

export interface Rect { x: number; y: number; w: number; h: number; }
export interface Layout { frame: Rect; plaque: Rect; board: Rect; podium: { x: number; y: number; r: number }; attendant: { x: number; y: number; r: number }; rowY: number; rowR: number; port: boolean; }

/** Where everything stands, for a canvas of W×H device pixels and n bidders in the front row. */
export function layout(W: number, H: number, n = 5): Layout {
  const port = W / H < 0.8;
  if (port) {
    const fw = Math.min(W * 0.7, H * 0.33);
    const frame = { x: W / 2 - fw / 2, y: H * 0.075, w: fw, h: fw * 1.12 };
    const plaque = plaqueRect(frame);
    const bw = Math.min(W * 0.66, fw), bh = Math.max(64, bw * 0.25);
    const board = { x: W / 2, y: plaque.y + plaque.h + H * 0.012, w: bw, h: bh };
    const base = board.y + bh;
    return { frame, plaque, board, podium: { x: W * 0.11, y: base, r: W * 0.085 }, attendant: { x: W * 0.89, y: base, r: W * 0.075 }, rowY: H * 0.8, rowR: Math.min(W / (Math.max(n, 3) * 2.25), H * 0.042), port };
  }
  const fw = Math.min(W * 0.25, H * 0.38);
  const frame = { x: W / 2 - fw / 2, y: H * 0.07, w: fw, h: fw * 1.12 };
  const plaque = plaqueRect(frame);
  const right = frame.x + fw;
  const bw = Math.min(W * 0.24, H * 0.46), bh = Math.max(64, bw * 0.26);
  const board = { x: right + (W - right) * 0.55, y: H * 0.16, w: bw, h: bh };
  const base = frame.y + frame.h;
  return { frame, plaque, board, podium: { x: frame.x - W * 0.1, y: base, r: H * 0.075 }, attendant: { x: right + W * 0.065, y: base, r: H * 0.065 }, rowY: H * 0.84, rowR: Math.min(W / (Math.max(n, 3) * 3.2), H * 0.065), port };
}
export function plaqueRect(f: Rect): Rect {
  const w = Math.min(f.w * 1.1, Math.max(f.w * 0.8, 180)), h = Math.max(30, f.w * 0.17);
  return { x: f.x + f.w / 2 - w / 2, y: f.y + f.h + f.w * 0.04, w, h };
}

const VELVET = ['#4a0d1e', '#6e1529', '#3a0917'];
export function drawHouse(g: CanvasRenderingContext2D, W: number, H: number, L: Layout, o: { t: number; spot: number; house: number; curtain?: number }) {
  // velvet wall
  const wall = g.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 14; i++) wall.addColorStop(i / 14, VELVET[i % 3]);
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  // house lights (warm wash) and chandelier glow
  g.save(); g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.25 + o.house * 0.4; g.drawImage(glowSprite('rgba(255,200,130,1)'), W * 0.1, -H * 0.35, W * 0.8, H * 0.7);
  g.restore();
  // gold wainscot + floor
  const floorY = L.rowY - L.rowR * 2.6;
  g.fillStyle = '#2a0812'; g.fillRect(0, floorY, W, H - floorY);
  const fl = g.createLinearGradient(0, floorY, 0, H); fl.addColorStop(0, '#3b1018'); fl.addColorStop(1, '#14040a'); g.fillStyle = fl; g.fillRect(0, floorY, W, H - floorY);
  g.fillStyle = '#c99a3e'; g.fillRect(0, floorY - 3, W, 3);
  g.fillStyle = 'rgba(201,154,62,.35)'; g.fillRect(0, floorY - 10, W, 2);
  // the stage dim, then the spotlight on the frame
  g.fillStyle = `rgba(6,2,6,${0.55 * (1 - o.house)})`; g.fillRect(0, 0, W, H);
  if (o.spot > 0.01) {
    const f = L.frame, cx = f.x + f.w / 2;
    g.save(); g.globalCompositeOperation = 'lighter';
    const cone = g.createLinearGradient(cx, 0, cx, f.y + f.h * 1.3);
    cone.addColorStop(0, `rgba(255,236,200,${0.0})`); cone.addColorStop(0.3, `rgba(255,236,200,${0.12 * o.spot})`); cone.addColorStop(1, `rgba(255,236,200,${0.22 * o.spot})`);
    g.fillStyle = cone; g.beginPath(); g.moveTo(cx - f.w * 0.12, 0); g.lineTo(cx + f.w * 0.12, 0); g.lineTo(cx + f.w * 0.85, f.y + f.h * 1.35); g.lineTo(cx - f.w * 0.85, f.y + f.h * 1.35); g.closePath(); g.fill();
    g.globalAlpha = o.spot * 0.6; g.drawImage(glowSprite('rgba(255,225,170,1)'), cx - f.w, f.y - f.h * 0.2, f.w * 2, f.h * 1.6);
    g.restore();
    // dust in the beam
    g.save(); g.fillStyle = `rgba(255,240,210,${0.45 * o.spot})`;
    for (let i = 0; i < 30; i++) { const u = hash(i * 3.3), v = (hash(i * 7.1) + o.t * 0.03 * (0.4 + hash(i))) % 1; const y = v * (f.y + f.h * 1.2), x = cx + (u - 0.5) * (f.w * 0.2 + y / (f.y + f.h) * f.w * 1.4); g.fillRect(x, y, 1.5, 1.5); }
    g.restore();
  }
  // curtains
  const cur = o.curtain ?? 0;
  if (cur > 0.001) {
    const cw = W * 0.52 * cur;
    for (const side of [0, 1]) {
      g.save(); if (side) { g.translate(W, 0); g.scale(-1, 1); }
      const gr = g.createLinearGradient(0, 0, cw, 0); for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? '#8f1d33' : '#5c1020');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-2, 0); g.lineTo(cw, 0); g.quadraticCurveTo(cw * 0.9, H * 0.5, cw * 1.02, H); g.lineTo(-2, H); g.closePath(); g.fill();
      g.restore();
    }
  }
  // valance
  const vh = Math.max(16, H * 0.045);
  g.fillStyle = '#5c1020'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, vh * 0.7);
  for (let i = 12; i >= 0; i--) { const x = (i / 12) * W; g.quadraticCurveTo(x + W / 24, vh * 1.2, x, vh * 0.7); }
  g.closePath(); g.fill();
  g.strokeStyle = '#d9a441'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, vh * 0.35); g.lineTo(W, vh * 0.35); g.stroke();
  return L;
}

/** The easel + gilded frame with the drawing. `cloth` 1 = covered by the velvet cloth, 0 = revealed. */
export function drawFrame(g: CanvasRenderingContext2D, f: { x: number; y: number; w: number; h: number }, strokes: Stroke[], o: { t: number; cloth: number; boil: number; plaque?: string; sub?: string; tilt?: number; seed?: number; tape?: number; easel?: boolean }) {
  const { x, y, w, h } = f;
  g.save();
  g.translate(x + w / 2, y + h / 2); g.rotate(o.tilt || 0); g.translate(-(x + w / 2), -(y + h / 2));
  // easel legs
  if (o.easel !== false) {
    g.strokeStyle = '#5b3a22'; g.lineWidth = Math.max(3, w * 0.035); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + w * 0.22, y + h * 0.8); g.lineTo(x + w * 0.08, y + h * 1.32); g.moveTo(x + w * 0.78, y + h * 0.8); g.lineTo(x + w * 0.92, y + h * 1.32); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h * 1.25); g.stroke();
  }
  // gilded frame
  const b = w * 0.085;
  const gold = g.createLinearGradient(x, y, x + w, y + h); gold.addColorStop(0, '#f6d77a'); gold.addColorStop(0.3, '#b8862e'); gold.addColorStop(0.55, '#ffe9a8'); gold.addColorStop(0.8, '#9c6b1f'); gold.addColorStop(1, '#e8c060');
  g.fillStyle = 'rgba(0,0,0,0.45)'; rrect(g, x + 4, y + 8, w, h, 6); g.fill();
  g.fillStyle = gold; rrect(g, x, y, w, h, 6); g.fill();
  g.strokeStyle = 'rgba(90,60,10,.6)'; g.lineWidth = 2; rrect(g, x + b * 0.5, y + b * 0.5, w - b, h - b, 4); g.stroke();
  // ornament dots
  g.fillStyle = 'rgba(255,245,200,.7)'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.arc(x + w / 2 + Math.cos(a) * (w / 2 - b * 0.45), y + h / 2 + Math.sin(a) * (h / 2 - b * 0.45), Math.max(1, b * 0.08), 0, Math.PI * 2); g.fill(); }
  // paper
  const px = x + b, py = y + b, pw = w - b * 2, ph = h - b * 2;
  g.fillStyle = '#f7efe0'; g.fillRect(px, py, pw, ph);
  const sz = Math.min(pw, ph);
  g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
  drawStrokes(g, strokes, px + (pw - sz) / 2, py + (ph - sz) / 2, sz, { t: o.t, boil: o.boil, seed: o.seed || 0 });
  // Patch's "restoration": strips of tape
  if (o.tape && o.tape > 0) { g.globalAlpha = Math.min(1, o.tape); g.fillStyle = 'rgba(240,230,190,.85)'; g.save(); g.translate(px + pw * 0.3, py + ph * 0.55); g.rotate(-0.5); g.fillRect(-pw * 0.18, -ph * 0.035, pw * 0.36, ph * 0.07); g.restore(); g.save(); g.translate(px + pw * 0.7, py + ph * 0.3); g.rotate(0.6); g.fillRect(-pw * 0.14, -ph * 0.03, pw * 0.28, ph * 0.06); g.restore(); g.globalAlpha = 1; }
  g.restore();
  // velvet cloth over it (pulled up and away)
  if (o.cloth > 0.001) {
    const k = o.cloth;
    g.save(); g.beginPath(); g.rect(x - 10, y - 10, w + 20, (h + 20) * k); g.clip();
    const cl = g.createLinearGradient(x, y, x + w, y); for (let i = 0; i <= 6; i++) cl.addColorStop(i / 6, i % 2 ? '#7a1830' : '#4d0c1c');
    g.fillStyle = cl; g.beginPath(); g.moveTo(x - 8, y - 8); g.lineTo(x + w + 8, y - 8); g.lineTo(x + w + 12, y + h * k + 10); for (let i = 6; i >= 0; i--) g.quadraticCurveTo(x + (i + 0.5) * (w + 24) / 7 - 12, y + h * k + 26, x + i * (w + 24) / 7 - 12, y + h * k + 10); g.closePath(); g.fill();
    g.restore();
  }
  g.restore();
  // brass plaque under the frame
  if (o.plaque) {
    const pr = plaqueRect(f), pw2 = pr.w, ph2 = pr.h, bx = pr.x, by = pr.y;
    const br = g.createLinearGradient(bx, by, bx, by + ph2); br.addColorStop(0, '#e9c46a'); br.addColorStop(1, '#a8781e');
    g.fillStyle = br; rrect(g, bx, by, pw2, ph2, 4); g.fill();
    g.fillStyle = '#3a2508'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 700 ${Math.round(ph2 * 0.36)}px 'Playfair Display', Georgia, serif`; g.fillText(o.plaque, bx + pw2 / 2, by + ph2 * (o.sub ? 0.36 : 0.5), pw2 * 0.92);
    if (o.sub) { g.font = `600 ${Math.round(ph2 * 0.26)}px Fredoka, system-ui, sans-serif`; g.fillText(o.sub, bx + pw2 / 2, by + ph2 * 0.74, pw2 * 0.92); }
  }
}

/** A numbered bidding paddle. `up` 0 = resting on the lap, 1 = held high. */
export function drawPaddle(g: CanvasRenderingContext2D, x: number, y: number, s: number, num: number | string, up: number, wave = 0, hi = false) {
  const lift = up * s * 1.15;
  g.save(); g.translate(x, y - lift); g.rotate(-0.15 + Math.sin(wave) * 0.12 * up);
  g.strokeStyle = '#6b4423'; g.lineWidth = Math.max(2, s * 0.12); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, s * 0.3); g.lineTo(0, s * 1.15); g.stroke();
  g.fillStyle = hi ? '#ffe9a8' : '#fbf3e3'; g.strokeStyle = hi ? '#d9a441' : '#8a6a3a'; g.lineWidth = Math.max(1.5, s * 0.06);
  g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 0.48, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#3a2508'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${Math.round(s * 0.42)}px 'Playfair Display', Georgia, serif`;
  g.fillText(String(num), 0, s * 0.02);
  g.restore();
}

/** The brass price board: the number climbs, the auctioneer's absurd conversion underneath. */
export function drawBoard(g: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h?: number }, price: string, sub: string, flash: number, label = 'CURRENT BID') {
  const h = b.h || Math.max(46, b.w * 0.22), x = b.x - b.w / 2, y = b.y;
  const br = g.createLinearGradient(x, y, x, y + h); br.addColorStop(0, '#3a1a10'); br.addColorStop(1, '#1d0a06');
  g.fillStyle = br; rrect(g, x, y, b.w, h, 10); g.fill();
  g.strokeStyle = '#d9a441'; g.lineWidth = 2; rrect(g, x + 2, y + 2, b.w - 4, h - 4, 8); g.stroke();
  if (flash > 0) { g.save(); g.globalAlpha = flash * 0.5; g.fillStyle = '#ffd98f'; rrect(g, x, y, b.w, h, 10); g.fill(); g.restore(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(233,196,106,.85)'; g.font = `700 ${Math.round(h * 0.17)}px Fredoka, system-ui, sans-serif`; g.fillText(label, b.x, y + h * 0.18);
  g.fillStyle = '#ffe9a8'; g.font = `800 ${Math.round(h * 0.4)}px 'Playfair Display', Georgia, serif`; g.fillText(price, b.x, y + h * 0.52, b.w * 0.92);
  if (sub) { g.fillStyle = 'rgba(255,233,168,.8)'; g.font = `600 ${Math.round(h * 0.16)}px Fredoka, system-ui, sans-serif`; g.fillText(sub, b.x, y + h * 0.84, b.w * 0.92); }
  return h;
}

/** A rubber-stamp word ("SOLD!", "GOING ONCE…") that thumps in. */
export function drawStamp(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, rot: number, k: number, col = '#e63946') {
  if (k <= 0) return;
  const s = 1 + Math.max(0, 1 - k * 4) * 1.6;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = Math.min(1, k * 4);
  g.font = `900 ${Math.round(size)}px 'Playfair Display', Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(text).width;
  g.strokeStyle = col; g.lineWidth = Math.max(3, size * 0.08); rrect(g, -tw / 2 - size * 0.3, -size * 0.62, tw + size * 0.6, size * 1.24, size * 0.16); g.stroke();
  g.fillStyle = col; g.fillText(text, 0, size * 0.04);
  g.restore();
}

/** The auctioneer's lectern (drawn in front of the auctioneer) with the gavel resting on it; `bang` 0..1 swings it. */
export function drawPodium(g: CanvasRenderingContext2D, x: number, y: number, r: number, bang: number) {
  const w = r * 1.9, h = r * 1.15, top = y - h;
  g.save();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y + r * 0.04, w * 0.62, r * 0.12, 0, 0, Math.PI * 2); g.fill();
  const wood = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); wood.addColorStop(0, '#4a2412'); wood.addColorStop(0.5, '#7a3f1d'); wood.addColorStop(1, '#3d1d0e');
  g.fillStyle = wood; g.beginPath(); g.moveTo(x - w * 0.5, top); g.lineTo(x + w * 0.5, top); g.lineTo(x + w * 0.4, y); g.lineTo(x - w * 0.4, y); g.closePath(); g.fill();
  g.fillStyle = '#c99a3e'; g.fillRect(x - w * 0.55, top - r * 0.08, w * 1.1, r * 0.1);
  g.strokeStyle = 'rgba(217,164,65,.7)'; g.lineWidth = Math.max(1.5, r * 0.04); rrect(g, x - w * 0.3, top + h * 0.22, w * 0.6, h * 0.5, r * 0.06); g.stroke();
  // the gavel: lifted, then down with a bang
  const a = -0.25 - Math.sin(Math.min(1, bang) * Math.PI) * 1.1;
  g.translate(x + w * 0.32, top - r * 0.04); g.rotate(a);
  g.fillStyle = '#7a4a26'; rrect(g, -r * 0.04, -r * 0.62, r * 0.08, r * 0.62, r * 0.03); g.fill();
  g.fillStyle = '#9c5f30'; rrect(g, -r * 0.24, -r * 0.8, r * 0.48, r * 0.22, r * 0.06); g.fill();
  g.fillStyle = '#d9a441'; g.fillRect(-r * 0.16, -r * 0.8, r * 0.04, r * 0.22); g.fillRect(r * 0.12, -r * 0.8, r * 0.04, r * 0.22);
  g.restore();
}
/** The red dot a gallery sticks on the frame when something sells. */
export function drawSoldDot(g: CanvasRenderingContext2D, f: Rect, k: number) {
  if (k <= 0) return;
  const r = f.w * 0.055 * Math.min(1, k * 3) * (1 + Math.max(0, 0.3 - k) * 2);
  g.save(); g.fillStyle = '#e63946'; g.beginPath(); g.arc(f.x + f.w * 0.9, f.y + f.h * 0.94, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(f.x + f.w * 0.9 - r * 0.3, f.y + f.h * 0.94 - r * 0.3, r * 0.3, 0, Math.PI * 2); g.fill(); g.restore();
}

/* ============ the Museum of Glorious Messes ============ */
export interface Exhibit { strokes: Stroke[]; title: string; sub: string; mine: boolean; seed: number; price: string; small?: boolean; tag?: string; }
/** The gallery seen from the side; `camX` scrolls (in exhibit spacings). Returns screen rects of the exhibits. The
 * "small" exhibit is the artist's own price tag on a velvet cushion, under a glass dome, on a marble plinth. */
export function drawMuseum(g: CanvasRenderingContext2D, W: number, H: number, camX: number, ex: Exhibit[], o: { t: number; laser?: number; light?: number }) {
  const port = W / H < 0.8;
  const wallH = H * (port ? 0.66 : 0.7);
  const spacing = port ? W * 0.95 : W * 0.42;
  const wall = g.createLinearGradient(0, 0, 0, wallH); wall.addColorStop(0, '#e9e0d0'); wall.addColorStop(1, '#d6c8b0');
  g.fillStyle = wall; g.fillRect(0, 0, W, wallH);
  // wall panels drift past with the camera
  const pw = spacing * 0.5, off = -((camX * spacing) % pw);
  g.strokeStyle = 'rgba(140,120,90,.22)'; g.lineWidth = Math.max(1, W * 0.002);
  for (let x = off - pw; x < W + pw; x += pw) { rrect(g, x + pw * 0.08, wallH * 0.12, pw * 0.84, wallH * 0.6, 4); g.stroke(); }
  // crown molding, picture rail, wainscot
  g.fillStyle = '#c4b393'; g.fillRect(0, 0, W, H * 0.035); g.fillStyle = '#a8946e'; g.fillRect(0, H * 0.035, W, 3);
  g.fillStyle = '#a8946e'; g.fillRect(0, wallH * 0.09, W, 2);
  const wy = wallH * 0.8;
  const wn = g.createLinearGradient(0, wy, 0, wallH); wn.addColorStop(0, '#6e1529'); wn.addColorStop(1, '#4a0d1e'); g.fillStyle = wn; g.fillRect(0, wy, W, wallH - wy);
  g.fillStyle = '#c99a3e'; g.fillRect(0, wy - 3, W, 3);
  // marble floor
  const fl = g.createLinearGradient(0, wallH, 0, H); fl.addColorStop(0, '#d8d2c8'); fl.addColorStop(1, '#9d958a'); g.fillStyle = fl; g.fillRect(0, wallH, W, H - wallH);
  g.strokeStyle = 'rgba(120,110,100,.25)'; g.lineWidth = 1;
  const tile = spacing * 0.25, toff = -((camX * spacing) % tile);
  for (let x = toff - tile * 4; x < W + tile * 4; x += tile) { g.beginPath(); g.moveTo(x, wallH); g.lineTo(x - (W / 2 - x) * 0.7, H); g.stroke(); }
  for (let k = 1; k < 5; k++) { const y = wallH + (H - wallH) * (k * k) / 25; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#3a0917'; g.fillRect(0, wallH - 5, W, 5);
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  ex.forEach((e, i) => {
    const cx = W / 2 + (i - camX) * spacing;
    if (e.small) {
      // a marble plinth with your own price tag on a cushion, under glass
      const base = wallH + (H - wallH) * 0.5, colW = port ? W * 0.34 : W * 0.13, colH = (base - wallH) + wallH * 0.22;
      const top = base - colH, domeW = colW * 1.05, domeH = domeW * 0.92;
      rects.push({ x: cx - domeW / 2, y: top - domeH, w: domeW, h: domeH + colH });
      if (cx < -spacing || cx > W + spacing) return;
      g.save();
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.drawImage(glowSprite('rgba(255,236,190,1)'), cx - domeW * 1.4, top - domeH * 1.9, domeW * 2.8, domeH * 2.6); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(cx, base, colW * 0.8, colW * 0.12, 0, 0, Math.PI * 2); g.fill();
      const mb = g.createLinearGradient(cx - colW / 2, 0, cx + colW / 2, 0); mb.addColorStop(0, '#d9d4cc'); mb.addColorStop(0.45, '#fbf9f5'); mb.addColorStop(1, '#bdb6aa');
      g.fillStyle = mb; g.fillRect(cx - colW * 0.42, top + colW * 0.12, colW * 0.84, colH - colW * 0.2);
      g.fillRect(cx - colW / 2, top, colW, colW * 0.14); g.fillRect(cx - colW / 2, base - colW * 0.1, colW, colW * 0.1);
      g.strokeStyle = 'rgba(150,140,125,.35)'; g.lineWidth = 1.5; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cx - colW * 0.42 + k * colW * 0.21, top + colW * 0.16); g.lineTo(cx - colW * 0.42 + k * colW * 0.21, base - colW * 0.12); g.stroke(); }
      // the cushion and the tag
      g.fillStyle = '#7a1830'; g.beginPath(); g.ellipse(cx, top - colW * 0.04, colW * 0.4, colW * 0.12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9b2340'; g.beginPath(); g.ellipse(cx, top - colW * 0.08, colW * 0.36, colW * 0.08, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(cx, top - domeH * 0.32); g.rotate(-0.14);
      const tw = domeW * 0.7, th = tw * 0.44;
      g.fillStyle = '#fff3c4'; g.strokeStyle = '#8a6a3a'; g.lineWidth = Math.max(1.5, tw * 0.02);
      g.beginPath(); g.moveTo(-tw / 2, -th / 2); g.lineTo(tw * 0.3, -th / 2); g.lineTo(tw / 2, 0); g.lineTo(tw * 0.3, th / 2); g.lineTo(-tw / 2, th / 2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(tw * 0.3, 0, th * 0.08, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a2508'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${Math.round(th * 0.62)}px 'Playfair Display', Georgia, serif`; g.fillText(e.price, -tw * 0.08, th * 0.04, tw * 0.66);
      g.restore();
      // the glass dome
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1.5, domeW * 0.012);
      g.fillStyle = 'rgba(220,235,245,.16)';
      g.beginPath(); g.moveTo(cx - domeW / 2, top - colW * 0.02); g.lineTo(cx - domeW / 2, top - domeH * 0.55); g.quadraticCurveTo(cx - domeW / 2, top - domeH, cx, top - domeH); g.quadraticCurveTo(cx + domeW / 2, top - domeH, cx + domeW / 2, top - domeH * 0.55); g.lineTo(cx + domeW / 2, top - colW * 0.02); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(cx - domeW * 0.28, top - domeH * 0.62, domeW * 0.05, domeH * 0.2, 0.15, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c99a3e'; g.beginPath(); g.arc(cx, top - domeH - domeW * 0.04, domeW * 0.045, 0, Math.PI * 2); g.fill();
      g.restore();
      // the wall card behind it
      const cw = Math.max(colW * 2.1, Math.min(240, W * 0.5)), chh = Math.max(36, wallH * 0.075);
      g.fillStyle = '#fbf8f1'; g.strokeStyle = '#b5a481'; g.lineWidth = 1; rrect(g, cx - cw / 2, wallH * 0.2, cw, chh, 3); g.fill(); g.stroke();
      g.fillStyle = '#2b2416'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `italic 700 ${Math.round(chh * 0.3)}px 'Playfair Display', Georgia, serif`; g.fillText(e.title, cx, wallH * 0.2 + chh * 0.34, cw * 0.92);
      g.font = `600 ${Math.round(chh * 0.24)}px Fredoka, system-ui, sans-serif`; g.fillText(e.sub, cx, wallH * 0.2 + chh * 0.72, cw * 0.92);
      return;
    }
    const fw = port ? Math.min(W * 0.64, wallH * 0.5) : Math.min(W * 0.26, wallH * 0.52);
    const fh = fw * 1.12;
    const fx = cx - fw / 2, fy = wallH * 0.17;
    rects.push({ x: fx, y: fy, w: fw, h: fh });
    if (cx < -spacing || cx > W + spacing) return;
    // picture light
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.28; g.drawImage(glowSprite('rgba(255,240,200,1)'), cx - fw * 1.1, fy - fh * 0.4, fw * 2.2, fh * 1.7); g.restore();
    g.fillStyle = '#3a3026'; g.fillRect(cx - fw * 0.2, fy - wallH * 0.05, fw * 0.4, wallH * 0.016);
    drawFrame(g, { x: fx, y: fy, w: fw, h: fh }, e.strokes, { t: o.t + i * 0.37, cloth: 0, boil: Math.max(1, fw * 0.006), seed: e.seed, easel: false });
    // plaque card on the wall
    const pw2 = Math.max(fw * 0.85, Math.min(240, W * 0.42)), ph = Math.max(36, fh * 0.16);
    const px = cx - pw2 / 2, py = fy + fh + wallH * 0.04;
    g.fillStyle = '#fbf8f1'; g.strokeStyle = '#b5a481'; g.lineWidth = 1; rrect(g, px, py, pw2, ph, 3); g.fill(); g.stroke();
    g.fillStyle = '#2b2416'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 700 ${Math.round(ph * 0.3)}px 'Playfair Display', Georgia, serif`; g.fillText(e.title, cx, py + ph * 0.34, pw2 * 0.92);
    g.font = `600 ${Math.round(ph * 0.24)}px Fredoka, system-ui, sans-serif`; g.fillText(e.sub, cx, py + ph * 0.72, pw2 * 0.92);
    // velvet rope, brass posts and a laser grid in front of yours
    if (e.mine) {
      const ry = wallH + (H - wallH) * 0.3;
      if (o.laser) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,40,60,${0.5 * o.laser})`; g.lineWidth = Math.max(1.5, W * 0.003); for (let k = 0; k < 7; k++) { const a = fy + (k / 6) * (wallH - fy); g.beginPath(); g.moveTo(cx - fw * 0.95, a + Math.sin(o.t * 2 + k) * 4); g.lineTo(cx + fw * 0.95, a + fh * 0.18 * Math.cos(k + o.t * 0.7)); g.stroke(); } g.restore(); }
      g.strokeStyle = '#8f1d33'; g.lineWidth = Math.max(5, W * 0.012); g.beginPath(); g.moveTo(cx - fw * 0.66, ry); g.quadraticCurveTo(cx, ry + H * 0.04, cx + fw * 0.66, ry); g.stroke();
      for (const sd of [-1, 1]) { g.fillStyle = '#c99a3e'; g.fillRect(cx + sd * fw * 0.66 - 4, ry - 6, 8, (H - ry) * 0.7); g.beginPath(); g.arc(cx + sd * fw * 0.66, ry - 8, Math.max(6, W * 0.012), 0, Math.PI * 2); g.fill(); }
    }
  });
  // vignette + grain
  const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,20,20,.4)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const gt = grainTile(); g.save(); g.globalAlpha = 0.3; for (let y = 0; y < H; y += 128) for (let x = 0; x < W; x += 128) g.drawImage(gt, x, y); g.restore();
  return { rects, wallH, spacing };
}

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
