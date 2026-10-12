// GE-01 · MOLTEN TEMPO — molten-rim dial (rotary dial).
// Touch the copper notch at two o'clock and turn the rim anticlockwise until
// the spark trail runs slowly. Rushing makes the rim lag and the sparks flare;
// a slow turn is followed exactly, and the sparks gather into one amber line
// behind your fingertip. Win: the copper notch rests inside the quiet blue arc.
//
// Photos ride the dial as heated medallions; each one cools (ember → its own
// natural colours with a soft blue mist) as you turn it through the quiet
// blue arc, then rises as a calm lantern at the finale. Words sit in the
// glass hub: flickering ember ink that steadies into calm light.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, orb, arcText, noise2, angDiff, spiral, roundRect } from '../fx.js';
import { AngleTracker } from '../kit.js';

export const meta = {
  id: 'GE-01',
  howTo: 'Touch the copper notch and turn the rim slowly anticlockwise.',
  steps: ['Touch the copper notch at two o’clock.', 'Turn the rim anticlockwise — slowly. Rushing makes it drag.', 'Keep going until the notch rests in the quiet blue arc.'],
  tapAlt: 'each press turns the rim one slow notch',
  words: 'Your words glow in the dial’s glass hub — flickering ember ink that steadies as you slow down.',
  photos: {
    where: 'Your photos ride the dial as glowing medallions.',
    becomes: 'heated ember medallions',
    touch: 'You turn them with the rim;',
    change: 'each one cools back to its own colours with a soft blue mist as it passes through the quiet blue arc.',
    payoff: 'At the end they rise and hang as calm lanterns around the arc.',
  },
  finaleSec: 4,
};

const START = -Math.PI / 6;          // the notch starts at two o'clock
const TURN = TAU * 1.25;             // anticlockwise travel to the win
const ARC_W = 0.34;                  // half-width of the quiet blue arc (rad)

