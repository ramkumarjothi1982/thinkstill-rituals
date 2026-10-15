// Moonmilk Cove — the pure core (no DOM, no clock): the screen plan, the rest meter, the moon's phase, the two
// discoveries and the completion rule. Node-tested (tests/moonmilk-cove.test.mjs).
//
// Rest is measured, never guessed:
//   · a finger resting still (below PACE.stillU for STILL_SETTLE s) is rest, anywhere on the screen;
//   · after the person has touched the cove once, leaving it alone is rest too (doing nothing counts) — but only
//     after HANDS_OFF_SEC without any touch, so reading a line or lifting a finger to think is not counted twice;
//   · a moving finger pauses the rest (it is never taken away: busy hands are allowed);
//   · the moon fills with the rest: REST_GOAL seconds (one minute, the skill's realistic rest) is a full moon.

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

export const COVE = Object.freeze({
  HORIZON: 0.5,            // the realm's horizon (REALM_HORIZON['moonmilk-cove'])
  REST_GOAL: 60,           // s of rest for a full moon (the skill: 'one minute, with no task attached')
  STILL_SETTLE: 0.5,       // s a finger must stay still before its rest counts
  HANDS_OFF_SEC: 3,        // s without any touch before leaving the cove alone counts as rest
  RUN_GRACE: 1.2,          // s of moving forgiven inside a rest run (a fidget does not end it)
  REST_FOUND: 15,          // s of one unbroken rest run: the 'rest' discovery
  COMPLETE_HOLD: 1.2,      // s after the moon is full with no finger moving: complete
  EDGE: 10, GAP: 14,       // px from the screen edges / round the hero
  LABEL_GAP: 4,            // px between the thought and its words plate
  SHELL_N: 3,
  CRADLE_B: 1.25,          // × r: how far below the thought's centre its cradle reaches
});

// ---------------------------------------------------------------- plan --
/** The shore line's y at x (the realm's own curve, without its small ripples). */
export function shoreY(W, H, x) {
  const u = clamp((x - W * 0.5) / (W * 0.5), -1.25, 1.25);
  return H * (0.785 - 0.05 * u * u);
}
/** The realm's moon (centre and radius; parallax aside). */
export function moonOf(W, H) { return { x: W * 0.7, y: H * 0.285, r: Math.max(26, Math.min(W * 0.17, H * 0.088)) }; }

/** Where the shell puts the hero when no rect is known (the lab's placeMallow, hushfold.js worldMode). */
export function defaultHero(W, H) {
  const B = Math.max(130, Math.min(W * 0.58, H * 0.27, 300)), bottom = Math.min(H * 0.885, H - 76);
  return { left: W / 2 - B / 2, right: W / 2 + B / 2, top: bottom - B, bottom, width: B, height: B };
}

const hit = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
const rectOf = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });

/**
 * The cove's screen plan.
 *   { W, H, band: {y, h}, mallow: hero rest rect | null, x1: free right edge (the side panel), plate: {w, h} | null,
 *     n: photos, textW }
 * → { hy, moon, M (hero box), home: {x, y, r}, side: 'above'|'below', rects: {thought, cradle, plate, band, hero},
 *     shells: [{x, y, s, hit}], slots: [{x, y, D}], floor }
 * Nothing it places touches the band, the hero (GAP round it) or another thing it places.
 */
