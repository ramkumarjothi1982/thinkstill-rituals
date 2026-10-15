// World 5 — Noomi's Moonmilk Cove (permission to rest: rest can be a valid response, even with things left to do).
//
// Design note. A sleepy cove under a milky moon (the moonmilk-cove realm is the back layer, its own art language:
// lavender water, a moon path, a pearly shore, a slow lighthouse). On the sand by the water's edge a few little
// shells keep pinging softly: things left to do. Nothing here asks to be fixed, scored or finished.
//
//   · Rest a finger anywhere — still, not moving: a pool of moonmilk blooms under it and spreads in slow breath
//     rings; the whole cove hushes within a moment (the tide laps slower, the clouds and grass settle, the shells
//     stop pinging but stay where they are). Every second of rest fills Noomi's moon, crescent → full.
//   · After the first touch, leaving the cove alone is rest too: doing nothing counts (after 3 s of no touch).
//   · Moving fingers draw moonmilk ribbons that marble and dissolve in the water — busy hands are allowed; they
//     only pause the rest (never take it away) and the tide gets a little busier while they move.
//   · Tapping a shell: it hops and chimes — still there. After real rest, that is the 'waited' discovery.
//   · Tapping a lantern (a photo floating on the far water): it glows warmer and bobs.
//   · The person's Thought Mallow rests in a crescent moon-cradle on the water, words always readable (above it, or
//     below on a short/wide screen). A finger resting on it rests too; the cradle rocks slower as the rest deepens and
//     the thought's tension eases — it is still there, still theirs (never hidden, sunk or solved).
// Emotional arc (the skill's three steps): pick a realistic rest (one minute: a full moon = 60 s of rest, any way
// it comes) → let it be enough (the 'rest' discovery after 15 s of unbroken rest: the shells are still there and that
// was allowed) → then decide what comes next ("Stay as long as you like", or Finish / Drift on).
//
// Touch is deliberately different from the storm (speed of strokes → charge / ground lines) and the ocean (strokes →
// swells that carry): here the main gesture is not moving at all, and progress only ever comes from rest.
//
// Layers: the realm core's own canvas is the back layer (the cradle, the shells, the lanterns, the moonmilk pools and
// ribbons and the moon's phase are drawn into it after each realm frame, under the hero); the front layer (above the
// hero) holds the 2D placeholder thought (when it draws itself), fingertips, rings, motes and the hint.
// Layout: moonmilk-cove-rules.js planCove (the subtitle band stays clear; nothing overlaps the hero or each other).
// Gentle session (after loss or care): no pings, no quips, no Mallow face changes (the shell's concerned face holds),
// plain lanterns for the stand-in Mallow cards. Reduced motion: no rocking, ribbons fade without marbling, breath
// rings become a steady glow, glides become fades.

import { createRealmCore, moodForEmotion } from '../../../world/realm.js';
import { glowSprite, Pool, Rings, clamp, lerp, smoothstep, TAU, makeCanvas, flashEnv } from '../../../world/util.js';
import { PACE } from '../discovery.js';
import { STATUS } from '../registry.js';
import { wrapLines } from '../placeholders.js';
import { COVE, planCove, shoreY, createRestMeter, createRestDetector, createWaitedDetector, createCoveProgress, moonShadow, tideBusy } from './moonmilk-cove-rules.js';

// ------------------------------------------------------------------ registry entry (lab-only until integration) --
/**
 * The registry entry (every REQUIRED_FIELDS field, fits, calm, next, load). Not in WORLDS: the coordinator adds it at
 * integration (status IN_PROGRESS → PLAYABLE there). The dev lab plays it from its own list.
 */
export const MOONMILK_COVE = {
  id: 'moonmilk-cove',
  title: 'Noomi’s Moonmilk Cove',
  version: 1,
  realm: 'moonmilk-cove',
  horizon: COVE.HORIZON,
  palette: { sky: '#2a2668', deep: '#15123d' },
  purpose: 'Let a short rest be enough: rest a finger, or simply do nothing, and the moon fills — the things left to do are still there, and resting was allowed.',
  technique: {
    name: 'Permission to rest (acceptance and self-kindness)',
    related: ['A realistic one-minute rest with no task attached', 'Mental holiday (contemplative inspiration)', 'Empty space and stillness'],
  },
  evidence: {
    classification: 'Moderate – treatment-derived skill',
    skill: 'Permission to Rest',
    basis: 'Rest can be a valid response even if tasks remain; a realistic one-minute rest permission with no productivity task.',
    sources: ['skills.js S.rest'],
    framing: 'Rest is never scored against doing: moving is allowed and only pauses the rest; the shells (things left to do) never vanish, they wait.',
  },
  scene: 'A sleepy crescent cove under a huge milky moon: lavender water, a shimmering moon path, a pearly shore with little pinging shells, a slow lighthouse. '
    + 'Rest fills the moon from a crescent to full; the tide stills to a mirror, more stars come out and a moonmilk aurora unfurls.',
  touch: [
    { gesture: 'Resting a finger still, anywhere', effect: 'A pool of moonmilk blooms under it in slow breath rings; the cove hushes and the moon fills.' },
    { gesture: 'Leaving the cove alone (after the first touch)', effect: 'Counts as rest too: doing nothing fills the moon.' },
    { gesture: 'Moving fingers', effect: 'Draw moonmilk ribbons that marble and dissolve; the tide gets a little busier; rest pauses, never resets.' },
    { gesture: 'Tapping a shell', effect: 'It hops and chimes: still there, waiting.' },
    { gesture: 'Tapping a lantern', effect: 'The photo glows warmer and bobs.' },
    { gesture: 'Resting a finger on the Thought Mallow', effect: 'Rests with it: its cradle rocks slower and its tension eases.' },
  ],
  mallow: { id: 'noomi', behaviour: 'Sleepy and soft; watches the finger, else the thought; grows calmer and sleepier as the moon fills; sighs at the full moon.' },
  input: {
    words: 'The person’s exact words stay on the Thought Mallow resting in a crescent moon-cradle on the water, always readable.',
    photos: { becomes: 'little arched lanterns floating on the far water', change: 'they glow warmer when tapped and as the rest deepens', shape: 'arch', standIn: 'the seven Mallow cards',
      gentle: 'the stand-in cards become plain lantern light in each card’s colour' },
  },
  progression: [
    'The cove starts a little restless with the chosen feeling; the shells ping now and then.',
    'Resting a finger (or leaving the cove alone after the first touch) fills the moon; moving only pauses it.',
    'Discovery: an unbroken rest of 15 s with the things left to do still there.',
    'Natural completion: a full moon (60 s of rest in all); the tide stills to a mirror. It stays playable.',
  ],
  dialogue: {
    intro: ['Mm. The cove’s sleepy tonight.', 'Those little shells keep pinging. Things left to do.'],
    hint: ['Rest a finger anywhere.', 'They’ll wait.'],
    busy: ['Busy hands are allowed too.', 'Rest is here whenever you want it.'],
    thoughtRest: ['Your thought can rest too.', 'Still yours.'],
    half: ['Half a moon.', 'A little at a time counts too.'],
    gentle: {
      intro: ['Somewhere quiet.', 'Rest here as long as you like.'],
      hint: ['You can rest a finger anywhere.'],
      busy: null, half: null,
      thoughtRest: ['It can rest here too.'],
    },
    complete: 'A full moon of rest. What comes next is yours. Stay, or drift on?',
    completeStay: 'A full moon of rest. Stay as long as you like.',
    feeling: {
      more: ['A busier tide tonight.', 'Rest is still here.'],
      less: ['The tide’s settling.', 'The cove heard you.'],
      other: ['Noted. The cove’s listening.'],
    },
  },
  discoveries: {
    rest: { skillId: 'permission-to-rest', lines: ['You rested.', 'The shells are still there.', 'And that was allowed.'] },
    waited: { skillId: null, offer: false, lines: ['Still there.', 'It waited for you.'] },
  },
  sound: {
    ambience: 'moonmilk-cove',
    holds: { hum: 'a low hum while resting, warmer as the rest deepens' },
    fx: ['a soft shimmer when a rest settles', 'a faint drip as a shell pings (never while resting)', 'a glass chime when a shell is tapped', 'a bubble note for a lantern', 'a chime at a discovery', 'bloom at the full moon'],
  },
  haptics: ['soft when a rest settles under the finger', 'light when a shell or a lantern is tapped', 'success at a discovery'],
  completion: {
    rule: 'Rest ≥ 60 s in all (a finger resting still, or no touch for ≥ 3 s after the first touch), then 1.2 s with no finger moving.',
    after: 'The moon stays full, the tide a mirror; resting still blooms moonmilk. Stay as long as you like, or Finish / Drift on.',
  },
  transition: {
    next: null,
    melt: 'In: the mask spreads from the outgoing world’s horizon; the cove’s horizon is 0.5 H. Out: from the cove’s horizon.',
    handoff: 'In: the Thought Mallow glides from where it was into its cradle; photos glide into lanterns. Reduced motion: fades in place. Out: the thought and the lanterns keep their places.',
  },
  memory: { skillId: 'permission-to-rest' },
  accessibility: {
    tapAlt: 'No gesture is needed at all: after one touch, leaving the cove alone fills the moon.',
    reducedMotion: 'No rocking or bobbing, ribbons fade without marbling, breath rings become a steady glow, glides become fades, the hint holds still.',
    lowStimulation: 'Fewer motes and softer ribbons; the realm’s low-stimulation contrast.',
    precision: 'Rest works anywhere on the screen; shells and lanterns have 44 px targets.',
  },
  playtest: { results: [], note: 'Built 15 Oct (lab only); browser-checked with CDP touch (Chromium). Not yet playtested with real users or on a phone.' },
  // lab-only: never offered in production until the coordinator adds it to WORLDS as PLAYABLE (never DEV)
  status: STATUS.IN_PROGRESS,
  // a rest world: calm, quiet, no charge — fit for a gentle session
  calm: true,
  // (owner P1 pattern) nothing follows it until Raindrop Lagoon exists: 'Stay as long as you like' and Finish
  final: true,
  fits: {
    emotions: { overwhelmed: 1, sad: 0.9, anxious: 0.85, lonely: 0.8, restless: 0.7, frustrated: 0.6, angry: 0.5, other: 0.7 },
    intentions: { calm: 1, steady: 0.9, 'let-go': 0.8, distract: 0.6, play: 0.5 },
  },
  next: [],
  load: () => import('./moonmilk-cove.js'),
};

