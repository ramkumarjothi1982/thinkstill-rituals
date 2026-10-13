// "My Brain at 2 AM" — Hushmallow Infinite Studio, video 1.
// Noomi (approved rig) in the Moonmilk Cove (approved realm). 15 s, 9:16.
//
//   0–3 s    HOOK         sleepy Noomi, "ME TRYING TO SLEEP AT 2 AM…", a memory
//                         pings, eyes SNAP open (camera punch-in), double blink
//   3–7 s    OVERTHINKING thoughts pop from Noomi's head; eyes chase them;
//                         orbit accelerates; tremble, sweat, cold vignette
//   7–12 s   HUSHMALLOW   eyes close; one huge inhale (stretch, camera leans in),
//                         a soft crest, a longer sighing exhale (squish, camera
//                         opens out) — thoughts slow, drift off and break into
//                         glowing dust; the cove stills, aurora, warm moonlight;
//                         gentle squeeze-and-release; eyes open, tiny smile
//   12–15 s  ENDING       blink + sleepy smile; "Give your feelings somewhere
//                         soft to land."; hushmallow.com + logo; Noomi drifts
//                         back to sleep (pose matches frame 0 for a soft loop)
//
// Every value here is creative direction; the engines do the animation.

import { clamp, lerp, smoothstep, smootherstep, springStep, wobble, ease, track, spline, fbm, TAU, rgba, mixHex, makeCanvas } from '../stage/components/anim.js';
import { ThoughtField } from '../stage/components/thought-bubbles.js';
import { Caption, BRAND } from '../stage/components/captions.js';
import { Bokeh } from '../stage/components/bokeh.js';
import { EndCard } from '../stage/components/endcard.js';

const meta = {
  id: 'my-brain-at-2am',
  title: 'My Brain at 2 AM',
  fps: 30, duration: 15, substeps: 2,
  mallow: 'noomi', realm: 'moonmilk-cove',
  groundY: 0.8, fit: 0.49, realmDpr: 1.8, skinHeadroom: 1.4, preroll: 75,
};

// ------------------------------------------------------------- beats --
const B = {
  hookIn: -0.25,
  nuzzle: 0.8,                 // sleepy settle
  ping: 1.22,                  // the memory twinkles above Noomi's head
  stir: 1.34,                  // still asleep: the smile falls, brows knit
  peek: 1.52,                  // one eye cracks open
  antic: 1.72,                 // tiny compress before the take
  startle: 1.8,                // eyes SNAP open
  blink1: 2.3, blink2: 2.47,
  glance: 2.62,
  b1: 3.05, b2: 3.72, b3: 4.15,
  sweat: 4.3,
  orbitStart: 5.0, orbitFull: 5.5,
  minis: [5.2, 5.45, 5.7, 5.95],
  panic: 6.0,
  close: 7.0,
  inhale: 7.15, crest: 8.35, exhale: 8.55, exhaleEnd: 10.35,
  squish: 10.35, release: 10.7, relaxed: 10.95,
  open: 11.45,
  blink3: 12.05,
  endLine: 12.1,
  url: 12.95,
  droop: 13.6, sleep: 13.95, sleepEnd: 14.25,
};
const POP = 0.21;              // tail dots → bubble shell pop delay (thought-bubbles.js)

