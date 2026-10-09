/* 020 North Star — Reset · CLARIFY · Values / Meaning / Grief
 * Mechanism: values-based action from Acceptance and Commitment Therapy (Hayes, Strosahl & Wilson 1999). A value is a
 * direction, not a destination: the player picks one as their star, then steers back to it each time a gust carrying
 * one of their own looping thoughts pushes the bow off course. In fog the star disappears and the compass in the wheel
 * holds the heading: values are still there when you can't feel them. At the harbour they pick one small step for today.
 * Verb: steer (turn the ship's wheel: it is a rudder, so the bow swings with weight and you ease off as you come back).
 * Finale: the harbour light greets the boat and the whole route, every drift and every return, rises into the sky and
 * draws itself into the value's constellation.
 */
(function (env) {
  'use strict';
  /* Eight values. pts/edges: the constellation in a unit box; a: its brightest star (the one you steer by); motif: the
     phrase the star sings while you are on course (A minor pentatonic). steps: small actions for today. */
  const VALUES = [
    { id: 'kindness', name: 'Kindness', pts: [[0.1, 0.3], [0.25, 0.72], [0.5, 0.9], [0.75, 0.72], [0.9, 0.3], [0.5, 0.52]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 3]], a: 5, motif: ['E5', 'D5', 'C5', 'D5', 'E5'],
      steps: ['Send one kind message', 'Do one small favour', 'Be gentle with yourself once today'] },
    { id: 'courage', name: 'Courage', pts: [[0.1, 0.88], [0.34, 0.62], [0.55, 0.45], [0.86, 0.12], [0.62, 0.16], [0.82, 0.38]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5]], a: 3, motif: ['A4', 'C5', 'E5', 'A5', 'G5'],
      steps: ['Do the scary thing for two minutes', 'Say one honest sentence out loud', 'Ask for what you need'] },
    { id: 'honesty', name: 'Honesty', pts: [[0.14, 0.26], [0.3, 0.12], [0.44, 0.28], [0.28, 0.42], [0.86, 0.82], [0.74, 0.92], [0.8, 0.66]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [4, 6]], a: 1, motif: ['C5', 'C5', 'D5', 'E5', 'D5'],
      steps: ['Tell one person how you actually feel', 'Write down what is true right now', 'Own one small thing'] },
    { id: 'curiosity', name: 'Curiosity', pts: [[0.5, 0.5], [0.62, 0.44], [0.6, 0.62], [0.38, 0.62], [0.3, 0.38], [0.55, 0.2], [0.85, 0.4], [0.82, 0.82]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]], a: 5, motif: ['E5', 'G5', 'A5', 'G5', 'D5'],
      steps: ['Ask one real question today', 'Look up one thing you wonder about', 'Try a new route or a new food'] },
    { id: 'connection', name: 'Connection', pts: [[0.08, 0.7], [0.3, 0.35], [0.5, 0.55], [0.7, 0.35], [0.92, 0.7], [0.3, 0.78], [0.7, 0.78]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [3, 6], [5, 6]], a: 2, motif: ['A4', 'C5', 'A4', 'D5', 'C5', 'E5'],
      steps: ['Text someone you miss', 'Call instead of typing', 'Share a meal with someone'] },
    { id: 'growth', name: 'Growth', pts: [[0.5, 0.95], [0.5, 0.6], [0.5, 0.22], [0.25, 0.45], [0.12, 0.3], [0.75, 0.35], [0.9, 0.16]], edges: [[0, 1], [1, 2], [1, 3], [3, 4], [2, 5], [5, 6]], a: 2, motif: ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'],
      steps: ['Practise one skill for ten minutes', 'Read five pages of something good', 'Take the next small step'] },
    { id: 'calm', name: 'Calm', pts: [[0.05, 0.6], [0.25, 0.46], [0.45, 0.6], [0.65, 0.46], [0.85, 0.6], [0.52, 0.14]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]], a: 5, motif: ['E5', 'D5', 'C5', 'A4'],
      steps: ['Three slow breaths before you reply', 'Take a ten-minute walk', 'Put the phone in another room for an hour'] },
    { id: 'play', name: 'Play', pts: [[0.5, 0.05], [0.8, 0.35], [0.5, 0.65], [0.2, 0.35], [0.44, 0.8], [0.6, 0.9], [0.48, 0.99]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [2, 4], [4, 5], [5, 6]], a: 0, motif: ['G5', 'E5', 'A5', 'G5', 'E5', 'D5'],
      steps: ['Do one thing just for fun', 'Put on a song and move', 'Doodle for five minutes'] }
  ];
  /* Which three values to offer first, from what the player wrote (their parent pattern). */
  const SUGGEST = {
    'Values / Meaning / Grief': ['connection', 'kindness', 'growth'], 'Identity / Self': ['honesty', 'kindness', 'courage'], 'Decision Pressure': ['honesty', 'courage', 'calm'],
    'Performance / Confidence': ['courage', 'growth', 'play'], 'Social / Team / Perspective': ['connection', 'kindness', 'honesty'], 'Communication / Boundaries': ['honesty', 'courage', 'kindness'],
    'Getting Started': ['courage', 'growth', 'curiosity'], 'Emotion': ['kindness', 'calm', 'honesty'], 'Panic / Body Alarm': ['calm', 'kindness', 'courage'],
    'Uncertainty / Future Worry / Reassurance': ['courage', 'calm', 'curiosity'], 'Memory / Replay / Rumination': ['kindness', 'growth', 'calm'], 'Overthinking / Thought Fusion': ['curiosity', 'calm', 'play'],
    'Creativity / Mind Play': ['curiosity', 'play', 'growth'], 'Mental Overload / Working Memory': ['calm', 'growth', 'kindness'], 'Urges / Habit Loops': ['calm', 'growth', 'courage'],
    'Sleep / Winding Down': ['calm', 'kindness', 'play'], 'Positive State': ['play', 'connection', 'growth'], 'Inner Speech / Mental Text': ['kindness', 'honesty', 'calm'],
    'Beliefs / Evidence': ['honesty', 'curiosity', 'courage'], 'Attention / Grounding / Mental Quiet': ['calm', 'curiosity', 'kindness'], 'Mental Imagery': ['calm', 'kindness', 'curiosity'], 'Support First / Safety': ['kindness', 'calm', 'connection']
  };
  /* Tonight's sky: the same all day, different tomorrow. */
  const SKIES = [
    { id: 'crescent', name: 'Crescent Moon', moon: 0.32, moonB: 1.22 },
    { id: 'full', name: 'Full Moon', moon: 1, moonB: -1.24 },
    { id: 'aurora', name: 'Aurora Night', aurora: true },
    { id: 'meteors', name: 'Meteor Shower', meteors: true, moon: 0.18, moonB: 1.3 },
    { id: 'milky', name: 'Milky Way Night', milky: true }
  ];
  const PAL = {
    dark: { top: '#050816', mid: '#0d1336', low: '#2a2a62', glow: '#5a4f96', seaTop: '#1b2350', seaBot: '#03050f', star: '#ffe3a0', faint: '#cfd8ff', line: '#ffe6ad', wake: '#7ff5e0', sail: '#e9ecff', sail2: '#9aa3d6', hull: '#191329', trim: '#6b4a33', lamp: '#ffc46b', fog: '#9aa6c8', harbor: '#ffcf7a', aur: ['#69ffc9', '#7fb6ff', '#c49bff'] },
    bright: { top: '#24357c', mid: '#5560a8', low: '#b09ad6', glow: '#f2b6c8', seaTop: '#6a74b4', seaBot: '#1d2558', star: '#fff1c8', faint: '#ffffff', line: '#fff3cf', wake: '#a8fff0', sail: '#ffffff', sail2: '#c4c9ee', hull: '#2a2148', trim: '#7d5638', lamp: '#ffd27d', fog: '#d6dcf2', harbor: '#ffd890', aur: ['#1fd39a', '#3f7fe8', '#9a5ce6'] }
  };
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const p = hex(a), q = hex(b); k = Math.max(0, Math.min(1, k)); return `rgb(${Math.round(p[0] + (q[0] - p[0]) * k)},${Math.round(p[1] + (q[1] - p[1]) * k)},${Math.round(p[2] + (q[2] - p[2]) * k)})`; };
  const rgba = (c, a) => { const p = hex(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const ios = (x) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, x))) - 1) / 2;

  (env.games = env.games || []).push({
    id: 'north-star', mode: 'reset', name: 'North Star', verb: 'steer', family: 'CLARIFY', minutes: 2,
    parents: ['Values / Meaning / Grief', 'Identity / Self', 'Decision Pressure'],
    cast: ['drop', 'still'], poster: { char: 'drop', mood: 'idea' }, fonts: ['Cinzel:wght@500;700', 'Cormorant+Garamond:ital,wght@1,500;1,600'],
    tagline: 'Pick a value as your star and steer back to it whenever you drift.',
    why: 'For feeling lost or pulled about: a value is a direction you can always turn back toward.',
    css: `
.g-north-star { --font-display: "Cinzel", "Trajan Pro", "Optima", "Palatino Linotype", "Book Antiqua", "Lora", Georgia, serif; --ns-serif: "Cormorant Garamond", "Palatino Linotype", "Book Antiqua", "Lora", Georgia, serif;
  --ui-bg: #050816; --ui-surface: #141a3a; --ui-fg: #f3efe2; --ui-muted: #c3c6e2; --ui-accent: #ffd27a; --ui-accent-ink: #1b1405; --ui-line: rgba(255, 232, 180, 0.22); --ui-scrim: rgba(4, 6, 20, 0.6);
  background: #050816; color-scheme: dark; }
.tsg[data-scene="bright"] .g-north-star { --ui-bg: #24357c; --ui-surface: #fbf7ee; --ui-fg: #1d1b3a; --ui-muted: #555377; --ui-accent: #8c5a12; --ui-accent-ink: #ffffff; --ui-line: rgba(40, 30, 80, 0.18); --ui-scrim: rgba(20, 20, 60, 0.4); background: #24357c; color-scheme: light; }
.g-north-star .ns-pad { position: absolute; left: 0; right: 0; bottom: 0; top: 46%; z-index: 20; touch-action: none; cursor: grab; outline: none; -webkit-tap-highlight-color: transparent; }
.g-north-star .ns-pad.ns-grab { cursor: grabbing; }
.g-north-star .ns-pad:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 220, 150, 0.8); }
.g-north-star .ns-star { position: absolute; left: 0; top: 0; z-index: 24; width: 64px; height: 64px; margin: -32px 0 0 -32px; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: pointer; touch-action: manipulation; }
.g-north-star .ns-star::before { content: ""; position: absolute; inset: 14px; border-radius: 50%; border: 2px solid rgba(255, 227, 160, 0); transition: border-color 0.3s ease; }
.g-north-star .ns-star.ns-sug::before { border-color: rgba(255, 227, 160, 0.75); animation: north-star-sug 1.8s ease-in-out infinite; }
.g-north-star .ns-star:focus-visible { outline: 2px solid #ffe3a0; outline-offset: 2px; }
.g-north-star .ns-star span { position: absolute; left: 50%; top: 66px; transform: translateX(-50%); white-space: nowrap; font: 600 15px/1 var(--font-display); letter-spacing: 0.05em; color: #f6efdc; text-shadow: 0 1px 8px rgba(4, 6, 24, 0.95), 0 0 2px rgba(4, 6, 24, 0.9); pointer-events: none; }
.g-north-star .ns-star.ns-sug span { color: #ffe3a0; }
.g-north-star .ns-star.ns-past span::after { content: " ✦"; color: #ffd27a; }
.g-north-star .ns-star.ns-dim { opacity: 0.35; pointer-events: none; transition: opacity 0.6s ease; }
@keyframes north-star-sug { 0%, 100% { transform: scale(0.85); opacity: 0.55; } 50% { transform: scale(1.12); opacity: 1; } }
.g-north-star .ns-name { position: absolute; left: 0; top: 0; z-index: 23; pointer-events: none; font: 700 17px/1 var(--font-display); letter-spacing: 0.16em; text-transform: uppercase; color: #ffe8b4; white-space: nowrap;
  text-shadow: 0 0 14px rgba(255, 210, 120, 0.55), 0 2px 8px rgba(4, 6, 24, 0.9); opacity: 0; transition: opacity 1s ease; will-change: transform; }
.g-north-star .ns-name.ns-on { opacity: 1; }
.tsg[data-scene="bright"] .g-north-star .ns-name { text-shadow: 0 0 10px rgba(255, 200, 110, 0.5), 0 1px 3px rgba(24, 18, 70, 0.95), 0 2px 12px rgba(24, 18, 70, 0.85); }
.g-north-star .ns-gust { position: absolute; left: 0; top: 0; z-index: 22; pointer-events: none; will-change: transform, opacity; max-width: min(200px, 52cqw); padding: 2px 4px;
  color: #f1eeff; font: 700 15px/1.15 var(--font-ui); letter-spacing: 0.05em; text-align: center; text-wrap: balance; text-shadow: 0 1px 6px rgba(8, 6, 24, 0.95), 0 0 2px rgba(8, 6, 24, 1); }
.g-north-star .ns-acts { position: absolute; z-index: 36; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 22px); transform: translate(-50%, 16px); width: min(440px, calc(100% - 32px)); opacity: 0; pointer-events: none;
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(.2, .9, .3, 1); display: flex; flex-direction: column; gap: 10px; align-items: stretch;
  background: rgba(12, 14, 40, 0.86); border: 1px solid rgba(255, 228, 170, 0.3); border-radius: 20px; padding: 14px 14px 16px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45); }
.tsg[data-scene="bright"] .g-north-star .ns-acts { background: rgba(251, 247, 238, 0.95); border-color: rgba(140, 90, 18, 0.25); }
.g-north-star .ns-acts.ns-on { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
.g-north-star .ns-acts-title { position: absolute; z-index: 36; left: 50%; bottom: 300px; transform: translate(-50%, 10px); width: min(440px, calc(100% - 40px)); text-align: center; pointer-events: none; opacity: 0;
  font: 600 23px/1.2 var(--ns-serif); font-style: italic; color: #fff1d0; text-shadow: 0 0 18px rgba(255, 210, 120, 0.35), 0 2px 10px rgba(4, 6, 24, 0.95); transition: opacity 0.7s ease, transform 0.7s ease; }
.g-north-star .ns-acts-title.ns-on { opacity: 1; transform: translate(-50%, 0); }
.g-north-star .ns-acts .gk-chips { flex-direction: column; align-items: stretch; }
.g-north-star .ns-acts .gk-chip { min-height: 46px; font: 600 15px/1.25 var(--font-ui); text-align: center; white-space: normal; }
.g-north-star .ns-acts .gk-chip[aria-pressed="true"] { border-color: #ffd27a; box-shadow: 0 0 0 2px rgba(255, 210, 122, 0.55), 0 0 18px rgba(255, 210, 122, 0.35); }
.g-north-star .ns-cap { position: absolute; left: 50%; top: 13%; z-index: 26; transform: translate(-50%, -30%); text-align: center; pointer-events: none; opacity: 0; width: max-content; max-width: calc(100% - 32px);
  transition: opacity 1.4s ease, transform 1.6s cubic-bezier(.2, .9, .3, 1); }
.g-north-star .ns-cap.ns-on { opacity: 1; transform: translate(-50%, -50%); }
.g-north-star .ns-cap b { display: block; font: 700 clamp(30px, 9.5cqw, 54px)/1.05 var(--font-display); letter-spacing: 0.08em; color: #fff3d6; text-shadow: 0 0 26px rgba(255, 210, 120, 0.5), 0 3px 12px rgba(4, 6, 24, 0.85); }
.g-north-star .ns-cap span { display: block; margin-top: 8px; font: 600 21px/1.25 var(--ns-serif); font-style: italic; color: #ffe8bd; text-shadow: 0 2px 10px rgba(4, 6, 24, 0.9); }
.g-north-star .ns-cap i { display: block; margin-top: 6px; font: 500 13px/1.3 var(--font-ui); font-style: normal; letter-spacing: 0.06em; color: #dcdcf4; text-shadow: 0 2px 8px rgba(4, 6, 24, 0.9); }
.g-north-star .ns-pop { position: absolute; z-index: 27; left: 0; top: 0; transform: translate(-50%, -50%); pointer-events: none; white-space: nowrap; font: 600 20px/1 var(--ns-serif); font-style: italic; color: #ffe8b4;
  text-shadow: 0 0 12px rgba(255, 210, 120, 0.6), 0 2px 8px rgba(4, 6, 24, 0.9); animation: north-star-pop 1.9s ease-out both; }
@keyframes north-star-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(0.9); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -110%); } }
.g-north-star .gk-char .gk-char-img { transition: opacity 1.2s ease; }
.g-north-star .gk-char.ns-away .gk-char-img { opacity: 0; }
.g-north-star .gk-char.ns-away .gk-bubble { display: none; }
.tsg.reduced-motion .g-north-star .ns-star.ns-sug::before { animation: none; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const inten = ctx.intensity, line = (o) => ctx.line(o), care = an.safety === 'care', visits = K.visits();
      let SKY = K.dailyPick(SKIES, 5);
      try { if (S.isDev && S.isDev()) { const q = new URLSearchParams(location.search).get('nssky'), f = SKIES.find(x => x.id === q); if (f) SKY = f; } } catch (e) { /* dev preview only */ }
      const past = K.collection();
      const T = { // Gentle is roomier with a helping hand on the helm; Full has more and stronger gusts
        on: [0.13, 0.09, 0.075][inten], gusts: [2, 3, 4][inten], push: [0.22, 0.3, 0.36][inten], assist: [0.35, 0.12, 0][inten], fogGusts: [1, 2, 2][inten], fogT: [11, 13, 14][inten]
      };
      /* gusts carry the player's own looping thoughts, exactly as the reading gave them; the heaviest comes last */
      const own = (Array.isArray(an.strands) ? an.strands : []).map(s => s && s.label).filter(Boolean);
      const core = an.core && an.core.label ? an.core.label : '';
      let gl = own.filter(x => x !== core).slice(0, Math.max(0, T.gusts - (core ? 1 : 0)));
      if (core) gl.push(core);
      ['WHAT IF', 'NOT ENOUGH', 'TOO MUCH', 'ALL AT ONCE'].forEach(x => { if (gl.length < T.gusts) gl.push(x); });
      const GUSTS = gl.slice(0, T.gusts);
      let SUG = (SUGGEST[an.parent] || ['kindness', 'courage', 'calm']).slice();
      const p2 = Array.isArray(an.parents2) && an.parents2[0] && SUGGEST[an.parents2[0]];
      if (p2 && !SUG.includes(p2[0])) SUG[2] = p2[0];
      /* tonight's sky map (bearing in radians, height as a share of the sky): the three suggested stars sit lowest, nearest the
         thumb; the other five shine above them */
      const MAP = {}, others = VALUES.map(v => v.id).filter(id => !SUG.includes(id));
      SUG.forEach((id, i) => { MAP[id] = [[-0.78, 0, 0.78][i], 0.2]; });
      others.forEach((id, i) => { MAP[id] = i < 3 ? [[-0.78, 0, 0.78][i], 0.86] : [[-0.39, 0.39][i - 3], 0.53]; });
      const VS = VALUES.map(v => ({ v, b: MAP[v.id][0], el: MAP[v.id][1], x: 0, y: 0, tw: Math.random() * 6, btn: null }));

      /* ---------------- state ---------------- */
      const G = { w: 0, h: 0, phone: true };
      const N = { ph: 'intro', t: 0, psi: 0, rate: 0, wheel: 0, course: 0, ppr: 140, view: 0, chosen: null, drifted: false, returns: 0, sailT: 0, onT: 0, on: false, fog: 0, fogTarget: 0, harbor: 0, heel: 0,
        gust: null, gustN: 0, sing: 0, X: 0, Z: 0, speed: 0, cam: 0, camY: 0, routeK: 0, elT: 0.62, maxOff: 0, firstOn: false, picked: '', dim: 0, flash: 0, stars: 1,
        T: 0, pt: 0, lift: 0, cons: 0, boat: 1, sail: 0, fogT: 0, fogG: 0, fogNext: 0, gustAt: 0, next: 0, flap: 0 };
      const wake = [], marks = [], route = [];
      let finished = false, touching = false, FDT = 1 / 60;

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const P = K.particles({ max: 260 });
      const pad = h('div', { class: 'ns-pad', role: 'slider', tabindex: '0', 'aria-label': 'Ship’s wheel: drag around it to steer, or use the arrow keys', 'aria-valuemin': '-100', 'aria-valuemax': '100', 'aria-valuenow': '0' });
      const nameEl = h('div', { class: 'ns-name', 'aria-hidden': 'true' });
      const acts = h('div', { class: 'ns-acts', role: 'group', 'aria-label': 'One small step today that points this way' });
      const actsTitle = h('div', { class: 'ns-acts-title', 'aria-hidden': 'true', text: 'One small step today that points this way' });
      el.append(actsTitle);
      const cap = h('div', { class: 'ns-cap', 'aria-live': 'polite' }, h('b'), h('span'), h('i'));
      el.append(pad, nameEl, acts, cap);
      VS.forEach(s => {
        const b = h('button', { type: 'button', class: 'ns-star' + (past.includes(s.v.name) ? ' ns-past' : ''), 'aria-label': 'Choose ' + s.v.name + (past.includes(s.v.name) ? ' (sailed by before)' : ''), hidden: true }, h('span', { text: s.v.name }));
        K.tap(b, () => choose(s));
        el.append(b); s.btn = b;
      });
      const drop = K.character('drop', { side: 'right', mood: 'happy', x: 12, y: 62, size: 64 });
      const still = K.character('still', { side: 'left', mood: 'calm', x: 0, y: 62, size: 64 });
      still.el.classList.add('ns-still', 'ns-away');

      /* ---------------- sound: sea, wind, a drone with slow chords, and the star's own melody while you're on course ---------------- */
      const AU = { sea: null, wind: null };
      const audioOn = () => {
        if (!A.ctx || AU.sea) return;
        AU.sea = A.loop({ pink: true, filter: 'lowpass', freq: 520, q: 0.4, bus: 'amb' }); if (AU.sea) AU.sea.level(0.05, 1.5);
        AU.wind = A.loop({ pink: true, filter: 'bandpass', freq: 900, q: 0.7, bus: 'amb' });
      };
      S.on('audio-ready', audioOn); audioOn();
      S.onDestroy(() => Object.values(AU).forEach(x => { if (x) x.stop(); }));
      const NF = {}; const nf = (n) => NF[n] || (NF[n] = A.note(n));
      const PROG = [['A2', ['A3', 'C4', 'E4', 'B4']], ['F2', ['F3', 'A3', 'C4', 'E4']], ['C3', ['C4', 'E4', 'G4', 'B4']], ['G2', ['G3', 'B3', 'D4', 'E4']]];
      const MU = { next: 0, beat: 0, bpm: 60, vol: 1, m: 0, on: true };
      S.loop(() => {
        if (!A.ctx || !MU.on) return;
        if (!MU.next || MU.next < A.now() - 0.5) MU.next = A.now() + 0.15;
        while (MU.next < A.now() + 0.25) {
          const tm = MU.next, i = MU.beat, b = i % 4, [bass, ch] = PROG[Math.floor(i / 4) % 4], v = MU.vol;
          if (b === 0) {
            A.tone({ when: tm, type: 'sine', freq: nf(bass), dur: 60 / MU.bpm * 4.4, vol: 0.07 * v, attack: 1.2, lp: 500, bus: 'music' });
            A.pad(ch.map(nf), { when: tm, dur: 60 / MU.bpm * 4.4, vol: 0.055 * v * (1 - N.fog * 0.5), attack: 1.4, lp: 1300, bus: 'music' });
          }
          if (N.chosen && N.sing > 0.5 && N.fog < 0.6) { // the star sings its value's phrase only while the bow is on it
            const mo = N.chosen.v.motif, note = mo[MU.m % mo.length]; MU.m++;
            A.chime(nf(note), { when: tm, vol: 0.06 * v, dur: 2.2, verb: 0.55, bus: 'music' });
            A.chime(nf(note) * 2, { when: tm + 0.02, vol: 0.012 * v, dur: 1.2, verb: 0.6, bus: 'music' });
          } else if (b === 2 && Math.random() < 0.5) A.pluck(nf(ch[Math.floor(Math.random() * ch.length)]) * 2, { when: tm, vol: 0.035 * v, damp: 0.996, verb: 0.5, bus: 'music' });
          if (Math.random() < 0.3) A.noise({ when: tm + Math.random() * 0.5, filter: 'bandpass', freq: 320 + Math.random() * 180, q: 1.3, dur: 0.32, attack: 0.03, vol: 0.045, bus: 'amb' }); // hull slap
          MU.beat++; MU.next += 60 / MU.bpm;
        }
      });
      const chime = (n, vol, when) => { if (A.ctx) A.chime(nf(n), { when, vol: vol || 0.07, dur: 1.8, verb: 0.5 }); };
      const cameSound = () => { if (!A.ctx) return; const t = A.now(); ['E5', 'A5', 'C6'].forEach((n, i) => A.chime(nf(n), { when: t + i * 0.09, vol: 0.06, dur: 1.6, verb: 0.5 })); K.sfx.good(undefined, 6); };
      const foghorn = () => { if (!A.ctx) return; A.tone({ type: 'sawtooth', freq: 98, to: 92, glide: 2.4, dur: 2.6, vol: 0.05, attack: 0.4, lp: 360 }); A.tone({ type: 'sawtooth', freq: 147, to: 140, glide: 2.4, dur: 2.6, vol: 0.025, attack: 0.5, lp: 420 }); };
      function say(o, ms, mood) { drop.say(line(o), { ms: ms || 3600, mood }); }

      /* ---------------- layout and cached layers ---------------- */
      const pal = () => PAL[K.dark() ? 'dark' : 'bright'];
      let BG = null, bgKey = '', SPR = null;
      const FIELD = (() => { const r = K.rng(SKY.id.length * 131 + 7), out = []; for (let i = 0; i < 240; i++) out.push({ b: (r() - 0.5) * Math.PI * 2, el: 0.04 + Math.pow(r(), 0.8) * 1.12, s: r() < 0.1 ? 2 : r() < 0.45 ? 1.4 : 1, tw: r() * 6, sp: 0.8 + r() * 2.4, warm: r() < 0.3 }); return out; })();
      function off(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * cv.dpr)); c.height = Math.max(1, Math.round(hh * cv.dpr)); const g = c.getContext('2d'); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); return { c, g, w, h: hh }; }
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, h: H, phone, cx: w / 2 });
        G.hz = Math.round(H * (phone ? 0.47 : 0.5));
        G.skyTop = phone ? 150 : 150; G.skyH = G.hz - G.skyTop;
        G.pprC = Math.min((w * 0.5 - 50) / 1.05, 400); G.pprS = Math.max(330, w * 0.5);
        G.Hc = 4; G.Dc = 12; G.boatY = Math.round(H * (phone ? 0.655 : 0.665)); G.F = (G.boatY - G.hz) * G.Dc / G.Hc;
        G.offX = -(phone ? 0.27 : 0.2) * w * G.Dc / G.F; G.boatX = G.cx + G.offX * G.F / G.Dc;
        G.boatS = phone ? 1 : 1.3;
        G.wheel = { x: w / 2, y: H - (phone ? 112 : 124), r: phone ? 72 : 86 };
        G.drop = phone ? { x: 12, y: 62, sz: 64 } : { x: 40, y: 76, sz: 88 };
        G.still = phone ? { x: w - 12 - 64, y: 62, sz: 64 } : { x: w - 40 - 88, y: 76, sz: 88 };
        drop.el.style.setProperty('--sz', G.drop.sz + 'px'); if (!N.dropDown) drop.place(G.drop.x, G.drop.y);
        still.el.style.setProperty('--sz', G.still.sz + 'px'); if (!N.stillDown) still.place(G.still.x, G.still.y);
        G.cs = phone ? 150 : 220;
        if (N.ph === 'choose' || N.ph === 'intro') N.ppr = G.pprC;
        else if (N.ph !== 'zoom') N.ppr = G.pprS;
        pad.style.top = (G.hz + 8) + 'px';
        SPR = null; bgKey = ''; paintBG();
      }
      function sprites() {
        if (SPR) return SPR;
        const C = pal();
        SPR = { star: K.glowSprite(rgba(C.star, 0.95)), faint: K.glowSprite(rgba(C.faint, 0.8)), lamp: K.glowSprite(rgba(C.lamp, 0.95)), wake: K.glowSprite(rgba(C.wake, 0.85)), fog: K.glowSprite(rgba(C.fog, 0.9)), harbor: K.glowSprite(rgba(C.harbor, 0.95)), milky: K.glowSprite('rgba(200,210,255,0.5)') };
        return SPR;
      }
      /* Sky and sea gradients, painted taller than the screen so the finale can tilt up into the sky. */
      function paintBG() {
        if (!G.w) return;
        const D = K.dark(), key = G.w + 'x' + G.h + ':' + D + ':' + cv.dpr;
        if (key === bgKey && BG) return;
        bgKey = key;
        const C = pal(), w = G.w, H = G.h, ex = Math.round(H * 0.42), hz = G.hz + ex;
        BG = off(w, H + ex); BG.ex = ex;
        const g = BG.g;
        const sky = g.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, C.top); sky.addColorStop(0.55, C.mid); sky.addColorStop(0.9, C.low); sky.addColorStop(1, C.glow);
        g.fillStyle = sky; g.fillRect(0, 0, w, hz + 1);
        const hg = g.createRadialGradient(w / 2, hz, 10, w / 2, hz, w * 0.9);
        hg.addColorStop(0, rgba(C.glow, D ? 0.35 : 0.45)); hg.addColorStop(1, rgba(C.glow, 0));
        g.fillStyle = hg; g.fillRect(0, hz - w * 0.9, w, w * 0.9);
        const sea = g.createLinearGradient(0, hz, 0, H + ex);
        sea.addColorStop(0, mix(C.seaTop, C.glow, 0.35)); sea.addColorStop(0.08, C.seaTop); sea.addColorStop(1, C.seaBot);
        g.fillStyle = sea; g.fillRect(0, hz, w, H + ex - hz);
        g.fillStyle = rgba(C.glow, 0.55); g.fillRect(0, hz, w, 1.2);
        // swell lines in perspective
        for (let i = 1; i < 26; i++) { const d = 1 / (1 + i * 0.32), y = hz + (H + ex - hz) * (1 - d) * 0.98; g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; g.fillRect(0, y, w, 1 + i * 0.12); }
      }

      /* ---------------- projection ---------------- */
      const skyX = (b) => G.cx + wrap(b - N.view) * N.ppr;
      const skyY = (e) => G.hz + N.camY - e * G.skyH * (1 + N.cam * 0.6);
      function proj(X, Z) { // a point on the sea, seen from the chase camera behind, above and a little to the right of the boat
        const dx = X - N.X, dz = Z - N.Z, c = Math.cos(N.psi), s = Math.sin(N.psi), r = dx * c - dz * s + G.offX, f = dx * s + dz * c, d = G.Dc + f;
        if (d < 0.8) return null;
        return { x: G.cx + r * G.F / d, y: G.hz + N.camY + G.Hc * G.F / d, k: G.F / d };
      }

      /* ---------------- the sky ---------------- */
      let MOON = null;
      function moonSprite(r) { // a lit disc with the phase cut out, so no sky-coloured patch ever shows
        if (MOON && MOON.r === r && MOON.dpr === cv.dpr) return MOON.c;
        const o = off(r * 2 + 4, r * 2 + 4), g = o.g, c = r + 2;
        const mg = g.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#dfe2f6');
        g.fillStyle = mg; g.beginPath(); g.arc(c, c, r, 0, K.TAU); g.fill();
        g.fillStyle = 'rgba(160,170,210,0.25)'; [[0.3, -0.2, 0.22], [-0.25, 0.25, 0.16], [0.05, 0.4, 0.12]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(c + dx * r, c + dy * r, rr * r, 0, K.TAU); g.fill(); });
        if (SKY.moon < 0.95) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(c + r * (0.35 + SKY.moon * 1.2), c - r * 0.12, r * 1.02, 0, K.TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
        MOON = { r, dpr: cv.dpr, c: o.c };
        return o.c;
      }
      function drawSky(g, tt) {
        const C = pal(), w = G.w, vis = (1 - N.fog * 0.97) * N.stars, D = K.dark();
        if (vis <= 0.01) return;
        g.fillStyle = '#ffffff';
        for (const s of FIELD) {
          const x = skyX(s.b); if (x < -4 || x > w + 4) continue;
          const y = skyY(s.el); if (y > G.hz + N.camY - 4) continue;
          const a = vis * (0.35 + 0.45 * (0.5 + 0.5 * Math.sin(tt * s.sp + s.tw))) * (D ? 1 : 0.8);
          g.globalAlpha = a; g.fillStyle = s.warm ? '#ffe9c4' : '#eef2ff'; g.fillRect(x, y, s.s, s.s);
        }
        g.globalAlpha = 1;
        const sp = sprites();
        if (SKY.milky) {
          g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 26; i++) { const b = -Math.PI + i * (Math.PI * 2 / 26), x = skyX(b); if (x < -160 || x > w + 160) continue; const e = 0.5 + 0.38 * Math.sin(b * 0.9 + 0.6), y = skyY(e), s = 120 + (i % 3) * 40; g.globalAlpha = 0.09 * vis; g.drawImage(sp.milky, x - s, y - s * 0.55, s * 2, s * 1.1); }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        if (SKY.aurora) {
          const cols = C.aur; g.globalCompositeOperation = D ? 'lighter' : 'source-over';
          for (let bnd = 0; bnd < 3; bnd++) {
            const base = skyY(0.95 - bnd * 0.12), amp = 14 + bnd * 6, hgt = G.skyH * (0.55 - bnd * 0.1), off0 = N.view * N.ppr * 0.6;
            g.beginPath();
            for (let x = 0; x <= w; x += 16) { const y = base + Math.sin((x + off0) * 0.008 + tt * (0.3 + bnd * 0.08) + bnd * 2) * amp + Math.sin((x + off0) * 0.021 - tt * 0.4) * 6; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
            for (let x = w; x >= 0; x -= 16) g.lineTo(x, base + hgt + Math.sin((x + off0) * 0.006 + tt * 0.25 + bnd) * amp * 0.6);
            g.closePath();
            const ak = D ? 1 : 0.55, ag = g.createLinearGradient(0, base - amp, 0, base + hgt); ag.addColorStop(0, rgba(cols[bnd], 0.32 * vis * ak)); ag.addColorStop(0.45, rgba(cols[bnd], 0.12 * vis * ak)); ag.addColorStop(1, rgba(cols[bnd], 0));
            g.fillStyle = ag; g.fill();
          }
          g.globalCompositeOperation = 'source-over';
        }
        if (SKY.moon) {
          const x = skyX(SKY.moonB), y = skyY(0.97), r = G.phone ? 14 : 20;
          if (x > -60 && x < w + 60) {
            g.globalAlpha = vis * 0.75; g.drawImage(sp.faint, x - r * 4, y - r * 4, r * 8, r * 8); g.globalAlpha = vis;
            g.drawImage(moonSprite(r), x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4);
            g.globalAlpha = 1;
          }
        }
        if (SKY.meteors && N.meteor) {
          const m = N.meteor, k = (tt - m.t0) / 1.1;
          if (k > 1.2) N.meteor = null;
          else { const x = m.x + m.dx * k, y = m.y + m.dy * k, lg = g.createLinearGradient(x - m.dx * 0.25, y - m.dy * 0.25, x, y); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, `rgba(255,250,235,${0.9 * vis * Math.min(1, 1.2 - k)})`); g.strokeStyle = lg; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - m.dx * 0.25, y - m.dy * 0.25); g.lineTo(x, y); g.stroke(); }
        }
        if (SKY.meteors && !N.meteor && Math.random() < FDT * 0.3 && N.ph !== 'finale') N.meteor = { t0: tt, x: Math.random() * w * 0.8, y: G.skyTop * 0.6 + Math.random() * 60, dx: 160 + Math.random() * 120, dy: 70 + Math.random() * 60 };
      }
      function drawValues(g, tt) {
        const C = pal(), sp = sprites(), vis = 1 - N.fog * 0.97;
        for (const s of VS) {
          const chosen = N.chosen === s, e = chosen ? s.el + (N.elT - s.el) * N.lift : s.el;
          s.x = skyX(s.b); s.y = skyY(e);
          if (s.x < -80 || s.x > G.w + 80) continue;
          const sug = N.ph === 'choose' && SUG.includes(s.v.id), tw = 0.75 + 0.25 * Math.sin(tt * 2.1 + s.tw);
          let a = vis * (N.chosen && !chosen ? 0.55 : 1) * tw, r = chosen ? 7 + 2 * N.sing : sug ? 5 : 3.6;
          if (!chosen && N.dim) a *= 1 - N.dim * 0.5;
          if (a <= 0.01) continue;
          g.globalCompositeOperation = 'lighter';
          const gs = chosen ? 60 + 26 * N.sing + 10 * Math.sin(tt * 1.7) : sug ? 34 : 24;
          g.globalAlpha = a * (chosen ? 0.9 : 0.7); g.drawImage(chosen || sug ? sp.star : sp.faint, s.x - gs / 2, s.y - gs / 2, gs, gs);
          if (chosen) { // diffraction spikes
            g.strokeStyle = rgba(C.star, 0.55 * a); g.lineWidth = 1.2; const L = 26 + 14 * N.sing;
            g.beginPath(); g.moveTo(s.x - L, s.y); g.lineTo(s.x + L, s.y); g.moveTo(s.x, s.y - L); g.lineTo(s.x, s.y + L); g.stroke();
          }
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = a;
          g.fillStyle = chosen || sug ? '#fffaf0' : '#f2f5ff'; g.beginPath(); g.arc(s.x, s.y, r * 0.5, 0, K.TAU); g.fill();
          g.globalAlpha = 1;
        }
        // the chosen value's constellation forms around it
        if (N.chosen && N.cons > 0.01) {
          const s = N.chosen, v = s.v, cs = G.cs * (1 + N.cam * 0.5), ox = s.x - v.pts[v.a][0] * cs, oy = s.y - v.pts[v.a][1] * cs, k = N.cons, a = vis;
          const pt = (i) => ({ x: ox + v.pts[i][0] * cs, y: oy + v.pts[i][1] * cs });
          g.strokeStyle = rgba(C.line, 0.55 * a); g.lineWidth = 1.3;
          v.edges.forEach(([i, j], n) => { const lk = Math.max(0, Math.min(1, k * (v.edges.length + 1) - n)); if (lk <= 0) return; const p = pt(i), q = pt(j); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + (q.x - p.x) * lk, p.y + (q.y - p.y) * lk); g.stroke(); });
          g.globalCompositeOperation = 'lighter';
          v.pts.forEach((p0, i) => { if (i === v.a) return; const sk = Math.max(0, Math.min(1, k * (v.pts.length + 1) - i)); if (sk <= 0) return; const p = pt(i); g.globalAlpha = sk * a * (0.75 + 0.25 * Math.sin(tt * 2 + i)); g.drawImage(sp.star, p.x - 11, p.y - 11, 22, 22); g.fillStyle = '#fff8e8'; g.beginPath(); g.arc(p.x, p.y, 1.8, 0, K.TAU); g.fill(); });
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
      }

      /* ---------------- the sea ---------------- */
      function drawSea(g, tt) {
        const C = pal(), sp = sprites(), w = G.w, hz = G.hz + N.camY;
        // starlight glints on the swell, drifting toward you as the boat sails
        if (!N.glints) N.glints = Array.from({ length: 48 }, () => ({ x: Math.random(), d: Math.random(), ph: Math.random() * 6 }));
        g.fillStyle = C.faint;
        for (const q of N.glints) {
          q.d += FDT * N.speed * 0.05; if (q.d > 1) { q.d -= 1; q.x = Math.random(); }
          const y = hz + 4 + (G.h - hz) * q.d * q.d, x = (((q.x * w - N.view * N.ppr * 0.35) % w) + w) % w, tw = 0.5 + 0.5 * Math.sin(tt * 2.6 + q.ph);
          g.globalAlpha = (0.08 + 0.22 * tw) * (1 - N.fog) * (0.4 + q.d * 0.6); g.fillRect(x, y, 2 + q.d * 12, 1 + q.d * 1.2);
        }
        g.globalAlpha = 1;
        // reflections of the bright things in the sky: the chosen star and the moon lay a shimmering path
        const refl = [];
        if (N.chosen && N.fog < 0.8) refl.push({ x: N.chosen.x, a: 0.5 * (1 - N.fog), c: sp.star });
        if (SKY.moon) { const x = skyX(SKY.moonB); if (x > -40 && x < w + 40) refl.push({ x, a: 0.32 * SKY.moon * (1 - N.fog), c: sp.faint }); }
        g.globalCompositeOperation = 'lighter';
        for (const r of refl) {
          for (let i = 0; i < 16; i++) { const k = i / 16, y = hz + 3 + k * k * (G.h - hz) * 0.75, wob = Math.sin(tt * (1.5 + i % 3) + i * 2.1) * (3 + k * 22), ww = 4 + k * 26; g.globalAlpha = r.a * (1 - k) * (0.5 + 0.5 * Math.sin(tt * 2.3 + i)); g.drawImage(r.c, r.x + wob - ww, y - 2, ww * 2, 4 + k * 6); }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // the harbour, below your star
        if (N.harbor > 0.01) {
          const x = skyX(N.course), s = (0.6 + 0.7 * N.harbor) * (G.phone ? 1 : 1.3), a = Math.min(1, N.harbor * 1.6);
          g.globalAlpha = a; g.fillStyle = mix(C.top, '#000000', 0.3);
          g.beginPath(); g.moveTo(x - 70 * s, hz + 1); g.lineTo(x - 64 * s, hz - 5 * s); g.lineTo(x + 30 * s, hz - 5 * s); g.lineTo(x + 34 * s, hz + 1); g.closePath(); g.fill();
          g.fillStyle = '#f2efe6'; g.fillRect(x + 22 * s, hz - 22 * s, 5 * s, 17 * s); g.fillStyle = '#c4473c'; g.fillRect(x + 21 * s, hz - 25 * s, 7 * s, 4 * s);
          const blink = N.greet ? 0.6 + 0.4 * Math.sin(tt * 9) : 0.5 + 0.5 * Math.sin(tt * 2.2);
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = a * blink; g.drawImage(sp.harbor, x + 24.5 * s - 26 * s, hz - 23 * s - 26 * s, 52 * s, 52 * s);
          if (N.greet) { g.globalAlpha = a * 0.22 * (0.6 + 0.4 * Math.sin(tt * 1.6)); const bx = x + 24.5 * s, by = hz - 23 * s, ang = Math.sin(tt * 0.9) * 0.6 + Math.PI; g.fillStyle = rgba(C.harbor, 0.8); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(ang - 0.12) * w, by + Math.sin(ang - 0.12) * w * 0.2); g.lineTo(bx + Math.cos(ang + 0.12) * w, by + Math.sin(ang + 0.12) * w * 0.2); g.closePath(); g.fill(); }
          for (let i = 0; i < 7; i++) { const lx = x + (-60 + i * 12) * s, ly = hz - 3 * s - (i % 2) * 2 * s; g.globalAlpha = a * (0.7 + 0.3 * Math.sin(tt * 1.3 + i)); g.drawImage(sp.harbor, lx - 7 * s, ly - 7 * s, 14 * s, 14 * s); g.globalAlpha = a * 0.35; g.drawImage(sp.harbor, lx - 3 * s, hz + 2, 6 * s, 26 * s * N.harbor); }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        // returning sailors sometimes get company when the fog lifts
        if (N.whale) {
          const k = (performance.now() - N.whale) / 4600;
          if (k > 1) N.whale = 0;
          else {
            const x = skyX(N.course + 0.32), y = hz + 8, s = G.phone ? 1 : 1.3, up = Math.sin(Math.min(1, k * 1.25) * Math.PI);
            g.fillStyle = mix(C.seaBot, C.hull, 0.5); g.globalAlpha = Math.max(0, up);
            g.beginPath(); g.ellipse(x, y + 5 * s, 28 * s, Math.max(1, 8 * s * up), 0, Math.PI, 0); g.fill();
            g.beginPath(); g.moveTo(x + 22 * s, y + 4 * s); g.lineTo(x + 34 * s, y - 4 * s * up); g.lineTo(x + 30 * s, y + 5 * s); g.fill();
            g.globalAlpha = 1;
            if (k > 0.18 && k < 0.42 && Math.random() < 0.6) P.emit('drop', x - 10 * s, y - 2 * s, 2, { angle: -Math.PI / 2, spread: 0.35, speed: [60, 130], colors: [C.faint, rgba(C.wake, 0.9)] });
          }
        }
        // the phosphorescent wake: every drift and every return stays written on the water for a while
        if (wake.length > 1) { // a luminous centre streak and the two arms of a V that open as the water settles
          g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
          const c = Math.cos(N.psi), sn = Math.sin(N.psi);
          for (let arm = -1; arm <= 1; arm++) {
            let prev = null; if (arm) g.setLineDash([7, 6]);
            for (let i = 0; i < wake.length; i++) {
              const p = wake[i], age = N.T - p.t, sp2 = arm * (0.16 + age * 0.3), q = proj(p.X + c * sp2, p.Z - sn * sp2);
              if (!q) { prev = null; continue; }
              if (prev) { const a = Math.max(0, 1 - age / 6.4); g.strokeStyle = rgba(C.wake, (arm ? 0.42 : 0.55) * a); g.lineWidth = arm ? 1.6 : Math.max(1.2, 0.16 * q.k); g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(q.x, q.y); g.stroke(); }
              prev = q;
            }
            g.setLineDash([]);
          }
          const st = proj(N.X, N.Z); if (st) { g.globalAlpha = 0.5; g.drawImage(sp.wake, st.x - 30, st.y - 10, 60, 24); g.globalAlpha = 1; }
          g.globalCompositeOperation = 'source-over';
        }
        for (const m of marks) { // a small floating star left at every return
          const q = proj(m.X, m.Z); if (!q || q.y > G.h + 20) continue;
          const s = Math.max(4, q.k * 0.2), bob = Math.sin(tt * 2 + m.X) * 1.5;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(sp.star, q.x - s * 2, q.y - s * 2 + bob, s * 4, s * 4); g.globalAlpha = 0.35; g.drawImage(sp.star, q.x - s * 0.5, q.y + 2, s, s * 3);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          K.starPath(g, q.x, q.y + bob, s * 0.9, s * 0.38, 4, 0); g.fillStyle = '#fff6dc'; g.fill();
        }
      }
      /* ---------------- the boat, seen from astern ---------------- */
      function drawBoat(g, tt) {
        const C = pal(), sp = sprites(), s = G.boatS, x = G.boatX, y = G.boatY + N.camY + Math.sin(tt * 1.3) * 2.2, side = 1;
        if (y > G.h + 260 * s) return;
        const ba = g.globalAlpha;
        const mastH = (G.boatY - G.hz) * (G.phone ? 1.18 : 1.12);
        g.save(); g.translate(x, y);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = ba * 0.45; g.drawImage(sp.lamp, 22 * s - 6, 4, 12, 40 * s); g.globalAlpha = ba; g.globalCompositeOperation = 'source-over';
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 6 * s, 46 * s, 7 * s, 0, 0, K.TAU); g.fill();
        g.rotate(N.heel + Math.sin(tt * 0.9) * 0.015);
        // sails first (they stand behind the hull from this angle)
        const bill = 0.18 + Math.abs(N.heel) * 1.6 + N.flap * Math.sin(tt * 24) * 0.05;
        const foot = -34 * s, top = foot + (-mastH - foot) * N.sail, boomX = side * 44 * s, mastTop = -mastH; // the sail is hoisted as you set sail
        const sg = g.createLinearGradient(0, top, boomX, foot); sg.addColorStop(0, C.sail); sg.addColorStop(1, C.sail2);
        g.fillStyle = sg; g.beginPath(); g.moveTo(0, top); g.quadraticCurveTo(side * (24 + bill * 90) * s, (top + foot) / 2, boomX, foot); g.lineTo(2 * side, foot); g.closePath(); g.fill();
        if (N.sail > 0.3) g.strokeStyle = 'rgba(255,255,255,0.35)'; else g.strokeStyle = 'rgba(0,0,0,0)';
        g.lineWidth = 1; g.beginPath(); g.moveTo(0, top + 20); g.quadraticCurveTo(side * (18 + bill * 70) * s, (top + foot) / 2, boomX * 0.9, foot - 6); g.stroke();
        if (N.sail > 0.05) { g.fillStyle = mix(C.sail2, C.hull, 0.35); g.beginPath(); g.moveTo(-1, top * 0.86); g.quadraticCurveTo(-side * (12 + bill * 30) * s, top * 0.45, -side * 22 * s, foot + 2); g.lineTo(-1, foot); g.closePath(); g.fill(); }
        g.strokeStyle = C.trim; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(0, foot + 2); g.lineTo(0, mastTop - 6); g.stroke();
        if (N.sail < 0.98) { g.fillStyle = C.sail2; g.fillRect(0, foot - 5 * s, boomX * 0.92, 5 * s * (1 - N.sail) + 1); }
        g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(0, foot); g.lineTo(boomX, foot + 1); g.stroke();
        // hull from astern
        g.fillStyle = C.hull; g.beginPath(); g.moveTo(-36 * s, -28 * s); g.lineTo(36 * s, -28 * s); g.quadraticCurveTo(33 * s, 4 * s, 0, 9 * s); g.quadraticCurveTo(-33 * s, 4 * s, -36 * s, -28 * s); g.closePath(); g.fill();
        g.fillStyle = C.trim; g.fillRect(-37 * s, -31 * s, 74 * s, 4.5 * s);
        g.fillStyle = 'rgba(255,240,210,0.22)'; g.fillRect(-30 * s, -18 * s, 60 * s, 1.5);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = ba * 0.95; g.drawImage(sp.lamp, 24 * s - 16 * s, -40 * s - 16 * s, 32 * s, 32 * s); g.globalAlpha = ba; g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#fff1c8'; g.beginPath(); g.arc(24 * s, -40 * s, 2.6 * s, 0, K.TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-40 * s, 2 * s); g.quadraticCurveTo(-48 * s, 5 * s, -56 * s, 4 * s); g.moveTo(40 * s, 2 * s); g.quadraticCurveTo(48 * s, 5 * s, 56 * s, 4 * s); g.stroke();
        g.restore();
        N.mastTopY = y + mastTop;
      }
      /* ---------------- gusts and fog ---------------- */
      function drawGust(g, tt) {
        const gu = N.gust; if (!gu) return;
        const C = pal(), x = gu.x, y = gu.y, s = G.phone ? 1 : 1.25, a = gu.a;
        const cw = Math.max(gu.lw * 0.5 + 34, 96) * s;
        g.globalAlpha = a;
        for (let pass = 0; pass < 2; pass++) {
          g.fillStyle = pass ? (K.dark() ? 'rgba(26,24,58,0.96)' : 'rgba(52,46,104,0.94)') : rgba(C.faint, 0.16);
          for (let i = 0; i < 8; i++) { const k = i / 7 - 0.5, lx = x + k * cw * 1.6, ly = y - Math.cos(k * Math.PI) * 10 * s + Math.sin(i * 1.7 + tt * 1.4) * 3 - (pass ? 0 : 3), rx = (30 + (i % 3) * 9) * s, ry = (20 + (i % 2) * 7) * s * (1 - Math.abs(k) * 0.5); g.beginPath(); g.ellipse(lx, ly, rx, ry, 0, 0, K.TAU); g.fill(); }
        }
        g.strokeStyle = rgba(C.faint, 0.25 * a); g.lineWidth = 1.5; g.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const yy = y - 18 + i * 12, len = 40 + i * 14, x0 = x - gu.dir * (90 + ((tt * 140 + i * 37) % 60)) * s; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 - gu.dir * len, yy + 2); g.stroke(); }
        g.globalAlpha = 1;
      }
      const FOGB = Array.from({ length: 9 }, (_, i) => ({ x: (i * 0.137 + 0.05) % 1, y: 0.12 + (i % 5) * 0.16, s: 0.55 + (i % 3) * 0.25, v: 0.006 + (i % 4) * 0.004 }));
      function drawFog(g, tt) {
        if (N.fog <= 0.01) return;
        const C = pal(), sp = sprites(), w = G.w, H = G.h;
        g.fillStyle = rgba(C.fog, N.fog * (K.dark() ? 0.42 : 0.5)); g.fillRect(0, 0, w, H);
        g.globalAlpha = N.fog * 0.8;
        for (const b of FOGB) { const x = (((b.x + tt * b.v) % 1.3) - 0.15) * w, y = b.y * H, s = b.s * Math.max(w, 420); g.drawImage(sp.fog, x - s, y - s * 0.4, s * 2, s * 0.8); }
        g.globalAlpha = 1;
      }
      /* ---------------- the wheel, with the compass in its hub ---------------- */
      function drawWheel(g, tt) {
        const C = pal(), W0 = G.wheel, a = 1 - N.cam; if (a <= 0.02) return;
        const x = W0.x, y = W0.y + N.cam * 120, R = W0.r, rot = N.wheel;
        g.globalAlpha = a;
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(x, y + R * 1.05, R * 1.1, R * 0.22, 0, 0, K.TAU); g.fill();
        g.save(); g.translate(x, y); g.rotate(rot);
        g.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const an = i * Math.PI / 4;
          g.strokeStyle = '#5b3b22'; g.lineWidth = 7; g.beginPath(); g.moveTo(Math.cos(an) * R * 0.42, Math.sin(an) * R * 0.42); g.lineTo(Math.cos(an) * R * 1.2, Math.sin(an) * R * 1.2); g.stroke();
          g.strokeStyle = '#a8784a'; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.cos(an) * R * 0.42, Math.sin(an) * R * 0.42); g.lineTo(Math.cos(an) * R * 1.18, Math.sin(an) * R * 1.18); g.stroke();
          g.fillStyle = i === 0 ? '#e8b44f' : '#8a5a33'; g.beginPath(); g.arc(Math.cos(an) * R * 1.24, Math.sin(an) * R * 1.24, i === 0 ? 7.5 : 6.5, 0, K.TAU); g.fill();
        }
        g.strokeStyle = '#4a2f1b'; g.lineWidth = 13; g.beginPath(); g.arc(0, 0, R, 0, K.TAU); g.stroke();
        g.strokeStyle = '#b07c48'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, R, 0, K.TAU); g.stroke();
        g.strokeStyle = 'rgba(255,230,190,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R - 2, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
        g.restore();
        // compass: fixed in the hub; the card turns with the boat, the gold star marks your course
        const rc = R * 0.4, fogGlow = N.fog;
        if (fogGlow > 0.05) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * fogGlow * (0.6 + 0.3 * Math.sin(tt * 2.4)); g.drawImage(sprites().star, x - rc * 2.6, y - rc * 2.6, rc * 5.2, rc * 5.2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; }
        g.fillStyle = '#c99a4a'; g.beginPath(); g.arc(x, y, rc + 5, 0, K.TAU); g.fill();
        g.fillStyle = '#0d1230'; g.beginPath(); g.arc(x, y, rc, 0, K.TAU); g.fill();
        g.save(); g.translate(x, y); g.rotate(-N.psi);
        g.strokeStyle = 'rgba(230,236,255,0.55)'; g.lineWidth = 1;
        for (let i = 0; i < 24; i++) { const an = i * Math.PI / 12, r0 = i % 6 === 0 ? rc - 9 : rc - 5; g.beginPath(); g.moveTo(Math.sin(an) * r0, -Math.cos(an) * r0); g.lineTo(Math.sin(an) * (rc - 2), -Math.cos(an) * (rc - 2)); g.stroke(); }
        g.fillStyle = '#e9edff'; g.font = '700 12px ' + 'Cinzel, "Palatino Linotype", Lora, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        if (rc > 26) [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]].forEach(([l, an]) => { g.save(); g.rotate(an); g.fillText(l, 0, -rc + 15); g.restore(); });
        if (N.chosen) { g.save(); g.rotate(N.course); K.starPath(g, 0, -rc + 9, 7, 3, 5, 0); g.fillStyle = '#ffd27a'; g.fill(); g.restore(); }
        g.restore();
        g.fillStyle = '#ffd27a'; g.beginPath(); g.moveTo(x, y - rc - 9); g.lineTo(x - 5, y - rc - 1); g.lineTo(x + 5, y - rc - 1); g.closePath(); g.fill(); // lubber mark: where the bow points
        g.fillStyle = '#c99a4a'; g.beginPath(); g.arc(x, y, 4, 0, K.TAU); g.fill();
        g.globalAlpha = 1;
      }
      /* ---------------- finale: the route rises into the sky ---------------- */
      function drawRoute(g, tt) {
        if (!N.chosen || N.routeK <= 0 || route.length < 2) return;
        const C = pal(), sp = sprites(), s = N.chosen, c = N.course, ux = Math.sin(c), uz = Math.cos(c), p0 = route[0];
        let L = 1, M = 0.001;
        for (const p of route) { const al = (p.X - p0.X) * ux + (p.Z - p0.Z) * uz, la = (p.X - p0.X) * uz - (p.Z - p0.Z) * ux; L = Math.max(L, al); M = Math.max(M, Math.abs(la)); }
        const x0 = G.cx, y0 = G.hz + N.camY - 10, x1 = s.x, y1 = s.y + 10, lat = Math.min(G.w * 0.16, 90) / M;
        const pts = route.map(p => { const al = (p.X - p0.X) * ux + (p.Z - p0.Z) * uz, la = (p.X - p0.X) * uz - (p.Z - p0.Z) * ux, k = al / L; return { x: x0 + (x1 - x0) * k + la * lat * Math.sin(k * Math.PI), y: y0 + (y1 - y0) * k, ret: p.ret }; });
        const n = Math.max(2, Math.floor(pts.length * N.routeK));
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const [wd, al] of [[8, 0.12], [2.2, 0.75]]) { g.strokeStyle = rgba(C.line, al); g.lineWidth = wd; g.beginPath(); for (let i = 0; i < n; i++) { if (i) g.lineTo(pts[i].x, pts[i].y); else g.moveTo(pts[i].x, pts[i].y); } g.stroke(); }
        for (let i = 0; i < n; i++) if (pts[i].ret) { g.globalAlpha = 0.9; g.drawImage(sp.star, pts[i].x - 13, pts[i].y - 13, 26, 26); g.globalAlpha = 1; }
        const tip = pts[n - 1]; g.drawImage(sp.star, tip.x - 9, tip.y - 9, 18, 18);
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < n; i++) if (pts[i].ret) { K.starPath(g, pts[i].x, pts[i].y, 4.5, 1.8, 4, 0); g.fillStyle = '#fffaf0'; g.fill(); }
        N.routeTip = tip;
      }

      /* ---------------- words ---------------- */
      const V = () => (N.chosen ? N.chosen.v.name : 'your star');
      const L = {
        choose: { Jolly: 'Pick a star to sail by. Not a goal, a direction. Which one matters to you tonight?', Cheeky: 'Every star up there is a value. Pick one. They’re all very good stars.', Unfiltered: 'Each star is a value. Pick the one you want to steer by.' },
        steer: { Jolly: 'Turn the wheel to bring the bow under it. She turns slowly, so ease off as you come round.', Cheeky: 'Boats don’t do sudden. Turn, then ease off before you overshoot.', Unfiltered: 'Turn the wheel. Ease off as the bow comes round.' },
        on: { Jolly: 'That’s your heading. A direction, not a destination.', Cheeky: 'Look at you, navigating. A direction, not a destination.', Unfiltered: 'On course. It’s a direction, not a finish line.' },
        gust: { Jolly: 'Here come the gusts. They’ll push you off. That’s fine. Just come back.', Cheeky: 'Your thoughts have opinions about the route. Let them blow. Come back.', Unfiltered: 'Thoughts will push you off. Expected. Steer back.' },
        back: { Jolly: 'You came back. That’s the whole skill.', Cheeky: 'Drifted, came back. That’s literally all of it.', Unfiltered: 'You came back. That’s the skill.' },
        fog: { Jolly: 'Fog. You can’t see it, but it hasn’t gone anywhere. Steer by the compass.', Cheeky: 'Can’t see your star? Neither can I. It’s still there. Use the compass.', Unfiltered: 'You can’t see it. It’s still there. Steer by the compass.' },
        lift: { Jolly: 'See? Right where you left it.', Cheeky: 'Told you. Stars don’t wander off.', Unfiltered: 'Still there.' },
        harbor: { Jolly: 'There’s the harbour, right under your star.', Cheeky: 'Harbour ahoy. Your star was pointing at it the whole time.', Unfiltered: 'Harbour. Straight ahead.' },
        picked: { Jolly: 'Logged. One small step, pointed the right way.', Cheeky: 'In the ship’s log. Very official.', Unfiltered: 'Logged.' },
        greet: { Jolly: 'Welcome in, sailor.', Cheeky: 'Ahoy. You took the scenic route. Worth it.', Unfiltered: 'Welcome back.' }
      };
      const finalLine = () => {
        const n = N.returns, v = V();
        if (care) return n ? `You sailed by ${v} and came back ${n} ${n === 1 ? 'time' : 'times'}. For the bigger stuff, a real person can help too.` : `You held ${v} the whole way. For the bigger stuff, a real person can help too.`;
        if (!n) return line({ Jolly: `You held ${v} the whole way. Your route is up there now.`, Cheeky: `Not one drift. Show-off. Your route’s in the stars now.`, Unfiltered: `You held ${v} the whole way.` });
        return line({ Jolly: `You sailed by ${v} and came back ${n} ${n === 1 ? 'time' : 'times'}. Every return is drawn up there.`, Cheeky: `${n} ${n === 1 ? 'drift' : 'drifts'}, ${n} ${n === 1 ? 'return' : 'returns'}. Your route’s in the stars now.`, Unfiltered: `You drifted and came back ${n} ${n === 1 ? 'time' : 'times'}. That’s the route.` });
      };

      /* ---------------- guide (every step) ---------------- */
      let gSpec = null, kbT = 0;
      function setGuide(spec) { gSpec = spec; if (!spec) { K.guide(null); return; } if (!touching) K.guide(spec); }
      function rearmGuide() { if (gSpec && !touching && !finished) K.guide(Object.assign({}, gSpec, { delay: 4000 })); }
      const rimPt = () => ({ x: G.wheel.x, y: G.wheel.y - G.wheel.r * 1.24 });
      const gWheel = (label, id) => { const e = wrap(N.psi - N.course), d = e > 0 ? -1 : 1; return { id, g: 'drag', target: rimPt, dx: d * (G.phone ? 70 : 90), dy: 18, label, place: 'above', ms: 1800 }; };

      /* ---------------- input: turn the wheel (drag around it), or arrow keys ---------------- */
      const DR = { on: false, last: 0, acc: 0 };
      const angAt = (p) => Math.atan2(p.y + (G.hz + 8) - G.wheel.y, p.x - G.wheel.x);
      const steerable = () => ['steer', 'gusts', 'fog'].includes(N.ph);
      K.drag(pad, {
        start: (p) => {
          if (finished || !steerable()) return false;
          DR.on = true; touching = true; DR.last = angAt(p); K.guide(null); pad.classList.add('ns-grab');
          K.sfx.tap(); if (A.ctx) A.wood(undefined, 0.07, 0.42);
        },
        move: (p) => {
          if (!DR.on) return;
          const a = angAt(p), d = wrap(a - DR.last); DR.last = a;
          if (Math.hypot(p.x - G.wheel.x, p.y + G.hz + 8 - G.wheel.y) < 20) return;
          N.wheel = K.clamp(N.wheel + d, -2.8, 2.8);
          DR.acc += Math.abs(d);
          if (DR.acc > 0.3) { DR.acc = 0; if (A.ctx) { A.wood(undefined, 0.045, 0.5 + Math.random() * 0.1); A.click({ vol: 0.03 }); } }
          pad.setAttribute('aria-valuenow', String(Math.round(N.wheel / 2.8 * 100)));
        },
        end: () => { DR.on = false; touching = false; pad.classList.remove('ns-grab'); rearmGuide(); }
      });
      K.onKey(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'], (e) => {
        if (finished || !steerable()) return;
        e.preventDefault(); A.unlock(); K.guide(null);
        const dir = (e.code === 'ArrowLeft' || e.code === 'KeyA') ? -1 : 1;
        N.wheel = K.clamp(N.wheel + dir * (e.repeat ? 0.12 : 0.32), -2.8, 2.8); N.keyHold = performance.now() + 450;
        if (A.ctx && !e.repeat) A.wood(undefined, 0.05, 0.5);
        S.cancel(kbT); kbT = S.later(rearmGuide, 4000);
      });

      /* ---------------- the voyage ---------------- */
      function choose(s) {
        if (N.ph !== 'choose' || N.chosen) return;
        N.chosen = s; N.course = s.b; N.ph = 'chosen';
        K.guide(null); gSpec = null;
        VS.forEach(o => { if (o !== s) o.btn.classList.add('ns-dim'); });
        if (A.ctx) { const t = A.now(); s.v.motif.forEach((n, i) => A.chime(nf(n), { when: t + i * 0.16, vol: 0.06, dur: 1.8, verb: 0.55 })); }
        K.sfx.sparkle();
        P.emit('star', s.x, s.y, 18, { colors: ['#fff3c8', '#ffd27a', '#ffffff'], speed: [40, 160] });
        drop.say(line({ Jolly: `${s.v.name}. A good star to sail by.`, Cheeky: `${s.v.name}. Excellent taste in stars.`, Unfiltered: `${s.v.name}. Steer by that.` }), { ms: 3000, mood: 'love' });
        nameEl.textContent = s.v.name;
        ctx.track('value', { v: s.v.id });
        K.anim(1700, (k) => { N.cons = k; }).then(() => S.later(setSail, 500));
      }
      async function setSail() {
        N.ph = 'zoom';
        VS.forEach(o => { o.btn.hidden = true; });
        const p0 = G.pprC, v0 = N.view, psi0 = N.course + 0.42;
        N.psi = psi0;
        if (A.ctx) { A.whoosh({ from: 300, to: 1200, dur: 1.6, vol: 0.06 }); A.noise({ pink: true, filter: 'lowpass', freq: 400, to: 900, dur: 2.2, attack: 1, vol: 0.05, bus: 'amb' }); }
        if (A.ctx) { A.noise({ filter: 'bandpass', freq: 1400, to: 2400, q: 0.8, dur: 1.4, attack: 0.5, vol: 0.05 }); [0, 0.25, 0.5, 0.75].forEach(d => A.wood(A.now() + d, 0.05, 0.7 + d * 0.4)); } // halyard and winch
        await K.anim(1900, (k) => { const e = ios(k); N.ppr = p0 + (G.pprS - p0) * e; N.view = v0 + wrap(psi0 - v0) * e; N.lift = e; N.speed = 1.6 * e; N.sail = Math.min(1, k * 1.4); });
        N.sail = 1;
        N.ppr = G.pprS; N.speed = 1.6; N.boat = 1; N.lift = 1; N.view = N.psi;
        nameEl.classList.add('ns-on');
        N.ph = 'steer'; N.pt = 0;
        say(L.steer, 4600, 'happy');
        setGuide(gWheel('TURN TOWARD YOUR STAR', 'steer'));
      }
      function spawnGust(label, dir, hidden) {
        let lab = null;
        if (!hidden) { lab = h('div', { class: 'ns-gust gk-user', text: label, 'aria-hidden': 'true' }); el.append(lab); }
        N.gust = { dir, t: 0, x: dir > 0 ? -170 : G.w + 170, from: dir > 0 ? -170 : G.w + 170, to: dir > 0 ? G.w + 190 : -190, a: 0, push: 0, lab, hidden, pushed: false, lw: lab ? lab.offsetWidth : 0, lh: lab ? lab.offsetHeight : 0 };
        if (AU.wind) { AU.wind.level(0.05, 1.2); AU.wind.freq(700, 1.2); }
      }
      function stepGust(dt) {
        const gu = N.gust; if (!gu) return;
        gu.t += dt;
        const tA = 2.4, tP = 1.8, tX = 1.6, mid = G.cx;
        gu.y = skyY(0.3);
        if (gu.t < tA) { const k = ios(gu.t / tA); gu.x = gu.from + (mid - gu.dir * 40 - gu.from) * k; gu.a = Math.min(1, gu.t * 1.4); gu.push = 0; }
        else if (gu.t < tA + tP) {
          const k = (gu.t - tA) / tP; gu.x = mid - gu.dir * 40 + gu.dir * 80 * k; gu.push = Math.sin(Math.PI * k); gu.a = 1;
          if (!gu.pushed) {
            gu.pushed = true; N.flap = 1;
            if (A.ctx) { A.whoosh({ from: 500, to: 2400, dur: 1.2, vol: 0.12 }); for (let i = 0; i < 5; i++) A.noise({ when: A.now() + 0.1 + i * 0.12, filter: 'highpass', freq: 1800, dur: 0.07, vol: 0.05 }); }
            K.sfx.whoosh(); drop.face('worried', 1400);
            if (AU.wind) { AU.wind.level(0.11, 0.3); AU.wind.freq(1300, 0.4); }
          }
        } else if (gu.t < tA + tP + tX) { const k = (gu.t - tA - tP) / tX; gu.x = mid + gu.dir * 40 + (gu.to - mid - gu.dir * 40) * k * k; gu.a = 1 - k; gu.push = 0; if (AU.wind) AU.wind.level(0.02, 0.6); }
        else { if (gu.lab) gu.lab.remove(); N.gust = null; if (AU.wind) AU.wind.level(0.0001, 1); return; }
        if (gu.lab) {
          const room = Math.min(gu.x - gu.lw / 2 - 10, G.w - 10 - gu.x - gu.lw / 2), vis = K.clamp(room / 36, 0, 1), op = gu.a * vis;
          gu.lab.style.cssText = `transform: translate(${(gu.x - gu.lw / 2).toFixed(1)}px, ${(gu.y - gu.lh / 2).toFixed(1)}px); opacity: ${op < 0.03 ? 0 : op.toFixed(2)};`;
        }
      }
      function cameBack() {
        N.returns++;
        cameSound();
        marks.push({ X: N.X, Z: N.Z }); if (marks.length > 12) marks.shift();
        route.push({ X: N.X, Z: N.Z, ret: true });
        const s = N.chosen;
        const pop = h('div', { class: 'ns-pop', text: 'you came back', 'aria-hidden': 'true' });
        pop.style.left = K.clamp(s.x, 80, G.w - 80) + 'px'; pop.style.top = (s.y + 44) + 'px';
        el.append(pop); S.later(() => pop.remove(), 1950);
        P.emit('star', s.x, s.y, 12, { colors: ['#fff3c8', '#ffd27a'], speed: [30, 120] });
        drop.face('love', 1600);
        if (N.returns === 1) say(L.back, 3000, 'love');
        ctx.track('return', { n: N.returns, fog: N.fog > 0.5 ? 1 : 0 });
      }
      /* once a frame: steering physics run in small steps, the story runs here */
      function stepVoyage(dt) {
        const sailing = ['steer', 'gusts', 'fog', 'harbor', 'action', 'finale'].includes(N.ph);
        if (!sailing) return;
        N.pt = (N.pt || 0) + dt;
        const e = wrap(N.psi - N.course), ae = Math.abs(e), helm = ['steer', 'gusts', 'fog'].includes(N.ph);
        N.on = ae < T.on;
        if (helm) { N.sailT += dt; if (N.on) N.onT += dt; N.maxOff = Math.max(N.maxOff, ae); }
        N.sing += ((N.on && N.firstOn ? 1 : 0) - N.sing) * Math.min(1, dt * 2.5);
        if (helm && N.firstOn) { if (ae > T.on * 2.2) N.drifted = true; if (N.drifted && ae < T.on) { N.drifted = false; cameBack(); } }
        if (N.ph === 'steer') {
          N.onRun = N.on ? (N.onRun || 0) + dt : 0;
          if (!N.firstOn && N.onRun > 0.7) { N.firstOn = true; say(L.on, 3600, 'happy'); setGuide(null); N.gustAt = N.pt + 2.8; K.sfx.great(); }
          if (N.firstOn && N.pt > N.gustAt) { N.ph = 'gusts'; N.pt = 0; N.next = 0.2; say(L.gust, 4200, 'think'); }
          if (!N.firstOn && N.pt > 18) { N.firstOn = true; N.gustAt = N.pt + 1.5; } // nobody steering: the voyage goes on anyway
        } else if (N.ph === 'gusts') {
          if (!N.gust && N.gustN < GUSTS.length && N.pt > N.next) { spawnGust(GUSTS[N.gustN], N.gustN % 2 ? -1 : 1, false); N.gustN++; N.next = N.pt + 6.2; }
          if (N.gust && N.gust.pushed && !N.gust.guided && N.gust.t > 4.6 && !N.on && !touching) { N.gust.guided = true; setGuide(gWheel('COME BACK TO YOUR STAR', 'back' + N.gustN)); }
          if (!N.gust && N.gustN >= GUSTS.length && N.pt > N.next - 2.5) startFog();
        } else if (N.ph === 'fog') {
          N.fogT += dt;
          if (N.fogT > 2.4 && N.fogG < T.fogGusts && !N.gust && N.fogT > N.fogNext) { spawnGust('', N.fogG % 2 ? 1 : -1, true); N.fogG++; N.fogNext = N.fogT + 5.2; }
          if (N.fogT > T.fogT && N.fogTarget > 0 && !N.gust) liftFog();
          if (N.fogTarget === 0 && N.fog < 0.08) { N.ph = 'harbor'; N.pt = 0; say(L.harbor, 3400, 'happy'); setGuide(null); if (A.ctx) [0, 1.6, 3.2].forEach(d => chime('A3', 0.05, A.now() + d)); }
        } else if (N.ph === 'harbor') {
          N.harbor = Math.min(1, N.harbor + dt / 4);
          if (N.harbor >= 1 && !N.actsShown) showActs();
        }
        N.fog += (N.fogTarget - N.fog) * Math.min(1, dt * (N.fogTarget ? 0.6 : 0.5));
        if (N.ph === 'action' || N.ph === 'finale') N.harbor = 1;
        // the wake and the route
        N.wakeT = (N.wakeT || 0) + dt;
        if (N.wakeT > 0.08 && N.speed > 0.1) { N.wakeT = 0; wake.push({ X: N.X, Z: N.Z, t: N.T }); while (wake.length && N.T - wake[0].t > 6.6) wake.shift(); }
        N.routeT = (N.routeT || 0) + dt;
        if (helm && N.firstOn && N.routeT > 0.25) { N.routeT = 0; route.push({ X: N.X, Z: N.Z, ret: false }); }
        N.flap = Math.max(0, N.flap - dt * 1.4);
      }
      function stepHelm(dt) { // the boat: the wheel is a rudder, so the bow swings with weight
        if (!['zoom', 'steer', 'gusts', 'fog', 'harbor', 'action', 'finale'].includes(N.ph)) return;
        const auto = ['harbor', 'action', 'finale'].includes(N.ph);
        if ((!touching && performance.now() > (N.keyHold || 0)) || auto) N.wheel *= Math.exp(-dt * (auto ? 3 : 1.3));
        const e = wrap(N.psi - N.course);
        let target = K.clamp(N.wheel / 2.4, -1, 1) * 0.55 - e * T.assist;
        if (auto) target = -e * 1.2;
        if (N.ph === 'zoom') target = 0;
        N.rate += (target - N.rate) * Math.min(1, dt * 1.8);
        const gu = N.gust, gustRate = gu && gu.push > 0 ? gu.dir * T.push * gu.push : 0;
        N.psi = wrap(N.psi + (N.rate + gustRate) * dt);
        N.X += Math.sin(N.psi) * N.speed * dt; N.Z += Math.cos(N.psi) * N.speed * dt;
        N.heel += ((gu ? gu.dir * 0.14 * gu.push : 0) + N.rate * 0.14 - N.heel) * Math.min(1, dt * 3);
        if (N.ph !== 'zoom') N.view = N.psi;
      }
      function startFog() {
        N.ph = 'fog'; N.pt = 0; N.fogT = 0; N.fogG = 0; N.fogNext = 3; N.fogTarget = 1;
        foghorn(); S.later(foghorn, 5200);
        nameEl.classList.remove('ns-on');
        drop.hush(); drop.el.classList.add('ns-away');
        still.el.classList.remove('ns-away'); still.base('calm');
        S.later(() => still.say(line(L.fog), { ms: 4600 }), 900);
        setGuide(gWheel('STEER BY THE COMPASS', 'fog'));
        MU.vol = 0.75;
        ctx.track('fog', {});
      }
      function liftFog() {
        N.fogTarget = 0; MU.vol = 1;
        if (A.ctx) { const t = A.now(); ['A4', 'C5', 'E5', 'A5', 'C6'].forEach((n, i) => A.chime(nf(n), { when: t + 0.4 + i * 0.14, vol: 0.05, dur: 2, verb: 0.6 })); }
        S.later(() => { nameEl.classList.add('ns-on'); still.say(line(L.lift), { ms: 2600, mood: 'happy' }); }, 1400);
        if (visits >= 2) S.later(() => { N.whale = performance.now(); if (A.ctx) { A.tone({ type: 'sine', freq: 230, to: 150, glide: 1.7, dur: 1.9, vol: 0.035, attack: 0.35, verb: 0.65 }); A.noise({ when: A.now() + 1, filter: 'bandpass', freq: 900, q: 0.6, dur: 0.8, attack: 0.05, vol: 0.05 }); } }, 2000);
        S.later(() => { still.el.classList.add('ns-away'); drop.el.classList.remove('ns-away'); }, 4200);
        setGuide(null);
      }
      function showActs() {
        N.actsShown = true; N.ph = 'action';
        const v = N.chosen.v, opts = [];
        const ts = an.tinyStep && String(an.tinyStep).trim();
        if (ts) opts.push(ts);
        v.steps.forEach(s => { if (opts.length < 3 && !opts.includes(s)) opts.push(s); });
        if (care) opts[2] = 'Ask someone qualified one question';
        const chips = K.chips(acts, opts.map((t, i) => ({ id: String(i), label: t })), (item) => pick(item.label), { label: 'Small steps' });
        N.chipEls = Array.from(chips.querySelectorAll('button'));
        acts.classList.add('ns-on');
        actsTitle.style.bottom = (acts.offsetHeight + 22 + 104) + 'px'; actsTitle.classList.add('ns-on');
        S.later(() => { if (N.ph !== 'action') return; const r = K.rectIn(N.chipEls[0], el), pt = { x: r.cx, y: r.y - 4 }; setGuide({ id: 'acts', g: 'choose', target: () => pt, label: 'PICK ONE SMALL STEP', place: 'above' }); }, 700);
        N.actsAt = performance.now();
        S.later(() => { if (N.ph === 'action' && !N.picked) pick(''); }, 30000);
      }
      function pick(label) {
        if (N.ph !== 'action') return;
        N.picked = label; N.ph = 'finale';
        setGuide(null);
        if (label) { if (A.ctx) A.paper({ vol: 0.1 }); K.sfx.ok(); say(L.picked, 2400, 'happy'); }
        S.later(() => { acts.classList.remove('ns-on'); actsTitle.classList.remove('ns-on'); }, 900);
        S.later(finale, 1300);
      }

      /* ---------------- frame loop ---------------- */
      let lastT = 0, qAcc = 0, qN = 0, qLvl = 1;
      K.loop((dtIn, tNow) => {
        const g = cv.g; if (!g || !G.w || !BG) return;
        const raw = lastT ? tNow - lastT : dtIn; lastT = tNow;
        const dt = Math.max(0, Math.min(1, raw)); FDT = dt;
        if (raw < 0.5) { qAcc += raw; qN++; if (qN >= 120) { if (qAcc / qN > 0.03 && qLvl > 0.67) { qLvl = qLvl > 0.9 ? 0.8 : 0.67; cv.setQuality(qLvl); } qAcc = 0; qN = 0; } }
        N.T += dt; const tt = N.T;
        for (let rem = dt; rem > 1e-4; rem -= 1 / 40) stepHelm(Math.min(rem, 1 / 40));
        stepVoyage(dt); stepGust(dt);
        g.drawImage(BG.c, 0, -BG.ex + N.camY, G.w, G.h + BG.ex);
        drawSky(g, tt); drawValues(g, tt); drawRoute(g, tt); drawGust(g, tt); drawSea(g, tt);
        drawFog(g, tt);
        if (N.boat > 0.01) { g.globalAlpha = Math.min(1, N.boat) * (1 - N.cam * 0.9); drawBoat(g, tt); g.globalAlpha = 1; }
        if (N.speed > 0.4 && Math.random() < 0.5 && N.camY < 40) { const s = G.boatS, side = Math.random() < 0.5 ? -1 : 1; P.emit('drop', G.boatX + side * 40 * s, G.boatY + 2, 1, { angle: -Math.PI / 2 + side * 0.9, spread: 0.6, speed: [20, 60], colors: [rgba(pal().wake, 0.8)] }); }
        P.update(dt); P.draw(g);
        if (N.ph !== 'intro' && N.ph !== 'choose' && N.ph !== 'chosen') drawWheel(g, tt);
        if (N.flash > 0) { N.flash = Math.max(0, N.flash - dt * 0.9); g.fillStyle = rgba(pal().star, N.flash * 0.5); g.fillRect(0, 0, G.w, G.h); }
        // DOM that follows the sky
        if (N.ph === 'choose' || N.ph === 'chosen') VS.forEach(s => { if (!s.btn.hidden) s.btn.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`; });
        if (N.chosen && nameEl.classList.contains('ns-on')) { const s = N.chosen, nw = N.nameW || (N.nameW = nameEl.offsetWidth || 100); nameEl.style.transform = `translate(${K.clamp(s.x - nw / 2, 10, G.w - nw - 10).toFixed(1)}px, ${(s.y - 46).toFixed(1)}px)`; }
      });

      /* ---------------- finale: the harbour light greets you, the route rises into the constellation ---------------- */
      async function finale() {
        N.greet = true; nameEl.classList.remove('ns-on');
        if (A.ctx) { const t = A.now(); A.tone({ when: t, type: 'sawtooth', freq: 147, dur: 2.2, vol: 0.035, attack: 0.3, lp: 600 }); A.tone({ when: t, type: 'sawtooth', freq: 220, dur: 2.2, vol: 0.028, attack: 0.3, lp: 700 }); chime('E4', 0.06, t + 0.4); }
        N.stillDown = true; still.el.classList.remove('ns-away'); still.side('left'); still.place(G.w - 12 - G.still.sz, G.h - 16 - G.still.sz - (G.phone ? 22 : 30), 900); still.base('happy');
        S.later(() => still.say(line(L.greet), { ms: 2600 }), 600);
        await S.sleep(1200);
        if (A.ctx) A.whoosh({ from: 300, to: 900, dur: 2.4, vol: 0.05 });
        await K.anim(2600, (k) => { N.cam = ios(k); N.camY = N.cam * G.h * 0.36; });
        still.hush();
        drop.say(finalLine(), { ms: 3300, mood: 'love' }); // from up in the sky, while the route draws itself
        let rung = 0;
        const rets = route.filter(p => p.ret).length;
        await K.anim(3400, (k) => {
          N.routeK = k;
          const reached = Math.floor(k * (rets + 1));
          while (rung < reached && rung < rets) { rung++; chime(['A5', 'C6', 'D6', 'E6', 'G6', 'A6'][Math.min(5, rung - 1)], 0.06); }
          if (N.routeTip && Math.random() < 0.4) P.emit('mote', N.routeTip.x, N.routeTip.y, 1, { colors: ['#fff3c8', '#ffd27a'] });
        });
        N.routeK = 1; N.flash = K.reduced() ? 0.2 : 0.6;
        const C = pal(), s = N.chosen;
        P.emit('star', s.x, s.y, 30, { colors: [C.star, '#ffffff'], speed: [40, 200] });
        K.finale('stars', { colors: [C.star, C.line, '#ffffff'], chord: ['A3', 'C4', 'E4', 'B4'], ms: 3400 });
        const pct = Math.round(steady() * 100);
        cap.children[0].textContent = V(); cap.children[1].textContent = 'Sailed by ' + V() + ' tonight';
        cap.children[2].textContent = (N.returns ? 'Came back ' + N.returns + (N.returns === 1 ? ' time' : ' times') : 'Held the course') + ' · ' + pct + '% on course · ' + SKY.name;
        drop.hush(); N.dropDown = true; drop.place(12, G.h - 16 - G.drop.sz - (G.phone ? 22 : 30), 1100); drop.base('love');
        cap.classList.add('ns-on');
        await S.sleep(4600);
        finish();
      }
      const steady = () => (N.sailT > 1 ? N.onT / N.sailT : 0.8);
      function finish() {
        if (finished) return;
        const v = V(), st = steady(), pct = Math.round(st * 100), badges = [];
        const pb = K.best('steady', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% on course'); else if (pb.first) badges.push('First voyage: ' + pct + '% on course');
        const tier = K.tier(st, [0.4, 0.62, 0.8]);
        if (tier) badges.push(tier + ': steady course');
        const col = K.collect(v);
        badges.push((col.isNew ? 'New in your atlas: ' : 'Sailed by again: ') + v + ' (' + Math.min(col.count, VALUES.length) + ' of ' + VALUES.length + ')');
        if (N.returns) badges.push('Came back ' + N.returns + (N.returns === 1 ? ' time' : ' times'));
        ctx.track('done', { v: N.chosen ? N.chosen.v.id : '', steady: pct, returns: N.returns, picked: N.picked ? 1 : 0 });
        finished = true; N.ph = 'end';
        ctx.finish({
          title: 'Sailed by ' + v, mood: 'love',
          lines: ['Your star tonight: ' + v, N.returns ? 'Drifted and came back ' + N.returns + (N.returns === 1 ? ' time' : ' times') + ', fog included' : 'Held the course through gusts and fog', N.picked ? 'Today: ' + N.picked : 'The small step can wait for tomorrow'],
          share: 'Sailed by ' + v + ' tonight.', badges
        });
      }

      /* ---------------- start ---------------- */
      if (S.isDev && S.isDev()) window.__northStar = { N, G, T, VS };
      S.on('theme', () => { SPR = null; bgKey = ''; paintBG(); });
      cv.onResize(() => layout());
      (async () => {
        await K.intro({ title: 'North Star', sub: 'Each star is something you care about. Pick one and sail by it, whatever blows across your bow.', how: 'Tap a star. Then turn the wheel to keep your bow under it.', char: 'drop', mood: 'idea' });
        N.ph = 'choose';
        VS.forEach(s => { s.btn.hidden = false; if (SUG.includes(s.v.id)) s.btn.classList.add('ns-sug'); });
        say(L.choose, 5200, 'idea');
        setGuide({ id: 'choose', g: 'choose', target: SUG.map(id => VS.find(s => s.v.id === id).btn), label: 'TAP YOUR STAR', place: 'below' });
      })();

      return {
        async autoplay() {
          const intro = el.querySelector('.gk-intro'); if (intro) await K.sim.tap(intro);
          while (N.ph !== 'choose') await K.wait(100);
          await K.wait(700);
          const pickS = VS.find(s => s.v.id === SUG[0]) || VS[0];
          await K.sim.tap(pickS.btn, 32, 32);
          while (!steerable()) await K.wait(100);
          // a calm helmsman: hold the wheel and lead the bow back, easing off as it comes round
          const R0 = G.wheel.r * 1.05, cyP = G.wheel.y - (G.hz + 8);
          let a = -Math.PI / 2, eng = false;
          const pr = await K.sim.press(pad, G.wheel.x + Math.cos(a) * R0, cyP + Math.sin(a) * R0);
          while (steerable() && !finished) { // reacts to the drift it sees, like a person: no peeking at the wind
            const e = wrap(N.psi - N.course);
            if (Math.abs(e) > 0.15) eng = true; else if (Math.abs(e) < 0.03 && Math.abs(N.rate) < 0.05) eng = false;
            const want = eng ? K.clamp(((-1.0 * e) + e * T.assist - N.rate * 0.6) / 0.55 * 2.4, -2.6, 2.6) : 0;
            const d = K.clamp(want - N.wheel, -0.45, 0.45);
            a += d; pr.move(G.wheel.x + Math.cos(a) * R0, cyP + Math.sin(a) * R0);
            await K.wait(45);
          }
          pr.up(G.wheel.x + Math.cos(a) * R0, cyP + Math.sin(a) * R0);
          while (N.ph !== 'action' && !finished) await K.wait(150);
          await K.wait(1200);
          if (N.chipEls && N.chipEls[0] && N.ph === 'action') await K.sim.tap(N.chipEls[0]);
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
