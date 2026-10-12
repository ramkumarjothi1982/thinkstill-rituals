// World 1 — Glitzi's Static Storm (intentional slowing).
//
// The storm starts charged from the person's feeling. Fast strokes deposit
// crackling charge (allowed, noticed, never punished); slow strokes draw warm
// gold ground lines that drink the charge around the finger and slide down
// into the floor; holding still sends ground pulses (the tap / hold
// alternative). Progress is only the light grounded. The person's Thought
// Mallow is tethered in the storm and crackles until grounded (slow circles
// round it ground it faster); photos hang as charged postcards on ropes and
// ground back to their own colours. The 'slowing' discovery fires when fast
// movement really was followed by slow grounding that calmed the field.
//
// Layers: the static-storm realm core is the back layer (its own canvas —
// its glitch bands copy that canvas); gameplay behind the Mallow is drawn
// into it after the realm frame. Everything above the Mallow goes to ctx.front.
// Layout: storm-layout.js (the subtitle band stays clear; nothing overlaps).
// Spec and constants: docs/audit/worlds.md proposals 5 and 7, with these
// deliberate differences:
//   · speeds are the director's path speeds (velocity.js), so a scribble is fast;
//     charge deposits above 'fast' exactly as specified (0.9·clamp((v − fast)/fast, 0, 2)
//     per cell-length of path, rather than per second);
//   · per-person calibration only LOWERS 'fast' (min(1.8U, max(1.3U, 1.6 × median))),
//     never raises it as max(1.8U, …) would — a scribbler is always fast, a gentle
//     mover can get there too (discovery.js);
//   · the Thought Mallow floats low in the play zone (above Glitzi), not at 0.3 of
//     the safe height, so the postcards can hang under the clouds at ≥ 0.2U;
//   · the photo cap is 7 Mallow cards / photos (D5), and the photosafe limiter,
//     the 'slowing' and 'stillness' discoveries and natural completion follow the spec.

import { createRealmCore } from '../../../world/realm.js';
import { glowSprite, glintSprite, Pool, Rings, flashEnv, clamp, lerp, smoothstep, TAU, makeCanvas } from '../../../world/util.js';
import { Rope, Spring2 } from '../../../v3/fx.js';
import { AngleTracker, Wobble, waitRing } from '../../../v3/kit.js';
import { ChargeField, FIELD } from './storm-field.js';
import { planStormLayout, freeStretches, LAYOUT } from './storm-layout.js';
import { createPace, slowness, PACE, createSlowingDetector, createStillnessDetector, createSettleDetector } from '../discovery.js';

const C = {
  cyan: '#3ee8ff', magenta: '#ff3df2', violet: '#7b5cff', white: '#ffffff',
  gold: '#ffd98a', amber: '#ffb35c', rose: '#ff9ec4', cream: '#fff4dc',
};
const MAX_LINES = 14, MAX_PTS = 240, LINE_STEP = 6, SEGMENT_SEC = 1.4, FALL_SEC = 4;
const PULSE_SEC = 1.6, PULSE_CELLS = 5, MAX_ARCS = 6;
const HINT_SEC = 3.4;                 // the ghost-finger hint (still, under reduced motion: 0.6 s in, 2.2 s held, 0.6 s out)
const BRIGHT_PER_SEC = 3;
const ROPE_N = 6;
// tone mapping of the charge plasma (drawn 'screen' over the realm, so peaks stay coloured
// and never burn to white over the bright cloud deck)
const PLASMA_A_MAX = 0.66, FRESH_WHITE_MAX = 0.5;
const TM_NORM = 1 / (1 - Math.exp(-1.6 * 1.4));   // the shoulder reaches PLASMA_A_MAX at A = 1.4
const BAND_ATT = 0.3, BAND_FEATHER = 24;

const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const rgbaHex = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;

