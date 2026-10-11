// The Moonmilk Cove — Noomi's realm.
// A sleepy crescent cove under a huge, milky moon.  A shimmering moon path
// runs across calm lavender water, lazy waves lap a pearly shore in milky
// foam, glowing shells and pearls rest in the sand, dream bubbles drift up
// past silhouetted dune grass, and a tiny lighthouse turns its soft beam very
// slowly on the far headland.
//
// Mood:  agitation → busier waves, clouds hurrying across the moon, jittery
//        bubbles · heaviness → mist rolls in, the moon dims, stars thin out ·
//        clarity → crisp stars, bright moon path · warmth → peach/lavender glow.
// Transform: the tide stills to a mirror, a moonmilk aurora ribbon unfurls,
//        many more stars come out and dream bubbles rise gently.

import {
  clamp, lerp, smoothstep, rng, TAU, vgrad, rgba, glowSprite, glintSprite, blit, softBlob,
  Pool, Rings, stageFade, makeCanvas, makeLayer, sceneLayer, drawLayer, billowCloud, bankBillows, flashEnv,
} from '../util.js';

const C = {
  top: '#07061f', high: '#110e3c', sky: '#1f1a58', mid: '#332a76', low: '#5a4a9e', haze: '#9a84d2', horizon: '#dcc6ee',
  milk: '#fff4c8', moon: '#fffaf0', blue: '#8fd0ff', lav: '#b9a6ff', pink: '#ffc4ec', peach: '#ffcfa8', mint: '#c4f7e6',
  ink: '#15123d', foam: '#f4f0ff', sand: '#cbbde8',
};

// parallax depths
const D_SKY = 0.05, D_MOON = 0.08, D_FAR = 0.16, D_WATER = 0.3, D_SHORE = 0.55, D_FRONT = 0.85;
const NS = 48;           // shoreline samples
const N_TW = 120;        // twinkling stars
const N_WAVE = 90;       // wavelets on the open water
const N_GLINT = 120;     // moon-path glints
const N_BUB = 34;        // dream bubbles
const N_FLY = 24;        // dream fireflies
const N_AURORA = 54;     // aurora ribbon columns