// --------------------------------------------------------------------------------------------- constants --
const C = { milk: '#fff4dc', moon: '#fffaf0', lav: '#b9a6ff', pink: '#ffd2ec', blue: '#bfe6ff', peach: '#ffcfa8', ink: '#15123d', night: '#1a1650' };
const MAX_F = 4;
const RIB_N = 7, RIB_PTS = 56, RIB_STEP = 7, RIB_LIFE = 7;
const POOL_N = 6;
const TAP_PX = 12, TAP_SEC = 0.32;
const GLIDE_SEC = 2.4, COLD_GLIDE_SEC = 1.6, RM_FADE = 0.35;
const HINT_AT = 6, HINT_SEC = 4.2, HINT_EVERY = 14, HINT_MAX = 3;
const INTRO_AT = 2.2;
const TURN_SEC = 16;
const RELAYOUT_TOL = 12;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const normBox = (r) => {
  if (!r || !(r.height > 20) || !(r.width > 20)) return null;
  const left = r.left ?? r.x, top = r.top ?? r.y;
  return { left, top, right: r.right ?? left + r.width, bottom: r.bottom ?? top + r.height, width: r.width, height: r.height };
};
const boxMoved = (a, b, tol) => (!a || !b ? !!a !== !!b : Math.abs(a.left - b.left) > tol || Math.abs(a.right - b.right) > tol || Math.abs(a.top - b.top) > tol || Math.abs(a.bottom - b.bottom) > tol);
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

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
  const reduced = () => !!ctx.reduced;
  const intensity = clamp(ctx.intensity ?? 0.6);
  const line = (k) => { const d = ctx.entry.dialogue || {}; return ctx.gentle && d.gentle && k in d.gentle ? d.gentle[k] : d[k]; };

  // ----------------------------------------------------------------- state --
  let realm = null, plan = null, prepared = false, entered = false, paused = false, complete = false, outroK = 0;
  let elapsed = 0, lastInputAt = -1e9, firstTouchAt = -1, everTouched = false;
  let base = moodForEmotion(ctx.emotion || 'neutral', intensity);
  const meter = createRestMeter(), restD = createRestDetector(), waitD = createWaitedDetector(), prog = createCoveProgress();
  const discovered = new Set();
  let lastP = 0, restNow = 0, busyHands = 0, busyFor = 0, transformK = 0, moonP = 0, completeAt = -1;
  let rs = { rest: 0, p: 0, rate: 0, run: 0, resting: false, mode: 'none' };
  let introAt = INTRO_AT, hint = { next: HINT_AT, shown: 0, age: -1, x: 0, y: 0 };
  const said = { busy: false, thoughtRest: false, half: false };
  let holds = { hum: null }, faceCalm = -1, faceClock = 0, lookClock = 0;
  let melt = null;                        // melting in: { k }
  let restored = null;
  let layoutRest = null, layoutBandB = 0, layoutFreeW = 0, pendingRect = null, pendingFor = 0, relayoutClock = 0;
  let measureG = null, wordsFit = null, plateH = 0, plateW = 0;

  // fingers
  const fingers = Array.from({ length: MAX_F }, () => ({
    on: false, id: -1, x: 0, y: 0, x0: 0, y0: 0, t0: 0, speed: 0, still: 0, moved: 0, onThought: false, shell: -1, lantern: -1,
    pool: -1, rib: -1, lastEv: 0, settled: false, pointerType: 'touch',
  }));
  const fingerFor = (id) => { for (const f of fingers) if (f.on && f.id === id) return f; return null; };
  const stillPx = (f) => (PACE[f.pointerType] || PACE.touch).stillU * U;

  // moonmilk pools (where fingers rest) and ribbons (where they move)
  const pools = Array.from({ length: POOL_N }, () => ({ on: false, x: 0, y: 0, k: 0, a: 0, age: 0, held: false, breath: 0, asp: 0.4 }));
  const ribs = Array.from({ length: RIB_N }, () => ({ on: false, live: false, n: 0, head: 0, x: new Float32Array(RIB_PTS), y: new Float32Array(RIB_PTS), t: new Float32Array(RIB_PTS), w: new Float32Array(RIB_PTS), last: 0 }));
  let ribNext = 0;
  const motes = new Pool(90);
  const rings = new Rings(18);
  const backRings = new Rings(14);
  // shells (things left to do), lanterns (photos), the thought
  let shells = [];
  let lanterns = [], waiting = [], turnClock = 0;
  const tP = { x: 0, y: 0, r: 30, alpha: 0, from: null, glide: 1, glideSec: GLIDE_SEC, rock: 0, rockV: 0, ph: 0, tension: 0.55, base: null, calm: 0, rmPhase: 0, drawS: 0, held: false, shownX: 0, shownY: 0 };
  const hero = { ok: false, cx: 0, top: 0 };

  // sprites (made once per size)
  let spr = null, cradleSpr = null, cradleKey = '', shellSpr = null, shellKey = '', shadowSpr = null, shadowKey = '';

  // ----------------------------------------------------------- layout --
  let boxFrame = -1, boxCache = null, frameNo = 0;
  function mallowBox() {
    if (boxFrame === frameNo) return boxCache;
    boxFrame = frameNo;
    try { boxCache = normBox(mallow?.restRect?.() || mallow?.rect?.() || mallow?.bodyRect?.()); } catch { boxCache = null; }
    return boxCache;
  }
  const bandBottom = () => (ctx.band?.y || 0) + (ctx.band?.h || 0);
  const freeW = () => (Number.isFinite(ctx.freeW) && ctx.freeW > 0 ? Math.min(W, ctx.freeW) : W);
  const wordsLayer = () => (thought && !thought.draw && ctx.thoughtLayer?.plateFor ? ctx.thoughtLayer : null);
  const layerDrawn = () => !!thought && !thought.draw;

  /** The words plate (w, h) the thought will show: W2's layer measures it; else 17 → 15 px on ≤ 2 lines at 210 px. */
  function measurePlate(r) {
    const tok = thought ? (thought.token || words?.token || '') : '';
    wordsFit = null;
    if (!tok) return null;
    const L = wordsLayer();
    if (L) {
      const maxW = Math.min(232, freeW() - 2 * COVE.EDGE);
      let P = null;
      try { P = L.plateFor(thought, { lines: 2, maxW, r, z: 0 }); } catch { P = null; }
      if (P && P.w > 0 && P.h > 0) {
        wordsFit = { lines: 2, maxW };
        // (the layer keeps more room between the thought and its words than this world's own 4 px: plan with it)
        const pad = Math.max(0, Math.ceil(Math.max(P.above || 0, P.below || 0) - (r + COVE.LABEL_GAP)));
        return { w: Math.ceil(P.w), h: Math.ceil(P.h) + pad };
      }
    }
    try {
      measureG ||= makeCanvas(4, 4).getContext('2d');
      for (const px of [17, 16, 15]) {
        measureG.font = ctx.font(px, 700);
        const ls = wrapLines(measureG, tok, 210);
        if (ls.length <= 2 || px === 15) {
          const n = Math.min(2, ls.length);
          let tw = 0; for (let k = 0; k < n; k++) tw = Math.max(tw, measureG.measureText(ls[k]).width);
          return { w: Math.ceil(tw + 24), h: Math.ceil(n * 21.25 + 16) };
        }
      }
    } catch { /* estimate below */ }
    return { w: Math.min(234, tok.length * 9 + 24), h: 58 };
  }

  function layout(first = true) {
    frameNo++;
    const rest = mallowBox();
    layoutRest = rest; layoutBandB = bandBottom(); layoutFreeW = freeW();
    const rGuess = Math.max(22, Math.min(34, U * 0.085));
    const pl = measurePlate(rGuess);
    plateW = pl?.w || 0; plateH = pl?.h || 0;
    const n = Math.min(7, photos?.n || 0);
    plan = planCove({ W, H, band: ctx.band, mallow: rest, x1: layoutFreeW, plate: pl, n });
    hero.ok = true; hero.cx = (plan.M.x0 + plan.M.x1) / 2; hero.top = plan.M.y0;
    tP.r = plan.home.r;
    // shells: keep their clocks across a re-plan
    const old = shells;
    shells = plan.shells.map((q, k) => {
      const o = old[k];
      return o ? Object.assign(o, { tx: q.x, ty: q.y, s: q.s, hit: q.hit }) : { x: q.x, y: q.y, tx: q.x, ty: q.y, s: q.s, hit: q.hit, ping: 2 + k * 2.3 + R() * 2, pingAge: -1, hop: 0, hopV: 0, glow: 0, born: elapsed, ph: R() * TAU };
    });
    if (first || reduced()) for (const s of shells) { s.x = s.tx; s.y = s.ty; }
    // lanterns: the slots for this plan
    assignLanterns(first);
    placeHint();
    buildSprites();
  }

  function relayoutCheck(dt) {
    relayoutClock += dt;
    if (relayoutClock < 0.25) return;
    const step = relayoutClock; relayoutClock = 0;
    frameNo++;
    const r = mallowBox();
    const changed = boxMoved(r, layoutRest, RELAYOUT_TOL) || Math.abs(bandBottom() - layoutBandB) > 4 || Math.abs(freeW() - layoutFreeW) > 4;
    if (!changed) { pendingRect = null; pendingFor = 0; return; }
    // wait until the move has settled (the shell glides its Mallow for 720 ms), or 2 s at most
    pendingFor += step;
    if (pendingRect && boxMoved(r, pendingRect, 8) && pendingFor < 2) pendingFor = Math.min(pendingFor, step);
    pendingRect = r;
    if (pendingFor >= 0.5) { pendingRect = null; pendingFor = 0; layout(false); }
  }

  function placeHint() {
    if (!plan) return;
    // the clear spot nearest the moon path on the water (else on the sand): clear of the thought, its words, the hero,
    // the band, the lanterns and the shells
    const sh = shoreY(W, H, plan.moon.x), gx = plan.moon.x, gy = plan.hy + 0.38 * (sh - plan.hy);
    const rx = 44, ry = 26;
    const obs = [plan.rects.thought, plan.rects.plate, plan.rects.hero, plan.rects.band].filter(Boolean);
    for (const L of lanterns) obs.push({ x0: L.tx - L.D / 2, y0: L.ty - L.D * 0.62, x1: L.tx + L.D / 2, y1: L.ty + L.D * 0.62 });
    for (const q of shells) obs.push({ x0: q.tx - q.hit, y0: q.ty - q.hit, x1: q.tx + q.hit, y1: q.ty + q.hit });
    let best = null;
    // (never below the hero's feet: the shell's bottom controls live there)
    for (let y = plan.hy + ry; y <= Math.min(plan.floor - ry - 30, plan.M.y1 - ry); y += 6) {
      for (let x = rx; x <= plan.x1 - rx; x += 6) {
        let bad = false;
        for (const o of obs) if (x + rx > o.x0 && x - rx < o.x1 && y + ry > o.y0 && y - ry < o.y1) { bad = true; break; }
        if (bad) continue;
        const d = Math.hypot((x - gx) / W, (y - gy) / H) + (y > shoreY(W, H, x) ? 0.2 : 0);
        if (!best || d < best.d) best = { x, y, d };
      }
    }
    hint.ok = !!best;
    if (best) { hint.x = best.x; hint.y = best.y; }
  }

  // ------------------------------------------------------------ sprites --
  function buildSprites() {
    if (!spr) {
      spr = {
        milk: glowSprite(C.milk, { size: 128, core: 0.45 }), milkSoft: glowSprite(C.milk, { size: 128 }), lav: glowSprite(C.lav, { size: 128 }),
        pink: glowSprite(C.pink, { size: 64, core: 0.6 }), gold: glowSprite('#ffcf7a', { size: 64, core: 0.55 }), goldCore: glowSprite('#fff0c8', { size: 32, core: 0.85 }), blue: glowSprite(C.blue, { size: 64, core: 0.6 }), peach: glowSprite(C.peach, { size: 128 }),
        dot: glowSprite('#fff8ea', { size: 32, core: 0.8 }), dotLav: glowSprite('#e6dcff', { size: 32, core: 0.75 }), dotPink: glowSprite('#ffe0f4', { size: 32, core: 0.75 }),
      };
      spr.motes = [spr.dot, spr.dotLav, spr.dotPink];
    }
    const d = Math.min(2, Math.max(1, ctx.dpr || 1));
    // the crescent cradle (a moon-boat), sized for the thought's radius
    const key = `${Math.round(tP.r)}|${d}`;
    if (key !== cradleKey) { cradleKey = key; cradleSpr = makeCradle(tP.r, d); }
    const s0 = shells[0]?.s || 16, skey = `${Math.round(s0)}|${d}`;
    if (skey !== shellKey) { shellKey = skey; shellSpr = makeShell(s0, d); }
    const mr = plan.moon.r, mkey = `${Math.round(mr)}|${d}`;
    if (mkey !== shadowKey) { shadowKey = mkey; shadowSpr = makeShadow(mr, d); }
  }
  function makeCradle(r, d) {
    const w = r * 2.9, h = r * 1.25, c = makeCanvas(Math.ceil(w * d), Math.ceil(h * d)), g = c.getContext('2d');
    g.scale(d, d);
    const cx = w / 2, top = h * 0.12;
    // a crescent: the lower arc of a big circle minus a flatter one above it
    const R1 = w * 0.48, cy1 = top + h * 0.82 - R1, R2 = w * 0.56, cy2 = cy1 - h * 0.62;
    g.save();
    g.beginPath(); g.arc(cx, cy1, R1, 0.06 * Math.PI, 0.94 * Math.PI); g.arc(cx, cy2, R2, 0.86 * Math.PI, 0.14 * Math.PI, true); g.closePath();
    const gr = g.createLinearGradient(0, top, 0, h);
    gr.addColorStop(0, '#fff7e6'); gr.addColorStop(0.35, '#e9ddff'); gr.addColorStop(0.75, '#a993e6'); gr.addColorStop(1, '#6d5bb8');
    g.fillStyle = gr; g.fill();
    // pearly sheen and a warm rim along the inner edge
    g.clip();
    const sh = g.createRadialGradient(cx - w * 0.18, top + h * 0.45, 0, cx - w * 0.18, top + h * 0.45, w * 0.32);
    sh.addColorStop(0, 'rgba(255,255,255,0.55)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.restore();
    g.strokeStyle = 'rgba(255,240,210,0.85)'; g.lineWidth = 1.4;
    g.beginPath(); g.arc(cx, cy2, R2, 0.84 * Math.PI, 0.16 * Math.PI, true); g.stroke();
    g.strokeStyle = 'rgba(80,60,150,0.45)'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy1, R1 - 0.5, 0.08 * Math.PI, 0.92 * Math.PI); g.stroke();
    // a tiny star hanging at the prow
    const sx = cx + w * 0.42, sy = top + h * 0.22;
    g.fillStyle = 'rgba(255,236,190,0.95)';
    g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.05 : r * 0.12; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } g.closePath(); g.fill();
    c.cssW = w; c.cssH = h; c.ox = cx; c.oy = top + h * 0.3;        // (the point the thought rests on)
    return c;
  }
  function makeShell(s, d) {
    // a little spiral conch, warm cream and peach (the realm's own shells are pink scallops: these are the cove's
    // things left to do, and read differently), lying on its side with a soft shadow on the sand
    const S = s * 2.6, c = makeCanvas(Math.ceil(S * d), Math.ceil(S * d)), g = c.getContext('2d');
    g.scale(d, d);
    const cx = S * 0.5, cy = S * 0.62;
    g.fillStyle = 'rgba(12,8,40,0.24)'; g.beginPath(); g.ellipse(cx + s * 0.05, cy + s * 0.42, s * 1.0, s * 0.2, 0, 0, TAU); g.fill();
    g.save(); g.translate(cx, cy); g.rotate(-0.28);
    // the body: a tapering cone to the left, the whorl to the right
    g.beginPath();
    g.moveTo(-s * 1.0, s * 0.02);
    g.quadraticCurveTo(-s * 0.4, -s * 0.5, s * 0.25, -s * 0.52);
    g.bezierCurveTo(s * 0.85, -s * 0.55, s * 0.95, s * 0.35, s * 0.35, s * 0.42);
    g.quadraticCurveTo(-s * 0.35, s * 0.42, -s * 1.0, s * 0.02);
    g.closePath();
    const gr = g.createLinearGradient(0, -s * 0.55, 0, s * 0.45);
    gr.addColorStop(0, '#fff8ea'); gr.addColorStop(0.45, '#ffd9b8'); gr.addColorStop(1, '#c79bd8');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(120,70,140,0.35)'; g.lineWidth = 0.9; g.stroke();
    // the whorl's spiral and the growth bands
    g.strokeStyle = 'rgba(150,90,150,0.5)'; g.lineWidth = 1;
    g.beginPath();
    for (let k = 0; k <= 26; k++) { const a = k * 0.42, rr = s * 0.42 * (1 - k / 30); const x = s * 0.42 + Math.cos(a) * rr * 0.9, y = -s * 0.02 + Math.sin(a) * rr * 0.85; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    g.strokeStyle = 'rgba(150,90,150,0.28)';
    for (let k = 1; k <= 3; k++) { const x = -s * 0.2 * k; g.beginPath(); g.moveTo(x + s * 0.05, -s * (0.42 - 0.1 * k)); g.quadraticCurveTo(x - s * 0.08, 0, x + s * 0.02, s * (0.36 - 0.06 * k)); g.stroke(); }
    // its pearly lip and a highlight
    g.fillStyle = 'rgba(255,210,236,0.85)'; g.beginPath(); g.ellipse(s * 0.32, s * 0.3, s * 0.32, s * 0.1, -0.1, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-s * 0.15, -s * 0.3, s * 0.3, s * 0.07, -0.25, 0, TAU); g.fill();
    g.restore();
    c.cssW = S; c.cssH = S; c.ox = cx; c.oy = cy; c.bead = { x: cx + s * 0.1, y: cy - s * 1.15 };
    return c;
  }
  function makeShadow(mr, d) {
    // the moon's dark side: night blue with a soft terminator (a little earthshine shows through)
    const S = mr * 2.2, c = makeCanvas(Math.ceil(S * d), Math.ceil(S * d)), g = c.getContext('2d');
    g.scale(d, d);
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, mr * 1.08);
    rg.addColorStop(0, 'rgba(46,36,118,0.97)'); rg.addColorStop(0.62, 'rgba(62,50,146,0.95)'); rg.addColorStop(0.86, 'rgba(84,70,170,0.9)'); rg.addColorStop(1, 'rgba(96,82,184,0)');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    // a whisper of earthshine on the dark side
    const es = g.createRadialGradient(S / 2 + mr * 0.25, S / 2 - mr * 0.2, 0, S / 2, S / 2, mr);
    es.addColorStop(0, 'rgba(200,190,255,0.10)'); es.addColorStop(1, 'rgba(200,190,255,0)');
    g.fillStyle = es; g.beginPath(); g.arc(S / 2, S / 2, mr, 0, TAU); g.fill();
    c.cssW = S; c.cssH = S;
    return c;
  }

  // ------------------------------------------------------------ lanterns --
  function newLantern(i, slot) { return { i, x: slot.x, y: slot.y, tx: slot.x, ty: slot.y, D: slot.D, alpha: 0, show: 1, glow: 0, bob: R() * TAU, from: null, glide: 1, hop: 0, hopV: 0, leaving: false }; }
  function assignLanterns(first) {
    const n = Math.min(7, photos?.n || 0);
    if (!n) { lanterns = []; waiting = []; return; }
    const slots = plan.slots;
    if (first && !lanterns.length) {
      lanterns = slots.map((sl, k) => newLantern(k, sl));
      waiting = []; for (let k = slots.length; k < n; k++) waiting.push(k);
      return;
    }
    // a re-plan: lanterns move to the new slots (eased), extras wait their turn
    const keep = lanterns.filter((L) => !L.leaving);
    for (let k = 0; k < keep.length; k++) {
      const L = keep[k], sl = slots[k];
      if (!sl) { waiting.push(L.i); L.leaving = true; continue; }
      L.tx = sl.x; L.ty = sl.y; L.D = sl.D;
      if (reduced()) { L.x = L.tx; L.y = L.ty; }
    }
    for (let k = keep.length; k < slots.length && waiting.length; k++) lanterns.push(Object.assign(newLantern(waiting.shift(), slots[k]), { alpha: 0 }));
  }

  // ------------------------------------------------------------- prepare --
  async function prepare() {
    if (prepared) return;
    realm = createRealmCore('moonmilk-cove', { W, H, dpr: ctx.dprBack, mood: base, reducedMotion: reduced(), lowStimulation: ctx.lowStim, quality: 'auto' });
    realm.build();
    layout(true);
    tP.x = plan.home.x; tP.y = plan.home.y;
    // warm the lantern sprites so the first frame never stalls
    // (not the stand-in cards' faces in a gentle session: they are never drawn there)
    if (photos?.n && !(ctx.gentle && photos.standIn)) {
      const scratch = makeCanvas(8, 8).getContext('2d');
      for (let i = 0; i < Math.min(7, photos.n); i++) photos.draw(scratch, i, 4, 4, 48, { shape: 'arch', shadow: false });
    }
    try { await ctx.fontsReady?.(['voice'], 900); } catch { /* the fallback font is fine */ }
    prepared = true;
    frame(0, 0);
  }

  // --------------------------------------------------------------- input --
  function hitThought(x, y) {
    if (!thought || tP.alpha < 0.3) return false;
    if (thought.hitTest) { try { if (thought.hitTest(x, y)) return true; } catch { /* placeholder */ } }
    if (onWords(thought, x, y)) return false;
    return Math.hypot(x - tP.x, y - tP.y) < tP.r * 1.3;
  }
  function shellAt(x, y) {
    let best = -1, bd = 1e9;
    shells.forEach((s, k) => { const d = Math.hypot(x - s.x, y - (s.y - s.s * 0.3)); if (d < s.hit && d < bd) { bd = d; best = k; } });
    return best;
  }
  function lanternAt(x, y) {
    for (let k = lanterns.length - 1; k >= 0; k--) { const L = lanterns[k]; if (L.alpha > 0.4 && Math.abs(x - L.x) < Math.max(22, L.D / 2 + 4) && Math.abs(y - L.y) < Math.max(22, L.D * 0.62 + 4)) return k; }
    return -1;
  }

  function pointer(s) {
    if (paused || !prepared) return;
    if (s.type === 'down') {
      const f = fingers.find((q) => !q.on);
      if (!f) return;
      Object.assign(f, { on: true, id: s.id, x: s.x, y: s.y, x0: s.x, y0: s.y, t0: elapsed, speed: 0, still: 0, moved: 0, lastEv: elapsed, settled: false, pointerType: s.pointerType || 'touch', rib: -1, pool: -1 });
      f.onThought = hitThought(s.x, s.y);
      f.shell = f.onThought ? -1 : shellAt(s.x, s.y);
      f.lantern = f.onThought || f.shell >= 0 ? -1 : lanternAt(s.x, s.y);
      if (!everTouched) { everTouched = true; firstTouchAt = elapsed; }
      lastInputAt = elapsed; hint.age = -1; hint.next = 1e9; introAt = -1;
      // micro-feedback on the very first frame
      rings.add(s.x, s.y, 3, 22, 0.6, s.y > plan.hy ? 0.45 : 1, f.onThought ? C.pink : C.milk, 0.5, 1.3);
      if (f.onThought) { try { thought?.react?.('squeeze'); thought?.pointer?.(s); } catch { /* optional */ } }
      return;
    }
    const f = fingerFor(s.id);
    if (!f) return;
    if (s.type === 'move') {
      f.lastEv = elapsed;
      if (s.idle) { f.speed = s.speed; return; }
      const dx = s.x - f.x, dy = s.y - f.y, d = Math.hypot(dx, dy);
      f.x = s.x; f.y = s.y; f.speed = s.speed; f.moved += d;
      lastInputAt = elapsed;
      if (f.onThought) { try { thought?.pointer?.(s); } catch { /* optional */ } return; }
      // a moving finger draws moonmilk in the water (once it has really set off: a resting finger's tremor draws nothing)
      if (f.moved > TAP_PX && f.speed > stillPx(f) * 1.5) {
        if (f.rib < 0) f.rib = startRibbon(f.x0, f.y0);
        addRibPoint(ribs[f.rib], s.x, s.y, f.speed);
        // a quick flick splashes a few droplets of milk
        if (f.speed > 1.6 * U && R() < 0.35) { const a = R() * TAU; motes.spawn(s.x, s.y, Math.cos(a) * 40 + (s.vx || 0) * 0.05, Math.sin(a) * 30 - 20, 0.7 + R() * 0.4, 2 + R() * 2, (R() * 3) | 0, 0.7); }
        // a finger that set off leaves its pool behind (it lingers and fades)
        if (f.pool >= 0) { pools[f.pool].held = false; f.pool = -1; }
      }
      return;
    }
    if (s.type === 'up' || s.type === 'cancel') {
      const tap = s.type === 'up' && f.moved < TAP_PX && elapsed - f.t0 < TAP_SEC;
      if (f.onThought) { try { thought?.pointer?.(s); thought?.react?.('release'); } catch { /* optional */ } }
      if (tap) tapAt(f, s.x, s.y);
      if (f.rib >= 0) { ribs[f.rib].live = false; f.rib = -1; }
      if (f.pool >= 0) { pools[f.pool].held = false; f.pool = -1; }
      f.on = false; f.id = -1; f.onThought = false;
      lastInputAt = elapsed;
    }
  }

  function tapAt(f, x, y) {
    if (f.shell >= 0) {
      const sh = shells[f.shell];
      if (!sh) return;
      sh.hopV += reduced() ? 0 : 5.5; sh.glow = 1;
      backRings.add(sh.x, sh.y - sh.s * 0.3, 4, sh.s * 2.6, 1.2, 0.42, C.pink, 0.6, 1.4);
      ctx.sound('glass', { intensity: 0.3, pan: clamp((x / W) * 2 - 1, -1, 1) });
      ctx.haptic('light');
      const ev = waitD.touch(meter.rest, elapsed - sh.born);
      if (ev) foundIt(ev);
      return;
    }
    if (f.lantern >= 0) {
      const L = lanterns[f.lantern];
      if (!L) return;
      L.glow = 1; L.hopV += reduced() ? 0 : 3.2;
      ctx.sound('bubble', { intensity: 0.28 });
      ctx.haptic('light');
      return;
    }
    if (f.onThought) return;
    realm?.pulse('tap', { x, y });
  }

  function startRibbon(x, y) {
    let k = -1;
    for (let j = 0; j < RIB_N; j++) { const q = (ribNext + j) % RIB_N; if (!ribs[q].on) { k = q; break; } }
    if (k < 0) k = ribNext;
    ribNext = (k + 1) % RIB_N;
    const rb = ribs[k];
    rb.on = true; rb.live = true; rb.n = 0; rb.head = 0; rb.last = elapsed;
    addRibPoint(rb, x, y, 0, true);
    return k;
  }
  function addRibPoint(rb, x, y, speed, force = false) {
    if (!force && rb.n) {
      const j = (rb.head + rb.n - 1) % RIB_PTS;
      if (Math.hypot(x - rb.x[j], y - rb.y[j]) < RIB_STEP) return;
    }
    const i = (rb.head + rb.n) % RIB_PTS;
    rb.x[i] = x; rb.y[i] = y; rb.t[i] = elapsed;
    // slow strokes lay a wider, softer ribbon; quick ones a thin bright thread
    rb.w[i] = clamp(6 - speed / U * 2.2, 1.6, 6);
    if (rb.n < RIB_PTS) rb.n++; else rb.head = (rb.head + 1) % RIB_PTS;
    rb.last = elapsed;
  }

  // ------------------------------------------------------------- update --
  function update(dt) {
    const rm = reduced();
    // fingers: who is resting, who is moving
    let still = 0, moving = false, down = 0, onThoughtResting = false;
    for (const f of fingers) {
      if (!f.on) continue;
      down++;
      // driven without the director's idle events: a finger with no news for 0.25 s is slowing to a stop
      if (elapsed - f.lastEv > 0.25 && f.speed > 0) { f.speed *= Math.exp(-dt / 0.12); if (f.speed < 0.5) f.speed = 0; }
      const sp = stillPx(f);
      if (f.speed < sp) f.still += dt; else if (f.speed > sp * 1.5) f.still = 0;
      if (f.speed > sp * 1.5) moving = true;
      const resting = f.still >= COVE.STILL_SETTLE;
      if (resting) {
        still++;
        if (f.onThought) onThoughtResting = true;
        if (f.pool < 0) {
          f.pool = startPool(f.x, f.y);
          if (!f.settled) { f.settled = true; ctx.haptic('soft'); ctx.sound('shimmer', { intensity: 0.18 }); }
        }
        const P = pools[f.pool];
        // (a resting finger that drifts a little carries its pool; a real move left it behind already)
        P.x += (f.x - P.x) * Math.min(1, dt * 6); P.y += (f.y - P.y) * Math.min(1, dt * 6);
      }
    }
    busyHands += ((moving ? 1 : 0) - busyHands) * (1 - Math.exp(-dt / (moving ? 0.35 : 1.4)));
    if (moving && meter.rest < 2) busyFor += dt;
    rs = meter.update(dt, { down, still, moving, sinceInput: elapsed - lastInputAt, touched: everTouched });
    restNow += ((rs.resting ? 1 : 0) - restNow) * (1 - Math.exp(-dt / (rs.resting ? 1.1 : 0.8)));
    const pr = prog.update(dt, { rest: rs.rest, moving });
    lastP = pr.p;
    moonP += (rs.p - moonP) * (1 - Math.exp(-dt / (rm ? 0.3 : 0.9)));
    if (pr.complete && !complete) finishCove();
    // discoveries
    const ev = restD.update({ ...rs, shells: shells.length });
    if (ev) foundIt(ev);
    // lines (once each; only from the cove on stage)
    if (!said.busy && busyFor > 6 && !complete) { said.busy = true; say(line('busy')); }
    if (!said.thoughtRest && onThoughtResting && !complete) {
      const f = fingers.find((q) => q.on && q.onThought);
      if (f && f.still > 2) { said.thoughtRest = true; say(line('thoughtRest')); }
    }
    if (!said.half && rs.p >= 0.5 && !complete && !restD.fired && !discoveryJustNow()) { said.half = true; say(line('half')); if (!ctx.gentle && !rm) { try { mallow?.react?.('yawn'); } catch { /* optional */ } } }
    // the realm: the feeling's own mood, hushed by rest now and rest so far; busier while hands move
    if (realm) {
      const ag = base.agitation, busy = tideBusy(ag, restNow, moonP, busyHands);
      realm.setMood({
        agitation: clamp(busy * 0.9 * (0.4 + 0.6 * ag) + 0.05),
        heaviness: clamp(base.heaviness * (1 - 0.6 * moonP) * (1 - 0.3 * restNow)),
        clarity: clamp(lerp(base.clarity, 0.88, moonP) + 0.06 * restNow),
        warmth: clamp(lerp(base.warmth, 0.72, moonP) + 0.08 * restNow),
      }, { tau: rs.resting ? 1.1 : 0.7 });
      const tk = complete ? 1 : 0.82 * moonP + 0.1 * restNow;
      if (Math.abs(tk - transformK) > 0.004) { transformK = tk; realm.transform(tk, { tau: 1.4 }); }
    }
    // Noomi: sleepier as the moon fills (never in a gentle session: the shell's face holds)
    if (!ctx.gentle && mallow?.setEmotion) {
      const c = Math.round(clamp(0.35 + 0.65 * Math.max(moonP, restNow * 0.8)) * 10) / 10;
      faceClock += dt;
      if (c !== faceCalm || faceClock > 2.5) { faceCalm = c; faceClock = 0; try { mallow.setEmotion({ calm: c, curious: 1 - c }, 0.55); } catch { /* optional */ } }
    }
    lookClock += dt;
    if (mallow?.lookAt && lookClock > 0.12) {
      lookClock = 0;
      const f = fingers.find((q) => q.on);
      const tx = f ? f.x : thought ? tP.x : null, ty = f ? f.y : thought ? tP.y : null;
      if (tx != null) { const cy = hero.top + 60; try { mallow.lookAt(clamp((tx - hero.cx) / (W * 0.5), -1, 1), clamp((ty - cy) / (H * 0.5), -1, 1)); } catch { /* optional */ } }
    }
    // the hum while resting
    if (rs.resting && !holds.hum && !paused) holds.hum = ctx.hold('hum', { intensity: 0.04, pitch: 0.6 });
    if (holds.hum) {
      holds.hum.update?.({ intensity: clamp(0.03 + 0.1 * restNow + 0.04 * moonP) * (1 - outroK), pitch: 0.58 + 0.06 * moonP });
      if (!rs.resting && restNow < 0.05) { holds.hum.stop(); holds.hum = null; }
    }
    updateThought(dt, rm, onThoughtResting);
    updateShells(dt, rm);
    updateLanterns(dt, rm);
    updatePools(dt, rm);
    updateRibbons(dt, rm);
    motes.update(dt, -6, 0.4);
    rings.update(dt); backRings.update(dt);
    // the intro line, then the hint (a ghost fingertip resting) until the first touch
    if (introAt > 0 && elapsed >= introAt) { introAt = -1; say(line('intro')); }
    if (!everTouched && !complete && hint.ok) {
      if (hint.age < 0 && elapsed >= hint.next && hint.shown < HINT_MAX) {
        hint.age = 0; hint.shown++;
        hint.next = elapsed + HINT_EVERY;
        if (hint.shown === 1) say(line('hint'));
      }
      if (hint.age >= 0) { hint.age += dt; if (hint.age > HINT_SEC) hint.age = -1; }
    } else hint.age = -1;
  }
  let lastDiscoveryAt = -9;
  const discoveryJustNow = () => elapsed - lastDiscoveryAt < 6;
  function say(lines) { if (lines && lines.length && !paused) ctx.say(lines, { kind: 'dialogue' }); }

  function foundIt(ev) {
    if (discovered.has(ev.id)) return;
    discovered.add(ev.id);
    lastDiscoveryAt = elapsed;
    ctx.sound('chime', { intensity: 0.3 });
    const m = plan.moon;
    backRings.add(m.x, m.y, m.r * 1.05, m.r * 2.2, 2.6, 1, C.milk, 0.4, 1.6);
    ctx.discover(ev.id, ev.evidence);
  }

  function finishCove() {
    complete = true; completeAt = elapsed;
    try { mallow?.react?.('sigh'); } catch { /* optional */ }
    try { thought?.settle?.(1); } catch { /* optional */ }
    ctx.sound('bloom', { intensity: 0.3 });
    const m = plan.moon;
    backRings.add(m.x, m.y, m.r, m.r * 2.8, 3.2, 1, C.milk, 0.5, 1.8);
    if (!reduced()) backRings.add(m.x, m.y, m.r, m.r * 3.6, 4.2, 1, C.lav, 0.3, 1.4);
  }

  // ---- pools
  function startPool(x, y) {
    let k = pools.findIndex((p) => !p.on);
    if (k < 0) { k = 0; for (let j = 1; j < POOL_N; j++) if (!pools[j].held && pools[j].a < pools[k].a) k = j; }
    Object.assign(pools[k], { on: true, x, y, k: 0, a: 0, age: 0, held: true, breath: 0, asp: y > plan.hy + 4 ? 0.36 + 0.14 * clamp((y - plan.hy) / (H - plan.hy)) : 0.82 });
    return k;
  }
  function updatePools(dt, rm) {
    for (const P of pools) {
      if (!P.on) continue;
      P.age += dt;
      if (P.held) { P.k = Math.min(1, P.k + dt / 5); P.a = Math.min(1, P.a + dt / 0.6); P.breath += dt; }
      else { P.a -= dt / 2.4; if (P.a <= 0) { P.on = false; continue; } }
      P.asp = P.y > plan.hy + 4 ? 0.36 + 0.14 * clamp((P.y - plan.hy) / (H - plan.hy)) : 0.82;
      // slow breath rings (every 4.5 s, the pace of a resting breath) — reduced motion: the glow breathes instead
      if (P.held && !rm && P.breath >= 4.5) {
        P.breath = 0;
        const rr = (0.05 + 0.17 * easeOut(P.k)) * U;
        backRings.add(P.x, P.y, rr * 0.4, rr * 1.35, 3.6, P.asp, C.milk, 0.42, 1.4);
      }
      // motes rise slowly from a resting pool (fireflies of rest)
      if (P.held && R() < dt * (ctx.lowStim ? 0.5 : 1.3) * P.a) {
        const rr = (0.05 + 0.17 * easeOut(P.k)) * U, a = R() * TAU;
        motes.spawn(P.x + Math.cos(a) * rr * 0.7, P.y + Math.sin(a) * rr * P.asp * 0.7, (R() - 0.5) * 6, -10 - R() * 10, 2.4 + R() * 1.6, 2 + R() * 2.5, (R() * 3) | 0, 0.75);
      }
    }
  }
  // ---- ribbons: marble (a gentle curl field) and dissolve
  function updateRibbons(dt, rm) {
    for (const rb of ribs) {
      if (!rb.on) continue;
      if (!rb.live && elapsed - rb.last > RIB_LIFE) { rb.on = false; continue; }
      if (rm || dt <= 0) continue;
      for (let m = 0; m < rb.n; m++) {
        const i = (rb.head + m) % RIB_PTS, age = elapsed - rb.t[i];
        const k = Math.min(1, age / 3) * dt * 7;
        rb.x[i] += Math.sin(rb.y[i] * 0.021 + elapsed * 0.35 + m * 0.07) * k;
        rb.y[i] += Math.cos(rb.x[i] * 0.017 - elapsed * 0.28) * k * 0.45;
      }
    }
  }

  // ---- shells: they ping now and then (things left to do); resting hushes them (they stay put)
  function updateShells(dt, rm) {
    const hushK = clamp(restNow * 1.4 + (complete ? 1 : 0));
    for (const s of shells) {
      if (rm) { s.x = s.tx; s.y = s.ty; } else { s.x += (s.tx - s.x) * Math.min(1, dt * 4); s.y += (s.ty - s.y) * Math.min(1, dt * 4); }
      s.hopV += (-60 * s.hop - 7 * s.hopV) * dt; s.hop += s.hopV * dt;
      s.glow = Math.max(0, s.glow - dt / 1.6);
      if (s.pingAge >= 0) { s.pingAge += dt; if (s.pingAge > 1.6) s.pingAge = -1; }
      if (ctx.gentle) continue;
      s.ping -= dt * (1 - hushK);
      if (s.ping <= 0 && hushK < 0.5) {
        s.ping = 6 + R() * 4 - 2 * clamp(base.agitation);
        s.pingAge = 0;
        if (!rm) backRings.add(s.x + s.s * 0.1, s.y - s.s * 1.15, 2, s.s * 1.7, 1.4, 1, '#ffd89a', 0.5, 1.1);
        ctx.sound('drip', { intensity: 0.12, note: (shells.indexOf(s) * 2) % 5 });
      } else if (s.ping <= 0) s.ping = 1.5;
    }
  }

  // ---- lanterns: glide in, bob, take turns when there are more photos than room
  function updateLanterns(dt, rm) {
    const n = lanterns.length;
    if (!n) return;
    const bobK = rm ? 0 : tideBusy(base.agitation, restNow, moonP, busyHands);
    for (const L of lanterns) {
      if (L.from) {
        L.glide = Math.min(1, L.glide + dt / L.from.sec);
        if (L.glide >= 1) L.from = null;
      }
      if (rm) { L.x = L.tx; L.y = L.ty; } else { L.x += (L.tx - L.x) * Math.min(1, dt * 3); L.y += (L.ty - L.y) * Math.min(1, dt * 3); }
      L.bob += dt * (0.6 + 0.9 * bobK);
      L.hopV += (-40 * L.hop - 6 * L.hopV) * dt; L.hop += L.hopV * dt;
      L.glow = Math.max(0, L.glow - dt / 2.2);
      const want = L.leaving ? 0 : 1;
      L.alpha += (want - L.alpha) * Math.min(1, dt / (L.leaving ? 0.5 : 0.9));
    }
    lanterns = lanterns.filter((L) => !(L.leaving && L.alpha < 0.02));
    // with photos waiting, one lantern gives up its place now and then (every photo gets its turn)
    if (waiting.length && !melt) {
      turnClock += dt;
      if (turnClock > TURN_SEC) {
        turnClock = 0;
        const out = lanterns.find((L) => !L.leaving && !L.from);
        if (out) {
          out.leaving = true;
          const slot = { x: out.tx, y: out.ty, D: out.D };
          waiting.push(out.i);
          const nl = newLantern(waiting.shift(), slot);
          nl.alpha = 0; lanterns.push(nl);
        }
      }
    }
  }

  // ---- the thought: resting in its cradle; a finger resting on it rests with it
  function updateThought(dt, rm, onResting) {
    if (!thought) return;
    const held = layerDrawn() && fingers.some((f) => f.on && f.onThought) && Number.isFinite(thought.x) && Number.isFinite(thought.y) && Math.hypot(thought.x - tP.shownX, thought.y - tP.shownY) > 2;
    tP.held = held;
    const hx = plan.home.x, hy = plan.home.y;
    // rocking: slower and smaller as the rest deepens; none with reduced motion
    const busy = tideBusy(base.agitation, restNow, moonP, busyHands);
    tP.ph += dt * (0.55 + 0.75 * busy);
    const rockT = rm ? 0 : Math.sin(tP.ph) * (2.2 + 5 * busy) * (1 - 0.6 * (onResting ? 1 : 0));
    tP.rock += (rockT - tP.rock) * Math.min(1, dt * 3);
    const bob = rm ? 0 : Math.sin(tP.ph * 0.5 + 1) * (0.8 + 2.4 * busy);
    let x = hx, y = hy + bob;
    if (tP.from) {
      tP.glide = Math.min(1, tP.glide + dt / tP.glideSec);
      if (tP.from.fade) {
        // reduced motion: it fades out where it was, then in at home (never seen moving)
        tP.rmPhase = tP.glide;
        if (tP.glide < 0.5) { x = tP.from.x; y = tP.from.y; }
      } else {
        const e = easeInOut(tP.glide);
        // a soft arc down into the cradle
        x = lerp(tP.from.x, hx, e); y = lerp(tP.from.y, hy + bob, e) - Math.sin(Math.PI * e) * 18;
      }
      if (tP.glide >= 1) tP.from = null;
    }
    if (held) { x = thought.x; y = thought.y; tP.from = { x, y, sec: 0.9 }; tP.glide = 0; tP.glideSec = 0.9; }
    tP.x = x; tP.y = y;
    // alpha: a fade for the reduced-motion hand-over, else 1 (after its first appearance)
    let a = 1;
    if (tP.from?.fade) a = tP.glide < 0.5 ? 1 - tP.glide * 2 : (tP.glide - 0.5) * 2;
    tP.alpha += (a - tP.alpha) * (tP.from?.fade ? 1 : Math.min(1, dt / 0.5));
    if (!(dt > 0) && tP.alpha < a) tP.alpha = a;
    // tension: its own (from the feeling, or what the last world handed over), eased by rest — never to nothing
    if (tP.base == null) tP.base = clamp(0.35 + 0.5 * clamp(base.agitation + 0.4 * base.heaviness), 0.3, 0.85);
    const tens = clamp(tP.base * (1 - 0.45 * restNow - 0.35 * moonP), 0.18, 0.9);
    tP.tension += (tens - tP.tension) * Math.min(1, dt / 0.8);
    tP.calm = clamp(0.25 + 0.5 * moonP + 0.3 * restNow + (complete ? 0.3 : 0));
    // write the handle (W2's layer draws it there; the placeholder is drawn by this world)
    const goal = thought.r > 0 && !thought.draw ? tP.r / thought.r : 1;
    if (!(tP.drawS > 0)) tP.drawS = Number.isFinite(thought.scale) && thought.scale > 0 ? thought.scale : goal;
    tP.drawS += (goal - tP.drawS) * (1 - Math.exp(-Math.max(dt, 0) / 0.35));
    if (!held) { thought.x = x; thought.y = y; }
    thought.scale = tP.drawS;
    tP.shownX = thought.x; tP.shownY = thought.y;
    if (!(outroK > 0)) { thought.labelSide = plan.side; thought.labelFit = wordsFit; }
    else if (thought.labelFit && thought.labelFit === wordsFit) thought.labelFit = null;
    if ('opacity' in thought || layerDrawn()) thought.opacity = clamp(tP.alpha);
    const st = thought.state || (thought.state = {});
    st.tension = tP.tension; st.charge = 0; st.calm = tP.calm; st.distance = 0;
    const sq = Math.round(tP.calm * 20) / 20;
    if (sq !== tP.soft) { tP.soft = sq; try { thought.soften?.(sq); } catch { /* optional */ } }
  }

  /**
   * How much of the placeholder's words to show: on its way (gliding in from the last world or from beside the hero) its
   * words wait and fade in at its resting place, as W2's layer does for a travelling thought — never seen sliding over
   * the hero or doubled with the last world's copy.
   */
  const labelK = () => (tP.from && !tP.from.fade ? smoothstep(0.75, 1, tP.glide) : 1);

  // ---------------------------------------------------------------- draw --
  function drawBack(g, now, rm) {
    const dpr = realm.st.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    drawMoonPhase(g, rm);
    // moonmilk ribbons (in the water: under everything else here)
    drawRibbons(g);
    // the pools of rest
    g.globalCompositeOperation = 'lighter';
    for (const P of pools) {
      if (!P.on || P.a <= 0.01) continue;
      const rr = (0.05 + 0.17 * easeOut(P.k)) * U, a = P.a * (ctx.lowStim ? 0.7 : 1);
      const br = rm ? 0.85 + 0.15 * Math.sin(P.age * 1.4) : 1;
      g.globalAlpha = 0.34 * a * br; g.drawImage(spr.milk, P.x - rr * 1.5, P.y - rr * 1.5 * P.asp, rr * 3, rr * 3 * P.asp);
      g.globalAlpha = 0.22 * a; g.drawImage(spr.lav, P.x - rr * 2.2, P.y - rr * 2.2 * P.asp, rr * 4.4, rr * 4.4 * P.asp);
      g.globalAlpha = 0.5 * a * br; g.strokeStyle = C.milk; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(P.x, P.y, rr, rr * P.asp, 0, 0, TAU); g.stroke();
    }
    backRings.draw(g);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // the shells
    for (const s of shells) drawShellAt(g, s, now, rm);
    // the lanterns
    for (const L of lanterns) drawLantern(g, L, now, rm);
    // the cradle (under the thought, wherever the thought's layer draws it)
    if (thought && cradleSpr) drawCradle(g, now, rm);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  function drawMoonPhase(g, rm) {
    const m = plan.moon, off = moonShadow(moonP);
    if (off >= 2.05) return;
    const mx = m.x + (realm.st.camX || 0) * 0.08, my = m.y + (realm.st.camY || 0) * 0.08;
    g.save();
    g.beginPath(); g.arc(mx, my, m.r * 1.01, 0, TAU); g.clip();
    // the dark side slides away to the left as the moon fills (lit from the right, like the realm's moon)
    g.globalAlpha = 0.94;
    g.drawImage(shadowSpr, mx - off * m.r - shadowSpr.cssW / 2, my - shadowSpr.cssH / 2, shadowSpr.cssW, shadowSpr.cssH);
    g.restore();
    // the lit edge glows a little warmer while resting
    if (restNow > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 * restNow; g.drawImage(spr.milkSoft, mx - m.r * 1.6, my - m.r * 1.6, m.r * 3.2, m.r * 3.2); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = 1;
  }

  function drawRibbons(g) {
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'butt'; g.lineJoin = 'round';
    const lowK = ctx.lowStim ? 0.7 : 1, CH = 5;
    for (const rb of ribs) {
      if (!rb.on || rb.n < 3) continue;
      // two passes: a wide lavender haze, then the milk thread. Each pass is drawn in short smooth chunks (one path each,
      // through the midpoints): width grows and alpha falls with age along the ribbon — it dissolves into the water
      for (let pass = 0; pass < 2; pass++) {
        for (let c0 = 0; c0 < rb.n - 1; c0 += CH) {
          const c1 = Math.min(rb.n - 1, c0 + CH), im = (rb.head + ((c0 + c1) >> 1)) % RIB_PTS;
          const age = elapsed - rb.t[im], life = clamp(1 - age / RIB_LIFE);
          if (life <= 0.01) continue;
          const w = rb.w[im] * (1 + age * 0.55);
          g.globalAlpha = (pass ? 0.34 * life * life : 0.1 * life) * lowK;
          g.strokeStyle = pass ? C.milk : C.lav;
          g.lineWidth = pass ? w : w * 3.4;
          g.beginPath();
          const at = (m) => (rb.head + m) % RIB_PTS;
          let i = at(c0);
          let px = c0 ? (rb.x[at(c0 - 1)] + rb.x[i]) / 2 : rb.x[i], py = c0 ? (rb.y[at(c0 - 1)] + rb.y[i]) / 2 : rb.y[i];
          g.moveTo(px, py);
          for (let m = c0; m < c1; m++) {
            const a0 = at(m), a1 = at(m + 1);
            const mx = (rb.x[a0] + rb.x[a1]) / 2, my = (rb.y[a0] + rb.y[a1]) / 2;
            g.quadraticCurveTo(rb.x[a0], rb.y[a0], mx, my);
          }
          if (c1 === rb.n - 1) { const e = at(c1); g.lineTo(rb.x[e], rb.y[e]); }
          g.stroke();
        }
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  function drawShellAt(g, s, now, rm) {
    if (!shellSpr) return;
    const hop = Math.max(0, s.hop) * s.s * 0.9;
    const x = s.x, y = s.y - hop;
    const hushK = clamp(restNow * 1.4 + (complete ? 1 : 0));
    // a soft glow round it: its bead brightens when it pings, steady and warm while the cove rests
    const pingK = s.pingAge >= 0 ? flashEnv(s.pingAge, 0.3, 0.12, 1.1) : 0;
    const b = shellSpr.bead;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.16 + 0.1 * hushK + 0.35 * s.glow;
    g.drawImage(spr.peach, x - s.s * 1.7, y - s.s * 1.1, s.s * 3.4, s.s * 2.2);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.drawImage(shellSpr, x - shellSpr.ox, y - shellSpr.oy, shellSpr.cssW, shellSpr.cssH);
    // the bead: the little light that asks for attention
    const bx = x - shellSpr.ox + b.x, by = y - shellSpr.oy + b.y + (rm ? 0 : Math.sin(now * 1.3 + s.ph) * 1.6 * (1 - hushK));
    // (resting: the bead dims to a steady, sleepy glow — still there, not asking)
    const beadA = clamp((0.6 - 0.25 * hushK) + 0.5 * pingK + 0.4 * s.glow) * (ctx.gentle ? 0.55 : 1);
    const br = s.s * (0.7 + 0.3 * pingK);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.95 * beadA; g.drawImage(spr.gold, bx - br * 1.7, by - br * 1.7, br * 3.4, br * 3.4);
    g.globalAlpha = beadA; g.drawImage(spr.goldCore, bx - br * 0.55, by - br * 0.55, br * 1.1, br * 1.1);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  function drawLantern(g, L, now, rm) {
    if (L.alpha <= 0.01) return;
    const bob = rm ? 0 : Math.sin(L.bob) * L.D * 0.05;
    let x = L.x, y = L.y + bob - Math.max(0, L.hop) * L.D * 0.25, D = L.D, a = L.alpha * (1 - 0.0 * outroK);
    if (L.from) {
      const e = easeInOut(L.glide);
      if (L.from.fade) { a *= L.glide < 0.5 ? 0 : (L.glide - 0.5) * 2; }
      else { x = lerp(L.from.x, x, e); y = lerp(L.from.y, y, e); D = lerp(L.from.D, D, e); }
    }
    // its reflection: a warm streak on the water below it
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.28 * a * (0.7 + 0.3 * L.glow);
    g.drawImage(spr.peach, x - D * 0.45, y + D * 0.5, D * 0.9, D * 0.5);
    g.globalAlpha = (0.32 + 0.25 * L.glow + 0.15 * restNow) * a;
    g.drawImage(spr.milk, x - D, y - D * 1.05, D * 2, D * 2.1);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    face(g, L.i, x, y, D, a);
    // a pearly arched rim
    g.globalAlpha = 0.55 * a; g.strokeStyle = '#fff1d6'; g.lineWidth = 1.2;
    const w = D * 0.78, h = D;
    g.beginPath(); g.moveTo(x - w / 2, y + h / 2); g.lineTo(x - w / 2, y - h / 2 + w / 2); g.arc(x, y - h / 2 + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y + h / 2); g.closePath(); g.stroke();
    g.globalAlpha = 1;
  }
  /**
   * What a lantern holds: the photo — except in a gentle session, where the stand-in Mallow cards' faces never float on
   * the water: those lanterns are plain light in each card's colour. The person's own photos stay as they are.
   */
  const plainCache = new Map();
  function face(g, i, x, y, D, a) {
    if (!(ctx.gentle && photos.standIn)) { photos.draw(g, i, x, y, D, { shape: 'arch', alpha: a, shadow: false }); return; }
    // (a plain lantern: drawn once per photo and size, then blitted — nothing allocated per frame)
    const d = Math.min(2, Math.max(1, ctx.dpr || 1)), key = `${i}|${Math.round(D)}|${d}`;
    let c = plainCache.get(key);
    if (!c) {
      if (plainCache.size > 24) plainCache.clear();
      const w = D * 0.78, h = D;
      c = makeCanvas(Math.ceil(w * d) + 2, Math.ceil(h * d) + 2);
      const pg = c.getContext('2d');
      pg.scale(d, d);
      const [r0, g0, b0] = rgbOf(photos.colour(i) || '#ffd98a');
      const mix = (v, t) => Math.round(v + (t - v) * 0.5);
      const gr = pg.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, `rgba(${mix(r0, 255)},${mix(g0, 244)},${mix(b0, 220)},0.92)`); gr.addColorStop(1, `rgba(${mix(r0, 120)},${mix(g0, 100)},${mix(b0, 200)},0.85)`);
      pg.fillStyle = gr;
      pg.beginPath(); pg.moveTo(0, h); pg.lineTo(0, w / 2); pg.arc(w / 2, w / 2, w / 2, Math.PI, 0); pg.lineTo(w, h); pg.closePath(); pg.fill();
      c.cssW = w; c.cssH = h;
      plainCache.set(key, c);
    }
    g.globalAlpha = a; g.drawImage(c, x - c.cssW / 2, y - c.cssH / 2, c.width / d, c.height / d); g.globalAlpha = 1;
  }

  function drawCradle(g, now, rm) {
    // the cradle sits where the thought is shown (its layer may be carrying it a moment)
    const x = tP.held ? tP.shownX : tP.x, y = (tP.held ? tP.shownY : tP.y);
    const c = cradleSpr, a = tP.alpha;
    if (a <= 0.01) return;
    const cy = y + tP.r * 0.5;
    // its glow on the water, and a soft reflection
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = (0.22 + 0.18 * tP.calm) * a;
    g.drawImage(spr.lav, x - c.cssW * 0.8, cy + c.cssH * 0.15, c.cssW * 1.6, c.cssH * 0.9);
    g.globalAlpha = (0.16 + 0.2 * restNow) * a;
    g.drawImage(spr.milk, x - c.cssW * 0.5, cy + c.cssH * 0.3, c.cssW, c.cssH * 0.55);
    g.globalCompositeOperation = 'source-over';
    g.save();
    g.translate(x, cy); g.rotate((tP.rock * Math.PI) / 180);
    g.globalAlpha = a;
    g.drawImage(c, -c.ox, -c.oy, c.cssW, c.cssH);
    g.restore();
    g.globalAlpha = 1;
  }

  function drawFront(g, now, rm) {
    const dpr = ctx.front.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // the thought (the 2D placeholder draws itself; W2's layer draws its own)
    if (thought?.draw && tP.alpha > 0.003) {
      const labelY = plan.side === 'above' ? -(tP.r + COVE.LABEL_GAP + (plateH || 58)) : tP.r * COVE.CRADLE_B + COVE.LABEL_GAP;
      try {
        thought.draw(g, tP.x, tP.y, 1, { tension: tP.tension, charge: 0, calm: tP.calm, reduced: rm, radius: tP.r, now, minX: COVE.EDGE, maxX: (plan?.x1 || W) - COVE.EDGE, labelWidth: 210, labelY, labelAlpha: labelK(), alpha: tP.alpha });
      } catch { /* placeholder only */ }
    }
    g.globalCompositeOperation = 'lighter';
    rings.draw(g);
    motes.draw(g, spr.motes, 1, 0.3);
    // fingertips: a pearl of light; a resting one glows warmer
    for (const f of fingers) {
      if (!f.on) continue;
      const k = clamp(f.still / COVE.STILL_SETTLE);
      const r = 14 + 8 * k;
      g.globalAlpha = 0.25 + 0.25 * k; g.drawImage(spr.milk, f.x - r, f.y - r, r * 2, r * 2);
    }
    // the hint: a ghost fingertip that comes to rest and a pool that blooms under it
    if (hint.age >= 0 && hint.ok) {
      const t = hint.age, inA = smoothstep(0, 0.6, t) * (1 - smoothstep(HINT_SEC - 0.6, HINT_SEC, t));
      const press = rm ? 1 : smoothstep(0.5, 1.2, t);
      const rr = (0.04 + 0.1 * (rm ? 1 : smoothstep(1.2, 3.6, t))) * U, asp = hint.y > plan.hy ? 0.4 : 0.85;
      g.globalAlpha = 0.28 * inA * press; g.drawImage(spr.milk, hint.x - rr * 1.5, hint.y - rr * 1.5 * asp, rr * 3, rr * 3 * asp);
      g.globalAlpha = 0.45 * inA; g.strokeStyle = C.milk; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(hint.x, hint.y, rr, rr * asp, 0, 0, TAU); g.stroke();
      const fy = hint.y - (rm ? 0 : (1 - press) * 26) - 4;
      g.globalAlpha = 0.55 * inA; g.drawImage(spr.dot, hint.x - 13, fy - 13, 26, 26);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  // --------------------------------------------------------------- frame --
  function frame(dt, t) {
    if (!prepared && dt > 0) return;
    if (!realm || !plan) return;
    if (paused) dt = 0;
    elapsed += dt;
    const rm = reduced();
    frameNo++;
    if (dt > 0) relayoutCheck(dt);
    // a ThoughtLayer whose primary changed (the person typed again): follow it
    { const th = ctx.thought ?? null; if (th !== thought) api.setThought(th); }
    update(dt);
    if (!!realm.st.reduced !== rm) realm.setReducedMotion(rm);
    if (realm.st.low !== !!ctx.lowStim) realm.setLowStimulation(!!ctx.lowStim);
    realm.tick(dt * 1000);
    realm.draw();
    drawBack(realm.ctx, elapsed, rm);
    drawFront(ctx.front.g, elapsed, rm);
  }

  // ----------------------------------------------------------------- api --
  const api = {
    prepare,
    get backCanvas() { return realm?.canvas || null; },
    enter({ from, handoff } = {}) {
      entered = true;
      const rm = reduced();
      // (a cold start re-plans against where the shell has put the hero by now)
      layout(true);
      if (restored?.rest) { meter.restore(restored.rest); moonP = meter.p; everTouched = meter.rest > 0; if (everTouched) firstTouchAt = 0; }
      if (handoff && from) {
        melt = { k: 0 };
        introAt = 3.2;
        const th = handoff.thought;
        if (thought) {
          if (Number.isFinite(handoff.thought?.tension)) tP.base = clamp(handoff.thought.tension, 0.25, 0.85);
          if (th && Number.isFinite(th.x) && Number.isFinite(th.y)) {
            tP.from = rm ? { x: th.x, y: th.y, fade: true } : { x: th.x, y: th.y };
            tP.glide = 0; tP.glideSec = rm ? RM_FADE * 2 : GLIDE_SEC; tP.alpha = 1;
          } else { tP.from = null; tP.alpha = 0; }
        }
        // photos glide (or fade) from where the last world showed them into lanterns
        const ph = Array.isArray(handoff.photos) ? handoff.photos : [];
        for (const L of lanterns) {
          const p = ph.find((q) => q.i === L.i);
          if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) { L.from = rm ? { fade: true, sec: RM_FADE * 2 } : { x: p.x, y: p.y, D: Math.max(p.w || 0, p.h || 0) || L.D, sec: GLIDE_SEC }; L.glide = 0; L.alpha = 1; }
          else L.alpha = 0;
        }
      } else {
        // a cold start: the person's thought already on screen (beside their Mallow) glides into its cradle
        if (thought) {
          const x0 = thought.x, y0 = thought.y;
          if (Number.isFinite(x0) && Number.isFinite(y0) && (x0 || y0) && !restored) { tP.from = rm ? { x: x0, y: y0, fade: true } : { x: x0, y: y0 }; tP.glide = 0; tP.glideSec = rm ? RM_FADE * 2 : COLD_GLIDE_SEC; tP.alpha = 1; }
          else { tP.from = null; tP.alpha = 0; }
        }
        lanterns.forEach((L, k) => { L.alpha = 0; L.from = rm ? null : { x: L.tx, y: L.ty + L.D * 0.6, D: L.D * 0.6, sec: 1.4 + 0.25 * k }; L.glide = 0; });
        introAt = restored ? -1 : INTRO_AT;
      }
      if (restored?.complete) { prog.markComplete(); complete = true; moonP = 1; transformK = 1; realm.transform(1).settle(); }
      if (!(handoff && from)) { try { thought?.react?.(thought?.ov?.appear >= 1 ? 'notice' : 'appear'); } catch { /* optional */ } }
    },
    frame,
    pointer,
    get metrics() {
      return {
        rest: Math.round(rs.rest * 10) / 10, p: rs.p, moon: moonP, restNow, mode: rs.mode, run: rs.run, resting: rs.resting, busy: busyHands,
        shells: shells.length, lanterns: lanterns.length, waiting: waiting.length, fingers: fingers.filter((f) => f.on).length,
        tension: thought ? tP.tension : null, progress: api.progress, played: firstTouchAt >= 0 ? elapsed - firstTouchAt : 0,
      };
    },
    get progress() { return complete ? 1 : lastP; },
    get complete() { return complete; },
    intro(k) { if (melt) { melt.k = k; if (k >= 1) melt = null; } },
    outro(k) { outroK = k; },
    handoff() {
      return {
        horizonY: realm?.horizonY ?? Math.round(H * COVE.HORIZON), palette: { sky: '#2a2668', deep: '#15123d', warm: C.milk }, seeds: [],
        thought: thought ? { x: tP.x, y: tP.y, scale: tP.drawS || 1, tension: tP.tension } : null,
        photos: lanterns.filter((L) => L.alpha > 0.5 && !L.leaving).map((L) => ({ i: L.i, x: L.x, y: L.y, w: L.D * 0.78, h: L.D, rot: 0, state: 'floating', shape: 'arch' })),
        energy: clamp(1 - moonP),
      };
    },
    pause() {
      paused = true;
      holds.hum?.stop(); holds.hum = null;
      for (const f of fingers) { if (f.pool >= 0) pools[f.pool].held = false; if (f.rib >= 0) ribs[f.rib].live = false; f.on = false; f.pool = -1; f.rib = -1; }
    },
    resume() { paused = false; lastInputAt = elapsed; },
    /** The person named another feeling: the tide's restlessness follows it (never the rest they have had). */
    setEmotion(id, i) {
      const k = Number.isFinite(i) ? clamp(i) : intensity;
      const nb = moodForEmotion(id || 'neutral', k);
      const d = ctx.entry.dialogue?.feeling || {};
      const lines = ctx.gentle ? null : nb.agitation > base.agitation + 0.04 ? d.more : nb.agitation < base.agitation - 0.04 ? d.less : d.other;
      base = nb;
      if (!ctx.gentle) { try { mallow?.react?.('nod'); } catch { /* optional */ } }
      if (lines && !paused) { introAt = -1; say(lines); }
    },
    setGentle() { /* ctx.gentle is read live: pings, lines and lantern faces follow it */ },
    setThought(h) {
      if (thought && thought !== h) { try { if (thought.labelFit && thought.labelFit === wordsFit) thought.labelFit = null; } catch { /* */ } }
      const had = !!thought;
      thought = h || null;
      if (prepared) layout(false);
      if (thought && !had) {
        tP.drawS = 0; tP.base = null;
        const x0 = thought.x, y0 = thought.y;
        if (entered && Number.isFinite(x0) && Number.isFinite(y0) && (x0 || y0)) { tP.from = reduced() ? { x: x0, y: y0, fade: true } : { x: x0, y: y0 }; tP.glide = 0; tP.glideSec = reduced() ? RM_FADE * 2 : COLD_GLIDE_SEC; tP.alpha = 1; }
        else tP.alpha = 0;
      }
    },
    /** Client rects to keep subtitles off: the thought with its words, the shells, the lanterns, fingers. */
    avoid() {
      const out = [];
      const band = ctx.band;
      if (thought && tP.alpha > 0.1 && plan) {
        out.push({ x: tP.x - tP.r * 1.45, y: tP.y - tP.r - 4, w: tP.r * 2.9, h: tP.r * (1 + COVE.CRADLE_B) + 8, kind: 'thought' });
        if (plateW) {
          const px = clamp(tP.x - plateW / 2, COVE.EDGE, plan.x1 - COVE.EDGE - plateW);
          const py = plan.side === 'above' ? tP.y - tP.r - COVE.LABEL_GAP - plateH : tP.y + tP.r * COVE.CRADLE_B + COVE.LABEL_GAP;
          out.push({ x: px, y: py, w: plateW, h: plateH, kind: 'thought' });
        }
      }
      for (const s of shells) out.push({ x: s.x - s.hit, y: s.y - s.hit, w: s.hit * 2, h: s.hit * 1.8, kind: 'shell' });
      for (const L of lanterns) if (L.alpha > 0.1) out.push({ x: L.x - L.D / 2 - 4, y: L.y - L.D * 0.62 - 4, w: L.D + 8, h: L.D * 1.24 + 8, kind: 'lantern' });
      for (const f of fingers) if (f.on && !(band && f.y < band.y + band.h)) out.push({ x: f.x - 60, y: f.y - 60, w: 120, h: 120, kind: 'finger' });
      return out;
    },
    subtitleBand() { const b = ctx.band; return b ? { x: b.x, y: b.y, w: b.w, h: b.h } : null; },
    serialize() {
      return { v: 1, seed: ctx.seed, progress: Math.round(api.progress * 1000) / 1000, complete, discoveries: [...discovered], rest: meter.snapshot(), elapsed: Math.round(elapsed) };
    },
    restore(s) {
      if (!s || s.v !== 1) return false;
      for (const id of s.discoveries || []) { discovered.add(id); if (id === 'rest') restD.markFired(); if (id === 'waited') waitD.markFired(); }
      meter.restore(s.rest);
      restored = { rest: s.rest || null, complete: !!s.complete };
      if (s.complete) { prog.markComplete(); complete = true; }
      return true;
    },
    resize(w, h, { dprBack } = {}) {
      const same = plan && Math.round(w) === Math.round(W) && Math.round(h) === Math.round(H);
      W = w; H = h; U = Math.min(W, H);
      if (realm) { realm.resize(W, H, dprBack ?? ctx.dprBack); realm.build(); }
      if (same) return;
      if (realm) layout(true);
      for (const rb of ribs) rb.on = false;
      for (const P of pools) P.on = false;
    },
    setQuality() { /* the director resizes the layers; the cove costs the same */ },
    destroy() {
      holds.hum?.stop(); holds.hum = null;
      try { if (thought && thought.labelFit && thought.labelFit === wordsFit) thought.labelFit = null; } catch { /* a handle without it */ }
      try { if (thought && 'opacity' in thought) thought.opacity = 1; } catch { /* */ }
      realm?.destroy(); realm = null;
    },
    /** QA hooks (dev lab, Playwright). Not product API. */
    debug: {
      get plan() { return plan; }, get thought() { return { ...tP }; }, get shells() { return shells.map((s) => ({ x: s.x, y: s.y, s: s.s, hit: s.hit, ping: s.ping, pingAge: s.pingAge })); },
      get lanterns() { return lanterns.map((L) => ({ i: L.i, x: L.x, y: L.y, D: L.D, alpha: L.alpha, leaving: L.leaving })); }, get waiting() { return waiting.slice(); },
      get pools() { return pools.filter((p) => p.on).map((p) => ({ x: p.x, y: p.y, k: p.k, a: p.a, held: p.held })); },
      get ribbons() { return ribs.filter((r) => r.on).length; }, get fingers() { return fingers; }, get hint() { return { ...hint }; },
      get realm() { return realm; }, get meter() { return { ...rs }; },
    },
  };
  return api;
}
