// "FEEL SOMETHING?" v3 — emotional-impact pass. 20 s · 1080 × 1920 · 30 fps · 96 BPM
// (one bar = 2.5 s, the loop = 8 bars) · loops seamlessly. Same dream2 world and engine as
// v2, rebuilt around the characters: bigger, closer, and one emotional journey
//
//   Curiosity → Vulnerability → Connection → Wonder → Joy → Belonging
//
//   bar 1  0.0   CURIOSITY      close on Noomi, eyes on us. A little light — your feeling —
//                               hangs by the lens. She looks at it, back at us, leans in.
//                               "Feeling something?"
//   bar 2  2.5   VULNERABILITY  she touches it and it melts into her: she feels it too. Her eyes
//                               fill, a tear rolls; she looks down, then up at us. The world
//                               dims and softens. "Whatever it is..."
//   bar 3  5.0   CONNECTION     Blubi hops in, sees the tear, its own eyes fill — and it
//                               snuggles in. "There's a Mallow for that."  Blubi talks, Noomi
//                               nods and smiles. "Talk it out."  Loomi drifts down, anxious,
//                               takes one big slow breath; Noomi breathes with it.
//   bar 4  7.5   WONDER         the camera rises: four lights lift out of the lake and fall,
//                               one per beat, as Mallows onto the others' heads — Pipzi's
//                               anger bursts into fireworks, lonely Glitzi is welcomed and
//                               winks, Zuzu's racing spirals slow to wonder…
//   bar 5  10.0  JOY            …Boppo lands on top on the downbeat: the pile is complete and
//                               the whole pile bounces with the music. "Feel what you feel."
//   bar 6  12.5  BELONGING      close: everyone snuggles in and looks at us; one slow blink
//                               together; your light comes back and lands in front of them,
//                               and they all look at it fondly. "Meet your Mallows."
//   bar 7  15.0  BRAND          approved logo, THINK EMOTION. THINK HUSHMALLOW.
//   bar 8  17.5                 "Feel something? Hushmallow." Noomi winks; the six become
//                               lights again and fly back into the one by the lens: frame 0.
//
// Phone-first: every story beat reads without sound and at 360 px wide (faces large, one
// short line of type at a time, nothing important at the frame edges).

import { SoftBody } from '../engine/softbody.js';
import { Face, NEUTRAL, specFromDerived } from '../engine/face/index.js';
import { TextBlock, LogoCard } from '../engine/type.js';
import { silhouette } from '../engine/stage.js';
import { loadImage } from '../dream2/stage.js';
import { project } from '../dream2/camera.js';
import { LivingMallow, naturalBlinks } from '../dream2/living.js';
import { MALLOWS } from '../../hushmallow/src/mallows/registry.js';
import { Track, Impulses, Hops, Blinks, spring, ring, clamp, lerp, smoothstep, TAU, hex3, spline, ease } from '../engine/motion.js';

const D = 20, BEAT = 0.625, BAR = 4 * BEAT;
const b = (n) => n * BEAT;
const meta = { id: 'feel-something-v3', title: 'Feel Something? Hushmallow', fps: 30, duration: D, shutter: 0.5 };
const PH = (t) => (TAU * t) / D;
const bump = (t, a, bb, c, d) => smoothstep(a, bb, t) * (1 - smoothstep(c, d, t));
const lin = (h) => hex3(h).map((v) => Math.pow(v, 2.2));
const mix3 = (a, c, k) => a.map((v, i) => v + (c[i] - v) * k);
const smoother = (x) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
let MOTION = 1;                 // 1 full; the reduced-motion cut holds still framings and halves hops
let TRAVEL = 1;                 // reduced motion: shorter journeys (hops in, lights rising, falls) and softer impacts

// ------------------------------------------------------------ the cast --
// seat: where each sits in the pile. Blubi and Loomi stand beside Noomi; the four who arrive
// in the wonder bar land on top (Pipzi and Boppo on Noomi, Glitzi on Blubi, Zuzu on Loomi).
const CAST = [
  { id: 'blubi', kind: 0, color: [0.35, 0.62, 1.7], seed: 0.13, seat: { X: 288, Z: 960 } },                     // sadness      → The Softie
  { id: 'loomi', kind: 1, color: [0.85, 0.62, 1.6], seed: 0.41, seat: { X: 800, Z: 962 } },                     // anxiety      → The Chill One
  { id: 'pipzi', kind: 2, color: [1.9, 0.62, 0.22], seed: 0.67, seat: { on: 'noomi', dx: -122, Z: 1004 } },     // anger        → The Spark
  { id: 'glitzi', kind: 3, color: [1.15, 1.05, 1.7], seed: 0.29, seat: { on: 'blubi', dx: -6, Z: 966 } },       // loneliness   → The Chaos Mallow
  { id: 'zuzu', kind: 4, color: [1.15, 0.72, 1.7], seed: 0.83, seat: { on: 'loomi', dx: 6, Z: 966 } },         // overthinking → The Spiral
  { id: 'boppo', kind: 5, color: [1.9, 1.3, 0.32], seed: 0.55, seat: { on: 'noomi', dx: 126, Z: 1004 } },       // happiness    → The Sunshine
];
const IDX = Object.fromEntries(CAST.map((c, i) => [c.id, i]));
const T = {
  notice: 0.45, ask: 1.05, lean: 1.55, take: 2.35, melt: 2.62, tearL: 3.0, tearR: 3.75, down: 3.95, up: 4.45,
  blubiJump: 4.55, blubiLand: b(8), empathy: 5.4, hug: b(10), talk: 6.62, talkEnd: 7.55,
  loomiFloat: 6.8, loomiLand: b(12), breathIn: 7.75, breathOut: 8.35, breathEnd: 9.0,
  drop: b(16), feel: b(16) + 0.08, settle: b(20), meet: 12.75, blink: 13.75, gift: 13.85, giftLand: 14.55,
  logo: b(24), tag: b(26) - 0.3, wink: b(28), home: 19.15, hookIn: 19.45,
};
// the four arrivals: each light rises, becomes its Mallow and lands on a beat (the last on the drop)
const ARRIVE = { pipzi: b(13), glitzi: b(14), zuzu: b(15), boppo: b(16) };
const RISE = { pipzi: [-260, 1650], glitzi: [-120, 1900], zuzu: [1220, 1900], boppo: [1340, 1650] };   // where each light leaves the lake (X, Z)
const RET = CAST.map((_, i) => 18.95 + 0.06 * i);            // …and a light again for the loop
const JOY_BEATS = [b(17), b(18), b(19)];                      // the pile bounces on the beats after the drop

// ------------------------------------------------------------- layout --
// world: X across, Y up (the lake is Y = 0), Z away from the camera (Noomi at Z = 1000).
const NOOMI = { X: 540, Z: 1000, H: 470 };
const COMPANION_H = 300;
const CAMS = {
  ecu: { x: 540, h: 218, z: 600, horizon: 1010 },          // Noomi's face fills the frame
  ecuIn: { x: 540, h: 226, z: 662, horizon: 1000 },        // …closer as she feels it
  two: { x: 420, h: 238, z: 382, horizon: 965 },           // Noomi and Blubi
  trio: { x: 556, h: 282, z: 248, horizon: 950 },
  wonder: { x: 540, h: 430, z: -10, horizon: 860 },        // up and back: the lake, the sky, the lights
  joy: { x: 540, h: 400, z: 110, horizon: 900 },
  belong: { x: 540, h: 360, z: 268, horizon: 935 },        // close on the pile, faces large
  brand: { x: 540, h: 330, z: -120, horizon: 1160 },
};
// reduced motion: the same story in still framings (cuts, no camera travel)
const REDUCED_SHOTS = [[0, 'ecu'], [4.9, 'two'], [7.55, 'wonder'], [12.5, 'belong'], [15.0, 'brand'], [19.0, 'ecu']];
const HOOK_ORB = (() => { const Z = 830, c = CAMS.ecu, k = 1000 / (Z - c.z); return { X: 540 + (150 - 540) / k, Y: c.h + (c.horizon - 700) / k, Z, R: 30 }; })();
const GIFT = { X: 540, Y: 70, Z: 760, R: 40 };              // where your light lands in front of the pile
const ORB_R = 64;

// ------------------------------------------------------------- camera --
function camAt(t) {
  const C = CAMS;
  if (MOTION < 1) {
    let k = 0;
    while (k + 1 < REDUCED_SHOTS.length && REDUCED_SHOTS[k + 1][0] <= t) k++;
    return { ...C[REDUCED_SHOTS[k][1]] };
  }
  const keys = [[0, C.ecu], [2.3, { ...C.ecu, z: 628 }], [4.8, C.ecuIn], [5.55, C.two], [7.0, { ...C.two, z: 400, x: 430 }], [7.75, C.trio],
    [8.4, C.wonder], [9.75, { ...C.wonder, z: 10, h: 420 }], [10.7, C.joy], [12.25, { ...C.joy, z: 140 }], [13.2, C.belong], [14.9, { ...C.belong, z: 286 }],
    [15.75, C.brand], [18.75, { ...C.brand, z: -95 }], [19.97, C.ecu], [20, C.ecu]];
  const pick = (f) => spline(keys.map(([kt, c]) => [kt, c[f]]), t);
  return { x: pick('x'), h: pick('h'), z: pick('z'), horizon: pick('horizon') };
}

