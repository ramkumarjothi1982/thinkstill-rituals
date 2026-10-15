// "FEEL SOMETHING?" v2 — the Hushmallow Cinematic Emotion Engine, improvement pass.
// 20 s · 1080 × 1920 · 30 fps · 96 BPM (one bar = 2.5 s, the loop = 8 bars) · loops seamlessly.
//
// A projected, layered world (dream2/): a mirror lake under aurora, clouds, light
// shafts, pearl hills, mist and lanterns at every depth; the camera moves through
// it. All seven Mallows act: Noomi with her hi-res procedural face, the six
// companions through the app's own approved rig (their real faces, expressions
// filtered by their personalities).
//
//   bar 1  0.0   HOOK        close on Noomi, eyes on us, one glowing feeling floating by the lens.
//                            "Feeling something?" — she glances at it, tilts, it pulses with the beat…
//   bar 2  2.5   SPLIT       …she boops it: it splits into six feelings, the camera pulls back to
//                            reveal the lake world. "Whatever it is..."
//          3.1   UNIVERSE    on six beats each feeling lights up and drops a bead of light into the
//                            lake (a ripple, a tint in the sky); Noomi feels each one
//   bar 4  7.5   HUM         Noomi closes her eyes and hums: a ring of light crosses the lake, the
//                            night turns to aurora, the clouds part
//          8.1   MALLOWS     on six beats each feeling becomes its Mallow, which lands on the water
//                            and shows how it helps: Blubi cries then is comforted, Loomi breathes
//                            the anxiety calm, Pipzi bursts the anger into sparks, Glitzi's star
//                            lands on it (a wink), Zuzu's racing spirals slow, Boppo shines.
//                            "There's a Mallow for that."   11.9 everyone hops together
//   bar 6  12.5  CONNECTION  dawn; the camera comes down to the water and close; the Mallows
//                            gather. "Talk it out." (Blubi leans into Noomi) "Feel what you feel."
//                            (all seven breathe together) "Meet your Mallows." (eyes open in a
//                            wave, every face turns to us)
//   bar 8  16.9  BRAND       the line-up lands with the approved logo. THINK EMOTION. THINK
//                            HUSHMALLOW. A hello wave on the 16ths, Noomi winks, "Feel something?
//                            Hushmallow." — then the six hop up, become feelings and merge into
//                            the one by the lens: the opening frame.

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
const meta = { id: 'feel-something-v2', title: 'Feel Something? Hushmallow', fps: 30, duration: D, shutter: 0.5 };
const PH = (t) => (TAU * t) / D;
const bump = (t, a, bb, c, d) => smoothstep(a, bb, t) * (1 - smoothstep(c, d, t));
const lin = (h) => hex3(h).map((v) => Math.pow(v, 2.2));
const mix3 = (a, c, k) => a.map((v, i) => v + (c[i] - v) * k);
const smoother = (x) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
let MOTION = 1;                 // 1 full; the reduced-motion cut lowers camera travel, drift and hops

// ------------------------------------------------------------ the cast --
const CAST = [
  { id: 'blubi', kind: 0, color: [0.35, 0.62, 1.7], seed: 0.13 },     // sadness      → The Softie
  { id: 'loomi', kind: 1, color: [0.85, 0.62, 1.6], seed: 0.41 },     // anxiety      → The Chill One
  { id: 'pipzi', kind: 2, color: [1.9, 0.62, 0.22], seed: 0.67 },     // anger        → The Spark
  { id: 'glitzi', kind: 3, color: [1.15, 1.05, 1.7], seed: 0.29 },    // loneliness   → The Chaos Mallow (a galaxy)
  { id: 'zuzu', kind: 4, color: [1.15, 0.72, 1.7], seed: 0.83 },      // overthinking → The Spiral
  { id: 'boppo', kind: 5, color: [1.9, 1.3, 0.32], seed: 0.55 },      // happiness    → The Sunshine
];
const T = {
  split: b(4), whatever: 2.9, hum: b(12), groupHop: b(19), dawn: b(20), talk: b(20), feel: b(22), meet: b(24),
  logo: b(27), wave: b(28), wink: b(30), home: 19.15, hookIn: 19.45,
};
const REV = CAST.map((_, i) => b(5 + i));        // each feeling shows itself (beats 5–10)
const EMG = CAST.map((_, i) => b(13 + i));       // …becomes its Mallow (beats 13–18)
const RET = CAST.map((_, i) => 19.15 + 0.05 * i); // …and a feeling again for the loop

// ------------------------------------------------------------- layout --
// world: X across, Y up (the lake is Y = 0), Z away from the camera (Noomi at Z = 1000).
// Each shot has its camera; companions are placed by where they should appear in it
// (screen x and the screen y of their base), solved back into the world.
const CAMS = {
  hook: { x: 540, h: 300, z: 270, horizon: 990 },
  wide: { x: 540, h: 400, z: -280, horizon: 1000 },
  magic: { x: 540, h: 430, z: -300, horizon: 1000 },
  close: { x: 540, h: 210, z: 190, horizon: 1040 },
  brand: { x: 540, h: 330, z: -220, horizon: 1000 },
};
const REDUCED_CAM = { x: 540, h: 340, z: -170, horizon: 1000 };
const place = (cam, sx, by) => { const k = (by - cam.horizon) / cam.h; return { X: cam.x + (sx - 540) / k, Z: cam.z + 1000 / k }; };
const heightAt = (cam, X, Z, sy) => cam.h + (cam.horizon - sy) * (Z - cam.z) / 1000;
const NOOMI = { X: 540, Z: 1000, H: 470 };
const COMPANION_H = 220;
// where each lands on the water in the magic shot (alternating sides, as they are revealed)
const LAND = [[140, 1490], [775, 1430], [190, 1265], [900, 1265], [318, 1430], [950, 1490]].map(([x, y]) => place(CAMS.magic, x, y));
// …and where each feeling floats above its spot in the wide shot
const ORB_SY = [1010, 790, 1160, 1160, 790, 1010];
const SLOTS = LAND.map((L, i) => ({ X: L.X, Z: L.Z, Y: heightAt(CAMS.wide, L.X, L.Z, ORB_SY[i]) }));
const HOOK_ORB = (() => { const Z = 760, k = 1000 / (Z - CAMS.hook.z); return { X: 540 + (118 - 540) / k, Y: CAMS.hook.h + (CAMS.hook.horizon - 812) / k, Z, R: 52 }; })();
const GATHER = [[175, 1372], [1012, 1218], [218, 1150], [862, 1150], [64, 1218], [905, 1372]].map(([x, y]) => { const p = place(CAMS.close, x, y); return [p.X, p.Z]; });
const LINEUP = [[215, 1392], [985, 1232], [330, 1192], [750, 1192], [95, 1232], [865, 1392]].map(([x, y]) => { const p = place(CAMS.brand, x, y); return [p.X, p.Z]; });
const ORB_R = 80;

