// Valid anger: identify the boundary or response that may be needed.
//
// The anger is a hot, glowing thought, and it has a point: heat leaks out of
// it through a broken outline where a line was crossed. Draw round it with a
// finger and each stroke becomes a ribbon of firm light; close the gaps and
// the boundary holds. The heat stops at the line and the thought steadies
// (still warm: the anger isn't erased or argued away). Then: what would that
// line ask for? Four quiet choices, none of them "forgive". The chosen one is
// written on the line. Taps near the outline (or the assist pill) set posts.

import { Blob, drawGlow, clamp, lerp, approach, rgba, mix, LIGHT, Motes, blinkAt, circleRect, tintFor, TAU, Timers } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'find_boundary';
const BINS = 28;
const EMBER = LIGHT.ember, LINE = '#ffcf7a';

export function mount(ctx) {
  const L = MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(44);
  const anger = /anger|frustr|resent|irrit|rage|fury/.test(ctx.emotion || '') || !ctx.emotion;
  const [light, deep] = anger ? EMBER : tintFor(ctx.emotion);
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.11, 24, 40);
  const thought = new Blob({ x: ctx.from?.x ?? A0.x + A0.w / 2, y: ctx.from?.y ?? A0.y + A0.h / 2, r: R, light, deep });
  const bins = new Float32Array(BINS);    // 0..1 how drawn each sector is
  const shown = new Float32Array(BINS);
  const broken = new Uint8Array(BINS);    // the outline's existing pieces (the gaps are where the line was crossed)
  for (let i = 0; i < BINS; i++) broken[i] = (i * 7) % 5 < 2 ? 1 : 0;
  const trail = { x: new Float32Array(40), y: new Float32Array(40), n: 0, i: 0, fade: 0 };
  let phase = 'draw';     // draw → closed → choosing → chosen
  let closeT = 0, choice = null, held = null, moves = 0;
  const t0 = performance.now();
  const tags = {
    words: ctx.tags.add(ctx.parts.excerpt, { kind: 'words' }),
    line: ctx.tags.add(L.labels.line, { kind: 'label', colour: LINE }),
  };

  function geo() {
    const A = ctx.area();
    const rr = Math.min(A.w * 0.36, A.h * 0.36, R * 3.4);
    return { cx: A.x + A.w / 2, cy: A.y + A.h * 0.46, rr };
  }
  function homes() { const G = geo(); thought.hx = G.cx; thought.hy = G.cy; }
  homes();
  if (rm()) { thought.x = thought.hx; thought.y = thought.hy; }

  const drawn = () => { let s = 0; for (let i = 0; i < BINS; i++) s += Math.max(bins[i], broken[i] * 0.9); return s / BINS; };
  function fill(a, spread, k = 1) {
    const c = ((a % TAU) + TAU) % TAU;
    const center = Math.round((c / TAU) * BINS);
    for (let d = -spread; d <= spread; d++) {
      const i = ((center + d) % BINS + BINS) % BINS;
      bins[i] = Math.min(1, bins[i] + k * (1 - Math.abs(d) / (spread + 1)));
    }
    ctx.progress(drawn() * 0.8);
    if (drawn() >= 0.92 && phase === 'draw') close();
  }
  function close() {
    phase = 'closed'; closeT = 0;
    for (let i = 0; i < BINS; i++) bins[i] = 1;
    ctx.haptic('success'); ctx.fx('ground', { intensity: 0.5 });
    const G = geo();
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; motes.burst(G.cx + Math.cos(a) * G.rr, G.cy + Math.sin(a) * G.rr, LINE, 3, { speed: 30, size: 2.2 }); }
    TM.after(ask, rm() ? 200 : 1000);
  }
  async function ask() {
    if (phase !== 'closed') return;
    phase = 'choosing';
    const v = await ctx.choose(L.hint2, L.responses.map((label, i) => ({ label, value: i, primary: false })));
    if (v == null) { phase = 'closed'; TM.after(ask, 400); return; }
    choice = L.responses[v] || L.responses[3];
    phase = 'chosen'; moves++;
    tags.line.set(`${L.labels.line}: ${choice}`);
    ctx.haptic('soft'); ctx.fx('chime', { intensity: 0.45 });
    ctx.progress(1);
    TM.after(() => resolve({ moves, ms: performance.now() - t0, choice }), rm() ? 200 : 900);
  }
  function step() {
    if (phase !== 'draw') { if (phase === 'closed') ask(); return; }
    moves++;
    // the next unfinished stretch of the outline
    let start = 0;
    for (let i = 0; i < BINS; i++) if (bins[i] < 0.9 && !broken[i]) { start = i; break; }
    for (let d = 0; d < 6; d++) bins[(start + d) % BINS] = 1;
    ctx.haptic('light'); ctx.fx('pluck', { intensity: 0.3 });
    ctx.progress(drawn() * 0.8);
    if (drawn() >= 0.92) close();
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    const G = geo();
    homes();
    thought.step(dt, R_);
    const k = drawn();
    const settled = phase !== 'draw';
    // heat: slow rings breathing out of the thought; past the outline until it holds, then stopping at it
    if (!R_) {
      for (let w = 0; w < 3; w++) {
        const ph = ((t * (settled ? 0.35 : 0.55)) + w / 3) % 1;
        const rad = R * 1.1 + ph * (settled ? G.rr - R * 1.2 : G.rr * 1.5);
        g.globalAlpha = (1 - ph) * (settled ? 0.18 : 0.3);
        g.strokeStyle = rgba(deep, 0.9); g.lineWidth = 2;
        g.beginPath(); g.arc(G.cx, G.cy, rad, 0, TAU); g.stroke();
      }
      g.globalAlpha = 1;
    }
    drawGlow(g, G.cx, G.cy, R * (settled ? 2.6 : 3.2), deep, settled ? 0.4 : 0.55);
    // the outline: old broken pieces (dim), and what the person has drawn (firm light)
    const seg = TAU / BINS;
    g.lineCap = 'round';
    for (let i = 0; i < BINS; i++) {
      shown[i] = R_ ? bins[i] : approach(shown[i], bins[i], 7, dt);
      const a0 = i * seg + 0.02, a1 = (i + 1) * seg - 0.02;
      if (shown[i] > 0.02) {
        const glowA = settled ? 0.95 : 0.85 * shown[i];
        g.globalAlpha = glowA * 0.35; g.strokeStyle = LINE; g.lineWidth = 9;
        g.beginPath(); g.arc(G.cx, G.cy, G.rr, a0, a1); g.stroke();
        g.globalAlpha = glowA; g.strokeStyle = settled ? '#fff1cc' : mix('#ffb35c', '#fff1cc', shown[i]); g.lineWidth = 3.2;
        g.beginPath(); g.arc(G.cx, G.cy, G.rr, a0, a1); g.stroke();
      } else if (broken[i]) {
        g.globalAlpha = 0.4; g.strokeStyle = '#d8b9a8'; g.lineWidth = 1.6; g.setLineDash?.([3, 5]);
        g.beginPath(); g.arc(G.cx, G.cy, G.rr, a0, a1); g.stroke(); g.setLineDash?.([]);
      }
    }
    g.globalAlpha = 1;
    if (phase === 'closed' || phase === 'choosing' || phase === 'chosen') {
      closeT += dt;
      const a = R_ ? 1 : clamp(closeT / 0.6);
      drawGlow(g, G.cx, G.cy - G.rr, 14 * a, '#fff1cc', 0.6 * a);
    }
    // the finger's ribbon while drawing
    if (trail.n > 1) {
      trail.fade = held ? 1 : approach(trail.fade, 0, 4, dt);
      g.globalAlpha = 0.7 * trail.fade; g.strokeStyle = '#ffe0a6'; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath();
      for (let q = 0; q < trail.n; q++) { const j = (trail.i - trail.n + q + 40) % 40; if (q) g.lineTo(trail.x[j], trail.y[j]); else g.moveTo(trail.x[j], trail.y[j]); }
      g.stroke(); g.globalAlpha = 1;
      if (trail.fade < 0.02 && !held) trail.n = 0;
    }
    // the anger itself: hot and restless, steadier (not cooler) once the line holds
    const jit = R_ ? 0 : (settled ? 0.3 : 1.4) * (1 - k * 0.5);
    thought.draw(g, { tension: settled ? 0.35 : 0.7, cross: settled ? 0.35 : 0.85, calm: phase === 'chosen' ? 0.35 : 0, blink: blinkAt(t, 0.5), press: thought.press ? 1 : 0 },
      { x: thought.x + (jit ? Math.sin(t * 31) * jit : 0), y: thought.y + (jit ? Math.cos(t * 27) * jit : 0), glow: 0.6 });
    motes.draw(g, dt);
    tags.words.at(thought.x, thought.y + R * 1.08 + 6, 'bottom', 1);
    tags.line.at(G.cx, G.cy - G.rr - 14, 'top', phase === 'chosen' ? 1 : 0);
    return true;
  }

  function pointer(e) {
    const G = geo();
    const near = (x, y) => { const d = Math.hypot(x - G.cx, y - G.cy); return d > G.rr * 0.55 && d < G.rr * 1.5; };
    if (e.type === 'down') {
      if (thought.hit(e.x, e.y)) { thought.sqV += 2; ctx.haptic('light'); return true; }
      if (phase !== 'draw' || !near(e.x, e.y)) return false;
      held = { id: e.id, x0: e.x, y0: e.y, t0: e.t, path: 0, x: e.x, y: e.y };
      trail.n = 0; trail.fade = 1;
      return true;
    }
    if (!held || held.id !== e.id) return false;
    if (e.type === 'move') {
      const d = Math.hypot(e.x - held.x, e.y - held.y);
      held.path += d; held.x = e.x; held.y = e.y;
      trail.x[trail.i] = e.x; trail.y[trail.i] = e.y; trail.i = (trail.i + 1) % 40; trail.n = Math.min(40, trail.n + 1);
      if (phase === 'draw' && near(e.x, e.y)) {
        fill(Math.atan2(e.y - G.cy, e.x - G.cx), 1, 0.55);
        if (d > 0 && ((held.path / 70) | 0) !== (((held.path - d) / 70) | 0)) ctx.haptic('light');
      }
      return true;
    }
    if (e.type === 'up' || e.type === 'cancel') {
      const h0 = held; held = null; moves++;
      if (h0.path < 12 && e.t - h0.t0 < 380 && phase === 'draw') { fill(Math.atan2(e.y - G.cy, e.x - G.cx), 2, 1); ctx.haptic('light'); ctx.fx('pluck', { intensity: 0.3 }); }
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => { const G = geo(); const d = Math.hypot(x - G.cx, y - G.cy); return d < G.rr * 1.5; },
    assist: step,
    avoid: () => { const G = geo(); return [circleRect(G.cx, G.cy, G.rr + 16), ...ctx.tags.rects()]; },
    get settled() { return phase === 'chosen'; },
    probe: () => { const G = geo(); return { c: { x: G.cx, y: G.cy }, rr: G.rr, drawn: drawn(), phase }; },
    destroy() { TM.clear(); ctx.tags.clear(); },
  };
}
