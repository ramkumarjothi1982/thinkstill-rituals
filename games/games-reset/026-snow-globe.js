/* 026 Snow Globe — Reset · GROUND · Attention / Grounding / Mental Quiet
 * Mechanism: the "snow globe mind" of mindfulness teaching (the glitter jar): when the mind is stirred up everything swirls
 * and nothing is clear; holding still lets it settle by itself, and slow breathing with a long out-breath (about six breaths
 * a minute; Zaccaro et al. 2018) helps it settle sooner. The player shakes their own thoughts into a blizzard, then rests a
 * finger perfectly still on the glass and breathes with the ring: each slow out-breath sinks one thought into the snow.
 * Twist: Sync bumps the table and it all flies again, so the lesson lands: settling again is the skill, not never moving.
 * Verb: shake (rapid swipes), then hold still (a finger resting on the glass) while breathing slowly.
 * Finale: crystal clear: windows light up one by one, a tiny train runs, chimneys smoke, the globe glows, Sync takes the
 * photo, and the globe joins a shelf that gains a new village every visit (today's season inside, best re-settle time).
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hexc = (s) => { const v = parseInt(s.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : clamp(a, 0, 1).toFixed(3)) + ')';
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const outBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const SERIF = '"Fraunces", "Lora", "Iowan Old Style", "Palatino Linotype", "TeX Gyre Pagella", Georgia, serif';
  const SANS = '"Nunito", "Avenir Next", "Segoe UI", "Trebuchet MS", system-ui, sans-serif';
  const PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];

  /* Today's season inside the globe (one a day, in turn). */
  const SEASONS = [
    { key: 'winter', name: 'winter snow', word: 'snow', flake: 'snow', chord: ['D4', 'F#4', 'A4', 'C#5'], notes: ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6'],
      night: ['#071029', '#17305f', '#3d5a91'], day: ['#4a7fc0', '#93bde6', '#e2eef9'], dusk: ['#1d2558', '#6f5893', '#f2a888'],
      hills: ['#c9d7ec', '#a3b7d6'], ground: ['#f6faff', '#d2deef', '#9fb3d3'], tree: ['#1f5c4c', '#184b3e'], leafy: false,
      flakes: ['#ffffff', '#e4f0ff'], haze: [236, 243, 255], letter: '#fff8e8', snowRoof: true },
    { key: 'spring', name: 'spring blossom', word: 'petals', flake: 'petal', chord: ['E4', 'G#4', 'B4', 'D#5'], notes: ['E5', 'F#5', 'G#5', 'B5', 'C#6', 'E6'],
      night: ['#13113a', '#3d2e6b', '#93608e'], day: ['#5e9edc', '#acd1f0', '#fde2ee'], dusk: ['#29245e', '#86589a', '#f6a8a4'],
      hills: ['#a4cc8e', '#83b272'], ground: ['#d5edb6', '#a7cf8b', '#78a864'], tree: ['#f4a9c7', '#e77fa9', '#fbd0e0'], leafy: true,
      flakes: ['#ffd2e4', '#ffb0cc', '#fff2f8'], haze: [255, 230, 241], letter: '#fffaf3', snowRoof: false },
    { key: 'summer', name: 'summer glitter', word: 'glitter', flake: 'glitter', chord: ['C4', 'E4', 'G4', 'B4'], notes: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'],
      night: ['#0a1534', '#24397a', '#c57f6c'], day: ['#2f86d0', '#86c4ec', '#ffefc4'], dusk: ['#1c2a64', '#8a5a8e', '#ffb46c'],
      hills: ['#8bc47c', '#649f5d'], ground: ['#c6e79c', '#93c673', '#679e51'], tree: ['#4b9b53', '#367b3f', '#5fae62'], leafy: true,
      flakes: ['#ffe28a', '#ffcf48', '#fff6cf', '#f2b23a'], haze: [255, 240, 196], letter: '#fffaf0', snowRoof: false },
    { key: 'autumn', name: 'autumn leaves', word: 'leaves', flake: 'leaf', chord: ['A3', 'C#4', 'E4', 'G#4'], notes: ['A4', 'B4', 'C#5', 'E5', 'F#5', 'A5'],
      night: ['#160e29', '#45274f', '#b5603f'], day: ['#5a8fcc', '#b5cfe9', '#ffdfba'], dusk: ['#281e50', '#8a4e6d', '#f29b5b'],
      hills: ['#d9a560', '#ba8046'], ground: ['#edca91', '#d4a263', '#a9773f'], tree: ['#e27b2f', '#c6462d', '#ebb43d'], leafy: true,
      flakes: ['#f3913f', '#e3582f', '#f6c54f', '#ba472b'], haze: [255, 228, 199], letter: '#fff8ee', snowRoof: false }
  ];
  /* A new village for the shelf each visit (in turn, never random). */
  const SCENES = [
    { name: 'Pine Hollow', mark: 'chapel', seed: 11, slots: [0, 1, 2, 3, 4, 5, 6], walls: ['#e9cfa6', '#c8614b', '#efe5d4', '#5f93a8', '#dca54d', '#7ea36f', '#b98aa6'], roofs: ['#5b3a2c', '#3c4b66', '#7d3029'] },
    { name: 'Harbour Lights', mark: 'lighthouse', seed: 23, markU: -0.4, pond: [0.3, -0.56, 1.5], slots: [1, 4, 5, 6, 7, 0], walls: ['#efe5d4', '#5f93a8', '#9fb7d0', '#c8614b', '#e9cfa6', '#dca54d'], roofs: ['#3c4b66', '#5b3a2c', '#7d3029'] },
    { name: 'Clock Square', mark: 'clock', seed: 37, slots: [0, 1, 2, 3, 4, 5, 6, 7], walls: ['#dca54d', '#c8614b', '#e9cfa6', '#b98aa6', '#5f93a8', '#efe5d4', '#7ea36f', '#e9cfa6'], roofs: ['#7d3029', '#5b3a2c', '#6b4a6e'] },
    { name: 'Windmill Farm', mark: 'windmill', seed: 41, markU: 0.04, slots: [0, 1, 4, 5, 6], walls: ['#e9cfa6', '#7ea36f', '#efe5d4', '#c8614b', '#dca54d'], roofs: ['#4a6650', '#5b3a2c', '#7d3029'], fence: true },
    { name: 'Castle Hill', mark: 'castle', seed: 53, slots: [0, 1, 4, 5, 6, 7], walls: ['#efe5d4', '#9fb7d0', '#b98aa6', '#e9cfa6', '#5f93a8', '#c8614b'], roofs: ['#6b4a6e', '#3c4b66', '#5b3a2c'] },
    { name: 'Star Lookout', mark: 'observatory', seed: 67, slots: [0, 1, 2, 3, 4, 5], walls: ['#5f93a8', '#e9cfa6', '#efe5d4', '#b98aa6', '#c8614b', '#dca54d'], roofs: ['#3c4b66', '#6b4a6e', '#4a6650'] }
  ];
  const HOUSE_SLOTS = [[-0.6, -0.4], [0.6, -0.42], [-0.37, -0.68], [0.37, -0.7], [-0.66, 0.04], [0.65, 0.02], [-0.3, 0.2], [0.31, 0.22]];
  const TREE_SLOTS = [[-0.86, -0.16], [0.86, -0.18], [-0.13, -0.9], [0.15, -0.88], [-0.82, 0.3], [0.83, 0.27], [-0.5, -0.16], [0.49, -0.12], [0.02, 0.4]];

  const LINES = {
    hello: { Jolly: 'Your snow globe! Everything on your mind is in there. Give it a really good shake.', Cheeky: 'Your whole brain, in a jar. Go on, shake it like you mean it.', Unfiltered: 'Your thoughts are in the globe. Shake it. Hard.' },
    helloG: { Jolly: 'A snow globe full of the day’s noise. Give it a really good shake.', Cheeky: 'One jar of assorted noise. Shake it like you mean it.', Unfiltered: 'The day’s noise is in the globe. Shake it.' },
    more: { Jolly: 'Faster! Quick swipes, back and forth.', Cheeky: 'That was a polite stir. Shake it!', Unfiltered: 'Faster. Back and forth.' },
    blizzard: { Jolly: 'Whoa! Total blizzard!', Cheeky: 'Absolute chaos. I love it!', Unfiltered: 'Blizzard. Nice.' },
    busy: { Jolly: 'That’s what a busy mind looks like. Now watch what stillness does.', Cheeky: 'Yep. That’s the inside of a head on a busy day. Now: statue mode.', Unfiltered: 'That’s the busy mind. Now hold still.' },
    rest: { Jolly: 'Rest a finger on the glass, perfectly still, and breathe with the ring. Slow breaths out.', Cheeky: 'Finger on the glass. Statue mode. Breathe out slower than you breathe in.', Unfiltered: 'Finger on the glass. Don’t move. Breathe with the ring.' },
    lifted: { Jolly: 'Rest your finger back whenever you’re ready.', Cheeky: 'Finger back on whenever you like. No rush.', Unfiltered: 'Finger back on when you’re ready.' },
    wobble: { Jolly: 'Easy… a still finger, like a frozen pond.', Cheeky: 'Wobbly finger, wobbly {f}. Statue mode!', Unfiltered: 'Stiller. The {f} feels every wobble.' },
    sunk: { Jolly: 'There it goes. Still there, just resting on the bottom now.', Cheeky: 'Sunk! Still there. It just stopped doing laps.', Unfiltered: 'Settled. Still there. Not swirling.' },
    sunkG: { Jolly: 'There it goes, settling into the {f}.', Cheeky: 'Sunk! It stopped doing laps.', Unfiltered: 'Settled.' },
    clear: { Jolly: 'Look how clear it is. Nothing went anywhere. It all just settled.', Cheeky: 'Same {f}, same village. Just… calm. Wild.', Unfiltered: 'Clear. Nothing removed. It settled.' },
    peek: { Jolly: 'Ooh, is that a tiny train in there?', Cheeky: 'Wait, there’s a TRAIN? Let me see!', Unfiltered: 'Is there a train in there?' },
    oops: { Jolly: 'Oops! Sorry, sorry!', Cheeky: 'Oops. My elbow did that.', Unfiltered: 'Oops. Bumped it.' },
    again: { Jolly: 'That’s okay. Life bumps the table. Settling again is the real skill.', Cheeky: 'Something always bumps the table. Settling again is the skill, not never moving.', Unfiltered: 'It happens. Settling again is the skill.' },
    back: { Jolly: 'One thought floated back up. Totally normal. Same stillness, same slow breath.', Cheeky: 'Look who’s back. Thoughts do that. Same trick again.', Unfiltered: 'One came back. Normal. Same again.' },
    lights: { Jolly: 'Crystal clear. Oh look, the lights are coming on!', Cheeky: 'Crystal clear. And the village just woke up.', Unfiltered: 'Clear. Lights on.' },
    photo: { Jolly: 'Hold still… got it! That one’s going on the shelf.', Cheeky: 'Snap. Framing that one.', Unfiltered: 'Photo. Shelf.' },
    care: { Jolly: 'A settled mind sees the next step more clearly, and asking for help can be that step.', Cheeky: 'A settled mind sees the next step more clearly, and asking for help can be that step.', Unfiltered: 'Settled, the next step is clearer. Asking for help counts.' }
  };

  (env.games = env.games || []).push({
    id: 'snow-globe', mode: 'reset', name: 'Snow Globe', verb: 'shake', family: 'GROUND', minutes: 2,
    parents: ['Attention / Grounding / Mental Quiet', 'Overthinking / Thought Fusion', 'Panic / Body Alarm'],
    cast: ['still', 'sync'], poster: { char: 'still', mood: 'meditate' },
    fonts: ['Fraunces:wght@600;700', 'Nunito:wght@700;800'],
    tagline: 'Shake up your thoughts, then hold still and watch them settle.',
    why: 'For a busy, buzzing mind: stillness and slow breaths let it all settle.',
    css: `
.g-snow-globe { --sg-ink: #fff6ea; --sg-ink2: rgba(255, 240, 225, 0.84); --sg-halo: rgba(12, 8, 28, 0.66); --sg-chip: rgba(22, 16, 44, 0.74); --sg-line: rgba(255, 236, 214, 0.22); background: #150f26; }
.g-snow-globe.sg-bright { --sg-ink: #2a2040; --sg-ink2: rgba(42, 32, 64, 0.82); --sg-halo: rgba(255, 249, 240, 0.88); --sg-chip: rgba(255, 251, 244, 0.86); --sg-line: rgba(42, 32, 64, 0.16); background: #efe4cf; }
.g-snow-globe .sg-touch { position: absolute; inset: 0; z-index: 20; touch-action: none; cursor: grab; outline: none; -webkit-tap-highlight-color: transparent; }
.g-snow-globe .sg-touch:active { cursor: grabbing; }
.g-snow-globe .sg-touch:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 214, 140, 0.75); }
.g-snow-globe .sg-hud { position: absolute; z-index: 25; left: 50%; transform: translateX(-50%); width: min(470px, calc(100% - 20px)); text-align: center; color: var(--sg-ink); pointer-events: none;
  padding: 6px 16px 12px; background: radial-gradient(closest-side, var(--sg-halo), rgba(0, 0, 0, 0)); transition: opacity 0.6s ease; }
.g-snow-globe .sg-hud.sg-off { opacity: 0; }
.g-snow-globe .sg-hud > [hidden] { display: none; }
.g-snow-globe .sg-kick { font: 800 12px/1.2 ${SANS}; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sg-ink2); }
.g-snow-globe .sg-title { font: 700 31px/1.08 ${SERIF}; letter-spacing: 0.005em; margin-top: 3px; text-shadow: 0 2px 14px rgba(0, 0, 0, 0.18); }
.g-snow-globe .sg-title .sg-n { display: inline-block; min-width: 1.1ch; margin-left: 0.32em; opacity: 0.78; font-variant-numeric: tabular-nums; }
.g-snow-globe .sg-line { font: 700 16px/1.32 ${SANS}; margin-top: 5px; text-wrap: balance; }
.g-snow-globe .sg-line .sg-u { display: inline-block; max-width: 100%; font: 800 15px/1.25 ${SANS}; letter-spacing: 0.04em; padding: 1px 8px 2px; margin: 1px 0; border-radius: 7px; background: var(--sg-chip); border: 1px solid var(--sg-line); vertical-align: baseline; }
.g-snow-globe .sg-meter { display: flex; align-items: center; gap: 9px; justify-content: center; margin-top: 8px; font: 800 12px/1 ${SANS}; letter-spacing: 0.16em; text-transform: uppercase; color: var(--sg-ink2); }
.g-snow-globe .sg-meter b { position: relative; display: block; width: 132px; height: 8px; border-radius: 6px; background: var(--sg-line); overflow: hidden; }
.g-snow-globe .sg-meter b i { position: absolute; inset: 0; border-radius: 6px; background: linear-gradient(90deg, #bfe3ff, #ffffff 60%, #ffe6b0); transform-origin: 0 50%; transform: scaleX(var(--m, 0)); }
.g-snow-globe .sg-swap { animation: snow-globe-swap 0.5s cubic-bezier(.2, 1.2, .4, 1) both; }
@keyframes snow-globe-swap { from { opacity: 0.2; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }
.g-snow-globe .sg-words { position: absolute; z-index: 22; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; pointer-events: none; transition: opacity 0.3s ease; }
.g-snow-globe .sg-words.sg-gone { opacity: 0; }
.g-snow-globe .sg-words .sg-eg { font: 800 12px/1.2 ${SANS}; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255, 246, 230, 0.92); text-shadow: 0 1px 6px rgba(10, 6, 24, 0.95); }
.g-snow-globe .sg-words .sg-word { font: 700 16px/1.18 ${SERIF}; letter-spacing: 0.07em; text-transform: uppercase; color: #fff8ec; text-align: center; max-width: 100%;
  text-shadow: 0 1px 0 rgba(40, 20, 60, 0.95), 0 0 9px rgba(16, 10, 36, 0.9), 0 2px 16px rgba(16, 10, 36, 0.7); animation: snow-globe-bob 3.4s ease-in-out infinite; animation-delay: var(--d, 0s); }
.g-snow-globe .sg-words .sg-word span { display: block; }
@keyframes snow-globe-bob { 0%, 100% { transform: translateY(-3px) rotate(-1.2deg); } 50% { transform: translateY(3px) rotate(1.2deg); } }
.g-snow-globe .sg-cap { position: absolute; z-index: 25; left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100% - 24px); text-align: center; pointer-events: none;
  color: var(--sg-ink); padding: 8px 16px 9px; border-radius: 16px; background: var(--sg-chip); border: 1px solid var(--sg-line); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2); }
.g-snow-globe .sg-cap b { display: block; font: 700 17px/1.2 ${SERIF}; }
.g-snow-globe .sg-cap span { display: block; margin-top: 2px; font: 700 13px/1.3 ${SANS}; color: var(--sg-ink2); }
.g-snow-globe .sg-cap.sg-in { animation: snow-globe-swap 0.6s cubic-bezier(.2, 1.2, .4, 1) both; }
@container (min-width: 700px) {
  .g-snow-globe .sg-title { font-size: 38px; }
  .g-snow-globe .sg-line { font-size: 17px; }
  .g-snow-globe .sg-words .sg-word { font-size: 19px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity, RED = K.reduced();
      let care = an.safety === 'care';
      const visits = K.visits(), DAY = K.daily();
      const SEA = SEASONS[((DAY % 4) + 4) % 4];
      const SCN_I = ((visits % SCENES.length) + SCENES.length) % SCENES.length, SCN = SCENES[SCN_I];
      const IN_MS = 4000, OUT_MS = [6000, 6000, 7000][inten];
      const CAP = [2, 3, 4][inten];
      const line = (o) => (care ? o.Jolly : ctx.line(o)).replace(/\{f\}/g, SEA.word);
      const shelfData = S.store.get('snow-globe:shelf', {}) || {};

      /* ---------------- the player's thoughts (their own words only; examples are labelled as examples) ---------------- */
      function pickThoughts(a) {
        const real = [], seen = new Set();
        const norm = (l) => String(l || '').toUpperCase().replace(/\s+/g, ' ').trim();
        if (ctx.text) {
          (a.strands || []).forEach(s => { if (!s || s.generic) return; const l = norm(s.label); if (l.length < 2 || seen.has(l)) return; seen.add(l); real.push(l); });
          let core = null;
          if (a.core && !a.core.generic) { const l = norm(a.core.label); if (l.length >= 2) { core = l; if (seen.has(l)) real.splice(real.indexOf(l), 1); } }
          const list = real.slice(0, core ? CAP - 1 : CAP);
          if (core) list.push(core);
          if (list.length) return { list, generic: false };
        }
        const gen = (a.strands || []).filter(s => s && s.generic && s.label).map(s => norm(s.label));
        const base = gen.length >= 2 ? gen : ['TOMORROW’S LIST', 'THAT THING I SAID', 'WHAT IF IT GOES WRONG'];
        return { list: base.slice(0, Math.min(CAP, 3)), generic: true };
      }
      let TH = pickThoughts(an);
      let NT = TH.list.length;

      /* ---------------- state ---------------- */
      const G = { w: 0, H: 0, phone: true, cx: 0, cy: 0, R: 120, Ri: 115, k: 0.8, win: null, tableY: 0, slots: [] };
      const GL = { ox: 0, oy: 0, vx: 0, vy: 0, tx: 0, ty: 0, drag: false, tilt: 0, pvx: 0, lastRev: 0 };
      const FL = { S: 0, T: 0, ux: 0, uy: 0, dir: 1 };
      const BR = { on: false, phase: 'in', t0: 0, n: 0, shown: -1 };
      const PR = { p: 0, need: 3, rE: 0.05, rI: 0.006, S0: 0, T0: 0, boost: 0 };
      const finger = { down: false, x: 0, y: 0, ax: 0, ay: 0, drift: 0, t0: 0, sig: 1, valid: false, wob: 0 };
      const FX = { glow: 0, glowT: 0, dusk: 0, duskT: 0, lights: false, lightT: 0, smoke: false, train: false, trainU: -0.3, trainPass: 0, flash: 0, shelf: 0, shelfT: 0, placeT: -1 };
      const CAM = { shake: 0 };
      let phase = 'intro', meter = 0, shattered = false, finished = false, now = 0, lastMs = performance.now();
      let agit = 0, airFrac = 0, nextGroup = 0, groupNow = -1, sinkSaid = false, wobbleSaid = false, liftedSaid = 0, lastReact = 0, moreSaid = false;
      let tBump = 0, resettle = 0, stillAcc = 0, stillN = 0, lastTick = 0, shakeStart = 0, lastWhoosh = 0, lastChug = 0;
      let C = null, V = null;
      const qual = { acc: 0, n: 0, q: 1 };

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const PG = K.particles({ max: 160 });
      const PO = K.particles({ max: 140 });
      const touch = h('div', { class: 'sg-touch', role: 'button', tabindex: '0', 'aria-label': 'The snow globe. Swipe fast to shake it. Then rest a finger on it and keep still while you breathe. Keyboard: arrow keys shake, hold Space to rest.' });
      const hud = h('div', { class: 'sg-hud', 'aria-live': 'polite' },
        h('div', { class: 'sg-kick' }),
        h('div', { class: 'sg-title' }, h('span', { class: 'sg-tt' }), h('span', { class: 'sg-n' })),
        h('div', { class: 'sg-line' }),
        h('div', { class: 'sg-meter', hidden: true }, h('span', { text: 'Blizzard' }), h('b', null, h('i'))));
      const hKick = hud.children[0], hTitle = hud.children[1].children[0], hNum = hud.children[1].children[1], hLine = hud.children[2], hMeter = hud.children[3];
      const meterFill = hMeter.querySelector('i');
      const wordsEl = h('div', { class: 'sg-words' });
      const capEl = h('div', { class: 'sg-cap', hidden: true });
      el.append(touch, wordsEl, hud, capEl);
      const still = K.character('still', { side: 'above', mood: 'calm', x: 10, y: 600, size: 74 });
      const sync = K.character('sync', { side: 'above', mood: 'happy', x: 300, y: 600, size: 74 });
      const home = { still: { x: 10, y: 600 }, sync: { x: 300, y: 600 } };
      const talk = (who, o, opts) => { (who === still ? sync : still).hush(); who.say(line(o), opts || {}); };
      el.classList.toggle('sg-bright', !K.dark());

      let wordEls = [];
      function buildWords() {
        wordsEl.innerHTML = ''; wordsEl.classList.remove('sg-gone');
        if (TH.generic) wordsEl.append(h('div', { class: 'sg-eg', text: 'Thoughts like' }));
        wordEls = TH.list.map((l, i) => { const e = h('div', { class: 'sg-word gk-user', style: { '--d': (-i * 1.1) + 's' } }, h('span', { text: l })); wordsEl.append(e); return e; });
      }
      buildWords();

      function setHud(kick, title, parts) {
        if (kick != null) { hKick.textContent = kick; hKick.hidden = !kick; }
        if (title != null) { hTitle.textContent = title; hNum.textContent = ''; BR.shown = -1; }
        if (parts != null) {
          hLine.textContent = '';
          (Array.isArray(parts) ? parts : [parts]).forEach(p => hLine.append(typeof p === 'string' ? document.createTextNode(p) : h('span', { class: 'gk-user sg-u', text: p.u })));
          hLine.hidden = !hLine.textContent;
        }
        hud.classList.remove('sg-swap'); void hud.offsetWidth; hud.classList.add('sg-swap');
      }
      const thoughtRef = (i) => (TH.generic ? ['a thought like ', { u: TH.list[i] }] : [{ u: TH.list[i] }]);

      /* a later (AI) reading can only make things gentler, and new words are used only before the first shake */
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => {
        if (!a || S.destroyed) return;
        if (a.safety === 'care') care = true;
        if (!shattered && (phase === 'intro' || phase === 'hello')) { an = a; TH = pickThoughts(an); NT = TH.list.length; buildWords(); S.later(layoutWords, 30); }
      }, () => {});

      /* ---------------- audio ---------------- */
      const music = K.music('musicbox'); music.level(0.4);
      const amb = K.ambience('room'); amb.level(0.22, 1.5);
      const au = () => !!A.ctx;
      let slosh = null, hiss = null;
      function loops() { if (!au()) return false; if (!slosh) { slosh = A.loop({ pink: true, filter: 'bandpass', freq: 420, q: 1.1 }); hiss = A.loop({ filter: 'highpass', freq: 5600, q: 0.6, bus: 'amb' }); } return true; }
      S.onDestroy(() => { if (slosh) slosh.stop(); if (hiss) hiss.stop(); });
      function tink(v) { if (!au()) return; const f = 2300 + Math.random() * 1700; A.tone({ type: 'sine', freq: f, dur: 0.16, vol: 0.032 * v, attack: 0.002, verb: 0.4 }); A.tone({ type: 'sine', freq: f * 2.76, dur: 0.06, vol: 0.012 * v, attack: 0.002 }); A.sync('tink', performance.now()); }
      function glug(v) { if (!au()) return; A.tone({ type: 'sine', freq: 150, to: 70, glide: 0.14, dur: 0.2, vol: 0.075 * v, attack: 0.01 }); A.noise({ pink: true, filter: 'lowpass', freq: 500, to: 180, dur: 0.22, vol: 0.05 * v, attack: 0.02 }); }
      function breathSound(out) {
        if (!au()) return;
        const d = (out ? OUT_MS : IN_MS) / 1000;
        if (out) { A.noise({ pink: true, filter: 'bandpass', freq: 1050, to: 240, q: 0.8, dur: d, attack: 0.7, vol: 0.055 }); A.tone({ type: 'sine', freq: A.note('A4'), to: A.note('D4'), glide: d, dur: d, attack: 0.9, vol: 0.028, verb: 0.5 }); }
        else { A.noise({ pink: true, filter: 'bandpass', freq: 330, to: 1150, q: 0.9, dur: d, attack: d * 0.55, vol: 0.045 }); A.tone({ type: 'sine', freq: A.note('D4'), to: A.note('A4'), glide: d, dur: d, attack: 1.3, vol: 0.026, verb: 0.5 }); }
        A.sync(out ? 'exhale' : 'inhale', performance.now());
      }
      function settleChime(i) { if (!au()) return; A.chime(A.note(PENTA[i % PENTA.length]), { vol: 0.075, dur: 2.6, verb: 0.55 }); A.sync('settle', performance.now()); }
      function landTick() { if (!au() || now - lastTick < 0.07) return; lastTick = now; A.tone({ type: 'sine', freq: 1900 + Math.random() * 900, dur: 0.05, vol: 0.012, attack: 0.002 }); }
      function bumpSound() {
        if (!au()) return;
        A.thud({ vol: 0.5 }); A.wood(undefined, 0.3, 0.55);
        const t = A.now(); for (let i = 0; i < 7; i++) A.tone({ when: t + 0.03 + i * 0.035, type: 'sine', freq: 2500 + Math.random() * 1900, dur: 0.06, vol: 0.026, attack: 0.002 });
        K.sfx.whoosh(); A.sync('bump', performance.now());
      }
      function whistle() {
        if (!au()) return;
        const t = A.now();
        [[0, 0.34], [0.44, 0.75]].forEach(([d, len], i) => { [587, 740, 880].forEach(f => A.tone({ when: t + d, type: 'triangle', freq: f * (i ? 0.985 : 1), dur: len, vol: 0.032, attack: 0.03, lp: 2600, verb: 0.3 })); A.noise({ when: t + d, filter: 'bandpass', freq: 1900, q: 1.4, dur: len, vol: 0.018, attack: 0.03 }); });
        A.sync('whistle', performance.now());
      }
      function shutter() { if (!au()) return; A.click({ vol: 0.16 }); A.noise({ filter: 'highpass', freq: 2600, dur: 0.09, vol: 0.07, attack: 0.004 }); A.tone({ type: 'sine', freq: 1200, to: 600, glide: 0.06, dur: 0.08, vol: 0.03 }); A.sync('shutter', performance.now()); }

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        let R, cy; const cx = Math.round(w / 2);
        if (phone) { R = Math.round(clamp(Math.min(w * 0.42, (H - 330) / 1.95), 104, 172)); cy = Math.round(Math.max(196 + R, Math.min(H * 0.5, H - 196 - R * 1.18))); }
        else { R = Math.round(clamp(Math.min(H * 0.29, w * 0.2), 140, 270)); cy = Math.round(Math.max(168 + R * 1.17, Math.min(H * 0.52, H - R * 1.18 - 110))); }
        Object.assign(G, { w, H, phone, cx, cy, R, Ri: R * 0.955, k: R / 150 });
        G.tableY = Math.round(cy + R * 1.12);
        if (phone) G.win = { x0: 20, x1: w - 20, y0: 92, y1: G.tableY - 4 };
        else { const ww = Math.min(w * 0.52, R * 2.75); G.win = { x0: cx - ww / 2, x1: cx + ww / 2, y0: 160, y1: G.tableY - 4 }; }
        G.slots = shelfSlots();
        SMAX = 280 * G.k; TMAX = 110 * G.k;
        hud.style.top = (phone ? 62 : 58) + 'px';
        placeCap();
        // characters: on phone both stand at the bottom with their bubbles above; on desktop they flank the globe on the table
        const sz = phone ? 72 : 100;
        if (phone) { home.still = { x: 8, y: H - 16 - sz }; home.sync = { x: w - 8 - sz, y: H - 16 - sz }; still.side('above'); sync.side('above'); }
        else { home.still = { x: Math.round(Math.max(300, cx - R * 0.9 - sz - 8)), y: Math.round(G.tableY - sz + 4) }; home.sync = { x: Math.round(Math.min(w - 300 - sz, cx + R * 0.9 + 8)), y: Math.round(G.tableY - sz + 4) }; still.side('left'); sync.side('right'); }
        [still, sync].forEach(c => c.el.style.setProperty('--sz', sz + 'px'));
        still.place(home.still.x, home.still.y); if (phase !== 'twist') sync.place(home.sync.x, home.sync.y);
        layoutWords();
        C = null; V = null; MINI = {};
      }
      /* The shelf caption: under the top shelf on a phone, under the shelf that holds today's globe on a desktop
         (beside the after card, never under the bottom edge). */
      function placeCap() {
        const sl = G.slots; if (!sl.length) return;
        if (G.phone) { capEl.style.left = '50%'; capEl.style.top = Math.round(sl[0].y + sl[0].r * 1.17 + 20) + 'px'; return; }
        const per = Math.ceil(SCENES.length / 2), a = SCN_I < per ? 0 : per, b = Math.min(sl.length - 1, a + per - 1);
        const half = Math.min(G.w / 2 - 8, (capEl.hidden ? 260 : capEl.offsetWidth || 260) / 2);
        capEl.style.left = Math.round(clamp((sl[a].x + sl[b].x) / 2, half + 8, G.w - half - 8)) + 'px';
        capEl.style.top = Math.round(sl[a].y + sl[a].r * 1.17 + 34) + 'px';
      }
      function layoutWords() {
        const R = G.R;
        Object.assign(wordsEl.style, { left: Math.round(G.cx - R * 0.72) + 'px', width: Math.round(R * 1.44) + 'px', top: Math.round(G.cy - R * 0.66) + 'px', height: Math.round(R * 0.92) + 'px' });
      }
      function shelfSlots() {
        const n = SCENES.length;
        if (G.phone) { const r = 20, gap = Math.min(14, (G.w - 24 - n * 2 * r) / (n - 1)), total = n * 2 * r + (n - 1) * gap, x0 = (G.w - total) / 2 + r; return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (2 * r + gap), y: 146, r })); }
        const r = Math.round(clamp(G.R * 0.13, 22, 34)), y = Math.round(G.cy - G.R * 0.12), Wn = G.win, per = Math.ceil(n / 2), sp = 2 * r + Math.round(r * 0.62);
        const lc = Wn.x0 / 2, rc = (Wn.x1 + G.w) / 2;
        return Array.from({ length: n }, (_, i) => { const side = i < per ? 0 : 1, j = i % per; return { x: Math.round((side ? rc : lc) + (j - (per - 1) / 2) * sp), y, r }; });
      }

      /* ---------------- painters ---------------- */
      function off(w, hh) { const d = cv.dpr || 1, c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * d)); c.height = Math.max(1, Math.ceil(hh * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, g, w, h: hh }; }
      function rrect(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      const geo = (Ri) => ({ Ri, k: Ri / 143.25, y0: Ri * 0.47, rx: Ri * 0.885, ry: Ri * 0.205 });

      function paintSky(g, P, sea, mode) {
        const { Ri, y0, ry, k } = P, c = sea[mode];
        let gr = g.createLinearGradient(0, -Ri, 0, y0);
        gr.addColorStop(0, c[0]); gr.addColorStop(0.62, c[1]); gr.addColorStop(1, c[2]);
        g.fillStyle = gr; g.fillRect(-Ri, -Ri, Ri * 2, Ri * 2);
        const rnd = K.rng(29);
        if (mode !== 'day') {
          g.fillStyle = '#fffaf0';
          for (let i = 0; i < 80; i++) { const x = (rnd() - 0.5) * 2 * Ri, y = -Ri + rnd() * Ri * 1.25, b = rnd(); if (x * x + y * y > Ri * Ri * 0.94) continue; g.globalAlpha = (mode === 'night' ? 0.3 : 0.16) + b * 0.55; const s = (b > 0.86 ? 1.7 : 1) * Math.max(0.5, k); g.fillRect(x, y, s, s); }
          g.globalAlpha = 1;
        }
        if (mode === 'night') {
          const mx = Ri * 0.06, my = -Ri * 0.8, mr = Ri * 0.055;
          g.globalAlpha = 0.45; g.drawImage(K.glowSprite('rgba(255, 244, 214, 0.9)'), mx - mr * 5, my - mr * 5, mr * 10, mr * 10); g.globalAlpha = 1;
          g.fillStyle = '#fff4dc'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
          g.fillStyle = 'rgba(206, 188, 160, 0.42)'; [[-0.3, -0.2, 0.24], [0.28, 0.16, 0.18], [-0.04, 0.42, 0.13]].forEach(([u, v, q]) => { g.beginPath(); g.arc(mx + u * mr, my + v * mr, q * mr, 0, TAU); g.fill(); });
        } else if (mode === 'day') {
          g.globalAlpha = 0.55; g.drawImage(K.glowSprite('rgba(255, 250, 225, 0.95)'), Ri * 0.1, -Ri * 0.95, Ri * 0.9, Ri * 0.9); g.globalAlpha = 1;
          g.fillStyle = 'rgba(255, 255, 255, 0.75)';
          [[-0.45, -0.42, 1], [0.38, -0.2, 0.8], [-0.05, -0.68, 0.7]].forEach(([u, v, s]) => { const x = u * Ri, y = v * Ri, r = Ri * 0.1 * s; g.beginPath(); g.ellipse(x, y, r * 2.2, r * 0.7, 0, 0, TAU); g.ellipse(x - r * 0.6, y - r * 0.4, r, r * 0.75, 0, 0, TAU); g.ellipse(x + r * 0.5, y - r * 0.5, r * 1.1, r * 0.85, 0, 0, TAU); g.fill(); });
        } else {
          gr = g.createRadialGradient(0, y0 - ry, 4, 0, y0 - ry, Ri * 1.1); gr.addColorStop(0, 'rgba(255, 200, 140, 0.55)'); gr.addColorStop(1, 'rgba(255, 200, 140, 0)');
          g.fillStyle = gr; g.fillRect(-Ri, -Ri, 2 * Ri, 2 * Ri);
        }
        const nightMix = mode === 'night' ? 0.5 : mode === 'dusk' ? 0.32 : 0;
        const band = (base, col, amp, f, ph) => {
          g.fillStyle = rgba(mixc(hexc(col), hexc(c[0]), nightMix)); g.beginPath(); g.moveTo(-Ri, P.y0 + P.ry);
          for (let x = -Ri; x <= Ri + 4; x += 4) g.lineTo(x, base - amp * (0.55 + 0.45 * Math.sin(x * f + ph)) - amp * 0.35 * Math.sin(x * f * 2.6 + ph * 1.7));
          g.lineTo(Ri, P.y0 + P.ry); g.closePath(); g.fill();
        };
        band(y0 - ry * 0.7, sea.hills[1], 24 * k, 0.021 / k, 1.6);
        // a far-off hamlet on the hillside, a few windows always lit
        const hr = K.rng(61), hb = y0 - ry * 0.7;
        [-0.62, -0.5, -0.41, 0.44, 0.55, 0.68].forEach((u, i) => {
          const x = u * P.rx, f = 0.021 / k, base = hb - 24 * k * (0.55 + 0.45 * Math.sin(x * f + 1.6)) - 24 * k * 0.35 * Math.sin(x * f * 2.6 + 2.72) + 3 * k;
          const w = (5 + hr() * 3) * k, hh = (4 + hr() * 2) * k;
          g.fillStyle = rgba(mixc(hexc(['#e9dcc4', '#c98b74', '#9fb2c7'][i % 3]), hexc(c[0]), nightMix * 0.8)); g.fillRect(x - w / 2, base - hh, w, hh);
          g.fillStyle = rgba(mixc(hexc(sea.snowRoof ? '#f4f8fd' : '#6b4a3a'), hexc(c[0]), nightMix * 0.6)); g.beginPath(); g.moveTo(x - w / 2 - 0.8 * k, base - hh); g.lineTo(x, base - hh - 3.4 * k); g.lineTo(x + w / 2 + 0.8 * k, base - hh); g.closePath(); g.fill();
          if (mode !== 'day' && i % 2 === 0) { g.fillStyle = '#ffd98c'; g.fillRect(x - 0.6 * k, base - hh * 0.62, Math.max(0.6, 1.2 * k), Math.max(0.6, 1.2 * k)); }
        });
        band(y0 - ry * 0.55, sea.hills[0], 13 * k, 0.034 / k, 4.3);
      }
      function paintGround(g, P, sea) {
        const { Ri, y0, rx, ry, k } = P, G0 = hexc(sea.ground[0]), G1 = hexc(sea.ground[1]), G2 = hexc(sea.ground[2]);
        let gr = g.createLinearGradient(0, y0, 0, Ri);
        gr.addColorStop(0, rgba(G1)); gr.addColorStop(0.5, rgba(mixc(G1, G2, 0.6))); gr.addColorStop(1, rgba(G2));
        g.fillStyle = gr; g.beginPath(); g.moveTo(-Ri, y0); g.lineTo(-rx, y0); g.ellipse(0, y0, rx, ry, 0, Math.PI, 0, true); g.lineTo(Ri, y0); g.lineTo(Ri, Ri); g.lineTo(-Ri, Ri); g.closePath(); g.fill();
        // drifts along the front face
        g.fillStyle = rgba(mixc(G1, [255, 255, 255], 0.25), 0.55);
        for (let i = -4; i <= 4; i++) { const x = i * rx * 0.22; g.beginPath(); g.ellipse(x, y0 + ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)) + 7 * k, 16 * k, 4 * k, 0, 0, TAU); g.fill(); }
        gr = g.createLinearGradient(0, y0 - ry, 0, y0 + ry);
        gr.addColorStop(0, rgba(mixc(G0, G1, 0.45))); gr.addColorStop(1, rgba(G0));
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, y0, rx, ry, 0, 0, TAU); g.fill();
        const rnd = K.rng(4);
        for (let i = 0; i < 34; i++) {
          const u = (rnd() - 0.5) * 1.9, v = (rnd() - 0.5) * 1.9; if (u * u + v * v > 0.86) continue;
          g.fillStyle = rgba(i % 2 ? mixc(G0, [255, 255, 255], 0.55) : G1, 0.4); g.beginPath(); g.ellipse(u * rx, y0 + v * ry, (6 + rnd() * 16) * k, (1.4 + rnd() * 2.6) * k, 0, 0, TAU); g.fill();
        }
        if (sea.leafy) {
          for (let i = 0; i < 46; i++) {
            const u = (rnd() - 0.5) * 1.9, v = (rnd() - 0.5) * 1.9; if (u * u + v * v > 0.86) continue;
            const x = u * rx, y = y0 + v * ry, col = sea.key === 'autumn' ? sea.flakes[i % 4] : sea.key === 'spring' ? ['#ffffff', '#ffd2e4', '#fff3a8'][i % 3] : ['#fff6b0', '#ffffff', '#ffb3c8'][i % 3];
            g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.5, 1.1 * k), 0, TAU); g.fill();
          }
        } else {
          g.fillStyle = 'rgba(255, 255, 255, 0.9)';
          for (let i = 0; i < 40; i++) { const u = (rnd() - 0.5) * 1.9, v = (rnd() - 0.5) * 1.9; if (u * u + v * v > 0.86) continue; g.fillRect(u * rx, y0 + v * ry, Math.max(0.5, 0.9 * k), Math.max(0.5, 0.9 * k)); }
        }
        g.strokeStyle = rgba(mixc(G0, [255, 255, 255], 0.7), 0.85); g.lineWidth = Math.max(0.6, 1.4 * k);
        g.beginPath(); g.ellipse(0, y0, rx, ry, 0, 0.12, Math.PI - 0.12); g.stroke();
      }
      function buildVillage(scn, sea, P, night) {
        const rnd = K.rng(scn.seed * 7 + 3);
        const props = [], Vv = { props, windows: [], chimneys: [], lamps: [], extras: {}, night, P };
        const at = (u, v) => ({ x: u * P.rx, y: P.y0 + v * P.ry, s: P.k * (0.94 + 0.22 * (v + 1) / 2) });
        props.push(Object.assign({ t: 'mark', kind: scn.mark, v: -0.56 }, at(scn.markU || 0, -0.56)));
        scn.slots.forEach((si, i) => {
          const [u, v] = HOUSE_SLOTS[si], uu = u + (rnd() - 0.5) * 0.05, vv = v + (rnd() - 0.5) * 0.05;
          props.push(Object.assign({ t: 'house', v: vv, o: { w: 19 + rnd() * 8, h: 13 + rnd() * 6, rh: 9 + rnd() * 5, d: 8 + rnd() * 4, wall: scn.walls[i % scn.walls.length], roof: scn.roofs[i % scn.roofs.length], side: uu < 0 ? 1 : -1, chim: rnd() < 0.8, attic: rnd() < 0.55 } }, at(uu, vv)));
        });
        TREE_SLOTS.forEach(([u, v], i) => {
          if (scn.mark === 'lighthouse' && i === 2) return;
          props.push(Object.assign({ t: 'tree', v, hgt: 20 + rnd() * 13, alt: i }, at(u + (rnd() - 0.5) * 0.05, v)));
        });
        if (scn.pond) props.push(Object.assign({ t: 'pond', v: scn.pond[1], sc: scn.pond[2] }, at(scn.pond[0], scn.pond[1])));
        else props.push(Object.assign({ t: 'pond', v: 0.42, sc: 1 }, at(-0.5, 0.42)));
        if (sea.key === 'winter') props.push(Object.assign({ t: 'snowman', v: 0.5 }, at(0.48, 0.5)));
        else if (sea.key === 'autumn') props.push(Object.assign({ t: 'pumpkins', v: 0.5 }, at(0.46, 0.5)));
        else props.push(Object.assign({ t: 'flowers', v: 0.5 }, at(0.46, 0.5)));
        if (scn.fence) props.push(Object.assign({ t: 'fence', v: -0.2 }, at(-0.08, -0.2)));
        [-0.42, 0.04, 0.5].forEach((u, i) => props.push(Object.assign({ t: 'lamp', v: 0.68 + (i === 1 ? 0.08 : 0) }, at(u, 0.68 + (i === 1 ? 0.08 : 0)))));
        props.sort((a, b) => a.v - b.v);
        return Vv;
      }
      function win(g, cx, cy, w, hh, s, Vv, sk, shape) {
        sk = sk || 0;
        const lw = Math.max(0.4, 0.55 * s);
        g.fillStyle = Vv.night ? '#202a48' : '#5f7898';
        const path = () => {
          g.beginPath();
          if (shape === 'round') g.arc(cx, cy, w / 2, 0, TAU);
          else if (shape === 'arch') { g.moveTo(cx - w / 2, cy + hh / 2); g.lineTo(cx - w / 2, cy - hh / 2 + w / 2); g.arc(cx, cy - hh / 2 + w / 2, w / 2, Math.PI, 0); g.lineTo(cx + w / 2, cy + hh / 2); g.closePath(); }
          else { g.moveTo(cx - w / 2, cy - hh / 2 - sk * w / 2); g.lineTo(cx + w / 2, cy - hh / 2 + sk * w / 2); g.lineTo(cx + w / 2, cy + hh / 2 + sk * w / 2); g.lineTo(cx - w / 2, cy + hh / 2 - sk * w / 2); g.closePath(); }
        };
        path(); g.fill();
        if (!shape) { g.fillStyle = Vv.night ? 'rgba(140, 170, 230, 0.22)' : 'rgba(255, 255, 255, 0.35)'; g.beginPath(); g.moveTo(cx - w / 2, cy - hh / 2 - sk * w / 2); g.lineTo(cx, cy - hh / 2); g.lineTo(cx - w / 2, cy - sk * w / 2); g.closePath(); g.fill(); }
        g.strokeStyle = 'rgba(255, 250, 240, 0.9)'; g.lineWidth = lw; path(); g.stroke();
        if (w > 2.4) { g.beginPath(); g.moveTo(cx, cy - hh / 2); g.lineTo(cx, cy + hh / 2); if (shape !== 'round') { g.moveTo(cx - w / 2, cy - sk * w / 2); g.lineTo(cx + w / 2, cy + sk * w / 2); } g.stroke(); }
        Vv.windows.push({ x: cx, y: cy, w, h: hh, sk, shape: shape || 'rect', d: 0 });
      }
      function drawHouse(g, x, y, s, o, Vv, sea) {
        const W = o.w * s, H = o.h * s, RH = o.rh * s, sd = o.side, D = o.d * s * sd, dy = -o.d * s * 0.42;
        const ex = x + sd * W / 2, wall = hexc(o.wall), roof = hexc(o.roof), dark = mixc(wall, [28, 24, 56], 0.42);
        const ov = 1.6 * s;
        g.fillStyle = 'rgba(40, 40, 80, 0.16)'; g.beginPath(); g.ellipse(x + D * 0.45, y + 0.4 * s, W * 0.6 + Math.abs(D) * 0.45, 2.4 * s, 0, 0, TAU); g.fill();
        g.fillStyle = rgba(dark); g.beginPath(); g.moveTo(ex, y); g.lineTo(ex + D, y + dy); g.lineTo(ex + D, y + dy - H); g.lineTo(ex, y - H); g.closePath(); g.fill();
        g.fillStyle = rgba(wall); g.beginPath(); g.moveTo(x - W / 2, y); g.lineTo(x + W / 2, y); g.lineTo(x + W / 2, y - H); g.lineTo(x, y - H - RH); g.lineTo(x - W / 2, y - H); g.closePath(); g.fill();
        const lit = g.createLinearGradient(x - W / 2, 0, x + W / 2, 0); lit.addColorStop(0, 'rgba(255,255,255,0)'); lit.addColorStop(1, sd > 0 ? 'rgba(255, 240, 220, 0.16)' : 'rgba(30, 20, 60, 0.1)');
        g.fillStyle = lit; g.fill();
        g.fillStyle = rgba(mixc(wall, [60, 50, 80], 0.32)); g.fillRect(x - W / 2, y - 2 * s, W, 2 * s);
        if (!o.nodoor) { const dw = W * 0.2, dh = H * 0.56; g.fillStyle = rgba(mixc(roof, [30, 18, 12], 0.25)); rrect(g, x - dw / 2, y - dh, dw, dh, dw * 0.5); g.fill(); g.fillStyle = '#e8c15a'; g.fillRect(x + dw * 0.22, y - dh * 0.45, Math.max(0.5, s * 0.7), Math.max(0.5, s * 0.7)); }
        if (!o.nowin) [-1, 1].forEach(q => win(g, x + q * W * 0.3, y - H * 0.6, W * 0.17, H * 0.27, s, Vv));
        if (o.attic) win(g, x, y - H - RH * 0.38, RH * 0.28, RH * 0.28, s, Vv, 0, 'round');
        if (Math.abs(D) > 4) win(g, ex + D * 0.5, y + dy * 0.5 - H * 0.6, Math.abs(D) * 0.34, H * 0.27, s, Vv, (dy / Math.abs(D)) * sd);
        const ax = x, ay = y - H - RH;
        g.fillStyle = sea.snowRoof ? '#f2f7fe' : rgba(roof);
        g.beginPath(); g.moveTo(ax, ay - ov * 0.4); g.lineTo(ax + D, ay + dy - ov * 0.4); g.lineTo(ex + D + sd * ov, y - H + dy + ov * 0.6); g.lineTo(ex + sd * ov, y - H + ov * 0.6); g.closePath(); g.fill();
        if (sea.snowRoof) { g.fillStyle = 'rgba(150, 175, 215, 0.35)'; g.beginPath(); g.moveTo(ex + sd * ov, y - H + ov * 0.6); g.lineTo(ex + D + sd * ov, y - H + dy + ov * 0.6); g.lineTo(ex + D + sd * ov * 0.4, y - H + dy - 1.2 * s); g.lineTo(ex + sd * ov * 0.4, y - H - 1.2 * s); g.closePath(); g.fill(); }
        else { g.strokeStyle = 'rgba(0, 0, 0, 0.16)'; g.lineWidth = Math.max(0.4, 0.5 * s); for (let q = 1; q < 4; q++) { const f = q / 4; g.beginPath(); g.moveTo(ax + (ex + sd * ov - ax) * f, ay + (y - H - ay) * f); g.lineTo(ax + D + (ex + sd * ov - ax) * f, ay + dy + (y - H - ay) * f); g.stroke(); } }
        if (o.chim) {
          const bx = ax + (ex - ax) * 0.42 + D * 0.58, by = ay + (y - H - ay) * 0.42 + dy * 0.58;
          const cw = Math.max(1.2, W * 0.12), chh = RH * 0.62;
          g.fillStyle = '#8c5a48'; g.fillRect(bx - cw / 2, by - chh, cw, chh + 1);
          g.fillStyle = 'rgba(0, 0, 0, 0.18)'; g.fillRect(bx, by - chh, cw / 2, chh + 1);
          g.fillStyle = sea.snowRoof ? '#ffffff' : '#5a3b30'; g.fillRect(bx - cw * 0.66, by - chh - 1.3 * s, cw * 1.32, 1.6 * s);
          Vv.chimneys.push({ x: bx, y: by - chh - 1.6 * s });
        }
        g.lineJoin = 'round'; g.lineCap = 'round';
        const fx = x - sd * (W / 2 + ov);
        g.strokeStyle = rgba(mixc(roof, [0, 0, 0], 0.18)); g.lineWidth = Math.max(0.7, 2 * s);
        g.beginPath(); g.moveTo(fx, y - H + ov * 0.6); g.lineTo(ax, ay - ov * 0.4); g.lineTo(ex + sd * ov, y - H + ov * 0.6); g.stroke();
        if (sea.snowRoof) {
          g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(0.7, 1.7 * s);
          g.beginPath(); g.moveTo(fx, y - H + ov * 0.6 - 1.3 * s); g.lineTo(ax, ay - ov * 0.4 - 1.3 * s); g.lineTo(ex + sd * ov, y - H + ov * 0.6 - 1.3 * s); g.stroke();
          g.fillStyle = 'rgba(250, 252, 255, 0.96)'; g.beginPath(); g.ellipse(x + D * 0.3, y + 0.2 * s, W * 0.62 + Math.abs(D) * 0.3, 2.2 * s, 0, Math.PI, TAU); g.fill();
        }
      }
      function drawPine(g, x, y, s, hgt, sea, alt) {
        const H = hgt * s, W = H * 0.6;
        g.fillStyle = 'rgba(30, 30, 70, 0.16)'; g.beginPath(); g.ellipse(x + 2 * s, y + 0.5 * s, W * 0.45, 2 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#5a3d2c'; g.fillRect(x - 1.3 * s, y - 4 * s, 2.6 * s, 4.6 * s);
        for (let i = 0; i < 3; i++) {
          const by = y - 3 * s - i * H * 0.26, tw = W * (1 - i * 0.25) / 2, th = H * 0.46;
          g.fillStyle = (i + alt) % 2 ? sea.tree[1] : sea.tree[0];
          g.beginPath(); g.moveTo(x - tw, by); g.quadraticCurveTo(x, by + 2 * s, x + tw, by); g.lineTo(x, by - th); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255, 255, 255, 0.1)'; g.beginPath(); g.moveTo(x, by - th); g.lineTo(x + tw, by); g.lineTo(x + tw * 0.4, by + 0.6 * s); g.closePath(); g.fill();
          if (sea.snowRoof) {
            g.fillStyle = 'rgba(250, 252, 255, 0.96)'; g.beginPath(); g.moveTo(x - tw, by);
            for (let q = 0; q <= 6; q++) { const f = q / 6, px = x - tw + tw * 2 * f; g.quadraticCurveTo(px - tw / 6, by + 1.6 * s, px, by - (q % 2 ? 1.6 : 0.4) * s); }
            g.lineTo(x + tw * 0.55, by - th * 0.45); g.lineTo(x, by - th * 0.62); g.lineTo(x - tw * 0.55, by - th * 0.45); g.closePath(); g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
          }
        }
      }
      function drawRoundTree(g, x, y, s, hgt, sea, alt) {
        const H = hgt * s, r = H * 0.28, cols = sea.tree;
        g.fillStyle = 'rgba(30, 30, 70, 0.16)'; g.beginPath(); g.ellipse(x + 2 * s, y + 0.5 * s, r * 1.2, 2 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#6a4a35'; g.fillRect(x - 1.3 * s, y - H * 0.5, 2.6 * s, H * 0.5 + 0.5 * s);
        const cy = y - H * 0.62, c0 = cols[alt % cols.length], c1 = cols[(alt + 1) % cols.length];
        [[-0.55, 0.18, 0.8, c1], [0.55, 0.15, 0.82, c1], [0, -0.32, 0.95, c0], [-0.25, 0.1, 0.9, c0], [0.3, 0.05, 0.85, c0]].forEach(([u, v, sc, c]) => { g.fillStyle = c; g.beginPath(); g.arc(x + u * r, cy + v * r, r * sc * 0.72, 0, TAU); g.fill(); });
        g.fillStyle = 'rgba(255, 255, 255, 0.22)'; g.beginPath(); g.arc(x - r * 0.25, cy - r * 0.45, r * 0.38, 0, TAU); g.fill();
        if (sea.key === 'spring') { g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const a = i * 2.4 + alt, rr2 = r * (0.3 + (i % 3) * 0.2); g.beginPath(); g.arc(x + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * 0.8, Math.max(0.5, 0.8 * s), 0, TAU); g.fill(); } }
      }
      function drawMark(g, p, Vv, sea) {
        const s = p.s, x = p.x, y = p.y, snow = sea.snowRoof;
        const tile = (c) => (snow ? '#eef4fc' : c);
        if (p.kind === 'chapel') {
          drawHouse(g, x + 7 * s, y - 1 * s, s, { w: 28, h: 16, rh: 13, d: 22, wall: '#f2ece0', roof: '#5b3a2c', side: 1, chim: false, nodoor: true, nowin: true }, Vv, sea);
          const tw = 12 * s, th = 31 * s, tx = x - 5 * s;
          g.fillStyle = '#c9c2b4'; g.beginPath(); g.moveTo(tx + tw / 2, y); g.lineTo(tx + tw / 2 + 4 * s, y - 2 * s); g.lineTo(tx + tw / 2 + 4 * s, y - th - 2 * s); g.lineTo(tx + tw / 2, y - th); g.closePath(); g.fill();
          g.fillStyle = '#f6f1e6'; g.fillRect(tx - tw / 2, y - th, tw, th);
          win(g, tx, y - th + 8 * s, 5 * s, 8 * s, s, Vv, 0, 'arch'); Vv.extras.bell = { x: tx, y: y - th + 8 * s };
          win(g, tx, y - th * 0.5, 3.6 * s, 6 * s, s, Vv, 0, 'arch');
          g.fillStyle = '#6b4130'; g.beginPath(); g.moveTo(tx - 2.6 * s, y); g.lineTo(tx - 2.6 * s, y - 5 * s); g.arc(tx, y - 5 * s, 2.6 * s, Math.PI, 0); g.lineTo(tx + 2.6 * s, y); g.closePath(); g.fill();
          g.fillStyle = tile('#40536f'); g.beginPath(); g.moveTo(tx - tw / 2 - 1.2 * s, y - th); g.lineTo(tx, y - th - 25 * s); g.lineTo(tx + tw / 2 + 1.2 * s, y - th); g.closePath(); g.fill();
          g.fillStyle = 'rgba(0, 0, 0, 0.16)'; g.beginPath(); g.moveTo(tx, y - th - 25 * s); g.lineTo(tx + tw / 2 + 1.2 * s, y - th); g.lineTo(tx + 1 * s, y - th); g.closePath(); g.fill();
          g.strokeStyle = '#e8c15a'; g.lineWidth = Math.max(0.6, 1.1 * s); g.beginPath(); g.moveTo(tx, y - th - 25 * s); g.lineTo(tx, y - th - 31 * s); g.moveTo(tx - 2 * s, y - th - 29 * s); g.lineTo(tx + 2 * s, y - th - 29 * s); g.stroke();
        } else if (p.kind === 'lighthouse') {
          drawHouse(g, x + 13 * s, y + 1 * s, s * 0.85, { w: 20, h: 12, rh: 9, d: 9, wall: '#efe5d4', roof: '#7d3029', side: 1, chim: true }, Vv, sea);
          const hgt = 60 * s, b0 = 9 * s, b1 = 6 * s;
          g.save(); g.beginPath(); g.moveTo(x - b0, y); g.lineTo(x - b1, y - hgt); g.lineTo(x + b1, y - hgt); g.lineTo(x + b0, y); g.closePath(); g.clip();
          for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#c94a3f' : '#f6f1e8'; g.fillRect(x - b0, y - hgt + i * hgt / 6, b0 * 2, hgt / 6 + 0.5); }
          const sh = g.createLinearGradient(x - b0, 0, x + b0, 0); sh.addColorStop(0, 'rgba(0,0,0,0.22)'); sh.addColorStop(0.55, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)');
          g.fillStyle = sh; g.fillRect(x - b0, y - hgt, b0 * 2, hgt);
          g.restore();
          win(g, x, y - hgt * 0.42, 2.8 * s, 4 * s, s, Vv); win(g, x, y - hgt * 0.72, 2.6 * s, 3.6 * s, s, Vv);
          g.fillStyle = '#3a3f4a'; g.fillRect(x - 8 * s, y - hgt - 1.6 * s, 16 * s, 2.2 * s);
          g.fillStyle = Vv.night ? '#5e6f8f' : '#cfe3ef'; g.fillRect(x - 5 * s, y - hgt - 9 * s, 10 * s, 7.4 * s);
          g.strokeStyle = '#3a3f4a'; g.lineWidth = Math.max(0.5, 0.7 * s); g.strokeRect(x - 5 * s, y - hgt - 9 * s, 10 * s, 7.4 * s);
          g.fillStyle = '#c94a3f'; g.beginPath(); g.ellipse(x, y - hgt - 9 * s, 6.2 * s, 4.6 * s, 0, Math.PI, TAU); g.fill();
          if (snow) { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y - hgt - 10.6 * s, 4.4 * s, 2.4 * s, 0, Math.PI, TAU); g.fill(); }
          g.fillStyle = '#3a3f4a'; g.fillRect(x - 0.5 * s, y - hgt - 16 * s, 1 * s, 3 * s);
          Vv.extras.beam = { x, y: y - hgt - 5.3 * s, s };
        } else if (p.kind === 'clock') {
          const tw = 17 * s, th = 64 * s, d = 7 * s;
          g.fillStyle = '#a8977c'; g.beginPath(); g.moveTo(x + tw / 2, y); g.lineTo(x + tw / 2 + d, y - d * 0.4); g.lineTo(x + tw / 2 + d, y - th - d * 0.4); g.lineTo(x + tw / 2, y - th); g.closePath(); g.fill();
          g.fillStyle = '#ddcfb7'; g.fillRect(x - tw / 2, y - th, tw, th);
          g.strokeStyle = 'rgba(90, 70, 50, 0.22)'; g.lineWidth = Math.max(0.4, 0.6 * s);
          for (let q = 1; q < 9; q++) { const yy = y - q * th / 9; g.beginPath(); g.moveTo(x - tw / 2, yy); g.lineTo(x + tw / 2, yy); g.stroke(); }
          win(g, x, y - th * 0.32, 4 * s, 7 * s, s, Vv, 0, 'arch'); win(g, x, y - th * 0.55, 3.4 * s, 5.6 * s, s, Vv, 0, 'arch');
          g.fillStyle = '#6b4130'; g.beginPath(); g.moveTo(x - 3 * s, y); g.lineTo(x - 3 * s, y - 5.5 * s); g.arc(x, y - 5.5 * s, 3 * s, Math.PI, 0); g.lineTo(x + 3 * s, y); g.closePath(); g.fill();
          const fy = y - th * 0.8, fr = 6.4 * s;
          g.fillStyle = '#3c3a44'; g.beginPath(); g.arc(x, fy, fr + 1.2 * s, 0, TAU); g.fill();
          g.fillStyle = '#fbf6ea'; g.beginPath(); g.arc(x, fy, fr, 0, TAU); g.fill();
          const dt0 = new Date(), hr = (dt0.getHours() % 12 + dt0.getMinutes() / 60) / 12 * TAU, mn = dt0.getMinutes() / 60 * TAU;
          g.strokeStyle = '#2b2733'; g.lineCap = 'round'; g.lineWidth = Math.max(0.6, 1.1 * s);
          g.beginPath(); g.moveTo(x, fy); g.lineTo(x + Math.sin(hr) * fr * 0.5, fy - Math.cos(hr) * fr * 0.5); g.moveTo(x, fy); g.lineTo(x + Math.sin(mn) * fr * 0.78, fy - Math.cos(mn) * fr * 0.78); g.stroke();
          Vv.extras.clock = { x, y: fy, r: fr };
          g.fillStyle = tile('#4f8a7a'); g.beginPath(); g.moveTo(x - tw / 2 - 1.5 * s, y - th); g.lineTo(x, y - th - 20 * s); g.lineTo(x + tw / 2 + 1.5 * s, y - th); g.closePath(); g.fill();
          g.fillStyle = tile('#3d6c60'); g.beginPath(); g.moveTo(x + tw / 2 + 1.5 * s, y - th); g.lineTo(x, y - th - 20 * s); g.lineTo(x + tw / 2 + d, y - th - d * 0.4); g.closePath(); g.fill();
          g.fillStyle = '#e8c15a'; g.beginPath(); g.arc(x, y - th - 21 * s, Math.max(0.6, 1.2 * s), 0, TAU); g.fill();
        } else if (p.kind === 'windmill') {
          const hgt = 44 * s, b0 = 13 * s, b1 = 7.5 * s;
          g.fillStyle = '#b9ab95'; g.beginPath(); g.moveTo(x + b0, y); g.lineTo(x + b0 + 4 * s, y - 1.6 * s); g.lineTo(x + b1 + 3 * s, y - hgt - 1.2 * s); g.lineTo(x + b1, y - hgt); g.closePath(); g.fill();
          const gr = g.createLinearGradient(x - b0, 0, x + b0, 0); gr.addColorStop(0, '#d9ccb6'); gr.addColorStop(0.6, '#f3ebdc'); gr.addColorStop(1, '#e2d6c2');
          g.fillStyle = gr; g.beginPath(); g.moveTo(x - b0, y); g.lineTo(x - b1, y - hgt); g.lineTo(x + b1, y - hgt); g.lineTo(x + b0, y); g.closePath(); g.fill();
          g.fillStyle = '#6b4130'; g.beginPath(); g.moveTo(x - 3 * s, y); g.lineTo(x - 3 * s, y - 6 * s); g.arc(x, y - 6 * s, 3 * s, Math.PI, 0); g.lineTo(x + 3 * s, y); g.closePath(); g.fill();
          win(g, x, y - hgt * 0.5, 3.4 * s, 4.6 * s, s, Vv); win(g, x - 4.5 * s, y - hgt * 0.22, 2.8 * s, 3.8 * s, s, Vv);
          g.fillStyle = tile('#5b3a2c'); g.beginPath(); g.ellipse(x, y - hgt, b1 + 2.5 * s, 9 * s, 0, Math.PI, TAU); g.fill();
          Vv.extras.hub = { x, y: y - hgt - 2 * s, len: 30 * s, s };
        } else if (p.kind === 'castle') {
          const ww = 40 * s, wh = 22 * s;
          g.fillStyle = '#a69c8e'; g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2 + 6 * s, y - 2.4 * s); g.lineTo(x + ww / 2 + 6 * s, y - wh - 2.4 * s); g.lineTo(x + ww / 2, y - wh); g.closePath(); g.fill();
          g.fillStyle = '#d8d0c2'; g.fillRect(x - ww / 2, y - wh, ww, wh);
          g.strokeStyle = 'rgba(80, 70, 60, 0.2)'; g.lineWidth = Math.max(0.4, 0.5 * s);
          for (let q = 1; q < 6; q++) { g.beginPath(); g.moveTo(x - ww / 2, y - q * wh / 6); g.lineTo(x + ww / 2, y - q * wh / 6); g.stroke(); }
          g.fillStyle = '#d8d0c2'; for (let q = 0; q < 7; q++) if (q % 2 === 0) g.fillRect(x - ww / 2 + q * ww / 7, y - wh - 3.4 * s, ww / 7, 3.6 * s);
          if (snow) { g.fillStyle = '#ffffff'; for (let q = 0; q < 7; q++) if (q % 2 === 0) g.fillRect(x - ww / 2 + q * ww / 7, y - wh - 4.2 * s, ww / 7, 1.2 * s); }
          win(g, x, y - 6 * s, 9 * s, 12 * s, s, Vv, 0, 'arch'); Vv.extras.gate = { x, y: y - 6 * s };
          [-1, 1].forEach(q => {
            const tx = x + q * ww / 2, tw = 12 * s, th = 38 * s;
            const tg = g.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0); tg.addColorStop(0, '#b9b0a2'); tg.addColorStop(0.55, '#e6dfd2'); tg.addColorStop(1, '#a69c8e');
            g.fillStyle = tg; g.fillRect(tx - tw / 2, y - th, tw, th);
            win(g, tx, y - th * 0.55, 3 * s, 5 * s, s, Vv, 0, 'arch'); win(g, tx, y - th * 0.25, 2.6 * s, 4 * s, s, Vv, 0, 'arch');
            g.fillStyle = tile(q < 0 ? '#5a4a8e' : '#9e3b3b'); g.beginPath(); g.moveTo(tx - tw / 2 - 1.6 * s, y - th); g.lineTo(tx, y - th - 17 * s); g.lineTo(tx + tw / 2 + 1.6 * s, y - th); g.closePath(); g.fill();
            g.strokeStyle = '#3a3a44'; g.lineWidth = Math.max(0.5, 0.7 * s); g.beginPath(); g.moveTo(tx, y - th - 17 * s); g.lineTo(tx, y - th - 23 * s); g.stroke();
            g.fillStyle = q < 0 ? '#ffd36b' : '#7fd8ff'; g.beginPath(); g.moveTo(tx, y - th - 23 * s); g.lineTo(tx + 5 * s, y - th - 21.5 * s); g.lineTo(tx, y - th - 20 * s); g.closePath(); g.fill();
          });
        } else if (p.kind === 'observatory') {
          drawHouse(g, x, y, s, { w: 30, h: 15, rh: 0.1, d: 12, wall: '#e6e0d4', roof: '#6b7c95', side: 1, chim: false, nodoor: false }, Vv, sea);
          const dr = 15 * s, dyy = y - 15 * s;
          const dg = g.createLinearGradient(x - dr, 0, x + dr, 0); dg.addColorStop(0, '#8c9bb3'); dg.addColorStop(0.45, '#e9eef6'); dg.addColorStop(1, '#7a879d');
          g.fillStyle = snow ? '#f4f8fd' : dg; g.beginPath(); g.ellipse(x, dyy, dr, dr * 0.92, 0, Math.PI, TAU); g.fill();
          g.strokeStyle = 'rgba(60, 70, 90, 0.35)'; g.lineWidth = Math.max(0.4, 0.6 * s); g.beginPath(); g.ellipse(x, dyy, dr, dr * 0.92, 0, Math.PI, TAU); g.stroke();
          g.fillStyle = Vv.night ? '#1d2440' : '#43506a'; g.beginPath(); g.moveTo(x - 2.6 * s, dyy); g.lineTo(x - 1.4 * s, dyy - dr * 0.9); g.lineTo(x + 2.4 * s, dyy - dr * 0.88); g.lineTo(x + 2.6 * s, dyy); g.closePath(); g.fill();
          g.strokeStyle = '#c9a24a'; g.lineWidth = Math.max(0.8, 2.2 * s); g.beginPath(); g.moveTo(x, dyy - dr * 0.4); g.lineTo(x + 8 * s, dyy - dr * 1.25); g.stroke();
          Vv.extras.scope = { x: x + 10 * s, y: dyy - dr * 1.45, s };
        }
      }
      function drawProp(g, p, Vv, sea) {
        const s = p.s;
        if (p.t === 'house') drawHouse(g, p.x, p.y, s, p.o, Vv, sea);
        else if (p.t === 'tree') { if (sea.leafy && p.alt % 3 !== 1) drawRoundTree(g, p.x, p.y, s, p.hgt * 0.9, sea, p.alt); else drawPine(g, p.x, p.y, s, p.hgt, sea.leafy ? Object.assign({}, sea, { tree: ['#2f6e52', '#245a43'], snowRoof: false }) : sea, p.alt); }
        else if (p.t === 'mark') drawMark(g, p, Vv, sea);
        else if (p.t === 'pond') {
          const rx = 17 * s * p.sc, ry = 5.4 * s * p.sc;
          g.fillStyle = sea.snowRoof ? '#bcd6ee' : '#4f8fc0'; g.beginPath(); g.ellipse(p.x, p.y, rx, ry, 0, 0, TAU); g.fill();
          g.strokeStyle = sea.snowRoof ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)'; g.lineWidth = Math.max(0.5, 0.9 * s);
          g.beginPath(); g.ellipse(p.x - rx * 0.2, p.y - ry * 0.2, rx * 0.5, ry * 0.3, 0, 3.6, 5.4); g.stroke();
          g.beginPath(); g.moveTo(p.x + rx * 0.1, p.y + ry * 0.2); g.lineTo(p.x + rx * 0.5, p.y + ry * 0.05); g.stroke();
        } else if (p.t === 'snowman') {
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x, p.y - 3.4 * s, 3.6 * s, 0, TAU); g.fill(); g.beginPath(); g.arc(p.x, p.y - 8.4 * s, 2.5 * s, 0, TAU); g.fill();
          g.fillStyle = 'rgba(150, 170, 210, 0.45)'; g.beginPath(); g.arc(p.x + 1.2 * s, p.y - 2.8 * s, 2.6 * s, -0.6, 1.6); g.fill();
          g.fillStyle = '#2b2733'; g.fillRect(p.x - 2 * s, p.y - 12 * s, 4 * s, 1 * s); g.fillRect(p.x - 1.4 * s, p.y - 14.6 * s, 2.8 * s, 2.8 * s);
          g.fillStyle = '#f08a3c'; g.beginPath(); g.moveTo(p.x + 0.6 * s, p.y - 8.4 * s); g.lineTo(p.x + 3.6 * s, p.y - 8 * s); g.lineTo(p.x + 0.6 * s, p.y - 7.6 * s); g.closePath(); g.fill();
          g.fillStyle = '#c94a3f'; g.fillRect(p.x - 2.4 * s, p.y - 6.4 * s, 4.8 * s, 1.2 * s);
        } else if (p.t === 'pumpkins') {
          [[0, 0, 2.6], [4.2, 0.8, 2], [-3.6, 1, 1.7]].forEach(([dx, dy, r]) => { g.fillStyle = '#e8822f'; g.beginPath(); g.ellipse(p.x + dx * s, p.y + dy * s - r * s * 0.7, r * s * 1.2, r * s * 0.85, 0, 0, TAU); g.fill(); g.fillStyle = '#4f7a3a'; g.fillRect(p.x + dx * s - 0.3 * s, p.y + dy * s - r * s * 1.6, 0.8 * s, 1 * s); });
        } else if (p.t === 'flowers') {
          for (let i = 0; i < 9; i++) { const a = i * 2.39, r = (i % 4) * 1.6 * s; g.fillStyle = ['#ff8fb1', '#ffd36b', '#ffffff', '#b79bff'][i % 4]; g.beginPath(); g.arc(p.x + Math.cos(a) * r * 1.8, p.y + Math.sin(a) * r * 0.6, Math.max(0.6, 1.1 * s), 0, TAU); g.fill(); }
        } else if (p.t === 'fence') {
          g.strokeStyle = sea.snowRoof ? '#8a6a52' : '#9a7656'; g.lineWidth = Math.max(0.5, 0.9 * s);
          g.beginPath(); for (let q = -6; q <= 6; q++) { const fx = p.x + q * 3 * s; g.moveTo(fx, p.y); g.lineTo(fx, p.y - 4.4 * s); } g.moveTo(p.x - 18 * s, p.y - 2.6 * s); g.lineTo(p.x + 18 * s, p.y - 2.6 * s); g.stroke();
          if (sea.snowRoof) { g.strokeStyle = '#ffffff'; g.beginPath(); g.moveTo(p.x - 18 * s, p.y - 3.2 * s); g.lineTo(p.x + 18 * s, p.y - 3.2 * s); g.stroke(); }
        } else if (p.t === 'lamp') {
          g.fillStyle = '#2d2a36'; g.fillRect(p.x - 0.5 * s, p.y - 13 * s, 1 * s, 13 * s); g.fillRect(p.x - 1.6 * s, p.y - 0.8 * s, 3.2 * s, 0.9 * s);
          g.fillStyle = Vv.night ? '#56607a' : '#e9e3cf'; g.fillRect(p.x - 1.5 * s, p.y - 16 * s, 3 * s, 3 * s);
          g.fillStyle = '#2d2a36'; g.beginPath(); g.moveTo(p.x - 2.2 * s, p.y - 16 * s); g.lineTo(p.x, p.y - 18 * s); g.lineTo(p.x + 2.2 * s, p.y - 16 * s); g.closePath(); g.fill();
          if (sea.snowRoof) { g.fillStyle = '#ffffff'; g.fillRect(p.x - 1.8 * s, p.y - 18.6 * s, 3.6 * s, 0.9 * s); }
          Vv.lamps.push({ x: p.x, y: p.y - 14.5 * s, s });
        }
      }
      function trackPt(P, u) { const a = Math.PI - 0.34 - u * (Math.PI - 0.68); return { x: Math.cos(a) * P.rx * 0.94, y: P.y0 + Math.sin(a) * P.ry * 0.94, a }; }
      function paintTrack(g, P, sea) {
        const k = P.k;
        g.lineCap = 'round';
        g.strokeStyle = sea.snowRoof ? 'rgba(120, 100, 90, 0.5)' : 'rgba(110, 80, 60, 0.55)'; g.lineWidth = Math.max(0.8, 2 * k);
        for (let q = 0; q <= 36; q++) { const p0 = trackPt(P, q / 36), nx = -Math.cos(p0.a), ny = -Math.sin(p0.a) * 0.4, l = 3.4 * k; g.beginPath(); g.moveTo(p0.x - nx * l, p0.y - ny * l); g.lineTo(p0.x + nx * l, p0.y + ny * l); g.stroke(); }
        [-2.1, 2.1].forEach(off2 => { g.strokeStyle = '#6f7484'; g.lineWidth = Math.max(0.5, 0.9 * k); g.beginPath(); for (let q = 0; q <= 48; q++) { const p0 = trackPt(P, q / 48), x = p0.x - Math.cos(p0.a) * off2 * k, y = p0.y - Math.sin(p0.a) * off2 * k * 0.4; if (q) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); });
      }
      function paintTunnels(g, P, sea) {
        const k = P.k, G0 = hexc(sea.ground[0]), G1 = hexc(sea.ground[1]);
        [0, 1].forEach(u => {
          const p0 = trackPt(P, u), side = u ? 1 : -1, mx = p0.x + side * 7 * k, my = p0.y + 1 * k;
          g.fillStyle = rgba(mixc(G1, G0, 0.4)); g.beginPath(); g.ellipse(mx, my, 15 * k, 12 * k, 0, Math.PI, TAU); g.fill();
          g.fillStyle = rgba(G0, 0.9); g.beginPath(); g.ellipse(mx - 2 * k, my - 7 * k, 10 * k, 4.6 * k, 0, Math.PI, TAU); g.fill();
          const px = p0.x - side * 1 * k;
          g.fillStyle = '#8f8678'; g.beginPath(); g.moveTo(px - 6 * k, my); g.lineTo(px - 6 * k, my - 6 * k); g.arc(px, my - 6 * k, 6 * k, Math.PI, 0); g.lineTo(px + 6 * k, my); g.closePath(); g.fill();
          g.fillStyle = '#17131f'; g.beginPath(); g.moveTo(px - 4 * k, my); g.lineTo(px - 4 * k, my - 6 * k); g.arc(px, my - 6 * k, 4 * k, Math.PI, 0); g.lineTo(px + 4 * k, my); g.closePath(); g.fill();
        });
      }
      function paintVillage(gB, gF, P, Vv, sea, night) {
        paintGround(gB, P, sea);
        Vv.props.forEach(p => drawProp(p.v < 0 ? gB : gF, p, Vv, sea));
        paintTrack(gF, P, sea);
        if (night) [gB, gF].forEach(g => { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(10, 16, 52, 0.3)'; g.fillRect(-P.Ri, -P.Ri, 2 * P.Ri, 2 * P.Ri); g.restore(); });
      }
      function paintGlass(g, R, D, mini) {
        g.save();
        g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
        let gr = g.createRadialGradient(-R * 0.16, -R * 0.2, R * 0.2, 0, 0, R);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0)'); gr.addColorStop(1, D ? 'rgba(6, 10, 30, 0.42)' : 'rgba(40, 60, 100, 0.24)');
        g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R);
        gr = g.createRadialGradient(0, 0, R * 0.84, 0, 0, R);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.78, 'rgba(220,235,255,0.08)'); gr.addColorStop(1, 'rgba(235,245,255,0.6)');
        g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R);
        g.beginPath(); g.arc(0, 0, R * 0.95, 0, TAU); g.arc(R * 0.1, R * 0.12, R * 0.95, 0, TAU, true);
        gr = g.createLinearGradient(-R * 0.9, -R * 0.9, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fill('evenodd');
        if (!mini) {
          g.save(); g.translate(R * 0.43, -R * 0.45); g.rotate(0.42);
          const ww = R * 0.24, wh = R * 0.3;
          g.beginPath(); g.moveTo(-ww / 2, -wh / 2); g.quadraticCurveTo(0, -wh / 2 - wh * 0.14, ww / 2, -wh / 2); g.lineTo(ww * 0.44, wh / 2); g.quadraticCurveTo(0, wh / 2 + wh * 0.1, -ww * 0.44, wh / 2); g.closePath();
          gr = g.createLinearGradient(0, -wh / 2, 0, wh / 2); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0.1)');
          g.fillStyle = gr; g.fill();
          g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(-ww / 2, -R * 0.012, ww, R * 0.024); g.fillRect(-R * 0.012, -wh / 2 - 6, R * 0.024, wh + 12);
          g.restore();
          g.strokeStyle = D ? 'rgba(255, 206, 150, 0.4)' : 'rgba(255, 236, 200, 0.6)'; g.lineCap = 'round';
          g.lineWidth = R * 0.05; g.beginPath(); g.arc(0, 0, R * 0.9, 0.16 * Math.PI, 0.4 * Math.PI); g.stroke();
          g.lineWidth = R * 0.015; g.strokeStyle = 'rgba(255, 245, 225, 0.75)'; g.beginPath(); g.arc(0, 0, R * 0.92, 0.2 * Math.PI, 0.34 * Math.PI); g.stroke();
          g.strokeStyle = 'rgba(205, 228, 255, 0.28)'; g.lineWidth = R * 0.03; g.beginPath(); g.arc(0, 0, R * 0.92, 0.9 * Math.PI, 1.14 * Math.PI); g.stroke();
        }
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(255, 255, 255, 0.5)'; g.lineWidth = R * 0.045; g.beginPath(); g.arc(0, 0, R * 0.86, 1.13 * Math.PI, 1.3 * Math.PI); g.stroke();
        g.strokeStyle = 'rgba(255, 255, 255, 0.85)'; g.lineWidth = R * 0.016; g.beginPath(); g.arc(0, 0, R * 0.86, 1.15 * Math.PI, 1.26 * Math.PI); g.stroke();
        g.restore();
        g.strokeStyle = 'rgba(255, 255, 255, 0.55)'; g.lineWidth = Math.max(0.8, R * 0.009); g.beginPath(); g.arc(0, 0, R - 0.5, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(0, 0, 0, 0.18)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R - 2, 0, TAU); g.stroke();
      }
      function paintBase(g, R, D, label) {
        const yc = R * 0.7, rx = R * 0.72, ry = R * 0.13, band = R * 0.075, bot = R * 1.18;
        const body = () => {
          g.beginPath(); g.moveTo(-rx, yc); g.ellipse(0, yc, rx, ry, 0, Math.PI, 0, true);
          g.bezierCurveTo(rx * 0.99, yc + R * 0.12, rx * 0.86, yc + R * 0.15, rx * 0.88, yc + R * 0.23);
          g.bezierCurveTo(rx * 0.92, yc + R * 0.31, R * 0.86, yc + R * 0.34, R * 0.88, yc + R * 0.4);
          g.lineTo(R * 0.88, bot - R * 0.05); g.ellipse(0, bot - R * 0.05, R * 0.88, R * 0.06, 0, 0, Math.PI, false);
          g.lineTo(-R * 0.88, yc + R * 0.4);
          g.bezierCurveTo(-R * 0.86, yc + R * 0.34, -rx * 0.92, yc + R * 0.31, -rx * 0.88, yc + R * 0.23);
          g.bezierCurveTo(-rx * 0.86, yc + R * 0.15, -rx * 0.99, yc + R * 0.12, -rx, yc);
          g.closePath();
        };
        body();
        let gr = g.createLinearGradient(-R * 0.9, 0, R * 0.9, 0);
        if (D) { gr.addColorStop(0, '#1f120b'); gr.addColorStop(0.3, '#4a2c1b'); gr.addColorStop(0.62, '#7a4b2e'); gr.addColorStop(0.78, '#a06a42'); gr.addColorStop(1, '#2a180e'); }
        else { gr.addColorStop(0, '#5a3720'); gr.addColorStop(0.3, '#8a5a36'); gr.addColorStop(0.62, '#b37c4c'); gr.addColorStop(0.78, '#d29a64'); gr.addColorStop(1, '#5c3a22'); }
        g.fillStyle = gr; g.fill();
        g.save(); body(); g.clip();
        g.strokeStyle = 'rgba(30, 14, 6, 0.22)'; g.lineWidth = Math.max(0.5, R * 0.006);
        for (let i = -9; i <= 9; i++) { const x = i * R * 0.095; g.beginPath(); g.moveTo(x, yc); g.bezierCurveTo(x * 0.9, yc + R * 0.18, x * 1.1, yc + R * 0.3, x * 1.18, bot); g.stroke(); }
        g.fillStyle = 'rgba(255, 220, 170, 0.16)'; g.beginPath(); g.ellipse(0, yc + R * 0.235, rx * 0.88, R * 0.05, 0, 0, Math.PI); g.lineTo(-rx * 0.88, yc + R * 0.25); g.ellipse(0, yc + R * 0.25, rx * 0.88, R * 0.05, 0, Math.PI, 0, true); g.fill();
        g.strokeStyle = 'rgba(255, 225, 180, 0.35)'; g.lineWidth = Math.max(0.6, R * 0.008); g.beginPath(); g.ellipse(0, yc + R * 0.4, R * 0.875, R * 0.07, 0, 0.08, Math.PI - 0.08); g.stroke();
        g.restore();
        g.beginPath(); g.moveTo(-rx, yc); g.ellipse(0, yc, rx, ry, 0, Math.PI, 0, true); g.lineTo(rx * 0.995, yc + band); g.ellipse(0, yc + band, rx * 0.995, ry, 0, 0, Math.PI, false); g.closePath();
        gr = g.createLinearGradient(-rx, 0, rx, 0); gr.addColorStop(0, '#7a5a1e'); gr.addColorStop(0.35, '#d9b25a'); gr.addColorStop(0.62, '#fff0b0'); gr.addColorStop(0.8, '#c9982f'); gr.addColorStop(1, '#6b4c16');
        g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(255, 248, 210, 0.75)'; g.lineWidth = Math.max(0.6, R * 0.008); g.beginPath(); g.ellipse(0, yc, rx, ry, 0, 0.05, Math.PI - 0.05); g.stroke();
        if (label != null) {
          const pw = R * 0.58, ph = R * 0.11, px = -pw / 2, py = yc + R * 0.27;
          rrect(g, px, py, pw, ph, ph * 0.3);
          gr = g.createLinearGradient(px, py, px + pw, py + ph); gr.addColorStop(0, '#a77d2a'); gr.addColorStop(0.45, '#f5dc8e'); gr.addColorStop(1, '#a8802c');
          g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(70, 44, 10, 0.55)'; g.lineWidth = 1; g.stroke();
          const fs = Math.max(7, R * 0.058);
          g.font = '700 ' + fs.toFixed(1) + 'px ' + SERIF; g.textAlign = 'center'; g.textBaseline = 'middle';
          const txt = label.toUpperCase(); let tw = g.measureText(txt).width; const sc = Math.min(1, (pw - 10) / Math.max(1, tw));
          g.save(); g.translate(0, py + ph / 2 + 0.5); g.scale(sc, 1);
          g.fillStyle = 'rgba(255, 246, 210, 0.6)'; g.fillText(txt, 0, 0.8); g.fillStyle = '#4a2e0c'; g.fillText(txt, 0, 0);
          g.restore();
          [px + ph * 0.32, px + pw - ph * 0.32].forEach(sx => { g.fillStyle = '#6b4c16'; g.beginPath(); g.arc(sx, py + ph / 2, Math.max(0.8, R * 0.008), 0, TAU); g.fill(); });
        }
      }
      function paintRoom(g) {
        const { w, H, R, cx, cy, phone } = G, D = K.dark(), Wn = G.win;
        let gr = g.createLinearGradient(0, 0, 0, G.tableY);
        gr.addColorStop(0, D ? '#120c22' : '#f2e8d4'); gr.addColorStop(1, D ? '#2a1c3c' : '#e4d4b8');
        g.fillStyle = gr; g.fillRect(0, 0, w, G.tableY + 2);
        g.fillStyle = D ? 'rgba(255, 220, 240, 0.05)' : 'rgba(130, 96, 60, 0.08)';
        const step = phone ? 26 : 32;
        for (let y = step / 2, row = 0; y < G.tableY; y += step, row++) for (let x = (row % 2 ? step / 2 : 0); x < w + step; x += step) { g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + 3, y); g.lineTo(x, y + 3); g.lineTo(x - 3, y); g.closePath(); g.fill(); }
        // the window behind the globe: tonight's snowfall outside
        const xc = (Wn.x0 + Wn.x1) / 2, r = (Wn.x1 - Wn.x0) / 2, ya = Wn.y0 + r;
        const winPath = (ins) => { g.beginPath(); g.moveTo(Wn.x0 + ins, Wn.y1); g.lineTo(Wn.x0 + ins, ya); g.arc(xc, ya, r - ins, Math.PI, 0); g.lineTo(Wn.x1 - ins, Wn.y1); g.closePath(); };
        g.save(); winPath(9); g.clip();
        gr = g.createLinearGradient(0, Wn.y0, 0, Wn.y1);
        if (D) { gr.addColorStop(0, '#081028'); gr.addColorStop(0.6, '#1a2c58'); gr.addColorStop(1, '#3a4d7c'); } else { gr.addColorStop(0, '#9ec2e6'); gr.addColorStop(0.65, '#d4e6f5'); gr.addColorStop(1, '#f2f6fa'); }
        g.fillStyle = gr; g.fillRect(Wn.x0, Wn.y0, Wn.x1 - Wn.x0, Wn.y1 - Wn.y0);
        const rnd = K.rng(13);
        if (D) {
          g.fillStyle = '#fffaf0'; for (let i = 0; i < 70; i++) { g.globalAlpha = 0.25 + rnd() * 0.6; g.fillRect(Wn.x0 + rnd() * (Wn.x1 - Wn.x0), Wn.y0 + rnd() * (Wn.y1 - Wn.y0) * 0.6, 1.2, 1.2); } g.globalAlpha = 1;
          // the moon outside only where it can't sit on the rim of the glass (the globe has its own moon)
          const mx = Wn.x0 + (Wn.x1 - Wn.x0) * 0.8, my = Wn.y0 + r * 0.42;
          if (Math.hypot(mx - cx, my - cy) > R + 46) { g.globalAlpha = 0.5; g.drawImage(K.glowSprite('rgba(255, 244, 214, 0.9)'), mx - 60, my - 60, 120, 120); g.globalAlpha = 1; g.fillStyle = '#fbf3df'; g.beginPath(); g.arc(mx, my, 13, 0, TAU); g.fill(); }
        }
        else { g.fillStyle = 'rgba(255, 255, 255, 0.8)'; [[0.22, 0.3, 1], [0.7, 0.18, 0.8]].forEach(([u, v, s]) => { const x = Wn.x0 + u * (Wn.x1 - Wn.x0), y = Wn.y0 + v * (Wn.y1 - Wn.y0); g.beginPath(); g.ellipse(x, y, 46 * s, 13 * s, 0, 0, TAU); g.ellipse(x - 14 * s, y - 8 * s, 20 * s, 14 * s, 0, 0, TAU); g.ellipse(x + 12 * s, y - 9 * s, 24 * s, 16 * s, 0, 0, TAU); g.fill(); }); }
        const roofY = Wn.y1 - (phone ? 90 : 120);
        const houses = []; { let x = Wn.x0 - 10; const rs = K.rng(7); while (x < Wn.x1 + 30) { const bw = 26 + rs() * 40, bh = 16 + rs() * 46; houses.push({ x, bw, top: roofY + 30 - bh, lit: rs() < 0.6 }); x += bw; } }
        g.fillStyle = D ? '#0b1226' : '#8ea3bd';
        g.beginPath(); g.moveTo(Wn.x0, Wn.y1);
        houses.forEach(b => { g.lineTo(b.x, b.top + 12); g.lineTo(b.x + b.bw * 0.5, b.top); g.lineTo(b.x + b.bw, b.top + 12); });
        g.lineTo(Wn.x1, Wn.y1); g.closePath(); g.fill();
        houses.forEach(b => {
          g.fillStyle = D ? 'rgba(200, 214, 240, 0.85)' : '#ffffff';
          g.beginPath(); g.moveTo(b.x, b.top + 12); g.lineTo(b.x + b.bw * 0.5, b.top); g.lineTo(b.x + b.bw, b.top + 12); g.lineTo(b.x + b.bw, b.top + 15); g.lineTo(b.x + b.bw * 0.5, b.top + 4); g.lineTo(b.x, b.top + 15); g.closePath(); g.fill();
          if (D && b.lit) { g.fillStyle = '#ffd98c'; g.fillRect(b.x + b.bw * 0.4, b.top + 20, 3, 4); }
        });
        g.restore();
        g.lineJoin = 'round';
        g.strokeStyle = D ? '#35264a' : '#ffffff'; g.lineWidth = 18; winPath(0); g.stroke();
        g.strokeStyle = D ? 'rgba(0, 0, 0, 0.35)' : 'rgba(120, 96, 70, 0.22)'; g.lineWidth = 2; winPath(9); g.stroke();
        g.strokeStyle = D ? 'rgba(255, 220, 190, 0.14)' : 'rgba(255, 255, 255, 0.9)'; g.lineWidth = 1.5; winPath(-9); g.stroke();
        // warm lamp light from the right
        gr = g.createRadialGradient(w * 0.95, G.tableY - R * 0.8, 10, w * 0.95, G.tableY - R * 0.8, Math.max(w, H) * 0.8);
        gr.addColorStop(0, D ? 'rgba(255, 186, 120, 0.3)' : 'rgba(255, 236, 200, 0.45)'); gr.addColorStop(1, 'rgba(255, 186, 120, 0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
        if (!phone) {
          [[G.slots[0].x - G.slots[0].r * 1.6, G.slots[2].x + G.slots[2].r * 1.6], [G.slots[3].x - G.slots[3].r * 1.6, G.slots[5].x + G.slots[5].r * 1.6]].forEach(([a, b]) => paintPlank(g, a, b, G.slots[0].y + G.slots[0].r * 1.17, D));
        }
        const ty = G.tableY;
        if (phone) {
          // on a phone the table runs to the bottom of the screen: planks run toward you and the cast stands on it
          const top = ty - R * 0.14, vy = top - H * 1.5, at = (xb, y) => cx + (xb - cx) * (y - vy) / (H - vy);
          gr = g.createLinearGradient(0, top, 0, H);
          gr.addColorStop(0, D ? '#6b4731' : '#e6c49a'); gr.addColorStop(0.3, D ? '#53351f' : '#d8ad7e'); gr.addColorStop(1, D ? '#22140b' : '#a9794b');
          g.fillStyle = gr; g.fillRect(0, top, w, H - top);
          const pw = w / 3.6, seams = [];
          for (let xb = cx - pw * 6.5; xb <= cx + pw * 6.5; xb += pw) seams.push(xb);
          seams.forEach((xb, i) => {
            if (i === seams.length - 1) return;
            const xb2 = seams[i + 1];
            g.fillStyle = i % 2 ? (D ? 'rgba(255, 220, 180, 0.035)' : 'rgba(255, 250, 240, 0.12)') : (D ? 'rgba(0, 0, 0, 0.07)' : 'rgba(120, 70, 30, 0.05)');
            g.beginPath(); g.moveTo(at(xb, top), top); g.lineTo(at(xb2, top), top); g.lineTo(xb2, H); g.lineTo(xb, H); g.closePath(); g.fill();
            g.strokeStyle = D ? 'rgba(20, 8, 2, 0.22)' : 'rgba(120, 76, 40, 0.16)'; g.lineWidth = 0.8;
            [0.27, 0.55, 0.8].forEach((f, q) => {
              const xg = xb + (xb2 - xb) * f; g.beginPath();
              for (let y = top; y <= H + 12; y += 12) { const x = at(xg, y) + Math.sin(y * 0.045 + i * 1.7 + q * 2.3) * 1.3 * (y - vy) / (H - vy); if (y === top) g.moveTo(x, y); else g.lineTo(x, y); }
              g.stroke();
            });
          });
          g.strokeStyle = D ? 'rgba(10, 4, 0, 0.55)' : 'rgba(96, 60, 30, 0.34)'; g.lineWidth = 1.3;
          seams.forEach(xb => { g.beginPath(); g.moveTo(at(xb, top), top); g.lineTo(xb, H); g.stroke(); });
          g.fillStyle = D ? 'rgba(255, 214, 170, 0.2)' : 'rgba(255, 250, 238, 0.75)'; g.fillRect(0, top, w, 1.5);
          g.fillStyle = 'rgba(0, 0, 0, 0.16)'; g.fillRect(0, top + 1.5, w, 3);
        } else {
          // a deep windowsill with the wainscot below
          const depth = R * 0.26;
          gr = g.createLinearGradient(0, ty - depth * 0.3, 0, ty + depth);
          gr.addColorStop(0, D ? '#5b3b28' : '#dcb68c'); gr.addColorStop(1, D ? '#3c2619' : '#c5986b');
          g.fillStyle = gr; g.fillRect(0, ty - depth * 0.3, w, depth * 1.3);
          g.strokeStyle = D ? 'rgba(20, 10, 4, 0.25)' : 'rgba(120, 80, 40, 0.18)'; g.lineWidth = 1;
          const rg = K.rng(3);
          for (let i = 0; i < 14; i++) { const yy = ty - depth * 0.2 + rg() * depth * 1.1; g.beginPath(); g.moveTo(0, yy); for (let xx = 0; xx <= w + 40; xx += 40) g.lineTo(xx, yy + Math.sin(xx * 0.02 + i) * 1.4); g.stroke(); }
          const fy = ty + depth;
          gr = g.createLinearGradient(0, fy, 0, H);
          gr.addColorStop(0, D ? '#2f1d14' : '#a97b52'); gr.addColorStop(1, D ? '#120a06' : '#7f593b');
          g.fillStyle = gr; g.fillRect(0, fy, w, H - fy);
          g.fillStyle = D ? 'rgba(255, 210, 160, 0.22)' : 'rgba(255, 245, 225, 0.6)'; g.fillRect(0, fy, w, 2);
          g.fillStyle = 'rgba(0, 0, 0, 0.18)'; g.fillRect(0, fy + 2, w, 5);
          g.strokeStyle = D ? 'rgba(0, 0, 0, 0.3)' : 'rgba(80, 50, 25, 0.22)';
          for (let xx = (w % 120) / 2; xx < w; xx += 120) { g.beginPath(); g.moveTo(xx, fy + 8); g.lineTo(xx, H); g.stroke(); }
        }
        // the lamp's warm pool on the wood around the globe
        gr = g.createRadialGradient(cx + R * 0.25, ty + R * 0.12, R * 0.1, cx + R * 0.25, ty + R * 0.12, R * (phone ? 1.5 : 1.9));
        gr.addColorStop(0, D ? 'rgba(255, 190, 120, 0.2)' : 'rgba(255, 246, 222, 0.42)'); gr.addColorStop(1, 'rgba(255, 190, 120, 0)');
        g.fillStyle = gr; g.fillRect(0, ty - R * 0.3, w, H - ty + R * 0.3);
        // where the cast stands: soft contact shadows on the wood
        const sz = phone ? 72 : 100, sh = K.glowSprite('rgba(10, 4, 0, 0.75)');
        [home.still, home.sync].forEach(p => { g.globalAlpha = D ? 0.75 : 0.42; g.drawImage(sh, p.x + sz * 0.08, p.y + sz * 0.9, sz * 0.84, sz * 0.2); });
        g.globalAlpha = 1;
        gr = g.createRadialGradient(cx, cy, R * 1.25, cx, cy, Math.max(w, H) * 0.85);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, D ? 'rgba(4, 2, 12, 0.55)' : 'rgba(70, 50, 20, 0.16)');
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
      }
      function paintPlank(g, a, b, y, D) {
        g.fillStyle = 'rgba(0, 0, 0, 0.25)'; g.fillRect(a + 4, y + 8, b - a - 8, 6);
        const gr = g.createLinearGradient(0, y, 0, y + 9); gr.addColorStop(0, D ? '#8a5a3a' : '#c8946a'); gr.addColorStop(1, D ? '#4a2e1c' : '#8f6240');
        g.fillStyle = gr; rrect(g, a, y, b - a, 9, 2.5); g.fill();
        g.fillStyle = 'rgba(255, 230, 190, 0.3)'; g.fillRect(a + 2, y + 1, b - a - 4, 1.4);
        [a + 18, b - 18].forEach(bx => { g.fillStyle = D ? '#3a2416' : '#7a5236'; g.beginPath(); g.moveTo(bx - 3, y + 9); g.lineTo(bx + 3, y + 9); g.lineTo(bx - 1, y + 24); g.closePath(); g.fill(); });
      }
      /* Everything inside the glass is pre-clipped to the sphere when cached, so a frame never needs a clip region,
         and the front layer is cropped to where its props are (cheap blits on devices without a GPU). */
      const circ = (g, Ri) => { g.beginPath(); g.arc(0, 0, Ri, 0, TAU); g.clip(); };
      function buildCaches() {
        const D = K.dark(), R = G.R, Ri = G.Ri, P = geo(Ri);
        V = buildVillage(SCN, SEA, P, D);
        const room = off(G.w, G.H); paintRoom(room.g);
        const fTop = Math.floor(P.y0 - 62 * P.k);
        const vB = off(Ri * 2, Ri * 2), vF = off(Ri * 2, Ri - fTop), tmp = off(Ri * 2, Ri * 2), tmpF = off(Ri * 2, Ri * 2);
        [vB, tmp, tmpF].forEach(o => o.g.translate(Ri, Ri));
        circ(vB.g, Ri);
        paintSky(vB.g, P, SEA, D ? 'night' : 'day');
        paintVillage(tmp.g, tmpF.g, P, V, SEA, D);
        vB.g.drawImage(tmp.c, -Ri, -Ri, 2 * Ri, 2 * Ri);
        vF.g.translate(Ri, -fTop); circ(vF.g, Ri); vF.g.drawImage(tmpF.c, -Ri, -Ri, 2 * Ri, 2 * Ri); vF.top = fTop;
        const pad = Math.ceil(R * 0.06), glass = off(2 * (R + pad), 2 * (R + pad)); glass.g.translate(R + pad, R + pad); paintGlass(glass.g, R, D); glass.pad = pad;
        const base = off(R * 2, R * 0.75); base.g.translate(R, -R * 0.5); paintBase(base.g, R, D, SCN.name); base.ox = R; base.oy = R * 0.5;
        const haze = off(Ri * 2, Ri * 2); { const hg = haze.g; hg.translate(Ri, Ri); circ(hg, Ri); const gr = hg.createRadialGradient(0, -Ri * 0.1, Ri * 0.1, 0, 0, Ri); gr.addColorStop(0, rgba(SEA.haze, 0.95)); gr.addColorStop(0.75, rgba(SEA.haze, 0.6)); gr.addColorStop(1, rgba(SEA.haze, 0.25)); hg.fillStyle = gr; hg.fillRect(-Ri, -Ri, 2 * Ri, 2 * Ri); }
        const inner = off(Ri * 2, Ri * 2); { const ig = inner.g; ig.translate(Ri, Ri); circ(ig, Ri); const gr = ig.createRadialGradient(0, P.y0, Ri * 0.05, 0, P.y0 * 0.4, Ri * 1.05); gr.addColorStop(0, 'rgba(255, 200, 120, 0.85)'); gr.addColorStop(0.55, 'rgba(255, 180, 100, 0.3)'); gr.addColorStop(1, 'rgba(255, 170, 90, 0)'); ig.fillStyle = gr; ig.fillRect(-Ri, -Ri, 2 * Ri, 2 * Ri); }
        const halo = off(R * 4.2, R * 4.2); { const hg = halo.g, gr = hg.createRadialGradient(R * 2.1, R * 2.1, R * 0.6, R * 2.1, R * 2.1, R * 2.1); gr.addColorStop(0, 'rgba(255, 200, 120, 0.85)'); gr.addColorStop(0.45, 'rgba(255, 190, 110, 0.35)'); gr.addColorStop(1, 'rgba(255, 190, 110, 0)'); hg.fillStyle = gr; hg.fillRect(0, 0, R * 4.2, R * 4.2); }
        C = { room, vB, vF, vBd: null, glass, base, haze, inner, halo, P };
        // light order for the finale: a wave outward from the landmark
        const m = V.props.find(p => p.t === 'mark') || { x: 0, y: 0 };
        V.windows.forEach(wd => { wd.d = Math.hypot(wd.x - m.x, (wd.y - m.y) * 1.6) / (Ri * 1.2) * 1.8; });
        V.lamps.forEach((l, i) => { l.d = 1.9 + i * 0.25; });
      }
      function duskCache() {
        if (C.vBd) return C.vBd;
        const Ri = G.Ri, P = C.P, o = off(Ri * 2, Ri * 2), tmp = off(Ri * 2, Ri * 2);
        o.g.translate(Ri, Ri); tmp.g.translate(Ri, Ri); circ(o.g, Ri);
        paintSky(o.g, P, SEA, 'dusk');
        const V2 = buildVillage(SCN, SEA, P, false), junk = off(Ri * 2, Ri * 2); junk.g.translate(Ri, Ri);
        paintVillage(tmp.g, junk.g, P, V2, SEA, false);
        o.g.drawImage(tmp.c, -Ri, -Ri, 2 * Ri, 2 * Ri);
        C.vBd = o; return o;
      }
      let MINI = {};
      function mini(i, sk) {
        const r = G.slots.length ? G.slots[0].r : 20, D = K.dark(), key = i + ':' + sk + ':' + r + ':' + D;
        if (MINI[key]) return MINI[key];
        const sea = SEASONS.find(x => x.key === sk) || SEA, Ri = r * 0.955, P = geo(Ri);
        const o = off(r * 2.3, r * 2.6), g = o.g, vv = off(Ri * 2, Ri * 2), vf = off(Ri * 2, Ri * 2);
        vv.g.translate(Ri, Ri); vf.g.translate(Ri, Ri);
        const Vm = buildVillage(SCENES[i], sea, P, D);
        paintVillage(vv.g, vf.g, P, Vm, sea, D);
        g.translate(r * 1.15, r * 1.15);
        g.save(); g.beginPath(); g.arc(0, 0, Ri, 0, TAU); g.clip();
        paintSky(g, P, sea, D ? 'night' : 'day');
        g.drawImage(vv.c, -Ri, -Ri, 2 * Ri, 2 * Ri); g.drawImage(vf.c, -Ri, -Ri, 2 * Ri, 2 * Ri);
        g.fillStyle = '#ffd98c'; Vm.windows.forEach(wd => { if (wd.w > 0.8) g.fillRect(wd.x - wd.w / 2, wd.y - wd.h / 2, wd.w, wd.h); });
        g.restore();
        paintGlass(g, r, D, true); paintBase(g, r, D, null);
        o.r = r; MINI[key] = o; return o;
      }

      /* ---------------- snow (or petals, glitter, leaves): real drag, drift and settling ---------------- */
      const NF = Math.round([230, 340, 460][inten] * (RED ? 0.7 : 1));
      const F = { x: new Float32Array(NF), y: new Float32Array(NF), vx: new Float32Array(NF), vy: new Float32Array(NF), z: new Float32Array(NF), s: new Float32Array(NF), vt: new Float32Array(NF),
        rot: new Float32Array(NF), vr: new Float32Array(NF), ph: new Float32Array(NF), fr: new Float32Array(NF), jit: new Float32Array(NF), st: new Uint8Array(NF), ci: new Uint8Array(NF) };
      const KIND = SEA.flake, NCOL = SEA.flakes.length;
      const FLUT = { snow: 9, petal: 24, glitter: 5, leaf: 28 }[KIND], VT = { snow: [15, 34], petal: [11, 24], glitter: [26, 46], leaf: [16, 30] }[KIND];
      function initFlakes() {
        const rnd = K.rng(77 + DAY % 97);
        for (let i = 0; i < NF; i++) {
          const sz = rnd();
          F.s[i] = sz; F.vt[i] = VT[0] + (VT[1] - VT[0]) * sz; F.z[i] = 0.07 + rnd() * 0.86; F.ph[i] = rnd() * TAU; F.fr[i] = 1.4 + rnd() * 1.8; F.rot[i] = rnd() * TAU; F.vr[i] = (rnd() - 0.5) * 5;
          F.ci[i] = Math.floor(rnd() * NCOL); F.jit[i] = rnd() * 2.4 - 0.6; F.st[i] = 1;
        }
      }
      initFlakes();
      function restFlakes() { // all lying at the bottom, as a globe looks on a shelf
        const P = geo(G.Ri), rnd = K.rng(5);
        for (let i = 0; i < NF; i++) {
          const v = 2 * F.z[i] - 1, half = P.rx * Math.sqrt(Math.max(0, 1 - v * v)) * 0.96;
          F.x[i] = (rnd() * 2 - 1) * half; F.y[i] = P.y0 + v * P.ry + F.jit[i] * G.k; F.vx[i] = F.vy[i] = 0; F.st[i] = 1;
        }
      }
      let flakesPlaced = false;
      function flakesStep(dt, t) {
        const k = G.k, Ri = G.Ri, P = C.P, lim = Ri - 2.5 * k, lim2 = lim * lim, iR = 1 / Ri, tf = 0.028 / k;
        const still = phase === 'still1' || phase === 'still2';
        let grav = 1;
        if (still) grav = finger.down ? (BR.on && BR.phase === 'out' ? 1.55 : 1.15) : 0.9;
        if (still && PR.p > 1) grav += (PR.p - 1) * 8;
        if (still && PR.boost > 0) grav += 1.4 + PR.boost * 3;
        if (phase === 'settled1' || phase === 'finale' || phase === 'end') grav = 1.8;
        const relax = 1 - Math.exp(-dt * 2.4), S = FL.S, T = FL.T, ux0 = FL.ux, uy0 = FL.uy, land2 = (60 * k) * (60 * k);
        let air = 0;
        for (let i = 0; i < NF; i++) {
          if (F.st[i]) continue;
          air++;
          const x = F.x[i], y = F.y[i];
          let ux = -S * y * iR + ux0, uy = S * x * iR + uy0;
          if (T > 0.5) { const a = x * tf, b = y * tf; ux += T * (Math.sin(b * 1.1 + t * 1.3) + 0.6 * Math.sin((a + b) * 0.8 - t * 0.9)); uy += T * 0.8 * (Math.cos(a * 1.05 - t * 1.1) + 0.6 * Math.cos((a - b) * 0.7 + t * 0.7)); }
          const fl = FLUT * k * Math.sin(t * F.fr[i] + F.ph[i]);
          F.vx[i] += (ux + fl - F.vx[i]) * relax;
          F.vy[i] += (uy + F.vt[i] * k * grav - F.vy[i]) * relax;
          let nx2 = x + F.vx[i] * dt, ny2 = y + F.vy[i] * dt;
          const r2 = nx2 * nx2 + ny2 * ny2;
          if (r2 > lim2) { const r = Math.sqrt(r2), nx = nx2 / r, ny = ny2 / r; nx2 = nx * lim; ny2 = ny * lim; const vn = F.vx[i] * nx + F.vy[i] * ny; if (vn > 0) { F.vx[i] -= vn * nx * 1.6; F.vy[i] -= vn * ny * 1.6; } }
          const v = 2 * F.z[i] - 1, half = P.rx * Math.sqrt(Math.max(0, 1 - v * v)), fy = P.y0 + v * P.ry;
          if (ny2 >= fy) {
            // off the edge of the village the flake slides down the glass and onto the snow at the rim
            if (Math.abs(nx2) > half * 0.97) { nx2 = Math.sign(nx2) * half * 0.97; }
            if (ux * ux + uy * uy < land2 || grav > 2) { F.st[i] = 1; ny2 = fy + F.jit[i] * k; F.vx[i] = 0; F.vy[i] = 0; air--; }
            else { ny2 = fy; if (F.vy[i] > 0) F.vy[i] *= -0.3; }
          }
          F.x[i] = nx2; F.y[i] = ny2;
          F.rot[i] += F.vr[i] * dt;
        }
        airFrac = air / NF;
      }
      function liftFlakes(frac, power, dvx) {
        const k = G.k;
        for (let i = 0; i < NF; i++) {
          if (!F.st[i] || Math.random() > frac) continue;
          F.st[i] = 0; F.vy[i] = -power * k * (0.45 + Math.random() * 0.9); F.vx[i] = (Math.random() - 0.5) * power * k * 0.9 - (dvx || 0) * 0.4; F.y[i] -= 2 * k;
        }
      }
      function drawFlakes(g, layer, t) {
        const k = G.k, z0 = layer === 0 ? -1 : layer === 1 ? 0.34 : 0.64, z1 = layer === 0 ? 0.34 : layer === 1 ? 0.64 : 2;
        const base = layer === 0 ? 0.55 : layer === 1 ? 0.78 : 1, alpha = layer === 0 ? 0.6 : layer === 1 ? 0.82 : 0.95;
        for (let c = 0; c < NCOL; c++) {
          g.fillStyle = SEA.flakes[c]; g.globalAlpha = alpha; g.beginPath();
          let any = false;
          for (let i = 0; i < NF; i++) {
            const z = F.z[i]; if (z < z0 || z >= z1 || F.ci[i] !== c) continue;
            const x = F.x[i], y = F.y[i], r = (1 + F.s[i] * 1.7) * k * base * (0.7 + z * 0.55), rest = F.st[i];
            if (KIND === 'snow') { if (rest) { g.moveTo(x + r * 1.2, y); g.ellipse(x, y, r * 1.2, r * 0.55, 0, 0, TAU); } else { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } }
            else if (KIND === 'glitter') { const a = rest ? 0.2 : F.rot[i], q = r * 1.1; g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); g.lineTo(x + Math.cos(a + 1.57) * q * 0.8, y + Math.sin(a + 1.57) * q * 0.8); g.lineTo(x - Math.cos(a) * q, y - Math.sin(a) * q); g.lineTo(x - Math.cos(a + 1.57) * q * 0.8, y - Math.sin(a + 1.57) * q * 0.8); g.closePath(); }
            else { const L = KIND === 'leaf' ? 1.7 : 1.35, W2 = KIND === 'leaf' ? 0.6 : 0.75, fl = rest ? 0.5 : 0.3 + 0.7 * Math.abs(Math.sin(F.rot[i] * 0.7 + F.ph[i])), ro = rest ? 0.1 : F.rot[i]; g.moveTo(x + Math.cos(ro) * r * L, y + Math.sin(ro) * r * L); g.ellipse(x, y, r * L, Math.max(0.3, r * W2 * fl), ro, 0, TAU); }
            any = true;
          }
          if (any) g.fill();
        }
        if (layer === 2 && KIND === 'glitter') {
          const spr = K.glowSprite('rgba(255, 246, 200, 0.95)');
          for (let i = 0; i < NF; i += 3) { if (F.z[i] < 0.64) continue; const tw = Math.sin(t * 6 + F.ph[i] * 3); if (tw < 0.82) continue; const r = (4 + F.s[i] * 4) * k; g.globalAlpha = (tw - 0.82) * 4; g.drawImage(spr, F.x[i] - r, F.y[i] - r, r * 2, r * 2); }
        }
        if (layer === 2 && KIND === 'snow' && !RED) {
          const spr = K.glowSprite('rgba(255, 255, 255, 0.7)');
          for (let i = 0; i < NF; i += 9) { if (F.st[i] || F.z[i] < 0.86) continue; const r = (3 + F.s[i] * 3) * k; g.globalAlpha = 0.35; g.drawImage(spr, F.x[i] - r, F.y[i] - r, r * 2, r * 2); }
        }
        g.globalAlpha = 1;
      }

      /* ---------------- the thought letters ---------------- */
      const letters = [];
      let LS = {}, letterPx = 16;
      function letterSprite(ch) {
        let s = LS[ch]; if (s) return s;
        const fs = letterPx, pad = Math.ceil(fs * 0.3), w = Math.ceil(fs * 1.05) + pad * 2, hh = Math.ceil(fs * 1.3) + pad * 2;
        const o = off(w, hh), g = o.g;
        g.font = '700 ' + fs + 'px ' + SERIF; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.lineWidth = Math.max(2.2, fs * 0.22); g.strokeStyle = 'rgba(34, 18, 52, 0.94)'; g.strokeText(ch, w / 2, hh / 2 + fs * 0.05);
        g.fillStyle = SEA.letter; g.fillText(ch, w / 2, hh / 2 + fs * 0.05);
        s = LS[ch] = o; return s;
      }
      try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (S.destroyed) return; LS = {}; if (C) C.base = null; C = null; }); } catch (e) { /* no font api */ }
      function shatter(dvx, dvy) {
        if (shattered) return;
        shattered = true;
        const rr0 = el.getBoundingClientRect(), sc = rr0.width / (el.offsetWidth || rr0.width) || 1;
        const range = document.createRange();
        const gx = G.cx + GL.ox, gy = G.cy + GL.oy, k = G.k, rnd = Math.random;
        let fsz = 16;
        wordEls.forEach((wEl, gi) => {
          fsz = parseFloat(getComputedStyle(wEl).fontSize) || fsz;
          const walker = document.createTreeWalker(wEl, NodeFilter.SHOW_TEXT);
          let node, ci = 0;
          const gl = (wEl.textContent || '').length;
          while ((node = walker.nextNode())) {
            const txt = node.data;
            for (let i = 0; i < txt.length; i++, ci++) {
              const ch = txt[i]; if (ch === ' ' || ch === ' ') continue;
              range.setStart(node, i); range.setEnd(node, i + 1);
              const r = range.getBoundingClientRect(); if (!r.width) continue;
              const x = (r.left - rr0.left + r.width / 2) / sc - gx, y = (r.top - rr0.top + r.height / 2) / sc - gy;
              letters.push({ ch: ch.toUpperCase(), g: gi, ci, gl, x, y, vx: -dvx * 0.5 + (rnd() - 0.5) * 140 * k, vy: -dvy * 0.5 - rnd() * 120 * k, z: 0.7 + rnd() * 0.25, rot: (rnd() - 0.5) * 0.3, vr: (rnd() - 0.5) * 7, flip: 0, vf: (rnd() - 0.5) * 9, st: 1, d: 0, heavy: false, tx: 0 });
            }
          }
        });
        letterPx = Math.round(fsz); LS = {};
        wordsEl.classList.add('sg-gone');
        PG.emit('star', 0, -G.R * 0.3, 18, { colors: ['#ffffff', SEA.letter, '#fff1c4'], speed: [60, 200] });
        if (au()) { A.paper({ vol: 0.12 }); tink(1.2); }
      }
      function lettersStep(dt, t) {
        const k = G.k, Ri = G.Ri, P = C.P, iR = 1 / Ri, lim = Ri - Math.max(8 * k, letterPx * 0.8), lim2 = lim * lim, tf = 0.028 / k;
        const relax = 1 - Math.exp(-dt * 1.7);
        const still = phase === 'still1' || phase === 'still2';
        const grav = still && finger.down ? (BR.on && BR.phase === 'out' ? 1.4 : 1.1) : 1;
        for (const L of letters) {
          if (L.st === 1) {
            let ux = -FL.S * L.y * iR + FL.ux, uy = FL.S * L.x * iR + FL.uy;
            if (FL.T > 0.5) { const a = L.x * tf, b = L.y * tf; ux += FL.T * (Math.sin(b * 1.1 + t * 1.3) + 0.6 * Math.sin((a + b) * 0.8 - t * 0.9)); uy += FL.T * 0.8 * (Math.cos(a * 1.05 - t * 1.1) + 0.6 * Math.cos((a - b) * 0.7 + t * 0.7)); }
            const vt = (L.heavy ? 62 : 24) * k * grav;
            L.vx += (ux * (L.heavy ? 0.4 : 1) - L.vx) * relax; L.vy += (uy * (L.heavy ? 0.4 : 1) + vt - L.vy) * relax;
            if (L.heavy) { L.vy += 70 * k * dt; L.vx += ((L.tx - L.x) * 3.2 - L.vx * 0.8) * dt; }
            L.x += L.vx * dt; L.y += L.vy * dt;
            const r2 = L.x * L.x + L.y * L.y;
            if (r2 > lim2) { const r = Math.sqrt(r2), nx = L.x / r, ny = L.y / r; L.x = nx * lim; L.y = ny * lim; const vn = L.vx * nx + L.vy * ny; if (vn > 0) { L.vx -= vn * nx * 1.5; L.vy -= vn * ny * 1.5; } }
            const v = 2 * L.z - 1, half = P.rx * Math.sqrt(Math.max(0, 1 - v * v)) * 0.86, fy = P.y0 + v * P.ry;
            if (L.y >= fy) {
              const sp2 = ux * ux + uy * uy;
              if (L.heavy || sp2 < (50 * k) * (50 * k)) {
                L.st = 2; L.y = fy; L.x = L.heavy ? L.tx : clamp(L.x, -half, half); L.rest = L.heavy ? 0 : (Math.random() - 0.5) * 0.5;
                landTick(); PG.emit('snow', L.x, L.y - 2 * k, 3, { colors: [SEA.flakes[0]], speed: [10, 34], angle: -Math.PI / 2, spread: 1.6 });
              } else { L.y = fy; if (L.vy > 0) L.vy *= -0.35; }
            }
            L.rot += L.vr * dt; L.vr *= Math.exp(-dt * 0.4); L.vr += (Math.random() - 0.5) * FL.T * 0.004;
            L.flip += L.vf * dt * (0.4 + Math.min(1, agit * 2));
          } else if (L.st === 2) {
            L.rot += (L.rest - L.rot) * Math.min(1, dt * 5);
            L.flip += (Math.round(L.flip / Math.PI) * Math.PI - L.flip) * Math.min(1, dt * 5);
          } else if (L.st === 3) {
            L.d += dt / 1.5;
            if (L.d >= 1) L.st = 4;
          }
        }
      }
      function drawLetters(g) {
        for (const L of letters) {
          if (L.st === 0 || L.st === 4) continue;
          const spr = letterSprite(L.ch), lying = L.st >= 2;
          const cf = Math.cos(L.flip), ls = lying && L.ls ? L.ls : 1, sx = lying ? 0.94 * ls : (Math.abs(cf) < 0.16 ? (cf < 0 ? -0.16 : 0.16) : cf);
          let sy = lying ? 0.62 * ls : 1, a = 1;
          const d = L.st === 3 ? clamp(L.d, 0, 1) : 0;
          if (d > 0) { a = 1 - d; sy *= 1 - d * 0.6; }
          g.save(); g.translate(L.x, L.y - (lying ? spr.h * 0.16 * sy : 0)); g.rotate(L.rot); g.scale(sx, sy);
          g.globalAlpha = a * (sx < 0 ? 0.78 : 1);
          g.drawImage(spr.c, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
          g.restore();
        }
        g.globalAlpha = 1;
      }
      /* A sinking thought gathers itself and lies down in the snow as a readable line, then melts into it. */
      function sinkGroup(gi) {
        const P = C.P, z = 0.8 + (gi % 2) * 0.06, v = 2 * z - 1, half = P.rx * Math.sqrt(Math.max(0, 1 - v * v)) * 0.9;
        letters.forEach(L => {
          if (L.g !== gi || L.st >= 3) return;
          const sp = Math.min(letterPx * 0.72, (2 * half) / Math.max(1, L.gl));
          L.tx = (L.ci - (L.gl - 1) / 2) * sp; L.z = z; L.heavy = true; L.ls = Math.min(1, sp / (letterPx * 0.72));
          if (L.st === 2) { L.st = 1; L.vy = -(60 + Math.random() * 50) * G.k; L.vx = 0; }
        });
      }
      function dissolveGroup(gi) {
        let n = 0;
        letters.forEach(L => {
          if (L.g !== gi) return;
          if (L.st === 1) { const P = C.P, v = 2 * L.z - 1; L.y = P.y0 + v * P.ry; L.st = 2; L.rest = 0; }
          if (L.st === 2) { L.st = 3; L.d = -n * 0.06; n++; PG.emit('mote', L.x, L.y - 3 * G.k, 2, { colors: ['#fff6d8', SEA.letter, '#ffe6a8'], speed: [8, 26] }); }
        });
        if (n && au()) K.sfx.sparkle();
      }
      function reviveGroup(gi) {
        const k = G.k;
        letters.forEach(L => {
          if (L.g !== gi) return;
          L.st = 1; L.d = 0; L.heavy = false;
          L.y -= 4 * k; L.vy = -(150 + Math.random() * 140) * k; L.vx = (Math.random() - 0.5) * 160 * k; L.vr = (Math.random() - 0.5) * 7; L.vf = (Math.random() - 0.5) * 9;
        });
      }
      const groupAlive = (gi) => letters.some(L => L.g === gi && L.st < 3);
      const lettersDone = () => letters.every(L => L.st >= 3);

      /* ---------------- input: shake, then hold still ---------------- */
      const stillish = () => phase === 'still1' || phase === 'still2' || phase === 'settled1' || phase === 'twist';
      let dragFrom = null, downPhase = '';
      function onDown(p) {
        downPhase = phase;
        if (phase === 'hello' || phase === 'shake' || phase === 'shaken') {
          if (phase === 'hello') { phase = 'shake'; shakeStart = performance.now(); setHud('Make a blizzard', 'Shake it up!', 'Quick swipes, back and forth.'); hMeter.hidden = false; music.level(0.22); loops(); }
          dragFrom = { x: p.x, y: p.y }; GL.drag = true; GL.tx = GL.ox; GL.ty = GL.oy;
          if (au()) { A.tone({ type: 'sine', freq: 330, to: 420, glide: 0.08, dur: 0.12, vol: 0.05 }); A.sync('grab', performance.now()); }
          return;
        }
        if (stillish()) { restDown(p); return; }
        // the finale: a soft chime and a few sparkles where the player touches
        PO.emit('star', p.x, p.y, 6, { colors: ['#fff6d8', '#ffe6a8'], speed: [20, 70] });
        if (au()) { A.chime(A.note(SEA.notes[Math.floor(Math.random() * SEA.notes.length)]), { vol: 0.05, dur: 1.4 }); A.sync('tap', performance.now()); }
      }
      function onMove(p) {
        if (GL.drag && dragFrom) {
          const M = G.R * (RED ? 0.07 : 0.17);
          const tx = (p.x - dragFrom.x) * 0.8, ty = (p.y - dragFrom.y) * 0.55;
          const soft = (v, m) => m * Math.tanh(v / m);
          GL.tx = soft(tx, M); GL.ty = soft(ty, M * 0.6);
          return;
        }
        if (finger.down) { finger.x = p.x; finger.y = p.y; }
      }
      function onUp() {
        if (GL.drag) { GL.drag = false; dragFrom = null; return; }
        if (finger.down) restUp();
      }
      K.press(touch, { space: el, down: onDown, move: onMove, up: onUp });
      K.onKey(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], (e) => {
        if (!(phase === 'hello' || phase === 'shake' || phase === 'shaken')) return;
        e.preventDefault(); A.unlock(); K.guideDone();
        if (phase === 'hello') onDown({ x: G.cx, y: G.cy }), onUp();
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code] || [1, 0];
        GL.vx += d[0] * 620 * G.k; GL.vy += d[1] * 420 * G.k;
      });
      let keyHeld = false;
      K.onKey(['Space', 'Enter'], (e) => { if (e.repeat || keyHeld || !stillish()) return; e.preventDefault(); keyHeld = true; A.unlock(); K.guideDone(); downPhase = phase; restDown({ x: G.cx + G.R * 0.1, y: G.cy - G.R * 0.1 }); });
      S.listen(window, 'keyup', (e) => { if (keyHeld && (e.code === 'Space' || e.code === 'Enter')) { keyHeld = false; if (finger.down) restUp(); } });

      /* The rest guide shows only while no finger is resting (the kit's guide treats a press older than 30 s as stale and
         would otherwise reappear over a long, perfectly good hold). */
      let restSpec = null;
      function restGuide(spec) { restSpec = spec; if (finger.down) K.guide(null); else K.guide(spec); }
      function restDown(p) {
        finger.down = true; finger.x = finger.ax = p.x; finger.y = finger.ay = p.y; finger.drift = 0; finger.t0 = performance.now(); finger.sig = 1; finger.wob = 0;
        K.guide(null);
        still.face('meditate'); sync.face('calm', 1800);
        if (au()) { A.tone({ type: 'sine', freq: 220, to: 262, glide: 0.4, dur: 0.6, vol: 0.05, attack: 0.05, verb: 0.4 }); A.sync('rest', performance.now()); }
        if (!BR.on) { BR.on = true; BR.phase = 'in'; BR.t0 = performance.now(); breathSound(false); onBreathPhase(); }
      }
      function restUp() {
        finger.down = false;
        const nowMs = performance.now();
        if (BR.on) {
          const p = (nowMs - BR.t0) / OUT_MS;
          if (BR.phase === 'out' && p >= (inten === 0 ? 0.4 : 0.6)) exhaleEnd();
          BR.on = false;
        }
        if (au()) { A.tone({ type: 'sine', freq: 262, to: 196, glide: 0.3, dur: 0.4, vol: 0.04 }); A.sync('lift', performance.now()); }
        if (restSpec && stillish()) K.guide(Object.assign({}, restSpec, { id: restSpec.id + '-again', delay: 1400 }));
        if (phase === 'still1' || phase === 'still2') {
          setHud(null, 'Hold still', 'Rest your finger back on the glass.');
          if (liftedSaid < 2 && now - lastReact > 3) { liftedSaid++; lastReact = now; talk(still, LINES.lifted, { mood: 'calm', ms: 2600 }); }
        }
      }

      /* ---------------- breathing: real time, a long slow out-breath ---------------- */
      function onBreathPhase() {
        const st = phase === 'still1' || phase === 'still2';
        if (!st) return;
        const n = BR.n + 1, need = PR.need, kick = phase === 'still1' ? 'Breath ' + Math.min(n, need) + ' of ' + need : 'Settle it again';
        if (BR.phase === 'in') setHud(kick, 'Breathe in', 'Keep your finger perfectly still.');
        else {
          let gi = -1;
          if (phase === 'still1' && nextGroup < NT) gi = nextGroup;
          if (phase === 'still2' && groupAlive(NT - 1)) gi = NT - 1;
          groupNow = gi;
          if (gi >= 0) { sinkGroup(gi); setHud(kick, 'Breathe out', ['Slowly… let '].concat(thoughtRef(gi), [' sink.'])); }
          else setHud(kick, 'Breathe out', 'Slowly… let it all settle.');
        }
      }
      function exhaleEnd() {
        const st = phase === 'still1' || phase === 'still2';
        settleChime(BR.n + (phase === 'still2' ? 4 : 0));
        if (!st) return;
        BR.n++;
        if (groupNow >= 0) {
          const gi = groupNow; groupNow = -1;
          dissolveGroup(gi);
          if (phase === 'still1') nextGroup = gi + 1;
          if (!sinkSaid) { sinkSaid = true; talk(still, TH.generic ? LINES.sunkG : LINES.sunk, { mood: 'happy', moodMs: 1600, ms: 3600 }); }
        }
      }
      function breathStep(nowMs) {
        if (!BR.on) return;
        let el2 = nowMs - BR.t0;
        if (el2 > 30000) { BR.t0 = nowMs; el2 = 0; }
        if (BR.phase === 'in' && el2 >= IN_MS) { BR.phase = 'out'; BR.t0 += IN_MS; breathSound(true); onBreathPhase(); }
        else if (BR.phase === 'out' && el2 >= OUT_MS) { BR.t0 += OUT_MS; exhaleEnd(); BR.phase = 'in'; breathSound(false); onBreathPhase(); }
        const dur = BR.phase === 'in' ? IN_MS : OUT_MS, left = (phase === 'still1' || phase === 'still2') ? Math.max(1, Math.ceil((dur - (nowMs - BR.t0)) / 1000)) : 0;
        if (left !== BR.shown) { BR.shown = left; hNum.textContent = left ? String(left) : ''; }
      }

      /* ---------------- settling: stillness and slow breath drive it, in real seconds ---------------- */
      const TOL = [[12, 46], [8, 34], [5, 26]][inten];
      function stillStep(rdt) {
        if (!finger.down) return;
        const d = Math.hypot(finger.x - finger.ax, finger.y - finger.ay);
        finger.drift += (d - finger.drift) * Math.min(1, rdt * 8);
        finger.ax += (finger.x - finger.ax) * Math.min(1, rdt * 0.25); finger.ay += (finger.y - finger.ay) * Math.min(1, rdt * 0.25);
        finger.sig = clamp(1 - (finger.drift - TOL[0]) / TOL[1], 0.2, 1);
        if (phase === 'still1' || phase === 'still2') {
          stillAcc += finger.sig * rdt; stillN += rdt;
          if (BR.on) PR.p += rdt * finger.sig * (BR.phase === 'out' ? PR.rE : PR.rI);
          if (finger.sig < 0.75) {
            finger.wob += rdt;
            FL.S += FL.dir * (1 - finger.sig) * 70 * G.k * rdt; FL.T = Math.min(60 * G.k, FL.T + (1 - finger.sig) * 30 * G.k * rdt);
            if (finger.wob > 0.6 && !wobbleSaid) { wobbleSaid = true; talk(sync, LINES.wobble, { mood: 'surprised', moodMs: 1400, ms: 2800 }); }
          }
        }
      }
      function fluidStep(dt) {
        const du = Math.exp(-dt * 2.2); FL.ux *= du; FL.uy *= du;
        const st = phase === 'still1' || phase === 'still2';
        if (st) {
          const target = PR.S0 * Math.pow(Math.max(0, 1 - PR.p / 0.8), 1.5);
          const rate = finger.down ? (BR.on && BR.phase === 'out' ? 1.5 : 0.9) : 0.3;
          if (Math.abs(FL.S) > target) FL.S += (Math.sign(FL.S) * target - FL.S) * Math.min(1, dt * rate);
          const tt = PR.T0 * Math.pow(Math.max(0, 1 - PR.p / 0.8), 1.5);
          if (FL.T > tt) FL.T += (tt - FL.T) * Math.min(1, dt * rate);
          if (!finger.down) { const fl = SMAX * 0.08 * Math.max(0, 1 - PR.p); if (Math.abs(FL.S) < fl) FL.S += (FL.dir * fl - FL.S) * dt * 0.5; }
        } else if (phase === 'hello' || phase === 'shake' || phase === 'shaken' || phase === 'intro' || phase === 'twist') { FL.S *= Math.exp(-dt * 0.3); FL.T *= Math.exp(-dt * 0.42); }
        else { FL.S *= Math.exp(-dt * 1.4); FL.T *= Math.exp(-dt * 1.4); }
        agit = clamp((Math.abs(FL.S) + FL.T * 1.4 + Math.hypot(FL.ux, FL.uy) * 0.6) / SMAX, 0, 1);
      }
      let SMAX = 280, TMAX = 110;
      function globeStep(dt) {
        const n = Math.max(1, Math.ceil(dt * 120)), h1 = dt / n;
        let dvx = 0, dvy = 0;
        for (let i = 0; i < n; i++) {
          const k1 = GL.drag ? 560 : 230, c1 = GL.drag ? 30 : 8.5, tx = GL.drag ? GL.tx : 0, ty = GL.drag ? GL.ty : 0;
          const ax = k1 * (tx - GL.ox) - c1 * GL.vx, ay = k1 * (ty - GL.oy) - c1 * GL.vy;
          GL.vx += ax * h1; GL.vy += ay * h1; dvx += ax * h1; dvy += ay * h1;
          GL.ox += GL.vx * h1; GL.oy += GL.vy * h1;
        }
        GL.tilt = clamp(GL.ox / (G.R * 0.17), -1.4, 1.4) * 0.05;
        const dv = Math.hypot(dvx, dvy);
        if (dv < 0.5) return;
        const k = G.k;
        for (let i = 0; i < NF; i++) if (!F.st[i]) { F.vx[i] -= dvx * 0.8; F.vy[i] -= dvy * 0.8; }
        letters.forEach(L => { if (L.st === 1) { L.vx -= dvx * 0.75; L.vy -= dvy * 0.75; } });
        FL.ux = clamp(FL.ux - dvx * 0.7, -380 * k, 380 * k); FL.uy = clamp(FL.uy - dvy * 0.7, -380 * k, 380 * k);
        const cross = GL.vx * dvy - GL.vy * dvx;
        if (Math.abs(cross) > 400 * k * k) FL.dir = cross > 0 ? 1 : -1;
        FL.S = clamp(FL.S + FL.dir * dv * 0.11 + cross * 0.0012 / k, -SMAX, SMAX);
        FL.T = Math.min(TMAX, FL.T + dv * 0.09);
        if (dv > 60 * k) liftFlakes(clamp(dv / (520 * k), 0, 0.55), 200 + dv * 0.25, dvx);
        if (phase === 'hello' || phase === 'shake' || phase === 'shaken') {
          if (dv > 170 * k) shatter(dvx, dvy);
          if (phase === 'shake') {
            meter = Math.min(1, meter + dv / (6400 * k));
            meterFill.style.setProperty('--m', meter.toFixed(3));
          }
        }
        // sounds on direction changes: a glass tink and a glug of liquid
        if (GL.vx * GL.pvx < 0 && Math.abs(GL.vx - GL.pvx) > 140 * k && now - GL.lastRev > 0.09) { GL.lastRev = now; const v = clamp(Math.abs(GL.vx - GL.pvx) / (700 * k), 0.4, 1.4); tink(v); if (v > 0.8) glug(v); }
        if (dv > 120 * k && now - lastWhoosh > 0.32) { lastWhoosh = now; K.sfx.whoosh(); }
        if (now - lastReact > 0.9 && (phase === 'shake' || phase === 'shaken')) { lastReact = now; sync.face(meter > 0.7 ? 'dizzy' : ['laugh', 'wow', 'E19'][Math.floor(Math.random() * 3)], 1100); still.face(meter > 0.5 ? 'surprised' : 'happy', 1000); }
      }
      function audioStep() {
        if (!slosh) return;
        const sp = Math.hypot(GL.vx, GL.vy) / G.k;
        slosh.level(Math.min(0.13, sp / 900 * 0.13), 0.06); slosh.freq(300 + Math.min(1600, sp * 1.4), 0.08);
        hiss.level(0.0001 + agit * airFrac * 0.05, 0.3);
      }

      /* ---------------- the finale: the village wakes up ---------------- */
      const SMK = [];
      function finaleStep(rdt, t) {
        FX.glow += (FX.glowT - FX.glow) * Math.min(1, rdt * 1.5);
        FX.dusk += (FX.duskT - FX.dusk) * Math.min(1, rdt * 0.7);
        FX.flash = Math.max(0, FX.flash - rdt * 3);
        FX.shelf += ((FX.shelfT ? 1 : 0) - FX.shelf) * Math.min(1, rdt * 3);
        CAM.shake = Math.max(0, CAM.shake - rdt * 2.4);
        if (FX.lights) FX.lightT += rdt;
        const k = G.k;
        if (FX.smoke && V && SMK.length < 80 && Math.random() < rdt * 7 * Math.max(1, V.chimneys.length / 3)) { const c = V.chimneys[Math.floor(Math.random() * V.chimneys.length)]; if (c) SMK.push({ x: c.x, y: c.y, age: 0, life: 3 + Math.random() * 1.8, ph: Math.random() * TAU, s: 1.8 + Math.random() * 1.2 }); }
        for (let i = SMK.length - 1; i >= 0; i--) { const q = SMK[i]; q.age += rdt; q.y -= 9 * k * rdt; q.x += Math.sin(q.age * 1.8 + q.ph) * 6 * k * rdt + 2 * k * rdt; if (q.age > q.life) SMK.splice(i, 1); }
        if (FX.train) {
          FX.trainU += rdt * 0.11;
          if (FX.trainU > 1.4) { FX.trainU = -0.4; FX.trainPass++; if (FX.trainPass < 3) whistle(); }
          if (FX.trainU > -0.05 && FX.trainU < 1.05 && t - lastChug > 0.24 && au()) { lastChug = t; A.noise({ filter: 'bandpass', freq: 900, q: 1.2, dur: 0.07, vol: 0.018, attack: 0.005 }); }
          if (FX.trainU > 0 && FX.trainU < 1 && Math.random() < rdt * 7) { const p0 = trackPt(C.P, FX.trainU); SMK.push({ x: p0.x, y: p0.y - 10 * k, age: 0, life: 1.6, ph: Math.random() * TAU, s: 1.2 }); }
        }
      }
      let lastLit = 0;
      function drawVillageLive(g, t, dt) {
        const k = G.k, Vv = V; if (!Vv) return;
        const ex = Vv.extras;
        if (ex.hub) {
          const a0 = (FX.sail = (FX.sail || 0) + (0.25 + agit * 5) * dt), L = ex.hub.len, s = ex.hub.s;
          g.save(); g.translate(ex.hub.x, ex.hub.y);
          for (let q = 0; q < 4; q++) {
            const a = a0 + q * Math.PI / 2; g.save(); g.rotate(a);
            g.fillStyle = '#5a3b2c'; g.fillRect(-0.7 * s, 0, 1.4 * s, L);
            g.fillStyle = 'rgba(250, 244, 230, 0.92)'; g.fillRect(0.7 * s, L * 0.22, 4.6 * s, L * 0.74);
            g.strokeStyle = 'rgba(90, 60, 40, 0.55)'; g.lineWidth = Math.max(0.4, 0.5 * s); for (let r = 1; r < 6; r++) { g.beginPath(); g.moveTo(0.7 * s, L * (0.22 + r * 0.124)); g.lineTo(5.3 * s, L * (0.22 + r * 0.124)); g.stroke(); }
            g.restore();
          }
          g.fillStyle = '#3a2618'; g.beginPath(); g.arc(0, 0, 2 * s, 0, TAU); g.fill();
          g.restore();
        }
        if (!FX.lights) return;
        const glow = K.glowSprite('rgba(255, 196, 110, 0.95)'), lt = FX.lightT, P = C.P;
        // the whole village warms as its windows come on
        const pool = clamp(lt / 2.6, 0, 1);
        if (pool > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = pool * (K.dark() ? 0.2 : 0.14); g.drawImage(K.glowSprite('rgba(255, 170, 90, 0.8)'), -P.rx * 0.9, P.y0 - P.ry * 2, P.rx * 1.8, P.ry * 2.8); g.restore(); }
        let lit = 0;
        for (let i = 0; i < Vv.windows.length; i++) {
          const wd = Vv.windows[i], a = clamp((lt - wd.d) * 3, 0, 1); if (a <= 0) continue;
          lit++;
          const fl = 0.9 + 0.1 * Math.sin(t * 3.1 + i * 1.7), gs = Math.max(wd.w, wd.h) * 2.2 + 3 * k;
          g.globalAlpha = a * 0.6 * fl; g.drawImage(glow, wd.x - gs, wd.y - gs, gs * 2, gs * 2);
          g.globalAlpha = a; g.fillStyle = '#ffdb8e';
          if (wd.shape === 'round') { g.beginPath(); g.arc(wd.x, wd.y, wd.w / 2, 0, TAU); g.fill(); }
          else if (wd.sk) { g.beginPath(); g.moveTo(wd.x - wd.w / 2, wd.y - wd.h / 2 - wd.sk * wd.w / 2); g.lineTo(wd.x + wd.w / 2, wd.y - wd.h / 2 + wd.sk * wd.w / 2); g.lineTo(wd.x + wd.w / 2, wd.y + wd.h / 2 + wd.sk * wd.w / 2); g.lineTo(wd.x - wd.w / 2, wd.y + wd.h / 2 - wd.sk * wd.w / 2); g.closePath(); g.fill(); }
          else g.fillRect(wd.x - wd.w / 2, wd.y - wd.h / 2, wd.w, wd.h);
          if (wd.w > 2.5) { g.strokeStyle = 'rgba(120, 70, 30, 0.55)'; g.lineWidth = Math.max(0.4, 0.5 * k); g.beginPath(); g.moveTo(wd.x, wd.y - wd.h / 2); g.lineTo(wd.x, wd.y + wd.h / 2); g.stroke(); }
        }
        if (lit > lastLit) { if (au() && lit % 2 === 1) { A.pluck(A.note(SEA.notes[(lit >> 1) % SEA.notes.length]), { vol: 0.1, damp: 0.996, verb: 0.4 }); A.sync('light', performance.now()); } lastLit = lit; }
        Vv.lamps.forEach(l => { const a = clamp((lt - l.d) * 2, 0, 1); if (a <= 0) return; g.globalAlpha = a * 0.85; g.drawImage(glow, l.x - 16 * l.s, l.y - 16 * l.s, 32 * l.s, 32 * l.s); g.globalAlpha = a * 0.35; g.drawImage(glow, l.x - 14 * l.s, l.y + 6 * l.s, 28 * l.s, 12 * l.s); g.globalAlpha = a; g.fillStyle = '#fff2c4'; g.fillRect(l.x - 1.3 * l.s, l.y - 1.3 * l.s, 2.6 * l.s, 2.6 * l.s); });
        if (ex.beam) { const a = clamp(lt - 0.6, 0, 1); if (a > 0) { const ang = t * 0.9, len = G.Ri * 0.9; g.save(); circ(g, G.Ri - 1); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.28 * a; g.fillStyle = '#ffe9b0'; g.beginPath(); g.moveTo(ex.beam.x, ex.beam.y); g.lineTo(ex.beam.x + Math.cos(ang - 0.12) * len, ex.beam.y + Math.sin(ang - 0.12) * len * 0.35); g.lineTo(ex.beam.x + Math.cos(ang + 0.12) * len, ex.beam.y + Math.sin(ang + 0.12) * len * 0.35); g.closePath(); g.fill(); g.restore(); g.globalAlpha = a; g.drawImage(glow, ex.beam.x - 14 * ex.beam.s, ex.beam.y - 14 * ex.beam.s, 28 * ex.beam.s, 28 * ex.beam.s); } }
        if (ex.clock) { g.globalAlpha = clamp(lt - 0.3, 0, 1) * 0.7; g.drawImage(glow, ex.clock.x - ex.clock.r * 2.6, ex.clock.y - ex.clock.r * 2.6, ex.clock.r * 5.2, ex.clock.r * 5.2); }
        if (ex.scope) { const a = clamp(lt - 0.8, 0, 1) * (0.7 + 0.3 * Math.sin(t * 4)); g.globalAlpha = a; g.fillStyle = '#fffbe6'; K.starPath(g, ex.scope.x, ex.scope.y, 4.2 * ex.scope.s, 1.4 * ex.scope.s, 4, 0); g.fill(); g.drawImage(glow, ex.scope.x - 8 * ex.scope.s, ex.scope.y - 8 * ex.scope.s, 16 * ex.scope.s, 16 * ex.scope.s); }
        if (ex.gate) { g.globalAlpha = clamp(lt - 0.4, 0, 1) * 0.6; g.drawImage(glow, ex.gate.x - 10 * k, ex.gate.y - 10 * k, 20 * k, 20 * k); }
        g.globalAlpha = 1;
      }
      function drawTrain(g) {
        if (!FX.train) return;
        const k = G.k, P = C.P;
        const cars = [{ d: 0, loco: true }, { d: 0.085 }, { d: 0.165 }];
        cars.forEach(cr => {
          const u = FX.trainU - cr.d; if (u < 0 || u > 1) return;
          const p0 = trackPt(P, u), p1 = trackPt(P, Math.min(1, u + 0.01)), ang = Math.atan2(p1.y - p0.y, p1.x - p0.x), s = k * 1.05;
          g.save(); g.translate(p0.x, p0.y - 1 * s); g.rotate(ang);
          if (cr.loco) {
            g.fillStyle = '#2b2733'; rrect(g, -8 * s, -7 * s, 12 * s, 6 * s, 2.6 * s); g.fill();
            g.fillStyle = '#b8323a'; g.fillRect(2 * s, -10 * s, 6 * s, 9 * s);
            g.fillStyle = '#2b2733'; g.fillRect(1.4 * s, -11 * s, 7.2 * s, 1.6 * s); g.fillRect(-5.5 * s, -11 * s, 2.4 * s, 4.4 * s);
            g.fillStyle = '#e8c15a'; g.fillRect(-8 * s, -4.4 * s, 12 * s, 0.9 * s); g.beginPath(); g.arc(-8.4 * s, -4 * s, 1.1 * s, 0, TAU); g.fill();
            g.fillStyle = FX.lights ? '#ffdb8e' : '#8aa0c0'; g.fillRect(3.6 * s, -8.6 * s, 2.8 * s, 2.6 * s);
          } else {
            g.fillStyle = '#3f6f8e'; rrect(g, -7 * s, -8 * s, 14 * s, 7 * s, 1.6 * s); g.fill();
            g.fillStyle = '#2b2733'; g.fillRect(-7.6 * s, -9 * s, 15.2 * s, 1.4 * s);
            g.fillStyle = FX.lights ? '#ffdb8e' : '#a8bcd8'; for (let q = -1; q <= 1; q++) g.fillRect(q * 4.4 * s - 1.4 * s, -6.6 * s, 2.8 * s, 2.6 * s);
          }
          g.fillStyle = '#1b1820'; [-4.5, 0, 4.5].forEach(wx => { g.beginPath(); g.arc(wx * s, -0.9 * s, 1.3 * s, 0, TAU); g.fill(); });
          g.restore();
        });
      }
      function drawSmoke(g) {
        if (!SMK.length) return;
        const k = G.k;
        g.fillStyle = K.dark() ? 'rgba(228, 232, 246, 1)' : 'rgba(255, 255, 255, 1)';
        for (const q of SMK) { const f = q.age / q.life; g.globalAlpha = 0.42 * (1 - f) * Math.min(1, q.age * 4); g.beginPath(); g.arc(q.x, q.y, (q.s + f * 5.5) * k, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      function drawTunnelsLive(g) { paintTunnels(g, C.P, SEA); }

      /* ---------------- frame ---------------- */
      const OUT = []; { const r = K.rng(21); for (let i = 0; i < 44; i++) OUT.push({ x: r(), y: r(), s: 0.7 + r() * 1.6, v: 0.5 + r(), ph: r() * TAU }); }
      function drawOutside(g, dt, t) {
        const Wn = G.win, xc = (Wn.x0 + Wn.x1) / 2, r = (Wn.x1 - Wn.x0) / 2 - 9, ya = Wn.y0 + r + 9, D = K.dark();
        g.fillStyle = D ? 'rgba(232, 240, 255, 0.82)' : 'rgba(255, 255, 255, 0.95)';
        g.beginPath();
        for (const f of OUT) {
          f.y += dt * (0.025 + 0.02 * f.v); if (f.y > 1) f.y -= 1;
          const x = Wn.x0 + 9 + f.x * (Wn.x1 - Wn.x0 - 18) + Math.sin(t * 0.7 + f.ph) * 7, y = Wn.y0 + f.y * (Wn.y1 - Wn.y0);
          if (y < ya && (x - xc) * (x - xc) + (y - ya) * (y - ya) > r * r) continue;
          g.moveTo(x + f.s, y); g.arc(x, y, f.s, 0, TAU);
        }
        g.fill();
        g.strokeStyle = D ? '#35264a' : '#ffffff'; g.lineWidth = G.phone ? 6 : 8; g.lineCap = 'butt';
        g.beginPath(); g.moveTo(xc, Wn.y0 + 9); g.lineTo(xc, Wn.y1); g.moveTo(Wn.x0 + 9, ya); g.lineTo(Wn.x1 - 9, ya);
        [-0.75, -0.25].forEach(f => { const a = f * Math.PI; g.moveTo(xc, ya); g.lineTo(xc + Math.cos(a) * r, ya + Math.sin(a) * r); });
        g.stroke();
      }
      function drawShelf(g, t) {
        const phone = G.phone;
        if (phone && FX.shelf < 0.01) return;
        const D = K.dark(), slots = G.slots, a = phone ? FX.shelf : 1;
        g.globalAlpha = a;
        if (phone) paintPlank(g, slots[0].x - slots[0].r - 10, slots[slots.length - 1].x + slots[0].r + 10, slots[0].y + slots[0].r * 1.17, D);
        slots.forEach((sl, i) => {
          const have = shelfData[SCENES[i].name] || (i === SCN_I && FX.placeT >= 0 ? SEA.key : null);
          if (!have) {
            g.globalAlpha = a * (D ? 0.22 : 0.3); g.strokeStyle = D ? '#fff6ea' : '#5a4630'; g.lineWidth = 1.2; g.setLineDash([3, 4]);
            g.beginPath(); g.arc(sl.x, sl.y, sl.r * 0.95, 0, TAU); g.stroke(); g.setLineDash([]);
            g.globalAlpha = a; return;
          }
          const m = mini(i, i === SCN_I && FX.placeT >= 0 ? SEA.key : have);
          let sc = 1;
          if (i === SCN_I && FX.placeT >= 0) { const q = clamp((now - FX.placeT) / 0.7, 0, 1); sc = outBack(q); if (q < 1 || true) { g.globalAlpha = a * (0.35 + 0.25 * Math.sin(t * 3)); g.drawImage(K.glowSprite('rgba(255, 214, 140, 0.9)'), sl.x - sl.r * 2.2, sl.y - sl.r * 2, sl.r * 4.4, sl.r * 4.4); g.globalAlpha = a; } }
          if (sc <= 0.01) return;
          g.save(); g.translate(sl.x, sl.y + sl.r * 1.32); g.scale(sc, sc);
          g.drawImage(m.c, -m.r * 1.15, -m.r * 1.32 - m.r * 1.15, m.r * 2.3, m.r * 2.6);
          g.restore();
        });
        g.globalAlpha = 1;
      }
      function drawRing(g, nowMs) {
        if (!stillish()) return;
        const R = G.R, cx = G.cx + GL.ox, cy = G.cy + GL.oy, k = G.k;
        let rad, col, prog = 0, a;
        const D = K.dark();
        if (BR.on) {
          const dur = BR.phase === 'in' ? IN_MS : OUT_MS, p = clamp((nowMs - BR.t0) / dur, 0, 1), e = easeIO(p);
          rad = R + (6 + (BR.phase === 'in' ? e : 1 - e) * 17) * k; col = BR.phase === 'in' ? (D ? [176, 226, 255] : [52, 132, 186]) : (D ? [255, 214, 150] : [214, 128, 40]); prog = p; a = 1;
        } else { rad = R + (7 + Math.sin(nowMs / 700) * 2) * k; col = D ? [230, 236, 255] : [120, 110, 150]; a = 0.5; }
        g.lineCap = 'round';
        g.globalAlpha = 0.2 * a; g.strokeStyle = rgba(col); g.lineWidth = 11 * k; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke();
        g.globalAlpha = 0.8 * a; g.lineWidth = 2; g.stroke();
        if (prog > 0) { g.globalAlpha = a; g.lineWidth = 4.5; g.strokeStyle = rgba(D ? mixc(col, [255, 255, 255], 0.45) : col); g.beginPath(); g.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + prog * TAU); g.stroke(); const ang = -Math.PI / 2 + prog * TAU; g.fillStyle = D ? '#ffffff' : rgba(col); g.beginPath(); g.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 4.5 * Math.max(0.9, k * 0.9), 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      function drawFinger(g, nowMs) {
        if (!finger.down || !stillish()) return;
        const k = G.k, hold = clamp((nowMs - finger.t0) / 1400, 0, 1), dx = finger.x - (G.cx + GL.ox), dy = finger.y - (G.cy + GL.oy);
        if (dx * dx + dy * dy < G.R * G.R) { g.globalAlpha = 0.3 * hold * finger.sig; g.drawImage(K.glowSprite('rgba(255, 255, 255, 0.9)'), finger.x - 48 * k, finger.y - 48 * k, 96 * k, 96 * k); }
        const r = 32 * k;
        g.globalAlpha = 0.9; g.lineCap = 'round'; g.lineWidth = 3;
        g.strokeStyle = finger.sig > 0.8 ? 'rgba(255, 238, 196, 0.95)' : 'rgba(255, 170, 150, 0.95)';
        g.beginPath(); g.arc(finger.x, finger.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * finger.sig * hold); g.stroke();
        g.globalAlpha = 1;
      }
      function drawGlints(g, gx, gy, t) {
        const R = G.R, spr = K.glowSprite('rgba(255, 255, 255, 0.95)');
        [[-0.62, -0.58, 0], [0.7, 0.42, 2.1], [-0.1, -0.97, 4.2]].forEach(([u, v, ph]) => {
          const a = Math.max(0, Math.sin(t * 0.9 + ph)); if (a < 0.05) return;
          const x = gx + u * R, y = gy + v * R, s = (5 + a * 6) * G.k;
          g.globalAlpha = a * 0.9; g.drawImage(spr, x - s * 1.6, y - s * 1.6, s * 3.2, s * 3.2);
          g.fillStyle = '#ffffff'; K.starPath(g, x, y, s, s * 0.18, 4, 0); g.fill();
        });
        g.globalAlpha = 1;
      }
      function draw(g, dt, t, nowMs) {
        if (!C) buildCaches();
        if (!flakesPlaced) { restFlakes(); flakesPlaced = true; }
        const { w, H, R, Ri, cx, cy, k } = G, D = K.dark();
        g.save();
        if (CAM.shake > 0 && !RED) g.translate(Math.sin(t * 61) * CAM.shake * 7, Math.cos(t * 53) * CAM.shake * 4);
        g.drawImage(C.room.c, 0, 0, w, H);
        drawOutside(g, dt, t);
        drawShelf(g, t);
        // at rest the globe snaps to whole device pixels with no rotation, so its big layers copy straight across
        const moving = Math.abs(GL.vx) + Math.abs(GL.vy) > 2 || Math.abs(GL.ox) + Math.abs(GL.oy) > 0.6, dp = cv.dpr || 1;
        const gx = moving ? cx + GL.ox : Math.round(cx * dp) / dp, gy = moving ? cy + GL.oy : Math.round(cy * dp) / dp, tilt = Math.abs(GL.tilt) > 0.003 ? GL.tilt : 0, lift = clamp(-GL.oy / (R * 0.2), 0, 1);
        // shadow and the caustic the glass throws on the table
        const ty = G.tableY;
        g.globalAlpha = 0.55 * (1 - lift * 0.4); g.fillStyle = D ? 'rgba(0, 0, 0, 0.9)' : 'rgba(70, 40, 20, 0.55)';
        g.beginPath(); g.ellipse(cx + GL.ox * 0.5, ty + R * 0.04, R * (0.98 + lift * 0.1), R * 0.1, 0, 0, TAU); g.fill();
        g.globalAlpha = (D ? 0.55 : 0.65) * (1 - lift * 0.5); g.globalCompositeOperation = 'lighter';
        g.drawImage(K.glowSprite(D ? 'rgba(255, 196, 120, 0.85)' : 'rgba(255, 244, 214, 0.9)'), Math.max(6, cx - R * 1.24) + GL.ox * 0.3, ty - R * 0.02, R * 0.56, R * 0.14);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        if (FX.glow > 0.01) { g.globalAlpha = FX.glow * (D ? 0.85 : 0.65); g.drawImage(C.halo.c, gx - R * 2.1, gy - R * 2.05, R * 4.2, R * 4.2); g.globalAlpha = 1; }
        // inside the glass (every layer here is already clipped to the sphere)
        g.save(); g.translate(gx, gy); if (tilt) g.rotate(tilt);
        g.drawImage(C.vB.c, -Ri, -Ri, 2 * Ri, 2 * Ri);
        if (FX.dusk > 0.01 && !D) { g.globalAlpha = FX.dusk; g.drawImage(duskCache().c, -Ri, -Ri, 2 * Ri, 2 * Ri); g.globalAlpha = 1; }
        drawFlakes(g, 0, t);
        drawFlakes(g, 1, t);
        g.drawImage(C.vF.c, -Ri, C.vF.top, 2 * Ri, C.vF.h);
        if (FX.dusk > 0.01 && !D) { g.globalAlpha = FX.dusk * 0.26; g.drawImage(C.inner.c, -Ri, -Ri, 2 * Ri, 2 * Ri); g.globalAlpha = 1; }
        drawVillageLive(g, t, dt);
        drawTrain(g);
        drawTunnelsLive(g);
        drawSmoke(g);
        drawLetters(g);
        drawFlakes(g, 2, t);
        PG.update(dt); PG.draw(g);
        if (agit > 0.02) { g.globalAlpha = Math.min(0.4, agit * 0.46) * (0.4 + airFrac * 0.6); g.drawImage(C.haze.c, -Ri, -Ri, 2 * Ri, 2 * Ri); g.globalAlpha = 1; }
        if (FX.glow > 0.01) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = FX.glow * 0.32; g.drawImage(C.inner.c, -Ri, -Ri, 2 * Ri, 2 * Ri); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
        g.restore();
        const gp = C.glass.pad;
        g.drawImage(C.glass.c, gx - R - gp, gy - R - gp, 2 * (R + gp), 2 * (R + gp));
        drawGlints(g, gx, gy, t);
        drawRing(g, nowMs);
        drawFinger(g, nowMs);
        g.save(); g.translate(gx, gy); if (tilt) g.rotate(tilt);
        g.drawImage(C.base.c, -C.base.ox, C.base.oy, C.base.w, C.base.h);
        g.restore();
        PO.update(dt); PO.draw(g);
        if (FX.flash > 0 && !RED) { g.globalAlpha = FX.flash * 0.55; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, H); g.globalAlpha = 1; }
        g.restore();
        void k;
      }
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !G.w) return;
        const nowMs = performance.now(), rdt = Math.min(0.1, Math.max(0, (nowMs - lastMs) / 1000)); lastMs = nowMs;
        now = t;
        if (rdt < 0.5) { qual.acc += rdt; qual.n++; }
        if (qual.n >= 120) { if (qual.acc / qual.n > 0.034 && qual.q > 0.81) { qual.q = Math.max(0.8, qual.q - 0.1); cv.setQuality(qual.q); } qual.acc = qual.n = 0; }
        if (!C) buildCaches();
        if (!flakesPlaced) { restFlakes(); flakesPlaced = true; }
        breathStep(nowMs);
        stillStep(rdt);
        // physics keeps up with real time (in small, stable steps) so the snow settles in step with the breath on slow devices too
        const pdt = Math.min(rdt, 0.12), ns = Math.max(1, Math.ceil(pdt / 0.034)), sdt = pdt / ns;
        for (let i = 0; i < ns; i++) { globeStep(sdt); fluidStep(sdt); flakesStep(sdt, t); lettersStep(sdt, t); }
        finaleStep(rdt, t);
        audioStep();
        checkPhase(nowMs, rdt);
        draw(g, dt, t, nowMs);
      });

      /* ---------------- flow ---------------- */
      function checkPhase(nowMs, rdt) {
        if (phase === 'shake' && meter >= 1 && airFrac > 0.6) { phase = 'shaken'; onShaken(); }
        if (phase === 'shake' && !moreSaid && nowMs - shakeStart > 6000 && meter < 0.5) { moreSaid = true; talk(sync, LINES.more, { mood: 'laugh', ms: 2600 }); }
        const st = phase === 'still1' || phase === 'still2';
        if (st && BR.n >= PR.need) {
          // the last stragglers drift down; after a few real seconds anything still floating comes to rest
          PR.boost += rdt;
          if (PR.boost > 3) { const P = C.P; for (let i = 0; i < NF; i++) if (!F.st[i]) { const v = 2 * F.z[i] - 1, half = P.rx * Math.sqrt(Math.max(0, 1 - v * v)) * 0.97; F.st[i] = 1; F.x[i] = clamp(F.x[i], -half, half); F.y[i] = P.y0 + v * P.ry + F.jit[i] * G.k; } airFrac = 0; }
        }
        if (phase === 'still1' && BR.n >= PR.need && lettersDone() && airFrac < 0.05) { phase = 'settled1'; onSettled1(); }
        if (phase === 'still2' && BR.n >= PR.need && lettersDone() && airFrac < 0.05) { phase = 'settled2'; resettle = (nowMs - tBump) / 1000; finale(); }
      }
      function onShaken() {
        hMeter.hidden = true;
        K.guide(null);
        if (au()) { A.whoosh({ from: 600, to: 2600, dur: 0.6, vol: 0.12 }); A.sync('blizzard', performance.now()); }
        talk(sync, LINES.blizzard, { mood: 'E20', moodMs: 1600, ms: 2000 });
        setHud('A busy mind', 'Blizzard!', 'Now let it settle.');
        S.later(() => {
          if (S.destroyed) return;
          talk(still, LINES.busy, { mood: 'calm', ms: 3600 });
        }, 1500);
        S.later(() => { if (S.destroyed) return; beginStill(1); }, 2600);
      }
      function beginStill(n) {
        phase = n === 1 ? 'still1' : 'still2';
        PR.need = n === 1 ? Math.max(2, NT) : 2;
        PR.p = 0; BR.n = 0;
        PR.rE = (0.9 / PR.need) / (OUT_MS / 1000); PR.rI = (0.09 / PR.need) / (IN_MS / 1000);
        PR.S0 = Math.max(Math.abs(FL.S), SMAX * (n === 1 ? 0.45 : 0.35)); PR.T0 = Math.max(FL.T, TMAX * 0.4);
        music.level(0.28); music.tempo(n === 1 ? 74 : 70);
        PR.boost = 0;
        if (n === 1) {
          setHud('Now', 'Hold still', 'Rest a finger on the glass. Keep it perfectly still.');
          talk(still, LINES.rest, { mood: 'meditate', ms: 5200 });
          restGuide({ id: 'rest', g: 'still', target: () => ({ x: G.cx + G.R * 0.08, y: G.cy - G.R * 0.12 }), label: 'REST A FINGER HERE', ms: 2600, delay: 900 });
        } else {
          restGuide({ id: 'rest2', g: 'still', target: () => ({ x: G.cx + G.R * 0.08, y: G.cy - G.R * 0.12 }), label: 'SETTLE IT AGAIN', ms: 2600, delay: 600 });
          if (BR.on) onBreathPhase(); else setHud('Settle it again', 'Hold still', 'Rest a finger on the glass again.');
        }
        if (BR.on && n === 1) onBreathPhase();
      }
      let settledResolve = null;
      function onSettled1() {
        settleChime(7);
        music.level(0.45);
        setHud('Settled', 'Clear', 'Nothing went anywhere. It all just settled.');
        still.face('glow');
        talk(still, LINES.clear, { mood: 'glow', moodMs: 2400, ms: 3800 });
        PG.emit('mote', 0, -G.R * 0.2, 14, { colors: ['#fff6d8', '#e8f4ff'], speed: [10, 40] });
        if (!K.dark()) S.later(() => { if (C && !S.destroyed) duskCache(); }, 400);
        if (settledResolve) settledResolve();
      }
      async function twist() {
        phase = 'twist';
        restGuide({ id: 'keep', g: 'still', target: () => ({ x: G.cx + G.R * 0.08, y: G.cy - G.R * 0.12 }), label: 'KEEP HOLDING STILL', ms: 2600, delay: 4200 });
        const sz = G.phone ? 72 : 100, lean = G.phone ? { x: home.sync.x - 10, y: home.sync.y - 26 } : { x: home.sync.x - 18, y: home.sync.y - 4 };
        sync.place(lean.x, lean.y, 700);
        talk(sync, LINES.peek, { mood: 'wow', ms: 2200 });
        await K.wait(1900);
        if (S.destroyed) return;
        // the bump
        sync.react('shake'); sync.face('E41', 1300);
        CAM.shake = 1;
        GL.vy -= 420 * G.k; GL.vx += 240 * G.k;
        FL.S = SMAX * 0.5 * FL.dir; FL.T = TMAX * 0.5; FL.uy = -90 * G.k;
        liftFlakes(0.72, 230, 0);
        reviveGroup(NT - 1);
        bumpSound();
        still.face('surprised', 1200);
        tBump = performance.now();
        setHud('Bump!', 'It’s all flying again', 'That’s okay. Settling again is the skill.');
        await K.wait(700);
        talk(sync, LINES.oops, { mood: 'E45', moodMs: 1800, ms: 1800 });
        await K.wait(1700);
        if (S.destroyed) return;
        sync.place(home.sync.x, home.sync.y, 700);
        talk(still, LINES.again, { mood: 'calm', ms: 4600 });
        beginStill(2);
        void sz;
        await K.wait(4800);
        if (S.destroyed || phase !== 'still2') return;
        if (groupAlive(NT - 1)) talk(still, LINES.back, { mood: 'meditate', ms: 4200 });
      }
      async function finale() {
        phase = 'finale';
        restSpec = null; K.guide(null);
        dissolveGroup(NT - 1);
        BR.on = false; hNum.textContent = '';
        settleChime(9);
        music.level(0.55); music.tempo(66);
        setHud('Re-settled in ' + resettle.toFixed(1) + ' s', 'Crystal clear', 'The village is waking up.');
        still.base('glow'); sync.base('E67');
        talk(still, care ? LINES.care : LINES.lights, { mood: 'glow', ms: 3800 });
        FX.glowT = 1; FX.duskT = 1;
        await K.wait(500);
        FX.lights = true; FX.lightT = 0;
        if (V && V.extras.bell && au()) { [0, 0.5, 1].forEach(d => A.chime(A.note('G4'), { when: A.now() + d, vol: 0.06, dur: 2.4 })); }
        await K.wait(1100);
        FX.smoke = true;
        await K.wait(800);
        FX.train = true; FX.trainU = -0.05; whistle();
        const fin = K.finale('fireflies', { colors: ['#ffe9a8', '#ffd37a', '#fff4d6'], chord: SEA.chord, ms: 4600, z: 26 });
        await K.wait(1400);
        if (S.destroyed) return;
        sync.face('E86'); FX.flash = 1; shutter();
        talk(sync, LINES.photo, { mood: 'E86', ms: 2600 });
        await K.wait(1600);
        if (S.destroyed) return;
        // onto the shelf
        shelfData[SCN.name] = SEA.key; S.store.set('snow-globe:shelf', shelfData);
        FX.placeT = now; FX.shelfT = 1;
        if (au()) { A.wood(undefined, 0.2, 0.9); A.chime(A.note('E6'), { vol: 0.06, dur: 1.8 }); }
        const count = SCENES.filter(s => shelfData[s.name]).length;
        if (G.phone) { hud.classList.remove('sg-swap'); hud.classList.add('sg-off'); }
        capEl.hidden = false; capEl.textContent = '';
        capEl.append(h('b', { text: 'Your shelf: ' + count + ' of ' + SCENES.length + ' globes' }), h('span', { text: count < SCENES.length ? 'A new village joins it next visit' : 'Every village collected. They take turns now.' }));
        placeCap();
        capEl.classList.remove('sg-in'); void capEl.offsetWidth; capEl.classList.add('sg-in');
        const sl = G.slots[SCN_I]; if (sl) PO.emit('star', sl.x, sl.y, 14, { colors: ['#fff6d8', '#ffe6a8'], speed: [30, 110] });
        await fin;
        await K.wait(900);
        if (S.destroyed) return;
        end(count);
      }
      function end(count) {
        if (finished) return;
        const stillPct = Math.round((stillN > 0 ? stillAcc / stillN : 1) * 100), secs = Math.round(resettle * 10) / 10;
        const badges = [];
        const pb = K.best('resettle-' + inten, secs, 'lower');
        if (pb.isNew) badges.push('New best: re-settled in ' + secs.toFixed(1) + ' s'); else if (pb.first) badges.push('First re-settle: ' + secs.toFixed(1) + ' s');
        const tier = K.tier(stillPct / 100, [0.6, 0.8, 0.93]); if (tier) badges.push(tier + ': ' + stillPct + '% still');
        const col = K.collect(SCN.name);
        badges.push((col.isNew ? 'New globe: ' : 'Back on the shelf: ') + SCN.name + ' (' + count + ' of ' + SCENES.length + ')');
        ctx.track('done', { still: stillPct, resettle: Math.round(resettle), scene: SCN_I, season: SEA.key });
        finished = true; phase = 'end';
        ctx.finish({
          title: 'Crystal clear', mood: 'glow',
          lines: ['Shook it up, then held still: settled twice', 'Re-settled in ' + secs.toFixed(1) + ' s after the bump', 'Inside today: ' + SCN.name + ', ' + SEA.name],
          share: 'Shook it up, held still, watched it settle.',
          badges: badges.slice(0, 4)
        });
      }

      S.on('theme', () => { el.classList.toggle('sg-bright', !K.dark()); C = null; MINI = {}; });
      cv.onResize(() => { layout(); if (flakesPlaced && phase === 'intro') restFlakes(); });
      (async () => {
        await K.intro({ title: 'Snow Globe', sub: 'Your thoughts swirl like snow. Shake them up, then hold still and watch everything settle.', how: 'Swipe fast to shake it. Then rest a finger on the glass, perfectly still, and breathe with the ring.', char: 'still', mood: 'meditate' });
        if (S.destroyed) return;
        phase = 'hello';
        setHud(SCN.name + ' · ' + SEA.name, 'Your snow globe', TH.generic ? 'The day’s noise is in here. Give it a good shake.' : 'Your thoughts are in here. Give it a good shake.');
        if (ctx.text && an.kind && an.kind.length < 96 && !care) { talk(still, { Jolly: an.kind, Cheeky: an.kind, Unfiltered: an.kind }, { mood: 'calm', ms: 2700 }); await K.wait(2800); }
        talk(still, TH.generic ? LINES.helloG : LINES.hello, { mood: 'happy', ms: 4400 });
        sync.face('wow', 1600);
        K.guide({ id: 'shake', g: 'sweep', target: () => ({ x: G.cx, y: G.cy + G.R * 0.4 }), label: 'SWIPE FAST TO SHAKE', d: Math.round(G.R * 0.42), place: 'below', delay: 900 });
        await new Promise(res => { settledResolve = res; });
        if (S.destroyed) return;
        await K.wait(3600);
        if (S.destroyed) return;
        await twist();
      })();

      return {
        async autoplay() {
          while (phase !== 'hello') await K.wait(100);
          await K.wait(700);
          let n = 0;
          while ((phase === 'hello' || phase === 'shake') && n < 60) {
            const c = { x: G.cx, y: G.cy - G.R * 0.1 }, dir = n % 2 ? -1 : 1, wob = (n % 3 - 1) * 14;
            await K.sim.drag(touch, { x: c.x - dir * 55, y: c.y + wob }, { x: c.x + dir * 70, y: c.y - wob }, 110, 4);
            n++;
          }
          while (phase !== 'still1') await K.wait(100);
          await K.wait(900);
          const px = G.cx + G.R * 0.1, py = G.cy - G.R * 0.1;
          const hnd = await K.sim.press(touch, px, py);
          while (phase !== 'finale' && phase !== 'end') await K.wait(200);
          hnd.up(px, py);
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
