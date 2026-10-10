/* Shadow Monsters — the toybox. Fourteen ridiculous household objects, each drawn twice from the same geometry:
 *   sil(g)   the exact silhouette (what the lamp turns into a monster), holes included — a doughnut's hole and the
 *            scissors' handles let light through and become glowing eyes;
 *   paint(g) the object itself under warm light, for the table, the lights-up reveal and the share card.
 * Geometry is in a unit box centred on 0,0: height 1 (y from -0.5 at the top to 0.5 at the bottom), width = aspect. */

export type ObjId = 'fork' | 'croissant' | 'glove' | 'slipper' | 'teapot' | 'doughnut' | 'broccoli' | 'whisk' | 'scissors'
  | 'cactus' | 'banana' | 'duck' | 'umbrella' | 'duster';

export interface ObjDef {
  id: ObjId; name: string;
  h: number; aspect: number;        // real height (m) and width/height
  stick: number;                    // centre height above the table (m) when mounted on its puppet stick
  part: 'claw' | 'eye' | 'body' | 'horn' | 'hair' | 'cute';
  sil: (g: CanvasRenderingContext2D) => void;   // fills/strokes with the caller's style
  paint: (g: CanvasRenderingContext2D) => void;
}

/* ---- path helpers (subpaths only; the caller decides when to fill) ---- */
function rrp(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circ(g: CanvasRenderingContext2D, x: number, y: number, r: number, ccw = false) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2, ccw); g.closePath(); }
function ell(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0, ccw = false) { g.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2, ccw); g.closePath(); }
const lin = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
const rad = (g: CanvasRenderingContext2D, x: number, y: number, r0: number, r1: number, stops: [number, string][], fx?: number, fy?: number) => { const gr = g.createRadialGradient(fx ?? x, fy ?? y, r0, x, y, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
function outline(g: CanvasRenderingContext2D, w = 0.012, col = 'rgba(40,24,30,0.55)') { g.lineWidth = w; g.strokeStyle = col; g.lineJoin = 'round'; g.stroke(); }

/* ---------------- the objects ---------------- */

// FORK — four tines become a crown of claws
function forkPath(g: CanvasRenderingContext2D) {
  const tw = 0.026, gap = 0.016, n = 4, total = n * tw + (n - 1) * gap, x0 = -total / 2;
  g.moveTo(x0, -0.5);
  for (let i = 0; i < n; i++) {
    const a = x0 + i * (tw + gap);
    g.lineTo(a, -0.5); g.quadraticCurveTo(a + tw / 2, -0.515, a + tw, -0.5);
    if (i < n - 1) { g.lineTo(a + tw, -0.25); g.quadraticCurveTo(a + tw + gap / 2, -0.235, a + tw + gap, -0.25); }
  }
  g.lineTo(-x0, -0.2); g.quadraticCurveTo(-x0, -0.12, 0.024, -0.08); g.lineTo(0.022, 0.05);
  g.quadraticCurveTo(0.03, 0.3, 0.042, 0.42); g.quadraticCurveTo(0.044, 0.5, 0, 0.5); g.quadraticCurveTo(-0.044, 0.5, -0.042, 0.42);
  g.quadraticCurveTo(-0.03, 0.3, -0.022, 0.05); g.lineTo(-0.024, -0.08); g.quadraticCurveTo(x0, -0.12, x0, -0.2); g.closePath();
}
const fork: ObjDef = {
  id: 'fork', name: 'Fork', h: 0.16, aspect: 0.16, stick: 0.14, part: 'claw',
  sil: (g) => { g.beginPath(); forkPath(g); g.fill(); },
  paint: (g) => {
    g.beginPath(); forkPath(g);
    g.fillStyle = lin(g, -0.08, 0, 0.08, 0, [[0, '#8d97a8'], [0.35, '#eef2f7'], [0.55, '#c4ccd8'], [1, '#6f7a8c']]); g.fill(); outline(g, 0.01, 'rgba(40,46,60,.6)');
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.008; g.beginPath(); g.moveTo(-0.008, 0.06); g.lineTo(-0.012, 0.4); g.stroke();
  }
};

// CROISSANT — a buttery crescent: horns when flipped, a moustache when sideways
function croissantPath(g: CanvasRenderingContext2D) {
  g.moveTo(-1.18, 0.34);
  g.bezierCurveTo(-1.05, -0.05, -0.75, -0.42, -0.36, -0.5);
  g.bezierCurveTo(-0.12, -0.56, 0.12, -0.56, 0.36, -0.5);
  g.bezierCurveTo(0.75, -0.42, 1.05, -0.05, 1.18, 0.34);
  g.bezierCurveTo(1.1, 0.4, 0.98, 0.36, 0.86, 0.26);
  g.bezierCurveTo(0.6, 0.02, 0.3, -0.06, 0, -0.06);
  g.bezierCurveTo(-0.3, -0.06, -0.6, 0.02, -0.86, 0.26);
  g.bezierCurveTo(-0.98, 0.36, -1.1, 0.4, -1.18, 0.34); g.closePath();
}
const croissant: ObjDef = {
  id: 'croissant', name: 'Croissant', h: 0.06, aspect: 2.4, stick: 0.17, part: 'horn',
  sil: (g) => { g.beginPath(); croissantPath(g); g.fill(); },
  paint: (g) => {
    g.beginPath(); croissantPath(g);
    g.fillStyle = rad(g, 0, -0.4, 0.05, 1.3, [[0, '#ffd27a'], [0.45, '#e39a3b'], [1, '#9a5a1c']]); g.fill(); outline(g, 0.02, 'rgba(90,44,10,.55)');
    g.strokeStyle = 'rgba(120,62,16,.55)'; g.lineWidth = 0.03; g.lineCap = 'round';
    for (const x of [-0.62, -0.25, 0.12, 0.5]) { g.beginPath(); g.moveTo(x - 0.06, -0.42); g.quadraticCurveTo(x + 0.1, -0.25, x + 0.02, -0.06); g.stroke(); }
    g.fillStyle = 'rgba(255,240,200,.45)'; g.beginPath(); ell(g, -0.2, -0.38, 0.28, 0.06, -0.1); g.fill();
  }
};

// RUBBER GLOVE — inflated, five fingers spread: a hand, a crown, a cockscomb
function glovePath(g: CanvasRenderingContext2D) {
  const fingers: [number, number, number, number][] = [[-0.21, -0.27, 0.075, 0.42], [-0.08, -0.33, 0.08, 0.5], [0.06, -0.3, 0.078, 0.48], [0.19, -0.24, 0.072, 0.4]];
  for (const [x, top, w, h] of fingers) rrp(g, x - w / 2, top - 0.17, w, h * 0.62, w / 2);
  g.save(); g.translate(-0.24, 0.05); g.rotate(-0.85); rrp(g, -0.04, -0.2, 0.08, 0.27, 0.04); g.restore();
  ell(g, 0, 0.02, 0.27, 0.24);
  g.moveTo(-0.15, 0.2); g.lineTo(0.15, 0.2); g.lineTo(0.2, 0.5); g.lineTo(-0.2, 0.5); g.closePath();
}
const glove: ObjDef = {
  id: 'glove', name: 'Rubber glove', h: 0.2, aspect: 0.62, stick: 0.13, part: 'claw',
  sil: (g) => { g.beginPath(); glovePath(g); g.fill('nonzero'); },
  paint: (g) => {
    g.beginPath(); glovePath(g);
    g.fillStyle = rad(g, -0.08, -0.1, 0.02, 0.6, [[0, '#fff6a8'], [0.5, '#ffd83b'], [1, '#d99e00']]); g.fill('nonzero');
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); ell(g, -0.1, -0.05, 0.05, 0.1, -0.3); g.fill();
    g.fillStyle = '#ff8fb3'; g.beginPath(); rrp(g, -0.2, 0.44, 0.4, 0.06, 0.02); g.fill();
    g.strokeStyle = 'rgba(160,110,0,.45)'; g.lineWidth = 0.012; g.beginPath(); g.moveTo(-0.15, 0.3); g.lineTo(0.15, 0.3); g.stroke();
  }
};

// FUZZY BUNNY SLIPPER — a long snout with two ears: an instant creature head
function slipperPath(g: CanvasRenderingContext2D) {
  g.moveTo(-1.15, 0.42);
  g.bezierCurveTo(-1.2, 0.1, -1.0, -0.12, -0.6, -0.16);
  g.bezierCurveTo(-0.2, -0.2, 0.25, -0.28, 0.55, -0.22);
  g.bezierCurveTo(0.95, -0.12, 1.2, 0.08, 1.18, 0.34);
  g.bezierCurveTo(1.16, 0.48, 1.0, 0.5, 0.8, 0.5);
  g.lineTo(-1.0, 0.5); g.bezierCurveTo(-1.12, 0.5, -1.15, 0.47, -1.15, 0.42); g.closePath();
  ell(g, 0.42, -0.42, 0.11, 0.3, -0.35);
  ell(g, 0.72, -0.4, 0.1, 0.27, 0.4);
}
const slipper: ObjDef = {
  id: 'slipper', name: 'Bunny slipper', h: 0.09, aspect: 2.4, stick: 0.1, part: 'body',
  sil: (g) => { g.beginPath(); slipperPath(g); g.fill('nonzero'); },
  paint: (g) => {
    g.beginPath(); slipperPath(g);
    g.fillStyle = rad(g, 0.2, -0.2, 0.05, 1.3, [[0, '#ffe8f0'], [0.6, '#f7b6cf'], [1, '#c77b9c']]); g.fill('nonzero');
    g.fillStyle = '#ff9dc0'; g.beginPath(); ell(g, 0.42, -0.42, 0.05, 0.19, -0.35); ell(g, 0.72, -0.4, 0.045, 0.17, 0.4); g.fill();
    g.fillStyle = '#5a3a48'; g.beginPath(); circ(g, 0.86, -0.02, 0.05); circ(g, 1.04, 0.0, 0.045); g.fill();
    g.fillStyle = '#ff6f91'; g.beginPath(); ell(g, 1.12, 0.12, 0.06, 0.045); g.fill();
    g.fillStyle = '#a76a86'; g.beginPath(); rrp(g, -1.1, 0.42, 2.2, 0.08, 0.04); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 0.025; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const x = -0.9 + i * 0.2; g.beginPath(); g.moveTo(x, -0.1 + Math.sin(i) * 0.03); g.lineTo(x + 0.04, -0.17 + Math.sin(i) * 0.03); g.stroke(); }
  }
};

