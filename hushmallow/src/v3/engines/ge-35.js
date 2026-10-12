// GE-35 · METEOR ORCHARD — a descending miniature meteor (path guidance).
// A little meteor hangs smouldering above a floating night orchard, ready to
// fall. Drag a gravity trail beneath it: it rides exactly the line you draw,
// its tail shortens and its ember crust cools as it glides. Lay the trail all
// the way to the soil pad and it touches down softly instead of crashing.
// Win: the meteor rests in the soil as a gentle glowing seed.
//
// Photos: one photo is the meteor's core (a circle) cooling from ember tone
// back to its own colours, landing as the seed (a drop). The others orbit the
// core as warm stones; as the meteor cools each one detaches and floats off to
// hang as glowing fruit in the orchard trees. Words: the garden tag tied to
// the soil pad.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, shadow, roundRect, wrap, FONT } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-35',
  howTo: 'Drag a gravity trail beneath the meteor down to the soil pad.',
  steps: [
    'Touch just below the little meteor.',
    'Drag a gravity trail down along the glide dots — it rides your line and cools.',
    'Bring it all the way to the soil pad so it lands as a glowing seed.',
  ],
  tapAlt: 'each press lays one more stretch of gravity trail for the meteor to ride',
  words: 'Your words are written on the garden tag tied to the soil pad, where the meteor lands as a seed.',
  photos: {
    where: 'Your photos travel with the meteor — one is its glowing core, the others circle it.',
    becomes: 'warm meteor stones that turn into orchard fruit',
    touch: 'You guide them down the gravity trail you draw;',
    change: 'they cool in flight back to their own colours, and the outer ones float off to hang softly in the orchard trees.',
    payoff: 'The core lands in the soil as a gentle glowing seed and sprouts.',
  },
  finaleSec: 4,
};

