// GE-06 · REVERSE HOURGLASS — gravity hourglass (vertical gravity slide).
// The hourglass has just run out: its last grains trickle down into the
// lower chamber. Touch the glowing ring at its waist and slide it up the
// glass — gravity inside turns over, every grain slows, hangs and rises
// back through the neck in a slow fountain. Then lower the ring: the pull
// softens, the grains slow and settle against the dome of the top (resting)
// chamber. Win: the last grain reaches the resting chamber and rests.
//
// Photos: the grains carry the hero photo's colours; as they settle they
// softly assemble into the photo (a reversed dissolve, top first). The other
// photos are small framed sand-pictures set into the base, each one clearing
// from soft warm sand into focus as the grains come to rest. The person's
// words are engraved on the brass plate of the base and fill with light.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, noise2, roundRect, shadow, motes, halo, orb } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-06',
  howTo: 'Slide the glowing waist ring up to reverse the sand, then lower it.',
  steps: ['Touch the glowing ring at the hourglass’s waist.', 'Slide it up slowly — the falling grains turn and rise.', 'Then lower it so the grains slow and settle in the top chamber.'],
  tapAlt: 'each press slides the waist ring one gentle notch',
  words: 'Your words are engraved on the hourglass’s brass plate and fill with light as the sand settles.',
  photos: {
    where: 'Your first photo waits in the hourglass’s top chamber; the others are small sand-pictures set into the base.',
    becomes: 'coloured grains of sand',
    touch: 'You lift the grains with the waist ring;',
    change: 'they rise, settle and softly assemble back into your photo, and each sand-picture on the base clears into focus.',
    payoff: 'At the end your photo rests whole in the top chamber, glowing like a lamp.',
  },
  finaleSec: 4,
};

const P_TOP = 0.55;              // share of the path spent sliding the ring up
const S_REV = 0.13;              // ring height where gravity turns over
const S_END = 0.16;              // where the ring rests once lowered
const REL0 = 0.08, REL1 = 0.9;   // progress window over which grains are freed
const CAP = 0.03;                // banked input beyond what the law allows
const DRAG = 2.4;                // air drag on a flying grain (1/s)
const PILE = 0, FLY = 1, REST = 2;
const DASH = [2, 6];

function hexGrid(cx, x0, x1, y0, y1, sp, test) {
  const out = [], dy = sp * 0.866;
  const left = cx - Math.ceil((cx - x0) / sp) * sp;
  for (let y = y0, row = 0; y <= y1; y += dy, row++) {
    for (let x = left + (row % 2 ? sp / 2 : 0); x <= x1; x += sp) if (test(x, y)) out.push([x, y]);
  }
  return out;
}

