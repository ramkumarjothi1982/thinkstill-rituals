// The Blue Drift — Loomi's realm.
// A bright, airy, high-key day over glass-still water.  Soft mossy islets,
// each crowned with one rounded tree, a balanced cairn or smooth boulders,
// rest on a mirror that reaches to a far white horizon and drift by inches.  Long cloud streaks slide by
// so slowly you have to look twice, and everything is reflected.  Loomi sits
// on a smooth flat stone; quiet rings spread from it now and then.
//
// Mood: agitation brings wind — chop breaks the mirror into slices, cat's-paw
// gusts darken the water, clouds/islands/seed-fluffs drift faster and ripples
// cross.  Heaviness pulls an overcast grey-blue deck over the sky and dims
// the sun; clarity sharpens the mirror, horizon and glints; warmth tints
// the light toward golden hour.  The transform settles the islands into a
// harmonious arrangement over a flawless mirror under a haloed sun, with
// gentle light motes rising.
//
// Reflections are cheap: one small offscreen buffer is painted each frame
// with the mirrored sky + moving things, then copied onto the water in
// perspective-spaced horizontal slices whose offsets carry the waves.

import {
  clamp, lerp, smoothstep, rng, TAU, vgrad, rgba, glowSprite, glintSprite, blit, softBlob,
  Pool, Rings, stageFade, makeCanvas, makeLayer, sceneLayer, drawLayer, billowCloud, bankBillows, flashEnv,
} from '../util.js';

const C = {
  zenith: '#2a8fd8', upper: '#48aae8', mid: '#76c6f1', low: '#ade0f7', haze: '#daf3fc', horizon: '#f4fcff',
  sun: '#fffbea', gold: '#ffd596', ink: '#0d3e66', deep: '#1a6fb5',
};

const SKY_D = 0.06; // parallax depth of the sky (and its mirror)

