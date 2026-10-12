// GE-14 · MAGNET RELIEF — two polarity stones (drag and rotate magnet).
// A heavy thought stone hangs in the upper stage, its field pulling at
// everything: iron-filing motes creep towards the words and its force lines
// crowd in tight. Drag the blue magnet up its approach groove towards the
// stone — the closer it comes, the harder the stone leans and the more the
// lines bunch into one taut bridge. Then turn the magnet's glowing tip round:
// its polarity swings, the bridge lets go, the force lines bend around the
// magnet instead of snapping towards the text, the filings stop and rest, and
// the stone floats back. Win: the two stones rest with a safe, visible gap —
// a soft cushion of light between them.
//
// The field is real: two dipoles superposed and traced as streamlines every
// frame (head-to-tail = attraction, head-to-head = a neutral point = the gap).
//
// Photos: the first is the face of the thought stone (warm-tinted while it
// pulls, cooling back to its own colours as the pull eases); the others
// cling to its rim as small polished pebbles that unhook one by one and rest
// at a gap. Words sit on the stone.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, shadow as softShadow, canvas as makeCanvas, hex, rng, angDiff } from '../fx.js';
import { bezier, Wobble } from '../kit.js';
import { shapePath } from '../photos.js';

export const meta = {
  id: 'GE-14',
  howTo: 'Drag the blue magnet to the stone, then turn its tip to ease the pull.',
  steps: [
    'Hold the blue magnet and drag it up towards the thought stone.',
    'Turn its glowing tip slowly round, all the way — the pull eases as it turns.',
    'Keep turning until the two stones rest with a safe, visible gap.',
  ],
  tapAlt: 'each press brings the magnet one step closer, then turns its tip a little further round',
  words: 'Your words sit on the thought stone — glowing warm while it pulls, then cooling to calm light as the pull eases.',
  photos: {
    where: 'Your first photo becomes the face of the thought stone; any others cling to it as small pebbles.',
    becomes: 'polished polarity stones',
    touch: 'You ease them with the blue magnet;',
    change: 'as its tip turns the pull lets go — the warm tint cools back to their own colours and each pebble gently unhooks.',
    payoff: 'At the end they float around the stone with a safe, visible gap.',
  },
  finaleSec: 4.2,
};

const A_END = 0.38;          // share of progress for the approach; the rest is the tip turn
const SPIN = Math.PI;        // the tip turns half a revolution
const BANK = 0.035;          // how far input may run ahead of the gated state
const NL_S = 13, NL_M = 9, NL = NL_S + NL_M, SMAX = 118;   // field lines × max points

