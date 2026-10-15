// World — Blubi's Raindrop Lagoon (putting a feeling into words: "This is…").
//
// Design note. The skill it teaches (Memory Garden 'name-it', A Word for the Feeling): pause and
// notice what's here; finish "This is…" with one exact word; if there are two, name both, side by
// side — and "unsure" counts. So the lagoon's touch is neither the storm's pace nor the ocean's
// carrying: it is LOOKING. Soft rain falls over Blubi's blue-hour lagoon (the realm backdrop, its
// cushion stage, its hanging glass beads). Big feeling drops hang in the air round the person's
// Thought Mallow, frosted. Hold one still and it swells and clears in your hand, and its word
// surfaces (moving fogs it again until the word has come fully clear: noticing takes stillness).
// Carry it to your thought and let go: it falls in with a plink, and the thought's tag reads
// "This is… worry". A second word sits beside the first ("This is… worry · tiredness"); a third
// gently takes the place of the oldest, which floats back up. Tap a word on the tag to give it
// back — no wrong answers. Each word given eases the thought's face and the rain; sitting quietly
// with a named feeling turns the rain to light (the realm's beads rise), and that quiet is how the
// lagoon finishes: not a score. Touching the water only rings it (play, never progress).
// Tap alternative: tap a drop and it clears by itself; tap your thought (or the word) to give it.
//
// Layers: the raindrop-lagoon realm core is the back layer (its own canvas); this world's rain,
// the drops' reflections and the water rings are drawn into it after the realm's frame. The front
// layer holds the photo orbs, the drops, the Thought Mallow (when the handle draws itself), the
// tag, the word in the hand, splashes and the hint. Layout: raindrop-lagoon-core.js planLagoon —
// the subtitle band, the hero and the person's words are never covered by anything the world places.
//
// Contract: the same interface as static-storm.js / luminous-ocean.js (prepare, backCanvas, enter,
// frame, pointer, intro/outro, handoff, pause/resume, setEmotion, setGentle, setThought, avoid,
// subtitleBand, serialize/restore, resize, destroy). Gentle session: no quips, Blubi never grins,
// stand-in Mallow cards become plain lights. Reduced motion: no sway, bob or arcs (drops fade where
// they are and appear where they go), slow sparse rain, the melt a crossfade with the thought fading
// out where it was and in at home.

import { createRealmCore } from '../../../world/realm.js';
import { glowSprite, glintSprite, Pool, Rings, clamp, lerp, smoothstep, TAU, makeCanvas } from '../../../world/util.js';
import { LAGOON, VOCAB, UNSURE, feelingWords, planLagoon, defaultMallowBox, createFocus, createNaming, createNamingDetector, createLagoonProgress } from './raindrop-lagoon-core.js';
import { wrapLines } from '../placeholders.js';
import { STATUS } from '../registry.js';

// ------------------------------------------------------------ registry --
/**
 * The registry entry (brief §16), for the coordinator to add to WORLDS at integration. Lab-only until
 * then: status IN_PROGRESS (never DEV — isPlayable treats DEV as playable), and the dev lab plays a
 * copy marked playable (lab.js). When it moves into registry.js, load becomes import('./worlds/raindrop-lagoon.js').
 */
export const RAINDROP_LAGOON = {
  id: 'raindrop-lagoon',
  title: 'Blubi’s Raindrop Lagoon',
  version: 1,
  realm: 'raindrop-lagoon',
  horizon: 0.6,
  palette: { sky: '#0e3f8f', deep: '#06205a' },
  purpose: 'Notice what is here and give it a word: “This is…”. A named feeling can be a little easier to hold.',
  technique: {
    name: 'Affect labelling (putting feelings into words)',
    related: ['Mindful noting', 'Emotional granularity', 'Emotional expression (in words, not venting)'],
  },
  evidence: {
    classification: 'Promising – component evidence',
    skill: 'A Word for the Feeling',
    related: [{ skill: 'Two Feelings at Once', classification: 'Promising – component evidence' }],
    basis: 'Early research on putting feelings into words supports parts of this. hushmallow itself hasn’t been studied.',
    sources: ['skills.js name-it'],
    framing: 'Naming is offered, never required: “unsure” counts, two words are allowed, any word can be given back, and nothing is scored.',
  },
  scene: 'Blubi’s blue-hour lagoon in pink haze: soft rain, cushion lily pads, a mirror lagoon with ripple rings. Frosted feeling drops hang round the Thought Mallow; '
    + 'each word given eases the rain, and sitting with it turns the hanging drops to rising light.',
  touch: [
    { gesture: 'Holding a drop still', effect: 'It swells and clears in the hand and its word surfaces; moving fogs it again until the word is clear.' },
    { gesture: 'Carrying a clear drop to the thought', effect: 'It falls in with a plink and the thought’s tag reads “This is…” and the word.' },
    { gesture: 'A second word', effect: 'Sits beside the first; a third takes the oldest one’s place and that one floats back up.' },
    { gesture: 'Tapping a word on the tag', effect: 'Gives it back: the drop floats up to hang again.' },
    { gesture: 'Tapping a drop', effect: 'It clears by itself; tap the thought (or the word) to give it, anywhere else to let it float back.' },
    { gesture: 'Touching the water', effect: 'Soft rings and a drip; a drag leaves a trail of rings. Play only, never progress.' },
  ],
  mallow: {
    id: 'blubi',
    behaviour: 'Tender and a little tearful in the rain; leans in and watches the drop in the hand, nods at each word given, '
      + 'is comforted as the rain turns to light. In a gentle session, attentive and soft (never a grin).',
  },
  input: {
    words: 'The person’s exact words stay on the Thought Mallow above it, readable all the time; the named feelings go on its own tag, never into their words.',
    photos: { becomes: 'glass raindrops holding each photo, hanging among the feeling drops', change: 'a tap makes one glow and ring the water', shape: 'drop', standIn: 'the seven Mallow cards',
      gentle: 'the stand-in cards become plain soft lights in each card’s colour' },
  },
  progression: [
    'Soft rain from the chosen feeling; frosted drops hang round the thought.',
    'Holding a drop still clears it: its word surfaces.',
    'Giving a word eases the thought and the rain; a second word sits side by side.',
    'Discovery: you gave it a word.',
    'Natural completion: a word kept, and a quiet moment with it; the rain turns to light. It stays playable.',
  ],
  dialogue: {
    intro: ['Oh… it’s raining a little.', 'Hold a drop still. Look inside.'],
    arrive: ['Soft rain here.', 'Hold a drop still. Look inside.'],
    fog: ['Hold it still a moment.', 'Let the word come clear.'],
    carry: ['Now bring it to your thought.'],
    unsure: ['“Unsure” counts too.'],
    back: ['That’s fine. Try another.'],
    // a gentle session (after a death, a loss or harm, or "Just be with it"): quiet lines, no asides
    gentle: { intro: ['Soft rain here.', 'Take all the time you need.'], arrive: ['Soft rain here.', 'Take all the time you need.'], back: null },
    complete: 'The rain’s turning to light. Stay, or drift on?',
    completeStay: 'The rain’s turning to light. Stay as long as you like.',
    feeling: {
      more: ['The rain heard you.', 'A little more of it.'],
      less: ['The rain’s easing.', 'The lagoon heard you.'],
      other: ['Noted. New drops are forming.'],
    },
  },
  discoveries: {
    named: { skillId: 'name-it', lines: ['You gave it a word.', 'It has a name now.', 'Sometimes that makes it a little easier to hold.'] },
    // two at once is allowed: nothing more to keep (the lagoon's tool is offered with 'named')
    both: { skillId: null, offer: false, lines: ['Two at once.', 'Side by side is allowed.'] },
  },
  sound: {
    ambience: 'raindrop-lagoon',
    holds: { hum: 'rises as a drop clears in the hand' },
    fx: ['lens-focus when a word comes clear', 'drop-in as a word falls into the thought', 'a drip for touches on the water (120 ms apart at most)', 'a bubble note as a word floats back', 'a chime at a discovery', 'bloom at the end'],
  },
  haptics: ['light as a drop is taken', 'soft when its word comes clear', 'soft as it falls into the thought', 'success at a discovery'],
  completion: {
    rule: 'A word given and kept, and 8 s of quiet with it (no drop in hand), after at least 25 s of play; then 2 s with no finger down.',
    after: 'The rain stops and the hanging drops rise as light. The lagoon stays playable: words can still be given and given back.',
  },
  transition: {
    next: null,
    melt: 'In: the mask spreads from the outgoing world’s horizon; the lagoon’s own is 0.6 H. Out: from 0.6 H.',
    handoff: 'In: the Thought Mallow glides from where it was to its place over the lagoon, postcards or bubbles glide in and become glass drops, '
      + 'the feeling drops condense one by one. Reduced motion: a crossfade, the thought fading out where it was and in at its place. Out: things keep their places.',
  },
  memory: { skillId: 'name-it' },
  accessibility: {
    tapAlt: 'Tap a drop and it clears by itself; tap the thought or the word to give it. Holding anywhere in the air draws the nearest drop to the finger.',
    reducedMotion: 'No sway, bob or arcs; drops fade where they are and appear where they go; slower, sparser rain; the melt is a crossfade.',
    lowStimulation: 'Half the rain and splashes, softer contrast (the realm’s low-stimulation layer).',
    precision: 'Drops are at least 46 px with a 16 px margin; the thought accepts a drop anywhere on it, its words or its tag.',
  },
  playtest: { results: [], note: 'Built 15 Oct in the dev lab; browser-checked in Chromium at 390×844, 360×780 and 320×568. Not yet playtested with real users or on a phone.' },
  status: STATUS.IN_PROGRESS,
  // a gentle session never plays it by itself: naming can feel heavier right after something heavy (skills.js care)
  calm: false,
  // (owner P1) nothing follows it yet: Stay as long as you like, and Finish. Drop this once the next world exists.
  final: true,
  fits: {
    emotions: { sad: 1, lonely: 0.9, overwhelmed: 0.85, anxious: 0.8, frustrated: 0.7, other: 0.8, angry: 0.6, restless: 0.5 },
    intentions: { steady: 1, calm: 0.8, 'let-go': 0.7, distract: 0.5, play: 0.5 },
  },
  next: [],
  load: () => import('./raindrop-lagoon.js'),
};

// ------------------------------------------------------------ constants --
const C = { blue: '#7fd4ff', pink: '#ffb8ec', gold: '#ffe1a8', cream: '#fff4dc', white: '#f4fbff', ink: '#0a1240' };
// a soft tint per drop (the feeling words never get a colour of judgement: all of the lagoon's own light)
const TINTS = ['#8fd3ff', '#c9b2ff', '#ff9fe0', '#8ff0dc', '#a9b6ff', '#e8f2ff'];
const SPRITE = 128;              // drop sprites are drawn at this size (device px) and scaled
const HOLD_LIFT = 0.62;          // × D: a held drop rides above the fingertip (the finger never hides it)
const FALL_SEC = 0.55, RISE_SEC = 1.5, FORM_SEC = 0.9, GLIDE_SEC = 2.2;
const TAP_PX = 12, TAP_SEC = 0.32;
const MAGNET_SEC = 0.3;          // a finger resting in the air this long draws the nearest drop to it
const OPEN_SEC = 9;              // a tapped drop waits this long to be given, then floats back
const HINT_AT = 4.5, HINT_AGAIN = 16, HINT_SEC = 3.4;
const RAIN_MAX = 72;
const RELAYOUT_TOL = 12;

const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (h, a) => { const [r, g, b] = rgbOf(h); return `rgba(${r},${g},${b},${a})`; };
const easeInOut = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const normBox = (r) => {
  if (!r || !(r.height > 20) || !(r.width > 20)) return null;
  const left = r.left ?? r.x, top = r.top ?? r.y;
  return { left, top, right: r.right ?? left + r.width, bottom: r.bottom ?? top + r.height, width: r.width, height: r.height };
};
const boxMoved = (a, b, tol) => (!a || !b ? !!a !== !!b : Math.abs(a.left - b.left) > tol || Math.abs(a.right - b.right) > tol || Math.abs(a.top - b.top) > tol || Math.abs(a.bottom - b.bottom) > tol);
const inBox = (x, y, b, pad = 0) => !!b && x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;

/** A teardrop path (point up) of radius r centred on the round part at (0, 0). */
function dropPath(g, r) {
  g.beginPath();
  g.moveTo(0, -r * 1.42);
  g.bezierCurveTo(r * 0.3, -r * 1.05, r, -r * 0.55, r, 0);
  g.arc(0, 0, r, 0, Math.PI);
  g.bezierCurveTo(-r, -r * 0.55, -r * 0.3, -r * 1.05, 0, -r * 1.42);
  g.closePath();
}

