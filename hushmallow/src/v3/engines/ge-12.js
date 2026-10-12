// GE-12 · LANTERN FLOAT — paper lantern elevator (vertical lifting drag).
// Touch the lantern's base and lift it along a slowly curving silk line until
// it catches the upper breeze. It rises only as far as your finger takes it:
// let go and it simply hovers there, glowing and swaying on its ring. Rushing
// makes the paper drag behind; a slow lift is followed exactly and the flame
// steadies. Win: its top ring hooks into the hanging socket on the festival
// wire and the latch closes.
//
// Photos: the hero photo glows through the lantern paper (cool and dim at
// first, warming as it rises); any others hang beneath it on the same silk as
// small lanterns that kindle one by one as they lift off. At the finale the
// light runs along the festival wire and the photos soften into lantern light.
// Words are inked on the lantern paper (hidden while the world law speaks).

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, hex, glow, glint, orb, halo, motes, noise2, rng, canvas, roundRect } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-12',
  howTo: 'Touch the lantern’s base and lift it slowly up to its socket.',
  steps: [
    'Touch the base of the glowing paper lantern.',
    'Lift it slowly along the silk line — it rises only as far as your finger takes it.',
    'Carry it into the upper breeze until its ring hooks into the hanging socket.',
  ],
  tapAlt: 'each press lifts the lantern one gentle step',
  words: 'Your words are inked on the lantern’s paper, backlit more warmly the higher it rises.',
  photos: {
    where: 'Your first photo glows through the lantern’s paper; any others hang beneath it as small lanterns on the same silk.',
    becomes: 'warm paper lanterns',
    touch: 'You lift them all together by the lantern’s base;',
    change: 'each small lantern kindles from a cool, dim glow into soft warm light as it lifts off.',
    payoff: 'At the end they hang softly lit below the socket while light runs along the festival wire.',
  },
  finaleSec: 4.2,
};

const BANK = 0.06;          // how far input may run ahead of the gated state
const ASSIST_STEP = 1 / 8;  // one press of "Tap instead"
const ASSIST_RATE = 0.36;   // progress per second while a press animates
const RIBS = 11;
const SUPER = 2.35;         // superellipse exponent of the lantern barrel
const YOKE_Y = 1.235;       // bamboo yoke height under the ring (Hb units)
const STR = 0.08;           // short pendant string (Hb units)
const luma = (h) => { const [r, gg, b] = hex(h); return (0.299 * r + 0.587 * gg + 0.114 * b) / 255; };
const hwAt = (a, v) => a * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), SUPER)), 1 / SUPER);

function superPath(a, b, cy, N = 60) {
  const p = new Path2D();
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * TAU, c = Math.cos(t), s = Math.sin(t);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / SUPER), y = cy + b * Math.sign(s) * Math.pow(Math.abs(s), 2 / SUPER);
    if (i) p.lineTo(x, y); else p.moveTo(x, y);
  }
  p.closePath();
  return p;
}

