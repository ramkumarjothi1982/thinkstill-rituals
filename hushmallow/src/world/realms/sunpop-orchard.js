// The Sunpop Orchard — Boppo's realm.
// A warm apricot sky full of floating islands, each crowned with round
// golden fruit trees.  Sunbeams fan from a soft sun, cumulus drift by, a sea
// of clouds rolls below, and glowing fruit bounces on the meadow.  Joy makes
// fruit bounce higher and pop into golden bursts; heaviness greys the sky and
// stills the orchard; the ritual transform ripens everything into golden hour
// with a soft rainbow arcing behind the Mallow.

import {
  clamp, lerp, smoothstep, rng, TAU, vgrad, rgba, glowSprite, glintSprite, blit, softBlob,
  Pool, Rings, stageFade, makeCanvas, sceneLayer, drawLayer, billowCloud, bankBillows,
} from '../util.js';

const C = {
  top: '#e85d78', upper: '#ff7f6e', mid: '#ff9f72', low: '#ffc98a', horizon: '#ffe7ad',
  gold: '#ffd23a', orange: '#ff7a0a', sun: '#fff3c4', leaf: '#9fcf45', leafDark: '#5f9a2e', rock: '#c8643a', rockDark: '#6a2a2a',
  cream: '#fff6e4', cloudShade: '#ffb39a',
};

