// The 20 world laws. Every V3 ritual = one touch engine + one world law.
//
// GATE laws change how the engine itself may be moved (the engine asks
// L.gate(raw) every frame): 1 Half-Speed Hush, 2 Pause Between Pulses,
// 5 Three Gentle Beats, 6 Ease the Last Inch, 10 Wait for the Wake.
//
// PHASE laws add one closing move after the engine's win state: a small,
// fully interactive mini-scene with its own tap alternative. Each law also
// owns its "light finale", drawn over the engine's own finale.
//
// Nothing here completes by itself: every predicate is fed by touches (or by
// the "Tap instead" button, which is a real input too).

import { TAU, clamp, lerp, invLerp, smooth, ease, dist, rgba, mix, glow, glint, orb, halo, motes, rng, Spring2, roundRect } from './fx.js';
import { drawWords } from './words.js';
import { CurveTrace, bezier, arcPts, hit, waitRing, Wobble } from './kit.js';
import { drawFinale } from './finales.js';

export const GATE_LAWS = new Set([1, 2, 5, 6, 10]);

/**
 * L: { g, stage, pal, now(), particles, ripples, words, photos, sound, haptic, react, say,
 *      engine (for pointAt / progress), route (finger path recorded during play), reduced, lowStim, setPrompt }
 */
export function createLaw(n, L) {
  const make = LAWS[n];
  if (!make) throw new Error(`Unknown world law ${n}`);
  const law = make(L);
  law.n = n;
  law.kind = GATE_LAWS.has(n) ? 'gate' : 'phase';
  law.gate ??= (raw) => raw;
  law.allow ??= (p) => law.gate(p) >= p - 1e-6;
  law.gateReady ??= () => true;
  law.locked ??= false;
  return law;
}

// ------------------------------------------------------------ helpers --
const S = (L) => L.stage;
const unit = (L) => L.stage.s;
function token(L) { return L.words.token; }
function tokenOrb(L, g, x, y, r, { alpha = 1, colour, photo = 0, label = true } = {}) {
  const c = colour || L.pal.glow;
  glow(g, x, y, r * 2.4, c, 0.4 * alpha);
  if (L.photos.n && photo >= 0) L.photos.draw(g, photo, x, y, r * 2, { shape: 'bubble', alpha, glow: 0.4, glowColour: c });
  else orb(g, x, y, r, c, { alpha });
  if (label) drawWords(g, token(L), x, y + r + 16 * unit(L), { style: 'light', size: 13 * unit(L) + 2, maxWidth: 170 * unit(L), lines: 1, alpha: alpha * 0.95, glowColour: c });
}
/** Ghost-hint helpers: {from:{x,y}, to:{x,y}} or {tap:{x,y}} or {path:[[x,y]...]} */
const swipe = (a, b) => ({ from: a, to: b });
const tapAt = (p) => ({ tap: p });
const lockText = {
  1: 'Stay behind the guide light — it sets the pace.',
  2: 'Lift your finger and watch the pulse finish.',
  5: 'Let it settle before the next beat.',
  6: 'Slow down for the last stretch.',
  10: 'Lift and watch the wake fade before moving again.',
};
export const LAW_LOCK_TEXT = lockText;

// ---------------------------------------------------------- finales --
// Each law's light finale lives in finales.js.
export function drawLightFinale(n, g, t, L, state) { drawFinale(n, g, clamp(t), L, state); }

