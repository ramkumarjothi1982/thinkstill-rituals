// GE-42 · ECHO STAIR — a staircase of sound tiles (descending taps).
// A loud echo lives on the top step: it rings, and every ring is thrown back
// by ghost echo tiles hanging in the air. Tap the first lower step and the
// echo hops down onto it, then the next two in descending volume order. Every
// landing rings more quietly than the step above (fewer, smaller, softer
// rings; a lower, quieter note) and one ghost echo drifts away into light.
// Win: the final low step glows steadily.
//
// Photos are the sound tiles: crisp on the top step, then softer in focus and
// mistier on every step down; photos five to seven become the ghost echo
// tiles, which drift into the distance as light. Words sit on the top step,
// echoing at first, then settling into one quiet line as the sound descends.

import { TAU, clamp, lerp, smooth, ease, rgba, mix, glow, orb, roundRect, motes } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-42',
  howTo: 'Tap the first lower step, then the next two, quieter each time.',
  steps: [
    'Tap the first step below the loud top step — the echo hops down onto it.',
    'Then tap the next two steps down, in order. Each one rings more quietly.',
    'Rest when the final low step glows steadily.',
  ],
  tapAlt: 'each press walks the echo half a soft step down the stair',
  words: 'Your words sit on the top step — echoing at first, then settling into one quiet line as the sound walks down.',
  photos: {
    where: 'Your photos are the stair’s sound tiles.',
    becomes: 'glass sound tiles, each one softer and mistier than the one above',
    touch: 'You tap them in order, down the stair;',
    change: 'as the echo lands, each tile softens into mist, and the loud echo tiles drift off into the distance as light.',
    payoff: 'At the end the lowest tile glows steadily — calm, clear and quiet.',
  },
  finaleSec: 4.2,
};

