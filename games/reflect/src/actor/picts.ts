/* Pictograms for Bubble speech and thought bubbles. Drawn with paths (no emoji fonts needed, so they look the same on
 * every device). Each draws centred on 0,0 inside a box of `s` pixels. */
export type Pict = (g: CanvasRenderingContext2D, s: number) => void;

/** Rounded rectangle path (falls back to a plain rectangle where roundRect is missing). */
export function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  if ((g as any).roundRect) (g as any).roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
}
const star = (g: CanvasRenderingContext2D, r: number, inner = 0.45, n = 5) => {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r * inner : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath();
};
export const heartPath = (g: CanvasRenderingContext2D, s: number) => {
  g.beginPath();
  g.moveTo(0, s * 0.32);
  g.bezierCurveTo(-s * 0.55, -s * 0.05, -s * 0.3, -s * 0.5, 0, -s * 0.2);
  g.bezierCurveTo(s * 0.3, -s * 0.5, s * 0.55, -s * 0.05, 0, s * 0.32);
  g.closePath();
};

export { star as starPath };

export const PICTS: Record<string, Pict> = {
  heart: (g, s) => { heartPath(g, s); g.fillStyle = '#ff5d8f'; g.fill(); },
  bang: (g, s) => { g.fillStyle = '#ff4d4d'; rrect(g, -s * 0.09, -s * 0.42, s * 0.18, s * 0.56, s * 0.08); g.fill(); g.beginPath(); g.arc(0, s * 0.32, s * 0.1, 0, Math.PI * 2); g.fill(); },
  q: (g, s) => { g.strokeStyle = '#5a4bd6'; g.lineWidth = s * 0.14; g.lineCap = 'round'; g.beginPath(); g.arc(0, -s * 0.12, s * 0.2, Math.PI * 1.1, Math.PI * 0.45); g.lineTo(0, s * 0.14); g.stroke(); g.fillStyle = '#5a4bd6'; g.beginPath(); g.arc(0, s * 0.34, s * 0.08, 0, Math.PI * 2); g.fill(); },
  star: (g, s) => { star(g, s * 0.42); g.fillStyle = '#ffc93c'; g.fill(); },
  stars: (g, s) => { for (const [x, y, r] of [[-0.22, 0.05, 0.22], [0.22, -0.12, 0.17], [0.12, 0.26, 0.12]]) { g.save(); g.translate(x * s, y * s); star(g, r * s); g.fillStyle = '#ffc93c'; g.fill(); g.restore(); } },
  zzz: (g, s) => { g.fillStyle = '#5a6bd6'; g.font = `800 ${s * 0.42}px Fredoka, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('z', -s * 0.18, s * 0.12); g.font = `800 ${s * 0.3}px Fredoka, system-ui, sans-serif`; g.fillText('z', s * 0.12, -s * 0.12); },
  note: (g, s) => { g.fillStyle = '#5a4bd6'; g.beginPath(); g.ellipse(-s * 0.12, s * 0.22, s * 0.14, s * 0.1, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(-s * 0.01, -s * 0.35, s * 0.07, s * 0.58); g.beginPath(); g.moveTo(s * 0.06, -s * 0.35); g.quadraticCurveTo(s * 0.32, -s * 0.22, s * 0.24, 0); g.lineTo(s * 0.06, -s * 0.16); g.fill(); },
  skull: (g, s) => {
    g.fillStyle = '#f4f0ea'; g.beginPath(); g.arc(0, -s * 0.06, s * 0.3, Math.PI, 0); g.lineTo(s * 0.3, s * 0.12); g.lineTo(s * 0.16, s * 0.18); g.lineTo(s * 0.16, s * 0.32); g.lineTo(-s * 0.16, s * 0.32); g.lineTo(-s * 0.16, s * 0.18); g.lineTo(-s * 0.3, s * 0.12); g.closePath(); g.fill();
    g.fillStyle = '#2b2346'; g.beginPath(); g.arc(-s * 0.12, -s * 0.03, s * 0.08, 0, Math.PI * 2); g.arc(s * 0.12, -s * 0.03, s * 0.08, 0, Math.PI * 2); g.fill();
    g.fillRect(-s * 0.08, s * 0.2, s * 0.03, s * 0.1); g.fillRect(-s * 0.015, s * 0.2, s * 0.03, s * 0.1); g.fillRect(s * 0.05, s * 0.2, s * 0.03, s * 0.1);
  },
  coin: (g, s) => {
    const gr = g.createRadialGradient(-s * 0.1, -s * 0.12, s * 0.04, 0, 0, s * 0.34); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.6, '#ffc93c'); gr.addColorStop(1, '#c98a12');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 0.32, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(140,90,10,.6)'; g.lineWidth = s * 0.04; g.beginPath(); g.arc(0, 0, s * 0.24, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(140,90,10,.75)'; g.beginPath(); g.arc(0, 0, s * 0.1, 0, Math.PI * 2); g.fill();
  },
  moon: (g, s) => { g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(0, 0, s * 0.34, 0.6, Math.PI * 2 - 0.6); g.arc(s * 0.16, -s * 0.06, s * 0.27, Math.PI * 2 - 1.0, 1.0, true); g.closePath(); g.fill(); },
  pickle: (g, s) => {
    g.save(); g.rotate(-0.6);
    g.fillStyle = '#7cb342'; g.beginPath(); g.ellipse(0, 0, s * 0.18, s * 0.4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#558b2f'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc((i % 2) * s * 0.06, i * s * 0.1, s * 0.03, 0, Math.PI * 2); g.fill(); }
    g.restore();
  },
  sweat: (g, s) => { g.fillStyle = '#8fd3ff'; g.beginPath(); g.moveTo(0, -s * 0.35); g.quadraticCurveTo(s * 0.28, s * 0.05, 0, s * 0.3); g.quadraticCurveTo(-s * 0.28, s * 0.05, 0, -s * 0.35); g.fill(); },
  again: (g, s) => {
    g.strokeStyle = '#2ea86a'; g.lineWidth = s * 0.12; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, s * 0.26, -Math.PI * 0.2, Math.PI * 1.35); g.stroke();
    g.fillStyle = '#2ea86a'; g.beginPath(); const a = -Math.PI * 0.2, x = Math.cos(a) * s * 0.26, y = Math.sin(a) * s * 0.26; g.moveTo(x + s * 0.16, y); g.lineTo(x - s * 0.06, y - s * 0.14); g.lineTo(x - s * 0.04, y + s * 0.14); g.fill();
  },
  tea: (g, s) => {
    g.fillStyle = '#fff8ef'; g.beginPath(); g.moveTo(-s * 0.26, -s * 0.08); g.lineTo(s * 0.2, -s * 0.08); g.quadraticCurveTo(s * 0.18, s * 0.28, -s * 0.03, s * 0.28); g.quadraticCurveTo(-s * 0.24, s * 0.28, -s * 0.26, -s * 0.08); g.fill();
    g.strokeStyle = '#fff8ef'; g.lineWidth = s * 0.06; g.beginPath(); g.arc(s * 0.24, s * 0.06, s * 0.08, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.fillStyle = '#b5743a'; g.beginPath(); g.ellipse(-s * 0.03, -s * 0.07, s * 0.2, s * 0.04, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(-s * 0.08, -s * 0.18); g.quadraticCurveTo(-s * 0.02, -s * 0.28, -s * 0.08, -s * 0.38); g.moveTo(s * 0.04, -s * 0.18); g.quadraticCurveTo(s * 0.1, -s * 0.28, s * 0.04, -s * 0.38); g.stroke();
  },
  camera: (g, s) => {
    g.fillStyle = '#2b2346'; rrect(g, -s * 0.32, -s * 0.18, s * 0.64, s * 0.42, s * 0.06); g.fill(); g.fillRect(-s * 0.12, -s * 0.28, s * 0.22, s * 0.12);
    g.fillStyle = '#7fd8ff'; g.beginPath(); g.arc(0, s * 0.03, s * 0.13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.04, -s * 0.01, s * 0.04, 0, Math.PI * 2); g.fill();
  },
  clock: (g, s) => {
    g.fillStyle = '#fff8ef'; g.strokeStyle = '#d0455a'; g.lineWidth = s * 0.07; g.beginPath(); g.arc(0, s * 0.03, s * 0.3, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#d0455a'; g.beginPath(); g.arc(-s * 0.22, -s * 0.28, s * 0.09, 0, Math.PI * 2); g.arc(s * 0.22, -s * 0.28, s * 0.09, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2b2346'; g.lineWidth = s * 0.05; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, s * 0.03); g.lineTo(0, -s * 0.15); g.moveTo(0, s * 0.03); g.lineTo(s * 0.13, s * 0.08); g.stroke();
  },
  chat: (g, s) => { g.fillStyle = '#7fd8ff'; rrect(g, -s * 0.34, -s * 0.28, s * 0.68, s * 0.46, s * 0.14); g.fill(); g.beginPath(); g.moveTo(-s * 0.14, s * 0.16); g.lineTo(-s * 0.24, s * 0.34); g.lineTo(s * 0.02, s * 0.16); g.fill(); PICTS.dots(g, s * 0.8); },
  work: (g, s) => {
    g.fillStyle = '#8d5a3b'; rrect(g, -s * 0.34, -s * 0.16, s * 0.68, s * 0.44, s * 0.06); g.fill();
    g.strokeStyle = '#8d5a3b'; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(-s * 0.12, -s * 0.16); g.lineTo(-s * 0.12, -s * 0.3); g.lineTo(s * 0.12, -s * 0.3); g.lineTo(s * 0.12, -s * 0.16); g.stroke();
    g.fillStyle = '#e8c07a'; g.fillRect(-s * 0.05, s * 0.0, s * 0.1, s * 0.08);
  },
  plus: (g, s) => { g.fillStyle = '#ff6b6b'; rrect(g, -s * 0.09, -s * 0.3, s * 0.18, s * 0.6, s * 0.04); g.fill(); rrect(g, -s * 0.3, -s * 0.09, s * 0.6, s * 0.18, s * 0.04); g.fill(); },
  mouth: (g, s) => {
    g.fillStyle = '#ff6f91'; g.beginPath(); g.moveTo(-s * 0.32, 0); g.quadraticCurveTo(-s * 0.1, -s * 0.2, 0, -s * 0.08); g.quadraticCurveTo(s * 0.1, -s * 0.2, s * 0.32, 0); g.quadraticCurveTo(0, s * 0.3, -s * 0.32, 0); g.fill();
    g.strokeStyle = '#a3234a'; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(-s * 0.3, 0); g.quadraticCurveTo(0, s * 0.06, s * 0.3, 0); g.stroke();
  },
  eye: (g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, s * 0.34, s * 0.22, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#2b2346'; g.lineWidth = s * 0.04; g.stroke(); g.fillStyle = '#2b2346'; g.beginPath(); g.arc(s * 0.04, s * 0.02, s * 0.12, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 0.08, -s * 0.03, s * 0.04, 0, Math.PI * 2); g.fill(); },
  bulb: (g, s) => {
    const gr = g.createRadialGradient(0, -s * 0.08, s * 0.02, 0, -s * 0.08, s * 0.3); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(1, '#ffd166');
    g.fillStyle = gr; g.beginPath(); g.arc(0, -s * 0.08, s * 0.24, Math.PI * 0.8, Math.PI * 0.2); g.lineTo(s * 0.1, s * 0.18); g.lineTo(-s * 0.1, s * 0.18); g.closePath(); g.fill();
    g.fillStyle = '#8a8f99'; g.fillRect(-s * 0.1, s * 0.18, s * 0.2, s * 0.12);
  },
  duck: (g, s) => {
    g.fillStyle = '#ffd93b'; g.beginPath(); g.ellipse(-s * 0.04, s * 0.1, s * 0.3, s * 0.18, 0, 0, Math.PI * 2); g.arc(s * 0.1, -s * 0.14, s * 0.15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff8f00'; g.beginPath(); g.moveTo(s * 0.22, -s * 0.14); g.quadraticCurveTo(s * 0.38, -s * 0.15, s * 0.36, -s * 0.07); g.lineTo(s * 0.22, -s * 0.08); g.fill();
    g.fillStyle = '#263238'; g.beginPath(); g.arc(s * 0.14, -s * 0.18, s * 0.028, 0, Math.PI * 2); g.fill();
  },
  mask: (g, s) => {
    g.fillStyle = '#3a2a6a'; g.beginPath(); g.moveTo(-s * 0.4, -s * 0.06); g.quadraticCurveTo(-s * 0.36, -s * 0.24, -s * 0.12, -s * 0.2); g.quadraticCurveTo(0, -s * 0.16, s * 0.12, -s * 0.2); g.quadraticCurveTo(s * 0.36, -s * 0.24, s * 0.4, -s * 0.06); g.quadraticCurveTo(s * 0.36, s * 0.16, s * 0.12, s * 0.12); g.quadraticCurveTo(0, s * 0.04, -s * 0.12, s * 0.12); g.quadraticCurveTo(-s * 0.36, s * 0.16, -s * 0.4, -s * 0.06); g.fill();
    g.strokeStyle = '#ffd166'; g.lineWidth = s * 0.035; g.lineCap = 'round';
    for (const d of [-1, 1]) { g.beginPath(); g.arc(d * s * 0.17, -s * 0.02, s * 0.09, 0.2, Math.PI - 0.2); g.stroke(); }
    g.strokeStyle = '#3a2a6a'; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(-s * 0.4, -s * 0.06); g.lineTo(-s * 0.48, -s * 0.1); g.moveTo(s * 0.4, -s * 0.06); g.lineTo(s * 0.48, -s * 0.1); g.stroke();
  },
  gavel: (g, s) => {
    g.save(); g.rotate(-0.6);
    g.fillStyle = '#7a4a26'; rrect(g, -s * 0.05, -s * 0.05, s * 0.1, s * 0.48, s * 0.04); g.fill();
    g.fillStyle = '#9c5f30'; rrect(g, -s * 0.3, -s * 0.24, s * 0.6, s * 0.22, s * 0.06); g.fill();
    g.fillStyle = '#d9a441'; g.fillRect(-s * 0.2, -s * 0.24, s * 0.05, s * 0.22); g.fillRect(s * 0.15, -s * 0.24, s * 0.05, s * 0.22);
    g.restore();
  },
  tape: (g, s) => {
    g.fillStyle = '#e9dcb0'; g.beginPath(); g.arc(0, 0, s * 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fffaf2'; g.beginPath(); g.arc(0, 0, s * 0.13, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(233,220,176,.95)'; g.fillRect(s * 0.18, s * 0.1, s * 0.26, s * 0.12);
  },
  pencil: (g, s) => {
    g.save(); g.rotate(0.7);
    g.fillStyle = '#ffc93c'; g.fillRect(-s * 0.07, -s * 0.36, s * 0.14, s * 0.52);
    g.fillStyle = '#ff8fb3'; g.fillRect(-s * 0.07, -s * 0.44, s * 0.14, s * 0.08);
    g.fillStyle = '#f2d2a9'; g.beginPath(); g.moveTo(-s * 0.07, s * 0.16); g.lineTo(s * 0.07, s * 0.16); g.lineTo(0, s * 0.36); g.closePath(); g.fill();
    g.fillStyle = '#2b2440'; g.beginPath(); g.moveTo(-s * 0.025, s * 0.29); g.lineTo(s * 0.025, s * 0.29); g.lineTo(0, s * 0.36); g.closePath(); g.fill();
    g.restore();
  },
  dots: (g, s) => { g.fillStyle = '#5a4bd6'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * s * 0.2, 0, s * 0.07, 0, Math.PI * 2); g.fill(); } }
};
