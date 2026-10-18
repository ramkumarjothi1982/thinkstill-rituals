// Boppo's Sunpop Orchard — the pure core (no DOM, no clock; node-tested in tests/sunpop-orchard.test.mjs).
//
//   planOrchard()            the screen: the swing (the person's thought and its words), the crown of lights round
//                            it, and up to seven sunpops hanging down the two trees at the sides — the subtitle band,
//                            the hero, the thought and its words always clear, every sunpop ≥ 44 px to touch;
//   Fruit / stepFruit()      a sunpop on its stem: a bud that grows, ripens only while it is warmed (a finger held
//                            gently on or near it), wobbles on its stem when poked, and never un-ripens;
//   heatFor()                how much a finger warms a sunpop: held still or moving slowly, near it (or, more slowly,
//                            from anywhere — nothing needs a precise target); quick movement warms nothing;
//   tensionFor()             the thought's own tension, eased only by the warmth the person gives it (never by time);
//   detectors + progress     'gentle-hands' (quick pokes made a sunpop wobble, then a gentle hold ripened one),
//                            'kinder' / 'kinder-light' (sunpops given to the thought, and it really did soften), and
//                            natural completion.

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export const ORCHARD = Object.freeze({
  EDGE: 20,            // px: nothing the person needs is nearer the screen edge than this
  GAP: 10,             // px between things that must not touch
  HOP: 14,             // px above the hero kept free for its hop
  D_MAX: 60, D_MIN: 46,
  HIT_MIN: 24,         // px: a sunpop's touch radius is at least this (a 48 px target)
  N_MAX: 7, N_MIN: 4,
  STEM: 16,            // px of stem above a sunpop
  R_MIN: 24, R_MAX: 40,
  PLATE_GAP: 12,       // px from the thought's body to the top of its words plate
  PLATE_MAX: 236,      // px: the widest words plate (two lines)
  LABEL_LINE: 21.25, LABEL_PAD_X: 12, LABEL_PAD_Y: 8,
  ROPE_MIN: 30, ROPE_SHORT: 14,   // px of rope above the thought (less on a short screen)
  CROWN_GAP: 15,       // px from the thought's body to the centre of its crown of lights
  LANTERN: 15,         // px: a given sunpop's light in the crown
  CROWN_N: 7,
  // touch (speeds are the director's path speeds, × U per second)
  STILL_U: 0.09, SLOW_U: 0.65, BRISK_U: 1.5,
  HOLD_DELAY: 0.2,     // s a finger rests before it starts warming (a quick tap warms nothing)
  TAP_SEC: 0.26, TAP_PX: 14,
  RIPEN_SEC: 1.7,      // s of a gentle hold on a sunpop to ripen it
  FAR_RATE: 0.38,      // …from anywhere (the nearest bud), at this share of the rate
  SLOW_RATE: 0.6,      // …while moving slowly
  REACH: 0.2,          // × U: a hold this close to a sunpop warms it fully
  GROW_SEC: 1.6, REGROW_SEC: 6.5,
  // the thought
  RELIEF_PER: 0.12, RELIEF_MAX: 0.66, HAND_MAX: 0.1, FLOOR: 0.12,
  // completion
  NEED: 5, MIN_PLAY: 30, IDLE_SEC: 2, NEED_ANYWAY: 9,
});

/** A box { x0, y0, x1, y1 } from a client rect (or null). */
function boxOf(r) {
  if (!r || !(r.width > 20) || !(r.height > 20)) return null;
  const left = r.left ?? r.x, top = r.top ?? r.y;
  return { x0: left, y0: top, x1: r.right ?? left + r.width, y1: r.bottom ?? top + r.height };
}
const discBox = (x, y, r, b) => { const cx = clamp(x, b.x0, b.x1), cy = clamp(y, b.y0, b.y1); return (x - cx) ** 2 + (y - cy) ** 2 < r * r; };
export const boxesOverlap = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

