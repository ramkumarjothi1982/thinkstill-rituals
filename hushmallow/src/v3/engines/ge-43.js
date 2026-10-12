// GE-43 · WEIGHTED RAFT — balance raft with two stones (weight-balancing drag).
// A little log raft floats on glassy water with two smooth stones aboard.
// Both stones start on the same side, so that end dips and the far end
// lifts. Drag the glowing stone across the deck: the raft tilts in real time
// (a damped rocking spring driven by the true torque of both loads), its
// ends push waves into a live water-height field, the waterline laps up and
// down the logs, and the bubble in the float-level vial glides towards the
// centre. Rush it and the raft rocks and splashes; slide it slowly and the
// water turns glassy. Win: with the stone at the balance point and the
// finger lifted, the raft floats level for one comfortable beat.
//
// Photos are the stones (stone shape): the hero photo is the stone you slide,
// the next is the stone that stays, and any others ride the water as light
// floating pebbles bobbing on the waves the raft makes. Every photo starts
// storm-heavy and lightens back to its own colours as the raft finds its
// balance. The person's words fly on the raft's flag: fluttering at first,
// hanging calm and readable as the raft levels.

import { TAU, clamp, lerp, invLerp, smooth, ease, dist, rgba, mix, glow, glint, orb, roundRect, shadow, canvas as makeCanvas, rng, wrap, FONT } from '../fx.js';
import { Wobble } from '../kit.js';
import { shapePath } from '../photos.js';

export const meta = {
  id: 'GE-43',
  howTo: 'Drag the glowing stone across the raft until the bubble centres.',
  steps: [
    'Touch the glowing stone on the low side of the raft.',
    'Slide it slowly across the deck — the raft tilts and the water answers.',
    'When the bubble sits between the marks, lift and let the raft float level.',
  ],
  tapAlt: 'each press slides the stone one gentle step across the raft',
  words: 'Your words fly on the raft’s little flag — fluttering at first, then hanging calm and clear as the raft levels.',
  photos: {
    where: 'Your photos become the smooth stones on the raft, and light pebbles floating beside it.',
    becomes: 'polished river stones',
    touch: 'You slide one across the deck until it balances the other;',
    change: 'as the raft levels, each stone lightens from storm-grey back to its own warm colours.',
    payoff: 'At the end they rest, glowing softly, on calm, level water.',
  },
  finaleSec: 4.2,
};

