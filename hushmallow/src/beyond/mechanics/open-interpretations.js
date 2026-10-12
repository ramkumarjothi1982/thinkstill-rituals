// Mind reading: open several possible interpretations without claiming one is true.
//
// The thought clutches one glowing guess ("Your first guess"). Three closed
// buds float around it. Press and hold a bud (a ring fills under the finger),
// or spread it with two fingers, and it blooms open on another possibility.
// When every bud is open, the first guess lets go and takes its place among
// them, the same size and the same light: none of them is the answer. A tap
// knocks a bud half open, a second tap opens it; the assist pill opens one.
// The possibilities are the scene's own other explanation (alternative_angle)
// and authored ones, never a claim that any of them is true. On a narrow
// phone they open in one column, each beside its bud, so every line reads.

import { Blob, drawGlow, drawJelly, clamp, approach, rgba, LIGHT, Motes, blinkAt, ease, TAU, Timers, viewW, RectList, thoughtFor } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'open_interpretations';
const HOLD_S = 0.55;
const BUD = ['#9fe8ff', '#b9a6ff', '#ffc0e6'];

export function mount(ctx) {
  const L = MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(40);
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.1, 22, 36);
  const from = ctx.from || { x: A0.x + A0.w / 2, y: A0.y + A0.h * 0.72 };
  const thought = thoughtFor(ctx, { x: from.x, y: from.y, r: R });
  const guess = new Blob({ x: from.x + R, y: from.y - R, r: R * 0.8, light: LIGHT.guess[0], deep: LIGHT.guess[1] });
  const P = ctx.parts;
  // the first guess: what the mind assumed (the scene's, or the person's own words)
  const guessText = !P.guessAsk && P.guess ? P.guess : P.excerpt;
  const others = (P.alternatives?.length ? P.alternatives : L.others).slice(0, 3);
  while (others.length < 3) others.push(L.others[others.length]);
  // a narrow phone: one column of possibilities, each line beside its bud (a ring has no room for four lines)
  const narrow = viewW() < 360 || A0.w < 330;
  const rowMax = Math.round(Math.max(150, A0.w - R * 2.25 - R * 1.6 - 14));
  // on the ring, two lines' worth across (half the area), so a long possibility doesn't grow into its bud
  const ringMax = Math.round(clamp(A0.w / 2 - 10, 150, 210));
  const buds = others.map((text, i) => {
    const b = new Blob({ x: from.x, y: from.y, r: R * 0.8, light: BUD[i], deep: ['#3ab4e8', '#7a5cf0', '#e05aa8'][i] });
    b.open = 0; b.goal = 0; b.hold = 0; b.knock = 0; b.i = i; b.tag = ctx.tags.add(text, { kind: 'line', max: narrow ? rowMax : ringMax, group: 'meanings' }); b.scale = rm() ? 1 : 0.2;
    return b;
  });
  const tags = {
    guessL: ctx.tags.add(L.labels.guess, { kind: 'label', colour: LIGHT.guess[1], priority: 1, group: 'meanings' }),
    guessW: ctx.tags.add(guessText, { kind: 'line', max: narrow ? rowMax : ringMax, group: 'meanings' }),
    // in one column the first guess carries the words already
    words: narrow ? null : ctx.tags.add(P.excerpt, { kind: 'words' }),
  };
  let phase = 'closed';      // closed → equal → settled
  let equalT = 0, moves = 0;
  const t0 = performance.now();
  const holds = new Map();   // pointer id → bud
  const BL = new RectList(), AL = new RectList();

  /** Even places on a ring (or one column on a narrow phone); before "equal" the first guess hugs the thought. */
  function homes() {
    const A = ctx.area();
    if (narrow) {
      // the thought on the left, the guess and the three buds in a column beside it, top to bottom; each row
      // as tall as its own line (a three-line possibility gets the room it needs), the spare height shared out
      thought.hx = A.x + R * 1.05; thought.hy = A.y + A.h * 0.5;
      const rows = [guess, ...buds], tg = [tags.guessW, ...buds.map((b) => b.tag)];
      const hs = tg.map((t) => Math.max(R * 1.7, t.h || 40));
      const gap = clamp((A.h - hs.reduce((a, b) => a + b, 0)) / rows.length, 4, 26);
      let y = A.y + Math.max(0, (A.h - hs.reduce((a, b) => a + b, 0) - gap * (rows.length - 1)) / 2);
      rows.forEach((b, i) => { b.hx = A.x + R * 2.25 + R * 0.8; b.hy = y + hs[i] / 2; y += hs[i] + gap; });
      return;
    }
    const rx = Math.min(A.w * 0.34, A.w / 2 - R * 1.6), ry = Math.min(A.h * 0.34, A.h / 2 - R * 1.4);
    // once open, the lower lines hang below their buds and the upper ones above: when the lower ones are
    // taller, the ring rises by half the difference, so neither row's words are pushed onto a bud
    let lift = 0;
    if (phase !== 'closed') {
      const upper = Math.max(tags.guessW.h || 0, buds[2].tag.h || 0), lower = Math.max(buds[0].tag.h || 0, buds[1].tag.h || 0);
      lift = clamp((lower - upper) / 2, -A.h * 0.12, A.h * 0.12);
    }
    const cx = A.x + A.w / 2, cy = A.y + A.h * 0.5 - lift;
    thought.hx = cx; thought.hy = cy + (phase === 'closed' ? ry * 0.15 : 0);
    const n = phase === 'closed' ? buds.length : buds.length + 1;
    const all = phase === 'closed' ? buds : [guess, ...buds];
    all.forEach((b, i) => {
      // closed: the buds wait on the side the thought isn't looking (upper left), the guess it clutches has the
      // upper right to itself, so its name can only be read as the guess's; open: all four evenly round the ring
      const a = phase === 'closed' ? -Math.PI + 0.22 + i * 0.6 : -Math.PI / 2 + (i * TAU) / n + (n === 4 ? Math.PI / 4 : 0);
      b.hx = cx + Math.cos(a) * rx; b.hy = cy + Math.sin(a) * ry;
    });
    if (phase === 'closed') { guess.hx = thought.hx + R * 0.95; guess.hy = thought.hy - R * 0.55; }
  }
  homes();
  if (rm()) for (const b of [thought, guess, ...buds]) { b.x = b.hx; b.y = b.hy; }

  const openCount = () => buds.filter((b) => b.goal >= 1).length;
  function bloom(b) {
    if (b.goal >= 1) return;
    b.goal = 1; b.knock = 0;
    moves++;
    ctx.haptic('soft'); ctx.fx('bloom', { intensity: 0.5 });
    motes.burst(b.x, b.y, b.light, 8, { speed: 44, size: 2.4 });
    ctx.progress(openCount() / buds.length);
    if (openCount() === buds.length) TM.after(() => {
      phase = 'equal'; equalT = 0; homes();
      ctx.haptic('light');
    }, rm() ? 100 : 700);
  }
  function knock(b) {
    if (b.goal >= 1) return;
    b.knock++; b.sqV += 2.6; ctx.haptic('light');
    b.goal = b.knock >= 2 ? 1 : 0.35;
    if (b.knock >= 2) { b.goal = 0; bloom(b); }
  }
  function step() { const b = buds.find((x) => x.goal < 1); if (b) bloom(b); }

  function drawBud(b, t) {
    const o = b.open;
    const r = b.r * b.scale;
    if (o < 0.995) {
      // two shell halves parting as it opens
      const ang = ease.outCubic(o) * 0.95;
      for (const s of [-1, 1]) {
        g.save();
        g.translate(b.x, b.y + r * 0.2);
        g.rotate(s * ang);
        g.translate(s * r * 0.08 * o, -r * 0.2);
        g.beginPath();
        g.ellipse(s * r * 0.36, 0, r * 0.56, r * 0.95, s * 0.12, 0, TAU);
        g.globalAlpha = 0.86 * (1 - o * 0.6);
        g.fillStyle = rgba(b.deep, 0.85);
        g.fill();
        g.globalAlpha = 0.5 * (1 - o);
        g.strokeStyle = rgba(b.light, 0.9); g.lineWidth = 1.4; g.stroke();
        g.restore();
      }
      g.globalAlpha = 1;
    }
    // the light inside: a small, calm jelly face when open
    if (o > 0.05) drawJelly(g, { x: b.x, y: b.y, r: r * (0.55 + 0.45 * o), light: b.light, deep: b.deep, alpha: clamp(o * 1.2), glow: 0.45 * o,
      face: { tension: 0.1, calm: 0.55, surprise: o < 0.8 ? 0.5 : 0, blink: blinkAt(t, b.i * 1.3) }, faceAlpha: o });
    else drawGlow(g, b.x, b.y, r * 1.6, b.light, 0.2 + 0.1 * Math.sin(t * 1.6 + b.i));
    // the hold ring fills under the finger
    if (b.hold > 0 && b.goal < 1) {
      g.globalAlpha = 0.9; g.strokeStyle = rgba(b.light, 0.95); g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.arc(b.x, b.y, r * 1.22, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(b.hold / HOLD_S)); g.stroke();
      g.globalAlpha = 1;
    }
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    homes();
    for (const [pid, b] of holds) { b.hold += dt; if (b.hold >= HOLD_S) { holds.delete(pid); b.hold = 0; bloom(b); } }
    for (const b of buds) {
      b.scale = R_ ? 1 : approach(b.scale, 1, 3, dt);
      b.open = R_ ? b.goal : approach(b.open, b.goal, 4.2, dt);
      b.step(dt, R_);
    }
    thought.step(dt, R_); guess.step(dt, R_);
    if (phase === 'equal') { equalT += dt; guess.r = approach(guess.r, buds[0].r, 3, dt); if (equalT > (R_ ? 0.2 : 1.1)) { phase = 'settled'; ctx.progress(1); TM.after(() => { ctx.haptic('success'); resolve({ moves, ms: performance.now() - t0 }); }, R_ ? 150 : 500); } }
    // faint threads from the thought to every possibility: all equally possible
    const all = phase === 'closed' ? [guess] : [guess, ...buds];
    for (const b of all) {
      g.globalAlpha = phase === 'closed' ? 0.5 : 0.28;
      g.strokeStyle = rgba(b.light, 0.8); g.lineWidth = phase === 'closed' ? 2.4 : 1.4;
      g.beginPath(); g.moveTo(thought.x, thought.y); g.lineTo(b.x, b.y); g.stroke();
    }
    g.globalAlpha = 1;
    for (const b of buds) drawBud(b, t);
    drawJelly(g, { x: guess.x, y: guess.y, r: guess.r, sx: guess.sx, sy: guess.sy, light: guess.light, deep: guess.deep, glow: phase === 'closed' ? 0.7 : 0.45,
      face: { tension: phase === 'closed' ? 0.6 : 0.1, calm: phase === 'closed' ? 0 : 0.55, blink: blinkAt(t, 2.4) } });
    thought.draw(g, { tension: phase === 'closed' ? 0.75 - openCount() * 0.15 : 0.15, calm: phase === 'closed' ? openCount() * 0.15 : 0.65, blink: blinkAt(t, 0.7),
      lookX: phase === 'closed' ? 0.5 : 0, lookY: -0.4, press: thought.press ? 1 : 0 });
    motes.draw(g, dt);
    // words
    if (narrow) {
      // one column: every line beside its own bud (the first guess's label sits over its line while it is the only one)
      for (const b of buds) b.tag.at(b.x + b.r + 10, b.y, 'left', clamp((b.open - 0.6) * 2.5)).own(b.x, b.y);
      tags.guessW.at(guess.x + guess.r + 10, guess.y, 'left', 1).own(guess.x, guess.y);
      tags.guessL.at(guess.x + guess.r + 10, guess.y - (tags.guessW.h || 30) / 2 - 2, 'leftTop', phase === 'closed' ? 1 : 0).own(guess.x, guess.y);
      return true;
    }
    // a possibility's words sit on the far side from the thought (above the upper ones, below the lower ones)
    for (const b of buds) {
      const up = b.y < thought.y - R * 0.3;
      b.tag.at(b.x, up ? b.y - b.r * 1.08 - 4 : b.y + b.r * 1.08 + 4, up ? 'top' : 'bottom', clamp((b.open - 0.6) * 2.5)).own(b.x, b.y);
    }
    const gUp = guess.y < thought.y - R * 0.3 && phase !== 'closed';
    tags.guessL.at(guess.x, guess.y - guess.r * 1.15 - 4, 'top', phase === 'closed' ? 1 : 0).own(guess.x, guess.y);
    tags.guessW.at(guess.x, gUp ? guess.y - guess.r * 1.08 - 4 : guess.y + guess.r * 1.08 + 4, gUp ? 'top' : 'bottom', phase !== 'closed' ? 1 : 0).own(guess.x, guess.y);
    tags.words?.at(thought.x, thought.y + R * 1.08 + 6, 'bottom', phase === 'closed' ? 1 : 0.0);
    return true;
  }

  function pointer(e) {
    if (e.type === 'down') {
      const b = buds.find((x) => x.goal < 1 && x.hit(e.x, e.y, 1.6));
      if (b) { b.hold = 0.001; b.sqV += 1.6; holds.set(e.id, b); b.downAt = e.t; b.down = { x: e.x, y: e.y }; ctx.haptic('light'); return true; }
      if (guess.hit(e.x, e.y)) { guess.sqV += 2; ctx.haptic('light'); return true; }
      if (thought.hit(e.x, e.y)) { thought.poke(e); ctx.haptic('light'); return true; }
      return false;
    }
    if (thought.pointer(e)) return true;
    const b = holds.get(e.id);
    if (e.type === 'move') {
      // a second finger near the same bud spreads it open
      if (b && [...holds.values()].filter((x) => x === b).length >= 2) { holds.forEach((x, k) => { if (x === b) holds.delete(k); }); b.hold = 0; bloom(b); }
      return !!b;
    }
    if (e.type === 'up' || e.type === 'cancel') {
      if (!b) return false;
      holds.delete(e.id);
      const quick = e.t - (b.downAt || e.t) < 300;
      b.hold = 0;
      if (quick && b.goal < 1) knock(b);
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => thought.hit(x, y) || guess.hit(x, y) || buds.some((b) => b.hit(x, y, 1.6)),
    assist: step,
    bodies: () => { BL.begin().circle(thought.x, thought.y, R * thought.scale, 2).circle(guess.x, guess.y, guess.r, 2); for (const b of buds) BL.circle(b.x, b.y, b.r * b.scale, 2); return BL.end(); },
    avoid: () => { AL.begin().circle(thought.x, thought.y, R * 1.3).circle(guess.x, guess.y, guess.r * 1.3); for (const b of buds) AL.circle(b.x, b.y, b.r * 1.3); for (const r of ctx.tags.rects()) AL.box(r.left, r.top, r.right, r.bottom); return AL.end(); },
    get settled() { return phase === 'settled'; },
    probe: () => ({ buds: buds.filter((b) => b.goal < 1).map((b) => ({ x: b.x, y: b.y })), thought: { x: thought.x, y: thought.y }, guessAt: { x: guess.x, y: guess.y }, phase, narrow, others, guess: guessText }),
    destroy() { TM.clear(); ctx.tags.clear(); thought.destroy?.(); },
  };
}
