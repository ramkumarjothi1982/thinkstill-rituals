// Frame pacer: how often a calm screen needs to draw (pure; clock injected).
//
// A quiet scene does not need 60 frames a second. The Nightlight caps its rig
// (SoftMallow.setFrameCap) and its sky at a rate that suits the moment: the
// display rate while someone is touching, a little more during a scripted
// moment, a slow steady rate per mode, slower still as the light fades, and
// nothing at all while hidden or ended. Physics stays in real time at any cap
// (SoftMallow sub-steps the accumulated dt), so a cap only saves drawing.
// Generic name, owned by Mallow Nightlight in Phase 3.
//
//   const pacer = new FramePacer();
//   pacer.touch();                                    // every pointerdown on the screen
//   pacer.event(2400);                                // a yawn, a greeting, a mode change
//   pacer.apply(rig, { mode, phase, motion, quality, worldLevel });   // setFrameCap only on change

/** Steady caps per Nightlight mode (fps). */
export const NIGHT_CAPS = Object.freeze({ moonlight: 15, breathe: 24, sleepy: 15, drift: 20, quiet: 10 });

export const PACE = Object.freeze({
  boostMs: 2500,      // input counts as interacting for this long
  touchLow: 30,       // the interacting cap on the low tier (else the display rate)
  event: 30,          // scripted moments, greetings, mode changes, arriving
  fading: 12,         // fading: at most this…
  fadingDeep: 8,      // …and this once the world level is below deepBelow
  deepBelow: 0.3,
  still: 10,          // Movement Still
  lowK: 0.8,          // the low tier draws 20 % less…
  floor: 8,           // …but never below 8 fps
  steady: 15,         // a mode without its own cap
});

/**
 * The cap for one moment: fps, null for the display rate, 0 for none.
 *   hidden, or phase 'ended' → 0 (the loops have stopped or the view is gone)
 *   interacting → null (30 on the low tier): touch must feel direct, at any Movement
 *   event, or phase 'arriving' / 'booting' → 30
 *   steady → NIGHT_CAPS[mode]; fading → min(steady, 12), 8 below world level 0.3
 *   Movement Still → at most 10; low tier → × 0.8 rounded, never below 8
 */
export function fpsFor({ mode = 'moonlight', phase = 'steady', interacting = false, event = false, motion = 'gentle',
  quality = 'medium', worldLevel = 1, hidden = false } = {}) {
  if (hidden || phase === 'ended' || phase === 'hidden') return 0;
  const low = quality === 'low';
  if (interacting) return low ? PACE.touchLow : null;
  let cap;
  if (event || phase === 'arriving' || phase === 'booting') cap = PACE.event;
  else {
    const steady = Object.hasOwn(NIGHT_CAPS, mode) ? NIGHT_CAPS[mode] : PACE.steady;
    cap = phase === 'fading' ? Math.min(steady, worldLevel < PACE.deepBelow ? PACE.fadingDeep : PACE.fading) : steady;
  }
  if (motion === 'still') cap = Math.min(cap, PACE.still);
  if (low) cap = Math.max(PACE.floor, Math.round(cap * PACE.lowK));
  return cap;
}

export class FramePacer {
  /** @param {{now?:()=>number, boostMs?:number}} [o] */
  constructor({ now = () => performance.now(), boostMs = PACE.boostMs } = {}) {
    this.now = now;
    this.boostMs = boostMs;
    this._touchUntil = -Infinity;
    this._eventUntil = -Infinity;
    this._applied = undefined;   // the cap last sent to the rig (undefined: nothing sent yet)
    this._s = { mode: 'moonlight', phase: 'steady', interacting: false, event: false, motion: 'gentle', quality: 'medium', worldLevel: 1, hidden: false };
  }

  /** Input: the display rate (30 on low) for boostMs. */
  touch() { this._touchUntil = this.now() + this.boostMs; }

  /** A scripted moment of `ms`: 30 fps (24 on low) until it ends. Overlapping events keep the later end. */
  event(ms = 1500) { this._eventUntil = Math.max(this._eventUntil, this.now() + Math.max(0, ms)); }

  get interacting() { return this.now() < this._touchUntil; }
  get boosted() { return this.now() < this._eventUntil; }

  /** fpsFor(state) with the touch and event boosts applied. No allocation. */
  cap(state = {}) {
    const s = this._s;
    s.mode = state.mode ?? 'moonlight';
    s.phase = state.phase ?? 'steady';
    s.motion = state.motion ?? 'gentle';
    s.quality = state.quality ?? 'medium';
    s.worldLevel = state.worldLevel ?? 1;
    s.hidden = !!state.hidden;
    s.interacting = !!state.interacting || this.interacting;
    s.event = !!state.event || this.boosted;
    return fpsFor(s);
  }

  /** Compute the cap and send it to rig.setFrameCap() only when it changes. Returns the cap. */
  apply(rig, state) {
    const c = this.cap(state);
    if (c !== this._applied) { this._applied = c; rig?.setFrameCap?.(c); }
    return c;
  }

  /** The cap last applied (null for the display rate or before any). */
  get applied() { return this._applied ?? null; }

  reset() { this._touchUntil = -Infinity; this._eventUntil = -Infinity; this._applied = undefined; }
}
