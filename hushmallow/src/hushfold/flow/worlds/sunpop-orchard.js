// World 7 — Boppo's Sunpop Orchard (a kinder voice: talk to yourself the way you'd talk to a friend).
//
// Design note. The person's Thought Mallow, with their exact words, sits on a swing under an arbour of two sunpop
// trees, like a friend sitting in the shade. Sunpops hang down both trees. The touch here is the tone of a touch:
//   · a gentle hold (a finger resting on or near a sunpop) warms it — a ring of light fills round it and it ripens
//     from lime to gold in under two seconds; holding still anywhere warms the nearest one more slowly, so nothing
//     needs a precise target;
//   · quick pokes and fast swipes only make sunpops wobble on their stems and shake a leaf loose — allowed, noticed,
//     never punished (ripeness never goes down), but they ripen nothing;
//   · a sunpop that ripens under a finger stays cupped in it: let go and it floats over to the thought (one that
//     ripened from afar goes by itself) and becomes a light in a small crown round its head. Each one eases the
//     thought's own tension a little — and only that does: it never calms by itself;
//   · photos hang as sunpops with a window: a gentle hold warms the photo from misty back to its own colours, and it
//     sends a little light to the thought, then stays on the tree;
//   · a hand held still on the thought itself warms it a little (a hand on a friend's shoulder).
// The storm is about the pace of a stroke and the ocean about where a stroke sends things; the orchard is about how
// long and how softly a finger rests. Its emotional purpose follows the skill's three steps: notice the tone (pokes
// wobble, holds ripen — 'gentle-hands'), picture a friend (the thought on the swing, in the shade), offer one kind
// thing at a time (each sunpop given, and the thought softening — 'kinder', which offers A Kinder Voice).
//
// Calm enough for someone who is low: no jolts (a ripening is a slow bloom, a gift a soft glide; no flashes), a warm
// but not glaring palette (the realm's heaviness from the chosen feeling greys it a little at first and the person's
// warmth lifts it), and in a gentle session no quips, no faces on the sunpops and no grin on Boppo.
//
// Layers: the sunpop-orchard realm core (src/world/realms/sunpop-orchard.js) is the back layer; the two trees, painted
// once per layout (sunpop-orchard-art.js), are drawn into it after the realm frame. The front layer (above the hero)
// has the stems, sunpops, gifts in flight, the swing and its crown, the thought and its words (always on top), the
// fingers' warmth and the hint. Layout and every rule that is not drawing: sunpop-orchard-rules.js (node-tested).

import { createRealmCore } from '../../../world/realm.js';
import { glowSprite, glintSprite, Pool, Rings, clamp, lerp, smoothstep, TAU, makeCanvas } from '../../../world/util.js';
import {
  ORCHARD, planOrchard, plateSize, thoughtRadius, createFruit, stepFruit, pokeFruit, pickFruit, heatFor,
  tensionFor, reliefFor, createGentleHandsDetector, createKinderDetector, createOrchardProgress,
} from './sunpop-orchard-rules.js';
import { ART, fruitSprite, leafSprite, rimSprite, plankSprite, paintTrees } from './sunpop-orchard-art.js';
import { wrapLines } from '../placeholders.js';

/** The registry entry (brief §16). Not in WORLDS yet: the coordinator adds it to registry.js at integration. */
export const SUNPOP_ORCHARD = {
  id: 'sunpop-orchard',
  title: 'Boppo’s Sunpop Orchard',
  version: 1,
  realm: 'sunpop-orchard',
  horizon: 0.665,
  palette: { sky: '#ff9f72', deep: '#e85d78' },
  purpose: 'Notice the tone of your touch, and offer your thought the warmth you would offer a friend.',
  technique: {
    name: 'Self-compassion: a kinder inner voice',
    related: ['Treating yourself as you would a friend', 'Noticing self-critical tone', 'Mental digestion (contemplative inspiration)'],
  },
  evidence: {
    classification: 'Moderate – intervention family',
    skill: 'A Kinder Voice',
    related: [],
    basis: 'Self-compassion practices in general can help with self-criticism and low mood. hushmallow itself hasn’t been studied.',
    sources: ['pubmed 37362192'],
    framing: 'Pokes are allowed and only noticed, never punished; warmth is offered, not forced: no affirmations to repeat, no promise that a thought goes away.',
  },
  scene: 'A warm apricot afternoon in Boppo’s floating orchard: two sunpop trees make an arbour over a swing where the Thought Mallow sits in the shade; '
    + 'sunpops hang down both trees, ripening from lime to gold, and every one given becomes a small light in a crown round the thought. The finish is golden hour with a soft rainbow.',
  touch: [
    { gesture: 'A gentle hold on a sunpop', effect: 'Warms it: a ring of light fills round it and it ripens to gold in under two seconds, then stays cupped under the finger.' },
    { gesture: 'Letting go of a ripe sunpop', effect: 'It floats to the Thought Mallow and becomes a light in its crown; the thought softens a little.' },
    { gesture: 'Holding still anywhere', effect: 'Warms the nearest sunpop more slowly (nothing needs a precise target).' },
    { gesture: 'Quick pokes and fast swipes', effect: 'Sunpops wobble on their stems and a leaf drifts down; nothing ripens and nothing is lost.' },
    { gesture: 'A hand held still on the Thought Mallow', effect: 'Warms it a little, like a hand on a friend’s shoulder.' },
    { gesture: 'A gentle hold on a photo sunpop', effect: 'Its photo warms from misty back to its own colours and sends a little light to the thought.' },
  ],
  mallow: {
    id: 'boppo',
    behaviour: 'Watches the finger, else the thought; nods as a sunpop ripens and gives a small happy hop when a light reaches the thought (in a gentle session: calm and comforted, never grinning); '
      + 'sighs contentedly at golden hour.',
  },
  input: {
    words: 'The person’s exact words ride on the Thought Mallow on the swing, on a readable plate under it; nothing ever covers them.',
    photos: { becomes: 'sunpops with a round window, hanging in the trees', change: 'a gentle hold warms each photo from misty to its own colours', shape: 'circle', standIn: 'the seven Mallow cards',
      gentle: 'the stand-in cards become plain sunpops' },
  },
  progression: [
    'Sunpops hang unripe; Boppo shows a gentle hold once.',
    'Quick pokes wobble them (allowed, noticed); a gentle hold ripens one.',
    'Each ripe sunpop given becomes a light round the thought, and it softens a step.',
    'Discovery: being gentle with it, the way you would be with a friend, softened it.',
    'Natural completion: five lights given after real play; golden hour. It stays playable: sunpops regrow.',
  ],
  dialogue: {
    intro: ['Mm. Sunpops.', 'Try holding one, gently.'],
    arrive: ['Oh! The orchard.', 'Try holding a sunpop, gently.'],
    pokes: ['Boing. That’s allowed.', 'A slow, gentle hold works too.'],
    firstGift: ['That one’s for your thought.'],
    firstGiftEmpty: ['That one’s for the swing.'],
    // a gentle session (after a loss, a death, harm or care): no quips, nothing to cheer about
    gentle: {
      intro: ['Somewhere warm.', 'Take all the time you need.'],
      arrive: ['Somewhere warm.', 'Take all the time you need.'],
      pokes: ['A slow, gentle hold works here.'],
    },
    complete: 'The orchard’s glowing now. Stay, or drift on?',
    completeStay: 'The orchard’s glowing now. Stay as long as you like.',
    feeling: {
      more: ['A bit more weather today.', 'The orchard can hold that.'],
      less: ['A little lighter.', 'The orchard heard you.'],
      other: ['Noted. The orchard’s listening.'],
    },
  },
  discoveries: {
    // about the tone of a touch: nothing to keep here (the orchard's tool is offered with 'kinder')
    'gentle-hands': { skillId: null, offer: false, lines: ['Quick pokes made it wobble.', 'A gentle hold ripened it.'] },
    kinder: { skillId: 'kinder-voice', lines: ['Look. It’s softer now.', 'You were gentle with it,', 'the way you’d be with a friend.'] },
    'kinder-light': { skillId: 'kinder-voice', lines: ['All that warmth came from you.', 'The kind you’d give a friend.'] },
  },
  sound: {
    ambience: 'sunpop-orchard',
    holds: { hum: 'rises softly while a sunpop is being warmed, its pitch following the ripeness' },
    fx: ['a soft pluck for a poke (120 ms apart at most)', 'a bloom as a sunpop ripens', 'a chime as a light reaches the thought, a step higher each time', 'a shimmer at golden hour'],
  },
  haptics: ['light on a poke', 'soft as a sunpop ripens', 'light when a light reaches the thought', 'success at a discovery'],
  completion: {
    rule: 'At least five sunpops given, at least 30 s of play and the thought really softened (the \'kinder\' discovery) — or nine given — then 2 s with every finger lifted.',
    after: 'Golden hour: the realm ripens, a soft rainbow rises behind Boppo, the crown glows. Sunpops keep regrowing; it stays playable.',
  },
  transition: {
    next: null,
    melt: 'In: the mask spreads from the outgoing world’s horizon; sunpops grow in on their stems as it reaches them. Out: from the orchard’s horizon (0.665 H).',
    handoff: 'In: the Thought Mallow glides from where it was to the swing, keeping its words; photos glide into their sunpops. Reduced motion: a crossfade with everything in place. '
      + 'Out: the thought, its tension and the photos where they hang.',
  },
  memory: { skillId: 'kinder-voice' },
  accessibility: {
    tapAlt: 'Holding still anywhere warms the nearest sunpop; no strokes or precise taps are needed.',
    reducedMotion: 'No sway or bob, wobbles damped, a gift fades into the crown instead of gliding, the hint is still; the melt is a straight crossfade.',
    lowStimulation: 'Fewer motes and leaves, softer glow.',
    precision: 'Every sunpop is a 48 px target or more, and a hold anywhere works.',
  },
  playtest: { results: [], note: 'Built 15 Oct; browser-checked in the dev lab (Chromium). Not yet playtested with real users or on a phone.' },
  status: 'playable',
  // warm and slow, but it has playful lines and faces: not one of the worlds a gentle session picks by itself
  calm: false,
  fits: {
    emotions: { sad: 1, lonely: 1, frustrated: 0.8, overwhelmed: 0.75, anxious: 0.7, other: 0.7, restless: 0.55, angry: 0.45 },
    intentions: { steady: 0.9, calm: 0.85, play: 0.85, distract: 0.8, 'let-go': 0.65 },
  },
  next: [],
  load: () => import('./sunpop-orchard.js'),
};