/** The thought's radius on this screen. */
export const thoughtRadius = (W, H) => clamp(Math.round(0.087 * Math.min(W, H)), ORCHARD.R_MIN, ORCHARD.R_MAX);

/** The plate the words need: ≤ `lines` lines of textW px (an estimate when nothing measured it). */
export function plateSize(textW, lines = 2) {
  const n = Math.max(1, Math.min(2, lines));
  return { w: Math.ceil(Math.min(ORCHARD.PLATE_MAX, textW + 2 * ORCHARD.LABEL_PAD_X)), h: Math.ceil(n * ORCHARD.LABEL_LINE + 2 * ORCHARD.LABEL_PAD_Y), lines: n };
}

/**
 * The screen. In: { W, H, band {x,y,w,h}, mallow (the hero's rest rect, client px), x1 (the stage's free width),
 * plate {w, h} (null: no words), r (the thought's radius; default thoughtRadius), thought: false (no thought) }.
 * Out: { cx, thought {x, y, r}, plate {x0,y0,x1,y1} | null, ropes {xl, xr, y0, y1}, crown [{x, y}], slots
 *        [{x, y, D, side, ax, ay}], D, rects {band, hero, zone, plate}, fits (the words fit between band and hero),
 *        short (ropes shortened to fit), arbour {x0, x1}, ground }
 */
