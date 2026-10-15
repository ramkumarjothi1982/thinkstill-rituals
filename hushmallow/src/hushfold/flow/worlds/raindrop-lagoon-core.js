// Blubi's Raindrop Lagoon — the pure core: the feeling words a lagoon offers, where things hang
// on this screen, and the small state machines that decide what the person's hands really did
// (a drop looked into, a word given, two side by side, the quiet after) and when the lagoon is
// done. No DOM, no clock: feed update(dt, …) every frame. Node-tested (tests/raindrop-lagoon.test.mjs).
//
// Layout, top to bottom (portrait): the controls · the subtitle band (the director's: nothing of
// the world's ever sits in it) · the air over the lagoon, where the Thought Mallow hangs with the
// person's words above it and its "This is…" tag under it (or beside it, where the screen is
// short) · the hero Mallow on its cushion. Feeling drops hang in the room that is left — round the
// thought first, then down the open water beside the hero — and photos hang as glass orbs after
// them. Nothing overlaps; nothing comes within EDGE px of a side.

export const LAGOON = Object.freeze({
  HORIZON: 0.6,            // the realm's horizon line × H (REALM_HORIZON['raindrop-lagoon'])
  EDGE: 16,                // px clear at every side (gestures)
  GAP: 10,                 // px kept round the hero Mallow
  TOP_GAP: 8,              // px between the subtitle band and anything of the world's
  BOTTOM: 64,              // px kept clear at the bottom (the choice chips on a small phone)
  DROP_MIN: 46, DROP_MAX: 62, DROP_GAP: 14,     // a feeling drop's diameter (≥ 44 px target) and the room between drops
  ORB_K: 0.9,              // a photo orb's diameter × a drop's
  PLATE_MAX: 240,          // px: the person's words wrap rather than span the whole air
  PLATE_GAP: 4,            // px between the thought and its words plate (beyond what the plate itself keeps)
  LABEL_PX: 17, LABEL_LINE: 21.25, LABEL_PAD_X: 12, LABEL_PAD_Y: 8,     // the words plate (placeholders.js)
  TAG_PX: 16, TAG_LINE: 21, TAG_PAD_X: 14, TAG_PAD_Y: 8, TAG_GAP: 8,   // the "This is…" tag (two rows reserved)
  TAG_MAX: 236, TAG_SIDE_MIN: 118, TAG_SIDE_MAX: 196,
  // looking into a drop
  FOCUS_SEC: 1.1,          // a finger held still clears a drop in this long
  STILL_U: 0.14,           // × U per s: slower than this is "still"
  FOG_SEC: 0.9,            // a moving finger (≥ 0.8 U/s) fogs an unclear drop again in about this long
  GIVE_K: 0.6,             // a drop must be at least this clear to be given (else it floats back home)
  TAP_REVEAL_SEC: 1.2,     // a tapped drop clears by itself in this long
  // naming and the quiet after
  MAX_NAMED: 2,            // "if there are two, name both, side by side"
  QUIET_SEC: 8,            // seconds of sitting with a named feeling (no drop in hand) before the lagoon can finish
  MIN_PLAY_SEC: 25,        // never complete before this much play
  IDLE_SEC: 2,             // …and only after this long with no finger down
});

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

// ------------------------------------------------------------- the words --
/**
 * Every feeling word a lagoon can offer, in a fixed order: saved progress stores indices into this
 * list (numbers only, never words). Append only — never reorder.
 */
export const VOCAB = Object.freeze([
  'unsure', 'anger', 'hurt', 'frustration', 'embarrassment', 'resentment', 'impatience', 'disappointment',
  'tiredness', 'worry', 'dread', 'nervousness', 'unease', 'overwhelm', 'pressure', 'sadness', 'loneliness',
  'longing', 'emptiness', 'restlessness', 'boredom',
]);
export const UNSURE = 0;