// ------------------------------------------------------------- poses --
// Raw rig parameters (absolute). Anything omitted = Noomi's approved rest.
// breath/breathRate are pinned: the breath is driven directly (substep()).
const BREATH = { breath: 7, breathRate: 0 };
const P = {
  sleep: { ...BREATH, blush: 1.1 },
  stir: { ...BREATH, eyeOpen: 0, closedCurve: 0.15, browAlpha: 0.55, browTilt: 0.6, browY: 0.1, mouthSmile: 0.05, mouthWidth: 0.85, blush: 1.0 },
  peek: { ...BREATH, eyeOpen: 0.3, wink: 1, closedCurve: 0.6, browAlpha: 0.6, browTilt: 0.5, browY: 0.3, mouthSmile: 0, mouthWidth: 0.8, blush: 1.0 },
  startle: { ...BREATH, eyeOpen: 1.38, eyeScale: 1.16, irisScale: 0.62, sparkle: 1.0, browAlpha: 1, browY: 1.15, browTilt: 0.35,
    mouthSmile: -0.25, mouthRound: 1, mouthOpen: 0.6, mouthWidth: 0.55, blush: 0.95 },
  stare: { ...BREATH, eyeOpen: 1.3, eyeScale: 1.13, irisScale: 0.72, browAlpha: 1, browY: 0.82, browTilt: 0.2,
    mouthSmile: -0.12, mouthRound: 0.35, mouthOpen: 0.1, mouthWidth: 0.8, blush: 0.95 },
  worry: { ...BREATH, eyeOpen: 1.18, eyeScale: 1.1, irisScale: 0.78, browAlpha: 1, browY: 0.5, browTilt: 0.8,
    mouthSmile: -0.38, mouthWave: 0.6, mouthWidth: 0.78, mouthOpen: 0.06, blush: 0.95 },
  fret: { ...BREATH, eyeOpen: 1.22, eyeScale: 1.12, irisScale: 0.7, browAlpha: 1, browY: 0.62, browTilt: 0.95,
    mouthSmile: -0.45, mouthWave: 0.85, mouthTremble: 0.35, mouthWidth: 0.72, mouthOpen: 0.1, tremble: 1.1,
    squashBias: 0.03, shrink: 0.06, blush: 0.9, blushLines: 0.45 },
  panic: { ...BREATH, eyeOpen: 1.36, eyeScale: 1.18, irisScale: 0.55, wet: 0.5, browAlpha: 1, browY: 1.05, browTilt: 1.25,
    mouthSmile: -0.62, mouthRound: 0.2, mouthOpen: 1.0, mouthWidth: 1.0, mouthTremble: 1.0, mouthWave: 0.8,
    tremble: 2.4, squashBias: 0.06, shrink: 0.14, blush: 0.85, blushLines: 1 },
  close: { ...BREATH, eyeOpen: 0, closedCurve: 0.9, browAlpha: 0.45, browY: 0.15, browTilt: 0.45,
    mouthSmile: 0.05, mouthWidth: 0.8, blush: 1.0 },
  inhale: { ...BREATH, eyeOpen: 0, closedCurve: 0.6, browAlpha: 0.55, browY: 0.9, browTilt: 0.15,
    mouthSmile: 0, mouthRound: 1, mouthOpen: 0.32, squashBias: -0.12, float: 0.3, blush: 1.25 },
  crest: { ...BREATH, eyeOpen: 0, closedCurve: 0.7, browAlpha: 0.45, browY: 0.85, browTilt: 0.12,
    mouthSmile: 0.25, mouthRound: 0.7, mouthOpen: 0.16, squashBias: -0.14, float: 0.34, blush: 1.35 },
  exhale: { ...BREATH, eyeOpen: 0, closedCurve: 0.85, browAlpha: 0, browY: 0.0, browTilt: 0.3,
    mouthSmile: 0.25, mouthRound: 1, mouthOpen: 0.5, squashBias: 0.14, float: 0, blush: 1.4 },
  exhaleTail: { ...BREATH, eyeOpen: 0, closedCurve: 1, browAlpha: 0, mouthSmile: 0.6, mouthRound: 0.45, mouthOpen: 0.12,
    squashBias: 0.05, blush: 1.35 },
  squish: { ...BREATH, eyeOpen: 0, closedCurve: 1, mouthSmile: 0.5, mouthRound: 0.3, mouthOpen: 0.05, squashBias: 0.22, blush: 1.45 },
  relaxed: { ...BREATH, blush: 1.35 },
  peace: { ...BREATH, eyeOpen: 0.45, lidTop: 0, lidBot: 0.5, closedCurve: -1, irisScale: 1.12, sparkle: 1.2,
    mouthSmile: 0.55, mouthWidth: 0.6, blush: 1.6 },
  sleepy: { ...BREATH, eyeOpen: 0.3, lidTop: 0.45, lidBot: 0.4, closedCurve: -1, irisScale: 1.1, sparkle: 1.1,
    mouthSmile: 0.5, mouthWidth: 0.6, blush: 1.55 },
  peaceShut: { ...BREATH, eyeOpen: 0, lidBot: 0.5, closedCurve: -1, mouthSmile: 0.55, mouthWidth: 0.6, blush: 1.5 },
  sleepShut: { ...BREATH, eyeOpen: 0, closedCurve: 1, mouthSmile: 0.7, mouthWidth: 0.8, blush: 1.4 },
  sleepEnd: { ...BREATH, blush: 1.3 },
};