export function planCove({ W, H, band = null, mallow = null, x1 = W, plate = null, n = 0 } = {}) {
  const E = COVE.EDGE, G = COVE.GAP;
  const XR = Math.min(W, x1 > 0 ? x1 : W);
  const U = Math.min(W, H);
  const hy = Math.round(H * COVE.HORIZON);
  const m = mallow && mallow.width > 20 ? mallow : defaultHero(W, H);
  const M = { x0: m.left, y0: m.top, x1: m.right ?? m.left + m.width, y1: m.bottom ?? m.top + m.height };
  const bandB = band ? band.y + band.h : 0;
  const B = rectOf(0, band ? band.y : 0, W, bandB);
  const floor = H - 8;
  const pw = plate?.w || 0, ph = plate?.h || 0;

  // ---- the thought, resting in its cradle on the water (away from the moon's side when it can)
  let best = null;
  const rMax = clamp(U * 0.085, 22, 34);
  const ideal = { x: XR * 0.27, y: hy + 0.3 * (shoreY(W, H, XR * 0.27) - hy) };
  for (let r = rMax; r >= 20 && !best; r -= 2) {
    for (const side of ['above', 'below']) {
      const yLo = hy + 0.3 * r, yHi = Math.min(shoreY(W, H, ideal.x) - r * 0.8, floor - r * COVE.CRADLE_B);
      for (let y = yLo; y <= yHi; y += 4) {
        for (let x = E + r * 1.45 + 2; x <= XR - E - r * 1.45 - 2; x += 6) {
          const T = rectOf(x - r * 1.45, y - r, x + r * 1.45, y + r * COVE.CRADLE_B);   // the body and its cradle
          if (hit(T, M, G) || hit(T, B, 4) || T.y1 > floor) continue;
          let P = null;
          if (pw) {
            const px0 = clamp(x - pw / 2, E, XR - E - pw);
            P = side === 'above' ? rectOf(px0, y - r - COVE.LABEL_GAP - ph, px0 + pw, y - r - COVE.LABEL_GAP)
              : rectOf(px0, y + r * COVE.CRADLE_B + COVE.LABEL_GAP, px0 + pw, y + r * COVE.CRADLE_B + COVE.LABEL_GAP + ph);
            if (pw > XR - 2 * E || hit(P, M, 4) || hit(P, B, 4) || P.y1 > floor) continue;
          }
          const s = Math.hypot((x - ideal.x) / W, (y - ideal.y) / H) + (side === 'below' ? 0.05 : 0) + (rMax - r) * 0.01;
          if (!best || s < best.s) best = { s, x, y, r, side, T, P };
        }
      }
    }
  }
  if (!best) {
    // nowhere clear (a tiny landscape window at the largest text): the place where the words cover least of the hero and
    // the band (the words weigh most: they must stay readable), anywhere on screen
    const area = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const r = 20;
    for (const side of ['above', 'below']) {
      for (let y = Math.max(r, hy - 2 * r); y <= floor - r * COVE.CRADLE_B; y += 4) {
        for (let x = E + r * 1.45; x <= XR - E - r * 1.45; x += 4) {
          const T = rectOf(x - r * 1.45, y - r, x + r * 1.45, y + r * COVE.CRADLE_B);
          const px0 = clamp(x - pw / 2, E, Math.max(E, XR - E - pw));
          const P = pw ? (side === 'above' ? rectOf(px0, y - r - 4 - ph, px0 + pw, y - r - 4) : rectOf(px0, y + r * COVE.CRADLE_B + 4, px0 + pw, y + r * COVE.CRADLE_B + 4 + ph)) : null;
          let s = area(T, M) + area(T, B) + (P ? 4 * (area(P, M) + area(P, B)) + 4 * Math.max(0, -P.y0) * pw + 4 * Math.max(0, P.y1 - H) * pw : 0);
          s += Math.hypot(x - ideal.x, y - ideal.y) * 0.01;
          if (!best || s < best.s) best = { s, x, y, r, side, T, P };
        }
      }
    }
  }
  const home = { x: Math.round(best.x), y: Math.round(best.y), r: best.r };
  const avoid = [M, B, best.T, ...(best.P ? [best.P] : [])];

  // ---- the shells (things left to do) on the sand by the water's edge, beside the hero: ≥ 44 px targets, apart
  const s = clamp(U * 0.05, 15, 22), hitR = Math.max(22, s * 1.5);
  const shells = [];
  const okShell = (x, y) => {
    const R = rectOf(x - hitR, y - hitR, x + hitR, y + hitR * 0.8);
    if (R.x0 < 2 || R.x1 > XR - 2 || R.y1 > floor) return false;
    for (const o of avoid) if (hit(R, o, 2)) return false;
    for (const q of shells) if (Math.hypot(q.x - x, q.y - y) < 2 * hitR + 4) return false;
    return true;
  };
  const sides = [[E + hitR, M.x0 - G - hitR * 0.6], [M.x1 + G + hitR * 0.6, XR - E - hitR]];
  // the wider side first, alternating, until three are placed (or no more fit)
  sides.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  for (let pass = 0; pass < 3 && shells.length < COVE.SHELL_N; pass++) {
    for (const [a, b] of sides) {
      if (shells.length >= COVE.SHELL_N || b < a) continue;
      let placed = false;
      for (let f = 0; f <= 1 && !placed; f += 0.125) {
        const x = lerp(a, b, pass % 2 ? 1 - f : f);
        const y0 = shoreY(W, H, x) + s * 0.6 + 4;
        for (let y = y0; y <= Math.min(floor - hitR, y0 + 0.12 * H) && !placed; y += 6) if (okShell(x, y)) { shells.push({ x: Math.round(x), y: Math.round(y), s, hit: hitR }); placed = true; }
      }
    }
  }
  // (a very narrow screen with no sand beside the hero: on the water's edge above it, clear of the thought)
  if (!shells.length) {
    for (let x = E + hitR; x <= XR - E - hitR && shells.length < COVE.SHELL_N; x += 6) {
      const y = Math.min(M.y0 - G - hitR, shoreY(W, H, x) - 2);
      if (y > hy + hitR && okShell(x, y)) shells.push({ x: Math.round(x), y: Math.round(y), s, hit: hitR });
    }
  }

  // ---- photo lanterns on the far water (perspective-sized), clear of everything else
  const slots = [];
  const sh = shoreY(W, H, W / 2);
  const Dat = (y) => clamp(lerp(0.1, 0.17, clamp((y - hy) / Math.max(40, sh - hy))) * U, 30, 64);
  if (n > 0) {
    const rows = [hy + 0.2 * (sh - hy), hy + 0.42 * (sh - hy), hy + 0.64 * (sh - hy)];
    for (const ry of rows) {
      const D = Dat(ry);
      for (let x = E + D / 2 + 2; x <= XR - E - D / 2 - 2 && slots.length < Math.min(7, n); x += 4) {
        const y = ry, R = rectOf(x - D / 2, y - D * 0.62, x + D / 2, y + D * 0.62);
        if (R.y0 < hy + 2 && ry !== rows[0]) continue;
        let bad = false;
        for (const o of avoid) if (hit(R, o, 8)) { bad = true; break; }
        if (!bad) for (const q of shells) if (hit(R, rectOf(q.x - q.hit, q.y - q.hit, q.x + q.hit, q.y + q.hit), 4)) { bad = true; break; }
        if (!bad) for (const q of slots) if (Math.abs(q.x - x) < (q.D + D) / 2 + 12 && Math.abs(q.y - y) < (q.D + D) * 0.62 + 6) { bad = true; break; }
        if (bad) continue;
        slots.push({ x: Math.round(x), y: Math.round(y), D: Math.round(D) });
        x += D + 12;
      }
    }
  }
  if (n > 0 && !slots.length) {
    // (no roomy slot at all — a tiny landscape window: one small lantern where it fits, and the photos take turns in it)
    const D = 30;
    for (let y = hy + D * 0.62 + 2; y <= Math.min(floor, sh) - D * 0.62 && !slots.length; y += 4) {
      for (let x = E + D / 2; x <= XR - E - D / 2 && !slots.length; x += 4) {
        const Rr = rectOf(x - D / 2, y - D * 0.62, x + D / 2, y + D * 0.62);
        if (avoid.some((o) => hit(Rr, o, 2))) continue;
        if (shells.some((q) => hit(Rr, rectOf(q.x - q.hit, q.y - q.hit, q.x + q.hit, q.y + q.hit), 0))) continue;
        slots.push({ x: Math.round(x), y: Math.round(y), D });
      }
    }
  }
  return {
    W, H, hy, x1: XR, moon: moonOf(W, H), M, home, side: best.side, floor,
    rects: { thought: best.T, plate: best.P, band: B, hero: M },
    shells, slots,
  };
}

