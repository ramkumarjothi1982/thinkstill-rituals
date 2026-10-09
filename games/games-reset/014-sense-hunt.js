/* 014 Sense Hunt — Reset · GROUND · Attention / Grounding / Mental Quiet
 * Mechanism: 5-4-3-2-1 grounding, the sensory grounding skill taught for panic, dissociation and rumination: noticing five
 * things you see, four you hear, three you can touch, two you smell and one you taste moves attention out of the threat
 * loop and into present-moment sensory input (attentional refocusing; grounding in anxiety and trauma care). The world
 * starts grey-blue; every thing the player notices blooms colour back into it and joins a small melody of noticing.
 * Verbs: notice (find and tap, listen and point, rub a texture, trace a scent slowly as a breath in, hold for a slow sip).
 * Twist: the player's own looping thoughts arrive as phone notifications mid-listening; swipe them away gently (shoving
 * makes them bounce back) and return to the sounds. Finale: everything noticed lights up in turn as a 5-4-3-2-1 melody,
 * colour floods the room, and Still breathes on the window and writes "You're here." in the fog.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const eOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const eIO = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function rngOf(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------------- colour: the grey-blue fog of alarm, and the way back to colour ---------------- */
  const KEEP = 0.16, GT = [186, 199, 224];
  const rgbC = new Map();
  function rgbOf(hex) { let v = rgbC.get(hex); if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbC.set(hex, v); } return v; }
  const tC = new Map();
  /* The same transform the layers get (desaturate, keep a little colour, grey-blue multiply), mixed back to full colour by k. */
  function tint(hex, k, a) {
    const kq = Math.round(clamp(k, 0, 1) * 20), aq = a == null ? -1 : Math.round(clamp(a, 0, 1) * 100);
    const key = hex + kq + '|' + aq;
    let v = tC.get(key); if (v) return v;
    const c = rgbOf(hex), Lm = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], f = kq / 20;
    const o = [0, 1, 2].map(i => { const g0 = (Lm + KEEP * (c[i] - Lm)) * GT[i] / 255; return Math.round(g0 + (c[i] - g0) * f); });
    v = aq < 0 ? 'rgb(' + o + ')' : 'rgba(' + o + ',' + aq / 100 + ')';
    if (tC.size > 6000) tC.clear();
    tC.set(key, v); return v;
  }
  const hexA = (hex, a) => 'rgba(' + rgbOf(hex) + ',' + a + ')';
  const mC = new Map();
  function mix(a, b, t) {
    const key = a + b + Math.round(t * 50);
    let v = mC.get(key); if (v) return v;
    const x = rgbOf(a), y = rgbOf(b);
    v = '#' + x.map((q, i) => clamp(Math.round(q + (y[i] - q) * t), 0, 255).toString(16).padStart(2, '0')).join('');
    mC.set(key, v); return v;
  }
  const dk = (hex, k) => mix(hex, '#000000', k);   // darker
  const lt = (hex, k) => mix(hex, '#ffffff', k);   // lighter

  /* ---------------- drawing helpers ---------------- */
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function lin(g, x0, y0, x1, y1, st) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rad(g, x, y, r0, r1, st) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function leafPath(g, x, y, len, wid, ang) { // a heart-ish pointed leaf from its stem point
    const c = Math.cos(ang), s = Math.sin(ang), P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
    const a = P(len * 0.45, -wid), b = P(len, 0), d = P(len * 0.45, wid);
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(a[0], a[1], b[0], b[1]); g.quadraticCurveTo(d[0], d[1], x, y); g.closePath();
  }
  function grain(g, x, y, w, h, R, n, col, sz) { g.fillStyle = col; for (let i = 0; i < n; i++) g.fillRect(x + R() * w, y + R() * h, sz || 1, sz || 1); }

  /* ---------------- per-frame helpers shared by scenes ---------------- */
  function steam(g, x, y, s, t, a, c, n) {
    g.lineCap = 'round';
    for (let i = 0; i < (n || 3); i++) {
      const ph = t * 1.3 + i * 2.1, off = (i - 1) * 7 * s, rise = ((t * 0.35 + i * 0.33) % 1);
      g.strokeStyle = c('#ffffff', 0.26 * a * (1 - rise * 0.5)); g.lineWidth = (5.5 - i) * s;
      g.beginPath();
      for (let k = 0; k <= 10; k++) { const yy = y - k * 5 * s - rise * 6 * s, xx = x + off + Math.sin(ph + k * 0.55) * (1.5 + k * 0.75) * s; if (k) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
      g.stroke();
    }
  }
  function soundRings(g, x, y, s, k, t, col) { // arcs that pulse out from a sound source
    if (k <= 0.01) return;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 1.2 + i / 3) % 1), r = (14 + ph * 46) * s;
      g.strokeStyle = hexA(col || '#fff4d6', k * (1 - ph) * 0.75); g.lineWidth = 2.2 * s;
      g.beginPath(); g.arc(x, y, r, -2.5, -0.65); g.stroke();
      g.beginPath(); g.arc(x, y, r, 0.65, 2.5); g.stroke();
    }
  }
  function waterDrop(g, x, y, r, a) {
    g.fillStyle = 'rgba(20,28,44,' + (0.28 * a) + ')'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(235,245,255,' + (0.5 * a) + ')'; g.beginPath(); g.arc(x - r * 0.25, y + r * 0.2, r * 0.72, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,' + (0.95 * a) + ')'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU); g.fill();
  }

  /* ================================================================================================================
     ITEM RENDERERS. Each gets (g, it, T): T.t time, T.s scale, T.k colour (0 grey-blue .. 1 full colour), T.c(hex, a)
     tinted colour, T.life 0..1 alive after it is noticed, T.act 0..1 a sound cue, T.pulse its melody note, T.D dark.
     ================================================================================================================ */
  const RN = {};

  RN.cat = (g, it, T) => {
    const s = T.s * (it.sc || 1), x = it.x, y = it.y, c = T.c, t = T.t, life = T.life;
    const br = 1 + 0.03 * Math.sin(t * 1.6) * (0.25 + 0.75 * life);
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x, y + 1 * s, 42 * s, 5.5 * s); g.fill();
    // tail: tucked round the front; once noticed, the tip lifts and swishes
    const sw = life * Math.sin(t * 2.0) * 0.55;
    g.strokeStyle = c(it.fur); g.lineCap = 'round'; g.lineWidth = 7 * s;
    g.beginPath(); g.moveTo(x - 30 * s, y - 7 * s); g.quadraticCurveTo(x - 42 * s, y + 1 * s, x - 18 * s, y - 1 * s);
    const tx = x + 6 * s + Math.cos(-0.2 + sw) * 9 * s * life, ty = y - 2 * s - (Math.sin(0.5 + sw) * 13 * s + 2 * s) * life;
    g.quadraticCurveTo(x - 2 * s, y + 0 * s, tx, ty); g.stroke();
    g.strokeStyle = c(it.stripe, 0.7); g.lineWidth = 7 * s; g.beginPath(); g.moveTo(lerp(x - 2 * s, tx, 0.75), lerp(y, ty, 0.75)); g.lineTo(tx, ty); g.stroke();
    // body
    g.fillStyle = c(it.fur); ell(g, x - 5 * s, y - 13 * s * br, 31 * s, 14 * s * br); g.fill();
    g.fillStyle = c(dk(it.fur, 0.18), 0.6); ell(g, x - 9 * s, y - 6 * s, 26 * s, 6 * s); g.fill();
    g.strokeStyle = c(it.stripe, 0.6); g.lineWidth = 3 * s;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x - 22 * s + i * 9 * s, y - 24 * s * br, 7 * s, 0.35, 1.45); g.stroke(); }
    g.fillStyle = c(lt(it.fur, 0.25), 0.55); ell(g, x - 10 * s, y - 21 * s * br, 14 * s, 4 * s, -0.1); g.fill();
    // front paws
    g.fillStyle = c(it.cream); ell(g, x + 13 * s, y - 3 * s, 8 * s, 4 * s); g.fill();
    // head
    const nod = Math.sin(t * 0.9) * 0.6 * life, hx = x + 21 * s, hy = y - 15 * s + nod;
    const flick = it.pulse * 0.4 + (life ? Math.max(0, Math.sin(t * 0.7) - 0.92) * 4 : 0);
    const ear = (a, f) => { g.beginPath(); g.moveTo(hx + Math.cos(a - 0.36) * 9 * s, hy + Math.sin(a - 0.36) * 9 * s); g.lineTo(hx + Math.cos(a + f) * 17 * s, hy + Math.sin(a + f) * 17 * s); g.lineTo(hx + Math.cos(a + 0.36) * 9 * s, hy + Math.sin(a + 0.36) * 9 * s); g.closePath(); g.fill(); };
    g.fillStyle = c(it.fur); ear(-2.2, -flick); ear(-0.9, 0);
    g.fillStyle = c('#e9a3a0', 0.8); g.save(); g.translate(hx, hy); g.scale(0.55, 0.55); g.translate(-hx, -hy); ear(-2.2, -flick); ear(-0.9, 0); g.restore();
    g.fillStyle = c(it.fur); g.beginPath(); g.arc(hx, hy, 11 * s, 0, TAU); g.fill();
    g.fillStyle = c(it.cream); ell(g, hx + 2 * s, hy + 4.5 * s, 7 * s, 4.6 * s); g.fill();
    g.fillStyle = c('#d9787a'); g.beginPath(); g.moveTo(hx + 1 * s, hy + 1.6 * s); g.lineTo(hx + 4 * s, hy + 1.6 * s); g.lineTo(hx + 2.5 * s, hy + 3.4 * s); g.closePath(); g.fill();
    // eyes: closed arcs; once noticed she slowly blinks open now and then (a cat's slow blink)
    const open = life * clamp((Math.sin(t * 0.55 + 1) - 0.55) * 3.5, 0, 1);
    g.strokeStyle = c('#2a1a10'); g.lineWidth = 1.5 * s; g.lineCap = 'round';
    for (const ex of [-3.8, 5.6]) {
      if (open > 0.15) { g.fillStyle = c('#c9d86a'); ell(g, hx + ex * s, hy - 2 * s, 2.3 * s, 2.3 * s * open); g.fill(); g.fillStyle = '#1a120c'; ell(g, hx + ex * s, hy - 2 * s, 0.8 * s, 2 * s * open); g.fill(); }
      else { g.beginPath(); g.arc(hx + ex * s, hy - 2.6 * s, 2.4 * s, 0.25, Math.PI - 0.25); g.stroke(); }
    }
    g.strokeStyle = c('#fff8ea', 0.6); g.lineWidth = 0.8 * s;
    g.beginPath(); g.moveTo(hx + 7 * s, hy + 3 * s); g.lineTo(hx + 15 * s, hy + 1.5 * s); g.moveTo(hx + 7 * s, hy + 4.5 * s); g.lineTo(hx + 15 * s, hy + 5 * s); g.stroke();
  };

  RN.pothos = (g, it, T) => {
    const s = T.s * (it.sc || 1), x = it.x, y = it.y, c = T.c, t = T.t, life = T.life;
    const sway = Math.sin(t * 1.1) * (0.6 + 1.6 * life) * s;
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 1 * s, y + 1 * s, 19 * s, 4 * s); g.fill();
    // trailing vines first (behind and over the sill edge)
    const vine = (pts, n, off) => {
      g.strokeStyle = c('#3f7a3a'); g.lineWidth = 1.6 * s; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      g.bezierCurveTo(pts[1][0] + sway, pts[1][1], pts[2][0] + sway, pts[2][1], pts[3][0] + sway * 1.4, pts[3][1]); g.stroke();
      for (let i = 1; i <= n; i++) {
        const u = i / (n + 0.4), v = 1 - u;
        const px = v * v * v * pts[0][0] + 3 * v * v * u * (pts[1][0] + sway) + 3 * v * u * u * (pts[2][0] + sway) + u * u * u * (pts[3][0] + sway * 1.4);
        const py = v * v * v * pts[0][1] + 3 * v * v * u * pts[1][1] + 3 * v * u * u * pts[2][1] + u * u * u * pts[3][1];
        const a = (i % 2 ? 0.6 : 2.5) + off + Math.sin(t * 1.3 + i) * 0.1 * life;
        g.fillStyle = c(i % 3 ? '#4d9a4a' : '#5fae55'); leafPath(g, px, py, 11 * s, 6 * s, a); g.fill();
        g.strokeStyle = c('#2f6a2f', 0.6); g.lineWidth = 0.7 * s; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * 8 * s, py + Math.sin(a) * 8 * s); g.stroke();
      }
    };
    vine([[x - 6 * s, y - 27 * s], [x - 30 * s, y - 22 * s], [x - 42 * s, y + 2 * s], [x - 38 * s, y + 34 * s]], 5, 0);
    vine([[x + 7 * s, y - 27 * s], [x + 26 * s, y - 20 * s], [x + 36 * s, y + 4 * s], [x + 30 * s, y + 26 * s]], 4, 0.4);
    // pot
    g.fillStyle = c('#c46b45'); g.beginPath(); g.moveTo(x - 15 * s, y - 25 * s); g.lineTo(x + 15 * s, y - 25 * s); g.lineTo(x + 11 * s, y); g.lineTo(x - 11 * s, y); g.closePath(); g.fill();
    g.fillStyle = c('#9e4f31', 0.55); g.beginPath(); g.moveTo(x + 5 * s, y - 25 * s); g.lineTo(x + 15 * s, y - 25 * s); g.lineTo(x + 11 * s, y); g.lineTo(x + 4 * s, y); g.closePath(); g.fill();
    g.fillStyle = c('#d98a5f'); rr(g, x - 17 * s, y - 31 * s, 34 * s, 7 * s, 2 * s); g.fill();
    g.fillStyle = c('#f0b08a', 0.5); g.fillRect(x - 15 * s, y - 30 * s, 20 * s, 1.5 * s);
    // upright leaves
    const up = [[-0.5, -2.2], [0.2, -1.6], [0.9, -1.0], [-1.2, -2.6], [0.6, -1.9]];
    up.forEach(([dx, a], i) => { const aa = a + Math.sin(t * 1.4 + i) * 0.06 * (0.4 + life); g.fillStyle = c(i % 2 ? '#4d9a4a' : '#5fae55'); leafPath(g, x + dx * 6 * s, y - 29 * s, 15 * s, 7.5 * s, aa); g.fill(); g.strokeStyle = c('#2f6a2f', 0.5); g.lineWidth = 0.7 * s; g.beginPath(); g.moveTo(x + dx * 6 * s, y - 29 * s); g.lineTo(x + dx * 6 * s + Math.cos(aa) * 11 * s, y - 29 * s + Math.sin(aa) * 11 * s); g.stroke(); });
    // the new leaf unfurls once noticed
    if (life > 0.01) { const k = eOut(life), a = -1.25 + Math.sin(t * 1.2) * 0.05; g.fillStyle = c('#a7dc7a'); leafPath(g, x + 3 * s, y - 31 * s, 19 * s * k, 9 * s * k, a); g.fill(); g.strokeStyle = c('#6aa64c', 0.8); g.lineWidth = 0.8 * s; g.beginPath(); g.moveTo(x + 3 * s, y - 31 * s); g.lineTo(x + 3 * s + Math.cos(a) * 15 * s * k, y - 31 * s + Math.sin(a) * 15 * s * k); g.stroke(); }
  };

  RN.lamp = (g, it, T) => {
    const s = T.s, c = T.c, life = T.life, t = T.t, ax = it.x, ay = -12;
    const len = it.y - ay, ang = (Math.sin(t * 1.25) * 0.05 * life) + it.pulse * 0.012 * Math.sin(t * 9);
    const lx = ax + Math.sin(ang) * len, ly = ay + Math.cos(ang) * len;
    if (life > 0.01) { // warm light
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = life * (0.62 + 0.04 * Math.sin(t * 7));
      g.drawImage(T.spr.warm, lx - 120 * s, ly - 90 * s, 240 * s, 240 * s);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    g.save(); g.translate(ax, ay); g.rotate(ang);
    g.strokeStyle = c('#2b2420'); g.lineWidth = 1.6 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len - 18 * s); g.stroke();
    g.fillStyle = c(dk(it.shade, 0.35)); rr(g, -4 * s, len - 22 * s, 8 * s, 7 * s, 2 * s); g.fill();
    g.fillStyle = c(it.shade);
    g.beginPath(); g.moveTo(-25 * s, len + 1 * s); g.bezierCurveTo(-24 * s, len - 13 * s, -12 * s, len - 18 * s, 0, len - 18 * s); g.bezierCurveTo(12 * s, len - 18 * s, 24 * s, len - 13 * s, 25 * s, len + 1 * s); g.closePath(); g.fill();
    g.fillStyle = c(lt(it.shade, 0.45), 0.7); g.beginPath(); g.moveTo(-18 * s, len - 4 * s); g.bezierCurveTo(-16 * s, len - 13 * s, -8 * s, len - 16 * s, -2 * s, len - 16 * s); g.lineTo(-4 * s, len - 13 * s); g.bezierCurveTo(-10 * s, len - 12 * s, -14 * s, len - 8 * s, -15 * s, len - 2 * s); g.closePath(); g.fill();
    g.fillStyle = c(dk(it.shade, 0.3)); g.fillRect(-25 * s, len - 0.5 * s, 50 * s, 2.5 * s);
    g.fillStyle = life > 0.05 ? mix('#cfc8b8', '#fff7dc', life) : c('#cfc8b8'); ell(g, 0, len + 4 * s, 7 * s, 4.5 * s); g.fill();
    g.restore();
  };

  RN.cup = (g, it, T) => {
    const s = T.s * (it.sc || 1), x = it.x, y = it.y, c = T.c;
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 3 * s, y + 3 * s, 35 * s, 8 * s); g.fill();
    if (it.saucer !== false) { g.fillStyle = c(dk(it.china, 0.12)); ell(g, x, y + 1 * s, 32 * s, 8.5 * s); g.fill(); g.fillStyle = c(it.china); ell(g, x, y, 31 * s, 7.5 * s); g.fill(); g.fillStyle = c(dk(it.china, 0.08)); ell(g, x, y + 0.5 * s, 20 * s, 4.6 * s); g.fill(); }
    g.fillStyle = c(it.china);
    g.beginPath(); g.moveTo(x - 17 * s, y - 27 * s); g.lineTo(x + 17 * s, y - 27 * s); g.bezierCurveTo(x + 17 * s, y - 7 * s, x + 12 * s, y - 1 * s, x, y - 1 * s); g.bezierCurveTo(x - 12 * s, y - 1 * s, x - 17 * s, y - 7 * s, x - 17 * s, y - 27 * s); g.fill();
    g.fillStyle = c(dk(it.china, 0.16), 0.75); g.beginPath(); g.moveTo(x + 6 * s, y - 27 * s); g.lineTo(x + 17 * s, y - 27 * s); g.bezierCurveTo(x + 17 * s, y - 7 * s, x + 12 * s, y - 1 * s, x + 1 * s, y - 1 * s); g.bezierCurveTo(x + 9 * s, y - 6 * s, x + 9 * s, y - 16 * s, x + 6 * s, y - 27 * s); g.fill();
    if (it.band) { g.fillStyle = c(it.band); g.fillRect(x - 16.5 * s, y - 20 * s, 33 * s, 3 * s); }
    g.strokeStyle = c(it.china); g.lineWidth = 4 * s; g.beginPath(); g.arc(x + 19 * s, y - 16 * s, 6.5 * s, -1.25, 1.35); g.stroke();
    g.fillStyle = c(lt(it.china, 0.3)); ell(g, x, y - 27 * s, 17 * s, 4.4 * s); g.fill();
    g.fillStyle = c(it.drink); ell(g, x, y - 26.4 * s, 14.6 * s, 3.3 * s); g.fill();
    if (it.crema) { g.fillStyle = c(it.crema, 0.85); ell(g, x - 2 * s, y - 26.8 * s, 8 * s, 1.6 * s); g.fill(); }
    g.fillStyle = c('#ffffff', 0.5); g.fillRect(x - 13 * s, y - 23 * s, 2.4 * s, 13 * s);
    if (T.life > 0.01) steam(g, x, y - 32 * s, s, T.t, T.life, c);
  };
  RN.cupSteam = (g, it, T) => { if (T.life > 0.01) steam(g, it.x, it.y - 32 * T.s, T.s, T.t, T.life, T.c); };

  RN.sparrow = (g, it, T) => {
    const s = T.s * (it.sc || 1.15), c = T.c, t = T.t, life = T.life;
    let hop = 0, flap = 0, tilt = 0, dx = 0;
    if (life > 0) { const ph = (t * 0.3 + (it.seed || 0)) % 1; if (ph < 0.14) { hop = Math.sin(ph / 0.14 * Math.PI) * 7 * s; flap = 1; dx = Math.sin(ph / 0.14 * Math.PI) * 2 * s; } tilt = Math.sin(t * 2.3) * 0.3 * life; }
    g.save(); g.translate(it.x + dx, it.y - hop);
    g.fillStyle = c('#5e4330'); g.beginPath(); g.moveTo(-6 * s, -4 * s); g.lineTo(-14 * s, -1 * s); g.lineTo(-12 * s, -6 * s); g.closePath(); g.fill();
    g.fillStyle = c('#8a6544'); ell(g, -1 * s, -5.5 * s, 7.5 * s, 5.2 * s, -0.2); g.fill();
    g.fillStyle = c('#e6d6bb'); ell(g, 1.5 * s, -3.6 * s, 5 * s, 3.2 * s, -0.25); g.fill();
    g.save(); g.translate(-2 * s, -7 * s); g.rotate(-0.2 - flap * (0.4 + 0.5 * Math.sin(t * 48))); g.fillStyle = c('#6b4b31'); ell(g, -2 * s, 0, 6 * s, 2.7 * s); g.fill(); g.fillStyle = c('#c9a77d', 0.7); g.fillRect(-6 * s, -0.5 * s, 6 * s, 1 * s); g.restore();
    g.save(); g.translate(4.5 * s, -9.5 * s); g.rotate(tilt);
    g.fillStyle = c('#8a6544'); g.beginPath(); g.arc(0, 0, 3.9 * s, 0, TAU); g.fill();
    g.fillStyle = c('#4f3826'); g.beginPath(); g.arc(-0.3 * s, -0.6 * s, 3.4 * s, Math.PI * 1.05, TAU * 0.98); g.fill();
    g.fillStyle = c('#e9e1d2'); ell(g, 1.4 * s, 1.4 * s, 2.2 * s, 1.4 * s); g.fill();
    g.fillStyle = '#140d09'; g.beginPath(); g.arc(1.6 * s, -0.4 * s, 0.95 * s, 0, TAU); g.fill();
    g.fillStyle = c('#d9a441'); g.beginPath(); g.moveTo(3.4 * s, -0.6 * s); g.lineTo(6.6 * s, 0.3 * s); g.lineTo(3.4 * s, 1.1 * s); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = c('#4a3526'); g.lineWidth = 0.9 * s; g.beginPath(); g.moveTo(-0.5 * s, -1 * s); g.lineTo(-1.5 * s, 1.5 * s); g.moveTo(2 * s, -1 * s); g.lineTo(2 * s, 1.5 * s); g.stroke();
    g.restore();
  };

  RN.umbrella = (g, it, T) => {
    const s = T.s * (it.sc || 0.95), c = T.c, t = T.t, life = T.life;
    const bob = life * Math.abs(Math.sin(t * 3.2)) * 2.4 * s, sway = life * Math.sin(t * 1.6) * 0.14;
    g.save(); g.translate(it.x, it.y);
    g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, 0, 0.5 * s, 9 * s, 2 * s); g.fill();
    g.translate(0, -bob);
    g.fillStyle = c('#1f2430'); g.fillRect(-4 * s, -9 * s, 2.6 * s, 9 * s); g.fillRect(1.4 * s, -9 * s, 2.6 * s, 9 * s);
    g.fillStyle = c(it.coat || '#3a4256'); g.beginPath(); g.moveTo(-6 * s, -27 * s); g.lineTo(6 * s, -27 * s); g.lineTo(8 * s, -8 * s); g.lineTo(-8 * s, -8 * s); g.closePath(); g.fill();
    g.fillStyle = c('#e8c4a0'); g.beginPath(); g.arc(0, -30 * s, 3.6 * s, 0, TAU); g.fill();
    g.strokeStyle = c('#2a2220'); g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(2 * s, -21 * s); g.lineTo(2 * s, -44 * s); g.stroke();
    g.rotate(sway); g.translate(0, -37 * s);
    const spin = life * t * 2.4, R = 18 * s;
    g.fillStyle = c(it.canopy || '#d23a32');
    g.beginPath(); g.moveTo(-R, 0);
    g.bezierCurveTo(-R, -15 * s, R, -15 * s, R, 0);
    for (let i = 0; i < 6; i++) { const x0 = R - (i * 2 * R) / 6, x1 = R - ((i + 1) * 2 * R) / 6; g.quadraticCurveTo((x0 + x1) / 2, 3 * s, x1, 0); }
    g.closePath(); g.fill();
    g.strokeStyle = c(dk(it.canopy || '#d23a32', 0.28)); g.lineWidth = 1 * s;
    for (let i = 0; i < 4; i++) { const a = spin + i * Math.PI / 4, px = Math.sin(a) * R; if (Math.cos(a) < 0) continue; g.beginPath(); g.moveTo(0, -11 * s); g.quadraticCurveTo(px * 0.7, -8 * s, px, 0.5 * s); g.stroke(); }
    g.fillStyle = c('#ffffff', 0.28); g.beginPath(); g.moveTo(-R * 0.7, -3 * s); g.bezierCurveTo(-R * 0.6, -11 * s, -2 * s, -12 * s, 2 * s, -12 * s); g.bezierCurveTo(-4 * s, -10 * s, -10 * s, -7 * s, -R * 0.45, -2 * s); g.closePath(); g.fill();
    g.fillStyle = c('#2a2220'); g.fillRect(-0.8 * s, -15 * s, 1.6 * s, 4 * s);
    g.restore();
  };

  RN.rainrace = (g, it, T) => { // a drop on the glass; once noticed, two drops race each other down the pane
    const s = T.s, life = T.life, x0 = it.x, y0 = it.y, bottom = T.L.win.y + T.L.win.h - 10 * s;
    if (life < 0.02) { waterDrop(g, x0, y0, 5 * s, 0.95); waterDrop(g, x0 + 15 * s, y0 + 6 * s, 3.6 * s, 0.9); return; }
    const per = 4.6, tt = T.t - (it.t0 || 0), lap = Math.floor(tt / per), ph = (tt % per) / per;
    for (let j = 0; j < 2; j++) {
      const lane = x0 + j * 15 * s, sp = j === lap % 2 ? 1.12 : 0.94;
      const k = clamp(ph * sp * 1.15, 0, 1), stick = k + Math.sin(k * 26 + j) * 0.012;
      const yy = lerp(y0 + j * 6 * s, bottom, eIO(clamp(stick, 0, 1)));
      g.strokeStyle = 'rgba(225,236,250,0.3)'; g.lineWidth = 2 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(lane, Math.max(y0, yy - 48 * s)); g.lineTo(lane, yy); g.stroke();
      waterDrop(g, lane, yy, (j ? 3.8 : 5) * s, 0.95 * (1 - Math.max(0, ph - 0.92) * 10));
    }
  };

  RN.snail = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y - (life ? ((t * 1.2) % 30) * s * 0.3 : 0);
    g.save(); g.translate(x, y); g.rotate(-Math.PI / 2);
    g.fillStyle = c('#b9a68c'); ell(g, 2 * s, 3 * s, 9 * s, 2.6 * s); g.fill();
    g.strokeStyle = c('#b9a68c'); g.lineWidth = 1 * s; const wv = Math.sin(t * 3) * life;
    g.beginPath(); g.moveTo(9 * s, 2 * s); g.lineTo(13 * s, -2 * s + wv); g.moveTo(8 * s, 2 * s); g.lineTo(11 * s, -3 * s - wv); g.stroke();
    g.fillStyle = c('#c98a4b'); g.beginPath(); g.arc(0, -1 * s, 6 * s, 0, TAU); g.fill();
    g.strokeStyle = c('#8a5427'); g.lineWidth = 1.1 * s; g.beginPath(); for (let a = 0; a < 9; a += 0.3) { const r = 5.4 * s * (1 - a / 10); const px = Math.cos(a) * r, py = -1 * s + Math.sin(a) * r; if (a) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
    g.restore();
  };

  RN.paperboat = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, bob = Math.sin(t * 2.2) * 1.2 * s, x = it.x + (life ? Math.sin(t * 0.4) * 6 * s : 0), y = it.y + bob;
    g.fillStyle = c('#f2efe6'); g.beginPath(); g.moveTo(x - 9 * s, y - 3 * s); g.lineTo(x + 9 * s, y - 3 * s); g.lineTo(x + 6 * s, y); g.lineTo(x - 6 * s, y); g.closePath(); g.fill();
    g.fillStyle = c('#dcd6c8'); g.beginPath(); g.moveTo(x - 4 * s, y - 3 * s); g.lineTo(x, y - 11 * s); g.lineTo(x + 4 * s, y - 3 * s); g.closePath(); g.fill();
    g.strokeStyle = c('#ffffff', 0.35); g.lineWidth = 0.8 * s; g.beginPath(); g.ellipse(x, y + 0.5 * s, 11 * s + Math.sin(t * 2) * s, 1.6 * s, 0, 0, TAU); g.stroke();
  };

  RN.machine = (g, it, T) => { // espresso machine on the counter's right edge
    const s = T.s, c = T.c, t = T.t, act = T.act, x = it.x, y = it.y;
    const shake = act > 0.2 && !T.reduced ? Math.sin(t * 60) * 0.7 * act : 0;
    g.save(); g.translate(x + shake, y);
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 0, 2 * s, 42 * s, 7 * s); g.fill();
    g.fillStyle = c('#2b2b30'); rr(g, -40 * s, -12 * s, 80 * s, 12 * s, 3 * s); g.fill();
    g.fillStyle = c('#9aa3ad'); rr(g, -36 * s, -92 * s, 72 * s, 80 * s, 10 * s); g.fill();
    g.fillStyle = lin(g, -36 * s, 0, 36 * s, 0, [[0, c('#6e7781')], [0.3, c('#e6ecf1')], [0.55, c('#b7c0c9')], [1, c('#5c636d')]]); rr(g, -34 * s, -90 * s, 68 * s, 76 * s, 9 * s); g.fill();
    g.fillStyle = c(it.body || '#b8322c'); rr(g, -34 * s, -70 * s, 68 * s, 26 * s, 4 * s); g.fill();
    g.fillStyle = c('#ffffff', 0.22); g.fillRect(-30 * s, -68 * s, 60 * s, 3 * s);
    g.fillStyle = c('#f4f1ea'); g.beginPath(); g.arc(-14 * s, -80 * s, 7 * s, 0, TAU); g.fill();
    g.strokeStyle = c('#2a2a2a'); g.lineWidth = 1.2 * s; g.beginPath(); g.arc(-14 * s, -80 * s, 7 * s, 0, TAU); g.stroke();
    const nd = -2.2 + 0.4 * Math.sin(t * 0.7) + act * 1.1 * Math.sin(t * 13);
    g.strokeStyle = c('#c0392b'); g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(-14 * s, -80 * s); g.lineTo(-14 * s + Math.cos(nd) * 5.5 * s, -80 * s + Math.sin(nd) * 5.5 * s); g.stroke();
    g.fillStyle = c(act > 0.3 ? '#ffcf5a' : '#7a6a3a'); g.beginPath(); g.arc(12 * s, -80 * s, 3 * s, 0, TAU); g.fill();
    for (const gx of [-14, 14]) { g.fillStyle = c('#3a3d44'); rr(g, (gx - 8) * s, -40 * s, 16 * s, 9 * s, 2 * s); g.fill(); g.fillStyle = c('#1d1e22'); rr(g, (gx - 3) * s, -32 * s, 6 * s, 9 * s, 1.5 * s); g.fill(); g.fillStyle = c('#131315'); rr(g, (gx + 3) * s, -38 * s, 18 * s, 4 * s, 2 * s); g.fill(); }
    g.strokeStyle = c('#d7dde3'); g.lineWidth = 2.4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(-36 * s, -58 * s); g.quadraticCurveTo(-46 * s, -50 * s, -44 * s, -28 * s); g.stroke();
    g.fillStyle = c('#ffffff', 0.35); g.fillRect(-28 * s, -88 * s, 3 * s, 70 * s);
    g.restore();
  };
  RN.machineLive = (g, it, T) => { // the gauge needle and the ready light, over the baked machine
    const s = T.s, c = T.c, t = T.t, act = T.act, x = it.x, y = it.y;
    g.fillStyle = c('#f4f1ea'); g.beginPath(); g.arc(x - 14 * s, y - 80 * s, 5.6 * s, 0, TAU); g.fill();
    const nd = -2.2 + 0.4 * Math.sin(t * 0.7) + act * 1.1 * Math.sin(t * 13);
    g.strokeStyle = c('#c0392b'); g.lineWidth = 1.3 * s; g.beginPath(); g.moveTo(x - 14 * s, y - 80 * s); g.lineTo(x - 14 * s + Math.cos(nd) * 5.5 * s, y - 80 * s + Math.sin(nd) * 5.5 * s); g.stroke();
    if (act > 0.25) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = act * 0.8; g.drawImage(T.spr.warm, x + 12 * s - 12 * s, y - 80 * s - 12 * s, 24 * s, 24 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    if (act > 0.3 && T.emit && Math.random() < 0.35) T.emit('smoke', x - 44 * s, y - 30 * s, 1, { speed: [14, 34], angle: -Math.PI / 2 - 0.5, spread: 0.5, size: [3, 6], colors: ['rgba(250,252,255,0.3)'] });
  };

  RN.bell = (g, it, T) => { // the café door bell on its curly bracket
    const s = T.s, c = T.c, t = T.t, act = T.act, x = it.x, y = it.y;
    g.strokeStyle = c('#2a241f'); g.lineWidth = 2.4 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + 18 * s, y - 6 * s); g.lineTo(x, y - 6 * s); g.stroke();
    g.beginPath(); g.arc(x + 8 * s, y - 1 * s, 5 * s, Math.PI, TAU * 0.95); g.stroke();
    const sw = Math.sin(t * 13) * 0.42 * act + Math.sin(t * 1.3) * 0.03;
    g.save(); g.translate(x, y - 5 * s); g.rotate(sw);
    g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 7 * s); g.stroke();
    g.fillStyle = c(it.metal || '#cfa04c');
    g.beginPath(); g.moveTo(-3 * s, 8 * s); g.bezierCurveTo(-4 * s, 13 * s, -7 * s, 17 * s, -10 * s, 21 * s); g.lineTo(10 * s, 21 * s); g.bezierCurveTo(7 * s, 17 * s, 4 * s, 13 * s, 3 * s, 8 * s); g.closePath(); g.fill();
    g.fillStyle = c(lt(it.metal || '#cfa04c', 0.5), 0.8); g.fillRect(-5 * s, 11 * s, 2 * s, 8 * s);
    g.fillStyle = c(dk(it.metal || '#cfa04c', 0.35)); ell(g, 0, 21 * s, 10 * s, 2 * s); g.fill();
    g.fillStyle = c('#3a2e22'); g.beginPath(); g.arc(Math.sin(sw * 2) * 4 * s, 22.5 * s, 2 * s, 0, TAU); g.fill();
    g.restore();
  };

  RN.towerBell = (g, it, T) => { // the far clock tower's bell, painted into the outside view
    const s = T.s * 0.7, c = T.c, t = T.t, act = T.act, x = it.x, y = it.y;
    if (T.D || act > 0.05) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (T.D ? 0.35 : 0) + act * 0.5; g.drawImage(T.spr.warm, x - 26 * s, it.clockY - 26 * s, 52 * s, 52 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    const sw = Math.sin(t * 6) * 0.5 * act;
    g.save(); g.translate(x, y - 6 * s); g.rotate(sw);
    g.fillStyle = c('#b58a3c'); g.beginPath(); g.moveTo(-3 * s, 0); g.lineTo(3 * s, 0); g.lineTo(6 * s, 9 * s); g.lineTo(-6 * s, 9 * s); g.closePath(); g.fill();
    g.restore();
  };

  RN.rainCue = () => {};
  RN.none = () => {};

  RN.scarf = (g, it, T) => { // a folded knit scarf: three stacked bands, ribbing, stripes, a fringe
    const s = T.s, c = T.c, x = it.x, y = it.y, base = it.tex.base, alt = it.tex.alt;
    g.fillStyle = 'rgba(0,0,0,0.24)'; ell(g, x + 2 * s, y + 13 * s, 50 * s, 8 * s); g.fill();
    const band = (bx, by, bw, bh, shadeK) => {
      const col = dk(base, shadeK);
      g.fillStyle = c(col); rr(g, bx, by, bw, bh, bh / 2); g.fill();
      g.strokeStyle = c(dk(col, 0.2), 0.55); g.lineWidth = 1 * s;
      for (let xx = bx + 5 * s; xx < bx + bw - 4 * s; xx += 3.6 * s) { g.beginPath(); g.moveTo(xx, by + 3 * s); g.lineTo(xx, by + bh - 3 * s); g.stroke(); }
      g.fillStyle = c(alt); g.fillRect(bx + bw - 22 * s, by + 1 * s, 5 * s, bh - 2 * s); g.fillRect(bx + bw - 14 * s, by + 1 * s, 3 * s, bh - 2 * s);
      g.fillRect(bx + 12 * s, by + 1 * s, 4 * s, bh - 2 * s);
      g.fillStyle = c('#ffffff', 0.14); rr(g, bx + 4 * s, by + 2 * s, bw - 8 * s, bh * 0.3, bh * 0.15); g.fill();
    };
    band(x - 46 * s, y - 2 * s, 90 * s, 17 * s, 0.12);
    band(x - 40 * s, y - 16 * s, 84 * s, 17 * s, 0.04);
    band(x - 44 * s, y - 30 * s, 80 * s, 17 * s, 0);
    g.strokeStyle = c(dk(base, 0.25)); g.lineWidth = 1.2 * s;
    for (let i = 0; i < 6; i++) { const fx = x + 44 * s, fy = y + 1 * s + i * 2.5 * s; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + 6 * s, fy + 2 * s, fx + 10 * s + (i % 2) * 2 * s, fy + 4 * s); g.stroke(); }
  };

  RN.jug = (g, it, T) => {
    const s = T.s * (1 + T.squash * 0.05), c = T.c, x = it.x, y = it.y, b = it.tex.base;
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 3 * s, y + 2 * s, 22 * s, 5 * s); g.fill();
    g.fillStyle = c(b);
    g.beginPath(); g.moveTo(x - 10 * s, y - 40 * s); g.lineTo(x + 8 * s, y - 40 * s); g.lineTo(x + 15 * s, y - 45 * s); g.lineTo(x + 13 * s, y - 37 * s);
    g.bezierCurveTo(x + 22 * s, y - 24 * s, x + 20 * s, y - 2 * s, x + 12 * s, y); g.lineTo(x - 12 * s, y); g.bezierCurveTo(x - 20 * s, y - 2 * s, x - 22 * s, y - 24 * s, x - 10 * s, y - 40 * s); g.closePath(); g.fill();
    g.strokeStyle = c(b); g.lineWidth = 3.6 * s; g.beginPath(); g.arc(x - 18 * s, y - 22 * s, 8 * s, 1.9, 4.6); g.stroke();
    g.fillStyle = c(dk(b, 0.18), 0.7); g.beginPath(); g.moveTo(x + 4 * s, y - 38 * s); g.bezierCurveTo(x + 18 * s, y - 24 * s, x + 16 * s, y - 4 * s, x + 10 * s, y); g.lineTo(x + 2 * s, y); g.bezierCurveTo(x + 10 * s, y - 10 * s, x + 10 * s, y - 26 * s, x + 4 * s, y - 38 * s); g.fill();
    g.fillStyle = c('#ffffff', 0.55 + T.squash * 0.3); ell(g, x - 8 * s, y - 24 * s, 2.6 * s, 9 * s, 0.15); g.fill();
    g.fillStyle = c(dk(b, 0.35)); ell(g, x - 1 * s, y - 40 * s, 9 * s, 1.8 * s); g.fill();
  };

  RN.spot = () => {};
  RN.paper = (g, it, T) => { // a folded newspaper
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.save(); g.translate(x, y); g.rotate(-0.12);
    g.fillStyle = 'rgba(0,0,0,0.22)'; rr(g, -50 * s, -18 * s, 104 * s, 44 * s, 3 * s); g.fill();
    g.fillStyle = c('#ece5d4'); rr(g, -54 * s, -24 * s, 104 * s, 44 * s, 2 * s); g.fill();
    g.fillStyle = c('#d9d0bc'); g.fillRect(-4 * s, -24 * s, 2 * s, 44 * s);
    g.fillStyle = c('#3a3530', 0.75); g.fillRect(-48 * s, -18 * s, 38 * s, 5 * s);
    g.fillStyle = c('#3a3530', 0.3); for (let i = 0; i < 5; i++) { g.fillRect(-48 * s, -9 * s + i * 5 * s, 40 * s, 1.6 * s); g.fillRect(2 * s, -18 * s + i * 6 * s, 42 * s, 1.6 * s); }
    g.fillStyle = c('#9db7c9', 0.8); g.fillRect(4 * s, 12 * s, 18 * s, 6 * s);
    g.restore();
  };
  RN.cakestand = (g, it, T) => { // a glass dome over a little cake
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 3 * s, y + 3 * s, 38 * s, 8 * s); g.fill();
    g.fillStyle = c('#e9e3d8'); ell(g, x, y - 18 * s, 36 * s, 7 * s); g.fill(); g.fillRect(x - 3 * s, y - 18 * s, 6 * s, 18 * s); ell(g, x, y, 14 * s, 4 * s); g.fill();
    g.fillStyle = c('#f3d9b5'); rr(g, x - 22 * s, y - 40 * s, 44 * s, 22 * s, 5 * s); g.fill();
    g.fillStyle = c('#f7f0e6'); rr(g, x - 23 * s, y - 44 * s, 46 * s, 9 * s, 4 * s); g.fill();
    g.fillStyle = c('#c94a4a'); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x - 16 * s + i * 8 * s, y - 45 * s, 3 * s, 0, TAU); g.fill(); }
    g.fillStyle = c('#a8642f', 0.6); g.fillRect(x - 22 * s, y - 31 * s, 44 * s, 3 * s);
    g.fillStyle = c('#e6f1f6', 0.22); g.beginPath(); g.moveTo(x - 34 * s, y - 20 * s); g.bezierCurveTo(x - 34 * s, y - 80 * s, x + 34 * s, y - 80 * s, x + 34 * s, y - 20 * s); g.closePath(); g.fill();
    g.strokeStyle = c('#ffffff', 0.55); g.lineWidth = 2 * s; g.beginPath(); g.arc(x, y - 44 * s, 26 * s, -2.7, -2.0); g.stroke();
    g.fillStyle = c('#d8c9a8'); g.beginPath(); g.arc(x, y - 66 * s, 4 * s, 0, TAU); g.fill();
  };
  RN.vase = (g, it, T) => { // a bud vase with two flowers
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 2 * s, y + 2 * s, 12 * s, 3.5 * s); g.fill();
    g.strokeStyle = c('#4c8a4a'); g.lineWidth = 1.6 * s; g.beginPath(); g.moveTo(x, y - 20 * s); g.quadraticCurveTo(x - 6 * s, y - 40 * s, x - 10 * s, y - 56 * s); g.moveTo(x, y - 20 * s); g.quadraticCurveTo(x + 5 * s, y - 36 * s, x + 9 * s, y - 48 * s); g.stroke();
    for (const [fx, fy, col] of [[x - 10 * s, y - 58 * s, '#f2a7b8'], [x + 9 * s, y - 50 * s, '#ffd36b']]) { g.fillStyle = c(col); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; ell(g, fx + Math.cos(a) * 4 * s, fy + Math.sin(a) * 4 * s, 3.4 * s, 2.4 * s, a); g.fill(); } g.fillStyle = c('#e08a2b'); g.beginPath(); g.arc(fx, fy, 2 * s, 0, TAU); g.fill(); }
    g.fillStyle = c('#5b8fb0'); g.beginPath(); g.moveTo(x - 4 * s, y - 22 * s); g.lineTo(x + 4 * s, y - 22 * s); g.quadraticCurveTo(x + 12 * s, y - 8 * s, x + 7 * s, y); g.lineTo(x - 7 * s, y); g.quadraticCurveTo(x - 12 * s, y - 8 * s, x - 4 * s, y - 22 * s); g.fill();
    g.fillStyle = c('#ffffff', 0.4); g.fillRect(x - 4 * s, y - 16 * s, 2 * s, 12 * s);
  };
  RN.sugar = (g, it, T) => { // a sugar jar with a spoon
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 2 * s, y + 2 * s, 14 * s, 4 * s); g.fill();
    g.fillStyle = c('#e8eef0', 0.55); rr(g, x - 11 * s, y - 24 * s, 22 * s, 24 * s, 5 * s); g.fill();
    g.fillStyle = c('#fbf8f2'); rr(g, x - 9 * s, y - 15 * s, 18 * s, 13 * s, 3 * s); g.fill();
    g.fillStyle = c('#b8854a'); rr(g, x - 12 * s, y - 28 * s, 24 * s, 6 * s, 2 * s); g.fill();
    g.strokeStyle = c('#c9ccd0'); g.lineWidth = 2 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 4 * s, y - 26 * s); g.lineTo(x + 12 * s, y - 40 * s); g.stroke();
    g.fillStyle = c('#ffffff', 0.5); g.fillRect(x - 8 * s, y - 22 * s, 2 * s, 18 * s);
  };

  RN.bun = (g, it, T) => {
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 3 * s, y + 3 * s, 33 * s, 8 * s); g.fill();
    g.fillStyle = c('#e9e4da'); ell(g, x, y, 31 * s, 8 * s); g.fill(); g.fillStyle = c('#f7f3ec'); ell(g, x, y - 1 * s, 26 * s, 6 * s); g.fill();
    g.fillStyle = c('#b56d32'); ell(g, x, y - 8 * s, 19 * s, 10 * s); g.fill();
    g.fillStyle = c('#d08a45'); ell(g, x, y - 10 * s, 17 * s, 8.5 * s); g.fill();
    g.strokeStyle = c('#8b4d22'); g.lineWidth = 1.6 * s; g.beginPath();
    for (let a = 0; a < 14; a += 0.25) { const r = a * 1.15 * s; const px = x + Math.cos(a) * r, py = y - 10 * s + Math.sin(a) * r * 0.48; if (a) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
    g.strokeStyle = c('#fbf6ec', 0.9); g.lineWidth = 1.6 * s; g.beginPath(); for (let i = 0; i < 7; i++) { const px = x - 13 * s + i * 4.3 * s; g.lineTo(px, y - 14 * s + (i % 2 ? 5 : 0) * s); } g.stroke();
  };

  /* ================================================================================================================
     SCENE: THE RAINY CAFÉ
     ================================================================================================================ */
  const CAFE_PAL = {
    night: { dark: true, sky0: '#10172a', sky1: '#28304e', sky2: '#57475c', cloud: '#363f5c', fac: ['#8e4b3b', '#bfa983', '#4f6b5c', '#34465f', '#b2873c'], trim: '#e7dcc2',
      lit: ['#ffe6a8', '#ffbd63', '#e3893d'], winDark: '#1b2131', glassDay: null, awn: [['#b53d33', '#efe2cc'], ['#2e5b4d', '#ede4cf'], ['#c99238', '#f8eedb']], walk: '#3d4155', curb: '#262938',
      road0: '#1e2337', road1: '#0f121c', lamp: '#ffd28e', tower: '#6d6870', towerDk: '#47434e', clock: '#fff0c4', tile: '#cdb48f', grout: '#8a7457', frame: '#1e3a31', frameHi: '#3b6455',
      frameDk: '#10211b', brass: '#c99a4b', sill: '#7a4d2c', sillHi: '#a26b3f', wood: '#6b4024', woodHi: '#93603a', woodDk: '#3c2213', light: '#ffcf8a', fog: '#dce6f0', wallLight: 0.5 },
    day: { dark: false, sky0: '#7a8ba6', sky1: '#a5b2c4', sky2: '#c9cdd2', cloud: '#c3cad5', fac: ['#a65a45', '#dbc7a0', '#6e8e7c', '#4e6584', '#cd9e4c'], trim: '#f2ead8',
      lit: ['#f5f0e3', '#ded5c2', '#c3b9a4'], winDark: '#61718a', awn: [['#c44a3e', '#f5ead6'], ['#3b6d5e', '#f2ead8'], ['#d9a446', '#fbf3e2']], walk: '#888c97', curb: '#5d616d',
      road0: '#4b5163', road1: '#353a48', lamp: '#fff2cf', tower: '#a39da4', towerDk: '#7b7580', clock: '#f3efe4', tile: '#f2e0c2', grout: '#c4ad87', frame: '#2c5a4b', frameHi: '#4f8371',
      frameDk: '#1a3a30', brass: '#d3a656', sill: '#94633a', sillHi: '#b98250', wood: '#875833', woodHi: '#ab7344', woodDk: '#5a361f', light: '#fff0cc', fog: '#eef3f8', wallLight: 0.25 }
  };
  function planCafe(L, R) {
    const W = L.win.w, H = L.win.h, s = L.s, m = L.m;
    const street = Math.round(H * 0.73);
    const fac = []; let x = -m - 8 * s, i = 0;
    while (x < W + m) {
      const fw = Math.round((78 + R() * 44) * s);
      const nearTower = x < W * 0.8 && x + fw > W * 0.8;
      fac.push({ x, w: fw, top: Math.round(H * (nearTower ? 0.27 : 0.07 + R() * 0.13)), c: i % 5, a: (i * 2) % 3, seed: R() });
      x += fw; i++;
    }
    const shop = (f) => Math.round(street - (street - f.top) * 0.4);
    const sF = fac.find(f => f.x + f.w > W * 0.6 && f.x < W * 0.6) || fac[1];
    const tw = Math.round(30 * s), tx = Math.round(W * 0.8);
    return { street, fac, shop, sparrow: { x: sF.x + sF.w * 0.36, y: shop(sF) + 13 * s }, tower: { x: tx, w: tw, top: Math.round(H * 0.02), bellY: Math.round(H * 0.11), clockY: Math.round(H * 0.2) },
      umb: { x: Math.round(W * 0.33), y: street + 3 * s }, stop: Math.round(W * 0.45), puddle: { x: Math.round(W * 0.64), y: Math.round(H * 0.9) }, lampX: Math.round(W * 0.1) };
  }
  function cafeFacade(g, f, PL, P, R, s, D) {
    const x = f.x, w = f.w, top = f.top, st = PL.street, base = P.fac[f.c], sy = PL.shop(f);
    g.fillStyle = base; g.fillRect(x, top, w, st - top);
    g.fillStyle = lin(g, 0, top, 0, st, [[0, 'rgba(255,255,255,0.12)'], [1, 'rgba(0,0,0,0.22)']]); g.fillRect(x, top, w, st - top);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + w - 3 * s, top, 3 * s, st - top);
    for (let yy = top + 10 * s; yy < sy - 12 * s; yy += 6 * s) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(x, yy, w, 1); }
    g.fillStyle = P.trim; g.globalAlpha = 0.9; g.fillRect(x - 2 * s, top - 5 * s, w + 4 * s, 7 * s); g.globalAlpha = 0.6; for (let dx = x; dx < x + w; dx += 6 * s) g.fillRect(dx, top + 2 * s, 3 * s, 3 * s);
    g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x - 2 * s, top + 5 * s, w + 4 * s, 2 * s);
    const avail = sy - top - 26 * s, rows = Math.max(1, Math.min(3, Math.floor(avail / (36 * s)))), cols = w > 100 * s ? 3 : 2;
    const ww = (w - 16 * s) / cols - 9 * s, wh = Math.min(28 * s, avail / rows - 12 * s);
    for (let r = 0; r < rows; r++) for (let cI = 0; cI < cols; cI++) {
      const wx = x + 8 * s + cI * (ww + 9 * s) + 4.5 * s, wy = top + 16 * s + r * (wh + 12 * s);
      const lit = D ? R() < 0.6 : R() < 0.15;
      g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(wx - 2.5 * s, wy - 2.5 * s, ww + 5 * s, wh + 5 * s);
      g.fillStyle = lit ? lin(g, 0, wy, 0, wy + wh, [[0, P.lit[0]], [1, P.lit[1]]]) : (D ? P.winDark : lin(g, wx, wy, wx + ww, wy + wh, [[0, '#d3dce6'], [0.5, '#8d9cad'], [1, '#b2bdc8']]));
      g.fillRect(wx, wy, ww, wh);
      if (lit && D) { g.fillStyle = 'rgba(80,40,20,0.35)'; g.fillRect(wx, wy, ww * 0.22, wh); g.fillRect(wx + ww * 0.78, wy, ww * 0.22, wh); if (R() < 0.5) { g.fillStyle = 'rgba(40,24,16,0.55)'; ell(g, wx + ww * 0.6, wy + wh, 4 * s, 7 * s); g.fill(); } }
      g.fillStyle = P.trim; g.globalAlpha = 0.85; g.fillRect(wx + ww / 2 - 0.8 * s, wy, 1.6 * s, wh); g.fillRect(wx, wy + wh * 0.45, ww, 1.4 * s); g.fillRect(wx - 3 * s, wy + wh + 1 * s, ww + 6 * s, 2.6 * s); g.globalAlpha = 1;
      if (R() < 0.35) { g.fillStyle = '#4e3426'; g.fillRect(wx - 2 * s, wy + wh + 3.6 * s, ww + 4 * s, 4 * s); for (let k = 0; k < 6; k++) { g.fillStyle = ['#e65b5b', '#f2a3b6', '#ffd36b', '#6fb36b'][k % 4]; g.beginPath(); g.arc(wx + (k + 0.5) * (ww / 6), wy + wh + 3 * s, 1.7 * s, 0, TAU); g.fill(); } }
    }
    g.fillStyle = shade2(base, 0.5); g.fillRect(x + 2 * s, sy - 10 * s, w - 4 * s, 10 * s);
    g.fillStyle = hexA('#e8c46a', 0.75); g.fillRect(x + 9 * s, sy - 6 * s, w * 0.42, 1.8 * s); g.fillRect(x + 9 * s, sy - 3.5 * s, w * 0.28, 1.2 * s);
    const dx = x + 6 * s, dw = w * 0.6, dy = sy + 9 * s, dh = st - dy - 2 * s;
    g.fillStyle = shade2(base, 0.6); g.fillRect(x, sy, w, st - sy);
    if (D) { g.fillStyle = lin(g, 0, dy, 0, dy + dh, [[0, P.lit[0]], [0.6, P.lit[1]], [1, P.lit[2]]]); }
    else g.fillStyle = lin(g, dx, dy, dx + dw, dy + dh, [[0, '#dfe5ea'], [0.45, '#9aa8b7'], [0.55, '#c2ccd5'], [1, '#8796a7']]);
    g.fillRect(dx, dy, dw, dh);
    g.fillStyle = D ? 'rgba(70,36,18,0.45)' : 'rgba(60,60,70,0.25)';
    for (let k = 0; k < 2; k++) g.fillRect(dx + 2 * s, dy + dh * (0.4 + k * 0.32), dw - 4 * s, 1.6 * s);
    for (let k = 0; k < 5; k++) { const bx = dx + 4 * s + R() * (dw - 12 * s), by = dy + dh * (0.4 + (k % 2) * 0.32); g.fillRect(bx, by - 6 * s, 3 * s, 6 * s); }
    g.fillStyle = P.trim; g.globalAlpha = 0.9; g.fillRect(dx - 1.5 * s, dy - 1.5 * s, dw + 3 * s, 2 * s); g.fillRect(dx - 1.5 * s, dy, 2 * s, dh); g.fillRect(dx + dw - 0.5 * s, dy, 2 * s, dh); g.globalAlpha = 1;
    const ddx = dx + dw + 5 * s, ddw = Math.max(10 * s, x + w - ddx - 6 * s);
    g.fillStyle = shade2(base, 0.35); g.fillRect(ddx, dy - 2 * s, ddw, st - dy + 2 * s);
    g.fillStyle = D ? hexA(P.lit[1], 0.75) : 'rgba(170,185,200,0.8)'; g.fillRect(ddx + 2 * s, dy + 1 * s, ddw - 4 * s, (st - dy) * 0.45);
    const aw = P.awn[f.a], ay0 = sy - 1 * s, ay1 = sy + 13 * s, ax0 = dx - 2 * s, ax1 = dx + dw + 2 * s;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(ax0 - 3 * s, ay1, ax1 - ax0 + 6 * s, 4 * s);
    const sw = 7 * s;
    for (let k = 0, xx = ax0 - 3 * s; xx < ax1 + 3 * s; k++, xx += sw) {
      g.fillStyle = aw[k % 2]; g.beginPath(); g.moveTo(xx + 1.5 * s, ay0); g.lineTo(Math.min(xx + sw + 1.5 * s, ax1), ay0); g.lineTo(Math.min(xx + sw, ax1 + 3 * s), ay1); g.lineTo(xx, ay1); g.closePath(); g.fill();
      g.beginPath(); g.arc(xx + sw / 2, ay1, sw / 2, 0, Math.PI); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(ax0, ay0, ax1 - ax0, 2 * s);
  }
  function shade2(hex, k) { return dk(hex, 1 - k); }
  function outCafe(g, L, P, R, PL) {
    const W = L.win.w, H = L.win.h, m = L.m, s = L.s, D = P.dark, st = PL.street;
    g.fillStyle = lin(g, 0, -m, 0, st, [[0, P.sky0], [0.62, P.sky1], [1, P.sky2]]); g.fillRect(-m, -m, W + 2 * m, st + m);
    for (let i = 0; i < 8; i++) { g.fillStyle = hexA(P.cloud, 0.3 + R() * 0.3); ell(g, -m + R() * (W + 2 * m), H * (0.0 + R() * 0.14), (60 + R() * 80) * s, (10 + R() * 9) * s); g.fill(); }
    // the clock tower behind the rooftops
    const T = PL.tower, tw = T.w;
    g.fillStyle = P.tower; g.fillRect(T.x - tw / 2, T.top + 12 * s, tw, st - T.top);
    g.fillStyle = P.towerDk; g.fillRect(T.x + tw / 2 - 6 * s, T.top + 12 * s, 6 * s, st - T.top);
    g.beginPath(); g.moveTo(T.x - tw / 2 - 3 * s, T.top + 13 * s); g.lineTo(T.x, T.top - 16 * s); g.lineTo(T.x + tw / 2 + 3 * s, T.top + 13 * s); g.closePath(); g.fillStyle = dk(P.towerDk, 0.15); g.fill();
    g.fillStyle = '#1a1820'; rr(g, T.x - tw * 0.3, T.bellY - 9 * s, tw * 0.6, 16 * s, 6 * s); g.fill();
    g.fillStyle = P.clock; g.beginPath(); g.arc(T.x, T.clockY, tw * 0.32, 0, TAU); g.fill();
    g.strokeStyle = '#2b2730'; g.lineWidth = 1.4 * s; g.beginPath(); g.arc(T.x, T.clockY, tw * 0.32, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(T.x, T.clockY); g.lineTo(T.x, T.clockY - tw * 0.22); g.moveTo(T.x, T.clockY); g.lineTo(T.x + tw * 0.16, T.clockY + 2 * s); g.stroke();
    PL.fac.forEach(f => cafeFacade(g, f, PL, P, R, s, D));
    g.fillStyle = P.walk; g.fillRect(-m, st, W + 2 * m, 8 * s);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(-m, st, W + 2 * m, 1.2 * s);
    g.fillStyle = P.curb; g.fillRect(-m, st + 8 * s, W + 2 * m, 3 * s);
    g.fillStyle = lin(g, 0, st + 11 * s, 0, H + m, [[0, P.road0], [1, P.road1]]); g.fillRect(-m, st + 11 * s, W + 2 * m, H + m - st);
    PL.fac.forEach(f => { // wet reflections of the shop windows
      const dx = f.x + 6 * s, dw = f.w * 0.6, col = D ? P.lit[1] : '#c7d0da';
      g.fillStyle = lin(g, 0, st + 11 * s, 0, H + m, [[0, hexA(col, D ? 0.42 : 0.22)], [1, hexA(col, 0)]]);
      for (let yy = st + 12 * s; yy < H + m; yy += 4 * s) { const jit = (R() - 0.5) * 3 * s; g.fillRect(dx + jit, yy, dw * (0.8 + R() * 0.2), 2.4 * s); }
    });
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5 * s; g.setLineDash([12 * s, 10 * s]); g.beginPath(); g.moveTo(-m, H * 0.93); g.lineTo(W + m, H * 0.93); g.stroke(); g.setLineDash([]);
    const pd = PL.puddle; g.fillStyle = hexA(D ? '#3a4466' : '#aab6c6', 0.7); ell(g, pd.x, pd.y, 34 * s, 5.5 * s); g.fill(); g.fillStyle = hexA(D ? '#ffcf86' : '#ffffff', 0.25); ell(g, pd.x - 8 * s, pd.y - 1 * s, 14 * s, 1.6 * s); g.fill();
    g.fillStyle = '#23262f'; g.fillRect(PL.stop - 1 * s, st - 30 * s, 2 * s, 34 * s); g.fillStyle = D ? '#c94b3e' : '#d0523f'; g.beginPath(); g.arc(PL.stop, st - 32 * s, 6 * s, 0, TAU); g.fill(); g.fillStyle = '#f4efe4'; g.fillRect(PL.stop - 4 * s, st - 33 * s, 8 * s, 2.2 * s);
    const lx = PL.lampX; g.fillStyle = '#20232b'; g.fillRect(lx - 1.6 * s, H * 0.3, 3.2 * s, st + 6 * s - H * 0.3); g.fillRect(lx - 4 * s, st + 2 * s, 8 * s, 4 * s);
    g.beginPath(); g.moveTo(lx - 7 * s, H * 0.3); g.lineTo(lx + 7 * s, H * 0.3); g.lineTo(lx + 4 * s, H * 0.3 - 12 * s); g.lineTo(lx - 4 * s, H * 0.3 - 12 * s); g.closePath(); g.fill();
    g.fillStyle = D ? P.lamp : '#e7e2d4'; g.fillRect(lx - 3.5 * s, H * 0.3 - 10 * s, 7 * s, 8 * s);
    if (D) { g.fillStyle = rad(g, lx, H * 0.3 - 6 * s, 2 * s, 70 * s, [[0, hexA(P.lamp, 0.55)], [0.4, hexA(P.lamp, 0.16)], [1, hexA(P.lamp, 0)]]); g.fillRect(lx - 70 * s, H * 0.3 - 76 * s, 140 * s, 140 * s); }
    grain(g, -m, -m, W + 2 * m, H + 2 * m, R, Math.round(W * H / 90), 'rgba(255,255,255,0.05)', 1.2);
  }
  function glassCafe(g, L, P, R) {
    const W = L.win.w, H = L.win.h, s = L.s;
    g.fillStyle = lin(g, 0, H * 0.55, 0, H, [[0, hexA(P.fog, 0)], [1, hexA(P.fog, P.dark ? 0.3 : 0.4)]]); g.fillRect(0, H * 0.55, W, H * 0.45);
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) { g.fillStyle = rad(g, cx, cy, 0, W * 0.4, [[0, hexA(P.fog, 0.28)], [1, hexA(P.fog, 0)]]); g.fillRect(cx - W * 0.4, cy - W * 0.4, W * 0.8, W * 0.8); }
    for (let i = 0; i < Math.round(W * H / 1500); i++) { const y = Math.pow(R(), 0.6) * H, x = R() * W; waterDrop(g, x, y, (0.7 + R() * 2.2) * s, 0.55 + R() * 0.4); }
  }
  function tileWall(g, x0, y0, x1, y1, s, P, R) {
    const tw = Math.round(30 * s), th = Math.round(15 * s);
    g.fillStyle = P.grout; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let row = 0, y = y0 - 2; y < y1; row++, y += th) for (let x = x0 + (row % 2 ? -tw / 2 : 0); x < x1; x += tw) {
      g.fillStyle = mix(P.tile, R() < 0.5 ? '#ffffff' : '#000000', R() * 0.05); rr(g, x + 1, y + 1, tw - 2, th - 2, 3 * s); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, y + 2, tw - 6, 1.3);
      g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(x + 2, y + th - 3, tw - 4, 1);
    }
  }
  function woodTop(g, x, y, w, h, P, R, s) {
    g.fillStyle = lin(g, 0, y, 0, y + h, [[0, P.woodHi], [0.2, P.wood], [1, P.woodDk]]); g.fillRect(x, y, w, h);
    let yy = y + 3 * s, k = 0;
    while (yy < y + h) {
      const ph = 14 * s * Math.pow(1.22, k);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, yy + ph - 1.2 * s, w, 1.2 * s);
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, yy, w, 1);
      g.strokeStyle = 'rgba(40,20,8,0.16)'; g.lineWidth = 1;
      for (let q = 0; q < 3; q++) { const gy = yy + (q + 0.5) * ph / 3.2, a = R() * 6; g.beginPath(); for (let gx = x; gx <= x + w; gx += 12) { const py = gy + Math.sin(gx * 0.018 + a) * 1.6 * s; if (gx === x) g.moveTo(gx, py); else g.lineTo(gx, py); } g.stroke(); }
      for (let q = 0; q < w / 120; q++) { g.fillStyle = 'rgba(40,20,8,0.18)'; ell(g, x + R() * w, yy + R() * ph, 5 * s, 1.4 * s); g.fill(); }
      yy += ph; k++;
    }
  }
  function roomCafe(g, L, P, R, PL) {
    const { w, h, win, s, sillY, tab, phone } = L, D = P.dark;
    tileWall(g, 0, 0, w, tab.y + 4, s, P, R);
    // lighting: the lamp's warm pool at night, cool window light by day
    const lx = win.x + win.w * 0.6;
    g.fillStyle = rad(g, lx, win.y + 40 * s, 10, Math.max(w, h) * 0.75, D ? [[0, 'rgba(255,190,110,0.22)'], [0.5, 'rgba(120,70,30,0.0)'], [1, 'rgba(10,6,20,0.55)']] : [[0, 'rgba(255,255,255,0.12)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(30,30,50,0.22)']]);
    g.fillRect(0, 0, w, tab.y);
    // wainscot under the sill
    g.fillStyle = P.frame; g.fillRect(0, sillY + 22 * s, w, tab.y - sillY - 22 * s);
    g.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 18 * s; x < w; x += 46 * s) g.fillRect(x, sillY + 30 * s, 2 * s, tab.y - sillY - 36 * s);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, sillY + 22 * s, w, 3 * s);
    // window recess and frame
    const ft = Math.round(14 * s);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(win.x - ft - 7 * s, win.y - ft - 7 * s, win.w + 2 * ft + 14 * s, win.h + ft + 10 * s);
    g.fillStyle = P.frame; g.fillRect(win.x - ft, win.y - ft, win.w + 2 * ft, win.h + ft);
    g.fillStyle = P.frameHi; g.fillRect(win.x - ft, win.y - ft, win.w + 2 * ft, 2.5 * s); g.fillRect(win.x - ft, win.y - ft, 2.5 * s, win.h + ft);
    g.fillStyle = P.frameDk; g.fillRect(win.x - 3 * s, win.y - 3 * s, win.w + 6 * s, 3 * s); g.fillRect(win.x - 3 * s, win.y, 3 * s, win.h); g.fillRect(win.x + win.w + ft - 3 * s, win.y - ft, 3 * s, win.h + ft);
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(win.x, win.y, win.w, win.h); g.restore();
    const ty = Math.round(win.y + win.h * 0.2);
    g.fillStyle = P.frame; g.fillRect(win.x, ty - 5 * s, win.w, 10 * s);
    g.fillStyle = P.frameHi; g.fillRect(win.x, ty - 5 * s, win.w, 1.6 * s);
    g.fillStyle = P.frameDk; g.fillRect(win.x, ty + 4 * s, win.w, 1.4 * s);
    for (let i = 1; i < 3; i++) { const bx = Math.round(win.x + win.w * i / 3); g.fillStyle = P.frame; g.fillRect(bx - 3 * s, win.y, 6 * s, ty - win.y); g.fillStyle = P.frameHi; g.fillRect(bx - 3 * s, win.y, 1.4 * s, ty - win.y); }
    g.save(); g.translate(win.x + win.w * 0.5, win.y + win.h * 0.44); g.scale(-1, 1); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'italic 700 ' + Math.round(36 * s) + 'px Fraunces, Georgia, "Lora", serif';
    g.fillStyle = lin(g, 0, -18 * s, 0, 18 * s, [[0, 'rgba(255,236,170,0.62)'], [0.5, 'rgba(214,166,72,0.58)'], [1, 'rgba(255,226,150,0.62)']]);
    g.fillText('Café', 0, 0);
    g.strokeStyle = 'rgba(232,196,110,0.45)'; g.lineWidth = 1.4 * s; g.beginPath(); g.arc(0, 34 * s, 58 * s, -Math.PI * 0.78, -Math.PI * 0.22); g.stroke();
    g.restore();
    // sill
    const sx0 = win.x - ft - 10 * s, sx1 = win.x + win.w + ft + 10 * s;
    g.fillStyle = P.sillHi; g.fillRect(sx0, sillY - 4 * s, sx1 - sx0, 14 * s);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(sx0, sillY + 8 * s, sx1 - sx0, 1.5 * s);
    g.fillStyle = P.sill; g.fillRect(sx0 - 4 * s, sillY + 10 * s, sx1 - sx0 + 8 * s, 13 * s);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(sx0 - 4 * s, sillY + 21 * s, sx1 - sx0 + 8 * s, 2 * s);
    g.fillStyle = lin(g, 0, sillY + 23 * s, 0, sillY + 40 * s, [[0, 'rgba(0,0,0,0.32)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(sx0, sillY + 23 * s, sx1 - sx0, 17 * s);
    // radiator under the window (desktop has room for it)
    if (!phone) {
      const rx = win.x + win.w * 0.3, rw = win.w * 0.4, ry = sillY + 30 * s, rh = tab.y - ry - 8 * s;
      if (rh > 22 * s) { for (let i = 0; i < 12; i++) { const fx = rx + i * rw / 12; g.fillStyle = mix('#e8e1d2', '#000000', D ? 0.35 : 0.08); rr(g, fx + 1 * s, ry, rw / 12 - 2 * s, rh, 4 * s); g.fill(); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(fx + 3 * s, ry + 3 * s, 2 * s, rh - 6 * s); } }
    }
    // counter
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, tab.y - 5 * s, w, 5 * s);
    woodTop(g, 0, tab.y, w, h - tab.y, P, R, s);
    g.fillStyle = 'rgba(255,240,210,0.18)'; g.fillRect(0, tab.y, w, 2 * s);
    g.fillStyle = lin(g, 0, tab.y, 0, tab.y + 70 * s, [[0, D ? 'rgba(170,190,230,0.10)' : 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(win.x, tab.y, win.w, 70 * s);
    if (D) { g.fillStyle = rad(g, lx, tab.y + 60 * s, 10, w * 0.7, [[0, 'rgba(255,190,110,0.16)'], [1, 'rgba(255,190,110,0)']]); g.fillRect(0, tab.y, w, h - tab.y); }
    // Still's little shelf
    const st = L.still;
    if (phone) shelf(g, st.x - 6, st.y + st.size - 6, st.size + 16, s, P);
    else {
      shelf(g, st.x - 10, st.y + st.size - 6, st.size + 30, s, P);
      shelfDecor(g, 22 * s, win.x - ft - 30 * s, h * 0.45, s, P, R, 'jars');
      shelfDecor(g, 22 * s, win.x - ft - 30 * s, h * 0.45 + 74 * s, s, P, R, 'cups');
      const cx0 = win.x + win.w + ft + 36 * s, cx1 = w - 30 * s;
      if (cx1 - cx0 > 120 * s) chalkboard(g, cx0, win.y + win.h * 0.42, cx1 - cx0, win.h * 0.4, s, P, R);
    }
    grain(g, 0, 0, w, h, R, Math.round(w * h / 60), 'rgba(0,0,0,0.05)', 1.2);
    grain(g, 0, 0, w, h, R, Math.round(w * h / 140), 'rgba(255,255,255,0.05)', 1.2);
  }
  function shelf(g, x, y, w, s, P) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 4 * s, y + 7 * s, w - 8 * s, 6 * s);
    g.fillStyle = P.sillHi || P.woodHi; g.fillRect(x, y, w, 4 * s); g.fillStyle = P.sill || P.wood; g.fillRect(x, y + 4 * s, w, 5 * s);
    g.fillStyle = P.sill || P.wood; g.beginPath(); g.moveTo(x + 10 * s, y + 9 * s); g.lineTo(x + 18 * s, y + 9 * s); g.lineTo(x + 12 * s, y + 20 * s); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x + w - 10 * s, y + 9 * s); g.lineTo(x + w - 18 * s, y + 9 * s); g.lineTo(x + w - 12 * s, y + 20 * s); g.closePath(); g.fill();
  }
  function shelfDecor(g, x0, x1, y, s, P, R, kind) {
    shelf(g, x0, y, x1 - x0, s, P);
    let x = x0 + 14 * s;
    while (x < x1 - 30 * s) {
      if (kind === 'jars') { const jh = (26 + R() * 18) * s, jw = (18 + R() * 8) * s; g.fillStyle = 'rgba(220,235,240,0.35)'; rr(g, x, y - jh, jw, jh, 4 * s); g.fill(); g.fillStyle = ['#5b3a24', '#c99a6b', '#8a5a2b', '#e8d9b8'][Math.floor(R() * 4)]; rr(g, x + 2 * s, y - jh * 0.7, jw - 4 * s, jh * 0.7 - 2 * s, 3 * s); g.fill(); g.fillStyle = '#7a5530'; g.fillRect(x - 1 * s, y - jh - 4 * s, jw + 2 * s, 5 * s); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 3 * s, y - jh + 3 * s, 2 * s, jh - 8 * s); x += jw + (8 + R() * 10) * s; }
      else { const cw = 20 * s; for (let k = 0; k < 3; k++) { g.fillStyle = ['#f2ece2', '#e9b8a0', '#a8c9d8'][k]; rr(g, x, y - (k + 1) * 9 * s, cw, 9 * s, 2 * s); g.fill(); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y - (k + 1) * 9 * s + 7 * s, cw, 2 * s); } x += cw + (14 + R() * 12) * s; }
    }
  }
  function chalkboard(g, x, y, w, h, s, P, R) {
    g.fillStyle = '#5a3b22'; rr(g, x - 6 * s, y - 6 * s, w + 12 * s, h + 12 * s, 4 * s); g.fill();
    g.fillStyle = '#2b302e'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(240,240,230,0.55)'; g.lineWidth = 1.4 * s; g.lineCap = 'round';
    for (let r = 0; r < 6; r++) { const yy = y + 16 * s + r * (h - 26 * s) / 6; const len = w * (0.3 + R() * 0.35); g.beginPath(); for (let k = 0; k < len; k += 6 * s) g.lineTo(x + 12 * s + k, yy + Math.sin(k * 0.3 + r) * 1.6 * s); g.stroke(); g.beginPath(); g.arc(x + w - 22 * s, yy, 2 * s, 0, TAU); g.stroke(); }
  }

  /* layout anchors for item specs */
  const AW = (fx, fy) => (L) => ({ x: L.win.x + L.win.w * fx, y: L.win.y + L.win.h * fy });
  const AS = (fx) => (L) => ({ x: L.win.x + L.win.w * fx, y: L.sillY + 3 * L.s });
  const AT = (fx, fy) => (L) => ({ x: L.tab.x + L.tab.w * fx, y: L.tab.y + L.tab.h * fy });
  const AR = () => (L) => (L.phone ? { x: L.w - 30 * L.s, y: L.tab.y + 26 * L.s } : { x: L.win.x + L.win.w + 96 * L.s, y: L.tab.y + 30 * L.s });

  const CAFE = {
    id: 'cafe', title: 'the rainy café', where: 'café', key: ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5'], bass: ['F2', 'D2', 'A#1', 'C2'], rain: true,
    pal: CAFE_PAL, plan: planCafe, out: outCafe, glass: glassCafe, room: roomCafe,
    items: [
      { id: 'cat', role: 'see', type: 'cat', name: 'a sleepy cat', zone: 'room', at: AS(0.2), r: 40, cy: -14, fur: '#d98a45', stripe: '#a95f27', cream: '#f4dcb6', sound: 'purr',
        q: ['She’s pretending she didn’t notice you. Classic cat.', 'A cat. Doing nothing. Professionally.', 'Cat. Asleep. Good role model.'] },
      { id: 'cup', role: 'see', type: 'cupSteam', bake: 'cup', name: 'coffee steam', zone: 'room', at: AT(0.3, 0.3), r: 36, cy: -16, china: '#f3eee6', drink: '#4a2c1a', crema: '#b88555', band: '#2e5b4d', sound: 'sip',
        q: ['Look at that steam curl. Still warm.', 'Steam. The coffee’s showing off.', 'Steam. Warm coffee. Real.'] },
      { id: 'lamp', role: 'see', type: 'lamp', name: 'the warm lamp', zone: 'room', at: AW(0.6, 0.11), r: 30, cy: -4, shade: '#c9973f', sound: 'glow',
        q: ['Oh, that light’s lovely.', 'Lamp on. Instant cosy.', 'Light on. Warmer already.'] },
      { id: 'sparrow', role: 'see', type: 'sparrow', name: 'a sparrow', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.sparrow.x, y: L.win.y + PL.sparrow.y }), r: 26, cy: -6, seed: 0.3, sound: 'chirp',
        q: ['A sparrow, sheltering from the rain. Smart bird.', 'Tiny bird. Big attitude. Respect.', 'Sparrow. Staying dry. Smart.'] },
      { id: 'umb', role: 'see', type: 'umbrella', name: 'a red umbrella', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.umb.x, y: L.win.y + PL.umb.y }), r: 28, cy: -30, sound: 'twirl',
        q: ['Someone’s enjoying the rain.', 'Red umbrella. Main character energy.', 'Red umbrella. Someone dancing.'] },
      { id: 'drop', role: 'see', type: 'rainrace', name: 'a raindrop race', zone: 'glass', at: AW(0.16, 0.42), r: 26, cy: 0, sound: 'drip',
        q: ['A raindrop race! Pick a winner.', 'Raindrop race. Left one’s cheating.', 'Two drops. Racing. Watch.'] },
      { id: 'pothos', role: 'see', type: 'pothos', name: 'a new leaf', zone: 'room', at: AS(0.76), r: 34, cy: -22, sound: 'leaf',
        q: ['A brand new leaf, just unfurling.', 'New leaf. The plant’s trying its best.', 'New leaf. Growing. Slowly.'] },
      { id: 'snail', role: 'secret', secret: 0, type: 'snail', name: 'the window snail', zone: 'room', at: (L) => ({ x: L.win.x - 7 * L.s, y: L.win.y + L.win.h * 0.62 }), r: 24, cy: 0 },
      { id: 'boat', role: 'secret', secret: 1, type: 'paperboat', name: 'a paper boat', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.puddle.x, y: L.win.y + PL.puddle.y - 1 }), r: 26, cy: -4 },
      { id: 'rainL', role: 'hear', pos: 'left', type: 'rainCue', name: 'rain on the glass', zone: 'glass', at: AW(0.2, 0.36), r: 70, cy: 0, sound: 'rain' },
      { id: 'machine', role: 'hear', pos: 'right', type: 'machineLive', bake: 'machine', name: 'the coffee machine', zone: 'room', at: AR(), r: 46, cy: -50, sound: 'hiss' },
      { id: 'bell', role: 'hear', pos: 'above', type: 'bell', name: 'the door bell', zone: 'room', at: AW(0.92, 0.02), r: 40, cy: 10, sound: 'bell' },
      { id: 'tower', role: 'hear', pos: 'far', type: 'towerBell', name: 'the clock tower', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.tower.x, y: L.win.y + PL.tower.bellY, clockY: L.win.y + PL.tower.clockY }), r: 44, cy: 6, sound: 'tower' },
      { id: 'scarf', role: 'touch', kind: 'knit', type: 'none', bake: 'scarf', name: 'a woolly scarf', zone: 'room', at: AT(0.09, 0.36), r: 42, cy: -4, words: ['soft', 'fuzzy', 'warm'], tex: { base: '#d9a441', alt: '#b4452f' } },
      { id: 'jug', role: 'touch', kind: 'glaze', type: 'none', bake: 'jug', name: 'a smooth jug', zone: 'room', at: AT(0.78, 0.42), r: 34, cy: -22, words: ['smooth', 'cool', 'glassy'], tex: { base: '#a8c9d8' } },
      { id: 'spot', role: 'touch', kind: 'wood', type: 'spot', name: 'the wooden counter', zone: 'room', at: AT(0.5, 0.5), atD: AT(0.6, 0.42), r: 40, cy: 0, words: ['grainy', 'solid', 'worn'], tex: { base: '#8a5530' } },
      { id: 'coffee', role: 'smell', type: 'none', name: 'fresh coffee', zone: 'room', src: 'cup', at: AT(0.3, 0.3), dy: -36, col: '#caa070', motif: 'bean', words: ['rich', 'roasty', 'warm'] },
      { id: 'news', role: 'decor', type: 'none', bake: 'paper', at: AT(0.12, 0.86) },
      { id: 'cake', role: 'decor', desk: true, type: 'none', bake: 'cakestand', at: AT(0.97, 0.5) },
      { id: 'vase', role: 'decor', desk: true, type: 'none', bake: 'vase', at: AT(-0.07, 0.22) },
      { id: 'sugar', role: 'decor', type: 'none', bake: 'sugar', at: AT(0.44, 0.2) },
      { id: 'bun', role: 'smell', type: 'none', bake: 'bun', name: 'a cinnamon bun', zone: 'room', at: AT(0.56, 0.32), dy: -16, col: '#e8ad5c', motif: 'swirl', words: ['sweet', 'spicy', 'buttery'] }
    ]
  };

  /* ================================================================================================================
     SHARED ROOM PIECES FOR THE OTHER SCENES
     ================================================================================================================ */
  function pineTree(g, x, base, h, col, hi) {
    const w = h * 0.36;
    g.fillStyle = col;
    g.fillRect(x - h * 0.025, base - h * 0.08, h * 0.05, h * 0.1);
    for (let i = 0; i < 4; i++) {
      const ty = base - h * 0.06 - h * i * 0.2, tw = w * (1 - i * 0.2);
      g.beginPath(); g.moveTo(x - tw, ty); g.quadraticCurveTo(x - tw * 0.3, ty - h * 0.1, x, ty - h * 0.34); g.quadraticCurveTo(x + tw * 0.3, ty - h * 0.1, x + tw, ty); g.closePath(); g.fill();
    }
    if (hi) { g.fillStyle = hi; for (let i = 0; i < 4; i++) { const ty = base - h * 0.06 - h * i * 0.2, tw = w * (1 - i * 0.2); g.beginPath(); g.moveTo(x - tw * 0.9, ty - 1); g.quadraticCurveTo(x - tw * 0.3, ty - h * 0.09, x - 1, ty - h * 0.32); g.lineTo(x - tw * 0.3, ty - 1); g.closePath(); g.fill(); } g.fillStyle = col; }
  }
  function frameBox(g, L, P, ft, s) { // a thick painted or wooden frame around the window opening, with bevels
    const win = L.win;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(win.x - ft - 7 * s, win.y - ft - 7 * s, win.w + 2 * ft + 14 * s, win.h + ft + 10 * s);
    g.fillStyle = P.frame; g.fillRect(win.x - ft, win.y - ft, win.w + 2 * ft, win.h + ft);
    g.fillStyle = P.frameHi; g.fillRect(win.x - ft, win.y - ft, win.w + 2 * ft, 2.5 * s); g.fillRect(win.x - ft, win.y - ft, 2.5 * s, win.h + ft);
    g.fillStyle = P.frameDk; g.fillRect(win.x - 3 * s, win.y - 3 * s, win.w + 6 * s, 3 * s); g.fillRect(win.x - 3 * s, win.y, 3 * s, win.h); g.fillRect(win.x + win.w + ft - 3 * s, win.y - ft, 3 * s, win.h + ft);
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(win.x, win.y, win.w, win.h); g.restore();
  }
  function bar(g, x, y, w, h, P, s) { g.fillStyle = P.frame; g.fillRect(x, y, w, h); g.fillStyle = P.frameHi; if (w > h) g.fillRect(x, y, w, 1.6 * s); else g.fillRect(x, y, 1.6 * s, h); g.fillStyle = P.frameDk; if (w > h) g.fillRect(x, y + h - 1.4 * s, w, 1.4 * s); else g.fillRect(x + w - 1.4 * s, y, 1.4 * s, h); }
  function sillBoard(g, L, P, s, ft) {
    const { win, sillY } = L, sx0 = win.x - ft - 10 * s, sx1 = win.x + win.w + ft + 10 * s;
    g.fillStyle = P.sillHi; g.fillRect(sx0, sillY - 4 * s, sx1 - sx0, 14 * s);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(sx0, sillY + 8 * s, sx1 - sx0, 1.5 * s);
    g.fillStyle = P.sill; g.fillRect(sx0 - 4 * s, sillY + 10 * s, sx1 - sx0 + 8 * s, 13 * s);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(sx0 - 4 * s, sillY + 21 * s, sx1 - sx0 + 8 * s, 2 * s);
    g.fillStyle = lin(g, 0, sillY + 23 * s, 0, sillY + 40 * s, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(sx0, sillY + 23 * s, sx1 - sx0, 17 * s);
  }
  function curtain(g, x, top, bottom, w, side, P, s, R) { // a gathered checked curtain tied back at mid-height
    const tieY = top + (bottom - top) * 0.56, dir = side === 'l' ? 1 : -1, x0 = x, x1 = x + dir * w;
    g.save();
    g.beginPath(); g.moveTo(x0, top); g.lineTo(x1, top);
    g.quadraticCurveTo(x1 - dir * w * 0.1, (top + tieY) / 2, x0 + dir * w * 0.42, tieY);
    g.quadraticCurveTo(x0 + dir * w * 0.9, (tieY + bottom) / 2 + 10 * s, x0 + dir * w * 0.95, bottom);
    g.lineTo(x0, bottom); g.closePath();
    g.fillStyle = P.curtain; g.fill(); g.clip();
    g.fillStyle = hexA(P.curtain2, 0.45); for (let xx = Math.min(x0, x1) - 10; xx < Math.max(x0, x1) + 10; xx += 12 * s) g.fillRect(xx, top, 5 * s, bottom - top);
    g.fillStyle = hexA(P.curtain2, 0.32); for (let yy = top; yy < bottom; yy += 12 * s) g.fillRect(Math.min(x0, x1) - 10, yy, w + 20, 5 * s);
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 2 * s; for (let k = 1; k < 4; k++) { const fx = x0 + dir * w * k / 4.2; g.beginPath(); g.moveTo(fx, top); g.quadraticCurveTo(fx + dir * 4 * s, (top + tieY) / 2, x0 + dir * w * (0.3 + k * 0.05), tieY); g.stroke(); }
    g.fillStyle = lin(g, x0, 0, x1, 0, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(Math.min(x0, x1), top, w, bottom - top);
    g.restore();
    g.fillStyle = dk(P.curtain, 0.3); rr(g, x0 + dir * w * 0.42 - 9 * s, tieY - 4 * s, 18 * s, 8 * s, 3 * s); g.fill();
    void R;
  }
  function plankWall(g, x0, y0, x1, y1, s, P, R, vertical) {
    const pw = Math.round(26 * s);
    if (vertical) for (let x = x0; x < x1; x += pw) { g.fillStyle = mix(P.plank, R() < 0.5 ? '#ffffff' : '#000000', R() * 0.05); g.fillRect(x, y0, pw - 1.5 * s, y1 - y0); g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(x + pw - 1.5 * s, y0, 1.5 * s, y1 - y0); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y0, 1.2 * s, y1 - y0); for (let q = 0; q < 3; q++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(x + R() * pw, y0, 1, y1 - y0); } }
  }

  /* ================================================================================================================
     SCENE: THE FOREST CABIN
     ================================================================================================================ */
  const CABIN_PAL = {
    night: { dark: true, sky0: '#15223a', sky1: '#33405f', sky2: '#7a5f77', moon: '#f3ecd2', ridge: '#2a3a52', pine: ['#2d4b4e', '#21393d', '#14292c'], mist: '#8796b5', meadow0: '#2e4a3c', meadow1: '#1c3127',
      creek: '#4d6f95', creekHi: '#a9c4e8', farm: '#3b3236', farmLit: '#ffc977', bark: '#3a2a20', needles: '#1a2f2a',
      log: '#7a5132', logHi: '#9b6a43', logDk: '#47301d', frame: '#a8733f', frameHi: '#d39a5c', frameDk: '#6b4422', curtain: '#b0413a', curtain2: '#f1e2cf', sill: '#8a5a33', sillHi: '#b07a47', wood: '#6e4a2e', woodHi: '#8f6340', woodDk: '#3e2717', fog: '#dce4ee' },
    day: { dark: false, sky0: '#a3bcc8', sky1: '#d0dcd9', sky2: '#f3e6c8', moon: null, ridge: '#94aaa8', pine: ['#6f9180', '#557b68', '#3d6352'], mist: '#ffffff', meadow0: '#a3bd85', meadow1: '#7e9f66',
      creek: '#7db2d1', creekHi: '#eaf6ff', farm: '#8a6a5a', farmLit: '#e9dcc4', bark: '#5b4434', needles: '#2f5544',
      log: '#a8784d', logHi: '#c8945f', logDk: '#6f4a2a', frame: '#c8915a', frameHi: '#e8b67c', frameDk: '#8a5c30', curtain: '#c64b40', curtain2: '#f6ead8', sill: '#a8743f', sillHi: '#cf9658', wood: '#8f6440', woodHi: '#b07e52', woodDk: '#5e3f25', fog: '#f0f4f6' }
  };
  function planCabin(L, R) {
    const W = L.win.w, H = L.win.h, s = L.s, m = L.m, rows = [[], [], []];
    [[0.53, 9, 0.12], [0.6, 15, 0.2], [0.69, 24, 0.32]].forEach(([b, gap, hh], ri) => { for (let x = -m - 10; x < W + m + 10; x += (gap + R() * gap) * s) rows[ri].push({ x, b: H * (b + (R() - 0.5) * 0.02), h: H * hh * (0.75 + R() * 0.5) }); });
    return { rows, meadow: H * 0.67, deer: { x: W * 0.32, y: H * 0.86 }, trunk: W * 0.86, branchY: H * 0.31, owl: { x: W * 0.7, y: H * 0.3 }, squirrel: { x: W * 0.84, y: H * 0.66 },
      creek: [[W * 0.04, H * 0.66], [W * 0.2, H * 0.74], [W * 0.1, H * 0.86], [W * 0.24, H + m]], farm: { x: W * 0.36, y: H * 0.62 }, fox: { x: W * 0.64, y: H * 0.78 }, moon: { x: W * 0.17, y: H * 0.16 } };
  }
  function outCabin(g, L, P, R, PL) {
    const W = L.win.w, H = L.win.h, m = L.m, s = L.s, D = P.dark;
    g.fillStyle = lin(g, 0, -m, 0, H * 0.64, [[0, P.sky0], [0.62, P.sky1], [1, P.sky2]]); g.fillRect(-m, -m, W + 2 * m, H + 2 * m);
    const mo = PL.moon;
    if (D) {
      for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.25 + R() * 0.6) + ')'; g.beginPath(); g.arc(-m + R() * (W + 2 * m), -m + R() * H * 0.46, (R() < 0.1 ? 1.4 : 0.8) * s, 0, TAU); g.fill(); }
      g.fillStyle = rad(g, mo.x, mo.y, 0, 64 * s, [[0, 'rgba(255,248,220,0.35)'], [1, 'rgba(255,248,220,0)']]); g.fillRect(mo.x - 64 * s, mo.y - 64 * s, 128 * s, 128 * s);
      g.fillStyle = P.moon; g.beginPath(); g.arc(mo.x, mo.y, 13 * s, 0, TAU); g.fill(); g.fillStyle = P.sky0; g.beginPath(); g.arc(mo.x + 6 * s, mo.y - 4 * s, 11.5 * s, 0, TAU); g.fill();
    } else { g.fillStyle = rad(g, mo.x, mo.y + 20 * s, 0, 130 * s, [[0, 'rgba(255,250,232,0.9)'], [0.22, 'rgba(255,240,205,0.45)'], [1, 'rgba(255,240,205,0)']]); g.fillRect(mo.x - 130 * s, mo.y - 110 * s, 260 * s, 260 * s); }
    g.fillStyle = P.ridge; g.beginPath(); g.moveTo(-m, H * 0.56); for (let x = -m; x <= W + m; x += 8 * s) g.lineTo(x, H * (0.43 + 0.05 * Math.sin(x / W * 5 + 1) + 0.025 * Math.sin(x / W * 13))); g.lineTo(W + m, H * 0.62); g.lineTo(-m, H * 0.62); g.closePath(); g.fill();
    PL.rows.forEach((row, ri) => {
      g.fillStyle = lin(g, 0, H * (0.41 + ri * 0.08), 0, H * (0.57 + ri * 0.08), [[0, hexA(P.mist, 0)], [0.6, hexA(P.mist, D ? 0.12 : 0.38)], [1, hexA(P.mist, 0)]]); g.fillRect(-m, H * (0.41 + ri * 0.08), W + 2 * m, H * 0.16);
      if (ri === 2) { g.fillStyle = lin(g, 0, PL.meadow - 4, 0, H + m, [[0, P.meadow0], [1, P.meadow1]]); g.fillRect(-m, PL.meadow - 2 * s, W + 2 * m, H + m - PL.meadow); }
      row.forEach(t => pineTree(g, t.x, t.b, t.h, P.pine[ri], ri === 2 ? hexA('#ffffff', D ? 0.04 : 0.09) : null));
    });
    g.fillStyle = lin(g, 0, PL.meadow, 0, H + m, [[0, hexA(P.meadow0, 0.85)], [1, P.meadow1]]); g.fillRect(-m, H * 0.71, W + 2 * m, H + m - H * 0.71);
    g.strokeStyle = hexA(dk(P.meadow1, 0.25), 0.5); g.lineWidth = 1 * s;
    for (let i = 0; i < W * 0.9; i++) { const x = -m + R() * (W + 2 * m), y = H * 0.7 + R() * H * 0.32, l = (3 + R() * 5) * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3 * s, y - l); g.stroke(); }
    if (!D) for (let i = 0; i < 40; i++) { g.fillStyle = ['#fff7e0', '#ffe28a', '#f5b6c6'][i % 3]; g.beginPath(); g.arc(-m + R() * (W + 2 * m), H * 0.74 + R() * H * 0.26, 1.4 * s, 0, TAU); g.fill(); }
    const c = PL.creek;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const creekPath = () => { g.beginPath(); g.moveTo(c[0][0], c[0][1]); g.bezierCurveTo(c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]); };
    creekPath(); g.strokeStyle = dk(P.meadow1, 0.3); g.lineWidth = 30 * s; g.stroke();
    creekPath(); g.strokeStyle = P.creek; g.lineWidth = 22 * s; g.stroke();
    creekPath(); g.strokeStyle = hexA(P.creekHi, 0.35); g.lineWidth = 3 * s; g.setLineDash([10 * s, 14 * s]); g.stroke(); g.setLineDash([]);
    const fm = PL.farm;
    g.fillStyle = P.farm; g.fillRect(fm.x - 14 * s, fm.y - 12 * s, 28 * s, 12 * s);
    g.fillStyle = dk(P.farm, 0.25); g.beginPath(); g.moveTo(fm.x - 17 * s, fm.y - 11 * s); g.lineTo(fm.x, fm.y - 22 * s); g.lineTo(fm.x + 17 * s, fm.y - 11 * s); g.closePath(); g.fill();
    g.fillRect(fm.x + 7 * s, fm.y - 24 * s, 3.5 * s, 8 * s);
    g.fillStyle = P.farmLit; g.fillRect(fm.x - 9 * s, fm.y - 8 * s, 5 * s, 4.5 * s); g.fillRect(fm.x + 3 * s, fm.y - 8 * s, 5 * s, 4.5 * s);
    if (D) { g.fillStyle = rad(g, fm.x, fm.y - 6 * s, 0, 22 * s, [[0, hexA(P.farmLit, 0.35)], [1, hexA(P.farmLit, 0)]]); g.fillRect(fm.x - 22 * s, fm.y - 28 * s, 44 * s, 44 * s); }
    g.strokeStyle = dk(P.farm, 0.2); g.lineWidth = 1 * s; g.beginPath(); for (let x = fm.x + 18 * s; x < fm.x + 60 * s; x += 6 * s) { g.moveTo(x, fm.y); g.lineTo(x, fm.y - 5 * s); } g.moveTo(fm.x + 18 * s, fm.y - 3.5 * s); g.lineTo(fm.x + 60 * s, fm.y - 3.5 * s); g.stroke();
    // the near pine on the right: trunk, a branch for the owl, needle clusters
    const tx = PL.trunk;
    g.fillStyle = P.bark; g.fillRect(tx - 14 * s, -m, 32 * s, H + 2 * m);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.2 * s; for (let i = 0; i < 26; i++) { const bx = tx - 12 * s + R() * 28 * s, by = -m + R() * (H + m); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (R() - 0.5) * 3 * s, by + (14 + R() * 20) * s); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(tx - 14 * s, -m, 5 * s, H + 2 * m);
    g.strokeStyle = P.bark; g.lineCap = 'round'; g.lineWidth = 9 * s; g.beginPath(); g.moveTo(tx - 6 * s, PL.branchY + 8 * s); g.quadraticCurveTo(W * 0.72, PL.branchY + 6 * s, W * 0.57, PL.branchY - 4 * s); g.stroke();
    g.lineWidth = 4 * s; g.beginPath(); g.moveTo(W * 0.64, PL.branchY + 3 * s); g.lineTo(W * 0.59, PL.branchY - 16 * s); g.stroke();
    const clusters = [[W * 0.59, PL.branchY - 14 * s, 22], [W * 0.56, PL.branchY - 2 * s, 18], [tx - 4 * s, -6 * s, 46], [tx - 30 * s, 20 * s, 34], [tx + 10 * s, H * 0.5, 26], [tx - 24 * s, H * 0.17, 24]];
    clusters.forEach(([x, y, r]) => { for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? P.needles : dk(P.needles, 0.2); ell(g, x + (R() - 0.5) * r * s, y + (R() - 0.5) * r * 0.5 * s, r * 0.55 * s, r * 0.28 * s, (R() - 0.5) * 0.6); g.fill(); } });
    grain(g, -m, -m, W + 2 * m, H + 2 * m, R, Math.round(W * H / 90), 'rgba(255,255,255,0.05)', 1.2);
  }
  function glassCabin(g, L, P, R) {
    const W = L.win.w, H = L.win.h, s = L.s;
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) { g.fillStyle = rad(g, cx, cy, 0, W * 0.38, [[0, hexA(P.fog, 0.3)], [1, hexA(P.fog, 0)]]); g.fillRect(cx - W * 0.4, cy - W * 0.4, W * 0.8, W * 0.8); }
    g.fillStyle = lin(g, 0, H * 0.7, 0, H, [[0, hexA(P.fog, 0)], [1, hexA(P.fog, 0.25)]]); g.fillRect(0, H * 0.7, W, H * 0.3);
    for (let i = 0; i < Math.round(W * H / 4000); i++) { const y = H * (0.75 + R() * 0.25), x = R() * W; waterDrop(g, x, y, (0.6 + R() * 1.4) * s, 0.5); }
  }
  function roomCabin(g, L, P, R) {
    const { w, h, win, s, sillY, tab, phone } = L, D = P.dark;
    const lh = Math.round(24 * s);
    for (let y = -lh / 2, i = 0; y < tab.y + lh; y += lh, i++) {
      g.fillStyle = lin(g, 0, y, 0, y + lh, [[0, P.logHi], [0.45, P.log], [1, P.logDk]]); g.fillRect(0, y, w, lh);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y + lh - 2.2 * s, w, 2.2 * s);
      g.fillStyle = 'rgba(232,220,196,0.22)'; g.fillRect(0, y + lh - 3.6 * s, w, 1.3 * s);
      g.strokeStyle = 'rgba(40,20,8,0.16)'; g.lineWidth = 1; for (let q = 0; q < 2; q++) { const gy = y + lh * (0.3 + q * 0.3); g.beginPath(); for (let x = 0; x <= w; x += 14) { const py = gy + Math.sin(x * 0.02 + i + q) * 1.4 * s; if (x) g.lineTo(x, py); else g.moveTo(x, py); } g.stroke(); }
      for (let k = 0; k < w / 150; k++) { const kx = R() * w; g.fillStyle = 'rgba(40,20,8,0.28)'; ell(g, kx, y + lh * 0.5, 4.5 * s, 2.6 * s); g.fill(); g.strokeStyle = 'rgba(40,20,8,0.18)'; ell(g, kx, y + lh * 0.5, 8 * s, 4.6 * s); g.stroke(); }
    }
    g.fillStyle = rad(g, win.x + win.w * 0.5, sillY, 10, Math.max(w, h) * 0.8, D ? [[0, 'rgba(255,170,90,0.16)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(8,4,12,0.55)']] : [[0, 'rgba(255,250,235,0.18)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(30,24,20,0.25)']]);
    g.fillRect(0, 0, w, tab.y);
    const ft = Math.round(16 * s);
    frameBox(g, L, P, ft, s);
    const mx = Math.round(win.x + win.w / 2), my = Math.round(win.y + win.h * 0.47);
    bar(g, mx - 4 * s, win.y, 8 * s, win.h, P, s); bar(g, win.x, my - 4 * s, win.w, 8 * s, P, s);
    g.fillStyle = dk(P.frame, 0.4); g.fillRect(win.x - ft - 30 * s, win.y - ft - 16 * s, win.w + 2 * ft + 60 * s, 5 * s);
    g.beginPath(); g.arc(win.x - ft - 30 * s, win.y - ft - 13.5 * s, 6 * s, 0, TAU); g.arc(win.x + win.w + ft + 30 * s, win.y - ft - 13.5 * s, 6 * s, 0, TAU); g.fill();
    const cw = Math.min(54 * s, win.w * 0.15), cin = phone ? 10 * s : 30 * s;
    curtain(g, win.x - ft - cin, win.y - ft - 12 * s, sillY - 6 * s, cw, 'l', P, s, R);
    curtain(g, win.x + win.w + ft + cin, win.y - ft - 12 * s, sillY - 6 * s, cw, 'r', P, s, R);
    sillBoard(g, L, P, s, ft);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, tab.y - 5 * s, w, 5 * s);
    woodTop(g, 0, tab.y, w, h - tab.y, P, R, s);
    g.fillStyle = lin(g, 0, tab.y, 0, tab.y + 70 * s, [[0, D ? 'rgba(160,180,230,0.08)' : 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(win.x, tab.y, win.w, 70 * s);
    const st = L.still;
    if (phone) shelf(g, st.x - 6, st.y + st.size - 6, st.size + 16, s, P);
    else {
      shelf(g, st.x - 10, st.y + st.size - 6, st.size + 30, s, P);
      shelfDecor(g, 22 * s, win.x - ft - 46 * s, h * 0.45, s, P, R, 'jars');
      shelfDecor(g, 22 * s, win.x - ft - 46 * s, h * 0.45 + 74 * s, s, P, R, 'cups');
      const fx = 40 * s; // stacked firewood by the left wall
      for (let r = 0; r < 4; r++) for (let k = 0; k < 5 - r; k++) { const lx = fx + k * 22 * s + r * 11 * s, ly = tab.y - 14 * s - r * 19 * s; g.fillStyle = '#7a5434'; g.beginPath(); g.arc(lx, ly, 10 * s, 0, TAU); g.fill(); g.strokeStyle = '#c99a62'; g.lineWidth = 1 * s; g.beginPath(); g.arc(lx, ly, 6 * s, 0, TAU); g.arc(lx, ly, 3 * s, 0, TAU); g.stroke(); }
    }
    grain(g, 0, 0, w, h, R, Math.round(w * h / 60), 'rgba(0,0,0,0.05)', 1.2);
  }

  RN.owl = (g, it, T) => {
    const s = T.s * 1.05, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    const turn = life ? Math.sin(t * 0.55) * life : 0, blink = life ? (Math.sin(t * 1.3) > 0.95 ? 0.15 : 1) : 0;
    g.fillStyle = c('#c9a24a'); g.fillRect(x - 6 * s, y - 2 * s, 4 * s, 3.5 * s); g.fillRect(x + 2 * s, y - 2 * s, 4 * s, 3.5 * s);
    g.fillStyle = c('#7b6650'); ell(g, x, y - 15 * s, 12.5 * s, 15 * s); g.fill();
    g.fillStyle = c('#dccbab'); ell(g, x, y - 11 * s, 8 * s, 10 * s); g.fill();
    g.strokeStyle = c('#8a7458', 0.8); g.lineWidth = 1 * s; for (let i = 0; i < 6; i++) { const vx = x - 4 * s + (i % 3) * 4 * s, vy = y - 16 * s + Math.floor(i / 3) * 6 * s; g.beginPath(); g.moveTo(vx - 1.5 * s, vy); g.lineTo(vx, vy + 1.6 * s); g.lineTo(vx + 1.5 * s, vy); g.stroke(); }
    g.fillStyle = c('#5e4b39'); ell(g, x - 11 * s, y - 14 * s, 4.6 * s, 11 * s, 0.15); g.fill(); ell(g, x + 11 * s, y - 14 * s, 4.6 * s, 11 * s, -0.15); g.fill();
    g.save(); g.translate(x, y - 33 * s); g.rotate(turn * 0.12);
    g.fillStyle = c('#7b6650'); ell(g, 0, 0, 13 * s, 11 * s); g.fill();
    g.beginPath(); g.moveTo(-11 * s, -5 * s); g.lineTo(-9 * s, -15 * s); g.lineTo(-5 * s, -8 * s); g.closePath(); g.fill(); g.beginPath(); g.moveTo(11 * s, -5 * s); g.lineTo(9 * s, -15 * s); g.lineTo(5 * s, -8 * s); g.closePath(); g.fill();
    const fx = turn * 3.5 * s;
    g.fillStyle = c('#e6d7b8'); g.beginPath(); g.arc(-5.5 * s + fx, 0, 5.6 * s, 0, TAU); g.arc(5.5 * s + fx, 0, 5.6 * s, 0, TAU); g.fill();
    if (life > 0.05) { for (const ex of [-5.5, 5.5]) { g.fillStyle = c('#f2c12e'); ell(g, ex * s + fx, 0, 3.4 * s, 3.4 * s * blink); g.fill(); g.fillStyle = '#1a120c'; ell(g, ex * s + fx, 0, 1.7 * s, 1.7 * s * blink); g.fill(); } }
    else { g.strokeStyle = c('#4a3a2a'); g.lineWidth = 1.3 * s; for (const ex of [-5.5, 5.5]) { g.beginPath(); g.arc(ex * s, -0.5 * s, 3 * s, 0.3, Math.PI - 0.3); g.stroke(); } }
    g.fillStyle = c('#c9a24a'); g.beginPath(); g.moveTo(fx - 2 * s, 3 * s); g.lineTo(fx + 2 * s, 3 * s); g.lineTo(fx, 7 * s); g.closePath(); g.fill();
    g.restore();
  };
  RN.deer = (g, it, T) => {
    const s = T.s * 1.05, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    const up = life ? eOut(Math.min(1, life * 1.4)) : 0, flick = life ? Math.max(0, Math.sin(t * 2.2) - 0.82) * 4 : 0;
    g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, x + 1 * s, y + 0.5 * s, 18 * s, 2.5 * s); g.fill();
    g.strokeStyle = c('#6b4a33'); g.lineWidth = 2.2 * s; g.lineCap = 'round';
    for (const lx of [-10, -6, 8, 12]) { g.beginPath(); g.moveTo(x + lx * s, y - 14 * s); g.lineTo(x + (lx + (lx > 0 ? 0.5 : -0.5)) * s, y); g.stroke(); }
    g.fillStyle = c('#a8744a'); ell(g, x + 1 * s, y - 18 * s, 15 * s, 7.6 * s); g.fill();
    g.fillStyle = c('#c9915e', 0.7); ell(g, x - 1 * s, y - 21 * s, 11 * s, 3 * s); g.fill();
    g.fillStyle = c('#f4e6cc'); ell(g, x - 13.5 * s, y - 19 * s, 2.6 * s, 3.4 * s); g.fill();
    const hx = x + lerp(22, 17, up) * s, hy = y - lerp(6, 37, up) * s;
    g.strokeStyle = c('#a8744a'); g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x + 10 * s, y - 21 * s); g.lineTo(hx - 2 * s, hy + 3 * s); g.stroke();
    g.save(); g.translate(hx, hy); g.rotate(lerp(1.15, 0.25, up));
    g.fillStyle = c('#a8744a'); ell(g, 0, 0, 6.5 * s, 4.2 * s); g.fill();
    g.fillStyle = c('#3a2a20'); g.beginPath(); g.arc(5.5 * s, 0.6 * s, 1.4 * s, 0, TAU); g.fill();
    g.fillStyle = c('#a8744a'); g.save(); g.translate(-3 * s, -3 * s); g.rotate(-1.9 - flick * 0.4); ell(g, 0, -4 * s, 2.2 * s, 5 * s); g.fill(); g.restore();
    g.save(); g.translate(-1 * s, -3.5 * s); g.rotate(-1.2); ell(g, 0, -4 * s, 2.2 * s, 5 * s); g.fill(); g.restore();
    if (up > 0.5) { g.fillStyle = '#1a120c'; g.beginPath(); g.arc(0.6 * s, -1 * s, 1 * s, 0, TAU); g.fill(); }
    g.restore();
  };
  RN.squirrel = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    const flick = life ? Math.sin(t * 7) * 0.22 * Math.max(0, Math.sin(t * 0.9)) : 0, nib = life ? Math.max(0, Math.sin(t * 9)) * 1.2 * s : 0;
    g.save(); g.translate(x + 4 * s, y + 8 * s); g.rotate(flick);
    g.fillStyle = c('#b4643a'); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(16 * s, 4 * s, 20 * s, -18 * s, 6 * s, -26 * s); g.bezierCurveTo(18 * s, -32 * s, 26 * s, -8 * s, 15 * s, 7 * s); g.closePath(); g.fill();
    g.fillStyle = c('#d4875a', 0.6); g.beginPath(); g.moveTo(4 * s, 0); g.bezierCurveTo(14 * s, 0, 16 * s, -14 * s, 9 * s, -21 * s); g.lineTo(11 * s, -18 * s); g.bezierCurveTo(14 * s, -12 * s, 12 * s, -3 * s, 5 * s, 1 * s); g.fill();
    g.restore();
    g.fillStyle = c('#c0703f'); ell(g, x, y, 6.5 * s, 10 * s); g.fill();
    g.fillStyle = c('#f0d9b8'); ell(g, x - 2 * s, y + 1 * s, 3 * s, 7 * s); g.fill();
    g.fillStyle = c('#c0703f'); g.beginPath(); g.arc(x - 1 * s, y - 11 * s, 5.2 * s, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x + 1 * s, y - 15 * s); g.lineTo(x + 3 * s, y - 20 * s); g.lineTo(x + 4 * s, y - 14 * s); g.fill();
    g.fillStyle = '#1a120c'; g.beginPath(); g.arc(x - 3 * s, y - 12 * s, 1 * s, 0, TAU); g.fill();
    g.fillStyle = c('#c0703f'); ell(g, x - 5 * s, y - 4 * s + nib * 0.5, 2.4 * s, 3 * s); g.fill();
    if (life > 0.05) { g.fillStyle = c('#7a5530'); ell(g, x - 6 * s, y - 7 * s + nib, 2.2 * s, 2.6 * s); g.fill(); }
  };
  RN.candle = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 2 * s, y + 1 * s, 14 * s, 3.5 * s); g.fill();
    if (life > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = life * (0.55 + 0.08 * Math.sin(t * 13)); g.drawImage(T.spr.warm, x - 60 * s, y - 92 * s, 120 * s, 120 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    g.fillStyle = c('#efe2c4'); rr(g, x - 7 * s, y - 22 * s, 14 * s, 22 * s, 2 * s); g.fill();
    g.fillStyle = c('#d8c6a2'); g.fillRect(x + 3 * s, y - 22 * s, 4 * s, 22 * s);
    g.strokeStyle = c('#3a2a20'); g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(x, y - 22 * s); g.lineTo(x, y - 26 * s); g.stroke();
    if (life > 0.02) {
      const fl = 1 + 0.12 * Math.sin(t * 17) + 0.08 * Math.sin(t * 7.7), sway = Math.sin(t * 2.3) * 1.2 * s;
      g.fillStyle = 'rgba(255,190,80,' + (0.9 * life) + ')'; g.beginPath(); g.moveTo(x, y - 25 * s); g.quadraticCurveTo(x + 5 * s, y - 31 * s, x + sway, y - 25 * s - 14 * s * fl * life); g.quadraticCurveTo(x - 5 * s, y - 31 * s, x, y - 25 * s); g.fill();
      g.fillStyle = 'rgba(255,248,220,' + life + ')'; ell(g, x + sway * 0.3, y - 29 * s, 2 * s, 3.6 * s * fl); g.fill();
    }
    g.fillStyle = c('#dfeef2', 0.2); rr(g, x - 11 * s, y - 34 * s, 22 * s, 34 * s, 5 * s); g.fill();
    g.strokeStyle = c('#ffffff', 0.38); g.lineWidth = 1 * s; rr(g, x - 11 * s, y - 34 * s, 22 * s, 34 * s, 5 * s); g.stroke();
    g.fillStyle = c('#ffffff', 0.35); g.fillRect(x - 8 * s, y - 30 * s, 2 * s, 24 * s);
  };
  RN.web = (g, it, T) => { // a spider web in the window's top corner; dew sparkles once noticed
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y, R0 = 50 * s, sp = 7;
    g.strokeStyle = c('#ffffff', 0.32 + life * 0.25); g.lineWidth = 0.8 * s;
    const ang = (i) => Math.PI + i / (sp - 1) * Math.PI / 2;
    g.beginPath(); for (let i = 0; i < sp; i++) { g.moveTo(x, y); g.lineTo(x + Math.cos(ang(i)) * R0, y + Math.sin(ang(i)) * R0); } g.stroke();
    g.beginPath(); for (let r = 10 * s; r < R0; r += 6 * s) { for (let i = 0; i < sp; i++) { const a = ang(i), rr2 = r + Math.sin(i * 1.7 + r) * 0.8 * s, px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2; if (i) g.lineTo(px, py); else g.moveTo(px, py); } } g.stroke();
    if (life > 0.02) {
      for (let i = 0; i < 14; i++) { const a = ang(i % sp) + 0.05, r = (12 + (i * 7) % 36) * s, tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); g.fillStyle = 'rgba(235,248,255,' + (0.85 * life * tw) + ')'; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6 * s, 0, TAU); g.fill(); }
      const dy = (16 + Math.sin(t * 0.9) * 10) * s * life;
      g.strokeStyle = c('#ffffff', 0.5); g.beginPath(); g.moveTo(x - 24 * s, y - 30 * s); g.lineTo(x - 24 * s, y - 30 * s + dy); g.stroke();
      g.fillStyle = c('#2a2220'); g.beginPath(); g.arc(x - 24 * s, y - 28 * s + dy, 2.4 * s, 0, TAU); g.fill();
    }
  };
  RN.mug = (g, it, T) => {
    const s = T.s, c = T.c, x = it.x, y = it.y, b = it.china || '#2f6f8f';
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 3 * s, y + 2 * s, 22 * s, 6 * s); g.fill();
    g.strokeStyle = c(b); g.lineWidth = 4.5 * s; g.beginPath(); g.arc(x + 17 * s, y - 16 * s, 8 * s, -1.3, 1.3); g.stroke();
    g.fillStyle = c(b); rr(g, x - 16 * s, y - 33 * s, 32 * s, 33 * s, 5 * s); g.fill();
    g.fillStyle = c(dk(b, 0.2), 0.7); g.fillRect(x + 5 * s, y - 32 * s, 11 * s, 31 * s);
    g.fillStyle = c('#ffffff', 0.85); for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x - 10 * s + i * 4 * s, y - 20 * s + (i % 2) * 6 * s, 1.4 * s, 0, TAU); g.fill(); }
    g.fillStyle = c(lt(b, 0.3)); ell(g, x, y - 33 * s, 16 * s, 4 * s); g.fill();
    g.fillStyle = c('#6a3c22'); ell(g, x, y - 32.5 * s, 13.5 * s, 3 * s); g.fill();
    g.fillStyle = c('#fbf6ee'); for (const [mx, my] of [[-5, -34], [2, -35], [6, -33]]) { rr(g, x + mx * s - 3 * s, y + my * s - 2 * s, 6 * s, 4.4 * s, 1.4 * s); g.fill(); }
  };
  RN.blanket = (g, it, T) => { // a folded plaid wool blanket
    const s = T.s, c = T.c, x = it.x, y = it.y, b = it.tex.base, a2 = it.tex.alt;
    g.fillStyle = 'rgba(0,0,0,0.24)'; ell(g, x + 3 * s, y + 14 * s, 54 * s, 9 * s); g.fill();
    const layer = (ly, k) => {
      g.save(); rr(g, x - 48 * s, ly, 96 * s, 18 * s, 7 * s); g.fillStyle = c(dk(b, k)); g.fill(); g.clip();
      g.fillStyle = c(a2, 0.5); for (let xx = x - 48 * s; xx < x + 48 * s; xx += 16 * s) g.fillRect(xx, ly, 5 * s, 18 * s);
      g.fillStyle = c('#f3e6c8', 0.35); for (let xx = x - 44 * s; xx < x + 48 * s; xx += 16 * s) g.fillRect(xx, ly, 1.6 * s, 18 * s);
      g.fillStyle = c(a2, 0.4); g.fillRect(x - 48 * s, ly + 6 * s, 96 * s, 5 * s);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 48 * s, ly + 1 * s, 96 * s, 3 * s);
      g.restore();
    };
    layer(y - 4 * s, 0.14); layer(y - 20 * s, 0.06); layer(y - 36 * s, 0);
    g.strokeStyle = c(dk(b, 0.2)); g.lineWidth = 1.2 * s; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(x - 46 * s + i * 4 * s, y + 14 * s); g.lineTo(x - 47 * s + i * 4 * s, y + 21 * s); g.stroke(); }
  };
  RN.stone = (g, it, T) => {
    const s = T.s, c = T.c, x = it.x, y = it.y, b = it.tex.base;
    g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, x + 3 * s, y + 2 * s, 30 * s, 7 * s); g.fill();
    g.fillStyle = lin(g, x, y - 26 * s, x, y + 2 * s, [[0, c(lt(b, 0.25))], [1, c(dk(b, 0.25))]]); ell(g, x, y - 11 * s, 28 * s, 14 * s, -0.08); g.fill();
    g.fillStyle = c(dk(b, 0.3), 0.6); for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(x - 20 * s + (i * 37 % 40) * s, y - 18 * s + (i * 13 % 16) * s, 0.9 * s, 0, TAU); g.fill(); }
    g.fillStyle = c('#ffffff', 0.4); ell(g, x - 9 * s, y - 18 * s, 10 * s, 3.4 * s, -0.2); g.fill();
  };
  RN.birch = (g, it, T) => { // a birch log, bark side up
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, x + 4 * s, y + 3 * s, 46 * s, 7 * s); g.fill();
    g.fillStyle = c('#ece6da'); rr(g, x - 44 * s, y - 24 * s, 80 * s, 24 * s, 10 * s); g.fill();
    g.fillStyle = c('#2c2622'); for (let i = 0; i < 9; i++) { const bx = x - 38 * s + i * 8.6 * s; g.fillRect(bx, y - 22 * s + (i % 3) * 6 * s, (5 + (i % 2) * 4) * s, 2 * s); }
    g.fillStyle = c('#c9c0b0', 0.6); g.fillRect(x - 40 * s, y - 6 * s, 74 * s, 4 * s);
    g.fillStyle = c('#d9b07a'); ell(g, x + 36 * s, y - 12 * s, 7 * s, 12 * s); g.fill();
    g.strokeStyle = c('#a67a46'); g.lineWidth = 1 * s; for (let r = 2; r < 7; r += 2) { ell(g, x + 36 * s, y - 12 * s, r * s, r * 1.7 * s); g.stroke(); }
  };
  RN.pinejar = (g, it, T) => {
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 2 * s, y + 2 * s, 14 * s, 4 * s); g.fill();
    g.strokeStyle = c('#5a3f2a'); g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y - 18 * s); g.quadraticCurveTo(x - 4 * s, y - 38 * s, x - 10 * s, y - 52 * s); g.moveTo(x - 4 * s, y - 34 * s); g.lineTo(x + 10 * s, y - 46 * s); g.stroke();
    g.strokeStyle = c('#3f7a4a'); g.lineWidth = 1.3 * s;
    for (let i = 0; i < 22; i++) { const u = i / 22, px = lerp(x, x - 10 * s, u), py = lerp(y - 22 * s, y - 52 * s, u); g.beginPath(); g.moveTo(px, py); g.lineTo(px - 6 * s, py - 3 * s); g.moveTo(px, py); g.lineTo(px + 6 * s, py - 3 * s); g.stroke(); }
    for (let i = 0; i < 10; i++) { const u = i / 10, px = lerp(x - 4 * s, x + 10 * s, u), py = lerp(y - 34 * s, y - 46 * s, u); g.beginPath(); g.moveTo(px, py); g.lineTo(px - 4 * s, py - 5 * s); g.moveTo(px, py); g.lineTo(px + 3 * s, py - 6 * s); g.stroke(); }
    g.fillStyle = c('#cfe4ec', 0.35); rr(g, x - 10 * s, y - 24 * s, 20 * s, 24 * s, 4 * s); g.fill();
    g.fillStyle = c('#9fc6d6', 0.45); rr(g, x - 9 * s, y - 14 * s, 18 * s, 13 * s, 3 * s); g.fill();
    g.fillStyle = c('#ffffff', 0.45); g.fillRect(x - 7 * s, y - 21 * s, 1.8 * s, 18 * s);
  };
  RN.stove = (g, it, T) => { // a little wood stove with a kettle; the pipe climbs the wall
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = c('#26272b'); g.fillRect(x + 10 * s, -10, 12 * s, y - 64 * s + 10);
    g.fillStyle = c('#3a3b40'); for (let py = y - 90 * s; py > 0; py -= 70 * s) g.fillRect(x + 9 * s, py, 14 * s, 3 * s);
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, x, y + 2 * s, 38 * s, 6 * s); g.fill();
    g.fillStyle = c('#1e1f23'); g.fillRect(x - 26 * s, y - 10 * s, 5 * s, 10 * s); g.fillRect(x + 21 * s, y - 10 * s, 5 * s, 10 * s);
    g.fillStyle = c('#2f3035'); rr(g, x - 30 * s, y - 62 * s, 60 * s, 54 * s, 5 * s); g.fill();
    g.fillStyle = c('#45464c'); g.fillRect(x - 33 * s, y - 66 * s, 66 * s, 6 * s);
    g.fillStyle = c('#1a1b1e'); rr(g, x - 20 * s, y - 46 * s, 40 * s, 30 * s, 4 * s); g.fill();
    g.strokeStyle = c('#5a5b62'); g.lineWidth = 1.4 * s; rr(g, x - 20 * s, y - 46 * s, 40 * s, 30 * s, 4 * s); g.stroke();
    g.fillStyle = c('#9a9ba3'); g.fillRect(x + 14 * s, y - 34 * s, 6 * s, 3 * s);
    const k = it.kettle || '#c94a3a';
    g.fillStyle = c(k); g.beginPath(); g.moveTo(x - 20 * s, y - 66 * s); g.bezierCurveTo(x - 22 * s, y - 86 * s, x + 2 * s, y - 92 * s, x + 4 * s, y - 92 * s); g.bezierCurveTo(x + 6 * s, y - 92 * s, x + 26 * s, y - 86 * s, x + 18 * s, y - 66 * s); g.closePath(); g.fill();
    g.strokeStyle = c(k); g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x - 18 * s, y - 76 * s); g.quadraticCurveTo(x - 30 * s, y - 84 * s, x - 31 * s, y - 92 * s); g.stroke();
    g.strokeStyle = c('#2a2a2e'); g.lineWidth = 2.2 * s; g.beginPath(); g.arc(x, y - 92 * s, 10 * s, Math.PI, TAU); g.stroke();
    g.fillStyle = c('#ffffff', 0.35); g.fillRect(x - 12 * s, y - 84 * s, 3 * s, 12 * s);
  };
  RN.kettleLive = (g, it, T) => {
    const s = T.s, x = it.x, y = it.y, t = T.t, act = T.act, c = T.c;
    const fl = 0.72 + 0.28 * Math.sin(t * 11) * Math.sin(t * 7.3);
    g.fillStyle = c('#ff8a36', 0.85 * fl); rr(g, x - 17 * s, y - 43 * s, 34 * s, 24 * s, 3 * s); g.fill();
    g.fillStyle = c('#ffd86e', 0.75 * fl); ell(g, x, y - 24 * s, 12 * s, 4.5 * s); g.fill();
    for (let i = 0; i < 3; i++) { const fx = x - 9 * s + i * 9 * s, fh = (8 + 6 * Math.sin(t * 9 + i * 2)) * s; g.fillStyle = c('#ffcf5a', 0.8); g.beginPath(); g.moveTo(fx - 4 * s, y - 22 * s); g.quadraticCurveTo(fx, y - 22 * s - fh * 1.4, fx + 4 * s, y - 22 * s); g.fill(); }
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * fl * Math.max(0.3, T.k); g.drawImage(T.spr.warm, x - 50 * s, y - 70 * s, 100 * s, 100 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (act > 0.05) { const j = Math.sin(t * 40) * 1.4 * s * act; g.fillStyle = c('#2a2a2e'); ell(g, x + 4 * s, y - 92 * s + j, 6 * s, 2 * s); g.fill(); steam(g, x - 31 * s, y - 94 * s, s * 0.8, t, act, c, 2); }
  };
  RN.chime = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, act = T.act, x = it.x, y = it.y, metal = it.metal || '#b9c4cc';
    g.strokeStyle = c('#3a2a20'); g.lineWidth = 1 * s; g.beginPath(); g.moveTo(x, y - 16 * s); g.lineTo(x, y); g.stroke();
    g.fillStyle = c(it.top || '#8a5a33'); ell(g, x, y, 14 * s, 3.6 * s); g.fill();
    for (let i = 0; i < 5; i++) {
      const tx = x - 10 * s + i * 5 * s, len = (18 + (i % 3) * 7 + i * 2) * s, sw = Math.sin(t * 9 + i * 1.3) * 0.14 * act + Math.sin(t * 1.2 + i) * 0.025;
      g.save(); g.translate(tx, y + 2 * s); g.rotate(sw);
      g.strokeStyle = c('#3a2a20', 0.6); g.lineWidth = 0.7 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 4 * s); g.stroke();
      g.fillStyle = c(metal); rr(g, -1.7 * s, 4 * s, 3.4 * s, len, 1.4 * s); g.fill();
      g.fillStyle = c('#ffffff', 0.5); g.fillRect(-1 * s, 5 * s, 0.9 * s, len - 2 * s);
      g.restore();
    }
    const cs = Math.sin(t * 7) * 0.3 * act + Math.sin(t * 1.1) * 0.03;
    g.save(); g.translate(x, y + 2 * s); g.rotate(cs);
    g.strokeStyle = c('#3a2a20', 0.6); g.lineWidth = 0.7 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 46 * s); g.stroke();
    g.fillStyle = c(it.top || '#8a5a33'); g.beginPath(); g.arc(0, 25 * s, 3.4 * s, 0, TAU); g.fill();
    g.fillStyle = c(it.sail || '#d9b27a'); rr(g, -5 * s, 46 * s, 10 * s, 14 * s, 2 * s); g.fill();
    g.restore();
  };
  RN.dogFar = (g, it, T) => {
    const s = T.s * 0.62, c = T.c, t = T.t, act = T.act, x = it.x, y = it.y;
    const bob = act > 0.1 ? Math.abs(Math.sin(t * 14)) * 1.6 * s : 0;
    g.fillStyle = c('#3a2e2a'); ell(g, x, y - 7 * s, 8 * s, 4.5 * s); g.fill();
    g.fillRect(x - 7 * s, y - 5 * s, 2 * s, 5 * s); g.fillRect(x + 5 * s, y - 5 * s, 2 * s, 5 * s);
    g.beginPath(); g.arc(x + 8 * s, y - 11 * s - bob, 3.6 * s, 0, TAU); g.fill(); ell(g, x + 11 * s, y - 10 * s - bob, 2.6 * s, 1.8 * s); g.fill();
    g.lineWidth = 1.6 * s; g.strokeStyle = c('#3a2e2a'); g.beginPath(); g.moveTo(x - 7 * s, y - 8 * s); g.lineTo(x - 11 * s, y - 13 * s + Math.sin(t * 9) * 2 * s); g.stroke();
    if (act > 0.1) { g.strokeStyle = c('#fff4d6', act * 0.8); g.lineWidth = 1.2 * s; for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(x + 14 * s, y - 11 * s - bob, (5 + i * 4) * s, -0.6, 0.6); g.stroke(); } }
  };
  RN.fox = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y, sw = life ? Math.sin(t * 1.8) * 0.3 : 0;
    g.save(); g.translate(x - 8 * s, y - 3 * s); g.rotate(sw); g.fillStyle = c('#d9762f'); ell(g, -6 * s, 0, 10 * s, 4 * s, 0.3); g.fill(); g.fillStyle = c('#fbf2e4'); ell(g, -14 * s, 2 * s, 3 * s, 2.4 * s, 0.3); g.fill(); g.restore();
    g.fillStyle = c('#d9762f'); ell(g, x, y - 8 * s, 7 * s, 9 * s); g.fill();
    g.fillStyle = c('#fbf2e4'); ell(g, x + 1 * s, y - 6 * s, 3.5 * s, 6 * s); g.fill();
    g.fillStyle = c('#d9762f'); g.beginPath(); g.arc(x + 1 * s, y - 19 * s, 5 * s, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x - 3 * s, y - 22 * s); g.lineTo(x - 3 * s, y - 29 * s); g.lineTo(x + 1 * s, y - 23 * s); g.moveTo(x + 2 * s, y - 23 * s); g.lineTo(x + 6 * s, y - 29 * s); g.lineTo(x + 6 * s, y - 21 * s); g.fill();
    g.fillStyle = c('#fbf2e4'); ell(g, x + 3 * s, y - 17 * s, 3 * s, 2 * s); g.fill();
    g.fillStyle = '#1a120c'; g.beginPath(); g.arc(x + 6 * s, y - 17 * s, 0.9 * s, 0, TAU); g.arc(x, y - 20 * s, 0.8 * s, 0, TAU); g.arc(x + 3.5 * s, y - 20 * s, 0.8 * s, 0, TAU); g.fill();
  };
  RN.mushroom = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    g.fillStyle = c('#efe6d6'); rr(g, x - 3 * s, y - 12 * s, 6 * s, 12 * s, 2 * s); g.fill();
    g.fillStyle = c('#d23d34'); g.beginPath(); g.arc(x, y - 12 * s, 10 * s, Math.PI, TAU); g.closePath(); g.fill();
    g.fillStyle = c('#ffffff'); for (const [dx, dy] of [[-5, -15], [1, -19], [5, -14], [-1, -14]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, 1.4 * s, 0, TAU); g.fill(); }
    const lx = x - 6 * s + (life ? ((t * 3) % 12) * s : 0);
    g.fillStyle = c('#c8322f'); g.beginPath(); g.arc(lx, y - 1.5 * s, 2.2 * s, 0, TAU); g.fill(); g.fillStyle = '#1a120c'; g.beginPath(); g.arc(lx + 1.8 * s, y - 1.5 * s, 1 * s, 0, TAU); g.fill();
  };

  function cabinLive(g, E) { // creek shimmer, drifting mist, night fireflies
    const { L, PL, t, s, D } = E, W = L.win, c = PL.creek, act = E.IT.creek ? E.IT.creek.act : 0;
    const bez = (u) => { const v = 1 - u; return { x: v * v * v * c[0][0] + 3 * v * v * u * c[1][0] + 3 * v * u * u * c[2][0] + u * u * u * c[3][0], y: v * v * v * c[0][1] + 3 * v * v * u * c[1][1] + 3 * v * u * u * c[2][1] + u * u * u * c[3][1] }; };
    for (let i = 0; i < 9; i++) { const u = ((t * 0.08 + i / 9) % 1), p = bez(u), a = (0.25 + 0.5 * act) * Math.sin(u * Math.PI); g.fillStyle = 'rgba(235,246,255,' + a + ')'; ell(g, W.x + p.x + Math.sin(t * 2 + i) * 4 * s, W.y + p.y, 4 * s, 1.2 * s); g.fill(); }
    const my = W.y + W.h * 0.55 + Math.sin(t * 0.15) * 6 * s;
    g.fillStyle = D ? 'rgba(160,175,210,0.07)' : 'rgba(255,255,255,0.14)'; ell(g, W.x + W.w * 0.5 + Math.sin(t * 0.07) * 40 * s, my, W.w * 0.6, 14 * s); g.fill();
    if (D) for (let i = 0; i < 7; i++) { const fx = W.x + ((i * 97.3 + t * 9 * (i % 2 ? 1 : -1)) % W.w + W.w) % W.w, fy = W.y + W.h * (0.72 + 0.2 * Math.sin(t * 0.4 + i * 1.7)), a = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 2); g.fillStyle = 'rgba(225,255,150,' + (0.7 * a) + ')'; g.beginPath(); g.arc(fx, fy, 1.6 * s, 0, TAU); g.fill(); }
  }

  const CABIN = {
    id: 'cabin', title: 'the forest cabin', where: 'cabin', key: ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5'], bass: ['D2', 'B1', 'G1', 'A1'], rain: false,
    pal: CABIN_PAL, plan: planCabin, out: outCabin, glass: glassCabin, room: roomCabin, live: cabinLive,
    items: [
      { id: 'owl', role: 'see', type: 'owl', name: 'a sleepy owl', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.owl.x, y: L.win.y + PL.owl.y }), r: 30, cy: -22, sound: 'hoot',
        q: ['An owl! It’s been watching you this whole time.', 'An owl. Judging everyone. Quietly.', 'Owl. Awake now. Watching.'] },
      { id: 'mug', role: 'see', type: 'cupSteam', bake: 'mug', name: 'cocoa steam', zone: 'room', at: AT(0.3, 0.3), r: 34, cy: -18, china: '#2f6f8f', sound: 'sip',
        q: ['Cocoa steam, curling up. Still warm.', 'Cocoa. With marshmallows. Obviously.', 'Steam. Warm cocoa. Real.'] },
      { id: 'deer', role: 'see', type: 'deer', name: 'a deer', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.deer.x, y: L.win.y + PL.deer.y }), r: 30, cy: -18, sound: 'rustle',
        q: ['A deer. Look how gently it moves.', 'A deer. Very calm. Takes notes from no one.', 'Deer. Calm. Watch it.'] },
      { id: 'candle', role: 'see', type: 'candle', name: 'a candle flame', zone: 'room', at: AS(0.16), r: 28, cy: -18, sound: 'flame',
        q: ['A little flame. Watch it dance.', 'Candle lit. Instant cabin vibes.', 'Flame. Flickering. Look.'] },
      { id: 'web', role: 'see', type: 'web', name: 'a dewy web', zone: 'room', at: (L) => ({ x: Math.round(L.win.x + L.win.w / 2) - 4 * L.s, y: Math.round(L.win.y + L.win.h * 0.47) - 4 * L.s }), r: 34, cx: -18, cy: -18, sound: 'glint',
        q: ['A web, full of tiny dewdrops.', 'Spider’s been busy. Great work, honestly.', 'Web. Dew. Tiny details.'] },
      { id: 'squirrel', role: 'see', type: 'squirrel', name: 'a squirrel', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.squirrel.x, y: L.win.y + PL.squirrel.y }), r: 26, cy: -4, sound: 'chitter',
        q: ['A squirrel, snacking. Good plan.', 'Squirrel. Snack break. Relatable.', 'Squirrel. Eating. Present.'] },
      { id: 'fox', role: 'secret', secret: 0, type: 'fox', name: 'a shy fox', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.fox.x, y: L.win.y + PL.fox.y }), r: 24, cy: -12 },
      { id: 'mush', role: 'secret', secret: 1, type: 'mushroom', name: 'a ladybird mushroom', zone: 'room', at: AS(0.6), r: 22, cy: -10 },
      { id: 'creek', role: 'hear', pos: 'left', type: 'none', name: 'the creek', zone: 'out', at: (L, PL) => ({ x: L.win.x + L.win.w * 0.16, y: L.win.y + L.win.h * 0.8 }), r: 64, cy: 0, sound: 'creek' },
      { id: 'stove', role: 'hear', pos: 'right', type: 'kettleLive', bake: 'stove', name: 'the kettle', zone: 'room', at: AR(), r: 48, cy: -60, sound: 'kettle', kettle: '#c94a3a' },
      { id: 'chime', role: 'hear', pos: 'above', type: 'chime', name: 'the wind chime', zone: 'room', at: AW(0.36, 0.0), r: 40, cy: 26, sound: 'chime' },
      { id: 'dog', role: 'hear', pos: 'far', type: 'dogFar', name: 'a dog, far away', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.farm.x + 34 * L.s, y: L.win.y + PL.farm.y }), r: 44, cy: -6, sound: 'dog' },
      { id: 'blanket', role: 'touch', kind: 'plaid', type: 'none', bake: 'blanket', name: 'a wool blanket', zone: 'room', at: AT(0.12, 0.4), r: 46, cy: -12, words: ['soft', 'woolly', 'warm'], tex: { base: '#3f6b5a', alt: '#c9493d' } },
      { id: 'stone', role: 'touch', kind: 'stone', type: 'none', bake: 'stone', name: 'a river stone', zone: 'room', at: AT(0.74, 0.44), r: 34, cy: -11, words: ['smooth', 'cool', 'heavy'], tex: { base: '#8d929a' } },
      { id: 'birch', role: 'touch', kind: 'bark', type: 'none', bake: 'birch', name: 'birch bark', zone: 'room', at: AT(0.5, 0.52), atD: AT(0.6, 0.4), r: 44, cy: -12, words: ['rough', 'papery', 'dry'], tex: { base: '#e7e1d4' } },
      { id: 'pine', role: 'smell', type: 'none', bake: 'pinejar', name: 'pine needles', zone: 'room', at: AT(0.52, 0.24), dy: -40, col: '#86c88a', motif: 'needle', words: ['fresh', 'green', 'sharp'] },
      { id: 'smoke', role: 'smell', type: 'none', name: 'woodsmoke', zone: 'room', at: (L) => { const p = AR()(L); return { x: p.x, y: p.y }; }, dy: -100, col: '#cdb8a2', motif: 'smoke', words: ['smoky', 'toasty', 'warm'] },
      { id: 'books', role: 'decor', type: 'none', bake: 'books', at: AT(0.1, 0.86) }
    ]
  };
  RN.books = (g, it, T) => {
    const s = T.s, c = T.c, x = it.x, y = it.y, cols = ['#8a3b32', '#3b5f7a', '#c99a3f'];
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 4 * s, y + 4 * s, 50 * s, 8 * s); g.fill();
    cols.forEach((col, i) => { const by = y - i * 11 * s, bw = (92 - i * 8) * s; g.fillStyle = c(col); rr(g, x - bw / 2 + i * 4 * s, by - 11 * s, bw, 11 * s, 2 * s); g.fill(); g.fillStyle = c('#f1e8d6'); g.fillRect(x + bw / 2 + i * 4 * s - 5 * s, by - 9.5 * s, 3 * s, 8 * s); g.fillStyle = c('#ffffff', 0.18); g.fillRect(x - bw / 2 + i * 4 * s, by - 10 * s, bw, 2 * s); });
  };

  /* ================================================================================================================
     SCENE: THE BEACH HUT
     ================================================================================================================ */
  const BEACH_PAL = {
    day: { dark: false, sky0: '#56a9dc', sky1: '#9cd3ef', sky2: '#eaf3e6', sun: '#fff6d8', cloud: '#ffffff', sea0: '#257fae', sea1: '#4fb2cc', sea2: '#8dd3d2', foam: '#ffffff', sand0: '#f1dcae', sand1: '#dcbf89', grass: '#9aa860', post: '#8a6a4a',
      plank: '#f2eee5', frame: '#6fb2c9', frameHi: '#a8d6e4', frameDk: '#4d8ca3', shutter: '#78b9cf', sill: '#d9ccb4', sillHi: '#f4ecdc', wood: '#c9a77e', woodHi: '#e0c299', woodDk: '#9c7c56', fog: '#ffffff', glow: 'rgba(255,255,240,0.18)' },
    night: { dark: true, sky0: '#272a5a', sky1: '#a3567a', sky2: '#f0a35c', sun: '#ffd28a', cloud: '#f2a28a', sea0: '#263868', sea1: '#3e4d7e', sea2: '#d98a68', foam: '#ffe2c8', sand0: '#b98e6e', sand1: '#866250', grass: '#5c5a3c', post: '#4a3628',
      plank: '#d3c6cf', frame: '#4f8aa3', frameHi: '#7fb3c7', frameDk: '#33657a', shutter: '#5d97ad', sill: '#c2b4a8', sillHi: '#ddd0c4', wood: '#9a7a5c', woodHi: '#b8946f', woodDk: '#6e5240', fog: '#f4e6dc', glow: 'rgba(255,190,140,0.16)' }
  };
  function planBeach(L) {
    const W = L.win.w, H = L.win.h;
    return { horizon: H * 0.42, shore: H * 0.7, sun: { x: W * 0.7, y: H * 0.2 }, post: { x: W * 0.74, y: H * 0.8, top: H * 0.6 }, boat: { x: W * 0.28, y: H * 0.43 }, kite: { x: W * 0.6, y: H * 0.15 }, crab: { x: W * 0.38, y: H * 0.92 },
      dolphin: { x: W * 0.14, y: H * 0.52 }, bottle: { x: W * 0.88, y: H * 0.94 }, ship: { x: W * 0.88, y: H * 0.415 }, waves: { x: W * 0.16, y: H * 0.68 } };
  }
  function outBeach(g, L, P, R, PL) {
    const W = L.win.w, H = L.win.h, m = L.m, s = L.s, D = P.dark, hz = PL.horizon;
    g.fillStyle = lin(g, 0, -m, 0, hz, [[0, P.sky0], [0.65, P.sky1], [1, P.sky2]]); g.fillRect(-m, -m, W + 2 * m, hz + m + 1);
    const su = PL.sun;
    g.fillStyle = rad(g, su.x, D ? hz : su.y, 0, 150 * s, [[0, hexA(P.sun, D ? 0.8 : 0.85)], [0.18, hexA(P.sun, 0.45)], [1, hexA(P.sun, 0)]]); g.fillRect(su.x - 150 * s, (D ? hz : su.y) - 150 * s, 300 * s, 300 * s);
    g.fillStyle = P.sun; g.beginPath(); g.arc(su.x, D ? hz - 4 * s : su.y, (D ? 22 : 15) * s, D ? Math.PI : 0, TAU); g.fill();
    for (let i = 0; i < 5; i++) { // soft cumulus: lit tops, shaded flat bases
      const cx = -m + R() * (W + 2 * m), cy = hz * (0.18 + R() * 0.5), cw = (40 + R() * 46) * s;
      const puffs = []; for (let k = 0; k < 7; k++) { const u = (k / 6 - 0.5) * 2; puffs.push({ x: cx + u * cw * 0.62 + (R() - 0.5) * 6 * s, y: cy - (1 - u * u) * cw * 0.32 - R() * 4 * s, r: cw * (0.22 + (1 - Math.abs(u)) * 0.2 + R() * 0.05) }); }
      g.save(); g.beginPath(); g.rect(cx - cw * 2, cy - cw * 2, cw * 4, cw * 2 + 2 * s); g.clip();
      puffs.forEach(p => { g.fillStyle = lin(g, 0, p.y - p.r, 0, p.y + p.r, [[0, hexA(D ? '#ffd2b0' : '#ffffff', D ? 0.75 : 0.95)], [1, hexA(D ? '#9a5a7a' : '#c9dbe8', D ? 0.65 : 0.9)]]); g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); });
      g.restore();
    }
    g.fillStyle = lin(g, 0, hz, 0, PL.shore, [[0, P.sea0], [0.6, P.sea1], [1, P.sea2]]); g.fillRect(-m, hz, W + 2 * m, PL.shore - hz + 2);
    g.fillStyle = hexA('#ffffff', 0.25); g.fillRect(-m, hz, W + 2 * m, 1.5 * s);
    g.fillStyle = hexA(D ? '#ffcf8a' : '#ffffff', D ? 0.35 : 0.3); for (let i = 0; i < 26; i++) { const yy = hz + 4 * s + R() * (PL.shore - hz - 10 * s), ww = (6 + R() * 18) * s * (1 + (yy - hz) / H); g.fillRect(su.x - ww / 2 + (R() - 0.5) * 60 * s * (1 + (yy - hz) / (H * 0.3)), yy, ww, 1.3 * s); }
    g.fillStyle = lin(g, 0, PL.shore, 0, H + m, [[0, P.sand0], [1, P.sand1]]); g.fillRect(-m, PL.shore, W + 2 * m, H + m - PL.shore);
    g.fillStyle = hexA(dk(P.sand0, 0.15), 0.6); g.fillRect(-m, PL.shore, W + 2 * m, 5 * s);
    for (let i = 0; i < 160; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(80,50,20,0.15)'; g.fillRect(-m + R() * (W + 2 * m), PL.shore + R() * (H - PL.shore + m), 1.2 * s, 1.2 * s); }
    g.strokeStyle = P.grass; g.lineWidth = 1.4 * s; for (const gx of [W * 0.06, W * 0.5, W * 0.96]) for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(gx + k * 2 * s, H * 0.98); g.quadraticCurveTo(gx + k * 2 * s + (k - 3) * 3 * s, H * 0.9, gx + (k - 3) * 6 * s, H * (0.84 + (k % 3) * 0.02)); g.stroke(); }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(90,60,30,0.18)'; ell(g, W * 0.2 + i * 14 * s, H * 0.8 + (i % 2) * 6 * s + i * 4 * s, 3 * s, 1.8 * s, 0.4); g.fill(); }
    const po = PL.post; g.fillStyle = P.post; g.fillRect(po.x - 4 * s, po.top, 8 * s, po.y - po.top); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(po.x + 1 * s, po.top, 3 * s, po.y - po.top); g.fillStyle = lt(P.post, 0.2); g.fillRect(po.x - 5 * s, po.top - 2 * s, 10 * s, 3 * s);
    grain(g, -m, -m, W + 2 * m, H + 2 * m, R, Math.round(W * H / 90), 'rgba(255,255,255,0.05)', 1.2);
  }
  function glassBeach(g, L, P, R) {
    const W = L.win.w, H = L.win.h, s = L.s;
    for (const [cx, cy] of [[0, H], [W, H], [W, 0]]) { g.fillStyle = rad(g, cx, cy, 0, W * 0.35, [[0, hexA(P.fog, 0.24)], [1, hexA(P.fog, 0)]]); g.fillRect(cx - W * 0.4, cy - W * 0.4, W * 0.8, W * 0.8); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.15 + R() * 0.2) + ')'; g.beginPath(); g.arc(R() * W, H * (0.6 + R() * 0.4), (0.6 + R() * 1.2) * s, 0, TAU); g.fill(); }
  }
  function roomBeach(g, L, P, R) {
    const { w, h, win, s, sillY, tab, phone } = L, D = P.dark;
    plankWall(g, 0, 0, w, tab.y + 4, s, P, R, true);
    g.fillStyle = rad(g, win.x + win.w * 0.5, win.y + win.h * 0.5, 10, Math.max(w, h) * 0.8, [[0, P.glow], [0.6, 'rgba(0,0,0,0)'], [1, D ? 'rgba(20,10,30,0.45)' : 'rgba(60,70,90,0.18)']]); g.fillRect(0, 0, w, tab.y);
    const ft = Math.round(14 * s);
    const sw = Math.min(win.w * 0.24, 86 * s);
    for (const side of [-1, 1]) { // open shutters folded against the wall
      const x0 = side < 0 ? win.x - ft - 6 * s - sw : win.x + win.w + ft + 6 * s;
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x0 + 4 * s, win.y - ft + 6 * s, sw, win.h + ft);
      g.fillStyle = P.shutter; g.fillRect(x0, win.y - ft, sw, win.h + ft);
      g.fillStyle = dk(P.shutter, 0.2); for (let y = win.y - ft + 10 * s; y < win.y + win.h - 6 * s; y += 9 * s) { g.fillRect(x0 + 6 * s, y, sw - 12 * s, 3 * s); g.fillStyle = lt(P.shutter, 0.25); g.fillRect(x0 + 6 * s, y + 3 * s, sw - 12 * s, 1 * s); g.fillStyle = dk(P.shutter, 0.2); }
      g.fillStyle = lt(P.shutter, 0.2); g.fillRect(x0, win.y - ft, sw, 5 * s); g.fillRect(x0, win.y + win.h - 5 * s, sw, 5 * s);
    }
    frameBox(g, L, P, ft, s);
    bar(g, Math.round(win.x + win.w / 2) - 3 * s, win.y, 6 * s, win.h, P, s);
    g.strokeStyle = '#c9a77e'; g.lineWidth = 3 * s; g.setLineDash([5 * s, 3 * s]); g.strokeRect(win.x - ft - 3 * s, win.y - ft - 3 * s, win.w + 2 * ft + 6 * s, win.h + ft + 3 * s); g.setLineDash([]);
    sillBoard(g, L, P, s, ft);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, tab.y - 5 * s, w, 5 * s);
    woodTop(g, 0, tab.y, w, h - tab.y, P, R, s);
    g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 30; i++) g.fillRect(R() * w, tab.y + R() * (h - tab.y), 2 * s, 1 * s);
    const st = L.still;
    if (phone) shelf(g, st.x - 6, st.y + st.size - 6, st.size + 16, s, P);
    else {
      shelf(g, st.x - 10, st.y + st.size - 6, st.size + 30, s, P);
      const lx = 60 * s, ly = h * 0.5; // a life ring on the left wall
      g.strokeStyle = '#e8e2d6'; g.lineWidth = 16 * s; g.beginPath(); g.arc(lx + 50 * s, ly, 34 * s, 0, TAU); g.stroke();
      g.strokeStyle = '#d6453b'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(lx + 50 * s, ly, 34 * s, k * Math.PI / 2, k * Math.PI / 2 + 0.5); g.stroke(); }
      g.strokeStyle = '#c9a77e'; g.lineWidth = 2 * s; g.beginPath(); g.arc(lx + 50 * s, ly, 43 * s, 0, TAU); g.stroke();
      const rx = win.x + win.w + ft + sw + 40 * s; // a surfboard leaning on the right wall
      if (rx < w - 40 * s) { g.save(); g.translate(rx + 30 * s, tab.y - 10 * s); g.rotate(-0.08); g.fillStyle = '#f2c14e'; ell(g, 0, -140 * s, 26 * s, 140 * s); g.fill(); g.fillStyle = '#e0573f'; g.fillRect(-26 * s, -150 * s, 52 * s, 8 * s); g.fillStyle = 'rgba(255,255,255,0.3)'; ell(g, -8 * s, -170 * s, 5 * s, 90 * s); g.fill(); g.restore(); }
    }
    grain(g, 0, 0, w, h, R, Math.round(w * h / 70), 'rgba(0,0,0,0.04)', 1.2);
  }
  RN.gull = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    let flap = 0, lift = 0; if (life) { const ph = (t * 0.25) % 1; if (ph < 0.18) { flap = Math.sin(ph / 0.18 * Math.PI * 4); lift = Math.sin(ph / 0.18 * Math.PI) * 6 * s; } }
    g.save(); g.translate(x, y - lift);
    g.strokeStyle = c('#e0a33a'); g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(-2 * s, 0); g.lineTo(-2 * s, -5 * s); g.moveTo(2 * s, 0); g.lineTo(2 * s, -5 * s); g.stroke();
    g.fillStyle = c('#f6f5f2'); ell(g, 0, -10 * s, 10 * s, 6 * s, -0.1); g.fill();
    g.fillStyle = c('#8a94a0'); g.save(); g.translate(-1 * s, -12 * s); g.rotate(-0.15 - flap * 0.7); ell(g, -4 * s, 0, 9 * s, 3.4 * s, -0.1); g.fill(); g.fillStyle = c('#2a2a2e'); ell(g, -11 * s, 0.5 * s, 3 * s, 1.6 * s); g.fill(); g.restore();
    g.fillStyle = c('#f6f5f2'); g.beginPath(); g.arc(8 * s, -16 * s, 4.4 * s, 0, TAU); g.fill();
    g.fillStyle = c('#f0b93a'); g.beginPath(); g.moveTo(11.5 * s, -16 * s); g.lineTo(17 * s, -15 * s); g.lineTo(11.5 * s, -14 * s); g.closePath(); g.fill();
    g.fillStyle = '#1a1a1e'; g.beginPath(); g.arc(9 * s, -17 * s, 0.9 * s, 0, TAU); g.fill();
    g.restore();
  };
  RN.sailboat = (g, it, T) => {
    const s = T.s * 0.85, c = T.c, t = T.t, life = T.life, x = it.x + (life ? Math.sin(t * 0.12) * 18 * s : 0), y = it.y, tilt = Math.sin(t * 0.9) * 0.05 * (0.3 + life);
    g.save(); g.translate(x, y); g.rotate(tilt);
    g.fillStyle = c('#8a4b3a'); g.beginPath(); g.moveTo(-14 * s, -3 * s); g.lineTo(14 * s, -3 * s); g.lineTo(9 * s, 2 * s); g.lineTo(-10 * s, 2 * s); g.closePath(); g.fill();
    g.strokeStyle = c('#3a2a20'); g.lineWidth = 1 * s; g.beginPath(); g.moveTo(0, -3 * s); g.lineTo(0, -30 * s); g.stroke();
    g.fillStyle = c('#f7f3ea'); g.beginPath(); g.moveTo(1 * s, -29 * s); g.lineTo(13 * s, -5 * s); g.lineTo(1 * s, -5 * s); g.closePath(); g.fill();
    g.fillStyle = c(it.sail || '#e0573f'); g.beginPath(); g.moveTo(-1 * s, -26 * s); g.lineTo(-11 * s, -5 * s); g.lineTo(-1 * s, -5 * s); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 12 * s, y + 3 * s, 24 * s, 1.2 * s);
  };
  RN.crab = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x + (life ? Math.sin(t * 1.4) * 14 * s : 0), y = it.y, leg = life ? Math.sin(t * 22) * 1.5 * s : 0, wave = life ? Math.sin(t * 3) * 0.4 : 0;
    g.strokeStyle = c('#c8452f'); g.lineWidth = 1.4 * s; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * 6 * s, y - 3 * s + i * 2 * s); g.lineTo(x + d * 12 * s, y + (i % 2 ? leg : -leg) + 1 * s); g.stroke(); }
    g.fillStyle = c('#e05a3f'); ell(g, x, y - 4 * s, 9 * s, 5.5 * s); g.fill();
    for (const d of [-1, 1]) { g.save(); g.translate(x + d * 8 * s, y - 8 * s); g.rotate(d * (0.4 + (d > 0 ? wave : 0))); g.fillStyle = c('#e05a3f'); ell(g, d * 3 * s, -3 * s, 3.6 * s, 2.6 * s); g.fill(); g.restore(); }
    g.strokeStyle = c('#3a2a20'); g.lineWidth = 1 * s; g.beginPath(); g.moveTo(x - 2.5 * s, y - 8 * s); g.lineTo(x - 3 * s, y - 12 * s); g.moveTo(x + 2.5 * s, y - 8 * s); g.lineTo(x + 3 * s, y - 12 * s); g.stroke();
    g.fillStyle = '#1a120c'; g.beginPath(); g.arc(x - 3 * s, y - 12.5 * s, 1.2 * s, 0, TAU); g.arc(x + 3 * s, y - 12.5 * s, 1.2 * s, 0, TAU); g.fill();
  };
  RN.kite = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, loop = life ? Math.sin(t * 0.8) : 0, x = it.x + loop * 16 * s, y = it.y + Math.cos(t * 0.8) * 8 * s * life, rot = loop * 0.4 * life + Math.sin(t * 1.4) * 0.05;
    g.strokeStyle = c('#ffffff', 0.55); g.lineWidth = 0.8 * s; g.beginPath(); g.moveTo(x, y + 14 * s); g.quadraticCurveTo(x + 10 * s, y + 70 * s, x - 30 * s, y + 160 * s); g.stroke();
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = c('#e0573f'); g.beginPath(); g.moveTo(0, -16 * s); g.lineTo(11 * s, 0); g.lineTo(0, 14 * s); g.lineTo(-11 * s, 0); g.closePath(); g.fill();
    g.fillStyle = c('#f2c14e'); g.beginPath(); g.moveTo(0, -16 * s); g.lineTo(11 * s, 0); g.lineTo(0, 0); g.closePath(); g.fill(); g.beginPath(); g.moveTo(0, 14 * s); g.lineTo(-11 * s, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    g.strokeStyle = c('#3a2a20', 0.5); g.lineWidth = 0.8 * s; g.beginPath(); g.moveTo(0, -16 * s); g.lineTo(0, 14 * s); g.moveTo(-11 * s, 0); g.lineTo(11 * s, 0); g.stroke();
    g.strokeStyle = c('#3a8fd0'); g.lineWidth = 1.4 * s; g.beginPath(); g.moveTo(0, 14 * s); for (let k = 1; k < 6; k++) g.lineTo(Math.sin(t * 4 + k) * 4 * s, 14 * s + k * 6 * s); g.stroke();
    g.restore();
  };
  RN.hat = (g, it, T) => { // a straw sun hat on the sill; the breeze lifts its brim once noticed
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y, lift = (Math.sin(t * 1.7) * 0.5 + 0.5) * life;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 2 * s, y + 1 * s, 30 * s, 5 * s); g.fill();
    g.save(); g.translate(x, y - 4 * s); g.rotate(-0.04 - lift * 0.1);
    g.fillStyle = c('#e8cf8f'); ell(g, 0, 0, 31 * s, 7 * s + lift * 2 * s); g.fill();
    g.strokeStyle = c('#c9a85e', 0.65); g.lineWidth = 0.8 * s; for (let k = 1; k <= 3; k++) { ell(g, 0, 0, (16 + k * 4.5) * s, (3.4 + k * 1.1) * s); g.stroke(); }
    g.fillStyle = c('#dcc07a'); g.beginPath(); g.moveTo(-15 * s, -1 * s); g.bezierCurveTo(-15 * s, -20 * s, 15 * s, -20 * s, 15 * s, -1 * s); g.closePath(); g.fill();
    g.fillStyle = c(it.band || '#e0573f'); g.fillRect(-15 * s, -6 * s, 30 * s, 4.5 * s);
    g.fillStyle = c('#ffffff', 0.25); ell(g, -6 * s, -12 * s, 5 * s, 3 * s); g.fill();
    g.restore();
  };
  RN.shells = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, x, y + 1 * s, 30 * s, 3.5 * s); g.fill();
    g.fillStyle = c('#f2c9b4'); g.beginPath(); g.moveTo(x - 22 * s, y); g.lineTo(x - 10 * s, y); g.lineTo(x - 16 * s, y - 12 * s); g.closePath(); g.fill();
    g.strokeStyle = c('#d89a84'); g.lineWidth = 0.8 * s; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x - 16 * s, y - 12 * s); g.lineTo(x - 16 * s + k * 3 * s, y); g.stroke(); }
    g.fillStyle = c('#f4ead8'); g.beginPath(); g.moveTo(x - 4 * s, y); g.bezierCurveTo(x - 6 * s, y - 14 * s, x + 6 * s, y - 16 * s, x + 6 * s, y - 4 * s); g.lineTo(x + 2 * s, y); g.closePath(); g.fill();
    g.strokeStyle = c('#cdb490'); g.lineWidth = 0.9 * s; g.beginPath(); for (let a = 0; a < 9; a += 0.4) { const r = a * 0.9 * s; const px = x + 1 * s + Math.cos(a) * r * 0.6, py = y - 6 * s + Math.sin(a) * r * 0.6; if (a) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
    g.fillStyle = c('#e9895f'); g.save(); g.translate(x + 18 * s, y - 4 * s); g.rotate(Math.sin(t * 0.8) * 0.05 * life); g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = (k % 2 ? 3.5 : 9) * s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore();
    if (life > 0.02) for (let i = 0; i < 4; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.9); g.fillStyle = 'rgba(255,255,255,' + (0.9 * tw * life) + ')'; g.beginPath(); g.arc(x - 18 * s + i * 12 * s, y - 8 * s - (i % 2) * 4 * s, 1.4 * s, 0, TAU); g.fill(); }
  };
  RN.dolphin = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    if (!life) { g.fillStyle = c('#5d7d99'); g.beginPath(); g.moveTo(x - 6 * s, y); g.quadraticCurveTo(x, y - 12 * s, x + 7 * s, y); g.closePath(); g.fill(); return; }
    const ph = (t * 0.3) % 1; if (ph > 0.3) { g.fillStyle = c('#5d7d99'); g.beginPath(); g.moveTo(x - 6 * s, y); g.quadraticCurveTo(x, y - 10 * s * (ph > 0.6 ? 1 : 0.4), x + 7 * s, y); g.closePath(); g.fill(); return; }
    const k = ph / 0.3, jx = x - 30 * s + k * 60 * s, jy = y - Math.sin(k * Math.PI) * 34 * s, ang = Math.cos(k * Math.PI) * -0.9;
    g.save(); g.translate(jx, jy); g.rotate(ang); g.fillStyle = c('#6f8faa'); ell(g, 0, 0, 16 * s, 5 * s); g.fill(); g.beginPath(); g.moveTo(-14 * s, 0); g.lineTo(-22 * s, -5 * s); g.lineTo(-22 * s, 5 * s); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-2 * s, -4 * s); g.lineTo(3 * s, -11 * s); g.lineTo(6 * s, -4 * s); g.fill(); g.fillStyle = c('#dfe8ef'); ell(g, 2 * s, 2 * s, 10 * s, 2 * s); g.fill(); g.restore();
  };
  RN.bottle = (g, it, T) => {
    const s = T.s, c = T.c, t = T.t, life = T.life, x = it.x, y = it.y;
    g.save(); g.translate(x, y); g.rotate(-0.4 + Math.sin(t * 2) * 0.03 * life);
    g.fillStyle = c('#7fbfa0', 0.75); rr(g, -12 * s, -5 * s, 20 * s, 10 * s, 4 * s); g.fill(); g.fillRect(8 * s, -2.5 * s, 7 * s, 5 * s);
    g.fillStyle = c('#8a5a33'); g.fillRect(15 * s, -2.5 * s, 3 * s, 5 * s);
    g.fillStyle = c('#f4ecd8'); g.fillRect(-8 * s, -2.5 * s, 12 * s, 5 * s);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-10 * s, -4 * s, 14 * s, 1.4 * s);
    g.restore();
  };
  RN.radio = (g, it, T) => { // a little vintage radio; its dial glows when it plays
    const s = T.s, c = T.c, x = it.x, y = it.y, act = T.act, t = T.t;
    g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, x + 2 * s, y + 2 * s, 34 * s, 6 * s); g.fill();
    g.fillStyle = c('#c9785a'); rr(g, x - 32 * s, y - 40 * s, 64 * s, 40 * s, 10 * s); g.fill();
    g.fillStyle = c('#f1e6d0'); rr(g, x - 26 * s, y - 34 * s, 30 * s, 28 * s, 4 * s); g.fill();
    g.strokeStyle = c('#c9785a', 0.5); g.lineWidth = 1.2 * s; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x - 24 * s, y - 30 * s + k * 5.5 * s); g.lineTo(x + 2 * s, y - 30 * s + k * 5.5 * s); g.stroke(); }
    g.fillStyle = c(act > 0.2 ? '#ffe9a8' : '#e8dcc0'); rr(g, x + 8 * s, y - 34 * s, 18 * s, 10 * s, 2 * s); g.fill();
    g.strokeStyle = c('#c0392b'); g.lineWidth = 1 * s; g.beginPath(); g.moveTo(x + 14 * s + Math.sin(t * 0.5) * 3 * s, y - 33 * s); g.lineTo(x + 14 * s + Math.sin(t * 0.5) * 3 * s, y - 25 * s); g.stroke();
    g.fillStyle = c('#5a3a2a'); g.beginPath(); g.arc(x + 12 * s, y - 14 * s, 4 * s, 0, TAU); g.arc(x + 22 * s, y - 14 * s, 4 * s, 0, TAU); g.fill();
    g.strokeStyle = c('#5a3a2a'); g.lineWidth = 1.6 * s; g.beginPath(); g.moveTo(x - 20 * s, y - 40 * s); g.lineTo(x - 28 * s, y - 62 * s); g.stroke();
    if (act > 0.15) { g.fillStyle = c('#3a2a20', act); for (let i = 0; i < 2; i++) { const nx = x - 36 * s - i * 12 * s + Math.sin(t * 2 + i) * 4 * s, ny = y - 46 * s - ((t * 30 + i * 20) % 30) * s; g.beginPath(); g.arc(nx, ny, 2.6 * s, 0, TAU); g.fill(); g.fillRect(nx + 2 * s, ny - 10 * s, 1.2 * s, 10 * s); } }
  };
  RN.towel = (g, it, T) => {
    const s = T.s, c = T.c, x = it.x, y = it.y, cols = [it.tex.base, '#f6f1e6', it.tex.alt];
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 3 * s, y + 12 * s, 50 * s, 8 * s); g.fill();
    for (let l = 0; l < 3; l++) { const ly = y - 4 * s - l * 15 * s; g.save(); rr(g, x - 46 * s + l * 2 * s, ly, 92 * s, 16 * s, 6 * s); g.clip(); for (let k = 0; k < 8; k++) { g.fillStyle = c(cols[k % 3]); g.fillRect(x - 46 * s + k * 12 * s, ly, 12 * s, 16 * s); } g.fillStyle = 'rgba(0,0,0,' + (0.12 - l * 0.04) + ')'; g.fillRect(x - 50 * s, ly, 100 * s, 16 * s); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x - 50 * s, ly + 1 * s, 100 * s, 3 * s); g.restore(); }
  };
  RN.rope = (g, it, T) => { // a coiled rope
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 3 * s, y + 2 * s, 34 * s, 8 * s); g.fill();
    for (let r = 30; r > 4; r -= 6.5) { g.strokeStyle = c('#b08a55'); g.lineWidth = 6 * s; ell(g, x, y - 8 * s, r * s, r * 0.38 * s); g.stroke(); g.strokeStyle = c('#7f5f34', 0.6); g.lineWidth = 1 * s; g.setLineDash([3 * s, 3 * s]); ell(g, x, y - 8 * s, r * s, r * 0.38 * s); g.stroke(); g.setLineDash([]); }
    g.strokeStyle = c('#b08a55'); g.lineWidth = 6 * s; g.beginPath(); g.moveTo(x + 28 * s, y - 6 * s); g.quadraticCurveTo(x + 40 * s, y - 2 * s, x + 44 * s, y + 6 * s); g.stroke();
  };
  RN.lotion = (g, it, T) => { // a sunscreen bottle (coconut)
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 2 * s, y + 2 * s, 14 * s, 4 * s); g.fill();
    g.fillStyle = c('#f2c14e'); rr(g, x - 11 * s, y - 40 * s, 22 * s, 40 * s, 6 * s); g.fill();
    g.fillStyle = c('#e0573f'); rr(g, x - 6 * s, y - 48 * s, 12 * s, 9 * s, 2 * s); g.fill();
    g.fillStyle = c('#fbf3e0'); rr(g, x - 8 * s, y - 30 * s, 16 * s, 16 * s, 3 * s); g.fill();
    g.fillStyle = c('#7a4a2a'); g.beginPath(); g.arc(x, y - 22 * s, 4.5 * s, 0, TAU); g.fill(); g.fillStyle = c('#ffffff'); g.beginPath(); g.arc(x, y - 22 * s, 2.6 * s, 0, TAU); g.fill();
    g.fillStyle = c('#ffffff', 0.35); g.fillRect(x - 8 * s, y - 37 * s, 2 * s, 30 * s);
  };
  RN.pebble = (g, it, T) => RN.stone(g, it, T);
  function beachLive(g, E) { // rolling foam, sun glitter, the far ship
    const { L, PL, t, s, D } = E, W = L.win, sh = W.y + PL.shore;
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.12 + i / 3) % 1), y = sh - 14 * s + ph * 22 * s, a = Math.sin(ph * Math.PI) * 0.75;
      g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = (2 + ph * 2) * s; g.beginPath();
      for (let x = W.x - 30; x <= W.x + W.w + 30; x += 10 * s) { const yy = y + Math.sin(x * 0.03 + t * 0.6 + i) * 2.5 * s; if (x === W.x - 30) g.moveTo(x, yy); else g.lineTo(x, yy); }
      g.stroke();
    }
    const act = E.IT.waves ? E.IT.waves.act : 0;
    if (act > 0.02) { g.fillStyle = 'rgba(255,255,255,' + (0.6 * act) + ')'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(W.x + W.w * 0.06 + (i * 23) % (W.w * 0.35), sh - 4 * s + Math.sin(t * 6 + i) * 4 * s, (2 + (i % 3)) * s, 0, TAU); g.fill(); } }
    const su = PL.sun; for (let i = 0; i < 10; i++) { const tw = Math.max(0, Math.sin(t * 2.4 + i * 2.1)); if (tw < 0.6) continue; g.fillStyle = 'rgba(255,255,240,' + ((tw - 0.6) * 2) + ')'; g.beginPath(); g.arc(W.x + su.x + Math.sin(i * 7.7) * 50 * s, W.y + PL.horizon + 8 * s + (i * 13 % 60) * s, 1.4 * s, 0, TAU); g.fill(); }
    const sp = PL.ship, sx = W.x + sp.x + Math.sin(t * 0.05) * 10 * s, sy = W.y + sp.y, sa = E.IT.horn ? E.IT.horn.act : 0;
    g.fillStyle = tintC(E, D ? '#2a2a3a' : '#5a6070'); g.fillRect(sx - 18 * s, sy - 4 * s, 36 * s, 4 * s); g.fillRect(sx - 6 * s, sy - 10 * s, 16 * s, 6 * s); g.fillRect(sx + 4 * s, sy - 15 * s, 3 * s, 5 * s);
    if (sa > 0.05) { g.fillStyle = 'rgba(240,240,250,' + (0.5 * sa) + ')'; g.beginPath(); g.arc(sx + 5.5 * s, sy - 18 * s - (1 - sa) * 8 * s, (3 + (1 - sa) * 4) * s, 0, TAU); g.fill(); }
  }
  function tintC(E, hex) { return E.tint(hex, E.warm); }

  const BEACH = {
    id: 'beach', title: 'the beach hut', where: 'beach hut', key: ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5'], bass: ['G2', 'E2', 'C2', 'D2'], rain: false,
    pal: BEACH_PAL, plan: planBeach, out: outBeach, glass: glassBeach, room: roomBeach, live: beachLive,
    items: [
      { id: 'gull', role: 'see', type: 'gull', name: 'a seagull', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.post.x, y: L.win.y + PL.post.top }), r: 28, cy: -12, sound: 'gull',
        q: ['A seagull, keeping watch over the beach.', 'Seagull. Definitely eyeing your snacks.', 'Gull. On guard. Look.'] },
      { id: 'boat', role: 'see', type: 'sailboat', name: 'a little sailboat', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.boat.x, y: L.win.y + PL.boat.y }), r: 30, cy: -14, sound: 'twirl',
        q: ['A little boat, taking its time.', 'Tiny boat. Big plans. Zero rush.', 'Boat. Slow. Watch it drift.'] },
      { id: 'crab', role: 'see', type: 'crab', name: 'a crab', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.crab.x, y: L.win.y + PL.crab.y }), r: 26, cy: -6, sound: 'chitter',
        q: ['A crab, doing its sideways thing.', 'Crab. Sideways. Unbothered.', 'Crab. Moving. Sideways.'] },
      { id: 'kite', role: 'see', type: 'kite', name: 'a kite', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.kite.x, y: L.win.y + PL.kite.y }), r: 28, cy: 0, sound: 'twirl',
        q: ['A kite, dancing on the breeze.', 'Someone’s kite is having the best day.', 'Kite. Up high. Look.'] },
      { id: 'hat', role: 'see', type: 'hat', name: 'a sun hat', zone: 'room', at: AS(0.74), r: 32, cy: -10, sound: 'leaf',
        q: ['A sun hat, swaying in the breeze.', 'Sun hat. Very holiday. Very you.', 'Hat. Swaying. Breeze.'] },
      { id: 'shells', role: 'see', type: 'shells', name: 'shells on the sill', zone: 'room', at: AS(0.24), r: 30, cy: -6, sound: 'glint',
        q: ['Shells, each one a different shape.', 'Shell collection. Some of them are smug.', 'Shells. All different. Look closer.'] },
      { id: 'dolphin', role: 'secret', secret: 0, type: 'dolphin', name: 'a dolphin', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.dolphin.x, y: L.win.y + PL.dolphin.y }), r: 26, cy: -4 },
      { id: 'bottle', role: 'secret', secret: 1, type: 'bottle', name: 'a message in a bottle', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.bottle.x, y: L.win.y + PL.bottle.y }), r: 24, cy: 0 },
      { id: 'waves', role: 'hear', pos: 'left', type: 'none', name: 'the waves', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.waves.x, y: L.win.y + PL.waves.y }), r: 66, cy: 0, sound: 'waves' },
      { id: 'radio', role: 'hear', pos: 'right', type: 'radio', name: 'the little radio', zone: 'room', at: AR(), r: 44, cy: -20, sound: 'radio' },
      { id: 'shellchime', role: 'hear', pos: 'above', type: 'chime', name: 'the shell chime', zone: 'room', at: AW(0.86, 0.0), r: 40, cy: 26, sound: 'chime', metal: '#f1d9c4', top: '#c9a77e', sail: '#f4ead8' },
      { id: 'horn', role: 'hear', pos: 'far', type: 'none', name: 'a ship’s horn', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.ship.x, y: L.win.y + PL.ship.y - 6 * L.s }), r: 46, cy: 0, sound: 'horn' },
      { id: 'towel', role: 'touch', kind: 'terry', type: 'none', bake: 'towel', name: 'a beach towel', zone: 'room', at: AT(0.12, 0.42), r: 46, cy: -12, words: ['soft', 'loopy', 'sun-warm'], tex: { base: '#3a9bd0', alt: '#f2c14e' } },
      { id: 'pebble', role: 'touch', kind: 'stone', type: 'none', bake: 'pebble', name: 'a smooth pebble', zone: 'room', at: AT(0.74, 0.46), r: 34, cy: -11, words: ['smooth', 'cool', 'round'], tex: { base: '#a39a90' } },
      { id: 'rope', role: 'touch', kind: 'rope', type: 'none', bake: 'rope', name: 'a coil of rope', zone: 'room', at: AT(0.5, 0.5), atD: AT(0.6, 0.4), r: 40, cy: -8, words: ['rough', 'twisty', 'salty'], tex: { base: '#b08a55' } },
      { id: 'salt', role: 'smell', type: 'none', name: 'salty sea air', zone: 'room', at: AS(0.52), dy: -6, col: '#9fdbe2', motif: 'drop', words: ['salty', 'fresh', 'cool'] },
      { id: 'lotion', role: 'smell', type: 'none', bake: 'lotion', name: 'coconut sunscreen', zone: 'room', at: AT(0.52, 0.26), dy: -50, col: '#f4d9a8', motif: 'flower', words: ['sweet', 'creamy', 'summery'] },
      { id: 'cup2', role: 'decor', type: 'none', bake: 'lemonade', at: AT(0.32, 0.3) }
    ]
  };
  RN.lemonade = (g, it, T) => {
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 2 * s, y + 2 * s, 16 * s, 4 * s); g.fill();
    g.fillStyle = c('#f6e27a', 0.85); g.beginPath(); g.moveTo(x - 12 * s, y - 36 * s); g.lineTo(x + 12 * s, y - 36 * s); g.lineTo(x + 9 * s, y); g.lineTo(x - 9 * s, y); g.closePath(); g.fill();
    g.fillStyle = c('#ffffff', 0.4); g.fillRect(x - 8 * s, y - 32 * s, 2 * s, 28 * s);
    g.strokeStyle = c('#e0573f'); g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x + 4 * s, y - 30 * s); g.lineTo(x + 10 * s, y - 50 * s); g.stroke();
    g.fillStyle = c('#f2c14e'); g.beginPath(); g.arc(x - 12 * s, y - 36 * s, 7 * s, Math.PI * 0.2, Math.PI * 1.2); g.fill();
  };

  /* ================================================================================================================
     SCENE: THE CITY BALCONY AT NIGHT (seen from inside, through the tall balcony doors)
     ================================================================================================================ */
  const BALC_PAL = {
    night: { dark: true, sky0: '#0b1230', sky1: '#1c2856', sky2: '#4a3a6c', far: '#1b2246', near: '#232b52', lit: ['#ffcf7a', '#ffe2a8', '#9fd0ff', '#ffb36b'], moon: '#f4eccc', rail: '#16181e', railHi: '#3c404a',
      plaster: '#c9a98a', plasterDk: '#8a6a52', frame: '#22252c', frameHi: '#4a4f5a', frameDk: '#0f1115', sill: '#3a3d46', sillHi: '#5a5e6a', wood: '#7a5236', woodHi: '#9a6a46', woodDk: '#46301e', fog: '#e4e8f0', deck: '#5a4a44', bulb: '#ffd98a', lampGlow: 'rgba(255,190,110,0.2)' },
    day: { dark: false, sky0: '#3e5290', sky1: '#8a7aaa', sky2: '#f2ab8c', far: '#4a5482', near: '#3c4670', lit: ['#ffd98a', '#ffeccc', '#bfe0ff', '#ffc890'], moon: '#fbf3dc', rail: '#23262e', railHi: '#555a66',
      plaster: '#e8d2b8', plasterDk: '#b8987a', frame: '#2b2f37', frameHi: '#5a606c', frameDk: '#16181d', sill: '#4a4e58', sillHi: '#6a6f7a', wood: '#93653f', woodHi: '#b07c52', woodDk: '#5e3f25', fog: '#f2f4f8', deck: '#8a7468', bulb: '#ffe3a8', lampGlow: 'rgba(255,210,150,0.16)' }
  };
  function planBalcony(L, R) {
    const W = L.win.w, H = L.win.h, s = L.s, m = L.m, far = [], near = [];
    for (let x = -m - 10; x < W + m; x += (18 + R() * 30) * s) far.push({ x, w: (16 + R() * 28) * s, top: H * (0.3 + R() * 0.22), spire: R() < 0.12 });
    for (let x = -m - 20; x < W + m; x += (40 + R() * 40) * s) near.push({ x, w: (38 + R() * 40) * s, top: H * (0.42 + R() * 0.16) });
    return { far, near, rail: H * 0.74, moon: { x: W * 0.6, y: H * 0.17 }, cloud: { x: W * 0.6, y: H * 0.2 }, plane: { y: H * 0.1 }, bridge: H * 0.6, neighbour: { x: W * 0.2, y: H * 0.5 }, cat: { x: W * 0.72, y: H * 0.74 },
      jasmine: { x: W * 0.06, y: H * 0.8 }, lights: H * 0.06, star: { x: W * 0.3, y: H * 0.12 }, balloon: { x: W * 0.48, y: H * 0.3 } };
  }
  function outBalcony(g, L, P, R, PL) {
    const W = L.win.w, H = L.win.h, m = L.m, s = L.s, D = P.dark;
    g.fillStyle = lin(g, 0, -m, 0, H * 0.7, [[0, P.sky0], [0.6, P.sky1], [1, P.sky2]]); g.fillRect(-m, -m, W + 2 * m, H + 2 * m);
    for (let i = 0; i < (D ? 90 : 30); i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + R() * 0.55) + ')'; g.beginPath(); g.arc(-m + R() * (W + 2 * m), -m + R() * H * 0.45, (R() < 0.1 ? 1.3 : 0.7) * s, 0, TAU); g.fill(); }
    const mo = PL.moon;
    g.fillStyle = rad(g, mo.x, mo.y, 0, 70 * s, [[0, 'rgba(255,248,224,0.32)'], [1, 'rgba(255,248,224,0)']]); g.fillRect(mo.x - 70 * s, mo.y - 70 * s, 140 * s, 140 * s);
    g.fillStyle = P.moon; g.beginPath(); g.arc(mo.x, mo.y, 15 * s, 0, TAU); g.fill();
    g.fillStyle = 'rgba(200,190,170,0.35)'; for (const [dx, dy, r] of [[-5, -3, 3], [4, 4, 2.4], [2, -7, 1.6]]) { g.beginPath(); g.arc(mo.x + dx * s, mo.y + dy * s, r * s, 0, TAU); g.fill(); }
    PL.far.forEach(b => { g.fillStyle = P.far; g.fillRect(b.x, b.top, b.w, H + m - b.top); if (b.spire) { g.fillRect(b.x + b.w / 2 - 1 * s, b.top - 20 * s, 2 * s, 20 * s); } for (let y = b.top + 4 * s; y < H * 0.8; y += 6 * s) for (let x = b.x + 3 * s; x < b.x + b.w - 3 * s; x += 5 * s) if (R() < (D ? 0.32 : 0.18)) { g.fillStyle = hexA(P.lit[Math.floor(R() * 4)], 0.75); g.fillRect(x, y, 2.2 * s, 3 * s); } });
    const by = PL.bridge, vc = D ? '#2c3260' : '#5a6490'; // a distant viaduct
    g.fillStyle = vc; g.fillRect(-m, by - 1 * s, W + 2 * m, 5 * s);
    g.strokeStyle = vc; g.lineWidth = 3 * s;
    for (let x = -m; x < W + m; x += 30 * s) { g.fillStyle = vc; g.fillRect(x, by + 4 * s, 5 * s, 26 * s); g.beginPath(); g.arc(x + 17.5 * s, by + 15 * s, 12.5 * s, Math.PI, TAU); g.stroke(); }
    g.fillStyle = hexA('#ffffff', 0.08); g.fillRect(-m, by - 1 * s, W + 2 * m, 1.2 * s);
    PL.near.forEach(b => { g.fillStyle = P.near; g.fillRect(b.x, b.top, b.w, H + m - b.top); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(b.x, b.top, 2 * s, H - b.top); for (let y = b.top + 8 * s; y < H + m; y += 13 * s) for (let x = b.x + 5 * s; x < b.x + b.w - 8 * s; x += 11 * s) { if (R() < (D ? 0.4 : 0.25)) { g.fillStyle = hexA(P.lit[Math.floor(R() * 4)], 0.85); g.fillRect(x, y, 6 * s, 7 * s); } else { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y, 6 * s, 7 * s); } } });
    const nb = PL.neighbour; g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(nb.x - 18 * s, nb.y - 16 * s, 36 * s, 30 * s); g.fillStyle = D ? '#2a2f50' : '#4a5480'; g.fillRect(nb.x - 15 * s, nb.y - 13 * s, 30 * s, 24 * s);
    // the balcony itself: deck, railing, planters
    const rl = PL.rail;
    g.fillStyle = P.deck; g.fillRect(-m, rl + 4 * s, W + 2 * m, H + m - rl);
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = -m; x < W + m; x += 22 * s) g.fillRect(x, rl + 4 * s, 1.4 * s, H + m - rl);
    g.fillStyle = P.rail; g.fillRect(-m, rl - 3 * s, W + 2 * m, 6 * s); g.fillStyle = P.railHi; g.fillRect(-m, rl - 3 * s, W + 2 * m, 1.5 * s);
    for (let x = -m + 4 * s; x < W + m; x += 13 * s) { g.fillStyle = P.rail; g.fillRect(x, rl + 3 * s, 2.4 * s, H * 0.2); }
    g.fillStyle = P.rail; g.fillRect(-m, rl + H * 0.16, W + 2 * m, 4 * s);
    for (const px of [W * 0.34, W * 0.92]) { g.fillStyle = '#b5683f'; g.beginPath(); g.moveTo(px - 18 * s, rl + H * 0.1); g.lineTo(px + 18 * s, rl + H * 0.1); g.lineTo(px + 14 * s, rl + H * 0.26); g.lineTo(px - 14 * s, rl + H * 0.26); g.closePath(); g.fill(); for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? '#3f7a4a' : '#56925a'; leafPath(g, px + (k - 4) * 3 * s, rl + H * 0.1, (16 + (k % 3) * 5) * s, 5 * s, -Math.PI / 2 + (k - 4) * 0.22); g.fill(); } }
    const ja = PL.jasmine; g.strokeStyle = '#3a5a3a'; g.lineWidth = 1.6 * s; g.beginPath(); g.moveTo(ja.x - 20 * s, H + m); g.bezierCurveTo(ja.x, H * 0.9, ja.x - 14 * s, H * 0.76, ja.x + 6 * s, H * 0.64); g.stroke();
    for (let k = 0; k < 16; k++) { const u = k / 16, lx = ja.x - 10 * s + Math.sin(u * 9) * 10 * s, ly = H + m - u * (H * 0.4); g.fillStyle = '#3f7a4a'; leafPath(g, lx, ly, 9 * s, 4 * s, k % 2 ? 0.4 : 2.7); g.fill(); }
    grain(g, -m, -m, W + 2 * m, H + 2 * m, R, Math.round(W * H / 90), 'rgba(255,255,255,0.05)', 1.2);
  }
  function glassBalcony(g, L, P, R) {
    const W = L.win.w, H = L.win.h, s = L.s;
    g.fillStyle = lin(g, 0, 0, W, H, [[0, 'rgba(255,255,255,0.05)'], [0.45, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.06)'], [0.56, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, W, H);
    for (const [cx, cy] of [[0, H], [W, H]]) { g.fillStyle = rad(g, cx, cy, 0, W * 0.3, [[0, hexA(P.fog, 0.2)], [1, hexA(P.fog, 0)]]); g.fillRect(cx - W * 0.4, cy - W * 0.4, W * 0.8, W * 0.8); }
    void R; void s;
  }
  function roomBalcony(g, L, P, R) {
    const { w, h, win, s, sillY, tab, phone } = L, D = P.dark;
    g.fillStyle = P.plaster; g.fillRect(0, 0, w, tab.y + 4);
    for (let i = 0; i < w * h / 300; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; g.fillRect(R() * w, R() * tab.y, 2 * s, 2 * s); }
    g.fillStyle = rad(g, phone ? w * 0.2 : win.x - 60 * s, sillY - 40 * s, 10, Math.max(w, h) * 0.85, [[0, P.lampGlow], [0.5, 'rgba(0,0,0,0)'], [1, D ? 'rgba(10,6,20,0.55)' : 'rgba(40,30,40,0.2)']]); g.fillRect(0, 0, w, tab.y);
    const ft = Math.round(12 * s);
    frameBox(g, L, P, ft, s);
    const mx = Math.round(win.x + win.w / 2);
    bar(g, mx - 5 * s, win.y, 10 * s, win.h, P, s);
    g.fillStyle = '#c9a24a'; rr(g, mx - 16 * s, win.y + win.h * 0.62, 5 * s, 26 * s, 2 * s); g.fill(); rr(g, mx + 11 * s, win.y + win.h * 0.62, 5 * s, 26 * s, 2 * s); g.fill();
    sillBoard(g, L, P, s, ft);
    g.fillStyle = P.plasterDk; g.fillRect(0, sillY + 24 * s, w, 6 * s);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, tab.y - 5 * s, w, 5 * s);
    woodTop(g, 0, tab.y, w, h - tab.y, P, R, s);
    const st = L.still;
    if (phone) shelf(g, st.x - 6, st.y + st.size - 6, st.size + 16, s, Object.assign({}, P, { sillHi: P.woodHi, sill: P.wood }));
    else {
      shelf(g, st.x - 10, st.y + st.size - 6, st.size + 30, s, Object.assign({}, P, { sillHi: P.woodHi, sill: P.wood }));
      const fx = 70 * s, fy = h * 0.42; // a framed print
      g.fillStyle = '#2a2420'; g.fillRect(fx - 6 * s, fy - 6 * s, 132 * s, 102 * s); g.fillStyle = '#f2ece2'; g.fillRect(fx, fy, 120 * s, 90 * s);
      g.fillStyle = '#e0573f'; g.beginPath(); g.arc(fx + 60 * s, fy + 40 * s, 18 * s, 0, TAU); g.fill(); g.fillStyle = '#2f5a7a'; g.fillRect(fx + 10 * s, fy + 58 * s, 100 * s, 22 * s); g.fillStyle = '#f2c14e'; g.fillRect(fx + 10 * s, fy + 54 * s, 100 * s, 4 * s);
      const lx = win.x + win.w + ft + 70 * s; // a floor lamp on the right
      if (lx < w - 30 * s) { g.fillStyle = '#2a2420'; g.fillRect(lx - 1.5 * s, win.y + 30 * s, 3 * s, tab.y - win.y - 30 * s); g.fillStyle = '#e9d9bc'; g.beginPath(); g.moveTo(lx - 30 * s, win.y + 60 * s); g.lineTo(lx + 30 * s, win.y + 60 * s); g.lineTo(lx + 20 * s, win.y + 16 * s); g.lineTo(lx - 20 * s, win.y + 16 * s); g.closePath(); g.fill(); g.fillStyle = rad(g, lx, win.y + 60 * s, 0, 120 * s, [[0, 'rgba(255,214,150,0.35)'], [1, 'rgba(255,214,150,0)']]); g.fillRect(lx - 120 * s, win.y - 60 * s, 240 * s, 240 * s); }
    }
    grain(g, 0, 0, w, h, R, Math.round(w * h / 70), 'rgba(0,0,0,0.04)', 1.2);
  }
  RN.moon = (g, it, T) => { // a cloud drifts off the moon once noticed
    const s = T.s, t = T.t, life = T.life, x = it.x, y = it.y, c = T.c;
    const off = life * 46 * s + Math.sin(t * 0.2) * 2 * s;
    if (life > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = life * 0.4; g.drawImage(T.spr.soft, x - 46 * s, y - 46 * s, 92 * s, 92 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    g.fillStyle = c(T.D ? '#3a4470' : '#8a86a8', 0.95);
    for (const [dx, dy, r] of [[-14, 2, 11], [-2, -3, 14], [12, 1, 11], [22, 4, 7], [-22, 5, 7]]) { g.beginPath(); g.arc(x + dx * s + off, y + dy * s + 3 * s, r * s, 0, TAU); g.fill(); }
    g.fillStyle = c(T.D ? '#4c5788' : '#a9a6c4', 0.6); g.fillRect(x - 26 * s + off, y + 6 * s, 52 * s, 3 * s);
  };
  RN.plane = (g, it, T) => { // a plane crossing; its lights blink
    const s = T.s, t = T.t, life = T.life, W = T.L.win, span = W.w + 80 * s;
    const x = W.x - 40 * s + ((t * (life ? 14 : 4) * s) % span), y = it.y;
    it.hx = x; it.hy = y;
    g.fillStyle = T.c('#c9cfdc', 0.8); g.fillRect(x - 6 * s, y - 1 * s, 12 * s, 2 * s); g.fillRect(x - 1.5 * s, y - 4 * s, 3 * s, 8 * s);
    const bl = Math.sin(t * 6) > 0.6;
    g.fillStyle = bl ? '#ff5a4a' : 'rgba(255,90,74,0.3)'; g.beginPath(); g.arc(x - 6 * s, y, 1.6 * s, 0, TAU); g.fill();
    g.fillStyle = !bl ? '#ffffff' : 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(x + 6 * s, y, 1.6 * s, 0, TAU); g.fill();
    if (life > 0.02 && bl) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 * life; g.drawImage(T.spr.soft, x - 12 * s, y - 12 * s, 24 * s, 24 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  };
  RN.neighbour = (g, it, T) => { // a window across the street: the light comes on and someone waters their plants
    const s = T.s, t = T.t, life = T.life, x = it.x, y = it.y, c = T.c;
    if (life > 0.02) { g.fillStyle = c('#ffd98a', life); g.fillRect(x - 15 * s, y - 13 * s, 30 * s, 24 * s); g.fillStyle = c('#c98a4a', 0.5 * life); g.fillRect(x - 15 * s, y - 13 * s, 6 * s, 24 * s); }
    g.fillStyle = c('#2a2030', 0.85); g.beginPath(); g.arc(x + 4 * s, y - 4 * s, 3.4 * s, 0, TAU); g.fill(); g.fillRect(x + 1 * s, y - 1 * s, 6 * s, 12 * s);
    const tilt = life ? 0.4 + Math.sin(t * 1.5) * 0.25 : 0;
    g.save(); g.translate(x - 1 * s, y + 3 * s); g.rotate(tilt); g.fillRect(-6 * s, -2 * s, 6 * s, 4 * s); g.fillRect(-10 * s, -1 * s, 4 * s, 1.2 * s); g.restore();
    g.fillStyle = c('#3f7a4a'); for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x - 9 * s + k * 3 * s, y + 9 * s - (k % 2) * 2 * s, 2.6 * s, 0, TAU); g.fill(); }
    if (life > 0.2) { g.fillStyle = 'rgba(160,200,255,0.8)'; for (let k = 0; k < 3; k++) { const d = ((t * 2 + k / 3) % 1); g.fillRect(x - 11 * s, y + 1 * s + d * 6 * s, 1 * s, 1.6 * s); } }
  };
  RN.railcat = (g, it, T) => { // a black cat on the railing, tail hanging
    const s = T.s, t = T.t, life = T.life, x = it.x, y = it.y, c = T.c, sw = life ? Math.sin(t * 1.7) * 0.5 : 0;
    g.strokeStyle = c('#1d1b22'); g.lineWidth = 3.6 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 8 * s, y - 2 * s); g.quadraticCurveTo(x - 14 * s, y + 10 * s, x - 10 * s + Math.sin(sw) * 10 * s, y + 22 * s); g.stroke();
    g.fillStyle = c('#1d1b22'); ell(g, x, y - 9 * s, 11 * s, 9 * s); g.fill();
    g.beginPath(); g.arc(x + 9 * s, y - 18 * s, 6.5 * s, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x + 4 * s, y - 22 * s); g.lineTo(x + 5 * s, y - 30 * s); g.lineTo(x + 9 * s, y - 24 * s); g.moveTo(x + 10 * s, y - 24 * s); g.lineTo(x + 14 * s, y - 30 * s); g.lineTo(x + 15 * s, y - 21 * s); g.fill();
    g.fillStyle = c('#f4f1ea'); ell(g, x + 7 * s, y - 1 * s, 3 * s, 1.6 * s); g.fill(); ell(g, x - 4 * s, y - 1 * s, 3 * s, 1.6 * s); g.fill();
    const open = life ? clamp((Math.sin(t * 0.6) - 0.3) * 3, 0.15, 1) : 0.15;
    g.fillStyle = c('#d9e86a'); ell(g, x + 7 * s, y - 19 * s, 1.6 * s, 1.6 * s * open); g.fill(); ell(g, x + 12 * s, y - 19 * s, 1.6 * s, 1.6 * s * open); g.fill();
    g.strokeStyle = c('#6a6a78', 0.5); g.lineWidth = 0.8 * s; g.beginPath(); g.moveTo(x - 9 * s, y - 15 * s); g.quadraticCurveTo(x, y - 18.5 * s, x + 6 * s, y - 14 * s); g.stroke();
  };
  RN.stringlights = (g, it, T) => { // fairy lights strung across the top of the doors; they twinkle on once noticed
    const s = T.s, t = T.t, life = T.life, W = T.L.win, y0 = it.y, c = T.c, n = Math.round(W.w / (26 * s));
    g.strokeStyle = c('#2a2830'); g.lineWidth = 1.2 * s; g.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30, x = W.x + W.w * u, y = y0 + Math.sin(u * Math.PI) * 18 * s; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    const cols = ['#ffd98a', '#ffb0a0', '#bfe3ff', '#d9ffb8'];
    for (let i = 1; i < n; i++) {
      const u = i / n, x = W.x + W.w * u, y = y0 + Math.sin(u * Math.PI) * 18 * s + 5 * s, on = life * (0.65 + 0.35 * Math.sin(t * 2.2 + i * 1.7));
      if (on > 0.05) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = on * 0.6; g.drawImage(T.spr.warm, x - 12 * s, y - 12 * s, 24 * s, 24 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      g.fillStyle = on > 0.05 ? cols[i % 4] : c('#8a8478'); ell(g, x, y, 2.4 * s, 3.2 * s); g.fill();
    }
  };
  RN.basil = (g, it, T) => {
    const s = T.s, t = T.t, life = T.life, x = it.x, y = it.y, c = T.c;
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 1 * s, y + 1 * s, 16 * s, 3.5 * s); g.fill();
    for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.3 + Math.sin(t * 1.3 + k) * 0.05 * (0.4 + life), perk = 1 + life * 0.15; g.fillStyle = c(k % 2 ? '#4f9a4a' : '#6ab55a'); ell(g, x + Math.cos(a) * 12 * s, y - 20 * s + Math.sin(a) * 12 * s * perk, 6 * s, 3.6 * s, a); g.fill(); }
    g.fillStyle = c('#c46b45'); g.beginPath(); g.moveTo(x - 12 * s, y - 18 * s); g.lineTo(x + 12 * s, y - 18 * s); g.lineTo(x + 9 * s, y); g.lineTo(x - 9 * s, y); g.closePath(); g.fill();
    g.fillStyle = c('#d98a5f'); g.fillRect(x - 13 * s, y - 21 * s, 26 * s, 5 * s);
  };
  RN.cushion = (g, it, T) => { // a velvet cushion on the armchair edge
    const s = T.s, c = T.c, x = it.x, y = it.y, b = it.tex.base;
    g.fillStyle = c('#5a4a6a'); rr(g, x - 60 * s, y - 20 * s, 40 * s, 60 * s, 10 * s); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, x + 4 * s, y + 10 * s, 40 * s, 8 * s); g.fill();
    g.fillStyle = c(b); g.beginPath(); g.moveTo(x - 34 * s, y - 30 * s); g.quadraticCurveTo(x, y - 40 * s, x + 34 * s, y - 30 * s); g.quadraticCurveTo(x + 42 * s, y - 8 * s, x + 34 * s, y + 10 * s); g.quadraticCurveTo(x, y + 18 * s, x - 34 * s, y + 10 * s); g.quadraticCurveTo(x - 42 * s, y - 8 * s, x - 34 * s, y - 30 * s); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; ell(g, x - 10 * s, y - 20 * s, 20 * s, 6 * s, -0.2); g.fill();
    g.fillStyle = c(dk(b, 0.3)); g.beginPath(); g.arc(x, y - 10 * s, 2.6 * s, 0, TAU); g.fill();
    g.strokeStyle = c(dk(b, 0.25), 0.6); g.lineWidth = 1 * s; for (const a of [0.6, 2.5, 3.8, 5.6]) { g.beginPath(); g.moveTo(x, y - 10 * s); g.lineTo(x + Math.cos(a) * 26 * s, y - 10 * s + Math.sin(a) * 16 * s); g.stroke(); }
  };
  RN.handle = () => {};
  RN.pot = (g, it, T) => { // a terracotta pot with a little succulent
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 3 * s, y + 2 * s, 24 * s, 6 * s); g.fill();
    g.fillStyle = c('#c46b45'); g.beginPath(); g.moveTo(x - 20 * s, y - 30 * s); g.lineTo(x + 20 * s, y - 30 * s); g.lineTo(x + 15 * s, y); g.lineTo(x - 15 * s, y); g.closePath(); g.fill();
    g.fillStyle = c('#9e4f31', 0.5); g.beginPath(); g.moveTo(x + 6 * s, y - 30 * s); g.lineTo(x + 20 * s, y - 30 * s); g.lineTo(x + 15 * s, y); g.lineTo(x + 5 * s, y); g.closePath(); g.fill();
    g.fillStyle = c('#d98a5f'); rr(g, x - 22 * s, y - 36 * s, 44 * s, 8 * s, 2 * s); g.fill();
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42; g.fillStyle = c(k % 2 ? '#6aa58a' : '#8cc0a0'); leafPath(g, x, y - 36 * s, (14 + (k % 2) * 4) * s, 5 * s, a); g.fill(); }
    g.fillStyle = c('#000000', 0.12); for (let i = 0; i < 12; i++) g.fillRect(x - 14 * s + (i * 7 % 28) * s, y - 26 * s + (i * 5 % 22) * s, 1.2 * s, 1.2 * s);
  };
  RN.teapot = (g, it, T) => {
    const s = T.s, c = T.c, x = it.x, y = it.y, b = '#e9ecef';
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 2 * s, y + 2 * s, 24 * s, 5 * s); g.fill();
    g.fillStyle = c(b); ell(g, x, y - 16 * s, 20 * s, 16 * s); g.fill();
    g.strokeStyle = c(b); g.lineWidth = 3.4 * s; g.beginPath(); g.moveTo(x + 17 * s, y - 16 * s); g.quadraticCurveTo(x + 28 * s, y - 20 * s, x + 30 * s, y - 32 * s); g.stroke(); g.beginPath(); g.arc(x - 21 * s, y - 16 * s, 7 * s, 1.5, 4.8); g.stroke();
    g.fillStyle = c('#7aa0c8'); g.fillRect(x - 18 * s, y - 18 * s, 36 * s, 3 * s);
    g.fillStyle = c(dk(b, 0.1)); ell(g, x, y - 31 * s, 9 * s, 2.6 * s); g.fill(); g.beginPath(); g.arc(x, y - 34 * s, 2.4 * s, 0, TAU); g.fill();
    g.fillStyle = c('#ffffff', 0.6); ell(g, x - 8 * s, y - 22 * s, 3 * s, 6 * s); g.fill();
  };
  function balconyLive(g, E) { // the far train crossing the bridge, windows flickering on the skyline
    const { L, PL, t, s } = E, W = L.win, act = E.IT.train ? E.IT.train.act : 0;
    if (act > 0.02 || (E.IT.train && E.IT.train.found && Math.sin(t * 0.2) > 0.7)) {
      const k = ((t * 0.12) % 1), x = W.x - 60 * s + k * (W.w + 120 * s), y = W.y + PL.bridge - 3 * s;
      for (let i = 0; i < 5; i++) { g.fillStyle = E.tint('#30365a', E.warm); g.fillRect(x - i * 14 * s, y - 5 * s, 12 * s, 5 * s); g.fillStyle = 'rgba(255,224,160,0.9)'; g.fillRect(x - i * 14 * s + 2 * s, y - 4 * s, 3 * s, 2 * s); g.fillRect(x - i * 14 * s + 7 * s, y - 4 * s, 3 * s, 2 * s); }
    }
    for (let i = 0; i < 5; i++) { const on = Math.sin(t * 0.3 + i * 2.7) > 0.4; if (!on) continue; g.fillStyle = 'rgba(255,214,140,0.7)'; g.fillRect(W.x + ((i * 71) % W.w), W.y + W.h * (0.48 + (i % 3) * 0.06), 2.4 * s, 3 * s); }
    const ta = E.IT.traffic ? E.IT.traffic.act : 0;
    if (ta > 0.02) for (let i = 0; i < 3; i++) { const x = W.x + ((t * 60 * s + i * 50 * s) % (W.w * 0.45)), y = W.y + W.h * 0.68; g.fillStyle = 'rgba(255,240,200,' + (0.8 * ta) + ')'; g.fillRect(x, y, 4 * s, 2 * s); g.fillStyle = 'rgba(255,80,60,' + (0.7 * ta) + ')'; g.fillRect(x - 14 * s, y, 3 * s, 2 * s); }
  }

  const BALCONY = {
    id: 'balcony', title: 'the city balcony', where: 'balcony', key: ['D#4', 'F4', 'G4', 'A#4', 'C5', 'D#5', 'F5'], bass: ['D#2', 'C2', 'G#1', 'A#1'], rain: false,
    pal: BALC_PAL, plan: planBalcony, out: outBalcony, glass: glassBalcony, room: roomBalcony, live: balconyLive,
    items: [
      { id: 'moon', role: 'see', type: 'moon', name: 'the moon', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.moon.x, y: L.win.y + PL.moon.y }), r: 32, cy: 0, sound: 'glint',
        q: ['There’s the moon, peeking out.', 'The moon. Showing off again.', 'Moon. Look up. There.'] },
      { id: 'cat', role: 'see', type: 'railcat', name: 'a cat on the rail', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.cat.x, y: L.win.y + PL.rail - 2 * L.s }), r: 28, cy: -12, sound: 'purr',
        q: ['A cat on the railing, perfectly balanced.', 'Rail cat. Fearless. Slightly smug.', 'Cat. Balanced. Calm.'] },
      { id: 'lights', role: 'see', type: 'stringlights', name: 'fairy lights', zone: 'room', at: (L) => ({ x: L.win.x + L.win.w * 0.5, y: L.win.y + 6 * L.s }), r: 40, cy: 20, sound: 'glint',
        q: ['Fairy lights, twinkling on.', 'Fairy lights. Instantly cosier.', 'Lights on. Look.'] },
      { id: 'plane', role: 'see', type: 'plane', name: 'a plane, blinking', zone: 'out', at: (L, PL) => ({ x: L.win.x + L.win.w * 0.4, y: L.win.y + PL.plane.y }), r: 30, cy: 0, sound: 'twirl',
        q: ['A plane, blinking its way home.', 'A plane. Someone up there is eating tiny pretzels.', 'Plane. Blinking. Far.'] },
      { id: 'window', role: 'see', type: 'neighbour', name: 'a window lighting up', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.neighbour.x, y: L.win.y + PL.neighbour.y }), r: 28, cy: 0, sound: 'glow',
        q: ['Someone across the street is watering their plants.', 'A neighbour, watering plants at night. Icon.', 'Neighbour. Watering plants. Look.'] },
      { id: 'basil', role: 'see', type: 'basil', name: 'a basil plant', zone: 'room', at: AS(0.18), r: 28, cy: -18, sound: 'leaf',
        q: ['Basil, perking up.', 'Basil. Thriving. Unlike most houseplants.', 'Basil. Growing. Look.'] },
      { id: 'star', role: 'secret', secret: 0, type: 'shootingstar', name: 'a shooting star', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.star.x, y: L.win.y + PL.star.y }), r: 30, cy: 0 },
      { id: 'balloon', role: 'secret', secret: 1, type: 'balloon', name: 'a runaway balloon', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.balloon.x, y: L.win.y + PL.balloon.y }), r: 24, cy: -8 },
      { id: 'traffic', role: 'hear', pos: 'left', type: 'none', name: 'traffic below', zone: 'out', at: (L) => ({ x: L.win.x + L.win.w * 0.2, y: L.win.y + L.win.h * 0.66 }), r: 66, cy: 0, sound: 'traffic' },
      { id: 'kettle2', role: 'hear', pos: 'right', type: 'kettleCue', bake: 'kettle', name: 'the kettle', zone: 'room', at: AR(), r: 46, cy: -26, sound: 'kettle' },
      { id: 'windchime', role: 'hear', pos: 'above', type: 'chime', name: 'the wind chime', zone: 'out', at: (L) => ({ x: L.win.x + L.win.w * 0.84, y: L.win.y + 20 * L.s }), r: 40, cy: 26, sound: 'chime', metal: '#c9d2da', top: '#5a5e6a', sail: '#c9a24a' },
      { id: 'train', role: 'hear', pos: 'far', type: 'none', name: 'a train, far away', zone: 'out', at: (L, PL) => ({ x: L.win.x + L.win.w * 0.5, y: L.win.y + PL.bridge - 6 * L.s }), r: 50, cy: 0, sound: 'train' },
      { id: 'cushion', role: 'touch', kind: 'velvet', type: 'none', bake: 'cushion', name: 'a velvet cushion', zone: 'room', at: AT(0.13, 0.42), r: 42, cy: -10, words: ['soft', 'plush', 'velvety'], tex: { base: '#c46a8a' } },
      { id: 'handle', role: 'touch', kind: 'metal', type: 'handle', name: 'the cool door handle', zone: 'room', at: (L) => ({ x: L.win.x + L.win.w / 2, y: L.win.y + L.win.h * 0.62 + 13 * L.s }), r: 30, cy: 0, words: ['cool', 'smooth', 'solid'], tex: { base: '#c9a24a' } },
      { id: 'pot', role: 'touch', kind: 'clay', type: 'none', bake: 'pot', name: 'a clay pot', zone: 'room', at: AT(0.62, 0.48), atD: AT(0.86, 0.46), r: 36, cy: -18, words: ['rough', 'dry', 'earthy'], tex: { base: '#c46b45' } },
      { id: 'jasmine', role: 'smell', type: 'none', name: 'night jasmine', zone: 'out', at: (L, PL) => ({ x: L.win.x + PL.jasmine.x + 10 * L.s, y: L.win.y + L.win.h * 0.66 }), col: '#f4f0ff', motif: 'flower', words: ['sweet', 'floral', 'soft'] },
      { id: 'tea', role: 'smell', type: 'cupSteam', bake: 'cup', name: 'mint tea', zone: 'room', at: AT(0.36, 0.3), sy: -38, china: '#f2f2ee', drink: '#9a8a3a', band: '#7aa0c8', col: '#a8e0b0', motif: 'needle', words: ['minty', 'fresh', 'warm'], life0: 1 },
      { id: 'teapot', role: 'decor', type: 'none', bake: 'teapot', at: AT(0.52, 0.22) }
    ]
  };
  RN.kettle = (g, it, T) => { // an electric kettle on the side table
    const s = T.s, c = T.c, x = it.x, y = it.y;
    g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, x + 2 * s, y + 2 * s, 22 * s, 5 * s); g.fill();
    g.fillStyle = c('#3a3d46'); ell(g, x, y - 2 * s, 20 * s, 4 * s); g.fill();
    g.fillStyle = c('#d9dde2'); g.beginPath(); g.moveTo(x - 16 * s, y - 4 * s); g.lineTo(x - 12 * s, y - 44 * s); g.lineTo(x + 12 * s, y - 44 * s); g.lineTo(x + 16 * s, y - 4 * s); g.closePath(); g.fill();
    g.fillStyle = c('#a9b0b8'); g.beginPath(); g.moveTo(x + 6 * s, y - 4 * s); g.lineTo(x + 9 * s, y - 44 * s); g.lineTo(x + 12 * s, y - 44 * s); g.lineTo(x + 16 * s, y - 4 * s); g.closePath(); g.fill();
    g.strokeStyle = c('#3a3d46'); g.lineWidth = 4 * s; g.beginPath(); g.moveTo(x + 14 * s, y - 38 * s); g.quadraticCurveTo(x + 28 * s, y - 30 * s, x + 16 * s, y - 12 * s); g.stroke();
    g.fillStyle = c('#3a3d46'); rr(g, x - 13 * s, y - 49 * s, 26 * s, 6 * s, 2 * s); g.fill();
    g.beginPath(); g.moveTo(x - 12 * s, y - 40 * s); g.lineTo(x - 22 * s, y - 46 * s); g.lineTo(x - 13 * s, y - 34 * s); g.closePath(); g.fill();
    g.fillStyle = c('#ffffff', 0.45); g.fillRect(x - 9 * s, y - 40 * s, 2.4 * s, 32 * s);
  };
  RN.shootingstar = (g, it, T) => {
    const s = T.s, t = T.t, life = T.life, x = it.x, y = it.y;
    if (!life) { const tw = 0.6 + 0.4 * Math.sin(t * 3); g.fillStyle = 'rgba(255,250,230,' + tw + ')'; g.beginPath(); g.arc(x, y, 1.8 * s, 0, TAU); g.fill(); return; }
    const k = ((t * 0.25) % 1); if (k > 0.35) return;
    const u = k / 0.35, hx = x - 60 * s + u * 140 * s, hy = y - 10 * s + u * 50 * s;
    g.strokeStyle = 'rgba(255,250,235,' + (1 - u) + ')'; g.lineWidth = 2 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx - 34 * s, hy - 12 * s); g.lineTo(hx, hy); g.stroke();
    g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(hx, hy, 2.2 * s, 0, TAU); g.fill();
  };
  RN.balloon = (g, it, T) => {
    const s = T.s, t = T.t, life = T.life, c = T.c, x = it.x + Math.sin(t * 0.5) * 6 * s, y = it.y - (life ? ((t * 4) % 40) * s : 0);
    g.strokeStyle = c('#e9e4f0', 0.7); g.lineWidth = 0.8 * s; g.beginPath(); g.moveTo(x, y + 9 * s); g.quadraticCurveTo(x + 4 * s, y + 18 * s, x - 2 * s, y + 26 * s); g.stroke();
    g.fillStyle = c('#e05a7a'); ell(g, x, y, 7 * s, 9 * s); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; ell(g, x - 2.4 * s, y - 3 * s, 1.8 * s, 3 * s); g.fill();
  };
  RN.kettleCue = (g, it, T) => { if (T.act > 0.05) steam(g, it.x - 22 * T.s, it.y - 46 * T.s, T.s * 0.8, T.t, T.act, T.c, 2); };
  function cafeLive(g, E) { // umbrellas passing on the far pavement, ripples in the puddle
    const { L, PL, t, s } = E, W = L.win;
    if (PL.puddle) { const pd = PL.puddle, ph = (t * 0.9) % 1; g.strokeStyle = 'rgba(255,255,255,' + (0.3 * (1 - ph) * E.k) + ')'; g.lineWidth = 1 * s; ell(g, W.x + pd.x + 10 * s, W.y + pd.y, (3 + ph * 16) * s, (0.8 + ph * 2.6) * s); g.stroke(); }
    [{ sp: 16, ph: 0.1, col: '#2c3346', can: '#2b3550' }, { sp: -12, ph: 0.6, col: '#3a3030', can: '#3e4a3e' }].forEach((wk, i) => {
      const span = W.w + 80, x = W.x - 40 + (((wk.ph * span + t * wk.sp * s) % span) + span) % span;
      const fake = { x, y: W.y + PL.street + 3 * s - Math.abs(Math.sin(t * 5 + i)) * 0.5 * s, canopy: wk.can, coat: wk.col, sc: 0.82 };
      RN.umbrella(g, fake, { t: t + i * 3, s, k: E.warm, c: (hex, a) => E.tint(hex, E.warm, a), life: 0, act: 0, D: E.D, L });
    });
  }
  CAFE.live = cafeLive;

  const SCENES = { cafe: CAFE, cabin: CABIN, beach: BEACH, balcony: BALCONY };
  const SCENE_IDS = ['cafe', 'cabin', 'beach', 'balcony'];

  /* ---------------- sounds: calls (where is it?) and the soundscape they leave behind ---------------- */
  const SND = {
    rain: { call(A, v) { A.noise({ pink: true, filter: 'bandpass', freq: 2600, q: 0.5, dur: 2.2, attack: 0.6, vol: 0.2 * v, pan: -0.85, bus: 'sfx' }); for (let i = 0; i < 9; i++) A.tone({ when: A.now() + 0.1 + Math.random() * 1.6, type: 'sine', freq: 1500 + Math.random() * 2200, to: 900, glide: 0.03, dur: 0.05, vol: 0.03 * v, pan: -0.8 }); },
      loop: { pink: true, filter: 'bandpass', freq: 2400, q: 0.45, pan: -0.7, level: 0.05 } },
    hiss: { call(A, v) { A.noise({ filter: 'highpass', freq: 2600, dur: 1.4, attack: 0.18, vol: 0.12 * v, pan: 0.85 }); for (let i = 0; i < 4; i++) A.tone({ when: A.now() + 0.2 + i * 0.16, type: 'sine', freq: 180 + Math.random() * 90, to: 260, glide: 0.08, dur: 0.12, vol: 0.06 * v, pan: 0.85 }); }, every: 11000 },
    bell: { call(A, v) { A.chime(A.note('E6'), { vol: 0.13 * v, pan: 0.45, verb: 0.45, dur: 1.6 }); A.chime(A.note('C#6'), { when: A.now() + 0.17, vol: 0.11 * v, pan: 0.45, verb: 0.45, dur: 1.6 }); }, every: 17000 },
    tower: { call(A, v) { A.chime(A.note('A3'), { vol: 0.09 * v, dur: 3.4, verb: 0.9, pan: 0.15 }); A.chime(A.note('E3'), { when: A.now() + 1.15, vol: 0.08 * v, dur: 3.4, verb: 0.9, pan: 0.15 }); }, every: 19000 },
    creek: { call(A, v) { for (let i = 0; i < 10; i++) A.noise({ when: A.now() + 0.05 + Math.random() * 1.6, filter: 'bandpass', freq: 900 + Math.random() * 2200, q: 6, dur: 0.06 + Math.random() * 0.08, attack: 0.01, vol: 0.06 * v, pan: -0.8 }); A.noise({ pink: true, filter: 'bandpass', freq: 1600, q: 0.7, dur: 2, attack: 0.5, vol: 0.07 * v, pan: -0.8 }); },
      loop: { pink: true, filter: 'bandpass', freq: 1500, q: 0.8, pan: -0.7, level: 0.035 } },
    kettle: { call(A, v) { A.tone({ type: 'sine', freq: 1500, to: 1900, glide: 1.4, dur: 1.7, attack: 0.5, vol: 0.05 * v, pan: 0.8 }); A.tone({ type: 'sine', freq: 1508, to: 1912, glide: 1.4, dur: 1.7, attack: 0.5, vol: 0.04 * v, pan: 0.8 }); for (let i = 0; i < 6; i++) A.tone({ when: A.now() + Math.random() * 1.2, type: 'sine', freq: 140 + Math.random() * 80, to: 220, glide: 0.06, dur: 0.08, vol: 0.05 * v, pan: 0.8 }); }, every: 14000 },
    chime: { call(A, v) { const ns = ['C6', 'D6', 'E6', 'G6', 'A6', 'C7']; for (let i = 0; i < 5; i++) A.chime(A.note(ns[Math.floor(Math.random() * ns.length)]), { when: A.now() + i * (0.12 + Math.random() * 0.15), vol: 0.05 * v, dur: 1.8, pan: 0.3, verb: 0.55 }); }, every: 10000 },
    dog: { call(A, v) { [0, 0.3].forEach(o => { A.tone({ when: A.now() + o, type: 'sawtooth', freq: 320, to: 170, glide: 0.12, dur: 0.16, vol: 0.05 * v, lp: 700, pan: -0.35, verb: 0.6 }); A.noise({ when: A.now() + o, filter: 'lowpass', freq: 650, dur: 0.1, vol: 0.05 * v, pan: -0.35 }); }); }, every: 21000 },
    waves: { call(A, v) { A.noise({ pink: true, filter: 'lowpass', freq: 900, to: 400, q: 0.5, dur: 3, attack: 1.2, vol: 0.18 * v, pan: -0.8 }); A.noise({ when: A.now() + 1.1, filter: 'highpass', freq: 2500, dur: 1.4, attack: 0.2, vol: 0.05 * v, pan: -0.7 }); }, loop: { pink: true, filter: 'lowpass', freq: 700, q: 0.4, pan: -0.6, level: 0.05 } },
    radio: { call(A, v) { ['G4', 'B4', 'D5', 'E5', 'D5', 'B4'].forEach((n, i) => A.pluck(A.note(n), { when: A.now() + i * 0.22, vol: 0.09 * v, damp: 0.994, lp: 1300, pan: 0.8 })); A.noise({ filter: 'bandpass', freq: 3000, q: 2, dur: 1.4, vol: 0.012 * v, pan: 0.8 }); }, every: 16000 },
    horn: { call(A, v) { A.tone({ type: 'sawtooth', freq: 98, dur: 1.8, attack: 0.25, vol: 0.06 * v, lp: 380, pan: 0.5, verb: 0.7 }); A.tone({ type: 'sawtooth', freq: 147, dur: 1.8, attack: 0.25, vol: 0.04 * v, lp: 380, pan: 0.5, verb: 0.7 }); }, every: 22000 },
    traffic: { call(A, v) { A.noise({ pink: true, filter: 'lowpass', freq: 380, dur: 2.4, attack: 0.8, vol: 0.16 * v, pan: -0.8 }); A.tone({ when: A.now() + 0.8, type: 'square', freq: 420, dur: 0.18, vol: 0.02 * v, lp: 900, pan: -0.8 }); }, loop: { pink: true, filter: 'lowpass', freq: 300, q: 0.3, pan: -0.7, level: 0.05 } },
    train: { call(A, v) { A.tone({ type: 'triangle', freq: 466, dur: 1.2, attack: 0.1, vol: 0.03 * v, lp: 1200, pan: 0.1, verb: 0.8 }); A.tone({ type: 'triangle', freq: 554, dur: 1.2, attack: 0.1, vol: 0.025 * v, lp: 1200, pan: 0.1, verb: 0.8 }); A.noise({ pink: true, filter: 'lowpass', freq: 220, dur: 2.6, attack: 0.6, vol: 0.08 * v, pan: 0.1 }); }, every: 24000 }
  };
  const FX = { // little signature sounds when a thing is noticed
    purr(A) { A.tone({ type: 'sawtooth', freq: 27, dur: 1.5, vol: 0.08, attack: 0.25, lp: 170 }); },
    chirp(A) { for (let i = 0; i < 3; i++) A.tone({ when: A.now() + i * 0.11, type: 'sine', freq: 3200 + i * 300, to: 4300, glide: 0.05, dur: 0.07, vol: 0.04, pan: 0.2 }); },
    twirl(A) { A.whoosh({ from: 600, to: 1800, dur: 0.5, vol: 0.06 }); },
    drip(A) { A.tone({ type: 'sine', freq: 1500, to: 700, glide: 0.06, dur: 0.1, vol: 0.06 }); },
    glow(A) { A.tone({ type: 'sine', freq: 120, dur: 0.6, vol: 0.05, attack: 0.08, lp: 400 }); A.click({ vol: 0.06 }); },
    leaf(A) { A.paper({ vol: 0.08, freq: 3200 }); },
    sip(A) { A.noise({ pink: true, filter: 'bandpass', freq: 900, q: 0.8, dur: 0.6, attack: 0.2, vol: 0.05 }); },
    hoot(A) { [0, 0.42].forEach(o => A.tone({ when: A.now() + o, type: 'sine', freq: 410, to: 360, glide: 0.25, dur: 0.32, vol: 0.06, attack: 0.04, verb: 0.5 })); },
    rustle(A) { A.noise({ filter: 'bandpass', freq: 2400, q: 0.8, dur: 0.4, attack: 0.1, vol: 0.05 }); },
    flame(A) { A.noise({ filter: 'lowpass', freq: 500, dur: 0.5, attack: 0.05, vol: 0.06 }); A.tone({ type: 'sine', freq: 200, to: 120, glide: 0.3, dur: 0.4, vol: 0.03 }); },
    glint(A) { for (let i = 0; i < 3; i++) A.tone({ when: A.now() + i * 0.06, type: 'sine', freq: 2600 + i * 500, dur: 0.15, vol: 0.025 }); },
    chitter(A) { for (let i = 0; i < 6; i++) A.tone({ when: A.now() + i * 0.05, type: 'square', freq: 2200 + Math.random() * 800, dur: 0.025, vol: 0.015, lp: 4000 }); },
    gull(A) { A.tone({ type: 'sine', freq: 1300, to: 2100, glide: 0.12, dur: 0.3, vol: 0.04 }); A.tone({ when: A.now() + 0.3, type: 'sine', freq: 1800, to: 1200, glide: 0.2, dur: 0.25, vol: 0.035 }); }
  };
  const TEX = { // rubbing sounds and haptics per texture family
    knit: { loop: { pink: true, filter: 'lowpass', freq: 520, q: 0.6 }, max: 0.12, buzz: [6] },
    glaze: { loop: { pink: false, filter: 'bandpass', freq: 1800, q: 5 }, max: 0.05, buzz: [3] },
    wood: { loop: { pink: false, filter: 'bandpass', freq: 2300, q: 1.1 }, max: 0.07, buzz: [10, 18, 6], clicks: true },
    plaid: { loop: { pink: true, filter: 'lowpass', freq: 480, q: 0.6 }, max: 0.12, buzz: [6] },
    terry: { loop: { pink: true, filter: 'lowpass', freq: 650, q: 0.7 }, max: 0.11, buzz: [8] },
    velvet: { loop: { pink: true, filter: 'lowpass', freq: 380, q: 0.5 }, max: 0.1, buzz: [4] },
    stone: { loop: { pink: false, filter: 'bandpass', freq: 1200, q: 4 }, max: 0.05, buzz: [3] },
    metal: { loop: { pink: false, filter: 'bandpass', freq: 2800, q: 7 }, max: 0.04, buzz: [3] },
    bark: { loop: { pink: false, filter: 'bandpass', freq: 2600, q: 1 }, max: 0.08, buzz: [12, 20, 8], clicks: true },
    rope: { loop: { pink: false, filter: 'bandpass', freq: 1700, q: 1.2 }, max: 0.07, buzz: [10, 16, 10], clicks: true },
    clay: { loop: { pink: false, filter: 'bandpass', freq: 2100, q: 1.3 }, max: 0.06, buzz: [8, 14, 8], clicks: true }
  };

  /* ================================================================================================================ */
  (env.games = env.games || []).push({
    id: 'sense-hunt', mode: 'reset', name: 'Sense Hunt', verb: 'notice', family: 'GROUND', minutes: 2,
    parents: ['Attention / Grounding / Mental Quiet', 'Panic / Body Alarm', 'Overthinking / Thought Fusion'],
    cast: ['still', 'loopie'], poster: { char: 'still', mood: 'calm' },
    tagline: 'Five things you see, four you hear… notice your way back to now.',
    why: 'For a racing or foggy head: the 5-4-3-2-1 senses walk that brings you back to right here.',
    fonts: ['Fraunces:ital,wght@0,600;0,700;1,700', 'Caveat:wght@600;700'],
    css: `
.g-sense-hunt { --sh-display: "Fraunces", "Iowan Old Style", Georgia, "Lora", serif; --sh-hand: "Caveat", "Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", "TeX Gyre Chorus", cursive; background: #1d1f2b; }
.g-sense-hunt .sh-stage { position: absolute; inset: 0; z-index: 12; touch-action: none; cursor: pointer; -webkit-tap-highlight-color: transparent; outline: none; }
.g-sense-hunt .sh-hud { position: absolute; z-index: 32; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 60px); transform: translateX(-50%); display: flex; align-items: center; gap: 5px; pointer-events: none; }
.g-sense-hunt .sh-chip { position: relative; display: flex; align-items: center; gap: 5px; height: 38px; padding: 0 10px 0 9px; border-radius: 999px; color: var(--ui-fg); background: color-mix(in srgb, var(--ui-surface) 88%, transparent);
  border: 1px solid var(--ui-line); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22); transition: background 0.45s ease, color 0.45s ease, transform 0.45s cubic-bezier(.2, 1.5, .4, 1), box-shadow 0.45s ease; }
.g-sense-hunt .sh-chip svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.g-sense-hunt .sh-chip b { font: 700 17px/1 var(--sh-display); }
.g-sense-hunt .sh-lbl { display: none; font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; }
.g-sense-hunt .sh-pips { display: none; gap: 3px; margin-left: 1px; }
.g-sense-hunt .sh-pips i { width: 7px; height: 7px; border-radius: 50%; border: 1.6px solid currentColor; opacity: 0.55; transition: background 0.3s ease, opacity 0.3s ease, transform 0.3s cubic-bezier(.2, 1.8, .4, 1); }
.g-sense-hunt .sh-pips i.sh-p { background: currentColor; opacity: 1; transform: scale(1.15); }
.g-sense-hunt .sh-chip.sh-on { background: var(--sh-c); color: #26180b; border-color: rgba(255, 255, 255, 0.5); transform: scale(1.05); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28), 0 0 0 3px color-mix(in srgb, var(--sh-c) 35%, transparent); }
.g-sense-hunt .sh-chip.sh-on b { display: none; }
.g-sense-hunt .sh-chip.sh-on .sh-lbl, .g-sense-hunt .sh-chip.sh-on .sh-pips { display: flex; }
.g-sense-hunt .sh-chip.sh-done { color: var(--ui-fg); }
.g-sense-hunt .sh-chip.sh-done b { color: transparent; position: relative; }
.g-sense-hunt .sh-chip.sh-done b::after { content: ""; position: absolute; left: 1px; top: 1px; width: 6px; height: 11px; border: solid var(--sh-c); border-width: 0 3px 3px 0; transform: rotate(40deg); }
.g-sense-hunt .sh-chip.sh-beat { animation: sense-hunt-beat 0.5s ease-out; }
@keyframes sense-hunt-beat { 0% { box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28), 0 0 0 3px color-mix(in srgb, var(--sh-c) 35%, transparent); } 30% { box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28), 0 0 0 7px color-mix(in srgb, var(--sh-c) 40%, transparent); } 100% { box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28), 0 0 0 3px color-mix(in srgb, var(--sh-c) 35%, transparent); } }
.g-sense-hunt .sh-chip.sh-flash { animation: sense-hunt-flash 0.7s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes sense-hunt-flash { 0% { transform: scale(1); } 35% { transform: scale(1.22); } 100% { transform: scale(1); } }
.g-sense-hunt .sh-tag { position: absolute; z-index: 34; left: 0; top: 0; pointer-events: none; padding: 4px 11px 6px 17px; background: #fff6e2; color: #3b2a1c; border-radius: 3px 9px 9px 3px; font: 700 22px/1 var(--sh-hand);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.32); white-space: nowrap; will-change: transform, opacity; }
.g-sense-hunt .sh-tag::before { content: ""; position: absolute; left: 6px; top: 50%; width: 6px; height: 6px; margin-top: -3px; border-radius: 50%; background: rgba(59, 42, 28, 0.32); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.4); }
.g-sense-hunt .sh-tag small { font: 700 12px/1 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; color: #9a6a2a; margin-right: 6px; vertical-align: 2px; }
.g-sense-hunt .sh-word { position: absolute; z-index: 33; left: 0; top: 0; pointer-events: none; font: 700 24px/1 var(--sh-hand); color: #fff8ea; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.75), 0 0 2px rgba(0, 0, 0, 0.6); white-space: nowrap; animation: sense-hunt-word 1.5s ease-out both; }
.g-sense-hunt .sh-word.sh-calm { animation: none; transform: translate(-50%, -12px); }
@keyframes sense-hunt-word { 0% { opacity: 0; transform: translate(-50%, 6px) scale(0.85); } 18% { opacity: 1; transform: translate(-50%, -6px) scale(1.06); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -34px) scale(1); } }
.g-sense-hunt .sh-note { position: absolute; z-index: 40; left: 50%; top: 0; width: min(340px, calc(100% - 28px)); display: flex; gap: 11px; align-items: center; padding: 10px 14px 11px 10px; border-radius: 20px;
  background: color-mix(in srgb, var(--ui-surface) 95%, transparent); color: var(--ui-fg); border: 1px solid var(--ui-line); box-shadow: 0 18px 38px rgba(0, 0, 0, 0.4); touch-action: none; cursor: grab;
  transform: translate(-50%, -150%); opacity: 0; transition: transform 0.5s cubic-bezier(.2, 1.3, .4, 1), opacity 0.3s ease; will-change: transform; }
.g-sense-hunt .sh-note.sh-in { transform: translate(-50%, 0); opacity: 1; }
.g-sense-hunt .sh-note.sh-drag { transition: none; cursor: grabbing; }
.g-sense-hunt .sh-note.sh-gone { transition: transform 0.3s cubic-bezier(.4, 0, .9, .6), opacity 0.22s ease; opacity: 0; }
.g-sense-hunt .sh-note img { width: 40px; height: 40px; flex: none; object-fit: contain; }
.g-sense-hunt .sh-note .sh-nt { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.g-sense-hunt .sh-note .sh-nh { display: flex; justify-content: space-between; gap: 8px; font: 700 13px/1.1 var(--font-ui); }
.g-sense-hunt .sh-note .sh-nh span { font-weight: 500; color: var(--ui-muted); font-size: 12px; }
.g-sense-hunt .sh-note .gk-user { font-size: 15px; line-height: 1.25; letter-spacing: 0.02em; }
.g-sense-hunt .sh-note.sh-shake { animation: sense-hunt-buzz 0.36s linear 2; }
@keyframes sense-hunt-buzz { 0%, 100% { margin-left: 0; } 25% { margin-left: -3px; } 75% { margin-left: 3px; } }
.g-sense-hunt .sh-taste { position: absolute; z-index: 20; width: 88px; height: 88px; margin: -44px 0 0 -44px; border-radius: 50%; border: 0; background: transparent; cursor: pointer; touch-action: none; padding: 0; color: inherit; }
.g-sense-hunt .sh-taste:focus-visible { outline: 3px solid #ffe08a; outline-offset: 2px; }
.g-sense-hunt .sh-taste span { position: absolute; left: 50%; top: calc(100% - 4px); transform: translateX(-50%); font: 700 22px/1 var(--sh-hand); color: #fff8ea; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); white-space: nowrap; pointer-events: none; }
.g-sense-hunt .sh-taste[hidden] { display: none; }
.g-sense-hunt .gk-char { transition: left 1.3s cubic-bezier(.3, .9, .3, 1), top 1.3s cubic-bezier(.3, .9, .3, 1); }
.g-sense-hunt .sh-lp.gk-side-below .gk-bubble { left: auto; right: 0; }
.g-sense-hunt .gk-side-below .gk-bubble { max-width: min(258px, calc(100cqw - 24px)); }
.g-sense-hunt .sh-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a.strands) an = a; }, () => {});
      const inten = ctx.intensity, visits = K.visits(), line = (o) => ctx.line(o), care = () => an.safety === 'care';
      let sid = K.dailyPick(SCENE_IDS, 4);
      try { const q = S.isDev() ? new URLSearchParams(location.search).get('shScene') : null; if (q && SCENES[q]) sid = q; } catch (e) { /* no query */ }
      const SC = SCENES[sid];
      try { if (document.fonts && document.fonts.load) { document.fonts.load('700 52px Caveat'); document.fonts.load('italic 700 36px Fraunces'); } } catch (e) { /* fallback fonts */ }

      /* ---------------- items ---------------- */
      const secretIdx = visits >= 1 ? (visits - 1) % 2 : -1;
      const items = SC.items.filter(sp => sp.role !== 'secret' || sp.secret === secretIdx)
        .map((sp, i) => Object.assign({ found: false, foundAt: 0, life: sp.life0 || 0, act: 0, pulse: 0, shimmer: 0, squash: 0, rub: 0, x: 0, y: 0, order: i, t0: 0 }, sp));
      const IT = {}; items.forEach(it => { IT[it.id] = it; });
      const SEE = items.filter(i => i.role === 'see'), HEAR = items.filter(i => i.role === 'hear'), TOUCH = items.filter(i => i.role === 'touch'), SMELL = items.filter(i => i.role === 'smell');
      const SECRET = items.find(i => i.role === 'secret') || null;

      /* ---------------- DOM ---------------- */
      const ddpr = window.devicePixelRatio || 1; // an integer ratio to the screen keeps the final scale cheap and crisp (2 → 2, 3 → 1.5)
      let maxDpr = ddpr <= 2 ? Math.max(1, ddpr) : ddpr / Math.round(ddpr / 1.5); try { const q = S.isDev() ? Number(new URLSearchParams(location.search).get('shDpr')) : 0; if (q) maxDpr = q; } catch (e) { /* no query */ }
      const cv = K.canvas(el, { opaque: true, maxDpr });
      const P = K.particles({ max: 220 });
      const stage = h('div', { class: 'sh-stage', role: 'application', 'aria-label': 'Sense Hunt scene. Tap things you notice.', tabindex: '-1' });
      el.append(stage);
      const SENSES = [
        { k: 'see', n: 5, lbl: 'SEE', c: '#ffd36b', svg: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' },
        { k: 'hear', n: 4, lbl: 'HEAR', c: '#8fe3cf', svg: '<path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3.2-2.4 4.2-3.2 5.8-.7 1.4-.4 3.4-2.6 4.4-1.6.7-3.2 0-3.7-1.3"/><path d="M10 9.8a2 2 0 0 1 4 0c0 1.1-.9 1.6-1.4 2.3"/>' },
        { k: 'touch', n: 3, lbl: 'TOUCH', c: '#ffb7a3', svg: '<path d="M8.5 12.5V5.8a1.6 1.6 0 0 1 3.2 0v5.4M11.7 10.6V4.6a1.6 1.6 0 0 1 3.2 0v6.4M14.9 11V6.5a1.6 1.6 0 0 1 3.2 0v7.2c0 4-2.6 6.8-6.3 6.8-2.6 0-4.1-1.2-5.4-3.1l-2.2-3.4a1.5 1.5 0 0 1 2.4-1.8l1.9 2.1"/>' },
        { k: 'smell', n: 2, lbl: 'SMELL', c: '#c8e89c', svg: '<path d="M8 20c-2.2-3 1.8-5 0-8s1.8-5 0-8M12 20c-2.2-3 1.8-5 0-8s1.8-5 0-8M16 20c-2.2-3 1.8-5 0-8s1.8-5 0-8"/>' },
        { k: 'taste', n: 1, lbl: 'TASTE', c: '#e9bcff', svg: '<path d="M5 9h11v4.5a5.5 5.5 0 0 1-5.5 5.5A5.5 5.5 0 0 1 5 13.5z"/><path d="M16 10.2h1.4a2.4 2.4 0 0 1 0 4.8H16"/><path d="M8.6 3.2c-.9 1.3.9 2.3 0 3.8M12.2 3.2c-.9 1.3.9 2.3 0 3.8"/>' }
      ];
      const hud = h('div', { class: 'sh-hud', 'aria-hidden': 'true' });
      SENSES.forEach(se => {
        const pips = h('span', { class: 'sh-pips' }); for (let i = 0; i < se.n; i++) pips.append(h('i'));
        se.el = h('div', { class: 'sh-chip', style: { '--sh-c': se.c }, html: '<svg viewBox="0 0 24 24">' + se.svg + '</svg>' }, h('b', { text: String(se.n) }), h('span', { class: 'sh-lbl', text: se.lbl }), pips);
        hud.append(se.el);
      });
      el.append(hud);
      const sr = h('div', { class: 'sh-sr', 'aria-live': 'polite' }); el.append(sr);
      const still = K.character('still', { side: 'right', mood: 'calm', x: 12, y: 104, size: 72 });
      const loopie = K.character('loopie', { side: 'left', mood: 'worried', x: 300, y: 700, size: 64 });
      loopie.el.classList.add('sh-lp'); loopie.show(false);
      const tasteBtns = ['tea', 'mint', 'orange'].map(k => { const b = h('button', { type: 'button', class: 'sh-taste', hidden: true, 'aria-label': k === 'tea' ? 'Warm tea' : k === 'mint' ? 'Cool mint' : 'Sweet orange' }, h('span', { text: k })); el.append(b); b.dataset.k = k; return b; });
      const sipBtn = h('button', { type: 'button', class: 'sh-taste', hidden: true, 'aria-label': 'Hold for a slow sip' }); el.append(sipBtn);

      /* ---------------- audio ---------------- */
      const loops = [];
      const mkLoop = (o) => { if (!A.ctx) return null; const l = A.loop(Object.assign({ bus: 'amb' }, o)); if (l) loops.push(l); return l; };
      S.onDestroy(() => { loops.forEach(l => { try { l.stop(); } catch (e) { /* gone */ } }); });
      const room = K.ambience('room'); room.level(0.16, 1.5);
      let rainBed = null;
      const startRainBed = () => { if (!SC.rain || rainBed || !A.ctx) return; rainBed = mkLoop({ pink: true, filter: 'lowpass', freq: 1300, q: 0.3 }); if (rainBed) rainBed.level(0.022, 1.5); };
      S.on('audio-ready', startRainBed); startRainBed();
      const MUS = { on: false, next: 0, beat: 0, bpm: 66, motif: [], pad: 0, bass: false };
      const pulses = [];
      function piano(note, when, vol) {
        if (!A.ctx) return;
        const f = A.note(note);
        A.pluck(f, { when, vol: vol || 0.13, damp: 0.995, lp: 1900, verb: 0.35, bus: 'music' });
        A.tone({ when, type: 'sine', freq: f, dur: 1.6, vol: (vol || 0.13) * 0.28, attack: 0.006, bus: 'music' });
      }
      function musicTick() {
        if (!A.ctx || !MUS.on) return;
        const now = A.now();
        if (MUS.next < now - 0.4) MUS.next = now + 0.08;
        while (MUS.next < now + 0.25) {
          const time = MUS.next, i = MUS.beat, e = i % 16;
          const slots = [0, 3, 6, 8, 11], si = slots.indexOf(e);
          if (si >= 0 && si < MUS.motif.length) { const it = MUS.motif[si]; piano(SC.key[it.note % SC.key.length], time, 0.12); pulses.push({ it, at: A.heardAt(time) }); }
          if (MUS.bass && e % 8 === 0) A.pluck(A.note(SC.bass[Math.floor(i / 16) % SC.bass.length]), { when: time, vol: 0.2, damp: 0.993, lp: 600, bus: 'music' });
          if (MUS.pad && e === 0) { const root = A.note(SC.bass[Math.floor(i / 16) % SC.bass.length]) * 4; [1, 1.25, 1.5].forEach((m, q) => A.tone({ when: time + q * 0.02, type: 'triangle', freq: root * m, dur: 60 / MUS.bpm * 8, vol: 0.022 * MUS.pad, attack: 1.2, lp: 1200, verb: 0.5, bus: 'music' })); }
          if (e === 0 || e === 8) hudBeatAt(A.heardAt(time));
          MUS.beat++; MUS.next += 30 / MUS.bpm;
        }
      }
      let beatAt = 0;
      function hudBeatAt(at) { beatAt = at; }

      /* ---------------- layout + painting ---------------- */
      let L = null, PL = null, LAY = null, dirty = true, fullRecomp = true, warm = 0, warmT = 0, recompT = 0;
      const MS = 0.5; // the bloom mask is soft, so it lives at half resolution
      const bloomE = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 2); // an even spread, so ~10 recomposes a second read as smooth growth
      const blooms = [];
      function mk(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hh)); return { c, g: c.getContext('2d') }; }
      function layout() {
        const w = cv.w, hh = cv.h; if (!w || !hh) return false;
        const phone = w < 700;
        const s = phone ? clamp(Math.min(w / 390, hh / 800), 0.84, 1.1) : clamp(Math.min(w / 1000, hh / 720), 1.05, 1.45);
        let win, st, lp;
        if (phone) {
          const top = Math.round(clamp(hh * 0.225, 168, 200)), wh = Math.round(hh * 0.4);
          win = { x: 16, y: top, w: w - 32, h: wh };
          st = { x: 12, y: top - 86, size: 72, side: 'right' };
          lp = { x: w - 72, y: hh - 104, size: 64, side: 'left' };
        } else {
          const ww = Math.round(clamp(w * 0.48, 480, 660)), wh = Math.round(clamp(hh * 0.5, 330, 460));
          win = { x: Math.round((w - ww) / 2), y: 122, w: ww, h: wh };
          st = { x: 44, y: 126, size: 100, side: 'below' };
          lp = { x: w - 146, y: 126, size: 96, side: 'below' };
        }
        const sillY = win.y + win.h, tabY = Math.round(sillY + (phone ? 66 : 62) * s);
        const tab = phone ? { x: 0, w, y: tabY, h: hh - tabY } : { x: win.x - 130, w: win.w + 260, y: tabY, h: hh - tabY };
        L = { w, h: hh, phone, s, m: Math.round(18 * s), win, sillY, tab, still: st, loopie: lp, dpr: cv.dpr };
        const R = rngOf(K.daily() * 13 + 7);
        PL = SC.plan(L, R);
        items.forEach(it => { const p = (!phone && it.atD ? it.atD : it.at)(L, PL, IT); it.x = p.x; it.y = p.y + (it.dy ? it.dy * s : 0); if (p.clockY != null) it.clockY = p.clockY; it.hx = null; it.hy = null; });
        if (!still.moved) { still.place(st.x, st.y); still.side(st.side); still.el.style.setProperty('--sz', st.size + 'px'); }
        loopie.place(lp.x, lp.y); loopie.side(lp.side); loopie.el.style.setProperty('--sz', lp.size + 'px');
        return true;
      }
      const SPR = {};
      function sprites() {
        const d = L.dpr, warmS = mk(128 * d, 128 * d), wg = warmS.g;
        wg.fillStyle = rad(wg, 64 * d, 64 * d, 0, 64 * d, [[0, 'rgba(255,214,140,0.85)'], [0.25, 'rgba(255,190,110,0.38)'], [0.6, 'rgba(255,170,90,0.1)'], [1, 'rgba(255,170,90,0)']]); wg.fillRect(0, 0, 128 * d, 128 * d);
        SPR.warm = warmS.c;
        const soft = mk(64 * d, 64 * d), sg = soft.g;
        sg.fillStyle = rad(sg, 32 * d, 32 * d, 0, 32 * d, [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]); sg.fillRect(0, 0, 64 * d, 64 * d);
        SPR.soft = soft.c;
      }
      function greyOf(src) { // the grey-blue twin of a layer: desaturate (keep a little colour), tint, restore alpha
        const out = mk(src.c.width, src.c.height), g = out.g;
        g.drawImage(src.c, 0, 0);
        g.globalCompositeOperation = 'saturation'; g.globalAlpha = 1 - KEEP; g.fillStyle = '#808080'; g.fillRect(0, 0, out.c.width, out.c.height);
        g.globalAlpha = 1; g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(' + GT + ')'; g.fillRect(0, 0, out.c.width, out.c.height);
        g.globalCompositeOperation = 'destination-in'; g.drawImage(src.c, 0, 0);
        g.globalCompositeOperation = 'source-over';
        return out;
      }
      function paint() {
        if (!L) return;
        const d = L.dpr, D = K.dark(), Pal = SC.pal[D ? 'night' : 'day'];
        sprites(); items.forEach(it => { it.tile = null; });
        const R = rngOf(K.daily() * 31 + 3);
        const ow = L.win.w + 2 * L.m, oh = L.win.h + 2 * L.m;
        const oc = mk(ow * d, oh * d); oc.g.setTransform(d, 0, 0, d, d * L.m, d * L.m); SC.out(oc.g, L, Pal, R, PL);
        const gl = mk(L.win.w * d, L.win.h * d); gl.g.setTransform(d, 0, 0, d, 0, 0); SC.glass(gl.g, L, Pal, R, PL);
        const rc = mk(L.w * d, L.h * d); rc.g.setTransform(d, 0, 0, d, 0, 0); SC.room(rc.g, L, Pal, R, PL);
        const TB = { t: 0, s: L.s, k: 1, c: (hx, a) => tint(hx, 1, a), life: 0, act: 0, pulse: 0, squash: 0, D, spr: SPR, L };
        items.filter(it => it.bake && RN[it.bake] && !(it.desk && L.phone)).sort((a, b) => a.y - b.y).forEach(it => RN[it.bake](rc.g, it, TB));
        LAY = {
          out: { col: oc, grey: greyOf(oc), comp: mk(oc.c.width, oc.c.height), ox: Math.round((L.win.x - L.m) * d), oy: Math.round((L.win.y - L.m) * d) },
          room: { col: rc, grey: greyOf(rc), comp: mk(rc.c.width, rc.c.height), ox: 0, oy: 0 },
          glass: gl, mask: mk(L.w * d * MS, L.h * d * MS), tmp: mk(L.w * d, L.h * d), fog: LAY && LAY.fog && LAY.fog.c.width === gl.c.width ? LAY.fog : mk(gl.c.width, gl.c.height), pal: Pal
        };
        dirty = true; fullRecomp = true;
      }
      /* Colour comes back only where a bloom grows, so only that patch is recomposed (a dirty rectangle, in device pixels);
         the overall warmth is not baked in here at all: it is one alpha blit of the colour layer at draw time. */
      function bloomRect(now) {
        const d = L.dpr; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const b of blooms) {
          if (b.settled) continue;
          const k = (now - b.t0) / b.dur;
          if (k >= 1) b.settled = true; // finished: recomposed once more at full size, then left alone
          const r = b.R * bloomE(k) * 1.15 + 4; // the lobes reach 1.13 r
          x0 = Math.min(x0, b.x - r); y0 = Math.min(y0, b.y - r); x1 = Math.max(x1, b.x + r); y1 = Math.max(y1, b.y + r);
        }
        if (x1 < x0) return { x: 0, y: 0, w: 0, h: 0 };
        const X0 = clamp(Math.floor(x0 * d), 0, LAY.tmp.c.width), Y0 = clamp(Math.floor(y0 * d), 0, LAY.tmp.c.height), X1 = clamp(Math.ceil(x1 * d), 0, LAY.tmp.c.width), Y1 = clamp(Math.ceil(y1 * d), 0, LAY.tmp.c.height);
        return { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 };
      }
      function paintMask(now, rect) {
        const mg = LAY.mask.g, d = L.dpr * MS;
        mg.setTransform(1, 0, 0, 1, 0, 0); mg.save();
        if (rect) { const rx = Math.floor(rect.x * MS), ry = Math.floor(rect.y * MS), rw = Math.ceil(rect.w * MS) + 1, rh = Math.ceil(rect.h * MS) + 1; mg.beginPath(); mg.rect(rx, ry, rw, rh); mg.clip(); mg.clearRect(rx, ry, rw, rh); } else mg.clearRect(0, 0, LAY.mask.c.width, LAY.mask.c.height);
        mg.setTransform(d, 0, 0, d, 0, 0);
        let growing = false;
        for (const b of blooms) {
          const k = (now - b.t0) / b.dur; if (k < 1) growing = true;
          const r = b.R * bloomE(k); if (r < 2) continue;
          if (rect && (b.x + b.R * 1.15) * L.dpr < rect.x || rect && (b.x - b.R * 1.15) * L.dpr > rect.x + rect.w || rect && (b.y + b.R * 1.15) * L.dpr < rect.y || rect && (b.y - b.R * 1.15) * L.dpr > rect.y + rect.h) continue;
          for (let j = 0; j < 3; j++) {
            const a = b.seed + j * 2.1, ox = Math.cos(a) * r * 0.13, oy = Math.sin(a) * r * 0.13, rr2 = r * (0.8 + 0.1 * j);
            mg.fillStyle = rad(mg, b.x + ox, b.y + oy, rr2 * 0.42, rr2, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
            mg.fillRect(b.x + ox - rr2, b.y + oy - rr2, rr2 * 2, rr2 * 2);
          }
        }
        mg.restore();
        return growing;
      }
      let warmB = 0; // the warmth baked into the composites (re-baked in small steps; live only during the finale's wave)
      function compose(Ly, rect) { // comp = grey + colour at the baked warmth, with full colour through the bloom mask (inside rect only, when given)
        const tg = LAY.tmp.g, cg = Ly.comp.g, W = Ly.col.c.width, H = Ly.col.c.height;
        let x = 0, y = 0, w = W, hh = H;
        if (rect) { x = Math.max(0, rect.x - Ly.ox); y = Math.max(0, rect.y - Ly.oy); w = Math.min(W, rect.x + rect.w - Ly.ox) - x; hh = Math.min(H, rect.y + rect.h - Ly.oy) - y; if (w <= 0 || hh <= 0) return; }
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(x, y, w, hh); tg.drawImage(Ly.col.c, x, y, w, hh, x, y, w, hh);
        tg.globalCompositeOperation = 'destination-in'; tg.drawImage(LAY.mask.c, (x + Ly.ox) * MS, (y + Ly.oy) * MS, w * MS, hh * MS, x, y, w, hh); tg.globalCompositeOperation = 'source-over';
        cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(x, y, w, hh);
        cg.drawImage(Ly.grey.c, x, y, w, hh, x, y, w, hh);
        if (warmB > 0.003) { cg.globalAlpha = Math.min(1, warmB); cg.drawImage(Ly.col.c, x, y, w, hh, x, y, w, hh); cg.globalAlpha = 1; }
        cg.drawImage(LAY.tmp.c, x, y, w, hh, x, y, w, hh);
      }
      let flood = null; // the finale's colour wave from the cup: a soft circular wipe drawn live (no full-screen recomposing)
      const floodR = (now) => (flood ? flood.R * eOut((now - flood.t0) / flood.dur) : 0);
      function blitLayer(g, Ly, x, y) { // the composite; in the finale, the rest of the warmth and the wave are laid on live
        if (warm >= 0.997 && flood) { g.drawImage(Ly.col.c, x, y); return; }
        g.drawImage(Ly.comp.c, x, y);
        if (flood && warm > warmB + 0.002) { g.globalAlpha = clamp(1 - (1 - warm) / Math.max(0.001, 1 - warmB), 0, 1); g.drawImage(Ly.col.c, x, y); g.globalAlpha = 1; } // comp*(1-a) + col*a = grey*(1-warm) + col*warm
        const r = floodR(performance.now()) * L.dpr;
        if (r > 2 && warm < 0.997) for (const [f, a] of [[1, 0.3], [0.96, 0.4], [0.92, 0.55], [0.88, 1]]) {
          g.save(); g.beginPath(); g.arc(flood.x * L.dpr, flood.y * L.dpr, r * f, 0, TAU); g.clip(); g.globalAlpha = a; g.drawImage(Ly.col.c, x, y); g.restore();
        }
      }
      function bloom(x, y, R, dur) { blooms.push({ x, y, R, t0: performance.now(), dur: dur || 1500, seed: Math.random() * 6 }); dirty = true; }
      function bloomAt(x, y, now) { let k = 0; if (flood && Math.hypot(x - flood.x, y - flood.y) < floodR(now) * 0.9) return 1; for (const b of blooms) { const r = b.R * bloomE((now - b.t0) / b.dur), d = Math.hypot(x - b.x, y - b.y); if (d < r) k = Math.max(k, clamp((r - d) / (r * 0.5), 0, 1)); } return k; }

      /* ---------------- camera (gentle parallax) ---------------- */
      const cam = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, aimT: 0 };
      function aim(p) { if (!L) return; cam.tx = clamp((p.x / L.w - 0.5) * 1.6, -1, 1); cam.ty = clamp((p.y / L.h - 0.45) * 1.2, -1, 1); cam.aimT = performance.now(); }
      const ptOf = (it) => { const x = it.hx != null ? it.hx : it.x, y = it.hy != null ? it.hy : it.y; return it.zone === 'out' ? { x: x + cam.px, y: y + cam.py } : { x, y }; };
      const ctr = (it) => { const p = ptOf(it); return { x: p.x + (it.cx || 0) * L.s, y: p.y + (it.cy || 0) * L.s }; };

      /* ---------------- HUD ---------------- */
      let stepIdx = -1, count = 0;
      function hudSet(i, n) {
        SENSES.forEach((se, j) => {
          se.el.classList.toggle('sh-on', j === i); se.el.classList.toggle('sh-done', j < i);
          if (j === i) Array.from(se.el.querySelectorAll('.sh-pips i')).forEach((p, q) => p.classList.toggle('sh-p', q < n));
        });
      }
      function hudFlash(i) { const e = SENSES[i] && SENSES[i].el; if (!e) return; e.classList.remove('sh-flash'); void e.offsetWidth; e.classList.add('sh-flash'); }

      /* ---------------- tags and floating words ---------------- */
      function tag(it, label, sense) {
        const c = ctr(it), t = h('div', { class: 'sh-tag', 'aria-hidden': 'true' }, h('small', { text: String(count) }), document.createTextNode(label));
        el.append(t);
        const tw = t.offsetWidth || 120, th = t.offsetHeight || 32;
        let x = clamp(c.x - tw / 2, 10, L.w - tw - 10), y = c.y - (it.r || 30) * L.s - th - 8;
        if (y < 112) y = c.y + (it.r || 30) * L.s + 8;
        y = clamp(y, 108, L.h - th - 18);
        t.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(0.6)'; t.style.opacity = '0';
        K.anim(K.reduced() ? 120 : 380, (k) => { const e = K.ease.outBack(k); t.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (0.6 + 0.4 * e).toFixed(3) + ') rotate(' + ((1 - k) * -6).toFixed(1) + 'deg)'; t.style.opacity = String(Math.min(1, k * 2)); });
        sr.textContent = label;
        S.later(() => {
          const chip = SENSES[sense].el, r = K.rectIn(chip, el), tx = r.cx - tw / 2, ty = r.cy - th / 2;
          K.anim(K.reduced() ? 150 : 620, (k) => {
            const e = eIO(k), xx = lerp(x, tx, e), yy = lerp(y, ty, e) - Math.sin(k * Math.PI) * 40;
            t.style.transform = 'translate(' + xx.toFixed(1) + 'px,' + yy.toFixed(1) + 'px) scale(' + (1 - 0.7 * e).toFixed(3) + ')'; t.style.opacity = String(k > 0.8 ? (1 - k) / 0.2 : 1);
          }).then(() => { t.remove(); hudFlash(sense); });
        }, K.reduced() ? 700 : 1500);
      }
      function word(x, y, text) {
        const w = h('div', { class: 'sh-word' + (K.reduced() ? ' sh-calm' : ''), 'aria-hidden': 'true', text }); // reduced motion: shown still (the global rule would skip to the faded end)
        w.style.left = clamp(x, 84, L.w - 84) + 'px'; w.style.top = clamp(y, 110, L.h - 40) + 'px';
        el.append(w); S.later(() => w.remove(), 1600);
      }

      /* ---------------- feedback ---------------- */
      const ripples = [];
      function ripple(p, col, big) { ripples.push({ x: p.x, y: p.y, t0: performance.now(), col: col || '#fff6dc', big: big ? 1.8 : 1 }); }
      function miss(p) { ripple(p); if (A.ctx) { A.wood(undefined, 0.05, 0.7 + Math.random() * 0.3); A.sync('miss', performance.now()); } }

      /* ---------------- step: SEE five ---------------- */
      let phase = 'intro', finished = false, secretFound = false;
      function nextSee() { return SEE.filter(i => !i.found).sort((a, b) => a.order - b.order)[0] || null; }
      function guideSee(delay) {
        if (phase !== 'see') return;
        const it = nextSee(); if (!it) return;
        K.guide({ id: 'see', g: 'tap', target: () => ctr(it), label: count ? 'TAP WHAT YOU SEE' : 'TAP 5 THINGS YOU SEE', delay: delay == null ? 900 : delay });
      }
      function noticeFx(it, sense) {
        const c = ctr(it);
        bloom(c.x, c.y, (L.phone ? 112 : 136) * L.s * (it.zone === 'out' ? 0.9 : 1));
        P.emit('star', c.x, c.y, 14, { colors: ['#fff6d8', SENSES[sense].c, '#ffffff'], speed: [40, 150] });
        ripple(c, SENSES[sense].c, true);
      }
      function foundSee(it) {
        if (it.found || phase !== 'see') return;
        it.found = true; it.foundAt = performance.now(); it.t0 = performance.now() / 1000; count++;
        it.note = count - 1; MUS.motif.push(it);
        noticeFx(it, 0);
        K.sfx.chime(count + 1);
        if (A.ctx) { piano(SC.key[it.note], A.now() + 0.01, 0.16); if (FX[it.sound]) FX[it.sound](A); }
        tag(it, it.name, 0); hudSet(0, count);
        still.face(['happy', 'wow', 'love', 'happy', 'celebrate'][count - 1] || 'happy', 1400);
        if ((count === 1 || count === 3) && it.q) still.say(line({ Jolly: it.q[0], Cheeky: it.q[1], Unfiltered: it.q[2] }), { ms: 2800 });
        ctx.track('see', { n: count, item: it.id });
        if (count >= 5) { K.guide(null); S.later(seeDone, 700); }
        else guideSee(3600);
      }
      function seeDone() {
        warmT = 0.08; still.base('happy');
        still.say(line({ Jolly: 'Five! See the colour coming back? Now let’s listen.', Cheeky: 'Five. Look at you, noticing things. Ears next.', Unfiltered: 'Five seen. Colour’s back. Now listen.' }), { ms: 3200 });
        S.later(startHear, 1500);
      }
      function foundSecret(it) {
        if (secretFound || !it) return;
        secretFound = true; it.found = true; it.foundAt = performance.now(); it.t0 = performance.now() / 1000;
        const c = ctr(it);
        bloom(c.x, c.y, 80 * L.s); P.emit('star', c.x, c.y, 22, { colors: ['#fff3b0', '#ffd36b', '#ffffff'], speed: [50, 170] });
        K.sfx.sparkle(); if (A.ctx) ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.08, vol: 0.06, dur: 1.4 }));
        still.say(line({ Jolly: 'Ooh! You found the secret: ' + it.name + '. That’s going in the scrapbook.', Cheeky: 'Wait. You found ' + it.name + '? Regulars only. Scrapbook!', Unfiltered: 'Secret found: ' + it.name + '. Scrapbook.' }), { mood: 'wow', ms: 3200 });
        ctx.track('secret', { item: it.id });
      }

      /* ---------------- step: HEAR four (with the twist) ---------------- */
      let cur = null, callT = 0, misses = 0, noteUp = null, firstNote = true;
      const ints = inten === 0 ? ['after2', 'after3'] : inten === 2 ? ['after2', 'after2b', 'after3', 'after3b'] : ['after2', 'after3', 'after3b'];
      const noteQueue = [];
      function notes() {
        let labels;
        if (!ctx.text) labels = ['WHAT IF…', 'DID I FORGET SOMETHING?', 'I SHOULD BE DOING MORE', 'EVERYTHING AT ONCE'];
        else { const st = (an.strands || []).map(x => x.label).filter(Boolean); labels = st.slice(0, 3); if (an.core && an.core.label) labels.splice(Math.min(labels.length, ints.length - 1), 0, an.core.label); labels = labels.filter((v, i, a) => a.indexOf(v) === i); while (labels.length < 4) labels.push(['WHAT IF…', 'ONE MORE THING', 'DID I FORGET?', 'TOO MUCH'][labels.length]); }
        return labels;
      }
      function startHear() {
        phase = 'hear'; stepIdx = 1; count = 0; hudSet(1, 0); MUS.bass = true;
        still.say(line({ Jolly: 'Four sounds are hiding in here. Listen, then tap where each one comes from.', Cheeky: 'Ears on. Four sounds. Point at them like a very calm detective.', Unfiltered: 'Listen. Four sounds. Tap where each one comes from.' }), { ms: 3800 });
        S.later(nextHear, 1100);
      }
      function nextHear() {
        if (phase !== 'hear' || noteUp) return;
        if (count >= 4) { hearDone(); return; }
        for (const trig of (count === 2 ? ['after2', 'after2b'] : count === 3 ? ['after3', 'after3b'] : [])) {
          if (ints.includes(trig) && !nextHear[trig]) { nextHear[trig] = true; showNote(nextHear, trig.endsWith('b')); return; }
        }
        cur = HEAR[count]; misses = 0; cur.calls = 0;
        S.cancel(callT); callT = S.later(() => call(cur), 380);
        K.guide({ id: 'hear', g: 'tap', target: () => ctr(cur), label: 'TAP WHERE YOU HEAR IT', delay: 4200 });
      }
      function call(it) {
        if (phase !== 'hear' || cur !== it || it.found) return;
        if (noteUp) return;
        it.calls++; it.act = 1;
        const v = 1 + misses * 0.15;
        if (A.ctx && SND[it.sound]) { SND[it.sound].call(A, v); A.sync('call', performance.now()); }
        S.cancel(callT); callT = S.later(() => call(it), 3000);
      }
      function hearTap(p) {
        if (!cur) { miss(p); return; }
        const c = ctr(cur), reach = cur.r * L.s + 30 + misses * 14;
        if (dist(p, c) < reach) { foundHear(cur); return; }
        misses++; miss(p);
        cur.act = 1; cur.hint = 1;
        if (A.ctx && SND[cur.sound]) SND[cur.sound].call(A, 1.1);
        if (misses === 2) still.say(line({ Jolly: 'Listen again… it’s coming from ' + where(cur.pos) + '.', Cheeky: 'Warmer… try ' + where(cur.pos) + '.', Unfiltered: 'It’s ' + where(cur.pos) + '.' }), { ms: 2600 });
      }
      const where = (pos) => ({ left: 'the left', right: 'the right', above: 'up high', far: 'far away, outside' }[pos] || 'nearby');
      function foundHear(it) {
        if (it.found) return;
        it.found = true; it.foundAt = performance.now(); it.t0 = performance.now() / 1000; count++;
        S.cancel(callT); cur = null; it.act = 1;
        noticeFx(it, 1); tag(it, it.name, 1); hudSet(1, count);
        K.sfx.good(undefined, count + 3);
        if (A.ctx && SND[it.sound]) { SND[it.sound].call(A, 0.8); if (SND[it.sound].loop) { const lo = SND[it.sound].loop, lp = mkLoop(lo); if (lp) lp.level(lo.level, 2); } }
        it.nextAmb = performance.now() + (SND[it.sound] && SND[it.sound].every ? SND[it.sound].every * (0.5 + Math.random() * 0.5) : 1e12);
        still.face('happy', 1200);
        if (count === 1) still.say(line({ Jolly: 'That’s it! Keep listening.', Cheeky: 'Nice ears.', Unfiltered: 'Yes. Next.' }), { ms: 1800 });
        ctx.track('hear', { n: count, item: it.id, misses });
        K.guide(null);
        S.later(nextHear, 800);
      }
      function hearDone() {
        K.guide(null); warmT = 0.16;
        if (noteCount) { loopie.base('calm'); loopie.say(line({ Jolly: 'Alright. I’ll listen too.', Cheeky: 'Fine. I’ll just… listen. Weird. Nice.', Unfiltered: 'Okay. Listening now.' }), { ms: 2600 }); }
        S.later(() => still.say(line({ Jolly: 'Hear them all together? That’s right now.', Cheeky: 'Full soundscape. Very fancy. All of it, right now.', Unfiltered: 'Four heard. That’s the room, right now.' }), { ms: 3000 }), noteCount ? 1600 : 0);
        S.later(startTouch, noteCount ? 2700 : 2200);
      }

      /* the twist: the player's own loops ping in as notifications */
      let noteCount = 0;
      const noteLabels = [];
      function showNote(after, again) {
        if (!noteLabels.length) noteLabels.push(...notes());
        const label = noteLabels[noteCount % noteLabels.length]; noteCount++;
        K.guide(null); S.cancel(callT);
        const body = h('span', { class: 'gk-user', text: label });
        const n = h('div', { class: 'sh-note', role: 'alertdialog', 'aria-label': 'A thought: ' + label + '. Swipe it away.' },
          h('img', { alt: '', src: K.face('loopie', care() ? 'worried' : ['worried', 'think', 'shy', 'surprised'][noteCount % 4]) }),
          h('div', { class: 'sh-nt' }, h('div', { class: 'sh-nh' }, document.createTextNode('Loopie'), h('span', { text: 'now' })), body));
        n.style.top = (L.win.y + 12) + 'px';
        el.append(n);
        noteUp = { el: n, after, x: 0, bounces: 0, t0: performance.now() };
        alarmT = 1;
        void n.offsetWidth; n.classList.add('sh-in');
        S.later(() => { if (noteUp && noteUp.el === n && !K.reduced()) n.classList.add('sh-shake'); }, 450);
        if (A.ctx) { const t = A.now() + 0.05; [0, 0.18].forEach(o => { A.tone({ when: t + o, type: 'square', freq: 155, dur: 0.12, vol: 0.05, lp: 420 }); A.noise({ when: t + o, filter: 'bandpass', freq: 240, q: 2, dur: 0.12, vol: 0.06 }); }); A.busLevel('amb', 0.18, 0.25); A.sync('buzz', performance.now()); }
        S.buzz([40, 60, 40]);
        if (noteCount === 1) {
          loopie.show(true); loopie.base(care() ? 'worried' : 'worried'); loopie.react('bounce');
          S.later(() => loopie.say(care() ? line({ Jolly: 'Sorry. This one feels big.', Cheeky: 'Sorry. This one feels big.', Unfiltered: 'Sorry. Big one.' }) : line({ Jolly: 'Sorry! Just one quick thought…', Cheeky: 'Don’t mind me. Tiny urgent thought.', Unfiltered: 'Thought incoming. Sorry.' }), { ms: 2400 }), 250);
          S.later(() => still.say(care() ? line({ Jolly: 'That one matters. It can wait two minutes while you’re here. Swipe it aside gently.', Cheeky: 'That one matters. It can wait two minutes. Swipe it aside gently.', Unfiltered: 'That one’s real. It can wait two minutes. Swipe it aside, gently.' }) : line({ Jolly: 'Thoughts will ping. Swipe it away gently, then back to the sounds.', Cheeky: 'Classic. Swipe it away, gently. It’ll keep.', Unfiltered: 'Swipe it away. Gently. Back to listening.' }), { ms: 3600 }), 1600);
        } else {
          loopie.face(['shy', 'think', 'worried'][noteCount % 3], 1600);
          if (again && !care()) S.later(() => loopie.say(line({ Jolly: 'Also! Sorry. One more.', Cheeky: 'And another. They travel in pairs.', Unfiltered: 'One more. Sorry.' }), { ms: 2000 }), 300);
        }
        K.guide({ id: 'note', g: 'drag', dir: 'r', d: Math.min(150, L.w * 0.35), target: n, ox: 0.3, oy: 0.55, label: 'SWIPE IT AWAY GENTLY', delay: noteCount === 1 ? 2400 : 900, place: 'below' });
        K.drag(n, {
          start: () => { if (!noteUp || noteUp.el !== n) return false; n.classList.add('sh-drag'); n.classList.remove('sh-shake'); K.sfx.tap(); const r = K.rectIn(n, el); noteUp.room = { r: Math.max(8, L.w - r.x - r.w), l: Math.max(8, r.x) }; },
          move: (p, dd) => {
            if (!noteUp || noteUp.el !== n) return;
            noteUp.x = dd.dx;
            const room = noteUp.room || { r: 40, l: 40 }, lim = dd.dx > 0 ? room.r : room.l, k = clamp(Math.abs(dd.dx) / (lim + 2), 0, 1);
            const vx = Math.sign(dd.dx) * Math.min(Math.abs(dd.dx), lim) * (L.phone ? 1 : 1);
            n.style.transform = 'translate(calc(-50% + ' + vx.toFixed(1) + 'px), ' + (Math.abs(vx) * -0.05).toFixed(1) + 'px) rotate(' + (vx * 0.04).toFixed(2) + 'deg) scale(' + (1 - k * 0.06).toFixed(3) + ')';
            n.style.opacity = String(Math.max(0, 1 - Math.pow(k, 1.4)).toFixed(3));
          },
          end: (p, dd) => {
            if (!noteUp || noteUp.el !== n) return;
            n.classList.remove('sh-drag');
            const fast = Math.abs(dd.vx) > 2600 && noteUp.bounces < 2;
            if (fast) { noteUp.bounces++; n.style.transform = ''; n.style.opacity = ''; ripple({ x: L.w / 2, y: L.win.y + 40 }, '#ffb3a1'); if (A.ctx) A.boing({ freq: 300, vol: 0.08 }); if (noteUp.bounces === 1) still.say(line({ Jolly: 'Shoving thoughts makes them bounce back. Gently…', Cheeky: 'Ooh, it bounced. Thoughts hate being shoved.', Unfiltered: 'Too hard. It bounces back. Slower.' }), { ms: 2600 }); return; }
            const room = noteUp.room || { r: 40, l: 40 }, need = Math.min(110, L.w * 0.26, (dd.dx > 0 ? room.r : room.l) + 26);
            if (Math.abs(dd.dx) > need || Math.abs(dd.vx) > 650) dismissNote(Math.sign(dd.dx || dd.vx || 1));
            else { n.style.transform = ''; n.style.opacity = ''; }
          }
        });
      }
      function dismissNote(dir) {
        const nu = noteUp; if (!nu) return;
        noteUp = null; alarmT = 0;
        const n = nu.el;
        const room = nu.room || { r: 30, l: 30 };
        n.classList.add('sh-gone'); n.style.opacity = '0'; n.style.transform = 'translate(calc(-50% + ' + (dir * (dir > 0 ? room.r : room.l)).toFixed(0) + 'px), -12px) rotate(' + (dir * 6) + 'deg) scale(0.9)';
        S.later(() => { n.style.visibility = 'hidden'; }, 260); S.later(() => n.remove(), 520);
        K.sfx.whoosh(); if (A.ctx) { A.busLevel('amb', 0.55, 0.8); A.tone({ type: 'sine', freq: 520, to: 260, glide: 0.4, dur: 0.5, vol: 0.04 }); }
        P.emit('dust', L.w / 2 + dir * 80, L.win.y + 40, 16, { colors: ['rgba(230,230,240,0.6)'] });
        const quick = performance.now() - nu.t0 < 1200;
        loopie.face(quick && !care() ? 'surprised' : 'calm', 1500);
        if (noteCount === 1) S.later(() => loopie.say(care() ? line({ Jolly: 'Okay. I’ll keep it safe for later.', Cheeky: 'Okay. I’ll keep it safe for later.', Unfiltered: 'Okay. Later.' }) : quick ? line({ Jolly: 'Okay, okay. Later.', Cheeky: 'Rude. Fair, but rude.', Unfiltered: 'Fine. Later.' }) : line({ Jolly: 'Okay. Later is fine.', Cheeky: 'Gently dismissed. I feel respected.', Unfiltered: 'Okay. Later.' }), { ms: 2200 }), 200);
        ctx.track('note', { n: noteCount, bounces: nu.bounces });
        S.later(() => { if (nu.after) nu.after(); }, 520);
      }
      let alarm = 0, alarmT = 0, drone = null;

      /* ---------------- step: TOUCH three ---------------- */
      let rub = null, rubLoop = null, rubKind = '';
      const RUB_NEED = [380, 520, 640][inten];
      function startTouch() {
        phase = 'touch'; stepIdx = 2; count = 0; hudSet(2, 0); MUS.pad = 0.5;
        still.say(line({ Jolly: 'Three things to touch. Rub each one slowly and notice how it feels.', Cheeky: 'Hands now. Three textures. Rub like you mean it. Slowly.', Unfiltered: 'Touch. Three things. Rub slowly. Notice the feel.' }), { ms: 3600 });
        guideTouch(1600);
      }
      function guideTouch(delay) {
        if (phase !== 'touch') return;
        const it = TOUCH.find(x => !x.found); if (!it) return;
        K.guide({ id: 'touch', g: 'sweep', target: () => ctr(it), d: 30, label: 'RUB IT SLOWLY', delay: delay == null ? 900 : delay });
      }
      function texTile(it) {
        if (it.tile) return it.tile;
        const d = L.dpr, S2 = 240, tile = mk(S2 * d, S2 * d), g = tile.g, R = rngOf(it.order * 97 + 5), b = it.tex.base;
        g.setTransform(d, 0, 0, d, 0, 0);
        g.fillStyle = b; g.fillRect(0, 0, S2, S2);
        if (it.kind === 'knit') {
          for (let y = 0, r = 0; y < S2 + 12; y += 12, r++) for (let x = (r % 2) * 5; x < S2 + 10; x += 10) {
            const col = Math.floor(y / 48) % 2 ? it.tex.alt : b;
            g.fillStyle = dk(col, 0.25); g.beginPath(); g.ellipse(x - 2.5, y + 5, 3.4, 6.5, 0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + 2.5, y + 5, 3.4, 6.5, -0.5, 0, TAU); g.fill();
            g.fillStyle = col; g.beginPath(); g.ellipse(x - 2.5, y + 4, 2.6, 5.6, 0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + 2.5, y + 4, 2.6, 5.6, -0.5, 0, TAU); g.fill();
            g.fillStyle = lt(col, 0.3); g.fillRect(x - 3.5, y + 1, 1.2, 4);
          }
          g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 0.6; for (let i = 0; i < 260; i++) { const x = R() * S2, y = R() * S2, a = R() * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); g.stroke(); }
        } else if (it.kind === 'plaid' || it.kind === 'terry') {
          if (it.kind === 'plaid') { for (let x = 0; x < S2; x += 40) { g.fillStyle = hexA(it.tex.alt, 0.55); g.fillRect(x, 0, 12, S2); g.fillRect(0, x, S2, 12); g.fillStyle = 'rgba(245,232,205,0.35)'; g.fillRect(x + 22, 0, 3, S2); g.fillRect(0, x + 22, S2, 3); } }
          else { for (let x = 0; x < S2; x += 30) { g.fillStyle = Math.floor(x / 30) % 2 ? '#f6f1e6' : hexA(it.tex.alt, 0.8); g.fillRect(x, 0, 30, S2); } }
          for (let y = 0; y < S2; y += 5) for (let x = (y / 5 % 2) * 2.5; x < S2; x += 5) { g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.stroke(); }
          g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 0.6; for (let i = 0; i < 300; i++) { const x = R() * S2, y = R() * S2, a = R() * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); g.stroke(); }
        } else if (it.kind === 'stone' || it.kind === 'metal' || it.kind === 'velvet') {
          g.fillStyle = lin(g, 0, 0, S2, S2, [[0, lt(b, 0.3)], [0.5, b], [1, dk(b, 0.3)]]); g.fillRect(0, 0, S2, S2);
          if (it.kind === 'stone') { grain(g, 0, 0, S2, S2, R, 900, 'rgba(40,40,46,0.35)', 1.4); grain(g, 0, 0, S2, S2, R, 500, 'rgba(255,255,255,0.3)', 1.2); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(S2 * 0.35, S2 * 0.32, S2 * 0.32, S2 * 0.08, -0.5, 0, TAU); g.fill(); }
          else if (it.kind === 'metal') { for (let y = 0; y < S2; y += 1.5) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'; g.fillRect(0, y, S2, 0.8); } g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, S2 * 0.36, S2, S2 * 0.08); }
          else { for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.06 + R() * 0.08) + ')'; g.beginPath(); g.ellipse(R() * S2, R() * S2, S2 * 0.4, S2 * 0.06, R() * 3, 0, TAU); g.fill(); } grain(g, 0, 0, S2, S2, R, 400, 'rgba(0,0,0,0.12)', 1); }
        } else if (it.kind === 'bark') {
          g.fillStyle = '#ece6da'; g.fillRect(0, 0, S2, S2);
          for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(30,26,22,0.85)'; g.fillRect(R() * S2, R() * S2, 10 + R() * 26, 2 + R() * 3); }
          for (let i = 0; i < 20; i++) { g.strokeStyle = 'rgba(160,140,110,0.5)'; g.lineWidth = 1; const y = R() * S2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= S2; x += 12) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 2); g.stroke(); }
          for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(214,170,120,0.6)'; g.beginPath(); g.ellipse(R() * S2, R() * S2, 14, 5, R(), 0, TAU); g.fill(); }
        } else if (it.kind === 'rope') {
          for (let k = -S2; k < S2 * 2; k += 14) { g.fillStyle = lin(g, k, 0, k + 14, 0, [[0, dk(b, 0.3)], [0.5, lt(b, 0.25)], [1, dk(b, 0.3)]]); g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 14, 0); g.lineTo(k + 14 - S2 * 0.6, S2); g.lineTo(k - S2 * 0.6, S2); g.closePath(); g.fill(); }
          g.strokeStyle = 'rgba(255,240,210,0.25)'; g.lineWidth = 0.6; for (let i = 0; i < 260; i++) { const x = R() * S2, y = R() * S2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y - 2); g.stroke(); }
        } else if (it.kind === 'clay') {
          g.fillStyle = lin(g, 0, 0, 0, S2, [[0, lt(b, 0.12)], [1, dk(b, 0.12)]]); g.fillRect(0, 0, S2, S2);
          grain(g, 0, 0, S2, S2, R, 1400, 'rgba(90,40,20,0.35)', 1.3); grain(g, 0, 0, S2, S2, R, 700, 'rgba(255,220,190,0.25)', 1.1);
          for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(70,30,15,0.4)'; g.beginPath(); g.arc(R() * S2, R() * S2, 1 + R() * 2, 0, TAU); g.fill(); }
        } else if (it.kind === 'glaze') {
          g.fillStyle = lin(g, 0, 0, S2, S2, [[0, lt(b, 0.25)], [0.5, b], [1, dk(b, 0.2)]]); g.fillRect(0, 0, S2, S2);
          g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(S2 * 0.35, S2 * 0.3, S2 * 0.4, S2 * 0.08, -0.6, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(60,80,90,0.18)'; g.lineWidth = 0.7; for (let i = 0; i < 40; i++) { let x = R() * S2, y = R() * S2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 22; y += (R() - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }
          grain(g, 0, 0, S2, S2, R, 300, 'rgba(255,255,255,0.25)', 1);
        } else {
          for (let y = 0; y < S2; y += 3) { g.strokeStyle = R() < 0.5 ? 'rgba(40,20,8,0.25)' : 'rgba(255,220,180,0.10)'; g.lineWidth = 1 + R() * 1.4; const a = R() * 6; g.beginPath(); for (let x = 0; x <= S2; x += 6) { const py = y + Math.sin(x * 0.03 + a) * 3 + Math.sin(x * 0.11 + a * 2) * 0.8; if (x) g.lineTo(x, py); else g.moveTo(x, py); } g.stroke(); }
          for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(30,14,4,0.4)'; g.fillRect(R() * S2, R() * S2, 2.4, 0.9); }
          g.fillStyle = 'rgba(40,20,8,0.3)'; g.beginPath(); g.ellipse(S2 * 0.6, S2 * 0.5, 14, 6, 0, 0, TAU); g.fill();
        }
        it.tile = tile.c; return it.tile;
      }
      function touchDown(p) {
        const it = TOUCH.filter(x => !x.found).sort((a, b) => dist(p, ctr(a)) - dist(p, ctr(b)))[0];
        if (!it || dist(p, ctr(it)) > it.r * L.s + 34) { miss(p); return; }
        rub = { it, last: p, dir: 0, speed: 0, lx: p.x, ly: p.y, ox: 0, oy: 0, tLast: performance.now(), wordI: Math.floor(it.rub / RUB_NEED * 3) };
        texTile(it);
        const tx = TEX[it.kind] || TEX.knit;
        if (rubKind !== it.kind) { if (rubLoop) rubLoop.stop(); rubLoop = mkLoop(Object.assign({ bus: 'sfx' }, tx.loop)); rubKind = it.kind; }
        K.sfx.tap(); it.squash = 1;
      }
      function touchMove(p) {
        if (!rub) return;
        const it = rub.it, now = performance.now(), dt = Math.max(8, now - rub.tLast), d = dist(p, rub.last);
        rub.tLast = now; rub.speed = rub.speed * 0.7 + (d / dt * 1000) * 0.3;
        rub.ox += p.x - rub.last.x; rub.oy += p.y - rub.last.y; rub.lx = p.x; rub.ly = p.y;
        const inside = dist(p, ctr(it)) < it.r * L.s * 1.9 + 20;
        if (inside) {
          it.rub += Math.min(d, 40);
          const sx = Math.sign(p.x - rub.last.x);
          if (sx && rub.dir && sx !== rub.dir) { it.rub += 14; it.squash = Math.max(it.squash, 0.7); const tx = TEX[it.kind]; if (tx) S.buzz(tx.buzz); if (tx && tx.clicks && A.ctx) A.click({ vol: 0.03 }); }
          if (sx) rub.dir = sx;
          if (Math.random() < 0.25) P.emit('dust', p.x, p.y, 1, { colors: [hexA(lt(it.tex.base, 0.4), 0.7)], speed: [10, 40] });
        }
        rub.last = p;
        if (rubLoop) { const tx = TEX[it.kind] || TEX.knit; rubLoop.level(inside ? clamp(rub.speed / 900, 0, 1) * tx.max : 0.0001, 0.05); }
        const wi = Math.floor(clamp(it.rub / RUB_NEED, 0, 0.999) * 3);
        if (wi > rub.wordI) { rub.wordI = wi; word(p.x, p.y - 80 * L.s, it.words[Math.min(2, wi - 1)]); if (A.ctx) A.pluck(A.note(SC.key[(wi + 2) % SC.key.length]), { vol: 0.08, damp: 0.996, verb: 0.3 }); }
        if (it.rub >= RUB_NEED) felt(it);
      }
      function touchUp() { if (rubLoop) rubLoop.level(0.0001, 0.08); if (rub && !rub.it.found) guideTouch(4000); rub = null; }
      function felt(it) {
        if (it.found) return;
        it.found = true; it.foundAt = performance.now(); it.t0 = performance.now() / 1000; count++;
        if (rub && rub.it === it) { word(rub.lx, rub.ly - 80 * L.s, it.words[2]); }
        rub = null; if (rubLoop) rubLoop.level(0.0001, 0.08);
        it.squash = 1.4; noticeFx(it, 2); tag(it, it.name, 2); hudSet(2, count);
        K.sfx.great(); S.buzz([20, 40, 20]);
        still.face('love', 1400);
        if (count === 1) S.later(() => still.say(line({ Jolly: 'Your screen counts too. Cool glass, right under your thumb.', Cheeky: 'Bonus texture: the glass you’re rubbing. Feel that.', Unfiltered: 'The glass under your thumb counts too. Notice it.' }), { ms: 3200 }), 700);
        ctx.track('touch', { n: count, item: it.id });
        if (count >= 3) { K.guide(null); S.later(touchDone, 900); } else guideTouch(3200);
      }
      function touchDone() {
        warmT = 0.24; MUS.pad = 1;
        still.say(line({ Jolly: 'Three felt. Now two smells. Follow the curl up slowly, like a slow breath in.', Cheeky: 'Nose time. Trace the smell up. Slowly. It’s not a race.', Unfiltered: 'Smell. Trace it up slowly. Breathe in as you go.' }), { ms: 3800 });
        S.later(startSmell, 1200);
      }

      /* ---------------- step: SMELL two (a slow drag = a slow breath in) ---------------- */
      let sc = null, inhale = null, smellIdx = 0;
      const T_MIN = [3.0, 3.8, 4.6][inten];
      const breathTimes = []; let aheadT = 0, traceT = 0;
      function startSmell() { phase = 'smell'; stepIdx = 3; count = 0; smellIdx = 0; hudSet(3, 0); setupScent(SMELL[0]); }
      function setupScent(it) {
        const src0 = ptOf(it), src = { x: src0.x, y: src0.y + (it.sy || 0) * L.s }, top = L.phone ? L.win.y + 26 * L.s : L.win.y + 40 * L.s, H = src.y - top, n = 64, pts = [];
        const amp = (L.phone ? 22 : 30) * L.s, ph = it.order * 1.7;
        for (let i = 0; i <= n; i++) { const f = i / n, y = src.y - H * f, x = src.x + Math.sin(f * Math.PI * 2.3 + ph) * amp * Math.min(1, f * 6) * (0.7 + 0.5 * f); pts.push({ x: clamp(x, 26, L.w - 26), y, l: 0 }); }
        for (let i = 1; i <= n; i++) pts[i].l = pts[i - 1].l + dist(pts[i - 1], pts[i]);
        sc = { it, pts, len: pts[n].l, p: 0, target: 0, tracing: false, t0: 0, done: false, fade: 0 };
        it.act = 1;
        K.guide({ id: 'smell' + it.id, g: 'drag', dir: 'u', d: 70, target: movingAlong(), label: 'TRACE IT UP SLOWLY', delay: 1200, ms: 3000 });
      }
      let gShown = performance.now();
      S.on('guide', (e) => { if (e && e.visible) gShown = performance.now(); });
      function movingAlong() { return () => { if (!sc) return null; const k = ((performance.now() - gShown) % 3000) / 3000, f = clamp(sc.p + k * 0.35, 0, 1); return at(f); }; }
      function at(f) { const n = sc.pts.length - 1, i = clamp(Math.floor(f * n), 0, n - 1), u = f * n - i, a = sc.pts[i], b = sc.pts[i + 1]; return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) }; }
      function smellDown(p) {
        if (!sc || sc.done) { miss(p); return; }
        const o = at(sc.p);
        if (dist(p, o) > 80 * L.s && dist(p, ptOf(sc.it)) > 80 * L.s) { miss(p); return; }
        sc.tracing = true; if (!sc.t0) sc.t0 = performance.now(); K.sfx.tap();
        if (!inhale) inhale = mkLoop({ pink: true, filter: 'bandpass', freq: 600, q: 0.9, bus: 'sfx' });
        smellMove(p);
      }
      function smellMove(p) {
        if (!sc || !sc.tracing || sc.done) return;
        const n = sc.pts.length - 1, i0 = Math.max(0, Math.floor(sc.p * n) - 3), i1 = Math.min(n, Math.floor(sc.p * n) + 22);
        let best = -1, bd = 1e9;
        for (let i = i0; i <= i1; i++) { const d = dist(p, sc.pts[i]); if (d < bd) { bd = d; best = i; } }
        if (best >= 0 && bd < 90 * L.s) sc.target = Math.max(sc.target, best / n);
      }
      function smellUp() { if (sc) sc.tracing = false; if (inhale) inhale.level(0.0001, 0.1); }
      function scentDone() {
        const it = sc.it; sc.done = true; sc.tracing = false;
        it.found = true; it.foundAt = performance.now(); count++;
        const secs = (performance.now() - sc.t0) / 1000; breathTimes.push(secs);
        if (inhale) inhale.level(0.0001, 0.15);
        if (A.ctx) { A.noise({ pink: true, filter: 'bandpass', freq: 1300, to: 360, q: 0.8, dur: 2.4, attack: 0.25, vol: 0.07 }); ['', ''].forEach((_, q) => A.chime(A.note(SC.key[(q * 2 + 2) % SC.key.length]), { when: A.now() + q * 0.12, vol: 0.06, dur: 1.8 })); }
        K.sfx.chime(count + 5);
        const top = sc.pts[sc.pts.length - 1];
        bloom(top.x, top.y, 110 * L.s); noticeFx(it, 3);
        P.emit('petal', top.x, top.y, 18, { colors: [it.col, lt(it.col, 0.4), '#fff6e0'], speed: [40, 120] });
        word(top.x, top.y + 30, it.words[0] + ', ' + it.words[1]);
        tag(it, it.name, 3); hudSet(3, count);
        still.face('calm', 1800);
        ctx.track('smell', { n: count, secs: Math.round(secs * 10) / 10 });
        K.guide(null);
        S.later(() => {
          if (count === 1) still.say(line({ Jolly: 'And breathe out… Lovely. One more.', Cheeky: 'And out. Nose: officially working. One more.', Unfiltered: 'Out. Good. One more.' }), { ms: 2600 });
          S.later(() => { sc = null; if (count >= 2) smellDone(); else setupScent(SMELL[1]); }, 900);
        }, 600);
      }
      function smellDone() {
        warmT = 0.32;
        still.say(line({ Jolly: 'Last one. Something to taste. Pick whichever you fancy.', Cheeky: 'Final course. Choose your flavour.', Unfiltered: 'One taste. Pick one.' }), { ms: 3200 });
        S.later(startTaste, 1000);
      }

      /* ---------------- step: TASTE one (hold for a slow sip) ---------------- */
      const TASTES = { tea: { col: '#b5652e', words: ['warm', 'malty', 'soft'], verb: 'sip' }, mint: { col: '#7fcf9a', words: ['cool', 'bright', 'fresh'], verb: 'sip' }, orange: { col: '#f39a2b', words: ['sweet', 'tangy', 'juicy'], verb: 'bite' } };
      const SIP_MS = [2400, 3000, 3600][inten];
      const tray = { k: 0, on: false, chosen: null, sip: 0, done: false, pos: {}, active: false };
      function trayPos() {
        const cx = L.phone ? L.w * 0.44 : L.win.x + L.win.w * 0.42, cy = L.phone ? L.tab.y + L.tab.h * 0.66 : L.tab.y + L.tab.h * 0.66, gap = (L.phone ? 86 : 118) * L.s;
        return { cx, cy, tea: { x: cx - gap, y: cy }, mint: { x: cx, y: cy }, orange: { x: cx + gap, y: cy } };
      }
      function startTaste() {
        phase = 'taste'; stepIdx = 4; count = 0; hudSet(4, 0);
        tray.on = true; tray.pos = trayPos();
        if (A.ctx) { A.wood(undefined, 0.12, 0.6); A.whoosh({ from: 300, to: 900, dur: 0.5, vol: 0.05 }); }
        K.anim(K.reduced() ? 150 : 700, (k) => { tray.k = eOut(k); }).then(() => {
          tasteBtns.forEach(b => { const p = tray.pos[b.dataset.k]; b.style.left = p.x + 'px'; b.style.top = p.y + 'px'; b.hidden = false; });
          K.guide({ id: 'taste', g: 'choose', target: () => tasteBtns.filter(b => !b.hidden), label: 'PICK ONE TASTE', delay: 900 });
        });
      }
      tasteBtns.forEach(b => {
        K.tap(b, () => {
          if (phase !== 'taste' || tray.chosen) return;
          tray.chosen = b.dataset.k; K.sfx.pop(); tasteBtns.forEach(x => { x.hidden = true; });
          const p = tray.pos[tray.chosen], c = { x: tray.pos.cx, y: tray.pos.cy };
          tray.cx = p.x; tray.cy = p.y; tray.others = 1;
          K.anim(K.reduced() ? 150 : 600, (k) => { const e = eIO(k); tray.cx = lerp(p.x, c.x, e); tray.cy = lerp(p.y, c.y, e); tray.others = 1 - k; }).then(() => {
            sipBtn.style.left = c.x + 'px'; sipBtn.style.top = c.y + 'px'; sipBtn.hidden = false; tray.active = true;
            sipBtn.setAttribute('aria-label', 'Hold for a slow ' + TASTES[tray.chosen].verb);
            K.guide({ id: 'sip', g: 'hold', target: sipBtn, label: TASTES[tray.chosen].verb === 'bite' ? 'HOLD FOR A SLOW BITE' : 'HOLD FOR A SLOW SIP', ms: SIP_MS + 400, delay: 700 });
            still.say(line({ Jolly: 'Hold it for a slow ' + TASTES[tray.chosen].verb + '. Notice the taste.', Cheeky: 'Slow ' + TASTES[tray.chosen].verb + '. No gulping. Savour it.', Unfiltered: 'Hold. Slow ' + TASTES[tray.chosen].verb + '. Taste it.' }), { ms: 2800 });
          });
          ctx.track('taste', { kind: tray.chosen });
        });
      });
      let sipLoop = null, sipWord = 0;
      const sipHold = { on: false };
      K.press(sipBtn, {
        down: () => { if (!tray.active) return; sipHold.on = true; if (!sipLoop) sipLoop = mkLoop({ pink: true, filter: 'lowpass', freq: 700, q: 0.7, bus: 'sfx' }); K.sfx.tap(); },
        up: () => { sipHold.on = false; }
      });
      S.listen(sipBtn, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); if (tray.active) { sipHold.on = true; if (!sipLoop) sipLoop = mkLoop({ pink: true, filter: 'lowpass', freq: 700, q: 0.7, bus: 'sfx' }); } } });
      S.listen(sipBtn, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') sipHold.on = false; });
      function stepSip(rdt) {
        if (!tray.active) { sipHold.on = false; return; }
        const k0 = tray.sip;
        tray.sip = sipHold.on ? Math.min(1, tray.sip + rdt * 1000 / SIP_MS) : Math.max(0, tray.sip - rdt * 0.5);
        tray.holding = sipHold.on;
        if (sipLoop) sipLoop.level(sipHold.on ? 0.05 + tray.sip * 0.03 : 0.0001, 0.08);
        const wi = Math.floor(tray.sip * 3.2);
        if (sipHold.on && wi > sipWord && wi <= 3) { sipWord = wi; const T2 = TASTES[tray.chosen]; word(tray.pos.cx, tray.pos.cy - 90 * L.s, T2.words[wi - 1]); if (A.ctx) A.pluck(A.note(SC.key[(wi + 3) % SC.key.length]), { vol: 0.09, damp: 0.996, verb: 0.35 }); }
        if (tray.sip >= 1 && k0 < 1) { sipHold.on = false; tasted(); }
      }
      function tasted() {
        tray.active = false; tray.done = true; sipBtn.hidden = true; count = 1; hudSet(4, 1);
        if (sipLoop) sipLoop.level(0.0001, 0.2);
        K.guide(null); K.sfx.great();
        const c = { x: tray.pos.cx, y: tray.pos.cy };
        P.emit('star', c.x, c.y - 30, 24, { colors: ['#fff6d8', TASTES[tray.chosen].col, '#ffffff'], speed: [50, 170] });
        S.later(finale, 700);
      }

      /* ---------------- input ---------------- */
      K.press(stage, {
        down: (p) => {
          aim(p);
          if (phase === 'see' || phase === 'hear') { if (SECRET && !SECRET.found && dist(p, ctr(SECRET)) < SECRET.r * L.s + 10) { foundSecret(SECRET); return; } }
          if (phase === 'see') { const it = SEE.filter(i => !i.found).map(i => ({ i, d: dist(p, ctr(i)) })).filter(o => o.d < o.i.r * L.s + 16).sort((a, b) => a.d - b.d)[0]; if (it) foundSee(it.i); else { miss(p); shimmerNear(p); } }
          else if (phase === 'hear') { if (noteUp) { noteUp.el.classList.remove('sh-shake'); if (!K.reduced()) { void noteUp.el.offsetWidth; noteUp.el.classList.add('sh-shake'); } K.sfx.soft(); return; } hearTap(p); }
          else if (phase === 'touch') touchDown(p);
          else if (phase === 'smell') smellDown(p);
          else ripple(p);
        },
        move: (p) => { if (phase === 'touch') touchMove(p); else if (phase === 'smell') smellMove(p); },
        up: () => { if (phase === 'touch') touchUp(); else if (phase === 'smell') smellUp(); }
      });
      function shimmerNear(p) { const it = SEE.filter(i => !i.found).sort((a, b) => dist(p, ctr(a)) - dist(p, ctr(b)))[0]; if (it) it.shimmer = 1; }
      K.onKey(['Space', 'Enter'], (e) => { // keyboard: notice the next thing in the current step
        if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('sh-taste')) return;
        e.preventDefault();
        if (phase === 'see') { const it = nextSee(); if (it) foundSee(it); }
        else if (phase === 'hear') { if (noteUp) dismissNote(1); else if (cur) foundHear(cur); }
        else if (phase === 'touch') { const it = TOUCH.find(x => !x.found); if (it) { it.rub += RUB_NEED * 0.34; if (it.rub >= RUB_NEED) felt(it); else { it.squash = 1; K.sfx.tap(); } } }
        else if (phase === 'smell' && sc && !sc.done) { sc.target = Math.min(1, sc.target + 0.2); if (!sc.t0) sc.t0 = performance.now(); sc.tracing = true; S.later(() => { if (sc) sc.tracing = false; }, 900); }
      });

      /* ---------------- frame loop ---------------- */
      let half = 0, accDt = 0, drawn = 0, busyUntil = 0, lastNow = 0, lastDraw = 0;
      const QG = { ema: 0, n: 0, dropped: false }; // quality guard: a 2x canvas that cannot keep up drops to an exact 1x (cheap to scale)
      K.loop((dt, t) => {
        if (!LAY || !L) return;
        const now = performance.now(), rdt = clamp((now - (lastNow || now)) / 1000, 0, 0.25); lastNow = now;
        musicTick();
        // camera: slow idle drift plus a lean toward where the player last touched
        if (!K.reduced()) { const idle = now - cam.aimT > 2600; const tx = idle ? Math.sin(t * 0.11) * 0.45 : cam.tx, ty = idle ? Math.sin(t * 0.07 + 1) * 0.3 : cam.ty; cam.x += (tx - cam.x) * Math.min(1, rdt * 0.9); cam.y += (ty - cam.y) * Math.min(1, rdt * 0.9); }
        const d = L.dpr; cam.px = Math.round(-cam.x * L.m * 0.8 * d) / d; cam.py = Math.round(-cam.y * L.m * 0.45 * d) / d;
        warm += (warmT - warm) * Math.min(1, rdt * 1.6);
        alarm += (alarmT - alarm) * Math.min(1, rdt * 3);
        for (const it of items) {
          if (it.found) it.life = Math.min(1, it.life + rdt / 0.9);
          it.act = Math.max(0, it.act - rdt * 0.55); it.pulse = Math.max(0, it.pulse - rdt * 1.6); it.shimmer = Math.max(0, it.shimmer - rdt * 0.7); it.squash = Math.max(0, it.squash - rdt * 2.4); it.hint = Math.max(0, (it.hint || 0) - rdt * 0.25);
          if (it.role === 'hear' && it.found && it.nextAmb && now > it.nextAmb && phase !== 'end') { it.nextAmb = now + SND[it.sound].every * (0.8 + Math.random() * 0.4); if (A.ctx && !noteUp) SND[it.sound].call(A, 0.32); it.act = 0.5; }
        }
        while (pulses.length && pulses[0].at <= now) { const pu = pulses.shift(); pu.it.pulse = 1; }
        if (beatAt && now >= beatAt && stepIdx >= 0 && stepIdx < 5 && !K.reduced()) { beatAt = 0; const e = SENSES[stepIdx].el; e.classList.remove('sh-beat'); void e.offsetWidth; e.classList.add('sh-beat'); }
        if (sipHold.on || (tray.active && tray.sip > 0)) stepSip(rdt);
        if (phase === 'see' && Math.random() < dt * 0.4) { const un = SEE.filter(i => !i.found); if (un.length) un[Math.floor(Math.random() * un.length)].shimmer = 1; }
        if (sc && !sc.done) {
          const was = sc.p;
          if (sc.tracing && sc.target > sc.p) { sc.p = Math.min(sc.target, sc.p + rdt / T_MIN); traceT += rdt; if (sc.target - sc.p > 0.12) aheadT += rdt; }
          const moving = sc.p > was + 1e-5;
          if (inhale) { inhale.level(moving ? 0.07 : 0.0001, 0.08); inhale.freq(480 + sc.p * 1300, 0.1); }
          if (moving && Math.random() < dt * 14) { const q = at(sc.p); P.emit('mote', q.x, q.y, 1, { colors: [lt(sc.it.col, 0.3), '#fff4dc'], speed: [6, 24] }); }
          if (sc.p >= 0.999) scentDone();
        }
        if (!flood) { // re-bake the warmth in small, invisible steps (and exactly once more when it settles)
          const settled = Math.abs(warmT - warm) < 0.002, target = settled ? warmT : warm;
          if (Math.abs(target - warmB) > (settled ? 1e-6 : 0.035)) { warmB = target; dirty = true; fullRecomp = true; }
        }
        if (dirty && now - recompT > (fullRecomp ? 0 : 100)) { // blooms grow softly: ~10 updates a second is plenty
          recompT = now;
          const rect = fullRecomp ? null : bloomRect(now);
          const growing = paintMask(now, rect);
          if (!rect || rect.w > 0) { compose(LAY.room, rect); compose(LAY.out, rect); }
          fullRecomp = false; dirty = growing || blooms.some(b => !b.settled);
        }
        const busy = dirty || now < busyUntil || rub || (sc && sc.tracing) || tray.holding || ripples.length || phase === 'end' || P.count() > 40;
        accDt += dt;
        if (phase === 'intro' && drawn > 2) return;
        if (!busy && (half ^= 1)) return;
        if (QG.ema > 12 && now - lastDraw < Math.min(110, QG.ema * 2)) return; // a struggling device draws less often instead of falling behind
        const t0d = performance.now();
        draw(g0(), Math.min(0.1, accDt), t, now); accDt = 0; drawn++; lastDraw = now;
        const dd = performance.now() - t0d;
        if (phase !== 'intro') { QG.ema = QG.ema ? QG.ema * 0.9 + dd * 0.1 : dd; QG.n++; if (!QG.dropped && QG.n > 40 && QG.ema > 16 && cv.dpr >= 1.9) { QG.dropped = true; QG.ema = 0; QG.n = 0; cv.setQuality(0.5); } }
      });
      const g0 = () => cv.g;
      function T_(it, t, now) {
        const fk = it.found ? 1 : Math.max(warm, bloomAt(it.x, it.y + (it.cy || 0) * L.s, now));
        return { t, s: L.s, k: fk, c: (hex, a) => tint(hex, fk, a), life: it.life, act: it.act, pulse: it.pulse, squash: it.squash, D: LAY.pal.dark, spr: SPR, L, reduced: K.reduced(), emit: (...a) => P.emit(...a) };
      }
      function draw(g, dt, t, now) {
        const d = L.dpr, win = L.win, s = L.s;
        g.setTransform(1, 0, 0, 1, 0, 0);
        blitLayer(g, LAY.out, Math.round((win.x - L.m + cam.px) * d), Math.round((win.y - L.m + cam.py) * d));
        g.setTransform(d, 0, 0, d, 0, 0);
        // outside: weather and living things (parallax)
        g.save(); g.beginPath(); g.rect(win.x, win.y, win.w, win.h); g.clip();
        g.translate(cam.px, cam.py);
        drawWeatherOut(g, t, now);
        for (const it of items) if (it.zone === 'out') drawItem(g, it, t, now);
        g.restore();
        // glass
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = clamp(0.55 + (1 - warm) * 0.45 - (phase === 'end' ? 0.25 : 0), 0.2, 1); g.drawImage(LAY.glass.c, Math.round(win.x * d), Math.round(win.y * d)); g.globalAlpha = 1;
        if (fogOn) g.drawImage(LAY.fog.c, Math.round(win.x * d), Math.round(win.y * d));
        g.setTransform(d, 0, 0, d, 0, 0);
        g.save(); g.beginPath(); g.rect(win.x, win.y, win.w, win.h); g.clip();
        drawGlassLiving(g, t, now);
        for (const it of items) if (it.zone === 'glass') drawItem(g, it, t, now);
        g.restore();
        // room
        g.setTransform(1, 0, 0, 1, 0, 0); blitLayer(g, LAY.room, 0, 0); g.setTransform(d, 0, 0, d, 0, 0);
        for (const it of items) if (it.zone === 'room' && it.type !== 'lamp') drawItem(g, it, t, now);
        if (IT.lamp) drawItem(g, IT.lamp, t, now);
        // step overlays
        if (phase === 'hear' || phase === 'end') for (const it of HEAR) { const c = ctr(it); soundRings(g, c.x, c.y, s, it.act * ((it.found ? 0.5 : 0.22) + (it.hint || 0) * 0.6 + (A.ctx ? 0 : 0.5)), t, it.found ? '#8fe3cf' : '#fff4d6'); }
        if (phase === 'touch') drawTouch(g, t);
        if (sc) drawScent(g, t);
        if (tray.on) drawTray(g, t);
        for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i], k = (now - r.t0) / 700; if (k >= 1) { ripples.splice(i, 1); continue; } g.strokeStyle = hexA(r.col, (1 - k) * 0.8); g.lineWidth = 2.5 * s; g.beginPath(); g.arc(r.x, r.y, (10 + k * 34 * r.big) * s, 0, TAU); g.stroke(); }
        if (alarm > 0.01) { g.fillStyle = 'rgba(28,34,56,' + (alarm * 0.32).toFixed(3) + ')'; g.fillRect(0, 0, L.w, L.h); }
        if (finK > 0) drawFinaleLight(g, t);
        P.update(dt); P.draw(g);
      }
      function drawItem(g, it, t, now) { const R2 = RN[it.type]; if (!R2) return; const T = T_(it, t, now); R2(g, it, T); if (!it.found && it.shimmer > 0.02 && it.role !== 'hear') { const c = ctr(it); g.globalCompositeOperation = 'lighter'; g.globalAlpha = it.shimmer * 0.4; g.drawImage(SPR.soft, c.x - 26 * L.s, c.y - 26 * L.s, 52 * L.s, 52 * L.s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } if (it.pulse > 0.02 && it.found) { const c = ctr(it); g.globalCompositeOperation = 'lighter'; g.globalAlpha = it.pulse * 0.35; g.drawImage(SPR.warm, c.x - 34 * L.s, c.y - 34 * L.s, 68 * L.s, 68 * L.s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } }
      function drawWeatherOut(g, t, now) {
        const W = L.win, s = L.s, D = LAY.pal.dark;
        if (SC.rain) {
          const n = L.phone ? 70 : 120, vy = 520 * s, vx = -50 * s, len = 13 * s, k = rainCalm();
          g.strokeStyle = D ? 'rgba(190,206,236,' + (0.32 * k) + ')' : 'rgba(236,242,250,' + (0.42 * k) + ')'; g.lineWidth = 1 * s; g.beginPath();
          for (let i = 0; i < n * k; i++) { const x = W.x - 20 + ((i * 73.13 + t * vx) % (W.w + 40) + W.w + 40) % (W.w + 40), y = W.y - 20 + (i * 37.7 + t * vy) % (W.h + 40); g.moveTo(x, y); g.lineTo(x + vx / vy * len, y + len); }
          g.stroke();
          if (IT.rainL && IT.rainL.act > 0.02) { const a = IT.rainL.act; g.strokeStyle = 'rgba(220,232,255,' + (0.45 * a) + ')'; g.lineWidth = 1.3 * s; g.beginPath(); for (let i = 0; i < 46; i++) { const x = W.x + ((i * 41.7) % (W.w * 0.42)), y = W.y - 20 + (i * 53.1 + t * vy * 1.3) % (W.h + 40); g.moveTo(x, y); g.lineTo(x - 3 * s, y + 16 * s); } g.stroke(); }
        }
        if (SC.live) SC.live(g, { L, PL, t, s, D, warm, IT, tint, k: rainCalm() });
      }
      function rainCalm() { return phase === 'end' ? Math.max(0.25, 1 - finK * 0.8) : 1; }
      const slides = [];
      function drawGlassLiving(g, t) {
        if (!SC.rain) return;
        const W = L.win, s = L.s;
        if (slides.length < (L.phone ? 4 : 6) && Math.random() < 0.02) slides.push({ x: W.x + Math.random() * W.w, y: W.y + Math.random() * W.h * 0.5, v: 0, r: (2 + Math.random() * 2) * s, trail: [] });
        for (let i = slides.length - 1; i >= 0; i--) {
          const dr = slides[i]; dr.v = Math.random() < 0.08 ? 0 : Math.min(dr.v + 0.6, 30 * s); dr.y += dr.v * 0.03;
          if (!dr.y0) dr.y0 = dr.y;
          g.strokeStyle = 'rgba(225,236,250,0.22)'; g.lineWidth = dr.r * 0.5; g.beginPath(); g.moveTo(dr.x, Math.max(dr.y0, dr.y - 40 * s)); g.lineTo(dr.x, dr.y); g.stroke();
          waterDrop(g, dr.x, dr.y, dr.r, 0.9);
          if (dr.y > W.y + W.h) slides.splice(i, 1);
        }
      }
      function drawTouch(g, t) {
        const s = L.s;
        for (const it of TOUCH) {
          if (it.found) continue;
          const c = ctr(it), pu = 0.5 + 0.5 * Math.sin(t * 3 + it.order);
          g.strokeStyle = 'rgba(255,214,190,' + (0.35 + pu * 0.35) + ')'; g.lineWidth = 2 * s; g.setLineDash([6 * s, 6 * s]); g.lineDashOffset = -t * 12;
          ell(g, c.x, c.y, (it.r + 6) * s, (it.r * 0.62 + 4) * s); g.stroke(); g.setLineDash([]);
          const k = clamp(it.rub / RUB_NEED, 0, 1);
          if (k > 0) { g.strokeStyle = '#ffb7a3'; g.lineWidth = 4 * s; g.lineCap = 'round'; g.beginPath(); g.ellipse(c.x, c.y, (it.r + 6) * s, (it.r * 0.62 + 4) * s, 0, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke(); }
        }
        if (rub && rub.it.tile) { // the loupe: a close-up of the texture under the finger
          const it = rub.it, R = 56 * s, lx = clamp(rub.lx, R + 8, L.w - R - 8), ly = Math.max(L.win.y + R, rub.ly - R - 46 * s), d = L.dpr, tile = it.tile, TS2 = tile.width;
          g.save(); g.beginPath(); g.arc(lx, ly, R, 0, TAU); g.clip();
          const ox = ((rub.ox * 1.4 % (TS2 / d - 2 * R)) + (TS2 / d - 2 * R)) % (TS2 / d - 2 * R), oy = ((rub.oy * 1.4 % (TS2 / d - 2 * R)) + (TS2 / d - 2 * R)) % (TS2 / d - 2 * R);
          g.drawImage(tile, ox * d, oy * d, 2 * R * d, 2 * R * d, lx - R, ly - R, 2 * R, 2 * R);
          g.fillStyle = rad(g, lx - R * 0.3, ly - R * 0.4, 0, R * 1.3, [[0, 'rgba(255,255,255,0.2)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.35)']]); g.fillRect(lx - R, ly - R, 2 * R, 2 * R);
          g.restore();
          const ha = 0.85, hx0 = lx + Math.cos(ha) * (R + 4 * s), hy0 = ly + Math.sin(ha) * (R + 4 * s);
          g.lineCap = 'round'; g.strokeStyle = 'rgba(30,20,12,0.9)'; g.lineWidth = 13 * s; g.beginPath(); g.moveTo(hx0, hy0); g.lineTo(hx0 + Math.cos(ha) * 30 * s, hy0 + Math.sin(ha) * 30 * s); g.stroke();
          g.strokeStyle = '#7a4a2a'; g.lineWidth = 9 * s; g.beginPath(); g.moveTo(hx0 + Math.cos(ha) * 8 * s, hy0 + Math.sin(ha) * 8 * s); g.lineTo(hx0 + Math.cos(ha) * 30 * s, hy0 + Math.sin(ha) * 30 * s); g.stroke();
          g.strokeStyle = '#d8b46a'; g.lineWidth = 9 * s; g.beginPath(); g.moveTo(hx0, hy0); g.lineTo(hx0 + Math.cos(ha) * 8 * s, hy0 + Math.sin(ha) * 8 * s); g.stroke();
          g.strokeStyle = 'rgba(40,28,20,0.85)'; g.lineWidth = 6 * s; g.beginPath(); g.arc(lx, ly, R + 2 * s, 0, TAU); g.stroke();
          g.strokeStyle = '#e9d3a6'; g.lineWidth = 3 * s; g.beginPath(); g.arc(lx, ly, R + 2 * s, 0, TAU); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2 * s; g.beginPath(); g.arc(lx, ly, R - 6 * s, -2.6, -1.7); g.stroke();
        }
      }
      function drawScent(g, t) {
        const s = L.s, n = sc.pts.length - 1, it = sc.it, col = it.col, pk = sc.p;
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (let pass = 0; pass < 3; pass++) {
          g.beginPath();
          for (let i = 0; i <= n; i++) { const q = sc.pts[i], wob = Math.sin(t * 1.6 + i * 0.3 + pass * 2) * (2 + pass * 2) * s; if (i) g.lineTo(q.x + wob, q.y); else g.moveTo(q.x + wob, q.y); }
          g.strokeStyle = hexA(lt(col, 0.35), (0.24 - pass * 0.05) * (sc.done ? Math.max(0, 1 - sc.fade) : 1)); g.lineWidth = (16 - pass * 4) * s; g.stroke();
        }
        if (pk > 0) {
          g.beginPath(); const m = Math.floor(pk * n);
          for (let i = 0; i <= m; i++) { const q = sc.pts[i]; if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }
          const e = at(pk); g.lineTo(e.x, e.y);
          g.strokeStyle = hexA(col, 0.8); g.lineWidth = 5 * s; g.stroke();
          g.strokeStyle = 'rgba(255,250,235,0.85)'; g.lineWidth = 1.6 * s; g.stroke();
        }
        for (let i = 0; i < 7; i++) { // drifting motifs along the curl
          const f = ((t * 0.07 + i / 7) % 1), q = at(f), a = (1 - Math.abs(f - pk) * 1.5) * 0.9;
          if (a <= 0.05) continue;
          motif(g, it.motif, q.x + Math.sin(t + i) * 8 * s, q.y, s, col, a, t + i);
        }
        if (!sc.done) {
          const o = at(pk), pu = 0.5 + 0.5 * Math.sin(t * 4);
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + pu * 0.3; g.drawImage(SPR.warm, o.x - 30 * s, o.y - 30 * s, 60 * s, 60 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(o.x, o.y, (7 + pu * 2) * s, 0, TAU); g.fill();
          g.strokeStyle = hexA(col, 0.9); g.lineWidth = 2.5 * s; g.beginPath(); g.arc(o.x, o.y, (12 + pu * 3) * s, 0, TAU); g.stroke();
          const top = sc.pts[n]; g.strokeStyle = 'rgba(255,250,235,' + (0.35 + pu * 0.3) + ')'; g.lineWidth = 2 * s; g.setLineDash([4 * s, 5 * s]); g.beginPath(); g.arc(top.x, top.y, 18 * s, 0, TAU); g.stroke(); g.setLineDash([]);
        }
      }
      function motif(g, kind, x, y, s, col, a, t) {
        g.globalAlpha = clamp(a, 0, 1);
        if (kind === 'bean') { g.fillStyle = '#6b3f22'; ell(g, x, y, 4.5 * s, 3 * s, t); g.fill(); g.strokeStyle = '#3a200e'; g.lineWidth = 1 * s; g.beginPath(); g.moveTo(x - Math.cos(t) * 3.5 * s, y - Math.sin(t) * 3.5 * s); g.lineTo(x + Math.cos(t) * 3.5 * s, y + Math.sin(t) * 3.5 * s); g.stroke(); }
        else if (kind === 'swirl') { g.strokeStyle = col; g.lineWidth = 1.6 * s; g.beginPath(); for (let k = 0; k < 9; k += 0.4) { const r = k * 0.7 * s; const px = x + Math.cos(k + t) * r, py = y + Math.sin(k + t) * r; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); }
        else if (kind === 'needle') { g.strokeStyle = '#3d7a46'; g.lineWidth = 1.5 * s; for (let k = 0; k < 3; k++) { const a2 = t + k * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a2) * 6 * s, y + Math.sin(a2) * 6 * s); g.stroke(); } }
        else if (kind === 'flower') { g.fillStyle = '#fffaf2'; for (let k = 0; k < 5; k++) { const a2 = t + k * TAU / 5; ell(g, x + Math.cos(a2) * 3 * s, y + Math.sin(a2) * 3 * s, 2.6 * s, 1.6 * s, a2); g.fill(); } g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(x, y, 1.4 * s, 0, TAU); g.fill(); }
        else if (kind === 'drop') { g.fillStyle = hexA(col, 1); g.beginPath(); g.moveTo(x, y - 4 * s); g.quadraticCurveTo(x + 3.5 * s, y + 1 * s, x, y + 3 * s); g.quadraticCurveTo(x - 3.5 * s, y + 1 * s, x, y - 4 * s); g.fill(); }
        else if (kind === 'smoke') { g.fillStyle = 'rgba(200,196,204,0.5)'; g.beginPath(); g.arc(x, y, 4 * s, 0, TAU); g.arc(x + 4 * s, y - 2 * s, 3 * s, 0, TAU); g.fill(); }
        else { g.fillStyle = col; g.beginPath(); g.arc(x, y, 2.5 * s, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      function drawTray(g, t) {
        const s = L.s, k = tray.k, P2 = tray.pos, off = (1 - k) * 160 * s;
        g.save(); g.translate(0, off); g.globalAlpha = k;
        if (!tray.chosen || tray.others > 0.01) {
          const a = tray.chosen ? tray.others : 1;
          g.globalAlpha = k * a;
          g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, P2.cx + 4 * s, P2.cy + 22 * s, (L.phone ? 150 : 180) * s, 22 * s); g.fill();
          g.fillStyle = '#8a5a35'; rr(g, P2.cx - (L.phone ? 140 : 176) * s, P2.cy - 2 * s, (L.phone ? 280 : 352) * s, 34 * s, 14 * s); g.fill();
          g.fillStyle = '#a8703f'; rr(g, P2.cx - (L.phone ? 132 : 168) * s, P2.cy, (L.phone ? 264 : 336) * s, 24 * s, 10 * s); g.fill();
          g.globalAlpha = k;
        }
        ['tea', 'mint', 'orange'].forEach(kind => {
          const chosen = tray.chosen === kind; if (tray.chosen && !chosen && tray.others < 0.01) return;
          const p = chosen ? { x: tray.cx, y: tray.cy } : P2[kind];
          g.globalAlpha = k * (tray.chosen && !chosen ? tray.others : 1);
          tasteItem(g, kind, p.x, p.y + 12 * s, s * (chosen ? 1.2 : 1), t, chosen ? tray.sip : 0);
        });
        g.restore(); g.globalAlpha = 1;
        if (tray.chosen && (tray.active || (tray.done && phase !== 'end'))) {
          const c = { x: tray.cx, y: tray.cy }, R = 52 * s;
          g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 5 * s; g.beginPath(); g.arc(c.x, c.y, R, 0, TAU); g.stroke();
          g.strokeStyle = TASTES[tray.chosen].col; g.lineWidth = 5 * s; g.lineCap = 'round'; g.beginPath(); g.arc(c.x, c.y, R, -Math.PI / 2, -Math.PI / 2 + TAU * (tray.done ? 1 : tray.sip)); g.stroke();
          if (tray.holding) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + tray.sip * 0.4; g.drawImage(SPR.warm, c.x - 70 * s, c.y - 70 * s, 140 * s, 140 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        }
      }
      function tasteItem(g, kind, x, y, s, t, sip) {
        if (kind === 'tea') {
          const it = { x, y, china: '#f4efe8', drink: mix('#b5652e', '#d9b48a', sip * 0.3), band: '#7e9bc4', saucer: true };
          RN.cup(g, it, { t, s, k: 1, c: (hx, a) => tint(hx, 1, a), life: 1, act: 0, squash: 0 });
          if (sip > 0) { g.fillStyle = 'rgba(255,255,255,0.35)'; ell(g, x, y - 26 * s, 13 * s * (1 - sip * 0.4), 2.4 * s); g.fill(); }
        } else if (kind === 'mint') {
          g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 3 * s, y + 2 * s, 20 * s, 5 * s); g.fill();
          const lvl = 1 - sip * 0.75;
          g.fillStyle = 'rgba(210,240,230,0.35)'; g.beginPath(); g.moveTo(x - 16 * s, y - 46 * s); g.lineTo(x + 16 * s, y - 46 * s); g.lineTo(x + 13 * s, y); g.lineTo(x - 13 * s, y); g.closePath(); g.fill();
          g.fillStyle = 'rgba(150,215,180,0.75)'; const ty = y - 40 * s * lvl; g.beginPath(); g.moveTo(x - 13 * s - 3 * s * lvl, ty); g.lineTo(x + 13 * s + 3 * s * lvl, ty); g.lineTo(x + 13 * s, y - 2 * s); g.lineTo(x - 13 * s, y - 2 * s); g.closePath(); g.fill();
          for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(240,255,255,0.7)'; rr(g, x - 9 * s + i * 7 * s, ty + 4 * s + (i % 2) * 6 * s + Math.sin(t * 2 + i) * 1.5 * s, 7 * s, 7 * s, 2 * s); g.fill(); }
          g.fillStyle = '#3f9a5a'; leafPath(g, x + 2 * s, y - 44 * s, 18 * s, 7 * s, -1.9); g.fill(); g.fillStyle = '#5fbf72'; leafPath(g, x + 2 * s, y - 44 * s, 16 * s, 6 * s, -1.1); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5 * s; g.beginPath(); g.moveTo(x - 12 * s, y - 42 * s); g.lineTo(x - 10 * s, y - 6 * s); g.stroke();
        } else {
          g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x + 3 * s, y + 2 * s, 26 * s, 6 * s); g.fill();
          g.fillStyle = '#f4efe6'; ell(g, x, y, 25 * s, 6.5 * s); g.fill();
          const bite = sip;
          g.save(); g.translate(x, y - 14 * s);
          g.fillStyle = '#f08a1c'; g.beginPath(); g.arc(0, 0, 18 * s, Math.PI, TAU); g.closePath(); g.fill();
          g.fillStyle = '#ffc25a'; g.beginPath(); g.arc(0, 0, 15 * s, Math.PI, TAU); g.closePath(); g.fill();
          g.strokeStyle = '#fff3d6'; g.lineWidth = 1.2 * s; for (let i = 1; i < 6; i++) { const a = Math.PI + i * Math.PI / 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 15 * s, Math.sin(a) * 15 * s); g.stroke(); }
          g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(0, 0, 3 * s, Math.PI, TAU); g.fill();
          if (bite > 0.05) { g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-16 * s + bite * 10 * s + i * 5 * s, -12 * s + i * 2 * s, 5 * s * bite + 2 * s, 0, TAU); g.fill(); } g.globalCompositeOperation = 'source-over'; }
          g.restore();
        }
      }

      /* ---------------- finale ---------------- */
      let finK = 0, fogOn = false;
      function drawFinaleLight(g, t) {
        const s = L.s, W = L.win, k = finK;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.22 * k; g.drawImage(SPR.warm, L.w * 0.5 - W.w * 0.55, L.tab.y - 60 * s, W.w * 1.1, L.h - L.tab.y + 60 * s);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.35 * k) P.emit('mote', W.x + Math.random() * W.w, W.y + W.h * (0.4 + Math.random() * 0.6), 1, { colors: ['#fff3c4', '#ffe0a8'], speed: [4, 16] });
        void t; void s;
      }
      async function writeFog() {
        const W = L.win, d = L.dpr, fg = LAY.fog.g, s = L.s;
        fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, LAY.fog.c.width, LAY.fog.c.height); fg.setTransform(d, 0, 0, d, 0, 0);
        const cx = W.w * 0.5, cy = W.h * (L.phone ? 0.4 : 0.38), rx = Math.min(W.w * 0.44, 210 * s), ry = 58 * s;
        const puffs = []; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; puffs.push({ x: cx + Math.cos(a) * rx * 0.55 * (0.8 + Math.random() * 0.3), y: cy + Math.sin(a) * ry * 0.5, r: (0.55 + Math.random() * 0.25) * rx * (i % 2 ? 0.75 : 0.9) }); }
        puffs.push({ x: cx, y: cy, r: rx * 0.9 });
        fogOn = true;
        if (A.ctx) A.noise({ pink: true, filter: 'bandpass', freq: 700, to: 300, q: 0.6, dur: 1.4, attack: 0.3, vol: 0.06 });
        await K.anim(K.reduced() ? 150 : 900, (k) => {
          fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, LAY.fog.c.width, LAY.fog.c.height); fg.setTransform(d, 0, 0, d, 0, 0);
          const e = eOut(k);
          for (const q of puffs) {
            fg.save(); fg.translate(q.x, q.y); fg.scale(1, ry / rx * 1.25); const r = q.r * (0.4 + 0.6 * e);
            fg.fillStyle = rad(fg, 0, 0, 0, r, [[0, 'rgba(240,245,250,' + (0.34 * e) + ')'], [0.65, 'rgba(240,245,250,' + (0.22 * e) + ')'], [1, 'rgba(240,245,250,0)']]);
            fg.beginPath(); fg.arc(0, 0, r, 0, TAU); fg.fill(); fg.restore();
          }
          for (let i = 0; i < 26 * e; i++) { const a = i * 2.39, rr2 = Math.sqrt(i / 26) * rx * 0.85; fg.fillStyle = 'rgba(255,255,255,0.3)'; fg.beginPath(); fg.arc(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * ry / rx, 0.9 * s, 0, TAU); fg.fill(); }
        });
        // the words, wiped through the fog with a fingertip
        const txt = mk(W.w * d, W.h * d), tg = txt.g; tg.setTransform(d, 0, 0, d, 0, 0);
        let fs = Math.round(Math.min(66 * s, W.w * 0.18));
        tg.font = '700 ' + fs + 'px Caveat, "Segoe Print", "Bradley Hand", "Comic Sans MS", "TeX Gyre Chorus", cursive';
        const mw = tg.measureText('You’re here.').width; if (mw > W.w * 0.8) { fs = Math.round(fs * W.w * 0.8 / mw); tg.font = '700 ' + fs + 'px Caveat, "Segoe Print", "Bradley Hand", "Comic Sans MS", "TeX Gyre Chorus", cursive'; }
        tg.textAlign = 'center'; tg.textBaseline = 'middle';
        tg.lineJoin = 'round'; tg.lineCap = 'round'; tg.strokeStyle = '#000'; tg.lineWidth = fs * 0.05; tg.strokeText('You’re here.', cx, cy); tg.fillStyle = '#000'; tg.fillText('You’re here.', cx, cy);
        const tw = Math.min(W.w, tg.measureText('You’re here.').width + fs * 0.4), x0 = cx - tw / 2;
        let lastSq = 0;
        await K.anim(K.reduced() ? 200 : 1900, (k) => {
          const x1 = x0 + tw * k;
          fg.save(); fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'destination-out';
          fg.drawImage(txt.c, 0, 0, Math.max(1, Math.round(x1 * d)), txt.c.height, 0, 0, Math.max(1, Math.round(x1 * d)), txt.c.height);
          fg.restore();
          if (A.ctx && k - lastSq > 0.07) { lastSq = k; A.tone({ type: 'sine', freq: 1700 + Math.random() * 900, to: 2300, glide: 0.08, dur: 0.1, vol: 0.016 }); }
        });
        drips(cx, cy, tw, fs);
      }
      function drips(cx, cy, tw, fs) {
        const W = L.win, d = L.dpr, fg = LAY.fog.g, list = [];
        for (let i = 0; i < 5; i++) list.push({ x: cx - tw * 0.4 + Math.random() * tw * 0.8, y: cy + fs * 0.3, len: 0, max: (16 + Math.random() * 30) * L.s });
        K.anim(K.reduced() ? 100 : 2400, (k) => { fg.save(); fg.setTransform(d, 0, 0, d, 0, 0); fg.globalCompositeOperation = 'destination-out'; fg.lineCap = 'round'; for (const q of list) { const ny = q.max * eOut(k); fg.lineWidth = 2.6 * L.s; fg.beginPath(); fg.moveTo(q.x, q.y + q.len); fg.lineTo(q.x, q.y + ny); fg.stroke(); q.len = ny; } fg.restore(); });
        void W;
      }
      async function finale() {
        if (phase === 'end') return;
        phase = 'end'; stepIdx = 5; K.guide(null); MUS.bpm = 60;
        SENSES.forEach(se => { se.el.classList.remove('sh-on'); se.el.classList.add('sh-done'); });
        still.base('happy'); loopie.show(true); loopie.base('happy');
        // 1. the recap walk: everything noticed lights up in order, 5-4-3-2-1
        const walk = [].concat(SEE.filter(i => i.found).sort((a, b) => a.foundAt - b.foundAt), HEAR.filter(i => i.found), TOUCH.filter(i => i.found), SMELL.filter(i => i.found));
        const gap = K.reduced() ? 60 : 150;
        for (let i = 0; i < walk.length; i++) {
          const it = walk[i], si = it.role === 'see' ? 0 : it.role === 'hear' ? 1 : it.role === 'touch' ? 2 : 3;
          it.pulse = 1; it.act = Math.max(it.act, 0.6);
          const c = ctr(it); P.emit('star', c.x, c.y, 6, { colors: [SENSES[si].c, '#ffffff'], speed: [30, 90] });
          if (A.ctx) piano(SC.key[i % SC.key.length], A.now() + 0.01, 0.1);
          hudFlash(si);
          await K.sleep(gap);
        }
        hudFlash(4);
        // 2. colour floods the room from the taste
        const c = { x: tray.pos.cx || L.w / 2, y: tray.pos.cy || L.h * 0.7 };
        flood = { x: c.x, y: c.y, R: Math.hypot(L.w, L.h) * 1.15, t0: performance.now(), dur: K.reduced() ? 300 : 2600 };
        warmT = 0.5;
        if (A.ctx) { A.pad([A.note(SC.key[0]) / 2, A.note(SC.key[2]) / 2, A.note(SC.key[3]) / 2, A.note(SC.key[5]) / 2], { dur: 6, vol: 0.14, attack: 0.9 }); K.sfx.win(); A.sync('finale', performance.now()); }
        K.anim(K.reduced() ? 300 : 2600, (k) => { finK = eOut(k); });
        for (const it of SEE) if (!it.found) { it.found = true; it.foundAt = performance.now(); it.t0 = performance.now() / 1000; }
        await K.sleep(1200);
        warmT = 1;
        // 3. Still goes to the window, breathes on it and writes
        still.hush();
        const sp = L.phone ? { x: L.win.x + L.win.w * 0.44 - 36, y: L.sillY - 66 } : { x: L.win.x + L.win.w * 0.43 - 50, y: L.sillY - 92 };
        still.moved = true; still.place(sp.x, sp.y, 1300); still.base('calm');
        await K.sleep(K.reduced() ? 200 : 1300);
        still.face('love');
        await writeFog();
        loopie.face('love'); still.base('glow');
        if (A.ctx) ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.14, vol: 0.06, dur: 2 }));
        sr.textContent = 'You’re here.';
        await K.sleep(K.reduced() ? 400 : 1300);
        // results
        const slow = breathTimes.length ? Math.max(...breathTimes) : 0;
        const hearAcc = HEAR.length ? HEAR.filter(i => i.found).length / HEAR.length : 1;
        const steady = traceT > 0 ? clamp(1 - aheadT / traceT, 0, 1) : 1;
        const score = clamp(0.45 * steady + 0.35 * clamp(slow / (T_MIN + 1.2), 0, 1) + 0.2 * hearAcc, 0, 1);
        const badges = [];
        if (slow > 0) { const pb = K.best('slowbreath', Math.round(slow * 10) / 10, 'higher'); if (pb.isNew) badges.push('New best: ' + slow.toFixed(1) + ' s slow breath in'); else if (pb.first) badges.push('Slowest breath in: ' + slow.toFixed(1) + ' s'); }
        const tier = K.tier(score); if (tier) badges.push(tier + ': calm and present');
        if (secretFound && SECRET) { const col = K.collect(SC.id + ':' + SECRET.id); badges.push((col.isNew ? 'Scrapbook: ' : 'Found again: ') + SECRET.name + ' (' + col.count + ' of 8)'); }
        else if (visits === 0) badges.push('This ' + SC.where + ' hides a secret for regulars');
        ctx.track('done', { slow: Math.round(slow * 10), steady: Math.round(steady * 100), notes: noteCount, scene: SC.id });
        finished = true;
        ctx.finish({
          title: 'You’re here', mood: 'calm',
          lines: ['5 seen · 4 heard · 3 felt · 2 smelled · 1 tasted', 'Noticed first: ' + (walk[0] ? walk[0].name : 'the room'), noteCount ? noteCount + ' looping thoughts swiped aside, gently' : 'Back in ' + SC.title],
          share: '5 things I saw, 4 I heard… and I’m back in the room.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => { const keep = LAY && LAY.fog && fogOn ? LAY.fog : null; if (!layout()) return; paint(); if (keep && LAY.fog !== keep) fogOn = false; if (tray.on) { tray.pos = trayPos(); if (tray.chosen) { tray.cx = tray.pos.cx; tray.cy = tray.pos.cy; sipBtn.style.left = tray.cx + 'px'; sipBtn.style.top = tray.cy + 'px'; } tasteBtns.forEach(b => { const p = tray.pos[b.dataset.k]; b.style.left = p.x + 'px'; b.style.top = p.y + 'px'; }); } if (sc && !sc.done) { const p0 = sc.p, t0 = sc.target; setupScent(sc.it); sc.p = p0; sc.target = t0; } });
      S.on('theme', () => { paint(); });
      (async () => {
        await K.intro({ title: 'Sense Hunt', sub: 'Everything’s gone a bit grey. Notice your way back: five, four, three, two, one.', how: 'Tap what you see. Point to what you hear. Rub, sniff, sip.', char: 'still', mood: 'calm' });
        phase = 'see'; stepIdx = 0; count = 0; hudSet(0, 0); MUS.on = true;
        if (A.ctx) A.sync('start', performance.now());
        still.say(line({ Jolly: 'The world’s gone a bit grey. Let’s notice our way back in. Five things you can see first.', Cheeky: 'Your brain’s been busy. Let’s give it something real to look at. Find five things.', Unfiltered: 'Grey world. Fix: notice things. Five you can see. Go.' }), { ms: 4200 });
        guideSee(1400);
      })();

      return {
        async autoplay() {
          const tapAt = async (p) => { await K.sim.tap(stage, p.x, p.y); };
          while (phase === 'intro') await K.wait(150);
          // SEE: tap five things (and the secret, if it is out today)
          let guard = 0;
          while (phase === 'see' && guard++ < 30) { const it = nextSee(); if (!it) { await K.wait(200); continue; } await K.wait(550); await tapAt(ctr(it)); await K.wait(300); }
          if (SECRET && !SECRET.found) { let dev = false; try { dev = S.isDev() && /[?&]shSecret=1/.test(location.search); } catch (e) { /* no query */ } if (dev) { await K.wait(300); await tapAt(ctr(SECRET)); } } // otherwise the secret is left for the player
          while (phase !== 'hear') await K.wait(150);
          // HEAR: wait for each call, tap where it comes from; swipe notifications away gently
          guard = 0;
          while (phase === 'hear' && guard++ < 80) {
            if (noteUp) { const n = noteUp.el; await K.wait(500); if (noteUp && noteUp.el === n) { const r = n.getBoundingClientRect(), sc2 = K.scaleOf(el); await K.sim.drag(n, { x: 40, y: r.height / sc2 / 2 }, { x: 40 + Math.min(260, L.w * 0.6), y: r.height / sc2 / 2 + 6 }, 560, 14); } await K.wait(400); continue; }
            if (cur && cur.calls >= 1) { await K.wait(450); if (cur && !noteUp) await tapAt(ctr(cur)); await K.wait(250); continue; }
            await K.wait(250);
          }
          while (phase !== 'touch' && phase !== 'end') await K.wait(150);
          // TOUCH: rub each texture back and forth until it is felt
          guard = 0;
          while (phase === 'touch' && guard++ < 24) {
            const it = TOUCH.find(x => !x.found); if (!it) { await K.wait(200); continue; }
            await K.wait(500);
            const c = ctr(it), span = Math.min(it.r * L.s * 1.5, 60), pr = await K.sim.press(stage, c.x, c.y);
            for (let i = 0; i < 60 && !it.found; i++) { await K.wait(40); pr.move(c.x + Math.sin(i * 0.9) * span, c.y + Math.cos(i * 1.3) * 6); }
            pr.up(c.x, c.y); await K.wait(250);
          }
          while (phase !== 'smell' && phase !== 'end') await K.wait(150);
          // SMELL: trace each curl slowly upward, staying just ahead of the scent
          guard = 0;
          while (phase === 'smell' && guard++ < 16) {
            if (!sc || sc.done) { await K.wait(200); continue; }
            await K.wait(400);
            const s0 = sc, p0 = at(s0.p), pr = await K.sim.press(stage, p0.x, p0.y);
            const tEnd = performance.now() + T_MIN * 1000 * 3 + 4000;
            while (sc === s0 && !s0.done && performance.now() < tEnd) { await K.wait(50); const q = at(Math.min(1, s0.p + 0.06)); pr.move(q.x, q.y); }
            const e = at(1); pr.up(e.x, e.y); await K.wait(300);
          }
          while (phase !== 'taste' && phase !== 'end') await K.wait(150);
          // TASTE: pick, then hold for a slow sip (again if a slow device needs it)
          while (phase === 'taste' && tasteBtns.every(b => b.hidden) && !tray.chosen) await K.wait(150);
          if (phase === 'taste' && !tray.chosen) { await K.wait(400); await K.sim.tap(tasteBtns[0]); }
          while (phase === 'taste' && sipBtn.hidden) await K.wait(120);
          guard = 0;
          while (phase === 'taste' && !tray.done && guard++ < 6) { await K.wait(400); await K.sim.hold(sipBtn, SIP_MS + 600); }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