const POSES = [
  [-99, P.sleep], [B.stir, P.stir], [B.peek, P.peek], [B.startle, P.startle], [2.15, P.stare],
  [B.b1 - 0.05, P.worry], [B.b3, P.fret], [B.panic, P.panic], [B.close, P.close],
  [B.inhale, P.inhale], [B.crest, P.crest], [B.exhale, P.exhale], [10.0, P.exhaleTail],
  [B.squish, P.squish], [B.release, P.relaxed],
  [B.open, { ...P.peace, eyeOpen: 0.32 }], [B.open + 0.25, P.peace],
  [B.blink3, P.peaceShut], [B.blink3 + 0.26, P.peace],              // slow, sleepy blink
  [B.droop, P.sleepy], [B.sleep, P.sleepShut], [B.sleepEnd, P.sleepEnd],
];

// breath signal s(t) ∈ [-1, 1]  (+ = inhaled: taller & narrower)
const sleepBreath = (t) => 0.45 * Math.sin(TAU * 0.42 * t + 0.4);
function pant(t) {
  // quickening, visible anxious breathing (≈3 % of height)
  const u = clamp((t - 3) / 4);
  const ph = TAU * (1.6 * (t - 3) + 0.7 * u * (t - 3));        // 1.6 → 3.0 Hz
  return 0.37 + 0.3 * Math.sin(ph) * (0.45 + 0.55 * smoothstep(3, 6, t));
}
function breathSignal(t) {
  if (t < B.startle) return sleepBreath(t);
  if (t < 3.0) {
    const gasp = springStep(t - B.startle, 3.2, 0.5);        // sharp gasp in
    return lerp(sleepBreath(B.startle), 0.55, gasp) - 0.18 * smoothstep(2.2, 3.0, t);
  }
  if (t < B.close) return pant(t);
  if (t < B.inhale) return lerp(pant(B.close), -0.12, ease.inOutSine(clamp((t - B.close) / (B.inhale - B.close))));
  if (t < B.crest) return lerp(-0.12, 1, ease.inOutSine(clamp((t - B.inhale) / (B.crest - B.inhale))));
  if (t < B.exhale) return 1 - 0.03 * smoothstep(B.crest, B.exhale, t);       // a soft crest, not a hold
  if (t < B.exhaleEnd) {
    const u = clamp((t - B.exhale) / (B.exhaleEnd - B.exhale));
    return lerp(0.97, -0.78, 1 - Math.pow(1 - ease.inOutSine(u), 1.5));      // a long sigh
  }
  if (t < B.release) return lerp(-0.78, -0.62, smoothstep(B.exhaleEnd, B.release, t));
  if (t < 11.2) return lerp(-0.62, 0, ease.inOutSine(clamp((t - B.release) / (11.2 - B.release))));
  return 0.36 * Math.sin(TAU * 0.3 * (t - 11.2));
}

// --------------------------------------------------------- the layers --
const HOOK = new Caption({
  lines: ['ME TRYING TO SLEEP', '*AT 2 AM...*'], x: 540, y: 318, size: 88, weight: 700, lineHeight: 1.1,
  enterAt: B.hookIn, stagger: 0.065, exitAt: 4.35, exitDur: 0.45, outlineW: 0.17,
});
const END = new Caption({
  lines: ['Give your feelings', 'somewhere soft to land.'], x: 540, y: 352, size: 70, weight: 600, lineHeight: 1.16,
  enterAt: B.endLine, stagger: 0.05, wordDur: 0.5, style: 'fade', outlineW: 0.14,
  glow: 'rgba(255,190,140,0.5)',
});

// ------------------------------------------------------------ setup --
let field, bokeh, endcard, actor, realm, stageRef;
const fired = new Set();
let lastPose = null;
let headLag = null;             // thoughts trail the head with follow-through
let lastDart = -1;

function fireOnce(key, t, at, fn) {
  if (t >= at && !fired.has(key)) { fired.add(key); fn(); }
}

const ORBIT_SPEED = [[0, 0], [B.orbitStart, 0], [5.5, 1.0], [6.1, 2.4], [6.7, 3.8], [7.0, 4.0], [7.4, 2.6], [7.9, 1.0], [8.35, 0.25], [8.6, 0]];
const ANX = [[0, 0], [4.6, 0], [5.6, 0.35], [6.95, 1], [7.25, 0.2], [8.0, 0]];
const TREMBLE = [[0, 0], [B.b3, 0], [B.panic, 0.4], [6.9, 1], [B.close, 1], [7.25, 0]];
const warmOf = (t) => smootherstep(B.exhale + 0.1, 11.8, t);