// ---------------------------------------------------------- the rest --
/**
 * The rest meter. update(dt, { down: fingers on the cove, still: fingers resting still ≥ STILL_SETTLE, moving: a finger
 * is moving, sinceInput: s since the last touch event, touched: ever touched }) → a shared result:
 *   { rest: total s, p: 0..1 (the moon), rate: 0|1 now, run: s of this unbroken rest, resting: bool, mode: 'finger'|'hands-off'|'none' }
 */
export function createRestMeter(goal = COVE.REST_GOAL) {
  let rest = 0, run = 0, gap = 0, mode = 'none';
  const out = { rest: 0, p: 0, rate: 0, run: 0, resting: false, mode: 'none' };
  return {
    update(dt, m = {}) {
      let rate = 0;
      if (m.still > 0 && !m.moving) { rate = 1; mode = 'finger'; }
      else if (!m.down && m.touched && (m.sinceInput ?? 0) >= COVE.HANDS_OFF_SEC) { rate = 1; mode = 'hands-off'; }
      else mode = 'none';
      if (rate) { rest += dt; run += dt; gap = 0; }
      else if (m.moving || m.down) { gap += dt; if (gap > COVE.RUN_GRACE) run = 0; }
      // (a finger just lifted, before hands-off counts: the run waits, nothing is lost)
      out.rest = rest; out.p = clamp(rest / goal); out.rate = rate; out.run = run; out.resting = rate > 0; out.mode = mode;
      return out;
    },
    get rest() { return rest; },
    get p() { return clamp(rest / goal); },
    snapshot() { return { r: Math.round(rest * 10) / 10 }; },
    restore(s) { if (s && Number.isFinite(+s.r)) rest = clamp(+s.r, 0, goal); },
  };
}

