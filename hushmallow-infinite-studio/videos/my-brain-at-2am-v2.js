// "My Brain at 2 AM" — v2 direction (WebGL soft-body stage).
//
// Story (15 s, loops seamlessly — frame 449 flows into frame 0):
//   0.0  Noomi asleep on a mirror-still moonlit lake. "ME TRYING TO SLEEP AT 2 AM..."
//   0.3  a dream flinch… 0.40 the memory hits: eyes snap open, the whole body
//        jolts up out of the water (a hypnic jerk), 0.98 lands with a heavy
//        jelly squash; the wave travels up the body, ripples roll across the lake
//   1.0  wide-eyed aftermath: double blink, glances left/right, cheeks flush
//   3–7  overthinking: three glass thoughts rise from behind Noomi's head and
//        orbit, faster and faster; eyes chase them; worried brows, wobbly mouth,
//        a shiver; clouds cover the moon, the lake gets choppy, light goes cold
//   7.0  squeeze… let go. one huge, slow inhale (body swells tall, thoughts drawn
//        close), a soft crest, a long exhale: the body melts into a luxurious
//        elastic squash, a calm ring spreads over the water, the breath carries
//        the thoughts away and they dissolve into warm motes; clouds part, the
//        moon warms, Noomi glows from within
//   11.7 eyes open softly — a tiny peaceful smile, a slow blink
//   11.9 "Give your feelings somewhere soft to land."  12.6 logo + hushmallow.com
//   13.5 eyes drift shut; warmth eases back into the night; the hook returns → loop

import { SoftBody } from '../stage2/softbody.js';
import { Face, specFromRig, specFromDerived } from '../stage2/face.js';
import { TextBlock, LogoCard } from '../stage2/type.js';
import { loadImage, silhouette } from '../stage2/stage.js';
import { MALLOWS } from '../../hushmallow/src/mallows/registry.js';
import { Track, Impulses, Hops, Blinks, spring, ring, clamp, lerp, smoothstep, TAU, hex3, noise1, spline, ease } from '../stage2/motion.js';

const meta = { id: 'my-brain-at-2am-v2', title: 'My Brain at 2 AM', fps: 30, duration: 15, subframes: 3, shutter: 0.4 };

// ------------------------------------------------------------ assets --
const ASSET = {
  source: '../../hushmallow/assets/source/hires/noomi.webp',        // approved artwork (owner-supplied hi-res)
  pristine: '../assets/noomi/noomi-art.png',                         // the same pixels, cropped to the body (tools/derive_noomi_hires.py)
  clean: '../assets/noomi/noomi-clean.png',                          // same artwork, painted face removed (identical outside the face)
  normal: '../assets/noomi/noomi-normal.png',
  face: '../assets/noomi/noomi-face.json',
  faceMeasured: '../stage2/noomi-face-measured.json',            // fitted to the approved painted arcs
};

// ------------------------------------------------------------ timing --
const T = {
  antic: 0.26, take: 0.40, land: 0.98,
  b: [3.0, 4.0, 5.0], dis: [9.42, 9.62, 9.82],
  squeeze: 6.98, relax: 7.32, inhale: 7.42, crest: 8.9, exhale: 9.2,
  open: 11.7, tagline: 11.9, logo: 12.6, slowBlink: 12.8, sleep: 13.5, cardOut: 14.3, hookIn: 14.66,
};
const LOOP_BREATH = 15 / 4;          // sleeping breath period: 4 whole breaths per loop