// ------------------------------------------------------------ palette --
// a quieter world than v2: it carries the mood and stays behind the characters
const PAL = {
  twilight: { zenith: '#0b0a2c', mid: '#382a72', low: '#c27a9e', glow: '#ffae92', moon: '#fff0e4', cloudLit: '#f1c4df', cloudDark: '#3a2f6e',
    hillFar: '#5b4b8e', hillNear: '#3a2e6c', waterNear: '#0d0b2a', waterFar: '#4c3a7c', mist: '#c4a2d8', aurA: '#7ef2d0', aurB: '#a78bff', aurC: '#ff8fd0',
    n: { aurora: 0.1, cloud: 0.7, rays: 0.25, stars: 0.7, moonGlow: 0.9, mist: 0.5, hills: 1 } },
  blue: { zenith: '#050616', mid: '#141a46', low: '#2f3f84', glow: '#6d7fd8', moon: '#dfe6ff', cloudLit: '#8c9ad8', cloudDark: '#10143a',
    hillFar: '#1f2560', hillNear: '#121646', waterNear: '#04051a', waterFar: '#1c2460', mist: '#5b68b0', aurA: '#5fd8d0', aurB: '#6f7bff', aurC: '#9a7bff',
    n: { aurora: 0.0, cloud: 0.55, rays: 0.1, stars: 0.5, moonGlow: 0.6, mist: 0.65, hills: 1 } },
  night: { zenith: '#04051a', mid: '#121848', low: '#3c3c92', glow: '#8d7dff', moon: '#eef0ff', cloudLit: '#bcc5ff', cloudDark: '#11143a',
    hillFar: '#2a2a6a', hillNear: '#18184a', waterNear: '#05061a', waterFar: '#262d6c', mist: '#6d6db8', aurA: '#6ff7d2', aurB: '#9a7bff', aurC: '#ff7ad0',
    n: { aurora: 1.0, cloud: 0.4, rays: 0.6, stars: 1.0, moonGlow: 1.1, mist: 0.4, hills: 1 } },
  dawn: { zenith: '#1b1546', mid: '#6a4c9c', low: '#ffb492', glow: '#ffc68e', moon: '#fff2d4', cloudLit: '#ffd8c4', cloudDark: '#6a4a84',
    hillFar: '#a07aa8', hillNear: '#6e5288', waterNear: '#1d1440', waterFar: '#b47c9c', mist: '#ffd2c4', aurA: '#9ef0d8', aurB: '#c0a0ff', aurC: '#ffa8d8',
    n: { aurora: 0.08, cloud: 0.7, rays: 0.55, stars: 0.15, moonGlow: 1.0, mist: 0.55, hills: 1 } },
};
for (const p of Object.values(PAL)) for (const key of Object.keys(p)) if (typeof p[key] === 'string') p[key] = lin(p[key]);
const blueAt = (t) => spline([[0, 0], [2.5, 0], [3.4, 0.85], [4.9, 0.85], [6.4, 0.15], [7.5, 0], [20, 0]], t);
const nightAt = (t) => spline([[0, 0], [7.3, 0], [8.4, 1], [9.7, 1], [10.6, 0.15], [12.4, 0], [20, 0]], t);
const dawnAt = (t) => spline([[0, 0.15], [2.4, 0.15], [3.2, 0], [9.6, 0], [10.25, 1], [17.5, 1], [19.9, 0.15], [20, 0.15]], t);
function palette(t) {
  const bl = blueAt(t), nn = nightAt(t), dd = dawnAt(t), out = { n: {} };
  for (const key of Object.keys(PAL.twilight)) {
    if (key === 'n') continue;
    out[key] = mix3(mix3(mix3(PAL.twilight[key], PAL.blue[key], bl), PAL.night[key], nn), PAL.dawn[key], dd);
  }
  for (const key of Object.keys(PAL.twilight.n)) out.n[key] = lerp(lerp(lerp(PAL.twilight.n[key], PAL.blue.n[key], bl), PAL.night.n[key], nn), PAL.dawn.n[key], dd);
  return out;
}

// ------------------------------------------------------------- ripples --
const RIPPLES = [];
const addRipple = (t, X, Z, amp) => RIPPLES.push({ t, X, Z, amp });

// ------------------------------------------------------- shared state --
let living = {}, bodies = {}, sils = {}, face, faceSpec, faceKey = '';
const MDOF = {};
const nb = {}, nf = {};

// world-height of the top of a body (what a Mallow sitting on it rests on), at time t
function topOf(id, t, dx = 0) {
  if (id === 'noomi') {
    const d = noomiDof(t - 0.062);
    const s = d.squash, inf = d.inflate;
    const H = NOOMI.H * (1 - s) * (1 + 0.85 * inf);
    // Noomi's top is a soft dome: lower towards the sides
    const u = dx / 260;
    return { Y: H * (1 - 0.1 * u * u) + d.lift * (NOOMI.H / sils.noomi.h) - 22, X: NOOMI.X + d.lean * NOOMI.H * 0.92 };
  }
  const i = IDX[id], W = mallowWorld(i, t), d = MDOF[id](t - 0.07);
  const H = COMPANION_H * (1 - d.squash) * (1 + 0.85 * d.inflate);
  return { Y: W.Y + H + d.lift * (COMPANION_H / sils[id].h) - 16, X: W.X + d.lean * COMPANION_H * 0.9 };
}

// --------------------------------------------------------- companions ---
// where each companion's base is, in the world (the lift of hops is in its DOFs)
function mallowWorld(i, t) {
  const c = CAST[i], s = c.seat;
  if (c.id === 'blubi') {
    // a hop in from the left, landing beside Noomi on the bar
    const u = smoother((t - T.blubiJump) / (T.blubiLand - T.blubiJump));
    return { X: lerp(s.X - (s.X + 330) * TRAVEL, s.X, u), Y: 4 * 170 * TRAVEL * u * (1 - u) * (t < T.blubiLand ? 1 : 0), Z: s.Z };
  }
  if (c.id === 'loomi') {
    // drifts down like a cloud, a slow sway, settling on the beat
    const u = ease.outCubic(clamp((t - T.loomiFloat) / (T.loomiLand - T.loomiFloat), 0, 1));
    const sw = 26 * Math.sin((t - T.loomiFloat) * 4.4) * (1 - u) * MOTION;
    return { X: s.X + sw, Y: 720 * TRAVEL * (1 - u), Z: s.Z };
  }
  // the arrivals: a light rises from the lake, arcs over, becomes the Mallow, falls onto its seat
  const land = ARRIVE[c.id];
  const seatW = () => { const tp = topOf(s.on, t, s.dx); return { X: tp.X + s.dx, Y: tp.Y, Z: s.Z }; };
  if (t >= land) return seatW();
  const tp = topOf(s.on, land, s.dx);
  const end = { X: tp.X + s.dx, Y: tp.Y, Z: s.Z };
  const u = clamp((t - (land - 0.35)) / 0.35, 0, 1);         // the fall
  const apex = { X: end.X, Y: end.Y + 330 * TRAVEL, Z: end.Z };
  return { X: apex.X, Y: lerp(apex.Y, end.Y, u * u), Z: apex.Z };
}

function lightPath(i, t) {
  // the arriving light: from the lake (rise) over to just above its seat, by land − 0.35
  const c = CAST[i], land = ARRIVE[c.id];
  const W = mallowWorld(i, land - 0.35);
  const [X0, Z0] = TRAVEL === 1 ? RISE[c.id] : [lerp(W.X, RISE[c.id][0], TRAVEL), lerp(W.Z, RISE[c.id][1], TRAVEL)];
  const u = smoother((t - (land - 1.35)) / 1.0);
  const X = lerp(X0, W.X, u), Z = lerp(Z0, W.Z, u);
  const Y = lerp(TRAVEL < 1 ? W.Y + COMPANION_H * 0.5 : 0, W.Y + COMPANION_H * 0.5, u) + Math.sin(Math.PI * u) * 260 * TRAVEL;
  return { X, Y, Z, u };
}

