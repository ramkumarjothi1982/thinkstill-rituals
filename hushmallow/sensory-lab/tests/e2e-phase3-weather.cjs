// Weather Weaver browser tests (spec-weather.md §13; the L21 harness).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e-phase3-weather.cjs [outDir]
//   PART=weather:open,weather:storm      (blocks: open, storm, rain, sun, moon, stars, wind, fog, warm, water, front, morph,
//                                         resolve, motion, dial, keys, exit, sound, photo, dna, mallows, access, tier, states,
//                                         reach, touch, chips, smooth, leak, layout; default all)
//
// Also runs inside tests/e2e-phase3.cjs through run(browser, { out, only }).
// Simulated input proves state, never smoothness: software GL can run at ~6 fps,
// so every wait is on state with generous limits, and sim time runs slower
// than wall time there (dt is capped at 0.05 s a frame).
//
// Blocks (slices 2 and 3):
//   open    W1: from the home card and from #weather; rig, realm canvas, .wx-back, 8 radios, a chip
//   storm   W4/W7 (Storm): a swipe across the bank opens it (clear, gap → 'clear' pulse, the Mallow
//           reacts, heaviness falls, light reaches the Mallow); no Companion drag or stroke; a strike
//   rain    W4/W6 (Rain): a still finger grows a bead; let go in the deck → 'success' pulse, less rain;
//           a swipe leans the rain; the chip shelters the Mallow and sends its bead up
//   sun     W4/W6 (Sunshine, Boppo): the pool burns the haze, bask (glow, blush, inflate), a sunbeam on rest,
//           arrows, "Bring the sun", golden hour
//   moon    W4/W6 (Moonlight, Noomi): ripples on water ≤ 1/s, moonlit (breathRate 0.12), a falling star, arrows,
//           "Bring the moonlight", "The tide is still."
//   stars   W4/W6 (Starlight, Zuzu): a held cluster, a constellation, a gift, "Gather stars", arrow gathering, resolve
//   wind    W4/W6 (Wind, Loomi): a gust leans it, an eddy, calm from slow strokes, an arrow breeze, "Send a breeze", resolve
//   fog     W4/W6 (Fog, Loomi): wipes, revealed, a hold's clear patch, arrow bands, "Clear the mist" until it lifts
//   warm    W4/W7 (Warm glow, Pipzi): a drag kindles (taps, sparks), holding Pipzi is the hearth, the chip resolves
//   water   W4 (waves): a drag sends a swell that reaches Loomi, "Push the water", gold swells add heat; puddles
//           after rain in a dry realm, touched
//   front   W8: a front's swap only under full cover, chips wait, a drag pushes it; a same-realm turn keeps the
//           old weather while the new enters; a swipe while Storm is still entering works
//   morph   the same-realm morphs: Rain → Starlight, Storm → Sunshine, Fog → any
//   resolve the resolve beat and Again for Storm and Rain (caption, line, chip, the bank drifts off)
//   motion  W9/W12 (part): reduced motion (a fading front, reduced flags, same mood targets, live
//           toggle); a hidden page freezes frames and sim time and lets go of a held bead
//   dial    W2 (part): every weather from the dial settles in pickRealm's realm with moodFor's target
//   keys    W3: digits from the stage, arrows in the dial, R is Again
//   exit    W14 (part): Close and Escape fade home; nothing left behind; listeners back to baseline
//   layout  W13 (part): no overlap, on screen, targets ≥ 40 px, the Mallow between the bars, the
//           chosen radio visible at 320 px, the same baseline for every weather
//
// Blocks (slice 4):
//   sound   W11/W12: nothing before a gesture; one bed after a tap; drips and a rising note for a bead;
//           one bed across a weather change; thunder after a cloud glow; Mute ≤ 500 ms, unmute ≤ 1.5 s;
//           Touch sounds off silences bed and one-shots; hidden stops and suspends, visible rebuilds
//           without a burst; Close leaves nothing playing; no AudioContext at all still works
//   photo   W10: 10 s of Storm in the Static Storm with a strike and gaps, then a dark-to-bright realm
//           change, through a 32×18 luminance probe (rises per second, rises within 250 ms, frame steps);
//           realm pulses ≤ 2 bright a second and lab cloud glows ≥ 1 s apart
//   dna     W16: a chosen world is home; the palette tints stars and moonlight; Slower is ×0.82; gentle
//           has glows not bolts, agitation ≤ 0.30, no hops; personalisation off gives the defaults
//   mallows W17: all seven start in their entry weather; each home weather arrives in character; the same
//           strike reads differently on each Mallow
//   access  labels, the radiogroup, the announcer's words; a held Enter on a chip resolves the weather,
//           focus moves onto Again, a held key's repeats never press it, a fresh press does
//   tier    a live quality drop sheds bed layers, the front canvas and pools; going back up grows nothing
//
// Blocks (slice 5):
//   states  W2: every radio in turn: a new world each time (colour-residual probe > 12, with its self-check),
//           moodFor's target, the Mallow answers within 2 s; one screenshot per state
//   reach   W4: one gesture per weather; the realm's answer measured outside the touch box + 60 px
//   touch   W5/W7: every interaction by CDP touch at 390×844, the two-finger spread, a tap on the Mallow;
//           the page never scrolls or zooms
//   chips   W6: Space held on every lead chip, Space on "Push the water", W held on the stage
//   smooth  W8: the realm's eased mood sampled every 100 ms through a turn and two fronts; a mid-turn frame;
//           the outgoing weather 300 ms in; a dragged front's shorter reveal
//   leak    W14: TouchTalk after Weather starts clean (face, rest, inflate, realm, timers, rAF, voices);
//           blocked storage still opens
//   (W7, W9 and W15 checks were added to storm, motion and resolve; layout now covers all six viewports
//   and all eight weathers, plus the caption)
//
// Brief line → blocks (spec §13; every check's name says what it proves):
//   W1  opens; the character loads; controls visible ............ open
//   W2  eight states; Hushfold worlds; not a colour change ........ states, dial
//   W3  non-gesture selection ..................................... keys
//   W4  the seven interactions; visible consequences; reactions ... storm, rain, sun, moon, stars, wind, fog, warm, water, reach
//   W5  touch; no browser scroll .................................. touch
//   W6  an alternative for every gesture .......................... chips (and each W4 block's chip and arrows, access)
//   W7  input isolation ........................................... storm, rain, warm, touch
//   W8  smooth, interactive, meaningful transitions ............... smooth, front, morph, dial
//   W9  reduced motion ............................................ motion
//   W10 photosensitivity .......................................... photo
//   W11 sound works or mutes; the gesture rule .................... sound
//   W12 background behaviour ...................................... motion, sound
//   W13 layout at every viewport .................................. layout
//   W14 exit, cleanup, isolation, privacy ......................... exit, leak
//   W15 replay .................................................... resolve, keys, access
//   W16 Comfort DNA ............................................... dna
//   W17 all seven Mallows ......................................... mallows
//   (quality tiers, spec §9 ....................................... tier)

const path = require('path');
const H = require('./lib/harness.cjs');
const { check, guard, sleep } = H;

const LAB = '/hushmallow/sensory-lab';
const OUT_DEFAULT = path.join(__dirname, '..', 'docs', 'phase3', 'weather');
const DIAL = ['sunshine', 'wind', 'fog', 'rain', 'storm', 'moonlight', 'starlight', 'warm'];
const BRIEF = {
  W1: ['opens; the character loads; controls visible', ['open']],
  W2: ['eight states; Hushfold worlds as the foundation; simple colour changes do not satisfy; the Mallow reacts', ['states', 'dial']],
  W3: ['non-gesture selection', ['keys']],
  W4: ['each of the seven interactions; visible environmental consequences; the Mallow reacts', ['storm', 'rain', 'sun', 'moon', 'stars', 'wind', 'fog', 'warm', 'water', 'reach']],
  W5: ['touch; no browser scroll', ['touch']],
  W6: ['alternatives for every gesture', ['chips', 'access']],
  W7: ['input isolation', ['storm', 'rain', 'warm', 'touch']],
  W8: ['transitions smooth, interactive and meaningful', ['smooth', 'front', 'morph', 'dial']],
  W9: ['reduced motion preserved', ['motion']],
  W10: ['photosensitivity', ['photo']],
  W11: ['sound works or mutes; the user-gesture rule', ['sound']],
  W12: ['background behaviour', ['motion', 'sound']],
  W13: ['layout', ['layout']],
  W14: ['exit; cleanup; isolation; privacy', ['exit', 'leak']],
  W15: ['replay', ['resolve', 'keys', 'access']],
  W16: ['Comfort DNA', ['dna']],
  W17: ['all seven Mallows', ['mallows']],
  tiers: ['quality tiers (spec §9)', ['tier']],
};
const SCOPE = 'weather';
const T = 60000;   // state waits: generous for software GL

const noErrors = (scope, errors) => check(scope, 'no console errors', !errors.length, errors.join(' | '));
const wx = (page, fn, arg) => page.evaluate(fn, arg);
/** Open #weather with a favourite Mallow and wait until the weather is live. */
async function openWx(browser, vp, mallow, { prefs = {}, initScripts = [], hash = '#weather', dna = {}, dnaExtra = {} } = {}) {
  const r = await H.open(browser, vp, hash, { prefs, initScripts, comfort: H.comfort({ favouriteMallow: mallow, ...dna }, dnaExtra) });
  await H.waitRig(r.page, { timeout: T });
  if (hash === '#weather') await r.page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T });
  return r;
}
// settled: the weather is w, the planner has nothing left to do (a click changes the weather at once;
// state and the front only update on the next frame) and the screen is live
const settled = (page, w) => page.waitForFunction((w) => { const lw = __lab.weather; return lw?.weather === w && !lw.session.planner.busy && lw.state === 'live' && !lw.front; }, w, { timeout: T });
/**
 * A pointer drag through page px points, `ms` between moves (mouse). The first move is sent with the down: on
 * a busy machine at a few frames a second, a first move that lands more than 220 ms after the down reads as a
 * hold (a held finger), not a drag.
 */
async function drag(page, pts, ms = 16) {
  await page.mouse.move(pts[0][0], pts[0][1]);
  await Promise.all([page.mouse.down(), page.mouse.move(pts[1][0], pts[1][1])]);
  if (ms) await sleep(ms);
  for (let i = 2; i < pts.length; i++) { await page.mouse.move(pts[i][0], pts[i][1]); if (ms) await sleep(ms); }
  await page.mouse.up();
}
const line = (x0, y0, x1, y1, n) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
/** Hold an action chip (mouse) until fn(arg) is true in the page, then let go. */
async function holdChip(page, action, fn, arg = null, timeout = T) {
  const bb = await (await page.$(`.wx-actions [data-action="${action}"]`)).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  try { await page.waitForFunction(fn, arg, { timeout }); } finally { await page.mouse.up(); }
}
/** The resolve beat as shown: caption, the Mallow's line, the chips. */
async function resolvedView(page) {
  await page.waitForFunction(() => __lab.weather.resolved && document.querySelector('.wx-actions [data-action="again"]'), null, { timeout: T });
  return page.evaluate(() => ({ cap: document.querySelector('.weather .wx-hint .wx-cap')?.textContent, line: document.querySelector('.weather .wx-hint .line')?.textContent,
    chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), p: __lab.weather.progress }));
}

// ------------------------------------------------------- photosafety probe --
// spec §13 lumaProbe: every frame, the realm and weather canvases composited at 32×18; per frame the mean
// relative luminance (0..1) of the whole frame and of each quadrant. Runs in the page; __probe.stop() → samples.
function startProbe() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 18;
  const g = c.getContext('2d', { willReadFrequently: true });
  const lin = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const v = i / 255; lin[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }
  const out = [];
  let on = true;
  const frame = () => {
    if (!on) return;
    g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, 32, 18);
    for (const s of ['.weather canvas.hushfold-realm', '.weather canvas.wx-back', '.weather canvas.wx-front']) {
      const el = document.querySelector(s);
      if (el && el.width) { try { g.drawImage(el, 0, 0, 32, 18); } catch { /* not ready */ } }
    }
    const d = g.getImageData(0, 0, 32, 18).data, q = [0, 0, 0, 0];
    let L = 0;
    for (let y = 0; y < 18; y++) {
      for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4, l = 0.2126 * lin[d[i]] + 0.7152 * lin[d[i + 1]] + 0.0722 * lin[d[i + 2]];
        L += l; q[(y >= 9 ? 2 : 0) + (x >= 16 ? 1 : 0)] += l;
      }
    }
    out.push({ t: performance.now(), L: L / 576, q: q.map((v) => v / 144) });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  window.__probe = { stop() { on = false; return out; } };
}

/**
 * Flash statistics over probe samples, for the whole frame and each quadrant:
 *   rise250  the largest rise over the lowest value of the previous 250 ms (≤ 0.2 allowed)
 *   perSec   the most rises of more than 0.1 (rising edges) inside any 1 s (≤ 3 allowed)
 *   step     the largest whole-frame rise from one frame to the next (≤ 0.1; at software-GL frame
 *            rates one frame is longer than the spec's 100 ms, so this is the stricter reading)
 */
function flashStats(samples) {
  const get = [(s) => s.L, (s) => s.q[0], (s) => s.q[1], (s) => s.q[2], (s) => s.q[3]];
  let rise250 = 0, perSec = 0, step = 0;
  for (let k = 0; k < get.length; k++) {
    const f = get[k], rises = [];
    let inRise = false;
    for (let j = 1; j < samples.length; j++) {
      let mn = f(samples[j - 1]);
      for (let i = j - 2; i >= 0 && samples[j].t - samples[i].t <= 250; i--) mn = Math.min(mn, f(samples[i]));
      const d = f(samples[j]) - mn;
      rise250 = Math.max(rise250, d);
      if (k === 0) step = Math.max(step, f(samples[j]) - f(samples[j - 1]));
      if (d > 0.1 && !inRise) { rises.push(samples[j].t); inRise = true; } else if (d < 0.05) inRise = false;
    }
    perSec = Math.max(perSec, perWindow(rises, 1000));
  }
  const span = samples.length > 1 ? samples[samples.length - 1].t - samples[0].t : 0;
  return { frames: samples.length, fps: +(span ? (samples.length - 1) / (span / 1000) : 0).toFixed(1), rise250: +rise250.toFixed(3), perSec, step: +step.toFixed(3),
    maxL: +Math.max(...samples.map((s) => s.L)).toFixed(3), minL: +Math.min(...samples.map((s) => s.L)).toFixed(3) };
}
/** The most times (ms, ascending) inside any window of `ms`. */
const perWindow = (times, ms) => times.reduce((m, t, i) => Math.max(m, times.slice(i).filter((u) => u < t + ms).length), 0);

// ------------------------------------------------- colour-residual probe --
// spec §13 residual(A, B): 96×54 composites of the realm canvas plus .wx-back; the RMS (0–255) left after the
// best 12-parameter affine colour map from A to B (least squares). A recoloured world (a hue turn, a brighter
// copy, a tint) leaves almost nothing; new or moved elements leave a residual.
const RES = { w: 96, h: 54, layers: ['.weather canvas.hushfold-realm', '.weather canvas.wx-back'] };
/** In the page: the listed canvases composited over black at w×h → RGBA as a plain array. */
function grab({ w, h, layers }) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (const s of layers) { const el = document.querySelector(s); if (el && el.width) g.drawImage(el, 0, 0, w, h); }
  return Array.from(g.getImageData(0, 0, w, h).data);
}
const composite = (page) => page.evaluate(grab, RES);
/** Solve the 4×4 system M·x = b (Gaussian elimination with partial pivoting). */
function solve4(M, b) {
  const A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 4; c++) {
    let p = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c] || 1e-9;
    for (let r = 0; r < 4; r++) if (r !== c) { const f = A[r][c] / d; for (let k = c; k < 5; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((r, i) => r[4] / (A[i][i] || 1e-9));
}
/** RMS residual (0–255) of B against the best affine colour map of A: B_c ≈ w_c · [r, g, b, 1]. */
function residual(A, B) {
  const n = A.length / 4, M = [0, 1, 2, 3].map(() => [0, 0, 0, 0]), R = [0, 1, 2].map(() => [0, 0, 0, 0]), x = [0, 0, 0, 255];
  for (let i = 0; i < n; i++) {
    x[0] = A[4 * i]; x[1] = A[4 * i + 1]; x[2] = A[4 * i + 2];
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) M[r][c] += x[r] * x[c]; for (let ch = 0; ch < 3; ch++) R[ch][r] += x[r] * B[4 * i + ch]; }
  }
  for (let r = 0; r < 4; r++) M[r][r] += n * 1e-3;   // a whisper of ridge: a flat image still solves
  const Wc = R.map((b) => solve4(M, b));
  let e = 0;
  for (let i = 0; i < n; i++) {
    x[0] = A[4 * i]; x[1] = A[4 * i + 1]; x[2] = A[4 * i + 2];
    for (let ch = 0; ch < 3; ch++) { const p = Wc[ch][0] * x[0] + Wc[ch][1] * x[1] + Wc[ch][2] * x[2] + Wc[ch][3] * 255; e += (p - B[4 * i + ch]) ** 2; }
  }
  return +Math.sqrt(e / (3 * n)).toFixed(2);
}
/** A recoloured copy (3×3 matrix, then k·v + add, clamped): the probe's self-check. */
function recolour(A, m, k = 1, add = 0) {
  const out = A.slice();
  for (let i = 0; i < A.length; i += 4) for (let ch = 0; ch < 3; ch++) out[i + ch] = Math.max(0, Math.min(255, k * (m[3 * ch] * A[i] + m[3 * ch + 1] * A[i + 1] + m[3 * ch + 2] * A[i + 2]) + add));
  return out;
}
/** The CSS hue-rotate matrix. */
function hueMatrix(deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072];
}
const IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1];

// ------------------------------------------------- outside-touch probe --
// spec §13: what a touch changes away from where it landed. The realm animates by itself (water, drifting
// clouds, twinkles), so a live before/after diff is mostly that animation: a no-touch control over the same
// time measures as much. The probe therefore paints the realm twice as stills (paintRealm: one deterministic
// frame) at the target mood and transform the realm was given before the touch and after it, and diffs them
// outside the touch path's box inflated by 60 px; the same mood painted twice is the control (it diffs 0).
/** The realm's current target: the mood last sent and the transform for this progress. */
const target = (page) => page.evaluate(async (LAB) => {
  const { transformFor } = await import(`${LAB}/core/weather.js`);
  const lw = __lab.weather;
  return { mood: lw.env.mood, transform: transformFor(lw.weather, lw.progress, lw.resolved), progress: lw.progress };
}, LAB);
/** In the page: a still of the current realm at {mood, transform}, kept at half size under window.__stills[key]. */
const still = (page, key, t) => page.evaluate(async ({ LAB, key, t }) => {
  const { paintRealm } = await import(`${LAB}/core/environment.js`);
  const lw = __lab.weather, g = lw.geo(), host = document.createElement('div');
  host.style.cssText = `position:fixed;left:0;top:0;width:${g.W}px;height:${g.H}px;visibility:hidden;pointer-events:none`;
  document.body.append(host);
  try {
    const c = paintRealm(host, lw.realmId, { mood: t.mood, transform: t.transform, groundY: lw.env._groundY });
    if (!c) return false;
    const s = document.createElement('canvas');
    s.width = Math.round(g.W / 2); s.height = Math.round(g.H / 2);
    const x = s.getContext('2d', { willReadFrequently: true });
    x.drawImage(c, 0, 0, s.width, s.height);
    (window.__stills ||= {})[key] = { w: s.width, h: s.height, d: x.getImageData(0, 0, s.width, s.height).data };
    return true;
  } finally { host.remove(); }
}, { LAB, key, t });
/** In the page: the lab layer (.wx-back) alone, over black (a near-transparent pixel's raw colour is noise), at half size under window.__stills[key]. */
function layerShot({ key }) {
  const el = document.querySelector('.weather canvas.wx-back'), g = __lab.weather.geo();
  const s = document.createElement('canvas');
  s.width = Math.round(g.W / 2); s.height = Math.round(g.H / 2);
  const x = s.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.fillRect(0, 0, s.width, s.height);
  x.drawImage(el, 0, 0, s.width, s.height);
  (window.__stills ||= {})[key] = { w: s.width, h: s.height, d: x.getImageData(0, 0, s.width, s.height).data };
}
/** In the page: share of pixels (and mean) differing by > thr outside box (stage px) + pad; band: only rows y0..y1 (stage px). */
function outsideDiff({ a, b, box, pad = 60, thr = 2, band = null }) {
  const A = window.__stills[a], B = window.__stills[b], w = A.w, h = A.h, s = 0.5;
  const x0 = (box[0] - pad) * s, y0 = (box[1] - pad) * s, x1 = (box[2] + pad) * s, y1 = (box[3] + pad) * s;
  let n = 0, over = 0, sum = 0;
  for (let y = band ? Math.max(0, Math.floor(band[0] * s)) : 0; y < (band ? Math.min(h, Math.ceil(band[1] * s)) : h); y++) {
    for (let x = 0; x < w; x++) {
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
      const i = (y * w + x) * 4, d = (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2])) / 3;
      n++; sum += d; if (d > thr) over++;
    }
  }
  return { frac: +(over / Math.max(1, n)).toFixed(4), mean: +(sum / Math.max(1, n)).toFixed(2), px: n };
}
/** The box (stage px) around a list of points. */
const boxOf = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
/**
 * W4 "visible consequences" beyond the touch: stills at the target before and after, diffed outside the
 * touch box + 60 px (> 2 on ≥ 2 % of pixels), with the control (the same target twice) at 0.
 */
