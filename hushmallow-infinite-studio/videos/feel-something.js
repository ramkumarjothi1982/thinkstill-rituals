// "FEEL SOMETHING?" — the first Hushmallow Cinematic Emotion Engine short.
// 20 s · 1080 × 1920 · 30 fps · loops seamlessly (frame 599 flows into frame 0).
//
//   0.0  HOOK        Noomi in front of a luminous pearl spiral, eyes on us, six
//                    veiled glass feelings orbiting her. "Feeling something?"
//   2.0  UNIVERSE    one by one the feelings rise above her head and show what
//                    they are: sadness (blue liquid), anxiety (a tangled ribbon),
//                    anger (a swirling flame), loneliness (one small star),
//                    overthinking (racing thought bubbles), happiness (a golden
//                    bloom). Noomi feels each one with her face and body.
//                    "Whatever it is..."
//   6.0  MALLOW MAGIC the feelings gather round her; she stretches up and boops;
//                    a soft ring rolls out, the spiral becomes a dream tunnel,
//                    silk ribbons and pearl clouds fill the sky — and each feeling
//                    transforms (the liquid lifts, the ribbon untangles, the flame
//                    becomes a flower, the star finds a galaxy, the thoughts slow
//                    into one ring, the bloom opens) and becomes its Mallow:
//                    Blubi, Loomi, Pipzi, Glitzi, Zuzu, Boppo, each with its own
//                    entrance and way of moving. "There's a Mallow for that."
//  12.0  CONNECTION  the world settles into a warm Mallow universe; Noomi turns
//                    her whole attention to us: a slow, fond blink, a happy squish,
//                    a glow from within. "Talk it out." "Feel what you feel."
//                    "Meet your Mallows."
//  17.0  BRAND       the seven gather into one picture; the approved logo;
//                    THINK EMOTION. THINK HUSHMALLOW. / Feel something? Hushmallow.
//                    A hello wave runs through the line, Noomi winks — then the six
//                    become glowing feelings again and drift back into orbit: the
//                    opening frame.
//
// Every quantity is a pure function of time; everything that runs on its own
// uses integer harmonics of the 20 s loop.

import { SoftBody } from '../engine/softbody.js';
import { Face, specFromDerived } from '../engine/face/index.js';
import { TextBlock, LogoCard } from '../engine/type.js';
import { silhouette } from '../engine/stage.js';
import { loadImage } from '../dream/stage.js';
import { MALLOWS } from '../../hushmallow/src/mallows/registry.js';
import { Track, Impulses, Hops, Blinks, spring, ring, clamp, lerp, smoothstep, TAU, hex3, spline, ease } from '../engine/motion.js';

const D = 20;
const meta = { id: 'feel-something', title: 'Feel Something? Hushmallow', fps: 30, duration: D, shutter: 0.5 };
const PH = (t) => (TAU * t) / D;
const bump = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t));
const lin = (h) => hex3(h).map((v) => Math.pow(v, 2.2));
const mix3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

// ------------------------------------------------------------ the cast --
// feeling → its Mallow (personalities from hushmallow/src/mallows/registry.js)
const CAST = [
  { id: 'blubi', kind: 0, feeling: 'sadness', color: [0.35, 0.62, 1.7], seed: 0.13 },        // The Softie
  { id: 'loomi', kind: 1, feeling: 'anxiety', color: [0.85, 0.62, 1.6], seed: 0.41 },        // The Chill One
  { id: 'pipzi', kind: 2, feeling: 'anger', color: [1.9, 0.62, 0.22], seed: 0.67 },          // The Spark
  { id: 'glitzi', kind: 3, feeling: 'loneliness', color: [1.15, 1.05, 1.7], seed: 0.29 },    // The Chaos Mallow (a galaxy)
  { id: 'zuzu', kind: 4, feeling: 'overthinking', color: [1.15, 0.72, 1.7], seed: 0.83 },    // The Spiral
  { id: 'boppo', kind: 5, feeling: 'happiness', color: [1.9, 1.3, 0.32], seed: 0.55 },       // The Sunshine
];

// ------------------------------------------------------------- timing --
// the score runs at 96 BPM: one beat = 0.625 s, the 20 s loop = 8 bars; every accent sits on the grid
const BEAT = 0.625;
const REV = CAST.map((_, i) => (3 + i) * BEAT);              // each feeling is shown (beats 3–8)
const SIDE = [-1, 1, -1, 1, -1, 1];                         // …above Noomi's head, left / right
const EMG = CAST.map((_, i) => (11 + i) * BEAT);            // each feeling becomes its Mallow (beats 11–16)
const RET = CAST.map((_, i) => 19.2 + 0.06 * i);           // …and back into a feeling for the loop
const T = {
  curious: 1.0, gather: 9 * BEAT, reach: 9.45 * BEAT, boop: 10 * BEAT, giggle: 17 * BEAT, recede: 18 * BEAT,
  fond: 12.3, talk: 20 * BEAT, feel: 22 * BEAT, meet: 24 * BEAT, assemble: 27 * BEAT - 1.45, logo: 27 * BEAT, wave: 28 * BEAT, wink: 30 * BEAT, home: 19.2, hookIn: 19.45,
};

// ------------------------------------------------------------- layout --
// body centres (world px) and scale (px per art px)
const NOOMI = { hero: { x: 540, base: 1352, s: 0.47 }, line: { x: 540, base: 1376, s: 0.43 } };
const ORBIT = { cx: 540, cy: 1118, rx: 396, ry: 300, r: 74 };
const SLOT = [0, 3, 1, 4, 2, 5];                             // ring order (alternates the reveal sides visually)
const P3 = [[205, 772, 0.19, -0.4], [878, 748, 0.185, -0.4], [148, 1158, 0.2, 0.3], [934, 1140, 0.19, 0.3], [262, 1478, 0.2, 0.6], [820, 1488, 0.205, 0.6]];
const P4 = [[150, 690, 0.13, -0.8], [935, 650, 0.125, -0.8], [112, 1050, 0.14, -0.8], [962, 1020, 0.13, -0.8], [178, 1500, 0.14, -0.7], [905, 1510, 0.14, -0.7]];
const P5 = [[236, 1252, 0.265, -0.1], [146, 1070, 0.2, -0.6], [738, 972, 0.2, -0.7], [930, 1070, 0.2, -0.6], [342, 972, 0.2, -0.7], [844, 1252, 0.265, -0.1]];
const SPOT = (side) => [540 + side * 168, 712];

