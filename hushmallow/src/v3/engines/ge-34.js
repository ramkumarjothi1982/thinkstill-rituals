// GE-34 · WORRY ENVELOPE — soft paper envelope (drag and seal trace).
// The person's words are written on an index card that hovers, trembling a
// little, above an open vellum envelope with a patterned lining. Drag the
// card down into the pocket: it slides between the lined back and the
// translucent front, which softly hugs it. Then trace the dotted seal along
// the flap from corner to corner: the flap folds down behind your fingertip
// like paper being smoothed shut, and a stitched seam of light tacks it —
// tacked, never locked. A silk pull-tab tied to the card stays outside the
// flap the whole time. Win: the envelope rests closed and its retrieval tab
// is still out, within reach.
//
// Photos fan out behind the card like a hand of keepsake cards. As the card
// goes in they follow one by one, gather into a neat stack and slip into the
// envelope behind it, each softening into a cool mist as it tucks in; the
// flap then seals them away (retrievable by the same tab).

import { TAU, clamp, lerp, smooth, ease, rgba, mix, glow, glint, orb, motes, halo, canvas as makeCanvas, Spring, Spring2, Rope } from '../fx.js';
import { CurveTrace, Wobble } from '../kit.js';

export const meta = {
  id: 'GE-34',
  howTo: 'Slide your words into the envelope, then trace its soft seal.',
  steps: [
    'Drag the card with your words down into the open envelope.',
    'Trace the dotted seal along the flap, from one corner to the other.',
    'The flap folds shut behind your finger — tacked, not locked — and the pull-tab stays out.',
  ],
  tapAlt: 'each press slides the card a little deeper, or smooths a little more of the flap shut',
  words: 'Your words are written on the index card; once it is tucked in, they still show softly through the vellum.',
  photos: {
    where: 'Your photos fan out behind the card like a hand of keepsake cards.',
    becomes: 'soft photo cards',
    touch: 'As you slide the card in, they follow it one by one;',
    change: 'each softens into a cool, misty light as it tucks into the envelope, and the flap seals them away.',
    payoff: 'They rest there safely — sealed, never locked — with the pull-tab keeping them within reach.',
  },
  finaleSec: 4,
};

