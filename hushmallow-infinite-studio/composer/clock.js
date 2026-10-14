// Beat clock: the anchor times a video is built on.
//
// Every move places its keys relative to named anchors (COVER, ANTIC, GAG,
// IMPACT, HOOK_OUT, L1..L4, PEAK0/1, TURN, RITUAL0/1, OPEN, RESOLVE, LOGO,
// SETTLE, CARD_OUT, HOOK_IN, END) taken from the story library's beat clock
// for the spec's duration, plus the sub-anchors earlier moves publish
// (R-BREATH publishes inhale / crest / exhale, TURN-SQUEEZE squeeze / relax).
//
// Time arithmetic. Two forms exist on purpose:
//   at(base, off)  snaps base + off to the 1 µs beat grid. Use it for beat
//                  times: the result is the double a decimal literal would
//                  parse to (at(0.4, 0.13) === 0.53), so a move written
//                  relative to its anchors lands on exactly the approved
//                  numbers whatever the base.
//   base + off     plain arithmetic, for times v2 itself computed as
//                  `T.x + c` at run time (9.2 + 0.12 === 9.319999999999999,
//                  not 9.32). Reproducing v2 bit for bit needs both.
// Published sub-anchors are always on the grid (publish() snaps them).
//
// Pure ESM, no imports: loads in the render page and in Node.

/** Beat-grid resolution: 1 µs. */
export const GRID = 1e6;

/** Snap a time to the beat grid (the double nearest the 6-decimal value). */
export const snap = (x) => Math.round(x * GRID) / GRID;

/** A beat time relative to an anchor, on the grid. */
export const at = (base, off = 0) => snap(base + off);

/**
 * Idle-breath period for a loop of D seconds: a whole number of breaths of
 * about 3.8 s, so the breath is periodic over the loop (LP-BASE). 15 s → 3.75.
 */
export function breathPeriod(D) {
  return D / Math.round(D / 3.8);
}

/** Names of the clock anchors, in story order (L4 only exists at 20 s). */
export const ANCHOR_NAMES = Object.freeze([
  'COVER', 'ANTIC', 'GAG', 'IMPACT', 'HOOK_OUT', 'L1', 'L2', 'L3', 'L4', 'PEAK0', 'PEAK1',
  'TURN', 'RITUAL0', 'RITUAL1', 'OPEN', 'RESOLVE', 'LOGO', 'SETTLE', 'CARD_OUT', 'HOOK_IN', 'END',
]);

/** Anchors that sync to picture events and are never jittered. */
export const FRAME_LOCKED = Object.freeze(['COVER', 'ANTIC', 'GAG', 'IMPACT', 'TURN', 'HOOK_IN', 'END']);

/**
 * Anchors of the library beat clock for duration D.
 * clock: story-library beatClocks[D]. → frozen-free plain object of times
 * (seconds), plus L (thought arrivals) and breathPeriod.
 */
export function clockAnchors(clock, D) {
  if (!clock) throw new Error(`no beat clock for ${D} s`);
  const A = {
    COVER: 0,
    ANTIC: clock.ANTIC, GAG: clock.GAG, IMPACT: clock.IMPACT, HOOK_OUT: clock.HOOK_OUT,
    L1: clock.L1, L2: clock.L2, L3: clock.L3,
    PEAK0: clock.PEAK[0], PEAK1: clock.PEAK[1], TURN: clock.TURN,
    RITUAL0: clock.RITUAL[0], RITUAL1: clock.RITUAL[1],
    OPEN: clock.OPEN, RESOLVE: clock.RESOLVE, LOGO: clock.LOGO, SETTLE: clock.SETTLE,
    CARD_OUT: clock.CARD_OUT, HOOK_IN: clock.HOOK_IN, END: D,
  };
  if (clock.L4 !== undefined) A.L4 = clock.L4;
  for (const [k, v] of Object.entries(A)) {
    if (!Number.isFinite(v)) throw new Error(`beat clock ${D} s: anchor ${k} is ${v}`);
  }
  const order = ANCHOR_NAMES.filter((k) => k in A);
  for (let i = 1; i < order.length; i++) {
    // OPEN may precede RITUAL1 (the 10 s clock opens the eyes inside the ritual window)
    if (order[i] === 'RITUAL1' || order[i - 1] === 'RITUAL1') continue;
    if (A[order[i]] < A[order[i - 1]]) throw new Error(`beat clock ${D} s: ${order[i]} (${A[order[i]]}) before ${order[i - 1]} (${A[order[i - 1]]})`);
  }
  A.breathPeriod = breathPeriod(D);
  return A;
}

/**
 * Resolve an anchor reference: a number, an anchor name, or "NAME±offset"
 * ("TURN-0.02", "IMPACT+1.2"). Offsets snap to the grid.
 */
export function resolveRef(ref, A) {
  if (typeof ref === 'number') return ref;
  const m = /^([A-Za-z_][\w.]*)(?:([+-])(\d+(?:\.\d+)?))?$/.exec(String(ref));
  if (!m) throw new Error(`bad anchor reference "${ref}"`);
  if (!(m[1] in A)) throw new Error(`unknown anchor "${m[1]}" in "${ref}"`);
  const base = A[m[1]];
  return m[2] ? at(base, (m[2] === '-' ? -1 : 1) * Number(m[3])) : base;
}

/**
 * Seeded jitter of the non-frame-locked anchors (±amount s), applied before
 * any move runs so cues always follow the picture. Order is preserved: an
 * anchor never crosses its neighbours. rnd: () → [0, 1).
 */
export function jitterAnchors(A, rnd, amount = 0.08) {
  const out = { ...A };
  if (!(amount > 0)) return out;
  const names = ANCHOR_NAMES.filter((k) => k in A && !FRAME_LOCKED.includes(k));
  for (const k of names) out[k] = at(A[k], (rnd() * 2 - 1) * amount);
  // never reorder: an anchor that crossed (or met) a neighbour it was strictly after goes back to the clock, with that neighbour
  const order = ANCHOR_NAMES.filter((k) => k in out && k !== 'RITUAL1');
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 1; i < order.length; i++) {
      const a = order[i - 1], b = order[i];
      const crossed = out[b] < out[a] || (A[b] > A[a] && out[b] === out[a]);
      if (crossed && (out[a] !== A[a] || out[b] !== A[b])) { out[a] = A[a]; out[b] = A[b]; changed = true; }
    }
  }
  return out;
}
