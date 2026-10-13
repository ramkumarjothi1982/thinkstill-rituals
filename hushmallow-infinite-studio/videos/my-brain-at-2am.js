// "My Brain at 2 AM" — Hushmallow Infinite Studio, video 1.
// Noomi (approved rig) in the Moonmilk Cove (approved realm). 15 s, 9:16.
//
//   0–3 s    HOOK         sleepy Noomi, "ME TRYING TO SLEEP AT 2 AM…", a memory
//                         pings, eyes SNAP open (camera punch-in), double blink
//   3–7 s    OVERTHINKING thoughts pop from Noomi's head; eyes chase them;
//                         orbit accelerates; tremble, sweat, cold vignette
//   7–12 s   HUSHMALLOW   eyes close; one huge inhale (stretch), puffed hold,
//                         long exhale (squish) — thoughts slow, dissolve into
//                         glowing dust; the cove stills, aurora, warm moonlight;
//                         elastic squish-and-release; eyes open, tiny smile
//   12–15 s  ENDING       blink + sleepy smile; "Give your feelings somewhere
//                         soft to land."; hushmallow.com + logo; Noomi drifts
//                         back to sleep (pose matches frame 0 for a soft loop)
//
// Every value here is creative direction; the engines do the animation.

import { clamp, lerp, smoothstep, smootherstep, springStep, wobble, ease, track, fbm, TAU, rgba, mixHex, makeCanvas } from '../stage/components/anim.js';
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
  hookIn: 0.04,
  ping: 1.48,
  startle: 1.8,
  blink1: 2.3, blink2: 2.47,
  glance: 2.62,
  b1: 3.05, b2: 3.72, b3: 4.4,
  sweat: 4.55,
  orbitStart: 5.0, orbitFull: 5.8,
  minis: [5.2, 5.45, 5.7, 5.95],
  peak: 6.75,
  close: 7.0,
  inhale: 7.2, hold: 8.72, exhale: 9.0, exhaleEnd: 10.2,
  squish: 10.3, release: 10.48,
  relaxed: 10.75,
  open: 11.3,
  blink3: 12.3,
  endLine: 12.4,
  url: 13.4,
  sleep: 13.95,
};