// ---------------------------------------------------------- palettes --
const L = (h) => hex3(h).map((v) => Math.pow(v, 2.2));
const PAL = {
  night: {
    zenith: '#05071c', high: '#12164a', horizon: '#4a3f8e', haze: '#8b7fcf', moonCol: '#fbf7ff', haloCol: '#a59cff',
    cloudLit: '#c9c2ff', cloudDark: '#1d1a4a', hillCol: '#141238', waterNear: '#070823', waterFar: '#2a2768',
    key: '#f7f9ff', rim: '#a9a2ff', ambient: '#3a3480', specCol: '#d9e6ff', glowCol: '#ffcf9a',
    n: { moonGlow: 1.0, stars: 1.0, clouds: 0.5, exposure: 1.0, sat: 1.03, rimAmt: 0.32, spec: 0.5, glow: 0 },
    shadowTint: [0.95, 0.97, 1.05], highTint: [1, 1, 1],
  },
  cold: {
    zenith: '#03040d', high: '#0a0d27', horizon: '#262b56', haze: '#4f5689', moonCol: '#dfe6ff', haloCol: '#7882c2',
    cloudLit: '#7f87bd', cloudDark: '#0e1029', hillCol: '#090a1e', waterNear: '#04050e', waterFar: '#181c40',
    key: '#c3cdee', rim: '#8592dc', ambient: '#1b2149', specCol: '#c9d6ff', glowCol: '#ffcf9a',
    n: { moonGlow: 0.5, stars: 0.3, clouds: 0.98, exposure: 0.93, sat: 0.88, rimAmt: 0.26, spec: 0.42, glow: 0 },
    shadowTint: [0.92, 0.97, 1.08], highTint: [0.97, 0.99, 1.03],
  },
  warm: {
    zenith: '#0a0820', high: '#281c56', horizon: '#875c9b', haze: '#d9a2c2', moonCol: '#fff4dc', haloCol: '#ffc5a3',
    cloudLit: '#ffd6c2', cloudDark: '#35275a', hillCol: '#21153c', waterNear: '#0c0a23', waterFar: '#45316b',
    key: '#fffaf4', rim: '#ffc09a', ambient: '#4a3a70', specCol: '#fff0dc', glowCol: '#ffd2a0',
    n: { moonGlow: 1.35, stars: 1.25, clouds: 0.16, exposure: 1.0, sat: 1.04, rimAmt: 0.5, spec: 0.55, glow: 0.07 },
    shadowTint: [0.98, 0.96, 1.05], highTint: [1.04, 1.0, 0.95],
  },
};
// pre-linearise (tints stay as given: they act in display space)
for (const p of Object.values(PAL)) for (const k of Object.keys(p)) if (typeof p[k] === 'string') p[k] = L(p[k]);
const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function palette(cold, warm) {
  const out = { n: {} };
  for (const k of Object.keys(PAL.night)) {
    if (k === 'n') continue;
    out[k] = mix3(mix3(PAL.night[k], PAL.cold[k], cold), PAL.warm[k], warm);
  }
  for (const k of Object.keys(PAL.night.n)) out.n[k] = lerp(lerp(PAL.night.n[k], PAL.cold.n[k], cold), PAL.warm.n[k], warm);
  return out;
}
const coldAt = (t) => spline([[0, 0], [0.45, 0], [1.4, 0.2], [2.6, 0.28], [4.8, 1], [7.2, 1], [9.7, 0], [15, 0]], t);
const warmAt = (t) => spline([[0, 0], [9.25, 0], [11.4, 1], [13.6, 1], [14.95, 0], [15, 0]], t);

// -------------------------------------------------------------- body --
const hop = new Hops().add(T.take, T.land, 165);                       // art px
const sTrack = new Track(0, { f: 3, z: 0.8 })
  .to(T.antic, 0.07, { f: 4.5, z: 0.75 })                              // the dream flinch: sinks
  .to(T.take, -0.26, { f: 6.0, z: 0.5 })                               // jolt: shoots up, stretched
  .to(0.53, -0.02, { f: 4.5, z: 0.75 })                                // rounds out toward the apex
  .to(0.80, -0.09, { f: 3.5, z: 0.9 })                                 // falling stretch
  .to(T.land, 0, { f: 9, z: 1 })                                       // impact → impulses below
  .to(T.b[0] + 0.42, 0.05, { f: 5, z: 0.7 })                           // cringe at the first thought
  .to(T.b[0] + 0.9, 0, { f: 2.2, z: 0.8 })
  .to(T.squeeze, -0.05, { f: 3, z: 0.8 })                              // tense, shoulders up
  .to(T.relax, 0, { f: 1.5, z: 0.9 })
  .to(T.inhale, -0.10, { ease: ease.inOutSine, dur: T.crest - T.inhale })  // inhale: grows tall
  .to(T.exhale, 0.04, { f: 1.05, z: 0.42 })                             // exhale: melts wide, elastic
  .to(11.0, 0, { f: 0.9, z: 0.9 });
const sKicks = new Impulses()
  .kick(T.land, 0.27, 3.0, 0.24)                                       // heavy jelly landing
  .kick(T.exhale + 0.12, 0.08, 1.5, 0.3);                              // the plop of letting go
const swayKicks = new Impulses().kick(T.land, 0.06, 2.1, 0.2).kick(T.exhale + 0.2, 0.04, 1.3, 0.3);
const inflTrack = new Track(0)
  .to(T.take, 0.06, { f: 6, z: 0.6 }).to(0.75, 0, { f: 2, z: 0.8 })    // gasp
  .to(T.inhale, 0.21, { ease: ease.inOutSine, dur: T.crest - T.inhale })
  .to(T.exhale, -0.035, { ease: ease.inOutSine, dur: 1.9 })
  .to(11.4, 0, { f: 0.7, z: 1 });