// ------------------------------------------------------------- camera --
function camAt(t) {
  const C = CAMS;
  // shots and the moves between them (each move eases; nothing ever cuts)
  const keys = [[0, C.hook], [2.35, C.hook], [3.55, C.wide], [7.25, { ...C.wide, x: 552, z: -255, h: 405 }], [8.45, C.magic], [12.2, { ...C.magic, x: 528, z: -270 }],
    [13.65, C.close], [16.2, { ...C.close, z: 232 }], [16.95, C.brand], [19.0, { ...C.brand, z: -200 }], [19.95, C.hook], [20, C.hook]];
  // the reduced-motion cut holds one still framing for the whole film: no dolly, crane or drift
  if (MOTION < 1) return { ...REDUCED_CAM };
  const pick = (f) => spline(keys.map(([kt, c]) => [kt, c[f]]), t);
  return { x: pick('x'), h: pick('h'), z: pick('z'), horizon: pick('horizon') };
}

// ------------------------------------------------------------ palette --
const PAL = {
  twilight: { zenith: '#0b0a2c', mid: '#382a72', low: '#c27a9e', glow: '#ffae92', moon: '#fff0e4', cloudLit: '#f1c4df', cloudDark: '#3a2f6e',
    hillFar: '#5b4b8e', hillNear: '#3a2e6c', waterNear: '#0d0b2a', waterFar: '#4c3a7c', mist: '#c4a2d8', aurA: '#7ef2d0', aurB: '#a78bff', aurC: '#ff8fd0',
    n: { aurora: 0.12, cloud: 0.85, rays: 0.35, stars: 0.75, moonGlow: 1.0, mist: 0.55, hills: 1 } },
  night: { zenith: '#04051a', mid: '#121848', low: '#3c3c92', glow: '#8d7dff', moon: '#eef0ff', cloudLit: '#bcc5ff', cloudDark: '#11143a',
    hillFar: '#2a2a6a', hillNear: '#18184a', waterNear: '#05061a', waterFar: '#262d6c', mist: '#6d6db8', aurA: '#6ff7d2', aurB: '#9a7bff', aurC: '#ff7ad0',
    n: { aurora: 1.0, cloud: 0.55, rays: 0.8, stars: 1.0, moonGlow: 1.2, mist: 0.45, hills: 1 } },
  dawn: { zenith: '#1b1546', mid: '#6a4c9c', low: '#ffb492', glow: '#ffc68e', moon: '#fff2d4', cloudLit: '#ffd8c4', cloudDark: '#6a4a84',
    hillFar: '#a07aa8', hillNear: '#6e5288', waterNear: '#1d1440', waterFar: '#b47c9c', mist: '#ffd2c4', aurA: '#9ef0d8', aurB: '#c0a0ff', aurC: '#ffa8d8',
    n: { aurora: 0.08, cloud: 0.8, rays: 0.6, stars: 0.18, moonGlow: 1.1, mist: 0.6, hills: 1 } },
};
for (const p of Object.values(PAL)) for (const key of Object.keys(p)) if (typeof p[key] === 'string') p[key] = lin(p[key]);
const nightAt = (t) => spline([[0, 0], [7.45, 0], [8.3, 1], [11.9, 1], [13.4, 0], [20, 0]], t);
const dawnAt = (t) => spline([[0, 0.25], [2.4, 0.25], [3.4, 0], [11.9, 0], [13.6, 1], [18.9, 1], [19.95, 0.25], [20, 0.25]], t);
function palette(t) {
  const nn = nightAt(t), dd = dawnAt(t), out = { n: {} };
  for (const key of Object.keys(PAL.twilight)) {
    if (key === 'n') continue;
    out[key] = mix3(mix3(PAL.twilight[key], PAL.night[key], nn), PAL.dawn[key], dd);
  }
  for (const key of Object.keys(PAL.twilight.n)) out.n[key] = lerp(lerp(PAL.twilight.n[key], PAL.night.n[key], nn), PAL.dawn.n[key], dd);
  return out;
}

// ------------------------------------------------------------- ripples --
const RIPPLES = [];       // { t, X, Z, amp }
const addRipple = (t, X, Z, amp) => RIPPLES.push({ t, X, Z, amp });

// --------------------------------------------------------------- orbs ---
function orbWorld(i, t) {
  const s = SLOTS[i];
  const bob = 10 * Math.sin(PH(t) * 4 + i * 1.7) * MOTION;
  // split from the one orb by the lens into the six slots
  const sp = smoother((t - T.split - i * 0.035) / 0.95);
  let X = lerp(HOOK_ORB.X, s.X, sp), Y = lerp(HOOK_ORB.Y, s.Y, sp) + Math.sin(Math.PI * sp) * 140, Z = lerp(HOOK_ORB.Z, s.Z, sp);
  Y += bob * sp;
  // the reveal: a pulse forward, toward the light
  const rw = bump(t, REV[i] - 0.05, REV[i] + 0.2, REV[i] + 0.45, REV[i] + 1.1);
  Z -= 90 * rw;
  return { X, Y, Z };
}

function orbAt(i, t, cam) {
  const c = CAST[i];
  // the loop: the six feelings merge back into the one by the lens
  if (t >= RET[i] - 0.02) {
    const m = mallowWorld(i, RET[i]);
    const k = smoothstep(RET[i], RET[i] + 0.22, t);
    const w = ease.inOutSine(smoothstep(RET[i] + 0.06, 19.97, t));
    const X = lerp(m.X, HOOK_ORB.X, w), Y = lerp(m.Y + COMPANION_H * 0.5, HOOK_ORB.Y, w) + Math.sin(Math.PI * w) * 120, Z = lerp(m.Z, HOOK_ORB.Z, w);
    const merge = smoothstep(19.6, 19.97, t);
    const alpha = k * (i === 0 ? 1 : 1 - merge);
    return orbScreen({ X, Y, Z }, cam, { kind: c.kind, reveal: 0, morph: 0, alpha, seed: i === 0 ? 0.5 : c.seed, glow: 0.35, flash: 0.4 * (1 - k), color: i === 0 ? [1.3, 1.15, 1.6] : c.color, R: ORB_R * lerp(0.6, 1, k) * lerp(1, HOOK_ORB.R / ORB_R, w) });
  }
  // before the split: only orb 0 exists — the single, veiled feeling by the lens, in pearl
  if (t < T.split) {
    if (i !== 0) return null;
    const pulse = 0.07 * (ring(t - b(2), 3.2, 0.35) + ring(t - b(3), 3.2, 0.35)) * MOTION;
    return orbScreen({ X: HOOK_ORB.X, Y: HOOK_ORB.Y + 8 * Math.sin(PH(t) * 4) * MOTION, Z: HOOK_ORB.Z }, cam, { kind: 0, reveal: 0, morph: 0, alpha: 1, seed: 0.5, glow: 0.35 + 0.25 * bump(t, b(2), b(2) + 0.05, b(2) + 0.1, b(2) + 0.5), flash: 0, color: [1.3, 1.15, 1.6], R: HOOK_ORB.R * (1 + pulse) });
  }
  const P = orbWorld(i, t);
  const reveal = t < 12 ? smoothstep(REV[i] + 0.02, REV[i] + 0.4, t) : 0;
  const morph = smoothstep(EMG[i] - 0.55, EMG[i] - 0.05, t);
  const pop = smoothstep(EMG[i] - 0.08, EMG[i] + 0.16, t);
  if (t > EMG[i] + 0.2) return null;
  const hum = ring(t - T.hum - 0.05 - Math.hypot(P.X - NOOMI.X, P.Z - NOOMI.Z) / 900, 2.4, 0.35) * smoothstep(T.hum, T.hum + 0.1, t);
  const rw = bump(t, REV[i] - 0.05, REV[i] + 0.2, REV[i] + 0.45, REV[i] + 1.1);
  const flash = 0.2 * bump(t, REV[i], REV[i] + 0.12, REV[i] + 0.18, REV[i] + 0.7) + 0.35 * smoothstep(EMG[i] - 0.3, EMG[i], t) * (1 - pop) + 0.12 * Math.max(0, hum);
  const wob = 0.06 * ring(t - REV[i], 3.2, 0.3) + 0.05 * hum;
  const first = i === 0 ? 1 : smoothstep(T.split, T.split + 0.12, t);
  return orbScreen(P, cam, {
    kind: c.kind, reveal, morph, alpha: first * (1 - pop), seed: c.seed, glow: 0.3 + 0.15 * rw, flash, color: c.color,
    R: ORB_R * (1 + 0.3 * rw + 0.3 * pop + 0.06 * hum), squash: [1 + wob, 1 - wob],
  });
}
function orbScreen(P, cam, o) {
  const s = project(cam, P.X, P.Y, P.Z), m = project(cam, P.X, -P.Y, P.Z);
  return { ...o, x: s.x, y: s.y, ry: m.y, r: o.R * s.k, z: P.Z, X: P.X, Y: P.Y, Z: P.Z, squash: o.squash || [1, 1] };
}

