// Practical problem: assemble one small actionable next step.
//
// One small step lies in three warm, jelly-soft pieces, each carrying part of
// the sentence. Faint treads of a little staircase wait beside them. Drag
// each piece onto a tread (it snaps in with a squish; any tread will do, and
// they quietly sort themselves into reading order, top to bottom). With all
// three in place they fuse into one glowing staircase and the thought hops up
// to stand on it. Tap a piece (or the assist pill) to send it to its tread.
// The pieces start out of order (a fixed shuffle, the same for the same step),
// so putting the sentence together is the person's own small act.

import { Blob, drawGlow, clamp, approach, rgba, Motes, blinkAt, roundRect, Timers, RectList, thoughtFor } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'assemble_step';
const WARM = ['#ffe2a8', '#ffb357'];
// every order of three pieces except reading order
const SHUFFLES = [[1, 2, 0], [2, 0, 1], [1, 0, 2], [2, 1, 0], [0, 2, 1]];
const hash = (s) => { let x = 7; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; };

export function mount(ctx) {
  // (a scene's own lines when it has them: a feeling's never speak of verdicts or "every time")
  const L = ctx.lines || MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(40);
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.085, 19, 30);
  const thought = thoughtFor(ctx, { x: ctx.from?.x ?? A0.x + A0.w / 2, y: ctx.from?.y ?? A0.y + A0.h * 0.3, r: R });
  const BL = new RectList(), AL = new RectList();
  const TREAD_EDGE = rgba(WARM[0], 0.9), DASH = [5, 6], NO_DASH = [];
  const pieces = ctx.parts.steps.map((text, i) => {
    const b = new Blob({ x: thought.x, y: thought.y, r: R, light: WARM[0], deep: WARM[1] });
    b.i = i; b.slot = -1; b.k = 30; b.d = 8; b.scale = rm() ? 1 : 0.3;
    b.tag = ctx.tags.add(text, { kind: 'piece', max: Math.round(Math.min(220, A0.w * 0.42)) });
    return b;
  });
  // where each piece waits before it is placed: row startRow[i] (never reading order)
  const startRow = SHUFFLES[hash(ctx.parts.steps.join('|')) % SHUFFLES.length];
  const SHORT_ = A0.h < 270;
  // a short phone: one line of their words, top left, above the pieces (the thought and the treads keep the right)
  const wordsTag = ctx.tags.add(SHORT_ ? (ctx.parts.excerptShort || ctx.parts.excerpt) : ctx.parts.excerpt, { kind: 'words', max: Math.round(SHORT_ ? A0.w * 0.66 : A0.w * 0.46) });
  const grads = new Map();    // the piece's light, cached per height
  const SHORT = A0.h < 270;   // a short phone: the words step aside once the first piece is in
  const stepLabel = ctx.tags.add(L.labels.step, { kind: 'label', colour: WARM[1] });
  let phase = 'pieces';    // pieces → fuse → standing
  let fuseT = 0, held = null, moves = 0;
  const t0 = performance.now();

  // the geometry objects are made once and refreshed in place (geo() runs several times a frame)
  const SZ = pieces.map(() => ({ w: 84, h: 34 })), TRD = pieces.map(() => ({ x: 0, y: 0, w: 84, h: 34 }));
  const GEO = { A: null, sizes: SZ, treads: TRD, top: TRD[0], maxH: 34 };
  const size = (b, out = SZ[b.i]) => { out.w = clamp((b.tag.w || 90) + 26, 84, ctx.area().w * 0.5); out.h = Math.max(34, (b.tag.h || 24) + 12); return out; };
  /** Treads: piece 0 on the top tread, the last piece at the bottom (reads top to bottom). */
  function geo() {
    const A = ctx.area();
    GEO.A = A;
    let maxH = 0;
    for (const b of pieces) { const s = size(b); if (s.h > maxH) maxH = s.h; }
    const sx = A.x + A.w * 0.68;
    let y = A.y + A.h - 8;
    for (let k = pieces.length - 1; k >= 0; k--) {           // build from the bottom tread up
      const s = SZ[k], q = TRD[k];
      y -= s.h / 2;
      q.x = clamp(sx - (k - 1) * A.w * 0.07, A.x + s.w / 2 + 6, A.x + A.w - s.w / 2 - 6); q.y = y; q.w = s.w; q.h = s.h;
      y -= s.h / 2 + 5;
    }
    GEO.maxH = maxH;
    return GEO;
  }
  function homes() {
    const G = geo();
    if (phase === 'pieces') { thought.hx = G.top.x; thought.hy = Math.max(G.A.y + R * 1.2, G.top.y - G.top.h / 2 - R * 2.2); }
    else { thought.hx = G.top.x; thought.hy = G.top.y - G.top.h / 2 - R * 0.98; }
    for (const b of pieces) {
      if (b.press) continue;
      if (b.slot >= 0) { const tr = G.treads[b.slot]; b.hx = tr.x; b.hy = tr.y; }
      else { const row = startRow[b.i]; b.hx = G.A.x + Math.max(G.sizes[b.i].w / 2 + 10, G.A.w * 0.26); b.hy = G.A.y + (SHORT_ ? Math.max(G.A.h * 0.16, (wordsTag.h || 32) + 10) : G.A.h * 0.16) + row * (G.maxH + 14) + G.maxH / 2; }
    }
  }
  homes();
  if (rm()) for (const b of [thought, ...pieces]) { b.x = b.hx; b.y = b.hy; }

  const placed = () => pieces.filter((b) => b.slot >= 0).length;
  function snap(b, slot) {
    const G = geo();
    if (slot == null) {
      let best = -1, bd = Infinity;
      G.treads.forEach((q, i) => { if (pieces.some((x) => x !== b && x.slot === i)) return; const d = Math.hypot(b.x - q.x, b.y - q.y); if (d < bd) { bd = d; best = i; } });
      if (best < 0 || bd > Math.max(70, G.treads[best].w * 0.75)) { homes(); ctx.haptic('light'); return false; }
      slot = best;
    }
    b.slot = slot; b.sqV -= 3;
    moves++;
    ctx.haptic('soft'); ctx.fx('click', { intensity: 0.5 });
    ctx.progress(placed() / 3 * 0.9);
    if (placed() === 3) {
      pieces.forEach((p) => { p.slot = p.i; });     // into reading order
      TM.after(fuse, rm() ? 80 : 560);
    }
    homes();
    return true;
  }
  function fuse() {
    if (phase !== 'pieces') return;
    phase = 'fuse'; fuseT = 0;
    ctx.fx('chime', { intensity: 0.55 }); ctx.haptic('success');
    const G = geo();
    for (const tr of G.treads) motes.burst(tr.x, tr.y, WARM[1], 5, { speed: 50, size: 2.4 });
    homes();
  }
  function step() {
    if (phase !== 'pieces') return;
    const b = pieces.find((x) => x.slot < 0 && !x.press);
    if (b) snap(b, pieces.some((x) => x.slot === b.i) ? null : b.i);
  }

  function block(x, y, w, hh, alpha, rot = 0, sx = 1, sy = 1, lit = 0) {
    drawGlow(g, x, y, w * 0.8, WARM[1], (0.24 + lit * 0.2) * alpha);
    g.save();
    g.translate(x, y); if (rot) g.rotate(rot); g.scale(sx, sy);
    const key = Math.max(8, Math.round(hh / 2) * 2);
    let gr = grads.get(key);
    if (!gr) {
      gr = g.createLinearGradient(0, -key / 2, 0, key / 2);
      gr.addColorStop(0, rgba('#fff4dc', 0.96)); gr.addColorStop(0.45, rgba(WARM[0], 0.94)); gr.addColorStop(1, rgba(WARM[1], 0.94));
      if (grads.size > 48) grads.clear();
      grads.set(key, gr);
    }
    g.globalAlpha = alpha; g.fillStyle = gr;
    roundRect(g, -w / 2, -hh / 2, w, hh, hh * 0.45); g.fill();
    g.globalAlpha = 0.6 * alpha; g.strokeStyle = '#ffffff'; g.lineWidth = 1.2;
    roundRect(g, -w / 2 + 4, -hh / 2 + 2, w - 8, hh * 0.38, hh * 0.25); g.stroke();
    g.restore();
    g.globalAlpha = 1;
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    const G = geo();
    homes();
    // empty treads: faint dashed outlines
    if (phase === 'pieces') {
      for (let i = 0; i < G.treads.length; i++) {
        let taken = false;
        for (const b of pieces) if (b.slot === i) { taken = true; break; }
        if (taken) continue;
        const q = G.treads[i];
        g.globalAlpha = 0.55; g.strokeStyle = TREAD_EDGE; g.lineWidth = 1.6; g.setLineDash?.(DASH);
        roundRect(g, q.x - q.w / 2, q.y - q.h / 2, q.w, q.h, q.h * 0.45); g.stroke(); g.setLineDash?.(NO_DASH);
        g.globalAlpha = 1;
      }
    } else {
      fuseT += dt;
      // fused: one staircase of light behind the treads
      const k = R_ ? 1 : clamp(fuseT / 0.8);
      for (const q of G.treads) drawGlow(g, q.x, q.y, q.w * 0.75, '#ffcf7a', 0.32 * k);
      if (phase === 'fuse' && fuseT > (R_ ? 0.2 : 1.1)) {
        phase = 'standing'; thought.sqV -= 4; ctx.progress(1);
        TM.after(() => resolve({ moves, ms: performance.now() - t0 }), R_ ? 200 : 800);
      }
    }
    for (const b of pieces) {
      b.scale = R_ ? 1 : approach(b.scale, 1, 4, dt);
      b.step(dt, R_);
      const s = G.sizes[b.i];
      block(b.x, b.y, s.w * b.scale, s.h * b.scale, 1, b.rot, 1 + b.sq * 0.5, 1 - b.sq * 0.5, phase !== 'pieces' ? 1 : 0);
      b.tag.at(b.x, b.y, 'center', clamp(b.scale * 1.4 - 0.4));
    }
    thought.step(dt, R_);
    thought.draw(g, { tension: phase === 'pieces' ? 0.55 - placed() * 0.12 : 0.1, calm: phase === 'standing' ? 0.75 : placed() * 0.15, blink: blinkAt(t, 0.8), lookX: phase === 'pieces' ? -0.6 : 0, lookY: 0.4 });
    motes.draw(g, dt);
    if (SHORT) wordsTag.at(G.A.x + 2, G.A.y + (wordsTag.h || 34) / 2, 'left', placed() || held ? 0 : 1);
    else wordsTag.at(thought.x, thought.y - R * 1.1 - 6, 'top', 1);
    // the finished staircase names itself on its open side (left of the treads: the pieces' column is empty by then)
    let left = Infinity;
    for (const q of G.treads) left = Math.min(left, q.x - q.w / 2);
    stepLabel.at(left - 12, G.treads[1].y, 'right', phase === 'standing' ? clamp(fuseT - 0.6) : 0);
    return true;
  }

  const onPiece = (b, x, y) => { const s = size(b); return Math.abs(x - b.x) < s.w / 2 + 8 && Math.abs(y - b.y) < s.h / 2 + 8; };
  function pointer(e) {
    if (e.type === 'down') {
      const b = phase === 'pieces' ? pieces.find((x) => onPiece(x, e.x, e.y)) : null;
      if (b && !held) { held = b; if (b.slot >= 0) b.slot = -1; b.grab(e); ctx.haptic('light'); return true; }
      if (thought.hit(e.x, e.y)) { thought.poke(e); ctx.haptic('light'); return true; }
      return false;
    }
    if (!held) return thought.pointer(e);
    if (e.type === 'move') { held.drag(e); return true; }
    if (e.type === 'up' || e.type === 'cancel') {
      const b = held; held = null;
      const p = b.drop(e);
      if (p && p.moved < 12 && e.t - p.t0 < 380) snap(b, pieces.some((x) => x !== b && x.slot === b.i) ? null : b.i);
      else snap(b);
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => thought.hit(x, y) || (phase === 'pieces' && pieces.some((b) => onPiece(b, x, y))),
    assist: step,
    bodies: () => {
      const G = geo();
      BL.begin().circle(thought.x, thought.y, R, 2);
      for (const q of G.treads) BL.box(q.x - q.w / 2, q.y - q.h / 2, q.x + q.w / 2, q.y + q.h / 2);
      for (const b of pieces) { const z = G.sizes[b.i]; BL.box(b.x - z.w / 2, b.y - z.h / 2, b.x + z.w / 2, b.y + z.h / 2); }
      return BL.end();
    },
    avoid: () => {
      const G = geo();
      AL.begin().circle(thought.x, thought.y, R * 1.3);
      for (const q of G.treads) AL.box(q.x - q.w / 2, q.y - q.h / 2, q.x + q.w / 2, q.y + q.h / 2);
      for (const r of ctx.tags.rects()) AL.box(r.left, r.top, r.right, r.bottom);
      return AL.end();
    },
    get settled() { return phase === 'standing'; },
    probe: () => { const G = geo(); return { pieces: pieces.filter((b) => b.slot < 0).map((b) => ({ x: b.x, y: b.y, i: b.i, row: startRow[b.i] })), treads: G.treads.map((q) => ({ x: q.x, y: q.y })), phase, steps: ctx.parts.steps }; },
    destroy() { TM.clear(); ctx.tags.clear(); thought.destroy?.(); },
  };
}
