// The Spiral Observatory — Zuzu's realm.
// Inside a violet observatory dome.  Through the shutter slit a vast spiral
// galaxy turns; armillary rings and luminous ribbons orbit it; a brass-and-
// glass telescope and a floating lens watch from the sides; the Mallow stands
// on a glowing astrolabe dais.  Low clarity warps the spiral (ghost copies,
// breathing distortion, tangled rings).  Clarity resolves it into one crisp
// galaxy and the dome shutters slide open onto the full starfield.

import {
  clamp, lerp, smoothstep, rng, TAU, vgrad, rgba, glowSprite, glintSprite, blit, softBlob,
  Pool, Rings, flashEnv, stageFade, makeCanvas, sceneLayer, drawLayer,
} from '../util.js';

const C = {
  void: '#07021a', deep: '#12052e', sky: '#1d0840', purple: '#c414e6', cyan: '#39f0ff', violet: '#7a3cff',
  pink: '#ff7ad9', gold: '#ffd27a', stone: '#2a0f52', stoneHi: '#4a1f86', ink: '#0b0320',
};

export default function create({ ctx }) {
  let L = {};
  let grads = {};
  let sprites = {};
  let galaxy = null, G = 0;
  const motes = new Pool(60);
  const sparks = new Pool(70);
  const rings = new Rings(14);
  let theta = 0, wobPh = 0, ribbonPh = 0, ringPh = 0, clearBoost = 0, open = 0;
  let beam = { on: false, age: 0, x: 0, y: 0 };
  const R = rng(1717);
  let glyphs = [];
  let GX = 0, GY = 0;

  function build(st) {
    const { W, H, M, dpr } = st;
    const hy = Math.round(H * 0.635), gy = H * st.groundY;
    GX = W * 0.5; GY = H * 0.355;
    const r = rng(12);

    // ------------------------------------------------------- deep sky
    const sky = sceneLayer(st, -M, hy + 6);
    {
      const g = sky.g;
      g.fillStyle = vgrad(g, -M, hy, [[0, C.void], [0.45, C.deep], [0.85, C.sky], [1, '#2a0c55']]);
      g.fillRect(-M, -M, W + 2 * M, hy + M + 6);
      softBlob(g, W * 0.15, H * 0.2, W * 0.55, '#5a0f8a', 0.35, 1, 1.3);
      softBlob(g, W * 0.9, H * 0.12, W * 0.5, '#0f3a7a', 0.3, 1, 1.2);
      softBlob(g, W * 0.75, H * 0.5, W * 0.5, '#6a1590', 0.25);
      for (let i = 0; i < 260; i++) {
        const x = r() * (W + 2 * M) - M, y = r() * hy;
        const big = r() < 0.06;
        g.globalAlpha = r.range(0.25, 0.85);
        g.fillStyle = r() < 0.6 ? '#f2eaff' : r() < 0.5 ? '#9ff6ff' : '#ffb0f0';
        g.beginPath(); g.arc(x, y, big ? r.range(1.1, 1.7) : r.range(0.35, 0.9), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }
    // ------------------------------------------------------- galaxy sprite
    G = W * 1.2;
    const S = Math.min(1100, Math.round(G * Math.min(dpr, 1.5)));
    galaxy = makeCanvas(S, S);
    {
      const g = galaxy.getContext('2d');
      const c = S / 2, Rg = S * 0.48;
      g.globalCompositeOperation = 'lighter';
      const core = g.createRadialGradient(c, c, 0, c, c, Rg * 0.5);
      core.addColorStop(0, 'rgba(255,245,250,0.95)'); core.addColorStop(0.08, 'rgba(255,190,240,0.75)'); core.addColorStop(0.3, 'rgba(196,20,230,0.28)'); core.addColorStop(1, 'rgba(120,30,200,0)');
      g.fillStyle = core; g.fillRect(0, 0, S, S);
      const halo = g.createRadialGradient(c, c, 0, c, c, Rg);
      halo.addColorStop(0, 'rgba(120,60,255,0.25)'); halo.addColorStop(0.6, 'rgba(60,30,160,0.08)'); halo.addColorStop(1, 'rgba(30,10,80,0)');
      g.fillStyle = halo; g.fillRect(0, 0, S, S);
      const gr = rng(808);
      const arms = 3, N = 3200;
      const sc = S / 1000;
      for (let i = 0; i < N; i++) {
        const arm = i % arms;
        const t = Math.pow(gr(), 0.75);
        const ang = (arm * TAU) / arms + t * Math.PI * 3.1;
        const rad = Rg * (0.06 + t * 0.94);
        const spread = (gr() + gr() + gr() - 1.5) * Rg * (0.04 + t * 0.09);
        const x = c + Math.cos(ang) * rad + Math.cos(ang + Math.PI / 2) * spread;
        const y = c + Math.sin(ang) * rad + Math.sin(ang + Math.PI / 2) * spread;
        const col = t < 0.25 ? (gr() < 0.5 ? '255,220,245' : '255,150,235') : t < 0.6 ? (gr() < 0.55 ? '200,120,255' : '120,240,255') : (gr() < 0.6 ? '57,240,255' : '196,20,230');
        const s = (gr() < 0.03 ? gr.range(2.2, 3.6) : gr.range(0.6, 1.8)) * sc * (1.2 - t * 0.4);
        g.fillStyle = `rgba(${col},${(gr.range(0.25, 0.8) * (1 - t * 0.35)).toFixed(3)})`;
        g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
      }
      // soft arm glow
      for (let i = 0; i < 260; i++) {
        const arm = i % arms;
        const t = gr();
        const ang = (arm * TAU) / arms + t * Math.PI * 3.1;
        const rad = Rg * (0.08 + t * 0.9);
        const x = c + Math.cos(ang) * rad, y = c + Math.sin(ang) * rad;
        const rr = Rg * (0.05 + t * 0.06);
        const gg = g.createRadialGradient(x, y, 0, x, y, rr);
        const col = t < 0.4 ? '230,120,255' : '57,200,255';
        gg.addColorStop(0, `rgba(${col},${0.09 * (1 - t * 0.5)})`); gg.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      // bright knots
      for (let i = 0; i < 24; i++) {
        const arm = i % arms, t = gr.range(0.2, 0.9);
        const ang = (arm * TAU) / arms + t * Math.PI * 3.1;
        const x = c + Math.cos(ang) * Rg * t, y = c + Math.sin(ang) * Rg * t;
        const rr = 5 * sc * gr.range(0.8, 1.6);
        const gg = g.createRadialGradient(x, y, 0, x, y, rr * 3);
        gg.addColorStop(0, 'rgba(255,255,255,0.9)'); gg.addColorStop(0.3, 'rgba(160,250,255,0.4)'); gg.addColorStop(1, 'rgba(160,250,255,0)');
        g.fillStyle = gg; g.fillRect(x - rr * 3, y - rr * 3, rr * 6, rr * 6);
      }
    }

    // --------------------------------------------- back wall + arcade
    const wall = sceneLayer(st, H * 0.5, hy + 40);
    {
      const g = wall.g;
      // distant arcade silhouette on the observatory rim
      const top = hy - 38;
      g.fillStyle = vgrad(g, top, hy + 40, [[0, '#2c0f5c'], [0.6, '#1c0840'], [1, '#12052e']]);
      g.fillRect(-M, top, W + 2 * M, hy + 40 - top);
      // arches (windows) open onto the sky
      const n = 9, aw = (W + 2 * M) / n;
      for (let i = 0; i < n; i++) {
        const x = -M + i * aw + aw * 0.22, w = aw * 0.56;
        if (Math.abs(x + w / 2 - W / 2) < W * 0.16) continue; // hidden behind the Mallow anyway
        g.fillStyle = vgrad(g, top + 6, hy, [[0, '#3a1580'], [1, '#160634']]);
        g.beginPath(); g.moveTo(x, hy - 4); g.lineTo(x, top + 6 + w / 2); g.arc(x + w / 2, top + 6 + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, hy - 4); g.closePath(); g.fill();
        g.strokeStyle = rgba(C.cyan, 0.25); g.lineWidth = 1; g.stroke();
      }
      // coping with a cyan rim
      g.fillStyle = '#3a1675'; g.fillRect(-M, top - 6, W + 2 * M, 7);
      g.fillStyle = rgba(C.cyan, 0.5); g.fillRect(-M, top - 6, W + 2 * M, 1);
      g.fillStyle = vgrad(g, hy, hy + 40, [[0, 'rgba(10,3,30,0.5)'], [1, 'rgba(10,3,30,0)']]);
      g.fillRect(-M, hy, W + 2 * M, 40);
    }
    // ------------------------------------------------------------- floor
    const floor = sceneLayer(st, hy, H + M);
    {
      const g = floor.g;
      g.fillStyle = vgrad(g, hy, H + M, [[0, '#1c0742'], [0.3, '#22094c'], [1, '#0a0220']]);
      g.fillRect(-M, hy, W + 2 * M, H - hy + M);
      // tiled radial floor lines
      const ox = W / 2, oy = gy + 6;
      g.strokeStyle = rgba(C.violet, 0.16); g.lineWidth = 1;
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * TAU;
        g.beginPath(); g.moveTo(ox + Math.cos(a) * W * 0.5, oy + Math.sin(a) * W * 0.12); g.lineTo(ox + Math.cos(a) * W * 1.6, oy + Math.sin(a) * W * 0.4); g.stroke();
      }
      for (const rr of [1.05, 1.4, 1.9]) { g.beginPath(); g.ellipse(ox, oy, W * 0.5 * rr, W * 0.125 * rr, 0, 0, TAU); g.stroke(); }
      // dais: stepped astrolabe disc
      for (const [k, col] of [[1.0, '#2e0f60'], [0.86, '#3a1478'], [0.7, '#28105a']]) {
        g.fillStyle = col;
        g.beginPath(); g.ellipse(ox, oy + (1 - k) * 8, W * 0.46 * k, W * 0.105 * k, 0, 0, TAU); g.fill();
      }
      g.strokeStyle = rgba(C.cyan, 0.55); g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(ox, oy, W * 0.46, W * 0.105, 0, 0, TAU); g.stroke();
      g.strokeStyle = rgba(C.purple, 0.5); g.lineWidth = 1;
      g.beginPath(); g.ellipse(ox, oy + 2.2, W * 0.395, W * 0.09, 0, 0, TAU); g.stroke();
      // engraved glyph ticks
      g.strokeStyle = rgba('#d8b8ff', 0.35);
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * TAU, r1 = k % 4 ? 0.88 : 0.82;
        g.beginPath(); g.moveTo(ox + Math.cos(a) * W * 0.46 * r1, oy + Math.sin(a) * W * 0.105 * r1); g.lineTo(ox + Math.cos(a) * W * 0.46 * 0.95, oy + Math.sin(a) * W * 0.105 * 0.95); g.stroke();
      }
      g.fillStyle = vgrad(g, H * 0.9, H + M, [[0, 'rgba(5,1,16,0)'], [1, 'rgba(5,1,16,0.7)']]);
      g.fillRect(-M, H * 0.9, W + 2 * M, H * 0.1 + M);
    }
    glyphs = [];
    for (let k = 0; k < 12; k++) glyphs.push({ a: (k / 12) * TAU, s: k % 3 === 0 ? 1.4 : 1 });

    // ------------------------------------------------- dome shutter panel
    const slitBottom = W * 0.2, slitTop = W * 0.09, baseY = H * 0.47, edgeY = H * 0.6;
    const panel = sceneLayer(st, -M, edgeY + 10, -M, W * 0.5 + 4);
    {
      const g = panel.g;
      const sx = (y) => W * 0.5 - lerp(slitTop, slitBottom, clamp((y + M) / (baseY + M)));
      const baseCurve = (x) => lerp(edgeY, baseY, Math.pow(clamp((x + M) / (sx(baseY) + M)), 1.6));
      const shape = () => {
        g.beginPath();
        g.moveTo(-M, -M);
        g.lineTo(sx(-M), -M);
        for (let y = -M; y <= baseY; y += 12) g.lineTo(sx(y), y);
        for (let x = sx(baseY); x >= -M; x -= 8) g.lineTo(x, baseCurve(x));
        g.closePath();
      };
      shape();
      const fill = g.createLinearGradient(-M, 0, W * 0.5, 0);
      fill.addColorStop(0, '#0d0326'); fill.addColorStop(0.7, '#1e0846'); fill.addColorStop(1, '#2e0f62');
      g.fillStyle = fill; g.fill();
      g.save(); shape(); g.clip();
      // vault shading: darker toward the outer edge and the top
      const vs = g.createRadialGradient(W * 0.5, baseY, 10, W * 0.5, baseY, H * 0.75);
      vs.addColorStop(0, 'rgba(60,20,120,0.35)'); vs.addColorStop(1, 'rgba(4,1,14,0.55)');
      g.fillStyle = vs; g.fillRect(-M, -M, W, H);
      // painted celestial chart (faint gold), like an old observatory ceiling
      g.strokeStyle = rgba(C.gold, 0.16); g.lineWidth = 1;
      for (const rr of [H * 0.32, H * 0.36]) { g.beginPath(); g.arc(W * 0.5, -H * 0.05, rr, Math.PI * 0.5, Math.PI * 1.02); g.stroke(); }
      for (let k = 0; k < 14; k++) {
        const a = Math.PI * (0.52 + k * 0.035);
        g.beginPath(); g.moveTo(W * 0.5 + Math.cos(a) * H * 0.32, -H * 0.05 + Math.sin(a) * H * 0.32); g.lineTo(W * 0.5 + Math.cos(a) * H * 0.36, -H * 0.05 + Math.sin(a) * H * 0.36); g.stroke();
      }
      const figs = [[[0.06, 0.1], [0.12, 0.06], [0.2, 0.09], [0.24, 0.16], [0.17, 0.2]], [[0.04, 0.3], [0.1, 0.27], [0.14, 0.33], [0.22, 0.31]], [[0.27, 0.04], [0.31, 0.12], [0.28, 0.2]]];
      for (const f of figs) {
        g.strokeStyle = rgba(C.gold, 0.22); g.lineWidth = 0.8;
        g.beginPath(); f.forEach(([fx, fy], i) => (i ? g.lineTo(fx * W, fy * H) : g.moveTo(fx * W, fy * H))); g.stroke();
        g.fillStyle = rgba('#ffe7b0', 0.55);
        for (const [fx, fy] of f) { g.beginPath(); g.arc(fx * W, fy * H, 1.6, 0, TAU); g.fill(); }
      }
      // ribs bowing with the curve of the vault
      const vx = W * 0.5, vy = -H * 0.7;
      for (let k = 0; k < 4; k++) {
        const x = -M + (k + 0.6) * ((sx(baseY) + M) / 4.2);
        const y = baseCurve(x);
        const ctlx = x - W * 0.08, ctly = lerp(y, vy, 0.45);
        g.strokeStyle = 'rgba(6,1,20,0.55)'; g.lineWidth = 9;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(ctlx, ctly, vx, vy); g.stroke();
        g.strokeStyle = 'rgba(140,90,230,0.22)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x + 4.5, y); g.quadraticCurveTo(ctlx + 4.5, ctly, vx + 4.5, vy); g.stroke();
      }
      // latitude seams
      for (let k = 1; k < 4; k++) {
        const t = k / 4;
        g.strokeStyle = 'rgba(6,1,20,0.45)'; g.lineWidth = 2;
        g.beginPath();
        for (let x = -M; x <= W * 0.5; x += 10) {
          const y = lerp(baseCurve(x), -M * 4, t) + Math.sin((x / W) * Math.PI) * 14;
          x === -M ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      }
      // light spill from the slit
      const spill = g.createLinearGradient(W * 0.5 - slitBottom - 60, 0, W * 0.5 - slitTop, 0);
      spill.addColorStop(0, 'rgba(196,20,230,0)'); spill.addColorStop(1, 'rgba(196,20,230,0.28)');
      g.fillStyle = spill; g.fillRect(-M, -M, W, H);
      g.restore();
      // slit edge & base rim glow
      g.lineJoin = 'round';
      g.beginPath(); for (let y = -M; y <= baseY; y += 12) (y === -M ? g.moveTo(sx(y), y) : g.lineTo(sx(y), y));
      for (let x = sx(baseY); x >= -M; x -= 8) g.lineTo(x, baseCurve(x));
      g.strokeStyle = rgba(C.cyan, 0.15); g.lineWidth = 6; g.stroke();
      g.strokeStyle = rgba(C.cyan, 0.75); g.lineWidth = 1.3; g.stroke();
    }

    // -------------------------------------------- telescope (left side)
    const scope = sceneLayer(st, H * 0.36, H + M, -M, W * 0.36);
    {
      const g = scope.g;
      const mx = W * 0.085, my = H * 0.635;
      // pillar
      g.fillStyle = vgrad(g, my, H, [[0, '#3a1878'], [1, '#14062e']]);
      g.beginPath(); g.moveTo(mx - 9, my); g.lineTo(mx + 9, my); g.lineTo(mx + 20, H * 0.9); g.lineTo(mx - 24, H * 0.9); g.closePath(); g.fill();
      g.fillStyle = '#4a2096'; g.fillRect(mx - 28, H * 0.9 - 6, 54, 8);
      g.strokeStyle = rgba(C.cyan, 0.4); g.lineWidth = 1; g.beginPath(); g.moveTo(mx + 9, my); g.lineTo(mx + 20, H * 0.9); g.stroke();
      // tube
      const ang = -0.95, len = W * 0.33;
      g.save(); g.translate(mx, my); g.rotate(ang);
      const tg = g.createLinearGradient(0, -14, 0, 14);
      tg.addColorStop(0, '#6a3cc0'); tg.addColorStop(0.35, '#3a1880'); tg.addColorStop(1, '#170838');
      g.fillStyle = tg;
      g.beginPath(); g.moveTo(-len * 0.28, -7); g.lineTo(len * 0.72, -13); g.lineTo(len * 0.72, 13); g.lineTo(-len * 0.28, 7); g.closePath(); g.fill();
      // brass bands
      for (const [t, w] of [[-0.24, 4], [0.2, 5], [0.5, 4], [0.7, 7]]) {
        const hw = lerp(7, 13, (t + 0.28) / 1.0);
        const bg = g.createLinearGradient(0, -hw, 0, hw);
        bg.addColorStop(0, '#ffe7a8'); bg.addColorStop(0.4, '#d9a24a'); bg.addColorStop(1, '#6a3f1a');
        g.fillStyle = bg; g.fillRect(len * t, -hw - 1, w, hw * 2 + 2);
      }
      // lens
      g.fillStyle = '#9ff6ff';
      g.beginPath(); g.ellipse(len * 0.72 + 3, 0, 4, 13, 0, 0, TAU); g.fill();
      g.strokeStyle = rgba('#ffffff', 0.4); g.lineWidth = 1;
      g.beginPath(); g.moveTo(-len * 0.28, -7); g.lineTo(len * 0.72, -13); g.stroke();
      g.restore();
      // mount fork
      g.fillStyle = '#2a0f5c';
      g.beginPath(); g.arc(mx, my, 9, 0, TAU); g.fill();
      g.strokeStyle = rgba('#ffd27a', 0.6); g.lineWidth = 1.5; g.beginPath(); g.arc(mx, my, 9, 0, TAU); g.stroke();
      L.lensX = mx + Math.cos(ang) * (len * 0.72 + 3); L.lensY = my + Math.sin(ang) * (len * 0.72 + 3);
    }

    // ---------------------------------------------------------- sprites
    sprites = {
      cyan: glowSprite(C.cyan, { size: 64, core: 0.5 }), purple: glowSprite(C.purple, { size: 64, core: 0.5 }),
      gold: glowSprite(C.gold, { size: 64, core: 0.6 }), white: glowSprite('#ffffff', { size: 64, core: 0.4 }),
      glint: glintSprite('#bff8ff', 48), glintP: glintSprite('#ffb8f4', 48),
      soft: { cyan: glowSprite(C.cyan, { size: 128 }), purple: glowSprite(C.purple, { size: 128 }), violet: glowSprite(C.violet, { size: 128 }), gold: glowSprite(C.gold, { size: 128 }), white: glowSprite('#ffffff', { size: 128 }) },
    };
    sprites.list = [sprites.cyan, sprites.purple, sprites.gold, sprites.white];
    grads.heavy = vgrad(ctx, 0, H, [[0, 'rgba(4,1,14,0.7)'], [0.6, 'rgba(10,4,26,0.4)'], [1, 'rgba(4,1,14,0.55)']]);
    grads.murk = vgrad(ctx, 0, H, [[0, 'rgba(60,10,70,0.0)'], [0.35, 'rgba(90,20,110,0.35)'], [0.6, 'rgba(40,10,60,0.2)'], [1, 'rgba(0,0,0,0)']]);

    L = { ...L, sky, wall, floor, panel, scope, hy, gy, slitBottom, baseY };
    const n = Math.round(40 * st.density);
    while (motes.n < n * 0.5) spawnMote(st, true);
  }

  function spawnMote(st, initial) {
    const { W, H } = st;
    const x = R() * W, y = initial ? R.range(0.1, 0.85) * H : H * R.range(0.75, 0.9);
    const z = R.range(0.4, 1);
    motes.spawn(x, y, R.range(-4, 4), -R.range(6, 16) * z, R.range(6, 12), (1.5 + z * 3), R() < 0.5 ? 0 : 1, 0.55 * z);
  }

  function drawGalaxy(g, st, a, rot, sx, sy, dx = 0, dy = 0) {
    const { dpr } = st;
    const tilt = -0.32;
    const cs = Math.cos(tilt), sn = Math.sin(tilt);
    const cr = Math.cos(rot), srr = Math.sin(rot);
    // M = T(GX,GY) · Rot(tilt) · Scale(sx, 0.5·sy) · Rot(rot)
    const k = 0.5 * sy;
    const a11 = cs * sx * cr - sn * k * srr, a12 = -cs * sx * srr - sn * k * cr;
    const a21 = sn * sx * cr + cs * k * srr, a22 = -sn * sx * srr + cs * k * cr;
    g.setTransform(dpr * a11, dpr * a21, dpr * a12, dpr * a22, dpr * (GX + dx), dpr * (GY + dy));
    g.globalAlpha = a;
    g.drawImage(galaxy, -G / 2, -G / 2, G, G);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(g, st) {
    const { W, H, m, p, dt, rdt, dpr } = st;
    const hy = L.hy, gy = L.gy;
    const cx = st.camX, cy = st.camY;
    const ag = m.agitation, cl = m.clarity, hv = m.heaviness;
    clearBoost *= Math.exp(-rdt / 3);
    const blur = clamp(Math.pow(1 - cl, 1.2) * 1.15 + ag * 0.3) * (1 - p) * (1 - clearBoost * 0.8); // spiral confusion
    const crisp = 1 - blur;
    const openT = clamp(p * 1.05 + smoothstep(0.65, 1, cl) * 0.25 - hv * 0.15);
    open += (openT - open) * (1 - Math.exp(-rdt / 1.6));
    const spin = 0.035 + ag * 0.12 + blur * 0.03;
    theta += dt * spin;
    wobPh += dt * (0.5 + ag * 1.2);
    ribbonPh += dt * (0.28 + ag * 0.5);
    ringPh += dt * (0.12 + ag * 0.3 + blur * 0.1);

    // 1 sky
    drawLayer(g, L.sky, st, 0.1);
    if (blur > 0.02) { g.globalAlpha = blur * 0.8; g.fillStyle = grads.murk; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }

    // 2 galaxy (+ ghosts when confused)
    const gcx = cx * 0.2, gcy = cy * 0.2;
    g.globalCompositeOperation = 'lighter';
    const bright = (0.75 + 0.25 * cl) * (1 - hv * 0.45) * (st.low ? 0.8 : 1);
    const wob = blur * 0.14;
    const sx = 1 + Math.sin(wobPh * 1.3) * wob, sy = 1 + Math.cos(wobPh * 0.9) * wob * 1.4;
    if (blur > 0.02) {
      drawGalaxy(g, st, bright * blur * 0.6, theta + 0.55 + Math.sin(wobPh) * 0.15, sx * 1.12, sy * 0.85, gcx + Math.sin(wobPh * 0.7) * 14 * blur, gcy - 6 * blur);
      drawGalaxy(g, st, bright * blur * 0.5, theta - 0.6 - Math.sin(wobPh * 0.8) * 0.15, sx * 0.86, sy * 1.2, gcx - Math.sin(wobPh * 0.6) * 14 * blur, gcy + 8 * blur);
    }
    drawGalaxy(g, st, bright * (0.45 + 0.55 * crisp), theta, sx, sy, gcx, gcy);
    // core glow (warmer with warmth)
    g.globalAlpha = (0.35 + 0.25 * crisp) * bright; blit(g, sprites.soft.purple, GX + gcx, GY + gcy, W * 0.16, W * 0.26);
    g.globalAlpha = m.warmth * 0.35 * bright; blit(g, sprites.soft.gold, GX + gcx, GY + gcy, W * 0.06, W * 0.1);
    g.globalAlpha = 0.6 * bright; blit(g, sprites.soft.white, GX + gcx, GY + gcy, W * 0.03, W * 0.05);

    // 3 armillary rings (tangled → concentric with the galaxy plane)
    drawRings(g, st, blur, gcx, gcy);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 4 dome shutters slide apart as clarity rises
    const shift = open * W * 0.62;
    const pdx = cx * 0.35, pdy = cy * 0.35;
    g.drawImage(L.panel.c, L.panel.ox - shift + pdx, L.panel.oy + pdy, L.panel.w, L.panel.h);
    g.setTransform(-dpr, 0, 0, dpr, dpr * W, 0);
    g.drawImage(L.panel.c, L.panel.ox - shift - pdx, L.panel.oy + pdy, L.panel.w, L.panel.h);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 5 back wall, floor + dais
    drawLayer(g, L.wall, st, 0.4);
    drawLayer(g, L.floor, st, 0.55);
    g.globalCompositeOperation = 'lighter';
    // dais glow + rotating glyph lamps
    const daisA = 0.25 + 0.45 * crisp + 0.2 * p;
    g.globalAlpha = daisA * 0.6; blit(g, sprites.soft.cyan, W / 2 + cx * 0.55, gy + 6 + cy * 0.55, W * 0.1, W * 0.5);
    g.globalAlpha = 0.35 + 0.1 * Math.sin(st.t * 0.6); blit(g, sprites.soft.violet, W / 2, gy - H * 0.13, W * 0.42, W * 0.52);
    for (const gl of glyphs) {
      const a = gl.a + st.t * 0.08;
      const x = W / 2 + Math.cos(a) * W * 0.425 + cx * 0.55, y = gy + 6 + Math.sin(a) * W * 0.097 + cy * 0.55;
      const front = Math.sin(a) > 0 ? 1 : 0.55;
      g.globalAlpha = daisA * front;
      const s = 5 * gl.s;
      g.drawImage(sprites.cyan, x - s, y - s, s * 2, s * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 6 floating lens (right) magnifying the stars
    drawLens(g, st, crisp);

    // 7 luminous ribbons orbiting
    drawRibbons(g, st, blur);

    // 8 telescope (left) + beam
    drawLayer(g, L.scope, st, 0.8);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 + 0.3 * crisp; blit(g, sprites.cyan, L.lensX + cx * 0.8, L.lensY + cy * 0.8, 9, 9);
    if (beam.on) {
      beam.age += rdt;
      const e = flashEnv(beam.age, 0.35, 0.3, 1.2);
      if (beam.age > 2) beam.on = false;
      const x0 = L.lensX + cx * 0.8, y0 = L.lensY + cy * 0.8;
      g.lineCap = 'round';
      for (const [w, a] of [[10, 0.08], [4, 0.2], [1.4, 0.7]]) {
        g.globalAlpha = a * e; g.strokeStyle = w < 2 ? '#e8fdff' : C.cyan; g.lineWidth = w;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(beam.x, beam.y); g.stroke();
      }
      g.globalAlpha = 0.6 * e; blit(g, sprites.soft.cyan, beam.x, beam.y, 34, 34);
    }
    g.globalAlpha = 1;

    // 9 motes + pulses
    motes.update(rdt * st.motion, 0, 0);
    const want = Math.round(40 * st.density);
    if (motes.n < want && R() < rdt * 6) spawnMote(st, false);
    // spiral drift: motes curl around the galaxy axis
    for (let i = 0; i < motes.n; i++) motes.vx[i] += Math.sin(st.t * 0.5 + motes.y[i] * 0.02) * 4 * rdt * (0.5 + blur);
    motes.draw(g, sprites.list, 0.8 * (1 - hv * 0.4), 1);
    rings.update(rdt); rings.draw(g);
    sparks.update(rdt, 0, 1.2);
    sparks.draw(g, sprites.list);
    g.globalCompositeOperation = 'source-over';

    if (hv > 0.02) { g.globalAlpha = hv * 0.75; g.fillStyle = grads.heavy; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }

  function drawRings(g, st, blur, gcx, gcy) {
    const { W } = st;
    const tilt = -0.32;
    const defs = [
      { r: 0.47, sp: 1.0, ph: 0.0, rot: 0.9, col: C.cyan },
      { r: 0.56, sp: -0.7, ph: 1.7, rot: -0.7, col: C.gold },
      { r: 0.39, sp: 0.55, ph: 3.1, rot: 0.25, col: C.pink },
    ];
    g.lineCap = 'round';
    for (const d of defs) {
      const rx = d.r * W * (1 + blur * 0.08 * Math.sin(ringPh * 2 + d.ph));
      // chaotic: precessing tilted planes; ordered: coplanar with the galaxy
      const ordered = 1 - blur;
      const ph = ringPh * d.sp + d.ph;
      const ryC = rx * (0.15 + 0.85 * Math.abs(Math.sin(ph)));
      const ry = lerp(ryC, rx * 0.5, ordered);
      const rot = lerp(d.rot + Math.sin(ph * 0.5) * 0.4, tilt, ordered);
      for (const [w, a] of [[4, 0.07], [1.1, 0.5]]) {
        g.globalAlpha = a * (0.6 + 0.4 * ordered);
        g.strokeStyle = d.col; g.lineWidth = w;
        g.beginPath(); g.ellipse(GX + gcx, GY + gcy, rx, ry, rot, 0, TAU); g.stroke();
      }
      // a bead travelling the ring
      const ba = ringPh * 1.6 * d.sp + d.ph;
      const bx = Math.cos(ba) * rx, by = Math.sin(ba) * ry;
      const x = GX + gcx + bx * Math.cos(rot) - by * Math.sin(rot), y = GY + gcy + bx * Math.sin(rot) + by * Math.cos(rot);
      g.globalAlpha = 0.9;
      g.drawImage(d.col === C.gold ? sprites.gold : sprites.cyan, x - 6, y - 6, 12, 12);
    }
  }

  function drawRibbons(g, st, blur) {
    const { W, H } = st;
    const defs = [
      { cx: 0.5, cy: 0.52, rx: 0.47, ry: 0.07, rot: -0.12, sp: 1, col: C.cyan, ph: 0 },
      { cx: 0.5, cy: 0.47, rx: 0.42, ry: 0.11, rot: 0.18, sp: -0.8, col: C.purple, ph: 2.4 },
    ];
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    const N = 34;
    for (const d of defs) {
      const head = ribbonPh * d.sp + d.ph;
      const cr = Math.cos(d.rot), sr = Math.sin(d.rot);
      let px = 0, py = 0;
      for (let i = 0; i < N; i++) {
        const a = head - i * 0.07 * Math.sign(d.sp);
        const wob = 1 + blur * 0.18 * Math.sin(a * 3 + ribbonPh * 2);
        const ex = Math.cos(a) * d.rx * W * wob, ey = Math.sin(a) * d.ry * H * wob + blur * 10 * Math.sin(a * 2 + ribbonPh);
        const x = d.cx * W + ex * cr - ey * sr + st.camX * 0.5;
        const y = d.cy * H + ex * sr + ey * cr + st.camY * 0.5;
        if (i > 0) {
          const t = i / N;
          const front = Math.sin(a) > 0 ? 1 : 0.45; // behind the Mallow → dimmer
          const fade = stageFade(x, y, W, H, st.groundY, 0.25);
          g.globalAlpha = (1 - t) * (1 - t) * 0.75 * front * Math.max(fade, front > 0.5 ? 0.6 : 0.25);
          g.strokeStyle = i < 3 ? '#ffffff' : d.col;
          g.lineWidth = (1 - t) * 4 + 0.5;
          g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
        }
        px = x; py = y;
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawLens(g, st, crisp) {
    const { W, H } = st;
    const lx = W * 0.87 + st.camX * 0.7, ly = H * 0.54 + st.camY * 0.7 + Math.sin(st.t * 0.5) * 4;
    const lr = W * 0.085;
    g.save();
    g.beginPath(); g.ellipse(lx, ly, lr, lr * 1.08, 0.15, 0, TAU); g.clip();
    // magnified starfield / galaxy edge inside the glass
    const k = 1.8;
    g.globalAlpha = 0.9;
    g.drawImage(L.sky.c, (lx - L.sky.ox) * st.dpr - (lr / k) * st.dpr, (ly - L.sky.oy) * st.dpr - (lr / k) * st.dpr, (2 * lr / k) * st.dpr, (2 * lr / k) * st.dpr, lx - lr, ly - lr, lr * 2, lr * 2);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.25 + 0.2 * crisp; blit(g, sprites.soft.cyan, lx - lr * 0.3, ly - lr * 0.4, lr * 0.8, lr * 0.8);
    g.restore();
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 2.4; g.strokeStyle = rgba('#ffd27a', 0.8); g.globalAlpha = 1;
    g.beginPath(); g.ellipse(lx, ly, lr, lr * 1.08, 0.15, 0, TAU); g.stroke();
    g.lineWidth = 6; g.strokeStyle = rgba('#ffd27a', 0.12);
    g.beginPath(); g.ellipse(lx, ly, lr, lr * 1.08, 0.15, 0, TAU); g.stroke();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.ellipse(lx, ly, lr * 0.82, lr * 0.9, 0.15, -2.6, -1.6); g.stroke();
    // handle-less floating frame ornament
    g.globalAlpha = 0.7; g.drawImage(sprites.gold, lx - 5, ly + lr * 1.08 - 3, 10, 10); g.drawImage(sprites.gold, lx - 5, ly - lr * 1.08 - 7, 10, 10);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function pulse(kind, x, y, st, gentle) {
    const { W, H, density } = st;
    const n = (k) => Math.round(k * density);
    const spiralBurst = (count, spd, cols, life) => {
      for (let i = 0; i < n(count); i++) {
        const a = (i / count) * TAU * 2;
        const v = spd * R.range(0.5, 1);
        // tangential + radial = spiral fling
        sparks.spawn(x, y, Math.cos(a) * v - Math.sin(a) * v * 0.7, Math.sin(a) * v + Math.cos(a) * v * 0.7, life * R.range(0.8, 1.2), R.range(3, 6), cols[i % cols.length], 0.9);
      }
    };
    if (kind === 'tap') {
      rings.add(x, y, 4, 36, 1, 1, C.cyan, 0.7, 1.4);
      spiralBurst(6, 50, [0, 1], 1);
    } else if (kind === 'ripple') {
      const asp = y > L.hy ? 0.25 : 1;
      for (let i = 0; i < 3; i++) rings.add(x, y, 6 + i * 6, 60 + i * 36, 1.6 + i * 0.4, asp, i % 2 ? C.purple : C.cyan, 0.7 - i * 0.15, 1.5);
    } else if (kind === 'success') {
      rings.add(x, y, 6, 90, 1.5, 1, C.gold, 0.8, 2);
      spiralBurst(20, 110, [2, 3, 0], 1.6);
    } else if (kind === 'burst') {
      rings.add(x, y, 6, 120, 1.3, 1, C.purple, 0.75, 2.4);
      spiralBurst(30, 170, [0, 1, 3], 1.4);
    } else if (kind === 'strike') {
      if (st.reduced || gentle) { rings.add(x, y, 8, 50, 1.6, 1, C.cyan, 0.5, 2); spiralBurst(8, 40, [0, 3], 1.4); }
      else { beam.on = true; beam.age = 0; beam.x = x; beam.y = y; setTimeout(() => { rings.add(x, y, 6, 70, 1.4, 1, C.cyan, 0.8, 2); spiralBurst(14, 90, [0, 3], 1.2); }, 320); }
    } else if (kind === 'clear') {
      clearBoost = 1;
      rings.add(GX, GY, 20, W * 0.8, 2.8, 0.5, C.gold, 0.6, 2.5);
      rings.add(x, y, 10, W * 0.6, 2.2, 1, '#ffffff', 0.4, 1.5);
    }
  }

  return { build, frame, pulse };
}