// --------------------------------------------------------- gate laws --
function halfSpeed(L) {
  // A guide light moves along the engine's path; the control can't pass it.
  const dur = clamp((L.seconds || 45) * 0.32, 9, 20);
  let started = false, guide = 0, cur = 0, ahead = 0, t0 = 0;
  return {
    name: 'Half-Speed Hush', howTo: 'A guide light leads; keep your move behind it.',
    get locked() { return ahead > 0.02 && guide < 1; },
    lockText: lockText[1],
    onDown() { if (!started) { started = true; t0 = L.now(); } },
    gate(raw) {
      if (!started && raw > 0.001) { started = true; t0 = L.now(); }
      if (!started) return Math.min(raw, 0.02);
      guide = clamp((L.now() - t0) / dur);
      const allowed = Math.min(raw, guide + 0.02);
      ahead = raw - allowed; cur = allowed;
      return allowed;
    },
    gateReady: () => guide >= 0.98,
    frame(g) {
      if (!started && cur <= 0) return;
      const p = L.engine.pointAt(Math.min(1, guide + 0.02));
      const t = L.now();
      const c = ahead > 0.02 ? '#ffffff' : '#8f7bff';
      glow(g, p.x, p.y, 26 + Math.sin(t * 4) * 3, c, ahead > 0.02 ? 0.9 : 0.6);
      orb(g, p.x, p.y, 5.5, '#c9bdff');
      g.strokeStyle = rgba('#c9bdff', 0.5); g.lineWidth = 1.5; g.beginPath(); g.ellipse(p.x, p.y, 14, 6, t * 1.5, 0, TAU); g.stroke();
    },
    payoff(g, k) { const p = L.engine.pointAt(1); halo(g, p.x, p.y, 40 * k + 10, L.now(), '#c9bdff', { rings: 3, alpha: 0.4 * k }); },
  };
}
function pauseBetween(L) {
  // Two halves; between them: lift, and watch one pulse finish.
  let reached = false, lifted = false, pulseAt = -1, down = false, open = false;
  const PULSE = 1.6;
  return {
    name: 'Pause Between Pulses', howTo: 'Do the first half, lift, watch one pulse, then the second half.',
    get locked() { return reached && !open; },
    lockText: lockText[2],
    onDown() { down = true; },
    onUp() { down = false; if (reached && !lifted) { lifted = true; pulseAt = L.now(); L.sound('thrum', { intensity: 0.4 }); } },
    gate(raw) {
      if (!reached && raw >= 0.5) { reached = true; L.haptic('soft'); if (!down) { lifted = true; pulseAt = L.now(); } }
      if (reached && !open && pulseAt >= 0 && L.now() - pulseAt > PULSE) { open = true; L.sound('chime', { intensity: 0.4 }); L.haptic('light'); }
      return reached && !open ? Math.min(raw, 0.5) : raw;
    },
    frame(g) {
      if (!reached || open) return;
      const p = L.engine.pointAt(0.5);
      if (pulseAt < 0) { waitRing(g, p.x, p.y, 20, 0, '#ffffff', 0.7 + 0.3 * Math.sin(L.now() * 5)); return; }
      const k = clamp((L.now() - pulseAt) / PULSE);
      g.strokeStyle = rgba('#ffffff', 0.8 * (1 - k)); g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.arc(p.x, p.y, 12 + k * 90, 0, TAU); g.stroke();
      waitRing(g, p.x, p.y, 16, k, L.pal.glow);
    },
    payoff(g, k) {
      const a = L.engine.pointAt(0.25), b = L.engine.pointAt(0.75);
      glow(g, a.x, a.y, 30 * k, L.pal.glow, 0.6 * k); glow(g, b.x, b.y, 30 * k, L.pal.glow, 0.6 * k);
      glow(g, (a.x + b.x) / 2, (a.y + b.y) / 2, 18 * k, '#ffffff', 0.8 * k);
    },
  };
}
function threeBeats(L) {
  // Three deliberate micro-moves; after each, lift and let it settle.
  const SETTLE = 1.1;
  let beat = 0, waiting = false, liftAt = -1, down = false;
  const marks = [1 / 3, 2 / 3, 1];
  return {
    name: 'Three Gentle Beats', howTo: 'Three small moves — after each one, lift and let it settle.',
    get locked() { return waiting; },
    lockText: lockText[5],
    get beat() { return beat; },
    onDown() { down = true; if (waiting) liftAt = -1; },
    onUp() { down = false; if (waiting) liftAt = L.now(); },
    gate(raw) {
      if (waiting && liftAt >= 0 && L.now() - liftAt >= SETTLE) { waiting = false; beat++; L.sound('pluck', { note: beat + 2, intensity: 0.5 }); L.haptic('light'); }
      const cap = marks[Math.min(2, beat)];
      // tolerant: an engine may settle a hair short of exactly 1/3, 2/3 or 1
      if (!waiting && beat < 3 && raw >= cap - 0.004) { waiting = true; liftAt = down ? -1 : L.now(); L.haptic('soft'); }
      return Math.min(raw, cap);
    },
    gateReady: () => beat >= 3,
    frame(g) {
      const { cx, y } = S(L), s = unit(L);
      for (let i = 0; i < 3; i++) {
        const lit = i < beat, x = cx + (i - 1) * 26 * s, yy = y + 8 * s;
        glow(g, x, yy, lit ? 16 : 9, lit ? '#ffe6a6' : '#9a90c8', lit ? 0.85 : 0.4);
        orb(g, x, yy, lit ? 4.5 : 3, lit ? '#fff2c8' : '#8a80b8', { alpha: lit ? 1 : 0.6 });
      }
      if (waiting) {
        const p = L.engine.pointAt(marks[Math.min(2, beat)]);
        const k = liftAt >= 0 ? clamp((L.now() - liftAt) / SETTLE) : 0;
        waitRing(g, p.x, p.y, 18, k, '#ffe6a6', 0.9);
      }
    },
    payoff(g, k) {
      const { cx, y } = S(L), s = unit(L);
      g.strokeStyle = rgba('#ffe6a6', 0.6 * k); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 26 * s, y + 8 * s); g.lineTo(cx, y - 6 * s); g.lineTo(cx + 26 * s, y + 8 * s); g.stroke();
      glow(g, cx, y, 40 * s * k, '#ffe6a6', 0.5 * k);
    },
  };
}
function easeLastInch(L) {
  // In the final third, the object only eases forward (no abrupt stop).
  let cur = 0, last = -1, inSlow = false;
  const RATE = 0.085;
  return {
    name: 'Ease the Last Inch', howTo: 'Move normally, then slow right down for the last stretch.',
    get locked() { return inSlow && cur < 0.999; },
    lockText: lockText[6],
    gate(raw) {
      const now = L.now(), dt = last < 0 ? 0 : Math.min(0.25, now - last); last = now;
      if (raw < 2 / 3) { cur = raw; inSlow = false; return cur; }
      inSlow = raw > cur + 0.004;
      if (cur < 2 / 3) cur = Math.max(cur, 2 / 3);
      cur = Math.min(raw, cur + RATE * dt);
      return cur;
    },
    frame(g) {
      if (cur < 0.55) return;
      const a = L.engine.pointAt(2 / 3), b = L.engine.pointAt(1);
      g.save(); g.setLineDash([3, 7]); g.strokeStyle = rgba('#ffffff', 0.4); g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.restore();
      glow(g, b.x, b.y, 22, L.pal.glow, 0.5 + 0.2 * Math.sin(L.now() * 3));
    },
    payoff(g, k) { const b = L.engine.pointAt(1); glow(g, b.x, b.y, 36 * k, '#ffffff', 0.5 * k); },
  };
}
function waitWake(L) {
  // After each move: lift, and watch the wake fade before moving again.
  const WAKE = 1.5;
  let moved = false, startP = 0, waking = -1, cur = 0, down = false, lastWakeDone = false;
  return {
    name: 'Wait for the Wake', howTo: 'Move, lift, and watch the last ripple fade before moving again.',
    get locked() { return waking >= 0; },
    lockText: lockText[10],
    onDown() { down = true; startP = cur; },
    onUp() {
      down = false;
      if (cur > startP + 0.01) { moved = true; waking = L.now(); const p = L.engine.pointAt(cur); L.ripples.add(p.x, p.y, { colour: L.pal.glow, speed: 70 }); L.sound('drip', { note: Math.round(cur * 6) }); }
    },
    gate(raw) {
      if (waking >= 0) {
        if (L.now() - waking >= WAKE) { waking = -1; if (cur >= 0.995) lastWakeDone = true; } else return cur;
      }
      cur = raw;
      return cur;
    },
    gateReady: () => lastWakeDone || (cur >= 0.995 && waking < 0 && !down && moved),
    frame(g) {
      if (waking < 0) return;
      const p = L.engine.pointAt(cur), k = clamp((L.now() - waking) / WAKE);
      for (let i = 0; i < 3; i++) { const kk = clamp(k * 1.2 - i * 0.18); if (kk <= 0) continue; g.strokeStyle = rgba(L.pal.glow, 0.7 * (1 - kk)); g.lineWidth = 2; g.beginPath(); g.ellipse(p.x, p.y, 10 + kk * 70, (10 + kk * 70) * 0.45, 0, 0, TAU); g.stroke(); }
      waitRing(g, p.x, p.y, 14, k, '#ffffff', 0.8);
    },
    payoff(g, k) { const p = L.engine.pointAt(1); g.strokeStyle = rgba('#e6f6ff', 0.5 * k); g.lineWidth = 1.5; g.beginPath(); g.ellipse(p.x, p.y, 90 * k, 34 * k, 0, 0, TAU); g.stroke(); },
  };
}

// -------------------------------------------------------- phase laws --
/** Shared shell for a closing-move law. */
function phase(L, spec) {
  const st = { progress: 0, done: false, t0: 0 };
  return {
    kind: 'phase', ...spec,
    get progress() { return spec.progress ? spec.progress() : st.progress; },
    get done() { return spec.isDone(); },
  };
}

function mirrorTouch(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const dx = Math.min(w * 0.36, 150 * s), dy = Math.min(h * 0.3, 120 * s);
  const left = new CurveTrace(bezier([cx - 12 * s, cy - dy], [cx - dx * 1.3, cy - dy * 0.6], [cx - dx * 1.3, cy + dy * 0.6], [cx - 12 * s, cy + dy], 60), { tol: 44 * s + 8 });
  const right = new CurveTrace(left.pts.map(([x, y]) => [2 * cx - x, y]), { tol: 44 * s + 8 });
  let side = 0, meetAt = -1;
  const cur = () => (side === 0 ? left : right);
  return phase(L, {
    name: 'Mirror Touch', howTo: 'Trace the left curve, then its reflection on the right.',
    progress: () => (left.progress + right.progress) / 2,
    isDone: () => meetAt >= 0 && L.now() - meetAt > 0.6,
    down(p) { this.move(p); },
    move(p) { if (meetAt >= 0) return; if (cur().feed(p.x, p.y)) { L.particles.emit({ x: p.x, y: p.y, life: 0.6, size: 7, colour: L.pal.glow }); if (Math.random() < 0.15) L.sound('pluck', { note: Math.round(cur().progress * 5) + side * 5, intensity: 0.35 }); } check(); },
    up() {},
    assist() { if (meetAt < 0) { cur().advance(0.25); check(); } },
    hint() { const c = cur(); const a = c.pointAt(c.progress), b = c.pointAt(Math.min(1, c.progress + 0.3)); return swipe(a, b); },
    frame(g, t) {
      left.draw(g, { colour: L.pal.glow, width: 7, guide: side === 0 ? 1 : 0.2, t });
      right.draw(g, { colour: L.pal.accent, width: 7, guide: side === 1 ? 1 : 0.15, t });
      g.save(); g.setLineDash([2, 8]); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(cx, cy - dy - 20); g.lineTo(cx, cy + dy + 20); g.stroke(); g.restore();
      drawWords(g, token(L), cx, cy, { style: 'light', size: 14 * s + 2, maxWidth: dx * 1.3, lines: 2, glowColour: L.pal.glow });
      if (meetAt >= 0) { const k = smooth(clamp((L.now() - meetAt) / 0.8)); glow(g, cx, cy - dy, 30 * k, '#ffffff', 0.7 * k); glow(g, cx, cy + dy, 30 * k, '#ffffff', 0.7 * k); }
    },
    payoff(g, k) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, dx * 1.2);
      gr.addColorStop(0, rgba(L.pal.accent, 0.25 * k)); gr.addColorStop(1, rgba(L.pal.accent, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(...left.pts[0]); for (const q of left.pts) g.lineTo(q[0], q[1]); for (let i = right.pts.length - 1; i >= 0; i--) g.lineTo(right.pts[i][0], right.pts[i][1]); g.fill();
      g.restore();
    },
  });
  function check() {
    if (side === 0 && left.done) { side = 1; L.sound('glass', { note: 2 }); L.haptic('light'); L.setPrompt('Now the reflection on the right.'); }
    if (side === 1 && right.done && meetAt < 0) { meetAt = L.now(); L.sound('shimmer', { intensity: 0.5 }); L.haptic('success'); L.react('nod'); }
  }
}

