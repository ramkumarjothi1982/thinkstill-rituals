// GE-23 · ANCHOR REEL — cable-wound anchor (winding turn).
//
// A brass mooring reel stands on the harbour wall. Its rope tether runs over
// a guide roller and out across the water to a glass mooring float that is
// drifting in the open swell, its anchor swinging on a short chain beneath.
// Wind the reel handle clockwise, slowly — one loop, then let go of the
// crank — and the rope coils visibly onto the drum: the float glides in, the
// tether's tension eases into a soft sag (it never snaps slack), the sea
// calms towards the wall, and the anchor settles onto the glowing mooring
// bed. Win: the anchor rests within its safe mooring zone.
//
// Photos: the first glows inside the glass float (storm-blue out at sea, its
// own colours once it reaches the calm water); the others hang as flags
// along the harbour line overhead, whipping in the wind at first and then
// settling, one by one from the shore outwards, into still, natural colour.
// Words: engraved on the reel's brass plate, warming as the tension eases.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, roundRect, motes, rng, canvas } from '../fx.js';
import { AngleTracker, Wobble } from '../kit.js';

export const meta = {
  id: 'GE-23',
  howTo: 'Wind the reel handle slowly clockwise: one loop, then let go.',
  steps: [
    'Hold the wooden knob on the reel handle.',
    'Wind it clockwise, slowly, for one full loop: the tether coils onto the drum.',
    'Let go of the crank, then wind the next loop, until the anchor rests in the glowing mooring ring.',
  ],
  tapAlt: 'each press winds the reel half a loop',
  words: 'Your words are engraved on the reel’s brass plate, glowing warmer as the tether eases.',
  photos: {
    where: 'Your first photo glows inside the glass mooring float; the others hang as flags along the harbour line.',
    becomes: 'a glass mooring float and a line of harbour flags',
    touch: 'You wind the float in on its tether;',
    change: 'it cools from storm-blue back to its own colours as it reaches the calm water, and the flags stop whipping in the wind and soften back to their natural colours, one by one.',
    payoff: 'At the end the float rests safely moored beneath a line of still, glowing flags.',
  },
  finaleSec: 4.2,
};