// ------------------------------------------------------------ palette --
const SKY = {
  night: { top: lin('#0a0828'), mid: lin('#2c2170'), low: lin('#7a4f96'), halo: lin('#b9a4ff') },
  dream: { top: lin('#0d0c34'), mid: lin('#3b3393'), low: lin('#a173c4'), halo: lin('#d6c4ff') },
  warm: { top: lin('#150f3a'), mid: lin('#5a3c88'), low: lin('#d88fa6'), halo: lin('#ffd2b4') },
};
const dreamAt = (t) => spline([[0, 0], [6.25, 0], [7.1, 1], [10.6, 1], [12.4, 0.4], [17, 0.3], [19.2, 0.25], [19.9, 0], [20, 0]], t);
const warmAt = (t) => spline([[0, 0], [10.8, 0], [12.6, 1], [19.1, 1], [19.9, 0], [20, 0]], t);
const spiralAt = (t) => spline([[0, 0.78], [1.2, 1.0], [2.2, 0.88], [5.6, 0.88], [6.3, 1.05], [9.5, 0.85], [12.2, 0.32], [16.5, 0.3], [18.8, 0.45], [19.9, 0.78], [20, 0.78]], t);
const speedAt = (t) => spline([[0, 0.11], [6.2, 0.11], [6.8, 0.62], [10.0, 0.55], [11.8, 0.06], [17, 0.05], [19.0, 0.08], [19.9, 0.11], [20, 0.11]], t);
// the band phase: the integral of the speed, scaled so that one loop moves a whole number of bands
const BAND = (() => {
  const n = 2000, dt = D / n, acc = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) acc[i + 1] = acc[i] + (speedAt(i * dt) + speedAt((i + 1) * dt)) / 2 * dt;
  const k = Math.max(1, Math.round(acc[n])) / acc[n];
  return (t) => { const u = clamp(t / dt, 0, n), i = Math.min(n - 1, Math.floor(u)), f = u - i; return (acc[i] + (acc[i + 1] - acc[i]) * f) * k; };
})();

function skyAt(t) {
  const dr = dreamAt(t), wm = warmAt(t);
  const pick = (k) => mix3(mix3(SKY.night[k], SKY.dream[k], dr), SKY.warm[k], wm);
  const pa = t > T.boop + 0.05 ? Math.exp(-(t - T.boop - 0.05) * 1.5) * smoothstep(T.boop + 0.05, T.boop + 0.15, t) : 0;
  return {
    uPh: PH(t), uCenter: [540, 1090], uSpiral: spiralAt(t), uBand: BAND(t), uArms: 5, uTight: 1.55,
    uDream: dr, uWarm: wm, uPulseR: Math.max(0, t - T.boop - 0.05) * 1250, uPulseA: pa,
    uTop: pick('top'), uMid: pick('mid'), uLow: pick('low'), uHalo: pick('halo'),
    uBokeh: 1, uStars: lerp(0.9, 0.55, wm), uParallax: 0.4,
  };
}

// ------------------------------------------------------------- camera --
function camAt(t) {
  return {
    x: 540,
    y: spline([[0, 960], [12, 960], [14.5, 985], [15.6, 975], [16.9, 960], [20, 960]], t),
    zoom: spline([[0, 1.0], [1.6, 1.035], [5.5, 1.035], [6.2, 1.0], [9.8, 1.045], [11.8, 1.0], [12.3, 1.0], [15.0, 1.075], [16.85, 1.0], [20, 1.0]], t),
    roll: 0,
  };
}

// --------------------------------------------------------- the orbs ---
function orbitPos(i, t) {
  const th = SLOT[i] * TAU / 6 + PH(t) - 0.35;
  return { x: ORBIT.cx + ORBIT.rx * Math.cos(th), y: ORBIT.cy + ORBIT.ry * Math.sin(th), z: Math.sin(th) };
}
const center3 = (i) => ({ x: P3[i][0], y: P3[i][1] });

function orbAt(i, t) {
  const c = CAST[i];
  let { x, y, z } = orbitPos(i, t);
  let r = ORBIT.r * (0.86 + 0.14 * z);
  // shown above Noomi's head
  const pw = ease.inOutSine(bump(t, REV[i] - 0.05, REV[i] + 0.32, REV[i] + 0.75, REV[i] + 1.22));
  const [sx, sy] = SPOT(SIDE[i]);
  if (pw > 0) {
    // round Noomi's side and up from behind her head (a quadratic path through a point outside her)
    const cx = 540 + SIDE[i] * 600, cy = 1020;
    const u = pw, iu = 1 - u;
    x = iu * iu * x + 2 * u * iu * cx + u * u * sx;
    y = iu * iu * y + 2 * u * iu * cy + u * u * sy;
    z = lerp(lerp(z, -0.6, smoothstep(0, 0.12, u)), 1.5, smoothstep(0.72, 0.9, u));
    r = lerp(r, 118, pw);
  }
  // gathered round Noomi, where each Mallow will appear
  const gw = ease.inOutCubic(smoothstep(T.gather, T.gather + 0.75, t));
  const g = center3(i);
  const hover = 7 * Math.sin(PH(t) * 6 + i * 1.7);
  x = lerp(x, g.x, gw); y = lerp(y, g.y + hover, gw); z = lerp(z, P3[i][3], gw); r = lerp(r, 70, gw);
  // the boop rolls through them
  const bp = ring(t - T.boop - 0.12 - Math.hypot(g.x - 540, g.y - 1100) / 1250, 2.4, 0.35) * smoothstep(T.gather, T.gather + 0.3, t);
  const morph = smoothstep(EMG[i] - 0.6, EMG[i] - 0.06, t);
  const pop = smoothstep(EMG[i] - 0.1, EMG[i] + 0.18, t);
  r *= 1 + 0.08 * bp + 0.3 * pop;
  // reveal: shown at its moment, veiled again once it has returned for the loop
  const reveal = t < 12 ? smoothstep(REV[i] + 0.04, REV[i] + 0.42, t) : 0;
  const flash = 0.18 * bump(t, REV[i] + 0.02, REV[i] + 0.16, REV[i] + 0.2, REV[i] + 0.75) + 0.35 * smoothstep(EMG[i] - 0.35, EMG[i], t) * (1 - pop) + 0.15 * Math.max(0, bp);
  let alpha = t < EMG[i] ? 1 : 1 - smoothstep(EMG[i] - 0.02, EMG[i] + 0.16, t);
  // the loop: each Mallow returns into its feeling, which drifts back into orbit
  if (t >= RET[i] - 0.05) {
    const k = smoothstep(RET[i], RET[i] + 0.3, t);
    const m = mallowCentre(i, RET[i]);
    const w = ease.inOutSine(smoothstep(RET[i] + 0.05, 19.95, t));
    const o = orbitPos(i, t);
    x = lerp(m.x, o.x, w); y = lerp(m.y, o.y, w); z = lerp(m.z, o.z, w);
    r = ORBIT.r * (0.86 + 0.14 * o.z) * lerp(0.5, 1, k);
    alpha = k;
    return { x, y, z, r, kind: c.kind, reveal: 0, morph: 0, alpha, seed: c.seed, glow: 0.35, flash: 0.5 * (1 - k), color: c.color, squash: [1, 1] };
  }
  if (alpha <= 0.001) return null;
  const wob = 0.05 * ring(t - REV[i], 3.2, 0.3) + 0.06 * ring(t - T.boop - 0.12, 2.6, 0.3) * gw;
  return { x, y, z, r, kind: c.kind, reveal, morph, alpha, seed: c.seed, glow: 0.3 + 0.12 * pw, flash, color: c.color, squash: [1 + wob, 1 - wob] };
}