function sCurve(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const ax = Math.min(w * 0.36, 140 * s), ay = Math.min(h * 0.34, 150 * s);
  const tr = new CurveTrace([...bezier([cx - ax, cy - ay], [cx + ax * 1.6, cy - ay], [cx - ax * 1.6, cy + ay], [cx + ax, cy + ay], 90)], { tol: 40 * s + 8 });
  const bead = new Spring2(tr.pts[0][0], tr.pts[0][1], { stiffness: 200, damping: 18 });
  const jag = [];
  let dragging = false, endAt = -1, slips = 0;
  return phase(L, {
    name: 'Gentle S-Curve', howTo: 'Guide the bead along the S, through the middle bend.',
    progress: () => tr.progress,
    isDone: () => endAt >= 0 && L.now() - endAt > 0.5,
    down(p) { dragging = hit(p, bead.x, bead.y, 46 * s + 10) || tr.feed(p.x, p.y); },
    move(p) {
      if (!dragging || endAt >= 0) return;
      jag.push([p.x, p.y]); if (jag.length > 120) jag.shift();
      const was = tr.off;
      if (tr.feed(p.x, p.y)) { if (Math.random() < 0.12) L.sound('pluck', { note: Math.round(tr.progress * 8), intensity: 0.3 }); }
      if (tr.off && !was) { slips++; L.sound('bubble', { note: 1, intensity: 0.3 }); }
      if (tr.done && endAt < 0) { endAt = L.now(); L.sound('shimmer'); L.haptic('success'); L.react('nod'); }
    },
    up() { dragging = false; },
    assist() { tr.advance(0.2); if (tr.done && endAt < 0) { endAt = L.now(); L.sound('shimmer'); L.haptic('success'); } },
    hint() { const a = tr.pointAt(tr.progress), b = tr.pointAt(Math.min(1, tr.progress + 0.25)); return swipe(a, b); },
    frame(g, t, dt) {
      tr.draw(g, { colour: '#dfe6ff', core: '#ffffff', width: 6, t });
      const h0 = tr.head; bead.to(h0.x, h0.y); bead.update(dt);
      if (jag.length > 1 && endAt < 0) { g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1.5; g.beginPath(); jag.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
      glow(g, bead.x, bead.y, 26, '#e6ecff', 0.7); orb(g, bead.x, bead.y, 9 * s + 3, '#cfd8ff');
      drawWords(g, token(L), cx, cy - ay - 26 * s, { style: 'plate', size: 13 * s + 2, maxWidth: w * 0.8, lines: 1 });
      void slips;
    },
    payoff(g, k) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#f2f5ff', 0.5 * k); g.lineWidth = 3; g.beginPath(); tr.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore(); },
  });
}

function oneDirection(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const r = Math.min(w, h) * 0.32;
  const out = new CurveTrace(arcPts(cx, cy, r, -Math.PI / 2, Math.PI / 2, 80), { tol: 42 * s + 8 });
  const back = new CurveTrace(arcPts(cx, cy, r * 0.8, Math.PI / 2, -Math.PI / 2, 80), { tol: 42 * s + 8 });
  let stage = 0, still = 0, lastP = null, doneAt = -1; // 0 out, 1 pause, 2 back
  const marker = { x: cx, y: cy + r };
  return phase(L, {
    name: 'One Direction Change', howTo: 'Sweep clockwise to the marker, pause, then reverse once.',
    progress: () => (out.progress + (stage >= 2 ? 0.25 + back.progress : stage === 1 ? still * 0.25 : 0)) / 2.25,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.5,
    down(p) { lastP = p; this.move(p); },
    move(p) {
      if (stage === 0) { if (out.feed(p.x, p.y) && Math.random() < 0.1) L.sound('click'); if (out.done) { stage = 1; still = 0; L.sound('chime', { intensity: 0.35 }); L.setPrompt('Pause here a moment…'); } }
      else if (stage === 1) { if (lastP && dist(p.x, p.y, lastP.x, lastP.y) > 12) still = Math.max(0, still - 0.2); }
      else if (stage === 2) { if (back.feed(p.x, p.y) && Math.random() < 0.1) L.sound('click'); if (back.done && doneAt < 0) { doneAt = L.now(); L.sound('shimmer'); L.haptic('success'); L.react('nod'); } }
      lastP = p;
    },
    up() {},
    assist() { if (stage === 0) { out.advance(0.34); if (out.done) { stage = 1; L.setPrompt('Pause here a moment…'); } } else if (stage === 1) still = Math.min(1, still + 0.5); else { back.advance(0.34); if (back.done && doneAt < 0) { doneAt = L.now(); L.sound('shimmer'); } } },
    hint() { if (stage === 0) return swipe(out.pointAt(out.progress), out.pointAt(Math.min(1, out.progress + 0.3))); if (stage === 1) return tapAt(marker); return swipe(back.pointAt(back.progress), back.pointAt(Math.min(1, back.progress + 0.3))); },
    frame(g, t, dt) {
      if (stage === 1) { still = Math.min(1, still + dt / 0.9); if (still >= 1) { stage = 2; L.sound('pluck', { note: 4 }); L.haptic('light'); L.setPrompt('Now reverse, once, back to the start.'); } }
      g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
      out.draw(g, { colour: L.pal.glow, width: 7, guide: stage === 0 ? 1 : 0, t });
      if (stage >= 1) back.draw(g, { colour: '#ffe2b0', width: 6, guide: stage === 2 ? 1 : 0.3, t });
      waitRing(g, marker.x, marker.y, 15, stage >= 1 ? still : 0, '#ffe2b0', 0.95);
      orb(g, cx, cy - r, 6, L.pal.glow);
      drawWords(g, token(L), cx, cy, { style: 'light', size: 14 * s + 2, maxWidth: r * 1.4, lines: 2, glowColour: L.pal.glow });
    },
    payoff(g, k) { halo(g, cx, cy, r * 0.9, L.now(), L.pal.glow, { rings: 2, alpha: 0.35 * k }); },
  });
}

function lightenHold(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const R = Math.min(w, h) * 0.3, orbR = 30 * s + 8;
  let holdId = null, held = 0, ease01 = 0, lastPos = null, lastT = 0, doneAt = -1;
  return phase(L, {
    name: 'Lighten the Hold', howTo: 'Press and hold the glow, then slide off slowly to the outer ring.',
    progress: () => held * 0.35 + ease01 * 0.65,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.6,
    down(p) { if (doneAt < 0 && dist(p.x, p.y, cx, cy) < (held >= 1 ? R : orbR * 1.6)) { holdId = p.id; lastPos = p; lastT = L.now(); } },
    move(p) {
      if (p.id !== holdId || held < 1) return;
      const d = dist(p.x, p.y, cx, cy), now = L.now(), v = lastPos ? dist(p.x, p.y, lastPos.x, lastPos.y) / Math.max(0.016, now - lastT) : 0;
      lastPos = p; lastT = now;
      const target = clamp((d - orbR) / (R - orbR));
      const rate = v > 700 ? 0.35 : 1; // a hurried slide lightens more slowly
      if (target > ease01) ease01 = Math.min(target, ease01 + (target - ease01) * rate);
    },
    up(p) { if (p.id === holdId) { holdId = null; if (ease01 >= 0.97 && doneAt < 0) finish(); } },
    assist() { if (held < 1) held = Math.min(1, held + 0.5); else { ease01 = Math.min(1, ease01 + 0.34); if (ease01 >= 0.97 && doneAt < 0) finish(); } },
    hint() { return held < 1 ? tapAt({ x: cx, y: cy }) : swipe({ x: cx + orbR, y: cy }, { x: cx + R, y: cy }); },
    frame(g, t, dt) {
      if (holdId != null && held < 1) { held = Math.min(1, held + dt / 1.1); if (held >= 1) { L.sound('thrum', { intensity: 0.4 }); L.haptic('soft'); L.setPrompt('Now slide off slowly, out to the ring.'); } }
      g.strokeStyle = rgba(L.pal.glow, 0.25 + 0.4 * ease01); g.lineWidth = 2; g.setLineDash([4, 8]); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.setLineDash([]);
      const squash = lerp(0.55, 1, ease.outCubic(ease01));
      glow(g, cx, cy, orbR * 3, L.pal.glow, 0.5 + 0.3 * (1 - ease01));
      g.save(); g.translate(cx, cy); g.scale(1 / squash, squash); orb(g, 0, 0, orbR, mix('#ffffff', L.pal.glow, 0.5)); g.restore();
      if (held < 1) waitRing(g, cx, cy, orbR + 10, held, '#ffffff', 0.9);
      if (holdId != null && lastPos && held >= 1) { g.strokeStyle = rgba('#ffffff', 0.35); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(lastPos.x, lastPos.y); g.stroke(); }
      drawWords(g, token(L), cx, cy + R + 22 * s, { style: 'plate', size: 13 * s + 2, maxWidth: w * 0.8, lines: 1, alpha: 0.95 });
    },
    payoff(g, k) { glow(g, cx, cy, R * k, '#ffffff', 0.3 * k); },
  });
  function finish() { doneAt = L.now(); L.sound('settle'); L.haptic('success'); L.react('release'); }
}

function twoPart(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const words = String(token(L)).split(' ');
  const half = Math.ceil(words.length / 2);
  const labels = [words.slice(0, half).join(' '), words.slice(half).join(' ') || '…'];
  const r = 26 * s + 6;
  const pads = [{ x: cx - w * 0.3, y: cy + h * 0.3 }, { x: cx + w * 0.3, y: cy + h * 0.3 }];
  const pieces = [0, 1].map((i) => ({ home: { x: cx + (i ? 1 : -1) * r * 1.05, y: cy - h * 0.12 }, pos: new Spring2(cx + (i ? 1 : -1) * r * 1.05, cy - h * 0.12, { stiffness: 140, damping: 16 }), landed: false, drag: null }));
  let doneAt = -1;
  return phase(L, {
    name: 'Two-Part Landing', howTo: 'Guide each piece onto its own soft landing pad.',
    progress: () => pieces.filter((p) => p.landed).length / 2,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.6,
    down(p) { for (const pc of pieces) if (!pc.landed && hit(p, pc.pos.x, pc.pos.y, r + 22)) { pc.drag = p.id; break; } },
    move(p) { for (const [i, pc] of pieces.entries()) if (pc.drag === p.id) { pc.pos.to(p.x, p.y); if (dist(p.x, p.y, pads[i].x, pads[i].y) < r * 1.6) land(i); } },
    up(p) { for (const pc of pieces) if (pc.drag === p.id) { pc.drag = null; if (!pc.landed) pc.pos.to(pc.home.x, pc.home.y); } },
    assist() { const i = pieces.findIndex((pc) => !pc.landed); if (i >= 0) land(i); },
    hint() { const i = pieces.findIndex((pc) => !pc.landed); return i < 0 ? null : swipe({ x: pieces[i].pos.x, y: pieces[i].pos.y }, pads[i]); },
    frame(g, t, dt) {
      for (const pc of pieces) pc.pos.update(dt);
      for (const [i, pd] of pads.entries()) {
        const on = pieces[i].landed;
        g.save(); g.translate(pd.x, pd.y); g.scale(1, 0.38);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 2); gr.addColorStop(0, rgba(on ? '#ffe9c0' : L.pal.glow, on ? 0.6 : 0.3)); gr.addColorStop(1, rgba(L.pal.glow, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 2, 0, TAU); g.fill(); g.restore();
      }
      const [a, b] = pieces;
      if (!(a.landed && b.landed)) {
        const sl = dist(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
        g.strokeStyle = rgba('#ffffff', clamp(0.6 - sl / 900)); g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(a.pos.x, a.pos.y); g.quadraticCurveTo((a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2 + 30 + sl * 0.1, b.pos.x, b.pos.y); g.stroke();
      }
      pieces.forEach((pc, i) => {
        g.save(); g.translate(pc.pos.x, pc.pos.y);
        glow(g, 0, 0, r * 2, i ? L.pal.accent : L.pal.glow, 0.45);
        g.beginPath(); g.arc(0, 0, r, i ? -Math.PI / 2 : Math.PI / 2, i ? Math.PI / 2 : Math.PI * 1.5); g.closePath();
        const gr = g.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, i ? L.pal.accent : L.pal.glow);
        g.fillStyle = gr; g.fill(); g.restore();
        drawWords(g, labels[i], pc.pos.x + (i ? 1 : -1) * r * 0.3, pc.pos.y + r + 14 * s, { style: 'light', size: 12 * s + 2, maxWidth: w * 0.36, lines: 1 });
      });
    },
    payoff(g, k) { for (const pd of pads) glow(g, pd.x, pd.y, 50 * k, '#fff0d6', 0.5 * k); },
  });
  function land(i) {
    const pc = pieces[i]; if (pc.landed) return;
    pc.landed = true; pc.drag = null; pc.pos.to(pads[i].x, pads[i].y - 6);
    L.sound('drop-in', { intensity: 0.4, pitch: i ? 1.2 : 1 }); L.haptic('light');
    L.ripples.add(pads[i].x, pads[i].y, { colour: '#ffe9c0' });
    if (pieces.every((q) => q.landed) && doneAt < 0) { doneAt = L.now(); L.sound('settle'); L.haptic('success'); L.react('nod'); }
  }
}

function leftRight(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const P = [{ x: cx - w * 0.34, y: cy + h * 0.06 }, { x: cx + w * 0.34, y: cy + h * 0.06 }, { x: cx, y: cy - h * 0.14 }];
  let stage = 0, drag = false, doneAt = -1;
  const trail = [];
  const r = 26 * s + 8;
  return phase(L, {
    name: 'Left Then Right', howTo: 'Touch the left light, cross to the right one, then return to the centre.',
    progress: () => stage / 3,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.6,
    down(p) { if (stage === 0 && hit(p, P[0].x, P[0].y, r * 1.6)) step(); drag = stage > 0; if (drag) trail.push([p.x, p.y]); },
    move(p) { if (!drag || doneAt >= 0) return; trail.push([p.x, p.y]); if (trail.length > 300) trail.shift(); if (stage < 3 && hit(p, P[stage].x, P[stage].y, r * 1.4)) step(); },
    up() { drag = false; },
    assist() { if (stage < 3) step(); },
    hint() { if (stage === 0) return tapAt(P[0]); const a = P[stage - 1], b = P[Math.min(2, stage)]; return swipe(a, b); },
    frame(g, t) {
      if (trail.length > 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(L.pal.glow, 0.35); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); trail.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore(); }
      P.forEach((q, i) => {
        const lit = i < stage, next = i === stage;
        glow(g, q.x, q.y, r * (lit ? 2.2 : 1.5), lit ? '#ffe9c0' : L.pal.glow, lit ? 0.8 : next ? 0.5 + 0.25 * Math.sin(t * 4) : 0.25);
        orb(g, q.x, q.y, r * 0.42, lit ? '#fff4dc' : mix(L.pal.glow, '#ffffff', 0.3), { alpha: lit || next ? 1 : 0.55 });
      });
      drawWords(g, token(L), cx, cy + h * 0.3, { style: 'plate', size: 13 * s + 2, maxWidth: w * 0.8, lines: 1 });
    },
    payoff(g, k) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#fff0d6', 0.7 * k); g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(P[0].x, P[0].y); g.quadraticCurveTo(P[2].x, P[2].y - 40, P[1].x, P[1].y); g.stroke();
      g.beginPath(); g.moveTo(P[2].x, P[2].y); g.lineTo(P[2].x, P[0].y + 4); g.stroke(); g.restore();
    },
  });
  function step() {
    stage++; L.sound('pluck', { note: stage * 2, intensity: 0.45 }); L.haptic('light');
    if (stage === 1) L.setPrompt('Now cross gently to the right light.');
    if (stage === 2) L.setPrompt('And back to the centre.');
    if (stage === 3 && doneAt < 0) { doneAt = L.now(); L.sound('shimmer'); L.haptic('success'); L.react('nod'); }
  }
}