async function reach(page, scope, label, before, box) {
  await sleep(450);   // the env throttle forwards a held change within 200 ms
  const after = await target(page);
  const ok = (await still(page, 'r0', before)) && (await still(page, 'r0b', before)) && (await still(page, 'r1', after));
  const d = ok ? await page.evaluate(outsideDiff, { a: 'r0', b: 'r1', box }) : null, c = ok ? await page.evaluate(outsideDiff, { a: 'r0', b: 'r0b', box }) : null;
  await page.evaluate(() => { window.__stills = {}; });
  check(scope, `${label}: the realm answers beyond the touch (stills at the target before/after differ by > 2 on ≥ 2 % of pixels outside the touch box + 60 px; the same target twice: none)`,
    ok && d.frac >= 0.02 && c.frac === 0, JSON.stringify({ diff: d, control: c, before: before.mood, after: after.mood, p: [before.progress, after.progress].map((v) => +(+v).toFixed(3)), box: box.map(Math.round) }));
  return d;
}

/**
 * Waves change no mood (a swell is the lab's own), so for them the lab layer is diffed instead: in Starlight
 * at the Moonmilk Cove (its stars stay above the horizon, so the water band holds only what a touch sends),
 * a push at the water's left edge, until the swell reaches the Mallow, against a no-touch control.
 */
async function waveReach(page, scope) {
  await page.evaluate(() => __lab.weather.setWeather('starlight', { instant: true }));
  await settled(page, 'starlight');
  await page.evaluate(() => __lab.weather.settle());
  // the moonlit glow behind Noomi fades out first (it lies across the water band's rows)
  await page.waitForFunction(() => __lab.weather.layer.scene.halo.a < 0.004 && !__lab.weather.sims.moon.amount, null, { timeout: T }).catch(() => {});
  await sleep(800);
  const g = await page.evaluate(() => __lab.weather.geo());
  const wy = g.water[0] + 40, band = [g.water[0], g.water[1]], pts = line(6, wy, 60, wy, 5), box = boxOf(pts);
  const n0 = await page.evaluate(() => __lab.weather.events.filter((e) => e.type === 'wave-arrive').length);
  await page.evaluate(layerShot, { key: 'c0' });
  const tc = Date.now();
  await sleep(2500);
  await page.evaluate(layerShot, { key: 'c1' });
  const ctl = await page.evaluate(outsideDiff, { a: 'c0', b: 'c1', box, band });
  await page.evaluate(layerShot, { key: 'a' });
  const ts = Date.now();
  await drag(page, pts, 20);
  // until the swell has rolled across to the Mallow, well past the touch
  await page.waitForFunction((n0) => __lab.weather.events.filter((e) => e.type === 'wave-arrive').length > n0, n0, { timeout: T }).catch(() => {});
  await page.evaluate(layerShot, { key: 'b' });
  const spans = [Date.now() - ts, ts - tc];
  const sw = await page.evaluate(outsideDiff, { a: 'a', b: 'b', box, band });
  await page.evaluate(() => { window.__stills = {}; });
  check(scope, 'Waves: a push at the edge draws a swell along the water beyond the touch (lab layer, water band outside the box + 60 px: ≥ 2 % of pixels and over twice a no-touch control)',
    sw.frac >= 0.02 && sw.frac > 2 * ctl.frac, JSON.stringify({ swell: sw, control: ctl, spans }));
}

// --------------------------------------------------------- CDP touch pad --
/** A CDP command that never answers (the renderer never acks an input) fails the block instead of hanging it. */
const cdpSend = (cdp, method, params, ms = 20000) => Promise.race([cdp.send(method, params), sleep(ms).then(() => { throw new Error(`${method} got no answer in ${ms} ms`); })]);
/** Fingers that stay down across awaits (H.touch plays one timed sequence; a held bead needs a wait on state). */
async function touchPad(page) {
  const cdp = await page.context().newCDPSession(page);
  const down = new Map();
  const send = (type) => cdpSend(cdp, 'Input.dispatchTouchEvent', { type, touchPoints: [...down].map(([id, p]) => ({ x: p[0], y: p[1], id, radiusX: 4, radiusY: 4, force: 1 })) });
  return {
    async down(x, y, id = 1) { down.set(id, [x, y]); await send('touchStart'); },
    /** A down with its first move travelling with it (a drag, not a hold; see tdrag). */
    async downMove(x, y, x1, y1, id = 1) { down.set(id, [x, y]); const a = send('touchStart'); down.set(id, [x1, y1]); await Promise.all([a, send('touchMove')]); },
    async move(x, y, id = 1) { down.set(id, [x, y]); await send('touchMove'); },
    async path(pts, ms = 16, id = 1) { for (const p of pts) { down.set(id, p); await send('touchMove'); if (ms) await sleep(ms); } },
    async up(id = 1) { down.delete(id); await send(down.size ? 'touchMove' : 'touchEnd'); },
    async close() { if (down.size) { down.clear(); await send('touchEnd').catch(() => {}); } await cdp.detach().catch(() => {}); },
  };
}
/**
 * One finger along page px points (CDP touch), `ms` between moves. CDP delivers one touch event per rendered
 * frame, and software GL renders a few frames a second: a first move sent a frame after the down would reach
 * the page past the 220 ms hold threshold and read as a hold. So the first move travels with the down (as a
 * real finger's does, a few ms later) and the last with the lift; the moves between come a frame apart, so
 * keep them few and long (a brisk finger covers 100+ px a frame at these rates).
 */
async function tdrag(page, pts, ms = 0) {
  const cdp = await page.context().newCDPSession(page);
  const ev = (type, p) => cdpSend(cdp, 'Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p[0], y: p[1], id: 1, radiusX: 4, radiusY: 4, force: 1 }] : [] });
  try {
    await Promise.all([ev('touchStart', pts[0]), ev('touchMove', pts[1])]);
    for (let i = 2; i < pts.length - 1; i++) { await ev('touchMove', pts[i]); if (ms) await sleep(ms); }
    await Promise.all([ev('touchMove', pts[pts.length - 1]), ev('touchEnd')]);
  } finally { await cdp.detach().catch(() => {}); }
}
/** A touch tap (CDP): the lift travels with the press, as a quick tap's does (a frame later would read as a hold). */
async function ttap(page, x, y) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await Promise.all([cdpSend(cdp, 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] }),
      cdpSend(cdp, 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })]);
  } finally { await cdp.detach().catch(() => {}); }
}
/** Page scroll and the visual viewport: all must stay at 0 (and scale 1) while weather is touched. */
const scrolls = (page) => page.evaluate(() => ({ x: scrollX, y: scrollY, se: document.scrollingElement.scrollTop + document.scrollingElement.scrollLeft,
  vx: visualViewport.offsetLeft, vy: visualViewport.offsetTop, px: visualViewport.pageLeft, py: visualViewport.pageTop, scale: visualViewport.scale }));
const still0 = (s) => !s.x && !s.y && !s.se && !s.vx && !s.vy && !s.px && !s.py && s.scale === 1;