const liftTrack = new Track(0)
  .to(T.inhale, 36, { ease: ease.inOutSine, dur: T.crest - T.inhale })
  .to(T.exhale, 0, { f: 1.1, z: 0.62 });
const leanTrack = new Track(0, { f: 2.2, z: 0.75 });
const shimmers = [[T.land, 1.0, 3.0, 19], [T.exhale + 0.12, 0.35, 2.0, 12]];

const sleepEnv = (t) => (1 - smoothstep(0.18, 0.34, t)) + Math.max(0.7 * smoothstep(10.8, 11.8, t), smoothstep(13.3, 14.4, t));
const pantEnv = (t) => smoothstep(1.3, 2.0, t) * (1 - smoothstep(6.95, 7.3, t));
const trembleEnv = (t) => smoothstep(3.0, 6.6, t) * (1 - smoothstep(6.95, 7.3, t));

function dofAt(t) {
  let shim = 0, shimP = 0;
  for (const [t0, a, d, w] of shimmers) if (t > t0) { const k = a * Math.exp(-(t - t0) * d); if (k > shim) { shim = k; shimP = (t - t0) * w; } }
  const tr = trembleEnv(t);
  return {
    squash: sTrack.value(t) + sKicks.value(t) + tr * 0.012 * noise1(t * 13, 3),
    inflate: inflTrack.value(t) + 0.03 * Math.sin(TAU * t / LOOP_BREATH) * sleepEnv(t) + 0.012 * Math.sin(TAU * 1.7 * t) * pantEnv(t),
    lean: leanTrack.value(t),
    sway: swayKicks.value(t) + tr * 0.22 * noise1(t * 9, 7),
    shimmer: shim + tr * 0.1, shimPhase: shimP + t * 6 * tr,
    lift: hop.value(t) + liftTrack.value(t),
  };
}

// ----------------------------------------------------------- bubbles --
const BUB = [
  { lines: ['That awkward', 'conversation.'], slot: Math.PI },
  { lines: ['Did I say', 'something weird?'], slot: 0.08 },
  { lines: ['Why did I', 'do that?'], slot: -Math.PI / 2 },
];
const ORBIT = { cx: 540, cy: 600, rx: 270, ry: 132 };
const PHASE = [[0, 0], [3.0, 0], [5.5, 0.26], [6.2, 0.8], [7.0, 2.15], [7.5, 2.7], [8.9, 3.05], [9.8, 3.18], [15, 3.18]];
const RADIUS = [[0, 1], [7.4, 1], [8.9, 0.95], [9.3, 0.97], [10.5, 1.3], [15, 1.3]];
const HEAD = [540, 790];        // where thoughts emerge (behind the top of the head)

function bubbleAt(i, t) {
  const b = BUB[i], tb = T.b[i];
  if (t < tb) return null;
  const dis = t - T.dis[i];
  if (dis > 0.6) return null;
  const th = b.slot + spline(PHASE, t);
  const R = spline(RADIUS, t);
  const ox = ORBIT.cx + ORBIT.rx * R * Math.cos(th);
  const oy = ORBIT.cy + ORBIT.ry * R * Math.sin(th) - (R - 1) * 150;
  const k = spring(t - tb, 1.6, 0.62);
  const depth = lerp(-0.9, Math.sin(th), clamp(k));
  const spin = smoothstep(5.6, 6.8, t) * (1 - smoothstep(7.0, 7.8, t));
  const wob = 0.09 * ring(t - tb, 2.8, 0.28) + spin * 0.035 * Math.sin(t * 17 + i * 2);
  const grow = spring(t - tb, 2.3, 0.48);
  const scale = lerp(0.12, 1, grow) * (0.9 + 0.1 * depth) * (1 + 0.12 * smoothstep(0, 0.55, dis));
  const alpha = smoothstep(tb, tb + 0.16, t) * (1 - smoothstep(0.12, 0.6, dis)) * (0.84 + 0.16 * (depth * 0.5 + 0.5)) * lerp(1, 0.86, smoothstep(7.4, 8.6, t));
  // dissolving: the words go first, then the glass turns to warm light and scatters into motes
  const glowUp = smoothstep(-0.05, 0.22, dis) * (1 - smoothstep(0.3, 0.6, dis));
  const textAlpha = 1 - smoothstep(-0.08, 0.2, dis);
  return { x: lerp(HEAD[0], ox, k), y: lerp(HEAD[1], oy, k), depth, scale, squash: [1 + wob, 1 - wob], alpha, stress: spin * 0.7, th, glowUp, textAlpha };
}