async function setup(stage) {
  stageRef = stage;
  actor = stage.actor;
  realm = stage.realm;
  field = new ThoughtField({
    fontSize: 34,
    bubbles: [
      { lines: ['That awkward', 'conversation.'], appearAt: B.b1, home: [-168, -128], tailFrom: [-50, 10] },
      { lines: ['Did I say', 'something weird?'], appearAt: B.b2, home: [150, -222], tailFrom: [40, 0] },
      { lines: ['Why did I', 'do that?'], appearAt: B.b3, home: [182, -78], tailFrom: [60, 18] },
    ],
    minis: [
      { glyph: '?', appearAt: B.minis[0], home: [-262, -12], size: 40 },
      { glyph: '!', appearAt: B.minis[1], home: [262, -170], size: 40 },
      { glyph: '??', appearAt: B.minis[2], home: [-40, -318], size: 36 },
      { glyph: '?!', appearAt: B.minis[3], home: [-250, -262], size: 36 },
    ],
    orbit: {
      start: B.orbitStart, full: B.orbitFull, rx: 196, ry: 76, cy: -200,
      expand: (t) => 1 + 0.25 * smootherstep(B.close, B.crest, t),
      lift: (t) => -55 * smootherstep(B.close, B.crest, t),
      speed: ORBIT_SPEED,
    },
    topSafe: (t) => { const c = camera(t); return c.y - (960 - 240) / (1.5 * c.zoom); },
    dissolve: { at: B.exhale + 0.08, stagger: 0.11 },
    stress: (t) => track([[0, 0], [4.3, 0], [5.3, 0.45], [6.9, 1], [7.3, 0.3], [8.2, 0]], t),
  });
  bokeh = new Bokeh();
  endcard = new EndCard({ appearAt: B.url, y: 575, gap: 64 });
  await endcard.load();
  // register bubble sound events in the cue log (with stage-space pan)
  for (const e of field.events) stage.cue(e.t, e.type, { id: e.id, pan: e.pan, step: e.step });
}

// ---------------------------------------------------------- camera --
function camera(t) {
  // zoom / focus keys (focus in world px; the frame centre looks at focus).
  // A monotone spline flows through the keys; the inhale pushes in and the
  // exhale opens out, so the camera breathes with Noomi.
  const zoom = spline([
    [-9, 1.06], [0, 1.06], [1.78, 1.2], [2.7, 1.26], [3.55, 1.0], [4.8, 1.02], [6.95, 1.15],
    [B.inhale, 1.12], [B.crest, 1.17], [B.exhale, 1.17], [B.exhaleEnd, 1.02], [11.6, 1.0], [15, 1.075],
  ], t);
  const fy = spline([
    [-9, 770], [0, 770], [1.78, 800], [2.7, 820], [3.55, 735], [4.8, 737], [6.95, 772],
    [B.inhale, 770], [B.crest, 745], [B.exhale, 745], [B.exhaleEnd, 700], [11.6, 690], [15, 716],
  ], t);
  // punch-in on the startle: fast spring with overshoot, released before thought 1 pops
  const punch = t >= B.startle ? springStep(t - B.startle, 2.4, 0.38) * (1 - smoothstep(2.65, 3.3, t)) : 0;
  let z = zoom + 0.1 * punch;
  let y = fy + 34 * punch;
  // orbit-feel drift + handheld shake as the thoughts spiral
  const anx = track(ANX, t);
  const x = 360 + Math.sin(t * 1.3) * 7 * anx + fbm(t * 3.1, 2) * 9 * anx;
  y += fbm(t * 2.7, 5) * 7 * anx;
  const roll = (-1.9 * Math.PI / 180) * track([[0, 0], [5.2, 0], [6.95, 1, ease.inOutSine], [B.inhale, 1], [B.crest, 0, ease.inOutSine]], t)
    + fbm(t * 2.2, 9) * 0.006 * anx;
  // startle shake (decaying)
  const ts = t - B.startle;
  const shake = ts > 0 ? Math.exp(-ts * 9) * 11 : 0;
  const ox = shake * Math.sin(ts * 71), oy = shake * Math.cos(ts * 53) * 0.6;
  // shallow depth of field: the painted world softens as the lens pushes in
  const bgBlur = lerp(1.0, 2.6, clamp((z - 1) / 0.35));
  return { zoom: z, x, y, roll, ox, oy, bgDepth: 0.55, bgBlur };
}

