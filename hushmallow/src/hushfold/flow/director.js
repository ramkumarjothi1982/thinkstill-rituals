// The Hushflow director: one continuous movie of worlds.
//
// Owns the frame loop of the Hushflow (it runs inside the Mallow rig's shared
// loop, addTicker — one requestAnimationFrame for rigs, MallowTouch and worlds;
// a watchdog switches to its own requestAnimationFrame if that loop ever stops),
// the two compositor canvases (#world back, #fx-layer front), the worlds'
// lifecycles and the melt between them. It never shows a black frame: the back
// canvas always holds a world or the next world's palette, a melt only starts
// once the incoming world is prepared (its heavy build runs in idle time), and
// pause keeps the last frame under a soft veil.
//
//   const flow = createHushflow({ app, worldEl, fxEl, mallow, thoughts, subtitles, photos, words, prefs, store, safeRect });
//   await flow.start({ emotion: 'angry', intention: 'calm', intensity: 0.7 });
//   router.setWorld((e) => flow.pointer(e));     // routed { type, id, x, y, t(ms), pointerType }
//   flow.on('discovery', ({ id, skillId, evidence }) => …);
//   subtitles bounds ← flow.subtitleBand()       // the slot every world keeps clear
//
// Input contract. The shell's router claims the hero Mallow first and hands
// every other pointer event to flow.pointer(e). The director measures speed
// itself (velocity.js: path length over ≥ 60 ms, scalar EMA — a scribble reads
// as fast; any speed the router sends is ignored) and gives worlds
// { type, id, x, y, t, vx, vy, speed, speedU, pointerType, count, idle }. When a
// finger rests without events, worlds get an `idle: true` 'move' each frame with
// the speed decaying to 0, so a stopped finger becomes still. While a world owns
// the Thought Mallow, touches on it must reach flow.pointer too (the world owns
// its position and physics and forwards to thought.pointer itself) — W3's router
// sends Thought Mallow hits to its thought layer first, so it needs to route
// them here while a world is playing.
//
// Layout contract. flow.subtitleBand() is a full-width band straight under the
// top controls (clamp(0.17·H, 118, 156) px, as the shell reserves); ctx.safe is
// the shell's free area minus that band. Worlds keep every object, hint and
// touch target out of the band, and flow.avoid() lists what lines must not cover.
//
// Thoughts (HUSHFOLD §3): `thoughts` is W2's ThoughtLayer (anything with `primary`,
// or a `list` array / list() function) or a plain array of handles; `thought` (one
// handle) is accepted too and wins as the primary. Worlds get ctx.thought — the
// primary, the one the person's words ride on — and ctx.thoughts, all of them (for
// worlds that host several, e.g. overthinking siblings); both are read live, so a
// layer that gains a thought later is seen at once. setThought(h) / setThoughts(ts)
// swap them while a world plays (the world hears setThought / setThoughts). A handle:
//   { token, text, x, y, z, scale, state:{tension, charge, calm, distance},
//     react(kind), soften(k), settle(k), hitTest(x, y), pointer(e), draw?(g, x, y, scale, o) }.
// The world writes x, y, scale and state every frame. If the handle has draw(),
// the world draws it into its front layer (the 2D placeholder); without draw()
// the world only positions it and W2's ThoughtLayer renders it on its own layer.
// keepOut: () => [client rects] (optional): what the person's thought keeps out of besides the hero
// (the shell's open garden offer and card); worlds read it as ctx.keepOut() and move the thought aside, eased.
//
// Shell contract (all additive; every older call keeps working):
//   start({ …, gentle })    a gentle session (after care) plays only calm worlds — but start({ resume: true }) picks
//                           up the saved world itself, gently (the shell offers it only when the visit allows);
//                           setGentle(b) switches it for this session only (never saved). state.gentle, ctx.gentle.
//   pause({ reason })       reason 'safety' (care in a world, owner P4): Resume stays allowed, no Memory Garden
//                           offers while it holds, a queued Drift on is dropped. Asked for while the first world
//                           still loads, the world enters paused (never steps, no lines, no ambience) and
//                           'world' { paused: true, reason } is followed by 'pause' { reason }.
//   finish({ reason })      also during loading: start() then resolves null and the phase stays 'finished';
//                           no offers after it (owner P3: crisis → finish({ reason: 'safety' }), no Resume).
//   next({ worldId })       Drift on, or into a chosen world (a melt, never a hard cut). On a paused director it
//                           resumes and melts, unless held by safety (then false). state.canNext is true exactly
//                           when next() would melt (the panel's Drift on). Nothing follows a final world (owner P1:
//                           the orchard), and a gentle session never drifts back into a world it already played.
//   stay(on = true)         stay(false) un-stays without melting.
//   hold(key, on)           while any key is held (an open offer, …) the world never melts by itself and
//                           safeForUpdate() is false; the person's own Drift on still goes.
//   'melt' { from, to, k: 0 | 1, mallow }     k:0 when it begins (prefetch the host's art), k:1 when done
//   'host' { from, to, mallow, k }            once per melt, halfway (k ≈ 0.5): swap the hero Mallow (owner P2)
//   state { …, title, gentle, canNext, reason, held, hushed }

import { createCompositor } from './compositor.js';
import { createVelocity } from './velocity.js';
import { addTicker, removeTicker } from '../../mallows/rig.js';
import { registry as defaultRegistry, fitScore, hash01 } from './registry.js';
import { saveProgress, loadProgress, clearProgress, favouriteWorlds, toggleFavouriteWorld } from '../../engine/flow-store.js';

const MELT_SEC = 5;               // noise melt
const MELT_REDUCED_SEC = 1.6;     // reduced motion: straight crossfade
const INPUT_SWITCH_K = 0.4;       // new touches go to the incoming world from here
const AUTO_IDLE_SEC = 2;          // a completed world melts only after this much stillness…
const AUTOFLOW_REST_SEC = 4;      // …and with Auto-flow, after this much rest
const PREPARE_AT = 0.7;           // progress at which the next world is built in idle time
const FADE_IN_SEC = 0.7;          // cold start: first world over its palette
const ROTATION_KEY = 'hushflow.rotation';   // which worlds were played (ids only): history + rotation bags
const VEIL = 0.2;
const MAX_POINTERS = 4;
const NOOP_HOLD = Object.freeze({ update() {}, stop() {}, active: false });
const NO_RECTS = Object.freeze([]);
const WATCHDOG_MS = 250;          // no shared-loop tick for this long (visible, playing) → our own rAF
// quality governor: step down after SLOW_SEC of frames over SLOW_MS; step back up after
// FAST_SEC of frames under FAST_MS (frames during melts and world builds are not counted)
const SLOW_MS = 24, SLOW_SEC = 3, FAST_MS = 14, FAST_SEC = 9;

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const inOutSine = (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const idle = (fn, timeout = 1500) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 60));

function rng(seed) {
  let a = seed >>> 0 || 1;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  return r;
}

/** A key/value store over memory (when none is given). */
function memoryStore() { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; }

/** All thought handles of a ThoughtLayer-like source or an array (the explicit primary first). */
export function thoughtList(src, one = null) {
  let l = null;
  if (Array.isArray(src)) l = src;
  else if (src && typeof src === 'object') {
    const v = typeof src.list === 'function' ? src.list() : src.list ?? src.thoughts;
    l = Array.isArray(v) ? v : src.primary ? [src.primary] : null;
  }
  const out = one ? [one] : [];
  if (l) for (const h of l) if (h && h !== one) out.push(h);
  return out;
}
/** The primary thought: the explicit one, else the layer's `primary`, else the first. */
export function primaryThought(src, one = null) {
  if (one) return one;
  if (!src || typeof src !== 'object') return null;
  if (Array.isArray(src)) { for (const h of src) if (h) return h; return null; }
  if (src.primary) return src.primary;
  return thoughtList(src)[0] ?? null;
}