// --------------------------------------------------------- the Mallows --
let bodies = {}, sils = {}, face, faceSpec, eyeArt;

function mallowCentre(i, t) {
  const a = P3[i], b = P4[i], c = P5[i];
  const w34 = ease.inOutSine(smoothstep(T.recede, T.recede + 1.3, t));
  const w45 = ease.inOutCubic(smoothstep(T.assemble, T.assemble + 1.45, t));
  const P = [0, 1, 2, 3].map((k) => lerp(lerp(a[k], b[k], w34), c[k], w45));
  // from the orb to its spot (it emerges where its feeling was)
  return { x: P[0], y: P[1], s: P[2], z: P[3], w34, w45 };
}

// each Mallow's way of moving (body DOFs; lift and amplitudes in art px)
function personality(id, t, amp) {
  const ph = PH(t);
  const o = { squash: 0, inflate: 0, lean: 0, sway: 0, lift: 0 };
  switch (id) {
    case 'blubi':   // the softie: a slow, heartfelt sway and a soft sink
      o.sway = 0.07 * Math.sin(ph * 6); o.inflate = 0.03 * Math.sin(ph * 6 + 1); o.lift = 40 * Math.sin(ph * 6 + 0.5); break;
    case 'loomi':   // the chill one: floats, unbothered
      o.lift = 70 * Math.sin(ph * 4); o.lean = 0.035 * Math.sin(ph * 4 + 1.2); break;
    case 'pipzi':   // the spark: quick happy hops
      o.lift = 260 * Math.max(0, Math.sin(ph * 30)) ** 1.4; o.squash = -0.06 * Math.max(0, Math.sin(ph * 30)) + 0.08 * Math.max(0, -Math.sin(ph * 30)) ** 3; break;
    case 'glitzi':  // the chaos one: a cheeky glitchy shimmy
      o.sway = 0.1 * Math.sin(ph * 40) * Math.max(0, Math.sin(ph * 5)) ** 6; o.lean = 0.04 * Math.sin(ph * 5); o.lift = 30 * Math.sin(ph * 5); break;
    case 'zuzu':    // the spiral: a hypnotic little circle
      o.lean = 0.05 * Math.sin(ph * 12); o.sway = 0.05 * Math.cos(ph * 12); o.lift = 30 * Math.sin(ph * 12); break;
    case 'boppo':   // the sunshine: big bouncy hops
      o.lift = 330 * Math.max(0, Math.sin(ph * 20)) ** 1.2; o.squash = -0.08 * Math.max(0, Math.sin(ph * 20)) + 0.12 * Math.max(0, -Math.sin(ph * 20)) ** 4; break;
    default: break;
  }
  for (const k of Object.keys(o)) o[k] *= amp;
  return o;
}

// the hello wave through the line-up (left to right)
const WAVE_ORDER = (() => {
  const xs = CAST.map((_, i) => ({ id: CAST[i].id, x: P5[i][0] })).concat([{ id: 'noomi', x: NOOMI.line.x }]);
  xs.sort((a, b) => a.x - b.x);
  return Object.fromEntries(xs.map((e, k) => [e.id, T.wave + k * BEAT / 4]));
})();
const waveHop = (id) => new Hops().add(WAVE_ORDER[id], WAVE_ORDER[id] + 0.34, id === 'noomi' ? 90 : 150);

const MALLOW_DOF = {};
function buildMallowDof(i) {
  const id = CAST[i].id, e = EMG[i];
  const pop = new Track(-0.3, { f: 2.6, z: 0.38 }).to(e, 0.0);                      // emerges stretched, rounds out with overshoot
  const kicks = new Impulses().kick(e + 0.25, 0.12, 3.0, 0.3);
  const settle = new Impulses();
  const land = T.assemble + 1.45;
  settle.kick(land, 0.1, 2.6, 0.3);
  const hop = waveHop(id), hk = new Impulses().kick(WAVE_ORDER[id] + 0.34, 0.12, 3.2, 0.3);
  return (t) => {
    const amp = smoothstep(e + 0.5, e + 1.0, t) * lerp(1, 0.45, smoothstep(T.recede, T.recede + 1.3, t)) * (1 - smoothstep(T.assemble, T.assemble + 0.8, t));
    const p = personality(id, t, amp);
    return {
      squash: (t < e ? -0.3 : pop.value(t)) + kicks.value(t) + settle.value(t) + hk.value(t) + p.squash,
      inflate: 0.02 * Math.sin(PH(t) * 5 + i) + p.inflate,
      lean: p.lean, sway: p.sway + 0.05 * ring(t - land, 2, 0.35),
      shimmer: 0.6 * Math.exp(-Math.max(0, t - e - 0.2) * 3) * (t > e ? 1 : 0), shimPhase: (t - e) * 15,
      lift: p.lift + hop.value(t),
    };
  };
}