// ----------------------------------------------------------- grade --
function grade(t) {
  const warm = warmOf(t);
  const night = 1 - warm;
  const anx = track([[0, 0], [4.6, 0], [6.95, 1], [7.4, 0.3], [8.4, 0]], t);
  const fadeOut = smoothstep(14.5, 15.0, t);
  return {
    bloom: lerp(0.3, 0.36, warm), bloomRadius: 16,
    tint: { top: mixHex('#5f4fd0', '#3d3aa8', anx), bottom: '#2a1f78', amount: (0.3 + 0.12 * anx) * (1 - 0.55 * warm) + 0.06, bottomK: 0.8 },
    warm: { top: '#ffbf72', bottom: '#ffb877', amount: 0.32 * warm, bottomK: 0.9 },
    moonCore: { color: '#fff1d6', amount: 0.72 * smoothstep(B.exhale + 0.4, 11.2, t), scale: 1.02 },
    glow: { followMoon: true, x: 790, y: 330, r: 440, color: mixHex('#b3a6ff', '#ffc77e', warm), amount: lerp(0.08, 0.14, warm) },
    base: `brightness(${(1 - 0.12 * anx - 0.06 * warm).toFixed(3)}) contrast(${lerp(1.1, 1.2, warm).toFixed(3)}) saturate(${(lerp(1.0, 1.12, warm) - 0.12 * anx).toFixed(3)})`,
    vignette: 0.5 + 0.42 * anx, vignetteCy: 0.56, vignetteInner: lerp(0.28, 0.2, anx),
    grain: 0.042,
    fade: { color: '#06040f', amount: fadeOut * 0.12 },
  };
}

function light(t) {
  const warm = warmOf(t);
  const anx = track([[0, 0], [4.6, 0], [6.95, 1], [7.4, 0.3], [8.4, 0]], t);
  return {
    rim: { color: mixHex('#cfc4ff', '#ffc98a', warm), amount: lerp(0.55, 0.75, warm), width: 13, dx: 0.62, dy: -0.78, soft: 2.5 },
    halo: { color: mixHex(mixHex('#7f6cff', '#ff6fc0', anx * 0.8), '#ffcf8f', warm), amount: lerp(0.32, 0.46, warm) + 0.1 * anx, blur: 30 },
    shade: { key: mixHex('#ece8ff', '#ffd59a', warm), keyAmount: lerp(0.1, 0.24, warm), fill: mixHex('#4a3fa0', '#5a2f78', warm),
      amount: lerp(0.18, 0.2, warm), occlusion: 0.22, dx: 0.62, dy: -0.78 },
  };
}

// ------------------------------------------------------- realm mood --
function realmMood(t) {
  const agit = track([[-9, 0.08], [B.startle, 0.08], [2.2, 0.3], [4.0, 0.5], [6.95, 0.92], [B.inhale, 0.92], [8.2, 0.15], [B.exhale, 0.05]], t);
  const heavy = track([[-9, 0.12], [4.0, 0.24], [6.95, 0.68], [B.inhale, 0.68], [8.3, 0.12], [B.exhale, 0.05]], t);
  const clar = track([[-9, 0.8], [1.8, 0.78], [4.0, 0.42], [6.95, 0.18], [B.inhale, 0.2], [B.exhale, 0.55], [11, 0.95]], t);
  const warmth = track([[-9, 0.3], [6.95, 0.22], [B.exhale, 0.3], [11.2, 0.6]], t);
  const tf = smootherstep(B.exhale - 0.1, 11.6, t);
  return { mood: { agitation: agit, heaviness: heavy, clarity: clar, warmth }, transform: tf };
}

// ------------------------------------------------------- eye targets --
function gaze(t, head) {
  // returns [lookX, lookY] or null (eyes closed / free)
  if (t < B.peek) return null;
  if (t < B.startle) return [0.35, -0.25];             // the cracked eye peeks at the twinkle
  if (t >= B.close) return null;
  if (t < B.glance) return [0.12, -0.42];              // wide stare, up at the memory
  if (t < B.b1 + 0.2) return [-0.62, -0.3];            // suspicious glance toward where thought 1 appears
  const items = field.positions(t, head);
  if (!items.length) return [-0.5, -0.3];
  const toLook = (p) => {
    const e = actor.eyeMid;
    return [clamp((p.x - e.x) / 120, -1, 1), clamp((p.y - e.y) / 210, -0.55, 0.6)];
  };
  // newest bubble wins for its first 0.6 s (reading it)
  const newest = items.reduce((a, b) => (b.appearAt > a.appearAt ? b : a));
  if (t < B.orbitStart + 0.3) {
    if (t - newest.appearAt < 0.6) return toLook(newest);
    const older = items.filter((p) => p !== newest);
    const k = Math.floor((t - B.b1) / 0.42);
    return toLook(older.length ? older[k % older.length] : newest);
  }
  // darting: faster and faster; every third switch flicks down/away, and the
  // head turns a touch with the eyes
  const rate = lerp(4, 7.5, smoothstep(5.3, 6.9, t));
  const k = Math.floor((t - B.orbitStart) * rate + Math.sin(t * 3) * 0.3);
  let look;
  if (k % 3 === 2) look = [k % 2 ? 0.55 : -0.55, 0.4];
  else look = toLook(items[(k * 5 + 3) % items.length]);
  if (k !== lastDart) { lastDart = k; actor.impulse({ tilt: 0.03 * Math.sign(look[0] || 1) }); }
  return look;
}