// warm motes the thoughts dissolve into (fixed per bubble)
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const MOTES = BUB.map((_, i) => {
  const r = rng(101 + i * 17);
  return Array.from({ length: 8 }, () => ({ u: r() * 2 - 1, v: r() * 2 - 1, up: 22 + r() * 30, push: 40 + r() * 50, life: 2.4 + r() * 1.2, size: 15 + r() * 10, ph: r() * TAU, sw: 0.4 + r() * 0.6 }));
});

// --------------------------------------------------------------- face --
const eyeOpen = new Track(0, { f: 7, z: 0.5 })
  .to(T.take, 1.32, { f: 8, z: 0.42 }).to(1.1, 1.12, { f: 2, z: 0.9 }).to(2.6, 1.02, { f: 1.5, z: 0.9 })
  .to(T.b[0] + 0.42, 0.12, { f: 7, z: 0.8 }).to(T.b[0] + 0.9, 1.04, { f: 2.6, z: 0.7 })
  .to(T.squeeze, 0, { f: 7, z: 0.9 }).to(T.open, 1.0, { f: 1.4, z: 0.85 }).to(T.sleep, 0, { f: 1.1, z: 1 });
const lidTop = new Track(0, { f: 1.2, z: 1 }).to(T.open, 0.04).to(T.sleep, 0);
const lidBot = new Track(0, { f: 1.2, z: 1 }).to(T.open, 0.4).to(T.sleep, 0);
const squint = new Track(0, { f: 5, z: 0.8 }).to(T.antic, 0.6).to(T.take, 0, { f: 10, z: 1 }).to(T.b[0] + 0.42, 0.7, { f: 7 }).to(T.b[0] + 0.9, 0, { f: 3 }).to(T.squeeze, 1, { f: 6, z: 0.8 }).to(T.relax, 0, { f: 2.2, z: 0.9 });
const curve = new Track(1, { f: 5, z: 0.9 }).to(T.squeeze, 0.55).to(T.relax, 1, { f: 2.2 });
const eyeStretch = new Track(1).to(T.take, 1.12, { f: 8, z: 0.4 }).to(1.0, 1, { f: 1.6, z: 0.8 });
const eyeScale = new Track(1).to(T.take, 1.1, { f: 7, z: 0.45 }).to(1.2, 1, { f: 1.5, z: 0.9 });
const iris = new Track(1, { f: 1, z: 1 }).to(T.take, 0.58, { f: 9, z: 0.8 }).to(1.4, 0.72).to(3.0, 0.82).to(T.open - 0.1, 1.12).to(T.sleep, 1);
const lookX = new Track(0, { f: 9, z: 0.75 }), lookY = new Track(0, { f: 9, z: 0.75 });
const blinks = new Blinks();
for (const b of [1.42, 1.66, 4.62, 5.45, 6.12, 6.6]) blinks.add(b);
blinks.add(T.slowBlink, { close: 0.15, hold: 0.08, open: 0.32 });
const brow = new Track(0, { f: 1.5, z: 0.9 }).to(1.2, 0.3).to(3.1, 0.78, { f: 1.6 }).to(T.squeeze, 0.35, { f: 4 }).to(T.relax, 0, { f: 2 });
const browY = new Track(0.35, { f: 1.5, z: 0.9 }).to(5.8, 0.6).to(T.relax, 0.35);
const smile = new Track(1, { f: 2, z: 0.9 })
  .to(T.antic, 0.7, { f: 4 }).to(T.take, 0, { f: 9, z: 0.8 }).to(1.15, -0.25).to(T.b[0] + 0.42, -0.75, { f: 6 }).to(T.b[0] + 0.92, -0.38, { f: 2 })
  .to(T.squeeze, -0.15, { f: 5 }).to(T.relax, 0.25, { f: 1.5 }).to(10.9, 0.85, { f: 1, z: 0.9 }).to(T.open, 0.95, { f: 1.2 }).to(T.sleep, 1, { f: 0.8, z: 1 });
const mOpen = new Track(0, { f: 2, z: 0.9 }).to(T.take, 0.62, { f: 9, z: 0.55 }).to(1.1, 0.06).to(3.1, 0.08).to(T.squeeze, 0, { f: 6 })
  .to(T.exhale + 0.05, 0.28, { f: 2.2 }).to(10.7, 0, { f: 1.2, z: 1 });
