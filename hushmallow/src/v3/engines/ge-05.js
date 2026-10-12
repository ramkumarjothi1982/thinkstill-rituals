// GE-05 · ORBIT UNTANGLER — two knotted satellites (orbit drag).
// A luminous cord is wound twice round the inner satellite and runs on to the
// outer one; little moons are caught in its coils and the two orbit rings are
// linked through each other. Put a finger on the outer satellite and circle it
// anticlockwise round the inner one, staying in the lane outside the cord:
// every loop peels one wrap off the coil, and the freed cord goes slack in
// slow, soft waves along your path — it never snaps or disappears. Moons
// unhook onto the inner orbit as the coil lets them go.
// Win: the coil is gone and both orbits sit apart cleanly — a tidy inner ring
// of moons and a wide outer lane for the outer satellite.
//
// Photos are the two satellites (glass bubbles; the hero is the inner one) and
// the extra photos are bubble moons. Tangled, they are misted; freed, they
// clear to their own colours. Words run along the cord as a ribbon label.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, spiral, shadow, FONT } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-05',
  howTo: 'Circle the outer satellite anticlockwise round the inner one.',
  steps: ['Put a finger on the outer satellite.', 'Circle it anticlockwise round the inner one, outside the glowing cord.', 'Keep circling until both orbits drift apart cleanly.'],
  tapAlt: 'each press carries the outer satellite a quarter loop round',
  words: 'Your words run along the luminous cord like a ribbon label, loosening with it as the knot unwinds.',
  photos: {
    where: 'Your photos are the two knotted satellites and their little moons.',
    becomes: 'glassy satellites and moons',
    touch: 'You circle the outer one round the inner one;',
    change: 'the cord unwinds, each moon unhooks onto its own orbit and the misty tangle clears to their own colours.',
    payoff: 'At the end both orbits sit apart cleanly and turn together in calm light.',
  },
  finaleSec: 4,
};

