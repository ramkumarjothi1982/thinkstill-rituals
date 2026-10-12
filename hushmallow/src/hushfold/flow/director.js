// The Hushflow director: one continuous movie of worlds.
//
// Owns the frame loop of the Hushflow (it runs inside the Mallow rig's shared
// loop, addTicker — one requestAnimationFrame for rigs, MallowTouch and worlds),
// the two compositor canvases (#world back, #fx-layer front), the worlds'
// lifecycles and the melt between them. It never shows a black frame: the back
// canvas always holds a world or the next world's palette, a melt only starts
// once the incoming world is prepared (its heavy build runs in idle time), and
// pause keeps the last frame under a soft veil.
//
//   const flow = createHushflow({ app, worldEl, fxEl, mallow, thought, subtitles, photos, words, prefs, store, safeRect });
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
// Thought adapter (until W2's Thought Mallows land): `thought` is one handle
//   { token, text, x, y, z, scale, state:{tension, charge, calm, distance},
//     react(kind), soften(k), settle(k), hitTest(x, y), pointer(e), draw?(g, x, y, scale, o) }.
// The world writes x, y, scale and state every frame. If the handle has draw(),
// the world draws it into its front layer (the 2D placeholder); without draw()
// the world only positions it and W2's ThoughtLayer renders it on its own layer.

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

