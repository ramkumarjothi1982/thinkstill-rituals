// The 20 world-law light finales. Each plays over ~3.6 s at the end of a
// ritual (t 0 → 1) and then holds a calm, gently living final state until the
// person moves on. Layered additive light, never a full-screen flash.
//   drawFinale(n, g, t, L, state)   L: { stage, view, pal, now? }

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, rng } from './fx.js';

const seeds = (n, count) => { const r = rng(n * 977 + 13); return Array.from({ length: count }, () => [r(), r(), r(), r(), r()]); };
const clock = (L, t) => (typeof L.now === 'function' ? L.now() : t * 3.6);
/** Three-pass glowing stroke along the current path. */
function glowStroke(g, colour, width, alpha = 1, core = '#ffffff') {
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = rgba(colour, 0.12 * alpha); g.lineWidth = width * 4; g.stroke();
  g.strokeStyle = rgba(colour, 0.45 * alpha); g.lineWidth = width * 1.6; g.stroke();
  g.strokeStyle = rgba(mix(colour, core, 0.6), 0.9 * alpha); g.lineWidth = Math.max(0.8, width * 0.45); g.stroke();
  g.restore();
}
function wash(g, x, y, r, colour, a) {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(colour, 0.5 * a)); gr.addColorStop(0.45, rgba(colour, 0.18 * a)); gr.addColorStop(1, rgba(colour, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
function puff(g, x, y, r, colour, a) {
  const gr = g.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
  gr.addColorStop(0, rgba(colour, 0.55 * a)); gr.addColorStop(0.6, rgba(colour, 0.25 * a)); gr.addColorStop(1, rgba(colour, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

const F = {
  // 1 · indigo sparks become warm filaments
  1(g, t, L, s) {
    const { x, y, w, h } = L.stage, tt = clock(L, t);
    s.k ??= seeds(1, 34);
    const warm = smooth(invLerp(0.2, 0.75, t));
    for (const [a, b, c, d] of s.k) {
      const px = x + w * (0.06 + a * 0.88) + Math.sin(tt * 0.7 + d * 9) * 6, top = y + h * (0.08 + b * 0.35);
      const col = mix('#6a5cff', mix('#ffb45a', '#ffe2a8', c), warm);
      const len = h * (0.18 + c * 0.42) * ease.outCubic(invLerp(0.15, 0.9, t));
      if (len > 2) {
        g.beginPath(); g.moveTo(px, top);
        g.bezierCurveTo(px + Math.sin(tt * 0.9 + d * 7) * 14, top + len * 0.35, px - Math.sin(tt * 0.8 + c * 5) * 16, top + len * 0.7, px + Math.sin(tt * 0.6 + a * 3) * 8, top + len);
        glowStroke(g, col, 1.4 + c, 0.75);
      }
      glow(g, px, top, 7 + 5 * c, col, 0.9 - warm * 0.3);
    }
    wash(g, x + w / 2, y + h * 0.25, w * 0.7, '#ffb45a', 0.35 * warm);
  },
  // 2 · water beads spread into a wide silver lagoon
  2(g, t, L, s) {
    const { x, y, w, h, cx } = L.stage, tt = clock(L, t), wy = y + h * 0.78;
    s.k ??= seeds(2, 9);
    s.k.forEach(([a, b], i) => {
      const t0 = i * 0.045, k = invLerp(t0, t0 + 0.32, t), bx = x + w * (0.2 + a * 0.6);
      if (k > 0 && k < 1) { const by = lerp(y + h * 0.05, wy, ease.inOutSine(k)); glow(g, bx, by, 10, '#e8f6ff', 0.95); g.beginPath(); g.moveTo(bx, by - 30); g.lineTo(bx, by); glowStroke(g, '#cfeaff', 1.2, 0.5); }
      const rk = invLerp(t0 + 0.32, t0 + 0.9, t);
      if (rk > 0 && rk < 1) { const r = 10 + rk * w * 0.22; g.strokeStyle = rgba('#e8f6ff', 0.6 * (1 - rk)); g.lineWidth = 1.6; g.beginPath(); g.ellipse(bx, wy, r, r * 0.16, 0, 0, TAU); g.stroke(); }
      void b;
    });
    const k = ease.outCubic(invLerp(0.25, 1, t));
    if (k <= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, wy - 10, 0, y + h + 20);
    gr.addColorStop(0, `rgba(235,246,255,${0.32 * k})`); gr.addColorStop(0.4, `rgba(170,205,255,${0.14 * k})`); gr.addColorStop(1, 'rgba(170,205,255,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, wy + h * 0.06, w * 0.55 * k + 1, h * 0.12 * k + 1, 0, 0, TAU); g.fill();
    for (let i = 0; i < 18; i++) { const lx = cx + (((i * 0.37) % 1) - 0.5) * w * 0.9 * k, ly = wy + ((i * 0.53) % 1) * h * 0.14 * k, l = 10 + (i % 4) * 8; g.strokeStyle = `rgba(255,255,255,${(0.25 + 0.25 * Math.sin(tt * 1.5 + i)) * k})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(lx - l, ly); g.lineTo(lx + l, ly); g.stroke(); }
    g.restore();
    wash(g, cx, wy, w * 0.5, '#bfe2ff', 0.35 * k);
  },
  // 3 · hard reflections soften into velvet colour
  3(g, t, L) {
    const { x, y, w, h, cx, cy } = L.stage, tt = clock(L, t);
    const hard = 1 - smooth(invLerp(0.05, 0.55, t));
    if (hard > 0) for (let i = 0; i < 6; i++) { const sx = x + ((i * 0.21 + t * 0.6) % 1.2) * w; g.beginPath(); g.moveTo(sx, y); g.lineTo(sx - h * 0.35, y + h); glowStroke(g, '#ffffff', 0.9, hard * 0.7); }
    const v = smooth(invLerp(0.25, 1, t));
    wash(g, cx - w * 0.15 + Math.sin(tt * 0.3) * 20, cy - h * 0.1, Math.max(w, h) * 0.6, L.pal.accent, 0.7 * v);
    wash(g, cx + w * 0.2 + Math.cos(tt * 0.25) * 20, cy + h * 0.15, Math.max(w, h) * 0.55, mix(L.pal.accent, '#ff9ad5', 0.4), 0.55 * v);
    wash(g, cx, cy, w * 0.35, '#ffe6f4', 0.35 * v);
    // soft velvet folds drifting across
    for (let i = 0; i < 4; i++) {
      const yy = y + h * (0.2 + i * 0.2), sway = Math.sin(tt * 0.4 + i) * 24;
      g.beginPath(); g.moveTo(x - 20, yy); g.bezierCurveTo(x + w * 0.3, yy - 40 + sway, x + w * 0.7, yy + 40 - sway, x + w + 20, yy);
      glowStroke(g, mix(L.pal.accent, '#ffd0ec', i / 4), 6, 0.22 * v);
    }
  },
  // 4 · sunlit pollen drifts into a quiet meadow
  4(g, t, L, s) {
    const { x, y, w, h } = L.stage, tt = clock(L, t);
    s.k ??= seeds(4, 60); s.b ??= seeds(41, 70);
    const m = smooth(invLerp(0.3, 1, t));
    for (const [a, b, c, d] of s.k) {
      const px = x + a * w + Math.sin(tt * (0.6 + c) + d * 9) * 14, py = y + ((b * 0.7 + t * (0.25 + c * 0.25) + tt * 0.01) % 1) * h * 0.85;
      glow(g, px, py, 3 + c * 4, mix('#ffe07a', '#fff4c8', d), 0.8);
    }
    const base = y + h * 0.98;
    for (const [a, b, c] of s.b) {
      const bx = x + a * w, bh = (h * 0.08 + b * h * 0.14) * m, sway = Math.sin(tt * 1.1 + a * 12) * 6 * m;
      if (bh < 2) continue;
      g.beginPath(); g.moveTo(bx, base); g.quadraticCurveTo(bx + sway * 0.3, base - bh * 0.6, bx + sway, base - bh);
      g.strokeStyle = rgba(mix('#2f6a3a', '#9be27a', 0.3 + c * 0.4), 0.85); g.lineWidth = 1.6 + c; g.lineCap = 'round'; g.stroke();
      if (c > 0.72) glow(g, bx + sway, base - bh, 6, c > 0.86 ? '#ffd6f0' : '#fff2a8', 0.8 * m);
    }
    wash(g, x + w / 2, base, w * 0.6, '#ffe7a0', 0.35 * m);
  },
  // 5 · bright streaks reorganise into slow glowing ribbons
  5(g, t, L) {
    const { x, y, w, h } = L.stage, tt = clock(L, t);
    const k = smooth(invLerp(0.1, 0.8, t));
    const cols = [L.pal.glow, L.pal.accent, '#ffd98a'];
    cols.forEach((col, r) => {
      g.beginPath();
      for (let i = 0; i <= 80; i++) {
        const u = i / 80, px = x + u * w;
        const chaos = (1 - k) * (Math.sin(u * 47 + r * 7 + tt * 6) * 34 + Math.sin(u * 91 + r) * 14);
        const py = y + h * (0.32 + r * 0.17) + Math.sin(u * 4.5 + tt * 0.8 + r * 1.3) * 22 * k + chaos;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      glowStroke(g, col, lerp(1, 3.2, k), 0.85);
    });
  },
  // 6 · ripples expand to reveal gentle reflections
  6(g, t, L) {
    const { cx, cy, w, h } = L.stage, tt = clock(L, t);
    for (let i = 0; i < 6; i++) {
      const k = invLerp(i * 0.08, 0.55 + i * 0.08, t); if (k <= 0 || k >= 1) continue;
      const r = w * 0.6 * ease.outCubic(k);
      g.beginPath(); g.ellipse(cx, cy + h * 0.1, r, r * 0.36, 0, 0, TAU); glowStroke(g, '#e6f6ff', 1.2, 0.8 * (1 - k));
    }
    const v = smooth(invLerp(0.35, 1, t));
    if (v <= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const ly = cy + h * 0.1 + i * 7, lw = w * (0.42 - i * 0.022) * v;
      const off = Math.sin(tt * 1.2 + i * 0.7) * 8;
      g.strokeStyle = rgba(mix(L.pal.glow, '#ffffff', 0.4), (0.38 - i * 0.025) * v); g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - lw + off, ly); g.lineTo(cx + lw + off, ly); g.stroke();
    }
    g.restore();
    wash(g, cx, cy + h * 0.1, w * 0.45, L.pal.glow, 0.45 * v);
  },
  // 7 · starlight falls as soft flakes
  7(g, t, L, s) {
    const { x, y, w, h } = L.stage, tt = clock(L, t);
    s.k ??= seeds(7, 56);
    const a0 = smooth(invLerp(0, 0.2, t));
    for (const [a, b, c, d] of s.k) {
      const px = x + a * w + Math.sin(tt * 0.8 + d * 10) * 16, py = y - 20 + ((b * 1.2 + tt * (0.05 + c * 0.06)) % 1.1) * (h + 30);
      if (c > 0.8) glow(g, px, py, 14, '#d8d0ff', 0.35 * a0);
      glint(g, px, py, 3 + c * 6, '#f6f2ff', 0.8 * a0, tt * 0.5 + d * 6);
    }
    wash(g, x + w / 2, y + h, w * 0.6, '#cfc8ff', 0.3 * smooth(t));
  },
  // 8 · paper sounds settle into a hush
  8(g, t, L, s) {
    const { x, y, w, h, cx } = L.stage, tt = clock(L, t);
    s.k ??= seeds(8, 14);
    const floor = y + h * 0.84;
    s.k.forEach(([a, b, c, d], idx) => {
      const k = ease.outCubic(invLerp(0, 0.9, t));
      const spot = (idx + 0.5) / s.k.length - 0.5;
      const px = lerp(x + a * w, cx + spot * w * 0.9, k) + Math.sin(tt * 1.2 + d * 7) * 10 * (1 - k * 0.8);
      const py = lerp(y + b * h * 0.4, floor - 8 - Math.cos(spot * Math.PI) * 18 - c * 10, k);
      const flip = Math.cos(tt * (1.5 + d) * (1 - k * 0.9) + a * 8);
      g.save(); g.translate(px, py); g.rotate((d - 0.5) * 1.4 + (1 - k) * Math.sin(tt + a * 5)); g.scale(Math.max(0.15, Math.abs(flip)), 1);
      const pg = g.createLinearGradient(-9, -6, 9, 6); pg.addColorStop(0, 'rgba(255,252,240,0.95)'); pg.addColorStop(1, 'rgba(230,220,255,0.75)');
      g.shadowColor = rgba(L.pal.glow, 0.6); g.shadowBlur = 8;
      g.fillStyle = pg; g.beginPath(); g.moveTo(-13, -7); g.quadraticCurveTo(0, -11, 13, -7); g.lineTo(13, 7); g.quadraticCurveTo(0, 11, -13, 7); g.closePath(); g.fill();
      g.restore();
    });
    const hush = smooth(invLerp(0.55, 1, t));
    for (let i = 0; i < 3; i++) { const r = (40 + i * 34) * (1 + 0.05 * Math.sin(tt * 0.8 + i)); g.beginPath(); g.ellipse(cx, floor, r, r * 0.22, 0, 0, TAU); glowStroke(g, L.pal.glow, 0.8, 0.35 * hush * (1 - i * 0.25)); }
    wash(g, cx, floor - 10, w * 0.4, L.pal.glow, 0.4 * hush);
  },
  // 9 · the air clears into pale dawn
  9(g, t, L, s) {
    const { x, y, w, h, cx } = L.stage, V = L.view, tt = clock(L, t);
    s.k ??= seeds(9, 26);
    const k = smooth(invLerp(0.05, 0.9, t)), haze = 1 - smooth(invLerp(0, 0.6, t));
    if (haze > 0) for (const [a, b, c] of s.k.slice(0, 12)) puff(g, x + a * w, y + b * h, 60 + c * 60, '#8a84a8', 0.5 * haze);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, V.h, 0, V.h * (1 - 0.95 * k));
    gr.addColorStop(0, `rgba(255,200,170,${0.42 * k})`); gr.addColorStop(0.45, `rgba(255,228,206,${0.2 * k})`); gr.addColorStop(1, 'rgba(255,236,214,0)');
    g.fillStyle = gr; g.fillRect(0, 0, V.w, V.h);
    g.restore();
    const sy = y + h * (1.02 - 0.18 * k);
    wash(g, cx, sy, w * 0.75, '#ffd8b0', 0.8 * k);
    orb(g, cx, sy, 26 * k + 0.1, '#fff2dc', { alpha: k });
    for (const [a, b, c] of s.k) glow(g, x + a * w, y + h * (0.3 + b * 0.6) - tt * 4 * c, 2.5 + c * 2, '#fff4e4', 0.6 * k);
  },
  // 10 · sharp highlights become steady low light
  10(g, t, L) {
    const { x, y, w, h, cx } = L.stage, tt = clock(L, t);
    const sharp = 1 - smooth(invLerp(0.05, 0.55, t));
    for (let i = 0; i < 9; i++) glint(g, x + w * ((i * 0.37 + 0.1) % 1), y + h * ((i * 0.61) % 1) * 0.8, 9 + (i % 3) * 4, '#ffffff', sharp * 0.9, i + tt * 2);
    const k = smooth(invLerp(0.25, 1, t));
    wash(g, cx, y + h * 1.02, w * 0.9, '#ffb878', 0.75 * k);
    wash(g, cx, y + h * 0.95, w * 0.4, '#ffe0b8', 0.5 * k * (0.9 + 0.1 * Math.sin(tt * 0.9)));
    for (let i = 0; i < 5; i++) { const lx = x + w * (0.18 + i * 0.16), ly = y + h * 0.9; glow(g, lx, ly, 10, '#ffd59a', 0.7 * k); orb(g, lx, ly, 3.2 * k + 0.1, '#fff0d0', { alpha: k }); }
  },
  // 11 · the tide line reveals a hidden smooth horizon
  11(g, t, L) {
    const { x, y, w, h, cx } = L.stage, tt = clock(L, t);
    const k = ease.inOutSine(invLerp(0, 0.85, t)), hy = y + h * 0.5;
    const hz = smooth(invLerp(0.2, 1, t));
    wash(g, cx, hy, w * 0.7, L.pal.glow, 0.6 * hz);
    g.beginPath(); g.moveTo(x - 10, hy); g.lineTo(x + w + 10, hy); glowStroke(g, '#eaf8ff', 1.4, 0.9 * hz);
    for (let f = 0; f < 3; f++) {
      const ty = lerp(hy + 6, y + h + 30, k) + f * 12;
      g.beginPath(); for (let i = 0; i <= 50; i++) { const px = x + (i / 50) * w, py = ty + Math.sin(i * 0.7 + tt * 2 + f) * 5; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      glowStroke(g, '#cdeeff', 1.2, 0.7 * (1 - k) * (1 - f * 0.25));
    }
  },
  // 12 · comet trails become fine pastel lines
  12(g, t, L, s) {
    const { x, y, w, h } = L.stage, tt = clock(L, t);
    s.k ??= seeds(12, 11);
    const cols = ['#ffc6e0', '#c6e4ff', '#e6d6ff', '#c9f5e0', '#fff0c2'];
    const k = smooth(invLerp(0.15, 0.85, t));
    s.k.forEach(([a, b], i) => {
      const py = y + h * (0.1 + i * 0.075), col = cols[i % 5];
      const head = lerp(x + w * (0.2 + a * 0.6), x + w * 0.96, k), len = lerp(60 + b * 50, w * 0.9, k);
      const sag = (1 - k) * (i % 2 ? 18 : -18);
      g.beginPath(); g.moveTo(head - len, py + sag); g.quadraticCurveTo(head - len * 0.5, py + sag * 0.3, head, py);
      glowStroke(g, col, lerp(2.4, 0.9, k), lerp(0.95, 0.6, k));
      if (k < 0.85) glow(g, head, py, 12, col, 0.9 * (1 - k));
      if (k > 0.5) glow(g, head - len * (0.5 + 0.4 * Math.sin(tt * 0.5 + i)), py, 5, col, 0.4 * k);
    });
  },
  // 13 · hot reflections cool to rose gold
  13(g, t, L) {
    const { cx, cy, w, h } = L.stage, tt = clock(L, t);
    const k = smooth(invLerp(0.1, 0.9, t));
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + tt * 0.35; const col = mix('#ff3a12', '#f6c2a8', k); glow(g, cx + Math.cos(a) * w * 0.3, cy + Math.sin(a) * h * 0.24, 28 + 6 * Math.sin(tt + i), col, 0.7); }
    if (k > 0) {
      const sx = cx - w * 0.5 + ((tt * 0.12) % 1) * w;
      wash(g, sx, cy - h * 0.1, w * 0.3, '#ffe0c8', 0.45 * k);
      wash(g, cx, cy, w * 0.5, '#f3b9a2', 0.5 * k);
    }
  },
  // 14 · the threads loosen into easy loops
  14(g, t, L) {
    const { x, y, w, h } = L.stage, tt = clock(L, t);
    const k = smooth(invLerp(0.1, 0.85, t));
    [L.pal.glow, L.pal.accent, '#ffd98a', '#ffffff'].forEach((col, r) => {
      g.beginPath();
      for (let i = 0; i <= 140; i++) {
        const u = i / 140, base = y + h * (0.26 + r * 0.15), px = x + u * w;
        const tight = (1 - k) * Math.sin(u * 140 + r) * 5;
        const loop = k * 16, ph = u * 26 + r + tt * 0.6;
        i ? g.lineTo(px + Math.cos(ph) * loop * 0.9, base + Math.sin(ph) * loop + tight) : g.moveTo(px, base);
      }
      glowStroke(g, col, 1.1, 0.75);
    });
  },
  // 15 · wind stops pushing and begins drifting
  15(g, t, L, s) {
    const { x, y, w, h } = L.stage, tt = clock(L, t);
    s.k ??= seeds(15, 40);
    const k = smooth(invLerp(0.1, 0.75, t));
    for (const [a, b, c, d] of s.k) {
      const speed = lerp(700, 14, k), px = x + ((a * w + tt * speed * (0.5 + c)) % (w + 80)) - 40, py = y + b * h + Math.sin(tt * 0.9 + d * 8) * 10 * k;
      const len = lerp(70, 0, k);
      if (len > 2) { g.beginPath(); g.moveTo(px - len, py); g.lineTo(px, py); glowStroke(g, '#eef6ff', 0.8, 0.6 * (1 - k)); }
      glow(g, px, py, 3 + c * 4, mix('#eef6ff', L.pal.glow, d), 0.4 + 0.5 * k);
    }
  },
  // 16 · sound rings widen and thin
  16(g, t, L) {
    const { cx, cy, w } = L.stage, tt = clock(L, t);
    for (let i = 0; i < 7; i++) {
      const k = invLerp(i * 0.07, 0.5 + i * 0.08, t); if (k <= 0 || k >= 1) continue;
      g.beginPath(); g.arc(cx, cy, 16 + w * 0.62 * ease.outCubic(k), 0, TAU);
      glowStroke(g, mix(L.pal.glow, '#ffffff', i / 8), lerp(4, 0.6, k), 0.85 * (1 - k));
    }
    const calm = smooth(invLerp(0.6, 1, t));
    g.beginPath(); g.arc(cx, cy, w * 0.42 + Math.sin(tt * 0.7) * 3, 0, TAU); glowStroke(g, L.pal.glow, 0.6, 0.5 * calm);
    wash(g, cx, cy, w * 0.25, L.pal.glow, 0.45 * calm);
  },
  // 17 · petals unfurl and hold soft open space
  17(g, t, L) {
    const { cx, cy, s } = L.stage, tt = clock(L, t);
    const k = ease.outBack(invLerp(0.05, 0.7, t));
    g.save(); g.translate(cx, cy); g.rotate(tt * 0.05); g.globalCompositeOperation = 'lighter';
    for (const [n, R, len, col] of [[10, 86, 54, '#ffd6ec'], [7, 44, 40, '#fff0f8']]) {
      for (let i = 0; i < n; i++) {
        g.save(); g.rotate(i * TAU / n + (n === 7 ? 0.3 : 0)); g.translate(0, -R * s * Math.max(0.05, k));
        const L2 = len * s * Math.max(0.1, k);
        const gr = g.createLinearGradient(0, L2, 0, -L2);
        gr.addColorStop(0, rgba(L.pal.accent, 0.04)); gr.addColorStop(0.6, rgba(col, 0.32)); gr.addColorStop(1, rgba('#ffffff', 0.5));
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, L2); g.bezierCurveTo(L2 * 0.6, L2 * 0.2, L2 * 0.45, -L2 * 0.7, 0, -L2); g.bezierCurveTo(-L2 * 0.45, -L2 * 0.7, -L2 * 0.6, L2 * 0.2, 0, L2); g.fill();
        g.restore();
      }
    }
    g.restore();
    wash(g, cx, cy, 90 * s, '#fff4fa', 0.6 * smooth(t));
  },
  // 18 · clouds separate to reveal a calm open route
  18(g, t, L, s) {
    const { x, y, w, h, cx } = L.stage, tt = clock(L, t);
    s.k ??= seeds(18, 18);
    const k = ease.inOutSine(invLerp(0.05, 0.8, t)), route = smooth(invLerp(0.3, 1, t));
    g.beginPath(); g.moveTo(cx, y + h); g.bezierCurveTo(cx - 40, y + h * 0.72, cx + 40, y + h * 0.42, cx, y + h * 0.12);
    glowStroke(g, '#fff2d0', 2, route);
    for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, py = lerp(y + h, y + h * 0.12, u), px = cx + Math.sin(u * 5) * 18; glow(g, px, py, 8, '#ffe8b0', 0.8 * smooth(invLerp(0.35 + u * 0.4, 0.5 + u * 0.4, t))); }
    for (const [a, b, c] of s.k) {
      const side = a < 0.5 ? -1 : 1;
      const ox = cx + side * (w * (0.05 + Math.abs(a - 0.5) * 0.5) + k * w * 0.42) + Math.sin(tt * 0.3 + c * 6) * 6;
      puff(g, ox, y + h * (0.12 + b * 0.75), 26 + c * 26, mix('#eceaff', L.pal.glow, 0.25), 0.42);
    }
  },
  // 19 · ink ripples transform into legible soft circles
  19(g, t, L) {
    const { cx, cy, s } = L.stage, tt = clock(L, t);
    const k = smooth(invLerp(0.1, 0.85, t));
    if (k < 1) { g.save(); g.globalAlpha = 0.5 * (1 - k); const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 110 * s); gr.addColorStop(0, 'rgba(10,6,30,0.9)'); gr.addColorStop(1, 'rgba(10,6,30,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 110 * s, 0, TAU); g.fill(); g.restore(); }
    for (let i = 0; i < 5; i++) {
      const r = (22 + i * 22) * s * (1 + 0.02 * Math.sin(tt * 0.8 + i));
      g.beginPath();
      for (let j = 0; j <= 72; j++) { const a = (j / 72) * TAU, wob = (1 - k) * Math.sin(a * 6 + i + tt * 3) * 8; const px = cx + Math.cos(a) * (r + wob), py = cy + Math.sin(a) * (r + wob); j ? g.lineTo(px, py) : g.moveTo(px, py); }
      glowStroke(g, mix('#3a2a6a', L.pal.glow, k), lerp(2.2, 1, k), 0.9);
    }
  },
  // 20 · glow condenses into steady garden lights
  20(g, t, L) {
    const { x, y, w, h, cx } = L.stage, tt = clock(L, t);
    const k = smooth(invLerp(0.15, 0.85, t));
    wash(g, cx, y + h * 0.5, w * 0.7 * (1 - k) + 30, '#ffd98a', 0.7 * (1 - k * 0.8));
    const gy = y + h * 0.88;
    wash(g, cx, gy + 20, w * 0.7, '#ffcf8a', 0.3 * k);
    for (let i = 0; i < 7; i++) {
      const lx = x + w * (0.1 + i * 0.133), ly = gy - Math.sin(i * 0.9) * 8;
      const f = k * (0.92 + 0.08 * Math.sin(tt * 1.3 + i));
      g.strokeStyle = `rgba(30,22,50,${0.7 * k})`; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly + 22); g.lineTo(lx, ly); g.stroke();
      glow(g, lx, ly, 20 * f, '#ffe2a0', 0.85 * f); orb(g, lx, ly, 4.5 * f + 0.1, '#fff4d6', { alpha: k });
      glow(g, lx, ly + 34, 10 * f, '#ffd08a', 0.25 * f);
    }
  },
};

export function drawFinale(n, g, t, L, state) { F[n]?.(g, clamp(t), L, state || {}); }