// TEAPOT — a round head with a trunk; the handle loop is an eye-hole
function teapotBody(g: CanvasRenderingContext2D) {
  g.moveTo(-0.42, 0.06);
  g.bezierCurveTo(-0.44, -0.24, -0.25, -0.33, 0, -0.33);
  g.bezierCurveTo(0.25, -0.33, 0.44, -0.24, 0.42, 0.06);
  // spout
  g.bezierCurveTo(0.5, -0.02, 0.6, -0.1, 0.66, -0.3); g.lineTo(0.78, -0.33); g.lineTo(0.74, -0.24);
  g.bezierCurveTo(0.66, -0.05, 0.56, 0.12, 0.4, 0.22);
  g.bezierCurveTo(0.34, 0.4, 0.2, 0.46, 0, 0.46);
  g.lineTo(-0.16, 0.46); g.bezierCurveTo(-0.3, 0.46, -0.36, 0.4, -0.4, 0.3);
  // handle (outer)
  g.bezierCurveTo(-0.62, 0.32, -0.76, 0.18, -0.74, 0.02); g.bezierCurveTo(-0.72, -0.16, -0.56, -0.2, -0.42, -0.14);
  g.lineTo(-0.42, 0.06); g.closePath();
  // lid + knob
  g.moveTo(-0.24, -0.31); g.bezierCurveTo(-0.2, -0.42, 0.2, -0.42, 0.24, -0.31); g.closePath();
  circ(g, 0, -0.45, 0.055);
  // base
  g.moveTo(-0.26, 0.44); g.lineTo(0.26, 0.44); g.lineTo(0.3, 0.5); g.lineTo(-0.3, 0.5); g.closePath();
}
function teapotHole(g: CanvasRenderingContext2D) { ell(g, -0.57, 0.06, 0.1, 0.13, 0, true); }
const teapot: ObjDef = {
  id: 'teapot', name: 'Teapot', h: 0.14, aspect: 1.6, stick: 0.1, part: 'body',
  sil: (g) => { g.beginPath(); teapotBody(g); g.fill('nonzero'); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); teapotHole(g); g.fill(); g.restore(); },
  paint: (g) => {
    g.beginPath(); teapotBody(g); teapotHole(g);
    g.fillStyle = rad(g, -0.1, -0.15, 0.03, 0.8, [[0, '#d7f3ff'], [0.5, '#6fc3e8'], [1, '#2c7aa3']]); g.fill('evenodd');
    outline(g, 0.012, 'rgba(20,60,90,.5)');
    g.fillStyle = '#fff'; for (const [x, y] of [[-0.18, 0.05], [0.1, 0.18], [0.2, -0.08], [-0.05, -0.18], [-0.28, 0.25]] as [number, number][]) { g.beginPath(); for (let k = 0; k < 5; k++) circ(g, x + Math.cos(k * 1.256) * 0.035, y + Math.sin(k * 1.256) * 0.035, 0.025); g.fill(); g.fillStyle = '#ffd166'; g.beginPath(); circ(g, x, y, 0.02); g.fill(); g.fillStyle = '#fff'; }
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); ell(g, -0.2, -0.16, 0.07, 0.04, -0.5); g.fill();
  }
};

