// GE-03 · PAUSE GATE — three glass gates (timed taps).
//
// Three arched glass gates stand in a row on a still glass terrace, each one a
// step further into the distance, with a calm light waiting beyond the last.
// Their double leaves are frosted; behind each pair of leaves a stained-glass
// pane is set into the gate.
//
// Tap the first gate: its frosted leaves unlatch and swing open towards you,
// and the tap rings through its glass — rings of light spread across the pane,
// the picture behind wobbles like water, the glowing inner edge trembles and
// the leaves' free edges quiver on their hinges. The next gate's latch stays
// sealed (a little ring fills as the glass stills) and only unseals once the
// preceding ripple has completely stopped. Tapping early just makes the sealed
// gate rattle softly — "not yet". Tapping an open gate rings it again. Win:
// all three gates rest open, every pane still, with no further tap.
//
// Photos are the stained-glass panes: frosted (blurred) behind the leaves at
// first; as a gate swings open its pane is revealed misty and tinted, and the
// ripple's wavefront wipes the mist away until the picture settles true and
// still. Extra photos become the far "destination" light and round
// rose-window medallions set in the arches (frosted and cleared with their
// pane). Words are etched into the first gate's glass threshold — frosted
// engraving that glows clear once all three gates rest open.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, roundRect, canvas as makeCanvas, motes, rng, Spring, FONT } from '../fx.js';
import { Wobble, waitRing } from '../kit.js';

export const meta = {
  id: 'GE-03',
  howTo: 'Tap the first glass gate, then wait for its ripple to go still.',
  steps: [
    'Tap the first glass gate — it swings open and its glass starts to ripple.',
    'Wait until the ripple and the gate’s edge are completely still; the next latch lights up.',
    'Tap the next gate, then the last. Leave all three open — no more taps.',
  ],
  tapAlt: 'each press opens the next gate or helps its ripple go still',
  words: 'Your words are etched into the first gate’s glass threshold — frosted at first, glowing clear once all three gates rest open.',
  photos: {
    where: 'Your photos are set inside the three gates as stained-glass panes.',
    becomes: 'stained-glass pictures behind frosted glass',
    touch: 'Each gate you tap swings open;',
    change: 'its frost lifts, the ripple wipes away the mist, and the picture settles true and still.',
    payoff: 'At the end, light flows through all three open gates and every picture glows clear.',
  },
  finaleSec: 4.2,
};

const PHI = 1.08;            // fully open leaf angle (rad)
const EPS = 0.05;            // ripple energy below which the glass counts as still
const BLEED = 8;             // pane cache bleed (css px) so refraction strips never show a gap
const SC = [1, 0.88, 0.77];  // depth scale of gates 1..3
const DEPTH_A = [1, 0.93, 0.86];
const OV = 0.05;             // neighbouring frames overlap (× gate-1 width)
const RISE = 0.1;            // each gate further back stands this much higher (× gate-1 width)
const NOTES = [2, 4, 6];     // pentatonic note per gate