/** A glass feeling drop in a tint: the lagoon's haze refracted upside-down, a rim of light, a highlight. */
function dropSprite(tint) {
  const S = SPRITE, c = makeCanvas(S, Math.round(S * 1.25));
  const g = c.getContext('2d'), r = S * 0.4, cx = S / 2, cy = c.height - S / 2;
  g.translate(cx, cy);
  dropPath(g, r);
  let gr = g.createLinearGradient(0, -r * 1.4, 0, r);
  gr.addColorStop(0, rgba('#173f9a', 0.5)); gr.addColorStop(0.42, rgba(tint, 0.42)); gr.addColorStop(0.78, rgba('#ffc8ee', 0.62)); gr.addColorStop(1, 'rgba(255,240,250,0.85)');
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  // the bright horizon seen through the glass, upside down: a soft band low in the drop
  gr = g.createRadialGradient(0, r * 0.55, 0, 0, r * 0.55, r * 1.1);
  gr.addColorStop(0, 'rgba(255,236,250,0.55)'); gr.addColorStop(0.5, 'rgba(255,214,242,0.18)'); gr.addColorStop(1, 'rgba(255,214,242,0)');
  g.fillStyle = gr; g.fillRect(-r * 1.2, -r * 1.6, r * 2.4, r * 2.8);
  // a dark lens core, so a word in front of it reads
  gr = g.createRadialGradient(-r * 0.1, -r * 0.15, 0, 0, 0, r * 0.95);
  gr.addColorStop(0, rgba('#0b2a7a', 0.32)); gr.addColorStop(1, rgba('#0b2a7a', 0));
  g.fillStyle = gr; g.fillRect(-r * 1.2, -r * 1.6, r * 2.4, r * 2.8);
  // rim light
  gr = g.createRadialGradient(0, -r * 0.1, r * 0.62, 0, -r * 0.1, r * 1.12);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(232,248,255,0.8)');
  g.fillStyle = gr; g.fillRect(-r * 1.2, -r * 1.6, r * 2.4, r * 2.8);
  g.restore();
  g.lineWidth = S * 0.012; g.strokeStyle = 'rgba(240,250,255,0.7)'; dropPath(g, r - 0.5); g.stroke();
  // highlights
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath(); g.ellipse(-r * 0.4, -r * 0.42, r * 0.22, r * 0.13, -0.7, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath(); g.ellipse(-r * 0.12, -r * 0.98, r * 0.06, r * 0.13, -0.3, 0, TAU); g.fill();
  g.beginPath(); g.arc(r * 0.45, r * 0.34, r * 0.08, 0, TAU); g.fill();
  c.cy = cy / c.height;   // where the round part's centre is (× height)
  return c;
}

/** The frost over an unclear drop: milky glass with beads of condensation. */
function frostSprite(seed = 7) {
  const S = SPRITE, c = makeCanvas(S, Math.round(S * 1.25));
  const g = c.getContext('2d'), r = S * 0.4, cx = S / 2, cy = c.height - S / 2;
  let a = seed;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  g.translate(cx, cy);
  dropPath(g, r - 1);
  const gr = g.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
  gr.addColorStop(0, 'rgba(232,244,255,0.66)'); gr.addColorStop(0.7, 'rgba(190,214,255,0.5)'); gr.addColorStop(1, 'rgba(255,206,242,0.42)');
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  for (let k = 0; k < 46; k++) {
    const x = (rnd() * 2 - 1) * r, y = (rnd() * 2.4 - 1.4) * r, s = 1 + rnd() * 2.6;
    g.fillStyle = `rgba(255,255,255,${(0.25 + 0.5 * rnd()).toFixed(2)})`;
    g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    g.fillStyle = 'rgba(120,150,220,0.18)';
    g.beginPath(); g.arc(x + s * 0.4, y + s * 0.5, s * 0.8, 0, TAU); g.fill();
  }
  g.restore();
  c.cy = cy / c.height;
  return c;
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
  const reduced = () => !!ctx.reduced;
  let intensity = clamp(ctx.intensity ?? 0.6);
  let emotion = ctx.emotion || 'other';

  // ------------------------------------------------------------ state --
  let realm = null, plan = null, prepared = false, entered = false, paused = false, complete = false, completeAt = -1, outroK = 0;
  let elapsed = 0, lastTouch = -1e9, everTouched = false, firstTouchAt = -1, everPlayed = false;   // (played: a drop taken — the water is only play)
  const naming = createNaming();
  const finder = createNamingDetector();
  const prog = createLagoonProgress();
  const discovered = new Set();
  const said = new Set();                 // the one-off lines said already (fog, carry, unsure, back)
  let introAt = -1, arriveAt = -1, meltK = 1, melt = null;
  let rainK = 0.7, rainT = 0.7, clearK = 0, clearT = 0;    // the rain's strength and the lagoon's clarity, eased
  let hint = { next: HINT_AT, shown: 0, age: -1, drop: null, x0: 0, y0: 0, x1: 0, y1: 0 };
  let holds = { hum: null }, holdClock = 0, ambClock = 0, emoAt = -9, emoKey = '', lastDrip = -9;
  let wordsFit = null;                    // the plate asked of W2's layer (thought.labelFit)
  let layoutRest = null, layoutBandB = 0, layoutFreeW = 0, pendingRect = null, pendingFor = 0, relayoutClock = 0;
  let restored = null;
  let measureG = null;
  let sprites = null;

  // the Thought Mallow: where it hangs (plan), its bob, its feeling, a glide in
  const tS = { x: 0, y: 0, r: 30, ox: 0, oy: 0, alpha: 1, vis: 1, from: null, glide: 1, rmFrom: null, tension: 0.6, base: 0.6, calm: 0.4, squash: 0, plateW: 0, plateH: 0 };
  // drops and photo orbs
  const drops = [];
  const orbs = [];
  let waiting = [], turnClock = 0;
  // fingers (two at most)
  const fingers = [0, 1].map(() => ({ on: false, id: -1, x: 0, y: 0, x0: 0, y0: 0, t0: 0, speed: 0, drop: null, kind: '', moved: 0, lastRx: 0, lastRy: 0, magnet: null, still: 0, wordAt: -1, giveOpen: false }));
  const fingerFor = (id) => { for (const f of fingers) if (f.on && f.id === id) return f; return null; };
  // particles and rings
  const splash = new Pool(90);            // drops of water from a plink (front)
  const motes = new Pool(70);             // light rising off a named word, and the clearing rain (front)
  const rings = new Rings(18);            // rings on the lagoon (back)
  const halo = new Rings(8);              // rings round the thought (front)
  // rain (back): x, y, speed, depth, where it lands
  const rx = new Float32Array(RAIN_MAX), ry = new Float32Array(RAIN_MAX), rv = new Float32Array(RAIN_MAX), rz = new Float32Array(RAIN_MAX), rT = new Float32Array(RAIN_MAX);
  let rainN = 0;

  // ------------------------------------------------------------ layout --
  let boxFrame = -1, boxCache = null, frameNo = 0;
  function mallowBox() {
    if (boxFrame === frameNo) return boxCache;
    boxFrame = frameNo;
    try { boxCache = normBox(mallow?.rect?.() || mallow?.bodyRect?.()); } catch { boxCache = null; }
    return boxCache;
  }
  function restBox() {
    let r = null;
    try { r = normBox(mallow?.restRect?.()); } catch { r = null; }
    return r || mallowBox();
  }
  const bandBottom = () => (ctx.band?.y || 0) + (ctx.band?.h || 0);
  /** The person's text size (1 | 1.12 | 1.25, set on <html> by type.js): the tag and the word in the hand grow with it. */
  let tkCache = 1, tkAt = -9;
  function textK() {
    if (elapsed - tkAt < 0.5 && tkAt >= 0) return tkCache;
    tkAt = elapsed;
    try { const v = parseFloat(document.documentElement.style.getPropertyValue('--type-scale')); tkCache = clamp(Number.isFinite(v) ? v : 1, 1, 1.4); } catch { tkCache = 1; }
    return tkCache;
  }
  let layoutTK = 1;
  const freeW = () => (Number.isFinite(ctx.freeW) && ctx.freeW > 0 ? Math.min(W, ctx.freeW) : W);
  /** W2's ThoughtLayer when it draws the person's thought (it measures and shows the words), else null. */
  const wordsLayer = () => (thought && !thought.draw && ctx.thoughtLayer?.plateFor ? ctx.thoughtLayer : null);
  const token = () => (thought ? (thought.token || words?.token || '') : '');

  /** The words plate at most `lines` lines in maxW px (as it will be drawn), or null when it does not fit. */
  function plateFor(maxW, lines, r) {
    const tok = token();
    if (!tok) return null;
    const L = wordsLayer();
    if (L) {
      let P = null;
      try { P = L.plateFor(thought, { lines, maxW: Math.round(maxW), r, z: 0 }); } catch { P = null; }
      if (!P || !(P.w > 0)) return null;
      if ((P.rows || P.lines || 1) > lines) return null;
      // (the layer keeps its own room between the thought and its words: plan for the plate where the layer hangs it)
      const pad = Number.isFinite(P.above) ? Math.max(0, Math.ceil(P.above - (r + LAGOON.PLATE_GAP))) : 0;
      // (an excerpt — the start of the words, cut with "…" — is only for when nothing else fits)
      const cut = typeof P.text === 'string' && /…\s*$/.test(P.text) && !/…\s*$/.test(tok);
      return { w: Math.ceil(P.w), h: Math.ceil(P.h) + pad, cut, fit: { lines, maxW: Math.round(maxW) } };
    }
    try {
      measureG ||= makeCanvas(4, 4).getContext('2d');
      const inner = maxW - 2 * LAGOON.LABEL_PAD_X;
      for (const px of [17, 16, 15]) {
        measureG.font = ctx.font(px, 700);
        const ls = wrapLines(measureG, tok, inner);
        // (a long text at 15 px: the handle shows its start on two lines, cut at a word with "…" — placeholders.js)
        if (ls.length <= lines || (px === 15 && lines > 1)) {
          const n = Math.min(lines, ls.length, 2);
          let tw = 0; for (let k = 0; k < n; k++) tw = Math.max(tw, measureG.measureText(ls[k]).width);
          return { w: Math.ceil(Math.min(inner, tw) + 2 * LAGOON.LABEL_PAD_X), h: Math.ceil(n * LAGOON.LABEL_LINE + 2 * LAGOON.LABEL_PAD_Y), lines: n, cut: ls.length > n, fit: { lines: n, maxW: Math.round(maxW) } };
        }
      }
    } catch { /* no canvas: estimate */ }
    return null;
  }

  function layout(first = true) {
    frameNo++;
    const rest = restBox();
    layoutRest = rest; layoutBandB = bandBottom(); layoutFreeW = freeW(); tkAt = -9; layoutTK = textK();
    const nPh = Math.min(7, photos?.n || 0);
    let p = null;
    // as many feeling drops as fit (six, down to four: three words and "unsure")
    const r0 = Math.round(clamp(0.08 * Math.min(W, H), 22, 38));
    for (let n = 6; n >= 4; n--) {
      const q = planLagoon({
        W, H, band: ctx.band, mallow: rest || defaultMallowBox(W, H), freeW: layoutFreeW, n, photos: nPh, thought: !!thought, textScale: layoutTK,
        plate: thought ? (maxW, lines) => plateFor(maxW, lines, r0) : null,
      });
      p = q;
      if (q.fit) break;
    }
    plan = p;
    // the words plate W2's layer is asked to show while the lagoon drives the thought (a new object per plan)
    wordsFit = plan.plate ? { lines: plan.plate.lines, maxW: plan.plate.maxW } : null;
    tS.plateW = plan.plate?.w || 0; tS.plateH = plan.plate?.h || 0;
    // (a new plan: the thought eases to its new home — it only jumps there before anything is on screen)
    if (first && !entered) { tS.x = plan.thought.x; tS.y = plan.thought.y; }
    tS.r = plan.thought.r;
    if (realm) {
      const gy = clamp(((rest?.bottom ?? defaultMallowBox(W, H).bottom) + 2) / H, 0.6, 0.96);
      if (Math.abs(realm.st.groundY - gy) > 0.004) { realm.st.groundY = gy; if (realm.built) realm.build(); }
    }
    // (a new screen with room for a different number of drops: they condense again, the named ones stay named)
    const live = drops.filter((d) => !d.extra && d.state !== 'gone').length;
    placeDrops(first || live !== plan.drops.length);
    placeOrbs(first);
  }

  function relayoutCheck(dt) {
    relayoutClock += dt;
    if (relayoutClock < 0.25) return;
    const step = relayoutClock; relayoutClock = 0;
    const r = restBox();
    const changed = boxMoved(r, layoutRest, RELAYOUT_TOL) || Math.abs(bandBottom() - layoutBandB) > 4 || Math.abs(freeW() - layoutFreeW) > 4 || Math.abs(textK() - layoutTK) > 0.01;
    if (!changed) { pendingRect = null; pendingFor = 0; return; }
    // wait until the move has settled (the shell glides its Mallow for 720 ms), or 2 s at most
    pendingFor += step;
    if (pendingRect && boxMoved(r, pendingRect, 8) && pendingFor < 2) pendingFor = Math.min(pendingFor, step);
    pendingRect = r;
    if (pendingFor >= 0.5) { pendingRect = null; pendingFor = 0; layout(false); }
  }

  // ------------------------------------------------------------- drops --
  function newDrop(k, slot, j) {
    return {
      k, word: VOCAB[k], tint: j % TINTS.length, slot, hx: slot.x, hy: slot.y, x: slot.x, y: slot.y, vx: 0, vy: 0, D: slot.D, s: 1, sv: 0,
      state: 'form', t: -0.18 * j, focus: createFocus({ U }), ph: R() * TAU, wob: 0, wobV: 0, alpha: 0, finger: -1,
      fx0: 0, fy0: 0, open: 0, clearAt: -1, look: 0, surfaced: false,
    };
  }
  /** Give each feeling word a slot (a new plan keeps the words, moves their homes; the held one stays in hand). */
  function placeDrops(first) {
    const want = feelingWords(emotion, plan.drops.length);
    if (first || !drops.length) {
      // (a new set of slots: every word keeps its own drop object — one in the hand, falling, rising or in the thought
      // carries on as it was, only its home moves; the words named stay named; new ones condense in their slots)
      const old = drops.splice(0);
      const live = (d) => d.state === 'held' || d.state === 'open' || d.state === 'fall' || d.state === 'rise' || d.state === 'in';
      want.forEach((k, j) => {
        const sl = plan.drops[j];
        const oi = old.findIndex((d) => d.k === k && d.state !== 'gone' && d.state !== 'fade');
        if (oi >= 0) {
          const d = old.splice(oi, 1)[0];
          d.slot = sl; d.hx = sl.x; d.hy = sl.y; d.D = sl.D; d.extra = false;
          if (d.state === 'form' && d.t < 0) { d.x = sl.x; d.y = sl.y; }
          if (naming.has(k) && !live(d)) { d.state = 'in'; d.alpha = 0; }
          drops.push(d);
          return;
        }
        const d = newDrop(k, sl, j);
        if (naming.has(k)) { d.state = 'in'; d.alpha = 0; }
        drops.push(d);
      });
      // a word that has no place among these slots, but is in the hand, on its way or named, keeps its drop (it melts away once let go)
      for (const d of old) if (live(d) || naming.has(d.k)) { d.extra = true; if (naming.has(d.k) && !live(d)) { d.state = 'in'; d.alpha = 0; } drops.push(d); }
      // named words with no drop at all (a restored lagoon, a changed feeling) get one of their own, in the thought
      for (const k of naming.list) if (!drops.some((d) => d.k === k)) { const d = newDrop(k, plan.drops[drops.length % plan.drops.length], drops.length); d.state = 'in'; d.alpha = 0; d.extra = true; drops.push(d); }
      return;
    }
    // a relayout: same words, new homes (glide there)
    let j = 0;
    for (const d of drops) {
      if (d.extra) continue;
      const s = plan.drops[j % plan.drops.length]; j++;
      d.slot = s; d.hx = s.x; d.hy = s.y; d.D = s.D;
      if (d.state === 'form' && d.t < 0) { d.x = s.x; d.y = s.y; }
    }
  }
  /** The feeling changed: hanging drops that are not named change their words (they melt and condense again). */
  function reword() {
    const want = feelingWords(emotion, plan.drops.length);
    const keep = new Set(naming.list);
    const free = want.filter((k) => !keep.has(k) && !drops.some((d) => d.k === k && d.state !== 'hang' && d.state !== 'form'));
    let j = 0;
    for (const d of drops) {
      if (d.state !== 'hang' && d.state !== 'form') continue;
      if (want.includes(d.k)) continue;
      const k = free.find((q) => !drops.some((o) => o.k === q));
      if (k == null) continue;
      d.k = k; d.word = VOCAB[k]; d.state = 'form'; d.t = -0.15 * j++; d.alpha = 0; d.focus.reset();
    }
  }
  const dropById = (k) => drops.find((d) => d.k === k) || null;

  function placeOrbs(first) {
    const n = Math.min(7, photos?.n || 0);
    if (!n) { orbs.length = 0; waiting = []; return; }
    const slots = plan.orbs;
    if (first || !orbs.length) {
      orbs.length = 0;
      for (let i = 0; i < n && orbs.length < slots.length; i++) orbs.push({ i, x: slots[orbs.length].x, y: slots[orbs.length].y, hx: slots[orbs.length].x, hy: slots[orbs.length].y, D: slots[orbs.length].D, ph: R() * TAU, glow: 0, alpha: 0, t: -0.3 - 0.2 * i, from: null, fade: 0, out: false });
      waiting = [];
      for (let i = orbs.length; i < n; i++) waiting.push(i);
      return;
    }
    // a relayout: the shown orbs move to the new slots; ones without a slot wait their turn
    const shown = orbs.splice(0);
    for (const o of shown) {
      if (orbs.length < slots.length) { const s = slots[orbs.length]; o.hx = s.x; o.hy = s.y; o.D = s.D; orbs.push(o); } else waiting.push(o.i);
    }
    while (orbs.length < slots.length && waiting.length) { const s = slots[orbs.length], i = waiting.shift(); orbs.push({ i, x: s.x, y: s.y, hx: s.x, hy: s.y, D: s.D, ph: R() * TAU, glow: 0, alpha: 0, t: 0, from: null, fade: 0, out: false }); }
  }

  // ------------------------------------------------------------ hits --
  /** Where a drop is drawn (its round part's centre) and how big. */
  const dropR = (d) => (d.D / 2) * d.s;
  function dropAt(x, y, pad = 16) {
    let best = null, bd = Infinity;
    for (const d of drops) {
      if (d.state !== 'hang' && d.state !== 'form' && d.state !== 'open') continue;
      if (d.state === 'form' && d.t < 0.4) continue;
      const r = dropR(d) + pad, dx = x - d.x, dy = y - (d.y - 0.15 * dropR(d));
      const dd = dx * dx + dy * dy;
      if (dd < r * r * 1.3 && dd < bd) { bd = dd; best = d; }
    }
    return best;
  }
  function nearestDrop(x, y, maxD) {
    let best = null, bd = maxD * maxD;
    for (const d of drops) {
      if (d.state !== 'hang') continue;
      const dd = (x - d.x) ** 2 + (y - d.y) ** 2;
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }
  const thoughtX = () => tS.x + tS.ox, thoughtY = () => tS.y + tS.oy;
  /** The thought, its words or its tag: where a drop can be given. */
  function onGiveTarget(x, y) {
    if (!plan) return false;
    const tx = thoughtX(), ty = thoughtY();
    if ((x - tx) ** 2 + (y - ty) ** 2 < (tS.r * 1.9) ** 2) return true;
    if (inBox(x, y, tagBox(), 12)) return true;
    if (plan.plate && inBox(x, y, plateBox(), 8)) return true;
    if (thought && onWords(thought, x, y)) return true;
    return false;
  }
  function plateBox() {
    const P = plan?.plate; if (!P) return null;
    const dx = thoughtX() - plan.thought.x, dy = thoughtY() - plan.thought.y;
    return { x0: P.x0 + dx, y0: P.y0 + dy, x1: P.x1 + dx, y1: P.y1 + dy };
  }
  // the tag as drawn now (its size follows its words), in the plan's reserved box
  const tagNow = { x0: 0, y0: 0, x1: 0, y1: 0, words: [] };
  function tagBox() { return tagNow.x1 > tagNow.x0 ? tagNow : (plan ? { x0: plan.tag.x0, y0: plan.tag.y0, x1: plan.tag.x1, y1: plan.tag.y0 + 40 } : null); }
  /** The named word under (x, y) on the tag, or -1. */
  function tagWordAt(x, y) {
    // (≥ 44 px tall and wide: the word's span with a margin)
    // (two rows' margins overlap: the word nearest the finger wins)
    let best = -1, bd = Infinity;
    for (const w of tagNow.words) {
      const px = Math.max(8, (44 - (w.x1 - w.x0)) / 2), py = Math.max(12, (44 - (w.y1 - w.y0)) / 2);
      if (!(x >= w.x0 - px && x <= w.x1 + px && y >= w.y0 - py && y <= w.y1 + py)) continue;
      const dx = Math.max(0, w.x0 - x, x - w.x1), dy = Math.max(0, w.y0 - y, y - w.y1), dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = w.k; }
    }
    if (best >= 0) return best;
    return -1;
  }
  function onThought(x, y) {
    try { if (thought?.hitTest?.(x, y)) return true; } catch { /* placeholder */ }
    return (x - thoughtX()) ** 2 + (y - thoughtY()) ** 2 < (tS.r * 1.15) ** 2;
  }

  // ------------------------------------------------------------ input --
  function pointer(s) {
    if (!prepared || paused || !plan) return;
    const rm = reduced();
    if (s.type === 'down') {
      let f = fingers.find((q) => !q.on);
      if (!f) return;
      Object.assign(f, { on: true, id: s.id, x: s.x, y: s.y, x0: s.x, y0: s.y, t0: elapsed, speed: 0, drop: null, kind: '', moved: 0, lastRx: s.x, lastRy: s.y, magnet: null, still: 0, wordAt: -1, giveOpen: false });
      lastTouch = elapsed;
      if (!everTouched) { everTouched = true; firstTouchAt = elapsed; }
      hint.age = -1;
      const open = drops.find((d) => d.state === 'open');
      if (open && onGiveTarget(s.x, s.y)) { f.kind = 'give-open'; f.drop = open; f.giveOpen = true; return; }
      if (open && pillHit(open, s.x, s.y)) { f.kind = 'give-open'; f.drop = open; f.giveOpen = true; return; }
      const wk = tagWordAt(s.x, s.y);
      if (wk >= 0) { f.kind = 'tag'; f.wordAt = wk; return; }
      const d = dropAt(s.x, s.y);
      if (d && d !== open) { if (open) closeOpen(open); take(f, d); return; }
      if (d && d === open) { take(f, d); return; }
      if (open) closeOpen(open);
      // the person's thought: a touch on it is its own (W2's thought squeezes)
      if (thought && onThought(s.x, s.y)) { f.kind = 'thought'; try { thought.pointer?.(s); } catch { /* optional */ } return; }
      // the water: rings
      if (s.y >= plan.hy - 2) { f.kind = 'water'; waterTouch(s.x, s.y, true); return; }
      // the air: a resting finger draws the nearest drop to it
      f.kind = 'air';
      // (never on the thought, its words or its tag: a finger resting there is not reaching for a drop)
      f.magnet = onGiveTarget(s.x, s.y) ? null : nearestDrop(s.x, s.y, 0.34 * U);
      return;
    }
    const f = fingerFor(s.id);
    if (!f) return;
    if (s.type === 'move') {
      const dx = s.x - f.x, dy = s.y - f.y;
      f.moved += Math.hypot(dx, dy);
      f.x = s.x; f.y = s.y; f.speed = s.speed || 0;
      if (!s.idle) lastTouch = elapsed;
      if (f.kind === 'thought') { try { thought?.pointer?.(s); } catch { /* optional */ } return; }
      if (f.kind === 'water') {
        // a trail of soft rings along a drag on the water
        if (Math.hypot(s.x - f.lastRx, s.y - f.lastRy) > 26 && s.y >= plan.hy - 2) { f.lastRx = s.x; f.lastRy = s.y; waterTouch(s.x, s.y, false); }
        return;
      }
      if (f.kind === 'air' && f.magnet && f.moved > TAP_PX * 2) f.magnet = null;
      return;
    }
    // up / cancel
    const tap = f.moved < TAP_PX && elapsed - f.t0 < TAP_SEC;
    const d = f.drop;
    if (f.kind === 'thought') { try { thought?.pointer?.(s); } catch { /* optional */ } }
    else if (f.kind === 'tag' && tap && f.wordAt >= 0 && s.type === 'up') ungive(f.wordAt);
    else if (f.kind === 'give-open' && d && d.state === 'open' && s.type === 'up') {
      // (only once its word can be read: a drop is never given before the person has seen what it says)
      if (d.focus.k >= LAGOON.GIVE_K && d.pill && (onGiveTarget(s.x, s.y) || pillHit(d, s.x, s.y))) give(d);
    } else if (f.kind === 'drop' && d && d.state === 'held') {
      if (s.type === 'cancel') letGo(d);
      else if (tap && !d.focus.latched) openDrop(d);
      // (a drop drawn to a resting finger is given only when it was then carried: never by a finger that never moved)
      else if ((onGiveTarget(d.x, d.y) || onGiveTarget(s.x, s.y)) && !(d.pulled && f.moved - (f.pulledAt || 0) < TAP_PX * 2)) {
        if (d.focus.giveable) give(d);
        else { letGo(d); once('fog'); }
      } else {
        letGo(d);
        if (d.focus.latched) once('carry');
      }
    }
    f.on = false; f.drop = null; f.magnet = null;
    if (!fingers.some((q) => q.on && q.drop)) stopHum();
    void rm;
  }

  function take(f, d) {
    f.kind = 'drop'; f.drop = d; d.pulled = false;
    if (!everPlayed) { everPlayed = true; prog.touch(); }
    d.state = 'held'; d.finger = f.id; d.focus.hold(); d.fx0 = d.x; d.fy0 = d.y;
    ctx.haptic('light');
    if (!holds.hum) holds.hum = ctx.hold('hum', { intensity: 0.05, pitch: 0.9 });
    try { mallow?.react?.('nod'); } catch { /* optional */ }
  }
  function letGo(d) {
    d.finger = -1; d.focus.fade();
    if (d.extra) { d.state = 'fade'; return; }
    d.state = 'hang';
    d.wobV += 2.5;
  }
  function openDrop(d) {
    if (!everPlayed) { everPlayed = true; prog.touch(); }
    d.state = 'open'; d.finger = -1; d.open = 0; d.focus.tap();
    ctx.haptic('light');
  }
  function closeOpen(d) { if (d.state === 'open') { d.focus.fade(); d.state = d.extra ? 'fade' : 'hang'; } }
  function stopHum() { holds.hum?.stop(); holds.hum = null; }

  function waterTouch(x, y, first) {
    const rm = reduced(), s = clamp((y - plan.hy) / Math.max(1, H - plan.hy), 0, 1);
    const r1 = (first ? 34 : 22) + 40 * s;
    rings.add(x, y, rm ? r1 * 0.6 : 2, rm ? r1 * 0.7 : r1, first ? 1.8 : 1.4, 0.28, '#ffffff', first ? 0.7 : 0.45, 1.2 + s);
    if (first && !rm) rings.add(x, y, 2, 20 + 22 * s, 1.3, 0.28, '#ffd1f0', 0.5, 1);
    if (elapsed - lastDrip > 0.12) { lastDrip = elapsed; ctx.sound('drip', { intensity: first ? 0.35 : 0.18, pitch: 0.9 + 0.3 * R(), pan: clamp((x / W) * 2 - 1, -1, 1) * 0.6 }); }
    if (!rm && first) for (let k = 0; k < Math.round(4 * dens()); k++) splash.spawn(x, y - 2, (R() - 0.5) * 60, -40 - 60 * R(), 0.6, 1.4 + R() * 1.6, 0, 0.7);
  }

  /** Give a drop's word to the thought: it falls in (or, with reduced motion, fades there and appears in the thought). */
  function give(d) {
    const res = naming.add(d.k);
    if (!res.added) { letGo(d); return; }
    d.state = 'fall'; d.t = 0; d.fx0 = d.x; d.fy0 = d.y; d.finger = -1;
    d.looked = d.focus.peak >= LAGOON.GIVE_K; d.stillSec = d.focus.stillSec;
    if (res.replaced != null) { const o = dropById(res.replaced); if (o) rise(o); }
    stopHum();
  }
  /** The drop lands in the thought. */
  function landed(d) {
    d.state = 'in'; d.alpha = 0;
    const x = thoughtX(), y = thoughtY(), rm = reduced();
    // (reduced motion: a ring of light that fades where it is, never one that spreads)
    halo.add(x, y, tS.r * (rm ? 1.4 : 0.9), tS.r * (rm ? 1.5 : 2.6), 1.6, 1, '#ffffff', 0.6, 1.6);
    if (!rm) halo.add(x, y, tS.r * 0.6, tS.r * 1.9, 1.2, 1, C.pink, 0.45, 1.2);
    if (!rm) for (let k = 0; k < Math.round(10 * dens()); k++) { const a = -Math.PI * (0.15 + 0.7 * R()); splash.spawn(x, y - tS.r * 0.6, Math.cos(a) * (50 + 70 * R()), Math.sin(a) * (60 + 80 * R()), 0.7 + 0.3 * R(), 1.5 + 2 * R(), 0, 0.85); }
    for (let k = 0; k < Math.round(6 * dens()); k++) motes.spawn(x + (R() - 0.5) * tS.r * 2, y + (R() - 0.5) * tS.r, (R() - 0.5) * 10, -18 - 22 * R(), 1.8 + R(), 3 + 3 * R(), 1, 0.7);
    tS.squash = 1;
    ctx.sound('drop-in', { intensity: 0.5, pitch: 0.95 + 0.1 * R() });
    ctx.haptic('soft');
    try { thought?.react?.('sigh'); } catch { /* optional */ }
    try { mallow?.react?.('nod'); } catch { /* optional */ }
    if (!rm) { try { realm?.pulse('ripple', { x, y: plan.hy + 10 }); } catch { /* decoration */ } }
    const count = naming.count;
    prog.name(count);
    // ("You gave it a word." is not true of "unsure": it says its own line, and the discovery waits for a word)
    const ev = d.k === UNSURE ? null : finder.given({ looked: !!d.looked, stillSec: d.stillSec || 0, count });
    if (ev && !discovered.has(ev.id)) {
      discovered.add(ev.id);
      ctx.discover(ev.id, ev.evidence);
      ctx.sound('chime', { intensity: 0.4 });
      if (ev.id === 'named') { try { mallow?.react?.(ctx.gentle ? 'nod' : 'comfort'); } catch { /* optional */ } }
    } else if (d.k === UNSURE) once('unsure');
    ctx.checkpoint('named', { n: count });
  }
  /** A word goes back: its drop rises out of the thought and hangs again. */
  function rise(d) {
    naming.remove(d.k);
    d.state = 'rise'; d.t = 0; d.fx0 = thoughtX(); d.fy0 = thoughtY(); d.x = d.fx0; d.y = d.fy0; d.focus.reset();
    ctx.sound('bubble', { intensity: 0.3 });
  }
  function ungive(k) {
    const d = dropById(k);
    if (!d || d.state !== 'in') return;
    rise(d);
    once('back');
  }
  function pillHit(d, x, y) { const b = d.pill; return !!b && inBox(x, y, b, 10); }

  // --------------------------------------------------------- dialogue --
  function line(k) {
    const d = ctx.entry.dialogue || {};
    return ctx.gentle && d.gentle && k in d.gentle ? d.gentle[k] : d[k];
  }
  function say(lines) { if (lines && !paused) ctx.say(lines, { who: 'blubi', kind: 'dialogue' }); }
  function once(k) { if (said.has(k)) return; said.add(k); say(line(k)); }

  // ------------------------------------------------------------ frame --
  const dens = () => (ctx.lowStim ? 0.5 : 1) * (ctx.density || 1);

  function frame(dt, now) {
    frameNo++;
    if (!plan) return;
    const rm = reduced();
    if (prepared && entered && !paused) {
      elapsed += dt;
      relayoutCheck(dt);
      step(dt, now, rm);
    }
    // the back: the realm, then the rain, the reflections and the rings on the water
    if (realm) {
      realm.setMood(moodNow(), { tau: 0.8 });
      realm.transform(complete ? 1 : clamp(0.55 * clearK), { tau: complete ? 1.4 : 1 });
      const f0 = fingers.find((q) => q.on);
      if (f0) realm.setFocus(clamp((f0.x / W) * 2 - 1, -1, 1) * 0.4, clamp((f0.y / H) * 2 - 1, -1, 1) * 0.3); else realm.setFocus(0, 0);
      if (!!realm.st.reduced !== rm) realm.setReducedMotion(rm);
      if (realm.st.low !== !!ctx.lowStim) realm.setLowStimulation(!!ctx.lowStim);
      realm.tick(dt * 1000);
      realm.draw();
      drawBack(realm.ctx, now, rm, dt);
    }
    drawFront(ctx.front.g, now, rm, dt);
    if (entered) { writeThought(); audioAndMallow(dt, now); }
  }

  function moodNow() {
    // the rain is the lagoon's heaviness (kept light: the realm's own rain stays off, this world draws its own)
    return { agitation: clamp(0.08 + 0.12 * intensity * (1 - clearK)), heaviness: clamp(0.3 * rainK * (1 - outroK * 0.5)), clarity: clamp(0.25 + 0.7 * clearK), warmth: clamp(0.35 + 0.45 * clearK) };
  }

  function step(dt, now, rm) {
    // lines
    if (introAt >= 0 && elapsed >= introAt) { introAt = -1; say(line('intro')); }
    if (arriveAt >= 0 && elapsed >= arriveAt) { arriveAt = -1; say(line('arrive')); }
    // the melt in: the thought's glide
    if (tS.from) {
      tS.glide = Math.min(1, tS.glide + dt / GLIDE_SEC);
      if (tS.glide >= 1) tS.from = null;
    }
    if (tS.rmFrom) { tS.rmFrom.k = Math.min(1, tS.rmFrom.k + dt / 1.2); if (tS.rmFrom.k >= 1) tS.rmFrom = null; }
    // fingers: speed decays when quiet; a resting finger in the air draws the nearest drop
    for (const f of fingers) {
      if (!f.on) continue;
      f.still = f.speed < LAGOON.STILL_U * U ? f.still + dt : 0;
      if (f.kind === 'air' && f.magnet && !f.drop && elapsed - f.t0 > MAGNET_SEC && f.magnet.state === 'hang') { take(f, f.magnet); f.drop.pulled = true; f.pulledAt = f.moved; }
    }
    // drops
    let holding = false, humK = 0;
    for (const d of drops) {
      stepDrop(d, dt, now, rm);
      if (d.state === 'held' || d.state === 'open') { holding = true; humK = Math.max(humK, d.focus.k); }
    }
    holds.hum?.update({ intensity: clamp(0.04 + 0.2 * humK) * (1 - outroK), pitch: 0.75 + 0.2 * humK });
    // orbs
    stepOrbs(dt, now, rm);
    // the thought: its feeling eases with each word given, and with the quiet after
    const quietK = clamp(prog.quiet / LAGOON.QUIET_SEC);
    const target = clamp(tS.base * (1 - 0.3 * Math.min(2, naming.count)) * (1 - 0.3 * quietK * (naming.count ? 1 : 0)), 0.1, 0.95);
    tS.tension += (target - tS.tension) * (1 - Math.exp(-dt / 1.4));
    tS.calm = clamp(1 - tS.tension);
    tS.squash *= Math.exp(-dt * 3);
    { const k = rm ? 1 : 1 - Math.exp(-dt / 0.35); tS.x += (plan.thought.x - tS.x) * k; tS.y += (plan.thought.y - tS.y) * k; }
    if (rm) { tS.ox = 0; tS.oy = 0; } else { tS.ox = Math.sin(now * 0.37 + 1.3) * 1.5; tS.oy = Math.sin(now * 0.61) * 3; }
    // the rain and the clarity
    rainT = complete ? 0 : clamp(0.35 + 0.55 * intensity * (emotion === 'sad' || emotion === 'lonely' ? 1.1 : 0.9)) * (1 - 0.32 * Math.min(2, naming.count)) * (1 - 0.6 * quietK * (naming.count ? 1 : 0));
    clearT = complete ? 1 : clamp(0.32 * Math.min(2, naming.count) + 0.36 * quietK * (naming.count ? 1 : 0));
    rainK += (rainT - rainK) * (1 - Math.exp(-dt / 2.2));
    clearK += (clearT - clearK) * (1 - Math.exp(-dt / 2.5));
    // progress
    const down = fingers.some((q) => q.on);
    const r = prog.update(dt, { down, holding, named: naming.count });
    if (r.complete && !complete) finish();
    // the hint: a ghost fingertip shows holding a drop still, then carrying it to the thought
    if (hint.age >= 0) { hint.age += dt; if (hint.age > HINT_SEC) hint.age = -1; }
    else if (!complete && !naming.ever.length && elapsed > hint.next && elapsed - lastTouch > 3 && hint.shown < 2 && !melt && meltK >= 1 && !down) {
      const d = drops.find((q) => q.state === 'hang' && q.k !== UNSURE) || drops.find((q) => q.state === 'hang');
      if (d) { hint = { ...hint, age: 0, drop: d, shown: hint.shown + 1, next: elapsed + HINT_AGAIN }; }
    }
    // splashes and motes
    splash.update(dt, 260, 0.4);
    motes.update(dt, -4, 0.5);
    rings.update(dt);
    halo.update(dt);
    // (completion: a little light keeps rising from the lagoon)
    if (complete && !rm && R() < dt * 3 * dens()) motes.spawn(R() * W, plan.hy + R() * 30, (R() - 0.5) * 6, -16 - 14 * R(), 3 + R() * 2, 3 + R() * 4, 2, 0.6);
    // a photo gives up its place to one waiting, now and then
    if (waiting.length && orbs.length) {
      turnClock += dt;
      if (turnClock > 14) { turnClock = 0; const o = orbs.find((q) => !q.out && q.alpha >= 1 && q.glow < 0.05); if (o) o.out = true; }
    }
  }

  function stepDrop(d, dt, now, rm) {
    const D = d.D;
    if (d.state === 'form') {
      d.t += dt / FORM_SEC;
      d.alpha = clamp(d.t);
      d.s = rm ? 1 : 0.4 + 0.6 * easeOut(d.t);
      d.x = d.hx; d.y = d.hy - (rm ? 0 : (1 - easeOut(clamp(d.t))) * 10);
      if (d.t >= 1) { d.state = 'hang'; d.s = 1; d.alpha = 1; }
      return;
    }
    if (d.state === 'in') { d.alpha = 0; return; }
    if (d.state === 'fall') {
      d.t += dt / (rm ? 0.5 : FALL_SEC);
      const k = clamp(d.t), tx = thoughtX(), ty = thoughtY() - tS.r * 0.1;
      if (rm) { d.x = d.fx0; d.y = d.fy0; d.alpha = 1 - k; }
      else {
        const e = k * k;                       // a drop falls: it gathers speed
        d.x = lerp(d.fx0, tx, easeInOut(k)); d.y = lerp(d.fy0, ty, e) - Math.sin(k * Math.PI) * D * 0.35;
        d.s = lerp(d.s, 0.55, 1 - Math.exp(-dt * 6)); d.alpha = 1 - smoothstep(0.85, 1, k);
      }
      if (k >= 1) landed(d);
      return;
    }
    if (d.state === 'rise') {
      d.t += dt / (rm ? 0.6 : RISE_SEC);
      const k = clamp(d.t);
      if (rm) { d.x = d.hx; d.y = d.hy; d.alpha = k; d.s = 1; }
      else { const e = easeInOut(k); d.x = lerp(d.fx0, d.hx, e) + Math.sin(k * Math.PI) * 14; d.y = lerp(d.fy0, d.hy, e); d.alpha = clamp(k * 2.5); d.s = 0.6 + 0.4 * e; }
      if (k >= 1) {
        // (a word kept from another feeling's drops has no place of its own here: it melts away once given back)
        if (d.extra) { d.state = 'gone'; d.alpha = 0; } else { d.state = 'hang'; d.alpha = 1; d.s = 1; }
      }
      return;
    }
    if (d.state === 'gone') { d.alpha = 0; return; }
    if (d.state === 'fade') { d.alpha -= dt / 0.5; if (d.alpha <= 0) { d.alpha = 0; d.state = 'gone'; } return; }
    d.alpha = Math.min(1, d.alpha + dt * 3);
    const f = d.state === 'held' ? fingerFor(d.finger) : null;
    if (d.state === 'held') {
      const speed = f ? f.speed : 0;
      const before = d.focus.latched;
      d.focus.update(dt, speed);
      if (!before && d.focus.latched) surfaced(d);
      if (f) {
        // the drop rides above the fingertip, never under the band
        const minY = bandBottom() + LAGOON.TOP_GAP + D * 0.8;
        const tx = clamp(f.x, LAGOON.EDGE + D / 2, W - LAGOON.EDGE - D / 2), ty = Math.max(minY, f.y - D * HOLD_LIFT - D * 0.2 * d.focus.k);
        const k = rm ? 1 : 1 - Math.exp(-dt * 18);
        const px = d.x, py = d.y;
        d.x += (tx - d.x) * k; d.y += (ty - d.y) * k;
        d.vx = (d.x - px) / Math.max(dt, 1e-3); d.vy = (d.y - py) / Math.max(dt, 1e-3);
      }
      const sT = 1 + 0.42 * easeOut(d.focus.k);
      d.s += (sT - d.s) * (1 - Math.exp(-dt * 8));
    } else if (d.state === 'open') {
      const before = d.focus.latched;
      d.focus.update(dt, 0);
      if (!before && d.focus.latched) surfaced(d);
      d.open += dt;
      const sT = 1 + 0.42 * easeOut(d.focus.k);
      d.s += (sT - d.s) * (1 - Math.exp(-dt * 8));
      springHome(d, dt, rm, 0.35);
      if (d.open > OPEN_SEC) closeOpen(d);
    } else {
      d.focus.update(dt, 0);
      d.s += (1 - d.s) * (1 - Math.exp(-dt * 5));
      springHome(d, dt, rm, 1);
    }
    // jelly wobble (velocity kicks it; it settles)
    if (!rm) {
      const kick = clamp(Math.hypot(d.vx, d.vy) / 900, 0, 1);
      d.wobV += (-80 * d.wob - 7 * d.wobV) * dt + kick * 0.6;
      d.wob += d.wobV * dt;
      d.wob = clamp(d.wob, -0.25, 0.25);
    } else { d.wob = 0; d.wobV = 0; }
  }
  function springHome(d, dt, rm, k) {
    const sway = rm ? 0 : Math.sin(elapsed * 0.7 + d.ph) * 3 * k, bob = rm ? 0 : Math.sin(elapsed * 1.1 + d.ph * 1.7) * 3.5 * k;
    const tx = d.hx + sway, ty = d.hy + bob;
    if (rm) { d.x += (tx - d.x) * (1 - Math.exp(-dt * 6)); d.y += (ty - d.y) * (1 - Math.exp(-dt * 6)); d.vx = d.vy = 0; return; }
    const ax = (tx - d.x) * 40 - d.vx * 9, ay = (ty - d.y) * 40 - d.vy * 9;
    d.vx += ax * dt; d.vy += ay * dt;
    d.x += d.vx * dt; d.y += d.vy * dt;
  }
  /** A word has come fully clear in the hand: noticed. */
  function surfaced(d) {
    d.surfaced = true;
    prog.look();
    ctx.sound('lens-focus', { intensity: 0.35 });
    ctx.haptic('soft');
    for (let k = 0; k < Math.round(5 * dens()); k++) motes.spawn(d.x + (R() - 0.5) * d.D, d.y + (R() - 0.5) * d.D * 0.5, (R() - 0.5) * 14, -12 - 18 * R(), 1.2 + R(), 2.5 + 2 * R(), 0, 0.7);
  }

  function stepOrbs(dt, now, rm) {
    for (let k = 0; k < orbs.length; k++) {
      const o = orbs[k];
      o.t += dt;
      o.glow = Math.max(0, o.glow - dt * 0.6);
      if (o.out) {
        o.alpha -= dt / 0.8;
        if (o.alpha <= 0) {
          // the next photo waiting takes this place
          waiting.push(o.i);
          const i = waiting.shift();
          Object.assign(o, { i, alpha: 0, t: 0, out: false, from: null, x: o.hx, y: o.hy });
        }
        continue;
      }
      if (o.from) {
        const e = easeInOut(clamp(o.t / GLIDE_SEC));
        o.x = lerp(o.from.x, o.hx, e); o.y = lerp(o.from.y, o.hy, e); o.alpha = 1;
        if (o.t >= GLIDE_SEC) o.from = null;
        continue;
      }
      o.alpha = Math.min(1, o.alpha + (o.t > 0 ? dt / 0.9 : 0));
      const sway = rm ? 0 : Math.sin(elapsed * 0.6 + o.ph) * 2.5, bob = rm ? 0 : Math.sin(elapsed * 0.9 + o.ph * 1.3) * 3;
      o.x += (o.hx + sway - o.x) * (1 - Math.exp(-dt * 4)); o.y += (o.hy + bob - o.y) * (1 - Math.exp(-dt * 4));
    }
  }
  function orbAt(x, y) { for (const o of orbs) if (o.alpha > 0.5 && (x - o.x) ** 2 + (y - o.y) ** 2 < (o.D / 2 + 12) ** 2) return o; return null; }

  function finish() {
    complete = true; completeAt = elapsed;
    if (!reduced()) { try { realm?.pulse('clear', { x: W / 2, y: plan.hy }); } catch { /* decoration */ } }
    ctx.sound('bloom', { intensity: 0.5 });
    try { mallow?.react?.(ctx.gentle ? 'nod' : 'comfort'); } catch { /* optional */ }
    try { thought?.settle?.(1); } catch { /* optional */ }
  }

  // ------------------------------------------------------ the thought --
  /** Where the thought is shown now (its home, or on its way there while melting in). */
  const shown = { x: 0, y: 0, s: 1, a: 1 };
  function thoughtShown() {
    let x = thoughtX(), y = thoughtY(), s = 1, a = tS.alpha;
    if (tS.from) {
      const e = easeInOut(tS.glide);
      x = lerp(tS.from.x, x, e); y = lerp(tS.from.y, y, e) - Math.sin(e * Math.PI) * 12; s = lerp(tS.from.scale, 1, e);
    } else if (tS.rmFrom) {
      // reduced motion: fades out where it was, then in at home (never both at once)
      const k = tS.rmFrom.k;
      if (k < 0.5) { x = tS.rmFrom.x; y = tS.rmFrom.y; s = tS.rmFrom.scale; a *= 1 - k * 2; } else a *= (k - 0.5) * 2;
    }
    shown.x = x; shown.y = y; shown.s = s; shown.a = a;
    return shown;
  }
  /** Write the handle (W2's layer draws it from these; the placeholder is drawn by drawThought). */
  function writeThought() {
    if (!thought) return;
    const p = thoughtShown();
    const rK = thought.r > 0 ? tS.r / thought.r : 1;
    thought.x = p.x; thought.y = p.y; thought.z = 0;
    thought.scale = p.s * rK * (1 + 0.06 * tS.squash);
    thought.labelSide = 'above';
    if (thought.labelFit !== wordsFit && (wordsFit || thought.labelFit)) thought.labelFit = wordsFit;
    if (!thought.draw) thought.opacity = clamp(p.a * tS.vis);
    const st = thought.state || (thought.state = {});
    st.tension = tS.tension; st.calm = tS.calm; st.charge = 0; st.distance = 0;
  }

  // ------------------------------------------------------------ draw --
  function buildSprites() {
    if (sprites) return;
    sprites = {
      drops: TINTS.map((t) => dropSprite(t)), frost: frostSprite(11),
      glow: glowSprite(C.blue, { size: 64, core: 0.4 }), pink: glowSprite(C.pink, { size: 64, core: 0.3 }), gold: glowSprite(C.gold, { size: 64, core: 0.5 }),
      white: glowSprite('#ffffff', { size: 64, core: 0.6 }), soft: glowSprite('#cfeaff', { size: 128 }), glint: glintSprite('#e6f6ff', 32),
    };
    sprites.list = [sprites.white, sprites.gold, sprites.pink];
    // each feeling drop's own soft light (what sets it apart from the realm's little hanging beads: it can be held)
    sprites.tints = TINTS.map((t) => glowSprite(t, { size: 64, core: 0.25 }));
  }

  function drawBack(g, now, rm, dt) {
    const hy = plan.hy;
    g.save();
    g.setTransform(realm.st.dpr, 0, 0, realm.st.dpr, 0, 0);
    // the drops' light on the water: a soft column under each one hanging over it
    g.globalCompositeOperation = 'lighter';
    for (const d of drops) {
      if (d.alpha <= 0.05 || d.state === 'in') continue;
      const ry2 = hy + Math.max(6, (hy - d.y) * 0.35 + 8);
      if (d.y > hy) continue;
      g.globalAlpha = 0.16 * d.alpha * (0.6 + 0.4 * d.focus.k);
      g.drawImage(sprites.glow, d.x - d.D * 0.4, ry2 - d.D * 0.12, d.D * 0.8, d.D * 0.24 + 6);
    }
    // the thought's light on the water
    { const p = thoughtShown(); g.globalAlpha = 0.18 * p.a * (0.5 + 0.5 * tS.calm); g.drawImage(sprites.pink, p.x - tS.r * 1.8, hy + 4, tS.r * 3.6, 18); }
    g.globalAlpha = 1;
    // rain: two passes (far, near), one path each
    drawRain(g, rm, dt);
    // rings on the lagoon
    rings.draw(g);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.restore();
  }

  function drawRain(g, rm, dt) {
    const hy = plan.hy;
    const want = Math.round(RAIN_MAX * rainK * dens() * (rm ? 0.4 : 1) * (1 - outroK));
    while (rainN < want) {
      const i = rainN++;
      rx[i] = R() * (W + 60) - 30; ry[i] = -R() * H; rz[i] = 0.3 + 0.7 * R();
      rv[i] = (480 + rz[i] * 420) * (rm ? 0.35 : 1);
      rT[i] = hy + 4 + Math.pow(R(), 1.3) * (H - hy);
    }
    if (!rainN) return;
    const slant = 0.1;
    g.strokeStyle = '#d6ecff'; g.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      g.globalAlpha = (pass ? 0.34 : 0.16) * clamp(rainK * 1.8);
      g.lineWidth = pass ? 1.1 : 0.7;
      g.beginPath();
      for (let i = 0; i < rainN; i++) {
        if ((rz[i] > 0.62) !== !!pass) continue;
        const len = (rm ? 6 : 10) + rz[i] * (rm ? 6 : 16);
        g.moveTo(rx[i], ry[i]); g.lineTo(rx[i] - slant * len, ry[i] - len);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    if (paused || !entered) return;
    for (let i = 0; i < rainN; i++) {
      ry[i] += rv[i] * dt; rx[i] += rv[i] * slant * dt;
      if (ry[i] >= rT[i]) {
        if (R() < 0.4) rings.add(rx[i], rT[i], 1, 7 + rz[i] * 12, 0.9, 0.28, '#e6f6ff', 0.4, 0.8);
        if (i >= want) { rainN--; rx[i] = rx[rainN]; ry[i] = ry[rainN]; rv[i] = rv[rainN]; rz[i] = rz[rainN]; rT[i] = rT[rainN]; i--; continue; }
        rx[i] = R() * (W + 60) - 30; ry[i] = -10 - R() * 60;
        rT[i] = hy + 4 + Math.pow(R(), 1.3) * (H - hy);
      }
    }
  }

  function drawFront(g, now, rm) {
    const c = g.canvas;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    const dpr = ctx.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!prepared) return;
    // photo orbs
    for (const o of orbs) drawOrb(g, o, now, rm);
    // the drops hanging, then the thought and its tag, then anything moving or in the hand above them
    // (all of them under the thought, its words and its tag: a drop carried over the person's words never hides them,
    // and one given falls in behind the thought)
    for (const d of drops) if (d.state === 'hang' || d.state === 'form' || d.state === 'rise' || d.state === 'fade') drawDrop(g, d, now, rm);
    for (const d of drops) if (d.state === 'held' || d.state === 'open' || d.state === 'fall') drawDrop(g, d, now, rm);
    drawThought(g, now, rm);
    drawTag(g, now);
    halo.draw(g);
    for (const d of drops) if (d.state === 'held' || d.state === 'open') drawPill(g, d); else d.pill = null;
    // light and water
    g.globalCompositeOperation = 'lighter';
    splash.draw(g, sprites.list, 1, 0.05);
    motes.draw(g, sprites.list, 1, 0.3);
    for (const f of fingers) if (f.on && (f.kind === 'water' || f.kind === 'air')) { g.globalAlpha = 0.35; g.drawImage(sprites.white, f.x - 18, f.y - 18, 36, 36); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    drawHint(g, now, rm);
  }

  function drawDrop(g, d, now, rm) {
    if (d.alpha <= 0.01) return;
    const r = dropR(d), spr = sprites.drops[d.tint], fr = sprites.frost;
    const w = r * 2 / 0.8, h = w * (spr.height / spr.width);
    const fog = 1 - d.focus.k;
    g.save();
    g.translate(d.x, d.y);
    // squash with the wobble, a tilt with the motion
    const sx = 1 + d.wob, sy = 1 - d.wob;
    if (!rm) g.rotate(clamp(d.vx / 2400, -0.25, 0.25));
    g.scale(sx, sy);
    // a soft halo (stronger as it clears)
    g.globalCompositeOperation = 'lighter';
    const breath = rm ? 0 : 0.07 * Math.sin(now * 1.4 + d.ph);
    g.globalAlpha = d.alpha * (0.42 + breath + 0.2 * d.focus.k);
    g.drawImage(sprites.tints[d.tint], -r * 1.75, -r * 2.05, r * 3.5, r * 3.5);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = d.alpha;
    g.drawImage(spr, -w / 2, -h * spr.cy, w, h);
    if (fog > 0.01) { g.globalAlpha = d.alpha * fog * 0.74; g.drawImage(fr, -w / 2, -h * fr.cy, w, h); }
    // inside a clearing drop: its word, small, when it fits (the pill above shows it large)
    if (d.focus.k > 0.35 && (d.state === 'held' || d.state === 'open' || d.state === 'fall')) {
      g.globalAlpha = d.alpha * 0.32 * smoothstep(0.35, 0.85, d.focus.k);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(sprites.gold, -r * 0.55, -r * 0.62, r * 1.1, r * 1.1);
      g.globalCompositeOperation = 'source-over';
    }
    // a glint now and then
    if (!rm) { const tw = Math.max(0, Math.sin(now * 0.9 + d.ph * 3)); if (tw > 0.92) { g.globalAlpha = d.alpha * (tw - 0.92) * 8; g.globalCompositeOperation = 'lighter'; g.drawImage(sprites.glint, -r * 0.65, -r * 0.65, r * 0.6, r * 0.6); g.globalCompositeOperation = 'source-over'; } }
    g.restore();
    g.globalAlpha = 1;
  }

  /** The word in the hand: a pill above the drop (beside it near the top of the stage), readable as soon as it shows. */
  const pillCache = new Map();
  function pillSprite(word) {
    if (pillCache.k !== layoutTK) { pillCache.clear(); pillCache.k = layoutTK; }
    let s = pillCache.get(word);
    if (s) return s;
    const dpr = Math.max(1, ctx.dpr || 1);
    measureG ||= makeCanvas(4, 4).getContext('2d');
    const k = layoutTK, font = ctx.font(20 * k, 800);
    measureG.font = font;
    const tw = Math.ceil(measureG.measureText(word).width), w = tw + 32, h = Math.round(44 * Math.max(1, k * 0.95));
    const c = makeCanvas(Math.ceil((w + 16) * dpr), Math.ceil((h + 16) * dpr));
    const g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(8, 8);
    const rr = h / 2;
    g.beginPath(); g.moveTo(rr, 0); g.arcTo(w, 0, w, h, rr); g.arcTo(w, h, 0, h, rr); g.arcTo(0, h, 0, 0, rr); g.arcTo(0, 0, w, 0, rr); g.closePath();
    g.fillStyle = 'rgba(8,14,52,0.78)'; g.fill();
    g.strokeStyle = 'rgba(200,232,255,0.5)'; g.lineWidth = 1.2; g.stroke();
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(127,212,255,0.7)'; g.shadowBlur = 8;
    g.fillStyle = '#ffffff';
    g.fillText(word, w / 2, h / 2 + 1);
    s = { c, w, h };
    pillCache.set(word, s);
    return s;
  }
  function drawPill(g, d) {
    const a = smoothstep(0.2, 0.55, d.focus.k);
    if (a <= 0.01) { d.pill = null; return; }
    const P = pillSprite(d.word), r = dropR(d);
    // above the drop; else beside it (the roomier side first), else under it — never over the person's words, the
    // thought or its tag, never in the band
    const minY = bandBottom() + LAGOON.TOP_GAP + P.h / 2, maxY = H - LAGOON.EDGE - P.h / 2, XR = freeW();
    const right = d.x < XR / 2, sx = r + 12 + P.w / 2;
    const ox = thoughtX() - plan.thought.x, oy = thoughtY() - plan.thought.y;
    const C0 = plan.cluster, CB = { x0: C0.x0 + ox - 4, y0: C0.y0 + oy - 4, x1: C0.x1 + ox + 4, y1: C0.y1 + oy + 4 };
    const PB = plateBox();
    const M = mallowBox(), HB = M ? { x0: M.left + 0.06 * M.width, y0: M.top, x1: M.right - 0.06 * M.width, y1: M.bottom } : null;
    const over = (B, o) => !!o && !(B.x1 < o.x0 || B.x0 > o.x1 || B.y1 < o.y0 || B.y0 > o.y1);
    let x = d.x, y = d.y - r * 1.55 - 10 - P.h / 2, best = null, bestCost = Infinity;
    // (cost: the person's words worst, then the hero, then the drop in the hand; the first clear place wins)
    const spots = PILL_SPOTS;
    spots[0][0] = d.x; spots[0][1] = d.y - r * 1.55 - 10 - P.h / 2;
    spots[1][0] = d.x + (right ? sx : -sx); spots[1][1] = d.y - r * 0.3;
    spots[2][0] = d.x + (right ? -sx : sx); spots[2][1] = d.y - r * 0.3;
    spots[3][0] = d.x; spots[3][1] = d.y + r + 14 + P.h / 2;
    spots[4][0] = CB.x0 - P.w / 2 - 6; spots[4][1] = d.y - r * 0.3;
    spots[5][0] = CB.x1 + P.w / 2 + 6; spots[5][1] = d.y - r * 0.3;
    spots[6][0] = d.x; spots[6][1] = CB.y1 + P.h / 2 + 6;
    spots[7][0] = d.x; spots[7][1] = CB.y0 - P.h / 2 - 6;
    spots[8][0] = d.x; spots[8][1] = d.y - r * 0.2;
    for (const [cx, cy] of spots) {
      const px = clamp(cx, LAGOON.EDGE + P.w / 2, XR - LAGOON.EDGE - P.w / 2), py = clamp(cy, minY, maxY);
      const B = { x0: px - P.w / 2, y0: py - P.h / 2, x1: px + P.w / 2, y1: py + P.h / 2 };
      const onDrop = Math.abs(px - d.x) < P.w / 2 + r * 0.8 && Math.abs(py - (d.y - r * 0.2)) < P.h / 2 + r * 1.1;
      // (the person's words: never; their thought and its tag, then the hero, then the drop itself)
      const cost = (over(B, PB) ? 1000 : 0) + (over(B, CB) ? 100 : 0) + (over(B, HB) ? 10 : 0) + (onDrop ? 1 : 0);
      if (cost < bestCost) { bestCost = cost; best = [px, py]; }
      if (!cost) break;
    }
    // (nowhere but over the person's words: no pill this frame — the drop's own light shows it is clear)
    if (bestCost >= 1000) { d.pill = null; return; }
    x = best[0]; y = best[1];
    g.globalAlpha = a;
    g.drawImage(P.c, x - P.w / 2 - 8, y - P.h / 2 - 8, P.w + 16, P.h + 16);
    if (d.focus.latched) { g.globalAlpha = a * 0.55; g.strokeStyle = C.gold; g.lineWidth = 1.5; roundRect(g, x - P.w / 2, y - P.h / 2, P.w, P.h, P.h / 2); g.stroke(); }
    g.globalAlpha = 1;
    d.pill = { x0: x - P.w / 2, y0: y - P.h / 2, x1: x + P.w / 2, y1: y + P.h / 2 };
  }
  const PILL_SPOTS = Array.from({ length: 9 }, () => [0, 0]);
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function drawOrb(g, o, now, rm) {
    if (o.alpha <= 0.01 || !photos) return;
    const D = o.D;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = o.alpha * (0.18 + 0.5 * o.glow);
    g.drawImage(sprites.soft, o.x - D, o.y - D, D * 2, D * 2);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    if (ctx.gentle && photos.standIn) {
      // a gentle session: no Mallow card faces in the rain, a plain soft light in the card's colour
      const col = photos.colour(o.i) || C.blue, [r0, g0, b0] = rgbOf(col.length === 7 ? col : C.blue);
      const gr = g.createRadialGradient(o.x - D * 0.14, o.y - D * 0.18, D * 0.04, o.x, o.y, D / 2);
      gr.addColorStop(0, `rgba(${r0},${g0},${b0},${(0.5 * o.alpha).toFixed(3)})`); gr.addColorStop(1, `rgba(${r0},${g0},${b0},${(0.08 * o.alpha).toFixed(3)})`);
      g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.y, D / 2, 0, TAU); g.fill();
      return;
    }
    try { photos.draw(g, o.i, o.x, o.y, D, { shape: 'drop', alpha: o.alpha, shadow: false, glow: 0.25 + 0.6 * o.glow, glowColour: C.blue, sheen: true }); } catch { /* no photo */ }
  }

  function drawThought(g, now, rm) {
    const p = thoughtShown();
    if (p.a <= 0.01) return;
    if (!thought) {
      // no Thought Mallow (no words were typed): a lily-pad cup of light takes the words
      const r = tS.r;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.45 * p.a * (0.6 + 0.4 * tS.calm); g.drawImage(sprites.pink, p.x - r * 2, p.y - r * 1.6, r * 4, r * 3.2);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = p.a;
      const gr = g.createLinearGradient(0, p.y - r * 0.5, 0, p.y + r * 0.6);
      gr.addColorStop(0, '#ffd0f0'); gr.addColorStop(1, '#a98fe6');
      g.fillStyle = gr; g.beginPath(); g.ellipse(p.x, p.y + r * 0.1, r * 1.15, r * 0.48, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,240,252,0.9)'; g.beginPath(); g.ellipse(p.x, p.y - r * 0.02, r * 0.86, r * 0.28, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(160,210,255,0.85)'; g.beginPath(); g.ellipse(p.x, p.y, r * 0.66, r * 0.18, 0, 0, TAU); g.fill();
      g.globalAlpha = 1;
      return;
    }
    // a soft light under it that warms as the feeling is named
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = (0.12 + 0.3 * clearK) * p.a; g.drawImage(sprites.gold, p.x - tS.r * 2.2, p.y - tS.r * 2.2, tS.r * 4.4, tS.r * 4.4);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    if (!thought.draw) return;
    try {
      const rr = tS.r * p.s;
      thought.draw(g, p.x, p.y, p.s * (1 + 0.06 * tS.squash), {
        radius: tS.r, tension: tS.tension, calm: tS.calm, charge: 0, reduced: rm, now, minX: LAGOON.EDGE, maxX: freeW() - LAGOON.EDGE,
        labelWidth: (plan.plate?.maxW || LAGOON.PLATE_MAX) - 2 * LAGOON.LABEL_PAD_X, labelLines: plan.plate?.lines || 2, labelY: -(rr + LAGOON.PLATE_GAP + (plan.plate?.h || 40)), alpha: p.a * tS.vis,
      });
    } catch { /* placeholder only */ }
  }

  // the tag: "This is…" and the words given, in the plan's reserved place under (or beside) the thought
  let tagSprite = null, tagKey = '';
  function buildTag() {
    const list = naming.list;
    const k = layoutTK;
    const key = `${list.join(',')}|${ctx.font(16, 700)}|${plan.tag.w}|${plan.tag.h}|${ctx.dpr}|${k}`;
    if (key === tagKey && tagSprite) return tagSprite;
    tagKey = key;
    measureG ||= makeCanvas(4, 4).getContext('2d');
    const words = list.map((i) => VOCAB[i]);
    // the rows, roomiest first: "This is… a · b" · "This is… a" / "and b" · "This is…" / "a · b" — then smaller type;
    // never bigger than the place the plan kept for it (a tag that grew would come over the thought, its words or the
    // hero): the roomiest wording that fits, in the largest type that fits — two rows in a one-row place only in small
    // type, and as a last resort the words alone, clipped to the box
    const rowsMax = plan.tag.rows || 2, boxW = plan.tag.w, boxH = plan.tag.h, maxW = boxW - 2 * LAGOON.TAG_PAD_X;
    const sets = !words.length ? [[['This is…', '']]]
      : words.length === 1 ? [[['This is… ', words[0]]], [['This is…', ''], ['', words[0]]], [['', words[0]]]]
        : [[['This is… ', words.join(' · ')]], [['This is… ', words[0]], ['and ', words[1]]], [['This is…', ''], ['', words.join(' · ')]], [['', words.join(' · ')]], [['', words[0]], ['', words[1]]]];
    let fontA, fontB, LINE, parts = null, padY = LAGOON.TAG_PAD_Y;
    const measure = (set) => set.map(([lead, rest]) => {
      measureG.font = fontA; const wl = lead ? measureG.measureText(lead).width : 0;
      measureG.font = fontB; const wr = rest ? measureG.measureText(rest).width : 0;
      return { lead, rest, wl, wr };
    });
    pick: for (const shrink of [1, 0.92, 0.85, 0.78, 0.7, 0.64]) {
      fontA = ctx.font(15 * k * shrink, 600); fontB = ctx.font(17 * k * shrink, 800); LINE = LAGOON.TAG_LINE * k * shrink;
      for (const set of sets) {
        padY = set.length > rowsMax ? 4 : LAGOON.TAG_PAD_Y;
        if (set.length * LINE + 2 * padY > boxH + 1) continue;
        parts = measure(set);
        if (parts.every((q) => q.wl + q.wr <= maxW)) break pick;
        parts = null;
      }
    }
    if (!parts) { const set = sets[sets.length - 1].slice(0, Math.max(1, Math.floor((boxH - 8) / LINE))); padY = 4; parts = measure(set); }
    const rows = parts;
    let tw = 0; for (const p of parts) tw = Math.max(tw, p.wl + p.wr);
    const w = Math.ceil(Math.min(boxW, tw + 2 * LAGOON.TAG_PAD_X)), h = Math.ceil(Math.min(boxH, rows.length * LINE + 2 * padY));
    const dpr = Math.max(1, ctx.dpr || 1);
    const c = makeCanvas(Math.ceil((w + 16) * dpr), Math.ceil((h + 16) * dpr));
    const g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(8, 8);
    roundRect(g, 0, 0, w, h, Math.min(18, h / 2));
    g.fillStyle = 'rgba(8,14,52,0.74)'; g.fill();
    g.strokeStyle = list.length ? 'rgba(255,214,242,0.55)' : 'rgba(200,232,255,0.35)'; g.lineWidth = 1;
    if (!list.length) g.setLineDash([4, 4]);
    g.stroke(); g.setLineDash([]);
    g.textBaseline = 'middle';
    g.save(); roundRect(g, 0, 0, w, h, Math.min(18, h / 2)); g.clip();
    const spans = [];
    parts.forEach((p, i) => {
      const y = padY + LINE * (i + 0.5) + 0.5;
      // (a row may be a lead alone — "This is…" over its words)
      const x0 = (w - (p.wl + p.wr)) / 2;
      g.font = fontA; g.fillStyle = 'rgba(214,236,255,0.92)'; g.shadowBlur = 0;
      if (p.lead) g.fillText(p.lead, x0, y);
      if (p.rest) {
        g.font = fontB; g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(255,184,236,0.65)'; g.shadowBlur = 8;
        g.fillText(p.rest, x0 + p.wl, y);
        g.shadowBlur = 0;
        // each word's span on the tag (for a tap that gives it back)
        let xx = x0 + p.wl;
        const bits = p.rest.split(' · ');
        for (let b = 0; b < bits.length; b++) {
          measureG.font = fontB;
          const bw = measureG.measureText(bits[b]).width;
          const wi = VOCAB.indexOf(bits[b]);
          if (wi >= 0) spans.push({ k: wi, x0: xx, x1: xx + bw, y0: y - LINE / 2, y1: y + LINE / 2 });
          xx += bw + (b < bits.length - 1 ? measureG.measureText(' · ').width : 0);
        }
      }
    });
    g.restore();
    tagSprite = { c, w, h, spans, empty: !list.length };
    return tagSprite;
  }
  function drawTag(g) {
    if (!plan) return;
    const T = buildTag(), P = plan.tag, p = thoughtShown();
    const a = p.a * (tS.from ? smoothstep(0.6, 1, tS.glide) : 1);
    // where it sits in its reserved box (it follows the thought's bob)
    let x0;
    if (P.mode === 'below') x0 = (P.x0 + P.x1) / 2 - T.w / 2; else if (P.mode === 'right') x0 = P.x0; else x0 = P.x1 - T.w;
    const y0 = P.mode === 'below' ? P.y0 : (P.y0 + P.y1) / 2 - T.h / 2;
    const dx = p.x - plan.thought.x, dy = p.y - plan.thought.y;
    const X = clamp(x0 + dx, LAGOON.EDGE, Math.max(LAGOON.EDGE, freeW() - LAGOON.EDGE - T.w)), Y = y0 + dy;
    tagNow.x0 = X; tagNow.y0 = Y; tagNow.x1 = X + T.w; tagNow.y1 = Y + T.h;
    tagNow.words = T.spans.map((s) => ({ k: s.k, x0: X + s.x0, x1: X + s.x1, y0: Y + s.y0, y1: Y + s.y1 }));
    if (a <= 0.01) return;
    g.globalAlpha = a;
    g.drawImage(T.c, X - 8, Y - 8, T.w + 16, T.h + 16);
    g.globalAlpha = 1;
  }

  function drawHint(g, now, rm) {
    if (hint.age < 0 || !hint.drop) return;
    const d = hint.drop, t = hint.age / HINT_SEC;
    const fade = smoothstep(0, 0.1, t) * (1 - smoothstep(0.88, 1, t));
    const tx = thoughtX(), ty = thoughtY();
    let x, y;
    if (rm) {
      // still: the fingertip resting on the drop, and a dotted way to the thought
      x = d.x; y = d.y + d.D * 0.3;
      g.globalAlpha = 0.5 * fade; g.setLineDash([3, 6]); g.strokeStyle = 'rgba(230,246,255,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(d.x, d.y); g.quadraticCurveTo((d.x + tx) / 2, Math.min(d.y, ty) - 30, tx, ty); g.stroke(); g.setLineDash([]);
    } else {
      // rest on the drop (it brightens a little), then carry it along a soft curve to the thought
      const k = smoothstep(0.5, 0.86, t);
      const mx = (d.x + tx) / 2, my = Math.min(d.y, ty) - 30;
      const u = 1 - k;
      x = u * u * d.x + 2 * u * k * mx + k * k * tx; y = u * u * (d.y + d.D * 0.3) + 2 * u * k * my + k * k * ty;
      if (t < 0.5) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.4 * smoothstep(0.1, 0.45, t) * fade; g.drawImage(sprites.white, d.x - d.D * 0.6, d.y - d.D * 0.7, d.D * 1.2, d.D * 1.2); g.globalCompositeOperation = 'source-over'; }
    }
    g.globalAlpha = 0.6 * fade;
    g.drawImage(sprites.white, x - 16, y - 16, 32, 32);
    g.globalAlpha = 0.5 * fade; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, 15, 0, TAU); g.stroke();
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------ audio + Mallow --
  function audioAndMallow(dt, now) {
    ambClock += dt;
    if (ambClock > 0.5) { ambClock = 0; ctx.ambienceMood({ agitation: 0.05, clarity: clamp(0.3 + 0.6 * clearK), heaviness: clamp(0.45 * rainK), warmth: clamp(0.35 + 0.45 * clearK) }); }
    if (!mallow) return;
    holdClock += dt;
    // Blubi: tender in the rain, curious about the drop in the hand, comforted as the rain turns to light
    if (now - emoAt > 0.7) {
      const held = drops.find((d) => d.state === 'held' || d.state === 'open');
      const looking = held ? held.focus.k : 0, named = Math.min(2, naming.count) / 2, quiet = clamp(prog.quiet / LAGOON.QUIET_SEC);
      const mix = ctx.gentle
        ? { calm: 0.4 + 0.3 * clearK, sad: 0.3 * (1 - clearK), comforted: Math.min(0.2, 0.08 + 0.12 * named), curious: 0.2 * looking }
        : { sad: 0.32 * (1 - clearK) * rainK, calm: 0.25 + 0.3 * quiet, curious: 0.12 + 0.35 * looking, comforted: 0.1 + 0.35 * named, relieved: 0.2 * quiet * named, happy: complete ? 0.18 : 0.04 };
      const key = Object.values(mix).map((v) => Math.round(v * 10)).join(',');
      if (key !== emoKey) { emoKey = key; emoAt = now; try { mallow.setEmotion?.(mix, 0.6, { quiet: true }); } catch { /* optional */ } }
    }
    if (mallow.lookAt) {
      const f = fingers.find((q) => q.on);
      const held = drops.find((d) => d.state === 'held' || d.state === 'open' || d.state === 'fall');
      const tx = held ? held.x : f ? f.x : thoughtX(), ty = held ? held.y : f ? f.y : thoughtY();
      if (held || f || ((now * 10) | 0) % 6 === 0) {
        const m = mallowBox();
        if (m) { try { mallow.lookAt(clamp((tx - (m.left + m.right) / 2) / (W * 0.5), -1, 1), clamp((ty - (m.top + 0.4 * m.height)) / (H * 0.5), -1, 1)); } catch { /* optional */ } }
      }
    }
  }

  // -------------------------------------------------------------- prepare --
  async function prepare() {
    if (prepared) return;
    layout(true);
    const rest = restBox() || defaultMallowBox(W, H);
    realm = createRealmCore('raindrop-lagoon', {
      W, H, dpr: ctx.dprBack, mood: moodNow(), reducedMotion: reduced(), lowStimulation: ctx.lowStim, groundY: clamp((rest.bottom + 2) / H, 0.6, 0.96), quality: 'auto',
    });
    realm.build();
    realm.setMood(moodNow(), { tau: 0.3 }).settle();
    buildSprites();
    // warm the photo sprites so the first frame never stalls
    if (photos?.n) {
      const scratch = makeCanvas(8, 8).getContext('2d');
      for (let i = 0; i < Math.min(7, photos.n); i++) { try { photos.draw(scratch, i, 4, 4, plan.D, { shape: 'drop', shadow: false }); photos.draw(scratch, i, 4, 4, plan.D, { shape: 'card', shadow: false }); } catch { /* no photo */ } }
    }
    try { await ctx.fontsReady?.(['voice', 'ui'], 900); } catch { /* the fallback font is fine */ }
    tagKey = ''; pillCache.clear();
    tS.base = clamp(0.4 + 0.45 * intensity, 0.3, 0.9); tS.tension = tS.base;
    rainK = rainT = clamp(0.35 + 0.55 * intensity);
    prepared = true;
    // the very first frame is drawn now (a melt never shows an empty layer)
    frame(0, 0);
  }

  // --------------------------------------------------------------- api --
  const api = {
    prepare,
    get backCanvas() { return realm?.canvas || null; },
    enter({ from, handoff } = {}) {
      entered = true;
      const rm = reduced();
      layout(true);
      if (restored) {
        for (const d of drops) if (naming.has(d.k)) { d.state = 'in'; d.alpha = 0; }
        if (restored.complete) { complete = true; completeAt = 0; clearK = clearT = 1; rainK = rainT = 0; realm?.transform(1).settle(); }
      }
      if (handoff && from) {
        // melting in: the thought glides from where it was; postcards or bubbles glide in and become glass drops
        melt = { k: 0 };
        meltK = 0;
        const th = handoff.thought;
        if (thought && th && Number.isFinite(th.x) && Number.isFinite(th.y)) {
          const scale = clamp(((th.r || tS.r) * (th.scale ?? 1)) / tS.r, 0.3, 2.5);
          if (rm) tS.rmFrom = { x: th.x, y: th.y, scale, k: 0 };
          else { tS.from = { x: th.x, y: th.y, scale }; tS.glide = 0; }
          if (Number.isFinite(th.tension)) { tS.base = clamp(0.5 * tS.base + 0.5 * th.tension, 0.3, 0.9); tS.tension = tS.base; }
        }
        const ph = Array.isArray(handoff.photos) ? handoff.photos : [];
        for (const o of orbs) {
          const src = ph.find((q) => q.i === o.i);
          if (src && !rm && Number.isFinite(src.x)) { o.from = { x: src.x, y: src.y }; o.t = 0; o.x = src.x; o.y = src.y; o.alpha = 1; }
        }
        drops.forEach((d, j) => { if (d.state === 'form') d.t = -0.4 - 0.22 * j; });
      } else {
        // a cold start: the person's thought already on screen arrives from there
        if (thought && Number.isFinite(thought.x) && Number.isFinite(thought.y) && (thought.x || thought.y) && !restored) {
          const scale = clamp((thought.r > 0 ? thought.r * (thought.scale || 1) : tS.r) / tS.r, 0.3, 2.5);
          if (Math.hypot(thought.x - tS.x, thought.y - tS.y) > 8) { if (rm) tS.rmFrom = { x: thought.x, y: thought.y, scale, k: 0 }; else { tS.from = { x: thought.x, y: thought.y, scale }; tS.glide = 0; } }
        }
        introAt = restored ? -1 : 2.4;
      }
      try { thought?.react?.(thought?.ov?.appear >= 1 ? 'notice' : 'appear'); } catch { /* optional */ }
    },
    frame,
    pointer(s) {
      // a tap on a photo orb makes it glow and ring the water (the world's own; not a drop)
      if (s.type === 'down' && prepared && !paused && plan) {
        const o = orbAt(s.x, s.y);
        if (o && !dropAt(s.x, s.y)) { o.glow = 1; rings.add(o.x, Math.max(plan.hy + 6, o.y + o.D), 3, 46, 1.6, 0.28, '#ffd1f0', 0.6, 1.4); ctx.sound('glass', { intensity: 0.3 }); ctx.haptic('light'); lastTouch = elapsed; if (!everTouched) { everTouched = true; firstTouchAt = elapsed; } return; }
      }
      pointer(s);
    },
    get metrics() {
      const held = drops.find((d) => d.state === 'held' || d.state === 'open');
      return {
        named: naming.list.map((k) => VOCAB[k]), ever: naming.ever.length, focus: held ? held.focus.k : 0, latched: held ? held.focus.latched : false,
        rain: Math.round(rainK * 100) / 100, clear: Math.round(clearK * 100) / 100, tension: Math.round(tS.tension * 100) / 100,
        quiet: Math.round(prog.quiet * 10) / 10, played: Math.round(prog.played * 10) / 10, progress: api.progress, drops: drops.length, orbs: orbs.length, waiting: waiting.length,
      };
    },
    get progress() { return complete ? 1 : prog.p; },
    get complete() { return complete; },
    intro(k) { meltK = k; if (melt) { melt.k = k; if (k >= 1) { melt = null; arriveAt = elapsed + 0.6; } } },
    outro(k) { outroK = k; },
    handoff() {
      const p = thoughtShown();
      return {
        horizonY: plan ? plan.hy : Math.round(H * LAGOON.HORIZON), palette: { sky: '#0e3f8f', deep: '#06205a', warm: '#ffe1a8' }, seeds: [],
        thought: thought ? { x: p.x, y: p.y, scale: p.s, tension: tS.tension, r: tS.r, labelW: plan?.plate?.maxW || LAGOON.PLATE_MAX } : null,
        photos: orbs.filter((o) => o.alpha > 0.5).map((o) => ({ i: o.i, x: o.x, y: o.y, w: o.D, h: o.D, rot: 0, state: 'floating', shape: 'drop' })),
        energy: clamp(rainK),
      };
    },
    pause() {
      paused = true; stopHum();
      for (const f of fingers) { if (f.drop && f.drop.state === 'held') letGo(f.drop); f.on = false; f.drop = null; }
    },
    resume() { paused = false; },
    /** The person named another feeling: the rain follows it and the unnamed drops take new words. */
    setEmotion(id, i) {
      const k = Number.isFinite(i) ? clamp(i) : intensity;
      const d = ctx.entry.dialogue?.feeling || {};
      const lines = k > intensity + 0.04 ? d.more : k < intensity - 0.04 ? d.less : id !== emotion ? d.other : null;
      const changed = id && id !== emotion;
      intensity = k; if (id) emotion = id;
      if (changed && plan) reword();
      try { mallow?.react?.('nod'); } catch { /* optional */ }
      if (lines && !paused && !ctx.gentle) { introAt = -1; say(lines); }
    },
    /** A gentle session now (after care): quiet lines only (the director stops offers), Blubi soft and never grinning. */
    setGentle() { emoKey = ''; },
    setThought(h) {
      if (thought && thought !== h) { try { if (thought.labelFit && thought.labelFit === wordsFit) thought.labelFit = null; } catch { /* */ } }
      thought = h || null;
      if (prepared) layout(false);
      tagKey = '';
    },
    /** Client rects to keep subtitles off: the thought with its words and tag, the drops, the word in the hand, fingers. */
    avoid() {
      const out = [];
      if (!plan) return out;
      const band = ctx.band;
      const C0 = plan.cluster, dx = thoughtX() - plan.thought.x, dy = thoughtY() - plan.thought.y;
      out.push({ x: C0.x0 + dx, y: C0.y0 + dy, w: C0.x1 - C0.x0, h: C0.y1 - C0.y0, kind: 'thought' });
      for (const d of drops) if (d.alpha > 0.1 && d.state !== 'in') { const r = dropR(d); out.push({ x: d.x - r - 4, y: d.y - r * 1.5 - 4, w: 2 * r + 8, h: r * 2.5 + 8, kind: 'drop' }); if (d.pill) out.push({ x: d.pill.x0, y: d.pill.y0, w: d.pill.x1 - d.pill.x0, h: d.pill.y1 - d.pill.y0, kind: 'drop' }); }
      for (const o of orbs) if (o.alpha > 0.1) out.push({ x: o.x - o.D / 2 - 4, y: o.y - o.D / 2 - 4, w: o.D + 8, h: o.D + 8, kind: 'photo' });
      for (const f of fingers) if (f.on && !(band && f.y < band.y + band.h)) out.push({ x: f.x - 60, y: f.y - 60, w: 120, h: 120, kind: 'finger' });
      return out;
    },
    subtitleBand() { const b = ctx.band; return b ? { x: b.x, y: b.y, w: b.w, h: b.h } : null; },
    serialize() {
      return {
        v: 1, seed: ctx.seed, progress: Math.round(api.progress * 1000) / 1000, complete, discoveries: [...discovered],
        named: naming.snapshot(), prog: prog.snapshot(), elapsed: Math.round(elapsed),
      };
    },
    restore(s) {
      if (!s || s.v !== 1) return false;
      for (const id of s.discoveries || []) { if (typeof id === 'string') { discovered.add(id); finder.markFired(id); } }
      naming.restore(s.named);
      prog.restore(s.prog);
      complete = !!s.complete || prog.complete;
      restored = { complete };
      if (plan) layout(true);
      return true;
    },
    resize(w, h, { dprBack } = {}) {
      const same = Math.round(w) === Math.round(W) && Math.round(h) === Math.round(H);
      W = w; H = h; U = Math.min(W, H);
      for (const d of drops) d.focus.setU(U);
      if (realm && realm.resize(W, H, dprBack)) realm.build();
      tagKey = ''; pillCache.clear();
      if (!same && prepared) layout(false);
    },
    setQuality({ dprBack } = {}) { if (realm && dprBack) { realm.resize(W, H, dprBack); realm.build(); } },
    destroy() {
      stopHum();
      realm?.destroy(); realm = null;
      // (the words plate it asked for goes with it)
      try { if (thought && thought.labelFit && thought.labelFit === wordsFit) thought.labelFit = null; } catch { /* a handle without it */ }
    },
    /** QA hooks (dev lab, Playwright). Not product API. */
    debug: {
      get plan() { return plan; }, get drops() { return drops.map((d) => ({ k: d.k, word: d.word, state: d.state, x: d.x, y: d.y, D: d.D, s: d.s, focus: d.focus.k, latched: d.focus.latched, hx: d.hx, hy: d.hy, pill: d.pill ? { ...d.pill } : null })); },
      get orbs() { return orbs.map((o) => ({ i: o.i, x: o.x, y: o.y, D: o.D, alpha: o.alpha })); }, get waiting() { return waiting.slice(); },
      get thought() { const p = thoughtShown(); return { x: p.x, y: p.y, s: p.s, a: p.a, r: tS.r, tension: tS.tension, home: { x: tS.x, y: tS.y } }; },
      get tag() { return { ...tagNow, words: tagNow.words.map((w) => ({ ...w, word: VOCAB[w.k] })) }; }, get hint() { return { ...hint, drop: hint.drop ? hint.drop.word : null }; },
      get realm() { return realm; }, get fingers() { return fingers; }, get rain() { return { n: rainN, k: rainK }; },
    },
  };
  return api;
}
