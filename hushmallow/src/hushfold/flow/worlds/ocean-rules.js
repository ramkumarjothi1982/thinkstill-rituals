// Luminous Ocean — where things float, what counts as a discovery, and when the sea
// is done (pure: no DOM, no clock; node-tested).
//
// Layout, top to bottom (portrait): the controls · the subtitle band (reserved by the
// director: nothing of the world's ever sits in it) · the sky with the dawn on the
// horizon (0.44 H) · the far water, where the Thought Mallow floats just beyond the hero
// Mallow with its words above it (or below, or beside it — whichever fits) · the hero
// Mallow, floating in the foreground with its lowest tenth in the water · the near water.
// Photos float as bubbles: a few near, beside the hero, the rest further out where they
// are smaller. Nothing overlaps; nothing comes within 20 px of an edge.

export const OCEAN = Object.freeze({
  EDGE: 20,               // px clear at every screen edge (gestures)
  HORIZON: 0.44,          // the ocean's horizon line, × H (the storm's is 0.655)
  SKY_MIN: 26,            // px of sky kept between the subtitle band and the horizon
  WATER_MIN: 64,          // px of water kept above the hero Mallow's head
  GAP: 8,                 // px between the Thought Mallow and the hero / its words
  BOTTOM: 64,             // px kept clear at the bottom (choice chips on small phones)
  BUBBLE_MIN: 44,         // px: bubbles are at least this big until they drift past 6·Z0…
  BUBBLE_FAR: 28,         // …then shrink towards this by 9·Z0
  BUBBLE_GAP: 8,
  PLATE_MAX: 220,         // px: the words plate wraps to two lines rather than spanning the far water
  FAR: 4,                 // the 'distance' discovery: the thought ≥ 4·Z0 away…
  CAP: 9,                 // …and never further than 9·Z0 (s ≈ 0.1: still visible)
  LABEL_PX: 17, LABEL_LINE: 21.25, LABEL_PAD_X: 12, LABEL_PAD_Y: 8,   // the words plate (placeholders.js)
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** The words plate's size for a text width (px at 17 px): one line, or two when it is wide. */
export function plateSize(textW, maxW) {
  if (!(textW > 0)) return null;
  const inner = maxW - OCEAN.LABEL_PAD_X * 2;
  const lines = textW <= inner ? 1 : 2;
  const w = Math.min(maxW, (lines === 1 ? textW : Math.min(inner, textW / 1.75)) + OCEAN.LABEL_PAD_X * 2);
  return { w: Math.ceil(w), h: Math.ceil(lines * OCEAN.LABEL_LINE + OCEAN.LABEL_PAD_Y * 2), lines };
}

/** The hero Mallow's box when the shell has not measured it yet (the Hushfold's world layout). */
export function defaultMallowBox(W, H) {
  const B = Math.max(130, Math.min(W * 0.58, H * 0.27, 300));
  const bottom = Math.min(H * 0.885, H - 76), top = bottom - B;
  return { left: W / 2 - B / 2, right: W / 2 + B / 2, top, bottom, width: B, height: B };
}

/**
 * Bubble diameter on screen at perspective scale s (the home row is s = 0.5) and depth
 * z/Z0 = d: proportional to s, at least BUBBLE_MIN until 6·Z0, then easing to BUBBLE_FAR.
 */
export function bubbleSize(s, d, U) {
  const ref = clamp(0.15 * U, 48, 84);
  const far = smoothstep(6, OCEAN.CAP, d);
  const floor = OCEAN.BUBBLE_MIN * (1 - far) + OCEAN.BUBBLE_FAR * far;
  return Math.max(floor, Math.min(ref * 1.3, (ref * s) / 0.5));
}

const overlaps = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
const box = (x, y, w, h) => ({ x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 });

/**
 * Plan the screen. In: { W, H, band:{y,h}, mallow (client box or null), textW (the words at
 * 17 px, 0 = no thought), n (photos) }. Out: { hy, U, mallow, waterY, home:{x, y, r}, plate:{w, h,
 * lines, side:'above'|'below'|'side', x, y}, homeY (camera: the s = 0.5 line), labelW, slots:[{x, y, D}],
 * floor (lowest y a floater may use), rects: { band, mallow, thought, plate } }.
 */
export function planOcean({ W, H, band, mallow = null, textW = 0, n = 0 }) {
  const U = Math.min(W, H), E = OCEAN.EDGE;
  const M = mallow && mallow.height > 20 ? { left: mallow.left, right: mallow.right ?? mallow.left + mallow.width, top: mallow.top, bottom: mallow.bottom ?? mallow.top + mallow.height } : defaultMallowBox(W, H);
  M.width = M.right - M.left; M.height = M.bottom - M.top;
  const bandBottom = band ? band.y + band.h : 0;
  const floor = H - OCEAN.BOTTOM;
  const r = clamp(Math.round(U * 0.085), 26, 40);
  const labelW = Math.min(OCEAN.PLATE_MAX, W - 2 * E);
  const P = plateSize(textW, labelW);
  const hyLo = bandBottom + OCEAN.SKY_MIN, hyHi = M.top - OCEAN.WATER_MIN;
  const hy = Math.round(hyHi >= hyLo ? clamp(H * OCEAN.HORIZON, hyLo, hyHi) : hyLo);
  const waterY = Math.max(hy + 30, M.bottom - 0.1 * M.height);
  const mrect = { x0: M.left - 6, y0: M.top - 10, x1: M.right + 6, y1: M.bottom + 4 };
  const bandRect = { x0: 0, y0: band ? band.y : 0, x1: W, y1: bandBottom };

  // the Thought Mallow's home: just beyond the hero's head, its words above it (else below, else beside)
  let home = null, plate = null;
  const fits = (b) => b.x0 >= E - 0.5 && b.x1 <= W - E + 0.5 && b.y0 >= bandBottom + 4 && b.y1 <= floor && !overlaps(b, mrect);
  const tryCentre = () => {
    const x = W / 2, y = mrect.y0 - OCEAN.GAP - r;
    if (y < hy + r * 0.35 + 6) return null;
    const body = box(x, y, 2 * r, 2 * r);
    if (!P) return fits(body) ? { home: { x, y, r }, plate: null } : null;
    const above = box(x, y - r - 4 - P.h / 2, P.w, P.h);
    if (fits(body) && fits(above)) return { home: { x, y, r }, plate: { ...P, side: 'above', x, y: above.y0 + P.h / 2 } };
    // words below the body: lift the thought so the plate clears the hero's head
    const y2 = mrect.y0 - OCEAN.GAP - P.h - 4 - r;
    if (y2 >= hy + r * 0.35 + 6) {
      const b2 = box(x, y2, 2 * r, 2 * r), below = box(x, y2 + r + 4 + P.h / 2, P.w, P.h);
      if (fits(b2) && fits(below)) return { home: { x, y: y2, r }, plate: { ...P, side: 'below', x, y: below.y0 + P.h / 2 } };
    }
    return null;
  };
  const trySide = () => {
    // beside the hero, on the roomier side, at mid water; its words above, below or beside it
    const leftW = M.left - E, rightW = W - E - M.right;
    const left = leftW >= rightW;
    const span = left ? [E, mrect.x0 - 2] : [mrect.x1 + 2, W - E];
    const pw = P ? Math.min(P.w, labelW) : 0;
    const xs = [];
    const mid = (span[0] + span[1]) / 2;
    xs.push(clamp(mid, span[0] + Math.max(r, pw / 2), span[1] - Math.max(r, pw / 2)));
    if (P) { const xL = span[0] + r + 2, xR = span[1] - r - 2; xs.push(left ? xR : xL); }
    for (const x of xs) {
      for (let y = Math.max(hy + r * 0.4 + 6, bandBottom + 4 + r); y <= floor - r; y += 4) {
        const body = box(x, y, 2 * r, 2 * r);
        if (!fits(body)) continue;
        if (!P) return { home: { x, y, r }, plate: null };
        const cands = [
          ['above', x, y - r - 4 - P.h / 2], ['below', x, y + r + 4 + P.h / 2],
          ['side', left ? x - r - 8 - pw / 2 : x + r + 8 + pw / 2, y], ['side', left ? x + r + 8 + pw / 2 : x - r - 8 - pw / 2, y],
        ];
        for (const [side, px, py] of cands) {
          const b = box(px, py, pw, P.h);
          if (fits(b) && !overlaps(b, body, 2)) return { home: { x, y, r }, plate: { ...P, w: pw, side, x: px, y: py } };
        }
      }
    }
    return null;
  };
  const got = tryCentre() || trySide() || { home: { x: W / 2, y: Math.max(hy + r, (hy + M.top) / 2), r }, plate: P ? { ...P, side: 'above', x: W / 2, y: Math.max(bandBottom + 4 + P.h / 2, hy - P.h / 2) } : null };
  home = got.home; plate = got.plate;
  const homeY = Math.max(hy + 18, home.y + 0.55 * r);
  const Hw = (homeY - hy) / 0.5;
  const thoughtRect = box(home.x, home.y, 2 * r + 12, 2 * r + 12);
  const plateRect = plate ? box(clamp(plate.x, E + plate.w / 2, W - E - plate.w / 2), plate.y, plate.w + 8, plate.h + 8) : null;

  // bubbles: candidate spots over the water, greedily spread (deterministic)
  const slots = [];
  if (n > 0) {
    const obs = [mrect, bandRect, thoughtRect, ...(plateRect ? [plateRect] : [])];
    const cand = [];
    const sOf = (y) => (y - hy) / Hw;
    for (let y = hy + 14; y <= floor; y += 6) {
      const s = sOf(y), d = 1 / Math.max(1e-3, s) - 1;
      if (d > OCEAN.CAP + 0.5) continue;
      const D = bubbleSize(s, d, U);
      // the bubble sits on the water: its centre a little above the waterline
      const cy = y - 0.3 * D;
      if (cy - D / 2 < bandBottom + 4) continue;
      for (let x = E + D / 2; x <= W - E - D / 2; x += 6) {
        const b = box(x, cy, D, D);
        if (b.y1 > floor) continue;
        if (obs.some((o) => overlaps(b, o, OCEAN.BUBBLE_GAP))) continue;
        cand.push({ x, y: cy, D, wy: y, d });
      }
    }
    // the first slots spread wide; later ones may go far out (smaller): score = clearance + a little depth
    for (let k = 0; k < n && cand.length; k++) {
      let best = null, bs = -Infinity;
      for (const c of cand) {
        let clear = Infinity;
        for (const q of slots) { const g = Math.hypot(c.x - q.x, c.y - q.y) - (c.D + q.D) / 2; if (g < clear) clear = g; }
        clear = Math.min(clear, Math.hypot(c.x - home.x, c.y - home.y) - r - c.D / 2);
        if (slots.length && clear < OCEAN.BUBBLE_GAP) continue;
        const sc = Math.min(clear, U * 0.45) + c.D * 0.3;
        if (sc > bs) { bs = sc; best = c; }
      }
      if (!best) break;
      slots.push({ x: best.x, y: best.y, D: best.D, d: best.d });
    }
  }
  return {
    W, H, U, hy, waterY, homeY, Hw, labelW, floor, home, plate, slots,
    mallow: M, rects: { band: bandRect, mallow: mrect, thought: thoughtRect, plate: plateRect },
  };
}

// ------------------------------------------------------------ discoveries --
/**
 * 'long-waves': at least two quick flicks (short chop, λ < 0.2U), then a slow, long stroke
 * (slowness ≥ 0.7, Ls ≥ 0.45U) — fired a moment later, while that long swell is visibly
 * rolling (so "…and the whole sea rolls" is literally true of the screen).
 *   stroke({ t, id, lambdaU, s, lenU })   every released stroke
 *   update(t, alive(id) → amplitude)      → null | { id: 'long-waves', evidence }
 */
export function createLongWavesDetector(opts = {}) {
  const c = { flicks: 2, windowSec: 20, flickLamU: 0.2, slowS: 0.7, lenU: 0.45, delaySec: 1.1, ...opts };
  const flicks = [];
  let pending = null, fired = false;
  return {
    get fired() { return fired; },
    get pending() { return !!pending; },
    markFired() { fired = true; pending = null; },
    stroke(e) {
      if (fired) return;
      if (e.lambdaU < c.flickLamU) { flicks.push({ t: e.t, l: e.lambdaU }); if (flicks.length > 8) flicks.shift(); return; }
      if (pending || e.s < c.slowS || e.lenU < c.lenU) return;
      const recent = flicks.filter((f) => e.t - f.t <= c.windowSec);
      if (recent.length < c.flicks) return;
      pending = { at: e.t + c.delaySec, id: e.id, ev: { flicks: recent.length, flickLambdaU: round(recent.reduce((a, f) => a + f.l, 0) / recent.length), lambdaU: round(e.lambdaU), slowness: round(e.s), lenU: round(e.lenU), periodS: round(e.period || 0) } };
    },
    update(t, alive) {
      if (fired || !pending || t < pending.at) return null;
      const a = alive ? alive(pending.id) : 1;
      const ev = pending.ev; pending = null;
      if (!(a > 0.5)) return null;          // the swell is already gone: not true of the screen any more
      fired = true;
      return { id: 'long-waves', evidence: ev };
    },
  };
}

/**
 * 'distance': the Thought Mallow drifted past FAR·Z0 through the person's own swells (most of
 * the outward drift was theirs, not the storm's seed swells). Afterwards 'back': it came at
 * least backBy·Z0 closer again — "You can bring it closer too."
 *   update(dt, { dist (z/Z0), out (outward drift this frame, Z0), outUser (of it, the person's) })
 */
export function createDistanceDetector(opts = {}) {
  const c = { far: OCEAN.FAR, share: 0.6, backBy: 1.5, ...opts };
  let fired = false, backFired = false, outAll = 0, outUser = 0, maxD = 0;
  return {
    get fired() { return fired; },
    get backFired() { return backFired; },
    get share() { return outAll > 1e-6 ? outUser / outAll : 0; },
    markFired() { fired = true; },
    update(dt, m) {
      if (m.out > 0) { outAll += m.out; outUser += Math.max(0, Math.min(m.out, m.outUser)); }
      maxD = Math.max(maxD, m.dist);
      if (!fired) {
        if (m.dist >= c.far && this.share >= c.share) { fired = true; maxD = m.dist; return { id: 'distance', evidence: { dist: round(m.dist), share: round(this.share) } }; }
        return null;
      }
      if (!backFired && m.dist <= maxD - c.backBy) { backFired = true; return { id: 'back', evidence: { from: round(maxD), to: round(m.dist) } }; }
      return null;
    },
  };
}

/**
 * Progress and the natural completion point (audit proposal 6): at least four long swells
 * (λ ≥ 0.6U), and either the thought ≥ 4·Z0 away for 5 s, or a dominant period ≥ 5 s held for
 * 10 s; then 2 s with no finger on the water. Progress is monotonic and moves only through
 * what the person's swells did.
 *   stroke({ lambdaU })     every released stroke
 *   update(dt, { dist|null, period, down })  → { p, complete }
 */
export function createOceanProgress(opts = {}) {
  const c = { long: 4, longLamU: 0.6, far: OCEAN.FAR, farHold: 5, period: 5, periodHold: 10, idle: 2, ...opts };
  let nLong = 0, farFor = 0, perFor = 0, idle = 0, p = 0, complete = false, maxD = 1, farDone = false, perDone = false;
  const out = { p: 0, complete: false };
  return {
    get long() { return nLong; },
    get farFor() { return farFor; },
    get periodFor() { return perFor; },
    get complete() { return complete; },
    stroke(e) { if (e.lambdaU >= c.longLamU) nLong++; },
    restore(s) { if (!s) return; nLong = s.n | 0; p = clamp(+s.p || 0, 0, 1); complete = !!s.c; maxD = Math.max(1, +s.d || 1); farDone = !!s.f; perDone = !!s.q; },
    snapshot() { return { n: nLong, p: round(p), c: complete ? 1 : 0, d: round(maxD), f: farDone ? 1 : 0, q: perDone ? 1 : 0 }; },
    update(dt, m) {
      if (m.dist != null) { maxD = Math.max(maxD, m.dist); farFor = m.dist >= c.far ? farFor + dt : 0; } else farFor = 0;
      perFor = m.period >= c.period ? perFor + dt : 0;
      if (farFor >= c.farHold) farDone = true;
      if (perFor >= c.periodHold) perDone = true;
      idle = m.down ? 0 : idle + dt;
      const pLong = Math.min(1, nLong / c.long);
      const pFar = m.dist != null ? (farDone ? 1 : 0.65 * clamp((maxD - 1) / (c.far - 1), 0, 1) + 0.35 * clamp(farFor / c.farHold, 0, 1)) : 0;
      const pPer = perDone ? 1 : clamp(perFor / c.periodHold, 0, 1);
      const raw = 0.5 * pLong + 0.5 * Math.max(pFar, pPer);
      p = Math.max(p, Math.min(0.99, raw));
      if (!complete && nLong >= c.long && (farDone || perDone) && idle >= c.idle) complete = true;
      if (complete) p = 1;
      out.p = p; out.complete = complete;
      return out;
    },
  };
}

function round(v) { return Math.round(v * 100) / 100; }