// ---------------------------------------------------------- companions ---
let living = {}, bodies = {}, sils = {}, face, faceSpec, faceKey = '';

function mallowWorld(i, t) {
  const s = SLOTS[i];
  const e = EMG[i];
  // emerges at its feeling, falls to the water below it (a little pop up first)
  const u = clamp((t - e) / 0.55, 0, 1);
  let Y = t < e ? s.Y : s.Y * (1 - u * u) + 70 * 4 * u * (1 - u);
  Y = Math.max(0, Y - COMPANION_H * 0.5 * (1 - u)) + 10;     // centre of the orb → base of the body
  let X = s.X, Z = s.Z;
  // gather close for the connection, then the line-up
  const g = ease.inOutSine(smoothstep(12.35, 13.7, t)), l = ease.inOutCubic(smoothstep(15.65, 16.85, t));
  X = lerp(lerp(X, GATHER[i][0], g), LINEUP[i][0], l);
  Z = lerp(lerp(Z, GATHER[i][1], g), LINEUP[i][1], l);
  return { X, Y, Z };
}

const MDOF = {};
function companionDof(i) {
  const id = CAST[i].id, e = EMG[i], L = living[id];
  const land = e + 0.55;
  const kicks = new Impulses().kick(land, 0.16, 3.0, 0.28).kick(e, -0.18, 2.4, 0.35);
  const hops = new Hops();
  hops.add(T.groupHop, T.groupHop + 0.42, 0.55);
  const wk = WAVE_ORDER[id];
  hops.add(wk, wk + 0.34, 0.42);
  hops.add(RET[i] - 0.05, RET[i] + 0.4, 0.35);
  kicks.kick(T.groupHop + 0.42, 0.12, 3.2, 0.3).kick(wk + 0.34, 0.1, 3.2, 0.3).kick(16.85, 0.08, 2.8, 0.3);
  // personality in motion, from the expression the rig is showing
  const amp = (t) => smoothstep(e + 0.6, e + 1.0, t) * MOTION;
  return (t) => {
    const P = L.expr.value(t);
    const a = amp(t), ph = PH(t);
    const bounce = P.bounce * Math.max(0, Math.sin(Math.PI * t * (P.bounceRate || 1.4))) ** 1.3 * 0.16 * a;
    const sync = syncBreath(t);
    return {
      squash: (t < e ? -0.25 : 0) * (1 - smoothstep(e, e + 0.3, t)) + kicks.value(t) + P.squashBias * 0.8 + P.droop * 0.06 - 0.06 * bounce,
      inflate: 0.02 * P.breath * Math.sin(TAU * t * 0.35 + i) * a - 0.09 * P.shrink + sync + 0.03 * (P.cheekPuff || 0),
      lean: 0.035 * P.leanBias + 0.004 * P.tiltBias + 0.02 * Math.sin(ph * 6 + i) * a,
      sway: P.tremble * 0.05 * Math.sin(t * 43 + i) * a + 0.04 * ring(t - land, 2.2, 0.3),
      shimmer: 0.7 * Math.exp(-Math.max(0, t - land) * 3) * (t > land ? 1 : 0), shimPhase: (t - land) * 14,
      lift: sils[id].h * (hops.value(t) * (MOTION < 1 ? 0.5 : 1) + bounce + 0.05 * P.float * a),
    };
  };
}
// all seven breathe together on "Feel what you feel" (one bar: in for two beats, out for two)
function syncBreath(t) {
  const u = (t - T.feel) / BAR;
  if (u <= 0 || u >= 1.6) return 0;
  return 0.07 * Math.sin(Math.PI * Math.min(u, 1) * 2 - Math.PI / 2) * 0.5 + 0.035 - 0.035 * smoothstep(1.0, 1.6, u);
}
const WAVE_ORDER = (() => {
  const xs = CAST.map((c, i) => ({ id: c.id, x: LINEUP[i][0] })).concat([{ id: 'noomi', x: NOOMI.X }]);
  xs.sort((a, c) => a.x - c.x);
  return Object.fromEntries(xs.map((e, k) => [e.id, T.wave + k * BEAT / 4]));
})();

function companionItem(i, t, cam, light, pal) {
  const c = CAST[i], e = EMG[i];
  if (t < e - 0.03 || t > RET[i] + 0.3) return null;
  const sil = sils[c.id], W = mallowWorld(i, t);
  const grow = t < e ? 0.15 : 0.15 + 0.85 * spring(t - e, 2.0, 0.5);
  const g = clamp(1 - smoothstep(RET[i] - 0.06, RET[i] + 0.24, t), 0, 1);
  const p = project(cam, W.X, W.Y, W.Z), pr = project(cam, W.X, -W.Y, W.Z);
  const s = (COMPANION_H / sil.h) * p.k * grow * lerp(0.3, 1, g);
  const xf = { x: p.x, y: p.y, s }, xfR = { x: pr.x, y: pr.y, s };
  const dof = MDOF[c.id];
  const far = clamp((W.Z - 1050) / 700, 0, 1);
  return {
    id: c.id, z: W.Z, fade: smoothstep(e - 0.03, e + 0.06, t) * clamp(1 - smoothstep(RET[i] + 0.08, RET[i] + 0.28, t), 0, 1),
    emerge: Math.max(1 - smoothstep(e, e + 0.7, t), 1 - g), emergeCol: c.color.map((v) => v * 0.8),
    lod: 0.9 * far + 0.5 * clamp((900 - W.Z) / 300, 0, 1), haze: [...pal.mist.map((v) => v * 0.8), 0.16 * far],
    light, xf, sil, W,
    build: (mesh) => bodies[c.id].build(mesh, t, dof, xf),
    buildRefl: (mesh) => bodies[c.id].build(mesh, t, dof, xfR, true),
    project: (px, py) => bodies[c.id].project(px, py, t, dof, xf),
  };
}

