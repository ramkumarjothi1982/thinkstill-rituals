// All-or-nothing: reveal the spectrum between the extremes.
//
// Two poles glow at either end of a dark track, "All bad" and "All good", and
// the thought clings to one of them. Sweep a finger along the gap and the
// spectrum lights up under it: shade after shade, with marks for the places in
// between. Once most of it is lit, slide the thought to where it really sits;
// wherever the person puts it is their call. Taps on the track light it bit by
// bit (or place the thought), and the assist pill reveals a quarter at a time.

import { drawGlow, clamp, lerp, approach, rgba, mix, Motes, blinkAt, roundRect, Timers, RectList, thoughtFor } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';
import { framingAllowed } from '../backstop.js';

export const id = 'reveal_spectrum';
const BINS = 28;
const LEFT = '#5a4a9e', MID = '#b48cff', RIGHT = '#ffd98a';

export function mount(ctx) {
  // the gate (backstop.js, review r8): all-or-nothing reads the words as a thinking habit, so only with an
  // interpretive marker of their own and never beside a bag word (the orchestrator then plays a kind step)
  if (!framingAllowed(ctx.text)) throw new Error(`${id}: never for these words`);
  // (a scene's own lines when it has them: a feeling's never speak of verdicts or "every time")
  const L = ctx.lines || MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(40);
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.1, 22, 36);
  const lit = new Float32Array(BINS);       // 0..1 per bin (eases toward 1 once touched)
  const want = new Uint8Array(BINS);
  let phase = 'reveal';                      // reveal → place → settled
  let u = 0.03, uGoal = 0.03;                // the thought's place on the track (0 = All bad)
  let held = null, moves = 0, placeT = 0, grad = null, gradKey = '';
  const t0 = performance.now();
  const thought = thoughtFor(ctx, { x: 0, y: 0, r: R });
  const BL = new RectList(), AL = new RectList();
  const from = ctx.from;
  if (from && !rm()) { thought.x = from.x; thought.y = from.y; }
  const tags = {
    left: ctx.tags.add(L.labels.left, { kind: 'label', colour: LEFT }),
    right: ctx.tags.add(L.labels.right, { kind: 'label', colour: RIGHT }),
    where: ctx.tags.add(L.labels.regions[2], { kind: 'label', colour: MID }),
    words: ctx.tags.add(ctx.parts.excerpt, { kind: 'words' }),
  };
  const regionOf = (k) => L.labels.regions[k < 0.12 ? 0 : k < 0.38 ? 1 : k < 0.62 ? 2 : k < 0.88 ? 3 : 4];

  const TR = { x0: 0, x1: 0, y: 0, hgt: 12 };
  function track() {
    const A = ctx.area();
    const pad = Math.max(R + 10, 34);
    TR.x0 = A.x + pad; TR.x1 = A.x + A.w - pad; TR.y = A.y + A.h * 0.58; TR.hgt = clamp(A.h * 0.06, 10, 16);
    return TR;
  }
  /** The spectrum's light, made once per track geometry (not per frame). */
  function spectrum(T) {
    const key = `${Math.round(T.x0)}|${Math.round(T.x1)}`;
    if (key === gradKey) return grad;
    gradKey = key;
    grad = g.createLinearGradient(T.x0, 0, T.x1, 0);
    grad.addColorStop(0, LEFT); grad.addColorStop(0.5, MID); grad.addColorStop(1, RIGHT);
    return grad;
  }
  const revealed = () => { let s = 0; for (let i = 0; i < BINS; i++) s += want[i]; return s / BINS; };
  function light_(x, spread = 1) {
    const T = track();
    const k = Math.round(((x - T.x0) / (T.x1 - T.x0)) * (BINS - 1));
    let any = false;
    for (let i = k - spread; i <= k + spread; i++) if (i >= 0 && i < BINS && !want[i]) { want[i] = 1; any = true; }
    if (any) {
      ctx.progress(revealed() * 0.75);
      if (revealed() >= 0.8 && phase === 'reveal') toPlace();
    }
    return any;
  }
  function toPlace() {
    phase = 'place';
    for (let i = 0; i < BINS; i++) want[i] = 1;
    ctx.fx('shimmer', { intensity: 0.5 });
    ctx.haptic('soft');
    ctx.hint(L.hint2);
  }
  function place(newU) {
    uGoal = clamp(newU, 0.02, 0.98);
    moves++;
    if (phase === 'place' && Math.abs(uGoal - 0.03) > 0.08) settle();
  }
  function settle() {
    if (phase !== 'place') return;
    phase = 'settled'; placeT = 0;
    ctx.haptic('success'); ctx.fx('chime', { intensity: 0.5 });
    const T = track();
    motes.burst(lerp(T.x0, T.x1, uGoal), T.y, mix(LEFT, RIGHT, uGoal), 10, { speed: 46, size: 2.4 });
    ctx.progress(1);
    TM.after(() => resolve({ moves, ms: performance.now() - t0, at: uGoal }), rm() ? 200 : 900);
  }
  function step() {
    if (phase === 'reveal') {
      // the next quarter, from the thought's end outwards
      let n = Math.ceil(BINS / 4);
      for (let i = 0; i < BINS && n > 0; i++) if (!want[i]) { want[i] = 1; n--; }
      moves++;
      ctx.haptic('light');
      ctx.progress(revealed() * 0.75);
      if (revealed() >= 0.8) toPlace();
    } else if (phase === 'place') place(0.5);
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    const T = track();
    for (let i = 0; i < BINS; i++) if (want[i]) lit[i] = R_ ? 1 : approach(lit[i], 1, 3.2, dt);
    // the dark gap
    g.globalAlpha = 0.6;
    g.fillStyle = 'rgba(12,8,34,0.7)';
    roundRect(g, T.x0 - 6, T.y - T.hgt, T.x1 - T.x0 + 12, T.hgt * 2, T.hgt);
    g.fill();
    g.globalAlpha = 1;
    // the spectrum: one continuous ribbon of light, painted bin by bin as it is revealed (clipped to the track)
    const bw = (T.x1 - T.x0) / BINS;
    spectrum(T);
    g.save();
    roundRect(g, T.x0 - 2, T.y - T.hgt * 0.75, T.x1 - T.x0 + 4, T.hgt * 1.5, T.hgt * 0.75);
    g.clip();
    g.fillStyle = grad;
    for (let i = 0; i < BINS; i++) {
      if (lit[i] <= 0.01) continue;
      g.globalAlpha = lit[i];
      g.fillRect(T.x0 + i * bw - 0.5, T.y - T.hgt, bw + 1, T.hgt * 2);
    }
    // a soft sheen along the top
    g.globalAlpha = 0.35; g.fillStyle = '#ffffff';
    g.fillRect(T.x0, T.y - T.hgt * 0.62, T.x1 - T.x0, T.hgt * 0.22);
    g.restore();
    g.globalAlpha = 1;
    // where light is still arriving, it glows a little
    if (!R_) for (let i = 0; i < BINS; i++) if (lit[i] > 0.02 && lit[i] < 0.97) drawGlow(g, T.x0 + (i + 0.5) * bw, T.y, T.hgt * 2.6, mix(LEFT, RIGHT, i / (BINS - 1)), (1 - lit[i]) * 0.7);
    // tick marks for the places in between, once lit
    for (let i = 1; i <= 3; i++) {
      const k = i / 4;
      const a = clamp(lit[Math.round(k * (BINS - 1))]);
      if (a <= 0.02) continue;
      g.globalAlpha = a * 0.75; g.fillStyle = '#ffffff';
      roundRect(g, lerp(T.x0, T.x1, k) - 1, T.y - T.hgt * 1.5, 2, T.hgt * 3, 1);
      g.fill();
    }
    g.globalAlpha = 1;
    // the two poles
    const pr = R * 0.62;
    drawGlow(g, T.x0 - 6, T.y, pr * 3, LEFT, 0.55);
    drawGlow(g, T.x1 + 6, T.y, pr * 3, RIGHT, 0.55);
    g.fillStyle = LEFT; g.beginPath(); g.arc(T.x0 - 6, T.y, pr * 0.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = RIGHT; g.beginPath(); g.arc(T.x1 + 6, T.y, pr * 0.6, 0, Math.PI * 2); g.fill();
    // the place the thought sits names itself under the track; the pole labels step aside for it
    const showWhere = phase !== 'reveal';
    const tx = lerp(T.x0, T.x1, u);
    tags.where.set(regionOf(u)).at(tx, T.y + T.hgt + 12, 'bottom', showWhere ? 1 : 0);
    const wl = tags.left.w || 70, wr = tags.right.w || 70, ww = tags.where.w || 70;
    const clashL = showWhere && tx - ww / 2 < T.x0 - 6 + wl + 8;
    const clashR = showWhere && tx + ww / 2 > T.x1 + 6 - wr - 8;
    tags.left.at(T.x0 - 6 + wl / 2, T.y + T.hgt + 12, 'bottom', clashL ? 0 : 1);
    tags.right.at(T.x1 + 6 - wr / 2, T.y + T.hgt + 12, 'bottom', clashR ? 0 : 1);
    // the thought, sitting on the track
    u = R_ ? uGoal : approach(u, uGoal, held ? 18 : 5, dt);
    thought.hx = lerp(T.x0, T.x1, u); thought.hy = T.y - T.hgt - R * 0.95;
    thought.step(dt, R_);
    const calm = phase === 'settled' ? 0.7 : phase === 'place' ? 0.25 : 0;
    const cling = phase === 'reveal' ? 0.85 : 0.4;
    thought.draw(g, { tension: cling, calm, sad: u < 0.3 ? 0.3 : 0, blink: blinkAt(t, 0.6), lookX: phase === 'reveal' ? 0.7 : 0, press: held ? 1 : 0 });
    if (phase === 'settled') { placeT += dt; drawGlow(g, thought.x, T.y, R * 2.2, mix(LEFT, RIGHT, u), 0.35 * clamp(placeT * 2)); }
    motes.draw(g, dt);
    tags.words.at(thought.x, thought.y - R * 1.1 - 6, 'top', 1);
    return true;
  }

  function pointer(e) {
    const T = track();
    const nearTrack = (x, y) => y > T.y - T.hgt * 4 - R && y < T.y + T.hgt * 4 && x > T.x0 - 30 && x < T.x1 + 30;
    if (e.type === 'down') {
      // on the track itself, a touch sweeps (the thought sits just above it)
      const onLine = Math.abs(e.y - T.y) < T.hgt * 2.6 && e.x > T.x0 - 30 && e.x < T.x1 + 30;
      if (phase === 'reveal' && onLine) { if (light_(e.x, 1)) ctx.haptic('light'); held = { id: e.id, sweep: true, x0: e.x, t0: e.t }; return true; }
      if (thought.hit(e.x, e.y, 1.25)) {
        thought.poke(e);
        if (phase === 'place' || phase === 'settled') { held = { id: e.id, x0: e.x, t0: e.t, du: u - (e.x - T.x0) / (T.x1 - T.x0) }; }
        ctx.haptic('light');
        return true;
      }
      if (!nearTrack(e.x, e.y)) return false;
      if (phase === 'reveal') { if (light_(e.x, 1)) ctx.haptic('light'); held = { id: e.id, sweep: true, x0: e.x, t0: e.t }; return true; }
      if (phase === 'place') { place((e.x - T.x0) / (T.x1 - T.x0)); return true; }
      return true;
    }
    const tp = thought.pointer(e);
    if (!held || held.id !== e.id) return tp;
    if (e.type === 'move') {
      if (held.sweep && phase === 'reveal') { if (light_(e.x, 1)) ctx.fx('pluck', { intensity: 0.25 }); }
      else if (!held.sweep && (phase === 'place' || phase === 'settled')) uGoal = clamp((e.x - T.x0) / (T.x1 - T.x0) + held.du, 0.02, 0.98);
      return true;
    }
    if (e.type === 'up' || e.type === 'cancel') {
      const hd = held; held = null;
      if (!hd.sweep && phase === 'place') place(uGoal);
      if (hd.sweep) moves++;
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => { const T = track(); return thought.hit(x, y, 1.5) || (y > T.y - T.hgt * 4 - R && y < T.y + T.hgt * 4 && x > T.x0 - 30 && x < T.x1 + 30); },
    assist: step,
    bodies: () => { const T = track(); return BL.begin().circle(thought.x, thought.y, R, 2).box(T.x0 - 12, T.y - T.hgt * 1.5, T.x1 + 12, T.y + T.hgt * 1.5).end(); },
    avoid: () => { const T = track(); AL.begin().box(T.x0 - 30, T.y - T.hgt - R * 2.2 - 40, T.x1 + 30, T.y + T.hgt + R + 30); for (const r of ctx.tags.rects()) AL.box(r.left, r.top, r.right, r.bottom); return AL.end(); },
    get settled() { return phase === 'settled'; },
    probe: () => { const T = track(); return { x0: T.x0, x1: T.x1, y: T.y, thought: { x: thought.x, y: thought.y }, phase }; },
    destroy() { TM.clear(); ctx.tags.clear(); thought.destroy?.(); },
  };
}
