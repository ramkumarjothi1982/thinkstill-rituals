// World 2 — Loomi's Luminous Ocean (defusion and decentring: watching a thought from a
// little further away).
//
// A night ocean under the storm's dawn. Every stroke on the water sculpts a Gerstner wave
// packet: while the finger is down the swell forms along its path with a crest under the
// fingertip; at release it is set free with real dispersion (ocean-sea.js — the audit's exact
// g, σ, ν, β₀), so slow, long strokes roll long swells that live for half a minute and quick
// flicks make short chop that fades in a moment. A 2-D height field answers the finger at
// once with a bioluminescent wake; holding still hushes the water to a mirror around the
// fingertip. Things float: the hero Mallow bobs and tilts in the foreground with a
// translucent lip of water across its lowest tenth; the Thought Mallow, with the person's
// exact words, is carried by Stokes drift — towards the horizon by swells sent away, back by
// swells sent towards you — always visible, never sunk; photos are bubbles that drift further.
//
// Layers: the world's own opaque back layer (sky, the shaded sea, crest light, glints,
// plankton, Loomi's light on the water) below the Mallow; the front layer (bubbles, the
// thought, the water lip, fingertips, rings, the hint) above it.
//
// Rendering per frame: a 56 × 40 perspective grid (rows spaced by v^1.35) evaluated with
// row recurrences (one exp and one sin/cos per packet per row), shaded per vertex (Fresnel
// reflection of the actual sky gradient and the dawn — so the dawn's reflection column and
// the mirror-calm finish emerge from the waves themselves — plus bioluminescent crest light),
// rasterised into a 4 px-cell image together with the wake's glow, upscaled once; crest
// strokes, glints and glow sprites on top. Nothing big is allocated per frame.
//
// Deliberate differences from docs/audit/worlds.md proposal 6 (each for composition or feel):
//   · the camera is fitted to the screen (ocean-sea.js makeCamera): the Thought Mallow's home is
//     z = Z0 just beyond the hero, its words above it; the near water is seen at a grazing angle;
//   · the Stokes-drift gain is calibrated per screen (calibrateDrift) so 3–4 unhurried long
//     swells carry the thought from home to 4·Z0, on any phone — the raw gain of 3 assumed the
//     audit's camera;
//   · a stroke's packet is sculpted live while the finger is down (crest under the fingertip)
//     instead of being spawned every 0.4 s / 120 px (that would cap a slow 0.6U stroke at
//     λ = 180 px, never a long swell); a stroke that rests 0.35 s, turns sharply or runs past
//     1.6U lets its swell go and a new one begins;
//   · 'long-waves' offers nothing for the garden (its line is about pace; the ocean's tool,
//     A Little More Room, is offered with 'distance', whose found-text it matches);
//   · photos: as many bubbles float at once as fit (planOcean; beside the hero on a small phone
//     they are smaller rather than overlapping); the others wait below the surface and take turns
//     far out on the horizon — every photo gets its turn;
//   · the wind's background ripples are texture only: they carry nothing (everything that moves a
//     floater comes from the person's strokes, or the storm's lines they grounded);
//   · a swell sent towards you also tows a thought that floats further out than where the stroke
//     began (towAt), so bringing it back works from anywhere on the water, not only from just
//     behind it ('Strokes work anywhere on the water');
//   · the thought's distance is capped per screen where its words would no longer fit above it
//     (never below 4.6·Z0, so 'distance' is always reachable); on a short screen the words take
//     one wide line instead of two when that is what fits;
//   · nothing is ever drawn over the hero: the thought, its words and every bubble keep a hard
//     screen-space keep-out from the hero's live body (a bob rests against it; a bubble in a narrow
//     gap beside it shrinks);
//   · (review r3) only the water makes swells: strokes are clipped at the horizon line, and a swell
//     counts as the person's only when it stands a few px tall on water the thought can reach;
//   · (review r3) crest light is traced along each packet's own crests (θ = 2πn), not marked on the
//     grid's rows, and drawn as tapered ribbons; the audit's per-row crest strokes would read as
//     hatching, so the idle sea glimmers only along its longest gentle swell;
//   · (review r3) the thought keeps a clear zone that bubbles slide round, and its home leaves open
//     water above the hero's head.

import { glowSprite, glintSprite, Pool, Rings, flashEnv, clamp, lerp, smoothstep, TAU, makeCanvas } from '../../../world/util.js';
import { Sea, Wake, SEA, strokeWave, strokePacket, calibrateDrift, makeCamera, fitCamera, swellCap, scaleAt, depthAt, project, unproject } from './ocean-sea.js';
import { planOcean, OCEAN, bubbleSize, thoughtZone, createLongWavesDetector, createDistanceDetector, createOceanProgress } from './ocean-rules.js';
import { wrapLines } from '../placeholders.js';

const C = {
  crest: '#7cf5ff', crest2: '#a8fff0', loomi: '#62e6ff', dawn: '#ffd98a', rose: '#ff9eb8', cream: '#fff4dc', white: '#ffffff',
};
const ROWS = 56, ROWS_LOW = 36, COLS = 40;
const CELL = 4;                         // px per water image cell / wake cell
const HUSH_SEC = 1.8;                   // a still finger's mirror grows to full size this fast
const STILL_RELEASE = 0.35;             // a resting finger lets its swell go after this long
const TAP_PX = 10, TAP_SEC = 0.34;
const RISE_SEC = 3;                     // the horizon rises 0.655H → 0.44H after the melt's midpoint
const GLIDE_SEC = 2.2;                  // a bubble / the thought glides from where it hung down onto the water
const COLD_GLIDE_SEC = 1.6;             // a cold start: the thought already on screen glides from there onto the water
const RM_FADE_SEC = 0.3;                // …or, with reduced motion, fades out where it was, then in at home
const ARRIVE_STEP = 9;                  // px per 1/60 s at most while it arrives (the hero coming to rest on it slides it off)
const HINT_AT = 5.5, HINT_SEC = 3.6;
const FLICK_U = 0.2, LONG_U = 0.6;
const GOLD_SEC = 10;                    // the storm's seed swells keep their gold crest light this long (the melt itself takes 5 s)
const TOW_TAU = 2.4, TOW_Z0 = 0.9;      // a slow long stroke towards you tows a far thought ≈0.9·Z0 home
const TURN_SEC = 12;                    // with photos waiting, a far bubble gives up its place this often
const RELAYOUT_TOL = 12;                // px: the hero's rest box must move this much to re-plan the screen
const ART_BOTTOM = OCEAN.ART_BOTTOM;    // × the body box's height: the soft edge below the art (the box hugs the drawing)
const WATER_PAD = 8;                    // px below the horizon line where the water a stroke can shape begins
const VIS_PX = 3;                       // px: a swell must be at least this tall on screen to count as the person's

// the sea's highlights roll off softly instead of clipping to white (a knee at 176; hue kept: all three channels are
// scaled by the brightest one's curve), so the dawn path and the mirror-calm finish read as a warm sheet, not glare
const TONE = (() => { const t = new Float32Array(1025), K = 176, R2 = 255 - 6 - K; for (let v = 0; v <= 1024; v++) t[v] = v <= K ? 1 : (K + R2 * (1 - Math.exp(-(v - K) / R2))) / v; return t; })();
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const normBox = (r) => {
  if (!r || !(r.height > 20) || !(r.width > 20)) return null;
  const left = r.left ?? r.x, top = r.top ?? r.y;
  return { left, top, right: r.right ?? left + r.width, bottom: r.bottom ?? top + r.height, width: r.width, height: r.height };
};
const boxMoved = (a, b, tol) => (!a || !b ? !!a !== !!b : Math.abs(a.left - b.left) > tol || Math.abs(a.right - b.right) > tol || Math.abs(a.top - b.top) > tol || Math.abs(a.bottom - b.bottom) > tol);
/** Does a disc (x, y, r) touch a box? */
const discHits = (x, y, r, b) => { const cx = x < b.x0 ? b.x0 : x > b.x1 ? b.x1 : x, cy = y < b.y0 ? b.y0 : y > b.y1 ? b.y1 : y; return (x - cx) ** 2 + (y - cy) ** 2 < r * r; };
const boxesHit = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

// the sky, by height above the horizon (0 = horizon … 1 = top of the screen)
const SKY = [[0, [44, 112, 134]], [0.06, [24, 76, 104]], [0.22, [13, 45, 76]], [0.5, [9, 30, 58]], [1, [5, 13, 34]]].map(([t, c]) => ({ t, c }));
function skyAt(t, out) {
  t = clamp(t);
  let i = 0; while (i < SKY.length - 2 && t > SKY[i + 1].t) i++;
  const a = SKY[i], b = SKY[i + 1], k = (t - a.t) / (b.t - a.t);
  out[0] = a.c[0] + (b.c[0] - a.c[0]) * k; out[1] = a.c[1] + (b.c[1] - a.c[1]) * k; out[2] = a.c[2] + (b.c[2] - a.c[2]) * k;
  return out;
}

/** A periodic 32 × 32 tile of smooth value noise in −1..1, its blobs about 4 cells wide and 2 tall. */
function facetTile(seed) {
  let a = seed >>> 0 || 1;
  const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const gx = 8, gy = 16, G = new Float32Array(gx * gy), T = new Float32Array(32 * 32);
  for (let k = 0; k < G.length; k++) G[k] = r() * 2 - 1;
  const sm = (t) => t * t * (3 - 2 * t);
  for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
    const u = (i / 32) * gx, v = (j / 32) * gy, i0 = Math.floor(u), j0 = Math.floor(v), fu = sm(u - i0), fv = sm(v - j0);
    const at = (x, y) => G[(y % gy) * gx + (x % gx)];
    const top = at(i0, j0) + (at(i0 + 1, j0) - at(i0, j0)) * fu, bot = at(i0, j0 + 1) + (at(i0 + 1, j0 + 1) - at(i0, j0 + 1)) * fu;
    T[j * 32 + i] = (top + (bot - top) * fv) * 1.6;
  }
  return T;
}

/** Is (x, y) on the thought's words (its DOM tag), as they are on screen now? */
function onWords(th, x, y) {
  try {
    const el = th?.tag;
    if (!el?.isConnected) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2;
  } catch { return false; }
}