const S1 = 0.42;           // share of progress for sliding the card in (the rest is the seal)
const BANK = 0.05;         // input that may run ahead of the world law
const ZIP = 0.34;          // width of the soft fold front that follows the trace
const NF = 37;             // flap edge samples
const NP = 64;             // card path samples
const ASSIST_RATE = 0.34;  // progress per second while a press animates
const TINTS = ['#fbf3e4', '#fbece8', '#eef6ef', '#f1eefb', '#f8f1df', '#ecf3fa'];

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = !!E.reduced, low = !!(E.reduced || E.lowStim), heavy = !!E.heavy;
  const R1 = E.round === 1;
  const rnd = E.rand;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);

  // loop rounds: new paper, lining, flap curve, card tilt, seal direction, ribbon side and hero photo
  const dir = R1 ? 1 : (E.round % 2 === 0 ? -1 : 1);
  const tilt = R1 ? -1 : (rnd() < 0.5 ? -1 : 1);
  const startDX = R1 ? -0.035 : (0.015 + rnd() * 0.05) * tilt;
  const rot0 = R1 ? -0.075 : (0.04 + rnd() * 0.06) * tilt;
  const tint = R1 ? TINTS[0] : TINTS[1 + Math.floor(rnd() * (TINTS.length - 1))];
  const liningKind = R1 ? 0 : 1 + Math.floor(rnd() * 3);
  const flapRound = R1 ? 0.16 : 0.07 + rnd() * 0.22;
  const ribbonSide = R1 ? 1 : (rnd() < 0.5 ? -1 : 1);
  const twistKind = (E.round - 1) % 3;
  const calm0 = E.calm;
  const agit = (heavy ? 0.65 : 1) * (1 - calm0 * 0.85);
  const n = photos.n;
  const hero = n ? (E.round - 1) % n : -1;
  const TWN = 9, twk = new Float32Array(TWN * 3);   // lining twinkles (u, v, phase)
  for (let i = 0; i < TWN; i++) { twk[i * 3] = rnd(); twk[i * 3 + 1] = rnd(); twk[i * 3 + 2] = rnd() * TAU; }

  // palette — reads on the dark realms and on the bright ones
  const paper = mix(tint, pal.glow, 0.06);
  const paperHi = mix(paper, '#ffffff', 0.6);
  const paperLo = mix(paper, '#8a7896', 0.24);
  const edgeCol = mix(paper, '#4a3a5a', 0.45);
  const shade = mix(pal.deep, '#140a26', 0.6);
  const liningA = mix(mix(pal.deep, pal.accent, 0.3), '#1a1030', 0.32);
  const liningB = mix(pal.deep, '#0a0618', 0.5);
  const liningDot = mix(pal.glow, '#ffe9b8', 0.4);
  const ink = mix('#2a2150', pal.ink, 0.3);
  const band = mix(pal.accent, '#ffffff', 0.6);
  const ribbonCol = mix(pal.accent, pal.warm, 0.22);
  const stitchCol = mix(pal.accent, '#4a2f6a', 0.32);
  const glowCol = mix(pal.glow, '#ffffff', 0.25);
  const worryCol = mix(pal.accent, pal.warm, 0.45);

  // ---- state (declared before the first fit)
  let wanted = 0, prog = 0, insReal = 0, sealReal = 0, insShown = 0, sealShown = 0;
  let assistTo = null;
  let drag = null;               // { id, mode: 'card' | 'seal', dx, dy, fx, fy }
  let seated = false, sealedAt = -1, doneFlag = false, finAt = -1, twistAt = -1;
  let stepIns = 0, stepSeal = 0, lastHap = -9, lastWait = -9, lastRustle = -9, lastTouch = -9, finLift = 0;
  let elastX = 0, elastY = 0, nudge = 0;
  const tmp = { x: 0, y: 0, r: 0 };
  const wob = new Wobble(), flapWob = new Wobble();
  const card = new Spring2(0, 0, { stiffness: 260, damping: 26 });
  const cardRot = new Spring(0, { stiffness: 150, damping: 15 });
  const lift = new Spring(0, { stiffness: 220, damping: 18 });
  const hug = new Spring(0, { stiffness: 240, damping: 11 });
  const emblem = new Spring(0, { stiffness: 150, damping: 11 });
  const star = { x: new Spring(0, { stiffness: 30, damping: 9 }), y: new Spring(0, { stiffness: 30, damping: 9 }), r: 0, tx: 0, ty: 0 };
  const lights = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];

  // ---- geometry
  let W = 0, H = 0, eL = 0, eR = 0, eTop = 0, eB = 0, ecx = 0, flapH = 0, mouthMid = 0, mouthSide = 0, rcE = 6;
  let cW = 0, cH = 0, x0 = 0, y0 = 0, yS = 0, pS = 0, tol = 40, pad = 30, wordSize = 14, rw = 6, cpad = 3;
  const pathX = new Float32Array(NP), pathY = new Float32Array(NP);
  const fX = new Float32Array(NF), fD = new Float32Array(NF), fS = new Float32Array(NF);
  const qx = new Float32Array(NF), qy = new Float32Array(NF), qf = new Float32Array(NF);
  let backSpr = null, pocketSpr = null, cardSpr = null, shadowSpr = null;
  let liningPat = null, fibrePat = null, outerGrad = null, liningGrad = null, pocketPath = null, insidePath = null;
  let tr = null, rope = null;
  const ph = [];                 // photo cards
  let sealedCount = 0;

  const depthAt = (u) => { const r = flapRound, a = Math.hypot(1, r), b = Math.hypot(clamp(u), r); return flapH * Math.max(0, (a - b) / (a - r)); };
  const mouthAt = (u) => lerp(mouthMid, mouthSide, Math.pow(clamp(u), 0.8));
  function cardAt(k, out) {
    const kx = smooth(clamp(k / 0.55));
    out.x = lerp(x0, ecx, kx); out.y = lerp(y0, yS, k); out.r = rot0 * (1 - smooth(clamp(k / 0.5)));
    return out;
  }

  // ------------------------------------------------------------- photos --
  if (n) {
    const others = [];
    for (let i = 0; i < n; i++) if (i !== hero) others.push(i);
    others.splice(Math.floor(n / 2), 0, hero);
    others.forEach((i, j) => ph.push({ i, j, hero: i === hero, spr: new Spring2(0, 0, { stiffness: 85, damping: 13 }), rs: new Spring(0, { stiffness: 90, damping: 11 }),
      sealed: false, cool: 0, lag: 0, fx: 0, fy: 0, fr: 0, sx: 0, sy: 0, sr: 0, size: 0, w: 0, h: 0, pk: 0 }));
    // they follow the card in one by one; the hero photo goes last
    const rest = ph.filter((o) => !o.hero).sort((a, b) => (a.j - b.j) * dir);
    rest.forEach((o, k) => { o.lag = 0.04 + (rest.length > 1 ? (k / (rest.length - 1)) * 0.26 : 0.1); });
    for (const o of ph) if (o.hero) o.lag = n > 1 ? 0.36 : 0.14;
  }
  function layoutPhotos() {
    if (!n) return;
    const spanX = Math.min(stage.w * 0.92, W * 1.32) - pS;
    const dx = n > 1 ? Math.min(pS * 0.74, spanX / (n - 1)) : 0;
    const sp = n > 1 ? Math.min(W * 0.15, (W - pS * 1.1 - 14) / (n - 1)) : 0;
    for (const o of ph) {
      o.size = pS * (o.hero && n > 1 ? 1.1 : 1);
      const { w, h } = photos.size(o.i, 'card', o.size);
      o.w = w; o.h = h;
      const xj = n > 1 ? (o.j - (n - 1) / 2) * dx : W * 0.1 * tilt;
      const u = xj / (W * 0.66);
      o.fx = xj; o.fy = -cH / 2 - h * 0.36 + u * u * h * 0.3 - (o.hero && n > 1 ? h * 0.06 : 0);
      o.fr = u * 0.17 + (n === 1 ? 0.08 * tilt : 0);
      o.sx = n > 1 ? (o.j - (n - 1) / 2) * sp : -W * 0.08 * tilt;
      o.sx = clamp(o.sx, -(W / 2 - w / 2 - 6), W / 2 - w / 2 - 6);
      o.sy = eTop + H * 0.035 + h / 2 + ((o.j * 7) % 3) * H * 0.012 - yS;
      o.sr = ((o.j % 2) - 0.5) * 0.05;
    }
  }
  function photoTarget(o, t) {
    const pk = clamp((insShown - o.lag) / (1 - o.lag));
    o.pk = pk;
    cardAt(pk, tmp);
    const c = smooth(clamp(pk / 0.62));
    const lx = lerp(o.fx, o.sx, c), ly = lerp(o.fy, o.sy, c);
    const cs = Math.cos(tmp.r * (1 - c)), sn = Math.sin(tmp.r * (1 - c));
    const sway = (1 - c) * (reduced ? 0.25 : 1);
    tmp.x = tmp.x + lx * cs - ly * sn + Math.sin(t * 0.7 + o.j * 1.3) * 2.6 * sway;
    tmp.y = tmp.y + lx * sn + ly * cs + Math.sin(t * 0.9 + o.j * 2.1) * 2.2 * sway;
    tmp.r = lerp(o.fr, o.sr, c) + tmp.r * (1 - c) + Math.sin(t * 0.6 + o.j * 0.8) * 0.03 * sway * agit;
    return tmp;
  }

  // -------------------------------------------------------------- fit --
  function fit() {
    const s = stage.s;
    const up = n ? 1.56 : 1.26, down = 1.14;
    W = Math.min(stage.w * 0.8, 330 * s);
    H = W / 1.58;
    const maxH = (stage.h * 0.95) / (up + down);
    if (H > maxH) { H = maxH; W = H * 1.58; }
    ecx = stage.cx; eTop = stage.cy + ((up - down) * H) / 2;
    eL = ecx - W / 2; eR = ecx + W / 2; eB = eTop + H;
    flapH = H * 0.47; mouthMid = H * 0.37; mouthSide = H * 0.1; rcE = H * 0.05;
    cW = W * 0.84; cH = Math.min(cW / 1.72, H * 0.78);
    yS = eTop + H * 0.15 + cH / 2;
    x0 = ecx + startDX * W; y0 = eTop - H * 0.12 - cH / 2;
    pS = Math.min(W * 0.42, H * 0.64) * (n >= 5 ? 0.86 : 1);
    tol = 40 * s + 10; pad = Math.ceil(42 * s);
    wordSize = Math.max(13, Math.min(18, cW * 0.072));
    rw = Math.max(4.5, 6 * s);
    for (let i = 0; i < NP; i++) { cardAt(i / (NP - 1), tmp); pathX[i] = tmp.x; pathY[i] = tmp.y; }
    for (let k = 0; k < NF; k++) { const fr = k / (NF - 1); fX[k] = eL + W * fr; fD[k] = depthAt(Math.abs(fX[k] - ecx) / (W / 2)); fS[k] = dir > 0 ? fr : 1 - fr; qx[k] = fX[k]; qy[k] = eTop - fD[k]; }
    const pts = [];
    for (let i = 0; i <= 64; i++) { const x = lerp(eL + W * 0.075, eR - W * 0.075, i / 64); pts.push([x, eTop + depthAt(Math.abs(x - ecx) / (W / 2)) - H * 0.05]); }
    if (dir < 0) pts.reverse();
    tr = new CurveTrace(pts, { tol, ahead: 30 });
    setTrace(sealReal);
    layoutPhotos();
    buildSprites();
    cardAt(insShown, tmp); card.set(tmp.x, tmp.y); cardRot.set(tmp.r);
    for (const o of ph) { photoTarget(o, 0); o.spr.set(tmp.x, tmp.y); o.rs.set(tmp.r); }
    const a = anchorWorld();
    rope = new Rope(11, a.x, a.y, a.x + ribbonSide * H * 0.08, a.y - H * 0.34, { gravity: -70, iterations: 5 });
    rope.pinB = false;
  }

  // ---------------------------------------------------------- sprites --
  function tile(size, paint) { const c = makeCanvas(Math.ceil(size * dpr), Math.ceil(size * dpr)); const t = c.getContext('2d'); t.scale(dpr, dpr); paint(t, size); return c; }
  function pat(ctx, c) { const p = ctx.createPattern(c, 'repeat'); try { p.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0])); } catch { /* older engines: slightly larger pattern */ } return p; }
  function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function tracePocket(c) {
    c.moveTo(eL, eTop + mouthSide);
    for (let i = 1; i <= 24; i++) { const x = lerp(eL, eR, i / 24); c.lineTo(x, eTop + mouthAt(Math.abs(x - ecx) / (W / 2))); }
    c.lineTo(eR, eB - rcE); c.arcTo(eR, eB, eR - rcE, eB, rcE); c.lineTo(eL + rcE, eB); c.arcTo(eL, eB, eL, eB - rcE, rcE); c.closePath();
  }
  function traceMouth(c) { c.moveTo(eL + 1, eTop + mouthSide); for (let i = 1; i <= 24; i++) { const x = lerp(eL, eR, i / 24); c.lineTo(x, eTop + mouthAt(Math.abs(x - ecx) / (W / 2))); } }
  function traceBottomFlap(c) {
    const ay = eTop + H * 0.76;
    c.moveTo(eL + 1, eB - rcE * 0.6);
    c.bezierCurveTo(eL + W * 0.22, eB - H * 0.08, ecx - W * 0.2, ay, ecx, ay);
    c.bezierCurveTo(ecx + W * 0.2, ay, eR - W * 0.22, eB - H * 0.08, eR - 1, eB - rcE * 0.6);
  }
  function buildSprites() {
    const s = stage.s;
    // tiles
    const liningTile = tile(22, (t, z) => {
      t.fillStyle = rgba(liningDot, 0.75); t.strokeStyle = rgba(liningDot, 0.55); t.lineWidth = 1;
      if (liningKind === 0) { for (const [x, y] of [[z * 0.25, z * 0.25], [z * 0.75, z * 0.75]]) { t.beginPath(); t.arc(x, y, 1.15, 0, TAU); t.fill(); } }
      else if (liningKind === 1) { for (const [x, y, r] of [[z * 0.3, z * 0.3, 3.2], [z * 0.8, z * 0.78, 2]]) { t.beginPath(); t.moveTo(x, y - r); t.quadraticCurveTo(x, y, x + r, y); t.quadraticCurveTo(x, y, x, y + r); t.quadraticCurveTo(x, y, x - r, y); t.quadraticCurveTo(x, y, x, y - r); t.fill(); } }
      else if (liningKind === 2) { t.beginPath(); for (let x = 0; x <= z; x += 1) t.lineTo(x, z * 0.5 + Math.sin((x / z) * TAU) * z * 0.16); t.stroke(); }
      else { t.save(); t.translate(z * 0.5, z * 0.5); for (let k = 0; k < 4; k++) { t.rotate(TAU / 4); t.beginPath(); t.ellipse(0, -z * 0.17, z * 0.06, z * 0.13, 0, 0, TAU); t.fill(); } t.restore(); }
    });
    const fibreTile = tile(64, (t, z) => {
      let sd = 34127;
      const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let i = 0; i < 260; i++) { t.fillStyle = r() < 0.5 ? 'rgba(90,70,110,0.5)' : 'rgba(255,255,255,0.7)'; t.fillRect(r() * z, r() * z, 0.8, 0.8); }
      t.lineWidth = 0.5; for (let i = 0; i < 22; i++) { const x = r() * z, y = r() * z, a = r() * TAU, L = 3 + r() * 7; t.strokeStyle = 'rgba(110,90,130,0.35)'; t.beginPath(); t.moveTo(x, y); t.quadraticCurveTo(x + Math.cos(a + 0.6) * L * 0.6, y + Math.sin(a + 0.6) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L); t.stroke(); }
    });
    liningPat = pat(g, liningTile); fibrePat = pat(g, fibreTile);
    // envelope back: soft shadow, paper rim, patterned lining (we look into the open envelope)
    const SW = Math.ceil((W + pad * 2) * dpr), SH = Math.ceil((H + pad * 2) * dpr);
    backSpr = makeCanvas(SW, SH);
    let b = backSpr.getContext('2d'); b.scale(dpr, dpr); b.translate(pad - eL, pad - eTop);
    b.save(); b.shadowColor = rgba(shade, 0.42); b.shadowBlur = 24 * s; b.shadowOffsetY = 10 * s;
    rr(b, eL, eTop, W, H, rcE); b.fillStyle = paper; b.fill(); b.restore();
    const ins = Math.max(2.5, W * 0.013);
    rr(b, eL + ins, eTop + ins, W - ins * 2, H - ins * 2, rcE * 0.7);
    const lg = b.createLinearGradient(0, eTop, 0, eB); lg.addColorStop(0, liningA); lg.addColorStop(1, liningB);
    b.fillStyle = lg; b.fill();
    b.save(); b.clip(); b.globalAlpha = 0.6; b.fillStyle = pat(b, liningTile); b.fillRect(eL, eTop, W, H); b.globalAlpha = 1;
    const dg = b.createLinearGradient(0, eTop, 0, eTop + H * 0.6); dg.addColorStop(0, 'rgba(255,255,255,0.08)'); dg.addColorStop(0.35, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,0,10,0.35)');
    b.fillStyle = dg; b.fillRect(eL, eTop, W, H);
    b.restore();
    b.strokeStyle = rgba(paperHi, 0.9); b.lineWidth = 1.2; b.beginPath(); b.moveTo(eL + rcE, eTop + 0.6); b.lineTo(eR - rcE, eTop + 0.6); b.stroke();
    // vellum pocket (front layers)
    pocketSpr = makeCanvas(SW, SH);
    b = pocketSpr.getContext('2d'); b.scale(dpr, dpr); b.translate(pad - eL, pad - eTop);
    b.beginPath(); tracePocket(b);
    const pg = b.createLinearGradient(0, eTop, 0, eB);
    pg.addColorStop(0, rgba(paperHi, 0.8)); pg.addColorStop(0.45, rgba(paper, 0.78)); pg.addColorStop(1, rgba(paperLo, 0.86));
    b.fillStyle = pg; b.fill();
    b.save(); b.clip();
    // the bottom flap overlaps the side flaps: a second, more opaque vellum layer
    b.beginPath(); traceBottomFlap(b); b.lineTo(eR, eB + 4); b.lineTo(eL, eB + 4); b.closePath();
    b.fillStyle = rgba(paper, 0.4); b.fill();
    b.save(); b.shadowColor = rgba(shade, 0.25); b.shadowBlur = 5 * s; b.shadowOffsetY = -1.5;
    b.beginPath(); traceBottomFlap(b); b.strokeStyle = rgba(paperHi, 0.95); b.lineWidth = 1.3; b.stroke(); b.restore();
    // side creases
    b.strokeStyle = rgba(edgeCol, 0.12); b.lineWidth = 1;
    b.beginPath(); b.moveTo(eL + W * 0.02, eTop + mouthSide + 2); b.quadraticCurveTo(eL + W * 0.2, eTop + H * 0.6, ecx - W * 0.18, eTop + H * 0.74); b.stroke();
    b.beginPath(); b.moveTo(eR - W * 0.02, eTop + mouthSide + 2); b.quadraticCurveTo(eR - W * 0.2, eTop + H * 0.6, ecx + W * 0.18, eTop + H * 0.74); b.stroke();
    // a soft sheen across the vellum
    const sh = b.createLinearGradient(eL, eTop, eR, eB); sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(0.75, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    b.fillStyle = sh; b.fillRect(eL, eTop, W, H);
    b.globalAlpha = 0.07; b.fillStyle = pat(b, fibreTile); b.fillRect(eL, eTop, W, H); b.globalAlpha = 1;
    b.restore();
    // the pocket's lip catches the light
    b.save(); b.shadowColor = rgba(shade, 0.3); b.shadowBlur = 4 * s; b.shadowOffsetY = 1.5;
    b.beginPath(); traceMouth(b); b.strokeStyle = rgba(paperHi, 1); b.lineWidth = 1.6; b.stroke(); b.restore();
    b.beginPath(); tracePocket(b); b.strokeStyle = rgba(edgeCol, 0.35); b.lineWidth = 1; b.stroke();
    // index card
    cpad = 3;
    cardSpr = makeCanvas(Math.ceil((cW + cpad * 2) * dpr), Math.ceil((cH + cpad * 2) * dpr));
    b = cardSpr.getContext('2d'); b.scale(dpr, dpr); b.translate(cpad, cpad);
    rr(b, 0, 0, cW, cH, cH * 0.06);
    const cg = b.createLinearGradient(0, 0, cW, cH); cg.addColorStop(0, '#fffefa'); cg.addColorStop(0.6, '#fbf6ec'); cg.addColorStop(1, '#efe5d2');
    b.fillStyle = cg; b.fill();
    b.save(); b.clip();
    b.fillStyle = rgba(band, 0.9); b.fillRect(0, 0, cW, cH * 0.17);
    b.fillStyle = 'rgba(255,255,255,0.35)'; b.fillRect(0, 0, cW, cH * 0.05);
    b.strokeStyle = rgba(mix(pal.accent, '#e0607a', 0.5), 0.55); b.lineWidth = 1; b.beginPath(); b.moveTo(0, cH * 0.17 + 0.5); b.lineTo(cW, cH * 0.17 + 0.5); b.stroke();
    b.strokeStyle = 'rgba(110,150,215,0.28)';
    for (let y = cH * 0.32; y < cH - 4; y += cH * 0.125) { b.beginPath(); b.moveTo(cW * 0.05, y); b.lineTo(cW * 0.95, y); b.stroke(); }
    const curl = b.createRadialGradient(cW, cH, 0, cW, cH, cW * 0.5); curl.addColorStop(0, 'rgba(90,60,40,0.14)'); curl.addColorStop(1, 'rgba(90,60,40,0)');
    b.fillStyle = curl; b.fillRect(0, 0, cW, cH);
    b.globalAlpha = 0.06; b.fillStyle = pat(b, fibreTile); b.fillRect(0, 0, cW, cH); b.globalAlpha = 1;
    b.restore();
    b.strokeStyle = 'rgba(70,50,60,0.16)'; b.lineWidth = 1; rr(b, 0.5, 0.5, cW - 1, cH - 1, cH * 0.06); b.stroke();
    // the eyelet the pull-tab is tied to
    const ax = cW / 2 + ribbonSide * cW * 0.3, ay = cH * 0.085;
    b.fillStyle = rgba(mix(pal.accent, '#ffffff', 0.2), 0.9); b.beginPath(); b.arc(ax, ay, 3.6, 0, TAU); b.fill();
    b.fillStyle = '#fffaf2'; b.beginPath(); b.arc(ax, ay, 1.6, 0, TAU); b.fill();
    // soft shadow sprite
    if (!shadowSpr) {
      shadowSpr = makeCanvas(64, 64);
      const sg = shadowSpr.getContext('2d'), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, rgba(shade, 0.55)); gr.addColorStop(0.55, rgba(shade, 0.25)); gr.addColorStop(1, rgba(shade, 0));
      sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
    }
    // cached gradients for the moving flap
    outerGrad = g.createLinearGradient(0, eTop, 0, eTop + flapH);
    outerGrad.addColorStop(0, rgba(paperHi, 0.96)); outerGrad.addColorStop(0.55, rgba(paper, 0.95)); outerGrad.addColorStop(1, rgba(mix(paper, paperLo, 0.6), 0.95));
    liningGrad = g.createLinearGradient(0, eTop - flapH, 0, eTop);
    liningGrad.addColorStop(0, liningA); liningGrad.addColorStop(1, liningB);
    pocketPath = new Path2D(); tracePocket(pocketPath);
    insidePath = new Path2D(); insidePath.rect(stage.x - stage.w, eTop - stage.h * 3, stage.w * 3, stage.h * 3); insidePath.rect(eL + 1.5, eTop - 0.5, W - 3, H - 1.5);
  }

  fit();
  E.onResize(fit);

  // ------------------------------------------------------------- trace --
  function traceIndex(frac) {
    const target = clamp(frac) * tr.L; let lo = 0, hi = tr.last;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tr.cum[m] <= target) lo = m + 1; else hi = m; }
    return Math.max(0, Math.min(tr.last, lo - 1));
  }
  function setTrace(frac) { tr.i = frac >= 0.999 ? tr.last : traceIndex(frac); }

  function anchorWorld() {
    const lx = ribbonSide * cW * 0.3, ly = -cH / 2 + cH * 0.085, c = Math.cos(cardRot.x), s = Math.sin(cardRot.x), sc = 1 + 0.035 * lift.x;
    return { x: card.x + (lx * c - ly * s) * sc, y: card.y + (lx * s + ly * c) * sc };
  }

  // ----------------------------------------------------------- frame --
  function frame(dt, t) {
    // ---- simulation (progress only moves from input or presses, always through the law)
    if (assistTo != null) {
      if (E.locked) assistTo = null;
      else { wanted = Math.min(assistTo, wanted + dt * ASSIST_RATE); if (wanted >= assistTo - 1e-4) assistTo = null; }
    }
    if (insReal < 0.999) wanted = Math.min(wanted, S1);
    prog = E.gate(wanted);
    if (wanted > prog + BANK) wanted = prog + BANK;
    insReal = clamp(prog / S1); sealReal = clamp((prog - S1) / (1 - S1));
    const sealWant = clamp((wanted - S1) / (1 - S1));
    if (tr.progress < sealReal - 0.01) setTrace(sealReal);
    else if (tr.progress > sealWant + 0.01) setTrace(sealWant);
    insShown += (insReal - insShown) * (1 - Math.exp(-dt * 10));
    sealShown += (sealReal - sealShown) * (1 - Math.exp(-dt * 9));
    
    // micro-melody as the card goes in and as the seal is traced
    const si = Math.floor(insReal * 6 + 1e-6);
    if (si > stepIns) { stepIns = si; if (si < 6) E.sound('bubble', { note: si + 1, intensity: 0.28, pitch: heavy ? 0.9 : 1 }); tick(); }
    const ss = Math.floor(sealReal * 9 + 1e-6);
    if (ss > stepSeal) { stepSeal = ss; if (ss < 9) E.sound('pluck', { note: Math.min(9, ss + 1), intensity: 0.3, pitch: heavy ? 0.9 : 1 }); tick(); }
    if (!seated && insReal >= 0.999) {
      seated = true; hug.v -= 6;
      E.sound('drop-in', { intensity: 0.45 }); E.haptic('pop'); E.checkpoint('step');
      E.ripples.add(ecx, eTop + mouthMid, { colour: glowCol, speed: 60, alpha: 0.4, r: 8 });
      E.hint(dir > 0 ? 'Now trace the dotted seal from the left corner.' : 'Now trace the dotted seal from the right corner.');
    }
    if (sealedAt < 0 && sealReal >= 0.999) {
      sealedAt = t; emblem.target = 1;
      E.sound('settle', { intensity: 0.45 }); E.sound('chime', { intensity: 0.3 }); E.checkpoint('step');
      const ex = ecx, ey = eTop + depthAt(0) - H * 0.08;
      E.ripples.add(ex, ey, { colour: glowCol, speed: 55, alpha: 0.45, r: 6 });
    }
    if (!doneFlag && sealedAt >= 0 && !(drag && drag.mode === 'seal') && assistTo == null && sealShown > 0.992 && t - sealedAt > 0.3) doneFlag = true;

    // card: follows the gated path, plus a rubber-band pull towards the finger
    cardAt(insShown, tmp);
    let tx = tmp.x, ty = tmp.y;
    if (drag && drag.mode === 'card') {
      const ox = drag.fx - tx, oy = drag.fy - ty, d = Math.hypot(ox, oy), k = 0.55 / (1 + d / 70);
      elastX = ox * k; elastY = oy * k;
    } else { elastX *= Math.exp(-dt * 7); elastY *= Math.exp(-dt * 7); }
    let ex2 = elastX, ey2 = elastY;
    if (insShown > 0.42) { const m = (W - cW) / 2 - 3; ex2 = clamp(ex2, -m, m); ey2 = clamp(ey2, -22, Math.max(0, eB - 3 - (yS + cH / 2))); }
    const free = 1 - smooth(clamp(insShown * 1.8));
    const bob = free * Math.sin(t * 1.15) * 3.2 * (reduced ? 0.35 : 1);
    nudge *= Math.exp(-dt * 3);
    card.to(tx + ex2, ty + ey2 + bob); card.update(dt);
    const fl = reduced ? 0 : heavy ? 0.03 * Math.sin(t * 1.2) : 0.016 * Math.sin(t * 9.5) + 0.009 * Math.sin(t * 15.7 + 1);
    cardRot.target = tmp.r + fl * agit * free * (drag ? 0.4 : 1) + wob.update(dt) * 0.05 + ex2 * 0.0016 + nudge;
    cardRot.update(dt);
    lift.target = drag && drag.mode === 'card' ? 1 : 0; lift.update(dt);
    hug.update(dt); emblem.update(dt); flapWob.update(dt);
    for (const o of ph) {
      photoTarget(o, t); o.spr.to(tmp.x, tmp.y); o.rs.target = tmp.r; o.spr.update(dt); o.rs.update(dt);
      if (!o.sealed && o.pk > 0.8) {
        o.sealed = true; sealedCount++;
        photos.dust(o.i, o.spr.x, o.spr.y, o.size * 0.8, low ? 5 : 11, { shape: 'card', up: 22, speed: 16, sizePx: 4 });
        E.sound('glass', { note: 2 + (sealedCount % 6), intensity: 0.32 }); E.checkpoint('photo', o.i);
      }
      if (o.sealed) o.cool = Math.min(1, o.cool + dt / 1.1);
    }

    computeFlap(t);
    // the pull-tab ribbon: tied to the card, then held under the flap edge once it folds over
    const a = anchorWorld();
    let rx = a.x, ry = a.y;
    const kr = Math.round(clamp((a.x - eL) / W) * (NF - 1)), fr = qf[kr];
    if (fr > 0.5) { const m = smooth((fr - 0.5) * 2); rx = lerp(a.x, qx[kr], m); ry = lerp(a.y, qy[kr] - 2, m); }
    if (dt > 0) {
      const wind = (reduced ? 10 : 26) * (1 - calm0 * 0.5);
      for (let i = 1; i < rope.n; i++) rope.x[i] += (Math.sin(t * 0.8 + i * 0.45) * wind + ribbonSide * 10) * dt * dt * (i / rope.n);
      rope.update(dt, rx, ry, null, null);
    }

    // finale motion
    if (finAt >= 0) {
      const k = t - finAt;
      finLift = heavy ? -H * 0.025 * smooth(clamp(k / 2.2)) : H * (0.06 * ease.outBack(clamp(k / 0.9)) - 0.025 * smooth(clamp((k - 1.1) / 1.6)));
      if (heavy && !low && E.rand() < dt * 3) E.particles.emit({ x: ecx + (E.rand() - 0.5) * W * 0.8, y: eTop + H * (0.2 + E.rand() * 0.6) - finLift, vy: -14, vx: (E.rand() - 0.5) * 6, life: 2.4, size: 5, colour: glowCol, alpha: 0.5, drag: 0.99 });
    }

    // ---- drawing
    const calmK = Math.max(calm0, smooth(prog));
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.2)) : 0;
    drawAmbient(t, calmK, fin);
    if (twistAt >= 0 && twistKind === 2) drawMoon(t);
    g.save(); g.translate(0, -finLift);
    drawEnvelopeBack(t, calmK);
    drawFlapBack();
    drawPhotos(t);
    drawCard(t, calmK);
    drawPocket(t, fin);
    drawFlapFront();
    drawSeal(t, fin);
    drawRibbon(t, fin);
    drawEmblem(t, fin);
    if (fin > 0) drawFinaleGlints(t, fin);
    g.restore();
    if (twistAt >= 0 && twistKind === 0) drawStar(dt, t);
    if (twistAt >= 0 && twistKind === 1) drawLights(t);
  }
  function tick() { const t = E.now(); if (t - lastHap > 0.09) { lastHap = t; E.haptic('tick'); } }

  // the flap: each edge sample folds on its own, so it closes behind the finger like paper smoothed shut
  function computeFlap(t) {
    const zipOn = smooth(clamp(sealShown / 0.05));
    const head = sealShown * (1 + ZIP * 0.5) - 0.02;
    const lean = 0.12 * smooth(clamp(sealShown * 2.5));
    const breathe = reduced ? 0 : (1 - zipOn) * (0.05 + 0.035 * Math.sin(t * 0.8)) * (0.6 + 0.4 * agit);
    const w = flapWob.v * 0.05;
    for (let k = 0; k < NF; k++) {
      let f = Math.max(smooth(clamp(1 - (fS[k] - head) / ZIP)) * zipOn, lean);
      if (finAt < 0 && sealedAt < 0) f = clamp(f + w * (1 - f));
      qf[k] = f;
      const th = Math.PI * f + breathe * (1 - f), c = Math.cos(th), sn = Math.sin(th);
      qx[k] = ecx + (fX[k] - ecx) * (1 + 0.035 * sn);
      qy[k] = eTop - fD[k] * c;
    }
  }
  function flapPath() { g.beginPath(); g.moveTo(eL, eTop); for (let k = 0; k < NF; k++) g.lineTo(qx[k], qy[k]); g.lineTo(eR, eTop); g.closePath(); }
  function flapEdge() { g.beginPath(); g.moveTo(qx[0], qy[0]); for (let k = 1; k < NF; k++) g.lineTo(qx[k], qy[k]); }

  // ------------------------------------------------------------ drawing --
  function drawAmbient(t, calmK, fin) {
    const cy = eTop + H * 0.3;
    glow(g, ecx, cy, W * (0.95 + 0.04 * Math.sin(t * 0.5)), mix(worryCol, glowCol, calmK), (0.12 + 0.06 * calmK + fin * 0.08) * (heavy ? 0.85 : 1));
    if (!low) halo(g, ecx, cy, W * 0.95, t, glowCol, { rings: 3, alpha: 0.05 + 0.04 * calmK, speed: 0.045 });
    motes(g, stage.x, stage.y, stage.w, stage.h, t * (reduced ? 0.3 : 1), mix(pal.glow, '#ffffff', 0.45), { n: low ? 12 : 24, alpha: 0.32, seed: 34 + E.round, size: 1.5 });
  }
  function drawEnvelopeBack(t, calmK) {
    g.save(); g.translate(ecx, eB); g.scale(1 + 0.02 * hug.x, 1 - 0.03 * hug.x); g.translate(-ecx, -eB);
    g.drawImage(backSpr, eL - pad, eTop - pad, W + pad * 2, H + pad * 2);
    // the lining's little lights twinkle slowly in the open mouth
    if (sealShown < 0.98) {
      const vis = 1 - sealShown;
      for (let i = 0; i < TWN; i++) {
        const u = twk[i * 3], v = twk[i * 3 + 1], x = eL + W * (0.08 + u * 0.84), lim = mouthAt(Math.abs(x - ecx) / (W / 2));
        const y = eTop + 4 + v * Math.max(2, lim - 8);
        const a = (0.5 + 0.5 * Math.sin(t * (0.9 + u) + twk[i * 3 + 2])) * 0.5 * vis * (0.6 + 0.4 * calmK);
        glow(g, x, y, 5 + 3 * v, liningDot, a);
      }
    }
    // an inviting glow in the mouth until the card is in
    if (!seated) glow(g, ecx, eTop + mouthMid * 0.6, W * 0.32, glowCol, (0.16 + 0.08 * Math.sin(t * 1.6)) * (1 - insShown));
    g.restore();
  }
  function drawFlapBack() {
    let any = false;
    for (let k = 1; k < NF - 1; k++) if (qy[k] < eTop - 0.5) { any = true; break; }
    if (!any) return;
    let lean = 0, m = 0;
    for (let k = 0; k < NF; k++) if (qf[k] < 0.5) { lean += Math.sin(Math.PI * qf[k]); m++; }
    lean = m ? lean / m : 0;
    g.save();
    g.beginPath(); g.rect(eL - W, eTop - H * 3, W * 3, H * 3); g.clip();
    flapPath();
    g.fillStyle = liningGrad; g.fill();
    g.globalAlpha = 0.6; g.fillStyle = liningPat; g.fill(); g.globalAlpha = 1;
    if (lean > 0.01) { g.fillStyle = rgba('#000010', 0.32 * lean); g.fill(); }
    g.strokeStyle = rgba(paper, 0.95); g.lineWidth = 2.4; g.lineJoin = 'round'; flapEdge(); g.stroke();
    g.strokeStyle = rgba(paperHi, 0.6); g.lineWidth = 0.8; flapEdge(); g.stroke();
    g.restore();
  }
  function clipInside() { g.clip(insidePath); }
  function drawPhotos(t) {
    if (!n) return;
    for (const o of ph) {
      const inside = o.pk > 0.25;
      g.save(); if (inside) clipInside();
      const fresh = 1 - o.cool;
      photos.draw(g, o.i, o.spr.x, o.spr.y, o.size * (1 - 0.05 * o.cool), { shape: 'card', rot: o.rs.x, tone: 'mist', toneMix: 0.5 * o.cool, blur: 0.12 * o.cool,
        glow: o.pk < 0.6 ? 0.3 + (o.hero ? 0.15 : 0) : 0.12 * fresh, glowColour: glowCol, shadow: o.pk < 0.4 });
      if (o.sealed && o.cool < 1) glow(g, o.spr.x, o.spr.y, o.size * 0.7, glowCol, 0.45 * (1 - o.cool));
      g.restore();
    }
    void t;
  }
  function drawCard(t, calmK) {
    const x = card.x, y = card.y, r = cardRot.x, sc = 1 + 0.035 * lift.x;
    const z = 1 - smooth(clamp(insShown / 0.5));
    // worry aura (cools as the card goes in)
    if (z > 0.02) glow(g, x, y, cW * 0.78, worryCol, 0.2 * agit * z * (1 - calmK * 0.6));
    if (z > 0.02) {
      const h = 1 + lift.x * 0.6;
      g.save(); g.globalAlpha = (0.32 + 0.1 * lift.x) * z;
      g.drawImage(shadowSpr, x + 4 + 8 * z * h - cW * 0.62, y + 10 + 18 * z * h - cH * 0.66, cW * 1.24, cH * 1.32);
      g.restore();
    }
    g.save();
    if (insShown > 0.2) clipInside();
    g.translate(x, y); g.rotate(r); g.scale(sc, sc);
    g.drawImage(cardSpr, -cW / 2 - cpad, -cH / 2 - cpad, cW + cpad * 2, cH + cpad * 2);
    // a light sheen slides across the card as it moves
    const sx = -cW / 2 + ((t * 0.12 + insShown * 0.8) % 1.6) * cW * 1.1 - cW * 0.2;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.08 + 0.06 * lift.x;
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(sx, -cH / 2); g.lineTo(sx + cW * 0.12, -cH / 2); g.lineTo(sx - cW * 0.05, cH / 2); g.lineTo(sx - cW * 0.17, cH / 2); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.restore();
    if (E.phase !== 'law') {
      const c = Math.cos(r), s = Math.sin(r), ly = cH * 0.14 * sc;
      words.draw(g, x - s * ly, y + c * ly, { style: 'ink', size: wordSize, maxWidth: cW * 0.82, lines: 2, rot: r, colour: ink });
    }
  }
  function drawPocket(t, fin) {
    g.save();
    g.translate(ecx, eB); g.scale(1 + 0.02 * hug.x, 1 - 0.03 * hug.x); g.translate(-ecx, -eB);
    g.drawImage(pocketSpr, eL - pad, eTop - pad, W + pad * 2, H + pad * 2);
    // the paper softly lit from inside where it holds the card
    if (insShown > 0.4) glow(g, ecx, yS, cW * 0.62, paperHi, (0.1 + 0.08 * fin) * smooth((insShown - 0.4) / 0.6));
    g.restore();
    // ink showing through the vellum
    if (insShown > 0.3 && E.phase !== 'law') {
      const x = card.x, y = card.y, r = cardRot.x, c = Math.cos(r), s = Math.sin(r), ly = cH * 0.14;
      g.save(); g.clip(pocketPath);
      words.draw(g, x - s * ly, y + c * ly, { style: 'ink', size: wordSize, maxWidth: cW * 0.82, lines: 2, rot: r, colour: mix(ink, paper, 0.12), alpha: 0.62 * smooth((insShown - 0.3) / 0.4) });
      g.restore();
    }
    void t;
  }
  function drawFlapFront() {
    let any = false;
    for (let k = 1; k < NF - 1; k++) if (qy[k] > eTop + 0.5) { any = true; break; }
    if (!any) return;
    let open = 0;
    for (let k = 0; k < NF; k++) open += 1 - qf[k];
    open /= NF;
    g.save();
    g.beginPath(); g.rect(eL - W, eTop, W * 3, H * 3); g.clip();
    // soft shadow cast on the pocket and the card tops
    g.save(); g.translate(1.5, 3 + 3 * open); flapPath(); g.fillStyle = rgba(shade, 0.16); g.fill(); g.restore();
    flapPath();
    g.fillStyle = outerGrad; g.fill();
    g.globalAlpha = 0.06; g.fillStyle = fibrePat; g.fill(); g.globalAlpha = 1;
    if (open > 0.02) { g.fillStyle = rgba(paperLo, 0.35 * open); g.fill(); }
    g.lineJoin = 'round';
    g.strokeStyle = rgba(edgeCol, 0.3); g.lineWidth = 1.6; flapEdge(); g.stroke();
    g.strokeStyle = rgba(paperHi, 0.95); g.lineWidth = 1; flapEdge(); g.stroke();
    // crease where it folds over the top edge
    g.strokeStyle = rgba(paperHi, 0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(eL + rcE, eTop + 0.8); g.lineTo(eR - rcE, eTop + 0.8); g.stroke();
    g.restore();
  }
  function drawSeal(t, fin) {
    if (!seated) return;
    const P = tr.pts, iS = sealedAt >= 0 ? tr.last : traceIndex(sealShown);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (sealedAt < 0) {
      // the dotted seal guide (where the flap edge will land)
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      for (let k = iS + 5; k < P.length; k += 5) {
        const a = 0.35 + 0.35 * Math.sin(t * 3 - k * 0.12);
        g.fillStyle = rgba(stitchCol, 0.55 * a + 0.2); g.beginPath(); g.arc(P[k][0], P[k][1], 1.7 + a * 0.9, 0, TAU); g.fill();
      }
      const hx = P[iS][0], hy = P[iS][1];
      glow(g, hx, hy, 22 + 4 * pulse, glowCol, drag && drag.mode === 'seal' ? 0.85 : 0.5 + 0.2 * pulse);
      g.strokeStyle = rgba(stitchCol, 0.7); g.lineWidth = 1.6; g.beginPath(); g.arc(hx, hy, 9 + 2 * pulse, 0, TAU); g.stroke();
    }
    if (iS > 0) {
      g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let k = 1; k <= iS; k++) g.lineTo(P[k][0], P[k][1]);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(pal.glow, 0.22 + 0.12 * fin); g.lineWidth = 9; g.stroke(); g.restore();
      g.strokeStyle = rgba(stitchCol, 0.9); g.lineWidth = 2.2; g.setLineDash([6, 5]); g.lineDashOffset = 0; g.stroke();
      g.setLineDash([]);
      g.strokeStyle = rgba('#ffffff', 0.35); g.lineWidth = 0.8; g.stroke();
    }
    g.restore();
  }
  function drawRibbon(t, fin) {
    const R = rope, N = R.n;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.save(); g.translate(1.5, 2.5); R.path(g); g.strokeStyle = rgba(shade, 0.18); g.lineWidth = rw + 1; g.stroke(); g.restore();
    R.path(g); g.strokeStyle = ribbonCol; g.lineWidth = rw; g.stroke();
    R.path(g); g.strokeStyle = rgba('#ffffff', 0.4); g.lineWidth = rw * 0.3; g.stroke();
    const ex = R.x[N - 1], ey = R.y[N - 1], a = Math.atan2(ey - R.y[N - 2], ex - R.x[N - 2]);
    const tw = 12 + 6 * stage.s, th = 16 + 8 * stage.s;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
    glow(g, ex + Math.cos(a) * th * 0.5, ey + Math.sin(a) * th * 0.5, th * (1.3 + fin * 0.4), glowCol, 0.3 + 0.15 * pulse * (seated ? 1 : 0.4) + fin * 0.35);
    g.translate(ex, ey); g.rotate(a - Math.PI / 2);
    const tg = g.createLinearGradient(-tw / 2, 0, tw / 2, 0); tg.addColorStop(0, mix(ribbonCol, '#ffffff', 0.25)); tg.addColorStop(0.5, mix(ribbonCol, '#ffffff', 0.55)); tg.addColorStop(1, ribbonCol);
    rr(g, -tw / 2, -2, tw, th, Math.min(5, tw * 0.4)); g.fillStyle = tg; g.fill();
    g.strokeStyle = rgba('#ffffff', 0.5); g.lineWidth = 1; g.stroke();
    g.fillStyle = rgba(shade, 0.7); g.beginPath(); g.arc(0, th * 0.62, 2.4, 0, TAU); g.fill();
    g.restore();
  }
  function drawEmblem(t, fin) {
    const k = emblem.x;
    if (k <= 0.01) return;
    const x = ecx, y = eTop + depthAt(0) - H * 0.085, r = H * 0.068 * k;
    glow(g, x, y, r * (2.6 + 0.3 * Math.sin(t * 1.1)), glowCol, 0.32 + 0.2 * fin);
    g.save();
    g.globalAlpha = 0.35; g.drawImage(shadowSpr, x - r * 1.2, y - r * 0.9, r * 2.4, r * 2.4); g.globalAlpha = 1;
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, mix(pal.glow, '#ffffff', 0.7)); gr.addColorStop(0.6, mix(pal.glow, pal.accent, 0.35)); gr.addColorStop(1, mix(pal.accent, shade, 0.25));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = rgba('#ffffff', 0.55); g.lineWidth = 1; g.beginPath(); g.arc(x, y, r * 0.74, 0, TAU); g.stroke();
    g.restore();
    glint(g, x, y, r * (0.75 + 0.1 * Math.sin(t * 1.3)), '#ffffff', 0.7, t * 0.15);
  }
  function drawFinaleGlints(t, fin) {
    const k0 = t - finAt, m = heavy ? 1 : 3;
    for (let j = 0; j < m; j++) {
      const k = (k0 * (heavy ? 0.22 : 0.38) + j / m) % 1, q = tr.pointAt(dir > 0 ? k : 1 - k);
      glint(g, q.x, q.y, 6 + 3 * Math.sin(k * Math.PI), '#ffffff', 0.7 * Math.sin(k * Math.PI) * fin, k * 3);
    }
  }
  function drawStar(dt, t) {
    const k = clamp((E.now() - twistAt) / 2.6);
    star.x.target = star.tx + Math.sin(k * Math.PI * 2.2) * W * 0.07 * (1 - k); star.y.target = star.ty;
    star.x.update(dt); star.y.update(dt);
    const x = star.x.x, y = star.y.x - finLift, r = H * 0.075, rot = Math.sin(k * 7) * 0.5 * (1 - k) + Math.sin(t * 0.7) * 0.05;
    glow(g, x, y, r * 2.4, '#ffe9b0', 0.35);
    g.save(); g.translate(x, y); g.rotate(rot);
    for (let i = 0; i < 5; i++) {
      const a0 = -Math.PI / 2 + (i / 5) * TAU, a1 = a0 + TAU / 10, a2 = a0 - TAU / 10;
      const px = Math.cos(a0) * r, py = Math.sin(a0) * r;
      g.fillStyle = '#fff4d8'; g.beginPath(); g.moveTo(0, 0); g.lineTo(px, py); g.lineTo(Math.cos(a1) * r * 0.45, Math.sin(a1) * r * 0.45); g.closePath(); g.fill();
      g.fillStyle = '#f0d9a8'; g.beginPath(); g.moveTo(0, 0); g.lineTo(px, py); g.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45); g.closePath(); g.fill();
    }
    g.restore();
  }
  function drawLights(t) {
    const k = E.now() - twistAt;
    for (let i = 0; i < 3; i++) {
      const a = smooth(clamp((k - i * 0.55) / 0.9));
      if (a <= 0) continue;
      const L = lights[i], y = L.y - finLift + Math.sin(t * 0.9 + i) * 2.5 * (reduced ? 0.3 : 1);
      glow(g, L.x, y, 16 + 4 * i, glowCol, 0.5 * a);
      orb(g, L.x, y, 3.2 + i * 0.6, mix(pal.glow, '#ffffff', 0.5), { alpha: a });
    }
  }
  function drawMoon(t) {
    const k = smooth(clamp((E.now() - twistAt) / 3)), x = ecx - ribbonSide * W * 0.36, y = eTop - H * lerp(0.15, 0.78, k) + Math.sin(t * 0.5) * 2, r = H * 0.13;
    glow(g, x, y, r * 3, glowCol, 0.3 * k);
    g.save(); g.globalAlpha = 0.85 * k;
    g.beginPath(); g.arc(x, y, r, -Math.PI / 2, Math.PI / 2, true); g.ellipse(x, y, r * 0.45, r, 0, Math.PI / 2, -Math.PI / 2, true); g.closePath();
    g.fillStyle = mix(pal.glow, '#fffaf0', 0.6); g.fill();
    g.restore();
  }

  // -------------------------------------------------------------- input --
  function onCard(p) {
    const dx = p.x - card.x, dy = p.y - card.y, c = Math.cos(-cardRot.x), s = Math.sin(-cardRot.x);
    const lx = dx * c - dy * s, ly = dx * s + dy * c, m = 26 + 6 * stage.s;
    if (Math.abs(lx) < cW / 2 + m && Math.abs(ly) < cH / 2 + m) return true;
    for (const o of ph) if (o.pk < 0.3 && Math.abs(p.x - o.spr.x) < o.w / 2 + 10 && Math.abs(p.y - o.spr.y) < o.h / 2 + 10) return true;
    return false;
  }
  function nearSeal(p) {
    const h = tr.head;
    if (Math.hypot(p.x - h.x, p.y - h.y) < tol * 1.5) return true;
    const P = tr.pts, hi = Math.min(tr.last, tr.i + 30);
    for (let k = tr.i; k <= hi; k += 2) if (Math.hypot(p.x - P[k][0], p.y - P[k][1]) < tol) return true;
    return false;
  }
  function feedCard(p) {
    drag.fx = p.x - drag.dx; drag.fy = p.y - drag.dy;
    let best = 0, bd = Infinity;
    for (let i = 0; i < NP; i++) { const d = (pathX[i] - drag.fx) ** 2 + (pathY[i] - drag.fy) ** 2; if (d < bd) { bd = d; best = i; } }
    const want = S1 * (best / (NP - 1));
    if (want > wanted + 1e-4) { const cap = prog + BANK; if (want > cap && E.locked) refuse(); wanted = Math.min(want, cap); }
    const t = E.now();
    if (t - lastRustle > 0.32 && Math.abs(want - wanted) < 0.2) { lastRustle = t; E.sound('paper', { intensity: 0.16, pitch: 0.9 + insReal * 0.3 }); }
  }
  function feedSeal(p) {
    tr.feed(p.x, p.y);
    const want = S1 + (1 - S1) * tr.progress;
    if (want > wanted + 1e-4) {
      const cap = prog + BANK;
      if (want > cap) { if (E.locked) refuse(); setTrace(clamp((cap - S1) / (1 - S1))); }
      wanted = Math.min(want, cap);
      const t = E.now();
      if (t - lastRustle > 0.26) { lastRustle = t; E.sound('paper', { intensity: 0.2, pitch: 1.05 + sealReal * 0.2 }); }
      if (!low && E.rand() < 0.35) E.particles.emit({ x: p.x, y: p.y, vx: (E.rand() - 0.5) * 20, vy: -12 - E.rand() * 14, life: 0.8, size: 5, colour: glowCol, alpha: 0.7 });
    }
  }
  function refuse() {
    const t = E.now();
    if (t - lastWait > 0.55) { lastWait = t; (seated ? flapWob : wob).kick(0.35); E.checkpoint('wait'); }
  }

  return {
    get progress() { return prog; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0 || drag) return;
      lastTouch = E.now();
      if (!seated && insReal < 0.999 && onCard(p)) {
        drag = { id: p.id, mode: 'card', dx: p.x - card.x, dy: p.y - card.y, fx: card.x, fy: card.y };
        E.sound('paper', { intensity: 0.32 }); E.haptic('light');
        feedCard(p);
      } else if (seated && sealedAt < 0 && nearSeal(p)) {
        drag = { id: p.id, mode: 'seal', dx: 0, dy: 0, fx: p.x, fy: p.y };
        E.sound('pluck', { note: Math.min(9, stepSeal + 1), intensity: 0.28 }); E.haptic('light');
        flapWob.kick(0.15);
        feedSeal(p);
      } else {
        // a touch anywhere else still gets a small, kind response
        E.sound('drip', { note: 3, intensity: 0.2 }); E.haptic('tick');
        if (!seated) { nudge += clamp((p.x - card.x) / (W * 4), -0.06, 0.06); wob.kick(0.15); } else flapWob.kick(0.2);
      }
    },
    move(p) {
      if (!drag || p.id !== drag.id || finAt >= 0) return;
      if (drag.mode === 'card') feedCard(p); else feedSeal(p);
    },
    up(p) {
      if (!drag || p.id !== drag.id) return;
      if (drag.mode === 'card' && insReal < 0.999) E.sound('paper', { intensity: 0.14, pitch: 1.2 });
      drag = null;
    },
    assist() {
      if (finAt >= 0 || sealedAt >= 0) return;
      const base = Math.max(wanted, prog);
      if (insReal < 0.999) assistTo = Math.min(S1, base + S1 / 4);
      else assistTo = Math.min(1, base + (1 - S1) / 5);
      if (insReal < 0.999) { E.sound('paper', { intensity: 0.22 }); lift.v += 4; } else { E.sound('paper', { intensity: 0.18, pitch: 1.15 }); flapWob.kick(0.12); }
    },
    pointAt(q) {
      q = clamp(q);
      if (q <= S1) { cardAt(q / S1, tmp); return { x: tmp.x, y: tmp.y }; }
      const pt = tr.pointAt((q - S1) / (1 - S1));
      return { x: pt.x, y: pt.y };
    },
    hint() {
      if (finAt >= 0 || sealedAt >= 0) return null;
      const pts = [];
      if (insReal < 0.999) {
        const k0 = insReal;
        for (let i = 0; i <= 16; i++) { cardAt(lerp(k0, 1, i / 16), tmp); pts.push([tmp.x, tmp.y]); }
        pts[0] = [card.x, card.y];
        return { path: pts };
      }
      const P = tr.pts, i0 = traceIndex(sealReal);
      for (let k = i0; k <= tr.last; k += 2) pts.push([P[k][0], P[k][1]]);
      if (pts.length < 2) pts.push([P[tr.last][0], P[tr.last][1]]);
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      if (twistKind === 0) {
        const sx = ecx - ribbonSide * W * 0.62, sy = stage.y + 12;
        star.x.set(clamp(sx, stage.x + 20, stage.x + stage.w - 20)); star.y.set(sy);
        star.tx = ecx - ribbonSide * W * 0.4; star.ty = eTop - H * 0.04;
      } else if (twistKind === 1) {
        const R = rope, ex = R.x[R.n - 1], ey = R.y[R.n - 1];
        for (let i = 0; i < 3; i++) { lights[i].x = clamp(ex + ribbonSide * (i + 1) * W * 0.11, stage.x + 16, stage.x + stage.w - 16); lights[i].y = Math.max(stage.y + 16, ey - (i + 1) * H * 0.1 - i * i * H * 0.02); }
      }
      E.particles.burst(ecx, eTop - H * 0.2, low ? 4 : 10, { speed: 40, colour: glowCol, life: 1.2, size: 5, kind: 'glint' });
    },
    finish() {
      if (finAt >= 0) return;
      finAt = E.now(); drag = null; assistTo = null; emblem.target = 1;
      for (const o of ph) if (!o.sealed) { o.sealed = true; }
      const ey = eTop + depthAt(0) - H * 0.085;
      E.ripples.add(ecx, ey, { colour: glowCol, speed: heavy ? 40 : 70, alpha: heavy ? 0.3 : 0.5, r: 10 });
      if (!heavy) E.particles.burst(ecx, ey, low ? 5 : 12, { speed: 60, colour: glowCol, life: 1.3, size: 5, kind: 'glint' });
      E.sound(heavy ? 'breathe-out' : 'shimmer', { intensity: 0.4 });
    },
    destroy() {},
  };
}
