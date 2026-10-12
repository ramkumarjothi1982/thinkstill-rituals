// GE-22 · STAR STITCH — detached constellation stars (multi-node trace).
// Three loose stars drift in a pool of night. Touch the glowing star and
// trace a bright thread to the next one, then the next, then back to the
// first. Every finished star-to-star connection leaves a glowing thread
// behind — a running stitch of light that rings like a string when it lands
// and can be plucked afterwards. Win: the three-star stitch closes, its
// stitches join into one steady line and the outline stops drifting.
//
// Photos ARE the stars: round, softly glowing star medallions that start
// misty and drifting, and cool into their own calm colours (and stop
// drifting) as a thread of light reaches them. Extra photos are smaller
// companion stars that a fine spur of thread reaches after each stitch.
// The person's words are the constellation's name, written inside the
// outline: loose letters that settle into place with every stitch.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, glow, glint, orb, halo, canvas as makeCanvas, FONT, wrap, Spring, Spring2 } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-22',
  howTo: 'Trace a thread of light from star to star to stitch all three.',
  steps: [
    'Touch the glowing star and trace the dotted line to the next star.',
    'Each finished thread stays glowing — carry on to the third star.',
    'Close the outline back to the first star and let it rest, steady.',
  ],
  tapAlt: 'each press stitches a third of the next thread',
  words: 'Your words become the constellation’s name, written inside the outline — loose letters that settle with every stitch.',
  photos: {
    where: 'Your photos are the stars themselves (and the little companion stars nearby).',
    becomes: 'softly glowing round stars',
    touch: 'You stitch them together with threads of light;',
    change: 'each one cools from a misty, drifting light into its own calm colours as a thread reaches it, and stops drifting.',
    payoff: 'At the end they rest as a gentle constellation under your words, and drift a little into the distance.',
  },
  finaleSec: 4.4,
};

const SEGS = 3;              // A→B, B→C, C→A
const PRESSES = 9;           // Tap instead: three presses per thread
const BANK = 0.05;           // how far input may run ahead of the world law
const N = 16;                // interior points of each thread string
const H = 1 / 240;           // string physics step
const ASSIST_RATE = 0.36;    // progress per second while an assist press animates
const DASH = [7, 5];
const NODASH = [];

// pleasing three-star figures in (inset) stage-normalised coordinates — broad, roomy outlines
const FIGURES = [
  [[0.08, 0.15], [0.92, 0.26], [0.48, 0.92]],
  [[0.12, 0.3], [0.88, 0.15], [0.6, 0.9]],
  [[0.5, 0.15], [0.9, 0.82], [0.1, 0.72]],
  [[0.13, 0.17], [0.88, 0.52], [0.2, 0.9]],
  [[0.18, 0.86], [0.86, 0.74], [0.42, 0.15]],
  [[0.86, 0.18], [0.8, 0.9], [0.12, 0.52]],
];