const N = 72;                 // trail samples along the glide route
const BANK = 0.13;            // how far the trail may run ahead of the meteor
const STEP = 1 / 8;           // one "Tap instead" press
const HOT = '#fff0cf', EMBER = '#ff7a2a', RED = '#d8400e', CRUST = '#2c1008';
const AHEAD = [[0, 0.1], [5, 0.28], [1.8, 0.9]];
const RING = [[7, 0.12], [2.6, 0.38], [1.1, 0.9]];
const DASH_A = [1.5, 11], DASH_B = [1, 7], NO_DASH = [];
const BLOBS = [[0, 0.05, 0.86], [-0.6, 0.22, 0.62], [0.6, 0.24, 0.64], [-0.3, -0.42, 0.6], [0.32, -0.4, 0.62]];

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const R = () => E.rand();
  const reduced = E.reduced, low = reduced || E.lowStim, heavy = E.heavy;
  const calm0 = E.calm, r1 = E.round === 1;
  const amb = (heavy ? 0.72 : 1) * (1 - calm0 * 0.35);       // ambient tempo
  const ink = pal.ink || '#0b0a24';

  // ---- per-round variety (loop rounds rearrange and recolour)
  const side = r1 ? -1 : R() < 0.5 ? -1 : 1;                   // -1: the meteor starts on the left
  const startU = r1 ? 0.27 : 0.2 + R() * 0.14;
  const bend = r1 ? 1 : 0.8 + R() * 0.4;
  const coolCol = r1 ? pal.glow : [pal.glow, pal.accent, mix(pal.glow, '#ffffff', 0.35)][Math.floor(R() * 3)];
  const coolSoft = mix(coolCol, '#ffffff', 0.45);
  const seedCol = mix(pal.warm || '#ffb37a', '#fff0c4', 0.3 + (r1 ? 0 : R() * 0.3));
  const leafCol = mix(pal.glow, '#b8ffcf', 0.45);
  const crownDark = mix('#163630', ink, 0.45), crownMid = mix('#2e6a55', ink, 0.2);
  const crownLit = mix('#8fd9a8', leafCol, 0.3);
  const trunkDark = mix('#2a1a14', ink, 0.35), trunkLit = mix('#6a4a38', leafCol, 0.15);
  const soilDark = mix('#26150d', ink, 0.3), soilMid = mix('#5a3a24', pal.deep || ink, 0.22);
  const stoneMid = mix('#4a4560', ink, 0.3), stoneDark = mix('#1c1a2c', ink, 0.4);
  const blossomCol = mix(pal.accent, '#ffffff', 0.55);
  const twistKind = E.round % 2;                                // alternate the surprise between rounds
  const swayPh = R() * TAU;

  // ---- photos: one hero core, the rest ride as orbiting stones (≥ 3 riders)
  const n = photos.n;
  const hero = n ? (E.round - 1) % n : -1;
  const others = [];
  for (let j = 0; j < n; j++) if (j !== hero) others.push(j);
  if (!r1) for (let j = others.length - 1; j > 0; j--) { const k = Math.floor(R() * (j + 1)); const q = others[j]; others[j] = others[k]; others[k] = q; }
  const K = Math.max(3, others.length);
  const SLOTS = 8;
  const order = [2, 5, 1, 6, 3, 4, 0, 7];
  if (!r1) for (let j = order.length - 1; j > 0; j--) { const k = Math.floor(R() * (j + 1)); const q = order[j]; order[j] = order[k]; order[k] = q; }
  const chips = Array.from({ length: K }, (_, j) => ({
    ph: j < others.length ? others[j] : -1, a0: (j / K) * TAU + (r1 ? -0.4 : R() * TAU), thr: 0.14 + 0.62 * ((j + 0.5) / K),
    st: 0, k: 0, x: 0, y: 0, x0: 0, y0: 0, cool: 0, slot: order[j % SLOTS], init: false,
  }));
  const slotChip = new Int8Array(SLOTS).fill(-1);
  chips.forEach((c, j) => { slotChip[c.slot] = j; });

  // ---- orchard
  const trees = [0.13, 0.31, 0.69, 0.87].map((u, i) => ({
    u, sc: i === 1 || i === 2 ? 0.88 : 1, x: 0, y: 0, cr: 0, th: 0, ph: R() * TAU, kick: 0, kv: 0, rot: 0,
    blobs: BLOBS.map((b) => ({ x: b[0] + (R() - 0.5) * 0.12, y: b[1] + (R() - 0.5) * 0.1, r: b[2] * (0.92 + R() * 0.16) })),
    bloom: Array.from({ length: 6 }, () => ({ x: (R() - 0.5) * 1.5, y: (R() - 0.5) * 1.1 - 0.1, d: R() * 0.6 })),
    gTrunk: null, gCrown: null,
  }));
  const slots = Array.from({ length: SLOTS }, (_, i) => ({ t: i >> 1, ax: 0, ay: 0, len: 0, ang: (R() - 0.5) * 0.2, av: 0 }));
  const flies = Array.from({ length: low ? 7 : 14 }, () => ({ u: R(), v: R(), a: R() * TAU, s: 0.4 + R() * 0.6 }));
  const rimF = Array.from({ length: 12 }, (_, i) => { const half = i < 6; const k = (i % 6) / 5; return { a: half ? lerp(0.1, 0.36, k) * Math.PI : lerp(0.64, 0.9, k) * Math.PI, r: 0.9 + R() * 0.08, ph: R() * TAU }; });
  const roots = Array.from({ length: 6 }, (_, i) => ({ u: -0.55 + (i / 5) * 1.1 + (R() - 0.5) * 0.08, l: 0.25 + R() * 0.3, ph: R() * TAU }));
  const cracks = Array.from({ length: 6 }, () => {
    const pts = new Float32Array(8); let a = R() * TAU, rr = 0.12 + R() * 0.3;
    for (let q = 0; q < 4; q++) { pts[q * 2] = Math.cos(a) * rr; pts[q * 2 + 1] = Math.sin(a) * rr; a += (R() - 0.5) * 0.9; rr = Math.min(0.94, rr + 0.18 + R() * 0.16); }
    return pts;
  });
  const JAG = 26, jag = new Float32Array(JAG), jc = new Float32Array(JAG), js = new Float32Array(JAG), jx = new Float32Array(JAG), jy = new Float32Array(JAG);
  for (let i = 0; i < JAG; i++) { const a = (i / JAG) * TAU; jag[i] = R(); jc[i] = Math.cos(a); js[i] = Math.sin(a); }
  const flecks = Array.from({ length: 7 }, (_, i) => ({ d: 0.2 + (i / 7) * 0.75, w: (R() - 0.5) * 0.8, ph: R() * TAU }));

  // ---- geometry
  let W, H, X0, Y0, cx, gY, isl, iry, depth, padX, padY, padRx, padRy, mz, cz, fz, orbR, TOL, maxDev, routeLen = 1;
  let gTop, gFace, gPad, gTag, gCrust;
  let tagW = 140, tagH = 40, tagX = 0, tagY = 0, pegX = 0, pegY = 0, wordSize = 13, tokenSeen = null;
  const rx = new Float32Array(N), ry = new Float32Array(N), nx = new Float32Array(N), ny = new Float32Array(N), on = new Float32Array(N);

  function fit() {
    W = stage.w; H = stage.h; X0 = stage.x; Y0 = stage.y; cx = stage.cx;
    mz = clamp(Math.min(W * 0.22, H * 0.18), 40, 90);
    cz = clamp(Math.min(W * 0.125, H * 0.1), 22, 50);
    fz = clamp(Math.min(W * 0.125, H * 0.1), 24, 50);
    orbR = mz * 0.5 + cz * 0.62;
    TOL = Math.max(50, 60 * stage.s);
    maxDev = TOL * 0.75;
    gY = Y0 + H * 0.66;
    isl = Math.min(W * 0.49, 240);
    iry = Math.min(isl * 0.16, H * 0.06);
    depth = Math.min(H * 0.2, 98);
    padX = cx; padRx = Math.min(W * 0.17, 66); padRy = Math.max(6, Math.min(padRx * 0.3, iry * 0.62)); padY = gY + iry * 0.18;
    // trees on the back rim of the island
    const cr0 = clamp(Math.min(W * 0.097, H * 0.08), 16, 40);
    trees.forEach((tr) => {
      tr.cr = cr0 * tr.sc; tr.th = tr.cr * 1.7;
      tr.x = clamp(X0 + W * tr.u, X0 + tr.cr * 1.4, X0 + W - tr.cr * 1.4);
      const dx = clamp((tr.x - cx) / isl, -1, 1);
      tr.y = gY - iry * 0.62 * Math.sqrt(1 - dx * dx);
      const w0 = tr.cr * 0.17, ccy = -tr.th - tr.cr * 0.55;
      tr.gTrunk = g.createLinearGradient(-w0, 0, w0, 0);
      tr.gTrunk.addColorStop(0, trunkLit); tr.gTrunk.addColorStop(0.45, trunkDark); tr.gTrunk.addColorStop(1, mix(trunkDark, '#000000', 0.4));
      tr.gCrown = g.createRadialGradient(-tr.cr * 0.4, ccy - tr.cr * 0.5, tr.cr * 0.1, 0, ccy, tr.cr * 1.5);
      tr.gCrown.addColorStop(0, crownLit); tr.gCrown.addColorStop(0.42, crownMid); tr.gCrown.addColorStop(1, crownDark);
    });
    slots.forEach((sl, i) => {
      const tr = trees[sl.t], b = i & 1;
      sl.ax = (b ? 0.5 : -0.48) * tr.cr; sl.ay = -tr.th - tr.cr * 0.55 + tr.cr * 0.42;
      sl.len = tr.cr * (0.3 + 0.16 * ((sl.t + b) % 2)) + fz * 0.5;
    });
    // glide route: a gentle S from the meteor down onto the pad, resampled by arc length
    const sy = Y0 + clamp(H * 0.15, orbR + cz * 0.5 + 6, H * 0.32);
    const m0 = orbR + cz * 0.5 + 4;
    const sx = side < 0 ? X0 + Math.max(W * startU, m0) : X0 + W - Math.max(W * startU, m0);
    const dir = -side, ex = padX, ey = padY - mz * 0.18, dy = ey - sy;
    const bx = clamp(sx + dir * W * 0.34 * bend, X0 + W * 0.1, X0 + W * 0.9), by = sy + dy * 0.32;
    const qx = clamp(ex - dir * W * 0.3 * bend, X0 + W * 0.1, X0 + W * 0.9), qy = sy + dy * 0.52;
    const M = 160, px = new Float32Array(M + 1), py = new Float32Array(M + 1), cl = new Float32Array(M + 1);
    for (let i = 0; i <= M; i++) {
      const t = i / M, u = 1 - t;
      px[i] = u * u * u * sx + 3 * u * u * t * bx + 3 * u * t * t * qx + t * t * t * ex;
      py[i] = u * u * u * sy + 3 * u * u * t * by + 3 * u * t * t * qy + t * t * t * ey;
      if (i) cl[i] = cl[i - 1] + Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]);
    }
    routeLen = Math.max(1, cl[M]);
    let j = 0;
    for (let k = 0; k < N; k++) {
      const L = (k / (N - 1)) * routeLen;
      while (j < M - 1 && cl[j + 1] < L) j++;
      const f = clamp((L - cl[j]) / Math.max(1e-6, cl[j + 1] - cl[j]));
      rx[k] = lerp(px[j], px[j + 1], f); ry[k] = lerp(py[j], py[j + 1], f);
    }
    for (let k = 0; k < N; k++) {
      const a = Math.max(0, k - 1), b = Math.min(N - 1, k + 1), tx = rx[b] - rx[a], ty = ry[b] - ry[a], l = Math.hypot(tx, ty) || 1;
      nx[k] = -ty / l; ny[k] = tx / l;
    }
    // cached static gradients
    gTop = g.createLinearGradient(0, gY - iry, 0, gY + iry);
    gTop.addColorStop(0, mix(crownDark, leafCol, 0.2)); gTop.addColorStop(1, mix(crownDark, '#000000', 0.2));
    gFace = g.createLinearGradient(0, gY, 0, gY + iry + depth);
    gFace.addColorStop(0, soilMid); gFace.addColorStop(0.38, soilDark); gFace.addColorStop(1, rgba(soilDark, 0));
    gPad = g.createRadialGradient(padX, padY - padRy * 0.4, 0, padX, padY, padRx);
    gPad.addColorStop(0, mix(soilMid, '#8a5a34', 0.35)); gPad.addColorStop(0.7, soilDark); gPad.addColorStop(1, rgba(soilDark, 0.92));
    gCrust = g.createRadialGradient(-0.3, -0.36, 0.15, 0, 0, 1);
    gCrust.addColorStop(0, mix(stoneMid, '#8a7a8a', 0.35)); gCrust.addColorStop(0.8, stoneMid); gCrust.addColorStop(1, stoneDark);
    wordSize = Math.max(12, Math.min(15, W * 0.039));
    tagW = clamp(W * 0.46, 118, 190);
    pegX = padX + padRx * 0.42; pegY = padY + padRy * 0.72;
    measureTag();
  }
  function measureTag() {
    tokenSeen = words.token;
    g.save(); g.font = `600 ${wordSize}px ${FONT}`;
    const lines = Math.max(1, wrap(g, words.token || '', tagW - 22, 2).length);
    g.restore();
    tagH = lines * wordSize * 1.2 + 15;
    tagX = pegX + 2; tagY = gY + iry + 3 + tagH / 2;
    gTag = g.createLinearGradient(0, -tagH / 2, 0, tagH / 2);
    gTag.addColorStop(0, '#fff7e6'); gTag.addColorStop(1, '#efdcbc');
  }
  fit();
  E.onResize(fit);

  // ---- state
  let laid = 0, prog = 0, shown = 0, sv = 0, endOff = 0, assistTo = null;
  let drag = null, fX = 0, fY = 0, fOn = false, projD = 0, projOff = 0;
  let landed = false, landAt = -1, doneFlag = false, finAt = -1, twistAt = -1, heroHalf = false;
  let mx = rx[0], my = ry[0], pmx = NaN, pmy = 0, vx = 0, vy = 0, spd = 0, tdx = ny[0], tdy = -nx[0];
  let orbA = 0, spin = 0, noteStep = -1, lastNote = -9, lastHap = -9, lastWait = -9, lastSwish = -9, lastSpark = -9, sparkAcc = 0;
  let tugX = 0, tugY = 0, glance = 0, seedPulse = 0, nowT = 0, lastTwo = -9;
  const wob = new Wobble();
  const tmp = { x: 0, y: 0 }, an = { x: 0, y: 0 }, anc = { ax: 0, ay: 0 }, sg = { sh: 0, sw: 0, sx: 0, sy: 0 };

  const taper = (s) => clamp(Math.min(s * 7, (1 - s) * 4.5));
  const panOf = (x) => clamp((x - cx) / (W * 0.5), -1, 1) * 0.6;
  const noteOf = (s) => clamp(9 - Math.floor(s * 10), 0, 9);
  const heatAt = (s) => (1 - calm0 * 0.45) * (1 - smooth(invLerp(0, 0.96, s)));

  function trailAt(s, out = tmp) {
    const f = clamp(s) * (N - 1), i = Math.min(N - 2, Math.floor(f)), k = f - i;
    out.x = lerp(rx[i] + nx[i] * on[i], rx[i + 1] + nx[i + 1] * on[i + 1], k);
    out.y = lerp(ry[i] + ny[i] * on[i], ry[i + 1] + ny[i + 1] * on[i + 1], k);
    return out;
  }
  // nearest point of the glide route inside a window of s
  function project(px, py, lo, hi) {
    const k0 = Math.max(0, Math.floor(lo * (N - 1))), k1 = Math.min(N - 1, Math.ceil(hi * (N - 1)));
    let best = -1, bd = Infinity;
    for (let k = k0; k <= k1; k++) { const dx = px - rx[k], dy = py - ry[k], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
    if (best < 0) return -1;
    const along = (px - rx[best]) * ny[best] - (py - ry[best]) * nx[best];
    projOff = (px - rx[best]) * nx[best] + (py - ry[best]) * ny[best];
    projD = Math.sqrt(bd);
    return clamp(best / (N - 1) + clamp(along / routeLen, -0.5 / N, 0.5 / N));
  }
  // lay the gravity trail forward to s1, bending it towards the finger's offset
  function extendTo(s1, off) {
    s1 = clamp(s1);
    if (s1 <= laid) return;
    const i0 = Math.floor(laid * (N - 1)) + 1, i1 = Math.min(N - 1, Math.floor(s1 * (N - 1)));
    for (let i = i0; i <= i1; i++) {
      const k = (i - i0 + 1) / (i1 - i0 + 1), lim = maxDev * taper(i / (N - 1));
      on[i] = clamp(lerp(on[i - 1], clamp(lerp(endOff, off, k), -lim, lim), 0.55), -lim, lim);
    }
    if (i1 >= i0) {
      endOff = on[i1];
      for (let i = i1 + 1; i < N - 1; i++) { const lim = maxDev * taper(i / (N - 1)); on[i] = clamp(endOff * Math.exp(-(i - i1) / 6), -lim, lim); }
    }
    on[0] = 0; on[N - 1] = 0;
    laid = s1;
    // micro-payoff: a falling pentatonic note and a tick as each stretch is laid
    const step = Math.floor(laid * 18), now = E.now();
    trailAt(laid, an);
    if (step !== noteStep) {
      noteStep = step;
      if (now - lastNote > 0.09) { lastNote = now; E.sound('pluck', { note: noteOf(laid), intensity: 0.26, pan: panOf(an.x) }); }
      if (now - lastHap > 0.14) { lastHap = now; E.haptic('tick'); }
    }
    if (now - lastSpark > (low ? 0.12 : 0.05)) {
      lastSpark = now;
      E.particles.emit({ x: an.x, y: an.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.7, size: 5, colour: coolSoft, kind: 'glint', drag: 0.92 });
    }
  }
  // a guiding finger: lay trail up to it, as far as the world allows
  function feed(px, py) {
    const s = project(px, py, Math.max(0, shown - 0.05), Math.min(1, laid + 0.22));
    if (s < 0 || projD > TOL) { fOn = false; return; }
    fOn = true;
    const cap = Math.min(1, prog + BANK);
    if (s <= laid + 1e-4) return;
    if (laid >= cap - 1e-4) {
      if (E.locked && E.now() - lastWait > 0.9) { lastWait = E.now(); E.checkpoint('wait'); wob.kick(0.6); }
      return;
    }
    extendTo(Math.min(s, cap), projOff);
  }
  function hangPos(si, out) {
    const sl = slots[si], tr = trees[sl.t], c = Math.cos(tr.rot), s = Math.sin(tr.rot);
    anc.ax = tr.x + c * sl.ax - s * sl.ay; anc.ay = tr.y + s * sl.ax + c * sl.ay;
    out.x = anc.ax + Math.sin(sl.ang) * sl.len; out.y = anc.ay + Math.cos(sl.ang) * sl.len;
    return anc;
  }
  function detach(c, j) {
    c.st = 1; c.k = 0; c.x0 = c.x; c.y0 = c.y;
    if (c.ph >= 0) { photos.dust(c.ph, c.x, c.y, cz, low ? 6 : 12, { shape: 'circle', up: 22, speed: 22 }); E.checkpoint('photo', c.ph); }
    else E.particles.burst(c.x, c.y, low ? 3 : 7, { speed: 40, colour: '#ffc07a', life: 0.9, size: 5, kind: 'glint' });
    E.sound('glass', { note: (j * 2 + 3) % 10, intensity: 0.36, pan: panOf(c.x) });
    E.haptic('light');
  }
  function land(t) {
    landed = true; landAt = t; assistTo = null;
    E.ripples.add(padX, padY, { colour: coolSoft, speed: 60, alpha: 0.5, r: padRx * 0.25 });
    E.ripples.add(padX, padY, { colour: seedCol, speed: 36, alpha: 0.35, r: padRx * 0.1 });
    for (let i = 0; i < (low ? 4 : 9); i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      E.particles.emit({ x: padX + Math.cos(a) * mz * 0.3, y: padY - 2, vx: Math.cos(a) * 34, vy: -18 - Math.random() * 22, life: 0.8, size: 3.5, colour: mix(soilMid, '#c89a6a', 0.5), kind: 'dot', gravity: 70, drag: 0.94 });
    }
    if (!heavy) E.particles.burst(padX, padY - mz * 0.3, low ? 4 : 10, { speed: 36, colour: seedCol, life: 1.3, size: 5, kind: 'glint', dir: -Math.PI / 2, spread: 1.6 });
    if (hero >= 0) E.checkpoint('photo', hero);
    E.sound('drop-in', { intensity: 0.38 });
    E.sound('bloom', { intensity: heavy ? 0.22 : 0.32 });
    E.haptic('soft');
    E.react(heavy ? 'comfort' : 'success');
  }

  // ------------------------------------------------------------ frame --
  function frame(dtIn, t) {
    const dt = Math.min(dtIn, 1 / 20);
    nowT = t;
    if (words.token !== tokenSeen) measureTag();
    // ---- input-driven simulation
    if (finAt >= 0 && !landed) laid = 1;                             // finale: the trail completes itself in light
    if (drag != null && !landed) feed(fX, fY);
    if (assistTo != null && !landed) {
      const nl = Math.min(assistTo, laid + dt * 0.6, prog + BANK, 1);
      if (nl > laid) extendTo(nl, Math.sin(nl * 9 + swayPh) * maxDev * 0.3);
      if (assistTo - laid < 1e-3) assistTo = null;
    }
    prog = E.gate(laid);
    if (laid > prog + BANK) laid = prog + BANK;
    // the meteor rides the trail like a bead on a wire (spring along the line)
    const acc = (prog - shown) * 48 - sv * 11.5;
    sv += acc * dt; shown += sv * dt;
    if (shown > laid) { shown = laid; if (sv > 0) sv = 0; }
    if (shown < 0) { shown = 0; sv = 0; }
    if (!landed && prog >= 0.999 && shown >= 0.985) land(t);
    if (landed && !doneFlag && t - landAt > 1.0 && drag == null) doneFlag = true;
    const lk = landed ? ease.inOutSine(clamp((t - landAt) / 1.1)) : 0;
    const heat = heatAt(shown) * (1 - lk);
    if (!heroHalf && hero >= 0 && shown >= 0.5) { heroHalf = true; E.checkpoint('photo', hero); E.sound('glass', { note: 4, intensity: 0.3 }); }

    // meteor position: on the trail, gently bobbing while it hangs
    trailAt(shown);
    let x = tmp.x, y = tmp.y;
    const bob = (reduced ? 1 : 3.2) * (1 - smooth(shown)) * (1 - lk) * amb;
    x += Math.sin(t * 0.9 + 1) * bob * 0.5; y += Math.sin(t * 1.5) * bob;
    const wv = wob.update(dt);
    const tgx = drag != null && !fOn && !landed ? clamp((fX - x) * 0.08, -9, 9) : 0, tgy = drag != null && !fOn && !landed ? clamp((fY - y) * 0.08, -9, 9) : 0;
    tugX = lerp(tugX, tgx, 1 - Math.exp(-dt * 6)); tugY = lerp(tugY, tgy, 1 - Math.exp(-dt * 6));
    glance = Math.max(0, glance - dt * 1.6); seedPulse = Math.max(0, seedPulse - dt * 1.2);
    const si = Math.min(N - 1, Math.round(shown * (N - 1)));
    x += tugX + nx[si] * wv * 5; y += tugY + ny[si] * wv * 5;
    mx = x; my = y;
    if (dt > 0) {
      if (Number.isNaN(pmx)) { pmx = x; pmy = y; }
      const k = 1 - Math.exp(-dt * 8);
      vx = lerp(vx, (x - pmx) / dt, k); vy = lerp(vy, (y - pmy) / dt, k); pmx = x; pmy = y;
      spd = Math.hypot(vx, vy);
      let dX = ny[si] + vx * 0.004, dY = -nx[si] + vy * 0.004; const l = Math.hypot(dX, dY) || 1; dX /= l; dY /= l;
      const kd = 1 - Math.exp(-dt * 6); tdx = lerp(tdx, dX, kd); tdy = lerp(tdy, dY, kd); const l2 = Math.hypot(tdx, tdy) || 1; tdx /= l2; tdy /= l2;
    }
    spin += dt * (0.15 + heat * 0.5 + spd * 0.002) * (reduced ? 0.4 : 1);
    if (!landed && spd > 110 && t - lastSwish > 0.8) { lastSwish = t; E.sound('swish', { intensity: clamp(spd / 500) * 0.35, pan: panOf(x) }); }
    // sparks shed from the hot crust
    if (!landed && dt > 0) {
      sparkAcc = Math.min(3, sparkAcc + heat * (0.3 + Math.min(1, spd / 160)) * (low ? 0.35 : 1) * (1 - calm0 * 0.5) * dt * 26);
      while (sparkAcc >= 1) {
        sparkAcc -= 1;
        const a = Math.atan2(-tdy, -tdx) + (Math.random() - 0.5) * 1.2, v = 20 + Math.random() * 40;
        E.particles.emit({ x: x - tdx * mz * 0.4, y: y - tdy * mz * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.5, size: 3 + Math.random() * 3, colour: Math.random() < 0.5 ? '#ffc06a' : '#ff8a3a', kind: 'glint', drag: 0.93, gravity: 26 });
      }
    }
    // orchard physics: trees sway, the meteor's wind nudges crowns and hanging fruit
    for (const tr of trees) {
      const ccx = tr.x, ccy = tr.y - tr.th - tr.cr * 0.55;
      if (!landed && spd > 40 && Math.hypot(x - ccx, y - ccy) < tr.cr * 2.4) tr.kv += clamp(vx / 900, -0.6, 0.6) * dt * 7;
      tr.kv += (-32 * tr.kick - 4 * tr.kv) * dt; tr.kick += tr.kv * dt;
      tr.rot = Math.sin(t * 0.5 * amb + tr.ph) * (reduced ? 0.006 : 0.016) + tr.kick * (reduced ? 0.3 : 1);
    }
    for (let i = 0; i < SLOTS; i++) {
      const sl = slots[i];
      sl.av += (-7 * sl.ang - 0.9 * sl.av + trees[sl.t].kv * 1.4 + (reduced ? 0 : Math.sin(t * 0.8 * amb + i * 1.7) * 0.25)) * dt;
      sl.ang = clamp(sl.ang + sl.av * dt, -0.6, 0.6);
    }
    // riding stones orbit the core, detach as it cools, float to the trees
    orbA += dt * (reduced ? 0.08 : 0.26) * amb;
    chips.forEach((c, j) => {
      if (c.st === 0) {
        const a = c.a0 + orbA, tx = x + Math.cos(a) * orbR, ty = y + Math.sin(a) * orbR * 0.88;
        if (!c.init) { c.x = tx; c.y = ty; c.init = true; }
        const k = 1 - Math.exp(-dt * 9); c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
        c.cool = (1 - heat) * 0.45;
        if (shown >= c.thr || finAt >= 0) detach(c, j);
      } else if (c.st === 1) {
        c.k = Math.min(1, c.k + dt / 1.5);
        hangPos(c.slot, an);
        const e = ease.inOutSine(c.k), u = 1 - e, qx = (c.x0 + an.x) / 2, qy = Math.min(c.y0, an.y) - H * 0.08;
        c.x = u * u * c.x0 + 2 * u * e * qx + e * e * an.x; c.y = u * u * c.y0 + 2 * u * e * qy + e * e * an.y;
        c.cool = Math.min(1, c.cool + dt / 1.1);
        if (c.k >= 1) {
          c.st = 2; slots[c.slot].av += (an.x > c.x0 ? 1 : -1) * 0.7;
          E.sound('bubble', { note: (j * 3 + 1) % 10, intensity: 0.22, pan: panOf(an.x) });
          if (!low) E.particles.burst(an.x, an.y, 5, { speed: 26, colour: seedCol, life: 0.9, size: 4, kind: 'glint' });
        }
      } else { hangPos(c.slot, an); c.x = an.x; c.y = an.y; c.cool = 1; }
    });

    // ---- drawing
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const tw = twistAt >= 0 ? smooth(clamp((t - twistAt) / 1.6)) : 0;
    drawSkyGlow(t, fin);
    drawIsland(t, fin);
    drawTrees(t, fin, tw);
    drawFlies(t, fin);
    drawPad(t, fin, lk);
    drawTag(t, fin, lk);
    drawGuide(t);
    drawTrail(t, fin);
    for (const c of chips) if (c.st === 1) drawChip(c, t, fin);
    for (const c of chips) if (c.st === 0 && Math.sin(c.a0 + orbA) < 0) drawChip(c, t, fin);
    if (lk < 1) drawMeteor(t, x, y, heat, lk);
    if (landed) drawSeed(t, lk, fin);
    for (const c of chips) if (c.st === 0 && Math.sin(c.a0 + orbA) >= 0) drawChip(c, t, fin);
    if (finAt >= 0) drawSprout(t);
    drawFinger(t);
    if (twistAt >= 0 && twistKind === 1) drawWish(t, dt);
    if (finAt >= 0 && dt > 0) finaleMotes(t, dt);
  }

  // ------------------------------------------------------------ drawing --
  function drawSkyGlow(t, fin) {
    glow(g, padX, gY - H * 0.12, Math.max(W, H * 0.6) * 0.55, coolCol, 0.07 + fin * 0.06);
    glow(g, padX, padY, padRx * 2.6, seedCol, (landed ? 0.14 : 0.06) + fin * 0.12);
  }
  function drawIsland(t, fin) {
    // soil cross-section, fading into the night so the orchard floats
    g.fillStyle = gFace;
    g.beginPath(); g.moveTo(cx - isl, gY);
    g.ellipse(cx, gY, isl, iry, 0, Math.PI, 0, true);
    g.bezierCurveTo(cx + isl * 0.82, gY + iry + depth * 0.45, cx + isl * 0.38, gY + iry + depth, cx, gY + iry + depth);
    g.bezierCurveTo(cx - isl * 0.38, gY + iry + depth, cx - isl * 0.82, gY + iry + depth * 0.45, cx - isl, gY);
    g.closePath(); g.fill();
    g.save(); g.lineCap = 'round';
    g.strokeStyle = rgba('#000000', 0.22); g.lineWidth = 1.2;
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.ellipse(cx, gY + depth * 0.16 * k, isl * (1 - k * 0.14), iry, 0, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke(); }
    // glowing roots below
    g.globalCompositeOperation = 'lighter';
    for (const rt of roots) {
      const x0 = cx + rt.u * isl, y0 = gY + iry + depth * (1 - rt.u * rt.u) * 0.62, L = depth * rt.l;
      const sw = reduced ? 0 : Math.sin(t * 0.7 * amb + rt.ph) * 4;
      g.strokeStyle = rgba(coolCol, 0.16 + fin * 0.12); g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + sw, y0 + L * 0.6, x0 + sw * 1.6, y0 + L); g.stroke();
      glow(g, x0 + sw * 1.6, y0 + L, 5, coolSoft, 0.3 + 0.2 * Math.sin(t * 1.3 + rt.ph));
    }
    g.restore();
    // turf top + moonlit rim
    g.fillStyle = gTop; g.beginPath(); g.ellipse(cx, gY, isl, iry, 0, 0, TAU); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(coolCol, 0.28); g.lineWidth = 1.6; g.beginPath(); g.ellipse(cx, gY, isl, iry, 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke();
    g.strokeStyle = rgba(leafCol, 0.2); g.lineWidth = 1.2; g.beginPath(); g.ellipse(cx, gY, isl, iry, 0, Math.PI * 0.06, Math.PI * 0.94); g.stroke();
    g.restore();
    // tiny glowing flowers along the front lip
    for (let i = 0; i < rimF.length; i++) {
      const f = rimF[i], px = cx + Math.cos(f.a) * isl * f.r, py = gY + Math.sin(f.a) * iry * f.r;
      const tw = 0.5 + 0.5 * Math.sin(t * 1.3 * amb + f.ph);
      glow(g, px, py, 4 + 3 * tw, i % 3 ? leafCol : seedCol, 0.3 + 0.3 * tw + fin * 0.3);
    }
  }
  function drawTrees(t, fin, tw) {
    for (let ti = 0; ti < trees.length; ti++) {
      const tr = trees[ti], cr = tr.cr, th = tr.th, ccy = -th - cr * 0.55;
      shadow(g, tr.x, tr.y + 1, cr * 0.9, Math.max(3, cr * 0.2), 0.32);
      glow(g, tr.x, tr.y - th - cr * 0.6, cr * 1.9, leafCol, 0.1 + fin * 0.08);
      g.save(); g.translate(tr.x, tr.y); g.rotate(tr.rot);
      const w0 = cr * 0.17, w1 = cr * 0.07;
      g.fillStyle = tr.gTrunk;
      g.beginPath(); g.moveTo(-w0, 0); g.quadraticCurveTo(-w0 * 0.55, -th * 0.5, -w1, -th); g.lineTo(w1, -th); g.quadraticCurveTo(w0 * 0.6, -th * 0.5, w0, 0); g.closePath(); g.fill();
      g.strokeStyle = trunkDark; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, w1 * 1.3);
      g.beginPath(); g.moveTo(0, -th * 0.68); g.quadraticCurveTo(-cr * 0.2, -th * 0.85, -cr * 0.46, -th - cr * 0.05);
      g.moveTo(0, -th * 0.76); g.quadraticCurveTo(cr * 0.22, -th * 0.9, cr * 0.48, -th); g.stroke();
      // crown
      g.fillStyle = tr.gCrown; g.beginPath();
      for (const b of tr.blobs) { g.moveTo(b.x * cr + b.r * cr, ccy + b.y * cr); g.arc(b.x * cr, ccy + b.y * cr, b.r * cr, 0, TAU); }
      g.fill();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(leafCol, 0.3 + fin * 0.12); g.lineWidth = 1.4;
      for (const b of tr.blobs) { g.beginPath(); g.arc(b.x * cr, ccy + b.y * cr, b.r * cr - 1, Math.PI * 1.08, Math.PI * 1.62); g.stroke(); }
      g.globalCompositeOperation = 'source-over';
      for (let q = 0; q < 3; q++) {
        const b = tr.blobs[q + 1], twk = 0.5 + 0.5 * Math.sin(t * 1.4 * amb + tr.ph + q * 2.3);
        glow(g, (b.x - b.r * 0.3) * cr, ccy + (b.y - b.r * 0.35) * cr, cr * 0.22, leafCol, 0.25 + 0.3 * twk);
      }
      // plot twist (odd rounds): the trees blossom
      if (tw > 0 && twistKind === 0) {
        for (const bl of tr.bloom) {
          const k = smooth(clamp((tw - bl.d) / 0.4)); if (k <= 0) continue;
          const bx = bl.x * cr * 0.8, by = ccy + bl.y * cr * 0.8;
          glow(g, bx, by, cr * 0.28 * k, blossomCol, 0.55);
          g.fillStyle = rgba('#ffffff', 0.85 * k); g.beginPath(); g.arc(bx, by, Math.max(1.2, cr * 0.05) * k, 0, TAU); g.fill();
        }
      }
      g.restore();
      // hanging fruit and buds
      for (let b = 0; b < 2; b++) {
        const sidx = ti * 2 + b, cj = slotChip[sidx], c = cj >= 0 ? chips[cj] : null;
        const A = hangPos(sidx, an);
        g.strokeStyle = rgba(leafCol, 0.42); g.lineWidth = 1;
        if (c && c.st === 2) {
          g.beginPath(); g.moveTo(A.ax, A.ay); g.lineTo(an.x, an.y - (c.ph >= 0 ? fz * 0.48 : fz * 0.22)); g.stroke();
          drawChip(c, t, fin);
        } else {
          const br = 0.5 + 0.5 * Math.sin(t * 1.1 * amb + sidx * 1.9);
          const bx = an.x, by = A.ay + (an.y - A.ay) * 0.45;
          g.beginPath(); g.moveTo(A.ax, A.ay); g.lineTo(bx, by - fz * 0.1); g.stroke();
          glow(g, bx, by, fz * (0.32 + 0.1 * br) * (1 + fin * 0.4), seedCol, 0.28 + 0.18 * br + fin * 0.3);
          orb(g, bx, by, Math.max(2.5, fz * 0.11), mix(seedCol, '#ffffff', 0.2 * br));
        }
      }
    }
  }
  function drawFlies(t, fin) {
    const top = gY - H * 0.34, hh = H * 0.3;
    for (let i = 0; i < flies.length; i++) {
      const f = flies[i], s = reduced ? 0.25 : 1;
      const px = X0 + W * (0.06 + 0.88 * f.u) + Math.sin(t * 0.33 * f.s * amb + f.a) * 16 * s;
      const py = top + hh * f.v + Math.cos(t * 0.27 * f.s * amb + f.a * 1.3) * 10 * s;
      const tw = 0.5 + 0.5 * Math.sin(t * 1.7 * f.s + f.a);
      glow(g, px, py, 5 + 3 * tw, i % 2 ? seedCol : leafCol, (0.18 + 0.32 * tw) * (1 + fin * 0.6));
    }
  }
  function drawPad(t, fin, lk) {
    shadow(g, padX, padY + padRy * 0.3, padRx * 1.15, padRy * 1.3, 0.3);
    g.fillStyle = gPad; g.beginPath(); g.ellipse(padX, padY, padRx, padRy, 0, 0, TAU); g.fill();
    g.strokeStyle = rgba('#000000', 0.28); g.lineWidth = 1;
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.ellipse(padX, padY + k * 0.4, padRx * (1 - k * 0.21), padRy * (1 - k * 0.21), 0, 0, TAU); g.stroke(); }
    g.strokeStyle = rgba('#e8c49a', 0.22); g.beginPath(); g.ellipse(padX, padY, padRx * 0.98, padRy * 0.98, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    // landing ring: breathes, brightens as the meteor nears, warms once it has landed
    const near = smooth(invLerp(0.5, 1, shown)), br = 0.5 + 0.5 * Math.sin(t * 1.8 * amb);
    const col = landed ? mix(coolSoft, seedCol, lk) : coolSoft;
    g.save(); g.globalCompositeOperation = 'lighter';
    const ra = (0.3 + 0.35 * near + 0.15 * br) * (landed ? lerp(1, 0.55, lk) : 1) + fin * 0.25;
    for (const [w, a] of RING) { g.strokeStyle = rgba(col, a * ra); g.lineWidth = w; g.beginPath(); g.ellipse(padX, padY, padRx * 1.05, padRy * 1.05, 0, 0, TAU); g.stroke(); }
    if (!landed) {
      for (let q = 0; q < 3; q++) {
        const ph = (t * 0.32 * amb + q / 3) % 1, rr = 1 - ph;
        g.strokeStyle = rgba(coolSoft, Math.sin(ph * Math.PI) * (0.18 + 0.25 * near)); g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(padX, padY, padRx * (0.2 + 0.8 * rr), padRy * (0.2 + 0.8 * rr), 0, 0, TAU); g.stroke();
      }
    }
    g.restore();
    glow(g, padX, padY, padRx * 1.1, col, 0.08 + 0.2 * near + fin * 0.1);
  }
  function drawTag(t, fin, lk) {
    const rot = (reduced ? 0 : Math.sin(t * 0.9 * amb + 0.6) * 0.035) + glance * 0.02;
    const topY = tagY - tagH / 2;
    // peg in the soil and the string over the island lip
    g.strokeStyle = rgba('#e8d2b0', 0.75); g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(pegX, pegY); g.quadraticCurveTo(pegX + 6, (pegY + topY) / 2 + 4, tagX, topY + 6); g.stroke();
    g.fillStyle = mix('#8a6040', soilDark, 0.2); roundRect(g, pegX - 2, pegY - 9, 4, 11, 2); g.fill();
    g.save(); g.translate(tagX, topY + 6); g.rotate(rot); g.translate(0, tagH / 2 - 6);
    g.fillStyle = 'rgba(0,0,12,0.32)'; roundRect(g, -tagW / 2 + 2, -tagH / 2 + 3, tagW, tagH, 9); g.fill();
    g.fillStyle = gTag; roundRect(g, -tagW / 2, -tagH / 2, tagW, tagH, 9); g.fill();
    g.strokeStyle = 'rgba(120,84,50,0.35)'; g.lineWidth = 1; g.stroke();
    // eyelet
    g.fillStyle = 'rgba(90,60,36,0.55)'; g.beginPath(); g.arc(0, -tagH / 2 + 6, 2.4, 0, TAU); g.fill();
    if (landed) { const a = 0.18 * lk + fin * 0.15; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(seedCol, a); roundRect(g, -tagW / 2, -tagH / 2, tagW, tagH, 9); g.fill(); g.restore(); }
    if (E.phase !== 'law') words.draw(g, 0, 3, { style: 'ink', size: wordSize, maxWidth: tagW - 22, lines: 2, colour: '#3b2a1e' });
    g.restore();
  }
  function drawGuide(t) {
    if (landed) return;
    const i0 = Math.ceil(laid * (N - 1)) + 1, wave = laid + ((t * 0.3 * amb) % 1.3) * (1 - laid);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = coolSoft;
    for (let i = i0; i < N - 1; i += 2) {
      const s = i / (N - 1), w = Math.max(0, 1 - Math.abs(s - wave) * 9);
      g.globalAlpha = 0.24 + 0.46 * w;
      g.beginPath(); g.arc(rx[i] + nx[i] * on[i], ry[i] + ny[i] * on[i], 1.7 + w * 1.6, 0, TAU); g.fill();
    }
    g.restore();
  }
  function strokeRange(s0, s1) {
    if (s1 - s0 < 1e-4) return false;
    g.beginPath(); trailAt(s0); g.moveTo(tmp.x, tmp.y);
    const i0 = Math.floor(s0 * (N - 1)) + 1, i1 = Math.floor(s1 * (N - 1));
    for (let i = i0; i <= i1; i++) g.lineTo(rx[i] + nx[i] * on[i], ry[i] + ny[i] * on[i]);
    trailAt(s1); g.lineTo(tmp.x, tmp.y);
    return true;
  }
  function drawTrail(t, fin) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.globalCompositeOperation = 'lighter';
    // travelled: the trail cools into stardust behind the meteor
    if (strokeRange(0, shown)) {
      g.strokeStyle = rgba(coolCol, 0.1 + fin * 0.06); g.lineWidth = 6; g.stroke();
      g.setLineDash(DASH_B); g.lineDashOffset = -t * 6;
      g.strokeStyle = rgba(coolSoft, 0.38 + fin * 0.3); g.lineWidth = 1.5; g.stroke(); g.setLineDash(NO_DASH);
    }
    // ahead: the live gravity trail the meteor is about to ride
    if (strokeRange(shown, laid)) {
      for (const [w, a] of AHEAD) { g.strokeStyle = a > 0.8 ? rgba('#ffffff', a) : rgba(coolCol, a); g.lineWidth = w || mz * 0.32; g.stroke(); }
      g.setLineDash(DASH_A); g.lineDashOffset = -t * 36 * amb; g.strokeStyle = rgba('#ffffff', 0.6); g.lineWidth = 3.4; g.stroke(); g.setLineDash(NO_DASH);
    }
    g.lineDashOffset = 0;
    g.restore();
    if (laid > shown + 0.01 && !landed) { trailAt(laid); glow(g, tmp.x, tmp.y, 16, coolSoft, 0.65); glint(g, tmp.x, tmp.y, 7, '#ffffff', 0.7, t * 0.8); }
  }
  function drawChip(c, t, fin) {
    const hang = c.st === 2, fly = c.st === 1, k = fly ? ease.inOutSine(c.k) : hang ? 1 : 0;
    const depthK = c.st === 0 ? 0.93 + 0.07 * Math.sin(c.a0 + orbA) : 1;
    const sz = lerp(cz, fz, k) * depthK, ember = (1 - c.cool) * (1 - calm0 * 0.4);
    const gc = mix(seedCol, EMBER, ember);
    if (c.ph >= 0) {
      if (hang) glow(g, c.x, c.y, sz * 1.05, seedCol, 0.26 + 0.1 * Math.sin(t * 1.4 + c.a0) + fin * 0.25);
      photos.draw(g, c.ph, c.x, c.y, sz, { shape: 'circle', tone: 'ember', toneMix: ember * 0.85, glow: 0.3 + 0.35 * ember, glowColour: gc, alpha: 0.9 + 0.1 * depthK, shadow: false });
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(mix(coolSoft, '#ffd9a0', ember), 0.4); g.lineWidth = 1.2;
      g.beginPath(); g.arc(c.x, c.y, sz * 0.5, Math.PI * 1.05, Math.PI * 1.7); g.stroke(); g.restore();
    } else {
      const rr = lerp(cz * 0.27, fz * 0.24, k) * depthK;
      glow(g, c.x, c.y, rr * 3.2, gc, 0.4 + 0.25 * ember + fin * 0.2);
      orb(g, c.x, c.y, rr, mix(mix(seedCol, '#ffffff', 0.15), '#ff8a3a', ember));
    }
  }
  // how far a ray from (x, y) along (dx, dy) can run before leaving the stage
  function room(x, y, dx, dy) {
    let k = 1e4;
    if (dx < -1e-4) k = Math.min(k, (x - X0) / -dx); else if (dx > 1e-4) k = Math.min(k, (X0 + W - x) / dx);
    if (dy < -1e-4) k = Math.min(k, (y - Y0) / -dy); else if (dy > 1e-4) k = Math.min(k, (Y0 + H - y) / dy);
    return Math.max(0, k);
  }
  function drawMeteor(t, x, y, heat, lk) {
    const r = mz * 0.5 * lerp(1, 0.8, lk), hot = heat, fade = 1 - lk;
    const headCol = mix(coolSoft, HOT, hot), midCol = mix(coolCol, EMBER, hot), deepCol = mix(coolCol, RED, hot);
    // tail: three tapered additive ribbons; long and ember-hot at first, shorter and
    // palette-cool as it glides (speed stretches it); never leaves the stage
    const L = Math.min((r * (1.7 + 2.5 * hot) + Math.min(r * 3, spd * 0.35)) * fade, room(x, y, -tdx, -tdy) * 0.96);
    if (L > 2) {
      const pxn = -tdy, pyn = tdx;
      const wig = reduced ? 0 : Math.sin(t * 3.1) * r * 0.2 * (0.4 + hot);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let layer = 0; layer < 3; layer++) {
        const wd = r * (layer === 0 ? 0.95 : layer === 1 ? 0.55 : 0.2), LL = L * (layer === 0 ? 1 : layer === 1 ? 0.66 : 0.42);
        const ex = x - tdx * LL + pxn * wig, ey = y - tdy * LL + pyn * wig;
        const lg = g.createLinearGradient(x, y, ex, ey);
        if (layer === 0) { lg.addColorStop(0, rgba(midCol, 0.6 * fade)); lg.addColorStop(0.45, rgba(deepCol, 0.2 * fade)); }
        else if (layer === 1) { lg.addColorStop(0, rgba(headCol, 0.9 * fade)); lg.addColorStop(0.45, rgba(midCol, 0.34 * fade)); }
        else { lg.addColorStop(0, rgba('#ffffff', (0.4 + 0.4 * hot) * fade)); lg.addColorStop(0.5, rgba(headCol, 0.2 * fade)); }
        lg.addColorStop(1, rgba(deepCol, 0));
        g.fillStyle = lg; g.beginPath();
        g.moveTo(x + pxn * wd, y + pyn * wd);
        g.quadraticCurveTo(x - tdx * LL * 0.45 + pxn * wd * 0.55, y - tdy * LL * 0.45 + pyn * wd * 0.55, ex, ey);
        g.quadraticCurveTo(x - tdx * LL * 0.45 - pxn * wd * 0.55, y - tdy * LL * 0.45 - pyn * wd * 0.55, x - pxn * wd, y - pyn * wd);
        g.closePath(); g.fill();
      }
      g.restore();
      // ember flecks in the tail
      for (const f of flecks) {
        const d = L * f.d, fl = 0.5 + 0.5 * Math.sin(t * 7 + f.ph);
        glow(g, x - tdx * d + pxn * (f.w * r + wig * f.d), y - tdy * d + pyn * (f.w * r + wig * f.d), 3 + 4 * hot, hot > 0.3 ? '#ffc070' : coolSoft, (0.25 + 0.4 * fl * (reduced ? 0.4 : 1)) * (0.35 + hot) * fade);
      }
    }
    glow(g, x, y, r * (2.4 + 1.2 * hot), midCol, (0.3 + 0.38 * hot) * fade + glance * 0.2);
    // body
    const alpha = 1 - lk;
    if (hero >= 0) {
      // the photo is the core, inside an ember crust that cools and flakes back as it glides
      photos.draw(g, hero, x, y, r * 1.86, { shape: 'circle', tone: 'ember', toneMix: hot * 0.85, glow: 0.25 + 0.4 * hot, glowColour: midCol, rot: Math.sin(t * 0.6) * 0.05, alpha, shadow: false });
      drawCrust(x, y, r, hot, alpha);
      glow(g, x + tdx * r * 0.3, y + tdy * r * 0.3, r * 1.05, '#ff6a2a', 0.26 * hot * alpha);
    } else {
      g.save(); g.globalAlpha = alpha;
      const lx = x + tdx * r * 0.35, ly = y + tdy * r * 0.35;
      const bg = g.createRadialGradient(lx - r * 0.1, ly - r * 0.15, r * 0.05, x, y, r);
      bg.addColorStop(0, mix(coolSoft, HOT, hot)); bg.addColorStop(0.3, mix(mix(coolCol, stoneMid, 0.55), '#ffae4a', hot));
      bg.addColorStop(0.72, mix(stoneMid, RED, hot)); bg.addColorStop(1, mix(stoneDark, CRUST, hot));
      g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.translate(x, y); g.rotate(spin); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (const c of cracks) { g.moveTo(c[0] * r, c[1] * r); for (let q = 1; q < 4; q++) g.lineTo(c[q * 2] * r, c[q * 2 + 1] * r); }
      g.strokeStyle = rgba(mix(stoneDark, CRUST, hot), 0.7); g.lineWidth = Math.max(1.5, r * 0.08); g.stroke();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(mix(coolCol, '#ffb050', hot), 0.3 + 0.6 * hot); g.lineWidth = Math.max(1, r * 0.035); g.stroke();
      g.restore();
    }
    // hot leading face + glassy highlight
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
    const fa = Math.atan2(tdy, tdx);
    g.strokeStyle = rgba(headCol, 0.5); g.lineWidth = Math.max(1.5, r * 0.08); g.beginPath(); g.arc(x, y, r * 0.97, fa - 1.1, fa + 1.1); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.ellipse(x - r * 0.32, y - r * 0.42, r * 0.34, r * 0.15, -0.5, 0, TAU); g.fill();
    g.restore();
  }
  // a ring of smouldering crust around the photo core: craggy and seamed with
  // ember light while hot, a thin cool stone rim (the seed's shell) once cooled
  function drawCrust(x, y, r, hot, alpha) {
    const ck = 0.18 + 0.82 * hot;
    for (let i = 0; i < JAG; i++) { const ri = 0.9 - (0.03 + 0.13 * jag[i]) * ck; jx[i] = jc[i] * ri; jy[i] = js[i] * ri; }
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(spin * 0.5); g.scale(r, r);
    g.beginPath(); g.arc(0, 0, 1, 0, TAU);
    g.moveTo(jx[0], jy[0]); for (let i = JAG - 1; i > 0; i--) g.lineTo(jx[i], jy[i]); g.closePath();
    g.fillStyle = gCrust; g.fill('evenodd');
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.globalCompositeOperation = 'lighter';
    // seams: the glowing inner edge where crust meets the core, and cracks across the ring
    g.beginPath(); g.moveTo(jx[0], jy[0]); for (let i = 1; i < JAG; i++) g.lineTo(jx[i], jy[i]); g.closePath();
    g.strokeStyle = rgba(mix(coolSoft, '#ffb050', hot), 0.2 + 0.6 * hot); g.lineWidth = 2.2 / r; g.stroke();
    if (hot > 0.04) {
      g.beginPath();
      for (let i = 1; i < JAG; i += 4) { g.moveTo(jx[i], jy[i]); g.lineTo(jc[i] * 0.97 + js[i] * 0.05, js[i] * 0.97 - jc[i] * 0.05); }
      g.strokeStyle = rgba('#ffb45a', 0.7 * hot); g.lineWidth = 1.6 / r; g.stroke();
    }
    g.strokeStyle = rgba('#ffffff', 0.22); g.lineWidth = 1.2 / r;
    g.beginPath(); g.arc(0, 0, 0.985, Math.PI * 1.05 - spin * 0.5, Math.PI * 1.6 - spin * 0.5); g.stroke();
    g.restore();
  }
  function seedGeom() { sg.sh = mz * 0.86; sg.sw = sg.sh * 0.8; sg.sx = padX; sg.sy = padY - sg.sh * 0.36; return sg; }
  function drawSeed(t, lk, fin) {
    const { sh, sw, sx, sy } = seedGeom();
    const dtL = t - landAt, sq = reduced ? 0 : Math.exp(-dtL * 5) * Math.sin(dtL * 16) * 0.12;
    const br = 0.5 + 0.5 * Math.sin(t * 1.3 * amb);
    glow(g, sx, sy, sh * (1.1 + 0.12 * br + seedPulse * 0.3), seedCol, (0.42 + 0.18 * br + fin * 0.2 + seedPulse * 0.3) * lk);
    g.save(); g.translate(sx, sy + sh * 0.5); g.scale(1 + sq * 0.6, 1 - sq); g.translate(-sx, -(sy + sh * 0.5));
    if (hero >= 0) {
      photos.draw(g, hero, sx, sy, sh, { shape: 'drop', glow: 0.45 + 0.2 * br + fin * 0.2, glowColour: seedCol, alpha: lk, shadow: false });
    } else {
      g.globalAlpha = lk;
      const gr = g.createRadialGradient(sx - sw * 0.18, sy - sh * 0.05, sw * 0.05, sx, sy + sh * 0.1, sh * 0.62);
      gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.45, seedCol); gr.addColorStop(1, mix(seedCol, pal.warm || '#ffb37a', 0.6));
      g.fillStyle = gr; dropPath(sx, sy, sw, sh); g.fill();
      g.strokeStyle = rgba('#ffffff', 0.45); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(sx, sy - sh * 0.42); g.quadraticCurveTo(sx + sw * 0.16, sy + sh * 0.05, sx, sy + sh * 0.44); g.stroke();
    }
    g.restore();
    // a lip of soil nestles the seed's base
    g.fillStyle = rgba(soilDark, 0.85 * lk);
    g.beginPath(); g.ellipse(sx, sy + sh * 0.47, sw * 0.62, Math.max(3, padRy * 0.42), 0, 0, Math.PI); g.fill();
  }
  function dropPath(x, y, w, h) {
    const r = w / 2, x0 = x - w / 2, y0 = y - h / 2, cy = y0 + h - r;
    g.beginPath(); g.moveTo(x, y0);
    g.bezierCurveTo(x0 + w * 0.62, y0 + h * 0.18, x0 + w, cy - r * 0.35, x0 + w, cy);
    g.arc(x, cy, r, 0, Math.PI);
    g.bezierCurveTo(x0, cy - r * 0.35, x0 + w * 0.38, y0 + h * 0.18, x, y0);
    g.closePath();
  }
  function drawSprout(t) {
    const gk = smooth(clamp((t - finAt - 0.2) / (heavy ? 2.6 : 2))); if (gk <= 0) return;
    const { sh, sx, sy } = seedGeom();
    const x0 = sx, y0 = sy - sh * 0.48, h = mz * 1.05 * gk, sw = reduced ? 0 : Math.sin(t * 0.8) * 3;
    const tx = x0 + sw, ty = y0 - h;
    g.save(); g.lineCap = 'round';
    g.strokeStyle = mix(leafCol, '#4a8a5a', 0.35); g.lineWidth = 3;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 - 8, y0 - h * 0.5, tx, ty); g.stroke();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(leafCol, 0.35); g.lineWidth = 7; g.stroke();
    g.restore();
    const lk = smooth(clamp((t - finAt - 0.9) / 1.4));
    if (lk > 0) {
      for (let s = -1; s <= 1; s += 2) {
        const lx = lerp(x0, tx, 0.72) - 3, ly = lerp(y0, ty, 0.72);
        g.save(); g.translate(lx, ly); g.rotate(-s * (0.45 + 0.06 * Math.sin(t * 1.2)));
        g.scale(lk, lk);
        const L = mz * 0.34;
        const lg = g.createLinearGradient(0, 0, s * L, -L * 0.3);
        lg.addColorStop(0, mix(leafCol, '#3a7a4a', 0.4)); lg.addColorStop(1, leafCol);
        g.fillStyle = lg; g.beginPath(); g.ellipse(s * L * 0.5, -L * 0.12, L * 0.5, L * 0.22, s * -0.35, 0, TAU); g.fill();
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#ffffff', 0.35); g.lineWidth = 1; g.stroke();
        g.restore();
      }
    }
    const bk = smooth(clamp((t - finAt - 1.8) / 1.2));
    if (bk > 0) { glow(g, tx, ty, mz * 0.45 * bk, seedCol, 0.55); glint(g, tx, ty, mz * 0.16 * bk, '#ffffff', 0.6 * bk, t * 0.3); }
  }
  function drawFinger(t) {
    if (drag == null) return;
    const a = fOn ? 1 : 0.45;
    glow(g, fX, fY, 30, coolCol, 0.4 * a);
    g.save(); g.translate(fX, fY); g.rotate(t * (reduced ? 0.6 : 2)); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(coolSoft, 0.55 * a); g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, 17, 0, 1.4); g.stroke(); g.beginPath(); g.arc(0, 0, 17, Math.PI, Math.PI + 1.4); g.stroke();
    g.restore();
  }
  // plot twist (even rounds): a tiny wishing star crosses and settles on a tree
  function drawWish(t, dt) {
    const k = clamp((t - twistAt) / 2.6), tr = trees[side < 0 ? 3 : 0];
    const ex = tr.x, ey = tr.y - tr.th - tr.cr * 1.25, sx0 = side < 0 ? X0 + W * 0.05 : X0 + W * 0.95, sy0 = Y0 + H * 0.06;
    if (k < 1) {
      const e = ease.inOutSine(k), px = lerp(sx0, ex, e), py = lerp(sy0, ey, e) - Math.sin(e * Math.PI) * H * 0.08;
      glow(g, px, py, 14, '#ffffff', 0.6); glint(g, px, py, 9, '#fff6dc', 0.85, t);
      if (!low && dt > 0 && Math.random() < 0.5) E.particles.emit({ x: px, y: py, vx: 0, vy: 6, life: 0.8, size: 4, colour: '#fff3d0', kind: 'glint', drag: 0.9 });
    } else {
      const tw = 0.5 + 0.5 * Math.sin(t * 1.6);
      glow(g, ex, ey, 12 + 4 * tw, '#fff6dc', 0.45 + 0.2 * tw); glint(g, ex, ey, 7 + 2 * tw, '#ffffff', 0.7, 0.3);
    }
  }
  let moteAcc = 0;
  function finaleMotes(t, dt) {
    const age = t - finAt; if (age > 3.2) return;
    moteAcc += dt * (low ? 3 : heavy ? 4 : 10);
    while (moteAcc >= 1) {
      moteAcc -= 1;
      if (heavy) E.particles.emit({ x: padX + (Math.random() - 0.5) * padRx * 2, y: padY - 4, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 12, life: 2, size: 4, colour: seedCol, drag: 0.98 });
      else E.particles.emit({ x: X0 + W * (0.1 + Math.random() * 0.8), y: Y0 + H * (0.05 + Math.random() * 0.25), vx: (Math.random() - 0.5) * 10, vy: 18 + Math.random() * 16, life: 2.2, size: 4 + Math.random() * 3, colour: Math.random() < 0.5 ? seedCol : coolSoft, kind: 'glint', drag: 0.99 });
    }
  }

  // -------------------------------------------------------------- input --
  return {
    get progress() { return prog; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      if (drag != null) {
        // a second finger: a soft answer, no progress (the first finger keeps the trail)
        const now = E.now();
        E.ripples.add(p.x, p.y, { colour: seedCol, speed: 34, alpha: 0.26, r: 4 });
        if (now - lastTwo > 0.25) { lastTwo = now; E.sound('bubble', { note: (noteOf(laid) + 3) % 10, intensity: 0.16, pan: panOf(p.x) }); E.haptic('tick'); glance = Math.max(glance, 0.5); }
        return;
      }
      if (landed) {
        const { sy } = seedGeom();
        if (Math.hypot(p.x - padX, p.y - sy) < mz) { seedPulse = 1; E.sound('bubble', { note: 6, intensity: 0.25 }); E.haptic('light'); E.ripples.add(padX, padY, { colour: seedCol, speed: 40, alpha: 0.35, r: 6 }); }
        return;
      }
      const near = Math.hypot(p.x - mx, p.y - my) < Math.max(56, mz * 0.85);
      const s = project(p.x, p.y, Math.max(0, shown - 0.05), Math.min(1, laid + 0.22));
      const ok = near || (s >= 0 && projD < TOL);
      E.ripples.add(p.x, p.y, { colour: coolSoft, speed: 40, alpha: ok ? 0.4 : 0.22, r: 4 });
      if (!ok) { glance = 1; E.sound('drip', { note: 2, intensity: 0.18, pan: panOf(p.x) }); E.haptic('tick'); return; }
      drag = p.id; fX = p.x; fY = p.y; fOn = true;
      E.sound('pluck', { note: noteOf(laid), intensity: 0.34, pan: panOf(p.x) }); E.haptic('light');
      feed(p.x, p.y);
    },
    move(p) { if (p.id !== drag) return; fX = p.x; fY = p.y; feed(p.x, p.y); },
    up(p) { if (p.id !== drag) return; drag = null; fOn = false; },
    assist() {
      if (finAt >= 0 || landed) return;
      assistTo = Math.min(1, Math.max(laid, prog) + STEP);
      if (E.locked) { wob.kick(0.5); E.checkpoint('wait'); }
      trailAt(laid, an); E.sound('pluck', { note: noteOf(laid), intensity: 0.3, pan: panOf(an.x) }); E.haptic('light');
    },
    pointAt(p) { const o = { x: 0, y: 0 }; return trailAt(clamp(p), o); },
    hint() {
      if (landed) { const { sy } = seedGeom(); return { tap: { x: padX, y: sy } }; }
      const s0 = Math.min(0.98, shown + 0.012), s1 = Math.min(1, Math.max(prog, shown) + BANK + 0.03), pts = [];
      for (let i = 0; i <= 18; i++) { trailAt(lerp(s0, s1, i / 18)); pts.push([tmp.x, tmp.y]); }
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      E.sound('shimmer', { intensity: 0.28 });
      if (twistKind === 0 && !low) for (const tr of trees) E.particles.burst(tr.x, tr.y - tr.th - tr.cr * 0.6, 4, { speed: 22, colour: blossomCol, life: 1.6, size: 5, gravity: 14, kind: 'glint' });
    },
    finish() {
      finAt = E.now();
      E.sound(heavy ? 'breathe-out' : 'chime', { intensity: 0.36 });
      E.ripples.add(padX, padY, { colour: seedCol, speed: heavy ? 30 : 50, alpha: 0.4, r: padRx * 0.3 });
    },
    destroy() {},
  };
}
