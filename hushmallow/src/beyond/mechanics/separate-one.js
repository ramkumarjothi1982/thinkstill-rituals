// Overgeneralisation: separate one event from a larger collection.
//
// One moment has fused into a heavy, grey cluster of "every time". The real
// event glows inside it. Drag it out: the cluster holds on with a stretchy
// strand, then lets it go. Once it is out on its own, the rest loosen into an
// open arc of lights in many colours (other times, not all the same), with
// "Other times" in its quiet centre and the one moment in the arc's gap.
// Tap the glowing one (or the assist pill) to ease it out a third at a time.

import { Blob, drawGlow, drawJelly, clamp, lerp, approach, rgba, mix, Motes, blinkAt, circleRect, tintFor, TAU, Timers } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'separate_one';
const MAX_COUNT = 15;
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
  // a narrow phone: fewer other times, so the arc stays calm and readable
  const COUNT = A0.w < 330 ? 11 : MAX_COUNT;
  // the cluster must leave room around it to pull the one out (≤ 36% of the area's short side)
  const R = clamp(Math.min(A0.w, A0.h) * 0.36 / (Math.sqrt(COUNT) * 1.42), 12, 22);
  const one = new Blob({ x: ctx.from?.x ?? A0.x + A0.w / 2, y: ctx.from?.y ?? A0.y + A0.h / 2, r: R * 1.15, light, deep });
  // the others, packed on a sunflower spiral; each gets its own later colour
  const beads = Array.from({ length: COUNT }, (_, i) => {
    const b = new Blob({ x: one.x, y: one.y, r: R * (0.78 + ((i * 7) % 5) * 0.06), light: '#c9c4e0', deep: '#5c5785' });
    b.i = i; b.col = LATER[i % LATER.length]; b.k = 22; b.d = 6; b.phase = i * 2.39996;
    return b;
  });
  let phase = 'fused';     // fused → free → spread
  let stepK = 0, held = null, moves = 0, spreadT = 0, dimTick = 0;
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
  /** The open arc the other times settle on: round the right of the area, its gap on the left where the one moment sits. */
  function arc() {
    const A = ctx.area();
    const cx = A.x + A.w * 0.6, cy = A.y + A.h * 0.5;
    return { cx, cy, rx: Math.max(R * 3, Math.min(A.w * 0.36, A.w * 0.4 - R)), ry: Math.max(R * 3, Math.min(A.h * 0.4, A.h / 2 - R * 1.3)) };
  }
  function homes() {
    const { cx, cy, A } = centre();
    if (phase === 'spread') {
      const C = arc();
      beads.forEach((b, i) => {
        const a = lerp(-0.76 * Math.PI, 0.76 * Math.PI, i / (COUNT - 1));
        b.hx = C.cx + Math.cos(a) * C.rx; b.hy = C.cy + Math.sin(a) * C.ry;
      });
    } else {
      beads.forEach((b, i) => {
        const rr = Math.sqrt(i + 0.6) * R * 1.12;
        b.hx = clamp(cx + Math.cos(b.phase) * rr, A.x + R, A.x + A.w - R);
        b.hy = clamp(cy + Math.sin(b.phase) * rr, A.y + R, A.y + A.h - R);
      });
    }
    if (!one.press) {
      if (phase === 'fused') {
        // nested in the cluster, eased outwards by taps
        one.hx = cx + R * 1.1 - stepK * (A.w * 0.12); one.hy = cy + R * 0.3 + stepK * R * 0.6;
      } else { one.hx = A.x + Math.max(one.r * 1.6, A.w * 0.16); one.hy = A.y + A.h * 0.42; }
    }
  }
  homes();
  if (rm()) for (const b of [one, ...beads]) { b.x = b.hx; b.y = b.hy; }

  const pull = () => { const { cx, cy } = centre(); return clamp((Math.hypot(one.x - cx, one.y - cy) - R * 1.5) / (clusterR() + R * 0.6)); };
  const clusterR = () => Math.sqrt(COUNT) * R * 1.18;

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
    if (phase === 'fused') {
      // fused: one heavy, dull membrane holding every moment together
      drawGlow(g, cx, cy, clusterR() * 1.9, '#2a2160', 0.75);
      g.globalAlpha = 0.5; g.fillStyle = 'rgba(70, 62, 120, 0.55)';
      g.beginPath(); g.arc(cx, cy, clusterR() * 1.02, 0, TAU); g.fill();
      g.globalAlpha = 0.35; g.strokeStyle = '#c9c4e0'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(cx, cy, clusterR() * 1.02, Math.PI * 1.1, Math.PI * 1.75); g.stroke();
      g.globalAlpha = 1;
    }
    // a light that sits under a label steps back (dims), so the words read and the arc stays calm
    if (phase === 'spread' && ++dimTick % 6 === 0) {
      const rs = ctx.tags.rects();
      for (const b of beads) b.under = rs.some((r) => b.x + b.r > r.left && b.x - b.r < r.right && b.y + b.r > r.top && b.y - b.r < r.bottom);
    }
    for (const b of beads) {
      if (!R_ && phase === 'fused') { b.hx += Math.sin(t * 1.2 + b.phase) * 1.2; b.hy += Math.cos(t * 1.1 + b.phase) * 1.2; }
      if (!R_ && phase === 'spread') { b.hx += Math.sin(t * 0.5 + b.phase) * 2.5; b.hy += Math.cos(t * 0.45 + b.phase) * 2; }
      b.step(dt, R_);
      const c = phase === 'spread' ? clamp(spreadT / 1.2) : 0;
      b.dim = R_ ? (b.under ? 1 : 0) : approach(b.dim || 0, b.under ? 1 : 0, 4, dt);
      const li = c ? mix('#c9c4e0', b.col, c) : b.light, de = c ? mix('#5c5785', b.col, c * 0.65) : b.deep;
      drawJelly(g, { x: b.x, y: b.y, r: b.r, sx: b.sx, sy: b.sy, light: li, deep: de, glow: c * 0.5 * (1 - b.dim * 0.7), alpha: (phase === 'fused' ? 0.92 : 0.85) * (1 - b.dim * 0.6),
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
    // fused: the words hang under the whole pile; out: under the one moment
    if (out) tags.words.at(one.x, one.y + one.r * 1.1 + 6, 'bottom', 1);
    else tags.words.at(cx, cy + clusterR() * 1.05 + 8, 'bottom', 0.9);
    // "Other times" sits in the arc's quiet middle once they have spread
    if (phase === 'spread') { const C = arc(); tags.rest.at(C.cx, C.cy, 'center', clamp(spreadT)); } else tags.rest.at(cx, cy, 'center', 0);
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
    // (once spread, the arc's lights may sit under a label: they dim for it, so only the one moment is a body)
    bodies: () => { const { cx, cy } = centre(); return phase === 'spread' ? [circleRect(one.x, one.y, one.r * one.scale, 2)] : [circleRect(cx, cy, clusterR(), 2), circleRect(one.x, one.y, one.r, 2)]; },
    avoid: () => { const { cx, cy } = centre(); return [circleRect(cx, cy, clusterR() * (phase === 'spread' ? 1.4 : 1.1)), circleRect(one.x, one.y, one.r * 1.4), ...ctx.tags.rects()]; },
    get settled() { return phase === 'spread'; },
    probe: () => { const { cx, cy } = centre(); return { one: { x: one.x, y: one.y }, c: { x: cx, y: cy }, r: clusterR(), phase }; },
    destroy() { TM.clear(); ctx.tags.clear(); },
  };
}
