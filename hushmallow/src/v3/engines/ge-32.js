// GE-32 · JELLY BRIDGE — elastic translucent bridge (stretch and place).
// Pull the glowing tab of a jelly strap across a small gap between two
// floating marshmallow islands and hook it on the near side, then lower the
// floating token onto it and roll it across. The strap is a damped elastic
// string: it thins and sings as it stretches, twangs when it hooks, sags
// under the token's weight (a moving point load) and rebounds as the token
// rolls on and the heaviness it carries seeps through the jelly and drips
// into the pool of mist below. Win: the token rests on the far island's pad —
// carried across, never dropped.
//
// Photos: the token is the hero photo as a jelly bubble with the person's
// words on a glass tag that swings from it; any further photos are smaller
// bubbles floating behind it on threads of light (they are what keep the
// token light). Each carries a stormy tint that washes away as it crosses the
// gap, and they gather as calm lanterns over the far island at the finale.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, noise2, rng, Spring, Spring2 } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-32',
  howTo: 'Stretch the jelly strap across the gap, then lower the token onto it.',
  steps: [
    'Pull the strap’s glowing tab across the gap to the hook on your side.',
    'Lower the floating token gently down onto the stretched strap.',
    'Roll it across — the strap sags and springs back — to the far island.',
  ],
  tapAlt: 'each press stretches, lowers or rolls the token one gentle step',
  words: 'Your words hang on a glass tag from the token, carried safely across the gap.',
  photos: {
    where: 'Your first photo is the token that crosses the jelly bridge; any others float behind it.',
    becomes: 'soft jelly bubbles — the main token, with smaller bubbles following on threads of light',
    touch: 'You lower the token onto the strap and roll it across;',
    change: 'as each bubble crosses the gap, its stormy tint seeps away into the glowing mist below and its own colours return.',
    payoff: 'On the far island they rest together in warm light.',
  },
  finaleSec: 4.2,
};