function edgeCentre(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const R = Math.min(w, h) * 0.42;
  const pts = []; for (let i = 0; i <= 120; i++) { const k = i / 120, a = -Math.PI / 2 + k * TAU * 0.9, r = R * (1 - k * 0.92); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  const tr = new CurveTrace(pts, { tol: 44 * s + 8 });
  const clutter = Array.from({ length: 36 }, (_, i) => ({ a: (i / 36) * TAU, r: R * (0.92 + Math.random() * 0.18), c: [L.pal.glow, L.pal.accent, '#ffd98a'][i % 3] }));
  let drag = false, doneAt = -1;
  return phase(L, {
    name: 'Edge to Centre', howTo: 'From the outer rim, guide the glow inward along the channel.',
    progress: () => tr.progress,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.6,
    down(p) { drag = hit(p, tr.head.x, tr.head.y, 50 * s + 10); },
    move(p) { if (drag && tr.feed(p.x, p.y)) { if (Math.random() < 0.1) L.sound('click'); if (tr.done && doneAt < 0) finish(); } },
    up() { drag = false; },
    assist() { tr.advance(0.2); if (tr.done && doneAt < 0) finish(); },
    hint() { return swipe(tr.pointAt(tr.progress), tr.pointAt(Math.min(1, tr.progress + 0.2))); },
    frame(g, t) {
      const k = tr.progress;
      for (const c of clutter) { const r = lerp(c.r, 8 + c.r * 0.05, ease.inOutSine(k)), a = c.a + t * (0.3 + (1 - k) * 0.6); glow(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 7, c.c, 0.55); }
      tr.draw(g, { colour: L.pal.glow, width: 6, t });
      const hd = tr.head; tokenOrb(L, g, hd.x, hd.y, 12 * s + 4, { label: false });
      drawWords(g, token(L), cx, cy + R + 4, { style: 'plate', size: 13 * s + 2, maxWidth: w * 0.8, lines: 1 });
    },
    payoff(g, k) { orb(g, cx, cy, 16 * s * k + 0.1, '#fff2c8', { alpha: k }); glow(g, cx, cy, 60 * k, '#fff2c8', 0.5 * k); },
  });
  function finish() { doneAt = L.now(); L.sound('settle'); L.haptic('success'); L.react('nod'); }
}

function centreHorizon(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const R = Math.min(w, h) * 0.42;
  const pos = new Spring2(cx, cy, { stiffness: 160, damping: 18 });
  let drag = false, reach = 0, doneAt = -1;
  return phase(L, {
    name: 'Centre to Horizon', howTo: 'From the middle, guide the glow outward until the edge appears.',
    progress: () => reach,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.6,
    down(p) { drag = hit(p, pos.x, pos.y, 54 * s + 10); },
    move(p) {
      if (!drag || doneAt >= 0) return;
      const d = dist(p.x, p.y, cx, cy), a = Math.atan2(p.y - cy, p.x - cx), dd = Math.min(d, R);
      pos.to(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd);
      const was = reach; reach = Math.max(reach, clamp(dd / R));
      if (Math.floor(reach * 6) > Math.floor(was * 6)) L.sound('pluck', { note: Math.floor(reach * 6), intensity: 0.35 });
      if (reach >= 0.98 && doneAt < 0) finish();
    },
    up() { drag = false; },
    assist() { reach = Math.min(1, reach + 0.25); pos.to(cx + R * reach, cy); if (reach >= 0.98 && doneAt < 0) finish(); },
    hint() { return swipe({ x: pos.x, y: pos.y }, { x: cx + R, y: cy }); },
    frame(g, t, dt) {
      pos.update(dt);
      const k = ease.outCubic(reach);
      g.strokeStyle = rgba('#ffffff', 0.08 + 0.5 * k); g.lineWidth = 1.5 + 2 * k; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
      glow(g, cx, cy, R * 0.6, mix('#ff6a3a', L.pal.glow, k), 0.25 * (1 - k * 0.6));
      tokenOrb(L, g, pos.x, pos.y, 13 * s + 4, { label: false });
      drawWords(g, token(L), cx, cy - R - 16 * s, { style: 'plate', size: 13 * s + 2, maxWidth: w * 0.8, lines: 1 });
    },
    payoff(g, k) { halo(g, cx, cy, R * 1.05, L.now(), '#ffe6d6', { rings: 3, alpha: 0.35 * k, speed: 0.12 }); },
  });
  function finish() { doneAt = L.now(); L.sound('settle'); L.haptic('success'); L.react('nod'); }
}

function comfortBand(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const top = cy - h * 0.34, bot = cy + h * 0.3, x = cx + w * 0.22;
  const bandA = 0.38, bandB = 0.72; // in 0 (top) .. 1 (bottom)
  let v = 0.04, drag = false, beat = 0, doneAt = -1;
  return phase(L, {
    name: 'Comfort Band', howTo: 'Slide the marker into the wide middle band and rest it there for a beat.',
    progress: () => (v >= bandA && v <= bandB ? 0.5 : clamp(v / bandA) * 0.5) + beat * 0.5,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.5,
    down(p) { drag = Math.abs(p.x - x) < 60 * s + 10 && p.y > top - 30 && p.y < bot + 30; if (drag) this.move(p); },
    move(p) { if (!drag || doneAt >= 0) return; const nv = clamp((p.y - top) / (bot - top)); if (Math.floor(nv * 10) !== Math.floor(v * 10)) L.sound('click', { pitch: 1.2 - nv * 0.4 }); v = nv; },
    up() { drag = false; },
    assist() { if (v < bandA || v > bandB) v = clamp(v + (v < bandA ? 0.18 : -0.18)); else beat = Math.min(1, beat + 0.5); },
    hint() { return v < bandA || v > bandB ? swipe({ x, y: lerp(top, bot, v) }, { x, y: lerp(top, bot, (bandA + bandB) / 2) }) : null; },
    frame(g, t, dt) {
      const inBand = v >= bandA && v <= bandB;
      if (inBand && doneAt < 0) { beat = Math.min(1, beat + dt / 1.6); if (beat >= 1) { doneAt = L.now(); L.sound('settle'); L.haptic('success'); L.react('nod'); } }
      const ya = lerp(top, bot, bandA), yb = lerp(top, bot, bandB);
      g.fillStyle = rgba(L.pal.glow, inBand ? 0.22 : 0.12); roundRect(g, x - 26 * s, ya, 52 * s, yb - ya, 20 * s); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();
      const my = lerp(top, bot, v), pulse = inBand ? 0 : 0.5 + 0.5 * Math.sin(t * 6);
      glow(g, x, my, 30, inBand ? '#ffe6b0' : '#ff7a5a', 0.6 + 0.3 * pulse);
      orb(g, x, my, 12 * s + 3, inBand ? '#fff2d0' : '#ffb39a');
      if (inBand) waitRing(g, x, my, 22 * s + 6, beat, '#ffe6b0');
      drawWords(g, token(L), cx - w * 0.14, cy, { style: 'light', size: 14 * s + 2, maxWidth: w * 0.5, lines: 3, alpha: lerp(1, 0.75, beat), glowColour: L.pal.glow });
    },
    payoff(g, k) { glow(g, x, lerp(top, bot, (bandA + bandB) / 2), 60 * k, '#ffe6b0', 0.4 * k); },
  });
}

function traceBack(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  // the route the finger actually took during the engine move (or the engine's own path)
  let route = (L.route || []).slice(-260);
  const span = route.length > 1 ? route.reduce((m, p, i) => (i ? m + dist(p[0], p[1], route[i - 1][0], route[i - 1][1]) : 0), 0) : 0;
  if (span < 160 * s) route = Array.from({ length: 40 }, (_, i) => { const q = L.engine.pointAt(i / 39); return [q.x, q.y]; });
  const tr = new CurveTrace(route.slice().reverse(), { tol: 46 * s + 8 });
  const start = { x: route[0][0], y: route[0][1] };
  let drag = false, doneAt = -1;
  return phase(L, {
    name: 'Trace Back', howTo: 'Follow your route back, from where you ended to where you began.',
    progress: () => tr.progress,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.6,
    down(p) { drag = true; this.move(p); },
    move(p) { if (drag && tr.feed(p.x, p.y)) { if (Math.random() < 0.1) L.sound('pluck', { note: Math.round((1 - tr.progress) * 7), intensity: 0.3 }); if (tr.done && doneAt < 0) finish(); } },
    up() { drag = false; },
    assist() { tr.advance(0.2); if (tr.done && doneAt < 0) finish(); },
    hint() { return swipe(tr.pointAt(tr.progress), tr.pointAt(Math.min(1, tr.progress + 0.2))); },
    frame(g, t) {
      tr.draw(g, { colour: '#c8f0ff', width: 6, t });
      glow(g, start.x, start.y, 30, '#ffe9c0', 0.5 + 0.2 * Math.sin(t * 3)); orb(g, start.x, start.y, 7, '#fff2d6');
      const hd = tr.head; glow(g, hd.x, hd.y, 22, '#ffffff', 0.7);
      drawWords(g, token(L), cx, S(L).y + 14 * s, { style: 'plate', size: 13 * s + 2, maxWidth: w * 0.8, lines: 1 });
      void cy; void h;
    },
    payoff(g, k) { glow(g, start.x, start.y, 60 * k, '#ffe9c0', 0.6 * k); },
  });
  function finish() { doneAt = L.now(); L.sound('settle'); L.haptic('success'); L.react('nod'); }
}

function volumeNoDelete(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const sx0 = cx - w * 0.34, sx1 = cx + w * 0.34, sy = cy + h * 0.28;
  let vol = 1, drag = false, quietReached = false, revealHeld = 0, revealing = -1, revealed = false, doneAt = -1, tapReveal = -1;
  return phase(L, {
    name: 'Volume Without Deletion', howTo: 'Slide the words quieter — then press them to bring them back for a moment.',
    progress: () => (quietReached ? 0.6 + 0.4 * (revealed ? 1 : revealHeld) : 0.6 * (1 - vol) / 0.72),
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.8,
    down(p) {
      if (quietReached && !revealed && Math.abs(p.y - cy) < 60 * s + 20) { revealing = p.id; return; }
      drag = Math.abs(p.y - sy) < 46 * s + 10; if (drag) this.move(p);
    },
    move(p) {
      if (!drag || quietReached) return;
      const nv = clamp(lerp(1, 0.28, invLerp(sx1, sx0, p.x)), 0.28, 1);
      if (Math.floor(nv * 8) !== Math.floor(vol * 8)) L.sound('click', { pitch: 0.7 + nv * 0.5 });
      vol = nv;
      if (vol <= 0.3) { quietReached = true; drag = false; L.sound('settle', { intensity: 0.4 }); L.haptic('light'); L.setPrompt('Now press the words to bring them back, briefly.'); }
    },
    up(p) { drag = false; if (p.id === revealing) { revealing = -1; if (revealHeld >= 1) done(); } },
    assist() { if (!quietReached) { vol = Math.max(0.28, vol - 0.24); if (vol <= 0.3) { quietReached = true; L.setPrompt('Now press the words to bring them back, briefly.'); } } else if (!revealed) { tapReveal = L.now(); } },
    hint() { return !quietReached ? swipe({ x: lerp(sx1, sx0, (1 - vol) / 0.72), y: sy }, { x: sx0, y: sy }) : tapAt({ x: cx, y: cy }); },
    frame(g, t, dt) {
      const showing = revealing >= 0 || (tapReveal >= 0 && L.now() - tapReveal < 1.2);
      if (showing && !revealed) { revealHeld = Math.min(1, revealHeld + dt / 0.7); if (revealHeld >= 1 && tapReveal >= 0 && revealing < 0) done(); }
      if (tapReveal >= 0 && L.now() - tapReveal >= 1.2 && revealHeld >= 1) done();
      const a = showing ? 1 : revealed ? 0.4 : vol;
      drawWords(g, token(L), cx, cy, { style: 'light', size: (14 + 14 * a) * s + 2, maxWidth: w * 0.86, lines: 2, alpha: lerp(0.35, 1, a), glowColour: L.pal.glow });
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx0, sy); g.lineTo(sx1, sy); g.stroke();
      const kx = lerp(sx1, sx0, (1 - vol) / 0.72);
      g.strokeStyle = rgba(L.pal.glow, 0.8); g.beginPath(); g.moveTo(sx0, sy); g.lineTo(kx, sy); g.stroke();
      orb(g, kx, sy, 11 * s + 3, mix(L.pal.glow, '#ffffff', 0.4));
      for (let i = 0; i < 3; i++) { const rr = (10 + i * 7) * vol * s; g.strokeStyle = rgba('#ffffff', 0.3 * vol); g.lineWidth = 1.5; g.beginPath(); g.arc(sx1 + 26 * s, sy, rr + 2, -0.8, 0.8); g.stroke(); }
      if (quietReached && !revealed) waitRing(g, cx, cy + 34 * s, 10, revealHeld, '#ffffff', 0.8);
    },
    payoff(g, k) { glow(g, cx, cy, 80 * k, L.pal.glow, 0.2 * k); },
  });
  function done() { if (revealed) return; revealed = true; doneAt = L.now(); L.sound('glass', { note: 3 }); L.haptic('success'); L.react('nod'); }
}