/** The five feelings a lagoon offers for each of the person's feelings (plus "unsure", always). */
const OFFER = Object.freeze({
  angry: ['anger', 'hurt', 'frustration', 'embarrassment', 'resentment'],
  frustrated: ['frustration', 'impatience', 'disappointment', 'hurt', 'tiredness'],
  anxious: ['worry', 'dread', 'nervousness', 'unease', 'overwhelm'],
  overwhelmed: ['overwhelm', 'pressure', 'tiredness', 'worry', 'frustration'],
  sad: ['sadness', 'hurt', 'disappointment', 'loneliness', 'tiredness'],
  lonely: ['loneliness', 'longing', 'sadness', 'hurt', 'emptiness'],
  restless: ['restlessness', 'impatience', 'boredom', 'unease', 'frustration'],
  other: ['sadness', 'worry', 'frustration', 'tiredness', 'hurt'],
});

/**
 * The drops for a feeling: n vocabulary indices (2 ≤ n ≤ 6), the closest words first and "unsure"
 * always among them (last). Unknown feelings fall back to 'other'. Deterministic.
 */
export function feelingWords(emotion, n = 6) {
  const list = OFFER[emotion] || OFFER.other;
  const k = clamp(Math.round(n), 2, 6) - 1;
  return [...list.slice(0, k).map((w) => VOCAB.indexOf(w)), UNSURE];
}

/** "This is… worry" / "This is… worry · tiredness": the tag's rows for the named words (≤ 2 rows; [] when none). */
export function tagRows(named, fits = () => true) {
  const words = named.map((i) => VOCAB[i]).filter(Boolean);
  if (!words.length) return [];
  const one = `This is… ${words.join(' · ')}`;
  if (words.length === 1 || fits(one)) return [one];
  return [`This is… ${words[0]}`, `and ${words[1]}`];
}

// ------------------------------------------------------------- the layout --
/** The hero Mallow's box when the shell has not measured it yet (the Hushfold's world layout). */
export function defaultMallowBox(W, H) {
  const B = Math.max(130, Math.min(W * 0.58, H * 0.27, 300));
  const bottom = Math.min(H * 0.885, H - 76), top = bottom - B;
  return { left: W / 2 - B / 2, right: W / 2 + B / 2, top, bottom, width: B, height: B };
}

/** How far a drop's point reaches above the centre of its round part (× its diameter). */
export const TIP = 0.71;
const hits = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
const discHits = (x, y, r, b) => { const cx = x < b.x0 ? b.x0 : x > b.x1 ? b.x1 : x, cy = y < b.y0 ? b.y0 : y > b.y1 ? b.y1 : y; return (x - cx) ** 2 + (y - cy) ** 2 < r * r; };
const union = (a, b) => (!a ? { ...b } : !b ? { ...a } : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });

/**
 * Plan the screen.
 *   In:  { W, H, band:{y,h}, mallow (client box or null), freeW (the stage's free width, else W),
 *          plate: (maxW, lines) → {w, h, cut} | null — the person's words plate as it will be drawn (cut: only the start of
 *          the words fits; null: it does not fit at all),
 *          thought: whether there is a Thought Mallow (else a lily-pad cup takes its place), n (feeling drops),
 *          photos (orbs wanted) }
 *   Out: { U, r, D, hy, top, bottom, XR, K (the hero keep-out), thought:{x, y, r}, plate:{x0,y0,x1,y1,w,h,maxW,lines}|null,
 *          tag:{mode:'below'|'right'|'left', x0,y0,x1,y1, w, h}, cluster (the union), drops:[{x,y,D}], orbs:[{x,y,D}], fit }
 */
