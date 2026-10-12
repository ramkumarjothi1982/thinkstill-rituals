// GE-02 · FEATHER FERRY — feather skiff (guided drag).
// Catch the feather by its glowing stem and guide it along a lane of lights
// that snakes between two crosswinds, without losing its shadow. The soft
// plume trails behind the stem on springs and bends wherever a wind touches
// it; its shadow on the water is laid along the path your finger actually
// takes. The feather has its own gentle pace: rush and your shadow runs on
// ahead while the feather drags behind (and the winds bend it off its shadow);
// slow down and it glides back to settle on its shadow with a soft chime.
// Win: the stem of the feather skiff touches the receiving reed.
//
// Photos wait beside the lane as postcard sails on little leaf rafts, tossed
// by the winds and tinted stormy. As the plume passes, each one unhooks from
// its buoy, the stormy tint washes back to its own colours, and it follows
// your path in tow. At the reed they are delivered and hang as calm lanterns.
// Words are written along the feather's stem in soft ink and bend with it.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, noise2, rng, FONT, wrap, spiral, canvas as makeCanvas } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-02',
  howTo: 'Catch the feather’s glowing stem and guide it between the winds.',
  steps: [
    'Touch the glowing stem at the front of the feather.',
    'Guide it along the lane of lights, between the two crosswinds — gently, so the feather keeps its shadow.',
    'Bring the stem all the way to the receiving reed, then let go.',
  ],
  tapAlt: 'each press glides the skiff one calm stretch along the lane',
  words: 'Your words are written in soft ink along the feather’s stem, and bend with it as the winds pass.',
  photos: {
    where: 'Your photos wait beside the lane as little postcard sails on leaf rafts.',
    becomes: 'postcard sails, then calm lanterns',
    touch: 'As the feather passes, each one unhooks from its wind-tossed buoy and follows your path in tow;',
    change: 'its stormy tint washes away to its own colours once it is safely carried.',
    payoff: 'At the reed they are delivered and hang as calm lanterns.',
  },
  finaleSec: 4.4,
};

const N = 12;              // plume nodes, stem (0) → tip (N-1)
const HN = 420;            // ring buffer of the stem's actual path
const BANK = 0.03;         // input that may run ahead of the world law
const STEP = 1 / 8;        // one "Tap instead" press
const MELODY = [2, 4, 5, 7, 9, 7, 5, 4, 2, 5, 7, 9];
const EMPTY = [];