export function planOrchard({ W, H, band = null, mallow = null, x1 = W, plate = null, r = null, thought = true } = {}) {
  const E = ORCHARD.EDGE, G = ORCHARD.GAP;
  const XR = Math.min(W, Number.isFinite(x1) && x1 > 0 ? x1 : W);
  const bandB = band ? band.y + band.h : Math.round(H * 0.24);
  // the hero (where the shell puts it, as in a world): its keep-out has room for its hop
  let M = boxOf(mallow);
  if (!M) {
    const B = Math.max(130, Math.min(W * 0.58, H * 0.27, 300)), bottom = Math.min(H * 0.885, H - 76);
    M = { x0: W / 2 - B / 2, y0: bottom - B, x1: W / 2 + B / 2, y1: bottom };
  }
  const mw = M.x1 - M.x0;
  const hero = { x0: M.x0 + 0.05 * mw - G, x1: M.x1 - 0.05 * mw + G, y0: M.y0 - ORCHARD.HOP - G, y1: M.y1 };
  const cx = Math.round(XR / 2);
  // the arbour: two trees at its sides (on a wide screen, not at the far edges of the window)
  const aw = Math.min(XR, Math.max(360, 1.15 * H));
  const arbour = { x0: Math.round(cx - aw / 2), x1: Math.round(cx + aw / 2) };

  // ---- the swing: the thought under the band, its words under it, both clear of the hero. Above the hero when there
  // is room (a phone held upright); else beside it, on the wider side (a phone on its side)
  let rr = r ?? thoughtRadius(W, H);
  const P = thought && plate ? { w: Math.min(plate.w, XR - 2 * E), h: plate.h } : null;
  const need = (rad) => 2 * rad + (P ? ORCHARD.PLATE_GAP + P.h : 0);
  let tx = cx, yBot = hero.y0;
  let rope = ORCHARD.ROPE_MIN, short = false, fits = true, beside = false;
  if (thought && yBot - (bandB + ORCHARD.ROPE_SHORT) < need(ORCHARD.R_MIN)) {
    const wl = hero.x0 - E, wr = XR - E - hero.x1, w = Math.max(wl, wr);
    const wNeed = Math.max(2 * (rr + ORCHARD.CROWN_GAP + ORCHARD.LANTERN), P ? P.w : 0);
    if (w >= Math.min(wNeed, 2 * (ORCHARD.R_MIN + ORCHARD.CROWN_GAP + ORCHARD.LANTERN))) {
      beside = true;
      tx = Math.round(wl >= wr ? E + wl / 2 : hero.x1 + wr / 2);
      yBot = H - 10;
    }
  }
  let avail = yBot - (bandB + rope);
  if (thought && avail < need(rr)) { short = true; rope = ORCHARD.ROPE_SHORT; avail = yBot - (bandB + rope); }
  while (thought && avail < need(rr) && rr > ORCHARD.R_MIN) rr -= 1;
  // still too tall (long words on the smallest phone): the words may use the room kept for the hero's hop, never its body
  let tight = false;
  if (thought && avail < need(rr) && !beside) { tight = true; yBot = M.y0 - 4; avail = yBot - (bandB + rope); }
  if (thought && avail < need(rr)) fits = false;
  const spare = Math.max(0, avail - need(rr));
  const ty = Math.round(bandB + rope + rr + spare * 0.36);
  let plateBox = null;
  if (P) {
    const x0 = clamp(tx - P.w / 2, E, XR - E - P.w);
    plateBox = { x0, y0: ty + rr + ORCHARD.PLATE_GAP, x1: x0 + P.w, y1: ty + rr + ORCHARD.PLATE_GAP + P.h };
  }
  const ropes = { xl: tx - rr * 1.02, xr: tx + rr * 1.02, y0: bandB, y1: ty + rr * 0.82 };

  // ---- the crown of lights round the thought's head (never down over its words)
  const crown = [];
  const cr = rr + ORCHARD.CROWN_GAP, half = ORCHARD.LANTERN / 2;
  for (const deg of [270, 243, 297, 216, 324, 192, 348, 170, 10]) {
    if (crown.length >= ORCHARD.CROWN_N) break;
    const a = (deg * Math.PI) / 180, x = tx + Math.cos(a) * cr, y = ty + Math.sin(a) * cr;
    if (y - half < bandB + 3 || x - half < E || x + half > XR - E) continue;
    if (plateBox && y + half > plateBox.y0 - 2) continue;
    crown.push({ x, y, a });
  }

  // ---- what the sunpops keep clear of: the swing's column (its ropes, crown and the air under it), the words, the
  // hero, the band. Sunpops hang from the trees at the sides, never out in the middle.
  const zoneHalf = thought ? rr + ORCHARD.CROWN_GAP + half + G : 0;
  const zone = thought ? { x0: tx - zoneHalf, x1: tx + zoneHalf, y0: bandB, y1: beside ? ty + rr + G : Math.max(hero.y0, ty + rr + G) } : null;
  const blocked = [hero];
  if (zone) blocked.push(zone);
  if (plateBox) blocked.push({ x0: plateBox.x0 - G, y0: plateBox.y0 - G, x1: plateBox.x1 + G, y1: plateBox.y1 + G });
  // (not down among the hero's feet: the lowest sunpop hangs by its middle — unless a small screen needs the room)
  let ground = Math.min(H - 8, Math.max(M.y1 - 0.28 * (M.y1 - M.y0), H * 0.72));
  let best = { slots: [], D: ORCHARD.D_MIN };
  for (const gy of [ground, Math.min(H - 8, M.y1), H - 12]) {
    if (gy < ground) continue;
    for (let D = ORCHARD.D_MAX; D >= ORCHARD.D_MIN; D -= 2) {
      const slots = pickSlots({ D, cx, XR, E, G, bandB, ground: gy, blocked, arbour });
      if (slots.length > best.slots.length) best = { slots, D, ground: gy };
      if (slots.length >= ORCHARD.N_MAX) break;
    }
    if (best.slots.length >= ORCHARD.N_MIN) break;
  }
  if (best.ground) ground = best.ground;
  const slots = best.slots.map((s) => {
    const side = s.x < cx ? -1 : 1;
    return { ...s, side, ax: s.x - side * s.D * 0.12, ay: s.y - s.D / 2 - ORCHARD.STEM };
  });
  // top to bottom, left then right: a stable order (a re-plan keeps each sunpop on its side)
  slots.sort((a, b) => a.side - b.side || a.y - b.y);
  return {
    W, H, x1: XR, cx, bandB, arbour, ground, short, fits, beside, tight,
    thought: thought ? { x: tx, y: ty, r: rr } : null, plate: plateBox, ropes: thought ? ropes : null, crown,
    slots, D: best.D,
    rects: { band: band ? { x0: band.x, y0: band.y, x1: band.x + band.w, y1: bandB } : { x0: 0, y0: 0, x1: W, y1: bandB }, hero, zone, plate: plateBox },
  };
}