function chooseExit(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const doors = [{ x: cx - w * 0.27, y: cy + h * 0.12, label: 'Rest here', col: '#9fb8ff' }, { x: cx + w * 0.27, y: cy + h * 0.12, label: 'Carry on gently', col: '#ffd59a' }];
  const dw = Math.min(w * 0.3, 104 * s), dh = dw * 1.4;
  const home = { x: cx, y: cy - h * 0.28 };
  const pos = new Spring2(home.x, home.y, { stiffness: 150, damping: 17 });
  let drag = false, chosen = -1, at = -1;
  return phase(L, {
    name: 'Choose Your Exit', howTo: 'Bring the glow to either door — both are good endings.',
    progress: () => (chosen >= 0 ? 1 : 0),
    isDone: () => at >= 0 && L.now() - at > 1.1,
    down(p) {
      if (chosen >= 0) return;
      drag = hit(p, pos.x, pos.y, 50 * s + 12);
      if (!drag) doors.forEach((d, i) => { if (Math.abs(p.x - d.x) < dw / 2 && Math.abs(p.y - d.y) < dh / 2) choose(i); });
    },
    move(p) { if (!drag || chosen >= 0) return; pos.to(p.x, p.y); doors.forEach((d, i) => { if (Math.abs(p.x - d.x) < dw * 0.4 && Math.abs(p.y - d.y) < dh * 0.4) choose(i); }); },
    up() { drag = false; if (chosen < 0) pos.to(home.x, home.y); },
    assist() { if (chosen < 0) choose(L.rand() < 0.5 ? 0 : 1); },
    hint() { return swipe(home, doors[0]); },
    frame(g, t, dt) {
      pos.update(dt);
      doors.forEach((d, i) => {
        const open = chosen === i ? ease.outCubic(clamp((L.now() - at) / 1)) : 0;
        g.save(); g.translate(d.x, d.y);
        g.beginPath(); g.moveTo(-dw / 2, dh / 2); g.lineTo(-dw / 2, -dh / 2 + dw / 2); g.arc(0, -dh / 2 + dw / 2, dw / 2, Math.PI, 0); g.lineTo(dw / 2, dh / 2); g.closePath();
        const gr = g.createLinearGradient(0, -dh / 2, 0, dh / 2); gr.addColorStop(0, rgba(d.col, 0.25 + open * 0.5)); gr.addColorStop(1, rgba(d.col, 0.06 + open * 0.3));
        g.fillStyle = gr; g.fill(); g.strokeStyle = rgba(d.col, 0.6); g.lineWidth = 2; g.stroke();
        if (open > 0) { g.clip(); if (i === 0) { orb(g, 0, -dh * 0.15, 10 * s, '#f4f4ff', { alpha: open }); motes(g, -dw / 2, -dh / 2, dw, dh, t, '#dfe6ff', { n: 14, alpha: 0.6 * open }); } else { glow(g, 0, dh * 0.3, dw * 0.8, '#ffcf8a', 0.6 * open); g.strokeStyle = rgba('#fff2d6', 0.7 * open); g.lineWidth = 3; g.beginPath(); g.moveTo(0, dh / 2); g.quadraticCurveTo(10, 0, 0, -dh * 0.3); g.stroke(); } }
        g.restore();
        drawWords(g, d.label, d.x, d.y + dh / 2 + 16 * s, { style: 'light', size: 12 * s + 2, maxWidth: dw * 1.4, lines: 1, alpha: 0.9 });
      });
      if (chosen < 0 || L.now() - at < 0.6) tokenOrb(L, g, pos.x, pos.y, 14 * s + 4, { alpha: chosen < 0 ? 1 : 1 - (L.now() - at) / 0.6 });
    },
    payoff(g, k) { if (chosen >= 0) glow(g, doors[chosen].x, doors[chosen].y, dw * k, doors[chosen].col, 0.5 * k); },
  });
  function choose(i) { if (chosen >= 0) return; chosen = i; at = L.now(); drag = false; pos.to(doors[i].x, doors[i].y); L.sound('unlock', { intensity: 0.5 }); L.haptic('success'); L.react('nod'); }
}