export function create(ctx) {
  const { photos, words } = ctx;
  const mallow = ctx.mallow || null;
  let thought = ctx.thought || null;
  const R = ctx.rand;
  let W = ctx.W, H = ctx.H, U = ctx.U;
  const reduced = () => ctx.reduced;
  const intensity = clamp(ctx.intensity ?? 0.6);
  const hot = ctx.emotion === 'angry' || ctx.emotion === 'frustrated';
  const qFor = (emotion, i) => clamp(0.35 + 0.5 * clamp(i) + (emotion === 'angry' || emotion === 'frustrated' ? 0.08 : 0), 0.3, 0.95);
  const q0 = qFor(ctx.emotion, intensity);
  // the feeling the storm was charged from; a change mid-storm eases its own charge over FEEL_SEC
  let feel = { id: ctx.emotion, q: q0 }, feelEase = { m: 1, left: 0 };
  const FEEL_SEC = 2.5;

  // ------------------------------------------------------------ realm --
  let realm = null;
  let groundFrac = 0.88;
  let horizonY = Math.round(H * 0.655);

  // --------------------------------------------------------- simulation --
  let field = null;
  const pace = createPace({ U });
  const slowingD = createSlowingDetector({ drainScale: 8 });
  const stillD = createStillnessDetector({ drainMin: 4 });
  const thoughtSettle = createSettleDetector({ below: 0.15, above: 0.3, forSec: 2 });

  // fingers (two at most)
  const fingers = [0, 1].map(() => ({
    on: false, id: -1, x: 0, y: 0, px: 0, py: 0, speed: 0, s: 0, k: 0, t0: 0, still: 0, fastFor: 0, slowGap: 0, slowFor: 0,
    line: null, lastEv: 0, onThought: false, pulse: { on: false, age: 0, drained: 0 }, wait: 0, tracker: new AngleTracker(), circling: 0,
    trail: { x: new Float32Array(28), y: new Float32Array(28), t: new Float32Array(28), j: new Float32Array(28), n: 0, head: 0 },
    pointerType: 'touch', grounding: 0, deep: 0, deepOn: false, deepAt: -9,
  }));
  let liftAt = 0, everTouched = false, firstTouchAt = -1;
  let lastCrackle = 0, crackleClock = 0;

  // ground lines
  const lines = [];
  for (let i = 0; i < MAX_LINES; i++) lines.push({ on: false, state: 'idle', pts: new Float32Array(MAX_PTS * 2), n: 0, age: 0, fall: 0, s: 0, drink: 0, cy: 0, cx: 0, minY: 0, maxY: 0, grad: null, landed: false, len: 0 });

  // particles
  const motes = new Pool(220);       // charge flowing into the finger (front)
  const fallers = new Pool(260);     // gold light falling to the floor (back)
  const sparks = new Pool(160);      // crackle sparks (front)
  const rings = new Rings(14);       // pulses and landings (front)
  const floorRings = new Rings(10);  // landings on the floor (back)
  const moteTx = new Float32Array(220), moteTy = new Float32Array(220);
  let sprites = null;

  // arcs
  const arcs = [];
  for (let i = 0; i < MAX_ARCS; i++) arcs.push({ on: false, age: 0, ttl: 0.25, n: 0, pts: new Float32Array(48), bright: false, colour: C.cyan });
  let arcClock = 0;
  const bright = new Float64Array(8); let brightN = 0;
  function brightOK(now) {
    let c = 0;
    for (let i = 0; i < Math.min(brightN, 8); i++) if (now - bright[i] < 1) c++;
    if (c >= BRIGHT_PER_SEC) return false;
    bright[brightN % 8] = now; brightN++;
    return true;
  }

  // charge plasma rendering (tiny canvases, upscaled twice)
  let fieldC = null, fieldG = null, fieldData = null, maskData = null, clearData = null, midC = null, midG = null;
  let grainC = null, grainG = null, grainPat = null, grainPatFill = null, grainScale = 1.5;
  let startQ = null;                 // 0..1: how charged each cell was at the start (the clear sky shows only where storm was)
  let phase = null;                  // per-cell shimmer phases
  let afterglow = null;              // per-cell warm glow where light was just grounded
  let rowAtt = null;                 // per field row: 1, or BAND_ATT under the subtitle band (feathered)

  // postcards: one per photo (allCards, index i = photo i); `cards` are the ones hanging now.
  // On short screens fewer hang at once (storm-layout SHORT_MAX); the rest wait their turn and
  // swap in, one at a time, as a hanging one grounds (it lets go into gold light, the next drops in).
  const allCards = [];
  const cards = [];
  const waiting = [];
  const SWAP_AFTER = 2.4, SWAP_OUT = 0.9, SWAP_IN = 0.9;
  // thought
  const tSpring = new Spring2(0, 0, { stiffness: 30, damping: 8 });
  const tWobble = new Wobble();
  let tAnchor = { x: 0, y: 0 }, tCharge = clamp(q0 + 0.2, 0.6, 1.2), tTension = 0.7, tSettledShown = false, tFizz = 0, tScale = 1, tR = 34, tLabelW = 300;
  let ropeGrads = null;               // rope colours fading out inside the subtitle band (cached per layout)
  const tTracker = new AngleTracker();

  // state
  let Q = q0, p = 0, light0 = 0, complete = false, completeAt = -1, elapsed = 0, lastDrain = 0, drainRate = 0;
  let firstSurge = false, discovered = new Set(), groundedCards = 0;
  let glitchAt = -10, emoAt = -10, emoKey = '';
  let holds = { charge: null, ground: null }, groundIdle = 0, holdClock = 0, ambClock = 0;
  let hint = { next: 5, shown: 0, age: -1, x0: 0, y0: 0, ok: false };
  let paused = false, outroK = 0;
  let pulsedThisFrame = false, pulseDrainThisFrame = 0;
  let prepared = false;
  let introAt = -1;
  let realmBuilt = false;

  // ---------------------------------------------------------- layout --
  // storm-layout.js plans the screen: the subtitle band stays clear, postcards hang
  // under the clouds (or beside Glitzi on short screens), the thought floats with its
  // words plate, nothing overlaps and nothing comes within 20 px of an edge.
  const EDGE = LAYOUT.EDGE;
  let plan = null;
  let measureG = null;
  function textWidth(str, px = LAYOUT.LABEL_PX, weight = 700) {
    if (!str) return 0;
    try { measureG ||= makeCanvas(4, 4).getContext('2d'); measureG.font = ctx.font(px, weight); return measureG.measureText(str).width; } catch { return str.length * px * 0.55; }
  }
  function mallowBox() {
    const r = mallow?.rect?.();
    if (!r || !(r.height > 20) || !(r.width > 20)) return null;
    const left = r.left ?? r.x, top = r.top ?? r.y;
    return { left, top, right: r.right ?? left + r.width, bottom: r.bottom ?? top + r.height, width: r.width, height: r.height };
  }
  function planLayout() {
    const tok = thought ? (thought.token || words?.token || '') : '';
    return planStormLayout({ W, H, safe: ctx.safe, band: ctx.band, mallow: mallowBox(), n: Math.min(7, photos?.n || 0), thought: thought ? { textW: textWidth(tok) } : null });
  }

  // the shell may move or resize the hero Mallow after the world enters (its 720 ms glide):
  // re-plan once its box has been steady for half a second
  let layoutKey = '', pendingKey = '', pendingFor = 0, relayoutClock = 0;
  function keyNow() { const m = mallowBox(), sf = ctx.safe; return m ? `${Math.round(m.left / 6)},${Math.round(m.top / 6)},${Math.round(m.width / 6)},${Math.round(sf.y / 4)},${W},${H}` : `-,${Math.round(sf.y / 4)},${W},${H}`; }
  function relayoutCheck(dt) {
    relayoutClock += dt;
    if (relayoutClock < 0.25) return;
    const step = relayoutClock; relayoutClock = 0;
    const k = keyNow();
    if (k === layoutKey) { pendingKey = ''; return; }
    if (k !== pendingKey) { pendingKey = k; pendingFor = 0; return; }
    pendingFor += step;
    if (pendingFor >= 0.5) { pendingKey = ''; layout(); }
  }

  function layout() {
    layoutKey = keyNow();
    const mb = mallowBox();
    if (mb) groundFrac = clamp(mb.bottom / H, 0.78, 0.95);
    horizonY = realm?.horizonY ?? Math.round(H * 0.655);
    const band = ctx.band;
    // the charge field covers the whole storm sky, band included: a stroke anywhere is answered
    const fy0 = Math.max(24, (band ? band.y : ctx.safe.y) - 14), fy1 = Math.min(H - 30, horizonY + H * 0.07);
    if (!field) field = new ChargeField({ x: 0, y: fy0, w: W, h: fy1 - fy0, q0, seed: ctx.seed });
    else field.setRect(0, fy0, W, fy1 - fy0);
    plan = planLayout();
    bandRows();
    const T = plan.thought;
    if (T) { tR = T.r; tAnchor = { x: T.x, y: T.y }; tLabelW = T.labelW; }
    else { tR = clamp(U * 0.085, 26, 44); tAnchor = { x: W * 0.27, y: plan.zone.y + plan.zone.h * 0.5 }; tLabelW = Math.min(300, W - 64); }
    if (!tSpring.x && !tSpring.y) tSpring.set(tAnchor.x, tAnchor.y);
    else tSpring.to(tAnchor.x, tAnchor.y);
    layoutCards();
    placeHint();
    ropeGrads = null;
  }

  /**
   * The subtitle band stays readable however hard the sky is scribbled: every plasma, grain,
   * lattice and static term in the field rows under the band is drawn at BAND_ATT (feathered
   * over BAND_FEATHER px). Strokes there are still answered at once by the crackle trail, the
   * sparks and a soft glow at the fingertip (front layer), and the charge itself is simulated
   * exactly as anywhere else (so it still counts, spreads and grounds).
   */
  function bandRows() {
    if (!field) return;
    if (!rowAtt || rowAtt.length !== field.rows) rowAtt = new Float32Array(field.rows);
    const b = plan?.band || ctx.band;
    for (let j = 0; j < field.rows; j++) {
      const y = field.cy(j);
      const inside = b ? smoothstep(b.y - BAND_FEATHER, b.y, y) * (1 - smoothstep(b.y + b.h, b.y + b.h + BAND_FEATHER, y)) : 0;
      rowAtt[j] = 1 - (1 - BAND_ATT) * inside;
    }
  }
  const inBand = (y, pad = 0) => { const b = plan?.band; return !!b && y > b.y - pad && y < b.y + b.h + pad; };

  /** The underside of the storm's cloud deck at x (matches the static-storm realm). */
  function deckY(x) { const u = x / W - 0.58; return H * (0.095 + 0.3 * u * u) + Math.sin(x * 0.03) * 6; }

  function newCard(i) {
    return { i, q: clamp(0.55 + R() * 0.35 + (hot ? 0.1 : 0), 0, 1), grounded: false, gk: 0, glowAge: -1, wobble: new Wobble(), ph: R() * TAU, flash: 0, touched: 0, rot: 0, row: 0,
      alpha: 1, leaving: -1, entering: -1, groundedFor: 0, slot: -1, x: 0, y: 0, w: 1, h: 1, size: 1 };
  }
  function layoutCards() {
    const n = Math.min(7, photos?.n || 0);
    if (allCards.length > n) allCards.length = n;
    while (allCards.length < n) allCards.push(newCard(allCards.length));
    const { slots } = plan;
    const k = Math.min(n, slots.length);
    // who hangs: those already hanging keep their turn, then the ungrounded ones waiting, then the rest
    const keep = cards.filter((c) => c.i < n && c.leaving < 0).map((c) => c.i);
    const order = [...keep];
    for (const c of allCards) if (!order.includes(c.i) && !c.grounded) order.push(c.i);
    for (const c of allCards) if (!order.includes(c.i)) order.push(c.i);
    cards.length = 0;
    waiting.length = 0;
    order.forEach((i, j) => { if (j < k) { const c = allCards[i]; c.leaving = -1; c.alpha = 1; hang(c, j); cards.push(c); } else waiting.push(i); });
    // lower rows first, so a rope from the clouds passes behind the cards above it
    cards.sort((a, b) => b.row - a.row);
  }
  /** Hang card c in slot j (rope from the cloud deck). */
  function hang(c, j) {
    const sl = plan.slots[j] || { x: W / 2, y: plan.zone.y + plan.s / 2 };
    const sz = photos.size(c.i, 'card', plan.s);
    const ax = sl.x + (R() - 0.5) * 6, ay = Math.min(deckY(sl.x) - 6, plan.band.y + plan.band.h * 0.5);
    const top = sl.y - sz.h / 2;
    Object.assign(c, { slot: j, ax, ay, ay0: ay, x: sl.x, y: sl.y, sx: sl.x, sy: sl.y, w: sz.w, h: sz.h, size: plan.s, row: sl.y, rot: 0 });
    c.rope = new Rope(ROPE_N, ax, ay, sl.x, Math.max(ay + 10, top), { gravity: 260, iterations: 6, slack: 1.0 });
    c.rope.pinB = false;
    c.seg0 = c.rope.seg;
    // grounded cards hang a little higher (never more than 10 px, so they stay clear of what is above)
    c.restLen = c.grounded ? c.seg0 - Math.min(0.14 * c.seg0, 10 / (ROPE_N - 1)) : c.seg0;
  }
  /** A grounded card that has had its moment lets go; the next waiting photo drops into its slot. */
  function swapCards(dt, rm) {
    for (let k = 0; k < cards.length; k++) {
      const c = cards[k];
      if (c.entering >= 0) { c.entering += dt / SWAP_IN; c.alpha = easeOut(c.entering); if (c.entering >= 1) { c.entering = -1; c.alpha = 1; } }
      if (c.grounded && c.leaving < 0) c.groundedFor += dt; else if (!c.grounded) c.groundedFor = 0;
      if (c.leaving < 0 && c.grounded && c.groundedFor >= SWAP_AFTER && waiting.length && !allCards[waiting[0]].grounded && c.entering < 0) {
        c.leaving = 0;
        // its light lets go and drifts down to the floor
        for (let e = 0; e < (rm ? 3 : 10); e++) fallers.spawn(c.x + (R() - 0.5) * c.w, c.y + (R() - 0.5) * c.h, (R() - 0.5) * 24, 8 + R() * 18, 1.4 + R(), 2 + R() * 2.5, (R() * 3) | 0, 0.85);
      }
      if (c.leaving >= 0) {
        c.leaving += dt / SWAP_OUT;
        c.alpha = 1 - easeOut(c.leaving);
        if (c.leaving >= 1) {
          const nx = allCards[waiting.shift()];
          waiting.push(c.i);              // it can come round again later, already grounded
          c.leaving = -1; c.alpha = 1; c.groundedFor = 0;
          nx.leaving = -1; nx.entering = 0; nx.alpha = 0; nx.groundedFor = 0;
          hang(nx, c.slot);
          cards[k] = nx;
        }
      }
    }
  }

  /**
   * Where the ghost-finger hint draws its slow stroke: a clear stretch of sky in the play
   * zone, else across a row of postcards (it shows them grounding) — never in the
   * subtitle band, over the person's words or over Glitzi.
   */
  function placeHint() {
    const len = U * 0.42, x0 = clamp(W * 0.29, EDGE, W - EDGE - len);
    const hard = [];
    if (plan.thought) hard.push(plan.thought.R.body, plan.thought.R.plate);
    if (plan.mrect) hard.push(plan.mrect);
    const soft = plan.slots.map((sl) => ({ x0: sl.x - plan.s / 2, y0: sl.y - plan.s / 2, x1: sl.x + plan.s / 2, y1: sl.y + plan.s / 2 }));
    const z = plan.zone, top = plan.band.y + plan.band.h + 34;
    const clear = (yy, obs) => { const iv = freeStretches(x0 - 16, x0 + len + 16, yy - 30, yy + 16, obs); return iv.length === 1 && iv[0][0] <= x0 - 16 && iv[0][1] >= x0 + len + 16; };
    let y = -1;
    for (let yy = Math.max(z.y + z.h, top) - 26; yy >= top && y < 0; yy -= 6) if (clear(yy, [...hard, ...soft])) y = yy;
    if (y < 0) for (const ry of [...new Set(plan.slots.map((sl) => Math.round(sl.y)))]) if (ry >= top && clear(ry, hard)) { y = ry; break; }
    hint.x0 = x0; hint.y0 = y > 0 ? y : z.y + z.h * 0.5; hint.ok = y > 0;
  }

  // ---------------------------------------------------------- prepare --
  function buildSprites() {
    sprites = {
      cyan: glowSprite(C.cyan, { size: 64, core: 0.5 }), magenta: glowSprite(C.magenta, { size: 64, core: 0.5 }),
      gold: glowSprite(C.gold, { size: 64, core: 0.65 }), white: glowSprite(C.white, { size: 64, core: 0.4 }),
      amber: glowSprite(C.amber, { size: 64, core: 0.5 }),
      softGold: glowSprite(C.gold, { size: 128 }), softCyan: glowSprite(C.cyan, { size: 128 }), softMagenta: glowSprite(C.magenta, { size: 128 }),
      softViolet: glowSprite('#6a4cff', { size: 128 }), softWarm: glowSprite('#ffb37a', { size: 128 }),
      glintC: glintSprite(C.cyan, 48), glintG: glintSprite(C.gold, 48), glintM: glintSprite(C.magenta, 48),
    };
    sprites.moteList = [sprites.cyan, sprites.magenta, sprites.white];
    sprites.fallList = [sprites.gold, sprites.amber, sprites.white];
    sprites.sparkList = [sprites.glintC, sprites.glintM, sprites.white, sprites.cyan];
  }

  function buildField() {
    fieldC = makeCanvas(field.cols, field.rows);
    fieldG = fieldC.getContext('2d');
    fieldData = fieldG.createImageData(field.cols, field.rows);
    maskData = fieldG.createImageData(field.cols, field.rows);
    clearData = fieldG.createImageData(field.cols, field.rows);
    for (let k = 0; k < field.n; k++) { clearData.data[k * 4] = 26; clearData.data[k * 4 + 1] = 18; clearData.data[k * 4 + 2] = 68; }
    // static grain: a tile of coloured dots, shown only where there is charge
    grainScale = 1.5;
    grainC = makeCanvas(Math.ceil(field.w / grainScale), Math.ceil(field.h / grainScale));
    grainG = grainC.getContext('2d');
    if (!grainPat) {
      const T = 96, tile = makeCanvas(T, T), tg = tile.getContext('2d'), id = tg.createImageData(T, T);
      for (let i = 0; i < T * T; i++) {
        const r = R(), o = i * 4;
        if (r < 0.055) { id.data[o] = 255; id.data[o + 1] = 255; id.data[o + 2] = 255; id.data[o + 3] = 150 + R() * 105; }
        else if (r < 0.11) { id.data[o] = 62; id.data[o + 1] = 232; id.data[o + 2] = 255; id.data[o + 3] = 140 + R() * 115; }
        else if (r < 0.16) { id.data[o] = 255; id.data[o + 1] = 61; id.data[o + 2] = 242; id.data[o + 3] = 130 + R() * 110; }
      }
      tg.putImageData(id, 0, 0);
      grainPat = tile;
    }
    midC = makeCanvas(field.cols * 4, field.rows * 4);
    midG = midC.getContext('2d');
    midG.imageSmoothingEnabled = true;
    phase = new Float32Array(field.n * 2);
    afterglow = new Float32Array(field.n);
    if (!startQ || startQ.length !== field.n) { startQ = new Float32Array(field.n); for (let k = 0; k < field.n; k++) startQ[k] = clamp(field.f[k] / 0.5); }
    grainPatFill = null;
    for (let i = 0; i < field.n; i++) { phase[i * 2] = R() * TAU; phase[i * 2 + 1] = 0.9 + R() * 1.6; }
  }

  async function prepare() {
    if (prepared) return;
    layout();
    realm = createRealmCore('static-storm', {
      W, H, dpr: ctx.dprBack, mood: moodFor(Q, 0), reducedMotion: reduced(), lowStimulation: ctx.lowStim, groundY: groundFrac, quality: 'auto',
    });
    realm.build();
    realmBuilt = true;
    horizonY = realm.horizonY;
    buildSprites();
    buildField();
    Q = field.storminess();
    realm.setMood(moodFor(Q, 0), { tau: 0.35 }).settle();
    // warm the photo sprites (natural + storm tone) so the first frame never stalls
    if (allCards.length) {
      const scratch = makeCanvas(8, 8).getContext('2d');
      for (const c of allCards) { photos.draw(scratch, c.i, 4, 4, plan?.s || 64, { shape: 'card', tone: 'storm', toneMix: 0.5, shadow: false }); }
    }
    try { await ctx.fontsReady?.(['voice'], 900); } catch { /* fallback font is fine */ }
    light0 = field.light;
    prepared = true;
  }

  function moodFor(q, pp) {
    return { agitation: clamp(0.12 + 0.85 * q), clarity: clamp(0.15 + 0.8 * pp), heaviness: clamp(0.25 * (1 - pp)), warmth: clamp(0.3 + 0.55 * pp) };
  }

  // ------------------------------------------------------------ input --
  function fingerFor(id) { for (const f of fingers) if (f.on && f.id === id) return f; return null; }

  function hitThought(x, y) {
    if (!thought) return false;
    if (thought.hitTest) { try { if (thought.hitTest(x, y)) return true; } catch { /* placeholder */ } }
    return Math.hypot(x - tSpring.x, y - tSpring.y) < tR * 1.25;
  }
  function cardAt(x, y, pad = 6) {
    for (let k = cards.length - 1; k >= 0; k--) { const c = cards[k]; if (Math.abs(x - c.x) < c.w / 2 + pad && Math.abs(y - c.y) < c.h / 2 + pad) return c; }
    return null;
  }

  function startAudio() {
    if (holds.charge) return;
    holds.charge = ctx.hold('charge', { intensity: clamp(Q * 0.5), pitch: 0.85 });
  }

  function pointer(s) {
    if (paused) return;
    if (s.type === 'down') {
      const f = fingers.find((q) => !q.on);
      if (!f) return;
      f.on = true; f.id = s.id; f.x = f.px = s.x; f.y = f.py = s.y; f.speed = 0; f.lastEv = elapsed; f.s = 0; f.k = 0; f.t0 = elapsed; f.still = 0; f.fastFor = 0; f.slowGap = 0; f.slowFor = 0;
      f.line = null; f.pulse.on = false; f.pulse.age = 0; f.pulse.drained = 0; f.wait = 0; f.circling = 0; f.grounding = 0; f.pointerType = s.pointerType || 'touch';
      f.deep = 0; f.deepOn = false;
      f.trail.n = 0; f.trail.head = 0;
      f.onThought = hitThought(s.x, s.y);
      f.tracker.cx = tSpring.x; f.tracker.cy = tSpring.y; f.tracker.start(s.x, s.y); f.tracker.speed = 0;
      pace.setPointerType(f.pointerType);
      everTouched = true; if (firstTouchAt < 0) firstTouchAt = elapsed; hint.age = -1;
      // once the person is playing, the scene-setting intro would only arrive late (and out of order)
      introAt = -1;
      startAudio();
      // micro-feedback on the very first frame: a soft ring and a few sparks where the finger lands
      rings.add(s.x, s.y, 3, 26, 0.55, 1, f.onThought ? C.rose : C.cyan, 0.55, 1.4);
      burstSparks(s.x, s.y, 4, 60);
      if (f.onThought) { tWobble.kick(0.4); try { thought?.react?.('squeeze'); thought?.pointer?.(s); } catch { /* optional */ } }
      return;
    }
    const f = fingerFor(s.id);
    if (!f) return;
    if (s.type === 'move') {
      f.lastEv = elapsed;
      // a resting finger (no events): the director reports its speed slowing to 0, nothing moved
      if (s.idle) { f.speed = s.speed; f.k = clamp((s.speed - pace.fastPx) / pace.fastPx, 0, 2); return; }
      const x0 = f.x, y0 = f.y;
      f.x = s.x; f.y = s.y; f.speed = s.speed;
      // charge gathers above the 'fast' threshold (spec: 0.9 · clamp((v − fast) / fast, 0, 2) per cell-length of path)
      const fastPx = pace.fastPx;
      const k = clamp((s.speed - fastPx) / fastPx, 0, 2);
      f.k = k;
      // crackle trail sample
      const tr = f.trail, i = (tr.head + tr.n) % 28;
      tr.x[i] = s.x; tr.y[i] = s.y; tr.t[i] = elapsed; tr.j[i] = (R() - 0.5);
      if (tr.n < 28) tr.n++; else tr.head = (tr.head + 1) % 28;
      if (f.onThought) {
        try { thought?.pointer?.(s); } catch { /* optional */ }
        tSpring.to(s.x, s.y);
        if (k > 0) { tCharge = Math.min(1.3, tCharge + 0.25 * k * Math.hypot(s.x - x0, s.y - y0) / U); tWobble.kick(0.25 * k); tFizz = Math.min(1, tFizz + 0.3 * k); }
      }
      if (k > 0) {
        // fast: charge gathers along the path, immediately
        const mul = complete ? 0.5 : 1;
        field.deposit(x0, y0, s.x, s.y, k * mul);
        if (R() < 0.5 + k * 0.25) burstSparks(s.x, s.y, 1 + (k > 1 ? 1 : 0), 90 + 80 * k);
        const c = cardAt(s.x, s.y);
        if (c) {
          // charge builds with every crackling pass; the flick is felt once as the finger enters the card
          c.q = Math.min(1, c.q + 0.12 * k * Math.min(1, Math.hypot(s.x - x0, s.y - y0) / 12));
          if (c.touched < 0.35) { c.wobble.kick(Math.min(0.6, 0.5 * k)); c.rope.px[ROPE_N - 1] -= clamp((s.vx || 0) * 0.004, -3, 3); }
          c.touched = 1;
          if (c.grounded && c.q > 0.3 && c.leaving < 0) ungroundCard(c);
        }
        if (elapsed - lastCrackle > 0.04) { lastCrackle = elapsed; ctx.sound('crackle', { intensity: clamp(0.25 + 0.3 * k), pan: clamp((s.x / W) * 2 - 1, -1, 1) }); }
        ctx.haptic('tick');
      }
      // slow: the ground line follows the finger
      if (f.line && !f.onThought) appendPoint(f.line, s.x, s.y);
      return;
    }
    if (s.type === 'up' || s.type === 'cancel') {
      if (f.line) endLine(f, true);
      if (f.onThought) { tSpring.to(tAnchor.x, tAnchor.y); try { thought?.pointer?.(s); thought?.react?.('release'); } catch { /* optional */ } }
      f.on = false; f.id = -1; f.onThought = false; f.pulse.on = false; f.tracker.end();
      liftAt = elapsed;
      if (!fingers.some((q) => q.on)) stopGroundHold();
    }
  }

  // ------------------------------------------------------- ground lines --
  function startLine(f) {
    const L = lines.find((l) => !l.on) || lines.reduce((a, b) => (a.state === 'falling' && a.fall > b.fall ? a : b));
    L.on = true; L.state = 'drawing'; L.n = 0; L.age = 0; L.fall = 0; L.s = f.s; L.drink = 0; L.grad = null; L.landed = false; L.len = 0;
    appendPoint(L, f.x, f.y, true);
    f.line = L;
    if (f.grounding <= 0) { ctx.haptic('soft'); }
    f.grounding = 1;
    return L;
  }
  function appendPoint(L, x, y, force = false) {
    if (L.n >= MAX_PTS) return;
    if (!force && L.n) {
      const lx = L.pts[(L.n - 1) * 2], ly = L.pts[(L.n - 1) * 2 + 1], d = Math.hypot(x - lx, y - ly);
      if (d < LINE_STEP) return;
      L.len += d;
    }
    L.pts[L.n * 2] = x; L.pts[L.n * 2 + 1] = y; L.n++;
  }
  function endLine(f, lifted) {
    const L = f.line;
    f.line = null;
    if (!L) return;
    if (L.n < 3 || L.len < 10) { L.on = false; L.state = 'idle'; return; }
    L.state = 'falling'; L.fall = 0;
    let minY = 1e9, maxY = -1e9, sx = 0, sy = 0;
    for (let i = 0; i < L.n; i++) { const x = L.pts[i * 2], y = L.pts[i * 2 + 1]; sx += x; sy += y; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    L.cx = sx / L.n; L.cy = sy / L.n; L.minY = minY; L.maxY = maxY;
    // the world responds at the end of every slow segment: the nearest constellation snaps true
    const ex = L.pts[(L.n - 1) * 2], ey = L.pts[(L.n - 1) * 2 + 1];
    realm?.pulse('success', { x: ex, y: ey });
    rings.add(ex, ey, 4, 30 + 30 * L.s, 0.9, 1, C.gold, 0.6, 1.6);
    // the slower the segment, the wider the world's answer
    if (L.s > 0.55) rings.add(ex, ey, 8, 56 + 60 * L.s, 1.5, 1, C.cream, 0.32 * L.s, 2.2);
    if (!lifted) startLine(f);
  }

  // ------------------------------------------------------------ visuals --
  function burstSparks(x, y, n, speed) {
    if (reduced()) n = Math.min(n, 1);
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, v = speed * (0.3 + R() * 0.7);
      sparks.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.25 + R() * 0.35, 2 + R() * 3, (R() * 4) | 0, 0.9);
    }
  }

  // drained cells send their charge to the finger as motes
  let drainFx = { x: 0, y: 0, acc: 0 };
  const onDrain = (i, j, d) => {
    if (afterglow) { const k = j * field.cols + i; afterglow[k] = Math.min(1.2, afterglow[k] + d * 5); }
    drainFx.acc += d;
    if (drainFx.acc < 0.05) return;
    drainFx.acc = 0;
    if (motes.n > motes.max - 4) return;
    const x = field.cx(i) + (R() - 0.5) * field.cw, y = field.cy(j) + (R() - 0.5) * field.ch;
    const k = motes.spawn(x, y, (R() - 0.5) * 30, (R() - 0.5) * 30, 0.5 + R() * 0.4, 3 + R() * 2.5, R() < 0.5 ? 0 : 1, 0.85);
    moteTx[k] = drainFx.x; moteTy[k] = drainFx.y;
  };

  function updateMotes(dt) {
    // charge pulled towards where it is being grounded; on arrival it turns to falling gold
    for (let i = 0; i < motes.n; i++) {
      motes.age[i] += dt;
      const dx = moteTx[i] - motes.x[i], dy = moteTy[i] - motes.y[i], d = Math.hypot(dx, dy);
      if (motes.age[i] >= motes.ttl[i] || d < 9) {
        if (fallers.n < fallers.max) fallers.spawn(motes.x[i], motes.y[i], (R() - 0.5) * 24, 10 + R() * 20, 1.6 + R() * 1.2, 2.5 + R() * 2.5, (R() * 3) | 0, 0.9);
        motes.kill(i);
        // keep the target arrays aligned with Pool.kill's swap
        moteTx[i] = moteTx[motes.n]; moteTy[i] = moteTy[motes.n];
        i--; continue;
      }
      const pull = 900 / (d + 30);
      motes.vx[i] += (dx / (d || 1)) * pull * dt * 60; motes.vy[i] += (dy / (d || 1)) * pull * dt * 60;
      motes.vx[i] *= Math.exp(-6 * dt); motes.vy[i] *= Math.exp(-6 * dt);
      motes.x[i] += motes.vx[i] * dt; motes.y[i] += motes.vy[i] * dt;
    }
  }

  function spawnArc(now) {
    const a = arcs.find((q) => !q.on);
    if (!a || !field) return;
    // two hot cells a few cells apart (never ending on a photo)
    let i0 = -1, best = 0;
    for (let tries = 0; tries < 8; tries++) { const k = (R() * field.n) | 0; if (field.q[k] > best) { best = field.q[k]; i0 = k; } }
    if (i0 < 0 || best < 0.5) return;
    const ci = i0 % field.cols, cj = (i0 / field.cols) | 0;
    let x0 = field.cx(ci), y0 = field.cy(cj), x1, y1;
    const nearFinger = fingers.find((f) => f.on && f.k > 0.2 && Math.hypot(f.x - x0, f.y - y0) < field.cell * 6);
    if (nearFinger) { x1 = nearFinger.x; y1 = nearFinger.y; }
    else {
      const ang = R() * TAU, dd = field.cell * (2 + R() * 3);
      x1 = x0 + Math.cos(ang) * dd; y1 = y0 + Math.sin(ang) * dd;
      if (field.local(x1, y1, 1) < 0.45) return;
    }
    if (cardAt(x0, y0, 8) || cardAt(x1, y1, 8)) return;
    // never across the subtitle band (the trail and sparks answer strokes there)
    if (inBand(y0, 10) || inBand(y1, 10) || inBand((y0 + y1) / 2, 10)) return;
    const len = Math.hypot(x1 - x0, y1 - y0);
    // photosafe: arcs longer than 70 px count against the ≤ 3 bright events a second (else they
    // draw at a third); short ones are exempt — a ≤ 70 px, ~7 px wide flicker covers < 0.4% of a
    // phone screen, far below the flash-area threshold (a quarter of the central visual field)
    a.bright = len > 70 ? brightOK(now) : true;
    a.on = true; a.shimmer = false; a.age = 0; a.ttl = 0.18 + R() * 0.17; a.colour = R() < 0.6 ? C.cyan : C.magenta;
    // digital zig-zag: vertical then horizontal steps
    let n = 0, x = x0, y = y0;
    const steps = 4 + ((R() * 3) | 0);
    a.pts[n++] = x; a.pts[n++] = y;
    for (let s = 1; s <= steps && n < 44; s++) {
      const tt = s / steps;
      const ty = lerp(y0, y1, tt), tx = lerp(x0, x1, tt) + (s < steps ? (R() - 0.5) * len * 0.35 : 0);
      a.pts[n++] = x; a.pts[n++] = ty; y = ty;
      a.pts[n++] = tx; a.pts[n++] = y; x = tx;
    }
    a.n = n;
  }

  /** Reduced motion: a soft, slow shimmer over a hot cell (no lines, no flicker: 0.9 s rise, ≥ 2.4 s life). */
  function spawnShimmer() {
    const a = arcs.find((q) => !q.on);
    if (!a || !field) return;
    let i0 = -1, best = 0;
    for (let tries = 0; tries < 8; tries++) { const k = (R() * field.n) | 0; if (field.q[k] > best) { best = field.q[k]; i0 = k; } }
    if (i0 < 0 || best < 0.5) return;
    const x = field.cx(i0 % field.cols), y = field.cy((i0 / field.cols) | 0);
    if (cardAt(x, y, 16) || inBand(y, 16)) return;
    a.on = true; a.age = 0; a.ttl = 2.4 + R() * 1.2; a.shimmer = true; a.bright = false;
    a.colour = R() < 0.6 ? C.cyan : C.magenta;
    a.pts[0] = x; a.pts[1] = y; a.n = 2; a.size = field.cell * (1.6 + R() * 1.2);
  }

  // ------------------------------------------------------------- frame --
  function frame(dt, t) {
    if (!prepared) return;
    if (paused) dt = 0;
    elapsed += dt;
    const now = elapsed;
    const rm = reduced();
    pulsedThisFrame = false; pulseDrainThisFrame = 0;

    relayoutCheck(dt);
    // pace of the primary finger
    const f0 = fingers.find((f) => f.on) || null;
    const band = pace.update(dt, !!f0, f0 ? f0.speed : 0);
    const lightBefore = field.light;

    for (const f of fingers) {
      if (!f.on) continue;
      // driven without the director's idle events: a finger with no news for 0.25 s is slowing to a stop
      if (elapsed - f.lastEv > 0.25 && f.speed > 0) { f.speed *= Math.exp(-dt / 0.12); if (f.speed < 0.05) f.speed = 0; f.k = clamp((f.speed - pace.fastPx) / pace.fastPx, 0, 2); }
      f.s = slowness(f.speed, U, PACE[f.pointerType] || PACE.touch);
      const stillPx = (PACE[f.pointerType] || PACE.touch).stillU * U;
      const isStill = f.speed < stillPx;
      f.still = isStill ? f.still + dt : 0;
      // slow circling round the Thought Mallow grounds it ×1.8
      f.tracker.cx = tSpring.x; f.tracker.cy = tSpring.y;
      const dT = Math.hypot(f.x - tSpring.x, f.y - tSpring.y);
      const dA = f.tracker.feed(f.x, f.y, Math.max(dt, 1 / 240));
      const w = Math.abs(f.tracker.speed);
      const ring = !!thought && dT > tR * 0.5 && dT < tR * 2.8;
      f.circling = ring && w > 0.6 && w < 2.5 && f.s > 0.2 ? Math.min(1, f.circling + dt * 3) : Math.max(0, f.circling - dt * 2);
      // moving slowly (not resting): only this grounds under the finger and draws a line
      const moveK = smoothstep(stillPx, stillPx * 2.2, f.speed);
      f.slowFor = f.s >= 0.35 && moveK > 0.5 ? f.slowFor + dt : 0;
      // lines start once the finger has been slow for a moment, end when it rushes
      if (!f.onThought && !complete) {
        if (!f.line && f.slowFor >= 0.12) startLine(f);
        else if (f.line) {
          if (f.s < 0.12) { f.slowGap += dt; if (f.slowGap > 0.15) endLine(f, true); } else f.slowGap = 0;
          if (f.line) { f.line.age += dt; f.line.s = lerp(f.line.s, f.s, 0.1); if (f.line.age > SEGMENT_SEC && f.line.n > 24) endLine(f, false); }
        }
      } else if (complete && !f.line && f.slowFor >= 0.12 && !f.onThought) startLine(f);
      // slowing further is felt: a mid-pace line already grounds, and easing into the slow band
      // (s ≥ 0.6, where the line drinks fastest) warms the fingertip and blooms once
      f.deep += ((f.line && f.s >= 0.6 ? 1 : 0) - f.deep) * (1 - Math.exp(-dt / 0.25));
      if (f.line && f.s >= 0.6 && !f.deepOn && elapsed - f.deepAt > 1.2) {
        f.deepOn = true; f.deepAt = elapsed;
        rings.add(f.x, f.y, 6, 44, 1.2, 1, C.gold, 0.5, 1.8);
        ctx.haptic('soft');
      }
      if (!f.line || f.s < 0.45) f.deepOn = false;
      // grounding under the finger
      const sg = f.s * moveK;
      if (sg > 0.05 && !f.onThought) {
        drainFx.x = f.x; drainFx.y = f.y;
        const mul = 1 + 0.8 * f.circling;
        const d = field.drain(f.x, f.y, FIELD.DRAIN_RATE * sg * mul, dt, FIELD.DRAIN_SIGMA, onDrain);
        if (f.line) f.line.drink = lerp(f.line.drink, clamp(d / (dt * 6 + 1e-6)), 0.2);
        groundCardsNear(f.x, f.y, 4, 2.2 * sg * dt);
        if (thought && dT < tR * 2.8) groundThought(0.32 * sg * mul * dt * (dT < tR * 1.5 ? 1 : 0.55));
      }
      if (f.onThought && f.s > 0.4) groundThought(0.25 * f.s * dt);
      // holding still: a waiting ring, then ground pulses
      if (isStill && !f.onThought) {
        if (!f.pulse.on) {
          f.wait = clamp(f.still / 0.6);
          if (f.still >= 0.6) { f.pulse.on = true; f.pulse.age = 0; f.pulse.drained = 0; ctx.haptic('soft'); rings.add(f.x, f.y, 6, PULSE_CELLS * field.cell, PULSE_SEC, 1, C.gold, 0.75, 2.4); }
        }
      } else if (!f.pulse.on) f.wait = Math.max(0, f.wait - dt * 4);
      if (f.pulse.on) {
        f.pulse.age += dt;
        const r = PULSE_CELLS * field.cell * easeOut(f.pulse.age / PULSE_SEC);
        drainFx.x = f.x; drainFx.y = f.y;
        const d = field.drainDisk(f.x, f.y, r, FIELD.PULSE_RATE, dt, onDrain);
        f.pulse.drained += d;
        groundCardsNear(f.x, f.y, r, 0.6 * dt);
        if (thought && Math.hypot(f.x - tSpring.x, f.y - tSpring.y) < r + tR) groundThought(0.22 * dt);
        if (f.pulse.age >= PULSE_SEC) {
          pulsedThisFrame = true; pulseDrainThisFrame += f.pulse.drained;
          f.pulse.on = false;
          if (isStill && f.still > 0.6) { f.pulse.on = true; f.pulse.age = 0; f.pulse.drained = 0; rings.add(f.x, f.y, 6, PULSE_CELLS * field.cell, PULSE_SEC, 1, C.gold, 0.7, 2.4); }
          f.still = isStill ? 0.6 : 0;
        }
      }
    }

    // a new feeling named mid-storm: the storm's own charge eases towards it
    if (feelEase.left > 0 && dt > 0) { const k = Math.min(dt, feelEase.left); feelEase.left -= k; field.scaleFloor(Math.pow(feelEase.m, k / FEEL_SEC)); }
    // field physics
    field.step(dt);
    if (afterglow) { const kk = Math.exp(-dt / 0.7); for (let k = 0; k < field.n; k++) afterglow[k] *= kk; }
    if (complete) field.quieten(dt);
    Q = field.storminess();
    const drainedNow = field.light - lightBefore;
    drainRate = lerp(drainRate, dt > 0 ? drainedNow / dt : 0, 0.15);
    p = field.progress;

    // discoveries (real contingency only)
    const evS = slowingD.update(dt, { down: !!f0, fast: band.fast, s: f0 ? f0.s : 0, Q, light: field.light });
    if (evS) fireDiscovery(evS);
    const evT = stillD.update(dt, { pulse: pulsedThisFrame, pulseDrain: pulseDrainThisFrame, fast: band.fast, blocked: slowingD.armed || discovered.has('slowing') });
    if (evT) fireDiscovery(evT);

    // first big surge: Glitzi notices, and it's allowed
    if (!firstSurge && Q > 1.05 && everTouched) {
      firstSurge = true; introAt = -1;
      // reduced motion: a calm 'oh!' instead of glitch bars across the face
      mallow?.react?.(rm ? 'gasp' : 'glitchBurst');
      const lines2 = ctx.entry.dialogue?.charge;
      if (lines2) ctx.say(lines2, { who: 'glitzi', kind: 'dialogue' });
    }
    if (f0 && f0.k > 0.6 && Q > 0.9 && now - glitchAt > (rm ? 12 : 6)) { glitchAt = now; mallow?.react?.(rm ? 'gasp' : 'glitchBurst'); }

    updateThought(dt, now);
    updateCards(dt, now);
    updateLines(dt);
    updateMotes(dt);
    sparks.update(dt, 40, 3);
    fallers.update(dt, 40, 0.4);
    rings.update(dt);
    floorRings.update(dt);
    for (const a of arcs) if (a.on) { a.age += dt; if (a.age >= a.ttl) a.on = false; }
    if (!complete && outroK < 0.5) {
      // reduced motion: no arcs — a slow soft shimmer rises and fades over the hottest cells instead
      arcClock += dt * clamp(Q - 0.35) * (rm ? 1.2 : 7);
      while (arcClock > 1) { arcClock -= 1; if (rm) spawnShimmer(); else spawnArc(now); }
    }

    // realm: the backdrop answers within a frame (τ 0.35 s), the transform a little slower
    const pp = complete ? 1 : p;
    realm.setMood(moodFor(Q * (1 - outroK * 0.5), pp), { tau: 0.35 });
    realm.transform(complete ? 1 : 0.9 * p, { tau: complete ? 1.2 : 0.6 });
    if (f0) realm.setFocus(clamp((f0.x / W) * 2 - 1, -1, 1) * 0.5, clamp((f0.y / H) * 2 - 1, -1, 1) * 0.4);
    else realm.setFocus(0, 0);
    // reduced motion / low stimulation changed mid-world: the backdrop follows at once
    if (realm.st.reduced !== rm) realm.setReducedMotion(rm);
    if (realm.st.low !== !!ctx.lowStim) realm.setLowStimulation(!!ctx.lowStim);
    realm.tick(dt * 1000);
    realm.draw();
    drawBack(realm.ctx, now, rm);
    drawFront(ctx.front.g, now, rm);

    audioAndMallow(dt, now, f0);

    // natural completion (needs the finger lifted for 1.5 s)
    if (!complete) {
      const enough = p >= 1 || (p >= 0.7 && Q < 0.15 && groundedCards >= Math.min(2, allCards.length));
      if (enough && !fingers.some((f) => f.on) && now - liftAt >= 1.5) finishStorm();
    }
    if (introAt > 0) { introAt -= dt; if (introAt <= 0) { introAt = -1; ctx.say(ctx.entry.dialogue.intro, { who: 'glitzi', kind: 'dialogue' }); } }
    // a gentle ghost finger if nobody has touched yet
    if (!everTouched) {
      hint.next -= dt;
      if (hint.next <= 0 && hint.shown < 2 && hint.age < 0) {
        // where placeHint() found room (never in the band, over the words or over Glitzi)
        if (hint.ok) { hint.age = 0; hint.shown++; hint.next = 9; }
        else hint.next = 9;
      }
    }
    if (hint.age >= 0) { hint.age += dt; if (hint.age > HINT_SEC) hint.age = -1; }
  }

  function fireDiscovery(ev) {
    if (discovered.has(ev.id)) return;
    discovered.add(ev.id);
    if (ev.id === 'slowing' || ev.id === 'stillness') {
      mallow?.react?.('sigh');
      ctx.sound('chime', { intensity: 0.35 });
      // a soft bloom of warm light where the finger is (photosafe rise)
      const f = fingers.find((q) => q.on);
      if (f && brightOK(elapsed)) rings.add(f.x, f.y, 10, U * 0.5, 2.4, 1, C.gold, 0.5, 2);
    }
    ctx.discover(ev.id, ev.evidence);
  }

  function finishStorm() {
    complete = true; completeAt = elapsed;
    realm.pulse('clear', { x: W / 2, y: horizonY });
    realm.transform(1, { tau: 1.2 });
    mallow?.react?.('success');
    ctx.sound('bloom', { intensity: 0.4 });
    for (const f of fingers) f.line = null;
  }

  // ---------------------------------------------------- thought + cards --
  function groundThought(amount) {
    if (amount <= 0) return;
    const d = Math.min(tCharge, amount);
    tCharge -= d;
    field.addLight(d * 6);
    // its charge leaves as motes towards the finger that is grounding it
    if (d > 0.002 && R() < 0.6 && motes.n < motes.max - 4) {
      const a = R() * TAU, k = motes.spawn(tSpring.x + Math.cos(a) * tR, tSpring.y + Math.sin(a) * tR, Math.cos(a) * 40, Math.sin(a) * 40, 0.6 + R() * 0.3, 3 + R() * 2, R() < 0.5 ? 0 : 1, 0.9);
      moteTx[k] = drainFx.x; moteTy[k] = drainFx.y;
    }
  }

  function updateThought(dt, now) {
    tSpring.update(dt);
    const wob = tWobble.update(dt);
    const local = field.local(tSpring.x, tSpring.y, 2.5);
    const qLocal = clamp(0.35 * local + 0.75 * tCharge, 0, 1.3);
    tTension = clamp(0.4 + 0.6 * qLocal) * (thoughtSettle.settled ? 0.5 : 1);
    tFizz = Math.max(0, tFizz - dt * 1.5);
    if (thought && thoughtSettle.update(dt, qLocal) && !tSettledShown) {
      tSettledShown = true;
      try { thought?.react?.('sigh'); thought?.settle?.(1); } catch { /* optional */ }
      ctx.sound('settle', { intensity: 0.35 });
      const l = ctx.entry.dialogue?.thoughtSettled;
      if (l) ctx.say(l, { who: 'glitzi', kind: 'dialogue' });
    }
    if (thought) {
      thought.x = tSpring.x; thought.y = tSpring.y + wob * 3; thought.scale = tScale;
      const st = thought.state || (thought.state = {});
      st.tension = tTension; st.charge = clamp(qLocal); st.calm = thoughtSettle.settled ? 1 : clamp(1 - qLocal); st.distance = 0;
      try { thought.soften?.(clamp(1 - qLocal)); } catch { /* optional */ }
    }
  }

  function groundCardsNear(x, y, r, amount) {
    for (const c of cards) {
      if (c.grounded) continue;
      const dx = Math.max(0, Math.abs(x - c.x) - c.w / 2), dy = Math.max(0, Math.abs(y - c.y) - c.h / 2);
      if (dx * dx + dy * dy > r * r) continue;
      const d = Math.min(c.q, amount);
      c.q -= d; c.touched = 1;
      field.addLight(d * 5);
      if (c.q < 0.12) groundCard(c);
    }
  }
  function groundCard(c) {
    c.grounded = true; c.gk = c.gk || 0; c.glowAge = brightOK(elapsed) ? 0 : 0.3; c.groundedFor = 0;
    groundedCards++;
    // a checkpoint the shell can count (ids and numbers only)
    ctx.checkpoint?.('photo', { i: c.i, grounded: groundedCards, of: allCards.length });
    c.restLen = c.seg0 - Math.min(0.14 * c.seg0, 10 / (ROPE_N - 1));
    mallow?.react?.('comfort');
    ctx.sound('glass', { note: (c.i % 6) + 2, intensity: 0.4 });
    ctx.haptic('light');
    for (let k = 0; k < 10; k++) fallers.spawn(c.x + (R() - 0.5) * c.w, c.y + (R() - 0.5) * c.h, (R() - 0.5) * 30, 6 + R() * 20, 1.4 + R(), 2 + R() * 2.5, (R() * 3) | 0, 0.85);
  }
  function ungroundCard(c) { c.grounded = false; groundedCards = Math.max(0, groundedCards - 1); c.restLen = c.seg0; }

  function updateCards(dt, now) {
    const rm = reduced();
    swapCards(dt, rm);
    const gust = rm ? 0 : (Q * 26 + 6) * (Math.sin(now * 0.7) * 0.6 + Math.sin(now * 1.9 + 1) * 0.4);
    const last = ROPE_N - 1;
    for (const c of cards) {
      const r = c.rope;
      r.seg = lerp(r.seg, c.restLen, 1 - Math.exp(-dt * 2));
      // the storm's wind pushes charged cards about; grounded ones hang still
      const wind = (c.grounded ? 0.25 : 1) * gust * (0.6 + 0.4 * Math.sin(c.ph + now * 0.5));
      r.px[last] -= wind * dt * dt * 3;
      if (dt > 0) r.update(Math.min(dt, 1 / 30), c.ax, c.ay);
      const ex = r.x[last], ey = r.y[last], bx = r.x[last - 1], by = r.y[last - 1];
      const ang = Math.atan2(ex - bx, ey - by);
      const wob = rm ? 0 : c.wobble.update(dt);
      c.rot = lerp(c.rot, clamp(-ang * 0.7, -0.24, 0.24) + wob * 0.03, 1 - Math.exp(-dt * 8));
      if (c.grounded) c.rot *= Math.exp(-dt * 2);
      if (rm) c.rot *= 0.5;
      c.x = ex + Math.sin(c.rot) * c.h * 0.5; c.y = ey + Math.cos(c.rot) * c.h * 0.5;
      c.gk = c.grounded ? Math.min(1, c.gk + dt / 0.8) : Math.max(0, c.gk - dt / 0.5);
      if (c.glowAge >= 0) { c.glowAge += dt; if (c.glowAge > 2.4) c.glowAge = -1; }
      c.touched = Math.max(0, c.touched - dt * 2);
    }
    // however the storm blows, nothing overlaps: neighbours keep their gap, and no card swings
    // into the Thought Mallow, its words, Glitzi (with hop room), the subtitle band or a screen edge
    if (cards.length > 1) separateCards();
    for (const c of cards) keepClear(c);
  }

  /** Move a hanging card (and its rope end, without adding velocity). */
  function nudgeCard(c, mx, my) {
    const r = c.rope, last = ROPE_N - 1;
    c.x += mx; c.y += my; r.x[last] += mx; r.px[last] += mx; r.y[last] += my; r.py[last] += my;
  }
  const halfW = (c) => (Math.abs(Math.cos(c.rot)) * c.w + Math.abs(Math.sin(c.rot)) * c.h) / 2;
  const halfH = (c) => (Math.abs(Math.sin(c.rot)) * c.w + Math.abs(Math.cos(c.rot)) * c.h) / 2;
  /** Extent of card c (oriented box) along the unit axis (ax, ay). */
  function extent(c, ax, ay) {
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    return Math.abs((c.w / 2) * (cs * ax + sn * ay)) + Math.abs((c.h / 2) * (-sn * ax + cs * ay));
  }
  /** Pairwise separation of the oriented postcards (SAT on their four axes), keeping CARD_GAP. */
  function separateCards() {
    const gap = LAYOUT.CARD_GAP;
    for (let it = 0; it < 2; it++) {
      for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) {
        const A = cards[a], B = cards[b];
        if (A.alpha < 0.35 || B.alpha < 0.35) continue;         // a card letting go / dropping in
        const dx = B.x - A.x, dy = B.y - A.y, reach = (A.w + A.h + B.w + B.h) * 0.36 + gap;
        if (dx * dx + dy * dy > reach * reach) continue;
        let best = Infinity, nx = 0, ny = 0;
        for (let k = 0; k < 4; k++) {
          const rot = k < 2 ? A.rot : B.rot;
          const ax = k % 2 ? -Math.sin(rot) : Math.cos(rot), ay = k % 2 ? Math.cos(rot) : Math.sin(rot);
          const d = dx * ax + dy * ay;
          const o = extent(A, ax, ay) + extent(B, ax, ay) + gap - Math.abs(d);
          if (o <= 0) { best = 0; break; }
          if (o < best) { best = o; nx = d >= 0 ? ax : -ax; ny = d >= 0 ? ay : -ay; }
        }
        if (best > 0 && best < Infinity) {
          const m = best * 0.5;
          nudgeCard(A, -nx * m, -ny * m); nudgeCard(B, nx * m, ny * m);
        }
      }
    }
  }
  /** Push an axis-aligned box {x0,y0,x1,y1} out of card c along the shortest way. */
  function pushOutOfRect(c, o, pad) {
    const hw = halfW(c) + pad, hh = halfH(c) + pad;
    if (c.x + hw <= o.x0 || c.x - hw >= o.x1 || c.y + hh <= o.y0 || c.y - hh >= o.y1) return;
    const left = c.x + hw - o.x0, right = o.x1 - (c.x - hw), up = c.y + hh - o.y0, down = o.y1 - (c.y - hh);
    const m = Math.min(left, right, up, down);
    if (m === left) nudgeCard(c, -left, 0); else if (m === right) nudgeCard(c, right, 0); else if (m === up) nudgeCard(c, 0, -up); else nudgeCard(c, 0, down);
  }
  function keepClear(c) {
    // the Thought Mallow's body (a circle, with its crackle) and its words plate move with it
    if (thought && plan?.thought) {
      const tx = tSpring.x, ty = tSpring.y, Rr = tR * 1.32 + 4;
      const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
      const dx = tx - c.x, dy = ty - c.y, lx = dx * cs + dy * sn, ly = -dx * sn + dy * cs;
      const qx = clamp(lx, -c.w / 2, c.w / 2), qy = clamp(ly, -c.h / 2, c.h / 2);
      const ox = lx - qx, oy = ly - qy, d = Math.hypot(ox, oy);
      if (d < Rr) {
        // direction from the thought towards the card (world space)
        let ux, uy;
        if (d > 1e-3) { const wx = ox * cs - oy * sn, wy = ox * sn + oy * cs; ux = -wx / d; uy = -wy / d; }
        else { const l = Math.hypot(c.x - tx, c.y - ty) || 1; ux = (c.x - tx) / l; uy = (c.y - ty) / l; }
        nudgeCard(c, ux * (Rr - d), uy * (Rr - d));
      }
      const T = plan.thought, pdx = tx - T.x, pdy = ty - T.y, P = T.R.plate;
      pushOutOfRect(c, { x0: P.x0 + pdx, y0: P.y0 + pdy, x1: P.x1 + pdx, y1: P.y1 + pdy }, 3);
    }
    // Glitzi, with room for a hop
    if (plan?.mrect) pushOutOfRect(c, plan.mrect, 0);
    // never closer than 20 px to a screen edge, however it swings…
    const hw = halfW(c), hh = halfH(c);
    const dx = c.x < EDGE + hw ? EDGE + hw - c.x : c.x > W - EDGE - hw ? W - EDGE - hw - c.x : 0;
    if (dx) nudgeCard(c, dx, 0);
    // …and never up into the subtitle band
    const minY = (plan ? plan.band.y + plan.band.h : 0) + 4 + hh;
    if (c.y < minY) nudgeCard(c, 0, minY - c.y);
  }

  function updateLines(dt) {
    const floorY = lerp(horizonY, H * groundFrac, 0.35);
    for (const L of lines) {
      if (!L.on || L.state !== 'falling') continue;
      L.fall += dt / FALL_SEC;
      if (!L.landed && L.fall > 0.82) {
        L.landed = true;
        floorRings.add(L.cx, floorY, 6, 40 + Math.min(120, L.len * 0.25), 2.2, 0.28, C.gold, 0.55, 1.8);
        for (let k = 0; k < 6; k++) fallers.spawn(L.cx + (R() - 0.5) * 40, floorY - 4, (R() - 0.5) * 40, -10 - R() * 20, 1.0 + R(), 2 + R() * 2, (R() * 3) | 0, 0.8);
      }
      if (L.fall >= 1) { L.on = false; L.state = 'idle'; }
    }
  }

  // -------------------------------------------------------------- draw --
  function drawPlasma(g, now, rm) {
    // per cell, packed into tiny images that are upscaled twice with smoothing:
    //   clear   — where the storm's own charge has been grounded, the sky deepens to calm night
    //   plasma  — ambient storm haze (violet / cyan / magenta) + fresh charge (white-cyan) + golden afterglow
    //   grain   — a static texture masked by the charge: charged sky looks staticky, grounded sky smooth
    const d = fieldData.data, md = maskData.data, cd = clearData.data, n = field.n, cols = field.cols, q = field.q, fl = field.f;
    const low = ctx.lowStim ? 0.6 : 1;
    // as the last of the charge is grounded, and over 2.5 s after completion, the calm-night
    // wash, the haze and the grain step aside: the realm's dawn and golden mandala carry the end
    const resolveK = complete ? clamp((elapsed - completeAt) / 2.5) : 0;
    const clearK = (1 - 0.75 * smoothstep(0.7, 1, p)) * (1 - resolveK);
    const hazeK = 1 - 0.85 * resolveK;
    let anyClear = 0;
    for (let k = 0; k < n; k++) {
      const o = k * 4;
      const f = fl[k], e = q[k] - f > 0 ? q[k] - f : 0, gl = afterglow[k];
      const ca = Math.round(255 * 0.28 * clamp(1 - q[k] / 0.4) * startQ[k] * clearK);
      cd[o + 3] = ca; anyClear |= ca;
      if (f < 0.02 && e < 0.01 && gl < 0.01) { d[o + 3] = 0; md[o + 3] = 0; continue; }
      const i = k % cols, j = (k / cols) | 0;
      const att = rowAtt ? rowAtt[j] : 1;                // the subtitle band: everything at BAND_ATT
      const sh = rm ? 1 : 0.78 + 0.22 * Math.sin(now * phase[k * 2 + 1] + phase[k * 2]);
      const hue = 0.5 + 0.5 * Math.sin(i * 0.5 + j * 0.33 + now * 0.22 + phase[k * 2] * 0.35);
      const mid = 1 - Math.abs(hue - 0.5) * 2;
      // ambient: cyan (40,200,255) ↔ magenta (235,50,225), dipping through violet (120,70,255)
      const ar = 40 + 195 * hue - 17.5 * mid, ag = 200 - 150 * hue - 55 * mid, ab = 255 - 30 * hue + 15 * mid;
      const aa = Math.pow(smoothstep(0.04, 1.15, f), 1.15) * 0.46 * sh * low * hazeK;
      const fa = smoothstep(0.015, 0.4, e) * (0.75 + 0.25 * sh) * low;
      // fresh charge glows electric cyan, paling towards (never reaching) white as it piles up
      const fw = FRESH_WHITE_MAX * clamp(e / 0.7);
      const ga = clamp(gl) * 0.85 * low;
      md[o + 3] = Math.round(255 * clamp(aa * 0.75 + fa * 1.2) * att);
      const A = aa + fa + ga;
      if (A <= 0.002) { d[o + 3] = 0; continue; }
      const R2 = ar * aa + (70 + 185 * fw) * fa + 255 * ga, G2 = ag * aa + (215 + 40 * fw) * fa + 205 * ga, B2 = ab * aa + 255 * fa + 130 * ga;
      d[o] = R2 / A; d[o + 1] = G2 / A; d[o + 2] = B2 / A;
      // tone-mapped: a soft shoulder up to PLASMA_A_MAX (peaks stay coloured, never flat white)
      d[o + 3] = Math.round(255 * PLASMA_A_MAX * Math.min(1, (1 - Math.exp(-1.6 * A)) * TM_NORM) * att);
    }
    const bx = field.x - field.cw * 0.5, by = field.y - field.ch * 0.5, bw = field.w + field.cw, bh = field.h + field.ch;
    g.save();
    g.imageSmoothingEnabled = true;
    midG.globalCompositeOperation = 'copy';
    // 1 clear sky where grounded (skipped until something has been grounded)
    if (anyClear) {
      fieldG.putImageData(clearData, 0, 0);
      midG.drawImage(fieldC, 0, 0, midC.width, midC.height);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.drawImage(midC, bx, by, bw, bh);
    }
    // 2 plasma — 'screen', not 'lighter': over the bright cloud deck it can only tint, never burn out
    fieldG.putImageData(fieldData, 0, 0);
    midG.drawImage(fieldC, 0, 0, midC.width, midC.height);
    g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.95;
    g.drawImage(midC, bx, by, bw, bh);
    // 3 static grain (jumps a few times a second; still when motion is reduced or stimulation low)
    if (!ctx.lowStim && resolveK < 1) {
      fieldG.putImageData(maskData, 0, 0);
      midG.drawImage(fieldC, 0, 0, midC.width, midC.height);
      const tick = rm ? 0 : Math.floor(now * 11);
      const ox = ((tick * 37) % 96), oy = ((tick * 61) % 96);
      grainG.globalCompositeOperation = 'copy';
      grainG.setTransform(1, 0, 0, 1, -ox, -oy);
      grainG.fillStyle = grainG.createPattern ? (grainPatFill || (grainPatFill = grainG.createPattern(grainPat, 'repeat'))) : '#fff';
      grainG.fillRect(ox, oy, grainC.width, grainC.height);
      grainG.setTransform(1, 0, 0, 1, 0, 0);
      grainG.globalCompositeOperation = 'destination-in';
      grainG.imageSmoothingEnabled = true;
      grainG.drawImage(midC, 0, 0, grainC.width, grainC.height);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.5 * (1 - resolveK);
      g.imageSmoothingEnabled = false;
      g.drawImage(grainC, field.x, field.y, grainC.width * grainScale, grainC.height * grainScale);
    }
    g.restore();
  }

  // 8 neighbours for the filaments
  const NB = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function drawLattice(g, now, rm) {
    // where fast strokes left fresh charge it crackles as forked electric filaments:
    // each charged cell reaches for one charged neighbour (re-chosen ~15× a second);
    // filaments under the subtitle band are drawn in a second, dim pass
    const tick = rm ? 0 : Math.floor(now * 15);
    const amp = field.cell * (rm ? 0.15 : 0.42);
    const a = ctx.lowStim ? 0.5 : 1;
    let budget = 160;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let pass = 0; pass < 2 && budget > 0; pass++) {
      const dim = pass === 1;
      const segs = latticePath(g, tick, amp, dim, budget);
      if (!segs) continue;
      budget -= segs;
      const k = a * (dim ? BAND_ATT : 1);
      g.strokeStyle = C.cyan; g.globalAlpha = 0.14 * k; g.lineWidth = 5; g.stroke();
      g.strokeStyle = '#e8fdff'; g.globalAlpha = 0.55 * k; g.lineWidth = 1; g.stroke();
    }
    g.restore();
  }
  function latticePath(g, tick, amp, dim, budget) {
    const q = field.q, fl = field.f, cols = field.cols, rows = field.rows;
    let segs = 0;
    g.beginPath();
    for (let k = 0; k < field.n && segs < budget; k++) {
      const e = q[k] - fl[k];
      if (e < 0.2) continue;
      const i = k % cols, j = (k / cols) | 0;
      if ((rowAtt ? rowAtt[j] < 0.75 : false) !== dim) continue;
      const h = ((k * 2654435761 + tick * 40503) >>> 0) / 4294967296;
      if (h > 0.35 + e) continue;                       // not every cell fires every tick
      const nb = NB[(h * 997 | 0) % 8];
      const i2 = i + nb[0], j2 = j + nb[1];
      if (i2 < 0 || j2 < 0 || i2 >= cols || j2 >= rows) continue;
      const k2 = j2 * cols + i2;
      if (q[k2] - fl[k2] < 0.12) continue;
      const x = field.cx(i), y = field.cy(j), x2 = field.cx(i2), y2 = field.cy(j2);
      const h2 = ((k * 1597334677 + tick * 3812015801) >>> 0) / 4294967296 - 0.5;
      const nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1;
      const mx = (x + x2) / 2 + (nx / nl) * h2 * amp * 2, my = (y + y2) / 2 + (ny / nl) * h2 * amp * 2;
      g.moveTo(x, y); g.lineTo(mx, my); g.lineTo(x2, y2);
      // a little fork now and then
      if (h2 > 0.25) { g.moveTo(mx, my); g.lineTo(mx + (nx / nl) * amp, my + (ny / nl) * amp + (x2 - x) * 0.2); }
      segs++;
    }
    return segs;
  }

  function drawStatic(g, now, rm) {
    // crisp crackle: tiny bright motes jumping inside the most charged cells
    if (ctx.lowStim) return;
    const tick = rm ? 0 : Math.floor(now * 12);
    g.globalCompositeOperation = 'lighter';
    let count = 0;
    for (let k = 0; k < field.n && count < 80; k++) {
      const q = field.q[k], e = q - field.f[k];
      if (q < 0.62 && e < 0.12) continue;
      const h = ((k * 2654435761 + tick * 40503) >>> 0) / 4294967296;
      if (h > (e > 0.12 ? 0.55 + e : (q - 0.62) * 0.5)) continue;
      count++;
      const i = k % field.cols, j = (k / field.cols) | 0;
      const h2 = ((k * 1597334677 + tick * 3812015801) >>> 0) / 4294967296;
      const x = field.cx(i) + (h - 0.5) * field.cw * 1.6, y = field.cy(j) + (h2 - 0.5) * field.ch * 1.6;
      const s = 1.2 + q * 1.6;
      g.globalAlpha = clamp(0.35 + 0.4 * (q - 0.6)) * (rowAtt ? rowAtt[j] : 1);
      g.drawImage(h2 < 0.5 ? sprites.glintC : sprites.glintM, x - s * 2.2, y - s * 2.2, s * 4.4, s * 4.4);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function strokeLine(g, L, n, s, drink, alpha) {
    const P = L.pts;
    const passes = 3;
    for (let pass = 0; pass < passes; pass++) {
      const wdt = pass === 0 ? 10 + 8 * s + 6 * drink : pass === 1 ? 2.6 + 2.6 * s + 2 * drink : 1.1 + 0.4 * s;
      const a = (pass === 0 ? 0.13 + 0.12 * drink : pass === 1 ? 0.55 + 0.2 * drink : 0.95) * alpha;
      g.strokeStyle = pass === 2 ? C.cream : (L.grad || C.gold);
      g.globalAlpha = clamp(a);
      g.lineWidth = wdt;
      g.beginPath();
      g.moveTo(P[0], P[1]);
      for (let i = 1; i < n; i++) g.lineTo(P[i * 2], P[i * 2 + 1]);
      g.stroke();
    }
  }

  function drawBack(g, now, rm) {
    const dpr = realm.st.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPlasma(g, now, rm);
    drawLattice(g, now, rm);
    drawStatic(g, now, rm);
    // falling ground lines slide down into the floor behind the Mallow
    const floorY = lerp(horizonY, H * groundFrac, 0.35);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const L of lines) {
      if (!L.on || L.state !== 'falling' || L.n < 2) continue;
      const e = easeOut(Math.min(1, L.fall / 0.85));
      const sy = lerp(1, 0.22, e), ty = (floorY - L.cy) * e;
      if (!L.grad) {
        L.grad = g.createLinearGradient(L.pts[0], L.pts[1], L.pts[(L.n - 1) * 2], L.pts[(L.n - 1) * 2 + 1]);
        L.grad.addColorStop(0, C.rose); L.grad.addColorStop(0.55, C.amber); L.grad.addColorStop(1, C.gold);
      }
      g.setTransform(dpr, 0, 0, dpr * sy, 0, dpr * (L.cy + ty - L.cy * sy));
      const fade = L.fall < 0.7 ? 1 : clamp(1 - (L.fall - 0.7) / 0.3);
      strokeLine(g, L, L.n, L.s, 0, 0.85 * fade);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    floorRings.draw(g);
    fallers.draw(g, sprites.fallList, 0.9, 0.12);
    g.restore();
  }

  /** Rope strokes that fade out inside the subtitle band (so lines read cleanly over the clouds). */
  function ropeStyles(g) {
    if (ropeGrads) return ropeGrads;
    const b = plan?.band || { y: 0, h: 0 };
    const mk = (hex) => {
      const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h + 12);
      gr.addColorStop(0, rgbaHex(hex, 0.1)); gr.addColorStop(0.75, rgbaHex(hex, 0.35)); gr.addColorStop(1, rgbaHex(hex, 1));
      return gr;
    };
    ropeGrads = { cyan: mk(C.cyan), gold: mk(C.gold), coreC: mk('#cdf8ff'), coreG: mk('#ffe9bf') };
    return ropeGrads;
  }

  function cardPath(g, c) {
    const w = c.w, h = c.h, r = Math.min(w, h) * 0.1;
    g.beginPath();
    g.moveTo(-w / 2 + r, -h / 2); g.arcTo(w / 2, -h / 2, w / 2, h / 2, r); g.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
    g.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r); g.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r); g.closePath();
  }

  function drawCard(g, c, now, rm) {
    const ca = c.alpha;                 // fading out (it let go) or in (just dropped into the slot)
    if (ca <= 0.01) return;
    const qk = c.q;
    const charged = 1 - c.gk;
    const gold = c.gk > 0.5;
    const fl = c.glowAge >= 0 ? flashEnv(c.glowAge, 0.35, 0.2, 1.6) : 0;
    const RS = ropeStyles(g);
    // rope: a flickering charged thread, warm gold once grounded
    g.save();
    g.lineCap = 'round';
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = gold ? RS.gold : RS.cyan;
    g.globalAlpha = ca * (0.1 + 0.16 * (gold ? c.gk : qk * (rm ? 1 : 0.7 + 0.3 * Math.sin(now * 9 + c.ph))));
    g.lineWidth = 2.4; c.rope.path(g); g.stroke();
    g.globalAlpha = ca * (0.5); g.lineWidth = 0.9; g.strokeStyle = gold ? RS.coreG : RS.coreC; c.rope.path(g); g.stroke();
    g.restore();
    // halo behind: cyan/magenta charge, or warm gold when grounded (a soft bloom as it grounds)
    g.save();
    g.globalCompositeOperation = 'lighter';
    const hr = Math.max(c.w, c.h) * 0.95;
    if (charged > 0.01) { g.globalAlpha = ca * (0.26 * qk * charged); g.drawImage(c.i % 2 ? sprites.softMagenta : sprites.softCyan, c.x - hr, c.y - hr, hr * 2, hr * 2); }
    if (c.gk > 0.01 || fl > 0) {
      const br = hr * (1 + 0.35 * fl);
      g.globalAlpha = ca * (clamp(0.3 * c.gk + 0.6 * fl)); g.drawImage(sprites.softWarm, c.x - br, c.y - br, br * 2, br * 2);
      g.globalAlpha = ca * (clamp(0.22 * c.gk + 0.35 * fl)); g.drawImage(sprites.softGold, c.x - hr * 0.8, c.y - hr * 0.8, hr * 1.6, hr * 1.6);
    }
    g.restore();
    const skew = rm ? 0 : 0.02 * qk * charged * Math.sin(now * 7 + c.ph);
    photos.draw(g, c.i, c.x, c.y, c.size, { shape: 'card', rot: c.rot, tone: 'storm', toneMix: 0.8 * qk * charged, skewY: skew, shadow: false, alpha: ca });
    // the charged look, strong enough to read on the Mallow cards too (their own tone stays light):
    // a cold storm wash with static lines; grounded, it lifts away to the card's own colours
    const ck = clamp(qk * charged * 1.15);
    g.save();
    g.translate(c.x, c.y); g.rotate(c.rot); if (skew) g.transform(1, skew, 0, 1, 0, 0);
    cardPath(g, c);
    if (ck > 0.02) {
      g.save();
      g.clip();
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = ca * (0.46 * ck); g.fillStyle = '#1a1250'; g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      if (!ctx.lowStim) {
        g.globalCompositeOperation = 'lighter';
        const tk = rm ? 0 : Math.floor(now * 9 + c.ph * 3);
        for (let e = 0; e < 4; e++) {
          const h = ((c.i * 2654435761 + tk * 40503 + e * 97) >>> 0) / 4294967296;
          g.globalAlpha = ca * (0.22 * ck); g.fillStyle = e % 2 ? C.magenta : C.cyan;
          g.fillRect(-c.w / 2, -c.h / 2 + h * c.h, c.w, 1 + (e === 0 ? 1 : 0));
        }
      }
      g.restore();
    }
    // the rim: a cold flickering edge while charged, a warm gold frame once grounded
    g.globalCompositeOperation = 'lighter';
    if (charged > 0.05) { g.strokeStyle = c.i % 2 ? C.magenta : C.cyan; g.globalAlpha = ca * (0.5 * qk * charged * (rm ? 1 : 0.75 + 0.25 * Math.sin(now * 11 + c.ph))); g.lineWidth = 1.4; g.stroke(); }
    if (c.gk > 0.02 || fl > 0) {
      g.strokeStyle = C.gold; g.globalAlpha = ca * (clamp(0.32 * c.gk + 0.4 * fl)); g.lineWidth = 5; g.stroke();
      g.strokeStyle = '#fff1cf'; g.globalAlpha = ca * (clamp(0.85 * c.gk + 0.15 * fl)); g.lineWidth = 1.6; g.stroke();
    }
    g.restore();
    // edge glints while charged
    if (charged > 0.2 && qk > 0.25 && !ctx.lowStim) {
      const tk = rm ? 0 : Math.floor(now * 5 + c.ph);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let e = 0; e < 3; e++) {
        const h = ((c.i * 7919 + tk * 104729 + e * 15485863) >>> 0) / 4294967296;
        const side = (h * 4) | 0, u = (h * 4) % 1;
        const lx = side < 2 ? (u - 0.5) * c.w : (side === 2 ? -0.5 : 0.5) * c.w;
        const ly = side < 2 ? (side === 0 ? -0.5 : 0.5) * c.h : (u - 0.5) * c.h;
        const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
        const x = c.x + lx * cs - ly * sn, y = c.y + lx * sn + ly * cs, sz = 5 + 5 * qk;
        g.globalAlpha = ca * (0.55 * qk * charged);
        g.drawImage(e % 2 ? sprites.glintM : sprites.glintC, x - sz, y - sz, sz * 2, sz * 2);
      }
      g.restore();
    }
  }

  function drawThought(g, now, rm) {
    if (!thought) return;              // nothing typed yet: no Thought Mallow in the storm
    const x = tSpring.x, y = tSpring.y + tWobble.v * 3;
    const qLocal = clamp(tTension - 0.4) / 0.6;
    // micro-arcs crackling round it while it holds charge
    if (!rm && qLocal > 0.4 && !thoughtSettle.settled) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      const n = 2 + ((qLocal * 3) | 0), tk = Math.floor(now * 14);
      for (let k = 0; k < n; k++) {
        const h = ((k * 2246822519 + tk * 3266489917) >>> 0) / 4294967296;
        const a0 = h * TAU, r0 = tR * 1.02, r1 = tR * (1.25 + 0.3 * h);
        g.strokeStyle = k % 2 ? C.magenta : C.cyan; g.globalAlpha = 0.65 * qLocal; g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x + Math.cos(a0) * r0, y + Math.sin(a0) * r0);
        g.lineTo(x + Math.cos(a0 + 0.25) * (r0 + r1) / 2, y + Math.sin(a0 + 0.25) * (r0 + r1) / 2);
        g.lineTo(x + Math.cos(a0 + 0.1) * r1, y + Math.sin(a0 + 0.1) * r1);
        g.stroke();
      }
      g.restore();
    }
    // circling feedback: a faint gold orbit when slow circles are grounding it faster
    let circ = 0;
    for (const f of fingers) if (f.on && f.circling > circ) circ = f.circling;
    if (circ > 0.05) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = C.gold; g.globalAlpha = 0.35 * circ; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, tR * 1.9, 0, TAU); g.stroke();
      g.globalAlpha = 0.25 * circ; g.drawImage(sprites.softGold, x - tR * 2.4, y - tR * 2.4, tR * 4.8, tR * 4.8);
      g.restore();
    }
    if (thought?.draw) {
      try { thought.draw(g, x, y, tScale, { tension: tTension, charge: qLocal, calm: thoughtSettle.settled ? 1 : 1 - qLocal, fizz: tFizz, reduced: rm, radius: tR, now, minX: 20, maxX: W - 20, labelWidth: tLabelW }); } catch (e) { /* placeholder only */ }
    }
  }

  function drawActiveLine(g, f, now) {
    const L = f.line;
    if (!L || L.n < 1) return;
    // the line reaches right to the fingertip
    const n = L.n;
    if (n < MAX_PTS) { L.pts[n * 2] = f.x; L.pts[n * 2 + 1] = f.y; }
    const m = Math.min(MAX_PTS, n + 1);
    if (m >= 2) strokeLine(g, L, m, L.s, L.drink, 1);
    // the fingertip itself: a warm point of light that brightens while it drinks, and opens into a
    // soft warm halo once the stroke is properly slow
    const r = 16 + 14 * L.drink + 8 * f.deep;
    if (f.deep > 0.02) { const hr = 34 + 18 * f.deep; g.globalAlpha = 0.3 * f.deep; g.drawImage(sprites.softWarm, f.x - hr, f.y - hr, hr * 2, hr * 2); }
    g.globalAlpha = 0.45 + 0.4 * L.drink;
    g.drawImage(sprites.gold, f.x - r, f.y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  }

  function drawCrackleTrail(g, f, now, rm) {
    const tr = f.trail;
    if (tr.n < 2) return;
    const life = 0.45;
    const jt = rm ? 0 : Math.floor(now * 20);
    for (let pass = 0; pass < 3; pass++) {
      const off = pass === 0 ? -1.6 : pass === 1 ? 1.6 : 0;
      g.strokeStyle = pass === 0 ? C.cyan : pass === 1 ? C.magenta : C.white;
      g.lineWidth = pass === 2 ? 1.4 : 3.2;
      g.beginPath();
      let started = false;
      for (let k = 0; k < tr.n; k++) {
        const i = (tr.head + k) % 28;
        const age = elapsed - tr.t[i];
        if (age > life) continue;
        const a = 1 - age / life;
        const j = rm ? 0 : (((i * 2654435761 + jt * 40503) >>> 0) / 4294967296 - 0.5) * 12 * a * clamp(f.k + 0.3);
        const x = tr.x[i] + off + j, y = tr.y[i] - j * 0.6;
        if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
      }
      g.globalAlpha = (pass === 2 ? 0.85 : 0.5) * clamp(0.3 + f.k);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  function drawFront(g, now, rm) {
    const dpr = ctx.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // arcs crackle in the sky, behind the postcards and the person's words
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const a of arcs) {
      if (!a.on) continue;
      if (a.shimmer) {
        // a slow breath of light: sine in, sine out (rise ≥ 0.9 s), low alpha
        const e = Math.sin((a.age / a.ttl) * Math.PI);
        g.globalAlpha = 0.16 * e * e;
        const r = a.size;
        g.drawImage(a.colour === C.cyan ? sprites.softCyan : sprites.softMagenta, a.pts[0] - r, a.pts[1] - r, r * 2, r * 2);
        continue;
      }
      const e = Math.sin((a.age / a.ttl) * Math.PI) * (a.bright ? 1 : 0.35);
      for (let pass = 0; pass < 3; pass++) {
        g.strokeStyle = pass === 2 ? '#f2feff' : a.colour; g.globalAlpha = (pass === 0 ? 0.08 : pass === 1 ? 0.38 : 0.85) * e; g.lineWidth = pass === 0 ? 7 : pass === 1 ? 2.4 : 1;
        g.beginPath(); g.moveTo(a.pts[0], a.pts[1]);
        for (let i = 2; i < a.n; i += 2) g.lineTo(a.pts[i], a.pts[i + 1]);
        g.stroke();
      }
    }
    g.restore();
    for (const c of cards) drawCard(g, c, now, rm);
    drawThought(g, now, rm);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalAlpha = 1;
    // fingers: crackle when fast, gold line when slow, pulses when still
    for (const f of fingers) {
      if (!f.on) continue;
      drawCrackleTrail(g, f, now, rm);
      drawActiveLine(g, f, now);
      if (f.wait > 0.02 && !f.pulse.on) { g.globalCompositeOperation = 'source-over'; waitRing(g, f.x, f.y, 24, f.wait, C.gold, 0.85 * f.wait); g.globalCompositeOperation = 'lighter'; }
      if (f.pulse.on) {
        const e = f.pulse.age / PULSE_SEC, r = PULSE_CELLS * field.cell * easeOut(e);
        g.globalAlpha = 0.28 * (1 - e); g.drawImage(sprites.softGold, f.x - r, f.y - r, r * 2, r * 2);
        g.globalAlpha = 1;
      }
      if (!f.line && f.k <= 0) { const r = 12; g.globalAlpha = 0.5; g.drawImage(sprites.white, f.x - r, f.y - r, r * 2, r * 2); g.globalAlpha = 1; }
      // a fast fingertip carries a soft electric glow (the band's answer, where the plasma is dimmed)
      if (f.k > 0) { const r = 22 + 8 * clamp(f.k); g.globalAlpha = 0.18 + 0.12 * clamp(f.k); g.drawImage(sprites.softCyan, f.x - r, f.y - r, r * 2, r * 2); g.globalAlpha = 1; }
    }
    motes.draw(g, sprites.moteList, 1, 0.08);
    sparks.draw(g, sprites.sparkList, 1, 0.02);
    rings.draw(g);
    // ghost finger hint: a slow gold stroke drawn by a translucent fingertip (visual only);
    // reduced motion: the same stroke, still and dotted, with the fingertip resting at its end,
    // fading in and out over 0.6 s
    if (hint.age >= 0) {
      const still = rm;
      const head = still ? 1 : easeOut(clamp(hint.age / 2.6));
      const fade = still ? clamp(Math.min(hint.age / 0.6, (HINT_SEC - hint.age) / 0.6)) : Math.sin(clamp(hint.age / HINT_SEC) * Math.PI);
      const len = U * 0.42;
      const hx = hint.x0 + len * head, hy = hint.y0 - Math.sin(head * Math.PI) * 18;
      g.strokeStyle = C.gold; g.globalAlpha = (still ? 0.6 : 0.35) * fade; g.lineWidth = still ? 3.5 : 3;
      if (still) { g.lineCap = 'round'; g.setLineDash([0.5, 9]); }
      g.beginPath();
      for (let s = 0; s <= 24; s++) { const u = (s / 24) * head; const x = hint.x0 + len * u, y = hint.y0 - Math.sin(u * Math.PI) * 18; s ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      if (still) g.setLineDash([]);
      g.globalAlpha = 0.55 * fade; g.drawImage(sprites.white, hx - 14, hy - 14, 28, 28);
      g.globalAlpha = 1;
    }
    g.restore();
  }

  // ----------------------------------------------------- audio + mallow --
  function stopGroundHold() { holds.ground?.stop(); holds.ground = null; }
  function audioAndMallow(dt, now, f0) {
    holdClock += dt;
    if (holdClock > 1 / 15) {
      holdClock = 0;
      const sp = f0 ? f0.speed / U : 0;
      holds.charge?.update({ intensity: clamp((Q * 0.5 + (f0 ? f0.k * 0.25 : 0)) * (complete ? 0.35 : 1) * (1 - outroK)), pitch: 0.8 + 0.5 * Math.min(sp / 3, 1) });
      const grounding = drainRate > 0.4;
      if (grounding) {
        groundIdle = 0;
        if (!holds.ground && everTouched) holds.ground = ctx.hold('ground', { intensity: 0.2 });
        holds.ground?.update({ intensity: clamp(drainRate / 14) });
      } else if (holds.ground) { groundIdle += 1 / 15; if (groundIdle > 0.3) stopGroundHold(); }
    }
    ambClock += dt;
    if (ambClock > 0.5) { ambClock = 0; ctx.ambienceMood(moodFor(Q, complete ? 1 : p)); }
    // Glitzi: bristling and glitchy → calm, with the light grounded
    if (mallow && now - emoAt > 0.6) {
      const pp = complete ? 1 : p, qn = clamp(Q / 1.2);
      // towards 'content' (calm, relieved, a little happy) as the light is grounded
      const mix = { frustrated: 0.45 * (1 - pp) * (0.5 + 0.5 * qn), excited: 0.2 * qn * (1 - pp), curious: 0.15 * (1 - pp), calm: 0.12 + 0.48 * pp, relieved: 0.28 * pp * pp, happy: 0.22 * pp * pp };
      const key = Object.values(mix).map((v) => Math.round(v * 10)).join(',');
      if (key !== emoKey) { emoKey = key; emoAt = now; try { mallow.setEmotion?.(mix, 0.7 + 0.15 * (1 - pp), { quiet: true }); } catch { /* optional */ } }
    }
    if (mallow?.lookAt && f0) { const r = mallow.rect?.(); if (r) mallow.lookAt(clamp((f0.x - r.cx) / (W * 0.5), -1, 1), clamp((f0.y - r.cy) / (H * 0.5), -1, 1)); }
  }

  // --------------------------------------------------------------- api --
  return {
    prepare,
    get backCanvas() { return realm?.canvas || null; },
    enter({ from } = {}) {
      layout();
      try { thought?.react?.('appear'); } catch { /* optional */ }
      const intro = ctx.entry.dialogue?.intro;
      if (intro && !from) introAt = 3.8;
    },
    frame,
    pointer,
    get metrics() {
      const f0 = fingers.find((f) => f.on);
      return { speedU: f0 ? f0.speed / U : 0, charge: Q, calm: 1 - clamp(Q), light: field?.light ?? 0, progress: p, stillSec: f0 ? f0.still : 0, fastPx: pace.fastPx, slowRun: slowingD.slowRun, armed: slowingD.armed, groundedCards, cards: cards.length, photos: allCards.length, waiting: waiting.length, thoughtCharge: tCharge, thoughtSettled: thoughtSettle.settled, lines: lines.filter((l) => l.on).length, drainRate };
    },
    get progress() { return complete ? 1 : p; },
    get complete() { return complete; },
    outro(k) { outroK = k; },
    intro() {},
    handoff() {
      const seeds = [];
      for (const L of lines) {
        if (!L.on || L.n < 3) continue;
        const step = Math.max(1, Math.floor(L.n / 20)), pts = [];
        for (let i = 0; i < L.n; i += step) pts.push([Math.round(L.pts[i * 2]), Math.round(L.pts[i * 2 + 1])]);
        seeds.push(pts);
      }
      return {
        horizonY, palette: { sky: '#17135c', deep: '#05061f', warm: '#ffd98a' }, seeds,
        thought: { x: tSpring.x, y: tSpring.y, scale: tScale, tension: tTension },
        photos: cards.map((c) => ({ i: c.i, x: c.x, y: c.y, w: c.w, h: c.h, rot: c.rot, state: c.grounded ? 'grounded' : 'charged' })),
        energy: Q,
      };
    },
    pause() { paused = true; holds.charge?.stop(); holds.charge = null; stopGroundHold(); for (const f of fingers) { if (f.line) endLine(f, true); f.on = false; } },
    resume() { paused = false; },
    /**
     * The person picked a different feeling (or intensity) in the side panel: the storm's own
     * charge eases towards it over FEEL_SEC (never counted as light, never moving progress),
     * Glitzi nods and says so. Glitzi's mix follows the charge by itself.
     */
    setEmotion(id, i) {
      const qT = qFor(id, Number.isFinite(i) ? i : intensity);
      if (id === feel.id && Math.abs(qT - feel.q) < 0.03) return;
      const m = qT / feel.q, sameId = id === feel.id;
      feel = { id, q: qT };
      const d = ctx.entry.dialogue?.feeling || {};
      const lines2 = m > 1.04 ? d.more : m < 0.96 ? d.less : (sameId ? null : d.other);
      if (prepared && !complete && Math.abs(m - 1) > 0.01) feelEase = { m, left: FEEL_SEC };
      try { mallow?.react?.('nod'); } catch { /* optional */ }
      if (lines2 && !paused) ctx.say(lines2, { who: 'glitzi', kind: 'dialogue' });
    },
    setThought(h) { thought = h; if (prepared) layout(); },
    /**
     * Client rects to keep subtitles off (all hard): the Thought Mallow with its words
     * plate, every postcard, and fingers outside the subtitle band (a finger passing
     * through the band does not push the line away: the band is the line's own slot).
     */
    avoid() {
      const out = [];
      const band = plan?.band;
      if (thought && plan?.thought) {
        const T = plan.thought, dx = tSpring.x - T.x, dy = tSpring.y - T.y;
        const x0 = Math.min(T.R.body.x0, T.R.plate.x0) + dx, x1 = Math.max(T.R.body.x1, T.R.plate.x1) + dx;
        out.push({ x: x0, y: T.R.top + dy, w: x1 - x0, h: T.R.bottom - T.R.top, kind: 'thought' });
      }
      for (const c of cards) { const hw = (Math.abs(Math.cos(c.rot)) * c.w + Math.abs(Math.sin(c.rot)) * c.h) / 2 + 4, hh = (Math.abs(Math.sin(c.rot)) * c.w + Math.abs(Math.cos(c.rot)) * c.h) / 2 + 4; out.push({ x: c.x - hw, y: c.y - hh, w: hw * 2, h: hh * 2, kind: 'card' }); }
      for (const f of fingers) if (f.on && !(band && f.y < band.y + band.h)) out.push({ x: f.x - 60, y: f.y - 60, w: 120, h: 120, kind: 'finger' });
      return out;
    },
    /** The subtitle slot this world keeps clear (client px): the director's reserved band. */
    subtitleBand() { const b = plan?.band || ctx.band; return b ? { x: b.x, y: b.y, w: b.w, h: b.h } : null; },
    /** QA: the layout chosen for this screen. */
    get layoutPlan() { return plan ? { s: plan.s, thought: plan.thought ? { name: plan.thought.name, x: plan.thought.x, y: plan.thought.y, r: plan.thought.r, labelW: plan.thought.labelW, lines: plan.thought.lines } : null, zone: plan.zone, band: plan.band, slots: plan.slots.length } : null; },
    serialize() {
      return {
        v: 1, seed: ctx.seed, progress: Math.round((complete ? 1 : p) * 1000) / 1000, complete,
        field: field ? field.snapshot() : null, discoveries: [...discovered],
        photoState: allCards.map((c) => ({ i: c.i, grounded: c.grounded, q: Math.round(c.q * 100) / 100 })),
        thought: { q: Math.round(tCharge * 100) / 100, settled: thoughtSettle.settled }, elapsed: Math.round(elapsed),
      };
    },
    restore(s) {
      if (!s || s.v !== 1) return false;
      if (!field) layout();
      if (s.field) field.restore(s.field);
      for (const id of s.discoveries || []) { discovered.add(id); if (id === 'slowing') slowingD.markFired(); if (id === 'stillness') stillD.markFired(); }
      for (const ps of s.photoState || []) { const c = allCards.find((q) => q.i === ps.i); if (c) { c.q = clamp(ps.q ?? c.q); if (ps.grounded && !c.grounded) { c.grounded = true; c.gk = 1; groundedCards++; } } }
      // the ungrounded ones hang first (short screens show only some at once)
      if (plan) { cards.length = 0; layoutCards(); }
      if (s.thought) { tCharge = clamp(s.thought.q ?? tCharge, 0, 1.3); if (s.thought.settled) { thoughtSettle.markSettled(); tSettledShown = true; } }
      if (s.complete) { complete = true; completeAt = 0; realm?.transform(1).settle(); }
      Q = field.storminess(); p = field.progress;
      return true;
    },
    resize(w, h, { dprBack } = {}) {
      W = w; H = h; U = Math.min(W, H);
      pace.setU(U);
      if (realm) { realm.resize(W, H, dprBack); realm.build(); horizonY = realm.horizonY; }
      layout();
      if (field && fieldC && (fieldC.width !== field.cols || fieldC.height !== field.rows)) buildField();
    },
    setQuality({ dprBack } = {}) { if (realm && dprBack) { realm.resize(W, H, dprBack); realm.build(); } },
    destroy() {
      holds.charge?.stop(); stopGroundHold();
      realm?.destroy(); realm = null;
    },
    /** QA hooks. */
    debug: { brightTimes: () => Array.from(bright.slice(0, Math.min(brightN, 8))), get brightCount() { return brightN; }, get field() { return field; }, get cards() { return cards; }, get allCards() { return allCards; }, get waiting() { return waiting.slice(); }, get realm() { return realm; }, get lines() { return lines; }, get fingers() { return fingers; }, thoughtPos: () => ({ x: tSpring.x, y: tSpring.y, r: tR }) },
  };
}