export function create(ctx) {
  const { photos, words } = ctx;
  const mallow = ctx.mallow || null;
  let thought = ctx.thought || null;
  const R = ctx.rand;
  let W = ctx.W, H = ctx.H, U = ctx.U;
  const reduced = () => ctx.reduced;
  const low = () => !!ctx.lowStim;
  const intensity = clamp(ctx.intensity ?? 0.6);

  // ------------------------------------------------------------- state --
  const sea = new Sea(SEA.K_MAX);
  let wake = null;
  let plan = null, cam = null, driftGain = SEA.STOKES;
  let hyNow = 0, hyTarget = 0, camHome = 0, camWater = 0;      // eased camera inputs
  let prepared = false, entered = false, paused = false, complete = false, completeAt = -1, outroK = 0;
  let elapsed = 0, lastTouch = -1e9, everTouched = false;
  let dawnK = 0.55, dawnT = 0.55, mirrorK = 0;             // the dawn path brightens at the end
  let settle = 0;                                          // > 0: the completion settle (packets damp ×3)
  let windK = 0, windT = 0.2 + 0.35 * intensity;           // background ripple from the feeling
  const longD = createLongWavesDetector();
  const distD = createDistanceDetector();
  const prog = createOceanProgress();
  const discovered = new Set();
  let said = { arrive: false, chop: false, back: false };
  let introAt = -1, arriveAt = -1, hint = { next: HINT_AT, shown: 0, age: -1, ok: true, x0: 0, y0: 0, x1: 0, y1: 0 };
  let melt = null;                                         // { k, hy0, riseAt } while melting in
  let holds = { hum: null }, holdClock = 0, ambClock = 0, emoAt = -9, emoKey = '', hopAt = -9;
  let lastDrip = -9, lastSwish = -9;
  let metricsCache = { chop: 0, period: 0, periodAll: 0, energy: 0 };
  let lastP = 0;
  let restored = null;                                     // a resumed sea: where things were left
  const pk = {};                                           // scratch: the packet a stroke sculpts
  let xd = 0;                                              // the dawn's x (off-axis, away from the words)
  let plateLines = 2;                                      // the words on one wide line (a short screen) or two
  let wordsFit = null;                                     // the words plate asked of W2's layer (thought.labelFit), per plan
  let heldFit = null;                                      // melting in: the storm's plate, kept until the thought sets off
  let capD = OCEAN.CAP;                                    // the thought's furthest distance on this screen (× Z0)
  let firstTouchAt = -1, turnClock = 0, backHint = 0;      // backHint: 0 not yet, 1 shown
  let baseTension = null, relief = 0;                      // the thought's own tension (its feeling), and what the person's swells eased
  // swells sent towards you tow far floaters home (a small fixed pool)
  const tows = [0, 1, 2, 3].map(() => ({ on: false, zFar: 0, v: 0, age: 0 }));

  // fingers (two at most)
  const fingers = [0, 1].map(() => ({
    on: false, id: -1, x: 0, y: 0, px: 0, py: 0, x0: 0, y0: 0, len: 0, moveT: 0, t0: 0, lastEv: 0, speed: 0,
    still: 0, slot: -1, sid: 0, ix: 0, iy: 0, onThought: false, bubble: -1, hush: 0, hushX: 0, hushY: 0, pointerType: 'touch', strokes: 0, skyX: -1e9,
  }));
  const fingerFor = (id) => { for (const f of fingers) if (f.on && f.id === id) return f; return null; };

  // grid (rows × columns) — world → screen, shading
  const NG = ROWS * COLS;
  const gH = new Float32Array(NG), gHX = new Float32Array(NG), gHZ = new Float32Array(NG), gGX = new Float32Array(NG), gGZ = new Float32Array(NG), gA = new Float32Array(NG), gAU = new Float32Array(NG);
  const gSX = new Float32Array(NG), gSY = new Float32Array(NG), gR = new Float32Array(NG), gG = new Float32Array(NG), gB = new Float32Array(NG), gCrest = new Float32Array(NG), gSpec = new Float32Array(NG), gPath = new Float32Array(NG);
  const gChop = new Float32Array(NG), gGold = new Float32Array(NG), gAmb = new Float32Array(NG), gGlim = new Float32Array(NG);
  const rowX = { CHOP: gChop, chopMax: 1, GOLD: gGold, goldSec: GOLD_SEC, AMB: gAmb, ambA: 0 };
  // broken water: two tiles of smooth random facets (wider than tall, as the view flattens them), morphing
  // into each other — cheap, irregular, smooth in time (no flicker)
  const TILE = 32, tileA = facetTile(ctx.seed ^ 0x2c1b), tileB = facetTile(ctx.seed ^ 0x77e3);
  const rY = new Float32Array(ROWS), rS = new Float32Array(ROWS), rZ = new Float32Array(ROWS), rDZ = new Float32Array(ROWS);
  let rowsN = ROWS;
  let colX0 = 0, colStep = 1;

  // the water image (cells of CELL px) and its column → grid mapping
  let img = null, imgG = null, imgData = null, iw = 0, ih = 0, imgY0 = 0, img2 = null, img2G = null;
  let colI = null, colF = null;
  // sky
  let skyC = null, dawnSpr = null, horizonSpr = null, stars = [];
  let sprites = null;
  const sky3 = [0, 0, 0];
  // particles
  const plankton = new Pool(160);    // bioluminescent motes in the wake (back)
  const chopSparks = new Pool(220);  // broken water glinting where quick flicks made chop (back)
  let chopClock = 0;
  const rings = new Rings(14);       // taps, landings, lifts (front)
  // floaters
  const tS = { x: 0, z: 0, vx: 0, vz: 0, yb: 0, vb: 0, sx: 0, sy: 0, r: 30, s: 0.5, alpha: 0, landK: 1, from: null, labelY: 0, labelYT: 0, labelX: 0, labelXT: 0, side: 'above', labelW: 0, labelFade: -1, plateW: 0, plateH: 0, calm: 0.4, tension: 0.5, outD: 0, outU: 0, rot: 0, surf: 1, landed: true,
    offX: 0, offY: 0, koX: 0, koY: 0, koFor: 0, vis: 1, dP: 1, vzP: 0, surfShown: 0, shownOp: 0 };
  const bubbles = [];                // { i, x, z, vx, vz, yb, vb, rot, rv, D, sx, sy, alpha, state, lift, glowAge, morph, from, landK, waitIdx }
  let waiting = [];                  // photo indices waiting below the surface
  let riseClock = 0, slotsAll = null; // (slotsAll: the near slots and the far row, for this layout)
  // hero
  // (left/right/top/liveBottom: the live body box, bob and tilt included — the keep-out; h, bottom: where the
  // shell put it, the world's own float excluded — the waterline)
  const hero = { ok: false, cx: 0, bottom: 0, top: 0, left: 0, right: 0, liveBottom: 0, h: 1, x: 0, z: 0, s: 1, yb: 0, vb: 0, lift: 0, tilt: 0, liftApplied: 0, tiltApplied: 0, floatK: 1, restB: 0, lipGrad: null, lipKey: '' };
  const so = { x: 0, y: 0, s: 0 }, wo = { x: 0, z: 0, s: 0 }, sm = {};
  let layoutFreeW = 0;   // the stage's free width the plan was made for (ctx.freeW)
  // the right edge things on the water keep inside: the stage's free width (left of the shell's side panel while open)
  const freeRight = () => (layoutFreeW > 0 ? Math.min(W, layoutFreeW) : W);
  let layoutRest = null, layoutBandB = 0, pendingRect = null, pendingFor = 0, relayoutClock = 0, skyKey = '', camKey = '';
  let measureG = null;
  const layoutLog = { n: 0, last: null };                    // (QA: how often the screen was re-planned, and why)
  const K = { on: false, x0: 0, y0: 0, x1: 0, y1: 0 };      // the hero's keep-out this frame (screen px; its live body)
  const Kr = { on: false, x0: 0, y0: 0, x1: 0, y1: 0 };     // …and where it rests (its own bob excluded)

  // ------------------------------------------------------------ layout --
  /**
   * The hero's live body box (its bob and tilt included): what nothing may cover. Read once a frame, at the start of the
   * frame before this world writes anything (the float), and cached: a host whose rect() measures the layout never
   * has it forced mid-frame by us.
   */
  let boxFrame = -1, boxCache = null, frameNo = 0;
  function mallowBox() {
    if (boxFrame === frameNo) return boxCache;
    boxFrame = frameNo;
    try { boxCache = normBox(mallow?.rect?.() || mallow?.bodyRect?.()); } catch { boxCache = null; }
    return boxCache;
  }
  /**
   * Where the shell put the hero: its body box without this world's own float. The adapter's
   * restRect() when it has one; else the live box with the lift and tilt we asked for undone
   * (rigid: a w × h body tilted by θ has a box w·cos θ + h·sin θ wide).
   */
  function restBox(live = mallowBox()) {
    let r = null;
    try { r = normBox(mallow?.restRect?.()); } catch { r = null; }
    if (r) return r;
    const m = live;
    if (!m) return null;
    // (only when the float really moves the body: some hosts take float() and do nothing with it)
    if (!(fl.vB < fl.vA * 0.6)) return m;
    const th = ((hero.tiltApplied || 0) * Math.PI) / 180, c = Math.cos(th), sn = Math.abs(Math.sin(th)), den = c * c - sn * sn;
    let w = m.width, h = m.height;
    if (sn > 1e-3 && den > 0.5) { w = Math.max(20, (m.width * c - m.height * sn) / den); h = Math.max(20, (m.height * c - m.width * sn) / den); }
    const cx = (m.left + m.right) / 2, cy = (m.top + m.bottom) / 2 + (hero.liftApplied || 0) * h;
    return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2, width: w, height: h };
  }
  /**
   * Does this host's float() move the body? The live box's top with and without the lift undone: whichever is
   * steadier frame to frame tells (a no-op float leaves the live box still while the undone one would bob).
   */
  const fl = { vA: 0, vB: 0, a: null, b: null };
  function floatEvidence(m) {
    const a = m.top, b = m.top + (hero.liftApplied || 0) * m.height;
    if (fl.a != null) { const da = a - fl.a, db = b - fl.b; fl.vA += (da * da - fl.vA) * 0.05; fl.vB += (db * db - fl.vB) * 0.05; }
    fl.a = a; fl.b = b;
  }
  const bandBottom = () => (ctx.band?.y || 0) + (ctx.band?.h || 0);
  /** W2's ThoughtLayer when it draws the person's thought (it measures and shows the words: one source of truth), else null. */
  const wordsLayer = () => (thought && !thought.draw && ctx.thoughtLayer?.plateFor ? ctx.thoughtLayer : null);
  /**
   * The words plate at the font the thought uses: ≤ `lines` lines at 17 → 15 px (null: one line does not fit at 15 px).
   * When W2's layer draws the words, the very plate it will show for that budget (ThoughtLayer.plateFor, as the storm
   * plans it) — taller by the room the layer keeps between the thought (at radius r) and its words beyond this world's
   * own 4 px, so a plan clear of the band and the hero is clear where the layer really hangs them — and `fit`, the budget
   * to ask the layer for (thought.labelFit).
   */
  function plateFor(tok, maxText, lines = 2, r = 0) {
    if (!tok) return null;
    const L = wordsLayer();
    if (L) {
      const maxW = Math.round(maxText + 2 * OCEAN.LABEL_PAD_X);
      let P = null;
      try { P = L.plateFor(thought, { lines, maxW, r: r > 0 ? r : null, z: 0 }); } catch { P = null; }
      if (P && P.w > 0 && P.h > 0) {
        const rr = r > 0 ? r : (thought.r || tS.r) * (thought.scale || 1);
        const pad = Number.isFinite(P.above) ? Math.max(0, Math.ceil(P.above - (rr + 4))) : 0;
        return { w: Math.ceil(P.w), h: Math.ceil(P.h) + pad, lines: P.rows || P.lines || lines, textMax: maxText, fit: { lines, maxW }, pad };
      }
    }
    try {
      measureG ||= makeCanvas(4, 4).getContext('2d');
      for (const px of [17, 16, 15]) {
        measureG.font = ctx.font(px, 700);
        const ls = wrapLines(measureG, tok, maxText);
        if (ls.length <= lines || (px === 15 && lines > 1)) {
          const n = Math.min(lines, ls.length);
          let tw = 0; for (let k = 0; k < n; k++) tw = Math.max(tw, measureG.measureText(ls[k]).width);
          return { w: Math.ceil(tw + 2 * OCEAN.LABEL_PAD_X), h: Math.ceil(n * OCEAN.LABEL_LINE + 2 * OCEAN.LABEL_PAD_Y), lines: n, textMax: maxText };
        }
      }
    } catch { /* fallback estimate */ }
    return null;
  }
  /** The thought's on-screen radius and centre y at distance d (× Z0), on a plan's settled camera. */
  const fa = { rr: 0, sy: 0 };
  function farAt(p, d) {
    const r = p.home.r, s = 1 / (1 + d);
    const surf = Math.max(10 / r, Math.pow(s / 0.5, 0.85)), rr = r * surf, wy = p.hy + p.Hw * s;
    fa.rr = rr; fa.sy = wy - 0.55 * rr;
    return fa;
  }
  /** Do words h px tall fit above the thought at distance d, under the band? */
  const aboveFits = (p, h, d) => { farAt(p, d); return fa.sy - fa.rr - 4 - h >= bandBottom() + 4; };
  /** How far the thought may drift on this screen: as far as its words still fit above it (or beside it, on a wide screen). */
  function capFor(p, h, w) {
    if (!h || (W - 2 * OCEAN.EDGE - 60) / 2 >= w) return OCEAN.CAP;
    for (let d = OCEAN.CAP; d > OCEAN.FAR + 0.6; d -= 0.1) if (aboveFits(p, h, d)) return d;
    return OCEAN.FAR + 0.6;
  }
  function relayoutCheck(dt) {
    relayoutClock += dt;
    if (relayoutClock < 0.25) return;
    const step = relayoutClock; relayoutClock = 0;
    const r = restBox();
    const fw = Number.isFinite(ctx.freeW) && ctx.freeW > 0 ? Math.min(W, ctx.freeW) : W;
    const changed = boxMoved(r, layoutRest, RELAYOUT_TOL) || Math.abs(bandBottom() - layoutBandB) > 4 || Math.abs(fw - layoutFreeW) > 4;
    if (!changed) { pendingRect = null; pendingFor = 0; return; }
    // wait until the move has settled (the shell glides its Mallow for 720 ms), or 2 s at most
    pendingFor += step;
    if (pendingRect && boxMoved(r, pendingRect, 8) && pendingFor < 2) pendingFor = Math.min(pendingFor, step);
    pendingRect = r;
    if (pendingFor >= 0.5) { pendingRect = null; pendingFor = 0; layout(false); }
  }

  function layout(first = true) {
    frameNo++;                                     // (a fresh read: the screen or the hero may just have changed)
    const live = mallowBox(), rest = restBox(live);
    layoutLog.n++; layoutLog.last = { first, t: Math.round(elapsed * 10) / 10, from: layoutRest && { ...layoutRest }, to: rest && { ...rest }, bandB: bandBottom(), bandWas: layoutBandB };
    layoutRest = rest; layoutBandB = bandBottom();
    const tok = thought ? (thought.token || words?.token || '') : '';
    const n = Math.min(7, photos?.n || 0);
    // (the thought, its words and the bubbles keep to the stage's free width: left of the shell's side panel while open)
    const XR = Number.isFinite(ctx.freeW) && ctx.freeW > 0 ? Math.min(W, ctx.freeW) : W;
    layoutFreeW = XR;
    const max2 = Math.min(OCEAN.PLATE_MAX, XR - 2 * OCEAN.EDGE) - 2 * OCEAN.LABEL_PAD_X, max1 = XR - 2 * OCEAN.EDGE - 2 * OCEAN.LABEL_PAD_X;
    // (the thought's radius at home on this screen — planOcean's, which does not depend on the words: the layer's plate
    // hangs from it)
    const rHome = tok && wordsLayer() ? planOcean({ W, H, band: ctx.band, mallow: rest, n: 0, textW: 0, x1: XR }).home?.r || 0 : 0;
    let pl = tok ? plateFor(tok, max2, 2, rHome) : null;
    let p = planOcean({ W, H, band: ctx.band, mallow: rest, n, textW: pl ? pl.w - 2 * OCEAN.LABEL_PAD_X : (tok ? tok.length * 8.5 : 0), plate: pl, x1: XR });
    let textMax = max2;
    plateLines = 2;
    // a short screen: the words on one wide line, when two lines would not fit above the thought far out
    if (pl && pl.lines > 1 && !aboveFits(p, pl.h, OCEAN.FAR + 0.6)) {
      const pl1 = plateFor(tok, max1, 1, rHome);
      if (pl1 && pl1.h < pl.h) { p = planOcean({ W, H, band: ctx.band, mallow: rest, n, textW: pl1.w - 2 * OCEAN.LABEL_PAD_X, plate: pl1, x1: XR }); pl = pl1; plateLines = 1; textMax = max1; }
    }
    // the plate W2's layer is asked to show while this world drives the thought: the one planned round (a new object per
    // plan — the layer gives its words their whole budget again for it)
    wordsFit = pl?.fit ? { lines: pl.fit.lines, maxW: pl.fit.maxW } : null;
    plan = p;
    if (pl && plan.plate) Object.assign(plan.plate, { w: pl.w, h: pl.h, lines: pl.lines });
    plan.textMax = textMax;
    capD = capFor(plan, pl ? pl.h : 0, pl ? pl.w : 0);
    hyTarget = plan.hy;
    if (first || !cam) { camHome = plan.homeY; camWater = plan.waterY; if (!melt || reduced()) hyNow = hyTarget; }
    if (!cam) cam = makeCamera({ W, H, hy: hyNow || hyTarget, homeY: camHome, waterY: camWater });
    cam.W = W; cam.H = H; cam.homeY = camHome; cam.waterY = camWater; fitCamera(cam, hyNow || hyTarget);
    if (first) lastZ0 = cam.Z0;               // (a fresh plan: positions are set for this camera)
    // the drift gain from the settled camera (what the person will play with; cached per screen)
    const target = makeCamera({ W, H, hy: plan.hy, homeY: plan.homeY, waterY: plan.waterY });
    driftGain = calibrateDrift(target, U);
    // (how tall a swell may look on this screen: its drift stays the stroke's own)
    sea.capA = swellCap(target);
    rowX.chopMax = FLICK_U * U * 1.3;
    // the dawn sits off-axis, on the side away from the words, its path a column in the open water beside the hero
    {
      const M = plan.mallow, right = (plan.plate ? plan.plate.x : plan.home.x) <= W / 2 + 8;
      xd = right ? clamp((M.right + W - OCEAN.EDGE) / 2, W * 0.7, W * 0.88) : clamp((M.left + OCEAN.EDGE) / 2, W * 0.12, W * 0.3);
      xd = Math.round(xd);
    }
    buildImage();
    buildSky();
    if (!sea.amb.length) {
      const a = R() * 0.6 - 0.3;
      sea.setAmbient([
        { lambda: 1.35 * U, A: 0.07 * 1.35 * U / TAU, dx: Math.sin(a), dz: Math.cos(a), ph: R() * TAU },
        { lambda: 0.82 * U, A: 0.06 * 0.82 * U / TAU, dx: Math.sin(a + 0.8), dz: Math.cos(a + 0.8), ph: R() * TAU },
        { lambda: 0.47 * U, A: 0.05 * 0.47 * U / TAU, dx: Math.sin(a - 1.0), dz: Math.cos(a - 1.0), ph: R() * TAU },
      ]);
      for (const w of sea.amb) w.Abase = w.A0;
    }
    // (the sea's own breathing stands well under the cap too: on a wide screen, where the near water is seen magnified
    // ×4, swells sized by the screen would roll a hand's breadth tall with nobody touching it)
    { let sum = 0; for (const w of sea.amb) sum += w.Abase; const f = sum > 0 ? Math.min(1, (0.45 * sea.capA) / sum) : 1; for (const w of sea.amb) w.A0 = w.Abase * f; }
    tS.r = plan.home.r;
    tS.plateW = plan.plate?.w || 0; tS.plateH = plan.plate?.h || 0;
    slotsAll = null;
    heroFromRect(true);
    placeHint();
    // (a relayout: bubbles that the new layout puts under the hero, or that never moved yet, find a free place; before
    // the person has touched the water the thought glides to its new home too)
    if (!first) {
      reslot(false);
      if (melt) rerouteMelt();
      // (its size eases from the one shown, as its place does: no pop when the new home is nearer or further)
      if (!everTouched && thought && tS.landK >= 1 && !tS.from && !melt && cam) { const a = tS.alpha, s0 = tS.surf; thoughtHome(); tS.alpha = a; tS.snapOff = a > 0.05; if (a > 0.05 && s0 > 0) tS.surfShown = s0; }
      else if (thought && tS.landK >= 1 && !tS.from && !melt && cam && tS.alpha > 0.05) {
        // the hero moved (a turned phone, the shell's new layout): if the thought's place on the water is now on it, the
        // thought glides back into its home's column at the same distance (never pushed out to the horizon by it)
        const rr = tS.r * tS.surf + 4, M = plan.rects.mallow;
        if (tS.sx + rr > M.x0 && tS.sx - rr < M.x1 && tS.sy + rr > M.y0 - 2 * rr) {
          tS.z = clamp(tS.z, cam.Z0, capD * cam.Z0); tS.x = (plan.home.x - W / 2) / scaleAt(cam, tS.z); tS.vx = 0;
          tS.dP = Math.min(tS.dP, tS.z / cam.Z0); tS.snapOff = true;
        }
      }
    }
  }

  function buildImage() {
    const y0 = Math.floor(Math.min(plan.hy, hyNow || plan.hy)) - CELL;
    const w = Math.ceil(W / CELL) + 1, h = Math.ceil((H - y0) / CELL) + 1;
    if (!img || w !== iw || h !== ih) {
      img = makeCanvas(w, h); imgG = img.getContext('2d');
      imgData = imgG.createImageData(w, h);
      img2 = makeCanvas(w * 2, h * 2); img2G = img2.getContext('2d'); img2G.imageSmoothingEnabled = true;
      colI = new Int16Array(w); colF = new Float32Array(w);
    }
    if (!wake || w !== wake.cols || h !== wake.rows || y0 !== imgY0) {
      // the wake moves with the water: a relayout keeps every ripple the finger made
      const old = wake, dRows = old ? Math.round((y0 - imgY0) / CELL) : 0;
      wake = new Wake(w, h, CELL); wake.y0 = y0; wake.c2 = 0.17; wake.visc = 0.08;
      if (old) wake.adopt(old, dRows);
    }
    iw = w; ih = h; imgY0 = y0;
    colX0 = -0.04 * W; colStep = (1.08 * W) / (COLS - 1);
    for (let i = 0; i < iw; i++) { const g = ((i + 0.5) * CELL - colX0) / colStep; const i0 = clamp(Math.floor(g), 0, COLS - 2); colI[i] = i0; colF[i] = clamp(g - i0); }
    camKey = -1;
    wakeRows();
  }
  /**
   * Ripples in the wake slow and flatten with distance (screen speed ∝ s horizontally, ∝ s²·Hw/Z0
   * vertically). Only when the camera has moved (no allocation).
   */
  function wakeRows() {
    if (!wake || !cam) return;
    const key = Math.round(cam.hy * 4) * 1e8 + Math.round(cam.Hw * 2) * 1e4 + Math.round(cam.Z0);
    if (key === camKey) return;
    camKey = key;
    const sW = clamp((cam.waterY - cam.hy) / cam.Hw, 0.3, 3), q = (cam.ratio || 0.6) * 1.3;
    for (let j = 0; j < wake.rows; j++) {
      const y = wake.y0 + (j + 0.5) * CELL;
      const s = Math.max(0.02, (y - cam.hy) / cam.Hw);
      wake.setRow(j, clamp(s / sW, 0.1, 1), clamp(((s * s) / (sW * sW)) * q, 0.08, 1));
    }
  }

  function buildSky() {
    const d = ctx.dprBack || 1;
    const hy = plan.hy;
    // (only for a new screen, horizon or dawn: never for the hero's own bob)
    const key = `${W}|${H}|${Math.round(hy)}|${d}|${Math.round(xd)}`;
    if (skyC && key === skyKey) return;
    skyKey = key;
    skyC = makeCanvas(Math.ceil(W * d), Math.ceil((hy + 8) * d));
    const g = skyC.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    const gr = g.createLinearGradient(0, hy, 0, 0);
    for (const st of SKY) gr.addColorStop(clamp(st.t), `rgb(${st.c.map(Math.round).join(',')})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, hy + 8);
    // the storm's last clouds: long, soft, broken bands of haze (overlapping feathered ellipses, never a ruled line),
    // their undersides warmed by the dawn where they are low
    const RC = (s) => { let a = s >>> 0 || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
    const r = RC(ctx.seed ^ 0x51ab);
    const puff = (x, y, rx, ry, rgb, a) => {
      g.save(); g.translate(x, y); g.scale(1, ry / rx);
      const cg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      cg.addColorStop(0, `rgba(${rgb},${a})`); cg.addColorStop(0.55, `rgba(${rgb},${a * 0.45})`); cg.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = cg; g.fillRect(-rx, -rx, 2 * rx, 2 * rx); g.restore();
    };
    for (let k = 0; k < 4; k++) {
      const cy = hy * (0.2 + 0.52 * r()), cw = W * (0.45 + 0.55 * r()), cx = W * (0.12 + 0.76 * r()), ch = 5 + 8 * r();
      const low = cy / hy;                                  // (lower clouds catch more of the dawn)
      for (let b = 0; b < 7; b++) {
        if (r() < 0.22) continue;                           // broken: gaps in the band
        const u = b / 6 - 0.5, bx = cx + u * cw + (r() - 0.5) * cw * 0.12, by = cy + (r() - 0.5) * ch * 0.8;
        const rx = cw * (0.12 + 0.12 * r()) * (1 - 0.6 * Math.abs(u)), ry = ch * (0.9 + 0.8 * r());
        puff(bx, by, rx, ry, '40,28,78', 0.2 + 0.12 * r());
        // the warm underside: a fainter, lower, narrower glow (soft, no edge)
        puff(bx + (r() - 0.5) * rx * 0.3, by + ry * 0.55, rx * 0.8, ry * 0.5, '255,168,170', (0.03 + 0.07 * low) * (0.6 + 0.4 * r()));
      }
    }
    // stars: many faint ones baked in (fewer towards the dawn), a few bright ones twinkle live
    stars = [];
    const n = Math.round(W * hy / 1400);
    for (let k = 0; k < n; k++) {
      const x = r() * W, y = r() * (hy - 14);
      const near = Math.exp(-(((x - xd) / (W * 0.4)) ** 2)) * smoothstep(hy * 0.6, hy, y);
      const a = (0.15 + 0.5 * r() * r()) * (1 - 0.8 * near) * (0.4 + 0.6 * (1 - y / hy));
      if (k < 14 && a > 0.25) { stars.push({ x, y, a, ph: r() * TAU, f: 0.4 + r() * 1.1, s: 1.2 + r() * 1.2 }); continue; }
      g.fillStyle = `rgba(230,244,255,${a.toFixed(3)})`;
      g.beginPath(); g.arc(x, y, 0.5 + r() * 0.7, 0, TAU); g.fill();
    }
    if (sprites) return;
    // sprites (cached by util.js), made once
    sprites = {
      crest: glowSprite(C.crest, { size: 64, core: 0.35 }), crestSoft: glowSprite(C.crest, { size: 128 }), loomi: glowSprite(C.loomi, { size: 128 }),
      dawn: glowSprite(C.dawn, { size: 64, core: 0.5 }), white: glowSprite(C.white, { size: 64, core: 0.4 }), warm: glowSprite('#ffc78a', { size: 128 }),
      glint: glintSprite('#fff3d6', 48), glintC: glintSprite(C.crest2, 48), star: glintSprite('#e6f4ff', 32),
    };
    sprites.plankton = [sprites.crest, glowSprite(C.crest2, { size: 64, core: 0.6 }), sprites.white];
    sprites.chop = glowSprite('#e9fffb', { size: 32, core: 0.8, falloff: 6 });
    // a soft shade of deep water behind a bubble, so a photo reads against the dawn's glare
    sprites.shade = makeCanvas(64, 64);
    { const sg = sprites.shade.getContext('2d'), rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(3,18,30,0.7)'); rg.addColorStop(0.62, 'rgba(3,18,30,0.42)'); rg.addColorStop(1, 'rgba(3,18,30,0)');
      sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64); }
    // the dawn: a wide warm glow resting on the horizon (drawn live, its strength follows dawnK)
    dawnSpr = makeCanvas(256, 128);
    { const dg = dawnSpr.getContext('2d'); const rg = dg.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, 'rgba(255,226,170,0.95)'); rg.addColorStop(0.18, 'rgba(255,200,140,0.6)'); rg.addColorStop(0.45, 'rgba(255,160,150,0.22)'); rg.addColorStop(1, 'rgba(255,150,160,0)');
      dg.fillStyle = rg; dg.fillRect(0, 0, 256, 128); }
    horizonSpr = makeCanvas(256, 8);
    { const hg = horizonSpr.getContext('2d'); const lg = hg.createLinearGradient(0, 0, 256, 0);
      lg.addColorStop(0, 'rgba(124,245,255,0)'); lg.addColorStop(0.3, 'rgba(160,240,255,0.08)'); lg.addColorStop(0.5, 'rgba(255,226,180,0.55)'); lg.addColorStop(0.7, 'rgba(160,240,255,0.08)'); lg.addColorStop(1, 'rgba(124,245,255,0)');
      hg.fillStyle = lg; hg.fillRect(0, 3.4, 256, 1.2); hg.globalAlpha = 0.4; hg.fillRect(0, 2, 256, 4); }
  }

  /**
   * Where a ghost fingertip draws one slow, long stroke: up the clear water beside the hero ('away'),
   * or, once the thought is far out, down it ('back'). The column with the longest free run, never
   * over a bubble, the thought or its words (what floats now; before anything does, the plan).
   */
  function placeHint(dir = 'away') {
    if (!plan) return;
    const E = OCEAN.EDGE;
    const ML = hero.ok ? hero.left : plan.mallow.left, MR = hero.ok ? hero.right : plan.mallow.right;
    const bot0 = Math.min(plan.floor - 8, (hero.ok ? hero.liveBottom : plan.mallow.bottom) - 4), top0 = plan.hy + 14;
    let n = 0;
    const add = (x0, y0, x1, y1) => { if (n < hintObs.length) { const o = hintObs[n++]; o.x0 = x0; o.y0 = y0; o.x1 = x1; o.y1 = y1; } };
    if (bubbles.length) for (const b of bubbles) add(b.sx - b.D / 2 - 10, b.sy - b.D / 2 - 10, b.sx + b.D / 2 + 10, b.sy + b.D / 2 + 12);
    else for (const sl of plan.slots) add(sl.x - sl.D / 2 - 10, sl.y - sl.D / 2 - 10, sl.x + sl.D / 2 + 10, sl.y + sl.D / 2 + 12);
    if (thought) {
      const tx = tS.alpha > 0.1 ? tS.sx : plan.home.x, ty = tS.alpha > 0.1 ? tS.sy : plan.home.y, rr = tS.alpha > 0.1 ? tS.r * tS.surf : plan.home.r;
      add(tx - rr - 10, ty - rr - 10, tx + rr + 10, ty + rr + 10);
      if (tS.plateW) { const P = tS.alpha > 0.1 ? plateRect() : plan.rects.plate; if (P) add(P.x0 - 6, P.y0 - 6, P.x1 + 6, P.y1 + 6); }
    }
    let best = null;
    for (let side = -1; side <= 1; side += 2) {
      const a = side < 0 ? E + 12 : MR + 18, b = side < 0 ? ML - 18 : freeRight() - E - 12;
      if (b < a) continue;
      for (const f of HINT_F) {
        const x = a + (b - a) * f;
        // the longest free run of this column, from the near water up
        let run = 0, runBot = bot0, bestRun = 0, bestBot = bot0;
        for (let y = bot0; y >= top0; y -= 4) {
          let hit = false;
          for (let k = 0; k < n; k++) { const o = hintObs[k]; if (x > o.x0 - 14 && x < o.x1 + 14 && y > o.y0 && y < o.y1) { hit = true; break; } }
          if (hit) { run = 0; continue; }
          if (!run) runBot = y;
          run += 4;
          if (run > bestRun) { bestRun = run; bestBot = runBot; }
        }
        if (!best || bestRun > best.run) best = { x, bot: bestBot, top: bestBot - bestRun, run: bestRun, side };
      }
    }
    if (!best || best.run < 36) { hint.ok = false; return; }
    hint.ok = true;
    const xa = best.x, xb = best.x + best.side * U * 0.03;
    if (dir === 'back') { hint.x0 = xb; hint.y0 = best.top + 4; hint.x1 = xa; hint.y1 = best.bot; }
    else { hint.x0 = xa; hint.y0 = best.bot; hint.x1 = xb; hint.y1 = best.top + 4; }
  }
  const hintObs = Array.from({ length: 12 }, () => ({ x0: 0, y0: 0, x1: 0, y1: 0 }));
  const HINT_F = [0.5, 0.2, 0.8];

  // ------------------------------------------------------------- hero --
  function heroFromRect(force) {
    const m = mallowBox() || plan?.mallow;
    if (!m) { hero.ok = false; K.on = false; return; }
    hero.ok = true;
    if (!force) floatEvidence(m);
    hero.left = m.left; hero.right = m.right ?? m.left + m.width; hero.top = m.top; hero.liveBottom = m.bottom ?? m.top + m.height;
    hero.cx = (hero.left + hero.right) / 2;
    // the rest waterline: where the shell put the body (this world's own bob excluded); a real move follows smoothly
    const r = (force ? layoutRest : restBox(m)) || m;
    hero.h = r.height ?? r.bottom - r.top;
    const b = r.bottom ?? r.top + hero.h;
    if (force || Math.abs(b - hero.restB) > 40) hero.restB = b; else hero.restB += (b - hero.restB) * 0.06;
    hero.bottom = hero.restB;
    // the keep-out: the live body (a little in from its box's empty corners), GAP clear above and beside it
    const w = hero.right - hero.left;
    K.on = true; K.x0 = hero.left + 0.05 * w - OCEAN.GAP; K.x1 = hero.right - 0.05 * w + OCEAN.GAP; K.y0 = hero.top - OCEAN.GAP; K.y1 = hero.liveBottom;
    const rw = (r.right ?? r.left + r.width) - r.left;
    Kr.on = true; Kr.x0 = r.left + 0.05 * rw - OCEAN.GAP; Kr.x1 = r.left + 0.95 * rw + OCEAN.GAP; Kr.y0 = r.top - OCEAN.GAP; Kr.y1 = b;
  }

  // -------------------------------------------------------------- prepare --
  async function prepare() {
    if (prepared) return;
    layout(true);
    // warm the bubble sprites so the first frame never stalls
    if (photos?.n) {
      const scratch = makeCanvas(8, 8).getContext('2d');
      for (let i = 0; i < Math.min(7, photos.n); i++) { photos.draw(scratch, i, 4, 4, 60, { shape: 'bubble', sheen: false, shadow: false }); photos.draw(scratch, i, 4, 4, 60, { shape: 'card', shadow: false }); }
    }
    bubbleFilm();
    try { await ctx.fontsReady?.(['voice'], 900); } catch { /* fallback font is fine */ }
    // the very first frame of the sea is drawn now (so a melt never shows an empty layer)
    frame(0, 0);
    prepared = true;
  }

  // a cached glassy film for a bubble (rim, iridescent edge, highlight) — one sprite, scaled
  let film = null;
  function bubbleFilm() {
    if (film) return;
    const S = 128; film = makeCanvas(S, S);
    const g = film.getContext('2d'), c = S / 2, r = S / 2 - 2;
    let gr = g.createRadialGradient(c, c, r * 0.72, c, c, r);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(168,255,240,0.18)'); gr.addColorStop(0.92, 'rgba(255,214,250,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0.55)');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
    g.save(); g.translate(c - r * 0.36, c - r * 0.42); g.rotate(-0.65); g.scale(1, 0.5);
    gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.32); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.32, 0, TAU); g.fill(); g.restore();
    gr = g.createRadialGradient(c + r * 0.4, c + r * 0.45, 0, c + r * 0.4, c + r * 0.45, r * 0.2); gr.addColorStop(0, 'rgba(200,255,250,0.5)'); gr.addColorStop(1, 'rgba(200,255,250,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(c + r * 0.4, c + r * 0.45, r * 0.2, 0, TAU); g.fill();
  }

  // ------------------------------------------------------------ floaters --
  /** Put the Thought Mallow at its home on the water (cold start or a new thought). */
  function thoughtHome() {
    tS.x = (plan.home.x - W / 2) / 0.5; tS.z = cam ? cam.Z0 : 500; tS.vx = 0; tS.vz = 0; tS.yb = 0; tS.vb = 0; tS.dP = 1; tS.vzP = 0;
    tS.offX = tS.offY = tS.koX = tS.koY = 0; tS.koFor = 0;
    tS.side = plan.plate?.side === 'below' ? 'below' : 'above';
    tS.labelX = tS.labelXT = 0;
    tS.labelY = tS.labelYT = tS.side === 'below' ? plan.home.r * 0.98 + 8 : -(plan.home.r + 4 + (plan.plate?.h || 40));
    tS.labelW = plan.textMax; tS.labelFade = -1;
  }
  /**
   * Slots for the photos: the planned ones (near, roomy — smaller beside the hero on a small phone),
   * then small ones far out, at staggered depths, on lanes clear of the thought's column (it drifts out along it, and
   * bubbles its size never line up beside it) and of its words — where waiting photos take turns.
   */
  function bubbleSlots(n = 7) {
    if (slotsAll && slotsAll.n >= n) return slotsAll.list;
    const out = plan.slots.map((sl) => ({ x: sl.x, y: sl.y, D: sl.D, far: false }));
    const fin = makeCamera({ W, H, hy: plan.hy, homeY: plan.homeY, waterY: plan.waterY });
    const P = plan.rects.plate, T = plan.rects.thought, Z = plan.rects.zone, E = OCEAN.EDGE;
    const hit = (b, o) => o && b.x0 < o.x1 + 6 && b.x1 > o.x0 - 6 && b.y0 < o.y1 + 6 && b.y1 > o.y0 - 6;
    for (let pass = 0; pass < 2; pass++) {
      // the thought's column: as wide as its clear zone (first), else just its body and a margin (a wide words plate
      // leaves no lanes beside it)
      const half = pass ? 2.5 * plan.home.r + 24 : Math.max(2.5 * plan.home.r, ((P ? P.x1 - P.x0 : 0) / 2) + 6);
      const cL = plan.home.x - half, cR = plan.home.x + half;
      let lane = out.filter((q) => q.far).length;
      for (let x = E + 14; x <= freeRight() - E - 14 && out.length < n + 2; x += 2) {
        const d = FAR_D[lane % FAR_D.length], s0 = 1 / (1 + d), D = bubbleSize(s0, d, U);
        if (x - D / 2 < E || x + D / 2 > freeRight() - E) continue;
        if (x + D / 2 > cL - 4 && x - D / 2 < cR + 4) continue;
        const y = fin.hy + fin.Hw * s0 - 0.3 * D;
        const b = { x0: x - D / 2, x1: x + D / 2, y0: y - D / 2, y1: y + D / 2 };
        if (hit(b, P) || hit(b, T) || hit(b, Z) || hit(b, plan.rects.band)) continue;
        if (out.some((q) => Math.hypot(q.x - x, q.y - y) < (q.D + D) / 2 + OCEAN.BUBBLE_GAP + 6)) continue;
        out.push({ x, y, D, far: true });
        lane++; x += D;
      }
      if (out.some((q) => q.far)) break;
    }
    slotsAll = { n, list: out };
    return out;
  }
  const FAR_D = [7.4, 8.5, 7.9, 8.8, 7.6];
  const newBubble = (o) => Object.assign({ i: 0, x: 0, z: 0, vx: 0, vz: 0, yb: 0, vb: 0, rot: 0, rv: 0, D: 44, Dd: -1, cap: 400, offX: 0, offY: 0, ovx: 0, ovy: 0, vsx: 0, vsy: 0, sx: 0, sy: 0, gx: 0, gy: 0, alpha: 0, state: 'rise', riseK: 0, lift: 0, glowAge: -1, morph: 1, glide: 0, wait: 0, from: null, target: null, route: null, T: 2, P: null, leads: null, go: false, still: false, fadeWait: null, away: false, capFor: 0, leaveK: 0, ph: R() * TAU }, o);
  // ------------------------------------------------------ the melt's glides --
  // (review r4) Every postcard's bubble glides down a way planned in advance, on a schedule planned with it: beside the
  // hero, where the water is one bubble wide, the one for the nearest slot goes first and the others follow in turn, so
  // nothing ever has to pass, wait behind or change places with another, and the melt ends a moment after the
  // director's (never a shuffle).
  /** A way down, as RT_N points spaced evenly along it (arc length): xs, ys, and its length L. */
  const RT_N = 33;
  const newRoute = () => ({ xs: new Float32Array(RT_N), ys: new Float32Array(RT_N), L: 0 });
  /**
   * The way a postcard's bubble (radius r) glides from (c.x, c.y) to slot q: across to the slot's column (above the
   * thought's home when the way across would run over it), then down the column into its slot — corners rounded
   * (Chaikin), never up into the band. Slots lie beside the hero, so a way down a slot's column never crosses it. (The
   * words only settle above the thought once no glide crosses their place: a way may pass where they will be.)
   */
  function route(c, q, r, out = newRoute()) {
    const T = plan.rects.thought;
    const m = r + 6, bb = bandBottom() + 4 + r;
    const top = Math.max(bb, T ? T.y0 - m : Infinity);
    // (how far the way across, at height y, runs inside the thought's home before it is out at the slot's side: a short
    // way out of it is taken as it is)
    const runIn = (o, y) => {
      if (!o || y <= o.y0 - m || y >= o.y1 + m) return 0;
      const a = Math.max(Math.min(c.x, q.x), o.x0 - m), b2 = Math.min(Math.max(c.x, q.x), o.x1 + m);
      return Math.max(0, b2 - a);
    };
    let y = c.y;
    if (q.y > c.y + 4 && runIn(T, y) > 1.5 * r) y = Math.min(y, top);
    const pts = [[c.x, c.y]];
    if (y < c.y - 1) pts.push([c.x, y]);
    if (Math.abs(q.x - c.x) > 2 && Math.abs(q.y - y) > 2) pts.push([q.x, y]);
    pts.push([q.x, q.y]);
    // rounded corners: three rounds of corner cutting (the ends stay put)
    let p = pts;
    for (let it = 0; it < 3 && p.length > 2; it++) {
      const o = [p[0]];
      for (let k = 0; k < p.length - 1; k++) {
        const [ax, ay] = p[k], [bx, by] = p[k + 1];
        if (k > 0) o.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by]);
        if (k < p.length - 2) o.push([0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
      }
      o.push(p[p.length - 1]);
      p = o;
    }
    // evenly along its length
    const cum = [0];
    for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
    const L = cum[cum.length - 1];
    out.L = L;
    for (let j = 0, k = 1; j < RT_N; j++) {
      const s = (L * j) / (RT_N - 1);
      while (k < p.length - 1 && cum[k] < s) k++;
      const f = cum[k] > cum[k - 1] ? clamp((s - cum[k - 1]) / (cum[k] - cum[k - 1])) : 0;
      out.xs[j] = p[k - 1][0] + (p[k][0] - p[k - 1][0]) * f; out.ys[j] = p[k - 1][1] + (p[k][1] - p[k - 1][1]) * f;
    }
    return out;
  }
  /** The point a fraction u (0..1) of the way along a route. */
  function routeAt(rt, u, out) {
    const f = clamp(u) * (RT_N - 1), j = Math.min(RT_N - 2, Math.floor(f)), t = f - j;
    out.x = rt.xs[j] + (rt.xs[j + 1] - rt.xs[j]) * t; out.y = rt.ys[j] + (rt.ys[j + 1] - rt.ys[j]) * t;
    return out;
  }
  const MG_N = 24;                                      // samples along a glide (planning)
  const MG_DT = 0.05;                                   // s: the planner's time step
  /**
   * A glide's pace along its way: it eases up to speed over the first GLIDE_RAMP of it, glides on evenly, and eases to
   * rest over the last (smooth: no jolt at either end; its top speed only 1/(1 − GLIDE_RAMP) × its mean).
   */
  const GLIDE_RAMP = 0.2;
  const glideEase = (t) => {
    t = clamp(t);
    const a = GLIDE_RAMP, v = 1 / (1 - a);
    return t < a ? (v * t * t) / (2 * a) : t > 1 - a ? 1 - (v * (1 - t) * (1 - t)) / (2 * a) : v * (t - a / 2);
  };
  /** How long a glide of L px takes: eased, its top speed GLIDE_V (never hurried, never dawdling). */
  const glideTime = (L) => clamp(L / ((1 - GLIDE_RAMP) * GLIDE_V), 1.6, 3.4);
  /** Where a planned glide is t s after it set off (before: where its card hung; after: at its slot). */
  function glideAt(G, t, out) {
    const g = clamp(t / G.T) * MG_N, k = Math.min(MG_N - 1, Math.floor(g)), f = g - k, P = G.P;
    out.x = P[2 * k] + (P[2 * k + 2] - P[2 * k]) * f; out.y = P[2 * k + 1] + (P[2 * k + 3] - P[2 * k + 1]) * f;
    return out;
  }
  const ga = { x: 0, y: 0 }, gb = { x: 0, y: 0 };
  /**
   * The closest two planned glides come (minus their gap), B setting off dB s after A — while both are on their way
   * (returned) and, separately, while B still waits where its card hung (sepWait: no delay can change that one).
   */
  let sepWait = Infinity;
  function glideSep(A, B, dB, need, spare = 0) {
    let worst = Infinity;
    sepWait = Infinity;
    const end = Math.max(A.T, dB + B.T);
    for (let t = 0; t <= end + 1e-6; t += MG_DT) {
      glideAt(A, t, ga); glideAt(B, t - dB, gb);
      // (room to spare only while both are on their way: one coming to rest by another already in its slot is planned
      // to sit exactly its gap apart)
      const moving = t < A.T && t > dB && t < dB + B.T;
      const g = Math.hypot(ga.x - gb.x, ga.y - gb.y) - need - (moving ? spare : 0);
      if (t < dB) sepWait = Math.min(sepWait, g); else worst = Math.min(worst, g);
    }
    return worst;
  }
  /** A planned glide along a route: { route, T, P (its points along the way, eased), D }. */
  function glideModel(rt, D) {
    const P = new Float32Array(2 * (MG_N + 1)), pt = { x: 0, y: 0 };
    for (let k = 0; k <= MG_N; k++) { routeAt(rt, glideEase(k / MG_N), pt); P[2 * k] = pt.x; P[2 * k + 1] = pt.y; }
    return { route: rt, T: glideTime(rt.L), P, D };
  }
  /**
   * How long glide B (to the higher slot of a column) waits after glide A (to a lower one) sets off: the least that keeps
   * them their gap apart while both move, with room to spare (a glide trails its planned point a little, and one held off
   * trails more) — or null when no wait does. wait: how near A passes B's card while B still waits there (< 0: too near).
   */
  function followDelay(A, B) {
    const need = (A.D + B.D) / 2 + OCEAN.BUBBLE_GAP;
    // (where B's way crosses behind A's — two slots of a column a few px apart — it passes there well after A did)
    let dt0 = 0;
    const AP = A.P, BP = B.P, cr = (ox, oy, px, py, qx, qy) => (px - ox) * (qy - oy) - (py - oy) * (qx - ox);
    for (let p = 0; p < MG_N; p++) for (let q = 0; q < MG_N; q++) {
      const ax = AP[2 * p], ay = AP[2 * p + 1], bx = AP[2 * p + 2], by = AP[2 * p + 3], px = BP[2 * q], py = BP[2 * q + 1], qx = BP[2 * q + 2], qy = BP[2 * q + 3];
      if (cr(ax, ay, bx, by, px, py) * cr(ax, ay, bx, by, qx, qy) < 0 && cr(px, py, qx, qy, ax, ay) * cr(px, py, qx, qy, bx, by) < 0) dt0 = Math.max(dt0, (A.T * (p + 1)) / MG_N - (B.T * q) / MG_N + 0.7);
    }
    for (let dt = Math.ceil(dt0 * 10) / 10; dt <= A.T + 0.6; dt += 0.1) if (glideSep(A, B, dt, need, 8) >= 0) return { d: Math.min(A.T + 0.6, dt + 0.1), wait: Math.min(0, sepWait) };
    return { d: null, wait: 0 };
  }
  /**
   * Which slot each of the storm's postcards glides to, and when each sets off. Slots one above another beside the hero
   * form a column one bubble wide, so in a column the bubble for the nearest slot goes first and each one above follows
   * once those below it are far enough ahead (planned here, played out exactly: it waits for them, never passes them).
   * The assignment of least total way where nothing has to wait long, no two glides come closer than their gap (a
   * heavy cost), no two cross each other's way at the same time (never: a tangle), none crosses to the hero's other
   * side (a heavy cost) and none passes the thought on its own way home (a heavy cost). A card
   * with no slot left turns into its bubble and fades where it hangs (it takes its turn later, far out). A small exact
   * search (≤ 7 cards), pruned by the best so far. Returns { match: slot index or −1 per card, glides: per card, its
   * planned glide { route, T, P } (or null), follow(a, b): how long glide b waits after glide a sets off (or null) }.
   */
  function matchCards(cards, slots, th) {
    const n = cards.length, m = slots.length;
    const cx = hero.ok ? hero.cx : W / 2;
    const side = (x) => (x < cx - 0.12 * W ? -1 : x > cx + 0.12 * W ? 1 : 0);
    // the hero: its keep-out now and where the plan has it (a host swapped mid-melt may stand a little taller)
    const M = plan.rects.mallow, Kk = K.on ? { x0: Math.min(K.x0, M.x0), y0: Math.min(K.y0, M.y0) - 0.12 * (M.y1 - M.y0), x1: Math.max(K.x1, M.x1), y1: Math.max(K.y1, M.y1) } : M;
    const thAt = (t, out) => { const e = easeInOut(clamp(t / GLIDE_SEC)); out.x = lerp(th.x, plan.home.x, e); out.y = lerp(th.y, plan.home.y, e); out.r = tS.r * lerp(th.scale ?? 1, 1, e); return out; };
    // columns: slots that overlap side by side (one must pass the other to reach its own)
    const col = slots.map((_, j) => j);
    const find = (j) => (col[j] === j ? j : (col[j] = find(col[j])));
    for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) if (Math.abs(slots[a].x - slots[b].x) < (slots[a].D + slots[b].D) / 2 + OCEAN.BUBBLE_GAP) col[find(a)] = find(b);
    // every card × slot: its way, its glide, and what it costs alone
    const G = [], single = [];
    const pt = { x: 0, y: 0 }, tp = { x: 0, y: 0, r: 0 };
    for (let c = 0; c < n; c++) {
      G.push([]); single.push([]);
      for (let j = 0; j < m; j++) {
        const q = slots[j], r = q.D / 2, rt = route(cards[c], q, r);
        const g = glideModel(rt, q.D);
        let bad = 0;
        for (let t = 0; t <= g.T + 1e-6; t += MG_DT * 2) {
          glideAt(g, t, pt);
          if (discHits(pt.x, pt.y, r + REP_M + 2, Kk)) bad += 2000;
          if (th) { thAt(t, tp); const gap = Math.hypot(pt.x - tp.x, pt.y - tp.y) - r - tp.r - OCEAN.BUBBLE_GAP; if (gap < 0) bad += 300 - 15 * gap; }
        }
        G[c].push(g);
        single[c].push(rt.L + (q.far ? 60 : 0) + (side(cards[c].x) * side(q.x) < 0 ? 420 : 0) + Math.min(bad, 4000));
      }
    }
    const cr = (ox, oy, px, py, qx, qy) => (px - ox) * (qy - oy) - (py - oy) * (qx - ox);
    // how long b (to the higher slot of a column) waits after a (to a lower one) sets off: the least that keeps them apart
    const fmemo = new Map();
    const followTime = (a, sa, b, sb) => {
      const key = ((a * 16 + sa) * 16 + b) * 16 + sb;
      if (fmemo.has(key)) return fmemo.get(key);
      const out = followDelay(G[a][sa], G[b][sb]);
      fmemo.set(key, out);
      return out;
    };
    const memo = new Map();
    const pair = (a, sa, b, sb) => {
      const key = ((a * 16 + sa) * 16 + b) * 16 + sb;
      let v = memo.get(key);
      if (v != null) return v;
      if (find(sa) === find(sb)) {
        // one column: the one for the higher slot follows the other
        const lowA = slots[sa].y >= slots[sb].y;
        const f = lowA ? followTime(a, sa, b, sb) : followTime(b, sb, a, sa);
        // (and the one going first passes the other's card, where it still waits, no nearer than their gap)
        v = f.d == null ? 2500 : 150 * f.d + (f.wait < 0 ? 300 - 20 * f.wait : 0);
        // (the order kept: the card hanging lower takes the lower slot — of two side by side, the one nearer the column —
        // so none ever glides down past another still hanging beside its way)
        const lo = lowA ? cards[a] : cards[b], hi = lowA ? cards[b] : cards[a], qx = slots[sa].x;
        if (hi.y > lo.y + 12 || (Math.abs(hi.y - lo.y) <= 12 && Math.abs(hi.x - qx) < Math.abs(lo.x - qx) - 8)) v += 600;
      } else {
        // two columns: both set off about together; they must keep apart and never cross each other's way at the same time
        const A = G[a][sa], B = G[b][sb], need = (A.D + B.D) / 2 + OCEAN.BUBBLE_GAP;
        const worst = glideSep(A, B, 0, need);
        v = worst < 0 ? 400 - 30 * worst : 0;
        const AP = A.P, BP = B.P, near = Math.max(1, Math.round((0.5 / Math.max(A.T, B.T)) * MG_N));
        let far = false;
        for (let p = 0; p < MG_N && v < Infinity; p++) for (let q = 0; q < MG_N; q++) {
          const ax = AP[2 * p], ay = AP[2 * p + 1], bx = AP[2 * p + 2], by = AP[2 * p + 3], px = BP[2 * q], py = BP[2 * q + 1], qx = BP[2 * q + 2], qy = BP[2 * q + 3];
          if (cr(ax, ay, bx, by, px, py) * cr(ax, ay, bx, by, qx, qy) < 0 && cr(px, py, qx, qy, ax, ay) * cr(px, py, qx, qy, bx, by) < 0) { if (Math.abs(p - q) <= near) { v = Infinity; break; } far = true; }
        }
        if (far && v < Infinity) v += 100;
        // (and the order across the screen kept: of two cards clearly side by side, the one on the left never takes the
        // slot clearly to the right of the other's — their ways would cross, and one would pass the thought on its way)
        const dc = cards[a].x - cards[b].x, ds = slots[sa].x - slots[sb].x;
        if (dc * ds < 0 && Math.abs(dc) > 24 && Math.abs(ds) > 24) v += 3000;
      }
      memo.set(key, v);
      return v;
    };
    const order = cards.map((_, k) => k).sort((a, b) => cards[a].x - cards[b].x);
    const SKIP = 6000;                                  // (a photo that cannot land now is a last resort)
    const cur = new Array(n).fill(-1), best = new Array(n).fill(-1), used = new Uint8Array(m);
    let bestCost = Infinity, nodes = 0;
    const go = (d, acc) => {
      if (acc >= bestCost || ++nodes > 60000) return;
      if (d === n) { bestCost = acc; for (let k = 0; k < n; k++) best[k] = cur[k]; return; }
      const c = order[d];
      const js = SLOT_ORDER.slice(0, m).sort((x, y) => single[c][x] - single[c][y]);
      for (const j of js) {
        if (used[j]) continue;
        let v = acc + single[c][j];
        if (v >= bestCost) continue;
        for (let e = 0; e < d && v < bestCost; e++) { const o = order[e]; if (cur[o] >= 0) v += pair(c, j, o, cur[o]); }
        if (v >= bestCost) continue;
        used[j] = 1; cur[c] = j; go(d + 1, v); used[j] = 0; cur[c] = -1;
      }
      go(d + 1, acc + SKIP);
    };
    go(0, 0);
    return {
      match: best, glides: best.map((j, c) => (j >= 0 ? G[c][j] : null)),
      sameCol: (a, b) => best[a] >= 0 && best[b] >= 0 && find(best[a]) === find(best[b]),
      follow: (a, b) => (best[a] >= 0 && best[b] >= 0 ? followTime(a, best[a], b, best[b]).d : null),
    };
  }
  const SLOT_ORDER = Array.from({ length: 16 }, (_, k) => k);
  /**
   * The screen was re-planned mid-melt (the incoming host Mallow took the stage, a turned phone): every bubble still
   * waiting where its card hung takes a fresh way to its slot round the words' and the thought's new places, and the
   * queue is re-timed for it (those already on their way carry on; where they rest is unchanged).
   */
  function rerouteMelt() {
    for (const b of bubbles) {
      if (!b.from || b.still || b.away || b.go || !b.route) continue;
      const g = glideModel(route(b.from, b.target, b.target.D / 2), b.target.D);
      b.route = g.route; b.T = g.T; b.P = g.P;
    }
    const model = (o) => ({ route: o.route, T: o.T, P: o.P, D: o.target.D });
    for (const b of bubbles) {
      if (!b.leads || b.go) continue;
      b.leads = b.leads.map(([L, u]) => { if (!L.route) return [L, u]; const f = followDelay(model(L), model(b)); return [L, f.d == null ? 1 : Math.min(1, f.d / L.T)]; });
    }
  }
  function initBubbles(fromCards = null, th = null) {
    bubbles.length = 0; waiting = [];
    const n = Math.min(7, photos?.n || 0);
    if (!n) return;
    const slots = bubbleSlots(n);
    // postcards from the storm keep their identity (postcard i → bubble i) and start where they hang
    const cards = (fromCards || []).filter((c) => c.i < n && Number.isFinite(c.x) && Number.isFinite(c.y));
    const mc = cards.length ? matchCards(cards, slots, th) : null;
    const match = mc ? mc.match : [];
    const used = new Set(match.filter((k) => k >= 0));
    const byCard = [];
    cards.forEach((card, c) => {
      const k = match[c], from = { x: card.x, y: card.y, size: Math.max(card.w, card.h), rot: card.rot || 0 };
      if (k < 0) {
        // no room on the water now: it still turns into its bubble where it hangs, then fades there (and takes its turn
        // later, far out on the water)
        const D = clamp(from.size * 0.8, OCEAN.BUBBLE_FAR, 60);
        bubbles.push(newBubble({ i: card.i, D, sx: card.x, sy: card.y, gx: card.x, gy: card.y, alpha: 1, state: 'card', riseK: 1, morph: 0, from, target: { x: card.x, y: card.y, D }, away: true }));
        byCard.push(null);
        return;
      }
      const sl = slots[k], gl = mc.glides[c];
      unproject(cam, sl.x, sl.y + 0.3 * sl.D, wo);
      const b = newBubble({ i: card.i, x: wo.x, z: wo.z, D: sl.D, cap: sl.D + 0.5, sx: card.x, sy: card.y, gx: card.x, gy: card.y, alpha: 1, state: 'card', morph: 0, from, route: gl.route, T: gl.T, P: gl.P, target: { x: sl.x, y: sl.y, D: sl.D } });
      bubbles.push(b); byCard.push(b);
    });
    // in a column, each one sets off once every one below it is far enough on its way (the planned queue)
    cards.forEach((_, c) => {
      const b = byCard[c];
      if (!b) return;
      b.leads = [];
      cards.forEach((__, a) => {
        const L = byCard[a];
        if (!L || a === c || !mc.sameCol(a, c) || L.target.y < b.target.y) return;
        const d = mc.follow(a, c);
        b.leads.push([L, d == null ? 1 : Math.min(1, d / L.T)]);
      });
    });
    // the other photos: on a cold start they rise at their places; in a melt, a photo the storm was not showing appears in
    // its place on the water once every glide has passed it (one after another), held there (the horizon is still
    // rising) and set on the water when the melt has settled
    const free = slots.map((_, k) => k).filter((k) => !used.has(k));
    // (which glides pass slot k, and how far along each one has gone by then: it may appear once they all have)
    const passing = (k) => {
      const q = slots[k], out = [];
      for (const b of byCard) {
        if (!b) continue;
        const need = (q.D + b.target.D) / 2 + OCEAN.BUBBLE_GAP;
        let g = -1;
        for (let s = 0; s <= MG_N; s++) if (Math.hypot(b.P[2 * s] - q.x, b.P[2 * s + 1] - q.y) < need) g = (s + 1) / MG_N;
        if (g >= 0) out.push([b, Math.min(1, g)]);
      }
      return out;
    };
    const pass = new Map(free.map((k) => [k, fromCards ? passing(k) : []]));
    free.sort((a, b) => pass.get(a).length - pass.get(b).length || a - b);
    let late = 0;
    for (let i = 0; i < n; i++) {
      if (cards.some((c) => c.i === i)) continue;
      const k = free.shift();
      if (k == null) { waiting.push(i); continue; }
      const sl = slots[k];
      unproject(cam, sl.x, sl.y + 0.3 * sl.D, wo);
      if (!fromCards) bubbles.push(newBubble({ i, x: wo.x, z: wo.z, D: sl.D, cap: sl.D + 0.5, sx: sl.x, sy: sl.y, alpha: 0, state: 'rise', target: { x: sl.x, y: sl.y, D: sl.D } }));
      else bubbles.push(newBubble({ i, x: wo.x, z: wo.z, D: sl.D, cap: sl.D + 0.5, sx: sl.x, sy: sl.y, gx: sl.x, gy: sl.y, alpha: 0, fade: -0.5 * late++, fadeWait: pass.get(k), still: true, state: 'glide', morph: 1, from: { x: sl.x, y: sl.y, size: sl.D, rot: 0 }, target: { x: sl.x, y: sl.y, D: sl.D } }));
    }
  }
  /**
   * The screen changed (a relayout or a turn of the phone): every floating bubble the new layout
   * puts on the hero, the band or the words — or all of them, before the person has touched the
   * water or after a resize — takes the nearest free slot. With `slide` the move is a short glide.
   */
  function reslot(all, slide = true) {
    if (!bubbles.length || !plan || melt) return;
    const slots = bubbleSlots(Math.min(7, photos?.n || 0));
    const free = slots.map(() => true);
    const M = plan.rects.mallow, B = plan.rects.band, P = plan.rects.plate;
    const moveAll = all || !everTouched;
    // slots already taken by bubbles that stay
    const stay = [];
    for (const b of bubbles) {
      if (b.from || (b.state !== 'float' && b.state !== 'rise' && b.state !== 'arrive')) continue;
      const box = { x0: b.sx - b.D / 2, y0: b.sy - b.D / 2, x1: b.sx + b.D / 2, y1: b.sy + b.D / 2 };
      const bad = moveAll || boxesHit(box, M, 4) || (B && boxesHit(box, B)) || (P && boxesHit(box, P, 2));
      if (!bad) { stay.push(b); for (let k = 0; k < slots.length; k++) if (free[k] && Math.hypot(slots[k].x - b.sx, slots[k].y - b.sy) < (slots[k].D + b.D) / 2) free[k] = false; continue; }
      b._move = true;
    }
    for (const b of bubbles) {
      if (!b._move) continue;
      b._move = false;
      let best = -1, bd = Infinity;
      for (let k = 0; k < slots.length; k++) { if (!free[k]) continue; const d = Math.hypot(slots[k].x - b.sx, slots[k].y - b.sy) + (slots[k].far ? 80 : 0); if (d < bd) { bd = d; best = k; } }
      if (best < 0) { if (moveAll) { b.state = 'leave'; b.leaveK = 0; } continue; }     // no room: it drifts over the horizon and takes its turn later
      free[best] = false;
      const sl = slots[best], ox = b.sx, oy = b.sy;
      unproject(cam, sl.x, sl.y + 0.3 * sl.D, wo);
      b.x = wo.x; b.z = wo.z; b.vx = b.vz = 0; b.cap = sl.D + 0.5;
      // (and exactly from there: the first frame at its new place measures the slide from what it shows there — its rise,
      // its size — so the move never starts with a jump; it rides the swell of its new place at once, too: near you a
      // swell's height is magnified, and a bob left to spring over to it there moved the bubble 25 px in a few frames)
      sea.sample(b.x, b.z, sm); b.yb = sm.h * (reduced() ? 0.4 : 1); b.vb = 0;
      if (slide && b.alpha > 0.05) { b.offX = ox - sl.x; b.offY = oy - sl.y; b.slideFrom = { x: ox, y: oy }; }
      b.sx = sl.x; b.sy = sl.y;
    }
  }

  // ------------------------------------------------------------- input --
  function hitThought(x, y) {
    if (!thought || tS.alpha < 0.5) return false;
    try { if (thought.hitTest?.(x, y)) return true; } catch { /* placeholder */ }
    // (a stroke that starts on the thought's words makes its swell: the generous ring round the body never reaches over them)
    if (onWords(thought, x, y)) return false;
    return Math.hypot(x - tS.sx, y - tS.sy) < Math.max(22, tS.r * tS.surf * 1.25);
  }
  function bubbleAt(x, y) {
    for (let k = bubbles.length - 1; k >= 0; k--) { const b = bubbles[k]; if (b.alpha < 0.5) continue; if (Math.hypot(x - b.sx, y - b.sy) < Math.max(22, b.D * 0.55)) return k; }
    return -1;
  }
  /** A visible answer in the very next frame: the wake dips and rings where the finger lands. */
  function touchFeedback(x, y) {
    if (y > hyNow) {
      wake.inject(x, y, -0.55, 2.2);
      const s = Math.max(0.05, (y - cam.hy) / cam.Hw), asp = clamp(s * cam.Hw / cam.Z0, 0.18, 1);
      rings.add(x, y, 4, 26 + 18 * clamp(s), 0.9, asp, C.crest, 0.55, 1.4);
      for (let k = 0; k < (reduced() ? 2 : 6); k++) plankton.spawn(x + (R() - 0.5) * 16, y + (R() - 0.5) * 8 * asp, (R() - 0.5) * 18, (R() - 0.5) * 8, 0.8 + R() * 0.8, 2 + R() * 2.5, (R() * 3) | 0, 0.85);
    } else {
      rings.add(x, y, 3, 18, 0.7, 1, C.crest2, 0.35, 1.2);
      skyCue(x, true);
    }
  }
  /**
   * A finger in the sky shapes nothing (only the water makes swells), but the water says where it is: a small ripple
   * and a few motes on the horizon line, right below the finger.
   */
  function skyCue(x, down = false) {
    if (!wake || !cam) return;
    const y = hyNow + WATER_PAD + 3;
    wake.inject(x, y, down ? -0.5 : -0.3, 2);
    if (down || R() < 0.35) { const n = down ? (reduced() ? 1 : 3) : 1; for (let k = 0; k < n && plankton.n < plankton.max - 2; k++) plankton.spawn(x + (R() - 0.5) * 14, y + R() * 3, (R() - 0.5) * 10, 0, 0.7 + R() * 0.6, 1.4 + R() * 1.6, (R() * 3) | 0, 0.6); }
  }

  function pointer(s) {
    if (paused || !prepared) return;
    if (s.type === 'down') {
      const f = fingers.find((q) => !q.on);
      if (!f) return;
      Object.assign(f, { on: true, id: s.id, x: s.x, y: s.y, px: s.x, py: s.y, x0: s.x, y0: s.y, ix: s.x, iy: s.y, len: 0, moveT: 0, t0: elapsed, lastEv: elapsed, speed: 0, still: 0, slot: -1, sid: 0, hush: 0, hushX: s.x, hushY: s.y, pointerType: s.pointerType || 'touch', skyX: s.x });
      f.onThought = hitThought(s.x, s.y);
      f.bubble = bubbleAt(s.x, s.y);
      everTouched = true; lastTouch = elapsed; hint.age = -1; introAt = -1;
      if (firstTouchAt < 0) firstTouchAt = elapsed;
      touchFeedback(s.x, s.y);
      if (f.onThought) { try { thought?.react?.('squeeze'); thought?.pointer?.(s); } catch { /* optional */ } }
      return;
    }
    const f = fingerFor(s.id);
    if (!f) return;
    if (s.type === 'move') {
      f.lastEv = elapsed; lastTouch = elapsed;
      if (s.idle) { f.speed = s.speed; return; }
      const d = Math.hypot(s.x - f.x, s.y - f.y);
      f.px = f.x; f.py = f.y; f.x = s.x; f.y = s.y; f.speed = s.speed;
      if (f.onThought) { try { thought?.pointer?.(s); } catch { /* optional */ } }
      if (d < 0.01) return;
      if (s.speed > 0.06 * U) f.still = 0;
      // only the water makes swells: a stroke in the sky shapes nothing, and one that crosses the horizon line
      // begins (or lets its swell go) exactly where it crosses it
      const yc = hyNow + WATER_PAD;
      if (f.y < yc) {
        if (f.slot >= 0 && f.py >= yc) {
          const t = (yc - f.py) / (f.y - f.py), sx = f.x, sy = f.y;
          f.x = f.px + (sx - f.px) * t; f.y = yc;
          f.len += d * t;
          releaseStroke(f);
          f.x = sx; f.y = sy;
        } else if (f.slot >= 0) releaseStroke(f);
        f.x0 = f.x; f.y0 = f.y; f.len = 0; f.moveT = 0; f.ix = f.x; f.iy = f.y;
        if (Math.abs(f.x - f.skyX) > CELL * 2.5) { f.skyX = f.x; skyCue(f.x); }
        return;
      }
      if (f.py < yc) {
        // coming down out of the sky: the stroke starts at the horizon line
        const t = (yc - f.py) / (f.y - f.py);
        f.x0 = f.px + (f.x - f.px) * t; f.y0 = yc; f.len = d * (1 - t); f.moveT = 0; f.ix = f.x0; f.iy = f.y0;
      } else f.len += d;
      // the wake follows the finger at once (a dip every ~1.5 cells, deeper when quicker)
      const amt = -0.42 * (0.45 + 0.55 * clamp(s.speed / (1.4 * U)));
      let ex = f.ix, ey = f.iy;
      const seg = Math.hypot(s.x - ex, s.y - ey), stepPx = CELL * 1.5;
      if (s.y > hyNow + 2) {
        for (let k = stepPx; k <= seg; k += stepPx) { const t = k / seg; wake.inject(ex + (s.x - ex) * t, ey + (s.y - ey) * t, amt, 2.3); }
        if (seg >= stepPx) { f.ix = s.x; f.iy = s.y; }
        if (R() < 0.5 && plankton.n < plankton.max - 2) plankton.spawn(s.x + (R() - 0.5) * 10, s.y + (R() - 0.5) * 6, (s.vx || 0) * 0.05 + (R() - 0.5) * 12, (s.vy || 0) * 0.03, 0.9 + R() * 0.9, 1.8 + R() * 2.4, (R() * 3) | 0, 0.75);
      } else { f.ix = s.x; f.iy = s.y; }
      // a sharp turn lets the swell so far go, and a new one begins from here
      if (f.slot >= 0 && f.len > 0.12 * U) {
        const cx = f.x - f.x0, cy = f.y - f.y0, cl = Math.hypot(cx, cy), mx = s.x - f.px, my = s.y - f.py, ml = Math.hypot(mx, my);
        if (cl > 20 && ml > 3 && (cx * mx + cy * my) / (cl * ml) < -0.34) { releaseStroke(f); startStroke(f, f.px, f.py); }
        else if (f.len > 1.6 * U) { releaseStroke(f); startStroke(f, f.x, f.y); }
      }
      if (f.slot < 0 && f.len > 6) startStroke(f, f.x0, f.y0);
      return;
    }
    if (s.type === 'up' || s.type === 'cancel') {
      const dur = elapsed - f.t0;
      if (f.slot >= 0) releaseStroke(f);
      else if (s.type === 'up' && f.len < TAP_PX && dur < TAP_SEC) tap(f, s.x, s.y);
      if (f.onThought) { try { thought?.pointer?.(s); thought?.react?.('release'); } catch { /* optional */ } }
      f.on = false; f.id = -1; f.onThought = false; f.bubble = -1;
    }
  }

  function startStroke(f, x, y) {
    f.x0 = x; f.y0 = y; f.len = Math.hypot(f.x - x, f.y - y); f.moveT = 0; f.t0s = elapsed;
    const P = strokePacket(cam, U, { x0: x, y0: y, x1: f.x + (f.x === x && f.y === y ? 0.5 : 0), y1: f.y + 0.01, len: Math.max(1, f.len), speed: Math.max(f.speed, 1) }, pk);
    if (!P) return;
    P.free = false; P.user = true;
    // (reduced motion: the swell shows 0.4 of its height; it carries the thought out as far as anyone's — Sea.look)
    P.look = reduced() ? 0.4 : 1;
    f.slot = sea.launch(P);
    f.sid = f.slot >= 0 ? sea.id[f.slot] : 0;
  }
  function sculptStroke(f) {
    if (f.slot < 0 || !sea.on[f.slot] || sea.id[f.slot] !== f.sid) { f.slot = -1; return; }
    const speed = f.moveT > 0.02 ? f.len / f.moveT : f.speed;
    const P = strokePacket(cam, U, { x0: f.x0, y0: f.y0, x1: f.x, y1: f.y, len: f.len, speed }, pk);
    if (!P) return;
    // reduced motion softens how it looks, never what it does (the drift that takes the thought out counts towards
    // 'distance' and its A Little More Room: cutting A itself left that out of reach — 1.5 × Z0 after 100 s, not 4.3)
    P.look = reduced() ? 0.4 : 1;
    sea.sculpt(f.slot, P);
    sea.vis[f.slot] = onVisibleWater(f.slot) ? 1 : 0;
  }
  /**
   * Is packet i on the water the person can see: its swell at least VIS_PX tall on screen somewhere no further out
   * than the thought may drift (CAP·Z0)? Only such packets count as the person's swells (progress, 'long-waves', the
   * period and the sea's state): nothing counts that the screen does not show.
   */
  function onVisibleWater(i) {
    if (!cam || i < 0 || !sea.on[i]) return false;
    const A = sea.free[i] ? sea.A0[i] : sea.At[i];
    if (sea.peakPx(i, cam, OCEAN.CAP * cam.Z0, A) >= VIS_PX) return true;
    // (quick chop is seen as broken, glittering water rather than height: steep enough and near enough, it shows)
    return sea.lam[i] < FLICK_U * U * 1.3 && sea.k[i] * sea.At[i] >= 0.1 && sea.peakS >= 0.12;
  }
  /** The finger lifts (or rests, or turns): the swell it sculpted is set free. */
  function releaseStroke(f) {
    const i = f.slot;
    f.slot = -1;
    const len = f.len, speed = f.moveT > 0.02 ? f.len / f.moveT : f.speed, sx0 = f.x0, sy0 = f.y0;
    const ok = i >= 0 && sea.on[i] && sea.id[i] === f.sid;
    // the final shape of the swell: the whole stroke, start to fingertip
    if (ok && len >= 6) { f.slot = i; sculptStroke(f); f.slot = -1; }
    // whatever comes next starts from here
    f.x0 = f.x; f.y0 = f.y; f.len = 0; f.moveT = 0;
    if (!ok) return;
    if (len < 6) { sea.cancel(i); return; }
    sea.release(i);
    const vis = onVisibleWater(i);
    sea.vis[i] = vis ? 1 : 0;
    const w = strokeWave(len, speed, U);
    // (a sliver of a stroke along the far horizon makes its tiny ripple there, and nothing more)
    if (!vis) return;
    // a swell sent towards you also tows whatever floats further out than where the stroke began
    if (sea.dz[i] < -0.35 && len > 0.12 * U) {
      const za = unproject(cam, sx0, sy0, wo).z, zb = unproject(cam, f.x, f.y, wo).z;
      const q = w.s * clamp(len / (0.45 * U)) * (w.lambda >= 0.3 * U ? 1 : 0.35);
      if (q > 0.02) addTow(Math.max(za, zb), (-TOW_Z0 * q * cam.Z0) / TOW_TAU);
    }
    const ev = { t: elapsed, id: sea.id[i], lambdaU: w.lambda / U, s: w.s, lenU: len / U, period: TAU / sea.w[i] };
    longD.stroke(ev);
    prog.stroke(ev);
    f.strokes++;
    // the sea answers in sound: a soft swell for long ones, a drip for chop
    if (ev.lambdaU >= LONG_U) {
      if (elapsed - lastSwish > 0.5) { lastSwish = elapsed; ctx.sound('swish', { intensity: clamp(0.18 + 0.25 * w.s), pitch: 0.7, pan: clamp((f.x / W) * 2 - 1, -1, 1) }); }
      ctx.haptic('soft');
      startHum();
    } else if (ev.lambdaU < FLICK_U && elapsed - lastDrip > 0.12) {
      lastDrip = elapsed; ctx.sound('drip', { intensity: 0.18, pitch: 1 + R() * 0.4, pan: clamp((f.x / W) * 2 - 1, -1, 1) });
      if (!said.chop && !discovered.has('long-waves') && sea.chop(FLICK_U * U) > 0.05) { said.chop = true; say(line('chop')); }
    }
  }
  function tap(f, x, y) {
    const k = f.bubble >= 0 ? f.bubble : bubbleAt(x, y);
    if (k >= 0) {
      const b = bubbles[k];
      b.lift = 1; b.glowAge = 0;
      ctx.sound('bubble', { note: (b.i % 5) + 2, intensity: 0.3 });
      ctx.haptic('light');
      rings.add(b.sx, b.sy + b.D * 0.32, b.D * 0.4, b.D * 1.1, 1.4, clamp(b.D / 120 + 0.25, 0.25, 0.6), C.crest2, 0.5, 1.4);
      return;
    }
    if (f.onThought) return;
    if (y <= hyNow) return;
    // a tap rings out a soft circle of swells (the accessible way to move things: tap behind them)
    unproject(cam, x, y, wo);
    const lam = 0.32 * U;
    sea.ringAt(wo.x, wo.z, lam, 0.028 * lam, true, reduced() ? 0.4 : 1);
    ctx.sound('drip', { intensity: 0.14, pitch: 0.8 });
  }

  function addTow(zFar, v) {
    let k = tows.findIndex((t) => !t.on);
    if (k < 0) { let m = Infinity; tows.forEach((t, j) => { const e = Math.abs(t.v) * Math.exp(-t.age / TOW_TAU); if (e < m) { m = e; k = j; } }); }
    Object.assign(tows[k], { on: true, zFar, v, age: 0 });
  }
  function stepTows(dt) { for (const t of tows) if (t.on) { t.age += dt; if (t.age > 5 * TOW_TAU) t.on = false; } }
  /** The pull home (world z velocity, ≤ 0) at depth z from the person's swells sent towards you from nearer in. */
  function towAt(z) {
    let v = 0;
    for (const t of tows) if (t.on) v += t.v * Math.exp(-t.age / TOW_TAU) * smoothstep(t.zFar - 0.1 * cam.Z0, t.zFar + 0.5 * cam.Z0, z);
    return v;
  }

  function startHum() {
    if (holds.hum) return;
    holds.hum = ctx.hold('hum', { intensity: 0.05, pitch: 0.7 });
  }

  // --------------------------------------------------------------- frame --
  function frame(dt, t) {
    if (paused) dt = 0;
    elapsed += dt;
    frameNo++;
    mallowBox();                                   // (the one layout read of the frame, before anything is written)
    const now = elapsed, rm = reduced();
    if (prepared) relayoutCheck(dt);
    { const th = ctx.thought ?? null; if (th !== thought) api.setThought(th); }
    rowsN = low() ? ROWS_LOW : ROWS;
    // melt in: the horizon rises from the storm's line after the midpoint; things land on the water
    if (melt) meltStep(dt);
    else if (thought && (tS.from || tS.rmCold)) coldArrival(dt);
    // camera inputs ease (a layout change glides, never jumps)
    const e = 1 - Math.exp(-dt / 0.35);
    camHome += (plan.homeY - camHome) * e; camWater += (plan.waterY - camWater) * e;
    if (!melt) hyNow += (hyTarget - hyNow) * e;
    cam.homeY = camHome; cam.waterY = camWater; fitCamera(cam, hyNow);
    // (the camera re-fitted for a new layout — a turned phone, a hero moved by the shell: whatever floats keeps how far
    // out it looks, z/Z0, instead of seeming to rush away or come close as the lens changes under it)
    if (lastZ0 > 0 && Math.abs(cam.Z0 - lastZ0) > 1e-3 * lastZ0 && !melt) {
      const k = cam.Z0 / lastZ0;
      if (thought && !tS.from) tS.z *= k;
      for (const b of bubbles) if (!b.from) b.z *= k;
      for (const t of tows) t.zFar *= k;
    }
    lastZ0 = cam.Z0;
    wakeRows();
    heroFromRect(false);
    if (!melt && hero.floatK < 1) hero.floatK = Math.min(1, hero.floatK + dt / 1.5);

    // fingers: moving time, resting, the hush
    for (const f of fingers) {
      if (!f.on) continue;
      if (elapsed - f.lastEv > 0.25 && f.speed > 0) { f.speed *= Math.exp(-dt / 0.12); if (f.speed < 0.5) f.speed = 0; }
      const stillPx = 0.06 * U;
      if (f.speed > stillPx) { f.moveT += dt; f.still = 0; } else f.still += dt;
      if (f.slot >= 0) {
        if (f.still >= STILL_RELEASE) releaseStroke(f);
        else sculptStroke(f);
      }
      // holding still hushes the water around the fingertip
      const hushT = f.still > 0.25 && f.y > hyNow + 4 ? 1 : 0;
      f.hush = clamp(f.hush + (hushT ? dt / HUSH_SEC : -dt / 0.5));
      if (hushT) { f.hushX = f.x; f.hushY = f.y; }
    }
    for (const f of fingers) if (!f.on && f.hush > 0) f.hush = Math.max(0, f.hush - dt / 1.2);

    // the sea
    sea.damp = settle > 0 ? 3 : 1;
    if (settle > 0) settle = Math.max(0, settle - dt);
    if (dt > 0) { sea.step(dt); stepTows(dt); }
    sea.prepare();
    windK += (windT - windK) * (1 - Math.exp(-dt / 2.5));
    sea.ambientScale((0.65 + 0.7 * windK) * (1 - 0.55 * mirrorK) * (reduced() ? 0.5 : 1));
    if (wake) {
      hushWake();
      if (dt > 0) { wakeAcc += dt; let n = 0; while (wakeAcc >= 1 / 60 && n < 3) { wakeAcc -= 1 / 60; wake.step(); n++; } if (n === 3) wakeAcc = 0; }
    }
    // background ripple (the wind of the feeling): an occasional tiny packet far out, never in the way
    windClock += dt * windK * (rm ? 0.4 : 1);
    if (windClock > 1.6 && !complete) { windClock = 0; ambientRipple(); }

    const period = sea.dominantPeriod(true);       // the person's own swells only (not the storm's seeds or the wind)
    metricsCache.period = period; metricsCache.periodAll = sea.dominantPeriod(); metricsCache.energy = sea.energy(); metricsCache.chop = sea.chop(FLICK_U * U, true);
    metricsCache.userEnergy = sea.energy(true);
    metricsCache.swells = sea.swells(LONG_U * U, 0.3, cam, (OCEAN.CAP + 2) * cam.Z0, 1);

    updateThought(dt, now);
    updateBubbles(dt, now);
    updateHero(dt, now);
    plankton.update(dt, 0, 1.2);
    chopSparks.update(dt, 0, 2);
    if (dt > 0) sparkChop(dt);
    rings.update(dt);

    // discoveries (real contingency only)
    const evL = longD.update(now, aliveFn);
    if (evL) fireDiscovery(evL);
    if (thought && tS.landK >= 1) {
      // (the distance the person's own swells made: the keep-out's nudges, a new layout or a turned phone never count)
      const dist = tS.dP;
      const ev = distD.update(dt, { dist, out: tS.outD, outUser: tS.outU });
      if (ev?.id === 'distance') fireDiscovery(ev);
      else if (ev?.id === 'back' && !said.back) { said.back = true; say(ctx.entry.dialogue?.drift); }
    }
    // progress and the natural completion point
    const down = fingers.some((f) => f.on);
    const pr = prog.update(dt, { dist: thought && tS.landK >= 1 ? tS.dP : null, period, down, swells: metricsCache.swells, played: firstTouchAt >= 0 ? elapsed - firstTouchAt : 0 });
    lastP = pr.p;
    if (pr.complete && !complete && !melt) finishSea();

    // dawn and mirror
    dawnT = complete ? 1 : 0.55 + 0.25 * pr.p;
    dawnK += (dawnT - dawnK) * (1 - Math.exp(-dt / 2.2));
    mirrorK = complete ? Math.min(1, mirrorK + dt / 4) : 0;

    drawBack(now, rm);
    drawFront(now, rm);
    audioAndMallow(dt, now);

    if (introAt > 0) { introAt -= dt; if (introAt <= 0) { introAt = -1; if (!everTouched) say(line('intro')); } }
    if (arriveAt > 0) { arriveAt -= dt; if (arriveAt <= 0) { arriveAt = -1; if (!said.arrive) { said.arrive = true; say(line('arrive')); } } }
    if (!everTouched && !melt && prepared) {
      hint.next -= dt;
      if (hint.next <= 0 && hint.shown < 2 && hint.age < 0) { hint.next = 10; placeHint('away'); if (hint.ok) { hint.age = 0; hint.shown++; } }
    }
    // once the thought is far out and the water has been still a while: a ghost stroke towards you shows it can come back
    if (thought && backHint === 0 && !said.back && !melt && !complete && hint.age < 0 && tS.landK >= 1 && tS.z / cam.Z0 >= OCEAN.FAR && discovered.has('distance') && elapsed - lastTouch > 7) {
      placeHint('back');
      backHint = 1;
      if (hint.ok) hint.age = 0;
    }
    if (hint.age >= 0) { hint.age += dt; if (hint.age > HINT_SEC) hint.age = -1; }
  }
  let wakeAcc = 0, windClock = 0, lastZ0 = 0;
  const aliveFn = (id) => sea.alive(id);

  /** Quick flicks make chop: while each chop packet lives, its envelope glitters (fading as it fades). */
  function sparkChop(dt) {
    const rm = reduced();
    for (let i = 0; i < sea.max; i++) {
      if (!sea.on[i] || !sea.user[i] || sea.lam[i] >= FLICK_U * U * 1.3) continue;
      const A = sea.A[i], k = sea.k[i];
      const steep = A * k;                        // 0.2–0.45 when fresh
      if (steep < 0.02) continue;
      const run = sea.free[i] ? sea.cg[i] * sea.age[i] : 0;
      const ex = sea.ex[i] + sea.dx[i] * run, ez = sea.ez[i] + sea.dz[i] * run;
      project(cam, ex, ez, 0, so);
      if (so.y < hyNow + 2) continue;
      const rx = Math.max(10, sea.sl[i] * so.s * 1.2), asp = clamp(so.s * cam.Hw / cam.Z0, 0.2, 1);
      const rate = (rm ? 30 : 90) * clamp(steep * 3) * clamp(rx / 40, 0.5, 2.5) * (low() ? 0.5 : 1);
      let n = rate * dt + R();
      while (n >= 1 && chopSparks.n < chopSparks.max - 2) {
        n -= 1;
        const a = R() * TAU, r = Math.sqrt(R());
        const x = so.x + Math.cos(a) * rx * r, y = so.y + Math.sin(a) * rx * asp * r;
        if (y < hyNow + 2) continue;
        chopSparks.spawn(x, y, (R() - 0.5) * 8 + sea.dx[i] * 10, (R() - 0.5) * 3, 0.22 + R() * 0.36, (1.6 + 2.6 * R()) * clamp(so.s, 0.4, 1.6), R() < 0.25 ? 1 : 0, clamp(0.45 + steep * 1.4));
      }
    }
  }

  function ambientRipple() {
    // a small, far, slow ripple across the open water (texture; it never moves floaters much)
    const z = cam.Z0 * (2.5 + R() * 5), x = (R() - 0.5) * W / scaleAt(cam, z);
    const lam = (0.14 + 0.1 * R()) * U, a = R() * TAU;
    sea.launch({ x, z, dx: Math.cos(a), dz: Math.sin(a) * 0.4 + 0.6, lambda: lam, A: 0.02 * lam * windK, len: lam * 2.2, user: false });
  }

  function hushWake() {
    const hsh = wake.hush;
    let any = false;
    for (const f of fingers) if (f.hush > 0.01) { any = true; break; }
    if (!any && !hushDirty) return;
    hsh.fill(0);
    hushDirty = any;
    for (const f of fingers) {
      if (f.hush <= 0.01) continue;
      const rpx = (0.08 + 0.14 * easeOut(f.hush)) * U;
      const ci = f.hushX / CELL, cj = (f.hushY - wake.y0) / CELL, rc = rpx / CELL;
      const s = Math.max(0.05, (f.hushY - cam.hy) / cam.Hw), asp = clamp(s * cam.Hw / cam.Z0, 0.2, 1);
      const i0 = Math.max(0, Math.floor(ci - rc)), i1 = Math.min(wake.cols - 1, Math.ceil(ci + rc));
      const j0 = Math.max(0, Math.floor(cj - rc * asp)), j1 = Math.min(wake.rows - 1, Math.ceil(cj + rc * asp));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d = Math.hypot((i - ci) / rc, (j - cj) / (rc * asp));
        if (d < 1) { const q = j * wake.cols + i; hsh[q] = Math.max(hsh[q], f.hush * smoothstep(1, 0.5, d)); }
      }
    }
  }
  let hushDirty = false;
  const hushD = [{ on: false, x: 0, z: 0, r: 1, k: 0 }, { on: false, x: 0, z: 0, r: 1, k: 0 }];
  /** Each finger's hush as a world disc (once a frame). */
  function hushDiscs() {
    let any = false;
    fingers.forEach((f, k) => {
      const d = hushD[k];
      d.on = f.hush > 0.01;
      if (!d.on) return;
      unproject(cam, f.hushX, f.hushY, wo);
      d.x = wo.x; d.z = wo.z; d.k = f.hush;
      d.r = ((0.08 + 0.14 * easeOut(f.hush)) * U) / wo.s;
      any = true;
    });
    return any;
  }
  /** How hushed the sea is at a world point (0..1, the strongest finger). */
  function hushAt(x, z) {
    let m = 0;
    for (const d of hushD) {
      if (!d.on) continue;
      // (in z, a world circle: the disc on screen is the foreshortened ellipse the ring draws)
      const q = Math.hypot(x - d.x, z - d.z) / d.r;
      if (q < 1) m = Math.max(m, d.k * smoothstep(1, 0.55, q));
    }
    return m;
  }

  // ----------------------------------------------------------- the melt --
  /**
   * Melting in from another world: k is the director's eased melt progress (0..1). Each postcard
   * turns into its bubble exactly as the melt reaches it (ctx.meltMask), and only then glides down to
   * the water; the thought glides once the melt has passed it, its words moving above it as it goes.
   * Things settle onto the water once the horizon has finished rising.
   */
  function meltStep(dt) {
    const k = melt.k;
    const rm = reduced();
    // (review r4) how long the director's melt has left: its k is a sine ease of a steady clock — read that clock back,
    // and its pace, so that everything in the sky is down on the water as the melt ends (nothing left gliding up there)
    const lin = Math.acos(clamp(1 - 2 * k, -1, 1)) / Math.PI;
    if (melt.lin != null && dt > 0 && lin > melt.lin) { const r = (lin - melt.lin) / dt; melt.rate = melt.rate ? melt.rate + (r - melt.rate) * 0.25 : r; }
    melt.lin = lin;
    const left = melt.rate > 0 ? (1 - lin) / melt.rate : Infinity;
    melt.left = left;
    // (the thought, behind its time, goes up to twice its own pace to be home by then)
    const pace = (g, T) => Math.max(1 / T, Math.min(2 / T, (1 - g) / Math.max(0.2, left - 0.2)));
    // (and the planned queue of glides runs on a clock up to 1.25× quicker — every glide alike, so the way they keep clear
    // of each other is the plan's — when it would not be down on the water by then: never slower again once quickened)
    if (!rm && k >= 0.45 && left < Infinity) { trimQueue(left); melt.f = Math.max(melt.f || 1, meltScale(left)); }
    const qf = melt.f || 1;
    if (rm) { hyNow = hyTarget; }
    else {
      if (k >= 0.5 && melt.riseAt < 0) { melt.riseAt = elapsed; melt.riseSec = clamp(left - 0.1, 1.5, RISE_SEC); }
      const rk = melt.riseAt >= 0 ? easeInOut((elapsed - melt.riseAt) / melt.riseSec) : 0;
      hyNow = lerp(melt.hy0, hyTarget, rk);
    }
    const riseDone = rm || (melt.riseAt >= 0 && elapsed - melt.riseAt >= melt.riseSec);
    // (the director's melt is over at k = 1: from then on this one ends within MELT_LATE s, whatever is left)
    if (k >= 1 && melt.endAt == null) melt.endAt = elapsed;
    const late = melt.endAt != null ? elapsed - melt.endAt : -1;
    const mask = (x, y) => { try { return ctx.meltMask ? ctx.meltMask(x, y) : k; } catch { return k; } };
    // each postcard turns into its bubble exactly as the melt reaches it
    for (const b of bubbles) {
      if (!b.from || b.still) continue;
      const m = rm ? k : mask(b.from.x, b.from.y);
      b.morph = Math.max(b.morph, rm ? k : smoothstep(0.3, 0.95, m));
      b.state = b.morph < 1 ? 'card' : 'glide';
      // (one with no place on the water fades where it hangs, once it is a bubble: it takes its turn later, far out)
      if (b.away && b.morph >= 1 && k >= 0.5) { b.target = { x: b.gx, y: b.gy, D: b.D }; b.from = null; b.state = 'leave'; b.leaveK = 0; }
    }
    // each sets off once it is a bubble and the melt is halfway — and, in a column beside the hero, once every one below it
    // is far enough on its way (the planned queue: it never has to pass or wait behind one)
    for (const b of bubbles) {
      if (!b.from || b.still || b.go || b.away || b.morph < 1 || k < 0.45) continue;
      if (!b.leads || b.leads.every(([L, u]) => !L.from || L.away || (L.go && L.glide >= u))) b.go = true;
    }
    for (const b of bubbles) {
      if (!b.from) continue;
      if (b.still) b.glide = 1;
      else if (b.go) {
        // (and it never closes on one ahead of it in its column: held up on its way, that one sets its pace)
        const g1 = Math.min(1, b.glide + (dt * qf) / (b.T || GLIDE_SEC));
        // (nor on the thought gliding home across its way: it lets it pass)
        let hold = false;
        if (b.route) {
          routeAt(b.route, glideEase(g1), mpt);
          // (as near as it may pass: squeezed to its smallest, 5 px clear — the squeeze below makes it that small as it goes by;
          // and only while the thought is still on its way: once it is home its place is planned round, and a bubble whose
          // card hung beside that place never waits there for it to move)
          if (thought && tS.alpha * tS.vis > 0.2 && tS.from && tS.glide < 1) { const g0 = Math.hypot(b.gx - tS.sx, b.gy - tS.sy), gN = Math.hypot(mpt.x - tS.sx, mpt.y - tS.sy); if (gN < tS.r * tS.surf + 0.31 * b.target.D + 5 && gN < g0) hold = true; }
          // (one ahead that has come to rest floats on the water now: the two keep apart there as everything afloat does)
          if (b.leads) for (const [L] of b.leads) { if (L.from && L.alpha > 0.2 && Math.hypot(mpt.x - L.gx, mpt.y - L.gy) < (L.D + b.D) / 2 + OCEAN.BUBBLE_GAP) { hold = true; break; } }
        }
        if (!hold) b.glide = g1;
      }
      if (b.glide >= 1 && riseDone) b.wait += dt;
      // it settles on the water once it has arrived (or, held off its place a little by something floating there, after a
      // moment where it is) — and never in the sky: a bubble only ever settles with its waterline below the horizon
      const onWater = b.gy + 0.3 * b.D > hyNow + 3;
      // (review B1 r2) "arrived" is where it may come to rest: its place, or — a host wider than planned, its float or a
      // hop over it — the point just clear of the hero it was re-aimed at (steer); it settles there, never pulled back
      // — and once the director's melt is over, a bubble whose glide has run its course comes to rest wherever it is clear
      // of the hero (a hop then moves its aim about: it never chases it there); the water and the keep-apart go on from
      // there, eased
      const ax = b.ax ?? b.target.x, ay = b.ay ?? b.target.y;
      const near = Math.hypot(b.gx - ax, b.gy - ay) < 4 || (k >= 1 && !(K.on && discHits(b.gx, b.gy, b.D / 2 + 1, K)));
      if (b.glide >= 1 && riseDone && onWater && (near || b.wait > 0.6)) settleBubble(b);
      else if (late >= MELT_LATE - 0.5) settleBubble(b, true);      // (the deadline: it comes to rest where it is)
    }
    // the thought sets off once the melt has passed it, and glides home on its own clock
    const thReady = !thought || !tS.from || rm || Math.min(mask(tS.from.x, tS.from.y), mask(tS.from.x, tS.from.y + (tS.r + 30))) >= 0.95;
    const thGo = thReady && k >= 0.45;
    if (thought && tS.from) {
      if (thGo) {
        // its words move above it as it goes; where it glides to is fixed now (a relayout never moves it mid-glide)
        if (tS.glide <= 0) { tS.labelFade = 0; tS.from.tx = plan.home.x; tS.from.ty = plan.home.y; }
        tS.glide = Math.min(1, tS.glide + dt * pace(tS.glide, GLIDE_SEC));
      }
      if ((tS.glide >= 1 && riseDone) || late >= MELT_LATE) land();
    }
    // reduced motion: the two worlds' front layers cross-fade with an overlap (compositor), so the storm's thought where it
    // hung and the ocean's at home are each half there at the midpoint — the person's words never leave the screen.
    // (A thought the layer draws — one handle, one place — stays where it hung until the midpoint, then is at home.)
    // (a thought the layer draws — one handle, one place — fades out where it hung, is moved home at the midpoint
    // while unseen, and fades in there: never a jump in plain sight)
    // (however far a slow frame carries k: it is drawn unseen where it hung for at least one frame, moved home on the
    // next frame past the midpoint — drawn unseen there too — and only then fades in: never seen in the frame it moves,
    // nor its words, nor fading on the frame before)
    if (rm) {
      if (melt.rmFrom && thought && !thought.draw) {
        if (!melt.rmMoved) {
          tS.vis = k < 0.5 ? 1 - smoothstep(0.32, 0.5, k) : 0;
          if (k >= 0.5 && melt.rmDark) { melt.rmMoved = true; melt.rmIn = k; }
          melt.rmDark = tS.vis <= 0;
        }
        if (melt.rmMoved) tS.vis = k <= melt.rmIn ? 0 : smoothstep(melt.rmIn, melt.rmIn + 0.18, k);
      } else tS.vis = 1;
    }
    hero.floatK = rm ? k : smoothstep(0.15, 0.9, k);
    const done = k >= 1 && (riseDone || late >= MELT_LATE) && (!thought || !tS.from) && bubbles.every((b) => !b.from);
    if (done) { melt = null; hyNow = hyTarget; hero.floatK = 1; arriveAt = 1.6; tS.vis = 1; }
  }
  const mpt = { x: 0, y: 0 };
  /**
   * How much quicker the planned queue must run to be down on the water in `left` s: its glides, each setting off as the
   * plan says (once those ahead of it in its column are far enough on their way), on their own clocks from now.
   */
  function meltScale(left) {
    return clamp(queueEnd().end / Math.max(0.5, left - 0.5), 1, 1.25);
  }
  /** When the planned queue would be down (s from now, on its own clocks), and which glide not yet under way ends last. */
  const qStart = new Map();
  function queueEnd() {
    qStart.clear();
    const start = (b) => {
      if (qStart.has(b)) return qStart.get(b);
      qStart.set(b, 0);                                     // (a guard: the plan has no cycles)
      let t = b.go ? -b.glide * (b.T || GLIDE_SEC) : 0;
      if (!b.go && b.leads) for (const [L, u] of b.leads) if (L.from && !L.still && !L.away) t = Math.max(t, start(L) + u * (L.T || GLIDE_SEC));
      qStart.set(b, t);
      return t;
    };
    let end = 0, last = null, lastEnd = -Infinity;
    for (const b of bubbles) {
      if (!b.from || b.still || b.away) continue;
      const e = start(b) + (b.T || GLIDE_SEC);
      end = Math.max(end, e);
      if (!b.go && e > lastEnd) { lastEnd = e; last = b; }
    }
    return { end, last, lastEnd };
  }
  /**
   * (review B1 r2) A queue that could not be down on the water by the end of the director's melt even at its quickest
   * (a wider host leaves a column of five beside it, say): the glides that would set off last do not set off — each fades
   * where it hangs once it is a bubble, and takes its turn later from the horizon — so nothing is ever left gliding in the
   * sky after the melt, and the ocean's own melt ends with the director's.
   */
  function trimQueue(left) {
    // (the quickened queue aims to be down half a second before the end; it is trimmed only when even at its quickest it
    // would still be gliding TRIM_SEC after it)
    for (let n = 0; n < 7; n++) {
      const q = queueEnd();
      if (!q.last || q.end / 1.25 <= left + TRIM_SEC || q.lastEnd < q.end - 1e-6) return;
      q.last.away = true;
    }
  }
  const TRIM_SEC = 0.2;
  const MELT_LATE = 2.5;                                    // s: the ocean's own melt ends at most this long after the director's
  /**
   * A bubble that glided down from its postcard settles on the water exactly where it is (physics from here: no pop) —
   * on the water, never above the horizon (the deadline can settle one still on its way: its waterline goes on the water).
   */
  function settleBubble(b, deadline = false) {
    const t = b.target;
    // (at the deadline, one still up in the sky — it never set off — fades where it hangs and takes its turn later: it is
    // never dropped onto the water)
    if (deadline && (!b.go || b.gy + 0.3 * b.D < hyNow - 4)) b.away = true;
    if (b.away) { b.from = null; b.state = 'leave'; b.leaveK = 0; b.target = { x: b.gx, y: b.gy, D: b.D }; return; }
    const gy = Math.max(b.gy, hyNow + 3 - 0.3 * b.D);
    unproject(cam, b.gx, gy + 0.3 * b.D, wo);
    b.x = wo.x; b.z = wo.z; b.vx = b.vz = 0; b.vb = 0;
    // (riding the swell where it lands at once — review B1 r2: a bob sprung up from flat moved one near you 10 px or more)
    sea.sample(b.x, b.z, sm); b.yb = sm.h * (reduced() ? 0.4 : 1);
    // (any step onto the water is eased away by the re-slot offset: the bubble is shown exactly where it was — measured on
    // its first frame afloat, its bob and size included, so it never steps back the way it came as it lands)
    b.offY += b.gy - gy;
    b.slideFrom = { x: b.gx, y: b.gy };
    b.from = null; b.route = null; b.state = 'float'; if (!(b.fade != null && b.fade < 1)) b.alpha = 1;
    splash(b.gx, gy + b.D * 0.32, t.D);
  }
  /**
   * A cold start with the person's thought already on screen (beside their Mallow at home): it is the same thought,
   * arriving. It glides from where it was down onto its home on the water (the melt's glide, on its own clock), its
   * size easing from what was drawn; with reduced motion it fades out where it was, then in at home (never both at
   * once, never a jump in plain sight).
   */
  function coldArrival(dt) {
    if (tS.rmCold) {
      const c = tS.rmCold;
      if (c.t < RM_FADE_SEC) { c.t = Math.min(RM_FADE_SEC, c.t + dt); tS.vis = 1 - smoothstep(0, RM_FADE_SEC, c.t); return; }
      // out of sight, it comes in at its home only once the hero has come to rest and the sea has re-planned (2.5 s at
      // most): never seen where the hero's arrival puts it for a moment, nor sliding from there
      c.wait = (c.wait || 0) + dt;
      if (!c.inT && (pendingRect || boxMoved(restBox(), layoutRest, RELAYOUT_TOL) || c.wait < 0.35) && c.wait < 2.5) { tS.vis = 0; return; }
      c.inT = (c.inT || 0) + dt;
      tS.vis = smoothstep(0, RM_FADE_SEC, c.inT);
      if (c.inT >= RM_FADE_SEC) { tS.rmCold = null; tS.vis = 1; }
      return;
    }
    if (tS.glide <= 0) {
      // it sets off once the hero has come to rest where the shell puts it for the world (a cold start begins while the
      // shell is still moving it there, and the sea re-plans after that), so the glide goes once, straight to its home;
      // meanwhile it stays where it is drawn (2.5 s at most)
      tS.from.wait = (tS.from.wait || 0) + dt;
      const settling = !!pendingRect || boxMoved(restBox(), layoutRest, RELAYOUT_TOL) || tS.from.wait < 0.35;
      if (settling && tS.from.wait < 2.5) return;
      tS.labelFade = 0; tS.from.tx = plan.home.x; tS.from.ty = plan.home.y;
    }
    tS.glide = Math.min(1, tS.glide + dt / COLD_GLIDE_SEC);
    // (it lands at its home: if that moved on its way, once the glide has caught it up — 1.5 s at most)
    if (tS.glide >= 1) {
      tS.from.late = (tS.from.late || 0) + dt;
      if (Math.abs(tS.from.tx - plan.home.x) + Math.abs(tS.from.ty - plan.home.y) < 1.5 || tS.from.late > 1.5) land();
    }
  }
  /**
   * The person's thought, already on screen (beside their Mallow at home, or just made there), comes onto the water
   * from where it is drawn: it glides (or, resumed, eases to where it was left), and with reduced motion it fades out
   * there and in at home — rather than appearing at home in one frame.
   */
  function arrive(keep = false) {
    tS.rmCold = null;
    const at = drawnAt(thought);
    if (!at) return;
    tS.shownOp = 1;                          // (it is on screen there now)
    if (reduced()) { tS.rmCold = { x: at.x, y: at.y, scale: at.scale, t: 0 }; tS.alpha = 1; tS.vis = 1; tS.sx = at.x; tS.sy = at.y; }
    else if (keep) { tS.sx = at.x; tS.sy = at.y; tS.snapOff = true; tS.alpha = 1; tS.surfShown = at.scale; }
    else {
      tS.from = { x: at.x, y: at.y, scale: at.scale, labelW: at.labelW };
      tS.landK = 0; tS.glide = 0; tS.alpha = 1; tS.landed = false; tS.sx = at.x; tS.sy = at.y; tS.surf = at.scale;
    }
  }
  /** Where a thought handle is drawn now, as the ocean writes it (its depth lift and shrink taken out); null if nowhere. */
  function drawnAt(th) {
    if (!th || !Number.isFinite(th.x) || !Number.isFinite(th.y) || !(th.x || th.y)) return null;
    const z = Number.isFinite(th.z) ? clamp(th.z) : 0, r = th.r > 0 ? th.r : tS.r;
    return { x: th.x, y: th.y - (th.r > 0 ? 0.45 * th.r * z : 0), scale: (r * (th.scale ?? 1) * (1 - 0.5 * z)) / tS.r, labelW: th.labelW || plan.textMax };
  }

  function land() {
    tS.landed = true; tS.from = null; tS.landK = 1;
    tS.surfShown = tS.surf;                  // (its size eases from the glide's to the water's perspective: no pop)
    // from where it has come down to (its home), the swells take over — exactly where it is, no pop
    unproject(cam, tS.sx, tS.sy + tS.r * tS.surf * 0.55, wo);
    tS.x = wo.x; tS.z = Math.max(cam.Z0, wo.z); tS.vx = tS.vz = 0; tS.yb = tS.vb = 0; tS.dP = 1; tS.vzP = 0;
    // (that place already has the hero keep-out's push in it — where it was shown, beside the hero — so the push is
    // spent: kept on as well, it would be added twice and throw the thought sideways by it in the landing frame)
    tS.koX = tS.koY = 0;
    tS.snapOff = true;
    splash(tS.sx, tS.sy + tS.r * tS.surf * 0.55, tS.r * 2 * tS.surf);
    // a soft settle as it meets the water (never 'appear': it is the same thought, arriving)
    try { thought?.react?.('sigh'); } catch { /* optional */ }
    ctx.sound('drip', { intensity: 0.2, pitch: 0.7 });
  }
  function splash(x, y, D) {
    const s = Math.max(0.05, (y - cam.hy) / cam.Hw), asp = clamp(s * cam.Hw / cam.Z0, 0.18, 0.8);
    rings.add(x, y, D * 0.3, D * 1.1, 1.6, asp, C.crest, 0.45, 1.4);
    if (wake && y > hyNow) wake.inject(x, y, -0.4, 2.4);
  }

  // ------------------------------------------------------------ thought --
  /** The thought's own tension, from the storm's handoff or its feeling and intensity: captured once, then constant. */
  function captureBase(t) {
    relief = 0;
    if (Number.isFinite(t)) { baseTension = clamp(t, 0.2, 0.9); return; }
    const em = String(ctx.emotion || thought?.emotion || '');
    const k = clamp(ctx.intensity ?? intensity);
    const lean = /angr|anxi|overwhelm|frustrat|restless|fear/.test(em) ? 0.08 : /sad|lonel/.test(em) ? -0.04 : 0;
    baseTension = clamp(0.3 + 0.5 * k + lean, 0.2, 0.9);
  }
  function updateThought(dt, now) {
    if (!thought) return;
    const rm = reduced();
    if (baseTension == null) { captureBase(); tS.tension = baseTension; }
    // drift on the person's swells (Stokes drift), with a little inertia; swells sent towards you from
    // nearer in tow it home (so bringing it back works wherever the stroke starts)
    // (reduced motion softens how the sea and what floats on it look — bob, tilt, heave — never how far the person's
    // swells carry their thought: that journey is the play, 'distance' and its A Little More Room, and it stays theirs)
    sea.sample(tS.x, tS.z, sm);
    const g = driftGain / SEA.STOKES;
    const ux = sm.ux * g, uz = sm.uz * g + towAt(tS.z), uuz = sm.uuz * g;
    const ki = 1 - Math.exp(-dt / 0.45);
    tS.vx += (ux - tS.vx) * ki; tS.vz += (uz - tS.vz) * ki;
    // (the person's own part of it: their swells' drift and their tows)
    tS.vzP += (uuz + towAt(tS.z) - tS.vzP) * ki;
    const z0 = tS.z;
    if (tS.landK >= 1 && dt > 0) {
      tS.x += tS.vx * dt; tS.z += tS.vz * dt;
      // never closer than home (it would cover the hero), never further than its words fit above it (≤ 9·Z0: still visible)
      const zMin = cam.Z0, zMax = capD * cam.Z0;
      if (tS.z < zMin) { tS.z += (zMin - tS.z) * (1 - Math.exp(-dt / 0.35)); if (tS.vz < 0) tS.vz *= Math.exp(-dt / 0.2); }
      if (tS.z > zMax) { tS.z += (zMax - tS.z) * (1 - Math.exp(-dt / 0.25)); tS.vz = Math.min(0, tS.vz); }
      // sideways: the body and its words stay on screen
      const s = scaleAt(cam, tS.z), half = Math.max(tS.r * 1.2, (tS.plateW || 0) * 0.5) + OCEAN.EDGE;
      const xs = W / 2 + tS.x * s, xc = clamp(xs, Math.min(half, W / 2), Math.max(W - half, W / 2));
      if (xs !== xc) { tS.x += ((xc - W / 2) / s - tS.x) * (1 - Math.exp(-dt / 0.3)); tS.vx *= Math.exp(-dt / 0.3); }
    }
    const dz = tS.z - z0;
    // how far out the person's swells have taken it: grows only with their drift, never beyond where it is
    if (tS.landK >= 1 && dt > 0) tS.dP = clamp(tS.dP + (tS.vzP * dt) / cam.Z0, 1, Math.max(1, tS.z / cam.Z0));
    tS.outD = Math.max(0, dz) / cam.Z0;
    tS.outU = Math.max(0, uuz * dt * (tS.landK >= 1 ? 1 : 0)) / cam.Z0;
    // buoyancy: it rides the swell (y'' = −40(y − h) − 7y')
    const h = sm.h * (rm ? 0.4 : 1);
    tS.vb += (-40 * (tS.yb - h) - 7 * tS.vb) * dt; tS.yb += tS.vb * dt;
    tS.rot = lerp(tS.rot, 0.6 * Math.atan(sm.hx), 1 - Math.exp(-dt / 0.25)) * (rm ? 0.3 : 1);
    // screen: perspective size (stays ≥ 10 px, with its glow), floating on the surface
    const s = scaleAt(cam, tS.z);
    tS.s = s;
    tS.surf = Math.max(10 / tS.r, Math.pow(s / 0.5, 0.85));
    const wy = cam.hy + (cam.Hw - tS.yb * (rm ? 0.3 : 1)) * s;
    let sx = W / 2 + tS.x * s, sy = wy - tS.r * tS.surf * 0.55;
    if (wake && wy > hyNow) sy += wake.at(sx, wy) * 3;
    // landing from the storm: from where it hung, down to its home on the water (a target fixed when the glide began)
    if (tS.from) {
      // (its target is where its home was when the glide began; a relayout meanwhile moves it there gently, never in a jump)
      if (tS.from.tx != null) { const e = 1 - Math.exp(-dt / 0.5); tS.from.tx += (plan.home.x - tS.from.tx) * e; tS.from.ty += (plan.home.y - tS.from.ty) * e; }
      const k = easeInOut(tS.glide);
      sx = lerp(tS.from.x, tS.from.tx ?? plan.home.x, k); sy = lerp(tS.from.y, tS.from.ty ?? plan.home.y, k);
      tS.surf = lerp(tS.from.scale ?? 1, 1, k);
    } else if (melt?.rmFrom && !melt.rmMoved && !thought.draw) { sx = melt.rmFrom.x; sy = melt.rmFrom.y; tS.surf = melt.rmFrom.scale; }
    else if (tS.rmCold && tS.rmCold.t < RM_FADE_SEC) { sx = tS.rmCold.x; sy = tS.rmCold.y; tS.surf = tS.rmCold.scale; }
    // a re-home (landing, a new layout) glides from where it was last shown — its size too
    if (tS.surfShown > 0 && !tS.from) {
      tS.surfShown += (tS.surf - tS.surfShown) * (1 - Math.exp(-dt / 0.4));
      if (Math.abs(tS.surfShown - tS.surf) < 0.004) tS.surfShown = 0;
      else { const k = tS.surfShown / tS.surf; sy += tS.r * tS.surf * 0.55 * (1 - k); tS.surf = tS.surfShown; }
    }
    // (from where it was shown: the keep-out's push, added after this, is part of that already)
    if (tS.snapOff) { tS.offX = tS.sx - sx - tS.koX; tS.offY = tS.sy - sy - tS.koY; tS.snapOff = false; }
    if (tS.offX || tS.offY) { const d = Math.exp(-dt / 0.45); tS.offX *= d; tS.offY *= d; if (Math.abs(tS.offX) + Math.abs(tS.offY) < 0.3) tS.offX = tS.offY = 0; }
    const bx = sx, by = sy;
    sx += tS.offX; sy += tS.offY;
    const rr = tS.r * tS.surf;
    // never over the hero: it floats beyond it
    keepThoughtOut(dt, bx, by, sx, sy, rr, tS.landK >= 1 && !tS.from);
    sx += tS.koX; sy += tS.koY;
    // (while it arrives — a cold start's wait and glide, a reduced-motion fade — it never jumps in plain sight: when the
    // hero comes to rest on it, the keep-out slides it off at ARRIVE_STEP px a 60th of a second at most)
    // (seen on the last frame and on this one: a fade's move while it is out of sight is its own)
    const op = tS.alpha * tS.vis;
    if ((tS.from || tS.rmCold) && op > 0.05 && tS.shownOp > 0.05 && (tS.sx || tS.sy)) {
      const m = ARRIVE_STEP * dt * 60, dx = sx - tS.sx, dy = sy - tS.sy, d = Math.hypot(dx, dy);
      if (d > m) { sx = tS.sx + (dx / d) * m; sy = tS.sy + (dy / d) * m; }
    }
    tS.shownOp = op;
    tS.sx = sx; tS.sy = sy;
    tS.alpha = Math.min(1, tS.alpha + dt / (tS.from ? 0.01 : 0.9));
    // its words: above it while there is sky, else beside it, else below — never into the hero
    placeWords(dt, sx, sy, rr);
    // state: its own feeling, eased by what the person's sea does — rocked by their long swells (a little for good),
    // a little tense in their chop, quieter with the distance their swells made
    const dist = tS.z / cam.Z0;
    // (rockK: 1 for one unhurried long swell of the person's rolling under it — E1 is that swell's energy on this screen)
    const E1 = 0.0023 * U * U * U;
    const chopK = clamp(metricsCache.chop * 6), rockK = clamp((metricsCache.period - 2) / 4) * clamp((metricsCache.userEnergy || 0) / E1);
    relief = Math.min(0.45, relief + (rockK * dt) / 40);
    const target = clamp(baseTension * (1 - relief) + 0.28 * chopK - 0.04 * clamp(dist - 1, 0, 3), 0.12, 0.95);
    tS.tension = clamp(lerp(tS.tension, target, 1 - Math.exp(-dt / 1.2)));
    tS.calm = clamp(1 - tS.tension);
    // (the handle is the ocean's to move only once it has entered: the first frame drawn while it is prepared —
    // under the storm, or with the person's thought still at home — never moves the thought on screen, and an
    // arrival starts from where that thought really is)
    if (!entered) return;
    // depth for W2's ThoughtLayer (its words budget and tag follow z), with its own depth shrink and lift
    // taken back out, so a layer-drawn thought is exactly the ocean's projection: tS.r × tS.surf, at (sx, sy)
    const tz = clamp((dist - 1) / (OCEAN.CAP - 1));
    const rK = thought.r > 0 ? tS.r / thought.r : 1;
    thought.x = sx; thought.y = sy + (thought.r > 0 ? 0.45 * thought.r * tz : 0); thought.z = tz;
    thought.scale = (tS.surf * rK) / (1 - 0.5 * tz); thought.rot = tS.rot;
    thought.labelSide = tS.side === 'tuck' ? 'above' : tS.side;
    // its words plate: the one this world planned round (W2's layer measured it), as the storm asks for its own — so the
    // layer's budget for a far thought is never what decides whether the words fit on this screen. (Melting in, until it
    // sets off from where it hung, the plate the storm showed: the words stay as they were.)
    const fit = tS.from && tS.glide <= 0 ? heldFit : wordsFit;
    if (thought.labelFit !== fit && (fit || thought.labelFit === wordsFit || thought.labelFit === heldFit)) thought.labelFit = fit;
    if (!thought.draw) thought.opacity = tS.vis;
    const st = thought.state || (thought.state = {});
    st.tension = tS.tension; st.calm = tS.calm; st.charge = 0; st.distance = clamp((dist - 1) / (OCEAN.CAP - 1));
  }
  /**
   * The hero keep-out for the thought. A bob that would touch the hero's live body rests against it
   * instead (a screen offset that is put back at once and lets go gently); if its place on the water
   * itself is on the hero (a new layout), the water carries it out to where it is clear.
   */
  function keepThoughtOut(dt, bx, by, sx, sy, rr, landed) {
    const d = Math.exp(-dt / 0.3); tS.koX *= d; tS.koY *= d;
    if (Math.abs(tS.koX) + Math.abs(tS.koY) < 0.05) tS.koX = tS.koY = 0;
    if (!K.on) return;
    // (its place on the water, without a glide's offset: only that is ever moved — and only once the camera has
    // settled after a relayout, so a gliding camera never shoves it aside)
    const settled = Math.abs(camHome - plan.homeY) < 2 && Math.abs(camWater - plan.waterY) < 2 && Math.abs(hyNow - hyTarget) < 2;
    if (landed && settled && discHits(bx, by, rr + 2, Kr)) {
      pushOut(bx, by, rr + 2, Kr, rr);
      const k = Math.min(1, dt / 0.6), s = scaleAt(cam, tS.z), xs = W / 2 + tS.x * s;
      tS.z = clamp(tS.z - (po.y * k * cam.Z0) / (cam.Hw * s * s), cam.Z0, capD * cam.Z0);
      tS.x = (xs + po.x * k - W / 2) / scaleAt(cam, tS.z);
    }
    const px = sx + tS.koX, py = sy + tS.koY;
    if (discHits(px, py, rr + 2, K)) { pushOut(px, py, rr + 2, K, rr); tS.koX += po.x; tS.koY += po.y; }
  }
  const po = { x: 0, y: 0 };
  /** The smallest move that takes a disc off a box: up (further out on the water) or beside it, staying on screen. */
  function pushOut(x, y, r, B, rr) {
    const E = OCEAN.EDGE;
    po.x = 0; po.y = B.y0 - r - y;
    let cost = Math.abs(po.y);
    const ml = B.x0 - r - x, mr = B.x1 + r - x;
    if (B.x0 - r >= E + rr && Math.abs(ml) < cost) { po.x = ml; po.y = 0; cost = Math.abs(ml); }
    if (B.x1 + r <= freeRight() - E - rr && Math.abs(mr) < cost) { po.x = mr; po.y = 0; }
    return po;
  }
  // the words plate: candidate places round the thought (offsets from its centre, and the box on screen)
  const pc = { lx: 0, ly: 0, x0: 0, y0: 0, x1: 0, y1: 0 }, pb = { lx: 0, ly: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
  const SIDES_L = ['above', 'left', 'right', 'below', 'tuck'], SIDES_R = ['above', 'right', 'left', 'below', 'tuck'];
  const tb = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const ovA = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  function plateCand(side, sx, sy, rr, w, h) {
    const bb = bandBottom() + 4, fl = plan?.floor ?? H;
    let lx = 0, ly = 0;
    if (side === 'above') ly = -(rr + 4 + h);
    else if (side === 'below') ly = rr * 0.98 + 8;
    else if (side === 'tuck') ly = Math.max(-(rr + 4 + h), bb - sy);      // as high as the band allows, over the thought's own top
    else {
      lx = (side === 'right' ? 1 : -1) * (rr + 10 + w / 2);
      // beside it, level with it — sliding up or down (while still beside it) to stay out of the band and off the floor
      ly = clamp(-h / 2, Math.max(bb - sy, -h + 6 - rr * 0.5), Math.min(fl - h - sy, rr * 0.5 - 6));
    }
    const cx = side === 'left' || side === 'right' ? sx + lx : clamp(sx, OCEAN.EDGE + w / 2, freeRight() - OCEAN.EDGE - w / 2);
    pc.lx = lx; pc.ly = ly; pc.x0 = cx - w / 2; pc.x1 = cx + w / 2; pc.y0 = sy + ly; pc.y1 = sy + ly + h;
    return pc;
  }
  /** What a place costs: 0 when wholly free; else covering the hero is worst, then the band, then the screen edge, then the thought itself. */
  function plateCost(side, sx, sy, rr) {
    const E = OCEAN.EDGE;
    let c = 0;
    if (K.on) c += 12 * ovA(pc, K);
    c += 6 * Math.max(0, bandBottom() + 4 - pc.y0) * (pc.x1 - pc.x0) + 6 * Math.max(0, pc.y1 - (plan?.floor ?? H)) * (pc.x1 - pc.x0);
    if (side === 'left' || side === 'right') c += 8 * (Math.max(0, E - pc.x0) + Math.max(0, pc.x1 - (freeRight() - E))) * (pc.y1 - pc.y0);
    // (over the thought's own body: allowed only as the last resort, and cheaply when it is small)
    tb.x0 = sx - rr; tb.y0 = sy - rr; tb.x1 = sx + rr; tb.y1 = sy + rr;
    c += 0.5 * ovA(pc, tb) + (side === 'tuck' ? 1 : 0);
    return c;
  }
  function placeWords(dt, sx, sy, rr) {
    const w = tS.plateW || 0, h = tS.plateH || 0;
    if (!w || !h) return;
    // during the melt, until it starts gliding, the words stay as the storm showed them
    if (tS.from && tS.glide <= 0) return;
    // keep the side it has while that side is wholly free; else the first free side (the side away from the hero first);
    // else the place that costs least (never into the hero while anything else is possible)
    let side = tS.side;
    plateCand(side, sx, sy, rr, w, h);
    if (plateCost(side, sx, sy, rr) > 0) {
      let best = null, bc = Infinity;
      for (const sd of sx < hero.cx ? SIDES_L : SIDES_R) {
        plateCand(sd, sx, sy, rr, w, h);
        const c = plateCost(sd, sx, sy, rr);
        if (c < bc) { bc = c; best = sd; Object.assign(pb, pc); }
        if (c <= 0) break;
      }
      side = best; Object.assign(pc, pb);
    }
    tS.side = side;
    tS.labelYT = pc.ly; tS.labelXT = pc.lx;
    if (tS.labelFade >= 0) {
      tS.labelFade += dt / 0.7;
      // (during the melt the words come back above the thought only once no bubble gliding down crosses their place —
      // a moment at most: they never appear under a passing photo)
      if (melt && tS.labelFade >= 0.5 && (tS.labelHold || 0) < 1.6 && bubbles.some((b) => b.from && !b.still && !b.away && b.alpha > 0.2 && b.gx + b.D / 2 + 6 > pc.x0 && b.gx - b.D / 2 - 6 < pc.x1 && b.gy + b.D / 2 + 6 > pc.y0 && b.gy - b.D / 2 - 6 < pc.y1)) { tS.labelFade = 0.5; tS.labelHold = (tS.labelHold || 0) + dt; }
      // (fading out, the words stay where they were beside the thought — out of the hero's way at once if they would touch
      // it; unseen, they move to their new place; there they fade in)
      if (tS.labelFade < 0.5) { if (K.on && boxesHit(plateRect(), K, 0)) tS.labelFade = 0.5; else return; }
      if (tS.labelFade < 0.64) { tS.labelW = plan.textMax; tS.labelY = pc.ly; tS.labelX = pc.lx; }
      if (tS.labelFade >= 1) tS.labelFade = -1;
    }
    // eased, never jumping — and never through the hero: if the eased plate would touch it, it goes straight to its place
    const e = 1 - Math.exp(-dt / 0.28);
    tS.labelY += (tS.labelYT - tS.labelY) * e; tS.labelX += (tS.labelXT - tS.labelX) * e;
    if (K.on && boxesHit(plateRect(), K, 0)) { tS.labelY = tS.labelYT; tS.labelX = tS.labelXT; }
  }
  /** The words plate on screen (+4 px), into a scratch box (or `out`). */
  const prS = { x0: 0, y0: 0, x1: 0, y1: 0 };
  function plateRect(out = prS) {
    const w = tS.plateW, h = tS.plateH, beside = tS.side === 'left' || tS.side === 'right';
    const cx = beside ? tS.sx + tS.labelX : clamp(tS.sx + tS.labelX, OCEAN.EDGE + w / 2, freeRight() - OCEAN.EDGE - w / 2), y0 = tS.sy + tS.labelY;
    out.x0 = cx - w / 2 - 4; out.y0 = y0 - 4; out.x1 = cx + w / 2 + 4; out.y1 = y0 + h + 4;
    return out;
  }

  // ------------------------------------------------------------- bubbles --
  function updateBubbles(dt, now) {
    if (!bubbles.length && !waiting.length) return;
    const rm = reduced();
    const g = driftGain / SEA.STOKES * 1.4 * (rm ? 0.6 : 1);   // bubbles drift further than the thought
    for (const b of bubbles) {
      // (where it was shown last frame: a re-slot this frame already put sx at its new place)
      b._px = b.slideFrom ? b.slideFrom.x : b.sx; b._py = b.slideFrom ? b.slideFrom.y : b.sy;
      sea.sample(b.x, b.z, sm);
      const ki = 1 - Math.exp(-dt / 0.35);
      // (the near water is a shore: carried towards you, a bubble slows as it nears the bottom of the screen and comes to
      // rest before it — photos gather there side by side instead of being pressed into a heap against the edge)
      let uzT = sm.uz * g + towAt(b.z) * 1.4 * (rm ? 0.6 : 1);
      if (uzT < 0 && plan) uzT *= smoothstep(0, 0.2 * H, plan.floor - (b.sy + b.D / 2));
      b.vx += (sm.ux * g - b.vx) * ki; b.vz += (uzT - b.vz) * ki;
      if (!b.from && (b.state === 'float' || b.state === 'rise') && dt > 0) {
        b.x += b.vx * dt; b.z += b.vz * dt;
        b.z = clamp(b.z, -0.8 * cam.Z0, OCEAN.CAP * cam.Z0);
      }
      const h = sm.h * (rm ? 0.4 : 1);
      b.vb += (-40 * (b.yb - h) - 7 * b.vb) * dt; b.yb += b.vb * dt;
      b.rv += (0.6 * Math.atan(sm.hx) * (rm ? 0.3 : 1) - b.rot) * 30 * dt; b.rv *= Math.exp(-6 * dt); b.rot += b.rv * dt;
      if (b.lift > 0) b.lift = Math.max(0, b.lift - dt / 2.4);
      if (b.glowAge >= 0) { b.glowAge += dt; if (b.glowAge > 2.6) b.glowAge = -1; }
      if (b.state === 'rise') { b.riseK = Math.min(1, b.riseK + dt / 1.2); b.alpha = easeOut(b.riseK); if (b.riseK >= 1) b.state = 'float'; }
      // (a photo appearing in its place during the melt waits until every glide has passed it)
      if (b.fade != null && b.fade < 1 && !(melt && b.fadeWait && b.fadeWait.some(([o, g]) => o.from && o.glide < g))) { b.fade = Math.min(1, b.fade + dt / 1.2); b.alpha = easeOut(Math.max(0, b.fade)); }
      if (b.state === 'arrive') { b.riseK = Math.min(1, b.riseK + dt / 1.8); b.alpha = easeOut(b.riseK); if (b.riseK >= 1) b.state = 'float'; }
      // (a jammed one dips under and comes up at its new place)
      if (b.state === 'dive') {
        b.diveK = Math.min(1, b.diveK + dt / 0.5); b.alpha = 1 - easeOut(b.diveK);
        if (b.diveK >= 1) {
          // (its place taken meanwhile? the nearest other free one, or over the horizon to wait its turn)
          const q = freeSlotNear(b, b.diveTo.x, b.diveTo.y);
          if (!q) { b.state = 'leave'; b.leaveK = 1; b.alpha = 0; }
          else { unproject(cam, q.x, q.y + 0.3 * q.D, wo); b.x = wo.x; b.z = wo.z; b.vx = b.vz = 0; b.cap = q.D + 0.5; b.Dd = -1; b.offX = b.offY = b.ovx = b.ovy = 0; b.state = 'rise'; b.riseK = 0; b.alpha = 0; }
        }
      }
      // at the far edge for a while, with others waiting their turn: it drifts on over the horizon
      if (b.state === 'float') { b.capFor = b.z / cam.Z0 >= OCEAN.CAP - 0.6 ? (b.capFor || 0) + dt : 0; if (waiting.length && b.capFor > 6) { b.state = 'leave'; b.leaveK = 0; } }
      const s = scaleAt(cam, b.z), d = b.z / cam.Z0;
      // its size: by its depth, but never more than the gap it floats in allows (cap; it grows back slowly when there is room)
      // (it grows back to its size slowly, only while there is room for it: never pumping against the hero)
      if (b.state === 'float' && b.cap < 400 && roomy(b)) b.cap = Math.min(400, b.cap + 12 * dt);
      // (eased: a settle, a nudge or a new gap never pops its size)
      const Dt = Math.min(bubbleSize(s, d, U), b.cap);
      // (smaller quicker than bigger: a gap that narrows beside the hero is made room for within a few frames)
      b.Dd = b.Dd < 0 ? Dt : b.Dd + (Dt - b.Dd) * (1 - Math.exp(-dt / (Dt < b.Dd ? 0.12 : 0.3)));
      b.D = b.Dd;
      const wy = cam.hy + (cam.Hw - b.yb * (rm ? 0.3 : 1)) * s;
      let sx = W / 2 + b.x * s, sy = wy - 0.3 * b.D - easeOut(b.lift) * b.D * 0.35 + (b.state === 'rise' ? (1 - clamp(b.riseK)) * b.D * 0.5 : b.state === 'dive' ? easeInOut(b.diveK) * b.D * 0.3 : 0);
      if (wake && wy > hyNow) sy += wake.at(sx, wy) * 3;
      if (b.from) {
        // gliding from its postcard down to the water: it follows its way down, steering round the hero, the thought (its
        // clear zone and its words) and the other bubbles, never faster than GLIDE_V — it eases round them, never jumps
        const k = glideEase(b.glide);
        // (squeezed between the band and the thought gliding home — a small phone — it is a little smaller as it passes,
        // never over the thought; it grows back to its own size on the way down)
        let Dg = b.target.D;
        if (!b.still && thought && tS.alpha * tS.vis > 0.2) {
          const room = Math.min(Math.hypot(b.gx - tS.sx, b.gy - tS.sy) - tS.r * tS.surf - 5, b.gy - bandBottom() - 4);
          Dg = clamp(2 * room, 0.62 * b.target.D, b.target.D);
        }
        b.Dg = b.Dg > 0 ? b.Dg + (Dg - b.Dg) * (1 - Math.exp(-dt / (Dg < b.Dg ? 0.08 : 0.3))) : Dg;
        b.D = b.Dg; b.Dd = b.Dg;          // (after it settles, its size eases on from this)
        if (b.state === 'glide' && dt > 0 && !b.still && b.route) { routeAt(b.route, k, rpt); steer(b, rpt.x, rpt.y, dt); }
        sx = b.gx; sy = b.gy;
      }
      if (b.state === 'leave') {
        b.leaveK = Math.min(1, (b.leaveK || 0) + dt / 1.6);
        b.alpha = 1 - easeOut(b.leaveK);
        if (b.away) { sx = b.target.x; sy = b.target.y - 6 * easeOut(b.leaveK); b.D = b.target.D * (1 - 0.5 * b.leaveK); }
        else b.D *= 1 - 0.4 * b.leaveK;
      }
      // a re-slot glides from where it was shown
      // (review B1 r2) …carrying on as it was going: it turns towards its new place smoothly (a critically damped ease, no
      // overshoot) instead of stopping dead and setting off the other way — and never quicker than SLIDE_V (a re-plan after
      // the host's hop moved every bubble the person had not touched yet, and a long slide's first frames went 30 px at a time)
      if (b.slideFrom) { b.offX = b.slideFrom.x - sx; b.offY = b.slideFrom.y - sy; b.ovx = b.vsx || 0; b.ovy = b.vsy || 0; b.slideFrom = null; }
      if (b.offX || b.offY || b.ovx || b.ovy) {
        const w = SLIDE_W;
        b.ovx = (b.ovx || 0) + (-w * w * b.offX - 2 * w * (b.ovx || 0)) * dt;
        b.ovy = (b.ovy || 0) + (-w * w * b.offY - 2 * w * (b.ovy || 0)) * dt;
        const v = Math.hypot(b.ovx, b.ovy);
        if (v > SLIDE_V) { b.ovx *= SLIDE_V / v; b.ovy *= SLIDE_V / v; }
        b.offX += b.ovx * dt; b.offY += b.ovy * dt;
        if (Math.abs(b.offX) + Math.abs(b.offY) < 0.3 && Math.hypot(b.ovx, b.ovy) < 3) b.offX = b.offY = b.ovx = b.ovy = 0;
        sx += b.offX; sy += b.offY;
      }
      // (how it is moving on screen, for a slide that starts from here)
      if (dt > 0 && b._px != null) { b.vsx = (sx - b._px) / dt; b.vsy = (sy - b._py) / dt; }
      b.sx = sx; b.sy = sy;
    }
    // gone over the horizon: it waits its turn; a waiting one drifts into view far out
    for (let k = bubbles.length - 1; k >= 0; k--) if (bubbles[k].state === 'leave' && bubbles[k].leaveK >= 1) { const g0 = bubbles[k]; bubbles.splice(k, 1); waiting.push(g0.i); if (!melt) arriveWaiting(g0.i); }
    separate(dt);
    if (melt) return;
    // room on the water (a layout change, or fewer floating than fit): a waiting photo rises into it
    riseClock += dt;
    if (waiting.length && riseClock > 1.5) {
      riseClock = 0;
      let afloat = 0; for (const b of bubbles) if (b.state !== 'leave') afloat++;
      if (afloat < bubbleSlots(Math.min(7, photos?.n || 0)).length) riseWaiting();
    }
    // every photo gets its turn: with photos waiting, the bubble furthest out drifts on over the horizon now and then
    turnClock += dt;
    if (waiting.length && turnClock > TURN_SEC && !fingers.some((f) => f.on)) {
      let fk = -1, fz = 3.5 * cam.Z0;
      for (let k = 0; k < bubbles.length; k++) { const b = bubbles[k]; if (b.state === 'float' && b.lift <= 0 && b.z > fz) { fz = b.z; fk = k; } }
      if (fk >= 0) { bubbles[fk].state = 'leave'; bubbles[fk].leaveK = 0; turnClock = 0; }
      else turnClock = TURN_SEC * 0.6;
    }
  }
  /**
   * Keep floaters apart and clear of the hero (its live body: a hard keep-out), the band, the thought's clear zone and
   * its words, and the edges (in screen px → world). Everything but the hero is a soft constraint, eased: a bubble is
   * moved at most SEP_V px/s by them, so it slides aside rather than jumping. A bubble in a gap narrower than itself
   * beside the hero shrinks to fit the gap rather than overlap.
   */
  function separate(dt) {
    const E = OCEAN.EDGE, bb = bandBottom() + 4;
    // (where each was before anything held it off this frame: all the holding-off together moves it at most
    // (SEP_V + HARD_V) px/s, the hero's keep-out included)
    // (one sliding to a new place counts its slide too: shown, it moves no quicker than that in all)
    for (const b of bubbles) { const s = sliding(b) && b._px != null; b._hx = s ? b._px : b.sx; b._hy = s ? b._py : b.sy; }
    const Z = liveZone();
    const lim = Math.max(0.4, SEP_V * dt) / 2;              // (two passes)
    const capZ = (OCEAN.CAP - 0.05) * cam.Z0;
    for (let it = 0; it < 2; it++) {
      for (let a = 0; a < bubbles.length; a++) {
        const A = bubbles[a];
        if (A.state !== 'float' && A.state !== 'rise' && A.state !== 'arrive') continue;
        let mx = 0, my = 0, qx = 0, qy = 0;
        const ra = A.D / 2;
        for (let c = a + 1; c < bubbles.length; c++) {
          const B = bubbles[c];
          if (B.state !== 'float' && B.state !== 'rise' && B.state !== 'arrive') continue;
          const dx = A.sx - B.sx, dy = A.sy - B.sy, dd = Math.hypot(dx, dy) || 1e-3, need = ra + B.D / 2 + OCEAN.BUBBLE_GAP;
          if (dd < need) { const m = Math.min(lim, (need - dd) * 0.5 + 0.2); nudge(B, -dx / dd * m, -dy / dd * m); mx += dx / dd * m; my += dy / dd * m; }
        }
        const push = (o, pad, world, noUp) => {
          if (!o) return;
          if (A.sx + ra <= o.x0 - pad || A.sx - ra >= o.x1 + pad || A.sy + ra <= o.y0 - pad || A.sy - ra >= o.y1 + pad) return;
          const l = A.sx + ra - (o.x0 - pad), r = o.x1 + pad - (A.sx - ra), u = noUp ? Infinity : A.sy + ra - (o.y0 - pad), d = o.y1 + pad - (A.sy - ra);
          const m = Math.min(l, r, u, d);
          if (world) { if (m === l) mx -= l; else if (m === r) mx += r; else if (m === u) my -= u; else my += d; }
          else if (m === l) qx -= l; else if (m === r) qx += r; else if (m === u) qy -= u; else qy += d;
        };
        // the thought's clear zone: the bubble floats aside on the water (never further out than the far edge)
        // (its words hold bubbles off in the hard keep-apart below, on the water too: a hold-off only on screen was undone
        // as soon as it eased away, and a far bubble sat under the words all the while)
        push(Z, OCEAN.BUBBLE_GAP * 0.5, true, A.z >= capZ);
        // eased: at most `lim` px this pass
        const ml = Math.hypot(mx, my);
        if (ml > lim) { mx *= lim / ml; my *= lim / ml; }
        // the edges, the band and the floor hold firm (a bubble only ever drifts slowly into them)
        let ex = 0, ey = 0;
        if (A.sx + mx - ra < E) ex = E - (A.sx + mx - ra);
        if (A.sx + mx + ra > freeRight() - E) ex = freeRight() - E - (A.sx + mx + ra);
        if (A.sy + my - ra < bb) ey = bb - (A.sy + my - ra);
        if (A.sy + my + ra > plan.floor) ey = plan.floor - (A.sy + my + ra);
        mx += ex; my += ey;
        if (mx || my) nudge(A, mx, my);
        if (qx || qy) {
          // a screen hold-off follows the words gently too (it is undone as soon as they have moved on)
          const ql = Math.hypot(qx, qy), k = ql > lim * 2 ? (lim * 2) / ql : 1;
          A.offX += qx * k; A.offY += qy * k; A.sx += qx * k; A.sy += qy * k;
        }
        // the hero is a hard keep-out (its box's corners round, as its body is)
        if (K.on) offHero(A);
      }
    }
    // the hero is the one thing a bubble never covers: still on it (squeezed between it and the edge)? smaller, beside it — or, with
    // no room beside it, out on the water above its head
    if (K.on) for (const A of bubbles) if (isLive(A)) offHero(A);
    keepApart(dt);
  }
  /**
   * A bubble on the hero's live body: beside it, or smaller beside it when the gap is narrower than the bubble, else
   * out on the water above its head. (review B1 r2) The body's box has round corners here, as in a glide's aim (a
   * square corner sent a bubble resting at a shoulder 20 px up the moment it settled), and a smaller size eases in
   * (updateBubbles): no pop. How fast it moves is the hard keep-apart's limit — it eases out of a hop, never snaps.
   */
  function offHero(A) {
    const ra = A.D / 2, E = OCEAN.EDGE;
    if (!discHits(A.sx, A.sy, ra, K)) return;
    const left = A.sx < hero.cx, gap = (left ? K.x0 - E : freeRight() - E - K.x1) - 2;
    // (beside it: at least half of it below the hero's top — never lifted over its head for a gap a hair too narrow)
    if (gap >= OCEAN.BUBBLE_FAR && gap < A.D && A.sy > K.y0 - 0.5 * ra) {
      A.cap = Math.min(A.cap, gap);
      nudge(A, (left ? E + ra : freeRight() - E - ra) - A.sx, 0);
      return;
    }
    aimClear(A.sx, A.sy, ra, apt, 1);
    nudge(A, apt.x - A.sx, apt.y - A.sy);
  }
  const isLive = (b) => (b.state === 'float' || b.state === 'rise' || b.state === 'arrive') && b.alpha > 0.05;
  // (one sliding to a new place — its slide is only how it is shown — is held off others on screen, its slide bent round
  // them; shown, it moves no quicker in all than the hard keep-apart's limit, its slide included)
  const sliding = (b) => Math.abs(b.offX) + Math.abs(b.offY) > 3;
  // (moved where it is shown: one sliding has its slide bent, the rest are moved on the water)
  const shove = (b, dx, dy) => { if (sliding(b)) { b.offX += dx; b.offY += dy; b.sx += dx; b.sy += dy; } else nudge(b, dx, dy); };
  const SLIDE_V = 150;                                      // px/s: the quickest a re-slotted bubble slides to its new place
  const SLIDE_W = 4;                                        // /s: how firmly its slide eases in (critically damped: ~1 s, no overshoot)
  const HARD_V = 120;                                       // px/s: the most the hard keep-apart moves a bubble (it never pops)
  const prC = { x0: 0, y0: 0, x1: 0, y1: 0 };
  /**
   * (review r4) The hard keep-apart, after the soft holds and the hero: no floating bubble ever covers another, the
   * thought (its disc and its gap, at every depth) or its words. A few passes of positional projection — each pair
   * pushed apart along the line between them, one pressed against an edge or the hero leaving the other to move — that
   * move a bubble at most HARD_V px/s (overlaps only grow as fast as things drift: this keeps up, and nothing pops). One
   * that stays jammed all the same (a corner full of bubbles the person's swells pushed together) floats off to a free
   * place on the water, or over the horizon to wait its turn; one still on the thought then is drawn under it, dimmed.
   */
  function keepApart(dt) {
    const E = OCEAN.EDGE, bb = bandBottom() + 4, fl = plan.floor;
    const T = thought && tS.alpha * tS.vis > 0.2, rT = T ? tS.r * tS.surf : 0;
    const P = thought && tS.plateW && tS.alpha * tS.vis > 0.2 && (tS.labelFade < 0 || tS.labelFade > 0.62) ? plateRect(prC) : null;
    // (one sliding to a new place after a re-plan is held off on screen — its slide bends round the other — and the rest
    // on the water as usual: nothing is ever drawn over another, sliding or not)
    const mv = shove;
    const inside = (A) => {
      const ra = A.D / 2;
      let ex = 0, ey = 0;
      if (A.sx - ra < E) ex = E - (A.sx - ra); else if (A.sx + ra > freeRight() - E) ex = freeRight() - E - (A.sx + ra);
      if (A.sy - ra < bb) ey = bb - (A.sy - ra); else if (A.sy + ra > fl) ey = fl - (A.sy + ra);
      if (ex || ey) mv(A, ex, ey);
      if (K.on) offHero(A);
    };
    // (pressed against an edge, the floor or the hero, a bubble cannot give way: the other one moves the whole way)
    const pinned = (A) => { const ra = A.D / 2; return A.sx - ra < E + 1 || A.sx + ra > freeRight() - E - 1 || A.sy + ra > fl - 1 || (K.on && discHits(A.sx, A.sy, ra + 2, K)); };
    for (let it = 0; it < 6; it++) {
      for (let a = 0; a < bubbles.length; a++) {
        const A = bubbles[a];
        if (!isLive(A)) continue;
        for (let c = a + 1; c < bubbles.length; c++) {
          const B = bubbles[c];
          if (!isLive(B)) continue;
          let dx = A.sx - B.sx, dy = A.sy - B.sy, d = Math.hypot(dx, dy);
          const need = (A.D + B.D) / 2 + 2;
          if (d >= need) continue;
          // (exactly on top of each other: apart across the screen, the one nearer the middle towards it)
          if (d < 1e-3) { dx = A.sx < W / 2 ? 1 : -1; dy = 0; d = 1; }
          // (one still coming up from under the surface gives way to one already afloat)
          const pa = pinned(A) || (A.state !== 'float' && B.state === 'float'), pb = pinned(B) || (B.state !== 'float' && A.state === 'float'), m = need - d;
          if (pa && pb) {
            // (both held — side by side in a gap one bubble wide beside the hero, say: the upper one rises above the other,
            // further out on the water; or, with the band or the words just over its head, the lower one sinks below it, nearer
            // you, for what the upper one cannot rise)
            const up = A.sy <= B.sy ? A : B, lo = up === A ? B : A, ny = Math.sqrt(Math.max(0, need * need - dx * dx)) - Math.abs(dy);
            if (ny > 0) {
              let room = up.sy - up.D / 2 - bb;
              if (P && P.x0 < up.sx + up.D / 2 + 2 && P.x1 > up.sx - up.D / 2 - 2 && P.y1 <= up.sy) room = Math.min(room, up.sy - up.D / 2 - 2 - P.y1);
              const r = clamp(room, 0, ny);
              if (r > 0) mv(up, 0, -r);
              if (ny > r) mv(lo, 0, ny - r);
            }
            continue;
          }
          const ka = pa ? 0 : pb ? 1 : 0.5;
          if (ka) mv(A, (dx / d) * m * ka, (dy / d) * m * ka);
          if (ka < 1) mv(B, (-dx / d) * m * (1 - ka), (-dy / d) * m * (1 - ka));
        }
        if (T) {
          const dx = A.sx - tS.sx, dy = A.sy - tS.sy, d = Math.hypot(dx, dy) || 1e-3, need = A.D / 2 + rT + OCEAN.BUBBLE_GAP;
          if (d < need) mv(A, (dx / d) * (need - d), (dy / d) * (need - d));
        }
        if (P) {
          const ra = A.D / 2 + 2;
          if (!(A.sx + ra <= P.x0 || A.sx - ra >= P.x1 || A.sy + ra <= P.y0 || A.sy - ra >= P.y1)) {
            // (out by the nearest side — down, towards you, only when nothing else is near: it would grow there)
            // (never out into an edge, the band or the floor: there it would only be pushed back in)
            const l = A.sx + ra - P.x0, r = P.x1 - (A.sx - ra), u = A.sy + ra - P.y0, dn = P.y1 - (A.sy - ra);
            let L2 = A.sx - A.D / 2 - l < E ? Infinity : l, R2 = A.sx + A.D / 2 + r > freeRight() - E ? Infinity : r, U2 = A.sy - A.D / 2 - u < bb ? Infinity : u, D2 = A.sy + A.D / 2 + dn > fl ? Infinity : 1.5 * dn;
            if (Math.min(L2, R2, U2, D2) === Infinity) { L2 = l; R2 = r; U2 = u; D2 = 1.5 * dn; }
            const m = Math.min(L2, R2, U2, D2);
            if (m === L2) mv(A, -l, 0); else if (m === R2) mv(A, r, 0); else if (m === U2) mv(A, 0, -u); else mv(A, 0, dn);
          }
        }
        inside(A);
        if (T) {
          // (held off the thought straight into the hero or an edge, and pushed back on to it: it slides along them instead,
          // round the side of the thought it is on)
          const dx = A.sx - tS.sx, dy = A.sy - tS.sy, need = A.D / 2 + rT + OCEAN.BUBBLE_GAP;
          if (dx * dx + dy * dy < need * need - 0.25 && Math.abs(dy) < need) {
            mv(A, (dx < 0 || (dx === 0 && A.sx > W / 2) ? -1 : 1) * Math.sqrt(need * need - dy * dy) - dx, 0);
            inside(A);
          }
        }
      }
    }
    // never faster than SEP_V + HARD_V, the hero's keep-out included; one held back against the way the
    // water carries it loses that way (it rests against the others instead of pressing into them)
    const lim = Math.max(0.5, (SEP_V + HARD_V) * dt);
    for (const b of bubbles) {
      if (!isLive(b)) continue;
      const mx = b.sx - b._hx, my = b.sy - b._hy, ml = Math.hypot(mx, my);
      // (review B1 r2: the hero's keep-out too — a hop or a host swap moves its box faster than a bubble may go, and
      // one put back on it at once here jumped 16 px in a frame; it eases out over a few frames instead)
      // (and one sliding to a new place is held off on screen no quicker either: its slide, eased, is on top of this)
      if (ml > lim) { const k = lim / ml - 1; shove(b, mx * k, my * k); }
      if (sliding(b)) continue;
      if ((my < -0.3 && b.vz < 0) || (my > 0.3 && b.vz > 0)) b.vz *= Math.exp(-dt / 0.15);
      if ((mx < -0.3 && b.vx > 0) || (mx > 0.3 && b.vx < 0)) b.vx *= Math.exp(-dt / 0.15);
    }
    // still covering something a while: it floats off to a free place (or waits its turn over the horizon)
    let moved = false;
    for (const b of bubbles) {
      if (!isLive(b)) { b.jam = 0; b.overT = false; continue; }
      let jam = 0;
      for (const o of bubbles) if (o !== b && isLive(o)) jam = Math.max(jam, (o.D + b.D) / 2 - Math.hypot(o.sx - b.sx, o.sy - b.sy));
      const ovT = T ? b.D / 2 + rT - Math.hypot(b.sx - tS.sx, b.sy - tS.sy) : -1;
      b.overT = ovT > 0;
      jam = Math.max(jam, ovT);
      if (P && discHits(b.sx, b.sy, b.D / 2 - 1, P)) jam = Math.max(jam, 2);
      b.jam = jam > 1 ? (b.jam || 0) + dt : Math.max(0, (b.jam || 0) - 2 * dt);
      if (!melt && !moved && b.jam > 0.7) { moved = true; unjam(b); }
    }
  }
  /** A bubble that cannot get clear where it is: it dips under and comes up at the nearest free slot, else it goes over the horizon for a while. */
  function unjam(b) {
    b.jam = 0;
    // (jammed again soon after a move: the water is crowded — it drifts away over the horizon for a while instead)
    if (elapsed - (b.unjamAt ?? -1e9) < 10) { b.state = 'leave'; b.leaveK = 0; return; }
    b.unjamAt = elapsed;
    const q = freeSlotNear(b);
    if (!q) { b.state = 'leave'; b.leaveK = 0; return; }
    // (it dips under the surface where it is and comes up there — never sliding through the others on the way)
    b.state = 'dive'; b.diveK = 0; b.diveTo = q;
  }
  /**
   * The nearest planned slot that is free now — nobody floating there, clear of the thought (its disc and gap), its words
   * and the hero — a short way off on the same side of the hero (or null).
   */
  function freeSlotNear(b, x = b.sx, y = b.sy) {
    const T = thought && tS.alpha * tS.vis > 0.2, rT = T ? tS.r * tS.surf : 0;
    const P = thought && tS.plateW && tS.alpha * tS.vis > 0.2 ? plateRect(prC) : null;
    let best = null, bd = Infinity;
    for (const q of bubbleSlots(Math.min(7, photos?.n || 0))) {
      if (bubbles.some((o) => o !== b && o.state !== 'leave' && o.state !== 'dive' && Math.hypot(o.sx - o.offX - q.x, o.sy - o.offY - q.y) < (o.D + q.D) / 2 + OCEAN.BUBBLE_GAP)) continue;
      if (bubbles.some((o) => o !== b && o.state === 'dive' && o.diveTo === q)) continue;
      if (T && Math.hypot(q.x - tS.sx, q.y - tS.sy) < q.D / 2 + rT + OCEAN.BUBBLE_GAP + 4) continue;
      if (P && discHits(q.x, q.y, q.D / 2 + 4, P)) continue;
      if (K.on && discHits(q.x, q.y, q.D / 2 + 2, K)) continue;
      const d = Math.hypot(q.x - x, q.y - y) + (q.far ? 80 : 0);
      if (d < bd) { bd = d; best = q; }
    }
    // (only a short way: never across the screen or round the hero)
    if (!best || Math.hypot(best.x - x, best.y - y) > 0.3 * U || Math.sign(best.x - hero.cx) !== Math.sign(x - hero.cx)) return null;
    return best;
  }
  /** Is there room round a floating bubble to grow a little (clear of the hero, the edges and the band)? */
  function roomy(b) {
    const r = b.D / 2 + 6, E = OCEAN.EDGE;
    if (b.sx - r < E || b.sx + r > freeRight() - E || b.sy - r < bandBottom() + 4 || b.sy + r > (plan?.floor ?? H)) return false;
    if (K.on && discHits(b.sx, b.sy, r, K)) return false;
    for (const o of bubbles) if (o !== b && o.state !== 'leave' && Math.hypot(o.sx - b.sx, o.sy - b.sy) < r + o.D / 2 + OCEAN.BUBBLE_GAP) return false;
    return true;
  }
  const SEP_V = 90;                                         // px/s: how fast a bubble slides aside for the soft constraints
  const prB = { x0: 0, y0: 0, x1: 0, y1: 0 }, TZ = { x0: 0, y0: 0, x1: 0, y1: 0 };
  /** The thought's clear zone on screen now (null when it is not shown). */
  function liveZone() {
    if (!thought || tS.alpha * tS.vis < 0.2) return null;
    // (far out it is small, but its clear zone stays a good size: it keeps a little open water of its own)
    return thoughtZone(tS.sx, tS.sy, Math.max(tS.r * tS.surf, 0.6 * tS.r), tS.side === 'left' || tS.side === 'right' ? 0 : tS.plateW || 0, TZ);
  }
  const GLIDE_V = 190, REP_V = 340, REP_M = 6;     // px/s, px/s, px: the glide's top speed, how firmly things hold it off, from how near
  const rep = { x: 0, y: 0 }, rpt = { x: 0, y: 0 };
  /**
   * Steer a gliding bubble towards (qx, qy), its planned point on the shared clock (velocity-limited: no jumps). Its way
   * is planned clear of the hero, the thought on its way home and every other glide, so the holds-off here are only a
   * safety, and only ever this close: the hero's live body (a host swapped mid-melt), the thought, its words once they
   * have settled above it, the band, the screen's sides, and any other bubble nearer than their gap. Nothing is ever
   * swapped or sent elsewhere mid-glide. Once the director's melt is over a glide never stays up in the sky.
   *
   * (review B1 r2) Two things kept a glide from ever coming to rest beside a MallowTouch hero (a few px wider than the
   * rig, its float and tilt in its box): its planned point could lie inside the hero's live keep-out, where the hold-off
   * pushed it out and the glide pulled it straight back in; and at 20–30 fps one step of the stiff holds-off overshot
   * their 6 px margin, so the two took turns — a bubble flicking between two places on alternate frames. Now the point
   * it steers to is moved just clear of the hero first (aimClear: re-targeted, so the bubble settles there), and the
   * holds-off run in steps of at most 1/90 s, where they converge instead of overshooting.
   */
  function steer(b, qx, qy, dt) {
    const r = b.D / 2;
    if (K.on) { aimClear(qx, qy, r, apt); qx = apt.x; qy = apt.y; }
    b.ax = qx; b.ay = qy;
    const n = Math.max(1, Math.ceil(dt * STEER_HZ - 1e-6)), h = dt / n;
    for (let i = 0; i < n; i++) steerStep(b, qx, qy, h, r);
  }
  const STEER_HZ = 90;                                      // (the holds-off are stable below 1/60 s a step: 1/90 s is calm)
  const apt = { x: 0, y: 0 };
  /**
   * Where a bubble may be near the hero: the point itself when its disc is clear of the hero's live keep-out by `m`
   * (a glide: the hold-off margin, so nothing holds it off where it comes to rest); else the nearest point that is
   * (continuous as the hero bobs, tilts or hops; its box's corners are round, as the body is) — beside it while the
   * screen's side leaves room for the bubble there, touching it at worst, else just over its head.
   */
  function aimClear(x, y, r, out, m = REP_M + 1) {
    out.x = x; out.y = y;
    const cx = x < K.x0 ? K.x0 : x > K.x1 ? K.x1 : x, cy = y < K.y0 ? K.y0 : y > K.y1 ? K.y1 : y;
    const R = r + m;
    let dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d >= R) return out;
    if (d > 1e-3) { out.x = cx + (dx / d) * R; out.y = cy + (dy / d) * R; }
    else {
      // (inside the keep-out itself: out by the nearest side, never down under the hero)
      const l = x - K.x0, rt = K.x1 - x, u = y - K.y0, mn = Math.min(l, rt, u);
      if (mn === l) out.x = K.x0 - R; else if (mn === rt) out.x = K.x1 + R; else out.y = K.y0 - R;
    }
    const lo = OCEAN.EDGE + r, hi = freeRight() - OCEAN.EDGE - r;
    if (out.x >= lo && out.x <= hi) return out;
    // (no room that far out beside it: as far out as the screen allows, at the same height, while that still clears its
    // body; else over its head — a smaller margin rather than a bubble lifted into the sky)
    const xs = clamp(out.x, lo, hi), gx = xs < K.x0 ? K.x0 - xs : xs > K.x1 ? xs - K.x1 : 0;
    out.x = xs;
    if (gx >= r) { out.y = y; return out; }
    const R0 = r + Math.min(m, 2);
    out.y = Math.min(y, K.y0 - Math.sqrt(Math.max(0, R0 * R0 - gx * gx)));
    return out;
  }
  function steerStep(b, qx, qy, dt, r) {
    const VG = GLIDE_V * (melt?.f || 1);                    // (the melt's queue quickened to end with the director's: as quick)
    let vx = (qx - b.gx) / 0.12, vy = (qy - b.gy) / 0.12;
    const va = Math.hypot(vx, vy);
    if (va > VG) { vx *= VG / va; vy *= VG / va; }
    rep.x = rep.y = 0;
    if (K.on) repelBox(b.gx, b.gy, r, K);
    // (a words plate as wide as a small phone is a wall between the sky and the water: a bubble glides on past it)
    const wall = (o) => o.x1 - o.x0 > W - 2 * OCEAN.EDGE - b.D - 8;
    if (thought && tS.alpha * tS.vis > 0.2) {
      repelDisc(b.gx, b.gy, r, tS.sx, tS.sy, tS.r * tS.surf + 2);
      if (tS.plateW && tS.labelFade < 0) { const P = plateRect(prB); if (!wall(P)) repelBox(b.gx, b.gy, r, P); }
    }
    // (the band and the screen's sides hold only what would go past them: a slot may sit right at the edge's margin)
    { const top = bandBottom() + 4 + r; if (b.gy < top) rep.y += Math.min(3, (top - b.gy) / REP_M) * REP_V; }
    { const L = OCEAN.EDGE + r, Rt = freeRight() - OCEAN.EDGE - r; if (b.gx < L) rep.x += Math.min(3, (L - b.gx) / REP_M) * REP_V; if (b.gx > Rt) rep.x -= Math.min(3, (b.gx - Rt) / REP_M) * REP_V; }
    // held off something that does not move out of the way (the hero, the thought, its words, the band, an edge): it
    // slides along it at its own pace instead of pressing against it — round it and on its way, never stalled there
    const rl = Math.hypot(rep.x, rep.y);
    if (rl > 1e-3) {
      const nx = rep.x / rl, ny = rep.y / rl, vn = vx * nx + vy * ny;
      if (vn < 0) { const sp = Math.hypot(vx, vy); vx -= vn * nx; vy -= vn * ny; const tl = Math.hypot(vx, vy); if (tl > 1e-3) { vx *= (0.9 * sp) / tl; vy *= (0.9 * sp) / tl; } }
    }
    vx += rep.x; vy += rep.y;
    rep.x = rep.y = 0;
    for (const o of bubbles) {
      if (o === b || o.alpha < 0.02 || o.state === 'leave' || o.away) continue;
      const ox = o.from ? o.gx : o.sx, oy = o.from ? o.gy : o.sy;
      repelDisc(b.gx, b.gy, r, ox, oy, o.D / 2 + 2);
    }
    vx += rep.x; vy += rep.y;
    // (the director's melt is over: down onto the water, never hovering in the sky)
    // (and in its last moment it is already on its way down: below the horizon as the melt ends)
    if (melt && b.go && (melt.k >= 1 || melt.left < 0.35)) { const lim = hyNow + 4 - 0.3 * b.D; if (b.gy < lim) vy = Math.max(vy, Math.min(VG, (lim - b.gy) * 6)); }
    const v = Math.hypot(vx, vy), cap = Math.min(VG * 1.15, 238);       // (never more than 8 px a 1/30 s step)
    if (v > cap) { vx *= cap / v; vy *= cap / v; }
    b.gx += vx * dt; b.gy += vy * dt;
    // (the edges are firm: a glide is pressed along them, never past them)
    b.gx = clamp(b.gx, Math.min(freeRight() / 2, OCEAN.EDGE + r), Math.max(freeRight() / 2, freeRight() - OCEAN.EDGE - r));
  }
  function repelDisc(x, y, r, cx, cy, R, M = REP_M) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1e-3, gap = d - R - r;
    if (gap >= M) return;
    const f = (M - gap) / M;
    rep.x += (dx / d) * f * REP_V; rep.y += (dy / d) * f * REP_V;
  }
  function repelBox(x, y, r, B, M = REP_M) {
    const cx = x < B.x0 ? B.x0 : x > B.x1 ? B.x1 : x, cy = y < B.y0 ? B.y0 : y > B.y1 ? B.y1 : y;
    let dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), gap;
    if (d > 1e-3) { dx /= d; dy /= d; gap = d - r; }
    else {
      // inside it: out by the nearest side
      const l = x - B.x0, rt = B.x1 - x, u = y - B.y0, dn = B.y1 - y, m = Math.min(l, rt, u, dn);
      dx = m === l ? -1 : m === rt ? 1 : 0; dy = dx ? 0 : m === u ? -1 : 1; gap = -m - r;
    }
    if (gap >= M) return;
    const f = (M - gap) / M;
    rep.x += dx * f * REP_V; rep.y += dy * f * REP_V;
  }
  /** Move a floating bubble by a screen offset (converted to world, so physics carries on from there). */
  function nudge(b, mx, my) {
    b.sx += mx; b.sy += my;
    const s = scaleAt(cam, b.z), xs = W / 2 + b.x * s;
    // up the screen is away: its line on the still water moves by dy exactly (solved, not linearised — far out a px of
    // screen is a long way on the water); and its screen x moves by mx exactly (further out, the same world x would slide
    // it towards the vanishing point — into the thought)
    const s2 = Math.max(1 / (OCEAN.CAP + 1), s + my / cam.Hw);
    b.z = clamp(depthAt(cam, s2), -0.8 * cam.Z0, OCEAN.CAP * cam.Z0);
    b.x = (xs + mx - W / 2) / scaleAt(cam, b.z);
  }
  /** A waiting photo drifts into view far out on the horizon (after another drifted away over it). */
  function arriveWaiting(skip) {
    const k = waiting.findIndex((i) => i !== skip);
    if (k < 0) return;
    const d = OCEAN.CAP - 0.5, s0 = scaleAt(cam, d * cam.Z0), D = bubbleSize(s0, d, U);
    const y = cam.hy + cam.Hw * s0 - 0.3 * D;
    const P = thought && tS.plateW ? plateRect(prB) : null;
    let bestX = null, bs = -Infinity;
    for (let x = OCEAN.EDGE + D / 2; x <= freeRight() - OCEAN.EDGE - D / 2; x += 6) {
      if (P && x + D / 2 > P.x0 - 4 && x - D / 2 < P.x1 + 4 && y + D / 2 > P.y0 && y - D / 2 < P.y1) continue;
      let clear = Infinity;
      for (const b of bubbles) clear = Math.min(clear, Math.hypot(b.sx - x, b.sy - y) - (b.D + D) / 2);
      if (thought) clear = Math.min(clear, Math.hypot(tS.sx - x, tS.sy - y) - tS.r * tS.surf - D / 2);
      if (clear > bs) { bs = clear; bestX = x; }
    }
    if (bestX == null || bs < OCEAN.BUBBLE_GAP) return;
    const i = waiting.splice(k, 1)[0];
    unproject(cam, bestX, y + 0.3 * D, wo);
    bubbles.push(newBubble({ i, x: wo.x, z: wo.z, D, sx: bestX, sy: y, state: 'arrive' }));
  }
  /** A waiting photo rises into the roomiest free slot (near ones first, then the far row). */
  function riseWaiting() {
    const i = waiting[0];
    const P = thought && tS.plateW ? plateRect(prB) : null;
    let best = null, bs = -Infinity;
    for (const sl of bubbleSlots(Math.min(7, photos?.n || 0))) {
      let clear = Infinity;
      for (const b of bubbles) if (b.state !== 'leave') clear = Math.min(clear, Math.hypot(sl.x - b.sx, sl.y - b.sy) - b.D / 2 - sl.D / 2);
      if (thought) clear = Math.min(clear, Math.hypot(sl.x - tS.sx, sl.y - tS.sy) - tS.r * tS.surf - 8 - sl.D / 2);
      if (P && sl.x + sl.D / 2 > P.x0 && sl.x - sl.D / 2 < P.x1 && sl.y + sl.D / 2 > P.y0 && sl.y - sl.D / 2 < P.y1) continue;
      if (K.on && sl.x + sl.D / 2 > K.x0 && sl.x - sl.D / 2 < K.x1 && sl.y + sl.D / 2 > K.y0 && sl.y - sl.D / 2 < K.y1) continue;
      if (clear < OCEAN.BUBBLE_GAP * 2) continue;
      const sc = Math.min(clear, U * 0.4) + sl.D * 0.3 - (sl.far ? 40 : 0);
      if (sc > bs) { bs = sc; best = sl; }
    }
    if (!best) return;
    waiting.shift();
    unproject(cam, best.x, best.y + 0.3 * best.D, wo);
    bubbles.push(newBubble({ i, x: wo.x, z: wo.z, D: best.D, cap: best.D + 0.5, sx: best.x, sy: best.y, state: best.far ? 'arrive' : 'rise' }));
    if (!best.far) splash(best.x, best.y + 0.3 * best.D, best.D);
  }

  // --------------------------------------------------------------- hero --
  /** The hero's waterline: its lowest tenth sits in the water (the body box carries a little transparent margin below the art). */
  const heroBase = () => hero.bottom - ART_BOTTOM * hero.h;
  const heroWater = () => heroBase() - 0.1 * (1 - ART_BOTTOM) * hero.h;     // (rest geometry: the body's own bob never moves the water)
  function updateHero(dt, now) {
    if (!hero.ok) return;
    const rm = reduced();
    const wl = heroWater();
    unproject(cam, hero.cx, wl, wo);
    hero.x = wo.x; hero.z = wo.z; hero.s = wo.s;
    sea.sample(hero.x, hero.z, sm);
    const hw = wake ? wake.at(hero.cx, wl) * 3 / hero.s : 0;
    const h = (sm.h * (rm ? 0.4 : 1) + hw);
    hero.vb += (-40 * (hero.yb - h) - 7 * hero.vb) * dt; hero.yb += hero.vb * dt;
    const k = hero.floatK * (1 - outroK);
    // (its float stays within the room the thought's home leaves above its head)
    hero.lift = clamp((hero.yb * hero.s) / Math.max(40, hero.h), -OCEAN.BOB, OCEAN.BOB) * (rm ? 0.3 : 1) * k;
    hero.tilt = clamp(0.6 * Math.atan(sm.hx) * 57.3, -7, 7) * (rm ? 0.3 : 1) * k;
    if (entered) { try { mallow?.float?.({ lift: hero.lift, tilt: hero.tilt }); hero.liftApplied = hero.lift; hero.tiltApplied = hero.tilt; } catch { /* optional */ } }
    // a tiny hop on a big crest (not under reduced motion)
    if (entered && !melt && !rm && sm.h > 0.75 * sm.amp && sm.amp > 14 && now - hopAt > 12 && !fingers.some((f) => f.on)) { hopAt = now; try { mallow?.react?.('hop'); } catch { /* optional */ } }
  }

  // --------------------------------------------------------------- draw --
  function drawBack(now, rm) {
    const bk = ctx.back;
    const g = bk.g, d = bk.dpr;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // sky (shifted with the horizon while it rises)
    const top = SKY[SKY.length - 1].c;
    g.fillStyle = `rgb(${top[0]},${top[1]},${top[2]})`; g.fillRect(0, 0, W, H);
    const dy = hyNow - plan.hy;
    g.drawImage(skyC, 0, dy, W, skyC.height / (ctx.dprBack || 1));
    // the dawn on the horizon
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = clamp(0.3 + 0.44 * dawnK - 0.12 * mirrorK) * (low() ? 0.7 : 1);
    const dw = W * (1.0 + 0.5 * dawnK), dh = (H * 0.2 + 30) * (0.8 + 0.4 * dawnK);
    g.drawImage(dawnSpr, 0, 0, 256, 128, xd - dw / 2, hyNow - dh, dw, dh);
    // a few stars twinkle (not under reduced motion)
    for (const st of stars) {
      const a = st.a * (rm || low() ? 1 : 0.65 + 0.35 * Math.sin(now * st.f + st.ph));
      g.globalAlpha = a; g.drawImage(sprites.star, st.x - st.s * 3, st.y + dy - st.s * 3, st.s * 6, st.s * 6);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // the sea
    gridPass(now, rm);
    rasterPass(now);
    imgG.putImageData(imgData, 0, 0);
    // two bilinear steps (×2, then to size): a softer, rounder upscale than one
    img2G.globalCompositeOperation = 'copy'; img2G.drawImage(img, 0, 0, iw * 2, ih * 2);
    g.imageSmoothingEnabled = true;
    g.drawImage(img2, 0, imgY0, iw * CELL, ih * CELL);
    // light on top: crest lines, the horizon line, glints, plankton, Loomi's glow on the water
    g.globalCompositeOperation = 'lighter';
    drawCrests(g, now, rm);
    g.globalAlpha = 0.42 + 0.26 * dawnK - 0.1 * mirrorK;
    g.drawImage(horizonSpr, 0, 0, 256, 8, xd - W * 0.75, hyNow - 4, W * 1.5, 8);
    drawSparkles(g, now, rm);
    plankton.draw(g, sprites.plankton, low() ? 0.5 : 1, 0.12);
    // broken water: little elongated glints (a wavelet's lit edge), white-cyan, some warm in the dawn path
    for (let i = 0; i < chopSparks.n; i++) {
      const a = chopSparks.a[i] * chopSparks.env(i, 0.05);
      if (a < 0.01) continue;
      const r = chopSparks.size[i];
      g.globalAlpha = a; g.drawImage(chopSparks.c[i] ? sprites.dawn : sprites.chop, chopSparks.x[i] - r * 2.2, chopSparks.y[i] - r * 0.6, r * 4.4, r * 1.2);
    }
    if (hero.ok) {
      const wl = heroWater(), hw = (hero.right - hero.left);
      g.globalAlpha = 0.3 * (low() ? 0.6 : 1) * hero.floatK;
      g.drawImage(sprites.loomi, hero.cx - hw * 1.2, wl - hw * 0.12, hw * 2.4, hw * 0.85);
      g.globalAlpha = 0.12 * (low() ? 0.6 : 1) * hero.floatK;
      g.drawImage(sprites.loomi, hero.cx - hw * 2, wl - hw * 0.1, hw * 4, hw * 1.6);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  const nrm = { x: 0, y: 0, z: 0 };
  /** Evaluate the sea on the perspective grid and shade every vertex. */
  function gridPass(now, rm) {
    const n = rowsN, Hw = cam.Hw, Z0 = cam.Z0, hy = hyNow;
    const span = H * 1.04 - hy;
    const amp = (rm ? 0.4 : 1) * (1 - 0.35 * mirrorK), slopeK = (rm ? 0.5 : 1) * (1 - 0.5 * mirrorK);
    for (let j = 0; j < n; j++) {
      const v = (j + 0.7) / n;
      const y = hy + span * Math.pow(v, 1.35);
      const s = Math.max(1e-3, (y - hy) / Hw);
      rY[j] = y; rS[j] = s; rZ[j] = depthAt(cam, s);
    }
    for (let j = 0; j < n; j++) rDZ[j] = Math.abs((rZ[Math.max(0, j - 1)] - rZ[Math.min(n - 1, j + 1)]) / (j === 0 || j === n - 1 ? 1 : 2));
    const Lx = (xd - W / 2) / Z0, Ly = 0.04, Lz = 1, Ll = Math.hypot(Lx, Ly, Lz);
    const lx = Lx / Ll, ly = Ly / Ll, lz = Lz / Ll;
    const bio = (low() ? 0.5 : 1);
    const anyHush = hushDiscs();
    for (let j = 0; j < n; j++) {
      const s = rS[j], z = rZ[j], o = j * COLS;
      const x0 = (colX0 - W / 2) / s, step = colStep / s;
      sea.row(z, x0, step, COLS, rDZ[j], o, gH, gHX, gHZ, gGX, gGZ, gA, true, gAU, FLICK_U * U, rowX);
      const sN = clamp(s / 1.2), ambA = rowX.ambA;
      for (let c = 0; c < COLS; c++) {
        const q = o + c, x = x0 + c * step;
        let h = gH[q] * amp, hx = gHX[q] * slopeK, hz = gHZ[q] * slopeK;
        if (anyHush) { const m = 1 - 0.5 * hushAt(x, z); h *= m; hx *= m; hz *= m; }
        // screen position (Gerstner shift sharpens the crests)
        const zz = z + gGZ[q] * amp, xx = x + gGX[q] * amp;
        const s2 = Z0 / (Z0 + Math.max(zz, -0.85 * Z0));
        const sx = W / 2 + xx * s2;
        let sy = hy + (Hw - h) * s2;
        if (wake) sy += wake.at(sx, rY[j]) * 3 * (rm ? 0.5 : 1);
        gSX[q] = sx; gSY[q] = Math.max(hy, sy);
        // normal, view, reflection
        let nx = -hx, ny = 1, nz = -hz; const nl = 1 / Math.sqrt(nx * nx + 1 + nz * nz); nx *= nl; ny *= nl; nz *= nl;
        let vx = -x, vy = Hw, vz = -(Z0 + z); const vl = 1 / Math.sqrt(vx * vx + vy * vy + vz * vz); vx *= vl; vy *= vl; vz *= vl;
        const ndv = Math.max(0.0001, nx * vx + ny * vy + nz * vz);
        const f1 = 1 - ndv, F = 0.05 + 0.95 * f1 * f1 * f1;
        const rx = 2 * ndv * nx - vx, ry = 2 * ndv * ny - vy, rz = Math.max(0.05, 2 * ndv * nz - vz);
        // the sky seen in that direction (the same gradient and dawn as the picture above)
        const skyY = hy - Z0 * (ry / rz), skyX = W / 2 + Z0 * (rx / rz);
        skyAt((hy - skyY) / Math.max(1, hy), sky3);
        const above = Math.max(0, hy - skyY);
        const ddx = (skyX - xd) / (W * (0.3 + 0.1 * dawnK)), dexp = ddx * ddx + above / (H * 0.11 + 20);
        const dawn = dexp < 9 ? dawnK * Math.exp(-dexp) : 0;
        let rr = sky3[0] * 0.82 + 300 * dawn, rg = sky3[1] * 0.85 + 236 * dawn, rb = sky3[2] * 0.88 + 168 * dawn;
        // the water's own colour: deep teal, lighter far away; light from inside the swell on its crests
        const sss = clamp(0.5 + h / ((gA[q] + 4) * 2)) * 0.6 + 0.2;
        const wr = lerp(10, 5, sN) * (0.7 + 0.6 * sss), wg = lerp(54, 36, sN) * (0.7 + 0.6 * sss), wb = lerp(74, 54, sN) * (0.7 + 0.6 * sss);
        // specular glitter of the dawn (broad lobe here; sharp glints as sprites)
        const rdl = (rx * lx + ry * ly + rz * lz) / Math.sqrt(rx * rx + ry * ry + rz * rz);
        const sp = rdl > 0.965 ? Math.pow(rdl, 160) * dawnK * (1 + 0.35 * mirrorK) : 0;
        // bioluminescent crest light, in drifting patches (anchored to the water, never ruler lines)
        const a = gA[q] * amp;
        const crest = a > 0.3 ? clamp(h / (a + 0.3)) : 0;
        const pn = 0.5 + 0.5 * Math.sin(x * 0.021 + j * 1.7 + now * 0.13) * Math.sin(x * 0.047 - j * 0.83 - now * 0.07 + 1.3);
        // (how bright: the steepness of the person's own waves — chop sparkles, long swells glow)
        const glow = smoothstep(0.42, 0.95, crest) * clamp(gAU[q] * amp * 4.2) * bio * (0.45 + 0.55 * sN) * (0.3 + 0.7 * pn);
        gCrest[q] = glow; gSpec[q] = sp;
        // the idle sea breathes: where its own gentle swells meet in a crest, a faint glimmer in drifting patches
        // (far dimmer than the person's crest light; it quietens in the mirror-calm finish)
        const glim = ambA > 0.4 ? smoothstep(0.5, 0.92, (gAmb[q] * (anyHush ? 1 - 0.5 * hushAt(x, z) : 1)) / ambA) * (0.25 + 0.75 * pn) * (0.35 + 0.65 * sN) * bio * (1 - 0.6 * mirrorK) : 0;
        gGlim[q] = glim;
        // the dawn's glitter path: narrow at the horizon, widening towards you, broken by the slopes
        const pathW = W * (0.035 + 0.15 * sN) * (1 + 3 * clamp(Math.sqrt(hx * hx + hz * hz) * 4));
        const px2 = (sx - xd) / pathW;
        gPath[q] = px2 * px2 < 9 ? Math.exp(-px2 * px2) * dawnK * (0.35 + 0.65 * clamp(Math.sqrt(hx * hx + hz * hz) * 9)) : 0;
        const Fm = F * (1 + 0.15 * mirrorK);
        // the dawn path: a soft warm column, narrow far out and widening towards you, fading as it nears
        // (beside the hero, off-axis: the star of the mirror-calm finish)
        const cwid = W * (0.012 + 0.05 * sN) * (1 + 0.25 * mirrorK), cdx = (sx - xd) / cwid;
        const colm = cdx * cdx < 9 ? Math.exp(-cdx * cdx) * dawnK * (0.6 - 0.22 * sN) * (1 + 0.25 * mirrorK) * (0.72 + 0.28 * Math.cos(j * 0.9 + now * 0.6) * (rm ? 0 : 1)) : 0;
        // the storm's ground lines, arriving as the first swells: their crests still lit in the storm's gold for a few seconds
        const gold = Math.min(1, gGold[q] * 7 * amp) * (low() ? 0.6 : 1);
        gGold[q] = gold;                                  // (kept for the crest lines)
        gR[q] = wr * (1 - Fm) + rr * Fm + 255 * sp * 0.8 + 70 * glow + 190 * colm + 240 * gold + 20 * glim;
        gG[q] = wg * (1 - Fm) + rg * Fm + 225 * sp * 0.8 + 210 * glow + 128 * colm + 190 * gold + 66 * glim;
        gB[q] = wb * (1 - Fm) + rb * Fm + 170 * sp * 0.8 + 220 * glow + 66 * colm + 105 * gold + 76 * glim;
      }
    }
  }

  /**
   * Fill the water image column by column between the displaced rows; add the wake's glow, and where
   * the person's quick flicks made chop, broken water: small facets that catch the light and turn
   * (two tiles morphing into each other — smooth in time, never a flicker), fading to a mirror as the
   * chop dies away.
   */
  function rasterPass(now) {
    const D = imgData.data, n = rowsN, hy = hyNow;
    const wh = wake ? wake.h : null, wc = iw;
    const wgK = (low() ? 0.5 : 1) * 210;
    const ph = reduced() ? 0.6 : now * 2.1, ca = Math.cos(ph), sa = Math.sin(ph), chopG = (reduced() ? 0.5 : 1) * (low() ? 0.6 : 1);
    for (let ic = 0; ic < iw; ic++) {
      const i0 = colI[ic], f = colF[ic];
      let py = 0;
      // above the horizon: clear (the sky shows); the horizon cell is partly covered (soft edge)
      const hyC = (hy - imgY0) / CELL;
      const jh = Math.floor(hyC);
      for (; py < Math.min(ih, jh); py++) D[(py * iw + ic) * 4 + 3] = 0;
      // the first row's colour reaches up to the horizon
      let q = i0;
      let pr = lerp(gR[q], gR[q + 1], f), pg = lerp(gG[q], gG[q + 1], f), pb = lerp(gB[q], gB[q + 1], f), pch = lerp(gChop[q], gChop[q + 1], f);
      let prevY = hy;
      const ti = ic & (TILE - 1);
      // (review r4) where water folds behind a nearer crest the colour changes at once, at prevY: that edge is drawn with
      // its true coverage of the two cells either side of it (anti-aliased), never as a whole 4 px cell — no staircase
      let fR = -1, fG = 0, fB = 0;
      for (let j = 0; j < n && py < ih; j++) {
        q = j * COLS + i0;
        const y = lerp(gSY[q], gSY[q + 1], f);
        const cr = lerp(gR[q], gR[q + 1], f), cg = lerp(gG[q], gG[q + 1], f), cb = lerp(gB[q], gB[q + 1], f), cch = lerp(gChop[q], gChop[q + 1], f);
        if (y <= prevY + 0.01) { if (fR < 0) { fR = pr; fG = pg; fB = pb; } pr = cr; pg = cg; pb = cb; pch = cch; continue; }     // folded behind a nearer crest
        const cy = (y - imgY0) / CELL - 0.5;
        const edge = fR >= 0 && py > 0 && py <= cy && py < ih, py0 = py, cTop = imgY0 + py * CELL;
        for (; py <= cy && py < ih; py++) {
          const yy = imgY0 + (py + 0.5) * CELL;
          const t = clamp((yy - prevY) / (y - prevY));
          const o = (py * iw + ic) * 4;
          let R2 = pr + (cr - pr) * t, G2 = pg + (cg - pg) * t, B2 = pb + (cb - pb) * t;
          const chv = pch + (cch - pch) * t;
          if (chv > 0.004) {
            const k = (py & (TILE - 1)) * TILE + ti, tx = tileA[k] * ca + tileB[k] * sa;
            const a = Math.min(1, chv * 5) * chopG;
            if (tx > 0) { const l = Math.min(1.4, tx * tx * tx) * a; R2 += 130 * l; G2 += 180 * l; B2 += 185 * l; } else { const l = Math.min(1, -tx) * a; R2 -= 20 * l; G2 -= 32 * l; B2 -= 36 * l; }
          }
          if (wh && py > 0 && py < ih - 1 && ic > 0 && ic < iw - 1) {
            const k = py * wc + ic;
            const k2 = py > 1 && py < ih - 2 && ic > 1 && ic < iw - 2;
            const gx = k2 ? (wh[k + 1] - wh[k - 1]) * 0.5 + (wh[k + 2] - wh[k - 2]) * 0.25 : wh[k + 1] - wh[k - 1];
            const gy = k2 ? (wh[k + wc] - wh[k - wc]) * 0.5 + (wh[k + 2 * wc] - wh[k - 2 * wc]) * 0.25 : wh[k + wc] - wh[k - wc];
            const gl = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 2.4);
            const lift = Math.abs(wh[k]) * 18;
            R2 += gl * wgK * 0.35 + lift; G2 += gl * wgK * 0.95 + lift; B2 += gl * wgK + lift;
          }
          // (the first cell under a fold edge keeps the part of it above the edge in the colour there)
          if (edge && py === py0) { const cA = clamp((prevY - cTop) / CELL); R2 += (fR - R2) * cA; G2 += (fG - G2) * cA; B2 += (fB - B2) * cA; }
          const mx = R2 > G2 ? (R2 > B2 ? R2 : B2) : G2 > B2 ? G2 : B2;
          if (mx > 176) { const f = TONE[mx < 1024 ? mx | 0 : 1024]; R2 *= f; G2 *= f; B2 *= f; }
          D[o] = R2; D[o + 1] = G2; D[o + 2] = B2;
          D[o + 3] = py === jh ? Math.round(255 * clamp(1 - (hyC - jh))) : 255;
          // (…and the cell above it takes the part of it below the edge in this one's)
          if (edge && py === py0) { const cB = clamp((cTop - prevY) / CELL), o1 = o - iw * 4; D[o1] += (R2 - D[o1]) * cB; D[o1 + 1] += (G2 - D[o1 + 1]) * cB; D[o1 + 2] += (B2 - D[o1 + 2]) * cB; }
        }
        if (edge) fR = -1;
        prevY = y; pr = cr; pg = cg; pb = cb; pch = cch;
      }
      { const mx = Math.max(pr, pg, pb), f = mx > 176 ? TONE[mx < 1024 ? mx | 0 : 1024] : 1; for (; py < ih; py++) { const o = (py * iw + ic) * 4; D[o] = pr * f; D[o + 1] = pg * f; D[o + 2] = pb * f; D[o + 3] = 255; } }
    }
  }

  /**
   * Crest light, traced analytically along each of the person's swells (and the storm's gold seed lines): the crests of a
   * packet are the lines θ = 2πn across its direction (at most three, nearest its middle). (review r4) Each is followed
   * across the water at about one point per 4–5 screen px, lifted only by the sea's height (its longer waves) — never by
   * the finger's wake or the crest-sharpening shift, which kinked it — then smoothed (two [1, 2, 1] passes) and drawn as
   * curves through the midpoints, so it can never zigzag. Its light is the envelope there × the swell's steepness, in slow
   * patches anchored to the water; it thins to nothing wherever the line would turn sharply, at its ends, and where crests
   * run off towards the horizon's vanishing point (seen end-on they would read as long ruled diagonals). Drawn as soft,
   * tapered bands of light — wide halos and a gentle middle, no bright hairline — a luminous swell rather than a neon trace.
   */
  function drawCrests(g, now, rm) {
    traceCrests(now, rm);
    if (!cbCount) return;
    const lo = low() ? 0.6 : 1;
    // the idle sea's glimmer: soft light only, so it never reads as a drawn line
    if (cbHas[2]) { fillCrests(g, 2, 9, 0.035 * lo, C.crest); fillCrests(g, 2, 4, 0.06 * lo, C.crest); fillCrests(g, 2, 1.8, 0.08 * lo, C.crest2); }
    for (let grp = 0; grp < 2; grp++) {
      if (!cbHas[grp]) continue;
      const col = grp ? C.dawn : C.crest, core = grp ? C.cream : C.crest2;
      fillCrests(g, grp, 13, 0.035 * lo, col);
      fillCrests(g, grp, 7, 0.06 * lo, col);
      fillCrests(g, grp, 3.4, 0.09 * lo, col);
      fillCrests(g, grp, 1.6, (grp ? 0.16 : 0.13) * lo, core);
    }
    g.globalAlpha = 1;
  }
  const CR_PTS = 160, CR_MAX = 36, CR_COARSE = 40, CR_STEP = 4.5;
  const cbX = new Float32Array(CR_MAX * CR_PTS), cbY = new Float32Array(CR_MAX * CR_PTS), cbW = new Float32Array(CR_MAX * CR_PTS);
  const cbNX = new Float32Array(CR_MAX * CR_PTS), cbNY = new Float32Array(CR_MAX * CR_PTS), cbG = new Uint8Array(CR_MAX), cbClosed = new Uint8Array(CR_MAX), cbN = new Uint8Array(CR_MAX);
  const cbT = new Float32Array(CR_PTS);                   // scratch (smoothing)
  const CR_TAB = 64, crV = new Float32Array(CR_TAB + 1), crL = new Float32Array(CR_TAB + 1);   // scratch (v by screen length)
  const cbHas = [0, 0, 0];
  let cbCount = 0;
  const hl = { h: 0, dx: 0, dz: 0 };
  /** Find this frame's crest lines (into the cb* buffers; nothing allocated). */
  function traceCrests(now, rm) {
    cbCount = 0; cbHas[0] = cbHas[1] = cbHas[2] = 0;
    const amp = (rm ? 0.4 : 1) * (1 - 0.35 * mirrorK), lamMin = FLICK_U * U * 1.3, tt = rm ? 0 : now;
    for (let i = 0; i < sea.max && cbCount < CR_MAX; i++) {
      if (!sea.on[i] || sea.A[i] <= 0 || sea.lam[i] < lamMin) continue;
      const gold = sea.seed[i] && sea.free[i] && sea.age[i] < GOLD_SEC;
      // only the person's own swells on the water they can see (and their taps' rings), and the storm's lines, light up
      if (!gold && !(sea.user[i] && (sea.vis[i] || sea.ring[i]))) continue;
      const k = sea.k[i], A = Math.min(sea.A[i], sea.capA);
      const str = gold ? clamp(k * A * 8 * amp) * (1 - sea.age[i] / GOLD_SEC) : clamp(k * A * 3.4 * amp);
      if (str < 0.04) continue;
      const grp = gold ? 1 : 0;
      if (sea.ring[i]) {
        // a tap's ring of swells: its crests are circles about where it landed
        const front = sea.cg[i] * sea.age[i], sl = sea.sl[i], ph = sea.w[i] * sea.age[i];
        const nA = Math.ceil((k * Math.max(0, front - 2.2 * sl) - ph) / TAU), nB = Math.floor((k * (front + 2.2 * sl) - ph) / TAU);
        for (let n = nB; n >= nA && cbCount < CR_MAX; n--) {
          const r = (TAU * n + ph) / k;
          if (r <= 4) continue;
          const e = Math.exp(-0.5 * ((r - front) / sl) ** 2) * Math.sqrt(sea.lam[i] / (sea.lam[i] + r)) * str;
          if (e < 0.04) continue;
          traceRing(sea.ex[i], sea.ez[i], r, e, lamMin, amp);
        }
        continue;
      }
      const dx = sea.dx[i], dz = sea.dz[i], sl = sea.sl[i], sw = sea.sw[i];
      // (crests running off towards the vanishing point — a swell sent across the view — are seen end-on: no line light)
      const endOn = smoothstep(0.3, 0.72, Math.abs(dz));
      if (endOn * str < 0.04) continue;
      const run = sea.free[i] ? sea.cg[i] * sea.age[i] : 0;
      const cx = sea.ex[i] + dx * run, cz = sea.ez[i] + dz * run;
      const thc = k * ((cx - sea.ax[i]) * dx + (cz - sea.az[i]) * dz) - (sea.free[i] ? sea.w[i] * sea.age[i] : 0);
      // the crests within its envelope, nearest the centre first (θ(u) = θc + k·u = 2πn), three at most
      const n0 = Math.round(thc / TAU);
      for (let q = 0, made = 0; q < 7 && made < 3 && cbCount < CR_MAX; q++) {
        const n = n0 + (q % 2 ? (q + 1) >> 1 : -(q >> 1));
        const u = (TAU * n - thc) / k, eu = Math.exp(-0.5 * (u / sl) ** 2) * str * endOn;
        if (eu < 0.1) continue;
        made++;
        traceLine(i, cx + u * dx, cz + u * dz, -dz, dx, sw, eu, grp, k, lamMin, amp, tt);
      }
    }
    // the idle sea breathes: a faint glimmer that comes and goes along the crests of its own longest gentle swell
    const Z0 = cam.Z0, ambK = (1 - 0.7 * mirrorK) * (low() ? 0.5 : 1);
    for (let a = 0; a < 1 && a < sea.amb.length && cbCount < CR_MAX; a++) {
      const wv = sea.amb[a];
      if (wv.A <= 0 || wv.dz < 0.6) continue;
      const e = clamp(wv.k * wv.A * amp * 4) * ambK;
      if (e < 0.03) continue;
      // crests: x·dx + z·dz = (2πn + ω·t − φ)/k; on the line x = 0 that is z = c/dz, for depths −0.3·Z0 … 5·Z0
      const c0 = (wv.w * sea.time - wv.ph) / wv.k, lamA = TAU / wv.k;
      const nA = Math.ceil(((-0.3 * Z0) * wv.dz - c0) / lamA), nB = Math.floor((5 * Z0 * wv.dz - c0) / lamA);
      for (let n = nA, made = 0; n <= nB && made < 6 && cbCount < CR_MAX; n++, made++) {
        const z = (c0 + n * lamA) / wv.dz;
        traceLine(20 + a * 7 + (n & 7), 0, z, -wv.dz, wv.dx, 1000, e, 2, wv.k, lamMin, amp, tt, true);
      }
    }
  }
  /**
   * One point of a crest on the screen: the still water at (X, Z) lifted by the sea's longer waves there (its height
   * alone: no wake, no crest-sharpening shift — those only kink a line traced through them). Into so (x, y, s).
   */
  function crestPoint(X, Z, lamMin, amp) {
    Z = Math.max(Z, -0.8 * cam.Z0);
    sea.heightLong(X, Z, lamMin, hl);
    let h = hl.h * amp;
    if (hushD[0].on || hushD[1].on) h *= 1 - 0.5 * hushAt(X, Z);
    const s = cam.Z0 / (cam.Z0 + Z);
    so.x = W / 2 + X * s; so.y = Math.max(hyNow, hyNow + (cam.Hw - h) * s); so.s = s;
    return so;
  }
  /**
   * One crest line: base point (bx, bz), running along (px, pz) (unit, across the swell), envelope width sw, peak light
   * e. Only the part on screen is traced (a coarse pass finds it), at a point every CR_STEP px of screen length (evenly
   * spaced on the screen, not along the water: perspective crowds a line's far end and stretches its near end).
   */
  function traceLine(i, bx, bz, px, pz, sw, e, grp, k, lamMin, amp, tt, glim = false) {
    const Z0 = cam.Z0;
    let vA = Infinity, vB = -Infinity;
    for (let c = 0; c <= CR_COARSE; c++) {
      const v = (c / CR_COARSE - 0.5) * 4.8 * sw, Z = bz + v * pz;
      if (Z < -0.8 * Z0) continue;
      const s = Z0 / (Z0 + Z);
      if (s < 0.03) continue;                       // (on the horizon line itself there is nothing to see)
      const sx = W / 2 + (bx + v * px) * s;
      if (sx < -60 || sx > W + 60) continue;
      if (v < vA) vA = v;
      if (v > vB) vB = v;
    }
    if (!(vB > vA)) return;
    const pad = (4.8 * sw) / CR_COARSE;
    vA = Math.max(-2.4 * sw, vA - pad); vB = Math.min(2.4 * sw, vB + pad);
    // its screen length along the way (on the still water), to place the points evenly on the screen
    let len = 0, lx = 0, ly = 0;
    for (let c = 0; c <= CR_TAB; c++) {
      const v = vA + ((vB - vA) * c) / CR_TAB, Z = Math.max(bz + v * pz, -0.8 * Z0), s = Z0 / (Z0 + Z);
      const sx = W / 2 + (bx + v * px) * s, sy = hyNow + cam.Hw * s;
      if (c) len += Math.hypot(sx - lx, sy - ly);
      crV[c] = v; crL[c] = len; lx = sx; ly = sy;
    }
    if (!(len > 1)) return;
    const N = clamp(Math.round(len / CR_STEP) + 2, 8, CR_PTS);
    const o = cbCount * CR_PTS, Hw = cam.Hw, seed = i * 1.7;
    let peak = 0;
    for (let m = 0, c = 0; m < N; m++) {
      const L = (len * m) / (N - 1);
      while (c < CR_TAB - 1 && crL[c + 1] < L) c++;
      const dl = crL[c + 1] - crL[c], v = crV[c] + (crV[c + 1] - crV[c]) * (dl > 1e-6 ? clamp((L - crL[c]) / dl) : 0);
      crestPoint(bx + v * px, bz + v * pz, lamMin, amp);
      // light along the crest: the envelope, in slow patches anchored to the water (never dark between them)
      // (its light gathers towards the middle of the swell sooner than its height does: a crest glows where the swell
      // is, rather than ruling a bright line from edge to edge)
      const ev = glim ? 1 : Math.exp(-0.5 * (v / (0.6 * sw)) ** 2);
      const pt = 0.5 + 0.5 * Math.sin(v * k * 0.21 + seed + tt * 0.16) * Math.sin(v * k * 0.093 - tt * 0.11 + seed * 0.6);
      // (the idle sea's glimmer comes and goes along its crests; the person's crests stay whole bands)
      const patch = glim ? pt * pt * pt : 0.25 + 0.75 * pt * Math.sqrt(pt);
      // fainter far away, and gone where the crests would crowd together towards the horizon (no ruled lines there)
      const gap = TAU / k * so.s * Math.max(Math.abs(pz), (Math.abs(px) * Hw * so.s) / Z0);
      let w = e * ev * patch * smoothstep(0.05, 0.42, so.s) * (0.55 + 0.45 * clamp(so.s / 1.2)) * smoothstep(9, 28, gap);
      // (where its light is faint it is gone, rather than thinned to a hairline that reads as a ruled line)
      w *= smoothstep(0.06, 0.2, w);
      cbX[o + m] = so.x; cbY[o + m] = so.y; cbW[o + m] = w;
      if (w > peak) peak = w;
    }
    if (peak < 0.03) return;
    smoothCrest(o, N, false);
    // taper both ends to nothing (the visible part may start mid-envelope at a screen edge: it is off screen there)
    cbW[o] = 0; cbW[o + N - 1] = 0;
    finishCrest(grp, 0, N);
  }
  /** One ring crest (radius r about a tap at x, z): a closed line of even light e. */
  function traceRing(x, z, r, e, lamMin, amp) {
    const o = cbCount * CR_PTS, N = 48;
    let on = 0;
    for (let m = 0; m < N; m++) {
      const a = (m / N) * TAU;
      crestPoint(x + r * Math.cos(a), z + r * Math.sin(a), lamMin, amp);
      cbX[o + m] = so.x; cbY[o + m] = so.y; cbW[o + m] = e * (0.3 + 0.7 * clamp(so.s / 1.2)) * 0.7;
      if (so.x > -20 && so.x < W + 20) on++;
    }
    if (!on) return;
    smoothCrest(o, N, true);
    finishCrest(0, 1, N);
  }
  /**
   * Smooth a traced crest: two [1, 2, 1] passes on its points (its ends stay put on an open line), then its light thinned
   * to nothing wherever the line still turns by more than ~25° from one point to the next, and eased along its length.
   */
  function smoothCrest(o, N, closed) {
    for (let pass = 0; pass < 4; pass++) {
      const A = pass & 1 ? cbY : cbX;
      for (let m = 0; m < N; m++) cbT[m] = A[o + m];
      for (let m = closed ? 0 : 1; m < (closed ? N : N - 1); m++) A[o + m] = 0.25 * cbT[(m + N - 1) % N] + 0.5 * cbT[m] + 0.25 * cbT[(m + 1) % N];
    }
    for (let m = closed ? 0 : 1; m < (closed ? N : N - 1); m++) {
      const a = o + ((m + N - 1) % N), b = o + m, c = o + ((m + 1) % N);
      const ux = cbX[b] - cbX[a], uy = cbY[b] - cbY[a], vx = cbX[c] - cbX[b], vy = cbY[c] - cbY[b];
      const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
      if (lu < 0.5 || lv < 0.5) continue;
      const cos = (ux * vx + uy * vy) / (lu * lv);           // cos 25° = 0.906, cos 45° = 0.707
      if (cos < 0.906) cbW[b] *= smoothstep(0.707, 0.906, cos);
    }
    for (let m = 0; m < N; m++) cbT[m] = cbW[o + m];
    for (let m = closed ? 0 : 1; m < (closed ? N : N - 1); m++) cbW[o + m] = Math.min(cbT[m], 0.25 * cbT[(m + N - 1) % N] + 0.5 * cbT[m] + 0.25 * cbT[(m + 1) % N]);
  }
  /** Normals for the ribbon, and keep the crest. */
  function finishCrest(grp, closed, n) {
    const o = cbCount * CR_PTS;
    for (let m = 0; m < n; m++) {
      const a = closed ? (m + n - 1) % n : Math.max(0, m - 1), b = closed ? (m + 1) % n : Math.min(n - 1, m + 1);
      const tx = cbX[o + b] - cbX[o + a], ty = cbY[o + b] - cbY[o + a], tl = Math.hypot(tx, ty) || 1;
      cbNX[o + m] = -ty / tl; cbNY[o + m] = tx / tl;
    }
    cbG[cbCount] = grp; cbClosed[cbCount] = closed; cbN[cbCount] = n; cbHas[grp] = 1;
    cbCount++;
  }
  /**
   * Fill every crest of a group as a ribbon of half-width w·halfW (one path, one fill), each edge drawn as quadratic curves
   * through the midpoints of its points: smooth, with no corners anywhere.
   */
  function fillCrests(g, grp, halfW, alpha, colour) {
    g.beginPath();
    for (let c = 0; c < cbCount; c++) {
      if (cbG[c] !== grp) continue;
      const o = c * CR_PTS, n = cbN[c];
      const ex = (m, sgn) => cbX[o + m] + sgn * cbNX[o + m] * cbW[o + m] * halfW, ey = (m, sgn) => cbY[o + m] + sgn * cbNY[o + m] * cbW[o + m] * halfW;
      if (cbClosed[c]) {
        // a ring: outer edge round, inner edge back (each a closed curve through its midpoints)
        for (const sgn of [1, -1]) {
          const j = (m) => (sgn > 0 ? m % n : (n - (m % n)) % n);
          g.moveTo((ex(j(0), sgn) + ex(j(1), sgn)) / 2, (ey(j(0), sgn) + ey(j(1), sgn)) / 2);
          for (let m = 1; m <= n; m++) { const a = j(m), b = j(m + 1); g.quadraticCurveTo(ex(a, sgn), ey(a, sgn), (ex(a, sgn) + ex(b, sgn)) / 2, (ey(a, sgn) + ey(b, sgn)) / 2); }
          g.closePath();
        }
        continue;
      }
      g.moveTo(cbX[o], cbY[o]);
      for (let m = 1; m < n - 1; m++) g.quadraticCurveTo(ex(m, 1), ey(m, 1), (ex(m, 1) + ex(m + 1, 1)) / 2, (ey(m, 1) + ey(m + 1, 1)) / 2);
      g.lineTo(cbX[o + n - 1], cbY[o + n - 1]);
      for (let m = n - 2; m > 0; m--) g.quadraticCurveTo(ex(m, -1), ey(m, -1), (ex(m, -1) + ex(m - 1, -1)) / 2, (ey(m, -1) + ey(m - 1, -1)) / 2);
      g.closePath();
    }
    g.globalAlpha = alpha; g.fillStyle = colour; g.fill('nonzero');
  }

  /** The dawn's glitter (jittered, twinkling points on the path and on facets that catch it) and soft glows at the brightest crests. */
  function drawSparkles(g, now, rm) {
    const n = rowsN;
    let gl = 0, gw = 0, gg = 0;
    const still = rm || low();
    const tick = still ? 0 : Math.floor(now * 5);
    for (let j = 2; j < n && (gl < 150 || gw < 60 || gg < 24); j++) {
      const sN = clamp(rS[j] / 1.2), o = j * COLS;
      const cw = colStep * 0.5, rh = j < n - 1 ? (rY[j + 1] - rY[j]) * 0.5 : 4;
      for (let c = 1; c < COLS - 1; c++) {
        const q = o + c;
        const pv = gPath[q] + gSpec[q] * 1.5;
        if (pv > 0.02 && gl < 150) {
          // two candidate sparkles a cell, each lit on its own beat
          for (let e = 0; e < 2; e++) {
            const h1 = ((q * 2654435761 + e * 97 + tick * 40503) >>> 0) / 4294967296;
            if (h1 > pv * 1.6) continue;
            const h2 = ((q * 1597334677 + e * 31) >>> 0) / 4294967296, h3 = ((q * 3812015801 + e * 7) >>> 0) / 4294967296;
            const x = gSX[q] + (h2 - 0.5) * 2 * cw, y = gSY[q] + (h3 - 0.5) * 2 * rh;
            const a = clamp(0.25 + pv) * (still ? 0.7 : 0.55 + 0.45 * Math.sin(now * 3.1 + h2 * 40));
            const r = 1.2 + 3.2 * sN + 2.5 * clamp(pv);
            g.globalAlpha = a * 0.85;
            g.drawImage(pv > 0.55 && h1 < 0.12 ? sprites.glint : sprites.dawn, x - r, y - r * 0.7, r * 2, r * 1.4);
            gl++;
          }
        }
        // slow, sparse glints where the idle sea's swells meet (each fades in and out over seconds; none under reduced motion)
        const gm = gGlim[q];
        if (gm > 0.3 && !rm && gg < 24) {
          const h1 = ((q * 2246822519) >>> 0) / 4294967296;
          if (h1 < 0.2) {
            const tw = Math.sin(now * (0.33 + 0.3 * h1) + h1 * 60);
            if (tw > 0.55) { const r = 1.3 + 2.4 * sN, a = gm * ((tw - 0.55) / 0.45) ** 2 * (low() ? 0.3 : 0.55); g.globalAlpha = a; g.drawImage(sprites.glintC, gSX[q] - r, gSY[q] - r * 0.7, r * 2, r * 1.4); gg++; }
          }
        }
        const cr = gCrest[q];
        if (cr > 0.45 && cr >= gCrest[q - 1] && cr >= gCrest[q + 1] && gw < 60) {
          const r = 6 + 18 * sN;
          g.globalAlpha = 0.24 * cr * (low() ? 0.5 : 1); g.drawImage(sprites.crestSoft, gSX[q] - r, gSY[q] - r * 0.45, r * 2, r * 0.9); gw++;
        }
      }
    }
    g.globalAlpha = 1;
  }

  function drawFront(now, rm) {
    const F = ctx.front, g = F.g, d = F.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.setTransform(d, 0, 0, d, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // floaters, far to near (the thought among the bubbles by depth)
    order.length = 0;
    for (const b of bubbles) order.push(b);
    if (thought) order.push(tS);
    order.sort(byDepth);
    // (a bubble that is on the thought all the same is drawn under it: the person's thought is never hidden)
    if (thought) { let ti = order.indexOf(tS); for (let k = ti + 1; k < order.length; k++) if (order[k].overT) { const o = order.splice(k, 1)[0]; order.splice(ti, 0, o); ti++; } }
    g.globalCompositeOperation = 'lighter';
    rings.draw(g);
    g.globalCompositeOperation = 'source-over';
    for (const o of order) { if (o === tS) drawThought(g, now, rm); else drawBubble(g, o, now, rm); }
    drawLip(g, now, rm);
    // fingertips: a soft cyan light; the hush, a calm disc of mirror with a faint rim
    g.globalCompositeOperation = 'lighter';
    for (const f of fingers) {
      if (f.hush > 0.01) {
        const s = Math.max(0.05, (f.hushY - cam.hy) / cam.Hw), asp = clamp(s * cam.Hw / cam.Z0, 0.2, 1);
        const r = (0.08 + 0.14 * easeOut(f.hush)) * U;
        g.globalAlpha = 0.16 * f.hush; g.drawImage(sprites.crestSoft, f.hushX - r, f.hushY - r * asp, r * 2, r * 2 * asp);
        g.globalAlpha = 0.32 * f.hush; g.strokeStyle = C.crest2; g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(f.hushX, f.hushY, r, r * asp, 0, 0, TAU); g.stroke();
      }
      if (!f.on) continue;
      // a finger in the sky: the water's edge brightens softly right below it (here is where the sea begins)
      if (f.y < hyNow + WATER_PAD) {
        const a = clamp((hyNow + WATER_PAD - f.y) / 40, 0.35, 1) * 0.4;
        g.globalAlpha = a; g.drawImage(sprites.crestSoft, f.x - 46, hyNow - 4, 92, 14);
        g.globalAlpha = a * 0.8; g.drawImage(sprites.white, f.x - 14, hyNow - 1.5, 28, 5);
      }
      const r = 18 + 10 * clamp(f.speed / U);
      g.globalAlpha = 0.32; g.drawImage(sprites.crestSoft, f.x - r, f.y - r, r * 2, r * 2);
      g.globalAlpha = 0.5; g.drawImage(sprites.white, f.x - 8, f.y - 8, 16, 16);
    }
    g.globalAlpha = 1;
    drawHint(g, now, rm);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  const order = [];
  const byDepth = (a, b) => b.z - a.z;

  function drawThought(g, now, rm) {
    const A = tS.alpha * tS.vis;
    if (!thought || A <= 0.01) return;
    const x = tS.sx, y = tS.sy, rr = tS.r * tS.surf;
    // a ring of water where it floats, and a soft light so a far thought is still seen
    const wy = y + rr * 0.55, s = Math.max(0.05, (wy - cam.hy) / cam.Hw), asp = clamp(s * cam.Hw / cam.Z0, 0.16, 0.7);
    if (tS.landK >= 1) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.25 * A; g.strokeStyle = C.crest2; g.lineWidth = 1;
      g.beginPath(); g.ellipse(x, wy, rr * 1.15, rr * 1.15 * asp, 0, 0, TAU); g.stroke();
      const far = smoothstep(2, OCEAN.CAP, tS.z / cam.Z0);
      if (far > 0.02) { const hr = rr * 3.4 + 8; g.globalAlpha = 0.3 * far * A; g.drawImage(sprites.warm, x - hr, y - hr, hr * 2, hr * 2); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    if (thought.draw) {
      try {
        const la = tS.labelFade >= 0 ? Math.pow(Math.abs(1 - 2 * tS.labelFade), 1.6) : 1;
        thought.draw(g, x, y, tS.surf, { radius: tS.r, tension: tS.tension, calm: tS.calm, charge: 0, reduced: rm, now, minX: OCEAN.EDGE, maxX: freeRight() - OCEAN.EDGE, labelWidth: tS.labelW || plan.textMax, labelLines: plateLines, labelY: tS.labelY, labelX: tS.labelX, alpha: A, labelAlpha: la });
        if (thought.plate) { tS.plateW = thought.plate.w; tS.plateH = thought.plate.h; }
      } catch { /* placeholder only */ }
    }
  }

  function drawBubble(g, b, now, rm) {
    // (dimmed while it is on the thought: it is under it, and the thought reads through it)
    b.dimK = (b.dimK ?? 1) + ((b.overT ? 0.35 : 1) - (b.dimK ?? 1)) * 0.2;
    if (b.alpha <= 0.01 || !photos) return;
    const a0 = b.alpha;
    b.alpha *= b.dimK;
    try { drawBubbleAt(g, b, now, rm); } finally { b.alpha = a0; }
  }
  function drawBubbleAt(g, b, now, rm) {
    const x = b.sx, y = b.sy, D = b.D;
    // the postcard (from the storm) turning into a bubble, in place
    if (b.from && b.morph < 1) {
      const k = b.morph, size = lerp(b.from.size, D, easeInOut(k));
      const cx = x, cy = y;
      if (k < 1) photos.draw(g, b.i, cx, cy, size, { shape: 'card', rot: b.from.rot * (1 - k), alpha: b.alpha * (1 - k), shadow: false, glow: 0.3 * (1 - k), glowColour: C.dawn });
      if (k > 0) {
        photos.draw(g, b.i, cx, cy, size * (0.92 + 0.08 * k), { shape: 'bubble', sheen: false, shadow: false, alpha: b.alpha * k });
        g.globalAlpha = b.alpha * k; g.drawImage(film, cx - size / 2, cy - size / 2, size, size); g.globalAlpha = 1;
      }
      return;
    }
    const wy = y + D * 0.32, s = Math.max(0.05, (wy - cam.hy) / cam.Hw), asp = clamp(s * cam.Hw / cam.Z0, 0.16, 0.7);
    const fl = b.glowAge >= 0 ? flashEnv(b.glowAge, 0.32, 0.4, 1.6) : 0;
    g.globalCompositeOperation = 'lighter';
    // its ring on the water (not while it is still gliding down to it) and a little reflected light
    if (!b.from) { g.globalAlpha = 0.22 * b.alpha; g.strokeStyle = C.crest2; g.lineWidth = 1; g.beginPath(); g.ellipse(x, wy, D * 0.5, D * 0.5 * asp, 0, 0, TAU); g.stroke(); }
    if (fl > 0 || b.lift > 0) { const hr = D * (0.9 + 0.4 * fl); g.globalAlpha = (0.35 * fl + 0.2 * b.lift) * b.alpha; g.drawImage(sprites.warm, x - hr, y - hr, hr * 2, hr * 2); }
    g.globalCompositeOperation = 'source-over';
    // a little deep water behind it, so the person's picture reads against the dawn's glare and the crest light
    g.globalAlpha = b.alpha * (0.55 + 0.35 * smoothstep(3, OCEAN.CAP, b.z / cam.Z0)); g.drawImage(sprites.shade, x - D * 0.66, y - D * 0.66, D * 1.32, D * 1.32);
    photos.draw(g, b.i, x, y, D, { shape: 'bubble', sheen: false, shadow: false, alpha: b.alpha, rot: b.rot, glow: 0.2 * fl, glowColour: C.dawn });
    g.globalAlpha = b.alpha; g.drawImage(film, x - D / 2, y - D / 2, D, D); g.globalAlpha = 1;
  }

  /**
   * A thin, translucent lip of luminous water across the hero's lowest tenth. The waterline is the sea's
   * own (it rides the waves, the body bobs through it) but stays within 1.5–12 % of the body's height; the
   * part below it is clipped to the body's silhouette (a rounded superellipse inscribed in its art box)
   * and fades into the water's colour, never a dark band; a bright meniscus follows the wave across it.
   */
  function drawLip(g, now, rm) {
    if (!hero.ok || hero.floatK <= 0.01) return;
    const w = hero.right - hero.left, cx = (hero.left + hero.right) / 2, k0 = hero.floatK;
    // (down to the art's own bottom: the body box hugs the drawing, so the water's tint reaches its base — no dry stripe)
    const top = hero.top, base = hero.liveBottom - ART_BOTTOM * hero.h, artH = Math.max(20, base - top);
    // (a little inside the art's own outline, so the tint never spills onto the water round it)
    const rx = w * 0.455, ry = artH / 2 - 0.5, cyE = top + artH / 2;
    const wl = heroWater(), yHi = base - 0.12 * artH, yLo = base - 0.015 * artH;
    // the silhouette's half-width at a height (superellipse, n = 3.2)
    const half = (y) => { const v = Math.min(1, Math.abs((y - cyE) / ry)); return rx * Math.pow(Math.max(0, 1 - v ** 3.2), 1 / 3.2); };
    // the waterline across the body, where it meets the silhouette
    const N = LIP_N, pts = lipPts, xs = lipXs;
    const y0 = clamp(wl, yHi, yLo), hw = Math.max(4, half(y0));
    let wMin = Infinity;
    for (let k = 0; k <= N; k++) {
      const x = cx - hw + (2 * hw * k) / N;
      unproject(cam, x, wl, wo);
      sea.sample(wo.x, wo.z, sm);
      const h = sm.h * (rm ? 0.4 : 1) * (1 - 0.35 * mirrorK);
      xs[k] = x;
      pts[k] = clamp(wl - h * wo.s * 0.6 + (wake ? wake.at(x, wl) * 3 : 0), yHi, yLo);
      if (pts[k] < wMin) wMin = pts[k];
    }
    lipStat.under = (base - wMin) / artH; lipStat.halfW = hw; lipStat.bodyHalfW = w / 2;
    // the submerged part: clipped to the body, the water's own colour deepening downwards
    g.save();
    g.beginPath();
    for (let k = 0; k <= LIP_S; k++) {
      const t = (k / LIP_S) * TAU, c = Math.cos(t), s = Math.sin(t);
      const px = cx + rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3.2), py = cyE + ry * Math.sign(s) * Math.pow(Math.abs(s), 2 / 3.2);
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath(); g.clip();
    g.beginPath(); g.moveTo(xs[0] - 6, pts[0]);
    for (let k = 0; k <= N; k++) g.lineTo(xs[k], pts[k]);
    g.lineTo(xs[N] + 6, pts[N]); g.lineTo(cx + rx + 2, base); g.lineTo(cx - rx - 2, base); g.closePath();
    g.clip();
    g.globalAlpha = k0 * (low() ? 0.8 : 1);
    g.drawImage(lipSpr(), cx - rx - 2, wMin - 1, 2 * rx + 4, Math.max(4, base - wMin + 1));
    g.restore();
    // the meniscus: a bright line where water meets the Mallow, following the wave — one tapered ribbon, brightest in the
    // middle and thinning to nothing at the body's edges (never a run of separate dashes)
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = C.crest2;
    for (let pass = 0; pass < 2; pass++) {
      const hwP = pass ? 0.7 : 2.6;
      g.beginPath(); g.moveTo(xs[0], pts[0]);
      for (let k = 1; k < N; k++) { const f = Math.sin((k / N) * Math.PI); g.lineTo(xs[k], pts[k] - hwP * f * f); }
      g.lineTo(xs[N], pts[N]);
      for (let k = N - 1; k > 0; k--) { const f = Math.sin((k / N) * Math.PI); g.lineTo(xs[k], pts[k] + hwP * f * f); }
      g.closePath();
      g.globalAlpha = (pass ? 0.5 : 0.11) * k0; g.fill();
    }
    // a soft ring of water round the body, flattened by the view
    const s = Math.max(0.05, (wl - cam.hy) / cam.Hw), asp = clamp(s * cam.Hw / cam.Z0, 0.16, 0.7), rr = rx + 16;
    g.globalAlpha = 0.14 * k0; g.strokeStyle = C.crest; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(cx, y0 + 3, rr, rr * asp * 0.5, 0, 0.08 * Math.PI, 0.92 * Math.PI); g.stroke();
    g.restore();
  }
  const LIP_N = 12, LIP_S = 28;
  const lipStat = { under: 0, halfW: 0, bodyHalfW: 0 };     // (QA: how much of the body is under the waterline, and how wide the lip is)
  const lipPts = new Float32Array(LIP_N + 1), lipXs = new Float32Array(LIP_N + 1);
  let lipC = null;
  /** The submerged part's tint: the deep water's colour, clear at the waterline and deepening downwards (one cached strip). */
  function lipSpr() {
    if (lipC) return lipC;
    lipC = makeCanvas(4, 64);
    const lg = lipC.getContext('2d'), gr = lg.createLinearGradient(0, 0, 0, 64);
    // (clear at the waterline, deepening, then easing off at the very base so its edge melts into the water's colour)
    gr.addColorStop(0, 'rgba(40,150,170,0.10)'); gr.addColorStop(0.3, 'rgba(22,104,128,0.3)'); gr.addColorStop(0.82, 'rgba(12,70,92,0.46)'); gr.addColorStop(1, 'rgba(10,58,78,0.3)');
    lg.fillStyle = gr; lg.fillRect(0, 0, 4, 64);
    return lipC;
  }

  function drawHint(g, now, rm) {
    if (hint.age < 0) return;
    const a = hint.age / HINT_SEC;
    const fade = rm ? clamp(Math.min(hint.age / 0.6, (HINT_SEC - hint.age) / 0.6)) : Math.sin(clamp(a) * Math.PI);
    const head = rm ? 1 : easeInOut(clamp(hint.age / 3));
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = C.crest2; g.lineCap = 'round'; g.lineWidth = rm ? 3 : 2.6; g.globalAlpha = (rm ? 0.55 : 0.4) * fade;
    if (rm) g.setLineDash([0.5, 9]);
    g.beginPath();
    for (let k = 0; k <= 24; k++) { const u = (k / 24) * head; const x = lerp(hint.x0, hint.x1, u) + Math.sin(u * Math.PI) * 6, y = lerp(hint.y0, hint.y1, u); k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    if (rm) g.setLineDash([]);
    const hx = lerp(hint.x0, hint.x1, head) + Math.sin(head * Math.PI) * 6, hy2 = lerp(hint.y0, hint.y1, head);
    g.globalAlpha = 0.55 * fade; g.drawImage(sprites.white, hx - 14, hy2 - 14, 28, 28);
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------ audio + Mallow --
  function audioAndMallow(dt, now) {
    if (!entered) return;
    holdClock += dt;
    if (holdClock > 1 / 12) {
      holdClock = 0;
      const e = clamp(metricsCache.energy / 900), per = metricsCache.period;
      holds.hum?.update({ intensity: clamp(0.04 + 0.22 * e) * (1 - outroK), pitch: clamp(0.9 - 0.04 * per, 0.55, 0.9) });
    }
    ambClock += dt;
    if (ambClock > 0.5) { ambClock = 0; ctx.ambienceMood({ agitation: clamp(metricsCache.chop * 4), clarity: clamp(0.4 + 0.5 * dawnK), heaviness: 0, warmth: clamp(0.3 + 0.5 * dawnK) }); }
    // Loomi: calm, sleepier as the swells lengthen, curious in chop
    if (mallow && now - emoAt > 0.7) {
      const per = clamp((metricsCache.period - 1.5) / 5), chop = clamp(metricsCache.chop * 5), dist = thought ? clamp((tS.z / cam.Z0 - 1) / 3) : 0;
      const mix = { calm: 0.35 + 0.4 * per + 0.15 * mirrorK, curious: 0.3 * chop + 0.12 * (1 - per), relieved: 0.2 * dist, happy: 0.12 + 0.1 * dist, comforted: 0.1 * per };
      const key = Object.values(mix).map((v) => Math.round(v * 10)).join(',');
      if (key !== emoKey) { emoKey = key; emoAt = now; try { mallow.setEmotion?.(mix, 0.6, { quiet: true }); } catch { /* optional */ } }
    }
    // Loomi watches the finger, else the thought
    if (mallow?.lookAt && hero.ok) {
      const f = fingers.find((q) => q.on);
      const tx = f ? f.x : thought ? tS.sx : null, ty = f ? f.y : thought ? tS.sy : null;
      if (tx != null && (f || ((now * 10) | 0) % 6 === 0)) { const cy = hero.top + 0.4 * hero.h; try { mallow.lookAt(clamp((tx - hero.cx) / (W * 0.5), -1, 1), clamp((ty - cy) / (H * 0.5), -1, 1)); } catch { /* optional */ } }
    }
  }

  function say(lines) { if (lines && !paused) ctx.say(lines, { who: 'loomi', kind: 'dialogue' }); }
  /** The sea's line for a moment: in a gentle session its gentle one where it has one (null: nothing said). */
  function line(k) {
    const d = ctx.entry.dialogue || {};
    return ctx.gentle && d.gentle && k in d.gentle ? d.gentle[k] : d[k];
  }

  function fireDiscovery(ev) {
    if (discovered.has(ev.id)) return;
    discovered.add(ev.id);
    try { mallow?.react?.('nod'); } catch { /* optional */ }
    ctx.sound('chime', { intensity: 0.3 });
    // a soft bloom (photosafe rise) where it happened
    if (ev.id === 'distance' && thought) rings.add(tS.sx, tS.sy + tS.r * tS.surf * 0.55, 8, U * 0.32, 2.6, 0.32, C.dawn, 0.45, 1.6);
    else rings.add(W / 2, (cam.hy + cam.homeY) / 2, 10, U * 0.5, 2.6, 0.3, C.crest2, 0.38, 1.6);
    ctx.discover(ev.id, ev.evidence);
  }

  function finishSea() {
    complete = true; completeAt = elapsed;
    settle = 6;                              // the swells settle to a mirror (×3 damping for a while)
    try { mallow?.react?.('sigh'); } catch { /* optional */ }
    ctx.sound('bloom', { intensity: 0.32 });
  }

  // --------------------------------------------------------------- api --
  const api = {
    prepare,
    get backCanvas() { return ctx.back.canvas; },
    enter({ from, handoff } = {}) {
      entered = true;
      const rm = reduced();
      // (a cold start re-plans against where the shell has put the hero by now: prepare() may have run before it moved)
      if (!prepared || !(handoff && from)) layout(true);
      if (handoff && from) {
        // melting in: start on the outgoing world's horizon, its things where they were
        melt = { k: 0, hy0: rm ? hyTarget : clamp(handoff.horizonY ?? H * 0.655, hyTarget, H * 0.85), riseAt: -1, riseSec: RISE_SEC, endAt: null, lin: null, rate: 0, f: 1 };
        hyNow = melt.hy0; fitCamera(cam, hyNow);
        hero.floatK = 0;
        // the storm's grounded ground lines become the first gentle swells, rolling away
        seedSwells(handoff.seeds || []);
        // (the words plate the outgoing world asked W2's layer for: kept while the words stay as it showed them)
        heldFit = thought?.labelFit && thought.labelFit.lines > 0 ? thought.labelFit : null;
        if (thought) {
          thoughtHome();
          const th = handoff.thought;
          const ok = th && Number.isFinite(th.x) && Number.isFinite(th.y);
          if (ok && !rm) {
            tS.from = { x: th.x, y: th.y, scale: ((th.r || tS.r) * (th.scale ?? 1)) / tS.r, labelW: th.labelW || plan.textMax };
            tS.landK = 0; tS.glide = 0; tS.alpha = 1; tS.landed = false; tS.sx = th.x; tS.sy = th.y; tS.surf = tS.from.scale;
            // its words stay as the storm showed them (under it) until it settles on the water
            tS.side = 'below'; tS.labelX = tS.labelXT = 0;
            tS.labelY = tS.labelYT = (th.r || tS.r) * (th.scale ?? 1) * 0.98 + 8; tS.labelW = tS.from.labelW;
          } else {
            tS.from = null; tS.landK = 1; tS.alpha = 0;
            // reduced motion: the storm's thought fades where it hung, then the ocean's at home (never both at once)
            if (ok && rm) { melt.rmFrom = { x: th.x, y: th.y, scale: ((th.r || tS.r) * (th.scale ?? 1)) / tS.r }; tS.alpha = 1; tS.vis = 1; }
          }
          // its own tension, from the storm (a settled thought stays settled-looking); only the person's sea changes it from here
          captureBase(handoff.thought?.tension);
          tS.tension = baseTension;
        }
        initBubbles(rm ? null : (handoff.photos || []).map((p) => ({ ...p })), thought && tS.from ? { x: tS.from.x, y: tS.from.y, scale: tS.from.scale } : null);
        if (rm) for (const b of bubbles) { b.state = 'rise'; b.riseK = 0; }
      } else {
        // a cold start: the sea is already here; the thought surfaces at home, bubbles rise
        hero.floatK = 0;
        if (thought) {
          const keep = restored?.thought ? { x: tS.x, z: tS.z } : null;
          thoughtHome(); tS.from = null; tS.landK = 1; tS.alpha = 0; tS.rmCold = null;
          if (keep) { tS.x = keep.x; tS.z = keep.z; }       // resumed: it is where it was left
          // (the person's thought already on screen, beside their Mallow: it arrives from there)
          arrive(!!keep);
        }
        initBubbles(null);
        if (restored?.photos) for (const ps of restored.photos) { const b = bubbles.find((q) => q.i === ps.i); if (b) { b.z = clamp(+ps.d || 1, -0.5, OCEAN.CAP) * cam.Z0; b.x = +ps.x || b.x; b.cap = 400; } }
        bubbles.forEach((b, k) => { b.riseK = -0.35 * k; });
        seedSwells([]);
        if (thought && baseTension == null) captureBase(restored?.base);
        if (thought) tS.tension = baseTension;
        // (a resumed sea does not introduce itself again)
        introAt = restored ? -1 : 2.6;
      }
      // a thought already on screen (W2's ThoughtLayer, fully appeared) only notices the sea; a new one appears
      if (!(handoff && from)) { try { thought?.react?.(thought?.ov?.appear >= 1 ? 'notice' : 'appear'); } catch { /* optional */ } }
    },
    frame,
    pointer,
    get metrics() {
      const f0 = fingers.find((f) => f.on);
      return {
        speedU: f0 ? f0.speed / U : 0, period: metricsCache.period, energy: metricsCache.energy, chop: metricsCache.chop,
        packets: sea.active, dist: thought ? tS.z / (cam?.Z0 || 1) : null, distP: thought ? tS.dP : null, long: prog.long, progress: api.progress,
        hush: Math.max(...fingers.map((f) => f.hush)), bubbles: bubbles.length, waiting: waiting.length, calm: 1 - clamp(metricsCache.chop * 5),
        driftGain, horizon: hyNow, longPending: longD.pending, share: distD.share,
        swells: metricsCache.swells || 0, played: firstTouchAt >= 0 ? elapsed - firstTouchAt : 0, capD, words: tS.side, tension: thought ? tS.tension : null, base: baseTension,
      };
    },
    get progress() { return complete ? 1 : lastP; },
    get complete() { return complete; },
    intro(k) { if (melt) melt.k = k; },
    outro(k) { outroK = k; sea.damp = 1 + 2 * k; },
    handoff() {
      return {
        horizonY: hyNow, palette: { sky: '#0a3f55', deep: '#062433', warm: '#ffd98a' }, seeds: [],
        thought: thought ? { x: tS.sx, y: tS.sy, scale: tS.surf, tension: tS.tension } : null,
        photos: bubbles.filter((b) => b.alpha > 0.5).map((b) => ({ i: b.i, x: b.sx, y: b.sy, w: b.D, h: b.D, rot: b.rot, state: 'floating', shape: 'bubble' })),
        energy: clamp(metricsCache.energy / 900),
      };
    },
    pause() { paused = true; holds.hum?.stop(); holds.hum = null; for (const f of fingers) { if (f.slot >= 0) releaseStroke(f); f.on = false; } },
    resume() { paused = false; },
    /** The person named another feeling: the sea's background wind follows it (never progress). */
    setEmotion(id, i) {
      const k = Number.isFinite(i) ? clamp(i) : intensity;
      const t = 0.2 + 0.35 * k + (id === 'angry' || id === 'anxious' || id === 'restless' ? 0.1 : 0);
      const d = ctx.entry.dialogue?.feeling || {};
      const lines = t > windT + 0.04 ? d.more : t < windT - 0.04 ? d.less : d.other;
      windT = t;
      try { mallow?.react?.('nod'); } catch { /* optional */ }
      if (lines && !paused) { introAt = -1; say(lines); }
    },
    setThought(h) {
      const had = !!thought;
      // (the thought it no longer drives keeps no plate of this world's)
      if (thought && thought !== h) { try { if (thought.labelFit && (thought.labelFit === wordsFit || thought.labelFit === heldFit)) thought.labelFit = null; } catch { /* */ } heldFit = null; }
      thought = h;
      if (prepared) layout(false);
      if (h && !had && cam) {
        thoughtHome(); tS.from = null; tS.landK = 1; tS.alpha = 0; captureBase(); tS.tension = baseTension;
        // (a thought that comes to a playing sea — the world's first, or new words — arrives from where it is drawn)
        if (entered && !melt) arrive(false);
      }
    },
    /** Client rects to keep subtitles off: the thought with its words, the bubbles, fingers outside the band. */
    avoid() {
      const out = [];
      const band = ctx.band;
      if (thought && tS.alpha > 0.1) {
        const rr = tS.r * tS.surf;
        out.push({ x: tS.sx - rr - 4, y: tS.sy - rr - 4, w: 2 * rr + 8, h: 2 * rr + 8, kind: 'thought' });
        if (tS.plateW) { const P = plateRect(); out.push({ x: P.x0, y: P.y0, w: P.x1 - P.x0, h: P.y1 - P.y0, kind: 'thought' }); }
      }
      for (const b of bubbles) if (b.alpha > 0.1 && !b.away) out.push({ x: b.sx - b.D / 2 - 4, y: b.sy - b.D / 2 - 4, w: b.D + 8, h: b.D + 8, kind: 'bubble' });
      for (const f of fingers) if (f.on && !(band && f.y < band.y + band.h)) out.push({ x: f.x - 60, y: f.y - 60, w: 120, h: 120, kind: 'finger' });
      return out;
    },
    subtitleBand() { const b = ctx.band; return b ? { x: b.x, y: b.y, w: b.w, h: b.h } : null; },
    serialize() {
      return {
        v: 1, seed: ctx.seed, progress: Math.round(api.progress * 1000) / 1000, complete, discoveries: [...discovered], prog: prog.snapshot(),
        thought: thought ? { d: Math.round((tS.z / cam.Z0) * 100) / 100, p: Math.round(tS.dP * 100) / 100, x: Math.round(tS.x), base: Math.round((baseTension ?? 0.5) * 100) / 100, relief: Math.round(relief * 100) / 100 } : null,
        photoState: bubbles.map((b) => ({ i: b.i, d: Math.round((b.z / cam.Z0) * 100) / 100, x: Math.round(b.x) })), elapsed: Math.round(elapsed),
      };
    },
    restore(s) {
      if (!s || s.v !== 1) return false;
      if (!plan) layout(true);
      for (const id of s.discoveries || []) { discovered.add(id); if (id === 'long-waves') longD.markFired(); if (id === 'distance') distD.markFired(); }
      prog.restore(s.prog);
      if (s.complete) { complete = true; completeAt = 0; mirrorK = 1; dawnK = dawnT = 1; }
      if (s.thought && thought) {
        tS.z = clamp(+s.thought.d || 1, 1, capD) * cam.Z0; tS.x = +s.thought.x || 0; tS.dP = clamp(+s.thought.p || +s.thought.d || 1, 1, tS.z / cam.Z0);
        if (Number.isFinite(+s.thought.base) && s.thought.base > 0) { baseTension = clamp(+s.thought.base, 0.2, 0.9); relief = clamp(+s.thought.relief || 0, 0, 0.6); }
      }
      for (const ps of s.photoState || []) { const b = bubbles.find((q) => q.i === ps.i); if (b) { b.z = clamp(+ps.d || 1, -0.5, OCEAN.CAP) * cam.Z0; b.x = +ps.x || b.x; } }
      // (restored before enter(): enter keeps these instead of starting everything at home)
      restored = { thought: !!(s.thought && thought), photos: (s.photoState || []).slice(0, 7), base: baseTension };
      return true;
    },
    resize(w, h) {
      // (the quality governor changes only the layers' resolution: nothing on the water moves; the sky is redrawn for it)
      if (plan && Math.round(w) === Math.round(W) && Math.round(h) === Math.round(H)) { buildSky(); return; }
      const dOld = cam ? tS.z / cam.Z0 : 1, pOld = tS.dP;
      W = w; H = h; U = Math.min(W, H);
      layout(true);
      wake?.clear();
      // a turned phone: the thought keeps how far out it was (within this screen's limit), in its home's column at that
      // depth (so it is never put down on the hero), and how far the person took it; bubbles re-slot
      if (thought && tS.landK >= 1 && !tS.from) {
        tS.z = clamp(dOld, 1, capD) * cam.Z0; tS.x = (plan.home.x - W / 2) / scaleAt(cam, tS.z); tS.vx = tS.vz = 0; tS.vzP = 0;
        tS.dP = clamp(pOld, 1, tS.z / cam.Z0);
        tS.offX = tS.offY = tS.koX = tS.koY = 0; tS.koFor = 0; tS.side = 'above';
      }
      reslot(true, false);
    },
    setQuality() { /* the director resizes the layers; the sea itself costs the same */ },
    destroy() {
      holds.hum?.stop(); holds.hum = null;
      try { mallow?.float?.({ lift: 0, tilt: 0 }); } catch { /* optional */ }
      // (the words plate it asked for goes with it)
      try { if (thought && thought.labelFit && (thought.labelFit === wordsFit || thought.labelFit === heldFit)) thought.labelFit = null; } catch { /* a handle without it */ }
    },
    /** QA hooks (dev lab, Playwright). Not product API. */
    debug: {
      get sea() { return sea; }, get wake() { return wake; }, get cam() { return cam; }, get plan() { return plan; },
      get thought() { return { ...tS }; }, get bubbles() { return bubbles.map((b) => ({ i: b.i, sx: b.sx, sy: b.sy, D: b.D, d: b.z / cam.Z0, state: b.state, alpha: b.alpha, glide: b.glide, go: b.go, offX: b.offX, offY: b.offY, jam: b.jam || 0, overT: !!b.overT, vz: b.vz })); },
      get waiting() { return waiting.slice(); }, get slotsAll() { return (slotsAll?.list || []).map((q) => [Math.round(q.x), Math.round(q.y), Math.round(q.D), q.far ? 1 : 0]); }, get targets() { return bubbles.map((b) => b.target && [b.i, Math.round(b.target.x), Math.round(b.target.y), Math.round(b.target.D)]); }, get fingers() { return fingers; }, get hero() { return { ...hero }; }, get keep() { return { K: { ...K }, Kr: { ...Kr }, fl: { ...fl } }; }, get lip() { return { ...lipStat }; }, get hint() { return { ...hint, backHint }; }, get gold() { let m = 0, c = 0; for (let q = 0; q < rowsN * COLS; q++) { if (gGold[q] > m) m = gGold[q]; if (gGold[q] > 0.12) c++; } return { max: m, n: c }; },
      /** This frame's traced crest lines: { grp, closed, pts: [[x, y, w]…] } (QA: smoothness, spacing, what lights up). */
      get crests() { const out = []; for (let c = 0; c < cbCount; c++) { const o = c * CR_PTS, pts = []; for (let m = 0; m < cbN[c]; m++) pts.push([cbX[o + m], cbY[o + m], cbW[o + m]]); out.push({ grp: cbG[c], closed: !!cbClosed[c], pts }); } return out; },
      get melt() { return melt ? { ...melt } : null; }, get queue() { return bubbles.map((b) => ({ i: b.i, to: b.target && [Math.round(b.target.x), Math.round(b.target.y)], T: Math.round((b.T || 0) * 100) / 100, L: b.route ? Math.round(b.route.L) : 0, leads: (b.leads || []).map(([o, u]) => [o.i, Math.round(u * 100) / 100]) })); }, get hy() { return hyNow; }, get layouts() { return layoutLog; },
      /** Screen y of the still water at depth d·Z0. */
      surfaceY: (d) => cam.hy + cam.Hw * scaleAt(cam, d * cam.Z0),
      /** Mean |h| on screen rows: how much the sea is moving (QA). */
      /** The most the water stands off its still surface on screen (px), out to perspective scale maxS: how tall a swell looks (QA). */
      peakLift(maxS = Infinity) { let m = 0; for (let j = 2; j < rowsN && rS[j] <= maxS; j++) for (let c = 0; c < COLS; c++) { const q = j * COLS + c; m = Math.max(m, Math.abs(gSY[q] - (cam.hy + cam.Hw * rS[j]))); } return m; },
      roughness() { let s = 0, n = 0; for (let j = 4; j < rowsN; j++) for (let c = 0; c < COLS; c++) { const q = j * COLS + c; s += Math.abs(gSY[q] - (cam.hy + cam.Hw * rS[j])); n++; } return n ? s / n : 0; },
    },
  };

  function seedSwells(seeds) {
    // each grounded line, mapped onto the water: λ = 1.2 × its length, small A, rolling away
    let made = 0;
    for (const pts of seeds.slice(-6)) {
      if (!Array.isArray(pts) || pts.length < 2) continue;
      let len = 0, cx = 0, cy = 0;
      for (let k = 0; k < pts.length; k++) { cx += pts[k][0]; cy += pts[k][1]; if (k) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); }
      cx /= pts.length; cy /= pts.length;
      const lam = clamp(1.2 * len, 0.3 * U, 1.8 * U);
      // where the line lay on screen (on the storm's horizon, the water at the start of the melt): it rolls away from
      // there, its crest still lit in the storm's gold for a few seconds
      unproject(cam, cx, Math.max(cy, cam.hy + 6), wo);
      sea.launch({ x: wo.x, z: wo.z, dx: (R() - 0.5) * 0.7, dz: 1, lambda: lam, A: 0.022 * lam, look: reduced() ? 0.4 : 1, len: clamp(len / Math.max(0.2, wo.s), lam * 2.4, lam * 4), user: false, carry: true, seed: true });
      made++;
    }
    if (!made) {
      // nothing left of the storm's lines: two gentle swells already rolling out, so the sea is alive at once
      for (let k = 0; k < 2; k++) {
        unproject(cam, W * (0.35 + 0.3 * k), lerp(plan.homeY, plan.waterY, 0.5 + 0.2 * k), wo);
        const lam = (0.75 + 0.3 * k) * U;
        sea.launch({ x: wo.x, z: wo.z, dx: (k - 0.5) * 0.3, dz: 1, lambda: lam, A: 0.016 * lam, look: reduced() ? 0.4 : 1, len: lam * 2.6, user: false });
      }
    }
  }

  return api;
}