const N = 3;                                // lower steps: "the first lower step, then the next two"
const VOL = [1, 0.58, 0.34, 0.17];          // each step resonates more quietly than the one above
const SOFT = [0, 0.3, 0.46, 0.58];          // photo softness by step: softer focus, mistier as it descends
const SCALE = [1, 0.86, 0.75, 0.66];        // each lower step is a smaller echo of the one above
const ASPECT = [1.6, 1.36, 1.32, 1.28];
const RINGS = [4, 3, 2, 1];
const NOTE = [7, 5, 3, 1];                  // descending pentatonic footsteps
const DEP = 0.2, KX = 0.6, KY = 0.6;        // glass thickness (× tile height) and its oblique direction
const CS = 5, M = CS * 4;                   // samples per rounded corner / silhouette points
const SLIDE = 0.5;                          // first half of a hop: slide to the lip; second: drop onto the next step
const RMAX = 32;                            // resonance ring pool
const ECHO_GAP = 0.2;                       // seconds between the ghost tiles answering the top step

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = !!E.reduced, lowStim = !!E.lowStim, heavy = !!E.heavy;
  const round = E.round || 1, calm0 = E.calm || 0;
  // loop rounds: the stair descends the other way, curves differently, new light and a new hero photo
  const dir = round % 2 === 0 ? -1 : 1;
  const bow = round === 1 ? 0.03 : -0.015 + E.rand() * 0.06;
  const hueK = round === 1 ? 0.35 : E.rand();
  const twistKind = (round - 1) % 3;
  const RATE = (heavy ? 0.44 : 0.56) * (1 - calm0 * 0.22);
  const baseLoud = (heavy ? 0.78 : 1) * (1 - calm0 * 0.6);

  const LOUD = mix(mix(mix(pal.accent, pal.warm, 0.18 + 0.5 * hueK), '#ffffff', 0.1), pal.glow, calm0 * 0.4);
  const QUIET = mix(pal.glow, '#ffffff', 0.2);
  const STEADY = mix(pal.glow, '#fff1cc', 0.5);
  const BODY = mix(pal.ink || '#0b0820', pal.deep || '#160f3a', 0.26);
  const COL = [0, 1, 2, 3].map((k) => mix(LOUD, QUIET, Math.pow(k / 3, 0.75)));
  const TOPC = COL.map((c) => mix(c, '#ffffff', 0.28));
  const SIDEC = COL.map((c) => mix(mix(BODY, c, 0.38), '#000000', 0.12));
  const SIDEA = COL.map((c) => rgba(mix(mix(BODY, c, 0.3), '#000000', 0.2), 0.86));

  // photos: one per step (the hero rotates each round); photos 5–7 become the ghost echo tiles
  const n = photos.n;
  const off = n ? (round - 1) % n : 0;
  const stepPh = [0, 1, 2, 3].map((k) => (n ? (k + off) % n : -1));
  const echoReal = n >= 5;
  const echoPh = [0, 1, 2].map((j) => (echoReal ? (4 + j + off) % n : n ? stepPh[0] : -1));

  // ------------------------------------------------------------ geometry --
  const slab = () => ({ x: 0, y: 0, w: 1, h: 1, r: 1, vx: 0, vy: 0, P: new Float32Array(M * 2), shade: new Float32Array(M), a: 0, b: 0, face: null, sheen: null, rim: null, band: null, veil: null });
  const S = [0, 1, 2, 3].map(slab);
  const EC = [0, 1, 2].map(() => Object.assign(slab(), { fade: 0, fading: false, rot: (E.rand() - 0.5) * 0.14, ph: E.rand() * TAU, dx: 0, dy: 0, pulseAt: -9 }));
  const isle = { x: 0, y: 0, r: 0 };

  function build(s, x, y, w, h, r, vx, vy, col) {
    Object.assign(s, { x, y, w, h, r, vx, vy, tx: x, ty: y });
    const C = [[w / 2 - r, -h / 2 + r, -Math.PI / 2], [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI]];
    let i = 0;
    for (const [cx, cy, a0] of C) for (let j = 0; j < CS; j++) { const a = a0 + (j / (CS - 1)) * (Math.PI / 2); s.P[i * 2] = cx + Math.cos(a) * r; s.P[i * 2 + 1] = cy + Math.sin(a) * r; i++; }
    const ll = Math.hypot(0.3, 0.95), lx = (-0.3 * dir) / ll, ly = -0.95 / ll;
    const vis = new Uint8Array(M);
    for (let k = 0; k < M; k++) {
      const j = (k + 1) % M, ex = s.P[j * 2] - s.P[k * 2], ey = s.P[j * 2 + 1] - s.P[k * 2 + 1];
      const nl = Math.hypot(ex, ey) || 1, nx = ey / nl, ny = -ex / nl;
      vis[k] = nx * vx + ny * vy > 1e-6 ? 1 : 0;
      s.shade[k] = clamp(0.1 + (nx * lx + ny * ly) * 0.9);
    }
    for (let k = 0; k < M; k++) { const pv = vis[(k + M - 1) % M]; if (vis[k] && !pv) s.a = k; if (!vis[k] && pv) s.b = k; }
    // cached gradients (local coordinates — the slab is drawn translated, so they follow the bob)
    s.face = g.createLinearGradient(0, -h / 2, 0, h / 2);
    s.face.addColorStop(0, rgba(mix(BODY, '#ffffff', 0.18), 0.9)); s.face.addColorStop(0.55, rgba(BODY, 0.9)); s.face.addColorStop(1, rgba(mix(BODY, '#000000', 0.3), 0.94));
    s.sheen = g.createLinearGradient(-w / 2, -h / 2, w * 0.1, h * 0.3);
    s.sheen.addColorStop(0, 'rgba(255,255,255,0.26)'); s.sheen.addColorStop(0.42, 'rgba(255,255,255,0.05)'); s.sheen.addColorStop(0.43, 'rgba(255,255,255,0)'); s.sheen.addColorStop(1, 'rgba(255,255,255,0)');
    s.rim = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    s.rim.addColorStop(0, 'rgba(255,255,255,0.75)'); s.rim.addColorStop(0.5, 'rgba(255,255,255,0.1)'); s.rim.addColorStop(1, 'rgba(255,255,255,0.3)');
    s.band = g.createLinearGradient(0, -h * 0.08, 0, h / 2);
    s.band.addColorStop(0, rgba(BODY, 0)); s.band.addColorStop(0.35, rgba(BODY, 0.6)); s.band.addColorStop(1, rgba(BODY, 0.84));
    s.veil = g.createLinearGradient(0, -h / 2, 0, h / 2);
    s.veil.addColorStop(0, rgba(QUIET, 0.04)); s.veil.addColorStop(1, rgba(QUIET, 0.5));
    // coloured glass for a tile without a photo: lit from the upper left, deeper at the rim
    s.pad = g.createRadialGradient(-w * 0.18, -h * 0.22, h * 0.04, 0, 0, w * 0.64);
    s.pad.addColorStop(0, rgba(mix(mix(BODY, col, 0.55), '#ffffff', 0.12), 0.92)); s.pad.addColorStop(0.55, rgba(mix(BODY, col, 0.32), 0.92)); s.pad.addColorStop(1, rgba(mix(BODY, col, 0.16), 0.95));
  }

  function fit() {
    const W = stage.w, H = stage.h;
    const mT = H * 0.08 + 4, mB = H * 0.1 + 6;
    const xs = [0, 0, 0, 0], ys = [0, 0, 0, 0];
    const lay = (h0) => {
      const h = SCALE.map((sc) => h0 * sc), w = h.map((hh, k) => hh * ASPECT[k]);
      const ax = W * 0.04 + w[0] / 2, ay = mT + h[0] * DEP * KY + h[0] / 2;
      const bx = W * 0.96 - w[3] / 2 - h[3] * DEP * KX, by = H - mB - h[3] * 0.6;
      for (let k = 0; k < 4; k++) { const t = k / 3, b = Math.sin(Math.PI * t); xs[k] = lerp(ax, bx, t) - bow * W * b * 0.6; ys[k] = lerp(ay, by, t) + bow * H * b; }
      let worst = bx - ax < w[0] * 0.3 ? 1 : 0;
      for (let k = 0; k < 3; k++) {
        const ox = xs[k] + w[k] / 2 + h[k] * DEP * KX - (xs[k + 1] - w[k + 1] / 2);
        const oy = ys[k] + h[k] / 2 + 6 - (ys[k + 1] - h[k + 1] / 2 - h[k + 1] * DEP * KY);
        if (ox > 0 && oy > 0) worst = Math.max(worst, (ox * oy) / (w[k + 1] * h[k + 1]));
      }
      return worst;
    };
    let h0 = Math.min(W * 0.29, H * 0.25);
    for (let it = 0; it < 60 && lay(h0) > 0.07; it++) h0 *= 0.97;
    // a small change (the prompt line under the title rewrapping) glides the stair to its new place;
    // a real resize rebuilds it
    const glide = h0Fit > 0 && Math.abs(h0 - h0Fit) / h0Fit < 0.16 && Math.abs(W - wFit) < 2;
    if (glide) h0 = h0Fit; else { h0Fit = h0; wFit = W; }
    lay(h0);
    const X = (x) => stage.x + (dir > 0 ? x : W - x);
    const place = (s, x, y, w, hh, r, vx, vy, col) => { if (glide) { s.tx = x; s.ty = y; } else build(s, x, y, w, hh, r, vx, vy, col); };
    for (let k = 0; k < 4; k++) {
      const hh = h0 * SCALE[k], d = hh * DEP;
      place(S[k], X(xs[k]), stage.y + ys[k], hh * ASPECT[k], hh, hh * 0.17, dir * d * KX, -d * KY, COL[k]);
    }
    // ghost echo tiles: an arc of reverberation hanging in the air beside the loud top step
    const eh = [0.6, 0.48, 0.38].map((f) => h0 * f);
    const jit = round === 1 ? 0 : 1;
    const x0r = xs[0] + S[0].w / 2 + Math.abs(S[0].vx);
    const e0x = Math.min(W * 0.97 - eh[0] * 0.72, x0r + W * 0.025 + eh[0] * 0.72), e0y = ys[0] - h0 * 0.14;
    const e2x = W * 0.97 - eh[2] * 0.72, e2y = ys[0] + (ys[1] - ys[0]) * 1.08;
    const ex = [e0x, lerp(e0x, W * 0.97 - eh[1] * 0.72, 0.82), e2x], ey = [e0y, lerp(e0y, e2y, 0.5), e2y];
    for (let j = 0; j < 3; j++) {
      const hh = eh[j], d = hh * 0.12;
      const jx = jit * (EC[j].ph - Math.PI) * 0.004 * W, jy = jit * Math.sin(EC[j].ph * 3) * 0.02 * H;
      place(EC[j], X(ex[j] + jx), stage.y + ey[j] + jy, hh * 1.42, hh, hh * 0.18, dir * d * KX, -d * KY, LOUD);
      EC[j].dx = dir * 0.8; EC[j].dy = -0.6;
    }
    isle.x = X(W * 0.2); isle.y = stage.y + H * 0.78; isle.r = Math.min(W * 0.17, h0 * 0.85);
  }
  let h0Fit = 0, wFit = 0;
  fit();
  E.onResize(fit);

  // ---------------------------------------------------------------- state --
  let target = 0, wanted = 0, st = 0;       // asked-for, input request, gated state
  let landed = 0, lipSeen = 0, lockedNow = false;
  let doneFlag = false, finAt = -1, twistAt = -1, steady = 0, lastTouch = 0, invite = 0, bgPhase = E.rand(), bgSpeed = 0.07;
  let hintSaid = 0;
  const energy = new Float32Array(4), settle = new Float32Array(4), listen = new Float32Array(4);
  const pressC = new Int8Array(4), pressX = new Float32Array(4), pressV = new Float32Array(4), thump = new Float32Array(4), thumpV = new Float32Array(4);
  const pressAt = new Float32Array(4).fill(-9), settleAt = new Float32Array(4).fill(-1);
  const wob = [0, 1, 2, 3].map(() => new Wobble());
  const bob = new Float32Array(4), bobE = new Float32Array(3);
  const bobPh = [0, 1, 2, 3].map(() => E.rand() * TAU);
  const padPh = new Float32Array(4);
  let dtF = 0;
  const presses = new Map();
  const casc = [false, false, false, false];
  // resonance rings (pool)
  const rK = new Int8Array(RMAX), rKind = new Uint8Array(RMAX), rAge = new Float32Array(RMAX), rLife = new Float32Array(RMAX), rAmp = new Float32Array(RMAX);
  let rHead = 0, emitT = 0.3, echoT0 = -9, echoAmp = 0;
  function addRing(k, amp, delay = 0, kind = 0) {
    const i = rHead; rHead = (rHead + 1) % RMAX;
    rK[i] = k; rKind[i] = kind; rAge[i] = -delay; rAmp[i] = clamp(amp); rLife[i] = lerp(1.1, 2.1, clamp(amp)) * (reduced ? 1.3 : 1) * (kind ? 0.8 : 1);
  }
  function echoBack(t, amp) {                // the ghost tiles throw the ring back, one after another, each fainter
    for (let j = 0; j < 3; j++) if (!EC[j].fading) EC[j].pulseAt = t + ECHO_GAP * (j + 1);
    echoT0 = t; echoAmp = amp;
  }
  let ring0At = -9;                          // last time the loud top step rang (the bead throbs with it)
  // the echo bead's trail
  const TRN = 16, trX = new Float32Array(TRN), trY = new Float32Array(TRN);
  let trN = 0, trHead = 0;
  const BP = { x: 0, y: 0 }, A = { x: 0, y: 0 }, L = { x: 0, y: 0 }, B = { x: 0, y: 0 }, Q = { x: 0, y: 0 };

  const nextStep = () => Math.min(N, Math.floor(target * N + 1e-4) + 1);      // the step a tap may call now
  const loudness = () => baseLoud * (1 - smooth(clamp(st * N * 1.15)));     // the top step quiets as the echo leaves

  // ---------------------------------------------------------- path maths --
  function tread(k, f, out) {               // f = 0: tread centre, 1: the lip on the descending side
    const s = S[k];
    out.x = s.x + s.vx * 0.5 + f * dir * s.w * 0.5;
    out.y = s.y + bob[k] - s.h / 2 + s.vy * 0.5;
    return out;
  }
  function beadR(p) {
    const f = clamp(p) * N, k = Math.min(N, Math.floor(f)), k1 = Math.min(N, k + 1), u = f - k;
    return lerp(S[k].h, S[k1].h, u) * (0.085 + 0.06 * lerp(VOL[k], VOL[k1], u));
  }
  function ptAt(p, out) {
    p = clamp(p);
    if (p >= 1) { tread(N, 0, out); out.y -= beadR(1); return out; }
    const f = p * N, k = Math.min(N - 1, Math.floor(f)), u = f - k;
    if (u <= SLIDE) {
      const a = ease.inOutSine(u / SLIDE);
      tread(k, 0, A); tread(k, 1, L);
      out.x = lerp(A.x, L.x, a); out.y = lerp(A.y, L.y, a);
    } else {
      const v = (u - SLIDE) / (1 - SLIDE), hk = S[k].h;
      tread(k, 1, L); tread(k + 1, 0, B);
      out.x = lerp(L.x, B.x, smooth(v)) + dir * Math.max(hk * 0.26, 16) * Math.sin(Math.PI * v);
      out.y = L.y + (B.y - L.y) * v * v - hk * 0.18 * Math.sin(Math.PI * v) * (1 - v);
    }
    out.y -= beadR(p);
    return out;
  }

  // -------------------------------------------------------------- frame --
  function frame(dt, t) {
    // ---- input → state, through the world law every frame
    if (wanted < target) wanted = Math.min(target, wanted + RATE * dt);
    if (wanted > st + 0.03) wanted = st + 0.03;            // never bank input past what the law lets through
    st = E.gate(wanted);
    if (wanted > st + 0.03) wanted = st + 0.03;
    lockedNow = E.locked;
    while (landed < N && st >= (landed + 1) / N - 1e-4) { landed++; land(landed); }
    const hIdx = Math.floor(st * N * 2 + 1e-4);
    while (lipSeen < hIdx) { lipSeen++; if (lipSeen % 2 === 1) lip((lipSeen + 1) / 2); }
    const pending = target > st + 0.004;

    // ---- simulation
    dtF = dt;
    const gl = 1 - Math.exp(-dt * 5);
    for (const s of S) { s.x += (s.tx - s.x) * gl; s.y += (s.ty - s.y) * gl; }
    for (const s of EC) { s.x += (s.tx - s.x) * gl; s.y += (s.ty - s.y) * gl; }
    const loud = loudness();
    for (let k = 0; k < 4; k++) {
      bob[k] = Math.sin(t * (0.62 + k * 0.07) + bobPh[k]) * (reduced ? 0.6 : 1.6 + 1.6 * VOL[k]) * stage.s;
      const pt = pressC[k] > 0 || t - pressAt[k] < 0.12 ? 1 : 0;
      pressV[k] += (-(pressX[k] - pt) * 520 - pressV[k] * 26) * dt; pressX[k] += pressV[k] * dt;
      thumpV[k] += (-thump[k] * 240 - thumpV[k] * 11) * dt; thump[k] += thumpV[k] * dt;
      wob[k].update(dt);
      energy[k] *= Math.exp(-dt * 2.1);
      const headTo = k === Math.ceil(st * N - 1e-4) && pending && st * N > k - 0.5 ? 1 : 0;
      listen[k] = lerp(listen[k], headTo, 1 - Math.exp(-dt * 6));
      if (settleAt[k] >= 0) settle[k] = smooth(clamp((t - settleAt[k]) / 1.1));
    }
    for (let j = 0; j < 3; j++) {
      const ec = EC[j];
      bobE[j] = Math.sin(t * (0.9 + j * 0.13) + ec.ph) * (reduced ? 0.8 : 3) * stage.s;
      if (ec.fading) ec.fade = Math.min(1, ec.fade + dt / 1.7);
    }
    if (landed >= N) steady = Math.min(1, steady + dt / 0.9);
    // ambient resonance: the step that holds the echo keeps ringing, quieter on every step down
    const sk = Math.min(N, Math.round(st * N));
    emitT -= dt;
    if (emitT <= 0 && sk < N && finAt < 0) {
      const amp = (sk === 0 ? loud : VOL[sk] * baseLoud) * (lowStim ? 0.7 : 1);
      if (amp > 0.04) { addRing(sk, amp * 0.85); energy[sk] = Math.max(energy[sk], amp * 0.55); if (sk === 0) { echoBack(t, amp); ring0At = t; } }
      emitT = lerp(1.05, 2.3, sk / N) * (reduced || lowStim ? 1.5 : 1) * (1 + calm0) * (heavy ? 1.2 : 1);
    }
    // the next step softly invites a tap when nothing is happening
    const idle = !pending && finAt < 0 && landed < N && t - lastTouch > 1.4;
    invite = lerp(invite, idle ? 1 : 0, 1 - Math.exp(-dt * 2.5));
    bgSpeed = lerp(bgSpeed, twistAt >= 0 && twistKind === 1 ? 0.008 : lerp(0.075, 0.03, Math.max(calm0, st)) * (reduced ? 0.35 : 1), 1 - Math.exp(-dt * 0.8));
    bgPhase += bgSpeed * dt;
    if (!doneFlag && landed >= N && st >= 0.999 && steady >= 0.8 && !presses.size) { doneFlag = true; E.sound('settle', { intensity: 0.42 }); }

    // ---- drawing
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    drawBackdrop(t, loud, fin);
    drawFootsteps(t);
    drawThread(t, loud);
    for (let j = 2; j >= 0; j--) drawEcho(j, t, loud);
    for (let k = 3; k >= 0; k--) drawTile(k, t, loud, fin);
    drawRings(dt);
    drawTwist(t);
    drawBead(t, dt);
    if (finAt >= 0) finale(t, dt);
  }

  // ------------------------------------------------------------- events --
  function land(k) {
    const now = E.now(), s = S[k];
    for (let i = 0; i < RINGS[k]; i++) addRing(k, VOL[k] * (1 - i * 0.17), i * 0.17);
    for (let i = 0; i < Math.max(1, RINGS[k] - 1); i++) addRing(k, 0.45 + VOL[k] * 0.55 - i * 0.15, 0.04 + i * 0.22, 1);
    energy[k] = Math.max(energy[k], 0.35 + VOL[k] * 0.65);
    thumpV[k] += 26 * (0.4 + VOL[k]);
    tread(k, 0, Q);
    E.sound('pluck', { note: NOTE[k], intensity: lerp(0.56, 0.3, (k - 1) / 2), pan: clamp(((Q.x - stage.cx) / stage.w) * 1.6, -1, 1) });
    E.sound('glass', { note: NOTE[k], pitch: 0.5, intensity: lerp(0.38, 0.14, (k - 1) / 2) });
    E.haptic('soft');
    E.checkpoint('step', k);
    E.ripples.add(Q.x, Q.y, { colour: COL[k], speed: 30 + 40 * VOL[k], alpha: 0.2 + 0.35 * VOL[k], r: 4 });
    E.particles.burst(Q.x, Q.y - beadR(k / N), reduced || lowStim ? 3 : 4 + Math.round(8 * VOL[k]), { speed: 22 + 46 * VOL[k], colour: COL[k], life: 0.9, size: 4 + 3 * VOL[k] });
    settleAt[k] = now;
    if (stepPh[k] >= 0) { photos.dust(stepPh[k], s.x, s.y + bob[k], s.w, reduced ? 4 : 9, { shape: 'round', speed: 12, up: 8, life: 1.6, sizePx: 3.5 }); E.checkpoint('photo', stepPh[k]); }
    if (k === 1 && stepPh[0] >= 0 && stepPh[0] !== stepPh[1]) E.checkpoint('photo', stepPh[0]);   // the loud top tile settles
    const ec = EC[N - k];                     // one ghost echo drifts off into the distance as light
    if (ec && !ec.fading) { ec.fading = true; if (echoReal) E.checkpoint('photo', echoPh[N - k]); E.sound('shimmer', { intensity: 0.16, pitch: 0.8 }); }
    if (k === 1 && hintSaid < 1) { hintSaid = 1; E.hint('Now the next step down — it rings more quietly.'); }
    else if (k === 2 && hintSaid < 2) { hintSaid = 2; E.hint('One more: the lowest step.'); }
    if (k === N) E.react(heavy ? 'comfort' : 'release');
  }
  function lip(k) {                          // the echo waits on the edge, about to step down onto k
    E.sound('rotate-tick', { intensity: 0.18, pitch: 1.25 - k * 0.12 });
    E.haptic('tick');
    energy[k] = Math.max(energy[k], 0.2);
  }
  function notYet(k, byLaw) {
    if (reduced) energy[k] = Math.max(energy[k], 0.25); else wob[k].kick(0.75);
    E.sound('click', { intensity: 0.16, pitch: 0.72 });
    E.haptic('tick');
    if (byLaw) E.checkpoint('wait');
  }
  function kick() { wanted = Math.min(target, Math.max(wanted, st) + 0.025); st = E.gate(wanted); }   // the echo starts moving at once
  function request(to) { return E.allow(to) || !lockedNow; }   // law holding → "not yet"; law only pacing → the gate sets the speed
  function call(k, press) {                  // a real tap on step k
    const now = E.now();
    lastTouch = now;
    const next = nextStep();
    if (k === next && landed < N && target < 1) {
      if (target - st > 1 / N + 1e-3) { notYet(k, lockedNow); return; }   // one step already on its way
      const to = k / N;
      if (!request(to)) { notYet(k, true); return; }
      target = to;
      kick();
      pressAt[k] = now; energy[k] = Math.max(energy[k], 0.3);
      E.sound('click', { intensity: 0.28, pitch: 1.1 - k * 0.08 });
      E.haptic('light');
      return;
    }
    if (k > next) {                           // skipping ahead: gently show which step comes first
      if (reduced) energy[k] = Math.max(energy[k], 0.2); else wob[k].kick(0.55);
      invite = 1;
      E.sound('pluck', { note: 0, intensity: 0.14 });
      E.haptic('tick');
      return;
    }
    // an upper step that has already sung (or the loud top): it rings again at its own volume — harmless play
    if (press) pressAt[k] = now;
    const amp = k === 0 ? Math.max(0.2, loudness()) : VOL[k] * 0.5;
    addRing(k, amp); energy[k] = Math.max(energy[k], amp * 0.7);
    if (k === 0) { echoBack(now, amp); ring0At = now; }
    E.sound('glass', { note: NOTE[k], pitch: 0.5, intensity: 0.08 + 0.16 * amp });
    E.haptic('tick');
    if (k < next) invite = Math.max(invite, 0.6);
  }

  // ------------------------------------------------------------ drawing --
  function drawBackdrop(t, loud, fin) {
    const s3 = S[3], s0 = S[0];
    const mx = (s0.x + s3.x) / 2, my = (s0.y + s3.y) / 2;
    glow(g, mx, my, Math.max(stage.w, stage.h) * 0.55, QUIET, 0.05 + 0.03 * (1 - loud));
    glow(g, s0.x, s0.y, s0.w * 1.5, LOUD, 0.12 * loud);
    // echo staircases: faint stair profiles that sweep in from afar and settle onto the real stair
    g.save();
    g.beginPath(); g.rect(stage.x, stage.y, stage.w, stage.h); g.clip();
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let j = 0; j < 3; j++) {
      const f = (bgPhase + j / 3) % 1, sc = lerp(2.4, 1, ease.inOutSine(f));
      const a = 0.16 * Math.sin(Math.PI * f) * (1 - steady * 0.5) * (lowStim ? 0.6 : 1);
      if (a < 0.006) continue;
      g.beginPath();
      for (let k = 0; k <= N; k++) {
        const s = S[k], x = s3.x + (s.x - s3.x) * sc, y = s3.y + (s.y - s3.y) * sc;
        const hw = (s.w * sc) / 2, ty = y - (s.h * sc) / 2;
        if (k) g.lineTo(x - dir * hw, ty); else g.moveTo(x - dir * hw, ty);
        g.lineTo(x + dir * hw, ty);
        if (k < N) { const s2 = S[k + 1], y2 = s3.y + (s2.y - s3.y) * sc - (s2.h * sc) / 2; g.lineTo(x + dir * hw, y2); }
      }
      g.strokeStyle = rgba(mix(LOUD, QUIET, f), a); g.lineWidth = 1.4; g.stroke();
    }
    g.restore();
    motes(g, stage.x, stage.y, stage.w, stage.h, t * (reduced ? 0.3 : 1), QUIET, { n: lowStim ? 10 : 22, alpha: 0.3, seed: 42 + round, size: 1.4 });
    // the low step's light spills into the mist below it
    glow(g, s3.x, s3.y + s3.h * 0.5, s3.w * (1.3 + 0.9 * steady + fin), STEADY, 0.06 + 0.26 * steady);
  }
  function drawFootsteps(t) {
    // soft footprints of light along each drop: brighter where the echo has already walked
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < 6; i++) {
        const u = 0.58 + i * 0.07, p = (k + u) / N;
        ptAt(p, Q);
        const walked = st >= p;
        const a = walked ? 0.45 : 0.16 + 0.07 * Math.sin(t * 2 - i * 0.7 - k);
        g.fillStyle = rgba(walked ? COL[k + 1] : QUIET, a);
        g.beginPath(); g.arc(Q.x, Q.y + beadR(p) * 0.6, (walked ? 2 : 1.5) * stage.s, 0, TAU); g.fill();
      }
    }
    g.restore();
  }
  // tinted glass slab: silhouette, each visible edge swept back with its own light, then lit edges
  function slabBody(s, top, sideA, sideC) {
    const P = s.P, vx = s.vx, vy = s.vy;
    g.beginPath();
    let i = s.b; g.moveTo(P[i * 2], P[i * 2 + 1]);
    while (i !== s.a) { i = (i + 1) % M; g.lineTo(P[i * 2], P[i * 2 + 1]); }
    for (;;) { g.lineTo(P[i * 2] + vx, P[i * 2 + 1] + vy); if (i === s.b) break; i = (i + 1) % M; }
    g.closePath();
    g.fillStyle = sideA; g.fill();
    const ga = g.globalAlpha; g.globalAlpha = ga * 0.92;
    for (i = s.a; i !== s.b; i = (i + 1) % M) {
      const j = (i + 1) % M;
      g.beginPath(); g.moveTo(P[i * 2], P[i * 2 + 1]); g.lineTo(P[j * 2], P[j * 2 + 1]); g.lineTo(P[j * 2] + vx, P[j * 2 + 1] + vy); g.lineTo(P[i * 2] + vx, P[i * 2 + 1] + vy); g.closePath();
      g.fillStyle = mix(sideC, top, s.shade[i]); g.fill();
    }
    g.globalAlpha = ga;
    // the back edge of the tread catches the light
    g.beginPath();
    for (i = s.a; ; i = (i + 1) % M) { const x = P[i * 2] + vx, y = P[i * 2 + 1] + vy; if (i === s.a) g.moveTo(x, y); else g.lineTo(x, y); if (i === s.b) break; }
    g.strokeStyle = rgba(mix(top, '#ffffff', 0.5), 0.55); g.lineWidth = 1; g.stroke();
  }
  function drawTile(k, t, loud, fin) {
    const s = S[k], w = s.w, h = s.h, ph = stepPh[k];
    const isNext = k === nextStep() && landed < N;
    const lit = Math.max(energy[k], listen[k] * 0.5, k === N ? steady * 0.8 : 0, isNext ? invite * 0.22 : 0);
    const x = s.x + (reduced ? 0 : wob[k].v * 0.5), y = s.y + bob[k] + pressX[k] * 2.6 + thump[k] * 2.2;
    let sc = 1 - pressX[k] * 0.035 + thump[k] * 0.012;
    if (k === 0 && !reduced) sc *= 1 + 0.008 * loud * Math.sin(t * 14);
    // coloured light spilling beneath the floating tile
    glow(g, x + s.vx * 0.3, y + h * 0.66, w * 0.85, k === N && steady > 0 ? STEADY : COL[k], (0.08 + 0.26 * lit) * (0.55 + 0.45 * VOL[k]) + (k === 0 ? 0.1 * loud : 0));
    if (k === N && steady > 0) glow(g, x + s.vx * 0.4, y + s.vy * 0.4, w * (1.15 + 0.35 * fin), STEADY, (ph >= 0 ? 0.42 : 0.3) * steady + 0.16 * fin);   // steady light behind the low step
    g.save(); g.translate(x, y); if (sc !== 1) g.scale(sc, sc);
    slabBody(s, mix(TOPC[k], k === N && steady > 0 ? STEADY : COL[k], clamp(lit * 0.65 + VOL[k] * 0.2 + (k === 0 ? loud * 0.3 : 0))), SIDEA[k], SIDEC[k]);
    const inset = Math.max(1.5, h * 0.028);
    roundRect(g, -w / 2, -h / 2, w, h, s.r); g.fillStyle = ph >= 0 ? s.face : s.pad; g.fill();
    if (ph >= 0) {
      g.save(); roundRect(g, -w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2, s.r - inset); g.clip();
      const soft = k === 0 ? 0 : SOFT[k] + 0.12 * settle[k];
      const sz = (w - inset * 2) * 1.05;
      photos.draw(g, ph, 0, 0, sz, { shape: 'round', blur: soft * 0.9, tone: 'mist', toneMix: soft * 0.75, shadow: false });
      if (k === 0 && loud > 0.03 && !reduced) {      // the loud tile echoes: faint offset copies of itself
        photos.draw(g, ph, dir * 5 * loud, -4 * loud, sz, { shape: 'round', alpha: 0.18 * loud, shadow: false });
        photos.draw(g, ph, dir * 10 * loud, -8 * loud, sz, { shape: 'round', alpha: 0.09 * loud, shadow: false });
      }
      if (soft > 0) { g.globalAlpha = soft * 0.5; g.fillStyle = s.veil; g.fillRect(-w / 2, -h / 2, w, h); g.globalAlpha = 1; }
      if (k === 0 && E.phase !== 'law') { g.fillStyle = s.band; g.fillRect(-w / 2, -h * 0.08, w, h * 0.58); }
      g.restore();
    } else {
      // a glass sound pad: a speaker membrane of light that breathes out rings — faster when louder
      g.save(); roundRect(g, -w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2, s.r - inset); g.clip();
      g.globalCompositeOperation = 'lighter';
      const col = k === N && steady > 0 ? STEADY : COL[k];
      glow(g, 0, 0, h * (0.5 + 0.25 * lit), col, 0.16 + 0.42 * lit * (0.6 + 0.4 * VOL[k]) + (k === N ? 0.3 * steady : 0));
      const spd = (reduced ? 0.05 : 0.1 + 0.28 * VOL[k] * (k === N ? 1 - steady : 1)) * (1 - calm0 * 0.4);
      padPh[k] += spd * dtF;
      for (let i = 0; i < 4; i++) {
        const q = (padPh[k] + i / 4) % 1, rr = h * (0.1 + 0.5 * q);
        g.strokeStyle = rgba(col, (0.1 + 0.36 * lit + 0.12 * VOL[k]) * Math.sin(Math.PI * q)); g.lineWidth = 1 + 1.6 * (1 - q);
        g.beginPath(); g.ellipse(0, 0, rr * 1.15, rr, 0, 0, TAU); g.stroke();
      }
      if (k > 0) { orb(g, 0, 0, h * 0.075, mix(col, '#ffffff', 0.35), { alpha: 0.55 + 0.4 * lit }); }
      g.restore();
    }
    // light held inside the glass edge (the final step's steady glow lives here)
    g.save(); g.globalCompositeOperation = 'lighter';
    const edgeCol = k === N && steady > 0 ? STEADY : COL[k];
    const edgeA = clamp(0.14 + 0.5 * lit + (k === 0 ? 0.28 * loud * (reduced ? 1 : 0.8 + 0.2 * Math.sin(t * 5)) : 0));
    g.strokeStyle = rgba(edgeCol, edgeA * 0.45); g.lineWidth = 3 + 5 * lit;
    roundRect(g, -w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5, s.r - 2); g.stroke();
    g.strokeStyle = rgba(edgeCol, edgeA); g.lineWidth = 1.4 + 0.8 * lit;
    roundRect(g, -w / 2 + 0.6, -h / 2 + 0.6, w - 1.2, h - 1.2, s.r); g.stroke();
    if (k === N && steady > 0) { g.globalAlpha = (ph >= 0 ? 0.07 : 0.12) * steady * (1 + fin * 0.4); g.fillStyle = STEADY; roundRect(g, -w / 2, -h / 2, w, h, s.r); g.fill(); }
    g.restore();
    // glass sheen + a bright lit rim on the upper-left
    g.fillStyle = s.sheen; roundRect(g, -w / 2, -h / 2, w, h, s.r); g.fill();
    g.strokeStyle = s.rim; g.lineWidth = 1.2; g.stroke();
    if (k === 0) drawWords(s, loud, t);
    g.restore();
    // the next step breathes softly, inviting the tap
    const inv = isNext ? invite : 0;
    if (inv > 0.02) {
      const a = inv * (0.22 + 0.16 * Math.sin(t * 2.6));
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(QUIET, a); g.lineWidth = 2;
      const pad = 6 + 2 * Math.sin(t * 2.6);
      roundRect(g, x - w / 2 - pad, y - h / 2 - pad, w + pad * 2, h + pad * 2, s.r + pad); g.stroke();
      g.restore();
    }
  }
  function drawWords(s, loud, t) {
    if (E.phase === 'law') return;
    const w = s.w, h = s.h, photo = stepPh[0] >= 0;
    const size = clamp(h * 0.135, 12, 16.5) * (photo ? 1 : 1.08);
    const y = photo ? h * 0.24 : 0;
    const o = { style: 'light', size, maxWidth: w - (photo ? 16 : 22), lines: photo ? 2 : 3, glowColour: mix(LOUD, QUIET, 1 - loud), alpha: 0.96 };
    if (loud > 0.05 && !reduced) {           // echoing at first: ghost copies drift apart, then merge into one line
      const e = loud * (0.8 + 0.2 * Math.sin(t * 3));
      o.style = 'ink'; o.colour = mix(LOUD, '#ffffff', 0.55);        // plain ink, barely blurred: cheap faint copies
      o.alpha = 0.3 * e; words.draw(g, dir * 4 * e, y - 3.5 * e, o);
      o.alpha = 0.14 * e; words.draw(g, dir * 8 * e, y - 7 * e, o);
      o.style = 'light'; o.colour = undefined; o.alpha = 0.96;
    }
    if (photo) o.style = 'plate';            // a glass plate keeps the words readable over any photo
    words.draw(g, 0, y, o);
  }
  function drawEcho(j, t, loud) {
    const ec = EC[j];
    if (ec.fade >= 1) return;
    const f = ease.inOutSine(ec.fade), w = ec.w, h = ec.h;
    const drift = f * h * 1.1;
    const x = ec.x + ec.dx * drift, y = ec.y + bobE[j] + ec.dy * drift;
    const pk = t >= ec.pulseAt ? Math.exp(-(t - ec.pulseAt) * 3.2) : 0;     // the echo thrown back
    const flick = reduced ? 1 : 0.86 + 0.14 * Math.sin(t * (2.2 + j * 0.4) + ec.ph);
    const base = (echoReal ? 0.88 : 0.55) * (1 - j * 0.13) * flick * (1 - calm0 * 0.3);
    const a = base * (1 - f * (echoReal ? 0.3 : 1)) * (0.8 + 0.2 * Math.max(loud, pk));
    const sc = (1 - f * 0.4) * (1 + 0.035 * pk * (reduced ? 0 : 1));
    glow(g, x, y, w * (0.8 + 0.25 * pk), LOUD, (0.1 + 0.12 * loud + 0.25 * pk * (1 - j * 0.25)) * (1 - f));
    const ph = echoPh[j];
    g.save(); g.translate(x, y); g.rotate(ec.rot * (1 - f)); g.scale(sc, sc); g.globalAlpha = a;
    roundRect(g, -w / 2, -h / 2, w, h, ec.r); g.fillStyle = ph >= 0 ? ec.face : ec.pad; g.fill();
    if (ph >= 0) {
      g.save(); roundRect(g, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, ec.r - 1.5); g.clip();
      photos.draw(g, ph, 0, 0, (w - 3) * 1.05, { shape: 'round', dissolve: echoReal ? f * 0.999 : 0, mode: 'edge', edgeColour: mix(QUIET, '#ffffff', 0.5), tone: 'mist', toneMix: echoReal ? 0.12 : 0.5, blur: echoReal ? 0 : 0.35, shadow: false });
      g.restore();
      if (echoReal && ec.fading && f < 0.95 && !reduced && Math.random() < 0.5) photos.edgeDust(ph, x, y, (w - 3) * 1.05 * sc, f, 1, { shape: 'round', mode: 'edge', colour: QUIET, up: 18, speed: 14 });
    } else {
      // a ghost of the top step's sound pad, its membrane still trembling with the echo
      g.save(); roundRect(g, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, ec.r - 1.5); g.clip();
      g.globalCompositeOperation = 'lighter';
      glow(g, 0, 0, h * 0.6, LOUD, 0.22 + 0.4 * pk + 0.15 * loud);
      for (let i = 0; i < 3; i++) {
        const q = ((reduced ? 0.2 : t * (0.16 + 0.2 * loud)) + ec.ph + i / 3) % 1, rr = h * (0.1 + 0.52 * q);
        g.strokeStyle = rgba(LOUD, (0.18 + 0.3 * pk + 0.12 * loud) * Math.sin(Math.PI * q)); g.lineWidth = 1 + 1.2 * (1 - q);
        g.beginPath(); g.ellipse(0, 0, rr * 1.15, rr, 0, 0, TAU); g.stroke();
      }
      g.restore();
    }
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(LOUD, clamp(0.25 + 0.3 * loud + 0.45 * pk)); g.lineWidth = 1.3 + 1.6 * pk;
    roundRect(g, -w / 2 + 0.6, -h / 2 + 0.6, w - 1.2, h - 1.2, ec.r); g.stroke();
    g.restore();
    g.fillStyle = ec.sheen; roundRect(g, -w / 2, -h / 2, w, h, ec.r); g.fill();
    g.strokeStyle = ec.rim; g.lineWidth = 1; g.stroke();
    g.restore();
    if (ec.fading && f > 0.05 && f < 0.9 && !reduced && !echoReal && Math.random() < 0.35) E.particles.emit({ x: x + (Math.random() - 0.5) * w * 0.6, y: y + (Math.random() - 0.5) * h * 0.5, vx: ec.dx * 14, vy: -12, life: 1.1, size: 4, colour: QUIET, alpha: 0.5 });
  }
  function echoPos(j, out) {
    const ec = EC[j], drift = ease.inOutSine(ec.fade) * ec.h * 1.1;
    out.x = ec.x + ec.dx * drift; out.y = ec.y + bobE[j] + ec.dy * drift; return out;
  }
  function drawThread(t, loud) {
    // a faint reverb thread from the top step through the ghost tiles; each ring travels along it
    let last = -1;
    for (let j = 0; j < 3; j++) if (EC[j].fade < 0.6) last = j;
    if (last < 0) return;
    const s0 = S[0];
    A.x = s0.x + dir * s0.w * 0.5 + s0.vx * 0.5; A.y = s0.y + bob[0] - s0.h * 0.12;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(A.x, A.y);
    for (let j = 0; j <= last; j++) { echoPos(j, B); g.lineTo(B.x, B.y); }
    g.setLineDash([2, 6]); g.strokeStyle = rgba(LOUD, 0.16 + 0.14 * loud); g.lineWidth = 1.3; g.stroke(); g.setLineDash([]);
    g.restore();
    const k = (t - echoT0) / ECHO_GAP;               // which hop of the thread the echo is on
    if (k >= 0 && k < last + 1) {
      const j = Math.floor(k), u = k - j;
      if (j === 0) { L.x = A.x; L.y = A.y; } else echoPos(j - 1, L);
      echoPos(j, B);
      const a = (0.55 - j * 0.12) * clamp(echoAmp + 0.2);
      glow(g, lerp(L.x, B.x, u), lerp(L.y, B.y, u), 10 * stage.s, LOUD, a);
    }
  }
  function drawRings(dt) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < RMAX; i++) {
      if (rLife[i] <= 0) continue;
      rAge[i] += dt;
      if (rAge[i] < 0) continue;
      const u = rAge[i] / rLife[i];
      if (u >= 1) { rLife[i] = 0; continue; }
      const k = rK[i], s = S[k], amp = rAmp[i], fade = Math.pow(1 - u, 1.5) * (lowStim ? 0.65 : 1);
      if (rKind[i]) {                         // a ripple spreading across the tread where the echo landed
        tread(k, 0, Q);
        const rx = s.w * (0.08 + ease.outCubic(u) * (0.35 + 0.4 * amp)), ry = rx * 0.26;
        g.strokeStyle = rgba(mix(COL[k], '#ffffff', 0.45), amp * 0.7 * fade); g.lineWidth = 1.2 + amp;
        g.beginPath(); g.ellipse(Q.x, Q.y, rx, ry, 0, 0, TAU); g.stroke();
        continue;
      }
      const gr = 1 + 0.04 + ease.outCubic(u) * (0.14 + (reduced ? 0.4 : 0.85) * amp);
      const x = s.x, y = s.y + bob[k];
      roundRect(g, x - (s.w * gr) / 2, y - (s.h * gr) / 2, s.w * gr, s.h * gr, s.r * gr);
      g.strokeStyle = rgba(COL[k], amp * 0.1 * fade); g.lineWidth = 9 + 8 * amp; g.stroke();
      g.strokeStyle = rgba(mix(COL[k], '#ffffff', 0.3), amp * 0.45 * fade); g.lineWidth = (1 + 1.4 * amp) * (1 - u * 0.5); g.stroke();
    }
    g.restore();
  }
  function drawBead(t, dt) {
    const melt = steady;
    if (melt >= 1) { trN = 0; return; }
    ptAt(st, BP);
    const f = st * N, k = Math.min(N, Math.floor(f)), k1 = Math.min(N, k + 1), u = f - k;
    const vol = lerp(VOL[k], VOL[k1], smooth(u)), col = mix(COL[k], COL[k1], smooth(u));
    const pul = st < 0.2 ? Math.exp(-(t - ring0At) * 5) * (1 - st * 5) * loudness() : 0;
    const r = beadR(st) * (1 - melt * 0.6) * (1 + (reduced ? 0.06 : 0.16) * pul);
    const hover = reduced ? 0 : Math.sin(t * 2.2) * 1.2 * vol;
    // trail while it moves
    if (trN === 0 || Math.hypot(BP.x - trX[(trHead + trN - 1) % TRN], BP.y - trY[(trHead + trN - 1) % TRN]) > 2) {
      const i = (trHead + trN) % TRN; if (trN < TRN) trN++; else trHead = (trHead + 1) % TRN;
      trX[i] = BP.x; trY[i] = BP.y;
    } else if (trN > 1 && Math.random() < dt * 20) { trHead = (trHead + 1) % TRN; trN--; }
    for (let q = 1; q < trN; q++) {
      const i = (trHead + q) % TRN, k2 = q / trN;
      glow(g, trX[i], trY[i], r * (0.8 + 1.2 * k2), col, 0.2 * k2 * (1 - melt));
    }
    const a = 1 - melt, by = BP.y + hover;
    glow(g, BP.x, by, r * (3.4 + 1.8 * vol + 1.2 * pul), col, (0.45 + 0.35 * vol + 0.2 * pul) * a);
    orb(g, BP.x, by, r, mix(col, '#ffffff', 0.4), { alpha: a });
    glow(g, BP.x - r * 0.25, by - r * 0.3, r * 0.9, '#ffffff', 0.35 * a);
    // a slow aura ring: wide when loud, small and still when quiet
    if (!reduced) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(col, 0.4 * vol * a + 0.08); g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(BP.x, by + r * 0.9, r * (1.25 + 0.8 * vol + 0.25 * vol * Math.sin(t * 3)), r * 0.34, 0, 0, TAU); g.stroke(); g.restore();
    }
  }
  function drawTwist(t) {
    if (twistAt < 0) return;
    const k = t - twistAt;
    if (twistKind === 0) {                    // three resting lights form a calm little path down the stair
      for (let i = 1; i <= N; i++) {
        const a = smooth(clamp((k - (i - 1) * 0.5) / 0.8));
        if (a <= 0) continue;
        tread(i, -0.6, Q);
        const y = Q.y - 5 * stage.s, flick = reduced ? 1 : 0.92 + 0.08 * Math.sin(t * 1.3 + i);
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(STEADY, 0.22 * a);
        g.beginPath(); g.ellipse(Q.x, Q.y, 13 * stage.s, 3.4 * stage.s, 0, 0, TAU); g.fill(); g.restore();
        glow(g, Q.x, y, 26 * stage.s, STEADY, 0.5 * a * flick);
        orb(g, Q.x, y, 4.4 * stage.s, mix(STEADY, '#ffffff', 0.55), { alpha: a });
      }
    } else if (twistKind === 2) {             // a quiet island of mist surfaces beside the stair
      const a = smooth(clamp(k / 1.6));
      g.save(); g.globalCompositeOperation = 'lighter';
      glow(g, isle.x, isle.y, isle.r * 1.6, QUIET, 0.22 * a);
      g.fillStyle = rgba(QUIET, 0.12 * a); g.beginPath(); g.ellipse(isle.x, isle.y, isle.r, isle.r * 0.28, 0, 0, TAU); g.fill();
      for (let i = 0; i < 2; i++) {
        const q = (k * 0.22 + i * 0.5) % 1;
        g.strokeStyle = rgba(QUIET, 0.3 * a * (1 - q)); g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(isle.x, isle.y, isle.r * (0.6 + q * 0.9), isle.r * (0.17 + q * 0.25), 0, 0, TAU); g.stroke();
      }
      g.restore();
    }
  }
  function finale(t, dt) {
    const k = t - finAt;
    // the whole stair hums once, top to bottom, each step quieter (gentle when the feeling is heavy)
    for (let s = 0; s < 4; s++) if (!casc[s] && k > 0.2 + s * 0.42) {
      casc[s] = true;
      energy[s] = Math.max(energy[s], (heavy ? 0.22 : 0.35) + VOL[s] * 0.3);
      if (!heavy) addRing(s, VOL[s] * 0.55 + 0.15);
    }
    // calm motes rise slowly from the low step
    const s3 = S[3], rate = (heavy ? 5 : 14) * (lowStim || reduced ? 0.4 : 1);
    if (k < 3.6 && Math.random() < rate * dt) {
      E.particles.emit({ x: s3.x + (Math.random() - 0.5) * s3.w * 0.8, y: s3.y - s3.h * 0.4, vx: (Math.random() - 0.5) * 8, vy: -(heavy ? 14 : 24) - Math.random() * 14, life: 2.2, size: 4 + Math.random() * 3, colour: Math.random() < 0.5 ? STEADY : QUIET, drag: 0.985, alpha: 0.7 });
    }
  }

  // -------------------------------------------------------------- input --
  function inTile(p, k, m) {
    const s = S[k], x = s.x, y = s.y + bob[k];
    return p.x > x - s.w / 2 - m + Math.min(0, s.vx) && p.x < x + s.w / 2 + m + Math.max(0, s.vx) && p.y > y - s.h / 2 + s.vy - m && p.y < y + s.h / 2 + m;
  }
  function hitStep(p) {
    const nx = nextStep();
    if (landed < N && inTile(p, nx, 22)) return nx;      // forgiving for the step that is expected next
    for (let k = 0; k <= N; k++) if (inTile(p, k, 8)) return k;
    return -1;
  }

  return {
    get progress() { return clamp(st); },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0 || E.phase !== 'play') return;
      const k = hitStep(p);
      if (k < 0) return;
      presses.set(p.id, k); pressC[k]++;
      call(k, true);
    },
    move() {},
    up(p) {
      const k = presses.get(p.id);
      if (k == null) return;
      presses.delete(p.id); pressC[k] = Math.max(0, pressC[k] - 1);
    },
    assist() {
      if (finAt >= 0 || landed >= N) return;
      const half = 1 / (N * 2);
      lastTouch = E.now();
      const next = nextStep();
      if (target - st > half + 1e-3) { notYet(next, lockedNow); return; }
      const to = Math.min(1, (Math.round(target / half) + 1) * half);
      if (!request(to)) { notYet(next, true); return; }
      const landing = Math.abs(to * N - Math.round(to * N)) < 1e-3;
      target = to;
      kick();
      if (landing) { pressAt[next] = E.now(); E.sound('click', { intensity: 0.26, pitch: 1.1 - next * 0.08 }); E.haptic('light'); }
      else { listen[next] = Math.max(listen[next], 0.3); E.sound('pluck', { note: NOTE[next] + 1, intensity: 0.14 }); E.haptic('light'); }
    },
    pointAt(p) { return ptAt(p, { x: 0, y: 0 }); },
    hint() {
      if (finAt >= 0 || landed >= N || target >= 1 || lockedNow) return null;
      if (target - st > 1 / N + 1e-3) return null;
      const k = nextStep(), s = S[k];
      return { tap: { x: s.x, y: s.y + bob[k] } };
    },
    twist() {
      twistAt = E.now();
      const s = twistKind === 2 ? isle : S[Math.min(N, landed + 1)];
      E.particles.burst(s.x, s.y, reduced || lowStim ? 4 : 9, { speed: 26, colour: STEADY, life: 1.4, size: 4, kind: 'glint' });
      if (twistKind === 1) for (let k = 0; k < N; k++) addRing(k, 0.15 + 0.1 * VOL[k], k * 0.3);
    },
    finish() {
      finAt = E.now();
      for (const ec of EC) ec.fading = true;
      if (landed < N) steady = 1;
      E.sound('shimmer', { intensity: heavy ? 0.22 : 0.36 });
    },
    destroy() { presses.clear(); },
  };
}