/** Farthest-point picking of sunpop places down both sides, alternating sides, ≥ D + GAP apart. */
function pickSlots({ D, cx, XR, E, G, bandB, ground, blocked, arbour }) {
  const R = D / 2, step = Math.max(8, Math.round((D + G) / 3));
  const yMin = bandB + G + ORCHARD.STEM + R, yMax = ground - R;
  const xMin = Math.max(E, arbour.x0 + E) + R, xMax = Math.min(XR - E, arbour.x1 - E) - R;
  const cands = [[], []];
  // (a grid mirrored about the middle: both trees get the same places when the screen is symmetric)
  for (let y = yMin; y <= yMax; y += step) {
    for (let o = Math.min(cx - xMin, xMax - cx); o > 0; o -= step) {
      for (const x of [cx - o, cx + o]) {
        if (blocked.some((b) => discBox(x, y, R + G / 2, b))) continue;
        cands[x < cx ? 0 : 1].push({ x, y });
      }
    }
  }
  const out = [];
  const far = (c) => { let m = Infinity; for (const o of out) m = Math.min(m, Math.hypot(c.x - o.x, c.y - o.y)); return m; };
  // the first on each side: the outermost, highest place (a sunpop just under the canopy)
  const seed = (list) => list.reduce((b, c) => (!b || Math.abs(c.x - cx) > Math.abs(b.x - cx) + 1 || (Math.abs(Math.abs(c.x - cx) - Math.abs(b.x - cx)) <= 1 && c.y < b.y) ? c : b), null);
  for (const list of cands) { const s = seed(list); if (s && far(s) >= D + G) out.push({ x: s.x, y: s.y, D }); }
  let side = 0, misses = 0;
  while (out.length < ORCHARD.N_MAX && misses < 2) {
    let pick = null, pd = -1;
    for (const c of cands[side]) {
      const d = far(c);
      if (d < D + G) continue;
      // spread out, but keep near the sides (a sunpop hangs from its tree, not out in the middle)
      const score = Math.min(d, 2.2 * D) - 0.35 * Math.abs(c.x - (side ? xMax : xMin));
      if (score > pd) { pd = score; pick = c; }
    }
    if (pick) { out.push({ x: pick.x, y: pick.y, D }); misses = 0; } else misses++;
    side = 1 - side;
  }
  return out;
}

// ---------------------------------------------------------------- sunpops --
/** A sunpop on its stem. state: 'grow' → 'bud' → 'ripe' (then the world gives it away) → 'gone' → 'grow'. */
export function createFruit(slot, o = {}) {
  return {
    x: slot.x, y: slot.y, D: slot.D, ax: slot.ax, ay: slot.ay, side: slot.side,
    state: o.state || 'grow', grow: o.grow ?? 0, ripe: clamp(o.ripe ?? 0), warm: 0, heat: 0, wob: 0, wobV: 0, regrow: 0,
    photo: o.photo ?? -1, heldBy: -1, ripenedBy: null, pokes: 0,
  };
}

/**
 * One step of a sunpop. heat: 0..1 (how much it is being warmed now, heatFor's best finger), via: 'near' | 'far' |
 * 'slow' | null. Returns 'ripened' the step it ripens, 'grown' when a bud is ready, else null. Ripeness never goes down.
 */
