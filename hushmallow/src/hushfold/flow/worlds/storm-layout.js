// Static Storm — where things go on screen (pure; node-tested).
//
// Top to bottom: the controls · the subtitle band (reserved by the director:
// no postcard, thought, hint or touch target ever sits in it, so every line,
// the discovery and the choices have a clear slot) · the play zone, where the
// postcards hang from the thunderheads and the Thought Mallow floats on its
// tether · Glitzi on the storm floor. Short phones and landscape also use the
// room beside Glitzi. planStormLayout() tries a few places for the thought and
// keeps the arrangement that gives the postcards the most size, never
// overlapping each other, the thought's words plate, Glitzi (with room for a
// hop) or the 20 px screen edges.
//
// Short screens (portrait, H ≤ SHORT_H): rather than seven tiny postcards
// crowding Glitzi, at most SHORT_MAX hang at once, each at least SHORT_S px;
// the others wait their turn and swap in as hanging ones ground (static-storm.js).
// plan.shown says how many hang (= plan.slots.length).

export const LAYOUT = Object.freeze({
  EDGE: 20,          // px kept clear at every screen edge (gestures)
  CARD_GAP: 7,       // px between postcards
  PAD: 6,            // px round the thought's body and plate
  SWING: 4,          // px of room for a postcard's swing under the band
  S_MIN: 40,         // smallest postcard (longest side, px)
  S_CAP: 150,        // largest postcard on big screens
  SHORT_H: 600,      // portrait screens this short or shorter hang fewer, larger postcards…
  SHORT_MAX: 5,      // …at most this many at once…
  SHORT_S: 64,       // …each at least this big (px, longest side); the rest wait their turn
  SHORT_S2: 50,      // …or, when a two-line words plate leaves less sky, at least this big
  LABEL_PX: 17, LABEL_LINE: 21.25, LABEL_PAD_X: 12, LABEL_PAD_Y: 8,   // the words plate (placeholders.js)
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Longest side of a postcard for n cards on a screen with U = min(W, H). */
export function cardSizeMax(n, U) { return Math.min(LAYOUT.S_CAP, U * (n <= 3 ? 0.26 : n <= 4 ? 0.23 : 0.2)); }

/** Free horizontal stretches of [x0, x1] in the row [y0, y1] once the obstacles are cut out. */
export function freeStretches(x0, x1, y0, y1, obs) {
  let iv = [[x0, x1]];
  for (const o of obs) {
    if (!o || o.y1 <= y0 || o.y0 >= y1) continue;
    const out = [];
    for (const [a, b] of iv) {
      if (o.x1 <= a || o.x0 >= b) { out.push([a, b]); continue; }
      if (o.x0 > a) out.push([a, o.x0]);
      if (o.x1 < b) out.push([o.x1, b]);
    }
    iv = out;
  }
  return iv;
}

/** n square slots of side s, in rows from the top of `area`, clear of `obs`; rows are balanced (7 → 4 + 3). */
export function placeSlots(n, s, obs, area, gap = LAYOUT.CARD_GAP) {
  const slots = [];
  let y = area.y0, guard = 0;
  while (slots.length < n && y + s <= area.y1 && guard++ < 600) {
    const iv = [];
    for (const [a, b] of freeStretches(area.x0, area.x1, y, y + s, obs)) { const k = Math.floor((b - a + gap) / (s + gap)); if (k > 0) iv.push({ a, b, k, m: 0 }); }
    let cap = 0; for (const q of iv) cap += q.k;
    if (!cap) { y += 4; continue; }
    const left = n - slots.length;
    const take = Math.min(cap, Math.ceil(left / Math.ceil(left / cap)));
    for (let m = 0; m < take; m++) {
      let best = null, room = -1;
      for (const q of iv) { if (q.m >= q.k) continue; const r2 = (q.b - q.a) / (q.m + 1); if (r2 > room) { room = r2; best = q; } }
      best.m++;
    }
    for (const q of iv) for (let i = 0; i < q.m; i++) slots.push({ x: q.a + ((q.b - q.a) * (i + 0.5)) / q.m, y: y + s / 2 });
    y += s + gap;
  }
  return slots.length >= n ? slots : null;
}

/**
 * The Thought Mallow's footprint at (x, y) with body radius r: its body (with the crackle
 * round it) and its words plate below (text up to labelW px, one or two lines) — or, when the
 * layer that draws the words measured the plate (P = { w, h, below }: ThoughtLayer.plateFor),
 * exactly that plate, hanging where the layer hangs it.
 */
export function thoughtRects(x, y, r, labelW, lines, textW, W, P = null) {
  const L = LAYOUT;
  const plateW = P ? P.w : Math.min(textW, labelW) + 2 * L.LABEL_PAD_X, plateH = P ? P.h : lines * L.LABEL_LINE + 2 * L.LABEL_PAD_Y;
  const py0 = P ? y + P.below : y + r * 0.98 + 8;
  // (centred under the body, held on the screen as the layer holds it)
  const edge = P && Number.isFinite(P.edge) ? P.edge : L.EDGE;
  const px0 = clamp(x - plateW / 2, edge, Math.max(edge, W - edge - plateW));
  const body = { x0: x - r * 1.35, y0: y - r * 1.35, x1: x + r * 1.35, y1: y + r * 1.25 };
  // (and what the layer draws of it there — effects included — as the storm keeps postcards off it in play: the circle
  // round that box, 4 px out)
  const E = P?.extent;
  if (E && E.x1 > E.x0 && E.y1 > E.y0) {
    const cx = x + (E.x0 + E.x1) / 2, cy = y + (E.y0 + E.y1) / 2, rc = Math.max(E.x1 - E.x0, E.y1 - E.y0) / 2 + 4;
    body.x0 = Math.min(body.x0, cx - rc); body.y0 = Math.min(body.y0, cy - rc); body.x1 = Math.max(body.x1, cx + rc); body.y1 = Math.max(body.y1, cy + rc);
  }
  const plate = { x0: px0, y0: py0, x1: px0 + plateW, y1: py0 + plateH };
  const all = { x0: Math.min(body.x0, plate.x0), y0: body.y0, x1: Math.max(body.x1, plate.x1), y1: plate.y1 };
  return { body, plate, all, top: body.y0, bottom: plate.y1 };
}

/**
 * plan = planStormLayout({ W, H, safe:{x,y,w,h}, band:{x,y,w,h}, mallow:{left,top,right,bottom,width,height}|null,
 *                          n, thought: { textW, plate?, keep? } | null })
 *   → { s, slots:[{x,y}], thought:{ name, x, y, r, labelW, lines, R, fit }|null, zone, band, mrect, floorBot, score }
 * thought.plate(maxW, lines, r) → { w, h, below, rows } | null: the words plate as the layer that draws them measures
 * it (one source of truth: ThoughtLayer.plateFor) — the plan is then laid round that very plate, and thought.fit
 * ({ lines, maxW }) is the budget to ask the layer for (th.labelFit). thought.keep {x0,y0,x1,y1}: where the layer's
 * words may never go (its hero keep-out); no plate is planned there.
 */
export function planStormLayout({ W, H, safe, band, mallow = null, n = 0, thought = null, allowShort = true }) {
  const L = LAYOUT, U = Math.min(W, H);
  band = band || { x: 0, y: Math.max(0, safe.y - 124), w: W, h: 118 };
  const mb = mallow && mallow.height > 20 && mallow.width > 20 ? mallow : null;
  const hop = mb ? Math.max(12, mb.height * 0.06) : 0;
  const zTop = Math.max(safe.y, band.y + band.h + 6);
  const zBot = Math.min(safe.y + safe.h, mb ? mb.top - hop : H * 0.62);
  const landscape = W > H * 1.05;
  // portrait: nothing below Glitzi's feet (the shell's dock lives there); landscape: the floor beside it
  const floorBot = landscape ? H - 28 : Math.min(H - 28, mb ? mb.bottom : H - 28);
  const mrect = mb ? { x0: mb.left - 12, y0: mb.top - hop, x1: mb.right + 12, y1: H } : null;
  n = Math.max(0, Math.min(7, n | 0));
  const sMax = cardSizeMax(n, U);
  const area = { x0: L.EDGE, x1: W - L.EDGE, y0: zTop + L.SWING, y1: floorBot };
  const cands = [];
  if (thought) {
    const tw = thought.textW || 0;
    const r0 = clamp(U * 0.085, 26, 44), r1 = Math.max(22, r0 * 0.82);
    const wide = Math.min(300, W - 64);
    // the words plate as the layer measures it, for a text budget (two lines at most) and body radius
    // (two lines when they fit; else one — the start of the words, cut at a word and marked "…": a tap reads them all)
    const measured = typeof thought.plate === 'function' ? (labelW, r, lines = 2) => {
      let P = null;
      try { P = thought.plate(Math.round(labelW + 2 * L.LABEL_PAD_X), lines, r); } catch { P = null; }
      return P && P.w > 0 && P.h > 0 && Number.isFinite(P.below) ? { ...P, budget: lines } : null;
    } : null;
    const keep = thought.keep && thought.keep.x1 > thought.keep.x0 && thought.keep.y1 > thought.keep.y0 ? thought.keep : null;
    const add = (name, x, anchor, labelW, r, penalty, lo = zTop, hi = zBot, floor = floorBot) => {
      if (!measured) return place(name, x, anchor, labelW, r, penalty, lo, hi, floor, null);
      // the layer's plate: two lines if they fit here, else one (a small penalty: fewer of the words show)
      if (place(name, x, anchor, labelW, r, penalty, lo, hi, floor, measured(labelW, r, 2))) return true;
      return place(`${name}-1`, x, anchor, labelW, r, penalty + 1.5, lo, hi, floor, measured(labelW, r, 1));
    };
    const place = (name, x, anchor, labelW, r, penalty, lo, hi, floor, P) => {
      if (measured && !P) return false;
      const lines = P ? Math.max(1, P.rows || 1) : tw > labelW ? 2 : 1;
      const plateH = P ? P.h : lines * L.LABEL_LINE + 2 * L.LABEL_PAD_Y;
      const below = (P ? P.below : 0.98 * r + 8) + plateH;
      // (the words never go where the layer keeps them off: a plate that would, sits higher, over it)
      let hiW = hi;
      if (keep && anchor !== 'top') {
        const pe = P && Number.isFinite(P.edge) ? P.edge : L.EDGE;
        const pw = P ? P.w : Math.min(tw, labelW) + 2 * L.LABEL_PAD_X, px0 = clamp(x - pw / 2, pe, Math.max(pe, W - pe - pw));
        if (px0 + pw > keep.x0 && px0 < keep.x1) hiW = Math.min(hi, keep.y0 - 1);
      }
      // (how far above its centre the thought reaches: its body, or what the layer draws of it)
      const up = -thoughtRects(x, 0, r, labelW, lines, tw, W, P).top;
      const y = anchor === 'top' ? lo + up : anchor === 'mid' ? (lo + hiW) / 2 - (below - up) / 2 : hiW - below;
      const R = thoughtRects(x, y, r, labelW, lines, tw, W, P);
      if (R.top < zTop - 0.5 || R.bottom > floor + 0.5) return false;
      // (the body keeps 20 px from the screen's sides; the words as near as the layer holds them)
      if (R.body.x0 < L.EDGE - 0.5 || R.body.x1 > W - L.EDGE + 0.5) return false;
      const pe = P && Number.isFinite(P.edge) ? P.edge : L.EDGE;
      if (R.plate.x0 < pe - 0.5 || R.plate.x1 > W - pe + 0.5) return false;
      if (mrect && R.all.y1 > mrect.y0 && R.all.x1 > mrect.x0 && R.all.x0 < mrect.x1) return false;
      if (keep && R.plate.y1 > keep.y0 && R.plate.y0 < keep.y1 && R.plate.x1 > keep.x0 && R.plate.x0 < keep.x1) return false;
      cands.push({ name, x, y, r, labelW, lines, R, penalty, fit: P ? { lines: P.budget, maxW: Math.round(labelW + 2 * L.LABEL_PAD_X), edge: P.edge } : null });
      return true;
    };
    if (landscape && mb) {
      const lw = mb.left - 12 - L.EDGE;
      if (lw > 140) {
        const x = L.EDGE + lw / 2, labelW = Math.min(300, lw - 24);
        // beside Glitzi there is floor below, not Glitzi: the words may go down to the bottom margin
        const low = H - 24;
        for (const [a, pen] of [['mid', 0], ['top', 0.5]]) { add(`side-${a}`, x, a, labelW, r0, pen, zTop, low, low); add(`side-${a}-small`, x, a, labelW, r1, pen + 2, zTop, low, low); add(`side-${a}-smallest`, x, a, labelW, 22, pen + 4, zTop, low, low); }
      }
    }
    for (const [r, pen] of [[r0, 0], [r1, 2]]) {
      const xl = clamp(W * 0.27, L.EDGE + r * 1.4, W - L.EDGE - r * 1.4);
      add('low-left', xl, 'low', wide, r, pen);
      add('top-left', xl, 'top', wide, r, pen + 0.5);
      add('top-centre', W / 2, 'top', wide, r, pen + 1);
    }
    if (!cands.length) {
      // nothing fits cleanly (a tiny window): small, straight under the band
      const r = r1, P = measured ? measured(wide, r, 1) : null, lines = P ? Math.max(1, P.rows || 1) : tw > wide ? 2 : 1, y = zTop + r * 1.35;
      cands.push({ name: 'fallback', x: W / 2, y, r, labelW: wide, lines, R: thoughtRects(W / 2, y, r, wide, lines, tw, W, P), penalty: 9, fit: P ? { lines: P.budget, maxW: Math.round(wide + 2 * L.LABEL_PAD_X), edge: P.edge } : null });
    }
  } else cands.push(null);
  // short portrait screens: fewer postcards at once, never below SHORT_S (the rest wait their turn)
  const short = allowShort && !landscape && H <= L.SHORT_H && n > 0;
  const counts = [];
  if (short) for (let k = Math.min(n, L.SHORT_MAX); k >= 1; k--) counts.push(k);
  else counts.push(n);
  // short screens try, in turn: under the clouds at ≥ SHORT_S; under the clouds at ≥ SHORT_S2
  // (a two-line words plate leaves less sky); then beside Glitzi too. Never the old seven-tiny way
  // unless nothing at all fits.
  const passes = short ? [[L.SHORT_S, false], [L.SHORT_S2, false], [L.SHORT_S2, true]] : [[L.S_MIN, true]];
  let best = null;
  for (const [sLo, besideOK] of passes) {
    for (const c of cands) {
      const obs = [];
      if (mrect) obs.push(mrect);
      // the thought's body and its words plate (postcards may sit beside the body on a short screen)
      if (c) for (const q of [c.R.body, c.R.plate]) obs.push({ x0: q.x0 - L.PAD, y0: q.y0 - L.PAD, x1: q.x1 + L.PAD, y1: q.y1 + L.PAD });
      for (const k of counts) {
        let s = Math.floor(short ? cardSizeMax(k, U) : sMax), slots = k ? null : [];
        // short screens hang them under the clouds (not on long ropes beside Glitzi, behind the words) when they can
        const ar = besideOK ? area : { ...area, y1: Math.min(area.y1, zBot) };
        for (; k && s >= sLo; s -= 1) { slots = placeSlots(k, s, obs, ar); if (slots) break; }
        let fits = true;
        if (!slots) {
          if (short) continue;                     // try fewer, larger postcards
          fits = false; s = L.S_MIN; slots = placeSlots(k, s, mrect ? [mrect] : [], area) || placeSlots(k, s, [], { ...area, y1: H - L.EDGE }) || [];
        }
        // prefer big postcards, then postcards under the clouds rather than beside Glitzi or the thought
        // (a postcard hung below the thought would have its rope running behind the person's words);
        // on a short screen, more postcards at once wins first
        let beside = 0, nearThought = 0, crossing = 0;
        for (const q of slots) {
          if (q.y + s / 2 > zBot) beside++;
          if (c && q.y + s / 2 > c.R.all.y0 && q.y - s / 2 < c.R.all.y1) nearThought++;
          if (c && q.y - s / 2 >= c.R.all.y1 - 1 && [c.R.body, c.R.plate].some((o) => q.x > o.x0 - 4 && q.x < o.x1 + 4)) crossing++;
        }
        const score = (k ? s : 0) + (short ? 40 * k : 0) - 3 * beside - 2 * nearThought - 4 * crossing - (c ? c.penalty : 0) - (fits ? 0 : 100);
        if (!best || score > best.score + 1e-6) best = { score, s, slots, thought: c, fits };
        if (short) break;                          // the most postcards that fit for this thought
      }
    }
    if (best) break;
  }
  if (!best) {
    // a short screen where not even one postcard fits: the old way (all, as large as they fit)
    return planStormLayout({ W, H, safe, band, mallow, n, thought, allowShort: false });
  }
  best.zone = { x: L.EDGE, y: zTop, w: W - 2 * L.EDGE, h: Math.max(0, zBot - zTop) };
  best.band = band; best.mrect = mrect; best.floorBot = floorBot;
  best.shown = best.slots.length; best.short = short;
  return best;
}