// DOUGHNUT — on its edge; the hole lets the light through: a glowing eye
function donutOuter(g: CanvasRenderingContext2D) { circ(g, 0, 0, 0.5); }
function donutHole(g: CanvasRenderingContext2D) { circ(g, 0.01, 0, 0.16, true); }
const doughnut: ObjDef = {
  id: 'doughnut', name: 'Doughnut', h: 0.09, aspect: 1, stick: 0.16, part: 'eye',
  sil: (g) => { g.beginPath(); donutOuter(g); donutHole(g); g.fill('evenodd'); },
  paint: (g) => {
    g.beginPath(); donutOuter(g); donutHole(g); g.fillStyle = rad(g, -0.1, -0.1, 0.05, 0.55, [[0, '#f6c07a'], [1, '#b06c2a']]); g.fill('evenodd');
    g.beginPath(); g.moveTo(-0.46, -0.06); for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; g.lineTo(Math.cos(a) * (0.47 - (i % 2) * 0.05), Math.sin(a) * (0.47 - (i % 2) * 0.05) + 0.06); } g.lineTo(0.46, 0.0); g.arc(0.01, 0, 0.21, 0, Math.PI, true); g.closePath();
    g.fillStyle = '#ff7eb6'; g.fill();
    const sp = ['#fff', '#7fd8ff', '#ffe066', '#a6f0a0'];
    for (let i = 0; i < 14; i++) { const a = Math.PI * (1.05 + (i / 14) * 0.9), r = 0.28 + (i % 3) * 0.05; g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.rotate(i * 1.3); g.fillStyle = sp[i % 4]; g.fillRect(-0.03, -0.008, 0.06, 0.016); g.restore(); }
  }
};

