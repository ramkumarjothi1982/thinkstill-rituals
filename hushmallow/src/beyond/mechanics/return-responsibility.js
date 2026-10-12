// Personalisation: move the imagined responsibility back to where it belongs.
//
// The blame, as the person put it ("I blame myself for it"), sits on the
// thought as a heavy amber slab with their words on it, with four smaller
// weights piled on top: together they squash the thought flat. Four soft
// bowls of light wait around it: Other people, Circumstances, Timing, Your
// part. Drag each weight (the slab too) to where it belongs. "Your part"
// holds a fair share (two) and no more: accountability stays, the rest goes
// back. As the weights come off, the thought rises and breathes out. Tap a
// weight, or the assist pill, to send it to the next bowl.
//
// Each bowl's name is tied to its bowl (above it; below the lower pair on a
// short phone) and never drifts towards another; the words ride on the slab itself,
// so nothing floats over the pile the person has to drag.

import { Blob, drawGlow, drawJelly, clamp, approach, rgba, LIGHT, Motes, blinkAt, TAU, Timers, RectList, roundRect, thoughtFor } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'return_responsibility';
const N = 5;              // the slab + four small weights
const YOURS = 3;          // index of "Your part" in the places
const YOURS_CAP = 2;
const PLACE_COLOURS = ['#7fe7ff', '#b59cff', '#ff9ad5', '#ffd98a'];
// the pile on the slab: three small weights in a row, one on top
const ROWS = [[-1, 0], [1, 0], [0, 0], [0, 1]];

