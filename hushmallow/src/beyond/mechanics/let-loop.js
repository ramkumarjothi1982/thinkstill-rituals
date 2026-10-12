// Rumination: let a looping thought keep moving without re-engaging it.
//
// The thought rides a glowing figure-of-eight, round and round, trailing
// light. Below it rests a smooth stone. Rest a finger on the stone and keep
// it there: the loop widens, slows, drifts farther off and turns translucent,
// still moving (it is never stopped or caught). Touching the thought winds it
// back up a little. It lands after a calm stretch of resting. A tap on the
// stone (or the assist pill) rests for a breath at a time.

import { Blob, drawGlow, drawJelly, clamp, lerp, approach, rgba, mix, Motes, blinkAt, circleRect, tintFor, TAU, Timers } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'let_loop_drift';
const TRAIL = 22;

export function mount(ctx) {
  const L = MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(30);
  const [light, deep] = tintFor(ctx.emotion);
  const A0 = ctx.area();
  const SHORT = A0.h < 270;               // a short phone: the stone and the words share the bottom row
  const R = clamp(Math.min(A0.w, A0.h) * 0.085, 18, 32);
  const NEED = () => (rm() ? 5 : 7);     // seconds of resting
  let rest = 0, wind = 0, phase = 'loop', s = 0, speed = 1, held = null, warned = false, moves = 0, landT = 0, breath = 0, tapBank = 0;
  const t0 = performance.now();
  const tx = new Float32Array(TRAIL), ty = new Float32Array(TRAIL);
  let ti = 0, trailInit = false;
  const thought = new Blob({ x: ctx.from?.x ?? A0.x + A0.w / 2, y: ctx.from?.y ?? A0.y + A0.h * 0.3, r: R, light, deep });
  const tags = {
    words: ctx.tags.add(ctx.parts.excerpt, { kind: 'words', max: SHORT ? Math.round(A0.w * 0.5) : 230 }),
    stone: ctx.tags.add(L.labels.stone, { kind: 'label', colour: '#bfe8ff' }),
  };

  const k = () => clamp(rest / NEED());
  function geo() {
    const A = ctx.area();
    const kk = k();
    // the loop drifts up and away as it eases; it widens and its thought gets smaller
    const cx = A.x + A.w / 2, cy = A.y + A.h * lerp(0.34, 0.26, kk);
    const ax = Math.min(A.w * lerp(0.3, 0.42, kk) * (1 - wind * 0.35), A.w / 2 - R * 1.4), ay = Math.min(A.h * lerp(0.2, 0.16, kk), A.h * 0.3);
    const st = { x: A.x + A.w * (SHORT ? 0.74 : 0.5), y: A.y + A.h - clamp(A.h * 0.16, 34, 56), rx: clamp(A.w * 0.17, 46, 70), ry: clamp(A.h * 0.07, 14, 22) };
    return { cx, cy, ax, ay, st };
  }
  // a lemniscate of Gerono (a soft figure of eight)
  const loopAt = (G, u) => ({ x: G.cx + G.ax * Math.sin(u), y: G.cy + G.ay * Math.sin(u) * Math.cos(u) * 1.6 });

  function land() {
    if (phase !== 'loop') return;
    phase = 'landed'; landT = 0;
    ctx.haptic('success'); ctx.fx('breathe-out', { intensity: 0.5 });
    ctx.progress(1);
    TM.after(() => resolve({ moves, ms: performance.now() - t0 }), rm() ? 200 : 900);
  }
  function step() {
    if (phase !== 'loop') return;
    tapBank += 1.4; moves++; breath = 1;
    ctx.haptic('light'); ctx.fx('breathe-in', { intensity: 0.3 });
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    const G = geo(), A_ = ctx.area();
    const resting = !!held && held.kind === 'stone';
    if (phase === 'loop') {
      const add = (resting ? dt : 0) + Math.min(tapBank, dt * 1.6);
      tapBank = Math.max(0, tapBank - dt * 1.6);
      rest = Math.min(NEED(), rest + add);
      ctx.progress(k() * 0.95);
      if (rest >= NEED()) land();
    }
    wind = approach(wind, 0, 0.6, dt);
    const kk = k();
    // it keeps going: slower as it eases, faster when grabbed
    speed = approach(speed, lerp(1.25, 0.42, kk) * (1 + wind * 1.4), 2, dt);
    s += dt * speed * (R_ ? 0.5 : 1);
    const p = loopAt(G, s);
    thought.hx = p.x; thought.hy = p.y;
    thought.step(dt, true);
    // the track, fading as it eases
    // the track: a soft glowing ribbon, fading as it eases (one path, stroked twice: halo, then core)
    g.beginPath();
    for (let i = 0; i <= 64; i++) { const q = loopAt(G, (i / 64) * TAU); if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }
    g.lineJoin = 'round';
    g.globalAlpha = lerp(0.3, 0.1, kk); g.strokeStyle = rgba(deep, 0.9); g.lineWidth = 9; g.stroke();
    g.globalAlpha = lerp(0.6, 0.2, kk); g.strokeStyle = rgba(light, 0.95); g.lineWidth = 1.8; g.stroke();
    g.globalAlpha = 1;
    // the trail (a ring buffer of past positions)
    if (!trailInit) { tx.fill(p.x); ty.fill(p.y); trailInit = true; }
    tx[ti] = p.x; ty[ti] = p.y; ti = (ti + 1) % TRAIL;
    if (!R_) for (let i = 0; i < TRAIL; i++) {
      const j = (ti + i) % TRAIL;
      const a = (i / TRAIL) ** 2 * lerp(0.5, 0.18, kk);
      drawGlow(g, tx[j], ty[j], R * (0.5 + 0.6 * i / TRAIL), deep, a);
    }
    const alpha = lerp(1, 0.55, kk);
    drawJelly(g, { x: thought.x, y: thought.y, r: R * lerp(1, 0.72, kk), sx: thought.sx, sy: thought.sy, light, deep, alpha, glow: 0.5,
      face: { tension: lerp(0.8, 0.2, kk) + wind * 0.4, calm: kk * 0.7, blink: blinkAt(t, 0.9), lookX: Math.cos(s) * 0.6, surprise: wind > 0.5 ? 0.5 : 0 } });
    // the rest stone: smooth, moonlit, breathing slowly while a finger rests on it
    breath = approach(breath, resting ? 1 : 0, 2.4, dt);
    const st = G.st;
    const swell = 1 + (R_ ? 0 : 0.04 * Math.sin(t * 1.3) * breath);
    drawGlow(g, st.x, st.y, st.rx * 1.6 * swell, '#9fd8ff', 0.25 + breath * 0.35);
    if (breath > 0.05 && !R_) {
      // a slow ring rising off the stone (one every ~3 s; soft, never a flash)
      const ph = (t % 3) / 3;
      g.globalAlpha = (1 - ph) * 0.35 * breath; g.strokeStyle = '#d6f1ff'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(st.x, st.y, st.rx * (1 + ph * 0.8), st.ry * (1 + ph * 0.8), 0, 0, TAU); g.stroke();
      g.globalAlpha = 1;
    }
    const sg = g.createRadialGradient(st.x - st.rx * 0.3, st.y - st.ry * 0.5, 2, st.x, st.y, st.rx);
    sg.addColorStop(0, mix('#f4fbff', '#ffffff', breath)); sg.addColorStop(0.55, '#a9c6e8'); sg.addColorStop(1, '#56709e');
    g.fillStyle = sg;
    g.beginPath(); g.ellipse(st.x, st.y, st.rx * swell, st.ry * swell, 0, 0, TAU); g.fill();
    // progress: a thin arc of light around the stone
    if (kk > 0.01) {
      g.globalAlpha = 0.9; g.strokeStyle = '#e8f7ff'; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.ellipse(st.x, st.y, st.rx + 7, st.ry + 6, 0, -Math.PI / 2, -Math.PI / 2 + TAU * kk); g.stroke();
      g.globalAlpha = 1;
    }
    motes.draw(g, dt);
    if (phase === 'landed') landT += dt;
    // the words stay put under the loop (a label riding the loop would only make it busier)
    tags.words.at(SHORT ? A_.x + A_.w * 0.28 : G.cx, G.cy + G.ay * 0.9 + R * 1.2, 'bottom', lerp(1, 0.55, kk));
    // the label sits on the stone itself (never on the words above it)
    tags.stone.at(st.x, st.y, 'center', phase === 'landed' ? 0.6 : 1);
    return true;
  }

  function pointer(e) {
    const G = geo();
    const onStone = (x, y) => ((x - G.st.x) / (G.st.rx * 1.35)) ** 2 + ((y - G.st.y) / (G.st.ry * 2.4)) ** 2 < 1;
    if (e.type === 'down') {
      if (thought.hit(e.x, e.y, 1.7)) {
        // grabbing the loop only winds it up again
        held = { id: e.id, kind: 'thought', t0: e.t };
        wind = Math.min(1, wind + 0.6);
        rest = Math.max(0, rest - 0.8);
        ctx.haptic('light');
        if (!warned) { warned = true; ctx.hint(L.hint2); }
        return true;
      }
      if (onStone(e.x, e.y)) { held = { id: e.id, kind: 'stone', t0: e.t, x0: e.x, y0: e.y }; ctx.haptic('soft'); return true; }
      return false;
    }
    if (!held || held.id !== e.id) return false;
    if (e.type === 'up' || e.type === 'cancel') {
      const h0 = held; held = null; moves++;
      if (h0.kind === 'stone' && e.t - h0.t0 < 350) step();
      return true;
    }
    return true;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => { const G = geo(); return thought.hit(x, y, 1.7) || ((x - G.st.x) / (G.st.rx * 1.35)) ** 2 + ((y - G.st.y) / (G.st.ry * 2.4)) ** 2 < 1; },
    assist: step,
    avoid: () => { const G = geo(); return [{ left: G.cx - G.ax - R * 1.4, right: G.cx + G.ax + R * 1.4, top: G.cy - G.ay * 1.2 - R * 1.4, bottom: G.cy + G.ay * 1.2 + R * 1.4 }, circleRect(G.st.x, G.st.y, G.st.rx + 8), ...ctx.tags.rects()]; },
    get settled() { return phase === 'landed'; },
    get resting() { return !!held && held.kind === 'stone'; },
    probe: () => { const G = geo(); return { stone: { x: G.st.x, y: G.st.y }, thought: { x: thought.x, y: thought.y }, rest, phase }; },
    destroy() { TM.clear(); ctx.tags.clear(); },
  };
}