export default function create({ ctx }) {
  let L = {};
  let grads = {};
  let sprites = {};
  let islands = [], clouds = [];
  const R = rng(9191);

  // ------------------------------------------------------- pooled state
  const rings = new Rings(26);      // bright ring strokes ('lighter')
  const ringsDark = new Rings(16);  // faint trough rings (source-over)
  const motes = new Pool(64);
  const GN = 70; // sun-glitter
  const gox = new Float32Array(GN), gyy = new Float32Array(GN), gph = new Float32Array(GN), gsp = new Float32Array(GN), gsz = new Float32Array(GN);
  const FN = 22; // seed fluffs
  const fx = new Float32Array(FN), fy = new Float32Array(FN), fv = new Float32Array(FN), fph = new Float32Array(FN), fsz = new Float32Array(FN), fa = new Float32Array(FN);
  const BN = 4; // birds
  const bx = new Float32Array(BN), by = new Float32Array(BN), bv = new Float32Array(BN), bph = new Float32Array(BN), bs = new Float32Array(BN);
  const KN = 3; // cat's-paw gusts
  const kx = new Float32Array(KN), kz = new Float32Array(KN), kph = new Float32Array(KN);
  const DN = 40; // leaping droplets (burst)
  let dN = 0;
  const dx = new Float32Array(DN), dy = new Float32Array(DN), dvx = new Float32Array(DN), dvy = new Float32Array(DN), dly = new Float32Array(DN);
  const blooms = [];
  for (let i = 0; i < 8; i++) blooms.push({ on: false, x: 0, y: 0, age: 0, ttl: 1, r: 10, sx: 1, a: 1, beam: false });

  let wind = 0.18, windPh = 0, clearBoost = 0, clearPos = 2, nextStoneRing = 1.5, nextDrop = 2, fluffN = 0;

  // ------------------------------------------------------------- build
  function build(st) {
    const { W, H, M, dpr } = st;
    const hy = Math.round(H * 0.57), gy = H * st.groundY, Hw = H - hy;
    const sunX = W * 0.72, sunY = H * 0.25;
    const r = rng(808);

    // ---------------------------------------------------------- sky
    const sky = sceneLayer(st, -M, hy + 2);
    {
      const g = sky.g;
      g.fillStyle = vgrad(g, -M, hy, [[0, C.zenith], [0.3, C.upper], [0.58, C.mid], [0.8, C.low], [0.93, C.haze], [1, C.horizon]]);
      g.fillRect(-M, -M, W + 2 * M, hy + M + 2);
      softBlob(g, sunX, sunY, W * 0.8, '#d9f6ff', 0.3);
      softBlob(g, W * 0.5, hy, W * 1.05, '#ffffff', 0.7, 1.35, 0.2);
      // high brushed cirrus (static)
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const y0 = H * r.range(0.04, 0.42), x0 = r.range(-0.1, 0.9) * W, len = W * r.range(0.25, 0.55), slope = r.range(-0.05, 0.02);
        for (let k = 0; k < 16; k++) {
          const u = k / 15, bell = Math.sin(u * Math.PI);
          softBlob(g, x0 + u * len, y0 + slope * u * len + r.range(-2, 2), len * 0.16, '#ffffff', 0.05 + 0.06 * bell, 1, 0.07 + 0.05 * bell);
        }
      }
      g.globalCompositeOperation = 'source-over';
      // far, flat islets on the horizon
      const islet = (x, w, h, col) => {
        g.fillStyle = vgrad(g, hy - h, hy + 1, [[0, col], [1, rgba('#d8f1fb', 0.9)]]);
        g.beginPath(); g.ellipse(x, hy + 1, w / 2, h, 0, Math.PI, TAU); g.fill();
      };
      islet(W * 0.06, W * 0.36, 9, '#a7cfe6');
      islet(W * 0.2, W * 0.16, 5, '#b4d7ea');
      islet(W * 0.9, W * 0.26, 7, '#aed3e8');
      // tiny far tree on the left islet
      g.fillStyle = '#9fc8e0';
      g.beginPath(); g.arc(W * 0.035, hy - 13, 5, 0, TAU); g.arc(W * 0.035 + 4, hy - 11, 4, 0, TAU); g.fill();
      g.fillRect(W * 0.035 - 0.6, hy - 10, 1.2, 4);
      // haze sitting on the horizon
      g.fillStyle = vgrad(g, hy - 46, hy + 2, [[0, 'rgba(246,253,255,0)'], [0.75, 'rgba(246,253,255,0.55)'], [1, 'rgba(255,255,255,0.9)']]);
      g.fillRect(-M, hy - 46, W + 2 * M, 48);
    }
    // --------------------------------------------- overcast deck (heavy)
    const overcast = sceneLayer(st, -M, hy + 2);
    {
      const g = overcast.g;
      g.fillStyle = vgrad(g, -M, hy, [[0, '#8397ad'], [0.45, '#9fb1c3'], [0.82, '#bdcad7'], [1, '#d4dde6']]);
      g.fillRect(-M, -M, W + 2 * M, hy + M + 2);
      const bank = (cx, cy, w, h, lite) => billowCloud(g, bankBillows(r, cx, cy, w, h, 1.2), {
        top: lite ? '#cfd9e3' : '#b9c6d3', bottom: lite ? '#a5b5c6' : '#8c9eb2', y0: cy - h * 1.1, y1: cy,
        rim: '#dde6ee', rimA: 0.6, rimDy: 2, crown: '#e3eaf1', crownA: 0.28, shade: '#7a8da2', shadeA: 0.3,
      });
      bank(W * 0.2, H * 0.12, W * 0.9, H * 0.06, false);
      bank(W * 0.85, H * 0.2, W * 0.8, H * 0.05, false);
      bank(W * 0.1, H * 0.33, W * 0.7, H * 0.04, true);
      bank(W * 0.75, H * 0.42, W * 0.65, H * 0.032, true);
      bank(W * 0.3, H * 0.5, W * 0.6, H * 0.022, true);
    }
    // ------------------------------------------ horizon fog (low clarity)
    const fog = sceneLayer(st, hy - H * 0.13, hy + H * 0.1);
    {
      const g = fog.g;
      g.fillStyle = vgrad(g, hy - H * 0.13, hy + H * 0.1, [[0, 'rgba(238,247,252,0)'], [0.45, 'rgba(238,247,252,0.7)'], [0.58, 'rgba(242,249,253,0.92)'], [0.75, 'rgba(232,244,250,0.55)'], [1, 'rgba(232,244,250,0)']]);
      g.fillRect(-M, hy - H * 0.13, W + 2 * M, H * 0.23);
      for (let i = 0; i < 7; i++) softBlob(g, r() * W, hy + r.range(-18, 8), W * r.range(0.2, 0.35), '#f4fbfe', 0.5, 1.6, 0.25);
    }
    // ------------------------------------------------------ water body
    const waterBase = sceneLayer(st, hy - 1, H + M);
    waterBase.g.fillStyle = vgrad(waterBase.g, hy, H, [[0, '#d8f3fb'], [0.25, '#9ad6f2'], [0.6, '#5bb3e4'], [1, '#2e8ccf']]);
    waterBase.g.fillRect(-M, hy - 1, W + 2 * M, Hw + M + 1);
    const tint = sceneLayer(st, hy - 1, H + M);
    {
      const g = tint.g;
      // Fresnel: more body colour toward the viewer
      g.fillStyle = vgrad(g, hy, H, [[0, 'rgba(40,150,210,0)'], [0.1, 'rgba(30,140,205,0.1)'], [0.45, 'rgba(18,116,192,0.36)'], [1, 'rgba(12,88,165,0.62)']]);
      g.fillRect(-M, hy - 1, W + 2 * M, Hw + M + 1);
      // bright skin of light along the horizon
      g.fillStyle = vgrad(g, hy - 1, hy + 16, [[0, 'rgba(255,255,255,0.75)'], [0.25, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']]);
      g.fillRect(-M, hy - 1, W + 2 * M, 17);
      // bottom vignette for UI legibility
      g.fillStyle = vgrad(g, H * 0.89, H + M, [[0, 'rgba(8,46,90,0)'], [1, 'rgba(8,46,90,0.5)']]);
      g.fillRect(-M, H * 0.89, W + 2 * M, H * 0.11 + M);
    }
    // still-water sheen: long faint lines (calm)
    const sheen = sceneLayer(st, hy, H + M);
    {
      const g = sheen.g;
      g.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const u = Math.pow(r(), 1.6), y = hy + 3 + u * Hw * 0.95;
        const len = W * r.range(0.08, 0.3) * (0.4 + u * 1.4), x = r() * W;
        if (Math.abs(x - W / 2) < W * 0.3 && y > H * 0.62 && y < gy + 10) continue;
        g.strokeStyle = rgba('#ffffff', r.range(0.08, 0.22) * (1 - u * 0.5));
        g.lineWidth = 0.5 + u * 1.1;
        g.beginPath(); g.moveTo(x - len / 2, y); g.lineTo(x + len / 2, y); g.stroke();
      }
    }
    // wind chop: two horizontally periodic textures (scrolled per frame)
    const Wl = W + 2 * M;
    const chop = (seed, n) => {
      const Lc = makeLayer(Wl, Hw + M + 2, dpr);
      const g = Lc.g; g.translate(0, -hy);
      const cr = rng(seed);
      g.lineCap = 'round';
      const dash = (x, y, len, w, col) => {
        g.strokeStyle = col; g.lineWidth = w;
        for (let k = -1; k <= 1; k++) { const xx = x + k * Wl; if (xx + len < 0 || xx - len > Wl) continue; g.beginPath(); g.moveTo(xx - len / 2, y); g.quadraticCurveTo(xx, y - w * 0.8, xx + len / 2, y); g.stroke(); }
      };
      for (let i = 0; i < n; i++) {
        const u = Math.pow(cr(), 1.35), y = hy + 2 + u * (Hw + 4);
        const len = (3 + u * 34) * cr.range(0.6, 1.5), w = 0.5 + u * 2.1, x = cr() * Wl;
        dash(x, y + w * 1.3, len * 1.1, w * 1.2, rgba('#1d6fae', cr.range(0.12, 0.26)));
        dash(x, y, len, w, rgba('#ffffff', cr.range(0.28, 0.6) * (1 - u * 0.3)));
      }
      return Lc;
    };
    const chopA = chop(71, Math.round(520 * (st.low ? 0.6 : 1)));
    const chopB = chop(72, Math.round(360 * (st.low ? 0.6 : 1)));

    // reflection buffer (slightly under-sampled: water softens a touch)
    const rs = Math.max(1, Math.min(dpr, 1.5) * 0.8);
    const refl = makeCanvas(Wl * rs, (Hw + M) * rs);
    refl.g = refl.getContext('2d');
    refl.rs = rs; refl.bh = Hw + M;

    // ------------------------------------------------------- overlays
    grads.heavy = vgrad(ctx, 0, H, [[0, 'rgba(96,112,132,0.62)'], [0.55, 'rgba(150,164,180,0.42)'], [0.6, 'rgba(120,136,154,0.4)'], [1, 'rgba(44,62,84,0.5)']]);
    grads.warm = vgrad(ctx, 0, H, [[0, 'rgba(255,170,120,0.06)'], [0.3, 'rgba(255,196,140,0.16)'], [0.53, 'rgba(255,206,150,0.42)'], [0.575, 'rgba(255,214,160,0.5)'], [0.62, 'rgba(255,190,130,0.24)'], [1, 'rgba(255,150,90,0.1)']]);

    // -------------------------------------------------------- sprites
    sprites.sunSoft = glowSprite(C.sun, { size: 128 });
    sprites.sunCore = glowSprite('#ffffff', { size: 64, core: 0.95, falloff: 3 });
    sprites.gold = glowSprite(C.gold, { size: 128 });
    sprites.white = glowSprite('#ffffff', { size: 128 });
    sprites.cyan = glowSprite('#c6f6ff', { size: 128 });
    sprites.gust = glowSprite('#1f6fae', { size: 64 });
    sprites.glint = glintSprite('#e6fbff', 48);
    sprites.dot = glowSprite('#ffffff', { size: 32, core: 0.8 });
    sprites.mote = glowSprite('#fff2cf', { size: 64, core: 0.8 });
    sprites.moteBlue = glowSprite('#d2f8ff', { size: 64, core: 0.8 });
    sprites.halo = haloSprite(256);
    sprites.fluff = fluffSprite(40);
    sprites.list = [sprites.mote, sprites.moteBlue, sprites.dot, sprites.fluff];
    sprites.beam = beamSprite();
    sprites.stone = stoneSprite(W * 0.74, dpr);

    // --------------------------------------------------------- clouds
    const cr = rng(64);
    clouds = [
      { x: 0.18, y: 0.115, w: 0.78, h: 0.03, v: 2.1 },
      { x: 0.8, y: 0.205, w: 0.56, h: 0.022, v: 2.8 },
      { x: 0.32, y: 0.345, w: 0.84, h: 0.026, v: 1.6 },
      { x: 0.92, y: 0.44, w: 0.5, h: 0.017, v: 2.3 },
      { x: 0.08, y: 0.505, w: 0.56, h: 0.012, v: 1.2 },
    ].map((d) => ({ ...d, spr: streakSprite(d.w * W, d.h * H, cr, dpr) }));

    // -------------------------------------------------------- islands
    //  wz: 0 = on the horizon … 1 = at the bottom edge (perspective depth)
    //  tx: resting x in the transformed (harmonious) arrangement
    const defs = [
      { x: 0.58, wz: 0.008, kind: 'tree2', wrap: true, v: 1.2, tx: 0.67 },
      { x: 0.3, wz: 0.022, kind: 'tree', wrap: true, v: 1.6, tx: 0.3 },
      { x: 0.8, wz: 0.03, kind: 'rocks', wrap: true, v: 1.1, tx: 0.775 },
      { x: 0.17, wz: 0.085, kind: 'stones', wrap: false, range: 0.04, tx: 0.15 },
      { x: 0.87, wz: 0.16, kind: 'tree', wrap: false, range: 0.03, tx: 0.9 },
      { x: 0.03, wz: 0.33, kind: 'tree', wrap: false, range: 0.02, tx: 0.04 },
    ];
    const prev = islands;
    islands = defs.map((d, i) => {
      const s = 0.2 + 2.3 * d.wz;
      const w = W * 0.4 * s;
      const haze = clamp(0.5 - d.wz * 3.2);
      const spr = islandSprite(w, d.kind, rng(300 + i), haze, dpr);
      const o = prev[i];
      return { ...d, s, spr, hover: 0, depth: 0.12 + d.wz * 0.9, ph: (i * 1.7) % TAU, dxAcc: o ? o.dxAcc : 0, ph2: o ? o.ph2 : i * 0.9, cx: 0, yw: 0, yb: 0, tilt: 0 };
    });

    // ------------------------------------------------- glitter, birds…
    for (let i = 0; i < GN; i++) {
      const u = Math.pow(R(), 1.15);
      gyy[i] = hy + 2 + u * Hw * 0.97;
      gox[i] = (R() * 2 - 1) * (4 + u * W * 0.2) * (0.3 + 0.7 * R());
      gph[i] = R() * TAU; gsp[i] = R.range(1.2, 3.2); gsz[i] = (1.5 + u * 5) * R.range(0.7, 1.3);
    }
    for (let i = 0; i < BN; i++) { bx[i] = R() * W; by[i] = H * R.range(0.3, 0.44); bv[i] = R.range(5, 9) * (R() < 0.3 ? -1 : 1); bph[i] = R() * TAU; bs[i] = R.range(4, 6.5); }
    for (let i = 0; i < FN; i++) resetFluff(st, i, true);
    for (let i = 0; i < KN; i++) { kx[i] = R() * W; kz[i] = R.range(0.15, 0.9); kph[i] = R() * TAU; }

    L = { sky, overcast, fog, waterBase, tint, sheen, chopA, chopB, refl, hy, gy, Hw, Wl, sunX, sunY };
  }

  function resetFluff(st, i, initial) {
    const { W, H } = st;
    fx[i] = initial ? R() * W : -10 - R() * 30;
    fy[i] = H * R.range(0.2, 0.8);
    fv[i] = R.range(0.6, 1.4); fph[i] = R() * TAU; fsz[i] = R.range(5, 8.5); fa[i] = R.range(0.55, 0.95);
  }

  // ---------------------------------------------------------- sprites
  function haloSprite(size) {
    const c = makeCanvas(size, size);
    const g = c.getContext('2d');
    const h = size / 2;
    const gr = g.createRadialGradient(h, h, 0, h, h, h);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.78, 'rgba(255,255,255,0)');
    gr.addColorStop(0.87, 'rgba(255,212,196,0.16)');
    gr.addColorStop(0.91, 'rgba(255,250,232,0.36)');
    gr.addColorStop(0.945, 'rgba(196,236,255,0.24)');
    gr.addColorStop(0.985, 'rgba(176,214,255,0)');
    gr.addColorStop(1, 'rgba(176,214,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }

  function fluffSprite(size) {
    const c = makeCanvas(size, size);
    const g = c.getContext('2d');
    const cx = size / 2, cy = size * 0.48, rr = size * 0.36;
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, rr * 1.2);
    gl.addColorStop(0, 'rgba(255,255,255,0.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(0, 0, size, size);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = size * 0.022; g.lineCap = 'round';
    for (let k = 0; k < 13; k++) {
      const a = -Math.PI * (0.06 + 0.88 * (k / 12));
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.85); g.stroke();
    }
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + size * 0.02, cy + size * 0.36); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, size * 0.04, 0, TAU); g.fill();
    return c;
  }

  function beamSprite() {
    const c = makeCanvas(64, 256);
    const g = c.getContext('2d');
    const gx = g.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, 'rgba(255,252,236,0)'); gx.addColorStop(0.5, 'rgba(255,252,236,1)'); gx.addColorStop(1, 'rgba(255,252,236,0)');
    g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';
    const gy2 = g.createLinearGradient(0, 0, 0, 256);
    gy2.addColorStop(0, 'rgba(0,0,0,0)'); gy2.addColorStop(0.6, 'rgba(0,0,0,0.5)'); gy2.addColorStop(1, 'rgba(0,0,0,0.95)');
    g.fillStyle = gy2; g.fillRect(0, 0, 64, 256);
    return c;
  }

  // long soft lenticular streak: soft lobes for wispy edges + a defined core
  function streakSprite(w, h, r, dpr) {
    const pad = h * 2;
    const cw = w + pad * 2, ch = h * 4;
    const c = makeCanvas(cw * dpr, ch * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const base = ch * 0.55;
    const n = Math.max(6, Math.round(w / (h * 1.6)));
    const lobes = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), bell = Math.pow(Math.sin(u * Math.PI), 0.7);
      lobes.push([pad + u * w + r.range(-0.3, 0.3) * h, base - bell * h * 0.25 + r.range(-0.15, 0.15) * h, (w / n) * r.range(0.9, 1.5), h * (0.18 + 0.42 * bell) * r.range(0.85, 1.15)]);
    }
    // underside shade (soft lavender-blue)
    for (const [x, y, rx, ry] of lobes) softBlob(g, x, y + ry * 0.45, rx * 1.1, '#a9c7e6', 0.35, 1, (ry * 1.25) / rx);
    // body union
    const union = (dy) => { g.beginPath(); for (const [x, y, rx, ry] of lobes) { g.moveTo(x + rx, y + dy); g.ellipse(x, y + dy, rx, ry, 0, 0, TAU); } };
    g.globalAlpha = 0.75;
    g.fillStyle = vgrad(g, base - h * 0.6, base + h * 0.5, [[0, '#ffffff'], [0.6, '#eef7fd'], [1, '#c9def0']]);
    union(0); g.fill();
    g.globalAlpha = 0.6;
    g.fillStyle = '#ffffff';
    g.beginPath(); for (const [x, y, rx, ry] of lobes) { g.moveTo(x + rx * 0.8, y - ry * 0.2); g.ellipse(x, y - ry * 0.2, rx * 0.8, ry * 0.6, 0, 0, TAU); } g.fill();
    g.globalAlpha = 1;
    // wispy soft halo + trailing tails
    for (const [x, y, rx, ry] of lobes) softBlob(g, x, y, rx * 1.35, '#ffffff', 0.28, 1, (ry * 2) / rx);
    softBlob(g, pad - h * 0.4, base + h * 0.05, w * 0.18, '#ffffff', 0.3, 1, 0.08);
    softBlob(g, pad + w + h * 0.4, base - h * 0.05, w * 0.2, '#ffffff', 0.3, 1, 0.07);
    c.cssW = cw; c.cssH = ch; c.base = base;
    return c;
  }

  // a soft domed islet resting on the water: pebble shore, mossy mound and
  // one rounded tree, a balanced cairn, or a pile of smooth boulders
  function islandSprite(w, kind, r, haze, dpr) {
    const pad = w * 0.14;
    const cw = w + pad * 2, chH = w * 1.25;
    const c = makeCanvas(cw * dpr, chH * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const cx = cw / 2, base = chH * 0.9, rx = w / 2;
    const mh = w * (kind === 'rocks' ? 0.2 : 0.23) * r.range(0.88, 1.12);
    const peak = r.range(-0.15, 0.15) * rx;
    const lw = Math.max(0.7, w * 0.01);
    const stone = (x, y, srx, sry, shade = 1) => {
      softBlob(g, x, y + sry * 0.7, srx * 1.05, '#3f7f96', 0.3 * shade, 1, 0.3);
      const sg = g.createRadialGradient(x + srx * 0.32, y - sry * 0.45, 0, x, y, srx * 1.1);
      sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.45, '#d4e0ec'); sg.addColorStop(1, '#88a0bd');
      g.fillStyle = sg;
      g.beginPath(); g.ellipse(x, y, srx, sry, 0, 0, TAU); g.fill();
    };
    if (kind === 'rocks') {
      // a few big smooth boulders rising from the water
      const rocks = [[-0.42, 0.42, 0.62], [0.12, 0.56, 1], [0.6, 0.34, 0.55], [-0.08, 0.3, 0.42]];
      for (const [ox, sz, hh] of rocks) {
        const srx = w * sz * 0.5, sry = w * 0.32 * hh;
        const x = cx + ox * rx, y = base - sry * 0.55;
        const sg = g.createRadialGradient(x + srx * 0.35, y - sry * 0.5, 0, x, y, Math.max(srx, sry) * 1.1);
        sg.addColorStop(0, '#fbfdff'); sg.addColorStop(0.4, '#d2deeb'); sg.addColorStop(0.85, '#94abc6'); sg.addColorStop(1, '#7d97b6');
        g.fillStyle = sg;
        g.beginPath(); g.ellipse(x, y, srx, sry, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = lw;
        g.beginPath(); g.ellipse(x, y, srx * 0.95, sry * 0.93, 0, Math.PI * 1.25, Math.PI * 1.85); g.stroke();
        // a cap of moss on the biggest
        if (hh === 1) { softBlob(g, x - srx * 0.1, y - sry * 0.72, srx * 0.6, '#9fe6cc', 0.7, 1, 0.32); }
      }
    } else {
      // pebble shore just above the waterline
      for (let i = 0; i < 9; i++) {
        const u = i / 8;
        const x = cx + (u * 2 - 1) * rx * 0.95, srx = w * r.range(0.05, 0.085);
        stone(x, base - srx * 0.25, srx, srx * 0.5, 0.6);
      }
      // mossy dome
      const dome = () => {
        g.beginPath();
        g.moveTo(cx - rx, base);
        g.bezierCurveTo(cx - rx * 0.92, base - mh * 0.75, cx - rx * 0.45 + peak, base - mh, cx + peak, base - mh);
        g.bezierCurveTo(cx + rx * 0.45 + peak, base - mh, cx + rx * 0.92, base - mh * 0.7, cx + rx, base);
        g.closePath();
      };
      dome();
      g.fillStyle = vgrad(g, base - mh, base, [[0, '#d8fbea'], [0.45, '#9ae3c8'], [1, '#5fbfa8']]);
      g.fill();
      g.save(); dome(); g.clip();
      const lg = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
      lg.addColorStop(0, 'rgba(30,96,110,0.32)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(0.85, 'rgba(255,255,255,0.3)'); lg.addColorStop(1, 'rgba(255,255,255,0.1)');
      g.fillStyle = lg; g.fillRect(cx - rx, base - mh, w, mh + 1);
      g.fillStyle = vgrad(g, base - mh * 0.35, base, [[0, 'rgba(170,240,255,0)'], [1, 'rgba(170,240,255,0.45)']]);
      g.fillRect(cx - rx, base - mh, w, mh + 1);
      // soft moss tufts
      for (let i = 0; i < 7; i++) softBlob(g, cx + r.range(-0.8, 0.8) * rx, base - mh * r.range(0.2, 0.8), w * r.range(0.05, 0.1), r() < 0.5 ? '#e8fff4' : '#4fae98', 0.35, 1, 0.55);
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = lw * 1.2;
      g.beginPath();
      g.moveTo(cx + peak - rx * 0.1, base - mh * 0.99);
      g.bezierCurveTo(cx + rx * 0.45 + peak, base - mh, cx + rx * 0.88, base - mh * 0.68, cx + rx * 0.97, base - mh * 0.12);
      g.stroke();
      // front pebbles overlap the moss foot
      for (let i = 0; i < 5; i++) {
        const x = cx + r.range(-0.75, 0.75) * rx, srx = w * r.range(0.04, 0.07);
        stone(x, base - srx * 0.2, srx, srx * 0.48, 0.5);
      }
    }
    const topY = base - mh * 0.92 + 1;
    const tree = (tx, th, cr) => {
      softBlob(g, tx, topY + 1, cr * 0.9, '#2f8f84', 0.4, 1, 0.25);
      const lean = r.range(-0.08, 0.12) * th;
      g.lineCap = 'round';
      g.strokeStyle = '#97aac0'; g.lineWidth = Math.max(1.4, w * 0.04);
      g.beginPath(); g.moveTo(tx, topY); g.quadraticCurveTo(tx - th * 0.08, topY - th * 0.5, tx + lean, topY - th); g.stroke();
      g.strokeStyle = '#eef3f8'; g.lineWidth = Math.max(0.7, w * 0.016);
      g.beginPath(); g.moveTo(tx + w * 0.008, topY); g.quadraticCurveTo(tx - th * 0.08 + w * 0.008, topY - th * 0.5, tx + lean + w * 0.006, topY - th); g.stroke();
      const ccx = tx + lean, ccy = topY - th - cr * 0.45;
      const b = [[ccx, ccy, cr], [ccx - cr * 0.62, ccy + cr * 0.28, cr * 0.64], [ccx + cr * 0.6, ccy + cr * 0.24, cr * 0.68], [ccx - cr * 0.26, ccy - cr * 0.42, cr * 0.7], [ccx + cr * 0.3, ccy - cr * 0.36, cr * 0.62], [ccx + cr * 0.05, ccy + cr * 0.42, cr * 0.66]];
      billowCloud(g, b, { top: '#c8f7ea', bottom: '#46aab0', y0: ccy - cr * 1.1, y1: ccy + cr * 1.1, rim: '#f6fffc', rimA: 0.95, rimDx: -Math.max(1, w * 0.015), rimDy: Math.max(1, w * 0.015), crown: '#ffffff', crownA: 0.42, shade: '#2a8496', shadeA: 0.34 });
    };
    if (kind === 'tree') tree(cx + peak + r.range(-0.1, 0.1) * rx, w * 0.3, w * 0.2);
    else if (kind === 'tree2') { tree(cx + peak - rx * 0.12, w * 0.38, w * 0.16); stone(cx + rx * 0.45, base - mh * 0.55, w * 0.06, w * 0.035); }
    else if (kind === 'stones') {
      // balanced cairn
      let y = topY + 1;
      const sizes = [0.12, 0.095, 0.074, 0.054];
      let x = cx + peak;
      for (const sz of sizes) {
        const srx = w * sz, sry = srx * 0.56;
        y -= sry * 0.92;
        x += r.range(-0.2, 0.2) * srx;
        stone(x, y, srx, sry);
        y -= sry * 0.82;
      }
    }
    if (haze > 0) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = rgba('#e3f6fd', haze);
      g.fillRect(0, 0, cw, chH);
      g.globalCompositeOperation = 'source-over';
    }
    c.cssW = cw; c.cssH = chH; c.bottom = base; c.d = mh; c.rx = rx;
    return c;
  }

  // smooth, low river stone for the Mallow (with its own short reflection)
  function stoneSprite(w, dpr) {
    const rx = w * 0.46, ry = rx * 0.25, th = rx * 0.15, pad = 10;
    const cw = w, ch = pad * 2 + ry * 2 + th * 2 + ry * 0.6;
    const c = makeCanvas(cw * dpr, ch * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const cx = cw / 2, ty = pad + ry, wl = ty + th;
    const band = (yA, yB, rxB) => {
      g.beginPath();
      g.ellipse(cx, yB, rxB, ry, 0, 0, Math.PI);
      g.lineTo(cx - rx, yA);
      g.ellipse(cx, yA, rx, ry, 0, Math.PI, 0, true);
      g.closePath();
    };
    // mirrored body below the waterline
    band(wl, wl + th * 1.1, rx * 0.97);
    g.fillStyle = vgrad(g, wl + ry * 0.5, wl + th + ry, [[0, 'rgba(110,140,178,0.5)'], [1, 'rgba(110,140,178,0)']]);
    g.fill();
    // body (rounded side), clipped details
    const body = () => { g.beginPath(); g.ellipse(cx, ty, rx, ry, 0, Math.PI, TAU); g.lineTo(cx + rx * 0.985, wl); g.ellipse(cx, wl, rx * 0.985, ry, 0, 0, Math.PI); g.closePath(); };
    body();
    g.fillStyle = vgrad(g, ty - ry, wl + ry, [[0, '#a9c6e6'], [0.45, '#86aad3'], [0.75, '#6489b8'], [1, '#3f6497']]);
    g.fill();
    g.save(); body(); g.clip();
    const sl = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
    sl.addColorStop(0, 'rgba(50,80,130,0.28)'); sl.addColorStop(0.55, 'rgba(255,255,255,0)'); sl.addColorStop(0.9, 'rgba(255,255,255,0.3)'); sl.addColorStop(1, 'rgba(255,255,255,0.1)');
    g.fillStyle = sl; g.fillRect(cx - rx, ty - ry, w, th + ry * 2.2);
    // cyan bounce light off the water along the foot
    g.fillStyle = vgrad(g, wl + ry * 0.4, wl + ry, [[0, 'rgba(170,240,255,0)'], [1, 'rgba(170,240,255,0.5)']]);
    g.fillRect(cx - rx, wl, w, ry * 1.1);
    // a little moss on the shaded flank
    g.restore();
    // top face, blending into the rounded edge
    const fy = ty - th * 0.12;
    const tg = g.createRadialGradient(cx + rx * 0.22, fy - ry * 0.45, 0, cx + rx * 0.05, fy, rx * 0.98);
    tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.16, '#eaf5ff'); tg.addColorStop(0.5, '#c4dcf2'); tg.addColorStop(0.85, '#a7c4e4'); tg.addColorStop(1, 'rgba(169,198,230,0)');
    g.save();
    g.translate(0, fy); g.scale(1, ry / rx); g.translate(0, -fy);
    g.fillStyle = tg;
    g.beginPath(); g.arc(cx, fy, rx * 0.98, 0, TAU); g.fill();
    g.restore();
    g.save();
    g.beginPath(); g.ellipse(cx, fy, rx * 0.95, ry * 0.9, 0, 0, TAU); g.clip();
    const sr = rng(77);
    for (let i = 0; i < 30; i++) {
      const a = sr() * TAU, dd = Math.sqrt(sr()) * 0.92;
      softBlob(g, cx + Math.cos(a) * rx * dd, fy + Math.sin(a) * ry * dd, rx * sr.range(0.03, 0.1), sr() < 0.5 ? '#ffffff' : '#9cb3cc', 0.2, 1, 0.32);
    }
    g.restore();
    // sky tint on the far half of the face, and the Mallow's soft contact shadow
    softBlob(g, cx - rx * 0.2, fy - ry * 0.5, rx * 0.7, '#bfe6fb', 0.35, 1, 0.3);
    softBlob(g, cx, fy + ry * 0.12, rx * 0.62, '#36577f', 0.42, 1, 0.26);
    softBlob(g, cx, fy + ry * 0.12, rx * 0.4, '#2a4870', 0.3, 1, 0.22);
    // lit back rim + soft roll of light on the front-right edge
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(cx, ty, rx * 0.975, ry * 0.94, 0, Math.PI * 1.15, Math.PI * 1.9); g.stroke();
    softBlob(g, cx + rx * 0.62, ty + ry * 0.62, rx * 0.22, '#ffffff', 0.35, 1, 0.22);
    // the rounded front edge catching the light
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(cx, fy + 0.5, rx * 0.965, ry * 0.93, 0, 0.18, Math.PI - 0.18); g.stroke();
    g.strokeStyle = 'rgba(40,80,130,0.18)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(cx, fy + 2.6, rx * 0.97, ry * 0.95, 0, 0.25, Math.PI - 0.25); g.stroke();
    // waterline: dark contact + bright meniscus
    g.strokeStyle = 'rgba(16,70,120,0.25)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(cx, wl + 1.2, rx * 0.99, ry * 1.01, 0, 0.05, Math.PI - 0.05); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.1;
    g.beginPath(); g.ellipse(cx, wl + 0.6, rx * 1.01, ry * 1.03, 0, 0.08, Math.PI - 0.08); g.stroke();
    c.cssW = cw; c.cssH = ch; c.ty = ty; c.wl = wl; c.rx = rx; c.ry = ry;
    return c;
  }

  // ------------------------------------------------------------ frame
  function updateIslands(st) {
    const { W, dt, t, p } = st;
    const e = smoothstep(0, 1, p);
    const span = W * 1.36;
    for (const isl of islands) {
      let x;
      if (isl.wrap) {
        isl.dxAcc += isl.v * (1 + wind * 7) * (1 - p) * dt;
        x = isl.x * W + isl.dxAcc;
        x = (((x + W * 0.18) % span) + span) % span - W * 0.18;
      } else {
        isl.ph2 += dt * (0.045 + wind * 0.45) * (1 - p);
        x = isl.x * W + Math.sin(isl.ph2 + isl.ph) * isl.range * W;
      }
      x = lerp(x, isl.tx * W, e);
      const bob = Math.sin(t * 0.42 + isl.ph) * (0.5 + wind * 1.6) * isl.s * (1 - p * 0.8);
      isl.cx = x + st.camX * isl.depth;
      isl.yw = L.hy + isl.wz * L.Hw + st.camY * isl.depth * 0.6;
      isl.yb = isl.yw - isl.hover + bob;
      isl.tilt = Math.sin(t * 0.8 + isl.ph * 2) * wind * 0.05;
    }
  }

  function drawIsland(g, isl) {
    const spr = isl.spr;
    if (isl.tilt > 0.002 || isl.tilt < -0.002) {
      g.translate(isl.cx, isl.yb); g.rotate(isl.tilt);
      g.drawImage(spr, -spr.cssW / 2, -spr.bottom, spr.cssW, spr.cssH);
    } else {
      g.translate(isl.cx, isl.yb);
      g.drawImage(spr, -spr.cssW / 2, -spr.bottom, spr.cssW, spr.cssH);
    }
  }

  function drawSun(g, st, sx, sy, sunA, warmK, p, cl, hv) {
    const W = st.W;
    g.globalAlpha = (0.2 + 0.06 * p) * sunA; blit(g, sprites.sunSoft, sx, sy, W * 0.5, W * 0.5);
    g.globalAlpha = 0.55 * sunA; blit(g, sprites.sunSoft, sx, sy, W * 0.13, W * 0.13);
    g.globalAlpha = (0.8 + 0.2 * cl) * sunA; blit(g, sprites.sunCore, sx, sy, W * 0.052, W * 0.052);
    if (warmK > 0.01) { g.globalAlpha = warmK * 0.3 * (0.4 + 0.6 * sunA); blit(g, sprites.gold, sx, sy, W * 0.26, W * 0.26); }
  }

  function frame(g, st) {
    const { W, H, M, m, p, dt, rdt, t, density } = st;
    const { hy, Hw, gy, Wl, refl } = L;
    const ag = m.agitation, hv = m.heaviness, cl = m.clarity, wm = m.warmth;

    wind += (ag - wind) * (1 - Math.exp(-rdt / 1.1));
    windPh += dt * (0.25 + wind * 2.4) * (1 - p * 0.95);
    if (clearPos < 1.3) clearPos += rdt / 2.4;
    else clearBoost *= Math.exp(-rdt / 3.5);
    const clearCalm = clearBoost * clamp(clearPos);
    const sunA = clamp(1 - hv * 0.78);
    const warmK = clamp(smoothstep(0.48, 1, wm) * 0.95 + p * 0.25) * (1 - hv * 0.6);
    const fogK = clamp((1 - cl) * 0.6 + hv * 0.4 - 0.12) * (1 - p * 0.9);
    const sx = L.sunX + st.camX * SKY_D, sy = L.sunY + st.camY * SKY_D;

    updateIslands(st);
    for (const c of clouds) {
      c.x += (c.v * (1 + wind * 7) * (1 - p * 0.85) * dt) / W;
      const lim = 0.5 + c.w * 0.5 + 0.1;
      if (c.x > 0.5 + lim) c.x -= lim * 2;
    }

    // 1 sky ---------------------------------------------------------
    drawLayer(g, L.sky, st, SKY_D);
    if (hv > 0.02) drawLayer(g, L.overcast, st, SKY_D, clamp(hv * 1.15) * 0.88);
    g.globalCompositeOperation = 'lighter';
    drawSun(g, st, sx, sy, sunA, warmK, p, cl, hv);
    const haloA = (0.04 + 0.08 * smoothstep(0.55, 1, cl) + 0.13 * p) * sunA;
    if (haloA > 0.01) { g.globalAlpha = haloA; blit(g, sprites.halo, sx, sy, W * 0.3, W * 0.3); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    const cloudA = 0.92 - hv * 0.35;
    g.globalAlpha = cloudA;
    for (const c of clouds) {
      const spr = c.spr;
      g.drawImage(spr, c.x * W - spr.cssW / 2 + st.camX * 0.12, c.y * H - spr.base + st.camY * 0.12, spr.cssW, spr.cssH);
    }
    g.globalAlpha = 1;
    drawBirds(g, st, hv);

    // 2 reflection buffer -------------------------------------------
    const rg = refl.g, rs = refl.rs;
    rg.setTransform(rs, 0, 0, -rs, rs * M, rs * hy);
    rg.globalCompositeOperation = 'source-over';
    rg.globalAlpha = 1;
    drawLayer(rg, L.sky, st, SKY_D);
    if (hv > 0.02) drawLayer(rg, L.overcast, st, SKY_D, clamp(hv * 1.15) * 0.88);
    rg.globalCompositeOperation = 'lighter';
    drawSun(rg, st, sx, sy, sunA, warmK, p, cl, hv);
    rg.globalAlpha = 1;
    rg.globalCompositeOperation = 'source-over';
    rg.globalAlpha = cloudA;
    for (const c of clouds) {
      const spr = c.spr;
      const yy = c.y * H - spr.base + st.camY * 0.12;
      if (yy + spr.cssH < hy - Hw - M) continue;
      rg.drawImage(spr, c.x * W - spr.cssW / 2 + st.camX * 0.12, yy, spr.cssW, spr.cssH);
    }
    rg.globalAlpha = 1;
    for (const isl of islands) {
      rg.setTransform(rs, 0, 0, -rs, rs * M, rs * (2 * isl.yw - hy));
      rg.save(); drawIsland(rg, isl); rg.restore();
    }
    rg.setTransform(1, 0, 0, 1, 0, 0);

    // 3 water -------------------------------------------------------
    drawLayer(g, L.waterBase, st, 0);
    const reflA = clamp(0.94 - wind * 0.4 - hv * 0.22 + cl * 0.06 + p * 0.2, 0.35, 1);
    const A = (0.3 + wind * 9) * (1 - p);
    const bw = Wl * rs;
    g.globalAlpha = reflA;
    if (A < 0.12) {
      g.drawImage(refl, 0, 0, bw, refl.bh * rs, -M, hy, Wl, refl.bh);
    } else {
      const sliceMul = st.low ? 1.6 : 1;
      const maxSy = refl.bh;
      let yb = 0;
      while (yb < Hw) {
        const hs = Math.min(Hw - yb, (1.1 + yb * 0.046) * sliceMul);
        const ym = yb + hs * 0.5, f = ym / Hw;
        const ph = Math.sqrt(ym) * 2.3;
        let damp = 1;
        if (clearBoost > 0.01) damp = 1 - clearBoost * 0.94 * smoothstep(clearPos + 0.07, clearPos - 0.07, f);
        const amp = A * (0.18 + 0.82 * f) * damp;
        const off = amp * (Math.sin(ph * 3.1 - t * 2.0) + 0.55 * Math.sin(ph * 7.7 + t * 1.45 + 1.3)) * 0.65;
        let sy0 = yb + amp * 0.4 * Math.sin(ph * 5.3 + t * 2.6);
        if (sy0 < 0) sy0 = 0; else if (sy0 > maxSy - hs) sy0 = maxSy - hs;
        g.drawImage(refl, 0, sy0 * rs, bw, hs * rs, -M + off, hy + yb, Wl, hs + 0.6);
        yb += hs;
      }
    }
    g.globalAlpha = 1;
    drawLayer(g, L.tint, st, 0);

    // calm sheen vs. wind chop
    const sheenA = (1 - wind) * (1 - wind) * (0.3 + 0.6 * cl) * (1 - hv * 0.5);
    if (sheenA > 0.01) drawLayer(g, L.sheen, st, 0.3, sheenA);
    const chopK = smoothstep(0.06, 0.8, wind) * (1 - clearCalm * 0.9) * (1 - p);
    if (chopK > 0.01) {
      const a = (windPh * 34) % Wl, b = (windPh * 21 + 120) % Wl;
      const ox = st.camX * 0.3, oy = hy + st.camY * 0.2;
      g.globalAlpha = chopK * (0.85 - hv * 0.25);
      g.drawImage(L.chopA.c, -M - a + ox, oy, Wl, L.chopA.h); g.drawImage(L.chopA.c, -M - a + Wl + ox, oy, Wl, L.chopA.h);
      g.globalAlpha = chopK * 0.7;
      g.drawImage(L.chopB.c, -M + b - Wl + ox, oy + 1, Wl, L.chopB.h); g.drawImage(L.chopB.c, -M + b + ox, oy + 1, Wl, L.chopB.h);
      // cat's-paw gusts darkening patches of water
      for (let i = 0; i < KN; i++) {
        kx[i] += (24 + wind * 70) * (0.5 + kz[i]) * rdt * st.motion;
        const rx = 50 + kz[i] * 170, ry = 3 + kz[i] * 22;
        if (kx[i] - rx > W) { kx[i] = -rx; kz[i] = R.range(0.12, 0.9); }
        const yy = hy + kz[i] * Hw * 0.9 + Math.sin(t * 0.3 + kph[i]) * 4;
        g.globalAlpha = chopK * 0.26 * stageFade(kx[i], yy, W, H, st.groundY, 0.35);
        blit(g, sprites.gust, kx[i], yy, ry, rx);
      }
      g.globalAlpha = 1;
    }

    // sun glitter
    g.globalCompositeOperation = 'lighter';
    const gN = Math.round(GN * density);
    const gBase = (0.2 + 0.8 * cl) * sunA * (0.55 + wind * 0.9) * (1 - p * 0.5);
    if (gBase > 0.01) {
      const spread = 1 + wind * 1.6;
      for (let i = 0; i < gN; i++) {
        const tw = Math.sin(t * gsp[i] * (1 + wind) + gph[i]);
        if (tw <= 0.2) continue;
        const x = sx + gox[i] * spread + st.camX * 0.3, y = gyy[i];
        const a = tw * tw * tw * gBase * stageFade(x, y, W, H, st.groundY, 0.12);
        if (a < 0.01) continue;
        g.globalAlpha = a;
        const s = gsz[i] * (0.65 + 0.35 * cl);
        if (s > 3.2) blit(g, sprites.glint, x, y, s, s * 1.4); else blit(g, sprites.dot, x, y, s, s * 1.6);
      }
    }
    // the calm front of a 'clear' breeze
    if (clearBoost > 0.02 && clearPos < 1.2) {
      const yF = hy + clamp(clearPos) * Hw;
      g.globalAlpha = clearBoost * 0.3 * (1 - clearPos / 1.25);
      blit(g, sprites.white, W * 0.5, yF, 4 + 18 * clamp(clearPos), W * 0.75);
    }
    // crisp horizon line (clarity)
    g.globalAlpha = (0.2 + 0.6 * cl) * (1 - hv * 0.6) * (1 - fogK * 0.6);
    g.fillStyle = '#ffffff';
    g.fillRect(0, hy - 0.6 + st.camY * SKY_D, W, 1.2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 4 islands (far → fog → near) -----------------------------------
    let fogDone = false;
    for (const isl of islands) {
      if (!fogDone && isl.wz > 0.06) {
        if (fogK > 0.01) drawLayer(g, L.fog, st, SKY_D, fogK);
        fogDone = true;
      }
      g.save(); drawIsland(g, isl); g.restore();
      // waterline: soft contact shadow + bright meniscus
      const wr = isl.spr.rx * 0.93, wh = 0.6 + isl.s * 2.2;
      g.globalAlpha = 0.28; g.strokeStyle = '#1f6aa6'; g.lineWidth = 1 + isl.s * 1.6;
      g.beginPath(); g.ellipse(isl.cx, isl.yw + wh * 0.6, wr, wh, 0, 0.1, Math.PI - 0.1); g.stroke();
      g.globalAlpha = 0.7 * (0.6 + 0.4 * cl); g.strokeStyle = '#ffffff'; g.lineWidth = 0.6 + isl.s * 0.9;
      g.beginPath(); g.ellipse(isl.cx, isl.yw, wr * 1.02, wh, 0, 0.05, Math.PI - 0.05); g.stroke();
      g.globalAlpha = 1;
    }

    // 5 ripples ------------------------------------------------------
    spawnAmbient(st);
    rings.update(rdt); ringsDark.update(rdt);
    ringsDark.draw(g, 0.9);
    g.globalCompositeOperation = 'lighter';
    rings.draw(g, 0.75 + 0.25 * cl);
    g.globalCompositeOperation = 'source-over';

    // 6 Loomi's stone -----------------------------------------------
    {
      const spr = sprites.stone;
      const y0 = gy - 2 - spr.ty;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.22 + 0.12 * cl;
      blit(g, sprites.cyan, W * 0.5, y0 + spr.wl, spr.ry * 1.6, spr.rx * 1.3);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.drawImage(spr, W * 0.5 - spr.cssW / 2, y0, spr.cssW, spr.cssH);
    }

    // 7 drift particles ---------------------------------------------
    drawFluffs(g, st);
    drawDrops(g, st);

    // 8 atmosphere ----------------------------------------------------
    if (hv > 0.02) { g.globalAlpha = hv * 0.62; g.fillStyle = grads.heavy; g.fillRect(0, 0, W, H); }
    if (warmK > 0.01) { g.globalAlpha = warmK * 0.8; g.fillStyle = grads.warm; g.fillRect(0, 0, W, H); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'lighter';
    if (p > 0.01) {
      g.globalAlpha = p * 0.28; blit(g, sprites.white, W * 0.5, hy, H * 0.05, W * 0.8);
      g.globalAlpha = p * 0.05; blit(g, sprites.gold, sx, sy, W * 0.5, W * 0.5);
    }
    drawBlooms(g, st);
    // light motes (transform + success)
    if (p > 0.05 && motes.n < 46 * density && R() < rdt * p * 5 * density) {
      motes.spawn(R() * W, hy + R() * Hw * 0.7, R.range(-3, 3), -R.range(5, 13), R.range(5, 9), R.range(2, 4.5), R() < 0.6 ? 0 : 1, 0.75);
    }
    for (let i = 0; i < motes.n; i++) motes.vx[i] += Math.sin(t * 0.7 + i) * 2 * rdt;
    motes.update(dt, 0, 0.1);
    motes.draw(g, sprites.list, 0.9, 1);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawBirds(g, st, hv) {
    const { W, t, dt } = st;
    g.strokeStyle = '#2d6c9c';
    g.lineCap = 'round';
    g.lineWidth = 1.2;
    g.globalAlpha = 0.5 * (1 - hv * 0.4);
    g.beginPath();
    for (let i = 0; i < BN; i++) {
      bx[i] += bv[i] * (1 + wind * 1.5) * dt;
      if (bx[i] > W + 30) bx[i] = -30; else if (bx[i] < -30) bx[i] = W + 30;
      const x = bx[i] + st.camX * 0.15, y = by[i] + Math.sin(t * 0.25 + bph[i]) * 6 + st.camY * 0.15;
      const glide = Math.max(0, Math.sin(t * 0.35 + bph[i]));
      const f = 0.25 + 0.75 * glide * (0.5 + 0.5 * Math.sin(t * 5.5 + bph[i]));
      const s = bs[i];
      g.moveTo(x - s, y - s * 0.55 * f);
      g.quadraticCurveTo(x - s * 0.45, y - s * 0.7 * f, x, y);
      g.quadraticCurveTo(x + s * 0.45, y - s * 0.7 * f, x + s, y - s * 0.55 * f);
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  function drawFluffs(g, st) {
    const { W, H, t, dt, density } = st;
    const want = Math.round(14 * density);
    if (fluffN < want) fluffN = want; else if (fluffN > want) fluffN = want;
    const spr = sprites.fluff;
    for (let i = 0; i < fluffN; i++) {
      fx[i] += ((5 + wind * 75) * fv[i] * (1 - st.p * 0.6) + Math.sin(t * 0.3 + fph[i]) * 4) * dt;
      fy[i] += (Math.sin(t * 0.55 + fph[i]) * 4 - 1 + wind * 2 * Math.sin(t * 2 + fph[i])) * dt;
      if (fx[i] > W + 20 || fy[i] < -20 || fy[i] > H) resetFluff(st, i, false);
      const x = fx[i] + st.camX * 0.6, y = fy[i] + st.camY * 0.6;
      const a = fa[i] * stageFade(x, y, W, H, st.groundY, 0.1) * (1 - st.m.heaviness * 0.4);
      if (a < 0.02) continue;
      g.globalAlpha = a;
      const s = fsz[i];
      g.drawImage(spr, x - s, y - s, s * 2, s * 2);
    }
    g.globalAlpha = 1;
  }

  function drawDrops(g, st) {
    if (!dN) return;
    const { rdt } = st;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < dN; i++) {
      dvy[i] += 340 * rdt;
      dx[i] += dvx[i] * rdt; dy[i] += dvy[i] * rdt;
      if (dvy[i] > 0 && dy[i] >= dly[i]) {
        addRing(st, dx[i], dly[i], 1, 10, 1.1, 0.55);
        dN--; dx[i] = dx[dN]; dy[i] = dy[dN]; dvx[i] = dvx[dN]; dvy[i] = dvy[dN]; dly[i] = dly[dN]; i--; continue;
      }
      g.globalAlpha = 0.85;
      blit(g, sprites.dot, dx[i], dy[i], 2.4, 2.4);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawBlooms(g, st) {
    const { rdt, H } = st;
    for (const b of blooms) {
      if (!b.on) continue;
      b.age += rdt;
      if (b.age >= b.ttl) { b.on = false; continue; }
      const e = flashEnv(b.age, 0.3, 0.15, b.ttl - 0.45) * b.a;
      if (e < 0.004) continue;
      if (b.beam) {
        const top = Math.max(-20, b.y - H * 0.6);
        g.globalAlpha = e * 0.5;
        g.drawImage(sprites.beam, b.x - b.r * 0.9, top, b.r * 1.8, b.y - top);
      }
      g.globalAlpha = e * 0.55;
      blit(g, sprites.white, b.x, b.y, b.r, b.r * (b.beam ? 1.8 : b.sx));
      g.globalAlpha = e * 0.35;
      blit(g, sprites.gold, b.x, b.y, b.r * 1.8, b.r * 1.8 * b.sx);
    }
    g.globalAlpha = 1;
  }

  function bloom(x, y, r, ttl, a, beam, sx = 1) {
    let o = null;
    for (const b of blooms) if (!b.on) { o = b; break; }
    if (!o) o = blooms[0];
    o.on = true; o.x = x; o.y = y; o.r = r; o.sx = sx; o.ttl = ttl; o.a = a; o.beam = beam; o.age = 0;
  }

  // ------------------------------------------------------- water rings
  function depthAt(y) { return clamp((y - L.hy) / L.Hw); }
  function addRing(st, x, y, r0, r1, ttl, a, delay = 0) {
    const f = depthAt(y);
    const ps = 0.25 + 1.0 * f, asp = 0.1 + 0.26 * f;
    const o = rings.add(x, y, r0 * ps, r1 * ps, ttl, asp, '#ffffff', a, 0.8 + f * 1.1);
    o.age = -delay;
    if (a > 0.3) { const d = ringsDark.add(x, y + 1.5 * ps, r0 * ps, r1 * ps * 1.04, ttl, asp, '#3d8fc8', a * 0.4, 0.8 + f * 1.2); d.age = -delay; }
  }
  function stoneRing(st, delay, a = 0.5, spread = 1.75, ttl = 5) {
    const spr = sprites.stone;
    const y = st.H * st.groundY - 2 - spr.ty + spr.wl;
    const o = rings.add(st.W * 0.5, y, spr.rx * 1.02, spr.rx * spread, ttl, spr.ry / spr.rx, '#ffffff', a, 1.3);
    o.age = -delay;
    const d = ringsDark.add(st.W * 0.5, y + 2, spr.rx * 1.03, spr.rx * spread * 1.03, ttl, spr.ry / spr.rx, '#3d8fc8', a * 0.35, 1.4);
    d.age = -delay;
  }
  function inStage(st, x, y) { return Math.abs(x - st.W * 0.5) < st.W * 0.3 && y > st.H * 0.56 && y < st.H * (st.groundY + 0.05); }

  function spawnAmbient(st) {
    const { W, rdt, p } = st;
    nextStoneRing -= rdt;
    if (nextStoneRing <= 0) {
      nextStoneRing = R.range(4.5, 7) * (1 - p * 0.3);
      stoneRing(st, 0, 0.32 + 0.15 * p, 1.7, 5.5);
    }
    nextDrop -= rdt * (1 + wind * 4) * (1 - p * 0.6);
    if (nextDrop <= 0) {
      nextDrop = R.range(1.4, 3.2);
      const u = Math.pow(R(), 0.8), y = L.hy + 4 + u * L.Hw * 0.9;
      let x = R() * W;
      if (inStage(st, x, y)) x = x < W / 2 ? x - W * 0.3 : x + W * 0.3;
      if (wind > 0.35) addRing(st, x, y, 6, 70 + wind * 60, 2.8, 0.38 * wind);
      else addRing(st, x, y, 2, 26, 2.6, 0.45);
    }
  }

  // ------------------------------------------------------------- pulse
  function pulse(kind, x, y, st, gentle) {
    const { W, H, density } = st;
    const hy = L.hy;
    const k = gentle ? 0.55 : 1;
    const n = (c) => Math.max(1, Math.round(c * density * k));
    const onWater = y > hy + 2;
    const atStone = inStage(st, x, y);
    const wy = Math.max(y, hy + 6);
    if (kind === 'tap') {
      if (atStone) stoneRing(st, 0, 0.55 * k, 1.6, 3.2);
      else if (onWater) { addRing(st, x, wy, 2, 46, 2.4, 0.9 * k); addRing(st, x, wy, 1, 24, 2, 0.6 * k, 0.3); }
      else {
        // a puff of seed-fluffs scatters softly from the touch
        bloom(x, y, 20, 1.2, 0.5 * k, false);
        for (let i = 0; i < n(6); i++) { const a = R() * TAU, v = R.range(14, 34); motes.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - 6, R.range(1.8, 2.8), R.range(5, 8), 3, 0.95); }
      }
    } else if (kind === 'ripple') {
      if (atStone) for (let i = 0; i < 3; i++) stoneRing(st, i * 0.45, (0.6 - i * 0.12) * k, 1.9 + i * 0.25, 4);
      else for (let i = 0; i < 4; i++) addRing(st, x, wy, 3, 60 + i * 26, 3.2, (0.7 - i * 0.12) * k, i * 0.4);
    } else if (kind === 'success') {
      if (atStone) {
        // light gathers around Loomi and lifts off the stone's rim
        const spr = sprites.stone, sy = H * st.groundY - 2;
        bloom(W * 0.5, H * (st.groundY - 0.12), H * 0.16, 2.2, 0.55 * k, false, 1.7);
        stoneRing(st, 0, 0.65 * k, 2.1, 4); stoneRing(st, 0.5, 0.45 * k, 2.4, 4);
        for (let i = 0; i < n(22); i++) { const a = R() * TAU; motes.spawn(W * 0.5 + Math.cos(a) * spr.rx * 0.95, sy + Math.sin(a) * spr.ry, R.range(-8, 8), -R.range(22, 60), R.range(2, 3.4), R.range(2.5, 5), i % 3 === 0 ? 1 : 0, 0.95); }
      } else {
        bloom(x, y, 34, 1.8, 0.7 * k, false);
        addRing(st, x, wy, 4, 80, 3, 0.65 * k);
        for (let i = 0; i < n(18); i++) motes.spawn(x + R.range(-40, 40), y + R.range(-20, 25), R.range(-18, 18), -R.range(18, 55), R.range(1.8, 3.2), R.range(2.5, 5), i % 3 === 0 ? 1 : 0, 0.9);
      }
    } else if (kind === 'burst') {
      if (atStone) stoneRing(st, 0, 0.7 * k, 2, 3.4); else addRing(st, x, wy, 4, 70, 2.4, 0.8 * k);
      const ly = atStone ? H * st.groundY + 4 : wy;
      const cnt = n(16);
      for (let i = 0; i < cnt && dN < DN; i++) {
        const a = -Math.PI * R.range(0.15, 0.85), v = R.range(70, 170) * (gentle ? 0.7 : 1);
        dx[dN] = x + R.range(-6, 6); dy[dN] = ly - 2; dvx[dN] = Math.cos(a) * v; dvy[dN] = Math.sin(a) * v; dly[dN] = ly + R.range(-6, 14); dN++;
      }
      bloom(x, ly - 10, 22, 1, 0.5 * k, false);
      for (let i = 0; i < n(10); i++) motes.spawn(x, ly - 6, R.range(-60, 60), -R.range(30, 90), R.range(0.9, 1.5), R.range(1.6, 3), 2, 0.9);
    } else if (kind === 'strike') {
      // a soft shaft of sunlight settles on the spot (no lightning, no full-screen flash)
      const sy = onWater ? wy : y;
      bloom(x, sy, (st.reduced || gentle) ? 30 : 42, 2.2, (st.reduced || gentle) ? 0.45 : 0.75, !st.reduced);
      if (onWater) { addRing(st, x, sy, 6, 64, 2.6, 0.7 * k, 0.3); addRing(st, x, sy, 3, 36, 2.2, 0.5 * k, 0.55); }
      for (let i = 0; i < n(8); i++) motes.spawn(x + R.range(-10, 10), sy - R.range(10, 120), R.range(-6, 6), R.range(-10, 20), R.range(1.4, 2.4), R.range(2, 3.5), 0, 0.8);
    } else if (kind === 'clear') {
      // a breeze sweeps in from the horizon and leaves the water glass-smooth
      clearBoost = gentle ? 0.6 : 1; clearPos = 0;
      stoneRing(st, 1.6, 0.45 * k, 2.4, 4.5);
      for (let i = 0; i < FN; i++) if (R() < 0.6) { fx[i] = R.range(-60, W * 0.3); fv[i] = R.range(2.5, 4); }
      for (let i = 0; i < n(10); i++) motes.spawn(R() * W, hy + R.range(-10, 40), R.range(10, 30), -R.range(6, 16), R.range(2, 3.4), R.range(2, 4), 0, 0.75);
    }
  }

  return { build, frame, pulse };
}