function companionDof(i) {
  const c = CAST[i], id = c.id, L = living[id];
  const arrive = c.id === 'blubi' ? T.blubiLand : c.id === 'loomi' ? T.loomiLand : ARRIVE[c.id];
  const kicks = new Impulses().kick(arrive, 0.2, 3.0, 0.28);
  const hops = new Hops();
  const top = !!c.seat.on;
  // the joy: bottom row squashes on every beat, the top row hops on them
  JOY_BEATS.forEach((bt, k) => {
    if (top) { hops.add(bt - 0.3, bt, k === 2 ? 0.34 : 0.22); kicks.kick(bt, 0.12, 3.2, 0.3); }
    else kicks.kick(bt, 0.1, 3.0, 0.32);
  });
  // whoever is sat on feels it
  CAST.forEach((o) => { if (o.seat.on === id) kicks.kick(ARRIVE[o.id], 0.17, 2.8, 0.3); });
  if (id === 'blubi') kicks.kick(T.hug, 0.06, 2.2, 0.4);
  // the hello at the end: a ripple of little hops across the pile
  hops.add(T.wink + 0.15 + HELLO[id], T.wink + 0.47 + HELLO[id], 0.16);
  hops.add(RET[i] - 0.05, RET[i] + 0.4, 0.3);
  const lean = new Track(0, { f: 1.6, z: 0.85 });
  if (id === 'blubi') lean.to(T.empathy, 0.02).to(T.hug - 0.12, 0.09, { f: 2.2, z: 0.6 }).to(T.talkEnd, 0.05).to(T.settle, 0.07).to(15.6, 0.03).to(RET[i] - 0.3, 0);
  if (id === 'loomi') lean.to(T.loomiLand + 0.2, -0.02).to(T.settle, -0.07).to(15.6, -0.03).to(RET[i] - 0.3, 0);
  if (id === 'glitzi') lean.to(9.0, 0.05).to(9.6, 0).to(T.settle, 0.06).to(15.6, 0.02).to(RET[i] - 0.3, 0);
  if (id === 'zuzu') lean.to(T.settle, -0.06).to(15.6, -0.02).to(RET[i] - 0.3, 0);
  if (id === 'pipzi') lean.to(T.settle, 0.05).to(15.6, 0.02).to(RET[i] - 0.3, 0);
  if (id === 'boppo') lean.to(T.settle, -0.05).to(15.6, -0.02).to(RET[i] - 0.3, 0);
  const amp = (t) => smoothstep(arrive, arrive + 0.4, t) * MOTION;
  return (t) => {
    const P = L.expr.value(t);
    const a = amp(t), ph = PH(t);
    let inflate = 0.016 * P.breath * Math.sin(TAU * t * 0.4 + i) * a - 0.08 * P.shrink + 0.03 * (P.cheekPuff || 0);
    if (id === 'loomi') inflate += breathShape(t) * 1.1;
    inflate += breathShape(t) * 0.25 * (id !== 'loomi' ? 1 : 0) * (t > T.loomiLand ? 1 : 0);
    const nuzzle = id === 'blubi' ? 0.03 * MOTION * Math.sin((t - T.hug) * 9) * bump(t, T.hug, T.hug + 0.15, T.hug + 0.9, T.hug + 1.3) : 0;
    return {
      squash: kicks.value(t) * (0.4 + 0.6 * TRAVEL) + P.squashBias * 0.7 + P.droop * 0.05 + (t < arrive ? -0.12 : 0) * (top ? 1 : 0),
      inflate,
      lean: lean.value(t) + 0.002 * P.tiltBias + 0.012 * Math.sin(ph * 6 + i) * a + nuzzle,
      sway: P.tremble * 0.05 * Math.sin(t * 43 + i) * a + 0.04 * ring(t - arrive, 2.2, 0.3),
      shimmer: 0.7 * Math.exp(-Math.max(0, t - arrive) * 3) * (t > arrive ? 1 : 0), shimPhase: (t - arrive) * 14,
      lift: sils[id].h * hops.value(t) * (MOTION < 1 ? 0.35 : 1),
    };
  };
}
// one big slow breath together (Loomi leads): in for a beat, held, out over two
function breathShape(t) {
  if (t < T.breathIn || t > T.breathEnd + 0.4) return 0;
  const inn = smoother((t - T.breathIn) / 0.55), out = smoother((t - T.breathOut) / 0.65);
  return 0.075 * (inn - out);
}
const HELLO = { glitzi: 0, blubi: 0.08, pipzi: 0.16, noomi: 0.24, boppo: 0.32, zuzu: 0.4, loomi: 0.48 };

function companionItem(i, t, cam, light, pal) {
  const c = CAST[i];
  const arrive = c.id === 'blubi' ? T.blubiJump : c.id === 'loomi' ? T.loomiFloat : ARRIVE[c.id] - 0.38;
  if (t < arrive - 0.02 || t > RET[i] + 0.3) return null;
  const sil = sils[c.id], W = mallowWorld(i, t);
  const top = !!c.seat.on;
  const grow = top ? 0.2 + 0.8 * spring(t - arrive, 2.2, 0.5) : 1;
  const g = clamp(1 - smoothstep(RET[i] - 0.06, RET[i] + 0.24, t), 0, 1);
  const p = project(cam, W.X, W.Y, W.Z), pr = project(cam, W.X, -W.Y, W.Z);
  const s = (COMPANION_H / sil.h) * p.k * grow * lerp(0.3, 1, g);
  const xf = { x: p.x, y: p.y, s }, xfR = { x: pr.x, y: pr.y, s };
  const dof = MDOF[c.id];
  return {
    id: c.id, z: W.Z, fade: (top ? smoothstep(arrive, arrive + 0.08, t) : 1) * clamp(1 - smoothstep(RET[i] + 0.08, RET[i] + 0.28, t), 0, 1),
    emerge: Math.max(top ? 1 - smoothstep(arrive, arrive + 0.6, t) : 0, 1 - g), emergeCol: c.color.map((v) => v * 0.8),
    lod: 0, haze: [0, 0, 0, 0], light, xf, sil, W,
    build: (mesh) => bodies[c.id].build(mesh, t, dof, xf),
    buildRefl: (mesh) => bodies[c.id].build(mesh, t, dof, xfR, true),
    project: (px, py) => bodies[c.id].project(px, py, t, dof, xf),
  };
}

// --------------------------------------------------------------- orbs ---
function orbScreen(P, cam, o) {
  const s = project(cam, P.X, P.Y, P.Z), m = project(cam, P.X, -P.Y, P.Z);
  return { ...o, x: s.x, y: s.y, ry: m.y, r: o.R * s.k, z: P.Z, X: P.X, Y: P.Y, Z: P.Z, squash: o.squash || [1, 1] };
}
const PEARL_ORB = [1.3, 1.15, 1.6];
// your light: by the lens, taken in by Noomi, given back at the end, home to the lens for the loop
function giftOrb(t, cam) {
  const pulse = 0.06 * (ring(t - b(2), 3.2, 0.35) + ring(t - b(3) + 0.05, 3.2, 0.35)) * MOTION;
  const bob = 7 * Math.sin(PH(t) * 4) * MOTION;
  if (t < T.melt + 0.05) {
    // it drifts in to Noomi's cheek as she reaches for it, and melts into her
    const u = smoother((t - (T.take - 0.15)) / (T.melt - T.take + 0.15));
    const to = { X: NOOMI.X - 150, Y: 205, Z: NOOMI.Z - 40 };
    const P = { X: lerp(HOOK_ORB.X, to.X, u), Y: lerp(HOOK_ORB.Y + bob, to.Y, u), Z: lerp(HOOK_ORB.Z, to.Z, u) };
    const fade = 1 - smoothstep(T.melt - 0.12, T.melt + 0.05, t);
    return orbScreen(P, cam, { kind: 0, reveal: 0, morph: 0, alpha: fade, seed: 0.5, glow: 0.35 + 0.5 * smoothstep(T.take, T.melt, t), flash: 0.3 * smoothstep(T.take, T.melt, t), color: PEARL_ORB, R: HOOK_ORB.R * (1 + pulse) * lerp(1, 0.55, u) });
  }
  if (t < T.gift) return null;
  if (t < 18.95) {
    // given back: it floats down in front of the pile and stays, glowing softly
    const u = ease.outCubic(clamp((t - T.gift) / (T.giftLand - T.gift), 0, 1));
    const P = { X: GIFT.X + 60 * Math.sin(u * Math.PI) * MOTION, Y: lerp(GIFT.Y + 490 * TRAVEL, GIFT.Y, u) + 6 * Math.sin((t - T.gift) * 3) * MOTION * u, Z: GIFT.Z };
    return orbScreen(P, cam, { kind: 0, reveal: 0, morph: 0, alpha: smoothstep(T.gift, T.gift + 0.25, t), seed: 0.5, glow: 0.45 + 0.1 * Math.sin((t - T.gift) * 2.4), flash: 0.25 * (1 - u), color: PEARL_ORB, R: GIFT.R });
  }
  // home to the lens: the opening frame
  const w = ease.inOutSine(smoothstep(18.95, 19.97, t));
  const P = { X: lerp(GIFT.X, HOOK_ORB.X, w), Y: lerp(GIFT.Y, HOOK_ORB.Y, w) + Math.sin(Math.PI * w) * 110, Z: lerp(GIFT.Z, HOOK_ORB.Z, w) };
  return orbScreen(P, cam, { kind: 0, reveal: 0, morph: 0, alpha: 1, seed: 0.5, glow: lerp(0.45, 0.35, w), flash: 0, color: PEARL_ORB, R: lerp(GIFT.R, HOOK_ORB.R, w) });
}
function hookOrbAt0(t, cam) {
  // frame 0 (and the end of the loop): the one light by the lens
  const pulse = 0.06 * (ring(t - b(2), 3.2, 0.35) + ring(t - b(3) + 0.05, 3.2, 0.35)) * MOTION;
  return orbScreen({ X: HOOK_ORB.X, Y: HOOK_ORB.Y + 7 * Math.sin(PH(t) * 4) * MOTION, Z: HOOK_ORB.Z }, cam, { kind: 0, reveal: 0, morph: 0, alpha: 1, seed: 0.5, glow: 0.35, flash: 0, color: PEARL_ORB, R: HOOK_ORB.R * (1 + pulse) });
}

function arrivalOrb(i, t, cam) {
  const c = CAST[i], land = ARRIVE[c.id];
  if (!land || t < land - 1.35 || t > land - 0.2) return null;
  const P = lightPath(i, t);
  const morph = smoothstep(land - 0.75, land - 0.38, t);
  const pop = smoothstep(land - 0.42, land - 0.26, t);
  const rise = smoothstep(land - 1.35, land - 1.15, t);
  return orbScreen(P, cam, { kind: c.kind, reveal: smoothstep(land - 1.0, land - 0.7, t), morph, alpha: rise * (1 - pop), seed: c.seed, glow: 0.35, flash: 0.3 * morph * (1 - pop), color: c.color, R: ORB_R * (1 + 0.3 * pop) });
}
function returnOrb(i, t, cam) {
  if (t < RET[i] - 0.02 || MOTION < 1) return null;      // reduced motion: they simply fade out
  const c = CAST[i], m = mallowWorld(i, RET[i]);
  const k = smoothstep(RET[i], RET[i] + 0.22, t);
  const w = ease.inOutSine(smoothstep(RET[i] + 0.06, 19.9, t));
  const X = lerp(m.X, HOOK_ORB.X, w), Y = lerp(m.Y + COMPANION_H * 0.5, HOOK_ORB.Y, w) + Math.sin(Math.PI * w) * 140, Z = lerp(m.Z, HOOK_ORB.Z, w);
  const alpha = k * (1 - smoothstep(19.55, 19.9, t));
  return orbScreen({ X, Y, Z }, cam, { kind: c.kind, reveal: 0, morph: 0, alpha, seed: c.seed, glow: 0.35, flash: 0.4 * (1 - k), color: c.color, R: ORB_R * lerp(0.6, 1, k) * lerp(1, HOOK_ORB.R / ORB_R, w) });
}

