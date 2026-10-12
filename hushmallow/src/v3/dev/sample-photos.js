// DEV / QA ONLY — seven procedurally painted stand-in "photos" (a portrait,
// a chat screenshot, a sunset, a mug, a city, a cat, a two-person selfie)
// so photo rituals can be tested without anyone's real pictures.

const TAU = Math.PI * 2;
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function grain(g, w, h, a = 10, seed = 1) {
  const d = g.getImageData(0, 0, w, h), p = d.data;
  let s = seed * 9301 + 49297;
  for (let i = 0; i < p.length; i += 4) { s = (s * 9301 + 49297) % 233280; const n = (s / 233280 - 0.5) * a; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  g.putImageData(d, 0, 0);
}
function bokeh(g, w, h, cols, n, seed) {
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, rad = 10 + r() * 40, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, cols[i % cols.length] + '55'); gr.addColorStop(1, cols[i % cols.length] + '00'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); }
  g.restore();
}
function face(g, x, y, s, skin, hair, { smile = 1, tilt = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.fillStyle = hair; g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.62, s * 0.7, 0, 0, TAU); g.fill();
  g.fillStyle = skin; g.beginPath(); g.ellipse(0, s * 0.95, s * 0.36, s * 0.4, 0, 0, TAU); g.fill();
  const fg = g.createRadialGradient(-s * 0.15, -s * 0.15, s * 0.1, 0, 0, s * 0.6); fg.addColorStop(0, '#ffffff22'); fg.addColorStop(1, '#00000022');
  g.fillStyle = skin; g.beginPath(); g.ellipse(0, 0, s * 0.46, s * 0.58, 0, 0, TAU); g.fill(); g.fillStyle = fg; g.fill();
  g.fillStyle = hair; g.beginPath(); g.ellipse(0, -s * 0.46, s * 0.5, s * 0.22, 0, Math.PI, TAU); g.fill();
  g.fillStyle = '#2b1d16';
  for (const ex of [-1, 1]) { g.beginPath(); g.ellipse(ex * s * 0.17, -s * 0.05, s * 0.055, s * 0.07, 0, 0, TAU); g.fill(); g.fillStyle = '#ffffffcc'; g.beginPath(); g.arc(ex * s * 0.17 + s * 0.015, -s * 0.07, s * 0.018, 0, TAU); g.fill(); g.fillStyle = '#2b1d16'; }
  g.strokeStyle = '#7a3b2e'; g.lineWidth = s * 0.035; g.lineCap = 'round';
  g.beginPath(); g.arc(0, s * 0.18, s * 0.16, 0.2 * Math.PI, 0.8 * Math.PI * smile + 0.2 * (1 - smile)); g.stroke();
  g.fillStyle = '#ff8a8a44'; for (const ex of [-1, 1]) { g.beginPath(); g.ellipse(ex * s * 0.27, s * 0.12, s * 0.08, s * 0.05, 0, 0, TAU); g.fill(); }
  g.restore();
}