// ---------------------------------------------------------- direct --
function direct(t, dt, stage, info = {}) {
  // thoughts follow the head with a little lag (follow-through, not glued on)
  const head = actor.headTop;
  if (!headLag) headLag = { ...head };
  headLag.x += (head.x - headLag.x) * 0.2;
  headLag.y += (head.y - headLag.y) * 0.2;
  const anchor = { x: headLag.x, y: headLag.y };

  // pose (springs do the transitions)
  let pose = POSES[0][1];
  for (const [at, p] of POSES) if (t >= at) pose = p;
  if (pose !== lastPose) { actor.pose(pose); lastPose = pose; }

  // realm
  const rm = realmMood(t);
  realm.setMood(rm.mood).transform(rm.transform);

  // the stir is subtle: fade the approved rest art out instead of cutting
  actor.restFade = t >= B.stir - 0.05 && t < B.peek ? 0.22 : 0;

  if (!info.preroll) {
    fireOnce('z0', t, 0.35, () => actor.particles.spawn('z', 0, 1));
    fireOnce('nuzzle', t, B.nuzzle, () => actor.impulse({ squash: 0.12, tilt: 0.02 }));
    fireOnce('ping', t, B.ping, () => stage.cue(B.ping, 'ping'));
    fireOnce('stir', t, B.stir, () => stage.cue(B.stir, 'stir'));
    fireOnce('peek', t, B.peek, () => { actor.val.eyeOpen = 0.24; actor.vel.eyeOpen = 0; stage.cue(B.peek, 'peek'); });
    fireOnce('antic', t, B.antic, () => actor.impulse({ squash: 0.25 }));
    fireOnce('startle', t, B.startle, () => {
      actor.val.eyeOpen = 1.05; actor.vel.eyeOpen = 22;          // eyes POP open
      actor.val.eyeScale = 1.0; actor.vel.eyeScale = 6;
      actor.val.wink = 0; actor.vel.wink = 0;
      // the mouth gasps WITH the eyes (no lingering smile)
      actor.val.mouthSmile = -0.15; actor.vel.mouthSmile = 0;
      actor.val.mouthRound = 0.75; actor.vel.mouthRound = 0;
      actor.val.mouthOpen = 0.3; actor.vel.mouthOpen = 12;
      actor.val.browAlpha = 1;
      actor.impulse({ squash: -0.85, hop: 0.2 });
      actor.burst('exclaim', 1).burst('moon', 6);
      stage.cue(B.startle, 'startle');
    });
    fireOnce('blink1', t, B.blink1, () => { actor.blinkNow(); stage.cue(B.blink1, 'blink'); });
    fireOnce('blink2', t, B.blink2, () => { actor.blinkNow(); stage.cue(B.blink2, 'blink'); });
    fireOnce('glance', t, B.glance, () => stage.cue(B.glance, 'glance'));
    // an escalating flinch as each thought lands
    fireOnce('flinch1', t, B.b1 + POP, () => actor.impulse({ squash: 0.15, lean: -0.12 }));
    fireOnce('flinch2', t, B.b2 + POP, () => actor.impulse({ squash: 0.22, lean: 0.12 }));
    fireOnce('flinch3', t, B.b3 + POP, () => actor.impulse({ squash: 0.35 }));
    fireOnce('sweat', t, B.sweat, () => stage.cue(B.sweat, 'sweat'));
    fireOnce('panic', t, B.panic, () => { actor.impulse({ squash: 0.45, shear: 0.25 }); stage.cue(B.panic, 'panic'); });
    fireOnce('close', t, B.close, () => { actor.vel.eyeOpen = -26; actor.impulse({ squash: 0.12 }); stage.cue(B.close, 'close'); });
    fireOnce('inhale', t, B.inhale, () => { actor.impulse({ squash: -0.06 }); stage.cue(B.inhale, 'inhale', { dur: B.crest - B.inhale }); });
    fireOnce('exhale', t, B.exhale, () => {
      actor.impulse({ squash: 0.18 });
      actor.val.browAlpha = Math.min(actor.val.browAlpha, 0.15); actor.vel.browAlpha = -8;
      realm.pulse('ripple', 0.5, 0.79);
      stage.cue(B.exhale, 'exhale', { dur: B.exhaleEnd - B.exhale });
    });
    fireOnce('squish', t, B.squish, () => stage.cue(B.squish, 'squish', { dur: B.release - B.squish }));
    fireOnce('release', t, B.release, () => {
      actor.impulse({ squash: -0.4, shear: 0.12 });
      actor.burst('moon', 8);
      stage.cue(B.release, 'release');
    });
    fireOnce('open', t, B.open, () => {
      actor.val.closedCurve = -0.9;
      actor.impulse({ squash: 0.15 });
      actor.burst('moon', 5);
      realm.pulse('success', 0.5, 0.78);
      stage.cue(B.open, 'open');
    });
    fireOnce('blink3', t, B.blink3, () => { actor.impulse({ squash: 0.12 }); stage.cue(B.blink3, 'blink', { soft: true, dur: 0.26 }); });
    fireOnce('endline', t, B.endLine, () => stage.cue(B.endLine, 'endline'));
    fireOnce('url', t, B.url, () => stage.cue(B.url, 'chime'));
    fireOnce('sleep', t, B.sleep, () => { actor.impulse({ squash: 0.2 }); stage.cue(B.sleep, 'sleep'); });
    fireOnce('z1', t, 14.25, () => actor.particles.spawn('z', 0, 1));
  } else if (t > -1.6 && !fired.has('zpre')) {
    fired.add('zpre');
    actor.particles.spawn('z', 0, 1);
  }

  // gaze
  const g = gaze(t, anchor);
  if (g) actor.look(g[0], g[1]);
  else if (t >= B.open && t < B.sleep) actor.look(0, 0.08);       // peaceful: softly at the viewer
  else actor.look(0, 0);

  const cam = camera(t);
  const lt = light(t);
  const gr = grade(t);
  const tremble = track(TREMBLE, t);
  const warmK = warmOf(t);
  // the inhale fills Noomi with air (a soft volume swell, not just a stretch)
  const inflate = 1 + (t >= B.inhale && t < B.exhaleEnd + 0.6 ? 0.055 * Math.max(0, breathSignal(t)) : 0);

  return {
    audio: {
      anx: +track(ANX, t).toFixed(4),
      orbit: +track(ORBIT_SPEED, t).toFixed(4),
      warm: +warmK.toFixed(4),
      agitation: +rm.mood.agitation.toFixed(4), heaviness: +rm.mood.heaviness.toFixed(4),
      clarity: +rm.mood.clarity.toFixed(4), warmth: +rm.mood.warmth.toFixed(4),
      transform: +rm.transform.toFixed(4), tremble: +tremble.toFixed(4),
      breath: +breathSignal(t).toFixed(4),
    },
    camera: cam, light: lt, grade: gr, tremble, inflate,
    shadowAlpha: 0.55,
    groundGlow: { color: mixHex('#9c86f0', '#ffcf9a', smoothstep(B.exhale, 11.5, t)), amount: lerp(0.1, 0.22, smoothstep(B.exhale, 11.5, t)) },
    drawBack: (ctx) => field.drawBack(ctx, t, anchor),
    drawFront: (ctx) => { drawSweat(ctx, t); drawPing(ctx, t); drawExhaleWave(ctx, t); field.drawFront(ctx, t, anchor); },
    drawForeground: (ctx, tt, c) => bokeh.draw(ctx, t, c, smoothstep(B.exhale, 11.5, t)),
    drawOverlay: (ctx) => { HOOK.draw(ctx, t); END.draw(ctx, t); endcard.draw(ctx, t); },
  };
}