// --------------------------------------------------------------- Noomi ---
function noomiDof(t) {
  return {
    squash: nb.squash.value(t) + nb.kicks.value(t) * (0.4 + 0.6 * TRAVEL) + 0.012 * Math.sin(t * 61) * nb.tremble(t),
    inflate: nb.inflate.value(t) + 0.02 * Math.sin(PH(t) * 5) * MOTION + breathShape(t) * 0.8,
    lean: nb.lean.value(t) + nb.nod(t),
    sway: nb.sway.value(t) + 0.04 * Math.sin(t * 47) * nb.tremble(t),
    shimmer: nb.shimmer(t), shimPhase: t * 14,
    lift: (nb.hop.value(t) + nb.lift.value(t)) * (MOTION < 1 ? 0.35 : 1),
  };
}
function faceAt(t) {
  const v = (k) => nf[k].value(t);
  return {
    eyeOpen: v('eyeOpen'), eyeOpenL: 1 - nf.wink.value(t), blink: nf.blinks.value(t), closedCurve: v('curve'),
    lidTop: v('lidTop'), lidBot: v('lidBot'), irisScale: v('iris'), eyeScale: 1, eyeStretch: v('stretch'),
    lookX: v('lookX'), lookY: v('lookY'), sparkle: v('sparkle'),
    browAlpha: v('browA'), browY: v('browY'), browTilt: v('browT'),
    mouthSmile: v('smile'), mouthOpen: v('mOpen') + nb.giggle(t), mouthRound: v('mRound'), mouthWave: v('mWave'), mouthWavePhase: t * 9,
    mouthWidth: v('mWidth'), blush: v('blush'),
  };
}
function noomiItem(t, cam, light) {
  const sil = sils.noomi;
  const p = project(cam, NOOMI.X, 8, NOOMI.Z), pr = project(cam, NOOMI.X, -8, NOOMI.Z);
  const s = (NOOMI.H / sil.h) * p.k;
  const xf = { x: p.x, y: p.y, s }, xfR = { x: pr.x, y: pr.y, s };
  return {
    id: 'noomi', z: NOOMI.Z, fade: 1, emerge: 0, lod: 0, light, xf, sil,
    build: (mesh) => bodies.noomi.build(mesh, t, noomiDof, xf),
    buildRefl: (mesh) => bodies.noomi.build(mesh, t, noomiDof, xfR, true),
    project: (px, py) => bodies.noomi.project(px, py, t, noomiDof, xf),
  };
}