export function mount(ctx) {
  const L = MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(36);
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.12, 26, 42);
  const from = ctx.from || { x: A0.x + A0.w / 2, y: A0.y + A0.h * 0.7 };
  const thought = thoughtFor(ctx, { x: from.x, y: from.y, r: R });
  // a short phone: the bowls sit either side of the thought, two each side
  const SHORT = A0.h < 270;
  const blame = ctx.parts.weight || 'The heaviest part';
  const slabTag = ctx.tags.add(blame, { kind: 'piece', cls: 'slab', max: SHORT ? 124 : 136 });
  const slab = new Blob({ x: from.x, y: from.y - R, r: R * 0.5, light: LIGHT.calm[0], deep: '#d97a2b' });
  slab.isSlab = true; slab.place = -1; slab.k = 30; slab.d = 8; slab.w = 110; slab.hh = 40;
  const sr = R * 0.32;
  const small = Array.from({ length: N - 1 }, (_, i) => {
    const b = new Blob({ x: from.x, y: from.y - R * 1.6, r: sr - i * 0.4, light: LIGHT.calm[0], deep: '#e0943a' });
    b.place = -1; b.k = 34; b.d = 8; b.i = i;
    return b;
  });
  const weights = [slab, ...small];   // the slab first (lowest on the pile)
  // the bowls' names stay with their bowls (they claim their place first, and only lean a little)
  const places = L.labels.places.map((label, i) => ({ label, i, count: 0, glow: 0, tag: ctx.tags.add(label, { kind: 'label', colour: PLACE_COLOURS[i], priority: 2, group: 'bowls' }) }));
  const words = SHORT ? null : ctx.tags.add(ctx.parts.excerpt, { kind: 'words', max: 230 });
  let finished = false, warned = false, moves = 0;
  const t0 = performance.now();
  const G = { tx: 0, ty: 0, pr: 30, short: SHORT, pos: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], top: [false, true, true, false] };
  const slotN = new Int8Array(4);
  const bodiesL = new RectList(), avoidL = new RectList();

  function geometry() {
    const A = ctx.area();
    G.tx = A.x + A.w / 2;
    if (SHORT) {
      const pr = G.pr = clamp(Math.min(A.w * 0.12, A.h * 0.15), 28, 44);
      // the top pair carry their names above them, the lower pair below: the pile in the middle stays clear
      const lx = A.x + pr + 6, rx = A.x + A.w - pr - 6, y0 = A.y + Math.max(A.h * 0.2, 36 + pr * 0.45), y1 = A.y + A.h * 0.66;
      G.ty = A.y + A.h * 0.66;
      G.pos[0].x = lx; G.pos[0].y = y0; G.pos[1].x = rx; G.pos[1].y = y0; G.pos[2].x = lx; G.pos[2].y = y1; G.pos[3].x = rx; G.pos[3].y = y1;
      G.top[0] = G.top[1] = true; G.top[2] = G.top[3] = false;
      return G;
    }
    const pr = G.pr = clamp(Math.min(A.w * 0.12, A.h * 0.15), 28, 44);
    // every bowl carries its name above it (below would put the side names beside the pile), so the side two
    // sit low enough for their names to clear the top two
    // (far enough below the top pair that a side name is always nearer its own bowl than the one above it)
    const yTop = A.y + 38 + pr * 0.45, ySide = A.y + Math.max(A.h * 0.46, 120 + pr * 0.9);
    G.pos[0].x = A.x + pr + 12; G.pos[0].y = ySide;
    G.pos[1].x = A.x + A.w * 0.29; G.pos[1].y = yTop;
    G.pos[2].x = A.x + A.w * 0.71; G.pos[2].y = yTop;
    G.pos[3].x = A.x + A.w - pr - 12; G.pos[3].y = ySide;
    G.top[0] = G.top[1] = G.top[2] = G.top[3] = true;
    G.ty = A.y + A.h - R * 1.15 - 58;
    return G;
  }
  let onPile = N;
  function homes() {
    geometry();
    const A = ctx.area();
    onPile = 0;
    for (let i = 0; i < N; i++) if (weights[i].place < 0) onPile++;
    const weight = onPile / N;
    thought.hx = G.tx; thought.hy = G.ty + R * 0.22 * weight;
    // the top of the squashed thought, then the slab on it, then the small ones on the slab
    const head = thought.hy - R * 0.95 * (1 - weight * 0.28);
    let base = head;
    if (slab.place < 0 && !slab.press) { slab.hx = G.tx; slab.hy = head - slab.hh / 2 + 3; }
    if (slab.place < 0) base = (slab.press ? head : slab.hy) - slab.hh / 2 + 2;
    let k = 0;
    slotN.fill(0);
    for (const s of small) {
      if (s.place >= 0) continue;
      if (!s.press) { const [cx, row] = ROWS[k] || ROWS[3]; s.hx = G.tx + cx * sr * 1.95; s.hy = base - sr * 0.92 - row * sr * 1.62; }
      k++;
    }
    for (const s of weights) {
      if (s.place < 0 || s.press) continue;
      const p = G.pos[s.place];
      if (s === slab) { s.hx = clamp(p.x, A.x + slab.w / 2 + 2, A.x + A.w - slab.w / 2 - 2); s.hy = p.y + G.pr * 0.02; continue; }
      const j = slotN[s.place]++;
      const others = places[s.place].count - (slab.place === s.place ? 1 : 0);
      // small weights sit side by side in the bowl (on the slab, when the slab went there too)
      s.hx = p.x + (j - (others - 1) / 2) * s.r * 2.1;
      s.hy = slab.place === s.place ? p.y - slab.hh / 2 - s.r * 0.6 : p.y + G.pr * 0.08 - j;
    }
  }
  homes();
  if (rm()) for (const b of [thought, ...weights]) { b.x = b.hx; b.y = b.hy; }

  function placeStone(s, idx) {
    const pl = places[idx];
    if (idx === YOURS && pl.count >= YOURS_CAP) {
      if (!warned) { warned = true; ctx.hint('Your part’s already got its fair share.'); }
      s.place = -1; homes(); ctx.haptic('light');
      return false;
    }
    s.place = idx; pl.count++; pl.glow = 1;
    moves++;
    ctx.haptic('soft'); ctx.fx('drop-in', { intensity: s === slab ? 0.7 : 0.5 });
    homes();
    motes.burst(G.pos[idx].x, G.pos[idx].y, idx === YOURS ? '#ffd98a' : '#c8b8ff', s === slab ? 9 : 6, { speed: 34, size: 2.2 });
    thought.sqV -= s === slab ? 3.2 : 2.4;   // a little bounce of relief
    if (s === slab) ctx.say?.(`“${blame}” now sits with ${pl.label}`);
    ctx.progress(1 - onPile / N);
    if (!onPile && !finished) {
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
  /** The assist pill: the top of the pile first (the slab, under the others, last). */
  function step() {
    for (let i = small.length - 1; i >= 0; i--) { const s = small[i]; if (s.place < 0 && !s.press) { placeStone(s, nextBowl()); return; } }
    if (slab.place < 0 && !slab.press) placeStone(slab, nextBowl());
  }

  // the slab's amber glass, cached per height (drawn in its own frame)
  const slabGrads = new Map();
  function slabGradient(hh) {
    const key = Math.round(hh);
    let gr = slabGrads.get(key);
    if (!gr) {
      gr = g.createLinearGradient(0, -hh / 2, 0, hh / 2);
      gr.addColorStop(0, 'rgba(255,240,214,0.97)'); gr.addColorStop(0.45, 'rgba(255,205,140,0.95)'); gr.addColorStop(1, 'rgba(228,138,58,0.95)');
      if (slabGrads.size > 24) slabGrads.clear();
      slabGrads.set(key, gr);
    }
    return gr;
  }
  function drawSlab(t) {
    const w = slab.w, hh = slab.hh, sx = slab.sx, sy = slab.sy;
    drawGlow(g, slab.x, slab.y, Math.max(w, hh) * 0.75, '#ffb54a', slab.press ? 0.5 : 0.32);
    g.save();
    g.translate(slab.x, slab.y);
    if (slab.rot) g.rotate(slab.rot);
    g.scale(sx, sy);
    // a soft shadow under it, then the glass
    g.globalAlpha = 0.35; g.fillStyle = 'rgba(40,14,0,0.6)';
    roundRect(g, -w / 2 + 2, -hh / 2 + 5, w, hh, hh * 0.42); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = slabGradient(hh);
    roundRect(g, -w / 2, -hh / 2, w, hh, hh * 0.42); g.fill();
    // the rim and a long specular along the top
    g.strokeStyle = 'rgba(255,250,236,0.85)'; g.lineWidth = 1.4; g.stroke();
    g.globalAlpha = 0.6; g.fillStyle = '#fffaf0';
    roundRect(g, -w / 2 + hh * 0.3, -hh / 2 + 3, w - hh * 0.6, Math.max(3, hh * 0.12), 3); g.fill();
    g.restore();
    g.globalAlpha = 1;
    void t;
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    // the slab is as big as the words it carries (measured once they're laid out)
    slab.w = Math.max(R * 2.2, slabTag.w + 26); slab.hh = Math.max(R * 0.95, slabTag.h + 14); slab.r = slab.hh / 2;
    homes();
    const weight = onPile / N;
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
      // the name: above a top bowl, below a side one; tied to its own bowl
      // (a clear gap above the bowl, so the collision pass never needs to nudge a name off its own bowl)
      if (G.top[p.i]) p.tag.at(pos.x, pos.y - G.pr * 0.45 - 9, 'top', 1);
      else p.tag.at(pos.x, pos.y + G.pr * 0.55 + 6, 'bottom', 1);
      p.tag.own(pos.x, pos.y);
    }
    // the thought, squashed by what it carries
    thought.step(dt, R_);
    const press = clamp(weight * 0.28);
    thought.draw(g, { tension: 0.35 + weight * 0.6, calm: (1 - weight) * 0.7, sad: weight * 0.3, press: weight * 0.6, blink: blinkAt(t, 0.4), lookY: -0.5 * weight },
      { glow: 0.4, squash: press });
    // the weights (drawn after so they sit on top): the slab, then the small ones
    slab.step(dt, R_);
    drawSlab(t);
    for (const s of small) {
      s.step(dt, R_);
      drawGlow(g, s.x, s.y, s.r * 2.2, '#ffb54a', s.press ? 0.55 : 0.35);
      drawJelly(g, { x: s.x, y: s.y, r: s.r, sx: s.sx * 1.12, sy: s.sy * 0.86, light: s.light, deep: s.deep, glow: 0, alpha: 0.96 });
    }
    motes.draw(g, dt);
    slabTag.at(slab.x, slab.y + 1, 'center', 1);
    words?.at(thought.x, thought.y + R * 1.05 + 8, 'bottom', 1);
    return true;
  }

  let held = null;
  const hitSlab = (x, y) => Math.abs(x - slab.x) < slab.w / 2 + 10 && Math.abs(y - slab.y) < slab.hh / 2 + 10;
  function pick(x, y) {
    // the small ones on top win a touch on the pile; then the slab
    for (let i = small.length - 1; i >= 0; i--) if (small[i].hit(x, y, 1.9)) return small[i];
    return hitSlab(x, y) ? slab : null;
  }
  function pointer(e) {
    if (e.type === 'down') {
      const s = pick(e.x, e.y);
      if (s && !held) { held = s; s.grab(e); if (s.place >= 0) places[s.place].count--; s.place = -1; ctx.haptic('light'); return true; }
      if (thought.hit(e.x, e.y)) { thought.poke(e); ctx.haptic('light'); return true; }
      return false;
    }
    if (!held) return thought.pointer(e);
    if (e.type === 'move') { held.drag(e); return true; }
    if (e.type === 'up' || e.type === 'cancel') {
      const s = held; held = null;
      const p = s.drop(e);
      if (!p) return true;
      if (p.moved < 12 && e.t - p.t0 < 380) { placeStone(s, nextBowl()); return true; }
      // dropped on (or near) a bowl?
      let best = -1, bd = Infinity;
      for (let i = 0; i < 4; i++) { const q = G.pos[i]; const d = Math.hypot(s.x - q.x, s.y - q.y); if (d < bd) { bd = d; best = i; } }
      if (bd < G.pr * (s === slab ? 1.9 : 1.6)) placeStone(s, best);
      else { homes(); ctx.haptic('light'); }
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => thought.hit(x, y) || !!pick(x, y),
    assist: step,
    bodies: () => {
      bodiesL.begin().circle(thought.x, thought.y, R * 1.05, 2);
      for (const p of G.pos) bodiesL.box(p.x - G.pr, p.y - G.pr * 0.45, p.x + G.pr, p.y + G.pr * 0.55);
      bodiesL.box(slab.x - slab.w / 2 - 1, slab.y - slab.hh / 2 - 1, slab.x + slab.w / 2 + 1, slab.y + slab.hh / 2 + 1);
      for (const s of small) bodiesL.circle(s.x, s.y, s.r, 1);
      return bodiesL.end();
    },
    avoid: () => {
      avoidL.begin().circle(thought.x, thought.y - R * 0.6, R * 1.6);
      for (const p of G.pos) avoidL.circle(p.x, p.y, G.pr * 1.1);
      for (const r of ctx.tags.rects()) avoidL.box(r.left, r.top, r.right, r.bottom);
      return avoidL.end();
    },
    get settled() { return finished; },
    probe: () => ({
      // the top of the pile first (what a finger would take)
      stones: [...small].reverse().filter((s) => s.place < 0).concat(slab.place < 0 ? [slab] : []).map((s) => ({ x: s.x, y: s.y, heaviest: s === slab })),
      bowls: G.pos.map((p) => ({ x: p.x, y: p.y })), names: places.map((p) => p.label), thought: { x: thought.x, y: thought.y }, heavy: blame, places: places.map((p) => p.count),
      slab: { x: slab.x, y: slab.y, w: slab.w, h: slab.hh },
    }),
    destroy() { TM.clear(); ctx.tags.clear(); thought.destroy?.(); },
  };
}