function makeString() { return { y: new Float32Array(N + 2), v: new Float32Array(N + 2) }; }
function stepString(S, T, c, h) {
  const y = S.y, v = S.v;
  for (let i = 1; i <= N; i++) v[i] += (T * (y[i - 1] - 2 * y[i] + y[i + 1]) - c * v[i]) * h;
  for (let i = 1; i <= N; i++) y[i] += v[i] * h;
}
function pluckString(S, u, amp, lim) {
  const i0 = clamp(Math.round(u * (N + 1)), 1, N);
  for (let i = 1; i <= N; i++) {
    const k = i <= i0 ? i / i0 : (N + 1 - i) / (N + 1 - i0);
    S.y[i] = clamp(S.y[i] + amp * k, -lim, lim);
  }
}
function copyString(src, dst) { dst.y.set(src.y); dst.v.set(src.v); }
function clearString(S) { S.y.fill(0); S.v.fill(0); }
function stringAt(S, u) { const f = clamp(u) * (N + 1), i = Math.min(N, Math.floor(f)); return lerp(S.y[i], S.y[i + 1], f - i); }
/** where the finger path p0→p1 crosses the line a→b (u along a→b), or -1 */
function crossU(px0, py0, px1, py1, ax, ay, bx, by) {
  const rX = px1 - px0, rY = py1 - py0, sX = bx - ax, sY = by - ay;
  const den = rX * sY - rY * sX;
  if (Math.abs(den) < 1e-6) return -1;
  const qx = ax - px0, qy = ay - py0;
  const tt = (qx * sY - qy * sX) / den, u = (qx * rY - qy * rX) / den;
  return tt >= 0 && tt <= 1 && u > 0.1 && u < 0.9 ? u : -1;
}

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const R = E.rand;
  const reduced = !!(E.reduced || E.lowStim);
  const heavy = !!E.heavy;
  const calm0 = E.calm;
  const vol = heavy ? 0.75 : 1;
  const motion = (reduced ? 0.3 : 1) * (heavy ? 0.75 : 1) * (1 - calm0 * 0.5);

  // ------------------------------------------------------------ palette --
  const night = mix(pal.deep || pal.ink || '#15123d', '#0a0626', 0.72);   // a dusk-indigo pool of night in every realm
  const glowC = pal.glow || '#fff4c8';
  const accent = pal.accent || '#b9a6ff';
  const warm = pal.warm || '#ffb37a';
  const threadC = mix(glowC, '#ffffff', 0.32);
  const stableC = mix(mix(glowC, warm, 0.28), '#ffffff', 0.4);
  let sats = [glowC, mix(glowC, accent, 0.5), mix(glowC, warm, 0.55)];
  if (E.round > 1) { const k = Math.floor(R() * 3); sats = [sats[k], sats[(k + 1) % 3], sats[(k + 2) % 3]]; }
  sats = sats.map((c) => mix(c, '#fff6ea', calm0 * 0.3));
  const cols = sats.map((c, i) => mix(c, '#ffffff', i === 1 ? 0.32 : 0.22));

  // ------------------------------------------------------------- figure --
  const fig = E.round === 1 ? FIGURES[0] : FIGURES[1 + Math.floor(R() * (FIGURES.length - 1))];
  const flip = E.round > 1 && R() < 0.5, jit = E.round > 1 ? 0.035 : 0;
  const anchors = fig.map(([u, v]) => [clamp((flip ? 1 - u : u) + (R() - 0.5) * 2 * jit, 0.1, 0.9), clamp(v + (R() - 0.5) * 2 * jit, 0.1, 0.9)]);
  const s0 = E.round === 1 ? 0 : Math.floor(R() * 3);
  const order = [s0, (s0 + 1) % 3, (s0 + 2) % 3];          // stitch order of the three stars

  // ------------------------------------------------------------- photos --
  const n = photos.n;
  const off = n ? (E.round - 1) % n : 0;                     // loop rounds change the hero photo
  const pIdx = (j) => (j + off) % n;
  const mkStar = (i) => ({
    i, ph: -1, col: cols[i], sat: sats[i], x: 0, y: 0, bx: 0, by: 0,
    ax: (8 + R() * 5), ay: (7 + R() * 5), fx: 0.22 + R() * 0.16, fy: 0.18 + R() * 0.16, p1: R() * TAU, p2: R() * TAU, p3: R() * TAU,
    loose: 1, looseT: 1, settle: 0, settleT: 0, lit: 0, spin: R() * TAU, spinV: (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.05), tf: 0.8 + R() * 0.9,
    k: new Spring2(0, 0, { stiffness: 70, damping: 6.5 }), sq: new Spring(1, { stiffness: 260, damping: 13 }), wob: new Wobble(), size: 1,
  });
  const stars = [mkStar(0), mkStar(1), mkStar(2)];
  for (let k = 0; k < Math.min(3, n); k++) stars[order[k]].ph = pIdx(k);
  if (n === 1) stars[order[0]].size = 1.12;                  // one photo = the hero star
  const comps = [];
  const photoComps = Math.max(0, n - 3), decor = Math.max(0, 2 - photoComps);
  const segOff = Math.floor(R() * 3);
  for (let j = 0; j < photoComps + decor; j++) {
    const seg = (j + segOff) % 3;
    comps.push({
      ph: j < photoComps ? pIdx(3 + j) : -1, seg, parent: order[(seg + 1) % 3], col: mix(cols[(j + 1) % 3], '#ffffff', 0.15),
      jit: (R() - 0.5) * 0.5, dx: 0, dy: 0, x: 0, y: 0, conn: 0, delay: 0.15 + 0.2 * (j >= 3 ? 1 : 0), wait: 0, settled: false,
      ax: 4 + R() * 3, ay: 4 + R() * 3, fx: 0.25 + R() * 0.2, fy: 0.2 + R() * 0.2, p1: R() * TAU, p2: R() * TAU, s: makeString(), spin: R() * TAU,
    });
  }

  // constellations stitched in earlier Keep-playing rounds rest, tiny and faint, in the far sky
  const past = [];
  for (let k = 0; k < Math.min(5, E.round - 1); k++) {
    const a0 = R() * TAU, sz = 0.8 + R() * 0.5, pts = [];
    for (let j = 0; j < 3; j++) { const a = a0 + (j / 3) * TAU + (R() - 0.5) * 0.9, r = (14 + R() * 8) * sz; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    past.push({ pts, x: 0, y: 0, ph: R() * TAU, col: sats[k % 3] });
  }

  // ----------------------------------------------------- night backdrop --
  const NS = reduced ? 90 : 160;
  const SX = new Float32Array(NS), SY = new Float32Array(NS), SR = new Float32Array(NS), SP = new Float32Array(NS), SF = new Float32Array(NS);
  const band = -0.55 + R() * 0.4;
  for (let i = 0; i < NS; i++) {
    let x, y;
    if (i < NS * 0.45) { const al = (R() * 2 - 1) * 1.1, of = (R() + R() + R() - 1.5) * 0.16; x = al * Math.cos(band) - of * Math.sin(band); y = al * Math.sin(band) + of * Math.cos(band); }
    else { x = R() * 2 - 1; y = R() * 2 - 1; }
    SX[i] = x; SY[i] = y; SR[i] = R() < 0.08 ? 1.5 + R() * 0.6 : 0.5 + R() * 0.8; SP[i] = R() * TAU; SF[i] = 0.4 + R() * 1.2;
  }
  // soft nebula sprite (made once)
  const neb = makeCanvas(256, 256);
  {
    const ng = neb.getContext('2d');
    ng.globalCompositeOperation = 'lighter';
    const blobs = [[0.36, 0.42, 0.42, accent, 0.2], [0.64, 0.58, 0.36, glowC, 0.12], [0.5, 0.5, 0.5, mix(accent, night, 0.45), 0.16], [0.72, 0.3, 0.24, warm, 0.07], [0.28, 0.72, 0.26, glowC, 0.07]];
    for (const [x, y, r, c, a] of blobs) {
      const gr = ng.createRadialGradient(x * 256, y * 256, 0, x * 256, y * 256, r * 256);
      gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.55, rgba(c, a * 0.4)); gr.addColorStop(1, rgba(c, 0));
      ng.fillStyle = gr; ng.fillRect(0, 0, 256, 256);
    }
  }
  // dark soft backing behind the name (legibility on any realm)
  const blob = makeCanvas(64, 64);
  {
    const bg = blob.getContext('2d'), gr = bg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(night, 0.72)); gr.addColorStop(0.6, rgba(night, 0.42)); gr.addColorStop(1, rgba(night, 0));
    bg.fillStyle = gr; bg.fillRect(0, 0, 64, 64);
  }

  // ------------------------------------------------------------- layout --
  let D, Dc, HIT, TOL, M, poolRx, poolRy, poolGrad, ringR, U, nameDirty = true, figSc = 1;
  function basePos(i) { const a = anchors[i]; return [stage.x + M + a[0] * (stage.w - 2 * M), stage.y + M + a[1] * (stage.h - 2 * M)]; }
  function fit() {
    U = stage.s;
    const mn = Math.min(stage.w, stage.h);
    D = clamp(mn * 0.18, 50, 84);
    Dc = clamp(D * 0.66, 44, 58);
    HIT = Math.max(D * 0.5 + 16, 44);
    TOL = 34 * U + 16;
    M = D * 0.52 + 6;
    poolRx = Math.max(stage.w, stage.h * 0.8) * 0.72; poolRy = stage.h * 0.62;
    poolGrad = g.createRadialGradient(0, 0, 0, 0, 0, poolRx);
    poolGrad.addColorStop(0, rgba(night, 0.8)); poolGrad.addColorStop(0.5, rgba(night, 0.66)); poolGrad.addColorStop(0.8, rgba(night, 0.3)); poolGrad.addColorStop(1, rgba(night, 0));
    ringR = mn * 0.47;
    for (const st of stars) { const [x, y] = basePos(st.i); st.bx = x; st.by = y; if (!st.x) { st.x = x; st.y = y; } }
    placeCompanions();
    placePast();
    nameDirty = true;
  }
  function placePast() {
    const taken = [];
    for (const pc of past) {
      let best = null, bs = -Infinity;
      for (let iy = 0; iy <= 8; iy++) for (let ix = 0; ix <= 6; ix++) {
        if (iy > 0 && iy < 8 && ix > 0 && ix < 6) continue;          // the rim of the sky only
        const x = stage.x + 28 + (stage.w - 56) * ix / 6, y = stage.y + 40 + (stage.h - 70) * iy / 8;
        let c = 200;
        for (const st of stars) c = Math.min(c, Math.hypot(x - st.bx, y - st.by) - D * 0.6);
        for (const cp of comps) { const P = stars[cp.parent]; c = Math.min(c, Math.hypot(x - P.bx - cp.dx, y - P.by - cp.dy) - Dc * 0.6); }
        for (const q of taken) c = Math.min(c, Math.hypot(x - q[0], y - q[1]) - 50);
        if (c > bs) { bs = c; best = [x, y]; }
      }
      taken.push(best); pc.x = best[0]; pc.y = best[1];
    }
  }
  function placeCompanions() {
    const cxB = (stars[0].bx + stars[1].bx + stars[2].bx) / 3, cyB = (stars[0].by + stars[1].by + stars[2].by) / 3;
    const placed = [];
    const segDist = (x, y, a, b) => {
      const dx = b.bx - a.bx, dy = b.by - a.by, L2 = dx * dx + dy * dy || 1;
      const t = clamp(((x - a.bx) * dx + (y - a.by) * dy) / L2);
      return Math.hypot(x - (a.bx + dx * t), y - (a.by + dy * t));
    };
    for (const c of comps) {
      const P = stars[c.parent];
      const a0 = Math.atan2(P.by - cyB, P.bx - cxB) + c.jit;
      const r = Dc / 2;
      let best = null, bestScore = -Infinity;
      for (let k = 0; k < 24; k++) {
        const da = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (TAU / 24);
        for (const dd of [1.3, 1.05, 1.6]) {
          const a = a0 + da, d = (D / 2 + r) * dd + 12 * U;
          const x = P.bx + Math.cos(a) * d, y = P.by + Math.sin(a) * d;
          let clear = Math.min(x - stage.x - r, stage.x + stage.w - x - r, y - stage.y - r - 4, stage.y + stage.h - y - r - 4) * 1.4;
          for (const st of stars) clear = Math.min(clear, Math.hypot(x - st.bx, y - st.by) - D / 2 - r - 8);
          for (const q of placed) clear = Math.min(clear, Math.hypot(x - q[0], y - q[1]) - r * 2 - 8);
          for (let s = 0; s < 3; s++) clear = Math.min(clear, segDist(x, y, stars[order[s]], stars[order[(s + 1) % 3]]) - r - 10);
          clear = Math.min(clear, Math.hypot(x - cxB, y - cyB) - 70 * U - r);
          const score = Math.min(clear, 26) - Math.abs(da) * 4 - (dd - 1.3) * (dd - 1.3) * 10;
          if (score > bestScore) { bestScore = score; best = [x, y]; }
        }
      }
      placed.push(best);
      c.dx = best[0] - P.bx; c.dy = best[1] - P.by;
    }
  }
  fit();
  E.onResize(fit);

  // -------------------------------------------------------------- state --
  let wanted = 0, prog = 0, shown = 0, assistTo = null;
  let completed = 0, lastStep = 0, completeAt = -1, doneFlag = false, finAt = -1, departed = false;
  let drag = null, fx0 = 0, fy0 = 0, fingerOn = false, lastTickAt = -9, lastWaitAt = -9, lastLookAt = -9, emitAcc = 0;
  let headWob = new Wobble(), strain = 0;
  let ringA = R() * TAU, ringV = 0.05 * motion + 0.01, sweepA = R() * TAU, skyA = R() * TAU, acc = 0;
  let stableK = 0, twistAt = -1, cxF = 0, cyF = 0;
  const twistKind = E.seed % 3;
  const threads = [0, 1, 2].map(() => ({ s: makeString(), lit: 0, plAt: -9 }));
  const act = makeString();
  const pointers = new Map();
  const restLights = [];

  // ------------------------------------------------------------ helpers --
  const A = (sg) => stars[order[sg % 3]];
  const B = (sg) => stars[order[(sg + 1) % 3]];
  const segOf = (p) => Math.min(SEGS - 1, Math.floor(p * SEGS + 1e-4));
  /** Point on the A→B→C→A stitch path at progress p (continuous; same segment rule as the stitch counter). */
  function headXY(p) { p = clamp(p); const sg = segOf(p), f = clamp(p * SEGS - sg); const a = A(sg), b = B(sg); return [lerp(a.x, b.x, f), lerp(a.y, b.y, f), sg, f]; }

  /** Feed a finger position: the thread only grows when the finger is on the line just ahead of the head. */
  function feed(x, y) {
    if (prog >= 1 || finAt >= 0) return false;
    const sg = segOf(wanted), a = A(sg), b = B(sg);
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    let f = ((x - a.x) * dx + (y - a.y) * dy) / (L * L);
    const d = Math.abs((x - a.x) * dy - (y - a.y) * dx) / L;
    if (f > 0.8 && Math.hypot(x - b.x, y - b.y) < D * 0.5 * b.size) f = Math.max(f, 1);   // reaching the star's disc = arriving
    const h = wanted * SEGS - sg;
    fingerOn = d < TOL && f > h - 0.25;
    if (d < TOL && f > h + 0.001) {
      wanted = Math.min(prog + BANK, (sg + Math.min(1, f)) / SEGS);
      return true;
    }
    return false;
  }

  function onStitch(k) {
    const arr = B(k), dep = A(k);
    copyString(act, threads[k].s); clearString(act);
    pluckString(threads[k].s, 0.5, (reduced ? 5 : 12) * U, 22 * U);
    threads[k].lit = 1;
    // the thread tugs both stars together, then they spring back
    const dx = dep.x - arr.x, dy = dep.y - arr.y, L = Math.hypot(dx, dy) || 1, kick = (reduced ? 40 : 120) * U;
    arr.k.sx.v += (dx / L) * kick; arr.k.sy.v += (dy / L) * kick; dep.k.sx.v -= (dx / L) * kick * 0.6; dep.k.sy.v -= (dy / L) * kick * 0.6;
    arr.sq.v = -2.4; arr.lit = 1;
    arr.settleT = 1;
    E.sound('star', { intensity: 0.45 * vol, pan: clamp((arr.x - stage.cx) / stage.w * 2, -1, 1) });
    E.sound('glass', { note: Math.min(9, k * 2 + 5), intensity: 0.4 * vol });
    E.checkpoint('step');
    E.ripples.add(arr.x, arr.y, { colour: glowC, speed: 70, alpha: 0.5, r: D * 0.5 });
    E.particles.burst(arr.x, arr.y, reduced ? 4 : heavy ? 8 : 14, { speed: heavy ? 34 : 64, colour: threadC, life: 1.3, size: 6 });
    if (!heavy && !reduced) E.particles.burst(arr.x, arr.y, 4, { speed: 50, colour: '#ffffff', life: 1, size: 5, kind: 'glint' });
    if (arr.ph >= 0) { photos.dust(arr.ph, arr.x, arr.y, D * arr.size, reduced ? 6 : 14, { shape: 'circle', up: 22, speed: 22 }); E.checkpoint('photo', arr.ph); }
    if (k === SEGS - 1) {
      completeAt = E.now();
      E.sound(heavy ? 'settle' : 'bloom', { intensity: 0.45 * vol });
      E.react('success');
    } else if (E.round === 1) E.hint(k === 0 ? 'One thread holds. Carry on to the next star.' : 'Now close the outline back to the first star.');
  }

  // ---------------------------------------------------------- simulate --
  function simulate(dt, t) {
    if (assistTo != null) {
      wanted = Math.min(assistTo, wanted + dt * ASSIST_RATE);
      if (wanted >= assistTo - 1e-6) { wanted = assistTo; if (prog >= assistTo - 1e-4) assistTo = null; }
    }
    if (drag != null) feed(fx0, fy0);                       // a held finger keeps asking
    prog = E.gate(wanted);
    if (wanted > prog + BANK) wanted = prog + BANK;
    if (assistTo != null && prog >= assistTo - 1e-4) assistTo = null;
    shown = lerp(shown, prog, 1 - Math.exp(-dt * 16)); if (Math.abs(shown - prog) < 1e-4) shown = prog;

    if (!departed && prog > 0.01) { departed = true; A(0).settleT = Math.max(A(0).settleT, 0.4); }
    const c = Math.min(SEGS, Math.floor(prog * SEGS + 1e-4));
    while (completed < c) onStitch(completed++);
    // a rising pentatonic note every sixth of a thread
    const step = Math.floor(prog * SEGS * 6 + 1e-4);
    if (step > lastStep) {
      lastStep = step;
      if (step % 6) {
        const sg = Math.floor(step / 6), j = step % 6;
        E.sound('glass', { note: Math.min(9, sg * 2 + j - 1), intensity: 0.28 * vol });
        if (t - lastTickAt > 0.09) { lastTickAt = t; E.haptic('tick'); }
      }
    }
    // done = the outline is closed and resting (every spur has landed, nothing is being dragged)
    if (!doneFlag && completed >= SEGS && drag == null && assistTo == null && E.now() - completeAt > 0.8 && comps.every((cp) => cp.settled)) doneFlag = true;
    if (completed >= SEGS) stableK = Math.min(1, stableK + dt / 1.4);

    // stars: loose drift that calms as they are stitched
    const deg = [0, 0, 0];
    if (completed >= 1) { deg[order[0]]++; deg[order[1]]++; }
    if (completed >= 2) { deg[order[1]]++; deg[order[2]]++; }
    if (completed >= 3) { deg[order[2]]++; deg[order[0]]++; }
    const fin = finAt >= 0 ? ease.inOutSine(clamp((E.now() - finAt) / 2.6)) : 0;
    const sc = 1 - 0.14 * fin, lift = -stage.h * 0.035 * fin;
    figSc = sc;
    const [hx, hy, hsg, hf] = headXY(shown);
    for (const st of stars) {
      st.looseT = completed >= SEGS ? 0 : deg[st.i] === 0 ? 1 : deg[st.i] === 1 ? 0.45 : 0.15;
      if (drag != null && st === A(segOf(prog))) st.looseT = Math.min(st.looseT, 0.6);
      st.loose = lerp(st.loose, st.looseT, 1 - Math.exp(-dt * 1.6));
      st.settle = Math.min(st.settleT, st.settle + dt / 1.1);
      st.lit = Math.max(0, st.lit - dt * 0.8);
      st.spin += st.spinV * dt * (reduced ? 0.4 : 1);
      st.k.update(dt); st.sq.update(dt); st.wob.update(dt);
      const amp = motion * st.loose * U;
      let x = st.bx + (Math.sin(t * st.fx + st.p1) * st.ax + Math.sin(t * st.fx * 0.53 + st.p3) * st.ax * 0.4) * amp + st.k.x + st.wob.v * 5;
      let y = st.by + Math.cos(t * st.fy + st.p2) * st.ay * amp + st.k.y;
      // the waiting star leans a touch towards the approaching thread
      if (completed < SEGS && st === B(hsg) && shown > 0) { const k2 = smooth(invLerp(0.55, 1, hf)) * 5 * U; const L = Math.hypot(hx - x, hy - y) || 1; x += (hx - x) / L * k2; y += (hy - y) / L * k2; }
      if (fin > 0) { x = cxF + (x - cxF) * sc; y = cyF + (y - cyF) * sc + lift; }
      st.x = x; st.y = y;
    }
    for (const cp of comps) {
      const P = stars[cp.parent];
      if (cp.seg < completed && cp.conn < 1) { cp.wait += dt; if (cp.wait > cp.delay) cp.conn = Math.min(1, cp.conn + dt / 0.7); }
      if (cp.conn >= 1 && !cp.settled) {
        cp.settled = true;
        pluckString(cp.s, 0.5, (reduced ? 3 : 7) * U, 14 * U);
        E.sound('bubble', { note: Math.min(9, 3 + cp.seg * 2), intensity: 0.3 * vol });
        if (cp.ph >= 0) { photos.dust(cp.ph, cp.x, cp.y, Dc, reduced ? 4 : 9, { shape: 'circle', up: 18, speed: 18 }); E.checkpoint('photo', cp.ph); }
      }
      const loose = cp.settled ? 0.1 : 1, amp = motion * loose * U;
      let x = P.bx + cp.dx + Math.sin(t * cp.fx + cp.p1) * cp.ax * amp, y = P.by + cp.dy + Math.cos(t * cp.fy + cp.p2) * cp.ay * amp;
      if (fin > 0) { x = cxF + (x - cxF) * sc; y = cyF + (y - cyF) * sc + lift; }
      cp.x = x; cp.y = y; cp.spin += dt * 0.06;
    }
    // thread strings
    acc += dt; let n2 = 0;
    const cDone = completed >= SEGS ? lerp(3, 7, stableK) : 3, lim = 24 * U;
    while (acc >= H && n2 < 14) {
      acc -= H; n2++;
      for (let k = 0; k < completed; k++) stepString(threads[k].s, 5600, cDone, H);
      if (completed < SEGS) stepString(act, 4200, 4, H);
      for (const cp of comps) if (cp.conn > 0) stepString(cp.s, 6400, 3.5, H);
    }
    if (n2 >= 14) acc = 0;
    for (let i = 1; i <= N; i++) act.y[i] = clamp(act.y[i], -lim, lim);
    for (const th of threads) th.lit = Math.max(0, th.lit - dt * 0.7);
    // background motion
    ringV = lerp(ringV, twistAt >= 0 ? 0.004 : 0.05 * motion + 0.01, 1 - Math.exp(-dt * (twistAt >= 0 ? 0.9 : 0.4)));
    ringA += ringV * dt; sweepA += dt * 0.22 * motion; skyA += dt * 0.012 * (0.4 + motion);
    headWob.update(dt);
    strain = Math.max(0, strain - dt * 2);
  }

  // ------------------------------------------------------------ drawing --
  function drawSky(t) {
    g.save(); g.translate(stage.cx, stage.cy); g.scale(1, poolRy / poolRx);
    g.fillStyle = poolGrad; g.beginPath(); g.arc(0, 0, poolRx, 0, TAU); g.fill();
    g.restore();
    const ns = Math.max(stage.w, stage.h) * 1.05;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.85 * (1 - calm0 * 0.35);
    g.translate(stage.cx, stage.cy); g.rotate(skyA * 0.6); g.drawImage(neb, -ns / 2, -ns / 2, ns, ns);
    g.restore();
    // slowly wheeling star field (milky band + scatter)
    const cs = Math.cos(skyA), sn = Math.sin(skyA), FR = Math.max(stage.w, stage.h) * 0.66;
    const ex = 1 / (stage.w * 0.56), ey = 1 / (stage.h * 0.56);
    g.save(); g.fillStyle = '#fff8ee';
    for (let i = 0; i < NS; i++) {
      const px = stage.cx + (SX[i] * cs - SY[i] * sn) * FR, py = stage.cy + (SX[i] * sn + SY[i] * cs) * FR;
      const ux = (px - stage.cx) * ex, uy = (py - stage.cy) * ey, e = ux * ux + uy * uy;
      if (e > 1.1) continue;
      const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * SF[i] * (heavy ? 0.6 : 1) + SP[i]);
      const a = clamp(1.2 - e) * (0.42 + SR[i] * 0.32) * tw;
      if (a < 0.02) continue;
      g.globalAlpha = a;
      const r = SR[i] * U;
      if (r < 1.1) g.fillRect(px - r * 0.5, py - r * 0.5, r, r); else { g.beginPath(); g.arc(px, py, r * 0.62, 0, TAU); g.fill(); }
      if (SR[i] > 1.4) glow(g, px, py, r * 6, i % 2 ? glowC : accent, a * 0.5);
    }
    g.restore();
    for (const pc of past) {
      const tw = reduced ? 0.8 : 0.7 + 0.3 * Math.sin(t * 0.6 + pc.ph);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(threadC, 0.2 * tw); g.lineWidth = 1;
      g.beginPath(); g.moveTo(pc.x + pc.pts[0][0], pc.y + pc.pts[0][1]); g.lineTo(pc.x + pc.pts[1][0], pc.y + pc.pts[1][1]); g.lineTo(pc.x + pc.pts[2][0], pc.y + pc.pts[2][1]); g.closePath(); g.stroke();
      g.restore();
      for (const q of pc.pts) { glow(g, pc.x + q[0], pc.y + q[1], 6 * U, pc.col, 0.45 * tw); glow(g, pc.x + q[0], pc.y + q[1], 2.2 * U, '#ffffff', 0.7 * tw); }
    }
    // star-chart ring with ticks, slowly turning (the twist lets it fall behind)
    g.save(); g.translate(stage.cx, stage.cy); g.rotate(ringA);
    g.strokeStyle = rgba(threadC, 0.11 * (1 - calm0 * 0.3)); g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU, r1 = ringR + (i % 6 ? 4 : 9) * U; g.moveTo(Math.cos(a) * ringR, Math.sin(a) * ringR); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); }
    g.stroke();
    g.beginPath(); g.arc(0, 0, ringR - 3 * U, 0, TAU); g.stroke();
    g.setLineDash(DASH_SKY); g.strokeStyle = rgba(threadC, 0.06); g.beginPath(); g.ellipse(0, 0, ringR * 0.96, ringR * 0.33, skyA * 1.6, 0, TAU); g.stroke(); g.setLineDash(NODASH);
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(glowC, 0.13); g.lineWidth = 5 * U; g.beginPath(); g.arc(stage.cx, stage.cy, ringR + 2 * U, sweepA, sweepA + 0.55); g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.18); g.lineWidth = 1.2; g.beginPath(); g.arc(stage.cx, stage.cy, ringR + 2 * U, sweepA + 0.4, sweepA + 0.55); g.stroke();
    g.restore();
  }
  const DASH_SKY = [2, 7];

  /** Build a thread path from (x0,y0) to (x1,y1) displaced by string S. */
  function threadPath(x0, y0, x1, y1, S, amp = 1) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    g.beginPath(); g.moveTo(x0, y0);
    for (let i = 1; i <= N + 1; i++) { const u = i / (N + 1), d = S.y[i] * amp; g.lineTo(x0 + dx * u + nx * d, y0 + dy * u + ny * d); }
  }
  /** Layered light along the current path: a colour gradient from star to star, a soft bloom and a bright stitched core. */
  function strokeThread(x0, y0, x1, y1, c0, c1, a, w, gap, offset) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, c0); gr.addColorStop(0.5, mix(mix(c0, c1, 0.5), '#ffffff', 0.25)); gr.addColorStop(1, c1);
    const ga = g.globalAlpha;
    g.strokeStyle = gr;
    g.globalAlpha = ga * clamp(0.11 * a); g.lineWidth = 17 * w; g.stroke();
    g.globalAlpha = ga * clamp(0.3 * a); g.lineWidth = 6.5 * w; g.stroke();
    // the running stitch: bright dashes that close into one steady line once the outline is stable
    if (gap > 0.25) { DASH[0] = 7 * w; DASH[1] = gap * w; g.setLineDash(DASH); g.lineDashOffset = -offset; }
    g.globalAlpha = ga * clamp(0.6 * a); g.lineWidth = 3.2 * w; g.stroke();
    g.strokeStyle = '#ffffff'; g.globalAlpha = ga * clamp(0.92 * a); g.lineWidth = 1.5 * w; g.stroke();
    g.setLineDash(NODASH); g.lineDashOffset = 0; g.globalAlpha = ga;
  }
  function drawThreads(t, fin) {
    const w = U * (1 + 0.15 * fin), cs = Math.min(SEGS, Math.floor(shown * SEGS + 1e-4));
    const gap = 5 * (1 - smooth(stableK)), flow = t * 12 * (reduced ? 0.3 : 1);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    // inner glow of the finished outline
    if (completed >= SEGS) {
      const a = A(0), b = A(1), c = A(2), cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, D * 3);
      gr.addColorStop(0, rgba(glowC, 0.1 * stableK + 0.08 * fin)); gr.addColorStop(1, rgba(glowC, 0.02 * stableK));
      g.fillStyle = gr; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.closePath(); g.fill();
    }
    // companion spurs
    for (const cp of comps) {
      if (cp.conn <= 0) continue;
      const P = stars[cp.parent], k = ease.outCubic(cp.conn);
      const ex = lerp(P.x, cp.x, k), ey = lerp(P.y, cp.y, k);
      threadPath(P.x, P.y, ex, ey, cp.s, reduced ? 0.5 : 1);
      strokeThread(P.x, P.y, ex, ey, P.sat, cp.col, 0.75, U * 0.62, gap, flow);
    }
    for (let k = 0; k < cs; k++) {
      const a = A(k), b = B(k), th = threads[k];
      threadPath(a.x, a.y, b.x, b.y, th.s, reduced ? 0.5 : 1);
      strokeThread(a.x, a.y, b.x, b.y, mix(a.sat, stableC, stableK * 0.35), mix(b.sat, stableC, stableK * 0.35), 0.9 + 0.4 * th.lit + 0.25 * fin, w, gap, flow);
    }
    // the thread being traced
    if (cs < SEGS && shown > cs / SEGS + 1e-4) {
      const [hx, hy, sg] = headXY(shown), a = A(sg);
      threadPath(a.x, a.y, hx, hy, act, reduced ? 0.5 : 1);
      strokeThread(a.x, a.y, hx, hy, a.sat, threadC, 1.1, w, 5, flow);
    }
    // light beads flowing along every finished thread (round the whole loop once it closes)
    const K = reduced ? 3 : 6, sp = (heavy ? 0.045 : 0.06) * (reduced ? 0.5 : 1);
    for (let i = 0; i < K; i++) {
      const ph = (((t * sp + i / K) % 1) + 1) % 1 * SEGS, k = Math.floor(ph), u = ph - k;
      if (k >= cs) continue;
      const a = A(k), b = B(k), th = threads[k], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      if (u * L < D * 0.45 || (1 - u) * L < D * 0.45) continue;
      const d = stringAt(th.s, u) * (reduced ? 0.5 : 1), x = a.x + dx * u - (dy / L) * d, y = a.y + dy * u + (dx / L) * d;
      glow(g, x, y, 16 * U, glowC, 0.35); glow(g, x, y, 6 * U, '#ffffff', 0.75);
    }
    g.restore();
  }
  function drawGuide(t) {
    if (completed >= SEGS || finAt >= 0) return;
    const [hx, hy, sg] = headXY(shown), b = B(sg), a = A(sg);
    const dx = b.x - hx, dy = b.y - hy, L = Math.hypot(dx, dy);
    const locked = E.locked;
    // dotted chart line from the thread's head to the next star, dots drifting towards it
    const gapPx = 13 * U, start = D * 0.5 * (shown <= sg / SEGS + 1e-4 ? 1 : 0), end = L - D * 0.5 * B(sg).size;
    const ofs = locked ? 0 : (t * 16 * (reduced ? 0.4 : 1)) % gapPx;
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff';
    for (let s = start + ofs; s < end; s += gapPx) {
      const u = s / L, near = 1 - u;
      g.globalAlpha = (locked ? 0.18 : 0.32) + 0.25 * near * (drag != null ? 1 : 0.5);
      g.beginPath(); g.arc(hx + dx * u, hy + dy * u, 1.7 * U, 0, TAU); g.fill();
    }
    g.restore();
    // the receiving star calls softly
    const pr = D * 0.5 * b.size + (9 + 3 * Math.sin(t * 2.2)) * U;
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(threadC, locked ? 0.2 : 0.38); g.lineWidth = 1.5;
    g.beginPath(); g.arc(b.x, b.y, pr, 0, TAU); g.stroke(); g.restore();
    // before the first touch, the starting star breathes an invitation
    if (shown <= 1e-3 && drag == null) {
      const k = 0.5 + 0.5 * Math.sin(t * 2.4);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#ffffff', 0.25 + 0.3 * k); g.lineWidth = 2;
      g.beginPath(); g.arc(a.x, a.y, D * 0.5 * a.size + (6 + 6 * k) * U, 0, TAU); g.stroke(); g.restore();
    }
  }
  // tapered diffraction flare (one cached sprite per colour)
  const flareCache = new Map();
  function flare(col) {
    let s = flareCache.get(col);
    if (s) return s;
    s = makeCanvas(256, 24);
    const fg = s.getContext('2d');
    const gr = fg.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.22, rgba(col, 0.2)); gr.addColorStop(0.4, rgba(col, 0.75)); gr.addColorStop(0.5, rgba('#ffffff', 1));
    gr.addColorStop(0.6, rgba(col, 0.75)); gr.addColorStop(0.78, rgba(col, 0.2)); gr.addColorStop(1, rgba(col, 0));
    fg.fillStyle = gr;
    fg.beginPath(); fg.moveTo(0, 12); fg.quadraticCurveTo(128, 8.4, 256, 12); fg.quadraticCurveTo(128, 15.6, 0, 12); fg.fill();
    fg.globalAlpha = 0.4; fg.beginPath(); fg.ellipse(128, 12, 128, 5.5, 0, 0, TAU); fg.fill();
    flareCache.set(col, s);
    return s;
  }
  /** Diffraction flare: four long arms and four short ones, starting at radius r (the medallion rim) so faces stay clear. */
  function spikes(x, y, L, col, a, rot, r = 0) {
    if (a <= 0.01 || L <= r) return;
    const s1 = flare(col), s2 = flare('#ffffff'), h1 = L * 0.15;
    g.save(); g.translate(x, y); g.rotate(rot); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= clamp(a);
    for (let i = 0; i < 4; i++) { arm(s1, i % 2 ? L * 0.9 : L, r, h1); g.rotate(Math.PI / 2); }
    g.rotate(Math.PI / 4); g.globalAlpha *= 0.55;
    for (let i = 0; i < 4; i++) { arm(s2, L * 0.55, r, h1 * 0.7); g.rotate(Math.PI / 2); }
    g.restore();
  }
  function arm(spr, len, r, h) {
    if (len <= r + 1) return;
    g.drawImage(spr, 128, 0, 128, 24, r, -h / 2, len - r, h);
  }
  function drawStarBody(x, y, size, col, sat, ph, settle, lit, spin, tw, fin, small, t) {
    // a soft pocket of night behind every star keeps it luminous on any sky
    g.save(); g.globalAlpha = small ? 0.45 : 0.6; g.drawImage(blob, x - size * 1.15, y - size * 1.15, size * 2.3, size * 2.3); g.restore();
    if (ph >= 0) {
      glow(g, x, y, size * 1.7, sat, (0.3 + 0.2 * settle + 0.3 * lit) * tw);
      glow(g, x, y, size * 0.95, '#ffffff', (0.12 + 0.12 * settle + 0.2 * lit) * tw);
      // detached: a little smaller, misty and soft; settled: its own clear colours with a calm glow
      const toneA = settle < 1 ? 'mist' : 'glow', mixA = settle < 1 ? 0.42 * (1 - settle) : 0.28 * fin;
      photos.draw(g, ph, x, y, size * lerp(0.9, 1, settle), { shape: 'circle', tone: toneA, toneMix: mixA, blur: 0.34 * (1 - settle), glow: 0.4 + 0.3 * settle, glowColour: sat, shadow: false, alpha: 0.88 + 0.12 * settle });
      spikes(x, y, size * (small ? 0.95 : 1.15), col, (0.6 + 0.3 * settle + 0.3 * lit) * tw, spin, size * 0.47);
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      g.strokeStyle = rgba(sat, 0.35 + 0.4 * settle + 0.3 * lit); g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, size / 2 + 1.5, 0, TAU); g.stroke();
      g.strokeStyle = rgba('#ffffff', 0.45 + 0.3 * settle); g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, size / 2 + 1.5, spin * 3 - 0.45, spin * 3 + 0.35); g.stroke();
      g.restore();
      glint(g, x + size * 0.35, y - size * 0.35, size * (0.16 + 0.06 * settle) * tw, '#ffffff', 0.45 + 0.4 * settle, spin * 0.5);
    } else {
      const r = size * 0.21;
      glow(g, x, y, r * 6.5, sat, (0.34 + 0.22 * settle + 0.3 * lit) * tw);
      glow(g, x, y, r * 2.6, '#ffffff', 0.3 + 0.3 * settle + 0.2 * lit);
      spikes(x, y, r * (small ? 3.6 : 4.8), col, (0.75 + 0.25 * settle) * tw, spin);
      // white-hot core with a coloured rim (a light source, not a bead)
      const cg = g.createRadialGradient(x - r * 0.18, y - r * 0.22, 0, x, y, r * 1.05);
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.42, mix(col, '#ffffff', 0.75)); cg.addColorStop(0.8, sat); cg.addColorStop(1, rgba(sat, 0));
      g.fillStyle = cg; g.beginPath(); g.arc(x, y, r * 1.05, 0, TAU); g.fill();
      glow(g, x, y, r * 1.3, '#ffffff', 0.55 + 0.25 * settle);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(sat, 0.24 + 0.3 * settle); g.lineWidth = 1.2;
      g.beginPath(); g.arc(x, y, r * 2.2, 0, TAU); g.stroke();
      g.strokeStyle = rgba('#ffffff', 0.35 * (0.4 + settle)); g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r * 2.2, spin * 3, spin * 3 + 0.7); g.stroke();
      g.restore();
    }
    if (!small) {
      // a slow ring of stardust orbits each main star (hypnotic, calms as it settles)
      const rr = size * 0.5 + 9 * U, n = reduced ? 8 : 14, sp = (reduced ? 0.06 : 0.16) * (1 - 0.5 * settle);
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = mix(sat, '#ffffff', 0.5);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + t * sp + spin, wob = 1 + 0.06 * Math.sin(t * 0.8 + i * 2.1);
        g.globalAlpha = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7))) * (0.6 + 0.4 * settle);
        g.beginPath(); g.arc(x + Math.cos(a) * rr * wob, y + Math.sin(a) * rr * wob, (i % 3 ? 1 : 1.6) * U, 0, TAU); g.fill();
      }
      g.restore();
    }
  }
  function drawStars(t, fin) {
    for (const cp of comps) {
      const tw = reduced ? 1 : 0.9 + 0.1 * Math.sin(t * 1.3 + cp.p1);
      drawStarBody(cp.x, cp.y, Dc * (1 - 0.05 * (1 - cp.conn)), cp.col, cp.col, cp.ph, cp.settled ? 1 : 0, 0, cp.spin, tw * (0.75 + 0.25 * cp.conn), fin, true, t);
    }
    for (const st of stars) {
      const tw = reduced ? 1 : 0.9 + 0.1 * Math.sin(t * st.tf * (heavy ? 0.6 : 1) + st.p1);
      const size = D * st.size * st.sq.x;
      drawStarBody(st.x, st.y, size, st.col, st.sat, st.ph, st.settle, st.lit, st.spin, tw, fin, false, t);
    }
  }
  function drawHead(t) {
    if (completed >= SEGS || finAt >= 0) return;
    const [hx0, hy0, sg, f] = headXY(shown), a = A(sg), b = B(sg);
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const vis = smooth(invLerp(D * 0.3, D * 0.55, Math.min(f * L, (1 - f) * L)));
    if (shown <= 1e-3 && drag == null) return;
    let hx = hx0 + headWob.v * 4, hy = hy0;
    // strain: the finger is further along than the world law allows
    if (drag != null && strain > 0.02) {
      const dx = fx0 - hx, dy = fy0 - hy, d = Math.hypot(dx, dy);
      if (d > 8) {
        const pull = Math.min(6 * U, d * 0.06);
        hx += (dx / d) * pull; hy += (dy / d) * pull;
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#ffffff', 0.22 * strain * clamp(d / 60)); g.lineWidth = 1.2; g.setLineDash(DASH_SKY);
        g.beginPath(); g.moveTo(hx, hy); g.lineTo(fx0, fy0); g.stroke(); g.setLineDash(NODASH); g.restore();
      }
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
    const k = 0.35 + 0.65 * vis;
    glow(g, hx, hy, 30 * U, glowC, (0.4 + 0.2 * pulse) * k);
    glow(g, hx, hy, 11 * U, '#ffffff', 0.9 * k);
    glint(g, hx, hy, 13 * U, '#ffffff', 0.65 * k, t * 0.5);
  }

  // the constellation's name — the person's own words, loose letters that settle as the stitch closes
  function makeLayout(tok, size, maxW, maxLines) {
    g.save(); g.font = `600 ${size}px ${FONT}`;
    const ls = wrap(g, tok, maxW, maxLines), sp = size * 0.05;
    const lines = ls.map((l) => Array.from(l));
    const cw = lines.map((cs) => cs.map((ch) => g.measureText(ch).width));
    const lw = cw.map((ws) => ws.reduce((a, v) => a + v, 0) + sp * Math.max(0, ws.length - 1));
    g.restore();
    const lh = size * 1.26;
    return { lines, cw, lw, sp, size, lh, h: ls.length * lh, w: Math.max(0, ...lw) };
  }
  let nameL = null, nameOff = [0, 0], nameTok = null, nameW = 0, nameH = 0;
  const boxPt = (x, y, w, h, px, py) => Math.hypot(Math.max(Math.abs(px - x) - w / 2, 0), Math.max(Math.abs(py - y) - h / 2, 0));
  /** Find the roomiest spot for the name: inside the outline if it fits, clear of every star, spur and thread. */
  function placeName() {
    const tok = words.token || '';
    nameTok = tok; nameW = stage.w; nameH = stage.h; nameDirty = false;
    const size = Math.round(clamp(15 * U, 12, 18)), small = Math.max(12, size - 2);
    const opts = [makeLayout(tok, size, Math.min(stage.w * 0.5, 178 * U), 2), makeLayout(tok, size, Math.min(stage.w * 0.4, 134 * U), 3), makeLayout(tok, small, Math.min(stage.w * 0.36, 118 * U), 3)];
    const a = stars[0], b = stars[1], c = stars[2];
    const cxB = (a.bx + b.bx + c.bx) / 3, cyB = (a.by + b.by + c.by) / 3;
    const la = Math.hypot(b.bx - c.bx, b.by - c.by), lb = Math.hypot(a.bx - c.bx, a.by - c.by), lc = Math.hypot(a.bx - b.bx, a.by - b.by), ls = la + lb + lc || 1;
    const icx = (la * a.bx + lb * b.bx + lc * c.bx) / ls, icy = (la * a.by + lb * b.by + lc * c.by) / ls;
    const side = (x, y, p, q) => (q.bx - p.bx) * (y - p.by) - (q.by - p.by) * (x - p.bx);
    const inTri = (x, y) => { const s1 = side(x, y, a, b), s2 = side(x, y, b, c), s3 = side(x, y, c, a); return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0); };
    let best = -Infinity;
    for (const L of opts) {
      const bw = L.w + 10 * U, bh = L.h + 17 * U;
      for (let iy = 0; iy <= 22; iy++) for (let ix = 0; ix <= 16; ix++) {
        const x = stage.x + bw / 2 + 2 + (stage.w - bw - 4) * ix / 16, y = stage.y + bh / 2 + 2 + (stage.h - bh - 4) * iy / 22;
        let clear = 30;
        for (const st of stars) clear = Math.min(clear, boxPt(x, y, bw, bh, st.bx, st.by) - D * 0.5 * st.size - 8 * U);
        for (const cp of comps) { const P = stars[cp.parent]; clear = Math.min(clear, boxPt(x, y, bw, bh, P.bx + cp.dx, P.by + cp.dy) - Dc * 0.5 - 4 * U); }
        for (let sg = 0; sg < SEGS; sg++) {
          const p = A(sg), q = B(sg);
          for (let k = 0; k <= 16; k++) { const u = k / 16; clear = Math.min(clear, boxPt(x, y, bw, bh, lerp(p.bx, q.bx, u), lerp(p.by, q.by, u)) - 3 * U); }
        }
        clear = Math.min(clear, x - bw / 2 - stage.x - 8, stage.x + stage.w - x - bw / 2 - 8, y - bh / 2 - stage.y - 6, stage.y + stage.h - y - bh / 2 - 6);
        const banner = Math.max(0, stage.y + 84 * U - (y - bh / 2)) * 0.15;   // keep clear of the plot-twist banner
        const score = (clear < 0 ? clear * 3 : Math.min(clear, 10)) + (inTri(x, y) ? 14 : 0) - Math.hypot(x - icx, y - icy) * 0.03 - (L.lines.length - 2) * 2 - (L.size < size ? 2 : 0) - banner;
        if (score > best) { best = score; nameL = L; nameOff = [x - cxB, y - 3.5 * U - cyB]; }
      }
    }
  }
  function namePos() {
    const cx = (stars[0].x + stars[1].x + stars[2].x) / 3, cy = (stars[0].y + stars[1].y + stars[2].y) / 3;
    return [cx + nameOff[0] * figSc, cy + nameOff[1] * figSc];
  }
  function drawName(t, fin) {
    if (E.phase === 'law') return;
    if (nameDirty || nameTok !== words.token || nameW !== stage.w || nameH !== stage.h) placeName();
    const L = nameL;
    if (!L || !L.lines.length) return;
    const [x, y] = namePos();
    const knit = smooth(clamp(shown)) * 0.6 + 0.4 * smooth(stableK);
    const wave = (1 - knit) * 1.9 * U * (reduced ? 0.4 : 1);
    g.save();
    g.globalAlpha = 0.9; g.drawImage(blob, x - L.w * 0.72 - 26, y - L.h * 0.95 - 16, L.w * 1.44 + 52, L.h * 1.9 + 32);
    g.globalAlpha = 1;
    glow(g, x, y, Math.max(L.w * 0.62, L.h), mix(glowC, warm, fin * 0.5), 0.14 + 0.12 * knit + 0.15 * fin);
    g.font = `600 ${L.size}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = '#fffaf0'; g.shadowColor = 'rgba(4,3,20,0.95)'; g.shadowBlur = 6;
    for (let li = 0; li < L.lines.length; li++) {
      let cx = x - L.lw[li] / 2; const ly = y - L.h / 2 + L.lh * (li + 0.5);
      const cs = L.lines[li], ws = L.cw[li];
      for (let ci = 0; ci < cs.length; ci++) {
        // loose letters bob gently on their own little threads, then knit into one steady line
        const oy = wave > 0.05 ? Math.sin(t * 1.1 + ci * 0.55 + li * 1.7) * wave : 0;
        g.globalAlpha = 0.84 + 0.16 * knit - (1 - knit) * 0.12 * (0.5 + 0.5 * Math.sin(t * 1.4 + ci * 1.3));
        g.fillText(cs[ci], cx, ly + oy);
        cx += ws[ci] + L.sp;
      }
    }
    g.restore();
    // a running stitch under the name, sewn as the threads are
    const uy = y + L.h / 2 + 7 * U, half = L.w * 0.45, len = 2 * half * clamp(shown);
    if (len > 1) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      const gap = 4 * (1 - smooth(stableK));
      if (gap > 0.25) { DASH[0] = 5 * U; DASH[1] = gap * U; g.setLineDash(DASH); }
      g.strokeStyle = rgba(mix(threadC, stableC, stableK), 0.5 + 0.3 * stableK + 0.2 * fin); g.lineWidth = 1.4 * U;
      g.beginPath(); g.moveTo(x - half, uy); g.lineTo(x - half + len, uy); g.stroke();
      g.setLineDash(NODASH); g.restore();
    }
  }
  function drawTwist(t) {
    if (twistAt < 0) return;
    const k = E.now() - twistAt;
    if (twistKind === 0) {
      // a slow, soft shooting star glides across the top of the sky
      const q = k / 3.2;
      if (q > 1) return;
      const e = ease.inOutSine(q), x0 = stage.x + stage.w * 0.08, x1 = stage.x + stage.w * 0.92;
      const x = lerp(x0, x1, e), y = stage.y + stage.h * (0.1 + 0.12 * e + 0.05 * Math.sin(e * Math.PI));
      const a = Math.sin(q * Math.PI);
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      const tx = x - 70 * U, ty = y - 14 * U;
      const gr = g.createLinearGradient(tx, ty, x, y); gr.addColorStop(0, rgba(glowC, 0)); gr.addColorStop(1, rgba('#ffffff', 0.55 * a));
      g.strokeStyle = gr; g.lineWidth = 2.2 * U; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
      g.restore();
      glow(g, x, y, 16 * U, glowC, 0.6 * a); glow(g, x, y, 5 * U, '#ffffff', 0.9 * a);
    } else {
      // three resting lights form a calm little pathway (kind 1) or one small star settles in the figure (kind 2)
      for (let i = 0; i < restLights.length; i++) {
        const L = restLights[i], q = smooth(clamp((k - i * 0.55) / 1.2));
        if (q <= 0) continue;
        const tw = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.1 + i);
        glow(g, L[0], L[1], 18 * U * q, glowC, 0.5 * q * tw); orb(g, L[0], L[1], 3.4 * U * q + 0.1, mix(glowC, '#ffffff', 0.6), { alpha: q });
      }
    }
  }
  let finLap = 0;
  function drawFinale(t, fin) {
    if (finAt < 0) return;
    const k = E.now() - finAt;
    // one slow comet of light circles the finished outline, ringing each star as it passes
    const dur = heavy ? 3.2 : 2.5, q = clamp((k - 0.25) / dur);
    if (q > 0 && q < 1) {
      const ph = ease.inOutSine(q) * SEGS;
      while (finLap < Math.min(SEGS, Math.floor(ph))) {
        finLap++;
        const st = B(finLap - 1); st.sq.v = -1.8; st.lit = 1;
        E.sound('glass', { note: Math.min(9, 3 + finLap * 2), intensity: (heavy ? 0.28 : 0.38) * vol });
        if (finLap === SEGS) { for (const th of threads) th.lit = 1; E.haptic('soft'); }
      }
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let j = 0; j < (reduced ? 4 : 10); j++) {
        const pj = ph - j * 0.025;
        if (pj < 0) break;
        const sg = Math.min(SEGS - 1, Math.floor(pj)), u = pj - sg, a = A(sg), b = B(sg);
        const x = lerp(a.x, b.x, u), y = lerp(a.y, b.y, u), f = 1 - j / 10;
        glow(g, x, y, (j ? 12 : 22) * U * f, j ? glowC : '#ffffff', (j ? 0.45 : 0.9) * f);
      }
      g.restore();
    }
    const a = A(0), b = A(1), c = A(2), cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3;
    halo(g, cx, cy, D * 2.6, k * (heavy ? 0.6 : 1), mix(glowC, warm, 0.3), { rings: 3, alpha: 0.22 * fin, speed: heavy ? 0.12 : 0.2 });
    if (!heavy && !reduced && k < 3.2 && Math.random() < 0.35) {
      const st = stars[(Math.random() * 3) | 0];
      E.particles.emit({ x: st.x + (Math.random() - 0.5) * D * 0.6, y: st.y - D * 0.3, vx: (Math.random() - 0.5) * 20, vy: -24 - Math.random() * 20, life: 1.6, size: 5, colour: '#fff6dc', kind: 'glint', drag: 0.97 });
    }
    void t;
  }

  function frame(dt, t) {
    simulate(dt, t);
    const fin = finAt >= 0 ? smooth(clamp((E.now() - finAt) / 2.4)) : 0;
    drawSky(t);
    drawGuide(t);
    drawThreads(t, fin);
    drawStars(t, fin);
    drawHead(t);
    drawTwist(t);
    drawName(t, fin);
    drawFinale(t, fin);
  }

  // -------------------------------------------------------------- input --
  function nearStar(p) { let best = -1, bd = HIT; for (const st of stars) { const d = Math.hypot(p.x - st.x, p.y - st.y); if (d < bd) { bd = d; best = st.i; } } return best; }
  function pluckCheck(x0, y0, x1, y1, id) {
    const now = E.now();
    for (let k = 0; k < completed; k++) {
      const a = A(k), b = B(k), th = threads[k];
      const u = crossU(x0, y0, x1, y1, a.x, a.y, b.x, b.y);
      if (u < 0 || now - th.plAt < 0.12) continue;
      th.plAt = now;
      const sX = b.x - a.x, sY = b.y - a.y, L = Math.hypot(sX, sY) || 1, rX = x1 - x0, rY = y1 - y0;
      const sign = Math.sign(rX * (-sY / L) + rY * (sX / L)) || 1, amp = clamp(Math.hypot(rX, rY) * 0.5, 5, 14) * U * (reduced ? 0.5 : 1);
      pluckString(th.s, u, sign * amp, 22 * U); th.lit = Math.max(th.lit, 0.6);
      E.sound('pluck', { note: Math.min(9, k * 3 + Math.round(u * 3)), intensity: 0.32 * vol, pan: clamp((x1 - stage.cx) / stage.w * 2, -1, 1) });
      if (now - lastTickAt > 0.09) { lastTickAt = now; E.haptic('tick'); }
      E.particles.burst(lerp(a.x, b.x, u), lerp(a.y, b.y, u), reduced ? 2 : 4, { speed: 40, colour: threadC, life: 0.8, size: 5 });
    }
    void id;
  }
  return {
    get progress() { return prog; },
    get done() { return doneFlag; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      pointers.set(p.id, { x: p.x, y: p.y });
      if (drag == null && prog < 1) {
        const [hx, hy, sg] = headXY(prog), st = A(segOf(prog));
        if (Math.hypot(p.x - hx, p.y - hy) < HIT || Math.hypot(p.x - st.x, p.y - st.y) < HIT) {
          drag = p.id; fx0 = p.x; fy0 = p.y;
          st.sq.v = -2; st.lit = Math.max(st.lit, 0.7);
          E.sound('pluck', { note: Math.min(9, sg * 2 + 1), intensity: 0.4 * vol }); E.haptic('light');
          feed(p.x, p.y);
          return;
        }
      }
      const k = nearStar(p);
      if (k >= 0 && prog < 1) {
        // a star that isn't next yet: a gentle "not yet" wobble
        stars[k].wob.kick(0.8); stars[k].lit = Math.max(stars[k].lit, 0.4);
        E.sound('drip', { note: 1, intensity: 0.25 * vol }); E.haptic('tick');
        return;
      }
      // empty sky: a little twinkle answers the touch
      E.particles.burst(p.x, p.y, reduced ? 2 : 5, { speed: 30, colour: mix(glowC, '#ffffff', 0.5), life: 0.9, size: 4, kind: 'glint' });
      E.sound('drip', { note: 4 + Math.floor(Math.random() * 4), intensity: 0.2 * vol }); E.haptic('tick');
    },
    move(p) {
      const pt = pointers.get(p.id);
      if (!pt) return;
      pluckCheck(pt.x, pt.y, p.x, p.y, p.id);
      if (p.id === drag) {
        const sg = segOf(wanted), a = A(sg), b = B(sg), dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
        const perp = ((p.x - pt.x) * -dy + (p.y - pt.y) * dx) / L;
        for (let i = N - 3; i <= N; i++) act.v[i] = clamp(act.v[i] + perp * 7 * (i - N + 4) / 4, -400, 400);
        fx0 = p.x; fy0 = p.y;
        const before = wanted;
        feed(p.x, p.y);
        // further along than the law allows: the head strains and the world says "not yet"
        const [hx, hy] = headXY(prog);
        const ahead = Math.hypot(p.x - hx, p.y - hy) > 26 * U && fingerOn && wanted >= prog + BANK - 1e-4;
        if (ahead || (E.locked && fingerOn)) {
          strain = Math.min(1, strain + 0.15);
          if (E.locked && E.now() - lastWaitAt > 0.6) { lastWaitAt = E.now(); headWob.kick(0.6); E.checkpoint('wait'); }
        }
        if (wanted > before && !reduced) {
          emitAcc += (wanted - before) * SEGS * 24;
          while (emitAcc > 1) { emitAcc -= 1; E.particles.emit({ x: hx, y: hy, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30 - 10, life: 0.9, size: 5, colour: threadC, drag: 0.93 }); }
        }
        if (E.now() - lastLookAt > 0.25) { lastLookAt = E.now(); E.look?.(hx, hy); }
      }
      pt.x = p.x; pt.y = p.y;
    },
    up(p) {
      pointers.delete(p.id);
      if (p.id === drag) {
        drag = null; fingerOn = false;
        if (assistTo == null) wanted = prog;   // lifting releases anything banked
        if (prog >= 1 - 1e-6 && completeAt >= 0 && E.now() - completeAt > 0.8 && comps.every((cp) => cp.settled)) doneFlag = true;
      }
    },
    assist() {
      if (finAt >= 0 || prog >= 1) return;
      const base = Math.max(wanted, prog);
      const next = Math.min(1, (Math.floor(base * PRESSES + 1e-3) + 1) / PRESSES);
      assistTo = Math.max(assistTo ?? 0, next);
      const st = A(segOf(prog)); st.sq.v = -1.6; st.lit = Math.max(st.lit, 0.6);
      E.haptic('light');
    },
    pointAt(p) { const [x, y] = headXY(clamp(p)); return { x, y }; },
    hint() {
      if (finAt >= 0 || prog >= 1 || E.locked) return null;
      const sg = segOf(prog), h = prog * SEGS - sg, a = A(sg), b = B(sg), f2 = Math.min(1, h + 0.8);
      const pts = [];
      for (let i = 0; i <= 14; i++) { const f = lerp(h, f2, i / 14); pts.push([lerp(a.x, b.x, f), lerp(a.y, b.y, f)]); }
      return { path: pts };
    },
    twist() {
      twistAt = E.now();
      restLights.length = 0;
      const [nx, ny] = namePos(), L = nameL || { h: 20 * U };
      if (twistKind === 1) {
        // a calm little pathway of three resting lights leading away from the figure
        let lo = stars[0]; for (const st of stars) if (st.y > lo.y) lo = st;
        const dir = lo.x < stage.cx ? 1 : -1;
        for (let i = 0; i < 3; i++) restLights.push([clamp(lo.x + dir * (D * 0.7 + i * 26 * U), stage.x + 14, stage.x + stage.w - 14), Math.min(stage.y + stage.h - 12, lo.y + D * 0.45 + i * 12 * U)]);
      } else if (twistKind === 2) restLights.push([nx, ny - L.h / 2 - 16 * U]);
      E.particles.burst(nx, ny, reduced ? 3 : 8, { speed: 40, colour: '#ffffff', life: 1.1, size: 4, kind: 'glint' });
    },
    finish() {
      finAt = E.now();
      cxF = (stars[0].x + stars[1].x + stars[2].x) / 3; cyF = (stars[0].y + stars[1].y + stars[2].y) / 3;
      for (const st of stars) st.settleT = 1;
      for (const cp of comps) cp.wait = Math.max(cp.wait, cp.delay);
      E.sound('shimmer', { intensity: 0.4 * vol });
    },
    destroy() { pointers.clear(); },
  };
}