export function stepFruit(f, dt, heat = 0, via = null, rm = false) {
  let ev = null;
  // the stem spring (a poke wobbles it; it settles in about a second, faster under reduced motion)
  const k = rm ? 90 : 40, c = rm ? 18 : 5.5;
  f.wobV += (-k * f.wob - c * f.wobV) * dt;
  f.wob = clamp(f.wob + f.wobV * dt, -0.6, 0.6);
  if (f.state === 'gone') {
    f.regrow -= dt;
    if (f.regrow <= 0) { f.state = 'grow'; f.grow = 0; f.ripe = 0; f.ripenedBy = null; }
    f.heat = 0;
    return null;
  }
  if (f.state === 'grow') {
    f.grow = Math.min(1, f.grow + dt / ORCHARD.GROW_SEC);
    if (f.grow >= 1) { f.state = 'bud'; ev = 'grown'; }
  }
  f.heat = heat;
  // the warm glow follows the heat softly (it shows the warming before the colour turns)
  f.warm += ((heat > 0 ? 0.35 + 0.65 * heat : 0) - f.warm) * (1 - Math.exp(-dt / 0.25));
  if (f.state === 'bud' && heat > 0) {
    f.ripe = Math.min(1, f.ripe + (heat * dt) / ORCHARD.RIPEN_SEC);
    if (f.ripe >= 1) { f.state = 'ripe'; f.ripenedBy = via; ev = 'ripened'; }
  }
  return ev;
}

/** A quick poke: the sunpop wobbles on its stem (bounded); nothing else changes. */
export function pokeFruit(f, dir = 1, strength = 1, rm = false) {
  f.wobV = clamp(f.wobV + dir * (rm ? 1.2 : 3.4) * clamp(strength, 0.3, 1.5), -9, 9);
  f.pokes++;
}

/** The sunpop leaves its stem (given away): it regrows after a while. */
export function pickFruit(f) { f.state = 'gone'; f.regrow = ORCHARD.REGROW_SEC; f.ripe = 0; f.warm = 0; f.heldBy = -1; }

/**
 * How a finger warms: { mode, heat } for a finger at distance d (px) from a sunpop's centre.
 * finger: { held (s resting), speedU (× U per second) }. Still (after HOLD_DELAY) → 'still', slow → 'slow', quick → none.
 */
export function heatFor(finger, d, D, U) {
  const sp = finger.speedU ?? 0;
  if (sp >= ORCHARD.SLOW_U) return { mode: 'brisk', heat: 0 };
  const still = sp < ORCHARD.STILL_U && (finger.held ?? 0) >= ORCHARD.HOLD_DELAY;
  if (!still && sp < ORCHARD.STILL_U) return { mode: 'settling', heat: 0 };
  const reach = Math.max(D * 0.75, ORCHARD.REACH * U);
  const near = d <= reach;
  const base = still ? 1 : ORCHARD.SLOW_RATE;
  const heat = near ? base : base * ORCHARD.FAR_RATE * clamp(1 - (d - reach) / (1.6 * U), 0.5, 1);
  return { mode: still ? 'still' : 'slow', heat, near };
}

// --------------------------------------------------------------- thought --
/** The thought's tension: its own (t0), eased only by the warmth given (relief 0..RELIEF_MAX + hand), never below FLOOR. */
export function tensionFor(t0, relief) {
  const base = clamp(t0, ORCHARD.FLOOR, 0.95);
  const k = clamp(relief / ORCHARD.RELIEF_MAX);
  return base - (base - ORCHARD.FLOOR) * k * 0.92;
}
/** Relief from n sunpops given and a kind hand (s of holding still on the thought), capped. */
export function reliefFor(given, hand = 0) {
  return Math.min(ORCHARD.RELIEF_MAX, given * ORCHARD.RELIEF_PER + Math.min(ORCHARD.HAND_MAX, hand * 0.02));
}

