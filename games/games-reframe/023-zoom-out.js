/* 023 Zoom Out — Reframe · REFRAME · Beliefs / Evidence
 * Mechanism: correcting the mental filter and overgeneralising (Beck 1979; Burns 1980). Cropped tight, one bad moment
 * fills the frame and starts to feel like the whole story; zooming out restores the rest of the picture (the ordinary,
 * neutral and good moments a week also holds). At each zoom stop the player captions what is actually in view (fair:
 * not filtered, not falsely sunny), then zooms back in to the same moment under the fairer caption: same facts, new
 * story. When the worry is well founded the tile keeps its weight and gets a plan.
 * Verb: zoom (pinch, drag down and up, scroll, or +/-) through a giant mosaic of a week; tap a caption at each stop.
 * Finale: zoomed all the way out, the 1,728 tiles form a picture (today's: a sunrise, a whale, a treasure map...); they
 * flip in a wave from the rough moment outward and settle into one painting labelled with the fair thought.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const COLS = 36, ROWS = 48, NT = COLS * ROWS, MIN_PER = 10080 / NT; // one tile is about six minutes of a week
  const GROUT = '#17121b';
  const SCALE = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7', 'G7', 'A7'];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hex3 = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]; };
  const mixHex = (a, b, k) => { const x = hex3(a), y = hex3(b), f = (i) => Math.round(x[i] + (y[i] - x[i]) * k).toString(16).padStart(2, '0'); return '#' + f(0) + f(1) + f(2); };
  const rgba = (c, a) => { const x = hex3(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + (+a).toFixed(3) + ')'; };
  const lumOf = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const hash01 = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function hslOf(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; }
    return [h, s, l];
  }
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); };
  const ell = (g, x, y, rx, ry, rot) => { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); };
  function fixedRng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function glowAt(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }

  /* ---------------- the pictures a week can make (drawn, so they work at 36x48 tiles and as a full painting) ---------------- */
  function picSunrise(g, w, h) {
    const hz = h * 0.6;
    let gr = g.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, '#1b1442'); gr.addColorStop(0.3, '#46296e'); gr.addColorStop(0.56, '#b3456d'); gr.addColorStop(0.8, '#ff8448'); gr.addColorStop(1, '#ffc86a');
    g.fillStyle = gr; g.fillRect(0, 0, w, hz + 1);
    gr = g.createRadialGradient(w * 0.5, hz, 0, w * 0.5, hz, w * 0.72);
    gr.addColorStop(0, 'rgba(255,238,175,0.95)'); gr.addColorStop(0.3, 'rgba(255,196,112,0.5)'); gr.addColorStop(1, 'rgba(255,140,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, hz);
    g.fillStyle = 'rgba(255,168,190,0.6)';
    [[0.24, 0.2, 0.3, 0.02], [0.74, 0.29, 0.27, 0.017], [0.3, 0.42, 0.24, 0.014], [0.84, 0.47, 0.18, 0.012]].forEach(([x, y, rx, ry]) => { ell(g, w * x, h * y, w * rx, h * ry); g.fill(); });
    g.fillStyle = 'rgba(96,52,130,0.65)'; ell(g, w * 0.66, h * 0.12, w * 0.28, h * 0.018); g.fill(); ell(g, w * 0.16, h * 0.33, w * 0.2, h * 0.014); g.fill();
    g.save(); g.beginPath(); g.rect(0, 0, w, hz); g.clip();
    g.fillStyle = '#fff4c8'; circ(g, w * 0.5, hz + h * 0.012, w * 0.2); g.fill(); g.restore();
    gr = g.createLinearGradient(0, hz, 0, h); gr.addColorStop(0, '#4a3270'); gr.addColorStop(0.35, '#232457'); gr.addColorStop(1, '#0b0f2e');
    g.fillStyle = gr; g.fillRect(0, hz, w, h - hz);
    for (let k = 0; k < 13; k++) {
      const t = k / 12, y = hz + (h - hz) * (0.03 + t * 0.9), ww = w * (0.42 - t * 0.26) * (k % 2 ? 0.8 : 1), hh = (h - hz) * 0.03;
      g.fillStyle = 'rgba(255,' + Math.round(214 - t * 60) + ',' + Math.round(130 - t * 40) + ',' + (0.95 - t * 0.55).toFixed(2) + ')';
      rr(g, w * 0.5 - ww / 2 + ((k % 3) - 1) * w * 0.02, y, ww, hh, hh / 2); g.fill();
    }
    g.fillStyle = 'rgba(255,226,160,0.9)'; g.fillRect(0, hz - h * 0.003, w, h * 0.006);
  }
  function picBalloon(g, w, h) {
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f7fe8'); gr.addColorStop(0.6, '#8fc8ff'); gr.addColorStop(1, '#d9f1ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const cloud = (x, y, s) => { g.fillStyle = '#ffffff'; circ(g, x, y, s); g.fill(); circ(g, x + s * 0.9, y + s * 0.2, s * 0.8); g.fill(); circ(g, x - s * 0.9, y + s * 0.25, s * 0.7); g.fill(); rr(g, x - s * 1.5, y + s * 0.1, s * 3.1, s * 0.75, s * 0.37); g.fill(); };
    cloud(w * 0.2, h * 0.17, w * 0.08); cloud(w * 0.84, h * 0.5, w * 0.09); cloud(w * 0.22, h * 0.68, w * 0.06);
    g.fillStyle = '#7cc576'; ell(g, w * 0.22, h * 1.02, w * 0.62, h * 0.13); g.fill();
    g.fillStyle = '#4e9e58'; ell(g, w * 0.86, h * 1.05, w * 0.6, h * 0.15); g.fill();
    const cx = w * 0.52, cy = h * 0.36, R = w * 0.31, a0 = Math.PI * 0.82, a1 = Math.PI * 0.18;
    const path = () => {
      g.beginPath(); g.arc(cx, cy, R, a0, a1);
      g.quadraticCurveTo(cx + R * 0.55, cy + R * 1.05, cx + R * 0.17, cy + R * 1.3);
      g.lineTo(cx - R * 0.17, cy + R * 1.3);
      g.quadraticCurveTo(cx - R * 0.55, cy + R * 1.05, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      g.closePath();
    };
    g.save(); path(); g.clip();
    const cols = ['#ff4d5e', '#ffd166', '#ffffff', '#ff4d5e', '#38c6bd', '#ffffff', '#ffd166', '#ff4d5e'];
    for (let k = 0; k < 8; k++) {
      const xa = cx + R * 1.02 * Math.sin(-Math.PI / 2 + k * Math.PI / 8), xb = cx + R * 1.02 * Math.sin(-Math.PI / 2 + (k + 1) * Math.PI / 8);
      g.fillStyle = cols[k]; g.fillRect(k ? xa : xa - R, cy - R * 1.2, xb - xa + (k ? 0.5 : R) + (k === 7 ? R : 0), R * 2.7);
    }
    gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.45, 0, cx - R * 0.35, cy - R * 0.45, R * 1.6);
    gr.addColorStop(0, 'rgba(255,255,255,0.38)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(20,10,40,0.32)');
    g.fillStyle = gr; g.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.8);
    g.restore();
    g.strokeStyle = '#5b3a1e'; g.lineWidth = w * 0.007;
    g.beginPath(); g.moveTo(cx - R * 0.17, cy + R * 1.3); g.lineTo(cx - R * 0.12, cy + R * 1.5); g.moveTo(cx + R * 0.17, cy + R * 1.3); g.lineTo(cx + R * 0.12, cy + R * 1.5); g.stroke();
    g.fillStyle = '#8a5527'; rr(g, cx - R * 0.16, cy + R * 1.48, R * 0.32, R * 0.26, R * 0.05); g.fill();
  }
  function picWhale(g, w, h) {
    const sea = h * 0.44;
    let gr = g.createLinearGradient(0, 0, 0, sea); gr.addColorStop(0, '#060c26'); gr.addColorStop(1, '#1d3570');
    g.fillStyle = gr; g.fillRect(0, 0, w, sea + 1);
    g.fillStyle = '#eaf2ff';
    [[0.12, 0.08], [0.3, 0.2], [0.48, 0.06], [0.58, 0.27], [0.18, 0.33], [0.92, 0.33], [0.4, 0.36], [0.06, 0.22], [0.9, 0.05]].forEach(([x, y], i) => { circ(g, w * x, h * y, w * (i % 3 ? 0.009 : 0.014)); g.fill(); });
    glowAt(g, w * 0.76, h * 0.15, w * 0.32, '#fff0c8', 0.55);
    g.fillStyle = '#fff3d1'; circ(g, w * 0.76, h * 0.15, w * 0.085); g.fill();
    gr = g.createLinearGradient(0, sea, 0, h); gr.addColorStop(0, '#2a6aa8'); gr.addColorStop(0.25, '#16477e'); gr.addColorStop(1, '#071a3a');
    g.fillStyle = gr; g.fillRect(0, sea, w, h - sea);
    g.fillStyle = 'rgba(200,230,255,0.75)'; g.fillRect(0, sea, w, h * 0.006);
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(220,240,255,' + (0.55 - k * 0.07).toFixed(2) + ')'; rr(g, w * 0.76 - w * (0.1 - k * 0.012), sea + h * (0.012 + k * 0.022), w * (0.2 - k * 0.024), h * 0.008, h * 0.004); g.fill(); }
    const bx = w * 0.47, by = h * 0.66, rx = w * 0.36, ry = h * 0.105;
    g.fillStyle = '#3f74b5';
    g.beginPath(); g.moveTo(bx - rx * 0.8, by - ry * 0.2); g.quadraticCurveTo(bx - rx * 1.05, by - ry * 0.5, bx - rx * 1.22, by - ry * 1.5);
    g.quadraticCurveTo(bx - rx * 1.08, by - ry * 0.4, bx - rx * 1.3, by + ry * 0.7); g.quadraticCurveTo(bx - rx * 1.0, by + ry * 0.3, bx - rx * 0.78, by + ry * 0.35); g.closePath(); g.fill();
    ell(g, bx, by, rx, ry); g.fill();
    ell(g, bx + rx * 0.55, by - ry * 0.1, rx * 0.45, ry * 1.08); g.fill();
    g.save(); ell(g, bx, by, rx, ry); g.clip();
    g.fillStyle = '#cfe6ff'; ell(g, bx + rx * 0.1, by + ry * 0.95, rx * 0.95, ry * 0.75); g.fill();
    g.strokeStyle = 'rgba(120,160,210,0.7)'; g.lineWidth = h * 0.004;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(bx - rx * 0.5, by + ry * (0.45 + k * 0.14)); g.lineTo(bx + rx * 0.7, by + ry * (0.38 + k * 0.14)); g.stroke(); }
    g.restore();
    g.fillStyle = '#356aa8'; g.beginPath(); g.moveTo(bx + rx * 0.1, by + ry * 0.5); g.quadraticCurveTo(bx - rx * 0.05, by + ry * 1.6, bx - rx * 0.25, by + ry * 1.5); g.quadraticCurveTo(bx - rx * 0.1, by + ry * 0.9, bx - rx * 0.05, by + ry * 0.45); g.closePath(); g.fill();
    g.fillStyle = '#0b1a33'; circ(g, bx + rx * 0.62, by + ry * 0.05, w * 0.017); g.fill();
    g.fillStyle = 'rgba(214,238,255,0.92)';
    const sx = bx + rx * 0.68, sy = by - ry * 1.05;
    [[0, -0.02, 0.02], [-0.04, -0.07, 0.024], [0.04, -0.07, 0.024], [-0.08, -0.1, 0.02], [0.08, -0.1, 0.02], [0, -0.1, 0.022]].forEach(([dx, dy, r]) => { circ(g, sx + w * dx, sy + h * dy, w * r); g.fill(); });
  }
  function picLake(g, w, h) {
    const hz = h * 0.56;
    let gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, '#5f9fe6'); gr.addColorStop(0.7, '#cfe2f5'); gr.addColorStop(1, '#ffd9b5');
    g.fillStyle = gr; g.fillRect(0, 0, w, hz);
    glowAt(g, w * 0.72, h * 0.3, w * 0.25, '#fff2d0', 0.6);
    g.fillStyle = '#fff6dc'; circ(g, w * 0.72, h * 0.3, w * 0.055); g.fill();
    const far = [[0, 0.44], [0.12, 0.3], [0.24, 0.38], [0.4, 0.2], [0.55, 0.34], [0.7, 0.26], [0.86, 0.36], [1, 0.3], [1, 0.56], [0, 0.56]];
    const near = [[0, 0.5], [0.16, 0.42], [0.3, 0.5], [0.46, 0.41], [0.62, 0.5], [0.8, 0.43], [1, 0.5], [1, 0.56], [0, 0.56]];
    const poly = (pts, col, flip) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => { const yy = flip ? 2 * hz - y * h : y * h; if (i) g.lineTo(x * w, yy); else g.moveTo(x * w, yy); }); g.closePath(); g.fill(); };
    const caps = (flip) => [[0.4, 0.2], [0.12, 0.3], [0.7, 0.26]].forEach(([x, y]) => {
      const Y = (v) => (flip ? 2 * hz - v * h : v * h);
      g.beginPath(); g.moveTo(x * w, Y(y)); g.lineTo((x + 0.06) * w, Y(y + 0.06)); g.lineTo((x + 0.02) * w, Y(y + 0.05)); g.lineTo((x - 0.02) * w, Y(y + 0.066)); g.lineTo((x - 0.06) * w, Y(y + 0.06)); g.closePath(); g.fill();
    });
    poly(far, '#8a97c6'); g.fillStyle = '#ffffff'; caps(false);
    poly(near, '#55679a');
    const trees = (flip, col) => { g.fillStyle = col; for (let k = 0; k < 14; k++) { const x = (k + 0.5) / 14 * w, s = w * (0.03 + (k % 3) * 0.008); g.beginPath(); g.moveTo(x, flip ? hz + s * 3.2 : hz - s * 3.2); g.lineTo(x + s, hz); g.lineTo(x - s, hz); g.closePath(); g.fill(); } };
    trees(false, '#1f4a3a');
    gr = g.createLinearGradient(0, hz, 0, h); gr.addColorStop(0, '#9ab8de'); gr.addColorStop(1, '#244f86');
    g.fillStyle = gr; g.fillRect(0, hz, w, h - hz);
    g.save(); g.globalAlpha = 0.45; poly(far, '#6b7fb3', true); g.fillStyle = '#e8f0ff'; caps(true); poly(near, '#3e5585', true); trees(true, '#163a2e'); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let k = 0; k < 6; k++) { rr(g, w * (0.06 + k * 0.15), hz + h * (0.07 + (k % 3) * 0.1), w * 0.12, h * 0.006, h * 0.003); g.fill(); }
  }
  function picIsland(g, w, h) {
    g.fillStyle = '#e6cf98'; g.fillRect(0, 0, w, h);
    const m = w * 0.05;
    let gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1fa0c4'); gr.addColorStop(1, '#0d6a95');
    g.fillStyle = gr; rr(g, m, m, w - 2 * m, h - 2 * m, m * 0.6); g.fill();
    g.strokeStyle = 'rgba(190,240,250,0.7)'; g.lineWidth = w * 0.008;
    [[0.2, 0.12], [0.75, 0.2], [0.15, 0.82], [0.84, 0.7], [0.5, 0.9], [0.86, 0.42]].forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, w * 0.025, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(w * (x + 0.05), h * y, w * 0.025, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
    const blob = (s, col) => {
      g.fillStyle = col; g.beginPath(); const cx = w * 0.48, cy = h * 0.5;
      for (let k = 0; k <= 32; k++) { const a = k / 32 * TAU, r = (0.3 + 0.05 * Math.sin(a * 3 + 0.7) + 0.04 * Math.cos(a * 5)) * w * s; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 1.25; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.closePath(); g.fill();
    };
    blob(1.24, '#46c7d2'); blob(1.0, '#f2d48c'); blob(0.72, '#5fae5a'); blob(0.36, '#3f8a46');
    g.fillStyle = '#2b6e35'; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ell(g, w * 0.4 + Math.cos(a) * w * 0.05, h * 0.45 + Math.sin(a) * w * 0.05, w * 0.06, w * 0.022, a); g.fill(); }
    g.fillStyle = '#6b3f1d'; circ(g, w * 0.4, h * 0.45, w * 0.016); g.fill();
    g.fillStyle = '#7a4a22'; for (let k = 0; k < 7; k++) { const t = k / 6; circ(g, lerp(w * 0.28, w * 0.6, t) + Math.sin(t * 5) * w * 0.03, lerp(h * 0.68, h * 0.53, t), w * 0.013); g.fill(); }
    g.strokeStyle = '#d62839'; g.lineWidth = w * 0.024; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * 0.6, h * 0.49); g.lineTo(w * 0.67, h * 0.545); g.moveTo(w * 0.67, h * 0.49); g.lineTo(w * 0.6, h * 0.545); g.stroke();
    const cx = w * 0.8, cy = h * 0.84, r = w * 0.08;
    g.fillStyle = '#f4e6c3'; circ(g, cx, cy, r); g.fill();
    g.fillStyle = '#d62839'; g.beginPath(); g.moveTo(cx, cy - r * 0.95); g.lineTo(cx + r * 0.22, cy); g.lineTo(cx - r * 0.22, cy); g.closePath(); g.fill();
    g.fillStyle = '#2a3a4a'; g.beginPath(); g.moveTo(cx, cy + r * 0.95); g.lineTo(cx + r * 0.22, cy); g.lineTo(cx - r * 0.22, cy); g.closePath(); g.fill();
    g.fillStyle = '#6b3f1d'; g.beginPath(); g.moveTo(w * 0.15, h * 0.21); g.lineTo(w * 0.29, h * 0.21); g.lineTo(w * 0.26, h * 0.235); g.lineTo(w * 0.18, h * 0.235); g.closePath(); g.fill();
    g.fillStyle = '#fbf6ec'; g.beginPath(); g.moveTo(w * 0.22, h * 0.15); g.lineTo(w * 0.22, h * 0.205); g.lineTo(w * 0.27, h * 0.205); g.closePath(); g.fill();
  }
  function picCity(g, w, h) {
    const base = h * 0.72, R = fixedRng(11);
    let gr = g.createLinearGradient(0, 0, 0, base); gr.addColorStop(0, '#080c26'); gr.addColorStop(0.55, '#2c2766'); gr.addColorStop(1, '#c0587e');
    g.fillStyle = gr; g.fillRect(0, 0, w, base);
    g.fillStyle = '#e8eeff'; for (let k = 0; k < 14; k++) { circ(g, w * R(), h * R() * 0.32, w * (0.006 + R() * 0.008)); g.fill(); }
    glowAt(g, w * 0.2, h * 0.12, w * 0.22, '#fff0d0', 0.5);
    g.fillStyle = '#fff1cf'; circ(g, w * 0.2, h * 0.12, w * 0.06); g.fill();
    let x = -w * 0.02; const bl = [];
    while (x < w) { const bw = w * (0.07 + R() * 0.07), bh = h * (0.14 + R() * 0.32); bl.push([x, bw, bh]); x += bw + w * 0.004; }
    const lit = [];
    bl.forEach(([bx, bw, bh], i) => {
      g.fillStyle = i % 2 ? '#141a3e' : '#1b2150'; g.fillRect(bx, base - bh, bw, bh + 1);
      const cw = w * 0.018, gap = w * 0.012;
      for (let yy = base - bh + h * 0.015; yy < base - h * 0.012; yy += h * 0.022) {
        for (let xx = bx + gap; xx < bx + bw - cw; xx += cw + gap) { if (R() < 0.4) { const c = R() < 0.7 ? '#ffd36b' : '#ffeab0'; g.fillStyle = c; g.fillRect(xx, yy, cw, h * 0.011); lit.push([xx, yy, c]); } }
      }
    });
    g.fillStyle = '#e5484d'; circ(g, bl[3] ? bl[3][0] + bl[3][1] / 2 : w * 0.3, base - (bl[3] ? bl[3][2] : h * 0.3) - h * 0.008, w * 0.012); g.fill();
    gr = g.createLinearGradient(0, base, 0, h); gr.addColorStop(0, '#1d2558'); gr.addColorStop(1, '#090c26');
    g.fillStyle = gr; g.fillRect(0, base, w, h - base);
    lit.forEach(([lx, ly, c], i) => { if (i % 2) return; g.fillStyle = rgba(c, 0.35); g.fillRect(lx, 2 * base - ly, w * 0.018, h * 0.03); });
    g.fillStyle = 'rgba(255,214,120,0.6)'; g.fillRect(0, base, w, h * 0.004);
  }
  function picSunflower(g, w, h) {
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4fb0ff'); gr.addColorStop(0.75, '#cdeeff'); gr.addColorStop(1, '#e8f7ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; [[0.16, 0.12, 0.06], [0.86, 0.22, 0.07], [0.78, 0.62, 0.05]].forEach(([x, y, s]) => { circ(g, w * x, h * y, w * s); g.fill(); circ(g, w * (x + s), h * y + w * s * 0.2, w * s * 0.75); g.fill(); circ(g, w * (x - s), h * y + w * s * 0.25, w * s * 0.65); g.fill(); });
    g.strokeStyle = '#3f8f3f'; g.lineWidth = w * 0.05; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * 0.5, h * 0.42); g.quadraticCurveTo(w * 0.46, h * 0.7, w * 0.5, h * 1.02); g.stroke();
    g.fillStyle = '#4fa94a'; ell(g, w * 0.36, h * 0.66, w * 0.14, w * 0.055, -0.5); g.fill(); ell(g, w * 0.63, h * 0.76, w * 0.14, w * 0.055, 0.5); g.fill();
    g.fillStyle = '#5cb85c'; g.fillRect(0, h * 0.88, w, h * 0.12);
    g.fillStyle = '#3e9b47'; for (let k = 0; k < 18; k++) { const x = (k + 0.5) / 18 * w; g.beginPath(); g.moveTo(x - w * 0.02, h); g.lineTo(x, h * (0.83 + (k % 3) * 0.02)); g.lineTo(x + w * 0.02, h); g.closePath(); g.fill(); }
    const cx = w * 0.5, cy = h * 0.32;
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 16; k++) { const a = (k + ring * 0.5) / 16 * TAU, d = w * (0.2 + ring * 0.02); g.fillStyle = (k + ring) % 2 ? '#ffb300' : '#ffcc33'; ell(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, w * 0.1, w * 0.042, a); g.fill(); }
    g.fillStyle = '#6b3a1a'; circ(g, cx, cy, w * 0.15); g.fill();
    g.fillStyle = '#8a5428'; for (let k = 0; k < 40; k++) { const a = k * 2.39996, d = Math.sqrt(k / 40) * w * 0.13; circ(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, w * 0.009); g.fill(); }
  }
  function picSmile(g, w, h) {
    g.fillStyle = '#ff9fc4'; g.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.47;
    g.fillStyle = '#ffc6dd'; for (let k = 0; k < 16; k += 2) { const a0 = k / 16 * TAU, a1 = (k + 1) / 16 * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * h, cy + Math.sin(a0) * h); g.lineTo(cx + Math.cos(a1) * h, cy + Math.sin(a1) * h); g.closePath(); g.fill(); }
    const R = w * 0.38;
    let gr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 0, cx, cy, R); gr.addColorStop(0, '#fff07a'); gr.addColorStop(0.7, '#ffd23f'); gr.addColorStop(1, '#f5a623');
    g.fillStyle = gr; circ(g, cx, cy, R); g.fill();
    g.strokeStyle = '#e08a12'; g.lineWidth = w * 0.014; circ(g, cx, cy, R); g.stroke();
    g.fillStyle = '#3b2414'; ell(g, cx - R * 0.34, cy - R * 0.2, w * 0.045, w * 0.07); g.fill(); ell(g, cx + R * 0.34, cy - R * 0.2, w * 0.045, w * 0.07); g.fill();
    g.fillStyle = '#ffffff'; circ(g, cx - R * 0.3, cy - R * 0.28, w * 0.015); g.fill(); circ(g, cx + R * 0.38, cy - R * 0.28, w * 0.015); g.fill();
    g.fillStyle = 'rgba(255,110,140,0.75)'; ell(g, cx - R * 0.6, cy + R * 0.18, w * 0.07, w * 0.04); g.fill(); ell(g, cx + R * 0.6, cy + R * 0.18, w * 0.07, w * 0.04); g.fill();
    g.fillStyle = '#7a2030'; g.beginPath(); g.arc(cx, cy + R * 0.1, R * 0.52, 0.12 * Math.PI, 0.88 * Math.PI); g.closePath(); g.fill();
    g.fillStyle = '#ff6b81'; ell(g, cx, cy + R * 0.5, R * 0.22, R * 0.1); g.fill();
  }
  const PICS = [
    { id: 'sunrise', name: 'Sunrise', reveal: 'It’s a sunrise.', spot: [17, 37], draw: picSunrise, glow: '#ffc87a', pal: ['#ffd36b', '#ff8448', '#b3456d', '#46296e', '#fff4c8'] },
    { id: 'balloon', name: 'Balloon Day', reveal: 'It’s a hot-air balloon.', spot: [12, 18], draw: picBalloon, glow: '#bfe6ff', pal: ['#ff4d5e', '#ffd166', '#38c6bd', '#ffffff', '#8fc8ff'] },
    { id: 'whale', name: 'Night Whale', reveal: 'It’s a whale.', spot: [24, 30], draw: picWhale, glow: '#9cc8ff', pal: ['#3f74b5', '#cfe6ff', '#fff3d1', '#2a6aa8', '#eaf2ff'] },
    { id: 'lake', name: 'Mountain Lake', reveal: 'It’s a mountain lake.', spot: [10, 37], draw: picLake, glow: '#ffe2c0', pal: ['#8a97c6', '#ffffff', '#ffd9b5', '#5f9fe6', '#1f4a3a'] },
    { id: 'island', name: 'Treasure Map', reveal: 'It’s a treasure map.', spot: [27, 9], draw: picIsland, glow: '#ffe6a8', pal: ['#f2d48c', '#46c7d2', '#5fae5a', '#d62839', '#1fa0c4'] },
    { id: 'city', name: 'City Lights', reveal: 'It’s a city at night.', spot: [19, 26], draw: picCity, glow: '#c0587e', pal: ['#ffd36b', '#ffeab0', '#c0587e', '#2c2766', '#e5484d'] },
    { id: 'sunflower', name: 'Sunflower', reveal: 'It’s a sunflower.', spot: [25, 13], draw: picSunflower, glow: '#ffe08a', pal: ['#ffcc33', '#ffb300', '#6b3a1a', '#4fa94a', '#4fb0ff'] },
    { id: 'smile', name: 'Big Smile', reveal: 'It’s a smile.', spot: [11, 26], draw: picSmile, glow: '#ffd23f', pal: ['#ffd23f', '#ff9fc4', '#ff6b81', '#fff07a', '#3b2414'] }
  ];

  /* ---------------- the ordinary moments a week holds: small silhouettes, one ink ---------------- */
  const out = (g) => { g.globalCompositeOperation = 'destination-out'; };
  const over = (g) => { g.globalCompositeOperation = 'source-over'; };
  const ICONS = {
    moon(g) { circ(g, 44, 54, 28); g.fill(); out(g); circ(g, 58, 43, 24); g.fill(); over(g); g.lineWidth = 5; g.beginPath(); g.moveTo(66, 16); g.lineTo(78, 16); g.lineTo(66, 28); g.lineTo(78, 28); g.stroke(); g.beginPath(); g.moveTo(82, 34); g.lineTo(90, 34); g.lineTo(82, 42); g.lineTo(90, 42); g.stroke(); },
    stars(g) { const st = (x, y, R, r) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, d = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } g.closePath(); g.fill(); }; st(36, 42, 22, 6); st(70, 64, 15, 4.5); st(72, 24, 10, 3); },
    bed(g) { rr(g, 12, 34, 9, 48, 3); g.fill(); rr(g, 12, 60, 76, 17, 5); g.fill(); ell(g, 33, 55, 12, 7); g.fill(); rr(g, 46, 50, 42, 16, 6); g.fill(); g.fillRect(15, 76, 6, 9); g.fillRect(80, 76, 6, 9); },
    rain(g) { circ(g, 38, 38, 15); g.fill(); circ(g, 56, 31, 19); g.fill(); circ(g, 72, 41, 13); g.fill(); rr(g, 28, 38, 54, 16, 8); g.fill(); g.lineWidth = 5.5; g.beginPath(); [[36, 64], [52, 64], [68, 64], [44, 80], [60, 80]].forEach(([x, y]) => { g.moveTo(x, y); g.lineTo(x - 4, y + 9); }); g.stroke(); },
    cloud(g) { circ(g, 34, 58, 16); g.fill(); circ(g, 52, 46, 23); g.fill(); circ(g, 72, 58, 16); g.fill(); rr(g, 26, 56, 56, 18, 9); g.fill(); },
    sun(g) { circ(g, 50, 50, 17); g.fill(); g.lineWidth = 6.5; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.moveTo(50 + Math.cos(a) * 26, 50 + Math.sin(a) * 26); g.lineTo(50 + Math.cos(a) * 37, 50 + Math.sin(a) * 37); } g.stroke(); },
    cup(g) { rr(g, 24, 40, 42, 40, 9); g.fill(); g.lineWidth = 7; g.beginPath(); g.arc(66, 58, 11, -Math.PI / 2, Math.PI / 2); g.stroke(); g.lineWidth = 4.5; g.beginPath(); g.moveTo(37, 32); g.bezierCurveTo(31, 24, 43, 20, 37, 10); g.moveTo(53, 32); g.bezierCurveTo(47, 24, 59, 20, 53, 10); g.stroke(); },
    plate(g) { circ(g, 52, 54, 32); g.fill(); out(g); circ(g, 52, 54, 24); g.fill(); over(g); circ(g, 52, 54, 14); g.fill(); g.lineWidth = 4; g.beginPath(); g.moveTo(10, 24); g.lineTo(10, 84); g.moveTo(5, 24); g.lineTo(5, 40); g.moveTo(15, 24); g.lineTo(15, 40); g.moveTo(5, 40); g.lineTo(15, 40); g.stroke(); },
    pan(g) { circ(g, 42, 56, 27); g.fill(); rr(g, 64, 50, 32, 10, 5); g.fill(); out(g); circ(g, 42, 56, 20); g.fill(); over(g); circ(g, 42, 56, 9); g.fill(); },
    apple(g) { circ(g, 40, 60, 22); g.fill(); circ(g, 60, 60, 22); g.fill(); g.lineWidth = 5; g.beginPath(); g.moveTo(50, 40); g.quadraticCurveTo(50, 30, 55, 24); g.stroke(); ell(g, 63, 28, 10, 5, -0.5); g.fill(); },
    glass(g) { g.lineWidth = 5; g.beginPath(); g.moveTo(28, 20); g.lineTo(72, 20); g.lineTo(65, 84); g.lineTo(35, 84); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(31.5, 48); g.lineTo(68.5, 48); g.lineTo(65, 84); g.lineTo(35, 84); g.closePath(); g.fill(); },
    shower(g) { g.lineWidth = 6; g.beginPath(); g.moveTo(76, 10); g.lineTo(76, 26); g.lineTo(58, 26); g.stroke(); g.beginPath(); g.arc(50, 40, 18, Math.PI, 0); g.closePath(); g.fill(); g.lineWidth = 4.5; g.beginPath(); [[38, 52], [50, 54], [62, 52], [34, 68], [50, 72], [66, 68], [42, 84], [58, 84]].forEach(([x, y]) => { g.moveTo(x, y); g.lineTo(x - 1.5, y + 7); }); g.stroke(); },
    music(g) { ell(g, 32, 74, 11, 8.5, -0.35); g.fill(); ell(g, 70, 66, 11, 8.5, -0.35); g.fill(); g.lineWidth = 5.5; g.beginPath(); g.moveTo(42, 72); g.lineTo(42, 24); g.moveTo(80, 64); g.lineTo(80, 16); g.stroke(); g.beginPath(); g.moveTo(42, 22); g.lineTo(82, 14); g.lineTo(82, 26); g.lineTo(42, 34); g.closePath(); g.fill(); },
    bus(g) { rr(g, 18, 18, 64, 62, 11); g.fill(); g.fillRect(26, 78, 12, 9); g.fillRect(62, 78, 12, 9); out(g); rr(g, 26, 27, 48, 22, 4); g.fill(); circ(g, 30, 66, 4.5); g.fill(); circ(g, 70, 66, 4.5); g.fill(); over(g); },
    shoe(g) { g.beginPath(); g.moveTo(10, 72); g.lineTo(90, 72); g.quadraticCurveTo(93, 58, 76, 54); g.lineTo(54, 46); g.lineTo(47, 32); g.lineTo(24, 34); g.quadraticCurveTo(12, 48, 10, 72); g.closePath(); g.fill(); out(g); g.fillRect(10, 64, 82, 3.5); g.lineWidth = 3; g.beginPath(); g.moveTo(40, 42); g.lineTo(50, 40); g.moveTo(43, 49); g.lineTo(54, 47); g.stroke(); over(g); },
    plant(g) { g.beginPath(); g.moveTo(30, 60); g.lineTo(70, 60); g.lineTo(64, 88); g.lineTo(36, 88); g.closePath(); g.fill(); ell(g, 50, 36, 9, 22); g.fill(); ell(g, 34, 44, 7, 17, -0.8); g.fill(); ell(g, 66, 44, 7, 17, 0.8); g.fill(); },
    tree(g) { g.fillRect(45, 54, 10, 34); circ(g, 50, 36, 21); g.fill(); circ(g, 32, 48, 16); g.fill(); circ(g, 68, 48, 16); g.fill(); },
    flower(g) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; circ(g, 50 + Math.cos(a) * 15, 38 + Math.sin(a) * 15, 12); g.fill(); } out(g); circ(g, 50, 38, 9); g.fill(); over(g); circ(g, 50, 38, 5); g.fill(); g.lineWidth = 5; g.beginPath(); g.moveTo(50, 54); g.lineTo(50, 90); g.stroke(); ell(g, 59, 73, 10, 4.5, -0.5); g.fill(); },
    chat(g) { rr(g, 8, 18, 54, 32, 11); g.fill(); g.beginPath(); g.moveTo(18, 46); g.lineTo(30, 48); g.lineTo(14, 60); g.closePath(); g.fill(); out(g); rr(g, 34, 40, 62, 42, 15); g.fill(); over(g); rr(g, 39, 45, 52, 31, 11); g.fill(); g.beginPath(); g.moveTo(80, 72); g.lineTo(90, 86); g.lineTo(70, 76); g.closePath(); g.fill(); },
    smile(g) { g.lineWidth = 6.5; circ(g, 50, 50, 32); g.stroke(); circ(g, 39, 42, 5); g.fill(); circ(g, 61, 42, 5); g.fill(); g.beginPath(); g.arc(50, 52, 18, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); },
    book(g) { g.beginPath(); g.moveTo(50, 28); g.lineTo(12, 22); g.lineTo(12, 74); g.lineTo(50, 80); g.closePath(); g.fill(); g.beginPath(); g.moveTo(50, 28); g.lineTo(88, 22); g.lineTo(88, 74); g.lineTo(50, 80); g.closePath(); g.fill(); out(g); g.lineWidth = 3; g.beginPath(); g.moveTo(50, 28); g.lineTo(50, 80); [[20, 36, 42, 40], [20, 46, 42, 50], [20, 56, 36, 59], [58, 40, 80, 36], [58, 50, 80, 46], [58, 60, 74, 57]].forEach(([a, b, c, d]) => { g.moveTo(a, b); g.lineTo(c, d); }); g.stroke(); over(g); },
    phone(g) { rr(g, 31, 12, 38, 76, 9); g.fill(); out(g); rr(g, 35.5, 20, 29, 56, 3); g.fill(); circ(g, 50, 82, 3); g.fill(); over(g); rr(g, 39, 26, 18, 7, 3); g.fill(); rr(g, 43, 38, 18, 7, 3); g.fill(); },
    key(g) { g.lineWidth = 7.5; circ(g, 28, 50, 15); g.stroke(); g.fillRect(42, 46, 46, 8.5); g.fillRect(70, 53, 6.5, 13); g.fillRect(80, 53, 6.5, 9); },
    lamp(g) { g.beginPath(); g.moveTo(33, 20); g.lineTo(67, 20); g.lineTo(78, 48); g.lineTo(22, 48); g.closePath(); g.fill(); g.fillRect(47, 48, 6, 30); rr(g, 30, 78, 40, 9, 4); g.fill(); },
    sock(g) { g.beginPath(); g.moveTo(34, 12); g.lineTo(60, 12); g.lineTo(60, 56); g.quadraticCurveTo(60, 63, 67, 67); g.lineTo(80, 73); g.quadraticCurveTo(92, 82, 82, 89); g.lineTo(52, 89); g.quadraticCurveTo(34, 87, 34, 70); g.closePath(); g.fill(); out(g); g.fillRect(34, 20, 26, 5); g.fillRect(34, 29, 26, 3); over(g); },
    window(g) { g.lineWidth = 6; rr(g, 18, 14, 64, 72, 4); g.stroke(); g.lineWidth = 4.5; g.beginPath(); g.moveTo(50, 14); g.lineTo(50, 86); g.moveTo(18, 50); g.lineTo(82, 50); g.stroke(); circ(g, 68, 31, 7); g.fill(); },
    camera(g) { rr(g, 12, 30, 76, 50, 9); g.fill(); rr(g, 30, 21, 22, 12, 3); g.fill(); out(g); circ(g, 50, 55, 17); g.fill(); over(g); circ(g, 50, 55, 10); g.fill(); out(g); circ(g, 76, 41, 4); g.fill(); over(g); }
  };
  const LABEL = { moon: 'Some sleep', stars: 'Night sky', bed: 'Pillow time', rain: 'Rain outside', cloud: 'Clouds', sun: 'Sunlight', cup: 'A warm drink', plate: 'A meal', pan: 'Cooking', apple: 'A snack', glass: 'Some water', shower: 'A shower', music: 'A song', bus: 'Getting about', shoe: 'Walking', plant: 'A plant', tree: 'Trees', flower: 'A flower', chat: 'A chat', smile: 'A laugh', book: 'A few pages', phone: 'Scrolling', key: 'Out the door', lamp: 'Lamp on', sock: 'Laundry', window: 'Looking out', camera: 'On record' };
  const BUCKET = {
    night: ['moon', 'stars', 'bed', 'window', 'moon', 'lamp'], deep: ['music', 'book', 'phone', 'window', 'moon'], light: ['cloud', 'sock', 'book', 'cup', 'chat'],
    grey: ['key', 'phone', 'bus', 'shoe', 'sock'], red: ['apple', 'smile', 'chat', 'flower'], brown: ['cup', 'plate', 'book', 'key'], orange: ['cup', 'plate', 'pan', 'sun'],
    yellow: ['sun', 'lamp', 'flower', 'smile'], green: ['plant', 'tree', 'apple', 'shoe'], cyan: ['shower', 'glass', 'plant', 'rain'], blue: ['rain', 'cloud', 'glass', 'shower', 'bus', 'music'],
    purple: ['music', 'book', 'moon', 'chat'], pink: ['chat', 'smile', 'flower', 'book']
  };
  function bucketOf(r, g, b) {
    const [h, s, l] = hslOf(r, g, b);
    if (l < 0.16) return 'night';
    if (s < 0.14) return l > 0.72 ? 'light' : l < 0.36 ? 'night' : 'grey';
    if (l < 0.3) return h > 200 && h < 300 ? 'night' : 'deep';
    if (h < 15 || h >= 335) return 'red';
    if (h < 45) return l < 0.45 ? 'brown' : 'orange';
    if (h < 70) return 'yellow';
    if (h < 165) return 'green';
    if (h < 195) return 'cyan';
    if (h < 255) return 'blue';
    if (h < 295) return 'purple';
    return 'pink';
  }

  /* ---------------- the bad moment, drawn as a photo (100x100 box; k: 0 tense, 1 calm) ---------------- */
  const SCENES = {
    message(g, k) {
      const c = (a, b) => mixHex(a, b, k);
      let gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, c('#2b0c16', '#2e3c5c')); gr.addColorStop(1, c('#0f0408', '#151d33'));
      g.fillStyle = gr; g.fillRect(0, 0, 100, 100);
      g.fillStyle = c('#4a1824', '#6f93bf'); rr(g, 7, 9, 30, 36, 2); g.fill();
      g.fillStyle = c('#1f0910', '#3f5c82'); for (let i = 0; i < 7; i++) g.fillRect(7, 11 + i * 5, 30, 1.6);
      glowAt(g, 88, 18, 44, c('#ff4a3a', '#ffc46b'), 0.42);
      g.fillStyle = c('#1c070d', '#26304a'); g.fillRect(0, 82, 100, 18);
      glowAt(g, 55, 55, 48, c('#ffb0a6', '#bcd8ff'), 0.34);
      g.save(); g.translate(55, 56); g.rotate(-0.13);
      g.fillStyle = c('#2b141e', '#34415f'); rr(g, -28, 14, 32, 44, 12); g.fill();
      g.fillStyle = '#0d0a10'; rr(g, -18, -33, 36, 66, 7); g.fill();
      gr = g.createLinearGradient(0, -29, 0, 27); gr.addColorStop(0, c('#ffe2dc', '#f2f7ff')); gr.addColorStop(1, c('#ff8d7f', '#a8cdf8'));
      g.fillStyle = gr; rr(g, -15, -29, 30, 56, 3.5); g.fill();
      g.fillStyle = '#ffffff'; rr(g, -12, -22, 21, 12, 4); g.fill();
      g.fillStyle = c('#d9a7a7', '#a9b8cf'); rr(g, -9, -18.5, 14, 1.8, 0.9); g.fill(); rr(g, -9, -14.5, 9, 1.8, 0.9); g.fill();
      g.fillStyle = c('#ff5d5d', '#5f9df0'); rr(g, -3, -6, 15, 9, 4); g.fill();
      g.fillStyle = c('#ff2f2f', '#ffb24f'); circ(g, 14, -31, 3.6); g.fill();
      g.fillStyle = c('#3a1a26', '#43527a');
      rr(g, -24, 2, 11, 20, 5.5); g.fill();
      rr(g, 14, -6, 9, 7.5, 3.75); g.fill(); rr(g, 14, 3, 9, 7.5, 3.75); g.fill(); rr(g, 13, 12, 9, 7.5, 3.75); g.fill();
      g.restore();
    },
    work(g, k) {
      const c = (a, b) => mixHex(a, b, k);
      let gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, c('#2a0b14', '#2d3b5a')); gr.addColorStop(1, c('#0e0407', '#141b2e'));
      g.fillStyle = gr; g.fillRect(0, 0, 100, 100);
      g.fillStyle = c('#3a121b', '#3f5070'); g.fillRect(60, 18, 34, 2.5);
      g.fillStyle = c('#2a0d14', '#4a7a5a'); rr(g, 66, 10, 7, 8, 1.5); g.fill(); ell(g, 69.5, 8, 5, 4); g.fill();
      g.fillStyle = c('#4a1620', '#a8b8d0'); rr(g, 80, 9, 9, 9, 1); g.fill();
      gr = g.createLinearGradient(0, 30, 0, 70); gr.addColorStop(0, rgba(c('#ff5a40', '#ffd28a'), 0.32)); gr.addColorStop(1, rgba(c('#ff5a40', '#ffd28a'), 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(24, 30); g.lineTo(34, 30); g.lineTo(46, 68); g.lineTo(4, 68); g.closePath(); g.fill();
      g.fillStyle = c('#3b1913', '#5b4332'); g.fillRect(0, 66, 100, 34);
      g.fillStyle = c('#5a2a1e', '#7a5c44'); g.fillRect(0, 66, 100, 1.6);
      g.strokeStyle = c('#160609', '#232b40'); g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(10, 65); g.lineTo(16, 42); g.lineTo(28, 30); g.stroke();
      g.fillStyle = c('#160609', '#232b40'); ell(g, 10, 66, 7, 2); g.fill();
      g.beginPath(); g.moveTo(22, 25); g.lineTo(36, 28); g.lineTo(33, 34); g.lineTo(24, 33); g.closePath(); g.fill();
      glowAt(g, 50, 46, 46, c('#ffb3a8', '#bcd6ff'), 0.32);
      g.fillStyle = '#141019'; rr(g, 25, 27, 50, 36, 2.5); g.fill();
      gr = g.createLinearGradient(0, 30, 0, 60); gr.addColorStop(0, c('#ffe0d8', '#eef5ff')); gr.addColorStop(1, c('#ff8f80', '#a6c9f3'));
      g.fillStyle = gr; rr(g, 28, 30, 44, 30, 1); g.fill();
      g.fillStyle = '#ffffff'; rr(g, 33, 34, 34, 21, 2); g.fill();
      g.fillStyle = c('#e5484d', '#4a8fe8'); rr(g, 33, 34, 34, 5, 2); g.fill(); g.fillRect(33, 37, 34, 2);
      g.fillStyle = '#bdb8c8'; rr(g, 36, 43, 22, 1.8, 0.9); g.fill(); rr(g, 36, 47, 15, 1.8, 0.9); g.fill(); rr(g, 36, 51, 19, 1.8, 0.9); g.fill();
      g.fillStyle = c('#e5484d', '#4a8fe8'); circ(g, 62, 49, 2.6); g.fill();
      g.fillStyle = '#2a2530'; g.beginPath(); g.moveTo(19, 63); g.lineTo(81, 63); g.lineTo(88, 69); g.lineTo(12, 69); g.closePath(); g.fill();
      g.fillStyle = c('#b03a3a', '#e9e3d8'); rr(g, 84, 54, 10, 12, 2); g.fill();
      g.strokeStyle = c('#b03a3a', '#e9e3d8'); g.lineWidth = 1.6; g.beginPath(); g.arc(94, 59.5, 3, -Math.PI / 2, Math.PI / 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(87, 51); g.quadraticCurveTo(85, 47, 88, 44); g.moveTo(91, 51); g.quadraticCurveTo(89, 47, 92, 43); g.stroke();
    },
    talk(g, k) {
      const c = (a, b) => mixHex(a, b, k);
      let gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, c('#1e0710', '#26304e')); gr.addColorStop(1, c('#080205', '#10162a'));
      g.fillStyle = gr; g.fillRect(0, 0, 100, 100);
      g.fillStyle = c('#4a0f1c', '#6a3a4a'); for (let i = 0; i < 5; i++) { rr(g, -2 + i * 4, -2, 5, 82, 2); g.fill(); rr(g, 83 + i * 4, -2, 5, 82, 2); g.fill(); }
      gr = g.createLinearGradient(0, 0, 0, 90); gr.addColorStop(0, rgba(c('#ffd9d0', '#fff2d6'), 0.5 - k * 0.18)); gr.addColorStop(1, rgba(c('#ffd9d0', '#fff2d6'), 0.08));
      g.fillStyle = gr; g.beginPath(); g.moveTo(44, -4); g.lineTo(56, -4); g.lineTo(78, 86); g.lineTo(22, 86); g.closePath(); g.fill();
      g.fillStyle = c('#2a0f12', '#3a3348'); g.fillRect(0, 80, 100, 20);
      g.fillStyle = rgba(c('#ffd9d0', '#fff2d6'), 0.3); ell(g, 50, 82, 30, 4); g.fill();
      g.fillStyle = c('#4a1c1c', '#6b4c3a'); g.beginPath(); g.moveTo(37, 52); g.lineTo(63, 52); g.lineTo(60, 82); g.lineTo(40, 82); g.closePath(); g.fill();
      g.fillStyle = c('#2e0f10', '#4a3326'); rr(g, 34, 48, 32, 5, 1.2); g.fill();
      g.fillStyle = c('#e5484d', '#e8b04a'); circ(g, 50, 65, 4.2); g.fill();
      g.strokeStyle = '#1d1a20'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(49, 48); g.lineTo(45, 39); g.stroke();
      g.fillStyle = '#2b2830'; ell(g, 44.4, 37.6, 2.4, 3, -0.4); g.fill();
      for (let i = 0; i < 9; i++) { const x = 6 + i * 11 + (i % 2) * 2, y = 96 - (i % 2) * 2; g.fillStyle = '#070205'; circ(g, x, y, 6.2); g.fill(); g.strokeStyle = rgba(c('#ff6b6b', '#ffd38a'), 0.55); g.lineWidth = 1; g.beginPath(); g.arc(x, y, 6.2, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    },
    home(g, k) {
      const c = (a, b) => mixHex(a, b, k);
      let gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, c('#2a0c12', '#c9b9a0')); gr.addColorStop(1, c('#12050a', '#8a7660'));
      g.fillStyle = gr; g.fillRect(0, 0, 100, 100);
      glowAt(g, 50, 8, 52, c('#ff7a50', '#fff0c8'), 0.4);
      g.fillStyle = c('#1a070b', '#6b553f'); g.fillRect(0, 86, 100, 14);
      g.fillStyle = c('#5a1c22', '#3d6d8e'); rr(g, 31, 16, 38, 72, 1.5); g.fill();
      g.strokeStyle = c('#3a0f14', '#2c5470'); g.lineWidth = 1.4; [[35, 21, 13, 27], [52, 21, 13, 27], [35, 53, 13, 30], [52, 53, 13, 30]].forEach(([x, y, w, hh]) => { rr(g, x, y, w, hh, 1); g.stroke(); });
      g.fillStyle = '#e8c46a'; circ(g, 64, 56, 1.9); g.fill();
      g.fillStyle = c('#2a0a0e', '#20384a'); rr(g, 43, 70, 14, 2.6, 1); g.fill();
      g.fillStyle = c('#3a1416', '#8a5a3a'); rr(g, 28, 88, 44, 6, 2); g.fill();
      g.save(); g.translate(50, 87); g.rotate(-0.14);
      g.fillStyle = '#fbf6ec'; rr(g, -12, -7.5, 24, 15, 1); g.fill();
      g.strokeStyle = '#c9bba6'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-12, -7.5); g.lineTo(0, 1.5); g.lineTo(12, -7.5); g.stroke();
      g.fillStyle = '#e5484d'; g.fillRect(6, -5.5, 4, 4);
      g.restore();
    },
    couple(g, k) {
      const c = (a, b) => mixHex(a, b, k);
      let gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, c('#240a12', '#33324f')); gr.addColorStop(1, c('#0d0407', '#17162a'));
      g.fillStyle = gr; g.fillRect(0, 0, 100, 100);
      g.fillStyle = c('#3a1420', '#4a6a9a'); rr(g, 60, 10, 30, 30, 2); g.fill();
      g.fillStyle = c('#1f0a10', '#2a3a5a'); g.fillRect(74.3, 10, 1.4, 30); g.fillRect(60, 24.3, 30, 1.4);
      g.fillStyle = '#fff3d1'; circ(g, 82, 17, 2.4); g.fill();
      glowAt(g, 50, 52, 42, c('#ff7a40', '#ffcf80'), 0.45);
      g.fillStyle = c('#1a0709', '#2a2236'); rr(g, 12, 46, 11, 34, 2); g.fill();
      g.save(); g.translate(84, 64); g.rotate(0.18); rr(g, -5.5, -18, 11, 34, 2); g.fill(); g.restore();
      g.fillStyle = c('#4a1d18', '#6e4a34'); ell(g, 50, 70, 40, 11); g.fill(); g.fillRect(46, 70, 8, 26);
      g.fillStyle = c('#5e2620', '#86603f'); ell(g, 50, 68.8, 40, 10); g.fill();
      g.fillStyle = '#f1ece2'; ell(g, 33, 68, 10, 3.4); g.fill(); ell(g, 67, 68, 10, 3.4); g.fill();
      g.fillStyle = c('#a83a2a', '#e09a50'); ell(g, 33, 67.4, 5, 1.6); g.fill();
      g.fillStyle = 'rgba(220,235,255,0.55)'; rr(g, 41, 59, 3.4, 7, 1); g.fill(); rr(g, 56, 59, 3.4, 7, 1); g.fill();
      g.fillStyle = '#f4efe6'; g.fillRect(48.8, 55, 2.4, 12);
      g.fillStyle = '#ffd36b'; ell(g, 50, 52.6, 1.5, 2.8); g.fill(); g.fillStyle = '#fff6d6'; ell(g, 50, 53.2, 0.7, 1.4); g.fill();
    },
    exam(g, k) {
      const c = (a, b) => mixHex(a, b, k);
      g.fillStyle = c('#3a1510', '#b88a5c'); g.fillRect(0, 0, 100, 100);
      g.strokeStyle = rgba(c('#24090a', '#8a6038'), 0.6); g.lineWidth = 0.8;
      for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(0, 6 + i * 8.3); g.bezierCurveTo(30, 4 + i * 8.3, 70, 9 + i * 8.3, 100, 6 + i * 8.3); g.stroke(); }
      glowAt(g, 20, 10, 62, c('#ff6040', '#fff0c0'), 0.35);
      g.save(); g.translate(50, 52); g.rotate(-0.08);
      g.fillStyle = 'rgba(0,0,0,0.3)'; rr(g, -27, -35, 58, 74, 1.5); g.fill();
      g.fillStyle = '#fbf8f0'; rr(g, -29, -37, 58, 74, 1.5); g.fill();
      g.fillStyle = '#c9c9d9'; for (let i = 0; i < 10; i++) g.fillRect(-23, -26 + i * 6, 44 - (i % 3) * 7, 1.2);
      g.fillStyle = '#2a2a3a'; g.fillRect(-23, -32, 22, 2);
      g.strokeStyle = '#d62839'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.arc(17, -27, 7, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(-20, 2); g.lineTo(8, 4); g.moveTo(-20, 14); g.lineTo(14, 13); g.stroke();
      g.restore();
      g.save(); g.translate(78, 80); g.rotate(-0.7); g.fillStyle = '#ffc94a'; g.fillRect(-16, -2.2, 26, 4.4); g.fillStyle = '#f2d9b0'; g.beginPath(); g.moveTo(10, -2.2); g.lineTo(16, 0); g.lineTo(10, 2.2); g.closePath(); g.fill(); g.fillStyle = '#e88aa0'; g.fillRect(-19, -2.2, 3, 4.4); g.restore();
    },
    group(g, k) {
      const c = (a, b) => mixHex(a, b, k);
      let gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, c('#200815', '#2e2a4e')); gr.addColorStop(1, c('#0b0308', '#141428'));
      g.fillStyle = gr; g.fillRect(0, 0, 100, 100);
      g.strokeStyle = c('#3a1420', '#4a4a6a'); g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 10); g.quadraticCurveTo(50, 26, 100, 10); g.stroke();
      const cols = ['#ff6b6b', '#ffd36b', '#6bdcff', '#b78bff'];
      for (let i = 0; i < 11; i++) { const t = (i + 0.5) / 11, x = t * 100, y = 10 + 32 * t * (1 - t); glowAt(g, x, y + 2, 6, cols[i % 4], 0.35 * (0.4 + k * 0.6)); g.fillStyle = cols[i % 4]; circ(g, x, y + 2, 1.6); g.fill(); }
      glowAt(g, 70, 55, 40, c('#ff6a4a', '#ffd08a'), 0.3);
      g.fillStyle = c('#1a0710', '#2a2a44'); g.fillRect(0, 86, 100, 14);
      const person = (x, y, s, col) => { g.fillStyle = col; circ(g, x, y, 5.5 * s); g.fill(); rr(g, x - 7 * s, y + 6 * s, 14 * s, 26 * s, 6 * s); g.fill(); };
      person(62, 50, 1.05, c('#2e0f1c', '#4a4a72')); person(78, 48, 1.1, c('#2e0f1c', '#4a4a72')); person(70, 58, 1.0, c('#3a1424', '#56568a'));
      person(22, 58, 0.9, c('#3a1424', '#5a6aa0'));
      g.fillStyle = c('#e5484d', '#e8b04a'); rr(g, 27, 70, 4, 5, 1); g.fill();
    },
    storm(g, k) {
      const c = (a, b) => mixHex(a, b, k);
      let gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, c('#1d0b16', '#8ec3ea')); gr.addColorStop(1, c('#0b0408', '#d9ecf8'));
      g.fillStyle = gr; g.fillRect(0, 0, 100, 100);
      if (k > 0.02) { glowAt(g, 72, 22, 30, '#ffd36b', 0.4 * k); g.fillStyle = rgba('#ffd36b', k); circ(g, 72, 22, 11); g.fill(); }
      g.fillStyle = c('#2c2234', '#f5f7fb'); [[34, 26, 14], [50, 20, 18], [66, 28, 13], [44, 32, 12], [58, 34, 12]].forEach(([x, y, r]) => { circ(g, x, y, r); g.fill(); });
      if (k < 0.98) {
        g.strokeStyle = rgba(c('#a0a8d0', '#cfe6ff'), 0.6 * (1 - k)); g.lineWidth = 1.1; g.beginPath(); for (let i = 0; i < 16; i++) { const x = 26 + i * 3, y = 44 + (i * 7) % 18; g.moveTo(x, y); g.lineTo(x - 2, y + 7); } g.stroke();
        g.fillStyle = rgba('#ffe14a', 0.95 * (1 - k)); g.beginPath(); g.moveTo(52, 38); g.lineTo(46, 52); g.lineTo(51, 52); g.lineTo(47, 64); g.lineTo(57, 48); g.lineTo(52, 48); g.lineTo(56, 38); g.closePath(); g.fill();
      }
      g.fillStyle = c('#160910', '#7ab36a'); g.fillRect(0, 86, 100, 14);
      g.fillStyle = c('#120812', '#33415f'); circ(g, 50, 71, 4.5); g.fill(); rr(g, 44.5, 76, 11, 11, 4); g.fill();
      g.fillStyle = c('#e5484d', '#ffb24f'); g.beginPath(); g.arc(50, 66, 11, Math.PI, 0); g.closePath(); g.fill();
      g.strokeStyle = c('#120812', '#33415f'); g.lineWidth = 1; g.beginPath(); g.moveTo(50, 66); g.lineTo(50, 76); g.stroke();
    }
  };
  function sceneFor(text) {
    const t = String(text || '').toLowerCase();
    if (!t.trim()) return 'storm';
    const tests = [
      ['message', /\b(text|texts|texted|message|messages|messaged|e-?mail|e-?mailed|reply|replied|dm|dms|whatsapp|on read|ghost\w*|voicemail|calls?|called)\b/],
      ['talk', /\b(presentation|presenting|speech|stage|pitch|lecture|class|perform\w*|audition|interview|talk)\b/],
      ['exam', /\b(exam|exams|test|grade|grades|marks?|assignment|essay|results?|uni|school)\b/],
      ['couple', /\b(partner|boyfriend|girlfriend|husband|wife|bf|gf|date|dating|relationship|fianc\w*)\b/],
      ['home', /\b(landlord|rent|lease|flat|apartment|house|home|mum|mom|dad|mother|father|family|sister|brother|parents?)\b/],
      ['work', /\b(boss|manager|work|job|meeting|colleague|client|office|team|shift|fired|sacked|promotion|hr)\b/],
      ['group', /\b(party|friends?|group|everyone|people|dinner|wedding|club)\b/]
    ];
    const hit = tests.find(([, re]) => re.test(t));
    return hit ? hit[0] : 'storm';
  }

  /* ---------------- captions: one fair, one filtered, one falsely sunny at every stop ---------------- */
  const CAPS = {
    hour: {
      filtered: ['Everything around it went wrong too.', 'Nothing in this frame went right.', 'Every moment here was awful.'],
      fair: ['One rough moment. The moments around it were ordinary.', 'A hard few minutes, with ordinary ones either side.', 'One tile stings. The tiles around it don’t.'],
      strong: ['A hard moment that matters. The moments around it still happened.'],
      dismissive: ['Nothing happened. Forget it.', 'It was nothing. Don’t feel it.', 'That moment doesn’t count.']
    },
    day: {
      filtered: ['The whole day was ruined.', 'This day was all bad.', 'Today proved everything is wrong.'],
      fair: ['A hard moment inside a mostly ordinary day.', 'One rough patch. Sleep, food and small things filled the rest.', 'Part of a day, not the whole of it.'],
      strong: ['A hard moment that needs a plan, in a day that held more.'],
      dismissive: ['Today was perfect.', 'Nothing bad happened today.', 'It’s silly to be bothered.']
    },
    days: {
      filtered: ['The whole week is going badly.', 'It’s been bad all week.', 'Everything lately is wrong.'],
      fair: ['A couple of days: one rough moment and plenty else.', 'Some hard minutes, lots of ordinary hours.', 'One sharp tile in a lot of plain ones.'],
      strong: ['Something real to deal with, and days that still hold more.'],
      dismissive: ['Everything’s fine, always.', 'Bad things don’t happen to me.', 'It’s all good, honestly.']
    },
    week: {
      filtered: ['Everything this week went wrong.', 'This week is that one moment.', 'The whole week is ruined.'],
      fair: ['One hard moment, in a week that held far more.', 'It mattered. It’s also one tile of 1,728.', 'A rough moment, inside a whole week.'],
      strong: ['This is real and it needs a plan. It’s still not the whole week.'],
      dismissive: ['Nothing went wrong this week.', 'That moment never mattered.', 'Just think positive.']
    }
  };
  const STOP_TILES = { hour: 3.1, day: 9.5, days: 19 };

  /* Machines without a graphics card rasterise every canvas pixel on the CPU: there the mosaic renders at 1x. */
  let softMemo = null;
  function softwareGfx() {
    if (softMemo != null) return softMemo;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl');
      if (!gl) return (softMemo = true);
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return (softMemo = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r));
    } catch (e) { return (softMemo = false); }
  }

  (env.games = env.games || []).push({
    id: 'zoom-out', mode: 'reframe', name: 'Zoom Out', verb: 'zoom', family: 'REFRAME', minutes: 2,
    parents: ['Beliefs / Evidence', 'Emotion', 'Memory / Replay / Rumination'],
    cast: ['sync', 'glitch'], poster: { char: 'sync', mood: 'wow' },
    fonts: ['Instrument+Serif:ital@0;1', 'Space+Mono:wght@400;700'],
    tagline: 'Pinch out from one bad moment until your week becomes a picture.',
    why: 'For when one bad moment feels like the whole story: zoom out and see what else is in frame.',
    css: `
.g-zoom-out { --zo-serif: "Instrument Serif", "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; --zo-mono: "Space Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; }
.g-zoom-out .zo-lens { position: absolute; inset: 0; z-index: 10; touch-action: none; cursor: grab; outline: none; }
.g-zoom-out .zo-lens.zo-grab { cursor: grabbing; }
.g-zoom-out .zo-lens:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 210, 120, .85); }
.g-zoom-out .zo-hud { position: absolute; z-index: 32; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 60px); transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 6px 16px 7px; min-width: 214px; border-radius: 14px; pointer-events: none; text-align: center; background: rgba(14, 11, 18, .8); color: #f7f0e3; border: 1px solid rgba(255, 244, 225, .16); box-shadow: 0 8px 24px rgba(0, 0, 0, .38); transition: opacity .5s ease; }
.g-zoom-out .zo-hud.zo-off { opacity: 0; }
.g-zoom-out .zo-lvl { font: italic 400 20px/1.05 var(--zo-serif); letter-spacing: .01em; white-space: nowrap; }
.g-zoom-out .zo-meta { font: 700 12px/1.2 var(--zo-mono); letter-spacing: .05em; text-transform: uppercase; color: #ecc57c; white-space: nowrap; font-variant-numeric: tabular-nums; }
.g-zoom-out.zo-bright .zo-hud { background: rgba(255, 252, 246, .92); color: #2a1d12; border-color: rgba(42, 29, 16, .14); box-shadow: 0 8px 22px rgba(60, 40, 20, .2); }
.g-zoom-out.zo-bright .zo-meta { color: #94540c; }
.g-zoom-out.zo-tense .zo-hud { background: rgba(20, 6, 9, .82); color: #fbe9e4; border-color: rgba(255, 120, 100, .32); }
.g-zoom-out.zo-tense .zo-meta { color: #ff9b86; }
.g-zoom-out .zo-card { position: absolute; z-index: 33; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 106px); padding: 12px 16px 14px; border-radius: 16px; color: #2a1d12;
  background: linear-gradient(180deg, #fffaf0, #f2e7d2); box-shadow: 0 0 0 1px rgba(120, 90, 50, .38), 0 18px 38px rgba(0, 0, 0, .45); display: flex; flex-direction: column; gap: 7px; }
.g-zoom-out .zo-card[hidden] { display: none; }
.g-zoom-out .zo-card.zo-swap { animation: zoom-out-in .4s cubic-bezier(.2, 1.15, .4, 1) both; }
.g-zoom-out .zo-kick { display: flex; align-items: center; gap: 7px; font: 700 12px/1.25 var(--zo-mono); letter-spacing: .07em; text-transform: uppercase; color: #8a5a1c; }
.g-zoom-out .zo-rec { width: 9px; height: 9px; border-radius: 50%; background: #e8413a; box-shadow: 0 0 8px rgba(232, 65, 58, .85); flex: none; }
.g-zoom-out .zo-hot { font: italic 400 26px/1.1 var(--zo-serif); color: #7a1b26; text-wrap: balance; }
.g-zoom-out .zo-hot .gk-user, .g-zoom-out .zo-new .gk-user, .g-zoom-out .zo-old .gk-user, .g-zoom-out .zo-strip .gk-user, .g-zoom-out .zo-fair .gk-user, .g-zoom-out .zo-cap .gk-user { font-weight: 400; font-size: inherit; }
.g-zoom-out .zo-cam { font: 500 15px/1.35 var(--font-ui); color: #3b2a1c; }
.g-zoom-out .zo-cam b, .g-zoom-out .zo-facts b { font: 700 12px/1 var(--zo-mono); letter-spacing: .05em; text-transform: uppercase; color: #6b5a44; margin-right: 5px; }
.g-zoom-out .zo-cam .gk-user, .g-zoom-out .zo-facts .gk-user { font-weight: 500; }
.g-zoom-out .zo-strip { font: italic 400 21px/1.15 var(--zo-serif); color: #2a1d12; text-wrap: balance; }
.g-zoom-out .zo-strip.zo-hotline { color: #7a1b26; }
.g-zoom-out .zo-q { font: 600 16px/1.3 var(--font-ui); color: #2a1d12; text-wrap: balance; }
.g-zoom-out .zo-note { font: 500 13px/1.35 var(--font-ui); color: #6b5a44; text-wrap: pretty; }
.g-zoom-out .zo-facts { font: 500 15px/1.35 var(--font-ui); color: #3b2a1c; }
.g-zoom-out .zo-caps { display: flex; flex-direction: column; gap: 7px; margin-top: 2px; }
.g-zoom-out .zo-cap { appearance: none; text-align: left; cursor: pointer; min-height: 46px; padding: 8px 14px 9px; border-radius: 12px; border: 1.5px solid rgba(90, 60, 30, .28); background: #fffdf8; color: #2a1d12;
  font: italic 400 19px/1.15 var(--zo-serif); box-shadow: 0 2px 0 rgba(90, 60, 30, .2); transition: transform .12s ease, background .2s ease, border-color .2s ease, opacity .25s ease; }
.g-zoom-out .zo-cap:active { transform: translateY(2px); box-shadow: none; }
.g-zoom-out .zo-cap:focus-visible { outline: 3px solid #e8a53a; outline-offset: 2px; }
.g-zoom-out .zo-cap.zo-yes { background: #e6f5ec; border-color: #1f8a5a; box-shadow: 0 0 0 3px rgba(31, 138, 90, .22); }
.g-zoom-out .zo-cap.zo-no { opacity: .55; text-decoration: line-through; text-decoration-color: rgba(122, 27, 38, .65); animation: zoom-out-shake .4s ease; pointer-events: none; }
.g-zoom-out .zo-big { font: 400 36px/1 var(--zo-serif); color: #2a1d12; text-wrap: balance; }
.g-zoom-out .zo-sub { font: 500 15px/1.35 var(--font-ui); color: #4a3a2a; }
.g-zoom-out .zo-old { font: italic 400 17px/1.2 var(--zo-serif); color: #8a7a66; text-decoration: line-through; text-decoration-color: rgba(138, 122, 102, .75); }
.g-zoom-out .zo-new { font: italic 400 24px/1.12 var(--zo-serif); color: #1d5a46; text-wrap: balance; }
.g-zoom-out .zo-plan { font: 600 15px/1.35 var(--font-ui); color: #23503a; }
.g-zoom-out .zo-title { font: 400 34px/1 var(--zo-serif); color: #2a1d12; }
.g-zoom-out .zo-fair { font: italic 400 20px/1.2 var(--zo-serif); color: #3b2a1c; text-wrap: balance; }
.g-zoom-out .zo-pin { position: absolute; z-index: 31; left: 0; top: 0; pointer-events: none; font: 700 12px/1 var(--zo-mono); letter-spacing: .05em; text-transform: uppercase; color: #fff7e6; background: rgba(20, 14, 10, .86);
  padding: 6px 9px; border-radius: 999px; white-space: nowrap; box-shadow: 0 0 0 1.5px rgba(255, 214, 120, .75), 0 6px 16px rgba(0, 0, 0, .4); opacity: 0; transition: opacity .45s ease; }
.g-zoom-out .zo-pin.on { opacity: 1; }
.g-zoom-out .gk-bubble { max-width: min(250px, calc(100cqw - var(--sz, 96px) - 44px)); }
.g-zoom-out .gk-char.zo-fin .gk-bubble { max-width: calc(100cqw - 2 * var(--sz, 76px) - 60px); }
@keyframes zoom-out-in { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes zoom-out-shake { 0%, 100% { transform: none; } 25% { transform: translateX(-6px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-3px); } }
@container (min-width: 700px) {
  .g-zoom-out .zo-card { left: auto; right: 24px; bottom: auto; top: calc(env(safe-area-inset-top, 0px) + 72px); width: var(--zo-cw, 344px); padding: 16px 20px 18px; gap: 9px; }
  .g-zoom-out .zo-hot { font-size: 32px; }
  .g-zoom-out .zo-big { font-size: 44px; }
  .g-zoom-out .zo-title { font-size: 44px; }
  .g-zoom-out .zo-new { font-size: 28px; }
  .g-zoom-out .zo-lvl { font-size: 22px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const now = () => performance.now();
      const inten = ctx.intensity, visits = K.visits(), text = String(ctx.text || ''), noWords = !text.trim();
      const reduced = () => K.reduced(), bright = () => S.scene() === 'bright';
      const care = () => an.safety === 'care';
      const support = () => (an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak');
      const L = (o) => ctx.line(care() ? { Jolly: o.Jolly, Cheeky: o.Jolly, Unfiltered: o.Unfiltered } : o) || '';
      const RNG = K.rng((K.daily() * 7919 + visits * 104729 + 23) >>> 0);
      const pickR = (arr) => arr[Math.floor(RNG() * arr.length) % arr.length];
      const PIC = visits === 0 ? PICS[0] : K.dailyPick(PICS, 3);
      const STOPS = inten === 0 ? ['day', 'week'] : inten === 2 ? ['hour', 'day', 'days', 'week'] : ['hour', 'day', 'week'];
      const SCENE = sceneFor(text);
      const [BC, BR] = PIC.spot, BAD = BR * COLS + BC;
      const FACT_POS = [[BC - 1, BR], [BC + 1, BR]];

      /* ---------------- the player's words (only as the reading gives them) ---------------- */
      const clip = (s, n) => {
        s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
        if (s.length > n) { const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); s = (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; }
        if ((s.match(/"/g) || []).length % 2) s += '"';
        if ((s.match(/“/g) || []).length > (s.match(/”/g) || []).length) s += '”';
        return s;
      };
      const tidy = (s, n) => { s = clip(String(s || '').replace(/;\s+/g, '. '), n || 150); if (!s) return ''; s = s[0].toUpperCase() + s.slice(1); return /[.!?…"”’)]$/.test(s) ? s : s + '.'; };
      const W8 = { hot: '', cam: '', facts: [], balanced: '', plan: '' };
      function readWords() {
        const sp = Array.isArray(an.spans) ? an.spans.filter(x => x && typeof x.quote === 'string' && x.quote.trim()) : [];
        const cams = sp.filter(x => x.kind === 'camera').map(x => x.quote.trim()), brains = sp.filter(x => x.kind !== 'camera').map(x => x.quote.trim());
        const score = (q, i) => { const n = q.split(/\s+/).length; return (/\b(definitely|going to|gonna|will|won'?t|must|never|always|everyone|nobody|hates?|fired|sacked|ruin\w*|over|fail\w*|stupid|idiot|useless|worthless|everything|nothing|incompetent)\b|\w+['’]ll\b/i.test(q) ? 3 : 0) + (/\b(i|i'?m|i’m|my|me)\b/i.test(q) ? 1 : 0) + Math.min(2, n / 4) - (n > 18 ? 1 : 0) + i * 0.05; };
        let hot = '', best = -1;
        brains.forEach((q, i) => { const s = score(q, i); if (s > best) { best = s; hot = q; } });
        W8.hot = noWords ? '' : clip((hot || an.thought || an.conclusion || '').replace(/[.!]+$/, ''), 96);
        W8.cam = noWords ? '' : clip(cams[0] || an.situation || '', 130);
        const facts = noWords ? [] : cams.slice(1).map(q => clip(q, 90));
        if (!noWords && an.source === 'ai' && Array.isArray(an.evidence_against)) an.evidence_against.forEach(x => { if (typeof x === 'string' && x.trim()) facts.push(clip(x, 90)); });
        W8.facts = facts.slice(0, 2);
        W8.balanced = noWords ? '' : tidy(an.balanced, 150);
        const ls = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
        const lead = (kind) => { const l = ls.find(x => x.kind === kind); return l ? tidy(l.text, 110) : ''; };
        W8.plan = support() !== 'weak' ? (lead('prepare') || lead('ask')) : '';
      }
      readWords();

      /* ---------------- the mosaic: 1,728 tiles whose colours are today's picture ---------------- */
      const tileCSS = new Array(NT), cleanCSS = new Array(NT), tileType = new Array(NT), tileInk = new Uint8Array(NT);
      const pix = document.createElement('canvas'); pix.width = COLS; pix.height = ROWS;      // tile colours (with a little variation)
      const pixTrue = document.createElement('canvas'); pixTrue.width = COLS; pixTrue.height = ROWS; // the picture itself
      let atlas24 = null, atlas48 = null;
      const iconCache = new Map();
      function iconSprite(type, ink, size) {
        const key = type + ink + size; let c = iconCache.get(key); if (c) return c;
        c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
        g.scale(size / 100, size / 100); g.fillStyle = g.strokeStyle = ink ? '#140d08' : '#ffffff'; g.lineCap = 'round'; g.lineJoin = 'round';
        try { (ICONS[type] || ICONS.cloud)(g); } catch (e) { /* a broken icon never breaks the mosaic */ }
        iconCache.set(key, c); return c;
      }
      let shadeSpr = null;
      function shadeSprite() {
        if (shadeSpr) return shadeSpr;
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.2)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(0, 0, 64, 1.2); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 62.8, 64, 1.2);
        return (shadeSpr = c);
      }
      function buildData() {
        const pt = pixTrue.getContext('2d'); pt.clearRect(0, 0, COLS, ROWS);
        try { PIC.draw(pt, COLS, ROWS); } catch (e) { pt.fillStyle = '#556'; pt.fillRect(0, 0, COLS, ROWS); }
        let d = null; try { d = pt.getImageData(0, 0, COLS, ROWS).data; } catch (e) { d = null; }
        const pg = pix.getContext('2d'), img = pg.createImageData(COLS, ROWS);
        for (let i = 0; i < NT; i++) {
          const r0 = d ? d[i * 4] : 90, g0 = d ? d[i * 4 + 1] : 90, b0 = d ? d[i * 4 + 2] : 110;
          cleanCSS[i] = 'rgb(' + r0 + ',' + g0 + ',' + b0 + ')';
          const v = 1 + (hash01(i) - 0.5) * 0.14, warm = (hash01(i * 3 + 1) - 0.5) * 14;
          const r = clamp(Math.round(r0 * v + warm), 0, 255), g = clamp(Math.round(g0 * v), 0, 255), b = clamp(Math.round(b0 * v - warm), 0, 255);
          img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
          tileCSS[i] = 'rgb(' + r + ',' + g + ',' + b + ')';
          const list = BUCKET[bucketOf(r, g, b)] || BUCKET.grey;
          tileType[i] = list[Math.floor(hash01(i * 7 + 3) * list.length) % list.length];
          tileInk[i] = lumOf(r, g, b) < 0.56 ? 0 : 1;
        }
        pg.putImageData(img, 0, 0);
        markFacts();
      }
      function markFacts() { FACT_POS.forEach(([c, r], k) => { if (c < 0 || c >= COLS) return; const i = r * COLS + c; if (k < W8.facts.length) tileType[i] = 'camera'; else if (tileType[i] === 'camera') { const list = BUCKET.grey; tileType[i] = list[i % list.length]; } }); }
      function drawTile(g, i, x, y, s, ds, labels) {
        const gap = s < 4 ? 0 : Math.max(0.7, s * 0.045);
        g.fillStyle = tileCSS[i]; g.fillRect(x + gap / 2, y + gap / 2, s - gap, s - gap);
        if (s * ds < 7) return;
        const ink = tileInk[i], sz = s * ds > 150 ? 256 : s * ds > 56 ? 128 : 48, spr = iconSprite(tileType[i], ink, sz);
        const is = s * (labels ? 0.5 : 0.56);
        g.globalAlpha = (ink ? 0.3 : 0.42) * (s >= 60 ? 1.25 : 1); g.drawImage(spr, x + (s - is) / 2, y + s * (labels ? 0.11 : 0.14), is, is); g.globalAlpha = 1;
        if (s >= 40) g.drawImage(shadeSprite(), x + gap / 2, y + gap / 2, s - gap, s - gap);
        if (labels) {
          const fs = clamp(s * 0.095, 12, 20);
          g.font = '700 ' + fs.toFixed(1) + 'px ' + UIF; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
          g.fillStyle = ink ? 'rgba(24,16,10,0.82)' : 'rgba(255,250,240,0.9)';
          g.fillText(tileType[i] === 'camera' ? 'On record' : LABEL[tileType[i]] || '', x + s / 2, y + s * 0.86);
        }
      }
      function buildAtlas(T) {
        const c = document.createElement('canvas'); c.width = COLS * T; c.height = ROWS * T;
        const g = c.getContext('2d', { alpha: false });
        g.fillStyle = GROUT; g.fillRect(0, 0, c.width, c.height);
        for (let i = 0; i < NT; i++) drawTile(g, i, (i % COLS) * T, Math.floor(i / COLS) * T, T, 1, false);
        return c;
      }
      let UIF = 'Fredoka, Nunito, "Trebuchet MS", system-ui, sans-serif';
      try { const f = getComputedStyle(el).getPropertyValue('--font-ui').trim(); if (f) UIF = f; } catch (e) { /* default stack */ }
      const MONO = '"Space Mono", ui-monospace, Menlo, Consolas, monospace';
      buildData();

      /* ---------------- state ---------------- */
      const P = { phase: 'intro', stopIdx: -1, gate: null, calm: 0, recap: false, caps: [], capRes: null, chips: [], revealT0: 0, fin: null, finished: false, lastNow: 0, more: false, firstTouch: false, flash: 0, pinT0: 0, hbT: 0, playing: true };
      const Z = { u: 0, raw: 0, held: false, vel: 0, lo: 0, hi: 0.02, auto: null, lastT: 0, lastU: 0, speed: 0 };
      const V = { z: 1000, ox: 0, oy: 0, z1: 10, L1: 2.3 };
      const M = { W: 0, H: 0, phone: true, side: 0, top: 112, dock: 108, cardH: 0, z0: 1000, L0: 6.9, F: null, Ft: null, CH: 76 };
      const FX = K.particles({ max: 320 });

      /* ---------------- DOM ---------------- */
      const SOFT = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 2 });
      const lens = h('div', { class: 'zo-lens', tabindex: '0', role: 'application', 'aria-label': 'A photo of your week. Pinch, drag down or scroll to zoom out; drag up to zoom in. Plus and minus keys work too.' });
      const hudLvl = h('div', { class: 'zo-lvl', text: 'One moment' }), hudMeta = h('div', { class: 'zo-meta', text: '' });
      const hud = h('div', { class: 'zo-hud', role: 'status' }, hudLvl, hudMeta);
      const card = h('div', { class: 'zo-card', hidden: true, 'aria-live': 'polite' });
      const pin = h('div', { class: 'zo-pin', text: '1 of 1,728' });
      el.append(lens, hud, pin, card);
      M.CH = K.phone() ? 76 : 100;
      const sync = K.character('sync', { side: 'right', mood: 'worried', size: M.CH });
      const glitch = K.character('glitch', { side: 'right', mood: 'scan', size: M.CH });
      glitch.show(false);
      const applyTheme = () => el.classList.toggle('zo-bright', bright());
      applyTheme(); S.on('theme', applyTheme);

      /* ---------------- sound ---------------- */
      const music = K.music('space'); music.level(0.14);
      let motor = null, drone = null, musicLv = 0.14;
      function beds() {
        if (!A.ctx) return;
        if (!motor) motor = A.loop({ pink: true, filter: 'bandpass', freq: 600, q: 5, bus: 'sfx' });
        if (!drone) { drone = A.loop({ pink: true, filter: 'lowpass', freq: 150, q: 0.9, bus: 'amb' }); if (drone) drone.level(0.06, 1.2); }
      }
      beds(); S.on('audio-ready', beds);
      S.onDestroy(() => { [motor, drone].forEach(x => { if (x) x.stop(); }); });
      S.every(() => { if (P.phase === 'close' && Z.u < 0.06 && !reduced()) K.sfx.heartbeat(); }, 1500);
      function notchSound(n) {
        if (!A.ctx) return;
        const f = A.note(SCALE[clamp(n, 0, SCALE.length - 1)]);
        A.pluck(f, { vol: 0.13, damp: 0.995, verb: 0.3, pan: clamp((n / 18 - 0.5) * 1.2, -0.7, 0.7) });
        A.click({ vol: 0.025 });
        A.sync('notch', now());
      }
      function shutter() {
        if (!A.ctx) return;
        const t = A.now();
        A.noise({ when: t, filter: 'highpass', freq: 2600, dur: 0.035, vol: 0.2 });
        A.tone({ when: t, type: 'square', freq: 190, to: 90, dur: 0.05, vol: 0.05, lp: 1400 });
        A.noise({ when: t + 0.07, filter: 'bandpass', freq: 1700, q: 2, dur: 0.05, vol: 0.16 });
        A.click({ when: t + 0.075, vol: 0.12 });
        A.sync('shutter', now());
      }
      function fairChord() { if (!A.ctx) return; const t = A.now(); ['C5', 'E5', 'G5', 'D6'].forEach((n, i) => A.chime(A.note(n), { when: t + i * 0.06, vol: 0.07, dur: 1.6 })); A.sync('fair', now()); }
      function softNo() { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 260, to: 170, glide: 0.2, dur: 0.26, vol: 0.08 }); A.sync('no', now()); }

      /* ---------------- layout: the frame the picture lands in (it shifts as the card grows) ---------------- */
      function frameTarget() {
        const W = M.W, H = M.H;
        if (M.phone) { const y = M.top + 4, bottom = M.dock + (M.cardH ? M.cardH + 10 : 0); return { x: 12, y, w: W - 24, h: Math.max(150, H - y - bottom) }; }
        const y = M.top + 4; return { x: 28, y, w: Math.max(260, W - 28 - M.side - 20), h: Math.max(200, H - y - 26) };
      }
      let vig = null;
      function buildVignette() {
        const w = Math.max(2, Math.round(M.W / 2)), hh = Math.max(2, Math.round(M.H / 2));
        vig = document.createElement('canvas'); vig.width = w; vig.height = hh; const g = vig.getContext('2d');
        const gr = g.createRadialGradient(w / 2, hh * 0.46, Math.min(w, hh) * 0.2, w / 2, hh * 0.46, Math.hypot(w, hh) * 0.62);
        g.fillStyle = 'rgba(78,0,14,0.3)'; g.fillRect(0, 0, w, hh); // the darkroom's red cast, baked in with the vignette
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(10,0,4,0.55)'); gr.addColorStop(1, 'rgba(6,0,2,0.92)');
        g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      }
      let grain = null, grainPat = null;
      function buildGrain() {
        grain = document.createElement('canvas'); grain.width = grain.height = 128; const g = grain.getContext('2d'), img = g.createImageData(128, 128);
        for (let i = 0; i < 128 * 128; i++) { const v = Math.random() < 0.5 ? 0 : 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = Math.floor(Math.random() * 120); }
        g.putImageData(img, 0, 0);
      }
      buildGrain();
      function layout() {
        M.W = cv.w; M.H = cv.h; if (!M.W || !M.H) return;
        M.phone = M.W < 700;
        M.side = M.phone ? 0 : clamp(Math.round(M.W * 0.3), 340, 420);
        M.top = M.hudOn === false ? 64 : 112; M.dock = M.phone ? M.CH + 32 : 0;
        M.z0 = Math.max(M.W, M.H) * 1.15; M.L0 = Math.log(M.z0);
        M.Ft = frameTarget(); if (!M.F) M.F = Object.assign({}, M.Ft);
        placeChars();
        if (!M.phone) el.style.setProperty('--zo-cw', (M.side - 40) + 'px');
        buildVignette(); grainPat = null;
        measureCard();
      }
      function placeChars() {
        const dock = (c) => { c.el.style.left = ''; c.el.style.top = ''; c.el.style.transition = ''; c.el.classList.add('gk-char-dock'); };
        const at = (c, x, y) => { c.el.classList.remove('gk-char-dock'); c.place(x, y); };
        if (M.phone) { dock(glitch); if (P.fin) at(sync, 12 + M.CH + 6, M.H - 12 - M.CH); else dock(sync); }
        else { const x = M.W - M.side + 8, y = M.H - 14 - M.CH; at(glitch, x, y); at(sync, P.fin ? x + M.CH + 8 : x, y); }
      }
      function setHud(on) { M.hudOn = on; hud.classList.toggle('zo-off', !on); M.top = on ? 112 : 64; M.Ft = frameTarget(); }
      function measureCard() { M.cardH = M.phone && !card.hidden ? card.offsetHeight || 0 : 0; M.Ft = frameTarget(); }
      function animFrame(rdt) {
        const F = M.F, T = M.Ft; if (!F || !T) return;
        const k = 1 - Math.exp(-rdt * 7);
        const oldL1 = Math.log(Math.min(F.w / COLS, F.h / ROWS));
        F.x += (T.x - F.x) * k; F.y += (T.y - F.y) * k; F.w += (T.w - F.w) * k; F.h += (T.h - F.h) * k;
        const newL1 = Math.log(Math.min(F.w / COLS, F.h / ROWS));
        // keep the zoom where the player left it while the frame reshapes (unless the whole picture is in view)
        if (Math.abs(newL1 - oldL1) > 1e-5 && Z.u < 0.995 && !Z.auto) {
          const conv = (u) => (M.L0 - lerp(M.L0, oldL1, u)) / (M.L0 - newL1);
          Z.u = conv(Z.u); Z.raw = conv(Z.raw);
        }
      }
      const z1Of = () => Math.min(M.F.w / COLS, M.F.h / ROWS);
      const uOfZ = (z) => clamp((M.L0 - Math.log(z)) / (M.L0 - Math.log(z1Of())), 0, 1);
      const stopU = (stop) => (stop === 'week' ? 1 : uOfZ(M.F.w / STOP_TILES[stop]));
      function computeView(u) {
        const F = M.F, z1 = z1Of(), L1 = Math.log(z1);
        const breathe = !reduced() && !P.recap && !P.revealT0 ? 0.014 * (1 - sstep(0, 0.12, u)) * Math.sin(now() / 1000 * 0.9) : 0; // the close-up leans in, uneasily
        const z = Math.exp(lerp(M.L0, L1, u) + breathe);
        const pw = COLS * z1, ph = ROWS * z1, px0 = F.x + (F.w - pw) / 2, py0 = F.y + (F.h - ph) / 2;
        const px1 = px0 + (BC + 0.5) * z1, py1 = py0 + (BR + 0.5) * z1;
        const f = sstep(0.3, 1, u), px = lerp(F.x + F.w / 2, px1, f), py = lerp(F.y + F.h * 0.5, py1, f);
        V.z = z; V.ox = px - (BC + 0.5) * z; V.oy = py - (BR + 0.5) * z; V.z1 = z1; V.L1 = L1; V.pic = { x: px0, y: py0, w: pw, h: ph };
      }
      function visibleCount() { // tiles inside the frame (the part of the view nothing covers)
        const F = M.F, e = 0.5;
        const c0 = clamp(Math.floor((F.x + e - V.ox) / V.z), 0, COLS - 1), c1 = clamp(Math.floor((F.x + F.w - e - V.ox) / V.z), 0, COLS - 1);
        const r0 = clamp(Math.floor((F.y + e - V.oy) / V.z), 0, ROWS - 1), r1 = clamp(Math.floor((F.y + F.h - e - V.oy) / V.z), 0, ROWS - 1);
        return Math.max(1, (c1 - c0 + 1) * (r1 - r0 + 1));
      }
      const fmtN = (n) => n.toLocaleString('en-AU');
      function timeOf(n) {
        const m = n * MIN_PER;
        if (n >= NT) return 'the whole week';
        if (m < 55) return '~' + Math.max(5, Math.round(m / 5) * 5) + ' min';
        if (m < 60 * 22) { const hrs = Math.round(m / 60); return '~' + hrs + (hrs === 1 ? ' hour' : ' hours'); }
        const d = m / 1440; return '~' + (d < 3 ? d.toFixed(1).replace(/\.0$/, '') : Math.round(d)) + (d < 1.05 ? ' day' : ' days');
      }
      function levelOf(n) {
        const hrs = n * MIN_PER / 60;
        return n <= 1 ? 'One moment' : hrs < 1.2 ? 'The minutes around it' : hrs < 7 ? 'The hours around it' : hrs < 30 ? 'The day around it' : hrs < 100 ? 'The days around it' : n < NT ? 'Most of the week' : 'The whole week';
      }

      /* ---------------- zoom input: pinch, one-finger drag, wheel, keys ---------------- */
      const canZoom = () => !Z.auto && (P.phase === 'close' || P.phase === 'zoom' || P.phase === 'cap' || P.phase === 'zoomin' || P.phase === 'outro' || P.phase === 'reveal' || P.phase === 'newcap');
      const DRAG_K = () => 1 / (M.H * 0.95);
      const PINCH_K = () => 1.7 / Math.max(1, M.L0 - V.L1);
      const RUB = 0.05;
      function rub(x) { if (x > Z.hi) return Z.hi + RUB * (1 - 1 / (1 + (x - Z.hi) / RUB)); if (x < Z.lo) return Z.lo - RUB * (1 - 1 / (1 + (Z.lo - x) / RUB)); return x; }
      function setRaw(v) {
        const t = now(), dt = Math.max(8, t - Z.lastT) / 1000;
        const inst = clamp((v - Z.raw) / dt, -6, 6);
        Z.vel = Z.vel * 0.6 + inst * 0.4; Z.raw = v; Z.lastT = t;
        touched();
      }
      function touched() { if (!P.firstTouch) { P.firstTouch = true; } if (now() - (P.gd || 0) > 350) { P.gd = now(); K.guideDone(); } }
      const ptrs = new Map(); let base = null;
      function rebase() {
        const pts = Array.from(ptrs.values());
        if (pts.length >= 2) base = { kind: 'pinch', d: Math.max(24, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)), raw: Z.raw };
        else if (pts.length === 1) base = { kind: 'drag', y: pts[0].y, raw: Z.raw };
        else base = null;
      }
      S.listen(lens, 'pointerdown', (e) => {
        if (e.button > 0) return;
        A.unlock();
        try { lens.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
        const p = K.local(e, el); ptrs.set(e.pointerId, p);
        if (!canZoom()) { poke(p); return; }
        Z.held = true; Z.vel = 0; Z.lastT = now(); rebase();
        lens.classList.add('zo-grab'); poke(p);
      });
      S.listen(lens, 'pointermove', (e) => {
        if (!ptrs.has(e.pointerId)) return;
        const p = K.local(e, el); ptrs.set(e.pointerId, p);
        if (!canZoom() || !base || !Z.held) return;
        const pts = Array.from(ptrs.values());
        if (base.kind === 'pinch' && pts.length >= 2) { const d = Math.max(24, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)); setRaw(base.raw - Math.log(d / base.d) * PINCH_K()); }
        else if (base.kind === 'drag' && pts.length === 1) setRaw(base.raw + (p.y - base.y) * DRAG_K());
      });
      const lift = (e) => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.delete(e.pointerId);
        if (ptrs.size) { rebase(); return; }
        lens.classList.remove('zo-grab');
        if (!Z.held) return;
        Z.held = false; base = null;
        if (now() - Z.lastT > 90) Z.vel = 0;
        Z.vel = clamp(Z.vel, -3, 3);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => S.listen(lens, t, lift));
      S.listen(lens, 'wheel', (e) => {
        e.preventDefault();
        if (!canZoom()) return;
        A.unlock();
        const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
        Z.raw = clamp(Z.raw + dy * (e.ctrlKey ? 0.012 : 0.0011), Z.lo - 0.04, Z.hi + 0.04); Z.vel = 0;
        touched();
      }, { passive: false });
      K.onKey(['Minus', 'NumpadSubtract', 'Equal', 'NumpadAdd', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', '-', '+', '='], (e) => {
        if (!canZoom()) return;
        const outKey = e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'ArrowDown' || e.code === 'PageDown' || e.key === '-';
        e.preventDefault(); A.unlock();
        Z.raw = clamp(Z.raw + (outKey ? 0.075 : -0.075), Z.lo - 0.03, Z.hi + 0.03); Z.vel = 0;
        touched();
      });
      function poke(p) {
        FX.emit('mote', p.x, p.y, 4, { colors: ['#fff4dc', '#ffd38a'] });
        P.ring = { x: p.x, y: p.y, t0: now() };
        if (A.ctx) { A.click({ vol: 0.05 }); A.tone({ type: 'sine', freq: 420 + Z.u * 500, dur: 0.06, vol: 0.03 }); }
      }
      function stepZoom(rdt) {
        if (Z.auto) {
          const k = clamp((now() - Z.auto.t0) / Z.auto.ms, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          Z.raw = Z.u = lerp(Z.auto.from, Z.auto.to, e);
          if (k >= 1) { const cb = Z.auto.done; Z.auto = null; if (cb) cb(); }
          return;
        }
        if (!Z.held) {
          if (Math.abs(Z.vel) > 0.004) { Z.raw += Z.vel * rdt; Z.vel *= Math.exp(-rdt * 4.2); } else Z.vel = 0;
          if (Z.raw > Z.hi) { Z.raw += (Z.hi - Z.raw) * (1 - Math.exp(-rdt * 11)); if (Z.vel > 0) Z.vel = 0; }
          if (Z.raw < Z.lo) { Z.raw += (Z.lo - Z.raw) * (1 - Math.exp(-rdt * 11)); if (Z.vel < 0) Z.vel = 0; }
        }
        Z.u += (rub(Z.raw) - Z.u) * (1 - Math.exp(-rdt * 17));
        Z.u = clamp(Z.u, -0.06, 1.06);
      }

      /* ---------------- drawing ---------------- */
      function drawAtlas(g, img, T, z, ox, oy) {
        const x0 = Math.max(0, -ox / z), y0 = Math.max(0, -oy / z), x1 = Math.min(COLS, (M.W - ox) / z), y1 = Math.min(ROWS, (M.H - oy) / z);
        if (x1 <= x0 || y1 <= y0) return;
        g.drawImage(img, x0 * T, y0 * T, (x1 - x0) * T, (y1 - y0) * T, ox + x0 * z, oy + y0 * z, (x1 - x0) * z, (y1 - y0) * z);
      }
      function drawMosaic(g) {
        const z = V.z, ox = V.ox, oy = V.oy, dpr = cv.dpr || 1, zd = z * dpr;
        if (zd <= 30 && atlas24) { drawAtlas(g, atlas24, 24, z, ox, oy); return; }
        if (zd <= 62 && atlas48) { drawAtlas(g, atlas48, 48, z, ox, oy); return; }
        const c0 = Math.max(0, Math.floor(-ox / z)), c1 = Math.min(COLS - 1, Math.floor((M.W - ox) / z));
        const r0 = Math.max(0, Math.floor(-oy / z)), r1 = Math.min(ROWS - 1, Math.floor((M.H - oy) / z));
        if (c1 < c0 || r1 < r0) return;
        const pat = finishPattern(g, z, ox, oy);
        if (!pat) {
          g.fillStyle = GROUT; g.fillRect(ox + c0 * z, oy + r0 * z, (c1 - c0 + 1) * z, (r1 - r0 + 1) * z);
          const lab = z >= 96;
          for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = r * COLS + c; if (i !== BAD) drawTile(g, i, ox + c * z, oy + r * z, z, dpr, lab); }
          return;
        }
        const gx = ox + c0 * z, gy = oy + r0 * z, gw = (c1 - c0 + 1) * z, gh = (r1 - r0 + 1) * z;
        g.imageSmoothingEnabled = false; g.drawImage(pix, c0, r0, c1 - c0 + 1, r1 - r0 + 1, gx, gy, gw, gh); g.imageSmoothingEnabled = true;
        const labels = z >= 96, ds = z * dpr, sz = ds > 150 ? 256 : ds > 56 ? 128 : 48, is = z * (labels ? 0.5 : 0.56), iy = z * (labels ? 0.11 : 0.14), ia = z >= 60 ? 1.25 : 1;
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
          const i = r * COLS + c; if (i === BAD) continue;
          const ink = tileInk[i]; g.globalAlpha = (ink ? 0.3 : 0.42) * ia;
          g.drawImage(iconSprite(tileType[i], ink, sz), ox + c * z + (z - is) / 2, oy + r * z + iy, is, is);
        }
        g.globalAlpha = 1;
        if (labels) {
          const fs = clamp(z * 0.095, 12, 20); g.font = '700 ' + fs.toFixed(1) + 'px ' + UIF; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
          for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
            const i = r * COLS + c; if (i === BAD) continue;
            g.fillStyle = tileInk[i] ? 'rgba(24,16,10,0.82)' : 'rgba(255,250,240,0.9)';
            g.fillText(tileType[i] === 'camera' ? 'On record' : LABEL[tileType[i]] || '', ox + c * z + z / 2, oy + r * z + z * 0.86);
          }
        }
        g.fillStyle = pat; g.fillRect(gx, gy, gw, gh);
      }
      /* one pattern tile = the print's gloss, its edge light and the grout around it; scaled to the zoom, it finishes every tile in one fill */
      let finCanvas = null, finPat = null, finCtx = null, finOK = true;
      function finishPattern(g, z, ox, oy) {
        if (!finOK || typeof DOMMatrix !== 'function') return null;
        if (!finCanvas) {
          const T = 128, c = document.createElement('canvas'); c.width = c.height = T; const x = c.getContext('2d');
          const gap = T * 0.045;
          x.fillStyle = GROUT; x.fillRect(0, 0, T, T); x.clearRect(gap / 2, gap / 2, T - gap, T - gap);
          const gr = x.createLinearGradient(0, 0, T, T); gr.addColorStop(0, 'rgba(255,255,255,0.2)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.2)');
          x.fillStyle = gr; x.fillRect(gap / 2, gap / 2, T - gap, T - gap);
          x.fillStyle = 'rgba(255,255,255,0.26)'; x.fillRect(gap / 2, gap / 2, T - gap, 2); x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(gap / 2, T - gap / 2 - 2, T - gap, 2);
          finCanvas = c;
        }
        if (!finPat || finCtx !== g) { try { finPat = g.createPattern(finCanvas, 'repeat'); finCtx = g; } catch (e) { finPat = null; } if (!finPat || !finPat.setTransform) { finOK = false; return null; } }
        try { finPat.setTransform(new DOMMatrix([z / 128, 0, 0, z / 128, ox, oy])); } catch (e) { finOK = false; return null; }
        return finPat;
      }
      function drawBad(g, t) {
        const z = V.z, x = V.ox + BC * z, y = V.oy + BR * z;
        if (x > M.W || y > M.H || x + z < 0 || y + z < 0) return;
        const pixK = P.recap ? sstep(0.62, 0.98, Z.u) : sstep(0.55, 0.95, Z.u);
        if (z >= 12 && pixK < 0.995) {
          g.save(); g.beginPath(); g.rect(x, y, z, z); g.clip();
          g.translate(x, y); g.scale(z / 100, z / 100);
          try { SCENES[SCENE](g, P.calm); } catch (e) { g.fillStyle = '#402030'; g.fillRect(0, 0, 100, 100); }
          g.restore();
        }
        if (pixK > 0.005 || z < 12) { g.globalAlpha = z < 12 ? 1 : pixK; g.fillStyle = mixHex('#c23a3a', '#' + cleanHex(BAD), P.calm); g.fillRect(x, y, z, z); g.globalAlpha = 1; }
        // the tile's frame: red while it is the whole story, gold once it has its place in the picture
        const show = z < 1400 ? 1 : 0;
        if (show && z > 3) {
          const lw = clamp(z * 0.028, 1.4, 4.5), gold = P.revealT0 > 0 || P.recap;
          const a = gold ? 0.95 : 0.55 + 0.4 * sstep(0.05, 0.4, Z.u);
          g.strokeStyle = gold ? rgba('#ffd27a', a) : rgba('#ff4a3d', a); g.lineWidth = lw;
          g.strokeRect(x + lw / 2, y + lw / 2, z - lw, z - lw);
        }
        if (P.revealT0 > 0 && z < 40) {
          const e = (now() - P.revealT0) / 1000, cx = x + z / 2, cy = y + z / 2;
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let k = 0; k < 3; k++) { const p = ((e * 0.8 + k / 3) % 1), R = z * 0.8 + p * z * 4.5; g.strokeStyle = rgba('#ffd27a', (1 - p) * 0.7); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); }
          g.globalAlpha = 0.65 + 0.35 * Math.sin(t * 4); g.drawImage(K.glowSprite('#ffd27a'), cx - z * 2.6, cy - z * 2.6, z * 5.2, z * 5.2);
          g.restore();
        }
      }
      const cleanHexCache = {};
      function cleanHex(i) { if (cleanHexCache[i]) return cleanHexCache[i]; const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(cleanCSS[i] || ''); const s = m ? [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('') : '808080'; return (cleanHexCache[i] = s); }
      function tenseK() { return P.recap || P.revealT0 ? 0 : 1 - sstep(0.02, 0.45, Z.u); }
      function surround(br) {
        const k = 1 - tenseK();
        return mixHex('#1c070b', br ? '#ece4d5' : '#100d15', k);
      }
      function drawFrameDeco(g) {
        // the print: a soft halo and a paper mat that arrive as the picture comes into view
        const k = sstep(0.72, 1, Z.u); if (k <= 0.01 || !V.pic) return;
        const pr = { x: V.ox, y: V.oy, w: COLS * V.z, h: ROWS * V.z }, br = bright();
        if (!SOFT) { g.save(); g.globalAlpha = k * (br ? 0.55 : 0.32); g.globalCompositeOperation = br ? 'source-over' : 'lighter';
          const gs = Math.max(pr.w, pr.h) * 1.5; g.drawImage(K.glowSprite(br ? '#fff6e2' : PIC.glow), pr.x + pr.w / 2 - gs / 2, pr.y + pr.h / 2 - gs / 2, gs, gs); g.restore(); }
        const m = 7 * k;
        g.fillStyle = 'rgba(0,0,0,' + (0.32 * k).toFixed(3) + ')'; g.fillRect(pr.x - m + 4, pr.y - m + 7, pr.w + m * 2, pr.h + m * 2);
        g.fillStyle = rgba('#f8f2e6', k); g.fillRect(pr.x - m, pr.y - m, pr.w + m * 2, pr.h + m * 2);
      }
      let scrim = null, scrimKey = '';
      function drawScrim(g) {
        const col = surround(bright()), key = col + M.W;
        if (key !== scrimKey) { scrimKey = key; scrim = g.createLinearGradient(0, 0, 0, 130); scrim.addColorStop(0, rgba(col, 0.82)); scrim.addColorStop(0.55, rgba(col, 0.42)); scrim.addColorStop(1, rgba(col, 0)); }
        g.fillStyle = scrim; g.fillRect(0, 0, M.W, 130);
      }
      function drawLensFX(g, t) {
        const k = tenseK(); if (k <= 0.01) return;
        const W = M.W, H = M.H;
        if (vig) { g.globalAlpha = 0.95 * k; g.drawImage(vig, 0, 0, W, H); g.globalAlpha = 1; }
        if (grain && !SOFT) {
          if (!grainPat) { try { grainPat = g.createPattern(grain, 'repeat'); } catch (e) { grainPat = null; } }
          if (grainPat) { g.save(); const jx = reduced() ? 0 : Math.floor(Math.random() * 128), jy = reduced() ? 0 : Math.floor(Math.random() * 128); g.translate(-jx, -jy); g.globalAlpha = 0.2 * k; g.fillStyle = grainPat; g.fillRect(0, 0, W + 128, H + 128); g.restore(); }
        }
        // viewfinder centre mark and REC light
        const F = M.F, cx = F.x + F.w / 2, cy = F.y + F.h / 2;
        g.strokeStyle = 'rgba(255,236,226,' + (0.5 * k).toFixed(3) + ')'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(cx - 12, cy); g.lineTo(cx - 4, cy); g.moveTo(cx + 4, cy); g.lineTo(cx + 12, cy); g.moveTo(cx, cy - 12); g.lineTo(cx, cy - 4); g.moveTo(cx, cy + 4); g.lineTo(cx, cy + 12); g.stroke();
        const on = reduced() || Math.sin(t * 5) > -0.3;
        if (on) { g.fillStyle = 'rgba(255,60,48,' + k.toFixed(3) + ')'; circ(g, F.x + 18, F.y + 18, 5); g.fill(); }
        g.font = '700 12px ' + MONO; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,236,226,' + (0.9 * k).toFixed(3) + ')'; g.fillText('REC', F.x + 28, F.y + 18.5);
      }
      function drawFinder(g, t) {
        const F = M.F; if (!F || P.fin) return;
        const k = sstep(0.7, 1, Z.u), pr = { x: V.ox, y: V.oy, w: COLS * V.z, h: ROWS * V.z };
        const x0 = Math.max(5, lerp(F.x + 2, pr.x - 16, k)), y0 = Math.max(M.top - 4, lerp(F.y + 2, pr.y - 16, k)), x1 = Math.min(M.W - 5, lerp(F.x + F.w - 2, pr.x + pr.w + 16, k)), y1 = lerp(F.y + F.h - 2, pr.y + pr.h + 16, k);
        const br = bright() && tenseK() < 0.5, pulse = P.stopFlash ? Math.max(0, 1 - (now() - P.stopFlash) / 450) : 0;
        g.strokeStyle = br ? 'rgba(60,40,22,' + (0.55 + pulse * 0.4).toFixed(3) + ')' : 'rgba(255,244,230,' + (0.72 + pulse * 0.28).toFixed(3) + ')';
        g.lineWidth = 2.5 + pulse * 2; const L0 = 22 + pulse * 10;
        g.beginPath();
        g.moveTo(x0, y0 + L0); g.lineTo(x0, y0); g.lineTo(x0 + L0, y0);
        g.moveTo(x1 - L0, y0); g.lineTo(x1, y0); g.lineTo(x1, y0 + L0);
        g.moveTo(x1, y1 - L0); g.lineTo(x1, y1); g.lineTo(x1 - L0, y1);
        g.moveTo(x0 + L0, y1); g.lineTo(x0, y1); g.lineTo(x0, y1 - L0);
        g.stroke();
        void t;
      }
      function drawReveal(g) {
        if (!P.revealT0 || P.fin) return;
        const e = (now() - P.revealT0) / 1000, pr = { x: V.ox, y: V.oy, w: COLS * V.z, h: ROWS * V.z };
        if (e < 1.6 && !reduced()) {
          const p = e / 1.6, bx = lerp(pr.x - pr.w * 0.6, pr.x + pr.w * 1.6, p);
          g.save(); g.beginPath(); g.rect(pr.x, pr.y, pr.w, pr.h); g.clip(); g.globalCompositeOperation = 'lighter';
          const gr = g.createLinearGradient(bx - pr.w * 0.25, 0, bx + pr.w * 0.25, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,250,235,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(pr.x, pr.y, pr.w, pr.h); g.restore();
        }
        if (P.flash > 0) { g.fillStyle = 'rgba(255,252,240,' + P.flash.toFixed(3) + ')'; g.fillRect(0, 0, M.W, M.H); }
      }
      /* the finale: tiles flip in a wave from the rough moment outward, then the mosaic becomes one painting */
      let painting = null;
      function buildPainting() {
        const dpr = cv.dpr || 1, w = Math.max(36, Math.min(1400, Math.round(COLS * V.z1 * dpr * 1.25))), hh = Math.round(w * ROWS / COLS);
        const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d');
        try { PIC.draw(g, w, hh); } catch (e) { g.drawImage(pixTrue, 0, 0, w, hh); }
        painting = c;
      }
      function drawFinale(g, t) {
        const F = P.fin, e = (now() - F.t0) / 1000, z = V.z, ox = V.ox, oy = V.oy, pw = COLS * z, ph = ROWS * z;
        const WAVE = F.wave, FLIP = F.flip, waving = e < WAVE + FLIP + 0.05;
        const flippedMost = !waving || !atlas24 || e > WAVE * 0.55;
        if (flippedMost) { g.imageSmoothingEnabled = false; g.drawImage(pixTrue, ox, oy, pw, ph); g.imageSmoothingEnabled = true; }
        else g.drawImage(atlas24, ox, oy, pw, ph);
        if (waving) {
          for (let i = 0; i < NT; i++) {
            const p = (e - F.delay[i]) / FLIP;
            if (p >= 1) { if (!flippedMost) { g.fillStyle = cleanCSS[i]; g.fillRect(ox + (i % COLS) * z, oy + ((i / COLS) | 0) * z, z, z); } continue; }
            const c = i % COLS, r = (i / COLS) | 0, x = ox + c * z, y = oy + r * z;
            if (p <= 0) { if (flippedMost) { if (atlas24) g.drawImage(atlas24, c * 24, r * 24, 24, 24, x, y, z, z); else { g.fillStyle = tileCSS[i]; g.fillRect(x, y, z, z); } } continue; }
            const sx = Math.abs(Math.cos(p * Math.PI)), w = Math.max(0.5, z * sx), xx = x + (z - w) / 2;
            g.fillStyle = 'rgba(255,244,214,' + (0.5 * (1 - sx)).toFixed(3) + ')'; g.fillRect(x, y, z, z); // light catches the turning tile
            if (p < 0.5) { if (atlas24) g.drawImage(atlas24, c * 24, r * 24, 24, 24, xx, y, w, z); }
            else { g.fillStyle = cleanCSS[i]; g.fillRect(xx, y, w, z); }
            g.fillStyle = 'rgba(255,250,232,' + (0.7 * (1 - sx)).toFixed(3) + ')'; g.fillRect(xx, y, w, z);
          }
        }
        if (painting) {
          const a = sstep(WAVE + FLIP, WAVE + FLIP + 1.3, e);
          if (a > 0) { g.globalAlpha = a; g.drawImage(painting, ox, oy, pw, ph); g.globalAlpha = 1; }
          const s = e - (WAVE + FLIP + 1.4);
          if (s > 0 && s < 1.8 && !reduced()) {
            const p = s / 1.8, bx = lerp(ox - pw * 0.6, ox + pw * 1.6, p);
            g.save(); g.beginPath(); g.rect(ox, oy, pw, ph); g.clip(); g.globalCompositeOperation = 'lighter';
            const gr = g.createLinearGradient(bx - pw * 0.3, oy, bx + pw * 0.3, oy + ph * 0.4); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,250,235,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.fillRect(ox, oy, pw, ph); g.restore();
          }
        }
        // the wavefront: a ring of light travelling out from the rough moment
        if (e < WAVE + 0.4) {
          const R = (e / WAVE) * F.maxD * z, cx = ox + (BC + 0.5) * z, cy = oy + (BR + 0.5) * z;
          g.save(); g.beginPath(); g.rect(ox, oy, pw, ph); g.clip(); g.globalCompositeOperation = 'lighter';
          g.strokeStyle = rgba(PIC.glow, 0.5 * (1 - e / (WAVE + 0.4))); g.lineWidth = z * 1.4; g.beginPath(); g.arc(cx, cy, Math.max(1, R), 0, TAU); g.stroke(); g.restore();
        }
        // still there: one tile wide
        const cx = ox + (BC + 0.5) * z, cy = oy + (BR + 0.5) * z, lw = 2;
        g.strokeStyle = rgba('#ffd27a', 0.9); g.lineWidth = lw; g.strokeRect(ox + BC * z - 1, oy + BR * z - 1, z + 2, z + 2);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 + 0.3 * Math.sin(t * 3); g.drawImage(K.glowSprite('#ffd27a'), cx - z * 2.2, cy - z * 2.2, z * 4.4, z * 4.4); g.restore();
      }

      /* ---------------- HUD + audio each frame ---------------- */
      let hudKey = '', lastNotch = 0, lastNotchT = 0, qual = { n: 0, acc: 0, done: false };
      function hudTick() {
        const n = visibleCount(), zoomX = V.z / V.z1;
        const zs = zoomX >= 9.95 ? Math.round(zoomX) : zoomX.toFixed(1);
        const lvl = P.fin ? PIC.name : levelOf(n), meta = '×' + zs + ' · ' + fmtN(n) + (n === 1 ? ' moment' : ' moments') + ' · ' + timeOf(n);
        const key = lvl + '|' + meta;
        if (key !== hudKey) { hudKey = key; if (hudLvl.textContent !== lvl) hudLvl.textContent = lvl; hudMeta.textContent = meta; }
        P.count = n;
        el.classList.toggle('zo-tense', tenseK() > 0.5);
      }
      function audioTick(rdt) {
        const du = Math.abs(Z.u - Z.lastU) / Math.max(0.005, rdt); Z.lastU = Z.u;
        Z.speed += (du - Z.speed) * Math.min(1, rdt * 10);
        if (motor) { motor.level(Math.min(0.045, Z.speed * 0.03), 0.06); motor.freq(380 + Math.min(1400, Z.speed * 900), 0.08); }
        if (drone) drone.level(0.06 * tenseK() + 0.0001, 0.4);
        const lv = 0.14 + 0.36 * clamp(Z.u, 0, 1);
        if (Math.abs(lv - musicLv) > 0.02) { musicLv = lv; music.level(lv); }
        const nb = Math.floor(clamp(Z.u, 0, 1) * 18 + 0.0001);
        if (nb !== lastNotch) { const t = now(); if (t - lastNotchT > 40 && P.phase !== 'finale') { lastNotchT = t; notchSound(nb); bumpHud(); } lastNotch = nb; }
      }
      function bumpHud() {
        if (reduced() || !hudMeta.animate) return;
        try { hudMeta.animate([{ transform: 'scale(1.14)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' }); } catch (e) { /* old browser */ }
      }
      function placePin() {
        if (!P.pinOn) return;
        const z = V.z, x = V.ox + (BC + 0.5) * z, y = V.oy + BR * z, pw = P.pinW || 110, ph = 26;
        let px = clamp(x - pw / 2, 8, M.W - pw - 8), py = y - ph - Math.max(10, z * 2.4);
        if (py < M.top) py = y + z + Math.max(10, z * 2.4);
        pin.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px)';
      }

      /* ---------------- the frame loop ---------------- */
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !M.W || !M.F) return;
        const tn = now(), rdt = Math.min(0.1, Math.max(0.001, (tn - (P.lastNow || tn - 16)) / 1000)); P.lastNow = tn;
        if (!qual.done) { qual.n++; qual.acc += rdt; if (qual.n >= 90) { qual.done = true; const avg = qual.acc / qual.n; if ((avg > 0.03 && (cv.dpr || 1) > 1.2) || avg > 0.045) { cv.setQuality(0.7); grainPat = null; } } }
        animFrame(rdt);
        if (P.phase === 'zoom' && P.gate) Z.hi = stopU(P.gate);
        { const want = !P.fin && (M.hudOn === false ? Z.u < 0.94 : Z.u < 0.975); if (want !== (M.hudOn !== false)) setHud(want); }
        stepZoom(rdt);
        computeView(Z.u);
        P.calm = P.recap ? Math.min(1, P.calm + rdt * 0.8) : Math.max(P.calm, sstep(0.04, 0.62, Z.u));
        if (P.flash > 0) P.flash = Math.max(0, P.flash - rdt * 1.6);
        audioTick(rdt); hudTick(); placePin();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.imageSmoothingEnabled = true;
        const covers = !P.fin && V.ox <= 0 && V.oy <= 0 && V.ox + COLS * V.z >= M.W && V.oy + ROWS * V.z >= M.H;
        if (!covers) { g.fillStyle = surround(bright()); g.fillRect(0, 0, M.W, M.H); drawFrameDeco(g); }
        if (P.fin) drawFinale(g, t);
        else { drawMosaic(g); drawBad(g, t); drawReveal(g); }
        drawScrim(g);
        drawLensFX(g, t);
        drawFinder(g, t);
        if (P.ring) { const k = (tn - P.ring.t0) / 420; if (k >= 1) P.ring = null; else { g.strokeStyle = 'rgba(255,240,215,' + (0.7 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(P.ring.x, P.ring.y, 10 + k * 34, 0, TAU); g.stroke(); } }
        FX.update(rdt); FX.draw(g);
      });

      /* ---------------- the card ---------------- */
      function setCard(nodes, o) {
        o = o || {};
        card.replaceChildren(...nodes.filter(Boolean));
        card.hidden = false;
        card.classList.remove('zo-swap'); void card.offsetWidth; card.classList.add('zo-swap');
        measureCard();
      }
      function hideCard() { card.hidden = true; measureCard(); }
      const userQ = (s, cls) => h('span', { class: 'gk-user' + (cls ? ' ' + cls : ''), text: s });
      function cardClose() {
        if (noWords) return [h('div', { class: 'zo-kick' }, h('span', { class: 'zo-rec' }), 'Up close · a moment like this'), h('div', { class: 'zo-hot', text: '“It all went wrong.”' }), h('div', { class: 'zo-note', text: 'A thought like this can fill the whole frame. Let’s see what else is in the picture.' })];
        const nodes = [h('div', { class: 'zo-kick' }, h('span', { class: 'zo-rec' }), 'Up close · one moment')];
        nodes.push(h('div', { class: 'zo-hot' }, '“', userQ(W8.hot || 'This ruins everything'), '”'));
        if (W8.cam) nodes.push(h('div', { class: 'zo-cam' }, h('b', { text: 'On camera' }), userQ(W8.cam)));
        return nodes;
      }
      function cardStrip(textIn, isHot) {
        return [h('div', { class: 'zo-kick', text: isHot ? 'Caption so far' : 'Your caption' }), h('div', { class: 'zo-strip' + (isHot ? ' zo-hotline' : '') }, '“', isHot && !noWords ? userQ(textIn) : textIn, '”')];
      }
      function captionsFor(stop) {
        const C = CAPS[stop], strong = support() === 'strong' || care();
        const opts = [{ kind: 'fair', text: strong ? pickR(C.strong) : pickR(C.fair) }, { kind: 'filtered', text: pickR(C.filtered) }, { kind: 'dismissive', text: pickR(C.dismissive) }];
        return K.shuffle(opts, RNG);
      }

      /* ---------------- characters ---------------- */
      function syncSay(line, o) {
        if (!glitch.el.hidden) { S.cancel(P.gT); glitch.hush(); glitch.show(false); sync.show(true); }
        return sync.say(line, Object.assign({ ms: 3600 }, o || {}));
      }
      function glitchSay(line, mood, ms) {
        sync.hush(); sync.show(false); glitch.show(true); glitch.react('glitch'); K.sfx.glitch();
        glitch.say(line, { mood: mood || 'scan', ms: 0 });
        S.cancel(P.gT);
        P.gT = S.later(() => { glitch.hush(); glitch.show(false); sync.show(true); sync.react('bounce'); }, ms || 3600);
      }
      const LN = {
        close: { Jolly: 'Up close, one moment can look like the whole story.', Cheeky: 'Wow. Tight crop. Very dramatic lighting.', Unfiltered: 'Too close. Pull back.' },
        closeAgain: { Jolly: 'Back in the darkroom. You know the trick: zoom out.', Cheeky: 'Same moody lighting. Let’s ruin it with context.', Unfiltered: 'Darkroom again. Zoom out.' },
        closeReal: { Jolly: 'This moment is real, and it matters. Let’s see it in full.', Cheeky: 'Real moment, real feelings. Let’s see the whole frame.', Unfiltered: 'It’s real. Now see all of it.' },
        more: { Jolly: 'Oh! There’s more around it.', Cheeky: 'Plot twist: other things exist.', Unfiltered: 'More in frame.' },
        stop: { Jolly: 'Frame check! Caption what’s actually in view.', Cheeky: 'Freeze frame. What’s really in shot?', Unfiltered: 'Caption the frame.' },
        fair: [{ Jolly: 'Yes. That’s what’s really in frame.', Cheeky: 'Caption of the year. Framed.', Unfiltered: 'Fair. It fits.' }, { Jolly: 'Fair and true. Keep zooming.', Cheeky: 'Look at you, being accurate.', Unfiltered: 'Fits. Keep going.' }, { Jolly: 'That one holds up. Lovely.', Cheeky: 'Gallery-ready caption.', Unfiltered: 'Holds up.' }],
        filtered: { Jolly: 'That’s the mental filter: one tile colouring the whole frame. Look again.', Cheeky: 'Bold. The frame also has sleep and snacks in it.', Unfiltered: 'Filter. One tile, whole frame. Again.' },
        dismissive: { Jolly: 'Hmm, the rough tile is still in frame. Fair keeps it in.', Cheeky: 'Too sunny. The rough tile didn’t vanish.', Unfiltered: 'Too far. That tile is real.' },
        day: { Jolly: 'A whole day. Look how many tiles are just… ordinary.', Cheeky: 'Sleep, snacks, showers. Thrilling stuff.', Unfiltered: 'A day. Mostly ordinary.' },
        reveal: { Jolly: 'Wait. It’s a picture!', Cheeky: 'Hold on. It’s a PICTURE?!', Unfiltered: 'It’s a picture.' },
        revealG: { Jolly: 'And your moment is one tile of it. One of 1,728.', Cheeky: 'Your big moment? One pixel. A very small pixel.', Unfiltered: 'Your moment: one tile of 1,728.' },
        revealReal: { Jolly: 'That tile is real and it needs a plan. It’s still one tile, not the whole picture.', Cheeky: 'Real tile, real plan. Still not the whole picture.', Unfiltered: 'Real tile. Plan it. Not the whole picture.' },
        week: { Jolly: 'Now caption the whole week.', Cheeky: 'Big frame, big caption. Go.', Unfiltered: 'Caption the week.' },
        zoomIn: { Jolly: 'Now zoom back in. Same moment, new caption.', Cheeky: 'Back in we go. Bring the new caption.', Unfiltered: 'Zoom back in.' },
        recap: { Jolly: 'Same facts. A fairer story.', Cheeky: 'Same photo. Way better caption.', Unfiltered: 'Same facts. Fairer story.' },
        recapG: { Jolly: 'That’s a reframe: nothing deleted, more in view.', Cheeky: 'Reframe complete. Nothing deleted. Very legal.', Unfiltered: 'Reframed. Nothing deleted.' },
        outro: { Jolly: 'One last time. All the way out.', Cheeky: 'Encore. Zoom out like you mean it.', Unfiltered: 'All the way out.' },
        end: { Jolly: 'Look at it. All of it.', Cheeky: 'Frame that. Literally.', Unfiltered: 'The whole picture.' },
        endReal: { Jolly: 'A real tile, a real plan, and a whole picture around it.', Cheeky: 'Real tile, real plan, big picture.', Unfiltered: 'Real tile. Plan. Big picture.' },
        endCare: { Jolly: 'One real tile. Someone qualified can help you see it clearly.', Cheeky: 'One real tile. Get proper advice on it.', Unfiltered: 'Real tile. Get proper advice.' }
      };

      /* ---------------- steps ---------------- */
      function waitFor(fn) { return new Promise(res => { const tick = () => { if (fn()) res(); else S.later(tick, 70); }; tick(); }); }
      const guideOut = (id, label) => K.guide({ id, g: 'drag', target: () => ({ x: M.F.x + M.F.w / 2, y: M.F.y + M.F.h * 0.3 }), dir: 'd', d: Math.min(150, M.F.h * 0.34), ms: 1500, label, delay: 900 });
      async function closeStep() {
        P.phase = 'close'; Z.lo = 0; Z.hi = 0.02;
        setCard(cardClose());
        syncSay(L(support() === 'strong' && !noWords ? LN.closeReal : visits > 0 ? LN.closeAgain : LN.close), { mood: 'worried', ms: 4200 });
        await K.wait(700);
      }
      async function zoomStep(stop, i) {
        P.phase = 'zoom'; P.stopIdx = i; P.gate = stop; Z.lo = 0; Z.hi = stopU(stop);
        const lbl = i === 0 ? (M.phone ? 'PINCH OR DRAG DOWN' : 'SCROLL OR DRAG DOWN') : 'KEEP ZOOMING OUT';
        guideOut('out' + i, lbl);
        if (i > 0) setCard(cardStrip(P.caps.length ? P.caps[P.caps.length - 1].text : W8.hot, false));
        await waitFor(() => {
          if (P.phase !== 'zoom') return true;
          if (i === 0 && !P.more && Z.u > 0.1) { P.more = true; setCard(cardStrip(noWords ? 'It all went wrong.' : (W8.hot || 'This ruins everything'), true)); syncSay(L(LN.more), { mood: 'wow', ms: 2600 }); }
          return Z.u >= Z.hi - 0.006 || (Z.raw >= Z.hi - 0.004 && Z.u >= Z.hi - 0.08);
        });
        P.gate = null; K.guide(null);
        P.stopFlash = now(); shutter(); S.buzz([12, 40, 12]);
        ctx.track('zoom_stop', { stop: i });
      }
      async function captionStep(stop, i) {
        P.phase = 'cap';
        const opts = captionsFor(stop);
        const nodes = [h('div', { class: 'zo-kick', text: stop === 'week' ? 'In frame · the whole week' : 'In frame · ' + levelOf(P.count || 1).toLowerCase() })];
        nodes.push(h('div', { class: 'zo-q', text: stop === 'week' ? 'Which caption fits the whole week?' : 'Which caption fits everything in view?' }));
        if (i === 0 && W8.facts.length) nodes.push(h('div', { class: 'zo-facts' }, h('b', { text: 'Also on record' }), userQ(W8.facts.join(' · '))));
        if (i === 0) nodes.push(h('div', { class: 'zo-note', text: 'We can’t see your week, so the other tiles are the ordinary moments most weeks hold.' }));
        const wrap = h('div', { class: 'zo-caps', role: 'group', 'aria-label': 'Captions' });
        let first = true;
        P.chips = opts.map(o => {
          const b = h('button', { type: 'button', class: 'zo-cap', 'data-kind': o.kind, text: o.text });
          K.tap(b, () => {
            if (P.phase !== 'cap' || b.classList.contains('zo-no') || b.classList.contains('zo-yes')) return;
            K.guideDone();
            if (o.kind === 'fair') {
              b.classList.add('zo-yes'); fairChord(); S.buzz([10, 30, 16]);
              P.caps.push({ stop, first, text: o.text });
              const r = K.rectIn(b); FX.emit('confetti', r.x + r.w * 0.5, r.y, 22, { colors: PIC.pal, angle: -Math.PI / 2, spread: 1.6, speed: [120, 300] });
              ctx.track('caption', { stop: i, first: first ? 1 : 0 });
              if (stop !== 'week') syncSay(L(LN.fair[i % LN.fair.length]), { mood: 'happy', ms: 2600 });
              const res = P.capRes; P.capRes = null; S.later(() => res && res(), 900);
            } else {
              first = false; b.classList.add('zo-no'); softNo(); S.buzz(8);
              if (o.kind === 'filtered') glitchSay(L(LN.filtered), 'facepalm', 3400); else syncSay(L(LN.dismissive), { mood: 'think', ms: 3200 });
            }
          });
          wrap.append(b); return b;
        });
        nodes.push(wrap);
        setCard(nodes);
        if (stop === 'week') syncSay(L(LN.week), { mood: 'happy', ms: 2600 });
        else if (stop === 'day' || stop === 'days') syncSay(L(LN.day), { mood: 'calm', ms: 3200 });
        else glitchSay(L(LN.stop), 'scan', 3000);
        K.guide({ id: 'cap' + i, g: 'choose', target: P.chips, label: 'PICK A CAPTION', delay: 1500 });
        await new Promise(res => { P.capRes = res; });
        K.guide(null);
      }
      async function revealStep() {
        P.phase = 'reveal'; K.guide(null);
        P.revealT0 = now(); P.flash = reduced() ? 0.15 : 0.55;
        Z.lo = Z.hi = 1;
        if (A.ctx) {
          const t = A.now();
          A.pad(['C3', 'G3', 'C4', 'E4', 'G4'].map(n => A.note(n)), { dur: 5, vol: 0.2, attack: 0.25 });
          ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, k) => A.chime(A.note(n), { when: t + 0.1 + k * 0.08, vol: 0.07, dur: 2 }));
          A.whoosh({ vol: 0.12, dur: 0.6 }); A.sync('reveal', now());
        }
        const pr = V.pic; if (pr) for (let k = 0; k < 4; k++) FX.emit('star', pr.x + pr.w * (0.15 + 0.7 * Math.random()), pr.y + pr.h * (0.1 + 0.8 * Math.random()), 6, { colors: ['#fffbe6', PIC.glow] });
        setCard([h('div', { class: 'zo-kick', text: fmtN(NT) + ' moments · one week' }), h('div', { class: 'zo-big', text: PIC.reveal }), h('div', { class: 'zo-sub', text: 'Your moment is one tile of it. It’s still in there.' })]);
        P.pinOn = true; pin.classList.add('on'); P.pinW = pin.offsetWidth || 110;
        ctx.track('reveal', {});
        syncSay(L(LN.reveal), { mood: 'wow', ms: 2600 }); sync.react('bounce');
        await K.wait(reduced() ? 1600 : 2500);
        glitchSay(L(support() === 'strong' ? LN.revealReal : LN.revealG), 'smug', 3600);
        await K.wait(reduced() ? 2000 : 3000);
      }
      async function zoomInStep() {
        P.phase = 'zoomin'; Z.lo = 0; Z.hi = 1;
        P.pinOn = false; pin.classList.remove('on');
        setCard([h('div', { class: 'zo-kick', text: 'Now, back in' }), h('div', { class: 'zo-q', text: 'Zoom back in to your moment. Same moment, new caption.' })]);
        syncSay(L(LN.zoomIn), { mood: 'idea', ms: 3200 });
        K.guide({ id: 'in', g: 'drag', target: () => ({ x: M.F.x + M.F.w / 2, y: M.F.y + M.F.h * 0.72 }), dir: 'u', d: Math.min(150, M.F.h * 0.34), ms: 1500, label: M.phone ? 'SPREAD OR DRAG UP' : 'SCROLL OR DRAG UP', delay: 900 });
        const target = () => uOfZ(Math.min(M.F.w, M.F.h) * 0.42);
        await waitFor(() => Z.u <= target() + 0.004 || (Z.raw <= target() && Z.u <= target() + 0.08));
        K.guide(null);
        P.phase = 'newcap'; P.recap = true; P.revealT0 = 0;
        Z.lo = 0; Z.hi = 1;
        if (A.ctx) { const t = A.now(); A.tone({ type: 'sine', freq: 520, to: 780, glide: 0.4, dur: 0.6, vol: 0.06 }); ['E5', 'G5', 'C6'].forEach((n, k) => A.chime(A.note(n), { when: t + 0.12 + k * 0.1, vol: 0.07, dur: 1.6 })); A.sync('recap', now()); }
        const bx = V.ox + (BC + 0.5) * V.z, by = V.oy + (BR + 0.5) * V.z;
        FX.emit('mote', bx, by, 18, { colors: ['#fff4dc', '#ffd38a', '#bfe6ff'] });
        const weekCap = (P.caps.find(c => c.stop === 'week') || P.caps[P.caps.length - 1] || {}).text || 'One hard moment, in a week that held far more.';
        const nodes = [h('div', { class: 'zo-kick', text: 'Same moment · new caption' })];
        nodes.push(h('div', { class: 'zo-old' }, '“', noWords ? 'It all went wrong.' : userQ(W8.hot || 'This ruins everything'), '”'));
        nodes.push(h('div', { class: 'zo-new', text: '“' + weekCap + '”' }));
        if (W8.plan) nodes.push(h('div', { class: 'zo-plan', text: 'Next step: ' + W8.plan }));
        setCard(nodes);
        syncSay(L(LN.recap), { mood: 'love', ms: 2800 });
        await K.wait(reduced() ? 1500 : 2400);
        glitchSay(L(LN.recapG), 'cool', 3000);
        await K.wait(reduced() ? 1600 : 2600);
      }
      async function outroStep() {
        P.phase = 'outro';
        guideOut('outro', 'ZOOM ALL THE WAY OUT');
        syncSay(L(LN.outro), { mood: 'determined', ms: 3000 });
        const uOut = () => stopU('day') * 0.8;
        await waitFor(() => Z.u >= uOut() || Z.raw >= uOut() + 0.02 || (!Z.held && Z.vel > 0.5 && Z.u > 0.2));
        K.guide(null);
        await new Promise(res => { Z.held = false; Z.vel = 0; Z.auto = { from: Z.u, to: 1, t0: now(), ms: reduced() ? 500 : 1500, done: res }; });
        Z.lo = Z.hi = Z.raw = Z.u = 1;
      }
      async function finale() {
        P.phase = 'finale'; K.guide(null);
        buildPainting();
        const delay = new Float32Array(NT); let maxD = 0;
        for (let i = 0; i < NT; i++) { const d = Math.hypot(i % COLS - BC, ((i / COLS) | 0) - BR); delay[i] = d; if (d > maxD) maxD = d; }
        const wave = reduced() ? 0.45 : [1.5, 1.8, 2.1][inten] || 1.8, flip = reduced() ? 0.12 : 0.3;
        for (let i = 0; i < NT; i++) delay[i] = delay[i] / maxD * wave;
        P.fin = { t0: now(), delay, maxD, wave, flip };
        music.level(0.2);
        if (A.ctx) {
          const t0 = A.now(), n = 30;
          for (let k = 0; k < n; k++) { const tt = t0 + (k / n) * wave + 0.05; A.click({ when: tt, vol: 0.05 + 0.03 * Math.sin(k), pan: Math.sin(k * 0.9) * 0.7 }); if (k % 3 === 0) A.pluck(A.note(SCALE[Math.min(SCALE.length - 1, 4 + Math.floor(k / 3))]), { when: tt, vol: 0.1, damp: 0.995, verb: 0.3 }); }
          A.pad(['F3', 'C4', 'E4', 'G4', 'C5'].map(n2 => A.note(n2)), { when: t0 + wave, dur: 6, vol: 0.22, attack: 0.6 });
          ['C6', 'E6', 'G6', 'C7'].forEach((n2, k) => A.chime(A.note(n2), { when: t0 + wave + 0.3 + k * 0.12, vol: 0.06, dur: 2.2 }));
          A.sync('finale', now());
        }
        const cx = V.ox + (BC + 0.5) * V.z, cy = V.oy + (BR + 0.5) * V.z;
        FX.emit('confetti', cx, cy, [24, 36, 50][inten] || 36, { colors: PIC.pal, angle: -Math.PI / 2, spread: 2.4, speed: [140, 340] });
        S.later(() => { const pr = V.pic; if (!pr || reduced()) return; for (let k = 0; k < 10; k++) S.later(() => FX.emit('star', pr.x + pr.w * Math.random(), pr.y + pr.h * Math.random(), 4, { colors: ['#fffbe6', PIC.glow] }), k * 140); }, (wave + 0.6) * 1000);
        S.later(() => { if (!reduced()) FX.emit('confetti', M.W / 2, M.F.y - 10, [20, 30, 44][inten] || 30, { colors: PIC.pal, angle: Math.PI / 2, spread: 2.6, speed: [60, 220] }); }, (wave + 1.2) * 1000);
        const fairLine = W8.balanced || (P.caps.find(c => c.stop === 'week') || {}).text || 'One hard moment, in a week that held far more.';
        const nodes = [h('div', { class: 'zo-kick', text: 'Today’s mosaic · ' + fmtN(NT) + ' moments' }), h('div', { class: 'zo-title', text: PIC.name })];
        nodes.push(h('div', { class: 'zo-fair' }, W8.balanced ? userQ(fairLine) : fairLine));
        nodes.push(h('div', { class: 'zo-note', text: care() ? (S.safety && S.safety.CARE_LINE) || 'Someone qualified can tell you exactly where you stand.' : W8.plan ? 'Next step: ' + W8.plan : 'One tile was rough. It’s still in there, one tile wide.' }));
        S.later(() => setCard(nodes), Math.round(wave * 1000));
        // both of them come out for the curtain call
        S.cancel(P.gT); glitch.hush(); sync.hush();
        glitch.show(true); sync.show(true); glitch.base('celebrate'); glitch.react('bounce');
        placeChars();
        if (M.phone) sync.el.classList.add('zo-fin'); else sync.side('above');
        S.later(() => { sync.say(L(care() ? LN.endCare : support() === 'strong' ? LN.endReal : LN.end), { mood: 'celebrate', ms: 0 }); sync.react('bounce'); glitch.react('bounce'); }, Math.round((wave + 0.6) * 1000));
        await K.wait(Math.round((wave + flip) * 1000) + (reduced() ? 2600 : 5200));
        finish();
      }
      function finish() {
        if (P.finished) return; P.finished = true; P.phase = 'done';
        const nCap = P.caps.length, nFair = P.caps.filter(c => c.first).length, ratio = nCap ? nFair / nCap : 1;
        const best = K.best('fair' + nCap, nFair, 'higher'), tier = K.tier(ratio, [0.34, 0.67, 0.999]);
        const col = K.collect('pic:' + PIC.id), pics = K.collection().filter(x => String(x).indexOf('pic:') === 0).length;
        const badges = [(best.isNew ? 'New best: ' : '') + nFair + '/' + nCap + ' fair captions first try'];
        if (tier) badges.push(tier + ' eye');
        badges.push((col.isNew ? 'Collected: ' : 'Mosaic: ') + PIC.name + ' (' + Math.min(pics, PICS.length) + '/' + PICS.length + ')');
        const strong = support() === 'strong';
        ctx.finish({
          title: strong ? 'One real tile, and a plan' : 'One tile of a bigger picture', mood: 'celebrate',
          lines: ['Zoomed from 1 moment out to all ' + fmtN(NT), nFair + ' of ' + nCap + ' captions fair on the first try', 'Today’s mosaic: ' + PIC.name + '. Tomorrow brings another.'],
          share: 'Zoomed out on a bad moment. It was one tile of a much bigger picture.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- start ---------------- */
      if (SOFT && (cv.w || 0) * (cv.h || 0) > 600000) cv.setQuality(0.75);
      cv.onResize(() => { layout(); });
      S.later(() => { try { atlas24 = buildAtlas(24); atlas48 = buildAtlas(48); } catch (e) { atlas24 = atlas24 || null; } }, 30);
      if (ctx.analysisReady && typeof ctx.analysisReady.then === 'function') ctx.analysisReady.then((a) => {
        if (!a || typeof a !== 'object' || !(P.phase === 'intro' || P.phase === 'close')) return;
        an = a; readWords(); markFacts();
        if (atlas24) S.later(() => { atlas24 = buildAtlas(24); atlas48 = buildAtlas(48); }, 20);
        if (P.phase === 'close') setCard(cardClose());
      }, () => {});

      (async () => {
        await K.intro({ title: 'Zoom Out', sub: 'Up close, one bad moment fills the whole frame. Let’s see what else is in the picture.', how: 'Pinch, drag down or scroll to zoom out. Caption what you see.', char: 'sync', mood: 'wow' });
        await closeStep();
        for (let i = 0; i < STOPS.length; i++) {
          await zoomStep(STOPS[i], i);
          if (STOPS[i] === 'week') await revealStep();
          await captionStep(STOPS[i], i);
        }
        await zoomInStep();
        await outroStep();
        await finale();
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          const cx = () => M.F.x + M.F.w / 2;
          const dragV = async (px, ms) => { const x = cx(), mid = M.F.y + M.F.h * 0.5, y0 = clamp(mid - px / 2, 70, M.H - 40), y1 = clamp(y0 + px, 70, M.H - 30); await K.sim.drag(lens, { x, y: y0 }, { x, y: y1 }, ms || 650, 14); };
          const pinch = async (outward) => {
            const x = cx(), y = M.F.y + M.F.h * 0.45, a0 = outward ? 40 : 120, a1 = outward ? 120 : 40;
            const p1 = await K.sim.press(lens, x - a0, y - a0), p2 = await K.sim.press(lens, x + a0, y + a0);
            for (let k = 1; k <= 12; k++) { const a = lerp(a0, a1, k / 12); p1.move(x - a, y - a); p2.move(x + a, y + a); await K.wait(40); }
            p1.up(x - a1, y - a1); p2.up(x + a1, y + a1); await K.wait(60);
          };
          const wheel = async (dy, n) => { const r = lens.getBoundingClientRect(); for (let k = 0; k < n; k++) { lens.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true, clientX: r.left + r.width * 0.4, clientY: r.top + r.height * 0.4 })); await K.wait(55); } };
          await wait(() => P.phase === 'close');
          await K.wait(700);
          for (let i = 0; i < STOPS.length; i++) {
            await wait(() => P.phase === 'zoom' && P.stopIdx === i, 30000);
            await K.wait(250);
            let tries = 0;
            while (P.phase === 'zoom' && P.stopIdx === i && tries++ < 10) {
              if (i === 0 && M.phone && tries < 4) await pinch(false);
              else if (i === 1 && !M.phone && tries < 4) await wheel(120, 7);
              else await dragV(M.H * 0.4);
              await K.wait(520);
            }
            await wait(() => P.phase === 'cap', 20000);
            await K.wait(700);
            if (i === 1 && P.chips.length) { const wrong = P.chips.find(c => c.dataset.kind === 'filtered'); if (wrong) { await K.sim.tap(wrong); await K.wait(900); } }
            const fair = P.chips.find(c => c.dataset.kind === 'fair'); if (fair) await K.sim.tap(fair);
            await wait(() => P.phase !== 'cap', 8000);
          }
          await wait(() => P.phase === 'zoomin', 30000);
          await K.wait(500);
          let tries = 0;
          while (P.phase === 'zoomin' && tries++ < 10) { if (M.phone && tries < 3) await pinch(true); else await dragV(-M.H * 0.42, 700); await K.wait(450); }
          await wait(() => P.phase === 'outro', 20000);
          await K.wait(400);
          tries = 0;
          while (P.phase === 'outro' && tries++ < 8) { await dragV(M.H * 0.48, 600); await K.wait(400); }
          await wait(() => P.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
