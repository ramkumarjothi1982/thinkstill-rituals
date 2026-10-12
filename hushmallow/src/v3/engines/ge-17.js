// GE-17 · SOAP FILM — elastic bubble membrane (edge stretch).
// A small, tense soap film hangs in the middle of the stage, its colours
// swirling in real thin-film interference. Touch its glistening rim and draw
// it slowly outwards: the rim bulges elastically under your finger, tension
// bands crowd together where you pull, and the film follows you — larger,
// thinner and lighter — without ever breaking. Rushing thins it to silver and
// it lags behind. Win: the film fills the soft dotted gentle-size outline.
//
// Photos: the hero photo is seen through the film and softens into a lighter,
// harmless glow as the film spreads; the others cling to the film as small
// bubbles and join it (softly merging into its surface) when the rim reaches
// them. Words float on the film surface.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, hex, glow, glint, shadow, canvas, angDiff } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-17',
  howTo: 'Touch the film’s rim and spread it slowly to the dotted outline.',
  steps: ['Touch the shimmering rim of the soap film.', 'Draw it slowly outwards — rushing thins it, so let it follow you.', 'Keep spreading until the film fills the soft dotted outline.'],
  tapAlt: 'each press spreads the film one gentle stretch',
  words: 'Your words float on the film’s surface, drifting in its colours as it grows larger and lighter.',
  photos: {
    where: 'Your photos are seen through the soap film and cling to its edge as little bubbles.',
    becomes: 'reflections in an iridescent film and small clinging bubbles',
    touch: 'You spread the film outwards until its rim reaches each bubble;',
    change: 'each bubble joins the film and every picture softens into a lighter, harmless glow.',
    payoff: 'At the end the film rests full and light, holding them all as gentle colour.',
  },
  finaleSec: 4,
};