const LOOPS = 4;                 // loops of rope to wind in
const TOTAL = LOOPS * TAU;       // crank travel to the win (rad, clockwise)
const BANK = 0.32;               // how far the hand may run ahead of what the law allows (rad)
const BASE = 1.2;                // rope already on the drum at the start (loops)
const ASSIST_SPEED = 2.5;        // rad/s while a "Tap instead" press winds the reel
const MAX_SPIN = 6.5;            // rad/s: wind faster than this and the heavy drum lags the hand
const NR = 30;                   // rope polyline points (free span)
const NS = 44;                   // water surface samples
const ZONE_W = [9, 3.6, 1.4], ZONE_A = [0.1, 0.32, 0.9];   // mooring-ring light passes
const ROPES = [
  { base: '#d9b47c', dark: '#2e1d0f', hi: '#fff0cc' },   // hemp
  { base: '#d0806e', dark: '#341210', hi: '#ffe0d2' },   // russet
  { base: '#86c6ba', dark: '#0f2c29', hi: '#e2fff8' },   // sea-green
];

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = !!E.reduced, lowStim = !!E.lowStim, quiet = reduced || lowStim;
  const heavy = !!E.heavy, round = E.round || 1, calm0 = E.calm || 0;
  const rand = E.rand;
  const DPR = Math.min(2, globalThis.devicePixelRatio || 1);

  // ---------------------------------------------------- round variety --
  const r1 = round === 1;
  const V = {
    zone: r1 ? 0.5 : 0.44 + rand() * 0.08,       // mooring zone centre (fraction of width)
    start: r1 ? 0.13 : 0.11 + rand() * 0.06,     // where the float starts, out in the swell
    moon: r1 ? 0.24 : 0.12 + rand() * 0.3,
    rope: ROPES[(round - 1) % ROPES.length],
    twist: (Math.abs(E.seed | 0) + round) % 3,
    ph1: rand() * TAU, ph2: rand() * TAU, ph3: rand() * TAU,
    crank0: -Math.PI / 2 + (r1 ? 0.35 : (rand() - 0.5) * 2),
    spoke0: rand() * TAU,
    stones: 77 + round * 13,
  };
  const agit0 = (heavy ? 0.72 : 1) * (1 - calm0 * 0.9);
  // loop rounds come back at a different hour: moonlight, then a dawn-warm glow, then deep blue
  const skyGlow = [pal.glow, mix(pal.glow, pal.warm || '#ffb37a', 0.4), mix(pal.glow, '#9fb8ff', 0.35)][(round - 1) % 3];

  // ------------------------------------------------------------ colour --
  const ink = pal.ink || pal.deep;
  const C = {
    // sea-blue water in every realm, tinted by the realm's own light
    waterTop: mix('#45b2d4', pal.glow, 0.26),
    waterMid: mix('#11507e', pal.deep, 0.3),
    waterDeep: mix('#061a34', ink, 0.35),
    calm: mix('#a6ecff', pal.glow, 0.3),
    lamp: mix(pal.warm, '#ffe2a8', 0.4),
    stone: mix(ink, '#4f4b6a', 0.55),
    sand: mix(mix(pal.warm, '#f6dcaa', 0.55), '#3a7a9a', 0.14),
    kelp: mix(mix(pal.deep, '#2fae88', 0.55), pal.glow, 0.12),
    storm: mix(pal.accent, '#ff6a5a', 0.35),
    iron: mix('#2a2c3c', pal.deep, 0.3),
  };
  const rope = V.rope;
  const CABLE_C = [rope.dark, mix(rope.base, C.waterMid, 0.2), rgba(rope.hi, 0.4)], CABLE_W = [8, 5, 1.6];

  // ------------------------------------------------------------ photos --
  const n = photos.n;
  const hero = n ? (round - 1) % n : -1;
  const extra = [];
  for (let k = 1; k < n; k++) extra.push((hero + k) % n);
  let slots;
  if (!extra.length) slots = [-1, -1, -1, -1, -1];
  else if (extra.length <= 3) { slots = [-1, -1, -1, -1]; extra.forEach((ph, j) => { slots[clamp(Math.round(((j + 0.5) / extra.length) * 4 - 0.5), 0, 3)] = ph; }); }
  else slots = extra.slice();
  const cloth = [pal.accent, pal.glow, pal.warm, mix(pal.accent, '#ffffff', 0.4), mix(pal.glow, pal.warm, 0.5)];
  // flag 0 is nearest the shore (right) and settles first
  const flags = slots.map((ph, i) => ({ ph, i, x: 0, w: 0, h: 0, u: 0, tie: 0, size: 0, settle: 0, settled: false, a: 0, va: 0, kick: 0,
    ph0: rand() * TAU, col: cloth[(i + round - 1) % cloth.length], thr: 0.1 + 0.76 * (i + 0.5) / slots.length }));

  // ------------------------------------------------------------ layout --
  const L = {};
  let gWater, gVeil, gSand, gShaft, gColumn, gPlinth, gPlate, gPlateRim, gBrass, gRear, gHaze, gSheen, gReelShadow;
  let quay = null;
  const SX = new Float32Array(NS), SY = new Float32Array(NS);
  const RX = new Float32Array(NR + 8), RY = new Float32Array(NR + 8);
  let nRope = 0;
  const kelp = Array.from({ length: 6 }, () => ({ f: rand(), h: 0.6 + rand() * 0.5, ph: rand() * TAU, sp: 0.5 + rand() * 0.4, lean: (rand() - 0.5) * 10, x: 0, hh: 0 }));
  const pebbles = Array.from({ length: 9 }, () => ({ f: rand(), r: 2 + rand() * 4, sq: 0.45 + rand() * 0.25 }));
  const shafts = Array.from({ length: 4 }, (_, i) => ({ f: 0.06 + i * 0.24 + rand() * 0.08, w: 18 + rand() * 24, ph: rand() * TAU }));
  const glitter = Float32Array.from({ length: 48 }, () => rand());
  const KX = new Float32Array(9), KY = new Float32Array(9);

  function fit() {
    const { x, y, w, h } = stage, s = stage.s;
    Object.assign(L, { x, y, w, h, s });
    const tall = h > 330;
    L.lines = h > 400 ? 3 : 2;
    L.fsz = Math.max(12, Math.round(12 * s + 0.5));
    L.plateW = clamp(w * (L.lines === 3 ? 0.36 : 0.42), 108, 176);
    L.plateH = L.lines * L.fsz * 1.2 + 14;
    L.wy = y + h * (tall ? 0.5 : 0.62);
    L.deck = L.wy - Math.max(9, h * 0.045);
    L.plateY = L.deck - 7 - L.plateH;
    const graze = tall ? -3 : 4;                        // on short stages the knob may brush the plate's rim
    const maxCK = (L.plateY + graze - (y + 5)) / 2;
    let RF = clamp(Math.min(w * 0.14, h * 0.12), 26, 56);
    let KR = Math.max(10.5, RF * 0.22);
    if (RF * 0.94 + KR > maxCK) { RF = Math.max(18, (maxCK - KR) / 0.94); KR = Math.max(10.5, RF * 0.22); }
    L.RF = RF; L.KR = KR; L.CA = RF * 0.94; L.RH = RF * 0.3;
    L.tc = (RF * 0.86 - L.RH) / (BASE + LOOPS + 0.4);
    L.ry = L.plateY + graze - L.CA - L.KR;
    L.rx = x + w - Math.max(L.CA + L.KR + 3, L.plateW / 2 + 3, w * 0.17);
    L.pw = L.plateW + 14;
    L.plinthTop = L.ry + RF * 0.62;
    L.qx = L.rx - L.pw / 2 - 6;                         // quay face (the wall drops into the water here)
    L.rp = Math.max(4.5, 6 * s);                        // guide roller radius
    L.px = L.qx + 1 * s; L.py = L.plinthTop - 1 * s;    // guide roller centre
    L.Rf = clamp(33 * s, 22, 40);
    L.zx = Math.min(x + w * V.zone, L.qx - L.Rf - 14 * s);
    L.fx0 = Math.max(x + w * V.start, x + L.Rf + 16 * s);
    if (L.zx - L.fx0 < 70 * s) L.fx0 = Math.max(x + L.Rf + 4, L.zx - 70 * s);
    L.Lc = clamp(h * 0.09, 22, 50);
    L.aH = clamp(L.Rf * 1.5, 30, 56);
    L.zw = clamp(36 * s, 26, 48);
    L.zsY = L.wy + L.Rf * 0.55 + L.Lc + L.aH * 0.92 - 3;   // mooring sand: the anchor's flukes rest here
    L.deepY = Math.min(y + h * 0.99, L.zsY + 64 * s);
    L.shaftH = Math.min(h * 0.36, L.zsY - L.wy + 30);
    L.mx = x + w * V.moon; L.my = y + h * 0.17;
    // harbour line: from the lamp post on the quay (right) to beyond the left edge
    L.lx0 = x + w - 5 * s; L.ly0 = y + Math.max(7, h * 0.02);
    L.lx1 = x - 14; L.ly1 = y + Math.max(12, h * 0.05);
    layoutFlags();
    // kelp roots: deep water to the left of the mooring shelf, plus one by the wall
    kelp.forEach((k, i) => { k.x = i === 5 ? L.qx - 9 * s : lerp(x + 8 * s, L.zx - L.zw - 22 * s, k.f); k.hh = k.h * (i === 5 ? 36 : 70) * s; });
    // cached gradients
    gWater = g.createLinearGradient(0, L.wy - 14 * s, 0, y + h + 10);
    gWater.addColorStop(0, rgba(C.waterTop, 0.62)); gWater.addColorStop(0.1, rgba(C.waterTop, 0.72));
    gWater.addColorStop(0.5, rgba(C.waterMid, 0.86)); gWater.addColorStop(1, rgba(C.waterDeep, 0.94));
    gVeil = g.createLinearGradient(0, L.wy - 14 * s, 0, y + h);
    gVeil.addColorStop(0, rgba(C.waterTop, 0.34)); gVeil.addColorStop(0.35, rgba(C.waterMid, 0.24)); gVeil.addColorStop(1, rgba(C.waterDeep, 0.3));
    gSand = g.createLinearGradient(0, L.zsY - 6 * s, 0, L.zsY + 92 * s);
    gSand.addColorStop(0, rgba(mix(C.sand, '#fff4dc', 0.25), 0.95)); gSand.addColorStop(0.18, rgba(C.sand, 0.88));
    gSand.addColorStop(0.55, rgba(mix(C.sand, C.waterDeep, 0.55), 0.62)); gSand.addColorStop(1, rgba(C.waterDeep, 0.2));
    gShaft = g.createLinearGradient(0, L.wy, 0, L.wy + L.shaftH);
    gShaft.addColorStop(0, rgba(mix(pal.glow, '#ffffff', 0.3), 0.16)); gShaft.addColorStop(1, rgba(pal.glow, 0));
    gColumn = g.createLinearGradient(0, L.wy, 0, L.zsY + 4);
    gColumn.addColorStop(0, rgba(C.calm, 0.02)); gColumn.addColorStop(0.7, rgba(C.calm, 0.08)); gColumn.addColorStop(1, rgba(C.calm, 0.15));
    gPlinth = g.createLinearGradient(L.rx - L.pw / 2, 0, L.rx + L.pw / 2, 0);
    gPlinth.addColorStop(0, '#24160f'); gPlinth.addColorStop(0.3, '#4c3022'); gPlinth.addColorStop(0.72, '#3a2219'); gPlinth.addColorStop(1, '#1a0e0a');
    gPlate = g.createLinearGradient(0, L.plateY, 0, L.plateY + L.plateH);
    gPlate.addColorStop(0, mix(ink, '#2a2350', 0.5)); gPlate.addColorStop(1, mix(ink, '#06040e', 0.5));
    gPlateRim = g.createLinearGradient(L.rx - L.plateW / 2, L.plateY, L.rx + L.plateW / 2, L.plateY + L.plateH);
    gPlateRim.addColorStop(0, '#fff0c4'); gPlateRim.addColorStop(0.4, '#c8913e'); gPlateRim.addColorStop(0.7, '#7a5222'); gPlateRim.addColorStop(1, '#e9c27a');
    gBrass = g.createLinearGradient(L.rx - RF, L.ry - RF, L.rx + RF, L.ry + RF);
    gBrass.addColorStop(0, '#fff4d0'); gBrass.addColorStop(0.28, '#dcaa58'); gBrass.addColorStop(0.6, '#6a461c'); gBrass.addColorStop(0.85, '#c8964c'); gBrass.addColorStop(1, '#ffe2a0');
    gRear = g.createRadialGradient(L.rx - RF * 0.2, L.ry - RF * 0.25, RF * 0.1, L.rx, L.ry, RF);
    gRear.addColorStop(0, '#4a2c1e'); gRear.addColorStop(0.7, '#24140e'); gRear.addColorStop(1, mix(ink, '#0a0608', 0.4));
    gReelShadow = g.createRadialGradient(L.rx, L.ry + 6 * s, RF * 0.7, L.rx, L.ry + 6 * s, RF * 1.18);
    gReelShadow.addColorStop(0, 'rgba(0,0,10,0.5)'); gReelShadow.addColorStop(1, 'rgba(0,0,10,0)');
    gSheen = g.createRadialGradient(L.rx - RF * 0.42, L.ry - RF * 0.5, 0, L.rx - RF * 0.42, L.ry - RF * 0.5, RF * 0.9);
    gSheen.addColorStop(0, 'rgba(255,255,255,0.16)'); gSheen.addColorStop(1, 'rgba(255,255,255,0)');
    gHaze = g.createLinearGradient(0, L.wy - 50 * s, 0, L.wy + 2);
    gHaze.addColorStop(0, rgba(pal.glow, 0)); gHaze.addColorStop(1, rgba(pal.glow, 0.14));
    buildQuay();
    fxs = floatX(rot / TOTAL); fv = 0;
  }

  function layoutFlags() {
    const s = L.s, nf = flags.length;
    const crankTop = L.ry - L.CA - L.KR;
    let fh = clamp(46 * s, 28, 52);
    const roomV = crankTop - (L.ly0 + 7) - 4;
    let xa = L.lx0 - 22 * s;
    if (roomV < fh * 0.72) xa = Math.min(xa, L.rx - L.CA - L.KR - 12 * s);   // keep clear of the crank
    else fh = Math.min(fh, roomV);
    const xb = L.x + 20 * s;
    const floatTop = L.wy - L.Rf * 1.5;
    const anyPhoto = flags.some((f) => f.ph >= 0);
    // many photo flags: hang every other one on a longer tie (two tiers), so each stays large
    const tiers = anyPhoto && nf >= 5 && (L.ly1 + fh * 2 + 18 * s) < floatTop - 10 ? 2 : 1;
    const pitch = (xa - xb) / nf;
    const size = Math.max(24, Math.min(fh, pitch * tiers * 0.86));
    flags.forEach((f, i) => {
      f.x = xa - pitch * (i + 0.5);
      f.u = (f.x - L.lx0) / (L.lx1 - L.lx0);
      f.tie = tiers === 2 && i % 2 ? size + 10 * s : 0;
      f.size = size;
      if (f.ph >= 0) { const d = photos.size(f.ph, 'card', size); f.w = d.w; f.h = d.h; }
      else { f.w = size * 0.66; f.h = size * 0.86; }
    });
  }

  // the harbour wall, pre-rendered once per layout (static stone)
  function buildQuay() {
    const s = L.s, x0 = L.qx - 6 * s, y0 = L.deck - 5 * s, x1 = L.x + L.w + 16, y1 = L.y + L.h + 12;
    const W = Math.max(4, Math.ceil(x1 - x0)), H = Math.max(4, Math.ceil(y1 - y0));
    if (quay) { try { quay.c.width = quay.c.height = 0; } catch { /* ignore */ } }
    const c = canvas(Math.round(W * DPR), Math.round(H * DPR)), q = c.getContext('2d');
    q.scale(DPR, DPR); q.translate(-x0, -y0);
    const R = rng(V.stones), bh = 15 * s, top = L.deck + 6 * s;
    q.fillStyle = mix(C.stone, '#05040c', 0.6); q.fillRect(L.qx, top, x1 - L.qx, y1 - top);
    let row = 0;
    for (let yy = top; yy < y1; yy += bh, row++) {
      let xx = L.qx - (row % 2 ? 0 : 13 * s);
      while (xx < x1) {
        const bw = (22 + R() * 18) * s, x2 = Math.max(L.qx, xx), ww = Math.min(x1, xx + bw) - x2;
        if (ww > 3) {
          const tone = R();
          q.fillStyle = mix(C.stone, tone > 0.5 ? '#dfe2ff' : '#06040e', Math.abs(tone - 0.5) * 0.4);
          rr(q, x2 + 0.8, yy + 0.8, ww - 1.6, bh - 1.6, 2.6 * s); q.fill();
          q.fillStyle = 'rgba(255,255,255,0.07)'; q.fillRect(x2 + 2, yy + 1, ww - 4, 1.3);
          q.fillStyle = 'rgba(0,0,10,0.18)'; q.fillRect(x2 + 2, yy + bh - 2.6, ww - 4, 1.4);
        }
        xx += bw;
      }
    }
    // depth: the wall darkens towards the sea bed
    const dg = q.createLinearGradient(0, top, 0, y1);
    dg.addColorStop(0, 'rgba(4,3,12,0)'); dg.addColorStop(1, 'rgba(4,3,12,0.55)');
    q.fillStyle = dg; q.fillRect(L.qx, top, x1 - L.qx, y1 - top);
    // moonlit edge of the face
    q.fillStyle = rgba(mix(pal.glow, '#ffffff', 0.3), 0.32); q.fillRect(L.qx, top, 1.6 * s, y1 - top);
    // weed and moss along the waterline
    q.fillStyle = rgba(mix(C.kelp, '#a8e6a0', 0.25), 0.55);
    q.beginPath(); q.moveTo(L.qx, L.wy - 6 * s);
    for (let xx = L.qx; xx <= x1; xx += 5 * s) q.lineTo(xx, L.wy - 5 * s + Math.sin(xx * 0.45) * 2 * s);
    q.lineTo(x1, L.wy + 7 * s); q.lineTo(L.qx, L.wy + 7 * s); q.closePath(); q.fill();
    for (let i = 0; i < 6; i++) { const xx = L.qx + 2 + R() * 12 * s; q.strokeStyle = rgba(mix(C.kelp, '#a8e6a0', 0.3), 0.5); q.lineWidth = 1.4 * s; q.beginPath(); q.moveTo(xx, L.wy); q.quadraticCurveTo(xx - 3 * s, L.wy + 8 * s, xx - 1 * s, L.wy + (10 + R() * 12) * s); q.stroke(); }
    // an iron mooring ring set in the wall
    q.strokeStyle = mix(C.iron, '#9aa4c8', 0.3); q.lineWidth = 2.2 * s;
    q.beginPath(); q.arc(L.qx + 16 * s, L.deck + 20 * s, 5 * s, 0, TAU); q.stroke();
    // deck slab
    const dk = q.createLinearGradient(0, L.deck - 3 * s, 0, L.deck + 8 * s);
    dk.addColorStop(0, mix(C.stone, '#f2ecff', 0.42)); dk.addColorStop(1, mix(C.stone, '#0a0812', 0.25));
    q.fillStyle = dk; rr(q, L.qx - 5 * s, L.deck - 3 * s, x1 - L.qx + 5 * s, 10 * s, 2 * s); q.fill();
    q.strokeStyle = 'rgba(255,255,255,0.26)'; q.lineWidth = 1; q.beginPath(); q.moveTo(L.qx - 4 * s, L.deck - 2.4 * s); q.lineTo(x1, L.deck - 2.4 * s); q.stroke();
    quay = { c, x: x0, y: y0, w: W, h: H };
  }
  function rr(q, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    q.beginPath(); q.moveTo(x + r, y); q.arcTo(x + w, y, x + w, y + h, r); q.arcTo(x + w, y + h, x, y + h, r); q.arcTo(x, y + h, x, y, r); q.arcTo(x, y, x + w, y, r); q.closePath();
  }

  // ------------------------------------------------------------- state --
  let wanted = 0, rot = 0, shown = 0, assistTo = null, drag = null, lastT = null, rotAtDown = 0;
  let cap = TAU, atCap = false, capHinted = false, prompting = false;
  let lastTick = 0, lastHap = 0, loopsDone = 0;
  let rush = 0, spin = 0, strain = 0, grab = 0, coilGlow = 0, waitAt = -9, backAt = -9, inSpeed = 0, accA = 0, frameDt = 1 / 60;
  let agit = agit0, T = 0.9, relax = 0, relaxV = 0;
  let fxs = 0, fv = 0, bob = 0, bobV = 0, fy = 0, tilt = 0;
  let th = -0.3 * agit0, om = 0, ax = 0, ay = 0, aRot = 0, touching = false;
  let cool = 0, cooled = false, restAt = -1, rested = false, doneFlag = false, finAt = -1, twistAt = -1;
  let now = 0, prog = 0, calmNow = 0, near = 0, lineSag = 4, finK = 0, scrapeAt = -9, chimeAt = -1;
  const tracker = new AngleTracker();
  const wob = new Wobble();
  // bubbles + flat surface ripples (own small pools: no per-frame allocation)
  const BN = 30, bx = new Float32Array(BN), by = new Float32Array(BN), br = new Float32Array(BN), bl = new Float32Array(BN), bvx = new Float32Array(BN);
  let bn = 0;
  const RN = 8, rpx = new Float32Array(RN), rpr = new Float32Array(RN), rpa = new Float32Array(RN);
  let rn = 0, rippleAt = 0;
  // twist props
  const fish = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * TAU + rand() * 0.5, r: 0.8 + rand() * 0.4, d: rand() * 0.6, sp: 0.55 + rand() * 0.3 }));
  const TE = [0, 0];

  const floatX = (p) => lerp(L.fx0, L.zx, clamp(p));
  fit();
  E.onResize(fit);
  fxs = floatX(0);

  // ---------------------------------------------------------- physics --
  function surf(x, t) {
    const open = smooth(invLerp(L.qx, L.qx - L.w * 0.6, x));       // sheltered by the wall, open towards the left
    const A = L.s * (0.9 + agit * (reduced ? 4.5 : 8.5) * open);
    const sp = reduced ? 0.5 : 1;
    return L.wy + A * (Math.sin(x * 0.034 - t * 1.2 * sp + V.ph1) * 0.62 + Math.sin(x * 0.083 + t * 1.85 * sp + V.ph2) * 0.26 + Math.sin(x * 0.012 - t * 0.55 * sp + V.ph3) * 0.4);
  }
  function bedY(x) {
    // a flat mooring shelf by the wall, sloping away into deeper water on the left
    const k = smooth(invLerp(L.zx - L.zw * 0.45, L.zx - L.zw * 0.45 - L.w * 0.22, x));
    const toWall = smooth(invLerp(L.zx + L.zw, L.qx, x));
    return lerp(L.zsY, L.deepY, k) - toWall * 4 * L.s + Math.sin(x * 0.05 + 1.3) * 2.2 * k;
  }
  const crankAngle = () => V.crank0 + shown + wob.v * 0.05 + strain * 0.1;
  const nextCap = () => (Math.floor(rot / TAU + 0.02) + 1) * TAU;

  function addBubble(x, y, r) {
    if (lowStim && bn > 10) return;
    const i = bn < BN ? bn++ : (Math.random() * BN) | 0;
    bx[i] = x; by[i] = y; br[i] = r; bl[i] = 0; bvx[i] = (Math.random() - 0.5) * 8;
  }
  function addRipple(x, a = 0.5) { const i = rn < RN ? rn++ : 0; rpx[i] = x; rpr[i] = 4 * L.s; rpa[i] = a; }

  function onLoop(k) {
    coilGlow = 1;
    E.sound('pluck', { note: 2 + ((k - 1 + round) % 6), intensity: 0.5 });
    E.haptic('soft');
    E.checkpoint('step');
    if (!quiet) E.particles.burst(L.rx, L.ry, 6, { speed: 40, colour: C.lamp, life: 0.9, size: 5 });
  }
  function onFlagSettle(f) {
    f.kick = 1;
    if (f.ph >= 0) {
      photos.dust(f.ph, f.x, lineY(f.u, now) + f.tie + f.h * 0.5, f.size, quiet ? 6 : 12, { shape: 'card', up: 18, speed: 18, life: 1.3 });
      E.checkpoint('photo', f.ph);
      E.sound('glass', { note: 3 + (f.i % 5), intensity: 0.34 });
    } else E.sound('bubble', { note: 2 + (f.i % 5), intensity: 0.22 });
  }
  function notYet() {
    if (now - waitAt < 0.6) return;
    waitAt = now; wob.kick(0.7);
    E.checkpoint('wait');
    E.sound('click', { intensity: 0.16, pitch: 0.7 });
  }

  function applyWind(dA) {
    // hand speed is smoothed per frame (touch events within one frame share a timestamp)
    const speed = Math.max(inSpeed, (accA + dA) / Math.max(1 / 60, frameDt));
    accA += dA;
    const k = lerp(1, 0.45, invLerp(MAX_SPIN, MAX_SPIN * 2.4, speed));   // rushing: the heavy drum lags the hand
    rush = lerp(rush, invLerp(MAX_SPIN, MAX_SPIN * 2.2, speed), 0.2);
    spin = lerp(spin, clamp(speed / 6), 0.3);
    const before = wanted;
    wanted = Math.min(wanted + dA * k, rot + BANK, cap, TOTAL);
    if (drag != null && wanted >= Math.min(cap, TOTAL) - 1e-3) {
      if (!atCap) { atCap = true; if (cap < TOTAL) E.sound('thrum', { intensity: 0.25 }); }
      if (wanted <= before + 1e-5) {
        strain = Math.min(1, strain + dA * 2.2);
        if (strain > 0.35 && !capHinted && cap < TOTAL) { capHinted = true; prompting = true; E.hint('One loop wound. Let go of the crank, then wind again.'); }
      }
    }
  }

  // ------------------------------------------------------------ frame --
  function frame(dt, t) {
    now = t;
    const s = L.s;
    if (dt > 0) { inSpeed = lerp(inSpeed, accA / Math.max(dt, 1 / 120), 1 - Math.exp(-dt * 10)); frameDt = lerp(frameDt, dt, 0.2); }
    accA = 0;
    // ---- input → law gate → real state
    if (assistTo != null) {
      const step = Math.min(assistTo - wanted, dt * ASSIST_SPEED);
      if (step > 0) wanted = Math.min(TOTAL, wanted + step);
      spin = lerp(spin, 0.45, 1 - Math.exp(-dt * 6));
      if (assistTo - wanted < 1e-3) assistTo = null;
    }
    const p = E.gate(wanted / TOTAL);
    rot = p * TOTAL;
    if (wanted > rot + BANK) wanted = rot + BANK;
    const lp = Math.floor(rot / TAU + 1e-4);
    if (lp > loopsDone) { loopsDone = lp; onLoop(lp); }
    if (rot - lastTick >= TAU / 12) { lastTick = rot; E.sound('rotate-tick', { pitch: lerp(1.15, 0.85, rot / TOTAL), intensity: 0.26 }); }
    if (rot - lastHap >= TAU / 2) { lastHap = rot; E.haptic('tick'); }
    shown = lerp(shown, rot, 1 - Math.exp(-dt * 12));
    prog = clamp(shown / TOTAL);
    if (drag == null) { rush = Math.max(0, rush - dt * 1.5); if (assistTo == null) spin = Math.max(0, spin - dt * 2.5); strain = Math.max(0, strain - dt * 3); }
    else strain = Math.max(0, strain - dt * 0.8);
    grab = lerp(grab, drag != null || assistTo != null ? 1 : 0, 1 - Math.exp(-dt * 10));
    coilGlow = Math.max(0, coilGlow - dt * 0.9);
    wob.update(dt);

    // ---- win: the anchor comes to rest in the mooring zone after the last loop is released
    if (!doneFlag && rot >= TOTAL - 1e-3 && drag == null && assistTo == null) {
      if (restAt < 0) restAt = t;
      if (!rested && t - restAt > 0.3) { rested = true; E.sound('drop-in', { intensity: 0.38 }); E.haptic('soft'); if (!quiet) E.particles.burst(ax, L.zsY, 8, { speed: 26, colour: mix(C.sand, '#ffffff', 0.5), life: 1.1, size: 6, dir: -Math.PI / 2, spread: 2.4 }); }
      if (t - restAt > 0.75) doneFlag = true;
    } else if (!doneFlag && drag != null) restAt = -1;

    // ---- the harbour calms as the float comes in; tension eases (never snaps)
    near = smooth(invLerp(0.55, 1, prog));
    calmNow = Math.max(calm0 * 0.6, smooth(prog));
    const agitT = finAt >= 0 ? 0.02 : agit0 * (1 - 0.86 * smooth(prog)) + rush * 0.12;
    agit = lerp(agit, agitT, 1 - Math.exp(-dt * 1.1));
    const Tt = clamp(lerp(0.95, 0.2, ease.inOutSine(prog)) * (0.7 + 0.3 * (agit / Math.max(0.05, agit0))) + spin * 0.14 + (atCap && drag != null ? 0.1 : 0) + strain * 0.1);
    T += (Tt - T) * (1 - Math.exp(-dt * (Tt < T ? 1.5 : 4)));
    relaxV += (-relax * 40 - relaxV * 5) * dt; relax += relaxV * dt;
    lineSag = lerp(lineSag, (lerp(4, 14, smooth(prog)) + (1 - calmNow) * Math.sin(t * 1.3) * 2) * s, 1 - Math.exp(-dt * 2));
    finK = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    if (chimeAt > 0 && t >= chimeAt) { chimeAt = -1; E.sound('chime', { intensity: 0.28 }); }

    // ---- the float: pulled in by the tether, riding the swell
    const surge = Math.sin(t * 0.8 + V.ph1) * agit * 5 * s;
    fv += ((floatX(prog) + surge - fxs) * 26 - fv * 6.5) * dt;
    fxs += fv * dt;
    bobV += (-bob * 60 - bobV * 6) * dt; bob += bobV * dt;
    fy = surf(fxs, t) - L.Rf * 0.4 + bob;
    tilt = Math.atan2(surf(fxs + 8, t) - surf(fxs - 8, t), 16) * 0.85 + fv * 0.003;
    if (!cooled && prog >= 0.86) {
      cooled = true;
      E.sound('chime', { intensity: 0.32 });
      if (hero >= 0) { photos.dust(hero, fxs, fy, L.Rf * 1.7, quiet ? 6 : 14, { shape: 'circle', up: 26, speed: 22 }); E.checkpoint('photo', hero); }
      else E.react('sigh');
    }
    if (cooled) cool = Math.min(1, cool + dt / 1.3);
    if (t - rippleAt > lerp(2.4, 1.1, agit) && !quiet) { rippleAt = t; addRipple(fxs, 0.22 + agit * 0.3); }

    // ---- the anchor: a damped pendulum on its chain, trailing seawards in the current
    const fbx = fxs - Math.sin(tilt) * L.Rf * 0.95, fby = fy + Math.cos(tilt) * L.Rf * 0.95;
    const thEq = -agit * 0.42 + Math.sin(t * 0.7 + V.ph2) * agit * 0.12;
    const w0 = 2.5;
    om += (-w0 * w0 * (th - thEq) - om * (1.4 + (rested ? 6 : 0) + (touching ? 4 : 0)) - fv * 0.012) * dt;
    th += om * dt;
    if (rested) th = lerp(th, 0, 1 - Math.exp(-dt * 3));
    ax = fbx + Math.sin(th) * L.Lc; ay = fby + Math.cos(th) * L.Lc;
    const bed = bedY(ax), wasTouching = touching;
    touching = ay + L.aH * 0.92 > bed;
    if (touching) {
      ay = bed - L.aH * 0.92 + (rested ? Math.min(3, (t - restAt) * 6) * s : 0);
      if (!wasTouching && t - scrapeAt > 0.8) { scrapeAt = t; if (!quiet) for (let i = 0; i < 3; i++) addBubble(ax + (Math.random() - 0.5) * 16, bed - 4, 1.5 + Math.random() * 2); }
    }
    aRot = th * 0.6;
    if (!quiet && Math.abs(om) > 0.35 && Math.random() < dt * 6) addBubble(ax + (Math.random() - 0.5) * 8, ay + L.aH * 0.4, 1.5 + Math.random() * 2.5);
    if (!quiet && agit > 0.3 && Math.random() < dt * agit * 3) addBubble(fxs + (Math.random() - 0.5) * L.Rf, fby + 4, 1.2 + Math.random() * 2);
    if (!quiet && agit > 0.45 && Math.random() < dt * agit * 5) E.particles.emit({ x: fxs - L.Rf * (0.6 + Math.random() * 0.5), y: surf(fxs - L.Rf, t) - 2, vx: -10 - Math.random() * 18, vy: -16 - Math.random() * 18, gravity: 60, life: 0.7, size: 2.2, colour: '#eafcff', drag: 0.97, kind: 'dot' });

    // ---- flags: whip in the wind, then settle one by one from the shore outwards
    for (const f of flags) {
      if (!f.settled && (prog >= f.thr || finAt >= 0)) { f.settled = true; onFlagSettle(f); }
      if (f.settled) f.settle = Math.min(1, f.settle + dt / 1.4);
      const wind = agit * (0.7 + 0.3 * Math.sin(t * 1.3 + f.ph0)) * (1 - f.settle * 0.85);
      const breeze = quiet ? 0 : Math.sin(t * 0.7 + f.ph0) * 0.035 * f.settle * (1 - finK) + Math.sin(t * 1.1 - f.u * 1.5) * 0.07 * finK;   // a calm flag still breathes; at the end they breathe together
      const target = wind * (reduced ? 0.25 : 0.5) * (f.tie ? 0.8 : 1) + f.kick * 0.2 * Math.sin(t * 5) + breeze;
      f.va += ((target - f.a) * (f.tie ? 9 : 16) - f.va * 3.4) * dt + (quiet ? 0 : (Math.random() - 0.5) * wind * 6 * dt);
      f.a += f.va * dt;
      f.kick = Math.max(0, f.kick - dt * 0.8);
    }

    // ---- bubbles + ripples + surface samples
    for (let i = 0; i < bn; i++) {
      bl[i] += dt; by[i] -= (18 + br[i] * 5) * s * dt; bx[i] += (bvx[i] + Math.sin(bl[i] * 5 + i) * 6) * dt;
      if (by[i] < surf(bx[i], t) + 2 || bl[i] > 6) { bn--; bx[i] = bx[bn]; by[i] = by[bn]; br[i] = br[bn]; bl[i] = bl[bn]; bvx[i] = bvx[bn]; i--; }
    }
    for (let i = 0; i < rn; i++) {
      rpr[i] += 26 * s * dt; rpa[i] -= dt * 0.32;
      if (rpa[i] <= 0) { rn--; rpx[i] = rpx[rn]; rpr[i] = rpr[rn]; rpa[i] = rpa[rn]; i--; }
    }
    for (let i = 0; i < NS; i++) { const xx = L.x - 14 + (i / (NS - 1)) * (L.w + 28); SX[i] = xx; SY[i] = surf(xx, t); }

    // ---------------------------------------------------------- draw --
    drawSky(t);
    g.drawImage(quay.c, quay.x, quay.y, quay.w, quay.h);
    drawLamp(t);
    drawHarbourLine(t);
    waterPath(gWater);
    drawWaterLight(t);
    drawSeabed(t);
    drawZone(t);
    drawKelp(t);
    drawFish(t);
    drawChainAndAnchor(t);
    drawBoat(t);
    drawFloat(t);
    waterPath(gVeil);
    drawUnderLight(t);
    drawBubbles();
    drawSurface(t);
    drawPlinth(t);
    drawReel(t);
    drawFinale(dt, t);
  }

  // ---------------------------------------------------------- drawing --
  function waterPath(fill) {
    g.beginPath(); g.moveTo(SX[0], SY[0]);
    for (let i = 1; i < NS; i++) g.lineTo(SX[i], SY[i]);
    g.lineTo(SX[NS - 1], L.y + L.h + 12); g.lineTo(SX[0], L.y + L.h + 12); g.closePath();
    g.fillStyle = fill; g.fill();
  }
  function drawSky(t) {
    const s = L.s;
    glow(g, L.mx, L.my, 96 * s, skyGlow, 0.13 + 0.06 * calmNow + 0.06 * finK);
    glow(g, L.mx, L.my, 30 * s, '#ffffff', 0.09 + 0.05 * calmNow);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gHaze;
    g.fillRect(L.x - 14, L.wy - 50 * s, L.w + 28, 52 * s); g.restore();
    void t;
  }
  function drawWaterLight(t) {
    // moonlight held inside the water, and the warm lamp pooling by the wall
    const s = L.s;
    glow(g, L.mx, L.wy + 30 * s, 120 * s, mix(skyGlow, '#ffffff', 0.2), 0.12 + 0.06 * calmNow);
    glow(g, L.qx - 20 * s, L.wy + 18 * s, 70 * s, C.lamp, 0.07 + 0.08 * calmNow + 0.08 * finK);
    void t;
  }
  function drawLamp(t) {
    const s = L.s, x = L.lx0, y0 = L.ly0;
    g.strokeStyle = mix(C.iron, '#000000', 0.2); g.lineWidth = 3.4 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, L.deck - 2 * s); g.lineTo(x, y0 + 8 * s); g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.18); g.lineWidth = 1; g.beginPath(); g.moveTo(x - 1, L.deck - 2 * s); g.lineTo(x - 1, y0 + 8 * s); g.stroke();
    const lw = 9 * s, lh = 12 * s, ly = y0 + 9 * s;
    g.fillStyle = mix(C.iron, '#000000', 0.3); roundRect(g, x - lw / 2 - 1, ly - 2 * s, lw + 2, 3 * s, 1.5 * s); g.fill();
    g.fillStyle = rgba(C.lamp, 0.85 + 0.15 * calmNow); roundRect(g, x - lw / 2, ly, lw, lh, 3 * s); g.fill();
    const flick = quiet ? 0 : 0.04 * Math.sin(t * 7.3) * (1 - calmNow);
    glow(g, x, ly + lh / 2, 36 * s, C.lamp, 0.38 + 0.2 * calmNow + flick + 0.15 * finK);
  }
  function lineY(u, t) {
    const base = lerp(L.ly0, L.ly1, u);
    const jig = quiet ? 0 : Math.sin(u * 7 + t * 2.4) * agit * 2.4 * L.s * Math.sin(u * Math.PI);
    return base + lineSag * 4 * u * (1 - u) + jig;
  }
  function lineSlope(u) { return ((L.ly1 - L.ly0) + lineSag * 4 * (1 - 2 * u)) / ((L.lx1 - L.lx0) || -1); }
  function drawHarbourLine(t) {
    const s = L.s;
    g.strokeStyle = rgba('#efe4cf', 0.55); g.lineWidth = 1.2 * s;
    g.beginPath();
    for (let i = 0; i <= 28; i++) { const u = i / 28, x = lerp(L.lx0, L.lx1, u), y = lineY(u, t); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    // fairy lights along the line warm up as the harbour calms
    for (let i = 0; i < 9; i++) {
      const u = ((i + 0.5) / 9) * 0.92, x = lerp(L.lx0, L.lx1, u), y = lineY(u, t);
      const tw = quiet ? 1 : 0.8 + 0.2 * Math.sin(t * 1.6 + i * 1.7);
      glow(g, x, y + 1.5 * s, 8 * s, C.lamp, (0.2 + 0.45 * calmNow + 0.2 * finK) * tw);
    }
    for (const f of flags) if (f.tie) drawFlag(f, t);
    for (const f of flags) if (!f.tie) drawFlag(f, t);
  }
  function drawFlag(f, t) {
    const s = L.s;
    const y = lineY(f.u, t), sl = clamp(lineSlope(f.u), -0.6, 0.6);
    const wind = agit * (1 - f.settle * 0.9);
    const flap = quiet ? 0 : Math.sin(t * lerp(3, 10, wind) + f.ph0 + f.u * 6) * 0.2 * wind + f.kick * 0.06 * Math.sin(t * 9);
    g.save(); g.translate(f.x, y + 1.5 * s); g.rotate(f.a);
    if (f.tie) {
      g.strokeStyle = rgba('#efe4cf', 0.5); g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, f.tie); g.stroke();
      g.translate(0, f.tie);
    }
    const sk = (f.tie ? 0 : sl * (1 - Math.min(0.8, Math.abs(f.a)))) + flap;
    if (f.ph >= 0) {
      const tm = 0.62 * (1 - f.settle) * (1 - calm0 * 0.6);
      if (f.settle > 0 && f.settle < 1) glow(g, 0, f.h * 0.5, f.size * 0.95, C.lamp, 0.55 * Math.sin(f.settle * Math.PI));
      photos.draw(g, f.ph, 0, f.h * 0.5, f.size, { shape: 'card', skewY: sk, tone: 'storm', toneMix: tm, glow: 0.18 + 0.32 * f.settle + 0.2 * finK, glowColour: f.settle > 0.5 ? C.lamp : '#9fb4ff', shadow: false });
    } else {
      const w = f.w, h = f.h;
      const c = mix(f.col, '#8090c8', 0.35 * (1 - f.settle));
      if (f.settle > 0 && f.settle < 1) glow(g, 0, h * 0.4, w * 1.2, c, 0.45 * Math.sin(f.settle * Math.PI));
      const gr = g.createLinearGradient(-w / 2, 0, w / 2, h);
      gr.addColorStop(0, mix(c, '#ffffff', 0.3)); gr.addColorStop(0.6, c); gr.addColorStop(1, mix(c, '#140c28', 0.4));
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(-w / 2, -sk * w / 2); g.lineTo(w / 2, sk * w / 2); g.lineTo(flap * h * 0.4, h); g.closePath(); g.fill();
      g.strokeStyle = rgba('#ffffff', 0.3); g.lineWidth = 1; g.stroke();
      glow(g, 0, h * 0.32, w * 0.6, c, 0.12 + 0.22 * f.settle + 0.15 * finK);
    }
    // two little clips at the top
    g.fillStyle = rgba('#f2e6cf', 0.9);
    const cw = f.w * 0.42;
    g.beginPath(); g.arc(-cw, -sk * cw - 0.5, 1.6 * s, 0, TAU); g.arc(cw, sk * cw - 0.5, 1.6 * s, 0, TAU); g.fill();
    g.restore();
  }
  function drawSeabed(t) {
    const s = L.s, x0 = L.x - 14, x1 = L.qx + 2, bot = L.y + L.h + 12;
    // a dim rocky outcrop far out, for depth
    const xr = L.x + L.w * 0.34;
    g.fillStyle = rgba(mix(C.waterDeep, C.waterMid, 0.35), 0.75);
    g.beginPath(); g.moveTo(x0, bot);
    for (let x = x0; x <= xr; x += 9) g.lineTo(x, L.deepY - (24 + 18 * Math.sin(x * 0.021 + 1) + 10 * Math.sin(x * 0.057 + 4)) * s * smooth(invLerp(xr, x0 + 30, x)));
    g.lineTo(xr, bot); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x0, bot);
    for (let x = x0; x <= x1; x += 8) g.lineTo(x, bedY(x));
    g.lineTo(x1, bedY(x1)); g.lineTo(x1, bot); g.closePath();
    g.fillStyle = gSand; g.fill();
    // a lit rim along the sand, wind-ripples and pebbles
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(mix(C.sand, '#ffffff', 0.5), 0.3); g.lineWidth = 1.4 * s;
    g.beginPath(); for (let x = x0; x <= x1; x += 8) { const yy = bedY(x) + 0.5; x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke();
    g.restore();
    g.strokeStyle = rgba(mix(C.sand, '#05040c', 0.4), 0.35); g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 7; i++) { const x = lerp(x0 + 20, x1 - 20, (i + 0.5) / 7), yy = bedY(x) + (7 + (i % 3) * 5) * s; g.moveTo(x - 9 * s, yy); g.quadraticCurveTo(x, yy - 3 * s, x + 9 * s, yy); }
    g.stroke();
    g.fillStyle = rgba(mix(C.sand, '#05040c', 0.55), 0.6);
    for (const pb of pebbles) { const x = lerp(x0 + 10, x1 - 8, pb.f); if (Math.abs(x - L.zx) < L.zw * 1.15) continue; const r = pb.r * s; g.beginPath(); g.ellipse(x, bedY(x) + r * 0.3, r, r * pb.sq, 0, 0, TAU); g.fill(); }
    // slow caustic light drifting over the sand
    if (!lowStim) for (let i = 0; i < 5; i++) {
      const x = x0 + ((i * 0.23 + t * 0.012 * (1 + i * 0.3)) % 1) * (x1 - x0);
      glow(g, x, bedY(x) + 3 * s, (18 + i * 4) * s, pal.glow, 0.09 * (0.6 + 0.4 * Math.sin(t * 0.9 + i)));
    }
  }
  function drawZone(t) {
    const s = L.s, x = L.zx, y = L.zsY + 1.5 * s;
    const breathe = quiet ? 1 : 0.9 + 0.1 * Math.sin(t * 1.1);
    const zA = (0.45 + 0.35 * near + (rested ? 0.3 : 0) + 0.25 * finK) * breathe;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(zA);
    g.fillStyle = gColumn; g.beginPath();
    g.moveTo(x - L.zw * 0.9, L.wy); g.lineTo(x + L.zw * 0.9, L.wy); g.lineTo(x + L.zw * 1.05, y); g.lineTo(x - L.zw * 1.05, y); g.closePath(); g.fill();
    g.globalAlpha = 1;
    glow(g, x, y, L.zw * 1.6, C.calm, 0.26 * zA);
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = rgba(C.calm, ZONE_A[i] * zA); g.lineWidth = ZONE_W[i] * s;
      g.beginPath(); g.ellipse(x, y, L.zw, L.zw * 0.24, 0, 0, TAU); g.stroke();
    }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.6; glow(g, x + Math.cos(a) * L.zw, y + Math.sin(a) * L.zw * 0.24, 5 * s, '#ffffff', 0.4 * zA); }
    g.restore();
  }
  function drawKelp(t) {
    const s = L.s;
    const amp = (quiet ? 0.4 : 1) * (0.35 + agit * 0.9);
    for (let i = 0; i < kelp.length; i++) {
      const k = kelp[i], x0 = k.x, y0 = bedY(x0) + 3 * s;
      for (let j = 0; j <= 8; j++) { const u = j / 8; KX[j] = x0 + Math.sin(t * k.sp + k.ph + u * 2.2) * (1 + 12 * u * u) * amp * s + u * k.lean * s; KY[j] = y0 - u * k.hh; }
      g.beginPath(); g.moveTo(KX[0] - 3.4 * s, KY[0]);
      for (let j = 1; j <= 8; j++) g.lineTo(KX[j] - lerp(3.4, 0.5, j / 8) * s, KY[j]);
      for (let j = 8; j >= 0; j--) g.lineTo(KX[j] + lerp(3.4, 0.5, j / 8) * s, KY[j]);
      g.closePath(); g.fillStyle = rgba(C.kelp, 0.72); g.fill();
      // two leaf blades
      for (let b = 0; b < 2; b++) {
        const jj = b ? 5 : 3, side = b ? 1 : -1;
        const lx = KX[jj], ly = KY[jj], la = side * (0.9 + Math.sin(t * k.sp + k.ph + jj) * 0.25 * amp);
        g.save(); g.translate(lx, ly); g.rotate(la);
        g.fillStyle = rgba(mix(C.kelp, '#c8ffd8', 0.15), 0.6); g.beginPath(); g.ellipse(0, -7 * s, 2.4 * s, 7.5 * s, 0, 0, TAU); g.fill();
        g.restore();
      }
      g.strokeStyle = rgba(mix(C.kelp, '#e0ffe8', 0.45), 0.35); g.lineWidth = 1;
      g.beginPath(); g.moveTo(KX[0] - 1.2 * s, KY[0]); for (let j = 1; j <= 8; j++) g.lineTo(KX[j] - 1.2 * s * (1 - j / 8), KY[j]); g.stroke();
      glow(g, KX[8], KY[8], 8 * s, mix(C.kelp, '#e8fff0', 0.55), 0.32 + 0.15 * Math.sin(t * 0.8 + k.ph));
    }
  }
  function drawChainAndAnchor(t) {
    const s = L.s;
    const fbx = fxs - Math.sin(tilt) * L.Rf * 0.95, fby = fy + Math.cos(tilt) * L.Rf * 0.95;
    const dx = ax - fbx, dy = ay - fby, d = Math.hypot(dx, dy) || 1;
    const slack = Math.max(0, L.Lc - d) * 0.9 + (touching ? 2 * s : 0);
    const nl = Math.max(6, Math.round(d / (5.2 * s)));
    g.lineCap = 'round';
    g.strokeStyle = rgba(mix(C.iron, '#a8b2d8', 0.45), 0.9); g.lineWidth = 1.7 * s;
    const ang = Math.atan2(dy, dx) + Math.PI / 2;
    for (let i = 0; i <= nl; i++) {
      const u = i / nl, bow = slack * Math.sin(u * Math.PI);
      const x = fbx + dx * u + (-dy / d) * bow * 0.6, y = fby + dy * u + (dx / d) * bow * 0.6 + bow * 0.4;
      g.beginPath();
      if (i % 2) g.ellipse(x, y, 1.7 * s, 2.9 * s, ang, 0, TAU); else { g.moveTo(x - (dx / d) * 2.2 * s, y - (dy / d) * 2.2 * s); g.lineTo(x + (dx / d) * 2.2 * s, y + (dy / d) * 2.2 * s); }
      g.stroke();
    }
    drawAnchor(ax, ay, aRot, L.aH);
    void t;
  }
  function anchorPath() {
    g.beginPath();
    g.moveTo(0, 12); g.lineTo(0, 86);                                // shank
    g.moveTo(-22, 22); g.lineTo(22, 22);                             // stock
    g.moveTo(-36, 56); g.quadraticCurveTo(-30, 92, 0, 92); g.quadraticCurveTo(30, 92, 36, 56);   // arms
  }
  function drawAnchor(x, y, a, H) {
    const k = H / 100;
    g.save(); g.translate(x, y); g.rotate(a); g.scale(k, k);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const body = mix(C.iron, C.waterMid, 0.1), edge = mix(C.calm, '#ffffff', 0.25);
    g.save(); g.globalCompositeOperation = 'lighter'; anchorPath(); g.strokeStyle = rgba(C.calm, 0.14 + 0.16 * near + 0.1 * finK); g.lineWidth = 24; g.stroke(); g.restore();
    anchorPath(); g.strokeStyle = body; g.lineWidth = 11; g.stroke();
    anchorPath(); g.strokeStyle = rgba(edge, 0.5); g.lineWidth = 2.4; g.stroke();
    g.fillStyle = body;
    for (const sgn of [-1, 1]) {
      g.beginPath(); g.moveTo(sgn * 36, 38); g.lineTo(sgn * 48, 65); g.lineTo(sgn * 29, 61); g.closePath(); g.fill();
      g.strokeStyle = rgba(edge, 0.45); g.lineWidth = 2; g.stroke();
    }
    g.beginPath(); g.arc(0, 4, 8, 0, TAU); g.strokeStyle = body; g.lineWidth = 6.5; g.stroke();
    g.strokeStyle = rgba(edge, 0.55); g.lineWidth = 1.8; g.stroke();
    // the cable wound round the shank — a cable-wound anchor
    for (let j = 0; j < 3; j++) {
      g.strokeStyle = CABLE_C[j]; g.lineWidth = CABLE_W[j];
      g.beginPath(); for (let i = 0; i < 4; i++) { const yy = 33 + i * 9.5; g.moveTo(-7.5, yy + 4); g.lineTo(7.5, yy - 2.5); } g.stroke();
    }
    g.restore();
  }
  function drawFloat(t) {
    const s = L.s, x = fxs, y = fy, r = L.Rf;
    glow(g, x, L.wy + r * 0.5, r * 2.3, hero >= 0 ? photos.colour(hero) : C.lamp, 0.12 + 0.1 * calmNow + 0.15 * finK);
    g.save(); g.translate(x, y); g.rotate(tilt);
    const gb = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    gb.addColorStop(0, rgba('#eafcff', 0.14)); gb.addColorStop(0.72, rgba(C.calm, 0.18)); gb.addColorStop(1, rgba(mix(C.calm, '#ffffff', 0.4), 0.6));
    g.fillStyle = gb; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    const warmth = 0.25 * calmNow + 0.6 * finK;
    if (hero >= 0) {
      const tm = 0.66 * (1 - cool) * (1 - 0.4 * smooth(prog)) * (1 - calm0 * 0.6);
      photos.draw(g, hero, 0, 0, r * 1.78, { shape: 'circle', tone: 'storm', toneMix: tm, glow: 0.2 + warmth * 0.5, glowColour: finK > 0 ? C.lamp : C.calm, shadow: false });
      if (warmth > 0.05) glow(g, 0, 0, r * 0.9, C.lamp, warmth * 0.3);
    } else {
      glow(g, 0, 0, r * 1.2, C.lamp, 0.45 + 0.3 * calmNow + 0.3 * finK);
      orb(g, 0, r * 0.05, r * 0.32, mix(C.lamp, '#fff6e0', 0.45));
      glint(g, 0, 0, r * 0.55, '#fff6e0', 0.35 + 0.3 * calmNow, t * 0.3);
    }
    // rope net cradling the lower half (keeps the photo's upper part clear)
    g.strokeStyle = rgba(rope.dark, 0.62); g.lineWidth = 1.5 * s;
    g.beginPath(); g.ellipse(0, r * 0.2, r * 0.98, r * 0.2, 0, 0, Math.PI); g.stroke();
    g.beginPath(); for (const sx of [-0.64, -0.22, 0.22, 0.64]) { g.moveTo(sx * r, r * 0.33); g.quadraticCurveTo(sx * r * 0.7, r * 0.84, 0, r * 0.98); } g.stroke();
    g.strokeStyle = rgba(rope.hi, 0.25); g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, r * 0.19, r * 0.98, r * 0.2, 0, 0, Math.PI); g.stroke();
    // glass rim + specular light
    g.strokeStyle = rgba('#e8fbff', 0.6); g.lineWidth = 1.7 * s; g.beginPath(); g.arc(0, 0, r - 0.8, 0, TAU); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,255,255,0.34)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.48, r * 0.32, r * 0.14, -0.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(r * 0.44, r * 0.36, r * 0.14, r * 0.06, -0.6, 0, TAU); g.fill();
    g.restore();
    // brass collar + tether ring (towards the reel)
    g.fillStyle = '#c9974a'; roundRect(g, -r * 0.24, r * 0.86, r * 0.48, r * 0.2, r * 0.08); g.fill();
    g.strokeStyle = '#e8c27a'; g.lineWidth = 1.8 * s; g.beginPath(); g.arc(r * 0.98, r * 0.14, 3.4 * s, 0, TAU); g.stroke();
    g.restore();
  }
  function tetherEnd() {
    const r = L.Rf, c = Math.cos(tilt), sn = Math.sin(tilt), lx = r * 0.98, ly = r * 0.14;
    TE[0] = fxs + lx * c - ly * sn; TE[1] = fy + lx * sn + ly * c;
    return TE;
  }
  function drawUnderLight(t) {
    const s = L.s;
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gShaft;
    g.globalAlpha = 0.6 + 0.4 * calmNow;
    for (const sh of shafts) {
      const xt = L.x + sh.f * (L.qx - L.x) + Math.sin(t * 0.22 + sh.ph) * 10 * s, wt = sh.w * s, slant = 26 * s;
      g.beginPath(); g.moveTo(xt - wt / 2, L.wy); g.lineTo(xt + wt / 2, L.wy); g.lineTo(xt + wt * 0.9 + slant, L.wy + L.shaftH); g.lineTo(xt - wt * 0.9 + slant, L.wy + L.shaftH); g.closePath(); g.fill();
    }
    g.restore();
    if (!lowStim) motes(g, L.x, L.wy + 10 * s, L.qx - L.x, L.zsY - L.wy, t * 0.6, mix(pal.glow, '#ffffff', 0.4), { n: reduced ? 8 : 16, alpha: 0.4, seed: 23 + round, size: 1.4 * s });
  }
  function drawBubbles() {
    if (!bn) return;
    g.save(); g.lineWidth = 1;
    for (let i = 0; i < bn; i++) {
      const a = clamp(bl[i] * 3) * 0.55, r = br[i] * L.s;
      g.strokeStyle = rgba('#e8fbff', a); g.beginPath(); g.arc(bx[i], by[i], r, 0, TAU); g.stroke();
      g.fillStyle = rgba('#ffffff', a * 0.8); g.beginPath(); g.arc(bx[i] - r * 0.35, by[i] - r * 0.35, r * 0.3, 0, TAU); g.fill();
    }
    g.restore();
  }
  function drawSurface(t) {
    const s = L.s;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(SX[0], SY[0]); for (let i = 1; i < NS; i++) g.lineTo(SX[i], SY[i]);
    g.strokeStyle = rgba(pal.glow, 0.14); g.lineWidth = 7 * s; g.stroke();
    g.strokeStyle = rgba(mix(pal.glow, '#ffffff', 0.55), 0.6); g.lineWidth = 1.5 * s; g.stroke();
    // moonlight glitter
    const spread = 70 * s;
    g.lineWidth = 1.2 * s;
    for (let i = 0; i < 16; i++) {
      const x = L.mx + (glitter[i] - 0.5) * spread * 2;
      if (x > L.qx - 4) continue;
      const yy = surf(x, t) + 3 * s + glitter[i + 16] * 26 * s;
      const a = (0.25 + 0.35 * calmNow) * (0.5 + 0.5 * Math.sin(t * (1.2 + glitter[i + 32]) + i * 1.7)) * (1 - Math.abs(glitter[i] - 0.5));
      const len = (4 + glitter[i + 32] * 8) * s;
      g.strokeStyle = rgba('#ffffff', a); g.beginPath(); g.moveTo(x - len, yy); g.lineTo(x + len, yy); g.stroke();
    }
    // twist: a soft moon path towards the float
    if (twistAt >= 0 && V.twist === 2) {
      const k = smooth(clamp((t - twistAt) / 2.2));
      for (let i = 0; i < 9; i++) {
        const u = i / 8, x = lerp(L.mx, fxs, u), yy = surf(x, t) + 2 * s;
        glow(g, x, yy, (10 + 8 * Math.sin(u * Math.PI)) * s, mix(pal.glow, '#fff2c8', 0.6), 0.34 * k);
      }
    }
    // the mooring ring on the surface
    const zA = 0.3 + 0.4 * near + 0.2 * finK;
    g.strokeStyle = rgba(C.calm, zA * 0.75); g.lineWidth = 1.5 * s; g.setLineDash([4 * s, 5 * s]); g.lineDashOffset = -t * 6 * s;
    g.beginPath(); g.ellipse(L.zx, L.wy + 2 * s, L.Rf * 1.45, L.Rf * 0.28, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < rn; i++) { g.strokeStyle = rgba(mix(pal.glow, '#ffffff', 0.4), rpa[i]); g.lineWidth = 1.2 * s; g.beginPath(); g.ellipse(rpx[i], surf(rpx[i], t) + 1, rpr[i], rpr[i] * 0.2, 0, 0, TAU); g.stroke(); }
    // waterline across the float (sells it as floating)
    const r = L.Rf, wl = surf(fxs, t);
    g.strokeStyle = rgba(mix(C.calm, '#ffffff', 0.5), 0.55); g.lineWidth = 1.6 * s;
    g.beginPath(); g.ellipse(fxs, wl + 1, r * 0.93, r * 0.12, tilt * 0.5, 0, Math.PI); g.stroke();
    g.restore();
  }
  function drawPlinth(t) {
    const s = L.s, x = L.rx - L.pw / 2, y0 = L.plinthTop, h = L.deck - y0 + 2 * s;
    glow(g, L.rx, L.deck - 4 * s, L.pw * 0.75, C.lamp, 0.1 + 0.1 * calmNow);
    // iron A-frame holding the axle (behind the spool)
    g.strokeStyle = mix(C.iron, '#000000', 0.15); g.lineWidth = L.RF * 0.15; g.lineCap = 'round';
    g.beginPath(); g.moveTo(L.rx - L.RF * 0.18, L.ry); g.lineTo(L.rx - L.RF * 0.8, y0 + 3); g.moveTo(L.rx + L.RF * 0.18, L.ry); g.lineTo(L.rx + L.RF * 0.8, y0 + 3); g.stroke();
    g.fillStyle = 'rgba(0,0,10,0.22)'; roundRect(g, x - 2 * s, y0 + 3 * s, L.pw + 4 * s, h + 2 * s, 7 * s); g.fill();   // soft contact shadow
    g.fillStyle = gPlinth; roundRect(g, x, y0, L.pw, h, 5 * s); g.fill();
    g.fillStyle = 'rgba(255,230,190,0.08)'; g.fillRect(x + 3 * s, y0 + 2 * s, L.pw - 6 * s, 1.5 * s);
    g.fillStyle = gPlateRim; g.fillRect(x, y0 + 4 * s, L.pw, 2.2 * s); g.fillRect(x, L.deck - 6 * s, L.pw, 2.2 * s);
    // the plate
    const px = L.rx - L.plateW / 2, py = L.plateY;
    g.fillStyle = gPlate; roundRect(g, px, py, L.plateW, L.plateH, 7 * s); g.fill();
    g.strokeStyle = gPlateRim; g.lineWidth = 2.4 * s; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 1; roundRect(g, px + 3.5 * s, py + 3.5 * s, L.plateW - 7 * s, L.plateH - 7 * s, 4.5 * s); g.stroke();
    g.fillStyle = '#e2b868';
    for (let i = 0; i < 4; i++) { const cx = i % 2 ? px + L.plateW - 6 * s : px + 6 * s, cy = i < 2 ? py + 6 * s : py + L.plateH - 6 * s; g.beginPath(); g.arc(cx, cy, 1.7 * s, 0, TAU); g.fill(); }
    if (E.phase !== 'law') {
      glow(g, L.rx, py + L.plateH / 2, L.plateW * 0.46, C.lamp, 0.08 + 0.2 * calmNow + 0.15 * finK);
      words.draw(g, L.rx, py + L.plateH / 2, { style: 'etched', size: L.fsz, maxWidth: L.plateW - 18 * s, lines: L.lines, colour: mix('#ecd4aa', '#fff4dc', calmNow), glowColour: C.lamp });
    }
    // guide roller on its bracket
    g.strokeStyle = mix(C.iron, '#000000', 0.1); g.lineWidth = 3 * s;
    g.beginPath(); g.moveTo(x + 2 * s, y0 + 10 * s); g.lineTo(L.px, L.py); g.stroke();
    const rr2 = L.rp, spinA = (shown * (L.RH + L.tc * (BASE + 1))) / rr2;
    orb(g, L.px, L.py, rr2, '#c9974a');
    g.strokeStyle = 'rgba(40,24,10,0.7)'; g.lineWidth = 1;
    g.beginPath(); for (let i = 0; i < 3; i++) { const a = spinA + (i / 3) * TAU; g.moveTo(L.px, L.py); g.lineTo(L.px + Math.cos(a) * rr2 * 0.8, L.py + Math.sin(a) * rr2 * 0.8); } g.stroke();
    void t;
  }

  // the reel ----------------------------------------------------------
  function coilPath(Uw, A0) {
    const steps = Math.max(10, Math.ceil(Uw * 32));
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = Uw * (1 - i / steps);
      const a = A0 + (Uw - u) * TAU, r = L.RH + L.tc * (u + 0.5);
      const x = L.rx + Math.cos(a) * r, y = L.ry + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
  }
  function tangentAngle(r, qx2, qy2) {
    const dx = qx2 - L.rx, dy = qy2 - L.ry, d = Math.max(r + 0.5, Math.hypot(dx, dy));
    return Math.atan2(dy, dx) + Math.acos(r / d);
  }
  function drawReel(t) {
    const s = L.s, { rx, ry, RF, RH } = L;
    const Uw = BASE + shown / TAU;
    const ro = RH + L.tc * (Uw + 0.5);
    const A0 = tangentAngle(ro, L.px, L.py - L.rp);
    const Tx = rx + Math.cos(A0) * ro, Ty = ry + Math.sin(A0) * ro;
    // rear flange (mahogany) + drum core
    g.fillStyle = gReelShadow; g.beginPath(); g.arc(rx, ry + 6 * s, RF * 1.18, 0, TAU); g.fill();
    g.fillStyle = gRear; g.beginPath(); g.arc(rx, ry, RF, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,214,170,0.06)'; g.lineWidth = 1;
    g.beginPath(); for (const k of [0.5, 0.64, 0.78]) { g.moveTo(rx + RF * k, ry); g.arc(rx, ry, RF * k, 0, TAU); } g.stroke();
    g.fillStyle = '#120a08'; g.beginPath(); g.arc(rx, ry, RH + L.tc * 0.4, 0, TAU); g.fill();
    // the rope coils: a spiral that visibly thickens with every loop
    const lw = L.tc * 1.08;
    const ropeCol = mix(rope.base, C.storm, 0.22 * T * (1 - calmNow * 0.5));
    g.lineCap = 'round'; g.lineJoin = 'round';
    coilPath(Uw, A0);
    g.strokeStyle = rope.dark; g.lineWidth = lw + 1.5 * s; g.stroke();
    g.strokeStyle = ropeCol; g.lineWidth = lw; g.stroke();
    g.setLineDash([2.2 * s, 3 * s]); g.lineDashOffset = -shown * ro;
    g.strokeStyle = rgba(rope.dark, 0.45); g.lineWidth = lw * 0.85; g.stroke(); g.setLineDash([]);
    g.strokeStyle = rgba(rope.hi, 0.42); g.lineWidth = Math.max(0.8, lw * 0.28); g.stroke();
    glow(g, rx + RF * 0.45, ry - RF * 0.5, RF * 0.85, C.lamp, 0.14 + 0.1 * calmNow);
    if (coilGlow > 0) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rgba(C.lamp, 0.6 * coilGlow); g.lineWidth = lw * 1.7;
      g.beginPath(); g.arc(rx, ry, ro - L.tc * 0.5, 0, TAU); g.stroke(); g.restore();
    }
    // the free tether: drum → guide roller → float, sagging softly as tension eases
    drawTether(t, Tx, Ty, ro);
    // front flange: brass rim, ratchet teeth, three slim spokes (all turn with the drum)
    g.strokeStyle = gBrass; g.lineWidth = RF * 0.12; g.beginPath(); g.arc(rx, ry, RF * 0.94, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,244,214,0.5)'; g.lineWidth = 1; g.beginPath(); g.arc(rx, ry, RF * 0.885, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(40,24,8,0.75)'; g.lineWidth = 1.4 * s;
    g.beginPath();
    for (let i = 0; i < 24; i++) { const a = shown + V.spoke0 + (i / 24) * TAU; g.moveTo(rx + Math.cos(a) * RF * 0.91, ry + Math.sin(a) * RF * 0.91); g.lineTo(rx + Math.cos(a) * RF * 0.985, ry + Math.sin(a) * RF * 0.985); }
    g.stroke();
    for (let k = 0; k < 3; k++) {
      const a = shown + V.spoke0 + (k / 3) * TAU, c = Math.cos(a), sn = Math.sin(a);
      g.beginPath(); g.moveTo(rx + c * RH * 0.5, ry + sn * RH * 0.5); g.lineTo(rx + c * RF * 0.89, ry + sn * RF * 0.89);
      g.strokeStyle = 'rgba(30,16,6,0.55)'; g.lineWidth = 4 * s; g.stroke();
      g.strokeStyle = '#c08a40'; g.lineWidth = 2.6 * s; g.stroke();
      g.strokeStyle = 'rgba(255,236,190,0.6)'; g.lineWidth = 0.9 * s; g.stroke();
    }
    // the pawl, clicking over the teeth
    const tooth = (((shown + V.spoke0) * 24) / TAU) % 1, lift = (1 - tooth) * 2.2 * s;
    const pa = -Math.PI / 2 + 0.75, ppx = rx + Math.cos(pa) * RF * 1.12, ppy = ry + Math.sin(pa) * RF * 1.12;
    g.strokeStyle = '#d9a95a'; g.lineWidth = 3 * s;
    g.beginPath(); g.moveTo(ppx, ppy); g.lineTo(rx + Math.cos(pa - 0.32) * (RF * 0.97 + lift), ry + Math.sin(pa - 0.32) * (RF * 0.97 + lift)); g.stroke();
    orb(g, ppx, ppy, 2.6 * s, '#e8c27a');
    // glass sheen over the reel face + the rim's moonlit edge
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = gSheen; g.beginPath(); g.arc(rx, ry, RF * 0.9, 0, TAU); g.fill();
    g.strokeStyle = rgba(mix(pal.glow, '#ffffff', 0.4), 0.45); g.lineWidth = 1.4 * s;
    g.beginPath(); g.arc(rx, ry, RF * 0.995, Math.PI * 0.85, Math.PI * 1.35); g.stroke();
    g.restore();
    orb(g, rx, ry, RH * 0.62, '#d7a453');
    // the crank arm + wooden knob
    const ak = crankAngle(), kx = rx + Math.cos(ak) * L.CA, ky = ry + Math.sin(ak) * L.CA;
    g.beginPath(); g.moveTo(rx, ry); g.lineTo(kx, ky);
    g.strokeStyle = 'rgba(20,10,4,0.55)'; g.lineWidth = 7.5 * s; g.stroke();
    g.strokeStyle = '#d4a052'; g.lineWidth = 5.6 * s; g.stroke();
    g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 1.4 * s; g.beginPath(); g.moveTo(rx, ry - 1); g.lineTo(kx, ky - 1); g.stroke();
    orb(g, rx, ry, 5 * s, '#f0d090');
    if (atCap && drag != null && cap < TOTAL) {
      // one loop is wound: a soft ring breathes out of the knob — "let go now"
      const k = (t * 0.9) % 1;
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rgba(C.calm, 0.55 * (1 - k)); g.lineWidth = 2 * s;
      g.beginPath(); g.arc(kx, ky, L.KR * (1.2 + k * 1.6), 0, TAU); g.stroke(); g.restore();
    }
    const idle = quiet ? 0 : (1 - grab) * 0.5 * (0.5 + 0.5 * Math.sin(t * 2.2)) * (1 - prog);
    glow(g, kx, ky, L.KR * (2.4 + grab * 0.6), grab > 0.5 ? pal.glow : C.lamp, 0.24 + 0.4 * grab + 0.25 * idle + strain * 0.2);
    const kr = L.KR * (1 + grab * 0.08);
    g.fillStyle = 'rgba(0,0,8,0.32)'; g.beginPath(); g.arc(kx + 0.5 * s, ky + 2.2 * s, kr * 1.08, 0, TAU); g.fill();
    orb(g, kx, ky, kr, '#9a6234', { light: '#ffe6c0' });
    g.strokeStyle = 'rgba(255,230,190,0.35)'; g.lineWidth = 1; g.beginPath(); g.arc(kx, ky, kr * 0.62, 0, TAU); g.stroke();
  }
  function drawTether(t, Tx, Ty, ro) {
    const s = L.s;
    const B = tetherEnd(), Bx = B[0], By = B[1];
    let k = 0;
    RX[k] = Tx; RY[k++] = Ty;                                   // off the coil …
    RX[k] = L.px; RY[k++] = L.py - L.rp;                        // … over the guide roller …
    RX[k] = L.px - L.rp * 0.72; RY[k++] = L.py - L.rp * 0.7;
    const Sx = L.px - L.rp, Sy = L.py;
    // … and the free span, sagging under its chord (down, towards the wall) as tension eases
    const dx = Bx - Sx, dy = By - Sy, len = Math.hypot(dx, dy) || 1;
    let nx = dy / len, ny = -dx / len; if (ny < 0) { nx = -nx; ny = -ny; }
    const sag = lerp(0.6 * s, len * 0.085, Math.pow(1 - T, 1.2)) + relax * 6 * s;
    const thr = quiet ? 0 : T * T * agit * 1.5 * s;
    for (let i = 0; i < NR; i++) {
      const u = i / (NR - 1), bow = sag * 4 * u * (1 - u) + thr * Math.sin(u * Math.PI * 3) * Math.sin(t * 29 + u * 3);
      RX[k] = Sx + dx * u + nx * bow; RY[k++] = Sy + dy * u + ny * bow;
    }
    nRope = k;
    const path = () => { g.beginPath(); g.moveTo(RX[0], RY[0]); for (let i = 1; i < nRope; i++) g.lineTo(RX[i], RY[i]); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    const tg = T * T * (0.35 + agit * 0.65) * (1 - finK);
    if (tg > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; path(); g.strokeStyle = rgba(C.storm, 0.2 * tg); g.lineWidth = 13 * s; g.stroke(); g.strokeStyle = rgba(mix(C.storm, '#ffffff', 0.3), 0.3 * tg); g.lineWidth = 5.5 * s; g.stroke(); g.restore(); }
    if (finK > 0) { g.save(); g.globalCompositeOperation = 'lighter'; path(); g.strokeStyle = rgba(C.lamp, 0.16 * finK); g.lineWidth = 8 * s; g.stroke(); g.restore(); }
    path(); g.strokeStyle = rope.dark; g.lineWidth = 5 * s; g.stroke();
    g.strokeStyle = mix(rope.base, C.storm, 0.28 * T * (1 - calmNow * 0.5)); g.lineWidth = 3.6 * s; g.stroke();
    g.setLineDash([2.2 * s, 3 * s]); g.lineDashOffset = shown * ro;
    g.strokeStyle = rgba(rope.dark, 0.48); g.lineWidth = 3 * s; g.stroke(); g.setLineDash([]);
    g.strokeStyle = rgba(rope.hi, 0.5); g.lineWidth = 1 * s; g.stroke();
  }

  // twist + finale ------------------------------------------------------
  function drawFish(t) {
    if (twistAt < 0 || V.twist !== 0) return;
    // a little shoal of glowing fish circles the mooring bed, then drifts away
    const k = t - twistAt, appear = smooth(clamp(k / 1.2)), leave = smooth(clamp((k - 7) / 3));
    if (leave >= 1) return;
    const s = L.s, cx = L.zx, cy = L.zsY - 24 * s;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const f of fish) {
      const a = f.a + k * f.sp * (reduced ? 0.5 : 1);
      const x = cx + Math.cos(a) * 56 * s * f.r - leave * 160 * s, y = cy + Math.sin(a) * 15 * s * f.r - f.d * 10 * s;
      const dir = -Math.sin(a) >= 0 ? 1 : -1, al = appear * (1 - leave);
      glow(g, x, y, 11 * s, C.calm, 0.55 * al);
      g.fillStyle = rgba(mix(C.calm, '#ffffff', 0.45), 0.8 * al);
      g.beginPath(); g.ellipse(x, y, 5 * s, 2.1 * s, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(x - dir * 4 * s, y); g.lineTo(x - dir * 8 * s, y - 2.8 * s); g.lineTo(x - dir * 8 * s, y + 2.8 * s); g.closePath(); g.fill();
    }
    g.restore();
  }
  function drawBoat(t) {
    if (twistAt < 0 || V.twist !== 1) return;
    // a tiny paper boat drifts in on the calming water and rests beside the float
    const s = L.s, k = ease.inOutSine(clamp((t - twistAt) / 6));
    const target = Math.max(L.x + 14 * s, Math.min(fxs, L.zx) - L.Rf * 2.1);
    const x = lerp(L.x - 10 * s, target, k), y = surf(x, t) - 3 * s, a = Math.atan2(surf(x + 6, t) - surf(x - 6, t), 12);
    glow(g, x, y - 5 * s, 16 * s, C.lamp, 0.35 * k);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#f4efe2'; g.beginPath(); g.moveTo(-12 * s, -2 * s); g.lineTo(12 * s, -2 * s); g.lineTo(7.5 * s, 4.5 * s); g.lineTo(-7.5 * s, 4.5 * s); g.closePath(); g.fill();
    g.fillStyle = '#e2dccb'; g.beginPath(); g.moveTo(-6 * s, -2 * s); g.lineTo(0, -13 * s); g.lineTo(6 * s, -2 * s); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,70,110,0.35)'; g.lineWidth = 1; g.stroke();
    glow(g, 0, -6 * s, 5 * s, C.lamp, 0.6 * k);
    g.restore();
  }
  function drawFinale(dt, t) {
    if (finAt < 0) return;
    const s = L.s, k = t - finAt;
    // slow rings of calm light spreading round the moored float (never a flash)
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const kk = clamp((k - i * 1.3) / 2.8);
      if (kk <= 0 || kk >= 1) continue;
      const r = L.Rf * (1.2 + kk * 3.2);
      g.strokeStyle = rgba(C.calm, 0.35 * (1 - kk)); g.lineWidth = 1.6 * s;
      g.beginPath(); g.ellipse(fxs, L.wy + 2 * s, r, r * 0.22, 0, 0, TAU); g.stroke();
    }
    g.restore();
    if (!quiet && Math.random() < dt * (heavy ? 3 : 7)) {
      E.particles.emit({ x: fxs + (Math.random() - 0.5) * L.Rf * 1.4, y: fy - L.Rf * 0.4, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 14, life: 2.2, size: heavy ? 5 : 4, colour: C.lamp, drag: 0.98, kind: heavy ? 'glow' : 'glint' });
    }
  }

  // ------------------------------------------------------------ input --
  const onReel = (p) => Math.hypot(p.x - L.rx, p.y - L.ry) < L.CA + L.KR + 30 * L.s;
  return {
    get progress() { return clamp(rot / TOTAL); },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      const home = rot >= TOTAL - 1e-3;
      if (home && onReel(p)) { wob.kick(0.3); E.sound('click', { intensity: 0.2, pitch: 1.2 }); E.haptic('light'); return; }   // wound home: the pawl holds it
      if (drag == null && onReel(p)) {
        drag = p.id; lastT = null;
        tracker.cx = L.rx; tracker.cy = L.ry; tracker.start(p.x, p.y);
        rotAtDown = rot; atCap = false; strain = 0;
        cap = nextCap();
        E.sound('click', { intensity: 0.4 }); E.haptic('light');
        if (prompting) { prompting = false; E.hint(meta.howTo); }
        return;
      }
      // other touches still answer: the float bobs, the water rings, a flag flutters
      if (Math.hypot(p.x - fxs, p.y - fy) < L.Rf + 26) {
        bobV += 70 * L.s; addRipple(fxs, 0.5); addBubble(fxs, fy + L.Rf, 2.5);
        E.sound('bubble', { note: 4 + Math.floor(Math.random() * 4), intensity: 0.3 }); E.haptic('light');
      } else if (p.x < L.qx && p.y > surf(p.x, now) - 6) {
        addRipple(p.x, 0.45); if (p.y > L.wy + 8) addBubble(p.x, p.y, 2.2);
        E.sound('drip', { note: Math.floor(Math.random() * 6), intensity: 0.25 }); E.haptic('light');
      } else {
        for (const f of flags) {
          const fy0 = lineY(f.u, now) + f.tie;
          if (Math.abs(p.x - f.x) < f.w * 0.6 + 10 && p.y < fy0 + f.h + 14 && p.y > fy0 - 18) { f.va += 3; E.sound('paper', { intensity: 0.2 }); E.haptic('light'); break; }
        }
      }
    },
    move(p) {
      if (p.id !== drag) return;
      const dt = lastT == null ? 1 / 60 : Math.max(1 / 240, p.t - lastT); lastT = p.t;
      const d = Math.hypot(p.x - L.rx, p.y - L.ry);
      if (d < L.RF * 0.2) { tracker.start(p.x, p.y); return; }     // too near the axle to read a turn
      const dA = tracker.feed(p.x, p.y, dt);
      if (dA > 0) applyWind(dA);
      else if (dA < -0.03 && now - backAt > 0.35) { backAt = now; wob.kick(-0.4); E.sound('click', { intensity: 0.12, pitch: 0.8 }); }   // the pawl holds
      if (E.locked && wanted >= rot + BANK * 0.85) notYet();
    },
    up(p) {
      if (p.id !== drag) return;
      drag = null; tracker.end(); lastT = null;
      const wound = rot - rotAtDown;
      if (wound > 0.08) {
        // letting go of the crank: the tether eases a notch, softly
        relaxV += 1.6; E.sound('settle', { intensity: 0.2 + 0.18 * clamp(wound / TAU) }); E.haptic('soft');
        addRipple(fxs, 0.35);
      }
      atCap = false; strain = 0;
    },
    assist() {
      if (finAt >= 0 || rot >= TOTAL - 1e-3) return;
      assistTo = Math.min(TOTAL, Math.max(wanted, rot) + TAU / 2);
      if (prompting) { prompting = false; E.hint(meta.howTo); }
    },
    pointAt(p) { return { x: floatX(p), y: L.wy }; },
    hint() {
      if (rot >= TOTAL - 1e-3) return null;     // wound home: the anchor is settling
      const a0 = crankAngle();
      const span = clamp(nextCap() - rot + 0.45, 1.1, TAU + 0.45);   // round to the loop's stop (the pawl takes the overshoot)
      const pts = [];
      for (let i = 0; i <= 24; i++) { const a = a0 + (i / 24) * span; pts.push([L.rx + Math.cos(a) * L.CA, L.ry + Math.sin(a) * L.CA]); }
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      if (V.twist === 0 && !quiet) for (let i = 0; i < 6; i++) addBubble(L.zx + (Math.random() - 0.5) * L.zw, L.zsY - 6, 1.5 + Math.random() * 2);
      E.sound('bubble', { note: 7, intensity: 0.25 });
    },
    finish() {
      finAt = E.now();
      for (const f of flags) if (!f.settled) { f.settled = true; f.kick = 0.6; }
      if (!cooled) { cooled = true; if (hero >= 0) E.checkpoint('photo', hero); }
      chimeAt = finAt + 0.7;
    },
    destroy() { if (quay) { try { quay.c.width = quay.c.height = 0; } catch { /* ignore */ } } },
  };
}
