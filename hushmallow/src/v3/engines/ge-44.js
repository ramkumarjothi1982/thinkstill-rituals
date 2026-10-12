// GE-44 · SILK SCREEN — fabric tension grid (grid tracing).
// A panel of satin silk is stretched between two wooden rollers and laced to
// two side rods. A soft thread grid (warp and weft) runs through it, and the
// silk is restless with slow travelling wrinkles: they warp the print, catch
// the light as satin sheen and mute its colours. A little weaving shuttle
// rests at the start of a route through three soft grid intersections.
//
// Pick the shuttle up and trace the route: a woven thread is laid wherever
// the fingertip passes — bright and straight as it goes in, then relaxing
// behind into a soft, lying line that slips over and under the grid threads
// (each crossing plucks a soft note). Around the line the wrinkles smooth out
// and colour comes back in a widening band. Rush, or stray off the route, and
// you pull the mesh taut: the threads gather towards the finger, a strained
// crease shines, the lacing tightens and the shuttle drags behind on a
// straight thread. Trace slowly and the shuttle glides right under the
// fingertip. Win: the shuttle tucks into the final grid cell and, with the
// finger lifted, that cell settles and stays relaxed.
//
// Photos are silk-screen prints on the fabric (warped with it through
// horizontal slices). They start creased and storm- or mist-toned; each print
// smooths out and softens back to its own colours as the woven line relaxes
// the silk near it. The person's words are embroidered on a satin label woven
// into the silk — rippled while the silk is tense, lying smooth as it relaxes.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, hex, glow, orb, roundRect, wrap, FONT, canvas as makeCanvas, motes, noise2 } from '../fx.js';
import { resample, Wobble } from '../kit.js';

export const meta = {
  id: 'GE-44',
  howTo: 'Pick up the shuttle and trace slowly through the three soft knots.',
  steps: [
    'Touch the little shuttle resting on the silk.',
    'Trace slowly through the three soft knots — rushing pulls the silk taut.',
    'Ease into the glowing last square and lift, so it rests relaxed.',
  ],
  tapAlt: 'each press weaves the thread one soft step along the silk',
  words: 'Your words are embroidered on a satin label woven into the silk — rippled at first, lying smooth and clear as the silk relaxes.',
  photos: {
    where: 'Your photos are printed on the silk itself.',
    becomes: 'soft silk-screen prints',
    touch: 'Your woven line relaxes the fabric around them as it passes;',
    change: 'each print smooths out, its creases settle and its own colours softly return.',
    payoff: 'At the end the whole silk lies smooth and glowing, your prints calm and clear.',
  },
  finaleSec: 4,
};