export function create(E) {
  const { g, stage, photos, words } = E;
  const nz = noise2(E.seed + 11);
  const reduced = E.reduced;
  let R, cx, cy;
  const fit = () => { R = Math.min(stage.w * 0.43, stage.h * 0.4); cx = stage.cx; cy = stage.cy + stage.h * 0.02; };
  fit();
  E.onResize(fit);

  // ---- state
  let wanted = 0;           // rotation the input asks for (rad, anticlockwise positive)
  let rot = 0;              // rotation actually allowed (after the world law)
  let shownRot = 0;         // eased display value
  let assistTo = null;
  let drag = null;          // pointer id
  let rush = 0;             // 0..1 how much the person is rushing
  let lastTick = 0;
  let doneFlag = false;
  let finAt = -1;
  let clockSpeed = 2.6, clockA = 0, clockCalm = false, spinA = 0;
  const tracker = new AngleTracker();
  const arcCentre = START - TURN;    // where the notch ends (fixed in space)

  const sparks = Array.from({ length: reduced ? 16 : 34 }, (_, i) => ({ a: (i / 34) * TAU + E.rand() * 0.3, m: 0.7 + E.rand() * 0.6, r: 0.92 + E.rand() * 0.07 }));
  // medallion slots: photos evenly spread, embers in between
  const n = photos.n, K = Math.max(6, n);
  const slot = Array.from({ length: K }, () => -1);
  if (n) for (let j = 0; j < n; j++) slot[Math.round((j * K) / n) % K] = j;
  const meds = slot.map((ph, i) => ({ ph, base: (i / K) * TAU - Math.PI / 2, cool: 0, cooling: false, done: false, lift: 0 }));

  const progress = () => clamp(rot / TURN);
  const notchAngle = (r = shownRot) => START - r;

  function applyInput(dA, dt) {
    // anticlockwise on screen = negative angle change
    const want = -dA;
    const speed = Math.abs(dA) / Math.max(1 / 120, dt);
    const k = lerp(1, 0.3, invLerp(2.6, 8, speed));        // rushing → the rim drags
    rush = lerp(rush, invLerp(2.6, 7, speed), 0.25);
    wanted = clamp(wanted + want * k, 0, TURN);
    wanted = Math.min(wanted, rot + 0.18);                   // can't bank turns past the law
  }

  function frame(dt, t) {
    // ---- simulation
    if (assistTo != null) { const step = Math.min(assistTo - wanted, dt * 1.6); wanted = Math.min(TURN, wanted + Math.max(0, step)); if (assistTo - wanted < 1e-3) assistTo = null; }
    const p = E.gate(wanted / TURN);
    rot = p * TURN;
    if (wanted > rot + 0.18) wanted = rot + 0.18;
    shownRot = lerp(shownRot, rot, 1 - Math.exp(-dt * 14));
    if (!drag) rush = Math.max(0, rush - dt * 1.5);
    const prog = clamp(shownRot / TURN), calm = smooth(prog);
    // tick sound + haptic every ~12° of real rotation
    if (Math.abs(rot - lastTick) > 0.21) { lastTick = rot; E.sound('rotate-tick', { pitch: lerp(1.25, 0.8, calm), intensity: 0.35 }); }
    if (!doneFlag && rot >= TURN * 0.998 && !drag && assistTo == null) { doneFlag = true; E.sound('settle', { intensity: 0.5 }); }
    // medallions cool as they pass under the quiet blue arc
    for (const md of meds) {
      const a = md.base - shownRot;
      if (!md.done && !md.cooling && Math.abs(angDiff(a, arcCentre)) < ARC_W * 0.8 && rot > 0.05) {
        md.cooling = true;
        const pos = medPos(md);
        if (md.ph >= 0) { photos.dust(md.ph, pos.x, pos.y, medSize(), 14, { shape: 'circle', up: 34, speed: 26 }); E.checkpoint('photo', md.ph); }
        E.particles.burst(pos.x, pos.y, reduced ? 4 : 10, { speed: 50, colour: '#bfe6ff', life: 1.2, size: 7 });
        E.sound('glass', { note: (meds.indexOf(md) % 6) + 2, intensity: 0.4 });
        E.haptic('light');
      }
      if (md.cooling && !md.done) { md.cool = Math.min(1, md.cool + dt / 0.9); if (md.cool >= 1) md.done = true; }
    }
    clockA += clockSpeed * dt;
    const clockTarget = clockCalm ? 0.12 + Math.abs(rot - shownRot) * 4 : lerp(2.6, 0.9, calm);
    clockSpeed = lerp(clockSpeed, clockTarget, 1 - Math.exp(-dt * (clockCalm ? 1.2 : 0.6)));
    if (finAt >= 0) for (const md of meds) md.lift = Math.min(1, md.lift + dt / 1.6);

    // ---- drawing
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.2)) : 0;
    spinA += dt * lerp(1.4, 0.18, calm) * (reduced ? 0.3 : 1);
    spiral(g, cx, cy, R * 0.78, spinA, mix('#ff6a2a', '#7cc8ff', calm), { arms: 3, turns: 1.6, alpha: 0.1 + 0.06 * (1 - calm), width: 1.4 });
    drawClock(t, calm);
    drawBlueArc(t, prog, fin);
    drawRim(t, calm, fin);
    drawMedallions(t, calm, fin);
    drawHub(t, calm, fin);
    drawSparks(dt, t, calm, fin);
    drawNotch(t, calm, fin);
  }

  // ------------------------------------------------------------ drawing --
  function drawClock(t, calm) {
    g.save(); g.translate(cx, cy); g.rotate(clockA);
    g.strokeStyle = rgba('#ffffff', 0.12 + 0.1 * (1 - calm)); g.lineWidth = 1.2;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, r0 = R * 1.14, r1 = R * (i % 5 ? 1.18 : 1.22);
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
    }
    g.restore();
  }
  function drawBlueArc(t, prog, fin) {
    const near = smooth(invLerp(0.55, 1, prog));
    g.save(); g.lineCap = 'round'; g.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[R * 0.22, 0.08], [R * 0.1, 0.22], [R * 0.035, 0.75]]) {
      g.strokeStyle = rgba('#7cc8ff', (a + near * a * 0.8 + fin * a) * (0.85 + 0.15 * Math.sin(t * 1.3)));
      g.lineWidth = w; g.beginPath(); g.arc(cx, cy, R * 1.065, arcCentre - ARC_W, arcCentre + ARC_W); g.stroke();
    }
    g.restore();
  }
  function drawRim(t, calm, fin) {
    // dark copper body
    const gr = g.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.04);
    gr.addColorStop(0, '#2a120c'); gr.addColorStop(0.45, mix('#6a2a12', '#5a3a2a', calm)); gr.addColorStop(1, '#1a0a08');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 1.03, 0, TAU); g.arc(cx, cy, R * 0.8, 0, TAU, true); g.fill();
    // molten flow: a conic band coloured by drifting noise; cools with the turn
    const flow = t * lerp(1.6, 0.25, calm) + shownRot * 0.6;
    const N = 28;
    const colAt = (i) => {
      const a = (i / N) * TAU;
      const v = nz(Math.cos(a) * 1.6 + flow, Math.sin(a) * 1.6 - flow * 0.4) * 0.5 + 0.5;
      const hot = mix('#e8320c', '#ffc65a', v), cool = mix('#c9662a', '#ffd9a0', v);
      return [mix(mix(hot, cool, calm), '#ffe4b0', fin * 0.6), v];
    };
    if (g.createConicGradient) {
      const cg = g.createConicGradient(-shownRot, cx, cy);
      for (let i = 0; i <= N; i++) { const [c, v] = colAt(i % N); cg.addColorStop(i / N, rgba(c, 0.55 + 0.45 * v)); }
      g.strokeStyle = cg; g.lineWidth = R * 0.15; g.beginPath(); g.arc(cx, cy, R * 0.915, 0, TAU); g.stroke();
      // bright molten core line + soft bloom
      g.save(); g.globalCompositeOperation = 'lighter';
      g.lineWidth = R * 0.045; g.globalAlpha = lerp(0.55, 0.35, calm); g.beginPath(); g.arc(cx, cy, R * 0.915, 0, TAU); g.stroke();
      g.restore();
    } else {
      const SEG = 48;
      for (let i = 0; i < SEG; i++) { const [c, v] = colAt(Math.floor(i * N / SEG)); g.strokeStyle = rgba(c, 0.55 + 0.45 * v); g.lineWidth = R * 0.15; g.beginPath(); g.arc(cx, cy, R * 0.915, (i / SEG) * TAU - shownRot, ((i + 1.02) / SEG) * TAU - shownRot); g.stroke(); }
    }
    // cooling cracks of dark crust drifting over the molten band
    g.save(); g.strokeStyle = rgba('#2a0e06', 0.35 + 0.3 * calm); g.lineWidth = 1.4; g.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU - shownRot + Math.sin(i * 7.3) * 0.2; const w = 0.05 + 0.04 * Math.sin(i * 3.1); g.beginPath(); g.arc(cx, cy, R * (0.87 + 0.09 * ((i * 0.37) % 1)), a, a + w); g.stroke(); }
    g.restore();
    glow(g, cx, cy, R * 1.35, mix('#ff5a1a', '#ffb070', calm), 0.18 * (1 - fin * 0.5));
    // faint etched words travelling with the rim (decoration; the hub carries the readable copy)
    arcText(g, words.token, cx, cy, R * 0.83, -Math.PI / 2 - shownRot, { size: Math.max(9, R * 0.055), colour: rgba('#ffe7c2', 0.45), glowColour: '#ff8a3d', maxSweep: Math.PI * 0.9 });
    // inner and outer lips
    g.strokeStyle = rgba('#ffcf9a', 0.35); g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, R * 1.03, 0, TAU); g.stroke();
    g.beginPath(); g.arc(cx, cy, R * 0.8, 0, TAU); g.stroke();
  }
  const medR = () => R * 0.6;
  const medSize = () => Math.min(R * 0.36, ((TAU * medR()) / K) * 0.72);
  function medPos(md) { const a = md.base - shownRot; return { x: cx + Math.cos(a) * medR(), y: cy + Math.sin(a) * medR(), a }; }
  function drawMedallions(t, calm, fin) {
    const sz = medSize();
    meds.forEach((md, i) => {
      let { x, y } = medPos(md);
      // finale: settle as calm lanterns on a slightly smaller orbit, gently bobbing
      if (md.lift > 0) {
        const k = ease.inOutSine(md.lift);
        x = lerp(x, cx + (x - cx) * 0.94, k); y = lerp(y, cy + (y - cy) * 0.94 + Math.sin(t * 1.4 + i) * 3, k);
      }
      const heat = 1 - md.cool;
      const shimmer = reduced ? 0 : heat * 0.04 * Math.sin(t * 9 + i * 2);
      const glowCol = md.lift > 0 ? '#ffe2a0' : mix('#ff5a2a', '#9fd8ff', md.cool);
      if (md.cooling && !md.done) glow(g, x, y, sz * 1.3, '#bfe6ff', 0.6 * (1 - md.cool));
      if (md.ph >= 0) {
        photos.draw(g, md.ph, x, y, sz * (1 + 0.12 * md.lift), { shape: 'circle', tone: 'ember', toneMix: heat * 0.85, glow: 0.45 + 0.3 * heat, glowColour: glowCol, skewY: shimmer, shadow: false });
      } else {
        glow(g, x, y, sz * 0.9, glowCol, 0.5 + 0.3 * heat);
        orb(g, x, y, sz * 0.26, mix('#ff6a2a', '#ffe9c8', md.cool * 0.8 + md.lift * 0.2));
      }
      if (md.cooling && md.cool < 1 && !reduced && E.rand() < 0.3) E.particles.emit({ x: x + (E.rand() - 0.5) * sz * 0.6, y: y - sz * 0.3, vy: -30, life: 0.9, size: 6, colour: '#d8f0ff', alpha: 0.6 });
    });
  }
  function drawHub(t, calm, fin) {
    const hr = R * 0.36;
    const gr = g.createRadialGradient(cx - hr * 0.3, cy - hr * 0.4, hr * 0.1, cx, cy, hr);
    gr.addColorStop(0, rgba(mix('#3a1c3a', '#2a3a6a', calm), 0.92)); gr.addColorStop(1, rgba('#0c0618', 0.95));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, hr, 0, TAU); g.fill();
    g.strokeStyle = rgba('#ffd9a8', 0.25); g.lineWidth = 1.2; g.stroke();
    // flickering ember ink that steadies as the turn slows
    const flick = reduced ? 0 : (1 - calm) * (0.25 * Math.sin(t * 17) + 0.15 * Math.sin(t * 29 + 1));
    words.draw(g, cx, cy, { style: calm > 0.6 || fin ? 'light' : 'ember', size: Math.max(12, hr * 0.2), maxWidth: hr * 1.6, lines: 3, alpha: 0.85 + flick * 0.5,
      glowColour: mix('#ff8a3d', '#ffd9a0', calm) });
    // glass highlight
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.07)';
    g.beginPath(); g.ellipse(cx - hr * 0.3, cy - hr * 0.48, hr * 0.5, hr * 0.2, -0.4, 0, TAU); g.fill(); g.restore();
  }
  function drawSparks(dt, t, calm, fin) {
    const spd = lerp(5.2, 0.35, calm) + rush * 4;
    const na = notchAngle();
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const s of sparks) {
      if (drag != null && rush < 0.4) {
        // slow and held: sparks gather behind the fingertip into one amber line
        const target = na + 0.12 + (sparks.indexOf(s) / sparks.length) * lerp(0.4, 1.4, calm);
        s.a += angDiff(s.a, target) * Math.min(1, dt * 3);
      } else s.a += spd * s.m * dt * (fin ? 0.2 : 1);
      const tail = clamp(spd * s.m * 0.06, 0.015, 0.45) * (1 - fin * 0.8);
      const r = R * s.r * (1 + (reduced ? 0 : rush * 0.03 * Math.sin(t * 40 + s.m * 9)));
      const col = mix('#ffd27a', '#ffb45a', calm);
      g.strokeStyle = rgba(col, 0.75); g.lineWidth = 2 + rush * 1.5;
      g.beginPath(); g.arc(cx, cy, r, s.a - tail, s.a); g.stroke();
      glow(g, cx + Math.cos(s.a) * r, cy + Math.sin(s.a) * r, 5 + rush * 4, '#ffe2a0', 0.55);
    }
    // the continuous amber line behind the notch (grows as the turn calms)
    if ((drag != null && rush < 0.4) || fin) {
      const len = lerp(0.3, 1.6, calm) * (fin ? 1 + fin : 1);
      for (const [w, a] of [[9, 0.16], [4, 0.45], [1.6, 0.95]]) { g.strokeStyle = rgba(a > 0.9 ? '#fff4dc' : '#ffb44a', a); g.lineWidth = w; g.beginPath(); g.arc(cx, cy, R * 0.955, na + 0.05, na + 0.05 + len); g.stroke(); }
    }
    g.restore();
  }
  function drawNotch(t, calm, fin) {
    const a = notchAngle(), x = cx + Math.cos(a) * R * 0.94, y = cy + Math.sin(a) * R * 0.94;
    const inArc = Math.abs(angDiff(a, arcCentre)) < ARC_W;
    glow(g, x, y, R * 0.2, inArc ? '#8fd0ff' : '#ffb070', (drag != null ? 0.85 : 0.5 + 0.2 * Math.sin(t * 3)) + fin * 0.3);
    g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
    const w = R * 0.1, h = R * 0.2;
    const cg = g.createLinearGradient(-w, 0, w, 0); cg.addColorStop(0, '#7a3a1a'); cg.addColorStop(0.45, '#f0a868'); cg.addColorStop(0.6, '#ffd6a8'); cg.addColorStop(1, '#8a4a24');
    g.fillStyle = cg; roundRect(g, -w / 2, -h / 2, w, h, w / 2); g.fill();
    g.strokeStyle = 'rgba(255,240,220,0.6)'; g.lineWidth = 1; g.stroke();
    g.restore();
  }

  // -------------------------------------------------------------- input --
  function onRim(p) { const d = Math.hypot(p.x - cx, p.y - cy); return d > R * 0.42 && d < R * 1.35; }
  return {
    get progress() { return progress(); },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0 || !onRim(p)) return;
      drag = p.id; tracker.cx = cx; tracker.cy = cy; tracker.start(p.x, p.y);
      E.sound('click', { intensity: 0.4 }); E.haptic('light');
    },
    move(p) {
      if (p.id !== drag) return;
      const dt = Math.max(1 / 240, p.t - (this._t || p.t - 1 / 60)); this._t = p.t;
      const dA = tracker.feed(p.x, p.y, dt);
      if (Math.abs(dA) > 0.0005) applyInput(dA, dt);
      if (E.locked && wanted >= rot + 0.17) E.checkpoint('wait');
      if (rush > 0.6 && E.rand() < 0.2) { const a = notchAngle(); E.particles.burst(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 3, { speed: 140, colour: '#ffb44a', life: 0.5, size: 4, kind: 'glint' }); E.sound('crackle', { intensity: 0.2 }); }
    },
    up(p) { if (p.id === drag) { drag = null; tracker.end(); this._t = null; if (rot >= TURN * 0.998) { doneFlag = true; } } },
    assist() { if (finAt >= 0) return; assistTo = Math.min(TURN, Math.max(wanted, rot) + TURN / 8); },
    pointAt(p) { const a = START - clamp(p) * TURN; return { x: cx + Math.cos(a) * R * 0.94, y: cy + Math.sin(a) * R * 0.94 }; },
    hint() {
      const a0 = notchAngle(), pts = [];
      for (let i = 0; i <= 16; i++) { const a = a0 - (i / 16) * 0.9; pts.push([cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94]); }
      return { path: pts };
    },
    twist() { clockCalm = true; E.particles.burst(cx, cy - R * 1.18, reduced ? 6 : 16, { speed: 60, colour: '#ffffff', life: 1.1, size: 5, kind: 'glint' }); },
    finish() { finAt = E.now(); for (const md of meds) if (!md.done) { md.cooling = true; } E.sound('shimmer', { intensity: 0.45 }); },
    destroy() {},
  };
}