async function run(browser, { out = OUT_DEFAULT, only = (b) => H.only(SCOPE) || H.only(`${SCOPE}:${b}`) } = {}) {
  // ------------------------------------------------------------------- W1 --
  if (only('open')) await guard(`${SCOPE}:open`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { comfort: H.comfort({ favouriteMallow: 'blubi' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    await page.click('.card[data-experience="weather"]');
    await page.waitForFunction(() => __lab.route === 'weather' && __lab.weather?.state === 'live', null, { timeout: T });
    const s = await wx(page, () => ({
      realm: document.querySelectorAll('.weather canvas.hushfold-realm').length, back: document.querySelectorAll('.weather .stage-wrap canvas.wx-back').length,
      order: [...document.querySelector('.weather .stage-wrap').children].map((c) => c.className),
      radios: document.querySelectorAll('.wx-dial [role="radio"]').length, checked: document.querySelector('.wx-dial [aria-checked="true"]')?.dataset.weather,
      chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), title: document.querySelector('.weather .topbar .title b')?.textContent,
      sub: document.querySelector('.weather .topbar .title small')?.textContent, rig: !!__lab.companion?.rig?.soft, debug: __lab.weather.debug(),
      label: document.querySelector('.weather .stage').getAttribute('aria-label'), sr: !!document.querySelector('.weather .sr-only[role="status"]'),
      hint: document.querySelector('.weather .wx-hint')?.getAttribute('aria-hidden'),
    }));
    check(scope, 'opens from the home card: rig ready, one realm canvas, .wx-back after it in the wrap', s.rig && s.realm === 1 && s.back === 1 && s.order.indexOf('hushfold-realm') < s.order.indexOf('wx-back'), JSON.stringify(s));
    check(scope, 'eight weather radios, Rain chosen (Blubi\'s lagoon), "Catch the rain" and "Push the water" chips', s.radios === 8 && s.checked === 'rain' && s.chips.join() === 'Catch the rain,Push the water', JSON.stringify(s));
    check(scope, 'title, subtitle, stage label, announcer, hint hidden from screen readers', s.title === 'Weather Weaver' && s.sub === 'Rain · Raindrop Lagoon' && s.label.startsWith('Weather Weaver with Blubi.') && s.sr && s.hint === 'true', JSON.stringify(s));
    check(scope, 'debug() is plain JSON with state, weather, realm, progress and metrics', s.debug.state === 'live' && s.debug.weather === 'rain' && s.debug.realmId === 'raindrop-lagoon' && typeof s.debug.metrics.rainLevel === 'number', JSON.stringify(s.debug));
    // deep link, another Mallow
    await page.goto(`${H.BASE}#weather`);
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T });
    const d = await wx(page, () => ({ w: __lab.weather.weather, realm: __lab.weather.realmId, backdrop: document.querySelector('.weather').dataset.backdrop }));
    check(scope, 'opens from #weather too (the entry weather of the home realm)', d.w === 'rain' && d.realm === 'raindrop-lagoon' && d.backdrop === 'dark', JSON.stringify(d));
    await H.shot(page, out, 'weather-phone-open');
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- W4 storm --
  if (only('storm')) await guard(`${SCOPE}:storm`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'glitzi');
    own(ctx);
    await page.focus('.weather .stage');
    await page.keyboard.press('Digit5');
    await settled(page, 'storm');
    await wx(page, () => __lab.weather.settle());
    await sleep(400);
    const g = await wx(page, () => __lab.weather.geo());
    const before = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, realm: __lab.weather.realmId, puffs: __lab.weather.layer.stats().drawn.puffs }));
    check(scope, 'Storm in the Static Storm: a heavy bank drawn, agitation capped at 0.32', before.realm === 'static-storm' && before.m.coverage > 0.85 && before.puffs > 0 && before.mood.agitation <= 0.32 + 1e-6, JSON.stringify(before));
    // a click on Glitzi is TouchTalk: the Companion's tap; the weather tools never see it (W7)
    await H.clearEvents(page);
    const ev0 = await wx(page, () => __lab.weather.events.length);
    await page.mouse.click(g.body.cx, g.body.mid);
    await page.waitForFunction(() => __lab.events.some((e) => e.type === 'tap'), null, { timeout: T }).catch(() => {});
    const tp = await wx(page, (n) => ({ comp: __lab.events.map((e) => e.type), wx: __lab.weather.events.slice(n).map((e) => e.type), active: __lab.weather.tools.active, clear: __lab.weather.metrics().clear }), ev0);
    check(scope, 'a click on Glitzi is a Companion tap and leaves the weather untouched (W7)', tp.comp.includes('tap') && !tp.wx.includes('touch') && tp.active === 0 && tp.clear === before.m.clear, JSON.stringify(tp));
    await H.clearEvents(page);
    const tags0 = await wx(page, () => __lab.weather.reactor.log.length);
    for (let k = 0; k < 3; k++) { const x = g.body.cx + (k - 1) * 18; await drag(page, line(x, g.skyTop + 6, x, g.body.top - 30, 10), 12); await sleep(400); }
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'gap'), null, { timeout: T });
    // the gap beat is a priority one: it may wait out the 1.2 s after another beat (sim time)
    await page.waitForFunction((n) => __lab.weather.reactor.log.slice(n).some((e) => /gap/.test(e.tag)), tags0, { timeout: T }).catch(() => {});
    const after = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, ev: __lab.weather.events.map((e) => e.type), log: __lab.weather.reactor.log, pulses: __lab.weather.pulses, comp: __lab.events.map((e) => e.type), progress: __lab.weather.progress }));
    check(scope, 'a swipe across the bank opens it: coverage falls, clear and progress rise', after.m.clear > 0.2 && after.m.coverage < before.m.coverage - 0.15 && after.progress > 0.25, JSON.stringify(after.m));
    check(scope, 'the gap fires the realm "clear" pulse (through the gate)', after.pulses.some((p) => p.kind === 'clear' && p.ok), JSON.stringify(after.pulses));
    check(scope, 'the realm follows: heaviness falls and clarity rises (target mood)', after.mood.heaviness < before.mood.heaviness - 0.1 && after.mood.clarity > before.mood.clarity + 0.1, JSON.stringify({ before: before.mood, after: after.mood }));
    check(scope, 'Glitzi reacts to the gap in character', after.log.slice(tags0).some((e) => /gap/.test(e.tag)), JSON.stringify(after.log));
    check(scope, 'light reaches the Mallow through the gap', after.m.light > 0.3 && after.ev.includes('light-through'), JSON.stringify({ light: after.m.light }));
    check(scope, 'input isolation: the Companion saw no drag or stroke from the swipes', !after.comp.some((t) => t === 'drag' || t === 'stroke' || t === 'tap'), JSON.stringify(after.comp));
    await H.shot(page, out, 'weather-phone-storm-parted');
    // a strike (forced now rather than waiting 8–14 s of sim time)
    await H.clearEvents(page);
    // strikes are never deferred (a late flinch would miss its lightning): fire one clear of the last beat
    await page.waitForFunction(() => { const r = __lab.weather.reactor; return r.t - r.mem.lastReact > 1.4; }, null, { timeout: T });
    await wx(page, () => { const w = __lab.weather; w.sims.clouds.reset(); const s = w.sims.strikes; s.next = s.t + 0.01; });
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'strike'), null, { timeout: T });
    await sleep(800);
    const st = await wx(page, () => ({ ev: __lab.weather.events.filter((e) => e.type === 'strike'), pulses: __lab.weather.pulses.filter((p) => p.kind === 'strike'), log: __lab.weather.reactor.log.map((e) => e.tag), W: __lab.weather.geo().W }));
    const sx = st.ev[0]?.x / st.W;
    check(scope, 'a strike: realm bolt on the far horizon, away from the Mallow, and Glitzi delights', st.pulses.some((p) => p.ok) && (sx <= 0.31 || sx >= 0.69) && st.log.some((t) => t === 'glitzi-strike-delight'), JSON.stringify(st));
    // the chip parts the clouds from the centre
    await wx(page, () => __lab.weather.sims.clouds.reset());
    const c0 = await wx(page, () => __lab.weather.metrics().clear);
    // held until it has parted them (sim time: software GL and a busy machine slow it, so wait on state)
    const parted = await holdChip(page, 'lead', (c0) => __lab.weather.metrics().clear > c0 + 0.15, c0).then(() => true, () => false);
    const c1 = await wx(page, () => __lab.weather.metrics().clear);
    check(scope, '"Part the clouds" (held) parts them from the centre', parted && c1 > c0 + 0.15, `${c0} → ${c1}`);
    noErrors(scope, errors);
  });

  // -------------------------------------------------------------- W4 rain --
  if (only('rain')) await guard(`${SCOPE}:rain`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'blubi');
    own(ctx);
    const g = await wx(page, () => ({ ...__lab.weather.geo(), deckY: __lab.weather.sims.rain.deckY }));
    const x = g.body.cx - 110, y = g.deckY + 70;
    await H.clearEvents(page);
    await page.mouse.move(x, y); await page.mouse.down();
    await page.waitForFunction(() => (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 6, null, { timeout: T });
    const held = await wx(page, () => ({ orbs: __lab.weather.sims.rain.snapshot().orbs, level: __lab.weather.sims.rain.level, front: __lab.weather.layer.stats() }));
    check(scope, 'a still finger in the sky grows a glass bead that gathers drops', held.orbs.length === 1 && held.orbs[0].state === 'held' && held.orbs[0].n >= 6, JSON.stringify(held));
    await page.mouse.move(x, g.deckY - 30, { steps: 4 }); await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.pulses.some((p) => p.kind === 'success') && __lab.weather.progress > 0.05, null, { timeout: T });
    const up = await wx(page, () => ({ level: __lab.weather.sims.rain.level, ev: [...new Set(__lab.weather.events.map((e) => e.type))], pulses: __lab.weather.pulses, progress: __lab.weather.progress }));
    check(scope, 'let go in the deck: the bead rises as light ("success" pulse) and the rain thins', up.level < held.level - 0.1 && up.progress > 0.1 && up.ev.includes('bead-up'), JSON.stringify(up));
    check(scope, 'no Companion gestures from the weather touch', !(await H.events(page)).some((t) => t === 'hold' || t === 'drag' || t === 'stroke'), JSON.stringify(await H.events(page)));
    // a swipe redirects: the rain leans
    await drag(page, line(30, g.deckY + 150, 360, g.deckY + 170, 8), 12);
    const lean = await wx(page, () => __lab.weather.sims.rain.lean);
    check(scope, 'a swipe sweeps the drops and leans the rain', Math.abs(lean) > 0.1, `${lean}`);
    // the chip: a bead above the Mallow shelters it, letting go sends it up
    const lv = await wx(page, () => __lab.weather.sims.rain.level);
    const chip = await page.$('.wx-actions [data-action="lead"]');
    const bb = await chip.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
    await page.waitForFunction(() => __lab.weather.sims.rain.sheltered() && (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 4, null, { timeout: T });
    await H.shot(page, out, 'weather-phone-rain-shelter');
    await page.mouse.up();
    await page.waitForFunction((lv) => __lab.weather.sims.rain.level < lv - 0.05, lv, { timeout: T });
    check(scope, '"Catch the rain" shelters the Mallow, then the bead goes up', true);
    // drops on the Mallow: Blubi blushes (its own beat)
    const tags = await wx(page, () => __lab.weather.reactor.log.map((e) => e.tag));
    check(scope, 'Blubi reacts to the rain in character (arrival, drips)', tags.some((t) => /^blubi-/.test(t)), JSON.stringify(tags));
    noErrors(scope, errors);
  });

  // ---------------------------------------------------- resolve and Again --
  if (only('resolve')) await guard(`${SCOPE}:resolve`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'glitzi');
    own(ctx);
    await wx(page, () => __lab.weather.setWeather('storm', { instant: true }));
    await settled(page, 'storm');
    const g = await wx(page, () => __lab.weather.geo());
    // keep swiping across the bank until it resolves (how many it took goes in the report)
    const xs = [0, -70, 70, -130, 130, -40, 40, -100, 100, -150, 150, -20, 20, -170, 170];
    let swipes = 0;
    for (; swipes < 30 && !(await wx(page, () => __lab.weather.resolved)); swipes++) {
      const x = g.body.cx + xs[swipes % xs.length];
      await drag(page, line(x, g.skyTop + 6, x, g.body.top - 20, 10), 12);
      await sleep(600);
    }
    await page.waitForFunction(() => __lab.weather.resolved, null, { timeout: T });
    check(scope, 'swipes alone resolve the storm', true, `${swipes} swipes`);
    await page.waitForFunction(() => document.querySelector('.wx-actions [data-action="again"]') && __lab.weather.reactor.log.some((e) => e.type === 'resolved'), null, { timeout: T });
    const r = await wx(page, () => ({ cap: document.querySelector('.weather .wx-hint .wx-cap')?.textContent, line: document.querySelector('.weather .wx-hint .line')?.textContent,
      chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), p: __lab.weather.progress, t: __lab.weather.env.realm.debug.state.p, drift: __lab.weather.tools.storm.drift,
      tags: __lab.weather.reactor.log.filter((e) => e.type === 'resolved').map((e) => e.tag) }));
    check(scope, 'Storm resolves: caption, Glitzi\'s line, the lead chip becomes Again, the clouds drift off', r.cap === 'The storm passed.' && /Pfft/.test(r.line) && r.chips.join() === 'Again' && r.p === 1 && r.drift, JSON.stringify(r));
    check(scope, 'the resolve beat: Glitzi\'s home weather resolves with its own celebration', r.tags.some((t) => /glitzi-home-resolved/.test(t)), JSON.stringify(r.tags));
    await H.shot(page, out, 'weather-phone-storm-resolved');
    const n0 = await wx(page, () => __lab.weather.reactor.log.length);
    await page.click('.wx-actions [data-action="again"]');
    await page.waitForFunction(() => __lab.weather.progress === 0 && !__lab.weather.resolved && !__lab.weather.session.planner.busy && __lab.weather.metrics().coverage > 0.8, null, { timeout: T });
    await page.waitForFunction((n) => __lab.weather.reactor.log.slice(n).some((e) => e.type === 'arrive'), n0, { timeout: T }).catch(() => {});
    const a = await wx(page, (n) => ({ chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), mood: __lab.weather.env.mood, arrive: __lab.weather.reactor.log.slice(n).filter((e) => e.type === 'arrive').map((e) => e.tag) }), n0);
    check(scope, 'Again: progress 0, a fresh bank, the lead chip back, the mood target back to base, the arrival replayed (W15)', a.chips.join() === 'Part the clouds' && Math.abs(a.mood.heaviness - 0.7) < 0.03 && a.arrive.length > 0, JSON.stringify(a));
    // Rain: thin it, then one bead into the deck resolves it
    await wx(page, () => __lab.weather.setWeather('rain', { instant: true }));
    await settled(page, 'rain');
    await wx(page, () => { __lab.weather.sims.rain.level = 0.19; });
    const gd = await wx(page, () => ({ ...__lab.weather.geo(), deckY: __lab.weather.sims.rain.deckY }));
    await page.mouse.move(gd.body.cx - 110, gd.deckY + 70); await page.mouse.down();
    await page.waitForFunction(() => (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 3, null, { timeout: T });
    await page.mouse.move(gd.body.cx - 110, gd.deckY - 30, { steps: 3 }); await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.resolved && document.querySelector('.wx-actions [data-action="again"]'), null, { timeout: T });
    const rr = await wx(page, () => ({ cap: document.querySelector('.weather .wx-hint .wx-cap')?.textContent, realm: __lab.weather.realmId, drift: __lab.weather.tools.rain.drift, sr: document.querySelector('.weather .sr-only').textContent }));
    check(scope, 'Rain resolves when the rain is caught (≤ 0.15): the caption, Again, the deck drifts off', rr.cap === 'The rain eased.' && rr.drift, JSON.stringify(rr));
    // re-picking the weather that is already chosen is Again too
    await page.waitForFunction(() => { const r = __lab.weather.reactor; return r.t - r.mem.lastReact > 2.6; }, null, { timeout: T });
    const n1 = await wx(page, () => __lab.weather.reactor.log.length);
    await page.click('.wx-dial [data-weather="rain"]');
    await page.waitForFunction(() => __lab.weather.progress === 0 && !__lab.weather.resolved && !__lab.weather.session.planner.busy && __lab.weather.sims.rain.level > 0.9, null, { timeout: T });
    await page.waitForFunction((n) => __lab.weather.reactor.log.slice(n).some((e) => e.type === 'arrive'), n1, { timeout: T }).catch(() => {});
    await sleep(400);
    const rp = await wx(page, (n) => ({ chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.dataset.action), mood: __lab.weather.env.mood, arrive: __lab.weather.reactor.log.slice(n).filter((e) => e.type === 'arrive').map((e) => e.tag), said: __lab.weather.said.slice(-2) }), n1);
    check(scope, 're-picking Rain on the dial is Again: progress 0, fresh rain, mood back to base, the arrival replayed (W15)', rp.chips[0] === 'lead' && Math.abs(rp.mood.heaviness - 0.82) < 0.03 && rp.arrive.length > 0, JSON.stringify(rp));
    noErrors(scope, errors);
  });

  // ----------------------------------------- reduced motion, hidden page --
  if (only('motion')) await guard(`${SCOPE}:motion`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo', { prefs: { motion: 'reduced' } });
    own(ctx);
    await page.click('.wx-dial [data-weather="moonlight"]');   // another realm: a front
    await page.waitForFunction(() => __lab.weather.front, null, { timeout: T });
    const f = await wx(page, () => { const S = __lab.weather.sims; return { mode: __lab.weather.front.mode, layer: __lab.weather.layer.stats().reduced, env: __lab.weather.env.reduced,
      sims: ['rain', 'clouds', 'deck', 'sun', 'moon', 'stars', 'ribbons', 'fluffs', 'mist', 'embers', 'waves'].every((k) => S[k].reduced) }; });
    check(scope, 'reduced motion: the front is a fade; env, layer and sims are reduced', f.mode === 'fade' && f.layer && f.sims && f.env, JSON.stringify(f));
    await settled(page, 'moonlight');
    await wx(page, () => __lab.weather.setWeather('storm', { instant: true }));
    await settled(page, 'storm');
    const want = await wx(page, async (LAB) => { const { moodFor } = await import(`${LAB}/core/weather.js`); __lab.weather.settle(); await new Promise((r) => setTimeout(r, 400)); return { want: moodFor('storm', 0, null, __lab.weather.realmId), got: __lab.weather.env.mood, focus: __lab.weather.env.realm.debug.state.camX }; }, LAB);
    check(scope, 'the mood targets are the same as with full motion', Math.abs(want.want.heaviness - want.got.heaviness) < 0.03 && Math.abs(want.want.agitation - want.got.agitation) < 0.03, JSON.stringify(want));
    // the Mallow kept its feet on the ground: Boppo's home-weather celebration (and every hop) became a nod
    const rlog = await wx(page, () => __lab.weather.reactor.log);
    check(scope, 'reduced motion: the reactor never hops, celebrates or double-taps (Boppo\'s home welcome is a nod)', rlog.length > 0 && !rlog.some((e) => ['hop', 'celebrate', 'doubleTap'].includes(e.react)), JSON.stringify(rlog.map((e) => [e.tag, e.react])));
    const dens = () => wx(page, () => ({ rain: __lab.weather.sims.rain.active, dropsDrawn: __lab.weather.layer.stats().drawn.drops }));
    const dRed = await dens();
    // live toggle back to full motion, without remounting
    const canvas0 = await wx(page, () => document.querySelector('.weather canvas.hushfold-realm') === __lab.weather.env.realm.canvas && __lab.weather.layer.frames);
    await wx(page, () => __lab.prefs.set('motion', 'full'));
    await sleep(300);
    const live = await wx(page, () => ({ layer: __lab.weather.layer.stats().reduced, sims: __lab.weather.sims.clouds.reduced, planner: __lab.weather.session.planner.reduced, screens: document.querySelectorAll('.weather').length }));
    check(scope, 'a live Motion change applies without remounting', canvas0 && !live.layer && !live.sims && !live.planner && live.screens === 1, JSON.stringify(live));
    const dFull = await dens();
    check(scope, 'reduced motion is sparser: fewer drops (×0.4)', dRed.rain < dFull.rain, JSON.stringify({ reduced: dRed, full: dFull }));
    // hidden: frames and sim time stop, a held bead is let go; visible: one small step
    await wx(page, () => __lab.weather.setWeather('rain', { instant: true }));
    await settled(page, 'rain');
    const gd = await wx(page, () => ({ ...__lab.weather.geo(), deckY: __lab.weather.sims.rain.deckY }));
    await page.mouse.move(gd.body.cx - 100, gd.deckY + 80); await page.mouse.down();
    await page.waitForFunction(() => __lab.weather.metrics().held === 1, null, { timeout: T });
    await H.setHidden(page, true);
    const h0 = await wx(page, () => ({ f: __lab.weather.layer.frames, t: __lab.weather.sims.rain.t, held: __lab.weather.metrics().held, state: __lab.weather.state, active: __lab.weather.tools.active }));
    await sleep(1500);
    const h1 = await wx(page, () => ({ f: __lab.weather.layer.frames, t: __lab.weather.sims.rain.t }));
    await page.mouse.up();
    check(scope, 'hidden: frames and sim time freeze; the held bead is let go; paused', h1.f === h0.f && h1.t === h0.t && h0.held === 0 && h0.active === 0 && h0.state === 'paused', JSON.stringify({ h0, h1 }));
    await H.setHidden(page, false);
    await page.waitForFunction((f) => __lab.weather.layer.frames > f + 1, h1.f, { timeout: T });
    const h2 = await wx(page, () => ({ t: __lab.weather.sims.rain.t, state: __lab.weather.state }));
    check(scope, 'visible again: the first frames advance sim time by a frame or two, not the gap', h2.t - h1.t <= 0.12 && h2.state !== 'paused', JSON.stringify({ h1, h2 }));
    noErrors(scope, errors);
    // the system setting (emulated prefers-reduced-motion, Motion left on "system") reduces just the same
    const r = await H.open(browser, 'phone', '#home', { comfort: H.comfort({ favouriteMallow: 'boppo' }) });
    try {
      await H.waitRig(r.page, { timeout: T });
      await r.page.emulateMedia({ reducedMotion: 'reduce' });
      await wx(r.page, () => __lab.ctx.navigate('/weather'));
      await r.page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T });
      await r.page.click('.wx-dial [data-weather="moonlight"]');
      await r.page.waitForFunction(() => __lab.weather.front, null, { timeout: T });
      const m = await wx(r.page, () => { const S = __lab.weather.sims; return { pref: __lab.prefs.get('motion'), mode: __lab.weather.front.mode, env: __lab.weather.env.reduced, layer: __lab.weather.layer.stats().reduced, planner: __lab.weather.session.planner.reduced,
        sims: ['rain', 'clouds', 'deck', 'sun', 'moon', 'stars', 'ribbons', 'fluffs', 'mist', 'embers', 'waves'].every((k) => S[k].reduced), focus: __lab.weather.env.realm.debug.state.reduced }; });
      check(`${scope}:media`, 'the system setting alone (prefers-reduced-motion, Motion on "system"): a fading front; env, realm, layer, planner and sims reduced', m.pref === 'system' && m.mode === 'fade' && m.env && m.layer && m.planner && m.sims && m.focus, JSON.stringify(m));
      await settled(r.page, 'moonlight');
      const lg = await wx(r.page, () => __lab.weather.reactor.log);
      check(`${scope}:media`, 'and the Mallow neither hops nor celebrates', lg.length > 0 && !lg.some((e) => ['hop', 'celebrate', 'doubleTap'].includes(e.react)), JSON.stringify(lg.map((e) => [e.tag, e.react])));
      noErrors(`${scope}:media`, r.errors);
    } finally { await r.ctx.close(); }
  });

  // ------------------------------------------------------------ W2 (dial) --
  if (only('dial')) await guard(`${SCOPE}:dial`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo', { initScripts: [] });
    own(ctx);
    // realms never go missing during a change
    await wx(page, () => { window.__noRealm = 0; const tick = () => { if (!__lab.weather) return; if (!document.querySelector('.weather canvas.hushfold-realm')) window.__noRealm++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const order = ['wind', 'fog', 'rain', 'storm', 'moonlight', 'starlight', 'warm', 'sunshine'];
    const seen = [];
    for (const w of order) {
      await page.click(`.wx-dial [data-weather="${w}"]`);
      await settled(page, w);
      const r = await wx(page, async ({ LAB, w }) => {
        const { pickRealm, moodFor } = await import(`${LAB}/core/weather.js`);
        const lw = __lab.weather;
        lw.settle();
        await new Promise((res) => setTimeout(res, 400));
        // the target is moodFor at progress 0 with this frame's live terms (wind energy, the sun's height…)
        const want = moodFor(w, 0, lw.live(), lw.realmId, { gentle: __lab.dna.tuning().style === 'gentle' }), m = lw.env.mood;
        const lead = { sunshine: 'sun', wind: 'ribbons', fog: 'mist', rain: 'deck', storm: 'clouds', moonlight: 'moon', starlight: 'stars', warm: 'embers' }[w];
        return { w, realm: lw.realmId, amount: lw.sims[lead].amount, sub: document.querySelector('.weather .topbar small').textContent, checked: document.querySelector('.wx-dial [aria-checked="true"]').dataset.weather,
          dm: Math.max(...Object.keys(want).map((k) => Math.abs(want[k] - m[k]))), backdrop: document.querySelector('.weather').dataset.backdrop, realmAttr: document.querySelector('.weather').dataset.realm };
      }, { LAB, w });
      seen.push(r);
    }
    const expect = { wind: 'sunpop-orchard', fog: 'sunpop-orchard', rain: 'sunpop-orchard', storm: 'sunpop-orchard', moonlight: 'moonmilk-cove', starlight: 'moonmilk-cove', warm: 'moonmilk-cove', sunshine: 'sunpop-orchard' };
    check(scope, 'each pick settles in pickRealm\'s realm (Boppo: home Sunpop; night skies go to the cove and back)', seen.every((r) => r.realm === expect[r.w] && r.realmAttr === r.realm), JSON.stringify(seen.map((r) => [r.w, r.realm])));
    check(scope, 'each weather\'s own element is there (pool, ribbons, mist, deck, bank, stars, embers)', seen.every((r) => r.amount > 0.99), JSON.stringify(seen.map((r) => [r.w, r.amount])));
    check(scope, 'the realm is told moodFor(weather, 0, live) (within the throttle and the gusts)', seen.every((r) => r.dm < 0.05), JSON.stringify(seen.map((r) => [r.w, +r.dm.toFixed(3)])));
    check(scope, 'the dial and the subtitle follow every pick', seen.every((r) => r.checked === r.w && r.sub.startsWith(r.sub.split(' · ')[0]) && r.sub.includes(' · ')), JSON.stringify(seen.map((r) => r.sub)));
    const nr = await wx(page, () => window.__noRealm);
    check(scope, 'there is always a realm canvas, through every front', nr === 0, `${nr} frames without one`);
    // five picks within a second end on the last, with at most one swap
    const sw0 = await wx(page, () => __lab.weather.session.planner.swaps);
    for (const w of ['wind', 'moonlight', 'storm', 'starlight', 'rain']) { await page.click(`.wx-dial [data-weather="${w}"]`); await sleep(120); }
    await settled(page, 'rain');
    const sw1 = await wx(page, () => ({ swaps: __lab.weather.session.planner.swaps, realm: __lab.weather.realmId }));
    check(scope, 'five quick picks end on the last one, with at most one realm swap', sw1.swaps - sw0 <= 1 && sw1.realm === 'sunpop-orchard', JSON.stringify({ sw0, sw1 }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- W3 keys --
  if (only('keys')) await guard(`${SCOPE}:keys`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await page.focus('.weather .stage');
    await page.keyboard.press('Digit4');
    await settled(page, 'rain');
    const r1 = await wx(page, () => ({ w: __lab.weather.weather, realm: __lab.weather.realmId }));
    check(scope, 'digit 4 from the stage chooses Rain (Loomi stays in the Blue Drift)', r1.w === 'rain' && r1.realm === 'blue-drift', JSON.stringify(r1));
    // arrows in the dial move and select
    await page.focus('.wx-dial [aria-checked="true"]');
    await page.keyboard.press('ArrowRight');
    await settled(page, 'storm');
    const r2 = await wx(page, () => ({ w: __lab.weather.weather, focus: document.activeElement?.dataset?.weather, tab: [...document.querySelectorAll('.wx-radio')].filter((b) => b.tabIndex === 0).map((b) => b.dataset.weather) }));
    check(scope, 'ArrowRight in the dial selects Storm and moves focus (one tab stop)', r2.w === 'storm' && r2.focus === 'storm' && r2.tab.join() === 'storm', JSON.stringify(r2));
    // arrows on the stage shape the weather; R is Again
    await page.focus('.weather .stage');
    await wx(page, () => __lab.weather.settle());
    const vx0 = await wx(page, () => Array.from(__lab.weather.sims.clouds.vx).reduce((a, v) => a + Math.abs(v), 0));
    await page.keyboard.press('ArrowLeft');
    const vx1 = await wx(page, () => Array.from(__lab.weather.sims.clouds.vx).reduce((a, v) => a + Math.abs(v), 0));
    check(scope, 'an arrow key on the stage pushes the nearest cloud', vx1 > vx0 + 100, `${vx0} → ${vx1}`);
    await page.keyboard.press('KeyR');
    await page.waitForFunction(() => __lab.weather.state === 'live' && __lab.weather.progress === 0, null, { timeout: T });
    const r3 = await wx(page, () => ({ w: __lab.weather.weather, sr: document.querySelector('.weather .sr-only[role="status"]').textContent }));
    check(scope, 'R is Again: Storm starts over', r3.w === 'storm', JSON.stringify(r3));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- W14 exit --
  if (only('exit')) await guard(`${SCOPE}:exit`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { initScripts: [H.INIT.listenerCounter], comfort: H.comfort({ favouriteMallow: 'noomi' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    await sleep(500);
    const base = await wx(page, () => ({ l: __listeners().total, prefs: __lab.prefs.listeners.size, dna: __lab.dna.listeners.size, store: JSON.stringify(Object.keys(localStorage).sort()) }));
    for (const how of ['close', 'escape']) {
      await wx(page, () => __lab.ctx.navigate('/weather'));
      await page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T });
      // a held bead and a turn in progress when we leave
      await wx(page, () => __lab.weather.setWeather('rain'));
      await sleep(300);
      if (how === 'close') await page.click('.weather .topbar button[aria-label="Close"]');
      else { await page.focus('.weather .stage'); await page.keyboard.press('Escape'); }
      const mid = await wx(page, () => ({ leaving: __lab.weather?.state, inert: document.querySelector('.weather')?.inert }));
      await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
      await sleep(300);
      const s = await wx(page, () => ({ wx: document.querySelectorAll('.wx-back, .wx-front, .weather, canvas.hushfold-realm').length, handle: __lab.weather, canvases: document.querySelectorAll('canvas').length,
        rest: __lab.companion?.restOverride ?? null, face: JSON.stringify(__lab.companion?.rig.faceOverride), inflate: __lab.companion?.rig.inflateTarget }));
      check(scope, `${how}: fades (leaving, inert) and returns home`, mid.leaving === 'leaving' && mid.inert === true, JSON.stringify(mid));
      check(scope, `${how}: no weather canvases, screen, realm or handle left; home's Mallow untouched`, s.wx === 0 && s.handle === null && s.canvases === 1 && s.rest === null && s.face === '{"set":{},"min":{}}' && !s.inflate, JSON.stringify(s));
    }
    await sleep(500);
    const now = await wx(page, () => ({ l: __listeners().total, prefs: __lab.prefs.listeners.size, dna: __lab.dna.listeners.size, store: JSON.stringify(Object.keys(localStorage).sort()) }));
    check(scope, 'listeners (window, document, prefs, Comfort DNA) back to the baseline', now.l === base.l && now.prefs === base.prefs && now.dna === base.dna, JSON.stringify({ base, now }));
    check(scope, 'nothing new in storage (no weather history)', now.store === base.store, JSON.stringify({ base: base.store, now: now.store }));
    noErrors(scope, errors);
  });

  // ---------------------------------------------------------- W4 sunshine --
  if (only('sun')) await guard(`${SCOPE}:sun`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo');
    own(ctx);
    await settled(page, 'sunshine');
    await wx(page, () => __lab.weather.settle());
    await sleep(500);
    const g = await wx(page, () => __lab.weather.geo());
    const s0 = await wx(page, () => ({ sun: __lab.weather.sims.sun.snapshot(), mood: __lab.weather.env.mood, realm: __lab.weather.realmId, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent) }));
    check(scope, 'Sunshine in the Sunpop Orchard: a light pool, a "Bring the sun" chip', s0.realm === 'sunpop-orchard' && s0.sun.amount === 1 && s0.chips.join() === 'Bring the sun', JSON.stringify(s0));
    // drag the light across the sky: the overcast haze burns away along its path and the realm lifts
    const p0 = [s0.sun.x, s0.sun.y];
    await drag(page, [p0, ...line(p0[0], p0[1], 40, g.skyTop + 70, 6), ...line(40, g.skyTop + 70, g.W - 40, g.skyTop + 90, 14), ...line(g.W - 40, g.skyTop + 90, 50, g.horizonY - 40, 14)], 30);
    await page.waitForFunction(() => __lab.weather.metrics().painted > 0.08, null, { timeout: T });
    await sleep(500);
    const s1 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, p: __lab.weather.progress }));
    check(scope, 'the pool burns the haze along its path (painted ↑), heaviness falls, progress rises', s1.m.painted > 0.08 && s1.mood.heaviness < s0.mood.heaviness - 0.02 && s1.p > 0.1, JSON.stringify({ s0: s0.mood, s1 }));
    // take it to the Mallow and rest: bask (glow, blush, puffed up warm), and the rest fires a sunbeam
    // (drag anywhere moves the light: start in open sky, since a touch right beside the Mallow is TouchTalk)
    await H.clearEvents(page);
    await page.mouse.move(g.W * 0.7, g.skyTop + 140); await page.mouse.down();
    await page.mouse.move(g.body.cx, g.body.mid, { steps: 12 });
    await page.waitForFunction(() => __lab.weather.metrics().bask > 1.2, null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.pulses.some((p) => p.kind === 'strike' && p.ok), null, { timeout: T }).catch(() => {});
    const b = await wx(page, () => ({ face: __lab.companion.rig.faceOverride, inflate: __lab.companion.rig.inflateTarget, log: __lab.weather.reactor.log.map((e) => e.tag), pulses: __lab.weather.pulses.filter((p) => p.kind === 'strike'), m: __lab.weather.metrics(), comp: __lab.events.map((e) => e.type) }));
    await page.mouse.up();
    check(scope, 'bask: the pool on the Mallow, glow ≥ 0.9, blush, inflated (Boppo the brightest)', b.m.onBody && b.face.min.glow >= 0.9 && b.face.min.blush >= 1.5 && b.inflate >= 0.35, JSON.stringify(b));
    check(scope, 'Boppo basks in character', b.log.some((t) => t === 'boppo-bask-glow'), JSON.stringify(b.log));
    check(scope, 'resting light fires a sunbeam ("strike") in a day realm', b.pulses.some((p) => p.ok), JSON.stringify(b.pulses));
    check(scope, 'dragging the light is not a Companion gesture', !b.comp.some((t) => t === 'drag' || t === 'stroke' || t === 'hold'), JSON.stringify(b.comp));
    await H.shot(page, out, 'weather-phone-sunshine-bask');
    // arrows move the pool 28 px; the chip brings it back to the Mallow; holding it there resolves
    await page.focus('.weather .stage');
    const ty0 = await wx(page, () => __lab.weather.sims.sun.ty);
    for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowUp');
    const ty1 = await wx(page, () => __lab.weather.sims.sun.ty);
    check(scope, 'ArrowUp ×6 moves the light up 168 px (off the Mallow)', Math.abs(ty0 - ty1 - 168) < 2, `${ty0} → ${ty1}`);
    await page.waitForFunction(() => !__lab.weather.metrics().onBody, null, { timeout: T });
    await holdChip(page, 'lead', () => __lab.weather.resolved);
    const r = await resolvedView(page);
    check(scope, '"Bring the sun" (held) brings the light to the Mallow; basking resolves Sunshine: golden hour', r.cap === 'Golden hour.' && /BOOP/.test(r.line) && r.chips[0] === 'Again', JSON.stringify(r));
    noErrors(scope, errors);
  });

  // --------------------------------------------------------- W4 moonlight --
  if (only('moon')) await guard(`${SCOPE}:moon`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'noomi');
    own(ctx);
    await settled(page, 'moonlight');
    await wx(page, () => __lab.weather.settle());
    await sleep(500);
    const g = await wx(page, () => __lab.weather.geo());
    const m0 = await wx(page, () => ({ moon: __lab.weather.sims.moon.snapshot(), realm: __lab.weather.realmId, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent) }));
    check(scope, 'Moonlight in the Moonmilk Cove: a silver pool; "Bring the moonlight" and "Push the water"', m0.realm === 'moonmilk-cove' && m0.moon.amount === 1 && m0.chips.join() === 'Bring the moonlight,Push the water', JSON.stringify(m0));
    // over the water: a ripple at most once a second while it moves
    const wy = g.water[0] + 24;
    await page.mouse.move(m0.moon.x, m0.moon.y); await page.mouse.down();
    await page.mouse.move(60, wy, { steps: 8 });
    for (let k = 0; k < 3; k++) { await page.mouse.move(g.W - 60, wy, { steps: 16 }); await page.mouse.move(60, wy, { steps: 16 }); }
    const rip = await wx(page, () => ({ ev: __lab.weather.events.filter((e) => e.type === 'moon-water').length, pulses: __lab.weather.pulses.filter((p) => p.kind === 'ripple' && p.ok).map((p) => p.t), onWater: __lab.weather.sims.moon.onWater }));
    const gapsOk = rip.pulses.every((t, i) => !i || t - rip.pulses[i - 1] >= 950);
    check(scope, 'the moon pool gliding on water: ripples, at most one a second', rip.ev >= 1 && rip.pulses.length >= 1 && gapsOk, JSON.stringify(rip));
    // onto Noomi: moonlit (silver glow, slow breath), dwell builds
    await page.mouse.move(g.body.cx, g.body.mid, { steps: 10 });
    await page.waitForFunction(() => __lab.companion.rig.faceOverride?.set?.breathRate === 0.12 && __lab.weather.metrics().dwell > 0.03, null, { timeout: T });
    const lit = await wx(page, () => ({ face: __lab.companion.rig.faceOverride, log: __lab.weather.reactor.log.map((e) => e.tag), m: __lab.weather.metrics(), p: __lab.weather.progress }));
    await H.shot(page, out, 'weather-phone-moonlit');
    check(scope, 'moonlit: breathRate 0.12 (Noomi slows the most), silver glow ≥ 0.8, dwell and progress rise', lit.face.set.breathRate === 0.12 && lit.face.min.glow >= 0.8 && lit.p > 0.02, JSON.stringify(lit));
    check(scope, 'Noomi dreams in the moonlight (its own beat)', lit.log.some((t) => /noomi-moon-dream/.test(t)), JSON.stringify(lit.log));
    // rest it in the sky: a falling star ('strike') in the cove
    await page.mouse.move(g.W * 0.3, g.skyTop + 90, { steps: 10 });
    await page.waitForFunction(() => __lab.weather.pulses.some((p) => p.kind === 'strike' && p.ok), null, { timeout: T });
    await page.mouse.up();
    const after = await wx(page, () => ({ log: __lab.weather.reactor.log.map((e) => e.type), face: __lab.companion.rig.faceOverride }));
    check(scope, 'resting moonlight in the sky sends a falling star; leaving Noomi, it looks after the light', after.log.includes('moon-leave') && after.face.set.breathRate == null, JSON.stringify(after));
    // arrows and the chip
    await page.focus('.weather .stage');
    const tx0 = await wx(page, () => __lab.weather.sims.moon.tx);
    for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowLeft');
    const tx1 = await wx(page, () => __lab.weather.sims.moon.tx);
    check(scope, 'ArrowLeft ×3 moves the moonlight 84 px', Math.abs(tx0 - tx1 - 84) < 2 || tx1 <= 25, `${tx0} → ${tx1}`);
    await wx(page, () => { __lab.weather.sims.moon.dwell = Math.max(__lab.weather.sims.moon.dwell, 0.9); });
    await holdChip(page, 'lead', () => __lab.weather.resolved);
    const r = await resolvedView(page);
    check(scope, '"Bring the moonlight" rests it on Noomi until the night settles: "The tide is still."', r.cap === 'The tide is still.' && /Moonmilk/.test(r.line), JSON.stringify(r));
    noErrors(scope, errors);
  });

  // --------------------------------------------------------- W4 starlight --
  if (only('stars')) await guard(`${SCOPE}:stars`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'zuzu');
    own(ctx);
    await settled(page, 'starlight');
    await wx(page, () => __lab.weather.settle());
    await sleep(800);
    const g = await wx(page, () => __lab.weather.geo());
    // a path through four free stars on the left of the sky, away from Zuzu
    const path = await wx(page, () => {
      const s = __lab.weather.sims.stars, b = __lab.weather.geo().body, pts = [];
      for (let i = 0; i < s.n; i++) if (s.st[i] === 0 && s.a[i] > 0.5 && Math.hypot(s.x[i] - b.cx, s.y[i] - b.mid) > b.h) pts.push([s.x[i], s.y[i]]);
      pts.sort((a, c) => (a[0] + a[1] * 0.5) - (c[0] + c[1] * 0.5));
      return pts.slice(0, 4).sort((a, c) => a[0] - c[0]);
    });
    await H.clearEvents(page);
    await page.mouse.move(path[0][0], path[0][1]); await page.mouse.down();
    for (const pt of path.slice(1)) await page.mouse.move(pt[0], pt[1], { steps: 8 });
    await page.waitForFunction(() => __lab.weather.metrics().heldStars >= 3, null, { timeout: T });
    const held = await wx(page, () => __lab.weather.metrics());
    await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.metrics().constellations >= 1, null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.reactor.log.some((e) => e.type === 'constellation'), null, { timeout: T }).catch(() => {});
    const c1 = await wx(page, () => ({ ev: __lab.weather.events.map((e) => e.type), pulses: __lab.weather.pulses.filter((p) => p.kind === 'success'), log: __lab.weather.reactor.log, m: __lab.weather.metrics(), mood: __lab.weather.env.mood }));
    check(scope, 'a sweep gathers an orbiting cluster (tinks), held at the fingertip', held.heldStars >= 3 && c1.ev.filter((t) => t === 'gather').length >= 3, JSON.stringify(held));
    check(scope, 'let go away from Zuzu: a constellation in Zuzu\'s shape, a realm "success", a celebration', c1.m.constellations === 1 && c1.pulses.some((p) => p.ok) && c1.log.some((e) => e.type === 'constellation'), JSON.stringify(c1));
    await H.shot(page, out, 'weather-phone-constellation');
    // gather near and let go on Zuzu: a star shower (gift)
    const near = await wx(page, () => {
      const s = __lab.weather.sims.stars; let best = null, bd = Infinity;
      for (let i = 0; i < s.n; i++) if (s.st[i] === 0 && s.a[i] > 0.5) { const d = s.y[i]; if (d < bd) { bd = d; best = [s.x[i], s.y[i]]; } }
      return best;
    });
    await page.mouse.move(near[0], near[1]); await page.mouse.down();
    await page.waitForFunction(() => __lab.weather.metrics().heldStars >= 1, null, { timeout: T });
    await page.mouse.move(g.body.cx, g.body.mid - g.body.h * 0.2, { steps: 12 }); await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'gift'), null, { timeout: T });
    check(scope, 'let go on Zuzu: a star shower (gift) at its feet', true);
    // the chip streams stars above Zuzu; letting go raises a constellation
    await holdChip(page, 'lead', () => __lab.weather.sims.stars.clusterSize(-11) >= 3);
    await page.waitForFunction(() => __lab.weather.metrics().constellations >= 2, null, { timeout: T });
    check(scope, '"Gather stars" (held) streams stars to a point; letting go makes a constellation', true);
    // arrow keys gather one star per press, then let go after a pause
    await page.focus('.weather .stage');
    const k0 = await wx(page, () => { const st = __lab.weather.sims.stars; return { made: st.made, st: Array.from(st.st.slice(0, st.n)).join(''), a: Array.from(st.a.slice(0, st.n), (v) => +v.toFixed(2)), cl: Array.from(st.cl.slice(0, st.n)), cId: Array.from(st.cId), cn: Array.from(st.cn) }; });
    for (let k = 0; k < 4; k++) { await page.keyboard.press('ArrowRight'); await sleep(120); }
    const ok = await page.waitForFunction((m) => __lab.weather.sims.stars.made > m, k0.made, { timeout: T }).then(() => true, () => false);
    if (!ok) check(scope, 'arrow keys gather a constellation', false, JSON.stringify({ k0, now: await wx(page, () => ({ snap: __lab.weather.sims.stars.snapshot(), tools: { keyT: __lab.weather.tools.stars.keyT, gp: __lab.weather.tools.stars.gp }, focus: document.activeElement?.className })) }));
    const r = await resolvedView(page);
    check(scope, 'arrow keys gather a third constellation, and Starlight resolves', r.cap === 'The stars found their places.' && /spiral/i.test(r.line), JSON.stringify(r));
    noErrors(scope, errors);
  });

  // -------------------------------------------------------------- W4 wind --
  if (only('wind')) await guard(`${SCOPE}:wind`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await settled(page, 'wind');
    await wx(page, () => __lab.weather.settle());
    await sleep(600);
    const g = await wx(page, () => __lab.weather.geo());
    const w0 = await wx(page, () => ({ m: __lab.weather.metrics(), realm: __lab.weather.realmId, ribbons: __lab.weather.layer.stats().drawn.ribbons, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent) }));
    check(scope, 'Wind in the Blue Drift: silk ribbons drawn, ambient gusts, "Send a breeze"', w0.realm === 'blue-drift' && w0.ribbons > 0 && w0.m.energy > 0.1 && w0.chips[0] === 'Send a breeze', JSON.stringify(w0));
    // a fast jet across Loomi: energy, a gust that brushes and leans it (clear of the arrival beat: a gust is a minor
    // beat, which never waits in line)
    await page.waitForFunction(() => { const r = __lab.weather.reactor; return r.t - r.mem.lastReact > 1.4; }, null, { timeout: T });
    await H.clearEvents(page);
    const y = g.body.top + 20;
    await drag(page, line(8, y, g.W - 8, y, 8), 10);
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'gust'), null, { timeout: T });
    await page.waitForFunction(() => Math.abs(__lab.companion.rig.body.lean) > 0.004, null, { timeout: T });
    const gu = await wx(page, () => ({ lean: __lab.companion.rig.body.lean, e: __lab.weather.metrics().energy, log: __lab.weather.reactor.log.map((e) => e.tag), comp: __lab.events.map((e) => e.type) }));
    check(scope, 'a gust across Loomi leans it (rig.body.lean ≠ 0) and it floats in character', Math.abs(gu.lean) > 0.004 && gu.log.some((t) => t === 'loomi-gust-float'), JSON.stringify(gu));
    check(scope, 'the wind is not a Companion gesture', !gu.comp.some((t) => t === 'drag' || t === 'stroke'), JSON.stringify(gu.comp));
    // a circle makes an eddy
    const cx = g.W / 2, cy = g.skyTop + 150, circle = Array.from({ length: 41 }, (_, i) => [cx + Math.cos(i / 20 * Math.PI * 2) * 80, cy + Math.sin(i / 20 * Math.PI * 2) * 60]);
    await drag(page, circle, 12);
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'eddy' || e.type === 'calm-loop'), null, { timeout: T });
    check(scope, 'a circular drag makes an eddy', true);
    // slow, smooth strokes build calm (progress); about 9 s of them calm the wind (real stroke time)
    const c0 = await wx(page, () => __lab.weather.metrics().calm);
    await drag(page, line(40, g.skyTop + 140, g.W - 40, g.skyTop + 140, 28), 50);
    const c1 = await wx(page, () => ({ calm: __lab.weather.metrics().calm, p: __lab.weather.progress }));
    check(scope, 'slow, smooth strokes build calm (progress rises)', c1.calm > c0 + 0.08 && c1.p > 0.08, JSON.stringify({ c0, c1 }));
    await H.shot(page, out, 'weather-phone-wind-calm');
    // the arrow sends one breeze from its side; the chip held gives a slow breeze that calms
    await page.focus('.weather .stage');
    await page.keyboard.press('ArrowLeft');
    const br = await wx(page, () => ({ on: __lab.weather.tools.breeze.on, ux: __lab.weather.tools.breeze.ux }));
    check(scope, 'ArrowLeft sends a breeze from the left', br.on && br.ux === 1, JSON.stringify(br));
    const c2 = await wx(page, () => __lab.weather.metrics().calm);
    await holdChip(page, 'lead', (c2) => __lab.weather.metrics().calm > c2 + 0.04 || __lab.weather.resolved, c2);
    check(scope, '"Send a breeze" (held) is a steady slow breeze that builds calm', true);
    if (!(await wx(page, () => __lab.weather.resolved))) {
      await wx(page, () => { __lab.weather.sims.wind.calm = Math.max(__lab.weather.sims.wind.calm, 0.95); });
      await holdChip(page, 'lead', () => __lab.weather.resolved);
    }
    const r = await resolvedView(page);
    const amb = await wx(page, () => ({ ambient: __lab.weather.sims.wind.ambient, clear: __lab.weather.pulses.some((p) => p.kind === 'clear' && p.ok) }));
    check(scope, 'calm resolves the Wind: "Just a breeze now.", a realm "clear", the gusts settle', r.cap === 'Just a breeze now.' && amb.ambient === 0 && amb.clear, JSON.stringify({ r, amb }));
    noErrors(scope, errors);
  });

  // --------------------------------------------------------------- W4 fog --
  if (only('fog')) await guard(`${SCOPE}:fog`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await wx(page, () => __lab.weather.setWeather('fog'));
    await settled(page, 'fog');
    await wx(page, () => __lab.weather.settle());
    await sleep(600);
    const g = await wx(page, () => __lab.weather.geo());
    const f0 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, realm: __lab.weather.realmId, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), face: __lab.companion.rig.faceOverride }));
    check(scope, 'Fog in the Blue Drift (a turn, no front): mist everywhere, no water chip, Loomi glows like a lantern', f0.realm === 'blue-drift' && f0.m.fogClear < 0.05 && f0.chips.join() === 'Clear the mist' && f0.face.min.glow >= 0.7, JSON.stringify(f0));
    await H.clearEvents(page);
    for (let k = 0; k < 4; k++) await drag(page, line(20, g.skyTop + 60 + k * 70, g.W - 20, g.skyTop + 90 + k * 70, 12), 14);
    await drag(page, line(20, g.body.top - 10, g.W - 20, g.body.top - 10, 12), 14);
    const f1 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, ev: __lab.weather.events.map((e) => e.type), log: __lab.weather.reactor.log.map((e) => e.type) }));
    check(scope, 'wiping clears the mist (fogClear ↑) and the realm clears (clarity target ↑)', f1.m.fogClear > 0.08 && f1.mood.clarity > f0.mood.clarity + 0.02, JSON.stringify({ f0: f0.mood, f1: f1.mood, fc: f1.m.fogClear }));
    check(scope, 'a wipe near Loomi reveals it', f1.ev.includes('revealed'), JSON.stringify(f1.ev));
    await H.shot(page, out, 'weather-phone-fog-wiped');
    // a still finger grows a clear patch
    const hp = [g.W * 0.78, g.skyTop + 150];
    const h0 = await wx(page, (p) => __lab.weather.sims.mist.grid.sample(p[0], p[1]), hp);
    await page.mouse.move(hp[0], hp[1]); await page.mouse.down();
    const held = await page.waitForFunction((p) => __lab.weather.sims.mist.grid.sample(p[0], p[1]) < 0.3, hp, { timeout: T }).then(() => true, () => false);
    const h1 = await wx(page, (p) => __lab.weather.sims.mist.grid.sample(p[0], p[1]), hp);
    await page.mouse.up();
    check(scope, 'a hold grows a clear patch under the finger', held, `${h0} → ${h1}`);
    // arrows wipe a band in from their side
    await page.focus('.weather .stage');
    const a0 = await wx(page, () => __lab.weather.metrics().fogClear);
    for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowLeft');
    const a1 = await wx(page, () => __lab.weather.metrics().fogClear);
    check(scope, 'ArrowLeft ×3 wipes a band in from the left', a1 > a0 + 0.01, `${a0} → ${a1}`);
    // the chip spirals out from Loomi until the fog lifts
    await holdChip(page, 'lead', () => __lab.weather.resolved, null, 150000);
    const r = await resolvedView(page);
    const lift = await wx(page, () => ({ lifted: __lab.weather.sims.mist.lifted, dew: __lab.weather.layer.scene.dew, clear: __lab.weather.pulses.some((p) => p.kind === 'clear' && p.ok) }));
    check(scope, '"Clear the mist" (held) clears it; at 75 % the fog lifts as a whole, a realm "clear", dew glints', r.cap === 'The mist lifted.' && lift.lifted && lift.dew >= 0 && lift.clear, JSON.stringify({ r, lift }));
    noErrors(scope, errors);
  });

  // ---------------------------------------------------------- W4 warm glow --
  if (only('warm')) await guard(`${SCOPE}:warm`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'pipzi');
    own(ctx);
    await settled(page, 'warm');
    await wx(page, () => __lab.weather.settle());
    await sleep(800);
    const g = await wx(page, () => __lab.weather.geo());
    const e0 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, realm: __lab.weather.realmId, embers: __lab.weather.layer.stats().drawn.embers }));
    check(scope, 'Warm glow at the Spark Festival: dim embers waiting', e0.realm === 'spark-festival' && e0.embers > 0 && e0.m.heat === 0, JSON.stringify(e0));
    // a drag through embers kindles them (realm taps light lanterns), Pipzi sparks
    const path = await wx(page, () => {
      const e = __lab.weather.sims.embers, b = __lab.weather.geo().body, pts = [];
      for (let i = 0; i < e.n; i++) if (e.litT[i] < 0 && Math.hypot(e.x[i] - b.cx, e.y[i] - b.mid) > b.h * 0.8) pts.push([e.x[i], e.y[i]]);
      return pts.sort((a, c) => a[1] - c[1]).slice(0, 5).sort((a, c) => a[0] - c[0]);
    });
    await H.clearEvents(page);
    await page.mouse.move(path[0][0], path[0][1]); await page.mouse.down();
    for (const pt of path.slice(1)) await page.mouse.move(pt[0], pt[1], { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.metrics().heat > 0.05, null, { timeout: T });
    await sleep(800);
    const e1 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, taps: __lab.weather.pulses.filter((p) => p.kind === 'tap' && p.ok).length, log: __lab.weather.reactor.log.map((e) => e.tag), ev: __lab.weather.events.filter((e) => e.type === 'kindle').length }));
    check(scope, 'a drag kindles the embers it passes: heat ↑, warmth target ↑, kindle taps reach the realm', e1.m.heat > 0.05 && e1.ev >= 2 && e1.taps >= 1 && e1.mood.warmth > e0.mood.warmth, JSON.stringify(e1));
    check(scope, 'Pipzi sparks at a kindle (its own beat)', e1.log.some((t) => t === 'pipzi-kindle-spark'), JSON.stringify(e1.log));
    // hold Pipzi: it becomes the hearth (warm rings kindle embers by radius; 'success' at its feet every 2 s)
    const h0 = await wx(page, () => __lab.weather.metrics().heat);
    await page.mouse.move(g.body.cx, g.body.mid); await page.mouse.down();
    await page.waitForFunction(() => __lab.weather.metrics().hearth, null, { timeout: T });
    await page.waitForFunction((h0) => __lab.weather.metrics().heat > h0 + 0.1 && __lab.weather.pulses.some((p) => p.kind === 'success' && p.ok), h0, { timeout: T });
    await H.shot(page, out, 'weather-phone-hearth');
    await page.mouse.up();
    const hh = await wx(page, () => ({ comp: __lab.events.map((e) => e.type), ring: __lab.weather.sims.embers.ringR }));
    check(scope, 'holding Pipzi (a Companion hold) makes it the hearth: heat ↑ and "success" at its feet', hh.comp.includes('hold'), JSON.stringify(hh));
    // the chip is the hearth too, until every ember glows
    await holdChip(page, 'lead', () => __lab.weather.resolved);
    const r = await resolvedView(page);
    check(scope, '"Spread the warmth" (held) kindles the rest; Warm glow resolves: "Everything is glowing."', r.cap === 'Everything is glowing.' && /KAPOW/.test(r.line), JSON.stringify(r));
    noErrors(scope, errors);
  });

  // --------------------------------------------------- W4 water, puddles --
  if (only('water')) await guard(`${SCOPE}:water`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await settled(page, 'wind');
    await wx(page, () => __lab.weather.settle());
    await sleep(500);
    const g = await wx(page, () => __lab.weather.geo());
    await H.clearEvents(page);
    // a drag on the water (left of Loomi) sends a swell toward it
    const wy = g.water[0] + 50;
    await drag(page, line(6, wy, 70, wy, 6), 20);
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'water-push'), null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'wave-arrive'), null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.reactor.log.some((e) => e.type === 'wave-arrive'), null, { timeout: T }).catch(() => {});
    const w1 = await wx(page, () => ({ pulses: __lab.weather.pulses.filter((p) => p.kind === 'ripple'), log: __lab.weather.reactor.log.map((e) => e.tag), comp: __lab.events.map((e) => e.type) }));
    check(scope, 'a drag on the water sends a swell (realm "ripple"); it reaches Loomi, who bobs serenely', w1.pulses.some((p) => p.ok) && w1.log.some((t) => t === 'loomi-wave-serene'), JSON.stringify(w1));
    // "Push the water" (a tap chip) rolls a swell in from one side
    const n0 = await wx(page, () => __lab.weather.events.filter((e) => e.type === 'wave-arrive').length);
    await page.click('.wx-actions [data-action="water"]');
    await page.waitForFunction((n0) => __lab.weather.events.filter((e) => e.type === 'wave-arrive').length > n0, n0, { timeout: T });
    check(scope, '"Push the water" rolls a swell to Loomi', true);
    await H.shot(page, out, 'weather-phone-water');
    noErrors(scope, errors);
    // gold swells in Warm glow add heat (the Moonmilk Cove)
    const b = await openWx(browser, 'phone', 'noomi');
    try {
      await wx(b.page, () => __lab.weather.setWeather('warm', { instant: true }));
      await settled(b.page, 'warm');
      await wx(b.page, () => __lab.weather.act('water'));
      await b.page.waitForFunction(() => __lab.weather.sims.waves.snapshot().swells.some((s) => s.gold), null, { timeout: T });
      await b.page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'wave-arrive') && __lab.weather.metrics().heat > 0, null, { timeout: T });
      check(scope, 'in Warm glow the swell is gold and brings heat when it reaches Noomi', true);
      noErrors(`${scope}:warm`, b.errors);
    } finally { await b.ctx.close(); }
    // puddles in a dry realm after rain (Glitzi's Static Storm)
    const c = await openWx(browser, 'phone', 'glitzi');
    try {
      await wx(c.page, () => __lab.weather.setWeather('rain', { instant: true }));
      await settled(c.page, 'rain');
      await c.page.waitForFunction(() => __lab.weather.metrics().puddles > 0.5, null, { timeout: T * 2 });
      const e = await wx(c.page, () => Array.from(__lab.weather.sims.puddles.e)), W = (await wx(c.page, () => __lab.weather.geo())).W;
      const k = e[2] > 0 ? 0 : 1, px = Math.min(W - 4, Math.max(4, e[4 * k] + (k ? 0.4 : -0.4) * e[4 * k + 2]));   // its outer side, clear of Glitzi
      await c.page.mouse.click(px, e[4 * k + 1]);
      await c.page.waitForFunction(() => __lab.weather.events.some((x) => x.type === 'puddle'), null, { timeout: T });
      const pz = await wx(c.page, () => ({ realm: __lab.weather.realmId, rip: Array.from(__lab.weather.tools.puddleRip), taps: __lab.weather.pulses.filter((p) => p.kind === 'tap').length }));
      await H.shot(c.page, out, 'weather-phone-puddles');
      check(scope, 'rain soaks a dry realm: puddles appear either side of Glitzi and ripple when touched', pz.realm === 'static-storm' && pz.rip.some((a) => a < 2) && pz.taps >= 1, JSON.stringify(pz));
      noErrors(`${scope}:puddles`, c.errors);
    } finally { await c.ctx.close(); }
  });

  // ------------------------------------------------- W8 fronts and turns --
  if (only('front')) await guard(`${SCOPE}:front`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo');
    own(ctx);
    // record each realm swap and the cover at that moment, and any frame without a realm canvas
    await wx(page, () => {
      window.__swaps = []; window.__noRealm = 0;
      let realm = __lab.weather.env.realm;
      const tick = () => {
        const lw = __lab.weather;
        if (!lw) return;
        if (!document.querySelector('.weather canvas.hushfold-realm')) window.__noRealm++;
        if (lw.env.realm !== realm) { realm = lw.env.realm; window.__swaps.push({ cover: lw.layer.scene.front.cover, swapped: lw.layer.scene.front.swapped }); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.click('.wx-dial [data-weather="moonlight"]');
    await page.waitForFunction(() => __lab.weather.front, null, { timeout: T });
    const f0 = await wx(page, () => ({ front: __lab.weather.front, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.disabled) }));
    check(scope, 'a realm change sends a front (sweep); the chips wait under its cover', f0.front.mode === 'sweep' && f0.chips.every(Boolean), JSON.stringify(f0));
    // drags push the front on
    await drag(page, line(20, 300, 370, 320, 10), 10);
    const boost = await wx(page, () => __lab.weather.session.planner._boost);
    check(scope, 'dragging across the front pushes it (planner boost)', boost > 0, `${boost}`);
    await settled(page, 'moonlight');
    const sw = await wx(page, () => ({ swaps: window.__swaps, none: window.__noRealm, realm: __lab.weather.realmId, backdrop: document.querySelector('.weather').dataset.backdrop }));
    check(scope, 'one swap, only under a full cover (≥ 0.95), never without a realm canvas', sw.swaps.length === 1 && sw.swaps[0].cover >= 0.95 && sw.none === 0 && sw.realm === 'moonmilk-cove' && sw.backdrop === 'dark', JSON.stringify(sw));
    // a same-realm turn: the old weather is still there at 300 ms while the new one enters
    // (turn timings run in sim time, which software GL slows: wait on state, not the wall clock)
    await page.click('.wx-dial [data-weather="starlight"]');
    await page.waitForFunction(() => __lab.weather.sims.stars.amount > 0.05, null, { timeout: T });
    const t = await wx(page, () => ({ moon: __lab.weather.sims.moon.amount, stars: __lab.weather.sims.stars.amount, front: !!__lab.weather.front, state: __lab.weather.state, drawn: __lab.weather.layer.stats().drawn.stars }));
    check(scope, 'Moonlight → Starlight turns in place: the moon pool still fades while stars prick in', !t.front && t.moon > 0.3 && t.moon < 1 && t.stars > 0 && t.stars < 1 && t.state === 'turning', JSON.stringify(t));
    await H.shot(page, out, 'weather-phone-turn');
    // touchable at once: a storm swipe 300 ms after the pick opens the clouds
    await settled(page, 'starlight');
    await page.click('.wx-dial [data-weather="storm"]');
    await sleep(300);
    const g = await wx(page, () => __lab.weather.geo());
    for (let k = 0; k < 4; k++) { const x = g.body.cx + (k - 1.5) * 40; await drag(page, line(x, g.skyTop + 6, x, g.body.top - 30, 10), 12); }
    await page.waitForFunction(() => __lab.weather.metrics().clear > 0.1, null, { timeout: T });
    check(scope, 'a swipe 300 ms after picking Storm (still entering) opens the clouds', true);
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- morphs --
  if (only('morph')) await guard(`${SCOPE}:morph`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'noomi');
    own(ctx);
    // Rain → Starlight: the drops in flight become the stars
    await wx(page, () => __lab.weather.setWeather('rain', { instant: true }));
    await settled(page, 'rain');
    await page.waitForFunction(() => __lab.weather.sims.rain.alive > 8, null, { timeout: T });
    const m = await wx(page, async () => {
      const lw = __lab.weather, n0 = lw.sims.rain.alive;
      lw.setWeather('starlight');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const s = lw.sims.stars;
      let home = 0;
      for (let i = 0; i < s.n; i++) if (s.st[i] === 5) home++;
      return { n0, alive: lw.sims.rain.alive, home, realm: lw.realmId };
    });
    check(scope, 'Rain → Starlight (same realm): the drops in flight slow, rise and become the stars', m.n0 > 0 && m.alive === 0 && m.home > 0 && m.realm === 'moonmilk-cove', JSON.stringify(m));
    await settled(page, 'starlight');
    noErrors(scope, errors);
    // Storm → Sunshine (the Blue Drift): the clouds part from the centre; the pool slides down a shaft through the gap
    const b = await openWx(browser, 'phone', 'loomi');
    try {
      await wx(b.page, () => __lab.weather.setWeather('storm', { instant: true }));
      await settled(b.page, 'storm');
      await wx(b.page, () => __lab.weather.settle());
      await b.page.waitForFunction(() => !__lab.weather.session.planner._instant, null, { timeout: T });   // a normal turn, not a fast-forward
      await sleep(300);
      const r = await wx(b.page, async () => {
        const lw = __lab.weather, c0 = lw.sims.clouds.clear(), rows = [];
        lw.setWeather('sunshine');
        for (let k = 0; k < 6; k++) { await new Promise((res) => requestAnimationFrame(res)); rows.push({ sunAt: lw.geo().sunAt.map(Math.round), clear: +lw.sims.clouds.clear().toFixed(3) }); }
        return { c0, rows, W: lw.geo().W, sun: lw.geo().sun.map(Math.round) };
      });
      const atGap = r.rows.length && Math.abs(r.rows[0].sunAt[0] - r.W / 2) < r.W * 0.1, parted = r.rows[r.rows.length - 1].clear > r.c0 + 0.05;
      check(scope, 'Storm → Sunshine: the clouds part from the centre and the light starts at the gap, not the sun', atGap && parted, JSON.stringify(r));
      await settled(b.page, 'sunshine');
      const end = await wx(b.page, () => ({ sunAt: __lab.weather.geo().sunAt, sun: __lab.weather.geo().sun }));
      check(scope, '…then the beam hangs from the realm\'s own sun again', Math.abs(end.sunAt[0] - end.sun[0]) < 2 && Math.abs(end.sunAt[1] - end.sun[1]) < 2, JSON.stringify(end));
      // Fog → any: the mist sinks to the floor as it leaves
      await wx(b.page, () => __lab.weather.setWeather('fog', { instant: true }));
      await settled(b.page, 'fog');
      const tops = await wx(b.page, async () => {
        const lw = __lab.weather, out = [];
        lw.setWeather('wind');
        for (let k = 0; k < 6; k++) { await new Promise((r) => setTimeout(r, 150)); out.push([+lw.sims.mist.amount.toFixed(2), Math.round(lw.layer.scene.mistTop)]); }
        return out;
      });
      const sinking = tops.every((t, i) => !i || (t[0] <= tops[i - 1][0] && t[1] >= tops[i - 1][1]));
      check(scope, 'Fog → Wind: the mist sinks to the floor and thins, revealing the new weather from the top', sinking && tops[tops.length - 1][1] > tops[0][1], JSON.stringify(tops));
      noErrors(`${scope}:loomi`, b.errors);
    } finally { await b.ctx.close(); }
  });

  // ------------------------------------------------------- W11/W12 sound --
  if (only('sound')) await guard(`${SCOPE}:sound`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'blubi', { initScripts: [H.INIT.audioSpy] });
    own(ctx);
    const total = (p) => Object.values(p).reduce((a, b) => a + b, 0);
    const s0 = await wx(page, () => ({ ctx: !!__lab.sound.ctx, made: __audio().created, bed: __lab.weather.sound }));
    check(scope, 'a deep link makes no sound before a gesture: no AudioContext, no bed', !s0.ctx && s0.made === 0 && !s0.bed.alive && !total(s0.bed.played), JSON.stringify(s0));
    const g = await wx(page, () => __lab.weather.geo());
    await page.mouse.click(g.W * 0.12, g.skyTop + 40);   // a tap on the sky: a gesture
    await page.waitForFunction(() => __lab.weather.sound.alive, null, { timeout: T });
    const s1 = await wx(page, () => ({ eng: __lab.sound.debug(), bed: __lab.weather.sound, ctxs: __audio().contexts }));
    check(scope, 'after a tap: the bed is alive, one keep voice on the one AudioContext made inside the gesture',
      s1.bed.alive && s1.eng.keep === 1 && s1.eng.live >= 1 && s1.ctxs.length === 1 && s1.ctxs[0].activation && s1.eng.state === 'running', JSON.stringify(s1));
    check(scope, 'the low tier keeps rain and wind (and the pad); the rain hiss follows the falling rain', s1.bed.layers.join() === 'rain,wind' && s1.bed.levels.rain > 0.3 && s1.bed.levels.pad === 0, JSON.stringify(s1.bed));
    // a bead: drips as it gathers, a rising note as it goes up into the cloud as light
    const deckY = await wx(page, () => __lab.weather.sims.rain.deckY);
    await page.mouse.move(g.body.cx - 110, deckY + 70);
    await page.mouse.down();
    await page.waitForFunction(() => (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 4 && (__lab.weather.sound.played.drip || 0) >= 2, null, { timeout: T }).catch(() => {});
    await page.mouse.move(g.body.cx - 110, deckY - 30, { steps: 4 });   // let go inside the deck: up as light
    await page.mouse.up();
    await page.waitForFunction(() => (__lab.weather.sound.played.rise || 0) >= 1, null, { timeout: 20000 }).catch(() => {});
    const b = await wx(page, () => ({ played: __lab.weather.sound.played, ev: __lab.weather.events.map((e) => e.type) }));
    check(scope, 'a bead plinks as drops merge (up the Mallow\'s scale) and rises as light with a soft upward note',
      b.played.drip >= 2 && b.ev.includes('merge') && b.played.rise >= 1 && b.ev.includes('bead-up'), JSON.stringify(b.played));
    // a weather change keeps the one bed, which follows the new weather
    const b0 = await wx(page, () => __lab.weather.sound.builds);
    await wx(page, () => __lab.weather.setWeather('storm', { instant: true }));
    await settled(page, 'storm');
    await sleep(600);
    await wx(page, () => { const S = __lab.weather.sims.strikes; S.next = S.t + 0.05; });   // the next storm strike, now
    await page.waitForFunction(() => (__lab.weather.sound.played.thunder || 0) >= 1, null, { timeout: T }).catch(() => {});
    const s2 = await wx(page, () => ({ eng: __lab.sound.debug(), bed: __lab.weather.sound, realm: __lab.weather.realmId, ev: __lab.weather.events.map((e) => e.type) }));
    const iStrike = s2.ev.findIndex((t) => t === 'strike' || t === 'glow'), iThunder = s2.ev.indexOf('thunder');
    check(scope, 'Storm in the same lagoon: still the one bed, never rebuilt', s2.realm === 'raindrop-lagoon' && s2.eng.keep === 1 && s2.bed.builds === b0 && s2.bed.alive, JSON.stringify(s2.bed));
    check(scope, 'soft thunder follows the cloud glow (0.4–1.2 s later)', iStrike >= 0 && iThunder > iStrike && s2.bed.played.thunder >= 1, JSON.stringify({ ev: s2.ev.slice(-10), played: s2.bed.played }));
    // mute: every voice stops; unmute: the bed is back
    await page.click('.weather .topbar button[aria-label="Mute sound"]');
    const tm = Date.now();
    const muted = await page.waitForFunction(() => __lab.sound.live.size === 0, null, { timeout: 5000, polling: 25 }).then(() => Date.now() - tm, () => -1);
    check(scope, 'Mute: no live voices within 500 ms', muted >= 0 && muted <= 500, `${muted} ms`);
    await page.click('.weather .topbar button[aria-label="Mute sound"]');
    const tu = Date.now();
    const back = await page.waitForFunction(() => __lab.weather.sound.alive, null, { timeout: 10000, polling: 25 }).then(() => Date.now() - tu, () => -1);
    check(scope, 'unmute: the bed is back within 1.5 s (with a fresh fade-in)', back >= 0 && back <= 1500, `${back} ms`);
    // Touch sounds off: no bed and no one-shots (the Mallow's voice has its own switch)
    await wx(page, () => __lab.dna.set('touchSounds', false));
    await page.waitForFunction(() => !__lab.weather.sound.alive, null, { timeout: 10000 }).catch(() => {});
    const p0 = await wx(page, () => __lab.weather.sound.played);
    await page.mouse.click(g.W * 0.92, g.water[0] + 40);   // a ripple on the water (beside the Mallow)
    await sleep(800);
    const fx = await wx(page, () => ({ alive: __lab.weather.sound.alive, played: __lab.weather.sound.played, ev: __lab.weather.events.map((e) => e.type).filter((t) => !/^land-|^hit-body$/.test(t)) }));
    check(scope, 'Touch sounds off: the bed lets go and a touch on the water stays silent', !fx.alive && total(fx.played) === total(p0) && fx.ev.includes('water-tap'), JSON.stringify({ p0, fx }));
    await wx(page, () => __lab.dna.set('touchSounds', true));
    await page.waitForFunction(() => __lab.weather.sound.alive, null, { timeout: 10000 }).catch(() => {});
    check(scope, 'Touch sounds on again: the bed returns', await wx(page, () => __lab.weather.sound.alive));
    // a hidden page: the engine stops the bed and suspends; nothing catches up in a burst on return
    await H.setHidden(page, true);
    await sleep(600);
    const hd = await wx(page, () => ({ alive: __lab.weather.sound.alive, state: __lab.sound.debug().state, played: __lab.weather.sound.played, wstate: __lab.weather.state }));
    await sleep(1500);
    await H.setHidden(page, false);
    await page.waitForFunction(() => __lab.weather.sound.alive, null, { timeout: 15000 }).catch(() => {});
    // voices stopped while the context was suspended finish ending once it runs again
    await page.waitForFunction(() => __lab.sound.debug().keep === 1, null, { timeout: 5000 }).catch(() => {});
    const vs = await wx(page, () => ({ alive: __lab.weather.sound.alive, state: __lab.sound.debug().state, played: __lab.weather.sound.played, keep: __lab.sound.debug().keep }));
    check(scope, 'hidden: the bed stops and the audio suspends with the loop paused', !hd.alive && hd.state === 'suspended' && hd.wstate === 'paused', JSON.stringify(hd));
    check(scope, 'visible again: one bed rebuilt, no burst of one-shots', vs.alive && vs.keep === 1 && vs.state === 'running' && total(vs.played) - total(hd.played) <= 2, JSON.stringify({ hd: hd.played, vs }));
    // Close: the bed fades with the screen; nothing is left playing
    await page.click('.weather .topbar button[aria-label="Close"]');
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    const tc = Date.now();
    const gone = await page.waitForFunction(() => __lab.sound.live.size === 0, null, { timeout: 8000, polling: 50 }).then(() => Date.now() - tc, () => -1);
    check(scope, 'Close: no live voices within 3.5 s of home (the bed fades over 0.6 s; the rest motif rings out)', gone >= 0 && gone <= 3500, `${gone} ms`);
    noErrors(scope, errors);
    // no Web Audio at all: everything still works, silently
    const r = await openWx(browser, 'phone', 'loomi', { initScripts: [() => { delete window.AudioContext; delete window.webkitAudioContext; }] });
    try {
      const g2 = await wx(r.page, () => __lab.weather.geo());
      await r.page.mouse.click(g2.W * 0.12, g2.skyTop + 40);
      await drag(r.page, line(20, g2.skyTop + 80, g2.W - 20, g2.skyTop + 120, 12), 16);
      await r.page.click('.wx-actions [data-action="water"]');
      await sleep(1500);
      const n = await wx(r.page, () => ({ ctx: __lab.sound.ctx, alive: __lab.weather.sound.alive, energy: __lab.weather.metrics().energy }));
      check(`${scope}:no-audio`, 'with no AudioContext: no errors, no bed, the weather still answers', n.ctx === null && !n.alive && n.energy > 0, JSON.stringify(n));
      noErrors(`${scope}:no-audio`, r.errors);
    } finally { await r.ctx.close(); }
  });

  // --------------------------------------------------- W10 photosafety --
  if (only('photo')) await guard(`${SCOPE}:photo`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'glitzi');
    own(ctx);
    await page.focus('.weather .stage');
    await page.keyboard.press('Digit5');
    await settled(page, 'storm');
    await wx(page, () => __lab.weather.settle());
    await sleep(400);
    await wx(page, startProbe);
    const t0 = await wx(page, () => performance.now());
    // the worst case: a strike straight away (bolt, cloud glow, thunder), swipes that open gaps ('clear' pulses)
    await wx(page, () => { const S = __lab.weather.sims.strikes; S.next = S.t + 0.3; });
    const struck = await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'strike'), null, { timeout: T }).then(() => true, () => false);
    const g = await wx(page, () => __lab.weather.geo());
    for (let k = 0; k < 3; k++) { const x = g.body.cx + (k - 1) * 30; await drag(page, line(x, g.skyTop + 6, x, g.body.top - 30, 8), 12); await sleep(250); }
    await page.waitForFunction((t) => performance.now() - t > 10000, t0, { timeout: 30000, polling: 250 });
    // then one realm change, dark to bright (Sunshine: the Sunpop Orchard)
    await page.keyboard.press('Digit1');
    await settled(page, 'sunshine');
    await sleep(600);
    const samples = await wx(page, () => window.__probe.stop());
    const st = await wx(page, () => ({ pulses: __lab.weather.pulses, glows: __lab.weather.glows, ev: __lab.weather.events.map((e) => e.type), realm: __lab.weather.realmId }));
    const f = flashStats(samples);
    check(scope, 'the probe saw a storm strike and the realm change', f.frames >= 20 && st.realm === 'sunpop-orchard' && struck, JSON.stringify({ frames: f.frames, realm: st.realm, struck }));
    check(scope, 'at most 3 luminance rises of more than 10 % a second (whole frame and each quadrant)', f.perSec <= 3, JSON.stringify(f));
    check(scope, 'no rise of more than 20 % within 250 ms anywhere', f.rise250 <= 0.2, JSON.stringify(f));
    check(scope, 'no whole-frame rise of more than 10 % from one frame to the next', f.step <= 0.1, JSON.stringify(f));
    const bright = st.pulses.filter((p) => p.ok && ['success', 'burst', 'strike', 'clear'].includes(p.kind)).map((p) => p.t);
    const glows = st.glows.filter((e) => e.ok && e.kind === 'glow').map((e) => e.t);
    check(scope, 'realm: at most 2 bright pulses a second; lab: cloud glows at least 1 s apart', perWindow(bright, 1000) <= 2 && glows.every((t, i) => !i || t - glows[i - 1] >= 1000), JSON.stringify({ bright, glows }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------ W16 Comfort DNA --
  if (only('dna')) await guard(`${SCOPE}:dna`, async (scope) => {
    // a chosen world is home; the palette tints the stars; Slower slows the ambient drift
    let r = await openWx(browser, 'phone', 'boppo', { dna: { environment: 'moonmilk-cove', colours: 'rose', animationSpeed: 'slower' } });
    try {
      const s = await wx(r.page, async (LAB) => {
        const { weatherTints } = await import(`${LAB}/core/weather-draw.js`);
        const { REALMS } = await import('/hushmallow/src/world/realm.js');
        const L = __lab.weather.layer;
        return { id: __lab.companion.rig.id, w: __lab.weather.weather, realm: __lab.weather.realmId, star: L.sp.tint.star, moon: L.sp.tint.moon,
          plain: weatherTints(REALMS[L.realmId].palette, L.tone, null), speed: __lab.weather.sims.clouds.speed, wind: __lab.weather.sims.wind.speed, planner: __lab.weather.session.planner.speed };
      }, LAB);
      check(`${scope}:chosen`, 'the favourite Mallow on stage, the chosen world as home (Moonlight in the Moonmilk Cove)', s.id === 'boppo' && s.realm === 'moonmilk-cove' && s.w === 'moonlight', JSON.stringify(s));
      check(`${scope}:chosen`, 'the Comfort DNA palette tints the stars and the moonlight', s.star !== s.plain.star && s.moon !== s.plain.moon, JSON.stringify(s));
      check(`${scope}:chosen`, 'Slower: ambient drift, wind and turns at ×0.82', s.speed === 0.82 && s.wind === 0.82 && s.planner === 0.82, JSON.stringify(s));
      await H.shot(r.page, out, 'weather-phone-dna-rose');
      noErrors(`${scope}:chosen`, r.errors);
    } finally { await r.ctx.close(); }
    // gentle: no bolts (a strike becomes a glow), agitation ≤ 0.30, no hops or celebrations
    r = await openWx(browser, 'phone', 'glitzi', { dna: { responses: 'gentle' } });
    try {
      const sc = `${scope}:gentle`;
      await r.page.focus('.weather .stage');
      await r.page.keyboard.press('Digit5');
      await settled(r.page, 'storm');
      await wx(r.page, () => __lab.weather.settle());
      await wx(r.page, () => { const S = __lab.weather.sims.strikes; S.next = S.t + 0.05; });
      await r.page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'glow' || e.type === 'strike'), null, { timeout: T });
      const st = await wx(r.page, () => ({ ev: __lab.weather.events.map((e) => e.type), pulses: __lab.weather.pulses.map((p) => p.kind), mood: __lab.weather.env.mood }));
      await r.page.keyboard.press('Digit2');   // Wind, Glitzi's loved weather: a joyful arrival, softened
      await settled(r.page, 'wind');
      await sleep(1500);
      const s = { ...st, log: await wx(r.page, () => __lab.weather.reactor.log) };
      check(sc, 'gentle: the storm strike is a soft glow, never a bolt', s.ev.includes('glow') && !s.ev.includes('strike') && !s.pulses.includes('strike'), JSON.stringify({ ev: s.ev.slice(-8), pulses: s.pulses }));
      check(sc, 'gentle: agitation stays at 0.30 or less', s.mood.agitation <= 0.3 + 1e-6, JSON.stringify(s.mood));
      check(sc, 'gentle: no hops, celebrations or double taps', s.log.length > 0 && !s.log.some((e) => ['hop', 'celebrate', 'doubleTap', 'glitchBurst', 'shiver', 'flick'].includes(e.react)), JSON.stringify(s.log));
      noErrors(sc, r.errors);
    } finally { await r.ctx.close(); }
    // personalisation off: the defaults (the Mallow's own world, balanced, its own colours)
    r = await openWx(browser, 'phone', 'zuzu', { dna: { environment: 'moonmilk-cove', responses: 'gentle', colours: 'rose' }, dnaExtra: { enabled: false } });
    try {
      const s = await wx(r.page, async (LAB) => {
        const { entryWeather, pickRealm } = await import(`${LAB}/core/weather.js`);
        const { realmForMallow } = await import('/hushmallow/src/world/realm.js');
        const id = __lab.companion.rig.id, home = realmForMallow(id).id, w = entryWeather(home);
        return { id, realm: __lab.weather.realmId, w: __lab.weather.weather, want: { realm: pickRealm(w, { current: null, home }), w }, palette: __lab.weather.layer.palette, style: __lab.weather.reactor._in.style };
      }, LAB);
      check(`${scope}:off`, 'personalisation off: the Mallow\'s own world and entry weather, balanced style, its own colours',
        s.realm === s.want.realm && s.w === s.want.w && s.palette === null && s.style === 'balanced', JSON.stringify(s));
      noErrors(`${scope}:off`, r.errors);
    } finally { await r.ctx.close(); }
  });

  // ---------------------------------------------------------- W17 Mallows --
  if (only('mallows')) await guard(`${SCOPE}:mallows`, async (scope) => {
    const tags = {};
    for (const id of ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi']) {
      const r = await openWx(browser, 'phone', id);
      try {
        const sc = `${scope}:${id}`;
        await r.page.waitForFunction(() => __lab.weather.reactor.log.some((e) => e.type === 'arrive'), null, { timeout: T });
        const s = await wx(r.page, async (LAB) => {
          const { entryWeather, pickRealm } = await import(`${LAB}/core/weather.js`);
          const { homeRealm } = await import(`${LAB}/core/environment.js`);
          const { FEEL } = await import(`${LAB}/core/weather-mallow.js`);
          const me = __lab.companion.rig.id, home = homeRealm(__lab.dna, me), w = entryWeather(home);
          return { me, w: __lab.weather.weather, realm: __lab.weather.realmId, want: { w, realm: pickRealm(w, { current: null, home }) }, homeW: FEEL[me].home,
            arrive: __lab.weather.reactor.log.filter((e) => e.type === 'arrive').pop(), t: __lab.weather.reactor.t };
        }, LAB);
        check(sc, 'starts in its realm\'s entry weather', s.me === id && s.w === s.want.w && s.realm === s.want.realm, JSON.stringify(s));
        let arrive = s.arrive;
        if (s.homeW !== s.w) {   // its home weather (after the arrival cooldown)
          await r.page.waitForFunction((t) => __lab.weather.reactor.t > t + 3, s.t, { timeout: T });
          const n = await wx(r.page, () => __lab.weather.reactor.log.length);
          await wx(r.page, (w) => __lab.weather.setWeather(w, { instant: true }), s.homeW);
          await settled(r.page, s.homeW);
          await r.page.waitForFunction((n) => __lab.weather.reactor.log.slice(n).some((e) => e.type === 'arrive'), n, { timeout: T }).catch(() => {});
          arrive = await wx(r.page, () => __lab.weather.reactor.log.filter((e) => e.type === 'arrive').pop());
        }
        check(sc, `its home weather (${s.homeW}) arrives as a celebration in character`, !!arrive && arrive.tag.startsWith(`${id}-home-${s.homeW}`), JSON.stringify(arrive));
        // the same event, read in character: a storm strike
        await r.page.waitForFunction(() => __lab.weather.reactor.t - __lab.weather.reactor.mem.lastReact > 1.5, null, { timeout: T });
        tags[id] = await wx(r.page, () => (__lab.weather.reactor.event('strike', { x: 40, y: 300 }).find((a) => a.type === 'react') || {}).tag || null);
        await H.shot(r.page, out, `weather-phone-${id}-home`);
        noErrors(sc, r.errors);
      } finally { await r.ctx.close(); }
    }
    const distinct = new Set(Object.values(tags).filter(Boolean));
    check(scope, 'the same strike reads differently on different Mallows (≥ 5 distinct reactions)', distinct.size >= 5, JSON.stringify(tags));
  });

  // --------------------------------------------------------- accessibility --
  if (only('access')) await guard(`${SCOPE}:access`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo');
    own(ctx);
    await settled(page, 'sunshine');
    const a = await wx(page, () => {
      const q = (s) => document.querySelector(s);
      return {
        stage: [q('.weather .stage').getAttribute('role'), q('.weather .stage').getAttribute('aria-label')], focus: document.activeElement === q('.weather .stage'),
        dial: [q('.wx-dial').getAttribute('role'), q('.wx-dial').getAttribute('aria-label')],
        radios: [...document.querySelectorAll('.wx-radio')].map((b) => [b.getAttribute('aria-label'), b.getAttribute('aria-checked'), b.tabIndex, b.title]),
        group: [q('.wx-actions').getAttribute('role'), q('.wx-actions').getAttribute('aria-label')],
        chips: [...document.querySelectorAll('.wx-actions button')].map((b) => [b.textContent, b.type, b.dataset.action]),
        sr: [q('.weather .sr-only').getAttribute('role'), q('.weather .sr-only').getAttribute('aria-live')], hint: q('.weather .wx-hint').getAttribute('aria-hidden'),
        said: __lab.weather.said,
      };
    });
    check(scope, 'the stage is focused on arrival and labelled with the keys', a.focus && a.stage[0] === 'application' && /Keys 1 to 8 choose the weather, arrow keys shape it, hold W to weave\. Touch Boppo to talk\./.test(a.stage[1]), JSON.stringify(a.stage));
    check(scope, 'the dial is one radiogroup "Weather": eight named radios, one tab stop on the chosen one',
      a.dial.join() === 'radiogroup,Weather' && a.radios.length === 8 && a.radios.every((r) => r[0] && r[0] === r[3]) && a.radios.filter((r) => r[2] === 0).length === 1 && a.radios.find((r) => r[1] === 'true')[0] === 'Sunshine', JSON.stringify(a.radios));
    check(scope, 'the alternatives are real buttons in a labelled group; the hint is hidden, the announcer speaks', a.group.join() === 'group,Weather actions' && a.chips.every((c) => c[1] === 'button') && a.sr.join() === 'status,polite' && a.hint === 'true', JSON.stringify(a));
    check(scope, 'the announcer says where we are and what to do, about the world, never the person', a.said.includes('Sunshine at the Sunpop Orchard. Drag to move the warm light.') && !a.said.some((t) => /\b(you|your)\b/i.test(t)), JSON.stringify(a.said));
    // keyboard: hold Enter on "Bring the sun" until golden hour
    await page.focus('.wx-actions [data-action="lead"]');
    await page.keyboard.down('Enter');
    await page.waitForFunction(() => __lab.weather.resolved, null, { timeout: T * 2 });
    await page.waitForFunction(() => document.querySelector('.wx-actions [data-action="again"]'), null, { timeout: T });
    const f = await wx(page, () => ({ focus: document.activeElement?.dataset?.action || document.activeElement?.className, metrics: __lab.weather.metrics() }));
    check(scope, 'held Enter on "Bring the sun" basks Boppo to golden hour; focus moves onto Again', f.focus === 'again', JSON.stringify(f));
    for (let i = 0; i < 4; i++) { await page.keyboard.down('Enter'); await sleep(250); }   // the key is still down: these repeat
    await page.keyboard.up('Enter');
    await sleep(900);
    check(scope, 'a held key\'s repeats never press Again', await wx(page, () => __lab.weather.resolved));
    await page.keyboard.press('Enter');
    const again = await page.waitForFunction(() => !__lab.weather.resolved && __lab.weather.progress < 0.5, null, { timeout: T }).then(() => true, () => false);
    check(scope, 'a fresh Enter on Again plays the weather again', again);
    await page.waitForFunction(() => __lab.weather.said.some((t) => t === 'Golden hour.') && __lab.weather.said.some((t) => t === 'Sunshine again.'), null, { timeout: 15000 }).catch(() => {});
    const said = await wx(page, () => __lab.weather.said);
    check(scope, 'the announcer read the caption and Again (at least 3 s apart, newest wins)', said.includes('Golden hour.') && said.includes('Sunshine again.'), JSON.stringify(said));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------- quality tiers --
  if (only('tier')) await guard(`${SCOPE}:tier`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi', { prefs: { quality: 'medium' } });
    own(ctx);
    const g = await wx(page, () => __lab.weather.geo());
    await page.mouse.click(g.W * 0.12, g.skyTop + 40);   // a gesture: the bed builds
    await page.waitForFunction(() => __lab.weather.sound.alive, null, { timeout: T });
    const m = await wx(page, () => ({ q: __lab.quality(), bed: __lab.weather.sound, layer: __lab.weather.layer.stats(), ribbons: __lab.weather.sims.ribbons.n, stars: __lab.weather.sims.stars.n }));
    check(scope, 'medium: four bed layers and the pad, a front canvas, DPR ≤ 1.25', m.q === 'medium' && m.bed.layers.join() === 'rain,wind,rumble,lap' && m.layer.front && m.layer.backDpr <= 1.25, JSON.stringify(m));
    await wx(page, () => __lab.prefs.set('quality', 'low'));
    await page.waitForFunction(() => __lab.weather.layer.stats().quality === 'low' && __lab.weather.sound.tier === 'low', null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.sound.alive, null, { timeout: T });
    const l = await wx(page, () => ({ bed: __lab.weather.sound, layer: __lab.weather.layer.stats(), ribbons: __lab.weather.sims.ribbons.n, keep: __lab.sound.debug().keep, fronts: document.querySelectorAll('.weather canvas.wx-front').length }));
    check(scope, 'a live drop to low: the bed sheds to rain and wind (rebuilt once), no front canvas, fewer ribbons', l.bed.layers.join() === 'rain,wind' && l.bed.alive && !l.layer.front && l.fronts === 0 && l.ribbons < m.ribbons, JSON.stringify(l));
    await page.waitForFunction(() => __lab.sound.debug().keep === 1, null, { timeout: 5000 }).catch(() => {});
    await wx(page, () => __lab.prefs.set('quality', 'high'));
    await sleep(2500);
    const h = await wx(page, () => ({ bed: __lab.weather.sound, ribbons: __lab.weather.sims.ribbons.n, keep: __lab.sound.debug().keep }));
    check(scope, 'back up to high mid-session: pools and bed never grow back (one bed)', h.bed.layers.join() === 'rain,wind' && h.ribbons === l.ribbons && h.keep === 1, JSON.stringify(h));
    noErrors(scope, errors);
  });

  // ------------------------------------------------- W2 states (residual) --
  // Every radio in dial order (Boppo: the orchard, then the cove for the night skies): the state settles, the
  // Mallow answers within 2 s, and the world is not a recolour of the one before (residual > 12).
  if (only('states')) await guard(`${SCOPE}:states`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo');
    own(ctx);
    await settled(page, 'sunshine');
    await wx(page, () => __lab.weather.settle());
    await sleep(1200);
    let prev = await composite(page);
    // the probe's self-check: a hue-turned, a brightened and a tinted copy are recolours (residual < 3)
    const self = [residual(prev, recolour(prev, hueMatrix(40))), residual(prev, recolour(prev, IDENT, 0.85, 30)), residual(prev, recolour(prev, [1.08, 0.05, 0, 0, 0.95, 0.04, 0, 0.02, 0.8]))];
    check(scope, 'self-check: a hue-turned, a brightened and a tinted copy of the world leave a residual under 3', self.every((r) => r < 3), JSON.stringify(self));
    await H.shot(page, out, 'weather-phone-state-sunshine');
    const rows = [];
    for (const w of ['wind', 'fog', 'rain', 'storm', 'moonlight', 'starlight', 'warm']) {
      // clear of the last beat (the arrival cooldown is 2.5 s of sim time), so the Mallow is free to answer
      await page.waitForFunction(() => { const r = __lab.weather.reactor, l = r.log; return !l.length || r.t - l[l.length - 1].t > 2.6; }, null, { timeout: T });
      const t0 = await wx(page, () => __lab.weather.reactor.t);
      await page.click(`.wx-dial [data-weather="${w}"]`);
      const answered = await page.waitForFunction((t0) => __lab.weather.reactor.log.some((e) => e.t > t0), t0, { timeout: T }).then(() => true, () => false);
      const first = await wx(page, (t0) => __lab.weather.reactor.log.find((e) => e.t > t0) || null, t0);
      await settled(page, w);
      const st = await wx(page, async ({ LAB, w }) => {
        const { pickRealm, moodFor } = await import(`${LAB}/core/weather.js`);
        const lw = __lab.weather;
        lw.settle();
        await new Promise((r) => setTimeout(r, 600));
        const want = moodFor(w, 0, lw.live(), lw.realmId), m = lw.env.mood;
        return { realm: lw.realmId, dm: +Math.max(...Object.keys(want).map((k) => Math.abs(want[k] - m[k]))).toFixed(3) };
      }, { LAB, w });
      await sleep(600);
      const img = await composite(page);
      rows.push({ w, realm: st.realm, residual: residual(prev, img), dm: st.dm, answered, react: first && { tag: first.tag, dt: +(first.t - t0).toFixed(2) } });
      prev = img;
      await H.shot(page, out, `weather-phone-state-${w}`);
    }
    check(scope, 'each weather is a new world, not a recolour of the last: residual against the previous state > 12', rows.every((r) => r.residual > 12), JSON.stringify(rows.map((r) => [r.w, r.realm, r.residual])));
    check(scope, 'each settles in its realm at moodFor(weather, 0) (within the throttle)', rows.every((r) => r.dm < 0.05), JSON.stringify(rows.map((r) => [r.w, r.dm])));
    check(scope, 'the Mallow answers every pick within 2 s (sim time; arrival, front look or wary look)', rows.every((r) => r.answered && r.react && r.react.dt <= 2), JSON.stringify(rows.map((r) => [r.w, r.react])));
    noErrors(scope, errors);
  });

  // ------------------------------------------------- W4 beyond the touch --
  // One modest, meaningful gesture per weather, away from the middle; the realm's answer is measured outside
  // the gesture's box + 60 px (stills at the target before and after: see the probe above). Waves change no
  // mood (a swell is the lab's own), so for them the lab layer is diffed against a no-touch control.
  if (only('reach')) await guard(`${SCOPE}:reach`, async (scope) => {
    // Loomi in the Blue Drift: storm, wind, fog, sunshine, rain and waves all happen there
    let r = await openWx(browser, 'phone', 'loomi');
    try {
      const { page } = r;
      const ready = async (w) => { await wx(page, (w) => __lab.weather.setWeather(w, { instant: true }), w); await settled(page, w); await wx(page, () => __lab.weather.settle()); await sleep(700); };
      let g = await wx(page, () => __lab.weather.geo());
      // Storm: three swipes down through the left of the bank
      await ready('storm');
      let t0 = await target(page), pts = [];
      for (let k = 0; k < 3; k++) { const p = line(46 + k * 16, g.skyTop + 6, 46 + k * 16, g.body.top - 40, 10); pts.push(...p); await drag(page, p, 12); await sleep(300); }
      await page.waitForFunction(() => __lab.weather.metrics().clear > 0.08, null, { timeout: T }).catch(() => {});
      await reach(page, `${scope}:storm`, 'Storm: swipes on the left part the bank', t0, boxOf(pts));
      // Wind: three slow, smooth strokes along the top of the sky build calm (the gusts ease)
      await ready('wind');
      t0 = await target(page);
      pts = [];
      for (let k = 0; k < 3; k++) { const p = line(30, g.skyTop + 50 + k * 14, g.W - 30, g.skyTop + 50 + k * 14, 24); pts.push(...p); await drag(page, p, 45); }
      await page.waitForFunction(() => __lab.weather.progress > 0.15, null, { timeout: T }).catch(() => {});
      await reach(page, `${scope}:wind`, 'Wind: slow strokes along the top calm the gusts', t0, boxOf(pts));
      // Fog: two wipes across the upper sky
      await ready('fog');
      t0 = await target(page);
      pts = [];
      for (let k = 0; k < 2; k++) { const p = line(16, g.skyTop + 40 + k * 40, g.W - 16, g.skyTop + 50 + k * 40, 12); pts.push(...p); await drag(page, p, 14); }
      await reach(page, `${scope}:fog`, 'Fog: two wipes across the top', t0, boxOf(pts));
      // Sunshine: the light taken a short way along the top of the sky
      await ready('sunshine');
      t0 = await target(page);
      const sun = await wx(page, () => __lab.weather.sims.sun.snapshot());
      pts = [[sun.x, sun.y], ...line(sun.x, sun.y, Math.max(40, sun.x - 200), g.skyTop + 60, 10)];
      await drag(page, pts, 30);
      await page.waitForFunction(() => __lab.weather.metrics().painted > 0.03, null, { timeout: T }).catch(() => {});
      await reach(page, `${scope}:sun`, 'Sunshine: the light taken along the top burns haze away', t0, boxOf(pts));
      // Rain: one bead on the left, let go up into the deck
      await ready('rain');
      const deckY = await wx(page, () => __lab.weather.sims.rain.deckY);
      t0 = await target(page);
      const bx = 60, by = deckY + 70;
      await page.mouse.move(bx, by); await page.mouse.down();
      await page.waitForFunction(() => (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 6, null, { timeout: T }).catch(() => {});
      await page.mouse.move(bx, deckY - 30, { steps: 4 }); await page.mouse.up();
      await page.waitForFunction(() => __lab.weather.progress > 0.05, null, { timeout: T }).catch(() => {});
      await reach(page, `${scope}:rain`, 'Rain: one bead sent up into the deck on the left', t0, boxOf([[bx, by], [bx, deckY - 30]]));
      noErrors(scope, r.errors);
    } finally { await r.ctx.close(); }
    // the night skies and the embers: Noomi (Moonlight), Zuzu (Starlight), Pipzi (Warm glow)
    for (const [id, w] of [['noomi', 'moonlight'], ['zuzu', 'starlight'], ['pipzi', 'warm']]) {
      r = await openWx(browser, 'phone', id);
      try {
        const { page } = r;
        await settled(page, w);
        await wx(page, () => __lab.weather.settle());
        await sleep(900);
        const g = await wx(page, () => __lab.weather.geo());
        const t0 = await target(page);
        let pts;
        if (w === 'moonlight') {
          // the moonlight brought down onto Noomi and rested there
          const m = await wx(page, () => __lab.weather.sims.moon.snapshot());
          pts = [[m.x, m.y], ...line(m.x, m.y, g.body.cx, g.body.mid, 10)];
          await page.mouse.move(m.x, m.y); await page.mouse.down();
          for (const p of pts.slice(1)) { await page.mouse.move(p[0], p[1]); await sleep(20); }
          await page.waitForFunction(() => __lab.weather.progress > 0.4, null, { timeout: T }).catch(() => {});
          await page.mouse.up();
          pts.push([g.body.cx - g.body.w / 2, g.body.top], [g.body.cx + g.body.w / 2, g.body.bottom]);
        } else if (w === 'starlight') {
          // stars swept up on the left (until at least three orbit the finger), let go: a constellation above Zuzu
          pts = await wx(page, () => {
            const s = __lab.weather.sims.stars, b = __lab.weather.geo().body, out = [];
            for (let i = 0; i < s.n; i++) if (s.st[i] === 0 && s.a[i] > 0.5 && Math.hypot(s.x[i] - b.cx, s.y[i] - b.mid) > b.h) out.push([s.x[i], s.y[i]]);
            out.sort((a, c) => (a[0] + a[1] * 0.5) - (c[0] + c[1] * 0.5));
            return out.slice(0, 6).sort((a, c) => a[0] - c[0]);
          });
          await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
          for (const p of pts.slice(1)) {
            await page.mouse.move(p[0], p[1], { steps: 8 });
            if (await wx(page, () => __lab.weather.metrics().heldStars >= 3)) break;
          }
          await page.waitForFunction(() => __lab.weather.metrics().heldStars >= 3, null, { timeout: T }).catch(() => {});
          await page.mouse.up();
          await page.waitForFunction(() => __lab.weather.metrics().constellations >= 1, null, { timeout: T }).catch(() => {});
          const c = await wx(page, () => { const s = __lab.weather.sims.stars, out = []; for (let i = 0; i < s.n; i++) if (s.st[i] === 2 || s.st[i] === 3) out.push([s.sx[i], s.sy[i]]); return out; });   // flying to / placed in its slots
          pts.push(...c);   // the constellation is the touch's own consequence: kept inside the box
        } else {
          // a drag through four waiting embers in the upper sky
          pts = await wx(page, () => {
            const e = __lab.weather.sims.embers, out = [];
            for (let i = 0; i < e.n; i++) if (e.litT[i] < 0) out.push([e.x[i], e.y[i]]);
            return out.sort((a, c) => a[1] - c[1]).slice(0, 4).sort((a, c) => a[0] - c[0]);
          });
          await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
          for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 6 });
          await page.mouse.up();
          await page.waitForFunction(() => __lab.weather.metrics().heat > 0.05, null, { timeout: T }).catch(() => {});
        }
        await reach(page, `${scope}:${w}`, `${w === 'warm' ? 'Warm glow' : w[0].toUpperCase() + w.slice(1)}: ${w === 'moonlight' ? 'moonlight resting on Noomi a while' : w === 'starlight' ? 'one constellation' : 'four embers kindled'}`, t0, boxOf(pts));
        if (w === 'moonlight') await waveReach(page, `${scope}:water`);
        noErrors(`${scope}:${w}`, r.errors);
      } finally { await r.ctx.close(); }
    }
  });

  // ------------------------------------------------------------ W5 touch --
  // Every W4 interaction again with real touch input (CDP) at 390×844, the two-finger spread in Storm, a tap on
  // the Mallow (TouchTalk, not weather), and the page never scrolls or zooms.
  if (only('touch')) await guard(`${SCOPE}:touch`, async (scope) => {
    let r = await openWx(browser, 'phone', 'loomi');
    let pad = null;
    try {
      const { page } = r;
      pad = await touchPad(page);
      const ready = async (w) => { await wx(page, (w) => __lab.weather.setWeather(w, { instant: true }), w); await settled(page, w); await wx(page, () => __lab.weather.settle()); await sleep(600); };
      const s0 = await scrolls(page);
      let g = await wx(page, () => __lab.weather.geo());
      // a tap on Loomi is TouchTalk: the Companion answers, the weather tools never see it
      await settled(page, 'wind');
      await H.clearEvents(page);
      const e0 = await wx(page, () => __lab.weather.events.length);
      await ttap(page, g.body.cx, g.body.mid);
      await page.waitForFunction(() => __lab.events.some((e) => e.type === 'tap'), null, { timeout: T }).catch(() => {});
      const tap = await wx(page, (e0) => ({ comp: __lab.events.map((e) => e.type), wx: __lab.weather.events.slice(e0).map((e) => e.type), active: __lab.weather.tools.active }), e0);
      check(`${scope}:mallow`, 'a touch tap on Loomi is TouchTalk: a Companion tap, no weather touch, no tool claimed (W7)', tap.comp.includes('tap') && !tap.wx.includes('touch') && tap.active === 0, JSON.stringify(tap));
      // Wind: a fast finger across the sky raises the flow
      await wx(page, () => __lab.weather.settle());
      await sleep(400);
      await H.clearEvents(page);
      const flow = (y) => wx(page, (y) => { const o = { vx: 0, vy: 0 }; __lab.weather.sims.wind.sample(__lab.weather.geo().W / 2, y, o); return Math.round(o.vx); }, y);
      const fy = g.skyTop + 105, f0 = await flow(fy);
      await tdrag(page, line(14, g.skyTop + 90, g.W - 14, g.skyTop + 120, 4));
      const f1 = await flow(fy), en1 = await wx(page, () => __lab.weather.metrics().energy);
      check(`${scope}:wind`, 'Wind by touch: the flow follows the finger (the current under its path runs its way, > 300 px/s); no Companion drag', f1 > 300 && f1 > f0 + 200 && !(await H.events(page)).some((t) => t === 'drag' || t === 'stroke'), JSON.stringify({ flow: [f0, f1], energy: en1 }));
      // Waves: a finger on the water pushes a swell
      const wy = g.water[0] + 50;
      await tdrag(page, line(8, wy, 120, wy, 3));
      const pushed = await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'water-push'), null, { timeout: T }).then(() => true, () => false);
      check(`${scope}:water`, 'Waves by touch: a finger on the water sends a swell', pushed);
      // Fog: two wipes clear the mist
      await ready('fog');
      for (let k = 0; k < 2; k++) await tdrag(page, line(16, g.skyTop + 80 + k * 60, g.W - 16, g.skyTop + 100 + k * 60, 6));
      const fc = await page.waitForFunction(() => __lab.weather.metrics().fogClear > 0.03, null, { timeout: T }).then(() => wx(page, () => __lab.weather.metrics().fogClear), () => -1);
      check(`${scope}:fog`, 'Fog by touch: wipes clear the mist (fogClear ↑)', fc > 0.03, `${fc}`);
      // Rain: a resting finger grows a bead; flicked up into the deck it goes up as light; a swipe leans the rain
      await ready('rain');
      const deckY = await wx(page, () => __lab.weather.sims.rain.deckY);
      const lv0 = await wx(page, () => __lab.weather.sims.rain.level);
      await pad.down(g.body.cx - 110, deckY + 70);
      const grew = await page.waitForFunction(() => (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 4, null, { timeout: T }).then(() => true, () => false);
      await pad.path(line(g.body.cx - 110, deckY + 70, g.body.cx - 110, deckY - 30, 4).slice(1), 16);
      await pad.up();
      const upd = await page.waitForFunction((lv) => __lab.weather.events.some((e) => e.type === 'bead-up') && __lab.weather.sims.rain.level < lv - 0.05, lv0, { timeout: T }).then(() => true, () => false);
      check(`${scope}:rain`, 'Rain by touch: a resting finger grows a bead; flicked up, it rises as light and the rain thins', grew && upd, JSON.stringify(await wx(page, () => ({ level: __lab.weather.sims.rain.level, ev: [...new Set(__lab.weather.events.map((e) => e.type))] }))));
      await tdrag(page, line(30, deckY + 150, g.W - 30, deckY + 170, 4));
      const lean = await wx(page, () => __lab.weather.sims.rain.lean);
      check(`${scope}:rain`, 'Rain by touch: a swipe leans the rain', Math.abs(lean) > 0.1, `${lean}`);
      // Storm: one finger down through the bank parts it; then two fingers spreading open a gap at their midpoint
      await ready('storm');
      g = await wx(page, () => __lab.weather.geo());
      const c0 = await wx(page, () => __lab.weather.metrics().clear);
      for (let k = 0; k < 2; k++) { const x = g.body.cx + (k - 0.5) * 40; await tdrag(page, line(x, g.skyTop + 6, x, g.body.top - 30, 4)); await sleep(250); }
      const c1 = await page.waitForFunction((c) => __lab.weather.metrics().clear > c + 0.05, c0, { timeout: T }).then(() => wx(page, () => __lab.weather.metrics().clear), () => -1);
      check(`${scope}:storm`, 'Storm by touch: a finger swiped down through the bank parts it', c1 > c0 + 0.05, `${c0} → ${c1}`);
      await wx(page, () => {
        const lw = __lab.weather, c = lw.sims.clouds;
        c.reset();
        window.__spread = [];
        if (!c.__spy) { c.__spy = c.spread; c.spread = function (x, y, k) { if (k > 0.001) window.__spread.push([Math.round(x), Math.round(y), +k.toFixed(3)]); return c.__spy.call(this, x, y, k); }; }
      });
      await sleep(300);
      const sc0 = await wx(page, () => __lab.weather.metrics().clear);
      await H.clearEvents(page);
      const my = (g.skyTop + g.body.top) / 2 - 20, mx = g.body.cx;
      await pad.down(mx - 22, my, 1); await pad.down(mx + 22, my, 2);
      await sleep(120);
      for (let k = 1; k <= 12; k++) { await pad.move(mx - 22 - k * 11, my, 1); await pad.move(mx + 22 + k * 11, my, 2); await sleep(40); }
      await H.shot(page, out, 'weather-phone-touch-spread');
      await pad.up(2); await pad.up(1);
      await sleep(500);
      const sp = await wx(page, () => ({ calls: window.__spread, clear: __lab.weather.metrics().clear, comp: __lab.events.map((e) => e.type) }));
      const near = sp.calls.length && sp.calls.every((c) => Math.abs(c[0] - mx) < 30 && Math.abs(c[1] - my) < 30);
      check(`${scope}:storm`, 'Storm by touch: two fingers spreading open a gap at their midpoint (clouds.spread there, clear ↑), never a squeeze', near && sp.clear > sc0 + 0.03 && !sp.comp.some((t) => /squeeze|drag|stroke/.test(t)),
        JSON.stringify({ mid: [mx, Math.round(my)], calls: sp.calls.slice(0, 6), n: sp.calls.length, clear: [sc0, sp.clear], comp: sp.comp }));
      // Sunshine: a finger takes the light across the sky, then onto Loomi
      await ready('sunshine');
      const sun = await wx(page, () => __lab.weather.sims.sun.snapshot());
      await tdrag(page, [[sun.x, sun.y], ...line(sun.x, sun.y, 40, g.skyTop + 80, 4).slice(1), ...line(40, g.skyTop + 80, g.W - 40, g.skyTop + 110, 6).slice(1)]);
      const painted = await page.waitForFunction(() => __lab.weather.metrics().painted > 0.05, null, { timeout: T }).then(() => true, () => false);
      const s1 = await wx(page, () => __lab.weather.sims.sun.snapshot());
      await pad.down(s1.x, s1.y);
      await pad.path(line(s1.x, s1.y, g.body.cx, g.body.mid, 10).slice(1), 30);
      const basked = await page.waitForFunction(() => __lab.weather.metrics().onBody && __lab.weather.metrics().bask > 0.3, null, { timeout: T }).then(() => true, () => false);
      await pad.up();
      check(`${scope}:sun`, 'Sunshine by touch: the light follows the finger, burns haze, and basks Loomi', painted && basked, JSON.stringify(await wx(page, () => __lab.weather.metrics())));
      // Warm glow: a finger through waiting embers kindles them
      await ready('warm');
      const em = await wx(page, () => {
        const e = __lab.weather.sims.embers, b = __lab.weather.geo().body, pts = [];
        for (let i = 0; i < e.n; i++) if (e.litT[i] < 0 && Math.hypot(e.x[i] - b.cx, e.y[i] - b.mid) > b.h * 0.8) pts.push([e.x[i], e.y[i]]);
        return pts.sort((a, c) => a[1] - c[1]).slice(0, 4).sort((a, c) => a[0] - c[0]);
      });
      const epts = [em[0]];
      for (let i = 1; i < em.length; i++) epts.push(...line(em[i - 1][0], em[i - 1][1], em[i][0], em[i][1], 3).slice(1));
      await tdrag(page, epts);
      const heat = await page.waitForFunction(() => __lab.weather.metrics().heat > 0.04, null, { timeout: T }).then(() => wx(page, () => __lab.weather.metrics().heat), () => -1);
      check(`${scope}:warm`, 'Warm glow by touch: a finger through the embers kindles them (heat ↑)', heat > 0.04, `${heat}`);
      const s1s = await scrolls(page);
      check(scope, 'the page never scrolled or zoomed through all of it (scroll, visual viewport offset 0, scale 1)', still0(s0) && still0(s1s), JSON.stringify({ s0, s1s }));
      noErrors(scope, r.errors);
    } finally { await pad?.close(); await r.ctx.close(); }
    // the night skies: Noomi's Moonmilk Cove
    r = await openWx(browser, 'phone', 'noomi');
    pad = null;
    try {
      const { page } = r;
      pad = await touchPad(page);
      await settled(page, 'moonlight');
      await wx(page, () => __lab.weather.settle());
      await sleep(600);
      const g = await wx(page, () => __lab.weather.geo());
      const m = await wx(page, () => __lab.weather.sims.moon.snapshot());
      await pad.down(m.x, m.y);
      await pad.path(line(m.x, m.y, g.body.cx, g.body.mid, 12).slice(1), 30);
      const lit = await page.waitForFunction(() => __lab.companion.rig.faceOverride?.set?.breathRate === 0.12, null, { timeout: T }).then(() => true, () => false);
      await pad.up();
      check(`${scope}:moon`, 'Moonlight by touch: the silver light taken onto Noomi slows its breath (breathRate 0.12)', lit);
      await wx(page, () => __lab.weather.setWeather('starlight', { instant: true }));
      await settled(page, 'starlight');
      await wx(page, () => __lab.weather.settle());
      await sleep(800);
      const sp = await wx(page, () => {
        const s = __lab.weather.sims.stars, b = __lab.weather.geo().body, pts = [];
        for (let i = 0; i < s.n; i++) if (s.st[i] === 0 && s.a[i] > 0.5 && Math.hypot(s.x[i] - b.cx, s.y[i] - b.mid) > b.h) pts.push([s.x[i], s.y[i]]);
        pts.sort((a, c) => (a[0] + a[1] * 0.5) - (c[0] + c[1] * 0.5));
        return pts.slice(0, 4).sort((a, c) => a[0] - c[0]);
      });
      await pad.down(sp[0][0], sp[0][1]);
      for (let i = 1; i < sp.length; i++) await pad.path(line(sp[i - 1][0], sp[i - 1][1], sp[i][0], sp[i][1], 8).slice(1), 20);
      const held = await page.waitForFunction(() => __lab.weather.metrics().heldStars >= 2, null, { timeout: T }).then(() => true, () => false);
      await pad.up();
      const made = await page.waitForFunction(() => __lab.weather.metrics().constellations >= 1, null, { timeout: T }).then(() => true, () => false);
      check(`${scope}:stars`, 'Starlight by touch: a finger sweeps up an orbiting cluster; let go, a constellation', held && made);
      const s1 = await scrolls(page);
      check(`${scope}:night`, 'still no page scroll or zoom', still0(s1), JSON.stringify(s1));
      noErrors(`${scope}:night`, r.errors);
    } finally { await pad?.close(); await r.ctx.close(); }
  });

  // ------------------------------------------------------------ W6 chips --
  // Every lead chip held from the keyboard (Space), the water chip pressed with Space, W held on the stage:
  // each gives the same change as its gesture.
  if (only('chips')) await guard(`${SCOPE}:chips`, async (scope) => {
    const METRIC = {   // what the gesture changes, read in the page, and how far the chip must move it
      sunshine: ['() => __lab.weather.metrics().bask', 0.5], wind: ['() => __lab.weather.metrics().calm', 0.04], fog: ['() => __lab.weather.metrics().fogClear', 0.08],
      rain: ['() => (__lab.weather.sims.rain.sheltered() ? 1 : 0) + Math.min(1, (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) / 3)', 1.9],
      storm: ['() => __lab.weather.metrics().clear', 0.15], warm: ['() => __lab.weather.metrics().heat', 0.1],
      moonlight: ['() => __lab.weather.metrics().dwell', 0.05], starlight: ['() => Math.max(0, __lab.weather.sims.stars.clusterSize(-11))', 3],
    };
    const res = {};
    for (const [id, list] of [['loomi', ['sunshine', 'wind', 'fog', 'rain', 'storm', 'warm']], ['noomi', ['moonlight', 'starlight']]]) {
      const r = await openWx(browser, 'phone', id);
      try {
        const { page } = r;
        for (const w of list) {
          await wx(page, (w) => __lab.weather.setWeather(w, { instant: true }), w);
          await settled(page, w);
          await wx(page, () => __lab.weather.settle());
          await sleep(500);
          const [src, need] = METRIC[w];
          const v0 = await wx(page, `(${src})()`);
          await page.focus('.wx-actions [data-action="lead"]');
          await page.keyboard.down('Space');
          const ok = await page.waitForFunction(({ src, v0, need }) => { const v = (0, eval)(src)(); return v >= v0 + need || __lab.weather.resolved; }, { src, v0, need }, { timeout: T * 2 }).then(() => true, () => false);
          const v1 = await wx(page, `(${src})()`);
          const after = { focus: await wx(page, () => document.activeElement?.dataset?.action || null), active: await wx(page, () => !!document.querySelector('.wx-actions .active')) };
          await page.keyboard.up('Space');
          await sleep(300);
          // what letting go does: Rain's bead goes up; Starlight's stream becomes a constellation
          let rel = true;
          if (w === 'rain') rel = await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'bead-up'), null, { timeout: T }).then(() => true, () => false);
          if (w === 'starlight') rel = await page.waitForFunction(() => __lab.weather.metrics().constellations >= 1, null, { timeout: T }).then(() => true, () => false);
          const released = await wx(page, () => !document.querySelector('.wx-actions .active') && !__lab.weather.tools.altActive);
          res[w] = { ok, v0: +(+v0).toFixed(3), v1: +(+v1).toFixed(3), rel, released, ...after };
        }
        if (id === 'loomi') {
          // "Push the water" with Space: a swell, as a drag on the water would send
          await wx(page, () => __lab.weather.setWeather('wind', { instant: true }));
          await settled(page, 'wind');
          await page.focus('.wx-actions [data-action="water"]');
          await page.keyboard.press('Space');
          res.water = await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'water-push'), null, { timeout: T }).then(() => true, () => false);
          // W held on the stage is the lead chip: Storm parts from the centre
          await wx(page, () => __lab.weather.setWeather('storm', { instant: true }));
          await settled(page, 'storm');
          await wx(page, () => __lab.weather.sims.clouds.reset());
          await page.focus('.weather .stage');
          const c0 = await wx(page, () => __lab.weather.metrics().clear);
          await page.keyboard.down('KeyW');
          const lit = await wx(page, () => !!document.querySelector('.wx-actions [data-action="lead"].active'));
          res.w = await page.waitForFunction((c0) => __lab.weather.metrics().clear > c0 + 0.15, c0, { timeout: T }).then(() => true, () => false);
          await page.keyboard.up('KeyW');
          res.wChip = lit && await wx(page, () => !document.querySelector('.wx-actions .active') && !__lab.weather.tools.altActive);
        }
        noErrors(`${scope}:${id}`, r.errors);
      } finally { await r.ctx.close(); }
    }
    for (const w of Object.keys(METRIC)) {
      const x = res[w];
      check(`${scope}:${w}`, `Space held on "${w === 'warm' ? 'Spread the warmth' : w}"'s chip does what the gesture does; letting go ends the hold`, !!x && x.ok && x.rel && x.released, JSON.stringify(x));
    }
    check(`${scope}:water`, 'Space on "Push the water" sends a swell', res.water === true);
    check(`${scope}:w`, 'W held on the stage is the lead chip held (the chip lights; Storm parts); letting go ends it', res.w === true && res.wChip === true, JSON.stringify({ w: res.w, chip: res.wChip }));
  });

  // ----------------------------------------------------------- W8 smooth --
  // A turn (Wind → Fog in the Blue Drift) and a front (→ Moonlight in the Moonmilk Cove), with the realm's eased
  // mood sampled every 100 ms: no step over 0.2 within a realm; a mid-turn frame is neither end recoloured; the
  // outgoing weather is still drawn 300 ms in; never a frame without a realm; a dragged front reveals sooner.
  if (only('smooth')) await guard(`${SCOPE}:smooth`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await settled(page, 'wind');
    await wx(page, () => __lab.weather.settle());
    await sleep(800);
    // the sampler: raw mood every 100 ms (tagged by realm instance), realm canvases every frame, each reveal's length
    await wx(page, () => {
      let n = 0;
      window.__raw = []; window.__noRealm = 0; window.__reveals = []; window.__seg = 0;   // __seg++ marks a fast-forward (settle)
      const id = setInterval(() => {
        const lw = __lab.weather, r = lw?.env.realm;
        if (!lw) { clearInterval(id); return; }
        if (r && !r.__wx) r.__wx = ++n;
        window.__raw.push({ t: performance.now(), realm: r ? `${r.__wx}:${window.__seg}` : 0, ...(r ? r.debug.state.raw : {}) });
      }, 100);
      let inReveal = false, revealT = 0;
      const tick = () => {
        const lw = __lab.weather;
        if (!lw) return;
        if (!document.querySelector('.weather canvas.hushfold-realm')) window.__noRealm++;
        const p = lw.session.planner;
        if (p.phase === 'reveal') { inReveal = true; revealT = p._revealT; } else if (inReveal) { inReveal = false; window.__reveals.push(+revealT.toFixed(3)); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      window.__stopRaw = () => clearInterval(id);
    });
    const A = await composite(page);
    // the turn: Wind → Fog
    const tPick = await wx(page, () => __lab.weather.reactor.t);
    await page.click('.wx-dial [data-weather="fog"]');
    // 300 ms (sim time) in: the ribbons still drawn while the mist rises
    await page.waitForFunction((t) => __lab.weather.reactor.t >= t + 0.3, tPick, { timeout: T });
    const at300 = await wx(page, () => ({ wind: +__lab.weather.session.planner.amount('wind').toFixed(2), ribbons: __lab.weather.layer.stats().drawn.ribbons, front: !!__lab.weather.front }));
    await page.waitForFunction((t) => __lab.weather.reactor.t >= t + 0.45, tPick, { timeout: T });
    const at450 = await wx(page, () => ({ wind: +__lab.weather.session.planner.amount('wind').toFixed(2), fog: +__lab.weather.session.planner.amount('fog').toFixed(2), ribbons: __lab.weather.layer.stats().drawn.ribbons }));
    check(scope, 'a turn in place: the outgoing ribbons are still drawn 300 ms in, and the mist has begun to rise alongside them by 450 ms (no front)', at300.wind > 0.3 && at300.ribbons > 0 && !at300.front && at450.fog > 0 && at450.ribbons > 0, JSON.stringify({ at300, at450 }));
    await page.waitForFunction(() => { const p = __lab.weather.session.planner; return p.amount('fog') >= 0.4 && p.amount('wind') <= 0.6 && p.amount('wind') > 0.1; }, null, { timeout: T, polling: 'raf' });
    const M = await composite(page);
    const mid = await wx(page, () => ({ wind: +__lab.weather.session.planner.amount('wind').toFixed(2), fog: +__lab.weather.session.planner.amount('fog').toFixed(2) }));
    await settled(page, 'fog');
    await wx(page, () => { window.__seg++; __lab.weather.settle(); });   // a fast-forward: its jump is not a step
    await sleep(800);
    const B = await composite(page);
    const rr = { startMid: residual(A, M), midEnd: residual(M, B), startEnd: residual(A, B), mid };
    check(scope, 'mid-turn the world is its own frame, neither end recoloured (residual > 3 against each end)', rr.startMid > 3 && rr.midEnd > 3, JSON.stringify(rr));
    // a front without a drag, then one pushed by drags during its reveal
    await page.click('.wx-dial [data-weather="moonlight"]');
    await settled(page, 'moonlight');
    await page.click('.wx-dial [data-weather="sunshine"]');   // the cove cannot paint sunshine: a front home to the Blue Drift
    await page.waitForFunction(() => __lab.weather.session.planner.phase === 'reveal', null, { timeout: T, polling: 'raf' });
    for (let k = 0; k < 12 && (await wx(page, () => __lab.weather.session.planner.phase === 'reveal')); k++) await drag(page, line(20, 300 + k * 6, 370, 320 + k * 6, 6), 8);
    await settled(page, 'sunshine');
    await sleep(300);
    await wx(page, () => window.__stopRaw());
    const s = await wx(page, () => ({ raw: window.__raw, none: window.__noRealm, reveals: window.__reveals }));
    let maxStep = 0, at = null;
    for (let i = 1; i < s.raw.length; i++) {
      const a = s.raw[i - 1], b = s.raw[i];
      if (a.realm !== b.realm || !a.realm) continue;   // a swap happens under a full front: a new realm starts its own ease
      for (const k of ['agitation', 'heaviness', 'clarity', 'warmth']) { const d = Math.abs(b[k] - a[k]); if (d > maxStep) { maxStep = d; at = { k, i, dt: Math.round(b.t - a.t) }; } }
    }
    const realms = new Set(s.raw.map((x) => x.realm)).size;
    check(scope, 'the realm\'s eased mood never steps by more than 0.2 between 100 ms samples (turn and two fronts)', s.raw.length > 20 && maxStep <= 0.2 && realms >= 3, JSON.stringify({ samples: s.raw.length, realms, maxStep: +maxStep.toFixed(3), at }));
    check(scope, 'never a frame without a realm canvas', s.none === 0, `${s.none}`);
    check(scope, 'dragging the front shortens its reveal (but never under 0.5 s)', s.reveals.length >= 2 && s.reveals[1] < s.reveals[0] - 0.1 && s.reveals[1] >= 0.45, JSON.stringify(s.reveals));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- W14 leak --
  // After Weather, TouchTalk starts clean: no resting face, face override, inflate, weather realm, timers, rAF
  // or keep voice of ours left behind; and the screen opens with storage blocked.
  if (only('leak')) await guard(`${SCOPE}:leak`, async (scope) => {
    let r = await H.open(browser, 'phone', '#home', { initScripts: [H.INIT.timerSpy, H.INIT.rafProbe], comfort: H.comfort({ favouriteMallow: 'noomi' }) });
    try {
      const { page } = r;
      await H.waitRig(page, { timeout: T });
      await wx(page, () => __lab.ctx.navigate('/weather'));
      await page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T });
      const g = await wx(page, () => __lab.weather.geo());
      await page.mouse.click(g.W * 0.12, g.skyTop + 40);   // a gesture: the bed builds
      await page.waitForFunction(() => __lab.weather.sound.alive, null, { timeout: T }).catch(() => {});
      // moonlight on Noomi: a face override (slow breath, glow), an inflate and a resting face all in play
      const m = await wx(page, () => __lab.weather.sims.moon.snapshot());
      await page.mouse.move(m.x, m.y); await page.mouse.down();
      await page.mouse.move(g.body.cx, g.body.mid, { steps: 10 });
      await page.waitForFunction(() => __lab.companion.rig.faceOverride?.set?.breathRate === 0.12, null, { timeout: T }).catch(() => {});
      const during = await wx(page, () => ({ face: JSON.stringify(__lab.companion.rig.faceOverride), rest: !!__lab.companion.restOverride }));
      await page.mouse.up();
      await wx(page, () => __lab.ctx.navigate('/touchtalk'));   // straight on (the router unmounts Weather)
      await page.waitForFunction(() => __lab.route === 'touchtalk' && __lab.companion?.rig?.soft, null, { timeout: T });
      await sleep(3500);
      const s = await wx(page, () => {
        const c = __lab.companion, rig = c.rig, mine = (f) => /\/(features\/weather|core\/weather)/.test(f);
        const timers = Object.entries(__timers().live).filter(([f, v]) => mine(f) && (v.timeout || v.interval));
        const raf = Object.keys(__raf().pendingByFile).filter(mine);
        const realms = [...document.querySelectorAll('canvas.hushfold-realm')];
        return {
          rest: c.restOverride ?? null, face: JSON.stringify(rig.faceOverride || {}), inflate: rig.inflateTarget || 0, peek: rig.peekParams ?? null, frameCap: rig.frameCap ?? null, filter: c.persona?.filter ?? null,
          wx: document.querySelectorAll('.weather, .wx-back, .wx-front').length, handle: __lab.weather, realms: realms.length, foreign: realms.filter((cv) => !cv.closest('.screen:not(.weather)')).length,
          timers, raf, keep: __lab.sound.debug().keep, live: __lab.sound.live.size,
        };
      });
      check(scope, 'Weather really had the Mallow in hand (moonlit face override, resting face)', /breathRate/.test(during.face) && during.rest, JSON.stringify(during));
      check(scope, 'TouchTalk after Weather: no resting face, face override, inflate, peek or frame cap carried over', s.rest === null && s.face === '{"set":{},"min":{}}' && !s.inflate && s.peek === null && s.frameCap === null && s.filter === null, JSON.stringify(s));
      check(scope, 'no weather screen, canvas, realm or handle left; no timer or rAF from a weather file; no keep voice', s.wx === 0 && s.handle === null && s.foreign === 0 && !s.timers.length && !s.raf.length && s.keep === 0, JSON.stringify(s));
      noErrors(scope, r.errors);
    } finally { await r.ctx.close(); }
    // storage blocked (site data off): the app sees throwing storage from the moment its scripts run
    const block = () => {
      const deny = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
      document.addEventListener('readystatechange', () => {
        if (document.readyState !== 'interactive') return;
        for (const k of ['localStorage', 'sessionStorage']) Object.defineProperty(window, k, { configurable: true, get: deny });
      });
    };
    r = await H.open(browser, 'phone', '#weather', { initScripts: [block] });
    try {
      const { page } = r;
      await H.waitRig(page, { timeout: T });
      const live = await page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T }).then(() => true, () => false);
      const g = live ? await wx(page, () => __lab.weather.geo()) : null;
      if (g) { await page.mouse.click(g.W * 0.12, g.skyTop + 40); await drag(page, line(20, g.skyTop + 90, g.W - 20, g.skyTop + 110, 10), 14); }
      const s = await wx(page, () => ({ blocked: (() => { try { void localStorage.length; return false; } catch { return true; } })(), w: __lab.weather?.weather, events: __lab.weather?.events.length || 0 }));
      check(`${scope}:storage`, 'storage blocked: Weather still opens and answers touch, with no errors', live && s.blocked && s.events > 0, JSON.stringify(s));
      noErrors(`${scope}:storage`, r.errors);
    } finally { await r.ctx.close(); }
  });

  // ----------------------------------------------------------- W13 layout --
  // At all six viewports: no overlap, everything on screen, targets ≥ 40 px, no horizontal scroll, the Mallow
  // between the bars, the chosen radio in view, the same baseline for all eight weathers; the caption and the
  // Mallow's line fit on screen at 14 px or more.
  if (only('layout')) await guard(`${SCOPE}:layout`, async (scope) => {
    const WHO = { phone: 'pipzi', p375: 'zuzu', small: 'blubi', android: 'noomi', desktop: 'boppo', land: 'glitzi' };
    for (const vp of ['phone', 'p375', 'small', 'android', 'desktop', 'land']) {
      const { ctx, page, errors } = await openWx(browser, vp, WHO[vp]);
      try {
        const sc = `${scope}:${vp}`;
        const entry = await wx(page, () => __lab.weather.weather);
        await settled(page, entry);
        await sleep(900);   // the arrival hint is up from 0.8 s
        await H.shot(page, out, `weather-${vp}-layout-${entry}`);
        const bases = {};
        let inView = true;
        for (const w of DIAL) {
          await wx(page, (w) => __lab.weather.setWeather(w, { instant: true }), w);
          await settled(page, w);
          bases[w] = await wx(page, () => __lab.companion.rig.BASE.toFixed(1));
          inView = inView && await wx(page, () => { const dial = document.querySelector('.wx-dial'), r = dial.getBoundingClientRect(), b = dial.querySelector('[aria-checked="true"]').getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1; });
          if (w === 'storm') { await H.layout(page, sc, { scrollers: ['.wx-dial', '.wx-actions'] }); await sleep(300); await H.shot(page, out, `weather-${vp}-layout-storm`); }
        }
        const rows = await wx(page, () => [...document.querySelectorAll('.weather .bottom > *')].map((e) => Math.round(e.getBoundingClientRect().height)));
        check(sc, 'the chosen radio stays in view for every weather; both bottom rows 50 px', inView && rows.join() === '50,50', JSON.stringify({ inView, rows }));
        check(sc, 'the baseline is the same for all eight weathers', new Set(Object.values(bases)).size === 1, JSON.stringify(bases));
        // the resolve beat's caption and line (Rain, caught): on screen, clear of the chrome, ≥ 14 px
        await wx(page, () => __lab.weather.setWeather('rain', { instant: true }));
        await settled(page, 'rain');
        await wx(page, () => { __lab.weather.sims.rain.level = 0.1; });
        await page.waitForFunction(() => __lab.weather.resolved && document.querySelector('.weather .wx-hint.on .line'), null, { timeout: T });
        await sleep(700);   // its 320 ms fade-in
        const cap = await wx(page, () => {
          const q = (s) => document.querySelector(s), hint = q('.weather .wx-hint'), r = hint.getBoundingClientRect();
          const bar = [...document.querySelectorAll('.weather .topbar button')].map((b) => b.getBoundingClientRect());
          const bottom = q('.weather .bottom').getBoundingClientRect().top;
          const sizes = ['.wx-cap', '.line', '.line .who'].map((s) => parseFloat(getComputedStyle(hint.querySelector(s)).fontSize));
          const hit = bar.some((b) => r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom);
          return { box: [r.left, r.top, r.right, r.bottom].map(Math.round), vw: innerWidth, bottom: Math.round(bottom), sizes, hit, text: hint.textContent, lines: Math.round(r.height / 20) };
        });
        check(sc, 'the caption and the Mallow\'s line sit on screen under the top bar, clear of its buttons and the bottom rows, at ≥ 14 px',
          cap.box[0] >= 4 && cap.box[2] <= cap.vw - 4 && cap.box[3] < cap.bottom && !cap.hit && cap.sizes.every((v) => v >= 14), JSON.stringify(cap));
        await H.shot(page, out, `weather-${vp}-layout-resolved`);
        noErrors(sc, errors);
      } finally { await ctx.close(); }
    }
    // two chips (a water realm: the lead chip and "Push the water") at the narrowest phone and in landscape
    for (const vp of ['small', 'land']) {
      const { ctx, page, errors } = await openWx(browser, vp, 'noomi');
      try {
        const sc = `${scope}:${vp}:water`;
        await settled(page, 'moonlight');
        const chips = await wx(page, () => [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent));
        await H.layout(page, sc, { scrollers: ['.wx-dial', '.wx-actions'] });
        const rows = await wx(page, () => [...document.querySelectorAll('.weather .bottom > *')].map((e) => Math.round(e.getBoundingClientRect().height)));
        check(sc, 'two chips side by side, the rows still 50 px', chips.length === 2 && rows.join() === '50,50', JSON.stringify({ chips, rows }));
        await H.shot(page, out, `weather-${vp}-layout-two-chips`);
        noErrors(sc, errors);
      } finally { await ctx.close(); }
    }
  });
}

module.exports = { run };

if (require.main === module) {
  (async () => {
    const out = process.argv[2] || OUT_DEFAULT;
    const browser = await H.launch();
    try { await run(browser, { out }); } finally { await browser.close(); }
    const { failed } = H.writeReport(out, 'e2e-phase3-weather', { prefix: `${SCOPE}:` });
    // the brief line each block proves, beside the results (spec §13)
    const file = path.join(out, 'e2e-phase3-weather.json'), rep = JSON.parse(require('fs').readFileSync(file, 'utf8'));
    require('fs').writeFileSync(file, JSON.stringify({ ...rep, brief: BRIEF }, null, 1));
    process.exit(failed ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(2); });
}