/** 'rest': one unbroken rest run of REST_FOUND s (the shells, things left to do, still there the whole time). Fires once. */
export function createRestDetector() {
  let fired = false;
  return {
    update(m) {
      if (fired || !(m.run >= COVE.REST_FOUND)) return null;
      fired = true;
      return { id: 'rest', evidence: { run: Math.round(m.run * 10) / 10, rest: Math.round(m.rest * 10) / 10, mode: m.mode, shells: m.shells ?? 0 } };
    },
    markFired() { fired = true; }, get fired() { return fired; },
  };
}

/** 'waited': after real rest (≥ REST_FOUND s in all), the person touches a shell that was there all along. Fires once. */
export function createWaitedDetector() {
  let fired = false;
  return {
    touch(rest, shellAge) {
      if (fired || !(rest >= COVE.REST_FOUND) || !(shellAge >= rest)) return null;
      fired = true;
      return { id: 'waited', evidence: { rest: Math.round(rest * 10) / 10 } };
    },
    markFired() { fired = true; }, get fired() { return fired; },
  };
}

/** Completion: the moon full (rest ≥ goal) and no finger moving for COMPLETE_HOLD s. Monotonic; resting fingers are fine. */
export function createCoveProgress(goal = COVE.REST_GOAL) {
  let hold = 0, complete = false, p = 0;
  return {
    update(dt, { rest = 0, moving = false } = {}) {
      p = Math.max(p, clamp(rest / goal));
      if (!complete && p >= 1) { hold = moving ? 0 : hold + dt; if (hold >= COVE.COMPLETE_HOLD) complete = true; }
      return { p: complete ? 1 : Math.min(p, 0.999), complete };
    },
    get complete() { return complete; },
    markComplete() { complete = true; p = 1; },
  };
}

// ---------------------------------------------------------- the moon --
/** How much of a unit disc a same-sized shadow disc at distance d (radii) leaves lit (0..1). */
export function litFraction(d) {
  d = clamp(d, 0, 2);
  const covered = 2 * Math.acos(d / 2) - (d / 2) * Math.sqrt(4 - d * d);
  return 1 - covered / Math.PI;
}
/**
 * The moon's phase for rest progress p: the shadow disc's offset from the moon's centre in radii, chosen so the lit
 * AREA is what the rest has earned (a thin crescent, 12 %, at the start → half a moon at half the minute → full; 2.1:
 * no shadow drawn). Bisection: a handful of steps, once a frame.
 */
export function moonShadow(p) {
  const e = clamp(p);
  if (e >= 0.999) return 2.1;
  const want = 0.12 + 0.88 * e;
  let lo = 0, hi = 2;
  for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (litFraction(m) < want) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** How much the cove rocks and laps now (1 busy … 0.15 deep rest): the feeling's agitation, eased by rest now and rest so far. */
export function tideBusy(agitation, restNow, p, busyHands = 0) {
  return clamp((0.25 + 0.75 * clamp(agitation)) * (1 - 0.7 * clamp(restNow)) * (1 - 0.5 * clamp(p)) + 0.25 * clamp(busyHands), 0.15, 1);
}