// ------------------------------------------------------------- discoveries --
/**
 * 'gentle-hands': quick pokes that made sunpops wobble (≥ pokes of them), then — within withinSec of the last poke — a
 * gentle hold (still or slow, near) that ripened one of the sunpops that was poked (poked: false → not this one). Literally: "Quick pokes made it wobble. A gentle hold
 * ripened it."
 * events: poke() when a poke wobbled a sunpop; ripened({ via }) when one ripened. update(dt) → null | { id, evidence }.
 */
export function createGentleHandsDetector({ pokes = 2, withinSec = 20 } = {}) {
  let n = 0, since = Infinity, fired = false, out = null;
  return {
    get fired() { return fired; },
    markFired() { fired = true; },
    poke() { if (fired) return; n++; since = 0; },
    ripened({ via, poked = true } = {}) {
      if (fired || n < pokes || since > withinSec || !poked) return;
      if (via !== 'near' && via !== 'still' && via !== 'slow') return;
      fired = true;
      out = { id: 'gentle-hands', evidence: { pokes: n, afterSec: Math.round(since * 10) / 10 } };
    },
    update(dt) {
      since += dt;
      if (since > withinSec && !fired) n = 0;
      const o = out; out = null; return o;
    },
  };
}

/**
 * 'kinder' (with a thought): at least `given` sunpops have reached the thought, and its tension really eased from where
 * it started (by ≥ min(0.15, 0.35 · its room to ease)). 'kinder-light' (no thought): `given` sunpops warmed the swing.
 * update(dt, { given, tension, t0, hasThought }) → null | { id, evidence } once.
 */
export function createKinderDetector({ given: need = 3 } = {}) {
  let fired = false;
  return {
    get fired() { return fired; },
    markFired() { fired = true; },
    update(dt, m) {
      if (fired || (m.given || 0) < need) return null;
      if (m.hasThought) {
        const room = Math.max(0, (m.t0 ?? 0.5) - ORCHARD.FLOOR), eased = (m.t0 ?? 0.5) - (m.tension ?? 0.5);
        if (eased < Math.min(0.15, 0.35 * room) - 1e-9) return null;
        fired = true;
        return { id: 'kinder', evidence: { given: m.given, before: Math.round((m.t0 ?? 0) * 100) / 100, after: Math.round((m.tension ?? 0) * 100) / 100 } };
      }
      fired = true;
      return { id: 'kinder-light', evidence: { given: m.given } };
    },
  };
}

/**
 * Progress and natural completion. Progress is only what the person gave (and a little time spent); it never goes
 * down. Complete: ≥ NEED sunpops given, ≥ MIN_PLAY s of play and the 'kinder' discovery (or NEED_ANYWAY given), then
 * IDLE_SEC with every finger lifted.
 * update(dt, { given, playing (a finger has touched), down, kinder }) → { p, complete }.
 */
export function createOrchardProgress() {
  let p = 0, played = 0, idle = 0, complete = false;
  const out = { p: 0, complete: false };
  return {
    get played() { return played; },
    get complete() { return complete; },
    update(dt, m) {
      if (m.playing) played += dt;
      const ready = (m.given || 0) >= ORCHARD.NEED && played >= ORCHARD.MIN_PLAY && (m.kinder || (m.given || 0) >= ORCHARD.NEED_ANYWAY);
      idle = ready && !m.down ? idle + dt : 0;
      if (!complete && ready && idle >= ORCHARD.IDLE_SEC) complete = true;
      const q = 0.74 * clamp((m.given || 0) / ORCHARD.NEED) + 0.16 * clamp(played / ORCHARD.MIN_PLAY) + (m.kinder ? 0.1 : 0);
      p = complete ? 1 : Math.max(p, Math.min(0.99, q));
      out.p = p; out.complete = complete;
      return out;
    },
    snapshot() { return { p: Math.round(p * 1000) / 1000, played: Math.round(played), c: complete ? 1 : 0 }; },
    restore(s) {
      if (!s || typeof s !== 'object') return;
      p = clamp(+s.p || 0); played = Math.max(0, +s.played || 0); complete = s.c === 1;
    },
  };
}