export function create(E) {
  const { g, stage, photos, words } = E;
  const pal = E.pal || {};
  const reduced = E.reduced, low = E.lowStim || E.reduced;
  const nz = noise2(E.seed + 61);
  const glowC = pal.glow || '#ffd98a', warmC = pal.warm || '#ffb37a', accC = pal.accent || '#ff9ad5';
  const skyC = pal.sky || '#6a5acd', deepC = pal.deep || '#160c2e';
  const agit0 = (1 - E.calm) * (E.heavy ? 0.55 : 1);

  // ---- photos: the hero assembles in the dome, the rest are sand-pictures on the base
  const n = photos.n;
  const hero = n ? (E.round - 1) % n : -1;
  const exIdx = [];
  for (let i = 0; i < n; i++) if (i !== hero) exIdx.push(i);
  if (E.round > 1) for (let i = exIdx.length - 1; i > 0; i--) { const j = Math.floor(E.rand() * (i + 1)); const k = exIdx[i]; exIdx[i] = exIdx[j]; exIdx[j] = k; }
  if (exIdx.length > 6) exIdx.length = 6;
  const M = exIdx.length;
  const heroAspect = hero >= 0 ? (photos.list?.[hero]?.aspect || 1) : 1;

  // ---- colours (realm palette; loop rounds vary the ring and the sand bands)
  const ringChoices = [mix(glowC, '#ffffff', 0.28), mix(accC, '#ffffff', 0.4), mix(warmC, '#ffffff', 0.35)];
  const ringCol = E.round === 1 ? ringChoices[0] : ringChoices[Math.floor(E.rand() * 3)];
  const edgeC = mix(ringCol, '#ffffff', 0.35);
  const brassHi = mix('#f6d9a2', warmC, 0.22), brass = mix('#b8864a', warmC, 0.18), brassLo = mix('#3e240f', deepC, 0.35);
  const wood = mix('#5b3621', deepC, 0.22), woodHi = mix('#b07a4e', warmC, 0.22), woodLo = mix('#1b0e08', deepC, 0.45);
  const glassTint = mix(skyC, '#ffffff', 0.35);
  const sandPal = [mix(warmC, '#ffe6b8', 0.35), mix(warmC, glowC, 0.5), mix(glowC, '#ffffff', 0.2), mix(accC, warmC, 0.45),
    mix(warmC, '#fff4dc', 0.6), mix(accC, '#ffffff', 0.3), mix(warmC, deepC, 0.22)].map((c) => (E.heavy || E.calm > 0.2 ? mix(c, skyC, 0.12 + E.calm * 0.15) : c));
  const palShift = E.round === 1 ? 0 : Math.floor(E.rand() * 7);

  // ---- grains (typed arrays; no per-frame allocation)
  const N = Math.round((low ? 120 : 200) * (1 - E.calm * 0.2));
  const Sx = new Float32Array(N), Sy = new Float32Array(N), Tx = new Float32Array(N), Ty = new Float32Array(N);
  const LA = new Float32Array(N), LB = new Float32Array(N);
  const d = new Float32Array(N), v = new Float32Array(N), age = new Float32Array(N), el = new Float32Array(N);
  const st = new Uint8Array(N);
  const m = new Float32Array(N), ph = new Float32Array(N), fq = new Float32Array(N), jit = new Float32Array(N), relAt = new Float32Array(N);
  const col = new Array(N).fill('#ffd98a');
  for (let i = 0; i < N; i++) {
    m[i] = 0.82 + E.rand() * 0.36; ph[i] = E.rand() * TAU; fq[i] = 1.5 + E.rand() * 1.8; jit[i] = E.rand() * 0.22;
    relAt[i] = REL0 + (REL1 - REL0) * (i / Math.max(1, N - 1));
  }
  let bCol = [], members = [];
  const twinkle = Array.from({ length: low ? 6 : 12 }, () => Math.floor(E.rand() * N));

  // ---- extras (sand-pictures on the base)
  const extras = exIdx.map((idx, j) => ({ idx, j, on: false, c: 0, flash: 0, th: 0,
    dots: Array.from({ length: low ? 10 : 16 }, () => { const u = 0.08 + E.rand() * 0.84, vv = 0.08 + E.rand() * 0.84; return { u, v: vv, r: 0.6 + E.rand() * 0.8, c: photos.sampleColour(idx, u, vv) }; }) }));
  { // they clear from the centre outwards, spread across the settling
    const order = extras.slice().sort((a, b) => Math.abs(a.j - (M - 1) / 2) - Math.abs(b.j - (M - 1) / 2) || a.j - b.j);
    order.forEach((ex, k) => { ex.th = (k + 1) / (M + 1); });
  }

  // ---- geometry
  let sc, tc, hp, gap, fs, ps, hf, Hu, Wh, neckHW, rxC, ryC, rx1, ry1, rx2, ry2;
  let cx, yTopC, glassTop, yNeck, glassBot, yBotC, yP, yF, plateY, plateW, plateH, exY;
  let trackTop, trackLen, K, domeY, domeR, gr;
  let bulb, bulbL, specL, specR;
  let gGlass, gPileShade, gBandC, gFaceT, gFaceB, gBand1, gFace1, gBand2, gFace2, gPillar, gFrame, gPlate;
  const exX = new Float32Array(Math.max(1, M));
  let oldL = null;

  function hwAt(y) {
    if (y < glassTop || y > glassBot) return 0;
    const u = Math.abs(y - yNeck) / Hu;               // 0 at the neck, 1 at a cap
    const a = Math.pow(Math.sin((Math.PI / 2) * clamp((u - 0.03) / 0.6)), 1.25);
    const b = u > 0.72 ? 1 - 0.3 * ((u - 0.72) / 0.28) ** 2 : 1;
    return neckHW + (Wh - neckHW) * a * b;
  }
  const sOf = (p) => (p <= P_TOP ? p / P_TOP : 1 - (1 - S_END) * ((p - P_TOP) / (1 - P_TOP)));
  const ringY = (p) => yNeck - sOf(p) * trackLen;
  const ringHW = (y) => Math.max(hwAt(y) + 5 * sc, 15 * sc);
  function gravAt(p) {
    const s = sOf(p);
    if (p <= P_TOP) return s < S_REV ? -260 * (1 - E.calm * 0.4) * (1 - s / S_REV) : 1100 * Math.pow((s - S_REV) / (1 - S_REV), 0.85);
    return lerp(330, 1100, (s - S_END) / (1 - S_END));
  }

  function fit() {
    sc = stage.s; cx = stage.cx;
    tc = 12 * sc; gap = 6 * sc;
    const tight = stage.h < 420;
    hp = tight ? Math.max(34, 36 * sc) : Math.max(38, 42 * sc);
    fs = M ? clamp(Math.min((tight ? 48 : 58) * sc, (stage.w * 0.95 - (M - 1) * gap) / Math.max(M, 4)), 36, 64) : 0;
    hf = M ? fs + 14 * sc : 0;
    const wEst = stage.w * 0.3;
    ryC = (wEst + 20 * sc) * 0.16;
    rx2 = stage.w * 0.48; ry2 = rx2 * 0.1;
    const rx1e = Math.min(stage.w * 0.45, wEst + 58 * sc), ry1e = rx1e * 0.12;
    const fixed = 10 + 1.55 * ryC + 2 * tc + hp + (M ? hf + ry2 : ry1e);
    Hu = Math.max(50, (stage.h - fixed) / 2);
    Wh = Math.min(Hu * 0.6, stage.w * 0.3);
    Hu = Math.min(Hu, Wh * 2.05);
    neckHW = Math.max(2.5, Wh * 0.045);
    rxC = Wh + 20 * sc; rx1 = Math.min(stage.w * 0.45, Wh + 58 * sc); ry1 = rx1 * 0.12;
    const used = fixed + 2 * Hu, off = Math.max(0, (stage.h - used) / 2);
    yTopC = stage.y + off + 4 + ryC;
    glassTop = yTopC + tc + ryC * 0.55;
    yNeck = glassTop + Hu; glassBot = yNeck + Hu;
    yBotC = glassBot - ryC * 0.35;
    yP = yBotC + tc; yF = yP + hp;
    plateW = Math.min(rx1 * 2 - 26 * sc, 250 * sc); plateH = hp - 12 * sc; plateY = yP + ry1 + hp / 2;
    ps = fs - 9 * sc; exY = yF + ry2 + hf / 2;
    for (let j = 0; j < M; j++) exX[j] = cx + (j - (M - 1) / 2) * (fs + gap);
    trackTop = glassTop + Hu * 0.1; trackLen = yNeck - trackTop;
    K = Hu / 190;

    // the dome picture: a large circle, seen through the top chamber's own glass
    domeR = Math.min(Wh * 0.92, Hu * 0.47); domeY = glassTop + Hu * 0.06 + domeR;

    // glass outline (Path2D, cached)
    const SEG = 44;
    bulb = new Path2D(); bulbL = new Path2D(); specL = new Path2D(); specR = new Path2D();
    const capHW = hwAt(glassTop + 0.01), botHW = hwAt(glassBot - 0.01);
    bulb.moveTo(cx - capHW, glassTop);
    bulb.ellipse(cx, glassTop, capHW, ryC * 0.5, 0, Math.PI, 0, false);
    for (let k = 0; k <= SEG * 2; k++) { const y = glassTop + (2 * Hu * k) / (SEG * 2); bulb.lineTo(cx + hwAt(y), y); }
    bulb.ellipse(cx, glassBot, botHW, ryC * 0.4, 0, 0, Math.PI, false);
    for (let k = SEG * 2; k >= 0; k--) { const y = glassTop + (2 * Hu * k) / (SEG * 2); bulb.lineTo(cx - hwAt(y), y); }
    bulb.closePath();
    bulbL.moveTo(cx - neckHW, yNeck);
    for (let k = 0; k <= SEG; k++) { const y = yNeck + (Hu * k) / SEG; bulbL.lineTo(cx + hwAt(y), y); }
    bulbL.ellipse(cx, glassBot, botHW, ryC * 0.4, 0, 0, Math.PI, false);
    for (let k = SEG; k >= 0; k--) { const y = yNeck + (Hu * k) / SEG; bulbL.lineTo(cx - hwAt(y), y); }
    bulbL.closePath();
    for (const [a, b] of [[glassTop + Hu * 0.1, yNeck - Hu * 0.3], [yNeck + Hu * 0.3, glassBot - Hu * 0.08]]) {
      for (let k = 0; k <= 16; k++) { const y = a + ((b - a) * k) / 16; const x = cx - hwAt(y) * 0.7; if (k) specL.lineTo(x, y); else specL.moveTo(x, y); }
      for (let k = 0; k <= 16; k++) { const y = a + ((b - a) * k) / 16; const x = cx + hwAt(y) * 0.86; if (k) specR.lineTo(x, y); else specR.moveTo(x, y); }
    }

    // cached gradients
    gGlass = g.createLinearGradient(cx - Wh, 0, cx + Wh, 0);
    gGlass.addColorStop(0, rgba(glassTint, 0.2)); gGlass.addColorStop(0.28, rgba(glassTint, 0.06)); gGlass.addColorStop(0.62, rgba(glassTint, 0.03)); gGlass.addColorStop(1, rgba(glassTint, 0.17));
    gPileShade = g.createLinearGradient(0, yNeck + Hu * 0.25, 0, glassBot);
    gPileShade.addColorStop(0, rgba(deepC, 0)); gPileShade.addColorStop(1, rgba(deepC, 0.34));
    const band = (rx) => { const b = g.createLinearGradient(cx - rx, 0, cx + rx, 0); b.addColorStop(0, woodLo); b.addColorStop(0.3, woodHi); b.addColorStop(0.55, wood); b.addColorStop(1, woodLo); return b; };
    const face = (y, rx, ry) => { const f = g.createRadialGradient(cx - rx * 0.25, y - ry * 0.5, rx * 0.05, cx, y, rx); f.addColorStop(0, mix(woodHi, '#ffffff', 0.12)); f.addColorStop(0.6, wood); f.addColorStop(1, woodLo); return f; };
    gBandC = band(rxC); gFaceT = face(yTopC, rxC, ryC); gFaceB = face(yBotC, rxC, ryC);
    gBand1 = band(rx1); gFace1 = face(yP, rx1, ry1);
    gBand2 = band(rx2); gFace2 = face(yF, rx2, ry2);
    gPillar = g.createLinearGradient(-3.5 * sc, 0, 3.5 * sc, 0);
    gPillar.addColorStop(0, brassLo); gPillar.addColorStop(0.35, brassHi); gPillar.addColorStop(0.7, brass); gPillar.addColorStop(1, brassLo);
    gFrame = g.createLinearGradient(0, exY - fs / 2, 0, exY + fs / 2);
    gFrame.addColorStop(0, brassHi); gFrame.addColorStop(0.45, brass); gFrame.addColorStop(1, brassLo);
    gPlate = g.createLinearGradient(0, plateY - plateH / 2, 0, plateY + plateH / 2);
    gPlate.addColorStop(0, mix(brassLo, '#000000', 0.15)); gPlate.addColorStop(0.5, mix(brassLo, brass, 0.25)); gPlate.addColorStop(1, mix(brassLo, '#000000', 0.3));

    // ---- grain slots: resting dome (top first) and the lower pile (a cone, drained from the centre)
    let sp = Math.sqrt((Math.PI * domeR * domeR * 0.8) / (N * 0.866));
    let dome = [];
    const domeLow = yNeck - Hu * 0.16;
    for (let it = 0; it < 40; it++) {
      const rr = domeR - sp * 0.4;
      dome = hexGrid(cx, cx - domeR, cx + domeR, domeY - domeR + sp * 0.4, domeLow, sp, (x, y) => (x - cx) ** 2 + (y - domeY) ** 2 <= rr * rr && Math.abs(x - cx) <= hwAt(y) - sp * 0.55);
      if (dome.length >= N) break;
      sp *= 0.97;
    }
    const dTop = domeY - domeR;
    dome.sort((a, b) => (a[1] - dTop - 0.12 * (domeR - Math.abs(a[0] - cx))) - (b[1] - dTop - 0.12 * (domeR - Math.abs(b[0] - cx))));
    let spP = sp, pile = [];
    for (let it = 0; it < 40; it++) {
      pile = hexGrid(cx, cx - Wh, cx + Wh, yNeck + Hu * 0.22, glassBot - spP * 0.45, spP, (x, y) => Math.abs(x - cx) <= hwAt(y) - spP * 0.5);
      if (pile.length >= N) break;
      spP *= 0.96;
    }
    const hq = (p) => glassBot - p[1];
    pile.sort((a, b) => (hq(a) - 0.5 * (Wh - Math.abs(a[0] - cx))) - (hq(b) - 0.5 * (Wh - Math.abs(b[0] - cx))));
    pile.length = Math.min(pile.length, N);
    pile.sort((a, b) => (hq(b) + 0.6 * (Wh - Math.abs(b[0] - cx))) - (hq(a) + 0.6 * (Wh - Math.abs(a[0] - cx))));
    gr = Math.min(sp, spP) * 0.52;
    const map = new Map(); bCol = []; members = [];
    for (let i = 0; i < N; i++) {
      const P = pile[Math.min(i, pile.length - 1)] || [cx, glassBot - 6], T = dome[Math.min(i, dome.length - 1)] || [cx, domeY];
      Sx[i] = P[0]; Sy[i] = P[1]; Tx[i] = T[0]; Ty[i] = T[1];
      const la = Math.hypot(Sx[i] - cx, Sy[i] - yNeck) * 1.06, lb = Math.hypot(Tx[i] - cx, Ty[i] - yNeck) * 1.04;
      if (oldL) { const r = (la + lb) / Math.max(1, oldL[i]); d[i] *= r; }
      LA[i] = la; LB[i] = lb;
      // colour: the photo's own colour at the grain's place in the picture
      const u = (Tx[i] - (cx - domeR)) / (2 * domeR), vv = (Ty[i] - dTop) / (2 * domeR);
      let c;
      if (hero >= 0) {
        const pu = heroAspect > 1 ? 0.5 + (u - 0.5) / heroAspect : u, pv = heroAspect < 1 ? 0.5 + (vv - 0.5) * heroAspect : vv;
        c = photos.sampleColour(hero, clamp(pu), clamp(pv));
      } else {
        const band2 = Math.floor(clamp(vv * 4.4 + nz(u * 2.4, vv * 2.4) * 1.1 + 0.4, 0, 6.99));
        c = sandPal[(band2 + palShift) % 7];
      }
      col[i] = c;
      let b = map.get(c);
      if (b == null) { b = bCol.length; map.set(c, b); bCol.push(c); members.push([]); }
      members[b].push(i);
    }
    oldL = Array.from({ length: N }, (_, i) => LA[i] + LB[i]);
  }
  fit();
  E.onResize(fit);

  // ---- the hourglass has just run out: its last grains are still falling
  const trickle = Math.max(6, Math.round(N * (0.07 - E.calm * 0.03)));
  for (let i = 0; i < trickle; i++) {
    const k = (i + 0.5) / trickle;
    st[i] = FLY; d[i] = lerp(LA[i] * 0.15, LA[i] + LB[i] * 0.85, k); v[i] = -40 - E.rand() * 30;
  }

  // ---- state
  let wanted = 0, rot = 0, shown = 0, assistTo = null, topped = false, doneFlag = false;
  let drag = null, lastY = 0, lastT = 0, rush = 0, lastInput = -10, grabGlow = 0;
  let restCount = 0, revealShown = 0, fillY = domeY - domeR, flying = 0, reversed = false, revAt = -10;
  let lastNoteP = 0, lastNoteT = 0, lastHapT = 0, lastSetT = 0, setNote = 0, lastWaitT = -10, heroSeen = false, heroWhole = false;
  let finAt = -1, twistAt = -1, hum = null, topHinted = false, lastEdgeT = 0;
  const wob = new Wobble();
  const P = { x: 0, y: 0 };
  let pose = ringPose(0, 0);

  function settled(i, t) {
    restCount++;
    if (Ty[i] > fillY - gr) fillY = Math.max(fillY, Ty[i] + gr);
    if (t - lastSetT > 0.12) { lastSetT = t; E.sound('drip', { note: (setNote++ % 5) + 4, intensity: E.heavy ? 0.08 : 0.12, pan: (Tx[i] - cx) / Math.max(1, domeR) * 0.4 }); }
    if (!heroSeen) { heroSeen = true; if (hero >= 0) E.checkpoint('photo', hero); E.react('nod'); }
    if (!reduced && E.rand() < 0.12) E.particles.emit({ x: Tx[i], y: Ty[i], vx: (E.rand() - 0.5) * 20, vy: -12, life: 0.8, size: 4, colour: '#fff4dc', kind: 'glint' });
  }
  function onTop() {
    E.sound('chime', { intensity: 0.32 }); E.haptic('soft'); E.react('nod');
    E.ripples.add(cx, ringY(P_TOP), { colour: ringCol, speed: 50, alpha: 0.35, r: hwAt(ringY(P_TOP)) });
    if (!topHinted) { topHinted = true; E.hint('Now lower the ring slowly — let the grains settle.'); }
  }

  let lastBumpT = -10;
  function bump() { const now = E.now(); if (now - lastBumpT > 0.5) { lastBumpT = now; wob.kick(-0.25); E.haptic('tick'); } }
  function applyInput(dy, dt) {
    const speed = Math.abs(dy) / dt;
    const k = lerp(1, 0.35, invLerp(520, 1500, speed));          // rushing → the ring drags
    rush = lerp(rush, invLerp(500, 1300, speed), 0.25);
    let w = wanted;
    if (rot < P_TOP - 1e-4) { w += (-dy / trackLen) * P_TOP * k; w = clamp(w, 0, P_TOP); if (dy < 0 && w >= P_TOP && wanted >= P_TOP - 1e-4) bump(); }
    else { w += (dy / (trackLen * (1 - S_END))) * (1 - P_TOP) * k; w = clamp(w, P_TOP, 1); if (dy < 0 && w <= P_TOP + 1e-4) bump(); }
    wanted = Math.min(w, rot + CAP);
  }

  // ---------------------------------------------------------------- frame --
  function frame(dt, t) {
    if (assistTo != null) { const step = Math.min(assistTo - wanted, dt * 0.3); wanted = Math.min(1, wanted + Math.max(0, step)); if (assistTo - wanted < 1e-3) assistTo = null; }
    rot = E.gate(wanted);
    if (wanted > rot + CAP) wanted = rot + CAP;
    if (!topped && rot >= P_TOP - 1e-4) { topped = true; onTop(); }
    shown = lerp(shown, rot, 1 - Math.exp(-dt * 12));
    if (Math.abs(shown - rot) < 1e-4) shown = rot;
    if (drag == null) rush = Math.max(0, rush - dt * 1.5);
    grabGlow = lerp(grabGlow, drag != null ? 1 : 0, 1 - Math.exp(-dt * 8));
    const s = sOf(shown);
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const tw = twistAt >= 0 ? Math.sin(Math.PI * clamp((t - twistAt) / 3.4)) : 0;
    const dtg = dt * (1 - 0.65 * tw);
    const gNow = gravAt(shown) * K * (E.heavy ? 0.9 : 1);
    const prog = clamp(shown);
    const agit = agit0 * (1 - smooth(prog) * 0.8);

    // gravity turning over
    if (gNow > 0 && !reversed) {
      reversed = true;
      if (t - revAt > 1.2) { revAt = t; E.sound('swish', { intensity: 0.3 }); E.haptic('soft'); E.react('gasp'); E.ripples.add(cx, yNeck, { colour: ringCol, speed: 40, alpha: 0.3, r: 8 }); }
    } else if (gNow <= 0 && reversed) reversed = false;

    // ring notes: a rising pentatonic line as the ring climbs, falling as it lowers
    if (Math.abs(shown - lastNoteP) > 0.03 && t - lastNoteT > 0.08) {
      lastNoteP = shown; lastNoteT = t;
      E.sound('pluck', { note: Math.round(s * 8) + 1, intensity: E.heavy ? 0.2 : 0.28 });
      if (t - lastHapT > 0.16) { lastHapT = t; E.haptic('tick'); }
    }

    // ---- grains
    flying = 0;
    for (let i = 0; i < N; i++) {
      const sti = st[i];
      if (sti === PILE) {
        if (rot >= relAt[i] && gNow > 0) { el[i] += dt; if (el[i] >= jit[i]) { st[i] = FLY; v[i] = 8; d[i] = 0.5; age[i] = 0; } }
        else el[i] = 0;
      } else if (sti === FLY) {
        flying++;
        age[i] += dtg;
        v[i] += (gNow * m[i] - DRAG * v[i]) * dtg;
        if (rot >= 0.999 && age[i] > 5) v[i] = Math.max(v[i], 90 * K);
        d[i] += v[i] * dtg;
        const L = LA[i] + LB[i];
        if (d[i] >= L) { d[i] = L; v[i] = 0; st[i] = REST; age[i] = 0; settled(i, t); }
        else if (d[i] <= 0 && v[i] < 0) { d[i] = 0; v[i] = 0; st[i] = PILE; age[i] = 0; el[i] = 0; }
      } else age[i] += dt;
    }
    // sustained sand hush while grains flow
    if (flying > 0 && !hum && E.hold && finAt < 0) hum = E.hold('drain', { intensity: 0.04 });
    if (hum) hum.update({ intensity: flying ? Math.min(0.15, 0.03 + flying / 260) * (E.heavy ? 0.7 : 1) : 0, pitch: 0.8 + 0.4 * s });
    if (!reduced && flying > 3 && E.rand() < (low ? 0.08 : 0.2)) E.particles.emit({ x: cx + (E.rand() - 0.5) * neckHW * 2, y: yNeck, vx: (E.rand() - 0.5) * 30, vy: gNow > 0 ? -40 : 30, life: 0.7, size: 4, colour: ringCol, kind: 'glint' });

    // the picture assembles behind the settled grains
    const tgt = restCount / N;
    revealShown = lerp(revealShown, fin > 0 ? 1 : tgt, 1 - Math.exp(-dt * 1.6));
    if (revealShown > 0.995 && tgt >= 1) revealShown = 1;
    if (!heroWhole && restCount >= N) { heroWhole = true; if (hero >= 0) E.checkpoint('photo', hero); }
    for (const ex of extras) {
      if (!ex.on && tgt >= ex.th) {
        ex.on = true; E.checkpoint('photo', ex.idx);
        photos.dust(ex.idx, exX[ex.j], exY, ps, low ? 6 : 12, { shape: 'round', up: 26, speed: 22 });
        E.sound('glass', { note: (ex.j % 5) + 3, intensity: 0.3 }); E.haptic('light');
      }
      if (ex.on) ex.c = Math.min(1, ex.c + dt / 1.4);
      ex.flash = ex.on ? Math.max(0, 1 - ex.c * 1.4) : 0;
    }
    if (hero >= 0 && revealShown > 0.02 && revealShown < 0.97 && t - lastEdgeT > 0.3 && !low) { lastEdgeT = t; photos.edgeDust(hero, cx, domeY, domeR * 2, 1 - revealShown, 2, { shape: 'circle', mode: 'up', up: 8, speed: 10 }); }

    if (!doneFlag && rot >= 0.999 && restCount >= N && drag == null && assistTo == null) { doneFlag = true; E.sound('settle', { intensity: 0.5 }); }

    // ---- drawing
    const reveal = smooth(revealShown);
    wob.update(Math.min(0.05, dt));
    pose = ringPose(fin, t);
    drawBackdrop(t, reveal, fin);
    drawBase(t, reveal, fin);
    drawRing(t, s, fin, false);
    g.fillStyle = gGlass; g.fill(bulb);
    drawDome(t, reveal, fin);
    drawPile(t);
    drawFlying(t, agit, tw);
    drawGlassFront(t, fin);
    drawRing(t, s, fin, true);
    drawPillars();
    drawCylinder(cx, yTopC, rxC, ryC, tc, gBandC, gFaceT);
    orb(g, cx, yTopC - ryC * 0.1, 5.5 * sc, brass, { light: brassHi });
    drawChevrons(t);
  }

  // ------------------------------------------------------------ drawing --
  function drawBackdrop(t, reveal, fin) {
    glow(g, cx, domeY, Wh * 2.3, glowC, 0.1 + 0.1 * reveal + fin * 0.12);
    glow(g, cx, glassBot - Hu * 0.3, Wh * 1.9, warmC, 0.07 * (1 - reveal * 0.6));
    halo(g, cx, domeY, Wh * 1.9, t, glowC, { rings: 4, alpha: 0.05 + 0.05 * fin, speed: reduced ? 0.015 : 0.04 });
    motes(g, stage.x, stage.y, stage.w, stage.h, reduced ? t * 0.3 : t, mix(glowC, '#ffffff', 0.4), { n: low ? 14 : 26, alpha: 0.22, seed: 7 + E.round, size: 1.6 });
  }
  function drawCylinder(x, y, rx, ry, h, band, face) {
    g.fillStyle = band; g.beginPath();
    g.moveTo(x + rx, y); g.lineTo(x + rx, y + h); g.ellipse(x, y + h, rx, ry, 0, 0, Math.PI, false); g.lineTo(x - rx, y);
    g.ellipse(x, y, rx, ry, 0, Math.PI, 0, true); g.closePath(); g.fill();
    g.fillStyle = face; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = rgba(brassHi, 0.38); g.lineWidth = 1;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI, false); g.stroke();
  }
  function drawBase(t, reveal, fin) {
    const bottom = M ? yF + hf + ry2 : yP + hp + ry1;
    shadow(g, cx, bottom + 2, (M ? rx2 : rx1) * 1.05, (M ? ry2 : ry1) * 1.4, 0.45);
    if (M) { drawCylinder(cx, yF, rx2, ry2, hf, gBand2, gFace2); drawFrames(t, fin); }
    drawCylinder(cx, yP, rx1, ry1, hp, gBand1, gFace1);
    // the brass word plate
    const px = cx - plateW / 2, py = plateY - plateH / 2;
    g.fillStyle = gPlate; roundRect(g, px, py, plateW, plateH, 8 * sc); g.fill();
    g.strokeStyle = rgba(brassHi, 0.7); g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = rgba('#000000', 0.35); g.lineWidth = 1; roundRect(g, px + 3, py + 3, plateW - 6, plateH - 6, 6 * sc); g.stroke();
    orb(g, px + 8 * sc, plateY, 2.4 * sc, brass, { light: brassHi }); orb(g, px + plateW - 8 * sc, plateY, 2.4 * sc, brass, { light: brassHi });
    if (E.phase !== 'law') {
      const lit = clamp(reveal * 0.85 + fin * 0.3);
      const size = Math.max(12.5, 13 * sc);
      words.draw(g, cx, plateY, { style: 'etched', size, maxWidth: plateW - 28 * sc, lines: 2, colour: mix('#f2d9ab', '#fff6e2', lit), alpha: 1 - lit * 0.5 });
      if (lit > 0.02) words.draw(g, cx, plateY, { style: 'light', size, maxWidth: plateW - 28 * sc, lines: 2, alpha: lit * 0.9, glowColour: glowC, colour: '#fff8ea' });
    }
    drawCylinder(cx, yBotC, rxC, ryC, tc, gBandC, gFaceB);
  }
  function drawFrames(t, fin) {
    for (const ex of extras) {
      const x = exX[ex.j], y = exY - fin * 3 * sc - (reduced ? 0 : Math.sin(t * 0.9 + ex.j) * 0.6 * ex.c);
      const c = ease.inOutSine(ex.c);
      if (ex.flash > 0 || fin > 0) glow(g, x, y, fs * 0.95, glowC, 0.35 * ex.flash + 0.25 * fin);
      g.fillStyle = gFrame; roundRect(g, x - fs / 2, y - fs / 2, fs, fs, 6 * sc); g.fill();
      g.strokeStyle = rgba(brassHi, 0.55); g.lineWidth = 1; g.stroke();
      g.fillStyle = rgba(deepC, 0.75); roundRect(g, x - ps / 2 - 1.5, y - ps / 2 - 1.5, ps + 3, ps + 3, 5 * sc); g.fill();
      photos.draw(g, ex.idx, x, y, ps, { shape: 'round', tone: 'warm', toneMix: (1 - c) * 0.8, blur: (1 - c) * 0.85, glow: ex.flash * 0.6 + fin * 0.25, glowColour: glowC, shadow: false });
      if (c < 1) {
        // loose sand on the picture, settling away as it clears
        g.save(); g.globalAlpha = (1 - c) * 0.6;
        for (const dot of ex.dots) { g.fillStyle = dot.c; g.beginPath(); g.arc(x + (dot.u - 0.5) * ps, y + (dot.v - 0.5) * ps + c * 4, dot.r * 1.6 * sc, 0, TAU); g.fill(); }
        g.restore();
      }
      // glass over the frame
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.07)';
      g.beginPath(); g.moveTo(x - ps / 2, y - ps / 2); g.lineTo(x + ps * 0.05, y - ps / 2); g.lineTo(x - ps / 2, y + ps * 0.1); g.closePath(); g.fill(); g.restore();
    }
  }
  function drawDome(t, reveal, fin) {
    // the resting chamber waits with a soft inner light
    glow(g, cx, domeY, domeR * 1.3, glowC, 0.1 + 0.05 * Math.sin(t * 0.9) + reveal * 0.12 + fin * 0.15);
    if (reveal < 0.98 && fin <= 0) {
      g.save(); g.strokeStyle = rgba(glowC, 0.2 * (1 - reveal)); g.lineWidth = 1.2; g.setLineDash(DASH); g.lineDashOffset = reduced ? 0 : -t * 5;
      g.clip(bulb); g.beginPath(); g.arc(cx, domeY, domeR - 1, 0, TAU); g.stroke(); g.restore();
    }
    const top = domeY - domeR;
    const clipY = fin > 0 ? domeY + domeR + 2 : fillY + gr;
    if (hero >= 0 && reveal < 0.95 && fin <= 0) {
      // the picture waits, faint and soft, to be rebuilt from its own sand
      g.save(); g.clip(bulb);
      photos.draw(g, hero, cx, domeY, domeR * 2, { shape: 'circle', alpha: 0.13 * (1 - reveal), blur: 1, tone: 'mist', toneMix: 0.5, shadow: false });
      g.restore();
    }
    if (revealShown > 0.003 && clipY > top) {
      g.save(); g.clip(bulb); g.beginPath(); g.rect(cx - domeR - 4, top - 4, domeR * 2 + 8, clipY - top + 4); g.clip();
      if (hero >= 0) photos.draw(g, hero, cx, domeY, domeR * 2, { shape: 'circle', dissolve: 1 - revealShown, mode: 'up', edgeColour: edgeC, shadow: false, glow: fin * 0.55, glowColour: '#fff3d6' });
      else {
        // no photos: the grains fuse into a softly glowing sand moon
        const rg = g.createRadialGradient(cx - domeR * 0.3, domeY - domeR * 0.35, domeR * 0.1, cx, domeY, domeR);
        rg.addColorStop(0, mix(sandPal[2], '#ffffff', 0.4)); rg.addColorStop(0.6, sandPal[1]); rg.addColorStop(1, sandPal[6]);
        g.globalAlpha = 0.55 * reveal + 0.35 * fin; g.fillStyle = rg; g.beginPath(); g.arc(cx, domeY, domeR - gr * 0.3, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      g.restore();
    }
    // settled grains — a mosaic that melts into the picture
    const aOld = (hero >= 0 ? lerp(0.85, 0.14, reveal) : lerp(0.95, 0.75, reveal)) * (1 - fin);
    if (aOld > 0.01) {
      g.save();
      g.globalAlpha = aOld * 0.5; g.fillStyle = rgba(deepC, 0.6); g.beginPath();
      for (let i = 0; i < N; i++) if (st[i] === REST && age[i] > 0.9) { g.moveTo(Tx[i] + gr * 1.1, Ty[i] + 1); g.arc(Tx[i], Ty[i] + 1, gr * 1.1, 0, TAU); }
      g.fill();
      g.globalAlpha = aOld;
      for (let b = 0; b < bCol.length; b++) {
        const list = members[b]; let any = false;
        g.beginPath();
        for (let k = 0; k < list.length; k++) { const i = list[k]; if (st[i] === REST && age[i] > 0.9) { any = true; g.moveTo(Tx[i] + gr, Ty[i]); g.arc(Tx[i], Ty[i], gr, 0, TAU); } }
        if (any) { g.fillStyle = bCol[b]; g.fill(); }
      }
      g.globalAlpha = aOld * 0.5; g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath();
      for (let i = 0; i < N; i++) if (st[i] === REST && age[i] > 0.9) { const hx = Tx[i] - gr * 0.3, hy = Ty[i] - gr * 0.35; g.moveTo(hx + gr * 0.36, hy); g.arc(hx, hy, gr * 0.36, 0, TAU); }
      g.fill();
      g.restore();
    }
    // freshly landed grains: a tiny bounce against the ceiling and a glint
    for (let i = 0; i < N; i++) {
      if (st[i] !== REST || age[i] > 0.9) continue;
      const a = age[i], k = 1 - a / 0.9;
      const y = Ty[i] - (reduced ? 0 : Math.sin(a * 18) * Math.exp(-a * 7) * 2.5 * sc);
      g.globalAlpha = lerp(aOld, 1, k) * (1 - fin); g.fillStyle = col[i];
      g.beginPath(); g.arc(Tx[i], y, gr * (1 + 0.15 * k), 0, TAU); g.fill();
      g.globalAlpha = 1;
      glow(g, Tx[i], y, gr * 3, ringCol, 0.35 * k);
    }
    if (fin > 0 && !reduced && !E.heavy && E.rand() < 0.12) { const a = E.rand() * TAU; E.particles.emit({ x: cx + Math.cos(a) * (domeR + 6 * sc), y: domeY + Math.sin(a) * (domeR * 0.22 + 2), vx: 0, vy: -16, life: 1.4, size: 4, colour: '#fff2cf', kind: 'glint' }); }
  }
  function drawPile(t) {
    g.save();
    g.fillStyle = rgba(mix(deepC, '#2a160a', 0.5), 0.55); g.beginPath();
    for (let i = 0; i < N; i++) if (st[i] === PILE) { g.moveTo(Sx[i] + gr * 1.15, Sy[i] + 1); g.arc(Sx[i], Sy[i] + 1, gr * 1.15, 0, TAU); }
    g.fill();
    for (let b = 0; b < bCol.length; b++) {
      const list = members[b]; let any = false;
      g.beginPath();
      for (let k = 0; k < list.length; k++) { const i = list[k]; if (st[i] === PILE) { any = true; g.moveTo(Sx[i] + gr * 1.04, Sy[i]); g.arc(Sx[i], Sy[i], gr * 1.04, 0, TAU); } }
      if (any) { g.fillStyle = bCol[b]; g.fill(); }
    }
    g.fillStyle = 'rgba(255,255,255,0.26)'; g.beginPath();
    for (let i = 0; i < N; i++) if (st[i] === PILE) { const hx = Sx[i] - gr * 0.3, hy = Sy[i] - gr * 0.38; g.moveTo(hx + gr * 0.36, hy); g.arc(hx, hy, gr * 0.36, 0, TAU); }
    g.fill();
    g.fillStyle = gPileShade; g.fill(bulbL);
    g.restore();
    // slow glints across the sand
    for (let k = 0; k < twinkle.length; k++) {
      const i = twinkle[k]; if (st[i] !== PILE) continue;
      const a = Math.pow(Math.max(0, Math.sin(t * (reduced ? 0.5 : 1.1) + k * 2.3)), 10) * 0.7;
      if (a > 0.02) glint(g, Sx[i] - gr * 0.3, Sy[i] - gr * 0.4, gr * 2.2, '#ffffff', a, 0.4);
    }
  }
  function routeXY(i, dd, t, jost) {
    const la = LA[i], lb = LB[i];
    let x, y;
    if (dd <= la) { const k = dd / la, q = 1 - smooth(k / 0.78); x = cx + (Sx[i] - cx) * q; y = Sy[i] + (yNeck - Sy[i]) * k; }
    else { const k = Math.min(1, (dd - la) / lb), q = smooth((k - 0.12) / 0.88); x = cx + (Tx[i] - cx) * q; y = yNeck + (Ty[i] - yNeck) * k; }
    x += Math.sin(t * fq[i] + ph[i]) * jost * Math.sin(Math.PI * clamp(dd / (la + lb)));
    const hw = Math.max(0, hwAt(y) - gr * 0.8);
    P.x = x > cx + hw ? cx + hw : x < cx - hw ? cx - hw : x; P.y = y;
  }
  function drawFlying(t, agit, tw) {
    if (!flying) return;
    const jost = K * (1.5 + agit * 3 + rush * 7 + tw * 9) * (reduced ? 0.25 : 1);
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      if (st[i] !== FLY) continue;
      routeXY(i, d[i] - v[i] * 0.04, t - 0.04, jost); const x0 = P.x, y0 = P.y;
      routeXY(i, d[i], t, jost); const x = P.x, y = P.y;
      g.strokeStyle = col[i]; g.lineWidth = gr * 1.1; g.globalAlpha = 0.45;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
      g.globalAlpha = 1; g.fillStyle = col[i];
      g.beginPath(); g.arc(x, y, gr * 0.95, 0, TAU); g.fill();
      glow(g, x, y, gr * 3.2, ringCol, 0.2 + Math.min(0.2, Math.abs(v[i]) / (1200 * K)));
    }
    g.restore();
    glow(g, cx, yNeck, 10 * sc + Math.min(18, flying * 0.5) * sc, ringCol, Math.min(0.55, flying / 30));
  }
  function drawGlassFront(t, fin) {
    // brass band at the neck
    g.strokeStyle = rgba(brassHi, 0.85); g.lineWidth = 2.4 * sc;
    g.beginPath(); g.ellipse(cx, yNeck, neckHW + 3.5 * sc, (neckHW + 3.5 * sc) * 0.32, 0, 0, TAU); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 6 * sc; g.stroke(specL);
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.6 * sc; g.stroke(specL);
    g.strokeStyle = rgba(glassTint, 0.16); g.lineWidth = 2.4 * sc; g.stroke(specR);
    g.restore();
    g.strokeStyle = rgba(mix('#ffffff', glowC, 0.3), 0.36); g.lineWidth = 1.3; g.stroke(bulb);
    // a slow sheen drifting across the glass
    const k = ((t * (reduced ? 0.03 : 0.06)) % 1.6) / 1.6, sx = cx - Wh * 1.3 + k * Wh * 2.6, w = Wh * 0.35;
    const sg = g.createLinearGradient(sx - w, 0, sx + w, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, `rgba(255,255,255,${0.06 + fin * 0.04})`); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.clip(bulb); g.globalCompositeOperation = 'lighter'; g.fillStyle = sg; g.fillRect(sx - w, glassTop - 4, w * 2, Hu * 2 + 8); g.restore();
  }
  function ringPose(fin, t) {
    let y = ringY(shown) + wob.v * 5 * sc;
    let hw = ringHW(y);
    if (fin > 0) { const k = ease.inOutSine(fin); y = lerp(y, domeY, k); hw = lerp(hw, domeR + 7 * sc, k); }
    return { y, hw, ry: hw * 0.22 + 1.5 };
  }
  function drawRing(t, s, fin, front) {
    if (!front) {
      g.strokeStyle = rgba(ringCol, 0.32 + 0.2 * grabGlow); g.lineWidth = 2.6 * sc;
      g.beginPath(); g.ellipse(cx, pose.y, pose.hw, pose.ry, 0, Math.PI, TAU, false); g.stroke();
      return;
    }
    const { y, hw, ry } = pose;
    const breathe = reduced ? 0 : 0.12 * Math.sin(t * 1.6);
    const bright = 0.8 + breathe + grabGlow * 0.3 + fin * 0.2;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(ringCol, 0.1 * bright); g.lineWidth = 14 * sc; g.beginPath(); g.ellipse(cx, y, hw, ry, 0, 0, Math.PI, false); g.stroke();
    g.strokeStyle = rgba(ringCol, 0.32 * bright); g.lineWidth = 6 * sc; g.beginPath(); g.ellipse(cx, y, hw, ry, 0, 0, Math.PI, false); g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.85 * Math.min(1, bright)); g.lineWidth = 2 * sc; g.beginPath(); g.ellipse(cx, y, hw, ry, 0, 0, Math.PI, false); g.stroke();
    g.restore();
    // three lights chase slowly round the ring
    for (let k = 0; k < 3; k++) {
      const a = t * (reduced ? 0.25 : 0.7) + (k * TAU) / 3, sn = Math.sin(a);
      if (sn > 0) glow(g, cx + Math.cos(a) * hw, y + sn * ry, 7 * sc, '#ffffff', 0.45 * sn);
    }
    if (fin < 1) {
      const bx = cx, by = y + ry, a = 1 - fin;
      glow(g, bx, by, (20 + grabGlow * 8) * sc, ringCol, (0.45 + breathe + grabGlow * 0.3) * a);
      g.globalAlpha = a; orb(g, bx, by, 6.5 * sc, ringCol); g.globalAlpha = 1;
    }
  }
  function drawPillars() {
    for (const side of [-1, 1]) {
      const x = cx + side * (Wh + 13 * sc), y0 = yTopC + tc, y1 = yBotC;
      g.save(); g.translate(x, 0);
      g.fillStyle = gPillar; g.fillRect(-3.5 * sc, y0, 7 * sc, y1 - y0);
      for (const f of [0.18, 0.5, 0.82]) {
        const y = lerp(y0, y1, f);
        g.beginPath(); g.ellipse(0, y, 5.5 * sc, 2.6 * sc, 0, 0, TAU); g.fill();
        g.strokeStyle = rgba(brassHi, 0.5); g.lineWidth = 1; g.stroke();
      }
      g.restore();
    }
  }
  function drawChevrons(t) {
    if (drag != null || doneFlag || finAt >= 0 || E.now() - lastInput < 1.2 || E.phase !== 'play') return;
    const dir = topped ? 1 : -1, by = pose.y + pose.ry;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 2 * sc;
    for (let k = 0; k < 3; k++) {
      const f = reduced ? k / 3 : (t * 0.5 + k / 3) % 1;
      const y = by + dir * (16 + f * 30) * sc, a = Math.sin(f * Math.PI) * 0.55;
      g.strokeStyle = rgba(ringCol, a);
      g.beginPath(); g.moveTo(cx - 6 * sc, y - dir * 4 * sc); g.lineTo(cx, y + dir * 2 * sc); g.lineTo(cx + 6 * sc, y - dir * 4 * sc); g.stroke();
    }
    g.restore();
  }

  // -------------------------------------------------------------- input --
  function onHourglass(p) { return Math.abs(p.x - cx) <= Wh + 44 * sc && p.y >= yTopC - ryC - 20 && p.y <= glassBot + 30 * sc; }
  return {
    get progress() { return rot; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0 || drag != null || !onHourglass(p)) return;
      drag = p.id; lastY = p.y; lastT = p.t; lastInput = E.now();
      E.sound('click', { intensity: 0.35 }); E.haptic('light');
      E.particles.burst(cx, pose.y + pose.ry, reduced ? 3 : 7, { speed: 40, colour: ringCol, life: 0.6, size: 4, kind: 'glint' });
      rush = Math.min(1, rush + 0.15);
    },
    move(p) {
      if (p.id !== drag) return;
      const dt = Math.max(1 / 240, p.t - lastT), dy = p.y - lastY;
      lastY = p.y; lastT = p.t; lastInput = E.now();
      if (Math.abs(dy) > 0.01) applyInput(dy, dt);
      if (E.locked && wanted >= rot + CAP - 1e-3 && E.now() - lastWaitT > 0.8) { lastWaitT = E.now(); E.checkpoint('wait'); wob.kick(0.4); }
    },
    up(p) { if (p.id === drag) { drag = null; lastInput = E.now(); } },
    assist() { if (finAt >= 0) return; lastInput = E.now(); assistTo = Math.min(1, Math.max(wanted, rot) + 1 / 8); },
    pointAt(p) { const y = ringY(clamp(p)); return { x: cx, y: y + ringHW(y) * 0.22 + 1.5 }; },
    hint() {
      const by = pose.y + pose.ry, pts = [];
      const y1 = rot < P_TOP - 1e-4 ? Math.max(ringY(P_TOP), by - trackLen * 0.5) : Math.min(ringY(1) + 6 * sc, by + trackLen * 0.5);
      for (let i = 0; i <= 14; i++) pts.push([cx, lerp(by, y1, i / 14)]);
      return { path: pts };
    },
    twist() { twistAt = E.now(); E.sound('chime', { intensity: 0.3 }); E.particles.burst(cx, yNeck, reduced ? 4 : 10, { speed: 40, colour: '#ffffff', life: 1.2, size: 4, kind: 'glint' }); },
    finish() {
      finAt = E.now();
      for (let i = 0; i < N; i++) if (st[i] !== REST) { st[i] = FLY; v[i] = Math.max(v[i], 200 * K); }
      if (hum) { hum.stop(); hum = null; }
      E.sound(E.heavy ? 'bloom' : 'shimmer', { intensity: 0.42 });
      if (E.heavy) E.ripples.add(cx, domeY, { colour: glowC, speed: 30, alpha: 0.25, r: domeR * 0.6 });
      else for (let k = 0; k < (low ? 8 : 16); k++) { const a = (k / (low ? 8 : 16)) * TAU; E.particles.emit({ x: cx + Math.cos(a) * domeR, y: domeY + Math.sin(a) * domeR, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26 - 10, life: 1.5, size: 5, colour: '#fff2cf', kind: 'glint' }); }
    },
    destroy() { if (hum) { hum.stop(); hum = null; } },
  };
}
