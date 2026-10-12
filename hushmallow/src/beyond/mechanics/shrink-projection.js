// Catastrophising: slowly resize an exaggerated future projection.
//
// The small thought throws a huge projection of itself, like a shadow-play
// lantern: a looming, trembling jelly labelled "The worst case". Pinch it
// with two fingers, or drag down on it with one, to bring it back toward life
// size. It only shrinks when moved slowly: a rushed pinch puffs it back up a
// little (the brief's "slowly"). Near life size it condenses into a second
// small jelly beside the first: "One possibility". Tap, or the assist pill,
// shrinks it one calm step at a time.

import { Blob, drawGlow, drawJelly, clamp, lerp, approach, rgba, mix, LIGHT, Motes, blinkAt, circleRect, tintFor, Timers } from './kit.js';
import { MECHANIC_LINES } from '../lines.js';

export const id = 'shrink_projection';

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
  const R = clamp(Math.min(A0.w, A0.h) * 0.11, 24, 40);
  const from = ctx.from || { x: A0.x + A0.w * 0.28, y: A0.y + A0.h * 0.78 };
  const thought = new Blob({ x: from.x, y: from.y, r: R, light, deep });
  const maxS = () => { const A = ctx.area(); return clamp(Math.min(A.w * 0.46, A.h * 0.44) / R, 2.2, 4.4); };
  let S = rm() ? maxS() : 1.2;    // projection scale (× R); grows in at mount
  let target = maxS();
  let grown = rm();
  let phase = 'project';           // project → condensing → settled
  let pinch = null;                // { ids, d0, s0 }
  let drag = null;                 // { id, y, s0 }
  let warned = false, condenseT = 0, moves = 0;
  const t0 = performance.now();
  const small = new Blob({ x: 0, y: 0, r: R, light: LIGHT.calm[0], deep: LIGHT.calm[1] });
  small.scale = 0;
  const tags = {
    big: ctx.tags.add(L.labels.big, { kind: 'label', colour: '#a98cff' }),
    words: ctx.tags.add(ctx.parts.excerpt, { kind: 'words' }),
    small: ctx.tags.add(L.labels.small, { kind: 'label', colour: LIGHT.calm[1] }),
  };
  const pointers = new Map();

  function anchor() {
    const A = ctx.area();
    thought.hx = A.x + A.w * 0.24; thought.hy = A.y + A.h - R * 1.15 - 56;
    return { px: A.x + A.w * 0.58, py: A.y + A.h * 0.42 };
  }
  anchor();
  if (rm()) { thought.x = thought.hx; thought.y = thought.hy; }

  const progress = () => clamp((maxS() - S) / (maxS() - 1));
  /** Change the scale by ds, honouring "slowly": fast changes are resisted. */
  function nudge(ds, speed) {
    if (phase !== 'project' || !grown) return;
    let k = 1;
    if (speed > 520) {
      k = -0.35;   // rushed: it puffs back a little
      if (!warned) { warned = true; ctx.hint(L.slow); ctx.haptic('light'); }
    } else if (speed > 300) k = 1 - (speed - 300) / 220;
    target = clamp(target + ds * k, 1, maxS());
    ctx.progress(progress());
    if (target <= 1.12) condense();
  }
  function condense() {
    if (phase !== 'project') return;
    phase = 'condensing'; condenseT = 0;
    ctx.haptic('soft'); ctx.fx('settle', { intensity: 0.6 });
    const { px, py } = anchor();
    small.x = px; small.y = py; small.scale = 1.1;
    ctx.progress(1);
  }
  function step() {
    if (phase !== 'project') return;
    if (!grown) { grown = true; S = target = maxS(); }
    moves++;
    target = clamp(target - (maxS() - 1) / 3 - 0.01, 1, maxS());
    ctx.haptic('light');
    ctx.progress(progress());
    if (target <= 1.12) TM.after(condense, rm() ? 60 : 900);
  }

  function frame(dt, t) {
    TM.step(dt);
    const R_ = rm();
    const { px, py } = anchor();
    if (!grown) { S = approach(S, maxS(), 2.4, dt); if (S > maxS() - 0.05) { S = maxS(); grown = true; target = S; } }
    else if (phase === 'project') S = R_ ? target : approach(S, target, 2.2, dt);
    thought.step(dt, R_);
    const k = progress();
    const big = S * R;
    // the lantern beam: from the small thought up to its projection
    if (phase !== 'settled') {
      const a = phase === 'condensing' ? clamp(1 - condenseT / 0.9) : 1;
      const gr = g.createLinearGradient(thought.x, thought.y, px, py);
      gr.addColorStop(0, rgba(light, 0.32 * a)); gr.addColorStop(1, rgba('#7f6bd8', 0.04 * a));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(thought.x - R * 0.35, thought.y - R * 0.5);
      g.lineTo(px - big * 0.9, py + big * 0.25);
      g.lineTo(px + big * 0.55, py - big * 0.95);
      g.lineTo(thought.x + R * 0.35, thought.y - R * 0.7);
      g.closePath(); g.fill();
    }
    // the projection: a big, trembling, shadowy jelly (calmer and warmer as it shrinks)
    if (phase === 'project' || phase === 'condensing') {
      const a = phase === 'condensing' ? clamp(1 - condenseT / 0.7) : 1;
      const shake = R_ ? 0 : (1 - k) * 2.2;
      const jx = shake ? Math.sin(t * 23) * shake : 0, jy = shake ? Math.cos(t * 19) * shake : 0;
      const tone = mix('#241a5c', deep, k * 0.6);
      // a looming storm-shadow: dark halo, the jelly itself, and a slow cloud of shade moving inside it
      drawGlow(g, px, py, big * 1.7, '#1d1050', 0.7 * a * (1 - k * 0.6));
      drawGlow(g, px, py, big * 1.35, '#5a3fd0', 0.32 * a * (1 - k * 0.5));
      drawJelly(g, { x: px + jx, y: py + jy, r: big, sx: 1 + Math.sin(t * 1.3) * 0.02 * (1 - k), sy: 1 - Math.sin(t * 1.3) * 0.02 * (1 - k),
        light: mix('#6d5fc4', light, k * 0.7), deep: tone, alpha: (0.78 + k * 0.15) * a, glow: 0,
        face: { tension: 0.95 - k * 0.6, sad: 0.2, cross: 0.1 * (1 - k), surprise: 0, blink: blinkAt(t, 2.1, 5.3) }, faceAlpha: 0.55 + k * 0.4 });
      if (!R_ && k < 0.9) for (let c = 0; c < 3; c++) {
        const ca = t * (0.25 + c * 0.11) + c * 2.1;
        drawGlow(g, px + Math.cos(ca) * big * 0.42, py + Math.sin(ca * 1.3) * big * 0.35, big * 0.55, '#120a30', 0.28 * a * (1 - k));
      }
      // the rim flickers like candle-light (slow, never a flash)
      g.globalAlpha = 0.18 * a * (1 - k);
      g.strokeStyle = '#c7b6ff'; g.lineWidth = 2;
      g.beginPath(); g.arc(px + jx, py + jy, big * (1.04 + 0.015 * Math.sin(t * 3.1)), 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
      if (phase === 'condensing') {
        condenseT += dt;
        small.hx = thought.hx + R * 2.6; small.hy = thought.hy - R * 0.1;
        if (condenseT > (R_ ? 0.1 : 0.7)) {
          phase = 'settled';
          motes.burst(small.hx, small.hy, LIGHT.calm[1], 8, { speed: 40, size: 2.4 });
          TM.after(() => { ctx.haptic('success'); resolve({ moves, ms: performance.now() - t0 }); }, R_ ? 200 : 650);
        }
      }
    }
    if (phase === 'condensing' || phase === 'settled') {
      small.scale = approach(small.scale, 1, 4, dt);
      small.step(dt, R_);
      small.draw(g, { tension: 0.2, calm: 0.6, blink: blinkAt(t, 0.9), lookX: -0.4 });
    }
    thought.draw(g, { tension: 0.85 - k * 0.6, calm: phase === 'settled' ? 0.6 : k * 0.4, sad: 0.2, blink: blinkAt(t, 0.2), lookX: 0.5, lookY: -0.6 * (1 - k) });
    motes.draw(g, dt);
    // labels
    const labelA = phase === 'project' ? 1 : phase === 'condensing' ? clamp(1 - condenseT / 0.5) : 0;
    // the label sits inside the projection's upper rim (above it there is only the subtitle band)
    tags.big.at(px, py - big * 0.86, 'top', labelA * (grown ? 1 : 0.4));
    tags.words.at(thought.x, thought.y + R * 1.1 + 6, 'bottom', 1);
    tags.small.at(small.x, small.y - R * 1.15 - 4, 'top', phase === 'settled' ? 1 : 0);
    return true;
  }

  function pointer(e) {
    const { px, py } = anchor();
    const onBig = (x, y) => Math.hypot(x - px, y - py) < S * R * 1.05;
    if (e.type === 'down') {
      if (thought.hit(e.x, e.y)) { thought.sqV += 2.4; ctx.haptic('light'); return true; }
      if (phase !== 'project' || !onBig(e.x, e.y)) return false;
      pointers.set(e.id, { x: e.x, y: e.y, t: e.t, x0: e.x, y0: e.y, t0: e.t });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), s0: target, last: e.t };
        drag = null;
      } else drag = { id: e.id, y: e.y, s0: target, t: e.t };
      return true;
    }
    const p = pointers.get(e.id);
    if (!p) return false;
    if (e.type === 'move') {
      const dt = Math.max(1, e.t - p.t) / 1000;
      const sp = Math.hypot(e.x - p.x, e.y - p.y) / dt;
      p.x = e.x; p.y = e.y; p.t = e.t;
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const want = clamp(pinch.s0 * (d / Math.max(20, pinch.d0)), 1, maxS());
        nudge(want - target, sp);
      } else if (drag && drag.id === e.id) {
        const dy = e.y - drag.y; drag.y = e.y;
        if (dy > 0) nudge(-dy / 110, sp);
      }
      return true;
    }
    if (e.type === 'up' || e.type === 'cancel') {
      pointers.delete(e.id);
      moves++;
      if (Math.hypot(e.x - p.x0, e.y - p.y0) < 12 && e.t - p.t0 < 380 && !pinch) step();
      if (pointers.size < 2) pinch = null;
      if (drag?.id === e.id) drag = null;
      return true;
    }
    return false;
  }

  return {
    id, frame, pointer, done,
    hitTest: (x, y) => { const { px, py } = anchor(); return thought.hit(x, y) || (phase === 'project' && Math.hypot(x - px, y - py) < S * R * 1.05); },
    assist: step,
    avoid: () => { const { px, py } = anchor(); return [circleRect(thought.x, thought.y, R * 1.3), phase === 'settled' ? circleRect(small.x, small.y, R * 1.3) : circleRect(px, py, S * R * 0.8), ...ctx.tags.rects()]; },
    get settled() { return phase === 'settled'; },
    probe: () => { const { px, py } = anchor(); return { big: { x: px, y: py, r: S * R }, thought: { x: thought.x, y: thought.y }, phase, S }; },
    destroy() { TM.clear(); ctx.tags.clear(); },
  };
}