const N = 24, N1 = N - 1;           // strap nodes
const P1 = 0.38, P2 = 0.52;         // progress: stretch → lower → roll across
const BANK = 0.06;                  // input that may run ahead of the world law
const K0 = 9000;                    // strap stiffness (per node, full stretch)
const GRAV = 816;                   // gravity (px/s²)
const VIS = 9;                      // internal jelly viscosity
const FILM = ['#ff9ad8', '#8ff0ff', '#ffe08a'];
const STEPS = [P1 / 3, (2 * P1) / 3, P1, P2, P2 + (1 - P2) * 0.25, P2 + (1 - P2) * 0.5, P2 + (1 - P2) * 0.75, 1];

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = !!E.reduced, low = !!(E.lowStim || E.reduced), heavy = !!E.heavy;
  const R1 = E.round === 1;
  // loop rounds: the gap flips sides, changes width and height, and the jelly takes a new colour
  const dir = E.round % 2 === 1 ? 1 : -1;
  const gapK = R1 ? 0.5 : 0.46 + E.rand() * 0.08;
  const yK = R1 ? 0.57 : 0.55 + E.rand() * 0.05;
  const offK = R1 ? 0 : (E.rand() - 0.5) * 0.04;
  const hueK = R1 ? 0.25 : 0.05 + E.rand() * 0.6;
  const twistKind = (E.round - 1) % 3;
  const calm0 = E.calm;
  const nz = noise2(E.seed + 32);

  // ---- palette (works on dark and bright realms: deep islands, frosted tops, translucent jelly)
  const ink = pal.ink || pal.deep;
  const strapCol = mix(mix(pal.glow, pal.accent, 0.3 + hueK * 0.45), pal.glow, calm0 * 0.35);
  const strapLite = mix(strapCol, '#ffffff', 0.55);
  const strapDeep = mix(strapCol, ink, 0.55);
  const warm = pal.warm || '#ffb37a';
  const storm = mix('#7c86ad', ink, 0.18);           // cool, heavy tint (never muddy on warm realms)
  const isle = mix(mix(pal.deep, ink, 0.3), pal.accent, 0.28);
  const isleLit = mix(isle, mix(pal.sky, '#ffffff', 0.4), 0.32);
  const isleDeep = mix(isle, ink, 0.6);
  const frost = mix('#fff3e6', pal.accent, 0.22);
  const mistCol = mix(pal.glow, '#ffffff', 0.45);
  const heroCol = mix(warm, pal.glow, 0.35);
  const decoCol = mix(strapCol, '#ffffff', 0.25);

  // ---- photos: hero token + followers (decorative jelly bubbles when there are 0–1 photos)
  const n = photos.n;
  const heroPh = n ? (E.round - 1) % n : -1;
  const fIdx = [];
  if (n >= 2) for (let j = 1; j < n; j++) fIdx.push((heroPh + j) % n);
  else fIdx.push(-1, -1);
  const m = fIdx.length;
  const inner = m <= 3 ? m : Math.ceil(m / 2), outer = m - inner;
  const fols = fIdx.map((ph, k) => {
    const ring = k < inner ? 0 : 1, j = ring ? k - inner : k, cnt = ring ? outer : inner;
    const a = (j - (cnt - 1) / 2) * (ring ? 0.52 : 0.66);
    return { ph, ring, a, seed: E.rand() * TAU, sp: new Spring2(0, 0, { stiffness: 24 + k * 2, damping: 5.6 }), wash: 0, washing: false, washed: false, init: false };
  });
  const tint0 = 0.72 * (1 - calm0 * 0.7);

  // ---- geometry
  let W, H, s, span, midX, yB, nearX, farX, hookX, rootX, tab0X, rT, rF, hoverX, hoverY, padX, mistY, botY, depth;
  let halfT1, bankTop, stretchLen, lowerLen, crossLen, rho1, rho2, ringScale, M0, tagMax;
  let shadeGrad = null, isleGrad = null, rimGrad = null, mistGrad = null;
  const curGrad = [null, null, null];
  const deco = [];                      // static island buds and frosting drips
  function fit() {
    W = stage.w; H = stage.h; s = stage.s;
    span = clamp(W * gapK, 130 * s, 330 * s);
    midX = stage.cx + W * offK;
    yB = stage.y + H * yK;
    nearX = midX - (dir * span) / 2; farX = midX + (dir * span) / 2;
    hookX = nearX - dir * 2 * s; rootX = farX + dir * 2 * s;
    tab0X = rootX - dir * span * 0.3;
    rT = clamp(Math.min(W, H) * 0.125, 22, 58);
    rF = Math.max(15, rT * 0.52);
    halfT1 = 6.5 * s;
    bankTop = yB - halfT1;
    hoverX = nearX + dir * span * 0.24;
    hoverY = Math.max(stage.y + rT + 8, yB - Math.max(rT * 2.45, H * 0.2));
    const bankW = Math.max(rT, (W - span) / 2);
    padX = farX + dir * clamp(rT * 1.12, rT * 0.7, Math.max(rT * 0.7, bankW - rT - 2));
    depth = clamp(H * 0.22, 54 * s, 170 * s);
    mistY = Math.min(stage.y + H * 0.92, bankTop + depth + 34 * s);
    botY = stage.y + H;
    stretchLen = Math.abs(hookX - tab0X);
    lowerLen = Math.max(30, yB - halfT1 - rT - hoverY);
    crossLen = Math.abs(padX - hoverX);
    rho1 = rT + rF + 22 * s; rho2 = rho1 + rF * 2.1;
    ringScale = clamp((hoverY - stage.y - rF - 4) / (m > 3 ? rho2 : rho1), 0.55, 1);
    tagMax = Math.max(120 * s, rT * 2.7);
    // token mass so the strap sags ~11% of the span at mid-gap (13% for heavy feelings)
    M0 = ((heavy ? 0.13 : 0.11) * span * N1 * K0) / (GRAV * (N1 * N1) / 4) * (1 - calm0 * 0.35);
    // cached gradients
    shadeGrad = g.createRadialGradient(midX, yB + depth * 0.4, 0, midX, yB + depth * 0.4, span * 0.95);
    shadeGrad.addColorStop(0, rgba(ink, 0.24)); shadeGrad.addColorStop(1, rgba(ink, 0));
    isleGrad = g.createLinearGradient(0, bankTop - 4 * s, 0, bankTop + depth);
    isleGrad.addColorStop(0, isleLit); isleGrad.addColorStop(0.22, isle); isleGrad.addColorStop(1, isleDeep);
    rimGrad = g.createLinearGradient(0, bankTop, 0, bankTop + depth);
    rimGrad.addColorStop(0, rgba(pal.glow, 0.1)); rimGrad.addColorStop(1, rgba(pal.glow, 0.5));
    mistGrad = g.createRadialGradient(midX, mistY, 0, midX, mistY, span * 0.9);
    mistGrad.addColorStop(0, rgba(mistCol, 0.5)); mistGrad.addColorStop(0.5, rgba(mistCol, 0.18)); mistGrad.addColorStop(1, rgba(mistCol, 0));
    for (let j = 0; j < 3; j++) {
      const cw = span * (0.5 - j * 0.1), gr = g.createLinearGradient(-cw / 2, 0, cw / 2, 0);
      gr.addColorStop(0, rgba(mistCol, 0)); gr.addColorStop(0.5, rgba(j ? mistCol : '#ffffff', 0.4 - j * 0.1)); gr.addColorStop(1, rgba(mistCol, 0));
      curGrad[j] = gr;
    }
    deco.length = 0;
    const rr = rng(E.seed * 3 + 1);
    for (const side of [-1, 1]) {
      const lip = side < 0 ? Math.min(nearX, farX) : Math.max(nearX, farX);
      const edge = side < 0 ? 0 : E.view.w;
      for (let i = 0; i < 4; i++) deco.push({ side, x: lerp(lip + side * 24 * s, edge, 0.15 + rr() * 0.75), r: (2 + rr() * 2.6) * s, tw: rr() * TAU });
    }
    tabS.set(...tabPos(clamp(p / P1)));
    if (!attached) tokS.set(hoverX, hoverY);
    else tokS.sx.set(lerp(hoverX, padX, clamp((p - P2) / (1 - P2))));
  }

  // ---- state
  let wanted = 0, p = 0;
  let drag = null, lastX = 0, lastY = 0, frameDist = 0, fingerSpeed = 0;
  let assistTo = null;
  let hooked = false, placed = false, attached = false, arrived = false, settledAt = -1;
  let finAt = -1, twistAt = -1, hookAt = -9, arriveAt = -9, lastWaitAt = -9, lastNoteStep = 0;
  let grab = 0, heroWashed = false, prevTokX = 0, movedAcc = 0, dripNote = 0, hum = null, tilt = 0;
  let tokX = 0, tokY = 0, heroVx = 0, lastVx = 0, tagA = 0, tagV = 0, bobN = 0, bobF = 0;
  const d = new Float32Array(N), v = new Float32Array(N), w8 = new Float32Array(N);
  const PX = new Float32Array(N), PY = new Float32Array(N), HW = new Float32Array(N), PROF = new Float32Array(N);
  for (let i = 0; i < N; i++) PROF[i] = 1 + 0.4 * Math.pow(1 - Math.sin((Math.PI * i) / N1), 2);
  let endX = 0, endY = 0, st = 0, halfT = 5, Kc = K0, Gs = GRAV, Mnow = 0;
  const tabS = new Spring2(0, 0, { stiffness: 240, damping: 19 });
  const tokS = new Spring2(0, 0, { stiffness: 120, damping: 15 });
  const sqS = new Spring(0, { stiffness: 300, damping: 15 });
  const wob = new Wobble();
  const drips = Array.from({ length: 26 }, () => ({ on: false, x: 0, y: 0, vy: 0, r: 0, age: 0 }));
  const rings = Array.from({ length: 10 }, () => ({ on: false, x: 0, r: 0, a: 0 }));
  const bubbles = Array.from({ length: low ? 4 : 9 }, (_, i) => ({ u: (i + 0.5) / (low ? 4 : 9), sp: 0.012 + E.rand() * 0.02, off: E.rand() * 2 - 1, r: 0.9 + E.rand() * 1.5 }));
  const tLights = [0.13, 0.27, 0.41].map((u, i) => ({ u, sx: (E.rand() - 0.5) * 0.3, delay: i * 0.4 }));
  fit();
  E.onResize(fit);

  // ---- helpers
  function tabPos(e) { return [lerp(tab0X, hookX, e), yB - Math.sin(Math.PI * e) * 12 * s]; }
  const weightK = (c) => lerp(1, 0.48, smooth(c));
  function qAt(x) { const sp0 = endX - rootX; if (Math.abs(sp0) < 1) return 0; return clamp((x - rootX) / sp0) * N1; }
  function yAt(x) { const q = qAt(x), i = Math.min(N1 - 1, Math.floor(q)), f = q - i; return lerp(PY[i], PY[i + 1], f); }
  function dAt(x) { const q = qAt(x), i = Math.min(N1 - 1, Math.floor(q)), f = q - i; return lerp(d[i], d[i + 1], f); }
  const onStrap = (x) => (x - rootX) * dir < -0.5;
  /** static sag (px) of the hooked strap under the token at x, carrying weight factor wk */
  function sagStatic(x, wk) {
    const a = clamp((x - rootX) / (hookX - rootX)) * N1, q = a * (N1 - a);
    return (M0 * wk * GRAV * q) / (N1 * K0) + (GRAV * q) / (2 * K0);
  }
  function note(name, nt, intensity = 0.3) { E.sound(name, { note: nt, intensity: intensity * (heavy ? 0.8 : 1) }); }
  function startHum() { if (!hum && !hooked) hum = E.hold('hum', { intensity: 0.08, pitch: 0.85 }); }
  function stopHum() { if (hum) { hum.stop(); hum = null; } }
  function poke(x, imp) { const q = qAt(x); for (let i = 1; i < N1; i++) { const k = 1 - Math.abs(i - q) / 4; if (k > 0) v[i] += imp * k; } }
  function addDrip(x, r) { for (const dr of drips) if (!dr.on) { dr.on = true; dr.x = x; dr.y = yAt(x) + halfT; dr.vy = 8; dr.r = r; dr.age = 0; return; } }
  function addRing(x, a = 0.5) { for (const rg of rings) if (!rg.on) { rg.on = true; rg.x = x; rg.r = 2 * s; rg.a = a; return; } }
  function notYet() {
    if (E.now() - lastWaitAt < 0.9) return;
    lastWaitAt = E.now(); wob.kick(0.7); E.checkpoint('wait');
    E.sound('click', { intensity: 0.18, pitch: 0.8 });
  }

  function onHook() {
    hooked = true; hookAt = E.now(); stopHum();
    if (wanted < P1) wanted = P1;
    for (let i = 1; i < N1; i++) v[i] -= 210 * s * Math.sin((Math.PI * i) / N1);
    E.sound('snap', { intensity: 0.3 }); note('pluck', 7, 0.4); E.haptic('pop'); E.checkpoint('step');
    E.ripples.add(hookX, yB, { colour: strapLite, speed: 46, alpha: 0.5, r: 6 });
    E.particles.burst(hookX, yB, low ? 4 : 10, { speed: 50, colour: strapLite, life: 0.9, size: 5, kind: 'glint' });
    E.hint('Now lower the token gently onto the strap.');
  }
  function onAttach() {
    attached = true;
    const vy = clamp(tokS.sy.v, 60, 320);
    poke(tokS.x, vy * 0.9);
    tagV += (dir > 0 ? 1.4 : -1.4);
    E.sound('drop-in', { intensity: 0.35 }); note('bubble', 1, 0.35); E.haptic('soft'); E.checkpoint('step');
    E.particles.burst(tokS.x, yAt(tokS.x), low ? 4 : 9, { speed: 40, colour: strapLite, life: 0.9, size: 5, spread: Math.PI, dir: -Math.PI / 2 });
    E.hint('Roll it across to the far island — slowly is lovely.');
    prevTokX = tokS.x;
  }
  function washHero(fromFinish = false) {
    if (heroWashed) return; heroWashed = true;
    if (heroPh >= 0) { photos.dust(heroPh, tokX, tokY, rT * 2, low ? 6 : 14, { shape: 'bubble', up: 26, speed: 24 }); E.checkpoint('photo', heroPh); }
    if (!fromFinish) { note('glass', 6, 0.38); E.haptic('light'); }
  }
  function washFol(f, fromFinish = false) {
    if (f.washing || f.washed) return;
    f.washing = true;
    const x = f.sp.x, y = f.sp.y;
    if (f.ph >= 0) { photos.dust(f.ph, x, y, rF * 2, low ? 4 : 10, { shape: 'bubble', up: 22, speed: 20 }); E.checkpoint('photo', f.ph); }
    else E.particles.burst(x, y, low ? 3 : 6, { speed: 30, colour: decoCol, life: 0.9, size: 4 });
    if (!fromFinish) note('glass', 3 + (fols.indexOf(f) % 5), 0.28);
  }

  // ------------------------------------------------------------ frame --
  function frame(dt, t) {
    // ---- input → progress through the world law
    if (assistTo != null) {
      const rate = !hooked ? 0.3 : !placed ? 0.32 : 0.24;
      wanted = Math.min(assistTo, wanted + dt * rate);
      if (wanted >= assistTo - 1e-4) assistTo = null;
    }
    p = E.gate(wanted);
    if (wanted > p + BANK) wanted = p + BANK;
    if (!hooked && p >= P1 - 1e-4) onHook();
    if (hooked && !placed && p >= P2 - 1e-4) placed = true;
    if (hooked && wanted < P1) wanted = P1;
    if (placed && wanted < P2) wanted = P2;
    const e = clamp(p / P1), l = clamp((p - P1) / (P2 - P1)), c = clamp((p - P2) / (1 - P2));
    const inst = frameDist / Math.max(dt, 1 / 120); frameDist = 0;
    fingerSpeed = lerp(fingerSpeed, drag != null ? inst : 0, 0.3);
    grab = Math.max(0, grab - dt * 1.4);
    if (drag != null) grab = Math.max(grab, 0.6);
    wob.update(dt);
    const wx = wob.v * 5 * s;
    const stepNow = Math.floor(p * 20);
    if (stepNow > lastNoteStep) {
      if (!hooked) note('pluck', 1 + (stepNow % 7), 0.26);
      else if (!placed) note('bubble', 6 - (stepNow % 3), 0.24);
      else note('glass', 2 + (stepNow % 8), 0.2);
    }
    lastNoteStep = stepNow;
    if (hum) hum.update({ intensity: 0.06 + 0.16 * e, pitch: lerp(0.85, 1.35, e) });
    // the islands float, very slowly
    const fl = reduced ? 0.25 : 1;
    bobN = Math.sin(t * 0.52) * 1.8 * s * fl; bobF = Math.sin(t * 0.52 + 1.9) * 1.8 * s * fl;

    // ---- strap ends and material
    if (!hooked) {
      const [tx, ty] = tabPos(e);
      tabS.to(tx + wx, ty); tabS.update(dt);
      endX = tabS.x; endY = tabS.y;
    } else { endX = hookX; endY = yB + bobN; }
    const len = Math.hypot(endX - rootX, endY - yB);
    st = clamp(len / Math.abs(hookX - rootX));
    halfT = lerp(11, 6.5, st) * s;
    Kc = K0 * (0.35 + 0.65 * st);
    Gs = GRAV * st * st;
    const C = (heavy ? 2.4 : 1.7) + calm0 * 1.2;

    // ---- token: hover, lower, then ride the strap
    const wk = weightK(c);
    if (!attached) {
      const bob = reduced ? 0 : Math.sin(t * 1.1) * 3 * s;
      const tx = placed ? lerp(hoverX, padX, c) : hoverX;
      const contact = yAt(tokS.x) - halfT - rT;
      const ty = !hooked ? hoverY + bob : lerp(hoverY + bob * (1 - l), contact + 3, ease.inOutSine(l));
      tokS.to(tx + (hooked ? wx : 0), ty); tokS.update(dt);
      if (hooked && tokS.y > contact && (tokS.x - rootX) * dir < 0) { tokS.sy.x = contact; if (tokS.sy.v > 0) tokS.sy.v *= 0.3; }
      if (placed && tokS.y >= contact - 0.75) onAttach();
      Mnow = 0;
    }
    if (attached) {
      tokS.sx.target = lerp(hoverX, padX, c) + wx; tokS.sx.update(dt);
      Mnow = onStrap(tokS.x) ? M0 * wk : 0;
    }

    // ---- strap simulation: damped elastic string, both ends pinned, token as a moving point mass
    w8.fill(0);
    if (Mnow > 0) { const q = qAt(tokS.x), i0 = Math.min(N1 - 1, Math.floor(q)), f = q - i0; w8[i0] = 1 - f; w8[i0 + 1] += f; }
    const sub = Math.min(16, Math.max(1, Math.ceil(dt * 240))), h = dt / sub;
    for (let k = 0; k < sub; k++) {
      for (let i = 1; i < N1; i++) {
        const lap = d[i - 1] - 2 * d[i] + d[i + 1], vis = v[i - 1] - 2 * v[i] + v[i + 1];
        const mi = 1 + Mnow * w8[i];
        v[i] += ((Kc * lap + VIS * vis + Gs + Mnow * w8[i] * GRAV) / mi - C * v[i]) * h;
      }
      for (let i = 1; i < N1; i++) d[i] += v[i] * h;
    }
    d[0] = d[N1] = 0; v[0] = v[N1] = 0;
    const amb = (reduced ? 0.25 : 1) * (1 - calm0 * 0.6) * (1 - smooth(c) * 0.5) * 1.1 * s;
    const y0 = yB + bobF, qTok = Mnow > 0 ? qAt(tokS.x) : -99, rip = (reduced ? 0.03 : 0.08) * (1 - calm0 * 0.5);
    for (let i = 0; i < N; i++) {
      const u = i / N1;
      PX[i] = lerp(rootX, endX, u);
      PY[i] = lerp(y0, endY, u) + d[i] + Math.sin(t * 1.15 + i * 0.38) * Math.sin(Math.PI * u) * amb;
      // jelly, not a pipe: a slow peristaltic ripple, thinner under the load with a bulge beside it
      const qd = Mnow > 0 ? Math.abs(i - qTok) : 99, press = qd < 1 ? 0.84 : qd < 3 ? 1 + 0.12 * (1 - Math.abs(qd - 2)) : 1;
      HW[i] = halfT * PROF[i] * press * (1 + rip * Math.sin(t * 1.7 - i * 0.55));
    }

    // token sits on the strap (or the far island) once placed — it never drops
    if (attached) {
      tokX = tokS.x;
      heroVx = tokS.sx.v;
      if (onStrap(tokX)) {
        const dEq = sagStatic(tokX, wk);
        sqS.target = clamp((dAt(tokX) - dEq) / (rT * 1.6), -0.1, 0.13);
        const sl = (yAt(tokX + 4 * dir) - yAt(tokX - 4 * dir)) / 8;
        tilt = lerp(tilt, clamp(Math.atan(sl) * 0.6 * dir, -0.25, 0.25), 1 - Math.exp(-dt * 8));
        tokY = yAt(tokX) - halfT * 0.9 - rT * (1 - sqS.x * 0.5);
      } else {
        sqS.target = 0; tilt = lerp(tilt, 0, 1 - Math.exp(-dt * 6));
        tokY = bankTop + bobF - rT * (1 - sqS.x * 0.5) + (finAt >= 0 && !reduced ? Math.sin((t - finAt) * 1.3) * 1.5 * s : 0);
      }
      // the heaviness seeps through the jelly and drips into the mist as the token rolls
      movedAcc += Math.abs(tokX - prevTokX); prevTokX = tokX;
      const every = 15 * s;
      while (movedAcc > every) {
        movedAcc -= every;
        const tint = tint0 * (1 - smooth(invLerp(0.04, 0.92, c)));
        if (onStrap(tokX) && (tint > 0.04 || E.rand() < 0.25)) addDrip(tokX + (E.rand() - 0.5) * rT * 0.5, (2.1 + E.rand() * 1.6) * s);
      }
      if (!heroWashed && c >= 0.5) washHero();
    } else {
      tokX = tokS.x; tokY = tokS.y; heroVx = tokS.sx.v;
      sqS.target = 0; tilt = lerp(tilt, 0, 1 - Math.exp(-dt * 6));
    }
    sqS.update(dt);
    // the word tag swings from the token like a little pendulum
    if (dt > 0) {
      const ax = clamp((heroVx - lastVx) / dt, -5000, 5000); lastVx = heroVx;
      const Lp = 34 * s;
      tagV += (-(900 / Lp) * Math.sin(tagA) - (ax / Lp) * Math.cos(tagA) * 0.4 - 3.4 * tagV + (reduced ? 0 : Math.sin(t * 0.8) * 0.12)) * dt;
      tagA = clamp(tagA + tagV * dt, -0.3, 0.3);
    }

    // arrival on the far island (the win state, resting)
    const atPad = attached && c >= 0.999 && Math.abs(tokS.x - padX) < 1.6 && Math.abs(tokS.sx.v) < 10;
    if (atPad && !arrived && drag == null && assistTo == null) {
      arrived = true; arriveAt = E.now();
      E.sound('settle', { intensity: 0.45 }); note('glass', 8, 0.32); E.haptic('soft'); E.react('release');
      E.ripples.add(padX, bankTop, { colour: warm, speed: 40, alpha: 0.5, r: rT * 0.6 });
    }
    settledAt = atPad && drag == null && assistTo == null ? (settledAt < 0 ? E.now() : settledAt) : -1;

    // followers float behind the token on threads
    const lean = dir * (0.26 - 0.72 * smooth(c)) - clamp(heroVx * 0.0014, -0.35, 0.35);
    const sw = reduced ? 0.25 : 1;
    const arcW = Math.min(span * 0.78, W * 0.42);
    fols.forEach((f, k) => {
      let tx, ty;
      if (finAt >= 0) {
        // released from their threads, they drift into a calm arc of lanterns over the bridge
        const u = (k + 0.5) / m, side = dir > 0 ? u : 1 - u;
        tx = midX - arcW + side * arcW * 2 + Math.sin(t * 0.5 + f.seed) * 3 * s * sw;
        ty = yB - rT * (heavy ? 2.1 : 2.6) - Math.sin(Math.PI * u) * H * 0.1 - (k % 2) * rF * 0.8 + Math.cos(t * 0.6 + f.seed) * 2.5 * s * sw;
      } else {
        const th = -Math.PI / 2 + f.a + lean, rho = (f.ring ? rho2 : rho1) * ringScale;
        tx = tokX + Math.cos(th) * rho + Math.sin(t * 0.7 + f.seed) * 4 * s * sw;
        ty = tokY + Math.sin(th) * rho + Math.cos(t * 0.9 + f.seed * 1.3) * 3 * s * sw;
      }
      tx = clamp(tx, stage.x + rF + 2, stage.x + W - rF - 2); ty = clamp(ty, stage.y + rF + 2, yB - rF - 10 * s);
      if (!f.init) { f.init = true; f.sp.set(tx, ty); }
      f.sp.to(tx, ty); f.sp.update(finAt >= 0 ? dt * (heavy ? 0.45 : 0.6) : dt);
      if (attached && c >= 0.18 && !f.washing && (f.sp.x - midX) * dir > 0) washFol(f);
      if (f.washing && !f.washed) { f.wash = Math.min(1, f.wash + dt / 1.1); if (f.wash >= 1) f.washed = true; }
    });

    // drips and the rings they leave in the mist
    for (const dr of drips) {
      if (!dr.on) continue;
      dr.age += dt;
      if (dr.age < 0.24) dr.y = yAt(dr.x) + halfT + dr.r * (0.4 + dr.age * 3);
      else { dr.vy += 640 * dt; dr.y += dr.vy * dt; }
      if (dr.y >= mistY) { dr.on = false; addRing(dr.x); note('drip', 2 + (dripNote++ % 6), 0.18); }
    }
    for (const rg of rings) { if (!rg.on) continue; rg.r += 30 * s * dt; rg.a -= dt * 0.45; if (rg.a <= 0) rg.on = false; }
    for (const b of bubbles) { b.u += b.sp * dt * (reduced ? 0.4 : 1); if (b.u > 1) b.u -= 1; }

    // ---- drawing
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const arr = arriveAt > 0 ? smooth(clamp((E.now() - arriveAt) / 1.2)) : 0;
    drawDepth(t, c, fin);
    drawIsland(Math.min(nearX, farX), -1, t);
    drawIsland(Math.max(nearX, farX), 1, t);
    drawPad(t, arr, fin);
    drawDrips();
    if (twistAt >= 0 && twistKind === 1) drawHandrail(t);
    drawGuides(t, e);
    drawStrap(t, c, fin);
    drawAnchors(t, e);
    if (twistAt >= 0 && twistKind === 0) drawTwistLights(t);
    drawFollowers(t, fin);
    drawHero(t, c, arr, fin);
  }

  // ------------------------------------------------------------ drawing --
  function drawDepth(t, c, fin) {
    // feathered depth under the bridge (no hard edges)
    g.fillStyle = shadeGrad; g.fillRect(midX - span, yB - span * 0.6, span * 2, span * 1.9);
    const flow = t * (heavy ? 0.16 : 0.26) * (reduced ? 0.4 : 1);
    g.save(); g.globalCompositeOperation = 'lighter';
    // slow mist bands drifting through the gap
    for (let j = 0; j < 3; j++) {
      const yy = lerp(yB + 22 * s, mistY - 12 * s, (j + 0.5) / 3), xx = midX + span * 0.34 * Math.sin(flow * (0.7 + j * 0.3) + j * 2.1);
      g.save(); g.translate(xx, yy); g.scale(1, 0.24); glow(g, 0, 0, span * 0.55, mistCol, 0.07 + 0.03 * fin); g.restore();
    }
    // the pool of mist far below: where the heaviness lands and turns to light
    g.save(); g.translate(0, mistY); g.scale(1, 0.24); g.translate(0, -mistY);
    g.globalAlpha = 0.85 + 0.15 * fin + 0.1 * c; g.fillStyle = mistGrad; g.beginPath(); g.arc(midX, mistY, span * 0.9, 0, TAU); g.fill();
    g.restore();
    // a few short, slow currents in the mist (wavy, fading at both ends)
    g.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      const cx0 = midX + Math.sin(flow * 0.6 + j * 2.4) * span * 0.25, cw = span * (0.5 - j * 0.1);
      g.save(); g.translate(cx0, 0); g.globalAlpha = 0.8 + 0.2 * fin;
      g.strokeStyle = curGrad[j]; g.lineWidth = (2 - j * 0.4) * s;
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, x = -cw / 2 + u * cw;
        const y = mistY + (j - 1) * 6 * s + nz(u * 2.5 + flow * (1 + j * 0.4), j * 3.3 + flow * 0.5) * 3.2 * s;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke(); g.restore();
    }
    for (const rg of rings) { if (!rg.on) continue; g.strokeStyle = rgba(mistCol, rg.a); g.lineWidth = 1.4 * s; g.beginPath(); g.ellipse(rg.x, mistY, rg.r, rg.r * 0.24, 0, 0, TAU); g.stroke(); }
    // reflection twist: the mist shows a soft second bridge
    if (twistAt >= 0 && twistKind === 2) {
      const k = smooth(clamp((E.now() - twistAt) / 1.8));
      g.strokeStyle = rgba(strapLite, 0.34 * k); g.lineWidth = 3 * s; g.beginPath();
      for (let i = 0; i < N; i++) { const y = mistY + (mistY - PY[i]) * 0.18 + Math.sin(t * 2 + i * 0.7) * 1.2 * s; i ? g.lineTo(PX[i], y) : g.moveTo(PX[i], y); }
      g.stroke();
      glow(g, tokX, mistY + (mistY - tokY) * 0.18, rT * 1.1, heroCol, 0.3 * k);
    }
    // motes rising slowly out of the mist
    const mn = low ? 8 : 18, rise = mistY - yB + 50 * s;
    g.fillStyle = mistCol;
    for (let i = 0; i < mn; i++) {
      const a = (i * 0.618) % 1, sp = 9 + ((i * 37) % 11);
      const yy = mistY - (((t * sp * (reduced ? 0.4 : 1)) + i * 23) % rise);
      const xx = midX + (a - 0.5) * span * 1.05 + Math.sin(t * 0.6 + i) * 6 * s;
      g.globalAlpha = 0.55 * Math.sin(clamp((mistY - yy) / rise) * Math.PI);
      g.beginPath(); g.arc(xx, yy, (0.9 + (i % 3) * 0.5) * s, 0, TAU); g.fill();
    }
    g.restore();
    // a warm glow over the far island: somewhere to go
    glow(g, padX, bankTop - rT, rT * 3.4, warm, (0.1 + 0.04 * Math.sin(t * 0.45)) * (1 + fin));
  }

  function islandPath(lip, side, top) {
    // side -1: island on the left of the gap; +1: on the right. The gap is towards -side.
    const a = -side, xo = side < 0 ? -6 : E.view.w + 6, wd = Math.abs(xo - lip), lipR = 14 * s;
    g.beginPath();
    g.moveTo(xo, top + 7 * s);
    g.quadraticCurveTo(lerp(xo, lip, 0.55), top - 3 * s, lip - a * lipR, top);
    g.quadraticCurveTo(lip, top, lip + a * 2 * s, top + lipR);
    g.bezierCurveTo(lip + a * 2 * s, top + depth * 0.32, lip - a * wd * 0.3, top + depth * 0.86, lip - a * wd * 0.46, top + depth);
    g.quadraticCurveTo(lip - a * wd * 0.52, top + depth * 1.04, lip - a * wd * 0.6, top + depth * 0.96);
    g.bezierCurveTo(lip - a * wd * 0.82, top + depth * 0.72, xo, top + depth * 0.5, xo, top + depth * 0.36);
    g.closePath();
  }
  function drawIsland(lip, side, t) {
    const a = -side, xo = side < 0 ? -6 : E.view.w + 6, wd = Math.abs(xo - lip), lipR = 14 * s;
    const bob = (side < 0) === (dir > 0) ? bobN : bobF, top = bankTop + bob;
    g.save(); g.translate(0, bob);
    // soft light from the mist below, under the island
    g.save(); g.translate(lip - a * wd * 0.42, bankTop + depth * 0.9); g.scale(1, 0.35); glow(g, 0, 0, wd * 0.55, mistCol, 0.14); g.restore();
    islandPath(lip, side, bankTop);
    g.fillStyle = isleGrad; g.fill();
    // rim light along the underside, picked up from the mist below
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rimGrad; g.lineWidth = 2 * s; g.stroke(); g.restore();
    // soft strata and inner light (clipped to the island)
    g.save(); g.clip(); g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const yy = bankTop + depth * (0.24 + k * 0.2);
      g.beginPath(); g.moveTo(xo, yy + 6 * s); g.quadraticCurveTo(lerp(xo, lip, 0.5), yy - 4 * s, lip + a * 6 * s, yy + 2 * s);
      g.strokeStyle = rgba(isleDeep, 0.28); g.lineWidth = 5 * s; g.stroke();
      g.strokeStyle = rgba(isleLit, 0.35); g.lineWidth = 1.4 * s; g.stroke();
    }
    glow(g, lip - a * wd * 0.3, bankTop + depth * 0.18, wd * 0.55, mix(isleLit, '#ffffff', 0.3), 0.16);
    g.restore();
    // frosted top: a thick soft cushion with a highlight and a few drips over the lip
    g.lineCap = 'round'; g.lineJoin = 'round';
    const topLine = (o) => { g.beginPath(); g.moveTo(xo, bankTop + 7 * s + o); g.quadraticCurveTo(lerp(xo, lip, 0.55), bankTop - 3 * s + o, lip - a * lipR, bankTop + o); g.quadraticCurveTo(lip, bankTop + o, lip + a * 2 * s, bankTop + lipR * 0.8 + o); };
    topLine(2.6 * s); g.strokeStyle = mix(frost, isle, 0.45); g.lineWidth = 10 * s; g.stroke();
    topLine(0); g.strokeStyle = frost; g.lineWidth = 10 * s; g.stroke();
    topLine(-3 * s); g.strokeStyle = rgba('#ffffff', 0.6); g.lineWidth = 2.2 * s; g.stroke();
    g.fillStyle = frost;
    for (let i = 0; i < 3; i++) {
      const fx0 = lip - a * (lipR + 8 * s + i * 21 * s), fy = bankTop + 3 * s, fr = (4.4 - i * 1.1) * s, fl = 0.7 + (i % 2) * 0.35;
      g.beginPath(); g.ellipse(fx0, fy + fr * fl, fr, fr * (fl + 0.55), 0, 0, TAU); g.fill();
    }
    // little glowing buds on top
    for (const dc of deco) {
      if (dc.side !== side) continue;
      const y = bankTop - 3.5 * s - dc.r * 0.4;
      glow(g, dc.x, y, dc.r * 3.4, pal.glow, 0.28 + 0.14 * Math.sin(t * 0.9 + dc.tw));
      orb(g, dc.x, y, dc.r * 0.75, mix(pal.glow, '#ffffff', 0.45));
    }
    g.restore();
    void top;
  }

  function drawPad(t, arr, fin) {
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.7);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.translate(padX, bankTop - 3 * s + bobF); g.scale(1, 0.24);
    glow(g, 0, 0, rT * (1.35 + 0.15 * breathe), warm, 0.34 + 0.3 * arr + 0.2 * fin);
    g.strokeStyle = rgba(mix(warm, '#ffffff', 0.45), 0.22 + 0.12 * breathe + 0.3 * arr); g.lineWidth = 2.4 * s;
    g.beginPath(); g.arc(0, 0, rT * (0.95 + 0.05 * breathe), 0, TAU); g.stroke();
    g.restore();
  }

  function drawDrips() {
    for (const dr of drips) {
      if (!dr.on) continue;
      const k = smooth(clamp((dr.y - yB) / Math.max(1, mistY - yB)));
      const col = mix(storm, mistCol, k), r = dr.r;
      g.fillStyle = rgba(col, 0.88 - k * 0.3);
      g.beginPath(); g.moveTo(dr.x, dr.y - r * 2.3); g.quadraticCurveTo(dr.x + r, dr.y - r * 0.7, dr.x + r, dr.y); g.arc(dr.x, dr.y, r, 0, Math.PI); g.quadraticCurveTo(dr.x - r, dr.y - r * 0.7, dr.x, dr.y - r * 2.3); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(dr.x - r * 0.35, dr.y - r * 0.3, r * 0.3, 0, TAU); g.fill();
      if (k > 0.3) glow(g, dr.x, dr.y, r * 3.2, mistCol, 0.32 * k);
    }
  }

  function linePath(kOff, shiftY = 0) {
    g.beginPath(); g.moveTo(PX[0], PY[0] + HW[0] * kOff + shiftY);
    for (let i = 1; i < N1; i++) g.quadraticCurveTo(PX[i], PY[i] + HW[i] * kOff + shiftY, (PX[i] + PX[i + 1]) / 2, (PY[i] + HW[i] * kOff + PY[i + 1] + HW[i + 1] * kOff) / 2 + shiftY);
    g.lineTo(PX[N1], PY[N1] + HW[N1] * kOff + shiftY);
  }
  function bandPath(k0, k1) {
    g.beginPath(); g.moveTo(PX[0], PY[0] + HW[0] * k0);
    for (let i = 1; i < N1; i++) g.quadraticCurveTo(PX[i], PY[i] + HW[i] * k0, (PX[i] + PX[i + 1]) / 2, (PY[i] + HW[i] * k0 + PY[i + 1] + HW[i + 1] * k0) / 2);
    g.lineTo(PX[N1], PY[N1] + HW[N1] * k0);
    g.lineTo(PX[N1], PY[N1] + HW[N1] * k1);
    for (let i = N1 - 1; i > 0; i--) g.quadraticCurveTo(PX[i], PY[i] + HW[i] * k1, (PX[i] + PX[i - 1]) / 2, (PY[i] + HW[i] * k1 + PY[i - 1] + HW[i - 1] * k1) / 2);
    g.lineTo(PX[0], PY[0] + HW[0] * k1);
    g.closePath();
  }
  function drawStrap(t, c, fin) {
    const tense = hooked ? 0.55 + 0.45 * (1 - c) : st;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    // under-glow
    g.globalCompositeOperation = 'lighter';
    linePath(0, 2 * s); g.strokeStyle = rgba(strapCol, 0.12 + 0.08 * tense + 0.12 * fin); g.lineWidth = halfT * 4.6; g.stroke();
    g.globalCompositeOperation = 'source-over';
    // translucent jelly body, deeper lower volume, defined edge
    bandPath(-1, 1); g.fillStyle = rgba(strapCol, 0.48); g.fill();
    g.strokeStyle = rgba(strapDeep, 0.68); g.lineWidth = 1.5 * s; g.stroke();
    bandPath(0.15, 0.94); g.fillStyle = rgba(strapDeep, 0.24); g.fill();
    g.globalCompositeOperation = 'lighter';
    // luminous core: brighter as the strap is stretched taut
    linePath(-0.15); g.strokeStyle = rgba(strapLite, 0.2 + 0.26 * tense + 0.2 * fin); g.lineWidth = halfT * 0.8; g.stroke();
    // specular top edge and bright refracted rim underneath
    linePath(-0.52); g.strokeStyle = 'rgba(255,255,255,0.26)'; g.lineWidth = Math.max(1.5, halfT * 0.62); g.stroke();
    linePath(-0.6); g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = Math.max(1, halfT * 0.16); g.stroke();
    linePath(0.72); g.strokeStyle = rgba(strapLite, 0.36); g.lineWidth = Math.max(1, halfT * 0.14); g.stroke();
    // tiny bubbles suspended in the jelly
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.9;
    for (const b of bubbles) {
      const q = b.u * N1, i = Math.min(N1 - 1, Math.floor(q)), f = q - i;
      const x = lerp(PX[i], PX[i + 1], f), y = lerp(PY[i], PY[i + 1], f) + b.off * HW[i] * 0.42;
      g.beginPath(); g.arc(x, y, b.r * s * (0.7 + 0.3 * st), 0, TAU); g.stroke();
    }
    // slow glints travelling along the top
    for (let k = 0; k < 2; k++) {
      const u = (t * (0.07 + k * 0.03) + k * 0.5) % 1, q = u * N1, i = Math.min(N1 - 1, Math.floor(q)), f = q - i;
      const x = lerp(PX[i], PX[i + 1], f), y = lerp(PY[i], PY[i + 1], f) - HW[i] * 0.6;
      glint(g, x, y, (5 + 2 * k) * s, '#ffffff', 0.5 * Math.sin(u * Math.PI), 0.3);
    }
    // contact light under the token
    if (attached && onStrap(tokX)) glow(g, tokX, yAt(tokX), rT * 1.2, strapLite, 0.4);
    // finale: a soft wave of light travels the bridge (a steady glow if heavy)
    if (fin > 0) {
      if (heavy) { linePath(0); g.strokeStyle = rgba(strapLite, 0.22 * fin); g.lineWidth = halfT * 2.2; g.stroke(); }
      else {
        const u = clamp(((t - finAt) * 0.5) % 1.3), q = clamp(1 - u) * N1, i = Math.min(N1 - 1, Math.floor(q));
        glow(g, PX[i], PY[i], rT * 1.4, strapLite, 0.55 * fin * Math.sin(clamp(u) * Math.PI));
      }
    }
    g.restore();
  }

  function drawAnchors(t, e) {
    // jelly knot where the strap is rooted in the far island
    const kr = halfT1 * 1.75 + 2 * s, ry = yB + bobF;
    glow(g, rootX, ry, kr * 2.2, strapCol, 0.32);
    orb(g, rootX, ry, kr, mix(strapCol, '#ffffff', 0.12), { alpha: 0.92 });
    // hook ring on the near lip — pulses while it waits for the strap
    const hy = yB + bobN, want = hooked ? 0 : 0.5 + 0.5 * Math.sin(t * 2.4), near = hooked ? 1 : smooth(invLerp(0.6, 1, e));
    glow(g, hookX, hy, 20 * s, strapLite, (hooked ? 0.35 : 0.25 + 0.3 * want) + near * 0.25);
    g.strokeStyle = rgba(frost, 0.95); g.lineWidth = 3 * s;
    g.beginPath(); g.arc(hookX, hy, 8.5 * s, 0, TAU); g.stroke();
    g.strokeStyle = rgba(isleDeep, 0.5); g.lineWidth = 1 * s; g.beginPath(); g.arc(hookX, hy, 10 * s, 0.2, Math.PI - 0.2); g.stroke();
    if (!hooked) {
      // the strap's free end: a buoyant tab of glowing jelly
      const tr = (11 + 2.5 * grab) * s, x = endX, y = endY;
      const ring = (t * 0.8) % 1;
      if (drag == null && !reduced) { g.strokeStyle = rgba(strapLite, 0.55 * (1 - ring)); g.lineWidth = 1.6 * s; g.beginPath(); g.arc(x, y, tr * (1.25 + ring * 1.4), 0, TAU); g.stroke(); }
      glow(g, x, y, tr * 3, strapLite, 0.45 + 0.35 * grab);
      orb(g, x, y, tr, mix(strapCol, '#ffffff', 0.3));
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2 * s; g.beginPath(); g.arc(x, y, tr * 0.5, 0, TAU); g.stroke();
    } else {
      orb(g, hookX, hy, halfT1 * 1.45, mix(strapCol, '#ffffff', 0.3), { alpha: 0.95 });
    }
  }

  function drawGuides(t, e) {
    if (drag != null || finAt >= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = strapLite;
    if (!hooked && e < 0.97) {
      // a few flowing dots from the tab to the hook
      for (let i = 1; i <= 6; i++) {
        const k = e + (1 - e) * (i / 6), [x, y] = tabPos(k), pulse = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.9);
        g.globalAlpha = 0.2 + 0.28 * pulse; g.beginPath(); g.arc(x, y - 1 * s, (1.5 + pulse) * s, 0, TAU); g.fill();
      }
    } else if (hooked && !placed) {
      const yTop = tokY + rT + 6 * s, yBot = yAt(hoverX) - halfT - 4 * s;
      if (yBot - yTop > 8) for (let i = 0; i < 5; i++) {
        const y = lerp(yTop, yBot, (i + 0.5) / 5), pulse = 0.5 + 0.5 * Math.sin(t * 3 - i);
        g.globalAlpha = 0.16 + 0.24 * pulse; g.beginPath(); g.arc(hoverX + rT * 1.25 * dir, y, (1.3 + pulse) * s, 0, TAU); g.fill();
      }
      g.globalAlpha = 1; glow(g, hoverX, yAt(hoverX), rT * 0.9, strapLite, 0.2 + 0.12 * Math.sin(t * 2.2));
    }
    g.restore();
  }

  function drawHandrail(t) {
    const k = smooth(clamp((E.now() - twistAt) / 2.2));
    const lift = rT * 1.25 + 8 * s;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.beginPath();
    const last = Math.max(1, Math.round(N1 * k));
    for (let i = 0; i <= last; i++) { const y = yB - lift + (PY[i] - yB) * 0.35 + Math.sin(t * 0.9 + i * 0.3) * 0.8 * s; i ? g.lineTo(PX[i], y) : g.moveTo(PX[i], y); }
    g.strokeStyle = rgba(strapLite, 0.36); g.lineWidth = 2 * s; g.stroke();
    g.strokeStyle = rgba(strapLite, 0.1); g.lineWidth = 7 * s; g.stroke();
    glow(g, PX[last], yB - lift + (PY[last] - yB) * 0.35, 10 * s, '#ffffff', 0.5);
    g.restore();
  }

  function drawTwistLights(t) {
    const k0 = E.now() - twistAt;
    for (const L of tLights) {
      const k = ease.inOutSine(clamp((k0 - L.delay) / 1.7));
      if (k <= 0) continue;
      const bx = lerp(rootX, hookX, L.u), x = bx + Math.sin(k * Math.PI) * L.sx * span;
      const yTo = yAt(bx) + halfT + 8 * s;
      const y = lerp(mistY, yTo, k) + (reduced ? 0 : Math.sin(t * 1.3 + L.u * 9) * 1.2 * s * k);
      if (k >= 1) { g.strokeStyle = rgba(mix(warm, '#ffffff', 0.4), 0.55); g.lineWidth = 1.1 * s; g.beginPath(); g.moveTo(x, y - 4.5 * s); g.lineTo(x, yTo - 8 * s); g.stroke(); }
      glow(g, x, y, 22 * s, warm, 0.62);
      orb(g, x, y, 4.8 * s, mix(warm, '#ffffff', 0.45));
    }
  }

  /** thin-film shimmer on a bubble's rim: three soft hues drifting slowly round it */
  function filmRim(x, y, r, t, a = 1) {
    if (a <= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineWidth = Math.max(1.2, r * 0.07);
    const sp = reduced ? 0.05 : 0.22;
    for (let k = 0; k < 3; k++) {
      const a0 = t * sp + k * 2.1;
      g.strokeStyle = rgba(FILM[k], 0.34 * a); g.beginPath(); g.arc(x, y, r * 0.95, a0, a0 + 1.1); g.stroke();
    }
    g.restore();
  }
  function jellyBubble(x, y, r, col, tintK, a = 1) {
    const c0 = mix(col, storm, tintK);
    g.save(); g.globalAlpha *= a;
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, rgba(mix(c0, '#ffffff', 0.55), 0.94)); gr.addColorStop(0.6, rgba(c0, 0.66)); gr.addColorStop(1, rgba(mix(c0, ink, 0.4), 0.82));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = Math.max(1, r * 0.05); g.stroke();
    g.globalCompositeOperation = 'lighter';
    glow(g, x, y + r * 0.2, r * 0.9, c0, 0.3);
    g.fillStyle = 'rgba(255,255,255,0.36)'; g.beginPath(); g.ellipse(x - r * 0.32, y - r * 0.45, r * 0.36, r * 0.17, -0.5, 0, TAU); g.fill();
    g.restore();
  }

  function drawFollowers(t, fin) {
    // threads first, then the bubbles
    g.save(); g.lineCap = 'round'; g.globalAlpha = 1 - fin;
    const ax0 = tokX, ay0 = tokY - rT * 0.92;
    for (const f of fols) {
      const bx = f.sp.x, by = f.sp.y + rF * 0.95, ax = ax0 + (bx - ax0) * 0.12;
      const cx = (ax + bx) / 2 - f.sp.sx.v * 0.05, cy = (ay0 + by) / 2 + 6 * s;
      g.strokeStyle = rgba(isleDeep, 0.25); g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(ax, ay0); g.quadraticCurveTo(cx, cy, bx, by); g.stroke();
      g.strokeStyle = rgba(strapLite, 0.7); g.lineWidth = 1.1 * s; g.stroke();
    }
    g.restore();
    fols.forEach((f, k) => {
      const x = f.sp.x, y = f.sp.y, tintK = tint0 * (1 - smooth(f.wash));
      const lift = fin * (heavy ? 0.2 : 0.6);
      glow(g, x, y, rF * 1.8, f.washed || fin ? mix(warm, strapLite, 0.4) : strapLite, 0.2 + 0.2 * lift + (f.washing && !f.washed ? 0.35 * (1 - f.wash) : 0));
      if (f.ph >= 0) photos.draw(g, f.ph, x, y, rF * 2, { shape: 'bubble', tone: 'storm', toneMix: tintK, glow: 0.3 + 0.3 * lift, glowColour: strapLite, shadow: false, rot: Math.sin(t * 0.5 + k) * 0.05 * (reduced ? 0 : 1) });
      else {
        const fc = k % 2 ? mix(pal.accent, '#ffffff', 0.3) : decoCol;
        jellyBubble(x, y, rF * 0.82, fc, tintK * 0.55);
        const fx = x + Math.sin(t * 1.3 + f.seed) * rF * 0.22, fy = y + Math.cos(t * 1.1 + f.seed) * rF * 0.18;
        glow(g, fx, fy, rF * 0.7, warm, 0.5 + 0.2 * Math.sin(t * 2 + f.seed)); orb(g, fx, fy, 1.8 * s, mix(warm, '#ffffff', 0.6));
      }
      filmRim(x, y, f.ph >= 0 ? rF : rF * 0.82, t + f.seed, 0.5);
      if (fin < 1) orb(g, x, y + rF * 0.97, 2 * s, strapLite, { alpha: 1 - fin });   // the little knot each thread is tied to
      if (fin > 0) glow(g, x, y, rF * 2.2, warm, 0.22 * fin);
    });
    if (fin < 1) orb(g, ax0, ay0, 2.8 * s, strapLite, { alpha: 1 - fin });
  }

  function drawHero(t, c, arr, fin) {
    const x = tokX, y = tokY, sq = sqS.x, tintK = tint0 * (1 - smooth(invLerp(0.04, 0.92, c))) * (1 - fin);
    const breathe = fin && heavy ? 0.5 + 0.5 * Math.sin((t - finAt) * 1.1) : 0;
    glow(g, x, y, rT * (1.9 + 0.35 * breathe * fin), arr > 0 || fin ? warm : heroCol, 0.24 + 0.22 * grab + 0.18 * arr + 0.2 * fin + 0.12 * breathe * fin);
    const showWords = E.phase !== 'law';
    // the word tag hangs behind the bubble's lower edge on a short loop, and swings
    const px = x, py = y + rT * (0.8 - sq * 0.5), Lp = 34 * s;
    if (heroPh >= 0 && showWords) {
      const half = tagMax / 2 + 14, sx = clamp(px, stage.x + half, stage.x + W - half) - px;
      g.save(); g.translate(px, py); g.rotate(tagA);
      g.strokeStyle = rgba(strapLite, 0.85); g.lineWidth = 1.3 * s;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(sx - 12 * s, Lp - 15 * s); g.moveTo(0, 0); g.lineTo(sx + 12 * s, Lp - 15 * s); g.stroke();
      words.draw(g, sx, Lp, { style: 'plate', size: Math.max(12, rT * 0.27), maxWidth: tagMax, lines: 2, glowColour: arr > 0 ? warm : strapCol });
      g.restore();
    }
    g.save();
    g.translate(x, y + rT); g.scale(1 + sq, 1 - sq); g.translate(0, -rT);
    if (heroPh >= 0) {
      photos.draw(g, heroPh, 0, 0, rT * 2, { shape: 'bubble', tone: 'storm', toneMix: tintK, glow: 0.35 + 0.25 * arr, glowColour: arr > 0 ? warm : strapLite, shadow: false, rot: tilt * 0.6 });
      g.strokeStyle = rgba(strapLite, 0.5); g.lineWidth = 1.5 * s; g.beginPath(); g.arc(0, 0, rT - 0.5, 0, TAU); g.stroke();
    } else {
      jellyBubble(0, 0, rT, heroCol, tintK * 0.75);
    }
    filmRim(0, 0, rT, t, 0.6 + 0.4 * (1 - tintK));
    g.restore();
    // the tag's loop passes over the bubble's edge (so it reads as attached)
    if (heroPh >= 0 && showWords) { glow(g, px, py, 7 * s, strapLite, 0.5); orb(g, px, py, 3.1 * s, mix(strapCol, '#ffffff', 0.35)); }
    // with no photo, the words glow inside the jelly token itself
    if (heroPh < 0 && showWords) words.draw(g, x, y + rT * 0.04, { style: 'light', size: Math.max(12, rT * 0.27), maxWidth: rT * 1.7, lines: 3, rot: tilt * 0.4, glowColour: mix(heroCol, '#ffffff', 0.2) });
  }

  // ------------------------------------------------------------ input --
  const inStage = (q) => q.x >= stage.x - 12 && q.x <= stage.x + W + 12 && q.y >= stage.y - 12 && q.y <= stage.y + H + 12;
  return {
    get progress() { return p; },
    get done() { return arrived && p >= 0.999 && drag == null && assistTo == null && settledAt >= 0; },
    frame,
    down(q) {
      if (finAt >= 0 || drag != null || !inStage(q)) return;
      drag = q.id; lastX = q.x; lastY = q.y; frameDist = 0; grab = 1;
      if (!hooked) { startHum(); note('bubble', 3, 0.26); tabS.sy.v -= 60 * s; poke(endX, -40 * s); }
      else if (!placed) { note('bubble', 5, 0.26); tokS.sy.v -= 40 * s; poke(hoverX, -30 * s); tagV += 0.8; }
      else { note('bubble', 6, 0.24); sqS.v += 1.2; poke(tokX, 50 * s); }
      E.haptic('light');
    },
    move(q) {
      if (q.id !== drag) return;
      const dx = q.x - lastX, dy = q.y - lastY;
      lastX = q.x; lastY = q.y;
      frameDist += Math.hypot(dx, dy);
      const k = lerp(1, 0.45, invLerp(900 * s, 2400 * s, fingerSpeed));   // rushing: the jelly resists
      if (!hooked) wanted = clamp(wanted + ((-dir * dx) / stretchLen) * P1 * k, 0, P1);
      else if (!placed) wanted = clamp(wanted + (dy / lowerLen) * (P2 - P1) * k, P1, P2);
      else wanted = clamp(wanted + ((dir * dx) / crossLen) * (1 - P2) * k, P2, 1);
      if (wanted > p + BANK) wanted = p + BANK;
      if (E.locked && wanted >= p + BANK * 0.8) notYet();
    },
    up(q) {
      if (q.id !== drag) return;
      drag = null; stopHum();
      if (!hooked) tabS.sy.v += 50 * s;      // a little jelly rebound where it was left
    },
    assist() {
      if (finAt >= 0) return;
      const base = Math.max(wanted, p);
      const next = STEPS.find((x) => x > base + 1e-4);
      if (next == null) return;
      assistTo = next; grab = 1;
      if (!hooked) { tabS.sy.v -= 40 * s; poke(endX, -30 * s); }
      else if (!placed) { tokS.sy.v -= 20 * s; tagV += 0.6; }
      else poke(tokX, 40 * s);
      E.haptic('light');
    },
    pointAt(q) {
      q = clamp(q);
      if (q <= P1) { const [x, y] = tabPos(q / P1); return { x, y }; }
      if (q <= P2) { const k = ease.inOutSine((q - P1) / (P2 - P1)); return { x: hoverX, y: lerp(hoverY, yB - halfT1 - rT + sagStatic(hoverX, 1), k) }; }
      const c = (q - P2) / (1 - P2), x = lerp(hoverX, padX, c);
      const onS = (x - rootX) * dir < 0;
      return { x, y: onS ? yB - halfT1 - rT + sagStatic(x, weightK(c)) : bankTop - rT };
    },
    hint() {
      if (finAt >= 0 || p >= 0.999) return null;
      const pts = [];
      if (!hooked) {
        const e0 = clamp(p / P1);
        for (let i = 0; i <= 14; i++) pts.push(tabPos(lerp(e0, 1, i / 14)));
        pts[0] = [endX, endY];
      } else if (!placed) {
        const y1 = yAt(hoverX) - halfT - rT + 14 * s;
        for (let i = 0; i <= 10; i++) pts.push([tokX, lerp(tokY, y1, i / 10)]);
      } else {
        for (let i = 0; i <= 16; i++) { const x = lerp(tokX, padX + dir * 4 * s, i / 16); pts.push([x, (x - rootX) * dir < 0 ? yAt(x) - halfT - rT : bankTop - rT]); }
      }
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      if (twistKind === 0) E.particles.burst(midX, mistY, low ? 3 : 8, { speed: 30, colour: warm, life: 1.2, size: 5, dir: -Math.PI / 2, spread: 1.2 });
      else if (twistKind === 1) E.particles.burst(rootX, yB - rT * 1.2, low ? 3 : 7, { speed: 26, colour: strapLite, life: 1.1, size: 4, kind: 'glint' });
      else addRing(midX, 0.7);
    },
    finish() {
      if (finAt >= 0) return;
      finAt = E.now(); stopHum(); assistTo = null;
      washHero(true);
      for (const f of fols) washFol(f, true);
      // energetic feelings: the bridge gives one happy twang and the token hops; heavy feelings: it simply settles
      if (!heavy) {
        for (let i = 1; i < N1; i++) v[i] -= 150 * s * Math.sin((Math.PI * i) / N1);
        sqS.v -= reduced ? 0.6 : 1.6;
        E.particles.burst(padX, bankTop - rT, low ? 6 : 16, { speed: 64, colour: warm, life: 1.5, size: 5, kind: 'glint', dir: -Math.PI / 2, spread: 2.4 });
        addRing(midX - span * 0.15, 0.6); addRing(midX + span * 0.2, 0.5);
      }
      else for (let i = 0; i < (low ? 3 : 7); i++) E.particles.emit({ x: padX + (E.rand() - 0.5) * rT * 2, y: bankTop - 4 * s, vy: -16 - E.rand() * 10, life: 2.4, size: 5, colour: warm, alpha: 0.6, drag: 0.99 });
      E.sound(heavy ? 'breathe-out' : 'bloom', { intensity: 0.32 });
    },
    destroy() { stopHum(); },
  };
}