// ------------------------------------------------------------- poses --
// Raw rig parameters (absolute). Anything omitted = Noomi's approved rest.
// breath/breathRate are pinned: the breath is driven directly (substep()).
const BREATH = { breath: 7, breathRate: 0 };
const P = {
  sleep: { ...BREATH, blush: 1.1 },
  startle: { ...BREATH, eyeOpen: 1.38, eyeScale: 1.16, irisScale: 0.76, sparkle: 1.25, browAlpha: 1, browY: 1.0, browTilt: 0.12,
    mouthSmile: 0, mouthRound: 0.9, mouthOpen: 0.34, blush: 0.95 },
  stare: { ...BREATH, eyeOpen: 1.3, eyeScale: 1.13, irisScale: 0.72, browAlpha: 1, browY: 0.82, browTilt: 0.2,
    mouthSmile: -0.12, mouthRound: 0.35, mouthOpen: 0.1, mouthWidth: 0.8, blush: 0.95 },
  worry: { ...BREATH, eyeOpen: 1.18, eyeScale: 1.1, irisScale: 0.78, browAlpha: 1, browY: 0.5, browTilt: 0.8,
    mouthSmile: -0.38, mouthWave: 0.6, mouthWidth: 0.78, mouthOpen: 0.06, blush: 0.95 },
  fret: { ...BREATH, eyeOpen: 1.22, eyeScale: 1.12, irisScale: 0.7, browAlpha: 1, browY: 0.62, browTilt: 0.95,
    mouthSmile: -0.45, mouthWave: 0.85, mouthTremble: 0.35, mouthWidth: 0.72, mouthOpen: 0.1, tremble: 1.1,
    squashBias: 0.03, shrink: 0.06, blush: 0.9, blushLines: 0.45 },
  panic: { ...BREATH, eyeOpen: 1.36, eyeScale: 1.18, irisScale: 0.6, browAlpha: 1, browY: 0.9, browTilt: 1.0,
    mouthSmile: -0.5, mouthRound: 0.55, mouthOpen: 0.42, mouthWidth: 0.66, mouthTremble: 0.75, mouthWave: 0.35,
    tremble: 2.4, squashBias: 0.06, shrink: 0.14, blush: 0.85, blushLines: 0.8 },
  close: { ...BREATH, eyeOpen: 0, closedCurve: 0.55, browAlpha: 0.45, browY: 0.15, browTilt: 0.45,
    mouthSmile: 0.05, mouthWidth: 0.8, blush: 1.0 },
  inhale: { ...BREATH, eyeOpen: 0, closedCurve: 0.35, browAlpha: 0.75, browY: 0.75, browTilt: 0.15,
    mouthSmile: 0.15, mouthRound: 0.5, mouthOpen: 0.14, squashBias: -0.12, float: 0.3, blush: 1.25 },
  hold: { ...BREATH, eyeOpen: 0, closedCurve: 0.25, browAlpha: 0.8, browY: 0.85, browTilt: 0.1,
    mouthSmile: 0.2, mouthPout: 0.55, mouthWidth: 0.6, cheekPuff: 1, squashBias: -0.14, float: 0.34, blush: 1.45 },
  exhale: { ...BREATH, eyeOpen: 0, closedCurve: 0.85, browAlpha: 0.3, browY: 0.0, browTilt: 0.3,
    mouthSmile: 0.25, mouthRound: 1, mouthOpen: 0.5, cheekPuff: 0, squashBias: 0.14, float: 0, blush: 1.4 },
  exhaleTail: { ...BREATH, eyeOpen: 0, closedCurve: 1, browAlpha: 0.1, mouthSmile: 0.6, mouthRound: 0.45, mouthOpen: 0.12,
    squashBias: 0.05, blush: 1.35 },
  relaxed: { ...BREATH, blush: 1.35 },
  peace: { ...BREATH, eyeOpen: 0.56, lidTop: 0.26, lidBot: 0.3, closedCurve: -0.6, irisScale: 1.08, sparkle: 1.55,
    mouthSmile: 0.78, mouthWidth: 0.72, blush: 1.55 },
  sleepEnd: { ...BREATH, blush: 1.3 },
};

const POSES = [
  [-99, P.sleep], [B.startle, P.startle], [2.15, P.stare], [B.b1 - 0.05, P.worry], [B.b3, P.fret],
  [6.0, P.panic], [B.close, P.close], [B.inhale, P.inhale], [B.hold, P.hold], [B.exhale, P.exhale],
  [9.75, P.exhaleTail], [B.relaxed, P.relaxed], [B.open, P.peace], [B.sleep, P.sleepEnd],
];

// breath signal s(t) ∈ [-1, 1]  (+ = inhaled: taller & narrower)
function breathSignal(t) {
  if (t < B.startle) return 0.22 * Math.sin(TAU * 0.34 * t + 0.4);
  if (t < 3.0) {
    const gasp = springStep(t - B.startle, 3.2, 0.5);       // sharp gasp in
    const base = 0.22 * Math.sin(TAU * 0.34 * B.startle + 0.4);
    return lerp(base, 0.55, gasp) - 0.18 * smoothstep(2.2, 3.0, t);
  }
  if (t < B.close) {
    // shallow, quickening anxious breathing
    const f = lerp(1.4, 2.4, smoothstep(3, 7, t));
    const ph = TAU * (1.4 * (t - 3) + 0.5 * (f - 1.4) * (t - 3));
    return 0.37 + 0.12 * Math.sin(ph) * (0.6 + 0.4 * smoothstep(3, 6, t));
  }
  if (t < B.inhale) return lerp(0.37, -0.12, ease.inOutSine(clamp((t - B.close) / 0.2)));
  if (t < B.hold) return lerp(-0.12, 1, ease.inOutSine(clamp((t - B.inhale) / (B.hold - B.inhale))));
  if (t < B.exhale) return 1 + 0.015 * Math.sin((t - B.hold) * 40);
  if (t < B.exhaleEnd) return lerp(1, -0.78, ease.outCubic(clamp((t - B.exhale) / (B.exhaleEnd - B.exhale))));
  if (t < 11.0) return lerp(-0.78, 0, ease.inOutSine(clamp((t - B.exhaleEnd) / 0.8)));
  return 0.16 * Math.sin(TAU * 0.24 * (t - 11.0));
}