function mallowItem(i, t, light, sky) {
  const c = CAST[i], e = EMG[i];
  if (t < e - 0.04 || t > RET[i] + 0.3) return null;
  const sil = sils[c.id];
  const M = mallowCentre(i, t);
  // emergence: grows out of the orb (its centre) with a spring overshoot
  const grow = t < e ? 0.12 : 0.12 + 0.88 * spring(t - e, 2.1, 0.5);
  const g = clamp(1 - smoothstep(RET[i] - 0.08, RET[i] + 0.26, t), 0, 1);     // …shrinks back into it at the end
  const sc = M.s * grow * lerp(0.3, 1, g);
  // the soft-body base sits half a body below the centre
  const xf = { x: M.x, y: M.y + (sil.h / 2) * sc, s: sc };
  const dof = MALLOW_DOF[c.id];
  const emerge = Math.max(1 - smoothstep(e, e + 0.7, t), 1 - g);
  const fade = smoothstep(e - 0.04, e + 0.06, t) * clamp(1 - smoothstep(RET[i] + 0.1, RET[i] + 0.3, t), 0, 1);
  const far = M.w34 * (1 - M.w45);
  return {
    id: c.id, z: M.z, x: M.x, y: M.y, s: sc, fade, emerge, emergeCol: c.color.map((v) => v * 0.8),
    lod: 1.4 * far, haze: [...sky.uMid.map((v) => v * 1.4), 0.28 * far],
    light,
    build: (mesh) => bodies[c.id].build(mesh, t, dof, xf),
    project: (px, py) => bodies[c.id].project(px, py, t, dof, xf),
    xf, sil,
  };
}

// ------------------------------------------------------------ Noomi ---
const nb = {};      // Noomi's body tracks (filled in setup)
const nf = {};      // …and face tracks
function noomiPlace(t) {
  const w = ease.inOutCubic(smoothstep(T.assemble, T.assemble + 1.45, t)) * (1 - ease.inOutSine(smoothstep(T.home, 19.95, t)));
  return { x: lerp(NOOMI.hero.x, NOOMI.line.x, w), y: lerp(NOOMI.hero.base, NOOMI.line.base, w), s: lerp(NOOMI.hero.s, NOOMI.line.s, w) };
}
const BREATH = (t) => Math.sin(PH(t) * 5);
function noomiDof(t) {
  return {
    squash: nb.squash.value(t) + nb.kicks.value(t) + 0.01 * Math.sin(t * 61) * nb.tremble(t),
    inflate: nb.inflate.value(t) + 0.024 * BREATH(t),
    lean: nb.lean.value(t) + 0.035 * Math.sin(PH(t) * 30) * bump(t, REV[4] + 0.15, REV[4] + 0.3, REV[4] + 0.8, REV[4] + 1.0),
    sway: nb.sway.value(t) + 0.06 * Math.sin(t * 47) * nb.tremble(t),
    shimmer: nb.shimmer(t), shimPhase: t * 14,
    lift: nb.hop.value(t) + nb.lift.value(t) + 10 * Math.sin(PH(t) * 5 + 1.2),
  };
}

function faceAt(t) {
  const v = (k) => nf[k].value(t);
  return {
    eyeOpen: v('eyeOpen'), eyeOpenL: 1 - nf.wink.value(t), blink: nf.blinks.value(t), closedCurve: v('curve'),
    lidTop: v('lidTop'), lidBot: v('lidBot'), irisScale: v('iris'), eyeScale: 1, eyeStretch: v('stretch'),
    lookX: v('lookX'), lookY: v('lookY'), sparkle: v('sparkle'),
    browAlpha: v('browA'), browY: v('browY'), browTilt: v('browT'),
    mouthSmile: v('smile'), mouthOpen: v('mOpen'), mouthRound: v('mRound'), mouthWave: v('mWave'), mouthWavePhase: t * 9,
    mouthWidth: v('mWidth'), blush: v('blush'),
  };
}

// ----------------------------------------------------------- particles --
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const PEARL = [[1.3, 1.15, 1.6], [1.0, 1.25, 1.6], [1.6, 1.15, 1.3], [1.5, 1.4, 1.1]];

const BURSTS = [];
function burst(t0, x, y, { n = 14, seed = 1, color = [1.4, 1.2, 1.6], speed = 260, life = 1.2, size = 12, sparkles = 0, petals = 0, up = 40, spread = 1 } = {}) {
  const r = rng(seed * 7919 + 17);
  const list = [];
  for (let k = 0; k < n + sparkles + petals; k++) {
    const kind = k < n ? 0 : k < n + sparkles ? 1 : 2;
    const a = r() * TAU, sp = speed * (0.35 + 0.65 * r());
    list.push({ kind, a, sp, life: life * (0.6 + 0.4 * r()), size: size * (kind === 1 ? 2.4 : kind === 2 ? 1.6 : 1) * (0.6 + 0.6 * r()), ph: r() * TAU, rot: r() * TAU, spin: (r() - 0.5) * 6 });
  }
  BURSTS.push({ t0, x, y, color, list, up, spread });
}
function burstParticles(t, out) {
  for (const b of BURSTS) {
    const age0 = t - b.t0;
    if (age0 < 0 || age0 > 3) continue;
    for (const p of b.list) {
      const age = age0;
      if (age > p.life) continue;
      const k = 2.2, drag = (1 - Math.exp(-k * age)) / k;
      const x = (typeof b.x === 'function' ? b.x(t) : b.x) + Math.cos(p.a) * p.sp * drag * b.spread + Math.sin(age * 3 + p.ph) * 6;
      const y = (typeof b.y === 'function' ? b.y(t) : b.y) + Math.sin(p.a) * p.sp * drag * 0.8 - b.up * age;
      const a = smoothstep(0, 0.08, age) * (1 - smoothstep(p.life * 0.45, p.life, age));
      out.push({ x, y, r: p.size * (p.kind === 1 ? 0.7 + 0.3 * Math.sin(age * 9 + p.ph) : 1), a: a * (p.kind === 2 ? 0.8 : 0.9), c: p.kind === 2 ? b.color.map((v) => v * 0.9) : mix3(b.color, [1.6, 1.5, 1.6], p.kind === 1 ? 0.6 : 0.25), kind: p.kind, rot: p.rot + p.spin * age, aspect: p.kind === 2 ? 0.55 : 1 });
    }
  }
}

// drifting pearls of the dreamscape (each rises a whole number of screens per loop)
const MOTES = (() => { const r = rng(4242); return Array.from({ length: 70 }, () => ({ x: r() * 1080, ph: r(), k: 1 + Math.floor(r() * 2), sw: r() * TAU, size: 5 + r() * 10, c: PEARL[Math.floor(r() * 4)], depth: r() })); })();
function moteParticles(t, out, amt) {
  if (amt < 0.01) return;
  for (const m of MOTES) {
    const y = 2150 - (((PH(t) / TAU) * m.k + m.ph) % 1) * 2300;
    const x = m.x + 26 * Math.sin(PH(t) * 3 + m.sw) + 0.0 * y;
    const tw = 0.7 + 0.3 * Math.sin(PH(t) * 7 + m.sw * 3);
    out.push({ x, y, r: m.size * (0.7 + 0.6 * m.depth), a: amt * tw * (0.25 + 0.4 * m.depth), c: m.c, kind: m.size > 13 ? 1 : 0 });
  }
}