let FROST_TEX = null;
function frostTexture() {
  if (FROST_TEX) return FROST_TEX;
  const N = 128, c = makeCanvas(N, N), q = c.getContext('2d'), r = rng(23);
  for (let i = 0; i < 560; i++) {
    const x = r() * N, y = r() * N, s = 0.35 + r() * 1.3;
    q.fillStyle = `rgba(255,255,255,${(0.12 + r() * 0.5).toFixed(3)})`;
    q.beginPath(); q.arc(x, y, s, 0, TAU); q.fill();
  }
  q.strokeStyle = 'rgba(255,255,255,0.16)'; q.lineWidth = 0.7; q.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const x = r() * N, y = r() * N, a = r() * TAU, L = 4 + r() * 13;
    q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    q.lineTo(x + Math.cos(a + 0.5) * L * 1.3, y + Math.sin(a + 0.5) * L * 1.3); q.stroke();
  }
  FROST_TEX = c;
  return c;
}

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = !!E.reduced, lowStim = !!E.lowStim, heavy = !!E.heavy;
  const calm0 = E.calm || 0;
  const DPR = Math.min(2, globalThis.devicePixelRatio || 1);
  const warm = pal.warm || '#ffb37a';
  // a reliably dark glass colour (bright realms have a light 'deep', so fall back to their ink)
  const luma = (h) => { const v = parseInt(String(h).slice(1), 16); return ((v >> 16 & 255) * 0.3 + (v >> 8 & 255) * 0.59 + (v & 255) * 0.11) / 255; };
  const dark = luma(pal.deep) > 0.3 ? mix(pal.ink || '#120c2a', pal.deep, 0.25) : pal.deep;

  // ---- loop rounds: fresh arrangement, colour, hero photo and twist; a little calmer each time
  const R1 = E.round === 1;
  const dir = R1 ? 1 : (E.rand() < 0.5 ? -1 : 1);
  const tint = R1 ? pal.glow : [pal.glow, pal.accent, mix(pal.glow, warm, 0.5)][Math.floor(E.rand() * 3) % 3];
  const tint2 = mix(tint, '#ffffff', 0.55);
  const sunU = R1 ? 0.7 : 0.25 + E.rand() * 0.5;
  const twistKind = R1 ? 0 : (E.round + Math.floor(E.rand() * 3)) % 3;
  const AMP = (heavy ? 0.82 : 1) * (1 - 0.35 * calm0);       // ripple strength of a fresh ring
  const TAU_R = heavy ? 0.95 : 0.85;                         // ripple decay time constant (s)
  const agit0 = (heavy ? 0.4 : 1) * (1 - calm0 * 0.8);        // starting agitation (frost shimmer, ring brightness)
  const ringSpeedK = heavy ? 52 : 66;                        // px/s at stage.s = 1

  // ---- photo slots: three panes, then the far light, then keystone medallions
  const n = photos.n;
  const rot = (j) => (n ? (j + E.round - 1) % n : -1);
  const paneP = [-1, -1, -1], medalP = [-1, -1, -1];
  let farP = -1;
  if (n === 1) { paneP[(E.round - 1) % 3] = 0; farP = 0; }        // one hero pane (moves each round) + the light beyond
  else if (n === 2) { const free = (E.round + 1) % 3; let j = 0; for (let k = 0; k < 3; k++) if (k !== free) paneP[k] = rot(j++); }
  else if (n >= 3) {
    paneP[0] = rot(0); paneP[1] = rot(1); paneP[2] = rot(2);
    if (n >= 4) farP = rot(3);
    for (let j = 4; j < n; j++) medalP[j - 4] = rot(j);
  }

  const gates = [0, 1, 2].map((k) => ({
    k, photo: paneP[k], medal: medalP[k],
    sw: new Spring(0, { stiffness: 34, damping: 4.4 }),   // normalised swing (overshoots a little: the edge quivers)
    wob: new Wobble(),
    E: 0, E0: 1, age: 9, rx: 0, ry: 0, front: 0, wipe: -1, wx: 0, wy: 0,
    opened: false, ready: false, chimed: false, flash: 0, deny: 0, hushT: 0, settled: true,
    // geometry (fit)
    W: 1, H: 1, cx: 0, base: 0, x0: 0, y0: 0, f: 1, ox: 0, oy: 0, ow: 1, oh: 1, r: 1, acy: 0, latchX: 0, latchY: 0, pl: 0, diag: 1,
    depthA: DEPTH_A[k],
    openPath: null, rimPath: null, outerPath: null, framePath: null, midPath: null,
    leafUV: null, rayUV: null, rim: null, pane: null, frost: null, frosted: null, frameFill: null, frostGrad: null, leafRefl: null, plinthGrad: null,
  }));

  // ---- state
  let p = 0, wanted = 0, target = 0, nOpened = 0;
  let doneFlag = false, doneSaid = false, finAt = -1, twistAt = -1;
  let hinted = false, lastRefuse = -9, lastRing = -9;
  let hum = null, humK = -1;
  const downIds = new Set();
  const twistLights = [];

  // ---- layout + caches
  let fitKey = '', U = 1, fs = 13, horizonY = 0, compTop = 0, compBot = 0, lastToken = null;
  const plq = { x: 0, y: 0, w: 10, h: 10, lines: 2 };
  const far = { x: 0, y: 0, r: 10, haloR: 40, coreR: 20, rayL: 60, rayGrad: null };
  const floor = { x: 0, y: 0, rx: 10, ry: 10, grad: null };
  let plqGrad = null;

  function measureToken() {
    g.save(); g.font = `600 ${fs}px ${FONT}`;
    const w = g.measureText(String(words.token || '')).width;
    g.restore();
    return w;
  }

  function fit(force = false) {
    const tok = words.token;
    const key = `${stage.x}|${stage.y}|${stage.w}|${stage.h}|${DPR}|${tok}`;
    if (!force && key === fitKey) return;
    fitKey = key; lastToken = tok;
    U = stage.s;
    fs = Math.max(12, Math.round(12.5 * U + 1));
    const sumW = SC[0] + SC[1] + SC[2] - 2 * OV;
    let W1 = (stage.w - 10) / sumW;
    // words plaque: one, two or three lines
    const tw = measureToken();
    const maxPW = Math.min(stage.w - 16, Math.max(W1 * 1.45, 150 * U));
    plq.lines = tw <= maxPW - 30 ? 1 : tw <= (maxPW - 30) * 1.85 ? 2 : 3;
    plq.w = plq.lines === 1 ? clamp(tw + 34, W1 * 0.9, maxPW) : maxPW;
    plq.h = Math.round(plq.lines * fs * 1.2 + 15);
    const below = plq.h + 10, toastRes = Math.round(16 * U + 2);   // keep the host's law note (stage bottom) clear of the words
    const avail = stage.h - below - 12 - toastRes;
    let asp = clamp((avail * 0.86) / W1, 1.5, 2.14);
    if (asp * W1 > avail) asp = Math.max(1.3, avail / W1);
    W1 = Math.max(60, Math.min(W1, avail / asp));
    const H1 = asp * W1;
    const spare = Math.max(0, stage.h - (H1 + below + 8 + toastRes));
    // when the stage allows, leave room above the arches for a two-line plot-twist note
    const bannerRoom = Math.round(30 + 2 * (16 * U + 3) + 10);
    compTop = stage.y + 6 + Math.min(spare, Math.max(spare * 0.5, bannerRoom));
    const base1 = compTop + H1;
    compBot = base1 + below;
    horizonY = base1 - H1 * 0.42;
    const totalW = sumW * W1;
    const cxs = [0, 0, 0];
    cxs[0] = stage.cx - (dir * totalW) / 2 + (dir * W1 * SC[0]) / 2;
    cxs[1] = cxs[0] + dir * ((W1 * SC[0]) / 2 + (W1 * SC[1]) / 2 - OV * W1);
    cxs[2] = cxs[1] + dir * ((W1 * SC[1]) / 2 + (W1 * SC[2]) / 2 - OV * W1);
    for (let k = 0; k < 3; k++) {
      const gt = gates[k], W = W1 * SC[k], H = H1 * SC[k];
      gt.W = W; gt.H = H; gt.cx = cxs[k];
      gt.base = base1 - RISE * W1 * k;
      gt.x0 = gt.cx - W / 2; gt.y0 = gt.base - H;
      gt.f = Math.max(5, W * 0.078);
      gt.ox = gt.x0 + gt.f; gt.ow = W - 2 * gt.f; gt.r = gt.ow / 2;
      gt.oy = gt.y0 + gt.f; gt.oh = gt.base - gt.oy; gt.acy = gt.oy + gt.r;
      gt.latchX = gt.cx; gt.latchY = gt.acy + (gt.base - gt.acy) * 0.6;
      gt.pl = k ? Math.max(6, 8 * U) : 0;
      gt.diag = Math.hypot(gt.ow, gt.oh);
      buildPaths(gt);
    }
    // words plaque = the first gate's glass threshold
    plq.x = clamp(gates[0].cx - plq.w / 2, stage.x + 4, stage.x + stage.w - 4 - plq.w);
    plq.y = base1 + 2;
    plqGrad = g.createLinearGradient(0, plq.y, 0, plq.y + plq.h);
    plqGrad.addColorStop(0, rgba(mix(tint, dark, 0.74), 0.84));
    plqGrad.addColorStop(0.5, rgba(mix(tint, dark, 0.87), 0.88));
    plqGrad.addColorStop(1, rgba(mix(tint, dark, 0.93), 0.9));
    // the far light (the calm beyond the third gate)
    const g3 = gates[2];
    far.r = clamp(W1 * 0.2, 22, 34);
    far.x = g3.cx + dir * g3.W * 0.32;
    far.y = g3.y0 - far.r * 1.05;
    if (far.y - far.r < stage.y + 4) {
      far.y = Math.max(stage.y + far.r + 4, g3.y0 + far.r * 0.2);
      far.x = g3.cx + dir * (g3.W / 2 + far.r * 0.15);
    }
    far.x = clamp(far.x, stage.x + far.r + 2, stage.x + stage.w - far.r - 2);
    // its halo and rays stay (all but invisibly) inside the stage: never over the title or the law chip
    const room = Math.max(8, far.y - stage.y);
    far.haloR = Math.min(far.r * 4.6, Math.max(room / 0.8, far.r * 1.8));
    far.coreR = Math.min(far.r * 2.4, Math.max(room / 0.72, far.r * 1.5));
    far.rayL = Math.min(far.r * 7, Math.max(room * 1.05, far.r * 2.5));
    far.rayGrad = g.createRadialGradient(far.x, far.y, far.r * 0.6, far.x, far.y, far.rayL);
    far.rayGrad.addColorStop(0, rgba(warm, 1)); far.rayGrad.addColorStop(0.55, rgba(warm, 0.45)); far.rayGrad.addColorStop(1, rgba(warm, 0));
    // floor (its soft shadow ends at the stage edges)
    floor.x = stage.cx; floor.y = (g3.base + compBot) / 2 + 4; floor.rx = stage.w * 0.5; floor.ry = Math.max(30, (compBot - g3.base) * 0.85);
    floor.grad = g.createRadialGradient(0, 0, 0, 0, 0, floor.rx);
    floor.grad.addColorStop(0, rgba(mix(pal.deep, tint, 0.18), 0.5));
    floor.grad.addColorStop(0.6, rgba(pal.deep, 0.26));
    floor.grad.addColorStop(1, rgba(pal.deep, 0));
    for (const gt of gates) buildPane(gt);
    if (twistLights.length) placeTwistLights();
  }

  function archPath(x, y, w, bottom, close = true) {
    const P = new Path2D(), r = w / 2;
    P.moveTo(x, bottom); P.lineTo(x, y + r); P.arc(x + r, y + r, r, Math.PI, 0); P.lineTo(x + w, bottom);
    if (close) P.closePath();
    return P;
  }

  function buildPaths(gt) {
    const { x0, y0, W, base, ox, oy, ow, r, cx, acy, f } = gt;
    gt.openPath = archPath(ox, oy, ow, base, true);
    gt.rimPath = archPath(ox, oy, ow, base, false);
    gt.outerPath = archPath(x0, y0, W, base, false);
    gt.midPath = archPath(x0 + f / 2, y0 + f / 2, W - f, base, false);
    const FP = new Path2D();
    FP.moveTo(x0, base); FP.lineTo(x0, y0 + W / 2); FP.arc(cx, y0 + W / 2, W / 2, Math.PI, 0); FP.lineTo(x0 + W, base); FP.closePath();
    FP.moveTo(ox, base); FP.lineTo(ox, acy); FP.arc(cx, acy, r, Math.PI, 0); FP.lineTo(ox + ow, base); FP.closePath();
    gt.framePath = FP;
    // leaf outline in leaf space (u: 0 at the hinge → 1 at the meeting edge, y: screen y when closed)
    const uv = [0, base, 1, base, 1, oy];
    for (let i = 1; i <= 8; i++) { const a = -Math.PI / 2 - (i / 8) * (Math.PI / 2); uv.push((cx + r * Math.cos(a) - ox) / r, acy + r * Math.sin(a)); }
    gt.leafUV = Float32Array.from(uv);
    // etched sunburst rays (from the latch to the leaf border)
    const lh = base - acy;
    gt.rayUV = Float32Array.from([1 - Math.SQRT1_2, acy - r * Math.SQRT1_2, 1 + Math.cos(-1.95), acy + r * Math.sin(-1.95), 0, acy + lh * 0.12, 0, base - lh * 0.28, 0.5, base]);
    // inner rim samples (x, y, nx, ny) for the trembling edge
    const pts = [];
    for (let i = 0; i <= 5; i++) pts.push(ox, lerp(base, acy, i / 5), -1, 0);
    for (let i = 1; i < 20; i++) { const a = Math.PI + (i / 20) * Math.PI; pts.push(cx + r * Math.cos(a), acy + r * Math.sin(a), Math.cos(a), Math.sin(a)); }
    for (let i = 0; i <= 5; i++) pts.push(ox + ow, lerp(acy, base, i / 5), 1, 0);
    gt.rim = Float32Array.from(pts);
    // static gradients
    const ff = g.createLinearGradient(0, y0, 0, base);
    ff.addColorStop(0, rgba(mix(tint, dark, 0.3), 0.78));
    ff.addColorStop(0.5, rgba(mix(tint, dark, 0.52), 0.8));
    ff.addColorStop(1, rgba(mix(tint, dark, 0.7), 0.88));
    gt.frameFill = ff;
    const fg = g.createLinearGradient(ox, oy, ox + ow * 0.6, base);
    fg.addColorStop(0, rgba(mix('#ffffff', tint, 0.15), 0.62));
    fg.addColorStop(0.55, rgba(mix('#ffffff', tint, 0.35), 0.4));
    fg.addColorStop(1, rgba(mix(tint, dark, 0.35), 0.5));
    gt.frostGrad = fg;
    const lr = g.createLinearGradient(0, y0 - 10, 0, base + 10);
    lr.addColorStop(0, rgba(mix(tint2, '#ffffff', 0.4), 0.55)); lr.addColorStop(0.35, rgba(tint2, 0.18));
    lr.addColorStop(0.7, rgba(tint, 0.08)); lr.addColorStop(1, rgba(tint2, 0.22));
    gt.leafRefl = lr;
    const pg = g.createLinearGradient(0, base, 0, base + gt.pl + 2);
    pg.addColorStop(0, rgba(mix(tint, '#ffffff', 0.4), 0.55));
    pg.addColorStop(1, rgba(mix(tint, dark, 0.8), 0.7));
    gt.plinthGrad = pg;
  }

  // ---- stained-glass pane (built once per layout; drawn every frame with ripple refraction)
  function buildPane(gt) {
    const b = BLEED, w = gt.ow + 2 * b, h = gt.oh + 2 * b, X0 = gt.ox - b, Y0 = gt.oy - b;
    const cw = Math.max(2, Math.ceil(w * DPR)), ch = Math.max(2, Math.ceil(h * DPR));
    const c = makeCanvas(cw, ch), q = c.getContext('2d');
    q.setTransform(DPR, 0, 0, DPR, -X0 * DPR, -Y0 * DPR);
    q.imageSmoothingEnabled = true; q.imageSmoothingQuality = 'high';
    const ph = gt.photo;
    if (ph >= 0) {
      // a soft colour field from the photo itself — the coloured glass round the picture
      const mw = Math.max(4, Math.round(w / 3)), mh = Math.max(4, Math.round(h / 3));
      const mc = makeCanvas(mw, mh), mq = mc.getContext('2d');
      mq.setTransform(mw / w, 0, 0, mh / h, (-X0 * mw) / w, (-Y0 * mh) / h);
      photos.drawClipped(mq, ph, (gg) => { gg.beginPath(); gg.rect(X0, Y0, w, h); }, X0 + w / 2, Y0 + h / 2, w * 1.25, h * 1.25);
      const tw2 = Math.max(3, Math.round(w / 11)), th2 = Math.max(3, Math.round(h / 11));
      const tc = makeCanvas(tw2, th2), tq = tc.getContext('2d');
      tq.imageSmoothingEnabled = true; tq.imageSmoothingQuality = 'high';
      tq.drawImage(mc, 0, 0, tw2, th2);
      q.drawImage(tc, X0, Y0, w, h);
      q.fillStyle = rgba(pal.deep, 0.24); q.fillRect(X0, Y0, w, h);
      const sh = q.createLinearGradient(0, Y0, 0, Y0 + h);
      sh.addColorStop(0, rgba(tint, 0.16)); sh.addColorStop(1, rgba(warm, 0.1));
      q.fillStyle = sh; q.fillRect(X0, Y0, w, h);
    } else paintVista(q, X0, Y0, w, h);

    q.save(); q.clip(gt.openPath);
    const cols = [tint, pal.accent, warm];
    const { cx, acy, r, ox, ow, base, oy } = gt;
    const bw = Math.max(4, ow * 0.075);
    // fan of coloured glass in the arch
    const hubR = r * 0.26, NF = 7;
    for (let i = 0; i < NF; i++) {
      const a0 = Math.PI + (i / NF) * Math.PI, a1 = Math.PI + ((i + 1) / NF) * Math.PI;
      q.beginPath(); q.arc(cx, acy, r + 2, a0, a1); q.arc(cx, acy, hubR, a1, a0, true); q.closePath();
      q.fillStyle = rgba(cols[i % 3], (ph >= 0 ? 0.16 : 0.2) + (i % 2) * 0.06); q.fill();
    }
    const hg = q.createRadialGradient(cx, acy, 0, cx, acy, hubR);
    hg.addColorStop(0, rgba('#fffaf0', 0.85)); hg.addColorStop(0.6, rgba(warm, 0.55)); hg.addColorStop(1, rgba(warm, 0.25));
    q.fillStyle = hg; q.beginPath(); q.arc(cx, acy, hubR, Math.PI, TAU); q.closePath(); q.fill();
    // coloured border band
    const segN = Math.max(8, Math.round((Math.PI * r + 2 * (base - acy)) / (20 * U)));
    q.lineWidth = bw; q.lineCap = 'butt';
    for (let i = 0; i < segN; i++) {
      q.strokeStyle = rgba(cols[(i + 1) % 3], ph >= 0 ? 0.24 : 0.3);
      q.setLineDash([]);
      borderSeg(q, gt, i / segN, (i + 1) / segN, bw);
      q.stroke();
    }
    // the picture itself, set in its own leaded panel
    const bTop = acy + r * (gt.medal >= 0 ? 0.2 : 0.14);
    const box = { x: ox + bw * 1.5, y: bTop, w: ow - bw * 3, h: base - bw * 1.6 - bTop };
    let pr = null, rose = null, waves = null;
    if (ph < 0) {
      // no photo: a glowing rose of coloured glass is the pane's picture
      const mr = Math.min(box.w, box.h) * 0.36, mcx = cx, mcy = box.y + box.h * 0.48, spokes = [8, 6, 10][gt.k];
      for (let i = 0; i < spokes; i++) {
        const a0 = (i / spokes) * TAU - Math.PI / 2, a1 = ((i + 1) / spokes) * TAU - Math.PI / 2;
        q.beginPath(); q.arc(mcx, mcy, mr * 1.5, a0, a1); q.arc(mcx, mcy, mr, a1, a0, true); q.closePath();
        q.fillStyle = rgba(cols[(i + gt.k) % 3], 0.34 + (i % 2) * 0.14); q.fill();
      }
      const rg = q.createRadialGradient(mcx, mcy - mr * 0.15, 0, mcx, mcy, mr);
      rg.addColorStop(0, rgba('#fffaf0', 0.98)); rg.addColorStop(0.32, rgba(mix(warm, '#ffffff', 0.35), 0.92));
      rg.addColorStop(0.72, rgba(warm, 0.8)); rg.addColorStop(1, rgba(mix(warm, pal.accent, 0.45), 0.7));
      q.fillStyle = rg; q.beginPath(); q.arc(mcx, mcy, mr, 0, TAU); q.fill();
      rose = { x: mcx, y: mcy, r: mr, n: spokes };
      // the lower lights: two bands of coloured glass like calm water beneath the rose (never a dark hole)
      const y1 = mcy + mr * 1.5 + 5 * U;
      if (base - y1 > 16 * U) {
        const y2 = lerp(y1, base, 0.5), wv = 4 * U;
        waves = [y1, y2];
        for (let i = 0; i < 2; i++) {
          const ya = waves[i], yb = i ? base + 2 : y2 + wv;
          const wg = q.createLinearGradient(0, ya - wv, 0, yb);
          wg.addColorStop(0, rgba(mix(cols[(gt.k + i + 1) % 3], '#ffffff', 0.25), 0.46));
          wg.addColorStop(1, rgba(cols[(gt.k + i + 2) % 3], 0.3));
          q.fillStyle = wg; q.beginPath(); q.moveTo(ox + bw, ya + wv * 0.5);
          q.bezierCurveTo(ox + ow * 0.34, ya - wv * (i ? -1 : 1), ox + ow * 0.66, ya + wv * (i ? -1 : 1), ox + ow - bw, ya - wv * 0.5);
          q.lineTo(ox + ow - bw, yb); q.lineTo(ox + bw, yb); q.closePath(); q.fill();
        }
        // a warm path of light across the glass water
        const sp = q.createRadialGradient(cx, y1 + (base - y1) * 0.45, 0, cx, y1 + (base - y1) * 0.45, ow * 0.42);
        sp.addColorStop(0, rgba(mix(warm, '#ffffff', 0.4), 0.4)); sp.addColorStop(1, rgba(warm, 0));
        q.fillStyle = sp; q.fillRect(ox, y1 - wv, ow, base - y1 + wv);
      }
    }
    if (ph >= 0) {
      const s0 = photos.size(ph, 'card', 100), k = Math.min(box.w / s0.w, box.h / s0.h);
      const pw = s0.w * k, phh = s0.h * k, pcx = box.x + box.w / 2, pcy = box.y + box.h * 0.5;
      photos.draw(q, ph, pcx, pcy, 100 * k, { shape: 'card', shadow: false });
      pr = { x: pcx - pw / 2, y: pcy - phh / 2, w: pw, h: phh };
    }
    // lead came: dark core + faint bevel
    const came = (fn) => {
      q.strokeStyle = 'rgba(14,10,34,0.62)'; q.lineWidth = Math.max(1.4, 2 * U); fn(); q.stroke();
      q.strokeStyle = 'rgba(255,255,255,0.16)'; q.lineWidth = 0.8; fn(); q.stroke();
    };
    came(() => {
      q.beginPath();
      for (let i = 1; i < NF; i++) { const a = Math.PI + (i / NF) * Math.PI; q.moveTo(cx + Math.cos(a) * hubR, acy + Math.sin(a) * hubR); q.lineTo(cx + Math.cos(a) * (r + 2), acy + Math.sin(a) * (r + 2)); }
      q.moveTo(cx - hubR, acy); q.arc(cx, acy, hubR, Math.PI, TAU);
      q.moveTo(ox, acy); q.lineTo(ox + ow, acy);
    });
    came(() => { q.beginPath(); q.moveTo(ox + bw, base); q.lineTo(ox + bw, acy); q.arc(cx, acy, r - bw, Math.PI, TAU); q.lineTo(ox + ow - bw, base); });
    came(() => {
      q.beginPath();
      for (let i = 1; i < segN; i++) { const [x1, y1, x2, y2] = borderTick(gt, i / segN, bw); q.moveTo(x1, y1); q.lineTo(x2, y2); }
    });
    if (pr) came(() => { q.beginPath(); roundRectPath(q, pr.x - 1.5, pr.y - 1.5, pr.w + 3, pr.h + 3, Math.min(pr.w, pr.h) * 0.1); });
    else if (rose) {
      came(() => {
        q.beginPath();
        q.moveTo(rose.x + rose.r, rose.y); q.arc(rose.x, rose.y, rose.r, 0, TAU);
        q.moveTo(rose.x + rose.r * 1.5, rose.y); q.arc(rose.x, rose.y, rose.r * 1.5, 0, TAU);
        q.moveTo(rose.x + rose.r * 0.42, rose.y); q.arc(rose.x, rose.y, rose.r * 0.42, 0, TAU);
        for (let i = 0; i < rose.n; i++) { const a = (i / rose.n) * TAU - Math.PI / 2; q.moveTo(rose.x + Math.cos(a) * rose.r * 0.42, rose.y + Math.sin(a) * rose.r * 0.42); q.lineTo(rose.x + Math.cos(a) * rose.r * 1.5, rose.y + Math.sin(a) * rose.r * 1.5); }
        if (waves) {
          const wv = 4 * U;
          for (let i = 0; i < 2; i++) { const ya = waves[i]; q.moveTo(ox + bw, ya + wv * 0.5); q.bezierCurveTo(ox + ow * 0.34, ya - wv * (i ? -1 : 1), ox + ow * 0.66, ya + wv * (i ? -1 : 1), ox + ow - bw, ya - wv * 0.5); }
          q.moveTo(cx, waves[1]); q.lineTo(cx, base);
        } else {
          const yB = lerp(acy, base, 0.86);
          q.moveTo(ox + bw, yB); q.bezierCurveTo(ox + ow * 0.4, yB + 5 * U, ox + ow * 0.6, yB - 5 * U, ox + ow - bw, yB);
        }
      });
    } else {
      // vista panes: a few extra leaded pieces in the lower lights
      came(() => {
        q.beginPath();
        const yA = lerp(acy, base, 0.38), yB = lerp(acy, base, 0.72);
        q.moveTo(ox + bw, yA); q.bezierCurveTo(ox + ow * 0.35, yA - 8 * U, ox + ow * 0.65, yA + 8 * U, ox + ow - bw, yA);
        q.moveTo(ox + bw, yB); q.bezierCurveTo(ox + ow * 0.4, yB + 6 * U, ox + ow * 0.6, yB - 6 * U, ox + ow - bw, yB);
        q.moveTo(cx, yA); q.lineTo(cx, base);
      });
    }
    // extra photos: a round stained-glass medallion set in the arch above the picture (a little rose window)
    if (gt.medal >= 0) {
      const md = r * 0.44, my = acy - r * 0.36, ring = Math.max(3, bw * 0.55);
      const rg2 = q.createRadialGradient(cx, my, md, cx, my, md + ring);
      rg2.addColorStop(0, rgba(mix(warm, '#ffffff', 0.35), 0.75)); rg2.addColorStop(1, rgba(mix(tint, warm, 0.5), 0.55));
      q.fillStyle = rg2; q.beginPath(); q.arc(cx, my, md + ring, 0, TAU); q.fill();
      photos.draw(q, gt.medal, cx, my, md * 2, { shape: 'circle', shadow: false });
      came(() => { q.beginPath(); q.arc(cx, my, md, 0, TAU); q.moveTo(cx + md + ring, my); q.arc(cx, my, md + ring, 0, TAU); });
    }
    q.restore();
    gt.pane = c;
    // frosted copy (behind the leaves)
    const m2w = Math.max(3, Math.round(cw / 4)), m2h = Math.max(3, Math.round(ch / 4));
    const m2 = makeCanvas(m2w, m2h), m2q = m2.getContext('2d');
    m2q.imageSmoothingEnabled = true; m2q.imageSmoothingQuality = 'high'; m2q.drawImage(c, 0, 0, m2w, m2h);
    const fw = Math.max(3, Math.round(cw / 12)), fh = Math.max(3, Math.round(ch / 12));
    const fc = makeCanvas(fw, fh), fq = fc.getContext('2d');
    fq.imageSmoothingEnabled = true; fq.imageSmoothingQuality = 'high'; fq.drawImage(m2, 0, 0, fw, fh);
    gt.frost = fc;
    // the leaves' frosted glass, composited once (css-pixel resolution is plenty for frost)
    const zw = Math.max(2, Math.ceil(w)), zh = Math.max(2, Math.ceil(h));
    const fz = makeCanvas(zw, zh), zq = fz.getContext('2d');
    zq.translate(-X0, -Y0);
    zq.imageSmoothingEnabled = true; zq.imageSmoothingQuality = 'high';
    zq.globalAlpha = 0.97; zq.drawImage(fc, X0, Y0, w, h);
    const mg = zq.createLinearGradient(ox, oy, ox + ow * 0.6, base);
    mg.addColorStop(0, rgba(mix('#ffffff', tint, 0.15), 0.62)); mg.addColorStop(0.55, rgba(mix('#ffffff', tint, 0.35), 0.4)); mg.addColorStop(1, rgba(mix(tint, dark, 0.35), 0.5));
    zq.globalAlpha = 0.6; zq.fillStyle = mg; zq.fillRect(X0, Y0, w, h);
    zq.globalCompositeOperation = 'lighter'; zq.globalAlpha = 0.26;
    const tex = frostTexture();
    for (let yy = oy; yy < base; yy += ow) zq.drawImage(tex, ox, yy, ow, ow);
    gt.frosted = fz;
  }
  // a segment of the border band (fractions along: left side up, arch, right side down)
  function borderPoint(gt, u, inset) {
    const { ox, ow, acy, base, cx, r } = gt;
    const side = base - acy, L = side * 2 + Math.PI * (r - inset);
    let d = u * L;
    if (d <= side) return [ox + inset, base - d, 0];
    d -= side;
    const arcL = Math.PI * (r - inset);
    if (d <= arcL) { const a = Math.PI + (d / arcL) * Math.PI; return [cx + Math.cos(a) * (r - inset), acy + Math.sin(a) * (r - inset), a]; }
    d -= arcL;
    return [ox + ow - inset, acy + d, 0];
  }
  function borderSeg(q, gt, u0, u1, bw) {
    q.beginPath();
    const steps = 4;
    for (let i = 0; i <= steps; i++) { const [x, y] = borderPoint(gt, lerp(u0, u1, i / steps), bw / 2); i ? q.lineTo(x, y) : q.moveTo(x, y); }
  }
  function borderTick(gt, u, bw) {
    const [x1, y1] = borderPoint(gt, u, 0), [x2, y2] = borderPoint(gt, u, bw);
    return [x1, y1, x2, y2];
  }
  function roundRectPath(q, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    q.moveTo(x + r, y); q.arcTo(x + w, y, x + w, y + h, r); q.arcTo(x + w, y + h, x, y + h, r); q.arcTo(x, y + h, x, y, r); q.arcTo(x, y, x + w, y, r); q.closePath();
  }
  // a calm sunrise over still water, painted in screen space so it continues from gate to gate
  function paintVista(q, X0, Y0, w, h) {
    const top = compTop, bot = compBot;
    const fh = clamp((horizonY - top) / Math.max(1, bot - top), 0.15, 0.85);
    const sky = q.createLinearGradient(0, top, 0, bot);
    sky.addColorStop(0, mix(pal.deep, pal.sky, 0.6));
    sky.addColorStop(fh * 0.55, mix(pal.sky, pal.accent, 0.28));
    sky.addColorStop(fh - 0.012, mix(mix(pal.glow, warm, 0.55), '#ffffff', 0.25));
    sky.addColorStop(fh + 0.012, mix(pal.sky, pal.deep, 0.3));
    sky.addColorStop(1, mix(pal.deep, pal.sky, 0.25));
    q.fillStyle = sky; q.fillRect(X0, Y0, w, h);
    const sx = stage.x + stage.w * sunU, sy = horizonY - (bot - top) * 0.1, sr = stage.w * 0.075;
    const sg = q.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.4);
    sg.addColorStop(0, rgba('#fffaf0', 0.95)); sg.addColorStop(0.28, rgba(warm, 0.8)); sg.addColorStop(0.42, rgba(warm, 0.3)); sg.addColorStop(1, rgba(warm, 0));
    q.fillStyle = sg; q.fillRect(X0, Y0, w, h);
    // soft hills on the horizon
    q.fillStyle = rgba(mix(pal.deep, pal.accent, 0.25), 0.6);
    q.beginPath(); q.moveTo(stage.x - 10, horizonY + 1);
    for (let i = 0; i <= 24; i++) { const x = stage.x - 10 + (i / 24) * (stage.w + 20); q.lineTo(x, horizonY - (6 + 6 * Math.sin(i * 0.9 + sunU * 7) + 4 * Math.sin(i * 2.3)) * U); }
    q.lineTo(stage.x + stage.w + 10, horizonY + 1); q.closePath(); q.fill();
    // sun path on the water + calm lines
    const wg = q.createLinearGradient(0, horizonY, 0, bot);
    wg.addColorStop(0, rgba(warm, 0.55)); wg.addColorStop(1, rgba(warm, 0));
    q.fillStyle = wg; q.beginPath(); q.ellipse(sx, horizonY + (bot - horizonY) * 0.45, sr * 0.9, (bot - horizonY) * 0.5, 0, 0, TAU); q.fill();
    q.strokeStyle = rgba('#ffffff', 0.16); q.lineWidth = 1;
    for (let i = 1; i < 7; i++) { const y = horizonY + i * i * 3.2 * U; q.beginPath(); q.moveTo(stage.x, y); q.lineTo(stage.x + stage.w, y); q.stroke(); }
  }

  fit(true);
  E.onResize(() => fit());

  // ---- leaf projection (vertical hinge, perspective): leaves swing open towards the viewer
  const PB = new Float32Array(64);
  const Q = { x: 0, y: 0 };
  function proj(gt, side, phi, u, y, out = Q) {
    const hx = side < 0 ? gt.ox : gt.ox + gt.ow, sg = side < 0 ? 1 : -1, D = gt.ow * 3.3;
    const x = hx + sg * u * gt.r * Math.cos(phi), z = u * gt.r * Math.sin(phi), m = D / (D - z);
    out.x = gt.cx + (x - gt.cx) * m; out.y = gt.latchY + (y - gt.latchY) * (1 + (m - 1) * 0.45);
    return out;
  }
  function leafOutline(gt, side, phi) {
    const uv = gt.leafUV, N = uv.length / 2;
    for (let i = 0; i < N; i++) { proj(gt, side, phi, uv[2 * i], uv[2 * i + 1]); PB[2 * i] = Q.x; PB[2 * i + 1] = Q.y; }
    g.beginPath(); g.moveTo(PB[0], PB[1]);
    for (let i = 1; i < N; i++) g.lineTo(PB[2 * i], PB[2 * i + 1]);
    g.closePath();
  }

  // ---- rules
  const isSettled = (gt) => gt.E < EPS && Math.abs(gt.sw.x - gt.sw.target) < 0.014 && Math.abs(gt.sw.v) < 0.07 && gt.hushT <= 0;
  const swingTarget = (gt) => clamp((p - gt.k / 3) * 3);

  function ring(gt, x, y, amount) {
    gt.E = Math.min(1, gt.E + amount); gt.E0 = Math.max(gt.E, EPS * 1.5);
    gt.age = 0;
    gt.rx = clamp(x, gt.ox + 4, gt.ox + gt.ow - 4); gt.ry = clamp(y, gt.oy + 4, gt.base - 4);
    gt.settled = false;
    if (hum) { try { hum.stop(); } catch { /* ignore */ } }
    hum = E.hold('hum', { intensity: 0.12 * gt.E, pitch: [1, 1.122, 1.335][gt.k] }); humK = gt.k;
  }

  function tryOpen(k, x, y) {
    const gt = gates[k];
    if (k > 0) {
      const pv = gates[k - 1];
      if (!pv.settled) { refuse(gt, pv, false); return false; }
    }
    if (E.locked || p < k / 3 - 0.003 || !E.allow(k / 3)) { refuse(gt, null, true); return false; }
    // the latch releases; the leaves swing; the glass rings
    gt.opened = true; nOpened = k + 1;
    target = (k + 1) / 3;
    wanted = Math.min(target, Math.max(wanted, k / 3) + 0.04);
    p = E.gate(wanted);                                    // the first instant of the swing is the tap itself
    if (wanted > p + 0.015) wanted = p + 0.015;
    ring(gt, x, y, AMP);
    gt.wipe = 0; gt.wx = gt.rx; gt.wy = gt.ry;            // the opening ripple wipes the mist (once; later rings never re-mist)
    gt.sw.v += 0.9;
    const pan = clamp((gt.cx - stage.cx) / (stage.w * 0.5), -1, 1);
    E.sound('glass', { note: NOTES[k], intensity: 0.55, pan });
    E.sound('unlock', { intensity: 0.22, pan });
    E.haptic('light');
    E.particles.burst(gt.latchX, gt.latchY, lowStim ? 4 : reduced ? 6 : 10, { speed: 46 * U, colour: tint2, life: 1.1, size: 4.5, kind: 'glint' });
    E.checkpoint('step');
    // the photos in this gate begin to clear as it swings open
    if (gt.photo >= 0) E.checkpoint('photo', gt.photo);
    if (gt.medal >= 0) E.checkpoint('photo', gt.medal);
    if (k === 2 && farP >= 0) E.checkpoint('photo', farP);
    if (hinted) { hinted = false; E.hint(meta.howTo); }
    return true;
  }
  // "not yet": the sealed gate rattles softly on its latch (reduced motion: its latch just glows, no shake)
  function nudge(gt, k) { if (!reduced) gt.wob.kick(k); gt.deny = 1; }
  function refuse(gt, pv, byLaw) {
    const now = E.now();
    nudge(gt, 0.85);
    if (pv) pv.flash = 1;
    if (now - lastRefuse > 0.22) {
      lastRefuse = now;
      E.sound('click', { intensity: 0.16 }); E.haptic('tick');
    }
    if (byLaw) E.checkpoint('wait');
    else if (!hinted && nOpened < 3) { hinted = true; E.hint('Not yet — let the ripple go still, then tap the next gate.'); }
  }
  function reRing(gt, x, y) {
    ring(gt, x, y, 0.42 * AMP);
    gt.sw.v -= 0.32;                                       // the open leaves flutter on their hinges
    const now = E.now();
    if (now - lastRing > 0.12) { lastRing = now; E.sound('glass', { note: NOTES[gt.k] + 3, intensity: 0.3 }); E.haptic('tick'); }
  }
  function hush(gt) {
    gt.hushT = 0.36;
    E.sound('breathe-out', { intensity: 0.22 }); E.haptic('soft');
  }

  // ---- twist: a small, gentle surprise (alternates over loop rounds)
  function placeTwistLights() {
    const g1 = gates[0], g2 = gates[1], g3 = gates[2];
    // a little pathway of resting lights on the still water, leading from the first gate towards the calm beyond
    const yF = Math.min(stage.y + stage.h - 14 * U, plq.y + plq.h * 0.5);
    const pts = [
      [lerp(g1.cx, g2.cx, 0.78) + dir * 0.12 * g2.W, yF + 8 * U],
      [lerp(g2.cx, g3.cx, 0.55), lerp(yF, g3.base + g3.pl, 0.45) + 4 * U],
      [g3.cx + dir * g3.W * 0.18, g3.base + g3.pl + 12 * U],
    ];
    for (let i = 0; i < 3; i++) { twistLights[i] = twistLights[i] || { x: 0, y: 0 }; twistLights[i].x = pts[i][0]; twistLights[i].y = pts[i][1]; }
  }

  // ================================================================ frame ==
  function frame(dt, t) {
    if (words.token !== lastToken) fit(true);
    // ---- simulation: progress only from taps / presses, always through the law gate
    if (target > wanted) wanted = Math.min(target, wanted + dt * (heavy ? 0.36 : 0.42));
    if (wanted > p + 0.015) wanted = p + 0.015;
    p = E.gate(wanted);
    if (wanted > p + 0.015) wanted = p + 0.015;

    for (const gt of gates) {
      gt.sw.target = swingTarget(gt);
      gt.sw.update(dt);
      if (gt.sw.x < 0) { gt.sw.x = 0; if (gt.sw.v < 0) gt.sw.v *= -0.3; }
      gt.wob.update(dt);
      if (gt.E > 0) {
        let rate = 1 / TAU_R;
        if (gt.hushT > 0) { rate += 3.4; gt.sw.v *= Math.exp(-dt * 7); }
        gt.E *= Math.exp(-dt * rate);
        if (gt.E < 0.004) gt.E = 0;
      }
      if (gt.hushT > 0) gt.hushT = Math.max(0, gt.hushT - dt);
      gt.age += dt;
      gt.front = gt.age * ringSpeedK * U;
      if (gt.wipe >= 0 && gt.wipe < gt.diag * 1.2) gt.wipe += dt * ringSpeedK * 1.35 * U;
      gt.flash = Math.max(0, gt.flash - dt * 2.2);
      gt.deny = Math.max(0, gt.deny - dt * 2.4);
      gt.settled = isSettled(gt);
    }
    // glass hum fades with the ripple
    if (hum) { const e = gates[humK].E; if (e < EPS * 0.7 || finAt >= 0) { try { hum.stop(); } catch { /* ignore */ } hum = null; } else hum.update({ intensity: 0.12 * e }); }

    // next latch: sealed until the preceding glass is completely still
    const nx = nOpened;
    let readyFrac = 1;
    if (nx < 3) {
      const gn = gates[nx];
      let ok = true;
      if (nx > 0) {
        const pv = gates[nx - 1];
        ok = pv.settled && p >= nx / 3 - 0.003 && !E.locked;
        readyFrac = pv.E > EPS ? clamp(Math.log(pv.E0 / pv.E) / Math.log(pv.E0 / EPS)) : ok ? 1 : 0.96;
      } else ok = !E.locked;
      if (ok && !gn.ready) {
        gn.ready = true;
        if (nx > 0 && !gn.chimed && finAt < 0) {
          gn.chimed = true;
          E.sound('glass', { note: NOTES[nx] + 4, intensity: 0.26 }); E.haptic('tick'); E.react('sigh');
          E.particles.burst(gn.latchX, gn.latchY, lowStim ? 2 : 5, { speed: 22 * U, colour: '#ffffff', life: 1, size: 4, kind: 'glint' });
        }
      } else if (!ok) gn.ready = false;
    }
    // win: all three gates open and resting, every pane still, nobody touching
    const resting = nOpened === 3 && p >= 0.999 && downIds.size === 0 && gates.every((gt) => gt.settled);
    if (resting && !doneSaid) { doneSaid = true; E.sound('settle', { intensity: 0.45 }); }
    doneFlag = resting;

    // ---- drawing
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const prog = p;
    const agit = agit0 * (1 - smooth(prog)) * (1 - fin);
    drawSky(t, prog, fin);
    drawFloor(t, fin);
    for (let k = 2; k >= 0; k--) drawReflection(gates[k], t);
    for (let k = 2; k >= 0; k--) drawGate(gates[k], t, fin, agit, k === nx ? readyFrac : -1);
    if (twistAt >= 0 && twistKind === 0) drawTwistLights(t);
    drawPlaque(t, prog, fin);
    if (fin > 0) drawFinaleFlow(t, fin);
  }

  // -------------------------------------------------------------- drawing --
  function drawSky(t, prog, fin) {
    const br = 0.85 + 0.15 * Math.sin(t * 0.6);
    // slow light rays from the calm beyond (hypnotic, very faint)
    if (!lowStim) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.globalAlpha = (0.05 + 0.05 * prog + 0.06 * fin) * br; g.fillStyle = far.rayGrad;
      const L = far.rayL, rot0 = reduced ? 0.3 : t * 0.035;
      g.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = rot0 + (i / 7) * TAU, wa = 0.07 + 0.03 * Math.sin(i * 2.1);
        g.moveTo(far.x, far.y); g.lineTo(far.x + Math.cos(a - wa) * L, far.y + Math.sin(a - wa) * L); g.lineTo(far.x + Math.cos(a + wa) * L, far.y + Math.sin(a + wa) * L); g.closePath();
      }
      g.fill(); g.restore();
    }
    glow(g, far.x, far.y, far.haloR, warm, (0.12 + 0.18 * prog + 0.24 * fin) * br);
    glow(g, far.x, far.y, far.coreR, mix(warm, '#ffffff', 0.45), 0.16 + 0.26 * prog + 0.3 * fin);
    // the far light: a photo seen through mist, or a calm sun
    const g3 = gates[2], clr = smooth(clamp(g3.sw.x * 1.1));
    if (farP >= 0) {
      if (twistAt >= 0 && twistKind === 2) drawMoon(t);
      photos.draw(g, farP, far.x, far.y, far.r * 2, { shape: 'circle', blur: 1 - clr, tone: 'mist', toneMix: (1 - clr) * 0.6, glow: 0.45 + 0.35 * clr + 0.3 * fin, glowColour: warm, shadow: false, alpha: 0.9 });
    } else {
      if (twistAt >= 0 && twistKind === 2) drawMoon(t);
      const sr = far.r * (0.42 + 0.06 * fin);
      glow(g, far.x, far.y, sr * 2.2, mix(warm, '#fffaf0', 0.5), 0.55 + 0.25 * clr);
      g.save(); g.globalAlpha = 0.85; g.fillStyle = rgba(mix(warm, '#fffaf0', 0.7 + 0.2 * clr), 0.9);
      g.beginPath(); g.arc(far.x, far.y, sr * 0.62, 0, TAU); g.fill(); g.restore();
    }
    motes(g, stage.x, stage.y, stage.w, Math.max(40, compBot - stage.y), reduced ? t * 0.3 : t, tint2, { n: lowStim ? 10 : reduced ? 14 : 24, alpha: 0.32 + 0.1 * fin, seed: 7 + E.round, size: 1.2 * U });
  }
  function drawMoon(t) {
    const k = smooth(clamp((E.now() - twistAt) / 2.4));
    const x = far.x - dir * far.r * 1.9, y = far.y + far.r * (1.6 - 1.2 * k), r = far.r * 0.42;
    glow(g, x, y, r * 4, '#f4f0ff', 0.25 * k);
    g.save(); g.globalAlpha = k * 0.9; g.fillStyle = '#f6f2ff';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.arc(x + r * 0.45 * dir, y - r * 0.2, r * 0.86, 0, TAU, true); g.fill('evenodd');
    g.restore();
    void t;
  }
  function drawFloor(t, fin) {
    g.save(); g.translate(floor.x, floor.y); g.scale(1, floor.ry / floor.rx);
    g.fillStyle = floor.grad; g.beginPath(); g.arc(0, 0, floor.rx, 0, TAU); g.fill(); g.restore();
    // drifting light on the still glass
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const y0 = gates[2].base + gates[2].pl + 6 * U;
    for (let i = 0; i < 6; i++) {
      const y = y0 + i * (compBot - y0 + 10) / 6, half = stage.w * (0.22 + 0.05 * i) * (0.9 + 0.1 * Math.sin(t * 0.3 + i));
      const xm = stage.cx + Math.sin(t * (reduced ? 0.05 : 0.18) + i * 1.7) * stage.w * 0.08;
      g.strokeStyle = rgba(tint2, 0.05 + 0.03 * fin); g.lineWidth = 1;
      g.beginPath(); g.moveTo(xm - half, y); g.lineTo(xm + half, y); g.stroke();
    }
    g.restore();
  }
  function drawReflection(gt, t) {
    const clear = gt.sw.x > 0.15 || (twistAt >= 0 && twistKind === 1 && gt.k === 2);
    const img = clear ? gt.pane : gt.frost;
    const twA = twistAt >= 0 && twistKind === 1 && gt.k === 2 && !gt.opened ? smooth(clamp((E.now() - twistAt) / 1.6)) : 1;
    const top = gt.base + gt.pl, b = BLEED, sq = 0.4;
    const ahead = twistAt >= 0 && twistKind === 1 && gt.k === 2 && !gt.opened;
    const a0 = (ahead ? 0.3 : 0.17) * gt.depthA * (clear ? 1 : 0.8) * twA;
    g.save();
    g.translate(0, top); g.scale(1, -sq); g.translate(0, -gt.base);
    g.save(); g.clip(gt.openPath);
    const bands = 4;
    for (let j = 0; j < bands; j++) {
      const y1 = gt.base - (j / bands) * gt.oh, y0 = gt.base - ((j + 1) / bands) * gt.oh;
      const sy0 = ((y0 - (gt.oy - b)) / (gt.oh + 2 * b)) * img.height, sy1 = ((y1 - (gt.oy - b)) / (gt.oh + 2 * b)) * img.height;
      const dx = reduced ? 0 : Math.sin(t * 0.9 + j * 1.3 + gt.k) * (1 + j * 0.8) * U;
      g.globalAlpha = a0 * (1 - j / bands);
      g.drawImage(img, 0, sy0, img.width, Math.max(1, sy1 - sy0), gt.ox - b + dx, y0, gt.ow + 2 * b, y1 - y0);
    }
    g.restore();
    g.restore();
    g.globalAlpha = 1;
    const pool = 0.1 + 0.18 * smooth(clamp(gt.sw.x));
    g.save(); g.translate(gt.cx, top + 3 * U); g.scale(1, 0.18);
    glow(g, 0, 0, gt.W * 0.62, tint, pool * gt.depthA);
    g.restore();
  }
  function drawTwistLights(t) {
    const k0 = E.now() - twistAt;
    for (let i = 0; i < twistLights.length; i++) {
      const L = twistLights[i], k = smooth(clamp((k0 - i * 0.45) / 1.4));
      if (k <= 0) continue;
      const y = L.y + (1 - k) * 14 * U + (reduced ? 0 : Math.sin(t * 0.9 + i * 1.7) * 1.2 * U), br = 0.85 + 0.15 * Math.sin(t * 1.1 + i);
      const sz = 1 - i * 0.14;
      // its reflection on the water, then the resting light itself
      g.save(); g.translate(L.x, L.y + 7 * U * sz); g.scale(1, 0.22); glow(g, 0, 0, 22 * U * sz, warm, 0.45 * k); g.restore();
      glow(g, L.x, y, 34 * U * sz, warm, 0.55 * k * br);
      glow(g, L.x, y, 13 * U * sz, '#fffaf0', 0.55 * k);
      orb(g, L.x, y, 5.6 * U * sz, mix(warm, '#fffaf0', 0.65), { alpha: k });
    }
  }

  function drawGate(gt, t, fin, agit, readyFrac) {
    const a = gt.depthA;
    const sw = Math.max(0, gt.sw.x);
    const wobPhi = reduced ? 0 : Math.abs(gt.wob.v) * 0.05;
    const phi = clamp(sw, 0, 1.25) * PHI + (gt.opened ? 0 : wobPhi);
    const openK = smooth(clamp(sw * 1.15));
    const flowB = fin > 0 ? finFlowBoost(gt.k, t) : 0;
    // light from behind the gate
    glow(g, gt.cx, gt.oy + gt.oh * 0.52, gt.W * 0.88, tint, (0.07 + 0.16 * openK + 0.16 * gt.E + 0.22 * flowB + 0.12 * fin) * a);
    // plinth step
    if (gt.pl > 0) {
      g.fillStyle = gt.plinthGrad; roundRect(g, gt.x0 - 4 * U, gt.base, gt.W + 8 * U, gt.pl, 3 * U); g.fill();
      g.strokeStyle = rgba('#ffffff', 0.22 * a); g.lineWidth = 1; g.beginPath(); g.moveTo(gt.x0, gt.base + 0.5); g.lineTo(gt.x0 + gt.W, gt.base + 0.5); g.stroke();
    }
    // ---- the stained-glass pane (only worth drawing once the leaves part)
    g.save(); g.clip(gt.openPath);
    if (phi > 0.02 && gt.opened) {                         // a sealed gate's rattle never shows the true picture
      drawPane(gt);
      // mist, wiped away by the ripple's wavefront
      const mistIn = gt.wipe - 26 * U;
      if (gt.wipe >= 0 && mistIn < gt.diag * 1.05 && fin < 0.98) {
        const r0 = Math.max(0, mistIn), r1 = Math.max(r0 + 1, gt.wipe + 10 * U);
        const mg = g.createRadialGradient(gt.wx, gt.wy, r0, gt.wx, gt.wy, r1);
        const mc = mix('#ffffff', tint, 0.3);
        mg.addColorStop(0, rgba(mc, 0)); mg.addColorStop(1, rgba(mc, 0.34 * (1 - fin)));
        g.fillStyle = mg; g.fillRect(gt.ox - 2, gt.oy - 2, gt.ow + 4, gt.oh + 4);
      }
      // stained wash while the glass is still ringing; true colours once still
      if (gt.E > 0.01) { g.fillStyle = rgba(mix(tint, pal.accent, 0.3), 0.2 * gt.E); g.fillRect(gt.ox, gt.oy, gt.ow, gt.oh); }
      if (fin > 0 || flowB > 0) glow(g, gt.cx, gt.latchY, gt.ow * 0.8, mix(warm, '#ffffff', 0.4), 0.16 * fin + 0.22 * flowB);
      drawRings(gt, agit);
      if (gt.hushT > 0) { const k = 1 - gt.hushT / 0.36; glow(g, gt.cx, lerp(gt.oy, gt.base, k), gt.ow * 0.7, '#ffffff', 0.22 * Math.sin(k * Math.PI)); }
    } else {
      // closed: only a hint of colour shows through the frost (the leaves draw it)
      g.drawImage(gt.frost, gt.ox - BLEED, gt.oy - BLEED, gt.ow + 2 * BLEED, gt.oh + 2 * BLEED);
    }
    g.restore();
    // ---- frame (glass tube arch)
    drawFrame(gt, t, fin + flowB * 0.6);
    // ---- frosted leaves
    const frost = 1 - openK;
    drawLeaf(gt, -1, phi, frost, t, agit);
    drawLeaf(gt, 1, phi, frost, t, agit);
    // ---- latch
    if (phi < 0.06) drawLatch(gt, t, readyFrac);
    // ---- keystone: a small glass jewel
    const kx = gt.cx, ky = gt.y0 + gt.f * 0.5;
    glow(g, kx, ky, gt.f * 1.8, tint, (0.35 + 0.3 * openK) * a);
    orb(g, kx, ky, gt.f * 0.5, mix(tint, '#ffffff', 0.35 + 0.3 * openK), { alpha: a });
  }
  function drawPane(gt) {
    const b = BLEED, X = gt.ox - b, Y = gt.oy - b, w = gt.ow + 2 * b, h = gt.oh + 2 * b, img = gt.pane;
    const amp = gt.E * (reduced ? 0.7 : heavy ? 2.6 : 3.2) * U;
    if (amp > 0.12) {
      // thin strips against a long, smooth wave: the picture sways like water, never slices
      const N = clamp(Math.round(h / ((lowStim ? 10 : 7) * U)), 14, 44), sh = img.height / N, dh = h / N;
      const kk = TAU / (46 * U), om = heavy ? 4.6 : 5.6, near = 1 / (22 * U);
      for (let j = 0; j < N; j++) {
        const yy = Y + (j + 0.5) * dh, d = Math.abs(yy - gt.ry);
        const env = (d < gt.front ? 1 : Math.exp(-(d - gt.front) / (16 * U))) * (1 - Math.exp(-d * near));
        const dx = amp * env * Math.sin(kk * d - om * gt.age);
        const sy = j * sh, shh = Math.min(sh + 1, img.height - sy);
        g.drawImage(img, 0, sy, img.width, shh, X + dx, Y + j * dh, w, dh * (shh / sh) + 0.4);
      }
    } else g.drawImage(img, X, Y, w, h);
  }
  function drawRings(gt, agit) {
    if (gt.E < 0.012) return;
    const lam = (reduced ? 26 : 19) * U, ph = gt.front % lam, flash = 1 + gt.flash * 0.7;
    g.save(); g.globalCompositeOperation = 'lighter';
    const NR = reduced ? 4 : 9;
    for (let j = 0; j < NR; j++) {
      const rr = ph + j * lam;
      if (rr > gt.front) break;
      if (rr < 3 * U) continue;
      const fall = 1 - rr / (gt.diag * 1.1);
      if (fall <= 0) break;
      const lead = rr > gt.front - lam ? 1 : 0.7;
      const born = clamp(rr / (lam * 0.8));                     // rings grow in from the touch point
      const al = Math.min(0.9, gt.E * fall * lead * born * (0.62 + 0.25 * agit) * flash);
      if (al < 0.01) continue;
      g.strokeStyle = rgba(tint2, al * 0.32); g.lineWidth = (5 + 4 * fall) * U;
      g.beginPath(); g.arc(gt.rx, gt.ry, rr, 0, TAU); g.stroke();
      g.strokeStyle = rgba('#ffffff', al * (lead === 1 ? 0.9 : 0.6)); g.lineWidth = (0.9 + 1.1 * fall) * U;
      g.beginPath(); g.arc(gt.rx, gt.ry, Math.max(1, rr - 1.2 * U), 0, TAU); g.stroke();
    }
    g.restore();
    glow(g, gt.rx, gt.ry, gt.ow * 0.5, tint2, 0.22 * gt.E * flash);
  }
  function drawFrame(gt, t, fin) {
    const a = gt.depthA;
    g.fillStyle = gt.frameFill; g.globalAlpha = a; g.fill(gt.framePath, 'evenodd'); g.globalAlpha = 1;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(tint2, (0.18 + 0.14 * Math.min(1, fin)) * a); g.lineWidth = gt.f * 0.42; g.stroke(gt.midPath);
    g.strokeStyle = rgba('#ffffff', 0.26 * a); g.lineWidth = Math.max(0.8, gt.f * 0.1); g.stroke(gt.midPath);
    // specular streak on the upper-left of the arch
    g.strokeStyle = rgba('#ffffff', 0.42 * a); g.lineWidth = Math.max(1, gt.f * 0.22); g.lineCap = 'round';
    g.beginPath(); g.arc(gt.cx, gt.acy, gt.r + gt.f * 0.5, Math.PI * 1.12, Math.PI * 1.36); g.stroke();
    // the inner edge — trembles while the glass rings, then settles
    const e = reduced ? 0 : gt.E;
    g.strokeStyle = rgba(tint, Math.min(1, (0.5 + 0.35 * gt.E + 0.35 * gt.flash + 0.2 * Math.min(1, fin)) * a));
    g.lineWidth = (1.3 + 1.2 * gt.E) * U;
    if (e < 0.02) g.stroke(gt.rimPath);
    else {
      const A = 2.3 * U * e, rim = gt.rim, N = rim.length / 4;
      g.beginPath();
      for (let i = 0; i < N; i++) {
        const d = A * Math.sin(i * 0.8 - gt.age * 14);
        const x = rim[4 * i] + rim[4 * i + 2] * d, y = rim[4 * i + 1] + rim[4 * i + 3] * d;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
    g.strokeStyle = rgba('#ffffff', 0.28 * a); g.lineWidth = 1; g.stroke(gt.outerPath);
    void t;
  }
  function drawLeaf(gt, side, phi, frost, t, agit) {
    const a = gt.depthA, b = BLEED;
    leafOutline(gt, side, phi);
    g.save(); g.clip();
    // frosted glass: a blurred view of the pane behind, milky frost and crystals (one cached layer)
    if (frost > 0.01) {
      g.globalAlpha = (0.06 + 0.92 * frost) * a;
      g.drawImage(gt.frosted, gt.ox - b, gt.oy - b, gt.ow + 2 * b, gt.oh + 2 * b);
      // a faint restless shimmer in the crystals that calms as the gates open
      if (!reduced && !lowStim && agit * frost > 0.08) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = agit * frost * 0.07 * (0.5 + 0.5 * Math.sin(t * 1.7 + gt.k * 2 + side)) * a;
        g.drawImage(frostTexture(), gt.ox + 9 * side, gt.oy, gt.ow, gt.ow);
      }
    } else {
      g.globalAlpha = 0.07 * a; g.fillStyle = gt.frostGrad; g.fillRect(gt.x0 - 20, gt.y0 - 20, gt.W + 40, gt.H + 40);
    }
    g.globalCompositeOperation = 'lighter';
    // a slow sheen that brightens as the leaf turns towards the light
    const u = ((t * (reduced ? 0.02 : 0.07) + gt.k * 0.31 + (side > 0 ? 0.12 : 0)) % 1.4) - 0.2;
    const sx = gt.x0 + u * gt.W * 1.4, sy = gt.y0 + gt.H * 0.3;
    const sg = g.createLinearGradient(sx - 30 * U, sy - 18 * U, sx + 30 * U, sy + 18 * U);
    const sa = (0.07 + 0.1 * frost + 0.22 * Math.sin(phi)) * a;
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, rgba('#ffffff', sa)); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 1; g.fillStyle = sg; g.fillRect(gt.x0 - 30, gt.y0 - 30, gt.W + 60, gt.H + 60);
    // an open leaf turns reflective (glass seen at an angle catches the sky)
    const ref = Math.sin(Math.min(phi, 1.3)) * (1 - frost * 0.6);
    if (ref > 0.02) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = ref * 0.8 * a;
      g.fillStyle = gt.leafRefl; g.fillRect(gt.x0 - 30, gt.y0 - 40, gt.W + 60, gt.H + 80);
    }
    g.restore();
    // glass outline (follows the quarter-arch of the leaf)
    leafOutline(gt, side, phi);
    g.strokeStyle = rgba('#ffffff', (0.1 + 0.28 * Math.sin(Math.min(phi, 1.3))) * a); g.lineWidth = 1; g.stroke();
    // etched sunburst (fades with the frost)
    if (frost > 0.05) {
      const ru = gt.rayUV;
      g.strokeStyle = rgba('#ffffff', 0.2 * frost * a); g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < ru.length; i += 2) { proj(gt, side, phi, lerp(1, ru[i], 0.18), lerp(gt.latchY, ru[i + 1], 0.18)); g.moveTo(Q.x, Q.y); proj(gt, side, phi, ru[i], ru[i + 1]); g.lineTo(Q.x, Q.y); }
      g.stroke();
      // an etched inner border
      g.strokeStyle = rgba('#ffffff', 0.12 * frost * a);
      g.beginPath();
      proj(gt, side, phi, 0.12, gt.base - 6 * U); g.moveTo(Q.x, Q.y);
      proj(gt, side, phi, 0.12, gt.acy); g.lineTo(Q.x, Q.y);
      proj(gt, side, phi, 0.88, gt.base - 6 * U); g.moveTo(Q.x, Q.y);
      proj(gt, side, phi, 0.88, gt.oy + gt.r * 0.12); g.lineTo(Q.x, Q.y);
      g.stroke();
    }
    // edges: the hinge is quiet; the free edge catches the light (and quivers while it settles)
    g.save(); g.lineCap = 'round';
    proj(gt, side, phi, 0, gt.base); const hx0 = Q.x, hy0 = Q.y; proj(gt, side, phi, 0, gt.acy);
    g.strokeStyle = rgba('#ffffff', 0.18 * a); g.lineWidth = 1; g.beginPath(); g.moveTo(hx0, hy0); g.lineTo(Q.x, Q.y); g.stroke();
    proj(gt, side, phi, 1, gt.base); const ex0 = Q.x, ey0 = Q.y; proj(gt, side, phi, 1, gt.oy); const ex1 = Q.x, ey1 = Q.y;
    const shim = reduced ? 0 : 0.2 * gt.E * Math.sin(t * 13 + side);
    g.globalCompositeOperation = 'lighter';
    const sp = Math.sin(Math.min(phi, 1.3));
    g.strokeStyle = rgba(tint2, (0.05 + 0.08 * sp + 0.22 * gt.E) * a); g.lineWidth = 5 * U;
    g.beginPath(); g.moveTo(ex0, ey0); g.lineTo(ex1, ey1); g.stroke();
    // the glass edge: a soft line that brightens towards the top, with a glint that slides as it quivers
    const eg = g.createLinearGradient(ex0, ey0, ex1, ey1);
    eg.addColorStop(0, rgba('#ffffff', clamp((0.12 + 0.1 * sp + shim) * a)));
    eg.addColorStop(0.75, rgba('#ffffff', clamp((0.22 + 0.2 * sp + shim) * a)));
    eg.addColorStop(1, rgba('#ffffff', clamp((0.1 + 0.1 * sp) * a)));
    g.strokeStyle = eg; g.lineWidth = 1.1 * U;
    g.beginPath(); g.moveTo(ex0, ey0); g.lineTo(ex1, ey1); g.stroke();
    if (phi > 0.15) glint(g, lerp(ex0, ex1, 0.78 + 0.05 * Math.sin(t * 0.7 + side)), lerp(ey0, ey1, 0.78 + 0.05 * Math.sin(t * 0.7 + side)), 5 * U, '#ffffff', (0.25 + 0.4 * gt.E) * a, 0.4);
    g.restore();
    // the two halves of the latch ride the free edges once open
    if (phi > 0.06) {
      proj(gt, side, phi, 1, gt.latchY);
      glow(g, Q.x, Q.y, 9 * U, tint2, 0.4 * a);
      orb(g, Q.x, Q.y, 2.6 * U, mix(tint, '#ffffff', 0.5), { alpha: a });
    }
  }
  function drawLatch(gt, t, readyFrac) {
    const a = gt.depthA, wx = reduced ? 0 : gt.wob.v * 2.4 * U, dn = smooth(gt.deny);
    const x = gt.latchX + wx, y = gt.latchY, r = (5.2 + 1.2 * SC[gt.k]) * U;
    if (readyFrac >= 0 && gt.ready) {
      // ready: breathing invitation
      const br = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2);
      glow(g, x, y, r * (5 + br * 1.2), tint, 0.4 + 0.25 * br);
      if (!reduced) {
        const hk = (t * 0.45) % 1;
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(tint2, 0.5 * (1 - hk)); g.lineWidth = 1.5 * U;
        g.beginPath(); g.arc(x, y, r * (1.6 + hk * 3.4), 0, TAU); g.stroke(); g.restore();
      }
      orb(g, x, y, r * (1 + br * 0.08), mix(tint, '#ffffff', 0.45));
      glint(g, x - r * 0.3, y - r * 0.35, r * 0.9, '#ffffff', 0.5 + 0.3 * br, t * 0.3);
    } else if (readyFrac >= 0) {
      // sealed until the preceding glass is still: a small ring fills as it settles
      glow(g, x, y, r * (3.2 + 1.4 * dn), tint, 0.22 + 0.3 * dn);
      orb(g, x, y, r * 0.82, mix(tint, dark, 0.35 - 0.25 * dn), { alpha: 0.9 });
      waitRing(g, x, y, r * 2.1, readyFrac, tint2, 0.85);
    } else {
      glow(g, x, y, r * (2.4 + 1.4 * dn), tint, (0.14 + 0.3 * dn) * a);
      orb(g, x, y, r * 0.7, mix(tint, dark, 0.45 - 0.25 * dn), { alpha: 0.75 * a });
    }
  }
  function drawPlaque(t, prog, fin) {
    const { x, y, w, h } = plq, rr = Math.min(12 * U, h / 2);
    g.save();
    if (E.phase === 'law') g.globalAlpha = 0.55;          // the law shows the words now; the threshold rests
    g.fillStyle = 'rgba(0,0,12,0.26)'; roundRect(g, x + 2, y + 4, w, h, rr); g.fill();
    g.fillStyle = plqGrad; roundRect(g, x, y, w, h, rr); g.fill();
    g.strokeStyle = rgba('#ffffff', 0.24); g.lineWidth = 1; g.stroke();
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(tint2, 0.4); g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + rr, y + 1.5); g.lineTo(x + w - rr, y + 1.5); g.stroke();
    const gl = 0.12 + 0.2 * smooth(invLerp(0.67, 1, prog)) + 0.25 * fin;
    glow(g, x + w / 2, y + h / 2, w * 0.55, tint, gl * (0.9 + 0.1 * Math.sin(t * 0.8)));
    g.restore();
    if (E.phase === 'law') return;
    const cl = Math.max(fin, smooth(invLerp(0.7, 1, prog)));
    const mw = w - 22;
    if (cl < 0.99) words.draw(g, x + w / 2, y + h / 2, { style: 'etched', size: fs, maxWidth: mw, lines: plq.lines, alpha: 1 - cl * 0.9, colour: mix('#f2f6ff', tint, 0.12) });
    if (cl > 0.01) words.draw(g, x + w / 2, y + h / 2, { style: 'light', size: fs, maxWidth: mw, lines: plq.lines, alpha: cl, glowColour: tint });
  }
  // finale: a soft light walks from the far calm back through the three open gates to you
  function finFlowK() { return clamp((E.now() - finAt) / 2.2); }
  function finFlowBoost(k, t) {
    const q = 1 - ease.inOutSine(finFlowK());
    const d = (q - k / 3) * 5;
    void t;
    return Math.exp(-d * d);
  }
  function drawFinaleFlow(t, fin) {
    const fk = finFlowK();
    if (fk < 1) {
      const pt = api.pointAt(1 - ease.inOutSine(fk));
      glow(g, pt.x, pt.y, 46 * U, mix(warm, '#ffffff', 0.4), 0.5 * Math.sin(Math.PI * Math.min(1, fk * 1.1 + 0.05)));
      if (!reduced && E.rand() < 0.5) E.particles.emit({ x: pt.x + (E.rand() - 0.5) * 16, y: pt.y + (E.rand() - 0.5) * 16, vy: -14, life: 1.3, size: 5, colour: mix(warm, '#ffffff', 0.5), alpha: 0.6 });
    }
    if (heavy && !lowStim && t - finAt < 3 && E.rand() < 0.25) {
      const gt = gates[Math.floor(E.rand() * 3)];
      E.particles.emit({ x: gt.cx + (E.rand() - 0.5) * gt.ow * 0.7, y: gt.latchY + (E.rand() - 0.3) * gt.oh * 0.4, vy: -18, vx: (E.rand() - 0.5) * 6, life: 2, size: 5, colour: mix(warm, '#ffffff', 0.4), alpha: 0.5 });
    }
    void fin;
  }

  // ---------------------------------------------------------------- input --
  function hitGate(pt) {
    let best = -1, bd = Infinity;
    for (let k = 0; k < 3; k++) {
      const gt = gates[k], m = 16;
      const bottom = k === 0 ? plq.y + plq.h : gt.base + gt.pl;
      const inX = pt.x >= gt.x0 - m && pt.x <= gt.x0 + gt.W + m, inY = pt.y >= gt.y0 - m && pt.y <= bottom + m;
      if (!inX || !inY) continue;
      const d = Math.abs(pt.x - gt.cx) / gt.W + (Math.abs(pt.y - (gt.y0 + gt.H / 2)) / gt.H) * 0.4 + k * 0.02;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  const api = {
    get progress() { return p; },
    get done() { return doneFlag; },
    frame,
    down(pt) {
      if (finAt >= 0 || E.phase !== 'play') return;
      downIds.add(pt.id);
      const k = hitGate(pt);
      if (k < 0) {
        // a touch on the still terrace or the sky: just a small ring and a quiet drop (it never moves the gates)
        const now = E.now();
        if (now - lastRing > 0.15) { lastRing = now; E.ripples.add(pt.x, pt.y, { colour: tint2, speed: 46 * U, alpha: 0.3 }); E.sound('drip', { note: 1, intensity: 0.14 }); E.haptic('tick'); }
        return;
      }
      const gt = gates[k];
      if (gt.opened) { reRing(gt, pt.x, pt.y); return; }
      if (k === nOpened) { tryOpen(k, pt.x, pt.y); return; }
      // a later gate: it rattles softly and the gate whose turn it is glows
      nudge(gt, 0.7);
      gates[nOpened].flash = 1;
      if (E.now() - lastRefuse > 0.22) { lastRefuse = E.now(); E.sound('click', { intensity: 0.14 }); E.haptic('tick'); }
    },
    move() {},
    up(pt) { downIds.delete(pt.id); },
    assist() {
      if (finAt >= 0) return;
      const nx = nOpened;
      if (nx < 3) {
        const pv = nx > 0 ? gates[nx - 1] : null;
        if (pv && !pv.settled) { hush(pv); return; }
        tryOpen(nx, gates[nx].latchX, gates[nx].latchY);
        return;
      }
      let best = null;
      for (const gt of gates) if (!gt.settled && (!best || gt.E > best.E)) best = gt;
      if (best) hush(best);
    },
    pointAt(q) {
      q = clamp(q);
      const seg = Math.min(2, Math.floor(q * 3)), u = q * 3 - seg;
      const A = gates[seg], ax = A.latchX, ay = A.latchY;
      const bx = seg < 2 ? gates[seg + 1].latchX : far.x, by = seg < 2 ? gates[seg + 1].latchY : far.y;
      const mx = (ax + bx) / 2, my = Math.min(ay, by) - 16 * U;
      const v = 1 - u;
      return { x: v * v * ax + 2 * v * u * mx + u * u * bx, y: v * v * ay + 2 * v * u * my + u * u * by };
    },
    hint() {
      if (finAt >= 0 || nOpened >= 3) return null;
      const gt = gates[nOpened];
      // while the preceding glass is still rippling (or the law asks for a pause) the next move is to wait: no ghost tap
      if (!gt.ready) return null;
      return { tap: { x: gt.latchX, y: gt.latchY } };
    },
    twist() {
      if (twistAt >= 0) return;
      twistAt = E.now();
      if (twistKind === 0) placeTwistLights();
      E.sound('glass', { note: 8, intensity: 0.22 });
    },
    finish() {
      if (finAt >= 0) return;
      finAt = E.now();
      if (hum) { try { hum.stop(); } catch { /* ignore */ } hum = null; }
      E.sound(heavy ? 'bloom' : 'shimmer', { intensity: 0.42 });
      if (!heavy && !lowStim) for (const gt of gates) E.particles.burst(gt.cx, gt.y0 + gt.f * 0.5, reduced ? 3 : 6, { speed: 36 * U, colour: tint2, life: 1.4, size: 4.5, kind: 'glint' });
    },
    destroy() { if (hum) { try { hum.stop(); } catch { /* ignore */ } hum = null; } },
  };

  return api;
}