// --------------------------------------------------------------- Noomi ---
const nb = {}, nf = {};
function noomiDof(t) {
  return {
    squash: nb.squash.value(t) + nb.kicks.value(t) + 0.01 * Math.sin(t * 61) * nb.tremble(t),
    inflate: nb.inflate.value(t) + 0.022 * Math.sin(PH(t) * 5) + syncBreath(t),
    lean: nb.lean.value(t),
    sway: nb.sway.value(t) + 0.05 * Math.sin(t * 47) * nb.tremble(t),
    shimmer: nb.shimmer(t), shimPhase: t * 14,
    lift: (nb.hop.value(t) + nb.lift.value(t)) * (MOTION < 1 ? 0.5 : 1),
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

// ----------------------------------------------------------- particles ---
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const PEARL = [[1.3, 1.15, 1.6], [1.0, 1.25, 1.6], [1.6, 1.15, 1.3], [1.5, 1.35, 1.0]];
// lanterns: soft lights floating at every depth, rising a whole number of times per loop
const LANTERNS = (() => { const r = rng(777); return Array.from({ length: 90 }, () => ({ X: -900 + r() * 2900, Z: 330 + Math.pow(r(), 1.6) * 3600, ph: r(), k: 1 + Math.floor(r() * 2), sw: r() * TAU, size: 6 + r() * 9, c: PEARL[Math.floor(r() * 4)] })); })();
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
    const g = l.Z < 700 ? groups.near : l.Z < 1300 ? groups.mid : groups.far;
    g.push({ x: p.x, y: p.y, r, a, c: l.c, kind: 0 });
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
    const W = B.at(t);                                  // world anchor { X, Y, Z }
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
// a bead of light falling from each feeling into the lake as it shows itself
function beadParts(t, cam, out) {
  CAST.forEach((c, i) => {
    const t0 = REV[i] + 0.12, u = (t - t0) / 0.5;
    if (u < 0 || u > 1) return;
    const P = orbWorld(i, t0);
    const Y = (P.Y - ORB_R) * (1 - u * u);
    const p = project(cam, P.X, Y, P.Z);
    out.push({ x: p.x, y: p.y, r: 10 * p.k, a: 0.95 * (1 - smoothstep(0.85, 1, u)), c: c.color, kind: 0, z: P.Z });
    out.push({ x: p.x, y: p.y - 14 * p.k, r: 6 * p.k, a: 0.4, c: c.color, kind: 0, z: P.Z });
  });
}

// --------------------------------------------------------------- set-up ---
let hook, hookEnd, whatever, forThat, talk, feel, meet, logo, think, tag;

async function setup(stage) {
  MOTION = stage.motion === 'reduced' ? 0.35 : 1;
  const R = stage.renderer;
  const url = (rel) => new URL(rel, import.meta.url).href;
  // Noomi: the approved hi-res art, painted face removed and rebuilt procedurally (as in v2 / v1)
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

  // the six companions: the app rig's living skins
  await Promise.all(CAST.map(async (c, i) => {
    const L = await new LivingMallow(c.id, { q: 1.5 }).load();
    living[c.id] = L;
    setCompanionActing(i, L);
    L.draw(EMG[i] + 3);                                 // a skin at rest for the silhouette
    const snap = document.createElement('canvas');
    snap.width = L.skin.width; snap.height = L.skin.height;
    snap.getContext('2d').drawImage(L.rig.assets.original, 0, 0, snap.width, snap.height);
    sils[c.id] = silhouette(snap);
    R.addMallow(c.id, { artImg: L.skin, sil: sils[c.id], cols: 56, rows: 56 });
    bodies[c.id] = new SoftBody({ w: L.skin.width, h: L.skin.height }, sils[c.id], { lag: 0.07, cols: 56, rows: 56 });
  }));
  CAST.forEach((c, i) => { MDOF[c.id] = companionDof(i); });

  buildNoomi();
  buildEvents();

  hook = new TextBlock({ lines: ['Feeling something?'], y: 318, size: 86, weight: 600, enterAt: -10, exitAt: 2.3, exitDur: 0.45 });
  hookEnd = new TextBlock({ lines: ['Feeling something?'], y: 318, size: 86, weight: 600, enterAt: T.hookIn, inDur: 0.5, stagger: 0, rise: 0 });
  whatever = new TextBlock({ lines: ['Whatever it is...'], y: 318, size: 82, weight: 600, enterAt: T.whatever, exitAt: 7.2, exitDur: 0.45 });
  forThat = new TextBlock({ lines: ['There’s a Mallow', 'for that.'], y: 296, size: 86, weight: 600, enterAt: b(13) + 0.1, stagger: 0.28, exitAt: 12.15, exitDur: 0.45 });
  talk = new TextBlock({ lines: ['Talk it out.'], y: 300, size: 80, weight: 600, enterAt: T.talk + 0.1, exitAt: 16.3, exitDur: 0.45 });
  feel = new TextBlock({ lines: ['Feel what you feel.'], y: 398, size: 80, weight: 600, enterAt: T.feel + 0.05, exitAt: 16.35, exitDur: 0.45 });
  meet = new TextBlock({ lines: ['Meet your Mallows.'], y: 496, size: 80, weight: 600, enterAt: T.meet + 0.05, exitAt: 16.4, exitDur: 0.45 });
  logo = new LogoCard({ y: 360, logoW: 430, url: '', urlSize: 1, gap: 0, enterAt: T.logo, exitAt: 19.1, exitDur: 0.4 });
  await logo.load();
  think = new TextBlock({ lines: ['THINK EMOTION.', 'THINK HUSHMALLOW.'], y: 556, size: 82, weight: 700, tracking: 2, lineHeight: 1.14, enterAt: T.logo + 0.25, stagger: 0.32, exitAt: 19.1, exitDur: 0.4 });
  tag = new TextBlock({ lines: ['Feel something? Hushmallow.'], y: 1585, size: 56, weight: 500, enterAt: T.logo + 0.95, exitAt: 19.1, exitDur: 0.4 });

  const c = (t, type, d = {}) => stage.cue(t, type, d);
  const panX = (X) => clamp((X - 540) / 520, -0.85, 0.85);
  c(0, 'scene', { loop: D, bpm: 96 });
  c(0.42, 'glance', { pan: -0.5 }); c(1.0, 'curious');
  c(b(2), 'orb_pulse'); c(b(3), 'orb_pulse');
  c(T.split, 'split');
  CAST.forEach((m, i) => { const P = orbWorld(i, REV[i]); c(REV[i], 'reveal', { i, kind: m.kind, pan: panX(P.X) }); c(REV[i] + 0.6, 'bead', { i, kind: m.kind, pan: panX(P.X) }); });
  c(b(11), 'understand');
  c(T.hum, 'hum');
  CAST.forEach((m, i) => { const P = orbWorld(i, EMG[i]); c(EMG[i] - 0.55, 'morph', { i, kind: m.kind, pan: panX(P.X) }); c(EMG[i], 'emerge', { i, mallow: m.id, kind: m.kind, pan: panX(P.X) }); c(EMG[i] + 0.55, 'land', { i, mallow: m.id, pan: panX(P.X) }); c(EMG[i] + 0.75, 'resolve', { i, mallow: m.id, kind: m.kind, pan: panX(P.X) }); });
  c(T.groupHop, 'group_hop'); c(T.groupHop + 0.42, 'group_land');
  c(T.dawn, 'dawn');
  c(T.talk, 'line', { n: 0 }); c(T.talk + 0.35, 'nuzzle');
  c(T.feel, 'line', { n: 1 }); c(T.feel, 'breath_in', { dur: 2 * BEAT }); c(T.feel + 2 * BEAT, 'breath_out', { dur: 2 * BEAT });
  c(T.meet, 'line', { n: 2 });
  Object.entries(BLINK_WAVE).forEach(([id, tw], k) => c(tw, 'eyes_open', { k, mallow: id }));
  c(15.65, 'assemble'); c(16.85, 'lineup_land');
  c(T.logo, 'logo');
  Object.entries(WAVE_ORDER).sort((a, z) => a[1] - z[1]).forEach(([id, tw], k) => c(tw, 'wave', { k, mallow: id, pan: panX(id === 'noomi' ? NOOMI.X : LINEUP[CAST.findIndex((m) => m.id === id)][0]) }));
  c(T.wink, 'wink');
  CAST.forEach((m, i) => c(RET[i], 'return', { i, mallow: m.id }));
  c(19.6, 'merge'); c(T.hookIn, 'hook_in');
}

// eyes open one after another on "Meet your Mallows", left to right
const BLINK_WAVE = (() => {
  const xs = CAST.map((c, i) => ({ id: c.id, x: GATHER[i][0] })).sort((a, z) => a.x - z.x);
  return Object.fromEntries(xs.map((e, k) => [e.id, T.meet + 0.15 + k * BEAT / 4]));
})();

function setCompanionActing(i, L) {
  const c = CAST[i], e = EMG[i], open = BLINK_WAVE[c.id], wave = WAVE_ORDER[c.id];
  // each Mallow arrives in its feeling, then shows how it helps
  const arc = {
    blubi: [['sad', 0.92], ['comforted', 0.8, 0.75], ['happy', 0.55, 1.6]],
    loomi: [['anxious', 0.85], ['calm', 0.85, 0.7], ['relieved', 0.6, 1.5]],
    pipzi: [['angry', 0.92], ['excited', 0.85, 0.6], ['happy', 0.7, 1.6]],
    glitzi: [['lonely', 0.85], ['playful', 0.75, 0.75], ['proud', 0.6, 1.6]],
    zuzu: [['confused', 0.95], ['curious', 0.75, 0.75], ['happy', 0.7, 1.5]],
    boppo: [['excited', 0.95], ['happy', 0.9, 1.2], ['excited', 0.6, 2.2]],
  }[c.id];
  const keys = [{ t: 0, mood: arc[0][0], k: arc[0][1] }];
  for (const [mood, k, dt] of arc.slice(1)) keys.push({ t: e + dt, mood, k, dur: 0.4 });
  const late = {
    blubi: ['loved', 0.75], loomi: ['comforted', 0.7], pipzi: ['happy', 0.6], glitzi: [{ loved: 0.5, proud: 0.5 }, 0.6], zuzu: ['comforted', 0.65], boppo: ['happy', 0.75],
  }[c.id];
  const meetMood = { blubi: 'happy', loomi: 'curious', pipzi: 'excited', glitzi: 'curious', zuzu: 'awe', boppo: 'happy' }[c.id];
  keys.push({ t: T.talk, mood: late[0], k: late[1], dur: 0.5 });
  keys.push({ t: T.feel, mood: 'calm', k: 0.85, dur: 0.5, set: { eyeOpen: 0.05, closedCurve: 1 } });
  keys.push({ t: open, mood: meetMood, k: 0.65, dur: 0.16 });
  keys.push({ t: wave - 0.05, mood: 'excited', k: 0.55, dur: 0.15 });
  keys.push({ t: wave + 0.6, mood: 'happy', k: 0.8, dur: 0.3 });
  L.setExpressions(keys);
  L.blinks = naturalBlinks(31 + i * 17, D, { every: 2.8, avoid: [[T.feel, open]] });
  // where they look: at Noomi as they arrive, at us from the connection on
  L.look = (t) => {
    const W = mallowWorld(i, t);
    const toNoomi = [clamp((NOOMI.X - W.X) / 420, -0.9, 0.9), clamp((W.Z - NOOMI.Z) / 1600, -0.2, 0.25)];
    const wN = bump(t, e + 0.9, e + 1.2, T.talk - 0.2, T.talk + 0.1) + (c.id === 'blubi' ? bump(t, T.talk + 0.2, T.talk + 0.45, T.feel - 0.2, T.feel) : 0);
    const wV = smoothstep(open - 0.05, open + 0.15, t) * (1 - smoothstep(RET[i] - 0.1, RET[i], t));
    if (wN > 0.001) return [toNoomi[0], toNoomi[1], wN];
    return [0, 0, wV * 0.85];
  };
  if (c.id === 'zuzu') L.buildSpin(D);
}

function buildNoomi() {
  const r = REV;
  nb.squash = new Track(0, { f: 2.4, z: 0.8 })
    .to(1.0, 0.03, { f: 3 }).to(1.45, 0)
    .to(T.split - 0.22, 0.1, { f: 5, z: 0.8 }).to(T.split, -0.1, { f: 6, z: 0.5 }).to(T.split + 0.25, 0, { f: 2.4, z: 0.35 })   // the boop
    .to(r[0] + 0.2, 0.06, { f: 2.5 }).to(r[1], 0)
    .to(r[2] + 0.18, -0.04, { f: 4 }).to(r[3], 0)
    .to(r[3] + 0.2, 0.05, { f: 2 }).to(r[4], 0, { f: 2.5 })
    .to(r[5] + 0.05, 0.1, { f: 6, z: 0.7 }).to(r[5] + 0.12, -0.15, { f: 7, z: 0.6 }).to(r[5] + 0.32, 0, { f: 3, z: 0.8 })
    .to(T.hum - 0.3, -0.06, { f: 1.6 }).to(T.hum + 0.45, 0.05, { f: 1.2 }).to(T.hum + 1.4, 0, { f: 1.5 })
    .to(T.talk + 0.35, 0.04, { f: 2.5 }).to(T.talk + 1.0, 0);
  nb.kicks = new Impulses().kick(r[5] + 0.5, 0.17, 3.2, 0.28).kick(T.groupHop + 0.42, 0.1, 3.2, 0.3).kick(WAVE_ORDER.noomi + 0.34, 0.1, 3.2, 0.3);
  EMG.forEach((e) => nb.kicks.kick(e + 0.6, 0.025, 3, 0.35));
  nb.inflate = new Track(0, { f: 2, z: 0.85 })
    .to(r[2] + 0.18, 0.08, { f: 4, z: 0.7 }).to(r[3], 0)
    .to(r[3] + 0.2, -0.035).to(r[4] + 0.2, 0)
    .to(T.hum - 0.35, 0.07, { f: 1.2 }).to(T.hum + 0.5, -0.02, { f: 0.9 }).to(T.hum + 1.8, 0);
  nb.lean = new Track(0, { f: 1.8, z: 0.8 })
    .to(0.95, -0.045).to(1.7, 0)
    .to(b(2), -0.03).to(T.split + 0.2, 0, { f: 2.2 })
    .to(r[3] + 0.3, 0.03).to(r[4], 0)
    .to(T.talk + 0.25, -0.05, { f: 1.5 }).to(T.feel, 0).to(T.meet + 0.2, 0.025).to(15.6, 0);
  EMG.forEach((e, i) => nb.lean.to(e + 0.02, clamp((SLOTS[i].X - 540) / 540, -1, 1) * 0.03, { f: 2.5 }));
  nb.lean.to(T.groupHop - 0.2, 0, { f: 2 });
  nb.sway = new Impulses().kick(T.split + 0.05, 0.05, 2.6, 0.3);
  nb.lift = new Track(0, { f: 1.6, z: 0.9 }).to(T.hum - 0.3, 30, { f: 1.4 }).to(T.hum + 0.6, 0, { f: 1.1, z: 0.8 });
  nb.hop = new Hops().add(r[5] + 0.12, r[5] + 0.5, 95).add(T.groupHop, T.groupHop + 0.42, 120).add(WAVE_ORDER.noomi, WAVE_ORDER.noomi + 0.34, 90);
  nb.tremble = (t) => bump(t, r[1] + 0.15, r[1] + 0.3, r[2] - 0.05, r[2] + 0.1);
  nb.shimmer = (t) => {
    let s = 0;
    for (const [t0, a] of [[T.split, 0.8], [r[5] + 0.5, 0.9], [T.groupHop + 0.42, 0.6], [WAVE_ORDER.noomi + 0.34, 0.5]]) if (t > t0) s = Math.max(s, a * Math.exp(-(t - t0) * 3));
    return s;
  };

  const F = (v0, o) => new Track(v0, o || { f: 3.2, z: 0.85 });
  nf.eyeOpen = F(1.04); nf.curve = F(-1, { f: 6, z: 1 }); nf.lidTop = F(0); nf.lidBot = F(0.12); nf.iris = F(1.05); nf.stretch = F(1);
  nf.lookX = F(0, { f: 4.5, z: 0.8 }); nf.lookY = F(0, { f: 4.5, z: 0.8 }); nf.sparkle = F(0.8, { f: 1.5, z: 1 });
  nf.browA = F(0.35); nf.browY = F(0.35); nf.browT = F(0.25);
  nf.smile = F(0.45); nf.mOpen = F(0.04); nf.mRound = F(0.15); nf.mWave = F(0); nf.mWidth = F(0.92); nf.blush = F(0.42, { f: 1.2, z: 1 });
  nf.wink = F(0, { f: 6, z: 0.85 });
  nf.blinks = new Blinks().add(1.62).add(4.0).add(9.0).add(13.3, { close: 0.14, hold: 0.06, open: 0.3 }).add(18.3);
  const look = (t, x, y, o) => { nf.lookX.to(t, x, o); nf.lookY.to(t, y, o); };
  const set = (t, kv, o) => { for (const [k, v] of Object.entries(kv)) nf[k].to(t, v, o); };
  // hook: on us, curious; a glance at the feeling by the lens; leaning in as it pulses
  look(0.42, -0.62, 0.05); look(0.95, 0, 0);
  set(1.0, { browA: 0.6, browY: 0.6, browT: 0.3, mRound: 0.35, mOpen: 0.08, smile: 0.3, eyeOpen: 1.1 });
  look(b(2) - 0.1, -0.7, 0.12);
  set(b(2), { eyeOpen: 1.16, iris: 1.12, sparkle: 1, mRound: 0.45, mOpen: 0.18, browY: 0.7 });
  set(T.split - 0.05, { eyeOpen: 0, curve: -1, smile: 1.1, mOpen: 0.32, mRound: 0 }, { f: 9, z: 0.9 });     // boop! happy squint
  set(T.split + 0.3, { eyeOpen: 1.12, iris: 1.08, smile: 0.9, mOpen: 0.25, browY: 0.5, browA: 0.4 });
  look(T.split + 0.25, 0, -0.45);
  // the universe of feelings
  r.forEach((rt, i) => { const P = orbWorld(i, rt); look(rt + 0.03, clamp((P.X - 540) / 360, -0.9, 0.9), clamp(-(P.Y - 300) / 320, -0.85, 0.55)); });
  set(r[0] + 0.15, { browA: 0.9, browT: 0.95, browY: 0.25, smile: -0.62, mOpen: 0, mRound: 0, eyeOpen: 0.9, lidTop: 0.18, blush: 0.5, mWidth: 0.82, iris: 1 });
  set(r[1] + 0.15, { eyeOpen: 1.18, iris: 0.78, browT: 0.7, browY: 0.6, smile: -0.25, mWave: 0.9, lidTop: 0, stretch: 1.06 });
  set(r[2] + 0.15, { eyeOpen: 1, iris: 1, lidTop: 0.42, browT: -1.0, browY: -0.25, browA: 0.95, smile: -0.42, mWidth: 0.7, mWave: 0, blush: 1.05, stretch: 1 });
  set(r[3] + 0.15, { lidTop: 0.36, lidBot: 0.08, browT: 0.85, browY: 0.12, browA: 0.85, smile: -0.48, mWidth: 0.8, blush: 0.4 });
  look(r[3] + 0.4, 0.12, 0.55);
  set(r[4] + 0.15, { lidTop: 0, lidBot: 0.05, eyeOpen: 1.06, browY: 0.62, browT: 0.3, browA: 0.6, smile: 0, mRound: 0.5, mOpen: 0.14, mWidth: 0.9 });
  [[r[4] + 0.27, -0.7, -0.55], [r[4] + 0.39, 0, -0.85], [r[4] + 0.51, 0.7, -0.55], [r[4] + 0.6, 0.6, 0.2]].forEach(([t, x, y]) => look(t, x, y, { f: 6, z: 0.75 }));
  set(r[5] + 0.1, { eyeOpen: 0, curve: -1, smile: 1.15, mOpen: 0.5, mRound: 0, browA: 0.35, browT: 0.2, browY: 0.5, blush: 0.9, lidTop: 0, iris: 1 });
  // all six known: a soft, understanding look at us
  set(b(11), { eyeOpen: 1.0, lidBot: 0.22, smile: 0.7, mOpen: 0.05, browA: 0.3, browT: 0.4, browY: 0.2, blush: 0.6, sparkle: 0.9 });
  look(b(11), 0, 0);
  // the hum: eyes closed, a glow from within
  set(T.hum - 0.3, { eyeOpen: 0, curve: 1, smile: 0.6, mOpen: 0, mRound: 0.2, browA: 0.15, browY: 0.1 }, { f: 2.2, z: 0.9 });
  set(T.hum + 0.45, { eyeOpen: 1.12, curve: -1, iris: 1.1, sparkle: 1, smile: 0.95, mOpen: 0.3, mRound: 0.15, browY: 0.5, browA: 0.4 });
  EMG.forEach((e, i) => look(e - 0.1, clamp((SLOTS[i].X - 540) / 380, -0.85, 0.85), clamp(-(SLOTS[i].Y - 300) / 360, -0.6, 0.6)));
  set(T.groupHop - 0.05, { eyeOpen: 0, curve: -1, mOpen: 0.55, smile: 1.2, blush: 0.9 }, { f: 6, z: 0.85 });
  set(T.groupHop + 0.6, { eyeOpen: 1.0, mOpen: 0.1, smile: 0.95 });
  look(T.groupHop + 0.6, 0, 0);
  // connection: Blubi leans in; all breathe together; then all eyes on us
  look(T.talk + 0.3, -0.75, 0.1);
  set(T.talk + 0.3, { eyeOpen: 0.95, lidBot: 0.28, smile: 1.05, mOpen: 0.06, blush: 0.85, browT: 0.35, browY: 0.3 });
  set(T.feel - 0.05, { eyeOpen: 0, curve: 1, smile: 0.75, mOpen: 0 }, { f: 2.5, z: 0.95 });
  look(T.feel, 0, 0);
  set(BLINK_WAVE.blubi - 0.05, { eyeOpen: 1.04, curve: -1, sparkle: 1, smile: 1.0, mOpen: 0.08, lidBot: 0.2 });
  // brand: smiling at us; the wink
  set(T.logo, { eyeOpen: 1.0, smile: 1.0, mOpen: 0.1, lidBot: 0.22 });
  nf.wink.to(T.wink, 1).to(T.wink + 0.32, 0);
  set(T.wink, { smile: 1.15, mOpen: 0.18 }); set(T.wink + 0.4, { smile: 1.0, mOpen: 0.08 });
  // home: the opening face again (every track returns to its first value)
  set(T.home, { eyeOpen: 1.04, curve: -1, lidTop: 0, lidBot: 0.12, iris: 1.05, stretch: 1, sparkle: 0.8, browA: 0.35, browY: 0.35, browT: 0.25, smile: 0.45, mOpen: 0.04, mRound: 0.15, mWave: 0, mWidth: 0.92, blush: 0.42 });
  look(T.home, 0, 0);
}

function buildEvents() {
  // ripples on the lake
  addRipple(T.split + 0.05, NOOMI.X, NOOMI.Z, 0.5);
  CAST.forEach((c, i) => {
    const P = orbWorld(i, REV[i]);
    addRipple(REV[i] + 0.6, P.X, P.Z, 0.55);
    const S = SLOTS[i];
    addRipple(EMG[i] + 0.55, S.X, S.Z, 0.9);
    addRipple(T.groupHop + 0.42, mallowWorld(i, T.groupHop).X, mallowWorld(i, T.groupHop).Z, 0.35);
    addRipple(16.85, LINEUP[i][0], LINEUP[i][1], 0.4);
  });
  addRipple(T.hum + 0.05, NOOMI.X, NOOMI.Z, 1.4);
  addRipple(T.groupHop + 0.42, NOOMI.X, NOOMI.Z, 0.5);
  // light bursts
  burst(T.split, () => ({ X: HOOK_ORB.X, Y: HOOK_ORB.Y, Z: HOOK_ORB.Z }), { n: 14, sparkles: 6, seed: 3, color: [1.5, 1.3, 1.7], speed: 300, life: 1.1, size: 7, up: 20, z: HOOK_ORB.Z });
  CAST.forEach((c, i) => {
    burst(REV[i] + 0.04, () => orbWorld(i, REV[i] + 0.04), { n: 5, sparkles: 4, seed: 11 + i, color: c.color, speed: 180, life: 0.9, size: 6, up: 25 });
    burst(EMG[i], () => orbWorld(i, EMG[i]), { n: 16, sparkles: 6, petals: c.kind === 5 || c.kind === 2 ? 10 : 4, seed: 31 + i, color: c.color, speed: 300, life: 1.3, size: 8, up: 40 });
    // each Mallow's way of moving through its feeling
    const at = (dy) => (t) => { const W = mallowWorld(i, t); return { X: W.X, Y: W.Y + COMPANION_H * dy, Z: W.Z - 2 }; };
    if (c.id === 'pipzi') burst(EMG[i] + 0.62, at(0.7), { n: 6, sparkles: 14, seed: 51, color: [2.0, 0.9, 0.3], speed: 420, life: 1.0, size: 7, up: 30 });           // the anger, released as sparks
    if (c.id === 'blubi') burst(EMG[i] + 0.78, at(0.9), { n: 10, sparkles: 4, seed: 52, color: [0.6, 0.85, 1.8], speed: 120, life: 1.5, size: 6, up: -60 });          // tears turned to light
    if (c.id === 'loomi') burst(EMG[i] + 0.7, at(0.5), { n: 18, seed: 53, color: [0.9, 0.75, 1.6], speed: 220, life: 1.6, size: 6, up: 10 });                       // the breath out
    if (c.id === 'glitzi') burst(EMG[i] + 0.7, at(1.05), { n: 0, sparkles: 5, seed: 54, color: [1.6, 1.5, 1.2], speed: 80, life: 1.4, size: 8, up: 20 });            // its new star
    if (c.id === 'zuzu') burst(EMG[i] + 0.72, at(0.6), { n: 12, sparkles: 3, seed: 55, color: [1.2, 0.8, 1.8], speed: 160, life: 1.3, size: 6, up: 15 });
    if (c.id === 'boppo') burst(EMG[i] + 0.6, at(0.8), { n: 6, sparkles: 6, petals: 12, seed: 56, color: [2.0, 1.4, 0.4], speed: 300, life: 1.5, size: 7, up: 30 });
    burst(RET[i] + 0.05, () => mallowWorld(i, RET[i]), { n: 8, sparkles: 3, seed: 61 + i, color: c.color, speed: 150, life: 0.8, size: 6, up: 20 });
  });
  burst(T.hum + 0.05, () => ({ X: NOOMI.X, Y: 250, Z: NOOMI.Z }), { n: 30, sparkles: 8, seed: 5, color: [1.4, 1.3, 1.8], speed: 520, life: 1.6, size: 8, up: 20 });
  Object.entries(WAVE_ORDER).forEach(([id, tw], k) => {
    const i = CAST.findIndex((m) => m.id === id);
    const at = i < 0 ? () => ({ X: NOOMI.X, Y: NOOMI.H + 40, Z: NOOMI.Z - 2 }) : () => ({ X: LINEUP[i][0], Y: COMPANION_H + 60, Z: LINEUP[i][1] - 2 });
    burst(tw + 0.17, at, { n: 0, sparkles: 2, seed: 101 + k, color: [1.7, 1.5, 1.3], speed: 60, life: 0.7, size: 7, up: 40 });
  });
  burst(T.talk + 0.4, () => ({ X: 420, Y: 330, Z: 990 }), { n: 6, sparkles: 2, seed: 120, color: [1.8, 0.9, 1.3], speed: 60, life: 1.2, size: 6, up: 50 });
}

// ----------------------------------------------------------------- state ---
function state(t, { center = false, dry = false } = {}) {
  const cam = camAt(t);
  const pal = palette(t), n = pal.n;
  const nn = nightAt(t), dd = dawnAt(t);
  const moon = [770, cam.horizon - lerp(lerp(470, 560, nn), 330, dd), 52];
  // which feeling colours the light right now
  let feelCol = [0, 0, 0], feelAmt = 0;
  CAST.forEach((c, i) => { const w = bump(t, REV[i], REV[i] + 0.15, REV[i] + 0.5, REV[i] + 1.2); if (w > feelAmt) { feelAmt = w; feelCol = c.color; } });
  const light = {
    dir: [0.45, 0.6, 0.7], key: mix3(mix3([1.0, 0.97, 1.03], [0.92, 0.95, 1.08], nn), [1.06, 0.98, 0.93], dd),
    rim: mix3(mix3(pal.cloudLit, PAL.night.aurA, nn * 0.6), pal.glow, dd * 0.6), rimAmt: 0.5, spec: 0.5,
    specCol: [0.95, 0.95, 1.05], glowCol: [1.0, 0.8, 0.6], glow: 0, ambient: pal.mid,
  };
  // Noomi glows on the hum and when "feel what you feel" lands
  const nGlow = 0.12 * bump(t, T.hum - 0.3, T.hum + 0.2, T.hum + 0.8, T.hum + 2.0) + 0.08 * bump(t, T.feel, T.feel + 0.6, T.feel + 1.3, T.feel + 2.4) + 0.04 * dd;
  const mallows = [noomiItem(t, cam, { ...light, glow: nGlow })];
  CAST.forEach((_, i) => { const m = companionItem(i, t, cam, light, pal); if (m) mallows.push(m); });
  const orbs = [];
  CAST.forEach((_, i) => { const o = orbAt(i, t, cam); if (o) orbs.push(o); });
  // the feeling light an orb spills on Noomi (the one by the lens in the hook; each as it shows itself)
  let spill = [0, 0, 0, 0], side = 0;
  for (const o of orbs) {
    const dx = o.X - NOOMI.X, dz = o.Z - NOOMI.Z, dist = Math.hypot(dx, o.Y - 260, dz);
    const w = clamp(1 - dist / 700, 0, 1) * o.alpha * (0.4 + o.glow + o.flash);
    if (w * 0.3 > spill[3]) { spill = [...o.color.map((v) => v * 0.55), w * 0.3]; side = Math.sign(dx); }
  }
  mallows[0].spill = spill; mallows[0].spillSide = side;

  // particles, grouped by depth
  const groups = { near: [], mid: [], far: [] }, fx = [];
  lanternParts(t, cam, 0.55 + 0.35 * nn + 0.2 * dd, groups);
  burstParts(t, cam, fx);
  beadParts(t, cam, fx);
  const parts = [{ z: 2200, list: groups.far }, { z: 1100, list: groups.mid }, { z: 450, list: groups.near }];
  // effects sit just in front of whatever they belong to
  const byZ = new Map();
  for (const p of fx) { const zk = Math.round(p.z / 100) * 100 - 1; if (!byZ.has(zk)) byZ.set(zk, []); byZ.get(zk).push(p); }
  for (const [zk, list] of byZ) parts.push({ z: zk, list });

  const S = { t, ph: PH(t), cam, mallows, orbs, parts };
  if (!center) return S;
  // ripples on the lake (the 8 most recent)
  const rip = new Float32Array(32);
  RIPPLES.filter((r) => t > r.t && t - r.t < 4).slice(-8).forEach((r, k) => rip.set([r.X, r.Z, t - r.t, r.amp * MOTION], k * 4));
  S.world = {
    sky: {
      uZenith: pal.zenith, uMid: pal.mid, uLow: pal.low, uGlow: pal.glow, uMoon: moon, uMoonCol: pal.moon, uMoonGlow: n.moonGlow,
      uAurora: n.aurora * (1 + 0.6 * bump(t, T.hum, T.hum + 0.4, T.hum + 1.2, T.hum + 3)), uAurA: pal.aurA, uAurB: pal.aurB, uAurC: pal.aurC,
      uCloud: n.cloud, uCloudLit: pal.cloudLit, uCloudDark: pal.cloudDark, uRays: n.rays * (1 + 0.8 * bump(t, T.hum, T.hum + 0.5, T.hum + 1.5, T.hum + 3)),
      uStars: n.stars, uHills: n.hills, uHillNear: pal.hillNear, uHillFar: pal.hillFar, uFeel: feelCol, uFeelAmt: feelAmt * 0.8,
    },
    lake: {
      uWaterNear: pal.waterNear, uWaterFar: pal.waterFar, uMoonCol: pal.moon, uMistCol: pal.mist, uGlow: pal.glow, uMoon: moon,
      uMist: n.mist, uReflAmt: 0.92, uSwell: 0.7 * (0.5 + 0.5 * MOTION), uRip: rip,
    },
  };
  S.post = {
    exposure: 1.0, bloom: 0.2, bloomThresh: 0.78, contrast: 1.04, sat: 1.05,
    shadowTint: mix3([0.95, 0.96, 1.07], [0.98, 0.95, 1.04], dd), highTint: mix3([1.01, 1.0, 1.0], [1.04, 1.0, 0.96], dd),
    vignette: 0.3, grain: 0.016, time: t,
  };
  if (!dry) {
    S.prepare = (R) => {
      // Face.render() clears its scratch canvas first: the face is a function of its parameters
      // alone (Face.draw() would carry texels over from the previous frame, CONVENTIONS §7)
      const P = { ...NEUTRAL, ...faceAt(t) };
      const key = JSON.stringify(P, (k, v) => (typeof v === 'number' ? Math.round(v * 2000) / 2000 : v));
      if (key !== faceKey) { faceKey = key; face.render(P); R.updateFace('noomi'); }
      for (const m of mallows) if (m.id !== 'noomi' && living[m.id].draw(t)) R.updateArt(m.id);
    };
  }
  S.audio = { night: +nn.toFixed(3), dawn: +dd.toFixed(3), camZ: +cam.z.toFixed(1), sync: +syncBreath(t).toFixed(4) };
  return S;
}

// sub-frames: enough that nothing moves more than ~2.5 px between two of them
function subframes(t) {
  const sh = meta.shutter / meta.fps / 2;
  const a = state(t - sh), c = state(t + sh);
  let d = 0;
  const ca = a.cam, cc = c.cam;
  d = Math.max(d, Math.abs(ca.z - cc.z) * 0.6, Math.abs(ca.h - cc.h) * 1.2, Math.abs(ca.horizon - cc.horizon), Math.abs(ca.x - cc.x) * 1.2);
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
