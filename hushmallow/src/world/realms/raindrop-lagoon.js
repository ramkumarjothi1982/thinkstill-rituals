// The Raindrop Lagoon — Blubi's realm.
// A blue-hour lagoon wrapped in pink haze.  Glass-bead raindrops hang in the
// air, cushion-soft lily pads float and bob on a mirror-still lagoon, ripple
// rings bloom across the water.  Heaviness lets real rain fall and dims the
// sky; clarity lifts every hanging drop upward until it becomes light.

import {
  clamp, lerp, smoothstep, rng, TAU, vgrad, rgba, glowSprite, glintSprite, blit, softBlob,
  Pool, Rings, stageFade, makeCanvas, sceneLayer, drawLayer, billowCloud, bankBillows,
} from '../util.js';

const C = {
  top: '#081d5e', high: '#0f3f9a', mid: '#2f86d8', low: '#8fd0f5', haze: '#ffc4ec', pink: '#ff8ef2',
  blue: '#0b8ff0', glow: '#7fd4ff', water: '#0a3f8c', deep: '#041a4a', gold: '#ffe1a8', white: '#f4fbff',
};

export default function create({ ctx }) {
  let L = {};
  let grads = {};
  let sprites = {};
  let drops = [], pads = [], glints = [];
  let rainN = 0;
  const RAIN_MAX = 90;
  const rx = new Float32Array(RAIN_MAX), ry = new Float32Array(RAIN_MAX), rv = new Float32Array(RAIN_MAX), rz = new Float32Array(RAIN_MAX), rTarget = new Float32Array(RAIN_MAX);
  const splash = new Pool(70);
  const motes = new Pool(50);
  const rings = new Rings(22);
  let nextRipple = 1, rainAmt = 0, clearBoost = 0, lift = 0;
  const R = rng(4242);

  function build(st) {
    const { W, H, M } = st;
    const hy = Math.round(H * 0.6), gy = H * st.groundY;
    const r = rng(31);

    // ---------------------------------------------------------------- sky
    const sky = sceneLayer(st, -M, hy + 4);
    {
      const g = sky.g;
      g.fillStyle = vgrad(g, -M, hy, [[0, C.top], [0.28, C.high], [0.58, C.mid], [0.84, C.low], [0.95, '#d9ecff'], [1, C.haze]]);
      g.fillRect(-M, -M, W + 2 * M, hy + M + 4);
      softBlob(g, W * 0.5, hy, W * 0.9, '#ffd1f0', 0.6, 1.3, 0.35);
      softBlob(g, W * 0.15, hy * 0.75, W * 0.5, '#ff9ee8', 0.18, 1.4, 0.6);
      // faint early stars high up
      for (let i = 0; i < 60; i++) {
        const y = r() * hy * 0.42;
        g.globalAlpha = r.range(0.2, 0.6) * (1 - y / (hy * 0.42));
        g.fillStyle = '#eaf6ff';
        g.beginPath(); g.arc(r() * W, y, r.range(0.4, 1.1), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      // soft stratus banks lit pink from below
      const bank = (cx, cy, w, h) => {
        const b = bankBillows(r, cx, cy, w, h);
        const t = cy / hy;
        billowCloud(g, b, { top: t < 0.7 ? '#86b4ec' : '#b4cff4', bottom: t < 0.7 ? '#b0aeea' : '#dcc8f2', y0: cy - h, y1: cy, rim: '#ffd6f2', rimA: 0.95, rimDy: -2, crown: '#f0f8ff', crownA: 0.45, shade: '#ffb3e6', shadeA: 0.3 });
      };
      bank(W * 0.06, hy * 0.6, W * 0.62, H * 0.05);
      bank(W * 0.97, hy * 0.47, W * 0.56, H * 0.045);
      bank(W * 0.7, hy * 0.84, W * 0.42, H * 0.032);
      bank(W * 0.1, hy * 0.93, W * 0.4, H * 0.026);
      bank(W * 0.93, hy * 0.95, W * 0.3, H * 0.02);
    }
    // ----------------------------------------------- far cushion hills
    const hills = sceneLayer(st, hy * 0.7, hy + 4);
    const hillShapes = [];
    {
      const g = hills.g;
      const ridge = (n, hMin, hMax, colTop, colBot, centreDip) => {
        const items = [];
        for (let i = 0; i < n; i++) {
          const x = -M + (i + r.range(-0.3, 0.3)) * ((W + 2 * M) / (n - 1));
          const centre = Math.abs(x - W / 2) / (W / 2);
          const h = r.range(hMin, hMax) * (centreDip ? 0.35 + centre * 0.9 : 1);
          items.push([x, h, r.range(40, 80)]);
        }
        g.fillStyle = vgrad(g, hy - hMax, hy, [[0, colTop], [1, colBot]]);
        g.beginPath();
        for (const [x, h, w] of items) { g.moveTo(x + w, hy + 2); g.ellipse(x, hy + 2, w, h, 0, Math.PI, TAU); }
        g.fill();
        hillShapes.push({ items, colTop, colBot, hMax });
      };
      ridge(9, 18, 40, '#a9b9f0', '#d8c6f2', true);
      ridge(8, 10, 26, '#7f9ee0', '#c2b4ee', true);
      // haze over the waterline
      g.fillStyle = vgrad(g, hy - 30, hy + 4, [[0, 'rgba(255,214,242,0)'], [1, 'rgba(255,224,246,0.85)']]);
      g.fillRect(-M, hy - 30, W + 2 * M, 34);
    }
    // ------------------------------------------------------------ lagoon
    const water = sceneLayer(st, hy - 1, H + M);
    {
      const g = water.g;
      g.fillStyle = vgrad(g, hy, H + M, [[0, '#ffd6f0'], [0.04, '#a7d6f7'], [0.16, '#4f9be0'], [0.45, '#1a5bb0'], [1, C.deep]]);
      g.fillRect(-M, hy - 1, W + 2 * M, H - hy + M + 1);
      // mirrored hills
      g.save();
      g.globalAlpha = 0.45;
      for (const hs of hillShapes) {
        g.fillStyle = vgrad(g, hy, hy + hs.hMax * 0.8, [[0, hs.colBot], [1, rgba('#4f9be0', 0)]]);
        g.beginPath();
        for (const [x, h, w] of hs.items) { g.moveTo(x + w, hy); g.ellipse(x, hy, w, h * 0.75, 0, 0, Math.PI); }
        g.fill();
      }
      g.restore();
      // reflected glow column behind the stage
      softBlob(g, W * 0.5, hy + (gy - hy) * 0.4, W * 0.5, '#ffd1f0', 0.4, 0.8, 1.2);
      // static shimmer streaks, denser toward the horizon
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 140; i++) {
        const t = Math.pow(r(), 1.8);
        const y = hy + 3 + t * (H - hy);
        const len = r.range(8, 46) * (0.4 + t * 1.6);
        const x = r() * W;
        g.strokeStyle = rgba(r() < 0.25 ? '#ffc4ec' : '#cfeaff', r.range(0.05, 0.16) * (1 - t * 0.6));
        g.lineWidth = 0.6 + t * 1.4;
        g.beginPath(); g.moveTo(x - len / 2, y); g.lineTo(x + len / 2, y); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      // bottom vignette for UI legibility
      g.fillStyle = vgrad(g, H * 0.9, H + M, [[0, 'rgba(2,10,40,0)'], [1, 'rgba(2,10,40,0.6)']]);
      g.fillRect(-M, H * 0.9, W + 2 * M, H * 0.1 + M);
    }

    // --------------------------------------------------------- overlays
    grads.heavy = vgrad(ctx, 0, H, [[0, 'rgba(14,22,44,0.85)'], [0.55, 'rgba(40,52,80,0.55)'], [0.6, 'rgba(60,70,96,0.45)'], [1, 'rgba(6,14,36,0.5)']]);
    grads.warm = vgrad(ctx, 0, H, [[0, 'rgba(70,60,170,0.5)'], [0.3, 'rgba(170,120,220,0.35)'], [0.5, 'rgba(255,170,200,0.38)'], [0.585, 'rgba(255,196,170,0.45)'], [0.61, 'rgba(255,190,215,0.2)'], [0.8, 'rgba(120,90,200,0.12)'], [1, 'rgba(0,0,0,0)']]);
    grads.rainVeil = vgrad(ctx, 0, H, [[0, 'rgba(160,190,230,0.0)'], [0.45, 'rgba(160,190,230,0.12)'], [0.6, 'rgba(180,200,235,0.2)'], [1, 'rgba(160,190,230,0.04)']]);

    // ---------------------------------------------------------- sprites
    sprites.bead = beadSprite(48, false);
    sprites.tear = beadSprite(48, true);
    sprites.light = glowSprite('#ffe6f4', { size: 64, core: 0.8 });
    sprites.lightGold = glowSprite(C.gold, { size: 64, core: 0.7 });
    sprites.soft = { pink: glowSprite('#ffb8ec', { size: 128 }), blue: glowSprite(C.glow, { size: 128 }), white: glowSprite('#ffffff', { size: 128 }), gold: glowSprite(C.gold, { size: 128 }) };
    sprites.glint = glintSprite('#d6f0ff', 32);
    sprites.dot = glowSprite('#e6f6ff', { size: 32, core: 0.6 });
    sprites.list = [sprites.dot, sprites.light, sprites.lightGold];
    sprites.pads = [
      padSprite('#ffc2ec', '#f08fd2', '#ffe6f7', false, true),
      padSprite('#a9defc', '#5aa8ea', '#e2f5ff', false, false),
      padSprite('#9ff0dc', '#4cc0b0', '#e0fff6', true, false),
      padSprite('#d8c8ff', '#9a84e6', '#f1ebff', true, true),
    ];
    sprites.stage = padSprite('#b7d2ff', '#7d8ff0', '#eef4ff', true, false, 360);

    // ------------------------------------------------------------- props
    const pr = rng(55);
    pads = [
      { x: 0.08, y: 0.7, s: 0.26, k: 0 }, { x: 0.93, y: 0.665, s: 0.2, k: 2 }, { x: 0.22, y: 0.632, s: 0.12, k: 3 },
      { x: 0.8, y: 0.622, s: 0.1, k: 1 }, { x: 0.96, y: 0.79, s: 0.3, k: 3 }, { x: 0.04, y: 0.94, s: 0.34, k: 2 },
      { x: 0.66, y: 0.612, s: 0.07, k: 0 },
    ].map((p) => ({ ...p, ph: pr() * TAU }));
    glints = [];
    for (let i = 0; i < 14; i++) glints.push({ x: pr() * W, y: hy + 4 + Math.pow(pr(), 1.5) * (H - hy) * 0.8, ph: pr() * TAU, s: pr.range(5, 11) });
    const n = Math.round(38 * st.density);
    if (drops.length !== n) {
      drops = [];
      for (let i = 0; i < n; i++) drops.push(newDrop(st, true));
    }
    L = { sky, hills, water, hy, gy };
  }

  function newDrop(st, initial, fromWater) {
    const { W, H } = st;
    const hy = H * 0.6;
    const z = R.range(0.3, 1);
    // favour the sides; keep the stage area airy
    let x = R() * W;
    if (Math.abs(x - W / 2) < W * 0.28 && R() < 0.65) x = R() < 0.5 ? R.range(0, W * 0.22) : R.range(W * 0.78, W);
    const y = fromWater ? hy + R.range(4, 30) + z * 60 : R.range(0.08, 0.56) * H;
    return { x, y, by: y, z, size: (3 + z * 9) * R.range(0.8, 1.25), ph: R() * TAU, sp: R.range(0.4, 0.8), tear: R() < 0.3, light: fromWater ? 1 : 0, vy: 0 };
  }

  function beadSprite(size, tear) {
    const c = makeCanvas(size, size * (tear ? 1.35 : 1));
    const g = c.getContext('2d');
    const r = size * 0.42, cx = size / 2, cy = c.height - size / 2;
    g.beginPath();
    if (tear) {
      g.moveTo(cx, 2);
      g.bezierCurveTo(cx + r * 0.25, cy - r * 1.2, cx + r, cy - r * 0.55, cx + r, cy);
      g.arc(cx, cy, r, 0, Math.PI);
      g.bezierCurveTo(cx - r, cy - r * 0.55, cx - r * 0.25, cy - r * 1.2, cx, 2);
    } else g.arc(cx, cy, r, 0, TAU);
    g.closePath();
    // refraction: the bead shows the bright horizon upside-down (light bottom)
    const body = g.createLinearGradient(0, cy - r, 0, cy + r);
    body.addColorStop(0, 'rgba(40,110,210,0.35)');
    body.addColorStop(0.5, 'rgba(140,210,255,0.25)');
    body.addColorStop(0.85, 'rgba(255,200,240,0.6)');
    body.addColorStop(1, 'rgba(255,240,250,0.8)');
    g.fillStyle = body;
    g.fill();
    g.save(); g.clip();
    const rim = g.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.02);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(1, 'rgba(230,248,255,0.75)');
    g.fillStyle = rim; g.fillRect(0, 0, size, c.height);
    g.restore();
    g.strokeStyle = 'rgba(240,250,255,0.6)'; g.lineWidth = 1; g.stroke();
    // specular highlight
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath(); g.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.22, r * 0.14, -0.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.arc(cx + r * 0.42, cy + r * 0.3, r * 0.08, 0, TAU); g.fill();
    return c;
  }

  function padSprite(top, side, hi, lily, flower, w = 160) {
    const h = Math.round(w * 0.56);
    const c = makeCanvas(w, h);
    const g = c.getContext('2d');
    const cx = w / 2, rx = w * 0.46, ry = w * 0.15, ty = h * 0.36, th = w * 0.085;
    const notch = (path) => {
      if (!lily) { path.ellipse(cx, ty, rx, ry, 0, 0, TAU); return; }
      path.moveTo(cx, ty);
      path.ellipse(cx, ty, rx, ry, 0, -Math.PI / 2 + 0.28, -Math.PI / 2 - 0.28 + TAU);
      path.closePath();
    };
    // soft shadow/glow on the water
    const sg = g.createRadialGradient(cx, ty + th + 4, 0, cx, ty + th + 4, rx * 1.05);
    sg.addColorStop(0, 'rgba(10,40,100,0.35)'); sg.addColorStop(1, 'rgba(10,40,100,0)');
    g.save(); g.translate(0, (ty + th + 4) * (1 - 0.35)); g.scale(1, 0.35); g.fillStyle = sg; g.fillRect(0, 0, w, h / 0.35); g.restore();
    // pillow side (thickness)
    const sideG = g.createLinearGradient(0, ty, 0, ty + th + ry);
    sideG.addColorStop(0, top); sideG.addColorStop(0.35, side); sideG.addColorStop(1, rgba(side, 0.85));
    g.fillStyle = sideG;
    g.beginPath(); g.ellipse(cx, ty + th, rx * 0.97, ry * 1.0, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(cx, ty + th * 0.5, rx, ry * 1.05, 0, 0, TAU); g.fill();
    g.fillRect(cx - rx * 0.985, ty, rx * 1.97, th);
    // waterline glow
    g.strokeStyle = 'rgba(230,246,255,0.35)'; g.lineWidth = w * 0.006;
    g.beginPath(); g.ellipse(cx, ty + th, rx * 0.97, ry, 0, 0.15, Math.PI - 0.15); g.stroke();
    // top
    const tg = g.createRadialGradient(cx - rx * 0.15, ty - ry * 0.4, 0, cx, ty, rx);
    tg.addColorStop(0, hi); tg.addColorStop(0.7, top); tg.addColorStop(1, rgba(side, 1));
    g.fillStyle = tg;
    g.beginPath(); notch(g); g.fill();
    // puffy rim highlight + soft centre dimple (tufted cushion)
    g.save(); g.beginPath(); notch(g); g.clip();
    const rg = g.createRadialGradient(cx, ty + ry * 0.2, rx * 0.2, cx, ty, rx);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.75, 'rgba(255,255,255,0.0)'); rg.addColorStop(0.92, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    g.strokeStyle = rgba(side, 0.45); g.lineWidth = w * 0.008;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      g.beginPath(); g.moveTo(cx, ty); g.quadraticCurveTo(cx + Math.cos(a) * rx * 0.4, ty + Math.sin(a) * ry * 0.5, cx + Math.cos(a) * rx * 0.75, ty + Math.sin(a) * ry * 0.75); g.stroke();
    }
    g.fillStyle = rgba(side, 0.6);
    g.beginPath(); g.ellipse(cx, ty, w * 0.02, w * 0.012, 0, 0, TAU); g.fill();
    g.restore();
    if (flower) {
      // a little lotus
      const fx = cx + rx * 0.35, fy = ty - ry * 0.15, fs = w * 0.09;
      const halo = g.createRadialGradient(fx, fy - fs * 0.4, 0, fx, fy - fs * 0.4, fs * 2.2);
      halo.addColorStop(0, 'rgba(255,200,240,0.5)'); halo.addColorStop(1, 'rgba(255,200,240,0)');
      g.fillStyle = halo; g.fillRect(fx - fs * 2.2, fy - fs * 2.6, fs * 4.4, fs * 4.4);
      for (const [a, s, col] of [[-1.1, 0.8, '#ff9fe0'], [1.1, 0.8, '#ff9fe0'], [-0.55, 1, '#ffb8ea'], [0.55, 1, '#ffb8ea'], [0, 1.1, '#ffd6f4']]) {
        g.save(); g.translate(fx, fy); g.rotate(a * 0.7);
        const pg = g.createLinearGradient(0, -fs * s, 0, 0);
        pg.addColorStop(0, '#fff2fb'); pg.addColorStop(1, col);
        g.fillStyle = pg;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(fs * 0.45, -fs * 0.5 * s, 0, -fs * s); g.quadraticCurveTo(-fs * 0.45, -fs * 0.5 * s, 0, 0); g.fill();
        g.restore();
      }
    }
    c.ty = ty; c.th = th;
    return c;
  }

  function frame(g, st) {
    const { W, H, m, p, dt, rdt, density } = st;
    const hy = L.hy, gy = L.gy;
    const cx = st.camX, cy = st.camY;
    const hv = m.heaviness, cl = m.clarity, ag = m.agitation;
    clearBoost *= Math.exp(-rdt / 3);
    const rainTarget = clamp((hv - 0.35) / 0.5) * (1 - p) * (1 - clearBoost);
    rainAmt += (rainTarget - rainAmt) * (1 - Math.exp(-rdt / 1.2));
    const liftT = clamp(smoothstep(0.6, 1, cl) * 0.45 + p + clearBoost * 0.4) * (1 - hv * 0.6);
    lift += (liftT - lift) * (1 - Math.exp(-rdt / 1.5));
    const warmK = clamp(smoothstep(0.45, 1, m.warmth) * 0.6 + p * 0.5) * (1 - hv * 0.5);

    // 1 sky + hills
    drawLayer(g, L.sky, st, 0.1);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.35 + 0.2 * cl * (1 - hv); blit(g, sprites.soft.pink, W * 0.5 + cx * 0.15, hy - 10, H * 0.12, W * 0.8);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    drawLayer(g, L.hills, st, 0.25);

    // 2 water
    drawLayer(g, L.water, st, 0.4);
    const ws = st.camX * 0.4, wsy = st.camY * 0.4;
    // drifting shimmer bands on the lagoon (slow)
    g.globalCompositeOperation = 'lighter';
    const shimmerA = 0.12 + 0.12 * cl;
    for (let i = 0; i < 5; i++) {
      const y = hy + 8 + i * i * 9 + 4;
      const x = ((st.t * (6 + i * 2) + i * 97) % (W + 160)) - 80;
      g.globalAlpha = shimmerA * (1 - i * 0.12);
      blit(g, sprites.soft.white, x + ws, y + wsy, 1.6 + i * 0.6, 40 + i * 14);
    }
    for (const gl of glints) {
      const tw = 0.5 + 0.5 * Math.sin(st.t * 0.9 + gl.ph);
      g.globalAlpha = tw * tw * (0.35 + 0.4 * cl) * (1 - rainAmt * 0.6);
      blit(g, sprites.glint, gl.x + ws, gl.y + wsy, gl.s, gl.s);
    }
    // glowing reflection column under the stage
    g.globalAlpha = 0.25 + 0.2 * cl;
    blit(g, sprites.soft.pink, W * 0.5 + ws, hy + (gy - hy) * 0.45, (gy - hy) * 0.55, W * 0.28);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 3 ambient + rain ripples
    nextRipple -= rdt * (1 + ag * 2);
    if (nextRipple <= 0) {
      nextRipple = R.range(0.8, 2.2);
      const z = R();
      rings.add(R() * W, hy + 6 + z * z * (H - hy) * 0.9, 2, 18 + z * 40, 2.4, 0.26, '#e6f6ff', 0.5, 0.8 + z);
    }

    // 4 pads + reflections (back to front by y)
    for (const pd of pads) {
      const spr = sprites.pads[pd.k];
      const w = pd.s * W, h = w * 0.56;
      const bob = Math.sin(st.t * 0.8 + pd.ph) * (1.2 + ag * 2) * (0.5 + pd.s);
      const x = pd.x * W + st.camX * (0.4 + pd.s) - w / 2;
      const y = pd.y * H + st.camY * (0.4 + pd.s) - spr.ty / spr.height * h + bob;
      // mirror
      g.globalAlpha = 0.28;
      const yb = y + ((spr.ty + spr.th) / spr.height) * h;
      g.save(); g.translate(0, yb * 1.6); g.scale(1, -0.6); g.drawImage(spr, x, y, w, h); g.restore();
      g.globalAlpha = 1;
      g.drawImage(spr, x, y, w, h);
    }
    // stage cushion (the Mallow stands here)
    {
      const spr = sprites.stage;
      const w = W * 0.74, h = w * 0.56;
      const bob = Math.sin(st.t * 0.6) * 1.2;
      const sy = gy - (spr.ty / spr.height) * h + bob + 2;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.35 + 0.15 * cl; blit(g, sprites.soft.blue, W * 0.5, gy + 4, h * 0.22, w * 0.6);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.drawImage(spr, W * 0.5 - w / 2, sy, w, h);
    }

    // 5 rings on the water
    g.globalCompositeOperation = 'lighter';
    rings.update(rdt);
    rings.draw(g);
    g.globalCompositeOperation = 'source-over';

    // 6 suspended drops → rising light
    drawDrops(g, st);

    // 7 weather overlays
    if (hv > 0.02) { g.globalAlpha = hv * 0.75; g.fillStyle = grads.heavy; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (warmK > 0.01) { g.globalAlpha = warmK * 0.85; g.fillStyle = grads.warm; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (p > 0.01 || cl > 0.7) {
      g.globalCompositeOperation = 'lighter';
      const k = Math.max(p, (cl - 0.7) / 0.3 * 0.5);
      g.globalAlpha = k * 0.22; blit(g, sprites.soft.gold, W * 0.5, hy - 14, H * 0.07, W * 0.7);
      g.globalAlpha = k * 0.14; blit(g, sprites.soft.gold, W * 0.5, hy + 40, H * 0.05, W * 0.35);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    drawRain(g, st);

    // 8 particles
    g.globalCompositeOperation = 'lighter';
    splash.update(rdt, 260, 0.4);
    splash.draw(g, sprites.list, 1, 0.05);
    motes.update(rdt, -6, 0.3);
    motes.draw(g, sprites.list, 1, 0.3);
    g.globalCompositeOperation = 'source-over';
  }

  function drawDrops(g, st) {
    const { W, H, dt, m } = st;
    const hy = L.hy;
    const sag = m.heaviness * 18;
    for (const d of drops) {
      d.ph += dt * d.sp;
      // lift: drops float upward and turn into light; heaviness makes them sag
      const up = lift * (14 + d.z * 22);
      d.vy += ((-up) - d.vy) * Math.min(1, dt * 1.5);
      d.by += d.vy * dt;
      if (lift > 0.25) d.light = Math.min(1, d.light + dt * 0.35 * lift); else d.light = Math.max(0, d.light - dt * 0.15);
      if (d.by < -30) Object.assign(d, newDrop(st, false, lift > 0.25));
      const y = d.by + Math.sin(d.ph) * (2 + d.z * 3) + sag * d.z + st.camY * (0.3 + d.z * 0.7);
      const x = d.x + Math.sin(d.ph * 0.6) * 1.5 + st.camX * (0.3 + d.z * 0.7);
      const fade = stageFade(x, y, W, H, st.groundY, 0.2) * (y > hy - 4 ? clamp(1 - (y - hy) / 30 + d.light) : 1);
      const s = d.size;
      if (d.light < 0.999) {
        g.globalAlpha = (0.55 + d.z * 0.45) * fade * (1 - d.light);
        const spr = d.tear ? sprites.tear : sprites.bead;
        const sw = s * 2, sh = sw * (spr.height / spr.width);
        g.drawImage(spr, x - s, y - sh + s, sw, sh);
      }
      if (d.light > 0.001) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = d.light * (0.55 + d.z * 0.45) * fade;
        const ls = s * (1.6 + 0.4 * Math.sin(d.ph * 1.3));
        g.drawImage(d.z > 0.7 ? sprites.lightGold : sprites.light, x - ls, y - ls, ls * 2, ls * 2);
        g.globalCompositeOperation = 'source-over';
      }
    }
    g.globalAlpha = 1;
  }

  function drawRain(g, st) {
    const { W, H, rdt, density } = st;
    const hy = L.hy;
    const want = Math.round(RAIN_MAX * rainAmt * density * (st.reduced ? 0.5 : 1));
    while (rainN < want) {
      const i = rainN++;
      rx[i] = R() * (W + 60) - 30; ry[i] = R.range(-H, 0); rz[i] = R.range(0.3, 1);
      rv[i] = (520 + rz[i] * 420) * (st.reduced ? 0.35 : 1);
      rTarget[i] = hy + 4 + Math.pow(R(), 1.3) * (H - hy);
    }
    if (rainN === 0) return;
    g.strokeStyle = '#d6ecff';
    g.lineCap = 'round';
    const slant = 0.12;
    for (let pass = 0; pass < 2; pass++) {
      g.globalAlpha = (pass ? 0.38 : 0.18) * Math.min(1, rainAmt * 1.6);
      g.lineWidth = pass ? 1.1 : 0.7;
      g.beginPath();
      for (let i = 0; i < rainN; i++) {
        if ((rz[i] > 0.6) !== !!pass) continue;
        const len = 10 + rz[i] * 16;
        g.moveTo(rx[i], ry[i]); g.lineTo(rx[i] - slant * len, ry[i] - len);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < rainN; i++) {
      ry[i] += rv[i] * rdt; rx[i] += rv[i] * slant * rdt;
      if (ry[i] >= rTarget[i]) {
        if (R() < 0.35) rings.add(rx[i], rTarget[i], 1, 8 + rz[i] * 12, 0.9, 0.3, '#e6f6ff', 0.45, 0.8);
        if (i >= want) { // shrink pool
          rainN--; rx[i] = rx[rainN]; ry[i] = ry[rainN]; rv[i] = rv[rainN]; rz[i] = rz[rainN]; rTarget[i] = rTarget[rainN]; i--; continue;
        }
        rx[i] = R() * (W + 60) - 30; ry[i] = R.range(-60, -10);
        rTarget[i] = hy + 4 + Math.pow(R(), 1.3) * (H - hy);
      }
    }
  }

  function pulse(kind, x, y, st) {
    const { W, H, density } = st;
    const hy = L.hy;
    const wy = Math.max(y, hy + 8);
    const n = (k) => Math.round(k * density);
    if (kind === 'tap' || kind === 'ripple') {
      const count = kind === 'ripple' ? 3 : 2;
      for (let i = 0; i < count; i++) rings.add(x, wy, 3 + i * 5, 40 + i * 34, 1.8 + i * 0.5, 0.28, i ? '#ffd1f0' : '#ffffff', 0.7 - i * 0.15, 1.4);
      if (y < hy) for (let i = 0; i < n(5); i++) splash.spawn(x, y, R.range(-30, 30), R.range(-60, -10), 0.9, R.range(2, 4), 0, 0.8);
    } else if (kind === 'success') {
      // nearby drops turn to light and float up
      for (const d of drops) if (Math.hypot(d.x - x, d.by - y) < W * 0.35) { d.light = Math.max(d.light, 0.7); d.vy = -40; }
      for (let i = 0; i < n(18); i++) motes.spawn(x + R.range(-30, 30), y + R.range(-20, 20), R.range(-20, 20), R.range(-70, -25), R.range(1.6, 2.6), R.range(4, 8), 1 + (i % 2), 0.9);
      rings.add(x, wy, 6, 90, 2.4, 0.28, '#ffd1f0', 0.7, 1.8);
    } else if (kind === 'burst') {
      rings.add(x, wy, 6, 110, 2, 0.28, '#ffffff', 0.8, 2);
      for (let i = 0; i < n(26); i++) { const a = -Math.PI * R.range(0.1, 0.9); const v = R.range(80, 200); splash.spawn(x, wy - 4, Math.cos(a) * v, Math.sin(a) * v, R.range(0.8, 1.3), R.range(2, 4.5), 0, 0.9); }
    } else if (kind === 'strike') {
      // a single bright drop falls and lands softly
      const ty = wy;
      for (let i = 0; i < 6; i++) splash.spawn(x, ty - 260 + i * 6, 0, 340, 0.75, 4 - i * 0.4, 1, 0.9 - i * 0.12);
      setTimeout(() => { rings.add(x, ty, 4, 70, 2, 0.28, '#ffffff', 0.85, 1.8); rings.add(x, ty, 2, 40, 1.6, 0.28, '#ffd1f0', 0.7, 1.2); }, 700);
    } else if (kind === 'clear') {
      clearBoost = 1;
      rings.add(x, wy, 10, W * 0.9, 3.2, 0.3, '#ffe6c8', 0.6, 2.2);
      for (let i = 0; i < n(14); i++) motes.spawn(R() * W, hy + R.range(0, 120), R.range(-6, 6), R.range(-50, -20), R.range(2, 3.2), R.range(4, 7), 2, 0.8);
    }
  }

  return { build, frame, pulse };
}