// ------------------------------------------------------------ set-up ---
let hook, hookEnd, whatever, forThat, talk, feel, meet, logo, think, tag;

async function setup(stage) {
  const R = stage.renderer;
  const url = (rel) => new URL(rel, import.meta.url).href;
  // Noomi: the derived assets of the approved hi-res art (painted face removed, face rebuilt procedurally)
  const [nClean, nNormal, nJson] = await Promise.all([
    loadImage(url('../assets/noomi/noomi-clean.png')), loadImage(url('../assets/noomi/noomi-normal.png')),
    fetch(url('../assets/noomi/noomi-face.json')).then((r) => r.json()),
  ]);
  const nPristine = await loadImage(url('../assets/noomi/noomi-art.png'));
  sils.noomi = silhouette(nPristine);
  faceSpec = specFromDerived(nJson, MALLOWS.noomi.face);
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = nPristine.width; faceCanvas.height = nPristine.height;
  face = new Face(faceSpec, faceCanvas);
  R.addMallow('noomi', { artImg: nClean, faceCanvas, normalImg: nNormal, sil: sils.noomi, cols: 96, rows: 96 });
  bodies.noomi = new SoftBody({ w: nPristine.width, h: nPristine.height }, sils.noomi, { lag: 0.062, cols: 96, rows: 96 });
  eyeArt = [(faceSpec.eyes.L.x + faceSpec.eyes.R.x) / 2, (faceSpec.eyes.L.y + faceSpec.eyes.R.y) / 2];
  // the other six: their approved hi-res artwork, untouched (painted faces)
  await Promise.all(CAST.map(async (c, i) => {
    const img = await loadImage(url(`../../hushmallow/assets/source/hires/${c.id}.webp`));
    sils[c.id] = silhouette(img);
    R.addMallow(c.id, { artImg: img, sil: sils[c.id], cols: 64, rows: 64 });
    bodies[c.id] = new SoftBody({ w: img.width, h: img.height }, sils[c.id], { lag: 0.07, cols: 64, rows: 64 });
    MALLOW_DOF[c.id] = buildMallowDof(i);
  }));

  buildNoomi();
  buildBursts();

  // type: Fredoka, white with a soft ink shadow, rise + fade only (brand rule)
  hook = new TextBlock({ lines: ['Feeling something?'], y: 318, size: 86, weight: 600, enterAt: -10, exitAt: 1.85, exitDur: 0.45 });
  hookEnd = new TextBlock({ lines: ['Feeling something?'], y: 318, size: 86, weight: 600, enterAt: T.hookIn, inDur: 0.5, stagger: 0, rise: 0 });
  whatever = new TextBlock({ lines: ['Whatever it is...'], y: 318, size: 82, weight: 600, enterAt: 2.2, exitAt: 5.6, exitDur: 0.45 });
  forThat = new TextBlock({ lines: ['There’s a Mallow', 'for that.'], y: 296, size: 86, weight: 600, enterAt: 7.0, stagger: 0.28, exitAt: 11.45, exitDur: 0.5 });
  talk = new TextBlock({ lines: ['Talk it out.'], y: 300, size: 80, weight: 600, enterAt: T.talk, exitAt: 16.3, exitDur: 0.5 });
  feel = new TextBlock({ lines: ['Feel what you feel.'], y: 398, size: 80, weight: 600, enterAt: T.feel, exitAt: 16.35, exitDur: 0.5 });
  meet = new TextBlock({ lines: ['Meet your Mallows.'], y: 496, size: 80, weight: 600, enterAt: T.meet, exitAt: 16.4, exitDur: 0.5 });
  logo = new LogoCard({ y: 372, logoW: 430, url: '', urlSize: 1, gap: 0, enterAt: T.logo, exitAt: 19.1, exitDur: 0.4 });
  await logo.load();
  think = new TextBlock({ lines: ['THINK EMOTION.', 'THINK HUSHMALLOW.'], y: 572, size: 82, weight: 700, tracking: 2, lineHeight: 1.14, enterAt: T.logo + 0.25, stagger: 0.32, exitAt: 19.1, exitDur: 0.4 });
  tag = new TextBlock({ lines: ['Feel something? Hushmallow.'], y: 1540, size: 56, weight: 500, enterAt: T.logo + 0.9, exitAt: 19.1, exitDur: 0.4 });

  // cues: the soundtrack is built from these (audio/score-feel.mjs)
  const c = (t, type, d = {}) => stage.cue(t, type, d);
  c(0, 'scene', { loop: D });
  c(0.35, 'blink'); c(0.55, 'glance', { pan: -0.4 }); c(T.curious, 'curious');
  CAST.forEach((m, i) => { c(REV[i], 'reveal', { i, kind: m.kind, pan: SIDE[i] * 0.45 }); c(REV[i] + 0.18, 'react', { i, kind: m.kind }); });
  c(REV[5] + 0.12, 'hop'); c(REV[5] + 0.5, 'land', { amp: 0.6 });
  c(T.gather, 'gather'); c(T.reach, 'reach'); c(T.boop, 'boop'); c(T.boop + 0.05, 'pulse');
  CAST.forEach((m, i) => {
    const pan = clamp((P3[i][0] - 540) / 450, -0.85, 0.85);
    c(EMG[i] - 0.6, 'morph', { i, kind: m.kind, pan });
    c(EMG[i], 'emerge', { i, mallow: m.id, kind: m.kind, pan });
  });
  c(T.giggle, 'giggle'); c(T.recede, 'recede');
  c(T.fond, 'fond'); c(T.talk, 'line', { n: 0 }); c(T.feel, 'line', { n: 1 }); c(T.feel + 0.05, 'glow'); c(T.meet, 'line', { n: 2 });
  c(T.assemble, 'assemble');
  CAST.forEach((m, i) => c(T.assemble + 1.45 + i * 0.0, 'settle', { i, mallow: m.id, pan: clamp((P5[i][0] - 540) / 450, -0.85, 0.85) }));
  c(T.logo, 'logo');
  Object.entries(WAVE_ORDER).sort((a, b) => a[1] - b[1]).forEach(([id, tw], k) => c(tw, 'wave', { k, mallow: id, pan: clamp(((id === 'noomi' ? 540 : P5[CAST.findIndex((m) => m.id === id)][0]) - 540) / 450, -0.85, 0.85) }));
  c(T.wink, 'wink');
  CAST.forEach((m, i) => c(RET[i], 'return', { i, mallow: m.id, pan: clamp((P5[i][0] - 540) / 450, -0.85, 0.85) }));
  c(T.hookIn, 'hook_in');
}

