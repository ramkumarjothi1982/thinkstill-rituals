// GE-13 · MOON TIDE — crescent tide lever (lever pull).
// A tall moon window holds a small night sea. The crescent moon is the lever
// handle: it rides a silver rail set into the window's rim, from the top of
// the sky dome down to the shore. Pull it down and the wave rows lower their
// crests in direct response to where the lever sits — the far row first, the
// shore breaker last. At every notch the lever rests while you watch that
// wave flatten, then it lets you pull again. Win: the shoreline marker (a
// little driftwood post with a lantern) comes up out of the surf and lights.
//
// Photos are reflections on the water: rain-blue and wavering in sliced,
// rippling strips while their wave row is restless, then still and clear in
// their own colours once it flattens. The person's words are written in the
// sand at the foot of the shoreline marker.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, orb, roundRect, shadow as softShadow, canvas as makeCanvas, hex } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-13',
  howTo: 'Pull the crescent down; pause at each notch as a wave flattens.',
  steps: [
    'Hold the glowing crescent at the top of the moon window.',
    'Pull it down along the silver rail towards the shore.',
    'Pause at each notch and watch that wave flatten, until the shoreline marker shows.',
  ],
  tapAlt: 'each press lowers the crescent half a notch',
  words: 'Your words are written in the sand by the shoreline marker — lapped by restless surf at first, then resting clear as the tide calms.',
  photos: {
    where: 'Your photos shimmer as reflections on the moonlit water.',
    becomes: 'rippling, rain-blue reflections',
    touch: 'You calm them with the crescent lever;',
    change: 'as each wave flattens, its reflection stops wavering and comes back to its own clear colours.',
    payoff: 'At the end they lie still and bright on a mirror-calm sea under a full moon.',
  },
  finaleSec: 4.4,
};

const BANK = 0.04;          // how far input may run ahead of the gated state
const REST = 0.035;         // a flat row still breathes a tiny ripple
const COLS = 40;            // crest samples per wave row
const MAXR = 6;             // max wave rows
// crescent geometry on a unit circle: outer disc minus an offset inner disc
const CD = 0.36, CRI = 0.92;
const CXI = (1 - CRI * CRI + CD * CD) / (2 * CD), CYI = Math.sqrt(1 - CXI * CXI);
const TH_O = Math.atan2(CYI, CXI), TH_I = Math.atan2(CYI, CXI - CD);
// photo reflection layouts (u across the window, v down the sea)
const LAYOUT = {
  1: [[0.46, 0.46]],
  2: [[0.3, 0.36], [0.66, 0.62]],
  3: [[0.25, 0.32], [0.72, 0.36], [0.47, 0.63]],
  4: [[0.26, 0.28], [0.7, 0.3], [0.3, 0.61], [0.72, 0.63]],
  5: [[0.2, 0.28], [0.5, 0.24], [0.8, 0.29], [0.33, 0.61], [0.68, 0.63]],
  6: [[0.19, 0.27], [0.5, 0.23], [0.81, 0.27], [0.2, 0.6], [0.5, 0.64], [0.8, 0.6]],
  7: [[0.15, 0.26], [0.385, 0.22], [0.615, 0.22], [0.85, 0.26], [0.24, 0.6], [0.5, 0.64], [0.76, 0.6]],
};
const SIZE_K = { 1: [0.46, 0.62], 2: [0.34, 0.46], 3: [0.3, 0.4], 4: [0.27, 0.36], 5: [0.24, 0.32], 6: [0.24, 0.32], 7: [0.21, 0.29] };

