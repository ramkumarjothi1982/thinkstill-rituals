/* 032 Breath Maze — Reset · GROUND · Panic / Body Alarm
 * Mechanism: box breathing: four equal counts of breathing in, holding, breathing out and holding (the 4-4-4-4
 * "tactical breathing" taught to first responders and the military). An even, slow pace lowers the breathing rate and
 * gives attention one simple job. The player traces a glowing marble round a carved square at the pace of a travelling
 * light: up the left side to breathe in, across the top to hold, down the right to breathe out, back along the bottom to
 * hold. Each steady box opens a door to a bigger loop with a slower count. Nothing fails: run ahead and the marble just
 * leaves the light; fall behind and the light waits.
 * Verb: trace (drag the marble with the light). Twist: the walls turn and the square becomes a spiral that carries the
 * marble by itself while you just breathe. Finale: the maze unfolds into a mandala of light in the four breath colours,
 * the marble settles in the centre, and a steadier round adds a marble to the tray (amber, moonstone, aurora).
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const SERIF = '"Marcellus", "Trajan Pro", "Optima", "Palatino Linotype", "Book Antiqua", Georgia, serif';
  const SANS = '"Josefin Sans", "Futura", "Century Gothic", "Avenir Next", "Segoe UI", system-ui, sans-serif';

  /* The four sides of every box, starting bottom-left: up = in, across = hold, down = out, back = hold. */
  const PH = [
    { key: 'in', word: 'Breathe in', tile: 'In', dir: [0, -1], g: 'u', guide: 'TRACE UP: BREATHE IN', place: 'below' },
    { key: 'hold', word: 'Hold', tile: 'Hold', dir: [1, 0], g: 'r', guide: 'ACROSS: HOLD', place: 'below' },
    { key: 'out', word: 'Breathe out', tile: 'Out', dir: [0, 1], g: 'd', guide: 'DOWN: BREATHE OUT', place: 'above' },
    { key: 'rest', word: 'Hold', tile: 'Hold', dir: [-1, 0], g: 'l', guide: 'BACK: HOLD', place: 'below' }
  ];
  const CORN = [[-1, 1], [-1, -1], [1, -1], [1, 1]];
  const sqPt = (u, r) => { const i = Math.floor(u), s = ((i % 4) + 4) % 4, f = u - i, a = CORN[s], b = CORN[(s + 1) % 4]; return { x: (a[0] + (b[0] - a[0]) * f) * r, y: (a[1] + (b[1] - a[1]) * f) * r }; };
  /* The breath colours: in (aqua), hold full (gold), out (coral), hold empty (violet). */
  const PCOL = { dark: ['#5fe3dc', '#ffd36b', '#ff9b7d', '#b9a0ff'], bright: ['#0c938e', '#c98a08', '#d9553a', '#6c4fd6'] };
  const RUSH_FACE = ['E13', 'E10', 'E50', 'E32'], RUSH_HURRY = ['E23', 'E04', 'E23', 'E35'], STILL_FACE = ['E02', 'E03', 'E05', 'E03'];

  /* A different carved maze each day (the same all day). */
  const DESIGNS = [
    { key: 'star', name: 'Star Maze', motif: 'star', wood: ['#5d3c27', '#46291a', '#2c190f'], woodB: ['#efd6ab', '#dfbd8d', '#c79d6a'], floor: ['#1f120a', '#6a4529'], inlay: ['#e2bd62', '#9c6f17'], cloth: ['#0f1e38', '#040914'], clothB: ['#e5e7ee', '#cdd3df'] },
    { key: 'sun', name: 'Sun Maze', motif: 'sun', wood: ['#6b3c25', '#502a1a', '#33190e'], woodB: ['#f2d2a4', '#e3b682', '#c9925c'], floor: ['#25110a', '#6d4023'], inlay: ['#f0c45a', '#a8720f'], cloth: ['#2d1128', '#11050e'], clothB: ['#f2e3d9', '#e2cbbe'] },
    { key: 'leaf', name: 'Leaf Maze', motif: 'leaf', wood: ['#5d432a', '#45311d', '#2c1f11'], woodB: ['#ead5aa', '#d8bd8c', '#be9d69'], floor: ['#1d150b', '#5f4a2b'], inlay: ['#d6c26c', '#8a7622'], cloth: ['#0f271b', '#03100a'], clothB: ['#e2e9d9', '#cbd7c1'] },
    { key: 'wave', name: 'Wave Maze', motif: 'wave', wood: ['#4f372a', '#3a281d', '#241811'], woodB: ['#e8d2b0', '#d5b993', '#ba9b73'], floor: ['#19110b', '#574634'], inlay: ['#cbd8e0', '#6d8899'], cloth: ['#072c33', '#011316'], clothB: ['#dbeaea', '#c2d8d9'] },
    { key: 'moon', name: 'Moon Maze', motif: 'moon', wood: ['#4d3635', '#382627', '#231718'], woodB: ['#e9d6c2', '#d8bfa7', '#bd9f86'], floor: ['#191011', '#5b4740'], inlay: ['#dde0f2', '#7c82ad'], cloth: ['#191a42', '#07071c'], clothB: ['#e7e5f3', '#d1cee8'] }
  ];
  /* The marble tray: everyone starts with glass; a steadier round (Bronze, Silver, Gold) earns the next marble. */
  const MARBLES = [
    { name: 'Glass marble', short: 'Glass', tier: '', glass: ['#f6fcff', '#c6e6f5', '#6d9fbf'], swirl: ['#ffffff', '#ffd36b'] },
    { name: 'Amber marble', short: 'Amber', tier: 'Bronze', glass: ['#fff3d8', '#f2b65c', '#9c5a19'], swirl: ['#fff4cc', '#c4521a'] },
    { name: 'Moonstone marble', short: 'Moonstone', tier: 'Silver', glass: ['#ffffff', '#e2e8f8', '#8995c0'], swirl: ['#b7c6ff', '#ffffff', '#d8c4ff'] },
    { name: 'Aurora marble', short: 'Aurora', tier: 'Gold', glass: ['#f2fffb', '#a9f0e5', '#4677b3'], swirl: ['#5fe3dc', '#b9a0ff', '#ff9b7d'] }
  ];

  const LINES = {
    hello: { Jolly: 'This maze breathes. Up is in, across is hold, down is out, back is hold.', Cheeky: 'Four sides, four equal counts. The maze sets the pace, not your brain.', Unfiltered: 'Up: in. Across: hold. Down: out. Back: hold.' },
    rushHello: { Jolly: 'A maze?! I’ll have it done in two seconds!', Cheeky: 'Mazes are just races with walls. Watch me.', Unfiltered: 'Maze. Speedrun. Go.' },
    rushBack: { Jolly: 'The maze again! I’ll go slow this time. Probably.', Cheeky: 'Back for more maze. I’m pacing myself. Mostly.', Unfiltered: 'Maze again. Slow. Probably.' },
    lead: { Jolly: 'Put a finger on the marble and trace it up with the light.', Cheeky: 'Finger on the marble. Follow the light, not Rush.', Unfiltered: 'Finger on the marble. Trace up with the light.' },
    outrun: { Jolly: 'Faster, faster! Wait… where did the light go?', Cheeky: 'Speedrun! Oh. The marble went dark.', Unfiltered: 'Fast! …Dark. Huh.' },
    outrunStill: { Jolly: 'Too quick and you outrun the light. Let it lead.', Cheeky: 'The light’s the boss here. Stay inside it.', Unfiltered: 'Slower. Stay in the light.' },
    wait: { Jolly: 'No rush. The light will wait for you.', Cheeky: 'The light’s patient. Unlike some people.', Unfiltered: 'The light waits. Keep going.' },
    smooth: { Jolly: 'Ooh, smooth. Very marble-y.', Cheeky: 'Show-off. That was silky.', Unfiltered: 'Smooth.' },
    box1: { Jolly: 'One steady box. Look, a door just opened.', Cheeky: 'Box one, done. The maze approves. Door’s open.', Unfiltered: 'One box. Door open.' },
    door: { Jolly: 'You don’t have to solve a loop to step out of it.', Cheeky: 'Plot twist: you can leave a loop without winning the argument.', Unfiltered: 'You can step out of a loop without solving it.' },
    bigger: { Jolly: 'A bigger loop! And… slower? Fine. Slower.', Cheeky: 'Bigger loop, slower count. Who designed this, a sloth?', Unfiltered: 'Bigger. Slower. Fine.' },
    calmRush: { Jolly: 'Huh. My legs have stopped jiggling.', Cheeky: 'I feel weirdly unhurried. Is this allowed?', Unfiltered: 'I’m… calm? Weird.' },
    twist: { Jolly: 'Um. The walls are moving!', Cheeky: 'The walls are spinning and I didn’t touch anything.', Unfiltered: 'Walls. Moving.' },
    carry: { Jolly: 'Let it carry you. No steering now. Just breathe with the light.', Cheeky: 'Hands off. The maze drives now. You just breathe.', Unfiltered: 'It drives now. Just breathe.' },
    ride: { Jolly: 'I’m not even pushing and it’s still going. I love this.', Cheeky: 'Autopilot breathing. Best ride in the arcade.', Unfiltered: 'No pushing. Still going. Nice.' },
    centre: { Jolly: 'The centre. In, hold, out, hold, and here you are.', Cheeky: 'Centre reached. No speedrun required.', Unfiltered: 'Centre. Steady.' },
    sleep: { Jolly: 'Zzz… four… four… four…', Cheeky: 'Zzz… is it nap o’clock…', Unfiltered: 'Zzz.' },
    care: { Jolly: 'A steady breath makes the next step easier to see, and asking for help can be that step.', Cheeky: 'A steady breath makes the next step easier to see, and asking for help can be that step.', Unfiltered: 'A steady breath helps you see the next step. Asking for help counts.' }
  };

  (env.games = env.games || []).push({
    id: 'breath-maze', mode: 'reset', name: 'Breath Maze', verb: 'trace', family: 'GROUND', minutes: 2,
    parents: ['Panic / Body Alarm', 'Attention / Grounding / Mental Quiet', 'Sleep / Winding Down'],
    cast: ['still', 'rush'], poster: { char: 'still', mood: 'calm' },
    fonts: ['Marcellus', 'Josefin+Sans:wght@600;700'],
    tagline: 'Trace a glowing marble round a maze: in, hold, out, hold.',
    why: 'For a racing body or a busy head: four equal counts of box breathing steady both.',
    css: `
.g-breath-maze { --bm-ink: #f6f0e4; --bm-ink2: rgba(246, 240, 228, 0.8); --bm-chip: rgba(8, 16, 26, 0.74); --bm-line: rgba(246, 240, 228, 0.2); --bm-halo: rgba(3, 8, 16, 0.62); --bm-pc: #5fe3dc; background: #060d16; }
.g-breath-maze.bm-bright { --bm-ink: #1f2530; --bm-ink2: rgba(31, 37, 48, 0.78); --bm-chip: rgba(255, 253, 248, 0.88); --bm-line: rgba(31, 37, 48, 0.16); --bm-halo: rgba(250, 248, 242, 0.86); background: #e2e3e6; }
.g-breath-maze .bm-touch { position: absolute; inset: 0; z-index: 20; touch-action: none; cursor: grab; outline: none; -webkit-tap-highlight-color: transparent; }
.g-breath-maze .bm-touch:active { cursor: grabbing; }
.g-breath-maze .bm-touch:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 214, 140, 0.7); }
.g-breath-maze .bm-hud { position: absolute; z-index: 25; left: 50%; top: 62px; transform: translateX(-50%); width: min(520px, calc(100% - 20px)); text-align: center; color: var(--bm-ink); pointer-events: none;
  padding: 4px 14px 10px; background: radial-gradient(closest-side, var(--bm-halo), rgba(0, 0, 0, 0)); transition: opacity 0.6s ease; }
.g-breath-maze .bm-hud.bm-off { opacity: 0; }
.g-breath-maze .bm-hud > [hidden] { display: none; }
.g-breath-maze .bm-kick { font: 700 12px/1.25 ${SANS}; letter-spacing: 0.2em; text-transform: uppercase; color: var(--bm-ink2); }
.g-breath-maze .bm-title { font: 400 36px/1.08 ${SERIF}; letter-spacing: 0.03em; margin-top: 4px; }
.g-breath-maze .bm-title .bm-n { display: inline-block; min-width: 0.9ch; margin-left: 0.32em; color: var(--bm-pc); font-variant-numeric: tabular-nums; transition: color 0.6s ease; }
.g-breath-maze .bm-tt.bm-swap { animation: breath-maze-swap 0.7s ease both; }
@keyframes breath-maze-swap { from { opacity: 0.25; translate: 0 5px; } to { opacity: 1; translate: 0 0; } }
.g-breath-maze .bm-line { font: 600 16px/1.38 ${SANS}; margin-top: 6px; text-wrap: balance; }
.g-breath-maze .bm-line .bm-u { display: inline-block; max-width: 100%; font: 700 15px/1.25 ${SANS}; letter-spacing: 0.06em; padding: 3px 9px 2px; margin: 1px 0; border-radius: 8px; background: var(--bm-chip); border: 1px solid var(--bm-line); }
.g-breath-maze .bm-strip { position: absolute; z-index: 24; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; pointer-events: none; transition: opacity 0.6s ease; }
.g-breath-maze .bm-strip.bm-off { opacity: 0; }
.g-breath-maze .bm-tile { position: relative; width: 78px; height: 34px; border-radius: 10px; display: grid; place-items: center; overflow: hidden; color: var(--bm-ink2); background: var(--bm-chip); border: 1px solid var(--bm-line);
  font: 700 13px/1 ${SANS}; letter-spacing: 0.18em; text-transform: uppercase; padding-top: 2px; transition: color 0.4s ease, border-color 0.4s ease, background-color 0.4s ease, translate 0.4s ease; }
.g-breath-maze .bm-tile.on { color: var(--bm-ink); border-color: var(--c); background-color: color-mix(in srgb, var(--c) 24%, var(--bm-chip)); translate: 0 -2px; }
.g-breath-maze .bm-tile i { position: absolute; left: 0; bottom: 0; width: 100%; height: 3px; background: var(--c); transform-origin: 0 50%; transform: scaleX(var(--p, 0)); }
.g-breath-maze .bm-tile.done i { opacity: 0.45; }
.g-breath-maze .bm-cap { position: absolute; z-index: 25; transform: translateX(-50%); width: max-content; max-width: calc(100% - 24px); text-align: center; pointer-events: none; color: var(--bm-ink);
  padding: 7px 14px 8px; border-radius: 14px; background: var(--bm-chip); border: 1px solid var(--bm-line); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22); }
.g-breath-maze .bm-cap b { display: block; font: 400 17px/1.2 ${SERIF}; letter-spacing: 0.02em; }
.g-breath-maze .bm-cap span { display: block; margin-top: 2px; font: 600 13px/1.3 ${SANS}; color: var(--bm-ink2); }
.g-breath-maze .bm-cap.bm-in { animation: breath-maze-swap 0.6s ease both; }
.g-breath-maze.gk-game .gk-side-below .gk-bubble, .g-breath-maze.gk-game .gk-side-above .gk-bubble { max-width: min(220px, calc(100cqw - 24px)); }
.g-breath-maze.gk-game .gk-side-left .gk-bubble, .g-breath-maze.gk-game .gk-side-right .gk-bubble { max-width: min(280px, calc(100cqw - 2 * var(--sz, 72px) - 56px)); }
@container (min-width: 700px) {
  .g-breath-maze .bm-title { font-size: 44px; }
  .g-breath-maze .bm-tile { width: 96px; height: 36px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity, RED = K.reduced();
      let care = an.safety === 'care';
      const DES = K.dailyPick(DESIGNS);
      const COUNTS = [[3, 4], [3, 4], [3, 4, 5]][inten];     // seconds per side, one traced loop each
      const NL = COUNTS.length;
      const SPN = [3, 7, 7][inten], SPT = [4, 4, 5][inten]; // phases the spiral rolls by itself (it ends on an out-breath), and their count
      const line = (o) => (care ? o.Jolly : ctx.line(o));
      const owned = (K.collection() || []).slice();
      const MARB = MARBLES.slice().reverse().find(m => owned.includes(m.name)) || MARBLES[0];
      const visits = K.visits();
      const PC = () => (K.dark() ? PCOL.dark : PCOL.bright), LC = PCOL.dark; // UI text colours by theme; light is always luminous

      /* ---------------- the player's loops (their own words only; examples are labelled as examples) ---------------- */
      function pickThoughts(a) {
        const norm = (l) => String(l || '').toUpperCase().replace(/\s+/g, ' ').trim();
        if (ctx.text) {
          const real = [], seen = new Set();
          (a.strands || []).forEach(s => { if (!s || s.generic) return; const l = norm(s.label); if (l.length < 2 || seen.has(l)) return; seen.add(l); real.push(l); });
          let core = null;
          if (a.core && !a.core.generic) { const l = norm(a.core.label); if (l.length >= 2) { core = l; const i = real.indexOf(l); if (i >= 0) real.splice(i, 1); } }
          const list = real.slice(0, core ? NL - 1 : NL);
          if (core) list.push(core);
          if (list.length) return { list, generic: false };
        }
        const gen = (a.strands || []).filter(s => s && s.generic && s.label).map(s => norm(s.label));
        return { list: (gen.length >= 2 ? gen : ['TOMORROW’S LIST', 'THAT THING I SAID', 'WHAT IF IT GOES WRONG']).slice(0, NL), generic: true };
      }
      let TH = pickThoughts(an);
      const thoughtLine = (k) => { const l = TH.list[k]; if (!l) return 'Up is in. Let the light lead.'; return TH.generic ? ['A loop like ', { u: l }] : ['Going round: ', { u: l }]; };

      /* ---------------- state ---------------- */
      const G = { w: 0, H: 0, phone: true, cx: 0, cy: 0, S: 300, A: 140, fw: 15, mR: 28, sp: 50, gw: 24, mr: 9, r: [60, 110], top: 0, stripY: 0 };
      const home = { still: { x: 8, y: 700 }, rush: { x: 300, y: 700 } };
      let stage = 'intro', box = null, spiral = null, roll = null, finished = false, now = 0, lastMs = performance.now(), shownN = -1;
      const scores = [], lit = new Array(NL).fill(0);
      const MB = { x: 0, y: 0, roll: 0, lit: 0.5, col: '#ffffff', init: false, speed: 0, tap: 0 };
      const FX = { turn: 0, turnOn: false, rot: new Array(NL).fill(0), wallA: 1, rev: 0, revOn: false, man: 0, manOn: false, flashK: -1, flashT: 0, tray: 0, trayOn: false, doorK: -1, doorT: 0 };
      let finger = false, lastP = null, keyDir = null, guideSpec = null, lastOut = -10, saidOutrun = false, saidSmooth = false, saidCalm = false;
      let RES = null, C = null;
      const qual = { acc: 0, n: 0, q: 1 };

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.75 });
      const PS = K.particles({ max: 200 });
      const touch = h('div', { class: 'bm-touch', role: 'application', tabindex: '0', 'aria-label': 'The breath maze. Drag the glowing marble round the square with the light: up to breathe in, right to hold, down to breathe out, left to hold. Keyboard: hold the arrow keys.' });
      const hud = h('div', { class: 'bm-hud', 'aria-live': 'polite' },
        h('div', { class: 'bm-kick' }),
        h('div', { class: 'bm-title' }, h('span', { class: 'bm-tt' }), h('span', { class: 'bm-n' })),
        h('div', { class: 'bm-line' }));
      const hK = hud.children[0], hT = hud.children[1].children[0], hN = hud.children[1].children[1], hL = hud.children[2];
      const strip = h('div', { class: 'bm-strip', 'aria-hidden': 'true' });
      const tiles = PH.map((p, i) => { const t = h('div', { class: 'bm-tile', style: { '--c': 'var(--bm-c' + i + ')' } }, h('span', { text: p.tile }), h('i')); strip.append(t); return t; });
      const cap = h('div', { class: 'bm-cap', hidden: true });
      el.append(touch, hud, strip, cap);
      const still = K.character('still', { side: 'right', mood: 'calm', x: 8, y: 700, size: 72 });
      const rush = K.character('rush', { side: 'left', mood: 'speed', x: 300, y: 700, size: 72 });
      const talk = (who, o, opts) => { (who === still ? rush : still).hush(); who.say(line(o), opts || {}); };
      function setColors() {
        const pc = PC();
        el.classList.toggle('bm-bright', !K.dark());
        pc.forEach((c, i) => el.style.setProperty('--bm-c' + i, c));
      }
      setColors();

      function setLine(parts) {
        hL.textContent = '';
        (Array.isArray(parts) ? parts : [parts]).forEach(p => hL.append(typeof p === 'string' ? document.createTextNode(p) : h('span', { class: 'gk-user bm-u', text: p.u })));
        hL.hidden = !hL.textContent;
      }
      function setHud(kick, title, parts) {
        if (kick != null) { hK.textContent = kick; hK.hidden = !kick; }
        if (title != null && hT.textContent !== title) { hT.textContent = title; hT.classList.remove('bm-swap'); void hT.offsetWidth; hT.classList.add('bm-swap'); }
        if (parts != null) setLine(parts);
      }

      /* a later (AI) reading can only make things gentler, and new words are used only before the first loop starts */
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => {
        if (!a || S.destroyed) return;
        if (a.safety === 'care') care = true;
        if (stage === 'intro' || stage === 'hello' || (stage === 'trace' && box && box.k === 0 && !box.started)) { an = a; TH = pickThoughts(an); if (stage === 'trace') setLine(thoughtLine(0)); }
      }, () => {});

      /* ---------------- sound: a glass tone that rises, holds, falls and rests ---------------- */
      const au = () => !!A.ctx;
      const N = (n) => A.note(n);
      let roller = null, grind = null, air = null;
      function loops() { if (!au()) return false; if (!roller) { roller = A.loop({ pink: true, filter: 'lowpass', freq: 240, q: 0.7 }); air = A.loop({ pink: true, filter: 'bandpass', freq: 300, q: 0.9 }); } return true; }
      S.onDestroy(() => { if (roller) roller.stop(); if (grind) grind.stop(); if (air) air.stop(); });
      const amb = K.ambience('room'); amb.level(0.12, 1.5);
      /* One soft glass note on every count, in time with the number on screen: it climbs through the in-breath, repeats
         on the full hold, walks back down on the out-breath and pulses low on the empty hold. */
      const SCALE = { 3: ['D4', 'F#4', 'A4'], 4: ['D4', 'E4', 'F#4', 'A4'], 5: ['D4', 'E4', 'F#4', 'A4', 'B4'] };
      function countTone(s, i, T, layer) {
        if (!au()) return;
        const sc = SCALE[T] || SCALE[4], n = s === 0 ? sc[Math.min(sc.length - 1, i)] : s === 1 ? sc[sc.length - 1] : s === 2 ? sc[Math.max(0, sc.length - 1 - i)] : 'D3';
        const f = N(n), v = s === 0 || s === 2 ? 0.056 : s === 1 ? 0.04 : 0.045;
        A.tone({ type: 'sine', freq: f, dur: s === 3 ? 1.5 : 1.8, attack: s === 3 ? 0.3 : 0.16, vol: v, verb: 0.5, lp: s === 3 ? 520 : 0 });
        if (s !== 3) A.tone({ type: 'triangle', freq: f * 2, dur: 1.1, attack: 0.1, vol: v * 0.16, lp: 2600 });
        if (layer > 0 && s === 1) A.tone({ type: 'sine', freq: f * 1.5, dur: 1.6, attack: 0.35, vol: v * 0.32, verb: 0.5 });
        A.sync('count', performance.now());
      }
      /* the breath itself: a soft air sound that swells on the way in and sighs away on the way out */
      function airStep() {
        if (!air) return;
        let s = -1, f = 0;
        if (stage === 'trace' && box && box.started && box.g < 4) { s = Math.min(3, Math.floor(box.g)); f = box.g - s; }
        else if ((stage === 'spiral' || stage === 'home') && spiral) { const i = Math.min(spiral.U, Math.floor(spiral.u)); s = ((i % 4) + 4) % 4; f = clamp(spiral.u - i, 0, 1); }
        let lv = 0.0001, fq = 300;
        if (s === 0) { lv = 0.008 + 0.03 * f; fq = 300 + 820 * f; }
        else if (s === 1) { lv = 0.012; fq = 1100; }
        else if (s === 2) { lv = 0.004 + 0.034 * (1 - f); fq = 1120 - 860 * f; }
        air.level(lv, 0.18); air.freq(fq, 0.25);
      }
      function cornerChime(s) { if (!au()) return; A.chime(N(['D6', 'A5', 'F#5', 'D5'][s]), { vol: 0.045, dur: 2.2, verb: 0.5 }); A.wood(undefined, 0.06, 1.7); A.sync('corner', performance.now()); }
      function boxChord(k) { if (!au()) return; ['D5', 'F#5', 'A5', 'D6', 'E6'].slice(0, 4 + Math.min(1, k)).forEach((n, i) => A.chime(N(n), { when: A.now() + i * 0.09, vol: 0.055, dur: 2.4, verb: 0.5 })); A.sync('box', performance.now()); }
      function doorSound() { if (!au()) return; A.wood(undefined, 0.2, 0.62); A.wood(A.now() + 0.12, 0.14, 0.8); A.noise({ filter: 'lowpass', freq: 700, to: 260, dur: 0.6, attack: 0.08, vol: 0.07 }); K.sfx.rise(); A.sync('door', performance.now()); }
      function twistSound() {
        if (!au()) return;
        A.tone({ type: 'sine', freq: N('D2'), dur: 4.5, attack: 0.02, vol: 0.16, verb: 0.6 });
        A.tone({ type: 'sine', freq: N('D2') * 2.76, dur: 2.6, attack: 0.02, vol: 0.045, verb: 0.6 });
        A.tone({ type: 'sine', freq: N('A2') * 1.5, dur: 3.2, attack: 0.3, vol: 0.03, verb: 0.6 });
        if (!grind) { grind = A.loop({ pink: true, filter: 'bandpass', freq: 150, q: 0.8, bus: 'amb' }); grind.level(0.07, 0.6); S.later(() => { if (grind) grind.level(0.0001, 1.6); }, 3200); }
        A.sync('twist', performance.now());
      }
      function settleSound() { if (!au()) return; A.tone({ type: 'sine', freq: N('D3'), dur: 6, attack: 0.05, vol: 0.12, verb: 0.7 }); A.chime(N('A5'), { vol: 0.07, dur: 3.2, verb: 0.6 }); A.chime(N('D6'), { when: A.now() + 0.2, vol: 0.06, dur: 3.2, verb: 0.6 }); A.sync('settle', performance.now()); }

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700, cx = Math.round(w / 2);
        let S0, top;
        if (phone) {
          S0 = Math.round(Math.min(w - 20, H - 370, 560));
          const a0 = 182, a1 = H - 16 - 72 - 12, block = S0 + 12 + 34;
          top = Math.round(a0 + Math.max(0, (a1 - a0 - block) / 2));
        } else {
          S0 = Math.round(Math.min(H - 250, w - 600, 640));
          const a0 = 160, a1 = H - 14, block = S0 + 12 + 36;
          top = Math.round(a0 + Math.max(0, (a1 - a0 - block) / 2));
        }
        S0 = Math.max(230, S0 - (S0 % 2));
        const cy = Math.round(top + S0 / 2), fw = Math.round(S0 * 0.05), Ai = S0 / 2 - fw, mR = Ai * 0.2, sp = (Ai - mR) / NL;
        const gw = clamp(sp * 0.44, 16, 40);
        Object.assign(G, { w, H, phone, cx, cy, S: S0, A: Ai, fw, mR, sp, gw, mr: gw * 0.41, top, stripY: top + S0 + 12, r: Array.from({ length: NL }, (_, k) => mR + sp * (k + 0.5)) });
        G.mid = (G.r[NL - 1] + gw / 2 + S0 / 2) / 2;
        strip.style.top = G.stripY + 'px';
        hud.style.top = (phone ? 62 : 58) + 'px';
        const sz = phone ? 72 : 108;
        if (phone) {
          home.still = { x: 8, y: H - 16 - sz }; home.rush = { x: w - 8 - sz, y: H - 16 - sz };
          still.side('right'); rush.side('left');
        } else {
          const colL = (cx - S0 / 2) / 2, colR = (cx + S0 / 2 + w) / 2, y = Math.round(cy - sz / 2 - 40);
          home.still = { x: Math.round(Math.max(12, colL - sz / 2 - 30)), y }; home.rush = { x: Math.round(Math.min(colR - sz / 2 + 30, w - 12 - 228)), y };
          still.side('below'); rush.side('below');
        }
        [still, rush].forEach(c => c.el.style.setProperty('--sz', sz + 'px'));
        still.place(home.still.x, home.still.y); rush.place(home.rush.x, home.rush.y);
        placeCap();
        C = null; MB.init = false;
      }
      function trayPos() {
        if (G.phone) { const band = G.top - 176; return band >= 92 ? { x: G.cx, y: Math.round(176 + band * 0.32), inBand: true } : { x: G.cx, y: 112, inBand: false }; }
        return { x: Math.round((G.cx - G.S / 2) / 2), y: Math.round(G.cy + G.S * 0.22), inBand: true };
      }
      function placeCap() {
        const P = trayPos(), r = trayR();
        const half = Math.min(G.w / 2 - 8, (cap.hidden ? 240 : cap.offsetWidth || 240) / 2);
        cap.style.left = Math.round(clamp(P.x, half + 8, G.w - half - 8)) + 'px';
        cap.style.top = Math.round(P.y + r * 1.75 + 8) + 'px';
      }
      const trayR = () => Math.round(clamp(G.mr * 1.15, 10, 15));

      /* ---------------- painters (cached per size and theme) ---------------- */
      function off(w, hh) { const d = cv.dpr || 1, c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * d)); c.height = Math.max(1, Math.ceil(hh * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, g, w, h: hh }; }
      function rrSub(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function rr(g, x, y, w, hh, r) { g.beginPath(); rrSub(g, x, y, w, hh, r); }
      function grain(g, x, y, w, hh, D, seed) {
        const rnd = K.rng(seed), n = Math.round(hh / 4.2);
        g.lineWidth = 1;
        for (let i = 0; i < n; i++) {
          const yy = y + rnd() * hh, tilt = (rnd() - 0.5) * 0.05, amp = 0.6 + rnd() * 2.2, f = 0.01 + rnd() * 0.025, ph = rnd() * 6, dk = rnd() < 0.62;
          g.strokeStyle = dk ? (D ? 'rgba(0, 0, 0, 0.2)' : 'rgba(120, 78, 36, 0.13)') : (D ? 'rgba(255, 224, 180, 0.055)' : 'rgba(255, 252, 240, 0.34)');
          g.beginPath();
          for (let xx = x - 12; xx <= x + w + 12; xx += 12) { const yv = yy + (xx - x) * tilt + Math.sin(xx * f + ph) * amp; if (xx === x - 12) g.moveTo(xx, yv); else g.lineTo(xx, yv); }
          g.stroke();
        }
      }
      function motif(g, kind, R, col, lw) {
        g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
        if (kind === 'star') { K.starPath(g, 0, 0, R, R * 0.42, 8, 0); g.stroke(); g.beginPath(); g.arc(0, 0, R * 0.17, 0, TAU); g.fill(); }
        else if (kind === 'sun') { g.beginPath(); g.arc(0, 0, R * 0.42, 0, TAU); g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, e = i % 2 ? 0.8 : 1; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.58, Math.sin(a) * R * 0.58); g.lineTo(Math.cos(a) * R * e, Math.sin(a) * R * e); g.stroke(); } }
        else if (kind === 'leaf') {
          g.rotate(-0.62); g.beginPath(); g.moveTo(0, R); g.quadraticCurveTo(R * 0.92, 0, 0, -R); g.quadraticCurveTo(-R * 0.92, 0, 0, R); g.stroke();
          g.beginPath(); g.moveTo(0, R * 1.08); g.lineTo(0, -R * 0.82);
          for (let i = 1; i <= 3; i++) { const yy = R * (0.62 - i * 0.34); g.moveTo(0, yy + R * 0.14); g.lineTo(R * 0.36, yy - R * 0.06); g.moveTo(0, yy + R * 0.14); g.lineTo(-R * 0.36, yy - R * 0.06); }
          g.stroke();
        } else if (kind === 'wave') {
          for (let j = -1; j <= 1; j++) { g.beginPath(); for (let q = 0; q <= 16; q++) { const x = -R + q * R / 8, yv = j * R * 0.44 + Math.sin(q / 16 * TAU * 1.25) * R * 0.17; if (q) g.lineTo(x, yv); else g.moveTo(x, yv); } g.stroke(); }
        } else {
          g.beginPath(); g.arc(0, 0, R * 0.82, Math.PI * 0.32, Math.PI * 1.68); g.arc(R * 0.34, 0, R * 0.62, Math.PI * 1.44, Math.PI * 0.56, true); g.closePath(); g.fill();
          K.starPath(g, R * 0.56, -R * 0.46, R * 0.2, R * 0.07, 4, 0); g.fill(); K.starPath(g, R * 0.74, R * 0.32, R * 0.13, R * 0.05, 4, 0); g.fill();
        }
        g.restore();
      }
      function medallion(g, R, D) {
        let gr = g.createLinearGradient(-R, -R, R, R); gr.addColorStop(0, '#fbe8a8'); gr.addColorStop(0.45, '#c99a3c'); gr.addColorStop(1, '#6c4914');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        gr = g.createRadialGradient(-R * 0.25, -R * 0.25, R * 0.05, 0, 0, R * 0.84); gr.addColorStop(0, D ? '#3d2a15' : '#ecd9ab'); gr.addColorStop(1, D ? '#160d05' : '#b89a60');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * 0.8, 0, TAU); g.fill();
        motif(g, DES.motif, R * 0.58, D ? '#f2cf74' : '#74500f', Math.max(1, R * 0.07));
        g.strokeStyle = 'rgba(255, 246, 214, 0.65)'; g.lineWidth = Math.max(0.7, R * 0.035); g.beginPath(); g.arc(0, 0, R * 0.9, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
      }
      function paintBg(D) {
        const { w, H, cx, cy, S: Sz, fw } = G, o = off(w, H), g = o.g, W = D ? DES.wood : DES.woodB, CL = D ? DES.cloth : DES.clothB, IN = D ? DES.inlay[0] : DES.inlay[1];
        let gr = g.createRadialGradient(cx, cy - Sz * 0.1, Sz * 0.15, cx, cy, Math.max(w, H) * 0.78);
        gr.addColorStop(0, CL[0]); gr.addColorStop(1, CL[1]);
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
        // the cloth it sits on: a fine weave
        g.lineWidth = 1; g.strokeStyle = D ? 'rgba(255, 255, 255, 0.022)' : 'rgba(70, 60, 50, 0.045)';
        g.beginPath(); for (let x = -H; x < w; x += 5) { g.moveTo(x, 0); g.lineTo(x + H, H); } g.stroke();
        g.strokeStyle = D ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.24)';
        g.beginPath(); for (let x = 0; x < w + H; x += 5) { g.moveTo(x, 0); g.lineTo(x - H, H); } g.stroke();
        // the board
        const x0 = cx - Sz / 2, y0 = cy - Sz / 2, rad = Sz * 0.04;
        g.save(); g.shadowColor = D ? 'rgba(0, 0, 0, 0.7)' : 'rgba(70, 45, 20, 0.35)'; g.shadowBlur = Sz * 0.07; g.shadowOffsetY = Sz * 0.03; rr(g, x0, y0, Sz, Sz, rad); g.fillStyle = W[2]; g.fill(); g.restore();
        g.save(); rr(g, x0, y0, Sz, Sz, rad); g.clip();
        gr = g.createLinearGradient(x0, y0, x0 + Sz, y0 + Sz); gr.addColorStop(0, W[0]); gr.addColorStop(0.55, W[1]); gr.addColorStop(1, W[2]);
        g.fillStyle = gr; g.fillRect(x0, y0, Sz, Sz);
        grain(g, x0, y0, Sz, Sz, D, 7);
        g.restore();
        gr = g.createLinearGradient(x0, y0, x0 + Sz, y0 + Sz); gr.addColorStop(0, D ? 'rgba(255, 228, 196, 0.36)' : 'rgba(255, 253, 246, 0.95)'); gr.addColorStop(0.5, 'rgba(255, 255, 255, 0)'); gr.addColorStop(1, D ? 'rgba(0, 0, 0, 0.55)' : 'rgba(100, 64, 30, 0.42)');
        g.strokeStyle = gr; g.lineWidth = 2; rr(g, x0 + 1, y0 + 1, Sz - 2, Sz - 2, rad); g.stroke();
        // an inlaid line round the maze, with the day's motif at its corners
        const fa = G.r[NL - 1] + G.gw / 2, mid = (fa + Sz / 2) / 2;
        g.strokeStyle = IN; g.globalAlpha = D ? 0.2 : 0.16; g.lineWidth = Math.max(2.4, fw * 0.22); rr(g, cx - mid, cy - mid, 2 * mid, 2 * mid, rad * 0.6); g.stroke();
        g.globalAlpha = 0.9; g.lineWidth = Math.max(1, fw * 0.07); g.stroke(); g.globalAlpha = 1;
        const mrad = Math.max(4.5, (Sz / 2 - fa) * 0.32);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
          g.save(); g.translate(cx + sx * mid, cy + sy * mid);
          g.fillStyle = W[1]; g.beginPath(); g.arc(0, 0, mrad * 1.25, 0, TAU); g.fill();
          motif(g, DES.motif, mrad, IN, Math.max(1, mrad * 0.14)); g.restore();
        });
        // the carved bed of the grooves, with the outer wall's shadow falling into it
        g.save(); rr(g, cx - fa, cy - fa, 2 * fa, 2 * fa, G.gw * 0.3); g.clip();
        g.fillStyle = D ? DES.floor[0] : DES.floor[1]; g.fillRect(cx - fa, cy - fa, 2 * fa, 2 * fa);
        grain(g, cx - fa, cy - fa, 2 * fa, 2 * fa, D, 19);
        gr = g.createRadialGradient(cx, cy, 0, cx, cy, fa * 1.4); gr.addColorStop(0, 'rgba(0, 0, 0, 0)'); gr.addColorStop(1, D ? 'rgba(0, 0, 0, 0.35)' : 'rgba(80, 50, 20, 0.16)');
        g.fillStyle = gr; g.fillRect(cx - fa, cy - fa, 2 * fa, 2 * fa);
        g.shadowColor = D ? 'rgba(0, 0, 0, 0.85)' : 'rgba(70, 40, 10, 0.45)'; g.shadowBlur = G.gw * 0.5; g.shadowOffsetX = G.gw * 0.1; g.shadowOffsetY = G.gw * 0.16;
        g.beginPath(); g.rect(cx - fa - 80, cy - fa - 80, 2 * fa + 160, 2 * fa + 160); rrSub(g, cx - fa, cy - fa, 2 * fa, 2 * fa, G.gw * 0.3); g.fillStyle = '#000'; g.fill('evenodd');
        g.restore();
        g.strokeStyle = D ? 'rgba(255, 226, 190, 0.2)' : 'rgba(255, 255, 255, 0.65)'; g.lineWidth = 1; rr(g, cx - fa - 0.5, cy - fa - 0.5, 2 * fa + 1, 2 * fa + 1, G.gw * 0.3); g.stroke();
        // where the cast stands on the cloth: soft contact shadows
        const sz = G.phone ? 72 : 108, sh = K.glowSprite('rgba(0, 0, 0, 0.8)');
        [home.still, home.rush].forEach(p => { g.globalAlpha = D ? 0.7 : 0.3; g.drawImage(sh, p.x + sz * 0.1, p.y + sz * 0.88, sz * 0.8, sz * 0.2); });
        g.globalAlpha = 1;
        gr = g.createRadialGradient(cx, cy, Sz * 0.55, cx, cy, Math.max(w, H) * 0.85); gr.addColorStop(0, 'rgba(0, 0, 0, 0)'); gr.addColorStop(1, D ? 'rgba(0, 0, 0, 0.5)' : 'rgba(60, 40, 20, 0.12)');
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
        return o;
      }
      /* Each inner wall is its own layer, so the walls can turn in the twist. Ring 0 is the centre block with the medallion. */
      function paintRing(k, D) {
        const W = D ? DES.wood : DES.woodB, gw = G.gw, IN = D ? DES.inlay[0] : DES.inlay[1];
        const aOut = G.r[k] - gw / 2, aIn = k === 0 ? 0 : G.r[k - 1] + gw / 2;
        const pad = Math.ceil(gw * 0.45) + 4, sz = Math.ceil(aOut + pad) * 2, o = off(sz, sz), g = o.g;
        g.translate(sz / 2, sz / 2);
        const rO = Math.min(gw * 0.28, (aOut - aIn) * 0.35), rI = rO * 0.6;
        const path = () => { g.beginPath(); rrSub(g, -aOut, -aOut, 2 * aOut, 2 * aOut, rO); if (aIn > 0) rrSub(g, -aIn, -aIn, 2 * aIn, 2 * aIn, rI); };
        g.save(); g.shadowColor = D ? 'rgba(0, 0, 0, 0.72)' : 'rgba(70, 40, 10, 0.4)'; g.shadowBlur = gw * 0.24; g.shadowOffsetX = gw * 0.07; g.shadowOffsetY = gw * 0.12; path(); g.fillStyle = W[1]; g.fill('evenodd'); g.restore();
        g.save(); path(); g.clip('evenodd');
        let gr = g.createLinearGradient(-aOut, -aOut, aOut, aOut); gr.addColorStop(0, W[0]); gr.addColorStop(1, W[1]);
        g.fillStyle = gr; g.fillRect(-aOut, -aOut, 2 * aOut, 2 * aOut);
        grain(g, -aOut, -aOut, 2 * aOut, 2 * aOut, D, 31 + k * 13);
        g.restore();
        gr = g.createLinearGradient(-aOut, -aOut, aOut, aOut);
        gr.addColorStop(0, D ? 'rgba(255, 226, 190, 0.4)' : 'rgba(255, 252, 244, 0.95)'); gr.addColorStop(0.5, 'rgba(255, 255, 255, 0)'); gr.addColorStop(1, D ? 'rgba(0, 0, 0, 0.5)' : 'rgba(110, 70, 30, 0.36)');
        g.strokeStyle = gr; g.lineWidth = Math.max(1, gw * 0.06); path(); g.stroke();
        if (k > 0) {
          const am = (aIn + aOut) / 2;
          g.strokeStyle = IN; g.globalAlpha = D ? 0.22 : 0.18; g.lineWidth = Math.max(2, gw * 0.16); rr(g, -am, -am, 2 * am, 2 * am, rO * 0.8); g.stroke();
          g.globalAlpha = 0.9; g.lineWidth = Math.max(0.8, gw * 0.05); g.stroke(); g.globalAlpha = 1;
          // the door through to this loop is cut at the bottom-left corner
          g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = gw * 1.02; g.lineCap = 'butt';
          g.beginPath(); g.moveTo(-G.r[k - 1], G.r[k - 1]); g.lineTo(-G.r[k], G.r[k]); g.stroke(); g.restore();
        } else medallion(g, Math.min(G.mR * 0.92, aOut * 0.86), D);
        o.half = sz / 2; return o;
      }
      const MSPR = {};
      function marbleSprite(M, r) {
        const key = M.name + ':' + r.toFixed(1) + ':' + (cv.dpr || 1);
        if (MSPR[key]) return MSPR[key];
        const o = off(r * 2 + 2, r * 2 + 2), g = o.g; g.translate(r + 1, r + 1);
        g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
        let gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.08, 0, 0, r);
        gr.addColorStop(0, M.glass[0]); gr.addColorStop(0.68, M.glass[1]); gr.addColorStop(1, M.glass[2]);
        g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r);
        g.lineCap = 'round';
        M.swirl.forEach((c, i) => {
          const a = i * 2.2 + 0.4; g.strokeStyle = c; g.globalAlpha = 0.88; g.lineWidth = r * (0.34 - i * 0.07);
          g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          g.bezierCurveTo(Math.cos(a + 1.3) * r * 0.15, Math.sin(a + 1.3) * r * 0.95, Math.cos(a + 2.5) * r * 0.95, Math.sin(a + 2.5) * r * 0.1, Math.cos(a + 3.2) * r, Math.sin(a + 3.2) * r); g.stroke();
        });
        g.globalAlpha = 1;
        gr = g.createRadialGradient(0, 0, r * 0.55, 0, 0, r); gr.addColorStop(0, 'rgba(0, 0, 0, 0)'); gr.addColorStop(1, 'rgba(10, 20, 40, 0.42)');
        g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r);
        g.restore();
        o.r = r + 1; MSPR[key] = o; return o;
      }
      function buildCaches() {
        const D = K.dark();
        C = { bg: paintBg(D), rings: [] };
        for (let k = 0; k < NL; k++) C.rings.push(paintRing(k, D));
      }

      /* ---------------- where things are ---------------- */
      const Lk = () => 2 * G.r[box ? box.k : 0];
      const tolPx = () => clamp(Lk() * 0.16, 18, 46);
      function spiralPt(u) {
        const s = spiral, U = s ? s.U : SPN, r0 = G.r[NL - 1], r1 = G.mR * 1.15;
        if (u <= U) return sqPt(u, r0 + (r1 - r0) * (u / U));
        const p = sqPt(U, r1), f = easeIO(Math.min(1, u - U));
        return { x: p.x * (1 - f), y: p.y * (1 - f) };
      }
      function marbleLocal() {
        if (stage === 'spiral' || stage === 'home' || stage === 'finale' || stage === 'end') return spiral ? spiralPt(spiral.u) : { x: 0, y: 0 };
        if (roll) { const f = easeIO(clamp((performance.now() - roll.t0) / roll.dur, 0, 1)); return { x: roll.fx + (roll.tx - roll.fx) * f, y: roll.fy + (roll.ty - roll.fy) * f }; }
        if (!box) return sqPt(0, G.r[0]);
        return sqPt(box.m, G.r[box.k]);
      }
      const marbleScreen = () => { const p = marbleLocal(); return { x: G.cx + p.x, y: G.cy + p.y }; };
      function glowLocal() {
        if (stage === 'trace' && box && box.started) return sqPt(box.g, G.r[box.k]);
        if (stage === 'spiral' || stage === 'home') return marbleLocal();
        return null;
      }
      const spiralSide = () => (spiral ? ((Math.min(spiral.U, Math.floor(spiral.u)) % 4) + 4) % 4 : 3);
      function glowCol() { if (stage === 'trace' && box) return LC[Math.min(3, Math.floor(box.g))]; return LC[spiralSide()]; }

      /* ---------------- input: trace the marble with the light ---------------- */
      function setGuide(spec) { guideSpec = spec; if (finger) K.guide(null); else K.guide(spec); }
      function sideGuide(s) { const P = PH[s]; return { id: 'side' + s, g: 'drag', dir: P.g, d: Math.round(clamp(Lk() * 0.5, 56, 170)), target: () => marbleScreen(), label: P.guide, place: P.place, delay: 700 }; }
      function moveMarble(dx, dy) {
        const b = box; if (!b || stage !== 'trace') return;
        const L = Lk(), s = Math.min(3, Math.floor(b.m + 1e-6)), d = PH[s].dir, along = dx * d[0] + dy * d[1];
        if (!along) return;
        const lead = Math.max(G.sp * 1.15, L * 0.34) / L;
        let m = clamp(b.m + along / L, s, s + 1);
        m = Math.min(m, (b.started ? b.g : 0) + lead, 4);
        if (m > b.m + 1e-4 && !b.started) startBox();
        b.m = Math.max(0, m);
      }
      function onDown(p) {
        finger = true; lastP = p;
        K.guide(null);
        MB.tap = 1;
        if (au()) { A.wood(undefined, 0.08, 1.25); A.tone({ type: 'sine', freq: 520, to: 700, glide: 0.07, dur: 0.12, vol: 0.032 }); A.sync('touch', performance.now()); }
        PS.emit('mote', MB.x, MB.y, 5, { colors: [MB.col, '#ffffff'], speed: [10, 45] });
        loops();
        if (stage === 'finale' || stage === 'end') { PS.emit('star', p.x, p.y, 6, { colors: LC, speed: [20, 80] }); if (au()) A.chime(N(['D5', 'F#5', 'A5', 'D6', 'E6'][Math.floor(Math.random() * 5)]), { vol: 0.045, dur: 1.6 }); }
      }
      function onMove(p) {
        if (!finger || !lastP) return;
        const dx = p.x - lastP.x, dy = p.y - lastP.y; lastP = p;
        if (stage === 'trace') moveMarble(dx, dy);
      }
      function onUp() {
        finger = false; lastP = null;
        if (guideSpec && stage === 'trace') K.guide(Object.assign({}, guideSpec, { id: guideSpec.id + '-again', delay: 1500 }));
      }
      K.press(touch, { space: el, down: onDown, move: onMove, up: onUp });
      const KEYS = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] };
      K.onKey(Object.keys(KEYS), (e) => { if (stage !== 'trace') return; e.preventDefault(); A.unlock(); K.guideDone(); loops(); keyDir = KEYS[e.code] || KEYS[e.key]; });
      S.listen(window, 'keyup', (e) => { if (KEYS[e.code]) keyDir = null; });

      /* ---------------- a box: the light travels at breath pace, the marble keeps up ---------------- */
      function startLoop(k) {
        roll = null;
        box = { k, T: COUNTS[k], g: 0, m: 0, started: false, side: -1, inT: 0, allT: 0, outT: 0, waitT: 0, waitSaid: false, sideSteady: 0, sideAll: 0 };
        stage = 'trace';
        setHud('Loop ' + (k + 1) + ' of ' + NL + ' · ' + [box.T, box.T, box.T, box.T].join('-'), 'Trace up', thoughtLine(k));
        hN.textContent = ''; shownN = -1;
        tiles.forEach(t => { t.classList.remove('on', 'done'); t.style.setProperty('--p', '0'); });
        el.style.setProperty('--bm-pc', PC()[0]);
        setGuide(sideGuide(0));
        if (k === 0) talk(still, LINES.lead, { mood: 'meditate', ms: 4200 });
      }
      function startBox() {
        box.started = true; box.side = -1;
        if (au()) A.pad([N('D3'), N('A3'), N('D4'), N(box.k ? 'F#4' : 'E4')], { dur: box.T * 4 + 1.6, vol: 0.05, attack: 1.4 });
        ctx.track('box_start', { k: box.k });
      }
      function onPhase(s, T, k, ride) {
        const P = PH[s], col = LC[s];
        el.style.setProperty('--bm-pc', PC()[s]);
        setHud(null, P.word, null); shownN = -1;
        tiles.forEach((t, i) => { t.classList.toggle('on', i === s); t.classList.toggle('done', i < s); if (i !== s) t.style.setProperty('--p', i < s ? '1' : '0'); });
        const p = ride ? marbleLocal() : sqPt(s, G.r[k]);
        if (!(s === 0 && !ride)) { cornerChime(s); PS.emit('star', G.cx + p.x, G.cy + p.y, 8, { colors: [col, '#ffffff'], speed: [30, 110] }); try { S.buzz(8); } catch (e) { /* no vibration */ } }
        rush.face(ride || k > 0 ? RUSH_FACE[s] : RUSH_HURRY[s]);
        still.face(STILL_FACE[s]);
        if (!ride) setGuide(sideGuide(s));
      }
      function onOutrun() {
        if (now - lastOut < 6) return;
        lastOut = now;
        setLine('Slower: stay in the light.');
        if (au()) A.tone({ type: 'triangle', freq: 230, to: 170, glide: 0.25, dur: 0.32, vol: 0.05, lp: 700 });
        if (!saidOutrun) { saidOutrun = true; talk(rush, LINES.outrun, { mood: 'E23', moodMs: 1500, ms: 2600 }); S.later(() => { if (!S.destroyed && stage === 'trace') talk(still, LINES.outrunStill, { mood: 'calm', ms: 3200 }); }, 2500); }
        else rush.face('E71', 1300);
        const k = box.k; S.later(() => { if (!S.destroyed && stage === 'trace' && box && box.k === k && !box.waitT) setLine(thoughtLine(k)); }, 2600);
      }
      function traceStep(rdt) {
        if (stage !== 'trace' || !box) return;
        const b = box;
        if (keyDir) { const P = PH[Math.min(3, Math.floor(b.m + 1e-6))]; if (keyDir[0] === P.dir[0] && keyDir[1] === P.dir[1]) { const v = Lk() / b.T * 1.05 * rdt; moveMarble(P.dir[0] * v, P.dir[1] * v); } }
        if (!b.started) return;
        const L = Lk(), tol = tolPx() / L, waitAt = Math.max(G.sp * 1.1, L * 0.32) / L;
        const waiting = b.g - b.m > waitAt && b.g < 4;
        if (!waiting && b.g < 4) b.g = Math.min(4, b.g + rdt / b.T);
        const s = Math.min(3, Math.floor(b.g));
        if (s !== b.side && b.g < 4) {
          if (b.side === 0 && !saidSmooth && b.k === 0 && b.sideAll > 0 && b.sideSteady / b.sideAll > 0.9) { saidSmooth = true; talk(rush, LINES.smooth, { mood: 'E19', moodMs: 1400, ms: 2400 }); }
          b.side = s; b.sideSteady = 0; b.sideAll = 0; onPhase(s, b.T, b.k);
          if (b.k === 1 && s === 2 && !saidCalm) { saidCalm = true; talk(rush, LINES.calmRush, { mood: 'E81', moodMs: 2000, ms: 3000 }); }
        }
        const inG = Math.abs(b.m - b.g) <= tol;
        if (!waiting) { b.allT += rdt; b.sideAll += rdt; if (inG) { b.inT += rdt; b.sideSteady += rdt; } }
        if (b.m - b.g > tol) { b.outT += rdt; if (b.outT > 0.45) onOutrun(); } else b.outT = 0;
        if (waiting) { b.waitT += rdt; if (b.waitT > 1.4 && !b.waitSaid) { b.waitSaid = true; setLine('The light waits for you.'); if (!finger) talk(still, LINES.wait, { mood: 'calm', ms: 2800 }); } }
        else if (b.waitT) { b.waitT = 0; b.waitSaid = false; setLine(thoughtLine(b.k)); }
        const left = b.g >= 4 ? 0 : Math.max(1, Math.ceil((s + 1 - b.g) * b.T - 0.05));
        if (left !== shownN) { shownN = left; hN.textContent = left ? String(left) : ''; if (left) countTone(s, b.T - left, b.T, b.k); }
        tiles[s].style.setProperty('--p', (b.g - s).toFixed(3));
        if (inG && MB.speed > 4 && Math.random() < rdt * 9) { const p = marbleScreen(); PS.emit('mote', p.x, p.y, 1, { colors: [LC[s], '#ffffff'], speed: [6, 24] }); }
        if (b.g >= 4 && b.m >= 4 - tol * 0.7) completeBox();
      }
      function completeBox() {
        const b = box; if (stage !== 'trace') return;
        stage = 'door'; b.m = 4; b.g = 4;
        const sc = b.allT > 0 ? clamp(b.inT / b.allT, 0, 1) : 1, pct = Math.round(sc * 100);
        scores.push(sc);
        K.guide(null); guideSpec = null;
        lit[b.k] = 1; FX.flashK = b.k; FX.flashT = now;
        boxChord(b.k);
        hN.textContent = '';
        tiles.forEach(t => { t.classList.remove('on'); t.classList.add('done'); t.style.setProperty('--p', '1'); });
        const r = G.r[b.k], pc = LC;
        for (let s = 0; s < 4; s++) { const p = sqPt(s + 0.5, r); PS.emit('star', G.cx + p.x, G.cy + p.y, 6, { colors: [pc[s], '#ffffff'], speed: [30, 120] }); }
        K.pop(pct + '% in the light', { x: G.cx, y: G.cy - r - G.gw * 0.2, kind: pct >= 85 ? 'great' : 'good' });
        rush.face(pct >= 85 ? 'E16' : 'E19', 1600); still.face('happy', 1600);
        ctx.track('box', { k: b.k, steady: pct });
        nextStep(b.k);
      }
      async function nextStep(k) {
        if (k + 1 < NL) {
          setHud('Loop ' + (k + 1) + ' done · ' + Math.round(scores[k] * 100) + '% in the light', 'A door opens', 'Bigger loop next, with a slower count.');
          if (k === 0) talk(still, LINES.box1, { mood: 'happy', moodMs: 1800, ms: 3000 });
          await K.wait(650); if (S.destroyed) return;
          FX.doorK = k + 1; FX.doorT = now; doorSound();
          const a = G.r[k], b = G.r[k + 1], dp = { x: G.cx - (a + b) / 2, y: G.cy + (a + b) / 2 };
          PS.emit('star', dp.x, dp.y, 10, { colors: ['#fff6d8', LC[0]], speed: [20, 90] });
          await K.wait(650); if (S.destroyed) return;
          roll = { fx: -a, fy: a, tx: -b, ty: b, t0: performance.now(), dur: 1200 };
          if (au()) { A.noise({ pink: true, filter: 'lowpass', freq: 380, dur: 1.2, attack: 0.2, vol: 0.06 }); }
          await K.wait(1250); if (S.destroyed) return;
          if (k === 0 && !TH.generic && TH.list[0]) talk(still, LINES.door, { mood: 'calm', ms: 3800 });
          else talk(rush, LINES.bigger, { mood: 'E74', moodMs: 1800, ms: 3000 });
          startLoop(k + 1);
        } else {
          setHud('Loop ' + (k + 1) + ' done · ' + Math.round(scores[k] * 100) + '% in the light', 'Steady', '');
          await K.wait(1300); if (S.destroyed) return;
          twist();
        }
      }

      /* ---------------- the twist: the walls turn and the square becomes a spiral that carries the marble ---------------- */
      async function twist() {
        stage = 'twist'; K.guide(null); guideSpec = null;
        setHud('Something’s moving', 'The walls are turning', 'The maze will carry you now.');
        hN.textContent = '';
        tiles.forEach(t => { t.classList.remove('on', 'done'); t.style.setProperty('--p', '0'); });
        talk(rush, LINES.twist, { mood: 'E71', ms: 2600 });
        rush.react('shake'); still.face('wow', 1400);
        twistSound();
        FX.turnOn = true; FX.revOn = true;
        await K.wait(2700); if (S.destroyed) return;
        talk(still, LINES.carry, { mood: 'meditate', ms: 4400 });
        spiral = { u: 0, U: SPN, T: SPT, idx: -1 };
        stage = 'spiral';
        setHud('Just breathe', null, 'The maze is carrying you.');
        K.guide({ id: 'ride', g: 'still', target: () => marbleScreen(), label: 'JUST BREATHE', once: true, delay: 1100, ms: 2400 });
        S.later(() => { if (!S.destroyed && stage === 'spiral') K.guide(null); }, 7600);
        S.later(() => { if (!S.destroyed && stage === 'spiral') talk(rush, LINES.ride, { mood: 'E59', ms: 3400 }); }, Math.min(SPN, 4) * SPT * 1000 + 600);
        if (au()) A.pad([N('D3'), N('A3'), N('E4'), N('F#4')], { dur: SPT * (SPN + 1) + 2, vol: 0.055, attack: 2 });
      }
      function spiralStep(rdt) {
        if (stage !== 'spiral' || !spiral) return;
        const s = spiral;
        s.u = Math.min(s.U + 1, s.u + rdt / s.T);
        const i = Math.min(s.U, Math.floor(s.u)), side = ((i % 4) + 4) % 4;
        if (i !== s.idx) {
          s.idx = i; onPhase(side, s.T, NL, true);
          if (i === s.U) setHud('Rolling home', null, 'Rest. The centre is right here.');
        }
        const left = Math.max(1, Math.ceil((i + 1 - s.u) * s.T - 0.05));
        if (left !== shownN) { shownN = left; hN.textContent = String(left); countTone(side, s.T - left, s.T, NL); }
        tiles[side].style.setProperty('--p', clamp(s.u - i, 0, 1).toFixed(3));
        if (Math.random() < rdt * 7) { const p = marbleScreen(); PS.emit('mote', p.x, p.y, 1, { colors: [LC[side], '#ffffff'], speed: [6, 26] }); }
        if (s.u >= s.U + 1) { stage = 'home'; finale(); }
      }

      /* ---------------- the finale: the maze unfolds into a mandala of light ---------------- */
      function results() {
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1, best = scores.length ? Math.max(...scores) : 1;
        const tier = K.tier(avg, [0.55, 0.75, 0.9]);
        const mk = tier ? MARBLES.find(m => m.tier === tier) : null;
        let col = null;
        if (mk) col = K.collect(mk.name);
        const have = MARBLES.filter((m, i) => i === 0 || (K.collection() || []).includes(m.name)).map(m => m.name);
        return { avg, best, pct: Math.round(avg * 100), bestPct: Math.round(best * 100), tier, mk, isNew: !!(col && col.isNew), have };
      }
      async function finale() {
        stage = 'finale'; K.guide(null); guideSpec = null;
        hN.textContent = ''; strip.classList.add('bm-off');
        FX.manOn = true;
        settleSound();
        const fin = K.finale('stars', { colors: ['#fff6d8', '#ffe39a', PCOL.dark[0], PCOL.dark[3]], chord: ['D4', 'F#4', 'A4', 'C#5'], ms: 5600, z: 26 });
        setHud('Centre', 'Steady', 'In, hold, out, hold. Equal counts.');
        still.base('glow'); talk(still, care ? LINES.care : LINES.centre, { mood: 'glow', ms: 4600 });
        RES = results();
        ctx.track('done', { steady: RES.pct, best: RES.bestPct, loops: NL, design: DES.key });
        await K.wait(2400); if (S.destroyed) return;
        rush.base('E55'); talk(rush, LINES.sleep, { mood: 'E55', ms: 3200 });
        await K.wait(1300); if (S.destroyed) return;
        showTray();
        await fin; await K.wait(700); if (S.destroyed) return;
        end();
      }
      function showTray() {
        const P = trayPos();
        if (!P.inBand) hud.classList.add('bm-off');
        FX.trayOn = true;
        const n = RES.have.length;
        cap.hidden = false; cap.textContent = '';
        cap.append(h('b', { text: RES.isNew ? 'New: ' + RES.mk.short + ' marble' : 'Your marbles: ' + n + ' of ' + MARBLES.length }),
          h('span', { text: RES.isNew ? 'Your tray: ' + n + ' of ' + MARBLES.length : n < MARBLES.length ? 'A steadier round earns the next one' : 'The full set. Today you rolled ' + MARB.short + '.' }));
        placeCap();
        cap.classList.remove('bm-in'); void cap.offsetWidth; cap.classList.add('bm-in');
        if (au()) { A.wood(undefined, 0.16, 1.1); A.chime(N('E6'), { vol: 0.05, dur: 1.8 }); }
      }
      function end() {
        if (finished) return;
        const R = RES || results(), badges = [];
        if (R.tier) badges.push(R.tier + ': ' + R.pct + '% in the light');
        const pb = K.best('box-' + inten, R.bestPct, 'higher');
        if (pb.isNew) badges.push('New best: ' + R.bestPct + '% steady box'); else if (pb.first) badges.push('Steadiest box: ' + R.bestPct + '%');
        if (R.isNew) badges.push('New marble: ' + R.mk.short + ' (' + R.have.length + ' of ' + MARBLES.length + ')');
        const spBoxes = Math.round((SPN + 1) / 4);
        finished = true; stage = 'end';
        ctx.finish({
          title: 'Steady', mood: 'glow',
          lines: [NL + ' boxes traced, then ' + spBoxes + (spBoxes === 1 ? ' box' : ' boxes') + ' on the spiral', 'In the light ' + R.pct + '% of the way', 'Today’s maze: ' + DES.name],
          share: 'Breathed my way through a 4-4-4-4 maze.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- frame ---------------- */
      function marbleStep(rdt) {
        const p = marbleLocal(), tx = G.cx + p.x, ty = G.cy + p.y;
        if (!MB.init) { MB.x = tx; MB.y = ty; MB.init = true; }
        const k = 1 - Math.exp(-rdt * 22), ox = MB.x, oy = MB.y;
        MB.x += (tx - MB.x) * k; MB.y += (ty - MB.y) * k;
        const d = Math.hypot(MB.x - ox, MB.y - oy);
        MB.roll += d / Math.max(4, G.mr) * ((MB.x - ox) + (oy - MB.y) >= 0 ? 1 : -1);
        MB.speed += (d / Math.max(0.001, rdt) - MB.speed) * Math.min(1, rdt * 8);
        MB.tap = Math.max(0, MB.tap - rdt * 4);
        let want = 0.3, col = MB.col;
        if (stage === 'trace' && box) { if (!box.started) { want = 0.6; col = LC[0]; } else { col = LC[Math.min(3, Math.floor(box.g))]; want = Math.abs(box.m - box.g) * Lk() <= tolPx() ? 1 : 0.1; } }
        else if (stage === 'spiral' || stage === 'home') { col = LC[spiralSide()]; want = 1; }
        else if (stage === 'finale' || stage === 'end') { col = '#fff1c8'; want = 1; }
        else if (stage === 'door' || stage === 'twist') want = 0.75;
        MB.lit += (want - MB.lit) * Math.min(1, rdt * 6); MB.col = col;
        if (roller) { const sp = finger || stage === 'spiral' ? MB.speed : MB.speed * 0.6; roller.level(Math.min(0.085, sp / (G.sp * 3.2) * 0.085), 0.08); roller.freq(170 + Math.min(500, sp * 1.2), 0.1); }
      }
      function fxStep(rdt) {
        if (FX.turnOn) {
          FX.turn = Math.min(1, FX.turn + rdt / 2.2);
          for (let k = 0; k < NL; k++) FX.rot[k] += rdt * FX.turn * (k % 2 ? -1 : 1) * (0.14 + 0.07 * k) * (RED ? 0.35 : 1);
          const wa = stage === 'twist' ? 0.62 : stage === 'spiral' || stage === 'home' ? 0.3 : 0;
          FX.wallA += (wa - FX.wallA) * Math.min(1, rdt * (stage === 'finale' || stage === 'end' ? 2.4 : 1.3));
        }
        if (FX.revOn) FX.rev = Math.min(1, FX.rev + rdt / 2.4);
        if (FX.manOn) FX.man = Math.min(1, FX.man + rdt / 2.8);
        if (FX.trayOn) FX.tray = Math.min(1, FX.tray + rdt * 2.5);
      }
      function segPath(g, r, u0, u1) {
        let p = sqPt(u0, r); g.moveTo(G.cx + p.x, G.cy + p.y);
        for (let c = Math.floor(u0) + 1; c < u1; c++) { p = sqPt(c, r); g.lineTo(G.cx + p.x, G.cy + p.y); }
        p = sqPt(u1, r); g.lineTo(G.cx + p.x, G.cy + p.y);
      }
      function spiralPath(g, u0, u1) {
        let first = true;
        for (let s = Math.floor(u0); s < u1; s++) {
          const a = Math.max(u0, s), b = Math.min(u1, s + 1), n = Math.max(1, Math.ceil((b - a) * 10));
          for (let i = 0; i <= n; i++) { const p = spiralPt(a + (b - a) * i / n); if (first) { g.moveTo(G.cx + p.x, G.cy + p.y); first = false; } else g.lineTo(G.cx + p.x, G.cy + p.y); }
        }
      }
      function glowStroke(g, D, col, wide, core, a) {
        g.strokeStyle = col; g.globalAlpha = (D ? 0.2 : 0.14) * a; g.lineWidth = wide; g.stroke();
        g.globalAlpha = (D ? 0.9 : 0.85) * a; g.lineWidth = core; g.stroke();
      }
      function drawLit(g) {
        const D = K.dark(), pc = LC, gw = G.gw, fade = stage === 'trace' || stage === 'door' ? 1 : Math.max(0, FX.wallA * 1.4 - 0.15 - FX.man);
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < NL; k++) {
          if (!lit[k] || fade <= 0.01) continue;
          const fl = FX.flashK === k ? Math.max(0, 1 - (now - FX.flashT) / 1.5) : 0;
          for (let s = 0; s < 4; s++) { g.beginPath(); segPath(g, G.r[k], s, s + 1); glowStroke(g, D, pc[s], gw * 0.78, Math.max(1.6, gw * 0.12), fade * (0.62 + fl * 0.5)); }
        }
        if (box && stage === 'trace' && !lit[box.k]) {
          const r = G.r[box.k];
          for (let s = 0; s < 4; s++) { const u1 = Math.min(s + 1, box.g); if (u1 <= s) break; g.beginPath(); segPath(g, r, s, u1); glowStroke(g, D, pc[s], gw * 0.8, Math.max(1.7, gw * 0.14), 1); }
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
          if (box.g < 4) { g.setLineDash([2, gw * 0.55]); g.strokeStyle = D ? 'rgba(255, 244, 220, 0.38)' : 'rgba(255, 246, 228, 0.5)'; g.lineWidth = Math.max(1.4, gw * 0.09); g.beginPath(); segPath(g, r, box.g, 4); g.stroke(); g.setLineDash([]); }
        }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
      function drawWalls(g) {
        const a = clamp(FX.wallA - FX.man * 0.6, 0, 1); if (a <= 0.01 || !C) return;
        for (let k = 0; k < NL; k++) {
          const R = C.rings[k], rot = FX.rot[k], sc = 1 + FX.man * 0.5 * (k + 1) / NL;
          g.globalAlpha = a;
          if (rot || sc !== 1) { g.save(); g.translate(G.cx, G.cy); g.rotate(rot); g.scale(sc, sc); g.drawImage(R.c, -R.half, -R.half, R.half * 2, R.half * 2); g.restore(); }
          else g.drawImage(R.c, G.cx - R.half, G.cy - R.half, R.half * 2, R.half * 2);
        }
        g.globalAlpha = 1;
      }
      /* A closed door is exactly the piece of wall the passage was cut from (the channel clipped to the wall ring),
         a shade lighter with brass studs; it sinks away with a breath of light when the box before it is done. */
      function drawDoors(g) {
        const D = K.dark(), W = D ? DES.wood : DES.woodB, IN = D ? DES.inlay[0] : DES.inlay[1], gw = G.gw;
        for (let k = 1; k < NL; k++) {
          const o = FX.doorK >= k ? clamp((now - (FX.doorK === k ? FX.doorT : -99)) / 0.7, 0, 1) : 0;
          if (o >= 1 || FX.rot[k]) continue;
          const a = G.r[k - 1], b = G.r[k], aOut = b - gw / 2, aIn = a + gw / 2, rO = Math.min(gw * 0.28, (aOut - aIn) * 0.35), rI = rO * 0.6;
          g.save(); g.translate(G.cx, G.cy);
          if (o > 0) { g.globalAlpha = Math.sin(o * Math.PI) * 0.9; const s = gw * 1.7, m = (a + b) / 2; g.drawImage(K.glowSprite('rgba(255, 240, 200, 0.9)'), -m - s, m - s, 2 * s, 2 * s); }
          g.beginPath(); rrSub(g, -aOut, -aOut, 2 * aOut, 2 * aOut, rO); rrSub(g, -aIn, -aIn, 2 * aIn, 2 * aIn, rI); g.clip('evenodd');
          g.globalAlpha = 1 - o;
          const sw = gw * 1.02 * (1 - o * 0.7);
          g.lineCap = 'butt'; g.lineWidth = sw; g.strokeStyle = W[0]; g.beginPath(); g.moveTo(-a, a); g.lineTo(-b, b); g.stroke();
          g.lineWidth = 1; g.strokeStyle = D ? 'rgba(0, 0, 0, 0.5)' : 'rgba(110, 70, 30, 0.4)';
          [-1, 1].forEach(q => { const ox = q * sw / 2 * Math.SQRT1_2; g.beginPath(); g.moveTo(-a + ox, a + ox); g.lineTo(-b + ox, b + ox); g.stroke(); });
          g.fillStyle = IN; const m = (a + b) / 2;
          [-0.24, 0.24].forEach(q => { const ox = q * sw * Math.SQRT1_2; g.beginPath(); g.arc(-m + ox, m + ox, Math.max(1.3, gw * 0.075), 0, TAU); g.fill(); });
          g.restore();
        }
        g.globalAlpha = 1;
      }
      function drawSpiral(g) {
        if (FX.rev <= 0.001) return;
        const D = K.dark(), pc = LC, U = spiral ? spiral.U : SPN, end = U * easeIO(FX.rev), gw = G.gw, fade = 1 - FX.man;
        if (fade <= 0.01) return;
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.globalAlpha = fade; g.strokeStyle = D ? 'rgba(0, 0, 0, 0.42)' : 'rgba(70, 40, 15, 0.4)'; g.lineWidth = gw * 0.72;
        g.beginPath(); spiralPath(g, 0, end); g.stroke();
        const u = spiral ? Math.min(U, spiral.u) : 0;
        g.setLineDash([2, gw * 0.5]); g.strokeStyle = D ? 'rgba(255, 244, 220, 0.4)' : 'rgba(255, 246, 228, 0.55)'; g.lineWidth = Math.max(1.3, gw * 0.09);
        if (end > u) { g.beginPath(); spiralPath(g, u, end); g.stroke(); }
        g.setLineDash([]);
        if (u > 0) { g.globalCompositeOperation = 'lighter'; for (let s = 0; s < u; s++) { g.beginPath(); spiralPath(g, s, Math.min(s + 1, u)); glowStroke(g, D, pc[s % 4], gw * 0.75, Math.max(1.6, gw * 0.13), fade); } g.globalCompositeOperation = 'source-over'; }
        g.globalAlpha = 1;
      }
      /* How full the breath is right now (0 empty, 1 full): the light swells on the in-breath and shrinks on the out-breath. */
      function breathK() {
        let s = -1, f = 0;
        if (stage === 'trace' && box && box.started) { s = Math.min(3, Math.floor(box.g)); f = box.g >= 4 ? 1 : box.g - s; }
        else if ((stage === 'spiral' || stage === 'home') && spiral) { const i = Math.min(spiral.U, Math.floor(spiral.u)); s = ((i % 4) + 4) % 4; f = clamp(spiral.u - i, 0, 1); }
        return s === 0 ? easeIO(f) : s === 1 ? 1 : s === 2 ? 1 - easeIO(f) : 0;
      }
      function drawGlow(g, t) {
        const p = glowLocal(); if (!p) return;
        const D = K.dark(), col = glowCol(), x = G.cx + p.x, y = G.cy + p.y, bk = breathK(), pulse = 1 + 0.03 * Math.sin(t * 2.3), spr = K.glowSprite(col);
        g.globalCompositeOperation = 'lighter';
        let s = G.sp * (1.45 + 0.75 * bk) * pulse; g.globalAlpha = (D ? 0.24 : 0.2) + 0.1 * bk; g.drawImage(spr, x - s, y - s, 2 * s, 2 * s);
        s = G.gw * (1.05 + 0.5 * bk) * pulse; g.globalAlpha = D ? 0.85 : 0.72; g.drawImage(spr, x - s, y - s, 2 * s, 2 * s);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawMarble(g, t) {
        const r = G.mr * (1 + MB.tap * 0.14) * (stage === 'finale' || stage === 'end' ? 1.2 + 0.05 * Math.sin(t * TAU / 8) : 1), x = MB.x, y = MB.y, D = K.dark();
        g.globalAlpha = D ? 0.6 : 0.35; g.drawImage(K.glowSprite('rgba(0, 0, 0, 0.9)'), x - r * 1.05 + r * 0.3, y - r * 0.85 + r * 0.5, r * 2.1, r * 1.7); g.globalAlpha = 1;
        if (MB.lit > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = MB.lit * (D ? 0.85 : 0.62); const s = r * 3.2; g.drawImage(K.glowSprite(MB.col), x - s, y - s, s * 2, s * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        const spr = marbleSprite(MARB, G.mr);
        g.save(); g.translate(x, y); g.rotate(MB.roll); const sc = r / G.mr; g.scale(sc, sc); g.drawImage(spr.c, -spr.r, -spr.r, spr.r * 2, spr.r * 2); g.restore();
        if (MB.lit > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = MB.lit * (D ? 0.6 : 0.45); g.drawImage(K.glowSprite(MB.col), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        g.fillStyle = 'rgba(255, 255, 255, 0.9)'; g.beginPath(); g.ellipse(x - r * 0.36, y - r * 0.4, r * 0.28, r * 0.17, -0.62, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255, 255, 255, 0.35)'; g.beginPath(); g.ellipse(x + r * 0.34, y + r * 0.42, r * 0.16, r * 0.09, -0.62, 0, TAU); g.fill();
      }
      function drawMandala(g, t) {
        const k = FX.man; if (k <= 0.001) return;
        const D = K.dark(), pc = LC, cx = G.cx, cy = G.cy, A0 = G.A;
        // the room dims inside the inlay as the light comes up
        g.save(); g.globalAlpha = (D ? 0.5 : 0.62) * easeOut(k); g.fillStyle = D ? '#04030b' : '#22140a'; rr(g, cx - G.mid, cy - G.mid, 2 * G.mid, 2 * G.mid, G.S * 0.025); g.fill(); g.restore();
        g.save(); g.globalCompositeOperation = 'lighter';
        const bs = A0 * 1.35; g.globalAlpha = 0.42 * k; g.drawImage(K.glowSprite('rgba(255, 236, 190, 0.65)'), cx - bs, cy - bs, bs * 2, bs * 2);
        const nr = 16; g.globalAlpha = 0.12 * k;
        for (let i = 0; i < nr; i++) { const a = i / nr * TAU + t * 0.045, L = A0 * 1.08; g.fillStyle = pc[i % 4]; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - 0.06) * L, cy + Math.sin(a - 0.06) * L); g.lineTo(cx + Math.cos(a + 0.06) * L, cy + Math.sin(a + 0.06) * L); g.closePath(); g.fill(); }
        // four rings of petals, one per breath colour pairing (in with out, hold with hold), turning against each other
        MANDALA.forEach((rg, j) => {
          const e = easeOut(clamp(k * 1.7 - j * 0.2, 0, 1)); if (e <= 0) return;
          const R = A0 * rg.f, len = A0 * rg.len * e, wid = len * rg.wid, rot = rg.sp * t * (RED ? 0.3 : 1) + j * 0.39;
          g.globalAlpha = 0.16 * e; g.strokeStyle = pc[j]; g.lineWidth = len * 0.95; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
          for (let i = 0; i < rg.n; i++) {
            const a = rot + i / rg.n * TAU, ca = Math.cos(a), sa = Math.sin(a), px = cx + ca * R, py = cy + sa * R;
            g.fillStyle = pc[(i % 2 ? j + 2 : j) % 4]; g.globalAlpha = 0.66 * e;
            g.beginPath(); g.moveTo(px - ca * len * 0.5, py - sa * len * 0.5);
            g.quadraticCurveTo(px - sa * wid, py + ca * wid, px + ca * len * 0.5, py + sa * len * 0.5);
            g.quadraticCurveTo(px + sa * wid, py - ca * wid, px - ca * len * 0.5, py - sa * len * 0.5); g.fill();
            g.globalAlpha = 0.55 * e; g.strokeStyle = 'rgba(255, 252, 240, 0.95)'; g.lineWidth = Math.max(0.8, len * 0.045);
            g.beginPath(); g.moveTo(px - ca * len * 0.3, py - sa * len * 0.3); g.lineTo(px + ca * len * 0.34, py + sa * len * 0.34); g.stroke();
            const b = a + Math.PI / rg.n, br = R + len * 0.4;
            g.globalAlpha = 0.8 * e; g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(cx + Math.cos(b) * br, cy + Math.sin(b) * br, Math.max(1.2, len * 0.065), 0, TAU); g.fill();
          }
          g.globalAlpha = 0.5 * e; g.strokeStyle = '#ffe7a8'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R + len * 0.62, 0, TAU); g.stroke();
        });
        // the centre: a small star of light the marble rests in
        const cs = G.mR * (0.9 + 0.08 * Math.sin(t * TAU / 8)) * k; g.globalAlpha = 0.85 * k; g.fillStyle = 'rgba(255, 246, 220, 0.9)';
        K.starPath(g, cx, cy, cs, cs * 0.3, 8, t * 0.05); g.fill();
        g.restore();
      }
      const MANDALA = [
        { n: 8, f: 0.3, len: 0.3, wid: 0.5, sp: 0.06 },
        { n: 12, f: 0.5, len: 0.25, wid: 0.44, sp: -0.045 },
        { n: 16, f: 0.69, len: 0.21, wid: 0.4, sp: 0.035 },
        { n: 24, f: 0.88, len: 0.15, wid: 0.36, sp: -0.025 }
      ];
      function drawTray(g, t) {
        if (FX.tray <= 0.01 || !RES) return;
        const D = K.dark(), P = trayPos(), n = MARBLES.length, r = trayR(), gap = r * 2.9, w = gap * (n - 1) + r * 3.2, hh = r * 3, a = FX.tray, W = D ? DES.wood : DES.woodB;
        g.globalAlpha = a;
        g.fillStyle = 'rgba(0, 0, 0, 0.3)'; rr(g, P.x - w / 2 + 2, P.y - hh / 2 + 4, w, hh, hh / 2); g.fill();
        const gr = g.createLinearGradient(0, P.y - hh / 2, 0, P.y + hh / 2); gr.addColorStop(0, W[0]); gr.addColorStop(1, W[2]);
        g.fillStyle = gr; rr(g, P.x - w / 2, P.y - hh / 2, w, hh, hh / 2); g.fill();
        g.strokeStyle = D ? DES.inlay[0] : DES.inlay[1]; g.globalAlpha = a * 0.7; g.lineWidth = 1; rr(g, P.x - w / 2 + 3, P.y - hh / 2 + 3, w - 6, hh - 6, hh / 2 - 3); g.stroke(); g.globalAlpha = a;
        MARBLES.forEach((M, i) => {
          const x = P.x + (i - (n - 1) / 2) * gap, y = P.y;
          g.fillStyle = D ? 'rgba(0, 0, 0, 0.45)' : 'rgba(90, 55, 20, 0.3)'; g.beginPath(); g.arc(x + 0.5, y + 1, r * 1.08, 0, TAU); g.fill();
          if (!RES.have.includes(M.name)) { g.strokeStyle = D ? 'rgba(255, 240, 220, 0.3)' : 'rgba(60, 40, 20, 0.3)'; g.setLineDash([2, 3]); g.beginPath(); g.arc(x, y, r * 0.9, 0, TAU); g.stroke(); g.setLineDash([]); return; }
          if (RES.mk && M.name === RES.mk.name && RES.isNew) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * (0.5 + 0.3 * Math.sin(t * 3)); const s = r * 3; g.drawImage(K.glowSprite('rgba(255, 230, 160, 0.9)'), x - s, y - s, 2 * s, 2 * s); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; }
          const spr = marbleSprite(M, r); g.drawImage(spr.c, x - spr.r, y - spr.r, spr.r * 2, spr.r * 2);
          g.fillStyle = 'rgba(255, 255, 255, 0.9)'; g.beginPath(); g.ellipse(x - r * 0.36, y - r * 0.4, r * 0.26, r * 0.16, -0.62, 0, TAU); g.fill();
        });
        g.globalAlpha = 1;
      }
      function draw(g, dt, t) {
        if (!C) buildCaches();
        g.drawImage(C.bg.c, 0, 0, G.w, G.H);
        drawLit(g);
        drawWalls(g);
        drawDoors(g);
        drawSpiral(g);
        drawMandala(g, t);
        drawGlow(g, t);
        drawMarble(g, t);
        PS.update(dt); PS.draw(g);
        drawTray(g, t);
      }
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !G.w) return;
        const nowMs = performance.now(), rdt = Math.min(0.1, Math.max(0, (nowMs - lastMs) / 1000)); lastMs = nowMs;
        now = nowMs / 1000;
        qual.acc += rdt; qual.n++;
        if (qual.n >= 120) { if (qual.acc / qual.n > 0.034 && qual.q > 0.81) { qual.q = Math.max(0.8, qual.q - 0.1); cv.setQuality(qual.q); } qual.acc = qual.n = 0; }
        traceStep(rdt);
        spiralStep(rdt);
        fxStep(rdt);
        marbleStep(rdt);
        airStep();
        draw(g, dt, t);
      });

      S.on('theme', () => { setColors(); C = null; for (const k in MSPR) delete MSPR[k]; });
      cv.onResize(() => { layout(); for (const k in MSPR) delete MSPR[k]; });

      /* ---------------- flow ---------------- */
      (async () => {
        await K.intro({ title: 'Breath Maze', sub: 'A carved maze that breathes. Roll the marble round each square at the pace of the light.', how: 'Drag the marble with the light: up to breathe in, across to hold, down to breathe out, back to hold.', char: 'still', mood: 'calm' });
        if (S.destroyed) return;
        stage = 'hello';
        setHud(DES.name + ' · today', 'Breath Maze', 'Four sides. Four equal counts.');
        talk(still, LINES.hello, { mood: 'calm', ms: 4200 });
        rush.face('E04');
        await K.wait(2600); if (S.destroyed) return;
        talk(rush, visits > 1 ? LINES.rushBack : LINES.rushHello, { mood: 'E04', ms: 2800 });
        await K.wait(1600); if (S.destroyed) return;
        startLoop(0);
      })();

      return {
        async autoplay() {
          while (stage !== 'trace') await K.wait(100);
          for (let k = 0; k < NL; k++) {
            while (!(stage === 'trace' && box && box.k === k)) await K.wait(80);
            await K.wait(450);
            let f = marbleScreen();
            const hnd = await K.sim.press(touch, f.x, f.y);
            while (stage === 'trace' && box && box.k === k) {
              await K.wait(45);
              if (stage !== 'trace' || !box) break;
              const r = G.r[k], want = Math.min(4, (box.started ? box.g : 0) + 0.05), cur = sqPt(box.m, r), tgt = sqPt(want, r);
              f = { x: f.x + (tgt.x - cur.x), y: f.y + (tgt.y - cur.y) };
              hnd.move(f.x, f.y);
            }
            hnd.up(f.x, f.y);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
