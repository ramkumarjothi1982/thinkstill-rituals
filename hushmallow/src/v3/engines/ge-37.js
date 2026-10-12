// GE-37 · CURRENT WEAVER — three water ribbons (weave drag).
// Three luminous water ribbons tumble down the stage from a small spring to a
// still pool, crossing and swirling. A floating reed lies across the top of
// the stream: hold it and pull it down through the nearest ribbons (weave it
// left or right if you like). Currents bend around the reed — and around any
// fingertip resting on the water — while behind it they straighten and weave
// into one steady braided channel that runs exactly where you guided it.
// Win: one clear, uninterrupted flow line runs from the spring to the pool.
//
// Photos float as glass charms riding the wild currents, misted and turning;
// as the channel reaches each one it clears back to its own colours and
// drifts calmly in line beside the flow. The words are written on the reed's
// broad leaf and travel with it.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, orb, shadow, noise2, motes } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-37',
  howTo: 'Hold the floating reed and pull it down through the currents.',
  steps: ['Touch the floating reed that carries your words.', 'Pull it slowly down through the three water ribbons — weave left or right if you like.', 'Keep going until one clear flow line runs into the still pool.'],
  tapAlt: 'each press draws the reed one calm stretch down the stream',
  words: 'Your words are written on the reed’s broad leaf and travel with it as the channel opens.',
  photos: {
    where: 'Your photos float as glass charms, swirling in the three currents.',
    becomes: 'floating water charms',
    touch: 'The reed gathers the currents around them;',
    change: 'each one clears from a misty blue back to its own colours as it settles beside the steady channel.',
    payoff: 'At the end they drift calmly in line along one clear, glowing flow line.',
  },
  finaleSec: 4,
};

const N = 96;          // samples per ribbon
const M = 48;          // channel memory (where the reed actually went)
const CAP = 0.05;      // how far the pull may run ahead of the world law
const NODASH = [];