// BROCCOLI — a crown of florets: hair, a brain, a tree of doom
function brocPath(g: CanvasRenderingContext2D) {
  const fl: [number, number, number][] = [[-0.24, -0.16, 0.17], [0, -0.3, 0.2], [0.24, -0.16, 0.17], [-0.12, -0.04, 0.15], [0.13, -0.04, 0.15], [-0.3, 0.0, 0.12], [0.3, 0.0, 0.12], [0.0, -0.1, 0.15]];
  for (const [x, y, r] of fl) circ(g, x, y, r);
  g.moveTo(-0.12, 0.05); g.lineTo(0.12, 0.05); g.lineTo(0.09, 0.47); g.quadraticCurveTo(0, 0.52, -0.09, 0.47); g.closePath();
}
const broccoli: ObjDef = {
  id: 'broccoli', name: 'Broccoli', h: 0.14, aspect: 0.86, stick: 0.15, part: 'hair',
  sil: (g) => { g.beginPath(); brocPath(g); g.fill('nonzero'); },
  paint: (g) => {
    g.fillStyle = lin(g, 0, 0, 0, 0.5, [[0, '#9ccc65'], [1, '#c5e1a5']]); g.beginPath(); g.moveTo(-0.12, 0.05); g.lineTo(0.12, 0.05); g.lineTo(0.09, 0.47); g.quadraticCurveTo(0, 0.52, -0.09, 0.47); g.closePath(); g.fill();
    const fl: [number, number, number][] = [[-0.3, 0.0, 0.12], [0.3, 0.0, 0.12], [-0.24, -0.16, 0.17], [0.24, -0.16, 0.17], [-0.12, -0.04, 0.15], [0.13, -0.04, 0.15], [0.0, -0.1, 0.15], [0, -0.3, 0.2]];
    for (const [x, y, r] of fl) { g.fillStyle = rad(g, x - r * 0.3, y - r * 0.3, r * 0.1, r, [[0, '#8bc34a'], [1, '#2e7d32']]); g.beginPath(); circ(g, x, y, r); g.fill(); g.fillStyle = 'rgba(20,70,25,.35)'; for (let k = 0; k < 5; k++) { g.beginPath(); circ(g, x + Math.cos(k * 2.4) * r * 0.5, y + Math.sin(k * 2.4) * r * 0.5, r * 0.12); g.fill(); } }
  }
};