const mRound = new Track(0, { f: 2, z: 0.9 }).to(T.take, 0.85, { f: 9 }).to(1.1, 0.1).to(T.exhale + 0.05, 0.75, { f: 2.2 }).to(10.7, 0, { f: 1.2, z: 1 });
const mWave = new Track(0, { f: 2, z: 0.9 }).to(1.15, 0.35).to(3.1, 0.85, { f: 1.5 }).to(T.squeeze, 0, { f: 6 });
const mWidth = new Track(1, { f: 2, z: 0.9 }).to(1.15, 0.85).to(T.squeeze, 0.72, { f: 6 }).to(T.relax, 0.9).to(T.exhale + 0.05, 0.8).to(10.7, 1, { f: 1.2 });
const blush = new Track(0, { f: 0.8, z: 1 }).to(1.5, 0.8).to(T.b[0] + 0.4, 1.15, { f: 2 }).to(4.0, 0.55, { f: 0.6 }).to(7.4, 0, { f: 0.6 }).to(10.5, 0.35, { f: 0.6 }).to(13.6, 0);
const sparkle = new Track(0, { f: 1, z: 1 }).to(T.open, 1).to(T.sleep, 0);
const restAt = (t) => (1 - smoothstep(0.17, 0.25, t)) + smoothstep(14.2, 14.5, t);

function faceAt(t) {
  return {
    eyeOpen: eyeOpen.value(t), lidTop: lidTop.value(t), lidBot: lidBot.value(t), blink: blinks.value(t), squint: squint.value(t), closedCurve: curve.value(t),
    eyeStretch: eyeStretch.value(t), eyeScale: eyeScale.value(t), irisScale: iris.value(t),
    lookX: lookX.value(t), lookY: lookY.value(t), sparkle: sparkle.value(t),
    browAlpha: brow.value(t), browY: browY.value(t), browTilt: 0.8,
    mouthSmile: smile.value(t), mouthOpen: mOpen.value(t), mouthRound: mRound.value(t), mouthWave: mWave.value(t),
    mouthWavePhase: t * 4.2, mouthWidth: mWidth.value(t), blush: blush.value(t),
  };
}

// --------------------------------------------------------------- world --
const WORLD = { horizonY: 1150, baseX: 540, baseY: 1300, scale: 0.56, moon: [850, 590, 50] };
const RIPPLES = [[T.take + 0.02, 0.32], [T.land, 1.0], [T.land + 0.2, 0.42], [T.exhale + 0.1, 0.5], [T.exhale + 0.75, 0.24]];
const agitationAt = (t) => spline([[0, 0], [0.9, 0], [1.3, 0.12], [2.6, 0.08], [4.2, 0.32], [7.0, 0.62], [8.9, 0.32], [10.6, 0], [15, 0]], t);

// ------------------------------------------------------------- camera --
function camAt(t) {
  const lift = dofAt(t).lift * WORLD.scale;
  return {
    x: 540,
    y: spline([[0, 960], [2.6, 960], [5.0, 936], [7.0, 926], [8.9, 932], [11.6, 960], [15, 960]], t) - lift * 0.2,
    zoom: spline([[0, 1], [2.6, 1], [5.0, 1.045], [7.0, 1.075], [8.2, 1.07], [9.2, 1.055], [11.8, 1], [15, 1]], t),
    roll: 0,
  };
}
function skyCamFor(cam, horizonY, k = 0.35) {
  const z = 1 + (cam.zoom - 1) * k;
  return [540 + (cam.x - 540) * k, horizonY - (horizonY - cam.y) * cam.zoom / z, z];
}

// ------------------------------------------------------------- set-up --
let body, sil, face, faceCanvas, bubbleTex = [], hook, hookEnd, tagline, logo, hasClean = false;

async function tryImage(rel) { try { return await loadImage(new URL(rel, import.meta.url).href); } catch { return null; } }
async function tryJSON(rel) { try { const r = await fetch(new URL(rel, import.meta.url).href); return r.ok ? await r.json() : null; } catch { return null; } }

function bubbleCanvas(lines) {
  const size = 50, lh = 58, padX = 38, padY = 26;
  const m = document.createElement('canvas').getContext('2d');
  m.font = `500 ${size}px "Fredoka"`;
  const w = Math.max(...lines.map((l) => m.measureText(l).width));
  const hw = w / 2 + padX, hh = (lines.length * lh) / 2 + padY;
  const S = 2;
  const c = document.createElement('canvas');
  c.width = Math.ceil(hw * 2 * S); c.height = Math.ceil(hh * 2 * S);
  const g = c.getContext('2d');
  g.scale(S, S);
  g.font = `500 ${size}px "Fredoka"`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1b1d57';
  lines.forEach((l, i) => g.fillText(l, hw, hh + (i - (lines.length - 1) / 2) * lh + 1));
  return { c, hw, hh };
}