export function createHushflow(opts = {}) {
  const {
    app = null, worldEl, fxEl, mallow = null, subtitles = null, photos = null, words = null, prefs = null,
    registry = defaultRegistry, safeRect = null, quality = 'auto', debug = false,
  } = opts;
  // one frame loop: the Mallow rig's shared loop (rigs first, then the world sees this frame's face);
  // { ticker: false } runs the director's own requestAnimationFrame instead (standalone pages)
  const ticker = opts.ticker === false ? null : (opts.ticker?.add ? opts.ticker : { add: addTicker, remove: removeTicker });
  let thought = opts.thought ?? null;
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
  let lastInputAt = -Infinity;
  let wantNext = false, autoFlow = false;
  let discoveryPending = 0;
  let choiceOpen = null;            // the world whose 'Stay, or drift on?' is on screen
  let saveClock = 0, progressClock = 0, lastProgress = -1;
  let frameEma = 16.7, slowSec = 0;
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
      mallow, get thought() { return thought; }, words, photos,
      get reduced() { return reducedMotion(); }, get lowStim() { return lowStim(); },
      get emotion() { return session?.emotion || null; }, get intention() { return session?.intention || null; },
      get intensity() { return session?.intensity ?? 0.6; }, get input() { return session?.input || null; },
      now: () => t,
      font: (px, weight) => fontPx(px, weight),
      fontsReady: (groups, ms) => fontsReady(groups, ms),
      say(lines, o = {}) { if (!subtitles?.say || paused) return Promise.resolve(); return Promise.resolve(subtitles.say(lines, { who: entry.mallow?.id, ...o })).catch(() => {}); },
      discover: (id, evidence) => discover(inst, id, evidence),
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
          try { await inst.world.prepare?.(); inst.prepared = true; resolve(inst); } catch (e) { reject(e); }
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
  function pickNext(exclude = []) {
    const res = registry.select({
      current: cur?.id, emotion: session?.emotion, intention: session?.intention,
      history: persist.history, favourites: favourites(), bags: persist.bags,
      seed: session?.seed ?? 0, sessionCount: persist.sessionCount, exclude,
    });
    return res;
  }
  let nextChoice = null;   // { id, bags } (bags committed when the melt starts)
  function chooseNext() {
    if (opts.forceNext && registry.has(opts.forceNext)) { nextChoice = { id: opts.forceNext, bags: persist.bags }; return nextChoice; }
    nextChoice = pickNext();
    if (!nextChoice.id) nextChoice = null;
    return nextChoice;
  }
  function nextAvailable() { return !!(nextChoice?.id || chooseNext()?.id); }

  /** Make sure the next world exists and is being prepared. */
  let staging = null;
  function stageNext() {
    if (inc || staging || !nextAvailable()) return staging || Promise.resolve(inc);
    const id = nextChoice.id;
    staging = (async () => {
      try {
        const seed = Math.floor(hash01(`${session.seed}|${persist.sessionCount}|${id}|${persist.history.length}`) * 2 ** 31);
        const created = await instantiate(id, seed);
        if (!created || destroyed) return null;
        inc = created;
        resizeInstance(inc);
        prepare(inc).catch((e) => { console.warn('[hushflow] prepare failed', e); if (inc === created) { destroyInstance(inc); inc = null; nextChoice = null; } });
      } catch (e) {
        console.warn('[hushflow] next world failed to load', e);
        emit('error', { kind: 'load', id, error: e });
        nextChoice = pickNext([id]); if (!nextChoice?.id) nextChoice = null;
      } finally { staging = null; }
      return inc;
    })();
    return staging;
  }

  // ------------------------------------------------------------ start --
  async function start({ emotion = null, intention = null, intensity = 0.6, input = null, worldId = null, resume = false } = {}) {
    if (destroyed) return null;
    finishInstances();
    measure();
    applySize();
    let prev = null;
    if (resume) { try { prev = loadProgress(kv); } catch { prev = null; } }
    const resuming = !!(prev?.worldId && registry.playable(prev.worldId));
    const pst = resuming && prev.state && typeof prev.state === 'object' ? prev.state : {};
    persist.sessionCount = (persist.sessionCount || 0) + 1;
    session = {
      emotion: resuming ? prev.emotion ?? emotion : emotion, intention: resuming ? prev.intention ?? intention : intention,
      intensity: resuming && Number.isFinite(pst.i) ? pst.i : intensity, input,
      seed: resuming ? prev.seed : Math.floor(hash01(`hf|${persist.sessionCount}|${emotion}|${intention}`) * 2 ** 31),
      discoveries: new Set(resuming && Array.isArray(pst.d) ? pst.d : []), offered: new Set(resuming && Array.isArray(pst.o) ? pst.o : []),
      sequence: resuming && Array.isArray(prev.sequence) ? [...prev.sequence] : [],
    };
    let id = resuming ? prev.worldId : worldId;
    if (!id || !registry.playable(id)) {
      const pick = registry.select({ current: null, emotion: session.emotion, intention: session.intention, history: persist.history, favourites: favourites(), bags: persist.bags, seed: session.seed, sessionCount: persist.sessionCount });
      id = pick.id;
      if (pick.id) persist.bags = pick.bags;
    }
    if (!id) { phase = 'idle'; emit('error', { kind: 'none' }); return null; }
    const entry = registry.get(id);
    comp.setFallback(entry.palette || null);
    comp.drawFallback(); comp.clearFront();
    phase = 'loading'; paused = false; fadeIn = 0; wantNext = false; nextChoice = null;
    startLoop();
    try {
      const inst = await instantiate(id, session.seed);
      if (!inst || destroyed) return null;
      cur = inst;
      resizeInstance(cur);
      await prepare(cur);
      if (destroyed || cur !== inst) return null;
      if (resuming && pst.w) { try { cur.world.restore?.(pst.w); } catch (e) { console.warn('[hushflow] restore failed', e); } }
      enterInstance(cur, null, null);
      phase = 'playing';
      if (!session.sequence.length || session.sequence[session.sequence.length - 1] !== id) session.sequence.push(id);
      writeStore();
      save();
      emit('world', { id, from: null, mallow: entry.mallow?.id, title: entry.title, resumed: !!resuming });
      return cur;
    } catch (e) {
      console.warn('[hushflow] world failed to start', e);
      phase = 'idle';
      emit('error', { kind: 'start', id, error: e });
      return null;
    }
  }

  function enterInstance(inst, from, handoff) {
    if (inst.entered) return;
    inst.entered = true;
    inst.world.enter?.({ from, handoff });
    const amb = inst.entry.sound?.ambience;
    if (amb) inst.ctx.ambience(amb, {});
    // the authored next world: start loading its code now (no build yet)
    for (const n of inst.entry.next || []) registry.prefetch?.(n);
  }

  // ------------------------------------------------------------- melt --
  function canMelt() {
    if (!cur || melt || !inc?.prepared) return false;
    if (wantNext) return true;
    if (!cur.world.complete || cur.staying) return false;
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
    melt = { k: 0, e: 0, dur, from, to, horizonY: handoff?.horizonY ?? (from.entry.horizon ?? 0.655) * H };
    phase = 'melting';
    wantNext = false;
    emit('melt', { from: from.id, to: to.id, k: 0 });
  }

  function endMelt() {
    const { from, to } = melt;
    melt = null;
    destroyInstance(from);
    // a finger still resting from before the melt belonged to the old world: it stops there
    for (const p of pointers.values()) if (p.owner === from) p.owner = null;
    cur = to; inc = null; nextChoice = null;
    phase = 'playing';
    persist.history = [...persist.history, from.id].slice(-12);
    session.sequence = [...session.sequence, cur.id].slice(-24);
    writeStore();
    save();
    emit('melt', { from: from.id, to: cur.id, k: 1 });
    emit('world', { id: cur.id, from: from.id, mallow: cur.entry.mallow?.id, title: cur.entry.title });
  }

  // ------------------------------------------------------- discovery --
  function discover(inst, id, evidence = {}) {
    if (!session || (inst !== cur && inst !== inc)) return false;
    if (session.discoveries.has(id)) return false;
    session.discoveries.add(id);
    const def = inst.entry.discoveries?.[id] || {};
    const skillId = def.skillId || inst.entry.memory?.skillId || null;
    emit('discovery', { id, worldId: inst.id, skillId, evidence });
    haptic('success');
    discoveryPending++;
    const lines = def.lines || [];
    const done = lines.length && subtitles?.say
      ? Promise.resolve(subtitles.say(lines, { kind: 'discovery', hold: true, id: `discovery:${id}`, who: inst.entry.mallow?.id, interrupt: true, first: true })).catch(() => {})
      : Promise.resolve();
    done.finally(() => {
      discoveryPending = Math.max(0, discoveryPending - 1);
      if (skillId && !session.offered.has(skillId)) {
        session.offered.add(skillId);
        emit('offer', { skillId, worldId: inst.id, discoveryId: id });
      }
      save();
    });
    save();
    return true;
  }

  function onComplete(inst) {
    inst.completeSeen = true;
    emit('complete', { worldId: inst.id });
    save();
    const d = inst.entry.dialogue || {};
    const can = nextAvailable();
    if (can) stageNext();
    const say = () => {
      if (cur !== inst || melt) return;
      if (can && subtitles?.choice) {
        choiceOpen = inst;
        Promise.resolve(subtitles.choice(d.complete || 'Stay, or drift on?', [{ label: 'Stay', value: 'stay' }, { label: 'Drift on', value: 'next' }]))
          .then((v) => { if (choiceOpen === inst) choiceOpen = null; if (cur !== inst) return; if (v === 'next') api.next(); else if (v === 'stay') api.stay(); })
          .catch(() => {});
      } else if (d.completeStay || d.complete) inst.ctx.say([can ? d.complete : (d.completeStay || d.complete)], { kind: 'dialogue' });
    };
    // let a discovery finish speaking first
    const wait = () => (discoveryPending ? setTimeout(wait, 400) : say());
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
    if (frozen) return;
    if (ticker?.add) { if (!raf) { raf = -1; ticker.add(tickFromTicker); } return; }
    if (!raf && !destroyed && !hidden) { lastTs = 0; raf = requestAnimationFrame(loop); }
  }
  function stopLoop() {
    if (ticker?.remove && raf === -1) { ticker.remove(tickFromTicker); raf = 0; return; }
    if (raf > 0) cancelAnimationFrame(raf);
    raf = 0;
  }
  function tickFromTicker(dt) { if (!paused && !hidden && !destroyed) step(Math.min(0.05, dt > 1 ? dt / 1000 : dt)); }
  function loop(ts) {
    raf = 0;
    if (destroyed || hidden || paused) return;
    raf = requestAnimationFrame(loop);
    const dtMs = lastTs ? ts - lastTs : 16.7;
    lastTs = ts;
    step(Math.min(50, Math.max(0, dtMs)) / 1000, dtMs);
  }

  function step(dt, rawMs = dt * 1000) {
    t += dt;
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
      if (melt.k >= 1) endMelt();
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
    governor(rawMs, dt);
  }

  function governor(rawMs, dt) {
    if (quality !== 'auto') return;
    frameEma += (rawMs - frameEma) * 0.05;
    if (frameEma > 24) slowSec += dt; else slowSec = Math.max(0, slowSec - dt * 0.5);
    if (slowSec > 3 && qLevel < 3) {
      qLevel++; slowSec = 0; frameEma = 16.7;
      applySize();
      emit('quality', { level: qLevel, ...dprs() });
    }
  }

  /** Save progress through W3's flow-store (sanitised: ids and numbers only). */
  function save() {
    if (!cur || !session || phase === 'finished') return;
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
    else if (!paused) { try { cur?.world.resume?.(); } catch { /* ignore */ } startLoop(); }
  };
  document.addEventListener('visibilitychange', onVis);

  function matchMediaReduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } }

  // -------------------------------------------------------------- api --
  const api = {
    start,
    /** Drift on: melt into the next world as soon as it is prepared (no completion needed). */
    next() {
      if (!cur || melt) return false;
      if (!nextAvailable()) return false;
      wantNext = true; cur.staying = false;
      stageNext();
      return true;
    },
    /** Stay longer: no automatic melt from this world until next() is asked for. */
    stay() { if (!cur) return; cur.staying = true; wantNext = false; emit('stay', { worldId: cur.id }); },
    pause() {
      if (paused || !cur) return;
      paused = true;
      stopLoop();
      try { cur.world.pause?.(); melt?.to.world.pause?.(); } catch { /* ignore */ }
      for (const id of [...pointers.keys()]) release(id);
      comp.veil(VEIL);
      try { subtitles?.pause?.(); } catch { /* optional */ }
      save();
      emit('pause', { worldId: cur.id });
    },
    resume() {
      if (!paused) return;
      paused = false;
      try { cur?.world.resume?.(); melt?.to.world.resume?.(); subtitles?.resume?.(); } catch { /* ignore */ }
      startLoop();
      emit('resume', { worldId: cur?.id });
    },
    /** End the Hushflow now (no penalty). The last frame stays on screen until destroy(). */
    finish() {
      if (phase === 'finished') return;
      // finishing is a choice, not an interruption: nothing is left waiting to be resumed
      const id = cur?.id || null;
      try { cur?.world.pause?.(); } catch { /* ignore */ }
      phase = 'finished';
      stopLoop();
      try { clearProgress(kv); } catch { /* ignore */ }
      writeStore();
      emit('finish', { worldId: id });
    },
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
    /** The thought handle can arrive after start (the person types while playing). */
    setThought(h) { thought = h; try { cur?.world.setThought?.(h); } catch { /* optional */ } },
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
      return {
        phase: paused ? 'paused' : phase, paused, worldId: cur?.id || null, nextId: nextChoice?.id || null,
        progress: cur?.world.progress ?? 0, complete: !!cur?.world.complete, staying: !!cur?.staying, autoFlow,
        melt: melt ? Math.round(melt.e * 1000) / 1000 : null, emotion: session?.emotion || null, intention: session?.intention || null,
        discoveries: session ? [...session.discoveries] : [], quality: qLevel,
      };
    },
    get world() { return cur?.world || null; },
    get incoming() { return inc?.world || null; },
    /** True when a new deploy may reload now: no world mid-progress, no melt, no discovery waiting. */
    safeForUpdate() {
      if (phase === 'idle' || phase === 'finished' || !cur) return true;
      if (melt || discoveryPending > 0) return false;
      const p = cur.world.progress || 0;
      return p <= 0.001 || !!cur.world.complete;
    },
    destroy() {
      if (destroyed) return;
      save();
      destroyed = true;
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
      /** Which loop drives the director: the Mallow rig's shared ticker, its own rAF, or none. */
      get loop() { return raf === -1 ? 'rig-ticker' : raf > 0 ? 'raf' : 'stopped'; },
      step: (dtSec = 1 / 60) => step(dtSec, dtSec * 1000),
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
