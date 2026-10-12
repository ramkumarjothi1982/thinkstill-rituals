// Self-criticism: soften a harsh interpretation without erasing accountability.
//
// The thought is locked in a cold, spiky crystal shell carrying the harsh
// verdict in the person's own words. Slow strokes over the shell round its
// spikes off where the finger passes and warm its colour; fast scratching
// does nothing much (gentle is the point). When it has softened, the shell is
// a soft, warm membrane and the verdict's plate has lost its hard edge, but a
// small glowing seed stays inside: "Something to learn". The lesson is kept;
// the cruelty goes. A tap (or the assist pill) smooths it a little each time.

import { Blob, drawGlow, drawJelly, clamp, lerp, approach, rgba, mix, Motes, blinkAt, circleRect, tintFor, TAU, Timers } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'soften_harshness';
const SPIKES = 14;
const STEEL = '#8a90bd', ICE = '#d7dcff';

export function mount(ctx) {
  const L = MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(40);
  const [light, deep] = tintFor(ctx.emotion === 'anger' ? 'shame' : ctx.emotion || 'shame');
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.16, 34, 58);
  const thought = new Blob({ x: ctx.from?.x ?? A0.x + A0.w / 2, y: ctx.from?.y ?? A0.y + A0.h / 2, r: R * 0.62, light, deep });
  const spike = new Float32Array(SPIKES).fill(1);     // 1 = sharp, 0 = smoothed
  const soft = new Float32Array(SPIKES);              // eased display value
  let softness = 0, phase = 'hard', held = null, warned = false, moves = 0, doneT = 0;
  const t0 = performance.now();
  const tags = {
    harsh: ctx.tags.add(ctx.parts.harsh, { kind: 'verdict', max: 220 }),
    core: ctx.tags.add(L.labels.core, { kind: 'label', colour: '#ffd98a' }),
  };

  function centre() { const A = ctx.area(); return { x: A.x + A.w / 2, y: A.y + A.h * 0.48 }; }
  const total = () => { let s = 0; for (let i = 0; i < SPIKES; i++) s += 1 - spike[i]; return s / SPIKES; };

  /** Smooth the spikes near angle a by amount k (a stroke, or a tap). */
  function smoothAt(a, k) {
    for (let i = 0; i < SPIKES; i++) {
      const ai = (i / SPIKES) * TAU;
      let d = Math.abs(((a - ai + Math.PI * 3) % TAU) - Math.PI);
      const w = Math.exp(-(d * d) / 0.28);
      spike[i] = Math.max(0, spike[i] - k * w);
    }
    softness = total();
    ctx.progress(softness * 0.95);
    if (softness >= 0.9 && phase === 'hard') finish();
  }
  function finish() {
    phase = 'soft'; doneT = 0;
    for (let i = 0; i < SPIKES; i++) spike[i] = 0;
    softness = 1;
    ctx.haptic('success'); ctx.fx('bloom', { intensity: 0.5 });
    const c = centre();
    motes.burst(c.x, c.y, light, 10, { speed: 46, size: 2.6 });
    ctx.progress(1);
    TM.after(() => resolve({ moves, ms: performance.now() - t0 }), rm() ? 200 : 1100);
  }
  function step() {
    if (phase !== 'hard') return;
    moves++;
    // the sharpest side first
    let best = 0;
    for (let i = 1; i < SPIKES; i++) if (spike[i] > spike[best]) best = i;
    smoothAt((best / SPIKES) * TAU, 0.75);
    ctx.haptic('light'); ctx.fx('swish', { intensity: 0.3 });
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    const c = centre();
    thought.hx = c.x; thought.hy = c.y;
    thought.step(dt, R_);
    for (let i = 0; i < SPIKES; i++) soft[i] = R_ ? spike[i] : approach(soft[i], spike[i], 6, dt);
    let shown = 0; for (let i = 0; i < SPIKES; i++) shown += soft[i]; shown /= SPIKES;   // 1 hard → 0 soft
    const warm = 1 - shown;
    // the shell: a star polygon whose spikes shorten as they're smoothed, steel warming into the thought's tint
    const col = mix(STEEL, light, warm), rim = mix(ICE, '#fff3fa', warm);
    drawGlow(g, c.x, c.y, R * 2, mix('#5b5f9a', deep, warm), 0.38);
    g.save();
    g.translate(c.x, c.y);
    const breathe = R_ ? 1 : 1 + 0.015 * Math.sin(t * 1.4) * warm;
    g.beginPath();
    for (let i = 0; i <= SPIKES * 2; i++) {
      const k = i % (SPIKES * 2);
      const a = (k / (SPIKES * 2)) * TAU - Math.PI / 2;
      const sp = k % 2 === 0 ? soft[(k / 2) | 0] : 0;
      const rr = R * breathe * (k % 2 === 0 ? 1 + 0.42 * sp : 1 - 0.1 * shown);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y);
      else if (warm > 0.65) {
        // soft enough: round curves instead of sharp joins
        const am = ((k - 0.5) / (SPIKES * 2)) * TAU - Math.PI / 2;
        g.quadraticCurveTo(Math.cos(am) * R * 1.02, Math.sin(am) * R * 1.02, x, y);
      } else g.lineTo(x, y);
    }
    g.closePath();
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.3);
    gr.addColorStop(0, rgba('#ffffff', 0.55 + 0.2 * warm)); gr.addColorStop(0.5, rgba(col, 0.5 + 0.15 * shown)); gr.addColorStop(1, rgba(mix('#3e4170', deep, warm), 0.75));
    g.fillStyle = gr; g.fill();
    g.lineJoin = warm > 0.65 ? 'round' : 'miter';
    g.strokeStyle = rgba(rim, 0.75); g.lineWidth = 1.6 + shown * 0.8; g.stroke();
    // hard facets glint (only while hard)
    if (shown > 0.2) {
      g.globalAlpha = shown * 0.45; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
      for (let i = 0; i < SPIKES; i += 3) { const a = (i / SPIKES) * TAU - Math.PI / 2; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5); g.lineTo(Math.cos(a) * R * (1 + 0.38 * soft[i]), Math.sin(a) * R * (1 + 0.38 * soft[i])); g.stroke(); }
      g.globalAlpha = 1;
    }
    g.restore();
    // the thought inside, and its seed of accountability (kept, glowing)
    thought.draw(g, { tension: lerp(0.15, 0.85, shown), sad: shown * 0.5, calm: warm * 0.7, blink: blinkAt(t, 0.4), press: held ? 0.6 : 0, lookY: 0.3 * shown }, { glow: 0.2 });
    const sx = c.x + R * 0.36, sy = c.y + R * 0.4;
    drawGlow(g, sx, sy, R * (0.36 + warm * 0.12), '#ffd98a', 0.65 + 0.2 * Math.sin(t * 2) * (R_ ? 0 : 1));
    drawJelly(g, { x: sx, y: sy, r: R * 0.1, light: '#fff4c8', deep: '#ffb84a', glow: 0, alpha: 1 });
    motes.draw(g, dt);
    if (phase === 'soft') doneT += dt;
    // the verdict plate softens with the shell; the seed's label arrives once it is soft
    tags.harsh.el.style.setProperty('--bx-soft', warm.toFixed(2));
    tags.harsh.at(c.x, c.y - R * (1.42 + 0.3 * shown) - 6, 'top', 1);
    tags.core.at(c.x, c.y + R * 1.18 + 10, 'bottom', phase === 'soft' ? clamp(doneT * 2) : warm > 0.4 ? (warm - 0.4) : 0);
    return true;
  }

  function pointer(e) {
    const c = centre();
    const on = (x, y) => Math.hypot(x - c.x, y - c.y) < R * 1.55;
    if (e.type === 'down') {
      if (!on(e.x, e.y)) return false;
      held = { id: e.id, x: e.x, y: e.y, t: e.t, x0: e.x, y0: e.y, t0: e.t, path: 0 };
      thought.sqV += 1.2; ctx.haptic('light');
      return true;
    }
    if (!held || held.id !== e.id) return false;
    if (e.type === 'move') {
      const dx = e.x - held.x, dy = e.y - held.y, d = Math.hypot(dx, dy);
      const dts = Math.max(1, e.t - held.t) / 1000;
      const sp = d / dts;
      held.x = e.x; held.y = e.y; held.t = e.t; held.path += d;
      if (phase === 'hard' && d > 0.5) {
        // gentle strokes work; scratching barely does
        const gentle = sp < 60 ? 0.4 : sp <= 700 ? 1 : 0.15;
        if (gentle < 0.2 && !warned && held.path > 120) { warned = true; ctx.hint(L.hint2); }
        smoothAt(Math.atan2(e.y - c.y, e.x - c.x) + Math.PI / 2, (d / (R * 9)) * gentle);
        held.tick = (held.tick || 0) + d * gentle;
        if (held.tick > 90) { held.tick = 0; ctx.haptic('light'); }
      }
      return true;
    }
    if (e.type === 'up' || e.type === 'cancel') {
      const h0 = held; held = null; moves++;
      if (h0.path < 12 && e.t - h0.t0 < 380 && phase === 'hard') { smoothAt(Math.atan2(e.y - c.y, e.x - c.x) + Math.PI / 2, 0.6); ctx.haptic('light'); }
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => { const c = centre(); return Math.hypot(x - c.x, y - c.y) < R * 1.55; },
    assist: step,
    avoid: () => { const c = centre(); return [circleRect(c.x, c.y, R * 1.5), ...ctx.tags.rects()]; },
    get settled() { return phase === 'soft'; },
    probe: () => { const c = centre(); return { c, R, softness, phase }; },
    destroy() { TM.clear(); ctx.tags.clear(); },
  };
}