async function setup(stage) {
  // derived assets share one pixel space (the cropped body); without them, fall back to the raw source + rest face only
  const derived = await tryImage(ASSET.pristine);
  const pristine = derived || await loadImage(new URL(ASSET.source, import.meta.url).href);
  const clean = derived ? await tryImage(ASSET.clean) : null;
  hasClean = !!clean;
  const normal = derived ? await tryImage(ASSET.normal) : null;
  const derivedFace = derived ? await tryJSON(ASSET.face) : null;
  const faceJson = derivedFace ? { spec: specFromDerived(derivedFace, MALLOWS.noomi.face) } : await tryJSON(ASSET.faceMeasured);
  sil = silhouette(pristine);
  faceCanvas = document.createElement('canvas');
  faceCanvas.width = pristine.width; faceCanvas.height = pristine.height;
  const spec = faceJson?.spec || specFromRig(MALLOWS.noomi.face, 2.70, 32, 125);
  face = new Face(spec, faceCanvas);
  stage.renderer.setMallow({ artImg: clean || pristine, pristineImg: pristine, faceCanvas, normalImg: normal, cols: 96, rows: 96 });
  body = new SoftBody({ w: pristine.width, h: pristine.height }, sil, { lag: 0.062 });

  // eyes follow the thoughts (targets from the bubbles' actual positions)
  const eyeC = [WORLD.baseX, WORLD.baseY - (sil.baseY - (spec.eyes.L.y + spec.eyes.R.y) / 2) * WORLD.scale];
  const lookAtBubble = (i, t) => {
    const b = bubbleAt(i, t + 0.12);
    const dx = b.x - eyeC[0], dy = b.y - eyeC[1];
    const d = Math.hypot(dx, dy);
    return [clamp(dx / d * 1.05, -0.85, 0.85), clamp(dy / d * 0.95, -0.9, 0.5)];
  };
  const look = (t, xy) => { lookX.to(t, xy[0]); lookY.to(t, xy[1]); };
  look(1.85, [-0.75, -0.1]); look(2.2, [0.72, -0.05]); look(2.58, [0, 0.12]);
  look(T.b[0] + 0.1, lookAtBubble(0, T.b[0] + 0.25));
  look(T.b[1] + 0.1, lookAtBubble(1, T.b[1] + 0.25));
  look(T.b[2] + 0.1, lookAtBubble(2, T.b[2] + 0.25));
  look(T.b[2] + 0.42, [0.1, 0.6]);           // …why did I do that: a guilty look down
  [[5.62, 0], [5.98, 1], [6.3, 2], [6.55, 0], [6.76, 1], [6.92, 2]].forEach(([t, i]) => look(t, lookAtBubble(i, t)));
  look(T.relax, [0, 0]);
  look(T.open - 0.05, [0.28, -0.38]);       // first glance: up at the warm moon
  look(12.35, [0, 0.06]);                   // then at us
  // lean into each new thought
  leanTrack.to(1.85, -0.025).to(2.2, 0.025).to(2.58, 0);
  T.b.forEach((tb, i) => leanTrack.to(tb + 0.1, clamp(lookAtBubble(i, tb + 0.25)[0] * 0.045, -0.04, 0.04)));
  leanTrack.to(5.6, 0).to(T.squeeze, 0);

  BUB.forEach((b, i) => {
    const { c, hw, hh } = bubbleCanvas(b.lines);
    bubbleTex[i] = { tex: stage.renderer.textTexture(`b${i}`, c), hw, hh };
  });

  hook = new TextBlock({ lines: ['ME TRYING TO SLEEP', 'AT 2 AM...'], y: 286, size: 76, weight: 600, tracking: 2, enterAt: -10, exitAt: 2.72, exitDur: 0.5 });
  hookEnd = new TextBlock({ lines: ['ME TRYING TO SLEEP', 'AT 2 AM...'], y: 286, size: 76, weight: 600, tracking: 2, enterAt: T.hookIn, inDur: 0.3, stagger: 0, rise: 0 });
  tagline = new TextBlock({ lines: ['Give your feelings', 'somewhere soft to land.'], y: 262, size: 62, weight: 500, enterAt: T.tagline, exitAt: T.cardOut, exitDur: 0.34, stagger: 0.18 });
  logo = new LogoCard({ y: 488, logoW: 360, urlSize: 44, gap: 62, enterAt: T.logo, exitAt: T.cardOut, exitDur: 0.34 });
  await logo.load();

  // sound cues (the soundtrack is rendered from these)
  const c = (t, type, d = {}) => stage.cue(t, type, d);
  c(0, 'scene', { loop: 15 });
  c(T.antic, 'flinch'); c(T.take, 'take'); c(T.take + 0.02, 'lift_off');
  c(T.land, 'land', { amp: 1 }); c(T.land + 0.2, 'ripple', { amp: 0.4 });
  c(1.42, 'blink'); c(1.66, 'blink'); c(1.85, 'glance', { pan: -0.5 }); c(2.2, 'glance', { pan: 0.5 });
  T.b.forEach((tb, i) => c(tb, 'thought', { i, pan: clamp((bubbleAt(i, tb + 0.6).x - 540) / 400, -0.8, 0.8) }));
  c(T.b[0] + 0.42, 'wince');
  c(5.6, 'spin_up', { until: T.squeeze });
  c(T.squeeze, 'squeeze'); c(T.inhale, 'inhale', { dur: T.crest - T.inhale }); c(T.crest, 'crest');
  c(T.exhale, 'exhale', { dur: 1.9 }); c(T.exhale + 0.12, 'release');
  T.dis.forEach((td, i) => c(td, 'dissolve', { i, pan: clamp((bubbleAt(i, td).x - 540) / 400, -0.8, 0.8) }));
  c(T.exhale + 0.3, 'warm_bloom');
  c(T.open, 'eyes_open'); c(T.tagline, 'tagline'); c(T.logo, 'logo'); c(T.slowBlink, 'blink', { soft: true });
  c(T.sleep, 'drift'); c(T.hookIn, 'loop');
}

