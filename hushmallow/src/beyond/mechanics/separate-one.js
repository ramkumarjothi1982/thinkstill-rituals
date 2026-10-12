// Overgeneralisation: separate one event from a larger collection.
//
// One moment has fused into a heavy, grey cluster of "every time". The real
// event glows inside it. Drag it out: the cluster holds on with a stretchy
// strand, then lets it go. Once it is out on its own, the rest loosen into a
// scattered constellation in many colours: other times, not all the same.
// Tap the glowing one (or the assist pill) to ease it out a third at a time.

import { Blob, drawGlow, drawJelly, clamp, lerp, approach, rgba, mix, Motes, blinkAt, circleRect, tintFor, TAU, Timers } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'separate_one';
const COUNT = 15;
const LATER = ['#ffd98a', '#9fe8ff', '#b9a6ff', '#ffc0e6', '#a8f0d8', '#ffe9b0'];

export function mount(ctx) {
  const L = MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(40);
  const [light, deep] = tintFor(ctx.emotion);
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.075, 16, 28);
  const one = new Blob({ x: ctx.from?.x ?? A0.x + A0.w / 2, y: ctx.from?.y ?? A0.y + A0.h / 2, r: R * 1.15, light, deep });
  // the others, packed on a sunflower spiral; each gets its own later colour
  const beads = Array.from({ length: COUNT }, (_, i) => {
    const b = new Blob({ x: one.x, y: one.y, r: R * (0.78 + ((i * 7) % 5) * 0.06), light: '#c9c4e0', deep: '#5c5785' });
    b.i = i; b.col = LATER[i % LATER.length]; b.k = 22; b.d = 6; b.phase = i * 2.39996;
    return b;
  });
  let phase = 'fused';     // fused → free → spread
  let stepK = 0, held = null, moves = 0, spreadT = 0;
  const t0 = performance.now();
  const tags = {
    oneL: ctx.tags.add(L.labels.one, { kind: 'label', colour: deep }),
    words: ctx.tags.add(ctx.parts.excerpt, { kind: 'words' }),
    rest: ctx.tags.add(L.labels.rest, { kind: 'label', colour: '#ffd98a' }),
  };

  function centre() {
    const A = ctx.area();
    return { cx: A.x + A.w * (phase === 'fused' ? 0.5 : 0.62), cy: A.y + A.h * 0.46, A };
  }
  function homes() {
    const { cx, cy, A } = centre();
    const spread = phase === 'spread' ? 1 : 0;
    beads.forEach((b, i) => {
      const rr = Math.sqrt(i + 1) * R * lerp(1.42, 2.9, spread);
      const a = b.phase + spread * 0.6;
      b.hx = clamp(cx + Math.cos(a) * rr * lerp(1, 1.25, spread), A.x + R, A.x + A.w - R);
      b.hy = clamp(cy + Math.sin(a) * rr * lerp(1, 0.78, spread), A.y + R, A.y + A.h - R);
    });
    if (!one.press) {
      if (phase === 'fused') {
        // nested in the cluster, eased outwards by taps
        one.hx = cx + R * 1.1 - stepK * (A.w * 0.12); one.hy = cy + R * 0.3 + stepK * R * 0.6;
      } else { one.hx = A.x + A.w * 0.2; one.hy = A.y + A.h * 0.62; }
    }
  }
  homes();
  if (rm()) for (const b of [one, ...beads]) { b.x = b.hx; b.y = b.hy; }

  const pull = () => { const { cx, cy } = centre(); return clamp((Math.hypot(one.x - cx, one.y - cy) - R * 2) / (clusterR() + R * 2.2)); };
  const clusterR = () => Math.sqrt(COUNT) * R * 1.42;

  function free() {
    if (phase !== 'fused') return;
    phase = 'free';
    one.drop(); held = null;
    ctx.haptic('soft'); ctx.fx('unlock', { intensity: 0.55 });
    motes.burst(one.x, one.y, light, 8, { speed: 50, size: 2.6 });
    ctx.progress(0.85);
    TM.after(() => {
      phase = 'spread'; spreadT = 0; homes();
      ctx.fx('shimmer', { intensity: 0.4 });
      TM.after(() => { ctx.progress(1); ctx.haptic('success'); resolve({ moves, ms: performance.now() - t0 }); }, rm() ? 250 : 1300);
    }, rm() ? 80 : 450);
  }
  function step() {
    if (phase !== 'fused') return;
    stepK++; moves++;
    one.sqV += 2.4; ctx.haptic('light');
    ctx.progress(stepK / 3 * 0.8);
    homes();
    if (stepK >= 3) TM.after(free, rm() ? 60 : 500);
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    homes();
    const { cx, cy } = centre();
    if (phase === 'spread') spreadT += dt;
    const k = phase === 'fused' ? pull() : 1;
    // the cluster's weight: a dull halo while fused, many small lights once spread
    if (phase === 'fused') drawGlow(g, cx, cy, clusterR() * 1.8, '#4a4180', 0.5);
    for (const b of beads) {
      if (!R_ && phase === 'fused') { b.hx += Math.sin(t * 1.2 + b.phase) * 1.2; b.hy += Math.cos(t * 1.1 + b.phase) * 1.2; }
      if (!R_ && phase === 'spread') { b.hx += Math.sin(t * 0.5 + b.phase) * 4; b.hy += Math.cos(t * 0.45 + b.phase) * 3; }
      b.step(dt, R_);
      const c = phase === 'spread' ? clamp(spreadT / 1.2) : 0;
      const li = c ? mix('#c9c4e0', b.col, c) : b.light, de = c ? mix('#5c5785', b.col, c * 0.65) : b.deep;
      drawJelly(g, { x: b.x, y: b.y, r: b.r, sx: b.sx, sy: b.sy, light: li, deep: de, glow: c * 0.5, alpha: phase === 'fused' ? 0.92 : 0.85,
        face: c > 0.5 ? { tension: 0.1, calm: 0.6, blink: blinkAt(t, b.i * 0.7) } : null });
    }
    // the strand holding on while it is pulled out
    if (phase === 'fused' && (one.press || stepK > 0)) {
      const w = lerp(R * 0.6, R * 0.08, k);
      const ex = cx + (one.x - cx) * 0.35, ey = cy + (one.y - cy) * 0.35;
      g.globalAlpha = 0.65; g.strokeStyle = rgba(light, 0.75); g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(one.x, one.y); g.stroke();
      g.globalAlpha = 1;
      if (one.press && k >= 1) free();
    }
    one.step(dt, R_);
    one.draw(g, { tension: phase === 'fused' ? 0.75 : 0.2, calm: phase === 'spread' ? 0.6 : 0, surprise: phase === 'free' ? 0.6 : 0, blink: blinkAt(t, 0.5), lookX: phase === 'fused' ? -0.6 : 0.6, press: one.press ? 1 : 0 },
      { glow: 0.75 });
    motes.draw(g, dt);
    const out = phase !== 'fused';
    tags.oneL.at(one.x, one.y - one.r * 1.18 - 4, 'top', out ? 1 : 0);
    tags.words.at(one.x, one.y + one.r * 1.1 + 6, 'bottom', out ? 1 : 0.85);
    tags.rest.at(cx, cy - clusterR() * (phase === 'spread' ? 1.25 : 1) - 10, 'top', phase === 'spread' ? clamp(spreadT) : 0);
    return true;
  }

  function pointer(e) {
    if (e.type === 'down') {
      if (one.hit(e.x, e.y, 1.6)) { if (phase === 'fused') { one.grab(e); held = e.id; } else one.sqV += 2.4; ctx.haptic('light'); return true; }
      const b = beads.find((x) => x.hit(e.x, e.y, 1.2));
      if (b) { b.sqV += 2.4; ctx.haptic('light'); return true; }
      return false;
    }
    if (held !== e.id) return false;
    if (e.type === 'move') { one.drag(e); ctx.progress(pull() * 0.8); return true; }
    if (e.type === 'up' || e.type === 'cancel') {
      held = null;
      const p = one.drop(e);
      moves++;
      if (p && p.moved < 12 && e.t - p.t0 < 380) step();
      else if (phase === 'fused' && pull() >= 0.92) free();
      else if (phase === 'fused') { ctx.haptic('light'); homes(); }
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => one.hit(x, y, 1.6) || beads.some((b) => b.hit(x, y, 1.2)),
    assist: step,
    avoid: () => { const { cx, cy } = centre(); return [circleRect(cx, cy, clusterR() * (phase === 'spread' ? 1.4 : 1.1)), circleRect(one.x, one.y, one.r * 1.4), ...ctx.tags.rects()]; },
    get settled() { return phase === 'spread'; },
    probe: () => { const { cx, cy } = centre(); return { one: { x: one.x, y: one.y }, c: { x: cx, y: cy }, r: clusterR(), phase }; },
    destroy() { TM.clear(); ctx.tags.clear(); },
  };
}
