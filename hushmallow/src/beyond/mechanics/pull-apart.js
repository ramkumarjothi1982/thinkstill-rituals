// Fact versus assumption: pull two connected Thought Mallows apart.
//
// The thought buds into two jellies stuck together by a gooey neck: one cool
// (what happened), one warm (what the mind added). Pull either with a finger,
// or both with two: the neck thins as it stretches and springs back if let go
// too soon. Past the point of release it lets go softly (never snaps), and the
// two settle on their own sides, each with one card: what happened, and what
// the mind added (a server scene's known_fact and possible_assumption, else the
// person's own words split by the authored engine). The two cards never say the
// same thing: a side with nothing real to show asks a question instead. Tap
// either jelly, or the assist pill, to ease them apart a step at a time.

import { drawGlow, clamp, lerp, dist, approach, rgba, mix, LIGHT, Motes, blinkAt, Timers, RectList, thoughtFor, familyOf, W2_TINT, WARM_FAMILIES } from './kit.js';
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
  const P = ctx.parts;
  // two Thought Mallows from one: what happened (plain, unfeeling) and what the mind added (the feeling's own jelly)
  // (the living jellies are wider than the kit's: a little smaller, so the neck between them shows)
  const F = thoughtFor(ctx, { x: from.x - 4, y: from.y, r: R, w2r: R * 0.84, light: LIGHT.fact[0], deep: LIGHT.fact[1], emotion: 'neutral', text: P.fact, tint: W2_TINT.fact });
  const G = thoughtFor(ctx, { x: from.x + 4, y: from.y, r: R, w2r: R * 0.84, light: LIGHT.guess[0], deep: LIGHT.guess[1], ...(WARM_FAMILIES.has(familyOf(ctx.emotion)) ? {} : { tint: W2_TINT.guess }) });
  // their colours: the living jellies' own tints when they are W2's, else the kit's fact and guess light
  const FC = F.w2?.style?.tint?.deep || LIGHT.fact[1], GC = G.w2?.style?.tint?.deep || LIGHT.guess[1];
  const BL = new RectList(), AL = new RectList();
  F.scale = G.scale = rm() ? 1 : 0.6;
  let phase = 'bud';        // bud → joined → letting → apart
  let stepK = 0;            // tap/assist steps (0..3)
  let let0 = 0, moves = 0, t0 = performance.now();
  let releaseD = 0, restD = 0;
  const half = Math.round(Math.min(200, A0.w / 2 - 8));
  const tags = {
    words: ctx.tags.add(P.excerpt, { kind: 'words' }),
    // one card a side (title + line): half as many boxes to place, and they can never be read as one
    fact: ctx.tags.add(P.fact, { kind: 'card', title: L.labels.fact, colour: FC, max: half, cls: P.factAsk ? 'ask' : '', priority: 2 }),
    guess: ctx.tags.add(P.guess, { kind: 'card', title: L.labels.guess, colour: GC, max: half, cls: P.guessAsk ? 'ask' : '', priority: 2 }),
  };
  const neckGrads = new Map();   // the neck's gradient, cached per length (drawn in the pair's own frame)
  let labelK = 0;

  function homes() {
    const A = ctx.area();
    restD = R * 1.08;
    releaseD = Math.min(A.w * 0.64, R * 5.4);
    const cy = clamp(from.y, A.y + R * 1.6, A.y + A.h - R * 2.6);
    const cx = A.x + A.w / 2;
    if (phase === 'apart') {
      // high in the area, so each card has the room below its jelly
      F.hx = A.x + A.w * 0.25; G.hx = A.x + A.w * 0.75; F.hy = G.hy = Math.min(cy - R * 0.2, A.y + R * 1.25);
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
    motes.burst(mx, my, FC, 7, { speed: 50, size: 2.6 });
    motes.burst(mx, my, GC, 7, { speed: 50, size: 2.6 });
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
  function neckGradient(d) {
    const key = Math.max(6, Math.round(d / 6) * 6);
    let gr = neckGrads.get(key);
    if (!gr) {
      gr = g.createLinearGradient(0, 0, key, 0);
      gr.addColorStop(0, rgba(FC, 0.8)); gr.addColorStop(0.5, rgba(mix(mix(FC, GC, 0.5), '#ffffff', 0.25), 0.72)); gr.addColorStop(1, rgba(GC, 0.8));
      if (neckGrads.size > 96) neckGrads.clear();
      neckGrads.set(key, gr);
    }
    return gr;
  }
  // drawn in the pair's own frame (F at the origin, G along +x), so one cached gradient serves every angle
  function drawNeck(k, alpha) {
    const dx = G.x - F.x, dy = G.y - F.y, d = Math.hypot(dx, dy) || 1;
    const w = lerp(R * 0.66, R * 0.07, k ** 0.8);
    const fa = R * 0.62 * F.scale, ga = R * 0.62 * G.scale;
    g.save();
    g.translate(F.x, F.y);
    g.rotate(Math.atan2(dy, dx));
    g.globalAlpha = alpha;
    g.fillStyle = neckGradient(d);
    g.beginPath();
    g.moveTo(0, fa);
    g.quadraticCurveTo(d / 2, w, d, ga);
    g.lineTo(d, -ga);
    g.quadraticCurveTo(d / 2, -w, 0, -fa);
    g.closePath();
    g.fill();
    // a thin highlight along the top of the neck
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, -fa); g.quadraticCurveTo(d / 2, -w * 0.8, d, -ga); g.stroke();
    g.restore();
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
      F.hx = clamp(F.hx, A.x + R, A.x + A.w - R); F.hy = clamp(F.hy, A.y + R, A.y + A.h - R * 1.6);
      G.hx = clamp(G.hx, A.x + R, A.x + A.w - R); G.hy = clamp(G.hy, A.y + R, A.y + A.h - R * 1.6);
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

    // words: one tag under the pair while joined; a card under each half once apart
    labelK = R_ ? (phase === 'apart' ? 1 : 0) : approach(labelK, phase === 'apart' ? 1 : 0, 4, dt);
    const below = Math.max(F.y, G.y) + R * 1.12 + 6;
    tags.words.at((F.x + G.x) / 2, below, 'bottom', 1 - labelK);
    tags.fact.at(F.x, F.y + R * 1.06 + 6, 'bottom', labelK);
    tags.guess.at(G.x, G.y + R * 1.06 + 6, 'bottom', labelK);
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
      if (!b || phase === 'apart') { if (b) { b.poke(e); ctx.haptic('light'); } return !!b; }
      if (phase === 'bud') phase = 'joined';
      if (!b || b.press) return true;
      b.grab(e);
      ctx.haptic('light');
      return true;
    }
    if (e.type === 'move') { const a = F.drag(e), b = G.drag(e); if (a || b) { ctx.progress(progress()); ctx.kick(); } return a || b; }
    if (e.type === 'up' || e.type === 'cancel') {
      // a finger only pressing a jelly (no carry) lets it go
      F.pointer(e); G.pointer(e);
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
    bodies: () => BL.begin().circle(F.x, F.y, R * F.scale, 2).circle(G.x, G.y, R * G.scale, 2).end(),
    avoid: () => { AL.begin().circle(F.x, F.y, R * 1.25).circle(G.x, G.y, R * 1.25); for (const r of ctx.tags.rects()) AL.box(r.left, r.top, r.right, r.bottom); return AL.end(); },
    get settled() { return phase === 'apart'; },
    probe: () => ({ a: { x: F.x, y: F.y }, b: { x: G.x, y: G.y }, phase }),
    destroy() { TM.clear(); ctx.tags.clear(); F.destroy?.(); G.destroy?.(); },
  };
}