// --------------------------------------------------------- the layers --
const HOOK = new Caption({
  lines: ['ME TRYING TO SLEEP', '*AT 2 AM...*'], x: 540, y: 318, size: 88, weight: 700, lineHeight: 1.1,
  enterAt: B.hookIn, stagger: 0.065, exitAt: 5.6, exitDur: 0.55, outlineW: 0.17,
});
const END = new Caption({
  lines: ['Give your feelings', 'somewhere soft to land.'], x: 540, y: 352, size: 70, weight: 600, lineHeight: 1.16,
  enterAt: B.endLine, stagger: 0.085, wordDur: 0.75, style: 'fade', outlineW: 0.14,
  glow: 'rgba(255,190,140,0.5)',
});

// ------------------------------------------------------------ setup --
let field, bokeh, endcard, actor, realm, stageRef;
const fired = new Set();
let lastPose = null;

function fireOnce(key, t, at, fn) {
  if (t >= at && !fired.has(key)) { fired.add(key); fn(); }
}

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
      { glyph: '…', appearAt: B.minis[2], home: [-40, -318], size: 38 },
      { glyph: '?!', appearAt: B.minis[3], home: [-250, -262], size: 36 },
    ],
    orbit: {
      start: B.orbitStart, full: B.orbitFull, rx: 196, ry: 96, cy: -150,
      expand: (t) => 1 + 0.4 * smootherstep(B.close, B.hold, t),
      lift: (t) => -92 * smootherstep(B.close, B.hold, t),
      speed: [[0, 0], [B.orbitStart, 0], [B.orbitFull, 0.95], [6.4, 1.7], [6.95, 2.7], [7.4, 1.7], [8.0, 0.55], [8.8, 0.12], [9.2, 0]],
    },
    dissolve: { at: B.exhale + 0.08, stagger: 0.11 },
    stress: (t) => track([[0, 0], [4.3, 0], [5.3, 0.45], [6.9, 1], [7.3, 0.3], [8.4, 0]], t),
  });
  bokeh = new Bokeh();
  endcard = new EndCard({ appearAt: B.url, y: 575, gap: 64 });
  await endcard.load();
  // register bubble sound events in the cue log (with stage-space pan)
  for (const e of field.events) stage.cue(e.t, e.type, { id: e.id, pan: e.pan, step: e.step });
}

// ---------------------------------------------------------- camera --
function camera(t) {
  // zoom / focus keyframes (focus in world px; frame centre looks at focus)
  const zoom = track([
    [-9, 1.16], [0, 1.16], [B.startle - 0.02, 1.2, ease.inOutSine],
    [3.0, 1.26], [3.6, 1.0, ease.inOutCubic], [5.0, 1.03], [6.95, 1.15, ease.inOutSine],
    [B.inhale, 1.15], [B.hold, 1.03, ease.inOutSine], [B.exhale, 1.03], [11.6, 1.0, ease.inOutSine],
    [15, 1.075, ease.inOutSine],
  ], t);
  const fy = track([
    [-9, 792], [0, 792], [B.startle, 800], [3.0, 820], [3.6, 735, ease.inOutCubic], [5.0, 738],
    [6.95, 772, ease.inOutSine], [B.inhale, 772], [B.hold, 712, ease.inOutSine], [B.exhale, 712],
    [11.6, 690, ease.inOutSine], [15, 716, ease.inOutSine],
  ], t);
  // punch-in on the startle: fast spring with overshoot, settles into "stare"
  const punch = t >= B.startle ? springStep(t - B.startle, 2.4, 0.38) * (1 - smoothstep(2.9, 3.55, t)) : 0;
  let z = zoom + 0.1 * punch;
  let y = fy + 34 * punch;
  // orbit-feel drift + handheld shake as the thoughts spiral
  const anx = track([[0, 0], [4.6, 0], [5.6, 0.35], [6.95, 1], [7.25, 0.2], [8.0, 0]], t);
  const x = 360 + Math.sin(t * 1.3) * 7 * anx + fbm(t * 3.1, 2) * 9 * anx;
  y += fbm(t * 2.7, 5) * 7 * anx;
  const roll = (-1.9 * Math.PI / 180) * track([[0, 0], [5.2, 0], [6.95, 1, ease.inOutSine], [B.inhale, 1], [B.hold, 0, ease.inOutSine]], t)
    + fbm(t * 2.2, 9) * 0.006 * anx;
  // startle shake (decaying)
  const ts = t - B.startle;
  const shake = ts > 0 ? Math.exp(-ts * 9) * 11 : 0;
  const ox = shake * Math.sin(ts * 71), oy = shake * Math.cos(ts * 53) * 0.6;
  // exhale "whoomp": the camera eases back with the release
  const ex = t > B.exhale ? Math.exp(-(t - B.exhale) * 3.2) * Math.sin((t - B.exhale) * 9) * 0.012 : 0;
  return { zoom: z - ex, x, y, roll, ox, oy, bgDepth: 0.55 };
}