const lum = (h) => { const [r, gg, b] = hex(h); return (0.299 * r + 0.587 * gg + 0.114 * b) / 255; };

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = E.reduced, lowStim = E.lowStim, heavy = E.heavy;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const calm0 = E.calm;
  const R1 = E.round === 1;
  // ---- per-round variety (loop rounds rearrange and recolour)
  const side = R1 ? 1 : (E.rand() < 0.5 ? -1 : 1);            // which side the magnet starts on
  let spinDir = R1 ? 1 : (E.rand() < 0.5 ? -1 : 1);            // default tip-turn direction (the person may choose)
  const tone = R1 ? 0 : E.rand();
  const stoneSeed = 3 + E.round * 5;
  const lightSky = lum(pal.sky) > 0.5;

  // ---- colours (the magnet stays blue in every realm; the rest follows the palette)
  const WARM = heavy ? mix(mix(pal.warm, '#ffb8a0', 0.45), pal.accent, tone * 0.2) : mix(mix(pal.warm, '#ff6a4a', 0.35), pal.accent, 0.12 + tone * 0.25);
  const BLUE = mix('#56b0ff', pal.glow, 0.12 + tone * 0.12);
  const CALM = mix('#cfe9ff', pal.glow, 0.22);
  const INK = mix(pal.ink || '#0a0820', '#000010', 0.3);
  const STONE_LO = mix('#14121f', pal.deep, 0.35), STONE_MID = mix('#3a3552', pal.deep, 0.25), STONE_HI = mix('#8c87a8', pal.glow, 0.12);
  const PEB_COLS = [mix(pal.accent, '#ffffff', 0.12), mix(pal.glow, '#3a4a9a', 0.25), mix(pal.warm, pal.accent, 0.45), mix(pal.glow, '#ffffff', 0.35)];

  // ---- geometry (re-fitted on resize)
  let W = 300, H = 300, s = 1, stoneW = 150, stoneH = 115, stoneRy = 52, magL = 90, magW = 44, gapSafe = 36, tipR = 36, pebSize = 48, stepPx = 6;
  let killS2 = 1, killM2 = 1, grabR = 50, spinR = 80, invU = 1;
  const home = { x: 0, y: 0 }, dock = { x: 0, y: 0 }, start = { x: 0, y: 0 };
  let rail = [], railCum = [0], railL = 1;
  let dcx = 0, dcy = 0, drx = 1, dry = 1;
  let pool = null, stoneSprite = null;
  const pebSprites = [];
  const tmp = { x: 0, y: 0 };

  function fit() {
    W = stage.w; H = stage.h; s = stage.s;
    stoneW = clamp(Math.min(W * 0.46, H * 0.33), 72, 212);
    stoneH = stoneW / 1.3;
    stoneRy = stoneH * 0.46;
    magL = clamp(stoneW * 0.6, 54, 122); magW = magL * 0.46;
    gapSafe = clamp(stoneW * 0.24, 20, 50);
    tipR = magL * 0.4;
    pebSize = clamp(stoneW * 0.31, 34, 60);
    stepPx = clamp(6 * s, 4.5, 8);
    const topRoom = pebSize * 0.75 + 16 * s;
    const stack = stoneH / 2 + stoneRy + gapSafe + magL;
    const slack = Math.max(0, H - topRoom - stack - Math.max(magL * 1.3, H * 0.22));
    home.x = stage.cx + side * W * 0.035;
    home.y = stage.y + topRoom + stoneH / 2 + slack * 0.35;
    dock.x = home.x; dock.y = home.y + stoneRy + gapSafe + magL / 2;
    start.x = stage.cx - side * W * 0.27;
    start.y = Math.min(stage.y + H - magW * 0.9 - 6, dock.y + Math.max(magL * 1.25, H * 0.3));
    const dy = start.y - dock.y;
    rail = bezier([start.x, start.y], [start.x + side * W * 0.02, start.y - dy * 0.62], [dock.x - side * W * 0.04, dock.y + dy * 0.5], [dock.x, dock.y], 48);
    railCum = [0];
    for (let i = 1; i < rail.length; i++) railCum.push(railCum[i - 1] + Math.hypot(rail[i][0] - rail[i - 1][0], rail[i][1] - rail[i - 1][1]));
    railL = railCum[railCum.length - 1] || 1;
    killS2 = (stoneH * 0.42) ** 2; killM2 = (magL * 0.36) ** 2;
    grabR = Math.max(magL * 0.62, 40) + 14; spinR = magL * 0.62 + 46;
    invU = 1 / stoneW;
    // field domain: an ellipse inside the stage (lines fade out before its edge)
    dcx = stage.cx; dcy = (home.y + dock.y) / 2 + stoneH * 0.1;
    dry = Math.max(40, Math.min(dcy - stage.y, stage.y + H - dcy) - 2);
    drx = Math.max(W * 0.6, dry * 0.8);
    // the dark pool behind the stones (static → cached)
    pool = g.createRadialGradient(dcx, dcy - stoneH * 0.2, 0, dcx, dcy - stoneH * 0.2, Math.max(W, H) * 0.62);
    const pa = lightSky ? 0.42 : 0.3;
    pool.addColorStop(0, rgba(INK, pa)); pool.addColorStop(0.55, rgba(INK, pa * 0.55)); pool.addColorStop(1, rgba(INK, 0));
    stoneSprite = makeStoneSprite();
    pebSprites.length = 0;
    for (let i = 0; i < 4; i++) pebSprites.push(makePebbleSprite(i));
    for (const pb of pebs) placePebble(pb, true);
    seedFilings();
  }

  // ---- state
  let wanted = 0, prog = 0, shown = 0;
  let assistTo = null;
  let docked = false, doneFlag = false, finAt = -1, restT = 0, heroFreed = false, spinChosen = false, spinAcc = 0;
  let lastA = 0, lastS = 0, lastTick = 0, lastHap = -9, lastWait = -9, lastCrackle = -9;
  let flowPh = 0, twistAt = -1, twistKind = 0, pairA = null;
  let probeX = 0, probeY = 0, probeK = 0;
  let hum = null, humOff = -1;
  const drags = new Map();
  const wob = new Wobble();
  // magnet: display position (spring, with a little lateral give) and angle (spring)
  let Mx = 0, My = 0, Mvx = 0, Mvy = 0, latX = 0, latY = 0, latTX = 0, latTY = 0, ang = -Math.PI / 2, angV = 0;
  // stone: spring around its home, leaning towards the magnet while it pulls
  let Sx = 0, Sy = 0, Svx = 0, Svy = 0, tilt = 0;
  let pullEff = 0, relief = 0, attr = 0;
  let msx = 0, msy = 1, mbx = 0, mby = 1, fbx = 0, fby = 0;

  // ---- photos: hero on the thought stone, the rest as clinging pebbles
  const n = photos.n;
  const hero = n ? (E.round - 1) % n : -1;
  const others = [];
  for (let k = 1; k < n; k++) others.push((hero + k) % n);
  const K = n === 0 ? 4 : Math.max(3, others.length);
  const slotPh = Array.from({ length: K }, () => -1);
  others.forEach((ph, j) => { slotPh[Math.min(K - 1, Math.round(((j + 0.5) * K) / others.length - 0.5))] = ph; });
  // detach order: round 1 alternates from the outside in; loop rounds shuffle
  const order = Array.from({ length: K }, (_, i) => (i % 2 ? K - 1 - (i >> 1) : i >> 1));
  if (!R1) for (let i = K - 1; i > 0; i--) { const j = Math.floor(E.rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const pebs = slotPh.map((ph, i) => ({
    ph, i, ang: lerp(Math.PI - 0.22, TAU + 0.22, (i + 0.5) / K) + (R1 ? 0 : (E.rand() - 0.5) * 0.16),
    thr: 0, att: 1, det: false, x: 0, y: 0, vx: 0, vy: 0, size: 40, seed: 11 + i * 3 + E.round, col: PEB_COLS[i % 4], sp: i % 4, ph0: E.rand() * TAU,
  }));
  order.forEach((pi, j) => { pebs[pi].thr = 0.1 + 0.58 * (j / Math.max(1, K - 1)); });

  // ---- iron filings (allocation-free typed arrays)
  const NF = lowStim ? 48 : reduced ? 66 : heavy ? 84 : 108;
  const FX = new Float32Array(NF), FY = new Float32Array(NF), FAge = new Float32Array(NF), FC = new Float32Array(NF), FSn = new Float32Array(NF), FStr = new Float32Array(NF);
  const frand = rng(E.seed * 13 + 7);
  function seedFilings() {
    const cols = Math.ceil(Math.sqrt(NF * (drx / dry))), rows = Math.ceil(NF / cols);
    for (let i = 0; i < NF; i++) {
      const cx = (i % cols + 0.5 + (frand() - 0.5) * 0.8) / cols, cy = (Math.floor(i / cols) + 0.5 + (frand() - 0.5) * 0.8) / rows;
      FX[i] = dcx + (cx * 2 - 1) * drx * 0.92; FY[i] = dcy + (cy * 2 - 1) * dry * 0.92; FAge[i] = 1 + frand();
    }
  }
  function respawnFiling(i) {
    const a = frand() * TAU, r = 0.86 + frand() * 0.1;
    FX[i] = dcx + Math.cos(a) * drx * r; FY[i] = dcy + Math.sin(a) * dry * r; FAge[i] = 0;
  }

  // ---- field lines
  const LX = new Float32Array(NL * SMAX), LY = new Float32Array(NL * SMAX), LR = new Float32Array(NL * SMAX), LN = new Uint16Array(NL);

  fit();
  E.onResize(fit);
  Sx = home.x; Sy = home.y;
  railPoint(0, tmp); Mx = tmp.x; My = tmp.y;
  ang = Math.atan2(home.y - My, home.x - Mx);
  for (const pb of pebs) placePebble(pb, true);

  // ------------------------------------------------------------ helpers --
  function railPoint(u, out) {
    const target = clamp(u) * railL;
    let lo = 0, hi = rail.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (railCum[m] < target) lo = m + 1; else hi = m; }
    const k = Math.max(1, lo), a = rail[k - 1], b = rail[k], seg = railCum[k] - railCum[k - 1] || 1, f = clamp((target - railCum[k - 1]) / seg);
    out.x = lerp(a[0], b[0], f); out.y = lerp(a[1], b[1], f);
    return out;
  }
  function nearestRailU(x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < rail.length; i++) { const d = (rail[i][0] - x) ** 2 + (rail[i][1] - y) ** 2; if (d < bd) { bd = d; best = i; } }
    // refine between neighbours
    const i0 = Math.max(0, best - 1), i1 = Math.min(rail.length - 1, best + 1);
    let bu = railCum[best] / railL;
    for (let k = 0; k <= 8; k++) {
      const u = lerp(railCum[i0], railCum[i1], k / 8) / railL; railPoint(u, tmp);
      const d = (tmp.x - x) ** 2 + (tmp.y - y) ** 2; if (d < bd) { bd = d; bu = u; }
    }
    return bu;
  }
  function fieldAt(x, y) {
    let rx = (x - Sx) * invU, ry = (y - Sy) * invU, r2 = rx * rx + ry * ry + 0.02, r = Math.sqrt(r2), r3 = r2 * r, r5 = r3 * r2;
    let mr = msx * rx + msy * ry;
    let bx = (3 * mr * rx) / r5 - msx / r3, by = (3 * mr * ry) / r5 - msy / r3;
    rx = (x - Mx) * invU; ry = (y - My) * invU; r2 = rx * rx + ry * ry + 0.012; r = Math.sqrt(r2); r3 = r2 * r; r5 = r3 * r2;
    mr = mbx * rx + mby * ry;
    bx += (3 * mr * rx) / r5 - mbx / r3; by += (3 * mr * ry) / r5 - mby / r3;
    fbx = bx; fby = by;
  }
  const rho = (x, y) => { const ex = (x - dcx) / drx, ey = (y - dcy) / dry; return Math.sqrt(ex * ex + ey * ey); };
  function hap(kind, gap = 0.09) { const t = E.now(); if (t - lastHap > gap) { lastHap = t; E.haptic(kind); } }
  function refuse() {
    const t = E.now();
    if (t - lastWait > 0.7) { lastWait = t; E.checkpoint('wait'); wob.kick(0.6); E.sound('bubble', { note: 1, intensity: 0.2 }); }
  }

  // --------------------------------------------------------- simulation --
  function frame(dt, t) {
    // ---- input → gated state
    if (assistTo != null) {
      const step = Math.min(assistTo - wanted, dt * 0.32);
      wanted = Math.min(1, wanted + Math.max(0, step));
      if (assistTo - wanted < 1e-4) { wanted = assistTo; assistTo = null; }
    }
    if (docked) wanted = Math.max(wanted, A_END);
    prog = E.gate(wanted);
    if (wanted > prog + BANK) wanted = prog + BANK;
    shown = lerp(shown, prog, 1 - Math.exp(-dt * 12));
    if (Math.abs(shown - prog) < 1e-4) shown = prog;
    if (!docked && prog >= A_END - 1e-4) onDock();

    const uA = clamp(shown / A_END), sp = clamp((shown - A_END) / (1 - A_END));
    relief = smooth(sp);
    attr = Math.pow(smooth(uA), 1.3) * (1 - calm0 * 0.35);
    const spinA = sp * SPIN;
    pullEff = attr * (0.5 + 0.5 * Math.cos(spinA)) - 0.14 * attr * (0.5 - 0.5 * Math.cos(spinA));
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;

    // ---- magnet: follows the rail (approach) or turns on the dock (tip)
    railPoint(uA, tmp);
    latX = lerp(latX, drags.size ? latTX : 0, 1 - Math.exp(-dt * (drags.size ? 10 : 5)));
    latY = lerp(latY, drags.size ? latTY : 0, 1 - Math.exp(-dt * (drags.size ? 10 : 5)));
    const w = wob.update(dt);
    const tx = tmp.x + latX + (docked ? 0 : -Math.sin(ang) * w * 4 * s), ty = tmp.y + latY + (docked ? 0 : Math.cos(ang) * w * 4 * s);
    // stiff, slightly underdamped spring: inertia without lag
    const kM = 420, cM = 34;
    Mvx += (-(Mx - tx) * kM - Mvx * cM) * dt; Mvy += (-(My - ty) * kM - Mvy * cM) * dt;
    Mx += Mvx * dt; My += Mvy * dt;
    if (dt === 0 && !Number.isFinite(Mx)) { Mx = tx; My = ty; }
    const angT = docked ? -Math.PI / 2 + spinDir * spinA + (reduced ? 0 : w * 0.06) : Math.atan2(home.y - My, home.x - Mx);
    angV += (angDiff(ang, angT) * 260 - angV * 24) * dt; ang += angV * dt;
    // ---- the thought stone leans towards the magnet while it pulls
    let dxm = Mx - home.x, dym = My - home.y; const dmag = Math.hypot(dxm, dym) || 1; dxm /= dmag; dym /= dmag;
    const off = pullEff > 0 ? pullEff * (gapSafe - 7) : pullEff * 26 * s;
    const lev = fin * 5 * s + (reduced ? 0 : Math.sin(t * 0.8) * (1.2 + relief * 1.6) * s);
    const sTx = home.x + dxm * off, sTy = home.y + dym * off - lev;
    const tremble = reduced || heavy ? 0 : pullEff * pullEff * (1 - calm0) * 0.8 * s;
    Svx += (-(Sx - sTx) * 90 - Svx * 10) * dt; Svy += (-(Sy - sTy) * 90 - Svy * 10) * dt;
    Sx += Svx * dt + (tremble ? Math.sin(t * 37) * tremble * dt * 20 : 0); Sy += Svy * dt;
    tilt = lerp(tilt, clamp(dxm * pullEff * 0.14, -0.14, 0.14), 1 - Math.exp(-dt * 6));
    // ---- dipoles: stone N face towards the dock; magnet S at its tip (head-to-tail = pull)
    const ax = dock.x - home.x, ay = dock.y - home.y, al = Math.hypot(ax, ay) || 1;
    const Ms = 1, Mb = 0.9;
    msx = (ax / al) * Ms; msy = (ay / al) * Ms;
    mbx = -Math.cos(ang) * Mb; mby = -Math.sin(ang) * Mb;

    // ---- micro-payoffs from real progress
    if (!docked) {
      const step = Math.floor(clamp(prog / A_END) * 6);
      if (step > lastS) { E.sound('pluck', { note: step, intensity: 0.3, pan: clamp((Mx - stage.cx) / (W / 2), -1, 1) * 0.5 }); hap('tick'); }
      lastS = step;
    } else if (Math.abs(prog - lastTick) > 0.026) {
      const up = prog > lastTick; lastTick = prog;
      E.sound('rotate-tick', { pitch: lerp(1.2, 0.82, relief), intensity: 0.3 }); if (up) hap('tick');
    }
    for (const pb of pebs) if (!pb.det && (relief >= pb.thr || finAt >= 0)) detach(pb, finAt < 0);
    if (!heroFreed && relief >= 0.72) {
      heroFreed = true;
      E.sound('separate', { intensity: 0.4 }); E.react(heavy ? 'sigh' : 'release');
      if (hero >= 0) { photos.dust(hero, Sx, Sy, stoneW, reduced ? 6 : 14, { shape: 'stone', up: 18, speed: 22, sizePx: 4 }); E.checkpoint('photo', hero); }
      E.ripples.add((Sx + Mx) / 2, (Sy + stoneRy + My - magL / 2) / 2, { colour: CALM, speed: 50, alpha: 0.45, r: 8 });
    }
    // done = turned all the way, released, and the stone has come to rest
    const busy = drags.size > 0 || assistTo != null;
    if (!doneFlag && prog >= 0.999 && !busy) {
      restT += dt;
      if (restT > 0.45 && Math.hypot(Svx, Svy) < 14 * s) { doneFlag = true; E.sound('settle', { intensity: 0.5 }); hap('soft', 0); }
    } else if (!doneFlag) restT = 0;
    // hum follows the pull while touching
    if (hum) {
      hum.update({ intensity: 0.08 + 0.22 * Math.max(0, pullEff) * (heavy ? 0.6 : 1), pitch: lerp(1.15, 0.8, relief) });
      if (!drags.size && humOff < 0) humOff = t;
      if (drags.size) humOff = -1;
      if (humOff >= 0 && t - humOff > 0.5) { hum.stop(); hum = null; humOff = -1; }
    }
    // crackle sparks in a tight gap while the finger moves the magnet (energetic feelings only)
    if (!heavy && !reduced && !lowStim && pullEff > 0.72 && drags.size && t - lastCrackle > 0.45 && Math.random() < 0.3) {
      lastCrackle = t;
      const gx = (Sx + dxm * stoneRy + Mx + Math.cos(ang) * magL * 0.45) / 2, gy = (Sy + dym * stoneRy + My + Math.sin(ang) * magL * 0.45) / 2;
      E.particles.burst(gx, gy, 3, { speed: 70, colour: mix(WARM, '#ffffff', 0.4), life: 0.4, size: 3.5, kind: 'glint' });
      E.sound('crackle', { intensity: 0.14 });
    }
    probeK = Math.max(0, probeK - dt * 1.4);
    flowPh += dt * lerp(lerp(46, 11, relief), 7, fin) * (reduced ? 0.4 : 1) * (1 - calm0 * 0.3) * s;

    // ---- drawing
    g.fillStyle = pool; g.fillRect(stage.x - 12, stage.y, W + 24, H);
    traceField(t);
    drawFilings(dt, t, fin);
    drawField(t, fin);
    drawGuides(t, fin);
    drawGapCushion(t, fin);
    drawStone(t, fin);
    drawPebbles(dt, t, fin);
    drawMagnet(t, fin);
    drawTwist(t);
    if (fin > 0 && finAt >= 0) drawFinale(t, fin);
  }

  function onDock() {
    docked = true; wanted = Math.max(wanted, A_END);
    E.sound('lens-focus', { intensity: 0.45 }); hap('light', 0);
    E.checkpoint('step');
    E.ripples.add(dock.x, dock.y, { colour: BLUE, speed: 60, alpha: 0.5, r: magL * 0.3 });
    E.hint('Now turn the glowing tip slowly round to ease the pull.');
    // a drag that docks keeps going as a turn
    for (const d of drags.values()) if (d.mode === 'move') { d.mode = 'spin'; d.a = Math.atan2(d.y - dock.y, d.x - dock.x); }
    lastTick = prog;
  }
  function detach(pb, live) {
    pb.det = true;
    const note = 3 + ((pebs.filter((q) => q.det).length * 2) % 7);
    if (live) { E.sound('glass', { note, intensity: 0.32 }); hap('light'); }
    if (pb.ph >= 0) { photos.dust(pb.ph, pb.x, pb.y, pb.size, reduced ? 4 : 9, { shape: 'stone', up: 14, speed: 18, sizePx: 3.5 }); E.checkpoint('photo', pb.ph); }
    else E.particles.burst(pb.x, pb.y, reduced ? 3 : 6, { speed: 30, colour: mix(pb.col, '#ffffff', 0.5), life: 0.9, size: 4 });
  }

  // ------------------------------------------------------------ field --
  function traceLine(li, x, y, t, amp) {
    const base = li * SMAX; let nn = 0;
    const h = stepPx;
    for (let k = 0; k < SMAX - 1; k++) {
      fieldAt(x, y); let m = Math.hypot(fbx, fby) || 1e-9;
      const ux = fbx / m, uy = fby / m;
      // display point (a little tremble while the pull is high; none when calm or reduced)
      const j = amp ? amp * Math.sin(k * 0.83 + t * 12 + li * 2.1) * Math.sin(k * 0.21 + li * 1.3 + t * 2) : 0;
      LX[base + nn] = x - uy * j; LY[base + nn] = y + ux * j; LR[base + nn] = rho(x, y); nn++;
      const xm = x + ux * h * 0.5, ym = y + uy * h * 0.5;
      fieldAt(xm, ym); m = Math.hypot(fbx, fby) || 1e-9;
      x += (fbx / m) * h; y += (fby / m) * h;
      if (k > 3 && ((x - Sx) ** 2 + (y - Sy) ** 2 < killS2 || (x - Mx) ** 2 + (y - My) ** 2 < killM2)) { LX[base + nn] = x; LY[base + nn] = y; LR[base + nn] = rho(x, y); nn++; break; }
      if (rho(x, y) > 1) break;
    }
    LN[li] = nn;
  }
  function traceField(t) {
    const amp = reduced ? 0 : Math.max(0, pullEff) * (heavy ? 0.9 : 1.8) * (1 - calm0) * s;
    const aS = Math.atan2(msy, msx), aM = Math.atan2(mby, mbx);
    const rs = stoneH * 0.45, rm = magL * 0.44;
    for (let i = 0; i < NL_S; i++) { const a = aS + lerp(-1.3, 1.3, (i + 0.5) / NL_S); traceLine(i, Sx + Math.cos(a) * rs, Sy + Math.sin(a) * rs, t, amp); }
    for (let i = 0; i < NL_M; i++) { const a = aM + lerp(-1.15, 1.15, (i + 0.5) / NL_M); traceLine(NL_S + i, Mx + Math.cos(a) * rm, My + Math.sin(a) * rm, t, amp * 0.6); }
  }
  const BUCKETS = [0.6, 0.74, 0.87, 1.01], BUCKET_A = [1, 0.66, 0.38, 0.14];
  function pathBucket(b, from, to) {
    const lo = b ? BUCKETS[b - 1] : -1, hi = BUCKETS[b];
    g.beginPath();
    let any = false;
    for (let li = from; li < to; li++) {
      const base = li * SMAX, nn = LN[li];
      let run = false;
      for (let k = 0; k < nn; k++) {
        const r = LR[base + k];
        if (r >= lo && r < hi) {
          if (!run) { const q = k ? k - 1 : 0; g.moveTo(LX[base + q], LY[base + q]); run = true; any = true; }
          g.lineTo(LX[base + k], LY[base + k]);
        } else if (run) { g.lineTo(LX[base + k], LY[base + k]); run = false; }
      }
    }
    return any;
  }
  function drawField(t, fin) {
    const stoneCol = mix(WARM, CALM, relief * 0.85 + fin * 0.15);
    const magCol = mix(BLUE, CALM, fin * 0.4);
    const gr = g.createLinearGradient(Sx, Sy, Mx, My);
    gr.addColorStop(0, stoneCol); gr.addColorStop(0.55, mix(stoneCol, magCol, 0.6)); gr.addColorStop(1, magCol);
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.9);
    const lineA = (0.7 + 0.3 * attr) * (0.75 + 0.25 * breathe) * (1 + fin * 0.15);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let b = 0; b < 4; b++) {
      if (!pathBucket(b, 0, NL)) continue;
      const ba = BUCKET_A[b] * lineA;
      if (lightSky) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.2 * ba; g.strokeStyle = INK; g.lineWidth = 3.4; g.stroke(); }
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = gr;
      g.globalAlpha = 0.13 * ba; g.lineWidth = 7 * s; g.stroke();
      g.globalAlpha = 0.55 * ba; g.lineWidth = 1.25; g.stroke();
      if (b < 3) {
        g.setLineDash([2.4 * s, 15 * s]); g.lineDashOffset = -flowPh;
        g.globalAlpha = 0.85 * ba; g.lineWidth = 2.3 * s; g.strokeStyle = mix(stoneCol, '#ffffff', 0.45); g.stroke();
        if (twistAt >= 0 && twistKind === 0) {
          const k = (t - twistAt) / 3.4;
          if (k < 1) { g.setLineDash([26 * s, 2400]); g.lineDashOffset = -k * 520 * s; g.globalAlpha = 0.5 * ba * Math.sin(k * Math.PI); g.lineWidth = 3.2 * s; g.strokeStyle = '#ffffff'; g.stroke(); }
        }
        g.setLineDash([]);
      }
    }
    g.restore();
  }

  // ---------------------------------------------------------- filings --
  function drawFilings(dt, t, fin) {
    const pullAmb = Math.max(0, 1 - relief * 1.15) * (1 - calm0 * 0.65) * (1 - fin) * (heavy ? 0.55 : 1);
    const len = 3.6 * s;
    const sk = stoneH * 0.52;
    for (let i = 0; i < NF; i++) {
      let x = FX[i], y = FY[i];
      fieldAt(x, y);
      let m = Math.hypot(fbx, fby) || 1e-9, ux = fbx / m, uy = fby / m;
      if (probeK > 0.01) {
        const dx = probeX - x, dy = probeY - y, d2 = dx * dx + dy * dy, wgt = probeK * Math.exp(-d2 / (70 * 70 * s * s));
        if (wgt > 0.01) { const d = Math.sqrt(d2) || 1; ux += (dx / d) * wgt * 2; uy += (dy / d) * wgt * 2; const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l; }
      }
      FC[i] = ux; FSn[i] = uy;
      FStr[i] = clamp((Math.log(m) + 0.5) / 4.5);
      // the pull drags the filings towards the words; it stops once the pull eases
      if (pullAmb > 0.01 && dt > 0) {
        const dx = Sx - x, dy = Sy - y, d = Math.hypot(dx, dy) || 1;
        const v = pullAmb * 20 * s * clamp(1.25 - d / (W * 0.75), 0.2, 1);
        const sg = ux * dx + uy * dy >= 0 ? 1 : -1;
        x += ((dx / d) * 0.55 + ux * sg * 0.45) * v * dt; y += ((dy / d) * 0.55 + uy * sg * 0.45) * v * dt;
        FX[i] = x; FY[i] = y;
        if (d < sk || rho(x, y) > 1.02) respawnFiling(i);
      }
      FAge[i] += dt;
    }
    g.save(); g.lineCap = 'round';
    const col = lightSky ? INK : mix('#ffffff', CALM, 0.4 + relief * 0.4);
    g.globalCompositeOperation = lightSky ? 'source-over' : 'lighter';
    g.strokeStyle = col; g.lineWidth = 1.3 * s;
    for (let b = 0; b < 3; b++) {
      g.beginPath();
      for (let i = 0; i < NF; i++) {
        const st = FStr[i] * clamp(FAge[i] / 0.8) * clamp((1.02 - rho(FX[i], FY[i])) * 6);
        const bk = st < 0.33 ? 0 : st < 0.66 ? 1 : 2;
        if (bk !== b) continue;
        const l = len * (0.8 + FStr[i] * 0.6);
        g.moveTo(FX[i] - FC[i] * l, FY[i] - FSn[i] * l); g.lineTo(FX[i] + FC[i] * l, FY[i] + FSn[i] * l);
      }
      g.globalAlpha = (lightSky ? 0.18 : 0.16) + b * 0.16 + fin * 0.06;
      g.stroke();
    }
    g.restore();
  }

  // ---------------------------------------------------------- guides --
  function drawGuides(t, fin) {
    if (finAt >= 0 || E.phase !== 'play') return;
    g.save(); g.lineCap = 'round';
    if (!docked) {
      // the approach groove and the dock ring
      const u0 = clamp(shown / A_END);
      g.setLineDash([2, 9]); g.lineDashOffset = -t * 10; g.strokeStyle = rgba(lightSky ? INK : '#ffffff', 0.32); g.lineWidth = 2;
      g.beginPath(); railPoint(u0, tmp); g.moveTo(tmp.x, tmp.y);
      for (let k = 1; k <= 20; k++) { railPoint(lerp(u0, 1, k / 20), tmp); g.lineTo(tmp.x, tmp.y); }
      g.stroke(); g.setLineDash([]);
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      g.save(); g.translate(dock.x, dock.y); g.rotate(-Math.PI / 2);
      g.strokeStyle = rgba(BLUE, 0.3 + 0.2 * pulse); g.lineWidth = 1.6; g.setLineDash([4, 6]);
      bodyPath(magL * 1.08, magW * 1.18); g.stroke(); g.setLineDash([]);
      g.restore();
      glow(g, dock.x, dock.y, magL * 0.55, BLUE, 0.12 + 0.08 * pulse);
    } else if (prog < 0.999) {
      // the turn guide: a dotted arc from the tip round to the calm end, with drifting chevrons
      const rem = (1 - shown) / (1 - A_END) * SPIN;
      const a0 = ang, a1 = ang + spinDir * rem, rr = magL * 0.66;
      const on = drags.size ? 1 : 0.65 + 0.35 * Math.sin(t * 2.4);
      g.setLineDash([2, 8]); g.strokeStyle = rgba(lightSky ? INK : CALM, 0.42 * on); g.lineWidth = 2;
      g.beginPath(); g.arc(dock.x, dock.y, rr, Math.min(a0, a1), Math.max(a0, a1)); g.stroke(); g.setLineDash([]);
      for (let c = 0; c < 3; c++) {
        const k = ((t * 0.35 + c / 3) % 1), a = a0 + spinDir * rem * k;
        const x = dock.x + Math.cos(a) * rr, y = dock.y + Math.sin(a) * rr, d = a + spinDir * Math.PI / 2;
        g.strokeStyle = rgba(CALM, 0.75 * Math.sin(k * Math.PI) * on); g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + Math.cos(d + 2.5) * 6 * s, y + Math.sin(d + 2.5) * 6 * s); g.lineTo(x, y); g.lineTo(x + Math.cos(d - 2.5) * 6 * s, y + Math.sin(d - 2.5) * 6 * s); g.stroke();
      }
      const ex = dock.x + Math.cos(a1) * rr, ey = dock.y + Math.sin(a1) * rr;
      glow(g, ex, ey, 16 * s, CALM, 0.35 * on);
    }
    g.restore();
  }
  function drawGapCushion(t, fin) {
    // the safe gap: two soft brackets either side, and at rest a cushion of light between the stones
    const top = Sy + stoneRy, bot = docked ? dock.y - (Math.abs(Math.cos(ang)) * magL * 0.5 + Math.abs(Math.sin(ang)) * magW * 0.5) : dock.y - magL / 2;
    const gy = (home.y + stoneRy + dock.y - magL / 2) / 2, hw = Math.max(magW * 0.85, stoneW * 0.32);
    const ready = smooth(invLerp(0.55, 1, relief)), restK = doneFlag ? 1 : 0;
    const a = 0.22 + 0.4 * ready + fin * 0.2;
    g.save(); g.lineCap = 'round';
    g.strokeStyle = rgba(lightSky ? INK : CALM, a * (lightSky ? 0.6 : 0.8)); g.lineWidth = 2;
    for (const sd of [-1, 1]) {
      const x = home.x + sd * hw;
      g.beginPath(); g.moveTo(x - sd * 7 * s, gy - gapSafe * 0.32); g.quadraticCurveTo(x, gy, x - sd * 7 * s, gy + gapSafe * 0.32); g.stroke();
    }
    g.restore();
    const cushion = Math.max(ready * 0.5, restK) * (0.75 + 0.25 * Math.sin(t * 1.1)) + fin * 0.4;
    if (cushion > 0.02 && bot > top) {
      const cy = (top + bot) / 2, hh = Math.max(3, (bot - top) * 0.5);
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(home.x, cy); g.scale(1, hh / (hw * 1.05));
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, hw * 1.05);
      gr.addColorStop(0, rgba(CALM, 0.3 * cushion)); gr.addColorStop(0.6, rgba(CALM, 0.12 * cushion)); gr.addColorStop(1, rgba(CALM, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, hw * 1.05, 0, TAU); g.fill(); g.restore();
    }
  }

  // ----------------------------------------------------------- stone --
  function makeStoneSprite() {
    const sw = stoneW, sh = stoneH;
    const c = makeCanvas(Math.ceil(sw * dpr), Math.ceil(sh * dpr)), cg = c.getContext('2d');
    cg.scale(dpr, dpr);
    shapePath(cg, 'stone', sw, sh, stoneSeed);
    cg.save(); cg.clip();
    const gr = cg.createRadialGradient(sw * 0.36, sh * 0.3, sh * 0.04, sw * 0.52, sh * 0.56, sw * 0.64);
    gr.addColorStop(0, STONE_HI); gr.addColorStop(0.42, STONE_MID); gr.addColorStop(1, STONE_LO);
    cg.fillStyle = gr; cg.fillRect(0, 0, sw, sh);
    const r = rng(stoneSeed * 17 + 5);
    for (let i = 0; i < 3; i++) {
      const y0 = sh * (0.28 + i * 0.22 + r() * 0.06);
      cg.strokeStyle = `rgba(255,255,255,${0.04 + r() * 0.04})`; cg.lineWidth = 2 + r() * 5;
      cg.beginPath(); cg.moveTo(-6, y0); cg.bezierCurveTo(sw * 0.3, y0 - 10 + r() * 20, sw * 0.7, y0 - 10 + r() * 20, sw + 6, y0 - 6 + r() * 12); cg.stroke();
    }
    for (let i = 0; i < 190; i++) {
      const x = r() * sw, y = r() * sh, rr = 0.3 + r() * 1.2;
      cg.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.04 + r() * 0.12})` : `rgba(0,0,12,${0.08 + r() * 0.16})`;
      cg.beginPath(); cg.arc(x, y, rr, 0, TAU); cg.fill();
    }
    const sh2 = cg.createLinearGradient(0, 0, sw * 0.8, sh);
    sh2.addColorStop(0, 'rgba(255,255,255,0.1)'); sh2.addColorStop(0.5, 'rgba(0,0,0,0)'); sh2.addColorStop(1, 'rgba(0,0,14,0.42)');
    cg.fillStyle = sh2; cg.fillRect(0, 0, sw, sh);
    cg.restore();
    shapePath(cg, 'stone', sw, sh, stoneSeed);
    const rim = cg.createLinearGradient(0, 0, sw, sh);
    rim.addColorStop(0, 'rgba(255,255,255,0.5)'); rim.addColorStop(0.5, 'rgba(255,255,255,0.05)'); rim.addColorStop(1, rgba(BLUE, 0.3));
    cg.strokeStyle = rim; cg.lineWidth = 1.6; cg.stroke();
    return c;
  }
  const vein = (() => { const r = rng(stoneSeed * 7 + 1); return [r() * 0.2 + 0.08, r() * 0.3 + 0.45, r() * 0.3 + 0.35, r() * 0.4 + 0.2, r() * 0.3 + 0.55, r() * 0.3 + 0.62, r() * 0.15 + 0.85, r() * 0.3 + 0.4]; })();
  function stoneClip() { g.translate(-stoneW / 2, -stoneH / 2); shapePath(g, 'stone', stoneW, stoneH, stoneSeed); g.translate(stoneW / 2, stoneH / 2); }
  function drawStone(t, fin) {
    const hot = Math.max(0, pullEff);
    const halo = mix(WARM, CALM, relief * 0.9 + fin * 0.1);
    glow(g, Sx, Sy, stoneW * 0.95, halo, 0.22 + 0.2 * hot + fin * 0.1);
    softShadow(g, Sx + 6 * s, Sy + stoneH * 0.58 + 4 * s, stoneW * 0.4, stoneH * 0.1, 0.22);
    const stretch = 1 + hot * 0.035;
    g.save(); g.translate(Sx, Sy); g.rotate(tilt); g.scale(1 / Math.sqrt(stretch), stretch);
    if (hero >= 0) {
      photos.draw(g, hero, 0, 0, stoneW, { shape: 'stone', seed: stoneSeed, tone: 'ember', toneMix: hot * 0.6, glow: 0.25 + 0.2 * hot, glowColour: halo, shadow: false });
    } else {
      g.drawImage(stoneSprite, -stoneW / 2, -stoneH / 2, stoneW, stoneH);
    }
    // living light inside the stone: the pull's warm face, a mineral vein, a cool sheen as it eases
    g.save(); stoneClip(); g.clip(); g.globalCompositeOperation = 'lighter';
    const c = Math.cos(-tilt), sn = Math.sin(-tilt);
    let fdx = Mx - Sx, fdy = My - Sy; const fl = Math.hypot(fdx, fdy) || 1; fdx /= fl; fdy /= fl;
    const lx = (fdx * c - fdy * sn) * stoneW * 0.42, ly = (fdx * sn + fdy * c) * stoneH * 0.46;
    if (hot > 0.02) {
      const wg = g.createRadialGradient(lx, ly, 0, lx, ly, stoneW * 0.62);
      wg.addColorStop(0, rgba(WARM, (hero >= 0 ? 0.38 : 0.55) * hot)); wg.addColorStop(1, rgba(WARM, 0));
      g.fillStyle = wg; g.fillRect(-stoneW / 2, -stoneH / 2, stoneW, stoneH);
    }
    const vcol = mix(WARM, CALM, relief), va = (hero >= 0 ? 0.18 : 0.32) * (0.75 + 0.25 * Math.sin(t * 1.3)) + 0.12 * hot;
    g.strokeStyle = rgba(vcol, va); g.lineWidth = 1.6 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo((vein[0] - 0.5) * stoneW, (vein[1] - 0.5) * stoneH);
    g.bezierCurveTo((vein[2] - 0.5) * stoneW, (vein[3] - 0.5) * stoneH, (vein[4] - 0.5) * stoneW, (vein[5] - 0.5) * stoneH, (vein[6] - 0.5) * stoneW, (vein[7] - 0.5) * stoneH); g.stroke();
    g.lineWidth = 5 * s; g.strokeStyle = rgba(vcol, va * 0.3); g.stroke();
    const sg = g.createLinearGradient(-stoneW / 2, -stoneH / 2, stoneW * 0.1, stoneH * 0.1);
    sg.addColorStop(0, `rgba(255,255,255,${0.1 + relief * 0.08})`); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.fillRect(-stoneW / 2, -stoneH / 2, stoneW, stoneH);
    g.restore();
    // polished highlight
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.09)';
    g.beginPath(); g.ellipse(-stoneW * 0.18, -stoneH * 0.28, stoneW * 0.24, stoneH * 0.09, -0.25, 0, TAU); g.fill(); g.restore();
    // the words, part of the stone
    if (E.phase !== 'law') {
      const size = clamp(stoneW * 0.088, 12.5, 17);
      if (hero >= 0) words.draw(g, 0, stoneH * 0.22, { style: 'plate', size: size * 0.92, maxWidth: stoneW * 0.8, lines: 2, glowColour: halo });
      else words.draw(g, 0, stoneH * 0.02, { style: 'light', size, maxWidth: stoneW * 0.74, lines: 3, glowColour: halo, colour: '#fff7ec' });
    }
    g.restore();
  }

  // --------------------------------------------------------- pebbles --
  function makePebbleSprite(i) {
    const sz = pebSize * 0.8, sw = sz, sh = sz / 1.3;
    const c = makeCanvas(Math.ceil(sw * dpr), Math.ceil(sh * dpr)), cg = c.getContext('2d');
    cg.scale(dpr, dpr);
    const col = PEB_COLS[i];
    shapePath(cg, 'stone', sw, sh, 21 + i * 4);
    cg.save(); cg.clip();
    const gr = cg.createRadialGradient(sw * 0.34, sh * 0.3, 1, sw * 0.5, sh * 0.55, sw * 0.62);
    gr.addColorStop(0, mix(col, '#ffffff', 0.55)); gr.addColorStop(0.4, col); gr.addColorStop(1, mix(col, '#07051a', 0.65));
    cg.fillStyle = gr; cg.fillRect(0, 0, sw, sh);
    const r = rng(31 + i);
    for (let k = 0; k < 26; k++) { cg.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.14})`; cg.beginPath(); cg.arc(r() * sw, r() * sh, 0.3 + r() * 0.8, 0, TAU); cg.fill(); }
    cg.restore();
    cg.globalCompositeOperation = 'lighter'; cg.fillStyle = 'rgba(255,255,255,0.28)';
    cg.beginPath(); cg.ellipse(sw * 0.36, sh * 0.27, sw * 0.17, sh * 0.08, -0.35, 0, TAU); cg.fill();
    return c;
  }
  function pebbleSize(pb) { return pb.ph >= 0 ? pebSize : pebSize * 0.8; }
  function attachPos(pb, out) {
    const sz = pebbleSize(pb);
    out.x = Sx + Math.cos(pb.ang) * (stoneW * 0.46 + sz * 0.28);
    out.y = Sy + Math.sin(pb.ang) * (stoneH * 0.46 + sz * 0.26);
    return out;
  }
  let orbit = 0;
  function restPos(pb, out, fin = 0) {
    const sz = pebbleSize(pb), gp = (14 + fin * 8) * s, a = pb.ang + orbit;
    out.x = home.x + Math.cos(a) * (stoneW * 0.46 + sz * 0.5 + gp);
    out.y = home.y + Math.sin(a) * (stoneH * 0.46 + sz * 0.42 + gp) - fin * 5 * s;
    out.x = clamp(out.x, stage.x + sz * 0.55, stage.x + W - sz * 0.55);
    out.y = Math.max(out.y, stage.y + sz * 0.45);
    return out;
  }
  function placePebble(pb, snap) { pb.size = pebbleSize(pb); if (snap) { if (pb.det) restPos(pb, pb); else attachPos(pb, pb); pb.vx = pb.vy = 0; } }
  function drawPebbles(dt, t, fin) {
    if (finAt >= 0) orbit += dt * 0.05 * fin * (reduced ? 0.3 : 1);
    for (const pb of pebs) {
      pb.size = pebbleSize(pb);
      if (pb.det) {
        restPos(pb, tmp, fin);
        const bob = reduced ? 0 : Math.sin(t * 0.9 + pb.ph0) * 2.2 * s;
        pb.vx += (-(pb.x - tmp.x) * 26 - pb.vx * 6.5) * dt; pb.vy += (-(pb.y - tmp.y - bob) * 26 - pb.vy * 6.5) * dt;
        pb.x += pb.vx * dt; pb.y += pb.vy * dt;
        pb.att = Math.max(0, pb.att - dt / 0.9);
      } else {
        attachPos(pb, tmp);
        const tr = reduced || heavy ? 0 : Math.max(0, pullEff) * (1 - calm0) * 1.2 * s;
        pb.x = tmp.x + (tr ? Math.sin(t * 31 + pb.i * 3) * tr : 0); pb.y = tmp.y + (tr ? Math.cos(t * 27 + pb.i) * tr : 0);
      }
      const sz = pb.size, hot = Math.max(0, pullEff) * pb.att;
      // while clinging: a short taut field bridge to the stone; after: a calm halo
      if (pb.att > 0.02) {
        const ex = lerp(pb.x, Sx, 0.38), ey = lerp(pb.y, Sy, 0.38);
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(WARM, 0.45 * pb.att); g.lineWidth = 2 * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(pb.x, pb.y); g.lineTo(ex, ey); g.stroke(); g.restore();
      }
      glow(g, pb.x, pb.y, sz * 0.85, mix(WARM, CALM, 1 - pb.att), 0.2 + 0.15 * (1 - pb.att) + fin * 0.15);
      const rot = Math.sin(t * 0.5 + pb.ph0) * 0.08 * (1 - pb.att) + pb.ang * 0.05;
      if (pb.ph >= 0) photos.draw(g, pb.ph, pb.x, pb.y, sz, { shape: 'stone', seed: pb.seed, rot, tone: 'ember', toneMix: hot * 0.55, glow: 0.2, glowColour: mix(WARM, CALM, 1 - pb.att), shadow: false });
      else {
        const spr = pebSprites[pb.sp]; const w0 = pebSize * 0.8, h0 = w0 / 1.3, k = sz / w0;
        g.save(); g.translate(pb.x, pb.y); g.rotate(rot); g.drawImage(spr, -w0 * k / 2, -h0 * k / 2, w0 * k, h0 * k); g.restore();
        if (hot > 0.05) glow(g, pb.x, pb.y, sz * 0.4, WARM, hot * 0.35);
      }
    }
  }

  // ---------------------------------------------------------- magnet --
  function bodyPath(L, Wd) {
    const hl = L / 2, hw = Wd / 2;
    g.beginPath();
    g.moveTo(hl, 0);
    g.bezierCurveTo(hl * 0.98, -hw * 0.5, hl * 0.6, -hw, hl * 0.05, -hw);
    g.bezierCurveTo(-hl * 0.55, -hw, -hl, -hw * 0.78, -hl, 0);
    g.bezierCurveTo(-hl, hw * 0.78, -hl * 0.55, hw, hl * 0.05, hw);
    g.bezierCurveTo(hl * 0.6, hw, hl * 0.98, hw * 0.5, hl, 0);
    g.closePath();
  }
  function drawMagnet(t, fin) {
    const L = magL, Wd = magW;
    const held = drags.size > 0;
    const hot = Math.max(0, pullEff);
    glow(g, Mx, My, L * 1.05, BLUE, 0.3 + 0.12 * Math.sin(t * 1.6) + (held ? 0.12 : 0) + fin * 0.1);
    softShadow(g, Mx + 5 * s, My + Wd * 0.95, L * 0.45, Wd * 0.2, 0.24);
    g.save(); g.translate(Mx, My); g.rotate(ang);
    const c = Math.cos(ang), sn = Math.sin(ang);
    const wx = -L * 0.16, wy = -Wd * 0.5, lx = c * wx + sn * wy, ly = -sn * wx + c * wy;   // world-fixed key light
    bodyPath(L, Wd);
    const gr = g.createRadialGradient(lx, ly, Wd * 0.04, lx * 0.25, ly * 0.25, L * 0.62);
    gr.addColorStop(0, '#e4f5ff'); gr.addColorStop(0.16, mix('#86ccff', BLUE, 0.3)); gr.addColorStop(0.55, mix('#2a66de', BLUE, 0.15)); gr.addColorStop(1, '#0a1a54');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    // the tip half: warm while it pulls, ice-bright once it is turned away
    const tipCol = mix(WARM, '#eaf7ff', relief * 0.9 + fin * 0.1);
    const tg = g.createLinearGradient(L * 0.04, 0, L * 0.5, 0);
    tg.addColorStop(0, rgba(tipCol, 0)); tg.addColorStop(0.55, rgba(tipCol, 0.35 + 0.25 * hot)); tg.addColorStop(1, rgba(tipCol, 0.7));
    g.globalCompositeOperation = 'lighter'; g.fillStyle = tg; g.fillRect(0, -Wd, L, Wd * 2);
    g.globalCompositeOperation = 'source-over';
    // body shading opposite the light
    const dg = g.createLinearGradient(lx, ly, -lx, -ly);
    dg.addColorStop(0, 'rgba(0,0,20,0)'); dg.addColorStop(1, 'rgba(0,0,20,0.35)');
    g.fillStyle = dg; g.fillRect(-L, -Wd, L * 2, Wd * 2);
    // silver seam between the poles
    g.strokeStyle = 'rgba(228,240,255,0.7)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(L * 0.07, -Wd * 0.55); g.quadraticCurveTo(L * 0.0, 0, L * 0.07, Wd * 0.55); g.stroke();
    g.strokeStyle = 'rgba(10,20,60,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(L * 0.05, -Wd * 0.55); g.quadraticCurveTo(-L * 0.02, 0, L * 0.05, Wd * 0.55); g.stroke();
    // grip ridges on the tip (where to turn it)
    g.strokeStyle = rgba('#ffffff', 0.28 + (docked ? 0.25 : 0)); g.lineWidth = 1.3;
    for (let k = 0; k < 3; k++) { const x = L * (0.26 + k * 0.06); g.beginPath(); g.moveTo(x, -Wd * 0.3); g.quadraticCurveTo(x + L * 0.02, 0, x, Wd * 0.3); g.stroke(); }
    g.restore();
    // specular + rim
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.32)';
    g.beginPath(); g.ellipse(lx * 0.75, ly * 0.75, L * 0.13, Wd * 0.09, Math.atan2(ly, lx) + Math.PI / 2, 0, TAU); g.fill(); g.restore();
    bodyPath(L, Wd); g.strokeStyle = 'rgba(200,232,255,0.5)'; g.lineWidth = 1.2; g.stroke();
    g.restore();
    // the glowing tip (the handle you turn)
    const tx = Mx + Math.cos(ang) * L * 0.43, ty = My + Math.sin(ang) * L * 0.43;
    const tipPulse = docked && prog < 0.999 && !held ? 0.5 + 0.5 * Math.sin(t * 3) : 0.6;
    glow(g, tx, ty, L * 0.26 * (1 + 0.15 * tipPulse), mix(WARM, CALM, relief), 0.45 + 0.3 * hot + 0.15 * tipPulse);
    glint(g, tx, ty, 6 * s + 2 * tipPulse, '#ffffff', 0.5 + 0.3 * tipPulse, t * 0.3);
    if (!reduced && !lowStim && hot > 0.35 && Math.random() < hot * 0.25) E.particles.emit({ x: tx, y: ty, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 14, life: 0.8, size: 4, colour: WARM, alpha: 0.6 });
  }

  // ----------------------------------------------------- twist/finale --
  const lights = [{ x: 0, y: 0, a: 0 }, { x: 0, y: 0, a: 0 }, { x: 0, y: 0, a: 0 }];
  function drawTwist(t) {
    if (twistAt < 0) return;
    const k = t - twistAt;
    if (twistKind === 1) {
      // three resting lights rise from the gap and settle into a small calm path beside the stones
      const gx = home.x, gy = (home.y + stoneRy + dock.y - magL / 2) / 2;
      lights.forEach((l, i) => {
        const kk = smooth(clamp((k - i * 0.35) / 1.8));
        if (kk <= 0) return;
        const tx = home.x - side * (stoneW * 0.5 + 18 * s + i * 22 * s), ty = gy + magL * 0.15 + i * 16 * s;
        l.x = lerp(gx, tx, ease.inOutSine(kk)); l.y = lerp(gy, ty, ease.inOutSine(kk)) - Math.sin(kk * Math.PI) * 18 * s;
        glow(g, l.x, l.y, 16 * s, CALM, 0.5 * kk); glow(g, l.x, l.y, 5 * s, '#ffffff', 0.7 * kk);
      });
    } else if (twistKind === 2) {
      // a slow compass rose blooms at the field's quiet point in the gap
      const gk = smooth(clamp(k / 1.2)) * (1 - smooth(clamp((k - 4) / 1.5)));
      if (gk <= 0) return;
      const gx = home.x, gy = (Sy + stoneRy + My - magL / 2) / 2;
      g.save(); g.translate(gx, gy); g.rotate(t * 0.15); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.fillStyle = rgba(CALM, 0.35 * gk); g.beginPath(); g.moveTo(0, 0); g.lineTo(3 * s, -4 * s); g.lineTo(0, -16 * s * gk); g.lineTo(-3 * s, -4 * s); g.closePath(); g.fill(); }
      g.restore();
      glow(g, gx, gy, 22 * s, CALM, 0.4 * gk);
    }
  }
  function drawFinale(t, fin) {
    const k = t - finAt;
    const gy = (Sy + stoneRy + dock.y - magW / 2) / 2;
    if (!heavy && !reduced && k < 1.8 && Math.random() < (lowStim ? 0.25 : 0.6)) {
      E.particles.emit({ x: home.x + (Math.random() - 0.5) * stoneW * 0.6, y: gy, vx: (Math.random() - 0.5) * 16, vy: -18 - Math.random() * 20, life: 1.6, size: 5, colour: Math.random() < 0.5 ? CALM : '#ffffff', alpha: 0.7 });
    }
    // a slow halo breathing around the pair
    g.save(); g.globalCompositeOperation = 'lighter';
    const rr = stoneW * (0.7 + 0.06 * Math.sin(t * 0.9));
    g.strokeStyle = rgba(CALM, 0.18 * fin); g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(home.x, (home.y + dock.y) / 2, rr, (dock.y - home.y) * 0.5 + stoneH * 0.75, 0, 0, TAU); g.stroke();
    g.restore();
  }

  // ------------------------------------------------------------ input --
  function startHum() { if (!hum) { hum = E.hold('hum', { intensity: 0.1 }); humOff = -1; } }
  function applySpin(dA, dt) {
    if (!docked || finAt >= 0 || !dA) return;
    if (!spinChosen && prog <= A_END + 1e-3) {
      spinAcc += dA;
      if (Math.abs(spinAcc) < 0.1) return;
      spinChosen = true; spinDir = spinAcc > 0 ? 1 : -1; dA = spinAcc; spinAcc = 0;
    }
    spinChosen = true;
    const speed = Math.abs(dA) / Math.max(1 / 120, dt);
    const k = lerp(1, 0.4, invLerp(5, 12, speed));          // a hurried turn drags
    let w = clamp(wanted + ((dA * spinDir) / SPIN) * (1 - A_END) * k, A_END, 1);
    if (w > prog + BANK) { if (E.locked) refuse(); w = prog + BANK; }
    wanted = w;
  }
  function spinners() { let a = null, b = null; for (const d of drags.values()) if (d.mode === 'spin') { if (!a) a = d; else if (!b) b = d; } return [a, b]; }

  return {
    get progress() { return clamp(prog); },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      const dM = Math.hypot(p.x - Mx, p.y - My);
      const d = { mode: 'probe', x: p.x, y: p.y, ox: 0, oy: 0, a: 0, t: p.t };
      if (!docked && dM < grabR) {
        d.mode = 'move'; d.ox = Mx - p.x; d.oy = My - p.y;
        E.sound('click', { intensity: 0.35 }); hap('light', 0); startHum();
      } else if (docked && dM < spinR && prog < 0.999) {
        d.mode = 'spin'; d.a = Math.atan2(p.y - My, p.x - Mx);
        E.sound('click', { intensity: 0.3, pitch: 1.2 }); hap('light', 0); startHum(); pairA = null;
      } else {
        // anywhere else: the finger is a tiny probe — nearby filings turn towards it
        probeX = p.x; probeY = p.y; probeK = 1;
        const onStone = Math.hypot((p.x - Sx) / (stoneW * 0.55), (p.y - Sy) / (stoneH * 0.55)) < 1;
        if (onStone) { Svx += (Sx - p.x) * 2.2; Svy += (Sy - p.y) * 2.2; E.sound('bubble', { note: 2 + Math.floor(relief * 4), intensity: 0.25 }); }
        else E.sound('pluck', { note: 5 + Math.floor(Math.random() * 4), intensity: 0.18 });
        hap('tick');
      }
      drags.set(p.id, d);
    },
    move(p) {
      const d = drags.get(p.id);
      if (!d || finAt >= 0) return;
      const dt = Math.max(1 / 240, p.t - d.t); d.t = p.t;
      d.x = p.x; d.y = p.y;
      if (d.mode === 'move' && !docked) {
        const tx = p.x + d.ox, ty = p.y + d.oy;
        const u = nearestRailU(tx, ty);
        let want = u * A_END;
        if (want > prog + BANK) { if (E.locked) refuse(); want = prog + BANK; }
        wanted = want; assistTo = null;
        railPoint(u, tmp);
        let lx = tx - tmp.x, ly = ty - tmp.y; const ll = Math.hypot(lx, ly), cap = 20 * s;
        if (ll > cap) { lx *= cap / ll; ly *= cap / ll; }
        latTX = lx * 0.7; latTY = ly * 0.7;
      } else if (d.mode === 'spin') {
        const [a, b] = spinners();
        if (a && b && (d === a || d === b)) {
          // two fingers: twist
          const pa = Math.atan2(b.y - a.y, b.x - a.x);
          if (pairA != null) applySpin(angDiff(pairA, pa), dt);
          pairA = pa;
          a.a = Math.atan2(a.y - My, a.x - Mx); b.a = Math.atan2(b.y - My, b.x - Mx);
        } else {
          const r = Math.hypot(p.x - Mx, p.y - My), na = Math.atan2(p.y - My, p.x - Mx);
          if (r > 8) { applySpin(angDiff(d.a, na), dt); d.a = na; }
        }
        latTX = 0; latTY = 0;
      } else if (d.mode === 'probe') {
        probeX = p.x; probeY = p.y; probeK = 1;
      }
    },
    up(p) {
      const d = drags.get(p.id);
      if (!d) return;
      drags.delete(p.id);
      if (d.mode === 'spin') { pairA = null; for (const e of drags.values()) if (e.mode === 'spin') e.a = Math.atan2(e.y - My, e.x - Mx); }
      if (!drags.size) { latTX = 0; latTY = 0; }
    },
    assist() {
      if (finAt >= 0) return;
      const base = Math.max(wanted, prog);
      if (base < A_END - 1e-4) {
        let to = Math.min(A_END, base + A_END / 3 + 1e-4);
        if (A_END - to < 0.012) to = A_END;
        assistTo = to;
      } else {
        spinChosen = true;
        let to = Math.min(1, base + (1 - A_END) / 5);
        if (1 - to < 0.012) to = 1;
        assistTo = to;
      }
      E.sound('pluck', { note: 3 + Math.round(base * 5), intensity: 0.22 });
    },
    pointAt(p) {
      p = clamp(p);
      if (p <= A_END) {
        railPoint(p / A_END, tmp);
        const a = Math.atan2(home.y - tmp.y, home.x - tmp.x);
        return { x: tmp.x + Math.cos(a) * tipR, y: tmp.y + Math.sin(a) * tipR };
      }
      const a = -Math.PI / 2 + spinDir * ((p - A_END) / (1 - A_END)) * SPIN;
      return { x: dock.x + Math.cos(a) * tipR, y: dock.y + Math.sin(a) * tipR };
    },
    hint() {
      if (!docked) {
        const u0 = clamp(prog / A_END), pts = [[Mx, My]];
        for (let i = 1; i <= 14; i++) { railPoint(lerp(u0, 1, i / 14), tmp); pts.push([tmp.x, tmp.y]); }
        return { path: pts };
      }
      if (prog >= 0.999) return null;
      const rem = ((1 - prog) / (1 - A_END)) * SPIN, sweep = clamp(rem + 0.12, 0.5, 1.9);
      const a0 = -Math.PI / 2 + spinDir * ((prog - A_END) / (1 - A_END)) * SPIN, pts = [];
      for (let i = 0; i <= 18; i++) { const a = a0 + spinDir * sweep * (i / 18); pts.push([dock.x + Math.cos(a) * tipR, dock.y + Math.sin(a) * tipR]); }
      return { path: pts };
    },
    twist() {
      twistAt = E.now(); twistKind = (E.round + 2) % 3;
      const gy = (Sy + stoneRy + My - magL / 2) / 2;
      E.particles.burst(home.x, gy, reduced ? 4 : 10, { speed: 40, colour: CALM, life: 1.2, size: 5, kind: 'glint' });
    },
    finish() {
      finAt = E.now(); assistTo = null; drags.clear();
      if (hum) { hum.stop(); hum = null; }
      E.ripples.add(home.x, (home.y + stoneRy + dock.y - magL / 2) / 2, { colour: CALM, speed: 45, alpha: 0.5, r: 10 });
      E.sound(heavy ? 'settle' : 'shimmer', { intensity: 0.42 });
    },
    destroy() { if (hum) { hum.stop(); hum = null; } drags.clear(); },
  };
}
