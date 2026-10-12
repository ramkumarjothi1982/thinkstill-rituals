// GE-36 · TEXT PRISM — triangular text prism (3D prism turn).
// A glass prism floats across the stage, its long faces written with the
// person's words. Light enters it from above and leaves as five coloured
// reflections, so every face shows the thought five times over — repeated,
// shifted letters. Swiping up turns the prism about its long axis (the end cap
// shows the triangle rolling); turning slowly lets the reflections gather,
// rushing scatters them again. Win: the quiet (frosted, moon-marked) face is
// held square in view and the five copies have become one clean sentence.
//
// Photos are the light slides the prism casts below it, one at a time: each
// arrives as five ghostly spectral reflections that gather into one clear
// picture as the prism turns, then rests in a quiet row. The last one (the
// hero) stays in a single white beam for the finale.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, motes, halo, orb } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-36',
  howTo: 'Swipe up on the glass prism to turn it slowly to its quiet face.',
  steps: ['Rest a finger on the glass prism.', 'Swipe up slowly to turn it — rushing scatters the reflections.', 'Stop when your words read clearly on the one quiet, moon-marked face.'],
  tapAlt: 'each press turns the prism one slow notch',
  words: 'Your words are written along the prism’s faces — five coloured reflections that gather into one clear sentence on the quiet face.',
  photos: {
    where: 'Your photos are cast in the prism’s light just below it, one at a time.',
    becomes: 'softly projected light slides',
    touch: 'You turn the prism and its light falls on each one;',
    change: 'its five ghostly reflections gather into one clear picture, then it rests in a quiet row beneath.',
    payoff: 'At the end the last one shines clearly in a single white beam.',
  },
  finaleSec: 4,
};

const SQ3 = Math.sqrt(3);
const FACE = TAU / 3;               // one face of the prism
const TILT = 0.8;                   // the prism starts tipped towards the light, so two faces show in depth
const TURN = FACE * 2 - TILT;       // first face → middle face → the quiet face
const OFF = FACE - TILT;            // turn at which the middle face is square to view
const BANK = 0.22;                  // input may run this far ahead of the law (rad)
const GH = 0.36;                    // ghost spacing (photo widths) at full dispersion
const SPEC0 = ['#ff8fb8', '#ffc56e', '#ffffff', '#7ff0c6', '#9ab0ff'];
const wrapPi = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };

