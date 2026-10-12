// Personalisation: move the imagined responsibility back to where it belongs.
//
// Five glowing weights sit piled on the thought and squash it flat. Four
// soft bowls of light wait around it: Other people, Circumstances, Timing,
// Your part. Drag each weight to where it belongs. "Your part" holds a fair
// share (two) and no more: accountability stays, the rest goes back. As the
// weights come off, the thought rises and breathes out. Tap a weight, or the
// assist pill, to send it to the next bowl.

import { Blob, drawGlow, drawJelly, clamp, lerp, approach, rgba, LIGHT, Motes, blinkAt, circleRect, tintFor, TAU, Timers } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'return_responsibility';
const N = 5;
const YOURS = 3;          // index of "Your part" in the places
const YOURS_CAP = 2;

export function mount(ctx) {
  const L = MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(36);
  const [light, deep] = tintFor(ctx.emotion);
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.12, 26, 42);
  const from = ctx.from || { x: A0.x + A0.w / 2, y: A0.y + A0.h * 0.7 };
  const thought = new Blob({ x: from.x, y: from.y, r: R, light, deep });
  const stones = Array.from({ length: N }, (_, i) => {
    const b = new Blob({ x: from.x, y: from.y - R, r: R * (0.36 - i * 0.012), light: LIGHT.calm[0], deep: '#e0943a' });
    b.place = -1; b.k = 34; b.d = 8; b.i = i;
    return b;
  });
  const places = L.labels.places.map((label, i) => ({ label, i, count: 0, glow: 0, tag: ctx.tags.add(label, { kind: 'label', colour: i === YOURS ? '#ffd98a' : ['#7fe7ff', '#b59cff', '#ff9ad5'][i] }) }));
  const words = ctx.tags.add(ctx.parts.excerpt, { kind: 'words' });
  let finished = false, warned = false, moves = 0, settleT = 0;
  const t0 = performance.now();

  function geometry() {
    const A = ctx.area();
    const tx = A.x + A.w / 2, ty = A.y + A.h - R * 1.2 - 56;
    // the four bowls on an arc above the thought
    const pr = clamp(Math.min(A.w * 0.13, A.h * 0.16), 30, 46);
    const ys = [A.y + A.h * 0.44, A.y + pr + 22, A.y + pr + 22, A.y + A.h * 0.44];
    const xs = [A.x + pr + 14, A.x + A.w * 0.34, A.x + A.w * 0.66, A.x + A.w - pr - 14];
    return { tx, ty, pr, pos: xs.map((x, i) => ({ x, y: ys[i] })) };
  }
  function homes() {
    const G = geometry();
    const on = stones.filter((s) => s.place < 0);
    const weight = on.length / N;
    thought.hx = G.tx; thought.hy = G.ty + R * 0.22 * weight;
    let stack = 0;
    for (const s of stones) {
      if (s.press) continue;
      if (s.place < 0) {
        // piled on the head, a little off-balance
        const sx = ((stack % 2) ? 1 : -1) * R * 0.18 * (stack > 0 ? 1 : 0);
        s.hx = G.tx + sx; s.hy = thought.hy - R * (0.78 + 0.26 * weight) - stack * s.r * 1.45;
        stack++;
      } else {
        const p = G.pos[s.place];
        const slot = stones.filter((x) => x.place === s.place).indexOf(s);
        s.hx = p.x + (slot - 0.5) * s.r * 1.6 * (slot > 0 || places[s.place].count > 1 ? 1 : 0);
        s.hy = p.y + G.pr * 0.08 - slot * 2;
      }
    }
  }
  homes();
  if (rm()) for (const b of [thought, ...stones]) { b.x = b.hx; b.y = b.hy; }

  const onCount = () => stones.filter((s) => s.place < 0).length;
  function placeStone(s, idx) {
    const pl = places[idx];
    if (idx === YOURS && pl.count >= YOURS_CAP) {
      if (!warned) { warned = true; ctx.hint('Your part’s already got its fair share.'); }
      s.place = -1; homes(); ctx.haptic('light');
      return false;
    }
    s.place = idx; pl.count++; pl.glow = 1;
    moves++;
    ctx.haptic('soft'); ctx.fx('drop-in', { intensity: 0.5 });
    homes();
    const G = geometry();
    motes.burst(G.pos[idx].x, G.pos[idx].y, idx === YOURS ? '#ffd98a' : '#c8b8ff', 6, { speed: 34, size: 2.2 });
    thought.sqV -= 2.4;   // a little bounce of relief
    ctx.progress(1 - onCount() / N);
    if (!onCount() && !finished) {
      finished = true;
      TM.after(() => { ctx.haptic('success'); resolve({ moves, ms: performance.now() - t0 }); }, rm() ? 200 : 900);
    }
    return true;
  }
  /** The next bowl for a tap or assist: the first one with room, in order. */
  function nextBowl() {
    for (let k = 0; k < 4; k++) { const i = (moves + k) % 4; if (i !== YOURS || places[YOURS].count < YOURS_CAP) return i; }
    return 0;
  }
  function step() {
    const s = [...stones].reverse().find((x) => x.place < 0 && !x.press);
    if (s) placeStone(s, nextBowl());
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    const G = geometry();
    homes();
    const on = onCount();
    const weight = on / N;
    // bowls of light
    for (const p of places) {
      const pos = G.pos[p.i];
      p.glow = approach(p.glow, 0, 1.4, dt);
      const yours = p.i === YOURS;
      const col = yours ? '#ffd98a' : '#a993ff';
      drawGlow(g, pos.x, pos.y, G.pr * 1.7, col, 0.22 + p.glow * 0.3);
      g.save();
      g.translate(pos.x, pos.y + G.pr * 0.1);
      g.scale(1, 0.42);
      g.globalAlpha = 0.85;
      g.strokeStyle = rgba(col, 0.75); g.lineWidth = 2.4;
      g.beginPath(); g.arc(0, 0, G.pr, 0, TAU); g.stroke();
      g.globalAlpha = 0.28;
      g.fillStyle = col;
      g.beginPath(); g.arc(0, 0, G.pr * 0.92, 0, TAU); g.fill();
      g.restore();
      if (yours && p.count >= YOURS_CAP) { g.globalAlpha = 0.5; g.strokeStyle = '#ffe9b0'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(pos.x, pos.y + G.pr * 0.1, G.pr * 1.15, G.pr * 0.5, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; }
      p.tag.at(pos.x, pos.y + G.pr * 0.55 + 6, 'bottom', 1);
    }
    // the thought, squashed by what it carries
    thought.step(dt, R_);
    const press = clamp(weight * 0.28);
    drawJelly(g, { x: thought.x, y: thought.y, r: R, sx: (1 + press * 0.9 + thought.sq * 0.9), sy: (1 - press - thought.sq), light, deep, glow: 0.4,
      face: { tension: 0.35 + weight * 0.6, calm: (1 - weight) * 0.7, sad: weight * 0.3, press: weight * 0.6, blink: blinkAt(t, 0.4), lookY: -0.5 * weight } });
    // the weights (drawn after so they sit on top)
    for (const s of stones) {
      s.step(dt, R_);
      drawGlow(g, s.x, s.y, s.r * 2.2, '#ffb54a', s.press ? 0.55 : 0.35);
      drawJelly(g, { x: s.x, y: s.y, r: s.r, sx: s.sx * 1.12, sy: s.sy * 0.86, light: s.light, deep: s.deep, glow: 0, alpha: 0.96 });
    }
    motes.draw(g, dt);
    words.at(thought.x, thought.y + R * 1.05 + 8, 'bottom', 1);
    if (finished) settleT += dt;
    return true;
  }

  let held = null;
  function pointer(e) {
    if (e.type === 'down') {
      const s = [...stones].reverse().find((x) => x.hit(e.x, e.y, 1.9));
      if (s && !held) { held = s; s.grab(e); s.place >= 0 && places[s.place].count--; s.place = -1; ctx.haptic('light'); return true; }
      if (thought.hit(e.x, e.y)) { thought.sqV += 2; ctx.haptic('light'); return true; }
      return false;
    }
    if (!held) return false;
    if (e.type === 'move') { held.drag(e); return true; }
    if (e.type === 'up' || e.type === 'cancel') {
      const s = held; held = null;
      const p = s.drop(e);
      if (!p) return true;
      if (p.moved < 12 && e.t - p.t0 < 380) { placeStone(s, nextBowl()); return true; }
      // dropped on (or near) a bowl?
      const G = geometry();
      let best = -1, bd = Infinity;
      G.pos.forEach((q, i) => { const d = Math.hypot(s.x - q.x, s.y - q.y); if (d < bd) { bd = d; best = i; } });
      if (bd < G.pr * 1.6) placeStone(s, best);
      else { homes(); ctx.haptic('light'); }
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => thought.hit(x, y) || stones.some((s) => s.hit(x, y, 1.9)),
    assist: step,
    avoid: () => { const G = geometry(); return [circleRect(thought.x, thought.y - R * 0.6, R * 1.6), ...G.pos.map((p) => circleRect(p.x, p.y, G.pr * 1.1)), ...ctx.tags.rects()]; },
    get settled() { return finished; },
    probe: () => { const G = geometry(); return { stones: stones.filter((s) => s.place < 0).map((s) => ({ x: s.x, y: s.y })), bowls: G.pos, thought: { x: thought.x, y: thought.y } }; },
    destroy() { TM.clear(); ctx.tags.clear(); },
  };
}
