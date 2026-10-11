// The Static Storm — Glitzi's realm.
// A crystalline night storm: billowing violet thunderheads rim-lit in cyan
// and magenta, shafts of fractured light whose slices slip out of line,
// corrupted constellations whose lines split and misalign, a cracked glass
// floor glowing like a spider-web of light, chunky crystal clusters framing
// the stage, drifting shards, soft digital lightning and glitch bands that
// displace slices of the world.  Clarity snaps every constellation into clean
// geometry, re-aligns the light, heals the floor into a golden mandala, warms
// the thunderheads' rims and raises a dawn glow on the horizon.

import {
  clamp, lerp, smoothstep, rng, TAU, vgrad, rgba, glowSprite, glintSprite, blit, softBlob,
  Pool, Rings, flashEnv, stageFade, makeCanvas, sceneLayer, drawLayer, billowCloud,
} from '../util.js';

const C = {
  deep: '#05061f', sky: '#0b0e33', mid: '#17135c', horizon: '#2e1f74',
  cyan: '#3ee8ff', magenta: '#ff3df2', violet: '#6b4dff', warm: '#ffb37a', gold: '#ffd98a', rose: '#ff8fc0',
};

const CONSTELLATIONS = [
  { cx: 0.16, cy: 0.37, r: 0.1, kind: 'hex', rot: 0.0 },
  { cx: 0.85, cy: 0.345, r: 0.095, kind: 'star6', rot: 0.26 },
  { cx: 0.82, cy: 0.17, r: 0.07, kind: 'diamond', rot: 0.0 },
  { cx: 0.2, cy: 0.19, r: 0.065, kind: 'penta', rot: -0.3 },
  { cx: 0.5, cy: 0.49, r: 0.16, kind: 'crown', rot: 0 },
];

function shapeNodes(kind) {
  const P = [], E = [];
  const poly = (k, rot, rad = 1, ring = true, off = 0) => {
    for (let i = 0; i < k; i++) P.push([Math.cos(rot + (i * TAU) / k) * rad, Math.sin(rot + (i * TAU) / k) * rad]);
    if (ring) for (let i = 0; i < k; i++) E.push([off + i, off + ((i + 1) % k)]);
  };
  if (kind === 'hex') { poly(6, -Math.PI / 2); P.push([0, 0]); for (let i = 0; i < 6; i += 2) E.push([i, 6]); }
  else if (kind === 'star6') { poly(3, -Math.PI / 2, 1, true, 0); poly(3, Math.PI / 2, 1, true, 3); }
  else if (kind === 'diamond') { poly(4, -Math.PI / 2, 1); P.push([0, 0]); E.push([0, 4], [2, 4]); }
  else if (kind === 'penta') { poly(5, -Math.PI / 2, 1, false); for (let i = 0; i < 5; i++) E.push([i, (i + 2) % 5]); }
  else if (kind === 'crown') {
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; P.push([Math.cos(a), Math.sin(a) * 0.38]); }
    for (let i = 0; i < 6; i++) E.push([i, i + 1]);
  }
  return { P, E };
}