export default function create({ ctx }) {
  let L = {};
  let grads = {};
  let S = {};             // sprites
  let shells = [], clouds = [];
  const R = rng(9137);

  // shoreline (scene coords, before parallax)
  const sX = new Float32Array(NS), sY = new Float32Array(NS), fY = new Float32Array(NS);
  // twinkling stars
  const tx = new Float32Array(N_TW), ty = new Float32Array(N_TW), ts = new Float32Array(N_TW), tph = new Float32Array(N_TW), tsp = new Float32Array(N_TW), trk = new Float32Array(N_TW);
  // wavelets
  const wx = new Float32Array(N_WAVE), wd = new Float32Array(N_WAVE), wph = new Float32Array(N_WAVE), wsp = new Float32Array(N_WAVE);
  // moon path glints
  const gx = new Float32Array(N_GLINT), gd = new Float32Array(N_GLINT), gph = new Float32Array(N_GLINT), gsp = new Float32Array(N_GLINT), gl = new Float32Array(N_GLINT);
  // dream bubbles
  const bx = new Float32Array(N_BUB), by = new Float32Array(N_BUB), br = new Float32Array(N_BUB), bph = new Float32Array(N_BUB), bv = new Float32Array(N_BUB), bage = new Float32Array(N_BUB), bpop = new Float32Array(N_BUB);
  const bon = new Uint8Array(N_BUB);
  // fireflies
  const fx = new Float32Array(N_FLY), fyy = new Float32Array(N_FLY), fph = new Float32Array(N_FLY), fsp = new Float32Array(N_FLY), fk = new Uint8Array(N_FLY);

  const sparks = new Pool(90);
  const motes = new Pool(60);
  const rings = new Rings(22);
  const strikes = [];
  for (let i = 0; i < 3; i++) strikes.push({ on: false, x: 0, y: 0, x0: 0, y0: 0, age: 0, gentle: false });
  const sweep = { on: false, age: 0, ttl: 3.4 };
  const shoot = { on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, ttl: 1 };

  let swPh = 0, lhPh = 1.2, auPh = 0, grassPh = 0;
  let clearBoost = 0, nextShoot = 8, stillK = 0, fogK = 0, nextBubble = 0;

  // ---------------------------------------------------------------- helpers
  function shoreAt(x) {
    const u = ((x - sX[0]) / (sX[NS - 1] - sX[0])) * (NS - 1);
    const i = u < 0 ? 0 : u > NS - 2 ? NS - 2 : Math.floor(u);
    const f = clamp(u - i);
    return sY[i] + (sY[i + 1] - sY[i]) * f;
  }

  function build(st) {
    const { W, H, M, dpr } = st;
    const hy = Math.round(H * 0.5), gy = H * st.groundY;
    const mr = Math.max(26, Math.min(W * 0.17, H * 0.088));
    const mx = W * 0.7, my = H * 0.285;
    const r = rng(77);

    // ------------------------------------------------------- shoreline
    for (let i = 0; i < NS; i++) {
      const x = -M + (i / (NS - 1)) * (W + 2 * M);
      const u = clamp((x - W * 0.5) / (W * 0.5), -1.25, 1.25);
      sX[i] = x;
      sY[i] = H * (0.785 - 0.05 * u * u) + Math.sin(i * 0.9 + 1.3) * H * 0.0025 + Math.sin(i * 0.37) * H * 0.003;
    }
    const shoreMin = Math.min(sY[0], sY[NS - 1]);

    // ------------------------------------------------------------- sky
    const sky = sceneLayer(st, -M, hy + 4);
    {
      const g = sky.g;
      g.fillStyle = vgrad(g, -M, hy, [[0, C.top], [0.2, C.high], [0.42, C.sky], [0.66, C.mid], [0.83, C.low], [0.94, C.haze], [1, C.horizon]]);
      g.fillRect(-M, -M, W + 2 * M, hy + M + 4);
      softBlob(g, mx, my, mr * 6, '#5a48b4', 0.3);
      // wide lavender moon halo (static; the bright inner halo breathes per frame)
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.34; blit(g, glowSprite('#9c86f0', { size: 128, falloff: 3 }), mx, my, mr * 6.5);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      softBlob(g, W * 0.5, hy, W * 0.95, '#d8bcec', 0.42, 1.3, 0.22);
      softBlob(g, W * 0.12, hy - H * 0.05, W * 0.45, '#ff9fd8', 0.12, 1.4, 0.5);
    }

    // ----------------------------------------------------------- stars
    const starsMore = sceneLayer(st, -M, Math.round(hy * 0.8));
    {
      const paint = (g, n, aMul, sMax, yMax = 0.92) => {
        for (let i = 0; i < n; i++) {
          const y = -M + Math.pow(r(), 1.35) * (hy * yMax + M);
          const fade = Math.pow(clamp(1 - y / (hy * 0.95)), 0.8);
          g.globalAlpha = r.range(0.25, 0.9) * fade * aMul;
          g.fillStyle = r() < 0.7 ? '#ffffff' : r() < 0.5 ? '#d6e2ff' : '#ffe8d2';
          g.beginPath(); g.arc(-M + r() * (W + 2 * M), y, r.range(0.35, sMax), 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
      };
      const area = (W * hy) / (390 * 470);
      paint(sky.g, Math.round(170 * Math.min(2.6, area)), 0.85, 1.05);
      {
        const g = sky.g;
        // low lavender cloud banks resting on the horizon
        const bank = (cx, cy, w, h, lit) => billowCloud(g, bankBillows(r, cx, cy, Math.min(w, h * 17), h, 1.2), {
          top: lit ? '#b4a5e6' : '#9a8bd6', bottom: lit ? '#d4c0ee' : '#bfaee6', y0: cy - h * 1.1, y1: cy,
          rim: '#f3ecff', rimA: lit ? 0.85 : 0.55, rimDy: -2, crown: '#e2d8ff', crownA: 0.4, shade: '#7a68c0', shadeA: 0.3,
        });
        bank(W * 0.86, hy - H * 0.028, W * 0.56, H * 0.034, true);
        bank(W * 0.18, hy - H * 0.012, W * 0.5, H * 0.026, false);
        bank(W * 0.55, hy + 2, W * 0.36, H * 0.016, false);
      }
      // a faint milky band of dream-dust across the upper sky
      const g = starsMore.g;
      for (let i = 0; i < 9; i++) {
        const u = i / 8;
        softBlob(g, lerp(-W * 0.1, W * 1.1, u), lerp(H * 0.24, H * 0.03, u), W * 0.22, '#9d8fe6', 0.07, 1.6, 0.55);
      }
      for (let i = 0; i < Math.round(260 * Math.min(2.6, area)); i++) {
        const u = r();
        const off = (r() + r() + r() - 1.5) * H * 0.07;
        const x = lerp(-W * 0.1, W * 1.1, u), y = lerp(H * 0.24, H * 0.03, u) + off;
        if (y > hy * 0.78) continue;
        g.globalAlpha = r.range(0.2, 0.75);
        g.fillStyle = r() < 0.75 ? '#ffffff' : '#e0d6ff';
        g.beginPath(); g.arc(x, y, r.range(0.3, 0.85), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      paint(g, Math.round(140 * Math.min(2.6, area)), 0.9, 1.1, 0.78);
    }

    // --------------------------------------------- far headlands + lighthouse
    const far = sceneLayer(st, hy - H * 0.16, hy + 3);
    let lhx = W * 0.115, lhy = 0;
    {
      const g = far.g;
      // right: low distant isle
      g.fillStyle = vgrad(g, hy - H * 0.04, hy, [[0, '#4a3f8e'], [1, '#7a69b8']]);
      g.beginPath();
      g.moveTo(W * 0.74, hy + 2);
      g.bezierCurveTo(W * 0.8, hy - H * 0.012, W * 0.86, hy - H * 0.03, W * 0.93, hy - H * 0.032);
      g.bezierCurveTo(W * 0.98, hy - H * 0.034, W + M * 0.5, hy - H * 0.026, W + M, hy - H * 0.024);
      g.lineTo(W + M, hy + 2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(214,200,255,0.45)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(W * 0.76, hy - H * 0.004); g.bezierCurveTo(W * 0.81, hy - H * 0.016, W * 0.86, hy - H * 0.03, W * 0.93, hy - H * 0.032); g.stroke();
      // left: tall headland with a cliff and the lighthouse
      const capY = hy - H * 0.068;
      g.fillStyle = vgrad(g, capY - 6, hy, [[0, '#2a2466'], [0.6, '#3a3280'], [1, '#6e5eae']]);
      g.beginPath();
      g.moveTo(-M, hy + 2);
      g.lineTo(-M, capY + H * 0.004);
      g.bezierCurveTo(W * 0.02, capY - H * 0.004, W * 0.08, capY - H * 0.002, W * 0.16, capY + H * 0.002);
      g.bezierCurveTo(W * 0.2, capY + H * 0.004, W * 0.215, capY + H * 0.02, W * 0.24, capY + H * 0.036);
      g.bezierCurveTo(W * 0.28, capY + H * 0.05, W * 0.33, hy - H * 0.008, W * 0.4, hy + 2);
      g.closePath(); g.fill();
      // moonlit rim on the moon-facing side
      g.strokeStyle = 'rgba(220,206,255,0.6)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(W * 0.1, capY - H * 0.001);
      g.bezierCurveTo(W * 0.14, capY + H * 0.001, W * 0.2, capY + H * 0.004, W * 0.215, capY + H * 0.02);
      g.bezierCurveTo(W * 0.24, capY + H * 0.036, W * 0.28, capY + H * 0.05, W * 0.33, hy - H * 0.008); g.stroke();
      // tiny rock stacks
      g.fillStyle = '#4b4090';
      g.beginPath(); g.ellipse(W * 0.43, hy, W * 0.018, H * 0.008, 0, Math.PI, TAU); g.fill();
      g.beginPath(); g.ellipse(W * 0.455, hy, W * 0.008, H * 0.005, 0, Math.PI, TAU); g.fill();
      // lighthouse
      const th = Math.max(18, Math.min(H * 0.062, W * 0.15));
      const bw = th * 0.3, tw = th * 0.2, x0 = lhx, yb = capY + H * 0.001;
      const yt = yb - th;
      const tower = g.createLinearGradient(x0 - bw / 2, 0, x0 + bw / 2, 0);
      tower.addColorStop(0, '#8d7fc6'); tower.addColorStop(0.55, '#e8e0ff'); tower.addColorStop(1, '#f8f4ff');
      g.fillStyle = tower;
      g.beginPath(); g.moveTo(x0 - bw / 2, yb); g.lineTo(x0 - tw / 2, yt); g.lineTo(x0 + tw / 2, yt); g.lineTo(x0 + bw / 2, yb); g.closePath(); g.fill();
      g.save(); g.clip();
      g.fillStyle = 'rgba(190,150,230,0.75)';
      for (let k = 0; k < 2; k++) { const y = yb - th * (0.25 + k * 0.32); g.fillRect(x0 - bw, y - th * 0.07, bw * 2, th * 0.12); }
      g.restore();
      // gallery, lantern room, dome
      g.fillStyle = '#3a3282'; g.fillRect(x0 - tw * 0.85, yt - th * 0.03, tw * 1.7, th * 0.05);
      g.fillStyle = '#fff1c4'; g.fillRect(x0 - tw * 0.38, yt - th * 0.16, tw * 0.76, th * 0.13);
      g.fillStyle = '#3a3282';
      g.beginPath(); g.moveTo(x0 - tw * 0.5, yt - th * 0.16); g.quadraticCurveTo(x0, yt - th * 0.32, x0 + tw * 0.5, yt - th * 0.16); g.closePath(); g.fill();
      g.fillRect(x0 - 0.6, yt - th * 0.34, 1.2, th * 0.06);
      // cottage
      g.fillStyle = '#5a4ea6'; g.fillRect(x0 + bw * 0.6, yb - th * 0.2, th * 0.28, th * 0.2);
      g.fillStyle = '#3a3282';
      g.beginPath(); g.moveTo(x0 + bw * 0.5, yb - th * 0.2); g.lineTo(x0 + bw * 0.6 + th * 0.14, yb - th * 0.33); g.lineTo(x0 + bw * 0.7 + th * 0.28, yb - th * 0.2); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,224,170,0.9)'; g.fillRect(x0 + bw * 0.6 + th * 0.1, yb - th * 0.13, th * 0.06, th * 0.06);
      lhy = yt - th * 0.095;
      // horizon haze over the bases
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = vgrad(g, hy - H * 0.05, hy + 2, [[0, 'rgba(231,212,243,0)'], [1, 'rgba(231,212,243,0.55)']]);
      g.fillRect(-M, hy - H * 0.05, W + 2 * M, H * 0.05 + 3);
      g.globalCompositeOperation = 'source-over';
    }

    // ------------------------------------------------------------ water
    const wBot = Math.max(...sY) + H * 0.04;
    const water = sceneLayer(st, hy - 1, wBot);
    {
      const g = water.g;
      g.fillStyle = vgrad(g, hy, wBot, [[0, '#c4aee8'], [0.015, '#9a86d4'], [0.07, '#5e4fa8'], [0.25, '#3a3188'], [0.6, '#262066'], [1, '#1b1652']]);
      g.fillRect(-M, hy - 1, W + 2 * M, wBot - hy + 1);
      // mirrored headlands, fading with depth
      g.save();
      g.globalAlpha = 0.42;
      g.translate(0, hy * 1.75 + 1); g.scale(1, -0.75);
      g.drawImage(far.c, far.ox, far.oy, far.w, far.h);
      g.restore();
      g.fillStyle = vgrad(g, hy, hy + H * 0.07, [[0, 'rgba(116,102,189,0)'], [1, 'rgba(70,61,152,0.9)']]);
      g.fillRect(-M, hy, W + 2 * M, H * 0.07);
      // moonlit sheen beneath the moon
      softBlob(g, mx, hy + H * 0.05, W * 0.32, '#b8a8ff', 0.22, 0.9, 0.9);
      // static ripple streaks
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 170; i++) {
        const t = Math.pow(r(), 1.7);
        const y = hy + 2 + t * (wBot - hy);
        const len = r.range(6, 40) * (0.35 + t * 1.6);
        const x = -M + r() * (W + 2 * M);
        g.strokeStyle = rgba(r() < 0.3 ? '#ffc4ec' : '#d9d0ff', r.range(0.04, 0.12) * (1 - t * 0.5));
        g.lineWidth = 0.5 + t * 1.3;
        g.beginPath(); g.moveTo(x - len / 2, y); g.lineTo(x + len / 2, y); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    }

    // ------------------------------------------------------------ shore
    const shoreTop = shoreMin - 4;
    const shore = sceneLayer(st, shoreTop, H + M);
    {
      const g = shore.g;
      const sandPath = () => {
        g.beginPath(); g.moveTo(sX[0], H + M);
        for (let i = 0; i < NS; i++) g.lineTo(sX[i], sY[i]);
        g.lineTo(sX[NS - 1], H + M); g.closePath();
      };
      sandPath();
      g.fillStyle = vgrad(g, shoreTop, H + M, [[0, '#e4d8f2'], [0.12, '#cdbfe6'], [0.38, '#9e8fce'], [0.7, '#5a4e9c'], [1, '#221c58']]);
      g.fill();
      g.save(); sandPath(); g.clip();
      // moonlight from the right, pearly sheen
      softBlob(g, mx, shoreAt(mx) + H * 0.04, W * 0.5, '#f1eaff', 0.22, 1, 0.3);
      softBlob(g, W * 0.06, shoreAt(W * 0.06) + H * 0.05, W * 0.3, '#ffc4ec', 0.12, 1, 0.45);
      // wet sand band along the waterline
      g.beginPath(); g.moveTo(sX[0], sY[0]);
      for (let i = 0; i < NS; i++) g.lineTo(sX[i], sY[i]);
      for (let i = NS - 1; i >= 0; i--) g.lineTo(sX[i], sY[i] + 4 + (sY[i] - hy) * 0.07);
      g.closePath();
      g.fillStyle = vgrad(g, shoreTop, shoreTop + H * 0.1, [[0, 'rgba(92,78,166,0.8)'], [1, 'rgba(130,114,196,0.35)']]);
      g.fill();
      softBlob(g, mx, shoreAt(mx) + 6, W * 0.16, '#f6f0ff', 0.4, 1.2, 0.12);
      // sparkly pearl dust
      for (let i = 0; i < 520; i++) {
        const x = -M + r() * (W + 2 * M);
        const y0 = shoreAt(x);
        const y = y0 + Math.pow(r(), 1.2) * (H + M - y0);
        g.globalAlpha = r.range(0.08, 0.3);
        g.fillStyle = r() < 0.5 ? '#efe8ff' : '#5a4f9e';
        g.fillRect(x, y, r.range(0.6, 1.4), r.range(0.6, 1.2));
      }
      for (let i = 0; i < 46; i++) {
        const x = -M + r() * (W + 2 * M), y0 = shoreAt(x);
        const y = y0 + 6 + r() * (H * 0.9 - y0);
        g.globalAlpha = r.range(0.35, 0.8) * stageFade(x, y, W, H, st.groundY, 0.2);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(x, y, r.range(0.5, 1.1), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      // wind ripples in the sand at the sides
      g.strokeStyle = 'rgba(70,60,140,0.22)'; g.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const side = i % 2 ? 1 : -1;
        const x = W * 0.5 + side * W * r.range(0.3, 0.55);
        const y0 = shoreAt(x);
        const y = y0 + r.range(14, H * 0.12);
        const w = r.range(14, 34);
        g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - 3, x + w, y + 1); g.stroke();
      }
      // softly lit stage where Noomi rests
      softBlob(g, W * 0.5, gy - H * 0.01, W * 0.44, '#e2d8ff', 0.3, 1, 0.24);
      softBlob(g, W * 0.5, gy + 2, W * 0.2, '#2d266e', 0.32, 1, 0.16);
      g.restore();
      // smooth moonlit boulders at the water's edge
      const boulder = (x, y, w, h) => {
        g.fillStyle = vgrad(g, y - h, y + h * 0.3, [[0, '#9f92d6'], [0.35, '#5a4f9e'], [1, '#221d58']]);
        g.beginPath(); g.ellipse(x, y, w, h, 0, Math.PI, TAU); g.quadraticCurveTo(x + w * 0.6, y + h * 0.3, x, y + h * 0.25); g.quadraticCurveTo(x - w * 0.6, y + h * 0.3, x - w, y); g.fill();
        g.fillStyle = 'rgba(240,232,255,0.35)';
        g.beginPath(); g.ellipse(x + w * 0.2, y - h * 0.72, w * 0.45, h * 0.16, -0.15, 0, TAU); g.fill();
      };
      const s0 = Math.min(W, H * 0.6);
      boulder(W * 0.03, shoreAt(W * 0.03) + H * 0.01, s0 * 0.07, s0 * 0.05);
      boulder(W * 0.12, shoreAt(W * 0.12) + H * 0.008, s0 * 0.035, s0 * 0.025);
      boulder(W * 0.965, shoreAt(W * 0.965) + H * 0.012, s0 * 0.06, s0 * 0.045);
      // shells and pearls (their glow breathes per frame)
      shells = [];
      const sp = [[0.12, 0.835, 1, 0], [0.885, 0.815, 1, 1], [0.21, 0.905, 0, 0], [0.8, 0.9, 1, 0], [0.065, 0.79, 0, 1], [0.94, 0.875, 0, 0], [0.31, 0.95, 1, 1]];
      for (const [px, py, kind, alt] of sp) {
        const x = px * W, y = Math.max(py * H, shoreAt(px * W) + H * 0.025);
        const s = s0 * (kind ? 0.034 : 0.016) * (0.9 + (y / H - 0.78) * 2);
        if (kind) drawShell(g, x, y, s, alt ? 0.5 : -0.4, alt ? '#ffd2ec' : '#f2e6ff');
        else drawPearl(g, x, y, s);
        shells.push({ x, y, s, kind, ph: r() * TAU });
      }
      // bottom vignette for UI legibility
      g.fillStyle = vgrad(g, H * 0.88, H + M, [[0, 'rgba(10,8,34,0)'], [1, 'rgba(10,8,34,0.55)']]);
      g.fillRect(-M, H * 0.88, W + 2 * M, H * 0.12 + M);
    }

    // ------------------------------------- foreground dunes + swaying grass
    const front = sceneLayer(st, H * 0.84, H + M);
    const grassL = makeGrass(st, -1, r);
    const grassR = makeGrass(st, 1, r);
    {
      const g = front.g;
      const dune = (side) => {
        const x0 = side < 0 ? -M : W + M;
        const s = side;
        g.fillStyle = vgrad(g, H * 0.84, H + M, [[0, '#2e2770'], [0.4, '#1d1852'], [1, '#100c34']]);
        g.beginPath();
        g.moveTo(x0, H + M);
        g.lineTo(x0, H * (side < 0 ? 0.885 : 0.87));
        g.bezierCurveTo(x0 - s * W * 0.12, H * (side < 0 ? 0.87 : 0.855), x0 - s * W * 0.24, H * 0.9, x0 - s * W * 0.33, H + M);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(170,152,230,0.45)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x0, H * (side < 0 ? 0.885 : 0.87));
        g.bezierCurveTo(x0 - s * W * 0.12, H * (side < 0 ? 0.87 : 0.855), x0 - s * W * 0.24, H * 0.9, x0 - s * W * 0.33, H + M); g.stroke();
      };
      dune(-1); dune(1);
    }

    // ----------------------------------------------------------- sprites
    S.moon = moonSprite(mr, dpr, r);
    S.ring = ringSprite(mr * 2.7, dpr);
    S.halo = glowSprite(C.milk, { size: 128, falloff: 3.4 });
    S.veil = glowSprite('#8a83bd', { size: 128, falloff: 2.2 });
    S.haloPeach = glowSprite('#ffb48a', { size: 128 });
    S.soft = { white: glowSprite('#ffffff', { size: 128 }), lav: glowSprite(C.lav, { size: 128 }), milk: glowSprite(C.milk, { size: 128, core: 0.5 }), blue: glowSprite(C.blue, { size: 128 }), pink: glowSprite(C.pink, { size: 128 }) };
    S.dot = glowSprite('#f2f0ff', { size: 32, core: 0.7 });
    S.dotMilk = glowSprite(C.milk, { size: 32, core: 0.8 });
    S.dotBlue = glowSprite('#bfe6ff', { size: 32, core: 0.7 });
    S.dotPink = glowSprite('#ffd0f0', { size: 32, core: 0.7 });
    S.glint = glintSprite('#e6deff', 48);
    S.list = [S.dot, S.dotMilk, S.dotBlue, S.dotPink];
    S.hglow = hGlowSprite('#fff6dc');
    S.wave = waveSprite();
    S.bubble = bubbleSprite(96);
    S.cone = coneSprite();
    S.beam = beamSprite();
    S.streak = streakSprite();
    S.au = [auroraSprite('#62f0c4'), auroraSprite('#a98cff'), auroraSprite('#ff86d2')];
    S.fog = fogSprite(W, H, dpr, r);
    S.path = pathSprite(W, mr, hy, shoreAt(mx), dpr);

    grads.heavy = vgrad(ctx, 0, H, [[0, 'rgba(18,16,44,0.82)'], [0.38, 'rgba(52,50,86,0.62)'], [0.5, 'rgba(112,106,142,0.6)'], [0.62, 'rgba(80,76,116,0.5)'], [0.85, 'rgba(40,38,74,0.45)'], [1, 'rgba(12,10,32,0.55)']]);
    grads.warm = vgrad(ctx, 0, H, [[0, 'rgba(130,70,170,0.22)'], [0.28, 'rgba(225,135,200,0.26)'], [0.45, 'rgba(255,170,175,0.36)'], [0.5, 'rgba(255,198,160,0.5)'], [0.57, 'rgba(255,178,186,0.28)'], [0.8, 'rgba(210,130,180,0.18)'], [1, 'rgba(120,60,120,0.1)']]);

    // ---------------------------------------------------------- clouds
    const cr = rng(303);
    clouds = [
      { x: mx / W - 0.95, y: my - mr * 0.15, w: 0.5, h: 0.034, v: 4.2, a: 0.92, d: 0.12 },
      { x: 0.18, y: H * 0.12, w: 0.42, h: 0.03, v: 2.8, a: 0.8, d: 0.08 },
      { x: 1.05, y: my + mr * 1.35, w: 0.38, h: 0.026, v: 3.4, a: 0.88, d: 0.14 },
      // restless scud that only gathers when agitated
      { x: mx / W - 0.05, y: my + mr * 0.45, w: 0.36, h: 0.026, v: 6, a: 0.85, d: 0.13, ag: 1, dark: 1 },
      { x: 0.35, y: H * 0.2, w: 0.3, h: 0.022, v: 7.5, a: 0.75, d: 0.1, ag: 1, dark: 1 },
      { x: -0.2, y: my - mr * 0.9, w: 0.28, h: 0.02, v: 8, a: 0.7, d: 0.12, ag: 1, dark: 1 },
    ].map((c) => ({ ...c, spr: cloudSprite(Math.min(c.w * W, c.h * H * 12), c.h * H, cr, dpr, c.dark) }));

    // ------------------------------------------------------ dynamic bits
    const pr = rng(11);
    for (let i = 0; i < N_TW; i++) {
      let x, y, tries = 0;
      do { x = pr() * W; y = Math.pow(pr(), 1.3) * hy * 0.86; tries++; }
      while (tries < 8 && (Math.hypot(x - mx, y - my) < mr * 1.9 || stageFade(x, y, W, H, st.groundY, 0) < 0.4));
      tx[i] = x; ty[i] = y; ts[i] = pr.range(0.8, 2.2) * (pr() < 0.12 ? 1.7 : 1);
      tph[i] = pr() * TAU; tsp[i] = pr.range(0.5, 1.7); trk[i] = pr();
    }
    for (let i = 0; i < N_WAVE; i++) { wx[i] = pr(); wd[i] = pr(); wph[i] = pr() * TAU; wsp[i] = pr.range(0.35, 0.8); }
    for (let i = 0; i < N_GLINT; i++) {
      gx[i] = (pr() + pr() + pr() - 1.5) / 1.5; gd[i] = pr(); gph[i] = pr() * TAU; gsp[i] = pr.range(1.2, 3.2); gl[i] = pr.range(0.5, 1.4);
    }
    for (let i = 0; i < N_BUB; i++) { bon[i] = 0; bpop[i] = 0; }
    nextBubble = 0;
    // a few bubbles already in the air on first paint
    for (let i = 0; i < Math.round(6 * st.density); i++) spawnBubble(st, true);
    const flyHomes = [
      [0.08, 0.83], [0.17, 0.8], [0.9, 0.79], [0.95, 0.84], [0.04, 0.72], [0.86, 0.71], [0.27, 0.69], [0.75, 0.66],
      [0.12, 0.62], [0.92, 0.6], [0.06, 0.9], [0.84, 0.9], [0.2, 0.74], [0.8, 0.76], [0.33, 0.63], [0.66, 0.62],
    ];
    for (let i = 0; i < N_FLY; i++) {
      const h = flyHomes[i % flyHomes.length];
      fx[i] = (h[0] + pr.range(-0.04, 0.04)) * W; fyy[i] = (h[1] + pr.range(-0.02, 0.02)) * H;
      fph[i] = pr() * TAU; fsp[i] = pr.range(0.25, 0.55); fk[i] = pr() < 0.6 ? 1 : pr() < 0.5 ? 2 : 3;
    }

    L = { sky, starsMore, far, water, shore, front, grassL, grassR, hy, gy, mx, my, mr, lhx, lhy, wBot };
  }

  // ---------------------------------------------------------- sprite makers
  function moonSprite(mr, dpr, r) {
    const pad = 4, size = (mr + pad) * 2;
    const c = makeCanvas(size * dpr, size * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2;
    const body = g.createRadialGradient(cx - mr * 0.25, cy - mr * 0.3, 0, cx, cy, mr);
    body.addColorStop(0, '#fffef8'); body.addColorStop(0.55, '#fff7e6'); body.addColorStop(0.86, '#f3e8f0'); body.addColorStop(1, '#ddd0f2');
    g.fillStyle = body;
    g.beginPath(); g.arc(cx, cy, mr, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(cx, cy, mr, 0, TAU); g.clip();
    // soft milky maria, like cream swirled into milk
    const maria = [[-0.3, -0.18, 0.34], [0.12, -0.32, 0.22], [0.25, 0.1, 0.3], [-0.1, 0.3, 0.2], [-0.45, 0.22, 0.14], [0.42, -0.1, 0.12]];
    for (const [ox, oy, rr] of maria) softBlob(g, cx + ox * mr, cy + oy * mr, rr * mr * 1.5, '#d8c8e8', 0.42, 1.15, 0.85);
    for (let i = 0; i < 12; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * mr * 0.8;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, rr = r.range(0.03, 0.08) * mr;
      g.fillStyle = 'rgba(205,190,226,0.35)'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.6, 0, TAU); g.fill();
    }
    // limb: lavender rim on the lower-left, creamy light upper-right
    const limb = g.createRadialGradient(cx + mr * 0.2, cy - mr * 0.25, mr * 0.55, cx, cy, mr * 1.02);
    limb.addColorStop(0, 'rgba(185,166,255,0)'); limb.addColorStop(1, 'rgba(170,150,240,0.5)');
    g.fillStyle = limb; g.fillRect(0, 0, size, size);
    g.restore();
    c.cssW = size; c.cssH = size;
    return c;
  }

  function ringSprite(rad, dpr) {
    const size = rad * 2 + 20;
    const c = makeCanvas(size * dpr, size * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const gr = g.createRadialGradient(size / 2, size / 2, rad * 0.86, size / 2, size / 2, rad * 1.06);
    gr.addColorStop(0, 'rgba(255,244,214,0)'); gr.addColorStop(0.45, 'rgba(255,240,226,0.55)'); gr.addColorStop(0.6, 'rgba(214,196,255,0.5)'); gr.addColorStop(0.78, 'rgba(160,200,255,0.25)'); gr.addColorStop(1, 'rgba(160,200,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    c.cssW = size; c.cssH = size;
    return c;
  }

  function hGlowSprite(colour) {
    const c = makeCanvas(64, 16);
    const g = c.getContext('2d');
    g.save(); g.translate(32, 8); g.scale(1, 0.25);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, rgba(colour, 0.8)); gr.addColorStop(1, rgba(colour, 0));
    g.fillStyle = gr; g.fillRect(-32, -32, 64, 64);
    g.restore();
    return c;
  }

  function waveSprite() {
    const c = makeCanvas(96, 20);
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 96, 0);
    lg.addColorStop(0, 'rgba(236,228,255,0)'); lg.addColorStop(0.5, 'rgba(236,228,255,1)'); lg.addColorStop(1, 'rgba(236,228,255,0)');
    g.strokeStyle = lg; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.ellipse(48, 18, 44, 10, 0, Math.PI + 0.35, TAU - 0.35); g.stroke();
    const dg = g.createLinearGradient(0, 0, 96, 0);
    dg.addColorStop(0, 'rgba(20,16,70,0)'); dg.addColorStop(0.5, 'rgba(20,16,70,0.5)'); dg.addColorStop(1, 'rgba(20,16,70,0)');
    g.strokeStyle = dg; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(48, 21, 40, 8, 0, Math.PI + 0.45, TAU - 0.45); g.stroke();
    return c;
  }

  function bubbleSprite(s) {
    const c = makeCanvas(s, s);
    const g = c.getContext('2d');
    const cx = s / 2, cy = s / 2, r = s * 0.45;
    const body = g.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    body.addColorStop(0, 'rgba(200,220,255,0.03)'); body.addColorStop(0.7, 'rgba(196,190,255,0.08)'); body.addColorStop(0.9, 'rgba(226,214,255,0.32)'); body.addColorStop(0.98, 'rgba(255,255,255,0.55)'); body.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = body; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.lineCap = 'round';
    g.lineWidth = s * 0.03;
    g.strokeStyle = 'rgba(255,186,236,0.55)'; g.beginPath(); g.arc(cx, cy, r * 0.92, 0.15 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.strokeStyle = 'rgba(150,228,255,0.5)'; g.beginPath(); g.arc(cx, cy, r * 0.92, 1.1 * Math.PI, 1.55 * Math.PI); g.stroke();
    g.strokeStyle = 'rgba(196,247,230,0.45)'; g.beginPath(); g.arc(cx, cy, r * 0.92, 1.65 * Math.PI, 1.95 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.ellipse(cx - r * 0.42, cy - r * 0.42, r * 0.2, r * 0.1, -0.75, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.arc(cx + r * 0.38, cy + r * 0.44, r * 0.06, 0, TAU); g.fill();
    return c;
  }

  function coneSprite() {
    const w = 256, h = 64;
    const c = makeCanvas(w, h);
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, 'rgba(255,244,210,0.9)'); lg.addColorStop(0.3, 'rgba(255,240,220,0.4)'); lg.addColorStop(1, 'rgba(230,220,255,0)');
    g.fillStyle = lg;
    for (let k = 0; k < 6; k++) {
      const s = 0.35 + k * 0.13;
      g.globalAlpha = 0.22;
      g.beginPath(); g.moveTo(0, h / 2 - 1); g.lineTo(w, h / 2 - (h / 2) * s); g.lineTo(w, h / 2 + (h / 2) * s); g.lineTo(0, h / 2 + 1); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    return c;
  }

  function beamSprite() {
    const c = makeCanvas(64, 256);
    const g = c.getContext('2d');
    const gx2 = g.createLinearGradient(0, 0, 64, 0);
    gx2.addColorStop(0, 'rgba(240,234,255,0)'); gx2.addColorStop(0.5, 'rgba(255,250,236,1)'); gx2.addColorStop(1, 'rgba(240,234,255,0)');
    g.fillStyle = gx2; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';
    const gy2 = g.createLinearGradient(0, 0, 0, 256);
    gy2.addColorStop(0, 'rgba(0,0,0,0.15)'); gy2.addColorStop(0.2, 'rgba(0,0,0,0.8)'); gy2.addColorStop(0.75, 'rgba(0,0,0,0.6)'); gy2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gy2; g.fillRect(0, 0, 64, 256);
    return c;
  }

  function streakSprite() {
    const c = makeCanvas(160, 10);
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 160, 0);
    lg.addColorStop(0, 'rgba(200,190,255,0)'); lg.addColorStop(0.8, 'rgba(240,236,255,0.6)'); lg.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = lg;
    g.beginPath(); g.moveTo(0, 5); g.lineTo(156, 3); g.arc(156, 5, 2, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill();
    return c;
  }

  function auroraSprite(colour) {
    const c = makeCanvas(24, 160);
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 24, 0);
    lg.addColorStop(0, rgba(colour, 0)); lg.addColorStop(0.5, rgba(colour, 1)); lg.addColorStop(1, rgba(colour, 0));
    g.fillStyle = lg; g.fillRect(0, 0, 24, 160);
    g.globalCompositeOperation = 'destination-in';
    const vg = g.createLinearGradient(0, 0, 0, 160);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.55, 'rgba(0,0,0,0.35)'); vg.addColorStop(0.88, 'rgba(0,0,0,0.95)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vg; g.fillRect(0, 0, 24, 160);
    return c;
  }

  function fogSprite(W, H, dpr, r) {
    const w = Math.round(W * 1.4), h = Math.round(H * 0.16);
    const sc = Math.min(1, dpr);
    const c = makeCanvas(w * sc, h * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    for (let i = 0; i < 26; i++) {
      const x = (i / 25) * w, y = h * r.range(0.45, 0.65), rr = h * r.range(0.35, 0.6);
      softBlob(g, x, y, rr, '#d6cdf0', r.range(0.35, 0.55), r.range(1.6, 2.6), 0.6);
    }
    // wrap the seam so tiles join softly
    g.globalCompositeOperation = 'destination-in';
    const lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, 'rgba(0,0,0,0.7)'); lg.addColorStop(0.1, 'rgba(0,0,0,1)'); lg.addColorStop(0.9, 'rgba(0,0,0,1)'); lg.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    c.cssW = w; c.cssH = h;
    return c;
  }

  function pathSprite(W, mr, hy, yb, dpr) {
    // soft trapezoid of moonlight from the horizon to the shore
    const h = Math.max(8, yb - hy), w = mr * 1.2 + W * 0.42;
    const sc = Math.min(1, dpr);
    const c = makeCanvas(w * sc, h * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    const spr = glowSprite('#fff4dc', { size: 64 });
    const n = 26;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const y = Math.pow(t, 1.3) * h;
      const hw = mr * 0.45 + t * W * 0.17;
      g.globalAlpha = 0.3 * (1 - t * 0.4);
      g.drawImage(spr, w / 2 - hw, y - 6 - t * 10, hw * 2, 12 + t * 20);
    }
    g.globalAlpha = 1;
    c.cssW = w; c.cssH = h;
    return c;
  }

  function cloudSprite(w, h, r, dpr, dark) {
    const c = makeCanvas((w + 20) * dpr, h * 2.4 * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const base = h * 1.85;
    // rounded, pillowy underside (no flat base)
    const b = bankBillows(r, w / 2 + 10, base, w, h, 1.5).slice(1);
    const n = Math.max(3, Math.round(w / (h * 0.9)));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, bell = Math.sin(u * Math.PI);
      b.push([10 + w * (0.1 + u * 0.8), base - h * 0.32, h * (0.22 + 0.16 * bell) * r.range(0.85, 1.15)]);
    }
    billowCloud(g, b, {
      top: dark ? '#6f62b4' : '#a395e0', bottom: dark ? '#433a8c' : '#6d5fb4', y0: base - h * 1.3, y1: base + h * 0.1,
      rim: '#f4eeff', rimA: dark ? 0.55 : 0.85, rimDy: 2, crown: '#d4c8ff', crownA: dark ? 0.25 : 0.45, shade: '#3a3284', shadeA: 0.18, under: '#ffc4ec', underA: dark ? 0.06 : 0.16,
    });
    c.cssW = w + 20; c.cssH = h * 2.4;
    return c;
  }

  function makeGrass(st, side, r) {
    const { W, H, dpr } = st;
    const w = W * 0.34, h = Math.min(H * 0.105, W * 0.24);
    const L2 = makeLayer(w, h, dpr);
    const g = L2.g;
    const base = h;
    // a few soft tufts rather than a wall of spikes
    const tufts = [[0.08, 1], [0.3, 0.8], [0.52, 0.55], [0.7, 0.35]];
    for (const [tp, sc] of tufts) {
      const cxT = side < 0 ? tp * w : w - tp * w;
      const n = Math.round(7 + sc * 6);
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1;
        const x = cxT + u * w * 0.05 * sc;
        const bl = h * sc * r.range(0.45, 0.95) * (1 - Math.abs(u) * 0.35);
        const lean = (u * 0.55 + (side < 0 ? 0.18 : -0.18) + r.range(-0.12, 0.12)) * bl;
        const y0 = base - (1 - sc) * h * 0.12;
        const bw = r.range(1.4, 2.6);
        const tipX = x + lean, tipY = y0 - bl;
        const lit = r() < 0.4;
        const lg = g.createLinearGradient(0, tipY, 0, y0);
        lg.addColorStop(0, lit ? '#8d7ed0' : '#3a3184'); lg.addColorStop(0.5, '#231d5e'); lg.addColorStop(1, '#130f3c');
        g.fillStyle = lg;
        g.beginPath();
        g.moveTo(x - bw, y0);
        g.quadraticCurveTo(x + lean * 0.15 - bw * 0.4, y0 - bl * 0.6, tipX, tipY);
        g.quadraticCurveTo(x + lean * 0.15 + bw * 0.6, y0 - bl * 0.55, x + bw, y0);
        g.closePath(); g.fill();
      }
      // a sleepy seed head or two
      if (sc > 0.5) {
        const sx = cxT + (side < 0 ? 1 : -1) * w * 0.02, sh = h * sc * 1.05;
        g.strokeStyle = '#2a2470'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(sx, base); g.quadraticCurveTo(sx, base - sh * 0.6, sx + (side < 0 ? 6 : -6), base - sh); g.stroke();
        g.fillStyle = '#3a3184';
        g.beginPath(); g.ellipse(sx + (side < 0 ? 6 : -6), base - sh, 2.2, 5.5, side < 0 ? 0.3 : -0.3, 0, TAU); g.fill();
        g.fillStyle = 'rgba(220,206,255,0.55)';
        g.beginPath(); g.ellipse(sx + (side < 0 ? 6.8 : -5.2), base - sh - 1, 0.9, 4, side < 0 ? 0.3 : -0.3, 0, TAU); g.fill();
      }
    }
    L2.x = side < 0 ? -st.M * 0.5 : W - w + st.M * 0.5;
    L2.y = H * (side < 0 ? 0.885 : 0.87) - h + 6;
    return L2;
  }

  function drawShell(g, x, y, s, rot, col) {
    g.save(); g.translate(x, y); g.rotate(rot);
    const halo = g.createRadialGradient(0, -s * 0.2, 0, 0, -s * 0.2, s * 2.2);
    halo.addColorStop(0, 'rgba(255,220,246,0.35)'); halo.addColorStop(1, 'rgba(255,220,246,0)');
    g.fillStyle = halo; g.fillRect(-s * 2.2, -s * 2.4, s * 4.4, s * 4.4);
    g.fillStyle = 'rgba(30,24,80,0.35)';
    g.beginPath(); g.ellipse(0, s * 0.15, s * 1.05, s * 0.3, 0, 0, TAU); g.fill();
    const body = g.createLinearGradient(0, -s, 0, s * 0.2);
    body.addColorStop(0, '#ffffff'); body.addColorStop(0.6, col); body.addColorStop(1, '#b49ad8');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(0, s * 0.1);
    g.lineTo(-s * 0.95, -s * 0.35); g.quadraticCurveTo(-s * 0.7, -s * 1.15, 0, -s * 1.05); g.quadraticCurveTo(s * 0.7, -s * 1.15, s * 0.95, -s * 0.35);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(150,120,200,0.55)'; g.lineWidth = Math.max(0.6, s * 0.07);
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(0, s * 0.05); g.lineTo(k * s * 0.32, -s * 0.98 + Math.abs(k) * s * 0.12); g.stroke(); }
    g.fillStyle = col; g.fillRect(-s * 0.22, -s * 0.02, s * 0.44, s * 0.18);
    g.restore();
  }

  function drawPearl(g, x, y, s) {
    g.fillStyle = 'rgba(30,24,80,0.35)';
    g.beginPath(); g.ellipse(x, y + s * 0.85, s * 1.1, s * 0.3, 0, 0, TAU); g.fill();
    const pg = g.createRadialGradient(x - s * 0.35, y - s * 0.35, 0, x, y, s);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.45, '#f6eaff'); pg.addColorStop(0.85, '#c8b8f0'); pg.addColorStop(1, '#ffc4ec');
    g.fillStyle = pg; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  }

  // ------------------------------------------------------------- bubbles
  function spawnBubble(st, initial, x0, y0, small) {
    let i = -1;
    for (let k = 0; k < N_BUB; k++) if (!bon[k]) { i = k; break; }
    if (i < 0) return -1;
    const { W, H } = st;
    const z = R();
    let x = x0, y = y0;
    if (x === undefined) {
      x = R() * W;
      if (Math.abs(x - W / 2) < W * 0.3 && R() < 0.75) x = R() < 0.5 ? R.range(0, W * 0.2) : R.range(W * 0.8, W);
      y = initial ? R.range(H * 0.15, H * 0.8) : R.range(H * 0.7, H * 0.88);
    }
    bon[i] = 1; bx[i] = x; by[i] = y; br[i] = (small ? 3 : 4) + z * (small ? 6 : 11);
    bph[i] = R() * TAU; bv[i] = R.range(7, 15) * (0.6 + z * 0.6); bage[i] = initial ? 2 : 0; bpop[i] = 0;
    return i;
  }

  function popBubble(i) {
    if (!bon[i] || bpop[i] > 0) return;
    bpop[i] = 0.001;
    const r0 = br[i];
    rings.add(bx[i], by[i], r0 * 0.9, r0 * 2.6, 0.55, 1, '#f4eeff', 0.7, 1.2);
    const n = 6;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + R() * 0.5, v = R.range(30, 60);
      sparks.spawn(bx[i] + Math.cos(a) * r0, by[i] + Math.sin(a) * r0, Math.cos(a) * v, Math.sin(a) * v, R.range(0.5, 0.8), R.range(1.5, 2.6), k % 2 ? 2 : 3, 0.85);
    }
  }

  // --------------------------------------------------------------- frame
  function frame(g, st) {
    const { W, H, m, p, dt, rdt, dpr, density } = st;
    const { hy, mx, my, mr } = L;
    const cx = st.camX, cy = st.camY;
    const hv = m.heaviness, cl = m.clarity, ag = m.agitation, wm = m.warmth;
    const t = st.t;

    clearBoost *= Math.exp(-rdt / 3.2);
    const still = clamp(p * 1.1);
    stillK += (still - stillK) * (1 - Math.exp(-rdt / 1.2));
    const fogT = smoothstep(0.18, 0.85, hv) * (1 - clearBoost * 0.75);
    fogK += (fogT - fogK) * (1 - Math.exp(-rdt / 1.6));
    const moonVis = clamp((1 - 0.6 * hv) * (0.85 + 0.15 * cl) + clearBoost * 0.15);
    const warmK = clamp(smoothstep(0.42, 0.95, wm) + p * 0.2) * (1 - hv * 0.5);
    const busy = ag * (1 - stillK);

    // 1 sky + stars ------------------------------------------------------
    drawLayer(g, L.sky, st, D_SKY);
    drawLayer(g, L.starsMore, st, D_SKY, clamp(p * 0.95 + smoothstep(0.75, 1, cl) * 0.35) * (1 - hv * 0.8));
    drawTwinkles(g, st, cl, hv, p, ag);
    drawShootingStar(g, st, cl, hv, p);

    // 2 aurora (transform) ------------------------------------------------
    const au = smoothstep(0.2, 0.95, p) * (1 - hv * 0.7);
    if (au > 0.01) drawAurora(g, st, au);

    // 3 moon ---------------------------------------------------------------
    const mX = mx + cx * D_MOON, mY = my + cy * D_MOON;
    const breathe = 0.94 + 0.06 * Math.sin(t * 0.45);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.6 * moonVis * breathe; blit(g, S.halo, mX, mY, mr * 3.1);
    if (warmK > 0.02) { g.globalAlpha = 0.5 * warmK * moonVis; blit(g, S.haloPeach, mX, mY, mr * 4.6); }
    const ringA = (0.13 * smoothstep(0.45, 1, cl)) * moonVis * (1 - hv * 0.6);
    if (ringA > 0.02) { g.globalAlpha = ringA; g.drawImage(S.ring, mX - S.ring.cssW / 2, mY - S.ring.cssH / 2, S.ring.cssW, S.ring.cssH); }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.drawImage(S.moon, mX - S.moon.cssW / 2, mY - S.moon.cssH / 2, S.moon.cssW, S.moon.cssH);
    if (hv > 0.05) { g.globalAlpha = smoothstep(0.05, 0.9, hv) * 0.5 * (1 - clearBoost * 0.5); blit(g, S.veil, mX, mY, mr * 1.7); }
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.18 * moonVis * breathe; blit(g, S.soft.milk, mX, mY, mr * 1.4);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 4 drifting clouds (cross the moon faster when agitated) --------------
        const cloudSpeed = (0.5 + ag * 5.5 + clearBoost * 2) * (1 - stillK * 0.6) * (st.reduced ? 0.5 : 1);
    for (const c of clouds) {
      c.x += (c.v * cloudSpeed / W) * rdt * st.motion;
      if (c.x > 1.3) c.x = -0.25 - (c.spr.cssW / W);
      const spr = c.spr;
      const a = c.a * (1 - clearBoost * 0.6) * (1 - p * 0.9) * (0.7 + 0.3 * (1 - cl) + hv * 0.2) * (c.ag ? smoothstep(0.25, 0.75, ag) : 1);
      if (a < 0.01) continue;
      g.globalAlpha = clamp(a);
      g.drawImage(spr, c.x * W - 10 + cx * c.d, c.y - spr.cssH * 0.83 + cy * c.d, spr.cssW, spr.cssH);
    }
    g.globalAlpha = 1;

    // 5 far headlands + lighthouse ------------------------------------------
    drawLayer(g, L.far, st, D_FAR);
    drawLighthouse(g, st, hv);

    // 6 water ---------------------------------------------------------------
    drawLayer(g, L.water, st, D_WATER);
    drawWater(g, st, cl, hv, ag, p, moonVis, busy);

    // 7 shore + surf --------------------------------------------------------
    drawLayer(g, L.shore, st, D_SHORE);
    drawSurf(g, st, ag, p, cl);
    drawShellGlow(g, st, cl, p);

    // 8 foreground dunes + grass -------------------------------------------
    drawLayer(g, L.front, st, D_FRONT);
    grassPh += dt * (0.7 + ag * 1.6);
    const swayAmp = (0.035 + ag * 0.09) * (1 - stillK * 0.5);
    drawGrass(g, st, L.grassL, Math.sin(grassPh) * swayAmp + Math.sin(grassPh * 2.3 + 1) * swayAmp * 0.3);
    drawGrass(g, st, L.grassR, Math.sin(grassPh + 0.9) * swayAmp + Math.sin(grassPh * 2.1) * swayAmp * 0.3);

    // 9 mist (heaviness) -----------------------------------------------------
    if (fogK > 0.04) drawFog(g, st, fogK);
    if (hv > 0.22) { g.globalAlpha = smoothstep(0.22, 0.95, hv) * 0.62 * (1 - clearBoost * 0.5); g.fillStyle = grads.heavy; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (warmK > 0.01) { g.globalAlpha = warmK * 0.9; g.fillStyle = grads.warm; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }

    // 10 dream bubbles + fireflies -------------------------------------------
    drawFireflies(g, st, hv, p, cl);
    drawBubbles(g, st, hv, p, ag);

    // 11 pulse effects -------------------------------------------------------
    drawSweep(g, st);
    drawStrikes(g, st);
    g.globalCompositeOperation = 'lighter';
    rings.update(rdt);
    rings.draw(g);
    sparks.update(rdt, 30, 1.2);
    sparks.draw(g, S.list, 1, 0.05);
    motes.update(rdt, -4, 0.3);
    motes.draw(g, S.list, 1, 0.4);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  function drawTwinkles(g, st, cl, hv, p, ag) {
    const { W, H, dt } = st;
    const k = clamp(0.28 + 0.4 * cl - 0.32 * hv + 0.6 * p + clearBoost * 0.25);
    const crisp = 0.45 + 0.55 * cl;
    const ox = st.camX * D_SKY, oy = st.camY * D_SKY;
    g.globalCompositeOperation = 'lighter';
    const spd = 1 + ag * 0.8;
    for (let i = 0; i < N_TW; i++) {
      tph[i] += dt * tsp[i] * spd;
      if (trk[i] > k) continue;
      const edge = clamp((k - trk[i]) * 8);
      const tw = 0.55 + 0.45 * Math.sin(tph[i]);
      const a = tw * crisp * edge * (1 - hv * 0.5) * Math.pow(clamp(1 - ty[i] / (L.hy * 0.95)), 0.5);
      if (a < 0.02) continue;
      g.globalAlpha = a;
      const s = ts[i];
      if (s > 2.4) blit(g, S.glint, tx[i] + ox, ty[i] + oy, s * 3.2 * (0.8 + 0.2 * tw));
      else blit(g, S.dot, tx[i] + ox, ty[i] + oy, s * 1.6);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawShootingStar(g, st, cl, hv, p) {
    const { W, H, rdt, dpr } = st;
    if (!shoot.on) {
      if (st.reduced || st.low || hv > 0.55) return;
      nextShoot -= rdt * (0.6 + cl * 0.6 + p * 1.6);
      if (nextShoot > 0) return;
      nextShoot = R.range(10, 22);
      shoot.on = true; shoot.age = 0; shoot.ttl = R.range(0.9, 1.3);
      shoot.x = R.range(W * 0.1, W * 0.6); shoot.y = R.range(H * 0.04, H * 0.2);
      const a = R.range(0.35, 0.6), v = Math.min(W, H) * R.range(0.5, 0.7);
      shoot.vx = Math.cos(a) * v * (R() < 0.5 ? 1 : -1); shoot.vy = Math.sin(a) * v;
      if (shoot.vx < 0) shoot.x += W * 0.35;
    }
    shoot.age += rdt;
    if (shoot.age >= shoot.ttl) { shoot.on = false; return; }
    const u = shoot.age / shoot.ttl;
    const env = Math.sin(u * Math.PI);
    const x = shoot.x + shoot.vx * shoot.age, y = shoot.y + shoot.vy * shoot.age;
    const ang = Math.atan2(shoot.vy, shoot.vx);
    const len = Math.min(W, H) * 0.16 * (0.4 + env * 0.6);
    const cs = Math.cos(ang), sn = Math.sin(ang);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = env * 0.7 * (1 - hv);
    g.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * x, dpr * y);
    g.drawImage(S.streak, -len, -2.5, len, 5);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawAurora(g, st, au) {
    const { W, H, M, dt } = st;
    auPh += dt * 0.22;
    const ox = st.camX * D_SKY, oy = st.camY * D_SKY;
    const step = (W + 2 * M) / (N_AURORA - 1);
    const cw = step * 2.6;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N_AURORA; i++) {
      const u = i / (N_AURORA - 1);
      const x = -M + u * (W + 2 * M) + Math.sin(u * 9 + auPh * 1.4) * step * 0.6;
      const base = H * (0.255 - 0.15 * u + 0.06 * u * u) + Math.sin(u * 5.2 + auPh) * H * 0.022 + Math.sin(u * 13 - auPh * 1.7) * H * 0.007;
      const h = H * (0.11 + 0.05 * Math.sin(u * 7.3 + auPh * 0.8) + 0.03 * Math.sin(u * 17 + auPh * 2.1));
      const env = Math.pow(Math.sin(Math.PI * clamp(u * 1.05 - 0.02)), 0.6);
      const fl = 0.75 + 0.25 * Math.sin(u * 23 + auPh * 3);
      const a = au * 0.42 * env * fl;
      if (a < 0.004) continue;
      const mint = clamp(1.25 - u * 1.9), pink = clamp((u - 0.5) * 2.4), lav = clamp(1 - mint - pink) * 0.8;
      if (mint > 0.02) { g.globalAlpha = a * mint; g.drawImage(S.au[0], x - cw / 2 + ox, base - h + oy, cw, h); }
      if (lav > 0.02) { g.globalAlpha = a * lav; g.drawImage(S.au[1], x - cw / 2 + ox, base - h + oy, cw, h); }
      if (pink > 0.02) { g.globalAlpha = a * pink; g.drawImage(S.au[2], x - cw / 2 + ox, base - h + oy, cw, h); }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawLighthouse(g, st, hv) {
    const { W, dpr, dt } = st;
    lhPh += dt * 0.3;
    const x = L.lhx + st.camX * D_FAR, y = L.lhy + st.camY * D_FAR;
    const c = Math.cos(lhPh), facing = Math.max(0, Math.sin(lhPh));
    const lowK = st.low ? 0.5 : 1;
    const len = W * 0.5 * (0.35 + 0.65 * Math.abs(c));
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = (0.1 + 0.1 * Math.abs(c)) * (1 + hv * 0.6) * lowK;
    g.setTransform(dpr * (c >= 0 ? 1 : -1), 0, 0, dpr, dpr * x, dpr * y);
    g.drawImage(S.cone, 0, -12 - Math.abs(c) * 6, len, 24 + Math.abs(c) * 12);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = (0.45 + 0.35 * facing * facing) * lowK;
    blit(g, S.soft.milk, x, y, 6 + 10 * facing * facing);
    g.globalAlpha = 0.9 * lowK; blit(g, S.dotMilk, x, y, 3);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawWater(g, st, cl, hv, ag, p, moonVis, busy) {
    const { W, H, dt } = st;
    const hy = L.hy, mx = L.mx, mr = L.mr;
    const ox = st.camX * D_WATER, oy = st.camY * D_WATER;
    const yb = shoreAt(mx);
    g.globalCompositeOperation = 'lighter';
    // smooth moon column (brighter and steadier as the tide stills)
    const colA = (0.35 + 0.5 * cl + 0.5 * stillK + clearBoost * 0.4) * moonVis;
    const P = S.path;
    g.globalAlpha = clamp(colA);
    g.drawImage(P, mx - P.cssW / 2 + ox, hy + oy, P.cssW, P.cssH);
    // still-water mirror of the moon's glow
    if (stillK > 0.02) { g.globalAlpha = 0.3 * stillK * moonVis; blit(g, S.soft.milk, mx + ox, hy + (yb - hy) * 0.22 + oy, mr * 0.9, mr * 0.55); }
    // shimmering glints along the moon path
    const flick = 1 - stillK * 0.75;
    const glA = (0.55 + 0.75 * cl + clearBoost * 0.5) * moonVis * (1 - hv * 0.3);
    const spdG = (1 + ag * 1.8) * (1 - stillK * 0.6);
    for (let i = 0; i < N_GLINT; i++) {
      gph[i] += dt * gsp[i] * spdG;
      const d = Math.pow(gd[i], 1.45);
      const y = hy + 2 + d * (yb - hy - 8);
      const spread = mr * 0.42 + d * W * 0.16 * (1 + busy * 0.4);
      const x = mx + gx[i] * spread + Math.sin(gph[i] * 0.3) * (1 + d * 3) * flick;
      const s = Math.sin(gph[i]);
      const b = lerp(s > 0 ? s * s * s : 0, 0.32 + 0.12 * s, stillK);
      const a = glA * b * (1 - Math.abs(gx[i]) * 0.55) * stageFade(x, y, W, H, st.groundY, 0.35);
      if (a < 0.02) continue;
      const len = (9 + d * 48) * gl[i] * (1 + stillK * 0.6);
      g.globalAlpha = clamp(a);
      g.drawImage(S.hglow, x - len / 2 + ox, y - (1.5 + d * 2.5) + oy, len, 3 + d * 5);
    }
    // wavelets: lazy crests that rise and fade; busier when agitated
    const wA = (0.06 + 0.42 * busy + 0.06 * (1 - stillK)) * (1 - hv * 0.35);
    const spdW = (0.7 + busy * 2.2);
    if (wA > 0.01) {
      for (let i = 0; i < N_WAVE; i++) {
        wph[i] += dt * wsp[i] * spdW;
        const d = Math.pow(wd[i], 1.7);
        const x = (((wx[i] * (W + 120) + st.t * (3 + d * 6) * (0.4 + busy)) % (W + 120)) + (W + 120)) % (W + 120) - 60;
        const ys = shoreAt(x);
        const y = hy + 3 + d * (ys - hy - 10);
        const e = Math.sin(wph[i]);
        if (e <= 0) continue;
        const near = Math.abs(x - mx) / (mr * 0.6 + d * W * 0.2);
        const lit = 1 + 1.6 * Math.exp(-near * near);
        const a = wA * e * e * lit * stageFade(x, y, W, H, st.groundY, 0.3);
        if (a < 0.01) continue;
        const w = (14 + d * 80) * (0.7 + busy * 0.6), h = w * 0.2;
        g.globalAlpha = clamp(a);
        g.drawImage(S.wave, x - w / 2 + ox, y - h + oy, w, h);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawSurf(g, st, ag, p, cl) {
    const { H, dt } = st;
    const hy = L.hy;
    const ox = st.camX * D_SHORE, oy = st.camY * D_SHORE;
    swPh += dt * (0.85 + ag * 1.5) * (1 - stillK * 0.65);
    const A = (H * 0.006 + H * 0.014 * ag) * (1 - stillK * 0.85) + H * 0.0025;
    for (let i = 0; i < NS; i++) {
      const ph = swPh - i * 0.11;
      let run = 0.5 + 0.5 * Math.sin(ph);
      run = run * run * (3 - 2 * run);
      const ds = (sY[i] - hy) / (H * 0.24);
      fY[i] = sY[i] + (run - 0.2) * A * ds;
    }
    // thin sheet of water running up the sand
    g.beginPath();
    g.moveTo(sX[0] + ox, sY[0] - 6 + oy);
    for (let i = 0; i < NS; i++) g.lineTo(sX[i] + ox, sY[i] - 2 + oy);
    for (let i = NS - 1; i >= 0; i--) g.lineTo(sX[i] + ox, fY[i] + oy);
    g.closePath();
    g.fillStyle = 'rgba(118,104,196,0.42)';
    g.fill();
    // milky foam front: a continuous soft edge plus lacy clumps that gather as the wave runs up
    g.globalCompositeOperation = 'lighter';
    g.lineJoin = 'round'; g.lineCap = 'round';
    const foamK = 0.55 + 0.35 * ag;
    g.beginPath();
    for (let i = 0; i < NS; i++) { if (i) g.lineTo(sX[i] + ox, fY[i] + oy); else g.moveTo(sX[i] + ox, fY[i] + oy); }
    g.globalAlpha = foamK * 0.12; g.strokeStyle = '#e4dcff'; g.lineWidth = 7; g.stroke();
    g.globalAlpha = foamK * 0.45; g.strokeStyle = '#f4f0ff'; g.lineWidth = 1.1; g.stroke();
    const span = sX[NS - 1] - sX[0];
    const step = Math.max(5, span / 150);
    for (let x = sX[0]; x < sX[NS - 1]; x += step) {
      const u = ((x - sX[0]) / span) * (NS - 1);
      const i = Math.min(NS - 2, u | 0), f = u - i;
      const y = fY[i] + (fY[i + 1] - fY[i]) * f;
      const run = 0.5 + 0.5 * Math.sin(swPh - u * 0.11);
      const lace = 0.5 + 0.5 * Math.sin(x * 0.11 + swPh * 0.7) * Math.sin(x * 0.037 - swPh * 0.45);
      const a = foamK * lace * lace * (0.35 + 0.65 * run);
      if (a < 0.04) continue;
      const ds = (y - hy) / (H * 0.24);
      const len = step * (1.6 + lace * 1.4), th = (1.6 + lace * 2.2) * ds;
      g.globalAlpha = clamp(a * 0.85);
      g.drawImage(S.hglow, x - len / 2 + ox, y - th / 2 + oy, len, th);
    }
    g.globalAlpha = 1;
    // a second, softer line of foam rolling in just offshore
    const fo = (1 - stillK * 0.8) * (0.55 + ag * 0.45);
    if (fo > 0.03) {
      g.beginPath();
      for (let i = 0; i < NS; i++) {
        const ph = swPh - i * 0.11 - 1.9;
        const run = 0.5 + 0.5 * Math.sin(ph);
        const ds = (sY[i] - hy) / (H * 0.24);
        const y = sY[i] - (5 + 14 * (1 - run)) * ds + oy;
        if (i) g.lineTo(sX[i] + ox, y); else g.moveTo(sX[i] + ox, y);
      }
      g.globalAlpha = fo;
      g.strokeStyle = 'rgba(230,222,255,0.2)'; g.lineWidth = 1.3; g.stroke();
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
  }

  function drawShellGlow(g, st, cl, p) {
    const { t } = st;
    const ox = st.camX * D_SHORE, oy = st.camY * D_SHORE;
    g.globalCompositeOperation = 'lighter';
    for (const s of shells) {
      const b = 0.5 + 0.5 * Math.sin(t * 0.7 + s.ph);
      g.globalAlpha = (0.18 + 0.22 * b) * (0.7 + 0.3 * cl + p * 0.5);
      blit(g, s.kind ? S.soft.pink : S.soft.blue, s.x + ox, s.y - s.s * 0.4 + oy, s.s * (3 + b));
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawGrass(g, st, G, skew) {
    const { dpr } = st;
    const x = G.x + st.camX * D_FRONT, y = G.y + st.camY * D_FRONT;
    const baseY = y + G.h;
    // x' = x + skew·(y − baseY): tips lean, roots stay put
    g.setTransform(dpr, 0, skew * dpr, dpr, -skew * baseY * dpr, 0);
    g.drawImage(G.c, x, y, G.w, G.h);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFog(g, st, k) {
    const { W, H, t } = st;
    const F = S.fog;
    for (let b = 0; b < 2; b++) {
      const y = (b ? H * 0.7 : L.hy) - F.cssH * 0.5 + st.camY * 0.4, v = b ? -5 : 7;
      let x = ((t * v) % F.cssW + F.cssW) % F.cssW - F.cssW;
      g.globalAlpha = k * (b ? 0.8 : 1);
      for (; x < W; x += F.cssW) g.drawImage(F, x + st.camX * 0.5, y, F.cssW, F.cssH);
    }
    g.globalAlpha = 1;
  }

  function drawFireflies(g, st, hv, p, cl) {
    const { dt, density, t } = st;
    const n = Math.round(N_FLY * density * (0.55 + 0.45 * (1 - hv)) * (0.75 + p * 0.25));
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      fph[i] += dt * fsp[i];
      const ph = fph[i];
      const x = fx[i] + Math.sin(ph * 0.7) * 18 + Math.sin(ph * 1.9) * 4 + st.camX * 0.6;
      const y = fyy[i] + Math.sin(ph * 0.53 + 1) * 10 - p * 6 + st.camY * 0.6;
      const b = 0.5 + 0.5 * Math.sin(ph * 1.6 + i);
      const a = (0.2 + 0.7 * b * b) * (0.7 + 0.3 * cl) * (1 - hv * 0.4);
      g.globalAlpha = a * stageFade(x, y, st.W, st.H, st.groundY, 0.1);
      blit(g, S.list[fk[i]], x, y, 2.2 + b * 1.6);
      g.globalAlpha = a * 0.18;
      blit(g, fk[i] === 1 ? S.soft.milk : S.soft.blue, x, y, 9 + b * 4);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawBubbles(g, st, hv, p, ag) {
    const { W, H, rdt, dt, density, t } = st;
    const want = Math.round((6 + 16 * p + 3 * (1 - hv)) * density * (st.reduced ? 0.6 : 1));
    let live = 0;
    for (let i = 0; i < N_BUB; i++) live += bon[i];
    nextBubble -= rdt * (1 + p * 2);
    if (live < want && nextBubble <= 0) { spawnBubble(st, false); nextBubble = R.range(0.8, 2.2); }
    const jit = ag * (1 - stillK) * (st.reduced ? 0.3 : 1);
    for (let i = 0; i < N_BUB; i++) {
      if (!bon[i]) continue;
      if (bpop[i] > 0) { bon[i] = 0; continue; }
      bage[i] += dt;
      bph[i] += dt * (0.9 + jit * 5);
      const rise = bv[i] * (1 + p * 0.5) * (1 - hv * 0.4);
      by[i] -= rise * dt;
      bx[i] += (Math.sin(bph[i] * 0.6) * 6 + Math.sin(bph[i] * 3.1) * jit * 14) * dt;
      if (by[i] < -br[i] * 2) { bon[i] = 0; continue; }
      const x = bx[i] + Math.sin(t * 7.3 + i) * jit * 1.6 + st.camX * 0.7;
      const y = by[i] + st.camY * 0.7;
      const r0 = br[i] * (1 + 0.04 * Math.sin(bph[i] * 2.3));
      const a = clamp(bage[i] / 1.5) * clamp(y / (H * 0.12)) * stageFade(x, y, W, H, st.groundY, 0.15) * (0.8 + 0.2 * p);
      if (a < 0.01) continue;
      g.globalAlpha = a;
      g.drawImage(S.bubble, x - r0 * 1.11, y - r0 * 1.11, r0 * 2.22, r0 * 2.22);
    }
    g.globalAlpha = 1;
  }

  function drawSweep(g, st) {
    if (!sweep.on) return;
    const { W, H, rdt, dpr } = st;
    sweep.age += rdt;
    if (sweep.age >= sweep.ttl) { sweep.on = false; return; }
    const u = sweep.age / sweep.ttl;
    const e = u * u * (3 - 2 * u);
    const env = Math.sin(u * Math.PI);
    const ang = lerp(0.95, -0.75, e);           // pivot at the moon, sweeping across the cove
    const px = L.mx + st.camX * D_MOON, py = L.my + st.camY * D_MOON;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const len = H * 1.05, w = W * 0.42;
    g.globalCompositeOperation = 'lighter';
    g.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * px, dpr * py);
    g.globalAlpha = env * 0.2 * sweep.k;
    g.drawImage(S.beam, -w / 2, 0, w, len);
    g.globalAlpha = env * 0.16 * sweep.k;
    g.drawImage(S.beam, -w * 0.18, 0, w * 0.36, len);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawStrikes(g, st) {
    const { rdt, dpr, W, H } = st;
    g.globalCompositeOperation = 'lighter';
    for (const s of strikes) {
      if (!s.on) continue;
      s.age += rdt;
      const fall = s.gentle ? 0 : 0.6;
      if (s.age < fall) {
        // a slow falling star glides down to the spot
        const u = s.age / fall, e = u * (2 - u);
        const x = lerp(s.x0, s.x, e), y = lerp(s.y0, s.y, e);
        const ang = Math.atan2(s.y - s.y0, s.x - s.x0);
        const cs = Math.cos(ang), sn = Math.sin(ang);
        const len = Math.min(W, H) * 0.2 * Math.sin(u * Math.PI * 0.9 + 0.2);
        g.globalAlpha = 0.75;
        g.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * x, dpr * y);
        g.drawImage(S.streak, -len, -3, len, 6);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = 0.8; blit(g, S.dotMilk, x, y, 4);
      }
      const a = flashEnv(s.age - fall, 0.35, 0.2, 1.6);
      if (s.age - fall > 2.2) { s.on = false; continue; }
      if (a > 0.003) {
        const k = s.gentle ? 0.5 : 1;
        const grow = 0.7 + 0.3 * clamp((s.age - fall) / 0.6);
        g.globalAlpha = a * 0.4 * k; blit(g, S.soft.lav, s.x, s.y, 80 * grow * (s.gentle ? 0.7 : 1));
        g.globalAlpha = a * 0.55 * k; blit(g, S.soft.milk, s.x, s.y, 30 * grow);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  // --------------------------------------------------------------- pulses
  function pulse(kind, x, y, st, gentle) {
    const { W, H, density } = st;
    const hy = L.hy;
    const k = gentle ? 0.55 : 1;
    const n = (c) => Math.max(1, Math.round(c * density * k));
    const ys = shoreAt(x);
    const onWater = y > hy && y < ys;
    const onSand = y >= ys;
    const aspect = onWater || onSand ? 0.3 : 1;
    if (kind === 'tap') {
      rings.add(x, y, 3, onWater ? 50 : 32, 1.8, aspect, '#f4eeff', 0.8 * k, 1.5);
      if (onWater) rings.add(x, y, 2, 26, 1.5, aspect, '#ffd2f0', 0.45 * k, 1);
      else for (let i = 0; i < n(3); i++) spawnBubble(st, false, x + R.range(-14, 14), y + R.range(-6, 8), true);
      for (let i = 0; i < n(4); i++) motes.spawn(x + R.range(-8, 8), y, R.range(-14, 14), R.range(-30, -10), R.range(0.9, 1.4), R.range(2, 3.5), 1 + (i % 3), 0.85);
    } else if (kind === 'ripple') {
      const wy = onWater || onSand ? y : Math.max(y, hy + 12);
      for (let i = 0; i < (gentle ? 2 : 4); i++) rings.add(x, wy, 3 + i * 6, 46 + i * 30, 2 + i * 0.45, 0.3, i % 2 ? '#ffd2f0' : '#f4eeff', (0.62 - i * 0.1) * k, 1.4);
    } else if (kind === 'success') {
      for (let i = 0; i < n(9); i++) spawnBubble(st, false, x + R.range(-36, 36), y + R.range(-10, 30), i % 3 === 0);
      for (let i = 0; i < n(16); i++) motes.spawn(x + R.range(-30, 30), y + R.range(-16, 16), R.range(-18, 18), R.range(-60, -22), R.range(1.6, 2.6), R.range(3, 6), i % 4, 0.9);
      rings.add(x, y, 6, 80, 2.4, aspect, '#fff4dc', 0.55 * k, 1.8);
    } else if (kind === 'burst') {
      // nearby dream bubbles pop into sparkles
      for (let i = 0; i < N_BUB; i++) if (bon[i] && Math.hypot(bx[i] - x, by[i] - y) < W * 0.38) popBubble(i);
      rings.add(x, y, 6, 100, 1.8, aspect, '#f4eeff', 0.7 * k, 2);
      for (let i = 0; i < n(26); i++) {
        const a = R() * TAU, v = R.range(50, 150);
        sparks.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - 20, R.range(0.8, 1.3), R.range(2, 4.2), i % 4, 0.9);
      }
      for (let i = 0; i < n(4); i++) spawnBubble(st, false, x + R.range(-20, 20), y + R.range(-20, 20), true);
    } else if (kind === 'strike') {
      // soft moonglow lands here (a gliding star, never a flash)
      const s = strikes.find((q) => !q.on) || strikes[0];
      s.on = true; s.age = 0; s.x = x; s.y = y; s.gentle = !!(gentle || st.reduced || st.low);
      s.x0 = x + R.range(-0.25, 0.25) * W; s.y0 = Math.max(H * 0.04, y - H * 0.38);
      const delay = s.gentle ? 0 : 600;
      setTimeout(() => {
        rings.add(x, y, 6, 70, 1.8, aspect, '#fff4dc', 0.7 * k, 2);
        for (let i = 0; i < n(12); i++) { const a = R() * TAU, v = R.range(20, 70); motes.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - 15, R.range(1, 1.8), R.range(2.5, 4.5), 1 + (i % 3), 0.85); }
      }, delay);
    } else if (kind === 'clear') {
      clearBoost = 1;
      sweep.on = true; sweep.age = 0; sweep.k = gentle || st.low ? 0.5 : 1;
      rings.add(x, y, 10, Math.max(W, H) * 0.6, 3, aspect, '#fff4dc', 0.45 * k, 2.4);
      for (let i = 0; i < n(12); i++) motes.spawn(R() * W, hy + R.range(0, H * 0.25), R.range(-6, 6), R.range(-40, -16), R.range(2, 3.2), R.range(3, 5), 1 + (i % 3), 0.75);
    }
  }

  function destroy() { sparks.n = 0; motes.n = 0; }

  return { build, frame, pulse, destroy };
}