// ----------------------------------------------------------- grade --
function grade(t) {
  const warm = smootherstep(B.exhale + 0.1, 11.8, t);
  const night = 1 - warm;
  const anx = track([[0, 0], [4.6, 0], [6.95, 1], [7.4, 0.3], [8.4, 0]], t);
  const fadeIn = 1 - smoothstep(0, 0.22, t);
  const fadeOut = smoothstep(14.5, 15.0, t);
  return {
    bloom: lerp(0.3, 0.38, warm), bloomRadius: 16,
    tint: { top: mixHex('#5f4fd0', '#6a3fd8', anx), bottom: '#2a1f78', amount: (0.3 + 0.12 * anx) * night + 0.06, bottomK: 0.8 },
    warm: { top: '#ffbf72', bottom: '#ffa0b4', amount: 0.4 * warm, bottomK: 0.6 },
    glow: { followMoon: true, x: 790, y: 330, r: 820, color: mixHex('#b3a6ff', '#ffd9a6', warm), amount: lerp(0.08, 0.3, warm) },
    base: `contrast(${lerp(1.1, 1.07, warm).toFixed(3)}) saturate(${lerp(1.06, 1.12, warm).toFixed(3)})`,
    vignette: lerp(0.5, 0.42, warm) + 0.24 * anx, vignetteCy: 0.56,
    grain: 0.042,
    fade: { color: '#06040f', amount: Math.max(fadeIn * 0.22, fadeOut * 0.12) },
  };
}

function light(t) {
  const warm = smootherstep(B.exhale + 0.1, 11.8, t);
  const anx = track([[0, 0], [4.6, 0], [6.95, 1], [7.4, 0.3], [8.4, 0]], t);
  return {
    rim: { color: mixHex('#cfc4ff', '#ffe3b4', warm), amount: lerp(0.55, 0.75, warm), width: 9, dx: 0.62, dy: -0.78, soft: 2.5 },
    halo: { color: mixHex(mixHex('#7f6cff', '#ff6fc0', anx * 0.8), '#ffcf8f', warm), amount: lerp(0.32, 0.46, warm) + 0.1 * anx, blur: 30 },
    shade: { key: mixHex('#ece8ff', '#fff0d8', warm), keyAmount: lerp(0.1, 0.14, warm), fill: mixHex('#2a1f78', '#5a2f78', warm),
      amount: lerp(0.3, 0.2, warm), occlusion: 0.32, dx: 0.62, dy: -0.78 },
  };
}

// ------------------------------------------------------- realm mood --
function realmMood(t) {
  const agit = track([[-9, 0.08], [B.startle, 0.08], [2.2, 0.3], [4.0, 0.5], [6.95, 0.92], [B.inhale, 0.92], [8.5, 0.15], [B.exhale, 0.05]], t);
  const heavy = track([[-9, 0.12], [4.0, 0.2], [6.95, 0.42], [B.inhale, 0.42], [8.6, 0.1], [B.exhale, 0.05]], t);
  const clar = track([[-9, 0.62], [4.0, 0.42], [6.95, 0.18], [B.inhale, 0.2], [B.exhale, 0.55], [11, 0.95]], t);
  const warmth = track([[-9, 0.3], [6.95, 0.22], [B.exhale, 0.3], [11.2, 0.9]], t);
  const tf = smootherstep(B.exhale - 0.1, 11.6, t);
  return { mood: { agitation: agit, heaviness: heavy, clarity: clar, warmth }, transform: tf };
}

