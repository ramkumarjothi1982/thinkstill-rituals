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
// Spec and constants: docs/audit/worlds.md proposals 5 and 7.

import { createRealmCore } from '../../../world/realm.js';
import { glowSprite, glintSprite, Pool, Rings, flashEnv, clamp, lerp, smoothstep, TAU, makeCanvas, mixHex } from '../../../world/util.js';
import { Rope, Spring2 } from '../../../v3/fx.js';
import { AngleTracker, Wobble, waitRing } from '../../../v3/kit.js';
import { ChargeField, FIELD } from './storm-field.js';
import { createPace, slowness, PACE, createSlowingDetector, createStillnessDetector, createSettleDetector } from '../discovery.js';

const C = {
  cyan: '#3ee8ff', magenta: '#ff3df2', violet: '#7b5cff', white: '#ffffff',
  gold: '#ffd98a', amber: '#ffb35c', rose: '#ff9ec4', cream: '#fff4dc',
};
const MAX_LINES = 14, MAX_PTS = 240, LINE_STEP = 6, SEGMENT_SEC = 1.4, FALL_SEC = 4;
const PULSE_SEC = 1.6, PULSE_CELLS = 5, MAX_ARCS = 6;
const BRIGHT_PER_SEC = 3;
const ROPE_N = 6;

const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);

