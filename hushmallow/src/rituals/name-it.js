// NAME IT — Loomi, The Chill One. The universal ritual: any feeling, any family.
//
// 1. A closer word   — your feeling(s) plus nearby words from the taxonomy
//                      (same family and its `also` cousins). Pick the one that
//                      fits, keep your own, or mix up to three. Loomi's face
//                      blends into whatever you choose.
// 2. Where is it?    — drag a glow onto a body outline; it snaps to head,
//                      throat, shoulders, chest, stomach, hands, legs (or
//                      everywhere / nowhere). A slider sets how big it is.
// 3. Give it a shape — colour + texture (spiky, heavy, fizzy, tight, hollow,
//                      warm) render as a living blob you squeeze and stretch.
// 4. What it needs   — authored needs keyed by family; drag a little light of
//                      that need into the shape, then pick a small way to give it.
// Finale             — the shape settles into a small glowing stone with its name.
//
// Rationale (plain): naming feelings precisely, noticing them in the body and
// asking what they need are common, widely taught approaches. No promise it
// makes anything vanish — the aim is that it's a bit easier to hold.
//
// Rule-based only: every line here is authored; nothing is generated.

import { h, wait } from '../app/ui.js';
import { EMOTIONS, FAMILIES, getEmotion, getFamily, emotionsByFamily, searchEmotions, faceSimilarity } from '../data/emotions.js';

export const meta = { id: 'name-it' };

const NS = 'http://www.w3.org/2000/svg';
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------ authored --
const OPENERS = {
  joy: 'Ooh, a nice one. Let’s get its name exactly right.',
  love: 'A soft one. Let’s find its proper name.',
  calm: 'Calm-ish? My kind of weather. Let’s name it properly.',
  curiosity: 'Curious. Good. Let’s get curious about the curious.',
  surprise: 'Bit of a jolt, huh. Let’s pin down which kind.',
  fear: 'That sounds jumpy. We’ll go slow. Names first.',
  anger: 'Some heat in there. Fine by me. Let’s name it.',
  sadness: 'That sounds heavy. No hurry. Let’s just name it.',
  disgust: 'Bleh-adjacent. Fair. Let’s find the exact flavour.',
  shame: 'An ouchy one. Gently. Just a name, nothing else.',
  pride: 'Standing a bit taller? Let’s name that properly.',
  envy: 'A green one. Very normal. Let’s name it, no judging.',
  loneliness: 'That sounds lonely. I’m here. Let’s name it.',
  confusion: 'A tangle. Fine. Tangles have names too.',
  desire: 'A pull towards something. Let’s name the pull.',
  boredom: 'Flat, huh. Even flat has a name. Let’s find it.',
};
const OPEN_MIXED = 'A mix. Very normal. Feelings rarely arrive alone.';
const OPEN_NONE = 'Hi. No rush. Let’s find a word for what’s here.';
const SOFT_FAMILIES = new Set(['sadness', 'loneliness', 'shame', 'fear']);
const QUIPS = [
  (n) => `Huh. ‘${n}’. Fancy. Fits, though.`,
  (n) => `‘${n}’. Mm. That’s a precise one.`,
  (n) => `Ooh, ‘${n}’. Very specific. I respect it.`,
  (n) => `‘${n}’. Yep. I can see it on you.`,
];
const SOFT_QUIPS = [
  (n) => `‘${n}’. Mm. That’s a real one.`,
  (n) => `‘${n}’. Okay. I’ve got it.`,
  (n) => `‘${n}’. Yeah. That has weight.`,
];

const REGIONS = [
  { id: 'head', label: 'Head', pts: [[100, 42]], line: 'Up top. Busy up there, I bet.' },
  { id: 'throat', label: 'Throat', pts: [[100, 84]], line: 'The throat. Where words queue up.' },
  { id: 'shoulders', label: 'Shoulders', pts: [[64, 110], [136, 110]], line: 'Shoulders. Classic storage unit.' },
  { id: 'chest', label: 'Chest', pts: [[100, 138]], line: 'The chest. Lots of feelings rent a room there.' },
  { id: 'stomach', label: 'Stomach', pts: [[100, 194]], line: 'The stomach. Honest little organ.' },
  { id: 'hands', label: 'Hands', pts: [[37, 268], [163, 268]], line: 'Hands. Fidgety ones, maybe.' },
  { id: 'legs', label: 'Legs', pts: [[80, 296], [120, 296]], line: 'Legs. Wants to move, or wants to stay put?' },
  { id: 'everywhere', label: 'Everywhere', pts: [], line: 'Everywhere. The full suit. Okay.' },
  { id: 'nowhere', label: 'Nowhere in particular', pts: [], line: 'Nowhere in particular. That counts too. Some feelings float.' },
];
const SIZES = [[0, 'a pebble'], [0.17, 'a plum'], [0.34, 'a fist'], [0.52, 'a melon'], [0.7, 'a beanbag'], [0.88, 'the whole room']];
const sizeWord = (v) => SIZES.reduce((acc, [t, w]) => (v >= t ? w : acc), SIZES[0][1]);

const COLOURS = [
  ['ember', 'Ember', '#ff6b5b'], ['amber', 'Amber', '#f2a541'], ['sunshine', 'Sunshine', '#ffc94d'], ['moss', 'Moss', '#9dbf6a'],
  ['sea-glass', 'Sea-glass', '#8fd3c7'], ['sky', 'Sky', '#7fb8ff'], ['deep-blue', 'Deep blue', '#6f8fd6'], ['lilac', 'Lilac', '#b79cff'],
  ['blush', 'Blush', '#ff8fb1'], ['fog', 'Fog', '#b5b1c8'],
];
const FAMILY_COLOUR = {
  joy: 'sunshine', love: 'blush', calm: 'sea-glass', curiosity: 'sky', surprise: 'lilac', fear: 'fog', anger: 'ember', sadness: 'deep-blue',
  disgust: 'moss', shame: 'blush', pride: 'amber', envy: 'moss', loneliness: 'fog', confusion: 'lilac', desire: 'blush', boredom: 'fog',
};
const TEXTURES = [
  ['spiky', 'Spiky', 'Spiky. Mind your fingers. Mine too.'],
  ['heavy', 'Heavy', 'Heavy. It’s allowed to sit down.'],
  ['fizzy', 'Fizzy', 'Fizzy. Lots of little somethings.'],
  ['tight', 'Tight', 'Tight. Like a held breath with opinions.'],
  ['hollow', 'Hollow', 'Hollow. An empty bit is still a shape.'],
  ['warm', 'Warm', 'Warm. Huh. Nice to hold, that one.'],
];
const FAMILY_TEXTURE = {
  joy: 'warm', love: 'warm', calm: 'warm', curiosity: 'fizzy', surprise: 'fizzy', fear: 'tight', anger: 'spiky', sadness: 'heavy',
  disgust: 'spiky', shame: 'heavy', pride: 'warm', envy: 'tight', loneliness: 'hollow', confusion: 'fizzy', desire: 'fizzy', boredom: 'hollow',
};