export function create(E) {
  const { g, stage, photos, words } = E;
  const P = E.pal;
  const reduced = E.reduced, low = E.lowStim, heavy = E.heavy;
  const round = E.round, flip = round % 2 === 0 ? -1 : 1;
  const rnd = E.rand;
  const nz = noise2(E.seed + 23);
  const agit0 = (heavy ? 0.7 : 1) * (1 - E.calm * 0.75);   // later loop rounds start calmer
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);

  // ------------------------------------------------------------ colours --
  const warm = P.warm || '#ffd98a';
  const ink0 = P.ink || '#120a2a';
  const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
  const lum = (h) => { const v = parseInt(String(h).slice(1), 16); return (0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255; };
  const bright = lum(P.sky) > 0.42;
  const windPool = [mix(P.glow, '#ffffff', 0.3), mix(P.accent, '#ffffff', 0.4), mix(P.glow, warm, 0.45), mix(P.accent, P.glow, 0.5)];
  const C = {
    water: bright ? mix(P.deep, ink0, 0.62) : mix(P.deep, ink0, 0.5),
    lane: mix(P.glow, '#ffffff', 0.3),
    wind1: round === 1 ? windPool[0] : pick(windPool),
    wind2: round === 1 ? windPool[1] : pick(windPool),
    vane: mix('#ffffff', P.glow, 0.14),
    vaneMid: mix('#ffffff', P.glow, 0.36),
    vaneTip: mix(round === 1 ? P.accent : pick([P.accent, warm, P.glow]), '#ffffff', 0.42),
    under: mix(P.deep, '#3a2a6a', 0.4),
    quill: mix(warm, '#ffffff', 0.45),
    ink: mix(ink0, '#1b1236', 0.55),
    shadow: mix(ink0, '#000008', 0.55),
    reed: mix('#9fd49a', P.glow, 0.22),
    reedDeep: mix('#2c5a40', P.deep, 0.35),
    head: mix('#a86a3a', warm, 0.3),
    pad: mix('#4f9a6a', P.deep, 0.3),
    leaf: mix('#7cc48a', P.glow, 0.2),
  };
  if (round > 1) { C.wind1 = mix(C.wind1, '#ffffff', E.calm * 0.3); C.wind2 = mix(C.wind2, '#ffffff', E.calm * 0.3); }

  // --------------------------------------------------------- the cargo --
  const n = photos.n, K = Math.max(3, n);
  const slots = new Array(K).fill(-1);
  if (n === 1) slots[(round - 1) % 3] = 0;
  else if (n === 2) { slots[0] = (round - 1) % 2; slots[2] = round % 2; }
  else for (let j = 0; j < K; j++) slots[j] = (j + round - 1) % n;
  const cargo = slots.map((ph, j) => ({ ph, j, b: 0, side: 1, bx: 0, by: 0, state: 0, slot: -1, x: 0, y: 0, vx: 0, vy: 0, tone: 1, t0: 0, hx: 0, hy: 0, thread: 0, phs: rnd() * TAU, lift: 0, row: 0, tier: 0, hu: 0.5, ax: 0, ay: 0, fx: 0, fy: 0 }));
  let picked = 0;

  // ------------------------------------------------------------- layout --
  let X0, Y0, W, H, s, mx, yA, yB, yC, D, r, xS, xR, xL, xE, L, laneHalf, cs, seg, pad;
  let RX = null, RY, RC, RN = 0, RL = 1;              // route samples (the stem's lane)
  let NB = 30, BX, BY;                                // lane beads
  let cache = null;
  let reedX, reedY, reedH, reedSway = 0;
  const winds = [0, 1].map((k) => ({ k, yc: 0, hw: 1, sx: 0, tx: 0, sd: 1, span: 1, ex: 0, ey: 0, g: 1, col: k ? C.wind2 : C.wind1, grad: null,
    ph: rnd() * TAU, M: reduced || low ? 6 : 9, off: [], amp: [], kk: [], om: [], php: [], v: [], dash: [] }));
  for (const w of winds) {
    for (let j = 0; j < 9; j++) {
      w.off.push(-0.85 + 1.7 * (j + 0.5) / 9 + (rnd() - 0.5) * 0.08);
      w.amp.push(0.1 + rnd() * 0.16); w.kk.push(0.009 + rnd() * 0.012); w.om.push(0.5 + rnd() * 0.6); w.php.push(rnd() * TAU);
      w.v.push(30 + rnd() * 34); const dl = 34 + rnd() * 60; w.dash.push([dl, dl * (1.3 + rnd() * 1.6)]);
    }
  }
  const jitA = round > 1 ? (rnd() - 0.5) * 0.04 : 0;
  const mapX = (lx) => (flip > 0 ? X0 + lx : X0 + W - lx);

  // plume geometry (per node)
  const WA = new Float32Array(N), WB = new Float32Array(N), KS = new Float32Array(N), CSd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const vane = u < 0.1 ? 0 : Math.pow(Math.sin(Math.PI * Math.pow((u - 0.1) / 0.9, 0.72)), 0.62) * (1 - 0.16 * (u - 0.1));
    WA[i] = 0.165 * vane; WB[i] = 0.205 * vane * (Math.abs(u - 0.66) < 0.05 ? 0.74 : 1);   // a soft split in the vane
    KS[i] = lerp(340, 52, Math.pow(u, 0.8)); CSd[i] = 2 * Math.sqrt(KS[i]) * 0.56;
  }
  const PX = new Float32Array(N), PY = new Float32Array(N), PVX = new Float32Array(N), PVY = new Float32Array(N);
  const NX = new Float32Array(N), NY = new Float32Array(N), PCUM = new Float32Array(N), WLOC = new Float32Array(N);
  const SX = new Float32Array(N + 8), SY = new Float32Array(N + 8), DIST = new Float32Array(N + 8);
  const HX = new Float32Array(HN), HY = new Float32Array(HN);              // where the feather itself has been
  const GX = new Float32Array(HN), GY = new Float32Array(HN);              // your actual path: the shadow is laid along it
  const FX = new Float32Array(N), FY = new Float32Array(N);                // shadow laid along your finger's path
  const QX = new Float32Array(N), QY = new Float32Array(N);                // shadow nodes (finger path ↔ feather path)
  let hHead = 0, hCount = 0, gHead = 0, gCount = 0, shX = 0, shY = 0, lead = 0;
  const OL = new Float32Array(N * 4 + 8);

  // ------------------------------------------------------------- state --
  let wanted = 0, real = 0, shown = 0, lastReal = 0;
  let drag = null, dragX = 0, dragY = 0, lastPX = 0, lastPY = 0, relGrab = false, fingerP = 0, grabOff = 0, fingerLat = 0, onLane = false;
  let lat = 0, latV = 0, stemX = 0, stemY = 0, stemSpeed = 0, prevSX = 0, prevSY = 0;
  let assistTo = null, assistStall = 0;
  let sep = 0, loss = 0, lost = false, lostHinted = false, lastLostAt = -9, lastWaitAt = -9;
  let lastBead = 0, beadNote = 0, wakeAcc = 0, lookAt = 0;
  let doneFlag = false, finAt = -1, touchAt = -1, reedBow = 0, reedBowV = 0, lastT = 0;
  let windIn = false, readDir = 0, readFade = 1;
  let twistAt = -1;
  const twistKind = round % 2;          // odd rounds: a downy companion; even: calm lotus lights in the eddies
  const down = { x: 0, y: 0, vx: 0, vy: 0 };
  const wob = new Wobble();
  let wfx = 0, wfy = 0;                 // wind sample (no allocation)
  let tmpX = 0, tmpY = 0, tmpTX = 1, tmpTY = 0;

  // ------------------------------------------------------------- route --
  function buildRoute() {
    const pts = [];
    const add = (lx, ly) => pts.push(mapX(lx), ly);
    const line = (x0, y0, x1, y1) => { const k = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3)); for (let i = pts.length ? 1 : 0; i <= k; i++) add(lerp(x0, x1, i / k), lerp(y0, y1, i / k)); };
    const arc = (cx, cy, rr, a0, a1) => { const k = Math.ceil(Math.abs(a1 - a0) * rr / 3); for (let i = 1; i <= k; i++) { const a = lerp(a0, a1, i / k); add(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } };
    line(xS, yA, xR, yA);
    arc(xR, yA + r, r, -Math.PI / 2, Math.PI / 2);
    line(xR, yB, xL, yB);
    arc(xL, yB + r, r, -Math.PI / 2, -Math.PI * 1.5);
    line(xL, yC, xE, yC);
    RN = pts.length / 2;
    RX = new Float32Array(RN); RY = new Float32Array(RN); RC = new Float32Array(RN);
    for (let i = 0; i < RN; i++) { RX[i] = pts[i * 2]; RY[i] = pts[i * 2 + 1]; if (i) RC[i] = RC[i - 1] + Math.hypot(RX[i] - RX[i - 1], RY[i] - RY[i - 1]); }
    RL = RC[RN - 1] || 1;
  }
  /** route point at progress p → tmpX/tmpY, tangent tmpTX/tmpTY */
  function routeAt(p) {
    const d = clamp(p) * RL;
    let lo = 0, hi = RN - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (RC[m] < d) lo = m + 1; else hi = m; }
    const i1 = Math.max(1, lo), i0 = i1 - 1, sl = RC[i1] - RC[i0] || 1, f = clamp((d - RC[i0]) / sl);
    tmpX = lerp(RX[i0], RX[i1], f); tmpY = lerp(RY[i0], RY[i1], f);
    const tx = RX[i1] - RX[i0], ty = RY[i1] - RY[i0], l = Math.hypot(tx, ty) || 1;
    tmpTX = tx / l; tmpTY = ty / l;
  }
  /** nearest route progress to (x, y) within [p0, p1]; returns distance in tmpX, signed lateral in tmpY */
  function project(x, y, p0, p1) {
    const d0 = clamp(p0) * RL, d1 = clamp(p1) * RL;
    let best = 0, bd = Infinity, i = 0;
    while (i < RN - 1 && RC[i] < d0) i++;
    for (; i < RN && RC[i] <= d1 + 3; i++) { const dx = x - RX[i], dy = y - RY[i], dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
    // refine on the neighbouring segments so the progress is continuous (no sample steps)
    let pd = RC[best];
    for (let a = Math.max(0, best - 1); a < Math.min(RN - 1, best + 1); a++) {
      const sx = RX[a + 1] - RX[a], sy = RY[a + 1] - RY[a], sl2 = sx * sx + sy * sy || 1;
      const f = clamp(((x - RX[a]) * sx + (y - RY[a]) * sy) / sl2), qx = RX[a] + sx * f - x, qy = RY[a] + sy * f - y, dd = qx * qx + qy * qy;
      if (dd <= bd) { bd = dd; pd = RC[a] + (RC[a + 1] - RC[a]) * f; }
    }
    const j = Math.min(RN - 1, best + 1), k = Math.max(0, best - 1);
    const tx = RX[j] - RX[k], ty = RY[j] - RY[k], l = Math.hypot(tx, ty) || 1;
    tmpX = Math.sqrt(bd); tmpY = ((x - RX[best]) * -ty + (y - RY[best]) * tx) / l;    // + = left normal
    return pd / RL;
  }

  // -------------------------------------------------------------- winds --
  function windAt(x, y) {
    wfx = 0; wfy = 0;
    for (let k = 0; k < 2; k++) {
      const w = winds[k];
      const a = (y - w.yc) / w.hw;
      if (a > 3 || a < -3) continue;
      const prof = Math.exp(-a * a * 0.8);
      const q = ((x - w.sx) * w.sd) / w.span;
      const ext = q <= 0.5 ? 1 : q < 1.25 ? 1 - smooth((q - 0.5) / 0.75) : 0;
      const m = prof * ext * w.g;
      wfx += w.sd * m; wfy += m * 0.35 * Math.sin(x * 0.03 + lastT * 1.6 + w.ph);
    }
  }

  // -------------------------------------------------------------- fit --
  function fit() {
    X0 = stage.x; Y0 = stage.y; W = stage.w; H = stage.h; s = stage.s;
    mx = Math.max(12, W * 0.045);
    yA = Y0 + H * (0.19 + jitA); yC = Y0 + H * 0.86; D = (yC - yA) / 2; r = D / 2; yB = yA + D;
    L = clamp(Math.min(W * 0.4, Math.max(D * 0.95, Math.min(W * 0.35, 104)), 160 * s), 74, 170);   // small phones: a longer plume than the row gap, so the words fit
    seg = L / (N - 1);
    laneHalf = L * 0.17;
    xR = W - mx - r; xL = mx + r;
    xS = mx + L * 1.02;
    xE = W - mx - Math.max(24, W * 0.075);
    cs = clamp(r * 0.58, 34, 58);
    pad = 30;
    buildRoute();
    // beads
    NB = clamp(Math.round(RL / (25 * s)), 22, 48);
    BX = new Float32Array(NB); BY = new Float32Array(NB);
    for (let i = 0; i < NB; i++) { routeAt((i + 0.5) / NB); BX[i] = tmpX; BY[i] = tmpY; }
    // winds: W1 between rows A and B (from the start side), W2 between rows B and C (from the far side)
    const hw = r * 0.6;
    const wl = [[yA + r, -12, xR + r * 1.08, 1], [yB + r, W + 12, xL - r * 1.08, -1]];
    winds.forEach((w, k) => {
      const [yc, ls, lt, ld] = wl[k];
      w.yc = yc; w.hw = hw; w.sx = mapX(ls); w.tx = mapX(lt); w.sd = ld * flip; w.span = Math.abs(w.tx - w.sx) || 1;
      w.ex = mapX(k ? xL : xR); w.ey = yc;           // the eddy the lane curls around
      w.grad = g.createLinearGradient(w.sx, 0, w.tx, 0);
      w.grad.addColorStop(0, rgba(w.col, 0)); w.grad.addColorStop(0.08, rgba(w.col, 0.95)); w.grad.addColorStop(0.62, rgba(w.col, 0.8)); w.grad.addColorStop(1, rgba(w.col, 0));
    });
    // reed at the end of the lane
    reedX = mapX(xE) + flip * Math.max(5, 4 * s); reedY = yC + 2;
    reedH = Math.min(D * 0.74, 128 * s);
    // buoys ride inside the two wind bands (that is why they are tossed); split by band length, staggered when tight
    const b1 = [xS + (xR - xS) * 0.12, xR + r * 0.3], b2 = [xL - r * 0.3, xE - (xE - xL) * 0.3];
    const l1 = b1[1] - b1[0], l2 = b2[1] - b2[0];
    const K1 = clamp(Math.round(K * l1 / (l1 + l2)), 1, K - 1), K2 = K - K1;
    cargo.forEach((c, j) => {
      const band = j < K1 ? 0 : 1, k = band ? j - K1 : j, cnt = band ? K2 : K1, seg2 = band ? b2 : b1;
      const len = seg2[1] - seg2[0], gap = len / cnt, stag = gap < cs * 1.25 ? (k % 2 ? 1 : -1) * D * 0.17 : 0;
      const lx = seg2[0] + gap * (k + 0.5);
      c.bx = clamp(mapX(lx), X0 + cs * 0.55, X0 + W - cs * 0.55);
      c.by = clamp((band ? winds[1].yc : winds[0].yc) + stag + cs * 0.35, Y0 + cs * 1.05, Y0 + H - cs * 0.3);
      // picked up where the lane first runs alongside its band (row A + first bend, or row B + second bend)
      const e1 = xR - xS + Math.PI * r, e2 = e1 + (xR - xL) + Math.PI * r, d0 = band ? e1 : 0, d1 = band ? e2 : e1;
      let best = 0, bd = Infinity;
      for (let i = 0; i < RN; i++) { if (RC[i] < d0 || RC[i] > d1) continue; const dx = RX[i] - c.bx, dy = RY[i] - (c.by - cs * 0.45), dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
      c.b = RC[best] / RL;
    });
    hangSpots();
    // history distances: plume nodes, then the tow line
    for (let i = 0; i < N; i++) DIST[i] = i * seg;
    for (let k = 0; k < 8; k++) DIST[N + k] = L + 8 * s + cs * 0.55 + k * cs * 1.04;
    buildCache();
    resetPath();
  }
  function hangSpots() {
    const two = K > 4, per = two ? Math.ceil(K / 2) : K;
    const sw0 = reedSway; reedSway = 0;
    const toU = (tier, f) => {          // arc fraction → bezier parameter
      let acc = 0, px = 0, py = 0; const n2 = 60, lens = [];
      for (let i = 0; i <= n2; i++) { leafPt(tier, i / n2, 1); if (i) acc += Math.hypot(tmpX - px, tmpY - py); lens.push(acc); px = tmpX; py = tmpY; }
      const want = f * acc; let i = 1; while (i < n2 && lens[i] < want) i++;
      return (i - 1 + (want - lens[i - 1]) / ((lens[i] - lens[i - 1]) || 1)) / n2;
    };
    cargo.forEach((c, j) => {
      c.tier = two && j >= per ? 1 : 0;
      const k = c.tier ? j - per : j, cnt = c.tier ? K - per : per;
      const f = c.tier ? 0.4 + 0.52 * (cnt <= 1 ? 0.5 : k / (cnt - 1)) : 0.3 + 0.64 * (cnt <= 1 ? 0.5 : k / (cnt - 1));
      c.hu = toU(c.tier, f);
      c.thread = 10 * s + ((j * 7) % 3) * 6 * s + (c.tier ? 0 : 4 * s);
    });
    reedSway = sw0;
  }
  function buildCache() {
    const cw = Math.ceil((W + pad * 2) * dpr), ch = Math.ceil((H + pad * 2) * dpr);
    if (!cache || cache.width !== cw || cache.height !== ch) cache = makeCanvas(cw, ch);
    const c = cache.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W + pad * 2, H + pad * 2);
    c.translate(pad - X0, pad - Y0);
    // a soft, still pool of water across the stage
    c.save(); c.translate(X0 + W / 2, Y0 + H / 2); c.scale(1, H / W);
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.72);
    const pa = bright ? 0.74 : 0.62;
    gr.addColorStop(0, rgba(C.water, pa)); gr.addColorStop(0.62, rgba(C.water, pa * 0.78)); gr.addColorStop(1, rgba(C.water, 0));
    c.fillStyle = gr; c.fillRect(-W, -W, W * 2, W * 2); c.restore();
    // faint reflected light streaks
    const rr = rng(E.seed * 3 + 7);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 30; i++) { const x = X0 + rr() * W, y = Y0 + rr() * H, w = 10 + rr() * 50; c.fillStyle = rgba(C.lane, 0.025 + rr() * 0.04); c.beginPath(); c.ellipse(x, y, w, 1 + rr() * 1.2, 0, 0, TAU); c.fill(); }
    c.restore();
    // the calm lane: a soft channel of light with two faint banks
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const path = (o) => { c.beginPath(); for (let i = 0; i < RN; i += 2) { const j = Math.min(RN - 1, i + 1), k = Math.max(0, i - 1); const tx = RX[j] - RX[k], ty = RY[j] - RY[k], l = Math.hypot(tx, ty) || 1; const x = RX[i] - ty / l * o, y = RY[i] + tx / l * o; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.lineTo(RX[RN - 1], RY[RN - 1]); };
    c.globalCompositeOperation = 'lighter';
    path(0); c.strokeStyle = rgba(C.lane, 0.035); c.lineWidth = laneHalf * 2 + 22; c.stroke();
    c.strokeStyle = rgba(C.lane, 0.05); c.lineWidth = laneHalf * 2; c.stroke();
    c.lineWidth = 1; c.strokeStyle = rgba(C.lane, 0.11);
    path(laneHalf + 3); c.stroke(); path(-laneHalf - 3); c.stroke();
    c.restore();
  }
  function restPoint(d) {
    // the feather rests on the lily pad, curving gently back from the stem
    const dd = Math.min(d, L * 1.3), lx = xS - d * 0.97, ly = yA + (dd / L) * (dd / L) * L * 0.08 + Math.max(0, d - L * 1.3) * 0.25;
    tmpX = mapX(Math.max(mx * 0.5, lx)); tmpY = Math.min(Y0 + H, ly);
  }
  function resetPath() {
    hHead = 0; hCount = 0; gHead = 0; gCount = 0;
    const back = L + 9 * cs + 40;
    const p0 = real;
    for (let d = back; d >= 0; d -= 3) {
      const dp = p0 - d / RL;
      if (dp >= 0) routeAt(dp); else restPoint(-dp * RL);     // before the lane: the rest curve on the lily pad
      pushHist(tmpX, tmpY); pushShadow(tmpX, tmpY);
    }
    routeAt(shown); stemX = tmpX; stemY = tmpY; prevSX = stemX; prevSY = stemY; shX = stemX; shY = stemY;
    pushHist(stemX, stemY); pushShadow(shX, shY);
    sampleHistory();
    for (let i = 0; i < N; i++) { PX[i] = SX[i]; PY[i] = SY[i]; PVX[i] = 0; PVY[i] = 0; }
    for (const c of cargo) { if (c.state === 0) { c.x = c.bx; c.y = c.by; } else if (c.slot >= 0) { c.x = SX[N + c.slot]; c.y = SY[N + c.slot]; } c.vx = c.vy = 0; }
  }
  function pushHist(x, y) { HX[hHead] = x; HY[hHead] = y; hHead = (hHead + 1) % HN; if (hCount < HN) hCount++; }
  function pushShadow(x, y) { GX[gHead] = x; GY[gHead] = y; gHead = (gHead + 1) % HN; if (gCount < HN) gCount++; }
  /** sample a ring-buffered path backwards from (hx, hy) at the DIST distances */
  function sampleTrail(BX, BY, head, count, hx, hy, total, OX, OY) {
    let px = hx, py = hy, ox = hx, oy = hy, acc = 0, j = 0;
    for (let c = 0; c < count && j < total; c++) {
      const qi = (head - 1 - c + HN * 2) % HN, qx = BX[qi], qy = BY[qi];
      const sl = Math.hypot(qx - px, qy - py);
      if (sl < 1e-4) continue;
      while (j < total && DIST[j] <= acc + sl) { const f = (DIST[j] - acc) / sl; OX[j] = px + (qx - px) * f; OY[j] = py + (qy - py) * f; j++; }
      acc += sl; ox = px; oy = py; px = qx; py = qy;
    }
    const ex = px - ox, ey = py - oy, el = Math.hypot(ex, ey) || 1;
    while (j < total) { OX[j] = px + (ex / el) * (DIST[j] - acc); OY[j] = py + (ey / el) * (DIST[j] - acc); j++; }
  }
  function sampleHistory() {
    sampleTrail(HX, HY, hHead, hCount, stemX, stemY, N + 8, SX, SY);
    sampleTrail(GX, GY, gHead, gCount, shX, shY, N, FX, FY);
    for (let i = 0; i < N; i++) { QX[i] = lerp(SX[i], FX[i], lead); QY[i] = lerp(SY[i], FY[i], lead); }
  }
  function shadowFromFeather() { GX.set(HX); GY.set(HY); gHead = hHead; gCount = hCount; shX = stemX; shY = stemY; }
  fit();
  E.onResize(fit);

  // ------------------------------------------------------------ update --
  const glidePx = () => 128 * s;      // the soft feather's own pace: faster than this and it is left behind its shadow
  function frame(dt, t) {
    lastT = t;
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const prog = shown;
    const agit = agit0 * lerp(1, 0.45, smooth(prog)) * (1 - fin * 0.88);
    for (const w of winds) w.g = agit * (0.8 + 0.2 * Math.sin(t * 0.61 + w.ph) + 0.14 * nz(t * 0.33, w.ph * 3));

    // ---- input → wanted (rate-limited: the soft feather can't be yanked)
    if (dt > 0) {
      if (drag != null && onLane && finAt < 0) {
        const rate = (glidePx() / RL) * lerp(1, 0.6, loss);     // a feather that has lost its shadow drags a little
        grabOff *= Math.exp(-dt * 1.5);                       // the stem settles under your fingertip
        const tgt = fingerP >= 0.996 ? 1 : clamp(fingerP + grabOff, 0, 1);
        if (tgt > wanted) wanted = Math.min(tgt, wanted + rate * dt);
        else wanted = Math.max(tgt, wanted - rate * 0.6 * dt);
      }
      if (assistTo != null) {
        const before = wanted;
        wanted = Math.min(assistTo, wanted + dt * 0.26);
        if (assistTo - wanted < 1e-4) assistTo = null;
        if (wanted <= before + 1e-6 || real <= lastReal + 1e-6) { assistStall += dt; if (assistStall > 0.8) assistTo = null; } else assistStall = 0;
      }
    }
    wanted = clamp(wanted);
    const p = E.gate(wanted);                 // the world law decides how far the skiff may really go
    lastReal = real; real = p;
    if (wanted > real + BANK) wanted = real + BANK;
    if (drag != null && E.locked && fingerP + grabOff > real + BANK * 0.9 && t - lastWaitAt > 0.9) { lastWaitAt = t; wob.kick(0.8); E.checkpoint('wait'); E.sound('drip', { note: 1, intensity: 0.22 }); }
    shown = lerp(shown, real, 1 - Math.exp(-dt * 9));
    if (Math.abs(shown - real) < 1e-4) shown = real;

    // ---- the stem: on the lane, drifting sideways with your finger and the wind
    routeAt(shown);
    const bx = tmpX, by = tmpY, nxl = -tmpTY, nyl = tmpTX;
    windAt(bx, by);
    const windHere = Math.hypot(wfx, wfy);
    const latT = (drag != null && onLane ? clamp(fingerLat, -laneHalf, laneHalf) : 0) + (wfx * nxl + wfy * nyl) * 4 * s * (drag != null ? 0.4 : 1);
    wob.update(Math.min(dt, 0.033));
    const steps = dt > 1 / 45 ? 2 : 1, h = dt / steps;
    for (let k = 0; k < steps; k++) { latV += (70 * (latT - lat) - 14 * latV) * h; lat += latV * h; }
    const shiver = reduced ? 0 : wob.v * 5 * s;
    stemX = bx + nxl * (lat + shiver); stemY = by + nyl * (lat + shiver);
    const mv = Math.hypot(stemX - prevSX, stemY - prevSY);
    if (dt > 0) stemSpeed = lerp(stemSpeed, mv / dt, 1 - Math.exp(-dt * 8));
    wakeAcc += mv; prevSX = stemX; prevSY = stemY;
    const hi = (hHead - 1 + HN) % HN;
    if (Math.hypot(stemX - HX[hi], stemY - HY[hi]) >= 2.5) pushHist(stemX, stemY);
    // the shadow follows your actual path: it runs ahead with a rushing finger, and slides back under the feather when you let go
    const holding = drag != null && onLane && finAt < 0;
    if (holding) {
      routeAt(clamp(Math.min(fingerP, real + 0.14), 0, 1));
      const fl = relGrab ? lat : clamp(fingerLat, -laneHalf - 6 * s, laneHalf + 6 * s);
      let gx = tmpX - tmpTY * fl, gy = tmpY + tmpTX * fl;
      if (fingerP <= real + 0.004) { gx = lerp(gx, stemX, 0.85); gy = lerp(gy, stemY, 0.85); }
      const kk = 1 - Math.exp(-dt * 16);
      shX += (gx - shX) * kk; shY += (gy - shY) * kk;
      const gi = (gHead - 1 + HN) % HN;
      if (Math.hypot(shX - GX[gi], shY - GY[gi]) >= 2.5) pushShadow(shX, shY);
    }
    lead = holding ? Math.min(1, lead + dt * 8) : Math.max(0, lead - dt * 2.2);
    sampleHistory();

    // ---- the soft plume: springs towards its shadow, pushed by the wind
    const sp = clamp(stemSpeed / glidePx());
    const gain = (0.5 + 1.1 * sp) * 15 * s * (1 - fin);
    for (let k = 0; k < steps; k++) {
      PX[0] = stemX; PY[0] = stemY; PVX[0] = PVY[0] = 0;
      for (let i = 1; i < N; i++) {
        const u = i / (N - 1);
        windAt(PX[i], PY[i]); WLOC[i] = Math.min(1, Math.hypot(wfx, wfy));
        const ex = (0.2 + 0.8 * u) * gain;
        const tx = SX[i] + wfx * ex, ty = SY[i] + wfy * ex;
        PVX[i] += (KS[i] * (tx - PX[i]) - CSd[i] * PVX[i]) * h; PVY[i] += (KS[i] * (ty - PY[i]) - CSd[i] * PVY[i]) * h;
        PX[i] += PVX[i] * h; PY[i] += PVY[i] * h;
      }
      for (let it = 0; it < 2; it++) for (let i = 1; i < N; i++) {
        const dx = PX[i] - PX[i - 1], dy = PY[i] - PY[i - 1], d = Math.hypot(dx, dy) || 1e-4, f = (d - seg) / d;
        if (i === 1) { PX[i] -= dx * f; PY[i] -= dy * f; } else { PX[i] -= dx * f * 0.5; PY[i] -= dy * f * 0.5; PX[i - 1] += dx * f * 0.5; PY[i - 1] += dy * f * 0.5; }
      }
    }
    let ss = 0; for (let i = 2; i < N; i++) { const dx = PX[i] - QX[i], dy = PY[i] - QY[i]; ss += dx * dx + dy * dy; }
    sep = Math.max(Math.sqrt(ss / (N - 2)), Math.hypot(stemX - shX, stemY - shY) * 0.8);
    loss = lerp(loss, smooth(invLerp(11 * s, 30 * s, sep)), 1 - Math.exp(-dt * 6));
    if (!lost && loss > 0.62 && drag != null) {
      lost = true;
      if (t - lastLostAt > 1.2) { lastLostAt = t; E.sound('swish', { intensity: 0.28 }); E.haptic('tick'); wob.kick(0.5); }
      if (!lostHinted && round === 1) { lostHinted = true; E.hint('Gently — slow down so the feather keeps its shadow.'); }
    } else if (lost && loss < 0.25) {
      lost = false; E.sound('glass', { note: 6, intensity: 0.3 }); E.react('nod');
      E.particles.burst(PX[4], PY[4], reduced ? 3 : 7, { speed: 26, colour: warm, life: 0.9, size: 5 });
    }
    if (!windIn && windHere > 0.32 * agit0 && drag != null) { windIn = true; E.sound('wind', { intensity: 0.22 + 0.2 * agit }); }
    else if (windIn && windHere < 0.15 * agit0) windIn = false;

    // ---- lane beads sing as the stem passes them
    const bead = Math.floor(shown * NB + 0.02);
    if (bead > lastBead && finAt < 0) {
      const pan = clamp((stemX - stage.cx) / (W * 0.5), -1, 1);
      E.sound('pluck', { note: MELODY[beadNote++ % MELODY.length], intensity: 0.24 + 0.08 * (1 - agit), pan });
      if (!reduced && !low) E.particles.emit({ x: BX[Math.min(NB - 1, bead - 1)], y: BY[Math.min(NB - 1, bead - 1)], vy: -14, life: 0.9, size: 7, colour: warm, alpha: 0.7 });
    }
    lastBead = Math.max(lastBead, bead);
    if (wakeAcc > 26 * s && finAt < 0) { wakeAcc = 0; E.ripples.add(stemX, stemY + 3 * s, { colour: C.lane, speed: 34, alpha: 0.22, r: 4 }); }
    if (drag != null && t - lookAt > 0.35) { lookAt = t; E.look?.(stemX, stemY); }

    // ---- cargo: moored → unhooked → in tow → delivered
    updateCargo(dt, t, fin);
    // ---- the reed
    if (touchAt < 0 && shown > 0.993) {
      touchAt = t; reedBowV += 3.2;
      E.sound('glass', { note: 9, intensity: 0.5 }); E.sound('chime', { intensity: 0.32 }); E.haptic('soft');
      E.ripples.add(reedX, reedY, { colour: warm, speed: 50, alpha: 0.5, r: 6 }); E.ripples.add(reedX, reedY, { colour: C.lane, speed: 30, alpha: 0.35, r: 3 });
    }
    reedBowV += (-26 * reedBow - 4.2 * reedBowV) * Math.min(dt, 0.04); reedBow += reedBowV * Math.min(dt, 0.04);
    if (!doneFlag && real >= 0.999 && drag == null && assistTo == null && shown > 0.995) doneFlag = true;
    if (twistAt >= 0) updateDown(dt, t);

    // ---- draw
    g.drawImage(cache, X0 - pad, Y0 - pad, W + pad * 2, H + pad * 2);
    drawWaterLife(t, agit);
    drawWinds(t, agit, fin);
    drawBeads(t, fin);
    drawPad(t);
    drawReed(t, fin);
    drawBuoys(t);
    drawShadows(t, fin);
    drawCargo(t, fin, false);
    drawPlume(t, fin);
    if (E.phase !== 'law') drawStemWords(t);
    drawStem(t, fin);
    if (twistAt >= 0) drawTwist(t);
    drawTether(t);
    drawCargo(t, fin, true);
  }

  function updateCargo(dt, t, fin) {
    const pickAt = (L + 6) / RL;
    for (const c of cargo) {
      if (c.state === 0 && real >= c.b + Math.min(pickAt, (0.985 - c.b) * 0.6) && finAt < 0) unhook(c, t);   // as the plume's tail passes (sooner near the reed)
      if (c.state === 0) { windAt(c.bx, c.by); c.x = c.bx + wfx * 7 * s + Math.sin(t * 1.3 + c.phs) * 1.5 * s; c.y = c.by + wfy * 7 * s + Math.sin(t * 1.7 + c.phs) * 1.2 * s; continue; }
      c.tone = Math.max(0, c.tone - dt / 1.1);
      let tx = SX[N + c.slot], ty = SY[N + c.slot];
      if (c.state === 2 || c.state === 1) {
        if (c.state === 1) { const k = clamp((t - c.t0) / 0.9); tx = lerp(c.bx, tx, ease.inOutSine(k)); ty = lerp(c.by, ty, ease.inOutSine(k)); if (k >= 1) c.state = 2; }
        const kk = c.state === 1 ? 160 : 48, cc = 2 * Math.sqrt(kk) * 0.8;
        c.vx += (kk * (tx - c.x) - cc * c.vx) * Math.min(dt, 0.04); c.vy += (kk * (ty - c.y) - cc * c.vy) * Math.min(dt, 0.04);
        c.x += c.vx * Math.min(dt, 0.04); c.y += c.vy * Math.min(dt, 0.04);
        if (finAt >= 0 && t - finAt > 0.2 + c.slot * 0.16) { c.state = 3; c.t0 = t; c.fx = c.x; c.fy = c.y; }
      } else if (c.state === 3) {
        const k = ease.inOutSine(clamp((t - c.t0) / 1.4));
        c.lift = k;
        leafPt(c.tier, c.hu, 1); c.ax = tmpX; c.ay = tmpY;
        const swing = Math.sin(t * 1.1 + c.phs) * 0.06 * (reduced ? 0.3 : 1);
        c.hx = c.ax + Math.sin(swing) * (c.thread + cargoH(c)); c.hy = c.ay + c.thread + cargoH(c) + cs * 0.04;
        c.x = lerp(c.fx, c.hx, k); c.y = lerp(c.fy, c.hy, k) - Math.sin(k * Math.PI) * 22 * s;
      }
    }
  }
  function cargoH(c) { return c.ph >= 0 ? photos.size(c.ph, 'card', cs).h : cs * 0.58 * 1.1; }
  function unhook(c, t) {
    c.state = 1; c.t0 = t; c.slot = picked++; c.x = c.bx; c.y = c.by;
    if (c.ph >= 0) { photos.dust(c.ph, c.bx, c.by - cs * 0.4, cs, reduced ? 6 : 14, { shape: 'card', up: 24, speed: 20 }); E.checkpoint('photo', c.ph); }
    else E.checkpoint('step');
    E.sound('bubble', { note: (c.j * 2 + 3) % 10, intensity: 0.38 });
    E.particles.burst(c.bx, c.by, reduced ? 3 : 8, { speed: 34, colour: warm, life: 1, size: 6 });
  }
  function updateDown(dt, t) {
    // the twist's downy companion follows the plume tip a little to one side
    const i = N - 3, tx = PX[i] + NX[i] * 26 * s, ty = PY[i] + NY[i] * 26 * s - 6 * s;
    const fx = finAt >= 0 ? reedX - flip * 26 * s : tx, fy = finAt >= 0 ? reedY - reedH * 0.98 : ty;
    const h = Math.min(dt, 0.04);
    down.vx += (16 * (fx - down.x) - 5 * down.vx) * h; down.vy += (16 * (fy - down.y) - 5 * down.vy) * h;
    down.x += down.vx * h; down.y += down.vy * h;
  }

  // ------------------------------------------------------------ drawing --
  function drawWaterLife(t, agit) {
    // slow drifting light on the water (hypnotic, very faint)
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const y = Y0 + H * (0.1 + 0.27 * i) + Math.sin(t * 0.21 + i * 1.7) * 9 * s;
      const x = X0 + W * (0.5 + 0.35 * Math.sin(t * 0.07 * (i + 1) + i));
      g.fillStyle = rgba(C.lane, 0.035 + 0.015 * Math.sin(t * 0.5 + i));
      g.beginPath(); g.ellipse(x, y, W * 0.32, 2.2 * s, 0, 0, TAU); g.fill();
    }
    g.restore();
    void agit;
  }
  function windY(w, jj, x, u, t, amp) {
    return w.yc + w.off[jj] * w.hw * (1 - 0.5 * smooth((u - 0.55) / 0.45)) + amp * Math.sin(x * w.kk[jj] / s - t * w.om[jj] * (reduced ? 0.4 : 1) * w.sd + w.php[jj]) * (0.45 + 0.55 * u);
  }
  function drawWinds(t, agit, fin) {
    const vis = (0.55 + 0.45 * agit / Math.max(0.3, agit0)) * (1 - fin * 0.45) * (bright ? 1.35 : 1);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const w of winds) {
      g.strokeStyle = w.grad;
      const steps = Math.max(20, Math.round(w.span / 10));
      // the body of the current: a broad, very soft band of moving air
      g.beginPath();
      for (let q = 0; q <= steps; q++) { const u = q / steps, x = w.sx + w.sd * u * w.span, y = w.yc + Math.sin(x * 0.011 / s - t * 0.4 * w.sd + w.ph) * w.hw * 0.12; q ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.setLineDash(EMPTY);
      g.globalAlpha = 0.05 * vis; g.lineWidth = w.hw * 1.7; g.stroke();
      g.globalAlpha = 0.06 * vis; g.lineWidth = w.hw * 0.8; g.stroke();
      for (let j = 0; j < w.M; j++) {
        const jj = w.M === 9 ? j : Math.round(j * 1.5);
        const amp = w.amp[jj] * w.hw * (0.3 + 0.7 * agit) * (1 - fin * 0.7);
        g.beginPath();
        for (let q = 0; q <= steps; q++) { const u = q / steps, x = w.sx + w.sd * u * w.span, y = windY(w, jj, x, u, t, amp); q ? g.lineTo(x, y) : g.moveTo(x, y); }
        const core = 1 - Math.abs(w.off[jj]);
        g.setLineDash(EMPTY); g.globalAlpha = (0.1 + 0.08 * core) * vis; g.lineWidth = 1 * s; g.stroke();          // silk thread
        g.setLineDash(w.dash[jj]); g.lineDashOffset = -t * w.v[jj] * (reduced ? 0.4 : 1) * (0.45 + 0.7 * agit);
        g.globalAlpha = (0.26 + 0.2 * core) * vis * (0.75 + 0.25 * w.g); g.lineWidth = (1.3 + 1.5 * core) * s; g.stroke();   // flowing strand
        if (!low && j % 2 === 0) {
          const u = ((t * w.v[jj] * 0.003 * (0.5 + agit) + jj * 0.37) % 1), x = w.sx + w.sd * u * w.span, y = windY(w, jj, x, u, t, amp);
          g.globalAlpha = 1; glow(g, x, y, 6 * s, w.col, 0.6 * (1 - u * u) * vis);
        }
      }
      g.setLineDash(EMPTY); g.globalAlpha = 1;
      // the eddy at the wind's tip, curling slowly — the lane bends around it
      const rot = t * 0.32 * w.sd * (reduced ? 0.3 : 1) + w.ph;
      spiral(g, w.ex, w.ey, r * 0.5, rot, w.col, { arms: 3, turns: 1.05, alpha: 0.16 * vis, width: 1.4 * s });
      g.strokeStyle = rgba(w.col, 0.22 * vis);
      for (let k = 0; k < 3; k++) { const rr = r * (0.28 + k * 0.12), a0 = rot * (1 + k * 0.3) + k * 2.1; g.lineWidth = (1.8 - k * 0.4) * s; g.beginPath(); g.arc(w.ex, w.ey, rr, a0, a0 + 1.6 + k * 0.4); g.stroke(); }
      glow(g, w.ex, w.ey, r * 0.62, w.col, 0.12 * vis);
    }
    g.restore();
  }
  function drawBeads(t, fin) {
    const sk = fin > 0 ? (t - finAt) / 2.2 : -1;
    for (let i = 0; i < NB; i++) {
      const u = (i + 0.5) / NB, passed = u < shown;
      if (passed || sk > u) {
        const sw = sk > 0 ? Math.max(0, 1 - Math.abs(sk - u) * 6) : 0;
        glow(g, BX[i], BY[i], (5 + 5 * sw) * s, warm, 0.32 + 0.4 * sw);
        g.fillStyle = rgba(mix(warm, '#ffffff', 0.5), 0.55 + 0.3 * sw); g.beginPath(); g.arc(BX[i], BY[i], 1.5 * s, 0, TAU); g.fill();
      } else {
        const ahead = u - shown, wave = 0.5 + 0.5 * Math.sin(t * 2.1 - i * 0.55);
        const a = (0.16 + 0.22 * wave) * (ahead < 0.12 ? 1.4 : 1);
        g.fillStyle = rgba(C.lane, clamp(a)); g.beginPath(); g.arc(BX[i], BY[i], (1.4 + 0.8 * wave) * s, 0, TAU); g.fill();
        if (ahead < 0.1) glow(g, BX[i], BY[i], 7 * s, C.lane, 0.18 * (1 - ahead * 10));
      }
    }
  }
  function drawPad(t) {
    // the launch lily pad the feather rested on
    const x = mapX(xS - L * 0.5), y = yA + L * 0.12, rx = L * 0.42, ry = L * 0.165, bob = Math.sin(t * 0.8) * 0.8 * s;
    const notch = flip > 0 ? -0.35 : Math.PI + 0.35;
    const left = clamp(shown * RL / (L * 1.4));
    g.save(); g.translate(x, y + bob); g.globalAlpha = 1 - left * 0.45;
    g.strokeStyle = rgba(C.lane, 0.1 + 0.04 * Math.sin(t * 0.9)); g.lineWidth = 1;
    g.beginPath(); g.ellipse(0, 1.5 * s, rx * 1.18, ry * 1.25, 0, 0, TAU); g.stroke();
    const gr = g.createRadialGradient(-rx * 0.25, -ry * 0.5, 2, 0, 0, rx);
    gr.addColorStop(0, rgba(mix(C.pad, '#ffffff', 0.3), 0.85)); gr.addColorStop(0.65, rgba(C.pad, 0.78)); gr.addColorStop(1, rgba(mix(C.pad, '#000010', 0.45), 0.8));
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.ellipse(0, 0, rx, ry, 0, notch + 0.09, notch + TAU - 0.09); g.closePath(); g.fill();
    g.strokeStyle = rgba(mix(C.pad, '#ffffff', 0.6), 0.32); g.lineWidth = 1.1; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.85); g.stroke();
    g.strokeStyle = rgba(mix(C.pad, '#ffffff', 0.4), 0.16); g.lineWidth = 0.7;
    g.beginPath(); for (let i = 0; i < 9; i++) { const a = notch + 0.45 + i * (TAU - 0.9) / 8; g.moveTo(0, 0); g.lineTo(Math.cos(a) * rx * 0.88, Math.sin(a) * ry * 0.88); } g.stroke();
    orb(g, -rx * 0.42, -ry * 0.18, 2.4 * s, mix(C.lane, '#ffffff', 0.5), { alpha: 0.8 });
    // a closed lotus bud at the back of the pad, opening a little once the feather has gone
    const bx2 = -flip * rx * 0.55, by2 = -ry * 0.25, op = left * 0.5;
    for (let k = -1; k <= 1; k++) {
      g.save(); g.translate(bx2, by2); g.rotate(k * (0.35 + op));
      const pg = g.createLinearGradient(0, 0, 0, -9 * s); pg.addColorStop(0, mix(P.accent, '#ffffff', 0.35)); pg.addColorStop(1, mix(P.accent, '#ffffff', 0.75));
      g.fillStyle = pg; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(4 * s, -5 * s, 0, -10 * s); g.quadraticCurveTo(-4 * s, -5 * s, 0, 0); g.fill(); g.restore();
    }
    g.restore();
    glow(g, x + bx2, y + by2 - 5 * s, 12 * s, P.accent, 0.12 + 0.12 * left);
  }
  function leafPt(tier, u, grow) {
    // two long leaves unfurl from the reed at the finale; lanterns hang beneath them
    const sw = reedSway * 0.5;
    const x0 = reedX, y0 = reedY - reedH * (tier ? 0.1 : 0.18);
    const x1 = reedX - flip * W * (tier ? 0.2 : 0.27) + sw, y1 = reedY - reedH * (tier ? 0.92 : 1.42);
    const x2 = reedX - flip * W * (tier ? 0.52 : 0.74) + sw * 1.4, y2 = reedY - reedH * (tier ? 0.46 : 0.9) + (1 - grow) * reedH * 0.4;
    const v = u, a = (1 - v) * (1 - v), b = 2 * v * (1 - v), c = v * v;
    tmpX = a * x0 + b * x1 + c * x2; tmpY = a * y0 + b * y1 + c * y2;
  }
  function drawLeaf(tier, k, col) {
    if (k <= 0) return;
    const n2 = 22;
    g.beginPath();
    const bw = (u) => Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.95)) * 5.5 * s + 0.8;
    for (let i = 0; i <= n2; i++) { const u = (i / n2) * k; leafPt(tier, u, k); const w = bw(u); i ? g.lineTo(tmpX, tmpY - w) : g.moveTo(tmpX, tmpY - w); }
    for (let i = n2; i >= 0; i--) { const u = (i / n2) * k; leafPt(tier, u, k); const w = bw(u) * 0.7; g.lineTo(tmpX, tmpY + w); }
    g.closePath(); g.fillStyle = col; g.fill();
    g.beginPath(); for (let i = 0; i <= n2; i++) { leafPt(tier, (i / n2) * k, k); i ? g.lineTo(tmpX, tmpY) : g.moveTo(tmpX, tmpY); }
    g.strokeStyle = rgba(mix(C.reed, '#ffffff', 0.5), 0.45); g.lineWidth = 0.8; g.stroke();
  }
  function drawReed(t, fin) {
    const near = smooth(invLerp(0.72, 1, shown));
    const lit = Math.max(touchAt >= 0 ? smooth(clamp((t - touchAt) / 1.4)) : 0, fin);
    windAt(reedX, reedY - reedH * 0.6);
    const sway = Math.sin(t * 0.9) * 3 * s + wfx * 7 * s + reedBow * 12 * s;
    reedSway = sway;
    // reflection on the water
    g.save(); g.globalAlpha = 0.16; g.strokeStyle = C.reed; g.lineWidth = 2.2 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(reedX, reedY + 2); g.quadraticCurveTo(reedX - sway * 0.2, reedY + reedH * 0.2, reedX - sway * 0.4, reedY + reedH * 0.3); g.stroke(); g.restore();
    // blades
    const blade = (dir, len, lift, w0, col) => {
      const tx = reedX + dir * len + sway * 0.5, ty = reedY - lift;
      const lg = g.createLinearGradient(reedX, reedY, tx, ty); lg.addColorStop(0, rgba(C.reedDeep, 0.95)); lg.addColorStop(1, rgba(col, 0.85));
      g.fillStyle = lg; g.beginPath(); g.moveTo(reedX - w0, reedY);
      g.quadraticCurveTo(reedX + dir * len * 0.15, reedY - lift * 1.45, tx, ty);
      g.quadraticCurveTo(reedX + dir * len * 0.28, reedY - lift * 1.1, reedX + w0, reedY); g.fill();
    };
    blade(-flip, reedH * 0.62, reedH * 0.36, 3.2 * s, mix(C.reed, C.reedDeep, 0.35));
    blade(flip, reedH * 0.3, reedH * 0.52, 2.6 * s, mix(C.reed, C.reedDeep, 0.2));
    // finale: two long leaves unfurl to receive the lanterns
    if (finAt >= 0) {
      const k1 = smooth(clamp((t - finAt - 0.05) / 1.1)), k2 = smooth(clamp((t - finAt - 0.3) / 1.1));
      const lc = rgba(mix(C.reed, warm, 0.25), 0.9);
      drawLeaf(0, k1, lc); if (K > 4) drawLeaf(1, k2, lc);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; drawLeaf(0, k1, rgba(warm, 0.18)); g.restore();
    }
    const stalk = (ox, hh, ph, wdt, main) => {
      const sw = sway * (main ? 1 : 0.8) + Math.sin(t * 1.1 + ph) * 2 * s;
      const x0 = reedX + ox, tx = x0 + sw - flip * hh * 0.08, ty = reedY - hh;
      const sg = g.createLinearGradient(x0, reedY, tx, ty);
      sg.addColorStop(0, C.reedDeep); sg.addColorStop(0.6, mix(C.reed, warm, main ? lit * 0.35 : 0)); sg.addColorStop(1, mix(C.reed, '#ffffff', 0.25));
      g.strokeStyle = sg; g.lineWidth = wdt; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, reedY); g.quadraticCurveTo(x0 + sw * 0.2, reedY - hh * 0.55, tx, ty); g.stroke();
      // velvet seed head
      const hx = lerp(x0, tx, 0.84) + sw * 0.06, hy = reedY - hh * 0.78, hl = hh * (main ? 0.2 : 0.16), hw2 = wdt * (main ? 1.9 : 1.6);
      const ang = Math.atan2(ty - reedY, tx - x0) + Math.PI / 2;
      if (main) glow(g, hx, hy, (18 + 12 * lit) * s, warm, 0.1 + 0.28 * near + 0.45 * lit);
      g.save(); g.translate(hx, hy); g.rotate(ang);
      const hg = g.createLinearGradient(-hw2, 0, hw2, 0);
      hg.addColorStop(0, mix(C.head, '#1a0c06', 0.45)); hg.addColorStop(0.42, mix(C.head, '#fff0d8', 0.18 + (main ? lit * 0.5 : 0))); hg.addColorStop(1, mix(C.head, '#1a0c06', 0.55));
      g.fillStyle = hg; roundRectPath(-hw2, -hl / 2, hw2 * 2, hl, hw2); g.fill();
      g.strokeStyle = rgba('#fff4e0', 0.18 + 0.3 * (main ? lit : 0)); g.lineWidth = 0.8; g.beginPath(); g.moveTo(-hw2 * 0.4, -hl * 0.4); g.lineTo(-hw2 * 0.4, hl * 0.4); g.stroke();
      g.restore();
      return [tx, ty];
    };
    stalk(flip * 9 * s, reedH * 0.7, 1.3, 1.7 * s, false);
    stalk(-flip * 8 * s, reedH * 0.52, 2.4, 1.5 * s, false);
    const [tx, ty] = stalk(0, reedH, 0, 2.8 * s, true);
    glow(g, tx, ty, 6 * s, mix(warm, '#ffffff', 0.5), 0.3 + 0.5 * lit);
    if (lit > 0) {
      // light climbs the receiving reed
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(warm, 0.55 * lit); g.lineWidth = 1.6 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(reedX, reedY); g.quadraticCurveTo(reedX + sway * 0.2, reedY - reedH * 0.55 * lit, lerp(reedX, tx, lit), lerp(reedY, ty, lit)); g.stroke(); g.restore();
    }
    // the receiving ring at the waterline
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(warm, 0.3 + 0.35 * near + 0.3 * lit + 0.1 * pulse); g.lineWidth = 1.7 * s;
    g.beginPath(); g.ellipse(reedX, reedY - 1, 11 * s, 3.8 * s, 0, 0, TAU); g.stroke();
    g.strokeStyle = rgba(warm, 0.12 + 0.2 * near); g.lineWidth = 1; g.beginPath(); g.ellipse(reedX, reedY - 1, (16 + 6 * pulse) * s, (5.5 + 2 * pulse) * s, 0, 0, TAU); g.stroke();
    g.restore();
    glow(g, reedX, reedY, (20 + 8 * pulse * (1 - lit)) * s, warm, 0.16 + 0.35 * near + 0.3 * lit);
  }
  function roundRectPath(x, y, w, h, rr) {
    rr = Math.min(rr, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath();
  }
  function drawBuoys(t) {
    for (const c of cargo) {
      const a = c.state === 0 ? 1 : Math.max(0, 1 - (t - c.t0) / 0.8);
      if (a <= 0) continue;
      g.save(); g.globalAlpha = a;
      g.strokeStyle = rgba(C.lane, 0.45); g.lineWidth = 1.2 * s;
      g.beginPath(); g.ellipse(c.bx, c.by + cs * 0.12, 7 * s, 2.6 * s, 0, 0, TAU); g.stroke();
      if (c.state === 0) { g.strokeStyle = rgba(C.lane, 0.3); g.lineWidth = 0.8; g.beginPath(); g.moveTo(c.bx, c.by + cs * 0.12); g.quadraticCurveTo((c.bx + c.x) / 2, c.by + cs * 0.2, c.x, c.y); g.stroke(); }
      g.restore();
      glow(g, c.bx, c.by + cs * 0.12, 9 * s, C.lane, 0.2 * a);
    }
  }
  function drawShadows(t, fin) {
    const ox = 4 * s, oy = 10 * s;
    for (const c of cargo) {
      if (c.lift > 0.5) continue;
      g.fillStyle = rgba(C.shadow, 0.34 * (1 - c.lift)); g.beginPath(); g.ellipse(c.x + ox * 0.6, c.y + oy * 0.45, cs * 0.46, cs * 0.12, 0, 0, TAU); g.fill();
    }
    // the plume's shadow, laid along your actual path
    normals(QX, QY);
    const kept = 1 - loss;
    g.save();
    g.shadowColor = rgba(C.shadow, 0.7); g.shadowBlur = (8 + 6 * loss) * s;
    outline(QX, QY, ox, oy, 1.04, 0, t);
    g.fillStyle = rgba(C.shadow, (0.34 + 0.22 * kept) * (bright ? 0.7 : 1)); g.fill();
    g.restore();
    // a thin caustic edge: warm when the feather rides its shadow, cool and faint when it lifts away
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(mix(C.lane, warm, Math.max(kept, fin)), 0.1 + 0.16 * Math.max(kept, fin)); g.lineWidth = 1.1; g.stroke();
    g.restore();
  }
  function normals(X, Y) {
    for (let i = 0; i < N; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1);
      const tx = X[i0] - X[i1], ty = Y[i0] - Y[i1], l = Math.hypot(tx, ty) || 1;
      NX[i] = -ty / l; NY[i] = tx / l;
    }
  }
  function flutter(i, t, side) {
    if (reduced) return 0;
    const u = i / (N - 1);
    return (0.4 + 3.4 * WLOC[i]) * s * u * u * Math.sin(t * (6 + side) + i * 1.3 + side * 2);
  }
  /** feather silhouette along nodes X/Y (side A forward, around the tip, side B back) */
  function outline(X, Y, ox, oy, wsc, fl, t) {
    let k = 0;
    for (let i = 1; i < N; i++) { const w = WA[i] * L * wsc + (fl ? flutter(i, t, 0) : 0); OL[k++] = X[i] + NX[i] * w + ox; OL[k++] = Y[i] + NY[i] * w + oy; }
    for (let i = N - 1; i >= 1; i--) { const w = WB[i] * L * wsc + (fl ? flutter(i, t, 1) : 0); OL[k++] = X[i] - NX[i] * w + ox; OL[k++] = Y[i] - NY[i] * w + oy; }
    const m = k / 2;
    g.beginPath(); g.moveTo(OL[0], OL[1]);
    for (let j = 1; j < m - 1; j++) { const x = OL[j * 2], y = OL[j * 2 + 1], x2 = OL[j * 2 + 2], y2 = OL[j * 2 + 3]; g.quadraticCurveTo(x, y, (x + x2) / 2, (y + y2) / 2); }
    g.lineTo(OL[(m - 1) * 2], OL[(m - 1) * 2 + 1]);
    g.closePath();
  }
  function plumeAt(u) {
    // position, left normal and arc of the rachis at fraction u (0 stem → 1 tip)
    const f = clamp(u) * (N - 1), i = Math.min(N - 2, Math.floor(f)), k = f - i;
    tmpX = lerp(PX[i], PX[i + 1], k); tmpY = lerp(PY[i], PY[i + 1], k);
    tmpTX = lerp(NX[i], NX[i + 1], k); tmpTY = lerp(NY[i], NY[i + 1], k);
    return i;
  }
  function widthAt(arr, u) { const f = clamp(u) * (N - 1), i = Math.min(N - 2, Math.floor(f)); return lerp(arr[i], arr[i + 1], f - i) * L; }
  function drawPlume(t, fin) {
    normals(PX, PY);
    const lift = loss;
    // soft halo of light under the vane
    for (let i = 2; i < N; i += 3) glow(g, PX[i], PY[i], L * 0.36, mix(P.glow, warm, fin * 0.6), 0.13 + 0.06 * Math.sin(t * 1.3 + i) + fin * 0.1);
    // vane body
    const gr = g.createLinearGradient(PX[1], PY[1], PX[N - 1], PY[N - 1]);
    gr.addColorStop(0, rgba(C.vane, 1)); gr.addColorStop(0.5, rgba(C.vaneMid, 1)); gr.addColorStop(1, rgba(C.vaneTip, 1));
    g.fillStyle = gr;
    outline(PX, PY, 0, 0, 0.62, 0, t); g.globalAlpha = 0.5; g.fill();       // dense core along the stem
    g.save(); g.shadowColor = rgba(mix(P.glow, warm, fin * 0.6), bright ? 0.45 : 0.6); g.shadowBlur = 14 * s;
    outline(PX, PY, 0, 0, 1, 1, t); g.globalAlpha = 0.8; g.fill();           // soft vane, haloed in light
    g.restore();
    g.globalAlpha = 1;
    // the underside of the curved vane (depth), on side B
    g.save(); g.clip();
    g.beginPath();
    for (let i = 1; i < N; i++) { const x = PX[i], y = PY[i]; i === 1 ? g.moveTo(x, y) : g.lineTo(x, y); }
    for (let i = N - 1; i >= 1; i--) { const w = WB[i] * L * 1.2; g.lineTo(PX[i] - NX[i] * w, PY[i] - NY[i] * w); }
    g.closePath(); g.fillStyle = rgba(C.under, 0.16 + lift * 0.08); g.fill();
    // a slow iridescent sheen travelling down the feather
    const sh = ((t * 0.12) % 1.6) - 0.3;
    const sg = g.createLinearGradient(PX[0], PY[0], PX[N - 1], PY[N - 1]);
    sg.addColorStop(clamp(sh - 0.18), 'rgba(255,255,255,0)'); sg.addColorStop(clamp(sh), rgba(mix('#ffffff', P.accent, 0.25), 0.28)); sg.addColorStop(clamp(sh + 0.18), 'rgba(255,255,255,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = sg; g.fillRect(X0 - pad, Y0 - pad, W + pad * 2, H + pad * 2);
    g.restore();
    // barbs: fine strands sweeping from the stem outwards towards the tip
    g.save(); g.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (let side = -1; side <= 1; side += 2) {
        const arr = side > 0 ? WA : WB, nb = 26;
        for (let b = pass; b < nb; b += 2) {
          const u = 0.15 + 0.8 * (b + 0.5) / nb, ue = Math.min(1, u + 0.075);
          if (side < 0 && Math.abs(ue - 0.66) < 0.035) continue;
          plumeAt(u); const x0 = tmpX, y0 = tmpY;
          const ie = plumeAt(ue); const w = widthAt(arr, ue) * 0.97 + flutter(ie, t, side > 0 ? 0 : 1) * 0.8;
          const x1 = tmpX + tmpTX * w * side, y1 = tmpY + tmpTY * w * side;
          plumeAt((u + ue) / 2); const wm = widthAt(arr, (u + ue) / 2) * 0.55;
          g.moveTo(x0, y0); g.quadraticCurveTo(tmpX + tmpTX * wm * side, tmpY + tmpTY * wm * side, x1, y1);
        }
      }
      g.strokeStyle = pass ? rgba(C.under, 0.12) : 'rgba(255,255,255,0.3)'; g.lineWidth = pass ? 0.7 : 0.6; g.stroke();
    }
    // the soft fringe: barb tips breaking the outline so the edge reads as feather, not leaf
    g.beginPath();
    for (let side = -1; side <= 1; side += 2) {
      const arr = side > 0 ? WA : WB;
      for (let b = 0; b < 16; b++) {
        const u = 0.2 + 0.76 * (b + 0.5) / 16;
        const ie = plumeAt(u), w = widthAt(arr, u), ext = (1.5 + 2.5 * ((b * 7919) % 5) / 5) * s + flutter(ie, t, side > 0 ? 0 : 1);
        const x0 = tmpX + tmpTX * w * side * 0.9, y0 = tmpY + tmpTY * w * side * 0.9;
        plumeAt(Math.min(1, u + 0.045));
        g.moveTo(x0, y0); g.lineTo(tmpX + tmpTX * (w + ext) * side, tmpY + tmpTY * (w + ext) * side);
      }
    }
    g.strokeStyle = rgba(C.vaneMid, 0.3); g.lineWidth = 0.8; g.stroke();
    // downy afterfeather near the stem
    g.beginPath();
    for (let k = 0; k < 7; k++) {
      const side = k % 2 ? 1 : -1, u = 0.1 + k * 0.016;
      plumeAt(u); const x0 = tmpX, y0 = tmpY, nx = tmpTX * side, ny = tmpTY * side;
      const w = L * (0.13 + 0.03 * Math.sin(t * 1.4 + k)), drift = reduced ? 0 : Math.sin(t * 2 + k) * 3 * s;
      g.moveTo(x0, y0); g.quadraticCurveTo(x0 + nx * w * 0.6 - ny * 4 * s, y0 + ny * w * 0.6 + nx * 4 * s, x0 + nx * w + drift, y0 + ny * w - drift * 0.5);
    }
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.1; g.stroke();
    g.restore();
    // rachis: the stem running the length of the feather
    g.save(); g.lineCap = 'round'; g.globalCompositeOperation = 'lighter';
    for (let i = 1; i < N - 1; i++) {
      const u = i / (N - 1), w = lerp(2.4, 0.6, u) * s;
      g.strokeStyle = rgba(mix(C.quill, '#ffffff', 0.5), 0.22); g.lineWidth = w * 3; g.beginPath(); g.moveTo(PX[i], PY[i]); g.lineTo(PX[i + 1], PY[i + 1]); g.stroke();
    }
    g.restore();
    g.save(); g.lineCap = 'round';
    for (let i = 1; i < N - 1; i++) {
      const u = i / (N - 1), w = lerp(2.0, 0.5, u) * s;
      g.strokeStyle = rgba('#ffffff', 0.85); g.lineWidth = w; g.beginPath(); g.moveTo(PX[i], PY[i]); g.lineTo(PX[i + 1], PY[i + 1]); g.stroke();
    }
    g.restore();
  }
  // words along the stem: wrapped once, laid character by character along the rachis
  let wTok = null, wSize = 0, wLines = [], wChars = [], wWid = [], wLW = [], wMeasuredAt = -9;
  function layoutWords(size, t) {
    g.save(); g.font = `600 ${size}px ${FONT}`;
    wLines = wrap(g, words.token, L * 0.86, L < 125 ? 3 : 2);
    wChars = wLines.map((l) => Array.from(l));
    wWid = wChars.map((cs2) => Float32Array.from(cs2, (ch) => g.measureText(ch).width));
    wLW = wWid.map((a) => a.reduce((x, y) => x + y, 0));
    g.restore();
    wTok = words.token; wSize = size; wMeasuredAt = t;
  }
  const TBN = 28, TB = new Float32Array((TBN + 1) * 2), TBC = new Float32Array(TBN + 1);
  function buildBaseline() {
    // a quadratic through the vane's base, middle and tip: an even baseline even where the soft plume kinks
    const a = 1, m = Math.round((N - 1) * 0.55), b = N - 1;
    const ax = PX[a], ay = PY[a], bx = PX[b], by = PY[b];
    const cx = 2 * PX[m] - (ax + bx) / 2, cy = 2 * PY[m] - (ay + by) / 2;
    for (let i = 0; i <= TBN; i++) {
      const u = i / TBN, A = (1 - u) * (1 - u), B = 2 * u * (1 - u), Cq = u * u;
      TB[i * 2] = A * ax + B * cx + Cq * bx; TB[i * 2 + 1] = A * ay + B * cy + Cq * by;
      TBC[i] = i ? TBC[i - 1] + Math.hypot(TB[i * 2] - TB[i * 2 - 2], TB[i * 2 + 1] - TB[i * 2 - 1]) : 0;
    }
  }
  function drawStemWords(t) {
    const size = Math.max(12, Math.round(12 * s * 10) / 10);
    if (wTok !== words.token || wSize !== size || (t - wMeasuredAt > 1.5 && t < 8)) layoutWords(size, t);
    if (!wLines.length) return;
    buildBaseline();
    const Lt = TBC[TBN] || 1;
    // read left-to-right: from the tip when the stem is on the right, from the stem otherwise (with hysteresis)
    const cx = TB[0] - TB[TBN * 2], ch = Math.hypot(cx, TB[1] - TB[TBN * 2 + 1]) || 1;
    const want = readDir === 0 ? (cx >= 0 ? 1 : -1) : readDir > 0 ? (cx < -0.34 * ch ? -1 : 1) : (cx > 0.34 * ch ? 1 : -1);
    if (want !== readDir) { if (readDir !== 0) readFade = 0; readDir = want; }
    readFade = Math.min(1, readFade + 0.06);
    const m = wLines.length, lh = size * 1.08;
    const centre = Lt * 0.45;
    g.save();
    g.font = `600 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = C.ink; g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 4;
    g.globalAlpha = 0.9 * smooth(readFade);
    for (let j = 0; j < m; j++) {
      const ws = wWid[j], chs = wChars[j], off = ((m - 1) / 2 - j) * lh;
      let a = -wLW[j] / 2;
      for (let c = 0; c < chs.length; c++) {
        const cw = ws[c]; a += cw / 2;
        const v = clamp(readDir > 0 ? centre - a : centre + a, 0, Lt);   // arc from the stem end
        let i = 0; while (i < TBN - 1 && TBC[i + 1] < v) i++;
        const k = clamp((v - TBC[i]) / ((TBC[i + 1] - TBC[i]) || 1));
        const x0 = TB[i * 2], y0 = TB[i * 2 + 1], x1 = TB[i * 2 + 2], y1 = TB[i * 2 + 3];
        const x = lerp(x0, x1, k), y = lerp(y0, y1, k);
        let tx = (x0 - x1) * readDir, ty = (y0 - y1) * readDir;   // reading direction
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        g.save(); g.translate(x + ty * off, y - tx * off); g.rotate(Math.atan2(ty, tx)); g.fillText(chs[c], 0, 0); g.restore();
        a += cw / 2;
      }
    }
    g.restore();
  }
  function drawStem(t, fin) {
    // the glowing quill: the place to catch the feather
    const x0 = PX[0], y0 = PY[0];
    plumeAt(0.17); const x1 = tmpX, y1 = tmpY;
    const held = drag != null, pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
    glow(g, x0, y0, (held ? 30 : 22 + 6 * pulse) * s, warm, (held ? 0.85 : 0.5 + 0.22 * pulse) + fin * 0.2);
    glow(g, lerp(x0, x1, 0.5), lerp(y0, y1, 0.5), 12 * s, mix(warm, '#ffffff', 0.4), 0.45);
    g.save(); g.lineCap = 'round';
    const qg = g.createLinearGradient(x0, y0, x1, y1);
    qg.addColorStop(0, '#ffffff'); qg.addColorStop(0.4, C.quill); qg.addColorStop(1, rgba(C.quill, 0.7));
    g.strokeStyle = qg; g.lineWidth = 4.8 * s; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.4 * s; g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, 0.7), lerp(y0, y1, 0.7)); g.stroke();
    g.restore();
    orb(g, x0, y0, 3.2 * s, mix(warm, '#ffffff', 0.6));
    // an inviting ring while nobody holds it
    if (!held && finAt < 0 && !reduced) {
      const k = (t * 0.45) % 1;
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(warm, 0.45 * (1 - k)); g.lineWidth = 1.5 * s;
      g.beginPath(); g.arc(x0, y0, (8 + 22 * ease.outCubic(k)) * s, 0, TAU); g.stroke(); g.restore();
    }
  }
  function drawTether(t) {
    if (drag == null) return;
    const dx = dragX - PX[0], dy = dragY - PY[0], d = Math.hypot(dx, dy);
    if (d < 14 * s) return;
    const k = clamp((d - 14 * s) / (60 * s));
    const mx2 = (dragX + PX[0]) / 2 + (wob.v * 8 - dy * 0.08) * s, my2 = (dragY + PY[0]) / 2 + Math.abs(dx) * 0.08 + 6 * s;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(warm, 0.18 + 0.3 * k); g.lineWidth = 3 * s; g.beginPath(); g.moveTo(PX[0], PY[0]); g.quadraticCurveTo(mx2, my2, dragX, dragY); g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.5 + 0.3 * k); g.lineWidth = 0.9; g.stroke();
    g.restore();
    glow(g, dragX, dragY, 14 * s, warm, 0.35);
    void t;
  }
  function drawCargo(t, fin, front) {
    for (const c of cargo) {
      const delivered = c.state === 3;
      if (front !== delivered) continue;
      const x = c.x, y = c.y;
      const tossed = c.state === 0 ? 1 : c.tone;
      windAt(x, y);
      const tilt = (c.state === 0 ? wfx * 0.22 : 0) + Math.sin(t * 1.4 + c.phs) * 0.04 * (1 - c.lift) + (reduced ? 0 : tossed * 0.05 * Math.sin(t * 5 + c.phs));
      // leaf raft (fades away as the lantern lifts)
      if (c.lift < 1) {
        const la = 1 - c.lift, lw = cs * 0.5, lh = cs * 0.15;
        g.save(); g.globalAlpha = la; g.translate(x, y); g.rotate(tilt * 0.5);
        const lg = g.createLinearGradient(0, -lh, 0, lh);
        lg.addColorStop(0, mix(C.leaf, '#ffffff', 0.35)); lg.addColorStop(0.5, C.leaf); lg.addColorStop(1, mix(C.leaf, '#06120a', 0.55));
        g.fillStyle = lg; g.beginPath(); g.moveTo(-lw, -lh * 0.2);
        g.quadraticCurveTo(-lw * 0.2, lh * 1.6, lw, -lh * 0.6); g.quadraticCurveTo(lw * 0.1, -lh * 1.1, -lw, -lh * 0.2); g.fill();
        g.strokeStyle = rgba('#ffffff', 0.3); g.lineWidth = 0.8; g.beginPath(); g.moveTo(-lw * 0.85, -lh * 0.15); g.quadraticCurveTo(0, lh * 0.35, lw * 0.85, -lh * 0.5); g.stroke();
        g.restore();
      }
      const calmGlow = (1 - tossed) * 0.5 + c.lift * 0.4;
      const lantern = delivered ? smooth(c.lift) : 0;
      if (c.ph >= 0) {
        const sz = photos.size(c.ph, 'card', cs);
        const cy = y - sz.h * 0.5 - cs * 0.04;
        if (lantern > 0) { drawHangThread(x, cy - sz.h / 2, c, lantern); glow(g, x, cy, cs * 1.05, warm, 0.32 * lantern); }
        if (c.lift < 1) {
          // the postcard is the raft's sail: a slim mast and a little pennant
          const ma = 1 - c.lift, mxp = x - Math.cos(tilt) * sz.w * 0.5 - 2 * s, top = cy - sz.h * 0.5 - 7 * s;
          g.save(); g.globalAlpha = ma; g.strokeStyle = rgba(mix(warm, '#ffffff', 0.4), 0.8); g.lineWidth = 1.3 * s; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x - sz.w * 0.42, y - 1); g.lineTo(mxp, top); g.stroke();
          const fl = reduced ? 0 : Math.sin(t * 4 + c.phs) * 2 * s;
          g.fillStyle = tossed > 0.5 ? rgba(C.wind1, 0.9) : rgba(warm, 0.95);
          g.beginPath(); g.moveTo(mxp, top); g.quadraticCurveTo(mxp + 6 * s * flip, top + 1.5 * s + fl * 0.5, mxp + 11 * s * flip + fl, top + 2.5 * s + fl); g.lineTo(mxp, top + 5 * s); g.fill();
          g.restore();
        }
        photos.draw(g, c.ph, x, cy, cs * (1 + 0.08 * lantern), { shape: 'card', rot: tilt, tone: 'storm', toneMix: tossed * 0.55, blur: tossed * 0.12,
          glow: 0.25 + calmGlow, glowColour: tossed > 0.5 ? C.wind1 : warm, shadow: false, skewY: reduced ? 0 : tossed * 0.03 * Math.sin(t * 3.3 + c.phs) });
        if (lantern > 0) lanternCap(x, cy - sz.h / 2, sz.w, lantern);
      } else {
        const lw = cs * 0.46, lh = cs * 0.58, cy = y - lh * 0.55;
        if (lantern > 0) drawHangThread(x, cy - lh / 2, c, lantern);
        glow(g, x, cy, cs * (0.7 + 0.3 * calmGlow), tossed > 0.5 ? C.wind1 : warm, 0.35 + calmGlow * 0.5);
        g.save(); g.translate(x, cy); g.rotate(tilt);
        const pg = g.createRadialGradient(0, lh * 0.05, 1, 0, 0, lh * 0.62);
        const body = mix(mix(warm, '#8a90b0', 0.45), mix(warm, '#ff9a5a', 0.25), 1 - tossed * 0.75);
        pg.addColorStop(0, mix('#fff6dc', body, tossed * 0.5)); pg.addColorStop(0.45, body); pg.addColorStop(1, mix(body, '#40220e', 0.5));
        g.fillStyle = pg; g.beginPath(); g.ellipse(0, 0, lw / 2, lh / 2, 0, 0, TAU); g.fill();
        g.strokeStyle = rgba('#7a4a20', 0.3); g.lineWidth = 0.8;
        g.beginPath(); g.ellipse(0, 0, lw * 0.2, lh / 2, 0, 0, TAU); g.moveTo(0, -lh / 2); g.lineTo(0, lh / 2); g.stroke();
        g.fillStyle = mix('#5a3a1a', warm, 0.3); g.fillRect(-lw * 0.22, -lh / 2 - 2.5 * s, lw * 0.44, 3 * s); g.fillRect(-lw * 0.18, lh / 2 - 1, lw * 0.36, 2.5 * s);
        g.restore();
      }
    }
  }
  function drawHangThread(x, topY, c, k) {
    const ax = lerp(x, c.ax, k), ay = lerp(topY - c.thread, c.ay, k);
    g.save(); g.globalAlpha = k; g.strokeStyle = rgba(mix(warm, '#ffffff', 0.5), 0.65); g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(x, topY); g.lineTo(ax, ay); g.stroke(); g.restore();
    glow(g, ax, ay, 5 * s, warm, 0.7 * k);
  }
  function lanternCap(x, topY, w, k) {
    g.save(); g.globalAlpha = k; g.fillStyle = mix('#6a4420', warm, 0.45);
    g.beginPath(); g.ellipse(x, topY + 1, Math.min(w * 0.22, 9 * s), 2.6 * s, 0, 0, TAU); g.fill(); g.restore();
  }
  function drawTwist(t) {
    const k = smooth(clamp((t - twistAt) / 1.6));
    if (twistKind === 1) {
      // a little downy feather lifts off the plume and drifts beside the skiff
      const rot = Math.sin(t * 0.7) * 0.5 + t * 0.15 * (reduced ? 0 : 1), len = 16 * s;
      glow(g, down.x, down.y, 18 * s, mix(warm, '#ffffff', 0.4), 0.4 * k);
      g.save(); g.globalAlpha = k; g.translate(down.x, down.y); g.rotate(rot); g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.1 * s; g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, -2 * s, len / 2, -1 * s); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.8; g.beginPath();
      for (let i = 0; i < 7; i++) {
        const u = -0.4 + i * 0.13, x = u * len, w = (5 + 3 * Math.sin(i * 1.7)) * s * (1 - Math.abs(u) * 0.9), cur = Math.sin(t * 2 + i) * 1.5 * s;
        g.moveTo(x, -0.5 * s); g.quadraticCurveTo(x + 2 * s, -w * 0.6, x + 4 * s + cur, -w);
        g.moveTo(x, 0.5 * s); g.quadraticCurveTo(x + 2 * s, w * 0.6, x + 4 * s - cur, w);
      }
      g.stroke(); g.restore();
    } else {
      // each wind's eddy opens into a slow lotus of calm light
      for (const w of winds) {
        g.save(); g.translate(w.ex, w.ey); g.globalCompositeOperation = 'lighter'; g.rotate(reduced ? 0 : t * 0.06 * w.sd);
        for (let i = 0; i < 6; i++) {
          g.rotate(TAU / 6);
          g.fillStyle = rgba(mix(w.col, warm, 0.5), 0.1 * k); g.beginPath(); g.ellipse(0, -r * 0.22 * k, r * 0.08, r * 0.2 * k, 0, 0, TAU); g.fill();
        }
        g.restore();
        glow(g, w.ex, w.ey, r * 0.3 * k, warm, 0.35 * k);
      }
    }
  }

  // -------------------------------------------------------------- input --
  function nearFeather(p) {
    const cr = Math.max(46, 36 * s + 12);
    if (Math.hypot(p.x - PX[0], p.y - PY[0]) <= cr) return 1;
    for (let i = 2; i < N; i++) if (Math.hypot(p.x - PX[i], p.y - PY[i]) <= Math.max(28, 32 * s)) return 2;
    return 0;
  }
  function track(p) {
    if (relGrab) {
      // slide the feather by the plume: your finger's travel along the lane's direction moves the stem
      routeAt(real);
      fingerP = clamp(fingerP + ((p.x - lastPX) * tmpTX + (p.y - lastPY) * tmpTY) / RL, real - 0.06, real + 0.1);
      onLane = true; lastPX = p.x; lastPY = p.y;
      return;
    }
    const fp = project(p.x, p.y, fingerP - 0.05, fingerP + 0.09);
    const off = tmpX, lt = tmpY;
    onLane = off <= laneHalf + Math.max(44, 50 * s);
    if (onLane) { fingerP = fp; fingerLat = lt; }
  }
  return {
    get progress() { return real; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      const grab = drag == null ? nearFeather(p) : 0;
      if (grab) {
        drag = p.id; dragX = p.x; dragY = p.y; lastPX = p.x; lastPY = p.y;
        if (lead < 0.05) shadowFromFeather();
        // by the stem: the stem follows your fingertip along the lane; elsewhere on the feather: it slides with your finger
        relGrab = grab === 2;
        if (relGrab) { fingerP = real; grabOff = 0; fingerLat = 0; onLane = true; }
        else { const fp = project(p.x, p.y, real - 0.04, real + 0.06); fingerP = fp; grabOff = real - fp; fingerLat = tmpY; onLane = true; }
        E.sound('pluck', { note: 2, intensity: 0.35 }); E.haptic('light');
        E.particles.burst(PX[0], PY[0], reduced ? 3 : 7, { speed: 40, colour: warm, life: 0.7, size: 5 });
        return;
      }
      // a touch on the open water: a soft ripple and a note, the stem glows to be found
      E.sound('drip', { note: 3, intensity: 0.2 });
      wob.kick(0.3);
    },
    move(p) {
      if (p.id !== drag) return;
      dragX = p.x; dragY = p.y;
      track(p);
    },
    up(p) {
      if (p.id !== drag) return;
      drag = null; onLane = false; fingerLat = 0; relGrab = false;
    },
    assist() {
      if (finAt >= 0) return;
      assistTo = Math.min(1, Math.max(wanted, real) + STEP); assistStall = 0;
    },
    pointAt(p) { routeAt(p); return { x: tmpX, y: tmpY }; },
    hint() {
      if (E.locked || finAt >= 0) return null;      // the law is asking for a pause: the next real move is to wait
      const p0 = real, p1 = Math.min(1, real + 0.1), pts = [];
      for (let i = 0; i <= 16; i++) { routeAt(lerp(p0, p1, i / 16)); pts.push([tmpX, tmpY]); }
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      down.x = PX[2]; down.y = PY[2]; down.vx = 0; down.vy = -20;
      E.particles.burst(PX[2], PY[2], reduced ? 3 : 8, { speed: 24, colour: '#ffffff', life: 1.2, size: 4, kind: 'glint' });
    },
    finish() {
      finAt = E.now();
      for (const c of cargo) if (c.state === 0) unhook(c, finAt);
      E.sound('shimmer', { intensity: 0.4 });
      const hx = reedX, hy = reedY - reedH * 0.8, nSeed = heavy || low ? 7 : reduced ? 10 : 22;
      for (let i = 0; i < nSeed; i++) E.particles.emit({ x: hx + (Math.random() - 0.5) * 8 * s, y: hy + (Math.random() - 0.5) * reedH * 0.1, vx: (Math.random() - 0.5) * 30 - flip * 12, vy: -16 - Math.random() * (heavy ? 14 : 30), life: 2.6 + Math.random() * 1.6, size: 4 + Math.random() * 3, colour: mix(warm, '#ffffff', 0.4), drag: 0.985, alpha: heavy ? 0.5 : 0.8 });
    },
    destroy() {},
  };
}