export function planLagoon({ W, H, band = null, mallow = null, freeW = 0, plate = null, thought = true, n = 6, photos = 0, textScale = 1 } = {}) {
  W = Math.max(200, W || 390); H = Math.max(240, H || 844);
  const U = Math.min(W, H);
  const XR = freeW > 0 ? Math.min(W, freeW) : W;
  const E = LAGOON.EDGE;
  const r0 = Math.round(clamp(0.08 * U, 22, 38));
  let r = r0;                       // (a variant may hang a smaller thought: see `shapes`)
  const D = Math.round(clamp(0.125 * U, LAGOON.DROP_MIN, LAGOON.DROP_MAX)), DROP = D;
  const hy = Math.round(H * LAGOON.HORIZON);
  const bandB = band ? (band.y || 0) + (band.h || 0) : 0;
  const top = bandB + LAGOON.TOP_GAP, bottom = H - LAGOON.BOTTOM;
  const M = mallow && mallow.width > 20 ? mallow : defaultMallowBox(W, H);
  const mw = (M.right ?? M.left + M.width) - M.left;
  const K = { x0: M.left + 0.05 * mw - LAGOON.GAP, x1: M.left + 0.95 * mw + LAGOON.GAP, y0: M.top - LAGOON.GAP, y1: (M.bottom ?? M.top + M.height) };
  const inner = XR - 2 * E;
  // (the tag's words grow with the person's text size: its reserved place grows with them)
  const tk = clamp(+textScale || 1, 1, 1.4);
  const tagHFor = (rows) => Math.ceil(rows * LAGOON.TAG_LINE * tk + 2 * LAGOON.TAG_PAD_Y);
  let tagRowsNow = 2, tagH = tagHFor(2);
  const tagWBelow = Math.min(Math.round(LAGOON.TAG_MAX * tk), inner);
  const tagWSide = Math.min(Math.round(clamp(Math.round(XR * 0.44), LAGOON.TAG_SIDE_MIN, LAGOON.TAG_SIDE_MAX) * tk), Math.round(inner * 0.6));
  const wMax = Math.min(LAGOON.PLATE_MAX, inner);
  const plates = thought && plate
    ? [{ maxW: wMax, lines: 2 }, { maxW: wMax, lines: 1 }, { maxW: Math.round(wMax * 0.66), lines: 2 }, { maxW: Math.round(wMax * 0.66), lines: 3 },
      // (a short, wide screen: the words on one wide line)
      ...(inner > wMax + 40 ? [{ maxW: Math.round(Math.min(inner, 2.2 * wMax)), lines: 1 }] : []), null]
    : [null];
  const needDrops = clamp(Math.round(n), 2, 6);
  const nOrbs = Math.max(0, Math.min(7, photos | 0));
  const DO = Math.round(D * LAGOON.ORB_K);

  /** The cluster for a thought centred at (cx, cy). */
  function clusterAt(cx, cy, P, mode) {
    const body = { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
    let pl = null;
    // (the plate is centred on its thought unless that would cross a side: then it slides in, as the handles hold it)
    if (P) { const y1 = cy - r - LAGOON.PLATE_GAP, x0 = clamp(cx - P.w / 2, E, Math.max(E, XR - E - P.w)); pl = { x0, x1: x0 + P.w, y0: y1 - P.h, y1, w: P.w, h: P.h, maxW: P.maxW, lines: P.lines }; }
    let tg;
    if (mode === 'below') tg = { x0: cx - tagWBelow / 2, x1: cx + tagWBelow / 2, y0: cy + r + LAGOON.TAG_GAP, y1: cy + r + LAGOON.TAG_GAP + tagH, w: tagWBelow, h: tagH };
    else if (mode === 'right') tg = { x0: cx + r + LAGOON.TAG_GAP, x1: cx + r + LAGOON.TAG_GAP + tagWSide, y0: cy - tagH / 2, y1: cy + tagH / 2, w: tagWSide, h: tagH };
    else tg = { x0: cx - r - LAGOON.TAG_GAP - tagWSide, x1: cx - r - LAGOON.TAG_GAP, y0: cy - tagH / 2, y1: cy + tagH / 2, w: tagWSide, h: tagH };
    const all = union(union(body, tg), pl);
    return { body, plate: pl, tag: { mode, rows: tagRowsNow, ...tg }, all, clash: !!pl && hits(pl, tg, 2) };
  }
  const inside = (b) => b.x0 >= E - 0.5 && b.x1 <= XR - E + 0.5 && b.y0 >= top - 0.5 && b.y1 <= bottom + 0.5;

  /** Every free place for something round, diameter d, given what is taken. */
  function candidates(d, taken, pad = 10) {
    const out = [];
    const step = Math.max(6, Math.round(d / 7));
    // (a drop is a teardrop: its point reaches TIP × d above the round part's centre)
    for (let y = top + TIP * d; y <= bottom - d / 2; y += step) {
      for (let x = E + d / 2; x <= XR - E - d / 2; x += step) {
        const b = { x0: x - d / 2, x1: x + d / 2, y0: y - TIP * d, y1: y + d / 2 };
        if (hits(b, K, LAGOON.GAP * 0.6)) continue;
        let ok = true;
        for (const t of taken) if (discHits(x, y, d / 2 + pad, t) || hits(b, t, Math.min(6, pad))) { ok = false; break; }
        if (ok) out.push(x, y);
      }
    }
    return out;
  }
  /** Greedy, deterministic: drops round the thought (in the air first), sides kept even, every pair DROP_GAP apart. */
  function pickSlots(cl, count, D = DROP, more = null, pad = 10) {
    const taken = cl ? [cl.all] : [];
    if (more) for (const p of more) taken.push({ x0: p.x - p.D / 2, y0: p.y - TIP * p.D, x1: p.x + p.D / 2, y1: p.y + p.D / 2 });
    const C = candidates(D, taken, pad);
    const cx = cl ? (cl.body.x0 + cl.body.x1) / 2 : XR / 2, cy = cl ? (cl.body.y0 + cl.body.y1) / 2 : (top + K.y0) / 2;
    const ring = Math.max(r * 2.6, D * 1.6);
    const picked = [];
    let left = 0, right = 0;
    const minD = D + LAGOON.DROP_GAP;
    for (let k = 0; k < count; k++) {
      let best = -1, bs = -Infinity;
      for (let q = 0; q < C.length; q += 2) {
        const x = C[q], y = C[q + 1];
        let near = Infinity, clash = false;
        const bx0 = x - D / 2, bx1 = x + D / 2, by0 = y - TIP * D, by1 = y + D / 2;
        for (const p of picked) {
          const dd = Math.hypot(p.x - x, p.y - y); if (dd < near) near = dd;
          const g = Math.min(8, pad);
        if (bx0 < p.x + D / 2 + g && bx1 > p.x - D / 2 - g && by0 < p.y + D / 2 + g && by1 > p.y - TIP * D - g) { clash = true; break; }
        }
        if (clash || near < (pad < 10 ? D + 6 : minD)) continue;
        const dist = Math.hypot(x - cx, y - cy);
        let s = -Math.abs(dist - ring) * 0.9;            // a loose ring round the thought
        s -= Math.max(0, dist - ring * 2.2) * 0.6;       // not scattered far away
        if (y < hy - D * 0.2) s += 40;                   // hanging in the air over the lagoon
        s += Math.min(near, minD * 2) * 0.35;            // spread out
        const side = x < XR / 2 ? -1 : 1;
        if (side < 0 && left > right) s -= 70 * (left - right);
        if (side > 0 && right > left) s -= 70 * (right - left);
        if (Math.abs(x - XR / 2) < D * 0.6 && y > cy) s -= 25; // not straight down the middle (the hero's column)
        if (s > bs) { bs = s; best = q; }
      }
      if (best < 0) break;
      const p = { x: Math.round(C[best]), y: Math.round(C[best + 1]), D };
      picked.push(p);
      if (p.x < XR / 2) left++; else right++;
    }
    return picked;
  }

  let best = null;
  const xs = [];
  const centreX = clamp((K.x0 + K.x1) / 2, E + r, XR - E - r);
  xs.push(centreX, XR / 2);
  // shapes, roomiest first: a two-row tag, then a one-row tag (it shrinks its type for two words), then a smaller thought
  const shapes = [{ rows: 2, r: r0 }, { rows: 1, r: r0 }, { rows: 1, r: Math.max(20, Math.round(r0 * 0.82)) }];
  const plateMemo = new Map();
  const plateAt = (spec) => { const k = `${spec.maxW}|${spec.lines}`; if (!plateMemo.has(k)) plateMemo.set(k, plate(spec.maxW, spec.lines)); return plateMemo.get(k); };
  plan: for (let si = 0; si < shapes.length; si++) {
  r = shapes[si].r; tagRowsNow = shapes[si].rows; tagH = tagHFor(tagRowsNow);
  for (let pi = 0; pi < plates.length; pi++) {
    const spec = plates[pi];
    const P = spec ? plateAt(spec) : null;
    if (spec && !P) continue;
    const PP = P ? { ...P, maxW: spec.maxW, lines: spec.lines } : null;
    const modes = ['below', 'right', 'left'];
    for (let mi = 0; mi < modes.length; mi++) {
      const mode = modes[mi];
      // where the cluster may go: over the hero (centred), else beside it
      const tries = [];
      for (const x of xs) tries.push({ x, over: true });
      tries.push({ x: null, over: false, side: -1 }, { x: null, over: false, side: 1 });
      for (let ti = 0; ti < tries.length; ti++) {
        const tr = tries[ti];
        // (sideways: the thought and its tag fix the extent — the plate slides in from a side; it is checked once placed)
        let cl = clusterAt(XR / 2, 0, PP, mode);
        const bt = union(cl.body, cl.tag);
        const wL = Math.max(XR / 2 - bt.x0, PP ? Math.min(PP.w / 2, XR / 2 - E) : 0), wR = bt.x1 - XR / 2, hT = -cl.all.y0, hB = cl.all.y1;
        let cx;
        if (tr.over) cx = clamp(tr.x, E + wL, XR - E - wR);
        else cx = tr.side < 0 ? (E + K.x0) / 2 - (wR - wL) / 2 : (K.x1 + XR - E) / 2 - (wR - wL) / 2;
        // vertically: over the hero, the room between the band and the hero's head (a little low, near Blubi); beside it, the air
        const yLo = top + hT, yHi = (tr.over ? K.y0 - 4 : bottom) - hB;
        if (yHi < yLo - 0.5) continue;
        // (beside the hero: level with its head, never sunk to the bottom of the screen)
        const cy = tr.over ? yLo + (yHi - yLo) * 0.62 : clamp(K.y0 + r, yLo, yHi);
        cl = clusterAt(cx, cy, PP, mode);
        if (!inside(cl.all) || hits(cl.all, K, 2) || cl.clash) continue;
        const drops = pickSlots(cl, needDrops);
        // (a thought without its words plate is only ever the last resort: the person's words always show)
        // (and a plate that shows the person's words whole: one that has to cut them short only when nothing else fits)
        const ok = drops.length >= needDrops && !(thought && plate && !PP) && !PP?.cut;
        // (every feeling drop first; photo orbs are welcome, never at the cost of the tag under the thought or a wide plate)
        const score = (ok ? 1000 : drops.length * 10) - si * 70 - pi * 40 - mi * 60 - ti * 15 - (thought && plate && !PP ? 5000 : 0) - (PP?.cut ? 300 : 0);
        if (!best || score > best.score) best = { score, cl, drops, ok, cx, cy, pi, mode, r };
        if (ok && pi === 0 && mi === 0) break plan;
      }
    }
  }
  // (a shape that shows everything whole is never passed over for a smaller one)
  if (best?.ok) break;
  }
  if (best) r = best.r;
  if (!best) {
    // nothing fits as planned (an extreme screen): the thought without a plate, its tag under it, in the air over the hero
    const cx = clamp(XR / 2, E + tagWBelow / 2, XR - E - tagWBelow / 2);
    const cy = clamp(K.y0 - 4 - r - LAGOON.TAG_GAP - tagH, top + r, Math.max(top + r, bottom - r));
    const cl = clusterAt(cx, cy, null, 'below');
    best = { score: 0, cl, drops: pickSlots(cl, needDrops), ok: false, cx, cy, pi: -1, mode: 'below', r };
  }
  const drops = best.drops.slice(0, needDrops);
  // the photo orbs: in the room the drops left, a little smaller (photos that find no place wait their turn)
  // (a small screen: smaller glass drops rather than none — their touch target keeps a 12 px margin)
  let orbs = [];
  if (nOrbs) for (const d of [DO, Math.round(D * 0.72), Math.max(28, Math.round(D * 0.6))]) { orbs = pickSlots(best.cl, nOrbs, d, drops, d < DO ? 4 : 10).map((p) => ({ x: p.x, y: p.y, D: d })); if (orbs.length) break; }
  return {
    U, r, D, hy, top, bottom, XR, K, band: band ? { x: 0, y: band.y || 0, w: W, h: band.h || 0 } : null,
    thought: { x: Math.round(best.cx), y: Math.round(best.cy), r },
    plate: best.cl.plate, tag: best.cl.tag, cluster: best.cl.all, drops, orbs, fit: best.ok,
  };
}

// ------------------------------------------------------- looking into a drop --
/**
 * One drop in the hand. A finger held still clears it (FOCUS_SEC); moving fogs it again — until
 * the word has come fully clear once (latched): from then on it can be carried. A tap reveals it
 * by itself (TAP_REVEAL_SEC). update() returns the clarity 0..1.
 */
export function createFocus({ U = 390 } = {}) {
  let k = 0, latched = false, stillSec = 0, peak = 0, held = false, tapped = false;
  return {
    get k() { return k; }, get latched() { return latched; }, get stillSec() { return stillSec; }, get peak() { return peak; },
    get giveable() { return latched || k >= LAGOON.GIVE_K; },
    setU(u) { U = u; },
    hold() { held = true; tapped = false; },
    tap() { tapped = true; held = false; },
    let() { held = false; },
    reset() { k = 0; latched = false; stillSec = 0; peak = 0; held = false; tapped = false; },
    /** Back on its thread: the frost comes over it again (it can be looked into again). */
    fade() { held = false; tapped = false; latched = false; stillSec = 0; peak = 0; },
    update(dt, speed = 0) {
      if (tapped) k += dt / LAGOON.TAP_REVEAL_SEC;
      else if (held) {
        const v = speed / Math.max(1, U);
        if (v < LAGOON.STILL_U) { k += dt / LAGOON.FOCUS_SEC; stillSec += dt; }
        else if (!latched) k -= (dt / LAGOON.FOG_SEC) * clamp((v - LAGOON.STILL_U) / 0.66);
      } else if (!latched) k -= dt / 0.8;
      k = clamp(k);
      if (k >= 1) latched = true;
      if (latched) k = 1;
      if (k > peak) peak = k;
      return k;
    },
  };
}

// ---------------------------------------------------------------- naming --
/** The words given to the thought (≤ MAX_NAMED, oldest first). A third replaces the oldest, which floats back. */
export function createNaming() {
  const list = [];
  const ever = new Set();
  return {
    get list() { return list.slice(); },
    get count() { return list.length; },
    get ever() { return [...ever]; },
    has(i) { return list.includes(i); },
    /** Give word i: { added, replaced (an index that floats back) | null }. */
    add(i) {
      if (!Number.isInteger(i) || i < 0 || i >= VOCAB.length) return { added: false, replaced: null };
      if (list.includes(i)) return { added: false, replaced: null };
      let replaced = null;
      if (list.length >= LAGOON.MAX_NAMED) replaced = list.shift();
      list.push(i); ever.add(i);
      return { added: true, replaced };
    },
    remove(i) { const k = list.indexOf(i); if (k < 0) return false; list.splice(k, 1); return true; },
    snapshot() { return { l: list.slice(), e: [...ever] }; },
    restore(s) {
      list.length = 0; ever.clear();
      for (const i of s?.e || []) if (Number.isInteger(i) && i >= 0 && i < VOCAB.length) ever.add(i);
      for (const i of s?.l || []) if (Number.isInteger(i) && i >= 0 && i < VOCAB.length && list.length < LAGOON.MAX_NAMED && !list.includes(i)) { list.push(i); ever.add(i); }
    },
  };
}

// ----------------------------------------------------------- discoveries --
/**
 * 'named': the first word the person gave the thought after looking into its drop (it came clear
 * through stillness, or a tap) — "You gave it a word." is literally true then. 'both': two different
 * words held side by side at once. Each fires once.
 */
export function createNamingDetector() {
  const fired = new Set();
  return {
    get fired() { return [...fired]; },
    markFired(id) { fired.add(id); },
    /** A word was given: { looked (it came clear), stillSec, count (named now) } → a discovery or null. */
    given({ looked = false, stillSec = 0, count = 0 } = {}) {
      if (!looked) return null;
      if (!fired.has('named')) { fired.add('named'); return { id: 'named', evidence: { stillSec: Math.round(stillSec * 10) / 10, count } }; }
      if (count >= 2 && !fired.has('both')) { fired.add('both'); return { id: 'both', evidence: { count } }; }
      return null;
    },
  };
}

// --------------------------------------------------------------- progress --
/**
 * Progress (monotonic, 0..1) is only what the person did: a drop looked into, a word given, a
 * second one, and the quiet of sitting with a named feeling. Complete: a word given and kept, and
 * QUIET_SEC of quiet with it, after MIN_PLAY_SEC of play, then IDLE_SEC with no finger down.
 */
export function createLagoonProgress() {
  let p = 0, played = 0, quiet = 0, idle = 0, looked = false, named = false, both = false, complete = false, touched = false;
  const out = { p: 0, complete: false, quiet: 0, played: 0 };
  return {
    get p() { return p; }, get complete() { return complete; }, get quiet() { return quiet; }, get played() { return played; },
    touch() { touched = true; },
    look() { looked = true; },
    name(count = 1) { named = true; if (count >= 2) both = true; },
    /** m: { down (a finger on the lagoon), holding (a drop in hand), named (words kept now) } */
    update(dt, { down = false, holding = false, named: kept = 0 } = {}) {
      if (touched) played += dt;
      idle = down ? 0 : idle + dt;
      if (kept > 0 && !holding) quiet += dt * (down ? 0.5 : 1);
      // (every word given back: the quiet starts again with the next one — "8 s of quiet with it")
      else if (kept === 0) quiet = 0;
      let q = touched ? 0.06 : 0;
      if (looked) q = 0.2;
      if (named) q = 0.5 + (both ? 0.06 : 0) + 0.36 * clamp(quiet / LAGOON.QUIET_SEC);
      p = Math.max(p, Math.min(0.97, q));
      if (!complete && named && kept > 0 && quiet >= LAGOON.QUIET_SEC && played >= LAGOON.MIN_PLAY_SEC && idle >= LAGOON.IDLE_SEC) complete = true;
      if (complete) p = 1;
      out.p = p; out.complete = complete; out.quiet = quiet; out.played = played;
      return out;
    },
    snapshot() { return { p: Math.round(p * 1000) / 1000, q: Math.round(quiet * 10) / 10, t: Math.round(played), l: looked ? 1 : 0, n: named ? 1 : 0, b: both ? 1 : 0, c: complete ? 1 : 0 }; },
    restore(s) {
      if (!s || typeof s !== 'object') return;
      p = clamp(+s.p || 0); quiet = Math.max(0, +s.q || 0); played = Math.max(0, +s.t || 0);
      looked = !!s.l; named = !!s.n; both = !!s.b; complete = !!s.c; touched = played > 0 || looked;
      if (complete) p = 1;
    },
  };
}