// per substep: the breath (phase = asin(s(t)), amplitude pinned), a soft-body
// shiver while overwhelmed, and lid guards so lids never linger half-shut
function substep(t, dt) {
  const s = clamp(breathSignal(t), -1, 1);
  actor.val.breath = 7; actor.vel.breath = 0;
  actor.val.breathRate = 0; actor.vel.breathRate = 0;
  actor.breathPhase = Math.asin(s);
  const tr = track(TREMBLE, t);
  if (tr > 0.01) {
    actor.body.shear += 0.01 * tr * Math.sin(TAU * 9 * t);
    actor.body.squash += 0.008 * tr * Math.sin(TAU * 11 * t + 1);
  }
  // the rig blends the closed-lid line and the open lash between ~2–30 %
  // openness, which reads as a flat "-_-" squint; skip through that zone
  const tgt = actor.target.eyeOpen, v = actor.val.eyeOpen;
  if (t > 0 && tgt <= 0.02 && v > 0 && v < 0.22) {
    actor.val.eyeOpen = 0; actor.vel.eyeOpen = 0;
    // shut lids take their closed curve at once (no flat "— —" in between)
    actor.val.closedCurve = actor.target.closedCurve; actor.vel.closedCurve = 0;
  }
  else if (t > 0 && tgt >= 0.25 && v < 0.22) { actor.val.eyeOpen = 0.24; actor.vel.eyeOpen = Math.max(0, actor.vel.eyeOpen); }
}