export function createHushflow(opts = {}) {
  const {
    app = null, worldEl, fxEl, mallow = null, subtitles = null, photos = null, words = null, prefs = null,
    registry = defaultRegistry, safeRect = null, quality = 'auto', debug = false,
  } = opts;
  // one frame loop: the Mallow rig's shared loop (rigs first, then the world sees this frame's face);
  // { ticker: false } runs the director's own requestAnimationFrame instead (standalone pages)
  const ticker = opts.ticker === false ? null : (opts.ticker?.add ? opts.ticker : { add: addTicker, remove: removeTicker });
  let thoughtOne = opts.thought ?? null;          // an explicit primary handle
  let thoughtsSrc = opts.thoughts ?? null;        // a ThoughtLayer or an array of handles
  // what the person's thought keeps out of besides the hero (the shell's open garden offer and its card): client rects
  const keepOutFn = typeof opts.keepOut === 'function' ? opts.keepOut : null;
  const kv = opts.store && typeof opts.store.get === 'function' ? opts.store : memoryStore();
  const audio = opts.audio ?? app?.audio ?? null;
  const hapticFn = opts.haptic ?? app?.haptic ?? null;
  const reducedMotion = () => (typeof opts.reducedMotion === 'boolean' ? opts.reducedMotion : prefs?.reducedMotion?.() ?? matchMediaReduced());
  const lowStim = () => !!(opts.lowStimulation ?? prefs?.get?.('lowStim'));

  // ---------------------------------------------------------- canvases --
  const backCanvas = document.createElement('canvas');
  backCanvas.className = 'hf-back';
  backCanvas.setAttribute('aria-hidden', 'true');
  // both canvases stay invisible until the first world frame is ready, then fade in over
  // whatever the shell shows (its realm): no palette flash, never a black frame
  Object.assign(backCanvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none', zIndex: '1', opacity: '0' });
  const frontCanvas = document.createElement('canvas');
  frontCanvas.className = 'hf-front';
  frontCanvas.setAttribute('aria-hidden', 'true');
  Object.assign(frontCanvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none', opacity: '0' });
  worldEl.append(backCanvas);
  fxEl.append(frontCanvas);
  const comp = createCompositor({ backCanvas, frontCanvas });

  // ----------------------------------------------------------- state --
  let W = 0, H = 0, U = 0, dev = 1, qLevel = 0;
  const dprs = () => {
    const b = [Math.min(dev, 1.5), Math.min(dev, 1.25), 1, 1][qLevel];
    const f = [Math.min(dev, 2), Math.min(dev, 1.75), Math.min(dev, 1.5), 1][qLevel];
    return { back: b, front: f, density: qLevel >= 3 ? 0.7 : 1 };
  };
  let phase = 'idle';               // idle | loading | playing | melting | finished
  let paused = false, destroyed = false, hidden = false, frozen = false;
  let cur = null, inc = null;       // world instances
  let melt = null;                  // { k, dur, from, to }
  let fadeIn = 1, revealed = false;
  let t = 0, lastTs = 0, raf = 0;
  // loop: 'ticker' (the rig's shared loop), 'raf' (our own: standalone, or the watchdog's fallback) or 'stopped'
  let loopMode = 'stopped', tickerOn = false, lastTickAt = 0, watchdog = 0, probe = 0;
  let lastInputAt = -Infinity;
  let wantNext = false, autoFlow = false;
  let discoveryPending = 0;
  let choiceOpen = null;            // the world whose 'Stay, or drift on?' is on screen
  let pauseReason = null;           // why it is paused: 'safety', or null (the person, a sheet)
  let pausePending = null;          // pause() asked for before the first world entered: true | reason
  let hushed = false;               // finished: no Memory Garden offer may follow
  let startToken = 0;               // start() and finish() bump it: a start() that lost the race resolves null
  let loadingId = null;             // the first world while it loads
  let gentleWant = false;           // setGentle() before start()
  const holds = new Set();          // hold(key, true): nothing melts by itself while any is held
  let saveClock = 0, progressClock = 0, lastProgress = -1;
  let frameEma = 16.7, slowSec = 0, workEma = 8, fastSec = 0, govQuiet = 0, upAt = -Infinity, upBackoff = 1, builtAt = -Infinity;
  let session = null;               // { emotion, intention, intensity, input, seed, discoveries:Set, offered:Set }
  const listeners = new Map();
  const pointers = new Map();       // id → pointer state (velocity) + owner instance
  const pool = [];                  // recycled pointer states
  const hapticLast = new Map();

  // Persistence (ids and numbers only, never words or photos):
  //   progress   → W3's flow-store (saveProgress / loadProgress: sanitised, versioned, 7 days)
  //   favourites → flow-store (toggleFavouriteWorld / favouriteWorlds)
  //   rotation   → this director's own small record (history of world ids + selection bags)
  // All of it only while prefs.saveHistory is on; Auto-flow lives in the shell's prefs.
  const saveOn = () => prefs?.get?.('saveHistory') !== false;
  const rotSaved = (() => { try { const r = kv.get(ROTATION_KEY, null); return r && r.v === 1 ? r : null; } catch { return null; } })();
  const persist = {
    v: 1, sessionCount: Number.isFinite(rotSaved?.sessionCount) ? rotSaved.sessionCount : 0,
    history: Array.isArray(rotSaved?.history) ? rotSaved.history.filter((x) => typeof x === 'string').slice(-12) : [],
    bags: rotSaved?.bags && typeof rotSaved.bags === 'object' ? rotSaved.bags : {},
  };
  const favourites = () => { try { return favouriteWorlds(kv); } catch { return []; } };

  /** The first world frame is on the canvases: fade them in (CSS) over the shell's own backdrop. */
  function reveal() {
    if (revealed) return;
    revealed = true;
    fadeIn = 1;
    const ms = reducedMotion() ? 350 : Math.round(FADE_IN_SEC * 1000);
    for (const c of [backCanvas, frontCanvas]) { c.style.transition = `opacity ${ms}ms ease`; c.style.opacity = '1'; }
  }
  function emit(ev, data) { for (const fn of listeners.get(ev) || []) { try { fn(data); } catch (e) { console.warn('[hushflow]', ev, e); } } }
  function writeStore() { if (!saveOn()) return; try { kv.set(ROTATION_KEY, persist); } catch (e) { console.warn('[hushflow] save failed', e); } }

  function measure() {
    const w = Math.max(1, Math.round(worldEl.clientWidth || innerWidth || 390));
    const h = Math.max(1, Math.round(worldEl.clientHeight || innerHeight || 844));
    dev = (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) ? devicePixelRatio : 1;
    const changed = w !== W || h !== H;
    W = w; H = h; U = Math.min(W, H);
    return changed;
  }
  function applySize() {
    const d = dprs();
    comp.resize(W, H, d);
    for (const inst of [cur, inc]) if (inst) resizeInstance(inst);
    redrawNow();
  }

  /** Resizing a canvas clears it: repaint at once (before the browser paints), so a rotation never shows black. */
  function redrawNow() {
    if (!cur || phase === 'loading') { comp.drawFallback(); comp.clearFront(); return; }
    try { cur.world.frame(0, t); if (melt) melt.to.world.frame(0, t); } catch { /* a world mid-build */ }
    if (melt) comp.melt(layersOf(melt.from), layersOf(melt.to), melt.e, { horizonY: melt.horizonY, t, reduced: reducedMotion() });
    else { const L = layersOf(cur); comp.single(L.back, L.front, inOutSine(fadeIn)); }
    if (paused) comp.veil(VEIL);
  }

  // ------------------------------------------------------ world ctx --
  function defaultSafe() {
    const top = 76;
    const r = mallow?.rect?.() || mallow?.bodyRect?.();
    const bottom = r ? Math.max(top + 160, r.top - 14) : H * 0.62;
    return { x: 20, y: top, w: W - 40, h: bottom - top };
  }
  /** The shell's free area: under the top controls, above the hero Mallow (client px). */
  const shellSafe = () => safeRect?.() || defaultSafe();
  /**
   * The subtitle band every world keeps clear: the full width, straight under the top
   * controls, clamp(0.17·H, 118, 156) px tall — the same band the Hushfold shell
   * reserves above its Mallow (opts.subtitleBand overrides the height). Lines,
   * discoveries and choices always have this slot; worlds never put a postcard, a
   * thought, a hint or a touch target in it.
   */
  function bandRect() {
    const s = shellSafe();
    const o = typeof opts.subtitleBand === 'function' ? opts.subtitleBand({ W, H }) : opts.subtitleBand;
    const h = Number.isFinite(o) && o > 0 ? o : clamp(Math.round(H * 0.17), 118, 156);
    return { x: 0, y: s.y, w: W, h };
  }
  /** ctx.safe: the gameplay rect — the shell's free area minus the subtitle band. */
  function playSafe() {
    const s = shellSafe(), b = bandRect();
    const y = Math.max(s.y, b.y + b.h + 6);
    return { x: s.x, y, w: s.w, h: Math.max(40, s.y + s.h - y) };
  }

  function makeLayer(dpr, alpha) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr));
    const g = c.getContext('2d', { alpha });
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, g, dpr };
  }

  let fontPx = (px, weight = 600) => `${Math.round(weight / 100) * 100} ${Math.round(px * 10) / 10}px "HM Nunito Sans", "HM Nunito Sans Fallback", ui-rounded, system-ui, sans-serif`;
  let fontsReady = () => Promise.resolve(false);
  import('../../ui/type.js').then((m) => { if (m.canvasFontPx) fontPx = m.canvasFontPx; if (m.fontsReady) fontsReady = m.fontsReady; }).catch(() => {});

  function makeCtx(entry, seed) {
    const d = dprs();
    const front = makeLayer(d.front, true);
    let back = null;
    const r = rng(seed);
    const inst = { id: entry.id, entry, seed, world: null, ctx: null, prepared: false, preparing: null, entered: false, completeSeen: false, staying: false, front };
    const ctx = {
      id: entry.id, entry, seed, rand: r,
      get W() { return W; }, get H() { return H; }, get U() { return U; },
      get dpr() { return inst.front.dpr; }, get dprBack() { return dprs().back; }, get density() { return dprs().density; },
      get front() { return inst.front; },
      /** An opaque back layer owned by the director (worlds with a realm use the realm's own canvas instead). */
      get back() { if (!back) { back = makeLayer(dprs().back, false); inst.back = back; } return back; },
      /** The gameplay rect (excludes the top controls, the subtitle band and the Mallow). */
      get safe() { return playSafe(); },
      /** The reserved subtitle band (keep it clear). */
      get band() { return bandRect(); },
      /**
       * The stage's free width from the left edge (client px): the shell's safe rect with its margins — left of the
       * shell's side panel while that is open, else W. Worlds keep what they place (postcards, bubbles, the words)
       * inside it, so nothing is planned under the panel.
       */
      get freeW() { const s = shellSafe(); return Number.isFinite(s?.x) && Number.isFinite(s?.w) ? clamp(Math.round(2 * s.x + s.w), Math.min(W, 240), W) : W; },
      mallow, words, photos,
      /** The primary Thought Mallow (the person's words), or null. */
      get thought() { return primaryThought(thoughtsSrc, thoughtOne); },
      /** Every Thought Mallow (primary first) — for worlds that can host several. */
      get thoughts() { return thoughtList(thoughtsSrc, thoughtOne); },
      /** W2's ThoughtLayer itself, when one was given (it renders the thoughts on its own layer). */
      get thoughtLayer() { return thoughtsSrc && !Array.isArray(thoughtsSrc) ? thoughtsSrc : null; },
      /** Client rects the person's thought keeps out of besides the hero (the shell's open garden offer and card); [] if none. */
      keepOut() { if (!keepOutFn) return NO_RECTS; try { const r = keepOutFn(); return Array.isArray(r) ? r : NO_RECTS; } catch { return NO_RECTS; } },
      get reduced() { return reducedMotion(); }, get lowStim() { return lowStim(); },
      get emotion() { return session?.emotion || null; }, get intention() { return session?.intention || null; },
      get intensity() { return session?.intensity ?? 0.6; }, get input() { return session?.input || null; },
      /** A gentle session (after something heavy was shared): calm worlds only, no Memory Garden offers. */
      get gentle() { return !!session?.gentle; },
      now: () => t,
      font: (px, weight) => fontPx(px, weight),
      fontsReady: (groups, ms) => fontsReady(groups, ms),
      // (only a world on stage speaks: one melting away — its intro, a line on a timer — or one gone, or one prepared but
      // not yet melting in, says nothing; its host is leaving or not there, and its line would come under its name over
      // the next world's host)
      say(lines, o = {}) { if (!subtitles?.say || paused || phase === 'finished' || !speaks(inst)) return Promise.resolve(); return Promise.resolve(subtitles.say(lines, { who: entry.mallow?.id, world: entry.id, ...o })).catch(() => {}); },
      discover: (id, evidence) => discover(inst, id, evidence),
      /**
       * While this world melts in: how far the melt has reached at a client point (0 = still the
       * outgoing world there, 1 = this world), from the last composited frame. 1 when not melting in.
       * (W4b: postcards turn into bubbles exactly as the melt reaches them.)
       */
      meltMask: (x, y) => (melt && melt.to === inst ? (reducedMotion() ? melt.e : comp.maskAt(x, y)) : 1),
      /** A moment of progress worth keeping (e.g. { kind:'photo', i }): emitted as 'checkpoint', and saved. */
      checkpoint: (kind, data = {}) => { if (inst !== cur && inst !== inc) return; emit('checkpoint', { worldId: entry.id, kind, ...data }); save(); },
      sound: (name, o) => { try { return audio?.fx?.(name, o); } catch { return false; } },
      hold: (name, o) => { try { return audio?.hold?.(name, o) || NOOP_HOLD; } catch { return NOOP_HOLD; } },
      ambience: (id, o) => { try { audio?.ambience?.(id, o); } catch { /* decoration */ } },
      ambienceMood: (m) => { try { audio?.setAmbienceMood?.(m); } catch { /* decoration */ } },
      haptic: (kind) => haptic(kind),
      log: debug ? (...a) => console.log(`[${entry.id}]`, ...a) : () => {},
    };
    inst.ctx = ctx;
    return inst;
  }

  function tellThoughts() {
    const one = primaryThought(thoughtsSrc, thoughtOne), all = thoughtList(thoughtsSrc, thoughtOne);
    for (const inst of [cur, inc]) {
      if (!inst?.world) continue;
      try { inst.world.setThought?.(one); inst.world.setThoughts?.(all); } catch (e) { console.warn('[hushflow] setThought', e); }
    }
  }

  function haptic(kind) {
    const gap = kind === 'tick' ? 100 : 250;
    const n = nowMs();
    if (n - (hapticLast.get(kind) ?? -1e9) < gap) return;
    hapticLast.set(kind, n);
    try { hapticFn?.(kind); } catch { /* optional */ }
  }

  function resizeInstance(inst) {
    const d = dprs();
    const f = inst.front;
    f.canvas.width = Math.round(W * d.front); f.canvas.height = Math.round(H * d.front);
    f.dpr = d.front; f.g.setTransform(d.front, 0, 0, d.front, 0, 0);
    if (inst.back) { const b = inst.back; b.canvas.width = Math.round(W * d.back); b.canvas.height = Math.round(H * d.back); b.dpr = d.back; b.g.setTransform(d.back, 0, 0, d.back, 0, 0); }
    try { inst.world?.resize?.(W, H, { dpr: d.front, dprBack: d.back, density: d.density }); } catch (e) { console.warn('[hushflow] resize', e); }
  }

  const layersOf = (inst) => ({ back: inst?.world?.backCanvas || inst?.back?.canvas || null, front: inst?.front?.canvas || null });

  async function instantiate(id, seed) {
    const entry = registry.get(id);
    if (!entry) throw new Error(`No world ${id}`);
    const mod = await registry.load(id);
    if (destroyed) return null;
    const inst = makeCtx(entry, seed);
    inst.world = mod.create(inst.ctx);
    return inst;
  }

  /** Build the world's heavy layers in idle time (idempotent). */
  function prepare(inst) {
    if (!inst) return Promise.resolve(null);
    if (inst.prepared) return Promise.resolve(inst);
    if (!inst.preparing) {
      inst.preparing = new Promise((resolve, reject) => {
        idle(async () => {
          try { await inst.world.prepare?.(); inst.prepared = true; builtAt = t; resolve(inst); } catch (e) { builtAt = t; reject(e); }
        });
      });
    }
    return inst.preparing;
  }

  function destroyInstance(inst) {
    if (!inst) return;
    try { inst.world?.destroy?.(); } catch (e) { console.warn('[hushflow] destroy', e); }
    for (const L of [inst.front, inst.back]) if (L) { try { L.canvas.width = L.canvas.height = 0; } catch { /* ignore */ } }
  }

  // --------------------------------------------------------- selection --
  const failed = new Set();   // worlds that failed to load or build this session: never picked again
  function pickNext(exclude = []) {
    const res = registry.select({
      current: cur?.id, emotion: session?.emotion, intention: session?.intention,
      history: persist.history, favourites: favourites(), bags: persist.bags,
      seed: session?.seed ?? 0, sessionCount: persist.sessionCount, exclude: [...exclude, ...failed, ...playedGently()],
      gentle: !!session?.gentle,
    });
    return res;
  }
  /**
   * A gentle session plays each calm world once: it never drifts back into one it already played (the ocean and the
   * cove would otherwise take turns for ever). With every calm world played, nothing follows: Stay as long as you
   * like, and Finish (as owner P1 decided for the ocean). A world the shell asks for by id (next({ worldId })) still goes.
   */
  function playedGently() { return session?.gentle ? session.sequence || [] : []; }
  /** Can the Hushflow drift from the current world into `id` (a chosen next world)? */
  function pickable(id) {
    if (!id || id === cur?.id || failed.has(id) || !registry.playable(id)) return false;
    return !session?.gentle || registry.get(id)?.calm === true;
  }
  /** A world could not be loaded or built: leave it out for the rest of the session (one 'error' per world). */
  function markFailed(id, kind, e) {
    if (failed.has(id)) return;
    failed.add(id);
    console.warn(`[hushflow] next world ${kind} failed`, id, e);
    emit('error', { kind, id, error: e });
  }
  /** History for 'never the last 3 played': a world counts once it was played (completed, left or melted from). */
  function recordPlayed(inst) {
    if (!inst || inst.recorded || !inst.entered) return;
    inst.recorded = true;
    persist.history = [...persist.history, inst.id].slice(-12);
    writeStore();
  }
  let nextChoice = null;   // { id, bags } (bags committed when the melt starts)
  /** What would follow now, without choosing it: the lab's forced next (never the current world), else the selector. */
  function peekNext() {
    const f = opts.forceNext;
    if (f && f !== cur?.id && registry.has(f) && !failed.has(f) && (!session?.gentle || registry.get(f)?.calm === true)) return { id: f, bags: persist.bags };
    const res = pickNext();
    return res.id ? res : null;
  }
  function chooseNext() { nextChoice = peekNext(); return nextChoice; }
  function nextAvailable() { return !!(nextChoice?.id || chooseNext()?.id); }

  /** Make sure the next world exists and is being prepared. */
  let staging = null;
  function stageNext() {
    if (inc || staging || !nextAvailable()) return staging || Promise.resolve(inc);
    const id = nextChoice.id;
    const job = (async () => {
      try {
        const seed = Math.floor(hash01(`${session.seed}|${persist.sessionCount}|${id}|${persist.history.length}`) * 2 ** 31);
        const created = await instantiate(id, seed);
        if (!created || destroyed) return null;
        // chosen otherwise meanwhile (next({worldId}), a gentle session, a finish): not this one
        if (staging !== job || nextChoice?.id !== id || phase === 'finished' || inc) { destroyInstance(created); return inc; }
        inc = created;
        resizeInstance(inc);
        prepare(inc).catch((e) => {
          markFailed(id, 'prepare', e);
          if (inc === created) { destroyInstance(inc); inc = null; if (nextChoice?.id === id) nextChoice = null; }
          if (wantNext && !nextAvailable()) wantNext = false;
        });
      } catch (e) {
        markFailed(id, 'load', e);
        if (nextChoice?.id === id) { nextChoice = pickNext(); if (!nextChoice?.id) nextChoice = null; }
        if (wantNext && !nextAvailable()) wantNext = false;
      } finally { if (staging === job) staging = null; }
      return inc;
    })();
    staging = job;
    return job;
  }
  /** The next world changed: drop a staged one that is not `keepId` (call only when the choice really changed). */
  function dropStaged(keepId = null) {
    if (inc && !melt && inc.id !== keepId) { destroyInstance(inc); inc = null; }
    staging = null;    // an import still in flight sees that it lost and throws its world away
  }

  // ------------------------------------------------------------ start --
  async function start({ emotion = null, intention = null, intensity = 0.6, input = null, worldId = null, resume = false, gentle = null } = {}) {
    if (destroyed) return null;
    // a finish() (or a newer start()) while this one awaits wins: this one then resolves null
    const token = ++startToken;
    finishInstances();
    hushed = false; pauseReason = null; paused = false;
    measure();
    applySize();
    let prev = null;
    if (resume) { try { prev = loadProgress(kv); } catch { prev = null; } }
    const resuming = !!(prev?.worldId && registry.playable(prev.worldId));
    const gentleOn = !!(gentle ?? gentleWant);
    let id = resuming ? prev.worldId : worldId;
    // a gentle session plays only calm worlds, whatever was asked for — except the saved world the person asked to pick
    // up (resume): after care or distress Resume stays theirs (owner P4), and the shell never offers a charged one after a
    // crisis, a death, a loss or harm done to the person (hushfold.js resumableNow, S.noResume). The session stays gentle:
    // calm worlds only from there, and no Memory Garden offers.
    if (id && gentleOn && registry.get(id)?.calm !== true && !resuming) id = null;
    // Restore only into the world that was saved. When a world other than the saved one is entered, it starts fresh
    // (its own seed, intro and progress; not complete): nothing of the save (state, seed, discoveries, offers,
    // sequence) carries into it, and 'world' says resumed:false.
    const restoring = resuming && id === prev.worldId;
    const pst = restoring && prev.state && typeof prev.state === 'object' ? prev.state : {};
    persist.sessionCount = (persist.sessionCount || 0) + 1;
    session = {
      // (the person's own feeling, intention and intensity carry over either way)
      emotion: resuming ? prev.emotion ?? emotion : emotion, intention: resuming ? prev.intention ?? intention : intention,
      intensity: resuming && Number.isFinite(prev.state?.i) ? prev.state.i : intensity, input,
      seed: restoring ? prev.seed : Math.floor(hash01(`hf|${persist.sessionCount}|${emotion}|${intention}`) * 2 ** 31),
      discoveries: new Set(restoring && Array.isArray(pst.d) ? pst.d : []), offered: new Set(restoring && Array.isArray(pst.o) ? pst.o : []),
      sequence: restoring && Array.isArray(prev.sequence) ? [...prev.sequence] : [],
      // (session only, never saved)
      gentle: gentleOn,
    };
    if (!id || !registry.playable(id)) {
      const pick = registry.select({ current: null, emotion: session.emotion, intention: session.intention, history: persist.history, favourites: favourites(), bags: persist.bags, seed: session.seed, sessionCount: persist.sessionCount, gentle: session.gentle });
      id = pick.id;
      if (pick.id) persist.bags = pick.bags;
    }
    // (no world to play: a pause asked for meanwhile has nothing to hold, and must not hold the next start())
    if (!id) { phase = 'idle'; pausePending = null; emit('error', { kind: 'none' }); return null; }
    const entry = registry.get(id);
    comp.setFallback(entry.palette || null);
    comp.drawFallback(); comp.clearFront();
    phase = 'loading'; fadeIn = 0; wantNext = false; nextChoice = null; loadingId = id;
    startLoop();
    const lost = () => destroyed || token !== startToken;
    try {
      const inst = await instantiate(id, session.seed);
      if (!inst) return null;
      if (lost()) { destroyInstance(inst); return null; }
      cur = inst;
      resizeInstance(cur);
      await prepare(cur);
      if (lost() || cur !== inst) {
        // finished (or started again) while it was being built: it never enters
        if (cur === inst) { destroyInstance(inst); cur = null; }
        return null;
      }
      loadingId = null;
      if (restoring && pst.w) { try { cur.world.restore?.(pst.w); } catch (e) { console.warn('[hushflow] restore failed', e); } }
      // paused while it loaded (care or crisis typed meanwhile): it enters held, under its veil — it never
      // steps, says nothing and plays no ambience until resume()
      const held = pausePending;
      pausePending = null;
      if (held) { paused = true; pauseReason = held === true ? null : held; }
      enterInstance(cur, null, null);
      phase = 'playing';
      if (!session.sequence.length || session.sequence[session.sequence.length - 1] !== id) session.sequence.push(id);
      writeStore();
      save();
      if (paused) {
        stopLoop();
        try { cur.world.pause?.(); } catch { /* ignore */ }
        comp.veil(VEIL);
        try { subtitles?.pause?.(); } catch { /* optional */ }
      }
      emit('world', { id, from: null, mallow: entry.mallow?.id, title: entry.title, resumed: !!restoring, paused, reason: paused ? pauseReason : null });
      if (paused && cur === inst && phase === 'playing') emit('pause', { worldId: id, reason: pauseReason });
      return cur;
    } catch (e) {
      if (lost()) return null;
      console.warn('[hushflow] world failed to start', e);
      // (a world that failed its build never frames)
      if (cur && !cur.entered) { destroyInstance(cur); cur = null; }
      // (nothing entered: a pause asked for while it loaded has nothing to hold, and the next start() must not enter
      // paused with that stale reason; nothing is loading any more either)
      phase = 'idle'; pausePending = null; loadingId = null;
      emit('error', { kind: 'start', id, error: e });
      return null;
    }
  }

  function enterInstance(inst, from, handoff) {
    if (inst.entered) return;
    inst.entered = true;
    inst.world.enter?.({ from, handoff });
    const amb = inst.entry.sound?.ambience;
    // (a world that enters paused starts its ambience on resume)
    if (amb) { if (paused) inst.ambPending = amb; else inst.ctx.ambience(amb, {}); }
    // the authored next world: start loading its code now (no build yet)
    for (const n of inst.entry.next || []) registry.prefetch?.(n);
  }

  // ------------------------------------------------------------- melt --
  /** Paused for safety (care in a world): nothing drifts on until resume() — unless the session is gentle (calm worlds only). */
  const safetyHeld = () => ((paused && pauseReason === 'safety') || pausePending === 'safety') && !session?.gentle;
  /** No Memory Garden offer now: after finish, in a gentle session, or while safety holds the world (owner P4). */
  const offersHushed = () => hushed || !!session?.gentle || (paused && pauseReason === 'safety') || pausePending === 'safety';
  /** Would next() melt now? (The panel's Drift on: false after the final world, owner P1.) Pure: chooses nothing. */
  function canNextNow() {
    if (destroyed || !cur || melt || phase !== 'playing' || safetyHeld()) return false;
    if (nextChoice?.id && pickable(nextChoice.id)) return true;
    return !!peekNext()?.id;
  }

  function canMelt() {
    if (!cur || melt || !inc?.prepared || paused || phase !== 'playing') return false;
    if (safetyHeld()) return false;
    // the person asked to drift on: that goes, whatever holds
    if (wantNext) return true;
    if (!cur.world.complete || cur.staying) return false;
    // never by itself while something holds (an open offer…), a discovery speaks or its line waits for a tap
    if (holds.size || discoveryPending > 0 || subtitles?.holding) return false;
    const rest = t - lastInputAt;
    return autoFlow && rest >= Math.max(AUTO_IDLE_SEC, AUTOFLOW_REST_SEC) && pointers.size === 0;
  }

  function beginMelt() {
    const from = cur, to = inc;
    if (nextChoice?.bags) persist.bags = nextChoice.bags;
    let handoff = null;
    try { handoff = from.world.handoff?.() || null; } catch (e) { console.warn('[hushflow] handoff', e); }
    enterInstance(to, from.id, handoff);
    // the 'Stay, or drift on?' question is answered by the melt itself
    if (choiceOpen === from) { choiceOpen = null; try { subtitles?.clear?.(); } catch { /* optional */ } }
    const dur = reducedMotion() ? MELT_REDUCED_SEC : MELT_SEC;
    melt = { k: 0, e: 0, dur, from, to, horizonY: handoff?.horizonY ?? (from.entry.horizon ?? 0.655) * H, hosted: false };
    phase = 'melting';
    wantNext = false;
    // (mallow: the incoming host, so the shell can start loading its art now)
    emit('melt', { from: from.id, to: to.id, k: 0, mallow: to.entry.mallow?.id || null });
  }
  /** Halfway through the melt, once: the incoming world's Mallow takes the stage (owner P2). */
  function hostAt() {
    if (!melt || melt.hosted || melt.e < 0.5) return;
    melt.hosted = true;
    emit('host', { from: melt.from.id, to: melt.to.id, mallow: melt.to.entry.mallow?.id || null, k: Math.round(melt.k * 1000) / 1000 });
  }

  function endMelt() {
    const { from, to } = melt;
    melt = null;
    destroyInstance(from);
    // a finger still resting from before the melt belonged to the old world: it stops there
    for (const p of pointers.values()) if (p.owner === from) p.owner = null;
    cur = to; inc = null; nextChoice = null;
    phase = 'playing';
    recordPlayed(from);
    session.sequence = [...session.sequence, cur.id].slice(-24);
    writeStore();
    save();
    emit('melt', { from: from.id, to: cur.id, k: 1, mallow: cur.entry.mallow?.id || null });
    emit('world', { id: cur.id, from: from.id, mallow: cur.entry.mallow?.id, title: cur.entry.title });
  }

  // ------------------------------------------------------- discovery --
  /** Is this world the one on stage (not melting away; or the one melting in)? */
  const onStage = (inst) => !!inst && ((inst === cur && !(melt && melt.from === inst)) || (!!melt && melt.to === inst));
  /** May this world speak (a line, a discovery)? On stage — or melting in, from its enter() on (the melt begins with it). */
  const speaks = (inst) => onStage(inst) || (!!inst && inst === inc && inst.entered);
  function discover(inst, id, evidence = {}) {
    if (!session || destroyed || (inst !== cur && inst !== inc)) return false;
    // nothing is found under the veil or after the end — nor in a world melting away (its line would come under its
    // host's name over the next world's; its offer could never follow)
    if (paused || phase === 'finished' || !speaks(inst)) return false;
    if (session.discoveries.has(id)) return false;
    session.discoveries.add(id);
    const def = inst.entry.discoveries?.[id] || {};
    // offer: false — a discovery with nothing to keep (the world's tool is offered with another one)
    const skillId = def.offer === false ? null : (def.skillId || inst.entry.memory?.skillId || null);
    emit('discovery', { id, worldId: inst.id, skillId, evidence });
    haptic('success');
    discoveryPending++;
    const lines = def.lines || [];
    const done = lines.length && subtitles?.say
      ? Promise.resolve(subtitles.say(lines, { kind: 'discovery', hold: true, id: `discovery:${id}`, who: inst.entry.mallow?.id, world: inst.id, interrupt: true, first: true })).catch(() => {})
      : Promise.resolve();
    const sess = session;
    done.finally(() => {
      discoveryPending = Math.max(0, discoveryPending - 1);
      // (no offer once finished, in a gentle session or while safety holds the world — owner P3/P4; it is not
      // marked offered, so a later discovery of the same tool can still offer it once support is gone)
      // (nor once its world has melted away or is melting away: its offer would come over the next world's host —
      // it is not marked offered either; a world melting in may offer its own)
      if (skillId && sess === session && !sess.offered.has(skillId) && !offersHushed() && !destroyed && onStage(inst)) {
        sess.offered.add(skillId);
        emit('offer', { skillId, worldId: inst.id, discoveryId: id });
      }
      save();
    });
    save();
    return true;
  }

  function onComplete(inst) {
    inst.completeSeen = true;
    recordPlayed(inst);
    emit('complete', { worldId: inst.id });
    save();
    const d = inst.entry.dialogue || {};
    const can = nextAvailable();
    if (can) stageNext();
    const over = () => destroyed || phase === 'finished' || cur !== inst || melt;
    const say = () => {
      if (over()) return;
      if (can && subtitles?.choice) {
        choiceOpen = inst;
        Promise.resolve(subtitles.choice(d.complete || 'Stay, or drift on?', [{ label: 'Stay', value: 'stay' }, { label: 'Drift on', value: 'next' }], { world: inst.id }))
          .then((v) => { if (choiceOpen === inst) choiceOpen = null; if (cur !== inst) return; if (v === 'next') api.next(); else if (v === 'stay') api.stay(); })
          .catch(() => {});
      } else if (d.completeStay || d.complete) inst.ctx.say([can ? d.complete : (d.completeStay || d.complete)], { kind: 'dialogue' });
    };
    // let a discovery finish speaking first (and a paused world be resumed); never once it has ended
    // (and anything held — an open Memory Garden offer: the completion's own choice or line never comes over it)
    const wait = () => { if (over()) return; if (discoveryPending || paused || holds.size) setTimeout(wait, 400); else say(); };
    wait();
  }

  // ------------------------------------------------------------ input --
  function pointerState(id) {
    let p = pointers.get(id);
    if (!p) {
      if (pointers.size >= MAX_POINTERS) return null;
      p = pool.pop() || { id: 0, owner: null, vel: createVelocity(), quiet: 0, x: 0, y: 0, t: 0, pointerType: 'touch', s: { type: 'down', id: 0, x: 0, y: 0, t: 0, vx: 0, vy: 0, speed: 0, speedU: 0, pointerType: 'touch', count: 0, idle: false } };
      p.id = id; p.owner = null; p.quiet = 0;
      pointers.set(id, p);
    }
    return p;
  }

  /** Fill the pointer's shared event object and hand it to the world that owns it. */
  function deliver(p, type, idleEv) {
    const s = p.s;
    s.type = type; s.id = p.id; s.x = p.x; s.y = p.y; s.t = p.t; s.vx = p.vel.vx; s.vy = p.vel.vy;
    s.speed = p.vel.speed; s.speedU = U ? s.speed / U : 0; s.pointerType = p.pointerType; s.count = pointers.size; s.idle = idleEv;
    const owner = p.owner;
    if (owner?.world && !paused && owner.entered) { try { owner.world.pointer?.(s); } catch (err) { console.warn('[hushflow] pointer', err); } }
  }

  /**
   * A routed pointer event: { type: 'down'|'move'|'up'|'cancel', id, x, y, t (ms), pointerType }.
   * Worlds receive { type, id, x, y, t, vx, vy, speed, speedU, pointerType, count, idle }:
   * speed is the smoothed PATH speed (velocity.js — a scribble reads as fast), vx/vy the
   * net direction of travel. While a finger rests without events, the director sends the
   * world an `idle: true` 'move' every frame (same x, y; speed decaying to 0), so a stopped
   * finger becomes still in every world.
   */
  function pointer(e) {
    if (destroyed || !e) return false;
    const type = e.type === 'pointerdown' ? 'down' : e.type === 'pointermove' ? 'move' : e.type === 'pointerup' ? 'up' : e.type === 'pointercancel' ? 'cancel' : e.type;
    const id = e.id ?? e.pointerId ?? 1;
    const x = e.x ?? e.clientX, y = e.y ?? e.clientY;
    const tms = e.t ?? e.timeStamp ?? nowMs();
    let p = pointers.get(id);
    if (type === 'down') { if (p) release(id); p = pointerState(id); if (!p) return false; p.owner = (melt && melt.e >= INPUT_SWITCH_K) ? melt.to : cur; }
    if (!p) return false;
    if (type === 'down') p.vel.reset(x, y, tms / 1000);
    else p.vel.sample(x, y, tms / 1000);
    p.x = x; p.y = y; p.t = tms; p.quiet = 0; p.pointerType = e.pointerType || 'touch';
    lastInputAt = t;
    deliver(p, type, false);
    if (type === 'up' || type === 'cancel') release(id);
    return true;
  }
  /** Every frame: pointers that have gone quiet slow to a stop (and the world hears it). */
  function idlePointers(dt) {
    for (const p of pointers.values()) {
      p.quiet += dt;
      if (p.vel.idle(dt, p.quiet)) { p.t += dt * 1000; deliver(p, 'move', true); }
    }
  }
  function release(id) { const p = pointers.get(id); if (p) { pointers.delete(id); p.owner = null; pool.push(p); } }

  /** Optional: listen on an element directly (dev lab / standalone), with capture and coalesced events. */
  function bindPointer(el, { claim = () => false } = {}) {
    const down = (e) => {
      if (claim(e)) return;
      try { el.setPointerCapture?.(e.pointerId); } catch { /* synthetic */ }
      e.preventDefault?.();
      pointer({ type: 'down', id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, pointerType: e.pointerType });
    };
    const move = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const list = e.getCoalescedEvents?.() || [];
      if (list.length) for (const c of list) pointer({ type: 'move', id: e.pointerId, x: c.clientX, y: c.clientY, t: c.timeStamp, pointerType: e.pointerType });
      else pointer({ type: 'move', id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, pointerType: e.pointerType });
    };
    const up = (e) => { if (pointers.has(e.pointerId)) pointer({ type: e.type === 'pointercancel' ? 'cancel' : 'up', id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, pointerType: e.pointerType }); };
    const gesture = (e) => e.preventDefault();
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('gesturestart', gesture);
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up); el.removeEventListener('gesturestart', gesture);
    };
  }

  // ------------------------------------------------------------- loop --
  function startLoop() {
    if (frozen || destroyed) return;
    if (ticker?.add) {
      if (!tickerOn) { tickerOn = true; ticker.add(tickFromTicker); }
      if (loopMode !== 'raf') loopMode = 'ticker';
      lastTickAt = nowMs();
      if (!watchdog && typeof setInterval === 'function') watchdog = setInterval(watch, WATCHDOG_MS);
      return;
    }
    runOwnRaf();
  }
  function runOwnRaf() {
    loopMode = 'raf';
    if (!raf && !destroyed && !hidden) { lastTs = 0; raf = requestAnimationFrame(loop); }
  }
  function stopLoop() {
    if (tickerOn) { ticker.remove(tickFromTicker); tickerOn = false; }
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    loopMode = 'stopped';
    if (watchdog) { clearInterval(watchdog); watchdog = 0; }
    if (probe) { cancelAnimationFrame(probe); probe = 0; }
  }
  /**
   * Watchdog: the rig's shared loop can die (an exception in a rig's own tick before it asks
   * for the next frame stops every ticker). If no tick has come for WATCHDOG_MS while the
   * world is visible and playing, run our own requestAnimationFrame until the ticker is back.
   */
  function watch() {
    if (loopMode !== 'ticker' || paused || hidden || frozen || destroyed || phase === 'finished' || probe) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (nowMs() - lastTickAt < WATCHDOG_MS) return;
    // stale — but a long task (a build, a font) also starves timers and frames alike: ask for one
    // frame of our own; the shared loop, if alive, asked first and ticks before it does
    probe = requestAnimationFrame(() => {
      probe = 0;
      if (loopMode !== 'ticker' || paused || hidden || frozen || destroyed) return;
      if (nowMs() - lastTickAt < WATCHDOG_MS) return;
      console.warn('[hushflow] the shared Mallow loop stopped ticking: the world runs on its own frame loop');
      emit('loop', { mode: 'raf', reason: 'watchdog' });
      runOwnRaf();
    });
  }
  function tickFromTicker(dt) {
    lastTickAt = nowMs();
    if (loopMode === 'raf') {
      // the shared loop is back: one loop again
      if (raf) cancelAnimationFrame(raf);
      raf = 0; loopMode = 'ticker';
      emit('loop', { mode: 'ticker', reason: 'recovered' });
    }
    if (!paused && !hidden && !destroyed) step(Math.min(0.05, dt > 1 ? dt / 1000 : dt));
    // (and once more after the frame's work: a frame whose world and stage take longer than WATCHDOG_MS — a slow phone,
    // a GC pause — is a live loop still; the watchdog's probe for the next frame must not take it for a dead one)
    lastTickAt = nowMs();
  }
  function loop(ts) {
    raf = 0;
    if (destroyed || hidden || paused || loopMode !== 'raf') return;
    raf = requestAnimationFrame(loop);
    const dtMs = lastTs ? ts - lastTs : 16.7;
    lastTs = ts;
    step(Math.min(50, Math.max(0, dtMs)) / 1000, dtMs);
  }

  function step(dt, rawMs = dt * 1000) {
    // paused while the first world loads: its clock waits too (it enters never having stepped)
    if (pausePending && (phase === 'loading' || phase === 'idle')) return;
    t += dt;
    const t0 = nowMs();
    if (phase === 'loading' || !cur) { comp.drawFallback(); return; }
    if (phase === 'finished') return;
    if (pointers.size) idlePointers(dt);
    try { cur.world.frame(dt, t); } catch (e) { console.warn('[hushflow] frame', e); }
    if (melt) {
      try { melt.to.world.frame(dt, t); } catch (e) { console.warn('[hushflow] frame (incoming)', e); }
      melt.k = Math.min(1, melt.k + dt / melt.dur);
      melt.e = inOutSine(melt.k);
      try { melt.from.world.outro?.(melt.e); melt.to.world.intro?.(melt.e, melt.from.id); } catch (e) { console.warn('[hushflow] outro/intro', e); }
      comp.melt(layersOf(melt.from), layersOf(melt.to), melt.e, { horizonY: melt.horizonY, t, reduced: reducedMotion() });
      hostAt();
      // (a 'host' listener may have finished or destroyed the Hushflow)
      if (melt && melt.k >= 1) endMelt();
    } else {
      if (!revealed) reveal();
      fadeIn = Math.min(1, fadeIn + dt / (reducedMotion() ? 0.35 : FADE_IN_SEC));
      const L = layersOf(cur);
      comp.single(L.back, L.front, inOutSine(fadeIn));
    }
    if (!melt && cur) {
      const w = cur.world;
      if (w.complete && !cur.completeSeen) onComplete(cur);
      if (!inc && (w.progress >= PREPARE_AT || w.complete || wantNext)) stageNext();
      if (canMelt()) beginMelt();
    }
    progressClock += dt;
    if (progressClock > 0.25 && cur) {
      progressClock = 0;
      const p = Math.round((cur.world.progress || 0) * 100) / 100;
      if (p !== lastProgress) { lastProgress = p; emit('progress', { worldId: cur.id, progress: p, metrics: cur.world.metrics }); }
    }
    saveClock += dt;
    if (saveClock > 5) { saveClock = 0; save(); }
    governor(rawMs, nowMs() - t0, dt);
  }

  /**
   * Adaptive quality with hysteresis. Down a level after SLOW_SEC of frame intervals over
   * SLOW_MS; back up after FAST_SEC (doubling after each bounce, ≤ 2 min) of the director's
   * own frame work under FAST_MS while frames keep up. Melts, world builds and the second
   * after a level change are never counted, so one hitch never leaves the world blurry.
   */
  function governor(rawMs, workMs, dt) {
    if (quality !== 'auto') return;
    if (melt || buildingNow()) { govQuiet = 0.6; return; }
    if (govQuiet > 0) { govQuiet -= dt; return; }
    frameEma += (rawMs - frameEma) * 0.05;
    workEma += (workMs - workEma) * 0.05;
    if (frameEma > SLOW_MS) { slowSec += dt; fastSec = 0; } else slowSec = Math.max(0, slowSec - dt * 0.5);
    if (frameEma <= 20 && workEma < FAST_MS) fastSec += dt; else fastSec = Math.max(0, fastSec - dt);
    if (slowSec > SLOW_SEC && qLevel < 3) {
      // a drop soon after stepping up: wait longer before trying again
      if (t - upAt < 30) upBackoff = Math.min(120 / FAST_SEC, upBackoff * 2);
      setLevel(qLevel + 1);
    } else if (qLevel > 0 && fastSec > FAST_SEC * upBackoff) { upAt = t; setLevel(qLevel - 1); }
  }
  function setLevel(l) {
    qLevel = l; slowSec = 0; fastSec = 0; frameEma = 16.7; workEma = 8; govQuiet = 1;
    applySize();
    emit('quality', { level: qLevel, ...dprs() });
  }
  /** A world is being built (its prepare() runs in idle time) or was just built: frames are not representative. */
  function buildingNow() {
    for (const inst of [cur, inc]) if (inst && inst.preparing && !inst.prepared) return true;
    return t - builtAt < 0.6;
  }

  /** Save progress through W3's flow-store (sanitised: ids and numbers only). */
  function save() {
    if (!cur || !session || phase === 'finished') return;
    // a world held for safety is never written down: nothing to offer to resume after a crisis
    // (the tab hiding or the page reloading while the person is away calling someone included)
    if ((paused && pauseReason === 'safety') || pausePending === 'safety') return;
    let w = null;
    try { w = cur.world.serialize?.() ?? null; } catch (e) { console.warn('[hushflow] serialize', e); }
    try {
      saveProgress(kv, {
        worldId: cur.id, idx: Math.max(0, session.sequence.length - 1), sequence: session.sequence, step: cur.world.complete ? 1 : (cur.world.progress || 0),
        emotion: session.emotion, intention: session.intention, mallow: cur.entry.mallow?.id || null, seed: cur.seed,
        state: { w, d: [...session.discoveries], o: [...session.offered], i: Math.round((session.intensity ?? 0.6) * 100) / 100, c: cur.world.complete ? 1 : 0 },
      }, { enabled: saveOn() });
    } catch (e) { console.warn('[hushflow] progress not saved', e); }
  }

  function finishInstances() {
    if (melt) { destroyInstance(melt.from); melt = null; }
    destroyInstance(cur); destroyInstance(inc);
    cur = null; inc = null; nextChoice = null;
    for (const id of [...pointers.keys()]) release(id);
  }

  // ---------------------------------------------------- environment --
  let ro = null;
  const onResize = () => { if (measure()) applySize(); };
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(onResize); ro.observe(worldEl); } else addEventListener('resize', onResize);
  const onVis = () => {
    hidden = document.hidden;
    if (hidden) { stopLoop(); save(); try { cur?.world.pause?.(); } catch { /* ignore */ } }
    else if (!paused && phase !== 'finished') { try { cur?.world.resume?.(); } catch { /* ignore */ } startLoop(); }
  };
  document.addEventListener('visibilitychange', onVis);

  function matchMediaReduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } }

  // -------------------------------------------------------------- api --
  const api = {
    start,
    /**
     * Drift on: melt into the next world as soon as it is prepared (no completion needed), or into
     * `worldId` when one is given (a playable world that is not this one; calm in a gentle session).
     * A paused Hushflow resumes and melts — unless safety holds it (then nothing happens). Returns
     * whether a melt is now on its way (always === state.canNext just before the call, for a plain next()).
     */
    next({ worldId = null } = {}) {
      if (destroyed || !cur || melt || phase !== 'playing' || safetyHeld()) return false;
      if (worldId) {
        if (!pickable(worldId)) return false;
        if (nextChoice?.id !== worldId) { nextChoice = { id: worldId, bags: persist.bags }; dropStaged(worldId); }
      } else if (!nextAvailable()) return false;
      if (paused) api.resume();
      wantNext = true; cur.staying = false;
      stageNext();
      return true;
    },
    /** Stay longer: no automatic melt from this world until next() is asked for. stay(false) un-stays (no melt). */
    stay(on = true) {
      if (!cur) return;
      const v = !!on;
      cur.staying = v;
      if (v) wantNext = false;
      emit('stay', { worldId: cur.id, on: v });
    },
    /**
     * Pause under the veil. { reason: 'safety' } (care typed in a world): Resume stays allowed, but nothing
     * drifts on and no Memory Garden offer comes until resume(). While the first world still loads, it is
     * remembered: the world enters paused (see start()).
     */
    pause(o = {}) {
      const reason = (o && typeof o === 'object' && o.reason) || null;
      if (destroyed || phase === 'finished') return;
      // (while loading, cur may exist already — it is being built — but it has not entered)
      if (!cur || phase === 'loading' || phase === 'idle') {
        if (phase === 'loading' || phase === 'idle') { if (pausePending !== 'safety') pausePending = reason || true; }
        return;
      }
      if (reason === 'safety') wantNext = false;     // a Drift on asked for earlier is dropped
      if (paused) { if (reason === 'safety') pauseReason = 'safety'; return; }
      paused = true;
      pauseReason = reason;
      stopLoop();
      try { cur.world.pause?.(); melt?.to.world.pause?.(); } catch { /* ignore */ }
      for (const id of [...pointers.keys()]) release(id);
      comp.veil(VEIL);
      try { subtitles?.pause?.(); } catch { /* optional */ }
      save();
      emit('pause', { worldId: cur.id, reason });
    },
    resume() {
      if (destroyed || phase === 'finished') return;
      if (!cur || phase === 'loading' || phase === 'idle') { pausePending = null; return; }
      if (!paused) return;
      paused = false;
      pauseReason = null;
      try { cur?.world.resume?.(); melt?.to.world.resume?.(); subtitles?.resume?.(); } catch { /* ignore */ }
      // a world that entered paused starts its ambience now
      for (const inst of [cur, melt?.to]) if (inst?.ambPending) { const a = inst.ambPending; inst.ambPending = null; inst.ctx.ambience(a, {}); }
      startLoop();
      emit('resume', { worldId: cur?.id });
    },
    /**
     * End the Hushflow now (no penalty). The last frame stays on screen until destroy(). Also while the
     * first world loads: start() then resolves null and the phase stays 'finished'. No Memory Garden offer
     * follows a finish. { reason: 'safety' }: a crisis (owner P3), passed on in the 'finish' event.
     */
    finish(o = {}) {
      if (phase === 'finished') return;
      const reason = (o && typeof o === 'object' && o.reason) || null;
      ++startToken;
      // finishing is a choice, not an interruption: nothing is left waiting to be resumed
      const id = cur?.id || (phase === 'loading' ? loadingId : null);
      try { cur?.world.pause?.(); melt?.to.world.pause?.(); } catch { /* ignore */ }
      recordPlayed(cur);
      phase = 'finished';
      // (finished, not paused: nothing is waiting to be resumed — the panel shows no Resume)
      paused = false; pauseReason = null;
      // (and nothing is loading any more: state.title is null with worldId)
      hushed = true; wantNext = false; pausePending = null; loadingId = null;
      // the world's own 'Stay, or drift on?' goes with it
      if (choiceOpen) { choiceOpen = null; try { subtitles?.clear?.(); } catch { /* optional */ } }
      stopLoop();
      try { clearProgress(kv); } catch { /* ignore */ }
      writeStore();
      emit('finish', { worldId: id, reason });
    },
    /**
     * A gentle session (after care): only calm worlds from here, each at most once (a staged storm, or a world
     * already played, is dropped), and no Memory Garden offers. For this session only, never saved. Before
     * start(), it is what start() uses.
     */
    setGentle(b = true) {
      const on = !!b;
      gentleWant = on;
      if (!session || session.gentle === on) return;
      session.gentle = on;
      nextChoice = null;
      if (on && ((inc && (registry.get(inc.id)?.calm !== true || playedGently().includes(inc.id))) || staging)) dropStaged();
      for (const inst of [cur, inc]) { try { inst?.world?.setGentle?.(on); } catch (e) { console.warn('[hushflow] setGentle', e); } }
      emit('gentle', { on, worldId: cur?.id || null });
    },
    get gentle() { return !!session?.gentle; },
    /**
     * hold(key, true) while something must not be interrupted (an open Memory Garden offer: 'offer'): the
     * world never melts by itself and safeForUpdate() is false. hold(key, false) lets go. Returns whether
     * anything is still held.
     */
    hold(key, on = true) {
      if (key == null) return holds.size > 0;
      const had = holds.has(key);
      if (on) holds.add(key); else holds.delete(key);
      if (had !== !!on) emit('hold', { key, on: !!on, held: holds.size > 0 });
      return holds.size > 0;
    },
    get holds() { return [...holds]; },
    setEmotion(id, intensity) {
      if (!session) return;
      session.emotion = id; if (Number.isFinite(intensity)) session.intensity = intensity;
      try { cur?.world.setEmotion?.(id, session.intensity); } catch { /* optional */ }
      nextChoice = null;
      if (cur && fitScore(cur.entry, id, session.intention) <= 0) api.next();
    },
    setIntention(id) {
      if (!session) return;
      session.intention = id;
      nextChoice = null;
      if (cur && fitScore(cur.entry, session.emotion, id) <= 0) api.next();
    },
    setAutoFlow(b) { autoFlow = !!b; emit('autoflow', { on: autoFlow }); },
    get autoFlow() { return autoFlow; },
    /** ★ favourite world (flow-store). Returns whether it is now a favourite. */
    setFavourite(id, on = true) {
      try { if (favourites().includes(id) !== !!on) toggleFavouriteWorld(kv, id); } catch { /* storage blocked */ }
      nextChoice = null;
      return favourites().includes(id);
    },
    get favourites() { return favourites(); },
    /** The primary thought handle can arrive after start (the person types while playing). */
    setThought(h) { thoughtOne = h || null; tellThoughts(); },
    /** A ThoughtLayer or an array of handles (W2); ctx.thought becomes its primary. */
    setThoughts(ts) { thoughtsSrc = ts || null; tellThoughts(); },
    get thought() { return primaryThought(thoughtsSrc, thoughtOne); },
    get thoughts() { return thoughtList(thoughtsSrc, thoughtOne); },
    pointer,
    bindPointer,
    on(ev, fn) { if (!listeners.has(ev)) listeners.set(ev, new Set()); listeners.get(ev).add(fn); return () => listeners.get(ev)?.delete(fn); },
    /** Rects worlds want kept clear of subtitles and controls (client CSS px, {x, y, w, h}). */
    avoid() { try { return cur?.world.avoid?.() || []; } catch { return []; } },
    /**
     * The slot for subtitles while a world plays ({x, y, w, h}, client px): the band no
     * world object ever enters. Shells should place lines, discoveries and choices inside it.
     */
    subtitleBand() { try { return cur?.world.subtitleBand?.() || bandRect(); } catch { return bandRect(); } },
    /** A saved Hushflow that can be resumed (or null). */
    resumable() {
      let c = null; try { c = loadProgress(kv); } catch { c = null; }
      return c && registry.playable(c.worldId) ? { worldId: c.worldId, at: c.savedAt, step: c.step, complete: !!c.state?.c } : null;
    },
    get state() {
      // (a pause asked for while the first world loads counts already: it will enter paused)
      const p = paused || (!!pausePending && (phase === 'loading' || phase === 'idle'));
      const why = paused ? pauseReason : (p && pausePending !== true ? pausePending : null);
      // (a world still being built counts while it loads; finished before it ever entered, it is nobody's world)
      const live = cur && (cur.entered || phase === 'loading') ? cur : null;
      return {
        phase: phase === 'finished' ? 'finished' : p ? 'paused' : phase, paused: p && phase !== 'finished', reason: why || null, worldId: live?.id || null, nextId: nextChoice?.id || null,
        // the world's name (or the one loading), for the panel's 'Now: …'
        title: (live || (loadingId ? { entry: registry.get(loadingId) } : null))?.entry?.title || null,
        progress: cur?.world.progress ?? 0, complete: !!cur?.world.complete, staying: !!cur?.staying, autoFlow,
        melt: melt ? Math.round(melt.e * 1000) / 1000 : null, emotion: session?.emotion || null, intention: session?.intention || null,
        discoveries: session ? [...session.discoveries] : [], quality: qLevel,
        gentle: !!session?.gentle,
        // true exactly when next() would melt now (false after the final world, owner P1; false while safety holds)
        canNext: canNextNow(),
        held: holds.size > 0,
        hushed: offersHushed(),
      };
    },
    get world() { return cur?.world || null; },
    get incoming() { return inc?.world || null; },
    /** True when a new deploy may reload now: nothing held, no world mid-progress, no melt, no discovery waiting. */
    safeForUpdate() {
      if (holds.size) return false;
      if (phase === 'idle' || phase === 'finished' || !cur) return true;
      if (melt || discoveryPending > 0) return false;
      // (fix round) the person's own words on stage as the world's Thought Mallow: never reloaded away from under them, at
      // any progress (a world just begun counted as safe while it showed them)
      if (thoughtList(thoughtsSrc, thoughtOne).some((t) => t && !t.leaving)) return false;
      const p = cur.world.progress || 0;
      return p <= 0.001 || !!cur.world.complete;
    },
    destroy() {
      if (destroyed) return;
      save();
      if (phase !== 'finished') recordPlayed(cur);
      destroyed = true;
      ++startToken;
      stopLoop();
      finishInstances();
      ro?.disconnect(); removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      backCanvas.remove(); frontCanvas.remove();
    },
    /** QA hooks (dev lab, Playwright). Not product API. */
    debug: {
      get compositor() { return comp; },
      get canvases() { return { back: backCanvas, front: frontCanvas }; },
      get time() { return t; },
      get frameMs() { return frameEma; },
      /** The director's own work per frame (worlds + compositor), ms EMA. */
      get workMs() { return workEma; },
      get governor() { return { level: qLevel, slowSec, fastSec, upBackoff, quiet: govQuiet }; },
      /** Which loop drives the director: the Mallow rig's shared ticker, its own rAF, or none. */
      get loop() { return loopMode === 'ticker' ? 'rig-ticker' : loopMode; },
      // (a host stepping frames by hand is the loop: the watchdog never starts a second one alongside it)
      step: (dtSec = 1 / 60) => { lastTickAt = nowMs(); step(dtSec, dtSec * 1000); lastTickAt = nowMs(); },
      /** Freeze the loop without a veil (QA: step frames by hand). */
      freeze(on = true) { frozen = !!on; if (frozen) stopLoop(); else startLoop(); },
      setQuality(level) { qLevel = clamp(level, 0, 3) | 0; applySize(); },
      get persisted() { let progress = null; try { progress = loadProgress(kv); } catch { /* ignore */ } return JSON.parse(JSON.stringify({ rotation: persist, progress, favourites: favourites() })); },
    },
  };
  measure();
  applySize();
  // QA only: the latest director, on localhost (never on a deployed host)
  try { if (['localhost', '127.0.0.1'].includes(location.hostname)) globalThis.__hushflowLast = api; } catch { /* no location */ }
  return api;
}