function buildNoomi() {
  const r = REV;
  // ---- body
  nb.squash = new Track(0, { f: 2.4, z: 0.8 })
    .to(1.05, 0.03, { f: 3 }).to(1.5, 0)                                              // a curious little dip
    .to(r[0] + 0.2, 0.06, { f: 2.5 }).to(r[1], 0)                                     // sad: sinks
    .to(r[2] + 0.18, -0.04, { f: 4 }).to(r[3], 0)                                     // anger: puffs up tall
    .to(r[3] + 0.2, 0.05, { f: 2 }).to(r[4], 0, { f: 2.5 })                           // lonely: smaller
    .to(r[5] + 0.06, 0.1, { f: 6, z: 0.7 }).to(r[5] + 0.12, -0.16, { f: 7, z: 0.6 })  // happy: crouch… spring up
    .to(r[5] + 0.32, 0, { f: 3, z: 0.8 })
    .to(T.reach, -0.13, { f: 1.6, z: 0.9 })                                           // reaches up toward the feelings
    .to(T.boop, 0.16, { f: 7, z: 0.8 })                                               // boop!
    .to(T.boop + 0.12, 0, { f: 2.2, z: 0.32 })                                        // …and a jelly release
    .to(T.feel, 0.09, { f: 4, z: 0.8 }).to(T.feel + 0.25, 0, { f: 2.0, z: 0.35 });    // a happy squish
  nb.kicks = new Impulses()
    .kick(r[5] + 0.5, 0.18, 3.2, 0.28)                                                // landing
    .kick(T.giggle, 0.05, 4, 0.25).kick(T.giggle + 0.3, 0.05, 4, 0.25)
    .kick(T.assemble + 1.45, 0.06, 2.6, 0.3)
    .kick(WAVE_ORDER.noomi + 0.34, 0.1, 3.2, 0.3);
  EMG.forEach((e) => nb.kicks.kick(e + 0.05, 0.03, 3, 0.35));
  nb.inflate = new Track(0, { f: 2, z: 0.85 })
    .to(r[2] + 0.18, 0.08, { f: 4, z: 0.7 }).to(r[3], 0)                              // anger: a huff
    .to(r[3] + 0.2, -0.035).to(r[4] + 0.2, 0)
    .to(T.reach, 0.05).to(T.boop + 0.1, 0)
    .to(T.feel, 0.05, { f: 1.2 }).to(T.meet, 0, { f: 1.2 });
  nb.lean = new Track(0, { f: 1.8, z: 0.8 })
    .to(T.curious, -0.04).to(1.75, 0)                                                 // a curious tilt
    .to(r[3] + 0.3, 0.03).to(r[4], 0)
    .to(T.fond + 0.3, -0.035, { f: 1.2 }).to(T.feel, 0.0).to(T.meet + 0.2, 0.03).to(T.assemble, 0);
  EMG.forEach((e, i) => nb.lean.to(e + 0.02, clamp((P3[i][0] - 540) / 540, -1, 1) * 0.035, { f: 2.5 }));
  nb.lean.to(T.giggle, 0, { f: 2 });
  nb.sway = new Impulses().kick(T.giggle, 0.06, 3.5, 0.2).kick(T.boop + 0.12, 0.04, 2.2, 0.3);
  nb.sway.value = ((f) => (t) => f(t))(nb.sway.value.bind(nb.sway));
  nb.lift = new Track(0, { f: 1.6, z: 0.9 }).to(T.reach, 34).to(T.boop, 0, { f: 4, z: 0.9 });
  nb.hop = new Hops().add(r[5] + 0.12, r[5] + 0.5, 95).add(WAVE_ORDER.noomi, WAVE_ORDER.noomi + 0.34, 90);
  nb.tremble = (t) => bump(t, r[1] + 0.15, r[1] + 0.3, r[2] - 0.05, r[2] + 0.1);
  nb.shimmer = (t) => {
    let s = 0;
    for (const [t0, a] of [[r[5] + 0.5, 0.9], [T.boop, 1.0], [T.feel, 0.5], [WAVE_ORDER.noomi + 0.34, 0.5]]) if (t > t0) s = Math.max(s, a * Math.exp(-(t - t0) * 3));
    return s;
  };

  // ---- face: look targets
  const look = (t, x, y, opts) => { nf.lookX.to(t, x, opts); nf.lookY.to(t, y, opts); };
  const F = (v0, o) => new Track(v0, o || { f: 3.2, z: 0.85 });
  nf.eyeOpen = F(1);  nf.curve = F(-1, { f: 6, z: 1 }); nf.lidTop = F(0); nf.lidBot = F(0.12); nf.iris = F(1); nf.stretch = F(1);
  nf.lookX = F(0, { f: 4.5, z: 0.8 }); nf.lookY = F(0, { f: 4.5, z: 0.8 }); nf.sparkle = F(0.6, { f: 1.5, z: 1 });
  nf.browA = F(0.15); nf.browY = F(0.1); nf.browT = F(0.15);
  nf.smile = F(0.62); nf.mOpen = F(0); nf.mRound = F(0); nf.mWave = F(0); nf.mWidth = F(0.95); nf.blush = F(0.38, { f: 1.2, z: 1 });
  nf.wink = F(0, { f: 6, z: 0.85 });
  nf.blinks = new Blinks().add(0.35).add(1.62).add(7.0).add(T.fond, { close: 0.16, hold: 0.12, open: 0.36 }).add(16.1).add(18.15, { close: 0.14, hold: 0.06, open: 0.3 });
  const set = (t, kv, opts) => { for (const [k, v] of Object.entries(kv)) nf[k].to(t, v, opts); };

  // hook: eyes on us; a glance at a passing feeling; a curious "feeling something?"
  look(0.55, -0.45, 0.15); look(0.98, 0, 0);
  set(T.curious, { browA: 0.6, browY: 0.55, browT: 0.3, mRound: 0.35, mOpen: 0.08, smile: 0.35, eyeOpen: 1.08 });
  set(1.75, { browA: 0.2, browY: 0.15, browT: 0.15, mRound: 0, mOpen: 0, smile: 0.6, eyeOpen: 1 });
  // the universe of feelings: look up at each, then feel it
  r.forEach((rt, i) => { const [sx] = SPOT(SIDE[i]); look(rt + 0.05, (sx - 540) / 290, -0.72); });
  set(r[0] + 0.18, { browA: 0.9, browT: 0.95, browY: 0.25, smile: -0.62, eyeOpen: 0.9, lidTop: 0.18, blush: 0.5, mWidth: 0.82 });
  set(r[1] + 0.18, { eyeOpen: 1.18, iris: 0.78, browT: 0.7, browY: 0.6, smile: -0.25, mWave: 0.9, lidTop: 0, stretch: 1.06 });
  set(r[2] + 0.18, { eyeOpen: 1, iris: 1, lidTop: 0.42, browT: -1.0, browY: -0.25, browA: 0.95, smile: -0.42, mWidth: 0.7, mWave: 0, blush: 1.05, stretch: 1 });
  set(r[3] + 0.18, { lidTop: 0.36, lidBot: 0.08, browT: 0.85, browY: 0.12, browA: 0.85, smile: -0.48, mWidth: 0.8, blush: 0.4 });
  look(r[3] + 0.42, 0.12, 0.55);                                                      // …looks down, alone
  set(r[4] + 0.18, { lidTop: 0, lidBot: 0.05, eyeOpen: 1.06, browY: 0.62, browT: 0.3, browA: 0.6, smile: 0, mRound: 0.5, mOpen: 0.14, mWidth: 0.9 });
  [[r[4] + 0.3, -0.7, -0.55], [r[4] + 0.42, 0, -0.85], [r[4] + 0.54, 0.7, -0.55], [r[4] + 0.66, 0.6, 0.2], [r[4] + 0.78, -0.5, 0.15]].forEach(([t, x, y]) => look(t, x, y, { f: 6, z: 0.75 }));
  set(r[5] + 0.12, { eyeOpen: 0, curve: -1, smile: 1.15, mOpen: 0.5, mRound: 0, browA: 0.35, browT: 0.2, browY: 0.5, blush: 0.9, lidTop: 0, iris: 1 });
  set(T.gather - 0.05, { eyeOpen: 1.04, smile: 0.85, mOpen: 0.1, browA: 0.25, browY: 0.2 });
  look(T.gather - 0.05, 0, 0);
  // mallow magic: wonder, a stretch, the boop
  look(T.gather + 0.3, 0, -0.62);
  set(T.gather + 0.3, { eyeOpen: 1.16, iris: 1.12, sparkle: 1, mRound: 0.5, mOpen: 0.26, smile: 0.35, browY: 0.55, browA: 0.5, browT: 0.3 });
  set(T.boop - 0.06, { eyeOpen: 0, mOpen: 0.32, mRound: 0, smile: 1.05 }, { f: 9, z: 0.9 });
  set(T.boop + 0.22, { eyeOpen: 1.08, iris: 1.05, mOpen: 0.3, smile: 1.0, blush: 0.75 });
  EMG.forEach((e, i) => look(e - 0.12, clamp((P3[i][0] - 540) / 380, -0.85, 0.85), clamp((P3[i][1] - 1080) / 420, -0.8, 0.6)));
  set(T.giggle, { eyeOpen: 0, curve: -1, mOpen: 0.55, smile: 1.2, blush: 0.9 }, { f: 6, z: 0.85 });
  set(T.giggle + 0.7, { eyeOpen: 1.0, mOpen: 0.08, smile: 0.95, iris: 1.0, browA: 0.2, browY: 0.15, browT: 0.15 });
  look(T.giggle + 0.7, 0, 0);
  // connection: all her attention on us
  set(T.fond - 0.1, { lidBot: 0.28, sparkle: 1, smile: 1.05, mOpen: 0.06, blush: 0.75, browA: 0.25, browT: 0.35, browY: 0.3 });
  set(T.feel, { eyeOpen: 0, curve: -1, smile: 1.2, mOpen: 0.25 }, { f: 4, z: 0.9 });
  set(T.feel + 0.8, { eyeOpen: 1.0, mOpen: 0.06, smile: 1.05 });
  look(T.meet + 0.15, -0.72, 0.05); look(T.meet + 0.6, 0.72, 0.05); look(T.meet + 1.05, 0, 0);
  set(T.meet + 0.1, { browY: 0.6, browA: 0.45 }); set(T.meet + 1.1, { browY: 0.3, browA: 0.25 });
  // brand: smiling at us; a wink
  set(T.logo, { eyeOpen: 1.0, smile: 1.0, mOpen: 0.1, lidBot: 0.22 });
  nf.wink.to(T.wink, 1).to(T.wink + 0.32, 0);
  set(T.wink, { smile: 1.15, mOpen: 0.18 }); set(T.wink + 0.4, { smile: 1.0, mOpen: 0.08 });
  // home: back to the opening face (every track returns to its first value)
  set(T.home, { eyeOpen: 1, curve: -1, lidTop: 0, lidBot: 0.12, iris: 1, stretch: 1, sparkle: 0.6, browA: 0.15, browY: 0.1, browT: 0.15, smile: 0.62, mOpen: 0, mRound: 0, mWave: 0, mWidth: 0.95, blush: 0.38 });
  look(T.home, 0, 0);
}

