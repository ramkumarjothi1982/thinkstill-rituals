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
//     gap beside it shrinks).

import { glowSprite, glintSprite, Pool, Rings, flashEnv, clamp, lerp, smoothstep, TAU, makeCanvas } from '../../../world/util.js';
import { Sea, Wake, SEA, strokeWave, strokePacket, calibrateDrift, makeCamera, fitCamera, scaleAt, depthAt, project, unproject } from './ocean-sea.js';
import { planOcean, OCEAN, bubbleSize, createLongWavesDetector, createDistanceDetector, createOceanProgress } from './ocean-rules.js';
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
const HINT_AT = 5.5, HINT_SEC = 3.6;
const FLICK_U = 0.2, LONG_U = 0.6;
const GOLD_SEC = 5;                     // the storm's seed swells keep their gold crest light this long
const TOW_TAU = 2.4, TOW_Z0 = 0.9;      // a slow long stroke towards you tows a far thought ≈0.9·Z0 home
const TURN_SEC = 12;                    // with photos waiting, a far bubble gives up its place this often
const RELAYOUT_TOL = 12;                // px: the hero's rest box must move this much to re-plan the screen

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
  let capD = OCEAN.CAP;                                    // the thought's furthest distance on this screen (× Z0)
  let firstTouchAt = -1, turnClock = 0, backHint = 0;      // backHint: 0 not yet, 1 shown
  let baseTension = null, relief = 0;                      // the thought's own tension (its feeling), and what the person's swells eased
  // swells sent towards you tow far floaters home (a small fixed pool)
  const tows = [0, 1, 2, 3].map(() => ({ on: false, zFar: 0, v: 0, age: 0 }));

  // fingers (two at most)
  const fingers = [0, 1].map(() => ({
    on: false, id: -1, x: 0, y: 0, px: 0, py: 0, x0: 0, y0: 0, len: 0, moveT: 0, t0: 0, lastEv: 0, speed: 0,
    still: 0, slot: -1, sid: 0, ix: 0, iy: 0, onThought: false, bubble: -1, hush: 0, hushX: 0, hushY: 0, pointerType: 'touch', strokes: 0,
  }));
  const fingerFor = (id) => { for (const f of fingers) if (f.on && f.id === id) return f; return null; };

  // grid (rows × columns) — world → screen, shading
  const NG = ROWS * COLS;
  const gH = new Float32Array(NG), gHX = new Float32Array(NG), gHZ = new Float32Array(NG), gGX = new Float32Array(NG), gGZ = new Float32Array(NG), gA = new Float32Array(NG), gAU = new Float32Array(NG);
  const gMark = new Uint8Array(NG), gPred = new Uint8Array(NG), gSucc = new Int32Array(NG);
  const gSX = new Float32Array(NG), gSY = new Float32Array(NG), gR = new Float32Array(NG), gG = new Float32Array(NG), gB = new Float32Array(NG), gCrest = new Float32Array(NG), gSpec = new Float32Array(NG), gPath = new Float32Array(NG);
  const gChop = new Float32Array(NG), gGold = new Float32Array(NG);
  const rowX = { CHOP: gChop, chopMax: 1, GOLD: gGold, goldSec: GOLD_SEC };
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
    offX: 0, offY: 0, koX: 0, koY: 0, koFor: 0, vis: 1 };
  const bubbles = [];                // { i, x, z, vx, vz, yb, vb, rot, rv, D, sx, sy, alpha, state, lift, glowAge, morph, from, landK, waitIdx }
  let waiting = [];                  // photo indices waiting below the surface
  let riseClock = 0, slotsAll = null; // (slotsAll: the near slots and the far row, for this layout)
  // hero
  // (left/right/top/liveBottom: the live body box, bob and tilt included — the keep-out; h, bottom: where the
  // shell put it, the world's own float excluded — the waterline)
  const hero = { ok: false, cx: 0, bottom: 0, top: 0, left: 0, right: 0, liveBottom: 0, h: 1, x: 0, z: 0, s: 1, yb: 0, vb: 0, lift: 0, tilt: 0, liftApplied: 0, tiltApplied: 0, floatK: 1, restB: 0, lipGrad: null, lipKey: '' };
  const so = { x: 0, y: 0, s: 0 }, wo = { x: 0, z: 0, s: 0 }, sm = {};
  let layoutRest = null, layoutBandB = 0, pendingRect = null, pendingFor = 0, relayoutClock = 0, skyKey = '', camKey = '';
  let measureG = null;
  const layoutLog = { n: 0, last: null };                    // (QA: how often the screen was re-planned, and why)
  const K = { on: false, x0: 0, y0: 0, x1: 0, y1: 0 };      // the hero's keep-out this frame (screen px; its live body)
  const Kr = { on: false, x0: 0, y0: 0, x1: 0, y1: 0 };     // …and where it rests (its own bob excluded)

  // ------------------------------------------------------------ layout --
  /** The hero's live body box (its bob and tilt included): what nothing may cover. */
  function mallowBox() { try { return normBox(mallow?.rect?.() || mallow?.bodyRect?.()); } catch { return null; } }
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
    const th = ((hero.tiltApplied || 0) * Math.PI) / 180, c = Math.cos(th), sn = Math.abs(Math.sin(th)), den = c * c - sn * sn;
    let w = m.width, h = m.height;
    if (sn > 1e-3 && den > 0.5) { w = Math.max(20, (m.width * c - m.height * sn) / den); h = Math.max(20, (m.height * c - m.width * sn) / den); }
    const cx = (m.left + m.right) / 2, cy = (m.top + m.bottom) / 2 + (hero.liftApplied || 0) * h;
    return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2, width: w, height: h };
  }
  const bandBottom = () => (ctx.band?.y || 0) + (ctx.band?.h || 0);
  /** The words plate at the font the thought uses: ≤ `lines` lines at 17 → 15 px (null: one line does not fit at 15 px). */
  function plateFor(tok, maxText, lines = 2) {
    if (!tok) return null;
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
    const changed = boxMoved(r, layoutRest, RELAYOUT_TOL) || Math.abs(bandBottom() - layoutBandB) > 4;
    if (!changed) { pendingRect = null; pendingFor = 0; return; }
    // wait until the move has settled (the shell glides its Mallow for 720 ms), or 2 s at most
    pendingFor += step;
    if (pendingRect && boxMoved(r, pendingRect, 8) && pendingFor < 2) pendingFor = Math.min(pendingFor, step);
    pendingRect = r;
    if (pendingFor >= 0.5) { pendingRect = null; pendingFor = 0; layout(false); }
  }

  function layout(first = true) {
    const live = mallowBox(), rest = restBox(live);
    layoutLog.n++; layoutLog.last = { first, t: Math.round(elapsed * 10) / 10, from: layoutRest && { ...layoutRest }, to: rest && { ...rest }, bandB: bandBottom(), bandWas: layoutBandB };
    layoutRest = rest; layoutBandB = bandBottom();
    const tok = thought ? (thought.token || words?.token || '') : '';
    const n = Math.min(7, photos?.n || 0);
    const max2 = Math.min(OCEAN.PLATE_MAX, W - 2 * OCEAN.EDGE) - 2 * OCEAN.LABEL_PAD_X, max1 = W - 2 * OCEAN.EDGE - 2 * OCEAN.LABEL_PAD_X;
    let pl = tok ? plateFor(tok, max2, 2) : null;
    let p = planOcean({ W, H, band: ctx.band, mallow: rest, n, textW: pl ? pl.w - 2 * OCEAN.LABEL_PAD_X : (tok ? tok.length * 8.5 : 0), plate: pl });
    let textMax = max2;
    plateLines = 2;
    // a short screen: the words on one wide line, when two lines would not fit above the thought far out
    if (pl && pl.lines > 1 && !aboveFits(p, pl.h, OCEAN.FAR + 0.6)) {
      const pl1 = plateFor(tok, max1, 1);
      if (pl1 && pl1.h < pl.h) { p = planOcean({ W, H, band: ctx.band, mallow: rest, n, textW: pl1.w - 2 * OCEAN.LABEL_PAD_X, plate: pl1 }); pl = pl1; plateLines = 1; textMax = max1; }
    }
    plan = p;
    if (pl && plan.plate) Object.assign(plan.plate, { w: pl.w, h: pl.h, lines: pl.lines });
    plan.textMax = textMax;
    capD = capFor(plan, pl ? pl.h : 0, pl ? pl.w : 0);
    hyTarget = plan.hy;
    if (first || !cam) { camHome = plan.homeY; camWater = plan.waterY; if (!melt || reduced()) hyNow = hyTarget; }
    if (!cam) cam = makeCamera({ W, H, hy: hyNow || hyTarget, homeY: camHome, waterY: camWater });
    cam.W = W; cam.H = H; cam.homeY = camHome; cam.waterY = camWater; fitCamera(cam, hyNow || hyTarget);
    // the drift gain from the settled camera (what the person will play with; cached per screen)
    const target = makeCamera({ W, H, hy: plan.hy, homeY: plan.homeY, waterY: plan.waterY });
    driftGain = calibrateDrift(target, U);
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
    }
    tS.r = plan.home.r;
    tS.plateW = plan.plate?.w || 0; tS.plateH = plan.plate?.h || 0;
    slotsAll = null;
    heroFromRect(true);
    placeHint();
    // (a relayout: bubbles that the new layout puts under the hero, or that never moved yet, find a free place)
    if (!first) reslot(false);
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
    // the storm's last clouds, long and thin, lit from below by the dawn
    const RC = (s) => { let a = s >>> 0 || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
    const r = RC(ctx.seed ^ 0x51ab);
    for (let k = 0; k < 4; k++) {
      const cy = hy * (0.22 + 0.5 * r()), cw = W * (0.5 + 0.6 * r()), cx = W * (0.15 + 0.8 * r()), ch = 6 + 10 * r();
      for (let b = 0; b < 9; b++) {
        const bx = cx + (b / 8 - 0.5) * cw, by = cy + (r() - 0.5) * ch, br = ch * (1.4 + 1.6 * r()) * (1 - Math.abs(b / 8 - 0.5));
        const cg = g.createRadialGradient(bx, by, 0, bx, by, br * 2.2);
        cg.addColorStop(0, 'rgba(40,28,78,0.32)'); cg.addColorStop(1, 'rgba(40,28,78,0)');
        g.fillStyle = cg; g.fillRect(bx - br * 2.2, by - br * 2.2, br * 4.4, br * 4.4);
      }
      // a rose underline where the dawn catches them
      const lg = g.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
      lg.addColorStop(0, 'rgba(255,158,184,0)'); lg.addColorStop(0.5, `rgba(255,170,170,${0.08 + 0.1 * (cy / hy)})`); lg.addColorStop(1, 'rgba(255,158,184,0)');
      g.fillStyle = lg; g.fillRect(cx - cw / 2, cy + ch * 0.6, cw, 1.6);
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
      const a = side < 0 ? E + 12 : MR + 18, b = side < 0 ? ML - 18 : W - E - 12;
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
    tS.x = (plan.home.x - W / 2) / 0.5; tS.z = cam ? cam.Z0 : 500; tS.vx = 0; tS.vz = 0; tS.yb = 0; tS.vb = 0;
    tS.offX = tS.offY = tS.koX = tS.koY = 0; tS.koFor = 0;
    tS.side = plan.plate?.side === 'below' ? 'below' : 'above';
    tS.labelX = tS.labelXT = 0;
    tS.labelY = tS.labelYT = tS.side === 'below' ? plan.home.r * 0.98 + 8 : -(plan.home.r + 4 + (plan.plate?.h || 40));
    tS.labelW = plan.textMax; tS.labelFade = -1;
  }
  /**
   * Slots for the photos: the planned ones (near, roomy — smaller beside the hero on a small phone),
   * then small ones far out on the horizon, clear of the words (where waiting photos take turns).
   */
  function bubbleSlots(n = 7) {
    if (slotsAll && slotsAll.n >= n) return slotsAll.list;
    const out = plan.slots.map((sl) => ({ x: sl.x, y: sl.y, D: sl.D, far: false }));
    const fin = makeCamera({ W, H, hy: plan.hy, homeY: plan.homeY, waterY: plan.waterY });
    const d = 8.3, s0 = 1 / (1 + d), D = bubbleSize(s0, d, U);
    const y = fin.hy + fin.Hw * s0 - 0.3 * D;
    const P = plan.rects.plate, T = plan.rects.thought;
    for (let x = OCEAN.EDGE + D / 2; x <= W - OCEAN.EDGE - D / 2 && out.length < n + 2; x += 2) {
      const b = { x0: x - D / 2, x1: x + D / 2, y0: y - D / 2, y1: y + D / 2 };
      const hit = (o) => o && b.x0 < o.x1 + 6 && b.x1 > o.x0 - 6 && b.y0 < o.y1 + 6 && b.y1 > o.y0 - 6;
      if (hit(P) || hit(T) || hit(plan.rects.band)) continue;
      if (out.some((q) => Math.hypot(q.x - x, q.y - y) < (q.D + D) / 2 + OCEAN.BUBBLE_GAP + 6)) continue;
      out.push({ x, y, D, far: true });
      x += D;
    }
    slotsAll = { n, list: out };
    return out;
  }
  const newBubble = (o) => Object.assign({ i: 0, x: 0, z: 0, vx: 0, vz: 0, yb: 0, vb: 0, rot: 0, rv: 0, D: 44, cap: 400, offX: 0, offY: 0, sx: 0, sy: 0, alpha: 0, state: 'rise', riseK: 0, lift: 0, glowAge: -1, morph: 1, glide: 0, from: null, target: null, away: false, capFor: 0, leaveK: 0, ph: R() * TAU }, o);
  function initBubbles(fromCards = null) {
    bubbles.length = 0; waiting = [];
    const n = Math.min(7, photos?.n || 0);
    if (!n) return;
    const slots = bubbleSlots(n);
    const used = new Set();
    // postcards from the storm keep their identity (postcard i → bubble i) and start where they hang
    const order = fromCards?.length ? fromCards.map((c) => c.i).filter((i) => i < n) : [];
    for (let i = 0; i < n; i++) if (!order.includes(i)) order.push(i);
    let late = 0;
    for (const i of order) {
      const card = fromCards?.find((c) => c.i === i) || null;
      let best = -1, bd = Infinity;
      // (a postcard keeps to its own side of the hero: its glide down to the water never crosses it)
      const side = (x) => (x < W / 2 - 0.12 * W ? -1 : x > W / 2 + 0.12 * W ? 1 : 0);
      for (let k = 0; k < slots.length; k++) {
        if (used.has(k)) continue;
        const cross = card && side(card.x) * side(slots[k].x) < 0 ? 220 : 0;
        const d = card ? Math.hypot(slots[k].x - card.x, slots[k].y - card.y) + (slots[k].far ? 60 : 0) + cross : k;
        if (d < bd) { bd = d; best = k; }
      }
      if (best < 0) {
        // no room on the water now: a postcard still turns into its bubble in place, then drifts away over the horizon (and takes its turn later)
        if (card) {
          const hx = clamp(card.x, OCEAN.EDGE + 8, W - OCEAN.EDGE - 8), fin = makeCamera({ W, H, hy: plan.hy, homeY: plan.homeY, waterY: plan.waterY });
          bubbles.push(newBubble({ i, D: 12, sx: card.x, sy: card.y, alpha: 1, state: 'card', riseK: 1, morph: 0,
            from: { x: card.x, y: card.y, size: Math.max(card.w, card.h), rot: card.rot || 0 }, target: { x: hx, y: fin.hy + 1, D: 12 }, away: true }));
        } else waiting.push(i);
        continue;
      }
      used.add(best);
      const sl = slots[best];
      unproject(cam, sl.x, sl.y + 0.3 * sl.D, wo);
      // (a photo the storm was not showing rises into its place once the melt has passed, one after another)
      bubbles.push(newBubble({ i, x: wo.x, z: wo.z, D: sl.D, cap: sl.D + 0.5, sx: card ? card.x : sl.x, sy: card ? card.y : sl.y,
        alpha: card ? 1 : 0, state: card ? 'card' : 'rise', riseK: card || !fromCards ? 0 : -0.6 * late++, morph: card ? 0 : 1,
        from: card ? { x: card.x, y: card.y, size: Math.max(card.w, card.h), rot: card.rot || 0 } : null, target: { x: sl.x, y: sl.y, D: sl.D } }));
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
      if (slide && b.alpha > 0.05) { b.offX = ox - sl.x; b.offY = oy - sl.y; }
      b.sx = sl.x; b.sy = sl.y;
    }
  }

  // ------------------------------------------------------------- input --
  function hitThought(x, y) {
    if (!thought || tS.alpha < 0.5) return false;
    try { if (thought.hitTest?.(x, y)) return true; } catch { /* placeholder */ }
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
    } else rings.add(x, y, 3, 18, 0.7, 1, C.crest2, 0.35, 1.2);
  }

  function pointer(s) {
    if (paused || !prepared) return;
    if (s.type === 'down') {
      const f = fingers.find((q) => !q.on);
      if (!f) return;
      Object.assign(f, { on: true, id: s.id, x: s.x, y: s.y, px: s.x, py: s.y, x0: s.x, y0: s.y, ix: s.x, iy: s.y, len: 0, moveT: 0, t0: elapsed, lastEv: elapsed, speed: 0, still: 0, slot: -1, sid: 0, hush: 0, hushX: s.x, hushY: s.y, pointerType: s.pointerType || 'touch' });
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
      f.len += d;
      if (s.speed > 0.06 * U) f.still = 0;
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
    f.slot = sea.launch(P);
    f.sid = f.slot >= 0 ? sea.id[f.slot] : 0;
  }
  function sculptStroke(f) {
    if (f.slot < 0 || !sea.on[f.slot] || sea.id[f.slot] !== f.sid) { f.slot = -1; return; }
    const speed = f.moveT > 0.02 ? f.len / f.moveT : f.speed;
    const P = strokePacket(cam, U, { x0: f.x0, y0: f.y0, x1: f.x, y1: f.y, len: f.len, speed }, pk);
    if (!P) return;
    if (reduced()) P.A *= 0.4;
    sea.sculpt(f.slot, P);
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
    const w = strokeWave(len, speed, U);
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
      if (!said.chop && !discovered.has('long-waves') && sea.chop(FLICK_U * U) > 0.05) { said.chop = true; say(ctx.entry.dialogue?.chop); }
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
    sea.ringAt(wo.x, wo.z, lam, 0.028 * lam * (reduced() ? 0.4 : 1), true);
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
    const now = elapsed, rm = reduced();
    if (prepared) relayoutCheck(dt);
    { const th = ctx.thought ?? null; if (th !== thought) api.setThought(th); }
    rowsN = low() ? ROWS_LOW : ROWS;
    // melt in: the horizon rises from the storm's line after the midpoint; things land on the water
    if (melt) meltStep(dt);
    // camera inputs ease (a layout change glides, never jumps)
    const e = 1 - Math.exp(-dt / 0.35);
    camHome += (plan.homeY - camHome) * e; camWater += (plan.waterY - camWater) * e;
    if (!melt) hyNow += (hyTarget - hyNow) * e;
    cam.homeY = camHome; cam.waterY = camWater; fitCamera(cam, hyNow);
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
    metricsCache.swells = sea.swells(LONG_U * U, rm ? 0.6 : 1.5);

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
      const dist = tS.z / cam.Z0;
      const ev = distD.update(dt, { dist, out: tS.outD, outUser: tS.outU });
      if (ev?.id === 'distance') fireDiscovery(ev);
      else if (ev?.id === 'back' && !said.back) { said.back = true; say(ctx.entry.dialogue?.drift); }
    }
    // progress and the natural completion point
    const down = fingers.some((f) => f.on);
    const pr = prog.update(dt, { dist: thought && tS.landK >= 1 ? tS.z / cam.Z0 : null, period, down, swells: metricsCache.swells, played: firstTouchAt >= 0 ? elapsed - firstTouchAt : 0 });
    lastP = pr.p;
    if (pr.complete && !complete && !melt) finishSea();

    // dawn and mirror
    dawnT = complete ? 1 : 0.55 + 0.25 * pr.p;
    dawnK += (dawnT - dawnK) * (1 - Math.exp(-dt / 2.2));
    mirrorK = complete ? Math.min(1, mirrorK + dt / 4) : 0;

    drawBack(now, rm);
    drawFront(now, rm);
    audioAndMallow(dt, now);

    if (introAt > 0) { introAt -= dt; if (introAt <= 0) { introAt = -1; if (!everTouched) say(ctx.entry.dialogue?.intro); } }
    if (arriveAt > 0) { arriveAt -= dt; if (arriveAt <= 0) { arriveAt = -1; if (!said.arrive) { said.arrive = true; say(ctx.entry.dialogue?.arrive); } } }
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
  let wakeAcc = 0, windClock = 0;
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
    if (rm) { hyNow = hyTarget; }
    else {
      if (k >= 0.5 && melt.riseAt < 0) melt.riseAt = elapsed;
      const rk = melt.riseAt >= 0 ? easeInOut((elapsed - melt.riseAt) / RISE_SEC) : 0;
      hyNow = lerp(melt.hy0, hyTarget, rk);
    }
    const riseDone = rm || (melt.riseAt >= 0 && elapsed - melt.riseAt >= RISE_SEC);
    const mask = (x, y) => { try { return ctx.meltMask ? ctx.meltMask(x, y) : k; } catch { return k; } };
    for (const b of bubbles) {
      if (!b.from) continue;
      const m = rm ? k : mask(b.from.x, b.from.y);
      b.morph = Math.max(b.morph, rm ? k : smoothstep(0.3, 0.95, m));
      b.state = b.morph < 1 ? 'card' : 'glide';
      if (b.morph >= 1 && k >= 0.5) b.glide = Math.min(1, b.glide + dt / GLIDE_SEC);
      if (b.glide >= 1 && riseDone) settleBubble(b);
    }
    if (thought && tS.from) {
      const m = rm ? 1 : Math.min(mask(tS.from.x, tS.from.y), mask(tS.from.x, tS.from.y + (tS.r + 30)));
      if (m >= 0.95 && k >= 0.45) {
        // its words move above it as it goes; where it glides to is fixed now (a relayout never moves it mid-glide)
        if (tS.glide <= 0) { tS.labelFade = 0; tS.from.tx = plan.home.x; tS.from.ty = plan.home.y; }
        tS.glide = Math.min(1, tS.glide + dt / GLIDE_SEC);
      }
      if (tS.glide >= 1 && riseDone) land();
    }
    // reduced motion: the storm's thought fades out where it hung (first half), the ocean's fades in at home (second half)
    if (rm && melt.rmFrom) tS.vis = k < 0.5 ? 1 - 2 * k : 2 * k - 1;
    hero.floatK = rm ? k : smoothstep(0.15, 0.9, k);
    const done = riseDone && k >= 1 && (!thought || !tS.from) && bubbles.every((b) => !b.from);
    if (done) { melt = null; hyNow = hyTarget; hero.floatK = 1; arriveAt = 1.6; tS.vis = 1; }
  }
  /** A bubble that glided down from its postcard settles on the water (physics from here). */
  function settleBubble(b) {
    const t = b.target;
    if (b.away) { b.from = null; b.state = 'leave'; b.leaveK = 0; return; }
    unproject(cam, t.x, t.y + 0.3 * t.D, wo);
    b.x = wo.x; b.z = wo.z; b.vx = b.vz = 0;
    b.from = null; b.state = 'float'; b.alpha = 1;
    splash(t.x, t.y + t.D * 0.32, t.D);
  }
  function land() {
    tS.landed = true; tS.from = null; tS.landK = 1;
    // from where it has come down to (its home), the swells take over — exactly where it is, no pop
    unproject(cam, tS.sx, tS.sy + tS.r * tS.surf * 0.55, wo);
    tS.x = wo.x; tS.z = Math.max(cam.Z0, wo.z); tS.vx = tS.vz = 0; tS.yb = tS.vb = 0;
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
    sea.sample(tS.x, tS.z, sm);
    const g = driftGain / SEA.STOKES * (rm ? 0.6 : 1);
    const ux = sm.ux * g, uz = sm.uz * g + towAt(tS.z) * (rm ? 0.6 : 1), uuz = sm.uuz * g;
    const ki = 1 - Math.exp(-dt / 0.45);
    tS.vx += (ux - tS.vx) * ki; tS.vz += (uz - tS.vz) * ki;
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
    } else if (melt?.rmFrom && melt.k < 0.5) { sx = melt.rmFrom.x; sy = melt.rmFrom.y; tS.surf = melt.rmFrom.scale; }
    // a re-home (landing, a new layout) glides from where it was last shown
    if (tS.snapOff) { tS.offX = tS.sx - sx; tS.offY = tS.sy - sy; tS.snapOff = false; }
    if (tS.offX || tS.offY) { const d = Math.exp(-dt / 0.45); tS.offX *= d; tS.offY *= d; if (Math.abs(tS.offX) + Math.abs(tS.offY) < 0.3) tS.offX = tS.offY = 0; }
    sx += tS.offX; sy += tS.offY;
    const rr = tS.r * tS.surf;
    // never over the hero: it floats beyond it
    keepThoughtOut(dt, sx, sy, rr, tS.landK >= 1 && !tS.from);
    sx += tS.koX; sy += tS.koY;
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
    // (the world's perspective is the depth: z stays 0 for a layer-drawn thought, so it is not shrunk twice)
    thought.x = sx; thought.y = sy; thought.z = 0; thought.scale = tS.surf; thought.rot = tS.rot;
    thought.labelSide = tS.side === 'tuck' ? 'above' : tS.side;
    if (!thought.draw) thought.opacity = tS.vis;
    const st = thought.state || (thought.state = {});
    st.tension = tS.tension; st.calm = tS.calm; st.charge = 0; st.distance = clamp((dist - 1) / (OCEAN.CAP - 1));
  }
  /**
   * The hero keep-out for the thought. A bob that would touch the hero's live body rests against it
   * instead (a screen offset that is put back at once and lets go gently); if its place on the water
   * itself is on the hero (a new layout), the water carries it out to where it is clear.
   */
  function keepThoughtOut(dt, sx, sy, rr, landed) {
    const d = Math.exp(-dt / 0.3); tS.koX *= d; tS.koY *= d;
    if (Math.abs(tS.koX) + Math.abs(tS.koY) < 0.05) tS.koX = tS.koY = 0;
    if (!K.on) return;
    if (landed && discHits(sx, sy, rr + 2, Kr)) {
      pushOut(sx, sy, rr + 2, Kr, rr);
      const k = Math.min(1, dt / 0.6), s = scaleAt(cam, tS.z);
      tS.x += (po.x * k) / s;
      tS.z = clamp(tS.z - (po.y * k * cam.Z0) / (cam.Hw * s * s), cam.Z0, capD * cam.Z0);
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
    if (B.x1 + r <= W - E - rr && Math.abs(mr) < cost) { po.x = mr; po.y = 0; }
    return po;
  }
  // the words plate: candidate places round the thought (offsets from its centre, and the box on screen)
  const pc = { lx: 0, ly: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
  const SIDES_L = ['above', 'left', 'right', 'below'], SIDES_R = ['above', 'right', 'left', 'below'];
  function plateCand(side, sx, sy, rr, w, h) {
    let lx = 0, ly = 0;
    if (side === 'above') ly = -(rr + 4 + h);
    else if (side === 'below') ly = rr * 0.98 + 8;
    else { lx = (side === 'right' ? 1 : -1) * (rr + 10 + w / 2); ly = -h / 2; }
    const cx = side === 'left' || side === 'right' ? sx + lx : clamp(sx, OCEAN.EDGE + w / 2, W - OCEAN.EDGE - w / 2);
    pc.lx = lx; pc.ly = ly; pc.x0 = cx - w / 2; pc.x1 = cx + w / 2; pc.y0 = sy + ly; pc.y1 = sy + ly + h;
    return pc;
  }
  function plateOk(side) {
    const E = OCEAN.EDGE;
    if ((side === 'left' || side === 'right') && (pc.x0 < E - 0.5 || pc.x1 > W - E + 0.5)) return false;
    if (pc.y0 < bandBottom() + 4 || pc.y1 > (plan?.floor ?? H)) return false;
    return !(K.on && boxesHit(pc, K, 2));
  }
  function placeWords(dt, sx, sy, rr) {
    const w = tS.plateW || 0, h = tS.plateH || 0;
    if (!w || !h) return;
    // during the melt, until it starts gliding, the words stay as the storm showed them
    if (tS.from && tS.glide <= 0) return;
    let side = tS.side === 'tuck' ? null : tS.side;
    if (side) plateCand(side, sx, sy, rr, w, h);
    if (!side || !plateOk(side)) {
      side = null;
      for (const sd of sx < hero.cx ? SIDES_L : SIDES_R) { plateCand(sd, sx, sy, rr, w, h); if (plateOk(sd)) { side = sd; break; } }
    }
    if (!side) {
      // nowhere wholly free (a thought right under the band on the smallest screens): as high as the band
      // allows, over the thought's own top — never down into the hero
      side = 'tuck';
      plateCand('above', sx, sy, rr, w, h);
      pc.ly = Math.max(pc.ly, bandBottom() + 4 - sy);
      if (K.on) pc.ly = Math.min(pc.ly, K.y0 - 2 - h - sy);
    }
    tS.side = side;
    tS.labelYT = pc.ly; tS.labelXT = pc.lx;
    if (tS.labelFade >= 0) {
      tS.labelFade += dt / 0.7;
      if (tS.labelFade >= 0.5 && tS.labelW !== plan.textMax) { tS.labelW = plan.textMax; tS.labelY = pc.ly; tS.labelX = pc.lx; }
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
    const cx = beside ? tS.sx + tS.labelX : clamp(tS.sx + tS.labelX, OCEAN.EDGE + w / 2, W - OCEAN.EDGE - w / 2), y0 = tS.sy + tS.labelY;
    out.x0 = cx - w / 2 - 4; out.y0 = y0 - 4; out.x1 = cx + w / 2 + 4; out.y1 = y0 + h + 4;
    return out;
  }

  // ------------------------------------------------------------- bubbles --
  function updateBubbles(dt, now) {
    if (!bubbles.length && !waiting.length) return;
    const rm = reduced();
    const g = driftGain / SEA.STOKES * 1.4 * (rm ? 0.6 : 1);   // bubbles drift further than the thought
    for (const b of bubbles) {
      sea.sample(b.x, b.z, sm);
      const ki = 1 - Math.exp(-dt / 0.35);
      b.vx += (sm.ux * g - b.vx) * ki; b.vz += (sm.uz * g + towAt(b.z) * 1.4 * (rm ? 0.6 : 1) - b.vz) * ki;
      if (!b.from && (b.state === 'float' || b.state === 'rise') && dt > 0) {
        b.x += b.vx * dt; b.z += b.vz * dt;
        b.z = clamp(b.z, -0.6 * cam.Z0, OCEAN.CAP * cam.Z0);
      }
      const h = sm.h * (rm ? 0.4 : 1);
      b.vb += (-40 * (b.yb - h) - 7 * b.vb) * dt; b.yb += b.vb * dt;
      b.rv += (0.6 * Math.atan(sm.hx) * (rm ? 0.3 : 1) - b.rot) * 30 * dt; b.rv *= Math.exp(-6 * dt); b.rot += b.rv * dt;
      if (b.lift > 0) b.lift = Math.max(0, b.lift - dt / 2.4);
      if (b.glowAge >= 0) { b.glowAge += dt; if (b.glowAge > 2.6) b.glowAge = -1; }
      if (b.state === 'rise') { b.riseK = Math.min(1, b.riseK + dt / 1.2); b.alpha = easeOut(b.riseK); if (b.riseK >= 1) b.state = 'float'; }
      if (b.state === 'arrive') { b.riseK = Math.min(1, b.riseK + dt / 1.8); b.alpha = easeOut(b.riseK); if (b.riseK >= 1) b.state = 'float'; }
      // at the far edge for a while, with others waiting their turn: it drifts on over the horizon
      if (b.state === 'float') { b.capFor = b.z / cam.Z0 >= OCEAN.CAP - 0.6 ? (b.capFor || 0) + dt : 0; if (waiting.length && b.capFor > 6) { b.state = 'leave'; b.leaveK = 0; } }
      const s = scaleAt(cam, b.z), d = b.z / cam.Z0;
      // its size: by its depth, but never more than the gap it floats in allows (cap; it grows back slowly when there is room)
      if (b.state === 'float') b.cap = Math.min(400, b.cap + 12 * dt);
      b.D = Math.min(bubbleSize(s, d, U), b.cap);
      const wy = cam.hy + (cam.Hw - b.yb * (rm ? 0.3 : 1)) * s;
      let sx = W / 2 + b.x * s, sy = wy - 0.3 * b.D - easeOut(b.lift) * b.D * 0.35 + (b.state === 'rise' ? (1 - clamp(b.riseK)) * b.D * 0.5 : 0);
      if (wake && wy > hyNow) sy += wake.at(sx, wy) * 3;
      if (b.from) {
        const k = easeInOut(b.glide); sx = lerp(b.from.x, b.target.x, k); sy = lerp(b.from.y, b.target.y, k); b.D = b.away ? lerp(Math.min(b.from.size, 60), b.target.D, k) : b.target.D;
        // gliding down to the water it goes round the hero, never across it, and round the words
        if (b.glide > 0) {
          const r = b.D / 2 + 2;
          if (K.on && discHits(sx, sy, r, K)) { pushOut(sx, sy, r, K, b.D / 2); sx += po.x; sy += po.y; }
          if (thought && tS.plateW && discHits(sx, sy, r, plateRect(prB))) { const P = prB, l = sx + r - P.x0, rt = P.x1 - (sx - r), u = sy + r - P.y0, d = P.y1 - (sy - r), m = Math.min(l, rt, u, d); if (m === l) sx -= l; else if (m === rt) sx += rt; else if (m === u) sy -= u; else sy += d; }
        }
      }
      if (b.state === 'leave') {
        b.leaveK = Math.min(1, (b.leaveK || 0) + dt / 1.6);
        b.alpha = 1 - easeOut(b.leaveK);
        if (b.away) { sx = b.target.x; sy = b.target.y - 2 * b.leaveK; b.D = b.target.D * (1 - 0.5 * b.leaveK); }
        else b.D *= 1 - 0.4 * b.leaveK;
      }
      // a re-slot glides from where it was shown
      if (b.offX || b.offY) { const k = Math.exp(-dt / 0.4); b.offX *= k; b.offY *= k; if (Math.abs(b.offX) + Math.abs(b.offY) < 0.3) b.offX = b.offY = 0; sx += b.offX; sy += b.offY; }
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
   * Keep floaters apart and clear of the hero (its live body: a hard keep-out), the band, the thought
   * and its words, and the edges (in screen px → world). A bubble in a gap narrower than itself beside
   * the hero shrinks to fit the gap rather than overlap.
   */
  function separate(dt) {
    const E = OCEAN.EDGE, bb = bandBottom() + 4;
    const T = thought && tS.alpha > 0.3 ? { x: tS.sx, y: tS.sy, r: tS.r * tS.surf + 6 } : null;
    const P = thought && tS.plateW ? plateRect(prB) : null;
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
          if (dd < need) { const m = (need - dd) * 0.5; nudge(B, -dx / dd * m, -dy / dd * m); mx += dx / dd * m; my += dy / dd * m; }
        }
        if (T) { const dx = A.sx - T.x, dy = A.sy - T.y, dd = Math.hypot(dx, dy) || 1e-3, need = ra + T.r + OCEAN.BUBBLE_GAP; if (dd < need) { mx += dx / dd * (need - dd); my += dy / dd * (need - dd); } }
        const push = (o, pad, world) => {
          if (!o) return;
          if (A.sx + ra <= o.x0 - pad || A.sx - ra >= o.x1 + pad || A.sy + ra <= o.y0 - pad || A.sy - ra >= o.y1 + pad) return;
          const l = A.sx + ra - (o.x0 - pad), r = o.x1 + pad - (A.sx - ra), u = A.sy + ra - (o.y0 - pad), d = o.y1 + pad - (A.sy - ra);
          const m = Math.min(l, r, u, d);
          if (world) { if (m === l) mx -= l; else if (m === r) mx += r; else if (m === u) my -= u; else my += d; }
          else if (m === l) qx -= l; else if (m === r) qx += r; else if (m === u) qy -= u; else qy += d;
        };
        if (K.on) push(K, 0, true);
        // (the words only hold a bubble off on screen: it keeps its distance on the water, so a far one stays small
        // as it lines up beneath them, instead of being pushed back towards you)
        push(P, 4, false);
        // edges and the band
        if (A.sx - ra < E) mx += E - (A.sx - ra);
        if (A.sx + ra > W - E) mx -= A.sx + ra - (W - E);
        if (A.sy - ra < bb) my += bb - (A.sy - ra);
        if (A.sy + ra > plan.floor) my -= A.sy + ra - plan.floor;
        if (mx || my) nudge(A, mx, my);
        if (qx || qy) { A.sx += qx; A.sy += qy; }
      }
    }
    // the hero is the one thing a bubble never covers: still on it (squeezed between it and the edge)? smaller, beside it — or, with
    // no room beside it, out on the water above its head
    if (!K.on) return;
    for (const A of bubbles) {
      if (A.state !== 'float' && A.state !== 'rise' && A.state !== 'arrive') continue;
      const ra = A.D / 2;
      if (A.sx + ra <= K.x0 || A.sx - ra >= K.x1 || A.sy + ra <= K.y0 || A.sy - ra >= K.y1) continue;
      const left = A.sx < hero.cx, gap = (left ? K.x0 - E : W - E - K.x1) - 2;
      if (gap >= OCEAN.BUBBLE_FAR && A.sy > K.y0 + 4) {
        A.cap = Math.min(A.cap, gap); A.D = Math.min(A.D, gap);
        nudge(A, (left ? K.x0 - A.D / 2 - 1 : K.x1 + A.D / 2 + 1) - A.sx, 0);
      } else nudge(A, 0, K.y0 - A.D / 2 - 1 - A.sy);
    }
  }
  const prB = { x0: 0, y0: 0, x1: 0, y1: 0 };
  /** Move a floating bubble by a screen offset (converted to world, so physics carries on from there). */
  function nudge(b, mx, my) {
    b.sx += mx; b.sy += my;
    const s = scaleAt(cam, b.z);
    b.x += mx / s;
    // up the screen is away: dz = −dy·Z0 / (Hw·s²)
    b.z = clamp(b.z - my * cam.Z0 / (cam.Hw * s * s), -0.6 * cam.Z0, OCEAN.CAP * cam.Z0);
  }
  /** A waiting photo drifts into view far out on the horizon (after another drifted away over it). */
  function arriveWaiting(skip) {
    const k = waiting.findIndex((i) => i !== skip);
    if (k < 0) return;
    const d = OCEAN.CAP - 0.5, s0 = scaleAt(cam, d * cam.Z0), D = bubbleSize(s0, d, U);
    const y = cam.hy + cam.Hw * s0 - 0.3 * D;
    const P = thought && tS.plateW ? plateRect(prB) : null;
    let bestX = null, bs = -Infinity;
    for (let x = OCEAN.EDGE + D / 2; x <= W - OCEAN.EDGE - D / 2; x += 6) {
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
  const heroBase = () => hero.bottom - 0.09 * hero.h;
  const heroWater = () => heroBase() - 0.1 * 0.91 * hero.h;     // (rest geometry: the body's own bob never moves the water)
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
    hero.lift = clamp((hero.yb * hero.s) / Math.max(40, hero.h), -0.12, 0.12) * (rm ? 0.3 : 1) * k;
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
    g.globalAlpha = clamp(0.32 + 0.6 * dawnK) * (low() ? 0.7 : 1);
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
    g.globalAlpha = 0.45 + 0.45 * dawnK;
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
      const sN = clamp(s / 1.2);
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
        const sp = rdl > 0.965 ? Math.pow(rdl, 160) * dawnK * (1 + mirrorK) : 0;
        // bioluminescent crest light, in drifting patches (anchored to the water, never ruler lines)
        const a = gA[q] * amp;
        const crest = a > 0.3 ? clamp(h / (a + 0.3)) : 0;
        const pn = 0.5 + 0.5 * Math.sin(x * 0.021 + j * 1.7 + now * 0.13) * Math.sin(x * 0.047 - j * 0.83 - now * 0.07 + 1.3);
        // (how bright: the steepness of the person's own waves — chop sparkles, long swells glow)
        const glow = smoothstep(0.42, 0.95, crest) * clamp(gAU[q] * amp * 4.2) * bio * (0.45 + 0.55 * sN) * (0.3 + 0.7 * pn);
        gCrest[q] = glow; gSpec[q] = sp;
        // the dawn's glitter path: narrow at the horizon, widening towards you, broken by the slopes
        const pathW = W * (0.035 + 0.15 * sN) * (1 + 3 * clamp(Math.sqrt(hx * hx + hz * hz) * 4));
        const px2 = (sx - xd) / pathW;
        gPath[q] = px2 * px2 < 9 ? Math.exp(-px2 * px2) * dawnK * (0.35 + 0.65 * clamp(Math.sqrt(hx * hx + hz * hz) * 9)) : 0;
        const Fm = F * (1 + 0.15 * mirrorK);
        // the dawn path: a soft warm column, narrow far out and widening towards you, fading as it nears
        // (beside the hero, off-axis: the star of the mirror-calm finish)
        const cwid = W * (0.045 + 0.11 * sN) * (1 + 0.5 * mirrorK), cdx = (sx - xd) / cwid;
        const colm = cdx * cdx < 9 ? Math.exp(-cdx * cdx) * dawnK * (0.62 - 0.24 * sN) * (1 + 0.9 * mirrorK) * (0.75 + 0.25 * Math.cos(j * 0.9 + now * 0.6) * (rm ? 0 : 1)) : 0;
        // the storm's ground lines, arriving as the first swells: their crests still lit in the storm's gold for a few seconds
        const gold = Math.min(1, gGold[q] * 7 * amp) * (low() ? 0.6 : 1);
        gR[q] = wr * (1 - Fm) + rr * Fm + 255 * sp * 0.8 + 70 * glow + 185 * colm + 240 * gold;
        gG[q] = wg * (1 - Fm) + rg * Fm + 225 * sp * 0.8 + 210 * glow + 146 * colm + 190 * gold;
        gB[q] = wb * (1 - Fm) + rb * Fm + 170 * sp * 0.8 + 220 * glow + 100 * colm + 105 * gold;
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
      for (let j = 0; j < n && py < ih; j++) {
        q = j * COLS + i0;
        const y = lerp(gSY[q], gSY[q + 1], f);
        const cr = lerp(gR[q], gR[q + 1], f), cg = lerp(gG[q], gG[q + 1], f), cb = lerp(gB[q], gB[q + 1], f), cch = lerp(gChop[q], gChop[q + 1], f);
        if (y <= prevY + 0.01) { pr = cr; pg = cg; pb = cb; pch = cch; continue; }     // folded behind a nearer crest
        const cy = (y - imgY0) / CELL - 0.5;
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
          D[o] = R2; D[o + 1] = G2; D[o + 2] = B2;
          D[o + 3] = py === jh ? Math.round(255 * clamp(1 - (hyC - jh))) : 255;
        }
        prevY = y; pr = cr; pg = cg; pb = cb; pch = cch;
      }
      for (; py < ih; py++) { const o = (py * iw + ic) * 4; D[o] = pr; D[o + 1] = pg; D[o + 2] = pb; D[o + 3] = 255; }
    }
  }

  /**
   * Crest light along the crests themselves: a grid point is on a crest when the water is highest
   * there across the rows or along the row; neighbouring crest points join into one luminous line
   * that follows the crest's true curve (one line per crest, never a hatching of rows). Soft halo,
   * thin core, bucketed by brightness and depth into a few paths.
   */
  function drawCrests(g, now, rm) {
    const n = rowsN;
    // mark the crest points
    for (let j = 0; j < n; j++) {
      const o = j * COLS;
      for (let c = 0; c < COLS; c++) {
        const q = o + c, v = gCrest[q];
        let on = 0;
        if (v > 0.05 && j > 2) {
          const h = gH[q];
          const acrossRows = j > 0 && j < n - 1 && h >= gH[q - COLS] && h > gH[q + COLS];
          // a crest crossing the rows only where the water curves along the row more than across it
          // (an envelope's broad hump along a row is not a crest)
          const cRow = c > 0 && c < COLS - 1 ? 2 * h - gH[q - 1] - gH[q + 1] : 0;
          const cCol = j > 0 && j < n - 1 ? 2 * h - gH[q - COLS] - gH[q + COLS] : 0;
          const alongRow = c > 0 && c < COLS - 1 && h >= gH[q - 1] && h > gH[q + 1] && cRow > 2 * Math.abs(cCol);
          // 1: a crest running along the rows (it links along the row); 2: one crossing them (it links down)
          on = acrossRows ? 1 : alongRow ? 2 : 0;
        }
        gMark[q] = on;
      }
    }
    // link each crest point to the next one along its crest (along the row first, else down a row)
    gSucc.fill(-1); gPred.fill(0);
    for (let j = 3; j < n; j++) {
      const o = j * COLS;
      for (let c = 0; c < COLS; c++) {
        const q = o + c;
        if (!gMark[q]) continue;
        let cand = -1;
        // (a crest along the rows may step a row up or down as it curves: it still links, so it reads as one line)
        if (gMark[q] === 1) cand = c >= COLS - 1 ? -1 : gMark[q + 1] === 1 ? q + 1 : j > 3 && gMark[q + 1 - COLS] === 1 && !gPred[q + 1 - COLS] ? q + 1 - COLS : j < n - 1 && gMark[q + 1 + COLS] === 1 ? q + 1 + COLS : -1;
        else if (j < n - 1) cand = gMark[q + COLS] === 2 ? q + COLS : c < COLS - 1 && gMark[q + COLS + 1] === 2 ? q + COLS + 1 : c > 0 && gMark[q + COLS - 1] === 2 ? q + COLS - 1 : -1;
        if (cand >= 0 && !gPred[cand]) { gSucc[q] = cand; gPred[cand] = 1; }
      }
    }
    // Each crest is one continuous line whose light rises and falls along it: cumulative passes (a stretch
    // brighter than level k is drawn in every pass up to k, 'lighter'), butt caps inside a crest — so no
    // beads or dashes, and it fades out towards its ends where its light does.
    g.lineJoin = 'round'; g.lineCap = 'butt';
    for (let depth = 0; depth < 2; depth++) for (let b = 0; b < CREST_LV.length; b++) {
      g.beginPath();
      let segs = 0;
      for (let q0 = 3 * COLS; q0 < n * COLS; q0++) {
        if (!gMark[q0] || gPred[q0] || gSucc[q0] < 0) continue;
        // (smoothed through the midpoints: a crest stepping between grid rows stays one soft curve)
        let q = q0, pen = false, ex = 0, ey = 0;
        while (q >= 0 && gSucc[q] >= 0) {
          const nq = gSucc[q], j = (q / COLS) | 0;
          const sN = clamp(rS[j] / 1.2);
          const ok = (depth === 0) === (sN < 0.4) && Math.min(gCrest[q], gCrest[nq]) >= CREST_LV[b];
          const mx = (gSX[q] + gSX[nq]) * 0.5, my = (gSY[q] + gSY[nq]) * 0.5;
          if (ok) {
            if (!pen) { g.moveTo(gSX[q], gSY[q]); g.lineTo(mx, my); pen = true; } else g.quadraticCurveTo(gSX[q], gSY[q], mx, my);
            ex = gSX[nq]; ey = gSY[nq]; segs++;
          } else if (pen) { g.lineTo(ex, ey); pen = false; }
          q = nq;
        }
        if (pen) g.lineTo(ex, ey);
      }
      if (!segs) continue;
      const a = CREST_A[b] * (low() ? 0.6 : 1);
      g.strokeStyle = b >= CREST_LV.length - 1 ? C.crest2 : C.crest;
      g.globalAlpha = a * 0.3; g.lineWidth = (depth ? 8 : 4) + 1.6 * b; g.stroke();
      g.globalAlpha = a * 0.62; g.lineWidth = (depth ? 2.4 : 1.3) + 0.35 * b; g.stroke();
      g.globalAlpha = a; g.lineWidth = depth ? 0.9 : 0.55; g.stroke();
    }
    g.globalAlpha = 1; g.lineCap = 'round';
  }
  const CREST_LV = [0.07, 0.17, 0.3, 0.48], CREST_A = [0.13, 0.12, 0.14, 0.17];

  /** The dawn's glitter (jittered, twinkling points on the path and on facets that catch it) and soft glows at the brightest crests. */
  function drawSparkles(g, now, rm) {
    const n = rowsN;
    let gl = 0, gw = 0;
    const still = rm || low();
    const tick = still ? 0 : Math.floor(now * 5);
    for (let j = 2; j < n && (gl < 150 || gw < 60); j++) {
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
        thought.draw(g, x, y, tS.surf, { radius: tS.r, tension: tS.tension, calm: tS.calm, charge: 0, reduced: rm, now, minX: OCEAN.EDGE, maxX: W - OCEAN.EDGE, labelWidth: tS.labelW || plan.textMax, labelLines: plateLines, labelY: tS.labelY, labelX: tS.labelX, alpha: A, labelAlpha: la });
        if (thought.plate) { tS.plateW = thought.plate.w; tS.plateH = thought.plate.h; }
      } catch { /* placeholder only */ }
    }
  }

  function drawBubble(g, b, now, rm) {
    if (b.alpha <= 0.01 || !photos) return;
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
    const top = hero.top, base = hero.liveBottom - 0.09 * hero.h, artH = Math.max(20, base - top);
    const rx = w * 0.47, ry = artH / 2, cyE = top + ry;
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
    g.lineTo(xs[N] + 6, pts[N]); g.lineTo(cx + rx + 2, base + 4); g.lineTo(cx - rx - 2, base + 4); g.closePath();
    g.clip();
    g.globalAlpha = k0 * (low() ? 0.8 : 1);
    g.drawImage(lipSpr(), cx - rx - 2, wMin - 1, 2 * rx + 4, Math.max(4, base + 4 - wMin));
    g.restore();
    // the meniscus: a bright line where water meets the Mallow, following the wave, softly fading at both ends
    g.save();
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = C.crest2; g.lineCap = 'butt';
    for (let pass = 0; pass < 2; pass++) {
      g.lineWidth = pass ? 1.2 : 5;
      for (let k = 0; k < N; k++) {
        // (each stretch its own light: brightest in the middle, gone at the body's edges)
        const f = Math.sin(((k + 0.5) / N) * Math.PI);
        g.globalAlpha = (pass ? 0.42 : 0.12) * k0 * f * f;
        g.beginPath(); g.moveTo(xs[k], pts[k]); g.lineTo(xs[k + 1], pts[k + 1]); g.stroke();
      }
    }
    // a soft ring of water round the body, flattened by the view
    const s = Math.max(0.05, (wl - cam.hy) / cam.Hw), asp = clamp(s * cam.Hw / cam.Z0, 0.16, 0.7), rr = rx + 16;
    g.globalAlpha = 0.14 * k0; g.strokeStyle = C.crest; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(cx, y0 + 3, rr, rr * asp * 0.5, 0, 0.08 * Math.PI, 0.92 * Math.PI); g.stroke();
    g.restore();
  }
  const LIP_N = 12, LIP_S = 28;
  const lipPts = new Float32Array(LIP_N + 1), lipXs = new Float32Array(LIP_N + 1);
  let lipC = null;
  /** The submerged part's tint: the deep water's colour, clear at the waterline and deepening downwards (one cached strip). */
  function lipSpr() {
    if (lipC) return lipC;
    lipC = makeCanvas(4, 64);
    const lg = lipC.getContext('2d'), gr = lg.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(40,150,170,0.10)'); gr.addColorStop(0.3, 'rgba(22,104,128,0.32)'); gr.addColorStop(1, 'rgba(12,70,92,0.6)');
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
        melt = { k: 0, hy0: rm ? hyTarget : clamp(handoff.horizonY ?? H * 0.655, hyTarget, H * 0.85), riseAt: -1 };
        hyNow = melt.hy0; fitCamera(cam, hyNow);
        hero.floatK = 0;
        // the storm's grounded ground lines become the first gentle swells, rolling away
        seedSwells(handoff.seeds || []);
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
        initBubbles(rm ? null : (handoff.photos || []).map((p) => ({ ...p })));
        if (rm) for (const b of bubbles) { b.state = 'rise'; b.riseK = 0; }
      } else {
        // a cold start: the sea is already here; the thought surfaces at home, bubbles rise
        hero.floatK = 0;
        if (thought) {
          const keep = restored?.thought ? { x: tS.x, z: tS.z } : null;
          thoughtHome(); tS.from = null; tS.landK = 1; tS.alpha = 0;
          if (keep) { tS.x = keep.x; tS.z = keep.z; }       // resumed: it is where it was left
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
      if (!(handoff && from)) { try { thought?.react?.('appear'); } catch { /* optional */ } }
    },
    frame,
    pointer,
    get metrics() {
      const f0 = fingers.find((f) => f.on);
      return {
        speedU: f0 ? f0.speed / U : 0, period: metricsCache.period, energy: metricsCache.energy, chop: metricsCache.chop,
        packets: sea.active, dist: thought ? tS.z / (cam?.Z0 || 1) : null, long: prog.long, progress: api.progress,
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
      thought = h;
      if (prepared) layout(false);
      if (h && !had && cam) { thoughtHome(); tS.from = null; tS.landK = 1; tS.alpha = 0; captureBase(); tS.tension = baseTension; }
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
        thought: thought ? { d: Math.round((tS.z / cam.Z0) * 100) / 100, x: Math.round(tS.x), base: Math.round((baseTension ?? 0.5) * 100) / 100, relief: Math.round(relief * 100) / 100 } : null,
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
        tS.z = clamp(+s.thought.d || 1, 1, capD) * cam.Z0; tS.x = +s.thought.x || 0;
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
      const dOld = cam ? tS.z / cam.Z0 : 1;
      W = w; H = h; U = Math.min(W, H);
      layout(true);
      wake?.clear();
      // a turned phone: the thought keeps how far out it was (within this screen's limit), from its new home; bubbles re-slot
      if (thought && tS.landK >= 1 && !tS.from) {
        tS.x = (plan.home.x - W / 2) / 0.5; tS.z = clamp(dOld, 1, capD) * cam.Z0; tS.vx = tS.vz = 0;
        tS.offX = tS.offY = tS.koX = tS.koY = 0; tS.koFor = 0; tS.side = 'above';
      }
      reslot(true, false);
    },
    setQuality() { /* the director resizes the layers; the sea itself costs the same */ },
    destroy() {
      holds.hum?.stop(); holds.hum = null;
      try { mallow?.float?.({ lift: 0, tilt: 0 }); } catch { /* optional */ }
    },
    /** QA hooks (dev lab, Playwright). Not product API. */
    debug: {
      get sea() { return sea; }, get wake() { return wake; }, get cam() { return cam; }, get plan() { return plan; },
      get thought() { return { ...tS }; }, get bubbles() { return bubbles.map((b) => ({ i: b.i, sx: b.sx, sy: b.sy, D: b.D, d: b.z / cam.Z0, state: b.state, alpha: b.alpha })); },
      get waiting() { return waiting.slice(); }, get fingers() { return fingers; }, get hero() { return { ...hero }; },
      get melt() { return melt ? { ...melt } : null; }, get hy() { return hyNow; }, get layouts() { return layoutLog; },
      /** Screen y of the still water at depth d·Z0. */
      surfaceY: (d) => cam.hy + cam.Hw * scaleAt(cam, d * cam.Z0),
      /** Mean |h| on screen rows: how much the sea is moving (QA). */
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
      sea.launch({ x: wo.x, z: wo.z, dx: (R() - 0.5) * 0.7, dz: 1, lambda: lam, A: 0.022 * lam * (reduced() ? 0.4 : 1), len: clamp(len / Math.max(0.2, wo.s), lam * 2.4, lam * 4), user: false, carry: true, seed: true });
      made++;
    }
    if (!made) {
      // nothing left of the storm's lines: two gentle swells already rolling out, so the sea is alive at once
      for (let k = 0; k < 2; k++) {
        unproject(cam, W * (0.35 + 0.3 * k), lerp(plan.homeY, plan.waterY, 0.5 + 0.2 * k), wo);
        const lam = (0.75 + 0.3 * k) * U;
        sea.launch({ x: wo.x, z: wo.z, dx: (k - 0.5) * 0.3, dz: 1, lambda: lam, A: 0.016 * lam * (reduced() ? 0.4 : 1), len: lam * 2.6, user: false });
      }
    }
  }

  return api;
}
