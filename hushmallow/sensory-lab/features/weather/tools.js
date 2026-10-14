// Weather Weaver — pointer tools: every touch off the Mallow becomes weather.
//
// routePointers (core/pointer-router.js) offers this module every pointer; it
// claims only those the Mallow is not under, so touching the Mallow is always
// TouchTalk. A claimed pointer gets a track, is classified (classify() in
// core/weather.js: a tap, a hold or a drag, latched once decided; a release at
// ≥ 700 px/s is a fling) and goes to one tool, by the pick order:
//   1. a held object · 2. the light pool · 3. a deck puff (Rain) ·
//   4. the water · 5. the weather's lead tool over the sky and ground.
// While a weather front is passing, every off-Mallow drag pushes the front.
//
// Tools turn gestures into sim operations and emit weather events
// (api.emit(type, x, y, k)); the feature turns those into realm pulses
// (through the Environment's photosafe gate), Mallow reactions, sound and
// announcements. Each lead tool also carries its non-gesture alternative
// (alt: the hold chip and the W key) and its arrow-key nudge.
//
// Storm and Rain are complete here; the other weathers answer a touch with a
// realm tap (their tools land in later slices).

import { classify, isFling, WEATHERS } from '../../core/weather.js';
import { clamp, rng, smoothstep } from '../../core/math.js';

const TRACKS = 4;
export const ALT_ID = -10;              // the bead the "Catch the rain" chip holds
const ZERO = Object.freeze({ vx: 0, vy: 0 });
const PUSH_STEP = 26;                   // px of swipe per cloud push
const SWEEP_STEP = 16;                  // px of swipe per rain sweep
const SPREAD_K = 1 / 120;               // spread strength per px two fingers move apart
const PART_RATE = 1.4;                  // "Part the clouds": spread strength per second
const GAP_STEP = 0.25;                  // new sky that counts as a gap opening

/**
 * api: { sims: {clouds, deck, rain, strikes}, geo (live {W, H, skyTop, horizonY, floorY, body}),
 *        weather(), amount(w), fronting(), frontDrag(pxPerSec), locked(), onMallow(x, y),
 *        emit(type, x, y, k), reduced(), gentle(), ring(x, y), touched(w) }
 */