const C = { gold: '#ffd23a', warm: '#ffb24a', cream: '#fff6e4', sun: '#fff2c2', leaf: ART.leafMid };
const GIFT_MIN = 1.0, GIFT_MAX = 2.0;       // s a sunpop takes to float to the thought
const GLIDE_SEC = 2.2;                       // melting in: the thought (and photos) glide to their places
const MELT_GLIDE_AT = 0.18;                  // …from this far into the melt
const HINT_AT = 4.5, HINT_SEC = 3.2, HINT_MAX = 3;
const PHOTO_TURN_SEC = 14;                   // with photos waiting, a warmed photo sunpop gives up its place this often
const RELAYOUT_TOL = 12;
const SWAY = 0.016, SWAY_W = TAU / 5.6;      // the swing's own sway (rad, rad/s)
const clock = () => (typeof performance !== 'undefined' ? performance.now() : 0);
const easeInOut = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const normBox = (r) => {
  if (!r || !(r.height > 20) || !(r.width > 20)) return null;
  const left = r.left ?? r.x, top = r.top ?? r.y;
  return { left, top, right: r.right ?? left + r.width, bottom: r.bottom ?? top + r.height, width: r.width, height: r.height };
};
const moved = (a, b, tol) => (!a || !b ? !!a !== !!b : Math.abs(a.left - b.left) > tol || Math.abs(a.right - b.right) > tol || Math.abs(a.top - b.top) > tol || Math.abs(a.bottom - b.bottom) > tol);
// the feeling → the realm's starting weather (a low feeling greys it a little; the person's warmth lifts it)
const HEAVY = { sad: 0.42, lonely: 0.38, overwhelmed: 0.3, anxious: 0.22, frustrated: 0.2, angry: 0.2, restless: 0.16, other: 0.2 };

