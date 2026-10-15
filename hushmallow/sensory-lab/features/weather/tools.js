// Weather Weaver — pointer tools: every touch off the Mallow becomes weather.
//
// routePointers (core/pointer-router.js) offers this module every pointer; it
// claims only those the Mallow is not under, so touching the Mallow is always
// TouchTalk. A claimed pointer gets a track, is classified (classify() in
// core/weather.js: a tap, a hold or a drag, latched once decided; a release at
// ≥ 700 px/s is a fling) and goes to one tool, by the pick order:
//   1. a held object (beads and clusters stay with their pointer) ·
//   2. the light pool, within 1.4 r · 3. a deck puff (Rain) ·
//   4. the water band or a puddle (every weather but Fog; 12 px of hysteresis
//      at the horizon) · 5. the weather's lead tool over the sky and ground.
// While a weather front is passing, every off-Mallow drag pushes the front.
//
// Tools turn gestures into sim operations and emit weather events
// (api.emit(type, x, y, k, vx, vy)); the feature turns those into realm pulses
// (through the Environment's photosafe gate), Mallow reactions, sound and
// announcements. Each lead tool also carries its non-gesture alternative
// (alt: the hold chip and the W key) and its arrow-key nudge, so every
// gesture has a button and a key that does the same thing:
//   Sunshine / Moonlight  drag the light pool · Bring the sun / moonlight · arrows move it 28 px
//   Starlight  sweep up a cluster, let go · Gather stars (stream to a point, let go) · arrows gather
//   Wind       draw a current · Send a breeze (a sweep; held: a slow breeze that calms) · arrows send one
//   Fog        wipe, hold, tap · Clear the mist (a spiral from the Mallow) · arrows wipe a band
//   Rain       hold to catch, swipe to sweep · Catch the rain (a sheltering bead) · arrows lean it
//   Storm      swipe, two-finger spread · Part the clouds · arrows push the nearest puff
//   Warm glow  drag or tap to kindle · Spread the warmth (the Mallow is the hearth) · arrows kindle
//   Water      drag a swell, tap a ripple, hold a rocking swell · Push the water (a tap chip)

import { classify, isFling, WEATHERS, POINTER } from '../../core/weather.js';
import { clamp, rng, smoothstep } from '../../core/math.js';
import { segDist2 } from '../../core/weather/field.js';

const TRACKS = 4;
export const ALT_ID = -10;              // the bead the "Catch the rain" chip holds
export const STAR_ALT = -11;            // the cluster "Gather stars" holds
export const STAR_KEY = -12;            // the cluster the arrow keys gather
const WIND_ALT = -13;                   // the "Send a breeze" stroke (wind path analysis)
const ZERO = Object.freeze({ vx: 0, vy: 0 });
const PUSH_STEP = 26;                   // px of swipe per cloud push
const SWEEP_STEP = 16;                  // px of swipe per rain sweep
const SPREAD_K = 1 / 120;               // spread strength per px two fingers move apart
const PART_RATE = 1.4;                  // "Part the clouds": spread strength per second
const GAP_STEP = 0.25;                  // new sky that counts as a gap opening
const KEY_STEP = 28;                    // px an arrow key moves a pool or the gather point
const WIPE_STEP = 8;                    // px of drag per mist wipe
const KINDLE_STEP = 10;                 // px of drag per ember kindle pass
const SWELL_FIRST = 30, SWELL_STEP = 140;   // px of drag before the first swell, then per extra swell
const GATHER_EVERY = 0.16;              // s per star streamed by "Gather stars"
const KEY_RELEASE = 1.4;                // s after the last arrow before a keyboard cluster is let go
export const TRAIL = 20, TRAIL_LIFE = 0.9;  // warm light trail: points per pointer, seconds each lives
const GAPS = { gust: 450, 'gust-water': 1000, 'moon-water': 1000, revealed: 1500 };   // ms

/**
 * api: { sims: {clouds, deck, rain, strikes, sun, moon, stars, wind, mist, embers, waves, puddles},
 *        geo (live {W, H, skyTop, horizonY, floorY, water: [y0, y1] | null, waterBottom(x), body}),
 *        weather(), amount(w), fronting(), frontDrag(pxPerSec), locked(), onMallow(x, y), waterOn(),
 *        emit(type, x, y, k, vx, vy), reduced(), gentle(), ring(x, y), touched(w),
 *        flash(bank, x) (a cloud glow through the screen's lab glow gate; missing: straight to the bank) }
 */