/** Soft washi-paper fibres (one small tile, used as a repeating pattern). */
function washiTile(seed) {
  const S = 128, c = canvas(S, S), x = c.getContext('2d'), r = rng(seed);
  x.lineCap = 'round';
  for (let i = 0; i < 240; i++) {
    const px = r() * S, py = r() * S, a = r() * TAU, L = 3 + r() * 16;
    x.strokeStyle = r() < 0.62 ? `rgba(255,250,236,${0.06 + r() * 0.14})` : `rgba(110,50,16,${0.05 + r() * 0.09})`;
    x.lineWidth = 0.4 + r() * 0.9;
    x.beginPath(); x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a + 0.6) * L * 0.5, py + Math.sin(a + 0.6) * L * 0.5, px + Math.cos(a) * L, py + Math.sin(a) * L);
    x.stroke();
  }
  return c;
}

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = !!E.reduced, low = !!E.lowStim, heavy = !!E.heavy;
  const rand = E.rand, round = E.round, calm0 = E.calm;
  const nz = noise2(E.seed + 29);
  const lightBg = luma(pal.sky) > 0.5;

  // ---------------------------------------------------- round variation --
  const side = round === 1 ? 1 : rand() < 0.5 ? -1 : 1;             // which side the socket hangs
  const bendAmt = round === 1 ? 1 : lerp(0.5, 1.25, rand());
  const bendPh = round === 1 ? 0 : (rand() - 0.5) * 1.4;
  const TINTS = [mix(pal.warm, '#ff8a3a', 0.35), mix(pal.accent, '#ff9a6a', 0.3), '#ffc65a', mix(pal.glow, '#fff0d0', 0.2)];
  const tint = mix(round === 1 ? TINTS[0] : TINTS[Math.floor(rand() * TINTS.length)], '#ffe6c0', calm0 * 0.35);
  const paper = mix(tint, '#ffe9bf', 0.38);          // lit paper (mid tone)
  const rim = mix(tint, lightBg ? '#a03a1c' : '#4a0c12', lightBg ? 0.32 : 0.4);   // paper towards the edges
  const edge = mix(tint, lightBg ? '#5a1a10' : '#1c0508', lightBg ? 0.58 : 0.74);  // deepest edge / ribs
  const flame = mix('#ffc670', tint, 0.22);
  const coolPaper = mix(pal.glow, '#c8d2f0', 0.55);
  const silk = mix('#d8343c', pal.accent, 0.32);
  const thread = lightBg ? rgba(mix(pal.ink, '#000000', 0.2), 0.55) : 'rgba(255,238,220,0.5)';
  const ribbonCol = lightBg ? '#ffffff' : mix(pal.glow, '#ffffff', 0.55);
  const glowK = lightBg ? 0.62 : 1;
  const INK = '#36130a';
  const twistKind = round % 2 === 1 ? 'moth' : 'breath';
  // a soft pool of shade behind the lantern separates it from busy skies (cached sprite)
  const shadePool = (() => {
    const S = 128, c = canvas(S, S), x = c.getContext('2d'), gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, rgba(mix(pal.deep, '#05030f', 0.4), 0.85)); gr.addColorStop(0.55, rgba(mix(pal.deep, '#05030f', 0.4), 0.35)); gr.addColorStop(1, rgba(pal.deep, 0));
    x.fillStyle = gr; x.fillRect(0, 0, S, S); return c;
  })();

  // ------------------------------------------------------------ photos --
  const n = photos.n;
  const heroPh = n ? (round - 1) % n : -1;
  const pend = [];
  for (let j = 1; j < n; j++) pend.push((heroPh + j) % n);
  const K = pend.length;
  const stagger = K >= 4;
  // kindle thresholds: outermost lanterns lift off first (round 1), shuffled later
  const order = pend.map((_, j) => j);
  if (round === 1) order.sort((a, b) => Math.abs(b - (K - 1) / 2) - Math.abs(a - (K - 1) / 2));
  else for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
  const thr = new Float32Array(K);
  order.forEach((j, r) => { thr[j] = K === 1 ? 0.42 : lerp(0.14, 0.72, r / (K - 1)); });
  const kin = new Float32Array(K), kinAt = new Float32Array(K).fill(-1);
  const kindled = new Uint8Array(K);

  // ---------------------------------------------------- physics state --
  const NB = 2 + K;                                   // 0 hero, 1 tassel, 2.. pendants
  const bx = new Float32Array(NB), by = new Float32Array(NB), bvx = new Float32Array(NB), bvy = new Float32Array(NB), bL = new Float32Array(NB);
  const pAx = new Float32Array(K), pAy = new Float32Array(K), pRow = new Uint8Array(K);
  for (let j = 0; j < K; j++) pRow[j] = stagger ? j % 2 : 0;

  // ------------------------------------------------------------ layout --
  let H, U, Hb, W, Ws, hs, D, y0, y1, groundY, wireY0, sag, stemL, xS, x0, A, room, yokeHalf, travel, wPad;
  let bodyPath, smallPath, gDim, gLit, gHot, gShade, gRim, gVig, gCapT, gCapB, sDim, sLit, sShade, washi, gCup;
  const ribV = new Float32Array(RIBS), ribHW = new Float32Array(RIBS);
  const ribbonGrad = [];
  const RIBBONS = reduced || low ? 4 : 5;
  // festival wire: small dim lanterns (decor), lit by the finale
  const M_FRACS = [0.05, 0.19, 0.33, 0.5, 0.67, 0.81, 0.95];
  const mX = new Float32Array(7), mCord = new Float32Array(7), mSz = new Float32Array(7), mLit = new Float32Array(7), mT = new Float32Array(7), mOn = new Uint8Array(7);
  const mCol = M_FRACS.map(() => [pal.glow, pal.accent, pal.warm, paper][Math.floor(rand() * 4)]);
  let M = 0;
  // far-away sky lanterns (depth)
  const BG = reduced || low ? 5 : 8;
  const bgX = new Float32Array(BG), bgS = new Float32Array(BG), bgP = new Float32Array(BG), bgSz = new Float32Array(BG), bgA = new Float32Array(BG);
  { const r = rng(E.seed * 3 + 1); for (let i = 0; i < BG; i++) { bgX[i] = 0.04 + 0.92 * ((i + r() * 0.8) / BG); bgS[i] = (0.012 + r() * 0.014) * (heavy ? 0.7 : 1); bgP[i] = r(); bgSz[i] = 0.6 + r() * 0.8; bgA[i] = 0.35 + r() * 0.4; } }

  const smallTotal = 1.42 * 1.02 * 0.47;   // small lantern ring→tassel, in Hb units
  function depthFactor() {
    if (!K) return 1.155 + 0.13 + 0.34;
    if (K === 1) return 1.155 + 0.17 + smallTotal;
    return YOKE_Y + 0.05 + STR + (stagger ? 0.62 * smallTotal : 0) + smallTotal;
  }
  const wireAt = (x) => { const u = (x - stage.cx) / (stage.w / 2 + 30); return wireY0 + sag * (1 - u * u); };
  const pathX = (p) => {
    const x = lerp(x0, xS, ease.inOutSine(p)) + A * Math.sin(TAU * 0.75 * p + bendPh) * (1 - p);
    return clamp(x, stage.cx - room, stage.cx + room);
  };
  const ringY = (p) => lerp(y0, y1, p);

  function fit() {
    H = stage.h;
    const sw = stage.w;
    wireY0 = stage.y + H * 0.07; sag = H * 0.04; stemL = Math.max(18, H * 0.05);
    groundY = stage.y + H * 0.965;
    const df = depthFactor();
    const travelMin = H * (K >= 4 ? 0.28 : K ? 0.31 : 0.34) * (H < 380 ? 0.78 : 1);
    const spreadK = !K ? 0 : K === 1 ? 0.25 : 0.47 * (((K - 1) * (stagger ? 0.8 : 1.16)) / 2 + 0.5);
    const hbW = Math.min((sw * 0.38) / 1.08, spreadK ? (sw / 2 - 10) / spreadK : 1e9);
    const ySock = wireY0 + sag + stemL;
    Hb = Math.max(34, Math.min(H * (H < 380 ? 0.34 : 0.26), hbW, (groundY - ySock - travelMin) / df));
    U = Hb / 120;
    W = Hb * 1.08; Ws = Hb * 0.47; hs = Ws * 1.02;
    D = df * Hb;
    yokeHalf = K >= 2 ? ((K - 1) * (stagger ? 0.8 : 1.16) * Ws) / 2 : 0;
    const halfA = Math.max(W / 2 + 6, yokeHalf + Ws / 2 + 4);
    room = Math.max(0, sw / 2 - halfA - 4);
    xS = stage.cx + side * Math.min(room, sw * 0.16);
    x0 = stage.cx - side * Math.min(room, sw * 0.05);
    A = Math.min(room * 0.7, sw * 0.08) * bendAmt;
    y1 = wireAt(xS) + stemL;
    y0 = groundY - D;
    travel = Math.max(24, y0 - y1);
    wPad = Math.max(W / 2, yokeHalf + Ws / 2) + 24;
    { const cw = Math.max(11, W * 0.13); gCup = g.createLinearGradient(xS - cw, 0, xS + cw, 0); gCup.addColorStop(0, '#6a3e14'); gCup.addColorStop(0.4, '#f0c470'); gCup.addColorStop(0.62, '#ffe2a0'); gCup.addColorStop(1, '#5a3010'); }

    // cached shapes + gradients (lantern-local coordinates; ring at 0,0)
    const yc = Hb * 0.62;
    bodyPath = superPath(W / 2, Hb / 2, yc);
    gDim = g.createRadialGradient(0, yc + Hb * 0.14, 0, 0, yc, Math.max(W, Hb) * 0.6);
    gDim.addColorStop(0, mix(paper, '#3a1a20', 0.22)); gDim.addColorStop(0.5, mix(rim, '#1a0818', 0.2)); gDim.addColorStop(1, mix(edge, '#0a0410', 0.2));
    gHot = g.createRadialGradient(0, yc + Hb * 0.16, 0, 0, yc + Hb * 0.08, Math.max(W, Hb) * 0.56);
    gHot.addColorStop(0, 'rgba(255,252,236,1)'); gHot.addColorStop(0.38, 'rgba(255,236,190,0.5)'); gHot.addColorStop(1, 'rgba(255,220,160,0)');
    gLit = g.createRadialGradient(0, yc + Hb * 0.16, 0, 0, yc, Math.max(W, Hb) * 0.6);
    gLit.addColorStop(0, '#fffbea'); gLit.addColorStop(0.16, mix(paper, '#fff3d0', 0.6)); gLit.addColorStop(0.5, paper);
    gLit.addColorStop(0.82, rim); gLit.addColorStop(1, edge);
    gShade = g.createLinearGradient(-W / 2, 0, W / 2, 0);
    gShade.addColorStop(0, 'rgba(255,255,255,0.2)'); gShade.addColorStop(0.2, 'rgba(255,255,255,0.05)'); gShade.addColorStop(0.5, 'rgba(255,255,255,0)');
    gShade.addColorStop(0.8, 'rgba(50,10,0,0.1)'); gShade.addColorStop(1, 'rgba(40,8,0,0.3)');
    gRim = g.createLinearGradient(-W / 2, 0, W / 2, 0);
    gRim.addColorStop(0, 'rgba(255,246,224,0.75)'); gRim.addColorStop(0.35, 'rgba(255,246,224,0.08)'); gRim.addColorStop(0.7, 'rgba(255,246,224,0)'); gRim.addColorStop(1, rgba(flame, 0.35));
    gVig = g.createRadialGradient(0, yc, Hb * 0.28, 0, yc, Hb * 0.62);
    gVig.addColorStop(0, 'rgba(60,14,0,0)'); gVig.addColorStop(1, 'rgba(60,14,0,0.32)');
    const capGrad = (y, h) => { const cg = g.createLinearGradient(0, y, 0, y + h); cg.addColorStop(0, '#7a2c18'); cg.addColorStop(0.35, '#3a100a'); cg.addColorStop(1, '#140504'); return cg; };
    gCapT = capGrad(Hb * 0.085, Hb * 0.08); gCapB = capGrad(Hb * 1.075, Hb * 0.08);
    for (let i = 0; i < RIBS; i++) { const v = -0.86 + (1.72 * i) / (RIBS - 1); ribV[i] = v; ribHW[i] = hwAt(W / 2, v); }
    // small lanterns
    const syc = hs * 0.6;
    smallPath = superPath(Ws / 2, hs / 2, syc, 40);
    const cool = coolPaper;
    sDim = g.createRadialGradient(0, syc + hs * 0.1, 0, 0, syc, Ws * 0.62);
    sDim.addColorStop(0, mix(cool, '#24204a', 0.35)); sDim.addColorStop(0.7, mix(cool, '#14123a', 0.6)); sDim.addColorStop(1, '#0c0a24');
    sLit = g.createRadialGradient(0, syc + hs * 0.14, 0, 0, syc, Ws * 0.62);
    sLit.addColorStop(0, '#fffbea'); sLit.addColorStop(0.22, mix(paper, '#fff3d0', 0.55)); sLit.addColorStop(0.62, paper); sLit.addColorStop(0.88, rim); sLit.addColorStop(1, edge);
    sShade = g.createLinearGradient(-Ws / 2, 0, Ws / 2, 0);
    sShade.addColorStop(0, 'rgba(255,255,255,0.16)'); sShade.addColorStop(0.45, 'rgba(255,255,255,0)'); sShade.addColorStop(1, 'rgba(40,8,0,0.38)');
    washi ||= g.createPattern(washiTile(E.seed + 7), 'repeat');
    // breeze ribbons fade in and out across the stage
    ribbonGrad.length = 0;
    for (let r = 0; r < RIBBONS; r++) {
      const lg = g.createLinearGradient(stage.x - 10, 0, stage.x + stage.w + 10, 0);
      const c = r % 2 ? ribbonCol : mix(ribbonCol, pal.glow, 0.4);
      lg.addColorStop(0, rgba(c, 0)); lg.addColorStop(0.18 + 0.05 * r, rgba(c, 1)); lg.addColorStop(0.8 - 0.04 * r, rgba(c, 1)); lg.addColorStop(1, rgba(c, 0));
      ribbonGrad.push(lg);
    }
    // wire lanterns (skip the socket's spot)
    M = 0;
    for (let i = 0; i < M_FRACS.length; i++) {
      const x = stage.x + M_FRACS[i] * stage.w;
      if (Math.abs(x - xS) < Math.max(34, sw * 0.11)) continue;
      mX[M] = x; mCord[M] = (6 + ((i * 7) % 5) * 2.6) * Math.max(0.7, U); mSz[M] = (14 + ((i * 5) % 4) * 2) * Math.max(0.72, U); M++;
    }
    // earlier rounds' lanterns are still lit on the wire, nearest the socket first
    const near = Array.from({ length: M }, (_, i) => i).sort((a, b) => Math.abs(mX[a] - xS) - Math.abs(mX[b] - xS));
    for (let r = 0; r < M; r++) { const i = near[r]; const on = r < round - 1 ? 1 : 0; mOn[i] = on; mT[i] = on; mLit[i] = on; }
    // pendant layout on the bamboo yoke
    for (let j = 0; j < K; j++) {
      if (K === 1) { pAx[j] = 0; pAy[j] = Hb * 1.155; bL[2 + j] = Hb * 0.17; continue; }
      const sp = stagger ? 0.8 : 1.16, x = (j - (K - 1) / 2) * sp * Ws, s = (x + yokeHalf) / (2 * yokeHalf || 1);
      pAx[j] = x; pAy[j] = Hb * YOKE_Y + Hb * 0.05 * (2 * s - 1) * (2 * s - 1);
      bL[2 + j] = Hb * (STR + (pRow[j] ? 0.62 * smallTotal : 0));
    }
    bL[0] = Hb * 0.62; bL[1] = Hb * 0.13;
    resetBobs();
  }

  // ---------------------------------------------------------------- state --
  let wanted = 0, real = 0, sp = 0, spV = 0, assistTo = null;
  let drag = null, dragY = 0, dragX0 = 0, moved = 0, speed = 0, rushK = 0, lean = 0;
  let flare = 0, lastNote = -1, lastNoteAt = -9, lastTickAt = -9, lastWaitAt = -9, lastLook = -9, moteAcc = 0;
  let caught = false, seated = false, seatAt = -1, seatChimed = false, finAt = -1, twistAt = -1;
  let RX = 0, RY = 0, rotH = 0;
  const wob = new Wobble();
  let tmpX = 0, tmpY = 0;
  const toWorld = (lx, ly) => { const c = Math.cos(rotH), s = Math.sin(rotH); tmpX = RX + lx * c - ly * s; tmpY = RY + lx * s + ly * c; };

  function resetBobs() {
    RX = pathX(sp); RY = ringY(sp); rotH = 0;
    bx[0] = RX; by[0] = RY + bL[0];
    bx[1] = RX; by[1] = RY + Hb * 1.155 + bL[1];
    for (let j = 0; j < K; j++) { bx[2 + j] = RX + pAx[j]; by[2 + j] = RY + pAy[j] + bL[2 + j]; }
    bvx.fill(0); bvy.fill(0);
  }
  fit();
  E.onResize(fit);

  const basePt = (p) => ({ x: pathX(clamp(p)), y: ringY(clamp(p)) + Hb * 1.16 });

  // position-based pendulum: bob i hangs from (ax, ay) at its rest length
  function swing(i, ax, ay, fx, dt, damp) {
    const G = 1500 * Math.max(0.6, U);
    bvx[i] += fx * dt; bvy[i] += G * dt;
    const k = Math.exp(-damp * dt); bvx[i] *= k; bvy[i] *= k;
    let nx = bx[i] + bvx[i] * dt, ny = by[i] + bvy[i] * dt;
    const dx = nx - ax, dy = ny - ay, d = Math.hypot(dx, dy) || 1e-4;
    nx = ax + (dx / d) * bL[i]; ny = ay + (dy / d) * bL[i];
    bvx[i] = clamp((nx - bx[i]) / dt, -2400, 2400); bvy[i] = clamp((ny - by[i]) / dt, -2400, 2400);
    bx[i] = nx; by[i] = ny;
  }
  const angleOf = (i, ax, ay) => -Math.atan2(bx[i] - ax, by[i] - ay);

  // ------------------------------------------------------------- frame --
  function frame(dt, t) {
    const now = E.now();
    // ---- input → world law → state
    if (assistTo != null && !seated) {
      wanted = Math.min(assistTo, wanted + dt * ASSIST_RATE);
      if (wanted >= assistTo - 1e-4) assistTo = null;
    }
    real = E.gate(wanted);
    if (wanted > real + BANK) wanted = real + BANK;
    if (assistTo != null && assistTo > real + BANK + ASSIST_STEP) assistTo = real + BANK + ASSIST_STEP;
    // the lantern floats up behind the input (critically damped) and never past it
    if (dt > 0) {
      const a = -70 * (sp - real) - 16.7 * spV; spV += a * dt; sp += spV * dt;
      if (spV > 0 && sp > real) { sp = real; spV = 0; }
      sp = clamp(sp);
    }
    // finger speed, measured per frame (coalesced pointer events share one timestamp)
    if (drag != null && dt > 0) { speed = lerp(speed, moved / dt, 0.3); moved = 0; rushK = lerp(rushK, invLerp(700, 2200, speed), 0.2); }
    else rushK = Math.max(0, rushK - dt * 1.2);
    flare = Math.max(0, flare - dt * 1.4);
    wob.update(dt);

    // ---- rising melody: one pentatonic note every small rise
    const step = Math.floor(real * 15);
    if (step > lastNote && now - lastNoteAt > 0.11 && real > 0.004) {
      lastNote = step; lastNoteAt = now;
      E.sound('pluck', { note: clamp(Math.round(real * 9), 0, 9), intensity: 0.26 + 0.1 * (1 - rushK), pan: clamp((RX - stage.cx) / (stage.w / 2), -1, 1) * 0.5 });
      if (now - lastTickAt > 0.12) { lastTickAt = now; E.haptic('tick'); }
    } else if (step < lastNote - 1) lastNote = step;

    // ---- small lanterns kindle as they lift off
    for (let j = 0; j < K; j++) {
      if (!kindled[j] && real >= thr[j]) {
        kindled[j] = 1; kinAt[j] = now;
        const x = bx[2 + j], y = by[2 + j] + hs * 0.6;
        photos.dust(pend[j], x, y, Ws, reduced ? 6 : 12, { shape: 'round', up: 30, speed: 22, sizePx: 4 });
        E.ripples.add(x, y, { colour: flame, speed: 50, alpha: 0.4, r: Ws * 0.3 });
        E.sound('glass', { note: (j % 5) + 3, intensity: 0.32 });
        E.checkpoint('photo', pend[j]);
      }
      if (kinAt[j] >= 0) kin[j] = Math.min(1, kin[j] + dt / 0.9);
    }
    // ---- the upper breeze takes it
    if (!caught && real >= 0.8) {
      caught = true;
      E.sound('wind', { intensity: 0.35 }); E.haptic('soft'); E.react('nod');
      if (heroPh >= 0) E.checkpoint('photo', heroPh);
      if (finAt < 0) E.hint('It’s caught the breeze — lift it into the socket.');
    }
    // ---- win: ring hooks into the socket once the finger rests
    if (!seated && real >= 0.999 && drag == null && assistTo == null && finAt < 0) {
      seated = true; seatAt = now;
      E.sound('drop-in', { intensity: 0.45 }); E.haptic('light');
    }
    const seatK = seated ? smooth(clamp((now - seatAt) / 0.7)) : 0;
    if (seated && !seatChimed && seatK > 0.55) {
      seatChimed = true;
      E.sound('chime', { intensity: 0.35 }); E.haptic('success');
      E.ripples.add(xS, y1, { colour: flame, speed: 70, alpha: 0.5, r: 6 });
      E.particles.burst(xS, y1, reduced ? 4 : heavy ? 6 : 12, { speed: 40, colour: '#fff1cf', life: 1.2, size: 5, kind: 'glint' });
    }
    const fin = finAt >= 0 ? smooth(clamp((now - finAt) / 2.4)) : 0;

    // ---- ring position on the silk line (+ idle hover, refusal wobble, socket click)
    const idleA = (reduced ? 0.35 : 1) * (1 - seatK);
    RX = pathX(sp) + (reduced ? 0 : wob.v * 5 * U) + Math.sin(t * 0.63) * 1.2 * U * idleA;
    RY = ringY(sp) + Math.sin(t * 1.05) * 2.4 * U * idleA - seatK * 2 * U;

    // ---- pendulums: hero body, tassel, small lanterns
    const gust = 0.65 + 0.35 * nz(t * 0.22, 2.7);
    const inBreeze = smooth(invLerp(0.66, 0.92, sp));
    const breezeF = side * (inBreeze * 210 * (1 - seatK * 0.65) + 22) * gust * Math.max(0.6, U) * (1 - fin * 0.7) * (reduced ? 0.5 : 1) * (1 - calm0 * 0.4);
    if (dt > 0) {
      let fx0 = breezeF * 0.45 + Math.sin(t * 0.5) * 10 * U;
      if (drag != null) fx0 += (RX + lean - bx[0]) * 20;
      if (!reduced) fx0 += wob.vel * 60;
      swing(0, RX, RY, fx0, dt, 1.7);
      rotH = clamp(angleOf(0, RX, RY), -0.6, 0.6);
      toWorld(0, Hb * 1.155); swing(1, tmpX, tmpY, breezeF * 0.8 + Math.sin(t * 0.9) * 14 * U, dt, 2.2);
      for (let j = 0; j < K; j++) { toWorld(pAx[j], pAy[j]); swing(2 + j, tmpX, tmpY, breezeF + Math.sin(t * 0.7 + j * 1.9) * 16 * U, dt, 1.3); }
    }

    // ---- lantern light
    const lit = clamp(lerp(0.5 + calm0 * 0.3, 1, smooth(real * 1.05)) + flare * 0.12 + seatK * 0.08);
    const flick = 1 + (reduced ? 0 : rushK * (0.08 * Math.sin(t * 5.3) + 0.05 * Math.sin(t * 8.1 + 1))) + 0.035 * Math.sin(t * 1.3);
    const heroWarm = clamp(lerp(0.28 + calm0 * 0.5, 1, smooth(invLerp(0, 0.82, real))) + fin);
    const turn = reduced ? 0 : Math.sin(t * 0.42 + bendPh) * 0.24 * (1 - fin * 0.5);

    // heat motes drift up from the top cap while it rises
    if (spV > 0.02 && !low) { moteAcc += spV * dt * 40; while (moteAcc > 1) { moteAcc -= 1; toWorld((rand() - 0.5) * W * 0.3, Hb * 0.1); E.particles.emit({ x: tmpX, y: tmpY, vx: (rand() - 0.5) * 14 + breezeF * 0.05, vy: -26 - rand() * 20, life: 1.3, size: 3.5 + rand() * 3, colour: rand() < 0.5 ? flame : '#fff1d2', alpha: 0.7 }); } }

    // ---- wire lanterns light up from the socket outward in the finale
    if (finAt >= 0) {
      const k = (now - finAt) * (heavy ? 0.75 : 1);
      for (let i = 0; i < M; i++) {
        const d = Math.abs(mX[i] - xS) / (stage.w * 0.5);
        if (!mOn[i] && k > 0.35 + d * 1.5) {
          mOn[i] = 1; mT[i] = 1;
          E.sound('pluck', { note: clamp(8 - Math.round(d * 6), 0, 9), intensity: 0.22, pan: clamp((mX[i] - stage.cx) / (stage.w / 2), -1, 1) * 0.6 });
          if (!heavy && !reduced) E.particles.burst(mX[i], wireAt(mX[i]) + mCord[i] + mSz[i], 4, { speed: 26, colour: '#ffe6b0', life: 1.4, size: 4, dir: -Math.PI / 2, spread: 1.4, kind: 'glint' });
        }
      }
    }
    for (let i = 0; i < M; i++) mLit[i] = lerp(mLit[i], mT[i], 1 - Math.exp(-dt * 2.2));

    // ------------------------------------------------------------ draw --
    drawSkyLanterns(t);
    motes(g, stage.x, stage.y + stage.h * 0.25, stage.w, stage.h * 0.75, t * (heavy ? 0.6 : 1), '#ffe7b8', { n: reduced || low ? 8 : 16, alpha: 0.32, seed: E.seed + 3, size: 1.6 });
    drawBreeze(t, inBreeze, fin, false);
    drawWire(t, fin, now);
    drawThread(t, fin);
    drawCradle(t, lit, fin);
    // the lantern's light falls around it
    toWorld(0, Hb * 0.62);
    { const r = W * 1.35; g.globalAlpha = lightBg ? 0.12 : 0.3; g.drawImage(shadePool, tmpX - r, tmpY - r * 0.95, r * 2, r * 2); g.globalAlpha = 1; }
    glow(g, tmpX, tmpY, W * (1.5 + 0.6 * lit) * (1 + fin * 0.25), flame, (0.16 + 0.3 * lit) * flick * glowK);
    glow(g, tmpX, tmpY + Hb * 0.06, W * 0.95, mix(flame, '#fff3d0', 0.4), 0.2 * lit * flick * glowK);
    if (fin > 0 && !reduced) halo(g, tmpX, tmpY, W * 1.15, t, mix(flame, '#ffffff', 0.4), { rings: heavy ? 2 : 4, alpha: (heavy ? 0.12 : 0.22) * fin, speed: 0.12 });
    drawPendants(t, fin);
    drawHero(t, lit, flick, heroWarm, turn, fin);
    drawSocket(t, seatK, fin);
    drawBreeze(t, inBreeze, fin, true);
    drawTwist(t, now);
  }

  // ----------------------------------------------------------- drawing --
  function drawSkyLanterns(t) {
    const tt = t * (reduced ? 0.4 : 1);
    for (let i = 0; i < BG; i++) {
      const k = (tt * bgS[i] + bgP[i]) % 1;
      const x = stage.x + bgX[i] * stage.w + Math.sin(tt * 0.3 + i * 2.1) * 8, y = stage.y + stage.h * (1.02 - k * 1.08);
      const a = bgA[i] * Math.sin(k * Math.PI) * (lightBg ? 0.7 : 1);
      if (a <= 0.01) continue;
      const s = bgSz[i] * 5 * Math.max(0.7, U) * (0.7 + 0.3 * (1 - k));
      glow(g, x, y, s * 3.4, flame, a * 0.4 * glowK);
      g.fillStyle = rgba(mix(paper, '#fff2d8', 0.4), a * 0.85);
      roundRect(g, x - s * 0.5, y - s * 0.62, s, s * 1.24, s * 0.4); g.fill();
    }
  }

  function drawBreeze(t, inBreeze, fin, front) {
    const top = wireAt(stage.cx) + H * 0.02, span = Math.max(H * 0.26, (y1 + travel * 0.28 + Hb * 0.7) - top);
    const spd = (heavy ? 0.45 : 0.7) * (1 - calm0 * 0.4) * (reduced ? 0.4 : 1);
    toWorld(0, Hb * 0.62); const lx = tmpX, ly = tmpY;
    g.save(); g.globalCompositeOperation = lightBg ? 'source-over' : 'lighter'; g.lineCap = 'round';
    for (let r = 0; r < RIBBONS; r++) {
      if (front !== (r === 2)) continue;
      const base = top + (span * (r + 0.5)) / RIBBONS + Math.sin(t * 0.21 + r * 1.3) * H * 0.012;
      const amp = H * (0.012 + 0.006 * (r % 3)) * (1 - fin * 0.5);
      const near = Math.exp(-Math.pow((base - ly) / (Hb * 0.75), 2));
      g.beginPath();
      for (let i = 0; i <= 36; i++) {
        const x = stage.x - 10 + (i / 36) * (stage.w + 20);
        let y = base + Math.sin(x * 0.018 + r * 1.7 - t * spd * side * 2.2) * amp;
        const d = (x - lx) / (W * 0.85);
        y += Math.exp(-d * d) * near * Hb * 0.42 * Math.sign(base - ly || 1);
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      const aB = ((front ? 0.16 : 0.2 + 0.08 * (r % 2)) + 0.26 * inBreeze) * (1 - fin * 0.55) * (lightBg ? 1.25 : 1);
      g.strokeStyle = ribbonGrad[r];
      g.globalAlpha = aB * 0.3; g.lineWidth = (7 + (r % 3) * 3) * Math.max(0.8, U); g.stroke();
      g.globalAlpha = aB; g.lineWidth = (1 + (r % 3) * 0.5) * Math.max(0.8, U); g.stroke();
    }
    g.restore();
    if (front) return;
    // breeze motes riding the ribbons toward the socket side
    const NM = reduced || low ? 3 : 6;
    for (let i = 0; i < NM; i++) {
      let u = (t * 0.06 * spd * 1.6 + i / NM) % 1; if (side < 0) u = 1 - u;
      const x = stage.x + u * stage.w, y = top + span * ((i * 0.37) % 1) + Math.sin(t + i) * 6;
      glow(g, x, y, 5 * Math.max(0.8, U), ribbonCol, (0.25 + 0.3 * inBreeze) * Math.sin(Math.PI * ((u + 1) % 1)) * glowK);
    }
  }

  function drawWire(t, fin, now) {
    const xL = stage.x - 30, xR = stage.x + stage.w + 30;
    g.save(); g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i <= 24; i++) { const x = lerp(xL, xR, i / 24), y = wireAt(x); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.strokeStyle = rgba(lightBg ? pal.ink : '#120a16', lightBg ? 0.55 : 0.7); g.lineWidth = 2.4; g.stroke();
    g.strokeStyle = rgba(lightBg ? '#ffffff' : '#ffe2b8', 0.3 + 0.35 * fin); g.lineWidth = 1; g.stroke();
    if (finAt >= 0) {
      // light runs out along the wire from the socket, both ways
      const reach = clamp(((now - finAt) * (heavy ? 0.75 : 1) - 0.3) / 1.6) * stage.w * 0.62;
      if (reach > 2) {
        g.globalCompositeOperation = lightBg ? 'source-over' : 'lighter';
        const a = Math.max(xL, xS - reach), b = Math.min(xR, xS + reach);
        g.beginPath();
        for (let i = 0; i <= 18; i++) { const x = lerp(a, b, i / 18), y = wireAt(x); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.strokeStyle = rgba(flame, 0.35 * glowK); g.lineWidth = 5; g.stroke();
        g.strokeStyle = rgba('#fff3d6', 0.9); g.lineWidth = 1.4; g.stroke();
        g.globalCompositeOperation = 'source-over';
        const fade = 1 - clamp((now - finAt - 1.6) / 1.4);
        if (fade > 0) { glow(g, a, wireAt(a), 16, '#fff1d0', 0.8 * fade); glow(g, b, wireAt(b), 16, '#fff1d0', 0.8 * fade); }
      }
    }
    g.restore();
    // breath of light (twist) travelling in from the ends
    const tw = twistKind === 'breath' && twistAt >= 0 ? now - twistAt : -1;
    for (let i = 0; i < M; i++) {
      const x = mX[i], wy = wireAt(x), sway = Math.sin(t * 0.6 + i * 1.7) * 0.07 * (reduced ? 0.3 : 1);
      const d = Math.abs(x - xS) / (stage.w * 0.55);
      const bump = tw >= 0 ? Math.exp(-Math.pow((tw - 0.3 - (1 - d) * 1.6) / 0.55, 2)) * 0.75 : 0;
      const L = Math.min(1, mLit[i] + bump), s = mSz[i];
      g.save(); g.translate(x, wy); g.rotate(sway);
      g.strokeStyle = thread; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, mCord[i]); g.stroke();
      const cy = mCord[i] + s * 0.62;
      glow(g, 0, cy, s * (1.8 + 1.4 * L), mix(mCol[i], flame, 0.5), (0.14 + 0.55 * L) * glowK);
      g.fillStyle = mix(mix(mCol[i], '#140c1a', 0.6), mix(mix(mCol[i], flame, 0.45), '#fff0cc', 0.25), L);
      g.beginPath(); g.ellipse(0, cy, s * 0.5, s * 0.6, 0, 0, TAU); g.fill();
      if (L > 0.02) { g.fillStyle = rgba('#fff8e4', 0.55 * L); g.beginPath(); g.ellipse(0, cy + s * 0.08, s * 0.26, s * 0.32, 0, 0, TAU); g.fill(); }
      g.strokeStyle = rgba(L > 0.3 ? '#7a3a1a' : '#000000', 0.25); g.lineWidth = 0.8;
      g.beginPath(); g.ellipse(0, cy, s * 0.5, s * 0.2, 0, 0, TAU); g.stroke();
      g.fillStyle = '#2a0d08'; g.fillRect(-s * 0.22, cy - s * 0.66, s * 0.44, s * 0.13); g.fillRect(-s * 0.24, cy + s * 0.54, s * 0.48, s * 0.13);
      g.restore();
    }
  }

  function drawThread(t, fin) {
    // the elevator's silk line: faint above the lantern, warm below where it has passed
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const steps = 28;
    g.beginPath();
    for (let i = 0; i <= steps; i++) { const q = lerp(1, sp, i / steps); const x = pathX(q), y = ringY(q); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.strokeStyle = thread; g.globalAlpha = 0.16 * (1 - fin * 0.6); g.lineWidth = 5; g.stroke();
    g.globalAlpha = 0.75 * (1 - fin * 0.6); g.lineWidth = 1.1; g.stroke();
    g.globalAlpha = 1;
    if (sp > 0.004 && fin < 1) {
      // a short warm wake on the silk just below the ring, fading downward
      g.globalCompositeOperation = lightBg ? 'source-over' : 'lighter';
      const tail = Math.min(sp, 0.32);
      for (let seg = 0; seg < 4; seg++) {
        const qa = sp - (tail * seg) / 4, qb = sp - (tail * (seg + 1)) / 4, a = (1 - seg / 4) * (1 - fin);
        g.beginPath();
        for (let i = 0; i <= 5; i++) { const q = lerp(qa, qb, i / 5); const x = pathX(q), y = ringY(q); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.strokeStyle = rgba(flame, 0.22 * glowK * a); g.lineWidth = 5; g.stroke();
        g.strokeStyle = rgba('#fff1d6', 0.5 * a); g.lineWidth = 1.2; g.stroke();
      }
    }
    g.restore();
    // glints climbing the line ahead of the lantern (where to go next)
    if (finAt < 0 && !seated) {
      for (let i = 0; i < 3; i++) {
        const u = (t * 0.11 + i / 3) % 1, q = lerp(sp, 1, u);
        glow(g, pathX(q), ringY(q), 7 * Math.max(0.8, U), lightBg ? '#ffffff' : '#ffe8c0', 0.55 * Math.sin(Math.PI * u) * glowK);
      }
    }
  }

  function drawCradle(t, lit, fin) {
    const cx = pathX(0), cy = groundY - Hb * 0.02;
    const k = (1 - smooth(sp * 1.6)) * lit;
    glow(g, cx, cy, W * 1.0, flame, (0.12 + 0.3 * k) * glowK * (1 - fin * 0.5));
    g.save(); g.translate(cx, cy); g.scale(1, 0.24);
    const col = mix(pal.glow, paper, 0.45);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + t * 0.05;
      g.save(); g.rotate(a); g.fillStyle = rgba(col, 0.16 + 0.12 * k);
      g.beginPath(); g.ellipse(W * 0.38, 0, W * 0.2, W * 0.08, 0, 0, TAU); g.fill(); g.restore();
    }
    g.strokeStyle = rgba(col, 0.35 + 0.2 * k); g.lineWidth = 1.6 / 0.24 * 0.4;
    g.beginPath(); g.arc(0, 0, W * 0.52, 0, TAU); g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.18 + 0.15 * k);
    g.beginPath(); g.arc(0, 0, W * 0.3, 0, TAU); g.stroke();
    g.restore();
  }

  function drawPendants(t, fin) {
    if (!K) return;
    // silk strings first, then the small lanterns
    g.save(); g.lineCap = 'round';
    for (let j = 0; j < K; j++) {
      toWorld(pAx[j], pAy[j]);
      g.strokeStyle = thread; g.lineWidth = 1.1; g.beginPath(); g.moveTo(tmpX, tmpY); g.lineTo(bx[2 + j], by[2 + j]); g.stroke();
    }
    g.restore();
    for (let pass = 1; pass >= 0; pass--) for (let j = 0; j < K; j++) {
      if (pRow[j] !== pass) continue;
      toWorld(pAx[j], pAy[j]);
      drawSmall(j, bx[2 + j], by[2 + j], angleOf(2 + j, tmpX, tmpY), t, fin);
    }
  }

  function drawSmall(j, X, Y, rot, t, fin) {
    const k = clamp(kin[j] + fin), syc = hs * 0.6, ph = pend[j];
    g.save(); g.translate(X, Y); g.rotate(rot);
    glow(g, 0, syc, Ws * (1 + 0.6 * k), flame, (0.08 + 0.32 * k) * glowK);
    if (kinAt[j] >= 0) { const b = clamp((E.now() - kinAt[j]) / 1.1); if (b < 1) glow(g, 0, syc, Ws * (0.8 + b * 1.4), '#fff4d6', 0.5 * (1 - b) * glowK); }
    g.fillStyle = sDim; g.fill(smallPath);
    if (k > 0) { g.globalAlpha = k; g.fillStyle = sLit; g.fill(smallPath); g.globalAlpha = 1; }
    g.save(); g.clip(smallPath);
    const ps = Math.max(Ws, hs) * 1.04;
    if (k < 1) photos.draw(g, ph, 0, syc, ps, { shape: 'round', tone: 'cool', toneMix: 0.8, alpha: (1 - k) * 0.9, shadow: false });
    if (k > 0) photos.draw(g, ph, 0, syc, ps, { shape: 'round', tone: 'warm', toneMix: 0.42, alpha: k * 0.95, blur: fin * 0.35, shadow: false });
    g.globalAlpha = 0.16 * (1 - k); g.fillStyle = coolPaper; g.fill(smallPath);
    g.globalAlpha = 0.18 * k; g.fillStyle = paper; g.fill(smallPath);
    g.globalAlpha = 0.45; g.fillStyle = washi; g.fill(smallPath);
    if (!lightBg && k > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.16 * k; g.fillStyle = sLit; g.fill(smallPath); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = 1;
    g.restore();
    glow(g, 0, syc + hs * 0.14, Ws * 0.52, flame, 0.5 * k * glowK);
    g.fillStyle = sShade; g.fill(smallPath);
    // ribs
    g.strokeStyle = rgba(edge, 0.3); g.lineWidth = 0.9;
    for (let i = 0; i < 5; i++) { const v = -0.72 + i * 0.36, hw = hwAt(Ws / 2, v), y = syc + (v * hs) / 2; g.beginPath(); g.moveTo(-hw, y); g.quadraticCurveTo(0, y + hw * 0.14, hw, y); g.stroke(); }
    // caps, ring, mini tassel
    g.fillStyle = '#2a0c07';
    roundRect(g, -Ws * 0.22, hs * 0.06, Ws * 0.44, hs * 0.08, 2); g.fill();
    roundRect(g, -Ws * 0.24, hs * 1.06, Ws * 0.48, hs * 0.08, 2); g.fill();
    g.strokeStyle = rgba('#e9b866', 0.7); g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(-Ws * 0.21, hs * 0.14); g.lineTo(Ws * 0.21, hs * 0.14); g.moveTo(-Ws * 0.23, hs * 1.06); g.lineTo(Ws * 0.23, hs * 1.06); g.stroke();
    g.strokeStyle = silk; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, hs * 1.14); g.lineTo(0, hs * 1.24); g.stroke();
    orb(g, 0, hs * 1.25, Math.max(1.6, Ws * 0.045), silk);
    g.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, hs * 1.27); g.lineTo(i * Ws * 0.025, hs * 1.42); g.stroke(); }
    g.restore();
  }

  function drawHero(t, lit, flick, heroWarm, turn, fin) {
    const yc = Hb * 0.62, sT = Math.sin(turn), cT = Math.cos(turn);
    g.save(); g.translate(RX, RY); g.rotate(rotH);
    // ---- yoke / central cord / tassel (behind the body)
    if (K >= 1) {
      const yEnd = K === 1 ? Hb * 1.155 : Hb * YOKE_Y;
      g.strokeStyle = thread; g.lineWidth = 1.3; g.beginPath(); g.moveTo(0, Hb * 1.15); g.lineTo(0, yEnd); g.stroke();
      if (K >= 2) {
        const yy = Hb * YOKE_Y, ar = Hb * 0.05, hx = yokeHalf + Ws * 0.12;
        g.lineCap = 'round';
        g.strokeStyle = '#5a3416'; g.lineWidth = 3.4 * Math.max(0.7, U);
        g.beginPath(); g.moveTo(-hx, yy + ar * 1.08); g.quadraticCurveTo(0, yy - ar, hx, yy + ar * 1.08); g.stroke();
        g.strokeStyle = 'rgba(240,206,140,0.75)'; g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(-hx, yy + ar * 1.08 - 1); g.quadraticCurveTo(0, yy - ar - 1, hx, yy + ar * 1.08 - 1); g.stroke();
        for (let j = 0; j < K; j++) { g.fillStyle = '#e9b866'; g.beginPath(); g.arc(pAx[j], pAy[j], 1.6 * Math.max(0.7, U), 0, TAU); g.fill(); }
        orb(g, 0, yy - 1, 3 * Math.max(0.7, U), silk);
      }
    }
    // ---- body
    g.fillStyle = gDim; g.fill(bodyPath);
    g.globalAlpha = lit; g.fillStyle = gLit; g.fill(bodyPath); g.globalAlpha = 1;
    g.save(); g.clip(bodyPath);
    const wx = sT * W * 0.2;
    if (heroPh >= 0) {
      const small = Hb < 96, py = yc - Hb * (small ? 0.21 : 0.17), ps = Hb * (small ? 0.6 : 0.66);
      g.save(); g.translate(wx, py); g.scale(cT, 1);
      if (heroWarm < 1) photos.draw(g, heroPh, 0, 0, ps, { shape: 'circle', tone: 'cool', toneMix: 0.75, alpha: (1 - heroWarm) * 0.88, shadow: false });
      photos.draw(g, heroPh, 0, 0, ps, { shape: 'circle', tone: 'warm', toneMix: lerp(0.5, 0.3, fin), alpha: heroWarm * 0.97, blur: fin * 0.3, shadow: false });
      g.restore();
      g.globalAlpha = lerp(0.3, 0.16, heroWarm); g.fillStyle = paper; g.fill(bodyPath); g.globalAlpha = 1;
    } else {
      // painted ensō: a single calm brush circle around the words
      g.save(); g.translate(wx * 0.8, yc + Hb * 0.02); g.scale(cT, 1);
      g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = rgba(mix(INK, edge, 0.4), 0.13 + 0.03 * i); g.lineWidth = Hb * (0.05 - i * 0.009);
        g.beginPath(); g.arc(i * 0.6, -i * 0.4, Hb * 0.34, -1.05 + i * 0.05, TAU - 1.55 - i * 0.08); g.stroke();
      }
      g.restore();
    }
    g.globalAlpha = 0.55; g.fillStyle = washi; g.fill(bodyPath); g.globalAlpha = 1;
    // the paper itself glows (light leaking through the fibres)
    g.globalCompositeOperation = lightBg ? 'source-over' : 'lighter';
    const ph0 = heroPh >= 0 ? 0.7 : 1;   // keep a photo readable through the light
    g.globalAlpha = (lightBg ? 0.45 : 0.28) * ph0 * lit * flick; g.fillStyle = gHot; g.fill(bodyPath);
    if (!lightBg) { g.globalAlpha = 0.12 * ph0 * lit * flick; g.fillStyle = gLit; g.fill(bodyPath); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.restore();
    // inner flame
    glow(g, 0, yc + Hb * 0.2, W * 0.62, flame, (heroPh >= 0 ? 0.32 : 0.42) * lit * flick * glowK);
    glow(g, 0, yc + Hb * 0.26, W * 0.2, '#fff6dc', 0.5 * lit * flick);
    g.fillStyle = gVig; g.fill(bodyPath);
    g.fillStyle = gShade; g.fill(bodyPath);
    // ribs (bow with the viewing angle) and turning seams
    const bow = 0.2 * clamp((RY + yc - stage.cy) / (stage.h * 0.45), -1, 1);
    g.lineCap = 'round';
    for (let i = 0; i < RIBS; i++) {
      const hw = ribHW[i], y = yc + (ribV[i] * Hb) / 2, c = y + bow * hw * 0.9;
      g.strokeStyle = rgba(edge, 0.22); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-hw, y); g.quadraticCurveTo(0, c, hw, y); g.stroke();
      g.strokeStyle = rgba('#fff4e0', 0.05 + 0.1 * lit); g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(-hw, y - 1.2); g.quadraticCurveTo(0, c - 1.2, hw, y - 1.2); g.stroke();
    }
    for (let m = -3; m <= 3; m++) {
      const phi = (m * Math.PI) / 7 + turn, cf = Math.cos(phi);
      if (cf < 0.15) continue;
      g.strokeStyle = rgba(edge, 0.1 * cf); g.lineWidth = 1;
      g.beginPath();
      for (let s = 0; s <= 10; s++) { const v = -0.9 + s * 0.18, x = hwAt(W / 2, v) * Math.sin(phi), y = yc + (v * Hb) / 2; if (s) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
    // soft rim light along the paper's left contour
    g.strokeStyle = gRim; g.lineWidth = 1.4; g.globalAlpha = 0.5 + 0.4 * lit; g.stroke(bodyPath); g.globalAlpha = 1;
    // ---- the person's words, inked on the paper
    if (E.phase !== 'law') {
      const fs = Math.max(12, Hb * 0.1), lh = fs * 1.2;
      let lines, wy, mw;
      if (heroPh >= 0) {
        lines = Hb >= 96 ? 2 : 1;
        wy = Math.min(yc + Hb * (lines > 1 ? 0.28 : 0.22), Hb * 1.06 - (lines * lh) / 2 - 2);
        mw = hwAt(W / 2, (wy - yc) / (Hb / 2)) * (lines > 1 ? 1.8 : 1.86);
      } else { lines = Hb >= 90 ? 3 : 2; wy = yc + Hb * 0.02; mw = W * 0.7; }
      glow(g, wx * 0.7, wy, W * 0.42, '#fff3d6', 0.16 * lit * glowK);
      g.save(); g.translate(wx * 0.7, wy); g.scale(lerp(1, cT, 0.6), 1);
      words.draw(g, 0, 0, { style: 'ink', size: fs, maxWidth: mw, lines, colour: INK, alpha: 0.92 });
      g.restore();
    }
    // ---- caps, cord and brass ring
    g.fillStyle = gCapT; roundRect(g, -W * 0.22, Hb * 0.085, W * 0.44, Hb * 0.08, Hb * 0.022); g.fill();
    g.fillStyle = gCapB; roundRect(g, -W * 0.25, Hb * 1.075, W * 0.5, Hb * 0.08, Hb * 0.022); g.fill();
    // the base invites a touch (breathing softly until the first lift) and glows under a held finger
    if (!seated && finAt < 0) {
      const invite = drag != null ? 0.55 : (0.22 + 0.14 * Math.sin(t * 2)) * (1 - smooth(real * 5));
      if (invite > 0.01) glow(g, 0, Hb * 1.12, W * (drag != null ? 0.42 : 0.34), '#fff1d0', invite * glowK);
    }
    g.strokeStyle = rgba('#efc372', 0.8); g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(-W * 0.21, Hb * 0.163); g.lineTo(W * 0.21, Hb * 0.163); g.moveTo(-W * 0.24, Hb * 1.077); g.lineTo(W * 0.24, Hb * 1.077); g.stroke();
    g.fillStyle = 'rgba(255,220,180,0.22)'; g.fillRect(-W * 0.16, Hb * 0.095, W * 0.22, Hb * 0.016);
    g.strokeStyle = '#2a120c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, Hb * 0.04); g.lineTo(0, Hb * 0.088); g.stroke();
    const rr = Math.max(3.2, Hb * 0.042);
    g.strokeStyle = '#8a5a22'; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke();
    g.strokeStyle = '#ffdc96'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, rr, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    g.restore();
    // ---- big silk tassel (no small lanterns)
    if (!K) {
      toWorld(0, Hb * 1.155);
      const ax = tmpX, ay = tmpY, bxx = bx[1], byy = by[1];
      const ta = Math.atan2(byy - ay, bxx - ax);
      g.save(); g.lineCap = 'round';
      g.strokeStyle = silk; g.lineWidth = 1.8; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bxx, byy); g.stroke();
      const L = Hb * 0.34, c = Math.cos(ta), s = Math.sin(ta);
      for (let i = -4; i <= 4; i++) {
        const spread = i * 0.035, ex = bxx + Math.cos(ta + spread) * L * (1 - Math.abs(i) * 0.03), ey = byy + Math.sin(ta + spread) * L * (1 - Math.abs(i) * 0.03);
        g.strokeStyle = rgba(i % 2 ? mix(silk, '#ffffff', 0.25) : silk, 0.92); g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(bxx + c * 4, byy + s * 4); g.quadraticCurveTo(bxx + c * L * 0.5 - s * i * 1.2, byy + s * L * 0.5 + c * i * 1.2, ex, ey); g.stroke();
      }
      g.fillStyle = '#e9b866'; g.beginPath(); g.ellipse(bxx + c * 5, byy + s * 5, 4.2 * Math.max(0.7, U), 2.6 * Math.max(0.7, U), ta, 0, TAU); g.fill();
      g.restore();
      orb(g, bxx, byy, Math.max(2.4, Hb * 0.032), silk);
    }
    void fin;
  }

  function drawSocket(t, seatK, fin) {
    const wy = wireAt(xS), cupY = y1 - Math.max(9, Hb * 0.1), cw = Math.max(11, W * 0.13);
    g.save(); g.lineCap = 'round';
    // clamp on the wire + stem
    g.strokeStyle = '#7a4c1c'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(xS, wy); g.lineTo(xS, cupY); g.stroke();
    g.strokeStyle = 'rgba(255,224,160,0.6)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(xS - 0.8, wy); g.lineTo(xS - 0.8, cupY); g.stroke();
    orb(g, xS, wy, 3.4 * Math.max(0.8, U), '#c98e3a');
    // the cup (a little brass bell) with its lamp
    const lamp = seated ? 0.5 + 0.5 * seatK : 0.3 + 0.18 * Math.sin(t * 2.1);
    glow(g, xS, cupY + cw * 0.3, cw * (2.4 + 2 * seatK + fin), flame, lamp * 0.7 * glowK);
    g.fillStyle = gCup;
    g.beginPath(); g.moveTo(xS - cw * 0.35, cupY - cw * 0.5); g.lineTo(xS + cw * 0.35, cupY - cw * 0.5);
    g.quadraticCurveTo(xS + cw * 0.95, cupY + cw * 0.1, xS + cw, cupY + cw * 0.5); g.lineTo(xS - cw, cupY + cw * 0.5);
    g.quadraticCurveTo(xS - cw * 0.95, cupY + cw * 0.1, xS - cw * 0.35, cupY - cw * 0.5); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,240,200,0.5)'; g.lineWidth = 0.8; g.stroke();
    // the hook (an open J) and its latch that closes on arrival
    const hy = y1 + Math.max(2, Hb * 0.02), hr = Math.max(4, Hb * 0.05);
    g.strokeStyle = '#d9a650'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(xS, cupY + cw * 0.5); g.lineTo(xS, hy - hr); g.arc(xS + hr * side, hy - hr * 0.2, hr, Math.PI, side > 0 ? Math.PI * 0.05 : Math.PI * 1.95, side < 0); g.stroke();
    const latch = lerp(0.95, 0, seatK);
    g.strokeStyle = rgba('#ffe2a0', 0.9); g.lineWidth = 1.4;
    const lx0 = xS + hr * 2 * side * 0.98, ly0 = hy - hr * 0.2;
    g.beginPath(); g.moveTo(lx0, ly0); g.lineTo(lx0 - side * Math.cos(latch) * hr * 1.7, ly0 - Math.sin(latch + 0.5) * hr * 1.4); g.stroke();
    g.restore();
    if (seatK > 0 && seatK < 1) glint(g, xS, y1, 12 * (1 - seatK) + 4, '#fff6dc', (1 - seatK) * 0.8);
  }

  // ---- plot twist: a small paper moth circles the lantern and perches on the socket
  function drawTwist(t, now) {
    if (twistAt < 0 || twistKind !== 'moth') return;
    const k = now - twistAt;
    toWorld(0, Hb * 0.62);
    const cx = tmpX, cy = tmpY, oR = W * 0.78, oRy = Hb * 0.55, from = -side;
    const a0 = from > 0 ? 0 : Math.PI;
    const ox = (a) => cx + Math.cos(a) * oR, oy = (a) => cy + Math.sin(a) * oRy;
    let x, y, flap;
    const perchX = xS - side * Math.max(9, W * 0.1), perchY = y1 - Math.max(9, Hb * 0.1) - Math.max(11, W * 0.13) * 0.5 - 3;
    if (k < 1.6) {
      const u = ease.inOutSine(k / 1.6), sx = from > 0 ? stage.x + stage.w + 20 : stage.x - 20, sy = cy - Hb * 0.4;
      x = lerp(sx, ox(a0), u); y = lerp(sy, oy(a0), u) + Math.sin(k * 5) * 6; flap = 1;
    } else if (k < 4.2) {
      const a = a0 + ((k - 1.6) / 2.6) * TAU * (from > 0 ? -1 : 1);
      x = ox(a); y = oy(a) + Math.sin(k * 4) * 3; flap = 1;
    } else if (k < 5.6) {
      const u = ease.inOutSine((k - 4.2) / 1.4);
      x = lerp(ox(a0), perchX, u); y = lerp(oy(a0), perchY, u) - Math.sin(u * Math.PI) * Hb * 0.4; flap = 1;
    } else { x = perchX; y = perchY; flap = 0; }
    const s = 9 * Math.max(0.8, U);
    const w = flap ? 0.35 + 0.65 * Math.abs(Math.sin(t * (reduced ? 4 : 9))) : 0.75 + 0.2 * Math.sin(t * 1.1);
    glow(g, x, y, s * 3.4, '#fff1d0', 0.5 * glowK);
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(255,246,226,0.9)';
    for (const sx of [-1, 1]) {
      g.beginPath(); g.ellipse(sx * s * 0.62 * w, -s * 0.18, s * 0.66 * w, s * 0.5, sx * 0.5, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(sx * s * 0.45 * w, s * 0.36, s * 0.42 * w, s * 0.32, -sx * 0.4, 0, TAU); g.fill();
    }
    g.fillStyle = mix(pal.accent, '#ffffff', 0.4);
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * s * 0.6 * w, -s * 0.2, s * 0.14, 0, TAU); g.fill(); }
    g.fillStyle = '#5a3a2a'; g.beginPath(); g.ellipse(0, s * 0.05, s * 0.12, s * 0.5, 0, 0, TAU); g.fill();
    g.restore();
  }

  // -------------------------------------------------------------- input --
  function onLantern(p) {
    const dx = Math.abs(p.x - RX), dy = p.y - RY;
    return dx <= wPad && dy >= -Hb * 0.25 && dy <= D + 24;
  }
  return {
    get progress() { return real; },
    get done() { return seated && E.now() - seatAt > 0.75 && drag == null; },
    frame,
    down(p) {
      if (finAt >= 0 || drag != null) return;
      if (!onLantern(p)) {
        // a touch in the air: the breeze carries a few motes from your fingertip
        if (!reduced) for (let i = 0; i < 3; i++) E.particles.emit({ x: p.x, y: p.y, vx: side * (20 + rand() * 30), vy: -10 - rand() * 14, life: 1, size: 4, colour: ribbonCol, alpha: 0.6 });
        return;
      }
      if (seated) { flare = 1; bvx[0] += side * 90; E.sound('paper', { intensity: 0.25 }); E.haptic('light'); return; }
      drag = p.id; dragY = p.y; dragX0 = p.x; moved = 0; speed = 0; lean = 0;
      flare = 1;
      E.sound('paper', { intensity: 0.35 }); E.haptic('light');
    },
    move(p) {
      if (p.id !== drag) return;
      const dy = dragY - p.y; dragY = p.y; moved += Math.abs(dy);
      // rushing makes the paper drag behind; pulling down is resisted (it is buoyant)
      const k = dy > 0 ? lerp(1, 0.42, invLerp(700, 2200, speed)) : 0.5;
      if (Math.abs(dy) > 0.01) wanted = clamp(wanted + (dy * k) / travel, 0, 1);
      if (wanted > real + BANK) wanted = real + BANK;
      lean = clamp((p.x - dragX0) * 0.8, -W * 0.35, W * 0.35);
      if (E.locked && dy > 0 && wanted >= real + BANK - 0.008) {
        const now = E.now();
        if (now - lastWaitAt > 0.7) { lastWaitAt = now; wob.kick(0.55); E.checkpoint('wait'); }
      }
      const now = E.now();
      if (now - lastLook > 0.35) { lastLook = now; E.look?.(RX, RY + Hb * 0.6); }
    },
    up(p) {
      if (p.id !== drag) return;
      drag = null; lean = 0;
      if (real < 0.999) E.sound('settle', { intensity: 0.18 });
    },
    assist() {
      if (finAt >= 0 || seated) return;
      assistTo = Math.min(1, Math.max(assistTo ?? 0, wanted, real) + ASSIST_STEP);
      flare = 1; bvx[0] += (rand() - 0.5) * 60;
    },
    pointAt(p) { return basePt(p); },
    hint() {
      if (seated || finAt >= 0) return null;
      const a = clamp(sp), b = Math.min(1, Math.max(real, a) + 0.28);
      const pts = [];
      if (b <= a + 0.02) { const q = basePt(a); return { path: [[q.x, q.y], [q.x, q.y - 14], [q.x, q.y - 28]] }; }
      for (let i = 0; i <= 12; i++) { const q = basePt(lerp(a, b, i / 12)); pts.push([q.x, q.y]); }
      return { path: pts };
    },
    twist() { twistAt = E.now(); if (twistKind === 'breath') E.sound('shimmer', { intensity: 0.25 }); },
    finish() {
      finAt = E.now();
      if (!seated) { seated = true; seatAt = finAt - 1; seatChimed = true; }
      for (let j = 0; j < K; j++) if (kinAt[j] < 0) { kinAt[j] = finAt; kindled[j] = 1; }
      if (!heavy) E.sound('bloom', { intensity: 0.3 });
    },
    destroy() {},
  };
}