// ------------------------------------------------------- eye targets --
function gaze(t, head) {
  // returns [lookX, lookY] or null (eyes closed / free)
  if (t < B.startle || t >= B.close) return null;
  if (t < B.glance) return [0.12, -0.42];              // wide stare, up at the memory
  if (t < B.b1 + 0.2) return [-0.62, -0.3];            // suspicious glance toward where thought 1 appears
  const items = field.positions(t, head);
  if (!items.length) return [-0.5, -0.3];
  const toLook = (p) => {
    const e = actor.eyeMid;
    return [clamp((p.x - e.x) / 175, -1, 1), clamp((p.y - e.y) / 210, -1, 0.6)];
  };
  // newest bubble wins for its first 0.55 s (reading it)
  const newest = items.reduce((a, b) => (b.appearAt > a.appearAt ? b : a));
  if (t < B.orbitStart + 0.3) {
    if (t - newest.appearAt < 0.6) return toLook(newest);
    // re-read an older thought, alternating
    const older = items.filter((p) => p !== newest);
    const k = Math.floor((t - B.b1) / 0.42);
    return toLook(older.length ? older[k % older.length] : newest);
  }
  // darting: switch targets faster and faster
  const rate = lerp(4, 7.5, smoothstep(5.3, 6.9, t));
  const k = Math.floor((t - B.orbitStart) * rate + Math.sin(t * 3) * 0.3);
  const pick = items[(k * 5 + 3) % items.length];
  return toLook(pick);
}