export function createTools(api) {
  const { clouds, deck, rain, strikes, sun, moon, stars, wind, mist, embers, waves, puddles } = api.sims;
  const geo = api.geo;
  const now = () => performance.now();
  const rand = rng(17);
  const gates = Object.create(null);
  const gate = (k) => { const t = now(); if (t - (gates[k] ?? -1e9) < GAPS[k]) return false; gates[k] = t; return true; };
  let activeAlt = null, clock = 0, wasWater = false;
  const flash = api.flash || ((bank, x) => bank.flash(x));

  // ------------------------------------------------------------- tracks --
  const tracks = Array.from({ length: TRACKS }, (_, i) => {
    const tr = { i, on: false, id: -1, t0: 0, tm: 0, x0: 0, y0: 0, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, maxDist: 0, up: false, tUp: 0,
      kind: 'pending', tool: null, w: null, bead: false, grab: false, sw: false, push: 0, swells: 0, pud: -1, h: null };
    tr.h = { move: (p, v) => move(tr, p, v), up: (p, v) => up(tr, p, v), cancel: () => cancel(tr) };
    return tr;
  });

  /** routePointers' claim: a handler for an off-Mallow pointer, or null to let it through. */
  function claim(p, e) {
    if (api.locked() || api.onMallow(p.x, p.y)) return null;
    let tr = null;
    for (const t of tracks) if (!t.on) { tr = t; break; }
    if (!tr) return null;
    tr.on = true; tr.id = e.pointerId; tr.t0 = tr.tm = now(); tr.up = false; tr.kind = 'pending'; tr.bead = false; tr.grab = false;
    tr.x0 = tr.x = tr.px = p.x; tr.y0 = tr.y = tr.py = p.y; tr.vx = tr.vy = 0; tr.maxDist = 0; tr.sw = false; tr.push = 0; tr.swells = 0; tr.pud = -1;
    tr.w = api.weather();
    tr.tool = api.fronting() ? front : pick(p);
    api.ring(p.x, p.y);   // every claimed down answers at once
    api.touched(tr.w);
    tr.tool.down?.(tr);
    return tr.h;
  }

  /** Is (x, y) on the realm's water? 12 px of hysteresis at the horizon (the last pick decides). */
  function onWater(x, y) {
    const w = geo.water;
    if (!w) return false;
    return y >= w[0] + (wasWater ? -6 : 6) && y <= geo.waterBottom(x);
  }

  function pick(p) {
    const w = api.weather();
    const pool = w === 'sunshine' ? sun : w === 'moonlight' ? moon : null;
    if (pool && pool.amount > 0.5 && Math.hypot(p.x - pool.x, p.y - pool.y) < 1.4 * pool.r) { wasWater = false; return LEAD[w]; }
    if (w === 'rain' && api.amount('rain') > 0.5 && deck.hit(p.x, p.y) >= 0) return deckTool;
    if (w !== 'fog') {
      const wet = api.waterOn() && onWater(p.x, p.y);
      wasWater = wet;
      if (wet || puddles.hit(p.x, p.y) >= 0) return waterTool;
    }
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
    if (Math.abs(p.x - tr.x) + Math.abs(p.y - tr.y) > 0.5) tr.tm = now();
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
  const tapped = (tr) => tr.maxDist < POINTER.tapPx && tr.tUp - tr.t0 < 260;
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
          flash(clouds, x);   // the lab's glow (≤ 1 a second across both banks); the strike and thunder still follow
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
      if (!cancelled && tapped(tr)) touch(tr);
    },
  };

  // ------------------------------------------------- sunshine, moonlight --
  // The light pool goes where the finger goes (from the first touch: no waiting to classify);
  // the sims glide it (sun ~180 ms, moon ~300 ms, critically damped) and measure what it lights.
  function poolTool(wid, pool) {
    const T = {
      id: wid, raw: true, _alt: false,
      down(tr) { pool.to(tr.x, tr.y); },
      move(tr) { pool.to(tr.x, tr.y); },
      up(tr, v, cancelled) { if (!cancelled && tapped(tr)) touch(tr); },
      // "Bring the sun / moonlight": the pool glides to the Mallow and rests there
      alt: { label: WEATHERS[wid].alt.label, hold: true, start() { T._alt = true; }, end() { T._alt = false; } },
      nudge(dx, dy) { pool.to(pool.tx + dx * KEY_STEP, pool.ty + dy * KEY_STEP); },
      enter() { if (pool.amount < 0.01) pool.reset(); },
      reset() { pool.reset(); T._alt = false; },
      step() {
        if (T._alt) { const b = geo.body; pool.to(b.cx, b.mid); }
        // a moving moon pool on the water: a ripple at most once a second
        if (pool === moon && api.weather() === 'moonlight' && moon.onWater && moon.amount > 0.5 && Math.hypot(moon.vx, moon.vy) > 40 && gate('moon-water')) {
          waves.ripple(moon.x, 0.3);
          api.emit('moon-water', moon.x, moon.y, 0);
        }
      },
    };
    return T;
  }
  const sunTool = poolTool('sunshine', sun);
  const moonTool = poolTool('moonlight', moon);

  // ---------------------------------------------------------- starlight --
  const gp = { x: 0, y: 0 };   // where "Gather stars" and the arrow keys stream stars to
  function gatherPoint() {
    const b = geo.body, top = geo.skyTop + 24, d = Math.max(90, 0.4 * b.h);
    if (b.top - d >= top) { gp.x = b.cx; gp.y = b.top - d; }
    else { gp.x = b.cx - Math.min(geo.W * 0.3, b.w * 1.1); gp.y = Math.max(top, b.top + 20); }   // a short sky: beside the Mallow
    gp.x = clamp(gp.x, 40, geo.W - 40);
    return gp;
  }
  const starsTool = {
    id: 'starlight', raw: true, gp, _alt: false, _acc: 0, keyT: -1, want: 0, wait: 0,
    down(tr) { stars.sweep(tr.id, tr.x, tr.y); },
    move(tr) { stars.sweep(tr.id, tr.x, tr.y); },
    up(tr, v, cancelled) {
      const res = stars.release(tr.id, cancelled ? 0 : v.vx, cancelled ? 0 : v.vy);
      if (!cancelled && !res.n && tapped(tr)) touch(tr);
    },
    alt: {
      label: WEATHERS.starlight.alt.label, hold: true,
      start() { starsTool._alt = true; starsTool._acc = GATHER_EVERY; gatherPoint(); },
      end() { if (!starsTool._alt) return; starsTool._alt = false; stars.release(STAR_ALT, 0, 0); },   // raised into a constellation
    },
    nudge(dx, dy) {
      if (!starsTool._alt && starsTool.keyT < 0) gatherPoint();
      gp.x = clamp(gp.x + dx * KEY_STEP, 24, geo.W - 24);
      gp.y = clamp(gp.y + dy * KEY_STEP, geo.skyTop + 20, Math.max(geo.skyTop + 40, geo.horizonY - 20));
      if (starsTool._alt) { stars.moveCluster(STAR_ALT, gp.x, gp.y); return; }
      // each press asks for one more star (streamed as soon as one is loose); let go after a pause
      starsTool.want = Math.min(stars.perConstellation, starsTool.want + 1);
      starsTool.wait = 0;
      stars.gatherOne(STAR_KEY, gp.x, gp.y);
      stars.moveCluster(STAR_KEY, gp.x, gp.y);
      starsTool.keyT = KEY_RELEASE;
    },
    enter() { if (stars.amount < 0.01) stars.reset(); },
    reset() { stars.reset(); starsTool._alt = false; starsTool.keyT = -1; starsTool.want = 0; },
    step(dt) {
      // a resting finger brightens its cluster
      const t = now();
      for (const tr of tracks) if (tr.on && tr.tool === starsTool && t - tr.tm > 150) stars.hold(tr.id, dt);
      if (starsTool._alt) {
        starsTool._acc += dt;
        while (starsTool._acc >= GATHER_EVERY) { starsTool._acc -= GATHER_EVERY; stars.gatherOne(STAR_ALT, gp.x, gp.y); }
        stars.hold(STAR_ALT, dt);
      }
      if (starsTool.keyT >= 0) {
        // stars still showering or flying: keep streaming the asked-for ones (up to 4 s) before the pause counts
        if (stars.clusterSize(STAR_KEY) < starsTool.want && starsTool.wait < 4) { starsTool.wait += dt; stars.gatherOne(STAR_KEY, gp.x, gp.y); }
        else { starsTool.keyT -= dt; if (starsTool.keyT < 0) { stars.release(STAR_KEY, 0, 0); starsTool.want = 0; } }
      }
    },
  };

  // --------------------------------------------------------------- wind --
  // A drag is a jet in the flow field; its path is analysed for calm (slow, smooth strokes) and eddies.
  function jet(x0, y0, x1, y1, vx, vy) {
    const s = Math.hypot(vx, vy);
    wind.inject(x1, y1, vx, vy, 70 + Math.min(60, s * 0.04));
    const b = geo.body, reach = b.w * 0.6 + 30;
    if (s > 220 && segDist2(b.cx, b.mid, x0, y0, x1, y1) < reach * reach && gate('gust')) api.emit('gust', b.cx, b.mid, clamp(s / 900, 0, 1), vx, vy);
    if (s > 700 && api.waterOn() && onWater(x1, y1) && gate('gust-water')) { waves.ripple(x1, 0.45); api.emit('gust-water', x1, y1, clamp(s / 1400, 0, 1)); }
  }
  // "Send a breeze": one sweep through the Mallow (alternating sides); held, it eases into a slow
  // steady breeze (240 px/s, smooth) that builds calm. The arrow keys send one sweep from their side.
  const breeze = { on: false, held: false, x: 0, y: 0, ux: 1, uy: 0, speed: 0, t: 0, side: -1 };
  function breezeStart(ux, uy, held, speed = 520) {
    const b = geo.body;
    breeze.ux = ux; breeze.uy = uy; breeze.held = held; breeze.on = true; breeze.t = 0; breeze.speed = speed;
    breeze.x = ux > 0 ? -40 : ux < 0 ? geo.W + 40 : b.cx;
    breeze.y = uy > 0 ? geo.skyTop - 20 : uy < 0 ? geo.floorY + 20 : b.mid;
    wind.endTrack(WIND_ALT);
  }
  const windTool = {
    id: 'wind', raw: true, breeze,
    down(tr) { tr.px = tr.x; tr.py = tr.y; wind.track(tr.x, tr.y, now() / 1000, tr.id); },
    move(tr) {
      if (Math.hypot(tr.x - tr.px, tr.y - tr.py) < 6) return;
      const s = Math.hypot(tr.vx, tr.vy);
      if (!tr.sw && tr.maxDist > POINTER.tapPx) { tr.sw = true; api.emit('swish', tr.x, tr.y, clamp(s / 1400, 0, 1)); }
      jet(tr.px, tr.py, tr.x, tr.y, tr.vx, tr.vy);
      wind.track(tr.x, tr.y, now() / 1000, tr.id);
      tr.px = tr.x; tr.py = tr.y;
    },
    up(tr, v, cancelled) { wind.endTrack(tr.id); if (!cancelled && tapped(tr)) touch(tr); },
    alt: {
      label: WEATHERS.wind.alt.label, hold: true,
      start() { breeze.side = -breeze.side; breezeStart(breeze.side, 0, true); },
      end() { breeze.held = false; },   // a tap's sweep finishes crossing
    },
    nudge(dx, dy) { if (dx) breezeStart(dx < 0 ? 1 : -1, 0, false); else if (dy) breezeStart(0, dy < 0 ? 1 : -1, false); },
    enter() { if (api.amount('wind') < 0.01) wind.reset(); },
    reset() { wind.reset(); breeze.on = false; breeze.held = false; },
    step(dt) {
      if (!breeze.on) return;
      breeze.t += dt;
      const want = breeze.held && breeze.t > 0.35 ? 240 : 520;
      breeze.speed += (want - breeze.speed) * Math.min(1, dt * 3);
      const px = breeze.x, py = breeze.y, vx = breeze.ux * breeze.speed, vy = breeze.uy * breeze.speed;
      breeze.x += vx * dt; breeze.y += vy * dt;
      jet(px, py, breeze.x, breeze.y, vx, vy);
      wind.track(breeze.x, breeze.y, clock, WIND_ALT);
      if (breeze.x < -60 || breeze.x > geo.W + 60 || breeze.y < geo.skyTop - 40 || breeze.y > geo.floorY + 40) {
        if (breeze.held) breezeStart(breeze.ux, breeze.uy, true, breeze.speed);   // a steady breeze keeps coming
        else { breeze.on = false; wind.endTrack(WIND_ALT); }
      }
    },
  };

  // ---------------------------------------------------------------- fog --
  function wipe(x0, y0, x1, y1, r) {
    mist.wipe(x0, y0, x1, y1, r);
    const b = geo.body, reach = b.h * 0.85;
    if (segDist2(b.cx, b.mid, x0, y0, x1, y1) < reach * reach && gate('revealed')) api.emit('revealed', b.cx, b.top, mist.fogClear());
  }
  const fogTool = {
    id: 'fog', _alt: false, spin: 0, sx: 0, sy: 0, depth: new Float32Array(4),
    dragStart(tr) { tr.px = tr.x0; tr.py = tr.y0; api.emit('wipe', tr.x, tr.y, 0); },
    drag(tr) {
      if (Math.hypot(tr.x - tr.px, tr.y - tr.py) < WIPE_STEP) return;
      wipe(tr.px, tr.py, tr.x, tr.y, clamp(34 + Math.hypot(tr.vx, tr.vy) * 0.02, 34, 60));   // 34–60 px, wider when faster
      tr.px = tr.x; tr.py = tr.y;
    },
    dragEnd(tr) { api.emit('wipe-end', tr.x, tr.y, 0); },
    tap(tr) { wipe(tr.x - 8, tr.y, tr.x + 8, tr.y, 30); touch(tr); },   // a small puff opens
    // "Clear the mist": a tall spiral outward from the Mallow (shaped like the screen; arms 94 px apart
    // under a 120 px wipe, so nothing is missed), wiping at a brisk finger's pace and stepped every
    // WIPE_STEP px like a finger (the same at any frame rate); arcs off the screen are skipped, and
    // past the top it starts again from the Mallow
    alt: { label: WEATHERS.fog.alt.label, hold: true, start() { fogTool._alt = true; fogTool._spiral(0); }, end() { fogTool._alt = false; } },
    _spiral(dt) {
      const b = geo.body, top = geo.skyTop, bot = geo.floorY, W = geo.W, rMax = Math.hypot(W / 2 / 0.6, b.mid - top) + 40;   // reaches the top corners
      let left = dt * 650, guard = 400;
      do {
        const r0 = 36 + 15 * fogTool.spin, ds = Math.min(WIPE_STEP, left || WIPE_STEP);
        fogTool.spin += ds / Math.max(60, r0 * 0.8);
        const r = 36 + 15 * fogTool.spin, a = fogTool.spin - Math.PI / 2;
        if (r > rMax) { fogTool.spin = 0; fogTool.sx = b.cx; fogTool.sy = b.mid - 36; return; }
        const x = b.cx + Math.cos(a) * r * 0.6, y = b.mid + Math.sin(a) * r;
        const on = x > -30 && x < W + 30 && y > top - 30 && y < bot + 30;
        if (dt > 0 && on) { wipe(fogTool.sx, fogTool.sy, x, y, 60); left -= ds; }
        fogTool.sx = x; fogTool.sy = y;
      } while (left > 0 && --guard > 0);
    },
    // arrow keys wipe a band in from that side, a little deeper each press
    nudge(dx, dy) {
      const side = dx < 0 ? 0 : dx > 0 ? 1 : dy < 0 ? 2 : 3, top = geo.skyTop, bot = geo.floorY, W = geo.W;
      const max = side < 2 ? W : bot - top, d = Math.min(max, (fogTool.depth[side] += 46)) - 23;
      for (let k = 0; k < 2; k++) {   // two passes: a band clear enough to see through
        if (side === 0) wipe(d, top, d, bot, 40);
        else if (side === 1) wipe(W - d, top, W - d, bot, 40);
        else if (side === 2) wipe(0, top + d, W, top + d, 40);
        else wipe(0, bot - d, W, bot - d, 40);
      }
    },
    enter() { if (mist.amount < 0.01) fogTool.reset(); },
    reset() { mist.reset(); fogTool.spin = 0; fogTool.depth.fill(0); fogTool._alt = false; },
    step(dt) {
      for (const tr of tracks) if (tr.on && tr.tool === fogTool && tr.kind === 'hold') mist.hold(tr.x, tr.y, dt);   // a clear patch grows
      if (fogTool._alt) fogTool._spiral(dt);
    },
  };

  // ---------------------------------------------------------- warm glow --
  // A drag lays a ribbon of warm light (the trail, drawn by the layer) that kindles the embers it passes.
  const trail = { x: new Float32Array(TRACKS * TRAIL), y: new Float32Array(TRACKS * TRAIL), age: new Float32Array(TRACKS * TRAIL).fill(9),
    brk: new Uint8Array(TRACKS * TRAIL), head: new Uint8Array(TRACKS), n: TRACKS, len: TRAIL, life: TRAIL_LIFE, live: 0 };
  function trailAdd(tr, x, y, brk = 0) {
    const i = tr.i * TRAIL + trail.head[tr.i];
    trail.x[i] = x; trail.y[i] = y; trail.age[i] = 0; trail.brk[i] = brk;
    trail.head[tr.i] = (trail.head[tr.i] + 1) % TRAIL;
  }
  function kindleTo(tr) {
    if (Math.hypot(tr.x - tr.px, tr.y - tr.py) < KINDLE_STEP) return;
    embers.kindleAlong(tr.px, tr.py, tr.x, tr.y, 40);
    trailAdd(tr, tr.x, tr.y);
    tr.px = tr.x; tr.py = tr.y;
  }
  const glowTool = {
    id: 'warm', hearth: false, trail,
    down(tr) { trailAdd(tr, tr.x, tr.y, 1); tr.px = tr.x; tr.py = tr.y; },
    dragStart(tr) { tr.px = tr.x0; tr.py = tr.y0; },
    drag: kindleTo,
    holdStart(tr) { embers.kindleAt(tr.x, tr.y, 60); },
    holdMove: kindleTo,
    tap(tr) { if (embers.kindleAt(tr.x, tr.y, 70) < 0) touch(tr); },
    // "Spread the warmth": the Mallow is the hearth (warm rings kindle embers by radius)
    alt: { label: WEATHERS.warm.alt.label, hold: true, start() { glowTool.hearth = true; }, end() { glowTool.hearth = false; } },
    nudge(dx, dy) { const b = geo.body; embers.kindleNear(b.cx + dx * geo.W * 0.34, b.mid + dy * b.h * 0.9, 2); },
    enter() { if (embers.amount < 0.01) embers.reset(); },
    reset() { embers.reset(); glowTool.hearth = false; },
    step(dt) {
      let live = 0;
      for (let i = 0; i < trail.age.length; i++) if (trail.age[i] < 9) { trail.age[i] += dt; if (trail.age[i] < TRAIL_LIFE) live++; }
      trail.live = live;
    },
  };

  // -------------------------------------------------------------- water --
  // The realm's water (and puddles in dry realms after rain): a drag sends a swell in its direction,
  // a tap a ripple, a hold a rocking swell. Swells are gold in Warm glow.
  const puddleRip = new Float32Array(2).fill(9);   // seconds since each puddle was touched
  function swell(x, vx, k) {
    waves.push(x, vx, k, api.weather() === 'warm');
    api.emit('water-push', x, geo.water ? geo.water[0] + 10 : geo.floorY, k, vx);
  }
  function puddle(tr) { puddleRip[tr.pud] = 0; api.emit('puddle', tr.x, tr.y, tr.pud); }
  const waterTool = {
    id: 'water', side: 1, puddleRip,
    down(tr) { tr.pud = wasWater ? -1 : puddles.hit(tr.x, tr.y); tr.px = tr.x; tr.py = tr.y; },
    dragStart(tr) { tr.px = tr.x0; tr.py = tr.y0; tr.push = Math.hypot(tr.x - tr.x0, tr.y - tr.y0); },
    drag(tr) {
      tr.push += Math.hypot(tr.x - tr.px, tr.y - tr.py);
      tr.px = tr.x; tr.py = tr.y;
      if (tr.pud >= 0) { if (tr.push >= 40) { tr.push = 0; puddle(tr); } return; }
      if (tr.push >= (tr.swells ? SWELL_STEP : SWELL_FIRST)) { tr.push = 0; tr.swells++; swell(tr.x, tr.vx, clamp(Math.hypot(tr.vx, tr.vy) / 900, 0.25, 1)); }
    },
    tap(tr) {
      if (tr.pud >= 0) { puddle(tr); return; }
      waves.ripple(tr.x, 0.6);
      api.emit('water-tap', tr.x, tr.y, 0.6);
    },
    holdStart(tr) { if (tr.pud >= 0) puddle(tr); else waves.rock(tr.x, true); },
    holdMove(tr) { if (tr.pud < 0) waves.rock(tr.x, true); },
    holdEnd(tr) { if (tr.pud < 0) waves.rock(tr.x, false); },
    step(dt) { for (let k = 0; k < 2; k++) if (puddleRip[k] < 9) puddleRip[k] += dt; },
  };

  // during a front: drags push it on (the reveal never runs under 0.5 s); taps still answer
  const front = {
    raw: true,
    move(tr) { api.frontDrag(Math.hypot(tr.vx, tr.vy)); },
    up(tr, v, cancelled) { if (!cancelled && tr.maxDist < POINTER.tapPx) touch(tr); },
  };

  const generic = { id: 'generic', alt: null };
  const LEAD = { sunshine: sunTool, wind: windTool, fog: fogTool, rain: rainTool, storm, moonlight: moonTool, starlight: starsTool, warm: glowTool };
  const ALL = [storm, rainTool, sunTool, moonTool, starsTool, windTool, fogTool, glowTool, waterTool];

  return {
    claim, storm, rain: rainTool, sun: sunTool, moon: moonTool, stars: starsTool, wind: windTool, fog: fogTool, glow: glowTool, water: waterTool,
    trail, puddleRip, breeze,
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
    /** "Push the water": a swell rolls in from one side toward the Mallow (sides alternate). */
    pushWater() {
      if (!api.waterOn()) return false;
      waterTool.side = -waterTool.side;
      const x = waterTool.side < 0 ? 4 : geo.W - 4;
      swell(x, waterTool.side < 0 ? 160 : -160, 0.85);
      return true;
    },
    enter(w) { LEAD[w]?.enter?.(); },
    reset(w) { LEAD[w]?.reset?.(); },
    step(dt) {
      clock += dt;
      const t = now();
      for (const tr of tracks) if (tr.on && !tr.tool.raw && tr.kind === 'pending') decide(tr, t);   // holds begin while still
      for (const T of ALL) T.step?.(dt);
    },
    /** Where a current is being drawn now (the newest Wind finger, else the breeze) into out; false when none. */
    windAt(out) {
      let best = null;
      for (const t of tracks) if (t.on && t.tool === windTool && (!best || t.t0 > best.t0)) best = t;
      if (best) { out.x = best.x; out.y = best.y; return true; }
      if (breeze.on) { out.x = breeze.x; out.y = breeze.y; return true; }
      return false;
    },
    /** The newest weather touch (for the Mallow's gaze) into out; false when none. */
    focus(out) {
      let best = null;
      for (const t of tracks) if (t.on && (!best || t.t0 > best.t0)) best = t;
      if (best) { out.x = best.x; out.y = best.y; return true; }
      if (breeze.on) { out.x = breeze.x; out.y = breeze.y; return true; }
      return false;
    },
    get active() { let n = 0; for (const t of tracks) if (t.on) n++; return n; },
    /** How fast mist is being wiped now (0..1; a finger at rest 0.15, the chip's spiral 0.5), or -1 when it is not (the brush sound). */
    wiping() {
      let s = -1;
      const t = now();
      for (const tr of tracks) if (tr.on && tr.tool === fogTool && tr.kind === 'drag') s = Math.max(s, t - tr.tm > 120 ? 0.15 : clamp(Math.hypot(tr.vx, tr.vy) / 1400, 0.15, 1));
      if (fogTool._alt) s = Math.max(s, 0.5);
      return s;
    },
  };
}