// WHISK — wire loops: a cage, ribs, a skeleton hand
const whisk: ObjDef = {
  id: 'whisk', name: 'Whisk', h: 0.21, aspect: 0.32, stick: 0.13, part: 'claw',
  sil: (g) => {
    g.beginPath(); rrp(g, -0.035, 0.1, 0.07, 0.4, 0.03); g.fill();
    g.lineWidth = 0.022; g.beginPath();
    for (const k of [-1, -0.55, -0.15, 0.15, 0.55, 1]) { g.moveTo(0, 0.12); g.bezierCurveTo(k * 0.2, 0.05, k * 0.17, -0.45, 0, -0.5); }
    g.stroke();
  },
  paint: (g) => {
    g.fillStyle = lin(g, -0.04, 0, 0.04, 0, [[0, '#c0392b'], [0.5, '#ff7a6b'], [1, '#922b21']]); g.beginPath(); rrp(g, -0.035, 0.1, 0.07, 0.4, 0.03); g.fill();
    g.strokeStyle = '#d6dde6'; g.lineWidth = 0.016; g.beginPath();
    for (const k of [-1, -0.55, -0.15, 0.15, 0.55, 1]) { g.moveTo(0, 0.12); g.bezierCurveTo(k * 0.2, 0.05, k * 0.17, -0.45, 0, -0.5); }
    g.stroke(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.006; g.stroke();
  }
};

// SCISSORS — open blades are jaws; the handle rings are two eyes
function scissorsPath(g: CanvasRenderingContext2D) {
  g.save(); g.translate(0, 0.02);
  for (const s of [-1, 1]) {
    g.save(); g.rotate(s * 0.32);
    g.moveTo(-0.025, 0); g.lineTo(0.025, 0); g.quadraticCurveTo(0.04, -0.3, 0.004, -0.52); g.quadraticCurveTo(-0.03, -0.3, -0.025, 0); g.closePath();
    g.restore();
  }
  g.restore();
  for (const s of [-1, 1]) ell(g, s * 0.13, 0.3, 0.12, 0.17, s * 0.35);
}
function scissorsHoles(g: CanvasRenderingContext2D) { for (const s of [-1, 1]) ell(g, s * 0.13, 0.3, 0.075, 0.115, s * 0.35, true); }
const scissors: ObjDef = {
  id: 'scissors', name: 'Scissors', h: 0.15, aspect: 0.62, stick: 0.13, part: 'eye',
  sil: (g) => { g.beginPath(); scissorsPath(g); g.fill('nonzero'); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); scissorsHoles(g); g.fill(); g.restore(); },
  paint: (g) => {
    g.beginPath(); for (const s of [-1, 1]) { ell(g, s * 0.13, 0.3, 0.12, 0.17, s * 0.35); } scissorsHoles(g); g.fillStyle = '#ff6f3c'; g.fill('evenodd');
    g.save(); g.translate(0, 0.02);
    for (const s of [-1, 1]) { g.save(); g.rotate(s * 0.32); g.beginPath(); g.moveTo(-0.025, 0); g.lineTo(0.025, 0); g.quadraticCurveTo(0.04, -0.3, 0.004, -0.52); g.quadraticCurveTo(-0.03, -0.3, -0.025, 0); g.closePath(); g.fillStyle = lin(g, -0.03, 0, 0.03, 0, [[0, '#8d97a8'], [0.5, '#f4f7fb'], [1, '#7a8596']]); g.fill(); g.restore(); }
    g.restore(); g.fillStyle = '#4a4f5c'; g.beginPath(); circ(g, 0, 0.03, 0.025); g.fill();
  }
};