export function create(ctx) {
  const { photos } = ctx;
  const mallow = ctx.mallow || null;
  let thought = ctx.thought || null;
  const R = ctx.rand;
  let W = ctx.W, H = ctx.H, U = ctx.U;
  const reduced = () => !!ctx.reduced;
  const low = () => !!ctx.lowStim;
  let heavy = clamp((HEAVY[ctx.emotion] ?? 0.2) * (0.6 + 0.6 * clamp(ctx.intensity ?? 0.6)), 0, 0.45);

  // ------------------------------------------------------------- state --
  let realm = null, horizonY = Math.round(H * 0.665);
  let plan = null, trees = null, sprites = null, fruitS = 0;
  let prepared = false, entered = false, paused = false, complete = false, completeAt = -1, outroK = 0;
  let elapsed = 0, lastTouch = -1e9, everTouched = false, frameNo = 0;
  let progP = 0;
  let givenBase = 0, handBase = 0;                    // what was given before the thought now on the swing came
  const seenT0 = new WeakMap();                        // each handle's own starting tension (never one this world wrote)
  let given = 0, hand = 0, t0 = null, relief = 0, tension = 0.6, warmK = 0, glowPulse = 0;
  const prog = createOrchardProgress();
  const gentleD = createGentleHandsDetector();
  const kinderD = createKinderDetector();
  const discovered = new Set();
  const said = { pokes: false, firstGift: false };
  let introAt = -1, arriving = false, pokesSeen = 0, ripenedAny = false;
  let melt = null;                       // { k, t, glide } while melting in
  let restored = null;
  let lastPluck = -9, emoAt = -9, emoKey = '', ambClock = 0, holdClock = 0;
  let hum = null;
  let wordsFit = null, heldFit = null, textMax = 200, plateLines = 2, plateH = 0;
  let layoutRest = null, layoutBandB = 0, layoutFreeW = 0, pendingRect = null, pendingFor = 0, relayoutClock = 0;
  let measureG = null;
  const layoutLog = { n: 0 };
  const hint = { next: HINT_AT, shown: 0, age: -1, fruit: -1 };
  const timing = { realm: 0, trees: 0, front: 0 };     // (QA: ms per frame, EMA)

  // sunpops, photos waiting their turn, gifts in flight, the crown of lights
  let fruits = [];
  let waiting = [];
  const gifts = Array.from({ length: 10 }, () => ({ on: false, x0: 0, y0: 0, cx: 0, cy: 0, x: 0, y: 0, t: 0, T: 1, D: 40, slot: 0, fade: false, trail: 0 }));
  const lit = new Float32Array(ORCHARD.CROWN_N);   // each crown light's 0..1 (eased in as it arrives)
  let litN = 0, nextSlot = 0;
  // the swing (a damped angle about the rope's knot) and the thought on it
  const swing = { a: 0, v: 0 };
  const tS = { x: 0, y: 0, sx: 0, sy: 0, r: 30, alpha: 0, vis: 1, glide: null, rmFrom: null, ko: { x: 0, y: 0 }, squeeze: 0 };
  // fingers (two at most)
  const fingers = [0, 1].map(() => ({ on: false, id: -1, x: 0, y: 0, x0: 0, y0: 0, t0: 0, len: 0, speedU: 0, held: 0, onThought: false, cup: null, target: -1, heat: 0, near: false, lastBrisk: -9 }));
  const fingerFor = (id) => { for (const f of fingers) if (f.on && f.id === id) return f; return null; };
  // particles
  const motes = new Pool(90);     // warm pollen rising from a sunpop being warmed, trails of gifts (lighter)
  const leaves = new Pool(16);    // a leaf shaken loose by a poke
  const rings = new Rings(12);
  // the hero (its box this frame; read once a frame)
  let boxFrame = -1, boxCache = null;
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
  const hero = { ok: false, cx: 0, top: 0, h: 1 };

  // ------------------------------------------------------------ layout --
  /** W2's ThoughtLayer when it draws the person's thought (it measures the words), else null. */
  const wordsLayer = () => (thought && !thought.draw && ctx.thoughtLayer?.plateFor ? ctx.thoughtLayer : null);
  /** The words plate: ≤ `lines` lines at 17 → 15 px (as the placeholder and W2's layer draw it). */
  function plateFor(tok, maxText, lines, r) {
    if (!tok) return null;
    const L = wordsLayer();
    if (L) {
      const maxW = Math.round(maxText + 2 * ORCHARD.LABEL_PAD_X);
      let P = null;
      try { P = L.plateFor(thought, { lines, maxW, r, z: 0 }); } catch { P = null; }
      if (P && P.w > 0 && P.h > 0) {
        // (the layer hangs its words P.below under the handle — lower than this world's own r + PLATE_GAP: the plan
        // reserves the difference, so the words it shows are where the plan kept room for them)
        const pad = Number.isFinite(P.below) ? Math.max(0, Math.ceil(P.below - (r + ORCHARD.PLATE_GAP))) : 0;
        return { w: Math.ceil(P.w), h: Math.ceil(P.h) + pad, lines: P.rows || P.lines || lines, fit: { lines, maxW }, pad };
      }
    }
    try {
      measureG ||= makeCanvas(4, 4).getContext('2d');
      for (const px of [17, 16, 15]) {
        measureG.font = ctx.font(px, 700);
        const ls = wrapLines(measureG, tok, maxText);
        if (ls.length <= lines || px === 15) {
          if (ls.length > lines && lines === 1) return null;
          const n = Math.min(lines, ls.length);
          let tw = 0; for (let k = 0; k < n; k++) tw = Math.max(tw, measureG.measureText(ls[k]).width);
          return { ...plateSize(tw, n), w: Math.ceil(tw + 2 * ORCHARD.LABEL_PAD_X) };
        }
      }
    } catch { /* an estimate below */ }
    return plateSize(Math.min(maxText, tok.length * 8.5), lines);
  }

  function layout(first = true) {
    frameNo++;
    const rest = restBox();
    layoutLog.n++;
    layoutRest = rest; layoutBandB = (ctx.band?.y || 0) + (ctx.band?.h || 0);
    const XR = Number.isFinite(ctx.freeW) && ctx.freeW > 0 ? Math.min(W, ctx.freeW) : W;
    layoutFreeW = XR;
    const tok = thought ? (thought.token || ctx.words?.token || '') : '';
    const max2 = Math.min(ORCHARD.PLATE_MAX, XR - 2 * ORCHARD.EDGE) - 2 * ORCHARD.LABEL_PAD_X, max1 = XR - 2 * ORCHARD.EDGE - 2 * ORCHARD.LABEL_PAD_X;
    const r0 = thoughtRadius(W, H);
    let pl = tok ? plateFor(tok, max2, 2, r0) : null;
    // (with no words the swing still hangs there, empty: the lights gather round its seat)
    let p = planOrchard({ W, H, band: ctx.band, mallow: rest, x1: XR, plate: pl, thought: true });
    textMax = max2; plateLines = pl?.lines || 2;
    // a short screen: the words on one wide line when two would not fit between the band and the hero
    // (and rather one wide line than words in the room kept for the hero's hop)
    if (pl && pl.lines > 1 && (!p.fits || p.tight)) {
      const pl1 = plateFor(tok, max1, 1, r0);
      if (pl1) {
        const p1 = planOrchard({ W, H, band: ctx.band, mallow: rest, x1: XR, plate: pl1, thought: true });
        if ((p1.fits && !p1.tight) || (p1.fits && !p.fits) || p1.thought.r > p.thought.r) { p = p1; pl = pl1; textMax = max1; plateLines = 1; }
      }
    }
    plan = p;
    plateH = pl?.h || 0;
    wordsFit = pl?.fit ? { lines: pl.fit.lines, maxW: pl.fit.maxW } : null;
    tS.r = plan.thought?.r || thoughtRadius(W, H);
    // sunpops: one per place; a re-plan keeps every sunpop (and its ripeness) and glides it to its new place
    const n = Math.min(photos?.n || 0, 7);
    if (!fruits.length) {
      // (at most three photo sunpops at once, and always more plain ones to give: the rest take turns)
      const shown = Math.max(0, Math.min(n, 3, Math.floor(plan.slots.length / 2)));
      // photos take the places nearest the swing's height first (they are the easiest to see)
      const order = plan.slots.map((s, k) => k).sort((a, b) => Math.abs(plan.slots[a].y - (plan.thought?.y ?? H * 0.4)) - Math.abs(plan.slots[b].y - (plan.thought?.y ?? H * 0.4)));
      const photoAt = new Map(order.slice(0, shown).map((k, j) => [k, j]));
      fruits = plan.slots.map((s, k) => Object.assign(createFruit(s, { photo: photoAt.has(k) ? photoAt.get(k) : -1 }), { sx: s.x, sy: s.y, alpha: 1, fade: 0, kept: 0, from: null, delay: 0, gx: s.x, gy: s.y }));
      waiting = [];
      for (let i = shown; i < n; i++) waiting.push(i);
    } else {
      const old = fruits;
      fruits = plan.slots.map((s, k) => {
        const f = old[k] || Object.assign(createFruit(s), { sx: s.x, sy: s.y, alpha: 1, fade: 0, kept: 0, from: null, delay: 0 });
        Object.assign(f, { x: s.x, y: s.y, D: s.D, ax: s.ax, ay: s.ay, side: s.side, gx: f.sx, gy: f.sy });
        return f;
      });
      // (photos whose sunpop went with a smaller screen wait their turn again)
      for (let k = fruits.length; k < old.length; k++) if (old[k].photo >= 0) waiting.push(old[k].photo);
      if (first) for (const f of fruits) { f.sx = f.x; f.sy = f.y; }
    }
    buildSprites();
    paintBackTrees();
    heroFromRect();
  }

  function relayoutCheck(dt) {
    relayoutClock += dt;
    if (relayoutClock < 0.25) return;
    const step = relayoutClock; relayoutClock = 0;
    const r = restBox();
    const fw = Number.isFinite(ctx.freeW) && ctx.freeW > 0 ? Math.min(W, ctx.freeW) : W;
    const bb = (ctx.band?.y || 0) + (ctx.band?.h || 0);
    if (!(moved(r, layoutRest, RELAYOUT_TOL) || Math.abs(bb - layoutBandB) > 4 || Math.abs(fw - layoutFreeW) > 4)) { pendingRect = null; pendingFor = 0; return; }
    // wait until the move has settled (the shell glides its Mallow for 720 ms), or 2 s at most
    pendingFor += step;
    if (pendingRect && moved(r, pendingRect, 8) && pendingFor < 2) pendingFor = Math.min(pendingFor, step);
    pendingRect = r;
    if (pendingFor >= 0.5) { pendingRect = null; pendingFor = 0; layout(false); }
  }

  function heroFromRect() {
    const m = mallowBox();
    if (!m) { hero.ok = false; return; }
    hero.ok = true; hero.cx = (m.left + m.right) / 2; hero.top = m.top; hero.h = m.height;
  }

  function buildSprites() {
    const d = Math.min(2, ctx.dpr || 1);
    const S = Math.ceil(ORCHARD.D_MAX * 1.25 * d / 8) * 8;
    if (sprites && fruitS === S) { if (plan.thought) sprites.plank = plankSprite(Math.round(plan.thought.r * 2.5), 7, d); return; }
    fruitS = S;
    sprites = {
      bud: fruitSprite(S, false), ripe: fruitSprite(S, true), rimBud: rimSprite(S, false), rimRipe: rimSprite(S, true),
      leaf: leafSprite(Math.ceil(28 * d)), glow: glowSprite(C.gold, { size: 64, core: 0.5 }), halo: glowSprite('#ffc23a', { size: 64, falloff: 3.2 }), warm: glowSprite(C.warm, { size: 128 }),
      sun: glowSprite(C.sun, { size: 64, core: 0.6 }), glint: glintSprite('#fff4c0', 48), mote: glowSprite('#ffe9a0', { size: 32, core: 0.7, falloff: 5 }),
      pad: glowSprite('#fff8e6', { size: 64, core: 0.2, falloff: 3 }),
    };
    sprites.motes = [sprites.mote, sprites.glow, sprites.sun];
    sprites.leaves = [sprites.leaf];
    if (plan.thought) sprites.plank = plankSprite(Math.round(plan.thought.r * 2.5), 7, d);
  }
  function paintBackTrees() {
    try { trees = paintTrees(plan, realm?.st?.dpr || ctx.dprBack || 1, ctx.seed || 1); } catch { trees = null; }
  }

  // ------------------------------------------------------------ prepare --
  async function prepare() {
    if (prepared) return;
    realm = createRealmCore('sunpop-orchard', { W, H, dpr: ctx.dprBack, emotion: 'calm', reducedMotion: reduced(), lowStimulation: low() });
    realm.build();
    horizonY = realm.horizonY;
    realm.setMood(moodNow(), {}).settle();
    layout(true);
    // warm the photo sprites so the first frame never stalls
    if (photos?.n) {
      const scratch = makeCanvas(8, 8).getContext('2d');
      for (const f of fruits) if (f.photo >= 0) { try { photos.draw(scratch, f.photo, 4, 4, f.D, { shape: 'circle', shadow: false, tone: 'mist', toneMix: 1 }); photos.draw(scratch, f.photo, 4, 4, f.D, { shape: 'circle', shadow: false }); } catch { /* optional */ } }
    }
    try { await ctx.fontsReady?.(['voice'], 900); } catch { /* the fallback font is fine */ }
    frame(0, 0);
    prepared = true;
  }

  // ------------------------------------------------------------ the mood --
  function moodNow() {
    const w = warmK, p = prog.complete ? 1 : 0;
    return { agitation: 0.06 + 0.08 * (1 - w), heaviness: heavy * (1 - 0.85 * w) * (1 - p), clarity: 0.5 + 0.4 * w, warmth: 0.5 + 0.45 * w };
  }

  // ------------------------------------------------------------- input --
  function hitThought(x, y) {
    if (!thought || !plan?.thought || tS.alpha < 0.5) return false;
    try { if (thought.hitTest?.(x, y)) return true; } catch { /* placeholder */ }
    return Math.hypot(x - tS.sx, y - tS.sy) < Math.max(24, tS.r * 1.2);
  }
  const fruitR = (f) => Math.max(ORCHARD.HIT_MIN, f.D * 0.56) + 4;
  function fruitAt(x, y) {
    let best = -1, bd = Infinity;
    for (let k = 0; k < fruits.length; k++) {
      const f = fruits[k];
      if (f.state === 'gone' || f.alpha < 0.5) continue;
      const d = Math.hypot(x - f.sx, y - f.sy);
      if (d < fruitR(f) && d < bd) { bd = d; best = k; }
    }
    return best;
  }

  function pointer(s) {
    if (paused || !prepared || !entered) return;
    if (s.type === 'down') {
      const f = fingers.find((q) => !q.on);
      if (!f) return;
      Object.assign(f, { on: true, id: s.id, x: s.x, y: s.y, x0: s.x, y0: s.y, t0: elapsed, len: 0, speedU: 0, held: 0, cup: null, target: -1, heat: 0, near: false });
      f.onThought = hitThought(s.x, s.y);
      // a ripe sunpop waiting on its stem (a touch was interrupted): this touch cups it
      if (!f.onThought) { const k = fruitAt(s.x, s.y); const q = k >= 0 ? fruits[k] : null; if (q && q.state === 'ripe' && q.heldBy < 0) { f.cup = q; q.heldBy = fingers.indexOf(f); q.cx = q.sx; q.cy = q.sy; } }
      everTouched = true; lastTouch = elapsed; hint.age = -1; hint.next = elapsed + 14; introAt = -1;
      rings.add(s.x, s.y, 4, 22, 0.8, 1, '#fff2b0', 0.5, 1.4);
      if (f.onThought) { tS.squeeze = 1; try { thought?.react?.('squeeze'); thought?.pointer?.(s); } catch { /* optional */ } }
      return;
    }
    const f = fingerFor(s.id);
    if (!f) return;
    if (s.type === 'move') {
      lastTouch = elapsed;
      f.speedU = s.speedU ?? (U ? s.speed / U : 0);
      if (s.idle) return;
      const d = Math.hypot(s.x - f.x, s.y - f.y);
      f.len += d; f.x = s.x; f.y = s.y;
      if (f.onThought) { try { thought?.pointer?.(s); } catch { /* optional */ } }
      if (f.speedU > ORCHARD.STILL_U) f.held = 0;
      // a quick swipe through the trees: the sunpops it passes wobble (and a leaf drifts down) — nothing more
      if (f.speedU >= ORCHARD.BRISK_U && d > 0.5) {
        for (const q of fruits) {
          if (q.state === 'gone' || q === f.cup) continue;
          if (Math.hypot(s.x - q.sx, s.y - q.sy) < q.D * 0.7 && elapsed - (q.brushAt || -9) > 0.35) {
            q.brushAt = elapsed;
            pokeFruit(q, Math.sign(s.vx || 1), 0.8, reduced());
            poked(q, s.x, s.y);
          }
        }
      }
      return;
    }
    if (s.type === 'up' || s.type === 'cancel') {
      const dur = elapsed - f.t0;
      if (f.cup) { if (s.type === 'up') release(f); else unCup(f); }
      else if (s.type === 'up' && f.len < ORCHARD.TAP_PX && dur < ORCHARD.TAP_SEC && !f.onThought) {
        const k = fruitAt(s.x, s.y);
        if (k >= 0) { const q = fruits[k]; pokeFruit(q, s.x < q.sx ? 1 : -1, 1, reduced()); poked(q, s.x, s.y); }
      }
      if (f.onThought) { try { thought?.pointer?.(s); thought?.react?.('release'); } catch { /* optional */ } }
      f.on = false; f.id = -1; f.onThought = false; f.cup = null; f.target = -1; f.heat = 0;
    }
  }
  function poked(q, x, y) {
    q.pokedAt = elapsed;
    gentleD.poke();
    pokesSeen++;
    if (elapsed - lastPluck > 0.12) { lastPluck = elapsed; ctx.sound('pluck', { intensity: 0.16, pitch: q.ripe > 0.5 ? 1.12 : 1 }); ctx.haptic('light'); }
    if (leaves.n < (low() ? 6 : 14) && !reduced()) leaves.spawn(q.ax + (R() - 0.5) * 16, q.ay - 4, (R() - 0.5) * 30, 14 + R() * 12, 2.4 + R() * 1.2, 5 + R() * 2, 0, 0.9);
    rings.add(q.sx, q.sy, q.D * 0.4, q.D * 0.62, 0.6, 1, '#fff6d8', 0.35, 1.2);
    try { mallow?.lookAt?.(clamp((x - hero.cx) / (W * 0.5), -1, 1), clamp((y - hero.top) / (H * 0.5), -1, 1)); } catch { /* optional */ }
    // a few pokes and nothing ripened yet: Boppo says, once, that a hold works too
    if (!said.pokes && !ripenedAny && pokesSeen >= 4) { said.pokes = true; say(line('pokes')); }
  }

  // --------------------------------------------------------- the warmth --
  /** Each finger warms the sunpop it rests on or near (or, from anywhere, the nearest bud, more slowly). */
  function warmFingers(dt) {
    for (const q of fruits) { q.heatIn = 0; q.via = null; }
    let any = 0;
    for (const f of fingers) {
      if (!f.on) continue;
      if (f.speedU < ORCHARD.STILL_U) f.held += dt;
      f.heat = 0; f.target = -1; f.near = false;
      if (f.cup) continue;
      if (f.onThought) {
        // a hand on the thought: it warms a little (capped), and nothing else
        if (f.speedU < ORCHARD.STILL_U && f.held >= ORCHARD.HOLD_DELAY) { hand += dt; f.heat = 1; any = Math.max(any, 0.4); }
        continue;
      }
      let best = -1, bd = Infinity;
      for (let k = 0; k < fruits.length; k++) {
        const q = fruits[k];
        if (q.state !== 'bud' || q.alpha < 0.5 || q.heldBy >= 0) continue;
        const d = Math.hypot(f.x - q.sx, f.y - q.sy);
        if (d < bd) { bd = d; best = k; }
      }
      if (best < 0) continue;
      const q = fruits[best];
      const h = heatFor(f, bd, q.D, U);
      if (h.heat <= 0) continue;
      f.heat = h.heat; f.target = best; f.near = !!h.near;
      if (h.heat > q.heatIn) { q.heatIn = h.heat; q.via = h.near ? 'near' : 'far'; q.warmer = f; }
      any = Math.max(any, h.heat * (0.3 + 0.7 * q.ripe));
    }
    // the hum follows the warming (one hold for all fingers)
    holdClock += dt;
    if (any > 0 && !paused) {
      if (!hum) { hum = ctx.hold('hum', { intensity: 0.05, pitch: 0.7 }); }
      if (holdClock > 1 / 12) { holdClock = 0; hum.update?.({ intensity: clamp(0.05 + 0.16 * any) * (1 - outroK), pitch: 0.68 + 0.24 * any }); }
    } else if (hum) { hum.stop?.(); hum = null; }
  }

  function stepFruits(dt, rm) {
    for (let k = 0; k < fruits.length; k++) {
      const q = fruits[k];
      // melting in: a photo glides from where it hung in the last world; sunpops grow in on their stems
      if (q.delay > 0) { q.delay -= dt; continue; }
      const ev = stepFruit(q, dt, q.heatIn || 0, q.via, rm);
      if (ev === 'ripened') ripened(q);
      // where it is drawn: its place, swung by its stem (the wobble), easing after a re-plan
      const ease = 1 - Math.exp(-dt / 0.45);
      q.gx += (q.x - q.gx) * ease; q.gy += (q.y - q.gy) * ease;
      const L = Math.max(8, q.gy - q.ay), sway = rm ? 0 : Math.sin(elapsed * 0.9 + k * 1.7) * 0.025;
      const a = q.wob + sway;
      let x = q.ax + (q.gx - q.ax) + Math.sin(a) * L, y = q.ay + Math.cos(a) * L;
      if (q.from && q.fromK < 1) { const e = easeInOut(q.fromK); x = lerp(q.from.x, x, e); y = lerp(q.from.y, y, e); }
      q.sx = x; q.sy = y;
      // a cupped sunpop rests just above the fingertip (so the finger never hides it)
      if (q.heldBy >= 0) {
        const f = fingers[q.heldBy];
        if (f?.on && f.cup === q) {
          const tx = f.x, ty = f.y - q.D * 0.7, e = 1 - Math.exp(-dt / 0.09);
          q.cx = q.cx == null ? q.sx : q.cx + (tx - q.cx) * e; q.cy = q.cy == null ? q.sy : q.cy + (ty - q.cy) * e;
        } else unCup({ cup: q });
      }
      // a warmed photo with photos waiting: after a while it hands its place on
      if (q.photo >= 0 && q.state === 'kept') {
        q.kept += dt;
        if (waiting.length && q.kept > PHOTO_TURN_SEC && !q.fade) q.fade = 0.001;
      }
      if (q.fade > 0) {
        q.fade += dt / 1.1; q.alpha = 1 - clamp(q.fade);
        if (q.fade >= 1) { waiting.push(q.photo); q.photo = waiting.shift(); q.state = 'grow'; q.grow = 0; q.ripe = 0; q.kept = 0; q.fade = 0; q.alpha = 1; }
      }
      // warming: pollen rises from it
      if (q.heatIn > 0 && !rm && motes.n < (low() ? 30 : 80) && R() < dt * (6 + 10 * q.heatIn)) {
        const a2 = R() * TAU, rr = q.D * 0.5;
        motes.spawn(q.sx + Math.cos(a2) * rr, q.sy + Math.sin(a2) * rr * 0.8, (R() - 0.5) * 10, -12 - R() * 16, 1.1 + R() * 0.8, 2 + R() * 2.2, (R() * 3) | 0, 0.7);
      }
    }
  }

  /** Is this sunpop a photo now? (Not the stand-in cards in a gentle session: those are plain sunpops.) */
  function showsPhoto(i) { return i >= 0 && !!photos?.n && !(ctx.gentle && photos.standIn); }
  function ripened(q) {
    ripenedAny = true;
    // ('Quick pokes made it wobble. A gentle hold ripened it.': the very sunpop that was poked)
    gentleD.ripened({ via: q.ripenedBy === 'near' ? 'near' : 'far', poked: elapsed - (q.pokedAt ?? -1e9) < 20 });
    q.pokedAt = -1e9;
    ctx.sound('bloom', { intensity: 0.2 });
    ctx.haptic('soft');
    rings.add(q.sx, q.sy, q.D * 0.45, q.D * 0.95, 1.4, 1, '#fff2b0', 0.45, 2);
    try { mallow?.react?.('nod'); } catch { /* optional */ }
    if (showsPhoto(q.photo)) {
      // a photo stays on its tree, warm in its own colours: it sends a little light to the thought
      q.state = 'kept'; q.kept = 0;
      launch(q.sx, q.sy, Math.min(30, q.D * 0.5));
      return;
    }
    // ripened under a finger resting near it: it stays cupped there until the finger lets go
    const f = q.warmer;
    if (f?.on && f.near && !f.cup) {
      f.cup = q; q.heldBy = fingers.indexOf(f); q.cx = q.sx; q.cy = q.sy;
      return;
    }
    launch(q.sx, q.sy, q.D);
    pickFruit(q);
  }
  /** Not let go (paused, a cancelled touch): the sunpop goes back on its stem, ripe; the next touch on it cups it. */
  function unCup(f) {
    const q = f.cup;
    if (!q) return;
    q.heldBy = -1; q.cx = q.cy = null;
    for (const g of fingers) if (g.cup === q) g.cup = null;
  }
  /** A finger lets go of its cupped sunpop: it floats to the thought. */
  function release(f) {
    const q = f.cup;
    if (!q) return;
    const x = q.cx ?? q.sx, y = q.cy ?? q.sy;
    q.heldBy = -1; q.cx = q.cy = null;
    for (const g of fingers) if (g.cup === q) g.cup = null;
    launch(x, y, q.D);
    pickFruit(q);
  }

  // ------------------------------------------------------------- gifts --
  function crownPoint(slot, out) {
    const c = plan.crown[slot % Math.max(1, plan.crown.length)];
    if (!c) { out.x = tS.sx; out.y = tS.sy - tS.r - 12; return out; }
    // the crown swings with the swing (it is round the thought's head)
    const dx = c.x - plan.thought.x, dy = c.y - plan.thought.y;
    out.x = tS.sx + dx; out.y = tS.sy + dy;
    return out;
  }
  const cp = { x: 0, y: 0 };
  function launch(x, y, D) {
    const g = gifts.find((q) => !q.on) || gifts[0];
    const slot = litN < plan.crown.length ? (nextSlot++ % Math.max(1, plan.crown.length)) : -1;
    crownPoint(Math.max(0, slot), cp);
    const dist = Math.hypot(cp.x - x, cp.y - y);
    Object.assign(g, { on: true, x0: x, y0: y, x, y, t: 0, T: clamp(dist / (0.6 * U), GIFT_MIN, GIFT_MAX), D, slot, fade: reduced(), trail: 0 });
    // up first, then over to the thought's head (round its words, never across them)
    g.cx = lerp(x, cp.x, 0.12); g.cy = Math.min(y, cp.y) - 0.1 * U;
    if (slot >= 0) litN = Math.min(plan.crown.length, litN + 1);
    try { mallow?.lookAt?.(clamp((x - hero.cx) / (W * 0.5), -1, 1), clamp((y - hero.top) / (H * 0.5), -1, 1)); } catch { /* optional */ }
  }
  function stepGifts(dt) {
    for (const g of gifts) {
      if (!g.on) continue;
      g.t += dt / g.T;
      crownPoint(Math.max(0, g.slot), cp);
      if (g.fade) { g.x = g.x0; g.y = g.y0; }
      else {
        const e = easeInOut(g.t), u = 1 - e;
        g.x = u * u * g.x0 + 2 * u * e * g.cx + e * e * cp.x;
        g.y = u * u * g.y0 + 2 * u * e * g.cy + e * e * cp.y;
        g.trail += dt;
        if (g.trail > 0.05 && motes.n < (low() ? 30 : 80)) { g.trail = 0; motes.spawn(g.x + (R() - 0.5) * 6, g.y + (R() - 0.5) * 6, (R() - 0.5) * 8, 6 + R() * 8, 0.7 + R() * 0.5, 1.6 + R() * 1.8, (R() * 3) | 0, 0.6); }
      }
      if (g.t >= 1) { g.on = false; arrived(g); }
    }
  }
  function arrived(g) {
    given++;
    if (g.slot >= 0) lit[g.slot] = Math.max(lit[g.slot], 0.001);
    else glowPulse = 1;            // the crown is full: the light settles into the thought
    relief = reliefFor(given - givenBase, hand - handBase);
    // a chime a step higher each time (a soft pentatonic climb, back down after the fifth)
    const steps = [1, 1.125, 1.25, 1.5, 1.6875];
    ctx.sound('chime', { intensity: 0.18, pitch: steps[(given - 1) % steps.length] });
    ctx.haptic('light');
    crownPoint(Math.max(0, g.slot), cp);
    rings.add(cp.x, cp.y, 3, 16, 0.9, 1, '#fff2b0', 0.5, 1.4);
    if (!reduced()) swing.v += 0.05 * (R() < 0.5 ? -1 : 1);
    try { if (thought && given % 2 === 1) thought.react?.('sigh'); thought?.settle?.(clamp(relief / ORCHARD.RELIEF_MAX)); } catch { /* optional */ }
    try { if (!ctx.gentle && !reduced() && given % 3 === 1) mallow?.react?.('hop'); else if (ctx.gentle) mallow?.react?.('comfort'); } catch { /* optional */ }
    if (!said.firstGift) { said.firstGift = true; say(thought ? line('firstGift') : line('firstGiftEmpty')); }
  }

  // ------------------------------------------------------------ thought --
  function seat(out) {
    // the swing turns about the knot of its ropes
    const T = plan.thought, k = plan.ropes ? plan.ropes.y0 : T.y - 80;
    const L = T.y - k, a = swing.a;
    out.x = T.x + Math.sin(a) * L; out.y = k + Math.cos(a) * L;
    return out;
  }
  const st0 = { x: 0, y: 0 };
  function updateThought(dt, now, rm) {
    // the swing: its own slow sway, nudged by arriving lights (none under reduced motion)
    const target = rm ? 0 : SWAY * Math.sin(now * SWAY_W);
    swing.v += ((target - swing.a) * 9 - swing.v * 2.2) * dt;
    swing.a = clamp(swing.a + swing.v * dt, -0.06, 0.06);
    if (rm) { swing.a *= Math.exp(-dt / 0.2); swing.v = 0; }
    tS.squeeze = Math.max(0, tS.squeeze - dt * 2);
    if (!plan?.thought) return;
    seat(st0);
    // the shell's open card (the garden offer) is kept clear of the thought and its words: it eases aside
    let kx = 0, ky = 0;
    const ko = ctx.keepOut?.() || [];
    if (ko.length) {
      const x0 = st0.x - Math.max(tS.r, (plan.plate ? (plan.plate.x1 - plan.plate.x0) / 2 : 0)), x1 = 2 * st0.x - x0;
      const y0 = st0.y - tS.r, y1 = plan.plate ? plan.plate.y1 + (st0.y - plan.thought.y) : st0.y + tS.r;
      for (const r of ko) {
        const rx0 = r.left ?? r.x, ry0 = r.top ?? r.y, rx1 = r.right ?? rx0 + (r.width ?? r.w ?? 0), ry1 = r.bottom ?? ry0 + (r.height ?? r.h ?? 0);
        if (!(rx0 < x1 && rx1 > x0 && ry0 < y1 && ry1 > y0)) continue;
        const up = ry0 - y1 - 8, down = ry1 - y0 + 8;
        ky += Math.abs(up) < Math.abs(down) ? up : down;
      }
      ky = clamp(ky, -(st0.y - tS.r - (plan.bandB + 4)), H - 8 - (plan.plate ? plan.plate.y1 : st0.y + tS.r));
    }
    const e = 1 - Math.exp(-dt / 0.4);
    tS.ko.x += (kx - tS.ko.x) * e; tS.ko.y += (ky - tS.ko.y) * e;
    let x = st0.x + tS.ko.x, y = st0.y + tS.ko.y;
    // melting in: it glides from where it was in the last world (reduced motion: it fades there, then here)
    if (tS.glide) {
      const G = tS.glide;
      if (melt && melt.k >= MELT_GLIDE_AT) G.k = Math.min(1, G.k + dt / GLIDE_SEC);
      else if (!melt) G.k = Math.min(1, G.k + dt / GLIDE_SEC);
      const k = easeInOut(G.k);
      x = lerp(G.x, x, k); y = lerp(G.y, y, k);
      tS.scaleK = lerp(G.scale, 1, k);
      if (G.k >= 1) { tS.glide = null; tS.scaleK = 1; }
    } else tS.scaleK = 1;
    if (tS.rmFrom) {
      const mk = melt ? melt.k : 1;
      if (mk < 0.5) { x = tS.rmFrom.x; y = tS.rmFrom.y; tS.vis = 1 - easeInOut(mk / 0.5); tS.scaleK = tS.rmFrom.scale; }
      else { tS.vis = easeInOut((mk - 0.5) / 0.5); if (mk >= 1) tS.rmFrom = null; }
    } else tS.vis = 1;
    tS.sx = x; tS.sy = y;
    tS.alpha = Math.min(1, tS.alpha + dt / (tS.glide ? 0.05 : 0.6));
    // its tension: its own, eased only by what the person gave (and a hand held on it)
    relief = reliefFor(given - givenBase, hand - handBase);
    tension = tensionFor(t0 ?? 0.6, relief);
    warmK += (clamp(relief / ORCHARD.RELIEF_MAX) - warmK) * (1 - Math.exp(-dt / 1.2));
    glowPulse = Math.max(0, glowPulse - dt / 1.6);
    for (let k = 0; k < lit.length; k++) if (lit[k] > 0 && lit[k] < 1) lit[k] = Math.min(1, lit[k] + dt / 0.6);
    if (!thought || !entered || outroK > 0) return;
    // the handle: where it sits and how big (a layer-drawn thought is drawn at this world's radius)
    const rK = thought.r > 0 ? tS.r / thought.r : 1;
    thought.x = x; thought.y = y; thought.z = 0; thought.scale = rK * (tS.scaleK || 1); thought.rot = rm ? 0 : swing.a;
    thought.labelSide = 'below';
    const fit = tS.glide && tS.glide.k <= 0 ? heldFit : wordsFit;
    if (thought.labelFit !== fit && (fit || thought.labelFit === wordsFit || thought.labelFit === heldFit)) thought.labelFit = fit;
    if (!thought.draw) thought.opacity = tS.vis * tS.alpha;
    const st = thought.state || (thought.state = {});
    st.tension = tension; st.calm = clamp(1 - tension); st.charge = 0; st.distance = 0;
  }

  // ------------------------------------------------------- progress etc. --
  function updateProgress(dt) {
    const down = fingers.some((f) => f.on);
    const r = prog.update(dt, { given, playing: everTouched, down, kinder: kinderD.fired });
    progP = r.p;
    const ev = kinderD.update(dt, { given: given - givenBase, tension, t0: t0 ?? 0.6, hasThought: !!thought });
    if (ev) fireDiscovery(ev);
    const g = gentleD.update(dt);
    if (g) fireDiscovery(g);
    if (r.complete && !complete) finishOrchard();
  }
  function fireDiscovery(ev) {
    if (discovered.has(ev.id)) return;
    discovered.add(ev.id);
    try { mallow?.react?.('nod'); } catch { /* optional */ }
    ctx.sound('chime', { intensity: 0.26, pitch: 1.5 });
    if (plan?.thought) rings.add(tS.sx, tS.sy, tS.r, tS.r * 3.2, 2.4, 1, '#ffe7a0', 0.35, 2);
    ctx.discover(ev.id, ev.evidence);
  }
  function finishOrchard() {
    complete = true; completeAt = elapsed;
    try { mallow?.react?.('sigh'); } catch { /* optional */ }
    ctx.sound('shimmer', { intensity: 0.24 });
    realm?.pulse('clear', { x: W / 2, y: horizonY });
  }

  function audioAndMallow(dt, now) {
    if (!entered || outroK > 0) return;
    ambClock += dt;
    if (ambClock > 0.5) { ambClock = 0; ctx.ambienceMood(moodNow()); }
    if (mallow && now - emoAt > 0.7) {
      const busy = fingers.some((f) => f.on) ? 1 : 0;
      const g = ctx.gentle;
      const mix = { calm: 0.35 + 0.3 * warmK, curious: 0.12 + 0.2 * busy, happy: g ? 0 : 0.14 + 0.3 * warmK, comforted: 0.12 + 0.25 * warmK, relieved: 0.1 * warmK };
      emoAt = now;
      const key = Object.values(mix).map((v) => Math.round(v * 10)).join(',');
      if (key !== emoKey) { emoKey = key; try { mallow.setEmotion?.(mix, 0.6, { quiet: true }); } catch { /* optional */ } }
    }
    // Boppo watches the finger, else a light on its way, else the thought
    if (mallow?.lookAt && hero.ok && ((now * 10) | 0) % 3 === 0) {
      const f = fingers.find((q) => q.on), g = gifts.find((q) => q.on);
      const tx = f ? f.x : g ? g.x : plan?.thought ? tS.sx : null, ty = f ? f.y : g ? g.y : plan?.thought ? tS.sy : null;
      if (tx != null) { try { mallow.lookAt(clamp((tx - hero.cx) / (W * 0.5), -1, 1), clamp((ty - (hero.top + 0.4 * hero.h)) / (H * 0.5), -1, 1)); } catch { /* optional */ } }
    }
  }

  function say(lines) { if (lines && !paused) ctx.say(lines, { who: 'boppo', kind: 'dialogue' }); }
  /** The orchard's line for a moment: in a gentle session its gentle one where it has one (null: nothing said). */
  function line(k) {
    const d = ctx.entry?.dialogue || SUNPOP_ORCHARD.dialogue;
    return ctx.gentle && d.gentle && k in d.gentle ? d.gentle[k] : d[k];
  }

  // -------------------------------------------------------------- frame --
  function frame(dt, now) {
    frameNo++;
    if (!plan) return;
    const rm = reduced();
    const live = entered && !paused;
    if (live) elapsed += dt;
    if (live) relayoutCheck(dt);
    heroFromRect();
    if (melt) melt.t += dt;
    if (live) {
      warmFingers(dt);
      for (const q of fruits) if (q.from) { if (!melt || melt.k >= MELT_GLIDE_AT) q.fromK = Math.min(1, (q.fromK || 0) + dt / GLIDE_SEC); if (q.fromK >= 1) q.from = null; }
      stepFruits(dt, rm);
      stepGifts(dt);
    }
    updateThought(dt, now, rm);
    if (live) {
      updateProgress(dt);
      audioAndMallow(dt, now);
      // the first lines, and the hint (a gentle hold, shown on the bud nearest the swing)
      if (introAt >= 0 && elapsed >= introAt) { introAt = -1; say(arriving ? line('arrive') : line('intro')); }
      if (!everTouched || elapsed - lastTouch > 14) stepHint(dt);
    }
    if (!rm) { motes.update(dt, 0, 0.6); leaves.update(dt, 4, 0.8); for (let i = 0; i < leaves.n; i++) leaves.vx[i] += Math.sin(elapsed * 2 + i) * 18 * dt; }
    else { motes.update(dt * 2, 0, 1); leaves.n = 0; }
    rings.update(dt);
    // the realm: the person's warmth lifts its weather; golden hour at the end
    if (realm) {
      const p = complete ? 1 : 0.55 * clamp(given / ORCHARD.NEED) * (1 - outroK * 0.5);
      realm.setMood(moodNow(), { tau: 1.2 });
      realm.transform(p, { tau: complete ? 1.6 : 1.2 });
      const f0 = fingers.find((f) => f.on);
      if (f0) realm.setFocus(clamp((f0.x / W) * 2 - 1, -1, 1) * 0.35, clamp((f0.y / H) * 2 - 1, -1, 1) * 0.25); else realm.setFocus(0, 0);
      if (!!realm.st.reduced !== rm) realm.setReducedMotion(rm);
      if (realm.st.low !== low()) realm.setLowStimulation(low());
      const c0 = clock();
      realm.tick(dt * 1000);
      realm.draw();
      const c1 = clock();
      drawBack(realm.ctx, realm.st.dpr);
      const c2 = clock();
      timing.realm += (c1 - c0 - timing.realm) * 0.05; timing.trees += (c2 - c1 - timing.trees) * 0.05;
    }
    const c3 = clock();
    drawFront(ctx.front.g, now, rm);
    timing.front += (clock() - c3 - timing.front) * 0.05;
  }

  function stepHint(dt) {
    if (hint.shown >= HINT_MAX) return;
    if (hint.age < 0) {
      if (elapsed < hint.next) return;
      // on the bud nearest the swing's height
      let best = -1, bd = Infinity;
      for (let k = 0; k < fruits.length; k++) { const q = fruits[k]; if (q.state !== 'bud') continue; const d = Math.abs(q.sy - (plan.thought?.y ?? H * 0.4)) + Math.abs(q.sx - plan.cx) * 0.2; if (d < bd) { bd = d; best = k; } }
      if (best < 0) { hint.next = elapsed + 2; return; }
      hint.fruit = best; hint.age = 0; hint.shown++;
      return;
    }
    hint.age += dt;
    if (hint.age > HINT_SEC) { hint.age = -1; hint.next = elapsed + 7; }
  }

  // ------------------------------------------------------------- drawing --
  function drawBack(g, d) {
    if (!trees) return;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    for (const P of trees.pieces) g.drawImage(P.canvas, P.x, P.y, P.w, P.h);
    // golden hour: the leaves catch the light
    const gold = complete ? clamp((elapsed - completeAt) / 2.5) : 0.35 * warmK;
    if (gold > 0.01) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.16 * gold * (low() ? 0.6 : 1);
      g.drawImage(sprites.warm, plan.cx - W * 0.7, (plan.bandB || 120) - W * 0.5, W * 1.4, W * 0.8);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
  }

  function drawFront(g, now, rm) {
    const d = ctx.front.dpr || 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.setTransform(d, 0, 0, d, 0, 0);
    if (!plan) return;
    const lowK = low() ? 0.6 : 1;
    // leaves drifting down (behind the sunpops)
    if (leaves.n) leaves.draw(g, sprites.leaves, 0.95, 0.15);
    // stems, then sunpops
    for (let k = 0; k < fruits.length; k++) drawStem(g, fruits[k]);
    for (let k = 0; k < fruits.length; k++) drawFruit(g, fruits[k], k, now, rm, lowK);
    // the swing: ropes, seat
    if (plan.thought) drawSwing(g, now, rm, lowK);
    // warm motes (lighter)
    g.globalCompositeOperation = 'lighter';
    motes.draw(g, sprites.motes, 0.9 * lowK, 0.15);
    rings.draw(g, lowK);
    g.globalCompositeOperation = 'source-over';
    // lights on their way
    for (const q of gifts) if (q.on) drawGift(g, q, lowK);
    // a finger's cupped warmth, and the sunpop it holds
    for (const f of fingers) if (f.on) drawFinger(g, f, now, lowK);
    // the thought last: nothing ever covers its words
    if (hint.age >= 0) drawHint(g, now, rm);
    if (plan.thought && thought) drawThought(g, now, rm, lowK);
  }

  function drawStem(g, q) {
    if (q.alpha <= 0.01 || q.delay > 0) return;
    // (a picked sunpop's stem springs back short; a new bud's stem grows with it)
    const grow = q.state === 'grow' ? easeOut(q.grow) : q.state === 'gone' ? 0 : 1;
    const top = q.ay, bare = q.heldBy >= 0 || q.state === 'gone';
    const full = q.sy - q.D * 0.42 - top;
    const L = Math.max(6, bare ? ORCHARD.STEM * 0.7 : lerp(ORCHARD.STEM * 0.7, full, grow));
    const bx = bare ? q.ax : lerp(q.ax, q.sx, grow), by = top + L;
    g.globalAlpha = q.alpha;
    g.strokeStyle = '#7a4a1a'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(q.ax, top); g.quadraticCurveTo(q.ax + (bx - q.ax) * 0.2, top + L * 0.55, bx, by); g.stroke();
    // a leaf near the top of the stem
    const lw = 14 + q.D * 0.12, lh = lw / 2;
    g.save(); g.translate(q.ax + (bx - q.ax) * 0.25, top + L * 0.3); g.rotate(q.side < 0 ? -0.5 + q.wob * 0.6 : Math.PI + 0.5 + q.wob * 0.6);
    g.drawImage(sprites.leaf, 0, -lh / 2, lw, lh); g.restore();
    g.globalAlpha = 1;
  }

  function drawFruit(g, q, k, now, rm, lowK) {
    if (q.state === 'gone' || q.alpha <= 0.01 || q.heldBy >= 0) return;
    if (q.delay > 0) return;
    const grow = q.state === 'grow' ? easeOut(q.grow) : 1;
    const x = q.sx, y = q.sy;
    let D = q.D * (0.25 + 0.75 * grow);
    if (q.from && q.fromK < 1) D = lerp(q.from.D, D, easeInOut(q.fromK));
    const sq = rm ? 0 : clamp(Math.abs(q.wobV) * 0.012, 0, 0.08);
    const breathe = rm ? 0 : Math.sin(now * 1.3 + k) * 0.012 * (1 - q.ripe);
    drawSunpop(g, x, y, D * (1 + sq + breathe), D * (1 - sq * 0.8 - breathe), q.ripe, q.warm, q.alpha, q.photo, lowK, k, now, rm, q.state === 'kept');
    // the ring of light filling round it while it is warmed (from the top, clockwise): a faint track, the warmth
    // so far as a soft glowing arc, and a bright bead at its head
    if (q.warm > 0.04 && q.state === 'bud') drawRing(g, x, y, D * 0.72, q.ripe, q.warm * lowK);
  }

  function drawRing(g, x, y, r, fill, a) {
    if (a <= 0.01) return;
    const a0 = -Math.PI / 2, a1 = a0 + TAU * clamp(fill);
    g.lineCap = 'round';
    g.globalAlpha = 0.28 * a; g.strokeStyle = '#fff8e0'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    if (fill > 0.005) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.32 * a; g.strokeStyle = '#ffc94a'; g.lineWidth = 9;
      g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke();
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 0.95 * a; g.strokeStyle = '#ffe9a0'; g.lineWidth = 3.4;
      g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke();
      const s = 7;
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9 * a;
      g.drawImage(sprites.mote, x + Math.cos(a1) * r - s, y + Math.sin(a1) * r - s, s * 2, s * 2);
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
  }

  /** One sunpop (or a photo sunpop) at (x, y), w × h px. */
  function drawSunpop(g, x, y, w, h, ripe, warm, alpha, photo, lowK, k = 0, now = 0, rm = false, kept = false) {
    // warm glow behind
    // (a soft halo with no white core, behind the body: warmth, never glare)
    const glowA = (0.2 * ripe + 0.26 * warm) * lowK * alpha;
    if (glowA > 0.01) {
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = glowA;
      const gr = w * (0.9 + 0.2 * warm);
      g.drawImage(sprites.halo, x - gr, y - gr, gr * 2, gr * 2);
      g.globalCompositeOperation = 'source-over';
    }
    const S = sprites.bud.width, sx = w / (S * 0.8), sy = h / (S * 0.8);
    const dw = S * sx, dh = S * sy;
    const showPhoto = showsPhoto(photo);
    if (showPhoto) {
      // the photo in a round window, misty until warmed into its own colours
      g.globalAlpha = alpha;
      try { photos.draw(g, photo, x, y, Math.min(w, h) * 0.76, { shape: 'circle', shadow: false, sheen: false, tone: 'mist', toneMix: 1 - ripe, alpha }); } catch { /* optional */ }
      g.globalAlpha = alpha * (1 - ripe);
      g.drawImage(sprites.rimBud, x - dw / 2, y - dh / 2, dw, dh);
      g.globalAlpha = alpha * ripe;
      g.drawImage(sprites.rimRipe, x - dw / 2, y - dh / 2, dw, dh);
      g.globalAlpha = 1;
      if (kept && !rm) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 * lowK * alpha * (0.6 + 0.4 * Math.sin(now * 1.4 + k)); g.drawImage(sprites.glint, x + w * 0.22 - 6, y - h * 0.3 - 6, 12, 12); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
      return;
    }
    g.globalAlpha = alpha;
    g.drawImage(sprites.bud, x - dw / 2, y - dh / 2, dw, dh);
    const rk = Math.pow(ripe, 0.85);
    if (rk > 0.004) { g.globalAlpha = alpha * rk; g.drawImage(sprites.ripe, x - dw / 2, y - dh / 2, dw, dh); }
    g.globalAlpha = 1;
    // a ripe sunpop's content little face (never in a gentle session)
    if (ripe > 0.6 && !ctx.gentle && w > 20) {
      const fa = alpha * smoothstep(0.6, 0.95, ripe), r = Math.min(w, h) * 0.4;
      g.globalAlpha = fa;
      g.strokeStyle = '#7a3a12'; g.lineWidth = Math.max(1.2, r * 0.07); g.lineCap = 'round';
      for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.arc(x + s * r * 0.3, y + r * 0.02, r * 0.11, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      g.fillStyle = 'rgba(255,120,120,0.35)';
      for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.ellipse(x + s * r * 0.5, y + r * 0.22, r * 0.13, r * 0.08, 0, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
  }

  function drawSwing(g, now, rm, lowK) {
    const T = plan.thought, ropes = plan.ropes;
    if (!ropes) return;
    const ca = Math.cos(swing.a), sa = Math.sin(swing.a), k = ropes.y0;
    const at = (x, y, out) => { const dx = x - T.x, dy = y - k; out.x = T.x + dx * ca - dy * sa; out.y = k + dx * sa + dy * ca; return out; };
    const a = at(ropes.xl, ropes.y1, pA), b = at(ropes.xr, ropes.y1, pB);
    for (let side = 0; side < 2; side++) {
      const rx = side ? ropes.xr : ropes.xl, p = side ? b : a;
      g.strokeStyle = ART.ropeDark; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(rx, k); g.lineTo(p.x, p.y); g.stroke();
      g.strokeStyle = ART.rope; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(rx - 0.5, k); g.lineTo(p.x - 0.5, p.y); g.stroke();
      // the knot on the bough
      g.fillStyle = ART.ropeDark; g.beginPath(); g.arc(rx, k + 1, 2.6, 0, TAU); g.fill();
    }
    // the seat
    const P = sprites.plank;
    if (P) {
      g.save(); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2); g.rotate(swing.a);
      g.drawImage(P, -P.cssW / 2, -3, P.cssW, P.cssH); g.restore();
    }
    // the crown of lights round its head
    for (let s = 0; s < plan.crown.length; s++) {
      if (!(lit[s] > 0)) continue;
      crownPoint(s, cp);
      const e = easeOut(lit[s]), tw = rm ? 1 : 0.85 + 0.15 * Math.sin(now * 1.7 + s * 2.1);
      const Ls = ORCHARD.LANTERN * (0.6 + 0.4 * e);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = (0.45 + 0.35 * glowPulse) * e * tw * lowK;
      g.drawImage(sprites.glow, cp.x - Ls * 1.5, cp.y - Ls * 1.5, Ls * 3, Ls * 3);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = e;
      const S = sprites.ripe.width, sc = Ls / (S * 0.8);
      g.drawImage(sprites.ripe, cp.x - (S * sc) / 2, cp.y - (S * sc) / 2, S * sc, S * sc);
      g.globalAlpha = 1;
    }
  }
  const pA = { x: 0, y: 0 }, pB = { x: 0, y: 0 };

  function drawGift(g, q, lowK) {
    const e = easeInOut(q.t);
    if (q.fade) {
      // reduced motion: it fades where it ripened as its light comes on in the crown
      const a = 1 - clamp(q.t * 1.4);
      if (a > 0.01) drawSunpop(g, q.x0, q.y0, q.D, q.D, 1, 0.5, a, -1, lowK);
      if (q.slot >= 0) lit[q.slot] = Math.max(lit[q.slot], 0.001);
      return;
    }
    const D = lerp(q.D, ORCHARD.LANTERN, e);
    drawSunpop(g, q.x, q.y, D, D, 1, 0.6, 1, -1, lowK);
  }

  function drawFinger(g, f, now, lowK) {
    if (f.cup) {
      const q = f.cup, x = q.cx ?? q.sx, y = q.cy ?? q.sy;
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * lowK;
      g.drawImage(sprites.warm, x - q.D, y - q.D, q.D * 2, q.D * 2);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      drawSunpop(g, x, y, q.D, q.D, 1, 0.8, 1, -1, lowK);
      return;
    }
    // cupped warmth under a resting finger (it shows the warming before the colour turns)
    const a = f.heat > 0 ? 0.3 + 0.25 * f.heat : 0.12;
    const r = 26 + 10 * f.heat;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * lowK;
    g.drawImage(sprites.pad, f.x - r, f.y - r, r * 2, r * 2);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }

  function drawThought(g, now, rm, lowK) {
    const A = tS.alpha * tS.vis;
    if (A <= 0.01) return;
    const x = tS.sx, y = tS.sy, r = tS.r * (tS.scaleK || 1);
    // the warmth it has been given, glowing behind it
    const wa = (0.1 + 0.42 * warmK + 0.25 * glowPulse) * lowK * A;
    if (wa > 0.01) {
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = wa;
      const gr = r * (2.3 + 0.5 * warmK);
      g.drawImage(sprites.warm, x - gr, y - gr, gr * 2, gr * 2);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    if (!thought.draw) return;
    try {
      const XR = layoutFreeW || W;
      thought.draw(g, x, y, tS.scaleK || 1, {
        radius: tS.r, tension, calm: clamp(1 - tension), charge: 0, reduced: rm, now, minX: ORCHARD.EDGE, maxX: XR - ORCHARD.EDGE,
        labelWidth: textMax, labelLines: plateLines, labelY: r + ORCHARD.PLATE_GAP, labelX: 0, alpha: A, labelAlpha: 1,
      });
    } catch { /* placeholder only */ }
  }

  function drawHint(g, now, rm) {
    const q = fruits[hint.fruit];
    if (!q || q.state !== 'bud') { hint.age = -1; return; }
    const t = hint.age, a = smoothstep(0, 0.5, t) * (1 - smoothstep(HINT_SEC - 0.6, HINT_SEC, t));
    if (a <= 0.01) return;
    // a ghost fingertip comes to rest on the sunpop and holds; a ring of light fills round it
    const press = rm ? 1 : smoothstep(0.3, 0.9, t);
    const x = q.sx + (rm ? 0 : (1 - press) * 10), y = q.sy + q.D * 0.12 + (rm ? 0 : (1 - press) * 16);
    const r = 17 - 3 * press;
    g.globalAlpha = 0.42 * a;
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.globalAlpha = 0.7 * a; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    const fill = rm ? 0.6 : smoothstep(0.9, HINT_SEC - 0.7, t);
    drawRing(g, q.sx, q.sy, q.D * 0.72, fill, 0.8 * a);
  }

  // ---------------------------------------------------------- hand-over --
  function captureT0(v) {
    // (restored: t0 is known already — still remember it for this handle)
    if (t0 != null) { if (thought && !seenT0.has(thought)) seenT0.set(thought, { t0, givenBase, handBase }); return; }
    const s = Number.isFinite(v) ? v : Number.isFinite(thought?.state?.tension) ? thought.state.tension : 0.6;
    t0 = clamp(s, 0.25, 0.9);
    tension = t0;
    if (thought) seenT0.set(thought, { t0, givenBase, handBase });
  }

  // ---------------------------------------------------------------- api --
  const api = {
    prepare,
    get backCanvas() { return realm?.canvas || null; },
    enter({ from, handoff } = {}) {
      entered = true;
      const rm = reduced();
      if (!prepared || !(handoff && from)) layout(true);
      heldFit = null;
      if (handoff && from) {
        melt = { k: 0, t: 0 };
        heldFit = thought?.labelFit && thought.labelFit.lines > 0 ? thought.labelFit : null;
        const th = handoff.thought, ok = th && Number.isFinite(th.x) && Number.isFinite(th.y);
        if (thought) {
          captureT0(th?.tension);
          const sc = ((th?.r || tS.r) * (th?.scale ?? 1)) / tS.r;
          if (ok && !rm) { tS.glide = { x: th.x, y: th.y, scale: clamp(sc, 0.3, 2), k: 0 }; tS.alpha = 1; }
          else if (ok && rm) { tS.rmFrom = { x: th.x, y: th.y, scale: clamp(sc, 0.3, 2) }; tS.alpha = 1; }
          else tS.alpha = 0;
        }
        // photos glide from where they hung into their sunpops; everything else grows in on its stem as the melt spreads
        const ps = Array.isArray(handoff.photos) ? handoff.photos : [];
        fruits.forEach((q, k) => {
          q.state = 'grow'; q.grow = 0; q.delay = rm ? 0 : 0.6 + 0.25 * k;
          const p = q.photo >= 0 ? ps.find((o) => o && o.i === q.photo && Number.isFinite(o.x) && Number.isFinite(o.y)) : null;
          if (p && !rm) { q.from = { x: p.x, y: p.y, D: clamp(Math.max(p.w || 0, p.h || 0) || q.D, 24, 140) }; q.fromK = 0; q.delay = 0; q.grow = 1; q.state = 'bud'; }
        });
        // (Boppo speaks once the melt is over and it is on stage: intro(1) sets the time)
        introAt = -1;
      } else {
        if (thought) {
          captureT0(restored?.t0);
          // the person's thought already on screen (beside their Mallow): it arrives from there
          const ok = Number.isFinite(thought.x) && Number.isFinite(thought.y) && (thought.x !== 0 || thought.y !== 0);
          if (ok && !rm && !restored) { tS.glide = { x: thought.x, y: thought.y, scale: 1, k: 0 }; tS.alpha = 1; } else tS.alpha = 0;
        }
        if (!restored) fruits.forEach((q, k) => { q.state = 'grow'; q.grow = rm ? 1 : 0; q.delay = rm ? 0 : 0.15 * k; });
        introAt = restored ? -1 : 1.6;
      }
      if (restored) {
        for (let s = 0; s < Math.min(litN, plan.crown.length); s++) lit[s] = 1;
        relief = reliefFor(given - givenBase, hand - handBase); tension = tensionFor(t0 ?? 0.6, relief); warmK = clamp(relief / ORCHARD.RELIEF_MAX);
      }
      hint.next = (melt ? 6 : HINT_AT);
      if (!(handoff && from)) { try { thought?.react?.(thought?.ov?.appear >= 1 ? 'notice' : 'appear'); } catch { /* optional */ } }
    },
    frame,
    pointer,
    get metrics() {
      return {
        given, relief: Math.round(relief * 100) / 100, tension: thought ? Math.round(tension * 1000) / 1000 : null, t0, warm: warmK,
        ripe: fruits.map((q) => Math.round(q.ripe * 100) / 100), states: fruits.map((q) => q.state), fruits: fruits.length, crown: litN,
        played: prog.played, progress: api.progress, pokes: pokesSeen, waiting: waiting.length,
      };
    },
    get progress() { return complete ? 1 : progP; },
    get complete() { return complete; },
    intro(k) { if (melt) { melt.k = k; if (k >= 1) { melt = null; if (!restored && !everTouched) { arriving = true; introAt = elapsed + 0.6; } } } },
    outro(k) {
      outroK = k;
      if (k > 0) { if (hum) { hum.stop?.(); hum = null; } try { if (thought && (thought.labelFit === wordsFit || thought.labelFit === heldFit)) thought.labelFit = null; } catch { /* */ } }
    },
    handoff() {
      return {
        horizonY, palette: { sky: '#ff9f72', deep: '#e85d78', warm: '#ffd23a' }, seeds: [],
        thought: thought && plan?.thought ? { x: tS.sx, y: tS.sy, scale: tS.scaleK || 1, r: tS.r, tension, labelW: textMax + 2 * ORCHARD.LABEL_PAD_X } : null,
        photos: fruits.filter((q) => q.photo >= 0 && q.state !== 'gone' && q.alpha > 0.5).map((q) => ({ i: q.photo, x: q.sx, y: q.sy, w: q.D * 0.76, h: q.D * 0.76, rot: 0, state: q.state === 'kept' ? 'warm' : 'bud', shape: 'circle' })),
        energy: 0,
      };
    },
    pause() {
      paused = true;
      if (hum) { hum.stop?.(); hum = null; }
      for (const f of fingers) { if (f.cup) unCup(f); f.on = false; f.id = -1; f.onThought = false; }
    },
    resume() { paused = false; },
    /** The person named another feeling: the orchard's weather follows it (never progress). */
    setEmotion(id, i) {
      const k = Number.isFinite(i) ? clamp(i) : clamp(ctx.intensity ?? 0.6);
      const h = clamp((HEAVY[id] ?? 0.2) * (0.6 + 0.6 * k), 0, 0.45);
      const d = (ctx.entry?.dialogue || SUNPOP_ORCHARD.dialogue).feeling || {};
      const lines = h > heavy + 0.04 ? d.more : h < heavy - 0.04 ? d.less : d.other;
      heavy = h;
      try { mallow?.react?.('nod'); } catch { /* optional */ }
      if (lines && !paused) { introAt = -1; say(lines); }
    },
    setGentle() { /* read live from ctx.gentle: lines, faces and Boppo's grin follow it */ },
    setThought(h) {
      const had = !!thought, prev = thought;
      if (thought && thought !== h) { try { if (thought.labelFit === wordsFit || thought.labelFit === heldFit) thought.labelFit = null; } catch { /* */ } heldFit = null; }
      thought = h || null;
      if (prepared) layout(false);
      // (the one leaving keeps what it was given; what goes to the swing while it is away is not counted for it)
      if (prev && prev !== h && t0 != null) seenT0.set(prev, { t0, givenBase, handBase, leftAt: given, handAt: hand });
      if (h && h !== prev) {
        const known = seenT0.get(h);
        if (known) { t0 = known.t0; givenBase = known.givenBase + (given - (known.leftAt ?? given)); handBase = known.handBase + (hand - (known.handAt ?? hand)); }
        else { givenBase = given; handBase = hand; t0 = null; captureT0(); }
        relief = reliefFor(given - givenBase, hand - handBase); tension = tensionFor(t0 ?? 0.6, relief);
        if (!had) { tS.alpha = 0; tS.glide = null; }
      }
    },
    /** Client rects to keep subtitles off: the thought with its words, the sunpops, fingers outside the band. */
    avoid() {
      const out = [];
      if (!plan) return out;
      const band = ctx.band;
      if (thought && plan.thought && tS.alpha > 0.1) {
        const r = tS.r;
        out.push({ x: tS.sx - r - 4, y: tS.sy - r - 4, w: 2 * r + 8, h: 2 * r + 8, kind: 'thought' });
        if (plan.plate) { const P = plan.plate, dy = tS.sy - plan.thought.y, dx = tS.sx - plan.thought.x; out.push({ x: P.x0 + dx, y: P.y0 + dy, w: P.x1 - P.x0, h: P.y1 - P.y0, kind: 'thought' }); }
      }
      for (const q of fruits) if (q.state !== 'gone' && q.alpha > 0.1) out.push({ x: q.sx - q.D / 2 - 4, y: q.sy - q.D / 2 - 4, w: q.D + 8, h: q.D + 8, kind: 'sunpop' });
      for (const f of fingers) if (f.on && !(band && f.y < band.y + band.h)) out.push({ x: f.x - 60, y: f.y - 60, w: 120, h: 120, kind: 'finger' });
      return out;
    },
    subtitleBand() { const b = ctx.band; return b ? { x: b.x, y: b.y, w: b.w, h: b.h } : null; },
    serialize() {
      return {
        v: 1, given, hand: Math.round(hand * 10) / 10, t0: t0 == null ? null : Math.round(t0 * 100) / 100, complete, discoveries: [...discovered], prog: prog.snapshot(),
        ripe: fruits.map((q) => (q.state === 'kept' ? 2 : Math.round(q.ripe * 100) / 100)), crown: litN, elapsed: Math.round(elapsed),
      };
    },
    restore(s) {
      if (!s || s.v !== 1) return false;
      if (!plan) layout(true);
      for (const id of s.discoveries || []) { discovered.add(id); if (id === 'gentle-hands') gentleD.markFired(); if (id === 'kinder' || id === 'kinder-light') kinderD.markFired(); }
      prog.restore(s.prog); progP = clamp(+s.prog?.p || 0, 0, 0.99);
      given = Math.max(0, Math.round(+s.given || 0)); hand = clamp(+s.hand || 0, 0, 30);
      if (Number.isFinite(+s.t0) && s.t0 != null) t0 = clamp(+s.t0, 0.25, 0.9);
      litN = clamp(Math.round(+s.crown || 0), 0, plan.crown.length); nextSlot = litN;
      (Array.isArray(s.ripe) ? s.ripe : []).forEach((v, k) => { const q = fruits[k]; if (!q) return; if (v === 2 && q.photo >= 0) { q.state = 'kept'; q.ripe = 1; q.grow = 1; } else { q.ripe = clamp(+v || 0, 0, 0.95); q.state = 'bud'; q.grow = 1; } });
      if (s.complete) { complete = true; completeAt = 0; realm?.transform(1).settle(); }
      restored = { t0 };
      return true;
    },
    resize(w, h, { dprBack } = {}) {
      if (plan && Math.round(w) === Math.round(W) && Math.round(h) === Math.round(H)) {
        // (the quality governor changed only the layers' resolution)
        if (realm && Number.isFinite(dprBack)) { realm.resize(W, H, dprBack); realm.build(); paintBackTrees(); }
        buildSprites();
        return;
      }
      W = w; H = h; U = Math.min(W, H);
      if (realm) { realm.resize(W, H, dprBack ?? ctx.dprBack); realm.build(); horizonY = realm.horizonY; }
      if (plan) layout(true);
    },
    setQuality() { /* the director resizes the layers */ },
    destroy() {
      if (hum) { hum.stop?.(); hum = null; }
      try { if (thought && (thought.labelFit === wordsFit || thought.labelFit === heldFit)) thought.labelFit = null; } catch { /* a handle without it */ }
      realm?.destroy?.(); realm = null; trees = null;
    },
    /** QA hooks (dev lab, node tests). Not product API. */
    debug: {
      get plan() { return plan; },
      get fruits() { return fruits.map((q) => ({ x: q.sx, y: q.sy, D: q.D, ripe: q.ripe, state: q.state, photo: q.photo, held: q.heldBy, alpha: q.alpha, warm: q.warm })); },
      get thought() { return { x: tS.sx, y: tS.sy, r: tS.r, alpha: tS.alpha, vis: tS.vis, glide: tS.glide ? { ...tS.glide } : null, tension, t0, relief }; },
      get gifts() { return gifts.filter((q) => q.on).map((q) => ({ x: q.x, y: q.y, t: q.t, slot: q.slot })); },
      get fingers() { return fingers.map((f) => ({ on: f.on, heat: f.heat, target: f.target, near: f.near, cup: !!f.cup, held: f.held })); },
      get crown() { return { lit: [...lit], n: litN }; },
      get layouts() { return layoutLog; },
      get hint() { return { ...hint }; },
      get melt() { return melt ? { ...melt } : null; },
      get trees() { return trees ? trees.pieces.map((P) => ({ x: P.x, y: P.y, w: Math.round(P.w), h: Math.round(P.h) })) : null; },
      get swing() { return { ...swing }; },
      get timing() { return { ...timing }; },
    },
  };
  return api;
}
