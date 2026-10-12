// GE-18 · EMBER COOLER — embers under a copper grille (slide then dial).
// Slide the copper grille down its rails over the bright embers, then turn
// the vent dial (an iris damper) down. Less air reaches the bed, so the
// orange flicker softens — with a little thermal lag — into one steady ruby
// glow. Win: the vent rests at the ruby low mark.
//
// Photos are the round embers in the bed. Once the grille is in place each
// one sits framed in a copper ring, and as the vent closes past it, it cools
// from ember orange to a steady ruby glow and back towards its own colours.
// Words are cut into the grille's bronze band, lit from beneath.

import { TAU, clamp, lerp, invLerp, smooth, rgba, mix, glow, noise2, rng, roundRect, canvas, shadow, orb, FONT } from '../fx.js';
import { AngleTracker, Wobble } from '../kit.js';

export const meta = {
  id: 'GE-18',
  howTo: 'Slide the copper grille over the embers, then turn the vent down.',
  steps: [
    'Drag the copper grille down its rails over the bright embers.',
    'Turn the vent dial to the left, slowly — the embers answer.',
    'Rest the dial on the ruby mark while they glow steadily.',
  ],
  tapAlt: 'each press slides the grille or closes the vent one gentle notch',
  words: 'Your words are cut into the grille’s bronze band — lit from beneath, flickering orange at first, then a steady ruby.',
  photos: {
    where: 'Your photos are the round embers glowing beneath the grille.',
    becomes: 'bright embers in copper rings',
    touch: 'You slide the grille over them and turn the vent down;',
    change: 'each one cools from ember orange to a steady ruby glow, then softly back towards its own colours.',
    payoff: 'At the end they rest in their copper rings, warm and clear, like lanterns in a quiet hearth.',
  },
  finaleSec: 4.2,
};