export default function create({ ctx }) {
  let L = {};
  let grads = {};
  let sprites = {};
  let islands = [], clouds = [], fruits = [], beams = [];
  const motes = new Pool(50);
  const bursts = new Pool(90);
  const rings = new Rings(12);
  let sway = 0, joyPh = 0, nextPop = 4, warmGlow = 0;
  const R = rng(5150);

  function build(st) {
    const { W, H, M, dpr } = st;
    const hy = Math.round(H * 0.665), gy = H * st.groundY;
    const r = rng(23);

    // ---------------------------------------------------------------- sky
    const sky = sceneLayer(st, -M, H * 0.8);
    {
      const g = sky.g;
      g.fillStyle = vgrad(g, -M, H * 0.8, [[0, C.top], [0.22, C.upper], [0.45, C.mid], [0.68, C.low], [0.86, C.horizon], [1, '#fff1cf']]);
      g.fillRect(-M, -M, W + 2 * M, H * 0.8 + M);
      softBlob(g, W * 0.8, H * 0.15, W * 0.9, '#fff0c0', 0.55);
      softBlob(g, W * 0.1, H * 0.45, W * 0.6, '#ffb08a', 0.25);
      // far high cumulus (static)
      const far = (cx, cy, w, h) => billowCloud(g, bankBillows(r, cx, cy, w, h, 1.3), { top: '#fff1e0', bottom: '#ffc6a8', y0: cy - h * 1.1, y1: cy, rim: '#fff9ee', rimA: 0.9, rimDy: 2, crown: '#ffffff', crownA: 0.5, shade: '#ff9f8a', shadeA: 0.35 });
      far(W * 0.12, H * 0.2, W * 0.42, H * 0.045);
      far(W * 0.55, H * 0.075, W * 0.36, H * 0.03);
    }
    // the sun: soft disc + halo (drawn per frame for the breathing glow)
    // ------------------------------------------------------- cloud sea
    const sea = sceneLayer(st, hy - H * 0.08, H + M);
    {
      const g = sea.g;
      g.fillStyle = vgrad(g, hy - 10, H + M, [[0, '#ffe2bd'], [0.3, '#ffd2b4'], [1, '#f7b4a4']]);
      g.fillRect(-M, hy - 4, W + 2 * M, H - hy + M + 4);
      for (let row = 0; row < 3; row++) {
        const y = hy + row * H * 0.035;
        let x = -M - r.range(0, 40);
        while (x < W + M) {
          const w = r.range(90, 170) * (1 + row * 0.3), h = r.range(22, 34) * (1 + row * 0.35);
          billowCloud(g, bankBillows(r, x + w / 2, y + h * 0.4, w, h, 1), {
            top: row === 0 ? '#fff4e6' : '#fff0e2', bottom: row === 0 ? '#ffd2b8' : '#ffc4ae', y0: y - h, y1: y + h * 0.4,
            rim: '#fffaf2', rimA: 0.9, rimDy: 2, crown: '#ffffff', crownA: 0.5, shade: '#ff9f8a', shadeA: 0.3,
          });
          x += w * r.range(0.6, 0.85);
        }
      }
    }
    // ------------------------------------------------- main meadow island
    const ground = sceneLayer(st, H * 0.74, H + M);
    {
      const g = ground.g;
      const cx = W * 0.5, top = H * 0.795, cyE = H * 0.9, rx = W * 0.56, ry = cyE - top;
      // underside rock showing at the sides
      g.fillStyle = vgrad(g, cyE, H + M, [[0, '#c86a3c'], [0.5, '#9a4434'], [1, '#6a2a2a']]);
      g.beginPath(); g.ellipse(cx, cyE + 4, rx * 0.99, ry * 1.6, 0, 0, Math.PI); g.fill();
      // meadow surface
      const mg = g.createLinearGradient(0, top, 0, cyE + ry);
      mg.addColorStop(0, '#d8ee7a'); mg.addColorStop(0.25, '#aed65a'); mg.addColorStop(0.7, '#86c043'); mg.addColorStop(1, '#5f9a2e');
      g.fillStyle = mg;
      g.beginPath(); g.ellipse(cx, cyE, rx, ry, 0, 0, TAU); g.fill();
      // sun-lit back rim
      g.strokeStyle = 'rgba(255,250,200,0.75)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(cx, cyE, rx - 1, ry - 1, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      // soft dappled light + shade under the Mallow
      softBlob(g, cx, gy + 4, W * 0.3, '#4f8a26', 0.35, 1, 0.22);
      softBlob(g, cx - W * 0.25, top + 20, W * 0.2, '#f6ffb0', 0.4, 1, 0.3);
      // grass tufts & flowers
      for (let i = 0; i < 90; i++) {
        const a = r() * TAU, d = Math.sqrt(r());
        const x = cx + Math.cos(a) * rx * d * 0.96, y = cyE + Math.sin(a) * ry * d * 0.9;
        if (Math.abs(x - cx) < W * 0.26 && Math.abs(y - gy) < 14) continue;
        const s = 3 + (y - top) / ry * 4;
        g.strokeStyle = r() < 0.5 ? '#6fae36' : '#c8e870'; g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - s * 0.3, y - s * 0.6, x - s * 0.5, y - s); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.2, y - s * 0.7, x + s * 0.4, y - s * 1.1); g.stroke();
        if (r() < 0.22) { g.fillStyle = r() < 0.5 ? '#fff6e0' : '#ffd23a'; g.beginPath(); g.arc(x, y - s, 1.4 + s * 0.12, 0, TAU); g.fill(); }
      }
      g.fillStyle = vgrad(g, H * 0.93, H + M, [[0, 'rgba(90,40,30,0)'], [1, 'rgba(90,40,30,0.35)']]);
      g.fillRect(-M, H * 0.93, W + 2 * M, H * 0.07 + M);
    }

    // ---------------------------------------------------------- sprites
    sprites.fruit = fruitSprite(64);
    sprites.fruitGreen = fruitSprite(64, true);
    sprites.glow = glowSprite(C.gold, { size: 64, core: 0.6 });
    sprites.glowOrange = glowSprite('#ffae4a', { size: 64, core: 0.4 });
    sprites.white = glowSprite('#fffbe8', { size: 64, core: 0.6 });
    sprites.glint = glintSprite('#fff4c0', 48);
    sprites.soft = { sun: glowSprite('#fff2c2', { size: 128 }), gold: glowSprite(C.gold, { size: 128 }), peach: glowSprite('#ffb98a', { size: 128 }), grey: glowSprite('#9a8fa8', { size: 128 }) };
    sprites.list = [sprites.glow, sprites.glowOrange, sprites.white];
    sprites.beam = (() => {
      const c = makeCanvas(64, 256);
      const g = c.getContext('2d');
      const gx = g.createLinearGradient(0, 0, 64, 0);
      gx.addColorStop(0, 'rgba(255,248,214,0)'); gx.addColorStop(0.5, 'rgba(255,248,214,1)'); gx.addColorStop(1, 'rgba(255,248,214,0)');
      g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
      g.globalCompositeOperation = 'destination-in';
      const gy2 = g.createLinearGradient(0, 0, 0, 256);
      gy2.addColorStop(0, 'rgba(0,0,0,0.9)'); gy2.addColorStop(0.5, 'rgba(0,0,0,0.5)'); gy2.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gy2; g.fillRect(0, 0, 64, 256);
      return c;
    })();
    sprites.rainbow = (() => {
      const rad = W * 0.62, band = 30;
      const c = makeCanvas((rad * 2 + 20) * dpr, (rad + 20) * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const cols = ['#ff8a8a', '#ffb36b', '#ffe27a', '#a8e67a', '#7fd4ff', '#b9a0ff'];
      g.lineCap = 'butt';
      for (let i = 0; i < cols.length; i++) {
        g.strokeStyle = rgba(cols[i], 0.55); g.lineWidth = band / cols.length + 1.5;
        g.beginPath(); g.arc(rad + 10, rad + 10, rad - i * (band / cols.length), Math.PI, TAU); g.stroke();
      }
      c.cssW = rad * 2 + 20; c.cssH = rad + 20; c.rad = rad;
      return c;
    })();
    grads.heavy = vgrad(ctx, 0, H, [[0, 'rgba(70,60,90,0.75)'], [0.5, 'rgba(120,100,120,0.55)'], [0.8, 'rgba(90,80,90,0.45)'], [1, 'rgba(50,40,50,0.5)']]);
    grads.golden = vgrad(ctx, 0, H, [[0, 'rgba(255,120,80,0.22)'], [0.5, 'rgba(255,190,90,0.22)'], [0.75, 'rgba(255,220,120,0.28)'], [1, 'rgba(255,170,60,0.12)']]);

    // ---------------------------------------------------------- islands
    islands = [
      { x: 0.36, y: 0.375, w: 0.13, depth: 0.3, haze: 0.55, trees: 1, ph: 0.4 },
      { x: 0.74, y: 0.3, w: 0.11, depth: 0.25, haze: 0.6, trees: 1, ph: 2.2 },
      { x: 0.07, y: 0.5, w: 0.4, depth: 0.6, haze: 0.0, trees: 2, ph: 1.1 },
      { x: 0.95, y: 0.44, w: 0.36, depth: 0.55, haze: 0.08, trees: 2, ph: 3.3 },
    ].map((d, i) => {
      const spr = islandSprite(d.w * W, d.trees, rng(90 + i), d.haze, dpr);
      return { ...d, spr };
    });
    // drifting mid-air cumulus
    const cr = rng(66);
    clouds = [
      { x: 0.2, y: 0.28, w: 0.34, h: 0.04, v: 3.2 }, { x: 0.82, y: 0.6, w: 0.3, h: 0.032, v: 2.4 }, { x: 0.5, y: 0.17, w: 0.26, h: 0.028, v: 4 },
    ].map((d) => ({ ...d, spr: cloudSprite(d.w * W, d.h * H, cr, dpr) }));

    // glowing fruit: on island trees + on the meadow
    fruits = [];
    for (const isl of islands) {
      if (isl.depth < 0.5) continue;
      for (const t of isl.spr.trees) for (const f of t.fruits) fruits.push({ isl, ox: f[0], oy: f[1], s: f[2], ph: R() * TAU, k: 0, pop: 0, scale: 1, ground: false, h: 0, v: 0 });
    }
    const gf = [[0.2, 0.845, 9], [0.82, 0.835, 8], [0.12, 0.905, 11], [0.9, 0.9, 10], [0.31, 0.93, 8]];
    for (const [fx, fy, s] of gf) fruits.push({ isl: null, ox: fx * W, oy: fy * H, s, ph: R() * TAU, k: 0, pop: 0, scale: 1, ground: true, h: 0, v: 0 });

    beams = [];
    for (let i = 0; i < 7; i++) beams.push({ a: 1.75 + i * 0.19 + R.range(-0.04, 0.04), w: R.range(30, 70), len: H * R.range(0.7, 1.05), ph: R() * TAU });

    L = { sky, sea, ground, hy, gy, sunX: W * 0.8, sunY: H * 0.15 };
  }

  function fruitSprite(size, green) {
    const c = makeCanvas(size, size);
    const g = c.getContext('2d');
    const r = size * 0.4, cx = size / 2, cy = size / 2 + 3;
    const fg = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
    if (green) { fg.addColorStop(0, '#f6ffb0'); fg.addColorStop(0.5, '#c8e050'); fg.addColorStop(1, '#7fa830'); }
    else { fg.addColorStop(0, '#fff7c0'); fg.addColorStop(0.35, '#ffd23a'); fg.addColorStop(0.8, '#ff9a16'); fg.addColorStop(1, '#f26a0a'); }
    g.fillStyle = fg;
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.2, r * 0.13, -0.6, 0, TAU); g.fill();
    g.strokeStyle = '#7a4a1a'; g.lineWidth = size * 0.035; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy - r); g.quadraticCurveTo(cx + 2, cy - r - 5, cx + 1, cy - r - 8); g.stroke();
    g.fillStyle = '#7cc43a';
    g.beginPath(); g.ellipse(cx + 7, cy - r - 4, 7, 3.2, -0.5, 0, TAU); g.fill();
    return c;
  }

  function cloudSprite(w, h, r, dpr) {
    const c = makeCanvas((w + 20) * dpr, (h * 2.2) * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const base = h * 1.9;
    billowCloud(g, bankBillows(r, w / 2 + 10, base, w, h, 1.4), { top: '#fffaf2', bottom: '#ffcdb4', y0: base - h * 1.2, y1: base, rim: '#ffffff', rimA: 0.95, rimDy: 2, crown: '#ffffff', crownA: 0.55, shade: '#ffa894', shadeA: 0.35 });
    c.cssW = w + 20; c.cssH = h * 2.2;
    return c;
  }

  function islandSprite(w, nTrees, r, haze, dpr) {
    const H2 = w * 1.25;
    const pad = w * 0.08;
    const c = makeCanvas((w + pad * 2) * dpr, H2 * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const cx = w / 2 + pad, top = H2 * 0.46, rx = w / 2, ry = w * 0.085;
    // underside: rounded rocky cone with strata
    const tip = top + w * 0.55;
    g.fillStyle = vgrad(g, top, tip, [[0, '#d9783e'], [0.4, '#b0503a'], [1, '#6a2a3a']]);
    g.beginPath();
    g.moveTo(cx - rx, top);
    g.bezierCurveTo(cx - rx * 0.9, top + w * 0.25, cx - rx * 0.3, tip - w * 0.05, cx + r.range(-6, 6), tip);
    g.bezierCurveTo(cx + rx * 0.35, tip - w * 0.08, cx + rx * 0.95, top + w * 0.22, cx + rx, top);
    g.closePath(); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = rgba(i % 2 ? '#ffb07a' : '#7a3030', 0.25); g.lineWidth = 2;
      const y = top + 6 + i * w * 0.07;
      g.beginPath(); g.moveTo(cx - rx, y); g.quadraticCurveTo(cx, y + 8 + r.range(-4, 4), cx + rx, y - 2); g.stroke();
    }
    const lit = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
    lit.addColorStop(0, 'rgba(255,200,140,0)'); lit.addColorStop(0.75, 'rgba(255,220,160,0)'); lit.addColorStop(1, 'rgba(255,230,170,0.35)');
    g.fillStyle = lit; g.fillRect(cx - rx, top, w, tip - top);
    g.restore();
    // dangling vines
    g.strokeStyle = '#6fa83a'; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const x = cx - rx * 0.7 + r() * rx * 1.4, len = r.range(10, 30) * (w / 140);
      g.beginPath(); g.moveTo(x, top + 4); g.quadraticCurveTo(x + 4, top + len * 0.6, x - 2, top + len); g.stroke();
      g.fillStyle = '#8fc84a'; g.beginPath(); g.ellipse(x - 2, top + len, 2.4, 1.4, 0.5, 0, TAU); g.fill();
    }
    // grassy cap
    g.fillStyle = '#5f9a2e';
    g.beginPath(); g.ellipse(cx, top + ry * 0.35, rx, ry, 0, 0, TAU); g.fill();
    const cap = g.createLinearGradient(0, top - ry, 0, top + ry);
    cap.addColorStop(0, '#e2f28a'); cap.addColorStop(0.6, '#a6d455'); cap.addColorStop(1, '#7cb83e');
    g.fillStyle = cap;
    g.beginPath(); g.ellipse(cx, top, rx * 0.985, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,252,210,0.8)'; g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(cx, top, rx * 0.98, ry * 0.95, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    // trees
    const trees = [];
    const slots = nTrees === 1 ? [0] : [-0.36, 0.3];
    for (const sl of slots) {
      const tx = cx + sl * rx + r.range(-6, 6), ty = top + r.range(-2, 2);
      const th = w * r.range(0.24, 0.32) * (nTrees === 1 ? 1.4 : 1), cr2 = w * r.range(0.16, 0.2) * (nTrees === 1 ? 1.5 : 1);
      // trunk
      g.strokeStyle = '#8a4a2a'; g.lineWidth = Math.max(2, w * 0.03); g.lineCap = 'round';
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx - cr2 * 0.2, ty - th * 0.5, tx + cr2 * 0.05, ty - th); g.stroke();
      // canopy: clustered round foliage
      const ccx = tx + cr2 * 0.05, ccy = ty - th - cr2 * 0.55;
      const blobs = [[0, 0, 1], [-0.55, 0.25, 0.7], [0.55, 0.2, 0.72], [-0.25, -0.45, 0.62], [0.3, -0.4, 0.6], [0, 0.45, 0.6]];
      g.fillStyle = '#4f8a26';
      g.beginPath(); for (const [bx, by, bs] of blobs) { g.moveTo(ccx + bx * cr2 + bs * cr2 * 0.62, ccy + by * cr2 + 3); g.arc(ccx + bx * cr2, ccy + by * cr2 + 3, bs * cr2 * 0.62, 0, TAU); } g.fill();
      const fol = g.createRadialGradient(ccx - cr2 * 0.35, ccy - cr2 * 0.45, 0, ccx, ccy, cr2 * 1.1);
      fol.addColorStop(0, '#e6f58a'); fol.addColorStop(0.45, '#a8d04a'); fol.addColorStop(1, '#5f9a2e');
      g.fillStyle = fol;
      g.beginPath(); for (const [bx, by, bs] of blobs) { g.moveTo(ccx + bx * cr2 + bs * cr2 * 0.6, ccy + by * cr2); g.arc(ccx + bx * cr2, ccy + by * cr2, bs * cr2 * 0.6, 0, TAU); } g.fill();
      // fruit positions (animated separately on big islands, baked on far ones)
      const fr = [];
      const nf = nTrees === 1 ? 4 : 5;
      for (let i = 0; i < nf; i++) {
        const a = r() * TAU, d = r.range(0.25, 0.75);
        fr.push([ccx + Math.cos(a) * cr2 * d - pad, ccy + Math.sin(a) * cr2 * d * 0.85, Math.max(2.4, cr2 * 0.17)]);
      }
      if (haze > 0.3) {
        for (const [fx, fy, fs] of fr) {
          const fg = g.createRadialGradient(fx + pad - fs * 0.3, fy - fs * 0.3, 0, fx + pad, fy, fs);
          fg.addColorStop(0, '#fff6b0'); fg.addColorStop(1, '#ff9a16');
          g.fillStyle = fg; g.beginPath(); g.arc(fx + pad, fy, fs, 0, TAU); g.fill();
        }
      }
      trees.push({ fruits: haze > 0.3 ? [] : fr });
    }
    // atmospheric haze for distant islands
    if (haze > 0) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = rgba('#ffd2b0', haze);
      g.fillRect(0, 0, w + pad * 2, H2);
      g.globalCompositeOperation = 'source-over';
    }
    c.cssW = w + pad * 2; c.cssH = H2; c.top = top; c.pad = pad; c.trees = trees;
    return c;
  }

  function frame(g, st) {
    const { W, H, m, p, dt, rdt, dpr, density } = st;
    const hy = L.hy, gy = L.gy;
    const cx = st.camX, cy = st.camY;
    const hv = m.heaviness, cl = m.clarity, ag = m.agitation;
    const joy = clamp(m.warmth * 0.6 + cl * 0.4 - hv * 0.8 + p * 0.6);
    warmGlow += (joy - warmGlow) * (1 - Math.exp(-rdt / 1.5));
    sway += dt * (0.6 + ag * 1.8);
    joyPh += dt * (1.2 + warmGlow * 2.2);
    const sunA = (1 - hv * 0.7);

    // 1 sky + sun
    drawLayer(g, L.sky, st, 0.08);
    g.globalCompositeOperation = 'lighter';
    const sx = L.sunX + cx * 0.1, sy = L.sunY + cy * 0.1;
    g.globalAlpha = 0.6 * sunA * (0.9 + 0.1 * Math.sin(st.t * 0.4)); blit(g, sprites.soft.sun, sx, sy, W * 0.42, W * 0.42);
    g.globalAlpha = 0.95 * sunA; blit(g, sprites.soft.sun, sx, sy, W * 0.13, W * 0.13);
    g.globalAlpha = 0.9 * sunA; blit(g, sprites.white, sx, sy, W * 0.07, W * 0.07);

    // 2 sunbeams fanning from the sun
    const beamA = (0.07 + 0.08 * cl + 0.1 * p) * sunA * (st.low ? 0.6 : 1);
    for (const b of beams) {
      const a = b.a + Math.sin(st.t * 0.07 + b.ph) * 0.03;
      const cs = Math.cos(a - Math.PI / 2), sn = Math.sin(a - Math.PI / 2);
      g.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * sx, dpr * sy);
      g.globalAlpha = beamA * (0.7 + 0.3 * Math.sin(st.t * 0.3 + b.ph));
      g.drawImage(sprites.beam, -b.w / 2, 0, b.w, b.len);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 3 rainbow (transform)
    const rb = smoothstep(0.25, 1, p) * (1 - hv);
    if (rb > 0.01) {
      const sp = sprites.rainbow;
      g.globalAlpha = rb * 0.75;
      g.drawImage(sp, W * 0.5 - sp.cssW / 2 + cx * 0.15, H * 0.66 - sp.rad - 10 + cy * 0.15, sp.cssW, sp.cssH);
      g.globalAlpha = 1;
    }

    // 4 far islands, drifting clouds, cloud sea, near islands
    for (const isl of islands) if (isl.depth < 0.5) drawIsland(g, st, isl);
    for (const c of clouds) {
      c.x += (c.v * (1 + ag * 2) / W) * dt;
      if (c.x > 1.3) c.x = -0.3;
      const spr = c.spr;
      g.globalAlpha = 0.95;
      g.drawImage(spr, c.x * W - spr.cssW / 2 + cx * 0.3, c.y * H - spr.cssH * 0.8 + cy * 0.3, spr.cssW, spr.cssH);
      g.globalAlpha = 1;
    }
    drawLayer(g, L.sea, st, 0.35);
    for (const isl of islands) if (isl.depth >= 0.5) drawIsland(g, st, isl);

    // 5 meadow island (stage)
    drawLayer(g, L.ground, st, 0.75);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.2 + 0.25 * warmGlow; blit(g, sprites.soft.gold, W * 0.5, gy - H * 0.12, W * 0.45, W * 0.55);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 6 glowing fruit
    drawFruits(g, st);

    // 7 golden haze / heaviness
    if (warmGlow > 0.4 || p > 0.01) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(p, (warmGlow - 0.4) * 0.8) * 0.8; g.fillStyle = grads.golden; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    if (hv > 0.02) { g.globalAlpha = hv * 0.7; g.fillStyle = grads.heavy; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }

    // 8 pollen + bursts
    g.globalCompositeOperation = 'lighter';
    const want = Math.round(36 * density * (0.4 + 0.6 * (1 - hv)));
    if (motes.n < want && R() < rdt * 5) motes.spawn(R() * W, H * R.range(0.4, 0.95), R.range(-6, 6), -R.range(4, 14), R.range(5, 10), R.range(1.5, 3.5), R() < 0.7 ? 0 : 2, 0.7);
    for (let i = 0; i < motes.n; i++) motes.vx[i] += Math.sin(sway + motes.y[i] * 0.03) * (2 + ag * 8) * rdt;
    motes.update(rdt * st.motion, 0, 0.05);
    motes.draw(g, sprites.list, 0.85, 1);
    rings.update(rdt); rings.draw(g);
    bursts.update(rdt, 120, 1.4);
    bursts.draw(g, sprites.list, 1, 0.05);
    g.globalCompositeOperation = 'source-over';
  }

  function islandPos(st, isl) {
    const { W, H } = st;
    const bob = Math.sin(st.t * 0.45 + isl.ph) * (3 + isl.depth * 4);
    const spr = isl.spr;
    return { x: isl.x * W - spr.cssW / 2 + st.camX * isl.depth, y: isl.y * H - spr.top + bob + st.camY * isl.depth };
  }

  function drawIsland(g, st, isl) {
    const pos = islandPos(st, isl);
    const spr = isl.spr;
    // trees sway by skewing the sprite very slightly around the island top
    g.drawImage(spr, pos.x, pos.y, spr.cssW, spr.cssH);
  }

  function drawFruits(g, st) {
    const { W, H, rdt, m, p } = st;
    const bounceAmp = (2 + warmGlow * 9) * (1 - m.heaviness * 0.9) * (st.reduced ? 0.3 : 1);
    // occasional joyful pop
    if (warmGlow > 0.55 && !st.reduced) {
      nextPop -= rdt * (warmGlow - 0.45) * 2;
      if (nextPop <= 0) {
        nextPop = R.range(2.5, 5);
        const f = fruits[Math.floor(R() * fruits.length)];
        if (f && f.pop <= 0 && f.scale > 0.99) popFruit(st, f);
      }
    }
    g.globalCompositeOperation = 'source-over';
    for (const f of fruits) {
      f.ph += rdt * (1.6 + warmGlow * 1.6);
      if (f.pop > 0) { f.pop -= rdt; if (f.pop <= 0) f.scale = 0; }
      if (f.scale < 1 && f.pop <= 0) f.scale = Math.min(1, f.scale + rdt * 0.35);
      let x = f.ox, y = f.oy, s = f.s;
      if (f.isl) { const pos = islandPos(st, f.isl); x += pos.x + f.isl.spr.pad; y += pos.y; }
      else { x += st.camX * 0.75; y += st.camY * 0.75; }
      // bounce with squash & stretch
      const b = Math.abs(Math.sin(f.ph));
      const hop = (f.ground ? bounceAmp * 1.6 : bounceAmp * 0.4) * b;
      const squash = 1 + (1 - b) * 0.18 * (bounceAmp / 11);
      const sc = f.scale * (f.pop > 0 ? 1 + (0.6 - f.pop) * 0.6 : 1);
      if (sc < 0.02) continue;
      const fw = s * 2.4 * sc * squash, fh = s * 2.4 * sc / squash;
      // glow
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = (0.25 + warmGlow * 0.5) * sc;
      blit(g, sprites.glow, x, y - hop, s * 2.2 * sc);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      const ripe = clamp(0.35 + warmGlow * 0.8 + p);
      if (ripe < 0.99) g.drawImage(sprites.fruitGreen, x - fw / 2, y - hop - fh / 2 - s * 0.2, fw, fh);
      g.globalAlpha = ripe;
      g.drawImage(sprites.fruit, x - fw / 2, y - hop - fh / 2 - s * 0.2, fw, fh);
      g.globalAlpha = 1;
      if (f.ground) {
        g.globalAlpha = 0.25 * sc * (1 - hop / 30);
        g.fillStyle = '#3f6a1a';
        g.beginPath(); g.ellipse(x, y + s * 0.9, s * (1.1 - hop / 40), s * 0.3, 0, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
    }
  }

  function popFruit(st, f) {
    f.pop = 0.6;
    let x = f.ox, y = f.oy;
    if (f.isl) { const pos = islandPos(st, f.isl); x += pos.x + f.isl.spr.pad; y += pos.y; }
    setTimeout(() => burstAt(st, x, y, 16, 1), 560);
  }

  function burstAt(st, x, y, count, scale) {
    const n = Math.round(count * st.density);
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, v = R.range(40, 140) * scale;
      bursts.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - 40 * scale, R.range(0.8, 1.4), R.range(3, 6) * scale, i % 3 === 2 ? 2 : i % 2, 0.95);
    }
    rings.add(x, y, 4, 36 * scale, 0.9, 1, '#fff2b0', 0.75, 2);
  }

  function pulse(kind, x, y, st) {
    const { W, H } = st;
    if (kind === 'tap') {
      burstAt(st, x, y, 6, 0.5);
    } else if (kind === 'ripple') {
      for (let i = 0; i < 3; i++) rings.add(x, y, 6 + i * 6, 60 + i * 30, 1.4 + i * 0.3, y > H * 0.79 ? 0.3 : 1, '#fff2b0', 0.6 - i * 0.12, 1.6);
    } else if (kind === 'success' || kind === 'burst') {
      // nearest fruit pops into a golden burst
      let best = null, bd = 1e9;
      for (const f of fruits) {
        let fx = f.ox, fy = f.oy;
        if (f.isl) { const pos = islandPos(st, f.isl); fx += pos.x + f.isl.spr.pad; fy += pos.y; }
        const d = Math.hypot(fx - x, fy - y);
        if (d < bd && f.scale > 0.9) { bd = d; best = f; }
      }
      if (best && bd < W * 0.4) popFruit(st, best);
      burstAt(st, x, y, kind === 'burst' ? 30 : 18, kind === 'burst' ? 1.3 : 1);
    } else if (kind === 'strike') {
      // a sunbeam lands: warm column of light
      rings.add(x, y, 10, 70, 1.6, y > H * 0.79 ? 0.3 : 1, '#fff6c8', 0.8, 2.5);
      for (let i = 0; i < Math.round(12 * st.density); i++) bursts.spawn(x + R.range(-8, 8), y - R.range(0, 200), 0, R.range(60, 140), R.range(0.6, 1.1), R.range(3, 5), 2, 0.8);
    } else if (kind === 'clear') {
      rings.add(x, y, 10, Math.max(W, H) * 0.7, 2.8, 1, '#fff2b0', 0.5, 3);
      for (const f of fruits) f.ph = R() * 0.3;
      burstAt(st, x, y, 14, 1);
    }
  }

  return { build, frame, pulse };
}