const WRAPS = 2;
const TURN = TAU * WRAPS;          // anticlockwise travel to the win (one wrap per loop)
const N = 160;                     // cord points
const MEL = [0, 2, 4, 3, 5, 7, 6, 4, 5, 7, 9, 8, 6, 7];

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = !!E.reduced, low = !!(E.lowStim || E.reduced), heavy = !!E.heavy;
  const loop = E.round > 1;
  const agit = reduced ? 0 : (heavy ? 0.4 : 1) * (1 - E.calm);
  const START = loop ? 0.35 + (E.rand() - 0.5) * 2.4 : 0.35;   // outer satellite's plane angle
  const K = loop ? 0.82 + E.rand() * 0.07 : 0.86;               // tilt of the orbit plane
  const hue = loop ? E.rand() : 0;
  const cordCol = mix(pal.glow, '#ffffff', 0.12 + hue * 0.12);
  const cordHot = mix(pal.glow, pal.accent, 0.3 + hue * 0.35);
  const cordCore = mix(cordCol, '#ffffff', 0.6);
  const laneCol = mix(pal.accent, pal.glow, 0.4 + E.calm * 0.3);
  const innerCol = mix(pal.warm, pal.glow, 0.45);
  const ribbonCol = mix(pal.deep, '#05030f', 0.4);
  const inkCol = mix(pal.deep, '#000018', 0.35);
  const cometRev = E.round % 2 === 0;

  // ---- photo material: hero = inner satellite, next = outer, the rest are moons
  const n = photos.n;
  const off = n ? (E.round - 1) % n : 0;
  const ph = (k) => (n ? (off + k) % n : -1);
  const heroPh = n ? ph(0) : -1;
  const outPh = n >= 2 ? ph(1) : -1;
  const extra = Math.max(0, n - 2);
  const MC = Math.max(3, extra);
  const moonCols = [pal.warm, pal.accent, pal.glow, mix(pal.warm, pal.glow, 0.5), mix(pal.accent, '#ffffff', 0.3)];
  const moons = [];
  for (let j = 0; j < MC; j++) moons.push({ ph: j < extra ? ph(2 + j) : -1, col: moonCols[(j + E.round - 1) % 5], fo: 0, mi: 0, free: false, glide: 0, sx: 0, sy: 0, x: 0, y: 0, tone: 1, front: false, sc: 0.85 });

  // ---- geometry
  let R, cx, cy, rA, rBs, rc0, rc1, r0, r1, rIn, mS, fs, Lc, CF = 0.94, Lt = 0;
  let chars = [];
  const cw = new Float32Array(64);
  const SN = low ? 36 : 70;
  const stX = new Float32Array(SN), stY = new Float32Array(SN), stP = new Float32Array(SN), stS = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { stP[i] = 0.4 + E.rand() * 1.6; stS[i] = 0.8 + E.rand() * 1.4; }
  const stU = Float32Array.from({ length: SN }, () => E.rand()), stV = Float32Array.from({ length: SN }, () => E.rand());
  let planetGrad = null, shadeGrad = null;
  let snap = true;

  function fit() {
    R = Math.min(stage.w * 0.4, stage.h * 0.46);
    cx = stage.cx; cy = stage.cy;
    rA = R * 0.3; rBs = R * 0.2; rc0 = R * 0.38; rc1 = R * 0.64; r0 = R * 0.84; r1 = R * 0.97; rIn = R * 0.54;
    mS = Math.max(44, R * 0.29);
    fs = Math.max(12.5, R * 0.084);
    const persp = (1 + K) * 0.5;
    Lc = WRAPS * TAU * (rc0 + rc1) * 0.5 * persp;
    const Lf0 = 1.3 * (rc1 + r0) * 0.5 * persp + (r0 - rc1);
    CF = Lc / (Lc + Lf0);
    // the words, measured once per fit
    g.save(); g.font = `600 ${fs}px ${FONT}`;
    chars = Array.from(String(words.token || '')).slice(0, 60); Lt = 0;
    for (let i = 0; i < chars.length; i++) { cw[i] = g.measureText(chars[i]).width + 0.4; Lt += cw[i]; }
    g.restore();
    // moons sit on the coil beyond the label, spread round the wraps
    const lab = rBs * 1.15 + 8 + Lt + mS * 0.6;
    const f0 = clamp((lab - Lf0) / Lc, 0.2, 0.5);
    moons.forEach((m, j) => { m.fo = f0 + (MC > 1 ? j / (MC - 1) : 0.5) * (0.93 - f0); m.mi = Math.round(CF * (1 - m.fo) * (N - 1)); });
    for (let i = 0; i < SN; i++) { stX[i] = stage.x + stU[i] * stage.w; stY[i] = stage.y + stV[i] * stage.h; }
    planetGrad = g.createRadialGradient(-rA * 0.35, -rA * 0.4, rA * 0.06, 0, 0, rA);
    const base = mix(pal.sky, pal.accent, 0.3);
    planetGrad.addColorStop(0, mix(base, '#ffffff', 0.55)); planetGrad.addColorStop(0.5, base); planetGrad.addColorStop(1, mix(pal.deep, '#000010', 0.35));
    shadeGrad = g.createRadialGradient(rA * 0.5, rA * 0.55, rA * 0.15, rA * 0.25, rA * 0.3, rA * 1.3);
    shadeGrad.addColorStop(0, 'rgba(0,0,16,0.5)'); shadeGrad.addColorStop(1, 'rgba(0,0,16,0)');
    snap = true;
  }
  fit();
  E.onResize(fit);

  // ---- state
  let wanted = 0, rot = 0, shownRot = 0, assistTo = null;
  let drag = null, lastA = 0, fingerR = 0, grab = 0;
  let strain = 0, radOff = 0, lastThrum = -9, lastWait = -9;
  let doneFlag = false, finAt = -1, twistAt = -1, twistKick = false;
  let lastStep = 0, noteIdx = 0, lastNoteT = -9, lastHap = -9;
  let halfDone = false, ckA = false, sepPulse = 0;
  let spinA = 0, ringSpin = E.rand() * TAU, orbitExtra = 0, orbV = 0;
  let flip = false;
  let bx = 0, by = 0, bFront = true, bSc = 1;
  let raX = 0, raY = 0, raR = 0;
  const wobA = new Wobble(), wobB = new Wobble();
  const px = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N), cum = new Float32Array(N);

  // scratch outputs (no per-frame allocation)
  let _x = 0, _y = 0, _d = 0, _a = 0;
  const P2S = (th, r) => { _x = cx + Math.cos(th) * r; _y = cy + Math.sin(th) * r * K; };
  const planeAng = (x, y) => Math.atan2((y - cy) / K, x - cx);
  const planeR = (x, y) => Math.hypot(x - cx, (y - cy) / K);
  function ringPt(phi, rx, ry, rr) {
    const c = Math.cos(phi) * rx, s = Math.sin(phi) * ry, cr = Math.cos(rr), sr = Math.sin(rr);
    _x = cx + c * cr - s * sr; _y = cy + c * sr + s * cr; _d = Math.sin(phi);
  }
  const bAt = (q) => { q = clamp(q); P2S(START - q * TURN, lerp(r0, r1, q)); };

  // ------------------------------------------------------------ simulation --
  function frame(dt, t) {
    const sdt = Math.min(dt, 1 / 30);
    if (assistTo != null) { const st = Math.min(assistTo - wanted, dt * 2.2); wanted = Math.min(TURN, wanted + Math.max(0, st)); if (assistTo - wanted < 1e-3) assistTo = null; }
    const p = E.gate(wanted / TURN);
    rot = p * TURN;
    if (wanted > rot + 0.18) wanted = rot + 0.18;
    shownRot = lerp(shownRot, rot, 1 - Math.exp(-dt * 9));
    const ps = clamp(shownRot / TURN), e = smooth(ps);
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.2)) : 0;

    if (rot - lastStep > 0.45) { lastStep = rot; stepPayoff(t); }
    if (!halfDone && ps >= 0.5) halfway();
    if (!doneFlag && rot >= TURN * 0.998 && drag == null && assistTo == null) win();

    strain = Math.max(0, strain - dt * 1.6);
    grab = lerp(grab, drag != null ? 1 : 0, 1 - Math.exp(-dt * 10));
    sepPulse = Math.max(0, sepPulse - dt * 0.6);
    wobA.update(sdt); wobB.update(sdt);
    const laneR = lerp(r0, r1, ps);
    const radT = drag != null ? clamp((fingerR - laneR) * 0.28, -R * 0.06, R * 0.09) : 0;
    radOff = lerp(radOff, radT, 1 - Math.exp(-dt * 10));
    if (finAt >= 0) { orbV = lerp(orbV, (heavy ? 0.07 : 0.11) * (reduced ? 0.6 : 1), 1 - Math.exp(-dt * 0.8)); orbitExtra -= orbV * dt; }
    spinA += dt * lerp(0.5, 0.12, e) * (reduced ? 0.3 : 1) * (heavy ? 0.6 : 1);
    ringSpin += dt * ((heavy ? 0.14 : 0.24) * (1 - E.calm * 0.4) * (reduced ? 0.5 : 1) + fin * 0.05);

    // ---- outer satellite (follows the gated turn; leans toward a held finger, gives a little when pushed back)
    const lead = clamp(wanted - rot, 0, 0.18) * 0.55;
    const thB = START - shownRot - lead + strain * 0.2 + orbitExtra;
    const rBv = laneR + radOff + (reduced ? 0 : Math.sin(t * 0.8) * R * 0.008);
    P2S(thB, rBv); bx = _x; by = _y; bFront = Math.sin(thB) >= 0; bSc = 1 + Math.sin(thB) * 0.07;

    // ---- inner orbit ring: steeply tilted through the outer lane → a neat ring of its own
    raX = lerp(R * 0.95, rIn, e); raY = lerp(R * 0.2, rIn * K * 0.84, e);
    raR = lerp(-0.95, -0.14, e) + (reduced ? 0 : (1 - e) * 0.06 * Math.sin(t * 0.33));

    // ---- the cord: coil (wound part) + free part that slackens in slow waves
    const wound = CF * (1 - ps), fD = 1 - ps;
    const dl = lerp(1.3, 3.2, e);
    const thD = thB - dl, rD = lerp(rc0, rc1, fD);
    const slack = e * (1 - fin * 0.4);
    const waveA = R * (0.012 + 0.06 * slack) * (reduced ? 0.5 : 1);
    const tilt = R * 0.05 * (1 - e);
    const hum = agit * (1 - e) * 1.3;
    const wt = reduced ? t * 0.3 : t;
    for (let i = 0; i < N; i++) {
      const m = i / (N - 1);
      let tx, ty, kk;
      if (m < wound) {
        const f = m / CF;
        const th = thD - (fD - f) * TURN;
        const r = rc0 + (rc1 - rc0) * f + (reduced ? 0 : Math.sin(t * 1.1 + f * 9) * R * 0.006);
        tx = cx + Math.cos(th) * r; ty = cy + Math.sin(th) * r * K + Math.sin(th + f * 5.5) * tilt;
        if (hum > 0) { const v = Math.sin(t * 14 + i * 0.7) * hum; tx += v; ty -= v * 0.6; }
        kk = 160;
      } else {
        const u = (m - wound) / Math.max(1e-4, 1 - wound);
        const th = thD + dl * u;
        const r = rD + (rBv - rD) * (1 - Math.pow(1 - u, 2.2)) + waveA * Math.sin(u * 8.8 - wt * 0.85) * Math.sin(Math.PI * u);
        tx = cx + Math.cos(th) * r; ty = cy + Math.sin(th) * r * K + Math.sin(thD + fD * 5.5) * tilt * (1 - u);
        kk = 22 + 120 * Math.max(clamp(1 - u * 6), clamp((u - 0.82) * 5.5));
      }
      if (i === N - 1) { tx = bx; ty = by; }
      if (snap) { px[i] = tx; py[i] = ty; vx[i] = 0; vy[i] = 0; continue; }
      const c = Math.sqrt(kk) * 1.1;
      vx[i] += (kk * (tx - px[i]) - c * vx[i]) * sdt; vy[i] += (kk * (ty - py[i]) - c * vy[i]) * sdt;
      px[i] += vx[i] * sdt; py[i] += vy[i] * sdt;
    }
    px[N - 1] = bx; py[N - 1] = by;
    snap = false;

    // ---- moons: beads in the coil until the unwinding reaches them, then onto the inner orbit
    for (let j = 0; j < MC; j++) {
      const mo = moons[j];
      if (!mo.free && ps >= mo.fo) release(mo, j);
      if (mo.free) { mo.glide = Math.min(1, mo.glide + dt / 1.2); mo.tone = Math.max(0, mo.tone - dt / 0.9); }
      if (!mo.free) {
        mo.x = px[mo.mi]; mo.y = py[mo.mi]; mo.front = mo.y >= cy;
        mo.sc = 0.84 + (reduced ? 0 : 0.03 * Math.sin(t * 1.3 + j));
      } else {
        ringPt(ringSpin + (j / MC) * TAU, raX, raY, raR);
        const k = ease.inOutSine(mo.glide);
        mo.x = lerp(mo.sx, _x, k); mo.y = lerp(mo.sy, _y, k) - Math.sin(Math.PI * k) * R * 0.12;
        mo.front = k < 0.5 ? mo.sy >= cy : _d >= 0;
        mo.sc = lerp(0.84, 1 + 0.07 * _d, k);
      }
    }

    // ---- drawing
    drawBackdrop(t, e, fin);
    drawHalf(false, t, e, fin, ps, laneR);
    drawA(t, e, fin, ps);
    drawHalf(true, t, e, fin, ps, laneR);
    drawRibbon(t, e, fin);
    drawComet(t);
  }

  // ------------------------------------------------------------- payoffs --
  function stepPayoff(t) {
    noteIdx++;
    if (t - lastNoteT > 0.1) { lastNoteT = t; E.sound('pluck', { note: MEL[noteIdx % MEL.length], intensity: 0.24 + 0.1 * (1 - E.calm), pan: clamp((bx - cx) / R, -1, 1) * 0.5 }); }
    if (t - lastHap > 0.12) { lastHap = t; E.haptic('tick'); }
    const i = clamp(Math.round(CF * (1 - rot / TURN) * (N - 1)), 0, N - 1);
    if (!low || noteIdx % 2) E.particles.emit({ x: px[i], y: py[i], vx: (E.rand() - 0.5) * 30, vy: -18 - E.rand() * 20, life: 0.9, size: 6, colour: cordCol, drag: 0.94, kind: 'glint' });
  }
  function release(mo, j) {
    mo.free = true; mo.glide = 0; mo.sx = mo.x; mo.sy = mo.y;
    if (mo.ph >= 0) { photos.dust(mo.ph, mo.x, mo.y, mS * 0.8, low ? 6 : 12, { shape: 'bubble', up: 26, speed: 24 }); E.checkpoint('photo', mo.ph); }
    E.particles.burst(mo.x, mo.y, low ? 3 : 8, { speed: 44, colour: cordCol, life: 1.0, size: 6, kind: 'glint' });
    E.ripples.add(mo.x, mo.y, { colour: pal.glow, speed: 50, alpha: 0.35, r: mS * 0.3 });
    E.sound('bubble', { note: 3 + ((j * 2) % 7), intensity: 0.4 }); E.haptic('light');
  }
  function halfway() {
    halfDone = true;
    E.sound('chime', { intensity: 0.32 }); E.haptic('soft');
    E.ripples.add(bx, by, { colour: pal.glow, speed: 60, alpha: 0.4, r: rBs });
    if (outPh >= 0) { photos.dust(outPh, bx, by, rBs * 2, low ? 6 : 12, { shape: 'bubble', up: 22, speed: 22 }); E.checkpoint('photo', outPh); }
    sepPulse = Math.max(sepPulse, 0.5);
  }
  function win() {
    doneFlag = true;
    if (heroPh >= 0 && !ckA) { ckA = true; photos.dust(heroPh, cx, cy, rA * 2, low ? 8 : 16, { shape: 'bubble', up: 20, speed: 22 }); E.checkpoint('photo', heroPh); }
    E.sound('separate', { intensity: 0.45 }); E.haptic('soft');
    E.ripples.add(cx, cy, { colour: pal.glow, speed: 70, alpha: 0.4, r: rA });
    sepPulse = 1;
  }
  function pluck(x, y) {
    let bi = -1, bd = 54;
    for (let i = 1; i < N - 1; i += 2) { const d = Math.hypot(px[i] - x, py[i] - y); if (d < bd) { bd = d; bi = i; } }
    E.ripples.add(x, y, { colour: pal.glow, speed: 50, alpha: 0.3, r: 8 });
    if (bi < 0) { E.sound('drip', { note: noteIdx++ % 10, intensity: 0.2 }); E.haptic('tick'); return; }
    let nx = -(py[bi + 1] - py[bi - 1]), ny = px[bi + 1] - px[bi - 1];
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const side = (x - px[bi]) * nx + (y - py[bi]) * ny >= 0 ? -1 : 1;
    for (let i = Math.max(1, bi - 10); i < Math.min(N - 1, bi + 11); i++) { const f = 1 - Math.abs(i - bi) / 11; vx[i] += side * nx * 150 * f; vy[i] += side * ny * 150 * f; }
    E.sound('pluck', { note: 5 + ((bi / N) * 4 | 0), intensity: 0.3 }); E.haptic('tick');
  }

  // ------------------------------------------------------------- drawing --
  function drawBackdrop(t, e, fin) {
    glow(g, cx, cy, R * 2.2, pal.accent, 0.06 + 0.04 * fin);
    glow(g, cx - R * 0.6, cy - R * 0.95, R * 1.2, pal.glow, 0.05);
    glow(g, cx + R * 0.7, cy + R * 1.0, R * 1.1, mix(pal.warm, pal.accent, 0.5), 0.05);
    g.save(); g.fillStyle = '#ffffff';
    for (let i = 0; i < SN; i++) {
      g.globalAlpha = reduced ? 0.3 : 0.12 + 0.36 * (0.5 + 0.5 * Math.sin(t * stP[i] + i * 1.7));
      const s = stS[i]; g.fillRect(stX[i] - s / 2, stY[i] - s / 2, s, s);
    }
    g.restore();
    g.save(); g.translate(cx, cy); g.scale(1, K);
    spiral(g, 0, 0, R * 1.22, spinA, pal.glow, { arms: 3, turns: 1.3, alpha: 0.04 + 0.04 * (1 - e) * (heavy ? 0.6 : 1), width: 1.3 });
    g.restore();
  }
  function ringStroke(rx, ry, rr, front, col, a, w) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.beginPath(); g.ellipse(cx, cy, rx, ry, rr, front ? 0 : Math.PI, front ? Math.PI : TAU);
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = rgba(inkCol, 0.16); g.lineWidth = w + 2; g.stroke();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(col, a * 0.32); g.lineWidth = w * 5; g.stroke();
    g.strokeStyle = rgba(col, a); g.lineWidth = w; g.stroke();
    g.restore();
  }
  function drawHalf(front, t, e, fin, ps, laneR) {
    const lift = sepPulse * 0.25 + fin * 0.2;
    // outer lane (the outer satellite's orbit) and the inner orbit
    ringStroke(laneR, laneR * K, 0, front, laneCol, 0.16 + 0.14 * e + lift, 1.4);
    ringStroke(raX, raY, raR, front, innerCol, 0.2 + 0.12 * e + lift, 1.3);
    // slow travelling lights on both orbits
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU - spinA * 1.4;
      if ((Math.sin(a) >= 0) === front) { P2S(a, laneR); glow(g, _x, _y, 6 + 2 * fin, laneCol, 0.45 + 0.3 * e); }
      ringPt((k / 6) * TAU + ringSpin * 1.7 + 0.4, raX, raY, raR);
      if ((_d >= 0) === front) glow(g, _x, _y, 5 + 2 * fin, innerCol, 0.4 + 0.3 * e);
    }
    // the safe lane ahead of the outer satellite (outside the cord)
    if (!doneFlag && finAt < 0) {
      const thB = START - shownRot;
      for (let k = 1; k <= 9; k++) {
        const a = thB - k * 0.17;
        if ((Math.sin(a) >= 0) !== front) continue;
        P2S(a, lerp(r0, r1, clamp(ps + (k * 0.17) / TURN)));
        const shimmer = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(t * 2.2 - k * 0.7);
        glow(g, _x, _y, 4 + (1 - grab) * 1.5, laneCol, (1 - k / 10) * (0.35 + 0.25 * (1 - grab)) * shimmer);
      }
    }
    drawCord(front, t, e, fin);
    for (let j = 0; j < MC; j++) if (moons[j].front === front) drawMoon(moons[j]);
    if (bFront === front) drawB(t, e, fin, ps);
  }
  function drawCord(front, t, e, fin) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); let open = false;
    const c2 = cy * 2;
    for (let i = 0; i < N - 1; i++) {
      if ((py[i] + py[i + 1] >= c2) === front) { if (!open) { g.moveTo(px[i], py[i]); open = true; } g.lineTo(px[i + 1], py[i + 1]); } else open = false;
    }
    g.strokeStyle = rgba(inkCol, 0.42); g.lineWidth = Math.max(3.4, R * 0.026); g.stroke();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(cordHot, 0.12 + 0.06 * fin + strain * 0.1); g.lineWidth = R * 0.075; g.stroke();
    g.strokeStyle = rgba(cordCol, 0.3 + 0.08 * fin); g.lineWidth = R * 0.03; g.stroke();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = rgba(cordCore, 0.95); g.lineWidth = Math.max(1.6, R * 0.012); g.stroke();
    g.restore();
    // light pulses running along the cord, from the outer satellite inwards
    for (let k = 0; k < 3; k++) {
      const idx = N - 1 - Math.floor(((t * (reduced ? 10 : 26)) + (k * N) / 3) % N);
      if ((py[idx] >= cy) === front) glow(g, px[idx], py[idx], R * 0.065, cordCol, 0.45 + 0.15 * e);
    }
    if (strain > 0.02 && bFront === front) glow(g, bx, by, rBs * 2.2, pal.warm, strain * 0.45);
  }
  function drawA(t, e, fin, ps) {
    const bob = reduced ? 0 : Math.sin(t * 0.7) * R * 0.01;
    const x = cx, y = cy + bob, s = 1 + wobA.v * 0.035;
    shadow(g, x + rA * 0.15, y + rA * 0.28, rA * 1.4, rA * 1.1, 0.4);
    glow(g, x, y, rA * 2.6, pal.glow, 0.15 + 0.1 * e + 0.12 * fin + sepPulse * 0.1);
    const clear = smooth(invLerp(0.35, 1, ps));
    if (heroPh >= 0) photos.draw(g, heroPh, x, y, rA * 2 * s, { shape: 'bubble', tone: 'mist', toneMix: 0.55 * (1 - clear), blur: 0.18 * (1 - clear), glow: 0.3 + 0.35 * clear, glowColour: pal.glow, shadow: false });
    else drawPlanet(x, y, rA * s, t);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(pal.glow, 0.22 + 0.2 * clear); g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, rA * s * 1.02, Math.PI * 0.95, Math.PI * 1.7); g.stroke();
    g.restore();
  }
  function drawPlanet(x, y, r, t) {
    g.save(); g.translate(x, y); const sc = r / rA; g.scale(sc, sc);
    g.fillStyle = planetGrad; g.beginPath(); g.arc(0, 0, rA, 0, TAU); g.fill();
    g.save(); g.clip();
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      g.fillStyle = rgba(k % 2 ? pal.glow : pal.warm, 0.1);
      g.beginPath(); g.ellipse(Math.sin(t * 0.15 + k * 1.3) * rA * 0.25, (-0.55 + k * 0.36) * rA, rA * 1.3, rA * (0.07 + 0.02 * k), -0.12, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = shadeGrad; g.fillRect(-rA, -rA, rA * 2, rA * 2);
    g.restore();
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.2)';
    g.beginPath(); g.ellipse(-rA * 0.32, -rA * 0.42, rA * 0.32, rA * 0.15, -0.6, 0, TAU); g.fill();
    g.restore();
  }
  function drawB(t, e, fin, ps) {
    const s = bSc * (1 + wobB.v * 0.05) * (1 + grab * 0.06);
    const r = rBs * s;
    shadow(g, bx + r * 0.15, by + r * 0.35, r * 1.3, r * 0.9, 0.3);
    const idle = drag == null && !doneFlag && finAt < 0 ? 0.12 * (0.5 + 0.5 * Math.sin(t * 2.4)) : 0;
    glow(g, bx, by, r * 2.6, pal.accent, 0.2 + 0.25 * grab + idle + fin * 0.1);
    const clr = smooth(invLerp(0, 0.5, ps));
    if (outPh >= 0) photos.draw(g, outPh, bx, by, r * 2, { shape: 'bubble', tone: 'mist', toneMix: 0.5 * (1 - clr), glow: 0.35 + 0.3 * clr, glowColour: pal.glow, shadow: false });
    else {
      g.save(); g.strokeStyle = rgba(cordCol, 0.45); g.lineWidth = 1.6;
      g.beginPath(); g.ellipse(bx, by, r * 1.5, r * 0.42, -0.4, Math.PI, TAU); g.stroke();
      orb(g, bx, by, r * 0.8, mix(pal.accent, '#ffffff', 0.12));
      g.beginPath(); g.ellipse(bx, by, r * 1.5, r * 0.42, -0.4, 0, Math.PI); g.stroke();
      g.restore();
    }
    if (grab > 0.02) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(pal.glow, grab * (0.45 + 0.15 * Math.sin(t * 5))); g.lineWidth = 2;
      g.beginPath(); g.arc(bx, by, r * 1.32, 0, TAU); g.stroke(); g.restore();
    }
  }
  function drawMoon(mo) {
    const s = mo.sc * mS, clr = 1 - mo.tone;
    if (mo.free && mo.glide < 1) glow(g, mo.x, mo.y, s * 1.1, pal.glow, 0.5 * Math.sin(Math.PI * mo.glide));
    if (mo.ph >= 0) photos.draw(g, mo.ph, mo.x, mo.y, s, { shape: 'bubble', tone: 'mist', toneMix: 0.6 * mo.tone, blur: 0.3 * mo.tone, glow: 0.2 + 0.3 * clr, glowColour: pal.glow, shadow: false });
    else { glow(g, mo.x, mo.y, s * 0.75, mo.col, 0.22 + 0.3 * clr); orb(g, mo.x, mo.y, s * 0.36, mix(mix(mo.col, '#ffffff', 0.15), '#7a7a96', 0.45 * mo.tone)); }
  }
  // position + direction at screen distance d from the outer satellite along the cord
  function at(d) {
    let lo = 0, hi = N - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] >= d) lo = mid; else hi = mid; }
    const span = cum[lo] - cum[hi] || 1, f = clamp((cum[lo] - d) / span);
    _x = px[lo] + (px[hi] - px[lo]) * f; _y = py[lo] + (py[hi] - py[lo]) * f;
    _a = Math.atan2(py[lo] - py[hi], px[lo] - px[hi]);
  }
  function drawRibbon(t, e, fin) {
    if (!chars.length || E.phase === 'law') return;
    cum[N - 1] = 0;
    for (let i = N - 2; i >= 0; i--) cum[i] = cum[i + 1] + Math.hypot(px[i + 1] - px[i], py[i + 1] - py[i]);
    const d0 = rBs * bSc * 1.1 + 7, d1 = Math.min(cum[0] - 4, d0 + Lt);
    if (d1 - d0 < 20) return;
    at(d0); const ax = _x; at(d1);
    if (!flip && _x < ax - 10) flip = true; else if (flip && _x > ax + 10) flip = false;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); let started = false;
    at(d0 - 3); g.moveTo(_x, _y); started = true;
    for (let i = N - 1; i >= 0; i--) { const d = cum[i]; if (d <= d0 - 3) continue; if (d >= d1 + 3) break; g.lineTo(px[i], py[i]); }
    if (started) { at(d1 + 3); g.lineTo(_x, _y); }
    g.strokeStyle = rgba(cordCol, 0.32 + 0.1 * fin); g.lineWidth = fs * 1.75 + 2.5; g.stroke();
    g.strokeStyle = rgba(ribbonCol, 0.8); g.lineWidth = fs * 1.75; g.stroke();
    g.font = `600 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fffaf0';
    const sc = Math.min(1, (d1 - d0) / Lt);
    let acc = 0;
    for (let k = 0; k < chars.length; k++) {
      const w = cw[k] * sc, dc = flip ? d1 - acc - w / 2 : d0 + acc + w / 2; acc += w;
      at(dc);
      g.save(); g.translate(_x, _y); g.rotate(_a + (flip ? Math.PI : 0)); g.fillText(chars[k], 0, 0.5); g.restore();
    }
    g.restore();
  }
  function drawComet(t) {
    if (twistAt < 0) return;
    const k = (t - twistAt) / 3.4;
    if (k >= 1) return;
    const xa = cometRev ? stage.x + stage.w + 50 : stage.x - 50, xb = cometRev ? stage.x - 50 : stage.x + stage.w + 50;
    const ya = cy - R * (cometRev ? 1.05 : 1.3), yb = cy - R * (cometRev ? 1.3 : 1.0);
    const x = lerp(xa, xb, k), y = lerp(ya, yb, k), L = Math.hypot(xb - xa, yb - ya), ux = (xb - xa) / L, uy = (yb - ya) / L;
    for (let i = 8; i >= 1; i--) glow(g, x - ux * i * 11, y - uy * i * 11, (1 - i / 10) * 9 + 2, cordCol, (1 - i / 9) * 0.6);
    glint(g, x, y, 11, '#ffffff', 0.8, t);
    if (!twistKick && k > 0.45) {
      twistKick = true;
      for (let i = 1; i < N - 1; i++) vy[i] += Math.sin(i * 0.21) * (reduced ? 25 : 70);
      E.sound('pluck', { note: 9, intensity: 0.22 });
    }
  }

  // -------------------------------------------------------------- input --
  return {
    get progress() { return clamp(rot / TURN); },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      const dB = Math.hypot(p.x - bx, p.y - by), pr = planeR(p.x, p.y);
      if (drag == null && (dB < Math.max(46, rBs * 1.9) || (pr > R * 0.7 && pr < R * 1.5))) {
        drag = p.id; lastA = planeAng(p.x, p.y); fingerR = pr;
        E.sound('pluck', { note: 4, intensity: 0.32 }); E.haptic('light');
        E.ripples.add(bx, by, { colour: pal.glow, speed: 55, alpha: 0.4, r: rBs });
        return;
      }
      if (Math.hypot(p.x - cx, p.y - cy) < rA * 1.25) {
        wobA.kick(0.8); E.sound('glass', { note: 2 + (noteIdx++ % 5), intensity: 0.3 }); E.haptic('tick');
        E.ripples.add(cx, cy, { colour: pal.glow, speed: 50, alpha: 0.35, r: rA });
        return;
      }
      pluck(p.x, p.y);
    },
    move(p) {
      if (p.id !== drag) return;
      const a = planeAng(p.x, p.y);
      let d = a - lastA; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
      lastA = a; fingerR = planeR(p.x, p.y);
      d = clamp(d, -0.6, 0.6);
      const want = -d;                         // anticlockwise on screen = forward
      const now = E.now();
      if (want > 0) {
        wanted = Math.min(TURN, wanted + want, rot + 0.18);
        if (E.locked && wanted >= rot + 0.17 && now - lastWait > 0.6) { lastWait = now; wobB.kick(0.35); E.checkpoint('wait'); }
      } else if (want < 0) {
        // backwards: un-bank first, then the cord holds the satellite (no crossing it)
        const back = -want, unbank = Math.min(back, Math.max(0, wanted - rot));
        wanted -= unbank;
        const rest = back - unbank;
        if (rest > 0) {
          strain = Math.min(1, strain + rest * 2.4);
          if (strain > 0.45 && now - lastThrum > 0.55) { lastThrum = now; wobB.kick(0.5); E.sound('thrum', { intensity: 0.2 }); E.haptic('soft'); }
        }
      }
    },
    up(p) { if (p.id === drag) { drag = null; if (rot >= TURN * 0.998 && !doneFlag) win(); } },
    assist() { if (finAt >= 0) return; assistTo = Math.min(TURN, Math.max(wanted, rot) + TURN / 8); },
    pointAt(q) { bAt(q); return { x: _x, y: _y }; },
    hint() {
      const q0 = shownRot / TURN, pts = [];
      for (let i = 0; i <= 16; i++) { bAt(q0 + ((i / 16) * 0.9) / TURN); pts.push([_x, _y]); }
      return { path: pts };
    },
    twist() { twistAt = E.now(); twistKick = false; E.sound('shimmer', { intensity: 0.22 }); },
    finish() {
      finAt = E.now();
      for (let j = 0; j < MC; j++) if (!moons[j].free) release(moons[j], j);
      if (!doneFlag) win();
      E.sound(heavy ? 'settle' : 'shimmer', { intensity: heavy ? 0.35 : 0.45 });
      if (!heavy && !low) for (let k = 0; k < 14; k++) { P2S((k / 14) * TAU, r1); E.particles.emit({ x: _x, y: _y, vx: 0, vy: -12, life: 1.6, size: 7, colour: k % 2 ? laneCol : cordCol, drag: 0.96, kind: 'glint' }); }
    },
    destroy() {},
  };
}