const S1 = 0.32;                  // share of progress for the grille slide; the rest is the vent
const BANK = 0.035;               // how far input may run ahead of the gated state
const SLIDE_STEPS = 3, VENT_STEPS = 5;
const K = 7;                      // ember slots under the grille's rings
const BLADES = 7;                 // iris blades in the vent
const H_LOW = 0.2;                // the steady ruby heat at the low mark
const BREATH = TAU / 5.5;         // slow shared breathing of a settled bed

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = E.reduced, lowStim = E.lowStim, heavy = E.heavy;
  const calm0 = E.calm, R1 = E.round === 1;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const nz = noise2(E.seed + 18);
  const vr = rng(E.seed * 3 + 18);                 // visual-only randomness (sparks, motes)

  // ---- per-round variety (loop rounds rearrange and recolour)
  const flipRows = R1 ? false : E.rand() < 0.5;    // 4 rings over 3, or 3 over 4
  const rubyBase = R1 ? '#b8173c' : ['#c21a44', '#a3133a', '#c8263f', '#b01848'][Math.floor(E.rand() * 4)];
  const copperTone = R1 ? 0 : E.rand();            // bright copper … rose copper
  const SWEEP = R1 ? 2.2 : 2.0 + E.rand() * 0.4;   // vent travel (rad, anticlockwise)
  const A0 = -Math.PI / 2 + SWEEP / 2, A1 = A0 - SWEEP;
  const hStart = (heavy ? 0.86 : 1) - calm0 * 0.35;
  const agit = (heavy ? 0.62 : 1) * (1 - calm0 * 0.5) * (reduced ? 0.5 : 1);

  // ---- colours: embers are always orange → ruby; metal and light follow the realm
  const RUBY = mix(rubyBase, pal.accent, 0.1);
  const ROSE = mix('#ff8a9a', pal.glow, 0.2);
  const STOPS = [[0, mix('#4a0818', pal.deep, 0.3)], [H_LOW, RUBY], [0.4, '#de3a30'], [0.6, '#f45e22'], [0.8, '#ff9230'], [1, '#ffc760']];
  const RN = 24;   // quantised ramp: glow sprites are cached per colour
  const RAMP = Array.from({ length: RN }, (_, i) => {
    const h = i / (RN - 1); let j = 1;
    while (j < STOPS.length - 1 && STOPS[j][0] < h) j++;
    const [h0, c0] = STOPS[j - 1], [h1, c1] = STOPS[j];
    return mix(c0, c1, (h - h0) / (h1 - h0));
  });
  const hc = (h) => RAMP[Math.round(clamp(h) * (RN - 1))];
  const CU_D = mix('#3e170a', pal.deep, 0.2), CU_M = mix('#b2602e', '#b65a50', copperTone * 0.6);
  const CU_L = mix('#f3b07a', '#ffc0ae', copperTone * 0.4), CU_H = mix('#ffe6c8', pal.glow, 0.12);
  const IRON_D = mix('#0d0708', pal.deep, 0.35), IRON_M = mix('#261a1c', pal.deep, 0.25), IRON_H = mix('#5c4a4c', pal.glow, 0.15);
  const BRONZE_T = '#5e2e1a', BRONZE_B = '#2a120a';

  // ---- the coal bed (unit shapes, scaled at draw time)
  function blobPath(nv, jit, sc = 1, ox = 0, oy = 0) {
    const pts = [];
    for (let i = 0; i < nv; i++) { const a = (i / nv) * TAU + (E.rand() - 0.5) * 0.5, r = (1 - jit / 2 + E.rand() * jit) * sc; pts.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r * 0.86]); }
    const m = (i) => { const a = pts[i % nv], b = pts[(i + 1) % nv]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    const p = new Path2D(); const s = m(0); p.moveTo(s[0], s[1]);
    for (let i = 1; i <= nv; i++) { const c = pts[i % nv], e = m(i); p.quadraticCurveTo(c[0], c[1], e[0], e[1]); }
    p.closePath(); return p;
  }
  function crackPath(r0 = 0.1) {
    const p = new Path2D(), n = 2 + Math.floor(E.rand() * 2);
    for (let k = 0; k < n; k++) {
      let a = E.rand() * TAU, x = Math.cos(a) * r0, y = Math.sin(a) * r0; p.moveTo(x, y);
      for (let s = 0; s < 3; s++) { a += (E.rand() - 0.5) * 1.3; x += Math.cos(a) * 0.22; y += Math.sin(a) * 0.22; p.lineTo(x, y); }
    }
    return p;
  }
  const coals = [];
  for (let r = 0, CR = 6, CC = 10; r < CR; r++) for (let c = 0; c < CC; c++) {
    coals.push({
      u: ((c + 0.5 + (r % 2 ? 0.25 : -0.25)) / CC - 0.5) * 0.96 + (E.rand() - 0.5) * 0.04,
      v: ((r + 0.5) / CR - 0.5) * 0.92 + (E.rand() - 0.5) * 0.06,
      r: 0.042 + E.rand() * 0.02, path: blobPath(7 + Math.floor(E.rand() * 3), 0.28), cracks: crackPath(),
      ash: blobPath(6, 0.4, 0.42 + E.rand() * 0.18, (E.rand() - 0.5) * 0.7, (E.rand() - 0.5) * 0.6),
      ph: E.rand() * 60, fr: 0.5 + E.rand() * 0.8, bias: E.rand(), bp: E.rand() * TAU, hx: (E.rand() - 0.5) * 0.6, hy: (E.rand() - 0.5) * 0.6,
    });
  }
  const crustGrad = g.createRadialGradient(-0.35, -0.4, 0.05, 0, 0, 1.1);
  crustGrad.addColorStop(0, mix('#3c2622', pal.deep, 0.2)); crustGrad.addColorStop(0.6, '#1a0c0a'); crustGrad.addColorStop(1, '#090405');
  const pearlGrad = g.createRadialGradient(-0.3, -0.35, 0.1, 0, 0, 1);
  pearlGrad.addColorStop(0, '#4a2a22'); pearlGrad.addColorStop(0.55, '#1e0e0a'); pearlGrad.addColorStop(1, '#0c0506');

  // ---- ember slots: photos (or ember pearls) framed by the grille's rings
  const n = photos.n;
  const slotPh = new Array(K).fill(-1);
  if (n === 1) slotPh[R1 ? 5 : Math.floor(E.rand() * K)] = 0;
  else if (n > 1) { const shift = R1 ? 0 : Math.floor(E.rand() * K); for (let j = 0; j < n; j++) slotPh[(Math.round((j * K) / n) + shift) % K] = (j + E.round - 1) % n; }
  const emb = Array.from({ length: K }, () => ({ e: 1, fired: false, th: 0.5, rank: 0, cracks: crackPath(0.05),
    ash: blobPath(6, 0.4, 0.38 + E.rand() * 0.14, (E.rand() - 0.5) * 0.8, (E.rand() - 0.5) * 0.8) }));
  const slots = Array.from({ length: K }, () => ({ x: 0, y: 0 }));

  // ---- geometry
  let BW, BH, rim, rw, railX, GW, GH, SL, gy0, gy1, hh, hw, Rd, Ri, bx, by, dx, dy;
  let fw, bandH, rowH, cellR, ringW, wSize = 13, wLines = 1, side = false;
  let hearthC = null, vignC = null, grilleC = null, hotC = null, rubyC = null;
  const hearthO = { x: 0, y: 0, w: 1, h: 1 };
  let gW = 1, gH = 1, gOX = 0, gOY = 0;
  let bladeGrad = null, bezelGrad = null, knobGrad = null;

  // ---- state
  let wanted = 0, prog = 0, docked = false, dockAt = -1, doneFlag = false, finAt = -1, twistAt = -1;
  let assistTo = null, drag = null;
  let gyV = 0, gV = 0, strain = 0;                 // grille spring (y) + finger strain (px)
  let kA = A0, kV = 0, strainA = 0;                // vent knob spring (angle) + finger strain (rad)
  let heat = hStart, copperHeat = 0, sparkAcc = 0, moteAcc = 0;
  let lastSlideStep = 0, lastDet = 0, lastHap = -9, lastWait = -9, nudgeAt = -9, knobNudgeAt = -9, grabAt = -9, touchNote = 0, crackleAt = 0;
  const tracker = new AngleTracker();
  const wob = new Wobble(), wobG = new Wobble();

  function fit() {
    // stacked (tall stages) or vent beside the tray (short stages): whichever lets the hearth be bigger
    const BWv = Math.min(stage.w * 0.82, (stage.h * 0.95) / 1.8), BWs = Math.min((stage.w * 0.95) / 1.7, (stage.h * 0.95) / 1.3);
    side = BWs > BWv * 1.08;
    BW = side ? BWs : BWv;
    BH = BW * 0.56; rim = BW * 0.045; rw = Math.max(3, BW * 0.013);
    railX = BW / 2 + rim * 0.55; GW = 2 * railX - rw * 1.4; GH = BH * 1.04; hh = GH * 0.085; hw = GW * 0.22;
    Rd = BW * 0.17; Ri = Rd * 0.74;
    const T = GH + BH + 2 * rim + hh + (side ? 0 : 3.08 * Rd);
    const top = stage.y + (stage.h - T) / 2;
    bx = side ? stage.x + (stage.w - BW * 1.69) / 2 + BW / 2 + rim : stage.cx;
    gy0 = top + GH / 2; SL = GH / 2 + BH / 2 + rim; by = gy0 + SL; gy1 = by;
    if (side) { dx = bx + BW / 2 + rim + Rd * 0.25 + 1.64 * Rd; dy = by + BH * 0.12; }
    else { dx = bx; dy = by + BH / 2 + rim + hh + 1.42 * Rd; }
    buildSlots(); buildGradients(); buildHearth(); buildGrille();
    gyV = docked ? gy1 : lerp(gy0, gy1, clamp(prog / S1)); gV = 0;
  }

  function buildSlots() {
    fw = Math.max(4, GW * 0.028);
    // the words decide the band: one line if it fits, else two
    g.save(); g.font = `600 13px ${FONT}`; const tw = g.measureText(words.token || '').width; g.restore();
    wLines = tw > GW * 0.8 ? 2 : 1;
    bandH = Math.max(wLines === 2 ? 36 : 28, GH * 0.18);
    wSize = wLines === 2 ? Math.max(12, Math.min(14, bandH * 0.36)) : clamp(bandH * 0.44, 12, 16);
    rowH = (GH - 2 * fw - bandH) / 2;
    const nTop = flipRows ? 3 : 4, nBot = K - nTop, pitch = (GW - 2 * fw) / 4.25;
    cellR = Math.max(8, Math.min(rowH * 0.42, pitch * 0.4));
    ringW = Math.max(2.5, cellR * 0.15);
    for (let i = 0; i < K; i++) {
      const top = i < nTop, j = top ? i : i - nTop, cnt = top ? nTop : nBot;
      slots[i].x = (j - (cnt - 1) / 2) * pitch;
      slots[i].y = top ? -(bandH / 2 + rowH / 2) : bandH / 2 + rowH / 2;
    }
  }

  function buildGradients() {
    bladeGrad = g.createRadialGradient(-Ri * 0.3, -Ri * 0.35, Ri * 0.1, 0, 0, Ri);
    bladeGrad.addColorStop(0, mix('#7a4428', CU_M, 0.2)); bladeGrad.addColorStop(0.55, '#341a10'); bladeGrad.addColorStop(1, '#150a07');
    bezelGrad = g.createLinearGradient(-Rd, -Rd, Rd, Rd);
    bezelGrad.addColorStop(0, CU_L); bezelGrad.addColorStop(0.25, CU_H); bezelGrad.addColorStop(0.5, CU_M); bezelGrad.addColorStop(0.85, CU_D); bezelGrad.addColorStop(1, CU_M);
    const tw = Rd * 0.22;
    knobGrad = g.createLinearGradient(0, -tw / 2, 0, tw / 2);
    knobGrad.addColorStop(0, CU_H); knobGrad.addColorStop(0.4, CU_L); knobGrad.addColorStop(1, CU_D);
  }

  // static hearth: tray, rails, vent housing and its scale (cached; redrawn on resize only)
  function buildHearth() {
    const pad = 30;
    hearthO.x = stage.x - pad; hearthO.y = stage.y - pad; hearthO.w = stage.w + pad * 2; hearthO.h = stage.h + pad * 2;
    hearthC = canvas(Math.ceil(hearthO.w * dpr), Math.ceil(hearthO.h * dpr));
    const c = hearthC.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, -hearthO.x * dpr, -hearthO.y * dpr);
    shadow(c, bx, by + BH * 0.6, BW * 0.68, BH * 0.24, 0.55);
    shadow(c, dx, dy + Rd * 1.62, Rd * 1.9, Rd * 0.34, 0.45);
    // vent housing below the tray: a neck and a round iron plate
    const PR = Rd * 1.64, py0 = by + BH / 2;
    const pg = c.createLinearGradient(dx - PR, dy - PR, dx + PR * 0.6, dy + PR);
    pg.addColorStop(0, IRON_H); pg.addColorStop(0.3, IRON_M); pg.addColorStop(1, IRON_D);
    c.fillStyle = pg;
    c.beginPath();
    if (side) { const ex = bx + BW / 2; c.moveTo(ex, by - BH * 0.2); c.lineTo(dx - PR * 0.7, dy - Rd * 0.75); c.lineTo(dx - PR * 0.7, dy + Rd * 0.75); c.lineTo(ex, by + BH * 0.4); }
    else { c.moveTo(bx - BW * 0.2, py0); c.lineTo(bx + BW * 0.2, py0); c.lineTo(dx + Rd * 0.75, dy - PR * 0.7); c.lineTo(dx - Rd * 0.75, dy - PR * 0.7); }
    c.closePath(); c.fill();
    c.beginPath(); c.arc(dx, dy, PR, 0, TAU); c.fill();
    c.strokeStyle = rgba(IRON_H, 0.6); c.lineWidth = 1.2; c.beginPath(); c.arc(dx, dy, PR - 0.8, Math.PI * 0.85, Math.PI * 1.9); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.55)'; c.beginPath(); c.arc(dx, dy, PR - 0.8, Math.PI * 1.9, Math.PI * 2.85); c.stroke();
    for (let i = -1; i <= 1; i++) { const a = Math.PI / 2 + i * 0.95; orb(c, dx + Math.cos(a) * PR * 0.86, dy + Math.sin(a) * PR * 0.86, Math.max(1.8, Rd * 0.05), CU_M, { light: CU_H }); }
    // iron tray
    const tx = bx - BW / 2 - rim, ty = by - BH / 2 - rim, tw = BW + rim * 2, th = BH + rim * 2;
    const tg = c.createLinearGradient(tx, ty, tx + tw * 0.3, ty + th);
    tg.addColorStop(0, IRON_H); tg.addColorStop(0.2, IRON_M); tg.addColorStop(1, IRON_D);
    c.fillStyle = tg; roundRect(c, tx, ty, tw, th, rim * 1.8); c.fill();
    c.strokeStyle = rgba(CU_H, 0.2); c.lineWidth = 1.2; roundRect(c, tx + 1, ty + 1, tw - 2, th - 2, rim * 1.7); c.stroke();
    c.fillStyle = '#060203'; roundRect(c, bx - BW / 2 - 1.5, by - BH / 2 - 1.5, BW + 3, BH + 3, rim); c.fill();
    // rails the grille rides on
    const ry0 = gy0 - GH / 2 - rw * 2, ry1 = by + BH / 2 + rim * 0.3;
    c.lineCap = 'round';
    for (const sx of [-1, 1]) {
      const x = bx + sx * railX;
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = rw * 1.7; c.beginPath(); c.moveTo(x + 1.5, ry0 + 3); c.lineTo(x + 1.5, ry1 + 3); c.stroke();
      c.strokeStyle = CU_D; c.lineWidth = rw * 1.3; c.beginPath(); c.moveTo(x, ry0); c.lineTo(x, ry1); c.stroke();
      c.strokeStyle = CU_M; c.lineWidth = rw; c.stroke();
      c.strokeStyle = rgba(CU_H, 0.8); c.lineWidth = rw * 0.3; c.beginPath(); c.moveTo(x - rw * 0.22, ry0); c.lineTo(x - rw * 0.22, ry1); c.stroke();
      orb(c, x, ry0, rw * 1.15, CU_M, { light: CU_H });
      // latch catches at the docked position
      c.fillStyle = CU_D; roundRect(c, x - rw * 1.4, by + GH * 0.36, rw * 2.8, rw * 2.2, rw * 0.8); c.fill();
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) orb(c, bx + sx * (BW / 2 + rim * 0.5), by + sy * (BH / 2 + rim * 0.5), rim * 0.3, CU_M, { light: CU_H });
    // vent backplate and its scale: bright marks at the open end, ruby at the low end
    const bpg = c.createRadialGradient(dx - Rd * 0.4, dy - Rd * 0.5, Rd * 0.2, dx, dy, Rd * 1.15);
    bpg.addColorStop(0, IRON_H); bpg.addColorStop(0.5, IRON_M); bpg.addColorStop(1, IRON_D);
    c.fillStyle = bpg; c.beginPath(); c.arc(dx, dy, Rd * 1.1, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5; c.stroke();
    for (let i = 0; i <= 12; i++) {
      const a = A0 - (i / 12) * SWEEP, major = i % 3 === 0, r0 = Rd * 1.18, r1 = Rd * (major ? 1.36 : 1.28);
      c.strokeStyle = rgba(hc(lerp(0.95, H_LOW, i / 12)), 0.42); c.lineWidth = major ? 2.2 : 1.4;
      c.beginPath(); c.moveTo(dx + Math.cos(a) * r0, dy + Math.sin(a) * r0); c.lineTo(dx + Math.cos(a) * r1, dy + Math.sin(a) * r1); c.stroke();
    }
    const lx = dx + Math.cos(A1) * Rd * 1.48, ly = dy + Math.sin(A1) * Rd * 1.48;
    c.strokeStyle = rgba(RUBY, 0.75); c.lineWidth = 1.4; c.beginPath(); c.arc(lx, ly, Math.max(4.5, Rd * 0.11), 0, TAU); c.stroke();
    for (let i = 0; i < 3; i++) { const a = A0 + 0.12 - i * 0.1, r = Rd * 1.48; c.fillStyle = rgba('#ffc760', 0.45 - i * 0.1); c.beginPath(); c.arc(dx + Math.cos(a) * r, dy + Math.sin(a) * r, 1.8 - i * 0.3, 0, TAU); c.fill(); }
    // inner wall shadow of the bed (drawn over the coals, under the ember photos)
    vignC = canvas(Math.ceil(BW * dpr), Math.ceil(BH * dpr));
    const v = vignC.getContext('2d'); v.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vg = v.createRadialGradient(BW / 2, BH * 0.56, BH * 0.3, BW / 2, BH * 0.56, BW * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.7, 'rgba(8,2,4,0.18)'); vg.addColorStop(1, 'rgba(8,2,4,0.62)');
    v.fillStyle = vg; v.fillRect(0, 0, BW, BH);
    const tg2 = v.createLinearGradient(0, 0, 0, BH * 0.18); tg2.addColorStop(0, 'rgba(6,2,3,0.55)'); tg2.addColorStop(1, 'rgba(6,2,3,0)');
    v.fillStyle = tg2; v.fillRect(0, 0, BW, BH * 0.18);
  }

  // the copper grille: slats, rings, bronze word band, frame, handle (cached; plus two heat tints)
  function paintGrille(c) {
    const slatW = Math.max(1.6, GH * 0.016), xs = -GW / 2 + fw * 0.5, xe = GW / 2 - fw * 0.5;
    const nS = Math.max(3, Math.round(rowH / (GH * 0.075)));
    for (const [y0, y1] of [[-GH / 2 + fw, -bandH / 2], [bandH / 2, GH / 2 - fw]]) {
      for (let i = 1; i < nS; i++) {
        const y = y0 + (i / nS) * (y1 - y0);
        c.strokeStyle = CU_D; c.lineWidth = slatW * 1.3; c.beginPath(); c.moveTo(xs, y + slatW * 0.25); c.lineTo(xe, y + slatW * 0.25); c.stroke();
        c.strokeStyle = CU_M; c.lineWidth = slatW; c.beginPath(); c.moveTo(xs, y); c.lineTo(xe, y); c.stroke();
        c.strokeStyle = rgba(CU_L, 0.9); c.lineWidth = slatW * 0.35; c.beginPath(); c.moveTo(xs, y - slatW * 0.22); c.lineTo(xe, y - slatW * 0.22); c.stroke();
      }
    }
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
    for (const s of slots) { c.beginPath(); c.arc(s.x, s.y, cellR + ringW * 0.5, 0, TAU); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    for (const s of slots) {
      const ro = cellR + ringW / 2;
      const rg = c.createLinearGradient(s.x - ro, s.y - ro, s.x + ro, s.y + ro);
      rg.addColorStop(0, CU_L); rg.addColorStop(0.3, CU_H); rg.addColorStop(0.55, CU_M); rg.addColorStop(1, CU_D);
      c.strokeStyle = rg; c.lineWidth = ringW; c.beginPath(); c.arc(s.x, s.y, ro, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(26,8,4,0.6)'; c.lineWidth = 1; c.beginPath(); c.arc(s.x, s.y, cellR + 0.5, 0, TAU); c.stroke();
      c.strokeStyle = rgba(CU_H, 0.75); c.beginPath(); c.arc(s.x, s.y, ro + ringW * 0.3, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
    }
    const bw = GW - fw;
    const bg = c.createLinearGradient(0, -bandH / 2, 0, bandH / 2);
    bg.addColorStop(0, mix(BRONZE_T, CU_M, 0.3)); bg.addColorStop(0.45, BRONZE_T); bg.addColorStop(1, BRONZE_B);
    c.fillStyle = bg; roundRect(c, -bw / 2, -bandH / 2, bw, bandH, Math.min(6, bandH * 0.2)); c.fill();
    c.lineWidth = 1.2;
    c.strokeStyle = rgba(CU_L, 0.8); c.beginPath(); c.moveTo(-bw / 2 + 4, -bandH / 2 + 0.8); c.lineTo(bw / 2 - 4, -bandH / 2 + 0.8); c.stroke();
    c.strokeStyle = 'rgba(12,4,2,0.75)'; c.beginPath(); c.moveTo(-bw / 2 + 4, bandH / 2 - 0.8); c.lineTo(bw / 2 - 4, bandH / 2 - 0.8); c.stroke();
    c.strokeStyle = rgba(CU_L, 0.25); c.lineWidth = 0.8; roundRect(c, -bw / 2 + bandH * 0.42, -bandH / 2 + 3.5, bw - bandH * 0.84, bandH - 7, 4); c.stroke();
    for (const sx of [-1, 1]) orb(c, sx * (bw / 2 - bandH * 0.22), 0, Math.max(2, bandH * 0.1), CU_M, { light: CU_H });
    const fg = c.createLinearGradient(-GW / 2, -GH / 2, GW / 2, GH / 2);
    fg.addColorStop(0, CU_L); fg.addColorStop(0.2, CU_H); fg.addColorStop(0.45, CU_M); fg.addColorStop(0.75, CU_D); fg.addColorStop(1, CU_M);
    c.strokeStyle = fg; c.lineWidth = fw; roundRect(c, -GW / 2 + fw / 2, -GH / 2 + fw / 2, GW - fw, GH - fw, GH * 0.07); c.stroke();
    c.strokeStyle = rgba(CU_H, 0.5); c.lineWidth = 1; roundRect(c, -GW / 2 + fw * 0.15, -GH / 2 + fw * 0.15, GW - fw * 0.3, GH - fw * 0.3, GH * 0.075); c.stroke();
    // pull handle
    c.strokeStyle = fg; c.lineWidth = Math.max(3, fw * 1.05); roundRect(c, -hw / 2, GH / 2 - fw, hw, hh + fw * 0.55, Math.min(hh * 0.6, 10)); c.stroke();
    c.strokeStyle = rgba(CU_H, 0.7); c.lineWidth = 1.1; c.beginPath(); c.moveTo(-hw / 2 + 7, GH / 2 + hh - fw * 0.75); c.lineTo(hw / 2 - 7, GH / 2 + hh - fw * 0.75); c.stroke();
    // brackets that ride the rails
    for (const sx of [-1, 1]) for (const sy of [-0.3, 0.3]) { c.fillStyle = fg; roundRect(c, sx * railX - rw * 1.3, sy * GH - GH * 0.06, rw * 2.6, GH * 0.12, rw); c.fill(); }
  }
  function tinted(base, col) {
    const c = canvas(base.width, base.height), x = c.getContext('2d');
    x.drawImage(base, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function buildGrille() {
    const ext = railX + rw * 1.6, pad = 18;
    gW = ext * 2 + pad * 2; gH = GH + hh + pad * 2 + 4; gOX = gW / 2; gOY = pad + GH / 2;
    const Wd = Math.ceil(gW * dpr), Hd = Math.ceil(gH * dpr);
    const B = canvas(Wd, Hd), bc = B.getContext('2d');
    bc.setTransform(dpr, 0, 0, dpr, gOX * dpr, gOY * dpr);
    paintGrille(bc);
    grilleC = canvas(Wd, Hd);
    const fc = grilleC.getContext('2d');
    fc.shadowColor = 'rgba(0,0,0,0.55)'; fc.shadowBlur = 8 * dpr; fc.shadowOffsetX = 2 * dpr; fc.shadowOffsetY = 6 * dpr;
    fc.drawImage(B, 0, 0);
    hotC = tinted(B, '#ff7a2e'); rubyC = tinted(B, RUBY);
  }

  fit();
  E.onResize(fit);
  // embers cool in a sweep from right to left as the vent closes
  [...Array(K).keys()].sort((a, b) => (slots[b].x - slots[a].x) || (slots[a].y - slots[b].y))
    .forEach((k, r) => { emb[k].rank = r; emb[k].th = 0.1 + (r / (K - 1)) * 0.76; });

  // ------------------------------------------------------------ helpers --
  const ventFrac = () => clamp((A0 - kA) / SWEEP);
  const coverFrac = () => clamp((gyV - gy0) / SL);
  const handleAt = (sl) => ({ x: bx, y: lerp(gy0, gy1, sl) + GH / 2 + hh * 0.55 });
  const knobAt = (f) => { const a = A0 - f * SWEEP; return { x: dx + Math.cos(a) * Rd * 1.04, y: dy + Math.sin(a) * Rd * 1.04 }; };
  function hap(kind, gap = 0.09) { const t = E.now(); if (t - lastHap > gap) { lastHap = t; E.haptic(kind); } }
  function refuse() {
    const t = E.now();
    if (t - lastWait > 0.7) { lastWait = t; E.checkpoint('wait'); (docked ? wob : wobG).kick(0.5); E.sound('bubble', { note: 1, intensity: 0.2 }); }
  }
  function onGrille(p) { return p.x >= bx - railX - 18 && p.x <= bx + railX + 18 && p.y >= gyV - GH / 2 - 16 && p.y <= gyV + GH / 2 + hh + 20; }
  function onDial(p) { const d = Math.hypot(p.x - dx, p.y - dy); return d > Rd * 0.2 && d < Rd * 1.8; }
  function dock(t) {
    docked = true; dockAt = t;
    E.sound('snap', { intensity: 0.45 }); E.haptic('pop'); E.checkpoint('step');
    for (const sx of [-1, 1]) E.ripples.add(bx + sx * railX, by + GH * 0.4, { colour: CU_L, speed: 50, alpha: 0.5, r: 6 });
    if (!reduced) gV += 90;
    E.hint('Now turn the vent dial slowly down to the ruby mark.');
  }
  function onCool(k) {
    const m = emb[k], s = slots[k], x = bx + s.x, y = by + s.y, ph = slotPh[k];
    if (ph >= 0) { photos.dust(ph, x, y, cellR * 2, reduced ? 6 : 12, { shape: 'circle', up: 22, speed: 18, sizePx: 4 }); E.checkpoint('photo', ph); }
    else E.particles.burst(x, y, reduced || lowStim ? 3 : 6, { speed: 26, colour: ROSE, life: 1.1, size: 5 });
    E.ripples.add(x, y, { colour: RUBY, speed: 40, alpha: 0.5, r: cellR });
    E.sound('glass', { note: 7 - m.rank, intensity: 0.34, pan: clamp(s.x / (BW * 0.5), -1, 1) * 0.5 });
    hap('light');
  }

  // --------------------------------------------------------- simulation --
  function frame(dt, t) {
    // ---- input → gated state
    if (assistTo != null) {
      const lim = docked ? assistTo : Math.min(assistTo, S1);
      wanted = Math.max(wanted, Math.min(lim, wanted + dt * 0.3));
      if (wanted >= assistTo - 1e-4) { wanted = assistTo; assistTo = null; }
    }
    if (docked) wanted = Math.max(wanted, S1);
    prog = E.gate(wanted);
    if (wanted > prog + BANK) wanted = prog + BANK;
    if (!docked && prog >= S1 - 1e-4) dock(t);

    // ---- the grille: a weighty spring on its rails, stretched a little by the finger
    strain *= Math.exp(-dt * (drag ? 4 : 10)); strainA *= Math.exp(-dt * (drag ? 4 : 10));
    const wg = wobG.update(dt), wd = wob.update(dt);
    const gT = docked ? gy1 + wg * 2 : lerp(gy0, gy1, clamp(prog / S1)) + strain + wg * 3;
    gV += (-(gyV - gT) * 420 - gV * (reduced ? 41 : 30)) * dt; gyV += gV * dt;
    if (docked && gyV > gy1 + 6) { gyV = gy1 + 6; gV = Math.min(0, gV); }
    // ---- the vent knob: rotary inertia
    const fG = clamp((prog - S1) / (1 - S1));
    const kT = A0 - fG * SWEEP - strainA;
    kV += (-(kA - kT) * 320 - kV * (reduced ? 36 : 26)) * dt; kA += kV * dt;
    if (!Number.isFinite(kA)) { kA = kT; kV = 0; }
    if (!Number.isFinite(gyV)) { gyV = gT; gV = 0; }

    // ---- ticks and notes from real (gated) movement
    const slStep = Math.floor(clamp(prog / S1) * 6 + 1e-6);
    if (!docked && slStep > lastSlideStep) { E.sound('pluck', { note: 1 + slStep, intensity: 0.28 }); hap('tick'); }
    lastSlideStep = slStep;
    const det = Math.floor(fG * 14 + 1e-6);
    if (det !== lastDet) { if (docked) { E.sound('rotate-tick', { pitch: lerp(1.2, 0.72, det / 14), intensity: 0.3 }); hap('tick', 0.06); } lastDet = det; }

    // ---- the fire: less air → less heat, with a thermal lag
    const dfV = ventFrac(), sl = coverFrac();
    const air = 1 - 0.86 * dfV;
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const hT = finAt >= 0 ? H_LOW : clamp(lerp(H_LOW, hStart, Math.pow(air, 1.3)) - 0.05 * sl, H_LOW, 1);
    heat += (hT - heat) * (1 - Math.exp(-dt / 0.7));
    copperHeat += (sl - copperHeat) * (1 - Math.exp(-dt / 1.2));
    const flick = smooth(invLerp(0.26, 0.9, heat)) * agit;
    const steady = 1 - smooth(invLerp(H_LOW + 0.02, 0.5, heat));
    const sync = twistAt >= 0 ? smooth(clamp((t - twistAt) / 2.5)) : 0;
    const fs = lerp(0.35, 1, flick) * (reduced ? 0.5 : 1);
    for (let k = 0; k < K; k++) {
      const m = emb[k];
      const tgt = finAt >= 0 ? 0 : 1 - smooth(invLerp(m.th - 0.1, m.th + 0.1, dfV));
      m.e += (tgt - m.e) * (1 - Math.exp(-dt / 0.5));
      if (!m.fired && docked && dfV >= m.th) { m.fired = true; onCool(k); }
    }
    // sparks rise from the bed (fewer as it calms; the grille catches some)
    if (finAt < 0 && dt > 0) {
      sparkAcc += dt * agit * (Math.pow(heat, 2.2) * 15) * (1 - 0.55 * sl) * (lowStim ? 0.4 : 1) * (reduced ? 0.4 : 1);
      while (sparkAcc >= 1) {
        sparkAcc -= 1;
        E.particles.emit({ x: bx + (vr() - 0.5) * BW * 0.9, y: by + (vr() - 0.5) * BH * 0.8, vx: (vr() - 0.5) * 24, vy: -(40 + vr() * 70) * (0.5 + heat * 0.6),
          life: 0.8 + vr() * 1.0, size: 2.5 + vr() * 2.5, colour: hc(heat + 0.2), drag: 0.97, gravity: -30, kind: vr() < 0.35 ? 'glint' : 'glow' });
      }
    }
    if (drag && heat > 0.55 && t > crackleAt && vr() < dt * 3 * flick) { crackleAt = t + 0.25; E.sound('crackle', { intensity: 0.14 * heat }); }
    // ---- win: the vent rests at the low mark
    if (prog < 0.999) doneFlag = false;
    else if (!doneFlag && !drag && assistTo == null && Math.abs(kA - A1) < 0.03 && Math.abs(kV) < 0.5) {
      doneFlag = true; E.sound('settle', { intensity: 0.5 }); hap('soft');
      E.ripples.add(dx + Math.cos(A1) * Rd * 1.48, dy + Math.sin(A1) * Rd * 1.48, { colour: RUBY, speed: 30, alpha: 0.6, r: 6 });
    }

    // ---- drawing
    glow(g, bx, by, BW * 0.95, hc(heat), 0.14 + 0.14 * heat);
    g.drawImage(hearthC, hearthO.x, hearthO.y, hearthO.w, hearthO.h);
    drawBed(t, flick, steady, sync, fs);
    g.drawImage(vignC, bx - BW / 2, by - BH / 2, BW, BH);
    drawEmbers(t, flick, steady, sync, fin);
    drawHaze(t, flick);
    drawGrille(t, flick, steady, fin, sl);
    drawDial(t, flick, steady, sync, fin, dfV, wd);
    if (finAt >= 0) drawFinale(dt, t, fin);
  }

  // ------------------------------------------------------------ drawing --
  function drawBed(t, flick, steady, sync, fs) {
    g.save();
    roundRect(g, bx - BW / 2, by - BH / 2, BW, BH, rim * 0.9); g.clip();
    const fg = g.createRadialGradient(bx, by, BH * 0.1, bx, by, BW * 0.6);
    fg.addColorStop(0, hc(heat * 0.7)); fg.addColorStop(0.7, hc(heat * 0.45)); fg.addColorStop(1, hc(heat * 0.22));
    g.fillStyle = fg; g.fillRect(bx - BW / 2, by - BH / 2, BW, BH);
    // slow drifting hot spots
    for (let i = 0; i < 4; i++) {
      const ux = nz(i * 7.1, t * 0.07 * (1 + flick)) * 0.42, vy = nz(i * 3.3 + 20, t * 0.06 * (1 + flick)) * 0.4;
      glow(g, bx + ux * BW, by + vy * BH, BW * 0.32, hc(heat + 0.12), 0.16 + 0.2 * heat);
    }
    for (const c of coals) {
      const own = nz(c.ph + t * c.fr * fs * 1.6, c.ph * 0.37);
      const wave = Math.sin(t * 1.9 - c.u * 3.2);
      const n1 = lerp(own, wave, sync * 0.7);
      const br = steady * 0.07 * Math.sin(t * BREATH - lerp(c.bp, c.u * 2.4, Math.max(sync, steady * 0.4)));
      const h = clamp(heat * (0.8 + 0.34 * c.bias * (0.35 + 0.65 * flick)) + flick * 0.3 * n1 + br);
      const R = c.r * BW;
      g.save(); g.translate(bx + c.u * BW, by + c.v * BH); g.scale(R, R);
      g.fillStyle = hc(h * 0.78); g.fill(c.path);                       // the glowing body
      glow(g, c.hx, c.hy, 0.95, hc(h + 0.1), 0.5 + 0.45 * h);            // its hot core
      g.globalAlpha = 0.62 - 0.3 * h; g.fillStyle = crustGrad; g.fill(c.ash);   // a charred patch
      g.globalAlpha = 1; g.strokeStyle = 'rgba(28,5,6,0.55)'; g.lineWidth = 0.1; g.stroke(c.path);
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = hc(h + 0.22); g.globalAlpha = 0.3 + 0.5 * h; g.lineWidth = 0.07; g.stroke(c.cracks);
      g.restore();
    }
    g.restore();
  }

  function drawPearl(x, y, r, h, k) {
    g.save(); g.translate(x, y); g.scale(r, r);
    g.fillStyle = hc(h * 0.72); g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
    glow(g, -0.1, -0.12, 1.05, hc(h + 0.12), 0.6 + 0.35 * h);
    g.globalAlpha = 0.55 - 0.25 * h; g.fillStyle = pearlGrad; g.fill(emb[k].ash);
    g.globalAlpha = 0.5; g.strokeStyle = 'rgba(28,5,6,0.8)'; g.lineWidth = 0.07; g.beginPath(); g.arc(0, 0, 0.97, 0, TAU); g.stroke();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = hc(h + 0.25); g.globalAlpha = 0.45 + 0.45 * h; g.lineWidth = 0.065; g.stroke(emb[k].cracks);
    g.globalAlpha = 0.18; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-0.32, -0.42, 0.32, 0.13, -0.5, 0, TAU); g.fill();
    g.restore();
  }

  function drawEmbers(t, flick, steady, sync, fin) {
    const d0 = cellR * 2 * 0.94;
    for (let k = 0; k < K; k++) {
      const s = slots[k], m = emb[k], x = bx + s.x, y = by + s.y, ph = slotPh[k];
      const n1 = nz(k * 9.7 + t * 0.9 * (reduced ? 0.5 : 1), 4.2 + k);
      const br = steady * 0.05 * Math.sin(t * BREATH - (sync > 0 ? s.x / BW * 2.4 : k * 0.9));
      const hk = clamp(lerp(H_LOW, heat, m.e) * (1 + flick * 0.22 * n1) + br);
      const lift = fin * (heavy ? 0.03 : 0.06), d = d0 * (1 + lift);
      glow(g, x, y, cellR * 1.7, hc(hk), 0.26 + 0.38 * hk);
      if (ph >= 0) {
        const shimmer = reduced ? 0 : m.e * flick * 0.03 * Math.sin(t * 5 + k * 1.7);
        photos.draw(g, ph, x, y, d, { shape: 'circle', tone: 'ember', toneMix: clamp(0.08 + 0.8 * m.e * (0.6 + 0.4 * heat)) * (1 - fin), glow: 0.3 + 0.35 * hk, glowColour: hc(hk), skewY: shimmer, shadow: false });
        g.save(); g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rgba(hc(hk + 0.1), 0.3 + 0.35 * hk + steady * 0.15); g.lineWidth = Math.max(1.5, cellR * 0.07);
        g.beginPath(); g.arc(x, y, d / 2 - 1, 0, TAU); g.stroke(); g.restore();
        if (m.e > 0.3 && flick > 0.05) glow(g, x, y, d * 0.5, hc(hk), 0.12 * m.e * flick * (0.6 + 0.4 * n1));
      } else drawPearl(x, y, cellR * 0.9 * (1 + lift), hk, k);
    }
  }

  function drawHaze(t, flick) {
    const a = 0.03 + 0.07 * heat * (0.5 + 0.5 * flick);
    const base = by - BH * 0.25, top = stage.y + 4, hgt = base - top;
    if (hgt < 20) return;
    const hz = g.createLinearGradient(0, base, 0, top);
    hz.addColorStop(0, rgba(hc(heat), a)); hz.addColorStop(1, rgba(hc(heat), 0));
    // slow warm blooms of heat rising from the bed
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.11 * (reduced ? 0.5 : 1) + i / 3) % 1;
      glow(g, bx + Math.sin(i * 2.3 + t * 0.3) * BW * 0.2, base - k * hgt, BW * (0.16 + 0.14 * k), hc(heat), 0.11 * Math.sin(k * Math.PI) * (0.3 + 0.7 * heat));
    }
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.strokeStyle = hz;
    for (let i = 0; i < 3; i++) {
      const x0 = bx + (i - 1) * BW * 0.3;
      g.beginPath();
      for (let j = 0; j <= 16; j++) {
        const k = j / 16, y = base - k * hgt;
        const x = x0 + Math.sin(k * 5.5 - t * (0.7 + i * 0.17) + i * 2.1) * (4 + k * 18) * (reduced ? 0.4 : 1) * (0.4 + 0.6 * heat);
        j ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.lineWidth = BW * 0.07; g.stroke();
      g.lineWidth = 1.6; g.stroke();
    }
    g.restore();
  }

  function drawGrille(t, flick, steady, fin, sl) {
    const x0 = bx - gOX, y0 = gyV - gOY;
    g.drawImage(grilleC, x0, y0, gW, gH);
    const n1 = nz(t * 1.1, 31.7);
    const aHot = copperHeat * (0.08 + 0.3 * smooth(invLerp(0.3, 1, heat))) * (1 + 0.25 * flick * n1);
    const aRuby = copperHeat * 0.16 * steady + fin * 0.04;
    g.save(); g.globalCompositeOperation = 'lighter';
    if (aHot > 0.005) { g.globalAlpha = clamp(aHot); g.drawImage(hotC, x0, y0, gW, gH); }
    if (aRuby > 0.005) { g.globalAlpha = clamp(aRuby); g.drawImage(rubyC, x0, y0, gW, gH); }
    g.restore();
    // words cut into the bronze band, lit from the embers beneath
    if (E.phase !== 'law' && words.token) {
      const lit = smooth(copperHeat);
      if (lit > 0.02) for (const fx of [-0.24, 0, 0.24]) glow(g, bx + fx * GW, gyV, bandH * 1.3, hc(heat), 0.16 * lit * (0.85 + 0.15 * n1));
      const col = fin > 0.3 ? '#fff4f0' : mix('#f2c9a0', mix('#fff0da', hc(heat + 0.3), 0.3), lit);
      words.draw(g, bx, gyV + 0.5, { style: 'etched', size: wSize, maxWidth: GW * 0.8, lines: wLines, colour: col, alpha: 0.94 + 0.06 * lit });
    }
    // the pull handle's glow until the grille is home
    const hx = bx, hy = gyV + GH / 2 + hh * 0.5;
    if (!docked) {
      const nudge = Math.max(0, 1 - (t - nudgeAt) / 1.2), grab = drag && drag.kind === 'grille' ? 1 : Math.max(0, 1 - (t - grabAt) / 0.6);
      glow(g, hx, hy, hw * 0.55, '#ffd2a0', 0.32 + 0.16 * Math.sin(t * 2.4) + 0.4 * Math.max(nudge, grab));
    } else if (t - dockAt < 1.6) {
      // a shine runs along the rings as the grille latches home
      const k = (t - dockAt) / 1.6;
      for (const s of slots) { const a = Math.max(0, 1 - Math.abs(k * 1.6 - 0.3 - (s.x / GW + 0.5)) * 3); if (a > 0) glow(g, bx + s.x, by + s.y - cellR * 0.7, cellR * 0.9, '#ffd2a0', 0.4 * a); }
    }
  }

  function drawDial(t, flick, steady, sync, fin, dfV, wd) {
    const ang = kA + wd * 0.05;
    g.save(); g.translate(dx, dy);
    // firelight through the vent's aperture
    const ag = g.createRadialGradient(0, 0, 0, 0, 0, Ri);
    ag.addColorStop(0, hc(heat + 0.08)); ag.addColorStop(0.55, hc(heat * 0.8)); ag.addColorStop(1, hc(heat * 0.4));
    g.fillStyle = ag; g.beginPath(); g.arc(0, 0, Ri, 0, TAU); g.fill();
    glow(g, 0, 0, Ri * (0.6 + 0.5 * (1 - dfV)), hc(heat + 0.15), 0.3 + 0.25 * flick * (0.5 + 0.5 * nz(t * 1.3, 77)));
    // iris blades close as the vent turns down
    const ap = lerp(Ri * 0.86, Ri * 0.18, dfV), th = 0.4 - dfV * 1.2 + (ang - (A0 - dfV * SWEEP)) * 0.3;
    g.beginPath(); g.arc(0, 0, Ri, 0, TAU);
    for (let i = 0; i <= BLADES; i++) { const a = th + (i / BLADES) * TAU, x = Math.cos(a) * ap, y = Math.sin(a) * ap; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fillStyle = bladeGrad; g.fill('evenodd');
    g.save(); g.beginPath(); g.arc(0, 0, Ri, 0, TAU); g.clip();
    g.beginPath();
    for (let i = 0; i < BLADES; i++) {
      const a1 = th + (i / BLADES) * TAU, a2 = th + ((i + 1) / BLADES) * TAU;
      const x1 = Math.cos(a1) * ap, y1 = Math.sin(a1) * ap, x2 = Math.cos(a2) * ap, y2 = Math.sin(a2) * ap;
      const ex = x2 - x1, ey = y2 - y1, el = Math.hypot(ex, ey) || 1;
      g.moveTo(x2, y2); g.lineTo(x2 + (ex / el) * Ri * 2, y2 + (ey / el) * Ri * 2);
    }
    g.strokeStyle = 'rgba(10,4,3,0.7)'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = rgba(CU_L, 0.42); g.lineWidth = 0.9; g.stroke();
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(hc(heat + 0.1), 0.35 + 0.3 * steady); g.lineWidth = 1.4; g.beginPath();
    for (let i = 0; i <= BLADES; i++) { const a = th + (i / BLADES) * TAU, x = Math.cos(a) * ap, y = Math.sin(a) * ap; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.restore();
    // copper bezel; its knurling turns with the knob
    g.fillStyle = bezelGrad; g.beginPath(); g.arc(0, 0, Rd, 0, TAU); g.arc(0, 0, Ri, 0, TAU, true); g.fill();
    g.strokeStyle = 'rgba(32,10,4,0.55)'; g.lineWidth = Math.max(1, Rd * 0.025); g.beginPath();
    const rot = ang - A0;
    for (let i = 0; i < 36; i++) { const a = rot + (i / 36) * TAU, c = Math.cos(a), s = Math.sin(a); g.moveTo(c * Rd * 0.88, s * Rd * 0.88); g.lineTo(c * Rd * 0.97, s * Rd * 0.97); }
    g.stroke();
    g.strokeStyle = rgba(CU_H, 0.5); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, Rd - 0.6, Math.PI, Math.PI * 1.75); g.stroke();
    g.strokeStyle = 'rgba(18,6,4,0.75)'; g.beginPath(); g.arc(0, 0, Ri + 0.5, 0, TAU); g.stroke();
    if (sync > 0) { g.strokeStyle = rgba(ROSE, 0.22 * sync * (0.6 + 0.4 * Math.sin(t * BREATH))); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, Rd * 1.07, 0, TAU); g.stroke(); }
    // scale marks the knob has passed light up in their colour
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i <= 12; i++) {
      if ((i / 12) * SWEEP > (A0 - ang) + 0.02) break;
      const a = A0 - (i / 12) * SWEEP, major = i % 3 === 0, r0 = Rd * 1.18, r1 = Rd * (major ? 1.36 : 1.28);
      g.strokeStyle = rgba(hc(lerp(0.95, H_LOW, i / 12)), 0.85); g.lineWidth = major ? 2.4 : 1.6;
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
    }
    g.restore();
    // the ruby low mark
    const near = smooth(invLerp(0.7, 1, dfV)), win = doneFlag || fin > 0 ? 1 : 0;
    const lx = Math.cos(A1) * Rd * 1.48, ly = Math.sin(A1) * Rd * 1.48;
    glow(g, lx, ly, Rd * (0.3 + 0.2 * near + 0.15 * win), RUBY, 0.35 + 0.35 * near * (0.8 + 0.2 * Math.sin(t * 2)) + 0.25 * win);
    orb(g, lx, ly, Math.max(2.6, Rd * 0.065), mix(RUBY, '#ff9aa8', 0.25 * near + 0.3 * win));
    // the knob's lever
    g.save(); g.rotate(ang);
    const r0 = Rd * 0.8, r1 = Rd * 1.2, tw = Rd * 0.22;
    g.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(g, r0 + 1.5, -tw / 2 + 2.5, r1 - r0, tw, tw / 2); g.fill();
    g.fillStyle = knobGrad; roundRect(g, r0, -tw / 2, r1 - r0, tw, tw / 2); g.fill();
    g.strokeStyle = rgba(CU_H, 0.6); g.lineWidth = 1; g.stroke();
    g.restore();
    const px = Math.cos(ang) * Rd * 1.04, py = Math.sin(ang) * Rd * 1.04;
    const active = drag && drag.kind === 'dial';
    const nudge = Math.max(0, 1 - (t - knobNudgeAt) / 1.2);
    const pipC = !docked ? '#8a7a78' : dfV > 0.97 ? RUBY : '#ffd2a0';
    glow(g, px, py, Rd * 0.34, pipC, !docked ? 0.16 : active ? 0.9 : 0.42 + 0.2 * Math.sin(t * 2.4) + 0.4 * nudge);
    orb(g, px, py, Math.max(3, Rd * 0.075), !docked ? '#6e5a56' : dfV > 0.97 ? mix(RUBY, '#ff9aa8', 0.3) : '#ffcf9a');
    g.restore();
  }

  function drawFinale(dt, t, fin) {
    // the rings bloom softly in the order they cooled; gentle motes rise like lantern light
    for (let k = 0; k < K; k++) {
      const s = slots[k], b = smooth(clamp((t - finAt - emb[k].rank * 0.2) / 1.4));
      if (b > 0) glow(g, bx + s.x, by + s.y, cellR * (1.5 + 0.6 * b), heavy ? RUBY : ROSE, 0.3 * b);
    }
    glow(g, bx, by, BW * 0.7, RUBY, 0.12 * fin);
    if (t - finAt < 2.6 && dt > 0) {
      moteAcc += dt * (heavy || reduced || lowStim ? 4 : 9);
      while (moteAcc >= 1) {
        moteAcc -= 1;
        const s = slots[Math.floor(vr() * K)];
        E.particles.emit({ x: bx + s.x + (vr() - 0.5) * cellR, y: by + s.y - cellR * 0.4, vx: (vr() - 0.5) * 10, vy: -(14 + vr() * 22) * (heavy ? 0.7 : 1),
          life: 1.8 + vr() * 1.2, size: 5 + vr() * 4, colour: vr() < 0.5 ? ROSE : RUBY, drag: 0.985, gravity: -4 });
      }
    }
  }

  // -------------------------------------------------------------- input --
  function softTouch(p) {
    E.ripples.add(p.x, p.y, { colour: hc(heat + 0.1), speed: 60, alpha: 0.4, r: 8 });
    E.sound('bubble', { note: 2 + (touchNote++ % 5), intensity: 0.2 });
    hap('tick');
    if (docked) knobNudgeAt = E.now(); else nudgeAt = E.now();
  }
  return {
    get progress() { return clamp(prog); },
    get done() { return doneFlag && prog >= 0.999; },
    frame,
    down(p) {
      if (finAt >= 0 || E.phase !== 'play') return;
      if (drag) { softTouch(p); return; }
      if (docked && onDial(p)) {
        drag = { id: p.id, kind: 'dial' }; tracker.cx = dx; tracker.cy = dy; tracker.start(p.x, p.y);
        E.sound('click', { intensity: 0.4 }); hap('light');
        E.ripples.add(p.x, p.y, { colour: '#ffd2a0', speed: 50, alpha: 0.35, r: 6 });
        return;
      }
      if (!docked && onGrille(p)) {
        drag = { id: p.id, kind: 'grille', y: p.y }; grabAt = E.now();
        E.sound('swish', { intensity: 0.25 }); hap('light');
        return;
      }
      if (!docked && onDial(p)) {   // not yet: the grille comes first
        wob.kick(0.8); nudgeAt = E.now(); hap('tick');
        E.sound('bubble', { note: 1, intensity: 0.22 });
        E.ripples.add(p.x, p.y, { colour: '#c9b0a8', speed: 40, alpha: 0.3, r: 6 });
        return;
      }
      if (docked && onGrille(p)) {  // the grille is home: a soft rattle, and the vent glows
        wobG.kick(0.4); knobNudgeAt = E.now(); hap('tick');
        E.sound('click', { intensity: 0.22, pitch: 0.8 });
        return;
      }
      softTouch(p);
    },
    move(p) {
      if (!drag || p.id !== drag.id) return;
      if (drag.kind === 'grille') {
        const dyp = p.y - drag.y; drag.y = p.y;
        if (docked) return;
        const ask = wanted + (dyp / SL) * S1;
        const capped = clamp(Math.min(ask, prog + BANK), 0, S1);
        strain = clamp(strain + ((ask - capped) / S1) * SL * 0.5, -12, 12);
        wanted = capped;
        if (E.locked && ask > prog + BANK * 0.8) refuse();
      } else {
        const dA = tracker.feed(p.x, p.y);
        if (Math.abs(dA) < 0.0005) return;
        const ask = wanted + (-dA / SWEEP) * (1 - S1);   // anticlockwise turns the vent down
        const capped = clamp(Math.min(ask, prog + BANK), S1, 1);
        strainA = clamp(strainA + ((ask - capped) / (1 - S1)) * SWEEP * 0.5, -0.14, 0.14);
        wanted = capped;
        if (E.locked && ask > prog + BANK * 0.8) refuse();
      }
    },
    up(p) {
      if (!drag || p.id !== drag.id) return;
      if (drag.kind === 'dial') tracker.end();
      drag = null;
    },
    assist() {
      if (finAt >= 0) return;
      const base = assistTo != null ? assistTo : Math.max(wanted, prog);
      if (!docked && base < S1 - 1e-4) {
        const D = S1 / SLIDE_STEPS;
        assistTo = Math.min(S1, (Math.floor(base / D + 1e-3) + 1) * D);
      } else {
        const D = (1 - S1) / VENT_STEPS;
        assistTo = Math.min(1, S1 + (Math.floor(Math.max(0, base - S1) / D + 1e-3) + 1) * D);
      }
      if (docked) knobNudgeAt = E.now(); else grabAt = E.now();
    },
    pointAt(p) {
      p = clamp(p);
      if (p <= S1) return handleAt(p / S1);
      const f = (p - S1) / (1 - S1);
      if (f < 0.05) { const a = handleAt(1), b = knobAt(f), k = f / 0.05; return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) }; }
      return knobAt(f);
    },
    hint() {
      if (!docked) {
        const y0 = gyV + GH / 2 + hh * 0.5, y1 = gy1 + GH / 2 + hh * 0.5 + 10, pts = [];
        for (let i = 0; i <= 16; i++) pts.push([bx, lerp(y0, y1, i / 16)]);
        return { path: pts };
      }
      const pts = [];
      for (let i = 0; i <= 16; i++) { const a = kA - (i / 16) * 0.95; pts.push([dx + Math.cos(a) * Rd * 1.04, dy + Math.sin(a) * Rd * 1.04]); }
      return { path: pts };
    },
    twist() {
      // the embers stop flickering on their own and begin to breathe together, in one slow wave
      twistAt = E.now();
      E.particles.burst(bx, by - BH * 0.62, reduced || lowStim ? 4 : 10, { speed: 28, colour: ROSE, life: 1.6, size: 5, kind: 'glint' });
    },
    finish() {
      finAt = E.now(); assistTo = null; drag = null;
      E.sound(heavy ? 'settle' : 'bloom', { intensity: 0.42 });
    },
    destroy() { hearthC = vignC = grilleC = hotC = rubyC = null; },
  };
}