// CACTUS — arms up, spikes everywhere: instant monster
function cactusPath(g: CanvasRenderingContext2D) {
  rrp(g, -0.11, -0.5, 0.22, 0.8, 0.11);
  g.moveTo(-0.11, 0.02); g.lineTo(-0.24, 0.02); g.quadraticCurveTo(-0.32, 0.02, -0.32, -0.08); g.lineTo(-0.32, -0.3); g.quadraticCurveTo(-0.32, -0.36, -0.26, -0.36); g.quadraticCurveTo(-0.2, -0.36, -0.2, -0.3); g.lineTo(-0.2, -0.1); g.lineTo(-0.11, -0.1); g.closePath();
  g.moveTo(0.11, -0.06); g.lineTo(0.24, -0.06); g.quadraticCurveTo(0.33, -0.06, 0.33, -0.16); g.lineTo(0.33, -0.36); g.quadraticCurveTo(0.33, -0.42, 0.27, -0.42); g.quadraticCurveTo(0.21, -0.42, 0.21, -0.36); g.lineTo(0.21, -0.18); g.lineTo(0.11, -0.18); g.closePath();
  g.moveTo(-0.2, 0.26); g.lineTo(0.2, 0.26); g.lineTo(0.16, 0.5); g.lineTo(-0.16, 0.5); g.closePath();
}
function cactusSpines(g: CanvasRenderingContext2D) {
  const sp: [number, number, number][] = [];
  for (let y = -0.44; y < 0.22; y += 0.08) { sp.push([-0.11, y, Math.PI]); sp.push([0.11, y + 0.04, 0]); }
  for (let y = -0.32; y < -0.06; y += 0.08) { sp.push([-0.32, y, Math.PI]); sp.push([0.33, y - 0.04, 0]); }
  sp.push([0, -0.5, -Math.PI / 2], [-0.26, -0.36, -Math.PI / 2], [0.27, -0.42, -Math.PI / 2]);
  g.beginPath();
  for (const [x, y, a] of sp) { g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 0.06, y + Math.sin(a) * 0.06); }
}
const cactus: ObjDef = {
  id: 'cactus', name: 'Cactus', h: 0.17, aspect: 0.74, stick: 0.1, part: 'body',
  sil: (g) => { g.beginPath(); cactusPath(g); g.fill('nonzero'); g.lineWidth = 0.014; cactusSpines(g); g.stroke(); },
  paint: (g) => {
    g.beginPath(); cactusPath(g); g.fillStyle = lin(g, -0.3, 0, 0.3, 0, [[0, '#2e7d32'], [0.45, '#66bb6a'], [1, '#1b5e20']]); g.fill('nonzero');
    g.fillStyle = '#d9653b'; g.beginPath(); g.moveTo(-0.2, 0.26); g.lineTo(0.2, 0.26); g.lineTo(0.16, 0.5); g.lineTo(-0.16, 0.5); g.closePath(); g.fill(); g.fillStyle = '#b84a26'; g.fillRect(-0.21, 0.24, 0.42, 0.06);
    g.strokeStyle = 'rgba(20,80,30,.6)'; g.lineWidth = 0.012; g.beginPath(); g.moveTo(-0.04, -0.44); g.lineTo(-0.04, 0.24); g.moveTo(0.04, -0.44); g.lineTo(0.04, 0.24); g.stroke();
    g.strokeStyle = '#fff8e1'; g.lineWidth = 0.01; cactusSpines(g); g.stroke();
    g.fillStyle = '#ff6f91'; g.beginPath(); circ(g, 0.03, -0.5, 0.05); g.fill();
  }
};