function buildBursts() {
  CAST.forEach((c, i) => {
    const [sx, sy] = SPOT(SIDE[i]);
    burst(REV[i] + 0.12, sx, sy - 25, { n: 6, sparkles: 5, seed: 11 + i, color: c.color, speed: 210, life: 1.0, size: 9, up: 30 });
    const [x, y] = P3[i];
    burst(EMG[i], x, y, { n: 16, sparkles: 6, petals: c.kind === 5 || c.kind === 2 ? 10 : 4, seed: 31 + i, color: c.color, speed: 330, life: 1.4, size: 13, up: 45 });
    burst(RET[i] + 0.05, (t) => mallowCentre(i, RET[i]).x, (t) => mallowCentre(i, RET[i]).y, { n: 8, sparkles: 3, seed: 61 + i, color: c.color, speed: 160, life: 0.8, size: 9, up: 20 });
    burst(T.assemble + 1.45, P5[i][0], P5[i][1] + 60, { n: 5, seed: 81 + i, color: [1.4, 1.2, 1.5], speed: 120, life: 0.7, size: 8, up: 15 });
  });
  burst(T.boop + 0.02, 540, 880, { n: 26, sparkles: 8, seed: 5, color: [1.5, 1.3, 1.7], speed: 520, life: 1.5, size: 12, up: 20 });
  burst(r5Land(), 540, 1360, { n: 10, seed: 6, color: [1.7, 1.3, 0.6], speed: 260, life: 0.9, size: 9, up: 10 });
  Object.entries(WAVE_ORDER).forEach(([id, tw], k) => {
    const x = id === 'noomi' ? 540 : P5[CAST.findIndex((m) => m.id === id)][0];
    const y = id === 'noomi' ? 960 : P5[CAST.findIndex((m) => m.id === id)][1] - 130;
    burst(tw + 0.17, x, y, { n: 0, sparkles: 2, seed: 101 + k, color: [1.7, 1.5, 1.3], speed: 60, life: 0.7, size: 9, up: 40 });
  });
}
function r5Land() { return REV[5] + 0.5; }