// ---------------------------------------------------------- direct --
function direct(t, dt, stage, info = {}) {
  const head = actor.headTop;
  // pose (springs do the transitions)
  let pose = POSES[0][1];
  for (const [at, p] of POSES) if (t >= at) pose = p;
  if (pose !== lastPose) { actor.pose(pose); lastPose = pose; }

  // realm
  const rm = realmMood(t);
  realm.setMood(rm.mood).transform(rm.transform);

  if (!info.preroll) {
    // z's while asleep (pre-roll spawns one so frame 0 already has a z drifting)
    fireOnce('z0', t, 0.35, () => actor.particles.spawn('z', 0, 1));
    fireOnce('ping', t, B.ping, () => stage.cue(B.ping, 'ping'));
    fireOnce('startle', t, B.startle, () => {
      actor.val.eyeOpen = 1.05; actor.vel.eyeOpen = 22;          // eyes POP open
      actor.val.eyeScale = 1.0; actor.vel.eyeScale = 6;
      actor.impulse({ squash: -1.05, hop: 0.2 });
      actor.burst('exclaim', 1).burst('moon', 6);
      stage.cue(B.startle, 'startle');
    });
    fireOnce('blink1', t, B.blink1, () => { actor.blinkNow(); stage.cue(B.blink1, 'blink'); });
    fireOnce('blink2', t, B.blink2, () => { actor.blinkNow(); stage.cue(B.blink2, 'blink'); });
    fireOnce('glance', t, B.glance, () => stage.cue(B.glance, 'glance'));
    fireOnce('sweat', t, B.sweat, () => stage.cue(B.sweat, 'sweat'));
    fireOnce('fret', t, B.b3, () => actor.impulse({ squash: 0.35 }));
    fireOnce('panic', t, 6.0, () => { actor.impulse({ squash: 0.45, shear: 0.25 }); stage.cue(6.0, 'panic'); });
    fireOnce('close', t, B.close, () => { actor.impulse({ squash: 0.3 }); stage.cue(B.close, 'close'); });
    fireOnce('inhale', t, B.inhale, () => { actor.impulse({ squash: -0.32 }); stage.cue(B.inhale, 'inhale', { dur: B.hold - B.inhale }); });
    fireOnce('hold', t, B.hold, () => stage.cue(B.hold, 'hold'));
    fireOnce('exhale', t, B.exhale, () => {
      actor.impulse({ squash: 0.85 });
      realm.pulse('ripple', 0.5, 0.79);
      stage.cue(B.exhale, 'exhale', { dur: B.exhaleEnd - B.exhale });
    });
    fireOnce('squish', t, B.squish, () => { actor.impulse({ squash: 0.95 }); stage.cue(B.squish, 'squish'); });
    fireOnce('release', t, B.release, () => {
      actor.impulse({ squash: -1.15, shear: 0.32, tilt: 0.04 });
      actor.burst('moon', 8);
      stage.cue(B.release, 'release');
    });
    fireOnce('open', t, B.open, () => { actor.impulse({ squash: 0.22 }); actor.burst('moon', 5); realm.pulse('success', 0.5, 0.78); stage.cue(B.open, 'open'); });
    fireOnce('blink3', t, B.blink3, () => { actor.blinkNow(); actor.impulse({ squash: 0.25 }); stage.cue(B.blink3, 'blink', { soft: true }); });
    fireOnce('endline', t, B.endLine, () => stage.cue(B.endLine, 'endline'));
    fireOnce('url', t, B.url, () => stage.cue(B.url, 'chime'));
    fireOnce('sleep', t, B.sleep, () => { actor.impulse({ squash: 0.3 }); stage.cue(B.sleep, 'sleep'); });
    fireOnce('z1', t, 14.25, () => actor.particles.spawn('z', 0, 1));
  } else if (t > -1.6 && !fired.has('zpre')) {
    fired.add('zpre');
    actor.particles.spawn('z', 0, 1);
  }

  // gaze
  const g = gaze(t, head);
  if (g) actor.look(g[0], g[1]);
  else if (t >= B.open && t < B.sleep) actor.look(0.12, -0.32);   // peaceful: up at the stars
  else actor.look(0, 0);

  const cam = camera(t);
  const lt = light(t);
  const gr = grade(t);
  const tremble = track([[0, 0], [B.b3, 0], [6.0, 0.4], [6.9, 1], [B.close, 1], [7.25, 0]], t);

  const warmK = smootherstep(B.exhale + 0.1, 11.8, t);
  return {
    audio: {
      anx: +track([[0, 0], [4.6, 0], [5.6, 0.35], [6.95, 1], [7.25, 0.2], [8.0, 0]], t).toFixed(4),
      orbit: +track(field.o.orbit.speed, t).toFixed(4),
      warm: +warmK.toFixed(4),
      agitation: +rm.mood.agitation.toFixed(4), heaviness: +rm.mood.heaviness.toFixed(4),
      clarity: +rm.mood.clarity.toFixed(4), warmth: +rm.mood.warmth.toFixed(4),
      transform: +rm.transform.toFixed(4), tremble: +tremble.toFixed(4),
    },
    camera: cam, light: lt, grade: gr, tremble,
    shadowAlpha: 0.55,
    groundGlow: { color: mixHex('#9c86f0', '#ffcf9a', smoothstep(B.exhale, 11.5, t)), amount: lerp(0.1, 0.22, smoothstep(B.exhale, 11.5, t)) },
    drawBack: (ctx) => field.drawBack(ctx, t, actor.headTop),
    drawFront: (ctx) => { drawSweat(ctx, t); drawPing(ctx, t); drawExhaleWave(ctx, t); field.drawFront(ctx, t, actor.headTop); },
    drawForeground: (ctx, tt, c) => bokeh.draw(ctx, t, c, smoothstep(B.exhale, 11.5, t)),
    drawOverlay: (ctx) => { HOOK.draw(ctx, t); END.draw(ctx, t); endcard.draw(ctx, t); },
  };
}

// breath is driven per substep: phase = asin(s(t)), amplitude pinned
function substep(t, dt) {
  const s = clamp(breathSignal(t), -1, 1);
  actor.val.breath = 7; actor.vel.breath = 0;
  actor.val.breathRate = 0; actor.vel.breathRate = 0;
  actor.breathPhase = Math.asin(s);
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