// her tears run below the face box that Face.render() clears, so the strips they can reach are cleared
// on every redraw: an earlier frame's tears never survive into a later one (render order independence)
function clearTearStrips(ctx) {
  const [, , , by1] = face.box;
  for (const side of ['L', 'R']) {
    const e = faceSpec.eyes[side], r = e.r, out = side === 'L' ? -1 : 1;
    const xc = e.x + out * (e.hw * 0.55 + r * 0.2);
    ctx.clearRect(xc - r * 0.9, by1, r * 1.8, e.y + r * 4.2 - by1);
  }
}
// her tears, painted on her face canvas (art px), a pure function of time
const TEARS = [{ t0: T.tearL, side: 'L', dur: 1.55 }, { t0: T.tearR, side: 'R', dur: 1.4 }];
function drawTears(ctx, t) {
  const dry = 1 - smoothstep(T.hug + 0.1, T.hug + 1.0, t);
  if (dry <= 0 || t < T.tearL - 0.4) return;
  for (const tr of TEARS) {
    const e = faceSpec.eyes[tr.side], r = e.r, out = tr.side === 'L' ? -1 : 1;
    // the eye fills first (a bright wet line along the lower lid)
    const well = smoothstep(tr.t0 - 0.45, tr.t0, t) * (1 - smoothstep(T.hug - 0.35, T.hug - 0.1, t));
    if (well > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.55 * well;
      ctx.strokeStyle = '#d8f2ff'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.12, e.hw * 0.78, r * 0.62, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      ctx.restore();
    }
    const u = clamp((t - tr.t0) / tr.dur, 0, 1);
    if (t < tr.t0) continue;
    const path = (k) => {
      const kk = ease.inQuad(k) * 0.65 + k * 0.35;      // gathers, then runs
      return [e.x + out * (e.hw * 0.55 + r * 0.35 * Math.sin(kk * 1.6)), e.y + r * 0.62 + kk * r * 2.9];
    };
    // the wet streak it leaves on her cheek
    ctx.save();
    ctx.lineCap = 'round';
    const n = 18;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * u, z = ((k + 1) / n) * u;
      const [x0, y0] = path(a), [x1, y1] = path(z);
      ctx.globalAlpha = 0.34 * dry * (0.4 + 0.6 * (k / n));
      ctx.strokeStyle = '#cdeeff'; ctx.lineWidth = r * 0.11;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    // the drop: clear and glassy, catching the light
    if (u < 1) {
      const [x, y] = path(u);
      const s = r * (0.2 + 0.1 * smoothstep(0, 0.25, u)) * (1 - 0.3 * smoothstep(0.8, 1, u));
      const g = ctx.createRadialGradient(x - s * 0.3, y - s * 0.4, s * 0.1, x, y, s * 1.3);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.35, 'rgba(190,232,255,0.75)');
      g.addColorStop(1, 'rgba(80,150,255,0.0)');
      ctx.globalAlpha = dry * (1 - smoothstep(0.85, 1, u));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 1.25, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(70,140,255,0.55)'; ctx.lineWidth = s * 0.18;
      ctx.beginPath(); ctx.ellipse(x, y, s * 0.92, s * 1.15, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.ellipse(x - s * 0.32, y - s * 0.45, s * 0.22, s * 0.3, -0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

// ----------------------------------------------------------- particles ---
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const PEARL = [[1.3, 1.15, 1.6], [1.0, 1.25, 1.6], [1.6, 1.15, 1.3], [1.5, 1.35, 1.0]];
const LANTERNS = (() => { const r = rng(777); return Array.from({ length: 56 }, () => ({ X: -900 + r() * 2900, Z: 1300 + Math.pow(r(), 1.4) * 3200, ph: r(), k: 1 + Math.floor(r() * 2), sw: r() * TAU, size: 6 + r() * 9, c: PEARL[Math.floor(r() * 4)] })); })();
function lanternParts(t, cam, amt, groups) {
  for (const l of LANTERNS) {
    const Y = -100 + (((PH(t) / TAU) * l.k * MOTION + l.ph) % 1) * 1500;
    const X = l.X + 30 * Math.sin(PH(t) * 3 + l.sw) * MOTION;
    const p = project(cam, X, Y, l.Z);
    if (p.d < 60 || p.x < -300 || p.x > 1380 || p.y < -300 || p.y > 2220) continue;
    const defocus = clamp(Math.abs(l.Z - 1000) / 900, 0, 2.2);
    const r = l.size * p.k * (1 + defocus * 1.6);
    const fadeY = smoothstep(-100, 120, Y) * (1 - smoothstep(1200, 1400, Y));
    const a = amt * fadeY * (0.5 + 0.35 * Math.sin(PH(t) * 7 + l.sw * 3)) / (1 + defocus * 1.2);
    (l.Z < 2000 ? groups.mid : groups.far).push({ x: p.x, y: p.y, r, a, c: l.c, kind: 0 });
  }
}
const BURSTS = [];
function burst(t0, at, { n = 14, seed = 1, color = [1.4, 1.2, 1.6], speed = 260, life = 1.2, size = 12, sparkles = 0, petals = 0, up = 40, z = 1000 } = {}) {
  const r = rng(seed * 7919 + 17);
  const list = [];
  for (let k = 0; k < n + sparkles + petals; k++) {
    const kind = k < n ? 0 : k < n + sparkles ? 1 : 2;
    list.push({ kind, a: r() * TAU, sp: speed * (0.35 + 0.65 * r()), life: life * (0.6 + 0.4 * r()), size: size * (kind === 1 ? 2.4 : kind === 2 ? 1.6 : 1) * (0.6 + 0.6 * r()), ph: r() * TAU, rot: r() * TAU, spin: (r() - 0.5) * 6 });
  }
  BURSTS.push({ t0, at, color, list, up, z });
}
function burstParts(t, cam, out) {
  for (const B of BURSTS) {
    const age = t - B.t0;
    if (age < 0 || age > 3) continue;
    const W = B.at(t);
    const p = project(cam, W.X, W.Y, W.Z);
    for (const q of B.list) {
      if (age > q.life) continue;
      const k = 2.2, drag = (1 - Math.exp(-k * age)) / k;
      const x = p.x + (Math.cos(q.a) * q.sp * drag + Math.sin(age * 3 + q.ph) * 6) * p.k;
      const y = p.y + (Math.sin(q.a) * q.sp * drag * 0.8 - B.up * age) * p.k;
      const a = smoothstep(0, 0.08, age) * (1 - smoothstep(q.life * 0.45, q.life, age));
      out.push({ x, y, r: q.size * p.k * (q.kind === 1 ? 0.7 + 0.3 * Math.sin(age * 9 + q.ph) : 1), a: a * (q.kind === 2 ? 0.8 : 0.9), c: q.kind === 2 ? B.color.map((v) => v * 0.9) : mix3(B.color, [1.6, 1.5, 1.6], q.kind === 1 ? 0.6 : 0.25), kind: q.kind, rot: q.rot + q.spin * age, aspect: q.kind === 2 ? 0.55 : 1, z: W.Z - 1 });
    }
  }
}

// --------------------------------------------------------------- set-up ---
let hook, hookEnd, whatever, forThat, talk, feel, meet, logo, think, tag;

async function setup(stage) {
  MOTION = stage.motion === 'reduced' ? 0.35 : 1;
  TRAVEL = stage.motion === 'reduced' ? 0.3 : 1;
  const R = stage.renderer;
  const url = (rel) => new URL(rel, import.meta.url).href;
  const [nClean, nNormal, nJson, nPristine] = await Promise.all([
    loadImage(url('../assets/noomi/noomi-clean.png')), loadImage(url('../assets/noomi/noomi-normal.png')),
    fetch(url('../assets/noomi/noomi-face.json')).then((r) => r.json()), loadImage(url('../assets/noomi/noomi-art.png')),
  ]);
  sils.noomi = silhouette(nPristine);
  faceSpec = specFromDerived(nJson, MALLOWS.noomi.face);
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = nPristine.width; faceCanvas.height = nPristine.height;
  face = new Face(faceSpec, faceCanvas);
  R.addMallow('noomi', { artImg: nClean, faceCanvas, normalImg: nNormal, sil: sils.noomi, cols: 96, rows: 96 });
  bodies.noomi = new SoftBody({ w: nPristine.width, h: nPristine.height }, sils.noomi, { lag: 0.062, cols: 96, rows: 96 });

  // the six companions: the app rig's living faces, painted from the hi-res art
  await Promise.all(CAST.map(async (c, i) => {
    const L = await new LivingMallow(c.id, { q: 2.5, hires: true }).load();
    living[c.id] = L;
    setCompanionActing(i, L);
    const snap = document.createElement('canvas');
    snap.width = L.skin.width; snap.height = L.skin.height;
    snap.getContext('2d').drawImage(L.rig.assets.original, 0, 0, snap.width, snap.height);
    sils[c.id] = silhouette(snap);
    R.addMallow(c.id, { artImg: L.skin, sil: sils[c.id], cols: 64, rows: 64 });
    bodies[c.id] = new SoftBody({ w: L.skin.width, h: L.skin.height }, sils[c.id], { lag: 0.07, cols: 64, rows: 64 });
  }));
  buildNoomi();
  CAST.forEach((c, i) => { MDOF[c.id] = companionDof(i); });
  buildEvents();

  const Y0 = 236;
  hook = new TextBlock({ lines: ['Feeling something?'], y: Y0, size: 92, weight: 600, enterAt: -10, exitAt: 2.2, exitDur: 0.45 });
  hookEnd = new TextBlock({ lines: ['Feeling something?'], y: Y0, size: 92, weight: 600, enterAt: T.hookIn, inDur: 0.5, stagger: 0, rise: 0 });
  whatever = new TextBlock({ lines: ['Whatever it is...'], y: Y0, size: 88, weight: 600, enterAt: 2.75, exitAt: 4.75, exitDur: 0.45 });
  forThat = new TextBlock({ lines: ['There’s a Mallow', 'for that.'], y: Y0 - 30, size: 88, weight: 600, enterAt: 5.15, stagger: 0.25, exitAt: 6.12, exitDur: 0.35 });
  talk = new TextBlock({ lines: ['Talk it out.'], y: Y0, size: 92, weight: 600, enterAt: T.talk - 0.05, exitAt: 7.95, exitDur: 0.45 });
  feel = new TextBlock({ lines: ['Feel what you feel.'], y: Y0 - 40, size: 88, weight: 600, enterAt: T.feel, exitAt: 12.2, exitDur: 0.45 });
  meet = new TextBlock({ lines: ['Meet your Mallows.'], y: Y0 - 40, size: 88, weight: 600, enterAt: T.meet, exitAt: 14.55, exitDur: 0.4 });
  logo = new LogoCard({ y: 300, logoW: 450, url: '', urlSize: 1, gap: 0, enterAt: T.logo, exitAt: 19.0, exitDur: 0.4 });
  await logo.load();
  think = new TextBlock({ lines: ['THINK EMOTION.', 'THINK HUSHMALLOW.'], y: 520, size: 84, weight: 700, tracking: 2, lineHeight: 1.14, enterAt: T.logo + 0.25, stagger: 0.32, exitAt: 19.0, exitDur: 0.4 });
  tag = new TextBlock({ lines: ['Feel something? Hushmallow.'], y: 1690, size: 60, weight: 500, enterAt: T.tag, exitAt: 19.0, exitDur: 0.4 });

  const c = (t, type, d = {}) => stage.cue(t, type, d);
  const panX = (X) => clamp((X - 540) / 520, -0.85, 0.85);
  c(0, 'scene', { loop: D, bpm: 96 });
  c(T.notice, 'glance', { pan: -0.5 }); c(T.ask, 'curious'); c(T.lean, 'lean_in');
  c(b(2), 'orb_pulse'); c(b(3), 'orb_pulse');
  c(T.take, 'touch', { pan: -0.4 }); c(T.melt, 'melt', { pan: -0.2 });
  c(T.tearL, 'tear', { side: 'L', pan: -0.2 }); c(T.tearR, 'tear', { side: 'R', pan: 0.2 });
  c(T.down, 'look_down'); c(T.up, 'look_up');
  c(T.blubiJump, 'hop', { mallow: 'blubi', pan: -0.8 }); c(T.blubiLand, 'land', { mallow: 'blubi', pan: -0.5 });
  c(T.empathy, 'empathy', { mallow: 'blubi', pan: -0.5 }); c(T.hug, 'hug', { pan: -0.2 });
  c(T.talk, 'talk', { mallow: 'blubi', dur: T.talkEnd - T.talk, pan: -0.4 });
  c(T.loomiFloat, 'float', { mallow: 'loomi', pan: 0.6 }); c(T.loomiLand, 'land', { mallow: 'loomi', pan: 0.55 });
  c(T.breathIn, 'breath_in', { dur: T.breathOut - T.breathIn }); c(T.breathOut, 'breath_out', { dur: T.breathEnd - T.breathOut });
  for (const [id, land] of Object.entries(ARRIVE)) {
    const i = IDX[id], P = lightPath(i, land - 1.35), S = mallowWorld(i, land);
    c(land - 1.35, 'rise', { mallow: id, kind: CAST[i].kind, pan: panX(P.X) });
    c(land - 0.4, 'emerge', { mallow: id, kind: CAST[i].kind, pan: panX(S.X) });
    c(land, 'land_on', { mallow: id, on: CAST[i].seat.on, pan: panX(S.X) });
  }
  c(ARRIVE.pipzi + 0.3, 'sparks', { mallow: 'pipzi', pan: -0.2 });
  c(ARRIVE.glitzi + 0.45, 'wink_glitzi', { mallow: 'glitzi', pan: -0.55 });
  c(ARRIVE.zuzu + 0.35, 'spiral_slow', { mallow: 'zuzu', pan: 0.55 });
  c(T.drop, 'drop'); c(T.drop + 0.05, 'sunburst', { mallow: 'boppo', pan: 0.2 });
  JOY_BEATS.forEach((bt, k) => c(bt, 'bounce', { k }));
  c(T.settle, 'settle'); c(T.meet, 'line', { n: 2 });
  c(T.blink, 'blink_together', { dur: 0.84 });
  c(T.gift, 'gift'); c(T.giftLand, 'gift_land');
  c(T.logo, 'logo');
  c(T.wink, 'wink');
  Object.entries(HELLO).forEach(([id, dt], k) => c(T.wink + 0.15 + dt, 'hello', { k, mallow: id }));
  CAST.forEach((m, i) => c(RET[i], 'return', { i, mallow: m.id }));
  c(19.55, 'merge'); c(T.hookIn, 'hook_in');
}

// ---------------------------------------------------------------- acting ---
function setCompanionActing(i, L) {
  const c = CAST[i], id = c.id;
  const K = [];
  const key = (t, mood, k = 0.8, dur = 0.35, set) => K.push({ t, mood, k, dur, set });
  const BL = T.blink;
  if (id === 'blubi') {
    key(0, 'curious', 0.7);
    key(T.blubiLand - 0.05, 'surprised', 0.75, 0.15);
    key(T.empathy, 'sad', 0.95, 0.4, { tears: 0.8, wet: 0.9 });                // it feels it with her
    key(T.hug - 0.1, 'loved', 0.9, 0.3, { eyeOpen: 0.04, closedCurve: -1 });     // and snuggles in
    key(T.talk, 'comforted', 0.85, 0.3);
    key(ARRIVE.glitzi, 'surprised', 0.7, 0.12);
    key(ARRIVE.glitzi + 0.35, 'happy', 0.85, 0.3);
  } else if (id === 'loomi') {
    key(0, 'anxious', 0.9);
    key(T.breathIn - 0.1, 'calm', 0.95, 0.45, { eyeOpen: 0.04, closedCurve: 1 });
    key(T.breathEnd - 0.2, 'relieved', 0.75, 0.4);
    key(ARRIVE.zuzu, 'surprised', 0.7, 0.12);
    key(ARRIVE.zuzu + 0.3, 'happy', 0.8, 0.3);
  } else if (id === 'pipzi') {
    key(0, 'angry', 0.95);
    key(ARRIVE.pipzi + 0.28, 'excited', 0.95, 0.15);                           // the anger, released as fireworks
    key(ARRIVE.pipzi + 1.0, 'happy', 0.8, 0.4);
  } else if (id === 'glitzi') {
    key(0, 'lonely', 0.9);
    key(ARRIVE.glitzi + 0.35, 'playful', 0.85, 0.3);                            // welcomed — a wink
    key(ARRIVE.glitzi + 0.45, 'playful', 0.85, 0.12, { wink: 1 });
    key(ARRIVE.glitzi + 0.85, 'playful', 0.85, 0.2);
  } else if (id === 'zuzu') {
    key(0, 'confused', 1.0);
    key(ARRIVE.zuzu + 0.35, 'awe', 0.9, 0.8);                                   // the racing spirals slow to wonder
  } else if (id === 'boppo') {
    key(0, 'excited', 0.95);
    key(ARRIVE.boppo + 0.05, 'happy', 0.95, 0.15);
  }
  // joy, then belonging: everyone faces us, one slow blink together, a fond look at your light
  key(T.drop + 0.05, id === 'boppo' || id === 'pipzi' ? 'excited' : 'happy', 0.9, 0.25);
  key(T.settle, { blubi: 'loved', loomi: 'happy', pipzi: 'happy', glitzi: 'loved', zuzu: 'happy', boppo: 'happy' }[id], 0.8, 0.5);
  key(T.gift + 0.25, 'loved', 0.85, 0.4);
  key(T.logo, 'happy', 0.85, 0.4);
  key(T.wink + 0.1 + HELLO[id], 'excited', 0.6, 0.15);
  key(T.wink + 0.7 + HELLO[id], 'happy', 0.85, 0.3);
  L.setExpressions(K);
  const arrive = id === 'blubi' ? T.blubiLand : id === 'loomi' ? T.loomiLand : ARRIVE[id];
  L.blinks = naturalBlinks(31 + i * 17, D, { every: 2.8, avoid: [[0, arrive + 0.6], [T.hug - 0.2, T.talk], [T.breathIn - 0.2, T.breathEnd], [BL - 0.6, BL + 1.2]] });
  L.blinks.add(BL, { close: 0.24, hold: 0.32, open: 0.34 });
  // Blubi talks it out
  if (id === 'blubi') L.mod = (t, P) => {
    const w = bump(t, T.talk, T.talk + 0.1, T.talkEnd - 0.2, T.talkEnd);
    if (w > 0) { P.mouthOpen += w * 0.32 * Math.max(0, Math.sin(TAU * 4.6 * (t - T.talk))) * (0.6 + 0.4 * Math.sin(TAU * 1.3 * t)); P.mouthRound += 0.3 * w; }
  };
  // where they look: at Noomi, at whoever arrives, at us, at your light
  L.look = (t) => {
    const W = mallowWorld(i, t);
    const toward = (X, Y, Z, w) => [clamp((X - W.X) / 380, -0.95, 0.95), clamp(-(Y - (W.Y + 160)) / 420, -0.9, 0.6), w];
    if (id === 'blubi' && t < T.talkEnd + 0.3) return toward(NOOMI.X, 260, NOOMI.Z, bump(t, T.blubiLand + 0.1, T.blubiLand + 0.3, T.talkEnd, T.talkEnd + 0.3));
    if (id === 'loomi' && t > T.breathEnd - 0.2 && t < T.drop) return toward(NOOMI.X, 260, NOOMI.Z, bump(t, T.breathEnd - 0.2, T.breathEnd, 9.3, 9.6));
    const gift = bump(t, T.gift + 0.2, T.gift + 0.45, T.giftLand + 0.3, T.giftLand + 0.6);
    if (gift > 0.001) return toward(GIFT.X, GIFT.Y, GIFT.Z, gift);
    return [0, 0, 0.9 * smoothstep(T.settle - 0.1, T.settle + 0.25, t) * (1 - smoothstep(RET[i] - 0.1, RET[i], t))];
  };
  if (id === 'zuzu') L.buildSpin(D);
}

function buildNoomi() {
  nb.squash = new Track(0, { f: 2.4, z: 0.8 })
    .to(T.take - 0.1, 0.05, { f: 4 }).to(T.melt, -0.06, { f: 4 }).to(T.melt + 0.3, 0)
    .to(T.down, 0.05, { f: 1.6 }).to(T.up, 0)
    .to(T.hug, 0.06, { f: 2 }).to(T.hug + 0.6, 0.02)
    .to(T.drop + 0.6, 0);
  nb.kicks = new Impulses().kick(T.blubiLand, 0.03, 3, 0.35).kick(T.loomiLand, 0.025, 3, 0.35);
  for (const id of ['pipzi', 'boppo']) nb.kicks.kick(ARRIVE[id], 0.16, 2.8, 0.3);
  JOY_BEATS.forEach((bt) => nb.kicks.kick(bt, 0.1, 3.0, 0.32));
  nb.kicks.kick(T.wink + 0.24 + 0.32, 0.06, 3, 0.3);
  nb.inflate = new Track(0, { f: 2, z: 0.85 })
    .to(T.melt, 0.06, { f: 2.5, z: 0.7 }).to(T.melt + 0.5, 0.0)
    .to(T.down, -0.03, { f: 1.2 }).to(T.up, 0, { f: 1.5 })
    .to(T.hug, 0.04).to(T.hug + 0.8, 0);
  nb.lean = new Track(0, { f: 1.8, z: 0.8 })
    .to(T.notice, -0.02).to(T.ask, 0.03, { f: 1.4 })            // a curious tilt
    .to(T.take - 0.25, -0.06, { f: 2.2 }).to(T.melt + 0.2, -0.01)  // reaches for the light
    .to(T.blubiLand + 0.15, -0.025).to(T.hug - 0.1, -0.075, { f: 2.2, z: 0.6 })   // into the hug
    .to(T.talkEnd, -0.03).to(T.loomiLand + 0.1, 0.02).to(T.breathEnd, 0)
    .to(T.settle, 0).to(T.gift + 0.4, 0.02).to(T.logo, 0);
  nb.nod = (t) => -0.025 * Math.max(0, Math.sin(TAU * 1.6 * (t - T.talk))) * bump(t, T.talk + 0.1, T.talk + 0.3, T.talkEnd - 0.3, T.talkEnd);
  nb.sway = new Impulses().kick(T.melt, 0.04, 2.6, 0.3).kick(T.drop, 0.05, 2.4, 0.3);
  nb.lift = new Track(0, { f: 1.6, z: 0.9 });
  nb.hop = new Hops().add(T.wink + 0.24, T.wink + 0.56, 60);
  nb.tremble = (t) => bump(t, T.tearL - 0.3, T.tearL, T.up + 0.2, T.blubiLand);
  nb.giggle = (t) => 0.08 * Math.max(0, Math.sin(TAU * 5.5 * t)) * (bump(t, ARRIVE.pipzi + 0.05, ARRIVE.pipzi + 0.15, ARRIVE.pipzi + 0.5, ARRIVE.pipzi + 0.7) + bump(t, T.drop + 0.1, T.drop + 0.2, T.drop + 1.6, T.drop + 1.9));
  nb.shimmer = (t) => {
    let s = 0;
    for (const [t0, a] of [[T.melt, 0.6], [ARRIVE.pipzi, 0.7], [T.drop, 0.9], [JOY_BEATS[2], 0.4]]) if (t > t0) s = Math.max(s, a * Math.exp(-(t - t0) * 3));
    return s;
  };

  const F = (v0, o) => new Track(v0, o || { f: 3.2, z: 0.85 });
  nf.eyeOpen = F(1.06); nf.curve = F(-1, { f: 6, z: 1 }); nf.lidTop = F(0); nf.lidBot = F(0.1); nf.iris = F(1.08); nf.stretch = F(1);
  nf.lookX = F(0, { f: 4.5, z: 0.8 }); nf.lookY = F(0, { f: 4.5, z: 0.8 }); nf.sparkle = F(0.85, { f: 1.5, z: 1 });
  nf.browA = F(0.4); nf.browY = F(0.42); nf.browT = F(0.25);
  nf.smile = F(0.4); nf.mOpen = F(0.04); nf.mRound = F(0.15); nf.mWave = F(0); nf.mWidth = F(0.9); nf.blush = F(0.42, { f: 1.2, z: 1 });
  nf.wink = F(0, { f: 6, z: 0.85 });
  nf.blinks = new Blinks().add(1.75).add(5.85).add(12.95).add(T.blink, { close: 0.24, hold: 0.32, open: 0.34 }).add(16.6);
  const look = (t, x, y, o) => { nf.lookX.to(t, x, o); nf.lookY.to(t, y, o); };
  const set = (t, kv, o) => { for (const [k, v] of Object.entries(kv)) nf[k].to(t, v, o); };
  // CURIOSITY: on us; a glance at the light by the lens; a curious little "hm?"; leaning in
  look(T.notice, -0.7, 0.05); look(T.ask - 0.1, 0, 0);
  set(T.ask, { browA: 0.65, browY: 0.68, browT: 0.32, mRound: 0.42, mOpen: 0.1, smile: 0.25, eyeOpen: 1.12, iris: 1.14 });
  set(T.lean, { sparkle: 1, smile: 0.5, mOpen: 0.06, mRound: 0.25 });
  look(b(3) - 0.1, -0.75, 0.1);
  set(T.take - 0.1, { eyeOpen: 1.16, mRound: 0.5, mOpen: 0.16, browY: 0.75 });
  // VULNERABILITY: it melts into her: eyes close as she feels it…
  set(T.melt - 0.05, { eyeOpen: 0, curve: 1, smile: 0.0, mOpen: 0, mRound: 0, browT: 0.6, browY: 0.3 }, { f: 3.5, z: 0.9 });
  // …open, full: sad brows, wet, a trembling lip
  set(T.tearL - 0.45, { eyeOpen: 0.95, curve: -1, lidTop: 0.16, lidBot: 0.18, iris: 1.12, sparkle: 1.2, browA: 0.9, browT: 1.0, browY: 0.22, smile: -0.55, mWave: 0.7, mWidth: 0.78, blush: 0.6 }, { f: 2.2, z: 0.9 });
  look(T.tearL - 0.45, 0, 0);
  look(T.down, 0.1, 0.62, { f: 2, z: 0.9 });
  set(T.down, { lidTop: 0.32, mWave: 0.45 });
  // …and up at us: it's okay to feel it
  look(T.up, 0, -0.05, { f: 2.2, z: 0.9 });
  set(T.up, { lidTop: 0.08, iris: 1.18, eyeOpen: 1.04, smile: -0.25, mWave: 0.35 });
  // CONNECTION: Blubi arrives — surprise, then a wobbly smile; the hug; listening; nodding
  look(T.blubiLand + 0.05, -0.75, 0.15, { f: 5 });
  set(T.blubiLand + 0.05, { eyeOpen: 1.16, browY: 0.62, browT: 0.45, smile: -0.05, mWave: 0.2, mRound: 0.3, mOpen: 0.08 });
  set(T.empathy + 0.25, { smile: 0.35, mWave: 0.28, mRound: 0, mOpen: 0.02, lidBot: 0.28 });
  set(T.hug - 0.05, { eyeOpen: 0, curve: -1, smile: 1.05, mOpen: 0.08, mWave: 0, browT: 0.3, browY: 0.35, browA: 0.4, blush: 1.0, lidTop: 0, sparkle: 0.9 }, { f: 3, z: 0.9 });
  set(T.talk + 0.05, { eyeOpen: 0.98, lidBot: 0.3, smile: 0.95, mOpen: 0.05 });
  look(T.talk + 0.05, -0.7, 0.25);
  // Loomi drifts in: a look; the shared breath with closed eyes
  look(T.loomiLand - 0.2, 0.7, 0.05);
  set(T.breathIn - 0.05, { eyeOpen: 0, curve: 1, smile: 0.6, mOpen: 0, mRound: 0.15 }, { f: 2.2, z: 0.95 });
  // WONDER: Pipzi lands on her head — a giggle — and she looks up at each arrival in awe
  set(ARRIVE.pipzi - 0.05, { eyeOpen: 0, curve: -1, smile: 1.15, mOpen: 0.45, blush: 1.0 }, { f: 7, z: 0.85 });
  set(ARRIVE.pipzi + 0.5, { eyeOpen: 1.14, curve: -1, iris: 1.14, sparkle: 1.25, smile: 0.8, mOpen: 0.28, mRound: 0.4, browY: 0.7, browT: 0.3, browA: 0.5 });
  look(ARRIVE.pipzi + 0.45, -0.35, -0.85);
  look(ARRIVE.glitzi + 0.05, -0.75, -0.55);
  look(ARRIVE.zuzu + 0.05, 0.75, -0.55);
  look(ARRIVE.boppo - 0.3, 0.35, -0.85);
  // JOY: Boppo lands on the drop — laughing with the bounce
  set(T.drop - 0.04, { eyeOpen: 0, curve: -1, smile: 1.25, mOpen: 0.6, mRound: 0, blush: 1.1, browY: 0.5 }, { f: 7, z: 0.85 });
  set(JOY_BEATS[1] - 0.05, { eyeOpen: 1.1, iris: 1.12, sparkle: 1.3, smile: 1.15, mOpen: 0.45 }, { f: 6, z: 0.85 });
  look(JOY_BEATS[1] - 0.05, 0, 0);
  set(JOY_BEATS[2] - 0.05, { eyeOpen: 0, curve: -1, smile: 1.25, mOpen: 0.55 }, { f: 7, z: 0.85 });
  // BELONGING: content, eyes on us; the slow blink together; a fond look at your light
  set(T.settle, { eyeOpen: 1.0, curve: -1, lidBot: 0.26, iris: 1.1, sparkle: 1.05, smile: 1.0, mOpen: 0.06, mRound: 0, blush: 0.85, browA: 0.32, browT: 0.35, browY: 0.32 }, { f: 2.4, z: 0.9 });
  look(T.settle, 0, 0);
  look(T.gift + 0.3, 0, 0.75, { f: 2.4, z: 0.9 });
  set(T.gift + 0.3, { lidTop: 0.12, smile: 1.1 });
  look(T.giftLand + 0.45, 0, 0, { f: 2.4, z: 0.9 });
  set(T.giftLand + 0.45, { lidTop: 0 });
  // BRAND: smiling at us; the wink
  set(T.logo, { eyeOpen: 1.04, smile: 1.0, mOpen: 0.1, lidBot: 0.2 });
  nf.wink.to(T.wink, 1).to(T.wink + 0.32, 0);
  set(T.wink, { smile: 1.15, mOpen: 0.18 }); set(T.wink + 0.45, { smile: 1.0, mOpen: 0.08 });
  // home: the opening face again (every track returns to its first value)
  set(T.home, { eyeOpen: 1.06, curve: -1, lidTop: 0, lidBot: 0.1, iris: 1.08, stretch: 1, sparkle: 0.85, browA: 0.4, browY: 0.42, browT: 0.25, smile: 0.4, mOpen: 0.04, mRound: 0.15, mWave: 0, mWidth: 0.9, blush: 0.42 });
  look(T.home, 0, 0);
}

function buildEvents() {
  addRipple(T.melt, NOOMI.X - 150, NOOMI.Z - 40, 0.35);
  addRipple(T.blubiLand, CAST[0].seat.X, CAST[0].seat.Z, 0.8);
  addRipple(T.loomiLand, CAST[1].seat.X, CAST[1].seat.Z, 0.5);
  for (const [id, land] of Object.entries(ARRIVE)) { const [X, Z] = RISE[id]; addRipple(land - 1.35, X, Z, 0.9); }
  JOY_BEATS.forEach((bt) => addRipple(bt, NOOMI.X, NOOMI.Z, 0.45));
  addRipple(T.drop, NOOMI.X, NOOMI.Z, 0.9);
  addRipple(T.giftLand, GIFT.X, GIFT.Z, 0.5);
  const at = (id, dy, dz = -3) => (t) => { const i = IDX[id], W = mallowWorld(i, t); return { X: W.X, Y: W.Y + COMPANION_H * dy, Z: W.Z + dz }; };
  // the light melting into Noomi
  burst(T.melt - 0.05, () => ({ X: NOOMI.X - 150, Y: 205, Z: NOOMI.Z - 42 }), { n: 10, sparkles: 4, seed: 3, color: [1.4, 1.3, 1.7], speed: 120, life: 1.0, size: 5, up: 10 });
  burst(T.blubiLand, at('blubi', 0.05), { n: 10, seed: 7, color: [0.8, 1.0, 1.7], speed: 200, life: 0.8, size: 5, up: 30 });
  // the hug: a few warm hearts of light between them
  burst(T.hug + 0.1, () => ({ X: 400, Y: 330, Z: 955 }), { n: 6, sparkles: 4, seed: 120, color: [1.8, 0.9, 1.3], speed: 70, life: 1.4, size: 6, up: 60 });
  burst(T.breathOut, at('loomi', 0.5), { n: 16, seed: 53, color: [0.95, 0.8, 1.6], speed: 220, life: 1.5, size: 6, up: 10 });
  CAST.forEach((c, i) => {
    const land = ARRIVE[c.id];
    if (land) {
      burst(land - 0.4, () => { const W = mallowWorld(i, land - 0.4); return { X: W.X, Y: W.Y + COMPANION_H * 0.5, Z: W.Z - 3 }; }, { n: 14, sparkles: 6, petals: c.kind === 5 || c.kind === 2 ? 8 : 3, seed: 31 + i, color: c.color, speed: 280, life: 1.1, size: 7, up: 30 });
      burst(land - 1.35, () => ({ X: RISE[c.id][0], Y: 10, Z: RISE[c.id][1] }), { n: 10, seed: 41 + i, color: c.color, speed: 160, life: 0.9, size: 6, up: 50 });
    }
    burst(RET[i] + 0.05, () => mallowWorld(i, RET[i]), { n: 8, sparkles: 3, seed: 61 + i, color: c.color, speed: 150, life: 0.8, size: 6, up: 20 });
  });
  burst(ARRIVE.pipzi + 0.3, at('pipzi', 0.75), { n: 8, sparkles: 16, seed: 51, color: [2.0, 0.9, 0.3], speed: 440, life: 1.1, size: 7, up: 30 });         // anger → fireworks
  burst(ARRIVE.glitzi + 0.45, at('glitzi', 0.85), { n: 0, sparkles: 7, seed: 54, color: [1.6, 1.5, 1.2], speed: 110, life: 1.3, size: 8, up: 25 });   // the wink twinkles
  burst(ARRIVE.zuzu + 0.4, at('zuzu', 0.6), { n: 14, sparkles: 3, seed: 55, color: [1.2, 0.8, 1.8], speed: 170, life: 1.3, size: 6, up: 15 });
  burst(T.drop + 0.04, at('boppo', 0.6), { n: 18, sparkles: 10, petals: 18, seed: 56, color: [2.0, 1.4, 0.4], speed: 520, life: 1.8, size: 8, up: 30 });  // the sunburst: joy
  JOY_BEATS.forEach((bt, k) => burst(bt, () => ({ X: NOOMI.X, Y: 650, Z: NOOMI.Z - 10 }), { n: 0, sparkles: 4, petals: 8, seed: 70 + k, color: k === 1 ? [1.8, 0.9, 1.3] : [1.9, 1.35, 0.6], speed: 360, life: 1.4, size: 7, up: 10 }));
  burst(T.giftLand, () => ({ X: GIFT.X, Y: GIFT.Y, Z: GIFT.Z - 2 }), { n: 8, sparkles: 5, seed: 90, color: [1.5, 1.3, 1.7], speed: 110, life: 1.1, size: 6, up: 30 });
  burst(T.wink + 0.05, () => ({ X: NOOMI.X + 120, Y: 300, Z: NOOMI.Z - 5 }), { n: 0, sparkles: 3, seed: 95, color: [1.7, 1.5, 1.3], speed: 60, life: 0.8, size: 7, up: 40 });
}

// ----------------------------------------------------------------- state ---
function state(t, { center = false, dry = false } = {}) {
  const cam = camAt(t);
  const pal = palette(t), n = pal.n;
  const bl = blueAt(t), nn = nightAt(t), dd = dawnAt(t);
  const moon = [800, cam.horizon - lerp(lerp(470, 560, nn), 330, dd), 48];
  const light = {
    dir: [0.45, 0.6, 0.7], key: mix3(mix3(mix3([1.0, 0.97, 1.03], [0.86, 0.9, 1.1], bl), [0.92, 0.95, 1.08], nn), [1.07, 0.98, 0.92], dd),
    rim: mix3(mix3(pal.cloudLit, PAL.night.aurA, nn * 0.6), pal.glow, dd * 0.6), rimAmt: 0.5, spec: 0.5,
    specCol: [0.95, 0.95, 1.05], glowCol: [1.0, 0.8, 0.6], glow: 0, ambient: pal.mid,
  };
  const nGlow = 0.1 * bump(t, T.melt - 0.1, T.melt + 0.1, T.melt + 0.4, T.melt + 1.2) + 0.06 * bump(t, T.hug, T.hug + 0.3, T.talkEnd, T.talkEnd + 0.6) + 0.04 * dd;
  const mallows = [noomiItem(t, cam, { ...light, glow: nGlow })];
  CAST.forEach((_, i) => { const m = companionItem(i, t, cam, light, pal); if (m) mallows.push(m); });
  const orbs = [];
  const g = t < 0.02 || t > 19.97 ? hookOrbAt0(t, cam) : giftOrb(t, cam);
  if (g) orbs.push(g);
  CAST.forEach((_, i) => { const o = arrivalOrb(i, t, cam); if (o) orbs.push(o); const r = returnOrb(i, t, cam); if (r) orbs.push(r); });
  // the light an orb spills on Noomi
  let spill = [0, 0, 0, 0], side = 0;
  for (const o of orbs) {
    const dx = o.X - NOOMI.X, dz = o.Z - NOOMI.Z, dist = Math.hypot(dx, o.Y - 260, dz);
    const w = clamp(1 - dist / 700, 0, 1) * o.alpha * (0.4 + o.glow + o.flash);
    if (w * 0.3 > spill[3]) { spill = [...o.color.map((v) => v * 0.55), w * 0.3]; side = Math.sign(dx); }
  }
  mallows[0].spill = spill; mallows[0].spillSide = side;

  const groups = { mid: [], far: [] }, fx = [];
  lanternParts(t, cam, (0.45 + 0.4 * nn + 0.15 * dd) * (1 - 0.6 * bl), groups);
  burstParts(t, cam, fx);
  const parts = [{ z: 2600, list: groups.far }, { z: 1600, list: groups.mid }];
  const byZ = new Map();
  for (const p of fx) { const zk = Math.round(p.z / 100) * 100 - 1; if (!byZ.has(zk)) byZ.set(zk, []); byZ.get(zk).push(p); }
  for (const [zk, list] of byZ) parts.push({ z: zk, list });

  const S = { t, ph: PH(t), cam, mallows, orbs, parts };
  if (!center) return S;
  const rip = new Float32Array(32);
  RIPPLES.filter((r) => t > r.t && t - r.t < 4).slice(-8).forEach((r, k) => rip.set([r.X, r.Z, t - r.t, r.amp * MOTION], k * 4));
  const wonder = bump(t, 7.6, 8.4, 9.8, 10.6);
  S.world = {
    sky: {
      uZenith: pal.zenith, uMid: pal.mid, uLow: pal.low, uGlow: pal.glow, uMoon: moon, uMoonCol: pal.moon, uMoonGlow: n.moonGlow,
      uAurora: n.aurora * (1 + 0.5 * wonder), uAurA: pal.aurA, uAurB: pal.aurB, uAurC: pal.aurC,
      uCloud: n.cloud, uCloudLit: pal.cloudLit, uCloudDark: pal.cloudDark, uRays: n.rays * (1 + 0.6 * bump(t, T.drop - 0.1, T.drop + 0.3, T.drop + 1.2, T.drop + 2.6)),
      uStars: n.stars, uHills: n.hills, uHillNear: pal.hillNear, uHillFar: pal.hillFar, uFeel: [0.45, 0.6, 1.4], uFeelAmt: 0.25 * bl,
    },
    lake: {
      uWaterNear: pal.waterNear, uWaterFar: pal.waterFar, uMoonCol: pal.moon, uMistCol: pal.mist, uGlow: pal.glow, uMoon: moon,
      uMist: n.mist, uReflAmt: 0.9, uSwell: 0.6 * (0.5 + 0.5 * MOTION), uRip: rip,
    },
  };
  // depth of field: the world softens behind the faces in the close shots
  const dof = spline([[0, 0.62], [2.4, 0.62], [3.4, 0.82], [4.8, 0.82], [5.6, 0.55], [7.2, 0.45], [8.3, 0.12], [9.8, 0.12], [10.7, 0.2], [12.4, 0.25], [13.2, 0.55], [14.9, 0.55], [15.7, 0.3], [18.7, 0.3], [19.9, 0.62], [20, 0.62]], t);
  S.post = {
    exposure: 1.0 - 0.1 * bl, bloom: 0.2, bloomThresh: 0.78, contrast: 1.04, sat: 1.05 - 0.12 * bl,
    shadowTint: mix3(mix3([0.95, 0.96, 1.07], [0.92, 0.95, 1.1], bl), [0.98, 0.95, 1.04], dd), highTint: mix3([1.01, 1.0, 1.0], [1.04, 1.0, 0.96], dd),
    vignette: 0.3 + 0.12 * bl, grain: 0.016, time: t, bgDof: dof,
  };
  if (!dry) {
    S.prepare = (R) => {
      // Face.render() clears its region first: the face (and her tears) are functions of t alone
      const P = { ...NEUTRAL, ...faceAt(t) };
      const tearOn = t > T.tearL - 0.5 && t < T.hug + 1.05;
      const key = JSON.stringify(P, (k, v) => (typeof v === 'number' ? Math.round(v * 2000) / 2000 : v)) + (tearOn ? t.toFixed(4) : '');
      if (key !== faceKey) { faceKey = key; face.render(P); clearTearStrips(face.ctx); if (tearOn) drawTears(face.ctx, t); R.updateFace('noomi'); }
      for (const m of mallows) if (m.id !== 'noomi' && living[m.id].draw(t)) R.updateArt(m.id);
    };
  }
  S.audio = { blue: +bl.toFixed(3), night: +nn.toFixed(3), dawn: +dd.toFixed(3), wonder: +wonder.toFixed(3), camZ: +cam.z.toFixed(1), breath: +breathShape(t).toFixed(4) };
  return S;
}

function subframes(t) {
  const sh = meta.shutter / meta.fps / 2;
  const a = state(t - sh), c = state(t + sh);
  let d = 0;
  const ca = a.cam, cc = c.cam;
  // a cut (reduced motion) is not motion
  if (Math.abs(ca.z - cc.z) > 120) return 2;
  d = Math.max(d, Math.abs(ca.z - cc.z) * 0.9, Math.abs(ca.h - cc.h) * 1.6, Math.abs(ca.horizon - cc.horizon), Math.abs(ca.x - cc.x) * 1.6);
  for (const oa of a.orbs) { const oc = c.orbs.find((o) => o.kind === oa.kind && o.seed === oa.seed); if (oc) d = Math.max(d, Math.hypot(oa.x - oc.x, oa.y - oc.y) + Math.abs(oa.r - oc.r)); }
  for (const ma of a.mallows) {
    const mc = c.mallows.find((m) => m.id === ma.id);
    if (!mc) continue;
    const s = ma.sil || sils.noomi;
    const pa = ma.project(s.cx, s.top), pc = mc.project(s.cx, s.top);
    const qa = ma.project(s.x0, s.baseY), qc = mc.project(s.x0, s.baseY);
    d = Math.max(d, Math.hypot(pa.x - pc.x, pa.y - pc.y), Math.hypot(qa.x - qc.x, qa.y - qc.y));
  }
  return Math.max(2, Math.min(10, Math.ceil(d / 2.5)));
}

// --------------------------------------------------------------- overlay ---
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