// BANANA — a curved horn, a claw, a grin
function bananaPath(g: CanvasRenderingContext2D) {
  g.moveTo(0.02, -0.5); g.lineTo(0.08, -0.47);
  g.bezierCurveTo(0.3, -0.25, 0.3, 0.2, 0.06, 0.46); g.lineTo(0.02, 0.5); g.lineTo(-0.04, 0.46);
  g.bezierCurveTo(0.12, 0.2, 0.1, -0.2, -0.06, -0.42); g.closePath();
}
const banana: ObjDef = {
  id: 'banana', name: 'Banana', h: 0.15, aspect: 0.42, stick: 0.14, part: 'horn',
  sil: (g) => { g.beginPath(); bananaPath(g); g.fill(); },
  paint: (g) => {
    g.beginPath(); bananaPath(g); g.fillStyle = lin(g, -0.05, 0, 0.25, 0, [[0, '#fff59d'], [0.5, '#ffd54f'], [1, '#d4a017']]); g.fill(); outline(g, 0.01, 'rgba(110,80,0,.5)');
    g.fillStyle = '#5d4037'; g.beginPath(); g.moveTo(0.02, -0.5); g.lineTo(0.08, -0.47); g.lineTo(0.06, -0.43); g.lineTo(0.0, -0.45); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0.02, 0.5); g.lineTo(-0.04, 0.46); g.lineTo(0.0, 0.44); g.closePath(); g.fill();
  }
};

// RUBBER DUCK — tiny, calm, Still's favourite. Its shadow is terrifying to absolutely no one… or is it?
function duckPath(g: CanvasRenderingContext2D) {
  ell(g, -0.04, 0.18, 0.5, 0.3);
  circ(g, 0.12, -0.22, 0.25);
  g.moveTo(0.33, -0.22); g.quadraticCurveTo(0.58, -0.24, 0.56, -0.12); g.quadraticCurveTo(0.45, -0.08, 0.33, -0.12); g.closePath();
  g.moveTo(-0.5, 0.06); g.quadraticCurveTo(-0.62, -0.12, -0.5, -0.12); g.quadraticCurveTo(-0.42, 0.0, -0.38, 0.08); g.closePath();
}
const duck: ObjDef = {
  id: 'duck', name: 'Rubber duck', h: 0.075, aspect: 1.2, stick: 0.08, part: 'cute',
  sil: (g) => { g.beginPath(); duckPath(g); g.fill('nonzero'); },
  paint: (g) => {
    g.beginPath(); ell(g, -0.04, 0.18, 0.5, 0.3); circ(g, 0.12, -0.22, 0.25); g.moveTo(-0.5, 0.06); g.quadraticCurveTo(-0.62, -0.12, -0.5, -0.12); g.quadraticCurveTo(-0.42, 0.0, -0.38, 0.08); g.closePath();
    g.fillStyle = rad(g, 0.0, -0.2, 0.05, 0.7, [[0, '#fff9c4'], [0.5, '#ffeb3b'], [1, '#f9a825']]); g.fill('nonzero');
    g.fillStyle = '#ff8f00'; g.beginPath(); g.moveTo(0.33, -0.22); g.quadraticCurveTo(0.58, -0.24, 0.56, -0.12); g.quadraticCurveTo(0.45, -0.08, 0.33, -0.12); g.closePath(); g.fill();
    g.fillStyle = '#263238'; g.beginPath(); circ(g, 0.2, -0.28, 0.045); g.fill(); g.fillStyle = '#fff'; g.beginPath(); circ(g, 0.21, -0.295, 0.015); g.fill();
    g.fillStyle = 'rgba(249,168,37,.55)'; g.beginPath(); ell(g, -0.12, 0.14, 0.2, 0.1, -0.3); g.fill();
  }
};

// UMBRELLA — open: bat wings
function umbrellaPath(g: CanvasRenderingContext2D) {
  g.moveTo(-0.55, -0.02);
  g.bezierCurveTo(-0.52, -0.38, -0.25, -0.5, 0, -0.5);
  g.bezierCurveTo(0.25, -0.5, 0.52, -0.38, 0.55, -0.02);
  const n = 6;
  for (let i = n; i > 0; i--) { const x1 = -0.55 + ((i - 1) / n) * 1.1, x0 = -0.55 + (i / n) * 1.1; g.quadraticCurveTo((x0 + x1) / 2, -0.12, x1, -0.02); }
  g.closePath();
  rrp(g, -0.012, -0.04, 0.024, 0.46, 0.01);
}
const umbrella: ObjDef = {
  id: 'umbrella', name: 'Umbrella', h: 0.26, aspect: 1.1, stick: 0.145, part: 'body',
  sil: (g) => { g.beginPath(); umbrellaPath(g); g.fill('nonzero'); g.lineWidth = 0.024; g.beginPath(); g.moveTo(0, 0.4); g.quadraticCurveTo(0, 0.5, -0.06, 0.5); g.quadraticCurveTo(-0.12, 0.5, -0.12, 0.44); g.stroke(); },
  paint: (g) => {
    g.save(); g.beginPath(); umbrellaPath(g); g.clip('nonzero');
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#7c4dff' : '#ff5d8f'; g.beginPath(); g.moveTo(0, -0.5); g.lineTo(-0.6 + i * 0.2, 0); g.lineTo(-0.4 + i * 0.2, 0); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-0.6, -0.5, 1.2, 0.2);
    g.restore();
    g.fillStyle = '#3b2b4f'; g.fillRect(-0.012, -0.04, 0.024, 0.46);
    g.strokeStyle = '#3b2b4f'; g.lineWidth = 0.024; g.beginPath(); g.moveTo(0, 0.4); g.quadraticCurveTo(0, 0.5, -0.06, 0.5); g.quadraticCurveTo(-0.12, 0.5, -0.12, 0.44); g.stroke();
  }
};

