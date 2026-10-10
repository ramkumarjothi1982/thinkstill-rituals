/* 037 Blanket Fort — Reset · QUIET · Emotion
 * Mechanism: the DBT self-soothe skill (Linehan): comforting each of the five senses on purpose (something soft to touch, a
 * warm light to look at, a warm drink to smell and taste, a gentle sound to hear) calms distress and loneliness without
 * having to solve anything first. The player builds a blanket fort on a rainy night, one soothing thing per sense; their
 * looping thoughts stay outside as words on the rainy window and fog over as the room warms (still there, just quieter).
 * Twist: thunder; a worry flashes on the glass and the quilt slips; Patch and Drop hold it up while you peg it back.
 * Verb: drag (drape the quilt over the chairs, tuck in pillows, string the lights along the edge, bring the drink and the
 * music box), wind (circle), lift (invite everyone in). Finale: everyone snug inside under the fairy lights, then the
 * camera pulls out to the house's glowing window at night, in the rain.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const eo = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const back = (x) => { x = clamp(x, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const p = hex(a), q = hex(b); k = clamp(k, 0, 1); const f = (i) => Math.round(p[i] + (q[i] - p[i]) * k); return '#' + ((1 << 24) + (f(0) << 16) + (f(1) << 8) + f(2)).toString(16).slice(1); };
  const rgba = (c, a) => { const p = hex(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  function seedRng(s) { let x = (s * 2654435761) >>> 0 || 7; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const DISPLAY = '"Fuzzy Bubbles", "Chalkboard SE", "Comic Sans MS", "Segoe Print", system-ui, sans-serif';
  const HAND = '"Gaegu", "Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive, sans-serif';

  /* Today's weather outside (the same all day), the quilt and the warm drink. */
  const WEATHERS = [
    { id: 'soft', name: 'Soft rain', rain: 1, slant: 0.12, drops: 1, mist: 0 },
    { id: 'pour', name: 'Downpour', rain: 1.75, slant: 0.08, drops: 1.5, mist: 0.15 },
    { id: 'windy', name: 'Windy rain', rain: 1.2, slant: 0.45, drops: 1.1, mist: 0 },
    { id: 'drizzle', name: 'Misty drizzle', rain: 0.55, slant: 0.05, drops: 0.75, mist: 1 }
  ];
  const QUILTS = [
    { id: 'patch', name: 'Patchwork quilt', cols: ['#e07a5f', '#f2cc8f', '#81b29a', '#5b6b9a', '#f4ecd8'], kind: 'patch', motif: 'dot', bind: '#8a3b2e' },
    { id: 'stars', name: 'Starry quilt', cols: ['#2f3f73', '#47609a', '#f3cf68', '#ebe3cc'], kind: 'check', motif: 'star', bind: '#f3cf68' },
    { id: 'berry', name: 'Berry gingham', cols: ['#c8436a', '#f2a7bd', '#fff1f4'], kind: 'gingham', motif: 'heart', bind: '#8a2846' },
    { id: 'forest', name: 'Forest flannel', cols: ['#2f5d50', '#8bb174', '#e3c58e', '#b35a47'], kind: 'plaid', motif: 'leaf', bind: '#3a2a1e' }
  ];
  const DRINKS = [
    { id: 'cocoa', name: 'hot cocoa', liquid: '#6b3b25', mug: '#d65d4e', top: 'marsh' },
    { id: 'chamomile', name: 'chamomile tea', liquid: '#d9a441', mug: '#5f9f92', top: 'lemon' },
    { id: 'chai', name: 'warm chai', liquid: '#b07a48', mug: '#e3a93f', top: 'cinnamon' },
    { id: 'milk', name: 'warm milk and honey', liquid: '#f1e6d2', mug: '#7f9bd0', top: 'honey' }
  ];
  /* Fort decorations: one joins the collection per finished build and hangs in the fort on later visits. */
  const DECOR = [{ id: 'stars', name: 'Paper stars' }, { id: 'bunting', name: 'Bunting' }, { id: 'jar', name: 'Glow jar' }, { id: 'teddy', name: 'Teddy' }, { id: 'cranes', name: 'Paper cranes' }, { id: 'moon', name: 'Moon lamp' }];
  /* A new guest knocks at the window on later visits. */
  const GUESTS = [{ slug: 'loopie', name: 'Loopie', mood: 'sleepy' }, { slug: 'sync', name: 'Sync', mood: 'moon' }, { slug: 'rush', name: 'Rush', mood: 'sleepy' }, { slug: 'glitch', name: 'Glitch', mood: 'sleepy' }];
  const GENERIC = [{ label: 'THAT THING I SAID' }, { label: 'TOMORROW’S LIST' }, { label: 'WHAT IF IT GOES WRONG' }, { label: 'WHAT THEY THINK' }];
  const SENSES = [
    { id: 'touch', label: 'Touch', svg: '<path d="M7 12V6a1.5 1.5 0 0 1 3 0v5M10 10V4.5a1.5 1.5 0 0 1 3 0V10m0-4a1.5 1.5 0 0 1 3 0v5m0-3a1.5 1.5 0 0 1 3 0v6a6.5 6.5 0 0 1-6.5 6.5H12a6 6 0 0 1-5-2.7L4.2 15a1.5 1.5 0 0 1 2.4-1.8L7 14"/>' },
    { id: 'sight', label: 'Sight', svg: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' },
    { id: 'smell', label: 'Smell', svg: '<path d="M7 21c-2-3 2-5 0-8s2-5 0-8M12 21c-2-3 2-5 0-8s2-5 0-8M17 21c-2-3 2-5 0-8s2-5 0-8"/>' },
    { id: 'taste', label: 'Taste', svg: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2"/>' },
    { id: 'sound', label: 'Sound', svg: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>' }
  ];
  const BULB = ['#fff1c9', '#ffc46b', '#ff9aa2', '#9ee6c9', '#a8c8ff'];
  const PILLOWS = [{ col: '#e8b04a', pat: 'dots' }, { col: '#9cbf8f', pat: 'stripe' }, { col: '#d98e8e', pat: 'plain' }, { col: '#d9cdb4', pat: 'check' }];
  const BELL = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6'];
  // a rain-piano bed (4/4 at 60), then the music box lullaby (3/4 at 84) in F major
  const BED = [['F2', ['A3', 'C4', 'E4', 'G4']], ['D2', ['A3', 'C4', 'F4', 'A4']], ['Bb1', ['F3', 'A3', 'D4', 'F4']], ['C2', ['G3', 'Bb3', 'E4', 'G4']]];
  const LULL = [['C5', 'A4', 'F4'], ['G4', 'A4', 'Bb4'], ['A4', 'F4', 'C5'], ['C5', '', ''], ['D5', 'Bb4', 'G4'], ['A4', 'Bb4', 'C5'], ['Bb4', 'G4', 'E4'], ['F4', '', '']];
  const LBASS = ['F3', 'C3', 'F3', 'A2', 'Bb2', 'F3', 'C3', 'F3'];
  // the room, cool (the rain's light) and warm (the fort's), for each theme; the painting cross-fades as the fort grows
  const ROOM = {
    dark: {
      cool: { wall: '#2b3150', stripe: '#323a5e', sprig: 'rgba(150,165,215,0.16)', wain: '#232842', rail: '#3a4268', floor: '#3a3646', floorLine: '#2a2734', base: '#2e3350', frame: '#b9c0d6', sofa: '#34506a', sofaDark: '#273d55', wood: '#5b4d4e', rug: '#454a6e', rugB: '#5f6894', curtain: '#4a5684', shade: '#8f99bd', books: ['#4b5a86', '#6b5a7a', '#3f6a6a'] },
      warm: { wall: '#5a3940', stripe: '#653f47', sprig: 'rgba(255,200,160,0.14)', wain: '#462b31', rail: '#7a4e3f', floor: '#6e4630', floorLine: '#583725', base: '#5a3426', frame: '#f2e3c6', sofa: '#56715a', sofaDark: '#405841', wood: '#a0673e', rug: '#9c4f45', rugB: '#d8a25a', curtain: '#b5654a', shade: '#f6d79c', books: ['#c2593f', '#e0b04f', '#5b8f7a'] }
    },
    bright: {
      cool: { wall: '#c4cbdb', stripe: '#bac2d4', sprig: 'rgba(90,105,150,0.16)', wain: '#a9b1c5', rail: '#d4dae6', floor: '#a29996', floorLine: '#8b8381', base: '#d8dce6', frame: '#ffffff', sofa: '#6c8ca1', sofaDark: '#5a7a8e', wood: '#9a887e', rug: '#8c98ba', rugB: '#717ea6', curtain: '#8d9ec2', shade: '#d9def0', books: ['#7d8fb8', '#a493b0', '#7aa3a0'] },
      warm: { wall: '#f1d9c0', stripe: '#ebcfb3', sprig: 'rgba(190,110,70,0.16)', wain: '#ddbf9f', rail: '#f6e6d2', floor: '#c99a6b', floorLine: '#ad7f52', base: '#f3e2cc', frame: '#fff8ee', sofa: '#8fb08f', sofaDark: '#78987a', wood: '#c08a5c', rug: '#d98a6c', rugB: '#f2c46d', curtain: '#e48f6f', shade: '#fff1cf', books: ['#d9694c', '#f0c05a', '#6fa58f'] }
    }
  };

  /* The kit's daily pick, reproduced so tomorrow's weather can be named honestly. */
  const dayVal = (d) => d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  function pickFor(dv, arr, salt) {
    let x = (dv * 2654435761 + (salt || 0) * 40503 + Array.from('blanket-fort').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13;
    return arr[(x >>> 0) % arr.length];
  }

  /* Lines in all three vibes: Patch (host, connection), Drop (feelings), Still (calm, the body). */
  const L = {
    start: { Jolly: 'Rainy night. Let’s build a blanket fort, one cosy thing at a time.', Cheeky: 'Weather’s grim. Correct response: blanket fort.', Unfiltered: 'It’s pouring. We’re building a fort.' },
    quilt: { Jolly: 'Ooh, the soft one. Feel how heavy and warm it is.', Cheeky: 'Structural engineering: one quilt. Nailed it.', Unfiltered: 'Quilt’s up. Soft.' },
    quiltMiss: { Jolly: 'Up over the chairs. Lift it right up high.', Cheeky: 'Higher! It’s a fort, not a picnic.', Unfiltered: 'Higher. Over the chairs.' },
    rainThoughts: { Jolly: 'Your thoughts can wait out in the rain for a bit. They’ll keep.', Cheeky: 'The thoughts can stay outside. They have coats.', Unfiltered: 'Thoughts stay outside for now.' },
    pillow: { Jolly: 'Squishy. Soft things help, that’s allowed.', Cheeky: 'Maximum squish achieved.', Unfiltered: 'Soft. Good.' },
    pillowLast: { Jolly: 'Something soft under you, something warm over you.', Cheeky: 'Touch: sorted. Extremely plush.', Unfiltered: 'Touch: done.' },
    lightsTip: { Jolly: 'Now some lights. Run them along the edge.', Cheeky: 'Fairy lights. Fort law.', Unfiltered: 'Lights along the edge.' },
    lights: { Jolly: 'Look at that glow. Just look at it for a second.', Cheeky: 'Gorgeous. The fort has a vibe now.', Unfiltered: 'Nice glow.' },
    dropAsk: { Jolly: 'Ooh, lights! Is there room for one more?', Cheeky: 'Is this a party? I’m very damp. Let me in.', Unfiltered: 'Room for me? It’s wet out here.' },
    thunder: { Jolly: 'Whoa! Hold it, hold it!', Cheeky: 'Rude, thunder. Very rude.', Unfiltered: 'Thunder. It’s slipping!' },
    holdIt: { Jolly: 'Got it! Quick, pop a peg on it.', Cheeky: 'Holding it. Heroically. Peg, please.', Unfiltered: 'Holding it. Peg it.' },
    pegged: { Jolly: 'Sometimes a worry gets in. You can tuck the blanket back.', Cheeky: 'A worry barged in. You tucked it back. Smooth.', Unfiltered: 'A worry got in. You tucked it back.' },
    drink: { Jolly: 'Smell that first. Then a slow, warm sip.', Cheeky: 'Sip, don’t slurp. Or slurp. It’s your fort.', Unfiltered: 'Smell it. Then sip.' },
    boxTip: { Jolly: 'Last sense: something gentle to listen to.', Cheeky: 'Final ingredient: a soundtrack.', Unfiltered: 'One more: a sound.' },
    music: { Jolly: 'Listen. The rain sounds further away now.', Cheeky: 'Rain’s on mute. Music box is headlining.', Unfiltered: 'Rain’s quieter now.' },
    invite: { Jolly: 'It’s ready. Lift the edge and let’s all get in.', Cheeky: 'Fort complete. Open the door. VIP list: us.', Unfiltered: 'Lift the edge. We’re coming in.' },
    guest: { Jolly: 'Oh! Someone else heard there was a fort.', Cheeky: 'Uh oh. Word got out about the fort.', Unfiltered: 'One more guest.' },
    snug: { Jolly: 'This is nice. The rain can do what it likes out there.', Cheeky: 'Best fort on the street. Possibly the world.', Unfiltered: 'Warm. Dry. Together.' },
    glass: { Jolly: 'They’re only words on the glass. You’re in here.', Cheeky: 'Tap all you like. They can’t get in.', Unfiltered: 'Just words on glass.' }
  };

  (env.games = env.games || []).push({
    id: 'blanket-fort', mode: 'reset', name: 'Blanket Fort', verb: 'drag', family: 'QUIET', minutes: 2,
    parents: ['Emotion', 'Sleep / Winding Down', 'Social / Team / Perspective'],
    cast: ['patch', 'drop', 'still'], poster: { char: 'patch', mood: 'cosy' }, fonts: ['Fuzzy+Bubbles:wght@700', 'Gaegu:wght@700'],
    tagline: 'Build a blanket fort on a rainy night, one soothing sense at a time.',
    why: 'For a heavy or lonely moment: soothe each of your five senses on purpose, with friends.',
    css: `
.g-blanket-fort { --bf-display: ${DISPLAY}; --bf-hand: ${HAND}; --font-display: var(--bf-display);
  --ui-bg: #241d2e; --ui-surface: #2f2638; --ui-fg: #fbefe2; --ui-muted: #d9c6c0; --ui-accent: #ffc977; --ui-accent-ink: #2e1a06; --ui-line: rgba(251, 239, 226, 0.18); --ui-scrim: rgba(20, 12, 24, 0.55);
  background: #241d2e; color-scheme: dark; }
.tsg[data-scene="bright"] .g-blanket-fort { --ui-bg: #f6e9dc; --ui-surface: #fffaf3; --ui-fg: #3b2a2a; --ui-muted: #6e5a55; --ui-accent: #b5542f; --ui-accent-ink: #ffffff; --ui-line: rgba(59, 42, 42, 0.16); --ui-scrim: rgba(59, 42, 42, 0.3); background: #f2dcc4; color-scheme: light; }
.g-blanket-fort .gk-intro-title { font-weight: 700; }
.g-blanket-fort .bf-stage { position: absolute; inset: 0; z-index: 2; transform-origin: 0 0; }
.g-blanket-fort .bf-pad { position: absolute; inset: 0; z-index: 20; touch-action: none; cursor: grab; outline: none; -webkit-tap-highlight-color: transparent; }
.g-blanket-fort .bf-pad:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 210, 140, 0.8); }
.g-blanket-fort .bf-senses { position: absolute; z-index: 32; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 60px); transform: translateX(-50%); display: flex; gap: 3px; pointer-events: none; transition: opacity 0.8s ease; }
.g-blanket-fort .bf-sense { display: flex; align-items: center; gap: 2px; padding: 4px 6px 4px 4px; border-radius: 999px; font: 700 12px/1 var(--font-ui); letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap;
  color: rgba(251, 239, 226, 0.78); background: rgba(20, 14, 28, 0.55); border: 1px solid rgba(251, 239, 226, 0.16); transition: background 0.5s ease, color 0.5s ease, box-shadow 0.5s ease, border-color 0.5s ease; }
.g-blanket-fort .bf-sense svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.g-blanket-fort .bf-sense.on { color: #3a2208; background: linear-gradient(180deg, #ffe3ad, #ffc46c); border-color: rgba(255, 232, 186, 0.95); box-shadow: 0 0 16px rgba(255, 190, 100, 0.55); animation: blanket-fort-pop 0.5s cubic-bezier(.2, 1.6, .4, 1); }
.tsg[data-scene="bright"] .g-blanket-fort .bf-sense:not(.on) { color: rgba(59, 42, 42, 0.8); background: rgba(255, 250, 243, 0.8); border-color: rgba(59, 42, 42, 0.16); }
@keyframes blanket-fort-pop { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
@container (max-width: 374px) { .g-blanket-fort .bf-sense b { display: none; } .g-blanket-fort .bf-sense { padding: 6px; } }
.g-blanket-fort .bf-thought { position: absolute; z-index: 25; left: 0; top: 0; pointer-events: none; color: #eef3ff; width: max-content; transform-origin: 0 50%;
  text-shadow: 0 1px 2px rgba(8, 14, 34, 0.95), 0 0 10px rgba(130, 160, 240, 0.55); transition: opacity 1.2s ease, color 0.4s ease; }
.g-blanket-fort .bf-thought small { display: block; font: 700 12px/1.2 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.85; }
.g-blanket-fort .bf-thought .gk-user { display: block; font: 700 17px/1.05 var(--bf-hand); letter-spacing: 0.02em; }
.g-blanket-fort.bf-desk .bf-thought .gk-user { font-size: 21px; }
.g-blanket-fort.bf-desk .bf-sense { padding: 6px 10px 6px 7px; gap: 4px; letter-spacing: 0.05em; }
.g-blanket-fort.bf-desk .bf-senses { gap: 6px; }
.g-blanket-fort .bf-thought.bf-flash { color: #ffffff; text-shadow: 0 0 2px #fff, 0 0 18px rgba(200, 220, 255, 0.95), 0 1px 2px rgba(8, 14, 34, 0.95); }
.g-blanket-fort .bf-cap { position: absolute; left: 50%; top: 0; z-index: 36; transform: translate(-50%, -40%); text-align: center; pointer-events: none; opacity: 0; width: max-content; max-width: calc(100% - 32px);
  transition: opacity 1.4s ease, transform 1.8s cubic-bezier(.2, .9, .3, 1); color: #fff6ea; text-shadow: 0 3px 18px rgba(20, 8, 20, 0.85), 0 0 3px rgba(20, 8, 20, 0.7); }
.g-blanket-fort .bf-cap.bf-on { opacity: 1; transform: translate(-50%, -50%); }
.g-blanket-fort .bf-cap b { display: block; font: 700 clamp(27px, 8cqw, 48px)/1.1 var(--bf-display); text-wrap: balance; }
.g-blanket-fort .bf-cap span { display: block; margin-top: 8px; font: 600 14px/1.35 var(--font-ui); letter-spacing: 0.08em; color: #ffdcae; }
.g-blanket-fort .bf-cap i { display: block; margin-top: 3px; font: 700 18px/1.25 var(--bf-hand); font-style: normal; color: #ffe8c8; }
.g-blanket-fort .gk-bubble { max-width: min(250px, calc(100cqw - 150px)); }
.g-blanket-fort.bf-desk .gk-bubble { max-width: 300px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = clamp(Number(ctx.intensity) || 0, 0, 2);
      const care = () => an.safety === 'care';
      const say = (o) => (care() ? o.Jolly : ctx.line(o));
      const visits = K.visits();
      const today = dayVal(new Date());
      let WX = pickFor(today, WEATHERS, 3);
      try { if (S.isDev && S.isDev()) { const q = new URLSearchParams(location.search).get('bfweather'), f = WEATHERS.find(x => x.id === q); if (f) WX = f; } } catch (e) { /* dev preview only */ }
      const QU = pickFor(today, QUILTS, 7), DR = pickFor(today, DRINKS, 11);
      const TOMORROW = pickFor(dayVal(new Date(Date.now() + 864e5)), WEATHERS, 3);
      const NP = [2, 3, 3][inten];
      const GUEST = visits >= 1 ? GUESTS[(visits - 1) % GUESTS.length] : null;
      const owned = new Set(K.collection().filter(x => /^Decoration: /.test(x)).map(x => x.slice(12)));
      const DEC = new Set(DECOR.filter(d => owned.has(d.name)).map(d => d.id));

      /* ---------------- DOM: a stage (the room and everyone in it) that the camera can pull back from ---------------- */
      const stage = h('div', { class: 'bf-stage' });
      el.append(stage);
      const cv = K.canvas(stage, { opaque: true, maxDpr: 1.6 });
      const P = K.particles({ max: 260 });
      const pad = h('div', { class: 'bf-pad', role: 'application', tabindex: '0', 'aria-label': 'A living room on a rainy night. Build a blanket fort: drag the quilt over the chairs, tuck pillows inside, drag along the edge to string the fairy lights, then bring a warm drink and a music box, wind it, and lift the edge to invite everyone in. Space does the next step.' });
      const senses = h('div', { class: 'bf-senses', role: 'list', 'aria-label': 'Senses soothed' });
      const chips = {};
      SENSES.forEach(s => { const c = h('span', { class: 'bf-sense', role: 'listitem', html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + s.svg + '</svg><b>' + s.label + '</b>' }); chips[s.id] = c; senses.append(c); });
      const cap = h('div', { class: 'bf-cap', 'aria-live': 'polite' }, h('b'), h('span'), h('i'));
      el.append(pad, senses, cap);
      const patch = K.character('patch', { side: 'right', mood: 'worried', parent: stage, x: 8, y: 100, size: 56 });
      const still = K.character('still', { side: 'left', mood: 'calm', parent: stage, x: 300, y: 100, size: 56 });
      const drop = K.character('drop', { side: 'left', mood: 'rain', parent: stage, x: 260, y: 240, size: 50 });
      const guest = GUEST ? K.character(GUEST.slug, { side: 'right', mood: 'happy', parent: stage, x: 0, y: 0, size: 50 }) : null;
      if (guest) guest.show(false);
      const CH = { patch: { c: patch, until: 0 }, still: { c: still, until: 0 }, drop: { c: drop, until: 0 } };
      if (guest) CH.guest = { c: guest, until: 0 };
      let finished = false;
      // when: an optional check at speaking time, so a line that waited for someone else is dropped once it's stale
      function talk(who, o, ms, mood, moodMs, when) {
        if (finished || W.step === 'pull') return;
        const me = CH[who]; if (!me) return;
        const txt = say(o), now = performance.now(), busy = Object.keys(CH).filter(k => k !== who && CH[k].until > now + 300);
        const go = () => {
          if (finished || W.step === 'pull' || (when && !when())) return;
          Object.keys(CH).forEach(k => { if (k !== who) { CH[k].c.hush(); CH[k].until = 0; } });
          me.c.say(txt, { ms: ms || 3200, mood, moodMs }); me.until = performance.now() + (ms || 3200);
        };
        if (busy.length) { S.later(go, Math.min(2600, Math.max(...busy.map(k => CH[k].until)) - now)); return; }
        go();
      }

      /* ---------------- state ---------------- */
      const G = { w: 0, h: 0, phone: true, U: 1, cx: 0 };
      const W = { phase: 'intro', step: 'intro', ready: false, t: 0, warm: 0, warmT: 0, fog: 0, fogT: 0, lightsK: 0, flash: 0, bolt: null, pillows: 0, gentle: [], steady: [], sensesOn: {}, doorOpen: false, pull: null, glassTap: -9, spawnT: 0 };
      const CS = { patch: 'top', drop: 'win', still: 'top', guest: 'hidden' };
      const PLACED = [];          // pillows, the mug and the music box once they're in the fort
      let ITEM = null;            // the thing waiting on the rug or in your hand
      let BGc = null, BGw = null, OUT = null, FOG = null, DROPS = null, QS = null, MUGS = null, BOXS = null, PEGS = null, EXT = null, FR = null;
      const PSPR = [];
      const IN = { mode: null, fx: 0, fy: 0, sx: 0, sy: 0, hist: [], wa: 0, liftY0: 0 };
      const TMP = { x: 0, y: 0 }, TMP2 = { x: 0, y: 0 };
      function off(w, hh, alpha) { const c = document.createElement('canvas'); const d = cv.dpr || 1; c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(hh * d)); const g = c.getContext('2d', alpha === false ? { alpha: false } : undefined); g.setTransform(d, 0, 0, d, 0, 0); return { c, g, w, h: hh }; }

      /* ---------------- the quilt: a cloth of 11 x 7 points (Verlet, Jakobsen constraints) ----------------
         Row 0 is the edge you hold, which pins along the sofa back; the last row is the front edge that rests on the two
         chair backs and carries the lights. Carried, the quilt is a flat sheet; draped, its rest lengths blend into a
         canopy that is narrower at the back and sags toward you, so the patches foreshorten like a real awning. */
      const C = 11, R = 7, RB = R - 3, NPTS = C * R;
      const px = new Float32Array(NPTS), py = new Float32Array(NPTS), qx = new Float32Array(NPTS), qy = new Float32Array(NPTS);
      const LA = [], LB = [], LK = [], LR = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) { LA.push(r * C + c); LB.push(r * C + c + 1); LK.push(0); LR.push(r); }
      for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) { LA.push(r * C + c); LB.push((r + 1) * C + c); LK.push(1); LR.push(r); }
      for (let r = 0; r < R - 1; r++) for (let c = 0; c < C - 1; c++) { LA.push(r * C + c); LB.push((r + 1) * C + c + 1); LK.push(2); LR.push(r); LA.push(r * C + c + 1); LB.push((r + 1) * C + c); LK.push(2); LR.push(r); }
      const NL = LA.length, restF = new Float32Array(NL), restD = new Float32Array(NL), rest = new Float32Array(NL);
      const CL = { mode: 'none', k: 0, kT: 0, pt: new Array(NPTS).fill(null), top: [], cornerL: { x: 0, y: 0 }, cornerR: { x: 0, y: 0 }, held: { x: 0, y: 0 }, fallT: 0, hR: [], vR: [] };
      const iBL = (R - 1) * C, iBR = iBL + C - 1, iCL = RB * C, iCR = RB * C + C - 1;   // the hem's ends (lights), and the two corners on the chair backs
      function clothGeom() {
        const U = G.U, s = G.sofa;
        CL.top = []; for (let c = 0; c < C; c++) CL.top.push({ x: lerp(s.x0 + G.armW + 4 * U, s.x1 - G.armW - 4 * U, c / (C - 1)), y: s.y + 4 * U });
        CL.cornerL = { x: G.chairL.x, y: G.chairY - 1 * U }; CL.cornerR = { x: G.chairR.x, y: G.chairY - 1 * U };
        CL.held = G.held;
        const topSpan = CL.top[C - 1].x - CL.top[0].x, frontSpan = CL.cornerR.x - CL.cornerL.x;
        const d0 = Math.hypot(CL.cornerL.x - CL.top[0].x, CL.cornerL.y - CL.top[0].y), vTot = d0 * 1.08, valH = (G.phone ? 15 : 21) * U;
        const wts = []; let ws = 0; for (let r = 0; r < RB; r++) { const v = 0.55 + 0.9 * r / (RB - 1); wts.push(v); ws += v; }
        const hR = [], vR = []; for (let r = 0; r < R; r++) hR.push((r <= RB ? lerp(topSpan, frontSpan * 1.04, Math.pow(r / RB, 0.85)) : frontSpan * 1.07) / (C - 1));
        for (let r = 0; r < R - 1; r++) vR.push(r < RB ? vTot * wts[r] / ws : valH);
        CL.hR = hR; CL.vR = vR; CL.vCum = [0]; for (let r = 0; r < R - 1; r++) CL.vCum.push(CL.vCum[r] + vR[r]);
        const hF = frontSpan * 0.92 / (C - 1), vF = (vTot + valH * (R - 1 - RB)) / (R - 1);
        CL.flatW = frontSpan * 0.92; CL.flatH = vF * (R - 1);
        for (let k = 0; k < NL; k++) {
          const r = LR[k];
          if (LK[k] === 0) { restF[k] = hF; restD[k] = hR[r]; }
          else if (LK[k] === 1) { restF[k] = vF; restD[k] = vR[r]; }
          else { restF[k] = Math.hypot(hF, vF); restD[k] = Math.hypot((hR[r] + hR[r + 1]) / 2, vR[r]); }
        }
        setRest(CL.k);
      }
      // the shape a well-draped quilt settles into: the canopy from the sofa back to the chair backs, the valance hanging in front
      function idealPos(r, c, out) {
        const U = G.U, u = c / (C - 1), bow = 4 * u * (1 - u), T = CL.top[c], fx = lerp(CL.cornerL.x, CL.cornerR.x, u), fy = lerp(CL.cornerL.y, CL.cornerR.y, u) + 18 * U * bow;
        if (r <= RB) { const f = CL.vCum[r] / CL.vCum[RB]; out.x = lerp(T.x, fx, f); out.y = lerp(T.y, fy, f) + Math.sin(f * Math.PI) * 12 * U * bow; }
        else { out.x = fx; out.y = fy + CL.vCum[r] - CL.vCum[RB]; }
        return out;
      }
      function setRest(k) { for (let i = 0; i < NL; i++) rest[i] = restF[i] + (restD[i] - restF[i]) * k; }
      function pinAt(i, kind, o) { CL.pt[i] = Object.assign({ kind, fx: px[i], fy: py[i], t0: W.t, dur: 0 }, o || {}); }
      function pinPos(i, out) {
        const q = CL.pt[i], U = G.U; let tx = 0, ty = 0;
        if (q.kind === 'top') { tx = CL.top[q.c].x; ty = CL.top[q.c].y; }
        else if (q.kind === 'L') { tx = CL.cornerL.x; ty = CL.cornerL.y; }
        else if (q.kind === 'R') { tx = CL.cornerR.x; ty = CL.cornerR.y; }
        else if (q.kind === 'held') { tx = CL.held.x + Math.sin(W.t * 2.3) * 2 * U; ty = CL.held.y + Math.sin(W.t * 3.1) * 1.6 * U; }
        else { tx = IN.sx + q.ox; ty = IN.sy + q.oy; }      // in your hand
        const k = q.dur ? eo((W.t - q.t0) / q.dur) : 1;
        out.x = q.fx + (tx - q.fx) * k; out.y = q.fy + (ty - q.fy) * k;
      }
      function stepCloth(dt) {
        if (CL.mode === 'none' || CL.mode === 'tray') return;
        if (CL.k !== CL.kT) { CL.k = CL.kT > CL.k ? Math.min(CL.kT, CL.k + dt / 0.6) : Math.max(CL.kT, CL.k - dt / 0.3); setRest(CL.k); }
        const damp = 0.986, gdt = 1000 * G.U * dt * dt, fl = G.h - 4 * G.U;
        for (let i = 0; i < NPTS; i++) {
          if (CL.pt[i]) { pinPos(i, TMP); qx[i] = px[i]; qy[i] = py[i]; px[i] = TMP.x; py[i] = TMP.y; continue; }
          const vx = (px[i] - qx[i]) * damp, vy = (py[i] - qy[i]) * damp;
          qx[i] = px[i]; qy[i] = py[i]; px[i] += vx; py[i] += vy + gdt;
        }
        if (CL.mode === 'drape' && W.t - CL.guideT0 < 0.6) {
          const pull = Math.min(1, dt * 14) * (1 - (W.t - CL.guideT0) / 0.6);
          for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const i = r * C + c; if (CL.pt[i]) continue; idealPos(r, c, TMP2); const dx = (TMP2.x - px[i]) * pull, dy = (TMP2.y - py[i]) * pull; px[i] += dx; py[i] += dy; qx[i] += dx * 0.7; qy[i] += dy * 0.7; }
        }
        for (let it = 0; it < 10; it++) {
          for (let k = 0; k < NL; k++) {
            const a = LA[k], b = LB[k], pa = CL.pt[a], pb = CL.pt[b];
            if (pa && pb) continue;
            const dx = px[b] - px[a], dy = py[b] - py[a], d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
            let diff = (d - rest[k]) / d;
            // cloth resists stretching but has almost no strength in compression, so it sags and folds instead of standing up as an arch
            diff *= diff > 0 ? (LK[k] === 2 ? 0.3 : 1) : (LK[k] === 1 ? 0.05 : 0);
            if (pa) { px[b] -= dx * diff; py[b] -= dy * diff; }
            else if (pb) { px[a] += dx * diff; py[a] += dy * diff; }
            else { const hx = dx * diff * 0.5, hy = dy * diff * 0.5; px[a] += hx; py[a] += hy; px[b] -= hx; py[b] -= hy; }
          }
        }
        for (let i = 0; i < NPTS; i++) if (py[i] > fl) { py[i] = fl; qx[i] = px[i] - (px[i] - qx[i]) * 0.4; }
        if (CL.mode === 'fall' && W.t - CL.fallT > 1.0) refold();
      }
      function poke(x, y, s) { if (CL.mode !== 'drape') return false; let hit = false; const R0 = 70 * G.U; for (let i = 0; i < NPTS; i++) { if (CL.pt[i]) continue; const d = Math.hypot(px[i] - x, py[i] - y); if (d < R0) { const f = (1 - d / R0) * s * G.U; qy[i] -= f; qx[i] -= (x - px[i]) / (d || 1) * f * 0.4; hit = true; } } return hit; }

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700, U = phone ? clamp(Math.min(w / 390, H / 800), 0.82, 1.2) : clamp(Math.min(H / 860, w / 1250), 0.85, 1.4);
        Object.assign(G, { w, h: H, phone, U, cx: w / 2 });
        el.classList.toggle('bf-desk', !phone);
        const cx = w / 2, SW = phone ? w : Math.min(w, 1.45 * H);
        if (phone) {
          const ww = Math.min(0.66 * w, 270 * U);
          G.win = { x: cx - ww / 2, y: 0.122 * H, w: ww, h: 0.245 * H };
          G.sofa = { x0: cx - 0.34 * w, x1: cx + 0.34 * w, y: 0.445 * H };
          G.chairX = Math.min(0.39 * w, 162 * U); G.chairY = 0.575 * H; G.seatY = 0.685 * H; G.feetY = 0.79 * H;
          G.floorBack = 0.6 * H; G.floorIn = 0.775 * H; G.spawn = { x: cx, y: 0.885 * H };
          G.chairBW = 46 * U; G.cs = 56; G.csWin = 50;
        } else {
          G.win = { x: cx - 0.2 * SW, y: 0.125 * H, w: 0.4 * SW, h: 0.25 * H };
          G.sofa = { x0: cx - 0.24 * SW, x1: cx + 0.24 * SW, y: 0.405 * H };
          G.chairX = 0.28 * SW; G.chairY = 0.585 * H; G.seatY = 0.7 * H; G.feetY = 0.815 * H;
          G.floorBack = 0.6 * H; G.floorIn = 0.805 * H; G.spawn = { x: cx, y: 0.915 * H };
          G.chairBW = 66 * U; G.cs = 84; G.csWin = 74;
        }
        G.glass = { x: G.win.x + 9 * U, y: G.win.y + 9 * U, w: G.win.w - 18 * U, h: G.win.h - 18 * U };
        G.armW = (phone ? 26 : 40) * U;
        G.wain = G.floorBack - 0.12 * H;
        G.chairL = { x: cx - G.chairX, y: G.chairY }; G.chairR = { x: cx + G.chairX, y: G.chairY };
        G.inL = G.chairL.x + G.chairBW * 0.62; G.inR = G.chairR.x - G.chairBW * 0.62;
        G.pillowW = (phone ? 58 : 84) * U; G.pillowH = (phone ? 38 : 52) * U;
        G.books = { x: G.inL + (phone ? 22 : 38) * U, w: (phone ? 40 : 58) * U, h: (phone ? 20 : 28) * U };
        G.mugW = (phone ? 24 : 32) * U; G.mugH = (phone ? 28 : 38) * U;
        G.boxW = (phone ? 44 : 62) * U; G.boxH = (phone ? 28 : 40) * U;
        G.boxX = G.inR - G.boxW / 2 - (phone ? 10 : 22) * U;
        G.pegW = (phone ? 11 : 14) * U; G.pegH = (phone ? 36 : 48) * U;
        G.lamp = phone ? null : { x: G.chairL.x - 190 * U, y: G.floorBack + 12 * U, shadeY: G.win.y + 60 * U };
        G.shelf = phone ? null : { x: G.chairR.x + 62 * U, w: 118 * U, y: 0.22 * H, b: G.floorBack + 4 * U };
        const sl0 = phone ? G.books.x + G.books.w / 2 + G.pillowW * 0.45 : cx - 160 * U, sl1 = phone ? G.boxX - G.boxW / 2 - G.pillowW * 0.42 : cx + 160 * U;
        if (!G.slots) G.slots = Array.from({ length: NP }, (_, i) => ({ x: 0, used: false, dy: [0, -5, -2][i % 3], rot: [-0.09, 0.06, 0.11][i % 3], k: [1.04, 0.92, 1.0][i % 3] }));
        G.slots.forEach((sl, i) => { sl.x = NP > 1 ? lerp(sl0, sl1, i / (NP - 1)) : (sl0 + sl1) / 2; });
        G.held = { x: G.chairR.x - 40 * U, y: G.chairY + 40 * U };
        // where everyone sits or stands
        const top = 100, s0 = G.cs, sw = G.csWin, gl = G.glass;
        G.spots = {
          pTop: phone ? { x: 8, y: top, s: s0, side: 'right' } : { x: G.chairL.x - s0 - 46 * U, y: G.chairY - 10 * U, s: s0, side: 'right' },
          sTop: phone ? { x: w - s0 - 8, y: top, s: s0, side: 'left' } : { x: G.chairR.x + 46 * U, y: G.chairY - 10 * U, s: s0, side: 'left' },
          dWin: { x: gl.x + gl.w - sw - 6 * U, y: gl.y + gl.h - sw - 4 * U, s: sw, side: 'left' },
          gWin: { x: gl.x + gl.w - sw - 6 * U, y: gl.y + gl.h - sw - 4 * U, s: sw, side: 'left' },
          dRoom: phone ? { x: w - 58, y: G.sofa.y - 6 * U, s: 52, side: 'left' } : { x: G.chairR.x + 146 * U, y: G.chairY - 70 * U, s: 76, side: 'left' },
          hold1: { x: G.held.x - (phone ? 52 : 76) - 12 * U, y: G.held.y - (phone ? 52 : 76) * 0.5, s: phone ? 52 : 76, side: 'above' },
          hold2: { x: G.held.x + 12 * U, y: G.held.y - (phone ? 52 : 76) * 0.3, s: phone ? 52 : 76, side: 'above' }
        };
        const crew = ['patch', 'drop', 'still'].concat(GUEST ? ['guest'] : []), n = crew.length;
        const x0 = G.books.x + G.books.w / 2 - (n > 3 ? 8 : 0) * U, x1 = G.boxX - G.boxW / 2 + (n > 3 ? 8 : 0) * U, gap = 4 * U;
        const si = Math.min(phone ? 50 : 78, (x1 - x0 - gap * (n - 1)) / n, phone ? 50 : 78);
        crew.forEach((k, i) => { G.spots['in_' + k] = { x: x0 + (x1 - x0 - (si * n + gap * (n - 1))) / 2 + i * (si + gap), y: G.floorIn - si + 2 * U, s: Math.round(si), side: 'above' }; });
        clothGeom();
        if (CL.mode === 'tray' || CL.mode === 'none') restFlat();
        paintAll();
        if (THOUGHTS.length && G.lastPhone !== phone && (W.step === 'intro' || W.step === 'quilt')) makeThoughts(); else placeThoughts();
        G.lastPhone = phone;
        placeChars(0);
        cap.style.top = Math.round(H * (phone ? 0.16 : 0.13)) + 'px';
        if (W.pull) { const s = W.pull.s, ww = w * s, hh = H * s, cy = H * (phone ? 0.53 : 0.56); W.pull.x = (w - ww) / 2; W.pull.y = cy - hh / 2; G.ext = { x: W.pull.x, y: W.pull.y, w: ww, h: hh }; W.pull.k = -1; }
      }
      function restFlat() { for (let i = 0; i < NPTS; i++) { px[i] = qx[i] = G.spawn.x; py[i] = qy[i] = G.spawn.y; } }

      /* ---------------- characters' places ---------------- */
      function spot(who) {
        const s = CS[who], SP = G.spots; if (!SP) return null;
        if (s === 'in') return SP['in_' + who];
        if (who === 'patch') return s === 'hold' ? SP.hold1 : SP.pTop;
        if (who === 'still') return SP.sTop;
        if (who === 'drop') return s === 'win' ? SP.dWin : s === 'hold' ? SP.hold2 : SP.dRoom;
        if (who === 'guest') return s === 'hidden' ? null : SP.gWin;
        return null;
      }
      function placeOne(who, ms) {
        const ch = CH[who]; if (!ch) return; const p = spot(who); if (!p) return;
        if (ms && !ch.c.bubble.hidden) { ch.c.hush(); ch.until = 0; }   // a moving character's bubble is put away: no stale offsets, nothing past the edges
        ch.c.bubble.style.translate = '';
        ch.c.el.style.setProperty('--sz', p.s + 'px'); ch.c.place(p.x, p.y, ms); ch.c.side(p.side);
        if (!ch.c.bubble.hidden) S.later(() => { try { if (!ch.c.bubble.hidden) ch.c.fit(); } catch (e) { /* layout not ready */ } }, 60);
      }
      function placeChars(ms) { Object.keys(CH).forEach(k => placeOne(k, ms)); }

      /* ---------------- the player's thoughts, written on the rainy window ---------------- */
      let THOUGHTS = [];
      function buildThoughts() {
        const N = G.phone ? 2 : 3, key = (s) => String(s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
        const strands = (an.strands || []).filter(s => s && s.label), core = an.core && an.core.label ? an.core : null;
        const seen = new Set(core ? [key(core.label)] : []), out = [];
        for (const s of strands) { if (out.length >= N) break; const k = key(s.label); if (!k || seen.has(k)) continue; seen.add(k); out.push({ text: s.label, generic: !!s.generic }); }
        for (const g of GENERIC) { if (out.length >= Math.min(2, N)) break; if (seen.has(key(g.label))) continue; seen.add(key(g.label)); out.push({ text: g.label, generic: true }); }
        const c = core ? { text: core.label, generic: !!core.generic } : (out.length ? out.shift() : { text: 'EVERYTHING AT ONCE', generic: true });
        c.core = true;
        out.splice(1, 0, c);
        return out;
      }
      function makeThoughts() {
        THOUGHTS.forEach(t => t.el.remove());
        THOUGHTS = buildThoughts().map(it => {
          const e = h('div', { class: 'bf-thought' }, it.generic ? h('small', { text: 'A thought like…' }) : null, h('span', { class: 'gk-user', text: it.text }));
          stage.append(e); return Object.assign(it, { el: e, op: -1 });
        });
        placeThoughts();
      }
      function placeThoughts() {
        if (!G.glass || !THOUGHTS.length) return;
        const gl = G.glass, U = G.U, maxW = gl.w - (G.phone ? 70 : 104) * U;
        let y = gl.y + gl.h * (G.phone ? 0.42 : 0.17);
        THOUGHTS.forEach((t, i) => {
          t.el.style.maxWidth = Math.round(maxW) + 'px';
          const hh = t.el.offsetHeight || 24, x = gl.x + 12 * U + (i % 2) * 18 * U;
          t.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${i % 2 ? 1.6 : -1.4}deg)`;
          t.el.hidden = y + hh > gl.y + gl.h - 4 * U;
          y += hh + 7 * U;
        });
      }
      function updateThoughts() {
        if (W.step === 'pull') return;
        THOUGHTS.forEach(t => { const o = t.flash ? 1 : clamp(1 - W.fog * 0.74, 0.26, 1); if (Math.abs(o - t.op) > 0.02) { t.op = o; t.el.style.opacity = o.toFixed(2); } });
      }

      /* ---------------- painting (once per size and theme): the room cool and warm, the view out, sprites ---------------- */
      function paintAll() {
        const D = K.dark(), T = ROOM[D ? 'dark' : 'bright'];
        BGc = paintRoom(T.cool); BGw = paintRoom(T.warm);
        OUT = paintOutside(); FOG = paintFog(); DROPS = paintDrops();
        QS = paintFolded(); MUGS = paintMug(); BOXS = paintBox(); PEGS = paintPeg();
        PSPR.length = 0; for (let i = 0; i < 4; i++) PSPR.push(paintPillow(PILLOWS[i % PILLOWS.length]));
        if (EXT) paintExterior();
      }
      function sprig(g, x, y, U, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x - 3 * U, y, 3.2 * U, 1.4 * U, -0.6, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + 3 * U, y - 1 * U, 3.2 * U, 1.4 * U, 0.6, 0, TAU); g.fill(); g.beginPath(); g.arc(x, y - 4.2 * U, 1.7 * U, 0, TAU); g.fill(); }
      function paintRoom(Pal) {
        const w = G.w, H = G.h, U = G.U, o = off(w, H, false), g = o.g, rr = seedRng(17), cx = G.cx;
        // wall, striped paper with little sprigs
        let gr = g.createLinearGradient(0, 0, 0, G.floorBack);
        gr.addColorStop(0, mix(Pal.wall, '#000000', 0.24)); gr.addColorStop(0.7, Pal.wall); gr.addColorStop(1, mix(Pal.wall, '#000000', 0.08));
        g.fillStyle = gr; g.fillRect(0, 0, w, G.floorBack + 2);
        const sw = 30 * U;
        g.fillStyle = rgba(Pal.stripe, 0.7);
        for (let x = (cx % (sw * 2)) - sw * 2; x < w + sw; x += sw * 2) g.fillRect(x - sw * 0.2, 0, sw * 0.4, G.wain);
        for (let y = 24 * U, row = 0; y < G.wain - 12 * U; y += 40 * U, row++) for (let x = (cx % (sw * 2)) - sw * 2 + (row % 2 ? sw : 0); x < w + sw; x += sw * 2) sprig(g, x, y, U, Pal.sprig);
        // wainscot panels and the rail
        g.fillStyle = Pal.wain; g.fillRect(0, G.wain, w, G.floorBack - G.wain);
        const pw = 72 * U;
        for (let x = (cx % pw) - pw; x < w; x += pw) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 9 * U, G.wain + 12 * U, pw - 18 * U, G.floorBack - G.wain - 26 * U); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 9 * U, G.floorBack - 15 * U, pw - 18 * U, 2 * U); }
        g.fillStyle = Pal.rail; g.fillRect(0, G.wain - 4 * U, w, 7 * U); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, G.wain + 3 * U, w, 2.5 * U);
        // floorboards in perspective
        gr = g.createLinearGradient(0, G.floorBack, 0, H); gr.addColorStop(0, mix(Pal.floor, '#000000', 0.3)); gr.addColorStop(1, Pal.floor);
        g.fillStyle = gr; g.fillRect(0, G.floorBack, w, H - G.floorBack);
        g.strokeStyle = rgba(Pal.floorLine, 0.8); g.lineWidth = 1.2 * U;
        let prevY = G.floorBack; const NB = 11;
        for (let k = 1; k <= NB; k++) {
          const y = G.floorBack + (H - G.floorBack) * Math.pow(k / NB, 1.4), pl = (80 + 70 * k / NB) * U;
          g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
          for (let x = (k % 2 ? pl * 0.5 : 0) + rr() * pl * 0.3; x < w; x += pl) { g.beginPath(); g.moveTo(x, prevY); g.lineTo(x, y); g.stroke(); }
          prevY = y;
        }
        g.fillStyle = Pal.base; g.fillRect(0, G.floorBack - 9 * U, w, 9 * U); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, G.floorBack, w, 3 * U);
        paintWindowFrame(g, Pal);
        if (G.lamp) paintLamp(g, Pal);
        if (G.shelf) paintShelf(g, Pal, rr);
        paintSofa(g, Pal);
        paintRug(g, Pal);
        paintBooks(g, Pal);
        paintChair(g, G.chairL.x, Pal); paintChair(g, G.chairR.x, Pal);
        return o;
      }
      function paintWindowFrame(g, Pal) {
        const U = G.U, wn = G.win, gl = G.glass, cw = (G.phone ? 34 : 64) * U, rodY = wn.y - 16 * U, cBot = G.phone ? wn.y + wn.h + 34 * U : G.floorBack - 14 * U;
        // curtain rod
        g.fillStyle = mix(Pal.wood, '#000000', 0.2); g.fillRect(wn.x - cw - 14 * U, rodY - 2 * U, wn.w + cw * 2 + 28 * U, 4 * U);
        [wn.x - cw - 14 * U, wn.x + wn.w + cw + 14 * U].forEach(x => { g.beginPath(); g.arc(x, rodY, 5 * U, 0, TAU); g.fill(); });
        // frame, glass placeholder, sill
        g.fillStyle = 'rgba(0,0,0,0.25)'; rrect(g, wn.x - 5 * U, wn.y - 2 * U, wn.w + 12 * U, wn.h + 14 * U, 4 * U); g.fill();
        g.fillStyle = Pal.frame; rrect(g, wn.x - 7 * U, wn.y - 7 * U, wn.w + 14 * U, wn.h + 14 * U, 5 * U); g.fill();
        g.fillStyle = '#0f1729'; g.fillRect(gl.x, gl.y, gl.w, gl.h);
        g.fillStyle = mix(Pal.frame, '#000000', 0.1); rrect(g, wn.x - 16 * U, wn.y + wn.h + 5 * U, wn.w + 32 * U, 10 * U, 3 * U); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(wn.x - 12 * U, wn.y + wn.h + 15 * U, wn.w + 24 * U, 5 * U);
        // curtains, tied back, folds in the fabric
        const drawLeft = () => {
          const xo = wn.x - cw - 6 * U, tieY = lerp(rodY, cBot, 0.55);
          g.beginPath(); g.moveTo(xo, rodY); g.lineTo(xo + cw + 10 * U, rodY);
          g.quadraticCurveTo(xo + cw * 0.95, tieY - (tieY - rodY) * 0.35, xo + cw * 0.42, tieY);
          g.quadraticCurveTo(xo + cw * 0.95, tieY + (cBot - tieY) * 0.45, xo + cw * 0.86, cBot);
          g.lineTo(xo, cBot); g.closePath();
          g.fillStyle = Pal.curtain; g.fill();
          const lg = g.createLinearGradient(xo, 0, xo + cw, 0);
          for (let k = 0; k <= 6; k++) lg.addColorStop(k / 6, k % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.2)');
          g.fillStyle = lg; g.fill();
          g.fillStyle = mix(Pal.curtain, '#000000', 0.3); g.beginPath(); g.ellipse(xo + cw * 0.45, tieY, cw * 0.5, 4 * U, -0.15, 0, TAU); g.fill();
        };
        drawLeft(); g.save(); g.translate(2 * (wn.x + wn.w / 2), 0); g.scale(-1, 1); drawLeft(); g.restore();
      }
      function paintLamp(g, Pal) {
        const U = G.U, L0 = G.lamp, x = L0.x;
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x, L0.y + 4 * U, 26 * U, 6 * U, 0, 0, TAU); g.fill();
        g.fillStyle = mix(Pal.wood, '#000000', 0.35); g.beginPath(); g.ellipse(x, L0.y, 20 * U, 5 * U, 0, 0, TAU); g.fill();
        g.fillRect(x - 2.5 * U, L0.shadeY + 30 * U, 5 * U, L0.y - L0.shadeY - 30 * U);
        const sy = L0.shadeY, gr = g.createLinearGradient(x - 44 * U, 0, x + 44 * U, 0);
        gr.addColorStop(0, mix(Pal.shade, '#000000', 0.18)); gr.addColorStop(0.5, Pal.shade); gr.addColorStop(1, mix(Pal.shade, '#000000', 0.25));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - 26 * U, sy); g.lineTo(x + 26 * U, sy); g.lineTo(x + 42 * U, sy + 44 * U); g.lineTo(x - 42 * U, sy + 44 * U); g.closePath(); g.fill();
      }
      function paintShelf(g, Pal, rr) {
        const U = G.U, s = G.shelf, wood = mix(Pal.wood, '#000000', 0.15);
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(s.x + 6 * U, s.y + 6 * U, s.w, s.b - s.y);
        g.fillStyle = wood; g.fillRect(s.x, s.y, s.w, s.b - s.y);
        g.fillStyle = mix(wood, '#000000', 0.35); g.fillRect(s.x + 6 * U, s.y + 6 * U, s.w - 12 * U, s.b - s.y - 12 * U);
        const n = 3, sh = (s.b - s.y - 12 * U) / n;
        for (let k = 0; k < n; k++) {
          const by = s.y + 6 * U + sh * (k + 1);
          let x = s.x + 9 * U;
          while (x < s.x + s.w - 20 * U) { const bw = (8 + rr() * 8) * U, bh = sh * (0.55 + rr() * 0.3); g.fillStyle = Pal.books[Math.floor(rr() * 3)]; g.fillRect(x, by - bh, bw, bh); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 2 * U, by - bh + 5 * U, bw - 4 * U, 2 * U); x += bw + 1.5 * U; }
          g.fillStyle = wood; g.fillRect(s.x + 6 * U, by - 2 * U, s.w - 12 * U, 5 * U);
        }
        // a plant on top
        const pxx = s.x + s.w * 0.5, py0 = s.y;
        g.fillStyle = mix(Pal.wood, '#ffffff', 0.15); g.beginPath(); g.moveTo(pxx - 14 * U, py0 - 22 * U); g.lineTo(pxx + 14 * U, py0 - 22 * U); g.lineTo(pxx + 10 * U, py0); g.lineTo(pxx - 10 * U, py0); g.closePath(); g.fill();
        g.fillStyle = '#5f8f5a'; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.38; g.beginPath(); g.ellipse(pxx + Math.cos(a) * 16 * U, py0 - 26 * U + Math.sin(a) * 14 * U, 11 * U, 4.5 * U, a, 0, TAU); g.fill(); }
      }
      function paintSofa(g, Pal) {
        const U = G.U, x0 = G.sofa.x0, x1 = G.sofa.x1, y = G.sofa.y, base = G.floorBack + 8 * U, armW = G.armW, hgt = base - y;
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse((x0 + x1) / 2, base + 2 * U, (x1 - x0) * 0.52, 8 * U, 0, 0, TAU); g.fill();
        g.fillStyle = Pal.sofaDark; rrect(g, x0, y, x1 - x0, hgt, 14 * U); g.fill();
        const nC = G.phone ? 2 : 3, cwid = (x1 - x0 - armW * 2) / nC;
        for (let i = 0; i < nC; i++) {
          const c0 = x0 + armW + i * cwid, gr = g.createLinearGradient(0, y + 6 * U, 0, y + hgt * 0.62);
          gr.addColorStop(0, mix(Pal.sofa, '#ffffff', 0.14)); gr.addColorStop(1, Pal.sofa);
          g.fillStyle = gr; rrect(g, c0 + 3 * U, y + 6 * U, cwid - 6 * U, hgt * 0.56, 12 * U); g.fill();
        }
        g.fillStyle = mix(Pal.sofa, '#ffffff', 0.08); rrect(g, x0 + armW - 4 * U, y + hgt * 0.6, x1 - x0 - armW * 2 + 8 * U, hgt * 0.2, 8 * U); g.fill();
        [x0, x1 - armW].forEach(ax => { const gr = g.createLinearGradient(0, y + hgt * 0.3, 0, base); gr.addColorStop(0, mix(Pal.sofa, '#ffffff', 0.12)); gr.addColorStop(1, Pal.sofaDark); g.fillStyle = gr; rrect(g, ax, y + hgt * 0.3, armW, hgt * 0.7, 10 * U); g.fill(); });
      }
      function paintRug(g, Pal) {
        const U = G.U, cx = G.cx, cy = lerp(G.floorIn, G.h, 0.52), rx = G.phone ? G.w * 0.47 : G.chairX * 1.08, ry = (G.h - G.floorIn) * 0.4;
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(cx, cy + 4 * U, rx, ry, 0, 0, TAU); g.fill();
        const rings = [Pal.rugB, mix(Pal.rugB, Pal.rug, 0.5), Pal.rug, mix(Pal.rug, '#ffffff', 0.1), Pal.rug, mix(Pal.rug, '#000000', 0.08), mix(Pal.rug, Pal.rugB, 0.25), Pal.rug, mix(Pal.rug, '#ffffff', 0.06), mix(Pal.rug, '#000000', 0.06), Pal.rug, mix(Pal.rug, Pal.rugB, 0.35), Pal.rug, mix(Pal.rug, '#ffffff', 0.12)];
        const n = 14, sx = (rx - 8 * U) / n, sy = (ry - 5 * U) / n;
        for (let k = 0; k < n; k++) {
          const ex = rx - k * sx, ey = ry - k * sy;
          g.fillStyle = rings[k % rings.length]; g.beginPath(); g.ellipse(cx, cy, ex, ey, 0, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.8 * U; g.setLineDash([2.5 * U, 2 * U]); g.beginPath(); g.ellipse(cx, cy, ex - sx * 0.5, ey - sy * 0.5, 0, 0, TAU); g.stroke();
        }
        g.setLineDash([]);
        const sh = g.createRadialGradient(cx, cy - ry * 0.3, 2, cx, cy, rx); sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(0,0,0,0.16)');
        g.fillStyle = sh; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
      }
      function paintBooks(g, Pal) {
        const U = G.U, b = G.books, cols = Pal.books;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(b.x, G.floorIn + 1 * U, b.w * 0.6, 4 * U, 0, 0, TAU); g.fill();
        const hh = b.h / 3;
        for (let k = 0; k < 3; k++) { const y = G.floorIn - hh * (k + 1), ww = b.w * (1 - k * 0.08), xo = (k % 2 ? 2 : -2) * U; g.fillStyle = cols[k % 3]; rrect(g, b.x - ww / 2 + xo, y, ww, hh - 0.5 * U, 2 * U); g.fill(); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(b.x - ww / 2 + xo + 3 * U, y + hh * 0.3, ww - 8 * U, hh * 0.35); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(b.x - ww / 2 + xo, y + hh - 1.5 * U, ww, 1 * U); }
      }
      function paintChair(g, x, Pal) {
        const U = G.U, bw = G.chairBW, sw = bw * 1.3, top = G.chairY, seat = G.seatY, feet = G.feetY, wood = Pal.wood, dk = mix(wood, '#000000', 0.32), lt = mix(wood, '#ffffff', 0.16);
        g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(x, feet + 2 * U, sw * 0.62, 6 * U, 0, 0, TAU); g.fill();
        g.fillStyle = dk; g.fillRect(x - bw * 0.42, seat, 5 * U, (feet - seat) * 0.8); g.fillRect(x + bw * 0.42 - 5 * U, seat, 5 * U, (feet - seat) * 0.8);
        g.fillStyle = wood; rrect(g, x - bw / 2, top, 7 * U, seat - top + 4 * U, 3 * U); g.fill(); rrect(g, x + bw / 2 - 7 * U, top, 7 * U, seat - top + 4 * U, 3 * U); g.fill();
        g.fillStyle = dk; for (let k = 1; k <= 3; k++) { const sx = x - bw / 2 + (bw * k) / 4; g.fillRect(sx - 2 * U, top + 8 * U, 4 * U, seat - top - 10 * U); }
        g.fillStyle = wood; g.fillRect(x - bw / 2, top + (seat - top) * 0.62, bw, 5 * U);
        g.fillStyle = lt; rrect(g, x - bw / 2 - 4 * U, top - 4 * U, bw + 8 * U, 11 * U, 5 * U); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - bw / 2, top - 2 * U, bw, 2 * U);
        g.fillStyle = lt; g.beginPath(); g.moveTo(x - bw / 2 - 2 * U, seat - 6 * U); g.lineTo(x + bw / 2 + 2 * U, seat - 6 * U); g.lineTo(x + sw / 2, seat + 2 * U); g.lineTo(x - sw / 2, seat + 2 * U); g.closePath(); g.fill();
        g.fillStyle = wood; g.fillRect(x - sw / 2, seat + 2 * U, sw, 8 * U); g.fillStyle = dk; g.fillRect(x - sw / 2, seat + 9 * U, sw, 2 * U);
        [-1, 1].forEach(s => { g.fillStyle = wood; g.beginPath(); g.moveTo(x + s * (sw / 2 - 3 * U), seat + 10 * U); g.lineTo(x + s * (sw / 2 - 9 * U), seat + 10 * U); g.lineTo(x + s * (sw / 2 - 4 * U), feet); g.lineTo(x + s * (sw / 2 + 2 * U), feet); g.closePath(); g.fill(); });
      }
      function paintOutside() {
        const gl = G.glass, U = G.U, D = K.dark(), o = off(gl.w, gl.h, false), g = o.g, rr = seedRng(41), w = gl.w, hh = gl.h;
        const sky = D ? ['#0a1124', '#18223f', '#26304f'] : ['#6c7a99', '#8b98b4', '#a7b1c6'];
        let gr = g.createLinearGradient(0, 0, 0, hh); sky.forEach((c, i) => gr.addColorStop(i / 2, c)); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
        for (let L2 = 0; L2 < 2; L2++) {
          const col = L2 ? (D ? '#060a16' : '#4c5672') : (D ? '#0e1529' : '#606b88'), base = hh * (L2 ? 0.66 : 0.56);
          let x = -rr() * 30 * U;
          while (x < w) {
            const bw = (34 + rr() * 50) * U, bh = (20 + rr() * 46) * U * (L2 ? 1.1 : 0.8), top = base - bh;
            g.fillStyle = col; g.fillRect(x, top, bw, hh - top);
            if (rr() < 0.6) { g.beginPath(); g.moveTo(x - 3 * U, top); g.lineTo(x + bw / 2, top - bw * 0.32); g.lineTo(x + bw + 3 * U, top); g.closePath(); g.fill(); }
            if (rr() < 0.5) g.fillRect(x + bw * 0.7, top - bw * 0.36, 6 * U, 14 * U);
            if (L2) for (let k = 0; k < 4; k++) if (rr() < 0.55) { g.fillStyle = rgba('#ffcf7a', D ? 0.75 : 0.45); g.fillRect(x + 6 * U + rr() * (bw - 16 * U), top + 8 * U + rr() * Math.max(4, bh - 18 * U), 6 * U, 7 * U); g.fillStyle = col; }
            x += bw + rr() * 6 * U;
          }
        }
        g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 4; k++) { const x = rr() * w, y = hh * (0.72 + rr() * 0.2), r = (16 + rr() * 22) * U; g.globalAlpha = D ? 0.55 : 0.3; g.drawImage(K.glowSprite('rgba(255,200,120,0.9)'), x - r, y - r, r * 2, r * 2); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // a wet branch across the corner
        g.strokeStyle = D ? '#03060f' : '#3a4258'; g.lineCap = 'round'; g.lineWidth = 5 * U;
        g.beginPath(); g.moveTo(w + 4, hh * 0.08); g.quadraticCurveTo(w * 0.78, hh * 0.12, w * 0.6, hh * 0.05); g.stroke();
        g.lineWidth = 2.5 * U; g.beginPath(); g.moveTo(w * 0.8, hh * 0.11); g.quadraticCurveTo(w * 0.74, hh * 0.2, w * 0.7, hh * 0.24); g.stroke();
        g.fillStyle = D ? '#050a14' : '#4a5468'; for (let k = 0; k < 9; k++) { const t = rr(); g.beginPath(); g.ellipse(lerp(w * 0.62, w, t), hh * (0.06 + rr() * 0.12), 7 * U, 3 * U, rr() * 3, 0, TAU); g.fill(); }
        if (WX.mist) { const mg = g.createLinearGradient(0, hh * 0.3, 0, hh); mg.addColorStop(0, 'rgba(200,210,230,0)'); mg.addColorStop(1, rgba(D ? '#8a96b8' : '#dfe4ee', 0.45)); g.fillStyle = mg; g.fillRect(0, 0, w, hh); }
        return o;
      }
      function paintFog() {
        const gl = G.glass, U = G.U, o = off(gl.w, gl.h), g = o.g, rr = seedRng(9);
        for (let i = 0; i < 30; i++) { const x = rr() * gl.w, y = gl.h * (0.2 + 0.8 * Math.pow(rr(), 0.55)), r = (26 + rr() * 56) * U, gg = g.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, 'rgba(232,238,250,0.5)'); gg.addColorStop(1, 'rgba(232,238,250,0)'); g.fillStyle = gg; g.fillRect(x - r, y - r, r * 2, r * 2); }
        const lg = g.createLinearGradient(0, 0, 0, gl.h); lg.addColorStop(0, 'rgba(228,234,248,0.12)'); lg.addColorStop(1, 'rgba(228,234,248,0.4)'); g.fillStyle = lg; g.fillRect(0, 0, gl.w, gl.h);
        return o;
      }
      function paintDrops() {
        const gl = G.glass, U = G.U, o = off(gl.w, gl.h), g = o.g, rr = seedRng(23), n = Math.round(70 * WX.drops * (G.phone ? 0.8 : 1.3));
        for (let i = 0; i < n; i++) { const x = rr() * gl.w, y = rr() * gl.h, r = (0.7 + rr() * 2) * U; g.fillStyle = 'rgba(6,14,32,0.32)'; g.beginPath(); g.ellipse(x, y + r * 0.2, r, r * 1.15, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(230,240,255,0.6)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.42, 0, TAU); g.fill(); }
        return o;
      }
      const cellRGB = [];
      function cellCol(r, c) {
        const cols = QU.cols;
        if (QU.kind === 'patch') return cols[(r * 7 + c * 13 + (r * c) % 5) % cols.length];
        if (QU.kind === 'check') return (r + c) % 2 ? cols[0] : ((r * 3 + c) % 4 === 0 ? cols[2] : cols[1]);
        if (QU.kind === 'gingham') { const a = r % 2, b = c % 2; return a && b ? cols[0] : (a || b ? cols[1] : cols[2]); }
        const a = r % 3 === 1, b = c % 3 === 1; return a && b ? cols[3] : a ? cols[1] : b ? cols[2] : cols[0];
      }
      for (let r = 0; r < R - 1; r++) { cellRGB.push([]); for (let c = 0; c < C - 1; c++) cellRGB[r].push(hex(cellCol(r, c))); }
      function sprite(w, hh) { const pr = Math.min(2.5, (cv.dpr || 1) * 1.25), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * pr)); c.height = Math.max(1, Math.round(hh * pr)); const g = c.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0); return { c, g, w, h: hh }; }
      function motif(g, x, y, s, kind) {
        if (kind === 'star') { K.starPath(g, x, y, s, s * 0.45, 5, 0); g.fill(); }
        else if (kind === 'heart') { g.beginPath(); g.moveTo(x, y + s * 0.7); g.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.5, y - s * 1.1, x, y - s * 0.35); g.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.2, y - s * 0.1, x, y + s * 0.7); g.fill(); }
        else if (kind === 'leaf') { g.beginPath(); g.ellipse(x, y, s, s * 0.45, -0.6, 0, TAU); g.fill(); }
        else { for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + Math.cos(k * 2.1) * s * 0.55, y + Math.sin(k * 2.1) * s * 0.55, s * 0.28, 0, TAU); g.fill(); } }
      }
      function paintFolded() {
        const U = G.U, w = (G.phone ? 118 : 150) * U, hh = (G.phone ? 46 : 58) * U, S0 = sprite(w + 20 * U, hh + 20 * U), g = S0.g, x0 = 10 * U, y0 = 8 * U;
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(x0 + w / 2, y0 + hh + 3 * U, w * 0.52, 6 * U, 0, 0, TAU); g.fill();
        g.save(); rrect(g, x0, y0, w, hh, 9 * U); g.clip();
        const cw = w / 6, ch = hh / 3;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { g.fillStyle = cellCol(r + 1, c + 2); g.fillRect(x0 + c * cw, y0 + r * ch, cw + 1, ch + 1); if ((r + c) % 2 === 0 && QU.kind !== 'gingham') { g.fillStyle = 'rgba(255,255,255,0.45)'; motif(g, x0 + (c + 0.5) * cw, y0 + (r + 0.5) * ch, Math.min(cw, ch) * 0.22, QU.motif); } }
        for (let k = 1; k < 3; k++) { const y = y0 + hh * k / 3; g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x0, y - 1.5 * U, w, 3 * U); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x0, y + 1.5 * U, w, 2 * U); }
        const sg = g.createLinearGradient(0, y0, 0, y0 + hh); sg.addColorStop(0, 'rgba(255,255,255,0.18)'); sg.addColorStop(1, 'rgba(0,0,0,0.18)'); g.fillStyle = sg; g.fillRect(x0, y0, w, hh);
        g.restore();
        g.strokeStyle = QU.bind; g.lineWidth = 3 * U; rrect(g, x0, y0, w, hh, 9 * U); g.stroke();
        g.setLineDash([3 * U, 3 * U]); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1 * U; rrect(g, x0 + 4 * U, y0 + 4 * U, w - 8 * U, hh - 8 * U, 7 * U); g.stroke(); g.setLineDash([]);
        return Object.assign(S0, { ax: x0 + w / 2, ay: y0 + hh, bw: w, bh: hh });
      }
      function pillowPath(g, w, hh) {
        const b = 0.16;
        g.beginPath(); g.moveTo(-w / 2, -hh / 2);
        g.quadraticCurveTo(0, -hh / 2 - hh * b, w / 2, -hh / 2);
        g.quadraticCurveTo(w / 2 + w * b * 0.5, 0, w / 2, hh / 2);
        g.quadraticCurveTo(0, hh / 2 + hh * b, -w / 2, hh / 2);
        g.quadraticCurveTo(-w / 2 - w * b * 0.5, 0, -w / 2, -hh / 2);
        g.closePath();
      }
      function paintPillow(spec) {
        const U = G.U, w = G.pillowW, hh = G.pillowH, S0 = sprite(w * 1.25, hh * 1.4), g = S0.g, cx = S0.w / 2, cy = S0.h / 2;
        g.translate(cx, cy);
        pillowPath(g, w, hh);
        const gr = g.createRadialGradient(-w * 0.18, -hh * 0.28, 2, 0, 0, w * 0.72);
        gr.addColorStop(0, mix(spec.col, '#ffffff', 0.38)); gr.addColorStop(0.6, spec.col); gr.addColorStop(1, mix(spec.col, '#000000', 0.28));
        g.fillStyle = gr; g.fill();
        g.save(); pillowPath(g, w, hh); g.clip();
        if (spec.pat === 'dots') { g.fillStyle = 'rgba(255,255,255,0.55)'; for (let y = -hh / 2; y < hh / 2; y += 9 * U) for (let x = -w / 2 + ((y / (9 * U)) & 1 ? 4.5 * U : 0); x < w / 2; x += 9 * U) { g.beginPath(); g.arc(x, y, 1.6 * U, 0, TAU); g.fill(); } }
        if (spec.pat === 'stripe') { g.fillStyle = 'rgba(255,255,255,0.32)'; for (let x = -w / 2; x < w / 2; x += 11 * U) g.fillRect(x, -hh, 4.5 * U, hh * 2); }
        if (spec.pat === 'check') { g.fillStyle = 'rgba(120,70,40,0.18)'; for (let x = -w / 2; x < w / 2; x += 12 * U) g.fillRect(x, -hh, 5 * U, hh * 2); for (let y = -hh / 2; y < hh / 2; y += 12 * U) g.fillRect(-w, y, w * 2, 5 * U); }
        const sh = g.createLinearGradient(0, -hh / 2, 0, hh / 2); sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)'); g.fillStyle = sh; g.fillRect(-w, -hh, w * 2, hh * 2);
        g.restore();
        g.strokeStyle = rgba(mix(spec.col, '#000000', 0.4), 0.55); g.lineWidth = 1.6 * U; pillowPath(g, w, hh); g.stroke();
        g.setLineDash([2 * U, 2.5 * U]); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1 * U; pillowPath(g, w * 0.8, hh * 0.7); g.stroke(); g.setLineDash([]);
        g.fillStyle = mix(spec.col, '#000000', 0.3); g.beginPath(); g.arc(0, 0, 2.8 * U, 0, TAU); g.fill();
        g.strokeStyle = rgba(mix(spec.col, '#000000', 0.35), 0.5); g.lineWidth = 1 * U; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.785; g.beginPath(); g.moveTo(Math.cos(a) * 4 * U, Math.sin(a) * 4 * U); g.lineTo(Math.cos(a) * 9 * U, Math.sin(a) * 7 * U); g.stroke(); }
        return S0;
      }
      function paintMug() {
        const U = G.U, w = G.mugW, hh = G.mugH, S0 = sprite(w * 2, hh * 1.5), g = S0.g, x0 = S0.w * 0.3, y0 = S0.h - hh - 2 * U;
        g.strokeStyle = mix(DR.mug, '#000000', 0.15); g.lineWidth = 4.5 * U; g.beginPath(); g.ellipse(x0 + w + 1 * U, y0 + hh * 0.45, w * 0.28, hh * 0.24, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
        const gr = g.createLinearGradient(x0, 0, x0 + w, 0); gr.addColorStop(0, mix(DR.mug, '#000000', 0.18)); gr.addColorStop(0.35, mix(DR.mug, '#ffffff', 0.22)); gr.addColorStop(1, mix(DR.mug, '#000000', 0.28));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0 + w - 1.5 * U, y0 + hh - 4 * U); g.quadraticCurveTo(x0 + w - 2 * U, y0 + hh, x0 + w - 6 * U, y0 + hh); g.lineTo(x0 + 6 * U, y0 + hh); g.quadraticCurveTo(x0 + 2 * U, y0 + hh, x0 + 1.5 * U, y0 + hh - 4 * U); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; motif(g, x0 + w * 0.48, y0 + hh * 0.55, w * 0.16, 'heart');
        g.fillStyle = mix(DR.mug, '#ffffff', 0.3); g.beginPath(); g.ellipse(x0 + w / 2, y0, w / 2, 3.6 * U, 0, 0, TAU); g.fill();
        g.fillStyle = DR.liquid; g.beginPath(); g.ellipse(x0 + w / 2, y0 + 0.6 * U, w / 2 - 2.5 * U, 2.4 * U, 0, 0, TAU); g.fill();
        if (DR.top === 'marsh') { g.fillStyle = '#fff7ee'; rrect(g, x0 + w * 0.28, y0 - 2.4 * U, 5 * U, 3.6 * U, 1.4 * U); g.fill(); rrect(g, x0 + w * 0.52, y0 - 1.6 * U, 5 * U, 3.4 * U, 1.4 * U); g.fill(); }
        if (DR.top === 'lemon') { g.fillStyle = '#ffe36b'; g.beginPath(); g.ellipse(x0 + w * 0.62, y0, 4.5 * U, 1.8 * U, 0, 0, TAU); g.fill(); }
        if (DR.top === 'cinnamon') { g.strokeStyle = '#7a4524'; g.lineWidth = 2.6 * U; g.beginPath(); g.moveTo(x0 + w * 0.7, y0 - 8 * U); g.lineTo(x0 + w * 0.55, y0 + 1 * U); g.stroke(); }
        if (DR.top === 'honey') { g.strokeStyle = '#e8a93a'; g.lineWidth = 1.4 * U; g.beginPath(); g.moveTo(x0 + w * 0.3, y0); g.quadraticCurveTo(x0 + w * 0.5, y0 + 1.6 * U, x0 + w * 0.7, y0); g.stroke(); }
        return Object.assign(S0, { ax: x0 + w / 2, ay: y0 + hh });
      }
      function paintBox() {
        const U = G.U, w = G.boxW, hh = G.boxH, S0 = sprite(w * 1.5, hh * 2.4), g = S0.g, x0 = (S0.w - w) / 2, y0 = S0.h - hh - 3 * U, lidH = hh * 0.95;
        // the open lid, tipped back, with a little mirror
        g.fillStyle = '#6e3f28'; g.beginPath(); g.moveTo(x0 + 2 * U, y0); g.lineTo(x0 + w - 2 * U, y0); g.lineTo(x0 + w - 7 * U, y0 - lidH); g.lineTo(x0 + 7 * U, y0 - lidH); g.closePath(); g.fill();
        const mg = g.createLinearGradient(0, y0 - lidH, 0, y0); mg.addColorStop(0, '#cfe3ff'); mg.addColorStop(1, '#7f98c8');
        g.fillStyle = mg; g.beginPath(); g.moveTo(x0 + 7 * U, y0 - 3 * U); g.lineTo(x0 + w - 7 * U, y0 - 3 * U); g.lineTo(x0 + w - 11 * U, y0 - lidH + 5 * U); g.lineTo(x0 + 11 * U, y0 - lidH + 5 * U); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(x0 + 14 * U, y0 - lidH + 6 * U); g.lineTo(x0 + 20 * U, y0 - lidH + 6 * U); g.lineTo(x0 + 13 * U, y0 - 5 * U); g.lineTo(x0 + 9 * U, y0 - 5 * U); g.closePath(); g.fill();
        // velvet inside, then the box front
        g.fillStyle = '#9b2f3e'; g.fillRect(x0 + 2 * U, y0 - 3 * U, w - 4 * U, 5 * U);
        const gr = g.createLinearGradient(0, y0, 0, y0 + hh); gr.addColorStop(0, '#b06a3e'); gr.addColorStop(1, '#6e3f28');
        g.fillStyle = gr; rrect(g, x0, y0, w, hh, 3 * U); g.fill();
        g.strokeStyle = 'rgba(60,30,15,0.35)'; g.lineWidth = 1 * U; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0 + 3 * U, y0 + hh * k / 4); g.quadraticCurveTo(x0 + w / 2, y0 + hh * k / 4 + 2 * U, x0 + w - 3 * U, y0 + hh * k / 4); g.stroke(); }
        g.fillStyle = '#e2b453'; [[x0, y0], [x0 + w - 6 * U, y0], [x0, y0 + hh - 6 * U], [x0 + w - 6 * U, y0 + hh - 6 * U]].forEach(([x, y]) => g.fillRect(x, y, 6 * U, 6 * U));
        g.beginPath(); g.arc(x0 + w / 2, y0 + hh * 0.45, 3.6 * U, 0, TAU); g.fill(); g.fillStyle = '#3a2112'; g.beginPath(); g.arc(x0 + w / 2, y0 + hh * 0.42, 1.3 * U, 0, TAU); g.fill(); g.fillRect(x0 + w / 2 - 0.6 * U, y0 + hh * 0.42, 1.2 * U, 3.2 * U);
        return Object.assign(S0, { ax: S0.w / 2, ay: y0 + hh, top: y0 });
      }
      function paintPeg() {
        const U = G.U, w = G.pegW, hh = G.pegH, S0 = sprite(w * 2.2, hh * 1.15), g = S0.g, x0 = S0.w / 2;
        g.fillStyle = '#d9b07a'; rrect(g, x0 - w / 2, 2 * U, w * 0.46, hh, 2.5 * U); g.fill(); rrect(g, x0 + w * 0.04, 2 * U, w * 0.46, hh, 2.5 * U); g.fill();
        g.fillStyle = 'rgba(120,80,40,0.35)'; g.fillRect(x0 - 0.6 * U, 2 * U, 1.2 * U, hh);
        g.strokeStyle = '#9aa3ad'; g.lineWidth = 1.6 * U; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x0, hh * 0.52 + k * 2.4 * U, w * 0.58, 1.6 * U, 0, 0, TAU); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x0 - w / 2 + 1.5 * U, 5 * U, 1.5 * U, hh - 10 * U);
        return Object.assign(S0, { ax: x0, ay: hh + 2 * U });
      }

      /* ---------------- sound: rain on the glass, a rain-piano, then the music box; every touch has its sound ---------------- */
      const rain = K.ambience('rain'); rain.level(0.7, 1.2);
      const AU = {};
      const audioOn = () => {
        if (!A.ctx || AU.roof) return;
        AU.roof = A.loop({ pink: true, filter: 'lowpass', freq: 1700, q: 0.4, bus: 'amb' }); if (AU.roof) AU.roof.level(0.05, 1.5);
        AU.rustle = A.loop({ filter: 'bandpass', freq: 1400, q: 0.8 });
      };
      S.on('audio-ready', audioOn); audioOn();
      S.onDestroy(() => Object.values(AU).forEach(x => { if (x && x.stop) x.stop(); }));
      const NF = {}; const nf = (n) => NF[n] || (NF[n] = A.note(n));
      const MU = { next: 0, step: 0, mode: 'rain', vol: 1, notes: [] };
      S.loop(() => {
        if (!A.ctx) return;
        const now = A.now();
        if (!MU.next || MU.next < now - 0.5) MU.next = now + 0.2;
        while (MU.next < now + 0.25) {
          const tm = MU.next, v = MU.vol;
          if (MU.mode === 'rain') {
            const i = MU.step, bar = Math.floor(i / 4) % BED.length, b = i % 4, [bass, ch] = BED[bar];
            if (b === 0 && W.phase !== 'intro') { A.pluck(nf(bass), { when: tm, vol: 0.12 * v, damp: 0.995, lp: 500, bus: 'music' }); ch.forEach((n, k) => A.pluck(nf(n), { when: tm + 0.11 * k, vol: 0.04 * v, damp: 0.997, lp: 2200, verb: 0.45, bus: 'music' })); A.pad(ch.slice(0, 3).map(nf), { when: tm, dur: 4.4, vol: 0.026 * v, attack: 1.2, lp: 900, bus: 'music' }); }
            if (b === 2 && W.phase !== 'intro' && Math.random() < 0.45) A.pluck(nf(ch[3]) * 2, { when: tm, vol: 0.026 * v, damp: 0.997, verb: 0.5, bus: 'music' });
            MU.step++; MU.next += 1;
          } else {
            const i = MU.step, bar = Math.floor(i / 3) % LULL.length, b = i % 3, n = LULL[bar][b];
            if (n) { A.chime(nf(n) * 2, { when: tm, vol: 0.055 * v, dur: 1.9, verb: 0.42, bus: 'music' }); MU.notes.push(tm); }
            if (b === 0) A.pluck(nf(LBASS[bar]), { when: tm, vol: 0.085 * v, damp: 0.995, lp: 600, bus: 'music' });
            if (b === 0 && bar % 2 === 0) A.pad([LBASS[bar], LULL[bar][0] || 'F4'].map(nf), { when: tm, dur: 4, vol: 0.022 * v, attack: 1, lp: 900, bus: 'music' });
            MU.step++; MU.next += 60 / 84;
          }
        }
      });
      const sync = (name) => { try { if (A.sync) A.sync(name, performance.now()); } catch (e) { /* dev log only */ } };
      const SFX = {
        lift() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 900, to: 2600, q: 0.9, dur: 0.32, attack: 0.12, vol: 0.09 }); sync('lift'); },
        flump(v) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 120, to: 52, glide: 0.14, dur: 0.26, vol: 0.2 * (v || 1) }); A.noise({ filter: 'lowpass', freq: 750, dur: 0.36, attack: 0.02, vol: 0.13 * (v || 1) }); sync('flump'); },
        fwump(v) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 170, to: 80, glide: 0.1, dur: 0.18, vol: 0.18 * (v || 1) }); A.noise({ filter: 'lowpass', freq: 1100, dur: 0.18, attack: 0.01, vol: 0.09 * (v || 1) }); sync('fwump'); },
        tink(i) { if (!A.ctx) return; A.chime(nf(BELL[i % BELL.length]), { vol: 0.07, dur: 1.4, verb: 0.4 }); A.click({ vol: 0.04 }); sync('tink'); },
        clink() { if (!A.ctx) return; A.chime(2650, { vol: 0.05, dur: 0.5, verb: 0.2 }); A.tone({ type: 'triangle', freq: 1320, dur: 0.08, vol: 0.05 }); sync('clink'); },
        snap() { if (!A.ctx) return; A.wood(undefined, 0.28, 1.25); A.click({ vol: 0.14 }); sync('snap'); },
        ratchet() { if (!A.ctx) return; A.click({ vol: 0.07 }); A.wood(undefined, 0.05, 2.1); },
        pat() { if (!A.ctx) return; A.brush(A.now(), 0.08, 0.12); A.tone({ type: 'sine', freq: 300 + Math.random() * 120, to: 220, glide: 0.08, dur: 0.1, vol: 0.05 }); sync('pat'); },
        knock() { if (!A.ctx) return; A.wood(undefined, 0.22, 0.55); A.wood(A.now() + 0.16, 0.2, 0.55); sync('knock'); },
        pop() { if (!A.ctx) return; A.pop({ vol: 0.1, freq: 480 }); sync('pop'); },
        glass() { if (!A.ctx) return; A.chime(2200 + Math.random() * 500, { vol: 0.04, dur: 0.6, verb: 0.3 }); A.tone({ type: 'sine', freq: 3100, dur: 0.05, vol: 0.03 }); sync('glass'); },
        soft() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 1300, q: 0.7, dur: 0.16, attack: 0.03, vol: 0.06 }); A.tone({ type: 'sine', freq: 260, to: 200, glide: 0.1, dur: 0.12, vol: 0.05 }); sync('soft'); },
        thunder() { if (!A.ctx) return; A.noise({ pink: true, filter: 'lowpass', freq: 150, dur: 3.4, attack: 0.25, vol: 0.34 }); A.tone({ type: 'sine', freq: 56, to: 36, glide: 2.4, dur: 2.8, vol: 0.13, attack: 0.15 }); A.noise({ pink: true, filter: 'lowpass', freq: 420, when: A.now() + 0.12, dur: 1.3, attack: 0.04, vol: 0.12 }); sync('thunder'); }
      };

      /* ---------------- the senses and the warmth ---------------- */
      function senseOn(id) {
        if (W.sensesOn[id]) return; W.sensesOn[id] = true;
        chips[id].classList.add('on');
        if (A.ctx) A.chime(nf(['G5', 'A5', 'C6', 'D6', 'E6'][Object.keys(W.sensesOn).length - 1] || 'C6'), { vol: 0.06, dur: 1.6, verb: 0.5 });
        ctx.track('sense', { id });
      }
      const warmTo = (v) => { W.warmT = Math.max(W.warmT, v); };
      const fogTo = (v) => { W.fogT = Math.max(W.fogT, v); };

      /* ---------------- steps ---------------- */
      function setStep(st) { W.step = st; W.ready = false; K.guide(null); ctx.track('step', { id: st }); }
      function guideStep() {
        if (finished || W.phase !== 'play' || !W.ready) return;
        const U = G.U, st = W.step;
        if (st === 'quilt' && CL.mode === 'tray') K.guide({ id: 'bf-quilt', g: 'drag', target: () => ({ x: G.spawn.x, y: G.spawn.y - 18 * U }), dx: 0, dy: CL.top[5].y + 36 * U - G.spawn.y + 18 * U, label: 'DRAPE THE QUILT', place: 'above', ms: 1800, delay: 450 });
        else if (ITEM && ITEM.state === 'tray') {
          const t = itemTarget(ITEM), lab = { pillow: 'TUCK IN A PILLOW', peg: 'PEG IT BACK UP', mug: 'BRING A WARM DRINK', box: 'ADD A LITTLE MUSIC' }[ITEM.kind];
          K.guide({ id: 'bf-' + ITEM.kind, g: 'drag', target: () => ({ x: ITEM ? ITEM.x : G.spawn.x, y: (ITEM ? ITEM.y : G.spawn.y) - 16 * U }), dx: t.x - ITEM.x, dy: t.y - 16 * U - ITEM.y + 16 * U, label: lab, place: 'above', ms: 1600, delay: 450 });
        } else if (st === 'lights') { const a = bulbPos(firstUnlit(), TMP), b = bulbPos(C - 2, TMP2); K.guide({ id: 'bf-lights', g: 'drag', target: () => bulbPos(firstUnlit(), { x: 0, y: 0 }), dx: b.x - a.x, dy: b.y - a.y, label: 'STRING THE LIGHTS', place: 'below', ms: 2200, delay: 450 }); }
        else if (st === 'wind') K.guide({ id: 'bf-wind', g: 'circle', target: () => crankPos({ x: 0, y: 0 }), r: Math.round(30 * U), label: 'WIND IT UP', place: 'above', delay: 350 });
        else if (st === 'invite') K.guide({ id: 'bf-invite', g: 'drag', target: () => ({ x: px[iBL + 5], y: py[iBL + 5] + 4 * U }), dir: 'u', d: Math.round(64 * U), label: 'INVITE THEM IN', place: 'below', ms: 1500, delay: 450 });
      }
      function startQuilt() { setStep('quilt'); CL.mode = 'tray'; W.spawnT = W.t; SFX.pop(); S.later(() => { W.ready = true; guideStep(); }, 500); }
      function onDraped() {
        senseOn('touch'); warmTo(0.2); fogTo(0.25);
        talk('patch', L.quilt, 3000, 'happy');
        S.later(() => talk('still', L.rainThoughts, 3600, 'calm'), 2900);
        S.later(() => startPillow(), 1500);
      }
      function startPillow() { setStep('pillow'); spawnItem('pillow', W.pillows); }
      function onPillow() {
        W.pillows++; warmTo(0.22 + 0.06 * W.pillows / NP);
        if (W.pillows === 1) talk('drop', L.pillow, 2600, 'happy', 2200);
        if (W.pillows < NP) S.later(startPillow, 450);
        else { S.later(() => talk('patch', L.pillowLast, 3000, 'happy'), 300); S.later(startLights, 1400); }
      }
      function startLights() { setStep('lights'); LT.on = true; LT.onT = W.t; S.later(() => { W.ready = true; guideStep(); talk('still', L.lightsTip, 2600, 'calm'); }, 500); }
      function onLightsDone() {
        W.ready = false; K.guide(null); senseOn('sight'); warmTo(0.45); fogTo(0.45);
        if (A.ctx) for (let k = 0; k < 6; k++) A.chime(nf(BELL[(k * 2) % BELL.length]) * 2, { when: A.now() + 0.15 + k * 0.07, vol: 0.03, dur: 1.2 });
        talk('still', L.lights, 2800, 'happy');
        S.later(() => talk('drop', L.dropAsk, 3000, 'wow', 2600), 2700);
        S.later(() => { CS.drop = 'room'; placeOne('drop', 900); drop.base('happy'); const p = spot('drop'); if (p) P.emit('drop', p.x + p.s / 2, p.y + p.s * 0.2, 10, { colors: ['rgba(190,220,255,0.9)'], angle: -Math.PI / 2, spread: 2.2, speed: [50, 130] }); SFX.pat(); }, 5200);
        S.later(startTwist, 6600);
      }
      /* the twist: thunder, a worry flashes on the glass, the quilt's corner slips; Patch and Drop hold it while you peg it */
      function startTwist() {
        setStep('peg');
        SFX.thunder(); W.flash = 1; W.bolt = makeBolt(); ctx.track('thunder', {});
        const core = THOUGHTS.find(t => t.core); if (core) { core.flash = true; core.el.classList.add('bf-flash'); updateThoughts(); }
        S.later(() => { CL.pt[iCR] = null; qx[iCR] = px[iCR] - 3 * G.U; qy[iCR] = py[iCR] - 2 * G.U; if (A.ctx) A.noise({ filter: 'bandpass', freq: 1700, to: 600, q: 0.8, dur: 0.42, attack: 0.04, vol: 0.1 }); }, 420);
        S.later(() => { patch.face('surprised', 1600); drop.face('surprised', 1600); }, 500);
        S.later(() => { CS.patch = 'hold'; CS.drop = 'hold'; placeChars(520); }, 1200);
        S.later(() => { pinAt(iCR, 'held', { dur: 0.55 }); SFX.pat(); talk('patch', L.thunder, 2200, 'surprised', 2000); }, 1760);
        S.later(() => { talk('drop', L.holdIt, 3000, 'determined'); spawnItem('peg', 0); }, 3000);
      }
      function onPegged() {
        pinAt(iCR, 'R', { dur: 0.3 }); W.pegged = true; SFX.snap();
        S.later(() => { const p = CL.cornerR; P.emit('star', p.x, p.y, 10, { colors: ['#fff3c4', '#ffd36b'], speed: [40, 120] }); SFX.flump(0.6); }, 300);
        const core = THOUGHTS.find(t => t.core); if (core) { core.flash = false; core.el.classList.remove('bf-flash'); updateThoughts(); }
        S.later(() => talk('still', L.pegged, 3800, 'calm'), 500);
        S.later(() => { CS.patch = 'top'; CS.drop = 'room'; placeChars(700); patch.base('happy'); drop.base('happy'); }, 900);
        S.later(startDrink, 2700);
      }
      function startDrink() { setStep('drink'); spawnItem('mug', 0); }
      function onDrink() { senseOn('smell'); S.later(() => senseOn('taste'), 600); warmTo(0.66); fogTo(0.62); talk('patch', L.drink, 3000, 'love', 2400); S.later(startBox, 2700); }
      function startBox() { setStep('box'); spawnItem('box', 0); talk('still', L.boxTip, 2600, 'think', 2000); }
      function onBoxPlaced() { setStep('wind'); BOX.turn = 0; S.later(() => { W.ready = true; guideStep(); }, 350); }
      function onWound() {
        W.ready = false; K.guide(null); BOX.playing = true; BOX.playT = W.t;
        MU.mode = 'box'; MU.step = 0; MU.next = 0;
        senseOn('sound'); warmTo(0.86); fogTo(0.82);
        rain.level(0.32, 2.5); if (AU.roof) { AU.roof.freq(520, 2); AU.roof.level(0.035, 2); }
        talk('still', L.music, 3400, 'music');
        S.later(startInvite, 3100);
      }
      function startInvite() {
        setStep('invite');
        let wait = 400;
        if (GUEST && guest) { CS.guest = 'win'; guest.show(true); placeOne('guest', 0); guest.face('wow', 1600); SFX.knock(); S.later(() => talk('patch', L.guest, 2600, 'wow', 2000), 300); wait = 2200; }
        S.later(() => { W.ready = true; guideStep(); talk('patch', L.invite, 3000, 'happy'); }, wait);
      }
      function openDoor() {
        if (W.doorOpen) return; W.doorOpen = true; W.ready = false; K.guide(null);
        const order = ['patch', 'drop', 'still'].concat(GUEST ? ['guest'] : []);
        order.forEach((k, i) => S.later(() => crawlIn(k), 200 + i * 600));
        S.later(finale, 200 + order.length * 600 + 900);
      }
      function crawlIn(who) {
        const ch = CH[who]; if (!ch) return;
        ch.c.hush(); CS[who] = 'in'; placeOne(who, 760); ch.c.face('happy', 1200); SFX.pat(); S.later(SFX.pat, 220);
        const p = spot(who); if (p) S.later(() => P.emit('dust', p.x + p.s / 2, p.y + p.s, 6, { colors: ['rgba(255,236,210,0.6)'], speed: [20, 60] }), 650);
      }

      /* ---------------- things to place: pillows, the peg, the mug, the music box ---------------- */
      const BOX = { turn: 0, ang: 0, playing: false, playT: 0, lastClick: 0 };
      function spawnItem(kind, idx) {
        const U = G.U, sz = { pillow: [G.pillowW, G.pillowH], peg: [G.pegW * 1.6, G.pegH], mug: [G.mugW * 1.6, G.mugH], box: [G.boxW, G.boxH * 1.9] }[kind];
        ITEM = { kind, idx, x: G.spawn.x, y: G.spawn.y + 6 * U, hx: G.spawn.x, hy: G.spawn.y + 6 * U, w: sz[0], h: sz[1], state: 'pop', t0: W.t, rot: 0, vx: 0, vy: 0, sx: 1, sy: 1, sv: 0, spr: kind === 'pillow' ? PSPR[idx % PSPR.length] : null };
        SFX.pop();
        S.later(() => { if (ITEM && ITEM.state === 'pop') { ITEM.state = 'tray'; W.ready = true; guideStep(); } }, 420);
      }
      function itemTarget(it) {
        const U = G.U;
        if (it.kind === 'pillow') { const s = freeSlot(it.x); return { x: s ? s.x : G.cx, y: G.floorIn - 40 * U }; }
        if (it.kind === 'peg') return { x: px[iCR], y: py[iCR] + G.pegH * 0.55 };
        if (it.kind === 'mug') return { x: G.books.x, y: G.floorIn - G.books.h };
        return { x: G.boxX, y: G.floorIn };
      }
      function freeSlot(x) { let best = null, bd = 1e9; G.slots.forEach(s => { if (s.used) return; const d = Math.abs(s.x - x); if (d < bd) { bd = d; best = s; } }); return best; }
      function hitItem(it, p) { const U = G.U; return Math.abs(p.x - it.x) < it.w / 2 + 18 * U && p.y > it.y - it.h - 24 * U && p.y < it.y + 16 * U; }
      function inFort(x, y) { return x > G.inL - 30 * G.U && x < G.inR + 30 * G.U && y > G.chairY - 70 * G.U && y < G.floorIn + 30 * G.U; }
      function grabItem(p) { const it = ITEM; it.state = 'carry'; IN.ox = it.x - p.x; IN.oy = it.y - p.y; IN.hist = [[performance.now(), p.x, p.y]]; it.sv -= 2.5; SFX.lift(); K.guideDone(); }
      function releaseSpeed() { const H0 = IN.hist; if (H0.length < 2) return 0; const a = H0[0], b = H0[H0.length - 1], dt = Math.max(16, b[0] - a[0]); let sp = Math.hypot(b[1] - a[1], b[2] - a[2]) / dt * 1000; if (performance.now() - b[0] > 120) sp *= 0.3; return sp; }
      function gentleOf(sp) { return clamp(1 - (sp - 90 * G.U) / (900 * G.U), 0, 1); }
      function releaseItem() {
        const it = ITEM, U = G.U, sp = releaseSpeed(), t = itemTarget(it);
        if (it.kind === 'pillow' && inFort(it.x, it.y)) { const s = freeSlot(it.x); s.used = true; it.slot = s; it.state = 'fall'; it.vy = Math.min(0, it.vy); W.gentle.push(gentleOf(sp)); K.guide(null); W.ready = false; return; }
        const near = it.kind === 'peg' ? Math.hypot(it.x - px[iCR], it.y - G.pegH * 0.5 - py[iCR]) < 95 * U || Math.hypot(it.x - CL.cornerR.x, it.y - G.pegH * 0.5 - CL.cornerR.y) < 80 * U
          : it.kind === 'mug' ? Math.hypot(it.x - t.x, it.y - t.y) < 90 * U || inFort(it.x, it.y) : inFort(it.x, it.y);
        if (near) { it.state = 'snap'; it.t0 = W.t; it.fx = it.x; it.fy = it.y; it.tx = t.x; it.ty = t.y; W.gentle.push(gentleOf(sp)); K.guide(null); W.ready = false; return; }
        it.state = 'back'; it.t0 = W.t; it.fx = it.x; it.fy = it.y; SFX.soft();
      }
      function landed(it) {
        const U = G.U; it.state = 'placed';
        if (it.kind === 'pillow') { it.sv = -5.5; SFX.fwump(1); P.emit('dust', it.x, it.y, 7, { colors: ['rgba(255,240,220,0.55)'], speed: [20, 70] }); PLACED.push(it); ITEM = null; onPillow(); return; }
        it.sv = -3.2;
        if (it.kind === 'peg') { ITEM = null; onPegged(); return; }
        if (it.kind === 'mug') { SFX.clink(); P.emit('mote', it.x, it.y - G.mugH, 6, { colors: ['#fff6e0'] }); PLACED.push(it); ITEM = null; onDrink(); return; }
        if (it.kind === 'box') { SFX.flump(0.5); if (A.ctx) A.chime(nf('C6'), { vol: 0.05, dur: 1.4 }); PLACED.push(it); ITEM = null; onBoxPlaced(); }
        void U;
      }
      function stepItem(dt) {
        const it = ITEM; if (!it) return;
        const U = G.U;
        if (it.state === 'carry') {
          const e = 1 - Math.exp(-dt * 26), tx = IN.sx + IN.ox, ty = IN.sy + IN.oy, ox = it.x, oy = it.y;
          it.x += (tx - it.x) * e; it.y += (ty - it.y) * e;
          it.vx = (it.x - ox) / dt; it.vy = (it.y - oy) / dt;
          it.rot += (clamp(it.vx * 0.0005, -0.35, 0.35) - it.rot) * Math.min(1, dt * 10);
        } else if (it.state === 'fall') {
          const s = it.slot, ty = G.floorIn - 2 * U + s.dy * U;
          it.vy += 1500 * U * dt; it.x += (s.x - it.x) * Math.min(1, dt * 7); it.y += it.vy * dt; it.rot += (s.rot - it.rot) * Math.min(1, dt * 8); it.k = lerp(it.k || 1, s.k, Math.min(1, dt * 8));
          if (it.y >= ty) { it.y = ty; it.rot = s.rot; it.k = s.k; landed(it); }
        } else if (it.state === 'snap') {
          const k = clamp((W.t - it.t0) / 0.3, 0, 1), e = eo(k);
          it.x = lerp(it.fx, it.tx, e); it.y = lerp(it.fy, it.ty, e) - Math.sin(k * Math.PI) * 18 * U; it.rot *= Math.pow(0.01, dt);
          if (k >= 1) { it.rot = 0; landed(it); }
        } else if (it.state === 'back') {
          const k = clamp((W.t - it.t0) / 0.38, 0, 1), e = eo(k);
          it.x = lerp(it.fx, it.hx, e); it.y = lerp(it.fy, it.hy, e); it.rot *= Math.pow(0.01, dt);
          if (k >= 1) { it.state = 'tray'; it.sv = -2; W.ready = true; S.later(guideStep, 300); }
        }
      }
      function squash(it, dt) { it.sv += (-170 * (it.sy - 1) - 10 * it.sv) * dt; it.sy += it.sv * dt; it.sx = 1 + (1 - it.sy) * 0.9; }

      /* ---------------- the quilt in your hands ---------------- */
      function grabQuilt(p) {
        const U = G.U, cw = CL.flatW / (C - 1);
        CL.mode = 'carry'; CL.k = 0; CL.kT = 0; setRest(0);
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const i = r * C + c; px[i] = p.x + (c - (C - 1) / 2) * cw * 0.45; py[i] = p.y + r * 3.5 * U; qx[i] = px[i]; qy[i] = py[i] - 1.5 * U; }
        CL.pt.fill(null);
        IN.sx = p.x; IN.sy = p.y;
        [3, 4, 5, 6, 7].forEach(c => pinAt(c, 'grab', { ox: (c - 5) * cw * 0.55, oy: 0 }));
        IN.hist = [[performance.now(), p.x, p.y]];
        SFX.lift(); K.guideDone();
        P.emit('dust', p.x, p.y, 8, { colors: ['rgba(255,240,220,0.5)'], speed: [30, 90] });
      }
      function releaseQuilt() {
        const U = G.U, ok = IN.sy < G.chairY + 46 * U && Math.abs(IN.sx - G.cx) < G.chairX + 80 * U;
        if (AU.rustle) AU.rustle.level(0.0001, 0.08);
        if (!ok) { CL.mode = 'fall'; CL.pt.fill(null); CL.fallT = W.t; SFX.soft(); talk('patch', L.quiltMiss, 2600, 'think', 2000); return; }
        drape(releaseSpeed());
      }
      function drape(sp) {
        CL.mode = 'drape'; CL.kT = 1; CL.pt.fill(null); CL.guideT0 = W.t;
        for (let c = 0; c < C; c++) pinAt(c, 'top', { c, dur: 0.42 });
        pinAt(iCL, 'L', { dur: 0.46 }); pinAt(iCR, 'R', { dur: 0.46 });
        W.gentle.push(gentleOf(sp || 0)); W.ready = false; K.guide(null);
        if (A.ctx) A.noise({ filter: 'bandpass', freq: 600, to: 1800, q: 0.8, dur: 0.4, attack: 0.2, vol: 0.08 });
        S.later(() => { SFX.flump(1); [CL.cornerL, CL.cornerR].forEach(p => P.emit('dust', p.x, p.y, 7, { colors: ['rgba(255,240,220,0.6)'], speed: [20, 70] })); }, 430);
        S.later(onDraped, 900);
      }
      function refold() { CL.mode = 'tray'; P.emit('dust', G.spawn.x, G.spawn.y - 10 * G.U, 10, { colors: ['rgba(255,240,220,0.6)'], speed: [30, 90] }); W.spawnT = W.t; SFX.pop(); restFlat(); S.later(guideStep, 400); }

      /* ---------------- the fairy lights along the front edge ---------------- */
      const LT = { on: false, onT: 0, lit: new Uint8Array(C - 1), litT: new Float32Array(C - 1), minD: new Float32Array(C - 1).fill(1e9), n: 0 };
      function bulbPos(b, out) { const i0 = iBL + b, i1 = i0 + 1; out.x = (px[i0] + px[i1]) / 2; out.y = (py[i0] + py[i1]) / 2 + 9 * G.U; return out; }
      function firstUnlit() { for (let b = 0; b < C - 1; b++) if (!LT.lit[b]) return b; return C - 2; }
      function nearLights(p) { for (let b = 0; b < C - 1; b++) { bulbPos(b, TMP); if (Math.hypot(p.x - TMP.x, p.y - TMP.y) < 60 * G.U) return true; } return false; }
      function traceLights(p) {
        const R0 = 34 * G.U;
        for (let b = 0; b < C - 1; b++) { bulbPos(b, TMP); const d = Math.hypot(p.x - TMP.x, p.y - TMP.y); if (d < LT.minD[b]) LT.minD[b] = d; if (!LT.lit[b] && d < R0) lightBulb(b, d); }
      }
      function lightBulb(b, d) {
        if (LT.lit[b]) return;
        LT.lit[b] = 1; LT.litT[b] = W.t; LT.n++;
        SFX.tink(LT.n - 1); bulbPos(b, TMP); P.emit('spark', TMP.x, TMP.y, 5, { colors: [BULB[b % BULB.length], '#fff6dc'], speed: [40, 110] });
        if (LT.n >= C - 1) { W.ready = false; S.later(onLightsDone, 450); }
      }

      /* ---------------- the music box's crank ---------------- */
      function crankPos(out) { const it = PLACED.find(x => x.kind === 'box'); if (!it) { out.x = G.boxX; out.y = G.floorIn; return out; } out.x = it.x + G.boxW / 2 + 7 * G.U; out.y = it.y - G.boxH * 0.55; return out; }
      function windMove(p) {
        crankPos(TMP); const a = Math.atan2(p.y - TMP.y, p.x - TMP.x); let d = a - IN.wa; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; IN.wa = a;
        if (Math.hypot(p.x - TMP.x, p.y - TMP.y) < 8 * G.U) return;
        BOX.ang += d; BOX.turn += Math.abs(d);
        if (BOX.turn - BOX.lastClick > Math.PI / 5) { BOX.lastClick = BOX.turn; SFX.ratchet(); }
        if (BOX.turn >= TAU * [1.5, 2, 2][inten] && W.step === 'wind' && !BOX.playing) onWound();
      }

      /* ---------------- input ---------------- */
      function onGlass(p) { const gl = G.glass; return gl && p.x > gl.x && p.x < gl.x + gl.w && p.y > gl.y && p.y < gl.y + gl.h; }
      function nearFront(p) { const U = G.U; if (CL.mode !== 'drape') return false; for (let c = 2; c <= 8; c++) { const i = iBL + c; if (Math.hypot(p.x - px[i], p.y - py[i]) < 56 * U) return true; } return false; }
      K.press(pad, {
        down: (p) => {
          if (finished) return;
          IN.mode = null; IN.fx = IN.sx = p.x; IN.fy = IN.sy = p.y;
          if (W.phase !== 'play') return;
          const st = W.step, U = G.U;
          if (st === 'quilt' && W.ready && CL.mode === 'tray' && Math.abs(p.x - G.spawn.x) < QS.bw / 2 + 24 * U && Math.abs(p.y - (G.spawn.y - QS.bh / 2)) < QS.bh / 2 + 30 * U) { grabQuilt(p); IN.mode = 'quilt'; return; }
          if (ITEM && ITEM.state === 'tray' && W.ready && hitItem(ITEM, p)) { grabItem(p); IN.mode = 'item'; return; }
          if (st === 'lights' && W.ready && nearLights(p)) { IN.mode = 'lights'; K.guideDone(); traceLights(p); if (AU.rustle) AU.rustle.level(0.02, 0.05); return; }
          if (st === 'wind' && W.ready) { crankPos(TMP); if (Math.hypot(p.x - TMP.x, p.y - TMP.y) < 100 * U) { IN.mode = 'wind'; IN.wa = Math.atan2(p.y - TMP.y, p.x - TMP.x); SFX.ratchet(); K.guideDone(); return; } }
          if (st === 'invite' && W.ready && nearFront(p)) {
            IN.mode = 'lift'; IN.liftY0 = p.y; K.guideDone(); SFX.lift();
            [4, 5, 6].forEach(c => { const i = iBL + c; pinAt(i, 'lift', { ox: px[i] - p.x, oy: py[i] - p.y, dur: 0.08 }); });
            return;
          }
          // everything else still answers
          if (onGlass(p)) { SFX.glass(); W.glassTap = W.t; W.tapX = p.x; W.tapY = p.y; if (CS.drop === 'win') drop.face('wink', 900); if (!W.saidGlass && THOUGHTS.length && W.step !== 'quilt') { W.saidGlass = true; talk('still', L.glass, 2600, 'calm'); } return; }
          if (poke(p.x, p.y, 7)) { SFX.soft(); return; }
          const hitP = PLACED.find(it => it.kind === 'pillow' && Math.abs(p.x - it.x) < G.pillowW / 2 && p.y > it.y - G.pillowH && p.y < it.y + 6 * U);
          if (hitP) { hitP.sv = -4; SFX.fwump(0.5); return; }
          SFX.soft(); P.emit('dust', p.x, p.y, 4, { colors: ['rgba(255,236,210,0.5)'], speed: [15, 45] });
        },
        move: (p) => {
          const now = performance.now();
          IN.fx = p.x; IN.fy = p.y;
          if (IN.mode === 'quilt' || IN.mode === 'item') {
            IN.hist.push([now, p.x, p.y]); while (IN.hist.length > 2 && now - IN.hist[0][0] > 140) IN.hist.shift();
            if (IN.mode === 'quilt' && AU.rustle && IN.hist.length > 1) { const a = IN.hist[IN.hist.length - 2], b = IN.hist[IN.hist.length - 1], v = Math.hypot(b[1] - a[1], b[2] - a[2]) / Math.max(1, b[0] - a[0]) * 1000; AU.rustle.level(Math.min(0.07, v / 9000), 0.05); AU.rustle.freq(900 + Math.min(2400, v * 1.2), 0.06); }
          } else if (IN.mode === 'lights') traceLights(p);
          else if (IN.mode === 'wind') windMove(p);
          else if (IN.mode === 'lift') { IN.fy = clamp(p.y, CL.top[5].y + 34 * G.U, G.floorIn); if (IN.liftY0 - p.y > 40 * G.U && !W.doorOpen) openDoor(); }
        },
        up: () => {
          if (IN.mode === 'quilt') releaseQuilt();
          else if (IN.mode === 'item' && ITEM && ITEM.state === 'carry') releaseItem();
          else if (IN.mode === 'lights') { if (AU.rustle) AU.rustle.level(0.0001, 0.08); if (LT.n < C - 1) S.later(guideStep, 700); }
          else if (IN.mode === 'lift') { [4, 5, 6].forEach(c => { CL.pt[iBL + c] = null; }); SFX.soft(); if (!W.doorOpen) S.later(guideStep, 600); }
          IN.mode = null;
        }
      });
      K.onKey(['Space', 'Enter'], (e) => {
        if (finished || W.phase !== 'play' || !W.ready) return;
        e.preventDefault(); A.unlock(); K.guideDone();
        const st = W.step;
        if (st === 'quilt' && CL.mode === 'tray') { grabQuilt({ x: G.cx, y: G.chairY }); drape(0); }
        else if (ITEM && ITEM.state === 'tray') { const t = itemTarget(ITEM); ITEM.x = t.x; ITEM.y = t.y - 60 * G.U; IN.hist = []; IN.sx = ITEM.x; IN.sy = ITEM.y; releaseItem(); }
        else if (st === 'lights') { for (let b = 0; b < C - 1; b++) S.later(() => lightBulb(b, 0), b * 90); W.ready = false; }
        else if (st === 'wind') { BOX.turn = TAU * 3; onWound(); }
        else if (st === 'invite') openDoor();
      });

      /* ---------------- drawing ---------------- */
      function drawWindow(g, D) {
        const gl = G.glass, U = G.U, t = W.t;
        g.save(); g.beginPath(); g.rect(gl.x, gl.y, gl.w, gl.h); g.clip();
        g.drawImage(OUT.c, gl.x, gl.y, gl.w, gl.h);
        // rain falling outside
        const n = Math.round((G.phone ? 34 : 60) * WX.rain), sl = WX.slant, len = 13 * U;
        g.strokeStyle = D ? 'rgba(190,210,245,0.26)' : 'rgba(235,242,255,0.42)'; g.lineWidth = 1 * U; g.beginPath();
        for (let i = 0; i < n; i++) { const x = gl.x + ((i * 47.3 + t * 520 * sl) % (gl.w + 40)) - 20, y = gl.y + ((i * 31.7 + t * (480 + (i % 5) * 40)) % (gl.h + 30)) - 15; g.moveTo(x, y); g.lineTo(x - sl * len, y + len); }
        g.stroke();
        if (W.flash > 0.02 && !K.reduced()) {
          g.fillStyle = `rgba(225,232,255,${(W.flash * 0.75).toFixed(3)})`; g.fillRect(gl.x, gl.y, gl.w, gl.h);
          if (W.bolt && W.flash > 0.35) { g.strokeStyle = `rgba(255,255,255,${W.flash.toFixed(3)})`; g.lineWidth = 2 * U; g.beginPath(); W.bolt.forEach(([bx, by], i) => (i ? g.lineTo(gl.x + bx * gl.w, gl.y + by * gl.h) : g.moveTo(gl.x + bx * gl.w, gl.y + by * gl.h))); g.stroke(); }
        }
        // drops on the glass, some sliding down
        g.drawImage(DROPS.c, gl.x, gl.y, gl.w, gl.h);
        const tap = clamp(1 - (t - W.glassTap) / 0.6, 0, 1);
        for (const d of SD) {
          const x = gl.x + d.x + (tap ? Math.sin(t * 60 + d.x) * tap * 1.2 * U : 0), y = gl.y + d.y;
          if (d.y > d.y0 + 4 * U) { g.fillStyle = 'rgba(200,215,240,0.14)'; g.fillRect(x - d.r * 0.35, gl.y + d.y0, d.r * 0.7, d.y - d.y0); }
          g.fillStyle = 'rgba(6,14,32,0.4)'; g.beginPath(); g.ellipse(x, y, d.r, d.r * 1.2, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(235,244,255,0.75)'; g.beginPath(); g.arc(x - d.r * 0.3, y - d.r * 0.35, d.r * 0.42, 0, TAU); g.fill();
        }
        // the glass fogs up as the room warms
        if (W.fog > 0.01) { g.globalAlpha = Math.min(1, W.fog * 0.95); g.drawImage(FOG.c, gl.x, gl.y, gl.w, gl.h); g.globalAlpha = 1; }
        // a soft reflection of the room's light
        g.fillStyle = `rgba(255,${D ? 210 : 235},${D ? 160 : 210},${(0.04 + W.warm * 0.06).toFixed(3)})`; g.beginPath(); g.moveTo(gl.x + gl.w * 0.15, gl.y); g.lineTo(gl.x + gl.w * 0.32, gl.y); g.lineTo(gl.x + gl.w * 0.12, gl.y + gl.h); g.lineTo(gl.x - gl.w * 0.05, gl.y + gl.h); g.closePath(); g.fill();
        g.restore();
        // the window's cross bars
        const T0 = ROOM[D ? 'dark' : 'bright'], fc = mix(T0.cool.frame, T0.warm.frame, W.warm);
        g.fillStyle = fc; g.fillRect(gl.x + gl.w / 2 - 3 * U, gl.y, 6 * U, gl.h); g.fillRect(gl.x, gl.y + gl.h * 0.42 - 3 * U, gl.w, 6 * U);
      }
      const SD = [];
      function stepDrops(dt) {
        const gl = G.glass; if (!gl) return;
        while (SD.length < Math.round((G.phone ? 9 : 14) * WX.drops)) SD.push({ x: Math.random() * gl.w, y: Math.random() * gl.h * 0.6, y0: 0, r: (1.4 + Math.random() * 1.8) * G.U, v: 0, stick: Math.random() * 2 });
        for (const d of SD) {
          if (!d.y0) d.y0 = d.y;
          if (d.stick > 0) d.stick -= dt;
          else { d.v = Math.min(d.v + 380 * dt * G.U, 110 * G.U); d.y += d.v * dt; d.x += WX.slant * 6 * dt * G.U; if (Math.random() < dt * 1.4) { d.stick = 0.2 + Math.random() * 1.4; d.v = 0; } }
          if (d.y > gl.h + 8) { d.x = Math.random() * gl.w; d.y = -4; d.y0 = 0; d.stick = Math.random() * 1.5; }
        }
      }
      function makeBolt() { const pts = []; let x = 0.25 + Math.random() * 0.5, y = 0; pts.push([x, y]); while (y < 0.62) { y += 0.07 + Math.random() * 0.06; x += (Math.random() - 0.5) * 0.12; pts.push([x, y]); } return pts; }
      function drawInterior(g, D) {
        if (CL.mode !== 'drape') return;
        const U = G.U, k = CL.k;
        // under the canopy it's dim...
        g.beginPath(); g.moveTo(px[iBL], py[iBL]);
        for (let c = 1; c < C; c++) g.lineTo(px[iBL + c], py[iBL + c]);
        g.lineTo(G.inR + 18 * U, G.floorIn + 6 * U); g.lineTo(G.inL - 18 * U, G.floorIn + 6 * U); g.closePath();
        g.fillStyle = `rgba(${D ? '14,8,24' : '60,40,50'},${((D ? 0.36 : 0.22) * (1 - W.lightsK * 0.55) * k).toFixed(3)})`; g.fill();
        // ...until the lights warm it
        if (W.lightsK > 0.01) {
          const fy = (py[iBL] + py[iBR]) / 2, cy = lerp(fy, G.floorIn, 0.55), rx = (G.inR - G.inL) * 0.62, ry = (G.floorIn - fy) * 0.85, fl = 0.92 + 0.08 * Math.sin(W.t * 3.1) * Math.sin(W.t * 1.7);
          g.globalCompositeOperation = D ? 'lighter' : 'screen'; g.globalAlpha = W.lightsK * (D ? 0.5 : 0.42) * fl;
          g.drawImage(K.glowSprite('rgba(255,178,100,0.85)'), G.cx - rx, cy - ry, rx * 2, ry * 2);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
      }
      function drawQuilt(g, D) {
        const U = G.U, wk = W.warm, lk = W.lightsK, dk = CL.k;
        const tint = D ? [lerp(0.7, 1.02, wk), lerp(0.74, 0.92, wk), lerp(0.94, 0.82, wk)] : [lerp(0.9, 1.03, wk), lerp(0.92, 0.97, wk), lerp(1, 0.9, wk)];
        const fw = CL.flatW / (C - 1), fh = CL.flatH / (R - 1);
        for (let r = 0; r < R - 1; r++) {
          const val = r >= RB;   // the valance hangs toward you; the canopy's top recedes to the sofa, darker with distance
          const rowF = lerp(1, val ? 0.9 - 0.05 * (r - RB) : 0.7 + 0.3 * r / (RB - 1), dk);
          const rest0 = lerp(fw, (CL.hR[r] + CL.hR[r + 1]) / 2, dk) * lerp(fh, CL.vR[r], dk);
          const boost = lk * (val ? 0.85 : 0.35 * Math.pow(r / RB, 2));
          for (let c = 0; c < C - 1; c++) {
            const a = r * C + c, b = a + 1, d = a + C, e = d + 1;
            const area = Math.abs((px[b] - px[a]) * (py[d] - py[a]) - (py[b] - py[a]) * (px[d] - px[a]) + (px[e] - px[d]) * (py[e] - py[b]) - (py[e] - py[d]) * (px[e] - px[b])) * 0.5;
            const aF = clamp(0.5 + 0.5 * area / Math.max(1, rest0), 0.5, 1.08), f = rowF * aF, base = cellRGB[r][c];
            const col = `rgb(${clamp(base[0] * tint[0] * f + boost * 50, 0, 255) | 0},${clamp(base[1] * tint[1] * f + boost * 28, 0, 255) | 0},${clamp(base[2] * tint[2] * f + boost * 6, 0, 255) | 0})`;
            g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1;
            g.beginPath(); g.moveTo(px[a], py[a]); g.lineTo(px[b], py[b]); g.lineTo(px[e], py[e]); g.lineTo(px[d], py[d]); g.closePath(); g.fill(); g.stroke();
          }
        }
        // little motifs on alternate patches
        if (QU.kind !== 'gingham') {
          g.fillStyle = `rgba(255,255,255,${(0.3 + 0.12 * wk).toFixed(3)})`;
          for (let r = 0; r < R - 1; r++) for (let c = 0; c < C - 1; c++) {
            if ((r + c) % 2) continue;
            const a = r * C + c, b = a + 1, d = a + C, e = d + 1, mx = (px[a] + px[b] + px[d] + px[e]) / 4, my = (py[a] + py[b] + py[d] + py[e]) / 4, sz = Math.min(Math.abs(px[b] - px[a]), Math.abs(py[d] - py[a])) * 0.24;
            if (sz > 1.2) motif(g, mx, my, sz, QU.motif);
          }
        }
        // quilting stitches along the seams
        g.setLineDash([3 * U, 3 * U]); g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1 * U; g.beginPath();
        for (let r = 1; r < R - 1; r++) { g.moveTo(px[r * C], py[r * C]); for (let c = 1; c < C; c++) g.lineTo(px[r * C + c], py[r * C + c]); }
        for (let c = 1; c < C - 1; c++) { g.moveTo(px[c], py[c]); for (let r = 1; r < R; r++) g.lineTo(px[r * C + c], py[r * C + c]); }
        g.stroke(); g.setLineDash([]);
        // where it folds over the chair backs: a lit crease above, a soft shadow under it on the valance
        if (dk > 0.05) {
          g.lineCap = 'round'; g.lineJoin = 'round';
          g.strokeStyle = `rgba(0,0,0,${(0.2 * dk).toFixed(3)})`; g.lineWidth = 4 * U; g.beginPath(); for (let c = 0; c < C; c++) { const i = RB * C + c; if (c) g.lineTo(px[i], py[i] + 3 * U); else g.moveTo(px[i], py[i] + 3 * U); } g.stroke();
          g.strokeStyle = `rgba(255,${D ? 236 : 248},${D ? 200 : 230},${(0.32 * dk).toFixed(3)})`; g.lineWidth = 2.2 * U; g.beginPath(); for (let c = 0; c < C; c++) { const i = RB * C + c; if (c) g.lineTo(px[i], py[i]); else g.moveTo(px[i], py[i]); } g.stroke();
        }
        // the binding round the edge
        g.strokeStyle = mix(QU.bind, '#000000', D ? 0.25 * (1 - wk) : 0); g.lineWidth = 3.2 * U; g.lineJoin = 'round'; g.beginPath();
        g.moveTo(px[0], py[0]); for (let c = 1; c < C; c++) g.lineTo(px[c], py[c]);
        for (let r = 1; r < R; r++) g.lineTo(px[r * C + C - 1], py[r * C + C - 1]);
        for (let c = C - 2; c >= 0; c--) g.lineTo(px[iBL + c], py[iBL + c]);
        for (let r = R - 2; r > 0; r--) g.lineTo(px[r * C], py[r * C]);
        g.closePath(); g.stroke();
      }
      function drawLights(g, D) {
        if (!LT.on) return;
        const U = G.U, t = W.t;
        // the dotted path to follow, then the wire
        if (LT.n < C - 1 && W.step === 'lights') {
          g.setLineDash([2 * U, 6 * U]); g.lineDashOffset = -t * 18; g.strokeStyle = `rgba(255,228,170,${(0.55 + 0.25 * Math.sin(t * 4)).toFixed(3)})`; g.lineWidth = 2.4 * U; g.beginPath();
          for (let b = 0; b < C - 1; b++) { bulbPos(b, TMP); if (b) g.lineTo(TMP.x, TMP.y - 4 * U); else g.moveTo(TMP.x, TMP.y - 4 * U); }
          g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
        }
        g.strokeStyle = D ? '#2c3a2a' : '#3f4d3a'; g.lineWidth = 1.5 * U; g.beginPath();
        let started = false;
        for (let c = 0; c < C - 1; c++) {
          const lit = LT.lit[c]; if (!lit) { started = false; continue; }
          const i0 = iBL + c, i1 = i0 + 1, mx = (px[i0] + px[i1]) / 2, my = (py[i0] + py[i1]) / 2 + 8 * U;
          if (!started) { g.moveTo(px[i0], py[i0] + 2 * U); started = true; }
          g.quadraticCurveTo(mx, my + 3 * U, px[i1], py[i1] + 2 * U);
        }
        g.stroke();
        for (let b = 0; b < C - 1; b++) {
          if (!LT.lit[b]) continue;
          bulbPos(b, TMP);
          const age = t - LT.litT[b], pop = age < 0.35 ? back(age / 0.35) : 1, fl = age < 0.2 ? (Math.sin(age * 90) > 0 ? 1 : 0.3) : 0.86 + 0.14 * Math.sin(t * (2.2 + b * 0.37) + b), col = BULB[b % BULB.length], s = 3.6 * U * pop;
          g.globalCompositeOperation = D ? 'lighter' : 'screen'; g.globalAlpha = fl * (D ? 0.95 : 0.8);
          const gs = (16 + 6 * W.warm) * U; g.drawImage(K.glowSprite(rgba(col, 0.9)), TMP.x - gs, TMP.y - gs, gs * 2, gs * 2);
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
          g.fillStyle = '#3d4a3a'; g.fillRect(TMP.x - 1.6 * U, TMP.y - s * 1.5, 3.2 * U, 2.6 * U);
          g.fillStyle = mix(col, '#ffffff', 0.35 * fl); g.beginPath(); g.ellipse(TMP.x, TMP.y + s * 0.15, s * 0.78, s * 1.08, 0, 0, TAU); g.fill();
        }
      }
      function drawPillow(g, it, pop) {
        const spr = it.spr; if (!spr) return;
        const sy = it.sy, sx = it.sx, hh = G.pillowH;
        const kk = (it.k || 1) * pop;
        g.save(); g.translate(it.x, it.y); g.rotate(it.rot); g.scale(sx * kk, sy * kk);
        g.drawImage(spr.c, -spr.w / 2, -hh / 2 - spr.h / 2, spr.w, spr.h);
        g.restore();
      }
      function drawMug(g, it, pop) {
        const s = MUGS; g.save(); g.translate(it.x, it.y); g.rotate(it.rot); g.scale(it.sx * pop, it.sy * pop); g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); g.restore();
        if (it.state === 'placed' || PLACED.includes(it)) { // steam curling up: smell
          const U = G.U, t = W.t; g.lineCap = 'round';
          for (let k = 0; k < 3; k++) {
            g.strokeStyle = `rgba(255,255,255,${(0.2 + 0.08 * Math.sin(t * 1.3 + k)).toFixed(3)})`; g.lineWidth = 2.6 * U; g.beginPath();
            const bx = it.x + (k - 1) * 5 * U, by = it.y - G.mugH - 3 * U;
            for (let j = 0; j <= 7; j++) { const y = by - j * 4.2 * U, x = bx + Math.sin(t * 1.7 + k * 1.9 + j * 0.75) * 3 * U * (j / 7 + 0.2); if (j) g.lineTo(x, y); else g.moveTo(x, y); }
            g.stroke();
          }
        }
      }
      function drawBox(g, it, pop) {
        const s = BOXS, U = G.U; g.save(); g.translate(it.x, it.y); g.rotate(it.rot); g.scale(it.sx * pop, it.sy * pop); g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); g.restore();
        if (!PLACED.includes(it)) return;
        // the little spinning star on its pin, and the crank
        const top = it.y - G.boxH, spin = BOX.playing ? W.t * 2.4 : 0, sc = Math.abs(Math.cos(spin));
        g.strokeStyle = '#d9b05a'; g.lineWidth = 1.2 * U; g.beginPath(); g.moveTo(it.x, top - 1 * U); g.lineTo(it.x, top - 8 * U); g.stroke();
        g.fillStyle = BOX.playing ? '#ffe9a8' : '#e8cf8a'; g.save(); g.translate(it.x, top - 12 * U); g.scale(0.35 + 0.65 * sc, 1); K.starPath(g, 0, 0, 5.5 * U, 2.3 * U, 5, 0); g.fill(); g.restore();
        if (BOX.playing) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(K.glowSprite('rgba(255,220,140,0.9)'), it.x - 14 * U, top - 26 * U, 28 * U, 28 * U); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        crankPos(TMP); const a = BOX.ang;
        g.strokeStyle = '#c99a45'; g.lineWidth = 2.4 * U; g.beginPath(); g.moveTo(it.x + G.boxW / 2 - 1 * U, TMP.y); g.lineTo(TMP.x, TMP.y); g.lineTo(TMP.x + Math.cos(a) * 7 * U, TMP.y + Math.sin(a) * 7 * U); g.stroke();
        g.fillStyle = '#7a4a2a'; g.beginPath(); g.arc(TMP.x + Math.cos(a) * 7 * U, TMP.y + Math.sin(a) * 7 * U, 2.6 * U, 0, TAU); g.fill();
      }
      function drawPeg(g, x, y, rot, sc) { const s = PEGS; g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); g.restore(); }
      function drawItem(g, it) {
        const U = G.U, pop = it.state === 'pop' ? back((W.t - it.t0) / 0.4) : 1;
        if (it.state === 'carry' || it.state === 'fall' || it.state === 'snap') { // its shadow on the floor
          const fy = Math.max(it.y, it.kind === 'pillow' || it.kind === 'box' || it.kind === 'mug' ? Math.min(G.floorIn, it.y + 60 * U) : it.y), lift = clamp((fy - it.y) / (120 * U), 0, 1);
          g.fillStyle = `rgba(0,0,0,${(0.22 * (1 - lift * 0.5)).toFixed(3)})`; g.beginPath(); g.ellipse(it.x, fy + 2 * U, it.w * 0.45 * (1 - lift * 0.3), 5 * U, 0, 0, TAU); g.fill();
        } else { g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(it.x, it.y + 2 * U, it.w * 0.46 * pop, 5 * U, 0, 0, TAU); g.fill(); }
        const br = it.state === 'tray' ? 1 + 0.025 * Math.sin(W.t * 3) : 1;
        if (it.kind === 'pillow') drawPillow(g, it, pop * br);
        else if (it.kind === 'mug') drawMug(g, it, pop * br);
        else if (it.kind === 'box') drawBox(g, it, pop * br);
        else drawPeg(g, it.x, it.y, it.rot, pop * br);
      }
      function drawFolded(g) {
        const U = G.U, k = clamp((W.t - W.spawnT) / 0.42, 0, 1), s = back(k) * (1 + 0.025 * Math.sin(W.t * 3)), x = G.spawn.x, y = G.spawn.y + 6 * U;
        g.save(); g.translate(x, y); g.scale(s, s); g.drawImage(QS.c, -QS.ax, -QS.ay, QS.w, QS.h); g.restore();
      }
      function drawFloorDecor(g, D) {
        if (!DEC.size || CL.mode !== 'drape') return;
        const U = G.U, t = W.t, f = G.floorIn;
        if (DEC.has('jar')) { const x = G.books.x + G.books.w * 0.75, y = f; g.fillStyle = 'rgba(200,230,255,0.25)'; rrect(g, x - 9 * U, y - 24 * U, 18 * U, 24 * U, 4 * U); g.fill(); g.strokeStyle = 'rgba(220,240,255,0.6)'; g.lineWidth = 1.2 * U; g.stroke(); g.fillStyle = '#b08a5a'; g.fillRect(x - 8 * U, y - 27 * U, 16 * U, 4 * U); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 4; k++) { const fx = x + Math.sin(t * 1.3 + k * 2) * 5 * U, fy = y - 12 * U + Math.cos(t * 1.1 + k) * 7 * U, a = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7); g.globalAlpha = a; g.drawImage(K.glowSprite('rgba(230,255,150,0.9)'), fx - 6 * U, fy - 6 * U, 12 * U, 12 * U); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        if (DEC.has('teddy')) { const s = U * (G.phone ? 0.8 : 1.1), tx = G.boxX - G.boxW * 0.78, ty = f; g.fillStyle = '#b07a4a'; g.beginPath(); g.ellipse(tx, ty - 9 * s, 9 * s, 10 * s, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(tx, ty - 24 * s, 7.5 * s, 0, TAU); g.fill(); [-1, 1].forEach(sd => { g.beginPath(); g.arc(tx + sd * 6 * s, ty - 30 * s, 3 * s, 0, TAU); g.fill(); }); g.fillStyle = '#e8c9a0'; g.beginPath(); g.ellipse(tx, ty - 21 * s, 3.4 * s, 2.6 * s, 0, 0, TAU); g.fill(); g.fillStyle = '#2a1a10'; [-1, 1].forEach(sd => { g.beginPath(); g.arc(tx + sd * 2.6 * s, ty - 25.5 * s, 1 * s, 0, TAU); g.fill(); }); }
      }
      // under the canopy, drawn before the quilt so the valance hides their strings
      function drawHangDecor(g, D) {
        if (!DEC.size || CL.mode !== 'drape' || CL.k < 0.6) return;
        const U = G.U, t = W.t;
        const hang = (c, extra, draw) => { const i = 2 * C + c, len = Math.max(10 * U, py[iBL + c] - py[i] + extra), sw = Math.sin(t * 1.4 + c) * 0.08, x = px[i] + Math.sin(sw) * len, y = py[i] + Math.cos(sw) * len; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.8 * U; g.beginPath(); g.moveTo(px[i], py[i]); g.lineTo(x, y); g.stroke(); draw(x, y, sw); };
        if (DEC.has('stars')) [2, 5, 8].forEach((c, k) => hang(c, (10 + k * 7) * U, (x, y, sw) => { g.fillStyle = ['#ffe08a', '#ffc4d6', '#cfe3ff'][k]; K.starPath(g, x, y + 5 * U, 6 * U, 2.6 * U, 5, sw * 3); g.fill(); }));
        if (DEC.has('cranes')) [3, 7].forEach((c, k) => hang(c, (16 + k * 8) * U, (x, y) => { g.fillStyle = k ? '#ffffff' : '#ffb3a8'; g.beginPath(); g.moveTo(x - 9 * U, y + 3 * U); g.lineTo(x, y - 2 * U); g.lineTo(x + 9 * U, y + 3 * U); g.lineTo(x + 2 * U, y + 5 * U); g.lineTo(x, y + 11 * U); g.lineTo(x - 2 * U, y + 5 * U); g.closePath(); g.fill(); }));
        if (DEC.has('moon')) hang(5, 22 * U, (x, y) => { g.globalCompositeOperation = D ? 'lighter' : 'screen'; g.globalAlpha = 0.6; g.drawImage(K.glowSprite('rgba(255,240,200,0.8)'), x - 22 * U, y - 16 * U, 44 * U, 44 * U); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(x, y + 6 * U, 7 * U, 0.6, TAU - 0.6); g.arc(x + 3.5 * U, y + 6 * U, 5.6 * U, TAU - 0.9, 0.9, true); g.closePath(); g.fill(); });
      }
      // bunting trims the fold over the chair backs (drawn after the quilt)
      function drawTrim(g) {
        if (!DEC.has('bunting') || CL.mode !== 'drape' || CL.k < 0.6) return;
        const U = G.U, cols = ['#ff9aa2', '#ffd36b', '#9ee6c9', '#a8c8ff'];
        for (let c = 0; c < C - 1; c++) { const i0 = RB * C + c, i1 = i0 + 1, x0 = px[i0], y0 = py[i0], x1 = px[i1], y1 = py[i1]; g.fillStyle = cols[c % cols.length]; g.beginPath(); g.moveTo(x0, y0 + 1 * U); g.lineTo(x1, y1 + 1 * U); g.lineTo((x0 + x1) / 2, (y0 + y1) / 2 + 12 * U); g.closePath(); g.fill(); }
      }
      function drawNotes(g) {
        if (!BOX.playing || !A.ctx) return;
        const now = A.now(), U = G.U, it = PLACED.find(x => x.kind === 'box'); if (!it) return;
        while (MU.notes.length && MU.notes[0] <= now) { MU.notes.shift(); NOTES.push({ x: it.x + (Math.random() - 0.5) * 16 * U, y: it.y - G.boxH - 14 * U, age: 0, s: (0.8 + Math.random() * 0.4) * U, c: BULB[Math.floor(Math.random() * BULB.length)] }); }
      }
      const NOTES = [];
      function drawNoteGlyphs(g, dt) {
        const U = G.U;
        for (let i = NOTES.length - 1; i >= 0; i--) {
          const n = NOTES[i]; n.age += dt; if (n.age > 2.2) { NOTES.splice(i, 1); continue; }
          const x = n.x + Math.sin(n.age * 3) * 6 * U, y = n.y - n.age * 30 * U, a = Math.sin(Math.PI * clamp(n.age / 2.2, 0, 1)), s = n.s * 5;
          g.globalAlpha = a; g.fillStyle = n.c; g.strokeStyle = n.c; g.lineWidth = 1.3 * U;
          g.beginPath(); g.ellipse(x, y, s * 0.75, s * 0.55, -0.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x + s * 0.65, y); g.lineTo(x + s * 0.65, y - s * 2.4); g.lineTo(x + s * 1.4, y - s * 1.9); g.stroke();
        }
        g.globalAlpha = 1;
      }

      /* ---------------- the camera pulls back: the house at night, its window glowing, rain everywhere ---------------- */
      function pullOut() {
        W.step = 'pull';
        Object.values(CH).forEach(o => o.c.hush());
        THOUGHTS.forEach(t => { t.el.style.transition = 'opacity 0.6s ease'; t.el.style.opacity = '0'; });
        senses.style.opacity = '0';
        const s = 0.42, ww = G.w * s, hh = G.h * s, cy = G.h * (G.phone ? 0.53 : 0.56);
        W.pull = { t0: performance.now(), dur: K.reduced() ? 1100 : 3200, s, x: (G.w - ww) / 2, y: cy - hh / 2, k: -1, e: 0 };
        G.ext = { x: W.pull.x, y: W.pull.y, w: ww, h: hh };
        EXT = K.canvas(el, { cls: 'bf-ext', opaque: true, maxDpr: 1.5, z: 1 });
        FR = K.canvas(el, { cls: 'bf-frame', maxDpr: 1.5, z: 3 });
        EXT.onResize(() => { if (G.ext) paintExterior(); });
        if (A.ctx) { A.noise({ pink: true, filter: 'lowpass', freq: 300, to: 900, dur: 2.6, attack: 1.2, vol: 0.08 }); }
        rain.level(0.85, 2.5); if (AU.roof) { AU.roof.freq(2200, 2.5); AU.roof.level(0.06, 2.5); }
        MU.vol = 0.5;
        sync('pull-out');
      }
      function stepPull() {
        const P0 = W.pull, k = clamp((performance.now() - P0.t0) / P0.dur, 0, 1);
        if (P0.k === 1 && k === 1) return;
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        P0.k = k; P0.e = e;
        stage.style.transform = `translate(${(P0.x * e).toFixed(2)}px, ${(P0.y * e).toFixed(2)}px) scale(${lerp(1, P0.s, e).toFixed(4)})`;
      }
      function paintExterior() {
        const g = EXT.g; if (!g) return;
        const w = EXT.w, H = EXT.h, U = G.U, D = K.dark(), r = G.ext, rr = seedRng(55);
        g.setTransform(EXT.dpr, 0, 0, EXT.dpr, 0, 0);
        const eave = Math.max(70 * U, r.y - (G.phone ? 120 : 110) * U), ground = r.y + r.h + (G.phone ? 120 : 90) * U;
        let gr = g.createLinearGradient(0, 0, 0, eave); gr.addColorStop(0, D ? '#070b19' : '#3b4663'); gr.addColorStop(1, D ? '#18203a' : '#66728f');
        g.fillStyle = gr; g.fillRect(0, 0, w, eave);
        for (let i = 0; i < 6; i++) { g.fillStyle = rgba(D ? '#2a3354' : '#8792ad', 0.5); g.beginPath(); g.ellipse(rr() * w, rr() * eave * 0.8, (60 + rr() * 120) * U, (14 + rr() * 16) * U, 0, 0, TAU); g.fill(); }
        // clapboard siding
        const sid = D ? '#24324a' : '#6d86a0';
        gr = g.createLinearGradient(0, eave, 0, ground); gr.addColorStop(0, mix(sid, '#000000', 0.3)); gr.addColorStop(1, sid);
        g.fillStyle = gr; g.fillRect(0, eave, w, ground - eave);
        for (let y = eave + 14 * U; y < ground; y += 15 * U) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y, w, 2 * U); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, y + 2 * U, w, 1.5 * U); }
        // eave and gutter
        g.fillStyle = D ? '#0d1220' : '#3a4152'; g.fillRect(0, eave - 16 * U, w, 18 * U); g.fillStyle = D ? '#3a4560' : '#8f98ab'; g.fillRect(0, eave, w, 5 * U);
        g.fillStyle = D ? '#1d2436' : '#566078'; g.fillRect(w - 46 * U, eave, 9 * U, ground - eave);
        // warm light spilling from the window onto the wall
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = D ? 0.85 : 0.55;
        g.drawImage(K.glowSprite('rgba(255,170,90,0.85)'), r.x - r.w * 1.1, r.y - r.h * 0.55, r.w * 3.2, r.h * 2.1);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // shutters and a window box of flowers
        const shw = (G.phone ? 26 : 44) * U, shc = D ? '#2f5a4c' : '#3f7a66';
        [r.x - shw - 14 * U, r.x + r.w + 14 * U].forEach(x => { g.fillStyle = shc; g.fillRect(x, r.y - 4 * U, shw, r.h + 8 * U); g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = r.y + 4 * U; y < r.y + r.h; y += 10 * U) g.fillRect(x + 4 * U, y, shw - 8 * U, 3 * U); });
        const by = r.y + r.h + 18 * U;
        g.fillStyle = D ? '#5a3a2a' : '#8a5a3a'; g.fillRect(r.x - 6 * U, by, r.w + 12 * U, 20 * U);
        for (let i = 0; i < Math.round(r.w / (14 * U)); i++) { const x = r.x + i * 14 * U + rr() * 6 * U; g.fillStyle = '#3f6b3a'; g.beginPath(); g.ellipse(x, by - 2 * U, 7 * U, 5 * U, 0, 0, TAU); g.fill(); g.fillStyle = ['#e85d75', '#ffb347', '#ff8fb1', '#f6e27a'][i % 4]; g.beginPath(); g.arc(x + 2 * U, by - 7 * U, 3.2 * U, 0, TAU); g.fill(); }
        // the wet ground, reflecting the window
        gr = g.createLinearGradient(0, ground, 0, H); gr.addColorStop(0, D ? '#0b0f1c' : '#3d4558'); gr.addColorStop(1, D ? '#05070e' : '#2a3040');
        g.fillStyle = gr; g.fillRect(0, ground, w, H - ground);
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++) { const y = ground + 6 * U + rr() * (H - ground - 10 * U), x = r.x + r.w * (0.1 + rr() * 0.8), ln = (10 + rr() * 34) * U; g.fillStyle = `rgba(255,${170 + (rr() * 50) | 0},100,${(0.12 + rr() * 0.22).toFixed(3)})`; g.fillRect(x - ln / 2, y, ln, Math.max(1, 1.6 * U)); }
        g.globalCompositeOperation = 'source-over';
        // a street lamp down the road
        const lx = G.phone ? 26 * U : w * 0.12, ly = ground - (G.phone ? 150 : 230) * U;
        g.fillStyle = D ? '#0a0e18' : '#2c3242'; g.fillRect(lx - 2.5 * U, ly, 5 * U, ground - ly + 4 * U); g.fillRect(lx - 9 * U, ly - 6 * U, 18 * U, 8 * U);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7; g.drawImage(K.glowSprite('rgba(255,210,140,0.9)'), lx - 44 * U, ly - 44 * U, 88 * U, 88 * U); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawFrame() {
        const g = FR.g; if (!g || !W.pull) return;
        FR.clear();
        const U = G.U, D = K.dark(), e = W.pull.e || 0, s = lerp(1, W.pull.s, e), x = W.pull.x * e, y = W.pull.y * e, ww = G.w * s, hh = G.h * s, a = sm((e - 0.5) / 0.5);
        if (a > 0) {
          g.globalAlpha = a;
          const fw = (G.phone ? 9 : 12) * U, fc = D ? '#e9dcc6' : '#fbf3e6';
          g.fillStyle = fc; g.fillRect(x - fw, y - fw, ww + fw * 2, fw); g.fillRect(x - fw, y + hh, ww + fw * 2, fw * 1.4); g.fillRect(x - fw, y, fw, hh); g.fillRect(x + ww, y, fw, hh);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - fw, y + hh + fw * 1.4, ww + fw * 2, 4 * U);
          // one transom high up, so nothing crosses the fort
          const mw = 4 * U; g.fillStyle = fc; g.fillRect(x, y + hh * 0.22 - mw / 2, ww, mw);
          // the window glows from inside
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * (D ? 0.24 : 0.16);
          g.drawImage(K.glowSprite('rgba(255,176,96,0.9)'), x - ww * 0.15, y + hh * 0.3, ww * 1.3, hh * 0.85);
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = a;
          // the glass: a faint sheen and a few drops
          g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.moveTo(x + ww * 0.1, y); g.lineTo(x + ww * 0.28, y); g.lineTo(x + ww * 0.08, y + hh); g.lineTo(x - ww * 0.06, y + hh); g.closePath(); g.fill();
          g.globalAlpha = 1;
        }
        // rain falling in front of everything
        const t = W.t, n = Math.round((G.phone ? 70 : 140) * WX.rain), sl = WX.slant + 0.05, len = 18 * U, ra = sm(e * 1.6);
        if (ra > 0) {
          g.strokeStyle = D ? `rgba(190,210,245,${(0.32 * ra).toFixed(3)})` : `rgba(235,242,255,${(0.42 * ra).toFixed(3)})`; g.lineWidth = 1.2 * U; g.beginPath();
          for (let i = 0; i < n; i++) { const rx = ((i * 73.1 + t * 600 * sl) % (G.w + 60)) - 30, ry = ((i * 41.3 + t * (700 + (i % 7) * 60)) % (G.h + 40)) - 20; g.moveTo(rx, ry); g.lineTo(rx - sl * len, ry + len); }
          g.stroke();
        }
      }

      /* ---------------- frame loop (real time, so a busy device still flows at the right speed) ---------------- */
      let lastT = 0, FDT = 1 / 60, qAcc = 0, qN = 0, qLvl = 1;
      K.loop((dtIn, tNow) => {
        const g = cv.g; if (!g || !G.w || !BGc) return;
        const raw = lastT ? tNow - lastT : dtIn; lastT = tNow;
        const rdt = clamp(raw, 0, 0.25); FDT = Math.min(0.05, rdt);
        if (raw < 0.5) { qAcc += raw; qN++; if (qN >= 120) { if (qAcc / qN > 0.03 && qLvl > 0.7) { qLvl = qLvl > 0.9 ? 0.8 : 0.7; cv.setQuality(qLvl); } qAcc = 0; qN = 0; } }
        let n = 0;
        for (let rem = rdt; rem > 1e-4 && n < 6; rem -= 1 / 60, n++) {
          const dt = Math.min(rem, 1 / 60);
          W.t += dt;
          W.warm += (W.warmT - W.warm) * Math.min(1, dt * 0.8);
          W.fog += (W.fogT - W.fog) * Math.min(1, dt * 0.45);
          W.lightsK += ((LT.n / (C - 1)) - W.lightsK) * Math.min(1, dt * 3);
          W.flash = Math.max(0, W.flash - dt * 2.4);
          stepCloth(dt); stepItem(dt); stepDrops(dt);
          for (const it of PLACED) squash(it, dt);
          if (ITEM) squash(ITEM, dt);
        }
        IN.sx += (IN.fx - IN.sx) * Math.min(1, FDT * 30); IN.sy += (IN.fy - IN.sy) * Math.min(1, FDT * 30);
        updateThoughts();
        P.update(FDT);
        const D = K.dark();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.drawImage(BGc.c, 0, 0, G.w, G.h);
        if (W.warm > 0.004) { g.globalAlpha = W.warm; g.drawImage(BGw.c, 0, 0, G.w, G.h); g.globalAlpha = 1; }
        drawWindow(g, D);
        if (G.lamp) { const L0 = G.lamp, a = 0.3 + W.warm * 0.45; g.globalCompositeOperation = D ? 'lighter' : 'screen'; g.globalAlpha = a; const s = 120 * G.U; g.drawImage(K.glowSprite('rgba(255,200,130,0.85)'), L0.x - s, L0.shadeY + 30 * G.U - s, s * 2, s * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        drawInterior(g, D);
        drawFloorDecor(g, D);
        for (const it of PLACED) { if (it.kind === 'pillow') drawPillow(g, it, 1); }
        for (const it of PLACED) { if (it.kind === 'mug') drawMug(g, it, 1); else if (it.kind === 'box') drawBox(g, it, 1); }
        drawNotes(g); drawNoteGlyphs(g, FDT);
        drawHangDecor(g, D);
        if (CL.mode !== 'none' && CL.mode !== 'tray') drawQuilt(g, D);
        drawTrim(g);
        drawLights(g, D);
        if (W.pegged) drawPeg(g, px[iCR], py[iCR] + G.pegH * 0.55, -0.12, 1);
        if (ITEM) drawItem(g, ITEM);
        if (CL.mode === 'tray' && W.step === 'quilt') drawFolded(g);
        P.draw(g);
        if (W.flash > 0.02 && !K.reduced()) { g.fillStyle = `rgba(205,215,255,${(W.flash * 0.1).toFixed(3)})`; g.fillRect(0, 0, G.w, G.h); }
        if (W.pull) stepPull();
        if (FR) drawFrame();
      });

      /* ---------------- the end ---------------- */
      async function finale() {
        if (finished || W.phase !== 'play') return;
        W.phase = 'snug'; setStep('snug');
        warmTo(1); fogTo(0.9);
        patch.base('cosy'); drop.base('sleepy'); still.base('sleepy'); if (guest) guest.base(GUEST.mood);
        talk('patch', L.snug, 3300, 'cosy');
        if (A.ctx) A.pad(['F3', 'A3', 'C4', 'E4'].map(nf), { dur: 6, vol: 0.12, attack: 1.4 });
        sync('snug');
        await K.wait(3700);
        pullOut();
        await K.wait(K.reduced() ? 1400 : 3300);
        cap.children[0].textContent = 'Rain outside. Fairy lights inside.';
        cap.children[1].textContent = '5 senses soothed · ' + WX.name + ' tonight';
        cap.children[2].textContent = TOMORROW.id === WX.id ? 'Tomorrow: more ' + WX.name.toLowerCase() + '.' : 'Tomorrow: ' + TOMORROW.name.toLowerCase() + '.';
        cap.classList.add('bf-on');
        if (A.ctx) ['C5', 'F5', 'A5'].forEach((n, i) => A.chime(nf(n), { when: A.now() + 0.2 + i * 0.16, vol: 0.05, dur: 2 }));
        await K.wait(3600);
        finish();
      }
      function finish() {
        if (finished) return;
        finished = true; W.phase = 'end'; K.guide(null);
        const avg = (a, d) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : d);
        LT.minD.forEach(d => { if (d < 1e8) W.steady.push(clamp(1 - (d - 6 * G.U) / (30 * G.U), 0, 1)); });
        const gentle = avg(W.gentle, 0.8), steady = avg(W.steady, 0.8), score = clamp(gentle * 0.6 + steady * 0.4, 0, 1), pct = Math.round(score * 100), tier = K.tier(score), badges = [];
        const pb = K.best('cosy', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% cosy build'); else if (pb.first) badges.push('Cosiest build: ' + pct + '%');
        if (tier) badges.push(tier + ' fort-builder');
        const d = DECOR[visits % DECOR.length], got = K.collect('Decoration: ' + d.name), count = K.collection().filter(x => /^Decoration: /.test(x)).length;
        badges.push(got.isNew ? 'New fort decoration: ' + d.name : 'Fort decorations: ' + count + ' of ' + DECOR.length);
        if (GUEST) badges.push('Guest tonight: ' + GUEST.name);
        ctx.track('done', { gentle: Math.round(gentle * 100), steady: Math.round(steady * 100), tier: ({ Bronze: 1, Silver: 2, Gold: 3 })[tier] || 0, visits });
        const lines = ['Five senses soothed: touch, sight, smell, taste, sound', 'Set things down gently: ' + Math.round(gentle * 100) + '%', 'A worry slipped in once. You tucked it back.'];
        if (care()) lines[2] = 'If it’s heavy for real, talking to someone you trust can help too.';
        ctx.finish({ title: 'Snug as anything', mood: 'cosy', lines, share: 'Built a blanket fort. Rain outside, fairy lights inside.', badges });
      }

      /* ---------------- start ---------------- */
      S.on('theme', () => { if (G.w) { paintAll(); } });
      cv.onResize(() => layout());
      makeThoughts();
      try { document.fonts && document.fonts.load('700 18px "Gaegu"').then(() => { if (!finished) placeThoughts(); }).catch(() => {}); } catch (e) { /* no font loading API */ }
      ctx.analysisReady.then(a => {
        if (!a || typeof a !== 'object' || a === an || finished || (W.step !== 'intro' && W.step !== 'quilt')) return;
        an = a; makeThoughts(); updateThoughts();
      }).catch(() => {});
      const DEV = !!(S.isDev && S.isDev());
      if (DEV) window.__blanketFort = { W, CL, LT, BOX, G, PLACED, item: () => ITEM, px, py };
      (async () => {
        await K.intro({ title: 'Blanket Fort', sub: 'It’s pouring outside. Build somewhere soft to be, one sense at a time.', how: 'Drag each cosy thing into place.', char: 'patch', mood: 'cosy' });
        W.phase = 'play';
        talk('patch', L.start, 3600, 'happy');
        S.later(startQuilt, 600);
      })();

      return {
        async autoplay() {
          const intro = el.querySelector('.gk-intro'); if (intro) await K.sim.tap(intro);
          while (W.phase === 'intro') await K.wait(100);
          const t0 = performance.now(), U = () => G.U;
          while (!finished && W.phase === 'play' && performance.now() - t0 < 115000) {
            const st = W.step;
            if (!W.ready) { await K.wait(100); continue; }
            if (st === 'quilt' && CL.mode === 'tray') { await K.sim.drag(pad, { x: G.spawn.x, y: G.spawn.y - 12 * U() }, { x: G.cx, y: CL.top[5].y + 40 * U() }, 1100, 22); await K.wait(500); continue; }
            if (ITEM && ITEM.state === 'tray') { const t = itemTarget(ITEM), a = { x: ITEM.x, y: ITEM.y - 12 * U() }; await K.sim.drag(pad, a, { x: t.x, y: t.y - 30 * U() }, 900, 18); await K.wait(450); continue; }
            if (st === 'lights') {
              bulbPos(firstUnlit(), TMP); const pr = await K.sim.press(pad, TMP.x, TMP.y);
              for (let b = 0; b < C - 1; b++) { const q = bulbPos(b, { x: 0, y: 0 }); for (let k = 1; k <= 3; k++) { pr.move(q.x - 8 * U() + k * 5 * U(), q.y); await K.wait(55); } }
              pr.up(TMP.x, TMP.y); await K.wait(500); continue;
            }
            if (st === 'wind') {
              const c = crankPos({ x: 0, y: 0 }), r0 = 30 * U(), pr = await K.sim.press(pad, c.x + r0, c.y);
              for (let k = 1; k <= 40; k++) { const a = k / 40 * TAU * 2.3; pr.move(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0); await K.wait(45); }
              pr.up(c.x + r0, c.y); await K.wait(400); continue;
            }
            if (st === 'invite') {
              const x = px[iBL + 5], y = py[iBL + 5] + 4 * U(), pr = await K.sim.press(pad, x, y);
              for (let k = 1; k <= 12; k++) { pr.move(x, y - k * 6 * U()); await K.wait(50); }
              await K.wait(2200); pr.up(x, y - 72 * U()); await K.wait(400); continue;
            }
            await K.wait(120);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