const N = 64;                 // rim vertices
const CAP = 0.06;             // input the law gate may bank
const KAPPA = 5;              // how far a pull spreads along the rim
const SWEEP = 0.9;            // the suggested pull point drifts round the rim as it grows
const IRIS = ['#ff9ad5', '#ffd58a', '#a8ffcf', '#8fd8ff', '#b9a0ff', '#ff9ad5'];

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = E.reduced, lowStim = E.lowStim, heavy = E.heavy, calm0 = E.calm;
  const T = reduced || lowStim ? 72 : 88;   // interference texture resolution
  const flowK = (heavy ? 0.65 : 1) * (1 - calm0 * 0.5) * (reduced ? 0.4 : 1);

  // ---- round variety (loop rounds: new pull point, colours, bubbles, hero)
  const A0 = E.round === 1 ? -Math.PI * 0.22 : -Math.PI / 2 + (E.rand() - 0.5) * 1.6;
  const hueShift = E.round === 1 ? 0 : 60 + E.rand() * 200;
  let swirl = E.rand() < 0.5 ? 1 : -1, swirlTo = swirl;
  const ph1 = E.rand() * TAU, ph2 = E.rand() * TAU;
  const [tR, tG, tB] = hex(mix(pal.glow, '#ffffff', 0.25 + calm0 * 0.3));

  const n = photos.n;
  const hero = n ? (E.round - 1) % n : -1;
  const others = [];
  for (let i = 0; i < n; i++) if (i !== hero) others.push(i);
  const K = Math.max(others.length, lowStim ? 3 : 4);
  const rot0 = E.rand() * TAU;
  const sats = Array.from({ length: K }, (_, k) => ({ ph: -1, a: rot0 + (k / K) * TAU + (E.rand() - 0.5) * 0.3, u: (k * 0.618 + E.rand() * 0.25) % 1,
    bob: E.rand() * TAU, merged: false, m: 0, soft: 0, pa: 0, pr: 0.6, hue: k % 5 }));
  others.forEach((ph, j) => { sats[Math.round((j * K) / others.length) % K].ph = ph; });
  let heroCk = false;

  // ---- geometry
  let cx, cy, Rt, r0, M, Rd, sr, heroS = 0;
  function fit() {
    Rt = Math.min(stage.w * 0.385, stage.h * 0.34);
    cx = stage.cx; cy = stage.cy;
    r0 = Rt * 0.52; M = Rt * 0.28; Rd = Rt * 1.36; sr = clamp(Rt * 0.155, 22, 32);
    if (hero >= 0) { const s = photos.size(hero, 'natural', 100); heroS = (Rt * 2.16 * 100) / Math.max(1, Math.min(s.w, s.h)); }
  }
  fit();
  E.onResize(fit);

  // ---- state
  const ang = new Float32Array(N), ca = new Float32Array(N), sa = new Float32Array(N);
  for (let j = 0; j < N; j++) { ang[j] = (j / N) * TAU; ca[j] = Math.cos(ang[j]); sa[j] = Math.sin(ang[j]); }
  const d = new Float32Array(N), vel = new Float32Array(N), want = new Float32Array(N), kw = new Float32Array(N), acc = new Float32Array(N);
  const rim = new Float32Array(N + 1), vx = new Float32Array(N), vy = new Float32Array(N);
  const pullA = new Float32Array(4), pullC = new Float32Array(4), pullN = new Float32Array(4), pullS = new Float32Array(4);
  let np = 0;
  let wanted = 0, prog = 0, shown = 0, assistTo = null, doneFlag = false, finAt = -1;
  let rush = 0, flowT = E.rand() * 20, clockT = 0, lastNote = 0, noteAt = -9, waitAt = -9, rushHinted = false;
  let tinyAt = 1.2, maxRim = 0, photoR = 0, tenseAmp = 0, breathAmp = 0, maxS = 0;
  const pts = new Map();     // pointer id → {mode: 'pull'|'poke', a, r, x, y, s, spd, acc}
  const ghost = { a: A0, aTo: A0, s: 0 };
  const pokes = Array.from({ length: 4 }, () => ({ x: 0, y: 0, age: 9, amp: 0 }));
  let pokeI = 0;
  const tiny = Array.from({ length: 16 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, age: 0, life: 1, hue: 0, ph: 0 }));
  const wob = new Wobble();
  let hum = null;

  const rBase = () => r0 + (Rt - r0) * shown;
  const satDist = (s) => lerp(r0 + sr + Rt * 0.1, Rt + sr * 0.15, s.u);
  const HA = (p) => A0 - clamp(p) * SWEEP;
  const tense = (a) => tenseAmp * (0.7 * Math.sin(2 * a + ph1 + 0.35 * Math.sin(clockT * 0.35)) + 0.45 * Math.sin(3 * a + ph2 - clockT * 0.22))
    + breathAmp * Math.sin(clockT * 1.1 + 4 * a);
  function rimAt(a) {
    let f = (a / TAU) % 1; if (f < 0) f += 1; f *= N;
    const j = Math.min(N - 1, f | 0), fr = f - j;
    return rim[j] + (rim[j + 1] - rim[j]) * fr;
  }
  function stretchFor(r, a) { const x = r - (rBase() + tense(a)); return x > 0 ? M * Math.tanh(x / M) : Math.max(-Rt * 0.1, x * 0.6); }
  function addPoke(x, y, amp) { const pk = pokes[pokeI++ % 4]; pk.x = x; pk.y = y; pk.age = 0; pk.amp = amp * (reduced ? 0.6 : 1); }
  function waitNudge() {
    const now = E.now();
    if (now - waitAt < 0.9) return;
    waitAt = now; E.checkpoint('wait');
    if (!reduced) wob.kick(0.6);
  }

  // ---- film interference texture (low-res, recomputed in place every frame)
  const fc = canvas(T, T), fg = fc.getContext('2d');
  const img = fg.createImageData(T, T), px = img.data;
  const TX = new Float32Array(T * T), TY = new Float32Array(T * T), TR = new Float32Array(T * T);
  const TC = new Float32Array(T * T), TS = new Float32Array(T * T), TI = new Float32Array(T * T);
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
    const k = j * T + i, x = ((i + 0.5) / T) * 2 - 1, y = ((j + 0.5) / T) * 2 - 1, r = Math.hypot(x, y) || 1e-6;
    let a = Math.atan2(y, x); if (a < 0) a += TAU;
    TX[k] = x; TY[k] = y; TR[k] = r; TC[k] = x / r; TS[k] = y / r; TI[k] = Math.min(N - 1e-3, (a / TAU) * N);
  }
  const kR = (TAU * 1.33) / 650, kG = (TAU * 1.33) / 540, kB = (TAU * 1.33) / 455;
  function updateFilm(fin) {
    const rb = rBase(), p = shown;
    const H0 = lerp(720, 330, smooth(p)) + hueShift * (1 - p * 0.5) - fin * 60;
    const L = clamp(lerp(0.05, 0.4, p) + fin * 0.28 + calm0 * 0.1), lt = 1 - L;
    const aMul = lerp(0.85, 0.62, p) * (hero >= 0 ? lerp(0.7, 0.9, p) : 1) * (1 - fin * 0.2);
    const sw = 210 * (heavy ? 0.8 : 1);
    const T1 = flowT * 0.9, T2 = flowT * 0.7, T3 = flowT * 1.1;
    const margin = ((Rd * 2) / T) * 1.5, inv = Rd / rb, tw = 0.18;
    const tr = tR * tw, tg = tG * tw, tb = tB * tw, sc = 255 * (1 - tw);
    for (let k = 0, o = 0; k < T * T; k++, o += 4) {
      const rw = TR[k] * Rd;
      const f = TI[k], j = f | 0;
      const rr = rim[j] + (rim[j + 1] - rim[j]) * (f - j);
      if (rw > rr + margin) { px[o + 3] = 0; continue; }
      const edge = rw < rr ? 1 - rw / rr : 0;
      const fx = TX[k] * inv, fy = TY[k] * inv;
      // thickness (nm): drains towards the bottom, swirls, thickens at the meniscus
      let h = H0 * (1 + 0.45 * fy)
        + sw * (Math.sin(fx * 2.9 + T1 + 1.5 * Math.sin(fy * 2.3 - T2)) + 0.6 * Math.sin(fy * 4.1 - T3 + 1.3 * Math.sin(fx * 3.2 + T1 * 0.8)))
        + 360 * Math.exp(-edge * 11);
      // tension bands: where the rim is drawn out, the film thins into crowded bands
      for (let q = 0; q < np; q++) {
        const s = pullS[q] / M;
        if (s <= 0.02) continue;
        const w = Math.exp((TC[k] * pullC[q] + TS[k] * pullN[q] - 1) * KAPPA * 0.8) * s;
        if (w > 0.015) h += w * (240 * Math.cos(edge * (16 + 30 * w) * Math.PI) - 160 - 200 * rush);
      }
      for (let q = 0; q < 4; q++) {
        const pk = pokes[q];
        if (pk.age > 2.5) continue;
        const dx = TX[k] * Rd - pk.x, dy = TY[k] * Rd - pk.y, dd = Math.sqrt(dx * dx + dy * dy);
        h += pk.amp * Math.exp(-pk.age * 1.5 - dd / (50 + pk.age * 110)) * Math.sin(dd * 0.09 - pk.age * 7);
      }
      if (h < 90) h = 90;
      const a = Math.sin(kR * h), b = Math.sin(kG * h), c = Math.sin(kB * h);
      let R = a * a, G = b * b, B = c * c;
      const e = (R + G + B) * 0.333;
      R = e + (R - e) * 1.35; G = e + (G - e) * 1.35; B = e + (B - e) * 1.35;
      // very thin film turns silvery-light instead of dark: it thins, it never breaks
      if (h < 260) { const th = Math.min(1, (260 - h) / 170); R += (0.92 - R) * th; G += (0.92 - G) * th; B += (0.95 - B) * th; }
      px[o] = ((0.1 + 0.9 * R) * lt + L) * sc + tr;
      px[o + 1] = ((0.1 + 0.9 * G) * lt + L) * sc + tg;
      px[o + 2] = ((0.1 + 0.9 * B) * lt + L) * sc + tb;
      px[o + 3] = 255 * aMul * (0.4 + 0.6 * e) * (0.82 + 0.45 * Math.exp(-edge * 7));
    }
    fg.putImageData(img, 0, 0);
  }

  // ---- membrane physics: radial rim offsets with springs + surface tension
  function physics(dt) {
    np = 0;
    for (const q of pts.values()) if (q.mode === 'pull' && np < 3) { pullA[np] = q.a; pullS[np] = q.s; np++; }
    if (ghost.s > 0.5) { pullA[np] = ghost.a; pullS[np] = ghost.s; np++; }
    for (let q = 0; q < np; q++) { pullC[q] = Math.cos(pullA[q]); pullN[q] = Math.sin(pullA[q]); }
    const jit = reduced ? 0 : rush * Rt * 0.01;
    for (let j = 0; j < N; j++) {
      let w0 = 0, k0 = 0;
      for (let q = 0; q < np; q++) { const w = Math.exp((ca[j] * pullC[q] + sa[j] * pullN[q] - 1) * KAPPA); w0 += w * pullS[q]; if (w > k0) k0 = w; }
      want[j] = Math.min(M * 1.15, w0) + k0 * jit * Math.sin(clockT * 31 + j * 1.7);
      kw[j] = k0;
    }
    if (dt <= 0) return;
    const sub = 2, h = Math.min(dt, 1 / 30) / sub, damp = reduced ? 12 : 7;
    for (let s = 0; s < sub; s++) {
      for (let j = 0; j < N; j++) acc[j] = (40 + 260 * kw[j]) * (want[j] - d[j]) + 320 * (d[(j + N - 1) % N] + d[(j + 1) % N] - 2 * d[j]) - damp * vel[j];
      for (let j = 0; j < N; j++) { vel[j] += acc[j] * h; d[j] += vel[j] * h; }
    }
  }
  function computeRim(fin) {
    const rb = rBase(), wv = reduced ? 0 : wob.v * Rt * 0.015, br = reduced ? 0 : fin * Rt * 0.01 * Math.sin(clockT * 1.3);
    maxRim = 0;
    for (let j = 0; j < N; j++) {
      const r = rb + tense(ang[j]) + d[j] + wv * Math.sin(ang[j] * 3 + clockT * 2) + br;
      rim[j] = r; if (r > maxRim) maxRim = r;
      vx[j] = cx + ca[j] * r; vy[j] = cy + sa[j] * r;
    }
    rim[N] = rim[0];
  }
  function rimPath() {
    g.beginPath();
    g.moveTo((vx[N - 1] + vx[0]) / 2, (vy[N - 1] + vy[0]) / 2);
    for (let j = 0; j < N; j++) { const k = (j + 1) % N; g.quadraticCurveTo(vx[j], vy[j], (vx[j] + vx[k]) / 2, (vy[j] + vy[k]) / 2); }
    g.closePath();
  }

  function merge(s, i) {
    if (s.merged) return;
    s.merged = true; s.m = 0; s.pa = s.a; s.pr = 0.56 + E.rand() * 0.16;
    const D = satDist(s), x = cx + Math.cos(s.a) * D, y = cy + Math.sin(s.a) * D;
    addPoke(x - cx, y - cy, 170);
    E.ripples.add(x, y, { colour: pal.glow, speed: 46, alpha: 0.4, r: sr });
    E.sound('bubble', { note: (i * 2 + 3) % 10, intensity: 0.35, pan: clamp((x - cx) / Rt, -1, 1) * 0.5 });
    E.haptic('soft');
    if (s.ph >= 0) { photos.dust(s.ph, x, y, sr * 2, reduced ? 6 : 12, { shape: 'bubble', up: 12, speed: 20 }); E.checkpoint('photo', s.ph); }
    else E.particles.burst(x, y, reduced ? 3 : 7, { speed: 40, colour: '#ffffff', life: 0.9, size: 4, kind: 'glint' });
  }
  function spawnTiny(boost) {
    const b = tiny.find((o) => !o.on);
    if (!b) return;
    const a = -Math.PI * (0.12 + E.rand() * 0.76), r = rimAt(a);
    b.on = true; b.x = cx + Math.cos(a) * r; b.y = cy + Math.sin(a) * r; b.vx = Math.cos(a) * (4 + E.rand() * 6);
    b.vy = -(10 + E.rand() * (boost ? 22 : 12)); b.r = (boost ? 4 : 3) + E.rand() * 5; b.age = 0; b.life = 3.6 + E.rand() * 2.4;
    b.hue = Math.floor(E.rand() * 5); b.ph = E.rand() * TAU;
  }

  // ------------------------------------------------------------ frame --
  function frame(dt, t) {
    clockT += dt;
    const fin = finAt >= 0 ? smooth(clamp((E.now() - finAt) / 2.6)) : 0;
    // "Tap instead": a ghost fingertip draws the rim outwards, then the film follows
    ghost.a += angDiff(ghost.a, ghost.aTo) * Math.min(1, dt * 3);
    if (assistTo != null) {
      ghost.s = Math.min(M * 0.6, ghost.s + dt * M * 2.6);
      if (ghost.s > M * 0.3) wanted = Math.max(wanted, Math.min(assistTo, prog + CAP, wanted + dt * 0.42));
      if (assistTo - wanted < 1e-3) assistTo = null;
      else if (E.locked && wanted >= prog + CAP - 1e-3) waitNudge();
    } else ghost.s = Math.max(0, ghost.s - dt * M * 1.8);
    prog = E.gate(wanted);
    if (wanted > prog + CAP) wanted = prog + CAP;
    shown = lerp(shown, prog, 1 - Math.exp(-dt * 4.5));

    // pointers: speed per frame (robust to coalesced events) and current stretch
    maxS = ghost.s / M;
    let rushT = 0, anyPull = false;
    for (const q of pts.values()) {
      if (dt > 0) { q.spd = lerp(q.spd, q.acc / dt, 0.25); q.acc = 0; }
      if (q.mode !== 'pull') continue;
      anyPull = true; q.s = stretchFor(q.r, q.a);
      maxS = Math.max(maxS, q.s / M);
      rushT = Math.max(rushT, invLerp(380, 1100, q.spd / stage.s));
    }
    rush = lerp(rush, rushT, 1 - Math.exp(-dt * (rushT > rush ? 6 : 2)));
    tenseAmp = Rt * (heavy ? 0.06 : 0.045) * (1 - shown) * (1 - fin) * (1 - calm0 * 0.5);
    breathAmp = reduced ? 0 : Rt * 0.007 * (1 - fin * 0.5);
    wob.update(dt);
    physics(dt);
    computeRim(fin);
    photoR = photoR ? lerp(photoR, maxRim, 1 - Math.exp(-dt * 8)) : maxRim;

    // growth: a soft rising glass note every little stretch the film takes
    const now = E.now();
    if (prog - lastNote > 0.05 && now - noteAt > 0.12) {
      lastNote = prog; noteAt = now;
      E.sound('glass', { note: Math.min(9, 1 + Math.floor(prog * 9)), intensity: 0.26, pitch: 1 + shown * 0.1 });
      E.haptic('tick');
    }
    if (!heroCk && hero >= 0 && prog >= 0.5) {
      heroCk = true; E.checkpoint('photo', hero);
      photos.dust(hero, cx, cy, rBase() * 1.3, reduced ? 6 : 14, { shape: 'circle', up: 18, speed: 16 });
    }
    // little bubbles join the film when its rim reaches them
    for (let i = 0; i < K; i++) {
      const s = sats[i];
      if (s.merged) { s.m = Math.min(1, s.m + dt / 0.9); s.soft = Math.min(1, s.soft + dt * (heavy ? 0.18 : 0.25)); s.pa += dt * 0.05 * swirl * flowK; continue; }
      if (rimAt(s.a) >= satDist(s) - sr * 0.55) merge(s, i);
    }
    swirl = lerp(swirl, swirlTo, 1 - Math.exp(-dt * 0.8));
    flowT += dt * flowK * swirl * (1 + rush * 1.2) * (1 - fin * 0.4);
    for (const pk of pokes) pk.age += dt;
    tinyAt -= dt;
    if (tinyAt <= 0) { spawnTiny(false); tinyAt = (lowStim ? 5 : 2.8) + E.rand() * 1.5 - (fin && !heavy ? 2 : 0); }
    for (const b of tiny) if (b.on) { b.age += dt; b.x += (b.vx + (reduced ? 0 : Math.sin(clockT * 1.6 + b.ph) * 6)) * dt; b.y += b.vy * dt; b.vx *= 1 - dt * 0.3; if (b.age > b.life) b.on = false; }

    // the hum of a stretched film
    if (anyPull || ghost.s > 1) {
      if (!hum) hum = E.hold?.('hum', { intensity: 0.12 }) || null;
      hum?.update?.({ intensity: 0.1 + 0.3 * clamp(maxS), pitch: 0.85 + 0.35 * shown });
    } else if (hum) { hum.stop?.(); hum = null; }

    if (!doneFlag && prog >= 0.999 && shown > 0.985 && !anyPull && assistTo == null && ghost.s < 1) {
      let mx = 0;
      for (let j = 0; j < N; j++) mx = Math.max(mx, Math.abs(d[j]));
      if (mx < Rt * 0.04) { doneFlag = true; sats.forEach(merge); E.sound('settle', { intensity: 0.45 }); }
    }

    // ---- drawing
    drawBackdrop(fin);
    drawOutline(fin);
    drawFilm(fin);
    drawRim(fin);
    drawBands(fin);
    drawSats(fin);
    drawTouches(fin);
    drawTiny();
  }

  // ---------------------------------------------------------- drawing --
  function drawBackdrop(fin) {
    const rb = rBase();
    shadow(g, cx, cy + Rt * 1.2, Rt * 0.78, Rt * 0.1, 0.22);
    glow(g, cx, cy + Rt * 1.16, Rt * (0.45 + 0.25 * shown), mix(pal.glow, '#ffd6f2', 0.4 + 0.2 * Math.sin(flowT * 0.5)), 0.14 + 0.1 * shown + 0.1 * fin);
    glow(g, cx, cy, rb * 1.7, pal.glow, 0.11 + 0.04 * Math.sin(clockT * 0.6) + fin * (heavy ? 0.08 : 0.14));
  }
  function drawOutline(fin) {
    const nd = 72, rot = clockT * 0.03 * (reduced ? 0.3 : 1), al0 = 1 - fin;
    if (al0 <= 0.01) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(pal.glow, (0.06 + 0.05 * shown) * al0); g.lineWidth = 12;
    g.beginPath(); g.arc(cx, cy, Rt, 0, TAU); g.stroke();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = mix(pal.glow, '#ffffff', 0.55);
    for (let i = 0; i < nd; i++) {
      const a = (i / nd) * TAU + rot, lit = rimAt(a) >= Rt - 3;
      g.globalAlpha = (lit ? 0.95 : 0.42 + 0.4 * (0.5 + 0.5 * Math.sin(clockT * 0.9 - i * 0.35))) * al0;
      g.beginPath(); g.arc(cx + Math.cos(a) * Rt, cy + Math.sin(a) * Rt, lit ? 2.6 : 2, 0, TAU); g.fill();
    }
    g.restore();
  }
  function drawFilm(fin) {
    updateFilm(fin);
    const rb = rBase();
    g.save();
    rimPath(); g.clip();
    if (hero >= 0) {
      const k = (photoR * 2.1) / (Rt * 2.16);
      g.save(); g.translate(cx, cy); g.scale(k, k);
      photos.draw(g, hero, 0, 0, heroS, { shape: 'natural', blur: smooth(shown) * 0.72 + fin * 0.28, tone: 'glow', toneMix: shown * 0.55 + fin * 0.3,
        alpha: 1 - shown * 0.22 - fin * 0.1, shadow: false });
      g.restore();
    } else {
      // a bubble's own reflection: sky above, a curved bright horizon, deep below
      const gr = g.createLinearGradient(cx, cy - rb, cx, cy + rb);
      gr.addColorStop(0, rgba(mix(pal.sky, '#ffffff', 0.25), 0.34)); gr.addColorStop(0.5, rgba(pal.sky, 0.14));
      gr.addColorStop(0.62, rgba(pal.deep, 0.32)); gr.addColorStop(1, rgba(pal.glow, 0.26));
      g.fillStyle = gr; g.fillRect(cx - maxRim, cy - maxRim, maxRim * 2, maxRim * 2);
    }
    // the iridescent film itself: a thin tint (reads on light skies) + a luminous screen layer
    g.imageSmoothingEnabled = true;
    g.globalAlpha = lerp(0.3, 0.14, shown) * (1 - fin * 0.5);
    g.drawImage(fc, cx - Rd, cy - Rd, Rd * 2, Rd * 2);
    g.globalAlpha = 1; g.globalCompositeOperation = 'screen';
    g.drawImage(fc, cx - Rd, cy - Rd, Rd * 2, Rd * 2);
    g.globalCompositeOperation = 'source-over';
    // reflections: curved horizon + window highlight
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = rb * 0.05;
    g.beginPath(); g.arc(cx, cy + rb * 1.35, rb * 1.3, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.3 + 0.1 * shown})`; g.lineWidth = rb * 0.065;
    g.beginPath(); g.arc(cx, cy, rb * 0.82, -2.6, -1.95); g.stroke();
    g.lineWidth = rb * 0.035; g.beginPath(); g.arc(cx, cy, rb * 0.82, -1.82, -1.62); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = rb * 0.04;
    g.beginPath(); g.arc(cx, cy, rb * 0.86, 0.3, 0.95); g.stroke();
    g.restore();
    glow(g, cx, cy - rb * 0.1, rb * 1.1, '#ffffff', 0.04 + 0.1 * shown + 0.18 * fin);
    // merged bubbles drift on the surface as softening colour
    for (let i = 0; i < K; i++) {
      const s = sats[i];
      if (!s.merged) continue;
      const k = ease.outCubic(s.m), D = lerp(satDist(s), s.pr * rb, k), a = lerp(s.a, s.pa, k);
      const x = cx + Math.cos(a) * D, y = cy + Math.sin(a) * D + (reduced ? 0 : Math.sin(clockT * 0.7 + s.bob) * 2);
      const size = sr * 2 * lerp(1, 1.3, s.soft) * (1 + fin * 0.1);
      if (s.ph >= 0) photos.draw(g, s.ph, x, y, size, { shape: 'bubble', blur: s.soft * 0.6 + fin * 0.3, tone: 'glow', toneMix: 0.2 + s.soft * 0.5 + fin * 0.2,
        alpha: lerp(1, 0.8, s.soft) * smooth(s.m * 1.4), glow: 0.4, glowColour: pal.glow, shadow: false });
      else glow(g, x, y, size * 0.75, IRIS[s.hue], 0.3 * smooth(s.m));
    }
    // words float on the film surface
    if (E.phase !== 'law') {
      const size = clamp(rb * 0.12, 13, 19);
      const wx = cx + (reduced ? 0 : Math.sin(clockT * 0.31) * rb * 0.04);
      const wy = cy + (hero >= 0 ? rb * 0.36 : rb * 0.04) + (reduced ? 0 : Math.sin(clockT * 0.5) * 3);
      words.draw(g, wx, wy, { style: 'light', size, maxWidth: rb * 1.35, lines: 3, alpha: 0.96, rot: reduced ? 0 : Math.sin(clockT * 0.23) * 0.035,
        glowColour: mix(pal.glow, '#ffc8ef', 0.5 + 0.5 * Math.sin(flowT * 0.3)) });
    }
    g.restore();
  }
  function drawRim(fin) {
    rimPath();
    g.save(); g.lineJoin = 'round';
    g.strokeStyle = rgba(pal.deep, 0.32); g.lineWidth = 6; g.stroke();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(pal.glow, 0.16 + 0.16 * clamp(maxS) + fin * 0.1); g.lineWidth = 10; g.stroke();
    if (g.createConicGradient) {
      const cg = g.createConicGradient(flowT * 0.4, cx, cy);
      for (let i = 0; i < IRIS.length; i++) cg.addColorStop(i / (IRIS.length - 1), IRIS[i]);
      g.strokeStyle = cg;
    } else g.strokeStyle = IRIS[1];
    g.globalAlpha = 0.75; g.lineWidth = 2.6; g.stroke();
    g.globalAlpha = 0.45 + 0.35 * shown + 0.2 * fin; g.strokeStyle = '#ffffff'; g.lineWidth = 1.1; g.stroke();
    g.restore();
    // a sparkle riding the window highlight
    const rb = rBase();
    glint(g, cx - rb * 0.52, cy - rb * 0.6, 7 + 2 * Math.sin(clockT * 1.3), '#ffffff', 0.45 + 0.15 * Math.sin(clockT * 0.9));
  }
  function drawBands(fin) {
    if (!np || fin >= 1) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineWidth = 1.3;
    for (let q = 0; q < np; q++) {
      const sn = clamp(pullS[q] / M);
      if (sn < 0.08) continue;
      let f = (pullA[q] / TAU) % 1; if (f < 0) f += 1;
      const jc = Math.round(f * N);
      for (let b = 1; b <= 4; b++) {
        const gap = lerp(12, 4.5, sn) * b;          // bands crowd together as the tension rises
        g.strokeStyle = b % 2 ? '#ffffff' : '#ffd6f4';
        for (let o = -9; o < 9; o++) {
          const j0 = (jc + o + N) % N, j1 = (j0 + 1) % N;
          const w0 = Math.exp((ca[j0] * pullC[q] + sa[j0] * pullN[q] - 1) * KAPPA), w1 = Math.exp((ca[j1] * pullC[q] + sa[j1] * pullN[q] - 1) * KAPPA);
          const al = 0.4 * sn * (1 - b / 5) * (w0 + w1) * 0.5 * (1 - fin);
          if (al < 0.02) continue;
          const r0b = rim[j0] - gap * (0.4 + 0.6 * w0), r1b = rim[j1] - gap * (0.4 + 0.6 * w1);
          g.globalAlpha = al;
          g.beginPath(); g.moveTo(cx + ca[j0] * r0b, cy + sa[j0] * r0b); g.lineTo(cx + ca[j1] * r1b, cy + sa[j1] * r1b); g.stroke();
        }
      }
    }
    g.restore();
  }
  function miniBubble(x, y, r, a, hue) {
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, rgba('#ffffff', 0.1 * a)); gr.addColorStop(0.7, rgba(pal.glow, 0.12 * a));
    gr.addColorStop(0.93, rgba(IRIS[hue], 0.5 * a)); gr.addColorStop(1, rgba('#ffffff', 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = rgba('#ffffff', 0.35 * a); g.lineWidth = 1; g.stroke();
    g.fillStyle = rgba('#ffffff', 0.45 * a); g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.13, -0.6, 0, TAU); g.fill();
  }
  function drawSats(fin) {
    const rb = rBase();
    for (let i = 0; i < K; i++) {
      const s = sats[i];
      const al = s.merged ? 1 - smooth(s.m * 1.6) : 1;
      if (al <= 0.01) continue;
      let D = satDist(s), a = s.a + (reduced ? 0 : Math.sin(clockT * 0.3 + s.bob) * 0.03), near = 0;
      if (!s.merged) { near = clamp(1 - (D - sr - rimAt(s.a)) / (sr * 1.6)); D -= near * 5; }     // leans towards the film as it nears
      else { const k = ease.outCubic(s.m); D = lerp(D, s.pr * rb, k); a = lerp(s.a, s.pa, k); }
      const x = cx + Math.cos(a) * D, y = cy + Math.sin(a) * D + (reduced ? 0 : Math.sin(clockT * 0.8 + s.bob) * 2.5);
      if (near > 0 && !s.merged) { const rr = rimAt(s.a); glow(g, cx + Math.cos(s.a) * (rr + D - sr) / 2, cy + Math.sin(s.a) * (rr + D - sr) / 2, sr * 0.9, pal.glow, near * 0.35); }
      if (s.ph >= 0) photos.draw(g, s.ph, x, y, sr * 2, { shape: 'bubble', glow: 0.35 + near * 0.3, glowColour: pal.glow, shadow: false, alpha: al, scale: s.merged ? lerp(1, 0.9, s.m) : 1 });
      else miniBubble(x, y, sr * 0.82, al, s.hue);
    }
  }
  function drawTouches(fin) {
    if (fin > 0) return;
    let anyPull = false;
    for (const q of pts.values()) {
      if (q.mode !== 'pull') continue;
      anyPull = true;
      const rr = rimAt(q.a), x = cx + Math.cos(q.a) * rr, y = cy + Math.sin(q.a) * rr;
      glow(g, x, y, 18 + 10 * clamp(q.s / M), mix(pal.glow, '#ffffff', 0.3), 0.55);
      if (Math.hypot(q.x - x, q.y - y) > 9) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(x, y); g.lineTo(q.x, q.y); g.stroke(); g.restore();
        glow(g, q.x, q.y, 14, pal.accent, 0.45);
      }
    }
    if (ghost.s > 0.5) {
      const rr = rimAt(ghost.a), x = cx + Math.cos(ghost.a) * rr, y = cy + Math.sin(ghost.a) * rr, k = clamp(ghost.s / (M * 0.6));
      glow(g, x, y, 22, mix(pal.glow, '#ffffff', 0.4), 0.6 * k);
      g.save(); g.strokeStyle = rgba('#ffffff', 0.5 * k); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.stroke(); g.restore();
    }
    if (anyPull || ghost.s > 0.5) return;
    // the suggested pull point: a glistening bead on the rim with an outward cue
    const a = HA(prog), rr = rimAt(a), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    const pulse = 0.5 + 0.5 * Math.sin(clockT * 2.4), dim = E.locked ? 0.5 : 1;
    glow(g, x, y, 22 + 6 * pulse, pal.accent, (0.4 + 0.25 * pulse) * dim);
    const gr = g.createRadialGradient(x - 2, y - 2, 0.5, x, y, 6.5);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, rgba(mix(pal.glow, '#ffffff', 0.3), 0.6));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
    g.save(); g.lineCap = 'round';
    g.strokeStyle = rgba('#ffffff', 0.5 * (1 - pulse) * dim); g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, 9 + 11 * pulse, 0, TAU); g.stroke();
    const ox = Math.cos(a), oy = Math.sin(a), tx = -oy, ty = ox, c0 = 20 + 4 * pulse;
    g.strokeStyle = rgba('#ffffff', 0.55 * dim); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + ox * c0 + tx * 5, y + oy * c0 + ty * 5); g.lineTo(x + ox * (c0 + 6), y + oy * (c0 + 6)); g.lineTo(x + ox * c0 - tx * 5, y + oy * c0 - ty * 5); g.stroke();
    g.restore();
  }
  function drawTiny() {
    g.save(); g.lineWidth = 1;
    for (const b of tiny) {
      if (!b.on) continue;
      const k = b.age / b.life, al = Math.min(1, b.age * 2) * (1 - k);
      g.globalAlpha = al * 0.75; g.strokeStyle = IRIS[b.hue];
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.stroke();
      g.globalAlpha = al * 0.6; g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.4, Math.max(0.8, b.r * 0.22), 0, TAU); g.fill();
    }
    g.restore();
  }

  // ------------------------------------------------------------ input --
  return {
    get progress() { return prog; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      const dx = p.x - cx, dy = p.y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = rimAt(a);
      if (r > rr * 0.68 && r < Rt * 1.8) {
        // the rim (generous): grab it here
        pts.set(p.id, { mode: 'pull', a, r, x: p.x, y: p.y, s: 0, spd: 0, acc: 0 });
        E.sound('glass', { note: 2 + (pts.size % 3), intensity: 0.3, pan: clamp(dx / Rt, -1, 1) * 0.5 });
        E.haptic('light');
        E.particles.burst(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, reduced ? 3 : 6, { speed: 30, colour: '#ffffff', life: 0.8, size: 4, kind: 'glint' });
        addPoke(Math.cos(a) * rr, Math.sin(a) * rr, 90);
        if (E.locked) waitNudge();
      } else if (r <= rr * 0.68) {
        // a poke in the middle: the film ripples and dimples, but never pops
        pts.set(p.id, { mode: 'poke', a, r, x: p.x, y: p.y, s: 0, spd: 0, acc: 0 });
        addPoke(dx, dy, 210);
        const c = Math.cos(a), s = Math.sin(a);
        if (!reduced) for (let j = 0; j < N; j++) vel[j] -= Rt * 0.5 * Math.exp((ca[j] * c + sa[j] * s - 1) * 2.5);
        E.sound('drip', { note: 4 + Math.floor((r / rr) * 4), intensity: 0.3, pan: clamp(dx / Rt, -1, 1) * 0.5 });
        E.haptic('light');
      }
    },
    move(p) {
      const q = pts.get(p.id);
      if (!q) return;
      const dx = p.x - cx, dy = p.y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      q.x = p.x; q.y = p.y;
      if (q.mode === 'poke') {
        if (r > rimAt(a) * 0.84) { q.mode = 'pull'; q.r = r; q.a = a; E.haptic('light'); E.sound('glass', { note: 3, intensity: 0.25 }); }
        return;
      }
      const dr = r - q.r;
      q.a = a;
      if (dr > 0) {
        q.acc += dr;
        if (r > rBase() + tense(a) - 6 && finAt < 0) {
          // slow pulls are followed closely; rushing thins the film and it lags behind
          const fast = invLerp(380, 1100, q.spd / stage.s);
          wanted = Math.min(1, wanted + (dr * lerp(0.75, 0.22, fast)) / (Rt - r0), prog + CAP);
          if (E.locked && wanted >= prog + CAP - 1e-3) waitNudge();
          if (fast > 0.6 && !rushHinted && prog < 0.8) { rushHinted = true; E.hint('Slowly — let the film follow your finger.'); }
        }
      }
      q.r = r;
    },
    up(p) {
      const q = pts.get(p.id);
      if (!q) return;
      pts.delete(p.id);
      if (q.mode === 'pull') {
        // released: the bulge springs back and the film rounds itself out
        const rr = rimAt(q.a);
        E.ripples.add(cx + Math.cos(q.a) * rr, cy + Math.sin(q.a) * rr, { colour: pal.glow, speed: 40, alpha: 0.3, r: 8 });
        E.sound('glass', { note: Math.min(9, 2 + Math.floor(prog * 7)), intensity: 0.2 });
      }
    },
    assist() {
      if (finAt >= 0) return;
      assistTo = Math.min(1, Math.max(wanted, prog) + 1 / 8);
      // aim the ghost pull at the nearest bubble still waiting outside, else the suggested point
      let best = null, bd = 1e9;
      for (const s of sats) if (!s.merged) { const gp = satDist(s) - rimAt(s.a); if (gp < bd) { bd = gp; best = s; } }
      ghost.aTo = best ? best.a : HA(prog);
      if (ghost.s < 1) ghost.a = ghost.aTo;
      E.sound('glass', { note: Math.min(9, 1 + Math.floor(prog * 8)), intensity: 0.3 });
      E.haptic('light');
    },
    pointAt(pp) { const a = HA(pp), r = lerp(r0, Rt, clamp(pp)); return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; },
    hint() {
      const a = HA(prog), r = rimAt(a), path = [];
      const x0 = stage.x + 12, x1 = stage.x + stage.w - 12, y0 = stage.y + 12, y1 = stage.y + stage.h - 12;
      for (let i = 0; i <= 15; i++) {
        const k = i / 15, rr = r - 2 + k * Rt * 0.36, aa = a + k * 0.06;
        path.push([clamp(cx + Math.cos(aa) * rr, x0, x1), clamp(cy + Math.sin(aa) * rr, y0, y1)]);
      }
      return { path };
    },
    twist() {
      // the swirl turns the other way and a few baby bubbles bud off the rim
      swirlTo = -swirlTo;
      for (let i = 0; i < (reduced ? 3 : 6); i++) spawnTiny(true);
      E.sound('bubble', { note: 7, intensity: 0.3 });
    },
    finish() {
      finAt = E.now();
      sats.forEach(merge);
      if (!heroCk && hero >= 0) { heroCk = true; E.checkpoint('photo', hero); }
      E.sound(heavy ? 'breathe-out' : 'shimmer', { intensity: heavy ? 0.35 : 0.45 });
      // the outline's dots lift away as soft light: the film fills it now
      const nb = reduced ? 8 : heavy ? 14 : 28;
      for (let i = 0; i < nb; i++) {
        const a = (i / nb) * TAU;
        E.particles.emit({ x: cx + Math.cos(a) * Rt, y: cy + Math.sin(a) * Rt, vx: Math.cos(a) * 10, vy: -14 - E.rand() * (heavy ? 8 : 18),
          life: 1.6 + E.rand(), size: heavy ? 5 : 7, colour: i % 2 ? '#ffffff' : mix(pal.glow, '#ffffff', 0.6), drag: 0.97 });
      }
      if (!heavy) for (let i = 0; i < (reduced ? 2 : 5); i++) spawnTiny(true);
      E.ripples.add(cx, cy, { colour: pal.glow, speed: 40, alpha: heavy ? 0.2 : 0.32, r: Rt * 0.9 });
    },
    destroy() { if (hum) { hum.stop?.(); hum = null; } },
  };
}