const NB = 4;            // logs in the raft (front to back)
const CAP = 0.05;        // progress the finger may bank ahead of the gated state
const STEP = 1 / 8;      // one "Tap instead" press
const BEAT = 0.9;        // seconds of floating level = one comfortable beat
const NF = 64;           // water height-field columns
const ROWS = 11;         // perspective wave rows
const GLIT = 16;         // glitter-path rows
const SURF = 25;         // waterline samples across the raft

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = !!(E.reduced || E.lowStim);
  const heavy = !!E.heavy;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const R = E.rand;
  const calm0 = E.calm;
  const round1 = E.round === 1;
  const energy = (heavy ? 0.62 : 1) * (1 - calm0 * 0.55);

  // ---------------------------------------------------- arrangement --
  // round 1: both stones start on the left; loop rounds rearrange everything
  const side = E.round % 2 ? -1 : 1;                          // the end that starts low (local x sign); alternates each round
  const aU = round1 ? 0.74 : lerp(0.64, 0.78, R());          // anchor stone position (× half length)
  let mB = round1 ? 1.12 : lerp(0.98, 1.3, R());             // sliding stone mass (anchor = 1)
  if (aU / mB > 0.72) mB = aU / 0.72;
  const maxTilt = (heavy ? 0.125 : 0.155) * (1 - calm0 * 0.45);
  const moonU = round1 ? -0.27 : -lerp(0.2, 0.33, R());
  const twistKind = (E.seed + E.round) % 2;
  const hueA = R(), hueB = R(), hueF = R();

  // colours (every realm palette; light realms keep contrast via the warm wood)
  const water = pal.water ? mix(pal.water, pal.deep, 0.42) : mix(pal.deep, '#3554b8', 0.3);
  const waterHi = mix(water, pal.glow, 0.42);
  const waterDeep = mix(pal.deep, '#02021a', 0.32);
  const foam = mix(waterHi, '#ffffff', 0.55);
  const glowC = pal.glow, warm = pal.warm || '#ffb37a';
  const moonCol = mix(pal.glow, '#fff6dc', 0.6);
  const heroCol = mix(mix('#ece6f6', glowC, 0.2), pal.accent, 0.08 + hueB * 0.18);
  const anchorCol = mix(mix('#78718f', pal.ink || '#15123d', 0.22), pal.deep, hueA * 0.3);
  const floatCol = mix('#e6eef8', glowC, 0.3);
  const clothCol = mix('#fff6e8', mix(glowC, warm, hueF), 0.14);
  const clothShade = mix(clothCol, mix(pal.deep, '#3a2a55', 0.5), 0.34);
  const inkCol = mix(pal.ink || '#24183f', '#251a3d', 0.45);
  const liquid = mix(glowC, '#cfff9a', 0.45);
  const litGlow = mix(warm, '#fff0d0', 0.45);
  const stormMix = heavy ? 0.72 : 0.62;

  // --------------------------------------------------------- photos --
  const n = photos.n;
  const hero = n ? (E.round - 1) % n : -1;
  const anchorPh = n >= 2 ? (hero + 1) % n : -1;
  const extra = [];
  for (let k = 2; k < n; k++) extra.push((hero + k) % n);
  // floating pebbles: the extra photos (or two pale moonstones)
  const SLOTS = [[-0.31, 0.5, 1], [0.31, 0.58, 1], [0.37, 0.5, 0], [-0.4, 0.46, 0], [0.02, 0.86, 1]];
  const slotOrder = [0, 1, 2, 3, 4];
  if (!round1) for (let i = 4; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = slotOrder[i]; slotOrder[i] = slotOrder[j]; slotOrder[j] = tmp; }
  const nFloat = Math.min(5, Math.max(2, extra.length));
  const floats = Array.from({ length: nFloat }, (_, k) => {
    const s = SLOTS[slotOrder[k]];
    return { ph: k < extra.length ? extra[k] : -1, ux: s[0] + (round1 ? 0 : (R() - 0.5) * 0.06), uy: s[1], front: !!s[2],
      thr: 0.12 + 0.68 * ((k + 0.5) / nFloat), light: 0, lighting: false, seed: 11 + k * 3, phase: R() * TAU,
      dip: 0, dipV: 0, x: 0, y: 0, bx: 0, by: 0, tx: 0, ty: 0, size: 0, sx: 0, sy: 0 };
  });

  // ---------------------------------------------------------- state --
  let wanted = 0, prog = 0, assistTo = null;
  let drag = null, lastX = 0, lastY = 0, lastT = 0, rush = 0, touched = false;
  let sx = 0, sv = 0, lift = 0;                    // sliding stone (local x), its velocity, grab lift
  let th = 0, thv = 0, thAmb = 0;                  // raft tilt (rad), angular velocity, wave-riding tilt
  let rX = 0, rxV = 0, sk = 0, skV = 0, rideY = 0; // raft drift, sink
  let bub = 0, bubV = 0;                            // vial bubble (local px)
  let beat = 0, levelAt = -1, doneFlag = false, finAt = -1, twistAt = -1, heldHint = false;
  let anchorLight = 0, anchorLighting = false, heroLight = 0, heroLighting = false;
  let agit = 1, stepIdx = 0, splashCD = 0, refuseCD = 0, tickCD = 0;
  let yEndL = 0, yEndR = 0;
  const wob = new Wobble();
  const twistLanded = [false, false, false];
  const hF = new Float32Array(NF), vF = new Float32Array(NF);
  const surfX = new Float32Array(SURF), surfY = new Float32Array(SURF);
  // ripple rings on the water plane
  const RN = 14, ringX = new Float32Array(RN), ringY = new Float32Array(RN), ringR = new Float32Array(RN), ringA = new Float32Array(RN), ringV = new Float32Array(RN);
  let ringN = 0;
  // motes over the water, wave-row dashes, finale lanterns, log layout (allocated once)
  const MOTES = reduced ? 6 : 12, moteU = new Float32Array(MOTES * 4);
  const dash = new Float32Array(ROWS * 8), finSeed = new Float32Array(22 * 4), logJ = new Float32Array(NB * 2);
  { const r = rng(E.seed * 13 + 5); for (let i = 0; i < moteU.length; i++) moteU[i] = r(); for (let i = 0; i < dash.length; i++) dash[i] = r(); for (let i = 0; i < finSeed.length; i++) finSeed[i] = r(); for (let i = 0; i < logJ.length; i++) logJ[i] = r(); }

  // ----------------------------------------------------------- geometry --
  let S, L, hl, cx, wy, hz, bot, r0, step, logC0, yTop, yBack, dD, ySeat, vialY, vw, vh, bubW, mw, mastH, mastTop;
  let fw, fh, fLines, fSize, tokenKey = null;
  let wA, hA, wB, hB, xA, xB0, xBal, track, torque0, sk0, c2, fX0, fDX, mx, my;
  const logY = new Float32Array(NB), logRr = new Float32Array(NB), logLen = new Float32Array(NB), logOx = new Float32Array(NB);
  let logSpr = [], sprA = null, sprB = null, sprF = null;
  let waterGrad, horizonGrad, tintGrad, mastGrad, vialGrad, brassGrad;
  let X0 = 0, Y0 = 0, cs = 1, sn = 0;

  function fit() {
    S = stage.s;
    L = Math.min(stage.w * 0.86, stage.h * 0.8, 430);
    hl = L / 2;
    cx = stage.cx;
    hz = stage.y + stage.h * 0.27;
    const short = stage.h < 330;                                         // small phones: more sky for mast + flag
    wy = stage.y + stage.h * (short ? 0.665 : 0.6);
    bot = stage.y + stage.h;
    // lashed logs, lying lengthwise, receding from front (0) to back (NB-1)
    r0 = Math.max(12, L * 0.074); step = r0 * 0.52; logC0 = -r0 * 0.2;
    for (let j = 0; j < NB; j++) {
      logY[j] = logC0 - j * step; logRr[j] = r0 * (1 - j * 0.07);
      logLen[j] = L * (1 - 0.012 * j) + (logJ[j * 2] - 0.5) * L * 0.035; logOx[j] = (logJ[j * 2 + 1] - 0.5) * L * 0.025;
    }
    yTop = logC0 - r0; yBack = logY[NB - 1] - logRr[NB - 1]; dD = yTop - yBack; ySeat = yTop - dD * 0.5;
    vw = L * 0.28; vh = Math.max(10, r0 * 0.5); vialY = logC0 - r0 * 0.5; bubW = vh * 1.8;
    mw = Math.max(3, L * 0.013);
    wA = Math.max(48, L * 0.24); hA = wA / 1.3; wB = Math.max(46, L * 0.215); hB = wB / 1.3;
    xA = side * aU * hl;
    xB0 = xA - side * (wA / 2 + wB / 2 + L * 0.02);
    xBal = -side * (aU / mB) * hl;
    track = xBal - xB0;
    torque0 = Math.abs(xA + mB * xB0);
    sk0 = r0 * 0.22;
    fitFlag(short ? 2 : 3);
    const above = wy - stage.y;
    mastH = clamp(above + yBack - 18, L * 0.3, L * 0.54);
    mastH = Math.max(mastH, Math.min(above + yBack - 14, fh + fw * 0.07 + (ySeat - yBack) + hA + 16));   // keep the flag (and its droop) clear of the stones
    mastTop = yBack + 3 - mastH;
    mx = cx + moonU * stage.w; my = hz - 8 * S;
    // water field spans the stage (plus margins)
    fX0 = stage.x - 30; fDX = (stage.w + 60) / (NF - 1);
    c2 = Math.pow((150 * S) / fDX, 2);
    buildSprites();
    buildGradients();
    for (const f of floats) {
      f.size = Math.max(46, L * (f.front ? 0.175 : 0.15));
      f.bx = clamp(cx + f.ux * stage.w, stage.x + f.size * 0.6, stage.x + stage.w - f.size * 0.6);
      f.by = f.front ? lerp(wy + r0 * 2.2, bot - f.size * 0.45, (f.uy - 0.4) / 0.5) : lerp(hz + 10 * S, wy + yBack - f.size * 0.42, f.uy);
      if (finAt < 0) { f.x = f.bx; f.y = f.by; }
    }
    sx = xB0 + track * prog;
    updXf();
  }
  let flagMax = 3;
  function fitFlag(maxLines = flagMax) {
    flagMax = maxLines; tokenKey = words.token;
    fSize = Math.max(12.5, 12 * stage.s + 1.5);
    fw = maxLines < 3 ? stage.w * 0.5 - 10 : Math.min(clamp(L * 0.55, 118, 200), stage.w * 0.5 - 10);
    g.save(); g.font = `600 ${fSize}px ${FONT}`;
    const tok = String(words.token || '').trim();
    let ls = wrap(g, tok, fw - 24, 2);
    fLines = Math.max(1, ls.length);
    if (maxLines > 2 && ls.length === 2 && ls.join(' ') !== tok) { ls = wrap(g, tok, fw - 24, 3); fLines = Math.max(1, ls.length); }
    g.restore();
    fh = fLines * fSize * 1.2 + 16;
  }

  // -------------------------------------------------------- sprites --
  function logSprite(j) {
    const len = logLen[j], r = logRr[j], cap = r * 0.3, pad = 3;
    const W = len + cap * 2 + pad * 2, H = r * 2 + pad * 2;
    const c = makeCanvas(Math.ceil(W * dpr), Math.ceil(H * dpr)), q = c.getContext('2d');
    q.scale(dpr, dpr); q.translate(pad + cap, pad);
    const dark = j * 0.13, rr = rng(57 + j * 29);
    const body = () => { q.beginPath(); q.moveTo(0, 0); q.lineTo(len, 0); q.ellipse(len, r, cap, r, 0, -Math.PI / 2, Math.PI / 2); q.lineTo(0, r * 2); q.ellipse(0, r, cap, r, 0, Math.PI / 2, Math.PI * 1.5); q.closePath(); };
    let gr = q.createLinearGradient(0, 0, 0, r * 2);
    gr.addColorStop(0, mix('#f2dbb0', '#2a1a10', dark)); gr.addColorStop(0.18, mix('#d8b07c', '#2a1a10', dark));
    gr.addColorStop(0.6, mix('#9a6c44', '#2a1a10', dark)); gr.addColorStop(1, mix('#4a2f1e', '#140a06', dark));
    body(); q.fillStyle = gr; q.fill();
    q.save(); body(); q.clip();
    // bark streaks and knots along the grain
    for (let i = 0; i < 26; i++) {
      const y = r * 2 * (0.08 + rr() * 0.86), x0 = rr() * len, l = len * (0.08 + rr() * 0.3);
      q.strokeStyle = rr() < 0.55 ? `rgba(60,36,20,${0.18 + rr() * 0.16})` : `rgba(255,236,200,${0.1 + rr() * 0.12})`;
      q.lineWidth = 0.6 + rr() * 1.1; q.beginPath(); q.moveTo(x0, y); q.quadraticCurveTo(x0 + l * 0.5, y + (rr() - 0.5) * r * 0.2, x0 + l, y + (rr() - 0.5) * r * 0.1); q.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = len * (0.15 + rr() * 0.7), y = r * (0.7 + rr() * 0.7);
      q.fillStyle = 'rgba(58,34,18,0.45)'; q.beginPath(); q.ellipse(x, y, r * 0.16, r * 0.09, 0, 0, TAU); q.fill();
      q.strokeStyle = 'rgba(255,230,190,0.2)'; q.lineWidth = 0.8; q.beginPath(); q.ellipse(x, y, r * 0.24, r * 0.14, 0, 0, TAU); q.stroke();
    }
    q.restore();
    // moonlit top edge
    q.strokeStyle = `rgba(255,240,214,${0.55 - dark})`; q.lineWidth = Math.max(1, r * 0.08); q.lineCap = 'round';
    q.beginPath(); q.moveTo(cap * 0.4, r * 0.16); q.lineTo(len - cap * 0.4, r * 0.16); q.stroke();
    // cut ends with growth rings
    for (const ex of [0, len]) {
      const fg = q.createRadialGradient(ex, r, r * 0.05, ex, r, r);
      fg.addColorStop(0, mix('#f9e6c4', '#2a1a10', dark + (ex ? 0 : 0.15))); fg.addColorStop(0.8, mix('#d2a670', '#2a1a10', dark + (ex ? 0 : 0.15))); fg.addColorStop(1, mix('#7a5232', '#140a06', dark));
      q.fillStyle = fg; q.beginPath(); q.ellipse(ex, r, cap * 0.92, r * 0.94, 0, 0, TAU); q.fill();
      q.strokeStyle = 'rgba(120,80,46,0.35)'; q.lineWidth = 0.7;
      for (let k = 1; k <= 3; k++) { q.beginPath(); q.ellipse(ex, r, cap * 0.92 * (k / 3.6), r * 0.94 * (k / 3.6), 0, 0, TAU); q.stroke(); }
      q.strokeStyle = 'rgba(46,28,16,0.7)'; q.lineWidth = 1; q.beginPath(); q.ellipse(ex, r, cap * 0.92, r * 0.94, 0, 0, TAU); q.stroke();
    }
    return { c, ox: -(pad + cap), oy: -(pad + r), w: W, h: H };
  }
  function stoneSprite(w, h, col, seed, veins = true) {
    const pad = h * 0.16, W = Math.max(2, Math.ceil(w * dpr)), H = Math.max(2, Math.ceil((h + pad) * dpr));
    const c = makeCanvas(W, H), q = c.getContext('2d');
    q.scale(dpr, dpr);
    q.save(); q.translate(w * 0.02, h * 0.12); shapePath(q, 'stone', w * 0.96, h * 0.96, seed); q.fillStyle = mix(col, '#0a0614', 0.62); q.fill(); q.restore();
    shapePath(q, 'stone', w, h, seed);
    const gr = q.createRadialGradient(w * 0.36, h * 0.3, h * 0.05, w * 0.5, h * 0.55, w * 0.62);
    gr.addColorStop(0, mix(col, '#ffffff', 0.55)); gr.addColorStop(0.45, col); gr.addColorStop(1, mix(col, '#0a0614', 0.45));
    q.fillStyle = gr; q.fill();
    q.save(); q.clip();
    const rr = rng(seed * 7 + 3);
    for (let i = 0; i < 46; i++) { q.fillStyle = rr() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(20,10,30,0.14)'; q.beginPath(); q.arc(rr() * w, rr() * h, 0.4 + rr() * 1.2, 0, TAU); q.fill(); }
    if (veins) {
      q.strokeStyle = 'rgba(255,255,255,0.3)'; q.lineWidth = Math.max(1.1, h * 0.045);
      const vy = h * (0.38 + rr() * 0.26);
      q.beginPath(); q.moveTo(-2, vy + h * 0.14); q.bezierCurveTo(w * 0.3, vy - h * 0.12, w * 0.62, vy + h * 0.2, w + 2, vy - h * 0.06); q.stroke();
    }
    const og = q.createLinearGradient(0, h * 0.5, 0, h); og.addColorStop(0, 'rgba(8,4,20,0)'); og.addColorStop(1, 'rgba(8,4,20,0.34)');
    q.fillStyle = og; q.fillRect(0, 0, w, h);
    q.restore();
    q.globalCompositeOperation = 'lighter';
    q.fillStyle = 'rgba(255,255,255,0.3)'; q.beginPath(); q.ellipse(w * 0.34, h * 0.24, w * 0.2, h * 0.085, -0.35, 0, TAU); q.fill();
    return { c, w, h: h + pad };
  }
  function buildSprites() {
    logSpr = [];
    for (let j = 0; j < NB; j++) logSpr.push(logSprite(j));
    sprA = stoneSprite(wA, hA, anchorCol, 3);
    sprB = stoneSprite(wB, hB, heroCol, 7);
    const fs = Math.max(46, L * 0.16);
    sprF = stoneSprite(fs, fs / 1.3, floatCol, 13, false);
  }
  function buildGradients() {
    const top = hz - 12, H = bot + 14 - top;
    waterGrad = g.createLinearGradient(0, top, 0, top + H);
    waterGrad.addColorStop(0, rgba(waterHi, 0)); waterGrad.addColorStop(0.035, rgba(waterHi, 0.58));
    waterGrad.addColorStop(0.3, rgba(water, 0.72)); waterGrad.addColorStop(0.82, rgba(waterDeep, 0.82)); waterGrad.addColorStop(1, rgba(waterDeep, 0));
    horizonGrad = g.createLinearGradient(0, hz - 8, 0, hz + 16);
    horizonGrad.addColorStop(0, rgba(moonCol, 0)); horizonGrad.addColorStop(0.35, rgba(moonCol, 0.24)); horizonGrad.addColorStop(1, rgba(moonCol, 0));
    tintGrad = g.createLinearGradient(0, wy - 6, 0, wy + r0 * 1.6);
    tintGrad.addColorStop(0, rgba(mix(water, waterHi, 0.35), 0.5)); tintGrad.addColorStop(0.3, rgba(water, 0.7)); tintGrad.addColorStop(1, rgba(waterDeep, 0.92));
    // raft-local gradients (drawn under the raft transform, so they stay valid while it rocks)
    mastGrad = g.createLinearGradient(-mw, 0, mw, 0);
    mastGrad.addColorStop(0, '#6a4628'); mastGrad.addColorStop(0.4, '#e6c48e'); mastGrad.addColorStop(1, '#7a5230');
    vialGrad = g.createLinearGradient(0, vialY - vh / 2, 0, vialY + vh / 2);
    vialGrad.addColorStop(0, rgba(mix(liquid, '#ffffff', 0.35), 0.95)); vialGrad.addColorStop(0.5, rgba(liquid, 0.92)); vialGrad.addColorStop(1, rgba(mix(liquid, '#1a3a10', 0.45), 0.95));
    brassGrad = g.createLinearGradient(0, vialY - vh / 2 - 3, 0, vialY + vh / 2 + 3);
    brassGrad.addColorStop(0, '#fff0c0'); brassGrad.addColorStop(0.45, '#d9a64e'); brassGrad.addColorStop(1, '#7a521c');
  }
  fit();
  E.onResize(fit);

  // initial pose: already tilted towards the loaded end, gently rocking
  th = maxTilt * (xA + mB * sx) / torque0; thv = side * 0.04; sk = sk0;
  updXf();

  // ------------------------------------------------------- helpers --
  function updXf() { const a = th + thAmb; cs = Math.cos(a); sn = Math.sin(a); X0 = cx + rX; Y0 = wy + sk + rideY; }
  const lsx = (lx, ly) => X0 + lx * cs - ly * sn;
  const lsy = (lx, ly) => Y0 + lx * sn + ly * cs;
  const ampNow = () => S * (1.1 + 2.6 * agit * energy) * (reduced ? 0.55 : 1);
  function amb(x, t) { return ampNow() * (0.55 * Math.sin(x * 0.021 + t * 1.05) + 0.3 * Math.sin(x * 0.047 - t * 1.6 + 1.3) + 0.25 * Math.sin(x * 0.009 + t * 0.55 + 2.1)); }
  function fieldAt(x) { const u = (x - fX0) / fDX, i = Math.floor(u); if (i < 0 || i >= NF - 1) return 0; const f = u - i; return hF[i] * (1 - f) + hF[i + 1] * f; }
  function inject(x, v) { const i = Math.round((x - fX0) / fDX); if (i < 1 || i > NF - 2) return; vF[i] += v; vF[i - 1] += v * 0.5; vF[i + 1] += v * 0.5; }
  const surf = (x, t) => wy + amb(x, t) + fieldAt(x);
  function ring(x, y, r, a, v = 40) {
    let i = 0;
    if (ringN < RN) i = ringN++;
    else { let lo = 2; for (let k = 0; k < RN; k++) if (ringA[k] < lo) { lo = ringA[k]; i = k; } }
    ringX[i] = x; ringY[i] = y; ringR[i] = r; ringA[i] = a; ringV[i] = v * S;
  }
  const stoneLocalY = () => ySeat - hB / 2 - lift * 3 * S;
  const pan = (x) => clamp((x - cx) / (stage.w * 0.5), -1, 1) * 0.6;

  // ---------------------------------------------------- simulation --
  function simulate(dt, t) {
    if (assistTo != null && dt > 0) {
      wanted = Math.min(assistTo, wanted + dt * 0.26);
      if (assistTo - wanted < 1e-3) { wanted = assistTo; assistTo = null; }
    }
    const p = E.gate(wanted);                                           // the world law decides the real state
    prog = p;
    if (wanted > p + CAP) wanted = p + CAP;                             // never bank input past the law
    if (dt <= 0) return;
    const target = xB0 + track * p;
    const steps = Math.min(8, Math.max(1, Math.ceil(dt * 120))), h = dt / steps;
    const Kt = heavy ? 11 : 15, Ct = lerp(heavy ? 3 : 2.1, 5.2, smooth(p)) + (finAt >= 0 ? 3 : 0);
    for (let k = 0; k < steps; k++) {
      const sv0 = sv;
      sv += (-(sx - target) * 240 - sv * 27) * h; sx += sv * h;          // the stone slides on wet wood
      const acc = (sv - sv0) / h;
      const thT = maxTilt * (xA + mB * sx) / torque0;                     // torque of both loads
      thv += (-(th - thT) * Kt - thv * Ct - acc * 0.0006 * energy) * h; th += thv * h;
      rxV += (-rX * 3.2 - rxV * 2.4 - acc * 0.045) * h; rX += rxV * h;    // the push nudges the raft back
      skV += (-(sk - sk0) * 26 - skV * 5.5) * h; sk += skV * h;
      for (let i = 1; i < NF - 1; i++) vF[i] += (c2 * (hF[i - 1] + hF[i + 1] - 2 * hF[i]) - 1.5 * vF[i] - 3 * hF[i]) * h;
      for (let i = 1; i < NF - 1; i++) hF[i] += vF[i] * h;
    }
    rX = clamp(rX, -12 * S, 12 * S);
    const lim = 15 * S; for (let i = 0; i < NF; i++) hF[i] = clamp(hF[i], -lim, lim);
    // the ends push water: bulges and rings spread from the dipping end
    const eL = -hl * Math.sin(th) + sk, eR = hl * Math.sin(th) + sk;
    const vL = (eL - yEndL) / dt, vR = (eR - yEndR) / dt; yEndL = eL; yEndR = eR;
    const xl = X0 - hl * cs, xr = X0 + hl * cs;
    inject(xl - r0 * 0.6, -vL * 10 * dt); inject(xr + r0 * 0.6, -vR * 10 * dt);
    splashCD -= dt; refuseCD -= dt; tickCD -= dt;
    if (Math.max(vL, vR) > 34 * S && splashCD <= 0 && finAt < 0) {
      splashCD = 0.35;
      const ex = vR > vL ? xr : xl, ey = surf(ex, t);
      if (!reduced) E.particles.burst(ex, ey - 2, Math.round(4 + 6 * energy), { dir: -Math.PI / 2, spread: 1.5, speed: 90 * S, gravity: 300, drag: 0.96, colour: foam, life: 0.75, size: 3.4, kind: 'dot' });
      ring(ex, ey + 2, 8 * S, 0.5, 46);
      E.sound('swish', { intensity: 0.12 + 0.12 * energy, pan: pan(ex) });
    }
    // the raft rides the waves
    const sl = surf(xl, t) - wy, sc = surf(X0, t) - wy, sr = surf(xr, t) - wy;
    rideY = lerp(rideY, (sl + sc * 2 + sr) / 4 * 0.75, 1 - Math.exp(-dt * 8));
    thAmb = lerp(thAmb, Math.atan2(sr - sl, xr - xl) * 0.45, 1 - Math.exp(-dt * 6));
    // agitation of the scene (drives chop, flag flutter, colours)
    const ag = clamp(Math.abs(th) / maxTilt * 0.55 + Math.abs(thv) * 1.6 + rush * 0.45) * (finAt >= 0 ? 0.1 : 1);
    agit = lerp(agit, Math.max(0.05, ag), 1 - Math.exp(-dt * 1.6));
    if (drag == null) rush = Math.max(0, rush - dt * 1.4);
    lift += ((drag != null || assistTo != null ? 1 : 0) - lift) * (1 - Math.exp(-dt * 12));
    wob.update(dt);
    // float-level bubble: a viscous glide to the high side
    const bt = clamp(-(th + thAmb * 0.6) / maxTilt, -1, 1) * (vw / 2 - bubW / 2 - vh * 0.35);
    bubV += (-(bub - bt) * 55 - bubV * 10) * dt; bub += bubV * dt;
    // stepping notes along the deck
    const si = Math.floor(p * 12 + 1e-6);
    if (si !== stepIdx) {
      const up = si > stepIdx; stepIdx = si;
      E.sound('drip', { note: clamp(Math.round(p * 9), 0, 9), intensity: up ? 0.3 : 0.18, pan: clamp(sx / hl, -1, 1) * 0.5 });
      if (tickCD <= 0) { tickCD = 0.12; E.haptic('tick'); }
    }
    // the photos lighten as the raft finds its balance
    for (let k = 0; k < floats.length; k++) {
      const f = floats[k];
      if (!f.lighting && p >= f.thr) lightFloat(f, k);
      if (f.lighting) f.light = Math.min(1, f.light + dt / 1.2);
      f.dipV += (-f.dip * 34 - f.dipV * 4.5) * dt; f.dip += f.dipV * dt;
    }
    if (!anchorLighting && p >= 0.9) {
      anchorLighting = true;
      const ax = lsx(xA, ySeat - hA / 2), ay = lsy(xA, ySeat - hA / 2);
      if (anchorPh >= 0) { photos.dust(anchorPh, ax, ay, wA, 12, { shape: 'stone', up: 26, speed: 18 }); E.checkpoint('photo', anchorPh); }
      E.sound('glass', { note: 5, intensity: 0.35, pan: pan(ax) });
    }
    if (anchorLighting) anchorLight = Math.min(1, anchorLight + dt / 1.3);
    // win: the stone at the balance point, finger lifted, the raft floating level for one beat
    const atBal = p >= 0.999 && assistTo == null;
    const level = Math.abs(th) < 0.02 && Math.abs(thv) < 0.12;
    if (!doneFlag) {
      if (atBal && level) {
        if (levelAt < 0) {
          levelAt = t;
          E.sound('glass', { note: 7, intensity: 0.4 }); E.checkpoint('step');
          if (!heroLighting) {
            heroLighting = true;
            const hx = lsx(sx, stoneLocalY()), hy = lsy(sx, stoneLocalY());
            if (hero >= 0) { photos.dust(hero, hx, hy, wB, 14, { shape: 'stone', up: 30, speed: 20 }); E.checkpoint('photo', hero); }
          }
        }
        if (drag == null) { beat += dt; if (beat >= BEAT) { doneFlag = true; E.sound('settle', { intensity: 0.5 }); E.haptic('soft'); } }
        else if (!heldHint) { heldHint = true; E.hint('Lift your finger — let the raft float level for a beat.'); }
      } else { beat = Math.max(0, beat - dt * 2); if (!atBal) levelAt = -1; }
    }
    if (heroLighting) heroLight = Math.min(1, heroLight + dt / 1.3);
    // rings + finale drift
    for (let i = 0; i < ringN; i++) { ringR[i] += ringV[i] * dt; ringV[i] *= Math.pow(0.4, dt); ringA[i] = Math.max(0, ringA[i] - dt * 0.42); }
    if (finAt >= 0) {
      const k = ease.inOutSine(clamp((t - finAt) / 3));
      for (const f of floats) { f.x = lerp(f.sx, f.tx, k); f.y = lerp(f.sy, f.ty, k); }
    }
  }
  function lightFloat(f, k) {
    f.lighting = true;
    if (f.ph >= 0) { photos.dust(f.ph, f.x, f.y, f.size, 10, { shape: 'stone', up: 24, speed: 16 }); E.checkpoint('photo', f.ph); }
    else E.particles.burst(f.x, f.y, reduced ? 3 : 7, { speed: 26, colour: litGlow, life: 1.1, size: 6, dir: -Math.PI / 2, spread: 1.6 });
    ring(f.x, f.y + f.size * 0.25, f.size * 0.5, 0.45, 30);
    E.sound('glass', { note: 2 + (k % 5), intensity: 0.3, pan: pan(f.x) });
  }

  // -------------------------------------------------------- drawing --
  function frame(dt, t) {
    if (words.token !== tokenKey) fitFlag();
    simulate(dt, t);
    updXf();
    const calmK = Math.max(calm0, smooth(prog));
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    computeSurface(t);
    drawWaterBack(t, calmK, fin);
    drawFloats(t, false, fin);
    drawFinaleWater(t);
    shadow(g, X0, wy + 4, hl * 1.12, r0 * 0.9, 0.32);
    drawReflection(t, fin);
    drawRaft(t, calmK, fin);
    drawSubmerged(t);
    drawWaterFront(t, calmK, fin);
    drawRings();
    drawFloats(t, true, fin);
    drawTwist(t);
    drawFinaleLights(t);
  }
  function computeSurface(t) {
    const ext = hl + r0 * 0.5, xl = X0 - ext * Math.abs(cs), xr = X0 + ext * Math.abs(cs);
    for (let k = 0; k < SURF; k++) { const x = lerp(xl, xr, k / (SURF - 1)); surfX[k] = x; surfY[k] = surf(x, t); }
  }

  function drawWaterBack(t, calmK, fin) {
    const W = E.view.w;
    g.fillStyle = waterGrad; g.fillRect(0, hz - 12, W, bot + 26 - hz);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = horizonGrad; g.fillRect(0, hz - 8, W, 24);
    // the moonlight pooled on the water
    g.save(); g.translate(mx, lerp(hz, wy, 0.5)); g.scale(0.55, 1.6); glow(g, 0, 0, (wy - hz) * 0.5, moonCol, 0.12 + 0.06 * calmK + fin * 0.06); g.restore();
    g.save(); g.translate(mx, lerp(hz, wy, 0.4)); g.scale(1, 0.3); glow(g, 0, 0, stage.w * 0.55, moonCol, 0.2 + 0.08 * calmK + fin * 0.08); g.restore();
    // soft light resting on the horizon haze (the realm's own moon or sun, reflected)
    g.save(); g.translate(mx, my + 6 * S); g.scale(2.2, 0.55); glow(g, 0, 0, 46 * S, moonCol, 0.5 + fin * 0.2); g.restore();
    glow(g, mx, my + 5 * S, 90 * S, moonCol, 0.2 + fin * 0.12);
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const u = Math.sin(t * (0.045 + i * 0.012) + i * 2.1), y = lerp(hz + 12 * S, bot - 20 * S, (i + 0.6) / 3.4);
      g.save(); g.translate(cx + u * stage.w * 0.36, y); g.scale(1, 0.22);
      glow(g, 0, 0, stage.w * (0.32 + 0.06 * i), i === 1 ? pal.accent : glowC, (0.07 + 0.03 * Math.sin(t * 0.3 + i)) * (1 - 0.3 * calmK));
      g.restore();
    }
    g.restore();
    if (twistKind === 1 && twistAt >= 0) drawIsland(t);
    drawGlitter(t, true, fin);
    drawRows(t, true, calmK);
    // motes drifting above the water
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < MOTES; i++) {
      const u = moteU[i * 4], v = moteU[i * 4 + 1], sp = moteU[i * 4 + 2], ph = moteU[i * 4 + 3] * TAU;
      const x = stage.x + ((u * stage.w + t * (4 + sp * 6) * S) % stage.w);
      const y = lerp(hz - 30 * S, wy + 20 * S, v) + Math.sin(t * 0.6 + ph) * 6 * S;
      const a = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * (0.8 + sp) + ph))) * (0.6 + 0.4 * calmK);
      glow(g, x, y, (3 + sp * 3) * S, glowC, a);
    }
    g.restore();
  }
  function drawRows(t, back, calmK) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const W = E.view.w;
    for (let j = 0; j < ROWS; j++) {
      const f = (j + 1) / (ROWS + 1), y0 = hz + (bot - hz) * Math.pow(f, 1.55);
      if ((y0 < wy - 2) !== back) continue;
      const a = (0.06 + 0.14 * f) * (0.55 + 0.45 * agit) * (1 - 0.3 * calmK);
      g.strokeStyle = rgba(mix(waterHi, '#ffffff', 0.3), a); g.lineWidth = 0.7 + 1.5 * f;
      g.beginPath();
      for (let d = 0; d < 4; d++) {
        const o = dash[(j * 4 + d) * 2], len = (40 + dash[(j * 4 + d) * 2 + 1] * 90) * S * (0.5 + f);
        const x0 = ((o * W * 1.4 + t * (5 + 10 * f) * S * (j % 2 ? 1 : -1)) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2;
        for (let s = 0; s <= 6; s++) {
          const x = x0 + (s / 6) * len, y = y0 + amb(x * (1.7 - f), t + j * 1.3) * f * 0.9 + fieldAt(x) * f * 0.5;
          s ? g.lineTo(x, y) : g.moveTo(x, y);
        }
      }
      g.stroke();
    }
    g.restore();
  }
  function drawGlitter(t, back, fin) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let j = 0; j < GLIT; j++) {
      const f = (j + 0.5) / GLIT, y = hz + 3 * S + (bot - hz) * Math.pow(f, 1.45);
      if ((y < wy - 2) !== back) continue;
      const hw = (5 + 38 * f) * S * (0.55 + 0.45 * Math.sin(j * 2.3 + 1)), x = mx + Math.sin(t * 0.7 + j * 1.9) * (2 + 8 * f) * S;
      const sh = 0.5 + 0.5 * Math.sin(t * (1.6 + (j % 3) * 0.4) + j * 2.1);
      const a = (0.24 + 0.5 * sh) * (1 - f * 0.45) * (1 + fin * 0.5);
      g.strokeStyle = rgba(moonCol, Math.min(1, a)); g.lineWidth = (1.4 + 2.4 * f) * S;
      const yy = y + amb(x, t + j) * f * 0.6;
      g.beginPath(); g.moveTo(x - hw, yy); g.lineTo(x + hw, yy); g.stroke();
    }
    g.restore();
  }
  function drawRings() {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < ringN; i++) {
      if (ringA[i] <= 0.01) continue;
      g.strokeStyle = rgba(foam, ringA[i] * 0.8); g.lineWidth = 1 + ringA[i] * 1.6;
      g.beginPath(); g.ellipse(ringX[i], ringY[i], ringR[i], ringR[i] * 0.26, 0, 0, TAU); g.stroke();
    }
    g.restore();
  }
  function drawBeat(t) {
    if (levelAt < 0 || finAt >= 0) return;
    const k = doneFlag ? 1 : clamp(beat / BEAT), reach = hl * 1.05 * ease.outCubic(k);
    if (reach < 1) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const [w, a] of [[9 * S, 0.12], [2.2 * S, 0.6]]) {
      g.strokeStyle = rgba(litGlow, a * (0.6 + 0.4 * k)); g.lineWidth = w;
      g.beginPath(); g.moveTo(X0 - reach * cs, surf(X0 - reach * cs, t) + 1); g.lineTo(X0, surf(X0, t) + 1); g.lineTo(X0 + reach * cs, surf(X0 + reach * cs, t) + 1); g.stroke();
    }
    g.restore();
  }
  function drawWaterFront(t, calmK, fin) {
    // the waterline: a lapping line of light where the water meets the logs
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, a] of [[6 * S, 0.12], [1.6 * S, 0.55]]) {
      g.strokeStyle = rgba(foam, a * (0.75 + 0.25 * calmK)); g.lineWidth = w;
      g.beginPath(); for (let k = 0; k < SURF; k++) k ? g.lineTo(surfX[k], surfY[k]) : g.moveTo(surfX[k], surfY[k]); g.stroke();
    }
    g.restore();
    drawBeat(t);
    drawRows(t, false, calmK);
    drawGlitter(t, false, fin);
  }

  function drawReflection(t, fin) {
    const wl = wy + sk * 0.5;
    g.save();
    g.beginPath(); g.rect(0, wy + 2, E.view.w, bot - wy + 20); g.clip();
    g.translate(0, wl); g.transform(1, 0, reduced ? 0 : Math.sin(t * 1.2) * 0.035, -0.72, 0, 0); g.translate(0, -wl);
    g.translate(X0, Y0); g.rotate(th + thAmb);
    // a reflection is darker than the thing it mirrors: a deep silhouette, then a faint colour echo
    g.fillStyle = rgba(waterDeep, 0.55 * (1 - fin * 0.25)); roundRect(g, -hl - r0 * 0.3, yBack, L + r0 * 0.6, logC0 + r0 - yBack, r0 * 0.6); g.fill();
    g.globalAlpha = 0.1 * (1 - fin * 0.25);
    drawLogs(t, true);
    g.globalAlpha = 0.16 * (1 - fin * 0.25);
    drawStones(t, 0, 0, true);
    g.globalAlpha = 0.08; g.fillStyle = mastGrad; g.fillRect(-mw / 2, mastTop, mw, yBack + 3 - mastTop);
    g.restore();
  }
  function drawRaft(t, calmK, fin) {
    g.save(); g.translate(X0, Y0); g.rotate(th + thAmb);
    drawMast(t, calmK, fin);
    drawLogs(t, false);
    drawDeckTrack(t, calmK);
    drawFlag(t, calmK, fin);
    drawVial(t, fin);
    drawStones(t, calmK, fin, false);
    g.restore();
  }
  function drawLogs(t, refl) {
    for (let j = NB - 1; j >= 0; j--) {
      const s = logSpr[j], bob = reduced ? 0 : Math.sin(t * 1.2 + j * 1.7) * 0.5;
      g.drawImage(s.c, logOx[j] - logLen[j] / 2 + s.ox, logY[j] + s.oy + bob, s.w, s.h);
    }
    if (refl) return;
    // rope lashings binding the logs together
    for (const u of [-0.64, 0.64]) {
      const x = u * hl, w = Math.max(3, r0 * 0.2), y0 = yBack + 1, y1 = logC0 + r0 * 0.92;
      g.fillStyle = '#cdb68c'; g.fillRect(x - w / 2, y0, w, y1 - y0);
      g.strokeStyle = 'rgba(92,64,36,0.6)'; g.lineWidth = 0.9;
      g.beginPath(); for (let y = y0 + 2; y < y1; y += 3.2) { g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y + 2.2); } g.stroke();
      g.fillStyle = 'rgba(255,240,210,0.35)'; g.fillRect(x - w / 2, y0, w * 0.3, y1 - y0);
    }
  }
  function drawDeckTrack(t, calmK) {
    // the warm track the stone has travelled, and the raft's quiet centre of weight
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(glowC, 0.14 + 0.2 * calmK); g.lineWidth = Math.max(3, dD * 0.22);
    g.beginPath(); g.moveTo(xB0, ySeat + 2); g.lineTo(sx, ySeat + 2); g.stroke();
    const near = smooth(invLerp(0.5, 0.97, prog));
    if (near > 0) glow(g, xBal, ySeat, wB * 0.55, litGlow, near * (0.35 + 0.15 * Math.sin(t * 2.2)));
    g.restore();
  }
  function drawMast(t, calmK, fin) {
    // stays: thin ropes to both ends
    g.strokeStyle = rgba('#f3e2c2', 0.42); g.lineWidth = 1.1;
    for (const s of [-1, 1]) { const ex = s * hl * 0.9, ey = yBack + dD * 0.3; g.beginPath(); g.moveTo(0, mastTop + 3); g.quadraticCurveTo(ex * 0.5, (mastTop + ey) / 2 + 5 * S, ex, ey); g.stroke(); }
    g.fillStyle = mastGrad; g.fillRect(-mw / 2, mastTop, mw, yBack + 3 - mastTop);
    // lantern finial: breathes slowly; lifts away at the finale
    const rise = finAt >= 0 ? ease.inOutSine(clamp((E.now() - finAt - 0.6) / 3)) * 46 * S : 0;
    const ly = mastTop - 5 * S - rise, br = 0.5 + 0.5 * Math.sin(t * 1.4);
    glow(g, 0, ly, (16 + 6 * br) * S, warm, 0.35 + 0.25 * br + fin * 0.2);
    orb(g, 0, ly, 3.6 * S, mix(warm, '#fff4dc', 0.5));
    if (rise > 0) { g.fillStyle = '#5a3a22'; g.fillRect(-mw * 0.8, mastTop - 1.5, mw * 1.6, 2.5); }
  }
  function flagWave(x, amp, k, ph) { return amp * Math.sin(x * k - ph) * Math.pow(Math.max(0, x) / fw, 0.85); }
  function drawFlag(t, calmK, fin) {
    const amp = S * (1.2 + 4.2 * agit) * (reduced ? 0.45 : 1) * (1 - fin * 0.6);
    const k = TAU / (fw * 0.95), ph = t * (2.2 + 2.6 * agit * energy);
    const droop = lerp(0.025, 0.1, calmK) + fin * 0.02;
    const x0 = mw * 0.5, y0 = mastTop + 3;
    const N = 12;
    g.beginPath();
    for (let i = 0; i <= N; i++) { const x = (i / N) * fw; const y = y0 + flagWave(x, amp, k, ph) + droop * x; i ? g.lineTo(x0 + x, y) : g.moveTo(x0 + x, y); }
    for (let i = N; i >= 0; i--) { const x = (i / N) * fw; const y = y0 + fh + flagWave(x, amp, k, ph) * 1.1 + droop * x * 1.05; g.lineTo(x0 + x, y); }
    g.closePath();
    // soft drop shadow for definition on light skies
    g.save(); g.translate(1.5, 3); g.fillStyle = 'rgba(10,6,30,0.16)'; g.fill(); g.restore();
    const gr = g.createLinearGradient(x0, 0, x0 + fw, 0);
    for (let i = 0; i <= 8; i++) { const x = (i / 8) * fw; const shade = 0.5 - 0.5 * Math.cos(x * k - ph); gr.addColorStop(i / 8, mix(clothCol, clothShade, shade * clamp(amp / (5 * S)) * 0.8)); }
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = mix(clothShade, '#5a4060', 0.3); g.fillRect(x0 - 1, y0, 3, fh);       // hem along the mast
    if (fin > 0) glow(g, x0 + fw * 0.5, y0 + fh * 0.5 + droop * fw * 0.5, fw * 0.55, litGlow, 0.18 * fin);
    if (E.phase !== 'law') {
      const xc = fw * 0.52, slope = amp * k * Math.cos(xc * k - ph) * Math.pow(xc / fw, 0.85) + droop;
      words.draw(g, x0 + xc, y0 + fh * 0.5 + flagWave(xc, amp, k, ph) * 1.05 + droop * xc, {
        style: 'ink', size: fSize, maxWidth: fw - 24, lines: fLines, colour: inkCol, rot: Math.atan(slope) * 0.9, alpha: 0.96,
      });
    }
  }
  function drawVial(t, fin) {
    const x0 = -vw / 2, y0 = vialY - vh / 2;
    const lvl = 1 - clamp(Math.abs(bub) / (vw * 0.16));
    g.fillStyle = 'rgba(20,10,4,0.35)'; roundRect(g, x0 - 3, y0 + 1, vw + 6, vh + 5, (vh + 5) / 2); g.fill();
    g.fillStyle = brassGrad; roundRect(g, x0 - 4, y0 - 2.5, vw + 8, vh + 5, (vh + 5) / 2); g.fill();
    g.fillStyle = vialGrad; roundRect(g, x0, y0, vw, vh, vh / 2); g.fill();
    // centre marks: light up as the bubble arrives
    const mk = bubW / 2 + 2.5, on = lvl > 0.85;
    g.strokeStyle = on ? 'rgba(255,255,255,0.95)' : 'rgba(30,40,16,0.65)'; g.lineWidth = 1.3;
    g.beginPath(); for (const s of [-1, 1]) { g.moveTo(s * mk, y0 + 1.5); g.lineTo(s * mk, y0 + vh - 1.5); } g.stroke();
    if (on) glow(g, 0, vialY, vw * 0.32, liquid, 0.35 * lvl + fin * 0.2);
    // the bubble
    glow(g, bub, vialY, vh * 1.7, '#ffffff', 0.22 + 0.3 * lvl);
    g.fillStyle = 'rgba(255,255,255,0.88)'; g.beginPath(); g.ellipse(bub, vialY - vh * 0.08, bubW / 2, vh * 0.3, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(bub - bubW * 0.18, vialY - vh * 0.18, bubW * 0.14, vh * 0.08, 0, 0, TAU); g.fill();
    // glass highlight + brass straps
    g.fillStyle = 'rgba(255,255,255,0.32)'; roundRect(g, x0 + vh * 0.45, y0 + vh * 0.12, vw - vh * 0.9, vh * 0.2, vh * 0.1); g.fill();
    g.fillStyle = brassGrad; for (const s of [-1, 1]) g.fillRect(s * vw * 0.36 - 1.5, y0 - 3.5, 3, vh + 7);
  }
  function stoneBody(x, y, w, h, ph, seed, spr, lightK, rot, refl, rim) {
    if (ph >= 0) {
      g.save(); g.translate(x, y); if (rot) g.rotate(rot);
      g.translate(-w * 0.48, -h / 2 + h * 0.12); shapePath(g, 'stone', w * 0.96, h * 0.96, seed);
      g.fillStyle = mix(photos.colour(ph), '#0a0614', 0.62); g.fill(); g.restore();
      photos.draw(g, ph, x, y, w, { shape: 'stone', seed, shadow: false, rot, tone: 'storm', toneMix: stormMix * (1 - lightK),
        glow: refl ? 0 : 0.1 + lightK * 0.45, glowColour: lightK > 0.4 ? litGlow : glowC });
    } else {
      g.save(); g.translate(x, y); if (rot) g.rotate(rot);
      g.drawImage(spr.c, -w / 2, -h / 2, w, spr.h);
      g.restore();
    }
    if (refl) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); if (rot) g.rotate(rot);
    if (ph >= 0) { g.fillStyle = rgba('#ffffff', 0.13 + 0.07 * lightK); g.beginPath(); g.ellipse(-w * 0.16, -h * 0.27, w * 0.2, h * 0.08, -0.3, 0, TAU); g.fill(); }
    if (rim > 0) {
      // a soft rim of light: this is the stone to move
      g.translate(-w / 2, -h / 2); shapePath(g, 'stone', w, h, seed);
      g.strokeStyle = rgba(lightK > 0.4 ? litGlow : glowC, rim); g.lineWidth = 2; g.stroke();
      g.strokeStyle = rgba(lightK > 0.4 ? litGlow : glowC, rim * 0.35); g.lineWidth = 6; g.stroke();
    }
    g.restore();
  }
  function drawStones(t, calmK, fin, refl) {
    // anchor stone: rests in two little wooden chocks
    const ay = ySeat - hA / 2;
    if (!refl) {
      shadow(g, xA, ySeat + 1, wA * 0.52, Math.max(3, dD * 0.3), 0.55);
      if (anchorLight > 0) glow(g, xA, ay, wA * 0.8, litGlow, 0.22 * anchorLight * (0.8 + 0.2 * Math.sin(t * 1.5)));
    }
    stoneBody(xA, ay, wA, hA, anchorPh, 3, sprA, anchorLight, 0, refl, 0);
    if (!refl) {
      g.fillStyle = '#6e4a2c';
      for (const s of [-1, 1]) { const c2x = xA + s * wA * 0.42; g.beginPath(); g.moveTo(c2x - 4.5 * S, ySeat + 2); g.lineTo(c2x + 4.5 * S, ySeat + 2); g.lineTo(c2x + s * 1.5 * S, ySeat - 6 * S); g.closePath(); g.fill(); }
    }
    // the sliding stone
    const by = stoneLocalY();
    const rot = clamp(sv * 0.00035, -0.07, 0.07) + wob.v * 0.04;
    let rim = 0;
    if (!refl) {
      shadow(g, sx, ySeat + 1, wB * (0.5 + lift * 0.06), Math.max(3, dD * 0.3), 0.55 - lift * 0.12);
      const idle = !touched && finAt < 0;
      const br = 0.5 + 0.5 * Math.sin(t * 2.2);
      glow(g, sx, by, wB * 0.9, heroLight > 0.3 ? litGlow : glowC, (idle ? 0.22 + 0.16 * br : 0.12) + lift * 0.3 + heroLight * 0.2);
      rim = finAt >= 0 ? 0.25 : (idle ? 0.45 + 0.35 * br : 0.32) + lift * 0.3;
      if (idle && !reduced) {
        const dir = Math.sign(track) || 1;
        g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let k = 0; k < 3; k++) {
          const x = sx + dir * (wB * 0.62 + k * 9 * S);
          g.globalAlpha = 0.18 + 0.45 * Math.max(0, Math.sin(t * 3 - k * 0.9));
          g.beginPath(); g.moveTo(x - dir * 3 * S, by - 4.5 * S); g.lineTo(x + dir * 1.5 * S, by); g.lineTo(x - dir * 3 * S, by + 4.5 * S); g.stroke();
        }
        g.restore();
      }
    }
    stoneBody(sx, by, wB, hB, hero, 7, sprB, heroLight, rot, refl, rim);
    if (!refl && assistTo != null) glow(g, sx - Math.sign(track) * wB * 0.48, by, 14 * S, '#ffffff', 0.55);
  }
  function drawSubmerged(t) {
    g.save();
    // clip to the raft body (built under the raft transform, used in screen space)
    g.save(); g.translate(X0, Y0); g.rotate(th + thAmb);
    g.beginPath(); roundRect(g, -hl - r0 * 0.4, yBack - 2, L + r0 * 0.8, logC0 + r0 + 2 - yBack, r0 * 0.5);
    g.restore();
    g.clip();
    // wet wood just above the waterline
    g.beginPath(); for (let k = 0; k < SURF; k++) k ? g.lineTo(surfX[k], surfY[k] - 4) : g.moveTo(surfX[k], surfY[k] - 4);
    for (let k = SURF - 1; k >= 0; k--) g.lineTo(surfX[k], surfY[k]); g.closePath();
    g.fillStyle = 'rgba(40,20,10,0.2)'; g.fill();
    // the water itself
    g.beginPath(); for (let k = 0; k < SURF; k++) k ? g.lineTo(surfX[k], surfY[k]) : g.moveTo(surfX[k], surfY[k]);
    g.lineTo(surfX[SURF - 1], wy + r0 * 4); g.lineTo(surfX[0], wy + r0 * 4); g.closePath();
    g.fillStyle = tintGrad; g.fill();
    // drifting caustic light on the submerged logs
    if (!reduced) {
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(waterHi, 0.22); g.lineWidth = 1.2;
      for (let c = 0; c < 3; c++) {
        g.beginPath();
        for (let k = 0; k < SURF; k++) { const x = surfX[k], y = surfY[k] + (4 + c * 5) * S + Math.sin(x * 0.07 + t * (1.4 + c * 0.3) + c * 2) * 2.2 * S; k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    }
    g.restore();
  }
  function drawFloats(t, front, fin) {
    for (let k = 0; k < floats.length; k++) {
      const f = floats[k];
      if (f.front !== front) continue;
      const dk = front ? 1 : 0.6;
      const x = f.x + (reduced ? 0 : Math.sin(t * 0.13 + f.phase) * 4 * S);
      const y = f.y + (fieldAt(x) * 0.8 + amb(x * 0.9, t + f.phase)) * dk + f.dip - f.light * 3 * S;
      const slope = (amb(x + 10, t + f.phase) - amb(x - 10, t + f.phase)) / 20 * dk;
      const rot = Math.atan(slope) * 0.6 + (reduced ? 0 : Math.sin(t * 0.8 + f.phase) * 0.03);
      const w = f.size, h = w / 1.3;
      shadow(g, x, y + h * 0.34, w * 0.58, h * 0.18, 0.3);
      if (f.light > 0) glow(g, x, y, w * 0.9, litGlow, 0.25 * f.light * (0.8 + 0.2 * Math.sin(t * 1.3 + k)));
      if (f.ph >= 0) {
        photos.draw(g, f.ph, x, y, w, { shape: 'stone', seed: f.seed, shadow: false, rot, tone: 'storm', toneMix: stormMix * (1 - f.light),
          glow: 0.08 + 0.4 * f.light, glowColour: f.light > 0.4 ? litGlow : glowC });
      } else {
        g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = 0.92; g.drawImage(sprF.c, -w / 2, -h / 2, w, sprF.h * (w / sprF.w)); g.restore();
        // opalescent light drifting inside the moonstone
        const op = t * 0.5 + f.phase;
        glow(g, x + Math.cos(op) * w * 0.14, y - h * 0.08 + Math.sin(op * 1.3) * h * 0.1, w * 0.3, pal.accent, 0.18 + 0.12 * f.light);
        glow(g, x - Math.cos(op) * w * 0.12, y - h * 0.02, w * 0.34, glowC, 0.2 + 0.3 * f.light);
      }
      // where the pebble meets the water: a thin wet band and a lapping ring
      g.fillStyle = rgba(water, 0.3); g.beginPath(); g.ellipse(x, y + h * 0.38, w * 0.48, h * 0.12, rot * 0.5, 0, TAU); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rgba(foam, 0.24 + 0.08 * Math.sin(t * 1.7 + k)); g.lineWidth = 1;
      g.beginPath(); g.ellipse(x, y + h * 0.36, w * 0.56, h * 0.16, 0, 0, TAU); g.stroke();
      g.restore();
    }
  }

  // ---------------------------------------------------- twist + finale --
  function drawIsland(t) {
    const k = smooth(clamp((t - twistAt) / 2.6));
    const ix = mx - stage.w * 0.07, iw = stage.w * 0.13, ih = 12 * S * k;
    const col = mix(pal.deep, pal.sky, 0.25);
    g.save();
    g.fillStyle = rgba(col, 0.92); g.beginPath(); g.ellipse(ix, hz + 1, iw, ih + 0.01, 0, Math.PI, TAU); g.fill();
    g.globalAlpha = 0.25; g.beginPath(); g.ellipse(ix, hz + 1, iw, ih * 0.6 + 0.01, 0, 0, Math.PI); g.fill();
    g.globalAlpha = 1;
    if (k > 0.3) {
      const tk = smooth(invLerp(0.3, 1, k)), tx = ix + iw * 0.25, ty = hz + 1 - ih;
      g.strokeStyle = rgba(col, 0.95); g.lineWidth = 1.6; g.beginPath(); g.moveTo(tx, ty + 2); g.lineTo(tx, ty - 9 * S * tk); g.stroke();
      glow(g, tx, ty - 11 * S * tk, 12 * S, glowC, 0.5 * tk); orb(g, tx, ty - 11 * S * tk, 4 * S * tk + 0.1, mix(glowC, '#ffffff', 0.3));
    }
    g.restore();
  }
  function drawTwist(t) {
    if (twistAt < 0 || twistKind !== 0) return;
    const col = mix(warm, '#fff2c8', 0.5);
    for (let i = 0; i < 3; i++) {
      const t0 = twistAt + 0.4 + i * 0.7, k = clamp((t - t0) / 1.4);
      if (k <= 0) continue;
      const px = cx + (0.14 - 0.15 * i) * stage.w, py = wy + (bot - wy) * (0.32 + 0.2 * i);
      const y = lerp(py - 46 * S, py, ease.outCubic(k)) + (k >= 1 ? amb(px, t + i) * 0.8 : 0);
      if (k >= 1 && !twistLanded[i]) { twistLanded[i] = true; ring(px, py + 2, 6 * S, 0.5, 36); inject(px, 40 * S); E.sound('drip', { note: 6 + i, intensity: 0.22 }); }
      const a = smooth(k), br = 0.85 + 0.15 * Math.sin(t * 1.3 + i * 2);
      glow(g, px, y, 34 * S, col, 0.45 * a * br);
      glow(g, px, y, 12 * S, '#ffffff', 0.5 * a);
      orb(g, px, y, 5 * S, mix(col, '#ffffff', 0.45), { alpha: a });
      if (k >= 1) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        for (let s2 = 0; s2 < 3; s2++) { g.strokeStyle = rgba(col, 0.3 - s2 * 0.08); g.lineWidth = (2.2 - s2 * 0.5) * S; const yy = py + (9 + s2 * 6) * S, ww = (10 - s2 * 2.5) * S; g.beginPath(); g.moveTo(px - ww, yy); g.lineTo(px + ww, yy); g.stroke(); }
        g.restore();
      }
    }
  }
  function drawFinaleWater(t) {
    if (finAt < 0) return;
    const k = clamp((t - finAt) / 4.2);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    // a level line of light spreads along the water from beneath the raft
    const reach = stage.w * 0.55 * ease.outCubic(invLerp(0, 0.45, k)), a = smooth(invLerp(0, 0.25, k)) * (1 - 0.45 * smooth(invLerp(0.65, 1, k)));
    for (const [w, al] of [[10 * S, 0.1], [2 * S, 0.45]]) {
      g.strokeStyle = rgba(litGlow, al * a); g.lineWidth = w;
      g.beginPath(); g.moveTo(X0 - reach, wy + 1); g.lineTo(X0 + reach, wy + 1); g.stroke();
    }
    if (!heavy) {
      const rk = ease.outCubic(invLerp(0.05, 0.8, k));
      if (rk > 0 && rk < 1) { const rr2 = stage.w * 0.62 * rk + 4; g.strokeStyle = rgba(litGlow, 0.35 * (1 - rk)); g.lineWidth = 2; g.beginPath(); g.ellipse(X0, wy + 2, rr2, rr2 * 0.22, 0, 0, TAU); g.stroke(); }
    }
    g.restore();
  }
  function drawFinaleLights(t) {
    if (finAt < 0) return;
    // lantern motes lift slowly from the stones and the raft (gentle when heavy)
    g.save(); g.globalCompositeOperation = 'lighter';
    const NL = reduced ? 10 : 22;
    for (let i = 0; i < NL; i++) {
      const u = finSeed[i * 4], dl = finSeed[i * 4 + 1] * 1.4, sp = finSeed[i * 4 + 2], ph = finSeed[i * 4 + 3] * TAU;
      const lk = clamp((t - finAt - dl) / 3.2);
      if (lk <= 0 || lk >= 1) continue;
      const lx = (u - 0.5) * L * 0.95, x = lsx(lx, ySeat - hB * 0.5) + Math.sin(t * 1.1 + ph) * 6 * S;
      const y = lsy(lx, ySeat - hB * 0.5) - lk * (heavy ? 70 : 110) * S * (0.6 + sp * 0.6);
      const al = Math.sin(lk * Math.PI) * (heavy ? 0.6 : 0.75);
      if (!heavy && i % 4 === 0) glint(g, x, y, (5 + sp * 4) * S, '#fff6dc', al * 0.7, t + ph);
      else glow(g, x, y, (5 + sp * 5) * S, litGlow, al);
    }
    g.restore();
  }

  // ---------------------------------------------------------- input --
  function stoneScreen() { const ly = stoneLocalY(); return { x: lsx(sx, ly), y: lsy(sx, ly) }; }
  function toLocal(px, py) { const dx = px - X0, dy = py - Y0; return { x: dx * cs + dy * sn, y: -dx * sn + dy * cs }; }
  function onRaft(p) { const l = toLocal(p.x, p.y); return l.x > -hl - 18 && l.x < hl + 18 && l.y > ySeat - hA - 30 * S && l.y < logC0 + r0 + 10; }
  return {
    get progress() { return prog; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      const sp = stoneScreen(), dS = dist(p.x, p.y, sp.x, sp.y);
      const ax = lsx(xA, ySeat - hA / 2), ay = lsy(xA, ySeat - hA / 2), dA = dist(p.x, p.y, ax, ay);
      const rB = Math.max(48, wB * 0.8);
      if (drag == null && (dS < rB || (onRaft(p) && dS <= dA))) {
        drag = p.id; lastX = p.x; lastY = p.y; lastT = p.t; touched = true;
        skV += 16 * S; thv += (sx / hl) * 0.12;                         // pressing the stone dips its side
        ring(sp.x, surf(sp.x, E.now()) + 2, 6 * S, 0.35, 30);
        E.sound('click', { intensity: 0.3, pitch: 0.85 }); E.haptic('light');
        return;
      }
      if (onRaft(p) || dA < Math.max(44, wA * 0.75)) {
        // pressing the anchor stone: that end dips, the raft rocks, nothing else moves
        thv += (xA / hl) * 0.35; skV += 10 * S;
        ring(ax, surf(ax, E.now()) + 2, 8 * S, 0.4, 36);
        E.sound('thrum', { intensity: 0.22 }); E.haptic('soft');
        return;
      }
      for (const f of floats) {
        if (dist(p.x, p.y, f.x, f.y) < Math.max(40, f.size * 0.7)) {
          f.dipV += 60 * S; inject(f.x, 30 * S); ring(f.x, f.y + f.size * 0.25, f.size * 0.4, 0.45, 34);
          E.sound('bubble', { note: Math.floor(E.rand() * 8), intensity: 0.3, pan: pan(f.x) }); E.haptic('tick');
          return;
        }
      }
      // the water itself answers a touch
      if (p.y > hz) {
        ring(p.x, Math.max(p.y, hz + 4), 5 * S, 0.5, 40); inject(p.x, 26 * S);
        E.sound('drip', { note: clamp(Math.round(((p.x - stage.x) / stage.w) * 9), 0, 9), intensity: 0.25, pan: pan(p.x) }); E.haptic('tick');
      }
    },
    move(p) {
      if (p.id !== drag) return;
      const dx = p.x - lastX, dy = p.y - lastY, dtm = Math.max(1 / 240, p.t - lastT);
      lastX = p.x; lastY = p.y; lastT = p.t;
      const du = dx * cs + dy * sn;                                       // finger travel along the deck
      const speed = Math.abs(du) / dtm;
      rush = lerp(rush, invLerp(380 * S, 1300 * S, speed), 0.2);
      const k = lerp(1, 0.55, invLerp(700 * S, 1800 * S, speed));        // flicks slide less far
      const ds = (du * k) / track;
      wanted = clamp(wanted + ds, 0, 1);
      wanted = Math.min(wanted, prog + CAP);
      if (ds > 0 && E.locked && wanted >= prog + CAP * 0.9 && refuseCD <= 0) {
        refuseCD = 0.5; wob.kick(0.6); E.checkpoint('wait');
        E.sound('click', { intensity: 0.14, pitch: 0.6 });
      }
    },
    up(p) {
      if (p.id !== drag) return;
      drag = null;
      skV -= 9 * S;
      const sp = stoneScreen();
      ring(sp.x, surf(sp.x, E.now()) + 2, 6 * S, 0.3, 26);
      E.sound('drip', { note: 1, intensity: 0.18, pan: pan(sp.x) });
    },
    assist() {
      if (finAt >= 0) return;
      touched = true;
      assistTo = Math.min(1, Math.max(assistTo ?? 0, wanted, prog) + STEP);
      skV += 8 * S;
      E.sound('click', { intensity: 0.22, pitch: 0.9 });
    },
    pointAt(p) {
      const lx = xB0 + track * clamp(p), ly = ySeat + 2;
      return { x: lsx(lx, ly), y: lsy(lx, ly) };
    },
    hint() {
      if (finAt >= 0 || prog >= 0.999) return null;
      const a = prog, b = Math.min(1, prog + 0.3), ly = ySeat - hB * 0.3, pts = [];
      for (let i = 0; i <= 14; i++) { const lx = xB0 + track * lerp(a, b, i / 14); pts.push([lsx(lx, ly), lsy(lx, ly)]); }
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      // a soft swell rolls in from the horizon (no flash)
      inject(mx, 24 * S);
      E.particles.burst(mx, hz - 4 * S, reduced ? 4 : 10, { speed: 30, colour: moonCol, life: 1.4, size: 5, kind: 'glint' });
    },
    finish() {
      finAt = E.now();
      for (let k = 0; k < floats.length; k++) if (!floats[k].lighting) lightFloat(floats[k], k);
      if (!anchorLighting) { anchorLighting = true; if (anchorPh >= 0) E.checkpoint('photo', anchorPh); }
      if (!heroLighting) { heroLighting = true; if (hero >= 0) E.checkpoint('photo', hero); }
      // the floating pebbles gather calmly in front of the raft
      const fr = floats.filter((f) => f.front), nb = fr.length;
      for (const f of floats) { f.sx = f.x; f.sy = f.y; f.tx = f.x; f.ty = f.y; }
      fr.forEach((f, i) => {
        const u = nb === 1 ? 0 : (i / (nb - 1)) * 2 - 1;
        f.tx = clamp(cx + u * stage.w * 0.3, stage.x + f.size * 0.6, stage.x + stage.w - f.size * 0.6);
        f.ty = Math.min(bot - f.size * 0.45, wy + (bot - wy) * (0.48 - Math.abs(u) * 0.06) + r0);
      });
      E.sound(heavy ? 'breathe-out' : 'shimmer', { intensity: 0.35 });
    },
    destroy() {},
  };
}
