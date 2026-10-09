/* 015 Squish — Reset · QUIET · Panic / Body Alarm
 * Mechanism: progressive muscle relaxation (Jacobson 1938; Bernstein & Borkovec 1973). Tensing one muscle group gently
 * (about 70%, never to pain) for about five seconds and then letting go all at once lowers physical arousal, and the
 * contrast teaches the body what letting go feels like. The player squeezes a soft-body jelly (hold) while tensing the
 * same muscles, lets go (release) and rests while it melts; a body map glows wherever they have let go.
 * Verb: squeeze (hold to tense with the jelly, release to melt). Finale: the last squeeze is everything at once; the jelly
 * puddles into a warm open-air bath, its warmth rises into a starry outline of the jelly that the still water reflects,
 * and the body map glows head to toe.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const SAFE = 'Gently, about 70%, never to pain.';
  const WHITE = [255, 255, 255];

  /* Today's jelly friend: one a day, collected over visits (deterministic, never a random reward). */
  const FRIENDS = [
    { name: 'Strawberry Wobbler', c: '#ff5c8d', mould: 'dome', bits: 'seed', chord: ['C4', 'E4', 'G4', 'B4'] },
    { name: 'Lime Wiggle', c: '#69cf55', mould: 'castle', bits: 'bubble', chord: ['D4', 'F#4', 'A4', 'C#5'] },
    { name: 'Blueberry Bloop', c: '#6c7bff', mould: 'bell', bits: 'berry', chord: ['F3', 'A3', 'C4', 'E4'] },
    { name: 'Mango Squidge', c: '#ffa53a', mould: 'mochi', bits: 'cube', chord: ['G3', 'B3', 'D4', 'F#4'] },
    { name: 'Grape Jiggle', c: '#a465ff', mould: 'tier', bits: 'berry', chord: ['A3', 'C#4', 'E4', 'G#4'] },
    { name: 'Lemon Bounce', c: '#ffd23b', mould: 'bunny', bits: 'bubble', chord: ['E4', 'G#4', 'B4', 'D#5'] },
    { name: 'Peach Puddle', c: '#ff9a76', mould: 'dome', bits: 'cube', chord: ['C4', 'E4', 'G4', 'B4'] },
    { name: 'Cola Fizz', c: '#b4562f', mould: 'castle', bits: 'fizz', deep: '#4a1d10', chord: ['D4', 'F#4', 'A4', 'C#5'] },
    { name: 'Matcha Mallow', c: '#9cc565', mould: 'mochi', bits: 'none', chord: ['F3', 'A3', 'C4', 'E4'] },
    { name: 'Raspberry Ripple', c: '#ea3f73', mould: 'bell', bits: 'seed', chord: ['G3', 'B3', 'D4', 'F#4'] },
    { name: 'Coconut Cloud', c: '#f2e8d8', mould: 'tier', bits: 'flake', deep: '#9c8a74', chord: ['A3', 'C#4', 'E4', 'G#4'] },
    { name: 'Watermelon Wub', c: '#ff6a7c', mould: 'dome', bits: 'pip', chord: ['E4', 'G#4', 'B4', 'D#5'] },
    { name: 'Blue Lagoon', c: '#36cdf0', mould: 'bunny', bits: 'bubble', chord: ['C4', 'E4', 'G4', 'B4'] },
    { name: 'Cherry Squish', c: '#e0283f', mould: 'castle', bits: 'cherry', chord: ['D4', 'F#4', 'A4', 'C#5'] }
  ];
  /* Jelly moulds: superellipse exponent n, width/height factors, flare at the base. */
  const SHAPES = {
    dome: { n: 2.6, w: 1, h: 1, flare: 0.1 },
    castle: { n: 3.3, w: 1, h: 1, flare: 0.07 },
    bell: { n: 2.3, w: 1.04, h: 1.08, flare: 0 },
    tier: { n: 3.1, w: 1, h: 1.04, flare: 0.05 },
    mochi: { n: 2.2, w: 1.12, h: 0.74, flare: 0.03 },
    bunny: { n: 2.5, w: 0.98, h: 0.8, flare: 0.08 }
  };
  const ROOM = {
    dark: { top: '#2b1c3e', bot: '#462e55', tile: [255, 226, 240], tileA: 0.05, gloss: 0.05, lamp: 'rgba(255, 176, 128, 0.32)', slab: '#6b5878', slabHi: '#a38fb1', front: '#33243f', slat: 'rgba(0, 0, 0, 0.22)', sky: ['#17214c', '#6a4c86'], frame: '#e6cfae', wood: '#8a5c46', pot: '#c96f58', leaf: '#4f9a78' },
    bright: { top: '#ffece3', bot: '#ffd5c6', tile: [255, 255, 255], tileA: 0.45, gloss: 0.6, lamp: 'rgba(255, 244, 228, 0.42)', slab: '#fff8f2', slabHi: '#ffffff', front: '#bfe6d8', slat: 'rgba(30, 90, 76, 0.12)', sky: ['#83c9ff', '#e2f3ff'], frame: '#ffffff', wood: '#dfa682', pot: '#e9876d', leaf: '#5aae84' }
  };
  const NIGHT = {
    dark: { top: '#050920', mid: '#141a46', low: '#3d2c62', hillA: '#1b1a42', hillB: '#100f2e', ground: '#0b0b20', rock: [[74, 69, 98], [92, 84, 116], [60, 56, 84]] },
    bright: { top: '#2b2f72', mid: '#5f5aa6', low: '#efa6b6', hillA: '#4a4383', hillB: '#373168', ground: '#28244f', rock: [[122, 114, 156], [138, 128, 170], [104, 98, 140]] }
  };
  const RD = {
    hands: { title: 'Hands', regions: ['hands'], do: 'Make two fists', notice: 'Notice your hands: warm, heavy, loose',
      cue: { Jolly: 'Hands first. Make two fists and squeeze along with the jelly.', Cheeky: 'Fists, please. Like you’re guarding the last biscuit.', Unfiltered: 'Make fists. Squeeze with it.' },
      melt: { Jolly: 'Feel your hands now. Warm, heavy, loose.', Cheeky: 'Noodle hands. Notice that.', Unfiltered: 'Notice your hands. Heavy. Warm.' } },
    feet: { title: 'Feet', regions: ['feet'], do: 'Curl your toes', notice: 'Let your toes spread out and soften',
      cue: { Jolly: 'Now your feet. Curl your toes and squeeze.', Cheeky: 'Toes! Curl them like a cat kneading a blanket.', Unfiltered: 'Curl your toes. Hold.' },
      melt: { Jolly: 'Let your toes spread. Feel them soften.', Cheeky: 'Toes: officially off duty.', Unfiltered: 'Feet soft. Notice it.' } },
    shoulders: { title: 'Shoulders', regions: ['shoulders'], do: 'Lift your shoulders up to your ears', notice: 'Let them drop. Feel how far they fall',
      cue: { Jolly: 'Shoulders up to your ears, like a giant shrug.', Cheeky: 'Shrug like someone just asked you to do their taxes.', Unfiltered: 'Shoulders up to your ears. Hold.' },
      melt: { Jolly: 'Let them drop. Feel how far they come down.', Cheeky: 'Shoulders, meet floor. Well, nearly.', Unfiltered: 'Shoulders down. Notice the drop.' } },
    face: { title: 'Face', regions: ['face'], do: 'Scrunch your face: eyes, nose, jaw', notice: 'Smooth forehead, soft jaw, loose tongue',
      cue: { Jolly: 'Now scrunch your whole face, like you bit a lemon.', Cheeky: 'Best lemon face. Nobody’s watching. Probably.', Unfiltered: 'Scrunch your face. Eyes, nose, jaw.' },
      melt: { Jolly: 'Smooth face, soft jaw. Lovely.', Cheeky: 'Unclench that jaw. There it is.', Unfiltered: 'Face soft. Jaw loose.' } },
    all: { title: 'Everything', regions: ['hands', 'feet', 'shoulders', 'face', 'core'], do: 'Fists, toes, shoulders, face: all at once', big: true,
      cue: { Jolly: 'Last one, the big one: everything at once!', Cheeky: 'Grand finale. Fists, toes, shoulders, face. Full jelly.', Unfiltered: 'Everything. All at once. Then let go.' } }
  };
  const LINES = {
    hello: { Jolly: 'Meet {n}, today’s jelly! Go on, give it a poke.', Cheeky: 'This is {n}. Squishy, wobbly, judgement-free. Poke it.', Unfiltered: '{n}. Today’s jelly. Poke it.' },
    poked: { Jolly: 'So wobbly! Your muscles can do this too. Let’s squeeze together.', Cheeky: 'Look at it go. Right, your turn to be the jelly.', Unfiltered: 'Wobbly. Good. Now squeeze with it.' },
    hold: { Jolly: 'Squeeze… breathe in… hold it there.', Cheeky: 'Hold it… hold it… you’re doing great, scrunchy.', Unfiltered: 'Hold. Breathe in.' },
    letgo: { Jolly: 'And… let go!', Cheeky: 'Aaand drop it!', Unfiltered: 'Let go.' },
    nag: { Jolly: 'Whenever you’re ready, let it all go.', Cheeky: 'You can let go now. The jelly insists.', Unfiltered: 'Let go now.' },
    early: { Jolly: 'Nearly! Hold it about {s} seconds, then let go.', Cheeky: 'Speedy squeeze! Stay with it about {s} seconds.', Unfiltered: 'Longer. About {s} seconds.' },
    wobble: { Jolly: 'Ha, wobbly! Let it settle, and you too.', Cheeky: 'Hands off the melting jelly. It’s busy.', Unfiltered: 'Let it settle.' },
    bath: { Jolly: 'Ahh. Everything off. Just soak in it.', Cheeky: 'Full puddle. Honestly, iconic.', Unfiltered: 'Everything off. Soak.' },
    float: { Jolly: 'Your thought’s still here. It’s just floating now, not sitting on you.', Cheeky: 'That thought? Still here. Floating, not squashing you.', Unfiltered: 'The thought is still here. It floats now. It isn’t pressing.' },
    dayFloat: { Jolly: 'The day’s still there. It’s just floating now, not sitting on you.', Cheeky: 'The whole day? Still there. Floating, not squashing you.', Unfiltered: 'The day is still there. It floats now. It isn’t pressing.' },
    careFloat: { Jolly: 'You gave your body a proper rest. The rest can wait for the right help.', Cheeky: 'You gave your body a proper rest. The rest can wait for the right help.', Unfiltered: 'Your body got a rest. The rest can wait for the right help.' },
    end: { Jolly: 'Head to toe, all let go. Stay soft a minute.', Cheeky: 'Fully melted. Ten out of ten jelly.', Unfiltered: 'All of you, let go. Stay there a bit.' }
  };

  const rgbOf = (hex) => { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : Math.max(0, Math.min(1, a)).toFixed(3)) + ')';
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* A mould outline in unit space (base at y = 0, up is negative), resampled to n points evenly spaced by arc length. */
  function outline(kind, n) {
    const S = SHAPES[kind], D = 480, px = [], py = [];
    for (let i = 0; i < D; i++) {
      const a = -Math.PI / 2 + (i / D) * TAU, c = Math.cos(a), s = Math.sin(a), e = 2 / S.n;
      let x = 0.5 * Math.sign(c) * Math.pow(Math.abs(c), e);
      let y = -0.5 + 0.57 * Math.sign(s) * Math.pow(Math.abs(s), e);
      const u = Math.max(0, Math.min(1, -y));
      x *= S.w * (1 + S.flare * (1 - u));
      if (kind === 'bell') x *= 0.68 + 0.4 * Math.pow(1 - u, 1.25);
      if (kind === 'tier') x *= 0.72 + 0.28 * (1 - smooth(0.46, 0.6, u));
      if (kind === 'castle') { x *= 1 + 0.035 * Math.sin(u * TAU * 2.5); if (s < 0 && u > 0.72) y += 0.05 * Math.pow(Math.cos(x * TAU * 3.5), 2) * Math.min(1, (u - 0.72) * 6); }
      if (kind === 'bunny' && s < 0) y -= 0.5 * Math.exp(-Math.pow((Math.abs(x) - 0.19) / 0.062, 2)) * smooth(0.5, 0.82, u);
      px.push(x); py.push(Math.min(0, y) * S.h);
    }
    const L = [0];
    for (let i = 1; i <= D; i++) { const j = i % D; L.push(L[i - 1] + Math.hypot(px[j] - px[i - 1], py[j] - py[i - 1])); }
    const tot = L[D], ox = new Float32Array(n), oy = new Float32Array(n);
    let j = 0;
    for (let k = 0; k < n; k++) {
      const tl = (k / n) * tot;
      while (j < D - 1 && L[j + 1] < tl) j++;
      const f = (tl - L[j]) / Math.max(1e-6, L[j + 1] - L[j]), j2 = (j + 1) % D;
      ox[k] = px[j] + (px[j2] - px[j]) * f; oy[k] = py[j] + (py[j2] - py[j]) * f;
    }
    return { x: ox, y: oy };
  }

  /* Body map: a soft figure; regions glow where the player has let go. */
  const FIGURE = '<svg viewBox="0 0 100 194" aria-hidden="true">' +
    '<g class="sq-r" data-r="core"><rect x="44" y="37" width="12" height="13" rx="4"/><path d="M26 54 Q50 47 74 54 L72 106 Q50 116 28 106 Z"/>' +
    '<rect x="10" y="55" width="12" height="56" rx="6" transform="rotate(6 16 55)"/><rect x="78" y="55" width="12" height="56" rx="6" transform="rotate(-6 84 55)"/>' +
    '<rect x="31" y="104" width="16" height="74" rx="8"/><rect x="53" y="104" width="16" height="74" rx="8"/></g>' +
    '<path class="sq-r" data-r="shoulders" d="M15 68 Q15 50 33 47 L67 47 Q85 50 85 68 Q68 60 50 60 Q32 60 15 68 Z"/>' +
    '<g class="sq-r" data-r="hands"><circle cx="10" cy="117" r="7.5"/><circle cx="90" cy="117" r="7.5"/></g>' +
    '<g class="sq-r" data-r="feet"><ellipse cx="38" cy="185" rx="11" ry="7"/><ellipse cx="62" cy="185" rx="11" ry="7"/></g>' +
    '<g class="sq-r" data-r="face"><circle cx="50" cy="22" r="16"/></g></svg>';

  (env.games = env.games || []).push({
    id: 'squish', mode: 'reset', name: 'Squish', verb: 'squeeze', family: 'QUIET', minutes: 2,
    parents: ['Panic / Body Alarm', 'Sleep / Winding Down', 'Emotion'],
    cast: ['sync', 'still'], poster: { char: 'sync', mood: 'calm' },
    fonts: ['Bagel+Fat+One', 'Quicksand:wght@600;700'],
    tagline: 'Squeeze a wobbly jelly with your whole body, then melt with it.',
    why: 'For a tense, buzzing body: tense gently, let go, and feel the difference.',
    css: `
.g-squish { --sq-ink: #fff3ea; --sq-ink2: rgba(255, 236, 226, 0.86); --sq-halo: rgba(30, 12, 42, 0.6); --sq-card: rgba(40, 22, 54, 0.66); --sq-line: rgba(255, 236, 226, 0.16);
  --sq-fig: rgba(255, 236, 226, 0.14); --sq-figline: rgba(255, 236, 226, 0.45); background: #2b1c3e; }
.g-squish.sq-bright { --sq-ink: #4a1d3d; --sq-ink2: rgba(74, 29, 61, 0.86); --sq-halo: rgba(255, 246, 240, 0.85); --sq-card: rgba(255, 250, 246, 0.8); --sq-line: rgba(74, 29, 61, 0.14);
  --sq-fig: rgba(74, 29, 61, 0.1); --sq-figline: rgba(74, 29, 61, 0.4); background: #ffece3; }
.g-squish .sq-pad { position: absolute; z-index: 20; touch-action: none; cursor: grab; border-radius: 46% 46% 30% 30%; outline: none; -webkit-tap-highlight-color: transparent; }
.g-squish .sq-pad:active { cursor: grabbing; }
.g-squish .sq-pad:focus-visible { box-shadow: 0 0 0 3px rgba(255, 211, 107, 0.85); }
.g-squish .sq-step { position: absolute; z-index: 25; left: 50%; width: min(440px, calc(100% - 28px)); transform: translateX(-50%); text-align: center; color: var(--sq-ink); pointer-events: none;
  padding: 8px 14px 12px; background: radial-gradient(closest-side, var(--sq-halo), rgba(0, 0, 0, 0)); transition: opacity 0.6s ease; }
.g-squish .sq-step.sq-off { opacity: 0 !important; }
.g-squish .sq-step > [hidden] { display: none; }
.g-squish .sq-kicker { font: 700 12px/1.2 "Quicksand", var(--font-ui); letter-spacing: 0.2em; text-transform: uppercase; color: var(--sq-ink2); }
.g-squish .sq-title { font: 800 38px/1.02 "Bagel Fat One", "Arial Rounded MT Bold", var(--font-display); font-synthesis: none; letter-spacing: 0.01em; margin-top: 2px;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.12); }
.g-squish .sq-do { font: 700 17px/1.25 "Quicksand", var(--font-ui); margin-top: 5px; text-wrap: balance; }
.g-squish .sq-safe { font: 700 14px/1.3 "Quicksand", var(--font-ui); margin-top: 3px; color: var(--sq-ink2); }
.g-squish .sq-swap { animation: squish-swap 0.45s cubic-bezier(.2, 1.3, .4, 1) both; }
@keyframes squish-swap { from { opacity: 0; translate: 0 8px; scale: 0.96; } to { opacity: 1; translate: 0 0; scale: 1; } }
.g-squish .sq-flagw { position: absolute; z-index: 18; left: 0; top: 0; width: 0; height: 0; pointer-events: none; will-change: transform; opacity: 0; transition: opacity 0.6s ease; }
.g-squish .sq-flagw.sq-on { opacity: 1; }
.g-squish .sq-flag { position: absolute; left: 0; bottom: 0; transform: translateX(-50%); width: max-content; max-width: min(300px, calc(100cqw - 48px)); padding: 6px 12px 5px; border-radius: 8px;
  background: #fffaf2; color: #4a1d3d; font: 700 15px/1.2 "Quicksand", var(--font-ui); letter-spacing: 0.04em; text-align: center; text-wrap: balance;
  box-shadow: 0 5px 12px rgba(40, 10, 30, 0.3), inset 0 -2px 0 rgba(74, 29, 61, 0.08); }
.g-squish .sq-flag.sq-float { max-width: min(150px, 40cqw); }
.g-squish .sq-flag::after { content: ""; position: absolute; left: 50%; bottom: -4px; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: #e86a8e; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); }
.g-squish .sq-body { position: absolute; z-index: 22; display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 4px; padding: 8px 6px 9px;
  border-radius: 22px; background: var(--sq-card); border: 1px solid var(--sq-line); box-shadow: 0 10px 26px rgba(20, 6, 30, 0.26); pointer-events: none; }
.g-squish .sq-body svg { flex: 1 1 auto; width: 100%; min-height: 0; overflow: visible; }
.g-squish .sq-body-k { font: 700 12px/1 "Quicksand", var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: var(--sq-ink2); white-space: nowrap; }
.g-squish .sq-body-n { font: 700 13px/1 "Quicksand", var(--font-ui); color: var(--sq-ink); white-space: nowrap; }
.g-squish .sq-r { fill: var(--sq-fig); stroke: var(--sq-figline); stroke-width: 1.4; transition: fill 1.2s ease, stroke 1.2s ease; }
.g-squish .sq-r.sq-warm { fill: #ffcd85; stroke: #fff1cf; filter: drop-shadow(0 0 4px rgba(255, 190, 100, 0.95)); }
.g-squish .sq-r.sq-cue { stroke: #ffd36b; stroke-width: 2.6; animation: squish-cue 1.3s ease-in-out infinite; }
.g-squish .sq-r.sq-tense { fill: #ff6b74; stroke: #ffc2b8; transition: fill 0.25s ease; animation: squish-tense 0.45s ease-in-out infinite alternate; }
.g-squish .sq-r.sq-glow { fill: #ffe3a6; stroke: #fff7e0; filter: drop-shadow(0 0 6px rgba(255, 214, 140, 1)); transition: fill 1.4s ease, stroke 1.4s ease; }
@keyframes squish-cue { 50% { stroke-opacity: 0.3; } }
@keyframes squish-tense { to { fill: #ff4054; } }
@container (min-width: 700px) { .g-squish .gk-finale-text { top: 17% !important; } }
.g-squish .gk-finale-text { top: 24%; font-family: "Bagel Fat One", "Arial Rounded MT Bold", var(--font-display); font-weight: 800; font-synthesis: none; color: #fff6ea; }
.g-squish .gk-char.sq-in { animation: squish-in 1s cubic-bezier(.2, 1.2, .4, 1) both; }
@keyframes squish-in { from { opacity: 0; transform: translateY(26px) scale(0.86); } to { opacity: 1; transform: none; } }
.g-squish.sq-reduced .sq-r, .g-squish.sq-reduced .sq-step { animation: none !important; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity;
      let care = an.safety === 'care';
      const line = (o) => (care ? o.Jolly : ctx.line(o));
      const visits = K.visits();
      // K.dailyPick multiplies the day by 7, which only ever reaches 2 of 14 friends; step through all of them instead
      const DAY = K.daily(), FR = FRIENDS[((DAY % FRIENDS.length) * 5 + 3) % FRIENDS.length], SH = SHAPES[FR.mould];
      const LEVEL = [0.6, 0.7, 0.74][inten], BIGLEVEL = [0.86, 0.95, 1][inten];
      const HOLD = [3.5, 5, 5][inten], BIGHOLD = [4.5, 6, 6.5][inten], MELT = [9.5, 8.5, 8][inten];
      const ORDER = inten === 2 ? ['hands', 'feet', 'shoulders', 'face', 'all'] : ['hands', 'shoulders', 'face', 'all'];
      const NR = ORDER.length;
      const base = rgbOf(FR.c);
      const COL = { base, light: mixc(base, WHITE, 0.5), deep: FR.deep ? rgbOf(FR.deep) : mixc(base, [58, 10, 44], 0.48), rim: mixc(base, WHITE, 0.72), glow: mixc(base, [255, 246, 214], 0.6), hot: [255, 52, 70] };
      const friendsSeen = K.collection().filter(n => n !== FR.name).map(n => FRIENDS.find(f => f.name === n)).filter(Boolean).slice(-4).reverse();

      /* ---------------- state ---------------- */
      const N = 44, GRAV = 1500;
      const B = { x: new Float32Array(N), y: new Float32Array(N), vx: new Float32Array(N), vy: new Float32Array(N), ax: new Float32Array(N), ay: new Float32Array(N),
        qx: new Float32Array(N), qy: new Float32Array(N), bx: new Float32Array(N), bot: new Uint8Array(N), ph: new Float32Array(N), hl: [], hr: [], top: 0, yBot: 0,
        s: 0, sT: 0, m: 0, mT: 0, pd: 0, pdT: 0, trem: 0, cx: 0, cy: 0, th: 0, minX: 0, maxX: 0, yTop: 0, hNow: 1, wNow: 1, grab: null, acc: 0, time: 0, impact: 0, push: null };
      const G = { w: 0, H: 0, phone: true }, Pl = { x: 0, y: 0, rx: 0, ry: 0 }, Cn = { y: 0 }, Pool = { rx: 0, ry: 0 };
      let JW = 0, JH = 0, built = false, padL = 0, padT = 0, flagW = 120, flagH = 30;
      let phase = 'intro', pressing = false, pokes = 0, holdT = 0, holdT0 = 0, curHold = HOLD, letgoAt = 0, heat = 0, overNag = 0, relInfo = null;
      let cur = RD.hands, roundIdx = -1, meltTouches = 0, finished = false, landed = false, dropping = false, wobbleSaid = false;
      let night = 0, nightT = 0, pool = 0, poolT = 0, pw = 0, pwT = 0, cons = -1, consT = -1, flagFloat = 0, flagFloatT = 0, now = 0;
      let nextCreak = 0, lastBlub = 0, hAvg = 0, hPrev = 0, hDir = 0, lastMs = performance.now();
      const qual = { acc: 0, n: 0, q: 1 };
      const scores = [], stills = [];
      const finger = { x: 0, y: 0, x0: 0, y0: 0 };
      const FACE = { eyes: 'open', mouth: 'smile', until: 0, then: null, blink: 0, nextBlink: 2 };

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const P = K.particles({ max: 260 });
      const stepEl = h('div', { class: 'sq-step', 'aria-live': 'polite' }, h('div', { class: 'sq-kicker' }), h('div', { class: 'sq-title' }), h('div', { class: 'sq-do' }), h('div', { class: 'sq-safe' }));
      const [stK, stT, stD, stS] = Array.from(stepEl.children);
      const flagWrap = h('div', { class: 'sq-flagw', 'aria-hidden': 'true' });
      const flagEl = h('div', { class: 'sq-flag gk-user', text: flagText() });
      flagWrap.append(flagEl);
      const bodyEl = h('div', { class: 'sq-body', role: 'img', 'aria-label': 'Body map: it glows wherever you have let go' },
        h('div', { style: { flex: '1 1 auto', width: '100%', minHeight: '0', display: 'flex' }, html: FIGURE }), h('span', { class: 'sq-body-n', text: '0 of ' + NR }), h('span', { class: 'sq-body-k', text: 'let go' }));
      const bodyN = bodyEl.querySelector('.sq-body-n');
      const pad = h('div', { class: 'sq-pad', role: 'button', tabindex: '0', 'aria-label': 'The jelly. Press and hold to squeeze together, let go to melt.' });
      el.append(stepEl, flagWrap, bodyEl, pad);
      const sync = K.character('sync', { side: 'right', mood: 'calm', x: 10, y: 62, size: 76 });
      let stillC = null;
      el.classList.toggle('sq-bright', !K.dark());
      el.classList.toggle('sq-reduced', K.reduced());
      S.on('motion', () => el.classList.toggle('sq-reduced', K.reduced()));

      const regionEls = {};
      bodyEl.querySelectorAll('.sq-r').forEach(n => { const r = n.getAttribute('data-r'); (regionEls[r] = regionEls[r] || []).push(n); });
      const body = {
        set(regs, state) {
          regs.forEach(r => (regionEls[r] || []).forEach(e => {
            e.classList.remove('sq-cue', 'sq-tense');
            if (state === 'warm') e.classList.add('sq-warm');
            else if (state === 'cue' || state === 'tense') e.classList.add('sq-' + state);
          }));
        },
        count(n) { bodyN.textContent = n + ' of ' + NR; },
        all() {
          ['face', 'shoulders', 'core', 'hands', 'feet'].forEach((r, i) => S.later(() => (regionEls[r] || []).forEach(e => { e.classList.remove('sq-cue', 'sq-tense', 'sq-warm'); e.classList.add('sq-glow'); }), 120 + i * 360));
          bodyN.textContent = 'Head to toe';
          bodyEl.querySelector('.sq-body-k').textContent = 'all let go';
        }
      };

      function flagText() {
        if (care) return 'A SMALL BREAK';
        if (!ctx.text) return 'THE WHOLE DAY';
        const c = (an.core && an.core.label) || (an.strands && an.strands[0] && an.strands[0].label) || 'THE WHOLE DAY';
        return String(c).toUpperCase();
      }
      // a later (AI) analysis can only make things gentler: 'care' switches care on at any point; new words are used only before the first squeeze
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => {
        if (!a || a.safety === 'support') return;
        if (a.safety === 'care' && !care) { care = true; flagEl.textContent = flagText(); S.later(measureFlag, 60); return; }
        if (!care && (phase === 'intro' || phase === 'hello')) { an = a; flagEl.textContent = flagText(); S.later(measureFlag, 60); }
      }, () => {});

      function setStep(k, t, d, s) {
        stepEl.classList.remove('sq-off');
        if (k != null) { stK.textContent = k; stK.hidden = !k; }
        if (t != null) { stT.textContent = t; stT.hidden = !t; }
        if (d != null) { stD.textContent = d; stD.hidden = !d; }
        if (s != null) { stS.textContent = s; stS.hidden = !s; }
        stepEl.classList.remove('sq-swap'); void stepEl.offsetWidth; stepEl.classList.add('sq-swap');
      }

      /* ---------------- audio ---------------- */
      const music = K.music('calm'); music.level(0.5);
      const amb = K.ambience('room'); amb.level(0.2, 1.5);
      let creak = null, inhale = null, water = null;
      const au = () => !!A.ctx;
      function loops() { if (!au()) return false; if (!creak) { creak = A.loop({ filter: 'bandpass', freq: 420, q: 11 }); inhale = A.loop({ pink: true, filter: 'bandpass', freq: 520, q: 0.9 }); } return true; }
      S.onDestroy(() => { [creak, inhale, water].forEach(l => { if (l) l.stop(); }); });
      function squelch(v, pitch) {
        if (!au()) return; v = v || 1; pitch = pitch || 1;
        A.tone({ type: 'sine', freq: 310 * pitch, to: 105 * pitch, glide: 0.15, dur: 0.22, vol: 0.17 * v, attack: 0.004 });
        A.noise({ filter: 'bandpass', freq: 950 * pitch, to: 380 * pitch, q: 2.4, dur: 0.12, vol: 0.1 * v });
        A.sync('squelch', performance.now());
      }
      function blub(amt) { if (!au()) return; const f = 190 + 120 * Math.random() + 160 * (1 - amt); A.tone({ type: 'sine', freq: f, to: f * 1.5, glide: 0.07, dur: 0.11, vol: 0.02 + 0.06 * amt, attack: 0.005, verb: 0.15 }); }
      function creakTick() { if (!au()) return; const f = 72 + Math.random() * 40; A.tone({ type: 'sawtooth', freq: f, to: f * 0.78, glide: 0.18, dur: 0.22, vol: 0.05, lp: 620, attack: 0.02 }); A.noise({ filter: 'bandpass', freq: 1300 + Math.random() * 700, q: 9, dur: 0.06, vol: 0.03 }); }
      function exhale(big) { if (!au()) return; A.noise({ pink: true, filter: 'bandpass', freq: 1150, to: 250, q: 0.8, dur: big ? 5.4 : 4, attack: 0.3, vol: 0.12 }); A.noise({ pink: true, filter: 'lowpass', freq: 520, to: 170, dur: big ? 5 : 3.6, attack: 0.5, vol: 0.06 }); A.sync('exhale', performance.now()); }
      function bloomTone(i) { if (!au()) return; const n = FR.chord[i % FR.chord.length]; A.tone({ type: 'sine', freq: A.note(n) * 2, dur: 2.6, vol: 0.05, attack: 0.5, verb: 0.5 }); A.pad(FR.chord.map(x => A.note(x)), { dur: 5.5, vol: 0.12, attack: 0.9 }); }

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, H, phone });
        const headTop = phone ? 152 : 70, headBot = headTop + (phone ? 104 : 112);
        Pl.x = Math.round(w / 2);
        Pl.y = Math.round(H - (phone ? Math.min(290, H * 0.34) : 230));
        Cn.y = Pl.y + (phone ? 36 : 44);
        let jw = (phone ? Math.min(244, w * 0.62) : Math.min(330, w * 0.26)) / Math.max(1, SH.w);
        const tall = 0.84 * SH.h * (FR.mould === 'bunny' ? 1.36 : 1), room = Pl.y - headBot - 78;
        if (jw * tall > room) jw = Math.max(120, room / tall);
        const changed = Math.abs(jw - JW) > 1;
        JW = jw; JH = jw * 0.84;
        Pl.rx = JW * 0.74 * Math.max(1, SH.w); Pl.ry = Math.max(12, JW * 0.105);
        Pool.rx = phone ? Math.min(w * 0.42, JW * 0.86) : Math.min(300, w * 0.26, JW * 1.1); Pool.ry = Pool.rx * 0.27;
        stepEl.style.top = headTop + 'px';
        padL = Pl.x - JW * 0.85; padT = Pl.y - JH * SH.h * 1.3 - 36;
        Object.assign(pad.style, { left: padL + 'px', top: padT + 'px', width: (JW * 1.7) + 'px', height: (Pl.y - padT + 34) + 'px' });
        if (phone) { const top = Cn.y + 28, bh = Math.max(110, Math.min(206, H - 18 - top)), bw = Math.round(Math.min(116, bh * 0.58)); Object.assign(bodyEl.style, { left: '18px', top: top + 'px', width: bw + 'px', height: bh + 'px' }); }
        else Object.assign(bodyEl.style, { left: (w - 232) + 'px', top: '196px', width: '170px', height: '336px' });
        sync.side('right');
        if (phone) { sync.place(10, 62); sync.el.style.setProperty('--sz', '76px'); }
        else { sync.place(56, 246); sync.el.style.setProperty('--sz', '104px'); }
        if (stillC) placeStill();
        layoutStones(); layoutCons();
        if (changed || !built) { buildBody(phase === 'intro' || dropping); built = true; }
        BG = null;
        measureFlag();
      }
      function measureFlag() { if (S.destroyed) return; flagW = flagEl.offsetWidth || flagW; flagH = flagEl.offsetHeight || flagH; }
      try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => S.later(measureFlag, 30)); } catch (e) { /* no font api */ }

      /* ---------------- the jelly (soft body) ---------------- */
      function buildBody(drop) {
        const o = outline(FR.mould, N);
        let mx = 0, my = 0;
        for (let i = 0; i < N; i++) { B.qx[i] = o.x[i] * JW; B.qy[i] = o.y[i] * JH; mx += B.qx[i]; my += B.qy[i]; }
        mx /= N; my /= N;
        const off = drop ? -(Pl.y + 40) : 0;
        for (let i = 0; i < N; i++) {
          B.bot[i] = o.y[i] > -0.012 ? 1 : 0; B.bx[i] = B.qx[i]; B.ph[i] = Math.random() * TAU;
          B.x[i] = Pl.x + B.qx[i]; B.y[i] = Pl.y + B.qy[i] + off; B.vx[i] = 0; B.vy[i] = 0;
          B.qx[i] -= mx; B.qy[i] -= my;
        }
        B.hl = []; B.hr = []; let best = 1e9;
        const ang = [];
        for (let i = 0; i < N; i++) {
          const a = Math.atan2(B.qy[i], B.qx[i]); ang.push(a);
          if (a > -2.75 && a < -1.95) B.hl.push(i);
          if (a > -0.98 && a < -0.6) B.hr.push(i);
          if (a > -1.8 && a < -1.34 && Math.abs(B.qx[i]) < best) { best = Math.abs(B.qx[i]); B.top = i; }
        }
        B.hl.sort((a, b) => ang[a] - ang[b]); B.hr.sort((a, b) => ang[a] - ang[b]);
        B.s = B.sT; B.m = B.mT;
        measure();
        hAvg = hPrev = B.hNow;
      }
      function measure() {
        let minX = 1e9, maxX = -1e9, maxY = -1e9, cx = 0, cy = 0;
        for (let i = 0; i < N; i++) { const x = B.x[i]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (B.y[i] > maxY) maxY = B.y[i]; cx += x; cy += B.y[i]; }
        B.yBot = maxY;
        B.minX = minX; B.maxX = maxX; B.wNow = Math.max(8, maxX - minX); B.cx = cx / N; B.cy = cy / N;
        B.yTop = B.y[B.top]; B.hNow = Math.max(8, B.yBot - B.yTop);
      }
      function physics(dt) {
        B.acc = Math.min(B.acc + dt, 0.05);
        const hstep = 1 / 240;
        while (B.acc >= hstep) { B.acc -= hstep; stepOnce(hstep); }
      }
      function stepOnce(dt) {
        const x = B.x, y = B.y, vx = B.vx, vy = B.vy, ax = B.ax, ay = B.ay;
        const sq = B.s, ml = B.m, pd = B.pd;
        B.time += dt;
        const sx = (1 + 0.24 * sq) * (1 + 0.17 * ml) * (1 + 0.45 * pd);
        const sy = (1 - 0.44 * sq) * (1 - 0.27 * ml) * (1 - 0.75 * pd);
        const k = 300 * (1 + 1.3 * sq) * (1 - 0.6 * ml) * (1 - 0.8 * pd);
        const damp = 1.5 + 4.5 * sq + 0.9 * ml + 2.6 * pd;
        let cx = 0, cy = 0;
        for (let i = 0; i < N; i++) { cx += x[i]; cy += y[i]; }
        cx /= N; cy /= N;
        let num = 0, den = 0;
        for (let i = 0; i < N; i++) { const dx = x[i] - cx, dy = y[i] - cy, tx = B.qx[i] * sx, ty = B.qy[i] * sy; num += tx * dy - ty * dx; den += tx * dx + ty * dy; }
        const th = Math.atan2(num, den) * 0.55, co = Math.cos(th), si = Math.sin(th);
        const trem = B.trem, tt = B.time;
        for (let i = 0; i < N; i++) {
          const tx = B.qx[i] * sx, ty = B.qy[i] * sy;
          ax[i] = k * (cx + tx * co - ty * si - x[i]);
          ay[i] = k * (cy + tx * si + ty * co - y[i]) + GRAV;
          if (trem > 0) { ax[i] += trem * Math.sin(tt * 52 + i * 0.45 + B.ph[i] * 0.12); ay[i] += trem * 0.7 * Math.cos(tt * 46 + i * 0.3); }
          if (B.bot[i]) { ax[i] += 70 * (Pl.x + B.bx[i] * sx - x[i]); if (y[i] > Pl.y - 10) ay[i] += 900; }
        }
        for (let i = 0; i < N; i++) {
          const j = i + 1 === N ? 0 : i + 1;
          const dx = x[j] - x[i], dy = y[j] - y[i], d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const lx = (B.qx[j] - B.qx[i]) * sx, ly = (B.qy[j] - B.qy[i]) * sy, L = Math.sqrt(lx * lx + ly * ly);
          const rv = ((vx[j] - vx[i]) * dx + (vy[j] - vy[i]) * dy) / d;
          const f = (1800 * (d - L) + 16 * rv) / d;
          ax[i] += f * dx; ay[i] += f * dy; ax[j] -= f * dx; ay[j] -= f * dy;
        }
        const gr = B.grab;
        if (gr) {
          let ddx = gr.fx - gr.fx0, ddy = gr.fy - gr.fy0; const dl = Math.hypot(ddx, ddy), mx = 140;
          if (dl > mx) { ddx *= mx / dl; ddy *= mx / dl; }
          for (let q = 0; q < gr.idx.length; q++) { const i = gr.idx[q], w = gr.w[q]; ax[i] += 520 * w * (gr.ox[q] + ddx - x[i]) - 14 * w * vx[i]; ay[i] += 520 * w * (gr.oy[q] + ddy - y[i]) - 14 * w * vy[i]; }
        }
        const ps = B.push;
        if (ps) { // a finger resting on the jelly while squeezing leaves a soft dent
          const R = JW * 0.3;
          for (let i = 0; i < N; i++) { const dx = x[i] - ps.x, dy = y[i] - ps.y, d = Math.sqrt(dx * dx + dy * dy) || 1; if (d < R) { const f = 900 * (1 - d / R); ax[i] += dx / d * f; ay[i] += dy / d * f; } }
        }
        const dmp = Math.exp(-damp * dt);
        for (let i = 0; i < N; i++) {
          vx[i] = (vx[i] + ax[i] * dt) * dmp; vy[i] = (vy[i] + ay[i] * dt) * dmp;
          x[i] += vx[i] * dt; y[i] += vy[i] * dt;
          if (y[i] > Pl.y) { if (vy[i] > B.impact) B.impact = vy[i]; y[i] = Pl.y; if (vy[i] > 0) vy[i] = 0; vx[i] *= 1 - Math.min(1, 14 * dt); }
        }
      }
      function poke(px0, py0, str) {
        const R = JW * 0.34;
        for (let i = 0; i < N; i++) {
          const dx = B.x[i] - px0, dy = B.y[i] - py0, d = Math.hypot(dx, dy) + 1, f = Math.exp(-(d * d) / (2 * R * R));
          const hg = Math.max(0, (Pl.y - B.y[i]) / Math.max(20, B.hNow));
          B.vx[i] += (dx / d * 420 * f + (B.x[i] - B.cx) / B.wNow * 240 * hg - (px0 - B.cx) / B.wNow * 340 * hg) * str;
          B.vy[i] += (dy / d * 420 * f + 300 * hg) * str;
        }
      }
      function hop(str) { for (let i = 0; i < N; i++) B.vy[i] -= str * Math.max(0, (Pl.y - B.y[i]) / Math.max(20, B.hNow)); }
      function startGrab(p) {
        let best = 0, bd = 1e9;
        for (let i = 0; i < N; i++) { const d = Math.hypot(B.x[i] - p.x, B.y[i] - p.y); if (d < bd) { bd = d; best = i; } }
        if (bd > JW * 0.9) return;
        const idx = [], w = [], ox = [], oy = [];
        for (let o = -6; o <= 6; o++) { const i = (best + o + N) % N; idx.push(i); w.push(Math.exp(-(o * o) / (2 * 2.4 * 2.4))); ox.push(B.x[i]); oy.push(B.y[i]); }
        B.grab = { idx, w, ox, oy, fx0: p.x, fy0: p.y, fx: p.x, fy: p.y };
      }
      function endGrab() {
        const g2 = B.grab; B.grab = null; if (!g2) return;
        const pull = Math.hypot(g2.fx - g2.fx0, g2.fy - g2.fy0);
        if (pull > 14) { squelch(Math.min(1.2, 0.35 + pull / 120), 1.1); setFace('O', 'o', 260, 'happy', 'grin'); S.later(() => { if (FACE.eyes === 'happy') setFace('open', 'smile'); }, 1000); }
      }

      /* ---------------- face ---------------- */
      function setFace(eyes, mouth, ms, e2, m2) { FACE.eyes = eyes; FACE.mouth = mouth; FACE.until = ms ? now + ms / 1000 : 0; FACE.then = ms ? [e2 || 'open', m2 || 'smile'] : null; }
      function drawFace(g, fx, fy, er, sqY, a) {
        if (a <= 0.01) return;
        const ex = er * 3.1, ink = '#2a0f2a';
        g.save(); g.translate(fx, fy); g.scale(1 + (1 - sqY) * 0.45, sqY); g.globalAlpha = a;
        const bl = Math.min(1, 0.34 + 0.6 * heat + (FACE.eyes === 'bliss' ? 0.14 : 0));
        g.fillStyle = 'rgba(255, 92, 138, ' + (bl * 0.72).toFixed(3) + ')';
        g.beginPath(); g.ellipse(-ex * 1.42, er * 1.3, er * 1.35, er * 0.7, 0, 0, TAU); g.ellipse(ex * 1.42, er * 1.3, er * 1.35, er * 0.7, 0, 0, TAU); g.fill();
        g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(2, er * 0.42);
        const E = FACE.eyes;
        for (const s of [-1, 1]) {
          const x = s * ex;
          if (E === 'open' || E === 'O') {
            const open = E === 'O' ? 1 : (FACE.blink > 0 ? 0.12 : 1);
            const rx = er * (E === 'O' ? 0.95 : 0.8), ry = er * (E === 'O' ? 0.95 : 1.08) * open;
            g.beginPath(); g.ellipse(x, 0, rx, ry, 0, 0, TAU); g.fill();
            if (open > 0.5) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x - rx * 0.3, -ry * 0.36, er * 0.34, 0, TAU); g.fill(); g.beginPath(); g.arc(x + rx * 0.3, ry * 0.34, er * 0.15, 0, TAU); g.fill(); g.fillStyle = ink; }
          } else if (E === 'squeeze') {
            g.beginPath(); g.moveTo(x + s * er * 0.8, -er * 0.75); g.lineTo(x - s * er * 0.55, 0); g.lineTo(x + s * er * 0.8, er * 0.75); g.stroke();
          } else if (E === 'happy') {
            g.beginPath(); g.arc(x, er * 0.5, er * 0.85, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
          } else if (E === 'bliss') {
            g.beginPath(); g.arc(x, -er * 0.4, er * 0.85, Math.PI * 0.14, Math.PI * 0.86); g.stroke();
          } else {
            g.beginPath(); g.moveTo(x - er * 0.8, er * 0.1); g.quadraticCurveTo(x, er * 0.5, x + er * 0.8, er * 0.1); g.stroke();
          }
        }
        const M = FACE.mouth, my = er * 2.15;
        if (M === 'smile') { g.beginPath(); g.arc(0, my - er * 0.75, er * 0.95, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
        else if (M === 'grin') {
          g.beginPath(); g.moveTo(-er * 1.15, my - er * 0.4); g.quadraticCurveTo(0, my + er * 1.6, er * 1.15, my - er * 0.4); g.closePath(); g.fill();
          g.fillStyle = '#ff7f9f'; g.beginPath(); g.ellipse(0, my + er * 0.42, er * 0.55, er * 0.3, 0, 0, TAU); g.fill();
        } else if (M === 'o') { g.beginPath(); g.ellipse(0, my, er * 0.48, er * 0.6, 0, 0, TAU); g.fill(); }
        else if (M === 'tight') { g.beginPath(); g.moveTo(-er * 1.1, my); for (let q = 1; q <= 4; q++) g.lineTo(-er * 1.1 + q * er * 0.55, my + (q % 2 ? -er * 0.32 : er * 0.32)); g.stroke(); }
        else if (M === 'soft') { g.beginPath(); g.arc(0, my - er * 0.45, er * 0.62, Math.PI * 0.24, Math.PI * 0.76); g.stroke(); }
        else { g.beginPath(); g.ellipse(0, my, er * 0.3, er * 0.36, 0, 0, TAU); g.fill(); }
        g.restore();
      }

      /* ---------------- input ---------------- */
      const jellyTarget = () => (phase === 'intro' || !built ? null : { x: B.cx + B.wNow * (G.phone ? 0.27 : 0.18), y: B.yBot - B.hNow * 0.3 });
      function onDown(p) {
        pressing = true; finger.x = finger.x0 = p.x; finger.y = finger.y0 = p.y;
        if (phase === 'cue') { startSqueeze(p); return; }
        if (phase === 'squeeze' || phase === 'letgo' || phase === 'intro' || !landed) return;
        if (phase === 'bath' || phase === 'finale' || phase === 'end') { splash(p); return; }
        poke(p.x, p.y, 1);
        squelch(0.85, 0.9 + Math.random() * 0.3);
        setFace('O', 'o', 230, 'happy', 'grin');
        S.later(() => { if (FACE.eyes === 'happy' && phase !== 'melt') setFace('open', 'smile'); }, 1100);
        P.emit('drop', p.x, p.y, 5, { colors: [rgba(COL.light, 0.9), rgba(COL.base, 0.9)], speed: [60, 160], angle: -Math.PI / 2, spread: 2.2 });
        if (phase === 'melt') {
          meltTouches++;
          if (!wobbleSaid) { wobbleSaid = true; sync.say(line(LINES.wobble), { mood: 'laugh', ms: 2400 }); }
        } else sync.face(Math.random() < 0.5 ? 'laugh' : 'happy', 900);
        startGrab(p);
      }
      function onMove(p) {
        finger.x = p.x; finger.y = p.y;
        if (B.grab) { B.grab.fx = p.x; B.grab.fy = p.y; }
        if (B.push) { B.push.x = p.x; B.push.y = p.y; }
      }
      function onUp() {
        if (!pressing) return;
        pressing = false; B.push = null;
        if (phase === 'squeeze') { holdT = (performance.now() - holdT0) / 1000; if (holdT >= curHold) holdDone(); else if (holdT < curHold * 0.5) { retry(); return; } else { release(holdT / curHold); return; } }
        if (phase === 'letgo') { release(1); return; }
        endGrab();
        if (phase === 'hello') pokes++;
      }
      K.press(pad, { space: el, down: onDown, move: onMove, up: onUp });
      // a tap anywhere else in the spa still answers: a soap bubble and a soft blip
      S.listen(el, 'pointerdown', (e) => {
        if (e.target === pad || (e.target.closest && e.target.closest('.gk-char, .sq-pad'))) return;
        const p = K.local(e, el);
        P.emit('bubble', p.x, p.y, 4, { colors: ['rgba(255,255,255,0.8)', rgba(COL.light, 0.85)], speed: [20, 60] });
        if (au()) { A.tone({ type: 'sine', freq: 520 + Math.random() * 300, to: 980, glide: 0.06, dur: 0.09, vol: 0.04 }); A.sync('bubble', performance.now()); }
      });
      let keyDown = false;
      const keyStart = (e) => { if (e.repeat || keyDown) return; if (e.code !== 'Space' && e.code !== 'Enter') return; e.preventDefault(); keyDown = true; A.unlock(); K.guideDone(); onDown({ x: B.cx, y: B.yBot - B.hNow * 0.5 }); };
      S.listen(pad, 'keydown', keyStart);
      K.onKey(['Space', 'Enter'], (e) => { if (document.activeElement === pad) return; if (phase === 'cue' || phase === 'hello' || phase === 'melt') keyStart(e); });
      S.listen(window, 'keyup', (e) => { if (keyDown && (e.code === 'Space' || e.code === 'Enter')) { keyDown = false; if (phase === 'hello') { pressing = true; } onUp(); } });

      /* ---------------- the squeeze ---------------- */
      function guideHold(delay) {
        K.guide({ id: 'hold-' + roundIdx, g: 'hold', target: jellyTarget, label: cur.big ? 'BIG SQUEEZE: HOLD' : 'HOLD TO SQUEEZE', ms: 2400, place: 'below', delay });
      }
      function startSqueeze(p) {
        phase = 'squeeze'; holdT = 0; holdT0 = performance.now(); overNag = 0;
        B.sT = cur.big ? BIGLEVEL : LEVEL; B.grab = null;
        B.push = p ? { x: p.x, y: p.y } : null;
        loops();
        K.sfx.tap(); squelch(0.6, 0.75);
        sync.face(cur.big ? 'E50' : 'E48');
        setFace('squeeze', 'tight');
        body.set(cur.regions, 'tense');
        music.level(0.26);
        setStep(cur.big ? 'Hold it… breathe in' : 'Squeezing… breathe in', null, cur.do, SAFE);
        sync.say(line(LINES.hold), { ms: Math.round(curHold * 1000) });
        K.guide({ id: 'letgo-' + roundIdx, g: 'drag', dir: 'u', d: 70, target: jellyTarget, label: 'NOW LET GO', place: 'below', delay: Math.round(curHold * 1000) + 160 });
        ctx.track('squeeze', { r: roundIdx });
      }
      function holdDone() {
        phase = 'letgo'; letgoAt = performance.now();
        if (au()) { A.chime(A.note(FR.chord[(roundIdx + 1) % 4]) * 2, { vol: 0.09, dur: 1.6 }); }
        K.sfx.chime(roundIdx + 4);
        setStep('Now', null, '…and let go, all at once', '');
        sync.say(line(LINES.letgo), { ms: 2200 });
      }
      function retry() {
        phase = 'retry'; B.sT = 0; B.push = null;
        sync.say(line(LINES.early).replace('{s}', curHold === HOLD ? String(Math.round(HOLD)) : String(Math.round(BIGHOLD))), { mood: 'think', ms: 2800 });
        sync.base('E01');
        squelch(0.5, 1.2); setFace('open', 'smile');
        body.set(cur.regions, 'cue');
        music.level(0.5);
      }
      function release(frac) {
        if (phase !== 'squeeze' && phase !== 'letgo') return;
        const crisp = phase === 'letgo' && performance.now() - letgoAt < 1800;
        relInfo = { frac: Math.min(1, frac), clean: crisp ? 1 : 0.6 };
        phase = 'released';
        B.sT = 0; B.push = null;
        hop(cur.big ? 340 : 260);
        if (au()) { A.boing({ freq: 230, vol: 0.12 }); }
        squelch(1.1, 0.7);
        exhale(cur.big);
        K.sfx.whoosh();
        setFace('O', 'o', 380, 'bliss', 'soft');
        sync.face('surprised', 420);
        P.emit('mote', B.cx, B.yBot - B.hNow * 0.6, 16, { colors: [rgba(COL.glow), '#fff6d8', rgba(COL.light)], speed: [30, 90] });
        if (creak) creak.level(0.0001, 0.05);
        if (inhale) inhale.level(0.0001, 0.08);
      }
      function splash(p) {
        if (pw < 0.5) return;
        ripples.push({ x: K.clamp(p.x, Pl.x - Pool.rx * 0.85, Pl.x + Pool.rx * 0.85), y: K.clamp(p.y, Pl.y - 8 - Pool.ry * 0.7, Pl.y - 8 + Pool.ry * 0.75), t: now });
        if (au()) { A.tone({ type: 'sine', freq: 380 + Math.random() * 160, to: 760, glide: 0.08, dur: 0.12, vol: 0.06 }); A.chime(A.note(FR.chord[Math.floor(Math.random() * 4)]) * 2, { vol: 0.04, dur: 1.4 }); A.sync('splash', performance.now()); }
      }
      const ripples = [];

      /* ---------------- background ---------------- */
      let BG = null;
      function off(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * cv.dpr)); c.height = Math.max(1, Math.round(hh * cv.dpr)); const g = c.getContext('2d'); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); return { c, g, w, h: hh }; }
      function rr(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function paintBG() {
        if (BG) return;
        const D = K.dark();
        BG = { room: off(G.w, G.H), night: off(G.w, G.H), refl: [], moon: null, D };
        paintRoom(BG.room.g, D); paintNight(BG.night.g, D);
        el.style.backgroundColor = D ? ROOM.dark.top : ROOM.bright.top;
      }
      function paintRoom(g, D) {
        const w = G.w, H = G.H, R = ROOM[D ? 'dark' : 'bright'], rnd = K.rng(77);
        let gr = g.createLinearGradient(0, 0, 0, Cn.y);
        gr.addColorStop(0, R.top); gr.addColorStop(1, R.bot);
        g.fillStyle = gr; g.fillRect(0, 0, w, Cn.y + 4);
        const tw = G.phone ? 40 : 52, th = Math.round(tw * 0.5);
        for (let row = 0, y = 0; y < Cn.y; y += th, row++) {
          for (let x = row % 2 ? -tw / 2 : 0; x < w; x += tw) {
            g.fillStyle = rgba(R.tile, R.tileA * (0.75 + rnd() * 0.5)); rr(g, x + 1.5, y + 1.5, tw - 3, th - 3, 4); g.fill();
            g.fillStyle = rgba(WHITE, R.gloss * 0.25); g.fillRect(x + 5, y + 3, tw - 10, 1.2);
          }
        }
        gr = g.createRadialGradient(Pl.x, Pl.y - JH * 0.7, 8, Pl.x, Pl.y - JH * 0.7, Math.max(w * 0.75, 430));
        gr.addColorStop(0, R.lamp); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, Cn.y);
        gr = g.createLinearGradient(0, 0, 0, Cn.y); gr.addColorStop(0, D ? 'rgba(10,4,24,0.5)' : 'rgba(255,255,255,0.25)'); gr.addColorStop(0.4, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, Cn.y);
        paintWindow(g, R, D);
        paintShelf(g, R, D);
        // the counter: slab, terrazzo flecks, painted wooden front
        g.fillStyle = R.front; g.fillRect(0, Cn.y + 10, w, H - Cn.y - 10);
        g.fillStyle = R.slat; for (let x = 13; x < w; x += 26) g.fillRect(x, Cn.y + 14, 2, H - Cn.y - 14);
        gr = g.createLinearGradient(0, Cn.y + 10, 0, Cn.y + 48); gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, Cn.y + 10, w, 38);
        g.fillStyle = R.slab; g.fillRect(0, Cn.y - 6, w, 18);
        g.fillStyle = R.slabHi; g.fillRect(0, Cn.y - 6, w, 2);
        for (let i = 0; i < w / 5; i++) { g.fillStyle = ['#ff9fb4', '#8fdcc6', '#ffd98f', '#b9a6ff'][i % 4]; g.globalAlpha = D ? 0.4 : 0.6; g.fillRect(rnd() * w, Cn.y - 3 + rnd() * 12, 2 + rnd() * 2.5, 1.4 + rnd()); }
        g.globalAlpha = 1;
        gr = g.createLinearGradient(0, H - 150, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, D ? 'rgba(8,2,16,0.5)' : 'rgba(30,90,76,0.14)');
        g.fillStyle = gr; g.fillRect(0, H - 150, w, 150);
      }
      function paintWindow(g, R, D) {
        const r = G.phone ? 25 : 60, x = G.phone ? G.w - 38 : 236, y = G.phone ? Pl.y - 150 : 168;
        g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
        let gr = g.createLinearGradient(0, y - r, 0, y + r); gr.addColorStop(0, R.sky[0]); gr.addColorStop(1, R.sky[1]);
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        const rnd = K.rng(9);
        if (D) {
          g.fillStyle = '#fffaf0'; for (let i = 0; i < 14; i++) { g.globalAlpha = 0.4 + rnd() * 0.6; g.fillRect(x - r + rnd() * r * 2, y - r + rnd() * r * 1.4, 1.5, 1.5); }
          g.globalAlpha = 1; g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(x + r * 0.32, y - r * 0.3, r * 0.22, 0, TAU); g.fill();
          g.fillStyle = R.sky[0]; g.beginPath(); g.arc(x + r * 0.42, y - r * 0.38, r * 0.2, 0, TAU); g.fill();
        } else {
          g.fillStyle = 'rgba(255,255,255,0.92)';
          for (const [cx, cy, s] of [[-0.3, 0.2, 1], [0.35, -0.25, 0.8]]) { g.beginPath(); g.ellipse(x + cx * r, y + cy * r, r * 0.42 * s, r * 0.16 * s, 0, 0, TAU); g.ellipse(x + cx * r + r * 0.16 * s, y + cy * r - r * 0.1 * s, r * 0.2 * s, r * 0.16 * s, 0, 0, TAU); g.fill(); }
        }
        // a hint of hills
        g.fillStyle = D ? 'rgba(20,18,50,0.9)' : 'rgba(120,190,150,0.85)'; g.beginPath(); g.moveTo(x - r, y + r); g.quadraticCurveTo(x - r * 0.3, y + r * 0.25, x + r * 0.2, y + r * 0.62); g.quadraticCurveTo(x + r * 0.6, y + r * 0.38, x + r, y + r * 0.55); g.lineTo(x + r, y + r); g.fill();
        gr = g.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = G.phone ? 9 : 14; g.beginPath(); g.arc(x, y + 2, r + 3, 0, TAU); g.stroke();
        g.strokeStyle = R.frame; g.lineWidth = G.phone ? 6 : 10; g.beginPath(); g.arc(x, y, r + 2, 0, TAU); g.stroke();
        g.fillStyle = D ? '#b89f80' : '#e8d8c8'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; g.beginPath(); g.arc(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), G.phone ? 1.6 : 2.6, 0, TAU); g.fill(); }
      }
      function paintShelf(g, R, D) {
        const x = G.phone ? 2 : G.w - 300, y = G.phone ? Pl.y - 112 : 170, wd = G.phone ? 70 : 216, s = G.phone ? 0.86 : 1.1;
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 4, y + 7, wd - 8, 4);
        g.fillStyle = R.wood; rr(g, x, y, wd, 8, 3); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 3, y + 1, wd - 6, 1.5);
        // rolled towels
        const tc = ['#ff9fb4', '#8fdcc6', '#ffe0a6'];
        for (let i = 0; i < 3; i++) {
          if (G.phone && friendsSeen.length) break;
          const tx = x + 8 * s + i * 21 * s + (i === 2 ? -10.5 * s : 0), ty = y - (i === 2 ? 30 : 11) * s, r = 10 * s;
          g.fillStyle = tc[i]; rr(g, tx, ty - r, 20 * s, r * 2, r); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(tx + 20 * s - r, ty, r * 0.62, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.beginPath(); g.arc(tx + 20 * s - r, ty, r * 0.35, 0, TAU); g.stroke();
        }
        if (!G.phone) {
          // a candle and a little plant
          const cx = x + 130, cy = y;
          g.fillStyle = D ? '#f3e6d4' : '#fffaf2'; rr(g, cx, cy - 26, 18, 26, 4); g.fill();
          g.globalAlpha = 0.65; g.drawImage(K.glowSprite('#ffcf86'), cx - 22, cy - 66, 62, 62); g.globalAlpha = 1;
          g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(cx + 9, cy - 34, 3.2, 6, 0, 0, TAU); g.fill();
          const px = x + 180;
          g.fillStyle = R.pot; g.beginPath(); g.moveTo(px - 14, cy - 22); g.lineTo(px + 14, cy - 22); g.lineTo(px + 10, cy); g.lineTo(px - 10, cy); g.closePath(); g.fill();
          g.fillStyle = R.leaf; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.36; g.beginPath(); g.ellipse(px + Math.cos(a) * 16, cy - 30 + Math.sin(a) * 16, 4.5, 13, a + Math.PI / 2, 0, TAU); g.fill(); }
        }
      }
      function paintNight(g, D) {
        const w = G.w, H = G.H, N2 = NIGHT[D ? 'dark' : 'bright'], rnd = K.rng(31), hz = Pl.y - (G.phone ? 70 : 92);
        let gr = g.createLinearGradient(0, 0, 0, hz + 40);
        gr.addColorStop(0, N2.top); gr.addColorStop(0.55, N2.mid); gr.addColorStop(1, N2.low);
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
        const n = G.phone ? 150 : 300;
        for (let i = 0; i < n; i++) {
          const x = rnd() * w, y = Math.pow(rnd(), 1.3) * (hz - 16), r0 = rnd(), s = r0 < 0.1 ? 2.2 : r0 < 0.5 ? 1.4 : 0.9, a = 0.35 + rnd() * 0.6;
          g.globalAlpha = a; g.fillStyle = '#fffaf0'; g.fillRect(x, y, s, s);
          if (s > 2) { g.globalAlpha = a * 0.55; g.drawImage(K.glowSprite('#fff4d8'), x - 7, y - 7, 16, 16); }
          if (i % 4 === 0) BG.refl.push({ x, y, s, a });
        }
        g.globalAlpha = 1;
        const mx = G.phone ? w - 64 : w * 0.8, my = G.phone ? 112 : 124, mr = G.phone ? 18 : 26;
        g.globalAlpha = 0.55; g.drawImage(K.glowSprite('#fff1cf'), mx - mr * 4, my - mr * 4, mr * 8, mr * 8); g.globalAlpha = 1;
        g.fillStyle = '#fff6df'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
        g.fillStyle = 'rgba(206, 188, 160, 0.4)'; for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12]]) { g.beginPath(); g.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, TAU); g.fill(); }
        BG.moon = { x: mx, y: my, r: mr };
        const hills = (y0, col, amp, f, ph) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, y0 - amp * (0.6 + 0.4 * Math.sin(x * f + ph)) - amp * 0.4 * Math.sin(x * f * 2.7 + ph * 2)); g.lineTo(w, H); g.closePath(); g.fill(); };
        hills(hz, N2.hillA, G.phone ? 34 : 50, 0.006, 1.3);
        hills(hz + 26, N2.hillB, G.phone ? 22 : 30, 0.011, 4.1);
        gr = g.createLinearGradient(0, hz + 30, 0, H); gr.addColorStop(0, N2.hillB); gr.addColorStop(1, N2.ground);
        g.fillStyle = gr; g.fillRect(0, hz + 30, w, H - hz - 30);
        g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < w / 9; i++) { const x = rnd() * w, y = hz + 40 + rnd() * (H - hz - 40); g.fillRect(x, y, 1.2, 4 + rnd() * 4); }
      }
      let STONES = [];
      function layoutStones() {
        const rnd = K.rng(4), M = G.phone ? 7 : 12; STONES = [];
        for (let k = 0; k < M; k++) { const side = k % 2 ? 1 : -1; STONES.push({ x: side * (1.05 + rnd() * 0.25), y: 0.2 + rnd() * 0.6, s: 0.6 + rnd() * 0.7, c: Math.floor(rnd() * 3) }); }
      }
      /* The bath: a round wooden tub (hinoki rim, staves, two bands) that rises around the plate as the jelly melts. */
      function tubGeom() { const k = Math.min(1, pool), sc = 0.82 + 0.18 * K.ease.outBack(k); return { cx: Pl.x, cy: Pl.y - 8, rx: Pool.rx * sc, ry: Pool.ry * sc, rim: (G.phone ? 9 : 13) * sc, wall: (G.phone ? 30 : 44) * sc }; }
      const woodAt = (c) => rgba(mixc(c, [22, 18, 44], 0.32 * night));
      function drawTubBack(g, T, a, D) {
        g.globalAlpha = a * 0.7; g.drawImage(K.glowSprite(rgba(COL.glow)), T.cx - T.rx * 1.6, T.cy - T.ry * 3, T.rx * 3.2, T.ry * 6);
        g.globalAlpha = a; g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(T.cx, T.cy + T.wall + T.ry * 0.5, T.rx * 1.12, T.ry * 0.62, 0, 0, TAU); g.fill();
        const N2 = NIGHT[D ? 'dark' : 'bright'];
        for (const st of STONES) { const x = T.cx + st.x * T.rx, y = T.cy + T.wall + T.ry * st.y, r = T.rx * 0.055 * st.s; g.fillStyle = rgba(N2.rock[st.c]); g.beginPath(); g.ellipse(x, y, r * 1.4, r * 0.8, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.22, 0, 0, TAU); g.fill(); }
        g.fillStyle = woodAt([232, 196, 150]); g.beginPath(); g.ellipse(T.cx, T.cy, T.rx + T.rim, T.ry + T.rim * 0.62, 0, 0, TAU); g.fill();
        g.fillStyle = woodAt([118, 76, 48]); g.beginPath(); g.ellipse(T.cx, T.cy, T.rx, T.ry, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,240,220,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(T.cx, T.cy, T.rx + T.rim * 0.92, T.ry + T.rim * 0.56, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke();
      }
      function drawTubFront(g, T, a) {
        const ox = T.rx + T.rim, oy = T.ry + T.rim * 0.62, bot = T.wall;
        g.globalAlpha = a;
        g.save();
        g.beginPath(); g.ellipse(T.cx, T.cy, ox, oy, 0, 0, Math.PI); g.lineTo(T.cx - ox * 0.97, T.cy + bot); g.ellipse(T.cx, T.cy + bot, ox * 0.97, oy * 0.97, 0, Math.PI, 0, true); g.closePath();
        const gr = g.createLinearGradient(0, T.cy, 0, T.cy + oy + bot); gr.addColorStop(0, woodAt([226, 182, 128])); gr.addColorStop(1, woodAt([150, 98, 60]));
        g.fillStyle = gr; g.fill();
        g.clip();
        g.strokeStyle = 'rgba(90, 50, 20, 0.28)'; g.lineWidth = 1.5;
        for (let k = -10; k <= 10; k++) { const x = T.cx + (k / 10.5) * ox; g.beginPath(); g.moveTo(x, T.cy); g.lineTo(x, T.cy + oy + bot + 4); g.stroke(); }
        g.strokeStyle = woodAt([92, 58, 40]); g.lineWidth = G.phone ? 4 : 6;
        for (const f of [0.32, 0.74]) { g.beginPath(); g.ellipse(T.cx, T.cy + bot * f, ox * 0.99, oy * 0.99, 0, 0.04, Math.PI - 0.04); g.stroke(); }
        const sh = g.createLinearGradient(T.cx - ox, 0, T.cx + ox, 0); sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(0.25, 'rgba(0,0,0,0)'); sh.addColorStop(0.7, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(0,0,0,0.4)');
        g.fillStyle = sh; g.fillRect(T.cx - ox, T.cy, ox * 2, oy + bot + 4);
        g.restore();
        g.globalAlpha = a; g.strokeStyle = 'rgba(255, 244, 226, 0.7)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(T.cx, T.cy, ox - 0.8, oy - 0.5, 0, 0.06, Math.PI - 0.06); g.stroke();
        g.globalAlpha = 1;
      }
      let CONS = null;
      function layoutCons() {
        const o = outline(FR.mould, 72), n = FR.mould === 'bunny' ? 11 : 9;
        let minY = 0, minX = 0, maxX = 0; for (let i = 0; i < 72; i++) { minY = Math.min(minY, o.y[i]); minX = Math.min(minX, o.x[i]); maxX = Math.max(maxX, o.x[i]); }
        // fit the jelly's star outline between the finale title and the tub
        const top = G.phone ? 258 : Math.round(G.H * 0.17) + 62, bottom = Pl.y - 8 - Pool.ry - 50;
        const hAvail = Math.max(60, bottom - top), cw = Math.min(G.phone ? 150 : 210, hAvail / -minY, (G.w * 0.5) / (maxX - minX));
        const cx = G.w / 2, cy = top + (hAvail - -minY * cw) / 2 - minY * cw;
        const pts = [];
        for (let k = 0; k < n; k++) { const i = Math.round(k * 72 / n) % 72; pts.push({ x: cx + o.x[i] * cw, y: cy + o.y[i] * cw }); }
        CONS = { pts, from: pts.map((p, i) => ({ x: Pl.x + (i / (n - 1) - 0.5) * Pool.rx * 1.2, y: Pl.y - 8 })), rung: [] };
      }

      /* ---------------- drawing ---------------- */
      function jellyPath(g) {
        const x = B.x, y = B.y;
        g.beginPath();
        g.moveTo((x[N - 1] + x[0]) / 2, (y[N - 1] + y[0]) / 2);
        for (let i = 0; i < N; i++) { const j = i + 1 === N ? 0 : i + 1; g.quadraticCurveTo(x[i], y[i], (x[i] + x[j]) / 2, (y[i] + y[j]) / 2); }
        g.closePath();
      }
      const BITS = (() => { const R = K.rng(K.daily() + 17), n = FR.bits === 'none' ? 0 : FR.bits === 'fizz' ? 16 : 9, out = []; for (let i = 0; i < n; i++) out.push({ u: (R() - 0.5) * 0.66, v: 0.14 + R() * 0.58, r: 0.55 + R() * 0.6, ph: R() * TAU, rot: R() * TAU }); return out; })();
      function drawBits(g, t, col) {
        const w = B.wNow, hh = B.hNow, s0 = JW * 0.022;
        for (const b of BITS) {
          const x = B.cx + b.u * w * 0.8 + Math.sin(t * 0.7 + b.ph) * 2;
          let y = B.yBot - b.v * hh;
          if (FR.bits === 'fizz') y = B.yBot - ((b.v + t * 0.05 * b.r) % 0.82 + 0.06) * hh;
          const s = s0 * b.r;
          g.save(); g.translate(x, y); g.rotate(b.rot + Math.sin(t * 0.5 + b.ph) * 0.3);
          if (FR.bits === 'seed' || FR.bits === 'pip') { g.fillStyle = FR.bits === 'pip' ? 'rgba(40,16,24,0.7)' : 'rgba(255,242,170,0.8)'; g.beginPath(); g.ellipse(0, 0, s * 0.55, s * 0.95, 0, 0, TAU); g.fill(); }
          else if (FR.bits === 'bubble' || FR.bits === 'fizz') { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.3; g.beginPath(); g.arc(0, 0, s * (FR.bits === 'fizz' ? 0.6 : 1.15), 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(-s * 0.35, -s * 0.35, s * 0.25, 0, TAU); g.fill(); }
          else if (FR.bits === 'berry' || FR.bits === 'cherry') { g.fillStyle = FR.bits === 'cherry' ? 'rgba(150,6,30,0.75)' : 'rgba(50,36,140,0.62)'; g.beginPath(); g.arc(0, 0, s * 1.35, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(-s * 0.45, -s * 0.45, s * 0.35, 0, TAU); g.fill(); }
          else if (FR.bits === 'cube') { g.fillStyle = rgba(col.light, 0.55); rr(g, -s * 1.2, -s * 1.2, s * 2.4, s * 2.4, s * 0.5); g.fill(); }
          else if (FR.bits === 'flake') { g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(0, 0, s * 1.3, s * 0.5, 0, 0, TAU); g.fill(); }
          g.restore();
        }
      }
      function jellyColours() {
        const k = Math.min(1, heat * 0.62);
        return { light: mixc(COL.light, mixc(COL.hot, WHITE, 0.45), k), mid: mixc(COL.base, COL.hot, k), deep: mixc(COL.deep, [120, 0, 30], k), rim: mixc(COL.rim, [255, 210, 210], k), glow: COL.glow };
      }
      function drawJelly(g, t, alpha) {
        if (alpha <= 0.01) return;
        const col = jellyColours(), w = B.wNow, hh = B.hNow, top = B.yBot - hh, bot = B.yBot;
        // contact shadow on the plate
        const lift = K.clamp(1 - (Pl.y - bot) / 300, 0.15, 1);
        g.globalAlpha = alpha * 0.5 * lift; g.fillStyle = 'rgba(40, 6, 30, 0.35)'; g.beginPath(); g.ellipse(B.cx, Pl.y + 2, w * 0.52 * (0.6 + 0.4 * lift), Math.max(5, Pl.ry * 0.42), 0, 0, TAU); g.fill();
        g.globalAlpha = alpha * 0.92;
        jellyPath(g);
        const gr = g.createLinearGradient(0, top, 0, bot);
        gr.addColorStop(0, rgba(col.light)); gr.addColorStop(0.5, rgba(col.mid)); gr.addColorStop(1, rgba(col.deep));
        g.fillStyle = gr; g.fill();
        g.save(); g.clip();
        g.globalAlpha = alpha * 0.55; g.drawImage(K.glowSprite(rgba(col.glow)), B.cx - w * 0.5, top + hh * 0.05, w, hh * 0.9);
        g.globalAlpha = alpha * 0.9; drawBits(g, t, col);
        g.globalAlpha = alpha * 0.3; g.lineWidth = Math.max(16, w * 0.13); g.strokeStyle = rgba(col.deep); jellyPath(g); g.stroke();
        g.globalAlpha = alpha * 0.35; g.fillStyle = rgba(col.light); g.beginPath(); g.ellipse(B.cx, bot - 3, w * 0.36, Math.max(4, hh * 0.05), 0, 0, TAU); g.fill();
        if (heat > 0.02) { g.globalAlpha = alpha * heat * 0.22; g.fillStyle = '#ff2a4a'; g.fillRect(B.minX - 4, top - 10, w + 8, hh + 12); }
        g.restore();
        g.globalAlpha = alpha * 0.85; g.lineWidth = 2; g.strokeStyle = rgba(col.rim); jellyPath(g); g.stroke();
        // glossy highlight that bends with the jelly
        const streak = (ids, wd, a) => {
          if (ids.length < 3) return;
          g.globalAlpha = alpha * a; g.strokeStyle = '#ffffff'; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath();
          ids.forEach((i, q) => { const dx = B.cx - B.x[i], dy = (bot - hh * 0.45) - B.y[i], d = Math.hypot(dx, dy) || 1, o = Math.max(7, JW * 0.045); const X = B.x[i] + dx / d * o, Y = B.y[i] + dy / d * o; if (q) g.lineTo(X, Y); else g.moveTo(X, Y); });
          g.stroke();
        };
        streak(B.hl, Math.max(4, JW * 0.03), 0.62);
        streak(B.hr.slice(0, Math.max(2, Math.ceil(B.hr.length * 0.6))), Math.max(3, JW * 0.018), 0.4);
        g.globalAlpha = 1;
      }
      function drawStand(g, a) {
        if (a <= 0.01) return;
        const D = K.dark(), x = Pl.x, y = Pl.y, rx = Pl.rx, ry = Pl.ry, cy = Cn.y;
        const p1 = D ? '#f2ecf6' : '#ffffff', p2 = D ? '#c9bdd4' : '#e8dfe9', p3 = D ? '#a598b2' : '#cbbfcf';
        g.globalAlpha = a;
        g.fillStyle = 'rgba(30, 10, 30, 0.3)'; g.beginPath(); g.ellipse(x, cy - 2, rx * 0.6, ry * 0.55, 0, 0, TAU); g.fill();
        let gr = g.createLinearGradient(x - rx * 0.4, 0, x + rx * 0.4, 0); gr.addColorStop(0, p3); gr.addColorStop(0.4, p1); gr.addColorStop(1, p2);
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, cy - 6, rx * 0.42, ry * 0.42, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x - rx * 0.1, y + ry * 0.4); g.lineTo(x + rx * 0.1, y + ry * 0.4); g.lineTo(x + rx * 0.16, cy - 8); g.lineTo(x - rx * 0.16, cy - 8); g.closePath(); g.fill();
        g.fillStyle = p3; g.beginPath(); g.ellipse(x, y + 5, rx, ry, 0, 0, TAU); g.fill();
        gr = g.createLinearGradient(0, y - ry, 0, y + ry); gr.addColorStop(0, p1); gr.addColorStop(1, p2);
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
        g.strokeStyle = rgba(COL.base, 0.75); g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, rx * 0.88, ry * 0.8, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y - 1, rx * 0.98, ry * 0.94, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
        g.globalAlpha = 1;
      }
      function drawRing(g, t) {
        let prog = 0, a = 0;
        if (phase === 'squeeze') { prog = holdT / curHold; a = 1; }
        else if (phase === 'letgo') { prog = 1; a = 0.75 + 0.25 * Math.sin(t * 9); }
        else if (phase === 'melt' || phase === 'released') { prog = 1; a = 0.25 + 0.2 * Math.sin(t * TAU / 6); }
        if (a <= 0.01) return;
        const rx = Pl.rx * 1.03, ry = Pl.ry * 1.12, y = Pl.y + 2;
        g.lineCap = 'round';
        g.globalAlpha = a * 0.35; g.strokeStyle = phase === 'melt' ? rgba(COL.glow) : '#ffd36b'; g.lineWidth = 10;
        g.beginPath(); g.ellipse(Pl.x, y, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + prog * TAU); g.stroke();
        g.globalAlpha = a; g.strokeStyle = phase === 'melt' ? '#fff1cf' : '#ffe9a8'; g.lineWidth = 3.5; g.stroke();
        g.globalAlpha = 1;
      }
      function drawStick(g) {
        const i = B.top, i0 = (i - 2 + N) % N, i1 = (i + 2) % N;
        let tx = B.x[i1] - B.x[i0], ty = B.y[i1] - B.y[i0]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        let nx = ty, ny = -tx; if (ny > 0) { nx = -nx; ny = -ny; }
        nx = nx * 0.7; ny = -Math.sqrt(Math.max(0.2, 1 - nx * nx));
        const L = G.phone ? 30 : 36, bx = B.x[i] - nx * 8, by = B.y[i] - ny * 8, ex = B.x[i] + nx * L, ey = B.y[i] + ny * L;
        g.strokeStyle = 'rgba(70,40,20,0.45)'; g.lineWidth = 4.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
        g.strokeStyle = '#ecd2a6'; g.lineWidth = 2.6; g.stroke();
        return { x: ex, y: ey, a: Math.atan2(nx, -ny) * 0.8 };
      }
      function drawBoat(g, t, T) {
        const x = T.cx - T.rx * (G.phone ? 0.56 : 0.48) + Math.sin(t * 0.23) * T.rx * 0.05, y = T.cy + T.ry * 0.36 + Math.sin(t * 1.1) * 1.6, s = G.phone ? 1 : 1.3;
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x, y + 5 * s, 20 * s, 4 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#fffaf2'; g.beginPath(); g.moveTo(x - 20 * s, y - 4 * s); g.lineTo(x + 20 * s, y - 4 * s); g.lineTo(x + 13 * s, y + 4 * s); g.lineTo(x - 13 * s, y + 4 * s); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(74,29,61,0.25)'; g.lineWidth = 1; g.stroke();
        g.strokeStyle = '#ecd2a6'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y - 3 * s); g.lineTo(x, y - 30 * s); g.stroke();
        return { x, y: y - 30 * s, a: Math.sin(t * 1.1) * 0.05 };
      }
      function drawDuck(g, t, a, T) {
        const x = T.cx + T.rx * 0.46 + Math.sin(t * 0.31 + 1) * T.rx * 0.08, y = T.cy + T.ry * 0.2 + Math.sin(t * 1.3 + 2) * 1.5, s = G.phone ? 0.9 : 1.25;
        g.globalAlpha = a;
        g.fillStyle = '#ffd23b'; g.beginPath(); g.ellipse(x, y, 13 * s, 8 * s, 0, 0, TAU); g.fill();
        g.beginPath(); g.arc(x + 7 * s, y - 9 * s, 6.5 * s, 0, TAU); g.fill();
        g.fillStyle = '#ff8a3d'; g.beginPath(); g.ellipse(x + 13.5 * s, y - 8 * s, 4 * s, 2.2 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#2a0f2a'; g.beginPath(); g.arc(x + 9 * s, y - 10.5 * s, 1.3 * s, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - 4 * s, y - 3 * s, 5 * s, 2 * s, -0.3, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      function drawMini(g, f, x, y, s, t, i, a) {
        const o = MINI[f.mould] || (MINI[f.mould] = outline(f.mould, 28)), bc = rgbOf(f.c), wob = Math.sin(t * 2.1 + i * 1.7) * 0.035;
        g.save(); g.translate(x, y); g.scale(s * (1 - wob * 0.5), s * 0.8 * (1 + wob)); g.globalAlpha = a;
        g.beginPath(); g.moveTo(o.x[0], o.y[0]); for (let k = 1; k < 28; k++) g.lineTo(o.x[k], o.y[k]); g.closePath();
        const gr = g.createLinearGradient(0, -1, 0, 0); gr.addColorStop(0, rgba(mixc(bc, WHITE, 0.45))); gr.addColorStop(1, rgba(mixc(bc, [58, 10, 44], 0.4)));
        g.fillStyle = gr; g.fill();
        g.restore();
        g.globalAlpha = a; g.fillStyle = '#2a0f2a';
        const hy = y - s * 0.8 * SHAPES[f.mould].h * 0.45;
        g.beginPath(); g.arc(x - s * 0.12, hy, Math.max(1.4, s * 0.035), 0, TAU); g.arc(x + s * 0.12, hy, Math.max(1.4, s * 0.035), 0, TAU); g.fill();
        g.strokeStyle = '#2a0f2a'; g.lineWidth = 1.3; g.beginPath(); g.arc(x, hy + s * 0.03, s * 0.06, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(x - s * 0.22, y - s * 0.8 * SHAPES[f.mould].h * 0.75, s * 0.08, s * 0.03, -0.5, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      const MINI = {};
      /* The bath water: the melted jelly itself, warm and glowing, with the night sky (and the jelly's own
         constellation) reflected in it, ripples, and the jelly's head floating blissfully on the surface. */
      function drawWater(g, t, T, a) {
        if (pw <= 0.01) return;
        const cx = T.cx, cy = T.cy + 2, rx = T.rx, ry = T.ry * 0.94, wa = a * pw;
        g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.clip();
        g.globalAlpha = wa;
        const wg = g.createLinearGradient(0, cy - ry, 0, cy + ry); wg.addColorStop(0, rgba(mixc(COL.base, COL.deep, 0.35))); wg.addColorStop(0.5, rgba(COL.base)); wg.addColorStop(1, rgba(COL.light));
        g.fillStyle = wg; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
        if (night > 0.01) { g.fillStyle = 'rgba(16, 14, 48, ' + (0.16 * night).toFixed(3) + ')'; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2); }
        g.globalAlpha = wa * 0.85; g.drawImage(K.glowSprite(rgba(COL.glow)), cx - rx * 0.75, cy - ry * 1.2, rx * 1.5, ry * 2.4);
        if (night > 0.02 && BG) {
          const skyTop = 30, skyBot = Pl.y - 70, map = (yy) => cy - ry * 0.7 + (1 - K.clamp((yy - skyTop) / (skyBot - skyTop), 0, 1)) * ry * 1.45;
          g.globalAlpha = wa * night * 0.9; g.fillStyle = '#fffaf0';
          for (const s of BG.refl) { const X = cx + (s.x - cx) * 0.92 + Math.sin(t * 1.4 + s.y) * 1.4; if (Math.abs(X - cx) > rx) continue; g.fillRect(X, map(s.y), s.s, Math.max(1, s.s * 0.6)); }
          if (BG.moon) { const X = cx + (BG.moon.x - cx) * 0.92, Y = map(BG.moon.y); g.globalAlpha = wa * night * 0.6; g.drawImage(K.glowSprite('#fff1cf'), X - 22, Y - 7, 44, 14); g.fillStyle = '#fff6df'; g.globalAlpha = wa * night * 0.8; for (let q = 0; q < 4; q++) { const ww = 14 - q * 3 + Math.sin(t * 2 + q) * 2; g.fillRect(X - ww / 2, Y - 2 + q * 3.2, ww, 1.6); } }
          if (cons > 0 && CONS) {
            g.globalAlpha = wa * night * 0.75; g.strokeStyle = 'rgba(255, 236, 200, 0.55)'; g.lineWidth = 1; g.beginPath();
            let started = false;
            CONS.pts.forEach((p, i) => { if (!CONS.rung[i]) return; const X = cx + (p.x - cx) * 0.92, Y = map(p.y); if (started) g.lineTo(X, Y); else { g.moveTo(X, Y); started = true; } });
            g.stroke();
            CONS.pts.forEach((p, i) => { if (!CONS.rung[i]) return; const X = cx + (p.x - cx) * 0.92, Y = map(p.y); g.drawImage(K.glowSprite('#ffe9b8'), X - 7, Y - 4, 14, 8); });
          }
        }
        g.globalAlpha = wa;
        for (let k = 0; k < 3; k++) { const ph = (t * 0.18 + k / 3) % 1, r1 = JW * 0.3 + ph * rx * 0.9; g.strokeStyle = 'rgba(255,255,255,' + (0.26 * (1 - ph)).toFixed(3) + ')'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(faceFloat.x, faceFloat.y, r1, r1 * (ry / rx), 0, 0, TAU); g.stroke(); }
        for (let q = ripples.length - 1; q >= 0; q--) { const rp = ripples[q], ph = (now - rp.t) / 2.2; if (ph > 1) { ripples.splice(q, 1); continue; } for (let k = 0; k < 2; k++) { const r1 = 6 + (ph - k * 0.12) * rx * 0.8; if (r1 <= 0) continue; g.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)).toFixed(3) + ')'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(rp.x, rp.y, r1, r1 * (ry / rx), 0, 0, TAU); g.stroke(); } }
        g.globalAlpha = wa * 0.4; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy - ry * 0.05, rx * 0.86, ry * 0.72, 0, Math.PI * 1.1, Math.PI * 1.4); g.stroke();
        g.restore();
        // the jelly's head, peeking out of its own bath
        const hk = K.clamp((pw - 0.35) / 0.5, 0, 1);
        if (hk > 0) {
          const hx = faceFloat.x, hy = faceFloat.y, hrx = JW * 0.27, hry = JW * 0.2 * hk;
          g.globalAlpha = wa * 0.35; g.fillStyle = rgba(COL.deep); g.beginPath(); g.ellipse(hx, hy + 1, hrx * 1.18, hrx * 0.3, 0, 0, TAU); g.fill();
          g.globalAlpha = wa * 0.97;
          g.beginPath(); g.moveTo(hx - hrx, hy); g.ellipse(hx, hy, hrx, hry, 0, Math.PI, TAU); g.quadraticCurveTo(hx, hy + hry * 0.18, hx - hrx, hy); g.closePath();
          const hg = g.createLinearGradient(0, hy - hry, 0, hy); hg.addColorStop(0, rgba(mixc(COL.light, WHITE, 0.3))); hg.addColorStop(1, rgba(COL.light));
          g.fillStyle = hg; g.fill();
          g.strokeStyle = rgba(COL.rim, 0.8); g.lineWidth = 1.6; g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = Math.max(3, JW * 0.022); g.lineCap = 'round'; g.beginPath(); g.ellipse(hx, hy, hrx * 0.72, hry * 0.72, 0, Math.PI * 1.15, Math.PI * 1.42); g.stroke();
          g.globalAlpha = 1;
        }
      }
      const faceFloat = { x: 0, y: 0 };
      function drawCons(g, t) {
        if (cons <= 0 || !CONS) return;
        const n = CONS.pts.length, arrived = [];
        for (let i = 0; i < n; i++) {
          const pk = K.clamp(cons * (n + 1.5) - i, 0, 1); if (pk <= 0) continue;
          const a = CONS.from[i], b = CONS.pts[i], e = K.ease.inOutCubic(pk);
          const x = a.x + (b.x - a.x) * e + Math.sin(pk * Math.PI) * 26 * (i % 2 ? 1 : -1), y = a.y + (b.y - a.y) * e;
          if (pk < 1) { g.globalAlpha = 0.9; g.drawImage(K.glowSprite(rgba(COL.glow)), x - 12, y - 12, 24, 24); g.fillStyle = '#fff6e0'; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
          else {
            arrived.push(i);
            if (!CONS.rung[i]) { CONS.rung[i] = 1; if (au()) A.chime(A.note(FR.chord[i % 4]) * 2, { vol: 0.05, dur: 2.2, verb: 0.6 }); P.emit('star', b.x, b.y, 4, { colors: ['#fff6d8', rgba(COL.light)], speed: [20, 60] }); }
          }
        }
        if (arrived.length > 1) {
          g.globalAlpha = 0.6; g.strokeStyle = 'rgba(255, 236, 200, 0.8)'; g.lineWidth = 1.3; g.beginPath();
          arrived.forEach((i, q) => { const p = CONS.pts[i]; if (q) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); });
          if (arrived.length === n) g.closePath();
          g.stroke();
        }
        for (const i of arrived) { const p = CONS.pts[i], tw = 0.75 + 0.25 * Math.sin(t * 2.3 + i * 1.7); g.globalAlpha = tw; g.drawImage(K.glowSprite('#ffe9b8'), p.x - 13, p.y - 13, 26, 26); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(p.x, p.y, 2.4, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      function draw(g, dt, t) {
        paintBG();
        const w = G.w, H = G.H;
        if (night < 0.995) g.drawImage(BG.room.c, 0, 0, w, H);
        if (night > 0.005) { g.globalAlpha = night; g.drawImage(BG.night.c, 0, 0, w, H); g.globalAlpha = 1; }
        const big = cur && cur.big && (phase === 'squeeze' || phase === 'letgo');
        const shake = big && !K.reduced() ? B.s * 1.6 : 0;
        if (shake) { g.save(); g.translate(Math.sin(t * 43) * shake, Math.cos(t * 37) * shake); }
        drawCons(g, t);
        if (night < 0.99 && friendsSeen.length) {
          // jelly friends from earlier visits: on the shelf (phone) or along the counter (desktop)
          const slots = G.phone ? [[22, Pl.y - 112, 34], [54, Pl.y - 112, 30]] : [[Pl.x - JW * 1.15, Cn.y - 2, 72], [Pl.x + JW * 1.15, Cn.y - 2, 72], [Pl.x - JW * 1.6, Cn.y - 2, 60], [Pl.x + JW * 1.6, Cn.y - 2, 60]];
          friendsSeen.slice(0, slots.length).forEach((f, i) => drawMini(g, f, slots[i][0], slots[i][1], slots[i][2], t, i, 1 - night));
        }
        drawStand(g, 1 - pool);
        if (pool < 0.5) drawRing(g, t);
        const T = pool > 0.01 ? tubGeom() : null, tubA = Math.min(1, pool * 1.6), D = K.dark();
        faceFloat.x = (T ? T.cx + T.rx * (G.phone ? 0.36 : 0.26) : Pl.x) + Math.sin(t * 0.37) * 5; faceFloat.y = (T ? T.cy : Pl.y) + 4 + Math.sin(t * 0.9) * 1.6;
        if (T) { drawTubBack(g, T, tubA, D); drawWater(g, t, T, tubA); }
        const jellyA = phase === 'intro' ? 0 : 1 - pw;
        drawJelly(g, t, jellyA);
        // face: on the jelly, then on its head floating in the bath
        const er = K.clamp(JW * 0.042, 5, 14);
        const rest = JH * SH.h * (1 - 0.27 * B.m) * (1 - 0.75 * B.pd) || 1;
        const sqY = K.clamp(B.hNow / rest, 0.62, 1.25);
        const jfx = B.cx + Math.sin(B.th) * 4, jfy = B.yBot - B.hNow * 0.47;
        const fk = K.clamp(pw * 1.25, 0, 1), hfy = faceFloat.y - JW * 0.2 * K.clamp((pw - 0.35) / 0.5, 0, 1) * 0.5;
        if (phase !== 'intro') drawFace(g, jfx + (faceFloat.x - jfx) * fk, jfy + (hfy - jfy) * fk, er * (1 - 0.08 * fk), fk > 0.5 ? 0.92 : sqY, 1);
        if (heat > 0.05 && jellyA > 0.5) {
          const a = Math.min(1, heat * 1.4), y = B.yBot - B.hNow * 0.55;
          g.strokeStyle = 'rgba(255, 98, 110, ' + (a * 0.85).toFixed(3) + ')'; g.lineWidth = 3; g.lineCap = 'round';
          for (const s of [-1, 1]) for (let q = 0; q < 3; q++) { const ang = (q - 1) * 0.42 + Math.sin(t * 23 + q) * 0.05, x0 = (s < 0 ? B.minX : B.maxX) + s * 8, y0 = y + (q - 1) * 14; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + s * Math.cos(ang) * 12, y0 + Math.sin(ang) * 12); g.stroke(); }
          if (heat > 0.45) {
            const x = B.maxX - B.wNow * 0.14, y2 = B.yBot - B.hNow * 0.8 + Math.sin(t * 3) * 2;
            g.globalAlpha = Math.min(1, (heat - 0.45) * 2.5); g.fillStyle = '#bfe8ff';
            g.beginPath(); g.moveTo(x, y2 - 10); g.bezierCurveTo(x + 7, y2 - 1, x + 7, y2 + 7, x, y2 + 7); g.bezierCurveTo(x - 7, y2 + 7, x - 7, y2 - 1, x, y2 - 10); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x - 2, y2 + 1, 1.8, 0, TAU); g.fill(); g.globalAlpha = 1;
          }
        }
        // the cocktail flag carrying the player's thought: on the jelly, then on a paper boat in the bath
        let anc = null;
        if (phase !== 'intro' && landed) {
          const onJ = flagFloat < 1 ? (jellyA > 0.05 ? drawStick(g) : null) : null;
          const onB = flagFloat > 0 && T ? drawBoat(g, t, T) : null;
          if (onJ && onB) anc = { x: onJ.x + (onB.x - onJ.x) * flagFloat, y: onJ.y + (onB.y - onJ.y) * flagFloat, a: onJ.a * (1 - flagFloat) };
          else anc = onJ || onB;
        }
        if (anc) {
          const half = flagW / 2 + 8, x = K.clamp(anc.x, half, w - half);
          flagWrap.style.transform = 'translate(' + x.toFixed(1) + 'px,' + anc.y.toFixed(1) + 'px) rotate(' + anc.a.toFixed(3) + 'rad)';
        }
        if (visits >= 1 && pw > 0.3 && T) drawDuck(g, t, Math.min(1, (pw - 0.3) * 2), T);
        if (T) drawTubFront(g, T, tubA);
        if (big) { g.globalAlpha = heat * 0.16; g.fillStyle = '#ff3050'; g.fillRect(-10, -10, w + 20, H + 20); g.globalAlpha = 1; }
        P.update(dt); P.draw(g);
        if (shake) g.restore();
      }

      /* ---------------- frame loop ---------------- */
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !G.w || !built) return;
        now = t;
        const ez = (v, target, r) => v + (target - v) * Math.min(1, dt * r);
        B.s = ez(B.s, B.sT, B.sT > B.s ? 3 : 10);
        B.m = ez(B.m, B.mT, B.mT > B.m ? 1.4 : 0.9);
        const nowMs = performance.now(), rdt = Math.min(0.25, Math.max(0, (nowMs - lastMs) / 1000)); lastMs = nowMs;
        // quality guard: if frames stay slow, paint the big canvas with fewer pixels (never below 80%)
        if (rdt < 0.5) { qual.acc += rdt; qual.n++; }
        if (qual.n >= 120) { if (qual.acc / qual.n > 0.034 && qual.q > 0.81) { qual.q = Math.max(0.8, qual.q - 0.1); cv.setQuality(qual.q); } qual.acc = qual.n = 0; }
        const ezr = (v, target, r) => v + (target - v) * Math.min(1, rdt * r);
        B.pd = ezr(B.pd, B.pdT, 1.1);
        night = ezr(night, nightT, 0.55); pool = ezr(pool, poolT, 1.6); pw = ezr(pw, pwT, 1.3); flagFloat = ezr(flagFloat, flagFloatT, 1.2);
        if (consT >= 0) { cons = cons < 0 ? 0 : Math.min(consT, cons + rdt / 3.2); }
        const squeezing = phase === 'squeeze' || phase === 'letgo';
        heat = squeezing ? Math.min(1, heat + rdt * (cur.big ? 0.5 : 0.36)) : Math.max(0, heat - rdt * 0.42);
        B.trem = B.s > 0.04 ? (900 + 3600 * B.s) * (K.reduced() ? 0.3 : 1) * (phase === 'letgo' ? 1.3 : 1) : 0;
        if (FACE.until && now > FACE.until) { FACE.eyes = FACE.then[0]; FACE.mouth = FACE.then[1]; FACE.until = 0; }
        if (FACE.eyes === 'open' && now > FACE.nextBlink) { FACE.blink = 0.15; FACE.nextBlink = now + 2.2 + Math.random() * 3; }
        FACE.blink = Math.max(0, FACE.blink - dt);
        if (phase === 'squeeze' && pressing) { holdT = (performance.now() - holdT0) / 1000; if (holdT >= curHold) holdDone(); }
        if (phase === 'letgo' && pressing) {
          const over = (performance.now() - letgoAt) / 1000;
          if (over > 3.2 && !overNag) { overNag = 1; sync.say(line(LINES.nag), { ms: 2600 }); }
          if (over > 10) release(1);
        }
        physics(dt);
        measure();
        if (B.impact > 300 && !landed && phase !== 'intro') {
          landed = true; dropping = false;
          squelch(1.4, 0.7); if (au()) A.thud({ vol: 0.25 });
          P.emit('drop', B.cx, Pl.y - 10, 12, { colors: [rgba(COL.light, 0.9), rgba(COL.base, 0.9)], speed: [90, 220], angle: -Math.PI / 2, spread: 2.4 });
          setFace('O', 'o', 600, 'happy', 'grin'); S.later(() => { if (FACE.eyes === 'happy') setFace('open', 'smile'); }, 1700);
          sync.face('wow', 1000);
          flagWrap.classList.add('sq-on');
        }
        B.impact = 0;
        // wobble sounds, in step with the jelly's own bounce
        const hN = B.hNow; hAvg += (hN - hAvg) * Math.min(1, dt * 1.5);
        const d = hN - hPrev, dir = d > 0.15 ? 1 : d < -0.15 ? -1 : 0;
        if (dir && hDir && dir !== hDir && landed && !squeezing && pw < 0.5) { const amp = Math.abs(hN - hAvg); if (amp > 3 && t - lastBlub > 0.09) { blub(Math.min(1, amp / 36)); lastBlub = t; } }
        if (dir) hDir = dir; hPrev = hN;
        if (creak) {
          creak.level(squeezing ? 0.016 + 0.03 * B.s : 0.0001, 0.08);
          creak.freq(380 + 140 * Math.sin(t * 7.3) + 90 * Math.sin(t * 13.1), 0.05);
          inhale.level(phase === 'squeeze' ? 0.05 * B.s * K.clamp(holdT / curHold, 0.15, 1) : 0.0001, 0.12);
          inhale.freq(460 + 900 * K.clamp(holdT / curHold, 0, 1), 0.2);
        }
        if (squeezing && t > nextCreak) { creakTick(); nextCreak = t + 0.32 + Math.random() * 0.55; }
        if (B.m > 0.3 && pw < 0.3 && Math.random() < dt * 7 * B.m) P.emit('mote', B.cx + (Math.random() - 0.5) * B.wNow * 0.7, B.yBot - B.hNow * (0.3 + Math.random() * 0.6), 1, { colors: [rgba(COL.glow), '#fff6d8', rgba(COL.light)], speed: [10, 34] });
        if (heat > 0.35 && pw < 0.3 && Math.random() < dt * 4 * heat) P.emit('smoke', B.cx + (Math.random() - 0.5) * B.wNow * 0.4, B.yBot - B.hNow - 4, 1, { colors: ['rgba(255,150,160,0.22)'], speed: [10, 26], angle: -Math.PI / 2, spread: 0.6, size: [5, 10] });
        if (pool > 0.5 && Math.random() < dt * 6) P.emit('smoke', Pl.x + (Math.random() - 0.5) * Pool.rx * 1.6, Pl.y - 2, 1, { colors: [K.dark() ? 'rgba(255,240,236,0.14)' : 'rgba(255,248,244,0.22)'], speed: [8, 20], angle: -Math.PI / 2, spread: 0.5, size: [10, 22] });
        if (pw > 0.6 && Math.random() < dt * 0.6 && au()) A.tone({ type: 'sine', freq: 300 + Math.random() * 200, to: 700, glide: 0.06, dur: 0.08, vol: 0.02 });
        if (water) water.level(0.02 + 0.015 * Math.sin(t * 0.7), 0.4);
        draw(g, dt, t);
      });

      /* ---------------- flow ---------------- */
      const until = async (fn) => { while (!fn()) await S.sleep(70); };
      async function round(key, idx) {
        cur = RD[key]; roundIdx = idx; curHold = cur.big ? BIGHOLD : HOLD;
        phase = 'cue';
        setStep(cur.big ? 'The big one' : 'Squeeze ' + (idx + 1) + ' of ' + NR, cur.title, cur.do, SAFE);
        body.set(cur.regions, 'cue');
        sync.say(line(cur.cue), { mood: cur.big ? 'determined' : 'E51', ms: 4400 });
        music.level(0.5);
        guideHold(1000);
        for (;;) {
          await until(() => phase === 'released' || phase === 'retry');
          if (phase === 'released') break;
          await S.sleep(1300);
          if (phase !== 'retry') continue;
          phase = 'cue';
          setStep(null, null, cur.do, SAFE);
          guideHold(200);
        }
        if (cur.big) return;
        const rel = relInfo;
        phase = 'melt'; meltTouches = 0;
        B.mT = 1;
        setStep('Melt', 'Let go', cur.notice, 'Breathe out slowly');
        body.set(cur.regions, 'warm'); body.count(idx + 1); bloomTone(idx);
        sync.base('E13'); sync.say(line(cur.melt), { ms: 4600 });
        K.guide({ id: 'rest-' + idx, g: 'still', target: bodyEl, oy: G.phone ? 0.3 : 0.12, label: 'REST & NOTICE', ms: 3200, place: 'above', delay: 1700 });
        music.level(0.55); music.tempo(Math.max(52, 64 - idx * 4));
        await S.sleep(MELT * 1000);
        const still = Math.max(0, 1 - meltTouches * 0.34);
        scores.push(0.45 * rel.frac + 0.2 * rel.clean + 0.35 * still); stills.push(still);
        ctx.track('melt', { r: idx, still: Math.round(still * 100) });
        phase = 'reform'; B.mT = 0; K.guide(null);
        sync.base('E01');
        await S.sleep(1000);
        hop(200); squelch(0.4, 1.3); setFace('open', 'smile');
        await S.sleep(500);
      }
      async function bath() {
        const rel = relInfo;
        scores.push(0.45 * rel.frac + 0.2 * rel.clean + 0.35);
        phase = 'bath'; K.guide(null);
        B.pdT = 1; poolT = 1; flagFloatT = 0;
        stepEl.classList.remove('sq-swap'); stepEl.classList.add('sq-off');
        body.set(['hands', 'feet', 'shoulders', 'face', 'core'], 'warm'); body.count(NR);
        if (G.phone) { bodyEl.style.transition = 'left 1.4s cubic-bezier(.3, .9, .3, 1)'; bodyEl.style.left = Math.round(Pl.x - bodyEl.offsetWidth / 2) + 'px'; }
        if (au()) { A.noise({ pink: true, filter: 'lowpass', freq: 700, to: 160, dur: 1.6, attack: 0.04, vol: 0.2 }); A.thud({ vol: 0.2 }); water = A.loop({ pink: true, filter: 'lowpass', freq: 380, q: 0.5, bus: 'amb' }); }
        bloomTone(NR);
        sync.base('E69'); sync.say(line(LINES.bath), { ms: 4000 });
        music.level(0.45); music.tempo(50);
        await S.sleep(800);
        pwT = 1;
        await S.sleep(700);
        nightT = 1; amb.level(0.08, 3);
        await S.sleep(1300);
        flagFloatT = 1; flagEl.classList.add('sq-float'); S.later(measureFlag, 40);
        const sp = stillSpot();
        stillC = K.character('still', { side: 'left', mood: 'E78', size: sp.sz, x: sp.x, y: sp.y, decor: true });
        stillC.el.classList.add('sq-in');
        if (au()) A.tone({ type: 'sine', freq: 520, to: 880, glide: 0.2, dur: 0.3, vol: 0.05 });
        await S.sleep(1500);
        sync.say(line(care ? LINES.careFloat : ctx.text ? LINES.float : LINES.dayFloat), { ms: 4800 });
        await S.sleep(4300);
      }
      function stillSpot() {
        const sz = G.phone ? 70 : 92;
        return { sz, x: Math.round(Math.min(G.w - sz - 6, Pl.x + Pool.rx * 1.02 - sz * 0.7)), y: Math.round(Pl.y - sz * 0.8) };
      }
      function placeStill() { if (!stillC) return; const sp = stillSpot(); stillC.place(sp.x, sp.y); stillC.el.style.setProperty('--sz', sp.sz + 'px'); }
      async function finale() {
        phase = 'finale';
        sync.say(line(LINES.end), { ms: 3000 });
        body.all();
        consT = 1;
        await S.sleep(1400);
        sync.hush(); sync.base('E90');
        if (stillC) stillC.face('E19');
        setFace('sleep', 'sleep');
        await K.finale('stars', { colors: ['#fff6d8', rgba(COL.light), rgba(COL.glow)], text: 'Melted', chord: FR.chord, ms: 4200 });
        const sc = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.9, pct = Math.round(sc * 100);
        const badges = [];
        const pb = K.best('melt', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% melt'); else if (pb.first) badges.push('First melt: ' + pct + '%');
        const tier = K.tier(sc, [0.55, 0.75, 0.9]); if (tier) badges.push(tier + ': total melt');
        const col = K.collect(FR.name);
        badges.push((col.isNew ? 'Collected: ' : 'Old friend: ') + FR.name + ' (' + col.count + ' of ' + FRIENDS.length + ')');
        if (stills.length && stills.every(s => s >= 1)) badges.push('Still as a puddle');
        ctx.track('done', { melt: pct, rounds: NR });
        finished = true; phase = 'end';
        ctx.finish({
          title: 'Fully melted', mood: 'E69',
          lines: [NR + ' squeezes, ' + NR + ' melts', inten === 2 ? 'Hands, feet, shoulders, face: let go' : 'Hands, shoulders and face: let go', 'Today’s jelly: ' + FR.name],
          share: 'Squeezed, then melted. Shoulders officially down from my ears.',
          badges: badges.slice(0, 4)
        });
      }

      S.on('theme', () => { el.classList.toggle('sq-bright', !K.dark()); BG = null; });
      cv.onResize(() => layout());
      (async () => {
        await K.intro({ title: 'Squish', sub: 'Meet today’s jelly. Squeeze with it, then melt with it, and your body learns what letting go feels like.', how: 'Hold the jelly and tense with it, gently, about 70%. Let go to melt. Skip any spot that’s sore.', char: 'sync', mood: 'calm' });
        phase = 'hello';
        buildBody(true); dropping = true;
        if (au()) A.whoosh({ from: 1500, to: 300, dur: 0.6, vol: 0.08 });
        setStep('Today’s jelly', FR.name, 'Give it a poke', '');
        await S.sleep(700);
        if (ctx.text && an.kind && an.kind.length < 96 && !care) { sync.say(an.kind, { ms: 2700 }); await S.sleep(2800); }
        sync.say(line(LINES.hello).replace('{n}', FR.name), { mood: 'happy', ms: 4400 });
        K.guide({ id: 'poke', g: 'tap', target: jellyTarget, label: 'POKE THE JELLY', place: 'below', delay: 400 });
        await until(() => pokes > 0);
        K.guide(null);
        await S.sleep(700);
        sync.say(line(LINES.poked), { mood: 'laugh', ms: 3000 });
        await S.sleep(1400);
        for (let i = 0; i < NR; i++) await round(ORDER[i], i);
        await bath();
        await finale();
      })();

      return {
        async autoplay() {
          const local = (x, y) => ({ x: x - padL, y: y - padT });
          while (phase !== 'hello' || !landed) await K.wait(100);
          await K.wait(900);
          let p = local(B.cx, B.yBot - B.hNow * 0.5);
          await K.sim.tap(pad, p.x, p.y);
          let presses = 0;
          const t0 = performance.now();
          while (!finished && presses < 12 && performance.now() - t0 < 140000) {
            if (phase === 'bath' || phase === 'finale' || phase === 'end') break;
            if (phase !== 'cue') { await K.wait(100); continue; }
            await K.wait(450);
            if (phase !== 'cue') continue;
            presses++;
            p = local(B.cx, B.yBot - B.hNow * 0.5);
            const hnd = await K.sim.press(pad, p.x, p.y);
            while (phase === 'squeeze') await K.wait(80);
            await K.wait(380);
            hnd.up(p.x, p.y);
            await K.wait(250);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