const NEEDS = {
  safety: ['Safety', 'Safety. Of course. Bodies like to know where the exits are.',
    ['Put your back against something solid', 'Name three things nearby that are fine right now', 'Remember the support button is always there']],
  reassurance: ['Reassurance', 'Reassurance. A little “you’re okay” goes a long way.',
    ['Remind yourself of something you’ve already got through', 'Rest a hand on your chest for a few breaths', 'Look at something familiar and boring, on purpose']],
  comfort: ['Comfort', 'Comfort. Yeah. No fixing, just softness.',
    ['Something warm: a drink, a blanket, a jumper', 'Let it be sad without a deadline', 'A soft song, quietly']],
  time: ['Time', 'Time. Nothing to solve yet. Just room.',
    ['Give it ten minutes before deciding anything', 'Put it on tomorrow’s list, not tonight’s', 'Let it stay unfinished for now']],
  connection: ['Connection', 'Connection. Feelings like company too.',
    ['Be near someone, even without talking', 'Look at a photo of someone who gets you', 'Pick someone you’d like to see soon']],
  space: ['Space', 'Space. Room to breathe. Very reasonable.',
    ['Step into another room for a bit', 'Put your phone face down for ten minutes', 'Say “not right now” to one thing']],
  fairness: ['Fairness', 'Fairness. Not too much to want.',
    ['Write down, just for you, what felt unfair', 'Picture what a fair outcome would look like', 'Save any big conversation for a cooler moment']],
  expression: ['To let it out', 'Out it comes. Better out here than stuck in there.',
    ['Say it out loud to an empty room', 'Scribble it on paper, then bin it', 'Hum, stomp, or shake your hands out']],
  distance: ['Distance', 'Distance. Sensible. Some things are best at arm’s length.',
    ['Move physically away from the thing', 'Wash your hands or face. A tiny reset.', 'Open a window for some fresh air']],
  boundary: ['A boundary', 'A boundary. A line in the sand. Tidy.',
    ['Decide one thing you won’t do again', 'Practise a short “no, thanks” in your head', 'Mute, unfollow or tidy away the thing']],
  savouring: ['Savouring', 'Savouring. Yes. Let’s not rush past the good bit.',
    ['Stay with it ten seconds longer than usual', 'Notice where it’s warmest and enjoy that bit', 'Write one line about it to keep']],
  sharing: ['Sharing it', 'Sharing it. Good things like an audience.',
    ['Tell someone in person next time you see them', 'Keep a note to share later', 'Let your face show it. Faces like that.']],
  play: ['Play', 'Play. Underrated. Highly recommended by me.',
    ['Do something pointless and fun for five minutes', 'Put on a song you can’t sit still to', 'Doodle badly, on purpose']],
  exploring: ['Exploring', 'Exploring. Follow the thread, see where it goes.',
    ['Look one thing up. Just one.', 'Ask yourself the next question', 'Follow it for ten minutes, then check in']],
  grounding: ['Grounding', 'Grounding. Feet on the floor. Floor on the earth. Solid.',
    ['Feel your feet on the floor', 'Hold something cold or textured', 'Name five colours you can see']],
  kindness: ['Kindness', 'Kindness. The inside kind. Harder than it sounds.',
    ['Say to yourself what you’d say to a friend', 'Do one small nice thing for your body', 'Let “good enough” be enough today']],
  clarity: ['Clarity', 'Clarity. Knowing what it actually wants. Handy.',
    ['Write down what you actually want', 'Pick the smallest next question', 'Sort it into “know” and “don’t know yet”']],
  rest: ['Rest', 'Rest. Drifting is a valid plan.',
    ['Lie down for five minutes, no phone', 'Close your eyes and let your jaw go loose', 'Plan an early night']],
  movement: ['Movement', 'Movement. A little wiggle. Even I do that sometimes.',
    ['A short walk, any direction', 'Stretch like you just woke up', 'Shake out your arms and shoulders']],
  recognition: ['Recognition', 'Recognition. Fair enough. You did a thing.',
    ['Write down what you did, plainly', 'Let yourself say “I did that”', 'Keep a note of it for a rough day']],
  nourishment: ['Something that feeds it', 'Something that feeds it. What is it actually hungry for?',
    ['Ask what it’s really hungry for', 'Give it a small, real version now', 'Wait ten minutes and see if it’s still there']],
  seen: ['To be seen', 'To be seen. Mm. I see it. That’s a start.',
    ['Write it down as if someone kind will read it', 'Be around people, even just a café', 'Remember one person who got you before']],
  unsure: ['Not sure yet', 'Not sure. Honest answer. It can just sit with us a while.',
    ['Let it be here for now', 'Check on it again later today', 'Come back whenever you like']],
};
const FAMILY_NEEDS = {
  joy: ['savouring', 'sharing', 'play'], love: ['connection', 'expression', 'savouring'], calm: ['savouring', 'rest', 'time'],
  curiosity: ['exploring', 'time', 'sharing'], surprise: ['time', 'grounding', 'sharing'], fear: ['safety', 'reassurance', 'grounding'],
  anger: ['fairness', 'space', 'expression'], sadness: ['comfort', 'time', 'connection'], disgust: ['distance', 'boundary', 'space'],
  shame: ['kindness', 'reassurance', 'seen'], pride: ['recognition', 'savouring', 'sharing'], envy: ['clarity', 'kindness', 'recognition'],
  loneliness: ['connection', 'seen', 'comfort'], confusion: ['clarity', 'time', 'grounding'], desire: ['nourishment', 'time', 'clarity'],
  boredom: ['movement', 'play', 'rest'],
};

// ------------------------------------------------------------ helpers --
function faceMix(sel, weight, extra = {}) {
  const mix = { ...extra };
  if (!sel.length) return Object.keys(mix).length ? mix : { calm: 1 };
  for (const e of sel) for (const [k, w] of Object.entries(e.face)) mix[k] = (mix[k] || 0) + (w * weight) / sel.length;
  return mix;
}