// ----------------------------------------------------- small effects --
function drawSweat(ctx, t) {
  // anime sweat drop on Noomi's right temple, slides and fades on the breath
  const a = smoothstep(B.sweat, B.sweat + 0.15, t) * (1 - smoothstep(B.close, B.close + 0.35, t));
  if (a <= 0.01) return;
  const slide = smoothstep(B.sweat, 6.9, t);
  const p = actor.toStage(372, 158 + slide * 34);
  const pop = springStep(t - B.sweat, 3, 0.4);
  const s = 15 * pop * (1 + 0.06 * Math.sin(t * 9));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(p.x, p.y);
  ctx.rotate(-0.2);
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.6);
  ctx.bezierCurveTo(s * 0.35, -s * 0.7, s * 1.0, -s * 0.1, s * 1.0, s * 0.45);
  ctx.arc(0, s * 0.45, s, 0, Math.PI);
  ctx.bezierCurveTo(-s * 1.0, -s * 0.1, -s * 0.35, -s * 0.7, 0, -s * 1.6);
  const g = ctx.createLinearGradient(0, -s * 1.6, 0, s * 1.5);
  g.addColorStop(0, '#f2fbff');
  g.addColorStop(1, '#7fc8ff');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#1b2a7a';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.ellipse(-s * 0.35, s * 0.35, s * 0.18, s * 0.32, -0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawPing(ctx, t) {
  // the memory arrives: a tiny twinkle above Noomi's head, then it "hits"
  const u = (t - B.ping) / (B.startle - B.ping);
  if (u < 0 || u > 1.35) return;
  const head = actor.headTop;
  const x = head.x + 86, y = head.y - 70 - 18 * Math.min(u, 1);
  const grow = u < 1 ? ease.outBack(clamp(u * 1.6)) : 1 + (u - 1) * 5;
  const a = u < 1 ? 1 : 1 - (u - 1) / 0.35;
  const r = 12 * grow;
  ctx.save();
  ctx.globalAlpha = clamp(a);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  g.addColorStop(0, 'rgba(255,244,200,0.6)');
  g.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  ctx.translate(x, y);
  ctx.rotate(u * 2.4);
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * TAU;
    ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    ctx.lineTo(Math.cos(a0 + TAU / 8) * r * 0.22, Math.sin(a0 + TAU / 8) * r * 0.22);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawExhaleWave(ctx, t) {
  // a soft circle of calm that rolls out from Noomi on the exhale
  const u = (t - B.exhale - 0.05) / 1.9;
  if (u < 0 || u > 1) return;
  const m = actor.bodyMetrics;
  const cx = m.cx, cy = m.top + m.h * 0.55;
  const r = lerp(m.w * 0.45, 820, ease.outCubic(u));
  const a = Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.26 * (1 - u);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
  g.addColorStop(0, 'rgba(255,230,190,0)');
  g.addColorStop(0.6, `rgba(255,228,190,${a * 0.45})`);
  g.addColorStop(0.88, `rgba(255,240,215,${a})`);
  g.addColorStop(1, 'rgba(255,240,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.restore();
}

export default {
  meta,
  initialMood: { agitation: 0.08, heaviness: 0.12, clarity: 0.62, warmth: 0.3 },
  setup, direct, substep,
};