// --------------------------------------------------------------- state --
function state(t, stage) {
  const cold = coldAt(t), warm = warmAt(t);
  const P = palette(cold, warm);
  const cam = camAt(t);
  const xf = { x: WORLD.baseX, y: WORLD.baseY, s: WORLD.scale };
  const d0 = dofAt(t);
  const liftW = d0.lift * WORLD.scale;
  const F = faceAt(t);
  const rest = hasClean ? clamp(restAt(t)) : 1;
  const ripples = [];
  for (const [t0, amp] of RIPPLES) if (t > t0 && t - t0 < 6) ripples.push({ x: WORLD.baseX, y: WORLD.baseY, age: t - t0, amp });

  // bubbles → glass passes
  const back = [], front = [];
  BUB.forEach((_, i) => {
    const b = bubbleAt(i, t);
    if (!b || b.alpha < 0.004) return;
    const bt = bubbleTex[i];
    const item = {
      x: b.x, y: b.y, hw: bt.hw, hh: bt.hh, scale: b.scale, squash: b.squash, rot: 0, radius: Math.min(bt.hh, 64),
      alpha: b.alpha, textAlpha: b.textAlpha, glowUp: b.glowUp, textTex: bt.tex, tint: mix3([0.92, 0.91, 1.0], [0.86, 0.88, 0.98], cold), edge: [0.9, 0.92, 1.0], stress: b.stress,
    };
    (b.depth < 0 ? back : front).push(item);
  });
  // motes
  const particles = [];
  BUB.forEach((_, i) => {
    const age0 = t - T.dis[i];
    if (age0 <= 0) return;
    const b = bubbleAt(i, T.dis[i]);
    const bt = bubbleTex[i];
    const dir = [b.x - 540, b.y - 1060]; const dl = Math.hypot(...dir); dir[0] /= dl; dir[1] /= dl;
    for (const m of MOTES[i]) {
      const age = age0 - Math.abs(m.u) * 0.12;
      if (age <= 0 || age > m.life) continue;
      const k = 1.6, drag = (1 - Math.exp(-k * age)) / k;
      const x = b.x + m.u * bt.hw * 0.85 * b.scale + dir[0] * m.push * drag + Math.sin(age * m.sw * 2 + m.ph) * 9;
      const y = b.y + m.v * bt.hh * 0.7 * b.scale + dir[1] * m.push * drag - m.up * age;
      const a = smoothstep(0, 0.4, age) * (1 - smoothstep(m.life * 0.4, m.life, age)) * (0.85 + 0.15 * Math.sin(age * 2.2 + m.ph));
      particles.push({ x, y, r: m.size, a: a * 0.7, c: mix3([1.7, 1.2, 0.68], [1.25, 1.0, 1.35], clamp(age / m.life)) });
    }
  });

  const n = P.n;
  return {
    t, cam,
    buildMesh: (mesh, flip) => body.build(mesh, t, dofAt, xf, flip),
    drawFace: () => face.draw(F),
    mallow: {
      bodyBox: [sil.cx, sil.baseY, sil.halfW, sil.h], rest,
      light: {
        dir: [0.45, 0.55, 0.7], key: P.key, rim: P.rim, rimAmt: n.rimAmt, spec: n.spec, specCol: P.specCol,
        glowCol: P.glowCol, glow: n.glow * (1 + 0.25 * Math.sin(TAU * t / LOOP_BREATH)), ambient: P.ambient, sss: 1,
      },
    },
    world: {
      zenith: P.zenith, high: P.high, horizon: P.horizon, haze: P.haze,
      moon: WORLD.moon, moonCol: P.moonCol, moonGlow: n.moonGlow, haloCol: P.haloCol,
      stars: n.stars, clouds: n.clouds, cloudLit: P.cloudLit, cloudDark: P.cloudDark, hillCol: P.hillCol,
      horizonY: WORLD.horizonY, waterNear: P.waterNear, waterFar: P.waterFar, fresnel: 1.0, agitation: agitationAt(t),
      reflAmt: 0.62, contactY: WORLD.baseY, contact: [WORLD.baseX, sil.halfW * WORLD.scale * (1 + 0.5 * Math.max(0, d0.squash))],
      shadow: 0.55 * Math.exp(-liftW / 45), ripples, skyCam: skyCamFor(cam, WORLD.horizonY),
    },
    bubblesBack: back, bubblesFront: front, particles,
    post: {
      exposure: n.exposure, bloom: 0.14, bloomThresh: 0.85, contrast: 1.04, sat: n.sat,
      shadowTint: P.shadowTint, highTint: P.highTint, vignette: 0.38 + 0.08 * cold, grain: 0.018, time: t,
    },
    audio: {
      warm, cold, agitation: agitationAt(t), inflate: d0.inflate, lift: d0.lift, squash: d0.squash,
      spin: (spline(PHASE, t + 0.01) - spline(PHASE, t - 0.01)) / 0.02,
      ...Object.fromEntries(BUB.flatMap((_, i) => {
        const b = bubbleAt(i, t);
        return [[`bx${i}`, b ? +((b.x - 540) / 420).toFixed(3) : 0], [`bf${i}`, b ? +((b.depth + 1) / 2).toFixed(3) : 0], [`ba${i}`, b ? +b.alpha.toFixed(3) : 0]];
      })),
    },
  };
}