export function create(E) {
  const { g, stage, photos, words } = E;
  const P = E.pal, R = E.rand;
  const reduced = !!E.reduced, low = !!(E.lowStim || E.reduced);
  const heavy = !!E.heavy, calm0 = E.calm || 0;
  const nz = noise2(E.seed + 37);
  const pace = (heavy ? 0.72 : 1) * (1 - calm0 * 0.5) * (reduced ? 0.5 : 1);
  const ampK = (heavy ? 0.9 : 1) * (1 - calm0 * 0.3);
  const TOW = heavy ? 0.95 : 1.15;     // fastest the reed can be towed (progress / s)

  // ---- colours, all from the realm palette
  const calmCol = mix(P.glow, '#effcff', 0.45);
  const base = [P.glow, P.water || mix(P.glow, P.accent, 0.45), mix(P.accent, '#ffffff', 0.2)];
  if (E.round > 1) for (let i = 2; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const c = base[i]; base[i] = base[j]; base[j] = c; }
  const soft = clamp(calm0 * 0.6 + (heavy ? 0.18 : 0));
  const colC = base.map((c) => mix(c, calmCol, soft));          // the wild currents
  const colA = base.map((c) => mix(c, calmCol, 0.5));           // the braided channel
  const deepW = mix(mix(P.deep, P.ink || '#05031a', 0.6), '#020214', 0.35);
  const bedC = colC.map((c) => mix(c, deepW, 0.6)), bedA = colA.map((c) => mix(c, deepW, 0.55));
  const specC = colC.map((c) => mix(c, '#ffffff', 0.7)), specA = colA.map((c) => mix(c, '#ffffff', 0.7));
  const lineCol = mix(calmCol, '#ffffff', 0.35);
  const leafDark = mix('#15433a', P.deep, 0.2), leafMid = mix('#2c7656', P.glow, 0.12), leafLight = mix('#86cf96', P.glow, 0.22);
  const stalkMid = mix('#b9b45a', P.warm || '#ffb37a', 0.15), stalkDark = mix('#4a5622', P.deep, 0.2);
  const plumeCol = mix(P.warm || '#ffb37a', '#fff0d0', 0.45), fishCol = mix(P.warm || '#ffb37a', '#fff4d8', 0.35);
  const wordGlow = mix(calmCol, '#ffffff', 0.2);
  const pearlWild = colC.map((c) => mix(c, '#fff8ea', 0.35)), pearlCalm = colC.map((c) => mix(c, '#fff8ea', 0.8));

  // ---- the three wild currents (fresh every loop round)
  const RIB = [0, 1, 2].map((k) => ({ f: [1.05, 1.42, 1.8][k] + (R() - 0.5) * 0.22, ph: k * 2.1 + R() * TAU, w: (0.5 + R() * 0.3) * (k === 1 ? -1 : 1), wy: R() * TAU }));

  // ---- geometry
  let s1 = 1, W = 360, cx = 0, yTop = 0, yBot = 0, L = 1, Ax = 1, Lr = 1, leafW = 36, rr = 1, y0 = 0, y1 = 1, maxOffN = 0;
  let szC = 56, szA = 52, blendLen = 90, lam = 70, Wc = 13, Wa = 8, wSize = 13, stalkY = -16;
  let leafPath, veinPath, stalkPath, bladePath, leafGrad, stalkGrad, pondGrad, DASH_C = NODASH, DASH_A = NODASH;
  const leafHalf = (u) => leafW * 0.5 * Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.42);
  const leafC = (u) => s1 * (-1.5 * Math.sin(Math.PI * u) + 3 * u * u * u * u);
  function fit() {
    s1 = stage.s; W = stage.w; cx = stage.cx;
    yTop = stage.y + stage.h * 0.06; yBot = stage.y + stage.h * 0.93; L = yBot - yTop;
    Ax = W * 0.4;
    Lr = Math.min(W * 0.56, 240);
    leafW = clamp(36 * s1, 32, 46);
    rr = leafW * 0.5 + 10;
    y0 = yTop + L * 0.07; y1 = yTop + L * 0.88;
    maxOffN = Math.max(0, Math.min(W * 0.5 - Lr * 0.5 - 30 * s1 - 8, W * 0.2)) / W;
    szC = clamp(W * 0.15, 46, 64); szA = szC * 0.92;
    blendLen = 95 * s1; lam = 240 * s1; Wc = 13 * s1; Wa = 8.5 * s1;
    wSize = Math.max(12, Math.round(13 * Math.min(1.12, s1)));
    DASH_C = [5 * s1, 21 * s1]; DASH_A = [22 * s1, 34 * s1];
    const xa = -Lr * 0.44, xb = Lr * 0.46, S = 28;
    leafPath = new Path2D();
    for (let i = 0; i <= S; i++) { const u = i / S, x = lerp(xa, xb, u), y = leafC(u) - leafHalf(u); if (i) leafPath.lineTo(x, y); else leafPath.moveTo(x, y); }
    for (let i = S; i >= 0; i--) { const u = i / S; leafPath.lineTo(lerp(xa, xb, u), leafC(u) + leafHalf(u)); }
    leafPath.closePath();
    veinPath = new Path2D();
    for (const f of [-0.55, 0.55]) for (let i = 2; i <= S - 2; i++) { const u = i / S, x = lerp(xa, xb, u), y = leafC(u) + f * leafHalf(u); if (i === 2) veinPath.moveTo(x, y); else veinPath.lineTo(x, y); }
    stalkY = -leafW * 0.47;
    stalkPath = new Path2D(); stalkPath.moveTo(-Lr * 0.5, stalkY + 1.5 * s1); stalkPath.quadraticCurveTo(0, stalkY - 3 * s1, Lr * 0.5, stalkY + s1);
    bladePath = new Path2D();
    bladePath.moveTo(Lr * 0.05, stalkY + s1);
    bladePath.quadraticCurveTo(Lr * 0.24, stalkY - leafW * 0.66, Lr * 0.47, stalkY - leafW * 0.56);
    bladePath.quadraticCurveTo(Lr * 0.3, stalkY - leafW * 0.2, Lr * 0.05 + 11 * s1, stalkY + s1);
    bladePath.closePath();
    stalkGrad = g.createLinearGradient(0, stalkY - 3.5 * s1, 0, stalkY + 3 * s1);
    stalkGrad.addColorStop(0, '#fbf0c0'); stalkGrad.addColorStop(0.45, stalkMid); stalkGrad.addColorStop(1, stalkDark);
    leafGrad = g.createLinearGradient(0, -leafW * 0.5, 0, leafW * 0.5);
    leafGrad.addColorStop(0, leafLight); leafGrad.addColorStop(0.3, leafMid); leafGrad.addColorStop(1, leafDark);
    pondGrad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    pondGrad.addColorStop(0, rgba(deepW, 0.5)); pondGrad.addColorStop(0.62, rgba(deepW, 0.34)); pondGrad.addColorStop(1, rgba(deepW, 0));
  }
  fit();

  // ---- state
  let wanted = 0, rot = 0, shown = 0, prevShown = 0, coast = 0;
  let assistTo = null, presses = 0;
  let drag = null;                       // {id, gx, gy, fx, fy, tp}
  const FING = Array.from({ length: 4 }, () => ({ id: null, x: 0, y: 0, a: 0, live: false, lx: 0, ly: 0 }));
  let rush = 0, tau = R() * 20, flowPh = 0, ampNow = ampK, chop = 0.08, bAmp = 8, fin = 0, endW = 0, endS = 0, callout = 0;
  let doneFlag = false, finAt = -1, twistAt = -1, poolBlooms = 0, lastStep = 0, lastWake = 0;
  const startOffN = E.round > 1 ? (R() - 0.5) * 1.4 * maxOffN : 0;
  let offN = startOffN, offV = 0, offTN = startOffN, tilt = 0, lean = 0, rxNow = cx;
  const bins = new Float32Array(M); let binDone = -1;
  const sStart = (y0 - yTop) / L;
  for (let b = 0; b < M && b / (M - 1) <= sStart; b++) { bins[b] = startOffN * smooth(b / (M - 1) / sStart); binDone = b; }
  let reedS = sStart, reedY = y0;
  let cA = 1, sA = 0, cAx = 0, cAy = 0;  // reed capsule (per frame)
  const wob = new Wobble(), dip = new Wobble();
  E.onResize(() => { fit(); offTN = clamp(offTN, -maxOffN, maxOffN); });

  const RX = [0, 1, 2].map(() => new Float32Array(N)), RY = [0, 1, 2].map(() => new Float32Array(N)), RZ = [0, 1, 2].map(() => new Float32Array(N));

  // ---- charms: photos (or moon pearls) riding the currents
  const n = photos.n, K = n >= 5 ? n : 5;
  const slot = new Array(K).fill(-1);
  const shift = E.round > 1 ? Math.floor(R() * K) : 0;
  if (n) for (let j = 0; j < n; j++) slot[(Math.round((j * K) / n) + shift) % K] = (j + E.round - 1) % n;
  const kShift = E.round > 1 ? Math.floor(R() * 3) : 0, flip = E.round > 1 && R() < 0.5 ? -1 : 1;
  const charms = slot.map((ph, j) => ({ ph, k: (j + kShift) % 3, s: 0.09 + ((j + 0.5) / K) * 0.58, side: (j % 2 ? 1 : -1) * flip, ph0: R() * TAU,
    al: 0, aligned: false, sub: 0, x: cx, y: yTop, sz: szC, ix: 0, iy: 0, vx: 0, vy: 0, hero: n === 1 && ph === 0 }));

  // ---- helpers
  const last = Object.create(null);
  const once = (key, gap) => { const t = E.now(); if (t - (last[key] ?? -99) < gap) return false; last[key] = t; return true; };
  const buzz = (kind, gap) => { if (once('h' + kind, gap)) E.haptic(kind); };
  function chOffN(s) {               // lateral offset of the opened channel at s (fraction of stage width)
    const bf = clamp(s) * (M - 1), b = Math.floor(bf);
    if (b + 1 <= binDone) return lerp(bins[b], bins[b + 1], bf - b);
    if (b <= binDone) { const sb = b / (M - 1); return lerp(bins[b], offN, clamp((s - sb) / Math.max(1e-4, reedS - sb))); }
    return offN;
  }
  const pt = { x: 0, y: 0, w: 0, z: 0 };
  function ribAt(k, s, out) {
    const rb = RIB[k], yb = yTop + s * L;
    const env = smooth(s / 0.13) * (1 - 0.4 * smooth((s - 0.78) / 0.22));
    const a = TAU * rb.f * s + rb.ph + rb.w * tau, amp = Ax * ampNow * env;
    const wx = cx + amp * (0.72 * Math.sin(a) + 0.3 * nz(s * 2.3 + k * 3.7, tau * 0.17 + k * 1.3) + chop * Math.sin(a * 2.6 + tau * 1.7 + k));
    const wy = yb + L * 0.03 * env * Math.sin(a * 0.5 + rb.wy + tau * 0.33);
    const ba = (TAU * s * L) / lam - flowPh + (k * TAU) / 3;
    const bx = cx + chOffN(s) * W + bAmp * smooth(s / 0.06) * Math.sin(ba);
    let wc = yb <= reedY ? 1 : smooth(1 - (yb - reedY) / blendLen);
    if (fin > wc) wc = fin; if (endW > wc) wc = endW;
    let x = lerp(wx, bx, wc), y = lerp(wy, yb, wc);
    const free = 1 - wc;
    if (free > 0.002) {
      if (rush > 0.01 && !reduced) x += rush * 9 * s1 * free * Math.sin(s * 47 + tau * 9 + k * 2) * smooth(1 - (yb - reedY) / (blendLen * 2.2));
      // the current bends around the floating reed
      const u = clamp(((x - cAx) * cA + (y - cAy) * sA) / Lr);
      const dx = x - (cAx + cA * Lr * u), dy = y - (cAy + sA * Lr * u), d = Math.hypot(dx, dy), RR = rr + 8 * s1;
      if (d < RR) { const push = (RR - d) * free; if (d > 0.5) { x += (dx / d) * push; y += (dy / d) * push; } else y += push; }
    }
    // …and around fingertips on the water (the steady channel only gives a little)
    for (let i = 0; i < FING.length; i++) {
      const f = FING[i]; if (f.a <= 0.01) continue;
      const dx = x - f.x, dy = y - f.y, d2 = dx * dx + dy * dy, Rf = 62 * s1;
      if (d2 < Rf * Rf) { const d = Math.sqrt(d2) || 1, push = (Rf - d) * f.a * (0.25 + 0.75 * free); x += (dx / d) * push; y += (dy / d) * push * 0.6; }
    }
    out.x = clamp(x, stage.x + 8, stage.x + W - 8); out.y = y; out.w = wc; out.z = Math.cos(ba);
    return out;
  }
  function nudge(x, y, k) {
    for (const c of charms) {
      const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) || 1, Rn = 120 * s1;
      if (d < Rn) { const f = 220 * k * (1 - d / Rn); c.vx += (dx / d) * f; c.vy += (dy / d) * f; }
    }
  }
  function waitNudge() { if (!once('wait', 0.6)) return; wob.kick(0.6); E.checkpoint('wait'); }

  function align(c, j) {
    c.aligned = true;
    if (c.ph >= 0) { photos.dust(c.ph, c.x, c.y, c.sz, low ? 6 : 12, { shape: 'bubble', up: 12, speed: 22, life: 1.2 }); E.checkpoint('photo', c.ph); }
    else E.particles.burst(c.x, c.y, low ? 3 : 7, { speed: 30, colour: calmCol, life: 1, size: 5, kind: 'glint' });
    E.ripples.add(c.x, c.y, { colour: calmCol, speed: 50, alpha: 0.5, r: c.sz * 0.4 });
    if (once('glass', 0.12)) E.sound('glass', { note: (j % 5) + 3, intensity: 0.36, pan: clamp((c.x - cx) / W) });
    buzz('light', 0.15);
  }

  // ------------------------------------------------------------ frame --
  function frame(dt, t) {
    const dk = Math.min(dt, 1 / 30);
    // ---- input → state, always through the law gate
    if (drag && drag.tp > wanted) wanted = Math.min(drag.tp, wanted + dt * TOW);
    else if (!drag && coast > wanted) wanted = Math.min(coast, wanted + dt * TOW * 0.6);
    if (assistTo != null) { wanted = Math.min(assistTo, wanted + dt * 0.42); if (assistTo - wanted < 1e-3) assistTo = null; }
    if (wanted > rot + CAP) wanted = rot + CAP;
    rot = E.gate(clamp(wanted));
    if (wanted > rot + CAP) wanted = rot + CAP;
    shown = lerp(shown, rot, 1 - Math.exp(-dt * 9));
    const prog = shown;
    if (!doneFlag && rot >= 0.998 && !drag && assistTo == null) { doneFlag = true; E.sound('settle', { intensity: 0.45 }); buzz('soft', 0.3); }
    fin = finAt >= 0 ? smooth((t - finAt) / 2.6) : 0;
    endW = smooth((shown - 0.9) / 0.1);

    // ---- the reed: towed down, swayed sideways, leaning against the current
    const endK = 1 - smooth((shown - 0.78) / 0.2);
    offV += ((offTN * endK - offN) * 70 - offV * 13) * dk; offN += offV * dk;
    tilt = lerp(tilt, clamp(offV * W * 0.0007, -0.13, 0.13), 1 - Math.exp(-dt * 6));
    const wv = wob.update(dk), dv = dip.update(dk);
    const baseY = y0 + shown * (y1 - y0);
    const leanT = drag ? clamp((drag.fy - drag.gy - baseY) * 0.35, -14 * s1, 0) : 0;
    lean = lerp(lean, leanT, 1 - Math.exp(-dt * 10));
    rxNow = cx + offN * W;
    reedS = (baseY - yTop) / L;
    reedY = baseY + lean + (reduced ? 0 : Math.sin(t * 1.2) * 1.5 * s1) + dv * (reduced ? 0.4 : 1.4) * s1;
    while (binDone + 1 < M && (binDone + 1) / (M - 1) <= reedS) { binDone++; bins[binDone] = offN; }
    endS = lerp(reedS, 1, endW);
    const lag = drag ? Math.max(0, drag.fy - drag.gy - baseY) : 0;
    rush = lerp(rush, smooth(invLerp(26 * s1, 120 * s1, lag)), 1 - Math.exp(-dt * 5));
    callout = Math.max(0, callout - dt * 1.2);

    // ---- water
    tau += dt * pace * lerp(1, 0.55, prog) * (1 + rush * 0.7) * (1 - fin * 0.6);
    flowPh += (dt * TAU * 22 * s1 * (1 - 0.4 * fin) * (reduced ? 0.6 : 1)) / lam;
    ampNow = ampK * lerp(1, 0.8, prog);
    chop = (heavy ? 0.05 : 0.09) * (1 - calm0) * (1 - prog * 0.5);
    bAmp = 9 * s1 * (1 - 0.55 * fin);
    for (let i = 0; i < FING.length; i++) { const f = FING[i]; if (!f.live && f.a > 0) f.a = Math.max(0, f.a - dt * 2.2); }
    cA = Math.cos(tilt); sA = Math.sin(tilt); cAx = rxNow - cA * Lr * 0.5; cAy = reedY - sA * Lr * 0.5;
    for (let k = 0; k < 3; k++) { const X = RX[k], Y = RY[k], Z = RZ[k]; for (let i = 0; i < N; i++) { ribAt(k, i / (N - 1), pt); X[i] = pt.x; Y[i] = pt.y; Z[i] = pt.z; } }
    const iR = fin > 0.5 || endW > 0.98 ? N - 1 : clamp(Math.floor(reedS * (N - 1)) + 1, 1, N - 1);

    // ---- feedback for real movement: notes, wake, foam
    const st = Math.floor(rot * 12 + 1e-6);
    if (st > lastStep) { lastStep = st; E.sound('pluck', { note: Math.min(9, Math.round(rot * 9)), intensity: 0.3, pan: clamp((rxNow - cx) / W, -1, 1) }); buzz('tick', 0.1); }
    const vy = dt > 0 ? ((shown - prevShown) * (y1 - y0)) / dt : 0; prevShown = shown;
    if (vy > 20 * s1 && t - lastWake > 0.22) {
      lastWake = t;
      E.ripples.add(rxNow - Lr * 0.5, reedY, { colour: calmCol, speed: 45, alpha: 0.35, r: 4 });
      E.ripples.add(rxNow + Lr * 0.5, reedY, { colour: calmCol, speed: 45, alpha: 0.35, r: 4 });
    }
    if (vy > 20 * s1 && !low && Math.random() < 0.45) E.particles.emit({ x: rxNow + (Math.random() - 0.5) * Lr * 0.85, y: reedY + leafW * 0.55, vx: (Math.random() - 0.5) * 24, vy: 30 + Math.random() * 30, life: 0.8, size: 4, colour: '#ffffff', drag: 0.94, kind: 'dot', alpha: 0.7 });
    if (rush > 0.5 && !low && Math.random() < 0.25) {
      E.particles.burst(rxNow + (Math.random() - 0.5) * Lr * 0.6, reedY + leafW * 0.6, 2, { speed: 70, colour: lineCol, life: 0.5, size: 4, kind: 'glint' });
      if (once('swish', 0.6)) E.sound('swish', { intensity: 0.22 });
    }
    if (finAt >= 0) {
      const ft = t - finAt;
      if (poolBlooms < 3 && ft > poolBlooms * 0.95 + 0.7) { poolBlooms++; E.ripples.add(cx, yBot, { colour: calmCol, speed: heavy ? 40 : 60, alpha: heavy ? 0.35 : 0.55, r: 10 }); }
      if (!heavy && !low && ft < 2.4 && Math.random() < 0.35) { const s = Math.random(); E.particles.emit({ x: cx + chOffN(s) * W, y: yTop + s * L, vx: 0, vy: -16, life: 1.3, size: 5, colour: '#ffffff', kind: 'glint', drag: 0.97 }); }
    }

    // ---- drawing
    drawPond(t);
    drawEnds(t, prog);
    const dOffC = -t * 70 * s1 * (1 + rush) * (reduced ? 0.5 : 1), dOffA = -t * 30 * s1 * (reduced ? 0.6 : 1);
    if (iR < N - 1) for (let k = 0; k < 3; k++) strokeLayers(partPath(k, iR, N - 1, 0), colC[k], bedC[k], specC[k], lerp(Wc, Wa, fin), 1, DASH_C, dOffC);
    for (let k = 0; k < 3; k++) strokeLayers(partPath(k, 0, iR, 0), colA[k], bedA[k], specA[k], Wa, 0.9, DASH_A, dOffA);
    drawFlowLine(t, prog);
    updCharms(dt, dk, t);
    drawCharms(t);
    drawFish(t);
    drawFingers();
    drawReed(t, wv);
    drawTow();
  }

  // ---------------------------------------------------------- drawing --
  function partPath(k, i0, i1, sign) {
    const X = RX[k], Y = RY[k], Z = RZ[k], p = new Path2D();
    let pen = false;
    for (let i = i0; i <= i1; i++) {
      if (sign && (sign > 0 ? Z[i] < -0.06 : Z[i] > 0.06)) { pen = false; continue; }
      if (pen) p.lineTo(X[i], Y[i]); else { p.moveTo(X[i], Y[i]); pen = true; }
    }
    return p;
  }
  function strokeLayers(p, col, bed, spec, w, a, dash, dOff) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.translate(0, 5 * s1); g.strokeStyle = rgba('#00000c', 0.14 * a); g.lineWidth = w * 1.6; g.stroke(p); g.translate(0, -5 * s1);
    g.strokeStyle = rgba(bed, 0.55 * a); g.lineWidth = w; g.stroke(p);
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(col, 0.08 * a); g.lineWidth = w * 3; g.stroke(p);
    g.strokeStyle = rgba(col, 0.45 * a); g.lineWidth = w * 0.7; g.stroke(p);
    g.translate(-w * 0.14, -w * 0.18); g.strokeStyle = rgba(spec, 0.5 * a); g.lineWidth = Math.max(1, w * 0.16); g.stroke(p); g.translate(w * 0.14, w * 0.18);
    g.setLineDash(dash); g.lineDashOffset = dOff; g.strokeStyle = rgba('#ffffff', (E.lowStim ? 0.13 : 0.24) * a); g.lineWidth = w * 0.3; g.stroke(p); g.setLineDash(NODASH);
    g.restore();
  }
  function drawPond(t) {
    g.save(); g.translate(cx, stage.cy); g.scale(W * 0.7, stage.h * 0.58); g.fillStyle = pondGrad; g.fillRect(-1, -1, 2, 2); g.restore();
    for (let i = 0; i < 7; i++) {   // slow caustic dapples
      const x = cx + Math.sin(t * 0.07 * (1 + i * 0.13) + i * 2.1) * W * 0.36, y = stage.cy + Math.cos(t * 0.05 * (1 + i * 0.11) + i * 1.3) * stage.h * 0.4;
      glow(g, x, y, (70 + 20 * Math.sin(i)) * s1, calmCol, 0.045);
    }
    motes(g, stage.x, stage.y, W, stage.h, t, calmCol, { n: low ? 12 : 24, alpha: 0.3, seed: 37 + E.round, size: 1.5 });
  }
  function drawEnds(t, prog) {
    // the spring the three ribbons rise from
    glow(g, cx, yTop, 42 * s1, calmCol, 0.45); glow(g, cx, yTop, 13 * s1, '#ffffff', 0.45);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) { const r = (t * 0.35 + i * 0.5) % 1; g.strokeStyle = rgba(calmCol, 0.35 * (1 - r)); g.beginPath(); g.ellipse(cx, yTop, (8 + r * 30) * s1, (3 + r * 11) * s1, 0, 0, TAU); g.stroke(); }
    // the still pool waiting at the bottom
    const pk = 0.3 + 0.4 * smooth(prog) + 0.3 * fin;
    for (let i = 0; i < 3; i++) { const r = (t * 0.09 + i / 3) % 1, rx = W * (0.07 + r * 0.24); g.strokeStyle = rgba(calmCol, (0.1 + 0.2 * pk) * Math.sin(Math.PI * r)); g.beginPath(); g.ellipse(cx, yBot, rx, rx * 0.3, 0, 0, TAU); g.stroke(); }
    g.restore();
    g.save(); g.translate(cx, yBot); g.scale(1, 0.32); glow(g, 0, 0, W * 0.34, calmCol, 0.16 + 0.3 * pk); g.restore();
  }
  function drawFlowLine(t, prog) {
    const sEnd = lerp(endS, 1, fin);
    if (sEnd < 0.02) return;
    const p = new Path2D(), nn = Math.max(2, Math.ceil(sEnd * 60));
    for (let i = 0; i <= nn; i++) { const s = (i / nn) * sEnd, x = cx + chOffN(s) * W, y = yTop + s * L; if (i) p.lineTo(x, y); else p.moveTo(x, y); }
    const q = 0.35 + 0.45 * smooth(prog) + 0.35 * fin;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = rgba(lineCol, 0.07 * q); g.lineWidth = 16 * s1; g.stroke(p);
    g.strokeStyle = rgba(lineCol, 0.22 * q); g.lineWidth = 5 * s1; g.stroke(p);
    g.strokeStyle = rgba('#ffffff', 0.6 * q); g.lineWidth = 1.5 * s1; g.stroke(p);
    g.restore();
    // calm beads of light travelling the channel
    for (let b = 0; b < 3; b++) { const s = (((t * 26 * s1) / L + b / 3) % 1) * sEnd; glow(g, cx + chOffN(s) * W, yTop + s * L, 9 * s1, lineCol, 0.45 * q); }
    if (finAt >= 0) { const u = clamp((t - finAt) / 3.4); if (u < 1) { const s = ease.inOutSine(u); glow(g, cx + chOffN(s) * W, yTop + s * L, 26 * s1, '#ffffff', 0.5 * Math.sin(Math.PI * u)); } }
  }
  function updCharms(dt, dk, t) {
    for (let j = 0; j < K; j++) {
      const c = charms[j];
      const sz = (c.hero ? 1.18 : 1) * lerp(szC, szA, ease.inOutSine(c.al));
      ribAt(c.k, clamp(c.s + 0.045 * Math.sin(tau * 0.5 + c.ph0) * (1 - c.al)), pt);
      let x = pt.x, y = pt.y;
      const ys = yTop + c.s * L;
      if (!c.aligned && reedY - ys >= rr + sz * 0.5 + 2 * s1) align(c, j);
      if (c.aligned) {
        c.al = Math.min(1, c.al + dt / 1.5);
        const o = szA * 0.5 * (c.hero ? 1.18 : 1) + bAmp + Wa * 0.6 + 6 * s1;
        const sx = cx + chOffN(c.s) * W + c.side * o;
        const sy = ys + (reduced ? 0 : 3 * s1 * Math.sin(t * 0.6 + c.ph0)) + fin * L * 0.035;
        const k = ease.inOutSine(c.al); x = lerp(x, sx, k); y = lerp(y, sy, k);
      }
      // the floating reed glides over it: the charm dips softly beneath the surface
      const u = clamp(((x - cAx) * cA + (y - cAy) * sA) / Lr);
      const d = Math.hypot(x - (cAx + cA * Lr * u), y - (cAy + sA * Lr * u));
      c.sub = lerp(c.sub, (1 - c.al) * (1 - smooth((d - rr * 0.4) / (rr * 0.6 + sz * 0.5))), 1 - Math.exp(-dt * 8));
      c.vx += (-c.ix * 16 - c.vx * 4.5) * dk; c.vy += (-c.iy * 16 - c.vy * 4.5) * dk; c.ix += c.vx * dk; c.iy += c.vy * dk;
      c.x = clamp(x + c.ix, stage.x + sz * 0.5, stage.x + W - sz * 0.5); c.y = y + c.iy; c.sz = sz;
    }
  }
  function drawCharms(t) {
    for (let j = 0; j < K; j++) {
      const c = charms[j], x = c.x, y = c.y, sz = c.sz * (1 - 0.1 * c.sub), k = c.al, wild = 1 - k, sub = c.sub;
      g.save(); g.globalAlpha = 1 - 0.45 * sub;
      shadow(g, x + 4 * s1, y + sz * 0.46, sz * 0.42, sz * 0.12, 0.22);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(calmCol, 0.12 + 0.1 * k); g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(x, y + sz * 0.1, sz * 0.62, sz * 0.2, 0, 0, TAU); g.stroke(); g.restore();
      if (c.ph >= 0) {
        photos.draw(g, c.ph, x, y, sz, { shape: 'bubble', rot: wild * 0.38 * Math.sin(tau * 0.8 + c.ph0), tone: 'rain', toneMix: wild * 0.5, blur: Math.min(1, wild * 0.28 + sub * 0.4),
          glow: 0.2 + 0.35 * k + 0.25 * fin, glowColour: calmCol, shadow: false, skewY: reduced ? 0 : wild * 0.04 * Math.sin(t * 2.3 + c.ph0) });
      } else {
        glow(g, x, y, sz * 0.62, k > 0.5 ? calmCol : colC[c.k], 0.32 + 0.25 * k + 0.2 * fin);
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#ffffff', 0.22); g.lineWidth = 1.2;
        g.beginPath(); g.arc(x, y, sz * 0.36, 0, TAU); g.stroke(); g.restore();
        orb(g, x, y, sz * 0.2, k > 0.5 ? pearlCalm[c.k] : pearlWild[c.k]);
      }
      g.restore();
    }
  }
  function drawFish(t) {
    if (twistAt < 0) return;
    const tt = t - twistAt; if (tt > 7) { twistAt = -1; return; }
    const sHi = Math.max(0.2, endS - 0.03), NF = reduced ? 3 : 5;
    for (let i = 0; i < NF; i++) {
      const u = (tt - i * 0.4) / 4.8; if (u <= 0 || u >= 1) continue;
      const s = lerp(sHi, 0.04, ease.inOutSine(u)), a = Math.sin(Math.PI * u);
      const x = cx + chOffN(s) * W + Math.sin(u * 9 + i * 1.7) * (bAmp + 6 * s1) * (i % 2 ? 1 : -1), y = yTop + s * L;
      const r = (5.5 + (i % 3)) * s1, ang = -Math.PI / 2 + Math.sin(tt * 7 + i) * (reduced ? 0.05 : 0.22);
      glow(g, x, y, r * 3, fishCol, 0.35 * a);
      g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = a; g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(fishCol, 0.85);
      g.beginPath(); g.ellipse(0, 0, r, r * 0.42, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-r * 0.8, 0); g.lineTo(-r * 1.7, -r * 0.5); g.lineTo(-r * 1.7, r * 0.5); g.closePath(); g.fill();
      g.restore();
    }
  }
  function drawFingers() {
    for (let i = 0; i < FING.length; i++) { const f = FING[i]; if (f.a > 0.01) glow(g, f.x, f.y, 34 * s1, calmCol, 0.3 * f.a); }
  }
  const stalkAt = (x) => { const u = x / Lr + 0.5; return (1 - u) * (1 - u) * (stalkY + 1.5 * s1) + 2 * u * (1 - u) * (stalkY - 3 * s1) + u * u * (stalkY + s1); };
  function drawReed(t, wv) {
    const x = rxNow, y = reedY;
    shadow(g, x + 6 * s1, y + 11 * s1, Lr * 0.5, leafW * 0.55, 0.3);
    const idle = !drag && !doneFlag && finAt < 0;
    glow(g, x, y, Lr * 0.62, calmCol, (idle ? 0.09 + 0.05 * Math.sin(t * 2.1) : 0.15) + 0.12 * fin + 0.15 * callout);
    g.save(); g.translate(x, y); g.rotate(tilt + wv * (reduced ? 0.012 : 0.05));
    g.lineCap = 'round'; g.lineJoin = 'round';
    // meniscus where the reed rests on the water
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(calmCol, 0.16 + 0.06 * Math.sin(t * 1.7)); g.lineWidth = 1.3;
    g.beginPath(); g.ellipse(0, 2 * s1, Lr * 0.54, leafW * 0.8, 0, 0, TAU); g.stroke();
    g.globalCompositeOperation = 'source-over';
    // the broad leaf
    g.fillStyle = leafGrad; g.fill(leafPath);
    if (fin > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 * fin; g.fillStyle = calmCol; g.fill(leafPath); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    g.strokeStyle = rgba(leafLight, 0.7); g.lineWidth = 1; g.stroke(leafPath);
    g.strokeStyle = 'rgba(232,255,232,0.1)'; g.stroke(veinPath);
    // the words, written along the leaf
    if (E.phase !== 'law') words.draw(g, 0, leafC(0.5) + 1.5 * s1, { style: 'light', size: wSize, maxWidth: Lr * 0.64, lines: 2, glowColour: wordGlow, alpha: 0.95 });
    // a slender second blade curling off the stalk
    g.fillStyle = leafMid; g.fill(bladePath); g.strokeStyle = rgba(leafLight, 0.6); g.lineWidth = 1; g.stroke(bladePath);
    // the stalk with its nodes
    g.strokeStyle = stalkDark; g.lineWidth = 6.4 * s1; g.stroke(stalkPath);
    g.strokeStyle = stalkGrad; g.lineWidth = 4.6 * s1; g.stroke(stalkPath);
    g.save(); g.translate(0, -1.4 * s1); g.strokeStyle = 'rgba(255,248,214,0.55)'; g.lineWidth = 1.1 * s1; g.stroke(stalkPath); g.restore();
    for (let i = 0; i < 4; i++) {
      const nx = (-0.36 + i * 0.24) * Lr, ny = stalkAt(nx);
      g.fillStyle = stalkDark; g.beginPath(); g.ellipse(nx, ny, 1.6 * s1, 3.6 * s1, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,246,200,0.5)'; g.beginPath(); g.ellipse(nx + 0.9 * s1, ny - 0.8 * s1, 0.7 * s1, 2.4 * s1, 0, 0, TAU); g.fill();
    }
    // the feathery plume at the tail end
    const px = -Lr * 0.5, py = stalkY + 1.5 * s1;
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(plumeCol, 0.5); g.lineWidth = 1.5 * s1;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8 - 0.5) * 1.25 + Math.sin(t * 1.25 + i * 0.8) * (reduced ? 0.04 : 0.14);
      const len = (15 + 9 * Math.abs(Math.sin(i * 1.7))) * s1;
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.cos(a - 0.3) * len * 0.6, py + Math.sin(a - 0.3) * len * 0.6, px + Math.cos(a) * len, py + Math.sin(a) * len); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    glow(g, px - 8 * s1, py, 16 * s1, plumeCol, 0.35);
    // the pointed head end
    g.strokeStyle = stalkMid; g.lineWidth = 2 * s1; g.beginPath(); g.moveTo(Lr * 0.5, stalkY + s1); g.lineTo(Lr * 0.5 + 11 * s1, stalkY + 2.5 * s1); g.stroke();
    g.restore();
  }
  function drawTow() {
    if (!drag) return;
    const gx = rxNow + drag.gx, gy = reedY + drag.gy, d = Math.hypot(drag.fx - gx, drag.fy - gy);
    if (d < 10 * s1) return;
    const a = clamp(d / (120 * s1)) * 0.5;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(lineCol, a); g.lineWidth = 1.6 * s1; g.beginPath(); g.moveTo(gx, gy); g.lineTo(drag.fx, drag.fy); g.stroke();
    g.restore();
    glow(g, drag.fx, drag.fy, 20 * s1, lineCol, a);
  }

  // ------------------------------------------------------------ input --
  function hitReed(p) {
    const dx = p.x - rxNow, dy = p.y - reedY, c = Math.cos(tilt), s = Math.sin(tilt);
    return Math.abs(dx * c + dy * s) < Lr * 0.5 + 28 && Math.abs(-dx * s + dy * c) < leafW * 0.5 + 34;
  }
  return {
    get progress() { return clamp(rot); },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      if (!drag && hitReed(p)) {
        drag = { id: p.id, gx: p.x - rxNow, gy: p.y - reedY, fx: p.x, fy: p.y, tp: wanted };
        coast = 0; dip.kick(0.5);
        E.sound('drip', { note: 1 + Math.floor(rot * 6), intensity: 0.4 }); buzz('light', 0.08);
        E.ripples.add(p.x, p.y, { colour: calmCol, speed: 60, alpha: 0.5, r: 6 });
        return;
      }
      // a fingertip on the open water: the currents bend around it
      const f = FING.find((q) => !q.live) || FING[0];
      f.id = p.id; f.x = f.lx = p.x; f.y = f.ly = p.y; f.a = 1; f.live = true;
      E.ripples.add(p.x, p.y, { colour: calmCol, speed: 70, alpha: 0.55, r: 5 });
      E.sound('bubble', { note: clamp(Math.floor(((p.x - stage.x) / W) * 8), 0, 7) + 1, intensity: 0.3 }); buzz('tick', 0.06);
      nudge(p.x, p.y, 1); callout = 1;
    },
    move(p) {
      if (drag && p.id === drag.id) {
        drag.fx = p.x; drag.fy = p.y;
        drag.tp = clamp((p.y - drag.gy - y0) / (y1 - y0));
        offTN = clamp((p.x - drag.gx - cx) / W, -maxOffN, maxOffN);
        if (E.locked && drag.tp > rot + CAP * 0.8) waitNudge();
        return;
      }
      const f = FING.find((q) => q.live && q.id === p.id); if (!f) return;
      f.x = p.x; f.y = p.y;
      if (Math.hypot(p.x - f.lx, p.y - f.ly) > 22 * s1) {
        f.lx = p.x; f.ly = p.y; nudge(p.x, p.y, 0.4);
        E.ripples.add(p.x, p.y, { colour: calmCol, speed: 50, alpha: 0.35, r: 4 });
        if (once('wbub', 0.18)) E.sound('bubble', { note: clamp(Math.floor(((p.x - stage.x) / W) * 8), 0, 7) + 1, intensity: 0.18 });
      }
    },
    up(p) {
      if (drag && p.id === drag.id) {
        coast = Math.min(drag.tp, wanted + 0.035); drag = null;
        if (rot >= 0.998 && assistTo == null) doneFlag = true;
        return;
      }
      const f = FING.find((q) => q.live && q.id === p.id); if (f) f.live = false;
    },
    assist() {
      if (finAt >= 0) return;
      presses++;
      assistTo = Math.min(1, Math.max(wanted, rot) + 1 / 8);
      offTN = maxOffN * 0.32 * (presses % 2 ? 1 : -1) * (1 - calm0);   // a gentle weave
      if (E.locked) waitNudge();
      dip.kick(0.4);
      E.ripples.add(rxNow, reedY + leafW * 0.5, { colour: calmCol, speed: 55, alpha: 0.45, r: 8 });
      E.sound('drip', { note: Math.min(9, presses), intensity: 0.35 }); buzz('light', 0.1);
    },
    pointAt(p) {
      p = clamp(p);
      const y = y0 + p * (y1 - y0), s = (y - yTop) / L;
      const x = p <= shown + 1e-4 ? cx + chOffN(s) * W : cx + offN * W * (1 - smooth((p - 0.78) / 0.2));
      return { x, y };
    },
    hint() {
      const ya = reedY, yb = y0 + Math.min(1, rot + 0.24) * (y1 - y0) + 2, amp = 14 * s1 * (1 - smooth((rot - 0.55) / 0.3));
      const pts = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([rxNow + Math.sin(u * TAU) * amp, lerp(ya, yb, u)]); }
      return { path: pts };
    },
    twist() { twistAt = E.now(); E.sound('shimmer', { intensity: 0.28 }); },
    finish() {
      if (finAt >= 0) return;
      finAt = E.now();
      charms.forEach((c, j) => { if (!c.aligned) align(c, j); });
      E.sound(heavy ? 'settle' : 'shimmer', { intensity: 0.45 }); buzz('soft', 0.2);
    },
    destroy() {},
  };
}
