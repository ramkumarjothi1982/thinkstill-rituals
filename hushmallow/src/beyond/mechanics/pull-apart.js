// Fact versus assumption: pull two connected Thought Mallows apart.
//
// The thought buds into two jellies stuck together by a gooey neck: one cool
// (what happened), one warm (what the mind added). Pull either with a finger,
// or both with two: the neck thins as it stretches and springs back if let go
// too soon. Past the point of release it lets go softly (never snaps), and the
// two settle on their own sides with their labels. Tap either jelly, or the
// assist pill, to ease them apart a step at a time.

import { Blob, drawGlow, clamp, lerp, dist, approach, rgba, LIGHT, Motes, blinkAt, circleRect, Timers } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'pull_apart';

export function mount(ctx) {
  const L = MECHANIC_LINES[id];
  const g = ctx.g;
  const rm = () => ctx.reducedMotion();
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const TM = new Timers();
  const motes = new Motes(36);
  const A0 = ctx.area();
  const R = clamp(Math.min(A0.w, A0.h) * 0.14, 28, 48);
  const from = ctx.from || { x: A0.x + A0.w / 2, y: A0.y + A0.h * 0.5, r: R };
  const F = new Blob({ x: from.x - 4, y: from.y, r: R, light: LIGHT.fact[0], deep: LIGHT.fact[1] });
  const G = new Blob({ x: from.x + 4, y: from.y, r: R, light: LIGHT.guess[0], deep: LIGHT.guess[1] });
  F.scale = G.scale = rm() ? 1 : 0.6;
  let phase = 'bud';        // bud → joined → letting → apart
  let stepK = 0;            // tap/assist steps (0..3)
  let let0 = 0, moves = 0, t0 = performance.now();
  let releaseD = 0, restD = 0;
  const tags = {
    words: ctx.tags.add(ctx.parts.excerpt, { kind: 'words' }),
    factL: ctx.tags.add(L.labels.fact, { kind: 'label', colour: LIGHT.fact[1] }),
    guessL: ctx.tags.add(L.labels.guess, { kind: 'label', colour: LIGHT.guess[1] }),
    factW: ctx.tags.add(ctx.parts.fact, { kind: 'line', max: Math.round(Math.min(190, A0.w / 2 - 14)) }),
    guessW: ctx.parts.guess ? ctx.tags.add(ctx.parts.guess, { kind: 'line', max: Math.round(Math.min(190, A0.w / 2 - 14)) }) : null,
  };
  let labelK = 0;

  function homes() {
    const A = ctx.area();
    restD = R * 1.08;
    releaseD = Math.min(A.w * 0.64, R * 5.4);
    const cy = clamp(from.y, A.y + R * 1.6, A.y + A.h - R * 2.6);
    const cx = A.x + A.w / 2;
    if (phase === 'apart') {
      F.hx = A.x + A.w * 0.25; G.hx = A.x + A.w * 0.75; F.hy = G.hy = cy - R * 0.2;
      return;
    }
    const d = restD + (releaseD - restD) * (stepK / 3);
    if (!F.press) { F.hx = cx - d / 2; F.hy = cy; }
    if (!G.press) { G.hx = cx + d / 2; G.hy = cy; }
  }
  homes();
  if (rm()) { F.x = F.hx; F.y = F.hy; G.x = G.hx; G.y = G.hy; }

  const separation = () => dist(F.x, F.y, G.x, G.y);
  const progress = () => clamp((separation() - restD) / (releaseD - restD));

  function letGo() {
    if (phase !== 'joined') return;
    phase = 'letting'; let0 = 0;
    F.drop(); G.drop();
    ctx.haptic('soft');
    ctx.fx('separate', { intensity: 0.6 });
    const mx = (F.x + G.x) / 2, my = (F.y + G.y) / 2;
    motes.burst(mx, my, LIGHT.fact[1], 7, { speed: 50, size: 2.6 });
    motes.burst(mx, my, LIGHT.guess[1], 7, { speed: 50, size: 2.6 });
    ctx.progress(1);
  }

  function step() {
    if (phase === 'bud') phase = 'joined';
    if (phase !== 'joined') return;
    stepK = Math.min(3, stepK + 1);
    moves++;
    F.sqV += 2; G.sqV += 2;
    ctx.haptic('light');
    homes();
    ctx.progress(stepK / 3);
    if (stepK >= 3) TM.after(letGo, rm() ? 60 : 420);
  }

  // the neck between the two lobes: two concave curves, pinched as it stretches
  function drawNeck(k, alpha) {
    const dx = G.x - F.x, dy = G.y - F.y, d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const w = lerp(R * 0.66, R * 0.07, k ** 0.8);
    const mx = (F.x + G.x) / 2, my = (F.y + G.y) / 2;
    const a1x = F.x + nx * R * 0.62 * F.scale, a1y = F.y + ny * R * 0.62 * F.scale;
    const a2x = F.x - nx * R * 0.62 * F.scale, a2y = F.y - ny * R * 0.62 * F.scale;
    const b1x = G.x + nx * R * 0.62 * G.scale, b1y = G.y + ny * R * 0.62 * G.scale;
    const b2x = G.x - nx * R * 0.62 * G.scale, b2y = G.y - ny * R * 0.62 * G.scale;
    const gr = g.createLinearGradient(F.x, F.y, G.x, G.y);
    gr.addColorStop(0, rgba(LIGHT.fact[1], 0.8)); gr.addColorStop(0.5, rgba('#c99cf2', 0.72)); gr.addColorStop(1, rgba(LIGHT.guess[1], 0.8));
    g.globalAlpha = alpha;
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(a1x, a1y);
    g.quadraticCurveTo(mx + nx * w, my + ny * w, b1x, b1y);
    g.lineTo(b2x, b2y);
    g.quadraticCurveTo(mx - nx * w, my - ny * w, a2x, a2y);
    g.closePath();
    g.fill();
    // a thin highlight along the top of the neck
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(a1x, a1y); g.quadraticCurveTo(mx + nx * w * 0.8, my + ny * w * 0.8, b1x, b1y); g.stroke();
    g.globalAlpha = 1;
  }

  function frame(dt, t) {
    TM.step(dt);
    const A = ctx.area();
    const R_ = rm();
    if (phase === 'bud') {
      // the thought buds into two lobes
      F.scale = approach(F.scale, 1, 5, dt); G.scale = approach(G.scale, 1, 5, dt);
      if (F.scale > 0.97 || R_) { F.scale = G.scale = 1; phase = 'joined'; }
    }
    homes();
    // a held lobe tugs the other along a little through the neck (it's sticky)
    if (phase === 'joined') {
      const k = progress();
      if (F.press && !G.press) { G.hx = lerp(G.hx, F.x + (G.hx - F.x) * 0.92, 0.15 * (1 - k)); }
      if (G.press && !F.press) { F.hx = lerp(F.hx, G.x + (F.hx - G.x) * 0.92, 0.15 * (1 - k)); }
      // keep inside the play area
      for (const b of [F, G]) { b.hx = clamp(b.hx, A.x + R, A.x + A.w - R); b.hy = clamp(b.hy, A.y + R, A.y + A.h - R * 1.6); }
      if ((F.press || G.press) && separation() > releaseD) letGo();
    }
    F.step(dt, R_); G.step(dt, R_);
    const k = phase === 'joined' || phase === 'bud' ? progress() : 1;
    // light pooling behind
    drawGlow(g, (F.x + G.x) / 2, (F.y + G.y) / 2, R * 3.2, '#7a4dff', 0.22);
    if (phase === 'bud' || phase === 'joined') drawNeck(k, 1);
    if (phase === 'letting') {
      let0 += dt;
      const fade = clamp(1 - let0 / (R_ ? 0.2 : 0.7));
      if (fade > 0) drawNeck(0.97 + 0.03 * (1 - fade), fade);
      if (let0 > (R_ ? 0.25 : 0.75)) {
        phase = 'apart'; homes();
        TM.after(() => { ctx.haptic('success'); resolve({ moves, ms: performance.now() - t0 }); }, R_ ? 200 : 700);
      }
    }
    const tense = phase === 'apart' || phase === 'letting' ? 0.15 : 0.55 + k * 0.35;
    const calm = phase === 'apart' ? 0.65 : 0;
    F.draw(g, { tension: tense, calm, blink: blinkAt(t, 0.3), lookX: phase === 'apart' ? -0.3 : 0.6, press: F.press ? 1 : 0, surprise: phase === 'letting' ? 0.6 : 0 });
    G.draw(g, { tension: tense, calm, blink: blinkAt(t, 1.7), lookX: phase === 'apart' ? 0.3 : -0.6, press: G.press ? 1 : 0, surprise: phase === 'letting' ? 0.6 : 0 });
    motes.draw(g, dt);

    // words: one tag under the pair while joined; two labelled halves once apart
    labelK = approach(labelK, phase === 'apart' ? 1 : 0, 4, dt);
    const below = Math.max(F.y, G.y) + R * 1.12 + 6;
    tags.words.at((F.x + G.x) / 2, below, 'bottom', 1 - labelK);
    tags.factL.at(F.x, F.y - R * 1.18 - 4, 'top', labelK);
    tags.guessL.at(G.x, G.y - R * 1.18 - 4, 'top', labelK);
    tags.factW.at(F.x, F.y + R * 1.12 + 6, 'bottom', labelK);
    tags.guessW?.at(G.x, G.y + R * 1.12 + 6, 'bottom', labelK);
    return true;
  }

  function pointer(e) {
    if (phase === 'letting') return true;
    if (e.type === 'down') {
      // the nearer lobe takes the finger (they overlap while joined); a second finger takes the other one
      const dF = F.hit(e.x, e.y) ? Math.hypot(e.x - F.x, e.y - F.y) : Infinity;
      const dG = G.hit(e.x, e.y) ? Math.hypot(e.x - G.x, e.y - G.y) : Infinity;
      let b = dF === Infinity && dG === Infinity ? null : dF <= dG ? F : G;
      if (b && b.press) b = b === F ? (dG < Infinity ? G : null) : (dF < Infinity ? F : null);
      if (!b || phase === 'apart') { if (b) { b.sqV += 2.4; ctx.haptic('light'); } return !!b; }
      if (phase === 'bud') phase = 'joined';
      if (!b || b.press) return true;
      b.grab(e);
      ctx.haptic('light');
      return true;
    }
    if (e.type === 'move') { const a = F.drag(e), b = G.drag(e); if (a || b) { ctx.progress(progress()); ctx.kick(); } return a || b; }
    if (e.type === 'up' || e.type === 'cancel') {
      for (const b of [F, G]) {
        const p = b.drop(e);
        if (!p) continue;
        moves++;
        // a tap (no real move) eases them apart one step
        if (p.moved < 12 && (e.t || performance.now()) - p.t0 < 400) step();
        else if (phase === 'joined') { b.sqV += 1.2; ctx.haptic('light'); }
        homes();
      }
      return true;
    }
    return false;
  }

  return {
    id,
    frame, pointer, done,
    hitTest: (x, y) => F.hit(x, y, 1.6) || G.hit(x, y, 1.6),
    assist: () => { if (phase !== 'apart') step(); },
    avoid: () => [circleRect(F.x, F.y, R * 1.25), circleRect(G.x, G.y, R * 1.25), ...ctx.tags.rects()],
    get settled() { return phase === 'apart'; },
    probe: () => ({ a: { x: F.x, y: F.y }, b: { x: G.x, y: G.y }, phase }),
    destroy() { TM.clear(); ctx.tags.clear(); },
  };
}