export default function create({ ctx }) {
  let L = {};
  let cons = [];
  let shards = [];
  let shardSprites = [];
  let beamSprites = [];
  let cloudGlows = [];
  let beams = [];
  let sprites;
  let grads = {};
  const sparks = new Pool(90);
  const rings = new Rings(14);
  const bolts = [0, 1].map(() => ({ on: false, age: 0, n: 0, pts: new Float32Array(160), color: C.cyan, x0: 0, y0: 0, x1: 0, y1: 0, soft: false, bi: 4, bdx: 1 }));
  const bands = [];
  for (let i = 0; i < 6; i++) bands.push({ on: false, y: 0, h: 0, dx: 0, age: 0, ttl: 1 });
  let nextBolt = 1.5, nextFlicker = 2, phase = 0, clearBoost = 0, sweep = 0;
  const R = rng(9001);

  function build(st) {
    const { W, H, M } = st;
    const hy = Math.round(H * 0.655), gy = H * st.groundY;
    const r = rng(77);

    // ---------------------------------------------------------------- sky
    const sky = sceneLayer(st);
    {
      const g = sky.g;
      g.fillStyle = vgrad(g, -M, H + M, [[0, C.deep], [0.3, C.sky], [0.52, C.mid], [0.655, C.horizon], [0.7, '#120f40'], [1, '#05051a']]);
      g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      softBlob(g, W * 0.05, H * 0.3, W * 0.75, '#5a1f8f', 0.34, 1, 0.8);
      softBlob(g, W * 0.98, H * 0.4, W * 0.65, '#123c9f', 0.34, 1, 0.9);
      softBlob(g, W * 0.5, H * 0.6, W * 0.8, '#3a2390', 0.4, 1.2, 0.35);
      for (let i = 0; i < 170; i++) {
        const x = r() * W, y = r() * hy * 0.98, s = r() < 0.9 ? r.range(0.4, 0.9) : r.range(1, 1.5);
        g.globalAlpha = r.range(0.15, 0.6) * (0.35 + 0.65 * (1 - y / hy));
        g.fillStyle = r() < 0.7 ? '#dfe6ff' : r() < 0.5 ? C.cyan : '#ffb3f7';
        g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }
    // warm dawn overlay gradient (drawn per frame with alpha — no extra layer)
    grads.dawn = vgrad(ctx, 0, H, [[0, 'rgba(40,20,90,0.0)'], [0.32, 'rgba(70,40,140,0.35)'], [0.52, 'rgba(150,70,150,0.55)'], [0.62, 'rgba(255,140,140,0.75)'], [0.655, 'rgba(255,190,140,0.9)'], [0.69, 'rgba(90,40,110,0.2)'], [1, 'rgba(20,10,40,0)']]);
    grads.tension = vgrad(ctx, 0, H, [[0, 'rgba(120,10,90,0.0)'], [0.25, 'rgba(150,20,110,0.35)'], [0.6, 'rgba(255,40,140,0.3)'], [0.66, 'rgba(255,60,120,0.4)'], [0.75, 'rgba(60,10,60,0.1)'], [1, 'rgba(0,0,0,0)']]);
    grads.heavy = vgrad(ctx, 0, H, [[0, 'rgba(2,2,14,0.55)'], [0.6, 'rgba(6,6,28,0.25)'], [1, 'rgba(2,2,14,0.5)']]);

    // --------------------------------------------------------- thunderheads
    // A mammatus deck: we look up at the storm's underside, where round
    // pouches hang down and catch cyan/magenta light from below.
    const clusters = [];
    const deck = (x0, x1, base, depth, rMin, rMax) => {
      const b = [];
      let x = x0;
      while (x < x1) {
        const t = (x - x0) / (x1 - x0);
        const rr = r.range(rMin, rMax) * (0.75 + 0.5 * Math.sin(t * Math.PI));
        b.push([x, base(x) + r.range(-6, 8), rr]);
        if (r() < 0.6) b.push([x + rr * 0.5, base(x) - rr * r.range(0.6, 1.0), rr * r.range(1.0, 1.4)]);
        x += rr * r.range(1.1, 1.5);
      }
      // fill above the pouches
      const BR = Math.max(150, depth * 2.5);
      for (let fx = x0; fx < x1 + 40; fx += 46) b.push([fx, base(fx) - 14 - BR, BR]);
      let lo = 1e9, hi = -1e9;
      for (const q of b) { lo = Math.min(lo, q[1] - q[2]); hi = Math.max(hi, q[1] + q[2]); }
      clusters.push({ b, y0: lo, y1: hi });
    };
    deck(-M - 20, W + M + 20, (x) => { const u = x / W - 0.58; return H * (0.095 + 0.3 * u * u) + Math.sin(x * 0.03) * 6; }, H * 0.08, 22, 42);
    const wisp = (cx, cy, n, rr) => {
      const b = [];
      for (let i = 0; i < n; i++) { const t = i / (n - 1); b.push([cx + (t - 0.5) * rr * n * 1.1, cy - Math.sin(t * Math.PI) * rr * 0.7, rr * (0.6 + Math.sin(t * Math.PI) * 0.6)]); }
      clusters.push({ b, y0: cy - rr * 2, y1: cy + rr });
    };
    wisp(W * 0.02, H * 0.3, 5, 16);
    wisp(W * 0.98, H * 0.32, 5, 15);
    const paintClouds = (g, warm) => {
      for (const cl of clusters) {
        billowCloud(g, cl.b, {
          top: warm ? '#2d2068' : '#120e36', bottom: warm ? '#4a2f7c' : '#241d66', y0: cl.y0, y1: cl.y1,
          rim: warm ? '#ffc98f' : C.cyan, rimA: warm ? 0.85 : 0.6, rimDy: -2.5,
          crown: warm ? '#8a5fc0' : '#3a2f8f', crownA: 0.3,
          under: warm ? C.rose : C.magenta, underA: warm ? 0.3 : 0.22,
          shade: warm ? '#c07ab8' : '#4a3cc0', shadeA: warm ? 0.4 : 0.42,
        });
      }
    };
    const cloudsBand = [-M, H * 0.38];
    const clouds = sceneLayer(st, ...cloudsBand); paintClouds(clouds.g, false);
    const cloudsWarm = sceneLayer(st, ...cloudsBand); paintClouds(cloudsWarm.g, true);
    cloudGlows = [
      { x: W * 0.1, y: H * 0.05, r: W * 0.34, c: 'violet', ph: 0.2, age: 9, k: 0.55 },
      { x: W * 0.62, y: H * 0.04, r: W * 0.3, c: 'cyan', ph: 1.8, age: 9, k: 0.4 },
      { x: W * 0.92, y: H * 0.1, r: W * 0.3, c: 'magenta', ph: 3.1, age: 9, k: 0.45 },
      { x: W * 0.36, y: H * 0.02, r: W * 0.28, c: 'magenta', ph: 4.4, age: 9, k: 0.35 },
      { x: W * 0.02, y: H * 0.25, r: W * 0.2, c: 'cyan', ph: 5.2, age: 9, k: 0.4 },
      { x: W * 0.98, y: H * 0.27, r: W * 0.2, c: 'violet', ph: 2.6, age: 9, k: 0.4 },
    ];

    // ------------------------------------------------------- crystal art
    const prism = (g, bx, by, len, w, ang, lit, edge, pal) => {
      const ux = Math.cos(ang), uy = Math.sin(ang);      // axis (towards tip)
      const px = -uy, py = ux;                           // across
      const P = (a, s) => [bx + ux * len * a + px * w * s, by + uy * len * a + py * w * s];
      const sh = 0.78;
      const faces = [
        [[P(0, -1), P(sh, -1), P(1, -0.05), P(sh, -0.3), P(0, -0.3)], pal[0]],
        [[P(0, -0.3), P(sh, -0.3), P(1, -0.05), P(sh, 0.4), P(0, 0.4)], pal[1]],
        [[P(0, 0.4), P(sh, 0.4), P(1, -0.05), P(sh, 1), P(0, 1)], pal[2]],
      ];
      for (const [pts, col] of faces) {
        g.fillStyle = col;
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      }
      // inner light rising from the base
      const [tx, ty] = P(1, 0);
      const lg = g.createLinearGradient(bx, by, tx, ty);
      lg.addColorStop(0, rgba(edge, 0.0)); lg.addColorStop(0.55, rgba(edge, 0.1 * lit)); lg.addColorStop(0.92, rgba('#ffffff', 0.22 * lit)); lg.addColorStop(1, rgba(edge, 0));
      g.fillStyle = lg;
      g.beginPath(); faces[0][0].concat(faces[2][0].slice().reverse()).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      // edges
      g.lineJoin = 'round'; g.lineCap = 'round';
      const outline = [P(0, -1), P(sh, -1), P(1, -0.05), P(sh, 1), P(0, 1)];
      const ridges = [[P(0, -0.3), P(sh, -0.3), P(1, -0.05)], [P(0, 0.4), P(sh, 0.4), P(1, -0.05)]];
      g.strokeStyle = rgba(edge, 0.14 * lit); g.lineWidth = 4;
      g.beginPath(); outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.strokeStyle = rgba(edge, 0.7 * lit); g.lineWidth = 1;
      g.beginPath(); outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.strokeStyle = rgba('#ffffff', 0.18 * lit); g.lineWidth = 0.8;
      for (const rl of ridges) { g.beginPath(); rl.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    };
    const PAL_NEAR = ['#2c2584', '#1a165c', '#0c0a2e'];
    const PAL_FAR = ['#2a2272', '#1d185a', '#141042'];

    // distant crystal range on the horizon
    const far = sceneLayer(st, H * 0.36, hy + 8);
    {
      const g = far.g;
      softBlob(g, W * 0.5, hy, W * 0.9, '#5a40c8', 0.25, 1.2, 0.15);
      const range = (count, hMin, hMax, lit, pal, jitter) => {
        const items = [];
        for (let i = 0; i < count; i++) {
          const x = -M + (i + r.range(-0.3, 0.3)) * ((W + 2 * M) / (count - 1));
          const centre = Math.abs(x - W / 2) / (W / 2);
          const h = r.range(hMin, hMax) * (0.45 + Math.pow(centre, 1.4) * 1.1) * (r() < 0.12 ? 1.6 : 1);
          items.push({ x, h, w: r.range(7, 15) * (0.6 + h / hMax * 0.5), ang: -Math.PI / 2 + r.range(-jitter, jitter) });
        }
        items.sort((a, b) => b.h - a.h);
        for (const it of items) prism(g, it.x, hy + 4, it.h, it.w, it.ang, lit, r() < 0.55 ? C.cyan : C.magenta, pal);
      };
      range(30, 18, 70, 0.45, ['#2a2172', '#221b62', '#1b1652'], 0.22);
      range(24, 10, 46, 0.8, PAL_FAR, 0.3);
    }
    // near clusters framing the stage (left + right only)
    const nearL = sceneLayer(st, H * 0.5, H + M, -M, W * 0.24);
    const nearR = sceneLayer(st, H * 0.5, H + M, W * 0.76, W + M);
    const cluster = (g, side) => {
      const bx = side < 0 ? W * 0.02 : W * 0.98;
      const items = [];
      for (let i = 0; i < 7; i++) {
        const len = H * r.range(0.13, 0.3) * (i === 0 ? 1.25 : 1);
        const spread = r.range(-0.42, 0.22);
        items.push({ x: bx + side * r.range(-26, 34), len, w: r.range(15, 26) * (len / (H * 0.22)), ang: -Math.PI / 2 - side * spread });
      }
      items.sort((a, b) => b.len - a.len);
      for (const it of items) prism(g, it.x, H + M * 0.5, it.len, it.w, it.ang, 1, r() < 0.5 ? C.cyan : C.magenta, PAL_NEAR);
      // base glow
      softBlob(g, bx, H, W * 0.22, side < 0 ? C.cyan : C.magenta, 0.12, 1, 0.6);
    };
    cluster(nearL.g, -1); cluster(nearR.g, 1);
    for (const Ln of [nearL, nearR]) {
      Ln.g.fillStyle = vgrad(Ln.g, H * 0.92, H + M, [[0, 'rgba(3,3,16,0)'], [1, 'rgba(3,3,16,0.8)']]);
      Ln.g.fillRect(-M, H * 0.92, W + 2 * M, H * 0.08 + M);
    }

    // -------------------------------------------------------- glass floor
    const floor = sceneLayer(st, hy - 2, H + M);
    {
      const g = floor.g;
      g.fillStyle = vgrad(g, hy, H + M, [[0, '#33287e'], [0.06, '#1b1658'], [0.45, '#0d0b33'], [1, '#04041a']]);
      g.fillRect(-M, hy - 2, W + 2 * M, H - hy + M + 2);
      softBlob(g, W * 0.5, hy + 2, W * 0.8, '#5a48c0', 0.3, 1.3, 0.1);
      // faint reflections of the crystal range
      g.globalAlpha = 0.12;
      g.save(); g.translate(0, hy * 1.35 + 3); g.scale(1, -0.35); g.drawImage(far.c, far.ox, far.oy, far.w, far.h); g.restore();
      g.globalAlpha = 1;
    }
    // cracked-glass web radiating from under the Mallow
    const cracks = sceneLayer(st, hy, H + M);
    {
      const g = cracks.g;
      const ox = W * 0.5, oy = gy, k = 0.3;
      const nRays = 14;
      const rays = [];
      for (let i = 0; i < nRays; i++) {
        let a = (i / nRays) * TAU + r.range(-0.12, 0.12);
        const pts = [];
        let d = 26;
        const maxD = W * r.range(0.75, 1.25);
        while (d < maxD) {
          pts.push([ox + Math.cos(a) * d, oy + Math.sin(a) * d * k, d]);
          d += r.range(26, 58);
          a += r.range(-0.12, 0.12);
        }
        rays.push(pts);
      }
      const at = (ray, dist) => { for (const p of ray) if (p[2] >= dist) return p; return null; };
      const lines = [];
      for (const ray of rays) lines.push({ pts: ray, w: 1, c: r() < 0.3 ? C.magenta : C.cyan });
      for (const rr of [62, 128, 220]) {
        for (let i = 0; i < nRays; i++) {
          if (r() < 0.25) continue;
          const a = at(rays[i], rr * r.range(0.9, 1.1)), b = at(rays[(i + 1) % nRays], rr * r.range(0.9, 1.1));
          if (a && b) lines.push({ pts: [a, [(a[0] + b[0]) / 2 * 0.98 + ox * 0.02, (a[1] + b[1]) / 2 * 0.98 + oy * 0.02], b], w: 0.7, c: r() < 0.4 ? C.magenta : C.cyan });
        }
      }
      // faint glass facets between rays
      for (let i = 0; i < nRays; i++) {
        if (r() < 0.45) continue;
        const A = rays[i], B = rays[(i + 1) % nRays];
        const a0 = at(A, 62), a1 = at(A, 128), b0 = at(B, 62), b1 = at(B, 128);
        if (!(a0 && a1 && b0 && b1)) continue;
        g.fillStyle = rgba(r() < 0.5 ? C.cyan : C.violet, r.range(0.03, 0.07));
        g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.lineTo(b0[0], b0[1]); g.closePath(); g.fill();
      }
      g.save();
      g.beginPath(); g.rect(-M, hy + 3, W + 2 * M, H); g.clip();
      g.globalCompositeOperation = 'lighter';
      g.lineJoin = 'miter'; g.lineCap = 'round';
      for (const [lw, a] of [[6, 0.05], [2.4, 0.16], [0.9, 0.6]]) {
        for (const p of lines) {
          g.strokeStyle = lw < 1 ? rgba('#e6fbff', a * p.w) : rgba(p.c, a * p.w);
          g.lineWidth = lw * p.w;
          g.beginPath();
          p.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.stroke();
        }
      }
      g.restore();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = vgrad(g, hy, hy + 70, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
      g.fillRect(-M, hy, W + 2 * M, 70);
      g.globalCompositeOperation = 'source-over';
    }
    // golden mandala (healed floor)
    const order = sceneLayer(st, hy, H + M);
    {
      const o = order.g;
      const ox = W * 0.5, oy = gy;
      o.save();
      o.beginPath(); o.rect(-M, hy + 2, W + 2 * M, H); o.clip();
      o.globalCompositeOperation = 'lighter';
      for (let k = 1; k <= 9; k++) {
        const rr = 34 * k * (1 + k * 0.12);
        o.strokeStyle = rgba(k % 3 === 0 ? C.gold : '#ffcf9a', 0.5 * (1 - k / 11));
        o.lineWidth = k % 3 === 0 ? 1.5 : 0.8;
        o.beginPath(); o.ellipse(ox, oy, rr, rr * 0.3, 0, 0, TAU); o.stroke();
      }
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU;
        o.strokeStyle = rgba(C.gold, k % 2 ? 0.12 : 0.26);
        o.lineWidth = 0.8;
        o.beginPath(); o.moveTo(ox + Math.cos(a) * 40, oy + Math.sin(a) * 12); o.lineTo(ox + Math.cos(a) * W * 1.3, oy + Math.sin(a) * W * 0.39); o.stroke();
      }
      o.restore();
      o.globalCompositeOperation = 'destination-out';
      o.fillStyle = vgrad(o, hy, hy + 60, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
      o.fillRect(-M, hy, W + 2 * M, 60);
      o.globalCompositeOperation = 'source-over';
    }
    // scanline pattern (tiny tile, no full-screen layer)
    const tile = makeCanvas(4, 6);
    {
      const g = tile.getContext('2d');
      g.fillStyle = 'rgba(0,0,12,0.6)'; g.fillRect(0, 0, 4, 1); g.fillRect(0, 3, 4, 1);
      g.fillStyle = 'rgba(62,232,255,0.1)'; g.fillRect(0, 1, 4, 1);
    }
    grads.scan = ctx.createPattern(tile, 'repeat');

    L = { sky, clouds, cloudsWarm, far, nearL, nearR, floor, cracks, order, hy, gy };

    // ------------------------------------------------------------ sprites
    sprites = {
      cyan: glowSprite(C.cyan, { size: 64, core: 0.5 }), magenta: glowSprite(C.magenta, { size: 64, core: 0.5 }),
      gold: glowSprite(C.gold, { size: 64, core: 0.6 }), white: glowSprite('#ffffff', { size: 64 }),
      glintC: glintSprite(C.cyan, 48), glintG: glintSprite(C.gold, 48), glintM: glintSprite(C.magenta, 48),
      soft: {
        cyan: glowSprite(C.cyan, { size: 128 }), magenta: glowSprite(C.magenta, { size: 128 }), violet: glowSprite(C.violet, { size: 128 }),
        warm: glowSprite(C.warm, { size: 128 }), gold: glowSprite(C.gold, { size: 128 }), halo: glowSprite('#6a4cff', { size: 128 }),
      },
    };
    sprites.list = [sprites.cyan, sprites.magenta, sprites.gold, sprites.white];
    shardSprites = [C.cyan, C.magenta, C.gold].map((col) => {
      const c = makeCanvas(24, 72);
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 72);
      gr.addColorStop(0, rgba('#ffffff', 0)); gr.addColorStop(0.35, rgba(col, 0.75)); gr.addColorStop(0.5, rgba('#ffffff', 0.95)); gr.addColorStop(0.65, rgba(col, 0.75)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(12, 0); g.lineTo(21, 30); g.lineTo(12, 72); g.lineTo(4, 40); g.closePath(); g.fill();
      g.fillStyle = rgba('#ffffff', 0.35);
      g.beginPath(); g.moveTo(12, 0); g.lineTo(13, 36); g.lineTo(12, 72); g.lineTo(8, 40); g.closePath(); g.fill();
      return c;
    });
    beamSprites = [C.cyan, C.magenta, '#ffd9b0'].map((col) => {
      const c = makeCanvas(48, 256);
      const g = c.getContext('2d');
      const gx = g.createLinearGradient(0, 0, 48, 0);
      gx.addColorStop(0, rgba(col, 0)); gx.addColorStop(0.5, rgba(col, 1)); gx.addColorStop(1, rgba(col, 0));
      g.fillStyle = gx; g.fillRect(0, 0, 48, 256);
      g.globalCompositeOperation = 'destination-in';
      const gy2 = g.createLinearGradient(0, 0, 0, 256);
      gy2.addColorStop(0, 'rgba(0,0,0,0)'); gy2.addColorStop(0.15, 'rgba(0,0,0,1)'); gy2.addColorStop(0.7, 'rgba(0,0,0,0.6)'); gy2.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gy2; g.fillRect(0, 0, 48, 256);
      return c;
    });
    // shafts of light breaking through the cloud deck
    beams = [
      { x: W * 0.55, y: H * 0.11, ang: 0.3, len: H * 0.55, w: 34, a: 0.07, ph: 0.3 },
      { x: W * 0.6, y: H * 0.11, ang: 0.42, len: H * 0.52, w: 18, a: 0.08, ph: 2.1 },
      { x: W * 0.5, y: H * 0.12, ang: 0.18, len: H * 0.5, w: 14, a: 0.07, ph: 4.0 },
      { x: W * 0.66, y: H * 0.12, ang: 0.56, len: H * 0.42, w: 26, a: 0.06, ph: 5.3 },
    ];

    cons = CONSTELLATIONS.map((d, ci) => {
      const { P, E } = shapeNodes(d.kind);
      const cr = rng(300 + ci);
      return {
        cx: d.cx * W, cy: d.cy * H, rad: d.r * W, rot: d.rot,
        nodes: P.map(([x, y]) => ({ ox: x, oy: y, dx: cr.range(-0.65, 0.65), dy: cr.range(-0.65, 0.65), jx: cr.range(0, 100), s: cr.range(0.7, 1.15), x: 0, y: 0 })),
        edges: E.map(([a, b]) => ({ a, b, trim: cr.range(0.05, 0.45), end: cr() < 0.5, fl: cr.range(0.5, 1.3), ph: cr.range(0, TAU), ex: cr.range(-7, 7), ey: cr.range(-5, 5) })),
        snap: 0, crown: d.kind === 'crown',
      };
    });

    const n = Math.round(22 * st.density);
    if (shards.length !== n) { shards = []; for (let i = 0; i < n; i++) shards.push(newShard(st, true)); }
  }

  function newShard(st, initial) {
    const { W, H } = st;
    const z = R.range(0.35, 1);
    const side = R() < 0.5 ? -1 : 1;
    return {
      x: initial ? R() * W : (side < 0 ? -20 : W + 20), y: R.range(0.08, 0.8) * H,
      z, size: R.range(7, 16) * (0.5 + z) * (R() < 0.12 ? 1.8 : 1),
      a: R() * TAU, spin: R.range(-0.4, 0.4),
      vx: R.range(3, 9) * (R() < 0.5 ? -1 : 1), vy: R.range(-3, 3),
      c: R() < 0.55 ? 0 : 1, ph: R() * TAU,
    };
  }

  function makeBolt(b, x0, y0, x1, y1, soft) {
    b.on = true; b.age = 0; b.soft = soft; b.x0 = x0; b.y0 = y0; b.x1 = x1; b.y1 = y1;
    b.color = R() < 0.6 ? C.cyan : C.magenta;
    let n = 0, x = x0, y = y0;
    const pts = b.pts;
    pts[n++] = x; pts[n++] = y;
    const steps = 9 + Math.floor(R() * 4);
    for (let i = 1; i <= steps && n < 150; i++) {
      const t = i / steps;
      const ty = lerp(y0, y1, t);
      const tx = lerp(x0, x1, t) + (i < steps ? R.range(-18, 18) : 0);
      pts[n++] = x; pts[n++] = ty; y = ty;   // digital: vertical step…
      pts[n++] = tx; pts[n++] = y; x = tx;   // …then horizontal step
    }
    pts[n++] = x1; pts[n++] = y1;
    b.n = n;
    b.bi = 4 + Math.floor(R() * Math.max(1, n / 2 - 6)) * 2;
    b.bdx = R() < 0.5 ? -1 : 1;
  }

  function strokeBolt(g, b, lw, colour, a) {
    g.strokeStyle = colour; g.globalAlpha = a; g.lineWidth = lw;
    g.beginPath();
    const p = b.pts;
    g.moveTo(p[0], p[1]);
    for (let i = 2; i < b.n; i += 2) g.lineTo(p[i], p[i + 1]);
    const bi = Math.min(b.bi, b.n - 2);
    let x = p[bi], y = p[bi + 1];
    g.moveTo(x, y);
    x += 16 * b.bdx; g.lineTo(x, y); y += 22; g.lineTo(x, y); x += 10 * b.bdx; g.lineTo(x, y); y += 14; g.lineTo(x, y);
    g.stroke();
  }

  function frame(g, st) {
    const { W, H, m, p, dt, rdt, dpr } = st;
    const hy = L.hy, gy = L.gy;
    const cx = st.camX, cy = st.camY;
    const ag = m.agitation, cl = m.clarity, hv = m.heaviness;
    clearBoost *= Math.exp(-rdt / 2.6);
    const calm = clamp(1 - clearBoost * 0.85);
    const corrupt = clamp(Math.pow(1 - cl, 1.1) * 1.25 + ag * 0.25) * calm * (1 - p * 0.95);
    const order = clamp(smoothstep(0.45, 0.92, cl) + (1 - calm) * 0.4);
    const warmK = smoothstep(0.5, 1, cl) * (0.4 + 0.6 * m.warmth);
    phase += dt * (0.45 + ag * 1.6);
    sweep += dt;

    // 1 sky, dawn warmth, heaviness
    drawLayer(g, L.sky, st, 0.12);
    if (warmK > 0.003) { g.globalAlpha = warmK * 0.85; g.fillStyle = grads.dawn; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (ag > 0.25) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (ag - 0.25) * 0.55 * (1 - p); g.fillStyle = grads.tension; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
    if (hv > 0.02) { g.globalAlpha = hv * 0.8; g.fillStyle = grads.heavy; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }

    // 2 shafts of fractured light (behind the cloud deck)
    g.globalCompositeOperation = 'lighter';
    const beamA = (0.55 + 0.45 * cl) * (1 - hv * 0.6) * (st.low ? 0.6 : 1);
    for (const bm of beams) {
      const cs = Math.cos(bm.ang), sn = Math.sin(bm.ang);
      const bx = bm.x + cx * 0.2, by = bm.y + cy * 0.2;
      g.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * bx, dpr * by);
      const segs = 6, segL = bm.len / segs, srcL = 256 / segs;
      const breathe = 0.75 + 0.25 * Math.sin(st.t * 0.35 + bm.ph);
      for (let i = 0; i < segs; i++) {
        const off = corrupt * 16 * Math.sin(phase * 0.5 + bm.ph + i * 1.9) * (i % 2 ? 1 : -1);
        const split = 2 + corrupt * 4;
        if (order < 0.99) {
          g.globalAlpha = bm.a * beamA * breathe * (1 - order) * 0.9;
          g.drawImage(beamSprites[0], 0, i * srcL, 48, srcL, -bm.w / 2 + off - split, i * segL, bm.w, segL + 0.5);
          g.drawImage(beamSprites[1], 0, i * srcL, 48, srcL, -bm.w / 2 + off + split, i * segL, bm.w, segL + 0.5);
        }
        if (order > 0.01) {
          g.globalAlpha = bm.a * beamA * breathe * order * 1.2;
          g.drawImage(beamSprites[2], 0, i * srcL, 48, srcL, -bm.w / 2, i * segL, bm.w * 1.1, segL + 0.5);
        }
      }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 3 thunderheads (lift and thin as the storm clears; heaviness lowers them)
    const cloudDy = -p * H * 0.085 + hv * H * 0.03;
    const cloudA = 1 - p * 0.45;
    drawLayer(g, L.clouds, st, 0.25, cloudA * (1 - warmK), cloudDy);
    drawLayer(g, L.cloudsWarm, st, 0.25, cloudA * warmK, cloudDy);
    // inner light: slow breathing + photosafe flicker events (≥300 ms rise, ≤1/s)
    g.globalCompositeOperation = 'lighter';
    const gStorm = (0.3 + ag * 0.9) * (1 - p);
    if (!st.reduced && gStorm > 0.35) {
      nextFlicker -= rdt * ag;
      if (nextFlicker <= 0) { nextFlicker = R.range(1.2, 3); const cgl = cloudGlows[Math.floor(R() * cloudGlows.length)]; if (cgl.age > 1.6) cgl.age = 0; }
    }
    for (const cgl of cloudGlows) {
      cgl.age += rdt;
      const breathe = 0.5 + 0.5 * Math.sin(st.t * 0.6 + cgl.ph);
      const fl = st.reduced ? 0 : flashEnv(cgl.age, 0.32, 0.1, 1.1);
      const a = (0.08 + breathe * 0.14) * gStorm * cgl.k * 2 + fl * 0.38 * (1 - p);
      if (a > 0.004) { g.globalAlpha = Math.min(0.6, a); blit(g, sprites.soft[cgl.c], cgl.x + cx * 0.25, cgl.y + cy * 0.25 + cloudDy, cgl.r, cgl.r * 1.3); }
    }
    // tension glow under the deck when agitated
    if (ag > 0.3) { g.globalAlpha = (ag - 0.3) * 0.35 * (1 - p); blit(g, sprites.soft.magenta, W * 0.5, H * 0.16 + cloudDy, H * 0.12, W * 0.8); }
    g.globalAlpha = 1;

    // 4 constellations
    drawConstellations(g, st, corrupt, order, ag);

    // 5 lightning
    if (!st.reduced && ag * (1 - p) > 0.33) {
      nextBolt -= rdt;
      if (nextBolt <= 0) {
        nextBolt = lerp(9, 3.2, clamp((ag - 0.33) / 0.6)) * R.range(0.75, 1.3);
        const b = bolts.find((q) => !q.on);
        if (b) {
          const left = R() < 0.5;
          const x0 = left ? R.range(0.08, 0.32) * W : R.range(0.68, 0.92) * W;
          const x1 = left ? R.range(0.04, 0.22) * W : R.range(0.78, 0.96) * W;
          makeBolt(b, x0, R.range(0.08, 0.15) * H, x1, hy - R.range(10, 40), false);
          let near = cloudGlows[0];
          for (const c2 of cloudGlows) if (Math.abs(c2.x - x0) < Math.abs(near.x - x0)) near = c2;
          if (near.age > 1.6) near.age = 0;
        }
      }
    } else nextBolt = Math.min(nextBolt, 1.5);
    g.lineJoin = 'miter'; g.lineCap = 'butt';
    for (const b of bolts) {
      if (!b.on) continue;
      b.age += rdt;
      if (b.age > 2.2) { b.on = false; continue; }
      const e = flashEnv(b.age, 0.3, 0.08, b.soft ? 1.4 : 1.0);
      strokeBolt(g, b, 10, b.color, 0.07 * e);
      strokeBolt(g, b, 3.4, b.color, 0.32 * e);
      strokeBolt(g, b, 1.2, '#f2feff', 0.85 * e);
      g.globalAlpha = 0.5 * e; blit(g, sprites.soft[b.color === C.cyan ? 'cyan' : 'magenta'], b.x1, b.y1, 50, 50);
      g.globalAlpha = 0.28 * e; blit(g, sprites.soft.violet, b.x0, b.y0, 120, 120);
    }
    g.globalAlpha = 1;

    // 6 horizon glow (violet → dawn) + far crystal range
    g.globalAlpha = (0.45 + 0.25 * (1 - ag)) * (1 - warmK * 0.6); blit(g, sprites.soft.violet, W * 0.5 + cx * 0.3, hy, H * 0.08, W * 0.9);
    if (ag > 0.3) { g.globalAlpha = (ag - 0.3) * 0.4; blit(g, sprites.soft.magenta, W * 0.5 + cx * 0.3, hy, H * 0.05, W * 0.8); }
    g.globalAlpha = warmK * 0.95; blit(g, sprites.soft.warm, W * 0.5 + cx * 0.3, hy - 6, H * 0.1, W * 0.95);
    g.globalAlpha = warmK * 0.6; blit(g, sprites.soft.gold, W * 0.5 + cx * 0.3, hy - 4, H * 0.045, W * 0.55);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    drawLayer(g, L.far, st, 0.38);

    // 7 floor: fractured → healed mandala
    const heal = clamp(smoothstep(0.6, 1, cl) * 0.5 + p * 0.6);
    drawLayer(g, L.floor, st, 0.55);
    g.globalCompositeOperation = 'lighter';
    const crackA = (0.6 + ag * 0.3 + 0.1 * Math.sin(phase * 0.9)) * (1 - heal);
    drawLayer(g, L.cracks, st, 0.55, Math.min(1, crackA));
    drawLayer(g, L.order, st, 0.55, heal);
    g.globalAlpha = 0.6 + warmK * 0.3;
    blit(g, warmK > 0.5 ? sprites.soft.warm : sprites.soft.cyan, W * 0.5 + cx * 0.4, hy + 2, 2.4, W * 0.8);
    g.globalAlpha = warmK * 0.4; blit(g, sprites.soft.warm, W * 0.5 + cx * 0.5, hy + (gy - hy) * 0.45, (gy - hy) * 0.6, W * 0.16);
    // stage halo lifts the (dark) Mallow off the night
    g.globalAlpha = 0.42 + 0.08 * Math.sin(st.t * 0.5);
    blit(g, sprites.soft.halo, W * 0.5, gy - H * 0.14, W * 0.5, W * 0.62);
    g.globalAlpha = 0.22 + warmK * 0.25;
    blit(g, warmK > 0.4 ? sprites.soft.gold : sprites.soft.cyan, W * 0.5, gy + 3, 18, W * 0.4);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // 8 near crystal clusters
    drawLayer(g, L.nearL, st, 0.9);
    drawLayer(g, L.nearR, st, 0.9);

    // 9 shards of light
    drawShards(g, st, order);

    // 10 pulses
    g.globalCompositeOperation = 'lighter';
    rings.update(rdt);
    rings.draw(g);
    sparks.update(rdt, 30, 1.6);
    sparks.draw(g, sprites.list);
    g.globalCompositeOperation = 'source-over';

    // 11 glitch bands + scanlines
    drawGlitch(g, st, ag, corrupt, calm);
    const scanA = (0.08 + 0.3 * corrupt + 0.25 * ag) * (1 - p) * calm;
    if (scanA > 0.01) { g.globalAlpha = Math.min(0.45, scanA); g.fillStyle = grads.scan; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (!st.reduced && corrupt > 0.1) {
      const sy = ((sweep * 0.12) % 1.3 - 0.15) * H;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.06 * corrupt;
      blit(g, sprites.soft.cyan, W * 0.5, sy, 40, W);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  function drawConstellations(g, st, corrupt, order, ag) {
    const { rdt } = st;
    const cxp = st.camX * 0.3, cyp = st.camY * 0.3;
    const jitterAmp = ag * 2.6 * (1 - st.p) * (st.reduced ? 0.3 : 1);
    for (const k of cons) {
      k.snap = Math.max(0, k.snap - rdt * 0.25);
      const c = corrupt * (1 - k.snap);
      const rot = k.rot + (k.crown ? 0 : phase * 0.02 * (1 - c));
      const cs = Math.cos(rot), sn = Math.sin(rot);
      for (const nd of k.nodes) {
        const bx = (k.crown ? nd.ox : nd.ox * cs - nd.oy * sn) * k.rad;
        const by = (k.crown ? nd.oy : nd.ox * sn + nd.oy * cs) * k.rad;
        nd.x = k.cx + cxp + bx + nd.dx * k.rad * c + Math.sin(phase * 1.7 + nd.jx) * jitterAmp;
        nd.y = k.cy + cyp + by + nd.dy * k.rad * c + Math.cos(phase * 1.3 + nd.jx) * jitterAmp;
      }
    }
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    const split = 1.2 + corrupt * 2.4 + ag * 1.6;
    const badA = clamp(1 - order) * 0.65;
    if (badA > 0.01) {
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? C.magenta : C.cyan;
        g.lineWidth = 1.1;
        const off = pass ? split : -split;
        for (const k of cons) {
          const c = corrupt * (1 - k.snap);
          for (const e of k.edges) {
            const a = k.nodes[e.a], b = k.nodes[e.b];
            const fl = 1 - c * 0.55 * (0.5 + 0.5 * Math.sin(phase * e.fl + e.ph));
            g.globalAlpha = badA * fl * (k.crown ? 0.8 : 1);
            const tr = e.trim * c;
            let x0 = a.x + e.ex * c, y0 = a.y + e.ey * c, x1 = b.x, y1 = b.y;
            if (e.end) { x1 = lerp(x1, x0, tr); y1 = lerp(y1, y0, tr); } else { x0 = lerp(x0, x1, tr); y0 = lerp(y0, y1, tr); }
            g.beginPath(); g.moveTo(x0 + off, y0); g.lineTo(x1 + off, y1); g.stroke();
          }
        }
      }
    }
    if (order > 0.01) {
      g.strokeStyle = '#ffe6bf';
      g.lineWidth = 1;
      for (const k of cons) {
        g.globalAlpha = order * 0.6;
        g.beginPath();
        for (const e of k.edges) { const a = k.nodes[e.a], b = k.nodes[e.b]; g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
        g.stroke();
      }
    }
    for (const k of cons) {
      for (const nd of k.nodes) {
        const s = 7 * nd.s * (k.crown ? 1.15 : 1);
        if (badA > 0.01) { g.globalAlpha = badA * 1.1; g.drawImage(nd.jx > 50 ? sprites.glintM : sprites.glintC, nd.x - s, nd.y - s, s * 2, s * 2); }
        if (order > 0.01) { const s2 = s * 1.3; g.globalAlpha = order; g.drawImage(sprites.glintG, nd.x - s2, nd.y - s2, s2 * 2, s2 * 2); }
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawShards(g, st, order) {
    const { W, H, dt, dpr, p, m } = st;
    g.globalCompositeOperation = 'lighter';
    const speed = 0.6 + m.agitation * 2.2;
    for (const s of shards) {
      s.ph += dt * 0.8;
      s.x += s.vx * speed * (1 - p * 0.7) * dt;
      s.y += (s.vy * speed * (1 - p) - p * 9 + m.heaviness * 6) * dt + Math.sin(s.ph) * 0.12;
      s.a += s.spin * dt * (1 + m.agitation * 2) * (1 - order * 0.8);
      if (s.x < -30 || s.x > W + 30 || s.y < -40 || s.y > H * 0.9) {
        Object.assign(s, newShard(st, false));
        if (p > 0.3) { s.y = H * R.range(0.5, 0.85); s.x = R() * W; }
      }
      const fade = stageFade(s.x, s.y, W, H, st.groundY, 0.1);
      const x = s.x + st.camX * s.z, y = s.y + st.camY * s.z;
      const ang = lerp(s.a, 0, order * 0.85);
      const cs = Math.cos(ang), sn = Math.sin(ang);
      const k = s.size / 36;
      g.setTransform(dpr * cs * k, dpr * sn * k, -dpr * sn * k, dpr * cs * k, dpr * x, dpr * y);
      const base = (0.35 + 0.45 * s.z) * fade;
      if (order < 0.99) { g.globalAlpha = base * (1 - order) * (0.7 + 0.3 * Math.sin(s.ph * 1.3)); g.drawImage(shardSprites[s.c], -12, -36); }
      if (order > 0.01) { g.globalAlpha = base * order; g.drawImage(shardSprites[2], -12, -36); }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawGlitch(g, st, ag, corrupt, calm) {
    const { W, H, dpr, rdt, p } = st;
    const rate = (ag * 2.4 + corrupt * 0.6) * (1 - p) * calm * (st.reduced ? 0.25 : 1) * (st.low ? 0.4 : 1);
    for (const b of bands) {
      if (!b.on) {
        if (R() < rate * rdt * 0.5) {
          b.on = true; b.age = 0; b.ttl = R.range(0.7, 1.6);
          b.h = R.range(3, 24); b.y = R.range(0.04, 0.82) * H;
          b.dx = R.range(6, 26) * (R() < 0.5 ? -1 : 1) * (0.4 + ag) * (st.reduced ? 0.4 : 1);
        }
        continue;
      }
      b.age += rdt;
      if (b.age >= b.ttl) { b.on = false; continue; }
      const e = Math.sin((b.age / b.ttl) * Math.PI); // eases in and out — no hard flashes
      const sy = Math.max(0, Math.round(b.y * dpr)), sh = Math.max(1, Math.round(b.h * dpr));
      if (sy + sh >= g.canvas.height) continue;
      g.drawImage(g.canvas, 0, sy, g.canvas.width, sh, b.dx * e, b.y, W, b.h);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.25 * e;
      g.fillStyle = C.cyan; g.fillRect(0, b.y, W, 1);
      g.fillStyle = C.magenta; g.fillRect(0, b.y + b.h - 1, W, 1);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  function pulse(kind, x, y, st, gentle) {
    const { W, H } = st;
    const hy = L.hy;
    const spark = (n, spd, cols, life = 1.2, size = 5) => {
      n = Math.round(n * st.density);
      for (let i = 0; i < n; i++) {
        const a = R() * TAU, v = spd * R.range(0.3, 1);
        sparks.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - spd * 0.2, life * R.range(0.7, 1.2), size * R.range(0.6, 1.2), cols[i % cols.length], 0.9);
      }
    };
    if (kind === 'tap') {
      rings.add(x, y, 4, 34, 0.9, 1, C.cyan, 0.7, 1.4);
      spark(6, 60, [0, 1]);
    } else if (kind === 'ripple') {
      const fy = Math.max(y, hy + 12);
      for (let i = 0; i < 3; i++) rings.add(x, fy, 6 + i * 4, 70 + i * 40, 1.6 + i * 0.4, 0.3, i % 2 ? C.magenta : C.cyan, 0.75 - i * 0.15, 1.6);
    } else if (kind === 'success') {
      rings.add(x, y, 8, 90, 1.4, 1, C.gold, 0.8, 2);
      spark(22, 120, [2, 3, 2], 1.5, 6);
      let best = null, bd = 1e9;
      for (const k of cons) { const d = Math.hypot(k.cx - x, k.cy - y); if (d < bd) { bd = d; best = k; } }
      if (best) best.snap = 1;
    } else if (kind === 'burst') {
      rings.add(x, y, 6, 110, 1.2, 1, C.magenta, 0.7, 2.2);
      rings.add(x, y, 4, 70, 1.0, 1, C.cyan, 0.7, 1.5);
      spark(30, 170, [0, 1, 3], 1.3, 6);
    } else if (kind === 'strike') {
      if (st.reduced || gentle) {
        rings.add(x, y, 10, 60, 1.6, 1, C.cyan, 0.45, 2);
        spark(8, 40, [0, 3], 1.6, 7);
      } else {
        const b = bolts.find((q) => !q.on) || bolts[0];
        makeBolt(b, x + R.range(-40, 40), H * R.range(0.06, 0.12), x, y, true);
        for (const c of cloudGlows) if (Math.abs(c.x - x) < W * 0.4 && c.age > 1.6) c.age = 0;
        setTimeout(() => { rings.add(x, y, 6, 64, 1.4, y > hy ? 0.32 : 1, C.cyan, 0.8, 2); spark(16, 110, [0, 1, 3], 1.2, 5); }, 280);
      }
    } else if (kind === 'clear') {
      clearBoost = 1;
      rings.add(x, y, 10, Math.max(W, H) * 0.7, 2.6, 1, C.gold, 0.55, 3);
      rings.add(x, y, 10, Math.max(W, H) * 0.45, 2.2, 1, '#ffe6bf', 0.45, 1.5);
      spark(14, 70, [2, 3], 2, 6);
    }
  }

  return { build, frame, pulse };
}