export function create(ctx) {
  const { photos, words } = ctx;
  const mallow = ctx.mallow || null;
  let thought = ctx.thought || null;
  const R = ctx.rand;
  let W = ctx.W, H = ctx.H, U = ctx.U;
  const reduced = () => ctx.reduced;
  const intensity = clamp(ctx.intensity ?? 0.6);
  const hot = ctx.emotion === 'angry' || ctx.emotion === 'frustrated';
  const q0 = clamp(0.35 + 0.5 * intensity + (hot ? 0.08 : 0), 0.3, 0.95);

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
    on: false, id: -1, x: 0, y: 0, px: 0, py: 0, speed: 0, s: 0, k: 0, t0: 0, still: 0, fastFor: 0, slowGap: 0,
    line: null, onThought: false, pulse: { on: false, age: 0, drained: 0 }, wait: 0, tracker: new AngleTracker(), circling: 0,
    trail: { x: new Float32Array(28), y: new Float32Array(28), t: new Float32Array(28), j: new Float32Array(28), n: 0, head: 0 },
    pointerType: 'touch', grounding: 0,
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
  let fieldC = null, fieldG = null, fieldData = null, midC = null, midG = null;
  let phase = null;                  // per-cell shimmer phases

  // postcards
  const cards = [];
  // thought
  const tSpring = new Spring2(0, 0, { stiffness: 30, damping: 8 });
  const tWobble = new Wobble();
  let tAnchor = { x: 0, y: 0 }, tCharge = clamp(q0 + 0.2, 0.6, 1.2), tTension = 0.7, tSettledShown = false, tFizz = 0, tScale = 1, tR = 34;
  const tTracker = new AngleTracker();

  // state
  let Q = q0, p = 0, light0 = 0, complete = false, completeAt = -1, elapsed = 0, lastDrain = 0, drainRate = 0;
  let firstSurge = false, discovered = new Set(), groundedCards = 0;
  let glitchAt = -10, emoAt = -10, emoKey = '';
  let holds = { charge: null, ground: null }, groundIdle = 0, holdClock = 0, ambClock = 0;
  let hint = { next: 5, shown: 0, age: -1, x0: 0, y0: 0 };
  let paused = false, outroK = 0;
  let pulsedThisFrame = false, pulseDrainThisFrame = 0;
  let prepared = false;
  let realmBuilt = false;

  // ---------------------------------------------------------- layout --
  function layout() {
    const safe = ctx.safe;
    const mr = mallow?.rect?.();
    if (mr && mr.height > 20) groundFrac = clamp(mr.bottom / H, 0.78, 0.95);
    horizonY = Math.round(H * 0.655);
    const fy0 = Math.max(24, safe.y - 14), fy1 = Math.min(H - 30, horizonY + H * 0.07);
    if (!field) field = new ChargeField({ x: 0, y: fy0, w: W, h: fy1 - fy0, q0, seed: ctx.seed });
    else field.setRect(0, fy0, W, fy1 - fy0);
    // the Thought Mallow's tether: away from Glitzi, upper left of the play area
    tR = clamp(U * 0.085, 26, 44);
    tAnchor = { x: W * 0.27, y: safe.y + 0.3 * safe.h };
    if (!tSpring.x && !tSpring.y) tSpring.set(tAnchor.x, tAnchor.y);
    else tSpring.to(tAnchor.x, tAnchor.y);
    layoutCards(safe);
  }

  function cardSlots(n, safe) {
    // a hanging mobile below the cloud deck: staggered rows, clear of the
    // Thought Mallow's tether and of the Mallow's stage
    const out = [];
    if (!n) return out;
    const landscape = W > H * 0.9;
    const yTop = Math.max(safe.y + 26, H * 0.15), yBot = Math.min(safe.y + safe.h - 40, H * 0.47);
    const rows = n <= 3 ? 1 : 2;
    const perRow = [Math.ceil(n / rows), Math.floor(n / rows)];
    const thX = tAnchor.x, thY = tAnchor.y;
    for (let r = 0; r < rows; r++) {
      const k = perRow[r];
      for (let i = 0; i < k; i++) {
        const fx = (i + 0.5 + (r % 2 ? 0.5 : 0)) / (k + (r % 2 ? 1 : 0));
        let x = lerp(landscape ? 0.36 : 0.1, 0.9, fx) * W;
        let y = rows === 1 ? lerp(yTop, yBot, 0.35) : lerp(yTop, yBot, r ? 0.86 : 0.08);
        y += (R() - 0.5) * H * 0.03;
        // keep clear of the thought
        const dx = x - thX, dy = y - thY, d = Math.hypot(dx, dy), need = tR * 2.6 + U * 0.12;
        if (d < need) { x = thX + (dx / (d || 1)) * need; if (Math.abs(dx) < 1) x = thX + need; y = clamp(y, yTop, yBot); }
        out.push({ x: clamp(x, 20 + U * 0.1, W - 20 - U * 0.1), y });
      }
    }
    return out;
  }

  function layoutCards(safe) {
    const n = Math.min(7, photos?.n || 0);
    const size = clamp(U * (0.26 - Math.max(0, n - 3) * 0.012), U * 0.2, U * 0.26);
    const slots = cardSlots(n, safe);
    const deckY = Math.max(10, safe.y - 30);
    if (cards.length !== n) {
      cards.length = 0;
      for (let i = 0; i < n; i++) {
        const s = slots[i];
        const ax = s.x + (R() - 0.5) * 16, ay = deckY - R() * 10;
        const sz = photos.size(i, 'card', size);
        cards.push({
          i, ax, ay, x: s.x, y: s.y, w: sz.w, h: sz.h, size, rot: 0, rotV: 0, q: clamp(0.55 + R() * 0.35 + (hot ? 0.1 : 0), 0, 1),
          grounded: false, gk: 0, glowAge: -1, wobble: new Wobble(), ph: R() * TAU, depth: 0.85 + R() * 0.15,
          rope: new Rope(ROPE_N, ax, ay, s.x, s.y - sz.h / 2, { gravity: 260, iterations: 6, slack: 1.0 }), restLen: 0, flash: 0, touched: 0,
        });
        const c = cards[i];
        c.rope.pinB = false;
        c.restLen = c.rope.seg;
      }
      cards.sort((a, b) => a.depth - b.depth);
    } else {
      for (let k = 0; k < n; k++) {
        const c = cards.find((q) => q.i === k);
        const s = slots[k];
        const sz = photos.size(k, 'card', size);
        c.size = size; c.w = sz.w; c.h = sz.h;
        c.ax = s.x; c.ay = deckY;
        c.rope = new Rope(ROPE_N, c.ax, c.ay, s.x, s.y - sz.h / 2, { gravity: 260, iterations: 6, slack: 1.0 });
        c.rope.pinB = false; c.restLen = c.rope.seg * (c.grounded ? 0.86 : 1); c.rope.seg = c.restLen;
      }
    }
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
    midC = makeCanvas(field.cols * 4, field.rows * 4);
    midG = midC.getContext('2d');
    midG.imageSmoothingEnabled = true;
    phase = new Float32Array(field.n * 2);
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
    if (cards.length) {
      const scratch = makeCanvas(8, 8).getContext('2d');
      for (const c of cards) { photos.draw(scratch, c.i, 4, 4, c.size, { shape: 'card', tone: 'storm', toneMix: 0.5, shadow: false }); }
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
    if (thought?.hitTest) { try { if (thought.hitTest(x, y)) return true; } catch { /* placeholder */ } }
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
      f.on = true; f.id = s.id; f.x = f.px = s.x; f.y = f.py = s.y; f.speed = 0; f.s = 0; f.k = 0; f.t0 = elapsed; f.still = 0; f.fastFor = 0; f.slowGap = 0;
      f.line = null; f.pulse.on = false; f.pulse.age = 0; f.pulse.drained = 0; f.wait = 0; f.circling = 0; f.grounding = 0; f.pointerType = s.pointerType || 'touch';
      f.trail.n = 0; f.trail.head = 0;
      f.onThought = hitThought(s.x, s.y);
      f.tracker.cx = tSpring.x; f.tracker.cy = tSpring.y; f.tracker.start(s.x, s.y); f.tracker.speed = 0;
      pace.setPointerType(f.pointerType);
      everTouched = true; if (firstTouchAt < 0) firstTouchAt = elapsed; hint.age = -1;
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
      const x0 = f.x, y0 = f.y;
      f.x = s.x; f.y = s.y; f.speed = s.speed;
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
        if (c) { c.q = Math.min(1, c.q + 0.12 * k); c.wobble.kick(0.5 * k); c.rope.px[ROPE_N - 1] -= (s.vx || 0) * 0.004; c.touched = 1; if (c.grounded && c.q > 0.3) ungroundCard(c); }
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
    const len = Math.hypot(x1 - x0, y1 - y0);
    a.bright = len > 70 ? brightOK(now) : true;
    a.on = true; a.age = 0; a.ttl = 0.18 + R() * 0.17; a.colour = R() < 0.6 ? C.cyan : C.magenta;
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

  // ------------------------------------------------------------- frame --
  function frame(dt, t) {
    if (!prepared) return;
    if (paused) dt = 0;
    elapsed += dt;
    const now = elapsed;
    const rm = reduced();
    pulsedThisFrame = false; pulseDrainThisFrame = 0;

    // pace of the primary finger
    const f0 = fingers.find((f) => f.on) || null;
    const band = pace.update(dt, !!f0, f0 ? f0.speed : 0);
    const lightBefore = field.light;

    for (const f of fingers) {
      if (!f.on) continue;
      f.s = slowness(f.speed, U, PACE[f.pointerType] || PACE.touch);
      const isStill = f.speed < (PACE[f.pointerType] || PACE.touch).stillU * U;
      f.still = isStill ? f.still + dt : 0;
      // slow circling round the Thought Mallow grounds it ×1.8
      f.tracker.cx = tSpring.x; f.tracker.cy = tSpring.y;
      const dT = Math.hypot(f.x - tSpring.x, f.y - tSpring.y);
      const dA = f.tracker.feed(f.x, f.y, Math.max(dt, 1 / 240));
      const w = Math.abs(f.tracker.speed);
      const ring = dT > tR * 0.5 && dT < tR * 2.8;
      f.circling = ring && w > 0.6 && w < 2.5 && f.s > 0.2 ? Math.min(1, f.circling + dt * 3) : Math.max(0, f.circling - dt * 2);
      // lines start when the finger is slow, end when it rushes
      if (!f.onThought && !complete) {
        if (!f.line && f.s >= 0.35 && !isStill) startLine(f);
        else if (f.line) {
          if (f.s < 0.12) { f.slowGap += dt; if (f.slowGap > 0.15) endLine(f, true); } else f.slowGap = 0;
          if (f.line) { f.line.age += dt; f.line.s = lerp(f.line.s, f.s, 0.1); if (f.line.age > SEGMENT_SEC && f.line.n > 24) endLine(f, false); }
        }
      } else if (complete && !f.line && f.s >= 0.35 && !isStill && !f.onThought) startLine(f);
      // grounding under the finger
      if (f.s > 0.05 && !f.onThought) {
        drainFx.x = f.x; drainFx.y = f.y;
        const mul = 1 + 0.8 * f.circling;
        const d = field.drain(f.x, f.y, FIELD.DRAIN_RATE * f.s * mul, dt, FIELD.DRAIN_SIGMA, onDrain);
        if (f.line) f.line.drink = lerp(f.line.drink, clamp(d / (dt * 6 + 1e-6)), 0.2);
        groundCardsNear(f.x, f.y, field.cell * 2, 1.4 * f.s * dt);
        if (dT < tR * 3) groundThought(0.9 * f.s * mul * dt * (dT < tR * 1.5 ? 1 : 0.6));
      }
      if (f.onThought && f.s > 0.4) groundThought(0.5 * f.s * dt);
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
        if (Math.hypot(f.x - tSpring.x, f.y - tSpring.y) < r + tR) groundThought(0.6 * dt);
        if (f.pulse.age >= PULSE_SEC) {
          pulsedThisFrame = true; pulseDrainThisFrame += f.pulse.drained;
          f.pulse.on = false;
          if (isStill && f.still > 0.6) { f.pulse.on = true; f.pulse.age = 0; f.pulse.drained = 0; rings.add(f.x, f.y, 6, PULSE_CELLS * field.cell, PULSE_SEC, 1, C.gold, 0.7, 2.4); }
          f.still = isStill ? 0.6 : 0;
        }
      }
    }

    // field physics
    field.step(dt);
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
      firstSurge = true;
      mallow?.react?.('gasp');
      const lines2 = ctx.entry.dialogue?.charge;
      if (lines2) ctx.say(lines2, { who: 'glitzi', kind: 'dialogue' });
    }
    if (f0 && f0.k > 0.6 && Q > 0.9 && now - glitchAt > 6) { glitchAt = now; mallow?.react?.('glitchBurst'); }

    updateThought(dt, now);
    updateCards(dt, now);
    updateLines(dt);
    updateMotes(dt);
    sparks.update(dt, 40, 3);
    fallers.update(dt, 40, 0.4);
    rings.update(dt);
    floorRings.update(dt);
    for (const a of arcs) if (a.on) { a.age += dt; if (a.age >= a.ttl) a.on = false; }
    if (!rm && !complete && outroK < 0.5) {
      arcClock += dt * clamp(Q - 0.35) * 7;
      while (arcClock > 1) { arcClock -= 1; spawnArc(now); }
    }

    // realm: the backdrop answers within a frame (τ 0.35 s), the transform a little slower
    const pp = complete ? 1 : p;
    realm.setMood(moodFor(Q * (1 - outroK * 0.5), pp), { tau: 0.35 });
    realm.transform(complete ? 1 : 0.9 * p, { tau: complete ? 1.2 : 0.6 });
    if (f0) realm.setFocus(clamp((f0.x / W) * 2 - 1, -1, 1) * 0.5, clamp((f0.y / H) * 2 - 1, -1, 1) * 0.4);
    else realm.setFocus(0, 0);
    realm.tick(dt * 1000);
    realm.draw();
    drawBack(realm.ctx, now, rm);
    drawFront(ctx.front.g, now, rm);

    audioAndMallow(dt, now, f0);

    // natural completion (needs the finger lifted for 1.5 s)
    if (!complete) {
      const enough = p >= 1 || (p >= 0.7 && Q < 0.15 && groundedCards >= Math.min(2, cards.length));
      if (enough && !fingers.some((f) => f.on) && now - liftAt >= 1.5) finishStorm();
    }
    // a gentle ghost finger if nobody has touched yet
    if (!everTouched && !rm) {
      hint.next -= dt;
      if (hint.next <= 0 && hint.shown < 2 && hint.age < 0) { hint.age = 0; hint.shown++; hint.next = 9; hint.x0 = W * 0.3; hint.y0 = lerp(ctx.safe.y + ctx.safe.h * 0.55, H * 0.5, 0.5); }
    }
    if (hint.age >= 0) { hint.age += dt; if (hint.age > 3.4) hint.age = -1; }
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
    const qLocal = clamp(0.5 * local + 0.6 * tCharge, 0, 1.3);
    tTension = clamp(0.4 + 0.6 * qLocal) * (thoughtSettle.settled ? 0.5 : 1);
    tFizz = Math.max(0, tFizz - dt * 1.5);
    if (thoughtSettle.update(dt, qLocal) && !tSettledShown) {
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
    c.grounded = true; c.gk = c.gk || 0; c.glowAge = brightOK(elapsed) ? 0 : 0.3;
    groundedCards++;
    c.restLen = c.rope.seg * 0.86;
    mallow?.react?.('comfort');
    ctx.sound('glass', { note: (c.i % 6) + 2, intensity: 0.4 });
    ctx.haptic('light');
    for (let k = 0; k < 10; k++) fallers.spawn(c.x + (R() - 0.5) * c.w, c.y + (R() - 0.5) * c.h, (R() - 0.5) * 30, 6 + R() * 20, 1.4 + R(), 2 + R() * 2.5, (R() * 3) | 0, 0.85);
  }
  function ungroundCard(c) { c.grounded = false; groundedCards = Math.max(0, groundedCards - 1); c.restLen = c.rope.seg / 0.86; }

  function updateCards(dt, now) {
    const gust = reduced() ? 0 : (Q * 26 + 6) * (Math.sin(now * 0.7) * 0.6 + Math.sin(now * 1.9 + 1) * 0.4);
    for (const c of cards) {
      const r = c.rope;
      r.seg = lerp(r.seg, c.restLen, 1 - Math.exp(-dt * 2));
      // the storm's wind pushes charged cards about; grounded ones hang still
      const wind = (c.grounded ? 0.25 : 1) * gust * (0.6 + 0.4 * Math.sin(c.ph + now * 0.5));
      r.px[ROPE_N - 1] -= wind * dt * dt * 3;
      if (dt > 0) r.update(Math.min(dt, 1 / 30), c.ax, c.ay);
      const ex = r.x[ROPE_N - 1], ey = r.y[ROPE_N - 1], bx = r.x[ROPE_N - 2], by = r.y[ROPE_N - 2];
      const ang = Math.atan2(ex - bx, ey - by);
      const wob = reduced() ? 0 : c.wobble.update(dt);
      c.rot = lerp(c.rot, clamp(-ang * 0.8, -0.5, 0.5) + wob * 0.03, 1 - Math.exp(-dt * 8));
      if (c.grounded) c.rot *= Math.exp(-dt * 2);
      c.x = ex + Math.sin(c.rot) * c.h * 0.5; c.y = ey + Math.cos(c.rot) * c.h * 0.5;
      c.gk = c.grounded ? Math.min(1, c.gk + dt / 0.8) : Math.max(0, c.gk - dt / 0.5);
      if (c.glowAge >= 0) { c.glowAge += dt; if (c.glowAge > 2.4) c.glowAge = -1; }
      c.touched = Math.max(0, c.touched - dt * 2);
    }
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
    // charge → a tiny RGBA image → upscaled twice with smoothing = soft plasma
    const d = fieldData.data, n = field.n, cols = field.cols;
    for (let k = 0; k < n; k++) {
      const q = field.q[k];
      const o = k * 4;
      if (q < 0.02) { d[o + 3] = 0; continue; }
      const i = k % cols, j = (k / cols) | 0;
      const sh = rm ? 1 : 0.8 + 0.2 * Math.sin(now * phase[k * 2 + 1] + phase[k * 2]);
      const hue = 0.5 + 0.5 * Math.sin(i * 0.55 + j * 0.37 + now * 0.25 + phase[k * 2] * 0.3);
      const a = Math.pow(smoothstep(0.02, 1.25, q), 0.85) * sh;
      const w = clamp((q - 0.95) / 0.55) * 0.55;   // white-hot when crowded with charge
      // cyan (62,232,255) ↔ magenta (255,61,242), through violet
      let r = 62 + (255 - 62) * hue, gg = 232 + (61 - 232) * hue, b = 255 + (242 - 255) * hue;
      const mid = 1 - Math.abs(hue - 0.5) * 2;      // violet dip in the middle
      r -= mid * 70; gg -= mid * 60;
      d[o] = r + (255 - r) * w; d[o + 1] = gg + (255 - gg) * w; d[o + 2] = b + (255 - b) * w;
      d[o + 3] = Math.round(255 * clamp(a * 0.82));
    }
    fieldG.putImageData(fieldData, 0, 0);
    midG.globalCompositeOperation = 'copy';
    midG.drawImage(fieldC, 0, 0, midC.width, midC.height);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.78 * (ctx.lowStim ? 0.6 : 1);
    g.imageSmoothingEnabled = true;
    // drawn a touch larger than the grid so cell centres line up and edges feather out
    g.drawImage(midC, field.x - field.cw * 0.5, field.y - field.ch * 0.5, field.w + field.cw, field.h + field.ch);
    g.restore();
  }

  function drawStatic(g, now, rm) {
    // crisp crackle: tiny bright motes jumping inside the most charged cells
    if (ctx.lowStim) return;
    const tick = rm ? 0 : Math.floor(now * 12);
    g.globalCompositeOperation = 'lighter';
    let count = 0;
    for (let k = 0; k < field.n && count < 70; k++) {
      const q = field.q[k];
      if (q < 0.62) continue;
      const h = ((k * 2654435761 + tick * 40503) >>> 0) / 4294967296;
      if (h > (q - 0.55) * 0.9) continue;
      count++;
      const i = k % field.cols, j = (k / field.cols) | 0;
      const h2 = ((k * 1597334677 + tick * 3812015801) >>> 0) / 4294967296;
      const x = field.cx(i) + (h - 0.5) * field.cw * 1.6, y = field.cy(j) + (h2 - 0.5) * field.ch * 1.6;
      const s = 1.2 + q * 1.6;
      g.globalAlpha = clamp(0.35 + 0.4 * (q - 0.6));
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

  function drawCard(g, c, now, rm) {
    const qk = c.q;
    const charged = 1 - c.gk;
    // rope: a flickering charged thread, warm gold once grounded
    g.save();
    g.lineCap = 'round';
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = c.gk > 0.5 ? C.gold : C.cyan;
    g.globalAlpha = 0.18 + 0.25 * (c.gk > 0.5 ? c.gk : qk * (rm ? 1 : 0.7 + 0.3 * Math.sin(now * 9 + c.ph)));
    g.lineWidth = 3; c.rope.path(g); g.stroke();
    g.globalAlpha = 0.75; g.lineWidth = 1; g.strokeStyle = c.gk > 0.5 ? '#ffe9bf' : '#cdf8ff'; c.rope.path(g); g.stroke();
    g.restore();
    // halo behind: cyan/magenta charge, or warm gold when grounded
    g.save();
    g.globalCompositeOperation = 'lighter';
    const hr = Math.max(c.w, c.h) * 0.95;
    if (charged > 0.01) { g.globalAlpha = 0.22 * qk * charged; g.drawImage(c.i % 2 ? sprites.softMagenta : sprites.softCyan, c.x - hr, c.y - hr, hr * 2, hr * 2); }
    if (c.gk > 0.01) {
      const fl = c.glowAge >= 0 ? flashEnv(c.glowAge, 0.35, 0.2, 1.6) : 0;
      g.globalAlpha = 0.28 * c.gk + 0.35 * fl; g.drawImage(sprites.softGold, c.x - hr, c.y - hr, hr * 2, hr * 2);
    }
    g.restore();
    const skew = rm ? 0 : 0.02 * qk * charged * Math.sin(now * 7 + c.ph);
    photos.draw(g, c.i, c.x, c.y, c.size, { shape: 'card', rot: c.rot, tone: 'storm', toneMix: 0.8 * qk * charged, skewY: skew, shadow: false });
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
        const x = c.x + lx * cs - ly * sn, y = c.y + lx * sn + ly * cs, s = 5 + 5 * qk;
        g.globalAlpha = 0.55 * qk * charged;
        g.drawImage(e % 2 ? sprites.glintM : sprites.glintC, x - s, y - s, s * 2, s * 2);
      }
      g.restore();
    }
  }

  function drawThought(g, now, rm) {
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
      try { thought.draw(g, x, y, tScale, { tension: tTension, charge: qLocal, calm: thoughtSettle.settled ? 1 : 1 - qLocal, fizz: tFizz, reduced: rm, radius: tR, now }); } catch (e) { /* placeholder only */ }
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
    // the fingertip itself: a warm point of light that brightens while it drinks
    const r = 16 + 14 * L.drink;
    g.globalAlpha = 0.45 + 0.4 * L.drink;
    g.drawImage(sprites.gold, f.x - r, f.y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  }

  function drawCrackleTrail(g, f, now, rm) {
    const tr = f.trail;
    if (tr.n < 2) return;
    const life = 0.28;
    const jt = rm ? 0 : Math.floor(now * 20);
    for (let pass = 0; pass < 3; pass++) {
      const off = pass === 0 ? -1.6 : pass === 1 ? 1.6 : 0;
      g.strokeStyle = pass === 0 ? C.cyan : pass === 1 ? C.magenta : C.white;
      g.lineWidth = pass === 2 ? 1.1 : 2.2;
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
    for (const c of cards) drawCard(g, c, now, rm);
    drawThought(g, now, rm);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round'; g.lineJoin = 'round';
    // arcs
    for (const a of arcs) {
      if (!a.on) continue;
      const e = Math.sin((a.age / a.ttl) * Math.PI) * (a.bright ? 1 : 0.35);
      for (let pass = 0; pass < 3; pass++) {
        g.strokeStyle = pass === 2 ? '#f2feff' : a.colour; g.globalAlpha = (pass === 0 ? 0.08 : pass === 1 ? 0.38 : 0.85) * e; g.lineWidth = pass === 0 ? 7 : pass === 1 ? 2.4 : 1;
        g.beginPath(); g.moveTo(a.pts[0], a.pts[1]);
        for (let i = 2; i < a.n; i += 2) g.lineTo(a.pts[i], a.pts[i + 1]);
        g.stroke();
      }
    }
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
    }
    motes.draw(g, sprites.moteList, 1, 0.08);
    sparks.draw(g, sprites.sparkList, 1, 0.02);
    rings.draw(g);
    // ghost finger hint: a slow gold stroke drawn by a translucent fingertip (visual only)
    if (hint.age >= 0) {
      const head = easeOut(clamp(hint.age / 2.6)), fade = Math.sin(clamp(hint.age / 3.4) * Math.PI);
      const len = U * 0.42;
      const hx = hint.x0 + len * head, hy = hint.y0 - Math.sin(head * Math.PI) * 18;
      g.strokeStyle = C.gold; g.globalAlpha = 0.35 * fade; g.lineWidth = 3;
      g.beginPath();
      for (let s = 0; s <= 24; s++) { const u = (s / 24) * head; const x = hint.x0 + len * u, y = hint.y0 - Math.sin(u * Math.PI) * 18; s ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
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
      const mix = { frustrated: 0.45 * (1 - pp) * (0.5 + 0.5 * qn), excited: 0.2 * qn * (1 - pp), calm: 0.12 + 0.88 * pp, curious: 0.15 * (1 - pp) };
      const key = Object.values(mix).map((v) => Math.round(v * 10)).join(',');
      if (key !== emoKey) { emoKey = key; emoAt = now; try { mallow.setEmotion?.(mix, 0.55 + 0.3 * (1 - pp), { quiet: true }); } catch { /* optional */ } }
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
      if (intro && !from) ctx.say(intro, { who: 'glitzi', kind: 'dialogue' });
    },
    frame,
    pointer,
    get metrics() {
      const f0 = fingers.find((f) => f.on);
      return { speedU: f0 ? f0.speed / U : 0, charge: Q, calm: 1 - clamp(Q), light: field?.light ?? 0, progress: p, stillSec: f0 ? f0.still : 0, fastPx: pace.fastPx, slowRun: slowingD.slowRun, armed: slowingD.armed, groundedCards, cards: cards.length, thoughtCharge: tCharge, thoughtSettled: thoughtSettle.settled, lines: lines.filter((l) => l.on).length, drainRate };
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
    setEmotion() {},
    setThought(h) { thought = h; },
    avoid() {
      const out = [{ x: tSpring.x - tR * 1.6, y: tSpring.y - tR * 1.4, w: tR * 3.2, h: tR * 3.6, kind: 'thought' }];
      for (const f of fingers) if (f.on) out.push({ x: f.x - 60, y: f.y - 60, w: 120, h: 120, kind: 'finger' });
      return out;
    },
    serialize() {
      return {
        v: 1, seed: ctx.seed, progress: Math.round((complete ? 1 : p) * 1000) / 1000, complete,
        field: field ? field.snapshot() : null, discoveries: [...discovered],
        photoState: cards.map((c) => ({ i: c.i, grounded: c.grounded, q: Math.round(c.q * 100) / 100 })),
        thought: { q: Math.round(tCharge * 100) / 100, settled: thoughtSettle.settled }, elapsed: Math.round(elapsed),
      };
    },
    restore(s) {
      if (!s || s.v !== 1) return false;
      if (!field) layout();
      if (s.field) field.restore(s.field);
      for (const id of s.discoveries || []) { discovered.add(id); if (id === 'slowing') slowingD.markFired(); if (id === 'stillness') stillD.markFired(); }
      for (const ps of s.photoState || []) { const c = cards.find((q) => q.i === ps.i); if (c) { c.q = clamp(ps.q ?? c.q); if (ps.grounded && !c.grounded) { c.grounded = true; c.gk = 1; groundedCards++; c.restLen = c.rope.seg * 0.86; } } }
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
    debug: { get field() { return field; }, get cards() { return cards; }, get realm() { return realm; }, get lines() { return lines; }, get fingers() { return fingers; }, thoughtPos: () => ({ x: tSpring.x, y: tSpring.y, r: tR }) },
  };
}