function slowLight(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const R = Math.min(w, h) * 0.26;
  const pads = [0, 1, 2].map((i) => ({ x: cx + Math.cos(-Math.PI / 2 + i * TAU / 3) * R, y: cy + 10 * s + Math.sin(-Math.PI / 2 + i * TAU / 3) * R, period: 4 + i * 1.3, on: -1 }));
  const order = [];
  let doneAt = -1;
  const r = 28 * s + 8;
  return phase(L, {
    name: 'Slow-Light Rhythm', howTo: 'Touch the three slow lights, in any order you like.',
    progress: () => order.length / 3,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 1,
    down(p) { pads.forEach((pd, i) => { if (pd.on < 0 && hit(p, pd.x, pd.y, r * 1.3)) light(i); }); },
    move() {}, up() {},
    assist() { const i = pads.findIndex((pd) => pd.on < 0); if (i >= 0) light(i); },
    hint() { const pd = pads.find((q) => q.on < 0); return pd ? tapAt(pd) : null; },
    frame(g, t) {
      pads.forEach((pd, i) => {
        const breath = 0.5 + 0.5 * Math.sin((t / pd.period) * TAU + i * 2);
        const lit = pd.on >= 0;
        const seq = doneAt >= 0 ? 0.6 + 0.4 * Math.sin(t * 1.4 - order.indexOf(i) * 1.2) : 1;
        glow(g, pd.x, pd.y, r * (1.6 + breath * 0.5), lit ? '#ffe9b8' : L.pal.glow, (lit ? 0.75 : 0.25 + breath * 0.35) * seq);
        orb(g, pd.x, pd.y, r * 0.5, lit ? '#fff4da' : mix(L.pal.glow, '#ffffff', 0.25 + breath * 0.3), { alpha: lit ? 1 : 0.7 });
      });
      for (let k = 1; k < order.length; k++) { const a = pads[order[k - 1]], b = pads[order[k]]; g.strokeStyle = rgba('#ffe9b8', 0.4); g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      drawWords(g, token(L), cx, cy + R + 40 * s, { style: 'plate', size: 13 * s + 2, maxWidth: w * 0.8, lines: 1 });
    },
    payoff(g, k) { glow(g, cx, cy, R * 1.4 * k, '#ffe9b8', 0.25 * k); },
  });
  function light(i) {
    pads[i].on = L.now(); order.push(i);
    L.sound('glass', { note: order.length * 2 }); L.haptic('light');
    if (order.length === 3 && doneAt < 0) { doneAt = L.now(); L.haptic('success'); L.react('nod'); }
  }
}

function anchorExplore(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const anchor = { x: cx - w * 0.3, y: cy + h * 0.05 };
  const way = [{ x: cx - w * 0.02, y: cy - h * 0.18 }, { x: cx + w * 0.22, y: cy + h * 0.02 }, { x: cx + w * 0.32, y: cy - h * 0.22 }];
  let anchorId = null, locked = false, reached = 0, trail = [], doneAt = -1, explorer = null;
  const held = () => anchorId != null || locked;
  return phase(L, {
    name: 'Anchor and Explore', howTo: 'Hold the anchor with one finger while another traces to the three lights (or tap the anchor once to set it).',
    progress: () => (held() ? 0.25 : 0) + reached * 0.25,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.6,
    down(p) {
      if (hit(p, anchor.x, anchor.y, 46 * s + 12)) { if (anchorId == null) { anchorId = p.id; L.sound('thrum', { intensity: 0.3 }); L.haptic('soft'); } return; }
      if (held()) { explorer = p.id; trail.push([p.x, p.y]); }
    },
    move(p) {
      if (p.id !== explorer || !held() || doneAt >= 0) return;
      trail.push([p.x, p.y]); if (trail.length > 400) trail.shift();
      if (reached < 3 && hit(p, way[reached].x, way[reached].y, 34 * s + 8)) reach();
    },
    up(p) {
      if (p.id === anchorId) { anchorId = null; if (!locked && trail.length < 2) { locked = true; L.setPrompt('Anchor set. Now trace out to the three lights.'); } }
      if (p.id === explorer) explorer = null;
    },
    assist() { if (!held()) { locked = true; L.setPrompt('Anchor set. Now trace out to the three lights.'); } else if (reached < 3) { trail.push([way[reached].x, way[reached].y]); reach(); } },
    hint() { if (!held()) return tapAt(anchor); const a = reached ? way[reached - 1] : anchor; return reached < 3 ? swipe(a, way[reached]) : null; },
    frame(g, t) {
      if (trail.length > 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#bfefff', 0.45); g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); trail.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore(); }
      const hk = held() ? 1 : 0.5 + 0.3 * Math.sin(t * 4);
      glow(g, anchor.x, anchor.y, 40, '#ffe2a8', 0.55 * hk);
      g.fillStyle = mix('#5a4a7a', '#ffe2a8', held() ? 0.5 : 0.2); g.beginPath(); g.ellipse(anchor.x, anchor.y, 20 * s + 4, 15 * s + 3, 0, 0, TAU); g.fill();
      way.forEach((q, i) => { const lit = i < reached; glow(g, q.x, q.y, lit ? 26 : 16, lit ? '#bfefff' : L.pal.glow, lit ? 0.8 : 0.4); orb(g, q.x, q.y, lit ? 6 : 4, lit ? '#effaff' : L.pal.glow); });
      drawWords(g, token(L), cx, cy + h * 0.32, { style: 'plate', size: 13 * s + 2, maxWidth: w * 0.8, lines: 1 });
    },
    payoff(g, k) { for (let i = 0; i < 3; i++) { const q = way[i]; g.strokeStyle = rgba('#bfefff', 0.5 * k); g.lineWidth = 1.5; g.beginPath(); g.arc(q.x, q.y, 18 * k, 0, TAU); g.stroke(); } },
  });
  function reach() { reached++; L.sound('pluck', { note: reached * 2 + 1, intensity: 0.45 }); L.haptic('light'); if (reached === 3 && doneAt < 0) { doneAt = L.now(); L.sound('shimmer'); L.haptic('success'); L.react('nod'); } }
}

function staggered(L) {
  const { cx, cy, w, h } = S(L), s = unit(L);
  const words = String(token(L)).split(' ');
  const parts = [0, 1, 2].map((i) => words.slice(Math.floor(i * words.length / 3), Math.floor((i + 1) * words.length / 3)).join(' ') || '·');
  const usePhotos = L.photos.n > 0;
  const slots = [0, 1, 2].map((i) => ({ x: cx + (i - 1) * w * 0.28, y: cy - h * 0.12 }));
  const items = [0, 1, 2].map((i) => { const hx = cx + (i - 1) * w * 0.26, hy = cy + h * 0.28; return { home: { x: hx, y: hy }, pos: new Spring2(hx, hy, { stiffness: 150, damping: 17 }), placed: false, drag: null, photo: usePhotos ? i % L.photos.n : -1 }; });
  const size = 46 * s + 10;
  let placed = 0, doneAt = -1;
  return phase(L, {
    name: 'Staggered Release', howTo: 'Place the three pieces one at a time into their marked spaces.',
    progress: () => placed / 3,
    isDone: () => doneAt >= 0 && L.now() - doneAt > 0.8,
    down(p) { for (const it of items) if (!it.placed && hit(p, it.pos.x, it.pos.y, size * 0.7 + 10)) { it.drag = p.id; break; } },
    move(p) { for (const it of items) if (it.drag === p.id) { it.pos.to(p.x, p.y); const si = slots.findIndex((sl, k) => !sl.taken && dist(p.x, p.y, sl.x, sl.y) < size * 0.6 && k >= 0); if (si >= 0) place(it, si); } },
    up(p) { for (const it of items) if (it.drag === p.id) { it.drag = null; if (!it.placed) it.pos.to(it.home.x, it.home.y); } },
    assist() { const it = items.find((q) => !q.placed), si = slots.findIndex((sl) => !sl.taken); if (it && si >= 0) place(it, si); },
    hint() { const it = items.find((q) => !q.placed), sl = slots.find((q) => !q.taken); return it && sl ? swipe({ x: it.pos.x, y: it.pos.y }, sl) : null; },
    frame(g, t, dt) {
      for (const sl of slots) { glow(g, sl.x, sl.y, size * 0.9, sl.taken ? '#ffe2a0' : L.pal.glow, sl.taken ? 0.6 : 0.25 + 0.1 * Math.sin(t * 2)); g.strokeStyle = rgba('#ffffff', sl.taken ? 0.1 : 0.35); g.setLineDash([3, 6]); g.lineWidth = 1.5; g.beginPath(); g.arc(sl.x, sl.y, size * 0.55, 0, TAU); g.stroke(); g.setLineDash([]); }
      items.forEach((it, i) => {
        it.pos.update(dt);
        if (it.photo >= 0) L.photos.draw(g, it.photo, it.pos.x, it.pos.y, size, { shape: 'circle', glow: it.placed ? 0.6 : 0.2, glowColour: '#ffe2a0', toneMix: it.placed ? 0.5 : 0, tone: 'gold' });
        else { glow(g, it.pos.x, it.pos.y, size * 0.7, it.placed ? '#ffe2a0' : L.pal.glow, 0.5); orb(g, it.pos.x, it.pos.y, size * 0.3, it.placed ? '#fff0c8' : mix(L.pal.glow, '#ffffff', 0.3)); }
        drawWords(g, parts[i], it.pos.x, it.pos.y + size * 0.55 + 12 * s, { style: 'light', size: 12 * s + 1, maxWidth: w * 0.3, lines: 1, alpha: 0.9 });
      });
    },
    payoff(g, k) { for (const sl of slots) glow(g, sl.x, sl.y, size * k, '#ffe2a0', 0.45 * k); },
  });
  function place(it, si) {
    if (it.placed) return;
    it.placed = true; it.drag = null; slots[si].taken = true; it.pos.to(slots[si].x, slots[si].y); placed++;
    L.sound('drop-in', { intensity: 0.35, pitch: 0.9 + placed * 0.12 }); L.haptic('light');
    L.realmMood?.(placed / 3);
    if (it.photo >= 0) L.checkpoint?.('photo', it.photo);
    if (placed === 3 && doneAt < 0) { doneAt = L.now(); L.sound('settle'); L.haptic('success'); L.react('nod'); }
  }
}

const LAWS = {
  1: halfSpeed, 2: pauseBetween, 3: mirrorTouch, 4: sCurve, 5: threeBeats, 6: easeLastInch, 7: oneDirection, 8: lightenHold,
  9: twoPart, 10: waitWake, 11: leftRight, 12: edgeCentre, 13: centreHorizon, 14: comfortBand, 15: traceBack,
  16: volumeNoDelete, 17: chooseExit, 18: slowLight, 19: anchorExplore, 20: staggered,
};