const C = 6;                                  // cells across the silk
const NOTES = [0, 2, 4, 3, 5, 7, 6, 8, 5, 9]; // a small rising-and-resting pentatonic contour
const GSUB = 4, ESUB = 6, PIECES = 3;          // thread / edge subdivisions per cell; slice pieces
// Threads woven in earlier Keep-playing rounds of this run (memory only; cleared when a ritual starts).
const TAPESTRY = new Map();
const lum = (h) => { const [r, gg, b] = hex(h); return (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255; };

/** Centripetal Catmull-Rom through P (seg samples per span). */
function catmull(P, seg) {
  const a0 = P[0], a1 = P[1], z0 = P[P.length - 1], z1 = P[P.length - 2];
  const ext = [[2 * a0[0] - a1[0], 2 * a0[1] - a1[1]], ...P, [2 * z0[0] - z1[0], 2 * z0[1] - z1[1]]];
  const tj = (a, b) => Math.max(1e-3, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  const out = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    const t0 = 0, t1 = t0 + tj(p0, p1), t2 = t1 + tj(p1, p2), t3 = t2 + tj(p2, p3);
    for (let k = i === 1 ? 0 : 1; k <= seg; k++) {
      const t = lerp(t1, t2, k / seg), pt = [0, 0];
      for (let d = 0; d < 2; d++) {
        const q1 = ((t1 - t) * p0[d] + (t - t0) * p1[d]) / (t1 - t0);
        const q2 = ((t2 - t) * p1[d] + (t - t1) * p2[d]) / (t2 - t1);
        const q3 = ((t3 - t) * p2[d] + (t - t2) * p3[d]) / (t3 - t2);
        const b1 = ((t2 - t) * q1 + (t - t0) * q2) / (t2 - t0);
        const b2 = ((t3 - t) * q2 + (t - t1) * q3) / (t3 - t1);
        pt[d] = ((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1);
      }
      out.push(pt);
    }
  }
  return out;
}

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = E.reduced, lowStim = E.lowStim, heavy = E.heavy;
  const n = photos.n;
  const R1 = E.round === 1;
  const ritualKey = E.seed - (E.round - 1) * 1013;
  if (R1) TAPESTRY.delete(ritualKey);
  const past = (TAPESTRY.get(ritualKey) || []).slice(-4);
  let routeCtrl = [];
  const D = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
  const spd = (reduced ? 0.32 : 1) * (heavy ? 0.62 : 1) * (1 - E.calm * 0.3);   // ambient motion speed

  // ------------------------------------------------------------ palette --
  // a rich satin in the realm's own hues (dark enough that prints and threads read in every realm)
  const ink = pal.ink || pal.deep;
  const tint = R1 || E.rand() < 0.55 ? pal.accent : pal.glow;
  let silk = mix(ink, tint, R1 ? 0.3 : lerp(0.24, 0.38, E.rand()));
  silk = mix(silk, mix(ink, pal.glow, 0.3), E.calm * 0.45);     // later loop rounds: softer
  if (lum(silk) > 0.34) silk = mix(silk, ink, 0.45);
  if (lum(silk) < 0.05) silk = mix(silk, pal.glow, 0.12);
  const glowC = pal.glow, warm = pal.warm || '#ffb37a';
  const threadCol = mix(glowC, '#ffffff', 0.55);
  const wovenCol = mix(warm, '#fff1d6', 0.38);
  const knotCol = mix(glowC, '#ffffff', 0.25);
  const SHEEN = hex(mix(glowC, '#ffffff', 0.62)), SHADE = hex(mix(ink, '#000000', 0.55));
  const agTone = heavy ? 'mist' : 'storm';
  const rollBase = mix('#6e4529', warm, 0.22);

  // -------------------------------------------------------------- waves --
  // three travelling wrinkle waves (Gerstner-like: they warp the weave and light the satin)
  const W_ANG = [0.62, 1.05, 0.38], W_LAM = [160, 88, 46], W_OM = [0.5, -0.34, 0.78], W_SA = [0.22, 0.34, 0.62], W_Q = [1, 0.6, 0.24];
  const F3 = () => new Float32Array(3);
  const wang = F3(), wlam = F3(), wph = F3(), wkx = F3(), wky = F3(), wnx = F3(), wny = F3(), wsa = F3();
  for (let j = 0; j < 3; j++) {
    wang[j] = W_ANG[j] + (R1 ? 0 : (E.rand() - 0.5) * 0.7);
    wlam[j] = W_LAM[j] * (R1 ? 1 : 0.85 + E.rand() * 0.3);
    wph[j] = R1 ? j * 1.7 : E.rand() * TAU;
  }
  const LX = -0.55, LY = -0.83;               // light from the top left
  const nz = noise2(E.seed * 7 + 44);          // slow patches where the creases gather
  const amp = (heavy ? 0.92 : 1.06) * (1 - E.calm * 0.65), AMB = 0.13;
  function waves() {
    for (let j = 0; j < 3; j++) {
      const k = TAU / (wlam[j] * stage.s);
      wnx[j] = Math.cos(wang[j]); wny[j] = Math.sin(wang[j]); wkx[j] = wnx[j] * k; wky[j] = wny[j] * k;
      const nl = wnx[j] * LX + wny[j] * LY;
      wsa[j] = W_SA[j] * Math.sqrt(W_LAM[0] / W_LAM[j]) * (0.45 + 0.55 * Math.abs(nl)) * (nl < 0 ? -1 : 1);
    }
  }

  // ----------------------------------------------------------- geometry --
  let cell = 40, R = 6, sx0 = 0, sy0 = 0, sw = 1, sh = 1, rollR = 8, rodGap = 18, tol = 40, sliceH = 5, BANK = 12;
  let pts = [], cum = null, nrmX = null, nrmY = null, angA = null, gapAt = null, layT = null, WX = null, WY = null, NS = 0, L = 1;
  let K = [[1, 1], [2, 2], [3, 3]], sK = [0, 0, 0], fcx = 0, fcy = 0, cross = [];
  let mdx = null, mdy = null, mvx = null, mvy = null, FX = 1, FY = 1, rlx = null, rlxT = null;
  let SWm = 44, SHm = 40, sheenC = null, sheenG = null, sheenImg = null, desatC = null, desatG = null, desatImg = null, desatMax = 1;
  let T = null, gT = null, baseC = null, weaveC = null, shadowC = null, shadowX = 0, shadowY = 0;
  let prints = [];
  let gradRollT = null, gradRollB = null, gradRodL = null, gradRodR = null, gradShuttle = null;
  let GV = null, GH = null, EL = null, ER = null;
  const SDX = new Float32Array(PIECES + 1), SDY = new Float32Array(PIECES + 1);
  const FCX = new Float32Array(4), FCY = new Float32Array(4);
  let tokC = null, wLines = [], wOff = [], wFont = '', wSize = 14, wCX = new Float32Array(1), wCY = new Float32Array(1);
  const W_FILL = ['rgba(4,2,16,0.8)', mix('#fff7ec', glowC, 0.1), 'rgba(255,255,255,0.32)'], W_OX = [0.8, 0, -0.35], W_OY = [1.3, 0, -0.55];
  // round 1 uses the canonical route; loop rounds weave a fresh one
  const pv = R1 ? { a: 0, b: 0, c: 0.5, j: 0.5, m: false } : { a: E.rand(), b: E.rand(), c: E.rand(), j: E.rand(), m: E.rand() < 0.5 };

  // ---------------------------------------------------------- play state --
  let wanted = 0, headS = 0, shownS = 0, vS = 0, assistTo = null, glideTo = null;
  let tracer = null, fingerS = 0, fingerOff = 0, fingerValid = false, lastFingerS = 0, speed = 0;
  let taut = 0, tw = 0, laidIdx = 0, crossIdx = 0, laceT = 0.3, relaxMean = 0;
  let traced = false, doneFlag = false, cellT = 0, rest = 0, assistRelax = false;
  let finAt = -1, twistAt = -1, billowAt = -9, billowF = 0, billowA = 0;
  let lastHap = -9, lastThrum = -9, lastWait = -9, lastSwish = -9, tautWarned = false, liftHinted = false;
  const knotAt = [-1, -1, -1], finKnot = [false, false, false];
  const wob = new Wobble();
  const touches = [];
  let SHX = 0, SHY = 0, SHA = 0;
  const twistKind = E.round % 2 ? 'lights' : 'blossom';
  let twistCX = 0, twistCY = 0;
  let projS = 0, projD = 0, RX0 = 0, RY0 = 0, DXo = 0, DYo = 0;

  // ---------------------------------------------------------------- fit --
  function fit() {
    const s = stage.s;
    const keepFrac = L > 1 ? headS / L : 0;
    const oldR = R, oldPrints = prints, first = !cum;
    rollR = 7 * s + 2.5; rodGap = 14 * s + 5;
    const availW = stage.w - 2 * (rodGap + 7), availH = stage.h - 2 * (rollR * 2 + 4) - 6;
    cell = availW / C; R = Math.floor(availH / cell);
    if (R < 4) { R = 4; cell = Math.min(cell, availH / 4); }
    if (R > 9) R = 9;
    sw = cell * C; sh = cell * R; sx0 = stage.cx - sw / 2; sy0 = stage.cy - sh / 2;
    tol = Math.max(40, cell * 0.8); sliceH = Math.max(4, 5 * s);
    waves();
    buildMesh(); buildField(first || R !== oldR); buildPath(); buildPrints(oldPrints); buildMaps(); buildTextures(); buildStatic(); measureWords(true);
    if (keepFrac > 0) {
      wanted = headS = shownS = keepFrac * L; laidIdx = 0;
      while (laidIdx < NS && cum[laidIdx] <= headS) { layT[laidIdx] = -100; laidIdx++; }
      crossIdx = 0; while (crossIdx < cross.length && cross[crossIdx].s <= headS) crossIdx++;
    }
  }

  function buildMesh() {
    const NN = (C + 1) * (R + 1);
    if (!mdx || mdx.length !== NN) { mdx = new Float32Array(NN); mdy = new Float32Array(NN); mvx = new Float32Array(NN); mvy = new Float32Array(NN); }
    GV = new Float32Array((C - 1) * (R * GSUB + 1) * 2); GH = new Float32Array((R - 1) * (C * GSUB + 1) * 2);
    EL = new Float32Array((R * ESUB + 1) * 2); ER = new Float32Array((R * ESUB + 1) * 2);
  }
  function buildField(reset) {
    FX = 2 * C + 1; FY = 2 * R + 1;
    if (reset || !rlx || rlx.length !== FX * FY) { rlx = new Float32Array(FX * FY).fill(E.calm * 0.5); rlxT = new Float32Array(FX * FY); }
  }

  let printBox = [0.36, 0.34, C - 0.36, 6];  // where the prints sit (grid units), set with the route
  function buildPath() {
    const Rw = R - 1;                    // the bottom row carries the woven label
    let k1, k2, k3, way = [], s0, F;
    const mir = (q) => { if (pv.m) q[0] = C - q[0]; return q; };
    if (!n && Rw >= 5) {
      // no photos: a zigzag right across the printed moon
      const x1 = pv.a < 0.5 ? 1 : 2, x2 = pv.b < 0.5 ? C - 1 : C - 2, x3 = pv.c < 0.34 ? 1 : pv.c < 0.67 ? 2 : 3;
      const y1 = 1, y3 = Rw - 2;
      const y2 = clamp(Math.round((y1 + y3) / 2 + (pv.j < 0.33 ? -0.6 : pv.j > 0.66 ? 0.6 : 0)), y1 + 1, y3 - 1);
      k1 = mir([x1, y1]); k2 = mir([x2, y2]); k3 = mir([x3, y3]);
      printBox = [0.36, 0.34, C - 0.36, Rw - 0.18];
    } else if (Rw >= 5) {
      // photos: the thread frames the prints — down one side, along the foot, up the other — never across a face
      const ya = clamp(pv.a < 0.5 ? 2 : pv.a < 0.8 ? 3 : 1, 1, Rw - 3), yb = clamp(pv.c < 0.6 ? 2 : pv.c < 0.85 ? 1 : 3, 1, Rw - 3);
      const xm = pv.b < 0.34 ? 3 : pv.b < 0.67 ? 2 : 4, yf = Rw - 1;
      k1 = mir([1, ya]); k2 = mir([xm, yf]); k3 = mir([C - 1, yb]);
      way = [mir([1.12, yf - 0.55]), mir([C - 1.12, yf - 0.55])];
      printBox = [1.32, 0.3, C - 1.32, yf - 0.42];
      s0 = mir([1, Math.max(0.42, ya - 1.25)]);
      F = mir([C - 0.5, yb - 0.5]);
    } else if (!n) {
      const hi = Rw - 1, ya = pv.a < 0.5 ? hi : 1, yb = ya === hi ? 1 : hi;
      k1 = mir([1, ya]); k2 = mir([3, yb]); k3 = mir([C - 1, ya]);
      printBox = [0.36, 0.3, C - 0.36, Rw - 0.15];
    } else {
      // small screens with photos: a gentle wave along the foot of the prints
      const y = Rw - 1;
      k1 = mir([1, y]); k2 = mir([3, y]); k3 = mir([C - 1, y]);
      way = [mir([2, y + 0.38]), mir([4, y + 0.38])];
      printBox = [0.36, 0.28, C - 0.36, y - 0.42];
      s0 = mir([0.42, y - 0.3]);
      F = mir([C - 0.5, y + 0.5]);
    }
    K = [k1, k2, k3];
    if (!s0) {
      let bx = k1[0] - k2[0], by = k1[1] - k2[1]; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
      s0 = [clamp(k1[0] + bx * 0.72, 0.35, C - 0.35), clamp(k1[1] + by * 0.72, 0.35, Rw - 0.35)];
    }
    if (!F) { const fxs = Math.sign(k3[0] - k2[0]) || 1, fys = Math.sign(k3[1] - k2[1]) || 1; F = [k3[0] + fxs * 0.5, k3[1] + fys * 0.5]; }
    fcx = clamp(Math.floor(F[0]), 0, C - 1); fcy = clamp(Math.floor(F[1]), 0, Rw - 1);
    const ctrl = way.length ? [s0, k1, way[0], k2, way[1], k3, F] : [s0, k1, k2, k3, F];
    routeCtrl = ctrl.map((q) => [q[0], q[1]]);
    const P = ctrl.map(([x, y]) => [sx0 + x * cell, sy0 + y * cell]);
    const dense = catmull(P, 30);
    for (const q of dense) {
      q[0] = clamp(q[0], sx0 + cell * 0.22, sx0 + sw - cell * 0.22);
      q[1] = clamp(q[1], sy0 + cell * 0.22, sy0 + Rw * cell - cell * 0.15);
    }
    pts = resample(dense, 3);
    NS = pts.length;
    cum = new Float32Array(NS); nrmX = new Float32Array(NS); nrmY = new Float32Array(NS); angA = new Float32Array(NS);
    for (let i = 1; i < NS; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    L = cum[NS - 1] || 1;
    for (let i = 0; i < NS; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(NS - 1, i + 1)];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      angA[i] = ang; nrmX[i] = -Math.sin(ang); nrmY[i] = Math.cos(ang);
    }
    sK = K.map(([x, y]) => nearestS(sx0 + x * cell, sy0 + y * cell));
    BANK = Math.max(10, L * 0.026);
    // where the woven line crosses the grid threads: alternate over / under
    cross = [];
    for (let i = 1; i < NS; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1], bx2 = pts[i][0], by2 = pts[i][1], ds = cum[i] - cum[i - 1];
      for (let c = 1; c < C; c++) { const X = sx0 + c * cell; if ((ax < X) !== (bx2 < X)) { const u = (X - ax) / (bx2 - ax); cross.push({ s: cum[i - 1] + u * ds, v: true, under: false }); } }
      for (let r = 1; r < R; r++) { const Y = sy0 + r * cell; if ((ay < Y) !== (by2 < Y)) { const u = (Y - ay) / (by2 - ay); cross.push({ s: cum[i - 1] + u * ds, v: false, under: false }); } }
    }
    cross.sort((a, b) => a.s - b.s);
    const nearKnot = (sv) => sK.some((k) => Math.abs(k - sv) < 10 * stage.s) || sv < 8 || sv > L - 8;
    cross.forEach((c, i) => { c.under = i % 2 === 1 && !nearKnot(c.s); });
    gapAt = new Uint8Array(NS);
    for (const c of cross) if (c.under) { for (let i = 0; i < NS; i++) if (Math.abs(cum[i] - c.s) < 3.6 * stage.s) gapAt[i] = 1; }
    layT = new Float32Array(NS).fill(-1e9); WX = new Float32Array(NS); WY = new Float32Array(NS);
    laidIdx = 0; crossIdx = 0;
  }
  function nearestS(x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < NS; i++) { const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2; if (d < bd) { bd = d; best = i; } }
    return cum[best];
  }

  function buildPrints(old) {
    prints = [];
    if (!n) return;
    const ax = sx0 + printBox[0] * cell, ay = sy0 + printBox[1] * cell, aw = (printBox[2] - printBox[0]) * cell, ah = (printBox[3] - printBox[1]) * cell;
    const mk = (k, x, y, bw, bh, shape) => {
      const ph = (k + E.round - 1) % n, a = photos.size(ph, shape, 100);
      return { ph, x, y, size: 100 * Math.min(bw / a.w, bh / a.h), shape, s: nearestS(x, y), relax: old?.[k]?.relax ?? E.calm * 0.6, painted: -1, cp: old?.[k]?.cp ?? false };
    };
    if (n === 1) { prints.push(mk(0, ax + aw / 2, ay + ah / 2, aw * 0.98, ah * 0.98, 'natural')); return; }
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols), cw = aw / cols, ch = ah / rows, sc = Math.min(cw, ch * 1.12) - (cols * rows - n) * 5;
      if (!best || sc > best.sc) best = { cols, rows, cw, ch, sc };
    }
    const { cols, rows, cw, ch } = best, gap = 7 * stage.s;
    for (let k = 0; k < n; k++) {
      const r = Math.floor(k / cols), c = k % cols, inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      prints.push(mk(k, ax + (c + 0.5 + (cols - inRow) / 2) * cw, ay + (r + 0.5) * ch, cw - gap, ch - gap, 'card'));
    }
  }

  function buildMaps() {
    SWm = 64; SHm = Math.max(12, Math.round(SWm * sh / sw));
    if (!sheenC || sheenC.width !== SWm || sheenC.height !== SHm) {
      sheenC = makeCanvas(SWm, SHm); sheenG = sheenC.getContext('2d'); sheenImg = sheenG.createImageData(SWm, SHm);
      desatC = makeCanvas(SWm, SHm); desatG = desatC.getContext('2d'); desatImg = desatG.createImageData(SWm, SHm);
    }
  }

  // ----------------------------------------------------------- textures --
  function buildTextures() {
    const Wp = Math.max(2, Math.ceil(sw * D)), Hp = Math.max(2, Math.ceil(sh * D));
    if (!T || T.width !== Wp || T.height !== Hp) { T = makeCanvas(Wp, Hp); gT = T.getContext('2d'); baseC = makeCanvas(Wp, Hp); weaveC = makeCanvas(Wp, Hp); }
    paintBase(); paintWeave(); paintTexture();
  }
  function paintBase() {
    const b = baseC.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, baseC.width, baseC.height);
    b.setTransform(D, 0, 0, D, 0, 0);
    // satin body: shadowed where it wraps the rollers
    const vg = b.createLinearGradient(0, 0, 0, sh);
    vg.addColorStop(0, mix(silk, '#000000', 0.5)); vg.addColorStop(0.05, mix(silk, glowC, 0.16)); vg.addColorStop(0.45, silk);
    vg.addColorStop(0.93, mix(silk, '#000000', 0.18)); vg.addColorStop(1, mix(silk, '#000000', 0.5));
    b.fillStyle = vg; b.fillRect(0, 0, sw, sh);
    const rg = b.createRadialGradient(sw * 0.38, sh * 0.3, 0, sw * 0.38, sh * 0.3, Math.max(sw, sh) * 0.78);
    rg.addColorStop(0, rgba(mix(silk, glowC, 0.5), 0.34)); rg.addColorStop(1, rgba(silk, 0));
    b.fillStyle = rg; b.fillRect(0, 0, sw, sh);
    const hg = b.createLinearGradient(0, 0, sw, 0);
    hg.addColorStop(0, 'rgba(0,0,10,0.34)'); hg.addColorStop(0.08, 'rgba(0,0,10,0)'); hg.addColorStop(0.92, 'rgba(0,0,10,0)'); hg.addColorStop(1, 'rgba(0,0,10,0.34)');
    b.fillStyle = hg; b.fillRect(0, 0, sw, sh);
    seigaiha(b);
    if (!n) motif(b);
    pastThreads(b);
    labelBand(b);
  }
  function pastThreads(b) {
    // every round you've finished leaves its thread embroidered in the silk: the tapestry grows as you play
    const list = past.filter((h) => h.R === R);
    list.forEach((h, i) => {
      const a = 0.5 + 0.5 * ((i + 1) / list.length), P = catmull(h.ctrl.map(([x, y]) => [x * cell, y * cell]), 24);
      b.save(); b.lineCap = 'round'; b.lineJoin = 'round';
      const path = () => { b.beginPath(); P.forEach(([x, y], k) => (k ? b.lineTo(x, y) : b.moveTo(x, y))); };
      path(); b.strokeStyle = rgba(wovenCol, 0.09 * a); b.lineWidth = 7 * stage.s; b.stroke();
      b.setLineDash([7 * stage.s, 4 * stage.s]);
      b.translate(0.6, 1); path(); b.strokeStyle = rgba('#05020f', 0.35 * a); b.lineWidth = 2 * stage.s; b.stroke();
      b.translate(-0.6, -1); path(); b.strokeStyle = rgba(wovenCol, 0.5 * a); b.lineWidth = 1.6 * stage.s; b.stroke();
      b.setLineDash([]);
      for (const k of h.knots) { const x = k[0] * cell, y = k[1] * cell; b.fillStyle = rgba(wovenCol, 0.55 * a); b.beginPath(); b.arc(x, y, 2.6 * stage.s, 0, TAU); b.fill(); }
      b.restore();
    });
  }
  function seigaiha(b) {
    // the classic wave-scale damask, woven faintly into the satin
    const rad = cell * 0.4, lay = makeCanvas(baseC.width, baseC.height), lg = lay.getContext('2d');
    lg.setTransform(D, 0, 0, D, 0, 0); lg.lineWidth = 0.9; lg.strokeStyle = mix(silk, glowC, 0.6);
    for (let row = 0, y = -rad * 0.5; y < sh + rad; row++, y += rad * 0.5) {
      for (let x = (row % 2 ? 0 : rad) - rad; x < sw + rad * 2; x += rad * 2) {
        lg.globalCompositeOperation = 'destination-out'; lg.beginPath(); lg.arc(x, y, rad, 0, TAU); lg.fill();
        lg.globalCompositeOperation = 'source-over'; lg.beginPath();
        for (let q = 1; q <= 3; q++) { const r = (rad * q) / 3.2; lg.moveTo(x + r, y); lg.arc(x, y, r, 0, TAU); }
        lg.stroke();
      }
    }
    b.save(); b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 0.14; b.drawImage(lay, 0, 0); b.restore();
  }
  function motif(b) {
    // no photos: a printed moon with screen-print ripple lines and a few printed stars
    const mx = sw * 0.5, my = (R - 1) * cell * 0.47, mr = Math.min(sw * 0.34, (R - 1) * cell * 0.33);
    const hg = b.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 1.7);
    hg.addColorStop(0, rgba(glowC, 0.24)); hg.addColorStop(1, rgba(glowC, 0));
    b.fillStyle = hg; b.fillRect(0, 0, sw, sh);
    const dg = b.createRadialGradient(mx - mr * 0.3, my - mr * 0.35, mr * 0.05, mx, my, mr);
    dg.addColorStop(0, mix(glowC, '#ffffff', 0.72)); dg.addColorStop(0.5, mix(glowC, '#ffffff', 0.25));
    dg.addColorStop(0.86, mix(glowC, pal.accent, 0.5)); dg.addColorStop(1, mix(pal.accent, silk, 0.35));
    b.globalAlpha = 0.92; b.fillStyle = dg; b.beginPath(); b.arc(mx, my, mr, 0, TAU); b.fill(); b.globalAlpha = 1;
    b.save(); b.beginPath(); b.arc(mx, my, mr, 0, TAU); b.clip();
    b.strokeStyle = rgba(mix(pal.accent, silk, 0.25), 0.34); b.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      b.beginPath();
      for (let q = 0; q <= 40; q++) { const x = mx - mr + (q / 40) * mr * 2, y = my + mr * (-0.2 + i * 0.15) + Math.sin(x * 0.07 + i * 1.3) * mr * 0.035; q ? b.lineTo(x, y) : b.moveTo(x, y); }
      b.stroke();
    }
    b.restore();
    b.strokeStyle = rgba(mix(glowC, '#ffffff', 0.4), 0.5); b.lineWidth = 1.2;
    b.beginPath(); b.arc(mx, my, mr * 1.14, -2.4, -0.7); b.stroke();
    b.beginPath(); b.arc(mx, my, mr * 1.26, 0.6, 2.0); b.stroke();
    let sd = (E.seed * 9301 + 49297) % 233280;
    const r01 = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    for (let i = 0; i < 18; i++) {
      const x = sw * (0.08 + 0.84 * r01()), y = (R - 1) * cell * (0.06 + 0.88 * r01());
      if (Math.hypot(x - mx, y - my) < mr * 1.1) continue;
      const rr = (1 + r01() * 1.8) * stage.s;
      b.fillStyle = rgba(mix(glowC, '#ffffff', 0.5), 0.35 + r01() * 0.35);
      b.beginPath(); b.moveTo(x, y - rr * 2.2); b.lineTo(x + rr * 0.5, y - rr * 0.5); b.lineTo(x + rr * 2.2, y); b.lineTo(x + rr * 0.5, y + rr * 0.5);
      b.lineTo(x, y + rr * 2.2); b.lineTo(x - rr * 0.5, y + rr * 0.5); b.lineTo(x - rr * 2.2, y); b.lineTo(x - rr * 0.5, y - rr * 0.5); b.closePath(); b.fill();
    }
  }
  function labelBand(b) {
    // the satin label (woven into the bottom row) that carries the person's words
    const ly0 = (R - 1) * cell + cell * 0.11, lh = cell * 0.78, lx0 = cell * 0.26, lw = sw - cell * 0.52, rr = Math.min(10, lh * 0.3);
    const lg = b.createLinearGradient(0, ly0, 0, ly0 + lh);
    lg.addColorStop(0, rgba(mix(silk, '#ffffff', 0.16), 0.95)); lg.addColorStop(0.18, rgba(mix(silk, ink, 0.35), 0.95));
    lg.addColorStop(0.8, rgba(mix(silk, ink, 0.55), 0.95)); lg.addColorStop(1, rgba(mix(silk, '#000000', 0.45), 0.95));
    b.fillStyle = lg; roundRect(b, lx0, ly0, lw, lh, rr); b.fill();
    b.strokeStyle = 'rgba(0,0,10,0.35)'; b.lineWidth = 1; b.stroke();
    b.setLineDash([4, 3]); b.strokeStyle = rgba(threadCol, 0.42); b.lineWidth = 1;
    roundRect(b, lx0 + 3.5, ly0 + 3.5, lw - 7, lh - 7, Math.max(2, rr - 3)); b.stroke(); b.setLineDash([]);
  }
  function paintWeave() {
    const w = weaveC.getContext('2d');
    w.setTransform(1, 0, 0, 1, 0, 0); w.clearRect(0, 0, weaveC.width, weaveC.height); w.setTransform(D, 0, 0, D, 0, 0);
    const st = 2.4; w.lineWidth = 0.55;
    w.beginPath(); for (let x = st * 0.5; x < sw; x += st) { w.moveTo(x, 0); w.lineTo(x, sh); } w.strokeStyle = 'rgba(255,255,255,0.05)'; w.stroke();
    w.beginPath(); for (let y = st * 0.5; y < sh; y += st) { w.moveTo(0, y); w.lineTo(sw, y); } w.strokeStyle = 'rgba(0,0,12,0.07)'; w.stroke();
  }
  function paintTexture() {
    gT.setTransform(1, 0, 0, 1, 0, 0); gT.globalAlpha = 1; gT.globalCompositeOperation = 'source-over';
    gT.clearRect(0, 0, T.width, T.height); gT.drawImage(baseC, 0, 0);
    gT.setTransform(D, 0, 0, D, 0, 0);
    for (const pr of prints) {
      const r = pr.relax;
      photos.draw(gT, pr.ph, pr.x - sx0, pr.y - sy0, pr.size, { shape: pr.shape, tone: agTone, toneMix: (1 - r) * 0.82, blur: (1 - r) * 0.3, glow: 0.1 + 0.3 * r, glowColour: glowC, shadow: false, alpha: 0.97 });
      pr.painted = r;
    }
    gT.setTransform(1, 0, 0, 1, 0, 0); gT.drawImage(weaveC, 0, 0);
  }

  function buildStatic() {
    const s = stage.s, pad = 34 * s;
    const fw = sw + 2 * rodGap + 24 * s, fh = sh + 4 * rollR;
    shadowX = sx0 - rodGap - 12 * s - pad; shadowY = sy0 - 2 * rollR - pad;
    const W = Math.ceil((fw + 2 * pad) * D), H = Math.ceil((fh + 2 * pad) * D);
    if (!shadowC || shadowC.width !== W || shadowC.height !== H) shadowC = makeCanvas(W, H);
    const c = shadowC.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.shadowColor = 'rgba(0,0,14,0.62)'; c.shadowBlur = 20 * s * D; c.shadowOffsetX = 10000; c.shadowOffsetY = 9 * s * D;
    c.fillStyle = '#000'; roundRect(c, pad * D - 10000, pad * D, fw * D, fh * D, 12 * s * D); c.fill();
    const rollGrad = (y) => {
      const gr = g.createLinearGradient(0, y - rollR, 0, y + rollR);
      gr.addColorStop(0, mix(rollBase, '#000000', 0.55)); gr.addColorStop(0.24, mix(rollBase, '#fff4e0', 0.5)); gr.addColorStop(0.46, rollBase);
      gr.addColorStop(0.82, mix(rollBase, '#000000', 0.35)); gr.addColorStop(1, mix(rollBase, '#000000', 0.62));
      return gr;
    };
    gradRollT = rollGrad(sy0 - rollR * 0.62); gradRollB = rollGrad(sy0 + sh + rollR * 0.62);
    const rw = 3.4 * s + 0.6;
    const rodGrad = (x) => {
      const gr = g.createLinearGradient(x - rw / 2, 0, x + rw / 2, 0);
      gr.addColorStop(0, mix(rollBase, '#000000', 0.5)); gr.addColorStop(0.4, mix(rollBase, '#fff4e0', 0.55)); gr.addColorStop(1, mix(rollBase, '#000000', 0.5));
      return gr;
    };
    gradRodL = rodGrad(sx0 - rodGap); gradRodR = rodGrad(sx0 + sw + rodGap);
    const wid = 10.5 * s + 3;
    gradShuttle = g.createLinearGradient(0, -wid / 2, 0, wid / 2);
    gradShuttle.addColorStop(0, '#fff3dc'); gradShuttle.addColorStop(0.3, mix('#d9a066', warm, 0.25)); gradShuttle.addColorStop(0.7, '#9a5f33'); gradShuttle.addColorStop(1, '#4e2a14');
  }

  // ------------------------------------------------------------- fields --
  function relaxAt(x, y) {
    const gx = clamp((x - sx0) / (cell * 0.5), 0, FX - 1.0001), gy = clamp((y - sy0) / (cell * 0.5), 0, FY - 1.0001);
    const i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, k = j * FX + i;
    return (rlx[k] * (1 - fx) + rlx[k + 1] * fx) * (1 - fy) + (rlx[k + FX] * (1 - fx) + rlx[k + FX + 1] * fx) * fy;
  }
  function envAt(u, v) {
    const ev = smooth(clamp(v / 0.1)) * smooth(clamp((1 - v) / 0.1));
    return ev * (0.45 + 0.55 * smooth(clamp(u / 0.12)) * smooth(clamp((1 - u) / 0.12)));
  }
  /** How wrinkled the silk is at (x, y): tension that hasn't relaxed yet, in drifting patches. */
  function wrinkleAt(x, y, r) {
    const q = 0.0105 / stage.s, m = 0.62 + 0.38 * nz(x * q + tw * 0.035, y * q - tw * 0.025);
    return amp * (1 - r) * m + AMB;
  }
  /** Displacement of the silk at rest point (x, y) → DXo, DYo (wrinkles + mesh pull + billow). */
  function disp(x, y) {
    const u = (x - sx0) / sw, v = (y - sy0) / sh;
    const A = envAt(u, v) * wrinkleAt(x, y, relaxAt(x, y)) * 2.8 * stage.s;
    let dx = 0, dy = 0;
    for (let j = 0; j < 3; j++) { const c = Math.cos(wkx[j] * x + wky[j] * y + W_OM[j] * tw + wph[j]) * W_Q[j]; dx += c * wnx[j]; dy += c * wny[j]; }
    dx *= A; dy *= A;
    if (billowA > 0.001) { const e = Math.exp(-((u - billowF) ** 2) / 0.02) * billowA * envAt(u, v) * stage.s; dx += e * 3.2; dy -= e * 1.6; }
    const gx = clamp((x - sx0) / cell, 0, C - 1e-4), gy = clamp((y - sy0) / cell, 0, R - 1e-4);
    const i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, k0 = j * (C + 1) + i, k2 = k0 + C + 1;
    DXo = dx + (mdx[k0] * (1 - fx) + mdx[k0 + 1] * fx) * (1 - fy) + (mdx[k2] * (1 - fx) + mdx[k2 + 1] * fx) * fy;
    DYo = dy + (mdy[k0] * (1 - fx) + mdy[k0 + 1] * fx) * (1 - fy) + (mdy[k2] * (1 - fx) + mdy[k2 + 1] * fx) * fy;
  }
  function relaxBump(x, y, radCells = 1.55) {
    const half = cell * 0.5, rb = (cell * radCells) / half, gx = (x - sx0) / half, gy = (y - sy0) / half;
    const i0 = Math.max(0, Math.floor(gx - rb)), i1 = Math.min(FX - 1, Math.ceil(gx + rb)), j0 = Math.max(0, Math.floor(gy - rb)), j1 = Math.min(FY - 1, Math.ceil(gy + rb));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i - gx, j - gy) / rb;
      if (d < 1) { const k = j * FX + i, v = smooth(1 - d); if (v > rlxT[k]) rlxT[k] = v; }
    }
  }
  function tenseNear(x, y, a) {
    const half = cell * 0.5, rb = (cell * 1.7) / half, gx = (x - sx0) / half, gy = (y - sy0) / half;
    const i0 = Math.max(0, Math.floor(gx - rb)), i1 = Math.min(FX - 1, Math.ceil(gx + rb)), j0 = Math.max(0, Math.floor(gy - rb)), j1 = Math.min(FY - 1, Math.ceil(gy + rb));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i - gx, j - gy) / rb;
      if (d < 1) { const k = j * FX + i; rlx[k] = Math.max(0, rlx[k] - a * (1 - d)); }
    }
  }

  // path helpers
  function idxAt(sv) { let lo = 0, hi = NS - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < sv) lo = m + 1; else hi = m; } return lo; }
  function restAt(sv) {
    sv = clamp(sv, 0, L);
    const k = Math.max(1, idxAt(sv)), a = cum[k - 1], b = cum[k], u = b > a ? (sv - a) / (b - a) : 0;
    RX0 = lerp(pts[k - 1][0], pts[k][0], u); RY0 = lerp(pts[k - 1][1], pts[k][1], u);
    return k;
  }
  function pointAtS(sv) { restAt(sv); disp(RX0, RY0); return { x: RX0 + DXo, y: RY0 + DYo }; }
  function project(x, y, s0, s1) {
    const k0 = idxAt(Math.max(0, s0)), k1 = idxAt(Math.min(L, s1));
    let best = k0, bd = Infinity;
    for (let k = k0; k <= k1; k++) { const d = (pts[k][0] - x) ** 2 + (pts[k][1] - y) ** 2; if (d < bd) { bd = d; best = k; } }
    projS = cum[best]; projD = Math.sqrt(bd);
  }

  // ----------------------------------------------------------- feedback --
  function haptic(kind, gap = 0.09) { const t = E.now(); if (t - lastHap < gap) return; lastHap = t; E.haptic(kind); }
  function layUpTo(sv, t) {
    while (laidIdx < NS && cum[laidIdx] <= sv + 0.01) { layT[laidIdx] = t; relaxBump(pts[laidIdx][0], pts[laidIdx][1]); laidIdx++; }
    while (crossIdx < cross.length && cross[crossIdx].s <= sv) {
      // the woven thread passes over / under a grid thread: a soft pluck
      const c = cross[crossIdx];
      E.sound('pluck', { note: NOTES[crossIdx % NOTES.length], intensity: c.under ? 0.18 : 0.26, pitch: heavy ? 0.9 : 1 });
      haptic('tick', 0.11);
      crossIdx++;
    }
    for (let i = 0; i < 3; i++) {
      if (knotAt[i] >= 0 || sv < sK[i] - 1) continue;
      knotAt[i] = t;
      const q = pointAtS(sK[i]);
      E.sound('glass', { note: 4 + i * 2, intensity: 0.42 });
      haptic('light', 0); E.checkpoint('step');
      E.ripples.add(q.x, q.y, { colour: wovenCol, speed: 55, alpha: 0.55, r: 4 });
      E.particles.burst(q.x, q.y, lowStim ? 3 : heavy ? 5 : 9, { speed: heavy ? 26 : 55, colour: wovenCol, life: 1.1, size: 4.5, kind: 'glint' });
      E.look?.(q.x, q.y);
    }
  }

  // ------------------------------------------------------------- update --
  function simMesh(dt) {
    const sub = 2, h = Math.min(dt, 1 / 30) / sub, sig2 = (1.35 * cell) ** 2, cap = cell * 0.3;
    const KA = 60, KN = 30, CD = 8.5, KP = 60;
    for (let it = 0; it < sub; it++) {
      for (let j = 1; j < R; j++) for (let i = 1; i < C; i++) {
        const k = j * (C + 1) + i, rx = sx0 + i * cell, ry = sy0 + j * cell, up = k - (C + 1), dn = k + (C + 1);
        let fx = -KA * mdx[k] + KN * (mdx[k - 1] + mdx[k + 1] + mdx[up] + mdx[dn] - 4 * mdx[k]) - CD * mvx[k];
        let fy = -KA * mdy[k] + KN * (mdy[k - 1] + mdy[k + 1] + mdy[up] + mdy[dn] - 4 * mdy[k]) - CD * mvy[k];
        for (let q = 0; q < touches.length; q++) {
          const tp = touches[q]; if (tp.amp < 0.01) continue;
          const ddx = tp.x - rx, ddy = tp.y - ry, w = Math.exp(-(ddx * ddx + ddy * ddy) / sig2);
          const gth = (tp === tracer ? 0.05 + 0.36 * taut : 0.07) * tp.amp * w * KP;
          fx += ddx * gth; fy += ddy * gth;
        }
        mvx[k] += fx * h; mvy[k] += fy * h;
        mdx[k] = clamp(mdx[k] + mvx[k] * h, -cap, cap); mdy[k] = clamp(mdy[k] + mvy[k] * h, -cap, cap);
      }
    }
  }

  function update(dt, t) {
    const s = stage.s;
    if (E.phase !== 'play') for (const tp of touches) tp.tgt = 0;
    for (const tp of touches) tp.amp += (tp.tgt - tp.amp) * (1 - Math.exp(-dt * (tp.tgt ? 10 : 5)));
    // finger kinematics (speed along the route)
    if (tracer && fingerValid && dt > 0) { const inst = Math.max(0, fingerS - lastFingerS) / Math.max(dt, 1 / 120); speed = lerp(speed, inst, 1 - Math.exp(-dt * 12)); lastFingerS = fingerS; }
    else speed *= Math.exp(-dt * 5);
    // the shuttle glides along the route towards the fingertip (or the assist step); rushing drags it
    let Tg = null;
    if (finAt < 0) { if (tracer && fingerValid) Tg = fingerS; else if (assistTo != null) Tg = assistTo; else if (glideTo != null) Tg = glideTo; }
    const vmax = (!tracer && assistTo != null ? 230 : lerp(420, 100, taut)) * s;
    const vd = Tg != null ? clamp((Tg - wanted) * 10, 0, vmax) : 0;
    vS += (vd - vS) * (1 - Math.exp(-dt * 12));
    if (Tg != null && Tg > wanted) wanted = Math.min(Tg, L, wanted + vS * dt);
    if (assistTo != null && wanted >= Math.min(assistTo, L) - 0.4) assistTo = null;
    if (glideTo != null && (wanted >= glideTo - 0.4 || vS < 3)) glideTo = null;
    // the world law decides how far the shuttle may really go
    const p = E.gate(wanted / L);
    headS = p * L;
    if (wanted > headS + BANK) { wanted = headS + BANK; glideTo = null; }
    if (tracer && E.locked && fingerValid && fingerS > headS + BANK && t - lastWait > 0.7) { lastWait = t; E.checkpoint('wait'); wob.kick(0.5); }
    // tension: a finger far ahead of the shuttle, too fast, or off the route pulls the mesh taut
    let tt = 0;
    if (tracer && finAt < 0) tt = Math.max(fingerValid ? invLerp(55 * s, 150 * s, fingerS - headS) : invLerp(tol, tol + 70 * s, fingerOff), invLerp(650 * s, 1300 * s, speed));
    taut += (tt - taut) * (1 - Math.exp(-dt * (tt > taut ? 7 : 2.4)));
    if (taut > 0.55 && t - lastThrum > 1.1) {
      lastThrum = t; E.sound('thrum', { intensity: 0.22, pitch: 1.1 }); haptic('soft', 0);
      if (!tautWarned && R1) { tautWarned = true; E.hint('Softly — rushing pulls the silk taut.'); }
    }
    laceT = clamp(0.18 + 0.8 * taut + 0.25 * (1 - relaxMean));
    // display + laying the thread
    shownS += (headS - shownS) * (1 - Math.exp(-dt * 16));
    if (Math.abs(headS - shownS) < 0.05) shownS = headS;
    layUpTo(shownS, t);
    // relaxation field: the silk calms around the woven line, and a little everywhere as it goes
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.2)) : 0;
    const floor = Math.max(E.calm * 0.5, 0.42 * smooth(p)) + fin;
    const kR = 1 - Math.exp(-dt * 1.5);
    let sum = 0;
    for (let i = 0; i < rlx.length; i++) { const tg = Math.min(1, Math.max(rlxT[i], floor)); rlx[i] += (tg - rlx[i]) * kR; sum += rlx[i]; }
    relaxMean = sum / rlx.length;
    if (taut > 0.05 && tracer) tenseNear(tracer.x, tracer.y, taut * dt * 1.4);
    if (dt > 0) simMesh(dt);
    wob.update(dt);
    // prints soften back to their own colours as the line relaxes the silk near them
    let repaint = false;
    for (const pr of prints) {
      let tg = n === 1 ? smooth(invLerp(L * 0.06, L * 0.86, shownS)) : shownS >= pr.s - 4 ? 1 : 0;
      tg = Math.max(tg, E.calm * 0.6, fin);
      pr.relax += (tg - pr.relax) * (1 - Math.exp(-dt * (n === 1 ? 3 : 1.6)));
      if (pr.relax > 0.999) pr.relax = 1;
      if (!pr.cp && pr.relax > 0.55) {
        pr.cp = true;
        disp(pr.x, pr.y);
        E.checkpoint('photo', pr.ph);
        photos.dust(pr.ph, pr.x + DXo, pr.y + DYo, pr.size, lowStim ? 6 : heavy ? 9 : 16, { shape: pr.shape, up: 22, speed: 16, life: 1.6, sizePx: 4.5 });
        E.sound('chime', { intensity: 0.28 });
      }
      if (Math.abs(pr.relax - pr.painted) > 0.012 || (pr.relax === 1 && pr.painted < 1)) repaint = true;
    }
    if (repaint) paintTexture();
    // the final cell: once the shuttle tucks in and the finger lifts, it settles and stays relaxed
    if (!traced && headS >= L - 0.6) {
      traced = true; cellT = Math.max(0.42, taut); rest = 0;
      relaxBump(sx0 + (fcx + 0.5) * cell, sy0 + (fcy + 0.5) * cell, 1.3);
      E.sound('drop-in', { intensity: 0.32 }); haptic('light', 0);
      if (tracer && !liftHinted) { liftHinted = true; E.hint('Now lift, and let the last square rest.'); }
    }
    if (traced && !doneFlag) {
      if (tracer) { cellT = Math.max(cellT * Math.exp(-dt * 0.5), taut); rest = 0; }
      else { cellT = Math.max(0, cellT - dt * (assistRelax ? 2.6 : 1.1)); if (cellT < 0.04) rest += dt; }
      if (rest >= 0.45 && !tracer && assistTo == null) {
        doneFlag = true;
        const cx = sx0 + (fcx + 0.5) * cell, cy = sy0 + (fcy + 0.5) * cell;
        E.sound('settle', { intensity: 0.48 }); E.haptic('soft'); E.react('release');
        E.ripples.add(cx, cy, { colour: wovenCol, speed: 42, alpha: 0.5, r: cell * 0.3 });
      }
    }
    // billow (twist / finale): one soft swell crossing the silk
    const bk = (t - billowAt) / 2.8;
    if (bk >= 0 && bk <= 1) { billowF = lerp(-0.25, 1.25, ease.inOutSine(bk)); billowA = Math.sin(Math.PI * bk) * (heavy ? 0.55 : 1) * (reduced ? 0.4 : 1); }
    else billowA = 0;
    // finale: light flows along the woven line, past each knot
    if (finAt >= 0) {
      const flowS = ease.inOutSine(clamp((t - finAt) / 1.9)) * L;
      for (let i = 0; i < 3; i++) {
        if (finKnot[i] || flowS < sK[i]) continue;
        finKnot[i] = true;
        const q = pointAtS(sK[i]);
        if (heavy || lowStim) for (let m = 0; m < 3; m++) E.particles.emit({ x: q.x + (m - 1) * 5, y: q.y, vx: (m - 1) * 4, vy: -14, life: 1.8, size: 6, colour: wovenCol, drag: 0.97 });
        else E.particles.burst(q.x, q.y, 8, { speed: 40, colour: wovenCol, life: 1.3, size: 5, kind: 'glint' });
        E.sound('pluck', { note: 5 + i * 2, intensity: 0.22 });
      }
    }
    // shuttle pose
    const k = restAt(shownS); disp(RX0, RY0); SHX = RX0 + DXo; SHY = RY0 + DYo; SHA = angA[Math.min(NS - 1, k)];
    return fin;
  }

  // ------------------------------------------------------------ drawing --
  function computeMaps(t, fin) {
    const sd = sheenImg.data, dd = desatImg.data, stepX = sw / SWm, stepY = sh / SHm;
    const [hr, hg, hb] = SHEEN, [sr, sg, sb] = SHADE;
    const dimS = cell * 0.55, dimS2 = dimS * dimS;
    const sweepC = ((t * 0.045 * (reduced ? 0.5 : 1)) % 1.7) - 0.35;
    const tautOn = tracer && taut > 0.03;
    const ax = SHX, ay = SHY, bx = tracer ? tracer.x : 0, by = tracer ? tracer.y : 0, abx = bx - ax, aby = by - ay, ab2 = abx * abx + aby * aby || 1;
    const cr2 = (8 * stage.s) ** 2;
    let dmax = 0;
    for (let j = 0; j < SHm; j++) {
      const y = sy0 + (j + 0.5) * stepY, v = (j + 0.5) / SHm;
      for (let i = 0; i < SWm; i++) {
        const x = sx0 + (i + 0.5) * stepX, u = (i + 0.5) / SWm;
        const r = relaxAt(x, y), env = envAt(u, v);
        let shd = 0;
        for (let w = 0; w < 3; w++) shd += Math.cos(wkx[w] * x + wky[w] * y + W_OM[w] * tw + wph[w] + 0.6) * wsa[w];
        shd *= env * wrinkleAt(x, y, r);
        // a slow diagonal satin sweep, brighter where the silk lies smooth
        const sp = u * 0.75 + v * 0.45 - sweepC;
        shd += Math.exp(-(sp * sp) / 0.012) * (0.2 + 0.3 * r + 0.25 * fin) * env;
        if (billowA > 0.001) { const du = u - billowF; shd -= du * Math.exp(-(du * du) / 0.02) * billowA * 9 * env; }
        // fingertips press soft dimples into the satin
        for (let q = 0; q < touches.length; q++) {
          const tp = touches[q]; if (tp.amp < 0.01) continue;
          const ddx = x - tp.x, ddy = y - tp.y, e = Math.exp(-(ddx * ddx + ddy * ddy) / dimS2) * tp.amp;
          shd += ((ddx * LX + ddy * LY) / dimS) * e * 1.5;
        }
        // a taut pull shines as a strained crease along the thread
        if (tautOn) {
          let tq = ((x - ax) * abx + (y - ay) * aby) / ab2; tq = tq < 0 ? 0 : tq > 1 ? 1 : tq;
          const ex = ax + abx * tq - x, ey = ay + aby * tq - y;
          shd += taut * 2 * Math.exp(-(ex * ex + ey * ey) / cr2);
        }
        const o = (j * SWm + i) * 4;
        if (shd >= 0) { const a = Math.pow(shd, 1.5) * 92; sd[o] = hr; sd[o + 1] = hg; sd[o + 2] = hb; sd[o + 3] = a > 150 ? 150 : a; }
        else { const a = Math.pow(-shd, 1.2) * 70; sd[o] = sr; sd[o + 1] = sg; sd[o + 2] = sb; sd[o + 3] = a > 120 ? 120 : a; }
        const da = (1 - r) * 0.44 * (1 - fin);
        if (da > dmax) dmax = da;
        dd[o] = dd[o + 1] = dd[o + 2] = 128; dd[o + 3] = da * 255;
      }
    }
    sheenG.putImageData(sheenImg, 0, 0);
    desatMax = dmax;
    if (dmax > 0.01) desatG.putImageData(desatImg, 0, 0);
  }

  function computeEdges() {
    const N = R * ESUB + 1, s = stage.s;
    for (let k = 0; k < N; k++) {
      const y = sy0 + (k / ESUB) * cell, fr = (k / ESUB) % 1;
      const bow = (0.7 + 2.4 * laceT) * s * Math.abs(Math.sin(Math.PI * (fr - 0.5)));
      disp(sx0, y); EL[k * 2] = sx0 + DXo + bow; EL[k * 2 + 1] = y + DYo;
      disp(sx0 + sw, y); ER[k * 2] = sx0 + sw + DXo - bow; ER[k * 2 + 1] = y + DYo;
    }
  }
  function outlinePath() {
    const N = R * ESUB + 1;
    g.beginPath(); g.moveTo(EL[0], sy0 - 2); g.lineTo(ER[0], sy0 - 2);
    for (let k = 0; k < N; k++) g.lineTo(ER[k * 2], ER[k * 2 + 1]);
    g.lineTo(ER[(N - 1) * 2], sy0 + sh + 2); g.lineTo(EL[(N - 1) * 2], sy0 + sh + 2);
    for (let k = N - 1; k >= 0; k--) g.lineTo(EL[k * 2], EL[k * 2 + 1]);
    g.closePath();
  }

  function drawBackdrop(t, fin) {
    const s = stage.s;
    motes(g, stage.x, stage.y, stage.w, stage.h, t * (reduced ? 0.4 : 1), glowC, { n: lowStim ? 8 : 18, alpha: 0.32, seed: 44 + E.round, size: 1.5 * s });
    glow(g, stage.cx, stage.cy, Math.max(sw, sh) * 0.8, glowC, 0.1 + 0.04 * Math.sin(t * 0.55 * spd) + fin * 0.1);
    g.drawImage(shadowC, shadowX, shadowY, shadowC.width / D, shadowC.height / D);
  }
  function drawRods() {
    const s = stage.s, w = 3.4 * s + 0.6, y0 = sy0 - rollR, y1 = sy0 + sh + rollR;
    g.fillStyle = gradRodL; g.fillRect(sx0 - rodGap - w / 2, y0, w, y1 - y0);
    g.fillStyle = gradRodR; g.fillRect(sx0 + sw + rodGap - w / 2, y0, w, y1 - y0);
  }
  function drawSlices() {
    const m = g.getTransform(), k = m.a, P = PIECES, Wt = T.width, Ht = T.height;
    for (let v0 = 0; v0 < sh - 0.01; v0 += sliceH) {
      const v1 = Math.min(sh, v0 + sliceH), y = sy0 + (v0 + v1) * 0.5;
      for (let q = 0; q <= P; q++) { disp(sx0 + (q / P) * sw, y); SDX[q] = DXo; SDY[q] = DYo; }
      for (let q = 0; q < P; q++) {
        const ua = (q / P) * sw, ub = ((q + 1) / P) * sw, du = ub - ua;
        const sxk = (SDX[q + 1] - SDX[q]) / du, syk = (SDY[q + 1] - SDY[q]) / du;
        g.setTransform(k * (1 + sxk), k * syk, 0, k, k * (sx0 + SDX[q] - sxk * ua) + m.e, k * (sy0 + SDY[q] - syk * ua) + m.f);
        const sx = ua * D, sy = v0 * D;
        const sWd = Math.min(Wt - sx, (du + (q < P - 1 ? 1.2 : 0)) * D), sHt = Math.min(Ht - sy, (v1 - v0 + (v1 < sh ? 1.4 : 0)) * D);
        if (sWd > 0 && sHt > 0) g.drawImage(T, sx, sy, sWd, sHt, ua, v0, sWd / D, sHt / D);
      }
    }
    g.setTransform(m);
  }
  function drawSilk(t, fin) {
    computeMaps(t, fin);
    computeEdges();
    g.save();
    outlinePath(); g.clip();
    drawSlices();
    g.imageSmoothingEnabled = true;
    if (desatMax > 0.01) {
      // where the silk is still tense its colours are muted (storm-dim, or misty for heavy feelings)
      g.globalCompositeOperation = 'saturation'; g.drawImage(desatC, sx0, sy0, sw, sh);
      g.globalCompositeOperation = heavy ? 'screen' : 'multiply'; g.globalAlpha = heavy ? 0.2 : 0.3; g.drawImage(desatC, sx0, sy0, sw, sh);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
    g.drawImage(sheenC, sx0, sy0, sw, sh);
    g.restore();
    // the hem catches the light
    outlinePath(); g.strokeStyle = rgba(threadCol, 0.22); g.lineWidth = 1.2; g.stroke();
  }

  function computeGrid() {
    let q = 0;
    for (let i = 1; i < C; i++) { const x = sx0 + i * cell; for (let k = 0; k <= R * GSUB; k++) { const y = sy0 + (k / GSUB) * cell; disp(x, y); GV[q++] = x + DXo; GV[q++] = y + DYo; } }
    q = 0;
    for (let j = 1; j < R; j++) { const y = sy0 + j * cell; for (let k = 0; k <= C * GSUB; k++) { const x = sx0 + (k / GSUB) * cell; disp(x, y); GH[q++] = x + DXo; GH[q++] = y + DYo; } }
  }
  function gridPath() {
    const nv = R * GSUB + 1, nh = C * GSUB + 1;
    g.beginPath();
    for (let i = 0; i < C - 1; i++) { const o = i * nv * 2; g.moveTo(GV[o], GV[o + 1]); for (let k = 1; k < nv; k++) g.lineTo(GV[o + k * 2], GV[o + k * 2 + 1]); }
    for (let j = 0; j < R - 1; j++) { const o = j * nh * 2; g.moveTo(GH[o], GH[o + 1]); for (let k = 1; k < nh; k++) g.lineTo(GH[o + k * 2], GH[o + k * 2 + 1]); }
  }
  function drawGrid(t, fin) {
    computeGrid();
    const s = stage.s;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    g.translate(0.6, 1); gridPath(); g.strokeStyle = 'rgba(2,0,14,0.3)'; g.lineWidth = 1.8 * s + 0.4; g.stroke();
    g.translate(-0.6, -1); gridPath(); g.strokeStyle = rgba(threadCol, 0.25 + 0.08 * fin); g.lineWidth = 0.9 * s + 0.35; g.stroke();
    if (tracer && taut > 0.05) {
      // the threads near a taut pull strain and shine
      const rg = g.createRadialGradient(tracer.x, tracer.y, 0, tracer.x, tracer.y, cell * 1.9);
      rg.addColorStop(0, rgba('#ffffff', 0.7 * taut)); rg.addColorStop(1, rgba('#ffffff', 0));
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = rg; g.lineWidth = 1.2 * s + 0.4; g.stroke(); g.globalCompositeOperation = 'source-over';
    }
    // every intersection is a tiny soft knot in the weave
    const nv = R * GSUB + 1, r = 1.4 * s;
    g.fillStyle = rgba(threadCol, 0.45); g.beginPath();
    for (let i = 0; i < C - 1; i++) for (let j = 1; j < R; j++) { const o = (i * nv + j * GSUB) * 2, x = GV[o], y = GV[o + 1]; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
    g.fill();
    g.restore();
  }

  function nodeP(i, j, slot) { const x = sx0 + i * cell, y = sy0 + j * cell; disp(x, y); FCX[slot] = x + DXo; FCY[slot] = y + DYo; }
  function drawFinalCell(t, fin) {
    const s = stage.s;
    nodeP(fcx, fcy, 0); nodeP(fcx + 1, fcy, 1); nodeP(fcx + 1, fcy + 1, 2); nodeP(fcx, fcy + 1, 3);
    const cx = (FCX[0] + FCX[1] + FCX[2] + FCX[3]) / 4, cy = (FCY[0] + FCY[1] + FCY[2] + FCY[3]) / 4;
    const br = 0.5 + 0.5 * Math.sin(t * 1.6 * (reduced ? 0.5 : 1));
    const pillow = doneFlag ? 1 : traced ? 1 - cellT : 0;
    const tension = traced ? cellT : shownS >= sK[2] - 2 ? taut : 0;
    glow(g, cx, cy, cell * (0.62 + 0.12 * pillow), pillow > 0.05 ? wovenCol : glowC, 0.12 + 0.06 * br + pillow * 0.3 + fin * 0.15);
    // border threads: straight and bright when taut, softly curved once relaxed
    const bow = (traced ? 1 - cellT : 0.35) * 2.8 * s;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(FCX[0], FCY[0]);
    for (let q = 0; q < 4; q++) {
      const a = q, b = (q + 1) % 4, mx = (FCX[a] + FCX[b]) / 2, my = (FCY[a] + FCY[b]) / 2, ix = cx - mx, iy = cy - my, il = Math.hypot(ix, iy) || 1;
      g.quadraticCurveTo(mx + (ix / il) * bow, my + (iy / il) * bow, FCX[b], FCY[b]);
    }
    g.closePath();
    if (pillow > 0.02) {
      const pg = g.createRadialGradient(cx - cell * 0.12, cy - cell * 0.14, 0, cx, cy, cell * 0.62);
      pg.addColorStop(0, rgba(mix(wovenCol, '#ffffff', 0.4), 0.3 * pillow)); pg.addColorStop(1, rgba(wovenCol, 0.06 * pillow));
      g.fillStyle = pg; g.fill();
    }
    g.strokeStyle = rgba(mix(glowC, '#ffffff', 0.4 + 0.6 * tension), 0.34 + 0.16 * br * (1 - pillow) + 0.4 * tension + 0.2 * pillow);
    g.lineWidth = (1.3 + tension * 0.9) * s; g.stroke();
    if (!doneFlag) {
      // little corner stitches mark the resting square
      const a = 0.4 + 0.3 * br, m = 4 * s, l = 7 * s;
      g.strokeStyle = rgba(wovenCol, a); g.lineWidth = 1.5 * s; g.beginPath();
      for (let q = 0; q < 4; q++) {
        const x = FCX[q], y = FCY[q];
        const sxn = cx > x ? 1 : -1, syn = cy > y ? 1 : -1, x0 = x + sxn * m, y0 = y + syn * m;
        g.moveTo(x0 + sxn * l, y0); g.lineTo(x0, y0); g.lineTo(x0, y0 + syn * l);
      }
      g.stroke();
    }
    g.restore();
  }

  function measureWords(force) {
    const tok = words.token || '';
    const size = clamp(Math.round(12.5 * stage.s + 1.5), 12, 16);
    if (!force && tok === tokC && size === wSize) return;
    tokC = tok; wSize = size; wFont = `700 ${size}px ${FONT}`;
    const lh = cell * 0.78, maxLines = lh - 8 >= size * 2.3 ? 2 : 1;
    g.save(); g.font = wFont;
    wLines = wrap(g, tok, sw - cell * 0.52 - 22, maxLines);
    let total = 0;
    wOff = wLines.map((ln) => {
      const chars = [...ln], xs = new Float32Array(chars.length), lw = g.measureText(ln).width;
      let acc = 0; for (const ch of chars) acc += g.measureText(ch).width;
      const k = acc > 0 ? lw / acc : 1;
      let x = -lw / 2;
      chars.forEach((ch, i) => { const cw = g.measureText(ch).width * k; xs[i] = x + cw / 2; x += cw; });
      total += chars.length;
      return { chars, xs };
    });
    g.restore();
    if (wCX.length < total) { wCX = new Float32Array(total); wCY = new Float32Array(total); }
  }
  function drawWords() {
    if (E.phase === 'law') return;
    measureWords(false);
    if (!wOff.length) return;
    const cy0 = sy0 + (R - 1) * cell + cell * 0.5, lh = wSize * 1.18, nl = wOff.length, mx = sx0 + sw / 2;
    let q = 0;
    for (let li = 0; li < nl; li++) {
      const o = wOff[li], y = cy0 + (li - (nl - 1) / 2) * lh;
      for (let i = 0; i < o.chars.length; i++) { const x = mx + o.xs[i]; disp(x, y); wCX[q] = x + DXo * 0.5; wCY[q] = y + DYo * 0.6; q++; }
    }
    g.save(); g.font = wFont; g.textAlign = 'center'; g.textBaseline = 'middle';
    glow(g, mx, cy0, sw * 0.32, glowC, 0.08);
    // embroidered: a shadow under the stitches, the thread, a soft sheen on top
    for (let pass = 0; pass < 3; pass++) {
      g.fillStyle = W_FILL[pass]; q = 0;
      for (const o of wOff) for (let i = 0; i < o.chars.length; i++, q++) {
        if (pass === 2) g.globalCompositeOperation = 'lighter';
        g.fillText(o.chars[i], wCX[q] + W_OX[pass], wCY[q] + W_OY[pass]);
      }
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
  }

  function drawWoven(t, fin) {
    if (shownS <= 0.5) return;
    const s = stage.s;
    const hi = Math.max(0, Math.min(NS - 1, idxAt(shownS) - 1));
    for (let k = 0; k <= hi; k++) {
      disp(pts[k][0], pts[k][1]);
      const rl = smooth((t - layT[k]) / 1.1);
      const off = reduced ? rl * 0.6 * s : rl * 1.3 * s * Math.sin(cum[k] * 0.07 + tw * 0.9);
      WX[k] = pts[k][0] + DXo + nrmX[k] * off; WY[k] = pts[k][1] + DYo + nrmY[k] * off;
    }
    const line = (gaps) => {
      g.beginPath(); let pen = false;
      for (let k = 0; k <= hi; k++) {
        if (gaps && gapAt[k]) { pen = false; continue; }
        if (!pen) { g.moveTo(WX[k], WY[k]); pen = true; } else g.lineTo(WX[k], WY[k]);
      }
      if (pen) g.lineTo(SHX, SHY);
    };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    // soft glow under the laid thread
    g.globalCompositeOperation = 'lighter';
    line(false); g.strokeStyle = rgba(wovenCol, 0.13 + 0.22 * fin); g.lineWidth = 8 * s; g.stroke();
    g.globalCompositeOperation = 'source-over';
    // shadow, thread, sheen
    g.translate(0.8, 1.3); line(true); g.strokeStyle = 'rgba(0,0,10,0.42)'; g.lineWidth = 3.1 * s; g.stroke(); g.translate(-0.8, -1.3);
    line(true); g.strokeStyle = mix(wovenCol, '#ffffff', fin * 0.3); g.lineWidth = 2.4 * s; g.stroke();
    g.translate(-0.35, -0.6); line(true); g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = 0.8 * s; g.stroke(); g.translate(0.35, 0.6);
    // the fresh stretch just behind the shuttle is still taut: straight and white, relaxing as it ages
    const k0 = Math.max(0, idxAt(shownS - 70 * s) - 1);
    if (hi - k0 >= 1) {
      const fg = g.createLinearGradient(SHX, SHY, WX[k0], WY[k0]);
      fg.addColorStop(0, 'rgba(255,255,255,0.95)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
      g.beginPath(); g.moveTo(WX[k0], WY[k0]); for (let k = k0 + 1; k <= hi; k++) g.lineTo(WX[k], WY[k]); g.lineTo(SHX, SHY);
      g.strokeStyle = fg; g.lineWidth = 1.7 * s; g.stroke();
    }
    // where the line passes under a grid thread, that thread crosses over it
    for (let ci = 0; ci < crossIdx; ci++) {
      const c = cross[ci]; if (!c.under) continue;
      const kk = Math.min(hi, idxAt(c.s)), x = WX[kk], y = WY[kk], a = 4.2 * s;
      const dx = c.v ? 0 : a, dy = c.v ? a : 0;
      g.strokeStyle = 'rgba(0,0,10,0.32)'; g.lineWidth = 2.2 * s; g.beginPath(); g.moveTo(x - dx + 0.5, y - dy + 0.8); g.lineTo(x + dx + 0.5, y + dy + 0.8); g.stroke();
      g.strokeStyle = rgba(threadCol, 0.55); g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x + dx, y + dy); g.stroke();
    }
    // finale: a soft light flows along the whole line
    if (fin > 0 && finAt >= 0) {
      const fk = clamp((t - finAt) / 1.9);
      if (fk < 1) {
        const fs = ease.inOutSine(fk) * L;
        for (let q = 0; q < 6; q++) { restAt(fs - q * 9 * s); disp(RX0, RY0); glow(g, RX0 + DXo, RY0 + DYo, (13 - q * 1.5) * s, '#fff3d6', (heavy ? 0.4 : 0.6) * (1 - q / 6)); }
      }
    }
    g.restore();
  }

  function drawRoute(t) {
    // the untraced route: soft stitch-holes in the weave, a slow glimmer drifting along them
    if (traced || finAt >= 0) return;
    const s = stage.s, step = 10 * s, s0 = shownS + 16 * s, r = 1.25 * s + 0.3;
    if (s0 >= L) return;
    g.save(); g.fillStyle = rgba(threadCol, 0.34); g.beginPath();
    for (let sv = s0; sv < L; sv += step) { restAt(sv); disp(RX0, RY0); const x = RX0 + DXo, y = RY0 + DYo; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
    g.fill();
    const run = (t * 70 * s * (reduced ? 0.4 : 1)) % (L - s0 + 140 * s);
    for (let q = 0; q < 4; q++) {
      const sv = s0 + run - q * 12 * s; if (sv < s0 || sv > L) continue;
      restAt(sv); disp(RX0, RY0); glow(g, RX0 + DXo, RY0 + DYo, (9 - q * 1.5) * s, threadCol, 0.32 * (1 - q / 4));
    }
    g.restore();
  }

  function drawKnots(t, fin) {
    const s = stage.s, next = knotAt.findIndex((v) => v < 0);
    for (let i = 0; i < 3; i++) {
      const kx = sx0 + K[i][0] * cell, ky = sy0 + K[i][1] * cell;
      disp(kx, ky);
      const x = kx + DXo, y = ky + DYo;
      if (knotAt[i] < 0) {
        const isNext = i === next, br = 0.5 + 0.5 * Math.sin(t * 2.1 * (reduced ? 0.5 : 1) + i * 1.3);
        glow(g, x, y, (20 + (isNext ? 7 * br : 2)) * s, knotCol, isNext ? 0.48 + 0.22 * br : 0.32);
        g.strokeStyle = rgba(threadCol, 0.85); g.lineWidth = 1.7 * s; g.lineCap = 'round';
        const a = 6.5 * s;
        g.beginPath(); g.moveTo(x - a, y); g.lineTo(x + a, y); g.moveTo(x, y - a); g.lineTo(x, y + a); g.stroke();
        orb(g, x, y, 4.6 * s + (isNext ? br * 0.9 : 0), mix(knotCol, '#ffffff', 0.35));
        g.strokeStyle = rgba(knotCol, isNext ? 0.45 * (1 - br) + 0.18 : 0.2); g.lineWidth = 1.3;
        g.beginPath(); g.arc(x, y, (isNext ? 11 + br * 6 : 10) * s, 0, TAU); g.stroke();
      } else {
        // tied: the knot blooms into a little woven rosette
        const k = Math.max(0, ease.outBack(clamp((t - knotAt[i]) / 0.7)));
        glow(g, x, y, 22 * s * (0.6 + 0.4 * k) * (1 + fin * 0.3), wovenCol, 0.42 + fin * 0.22);
        g.save(); g.translate(x, y); g.rotate(i * 0.4 + (reduced ? 0 : tw * 0.05));
        g.lineWidth = 1.2 * s; g.strokeStyle = rgba(wovenCol, 0.9); g.fillStyle = rgba(wovenCol, 0.22);
        for (let q = 0; q < 6; q++) {
          const a = (q * TAU) / 6;
          g.beginPath(); g.ellipse(Math.cos(a) * 5 * s * k, Math.sin(a) * 5 * s * k, 4.6 * s * k + 0.01, 2.1 * s * k + 0.01, a, 0, TAU); g.fill(); g.stroke();
        }
        g.restore();
        orb(g, x, y, 3.4 * s, mix(wovenCol, '#ffffff', 0.4));
      }
    }
  }

  function drawPull(t) {
    if (!tracer || finAt >= 0) return;
    const fx = tracer.x, fy = tracer.y, d = Math.hypot(fx - SHX, fy - SHY), s = stage.s;
    if (d < 12 * s) return;
    // the thread between shuttle and fingertip: slack and sagging when gentle, straight and singing when taut
    const slack = (1 - taut) * Math.min(10, d * 0.12) * s;
    const vib = !reduced && taut > 0.4 ? Math.sin(t * 46) * taut * 1.1 : 0;
    const nx = -(fy - SHY) / d, ny = (fx - SHX) / d, mx = (SHX + fx) / 2 + nx * vib, my = (SHY + fy) / 2 + slack + ny * vib;
    g.save(); g.lineCap = 'round';
    g.strokeStyle = rgba(mix(wovenCol, '#ffffff', 0.4 + 0.6 * taut), 0.42 + 0.45 * taut); g.lineWidth = (1.2 + 0.7 * taut) * s;
    g.beginPath(); g.moveTo(SHX, SHY); g.quadraticCurveTo(mx, my, fx, fy); g.stroke();
    if (taut > 0.3) glow(g, mx, my, 16 * s, '#ffffff', 0.22 * taut);
    g.restore();
  }

  function drawShuttle(t, fin) {
    const s = stage.s, held = tracer ? 1 : 0, len = 34 * s + 5, wid = 10.5 * s + 3;
    const bob = reduced ? 0 : Math.sin(t * 1.7) * 1.1 * s * (1 - held);
    const wv = wob.v * (reduced ? 1.5 : 4) * s;
    const x = SHX - Math.sin(SHA) * wv, y = SHY + Math.cos(SHA) * wv + bob - held * 2;
    if (!traced && !held && finAt < 0) {
      const br = 0.5 + 0.5 * Math.sin(t * 2.2 * (reduced ? 0.5 : 1));
      g.strokeStyle = rgba(wovenCol, 0.24 + 0.22 * br); g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, 20 * s + 4 + br * 3, 0, TAU); g.stroke();
    }
    glow(g, x, y, (24 + 8 * held) * s, wovenCol, 0.3 + 0.25 * held + (doneFlag ? 0.15 : 0) + fin * 0.15);
    g.save(); g.translate(x + 2 * s, y + 4 * s + held * 2); g.rotate(SHA);
    g.fillStyle = 'rgba(0,0,12,0.35)'; g.beginPath(); g.ellipse(0, 0, len * 0.48, wid * 0.42, 0, 0, TAU); g.fill();
    g.restore();
    g.save(); g.translate(x, y); g.rotate(SHA); const sc = 1 + 0.1 * held; g.scale(sc, sc);
    g.beginPath(); g.moveTo(-len / 2, 0);
    g.bezierCurveTo(-len * 0.3, -wid * 0.64, len * 0.3, -wid * 0.64, len / 2, 0);
    g.bezierCurveTo(len * 0.3, wid * 0.64, -len * 0.3, wid * 0.64, -len / 2, 0);
    g.fillStyle = gradShuttle; g.fill();
    g.strokeStyle = 'rgba(255,240,215,0.5)'; g.lineWidth = 0.8; g.stroke();
    // the slot with its spool of thread
    const slw = len * 0.4, slh = wid * 0.46, spw = slw * 0.72, sph = slh * 0.72;
    roundRect(g, -slw / 2, -slh / 2, slw, slh, slh / 2); g.fillStyle = 'rgba(30,14,6,0.88)'; g.fill();
    roundRect(g, -spw / 2, -sph / 2, spw, sph, sph / 2); g.fillStyle = wovenCol; g.fill();
    g.strokeStyle = rgba(mix(wovenCol, '#000000', 0.4), 0.7); g.lineWidth = 0.7; g.beginPath();
    for (let i = 1; i < 5; i++) { const xx = -spw / 2 + (i / 5) * spw; g.moveTo(xx, -sph / 2 + 0.6); g.lineTo(xx, sph / 2 - 0.6); }
    g.stroke();
    // rounded pearl caps (soft ends, nothing sharp)
    g.fillStyle = '#f2f5fb'; const cr = 1.5 * s + 0.5;
    g.beginPath(); g.arc(len / 2 - cr, 0, cr, 0, TAU); g.moveTo(-len / 2 + cr * 2, 0); g.arc(-len / 2 + cr, 0, cr, 0, TAU); g.fill();
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath(); g.ellipse(-len * 0.1, -wid * 0.24, len * 0.28, wid * 0.1, 0, 0, TAU); g.fill();
    g.restore();
  }

  function drawLacing(t) {
    const s = stage.s, sag = (1 - laceT) * 3.6 * s + 0.4, swayK = reduced ? 0 : (1 - laceT) * 0.8 * s;
    const col = rgba(mix(threadCol, '#ffffff', laceT * 0.6), 0.5 + 0.35 * laceT);
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (let side = 0; side < 2; side++) {
        const rodX = side ? sx0 + sw + rodGap : sx0 - rodGap, Ed = side ? ER : EL;
        g.moveTo(rodX, sy0);
        for (let k = 0; k < R; k++) {
          const ry = sy0 + k * cell, ei = (k * ESUB + ESUB / 2) * 2, ex = Ed[ei], ey = Ed[ei + 1], sw2 = Math.sin(t * 0.9 * spd + k * 1.7 + side) * swayK;
          g.quadraticCurveTo((rodX + ex) / 2 + sw2, (ry + ey) / 2 + sag, ex, ey);
          g.quadraticCurveTo((rodX + ex) / 2 - sw2, (ey + ry + cell) / 2 + sag, rodX, ry + cell);
        }
      }
      if (pass === 0) { g.save(); g.translate(0.6, 1.1); g.strokeStyle = 'rgba(0,0,12,0.35)'; g.lineWidth = 1.8 * s; g.stroke(); g.restore(); }
      else { g.strokeStyle = col; g.lineWidth = 1.1 * s + 0.2; g.stroke(); }
    }
    // little brass eyelets on the silk edge
    g.lineWidth = 1.1 * s; g.strokeStyle = rgba(mix(warm, '#ffffff', 0.4), 0.8); g.fillStyle = 'rgba(10,4,20,0.7)';
    g.beginPath();
    for (let side = 0; side < 2; side++) { const Ed = side ? ER : EL; for (let k = 0; k < R; k++) { const ei = (k * ESUB + ESUB / 2) * 2, x = Ed[ei], y = Ed[ei + 1], r = 2.4 * s; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } }
    g.fill(); g.stroke();
  }
  function drawRollers(fin) {
    const s = stage.s, xL = sx0 - rodGap - 9 * s, xR = sx0 + sw + rodGap + 9 * s, fcol = mix(warm, '#fff1dc', 0.35);
    for (let q = 0; q < 2; q++) {
      const y = q ? sy0 + sh + rollR * 0.62 : sy0 - rollR * 0.62;
      g.fillStyle = q ? gradRollB : gradRollT; roundRect(g, xL, y - rollR, xR - xL, rollR * 2, rollR); g.fill();
      g.strokeStyle = 'rgba(40,18,6,0.24)'; g.lineWidth = 0.8; g.beginPath();
      for (let i = 0; i < 3; i++) { const yy = y - rollR * 0.42 + i * rollR * 0.42; g.moveTo(xL + rollR, yy); g.lineTo(xR - rollR, yy + (i - 1) * 0.5); }
      g.stroke();
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#fff0dc', 0.32 + fin * 0.15); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(xL + rollR, y - rollR * 0.52); g.lineTo(xR - rollR, y - rollR * 0.52); g.stroke(); g.restore();
      orb(g, xL, y, rollR * 1.18, fcol); orb(g, xR, y, rollR * 1.18, fcol);
    }
  }

  function drawTwist(t) {
    if (twistAt < 0) return;
    const k = t - twistAt, s = stage.s;
    disp(twistCX, twistCY);
    const cx = twistCX + DXo, cy = twistCY + DYo, br = 0.85 + 0.15 * Math.sin(t * 1.4);
    g.save(); g.lineCap = 'round';
    if (twistKind === 'lights') {
      // three resting lights, stitched into a calm little pathway
      const P = [[-0.32, 0.16], [0, -0.1], [0.32, 0.12]];
      for (let i = 0; i < 3; i++) {
        const a = smooth(clamp((k - i * 0.45) / 0.6)); if (a <= 0) continue;
        const x = cx + P[i][0] * cell, y = cy + P[i][1] * cell;
        if (i > 0) {
          const px = cx + P[i - 1][0] * cell, py = cy + P[i - 1][1] * cell;
          g.setLineDash([3 * s, 3 * s]); g.strokeStyle = rgba(wovenCol, 0.6 * a); g.lineWidth = 1.2 * s;
          g.beginPath(); g.moveTo(px, py); g.lineTo(lerp(px, x, a), lerp(py, y, a)); g.stroke(); g.setLineDash([]);
        }
        glow(g, x, y, 12 * s, wovenCol, 0.5 * a * br);
        orb(g, x, y, 2.6 * s * a + 0.01, mix(wovenCol, '#ffffff', 0.5), { alpha: a });
      }
    } else {
      // a little woven blossom embroiders itself, petal by petal
      const pc = mix(pal.accent, wovenCol, 0.45);
      glow(g, cx, cy, cell * 0.5, pc, 0.22 * smooth(clamp(k / 0.8)) * br);
      g.lineWidth = 1.3 * s;
      for (let i = 0; i < 5; i++) {
        const a = smooth(clamp((k - i * 0.28) / 0.5)); if (a <= 0) continue;
        const ang = -Math.PI / 2 + (i * TAU) / 5;
        g.save(); g.translate(cx + Math.cos(ang) * cell * 0.13, cy + Math.sin(ang) * cell * 0.13); g.rotate(ang);
        g.strokeStyle = rgba(pc, 0.9 * a); g.fillStyle = rgba(pc, 0.28 * a);
        g.beginPath(); g.ellipse(0, 0, cell * 0.14 * a + 0.01, cell * 0.07 * a + 0.01, 0, 0, TAU); g.fill(); g.stroke();
        g.restore();
      }
      const a = smooth(clamp((k - 1.3) / 0.5));
      if (a > 0) orb(g, cx, cy, 3 * s, mix(wovenCol, '#ffffff', 0.4), { alpha: a });
    }
    g.restore();
  }

  function frame(dt, t) {
    const fin = update(dt, t);
    tw += dt * spd * lerp(1, 0.45, fin);
    drawBackdrop(t, fin);
    drawRods();
    drawSilk(t, fin);
    drawGrid(t, fin);
    drawFinalCell(t, fin);
    drawWords();
    drawTwist(t);
    drawRoute(t);
    drawWoven(t, fin);
    drawKnots(t, fin);
    drawPull(t);
    drawShuttle(t, fin);
    drawLacing(t);
    drawRollers(fin);
  }

  // -------------------------------------------------------------- input --
  function fingerUpdate(x, y) {
    project(x, y, shownS - 40 * stage.s, shownS + 200 * stage.s);
    if (projD < tol) { fingerValid = true; fingerS = projS; fingerOff = 0; }
    else { fingerValid = false; fingerOff = projD; }
  }
  function slotFor(id) { for (const tp of touches) if (tp.id === id && tp.tgt > 0) return tp; return null; }
  function pickUp(tp) {
    tp.kind = 'trace'; tracer = tp; fingerUpdate(tp.x, tp.y);
    lastFingerS = fingerValid ? fingerS : headS; speed = 0; glideTo = null;
    E.sound('click', { intensity: 0.32 }); haptic('light', 0); E.look?.(tp.x, tp.y);
  }
  function nearShuttle(x, y) { return Math.hypot(x - SHX, y - SHY) < Math.max(46, 34 * stage.s + 16); }

  fit();
  E.onResize(fit);
  { const k = restAt(0); disp(RX0, RY0); SHX = RX0 + DXo; SHY = RY0 + DYo; SHA = angA[k]; }

  return {
    get progress() { return clamp(headS / L); },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      const inSilk = p.x > sx0 - 14 && p.x < sx0 + sw + 14 && p.y > sy0 - 12 && p.y < sy0 + sh + 12;
      let kind = null;
      if (!tracer && !traced) {
        if (nearShuttle(p.x, p.y)) kind = 'trace';
        else { project(p.x, p.y, headS - 30 * stage.s, headS + 70 * stage.s); if (projD < tol) kind = 'trace'; }
      }
      if (!kind && inSilk) kind = 'press';
      if (!kind) return;
      let tp = touches.find((o) => o.tgt === 0 && o.amp < 0.02);
      if (!tp) { if (touches.length >= 6) return; tp = { id: 0, x: 0, y: 0, amp: 0, tgt: 0, kind: 'press', lx: 0, ly: 0 }; touches.push(tp); }
      tp.id = p.id; tp.x = p.x; tp.y = p.y; tp.amp = 0; tp.tgt = 1; tp.lx = p.x; tp.ly = p.y; tp.kind = kind;
      if (kind === 'trace') pickUp(tp);
      else {
        // a fingertip on the silk: a soft dimple, a ripple and a note
        E.sound('bubble', { note: Math.floor(clamp((p.x - sx0) / sw) * 9.99), intensity: 0.22 }); haptic('tick');
        E.ripples.add(p.x, p.y, { colour: glowC, speed: 46, alpha: 0.32, r: 4 });
      }
    },
    move(p) {
      const tp = slotFor(p.id);
      if (!tp) return;
      tp.x = p.x; tp.y = p.y;
      if (tp === tracer) {
        fingerUpdate(p.x, p.y);
        if (!fingerValid && fingerOff > 240 * stage.s) {
          // strayed far away: the thread slips from the finger (the shuttle stays where it is)
          tracer = null; tp.kind = 'press'; fingerValid = false;
          E.sound('swish', { intensity: 0.18 });
        }
        return;
      }
      if (!tracer && !traced && finAt < 0 && nearShuttle(p.x, p.y)) { pickUp(tp); return; }
      if (Math.hypot(p.x - tp.lx, p.y - tp.ly) > 28 * stage.s) {
        tp.lx = p.x; tp.ly = p.y;
        if (E.now() - lastSwish > 0.35) { lastSwish = E.now(); E.sound('swish', { intensity: 0.12 }); E.sound('bubble', { note: Math.floor(clamp((p.x - sx0) / sw) * 9.99), intensity: 0.14 }); }
        haptic('tick', 0.16);
      }
    },
    up(p) {
      const tp = slotFor(p.id);
      if (!tp) return;
      tp.tgt = 0;
      if (tp === tracer) {
        tracer = null;
        // momentum: the shuttle glides on a little towards where the finger let go
        glideTo = fingerValid && fingerS > wanted ? Math.min(fingerS, wanted + vS * 0.22) : null;
        fingerValid = false; speed = 0;
      }
    },
    assist() {
      if (finAt >= 0 || doneFlag) return;
      if (traced) { assistRelax = true; return; }
      assistTo = Math.min(L, Math.max(wanted, headS) + L / 8);
    },
    pointAt(p) { return pointAtS(clamp(p) * L); },
    hint() {
      if (finAt >= 0 || traced || doneFlag) return null;
      const a = shownS, b = Math.min(L, a + clamp(120 * stage.s, 80, 150)), out = [];
      for (let i = 0; i <= 14; i++) { const q = pointAtS(lerp(a, b, i / 14)); out.push([q.x, q.y]); }
      return { path: out };
    },
    twist() {
      twistAt = E.now();
      // a quiet cell of the silk: away from the woven route, the resting square and the prints
      let bd = -Infinity;
      for (let j = 0; j < R - 1; j++) for (let i = 0; i < C; i++) {
        const x = sx0 + (i + 0.5) * cell, y = sy0 + (j + 0.5) * cell;
        let d = Math.hypot(x - (sx0 + (fcx + 0.5) * cell), y - (sy0 + (fcy + 0.5) * cell));
        for (let k = 0; k < NS; k += 4) d = Math.min(d, Math.hypot(x - pts[k][0], y - pts[k][1]));
        const inPrint = n && i + 0.5 > printBox[0] && i + 0.5 < printBox[2] && j + 0.5 > printBox[1] && j + 0.5 < printBox[3];
        const sc = d - (inPrint ? cell * 3 : 0);
        if (sc > bd) { bd = sc; twistCX = x; twistCY = y; }
      }
      if (!reduced) billowAt = twistAt;
    },
    finish() {
      finAt = E.now(); tracer = null; assistTo = null; glideTo = null;
      const hist = TAPESTRY.get(ritualKey) || [];
      hist.push({ ctrl: routeCtrl, knots: K.map((q) => [q[0], q[1]]), R });
      TAPESTRY.set(ritualKey, hist.slice(-6));
      for (const tp of touches) tp.tgt = 0;
      if (!reduced) billowAt = finAt + 0.2;
      E.sound('shimmer', { intensity: heavy ? 0.28 : 0.42 });
    },
    destroy() {},
  };
}