export function create(E) {
  const { g, stage, photos, words } = E;
  const pal = E.pal || {};
  const P_GLOW = pal.glow || '#fff4c8', P_INK = pal.ink || '#15123d', P_ACC = pal.accent || '#8fd0ff';
  const reduced = !!E.reduced, low = reduced || !!E.lowStim, heavy = !!E.heavy, lowStream = !!E.lowStim;
  const calm0 = E.calm || 0, loop = E.round > 1;
  // ---- per-round character (round 1 is fixed; loop rounds vary by E.rand)
  const yawSign = loop && E.rand() < 0.5 ? -1 : 1;
  const lightLeft = loop ? E.rand() < 0.5 : true;
  const tintK = 0.14 + (heavy ? 0.2 : 0) + calm0 * 0.35 + (loop ? E.rand() * 0.12 : 0);
  const SPEC = SPEC0.map((c, i) => (i === 2 ? mix('#ffffff', P_GLOW, 0.22) : mix(c, P_GLOW, tintK)));
  const glassC = mix(P_INK, '#03020e', 0.3);
  const quietC = mix(glassC, P_ACC, 0.1 + (loop ? E.rand() * 0.06 : 0));
  const quietGlow = mix(P_ACC, P_GLOW, 0.45);
  const TONES = loop && E.rand() < 0.5 ? ['warm', 'glow', null, 'mist', 'cool'] : ['dawn', 'gold', null, 'cool', 'rain'];
  const spreadK = 1 - calm0 * 0.45;
  const swayK = (reduced ? 0.15 : 1) * (1 - calm0 * 0.5) * (heavy ? 0.7 : 1);
  const phase0 = E.rand() * TAU;

  // ---- photo slides: cast one at a time, the hero last
  const n = photos.n, m = Math.max(1, n);
  const heroIdx = n ? (loop ? Math.floor(E.rand() * n) : 0) : -1;
  const slides = Array.from({ length: m }, (_, k) => ({ ph: n ? (heroIdx + 1 + k) % n : -1, pos: 0, app: k === 0 ? 1 : 0, cleared: false }));
  const nAlbum = m - 1;

  // ---- geometry (re-fitted on resize)
  let L, r, ri, side, pcx, pcy, qx, qy, heroS, albumY, albumS, albumSp, fontPx, maxW;
  let gQuiet, gMirror, gBand, gSheen, gPoolA, gPoolB, gBeamIn, gInner, gLip, gFoot;
  const beamO = { x: 0, y: 0 };
  const gShadow = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  gShadow.addColorStop(0, 'rgba(0,0,8,0.3)'); gShadow.addColorStop(1, 'rgba(0,0,8,0)');
  function fit() {
    L = Math.min(stage.w * 0.86, 390 * stage.s);
    r = clamp(Math.min(L * 0.215, stage.h * 0.125), 30, 96);
    ri = r / 2; side = r * SQ3;
    pcx = stage.cx; pcy = stage.y + stage.h * 0.25;
    qx = stage.cx; qy = stage.y + stage.h * 0.635;
    heroS = Math.min(stage.w * 0.5, stage.h * (stage.h < 380 ? 0.33 : 0.3));
    albumY = stage.y + stage.h * 0.925;
    albumSp = nAlbum ? Math.min(66 * stage.s, (stage.w - 16) / nAlbum) : 0;
    albumS = clamp(Math.min(stage.h * 0.105, albumSp / 0.86), 34, 66);
    fontPx = clamp(side * 0.2, 13, 22);
    maxW = L * 0.7;
    // face-local gradients (faces are drawn in their own coordinates, so these stay valid)
    gQuiet = g.createLinearGradient(0, -side / 2, 0, side / 2);
    gQuiet.addColorStop(0, mix(quietC, P_ACC, 0.3)); gQuiet.addColorStop(0.18, mix(quietC, P_ACC, 0.1)); gQuiet.addColorStop(0.55, quietC); gQuiet.addColorStop(1, mix(glassC, '#000000', 0.4));
    gLip = g.createLinearGradient(0, -side / 2, 0, -side * 0.2);
    gLip.addColorStop(0, 'rgba(255,255,255,0.9)'); gLip.addColorStop(0.12, 'rgba(255,255,255,0.25)'); gLip.addColorStop(1, 'rgba(255,255,255,0)');
    gFoot = g.createLinearGradient(0, side * 0.3, 0, side / 2);
    gFoot.addColorStop(0, rgba(P_ACC, 0)); gFoot.addColorStop(1, rgba(P_ACC, 0.55));
    gMirror = g.createLinearGradient(0, -side / 2, 0, side / 2);
    gMirror.addColorStop(0, mix(glassC, '#ffffff', 0.16)); gMirror.addColorStop(0.5, glassC); gMirror.addColorStop(1, mix(glassC, '#000000', 0.35));
    gBand = g.createLinearGradient(0, -side * 0.32, 0, side * 0.32);
    gBand.addColorStop(0, 'rgba(255,255,255,0)'); gBand.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gBand.addColorStop(1, 'rgba(255,255,255,0)');
    gSheen = g.createLinearGradient(-L / 2, 0, L / 2, 0);
    SPEC.forEach((c, i) => gSheen.addColorStop(i / 4, rgba(c, 1)));
    gInner = g.createLinearGradient(-L / 2, 0, L / 2, 0);
    SPEC.forEach((c, i) => gInner.addColorStop(0.1 + i * 0.2, rgba(c, 0.9)));
    gPoolA = g.createRadialGradient(pcx, pcy, r * 0.3, pcx, pcy, L * 0.72);
    gPoolA.addColorStop(0, rgba(P_INK, 0.42)); gPoolA.addColorStop(1, rgba(P_INK, 0));
    gPoolB = g.createRadialGradient(qx, qy, heroS * 0.2, qx, qy, heroS * 1.05);
    gPoolB.addColorStop(0, rgba(P_INK, 0.34)); gPoolB.addColorStop(1, rgba(P_INK, 0));
    beamO.x = lightLeft ? stage.x - 14 : stage.x + stage.w + 14; beamO.y = stage.y - 26;
    gBeamIn = g.createLinearGradient(beamO.x, beamO.y, pcx, pcy);
    gBeamIn.addColorStop(0, 'rgba(255,255,255,0)'); gBeamIn.addColorStop(0.55, rgba(P_GLOW, 0.1)); gBeamIn.addColorStop(1, 'rgba(255,255,255,0.2)');
  }
  fit();
  E.onResize(fit);

  // ---- state
  let wanted = 0, rot = 0, shown = 0, vel = 0;
  let assistTo = null, drag = null, lastY = 0, lastPT = 0, rush = 0;
  let doneFlag = false, finAt = -1, twistAt = -1, restT = 0, hinted = false;
  let lastTick = 0, lastPluck = 0, noteN = 0, lastNoteT = -9, lastHapT = -9, waitT = -9, lastFace = -1;
  let touchA = 0, touchX = 0, touchY = 0, clock = 0;
  const wob = new Wobble();
  const vUp = new Float32Array(3), vZ = new Float32Array(3), vY = new Float32Array(3);
  const wOpts = { style: 'plain', size: 16, maxWidth: 200, lines: 2, alpha: 1, glowColour: P_GLOW, colour: undefined };

  const progress = () => clamp(rot / TURN);
  const yaw = (t) => yawSign * (0.4 + Math.sin(t * 0.33 + phase0) * 0.05 * swayK);
  const bobAt = (t) => Math.sin(t * 0.8 + phase0) * 3.2 * swayK;

  function note(name, n, intensity = 0.3) {
    const now = E.now();
    if (now - lastNoteT < 0.09) return;
    lastNoteT = now; E.sound(name, { note: n, intensity });
  }
  function haptic(kind, gap = 0.12) { const now = E.now(); if (now - lastHapT < gap) return; lastHapT = now; E.haptic(kind); }

  function applyInput(dy, dt) {
    const dA = dy / (r * 1.45);                              // heavy glass: the surface slips a little under the finger
    const speed = Math.abs(dA) / Math.max(1 / 120, dt);
    const k = lerp(1, 0.35, invLerp(2.4, 7.5, speed));       // rushing → the prism drags
    rush = lerp(rush, invLerp(2.4, 7, speed), 0.25);
    wanted = clamp(wanted + dA * k, 0, TURN);
    wanted = Math.min(wanted, rot + BANK);                   // can't bank turns past the law
  }

  // ------------------------------------------------------------ frame --
  function frame(dt, t) {
    clock = t;
    // ---- simulation
    if (assistTo != null) { wanted = Math.min(TURN, wanted + Math.max(0, Math.min(assistTo - wanted, dt * 1.5))); if (assistTo - wanted < 1e-3) assistTo = null; }
    const p = E.gate(wanted / TURN);
    rot = p * TURN;
    if (wanted > rot + BANK) wanted = rot + BANK;
    // weighted glass: a slightly under-damped spring follows the allowed turn
    const kS = 140, cS = reduced ? 2 * Math.sqrt(kS) : 17;
    if (dt > 0) { const h = Math.min(dt, 1 / 30); vel += ((rot - shown) * kS - vel * cS) * h; shown += vel * h; }
    if (drag == null) rush = Math.max(0, rush - dt * 1.4);
    touchA = drag != null ? Math.min(1, touchA + dt * 5) : Math.max(0, touchA - dt * 2.2);
    wob.update(Math.min(dt, 1 / 30));
    const shownP = clamp(shown / TURN);

    // ticks and a small pentatonic melody as real rotation accumulates
    if (Math.abs(rot - lastTick) > 0.24) { lastTick = rot; E.sound('rotate-tick', { pitch: lerp(1.2, 0.85, p), intensity: 0.22 }); haptic('tick', 0.14); }
    if (Math.abs(rot - lastPluck) > 0.5) { lastPluck = rot; note('pluck', (noteN++ % 5) + 2 + Math.round(p * 3), 0.24); }
    const faceNow = Math.round((rot - OFF) / FACE);          // a face squarely in front
    if (faceNow >= 0 && faceNow !== lastFace && Math.abs(rot - OFF - faceNow * FACE) < 0.06) {
      lastFace = faceNow; note('glass', 4 + faceNow * 2, 0.4); haptic('light', 0.05);
      edgeGlints(t);
      if (faceNow < 1) E.checkpoint('step');
    }
    if (!hinted && p > 0.72) { hinted = true; E.hint && E.hint('Slowly now — let the quiet face come to rest.'); }

    // photo slides: each one gathers within its part of the turn, then rests in the row
    const cur = Math.min(m - 1, Math.floor(p * m + 1e-6));
    for (let k = 0; k < m; k++) {
      const s = slides[k];
      const toAlbum = k < cur ? 1 : 0;
      s.pos += (toAlbum - s.pos) * (1 - Math.exp(-dt * 3.6));
      s.app = k <= cur ? Math.min(1, s.app + dt / 0.5) : Math.max(0, s.app - dt / 0.35);
      const clearAt = k < m - 1 ? (k + 1) / m : 0.999;
      if (!s.cleared && p >= clearAt - 1e-4) {
        s.cleared = true;
        if (s.ph >= 0) { photos.dust(s.ph, qx, qy, heroS, low ? 6 : 14, { shape: 'card', up: 26, speed: 24 }); E.checkpoint('photo', s.ph); }
        E.ripples.add(qx, qy, { colour: P_GLOW, alpha: 0.35, r: heroS * 0.3 });
        note('glass', 5 + (k % 4), 0.38); E.sound('lens-focus', { intensity: 0.3 }); haptic('soft', 0.05);
      }
    }

    // win: the quiet face held square in view, at rest
    if (!doneFlag && rot >= TURN * 0.998 && drag == null && assistTo == null && Math.abs(shown - rot) < 0.02 && Math.abs(vel) < 0.25) {
      restT += dt; if (restT > 0.35) { doneFlag = true; E.sound('settle', { intensity: 0.45 }); }
    } else if (!doneFlag) restT = 0;
    if (E.locked && wanted >= rot + BANK - 0.01 && drag != null && t - waitT > 0.8) { waitT = t; wob.kick(0.5); E.checkpoint('wait'); }

    // ---- drawing
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const beta = yaw(t), bob = bobAt(t);
    const phi = -TURN + shown + wob.v * (reduced ? 0.01 : 0.05);
    drawBackdrop(t, fin);
    if (twistAt >= 0) drawTwist(t);
    computeVerts(phi, Math.sin(beta), bob);
    const G = drawProjection(dt, t, shownP, cur, fin);
    drawPrism(t, phi, beta, bob, shownP, fin, G);
    if (fin > 0) drawFinale(t, fin, beta, bob, phi);
  }

  // ------------------------------------------------------------ geometry --
  function computeVerts(phi, sb, bob) {
    for (let j = 0; j < 3; j++) {
      const a = phi + Math.PI / 3 + j * FACE;
      vUp[j] = r * Math.sin(a); vZ[j] = r * Math.cos(a); vY[j] = pcy + bob - vUp[j];
    }
  }
  // map face-local coordinates (x along the prism, y down the face) onto the screen
  function faceXform(psi, sb, cb, bob) {
    g.transform(cb, 0, Math.sin(psi) * sb, Math.cos(psi), pcx + ri * Math.cos(psi) * sb, pcy + bob - ri * Math.sin(psi));
  }

  // ------------------------------------------------------------- drawing --
  function drawBackdrop(t, fin) {
    // soft ink pools give the glass a quiet room on every realm palette
    g.fillStyle = gPoolA; g.fillRect(pcx - L, pcy - L, L * 2, L * 2);
    g.fillStyle = gPoolB; g.fillRect(qx - heroS * 1.1, qy - heroS * 1.1, heroS * 2.2, heroS * 2.2);
    // the incoming white light
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.6 + phase0);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = breathe * (1 + fin * 0.4);
    const sx = lightLeft ? -1 : 1;
    g.fillStyle = gBeamIn; g.beginPath();
    g.moveTo(beamO.x, beamO.y - 30); g.lineTo(beamO.x + sx * -70, beamO.y);
    g.lineTo(pcx + sx * L * 0.05, pcy - r * 0.15); g.lineTo(pcx + sx * L * 0.32, pcy - r * 0.55); g.closePath(); g.fill();
    g.restore();
    // the prism's soft shadow on the light below (it floats)
    g.save(); g.translate(pcx, pcy + r * 1.55); g.scale(L * 0.52, r * 0.22); g.fillStyle = gShadow; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
    if (!low) motes(g, stage.x, stage.y, stage.w, stage.h * 0.62, t * (heavy ? 0.5 : 0.8), mix('#ffffff', P_GLOW, 0.5), { n: 22, alpha: 0.32, seed: 36 + E.round, size: 1.6 });
  }

  function drawTwist(t) {
    const k = (t - twistAt) / 6.5;
    if (k >= 1) { twistAt = -1; return; }
    const env = Math.sin(Math.PI * clamp(k));
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const odd = E.round % 2 === 1;
    const cx = odd ? pcx : qx, cy = odd ? pcy + r * 2.2 : qy, R0 = odd ? L * 0.6 : heroS * 0.78;
    for (let i = 0; i < 5; i++) {
      if (i === 2) continue;
      g.strokeStyle = rgba(SPEC[i], 0.16 * env); g.lineWidth = 5;
      const rr = R0 + (i - 2) * 7;
      if (odd) { g.beginPath(); g.arc(cx, cy, rr, Math.PI + 0.32, TAU - 0.32); g.stroke(); }
      else { g.beginPath(); g.arc(cx, cy, rr, t * 0.2, t * 0.2 + TAU * 0.85); g.stroke(); }
    }
    g.restore();
  }

  // the light leaving the prism and the slides it casts; returns the current spread
  function drawProjection(dt, t, shownP, cur, fin) {
    const s = slides[cur];
    const u = clamp((shownP - cur / m) * m);
    let G = clamp((1 - ease.inOutSine(u)) * spreadK + rush * 0.45, 0, 1.25) * (1 - fin);
    if (doneFlag || finAt >= 0) G *= 0.0;
    // the beams: five spectral fans that close into one white beam
    let maxY = vY[0]; for (let j = 1; j < 3; j++) if (vY[j] > maxY) maxY = vY[j];
    const sy = maxY - r * 0.12, ws = L * 0.07;
    const sz = cardSize(s.ph, heroS);
    const top = qy - sz.h / 2;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = -2; i <= 2; i++) {
      const gx = qx + i * G * sz.w * GH, gy = top + Math.abs(i) * G * 6;
      g.fillStyle = rgba(SPEC[i + 2], (0.06 + 0.05 * (1 - G)) * (1 + fin * 0.9) * (0.4 + 0.6 * s.app));
      g.beginPath(); g.moveTo(pcx - ws + i * ws * 0.3, sy); g.lineTo(pcx + ws + i * ws * 0.3, sy);
      g.lineTo(gx + sz.w * 0.46, gy); g.lineTo(gx - sz.w * 0.46, gy); g.closePath(); g.fill();
    }
    g.restore();
    glow(g, qx, qy, heroS * 0.95, P_GLOW, 0.16 + 0.12 * (1 - G) + fin * 0.15);
    // resting row first, then the slide in the light
    for (let k = 0; k < m; k++) if (k !== cur && slides[k].pos > 0.01 && slides[k].app > 0.01) drawSlide(slides[k], k, 0, t, fin);
    for (let k = cur + 1; k < m; k++) if (slides[k].app > 0.01) drawSlide(slides[k], k, 1, t, fin);
    drawSlide(s, cur, G, t, fin);
    return G;
  }
  function cardSize(ph, S) { return ph >= 0 ? photos.size(ph, 'card', S) : { w: S * 0.62, h: S * 0.62 }; }
  function slotPos(k) {
    const mid = (nAlbum - 1) / 2, d = nAlbum > 1 ? (k - mid) / mid : 0;
    return { x: qx + (k - mid) * albumSp, y: albumY - 7 * d * d };
  }
  function drawSlide(s, k, G, t, fin) {
    const e = ease.inOutSine(s.pos);
    let x = qx, y = qy, S = heroS;
    if (s.pos > 0.001 && k < nAlbum) {
      const sp = slotPos(k);
      x = lerp(qx, sp.x, e); y = lerp(qy, sp.y, e) - Math.sin(Math.PI * s.pos) * 18; S = lerp(heroS, albumS, e);
      if (fin > 0) y -= fin * 6 + Math.sin(t * 1.3 + k) * 2 * fin;
    }
    const a = s.app;
    if (a <= 0.01) return;
    const sz = cardSize(s.ph, S);
    const isHero = k === m - 1;
    if (s.ph < 0) { drawMoon(x, y, S, G, t, fin, a); return; }
    // ghost reflections (screened so they read as light, on any palette)
    if (G > 0.01) {
      g.save(); g.globalCompositeOperation = 'screen';
      for (let i = -2; i <= 2; i++) {
        if (!i) continue;
        const sh = reduced ? 0 : Math.sin(t * 0.7 + i * 2.1) * 0.06;
        photos.draw(g, s.ph, x + i * G * sz.w * (GH + sh), y + Math.abs(i) * G * 6, S * (1 - Math.abs(i) * 0.03), {
          shape: 'card', tone: TONES[i + 2], toneMix: 0.5 + 0.3 * G, alpha: a * (0.22 + 0.3 * clamp(G * 1.4)) * (Math.abs(i) === 2 ? 0.75 : 1),
          rot: i * G * 0.05, blur: 0.2 + 0.35 * G, shadow: false });
      }
      g.restore();
    }
    const focus = 1 - clamp(G * 1.2);
    photos.draw(g, s.ph, x, y, S * (1 + (isHero ? fin * 0.05 : 0)), {
      shape: 'card', alpha: a * (0.72 + 0.28 * focus), blur: clamp(G * 0.7), tone: 'mist', toneMix: G * 0.4,
      glow: 0.18 + 0.25 * focus + (isHero ? fin * 0.45 : fin * 0.25), glowColour: P_GLOW, shadow: s.pos > 0.5 || G < 0.2 });
  }
  function drawMoon(x, y, S, G, t, fin, a) {
    const R0 = S * 0.27;
    g.save(); g.globalAlpha *= a;
    for (let i = -2; i <= 2; i++) {
      if (!i || G < 0.01) continue;
      const gx = x + i * G * S * 0.42, gy = y + Math.abs(i) * G * 8;
      glow(g, gx, gy, R0 * 1.6, SPEC[i + 2], 0.25 * clamp(G * 1.5));
      orb(g, gx, gy, R0 * 0.7, SPEC[i + 2], { alpha: 0.35 * clamp(G * 1.5) });
    }
    glow(g, x, y, R0 * (2.2 + fin * 0.6), P_GLOW, 0.35 + 0.3 * (1 - G));
    orb(g, x, y, R0 * (0.85 + 0.15 * (1 - G)), mix(P_GLOW, '#ffffff', 0.4 + 0.4 * (1 - G)), { alpha: 0.6 + 0.4 * (1 - G) });
    if (!reduced) halo(g, x, y, R0 * 2.4, t, P_GLOW, { rings: 3, alpha: 0.1 + 0.1 * (1 - G), speed: 0.08 });
    g.restore();
  }

  function drawPrism(t, phi, beta, bob, prog, fin, G) {
    const sb = Math.sin(beta), cb = Math.cos(beta);
    const xe = -Math.sign(beta) * L / 2;              // the end cap facing us
    // far faces through the glass
    for (let k = 0; k < 3; k++) {
      const psi = phi + k * FACE;
      if (Math.cos(psi) >= 0) continue;
      g.save(); faceXform(psi, sb, cb, bob); g.globalAlpha = 0.32;
      g.fillStyle = k === 0 ? gQuiet : gMirror; g.fillRect(-L / 2, -side / 2, L, side); g.restore();
    }
    // light living inside the glass
    g.save(); g.translate(pcx, pcy + bob); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = gInner;
    g.globalAlpha = 0.1 + 0.05 * Math.sin(t * 0.9) + G * 0.06; g.lineWidth = r * 0.55;
    g.beginPath(); g.moveTo(-L * 0.42 * cb, 0); g.lineTo(L * 0.42 * cb, 0); g.stroke();
    g.globalAlpha = 0.22 + G * 0.1; g.lineWidth = r * 0.08; g.stroke();
    g.restore();
    for (let i = 0; i < 3; i++) {
      const k = ((t * (0.05 + i * 0.017) * (heavy ? 0.6 : 1) + i / 3 + phase0) % 1);
      glow(g, pcx + (k - 0.5) * L * 0.84 * cb, pcy + bob + Math.sin(t * 0.7 + i * 2) * r * 0.12, r * 0.5, SPEC[(i * 2) % 5], 0.3 * Math.sin(Math.PI * k));
    }
    // near faces
    for (let k = 0; k < 3; k++) {
      const psi = phi + k * FACE, cs = Math.cos(psi);
      if (cs < 0.012) continue;
      drawFrontFace(k, psi, cs, sb, cb, bob, t, prog, fin);
    }
    // edges
    g.save(); g.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      const front = Math.cos(phi + j * FACE) > 0 || Math.cos(phi + (j + 1) * FACE) > 0;
      const f = 0.5 + 0.5 * vZ[j] / r;
      const xo = vZ[j] * sb, x0 = pcx - (L / 2) * cb + xo, x1 = pcx + (L / 2) * cb + xo, y = vY[j];
      g.strokeStyle = rgba(mix('#ffffff', P_GLOW, 0.4), front ? 0.3 + 0.45 * f : 0.12); g.lineWidth = front ? 1.4 : 1;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      if (front && f > 0.3) {
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(P_GLOW, 0.1 * f); g.lineWidth = 5;
        g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.globalCompositeOperation = 'source-over';
        // a slow travelling glint along the brightest edges
        const k2 = ((t * (heavy ? 0.06 : 0.09) + j * 0.37 + phase0) % 1);
        glow(g, lerp(x0, x1, k2), y, 12 + 6 * f, '#ffffff', 0.35 * f * Math.sin(Math.PI * k2));
      }
    }
    // the far end of each near face
    const xf = -xe * cb;
    g.strokeStyle = rgba(mix('#ffffff', P_GLOW, 0.4), 0.45); g.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      if (Math.cos(phi + k * FACE) <= 0.012) continue;
      const a = (k + 2) % 3, b = k;
      g.beginPath(); g.moveTo(pcx + xf + vZ[a] * sb, vY[a]); g.lineTo(pcx + xf + vZ[b] * sb, vY[b]); g.stroke();
    }
    // dispersion fringe along the top silhouette (rose above, blue below)
    let top = 0; for (let j = 1; j < 3; j++) if (vY[j] < vY[top]) top = j;
    const tx0 = pcx - (L / 2) * cb + vZ[top] * sb, tx1 = pcx + (L / 2) * cb + vZ[top] * sb, ty = vY[top];
    g.globalCompositeOperation = 'lighter'; g.lineWidth = 1.2;
    g.strokeStyle = rgba(SPEC[0], 0.32 + G * 0.2); g.beginPath(); g.moveTo(tx0, ty - 1.6); g.lineTo(tx1, ty - 1.6); g.stroke();
    g.strokeStyle = rgba(SPEC[4], 0.32 + G * 0.2); g.beginPath(); g.moveTo(tx0, ty + 1.6); g.lineTo(tx1, ty + 1.6); g.stroke();
    g.restore();
    drawCap(t, xe, sb, cb, bob, G, fin);
    // the finger's light on the glass
    if (touchA > 0.01) glow(g, touchX, clamp(touchY, pcy - r, pcy + r), r * 0.75, P_GLOW, 0.35 * touchA);
  }

  function drawFrontFace(k, psi, cs, sb, cb, bob, t, prog, fin) {
    const quiet = k === 0;
    // lighting: soft key light from above, a specular band that slides across the face as it turns
    const lx = lightLeft ? -0.35 : 0.35, ly = 0.75, lz = 0.56;
    const nx = cs * sb, ny = Math.sin(psi), nz = cs * cb;
    const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
    const hy = ly, hz = lz + 1, hl = Math.hypot(lx, hy, hz);
    const spec = Math.pow(Math.max(0, (nx * lx + ny * hy + nz * hz) / hl), 14);
    const psiH = Math.atan2(hy, hz);
    const bandY = clamp(-(psi - psiH) * side * 0.9, -side * 0.62, side * 0.62);
    g.save();
    faceXform(psi, sb, cb, bob);
    g.beginPath(); g.rect(-L / 2, -side / 2, L, side); g.clip();
    g.globalAlpha = 0.88; g.fillStyle = quiet ? gQuiet : gMirror; g.fillRect(-L / 2, -side / 2, L, side);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.25 + diff * 0.45; g.fillStyle = gLip; g.fillRect(-L / 2, -side / 2, L, side * 0.3);
    g.globalAlpha = 0.2 + 0.15 * (1 - diff); g.fillStyle = gFoot; g.fillRect(-L / 2, side * 0.3, L, side * 0.2);
    if (!quiet) { g.globalAlpha = 0.05 + 0.04 * Math.sin(t * 0.5 + k); g.fillStyle = gSheen; g.fillRect(-L / 2, -side / 2, L, side); }
    else if (prog > 0.5 || fin > 0) { g.globalAlpha = 1; glow(g, 0, 0, L * 0.36, quietGlow, smooth(invLerp(0.5, 1, prog)) * 0.1 + fin * 0.08); }
    // two slow diagonal refraction streaks drifting through the glass
    if (!lowStream) {
      g.globalAlpha = 0.07 + 0.04 * Math.sin(t * 0.4 + k * 2);
      g.strokeStyle = quiet ? P_GLOW : SPEC[(k * 2 + 1) % 5]; g.lineWidth = side * 0.05;
      for (let i = 0; i < 2; i++) {
        const sx = ((t * (heavy ? 7 : 11) + i * L * 0.5 + k * 97 + phase0 * 40) % (L * 1.4)) - L * 0.7;
        g.beginPath(); g.moveTo(sx - side * 0.35, side / 2); g.lineTo(sx + side * 0.35, -side / 2); g.stroke();
      }
    }
    g.globalAlpha = spec * 0.4; g.translate(0, bandY); g.fillStyle = gBand; g.fillRect(-L / 2, -side * 0.32, L, side * 0.64); g.translate(0, -bandY);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // quiet face: a small moon mark at its end
    if (quiet) {
      const ex = yawSign * L * 0.44;
      glow(g, ex, 0, fontPx * 1.3, P_GLOW, 0.4 + 0.3 * prog);
      g.fillStyle = rgba(mix(P_GLOW, '#ffffff', 0.5), 0.85); g.beginPath(); g.arc(ex, 0, fontPx * 0.36, 0, TAU); g.fill();
      g.fillStyle = rgba(quietC, 0.9); g.beginPath(); g.arc(ex + fontPx * 0.16, -fontPx * 0.1, fontPx * 0.3, 0, TAU); g.fill();
    } else {
      // reflection faces: five tiny facet marks
      for (let i = 0; i < 5; i++) { g.fillStyle = rgba(SPEC[i], 0.55); g.beginPath(); g.arc(yawSign * L * 0.44, (i - 2) * fontPx * 0.32, 1.6, 0, TAU); g.fill(); }
    }
    if (E.phase !== 'law') faceWords(k, psi, cs, t, prog, fin);
    g.restore();
  }

  // the five reflections of the words on one face: they gather as the turn slows and squares up
  function faceWords(k, psi, cs, t, prog, fin) {
    const vis = smooth(invLerp(0.16, 0.5, cs));
    if (vis <= 0.01) return;
    const mis = clamp(Math.abs(wrapPi(psi)) / (FACE * 0.75));
    const c = smooth(prog);
    const base = fontPx * 1.1;
    let S = base * ((1 - c) * (0.62 + 0.38 * mis) * spreadK + c * mis * 0.85) + rush * base * 0.9;
    S *= 1 - fin;
    const conv = clamp(S / (fontPx * 0.55));
    wOpts.size = fontPx; wOpts.maxWidth = maxW; wOpts.lines = 2; wOpts.colour = undefined;
    if (S > 0.25) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = -2; i <= 2; i++) {
        if (!i) continue;
        const a = vis * (0.14 + 0.48 * conv) * (Math.abs(i) === 2 ? 0.8 : 1);
        if (a < 0.02) continue;
        const sh = reduced ? 0 : Math.sin(t * 0.9 + i * 1.9 + k) * 0.16;
        g.fillStyle = SPEC[i + 2];
        wOpts.style = 'plain'; wOpts.alpha = a;
        words.draw(g, i * S * (1 + sh), Math.abs(i) * S * 0.12 - i * S * 0.04, wOpts);
      }
      g.restore();
    }
    wOpts.style = cs > 0.62 ? 'light' : 'plain'; g.fillStyle = '#fffaf0'; wOpts.alpha = vis * (0.62 + 0.38 * (1 - conv)); wOpts.glowColour = k === 0 ? P_GLOW : mix(P_GLOW, P_ACC, 0.4);
    words.draw(g, 0, 0, wOpts);
  }

  function drawCap(t, xe, sb, cb, bob, G, fin) {
    const ox = pcx + xe * cb;
    g.save();
    g.beginPath();
    for (let j = 0; j < 3; j++) { const x = ox + vZ[j] * sb, y = vY[j]; j ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
    const gr = g.createRadialGradient(ox, pcy + bob, 0, ox, pcy + bob, r);
    gr.addColorStop(0, rgba(mix(glassC, P_GLOW, 0.45), 0.92)); gr.addColorStop(1, rgba(glassC, 0.92));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = rgba(mix('#ffffff', P_GLOW, 0.3), 0.75); g.lineWidth = 1.5; g.lineJoin = 'round'; g.stroke();
    g.clip();
    const sc = SPEC[Math.floor(t * 0.25 + phase0) % 5];
    glow(g, ox, pcy + bob, r * (0.7 + 0.3 * G), sc, 0.35 + 0.25 * G);
    glow(g, ox, pcy + bob, r * 0.35, '#ffffff', 0.25 + fin * 0.3);
    g.restore();
  }

  function edgeGlints(t) {
    if (low) return;
    let top = 0; for (let j = 1; j < 3; j++) if (vY[j] < vY[top]) top = j;
    const y = vY[top] - 2, xo = vZ[top] * Math.sin(yaw(t));
    for (let i = 0; i < 5; i++) E.particles.emit({ x: pcx + (i / 4 - 0.5) * L * 0.8 + xo, y, vx: (E.rand() - 0.5) * 16, vy: -16 - E.rand() * 14, life: 1, size: 4, colour: SPEC[i], kind: 'dot' });
  }

  function drawFinale(t, fin, beta, bob) {
    // the quiet face breathes in clean light; a single white beam; gentle risers
    glow(g, pcx, pcy + bob, L * 0.62, P_GLOW, 0.14 * fin * (0.85 + 0.15 * Math.sin(t * 1.2)));
    if (!reduced) halo(g, qx, qy, heroS * 0.8, t, P_GLOW, { rings: 3, alpha: 0.07 * fin, speed: heavy ? 0.05 : 0.08 });
    const rate = low ? 0.06 : heavy ? 0.12 : 0.35;
    if (fin < 1 && E.rand() < rate) {
      const x = pcx + (E.rand() - 0.5) * L * 0.95;
      E.particles.emit({ x, y: pcy + bob - r * 0.95, vx: (E.rand() - 0.5) * 14, vy: -22 - E.rand() * 22, life: 1.8, size: heavy ? 5 : 6, colour: heavy ? P_GLOW : SPEC[Math.floor(E.rand() * 5)], kind: heavy || E.rand() < 0.7 ? 'glow' : 'glint' });
    }
  }

  // -------------------------------------------------------------- input --
  function onPrism(p) {
    const halfW = (L / 2) * Math.cos(yaw(clock)) + r * 0.5 + 24;
    return Math.abs(p.x - pcx) < halfW && p.y > pcy - r * 1.55 - 18 && p.y < pcy + r * 1.75 + 18;
  }
  return {
    get progress() { return progress(); },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0 || doneFlag || drag != null || !onPrism(p)) return;
      drag = p.id; lastY = p.y; lastPT = p.t; touchX = p.x; touchY = p.y;
      E.ripples.add(p.x, clamp(p.y, pcy - r, pcy + r), { colour: P_GLOW, alpha: 0.35, r: 10 });
      note('glass', 2 + (Math.max(0, Math.round((rot - OFF) / FACE)) % 3) * 2, 0.32); haptic('light', 0.05);
      E.react && E.react('tap');
    },
    move(p) {
      if (p.id !== drag) return;
      const dt = Math.max(1 / 240, (p.t - lastPT) || 1 / 60); lastPT = p.t;
      const dy = lastY - p.y; lastY = p.y;
      touchX = lerp(touchX, p.x, 0.5); touchY = lerp(touchY, p.y, 0.5);
      if (Math.abs(dy) > 0.01 && !doneFlag) applyInput(dy, dt);
      if (dy < -0.5 && wanted <= 0.001 && clock - waitT > 0.6) { waitT = clock; wob.kick(-0.3); }   // the other way: a soft bump
      if (rush > 0.6 && !low && E.rand() < 0.15) { E.particles.burst(touchX, clamp(touchY, pcy - r, pcy + r), 2, { speed: 70, colour: SPEC[Math.floor(E.rand() * 5)], life: 0.5, size: 4, kind: 'glint' }); }
    },
    up(p) { if (p.id === drag) { drag = null; } },
    assist() { if (finAt >= 0 || doneFlag) return; assistTo = Math.min(TURN, Math.max(wanted, rot) + TURN / 8); },
    pointAt(pp) {
      // the quiet face's moon mark as the turn brings it round
      const psi = -TURN + clamp(pp) * TURN, t = clock, beta = yaw(t), sb = Math.sin(beta), cb = Math.cos(beta);
      const ex = yawSign * L * 0.44;
      return { x: pcx + ri * Math.cos(psi) * sb + ex * cb, y: pcy + bobAt(t) - ri * Math.sin(psi) };
    },
    hint() {
      const x = pcx + yawSign * L * 0.3, pts = [];
      for (let i = 0; i <= 14; i++) pts.push([x, pcy + r * 0.8 - (i / 14) * r * 1.8]);
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      if (!low) E.particles.burst(pcx, pcy - r * 1.2, 10, { speed: 40, colour: '#ffffff', life: 1.2, size: 4, kind: 'glint' });
      E.sound('shimmer', { intensity: 0.3 });
    },
    finish() { finAt = E.now(); E.sound(heavy ? 'settle' : 'shimmer', { intensity: heavy ? 0.4 : 0.45 }); },
    destroy() {},
  };
}