// FEATHER DUSTER — a wild mane
function dusterPlume(g: CanvasRenderingContext2D) {
  const n = 15;
  g.moveTo(0, -0.02);
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (1.05 + (i / n) * 0.9), r = 0.42 + ((i * 7) % 3) * 0.04;
    const ax = Math.cos(a) * r, ay = -0.08 + Math.sin(a) * r * 1.0;
    const a2 = a + (0.9 / n) * Math.PI * 0.5, r2 = 0.22;
    g.lineTo(ax, ay); g.lineTo(Math.cos(a2) * r2, -0.08 + Math.sin(a2) * r2 * 1.1);
  }
  g.closePath();
}
const duster: ObjDef = {
  id: 'duster', name: 'Feather duster', h: 0.26, aspect: 0.9, stick: 0.145, part: 'hair',
  sil: (g) => { g.beginPath(); dusterPlume(g); rrp(g, -0.025, -0.05, 0.05, 0.55, 0.02); g.fill('nonzero'); },
  paint: (g) => {
    g.beginPath(); dusterPlume(g); g.fillStyle = rad(g, 0, -0.2, 0.05, 0.5, [[0, '#ffb3d1'], [0.6, '#b388ff'], [1, '#5e35b1']]); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 0.008; g.beginPath(); for (let i = 0; i < 12; i++) { const a = Math.PI * (1.08 + i * 0.07); g.moveTo(0, -0.06); g.lineTo(Math.cos(a) * 0.38, -0.08 + Math.sin(a) * 0.38); } g.stroke();
    g.fillStyle = lin(g, -0.03, 0, 0.03, 0, [[0, '#6d4c41'], [0.5, '#a1887f'], [1, '#4e342e']]); g.beginPath(); rrp(g, -0.025, -0.05, 0.05, 0.55, 0.02); g.fill();
  }
};

export const OBJECTS: Record<ObjId, ObjDef> = { fork, croissant, glove, slipper, teapot, doughnut, broccoli, whisk, scissors, cactus, banana, duck, umbrella, duster };
export const OBJ_IDS = Object.keys(OBJECTS) as ObjId[];

/** A toybox object as a pictogram (for a Bubble's speech bubble). */
export function objPict(o: ObjId) { return (g: CanvasRenderingContext2D, sz: number) => { const spr = objSprite(o, 96); const k = Math.min(sz / spr.width, sz / spr.height) * 0.95; g.drawImage(spr, -spr.width * k / 2, -spr.height * k / 2, spr.width * k, spr.height * k); }; }

/* ---- cached sprites for the table, the tray and the reveal (vector paths are used for shadows) ---- */
const spriteCache = new Map<string, HTMLCanvasElement>();
/** The lit object as an image `px` pixels tall (cached). */
export function objSprite(id: ObjId, px = 160): HTMLCanvasElement {
  const key = id + ':' + px;
  let c = spriteCache.get(key);
  if (c) return c;
  const d = OBJECTS[id];
  const pad = Math.ceil(px * 0.08);
  c = document.createElement('canvas'); c.width = Math.ceil(px * d.aspect) + pad * 2; c.height = px + pad * 2;
  const g = c.getContext('2d')!;
  g.translate(c.width / 2, c.height / 2); g.scale(px, px);
  d.paint(g);
  spriteCache.set(key, c);
  return c;
}