const PAINTERS = [
  function portrait(g, w, h) {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#7aa8d8'); bg.addColorStop(1, '#2a4a7a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    bokeh(g, w, h, ['#ffe7a8', '#a8d8ff', '#ffffff'], 26, 3);
    g.fillStyle = '#c0504d'; g.beginPath(); g.ellipse(w / 2, h * 1.02, w * 0.46, h * 0.36, 0, 0, TAU); g.fill();
    face(g, w / 2, h * 0.42, w * 0.42, '#e8b48f', '#3a2418');
  },
  function screenshot(g, w, h) {
    g.fillStyle = '#f4f5f8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h * 0.09); g.fillStyle = '#d0d4dc'; g.fillRect(0, h * 0.09, w, 2);
    g.fillStyle = '#9aa3b5'; g.beginPath(); g.arc(w * 0.1, h * 0.045, h * 0.025, 0, TAU); g.fill();
    g.fillStyle = '#333a48'; g.font = `600 ${h * 0.03}px sans-serif`; g.fillText('Sam', w * 0.17, h * 0.055);
    const bub = (y, right, lines, col) => { const bw = w * (0.45 + lines * 0.08), bx = right ? w - bw - w * 0.05 : w * 0.05, bh = h * (0.04 + lines * 0.035); g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(bx, y, bw, bh, 18) : g.rect(bx, y, bw, bh); g.fill(); g.fillStyle = right ? '#ffffffcc' : '#55607588'; for (let i = 0; i < lines; i++) g.fillRect(bx + 14, y + 14 + i * h * 0.035, bw * (0.8 - i * 0.18), h * 0.012); return y + bh + h * 0.025; };
    let y = h * 0.13; y = bub(y, false, 2, '#e3e6ee'); y = bub(y, true, 1, '#3b82f6'); y = bub(y, false, 3, '#e3e6ee'); y = bub(y, true, 2, '#3b82f6'); y = bub(y, false, 1, '#e3e6ee'); bub(y, false, 2, '#e3e6ee');
    g.fillStyle = '#ffffff'; g.fillRect(0, h * 0.91, w, h * 0.09); g.fillStyle = '#e6e8ee'; g.beginPath(); g.ellipse(w * 0.45, h * 0.955, w * 0.36, h * 0.025, 0, 0, TAU); g.fill();
  },
  function sunset(g, w, h) {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.62); sky.addColorStop(0, '#2b2a6b'); sky.addColorStop(0.55, '#e0607a'); sky.addColorStop(1, '#ffb36b'); g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.62);
    const sun = g.createRadialGradient(w * 0.6, h * 0.58, 0, w * 0.6, h * 0.58, w * 0.3); sun.addColorStop(0, '#fff2c0'); sun.addColorStop(0.2, '#ffd27a'); sun.addColorStop(1, '#ffd27a00'); g.fillStyle = sun; g.fillRect(0, 0, w, h);
    const sea = g.createLinearGradient(0, h * 0.62, 0, h); sea.addColorStop(0, '#d06a6a'); sea.addColorStop(1, '#1f2f5a'); g.fillStyle = sea; g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = '#ffe2a855'; for (let i = 0; i < 26; i++) g.fillRect(w * 0.6 - (30 + i * 3) + Math.sin(i) * 20, h * 0.63 + i * 9, 60 + i * 6, 3);
    g.fillStyle = '#1a1030'; g.beginPath(); g.moveTo(0, h * 0.64); g.quadraticCurveTo(w * 0.2, h * 0.55, w * 0.35, h * 0.64); g.fill();
  },
  function mug(g, w, h) {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#d8c3a8'); bg.addColorStop(0.6, '#b89a7a'); bg.addColorStop(1, '#6a4a32'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a3a24'; g.fillRect(0, h * 0.68, w, h * 0.32);
    g.fillStyle = '#00000033'; g.beginPath(); g.ellipse(w * 0.5, h * 0.8, w * 0.3, h * 0.05, 0, 0, TAU); g.fill();
    const body = g.createLinearGradient(w * 0.28, 0, w * 0.68, 0); body.addColorStop(0, '#2f7f8f'); body.addColorStop(0.35, '#5fc0cf'); body.addColorStop(1, '#1f5f6f');
    g.fillStyle = body; g.beginPath(); g.moveTo(w * 0.3, h * 0.38); g.lineTo(w * 0.66, h * 0.38); g.lineTo(w * 0.63, h * 0.78); g.quadraticCurveTo(w * 0.48, h * 0.82, w * 0.33, h * 0.78); g.fill();
    g.strokeStyle = '#2f7f8f'; g.lineWidth = w * 0.05; g.beginPath(); g.arc(w * 0.7, h * 0.56, w * 0.09, -1.2, 1.2); g.stroke();
    g.fillStyle = '#3a2214'; g.beginPath(); g.ellipse(w * 0.48, h * 0.385, w * 0.175, h * 0.03, 0, 0, TAU); g.fill();
    g.strokeStyle = '#ffffff55'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(w * (0.42 + i * 0.06), h * 0.34); g.bezierCurveTo(w * (0.38 + i * 0.06), h * 0.26, w * (0.48 + i * 0.06), h * 0.22, w * (0.44 + i * 0.06), h * 0.14); g.stroke(); }
  },
  function city(g, w, h) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0b0f2a'); sky.addColorStop(1, '#3a2a5a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 18; i++) { const bw = w * (0.05 + r() * 0.08), bx = (i / 18) * w + r() * 10, bh = h * (0.25 + r() * 0.45); g.fillStyle = `hsl(${240 + r() * 30},25%,${12 + r() * 10}%)`; g.fillRect(bx, h - bh, bw, bh); for (let y = h - bh + 8; y < h - 6; y += 14) for (let x = bx + 5; x < bx + bw - 6; x += 10) if (r() < 0.45) { g.fillStyle = r() < 0.7 ? '#ffd98a' : '#9fe6ff'; g.fillRect(x, y, 5, 7); } }
    g.fillStyle = '#ffffffcc'; g.beginPath(); g.arc(w * 0.8, h * 0.15, w * 0.05, 0, TAU); g.fill();
  },
  function cat(g, w, h) {
    const bg = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w); bg.addColorStop(0, '#f2e3c8'); bg.addColorStop(1, '#a88a6a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e08a3a'; g.beginPath(); g.ellipse(w / 2, h * 0.78, w * 0.34, h * 0.26, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(w / 2, h * 0.45, w * 0.28, h * 0.22, 0, 0, TAU); g.fill();
    for (const ex of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + ex * w * 0.24, h * 0.36); g.lineTo(w / 2 + ex * w * 0.2, h * 0.16); g.lineTo(w / 2 + ex * w * 0.06, h * 0.28); g.fill(); }
    g.strokeStyle = '#b8601e'; g.lineWidth = 6; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(w / 2 + i * w * 0.07, h * 0.26); g.lineTo(w / 2 + i * w * 0.05, h * 0.34); g.stroke(); }
    for (const ex of [-1, 1]) { g.fillStyle = '#7fc24a'; g.beginPath(); g.ellipse(w / 2 + ex * w * 0.1, h * 0.44, w * 0.05, h * 0.035, 0, 0, TAU); g.fill(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.ellipse(w / 2 + ex * w * 0.1, h * 0.44, w * 0.012, h * 0.03, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#ff9aa2'; g.beginPath(); g.moveTo(w / 2 - 10, h * 0.5); g.lineTo(w / 2 + 10, h * 0.5); g.lineTo(w / 2, h * 0.52); g.fill();
  },
  function selfie(g, w, h) {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#9be0b0'); bg.addColorStop(1, '#2f8a6a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    bokeh(g, w, h, ['#ffffff', '#fff2a8'], 30, 11);
    g.fillStyle = '#6a5acd'; g.beginPath(); g.ellipse(w * 0.32, h * 1.02, w * 0.3, h * 0.34, 0, 0, TAU); g.fill();
    g.fillStyle = '#f0a030'; g.beginPath(); g.ellipse(w * 0.7, h * 1.02, w * 0.3, h * 0.34, 0, 0, TAU); g.fill();
    face(g, w * 0.32, h * 0.46, w * 0.3, '#c98a5e', '#1e140e', { tilt: -0.12 });
    face(g, w * 0.69, h * 0.44, w * 0.3, '#f2c9a6', '#8a5a2a', { tilt: 0.1 });
  },
];
const SIZES = [[600, 760], [520, 960], [900, 620], [700, 700], [880, 600], [640, 640], [820, 640]];

/** n (1–7) painted test photos as canvases. */
export function samplePhotos(n = 3) {
  return PAINTERS.slice(0, Math.max(0, Math.min(7, n))).map((paint, i) => {
    const [w, h] = SIZES[i];
    const c = cv(w, h), g = c.getContext('2d', { willReadFrequently: true });
    paint(g, w, h);
    grain(g, w, h, 12, i + 1);
    return c;
  });
}