/** Nearby words for the chosen feelings: same family + `also` cousins, ranked by closeness, spread across intensity. */
function nearby(sel, n = 9) {
  const chosen = new Set(sel.map((e) => e.id));
  const pools = sel.map((e) => {
    const fams = new Set([e.family, ...e.also]);
    const ranked = EMOTIONS.filter((x) => !chosen.has(x.id) && (fams.has(x.family) || x.also.includes(e.family)))
      .map((x) => ({ x, s: Math.abs(x.valence - e.valence) + Math.abs(x.arousal - e.arousal) + (1 - faceSimilarity(e.face, x.face)) * 0.5 + (x.family === e.family ? 0 : 0.25) }))
      .sort((a, b) => a.s - b.s).map((o) => o.x);
    const top = ranked.slice(0, Math.max(n * 2, 10)).sort((a, b) => a.arousal - b.arousal);
    const k = Math.ceil(n / sel.length) + 1;
    const out = [];
    for (let i = 0; i < Math.min(k, top.length); i++) out.push(top[Math.round((i * (top.length - 1)) / Math.max(1, k - 1))]);
    return [...new Set(out)];
  });
  const res = [];
  for (let i = 0; res.length < n && i < 12; i++) for (const p of pools) if (p[i] && !res.includes(p[i]) && res.length < n) res.push(p[i]);
  return res;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt > 0 ? 255 : 0, a = Math.abs(amt);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return `rgb(${r},${g},${b})`;
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function listJoin(a) { return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
const svgEl = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

// A simple, friendly body outline (viewBox 0 0 200 360): left half authored,
// right half mirrored, so it's always symmetric.
function bodyPathD() {
  const start = [90, 70];
  const segs = [
    ['L', [90, 86]], ['C', [90, 95], [84, 99], [74, 101]], ['C', [58, 104], [50, 111], [48, 124]], ['L', [38, 200]],
    ['C', [36, 222], [32, 240], [30, 256]], ['C', [26, 270], [30, 283], [38, 281]], ['C', [44, 279], [47, 268], [46, 258]],
    ['L', [56, 192]], ['L', [62, 146]], ['L', [64, 200]], ['C', [64, 214], [62, 222], [62, 234]], ['L', [66, 338]],
    ['C', [66, 350], [92, 350], [92, 338]], ['L', [96, 250]],
  ];
  const m = ([x, y]) => [200 - x, y];
  const p = (pt) => `${pt[0]} ${pt[1]}`;
  let d = `M ${p(start)}`;
  for (const [t, ...pts] of segs) d += ` ${t} ${pts.map(p).join(' ')}`;
  d += ` Q 100 242 ${p(m(segs[segs.length - 1].at(-1)))}`;
  const ends = [start, ...segs.map((s) => s.at(-1))];
  for (let i = segs.length - 1; i >= 0; i--) {
    const [t, ...pts] = segs[i];
    const ctrls = pts.slice(0, -1).reverse().map(m);
    d += ` ${t} ${[...ctrls, m(ends[i])].map(p).join(' ')}`;
  }
  return `${d} Z`;
}

// ================================================================= run ==
export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion;
  const low = !!ctx.lowStim;
  const realm = () => world.realm;
  const say = (t, ms = 3000) => ctx.say(t, { who: 'Loomi', ms });
  const aborted = () => signal.aborted;
  const result = { completed: false, names: [], region: null, size: 0.5, colour: null, texture: null, need: null, way: null };

  // what the person brought
  const confirmed = (ctx.input?.emotions || []).map((x) => getEmotion(x.id)).filter(Boolean);
  const inI = clamp(Number(ctx.input?.intensity) || confirmed[0]?.intensity || 0.6, 0.15, 1);
  let sel = confirmed.slice(0, 3);
  const leadFamily = () => (sel[0] || confirmed[0])?.family || 'calm';
  const hue = () => getFamily(leadFamily())?.hue || '#a8f0ff';

  // ------------------------------------------------- shared fx layer --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
  world.fx.replaceChildren(canvas);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    relayout?.();
  };
  let relayout = null;
  resize();
  addEventListener('resize', resize);

  let raf = 0, last = performance.now(), T = 0;
  let drawScene = null;
  const loop = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    T += dt * (rm ? 0.3 : 1);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    drawScene?.(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const timers = new Set();
  const offs = [];
  const listen = (el, type, fn) => { el.addEventListener(type, fn); offs.push(() => el.removeEventListener(type, fn)); };
  let humSound = null;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    offs.splice(0).forEach((off) => off());
    removeEventListener('resize', resize);
    for (const t of timers) clearTimeout(t);
    humSound?.stop(); humSound = null;
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
  };
  signal.addEventListener('abort', cleanup);
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const untilClick = (btn) => new Promise((r) => { btn.addEventListener('click', r, { once: true }); signal.addEventListener('abort', r, { once: true }); });

  // free area between the title block and the dock
  const free = () => {
    const tb = document.querySelector('.move-title')?.getBoundingClientRect();
    const top = (tb && tb.height ? tb.bottom : 140) + 10;
    const dt = dock.getBoundingClientRect();
    const bottom = (dt.height ? dt.top : H - 120) - 10;
    return { top, bottom: Math.max(top + 60, bottom) };
  };
  const layerH = () => Math.min(H * 0.56, 470);
  const layerW = () => Math.min(W * 0.86, 430);
  // Mallow centred in a box; or tucked bottom-right ("side")
  const placeMallow = (mode, box = free(), roomPx = 70) => {
    const F = box.bottom - box.top, Lh = layerH();
    if (mode === 'centre') {
      // leave room above for Loomi's speech bubble
      const room = Math.min(roomPx, F * 0.4);
      const s = clamp(((F - room) * 0.95) / (0.66 * Lh), 0.26, 1);
      const cy = (box.top + room + box.bottom) / 2 - 0.05 * Lh * s;
      world.place({ x: 50, y: (cy / H) * 100, scale: s, calm: true });
      return s;
    }
    const s = clamp(Math.min(F * 0.42, 150) / (0.66 * Lh), 0.2, 0.5);
    const cy = box.bottom - 0.38 * Lh * s;
    const bodyHalfW = layerW() * 0.32 * s;
    const cx = W - bodyHalfW - Math.max(8, W * 0.03);
    world.place({ x: (cx / W) * 100, y: (cy / H) * 100, scale: s, calm: true });
    return { left: cx - bodyHalfW, top: cy - 0.28 * Lh * s };
  };

  // ============================================== 1. A CLOSER WORD ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'A closer word', prompt: 'Pick the word that fits best. Keep your own, or mix up to three.' });
  realm()?.setMood?.(moodFor(sel[0] || null));
  realm()?.transform?.(0.08);
  world.setEmotion(faceMix(sel, 0.75, { calm: 0.25 }), inI);

  const tray = h('div', { 'aria-live': 'polite', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '44px' } });
  const words = h('div', { role: 'group', 'aria-label': 'Feeling words', style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', maxHeight: H < 640 ? '22vh' : 'min(28vh, 210px)', overflowY: 'auto', padding: '4px 2px' } });
  const nameDone = h('button', { class: 'btn primary block', disabled: !sel.length }, 'That’s its name');
  const said = String(ctx.input?.text || '').trim();
  const echo = said && H >= 640 ? h('p', { class: 'muted', style: { margin: '0', textAlign: 'center', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, `You said: “${said.length > 60 ? `${said.slice(0, 58)}…` : said}”`) : null;
  dock.replaceChildren(...[echo, tray, words, nameDone].filter(Boolean));

  let mode = sel.length ? 'near' : 'families';
  let browseFamily = null;
  let quipN = 0;
  const chip = (label, { pressed = null, hueCol = null, onClick, aria } = {}) => {
    const b = h('button', { class: 'chip', 'aria-pressed': pressed == null ? null : String(pressed), 'aria-label': aria || null, style: { minHeight: '44px' } },
      hueCol ? h('span', { class: 'hue', style: { background: hueCol, boxShadow: `0 0 8px ${hueCol}` } }) : null, label);
    b.addEventListener('click', (e) => onClick(e, b));
    return b;
  };
  const navChip = (label, to, extra) => chip(label, { onClick: () => { mode = to; Object.assign(state1, extra || {}); renderWords(); audio.ui?.('tap'); haptic('light'); } });
  const state1 = {};
  let searchInput = null;

  function renderTray() {
    if (!sel.length) { tray.replaceChildren(h('span', { class: 'muted', style: { fontSize: '14px' } }, 'No word yet. Pick one below.')); return; }
    tray.replaceChildren(...sel.map((e, i) => [
      i ? h('span', { 'aria-hidden': 'true', style: { color: 'var(--text-2)', fontWeight: '700' } }, '+') : null,
      h('button', { class: 'chip', 'aria-label': `${e.name}, chosen. Press to remove.`, style: { minHeight: '44px', fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '700', background: rgba(getFamily(e.family)?.hue || '#a8f0ff', 0.28), borderColor: getFamily(e.family)?.hue },
        onclick: () => toggle(e) }, e.name, h('span', { 'aria-hidden': 'true', style: { opacity: '.6', marginLeft: '6px' } }, '×')),
    ]).flat().filter(Boolean));
  }
  function wordChip(e) {
    const on = sel.some((s) => s.id === e.id);
    return chip(e.name, { pressed: on, hueCol: getFamily(e.family)?.hue, aria: `${e.name}: ${e.blurb}`, onClick: (ev, b) => toggle(e, b) });
  }
  function renderWords() {
    const kids = [];
    if (mode === 'near') {
      const base = sel.length ? sel : confirmed;
      for (const e of confirmed) if (!sel.some((s) => s.id === e.id)) kids.push(wordChip(e));
      for (const e of nearby(base.length ? base : [getEmotion('calm')], 9)) kids.push(wordChip(e));
      kids.push(navChip('More words…', 'families'), navChip('Type one…', 'search'));
    } else if (mode === 'families') {
      if (confirmed.length || sel.length) kids.push(navChip('‹ Back', 'near'));
      for (const f of FAMILIES) kids.push(chip(f.name, { hueCol: f.hue, aria: `${f.name}: ${f.blurb}`, onClick: () => { mode = 'family'; browseFamily = f.id; renderWords(); audio.ui?.('tap'); haptic('light'); } }));
      kids.push(navChip('Type one…', 'search'));
    } else if (mode === 'family') {
      kids.push(navChip('‹ Families', 'families'));
      for (const e of emotionsByFamily(browseFamily)) kids.push(wordChip(e));
    } else if (mode === 'search') {
      kids.push(navChip('‹ Back', sel.length || confirmed.length ? 'near' : 'families'));
      searchInput = searchInput || h('input', { type: 'text', 'aria-label': 'Type a feeling word', placeholder: 'e.g. indignant, queasy, wistful', autocomplete: 'off',
        style: { flex: '1 1 160px', minHeight: '44px', borderRadius: '22px', border: '1px solid var(--line-strong)', background: 'var(--glass-strong)', color: 'inherit', font: 'inherit', fontSize: '16px', padding: '0 16px' } });
      const results = h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', width: '100%' } });
      const update = () => {
        const q = searchInput.value.trim();
        const hits = q ? searchEmotions(q, { limit: 6 }) : [];
        results.replaceChildren(...(hits.length ? hits.map(wordChip) : [h('span', { class: 'muted', style: { fontSize: '13px' } }, q ? 'Nothing by that name. Try a nearby word?' : 'Start typing. I’ll look it up.')]));
      };
      searchInput.oninput = update;
      update();
      kids.push(searchInput, results);
      words.replaceChildren(...kids);
      searchInput.focus({ preventScroll: true });
      requestAnimationFrame(() => relayout?.());
      return;
    }
    words.replaceChildren(...kids);
    requestAnimationFrame(() => relayout?.());
  }
  function toggle(e, fromEl) {
    const idx = sel.findIndex((s) => s.id === e.id);
    if (idx >= 0) {
      sel.splice(idx, 1);
      audio.fx?.('rotate-tick', { intensity: 0.4 });
      haptic('light');
      if (!sel.length) say('Wordless for a second. Also fine.', 2000);
    } else {
      if (sel.length >= 3) { say('Three’s plenty. Let one go first?', 2200); haptic('warning-soft'); return; }
      sel.push(e);
      audio.fx?.('chime', { intensity: 0.55, pitch: 1 + sel.length * 0.12 });
      haptic('light');
      flyToMallow(fromEl, e);
      const r = world.mallowRect();
      realm()?.pulse?.('ripple', { x: r.cx, y: r.cy });
      world.react(sel.length > 1 ? 'nod' : 'tap');
      const soft = SOFT_FAMILIES.has(e.family);
      if (sel.length === 2) say(`‘${e.name}’ as well. Two at once is normal.`, 2600);
      else if (sel.length === 3) say(`And ‘${e.name}’. A little committee. That’s fine.`, 2600);
      else if (confirmed.some((c) => c.id === e.id)) say('Your own word. Classic. Nothing wrong with the original.', 2600);
      else say((soft ? SOFT_QUIPS : QUIPS)[quipN++ % (soft ? SOFT_QUIPS : QUIPS).length](e.name), 2600);
    }
    world.setEmotion(faceMix(sel, 0.78, { calm: 0.22 }), sel.length ? Math.max(inI, 0.55) : 0.5);
    realm()?.setMood?.(moodFor(sel[0] || null));
    nameDone.disabled = !sel.length;
    renderTray();
    if (mode === 'near') renderWords();
    else words.querySelectorAll('.chip[aria-pressed]').forEach((b) => {
      const name = b.textContent; const on = sel.some((s) => s.name === name); b.setAttribute('aria-pressed', String(on));
    });
  }
  function flyToMallow(el, e) {
    if (!el || rm) return;
    const r = el.getBoundingClientRect(), m = world.mallowRect();
    const f = h('div', { 'aria-hidden': 'true', style: { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, padding: '8px 14px', borderRadius: '999px', background: rgba(getFamily(e.family)?.hue || '#a8f0ff', 0.85),
      color: '#0b0820', font: '700 15px var(--font-display)', transition: 'transform 700ms cubic-bezier(.2,.8,.2,1), opacity 700ms', pointerEvents: 'none', zIndex: '2' } }, e.name);
    world.fx.append(f);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      f.style.transform = `translate(${m.cx - r.left - r.width / 2}px, ${m.cy - r.top - r.height / 2}px) scale(.4)`;
      f.style.opacity = '0';
    }));
    later(() => f.remove(), 760);
  }

  relayout = () => placeMallow('centre');
  const named = untilClick(nameDone);
  renderTray();
  renderWords();
  await wait(60);
  relayout();
  const fam0 = new Set(sel.map((e) => e.family));
  say(!sel.length ? OPEN_NONE : fam0.size > 1 ? OPEN_MIXED : OPENERS[sel[0].family] || OPEN_NONE, 3400);
  await named;
  if (aborted()) return result;
  result.names = sel.map((e) => e.id);
  const NAME = sel.map((e) => e.name).join(' + ');
  const families = [...new Set(sel.flatMap((e) => [e.family]))];
  world.react('nod');
  audio.fx?.('star', { intensity: 0.6 });
  haptic('soft');
  realm()?.transform?.(0.22);
  realm()?.setMood?.({ clarity: 0.35 });
  await say(sel.length > 1 ? `${NAME}. A good, honest mix.` : `${NAME}. Good name. It suits it.`, 1900);
  if (aborted()) return result;

  // ============================================== 2. WHERE IS IT? ==
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Where does it live?', prompt: 'Drag the glow to where you notice it. Then set how big it is.' });
  world.setEmotion(faceMix(sel, 0.5, { curious: 0.3, calm: 0.2 }), 0.6);
  let size = clamp(inI * 0.85, 0.1, 0.95);
  let regionIdx = -1;
  const glowHue = hue();

  const svg = svgEl('svg', { viewBox: '0 0 200 360', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
  svg.style.cssText = 'position:absolute;overflow:visible;touch-action:none;cursor:grab';
  const defs = svgEl('defs');
  const grad = svgEl('radialGradient', { id: 'nameit-glow' });
  [['0%', 0.95], ['45%', 0.55], ['100%', 0]].forEach(([o, a]) => grad.append(svgEl('stop', { offset: o, 'stop-color': glowHue, 'stop-opacity': a })));
  const clip = svgEl('clipPath', { id: 'nameit-body' });
  const D = bodyPathD();
  clip.append(svgEl('path', { d: D }), svgEl('circle', { cx: 100, cy: 42, r: 28 }));
  defs.append(grad, clip);
  const bodyStyle = { fill: 'rgba(255,255,255,0.07)', stroke: 'rgba(220,240,255,0.6)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' };
  const fog = svgEl('ellipse', { cx: 100, cy: 180, rx: 120, ry: 190, fill: glowHue, opacity: 0 });
  const fill = svgEl('rect', { x: 0, y: 0, width: 200, height: 360, fill: glowHue, opacity: 0, 'clip-path': 'url(#nameit-body)' });
  const glows = svgEl('g');
  const hint = svgEl('circle', { cx: 100, cy: 330, r: 14, fill: 'url(#nameit-glow)' });
  svg.append(defs, fog, svgEl('path', { d: D, ...bodyStyle }), svgEl('circle', { cx: 100, cy: 42, r: 28, ...bodyStyle }), fill, glows, hint);
  world.fx.append(svg);
  world.fx.classList.add('live');

  const regionLabel = h('div', { 'aria-live': 'polite', style: { flex: '1', textAlign: 'center', font: '700 17px var(--font-display)' } }, 'Drag the glow');
  const prevB = h('button', { class: 'btn', 'aria-label': 'Previous body area', style: { minWidth: '52px', padding: '0' } }, '‹');
  const nextB = h('button', { class: 'btn', 'aria-label': 'Next body area', style: { minWidth: '52px', padding: '0' } }, '›');
  const sizeOut = h('span', { style: { color: 'var(--text-2)', fontSize: '14px' } }, '');
  const slider = h('input', { type: 'range', class: 'range', min: 0, max: 100, step: 1, value: Math.round(size * 100), 'aria-label': 'How big is it?' });
  const whereDone = h('button', { class: 'btn primary block', disabled: true }, 'That’s where');
  dock.replaceChildren(
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, prevB, regionLabel, nextB),
    h('label', { style: { display: 'grid', gap: '2px' } }, h('span', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' } }, h('span', {}, 'How big is it?'), sizeOut), slider),
    whereDone);
  const updSize = () => { sizeOut.textContent = `About ${sizeWord(size)}`; slider.setAttribute('aria-valuetext', `About the size of ${sizeWord(size)}`); };
  updSize();

  let dragPt = null;
  const svgBox = { x: 0, y: 0, w: 0, h: 0 };
  relayout = () => {
    const f = free();
    const side = placeMallow('side', f);
    const hgt = f.bottom - f.top;
    const w = Math.min(hgt * (200 / 360), side.left - 12, W * 0.62);
    const hh = w * (360 / 200);
    svgBox.w = w; svgBox.h = hh;
    svgBox.x = Math.max(8, Math.min((W - w) / 2 - W * 0.06, side.left - w - 6));
    svgBox.y = f.top + (hgt - hh) / 2;
    Object.assign(svg.style, { left: `${svgBox.x}px`, top: `${svgBox.y}px`, width: `${w}px`, height: `${hh}px` });
  };
  await wait(30);
  relayout();
  const toVB = (cx, cy) => [((cx - svgBox.x) / svgBox.w) * 200, ((cy - svgBox.y) / svgBox.h) * 360];
  const toScreen = ([x, y]) => [svgBox.x + (x / 200) * svgBox.w, svgBox.y + (y / 360) * svgBox.h];

  const glowEls = [svgEl('circle', { r: 0, fill: 'url(#nameit-glow)' }), svgEl('circle', { r: 0, fill: 'url(#nameit-glow)' })];
  glows.append(...glowEls);
  let fillA = 0, fogA = 0;
  drawScene = () => {
    const base = 12 + size * 44;
    const pulse = rm || low ? 1 : 1 + 0.07 * Math.sin(T * 1.7);
    const reg = REGIONS[regionIdx];
    hint.setAttribute('opacity', regionIdx < 0 && !dragPt ? String(0.6 + (rm ? 0 : 0.3 * Math.sin(T * 2.4))) : '0');
    const pts = dragPt ? [dragPt] : reg?.pts || [];
    glowEls.forEach((c, i) => {
      const p = pts[i];
      if (!p) { c.setAttribute('r', 0); return; }
      c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]);
      c.setAttribute('r', (base * pulse * (pts.length > 1 ? 0.8 : 1)).toFixed(1));
    });
    fillA = lerp(fillA, reg?.id === 'everywhere' && !dragPt ? 0.2 + size * 0.4 : 0, 0.12);
    fogA = lerp(fogA, reg?.id === 'nowhere' && !dragPt ? 0.06 + size * 0.12 : 0, 0.12);
    fill.setAttribute('opacity', (fillA * pulse).toFixed(3));
    fog.setAttribute('opacity', fogA.toFixed(3));
  };

  const nearest = ([x, y]) => {
    let best = -1, bd = Infinity;
    REGIONS.forEach((r, i) => r.pts.forEach(([px, py]) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = i; } }));
    return bd > 72 ? REGIONS.findIndex((r) => r.id === 'nowhere') : best;
  };
  let lastSnap = -1;
  const pickRegion = (i, { speak = true } = {}) => {
    regionIdx = (i + REGIONS.length) % REGIONS.length;
    const reg = REGIONS[regionIdx];
    regionLabel.textContent = reg.label;
    whereDone.disabled = false;
    audio.fx?.('drop-in', { intensity: 0.5 });
    haptic('soft');
    const sp = reg.pts[0] ? toScreen(reg.pts[0]) : [svgBox.x + svgBox.w / 2, svgBox.y + svgBox.h / 2];
    realm()?.pulse?.('ripple', { x: sp[0], y: sp[1] });
    if (lastSnap !== regionIdx) { world.react('nod'); if (speak) say(reg.line, 2400); }
    lastSnap = regionIdx;
  };
  const onDown = (e) => { e.preventDefault(); svg.setPointerCapture?.(e.pointerId); dragPt = toVB(e.clientX, e.clientY); svg.style.cursor = 'grabbing'; };
  const onMove = (e) => {
    if (!dragPt) return;
    dragPt = toVB(e.clientX, e.clientY);
    const i = nearest(dragPt);
    regionLabel.textContent = REGIONS[i].label;
  };
  const onUp = () => { if (!dragPt) return; const i = nearest(dragPt); dragPt = null; svg.style.cursor = 'grab'; pickRegion(i); };
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  prevB.onclick = () => pickRegion(regionIdx < 0 ? REGIONS.length - 1 : regionIdx - 1, { speak: false });
  nextB.onclick = () => pickRegion(regionIdx + 1, { speak: false });
  let lastTick = 0, bigQuip = false;
  slider.addEventListener('input', () => {
    size = Number(slider.value) / 100;
    updSize();
    const now = performance.now();
    if (now - lastTick > 90) { lastTick = now; audio.fx?.('rotate-tick', { intensity: 0.3, pitch: 0.8 + size * 0.6 }); haptic('tick'); }
    if (world.rig) world.rig.target.eyeOpen = 0.2 + size * 0.6;
    if (!bigQuip && size > 0.86) { bigQuip = true; say('The whole room. Big one. Okay. We’ve got space.', 2400); }
  });
  say('Where do you notice it? Drag the glow over. Rough is fine.', 3200);
  await untilClick(whereDone);
  if (aborted()) return result;
  svg.removeEventListener('pointerdown', onDown);
  world.fx.classList.remove('live');
  result.region = REGIONS[regionIdx].id;
  result.size = size;
  const REGION_TXT = REGIONS[regionIdx].id === 'everywhere' ? 'everywhere' : REGIONS[regionIdx].id === 'nowhere' ? 'nowhere in particular' : `your ${REGIONS[regionIdx].label.toLowerCase()}`;
  realm()?.transform?.(0.42);
  realm()?.setMood?.({ clarity: 0.5, agitation: 0.2 });
  svg.style.transition = 'opacity 500ms'; svg.style.opacity = '0';
  await wait(420);
  svg.remove();
  if (aborted()) return result;

  // ============================================ 3. GIVE IT A SHAPE ==
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Give it a shape', prompt: 'Pick a colour and texture. Drag it to stretch; push in to squeeze.' });
  world.setEmotion(faceMix(sel, 0.35, { curious: 0.35, playful: 0.15, calm: 0.15 }), 0.6);
  let colour = COLOURS.find(([id]) => id === FAMILY_COLOUR[leadFamily()]) || COLOURS[4];
  let texture = TEXTURES.find(([id]) => id === FAMILY_TEXTURE[leadFamily()]) || TEXTURES[5];
  const blob = { cx: W / 2, cy: H / 2, R: 60, a: 0, k: 1, ka: 0, kk: 1, soft: 1, softT: 1, warm: 0, warmT: 0 };
  const bubbles = [];
  const swRow = h('div', { role: 'radiogroup', 'aria-label': 'Colour', style: { display: 'flex', gap: '6px', overflowX: 'auto', padding: '2px 2px 4px' } });
  const txRow = h('div', { role: 'radiogroup', 'aria-label': 'Texture', style: { display: 'flex', gap: '6px', overflowX: 'auto', padding: '2px' } });
  const squeezeB = h('button', { class: 'btn', style: { flex: '1', padding: '0 10px', minHeight: '48px' }, 'aria-label': 'Squeeze the shape' }, 'Squeeze');
  const stretchB = h('button', { class: 'btn', style: { flex: '1', padding: '0 10px', minHeight: '48px' }, 'aria-label': 'Stretch the shape' }, 'Stretch');
  const shapeDone = h('button', { class: 'btn primary', style: { flex: '1.3', padding: '0 12px', minHeight: '48px' } }, 'That’s it');
  const renderSw = () => swRow.replaceChildren(...COLOURS.map((c) => h('button', {
    role: 'radio', 'aria-checked': String(c === colour), 'aria-label': c[1], title: c[1],
    style: { flex: '0 0 44px', width: '44px', height: '44px', borderRadius: '50%', background: c[2], border: c === colour ? '3px solid #fff' : '2px solid rgba(255,255,255,.25)', boxShadow: c === colour ? `0 0 14px ${c[2]}` : 'none', cursor: 'pointer' },
    onclick: () => { colour = c; renderSw(); audio.ui?.('select'); haptic('light'); world.react('tap'); realm()?.pulse?.('tap', { x: blob.cx, y: blob.cy }); },
  })));
  const renderTx = () => txRow.replaceChildren(...TEXTURES.map((t) => h('button', {
    class: 'chip', role: 'radio', 'aria-checked': String(t === texture), 'aria-pressed': String(t === texture), style: { minHeight: '44px' },
    onclick: () => { texture = t; renderTx(); audio.fx?.('sort', { intensity: 0.5 }); haptic('light'); world.react(t[0] === 'spiky' ? 'flick' : 'tap'); say(t[2], 2200); },
  }, t[1])));
  renderSw(); renderTx();
  const shaped = untilClick(shapeDone);
  dock.replaceChildren(swRow, txRow, h('div', { style: { display: 'flex', gap: '8px' } }, squeezeB, stretchB, shapeDone));
  requestAnimationFrame(() => swRow.querySelector('[aria-checked="true"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }));

  let fieldBox = { top: 0, bottom: 0, left: 0, right: W };
  relayout = () => {
    const f = free();
    const side = placeMallow('side', f);
    const right = Math.max(W * 0.55, side.left - 4);
    fieldBox = { top: f.top, bottom: f.bottom, left: 0, right };
    const fw = right, fh = f.bottom - f.top;
    blob.cx = Math.min(W / 2, fw / 2 + W * 0.04);
    // keep the shape clear of where Loomi's speech bubble pops up
    const above = side.top - 96 - f.top;
    const bh = above > 150 ? above : fh;
    blob.cy = f.top + bh * 0.5;
    const maxR = Math.min(fw * 0.5, bh * 0.5) * 0.66;
    blob.R = maxR * (0.62 + 0.38 * size);
  };
  await wait(30);
  relayout();

  drawScene = (dt) => {
    blob.a = blob.ka; // axis snaps to the drag direction; amount eases
    blob.k = lerp(blob.k, blob.kk, Math.min(1, dt * 9));
    blob.soft = lerp(blob.soft, blob.softT, Math.min(1, dt * 1.6));
    blob.warm = lerp(blob.warm, blob.warmT, Math.min(1, dt * 1.6));
    drawBlob(g, blob, colour[2], texture[0], T, rm);
    // fizzy bubbles
    if (texture[0] === 'fizzy' && !rm && Math.random() < dt * (low ? 4 : 12) * blob.soft) {
      const th = Math.random() * Math.PI * 2;
      bubbles.push({ x: blob.cx + Math.cos(th) * blob.R * 0.9, y: blob.cy + Math.sin(th) * blob.R * 0.9, vy: -20 - Math.random() * 30, r: 2 + Math.random() * 3.5, age: 0, life: 1.2 + Math.random() });
    }
    for (const b of bubbles) { b.age += dt; b.y += b.vy * dt; b.x += Math.sin((b.age + b.r) * 4) * 10 * dt; }
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].age > bubbles[i].life) bubbles.splice(i, 1);
    for (const b of bubbles) {
      g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - b.age / b.life)})`; g.lineWidth = 1.4;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.stroke();
    }
    drawExtra?.(dt);
  };
  let drawExtra = null;

  // squeeze / stretch by dragging
  let drag = null, lastK = 1, stretchQuip = false;
  const setDeform = (a, k) => {
    blob.ka = a; blob.kk = clamp(k, 0.6, 1.7);
    humSound?.update?.({ intensity: Math.min(1, Math.abs(blob.kk - 1) * 1.6), pitch: 0.8 + blob.kk * 0.25 });
    if (Math.abs(blob.kk - lastK) > 0.06) { lastK = blob.kk; haptic('tick'); }
  };
  const sDown = (e) => {
    if (e.clientY < fieldBox.top - 20 || e.clientY > fieldBox.bottom + 20) return;
    const d = Math.hypot(e.clientX - blob.cx, e.clientY - blob.cy);
    drag = { x0: e.clientX, y0: e.clientY, inside: d < blob.R * 1.15, k0: blob.kk };
    world.fx.setPointerCapture?.(e.pointerId);
    humSound = humSound || audio.hold?.('hum', { intensity: 0 }) || null;
    if (world.rig) world.rig.target.mouthRound = 0.5;
  };
  const sMove = (e) => {
    if (!drag) return;
    const vx = e.clientX - drag.x0, vy = e.clientY - drag.y0;
    const L = Math.hypot(vx, vy);
    if (L < 4) return;
    if (drag.inside) setDeform(Math.atan2(vy, vx), 1 + L / (blob.R * 1.6));
    else {
      const ax = blob.cx - drag.x0, ay = blob.cy - drag.y0, al = Math.hypot(ax, ay) || 1;
      const push = (vx * ax + vy * ay) / al;
      setDeform(Math.atan2(ay, ax), 1 - Math.max(0, push) / (blob.R * 1.8));
    }
    if (world.rig) world.rig.target.mouthOpen = Math.abs(blob.kk - 1) * 0.8;
  };
  const sUp = () => {
    if (!drag) return;
    drag = null;
    blob.kk = 1 + (blob.kk - 1) * 0.55; // it keeps some of the shape you gave it
    humSound?.update?.({ intensity: 0 });
    world.react('release');
    audio.fx?.('drop-in', { intensity: 0.35 });
    realm()?.pulse?.('tap', { x: blob.cx, y: blob.cy });
    if (!stretchQuip) { stretchQuip = true; say('Squishy. Feelings are more bendy than they look.', 2400); }
  };
  world.fx.classList.add('live');
  listen(world.fx, 'pointerdown', sDown);
  listen(world.fx, 'pointermove', sMove);
  listen(world.fx, 'pointerup', sUp);
  listen(world.fx, 'pointercancel', sUp);
  const nudge = (k) => { setDeform(0, k); later(() => { blob.kk = 1 + (blob.kk - 1) * 0.55; humSound?.update?.({ intensity: 0 }); }, 500); world.react('tap'); audio.fx?.('drop-in', { intensity: 0.35 }); haptic('pop'); };
  squeezeB.onclick = () => { humSound = humSound || audio.hold?.('hum', { intensity: 0 }) || null; nudge(0.68); };
  stretchB.onclick = () => { humSound = humSound || audio.hold?.('hum', { intensity: 0 }) || null; nudge(1.55); };
  say(`So it’s ${sizeWord(size)}-sized, in ${REGION_TXT === 'everywhere' ? 'all of you' : REGION_TXT === 'nowhere in particular' ? 'no place in particular' : REGION_TXT}. What does it look like?`, 3200);
  await shaped;
  if (aborted()) return result;
  offs.splice(0).forEach((off) => off());
  world.fx.classList.remove('live');
  humSound?.stop(); humSound = null;
  drag = null;
  result.colour = colour[0]; result.texture = texture[0];
  realm()?.transform?.(0.62);
  realm()?.setMood?.({ clarity: 0.65, agitation: 0.12, warmth: 0.4 });
  audio.fx?.('star', { intensity: 0.5 });
  world.react('nod');

  // =========================================== 4. WHAT DOES IT NEED? ==
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'What does it need?', prompt: 'Pick the one that feels most true.' });
  world.setEmotion(faceMix(sel, 0.25, { calm: 0.45, curious: 0.3 }), 0.55);
  const needIds = [...new Set(sel.flatMap((e) => [...(FAMILY_NEEDS[e.family] || []), ...e.also.flatMap((f) => (FAMILY_NEEDS[f] || []).slice(0, 1))]))].slice(0, 5);
  if (!needIds.length) needIds.push(...FAMILY_NEEDS.calm);
  needIds.push('unsure');
  const needGrid = h('div', { class: 'choice-grid' });
  for (const id of needIds) {
    const b = h('button', { class: 'choice', 'aria-pressed': 'false', style: { minHeight: '48px' } }, NEEDS[id][0]);
    b.onclick = () => { result.need = id; needGrid.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); needNext.disabled = false; audio.ui?.('select'); haptic('light'); };
    needGrid.append(b);
  }
  const needNext = h('button', { class: 'btn primary block', disabled: true }, 'That’s what it needs');
  dock.replaceChildren(needGrid, needNext);
  await wait(30);
  relayout();
  say('Last bit. What would help it, even a little?', 2600);
  await untilClick(needNext);
  if (aborted()) return result;
  const [NEED_LABEL, NEED_LINE, WAYS] = NEEDS[result.need];
  say(NEED_LINE, 2800);

  // drag a little light of the need into the shape
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'Hand it over', prompt: `Drag the little light of “${NEED_LABEL.toLowerCase()}” into your shape.` });
  const giveB = h('button', { class: 'btn primary block' }, 'Give it');
  let giveEarly = false;
  giveB.addEventListener('click', () => { giveEarly = true; }, { once: true });
  dock.replaceChildren(h('p', { class: 'muted', style: { margin: '0', textAlign: 'center' } }, 'Or tap the button. Same light.'), giveB);
  await wait(30);
  relayout();
  const orb = { x: 0, y: 0, hx: 0, hy: 0, drag: false, given: false, t: 0, s: 1 };
  g.font = '700 13px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  const labelHalf = g.measureText(NEED_LABEL).width / 2 + 10;
  const homeOrb = () => { orb.hx = Math.max(Math.max(34, labelHalf), blob.cx - blob.R * 1.6 - 10); orb.hy = Math.min(fieldBox.bottom - 34, blob.cy + blob.R * 1.1); };
  homeOrb(); orb.x = orb.hx; orb.y = orb.hy;
  const prevRelayout = relayout;
  relayout = () => { prevRelayout(); homeOrb(); if (!orb.drag && !orb.given) { orb.x = orb.hx; orb.y = orb.hy; } };
  drawExtra = (dt) => {
    if (orb.given && orb.s <= 0.02) return;
    if (!orb.drag && !orb.given) { orb.x = lerp(orb.x, orb.hx, Math.min(1, dt * 6)); orb.y = lerp(orb.y, orb.hy, Math.min(1, dt * 6)); }
    if (orb.given) { orb.x = lerp(orb.x, blob.cx, Math.min(1, dt * 5)); orb.y = lerp(orb.y, blob.cy, Math.min(1, dt * 5)); orb.s = Math.max(0, orb.s - dt * 1.4); }
    const r = 18 * orb.s * (rm ? 1 : 1 + 0.08 * Math.sin(T * 3));
    const gr = g.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r * 2.4);
    gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(0.35, 'rgba(255,224,150,0.85)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(orb.x, orb.y, r * 2.4, 0, Math.PI * 2); g.fill();
    if (!orb.given) {
      g.font = '700 13px ui-rounded, "SF Pro Rounded", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.shadowColor = 'rgba(0,0,30,0.7)'; g.shadowBlur = 6;
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillText(NEED_LABEL, orb.x, orb.y + r + 10);
      g.shadowBlur = 0; g.shadowColor = 'transparent';
    }
  };
  await new Promise((resolve) => {
    let done = false;
    const give = () => {
      if (done) return; done = true;
      orb.given = true; orb.drag = false;
      blob.softT = 0.4; blob.warmT = 1;
      world.fx.classList.remove('live');
      audio.fx?.('bloom', { intensity: 0.7 });
      haptic('success');
      realm()?.pulse?.('success', { x: blob.cx, y: blob.cy });
      world.react('comfort');
      world.setEmotion(faceMix(sel, 0.12, { comforted: 0.5, calm: 0.38 }), 0.6);
      resolve();
    };
    const oDown = (e) => { if (Math.hypot(e.clientX - orb.x, e.clientY - orb.y) < 48) { orb.drag = true; world.fx.setPointerCapture?.(e.pointerId); haptic('light'); } };
    const oMove = (e) => { if (!orb.drag) return; orb.x = e.clientX; orb.y = e.clientY; if (Math.hypot(orb.x - blob.cx, orb.y - blob.cy) < blob.R * 0.9) give(); };
    const oUp = () => { if (!orb.drag) return; orb.drag = false; if (Math.hypot(orb.x - blob.cx, orb.y - blob.cy) < blob.R * 1.15) give(); };
    world.fx.classList.add('live');
    listen(world.fx, 'pointerdown', oDown);
    listen(world.fx, 'pointermove', oMove);
    listen(world.fx, 'pointerup', oUp);
    listen(world.fx, 'pointercancel', oUp);
    if (giveEarly) give(); else giveB.addEventListener('click', give, { once: true });
    signal.addEventListener('abort', () => resolve(), { once: true });
  });
  if (aborted()) return result;
  offs.splice(0).forEach((off) => off());
  realm()?.transform?.(0.8);
  realm()?.setMood?.({ warmth: 0.6, heaviness: 0.1, clarity: 0.75, agitation: 0.05 });
  await say(texture[0] === 'warm' ? 'Ooh. It glowed a bit. Cosy.' : 'See that? It went a little softer round the edges.', 2400);
  if (aborted()) return result;

  setMove(3, { eyebrow: 'Move 4 of 4', title: 'A small way to give it', prompt: 'Pick one. Small counts. Tiny counts double.' });
  const wayList = h('div', { style: { display: 'grid', gap: '8px' } });
  const wayDone = h('button', { class: 'btn primary block', disabled: true }, 'Done');
  for (const w of WAYS) {
    const b = h('button', { class: 'choice', 'aria-pressed': 'false', style: { minHeight: '48px', textAlign: 'left', padding: '10px 16px' } }, w);
    b.onclick = () => { result.way = w; wayList.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); wayDone.disabled = false; audio.ui?.('select'); haptic('light'); world.react('nod'); };
    wayList.append(b);
  }
  dock.replaceChildren(wayList, wayDone);
  await wait(30);
  relayout();
  await untilClick(wayDone);
  if (aborted()) return result;

  // ======================================================= FINALE ==
  const keep = h('button', { class: 'btn primary block', disabled: true }, 'Keep the stone');
  dock.replaceChildren(keep);
  setMove(4, { eyebrow: 'Loomi’s keepsake', title: 'Your stone', prompt: '' });
  world.fx.classList.remove('live');
  await wait(30);
  const fF = free();
  const stoneY = fF.top + (fF.bottom - fF.top) * 0.2;
  const stoneR = clamp((fF.bottom - fF.top) * 0.09, 26, 48);
  placeMallow('centre', { top: stoneY + stoneR * 1.15 + 70, bottom: fF.bottom }, W < 360 ? 112 : 96);
  relayout = null;
  const from = { cx: blob.cx, cy: blob.cy, R: blob.R, k: blob.k, a: blob.a, soft: blob.soft };
  let p = 0;
  const sub = `${REGION_TXT === 'everywhere' ? 'Everywhere' : REGION_TXT === 'nowhere in particular' ? 'Nowhere in particular' : `In ${REGION_TXT}`} · needs ${NEED_LABEL.toLowerCase()}`;
  const glints = [];
  drawExtra = null;
  drawScene = (dt) => {
    p = Math.min(1, p + dt / (rm ? 1.2 : 2.2));
    const e = 1 - Math.pow(1 - p, 3);
    blob.cx = lerp(from.cx, W / 2, e); blob.cy = lerp(from.cy, stoneY, e); blob.R = lerp(from.R, stoneR, e);
    blob.a = lerp(from.a, 0, e); blob.k = lerp(from.k, 1.28, e); blob.soft = lerp(from.soft, 0, e); blob.warm = 1;
    drawBlob(g, blob, colour[2], texture[0], T, rm, e);
    if (p > 0.55) {
      const a = Math.min(1, (p - 0.55) / 0.35);
      g.textAlign = 'center'; g.textBaseline = 'top';
      const ty = stoneY + stoneR * 1.15 + 12;
      g.font = `700 ${NAME.length > 22 ? 18 : 22}px Fredoka, ui-rounded, system-ui, sans-serif`;
      g.font = '600 13px ui-rounded, system-ui, sans-serif';
      const pw = Math.min(W - 24, Math.max(g.measureText(sub).width, NAME.length * 12) + 36);
      g.fillStyle = `rgba(10,14,44,${0.55 * a})`;
      g.beginPath();
      if (g.roundRect) g.roundRect(W / 2 - pw / 2, ty - 8, pw, 62, 20); else g.rect(W / 2 - pw / 2, ty - 8, pw, 62);
      g.fill();
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.font = `700 ${NAME.length > 22 ? 18 : 22}px Fredoka, ui-rounded, system-ui, sans-serif`;
      g.fillText(NAME, W / 2, ty, W - 40);
      g.fillStyle = `rgba(220,235,255,${a * 0.8})`;
      g.font = '600 13px ui-rounded, system-ui, sans-serif';
      g.fillText(sub, W / 2, ty + 28, W - 40);
    }
    if (p >= 1 && !rm && !low && Math.random() < dt * 2) glints.push({ x: W / 2 + (Math.random() - 0.5) * stoneR * 2.4, y: stoneY + (Math.random() - 0.5) * stoneR * 1.4, age: 0 });
    for (const s of glints) s.age += dt;
    while (glints.length && glints[0].age > 1.2) glints.shift();
    for (const s of glints) {
      const a = Math.sin((s.age / 1.2) * Math.PI) * 0.8, l = 5;
      g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(s.x - l, s.y); g.lineTo(s.x + l, s.y); g.moveTo(s.x, s.y - l); g.lineTo(s.x, s.y + l); g.stroke();
    }
  };
  realm()?.transform?.(1);
  realm()?.setMood?.({ agitation: 0, heaviness: 0, clarity: 0.9, warmth: 0.55 });
  audio.fx?.('clear', { intensity: 0.7 });
  world.setEmotion({ calm: 0.6, relieved: 0.2, comforted: 0.2 }, 0.65);
  await wait(rm ? 1300 : 2300);
  if (aborted()) return result;
  realm()?.pulse?.('success', { x: W / 2, y: stoneY });
  audio.fx?.('star', { intensity: 0.6 });
  haptic('success');
  world.react('celebrate');
  const kept = untilClick(keep);
  keep.disabled = false;
  say('There. Named, placed, shaped. A stone you know now. Nice. Very nice.', 3600);
  await kept;
  if (aborted()) return result;
  world.setEmotion({ calm: 0.8, happy: 0.2 }, 0.6);
  world.react('tap');
  await say('Quietly impressed over here. Drift safe.', 1900);
  if (aborted()) return result;
  cleanup();

  const colourName = colour[1].toLowerCase();
  result.completed = true;
  result.stone = { name: NAME, colour: colour[2], texture: texture[0] };
  result.families = families;
  result.summary = [
    { label: 'Its name', text: NAME },
    { label: 'Where it lives', text: `${REGION_TXT[0].toUpperCase()}${REGION_TXT.slice(1)}, about the size of ${sizeWord(size)}` },
    { label: 'Its shape', text: `${texture[1]}, ${colourName}` },
    { label: 'What it needed', text: NEED_LABEL },
    { label: 'A small way to give it', text: result.way },
  ];
  result.share = { title: `${NAME}, named`, subtitle: 'Loomi helped me give a feeling its proper name.' };
  return result;
}

// realm mood from a feeling's valence/arousal
function moodFor(e) {
  if (!e) return { agitation: 0.15, heaviness: 0.2, clarity: 0.25, warmth: 0.3 };
  const neg = e.valence < 0;
  return {
    agitation: neg ? clamp(e.arousal * 0.7, 0, 0.8) : clamp(e.arousal * 0.3, 0, 0.4),
    heaviness: neg ? clamp((1 - e.arousal) * 0.6, 0, 0.7) : 0.1,
    clarity: 0.25,
    warmth: e.valence > 0 ? 0.55 : 0.2,
  };
}

// The living blob. `stone` (0..1) morphs it into a smooth glowing pebble.
function drawBlob(g, b, col, tex, t, rm, stone = 0) {
  const N = 120, pts = [], inner = [];
  const ca = Math.cos(b.a), sa = Math.sin(b.a);
  const sx = b.k, sy = 1 / Math.pow(b.k, 0.6);
  const s = b.soft;
  const wob = 1 - stone;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    let r = 1 + wob * (0.035 * Math.sin(3 * th + t * 0.8) + 0.02 * Math.sin(5 * th - t * 0.6));
    if (tex === 'spiky') r += 0.34 * s * Math.pow(Math.abs(Math.sin(4.5 * th + t * 0.12)), 6);
    else if (tex === 'heavy') r += 0.16 * s * Math.pow(Math.max(0, Math.sin(th)), 2) - 0.06 * s * Math.max(0, -Math.sin(th));
    else if (tex === 'fizzy') r += s * (rm ? 0.02 * Math.sin(17 * th) : 0.035 * Math.sin(17 * th + t * 5) + 0.025 * Math.sin(11 * th - t * 3.7));
    else if (tex === 'tight') r = r * (1 - 0.18 * s) + (rm ? 0 : 0.01 * s * Math.sin(29 * th + t * 7));
    else if (tex === 'warm') r += 0.05 * s * Math.sin(2 * th + t * 0.7);
    let x = Math.cos(th) * r * b.R, y = Math.sin(th) * r * b.R;
    if (tex === 'heavy') y = y * (1 - 0.1 * s) + b.R * 0.08 * s;
    const u = x * ca + y * sa, v = -x * sa + y * ca;
    const u2 = u * sx, v2 = v * sy;
    pts.push([b.cx + u2 * ca - v2 * sa, b.cy + u2 * sa + v2 * ca]);
    if (tex === 'hollow') {
      const ir = 0.5 * s;
      inner.push([b.cx + (u2 * ca - v2 * sa) * ir, b.cy + (u2 * sa + v2 * ca) * ir]);
    }
  }
  const trace = (arr, reverse = false) => {
    const a = reverse ? [...arr].reverse() : arr;
    const n = a.length;
    g.moveTo((a[n - 1][0] + a[0][0]) / 2, (a[n - 1][1] + a[0][1]) / 2);
    for (let i = 0; i < n; i++) { const p = a[i], q = a[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    g.closePath();
  };
  const R = b.R;
  // halo (warm texture, given need, or the finished stone)
  const haloA = Math.max(tex === 'warm' ? 0.28 * s + 0.12 : 0, b.warm * 0.3, stone * 0.4) * (rm ? 1 : 0.85 + 0.15 * Math.sin(t * 1.3));
  if (haloA > 0.01) {
    const hg = g.createRadialGradient(b.cx, b.cy, R * 0.5, b.cx, b.cy, R * 2.1);
    hg.addColorStop(0, rgba(col, haloA)); hg.addColorStop(1, rgba(col, 0));
    g.fillStyle = hg; g.beginPath(); g.arc(b.cx, b.cy, R * 2.1, 0, Math.PI * 2); g.fill();
  }
  if (tex === 'heavy' && s > 0.05) {
    g.fillStyle = `rgba(0,0,10,${0.28 * s})`;
    g.beginPath(); g.ellipse(b.cx, b.cy + R * 1.18, R * 0.9 * sx, R * 0.16, 0, 0, Math.PI * 2); g.fill();
  }
  const base = tex === 'heavy' ? shade(col, -0.18 * s) : col;
  const fg = g.createRadialGradient(b.cx - R * 0.32, b.cy - R * 0.38, R * 0.08, b.cx, b.cy, R * 1.35);
  fg.addColorStop(0, shade(col.startsWith('#') ? col : '#ffffff', 0.45 + stone * 0.15));
  fg.addColorStop(0.5, base);
  fg.addColorStop(1, shade(col, -0.38));
  g.fillStyle = fg;
  g.beginPath();
  trace(pts);
  if (inner.length) trace(inner, true);
  g.fill('evenodd');
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.6;
  g.stroke();
  if (tex === 'tight' && s > 0.05) {
    g.strokeStyle = `rgba(255,255,255,${0.22 * s})`; g.lineWidth = 2;
    for (const f of [0.72, 0.46]) { g.beginPath(); trace(pts.map(([x, y]) => [b.cx + (x - b.cx) * f, b.cy + (y - b.cy) * f])); g.stroke(); }
  }
  if (inner.length && s > 0.05) {
    g.strokeStyle = `rgba(0,0,20,${0.35 * s})`; g.lineWidth = 3;
    g.beginPath(); trace(inner); g.stroke();
  }
  // gloss
  g.fillStyle = `rgba(255,255,255,${0.22 + stone * 0.25})`;
  g.beginPath(); g.ellipse(b.cx - R * 0.3 * sx, b.cy - R * 0.42 * sy, R * 0.26 * sx, R * 0.13, -0.5, 0, Math.PI * 2); g.fill();
}