// ------------------------------------------------- adaptive motion blur --
// How far does anything travel on screen while the shutter is open? Sample
// densely enough that sub-frames are ≤ ~2 px apart (no stepped ghosts).
function subframes(t) {
  const sh = meta.shutter / meta.fps / 2;
  const xf = { x: WORLD.baseX, y: WORLD.baseY, s: WORLD.scale };
  const pts = [[sil.cx, sil.top], [sil.x0, sil.top + sil.h * 0.5], [sil.x1, sil.top + sil.h * 0.5], [sil.x0 + sil.w * 0.15, sil.baseY]];
  let d = 0;
  for (const [px, py] of pts) {
    const a = body.project(px, py, t - sh, dofAt, xf), b = body.project(px, py, t + sh, dofAt, xf);
    d = Math.max(d, Math.hypot(a.x - b.x, a.y - b.y));
  }
  const fa = faceAt(t - sh), fb = faceAt(t + sh);
  const r = face.spec.eyes.L.r * WORLD.scale;
  d = Math.max(d, Math.abs((fa.eyeOpen * (1 - fa.blink)) - (fb.eyeOpen * (1 - fb.blink))) * r * 1.8,
    Math.hypot(fa.lookX - fb.lookX, fa.lookY - fb.lookY) * r * 0.5, Math.abs(fa.mouthOpen - fb.mouthOpen) * r * 1.5);
  for (let i = 0; i < BUB.length; i++) {
    const a = bubbleAt(i, t - sh), b = bubbleAt(i, t + sh);
    if (a && b) d = Math.max(d, Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(a.scale - b.scale) * bubbleTex[i].hw);
  }
  return Math.max(3, Math.min(16, Math.ceil(d / 2)));
}

// ------------------------------------------------------------- overlay --
function overlay(ctx, t) {
  ctx.clearRect(0, 0, 1080, 1920);
  hook.draw(ctx, t);
  if (t >= T.hookIn) hookEnd.draw(ctx, t);
  tagline.draw(ctx, t);
  logo.draw(ctx, t);
  return true;
}

export default { meta, setup, state, overlay, subframes };