// ------------------------------------------------------------- state ---
function state(t, { center = false, dry = false } = {}) {
  const sky = skyAt(t), cam = camAt(t);
  const wm = warmAt(t), dr = dreamAt(t);
  const keyCol = mix3(mix3([1.0, 0.97, 1.02], [0.98, 0.96, 1.05], dr), [1.05, 0.97, 0.92], wm);
  const light = {
    dir: [0.4, 0.6, 0.7], key: keyCol, rim: mix3(mix3([0.75, 0.62, 1.0], [0.8, 0.75, 1.1], dr), [1.0, 0.72, 0.62], wm), rimAmt: 0.42, spec: 0.5,
    specCol: [0.95, 0.95, 1.05], glowCol: [1.0, 0.8, 0.6], glow: 0, ambient: sky.uMid,
  };
  const nl = { ...light, glow: 0.05 * dr + 0.06 * wm + 0.1 * bump(t, T.feel - 0.05, T.feel + 0.3, T.feel + 0.9, T.feel + 2.0) + 0.04 * bump(t, T.boop, T.boop + 0.1, T.boop + 0.3, T.boop + 1.2) };

  // Noomi
  const np = noomiPlace(t);
  const xfN = { x: np.x, y: np.y, s: np.s };
  const mallows = [{
    id: 'noomi', z: 0, light: nl, fade: 1, emerge: 0, lod: 0,
    build: (mesh) => bodies.noomi.build(mesh, t, noomiDof, xfN),
  }];
  const others = [];
  CAST.forEach((_, i) => { const m = mallowItem(i, t, light, sky); if (m) { mallows.push(m); others.push(m); } });
  const orbs = [];
  CAST.forEach((_, i) => { const o = orbAt(i, t); if (o) orbs.push(o); });

  // particles: light pools under the Mallows, dream pearls, bursts
  const partsBack = [], partsFront = [];
  const sN = bodies.noomi.project(sils.noomi.cx, sils.noomi.baseY, t, noomiDof, xfN);
  const liftN = noomiDof(t).lift * np.s;
  partsBack.push({ x: np.x, y: np.y + 6, r: 300 * np.s / 0.47, a: 0.42 * Math.exp(-liftN / 120), c: mix3([0.55, 0.45, 0.95], [1.0, 0.7, 0.55], wm), kind: 3, aspect: 2.6 });
  for (const m of others) {
    const lift = MALLOW_DOF[m.id](t).lift * m.s;
    partsBack.push({ x: m.x, y: m.xf.y + 4, r: m.sil.halfW * m.s * 1.35, a: 0.32 * m.fade * Math.exp(-lift / 100) * (1 - 0.6 * (m.lod / 1.4)), c: [0.6, 0.5, 1.0], kind: 3, aspect: 2.6 });
  }
  moteParticles(t, partsBack, 0.35 * dr + 0.18 * wm + 0.08);
  burstParticles(t, partsFront);
  void sN;

  const S = { t, ph: PH(t), cam, mallows, orbs, partsBack, partsFront };
  if (!center) return S;
  S.sky = sky;
  S.post = {
    exposure: 1.0, bloom: 0.2, bloomThresh: 0.78, contrast: 1.04, sat: 1.05,
    shadowTint: mix3([0.95, 0.96, 1.07], [0.98, 0.95, 1.04], wm), highTint: mix3([1.01, 1.0, 1.0], [1.04, 1.0, 0.96], wm),
    vignette: 0.3, grain: 0.016, time: t,
  };
  if (!dry) S.faces = [{ id: 'noomi', draw: () => face.draw(faceAt(t)) }];
  S.audio = { spiral: +sky.uSpiral.toFixed(3), dream: +dr.toFixed(3), warm: +wm.toFixed(3), speed: +speedAt(t).toFixed(3), squash: +noomiDof(t).squash.toFixed(4) };
  return S;
}

// sub-frames: enough that nothing moves more than ~2.5 px between two of them
function subframes(t) {
  const sh = meta.shutter / meta.fps / 2;
  const a = state(t - sh), b = state(t + sh);
  let d = 0;
  for (let k = 0; k < a.orbs.length && k < b.orbs.length; k++) d = Math.max(d, Math.hypot(a.orbs[k].x - b.orbs[k].x, a.orbs[k].y - b.orbs[k].y) + Math.abs(a.orbs[k].r - b.orbs[k].r));
  const npA = noomiPlace(t - sh), npB = noomiPlace(t + sh);
  const s = sils.noomi;
  const pa = bodies.noomi.project(s.cx, s.top, t - sh, noomiDof, { x: npA.x, y: npA.y, s: npA.s });
  const pb = bodies.noomi.project(s.cx, s.top, t + sh, noomiDof, { x: npB.x, y: npB.y, s: npB.s });
  d = Math.max(d, Math.hypot(pa.x - pb.x, pa.y - pb.y));
  for (const ma of a.mallows) {
    if (ma.id === 'noomi') continue;
    const mb = b.mallows.find((m) => m.id === ma.id);
    if (!mb) continue;
    const ta = ma.project(ma.sil.cx, ma.sil.top), tb = mb.project(mb.sil.cx, mb.sil.top);
    d = Math.max(d, Math.hypot(ta.x - tb.x, ta.y - tb.y));
  }
  return Math.max(2, Math.min(10, Math.ceil(d / 2.5)));
}

// ------------------------------------------------------------ overlay ---
function overlay(ctx, t) {
  ctx.clearRect(0, 0, 1080, 1920);
  hook.draw(ctx, t);
  if (t >= T.hookIn) hookEnd.draw(ctx, t);
  whatever.draw(ctx, t);
  forThat.draw(ctx, t);
  talk.draw(ctx, t); feel.draw(ctx, t); meet.draw(ctx, t);
  logo.draw(ctx, t);
  think.draw(ctx, t);
  tag.draw(ctx, t);
  return true;
}

export default { meta, setup, state, overlay, subframes };