const TRAIL_PASSES = [[10, 0.1], [4, 0.2], [1.4, 0.5]], THREAD_PASSES = [[6, 0.25], [1.6, 1]];
const lum = (h) => { const [r, g, b] = hex(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = E.reduced, lowStim = E.lowStim, heavy = E.heavy;
  const DPR = Math.min(2, globalThis.devicePixelRatio || 1);
  const R = E.rand;
  const round = E.round, calm0 = E.calm;
  // ---- loop rounds: fresh arrangement, colours and hero photo; calmer start
  const N = round === 1 ? 4 : 3 + Math.floor(R() * 3);           // wave rows = lever notches (3–5)
  const side = round === 1 ? 1 : (R() < 0.5 ? 1 : -1);            // rail on the right (1) or left (-1)
  const tint = round === 1 ? 0 : R();                              // colour variation within the palette
  const mood = round === 1 ? 0 : (round - 1) % 3;                   // 0 moonlit · 1 rose dusk · 2 deep starry night
  const twistKind = ((round + (E.seed % 1013)) % 2) ? 'island' : 'lights';   // alternates round by round
  const A0 = (heavy ? 0.8 : 1) * (1 - calm0 * 0.55);               // starting agitation
  const chop = heavy ? 0.55 : 1;                                   // energetic feelings: choppier water
  const speedK = (reduced ? 0.45 : 1) * (heavy ? 0.75 : 1);

  // ---- colours (palette-driven so every realm looks right)
  const INK = '#04061a';
  const darkRealm = lum(pal.sky) < 0.3;
  const moon0 = mix(mix('#fff3d6', pal.glow, 0.16), '#dff2ff', tint * 0.3);
  const moonCol = mood === 1 ? mix(moon0, '#ffd2b0', 0.3) : mood === 2 ? mix(moon0, '#e2f0ff', 0.4) : moon0;
  const top0 = mix(pal.deep, INK, (darkRealm ? 0.35 : 0.58) + (mood === 2 ? 0.22 : 0));
  const skyTop = mood === 1 ? mix(top0, '#3a1f4a', 0.3) : top0;
  const hor0 = mix(mix(pal.sky, pal.deep, darkRealm ? 0.1 : 0.4), pal.glow, 0.14 + tint * 0.08);
  const skyHor = mood === 1 ? mix(hor0, '#ffad94', 0.42) : mood === 2 ? mix(hor0, pal.deep, 0.42) : hor0;
  const seaFar = mix(skyHor, pal.deep, 0.6);
  const seaNear = mix(mix(pal.deep, INK, 0.6), pal.accent, 0.05 + tint * 0.05);
  const crestHi = mix(pal.glow, '#ffffff', 0.45);
  const sandBase = mix('#ebd2a6', pal.warm || '#ffb37a', 0.12);
  const sandDry = darkRealm ? mix(mix(sandBase, pal.deep, 0.14), moonCol, 0.12) : mix(sandBase, pal.sky, 0.08);
  const sandWet = mix(mix(sandDry, pal.deep, 0.5), pal.glow, 0.06);
  const sandInk = mix('#3e2f24', pal.ink || INK, 0.3);
  const brass = mix('#e2c992', pal.glow, 0.22);
  const brassDark = mix('#6a5232', pal.deep, 0.35);
  const lampCol = mix('#ffd99a', pal.warm || '#ffb37a', 0.35);
  const moonHalo = mix(moonCol, lampCol, 0.3);

  // ---- geometry (re-fitted on resize)
  let s = 1, cr = 20, W = 300, H = 440, cx = 0, x0 = 0, x1 = 0, y0 = 0, y1 = 0, ar = 150, ary = 150, ac = 0, br = 20;
  let horizonY = 0, shoreY = 0, shoreH = 80, seaH = 200, wordsY = 0, wSize = 13, wLines = 2, mX = 0, mBase = 0, mH = 40;
  const rowY = new Float32Array(MAXR), ampPx = new Float32Array(MAXR), lam = new Float32Array(MAXR);
  const crestY = new Float32Array(MAXR * (COLS + 1)), crestH = new Float32Array(MAXR * (COLS + 1)), colX = new Float32Array(COLS + 1);
  const RAILMAX = 480;
  const railX = new Float32Array(RAILMAX), railY = new Float32Array(RAILMAX), railC = new Float32Array(RAILMAX);
  let railN = 0, railL = 1;
  let skyGrad = null, farGrad = null, sandGrad = null, swashGrad = null, rimGrad = null, moonGrad = null, sheenGrad = null, postGrad = null;
  const bandGrad = [];
  // stars (positions resolved on fit)
  const STARS = lowStim ? 18 : mood === 2 ? 52 : 34;
  const starU = new Float32Array(STARS), starV = new Float32Array(STARS), starS = new Float32Array(STARS), starP = new Float32Array(STARS);
  const starX = new Float32Array(STARS), starY = new Float32Array(STARS), starOk = new Uint8Array(STARS);
  for (let i = 0; i < STARS; i++) { starU[i] = 0.06 + R() * 0.88; starV[i] = 0.04 + Math.pow(R(), 1.3) * 0.82; starS[i] = 0.5 + R() * 1.1; starP[i] = R() * TAU; }
  // rain
  const RAIN = lowStim ? 10 : reduced ? 12 : 26;
  const rainU = new Float32Array(RAIN), rainV = new Float32Array(RAIN), rainSp = new Float32Array(RAIN), rainLen = new Float32Array(RAIN);
  for (let i = 0; i < RAIN; i++) { rainU[i] = R(); rainV[i] = R(); rainSp[i] = 0.35 + R() * 0.3; rainLen[i] = 0.5 + R() * 0.6; }
  // storm clouds (soft blobs from one cached sprite) part as the tide calms
  const CLOUD = makeCanvas(64, 64);
  {
    const c = CLOUD.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    const col = mix(mix(skyTop, pal.deep, 0.4), '#8a90b8', 0.18);
    gr.addColorStop(0, rgba(col, 0.95)); gr.addColorStop(0.55, rgba(col, 0.55)); gr.addColorStop(1, rgba(col, 0));
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  }
  const NCL = lowStim ? 2 : 3, BLOB = 5;
  const clU = new Float32Array(NCL), clV = new Float32Array(NCL), clW = new Float32Array(NCL), clDir = new Float32Array(NCL);
  const blX = new Float32Array(NCL * BLOB), blY = new Float32Array(NCL * BLOB), blR = new Float32Array(NCL * BLOB);
  for (let i = 0; i < NCL; i++) {
    clU[i] = 0.1 + R() * 0.8; clV[i] = 0.18 + i * 0.22 + R() * 0.08; clW[i] = 0.32 + R() * 0.18; clDir[i] = (i % 2 ? 1 : -1) * side;
    for (let b = 0; b < BLOB; b++) { blX[i * BLOB + b] = (b / (BLOB - 1) - 0.5) * (0.9 + R() * 0.2); blY[i * BLOB + b] = -Math.sin((b / (BLOB - 1)) * Math.PI) * (0.25 + R() * 0.2); blR[i * BLOB + b] = 0.32 + R() * 0.22; }
  }
  // swash edge samples
  const SW = 14, swX = new Float32Array(SW + 1), swY = new Float32Array(SW + 1);
  // sand speckles (fixed in normalised shore space)
  const SPK = lowStim ? 30 : 60, spU = new Float32Array(SPK), spV = new Float32Array(SPK), spS = new Float32Array(SPK);
  for (let i = 0; i < SPK; i++) { spU[i] = R(); spV[i] = 0.25 + R() * 0.75; spS[i] = R(); }
  // little water ripples of our own (perspective ellipses inside the window)
  const RP = 10;
  const rpX = new Float32Array(RP), rpY = new Float32Array(RP), rpR = new Float32Array(RP), rpA = new Float32Array(RP), rpV = new Float32Array(RP);
  let rpN = 0;
  function addRipple(x, y, r = 4, a = 0.6, v = 40) {
    let i = rpN < RP ? rpN++ : 0;
    if (rpN >= RP) { let lo = 1; for (let k = 0; k < RP; k++) if (rpA[k] < lo) { lo = rpA[k]; i = k; } }
    rpX[i] = x; rpY[i] = y; rpR[i] = r; rpA[i] = a; rpV[i] = v * s;
  }

  // ---- wave rows (springs on crest height)
  const amp = new Float32Array(MAXR), ampV = new Float32Array(MAXR), phase = new Float32Array(MAXR), flat = new Uint8Array(MAXR), sweep = new Float32Array(MAXR);
  for (let k = 0; k < N; k++) { amp[k] = A0 * (0.82 + 0.18 * (k / Math.max(1, N - 1))); phase[k] = R() * TAU; sweep[k] = -1; }

  // ---- photo reflections
  const nP = photos.n;
  const slots = [];
  {
    const count = nP || 3;
    const pat = LAYOUT[Math.min(7, count)] || LAYOUT[3];
    for (let j = 0; j < count; j++) {
      const [u, v] = pat[j % pat.length];
      const spread = count === 1 ? 0.28 : 0.05;            // a lone hero reflection moves more between rounds
      const ju = round > 1 ? (R() - 0.5) * spread : 0, jv = round > 1 ? (R() - 0.5) * spread * 0.6 : 0;
      slots.push({
        ph: nP ? (j + round - 1) % nP : -1,
        u: side > 0 ? u + ju : 1 - u - ju, v: clamp(v + jv, 0.18, 0.74),
        x: 0, y: 0, size: 0, w: 0, h: 0, slices: 12, cClear: null, cStorm: null, pw: 0,
        ph0: R() * TAU, localA: 1, cleared: false, clearAt: -1,
      });
    }
  }

  // ---- state
  let wanted = 0;           // lever position the input asks for (0..1)
  let rot = 0;              // lever position actually allowed (after the world law)
  let hp = 0, hv = 0;       // displayed lever position (spring with a little inertia)
  let assistTo = null;
  let drag = null, fingerQ = 0, fingX = 0, fingY = 0, grabK = 0;
  let lastNote = 0, lastHap = 0, lastRefuse = -9, lastLockCk = -9;
  let markerVis = 0, lampAt = -1, doneFlag = false, finAt = -1, twAt = -1;
  let still = 0, rainAmt = 1, holdQ = -1;
  const wob = new Wobble();
  const tmp = { x: 0, y: 0, nx: 1, ny: 0 }, tmp2 = { x: 0, y: 0, nx: 1, ny: 0 }, pr = { p: 0, d: 0 };
  const notchP = (k) => (k + 1) / N;

  // ======================================================= geometry fit ==
  function fit() {
    s = stage.s;
    cr = clamp(27 * s, 20, 34);
    const m = cr * 0.85 + 6;
    // tall stages get a round-topped window; short ones a wider window with a flatter dome
    W = Math.min(stage.w - 2 * m, stage.h * 0.98, 420);
    const H0 = Math.min(stage.h - 6, W * 1.5);
    ar = W / 2; ary = Math.min(ar, H0 * lerp(0.24, 0.34, invLerp(260, 420, H0)));   // short stages: a flatter dome, more sea
    // keep the crescent's start (just below the top of the dome) inside the stage;
    // sit the window high so the bottom of the stage (law toasts) stays clear of the words
    const topRoom = Math.max(4, cr * 1.15 - ary * 0.049);
    // leave a strip under the window for the law's toast so it never sits on the words in the sand
    const botRoom = clamp(stage.h * 0.06, 16, 32);
    H = Math.min(H0, stage.h - topRoom - botRoom);
    cx = stage.cx; x0 = cx - W / 2; x1 = cx + W / 2;
    const spare = stage.h - H;
    y0 = stage.y + clamp(spare * 0.4, topRoom, Math.max(topRoom, spare - botRoom));
    if (y0 + H > stage.y + stage.h - 2) H = stage.y + stage.h - 2 - y0;
    y1 = y0 + H; ac = y0 + ary; br = Math.min(W * 0.09, 24);
    horizonY = ac + (H - ary) * 0.06;
    shoreH = clamp(H * 0.2, 36, 110);
    shoreY = y1 - shoreH;
    seaH = shoreY - horizonY;
    for (let k = 0; k < N; k++) {
      rowY[k] = horizonY + seaH * Math.pow((k + 1) / (N + 0.35), 1.12);
      ampPx[k] = seaH * (0.028 + 0.05 * (k + 1) / N);
      lam[k] = W * (0.16 + 0.13 * (k + 1) / N);
    }
    for (let i = 0; i <= COLS; i++) colX[i] = x0 - 4 + (W + 8) * (i / COLS);
    // words + marker on the shore
    wSize = clamp(13 * s + 1, 12, 17);
    wLines = shoreH > 72 ? 2 : 1;
    wordsY = shoreY + shoreH * (wLines === 2 ? 0.66 : 0.7);
    mX = cx - side * W * 0.13; mBase = shoreY + shoreH * (wLines === 2 ? 0.32 : 0.36); mH = clamp(shoreH * 0.4, 20, 44);
    buildRail();
    buildGradients();
    // stars inside the dome
    for (let i = 0; i < STARS; i++) {
      const x = x0 + starU[i] * W, y = y0 + 6 + starV[i] * (horizonY - y0 - 10);
      starX[i] = x; starY[i] = y;
      starOk[i] = y > ac || Math.hypot((x - cx) / ar, (y - ac) / ary) < 1 - 8 / ary ? 1 : 0;
    }
    buildPhotos();
  }

  function buildRail() {
    const a0 = side > 0 ? -0.4 * Math.PI : -0.6 * Math.PI, a1 = side > 0 ? 0 : -Math.PI;
    const arcLen = (ar + ary) * 0.5 * Math.abs(a1 - a0);
    const yEnd = shoreY + shoreH * 0.18, lineLen = Math.max(1, yEnd - ac);
    const step = Math.max(2.5, (arcLen + lineLen) / (RAILMAX - 4));
    const nA = Math.max(8, Math.ceil(arcLen / step)), nL = Math.max(4, Math.ceil(lineLen / step));
    let n = 0;
    for (let i = 0; i <= nA; i++) { const a = lerp(a0, a1, i / nA); railX[n] = cx + Math.cos(a) * ar; railY[n] = ac + Math.sin(a) * ary; n++; }
    for (let i = 1; i <= nL; i++) { railX[n] = cx + side * ar; railY[n] = lerp(ac, yEnd, i / nL); n++; }
    // the dome arc counts a little shorter than the drop to the shore, so most of the travel
    // (and the notches) sit on the long pull down towards the sand
    railN = n; railC[0] = 0;
    for (let i = 1; i < n; i++) railC[i] = railC[i - 1] + Math.hypot(railX[i] - railX[i - 1], railY[i] - railY[i - 1]) * (i <= nA ? 0.65 : 1);
    railL = railC[n - 1] || 1;
  }
  /** point on the rail at lever position p (0..1), with the outward normal */
  function railPoint(p, out) {
    const target = clamp(p) * railL;
    let lo = 0, hi = railN - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (railC[m] < target) lo = m + 1; else hi = m; }
    const k = Math.max(1, lo), c0 = railC[k - 1], c1 = railC[k], f = c1 > c0 ? (target - c0) / (c1 - c0) : 0;
    out.x = lerp(railX[k - 1], railX[k], f); out.y = lerp(railY[k - 1], railY[k], f);
    if (out.y < ac - 0.5) { const dx = (out.x - cx) / (ar * ar), dy = (out.y - ac) / (ary * ary), d = Math.hypot(dx, dy) || 1; out.nx = dx / d; out.ny = dy / d; } else { out.nx = side; out.ny = 0; }
    return out;
  }
  /** nearest lever position to a finger */
  function project(x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < railN; i += 2) { const d = (railX[i] - x) * (railX[i] - x) + (railY[i] - y) * (railY[i] - y); if (d < bd) { bd = d; best = i; } }
    const lo = Math.max(0, best - 2), hi = Math.min(railN - 1, best + 2);
    for (let i = lo; i <= hi; i++) { const d = (railX[i] - x) * (railX[i] - x) + (railY[i] - y) * (railY[i] - y); if (d < bd) { bd = d; best = i; } }
    pr.p = railC[best] / railL; pr.d = Math.sqrt(bd);
    if (pr.p > 0.985) pr.p = 1;            // the shore cradle catches the crescent
    return pr;
  }

  function buildGradients() {
    skyGrad = g.createLinearGradient(0, y0, 0, horizonY);
    skyGrad.addColorStop(0, skyTop); skyGrad.addColorStop(0.62, mix(skyTop, skyHor, 0.55)); skyGrad.addColorStop(1, skyHor);
    farGrad = g.createLinearGradient(0, horizonY, 0, shoreY);
    farGrad.addColorStop(0, mix(skyHor, seaFar, 0.45)); farGrad.addColorStop(0.3, seaFar); farGrad.addColorStop(1, seaNear);
    bandGrad.length = 0;
    for (let k = 0; k < N; k++) {
      const f = N > 1 ? k / (N - 1) : 0;
      const base = mix(seaFar, seaNear, 0.25 + f * 0.75);
      const top = rowY[k] - ampPx[k] * 1.2, bot = k < N - 1 ? rowY[k + 1] + ampPx[k + 1] : shoreY + 6;
      const gr = g.createLinearGradient(0, top, 0, bot);
      gr.addColorStop(0, mix(base, skyHor, 0.55)); gr.addColorStop(0.1, mix(base, pal.glow, 0.16)); gr.addColorStop(0.42, base); gr.addColorStop(1, mix(base, INK, 0.5));
      bandGrad.push(gr);
    }
    sandGrad = g.createLinearGradient(0, shoreY - 4, 0, y1);
    sandGrad.addColorStop(0, sandWet); sandGrad.addColorStop(0.3, mix(sandWet, sandDry, 0.6)); sandGrad.addColorStop(1, sandDry);
    swashGrad = g.createLinearGradient(0, shoreY - 2, 0, shoreY + shoreH * 0.55);
    swashGrad.addColorStop(0, rgba(mix(seaNear, pal.glow, 0.2), 0.85)); swashGrad.addColorStop(1, rgba(mix(seaNear, pal.glow, 0.35), 0.35));
    rimGrad = g.createLinearGradient(x0, y0, x1, y1);
    rimGrad.addColorStop(0, 'rgba(255,255,255,0.7)'); rimGrad.addColorStop(0.4, 'rgba(255,255,255,0.14)'); rimGrad.addColorStop(1, rgba(pal.glow, 0.45));
    moonGrad = g.createRadialGradient(-cr * 0.55, -cr * 0.2, cr * 0.05, -cr * 0.2, 0, cr * 1.15);
    moonGrad.addColorStop(0, '#ffffff'); moonGrad.addColorStop(0.35, moonCol); moonGrad.addColorStop(1, mix(moonCol, pal.deep, 0.32));
    postGrad = g.createLinearGradient(mX - 3 * s, 0, mX + 3 * s, 0);
    postGrad.addColorStop(0, '#5a4330'); postGrad.addColorStop(0.45, '#b99a72'); postGrad.addColorStop(1, '#4a3424');
    sheenGrad = g.createLinearGradient(x0, 0, x0 + W * 0.5, 0);
    sheenGrad.addColorStop(0, 'rgba(255,255,255,0)'); sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.10)'); sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
  }

  function buildPhotos() {
    const count = slots.length;
    const [kw, kh] = SIZE_K[Math.min(7, count)] || SIZE_K[3];
    const base = Math.min(W * kw, seaH * kh * lerp(1.2, 1, invLerp(110, 200, seaH))) * (nP ? 1 : 0.62);
    for (const sl of slots) {
      sl.x = x0 + sl.u * W; sl.y = horizonY + sl.v * seaH;
      sl.size = base * lerp(0.86, 1.12, invLerp(0.2, 0.74, sl.v));
      const { w, h } = sl.ph >= 0 ? photos.size(sl.ph, 'circle', sl.size) : { w: sl.size, h: sl.size };
      sl.w = w; sl.h = h * 0.94;    // a touch of perspective on the water
      sl.slices = clamp(Math.round(h / 2), 18, 56);
      const pw = Math.max(8, Math.ceil(w * DPR)), phh = Math.max(8, Math.ceil(h * DPR));
      if (sl.cClear && sl.pw === pw) continue;
      sl.pw = pw;
      sl.cClear = makeCanvas(pw, phh); sl.cStorm = makeCanvas(pw, phh);
      const a = sl.cClear.getContext('2d'), b = sl.cStorm.getContext('2d');
      a.setTransform(DPR, 0, 0, DPR, 0, 0); b.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (sl.ph >= 0) {
        photos.draw(a, sl.ph, w / 2, h / 2, sl.size, { shape: 'circle', shadow: false });
        // the restless reflection: rain-toned and softened by a few offset passes (smooth on every browser)
        const rr = Math.max(1.4, sl.size * 0.024);
        photos.draw(b, sl.ph, w / 2, h / 2, sl.size, { shape: 'circle', shadow: false, tone: 'rain', toneMix: 1, alpha: 0.6 });
        for (let k = 0; k < 6; k++) {
          const an = (k / 6) * TAU + 0.3;
          photos.draw(b, sl.ph, w / 2 + Math.cos(an) * rr, h / 2 + Math.sin(an) * rr * 0.6, sl.size * 0.985, { shape: 'circle', shadow: false, tone: 'rain', toneMix: 1, alpha: 0.24 });
        }
      } else { paintStar(a, w, false); paintStar(b, w, true); }
      for (const c of [a, b]) {
        c.globalCompositeOperation = 'destination-out';
        const fg = c.createLinearGradient(0, h * 0.58, 0, h);
        fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.62)');
        c.fillStyle = fg; c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'source-over';
      }
    }
  }
  /** default reflection (no photos): a reflected star resting in a pool of moonlight */
  function paintStar(c, w, storm) {
    const r = w / 2;
    const gr = c.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, rgba(storm ? mix(moonCol, pal.glow, 0.6) : '#ffffff', storm ? 0.75 : 1));
    gr.addColorStop(0.22, rgba(storm ? mix(pal.glow, pal.deep, 0.2) : moonCol, storm ? 0.55 : 0.9));
    gr.addColorStop(0.6, rgba(pal.glow, storm ? 0.16 : 0.28)); gr.addColorStop(1, rgba(pal.glow, 0));
    c.fillStyle = gr; c.beginPath(); c.arc(r, r, r, 0, TAU); c.fill();
    c.fillStyle = storm ? rgba('#ffffff', 0.35) : '#ffffff';
    for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(r, r, r * (storm ? 0.5 : 0.62), r * 0.05, i * Math.PI / 2, 0, TAU); c.fill(); }
    c.beginPath(); c.arc(r, r, r * 0.09, 0, TAU); c.fill();
  }

  fit();
  E.onResize(fit);

  // ======================================================= simulation ==
  /** the furthest the lever may go: it rests at each notch until that wave has flattened */
  function holdCap() { for (let k = 0; k < N; k++) if (!flat[k]) return notchP(k); return 1; }
  function rowTarget(k) {
    if (finAt >= 0) return REST * 0.5;
    const local = 1 - smooth(clamp(rot * N - k));
    return A0 * local * lerp(1, 0.84, rot) + REST;
  }
  /** wave agitation at height y (0..~1) */
  function ampAt(y) {
    if (y <= rowY[0]) return amp[0] * 0.7;
    for (let k = 0; k < N - 1; k++) if (y < rowY[k + 1]) { const u = (y - rowY[k]) / (rowY[k + 1] - rowY[k]); return lerp(amp[k], amp[k + 1], smooth(invLerp(0.55, 1, u))); }
    return amp[N - 1];
  }
  function hap(kind, gap = 0.09) { const t = E.now(); if (t - lastHap < gap) return; lastHap = t; E.haptic(kind); }

  function simulate(dt, t) {
    // input / assist → wanted (ratchet: the lever only goes down)
    const cap = holdCap();
    if (drag != null) { const ask = Math.min(fingerQ, cap); if (ask > wanted) wanted = Math.min(ask, rot + BANK); }
    if (assistTo != null) {
      const to = Math.min(assistTo, cap);
      if (to > wanted) wanted = Math.min(to, wanted + dt * 0.34, rot + BANK);
      if (wanted >= assistTo - 1e-4 || (to <= wanted + 1e-4 && rot >= to - 1e-3)) assistTo = null;
    }
    const prev = rot;
    rot = Math.max(rot, E.gate(wanted));
    if (wanted > rot + BANK) wanted = rot + BANK;
    if (wanted > cap) wanted = cap;
    // descending pentatonic notes as the lever moves down
    const step = Math.floor(rot * 18 + 1e-6);
    if (step > lastNote) { lastNote = step; E.sound('pluck', { note: 9 - Math.min(9, Math.floor(rot * 9.99)), intensity: 0.22, pan: side * 0.35 }); hap('tick'); }
    // notches
    for (let k = 0; k < N; k++) {
      const np = notchP(k);
      if (prev < np - 1e-4 && rot >= np - 1e-4) { E.sound('glass', { note: 7 - k, intensity: 0.32 }); E.checkpoint('step'); wob.kick(0.25); }
    }
    // displayed lever: spring with a little stretch towards a held finger
    let stretch = 0;
    if (drag != null) stretch = clamp((fingerQ - rot) * 0.22, -0.02, 0.028);
    const tgt = rot + stretch;
    hv += (-(hp - tgt) * 150 - hv * 19) * dt; hp += hv * dt;
    if (hp < 0) { hp = 0; hv = 0; }
    // wave rows follow the lever (direct response, with water's own lag)
    let sum = 0;
    for (let k = 0; k < N; k++) {
      const tg = rowTarget(k);
      ampV[k] += (-(amp[k] - tg) * 15 - ampV[k] * 6.2) * dt; amp[k] += ampV[k] * dt;
      if (amp[k] < 0) { amp[k] = 0; ampV[k] *= -0.3; }
      phase[k] += dt * lerp(0.32, 1.45, clamp(amp[k])) * speedK * (k % 2 ? -1 : 1) * (0.8 + 0.12 * k);
      sum += amp[k];
      if (!flat[k] && finAt < 0 && rot >= notchP(k) - 1e-4 && Math.abs(amp[k] - tg) < 0.045 && Math.abs(ampV[k]) < 0.22) {
        flat[k] = 1; sweep[k] = t;
        E.sound(k === N - 1 ? 'settle' : 'drip', { note: 5 - k, intensity: 0.38 });
        hap('soft', 0);
        addRipple(cx + side * W * 0.18, rowY[k] + 2, 6, 0.5, 46);
      }
      if (sweep[k] >= 0 && t - sweep[k] > 1.6) sweep[k] = -1;
    }
    still = 1 - clamp(sum / (N * Math.max(0.05, A0)));
    rainAmt = (1 - smooth(rot * 1.15)) * (1 - calm0 * 0.8) * (finAt >= 0 ? 0 : 1);
    // the shoreline marker comes up out of the surf as the breaker flattens
    const mt = smooth(invLerp(A0 * 0.42 + REST, REST * 1.6, amp[N - 1])) * (rot > (N - 1) / N ? 1 : 0.15);
    markerVis += (Math.max(mt, finAt >= 0 ? 1 : 0) - markerVis) * Math.min(1, dt * 2.6);
    if (lampAt < 0 && markerVis > 0.86) { lampAt = t; E.sound('chime', { intensity: 0.4 }); hap('success', 0); E.react('gasp'); addRipple(mX, mBase, 6, 0.6, 50); }
    if (!doneFlag && rot >= 0.998 && flat[N - 1] && markerVis > 0.9 && drag == null && assistTo == null) doneFlag = true;
    // photo reflections become still and clear as their water flattens
    for (const sl of slots) {
      if (sl.cleared || rot < 0.02) continue;
      if (sl.localA < 0.1) {
        sl.cleared = true; sl.clearAt = t;
        if (sl.ph >= 0) { photos.dust(sl.ph, sl.x, sl.y, sl.size * 0.8, heavy || lowStim ? 6 : 12, { shape: 'circle', up: 22, speed: 16, sizePx: 4 }); E.checkpoint('photo', sl.ph); }
        else E.particles.burst(sl.x, sl.y, reduced ? 3 : 6, { speed: 26, colour: crestHi, life: 1.2, size: 5 });
        E.sound('shimmer', { intensity: 0.26 });
        addRipple(sl.x, sl.y + sl.h * 0.4, sl.w * 0.3, 0.45, 30);
      }
    }
    // ripples
    for (let i = 0; i < rpN; i++) { rpA[i] = Math.max(0, rpA[i] - dt * 0.55); rpR[i] += rpV[i] * dt; rpV[i] *= Math.pow(0.97, dt * 60); }
    // resting at a notch while that wave flattens? (drawn as a ring filling around the crescent)
    holdQ = -1;
    const capNow = holdCap();
    if (finAt < 0 && rot >= capNow - 1e-4) {
      const k = Math.round(capNow * N) - 1;
      if (k >= 0 && k < N && !flat[k]) holdQ = clamp(1 - Math.abs(amp[k] - rowTarget(k)) / Math.max(0.12, A0 * 0.6));
    }
    wob.update(dt);
    grabK = Math.max(0, grabK - dt * (drag != null ? 0 : 2.5));
    if (drag != null) grabK = Math.min(1, grabK + dt * 6);
  }

  // ========================================================== drawing ==
  function archPath(i = 0) {
    const r = ar - i, ry = ary - i, b = Math.max(2, br - i);
    g.beginPath();
    g.moveTo(x0 + i, ac);
    g.ellipse(cx, ac, r, ry, 0, Math.PI, 0, false);
    g.lineTo(x1 - i, y1 - i - b);
    g.arcTo(x1 - i, y1 - i, x1 - i - b, y1 - i, b);
    g.lineTo(x0 + i + b, y1 - i);
    g.arcTo(x0 + i, y1 - i, x0 + i, y1 - i - b, b);
    g.closePath();
  }
  function crestPoints(t) {
    for (let k = 0; k < N; k++) {
      const A = amp[k], ap = ampPx[k], L = lam[k], ph = phase[k], o = k * (COLS + 1);
      for (let i = 0; i <= COLS; i++) {
        const x = colX[i], th = (x - x0) / L * TAU + ph;
        const s1 = Math.sin(th), peak = Math.pow((s1 + 1) * 0.5, 1.7) * 1.5 - 0.45;   // sharp crests, broad troughs
        const hgt = 0.62 * lerp(s1, peak, 0.45 + 0.4 * chop) + 0.24 * chop * Math.sin(2.1 * th + 1.7 + ph * 0.5) + 0.2 * Math.sin(0.43 * th - ph * 0.6 + k * 1.3);
        const ripple = 0.07 * Math.sin(th * 2.6 + t * 0.9 + k) + 0.05 * Math.sin(th * 0.7 - t * 0.5);
        crestH[o + i] = hgt;
        crestY[o + i] = rowY[k] - (A * hgt + ripple * (0.6 + A)) * ap;
      }
    }
  }
  function traceCrest(k) {
    const o = k * (COLS + 1);
    g.moveTo(colX[0], crestY[o]);
    for (let i = 1; i < COLS; i++) { const mx = (colX[i] + colX[i + 1]) / 2, my = (crestY[o + i] + crestY[o + i + 1]) / 2; g.quadraticCurveTo(colX[i], crestY[o + i], mx, my); }
    g.lineTo(colX[COLS], crestY[o + COLS]);
  }

  function frame(dt, t) {
    simulate(dt, t);
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.6)) : 0;
    const free = finAt >= 0 ? ease.inOutSine(clamp((t - finAt - 0.25) / 2.9)) : 0;
    // crescent position (rides the rail; floats free as a full moon in the finale)
    railPoint(hp, tmp);
    let mx = tmp.x, my = tmp.y, mnx = tmp.nx, mny = tmp.ny;
    const wv = reduced ? 0 : wob.v * 3.2;
    mx += mnx * wv; my += mny * wv;
    if (free > 0) {
      const bx = cx + side * W * 0.2, by = y0 + (horizonY - y0) * 0.52, qx = cx + side * W * 0.44, qy = (my + by) / 2;
      const k = free, ax = lerp(lerp(mx, qx, k), lerp(qx, bx, k), k), ay = lerp(lerp(my, qy, k), lerp(qy, by, k), k);
      mx = ax; my = ay;
      const a = Math.atan2(mny, mnx), a2 = lerp(a, side > 0 ? -0.6 : Math.PI + 0.6, k); mnx = Math.cos(a2); mny = Math.sin(a2);
    }
    const moonR = cr * (1 + 0.32 * free) * (1 + 0.06 * grabK);
    crestPoints(t);

    // ---- window: soft shadow + outer light
    softShadow(g, cx, y1 + 5, W * 0.5, 12 * s, 0.32);
    glow(g, cx, (y0 + y1) / 2, Math.max(W, H) * 0.62, pal.glow, 0.06 + 0.06 * still + 0.05 * fin);

    g.save();
    archPath(); g.clip();
    drawSky(t, mx, my, fin);
    drawSea(t, mx, my, fin);
    drawShore(t, fin);
    drawRain(t);
    // inner glass edge (depth)
    g.strokeStyle = rgba(INK, 0.28); g.lineWidth = 9; archPath(); g.stroke();
    g.restore();

    drawRim(t);
    drawRail(t, fin);
    drawCrescent(t, mx, my, mnx, mny, moonR, free, fin);
    drawThread(mx, my);
  }

  function drawSky(t, mx, my, fin) {
    g.fillStyle = skyGrad; g.fillRect(x0 - 2, y0 - 2, W + 4, horizonY - y0 + 4);
    // stars brighten as the sea calms
    const sa = 0.25 + 0.6 * still + 0.15 * fin;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < STARS; i++) {
      if (!starOk[i]) continue;
      const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * (0.6 + starS[i] * 0.5) + starP[i]);
      g.globalAlpha = sa * tw * (0.5 + starS[i] * 0.35); g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(starX[i], starY[i], starS[i] * s * 0.9, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
    // storm clouds drift apart and thin out as the tide calms
    const ca = (0.62 - 0.5 * calm0) * (1 - smooth(still * 1.1)) * (1 - fin);
    if (ca > 0.01) {
      const hy = horizonY - y0;
      for (let i = 0; i < NCL; i++) {
        const part = still * 0.55 * clDir[i];
        const ccx = x0 + W * (clU[i] + part + Math.sin(t * 0.05 * speedK + i * 2) * 0.03), ccy = y0 + hy * clV[i], cw = W * clW[i];
        g.globalAlpha = ca;
        for (let b = 0; b < BLOB; b++) {
          const j = i * BLOB + b, rr = cw * blR[j];
          g.drawImage(CLOUD, ccx + blX[j] * cw - rr, ccy + blY[j] * cw * 0.5 - rr * 0.62, rr * 2, rr * 1.24);
        }
        g.globalAlpha = 1;
        glow(g, ccx, ccy - cw * 0.16, cw * 0.5, moonCol, 0.05 * ca);
      }
    }
    // drifting mist bands (thin out as the tide calms)
    const ma = 0.2 * (1 - still * 0.6) * (1 - fin * 0.6);
    if (ma > 0.005) for (let i = 0; i < 3; i++) {
      const u = ((0.15 + i * 0.37 + t * 0.006 * (i + 1) * speedK) % 1.5) - 0.25;
      const y = y0 + (horizonY - y0) * (0.4 + i * 0.2);
      g.save(); g.translate(x0 + u * W, y); g.scale(4.2, 0.55); glow(g, 0, 0, W * 0.16, mix(pal.glow, '#ffffff', 0.5), ma); g.restore();
    }
    // moonlight on the sky
    glow(g, mx, my, cr * 5.5, moonCol, 0.22 + 0.12 * still + 0.2 * fin);
    // horizon glow
    g.save(); g.translate(cx, horizonY); g.scale(5, 0.5); glow(g, 0, 0, W * 0.13, mix(skyHor, '#ffffff', 0.4), 0.35 + 0.2 * still); g.restore();
    // twist: a hidden island rises at the horizon
    if (twAt >= 0 && twistKind === 'island') drawIsland(t);
    if (twAt >= 0 && twistKind === 'lights') drawLights(t);
  }

  function drawIsland(t) {
    const k = ease.outCubic(clamp((t - twAt) / 1.8));
    if (k <= 0) return;
    const ix = cx - side * W * 0.27, iw = W * 0.2, ih = H * 0.035 * k;
    g.save();
    g.beginPath(); g.rect(x0, y0, W, horizonY - y0 + 0.5); g.clip();
    g.fillStyle = rgba(mix(skyTop, INK, 0.5), 0.92);
    g.beginPath(); g.ellipse(ix, horizonY + 1, iw / 2, ih * 1.3, 0, Math.PI, TAU); g.fill();
    // tiny lighthouse
    const th = H * 0.05 * k, tx = ix + iw * 0.12;
    g.fillRect(tx - 1.6 * s, horizonY - ih - th, 3.2 * s, th + 1);
    g.restore();
    glow(g, tx, horizonY - ih - th, 9 * s, lampCol, 0.85 * k * (0.75 + 0.25 * Math.sin(t * 1.1)));
  }
  function drawIslandReflection(t) {
    const k = ease.outCubic(clamp((t - twAt) / 1.8));
    if (k <= 0) return;
    const tx = cx - side * W * 0.27 + W * 0.2 * 0.12;
    g.save(); g.translate(tx, horizonY + 12 * s); g.scale(0.22, 1.6); glow(g, 0, 0, 11 * s, lampCol, 0.4 * k * (0.75 + 0.25 * Math.sin(t * 1.1))); g.restore();
  }

  function drawSea(t, mx, my, fin) {
    g.fillStyle = farGrad; g.fillRect(x0 - 2, horizonY - 0.5, W + 4, shoreY - horizonY + 8);
    if (twAt >= 0 && twistKind === 'island') drawIslandReflection(t);
    // bands, far → near (each nearer row covers the one behind it)
    g.lineJoin = 'round';
    for (let k = 0; k < N; k++) {
      // soft occlusion shadow on the water behind this crest, then the row itself
      g.save(); g.translate(0, -1.5 * s); g.strokeStyle = rgba(INK, 0.16 + 0.12 * clamp(amp[k])); g.lineWidth = (5 + 4 * clamp(amp[k])) * s;
      g.beginPath(); traceCrest(k); g.stroke(); g.restore();
      g.beginPath(); traceCrest(k); g.lineTo(colX[COLS], shoreY + 8); g.lineTo(colX[0], shoreY + 8); g.closePath();
      g.fillStyle = bandGrad[k]; g.fill();
    }
    drawGlade(t, mx, fin);
    for (const sl of slots) drawReflection(sl, t, fin);
    // crest light + whitecaps (the row the lever is calming now shimmers a little)
    let active = -1; if (finAt < 0) for (let k = 0; k < N; k++) if (!flat[k]) { active = k; break; }
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let k = 0; k < N; k++) {
      const A = clamp(amp[k]), o = k * (COLS + 1);
      g.beginPath(); traceCrest(k);
      const act = k === active ? 0.1 * (0.6 + 0.4 * Math.sin(t * 2.4)) : 0;
      g.strokeStyle = rgba(crestHi, 0.05 + 0.1 * A + 0.05 * fin + act); g.lineWidth = (4 + 4 * A + act * 30) * s; g.stroke();
      g.strokeStyle = rgba(crestHi, 0.22 + 0.36 * A + 0.1 * fin); g.lineWidth = (0.9 + 0.8 * A) * s; g.stroke();
      if (A > 0.3 && !lowStim) {
        for (let i = 1; i < COLS; i += 2) {
          if (crestH[o + i] < 0.72) continue;
          glow(g, colX[i], crestY[o + i] + 1, (2.5 + 4 * A) * s, '#ffffff', 0.32 * A);
        }
      }
      // the moment a row flattens: a glint of moonlight runs along it
      if (sweep[k] >= 0) {
        const q = clamp((t - sweep[k]) / 1.4), sxp = side > 0 ? lerp(x1, x0, ease.inOutSine(q)) : lerp(x0, x1, ease.inOutSine(q));
        const i = clamp(Math.round((sxp - colX[0]) / (colX[1] - colX[0])), 0, COLS);
        g.save(); g.translate(sxp, crestY[o + i]); g.scale(3.2, 0.5); glow(g, 0, 0, 16 * s, '#ffffff', 0.55 * Math.sin(q * Math.PI)); g.restore();
      }
    }
    g.restore();
    // our water ripples
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < rpN; i++) {
      if (rpA[i] <= 0.01) continue;
      g.strokeStyle = rgba(crestHi, rpA[i]); g.lineWidth = 1.2 + rpA[i] * 1.5;
      g.beginPath(); g.ellipse(rpX[i], rpY[i], rpR[i], rpR[i] * 0.3, 0, 0, TAU); g.stroke();
    }
    g.restore();
  }

  function drawGlade(t, mx, fin) {
    // the moon's light on the water: broken glitter on restless water, one silver road on still water
    const gx = clamp(mx, x0 + W * 0.2, x1 - W * 0.2);
    const M = lowStim ? 10 : 16;
    g.save(); g.globalCompositeOperation = 'lighter';
    // soft column
    g.save(); g.translate(gx, (horizonY + shoreY) / 2); g.scale(0.32, 1.6); glow(g, 0, 0, seaH * 0.42, moonCol, 0.08 + 0.2 * still + 0.15 * fin); g.restore();
    for (let j = 0; j < M; j++) {
      const v = (j + 0.5) / M, y = horizonY + seaH * Math.pow(v, 1.08), a = clamp(ampAt(y));
      const per = lerp(0.5, 1.4, v);
      const n = a > 0.25 ? 3 : 1;
      for (let q = 0; q < n; q++) {
        const jitter = Math.sin(j * 7.31 + q * 2.1 + t * (0.9 + a * 1.6) * speedK) * W * 0.11 * a + (q - (n - 1) / 2) * 14 * s * a;
        const tw = n > 1 ? 0.45 + 0.55 * Math.abs(Math.sin(t * (1.6 + q) * speedK + j * 1.7)) : 0.85 + 0.15 * Math.sin(t * 0.8 + j);
        const wdt = lerp(18, 6, a) * per * s * (1 + fin * 0.4), hgt = lerp(2.2, 1.6, a) * per * s;
        g.save(); g.translate(gx + jitter, y); g.scale(wdt / hgt, 1);
        glow(g, 0, 0, hgt * 2.2, '#ffffff', (0.22 + 0.4 * (1 - a)) * tw * (0.6 + 0.4 * still + 0.3 * fin));
        g.restore();
      }
    }
    g.restore();
  }

  function drawReflection(sl, t, fin) {
    const top0 = sl.y - sl.h / 2;
    // local agitation (max over the reflection)
    let la = 0;
    for (let i = 0; i <= 4; i++) la = Math.max(la, ampAt(top0 + sl.h * (i / 4)));
    sl.localA = la;
    const bob = -la * ampPx[Math.min(N - 1, 1)] * 0.4 * Math.sin(t * 1.3 * speedK + sl.ph0);
    const x = sl.x, top = top0 + bob, w = sl.w, h = sl.h;
    const clear = 1 - clamp(la * 1.15);
    const ca = sl.clearAt >= 0 ? smooth(clamp((t - sl.clearAt) / 1.2)) : 0;
    // moonlit pool under the reflection
    glow(g, x, top + h / 2, Math.max(w, h) * 0.78, sl.ph >= 0 ? photos.colour(sl.ph) : pal.glow, 0.1 + 0.16 * clear + 0.1 * fin);
    const alpha = lerp(0.84, 0.98, clear);
    const cw = sl.cClear.width, chh = sl.cClear.height;
    if (la < 0.02) {
      g.globalAlpha = alpha; g.drawImage(sl.cClear, x - w / 2, top, w, h); g.globalAlpha = 1;
    } else {
      // thin slices with a smooth, slow displacement: water wavering, never a jagged mosaic
      const n = sl.slices, sh = h / n, sH = chh / n, shift = (4.5 * s + w * 0.045) * (heavy ? 0.8 : 1);
      const m = clamp(la * 1.25);
      for (let i = 0; i < n; i++) {
        const yy = top + i * sh, a = clamp(ampAt(yy + sh / 2) * 1.1);
        const yn = i / n;
        const off = a * shift * (Math.sin(yn * 3.3 + t * 1.7 * speedK + sl.ph0) + 0.22 * Math.sin(yn * 8 - t * 2.4 * speedK + sl.ph0 * 2));
        const sw = w * (1 + a * 0.035 * Math.sin(yn * 2.6 + t * 1.1 + sl.ph0)), sx = x - sw / 2 + off;
        const sa = m > 0.02 ? Math.min(1, m * (0.7 + 0.6 * a)) : 0;
        if (sa < 0.97) { g.globalAlpha = alpha; g.drawImage(sl.cClear, 0, i * sH, cw, sH, sx, yy, sw, sh + 0.7); }
        if (sa > 0) { g.globalAlpha = alpha * sa; g.drawImage(sl.cStorm, 0, i * sH, cw, sH, sx, yy, sw, sh + 0.7); }
      }
      g.globalAlpha = 1;
    }
    // a still surface: a calm sheen line across the reflection
    if (clear > 0.6) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.save(); g.translate(x, top + h * 0.3); g.scale(3.6, 0.42); glow(g, 0, 0, w * 0.14, '#ffffff', 0.2 * (clear - 0.6) * 2.5 * (0.7 + 0.3 * Math.sin(t * 0.7 + sl.ph0))); g.restore();
      if (ca > 0 && ca < 1) { g.strokeStyle = rgba(crestHi, 0.55 * (1 - ca)); g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, top + h / 2, w * (0.52 + ca * 0.2), h * (0.52 + ca * 0.2), 0, 0, TAU); g.stroke(); }
      g.restore();
    }
  }

  function lightPos(i, t, out) {
    const f = i / 2, hy = horizonY - y0;
    out.x = cx + side * W * lerp(0.16, -0.3, f); out.y = y0 + hy * lerp(0.36, 0.72, f) + Math.sin(t * 0.9 + i * 2) * 1.2 * s;
    return out;
  }
  function drawLights(t) {
    // three resting lights form a calm little pathway across the sky, away from the restless water
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const k = smooth(clamp((t - twAt - i * 0.5) / 1.0));
      if (k <= 0) continue;
      lightPos(i, t, tmp2);
      const x = tmp2.x, y = tmp2.y, r = (3.2 - i * 0.5) * s;
      if (i > 0) { const px = tmp2.x, py = tmp2.y; lightPos(i - 1, t, tmp2); g.strokeStyle = rgba(lampCol, 0.28 * k); g.lineWidth = 1.2; g.setLineDash([2, 5]); g.beginPath(); g.moveTo(tmp2.x, tmp2.y); g.lineTo(lerp(tmp2.x, px, k), lerp(tmp2.y, py, k)); g.stroke(); g.setLineDash([]); }
      glow(g, x, y, r * 6, lampCol, 0.45 * k * (0.85 + 0.15 * Math.sin(t * 1.3 + i)));
      glow(g, x, y, r * 2, '#ffffff', 0.8 * k);
    }
    g.restore();
  }

  function drawShore(t, fin) {
    // sand (behind the surf)
    g.fillStyle = sandGrad; g.fillRect(x0 - 2, shoreY - 3, W + 4, shoreH + 6);
    // speckles + faint ripple marks in the sand
    for (let i = 0; i < SPK; i++) {
      g.fillStyle = spS[i] > 0.5 ? rgba('#ffffff', 0.22 * spS[i]) : rgba(mix(sandDry, INK, 0.4), 0.3);
      g.fillRect(x0 + spU[i] * W, shoreY + spV[i] * shoreH, 1.3, 1.3);
    }
    g.strokeStyle = rgba(mix(sandDry, INK, 0.25), 0.16); g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = shoreY + shoreH * (0.5 + i * 0.17);
      g.beginPath();
      for (let k = 0; k <= 12; k++) { const x = x0 + W * (k / 12), yy = y + Math.sin(k * 1.3 + i * 2) * 1.6; k ? g.lineTo(x, yy) : g.moveTo(x, yy); }
      g.stroke();
    }
    drawMarker(t, fin);
    // the swash: a thin tongue of water over the sand, reaching further while the breaker is restless
    const sw = clamp(amp[N - 1] / Math.max(0.05, A0));
    const reach = shoreH * (0.07 + 0.34 * sw * (0.55 + 0.45 * Math.sin(t * 0.85 * speedK + 1.2)));
    for (let i = 0; i <= SW; i++) { const u = i / SW; swX[i] = x0 - 4 + (W + 8) * u; swY[i] = shoreY + reach * (0.78 + 0.22 * Math.sin(u * 5.2 + t * 0.6 * speedK)) + Math.sin(u * 11 + t * 1.3 * speedK) * 1.4 * s * sw; }
    g.beginPath(); g.moveTo(x0 - 4, shoreY - 4); swashTrace(true); g.lineTo(x1 + 4, shoreY - 4); g.closePath();
    g.fillStyle = swashGrad; g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); swashTrace(false);
    g.strokeStyle = rgba('#ffffff', 0.06 + 0.12 * sw); g.lineWidth = (5 + 4 * sw) * s; g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.25 + 0.3 * sw); g.lineWidth = (1 + sw) * s; g.stroke();
    if (!lowStim && sw > 0.2) for (let i = 1; i < SW; i += 2) glow(g, swX[i] + Math.sin(t * 2 + i) * 4, swY[i] - 1, (2 + 3 * sw) * s, '#ffffff', 0.3 * sw);
    g.restore();
    // words written in the sand, at the foot of the marker (the law shows them during its closing move)
    if (E.phase !== 'law') {
      const lit = Math.max(fin, lampAt >= 0 ? smooth(clamp((t - lampAt) / 1.2)) * 0.7 : 0);
      if (lit > 0) { g.save(); g.translate(cx, wordsY); g.scale(2.6, 0.7); glow(g, 0, 0, W * 0.16, lampCol, 0.16 * lit); g.restore(); }
      const wet = sw * 0.12;
      words.draw(g, cx, wordsY, { style: 'etched', colour: mix(sandInk, sandWet, wet), size: wSize, maxWidth: W * 0.84, lines: wLines, alpha: 0.95 });
    }
  }

  function swashTrace(cont) {
    if (cont) g.lineTo(swX[0], swY[0]); else g.moveTo(swX[0], swY[0]);
    for (let i = 1; i < SW; i++) g.quadraticCurveTo(swX[i], swY[i], (swX[i] + swX[i + 1]) / 2, (swY[i] + swY[i + 1]) / 2);
    g.lineTo(swX[SW], swY[SW]);
  }
  function drawMarker(t, fin) {
    const v = markerVis;
    const a = lerp(0.06, 1, v), rise = (1 - ease.outCubic(v)) * mH * 0.3;
    const pw = 6 * s, top = mBase - mH + rise;
    // a little ring of pebbles around the post's foot
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * TAU + 0.3, px = mX + Math.cos(ang) * 15 * s, py = mBase + 2 + Math.sin(ang) * 4.5 * s;
      g.fillStyle = rgba(mix(sandDry, INK, 0.35 + (i % 3) * 0.08), 0.55 * a);
      g.beginPath(); g.ellipse(px, py, 3.2 * s, 2 * s, 0, 0, TAU); g.fill();
    }
    softShadow(g, mX + side * 6 * s, mBase + 2, 14 * s, 4 * s, 0.35 * a);
    g.save(); g.globalAlpha = a;
    // driftwood post with two turns of rope
    g.fillStyle = postGrad; roundRect(g, mX - pw / 2, top, pw, mBase - top, pw * 0.4); g.fill();
    g.fillStyle = 'rgba(255,240,210,0.4)'; g.fillRect(mX - pw / 2 + 0.5, top + mH * 0.3, pw - 1, 1.4); g.fillRect(mX - pw / 2 + 0.5, top + mH * 0.37, pw - 1, 1.2);
    // lantern: brass cap, glass body, ring handle
    const lk = lampAt >= 0 ? smooth(clamp((t - lampAt) / 1.1)) : 0;
    const lw = 11 * s, lh = 13 * s, ly = top - lh / 2 - 1;
    g.strokeStyle = brass; g.lineWidth = 1.2 * s; g.beginPath(); g.arc(mX, ly - lh / 2 - 3.5 * s, 3 * s, Math.PI, TAU); g.stroke();
    g.fillStyle = brassDark; roundRect(g, mX - lw / 2 - 1.5 * s, ly - lh / 2 - 3.5 * s, lw + 3 * s, 3.5 * s, 1.5 * s); g.fill();
    g.fillStyle = mix(mix(sandWet, INK, 0.45), lampCol, lk * 0.85); roundRect(g, mX - lw / 2, ly - lh / 2, lw, lh, 3 * s); g.fill();
    g.strokeStyle = rgba(brass, 0.9); g.lineWidth = 1; g.stroke();
    g.fillStyle = brassDark; g.fillRect(mX - lw / 2 - 1, ly + lh / 2 - 1, lw + 2, 2.5 * s);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(mX - lw / 2 + 2, ly - lh / 2 + 2, 1.5, lh - 5);
    g.restore();
    const breath = 0.88 + 0.12 * Math.sin(t * 1.2);
    if (lk > 0) {
      glow(g, mX, ly, (26 + 12 * fin) * s, lampCol, (0.5 + 0.25 * fin) * lk * breath);
      glow(g, mX, ly + 1, 5 * s, '#fff6e0', 0.9 * lk);
      g.save(); g.translate(mX, mBase + 4 * s); g.scale(2.4, 0.4); glow(g, 0, 0, 18 * s, lampCol, 0.22 * lk); g.restore();
    }
    if (lk > 0 && fin > 0) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const rr = (20 + 50 * fin) * s;
      g.strokeStyle = rgba(lampCol, 0.35 * (1 - fin)); g.lineWidth = 1.5; g.beginPath(); g.ellipse(mX, mBase, rr, rr * 0.3, 0, 0, TAU); g.stroke();
      g.restore();
    }
  }

  function drawRain(t) {
    if (rainAmt <= 0.01) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(mix(pal.glow, '#ffffff', 0.5), 0.16 * rainAmt); g.lineWidth = 1;
    g.beginPath();
    const hgt = shoreY - y0, spd = reduced ? 0.25 : 1;
    for (let i = 0; i < RAIN; i++) {
      const v = (rainV[i] + t * rainSp[i] * spd) % 1, x = x0 + rainU[i] * W - v * hgt * 0.12, y = y0 + v * hgt, l = rainLen[i] * 14 * s;
      g.moveTo(x, y); g.lineTo(x - l * 0.18, y + l);
    }
    g.stroke();
    g.restore();
  }

  function drawRim(t) {
    g.save();
    g.strokeStyle = rgba(INK, darkRealm ? 0.35 : 0.28); g.lineWidth = 6; archPath(-2); g.stroke();
    g.strokeStyle = rimGrad; g.lineWidth = 2.4; archPath(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; archPath(4); g.stroke();
    // glass highlight on the dome (opposite the rail)
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const a0 = side > 0 ? Math.PI * 1.08 : -Math.PI * 0.08 - 0.62;
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(cx, ac, ar - 7, ary - 7, 0, a0, a0 + 0.62); g.stroke();
    g.fillStyle = sheenGrad; g.globalAlpha = 0.32 + 0.12 * Math.sin(t * 0.4);
    g.beginPath(); g.ellipse(cx - side * W * 0.22, y0 + H * 0.33, W * 0.05, H * 0.2, side * 0.18, 0, TAU); g.fill();
    g.restore();
  }

  function drawRail(t, fin) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    // groove
    g.strokeStyle = rgba(INK, 0.5); g.lineWidth = 7.5 * Math.max(0.8, s);
    g.beginPath(); g.moveTo(railX[0], railY[0]); for (let i = 2; i < railN; i += 2) g.lineTo(railX[i], railY[i]); g.lineTo(railX[railN - 1], railY[railN - 1]); g.stroke();
    // brass rail
    g.strokeStyle = brass; g.lineWidth = 3.4 * Math.max(0.8, s); g.stroke();
    g.strokeStyle = 'rgba(255,250,235,0.55)'; g.lineWidth = 1; g.stroke();
    // the moon's travelled path glows softly
    const iEnd = Math.min(railN - 1, Math.max(1, Math.round(binIndex(hp))));
    g.globalCompositeOperation = 'lighter';
    for (const [w, a] of TRAIL_PASSES) {
      g.strokeStyle = rgba(mix(moonCol, pal.glow, 0.35), a * (1 + fin)); g.lineWidth = w * s;
      g.beginPath(); g.moveTo(railX[0], railY[0]); for (let i = 2; i < iEnd; i += 2) g.lineTo(railX[i], railY[i]); g.lineTo(railX[iEnd], railY[iEnd]); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
    // end cradle (the shore rest)
    railPoint(1, tmp2);
    g.save(); g.translate(tmp2.x, tmp2.y + cr * 0.15); g.rotate(Math.atan2(tmp2.ny, tmp2.nx));
    g.fillStyle = brassDark; roundRect(g, -4 * s, -cr * 0.85, 8 * s, cr * 1.7, 4 * s); g.fill();
    g.fillStyle = brass; roundRect(g, -2.5 * s, -cr * 0.8, 3 * s, cr * 1.6, 2 * s); g.fill();
    g.restore();
    // notches: one per wave row (they light once that wave has flattened)
    for (let k = 0; k < N; k++) {
      railPoint(notchP(k), tmp2);
      const isFlat = !!flat[k];
      const ox = tmp2.x + tmp2.nx * 9 * s, oy = tmp2.y + tmp2.ny * 9 * s;
      g.strokeStyle = rgba(isFlat ? moonCol : '#ffffff', isFlat ? 0.85 : 0.4); g.lineWidth = 2 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(tmp2.x - tmp2.nx * 4 * s, tmp2.y - tmp2.ny * 4 * s); g.lineTo(ox, oy); g.stroke();
      if (isFlat) glow(g, ox, oy, 9 * s, moonCol, 0.6);
      g.fillStyle = rgba(INK, 0.45); g.beginPath(); g.arc(ox, oy, 4.6 * s, 0, TAU); g.fill();
      orb(g, ox, oy, 3.5 * s, isFlat ? mix(moonCol, '#ffffff', 0.4) : brass);
    }
  }
  function binIndex(p) {
    const target = clamp(p) * railL;
    let lo = 0, hi = railN - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (railC[m] < target) lo = m + 1; else hi = m; }
    return lo;
  }

  function drawCrescent(t, x, y, nx, ny, r, full, fin) {
    const idle = drag == null && rot < 0.01 && finAt < 0 ? 0.5 + 0.5 * Math.sin(t * 2.2) : 0;
    // contact shadow keeps the moon readable over any realm sky
    if (full < 1) softShadow(g, x + 1.5 * s, y + 3 * s, r * 1.2, r * 1.1, 0.3 * (1 - full));
    // halo: a wide warm bloom and a tight cool core
    glow(g, x, y, r * (3.6 + grabK * 0.9 + full * 2), moonHalo, 0.34 + 0.22 * grabK + 0.18 * idle + 0.3 * fin);
    glow(g, x, y, r * 1.8, '#ffffff', 0.16 + 0.14 * grabK + 0.1 * full);
    if (idle > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(moonCol, 0.3 * idle); g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r * (1.45 + idle * 0.35), 0, TAU); g.stroke(); g.restore(); }
    g.save(); g.translate(x, y); g.rotate(Math.atan2(ny, nx)); g.scale(r / cr, r / cr);
    const R0 = cr;
    // earthshine: the rest of the moon, faint
    g.fillStyle = rgba(mix(moonCol, pal.deep, 0.5), 0.34 * (1 - full));
    g.beginPath(); g.arc(0, 0, R0 * 0.985, 0, TAU); g.fill();
    // the finale: the shadowed part fills in to a full moon with soft maria
    if (full > 0) {
      g.globalAlpha = full; g.fillStyle = moonGrad; g.beginPath(); g.arc(0, 0, R0, 0, TAU); g.fill();
      g.fillStyle = rgba(mix(moonCol, pal.deep, 0.4), 0.2);
      g.beginPath(); g.ellipse(0.2 * R0, -0.25 * R0, 0.32 * R0, 0.22 * R0, 0.4, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(0.35 * R0, 0.3 * R0, 0.22 * R0, 0.17 * R0, -0.3, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(-0.25 * R0, 0.15 * R0, 0.16 * R0, 0.12 * R0, 0.2, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
    // lit crescent
    g.fillStyle = moonGrad;
    g.beginPath(); g.arc(0, 0, R0, TH_O, TAU - TH_O, false); g.arc(CD * R0, 0, CRI * R0, -TH_I, TH_I, true); g.closePath(); g.fill();
    g.save(); g.clip();
    g.fillStyle = rgba(mix(moonCol, pal.deep, 0.45), 0.26);
    g.beginPath(); g.arc(-0.68 * R0, -0.3 * R0, 0.1 * R0, 0, TAU); g.fill();
    g.beginPath(); g.arc(-0.62 * R0, 0.38 * R0, 0.075 * R0, 0, TAU); g.fill();
    g.beginPath(); g.arc(-0.82 * R0, 0.06 * R0, 0.055 * R0, 0, TAU); g.fill();
    // soft terminator
    g.strokeStyle = rgba(mix(moonCol, pal.deep, 0.25), 0.35); g.lineWidth = R0 * 0.12;
    g.beginPath(); g.arc(CD * R0, 0, CRI * R0, Math.PI - 1.4, Math.PI + 1.4); g.stroke();
    g.restore();
    // rim light
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba('#ffffff', 0.6); g.lineWidth = 1.3;
    g.beginPath(); g.arc(0, 0, R0 - 0.7, TH_O + 0.18, TAU - TH_O - 0.18, false); g.stroke();
    g.restore();
    // the pivot collar where the crescent rides the rail
    if (full < 0.5) { g.globalAlpha = 1 - full * 2; orb(g, x, y, 3.8 * s, brass); g.globalAlpha = 1; }
    // the pause: a ring of moonlight fills around the crescent while its wave flattens
    if (holdQ >= 0) {
      const rr = r * 1.36, a0 = -Math.PI / 2, ae = a0 + TAU * Math.max(0.02, holdQ);
      g.save(); g.lineCap = 'round';
      g.strokeStyle = rgba(INK, 0.3); g.lineWidth = 3.5 * s; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke();
      g.strokeStyle = rgba(moonCol, 0.16); g.lineWidth = 1.6 * s; g.stroke();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rgba(moonCol, 0.25); g.lineWidth = 6 * s; g.beginPath(); g.arc(x, y, rr, a0, ae); g.stroke();
      g.strokeStyle = rgba(moonCol, 0.9); g.lineWidth = 1.8 * s; g.stroke();
      g.restore();
      glow(g, x + Math.cos(ae) * rr, y + Math.sin(ae) * rr, 6 * s, '#ffffff', 0.55);
    }
  }

  function drawThread(mx, my) {
    if (drag == null) return;
    const d = Math.hypot(fingX - mx, fingY - my);
    if (d < 20) return;
    const a = clamp((d - 20) / 90) * 0.5;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const qx = (mx + fingX) / 2 + (fingY - my) * 0.08, qy = (my + fingY) / 2 - (fingX - mx) * 0.08;
    for (const [w, k] of THREAD_PASSES) { g.strokeStyle = rgba(moonCol, a * k); g.lineWidth = w; g.beginPath(); g.moveTo(mx, my); g.quadraticCurveTo(qx, qy, fingX, fingY); g.stroke(); }
    g.restore();
  }

  // ============================================================ input ==
  function onLever(p) {
    railPoint(hp, tmp2);
    if (Math.hypot(p.x - tmp2.x, p.y - tmp2.y) < Math.max(38, cr * 2)) return true;
    // or the rail just around it (a lever is held by its handle, not grabbed from afar)
    const q = project(p.x, p.y);
    return q.d < Math.max(30, 24 * s) && q.p > rot - 0.06 && q.p < rot + 0.16;
  }
  const inWindow = (x, y) => x > x0 && x < x1 && y < y1 && (y > ac || Math.hypot((x - cx) / ar, (y - ac) / ary) < 1);
  function refuse(t) {
    if (t - lastRefuse < 0.5) return;
    lastRefuse = t; wob.kick(0.45);
    E.sound('bubble', { note: 1, intensity: 0.2 }); hap('light');
  }

  return {
    get progress() { return rot; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      if (drag == null && onLever(p)) {
        drag = p.id; fingX = p.x; fingY = p.y; fingerQ = project(p.x, p.y).p;
        E.sound('click', { intensity: 0.35, pitch: 1.1 }); hap('light', 0);
        return;
      }
      if (!inWindow(p.x, p.y)) return;
      if (p.y < shoreY && p.y > horizonY) {
        // touching the water: a small ripple and a drop of sound
        addRipple(p.x, p.y, 3, 0.65, 44);
        E.sound('drip', { note: Math.round(clamp((p.y - horizonY) / seaH) * 6) + 2, intensity: 0.28, pan: clamp((p.x - cx) / ar, -1, 1) * 0.5 }); hap('tick', 0);
      } else if (p.y >= shoreY) {
        E.particles.burst(p.x, p.y, reduced ? 2 : 5, { speed: 30, colour: mix(sandDry, '#ffffff', 0.5), life: 0.7, size: 3, kind: 'dot', dir: -Math.PI / 2, spread: 1.6 });
        E.sound('swish', { intensity: 0.15 }); hap('tick', 0);
      } else {
        E.particles.burst(p.x, p.y, reduced ? 2 : 4, { speed: 22, colour: moonCol, life: 0.9, size: 4, kind: 'glint' });
        E.sound('glass', { note: 8, intensity: 0.18 }); hap('tick', 0);
      }
    },
    move(p) {
      if (p.id !== drag) return;
      fingX = p.x; fingY = p.y;
      const q = project(p.x, p.y).p;
      fingerQ = q;
      const cap = holdCap(), t = E.now();
      const ask = Math.min(q, cap);
      if (ask > wanted) wanted = Math.min(ask, rot + BANK);
      if (q > cap + 0.03 && rot >= cap - 2e-3 && cap < 1) refuse(t);          // the wave is still flattening
      if (E.locked && q > rot + BANK * 0.9 && t - lastLockCk > 0.6) { lastLockCk = t; E.checkpoint('wait'); refuse(t); }
    },
    up(p) { if (p.id === drag) { drag = null; } },
    assist() {
      if (finAt >= 0) return;
      const cap = holdCap(), base = Math.max(wanted, rot);
      if (base >= cap - 1e-4) { if (cap < 1 || !flat[N - 1]) refuse(E.now()); return; }
      const step = 1 / (2 * N);
      assistTo = Math.min(cap, (Math.floor(base / step + 1e-3) + 1) * step);
      E.sound('click', { intensity: 0.25, pitch: 1.2 });
    },
    pointAt(p) { railPoint(p, tmp2); return { x: tmp2.x, y: tmp2.y }; },
    hint() {
      if (finAt >= 0 || doneFlag || rot >= 0.999) return null;
      const cap = holdCap(), p1 = Math.min(1, cap > rot + 0.02 ? cap : rot + 1 / N);
      const pts = [];
      for (let i = 0; i <= 14; i++) { railPoint(lerp(rot, p1, i / 14), tmp2); pts.push([tmp2.x, tmp2.y]); }
      // the last stretch: carry the pull a little past the cradle so it seats firmly
      if (p1 >= 1) for (let i = 1; i <= 3; i++) pts.push([tmp2.x, tmp2.y + i * 9 * s]);
      return { path: pts };
    },
    twist() {
      twAt = E.now();
      if (twistKind === 'island') addRipple(cx - side * W * 0.27, horizonY + 3, 4, 0.7, 34);
      else E.particles.burst(cx + side * W * 0.16, y0 + (horizonY - y0) * 0.36, reduced ? 3 : 7, { speed: 18, colour: lampCol, life: 1.4, size: 5 });
    },
    finish() {
      finAt = E.now();
      for (let k = 0; k < N; k++) flat[k] = 1;
      E.sound('shimmer', { intensity: 0.4 });
      if (!heavy && !reduced) {
        for (const sl of slots) E.particles.burst(sl.x, sl.y, lowStim ? 2 : 4, { speed: 14, colour: moonCol, life: 1.8, size: 4, dir: -Math.PI / 2, spread: 1.2 });
      }
    },
    destroy() {},
  };
}