export function createTools(api) {
  const { clouds, deck, rain, strikes } = api.sims;
  const geo = api.geo;
  const now = () => performance.now();
  const rand = rng(17);
  let activeAlt = null;

  // ------------------------------------------------------------- tracks --
  const tracks = Array.from({ length: TRACKS }, (_, i) => {
    const tr = { i, on: false, id: -1, t0: 0, x0: 0, y0: 0, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, maxDist: 0, up: false, tUp: 0,
      kind: 'pending', tool: null, w: null, bead: false, grab: false, h: null };
    tr.h = { move: (p, v) => move(tr, p, v), up: (p, v) => up(tr, p, v), cancel: () => cancel(tr) };
    return tr;
  });

  /** routePointers' claim: a handler for an off-Mallow pointer, or null to let it through. */
  function claim(p, e) {
    if (api.locked() || api.onMallow(p.x, p.y)) return null;
    let tr = null;
    for (const t of tracks) if (!t.on) { tr = t; break; }
    if (!tr) return null;
    tr.on = true; tr.id = e.pointerId; tr.t0 = now(); tr.up = false; tr.kind = 'pending'; tr.bead = false; tr.grab = false;
    tr.x0 = tr.x = tr.px = p.x; tr.y0 = tr.y = tr.py = p.y; tr.vx = tr.vy = 0; tr.maxDist = 0;
    tr.w = api.weather();
    tr.tool = api.fronting() ? front : pick(p);
    api.ring(p.x, p.y);   // every claimed down answers at once
    api.touched(tr.w);
    tr.tool.down?.(tr);
    return tr.h;
  }

  function pick(p) {
    const w = api.weather();
    if (w === 'rain' && api.amount('rain') > 0.5 && deck.hit(p.x, p.y) >= 0) return deckTool;
    return LEAD[w] || generic;
  }

  // pending → drag | hold, decided once
  function decide(tr, t) {
    const k = classify(tr, t);
    if (k === 'drag') { tr.kind = 'drag'; tr.tool.dragStart?.(tr); }
    else if (k === 'hold') { tr.kind = 'hold'; tr.tool.holdStart?.(tr); }
    return tr.kind;
  }

  function move(tr, p, v) {
    if (!tr.on) return;
    tr.x = p.x; tr.y = p.y; tr.vx = v.vx; tr.vy = v.vy;
    const d = Math.hypot(p.x - tr.x0, p.y - tr.y0);
    if (d > tr.maxDist) tr.maxDist = d;
    const T = tr.tool;
    if (T.raw) { T.move?.(tr); return; }
    if (tr.kind === 'pending') decide(tr, now());
    if (tr.kind === 'drag') T.drag?.(tr);
    else if (tr.kind === 'hold') T.holdMove?.(tr);
  }

  function up(tr, p, v) {
    if (!tr.on) return;
    tr.x = p.x; tr.y = p.y; tr.vx = v.vx; tr.vy = v.vy;
    tr.up = true; tr.tUp = now();
    const T = tr.tool;
    tr.on = false;
    if (T.raw) { T.up?.(tr, v, false); return; }
    if (tr.kind === 'pending' && decide(tr, tr.tUp) === 'pending') tr.kind = 'tap';
    if (tr.kind === 'tap') (T.tap || touch)(tr);
    else if (tr.kind === 'drag') { T.drag?.(tr); T.dragEnd?.(tr, v); }
    else if (tr.kind === 'hold') T.holdEnd?.(tr, v);
  }

  // a cancel (pointercancel, blur, hidden) is a release at zero velocity: nothing stays held
  function cancel(tr) {
    if (!tr.on) return;
    tr.on = false;
    const T = tr.tool;
    if (T.raw) T.up?.(tr, ZERO, true);
    else if (tr.kind === 'drag') T.dragEnd?.(tr, ZERO);
    else if (tr.kind === 'hold') T.holdEnd?.(tr, ZERO);
  }

  const touch = (tr) => api.emit('touch', tr.x, tr.y, 0);
  const count = (tool) => { let n = 0; for (const t of tracks) if (t.on && t.tool === tool) n++; return n; };

  // -------------------------------------------------------------- storm --
  const gaps = new Float32Array(6);
  const storm = {
    id: 'storm', gaps, n: 0, y0: 0, light: 0, drift: false,
    _mark: 0, _lit: false, _part: false, _pair: -1,
    dragStart(tr) { tr.px = tr.x0; tr.py = tr.y0; api.emit('swish', tr.x, tr.y, 0); },
    drag(tr) {
      if (count(storm) > 1) { tr.px = tr.x; tr.py = tr.y; return; }   // two fingers spread instead (step)
      const L = Math.hypot(tr.x - tr.px, tr.y - tr.py);
      if (L < PUSH_STEP) return;
      // distance parts the clouds even for a slow, deliberate swipe; speed tears them wider
      const k = (0.4 + 0.7 * clamp(Math.hypot(tr.vx, tr.vy) / 1400, 0, 1)) * clamp(L / 120, 0.2, 1);
      clouds.push(tr.px, tr.py, tr.x, tr.y, k);
      tr.px = tr.x; tr.py = tr.y;
    },
    alt: { label: WEATHERS.storm.alt.label, hold: true, start() { storm._part = true; }, end() { storm._part = false; } },
    nudge(dx) { if (dx) clouds.nudge(Math.sign(dx)); },
    /** Arriving from nothing: a fresh bank; the storm brings its own rain. */
    enter() {
      if (clouds.amount < 0.01) storm.reset();
      if (api.amount('rain') < 0.01) rain.level = 0.72;
    },
    reset() { clouds.reset(); strikes.reset(); storm._mark = 0; storm._lit = false; storm._pair = -1; storm.drift = false; storm.light = 0; },
    step(dt) {
      const a = clouds.amount, live = api.weather() === 'storm';
      // two storm fingers moving apart open a gap at their midpoint
      let t1 = null, t2 = null;
      for (const t of tracks) if (t.on && t.tool === storm) { if (!t1) t1 = t; else if (!t2) t2 = t; }
      if (t1 && t2) {
        const d = Math.hypot(t1.x - t2.x, t1.y - t2.y);
        if (storm._pair >= 0 && d > storm._pair + 0.5) clouds.spread((t1.x + t2.x) / 2, (t1.y + t2.y) / 2, clamp((d - storm._pair) * SPREAD_K, 0, 1));
        storm._pair = d;
      } else storm._pair = -1;
      if (storm._part && live) clouds.spread(geo.W / 2, clouds.top + (clouds.bottom - clouds.top) * 0.5, PART_RATE * dt);
      // gaps → light shafts; a shaft on the Mallow
      storm.n = a > 0.05 ? clouds.gaps(gaps) : 0;
      storm.y0 = clouds.top + (clouds.bottom - clouds.top) * 0.66;
      const b = geo.body;
      let light = 0;
      for (let k = 0; k < storm.n; k++) {
        const reach = gaps[2 * k + 1] * 0.5 + b.w * 0.2, dx = Math.abs(gaps[2 * k] - b.cx);
        if (dx < reach) light = Math.max(light, smoothstep(16, 86, gaps[2 * k + 1]) * (1 - 0.5 * dx / reach));
      }
      storm.light = light * smoothstep(0.6, 1, a);
      if (live && a > 0.9) {
        if (storm.light > 0.35 && !storm._lit) { storm._lit = true; api.emit('light-through', b.cx, b.top, storm.light); }
        else if (storm.light < 0.12) storm._lit = false;
        const cl = clouds.clear();
        if (cl < storm._mark) storm._mark = cl;
        if (cl - storm._mark >= GAP_STEP && storm.n) {
          storm._mark = cl;
          let best = 0;
          for (let k = 1; k < storm.n; k++) if (gaps[2 * k + 1] > gaps[2 * best + 1]) best = k;
          api.emit('gap', gaps[2 * best], storm.y0, cl);
        }
      }
      // strikes, in sim time, while the bank is heavy (glows only when gentle or reduced)
      if (a > 0.5 && !storm.drift) {
        const r = strikes.step(dt, { coverage: clouds.coverage() * a, gentle: api.gentle(), reduced: api.reduced() });
        if (r === 'strike' || r === 'glow') {
          const f = rand() < 0.5 ? 0.08 + 0.22 * rand() : 0.7 + 0.22 * rand();   // never near the Mallow
          const x = f * geo.W;
          clouds.flash(x);
          api.emit(r, x, r === 'strike' ? geo.horizonY : storm.y0, 0);
        } else if (r === 'thunder') api.emit('thunder', geo.W / 2, storm.y0, 0);
      }
    },
  };

  // --------------------------------------------------------------- rain --
  function release(id, vx, vy) {
    const res = rain.orbRelease(id, vx, vy);
    if (res?.to === 'up') api.emit(res.n > 0 ? 'bead-up' : 'touch', res.x, res.y, res.n);   // an empty bead is only a touch
    return res;
  }
  const rainTool = {
    id: 'rain', sheltered: false, drift: false, _alt: false,
    holdStart(tr) { tr.bead = rain.orbStart(tr.id, tr.x, tr.y); if (tr.bead) api.emit('bead', tr.x, tr.y, 0); },
    holdMove(tr) { if (tr.bead) rain.orbMove(tr.id, tr.x, tr.y); },
    holdEnd(tr, v) { if (!tr.bead) return; tr.bead = false; release(tr.id, v.vx, v.vy); },
    dragStart(tr) { tr.px = tr.x0; tr.py = tr.y0; },
    drag(tr) {
      const L = Math.hypot(tr.x - tr.px, tr.y - tr.py);
      if (L < SWEEP_STEP) return;
      rain.sweep(tr.px, tr.py, tr.x, tr.y, tr.vx, tr.vy);
      tr.px = tr.x; tr.py = tr.y;
    },
    dragEnd(tr, v) { if (isFling(v.vx, v.vy)) api.emit('swish', tr.x, tr.y, 1); },
    alt: {
      label: WEATHERS.rain.alt.label, hold: true,
      // a bead forms above the Mallow (sheltering it) and gathers; letting go sends it up
      start() { const b = geo.body; rainTool._alt = rain.orbStart(ALT_ID, b.cx, b.top - 64); if (rainTool._alt) api.emit('bead', b.cx, b.top - 64, 0); },
      end() { if (!rainTool._alt) return; rainTool._alt = false; release(ALT_ID, 0, -900); },
    },
    nudge(dx) { if (dx) rain.nudge(Math.sign(dx)); },
    /** Arriving from nothing: a fresh deck and all the rain to catch. */
    enter() { if (deck.amount < 0.01) deck.reset(); rain.level = 1; rainTool.drift = false; },
    reset() { rain.reset(); deck.reset(); rainTool.sheltered = false; rainTool.drift = false; },
    step() {
      if (rainTool._alt) { const b = geo.body; rain.orbMove(ALT_ID, b.cx, b.top - 64); }
      const sh = rain.sheltered();
      if (sh && !rainTool.sheltered && api.weather() === 'rain') api.emit('sheltered', geo.body.cx, geo.body.top, 0);
      rainTool.sheltered = sh;
    },
  };

  // a drag that starts on a deck puff pushes the low deck (rain stops under the gap)
  const deckTool = {
    raw: true,
    down(tr) { tr.grab = deck.grab(tr.id, tr.x, tr.y); },
    move(tr) { if (tr.grab) deck.drag(tr.id, tr.x, tr.y); },
    up(tr, v, cancelled) {
      if (tr.grab) deck.release(tr.id, v.vx, v.vy);
      tr.grab = false;
      if (!cancelled && tr.maxDist < 10 && tr.tUp - tr.t0 < 260) touch(tr);
    },
  };

  // during a front: drags push it on (the reveal never runs under 0.5 s); taps still answer
  const front = {
    raw: true,
    move(tr) { api.frontDrag(Math.hypot(tr.vx, tr.vy)); },
    up(tr, v, cancelled) { if (!cancelled && tr.maxDist < 10) touch(tr); },
  };

  const generic = { id: 'generic', alt: null };
  const LEAD = { storm, rain: rainTool };

  return {
    claim, storm, rain: rainTool,
    get: (w) => LEAD[w] || generic,
    has: (w) => Object.hasOwn(LEAD, w),
    alt: (w) => LEAD[w]?.alt || null,
    /** The lead alternative (chip or W): one at a time. */
    altStart(w) {
      const T = LEAD[w];
      if (!T?.alt || activeAlt) return false;
      activeAlt = T;
      api.touched(w);
      T.alt.start();
      return true;
    },
    altEnd() { const T = activeAlt; activeAlt = null; T?.alt.end(); },
    get altActive() { return !!activeAlt; },
    nudge(w, dx, dy) { const T = LEAD[w]; if (!T?.nudge) return false; api.touched(w); T.nudge(dx, dy); return true; },
    enter(w) { LEAD[w]?.enter?.(); },
    reset(w) { LEAD[w]?.reset?.(); },
    step(dt) {
      const t = now();
      for (const tr of tracks) if (tr.on && !tr.tool.raw && tr.kind === 'pending') decide(tr, t);   // holds begin while still
      storm.step(dt);
      rainTool.step(dt);
    },
    /** The newest weather touch (for the Mallow's gaze) into out; false when none. */
    focus(out) {
      let best = null;
      for (const t of tracks) if (t.on && (!best || t.t0 > best.t0)) best = t;
      if (!best) return false;
      out.x = best.x; out.y = best.y;
      return true;
    },
    get active() { let n = 0; for (const t of tracks) if (t.on) n++; return n; },
  };
}
