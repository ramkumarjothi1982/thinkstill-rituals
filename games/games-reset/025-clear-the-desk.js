/* 025 Clear the Desk — Reset · ORGANISE · Mental Overload / Working Memory
 * Mechanism: cognitive offloading and triage (Risko & Gilbert 2016). Getting each looping thought out of your head and onto
 * paper frees working memory; deciding NOW, LATER or NOT MINE for each one turns a jumble into a short list, and splitting a
 * big worry into its parts (problem decomposition) shrinks it into things that each have a place. Naming the one thing to
 * do next makes starting obvious (implementation intention).
 * Verb: flick (sticky notes slide with real friction into three drawer trays; each sort tidies one thing on the desk).
 * Twist: the big worry is a stack of notes glued together; peel them apart to find three small, separate things inside.
 * Finale: one NOW note is pinned in the middle of the cleared desk, the drawers slide shut in sequence, the last of the
 * clutter squares itself away and the lamp clicks on.
 * Come back: a different desk every day (wood, organiser, mug), desk treasures that join the desk over visits (K.collect),
 * a personal best for clean flicks (K.best) and Bronze / Silver / Gold tiers (K.tier). Nothing is ever lost or failed.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;

  /* Today's desk: wood, organiser, desk pad, mug and lamp change every day. */
  const DESKS = [
    { id: 'oak', name: 'the oak desk', wood: [[201, 151, 98], [148, 102, 58], [232, 194, 140]], plank: 72,
      org: { cab: 'linear-gradient(180deg, #a86f40 0%, #8a5630 60%, #6e4221 100%)', floor: 'linear-gradient(180deg, #3e2312 0%, #5e3a1e 100%)', front: 'linear-gradient(180deg, #c48650 0%, #9c6034 100%)', rim: '#8a5530' },
      pad: 'cork', mug: '#e8735a', lamp: '#2f6b4f', amb: 'room' },
    { id: 'walnut', name: 'the walnut desk', wood: [[118, 80, 54], [74, 46, 30], [156, 110, 76]], plank: 58,
      org: { cab: 'linear-gradient(180deg, #4a4f58 0%, #30343b 70%, #24272c 100%)', floor: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 9px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 9px), linear-gradient(180deg, #121418 0%, #2a2d33 100%)', front: 'linear-gradient(180deg, #59606a 0%, #363a42 100%)', rim: '#2b2e34' },
      pad: 'felt', mug: '#f3efe6', lamp: '#c9a24a', amb: 'rain' },
    { id: 'birch', name: 'the birch desk', wood: [[226, 202, 162], [184, 152, 110], [246, 230, 200]], plank: 88,
      org: { cab: 'linear-gradient(180deg, #a9dccb 0%, #7fc4ae 100%)', floor: 'linear-gradient(180deg, #3f7d6c 0%, #64a893 100%)', front: 'linear-gradient(180deg, #c2eadc 0%, #8fcdb9 100%)', rim: '#77b9a5' },
      pad: 'cork', mug: '#f2b63d', lamp: '#eeeae2', amb: 'dawn' },
    { id: 'cherry', name: 'the cherry desk', wood: [[166, 94, 64], [112, 56, 36], [204, 132, 96]], plank: 66,
      org: { cab: 'linear-gradient(180deg, #e2c07a 0%, #b38b3e 100%)', floor: 'linear-gradient(180deg, #17302a 0%, #2c5243 100%)', front: 'linear-gradient(180deg, #ebcb87 0%, #b8923f 100%)', rim: '#a8823a' },
      pad: 'leather', mug: '#4f7ee8', lamp: '#2a2d33', amb: 'rain' }
  ];
  /* Desk treasures: one more joins the desk after each finished visit (never random). */
  const TREASURES = [{ id: 'cat', name: 'Lucky Cat' }, { id: 'cactus', name: 'Tiny Cactus' }, { id: 'globe', name: 'Snow Globe' },
    { id: 'duck', name: 'Rubber Duck' }, { id: 'radio', name: 'Pocket Radio' }, { id: 'stone', name: 'Worry Stone' }];
  /* What a big worry usually comes apart into. Structure only: never facts about the player's life. */
  const PIECES = {
    todo: ['THE FIRST SMALL BIT', 'THE BITS THAT CAN WAIT', 'SOMEONE ELSE’S PART'],
    whatif: ['WHAT’S TRUE TODAY', 'WHAT MIGHT NOT HAPPEN', 'ONE THING I CAN DO'],
    worstcase: ['WHAT’S TRUE TODAY', 'THE WORST-CASE MOVIE', 'ONE THING I CAN DO'],
    mindread: ['WHAT ACTUALLY HAPPENED', 'MY GUESS AT THEIR THOUGHTS', 'WHAT I COULD ASK'],
    replay: ['WHAT HAPPENED', 'WHAT I’D TRY NEXT TIME', 'THE REPLAY ITSELF'],
    shouldhave: ['WHAT HAPPENED', 'WHAT I’D TRY NEXT TIME', 'THE TELLING-OFF'],
    body: ['THE FEELING IN MY BODY', 'THE STORY ABOUT IT', 'ONE SLOW BREATH OUT'],
    urge: ['THE URGE ITSELF', 'WHAT I ACTUALLY NEED', 'WAITING TEN MINUTES'],
    other: ['THE THING DUE FIRST', 'THE THINGS THAT CAN WAIT', 'OTHER PEOPLE’S STUFF'],
    care: ['WHAT I KNOW SO FAR', 'WHAT I’M WAITING TO HEAR', 'WHO CAN HELP ME CHECK']
  };
  /* Example notes (shown as index cards marked EXAMPLE) when the player's own words run out. */
  const EXTRA = [{ label: 'REPLY TO EVERYONE', loop: 'todo' }, { label: 'FIX IT ALL TODAY', loop: 'todo' }, { label: 'THE GROUP CHAT', loop: 'mindread' }, { label: 'WHAT IF I FORGET', loop: 'whatif' }];
  const PAPERS = [['#fff47e', '#ffe24f'], ['#ffc7da', '#ffa9c5'], ['#bde6ff', '#98d4fb'], ['#d0f4ad', '#b2e88e'], ['#ffd8a6', '#ffc27c'], ['#e2d6ff', '#cbbcff']];
  const HOT = ['#ffbf98', '#ff9d6a'];
  const TRAYS = [{ name: 'NOW', col: '#dc4e2c' }, { name: 'LATER', col: '#1c8597' }, { name: 'NOT MINE', col: '#7360cc' }];
  const TIDY = ['cable', 'mug', 'balls', 'pens', 'papers', 'phone', 'books', 'crumbs'];

  (env.games = env.games || []).push({
    id: 'clear-the-desk', mode: 'reset', name: 'Clear the Desk', verb: 'flick', family: 'ORGANISE', minutes: 2,
    parents: ['Mental Overload / Working Memory', 'Getting Started', 'Decision Pressure'],
    cast: ['patch', 'rush'], poster: { char: 'patch', mood: 'think' },
    fonts: ['Kalam:wght@400;700', 'Archivo+Narrow:wght@600;700'],
    tagline: 'Flick every sticky note into NOW, LATER or NOT MINE. Pin one up.',
    why: 'For too many tabs open: sort the jumble into trays and the next step gets obvious.',
    css: `
.g-clear-the-desk { --cd-hand: "Kalam", "Patrick Hand", "Segoe Print", "Bradley Hand", "Chalkboard SE", var(--font-ui, "Trebuchet MS", sans-serif); --cd-label: "Archivo Narrow", "Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif; --cd-ns: 112px; --cd-ss: 126px; --cd-ink: #20263a; }
.g-clear-the-desk .cd-probe { position: absolute; left: 0; top: env(safe-area-inset-top, 0px); width: 1px; height: 1px; visibility: hidden; pointer-events: none; }
.g-clear-the-desk .cd-fx { z-index: 26; }
.g-clear-the-desk .cd-org { position: absolute; z-index: 6; pointer-events: none; }
.g-clear-the-desk .cd-cab { position: absolute; left: -2px; right: -2px; top: 0; z-index: 3; border-radius: 5px 5px 13px 13px; background: var(--cd-cab);
  box-shadow: 0 9px 14px rgba(12, 6, 0, 0.4), inset 0 -4px 0 rgba(0, 0, 0, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.18); }
.g-clear-the-desk .cd-cab::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: 9px; height: 2px; border-radius: 2px; background: rgba(0, 0, 0, 0.16); box-shadow: 0 1px 0 rgba(255, 255, 255, 0.14); }
.g-clear-the-desk .cd-slot { position: absolute; left: -6px; right: -6px; overflow: hidden; z-index: 2; }
.g-clear-the-desk .cd-tray { position: absolute; top: 0; transition: transform 0.62s cubic-bezier(.55, 0, .2, 1); }
.g-clear-the-desk .cd-tray.cd-shut { transform: translateY(calc(var(--cd-fh) * -1)); }
.g-clear-the-desk .cd-tray.cd-bump { animation: clear-the-desk-bump 0.44s cubic-bezier(.2, 1.4, .4, 1); }
.g-clear-the-desk .cd-floor { position: absolute; left: 0; right: 0; top: 0; height: var(--cd-fh); overflow: hidden; background: var(--cd-floor); border-left: 5px solid var(--cd-rim); border-right: 5px solid var(--cd-rim);
  box-shadow: inset 0 15px 18px rgba(0, 0, 0, 0.45), inset 8px 0 10px rgba(0, 0, 0, 0.24), inset -8px 0 10px rgba(0, 0, 0, 0.24); transition: box-shadow 0.16s ease; }
.g-clear-the-desk .cd-tray.cd-hot .cd-floor { box-shadow: inset 0 15px 18px rgba(0, 0, 0, 0.45), inset 0 0 0 3px var(--cd-tc), inset 0 0 30px color-mix(in srgb, var(--cd-tc) 70%, transparent); }
.g-clear-the-desk .cd-front { position: absolute; left: -3px; right: -3px; top: var(--cd-fh); height: var(--cd-frh); border-radius: 3px 3px 9px 9px; background: var(--cd-front);
  box-shadow: 0 7px 10px rgba(12, 6, 0, 0.42), inset 0 2px 0 rgba(255, 255, 255, 0.26), inset 0 -3px 0 rgba(0, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; }
.g-clear-the-desk .cd-tape { font: 700 14px/1 var(--cd-label); letter-spacing: 0.12em; color: #fff; background: var(--cd-tc); padding: 5px 8px 4px; border-radius: 3px; white-space: nowrap;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.38); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.22), 0 1px 2px rgba(0, 0, 0, 0.4); transition: transform 0.2s cubic-bezier(.2, 1.6, .4, 1); }
.g-clear-the-desk .cd-tray.cd-hot .cd-tape { transform: scale(1.1); }
.g-clear-the-desk .cd-count { position: absolute; z-index: 5; right: -2px; top: calc(var(--cd-fh) - 15px); min-width: 24px; height: 24px; padding: 0 7px; border-radius: 12px; font: 700 13px/24px var(--cd-label); text-align: center; color: #fff;
  background: var(--cd-tc); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3); opacity: 0; transform: scale(0.6); transition: opacity 0.2s ease, transform 0.3s cubic-bezier(.2, 1.7, .4, 1); }
.g-clear-the-desk .cd-count.on { opacity: 1; transform: none; }
.g-clear-the-desk .cd-tray.cd-shut .cd-count { opacity: 0; transform: scale(0.6); }
.g-clear-the-desk .cd-note.cd-pinned .cd-nk { padding-left: 18px; }
.g-clear-the-desk .cd-layer { position: absolute; inset: 0; z-index: 12; pointer-events: none; }
.g-clear-the-desk .cd-note { position: absolute; left: 0; top: 0; width: var(--cd-ns); height: var(--cd-ns); padding: 18px 6px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; color: var(--cd-ink); border-radius: 2px 2px 8px 3px; background: linear-gradient(170deg, var(--cd-p1, #fff47e) 0%, var(--cd-p2, #ffe24f) 100%);
  box-shadow: 0 1px 1px rgba(30, 16, 4, 0.3), 0 3px 8px rgba(30, 16, 4, 0.24); pointer-events: auto; touch-action: none; cursor: grab; will-change: transform; outline: none;
  transition: box-shadow 0.14s ease; -webkit-tap-highlight-color: transparent; }
.g-clear-the-desk .cd-note::before, .g-clear-the-desk .cd-face::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 24%; border-radius: 2px 2px 0 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(60, 40, 0, 0.08), rgba(60, 40, 0, 0)); }
.g-clear-the-desk .cd-note::after, .g-clear-the-desk .cd-face::after { content: ""; position: absolute; right: 0; bottom: 0; width: 30%; height: 30%; border-radius: 0 0 8px 0; pointer-events: none;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0) 50%, rgba(40, 20, 0, 0.1) 72%, rgba(255, 255, 255, 0.4) 100%); }
.g-clear-the-desk .cd-note.cd-lift { box-shadow: 0 9px 10px rgba(30, 16, 4, 0.2), 0 22px 30px rgba(30, 16, 4, 0.3); cursor: grabbing; }
.g-clear-the-desk .cd-note.cd-card { background: linear-gradient(180deg, transparent 0, transparent 27px, rgba(226, 84, 84, 0.5) 27px, rgba(226, 84, 84, 0.5) 28.5px, transparent 28.5px),
  repeating-linear-gradient(180deg, transparent 0 19px, rgba(64, 120, 210, 0.2) 19px 20px), linear-gradient(170deg, #fffdf6, #efece0); border-radius: 3px; }
.g-clear-the-desk .cd-note.cd-card::before { display: none; }
.g-clear-the-desk .cd-note.cd-hero { box-shadow: 0 2px 2px rgba(30, 16, 4, 0.3), 0 10px 22px rgba(30, 16, 4, 0.34), 0 0 0 3px rgba(255, 236, 170, 0.0); }
.g-clear-the-desk .cd-nt { font: 700 17px/1.07 var(--cd-hand); text-wrap: balance; overflow-wrap: anywhere; max-width: 100%; position: relative; }
.g-clear-the-desk .cd-nt.cd-long { font-size: 15px; }
.g-clear-the-desk .cd-card .cd-nt { font-weight: 400; color: #2c3350; }
.g-clear-the-desk .cd-nk { position: absolute; left: 0; right: 0; top: 6px; font: 700 12px/1 var(--cd-label); letter-spacing: 0.1em; text-transform: uppercase; color: rgba(32, 38, 58, 0.62); text-align: center; }
.g-clear-the-desk .cd-note:focus-visible, .g-clear-the-desk .cd-stack:focus-visible { box-shadow: 0 0 0 3px #fff, 0 0 0 6px #3a7bff; }
.g-clear-the-desk .cd-stack { position: absolute; left: 0; top: 0; width: var(--cd-ss); height: var(--cd-ss); pointer-events: auto; touch-action: none; cursor: grab; will-change: transform; perspective: 700px; outline: none;
  --cd-p1: ${HOT[0]}; --cd-p2: ${HOT[1]}; }
.g-clear-the-desk .cd-sl { position: absolute; inset: 0; border-radius: 2px 2px 8px 3px; background: linear-gradient(170deg, var(--cd-p1), var(--cd-p2)); }
.g-clear-the-desk .cd-sl.l3 { transform: translate(8px, 11px) rotate(2.6deg); box-shadow: 0 3px 10px rgba(30, 16, 4, 0.34); background: linear-gradient(170deg, #f2a77a, #e98a55); }
.g-clear-the-desk .cd-sl.l2 { transform: translate(4px, 5px) rotate(-1.4deg); box-shadow: 0 2px 4px rgba(30, 16, 4, 0.28); background: linear-gradient(170deg, #f7b085, #f1955f); }
.g-clear-the-desk .cd-sl.cd-under { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 7px 12px; color: var(--cd-ink); text-align: center; box-shadow: 0 1px 2px rgba(30, 16, 4, 0.3); }
.g-clear-the-desk .cd-sl.cd-under::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(180deg, rgba(40, 18, 0, 0.42), rgba(40, 18, 0, 0) 70%); opacity: var(--cd-lift, 0); pointer-events: none; }
.g-clear-the-desk .cd-sheet { position: absolute; inset: 0; transform-origin: 50% 0; transform-style: preserve-3d; }
.g-clear-the-desk .cd-stack.cd-peelable .cd-sheet { animation: clear-the-desk-tease 2.4s ease-in-out infinite; }
.g-clear-the-desk .cd-face { position: absolute; inset: 0; padding: 20px 7px 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--cd-ink);
  border-radius: 2px 2px 8px 3px; background: linear-gradient(170deg, var(--cd-p1), var(--cd-p2)); backface-visibility: hidden; -webkit-backface-visibility: hidden; box-shadow: 0 1px 2px rgba(30, 16, 4, 0.3); }
.g-clear-the-desk .cd-face.cd-back { transform: rotateX(180deg); background: linear-gradient(10deg, #ffd0ae, #ffb688); }
.g-clear-the-desk .cd-face.cd-back::before { display: none; }
.g-clear-the-desk .cd-stack .cd-big { font-size: 19px; }
.g-clear-the-desk .cd-stack .cd-big.cd-long { font-size: 16px; }
.g-clear-the-desk .cd-stack.cd-thin .cd-glue { display: none; }
.g-clear-the-desk .cd-glue { position: absolute; right: -3px; top: 18%; width: 9px; height: 40%; border-radius: 6px; pointer-events: none;
  background: radial-gradient(circle at 40% 20%, rgba(255, 255, 255, 0.85) 0 2px, transparent 3px), linear-gradient(180deg, rgba(255, 250, 220, 0.55), rgba(255, 236, 170, 0.25)); box-shadow: 0 0 0 1px rgba(200, 150, 60, 0.25); }
.g-clear-the-desk .cd-glue.g2 { right: auto; left: 22%; top: auto; bottom: -3px; width: 34%; height: 8px; }
.g-clear-the-desk .cd-pin { position: absolute; left: 0; top: 0; width: 30px; height: 30px; margin: -15px 0 0 -15px; z-index: 16; pointer-events: none; border-radius: 50%; opacity: 0; will-change: transform, opacity;
  background: radial-gradient(circle at 36% 30%, #ffd9cf 0%, #ff6a5c 26%, #d8322f 60%, #7d1416 100%); box-shadow: 0 2px 2px rgba(0, 0, 0, 0.35), 3px 7px 9px rgba(20, 8, 0, 0.35), inset -2px -3px 5px rgba(0, 0, 0, 0.25); }
.g-clear-the-desk .cd-pop { position: absolute; z-index: 28; left: 0; top: 0; transform: translate(-50%, -50%); font: 700 21px/1 var(--cd-hand); color: #fff8e4; white-space: nowrap; pointer-events: none;
  text-shadow: 0 2px 0 rgba(70, 36, 8, 0.85), 0 0 14px rgba(0, 0, 0, 0.4); animation: clear-the-desk-pop 1.05s ease-out both; }
.g-clear-the-desk .cd-pop.cd-gold { color: #ffe08a; font-size: 24px; }
.g-clear-the-desk .cd-pop.cd-still { animation: none; }
.g-clear-the-desk .gk-char .gk-bubble { max-width: min(280px, calc(100cqw - var(--sz, 72px) * 2 - 58px)); }
@keyframes clear-the-desk-bump { 0% { translate: 0 0; } 30% { translate: 0 6px; } 64% { translate: 0 -2px; } 100% { translate: 0 0; } }
@keyframes clear-the-desk-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(0.7); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -120%); } }
@keyframes clear-the-desk-tease { 0%, 64%, 100% { transform: rotateX(0deg); } 76% { transform: rotateX(24deg); } 86% { transform: rotateX(6deg); } 93% { transform: rotateX(12deg); } }
@container (min-width: 700px) {
  .g-clear-the-desk .cd-nt { font-size: 18px; }
  .g-clear-the-desk .cd-nt.cd-long { font-size: 15.5px; }
  .g-clear-the-desk .cd-stack .cd-big { font-size: 21px; }
  .g-clear-the-desk .cd-stack .cd-big.cd-long { font-size: 17px; }
  .g-clear-the-desk .cd-tape { font-size: 15px; padding: 6px 10px 5px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const an = ctx.analysis || {};
      const inten = ctx.intensity, line = (o) => ctx.line(o), visits = K.visits();
      const care = an.safety === 'care';
      const NREG = [3, 4, 5][inten], MAGNET = [150, 105, 80][inten];
      const MU = 1150, LIN = 1.5;               // sliding friction: paper on wood (constant) plus a little drag
      const clamp = K.clamp, E = K.ease, now = () => performance.now();
      const DESK = K.dailyPick(DESKS, 4);
      const ROLL = K.rng(K.daily() * 31 + visits * 7 + 3);

      /* ---------------- the notes: the player's own words first, then clearly marked examples ---------------- */
      const up = (s) => K.clean(s || '', 80).toUpperCase().replace(/[.!?…]+$/, '').trim();
      function content(a) {
        const c0 = a.core && a.core.label ? a.core : { label: 'EVERYTHING AT ONCE', loop: 'other', generic: true };
        const core = { text: up(c0.label), own: !c0.generic, loop: PIECES[c0.loop] ? c0.loop : 'other' };
        let task = K.clean(a.task || '', 70).replace(/[.!?…]+$/, '');
        if (task.split(/\s+/).filter(Boolean).length < 2) task = '';
        if (task.length > 26) task = K.words(task, 4);
        const taskPiece = !!(task && !care && core.own && (core.loop === 'todo' || core.loop === 'other'));
        const seen = new Set([core.text]), list = [];
        const add = (text, own, loop) => { text = up(text); if (!text || text.length < 2 || seen.has(text)) return; seen.add(text); list.push({ text, own, loop: loop || 'other' }); };
        const strands = (a.strands || []).filter(s => s && s.label);
        strands.filter(s => !s.generic).forEach(s => add(s.label, true, s.loop));
        if (task && !taskPiece) add(task, true, 'todo');
        strands.filter(s => s.generic).forEach(s => add(s.label, false, s.loop));
        EXTRA.forEach(s => add(s.label, false, s.loop));
        const pieces = PIECES[care ? 'care' : core.loop].map(t => ({ text: t, own: false, piece: true, loop: 'other' }));
        if (taskPiece) pieces[0] = { text: up(task), own: true, piece: true, loop: 'todo' };
        const notes = list.slice(0, NREG);
        return { core, notes, pieces, anyOwn: core.own || notes.some(n => n.own) };
      }
      let C = content(an);

      /* ---------------- state ---------------- */
      const G = { phase: 'intro', started: false, finished: false, sorted: 0, total: NREG + 3, counts: [0, 0, 0], scores: [], clean: 0, bulls: 0, shortSaid: 0, firstTray: [true, true, true],
        pinned: null, lamp: 0, lampT: 0, revealing: false, peelReady: false, dirty: true, grade: 0, last: 0, fxLive: false, buzzAt: 0, tidyIx: 0, said: {} };
      const setPhase = (p) => { G.phase = p; el.setAttribute('data-phase', p); ctx.track('phase', { p }); };
      let W = 390, H = 844, phone = true, U = 1, NS = 112, SS = 126, CH = 72, capY = 230, deskTop = 236, TSC = 0.88;
      const ORG = { l: 0, t: 0, w: 0, r: 0 }, WALL = { l: 4, r: 386, b: 740, t: 70 };

      /* ---------------- DOM ---------------- */
      const probe = h('div', { class: 'cd-probe', 'aria-hidden': 'true' });
      el.append(probe);
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.75 });
      const fxc = K.canvas(el, { cls: 'cd-fx', maxDpr: 1.25 });
      const org = h('div', { class: 'cd-org', role: 'group', 'aria-label': 'Three drawer trays: Now, Later and Not mine' });
      const cab = h('div', { class: 'cd-cab' }), slot = h('div', { class: 'cd-slot' });
      const TR = TRAYS.map((d, i) => {
        const T = { i, name: d.name, col: d.col, notes: [], x: 0, y: 0, w: 0, fh: 0, px: 0, py: 0, cx: 0, cy: 0 };
        T.el = h('div', { class: 'cd-tray', style: { '--cd-tc': d.col } });
        T.floor = h('div', { class: 'cd-floor' });
        T.count = h('span', { class: 'cd-count', 'aria-hidden': 'true', text: '0' });
        T.el.append(T.floor, h('div', { class: 'cd-front' }, h('span', { class: 'cd-tape', text: d.name })), T.count);
        slot.append(T.el);
        return T;
      });
      org.append(slot, cab);
      [['--cd-cab', DESK.org.cab], ['--cd-floor', DESK.org.floor], ['--cd-front', DESK.org.front], ['--cd-rim', DESK.org.rim]].forEach(([k, v]) => org.style.setProperty(k, v));
      const layer = h('div', { class: 'cd-layer' });
      const pinEl = h('div', { class: 'cd-pin', 'aria-hidden': 'true' });
      el.append(org, layer, pinEl);
      const patch = K.character('patch', { side: 'right', mood: 'think', x: 10, y: 700, size: 72 });
      const rush = K.character('rush', { side: 'left', mood: care ? 'think' : 'panic', x: 300, y: 700, size: 72 });
      const say = (c, text, o) => { (c === rush ? patch : rush).hush(); return c.say(text, o); };

      /* ---------------- audio: a desk-radio groove that tidies up as the desk does ---------------- */
      const amb = K.ambience(DESK.amb);
      amb.level(DESK.amb === 'rain' ? 0.2 : 0.28, 2);
      const MZ = { next: 0, i: 0, bpm: 84, vol: 0.8, live: false, tidy: 0, layer: 0 };
      const PROG = [['F2', ['A3', 'C4', 'E4', 'G4']], ['E2', ['G3', 'B3', 'D4', 'E4']], ['D2', ['F3', 'A3', 'C4', 'E4']], ['C2', ['E3', 'G3', 'B3', 'D4']]];
      const CLUTTER = ['B4', 'F#5', 'C#5', 'G#4', 'D#5', 'A#4'];
      K.loop(() => {
        if (!A.ctx) return;
        if (!MZ.live) { MZ.live = true; MZ.next = A.now() + 0.25; }
        if (MZ.next < A.now() - 1) MZ.next = A.now() + 0.05;  // resync after the tab slept
        const spb = 60 / MZ.bpm, ahead = A.now() + 0.25;
        while (MZ.next < ahead) {
          const t = MZ.next, i = MZ.i, b = i % 4, pr = PROG[Math.floor(i / 4) % PROG.length], v = MZ.vol, tidy = MZ.tidy, mess = 1 - tidy;
          if (v > 0.02) {
            if (b === 0) {
              A.pluck(A.note(pr[0]), { when: t, vol: 0.22 * v, damp: 0.993, lp: 620, bus: 'music' });
              pr[1].forEach((n, k) => A.tone({ when: t + 0.01 + k * 0.016, type: 'sine', freq: A.note(n), dur: spb * 3.8, vol: 0.019 * v, attack: 0.014, verb: 0.35, bus: 'music' }));
              A.tone({ when: t + 0.01, type: 'triangle', freq: A.note(pr[1][1]) * 2, dur: 0.5, vol: 0.012 * v, attack: 0.003, bus: 'music' });
              if (MZ.layer >= 1) A.tone({ when: t, type: 'sine', freq: 120, to: 46, glide: 0.11, dur: 0.24, vol: 0.08 * v, bus: 'music' });
            }
            if (b === 2) A.pluck(A.note(pr[0]) * 1.5, { when: t, vol: 0.15 * v, damp: 0.992, lp: 600, bus: 'music' });
            if (b === 1 || b === 3) A.noise({ when: t, filter: 'bandpass', freq: 3600, q: 0.7, dur: 0.15, attack: 0.04, vol: 0.024 * v, bus: 'music' });
            if (MZ.layer >= 1) A.noise({ when: t + spb * 0.5, filter: 'highpass', freq: 7000, dur: 0.05, attack: 0.012, vol: 0.011 * v, bus: 'music' });
            // clutter: off-grid plinks while the desk is messy; they thin out as it clears
            if (mess > 0.05 && Math.random() < mess * 0.55) A.pluck(A.note(CLUTTER[(i * 5 + Math.floor(Math.random() * 3)) % CLUTTER.length]), { when: t + spb * (0.2 + Math.random() * 0.6), vol: 0.045 * v * mess, damp: 0.988, bus: 'music' });
            // order: a clean arpeggio grows in as the desk clears
            if (tidy > 0.3) A.pluck(A.note(pr[1][(i * 2) % pr[1].length]) * 2, { when: t, vol: 0.05 * v * tidy, damp: 0.996, verb: 0.3, bus: 'music' });
            if (tidy > 0.65) A.pluck(A.note(pr[1][(i * 2 + 1) % pr[1].length]) * 2, { when: t + spb / 2, vol: 0.034 * v * tidy, damp: 0.996, verb: 0.3, bus: 'music' });
          }
          MZ.i++; MZ.next += spb;
        }
      });
      const sync = (n) => { if (A.ctx) A.sync(n, now()); };
      const chordNow = () => PROG[Math.floor(MZ.i / 4) % PROG.length][1];
      function sLift() { if (!A.ctx) return; A.paper({ vol: 0.07, freq: 3000, dur: 0.07 }); A.click({ vol: 0.035 }); sync('lift'); }
      function sDrop(k) { if (!A.ctx) return; k = k || 1; A.tone({ type: 'sine', freq: 230, to: 130, glide: 0.05, dur: 0.07, vol: 0.07 * k }); A.noise({ filter: 'bandpass', freq: 2000, q: 1.1, dur: 0.035, vol: 0.05 * k }); sync('drop'); }
      function sBump(v) { if (!A.ctx) return; A.wood(undefined, clamp(0.03 + v * 0.00005, 0.03, 0.12), 0.75); A.noise({ filter: 'lowpass', freq: 700, dur: 0.05, vol: clamp(v * 0.00004, 0.02, 0.08) }); sync('bump'); }
      function sThunk(ti, i) {
        if (!A.ctx) return;
        const p = [1.16, 1, 0.84][ti], pr = chordNow();
        A.tone({ type: 'sine', freq: 160 * p, to: 66 * p, glide: 0.09, dur: 0.2, vol: 0.24 });
        A.wood(undefined, 0.15, 0.85 * p);
        for (let k = 0; k < 4; k++) A.paper({ when: A.now() + 0.025 + k * 0.03, vol: 0.055 - k * 0.01, freq: 2300 + k * 520, dur: 0.05 });
        A.pluck(A.note(pr[i % pr.length]) * (i >= pr.length ? 4 : 2), { vol: 0.12, damp: 0.995, verb: 0.3 });
        sync('thunk');
      }
      function sKnock() { if (!A.ctx) return; A.wood(undefined, 0.07, 0.62 + Math.random() * 0.12); A.noise({ filter: 'lowpass', freq: 500, dur: 0.06, vol: 0.06 }); sync('knock'); }
      function sClink() { if (!A.ctx) return; A.chime(A.note('E6'), { vol: 0.05, dur: 0.6 }); A.tone({ type: 'triangle', freq: 2600, dur: 0.05, vol: 0.03 }); sync('clink'); }
      function sBuzz() { if (!A.ctx) return; for (let k = 0; k < 2; k++) A.tone({ when: A.now() + k * 0.18, type: 'square', freq: 92, dur: 0.12, vol: 0.035, lp: 320 }); }
      function sTchk() { if (!A.ctx) return; A.click({ vol: 0.09 }); A.paper({ vol: 0.12, freq: 1800, dur: 0.14 }); A.tone({ type: 'sine', freq: 520, to: 880, glide: 0.06, dur: 0.1, vol: 0.05 }); sync('peel'); }
      function sClunk(i) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 120 + i * 18, to: 52, glide: 0.12, dur: 0.3, vol: 0.26 }); A.wood(undefined, 0.2, 0.6 + i * 0.08); A.noise({ filter: 'lowpass', freq: 900, dur: 0.12, vol: 0.1 }); sync('clunk'); }
      function sTick(i) { if (!A.ctx) return; const n = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'][Math.min(8, i)]; A.pluck(A.note(n), { vol: 0.1, damp: 0.994, verb: 0.25 }); A.click({ vol: 0.03 }); sync('tick'); }
      function sClick() { if (!A.ctx) return; A.click({ vol: 0.14 }); A.wood(undefined, 0.08, 1.6); sync('switch'); }
      let slideV = null, peelV = null;
      function slideLevel(sp) { if (!A.ctx) return; if (!slideV) slideV = A.loop({ filter: 'bandpass', freq: 1500, q: 0.6 }); if (slideV) { slideV.level(clamp(sp / 2600, 0, 1) * 0.08, 0.04); slideV.freq(800 + clamp(sp, 0, 2600) * 0.6, 0.05); } }
      function peelLevel(v) { if (!A.ctx) return; if (!peelV) peelV = A.loop({ filter: 'highpass', freq: 3200, q: 0.5 }); if (peelV) peelV.level(v > 0.01 ? clamp(v, 0, 1) * (0.05 + Math.random() * 0.06) : 0.0001, 0.02); }
      S.onDestroy(() => { if (slideV) slideV.stop(); if (peelV) peelV.stop(); });

      /* ---------------- helpers ---------------- */
      const hexRgb = (hx) => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
      const shadeHex = (hx, f) => 'rgb(' + hexRgb(hx).map(v => Math.round(clamp(v * f, 0, 255))).join(',') + ')';
      const mixHex = (a, b, k) => { const x = hexRgb(a), y = hexRgb(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',') + ')'; };
      const rot = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c }; };
      const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
      function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); }
      const SH = K.glowSprite('rgba(26,12,2,0.92)');
      function blob(g, x, y, rx, ry, a) { g.globalAlpha = a; g.drawImage(SH, x - rx, y - ry, rx * 2, ry * 2); g.globalAlpha = 1; }
      const mk = (kind, o) => Object.assign({ kind, k: 0, an: null, wobT: -9999, wobA: 0 }, o || {});
      const IT = { pad: {}, lamp: mk('lamp'), plant: mk('plant'), mug: mk('mug'), rings: { list: [] }, phone: mk('phone'), cable: mk('cable'), balls: mk('balls', { list: [] }), bin: mk('bin'),
        pens: mk('pens', { list: [] }), pot: {}, papers: mk('papers', { list: [] }), books: mk('books'), crumbs: mk('crumbs', { list: [] }), tre: [] };
      function prog(it, tn) {
        if (!it.an) return it.k;
        const p = clamp((tn - it.an.t0) / it.an.dur, 0, 1);
        if (p >= 1) { it.k = 1; it.an = null; }
        return p;
      }
      function wob(it, tn) { const a = (tn - it.wobT) / 1000; return a >= 0 && a < 1 ? it.wobA * Math.exp(-a * 5) * Math.sin(a * 34) : 0; }
      function poke(it, amp) { it.wobT = now(); it.wobA = amp; G.animUntil = Math.max(G.animUntil || 0, now() + 1000); }

      /* ---------------- layout ---------------- */
      function layout(c) {
        const oW = W, oH = H, first = !G.laid;
        W = c.w; H = c.h; phone = W < 700;
        U = phone ? clamp(W / 390, 0.84, 1.12) : clamp(Math.min(W / 1180, H / 860) * 1.2, 1, 1.3);
        NS = phone ? Math.round(clamp(W * 0.3, 100, 118)) : 126; SS = NS + 14; CH = phone ? 72 : 100; TSC = phone ? 0.88 : 0.86;
        el.style.setProperty('--cd-ns', NS + 'px'); el.style.setProperty('--cd-ss', SS + 'px');
        const safe = probe.offsetTop || 0;
        ORG.t = safe + (phone ? 60 : 64);
        ORG.w = phone ? W - 16 : clamp(W - 460, 600, 720);
        ORG.l = Math.round((W - ORG.w) / 2); ORG.r = ORG.l + ORG.w;
        const gap = phone ? 7 : 16, cabH = phone ? 24 : 30, trayW = (ORG.w - gap * 2) / 3;
        const fh = Math.round(NS * TSC + (phone ? 12 : 22)), frh = phone ? 30 : 36;
        Object.assign(org.style, { left: ORG.l + 'px', top: ORG.t + 'px', width: ORG.w + 'px', height: (cabH + fh + frh + 12) + 'px' });
        org.style.setProperty('--cd-fh', fh + 'px'); org.style.setProperty('--cd-frh', frh + 'px');
        cab.style.height = cabH + 'px';
        slot.style.top = (cabH - 4) + 'px'; slot.style.height = (fh + frh + 14) + 'px';
        TR.forEach((T, i) => {
          const lx = i * (trayW + gap);
          T.el.style.left = (6 + lx) + 'px'; T.el.style.width = trayW + 'px';
          T.x = ORG.l + lx; T.y = ORG.t + cabH - 4; T.w = trayW; T.fh = fh;
          T.px = T.x + 5; T.py = T.y; T.cx = T.x + trayW / 2; T.cy = T.y + fh / 2 + 3;
          T.notes.forEach(n => { n.x = (T.w - 10) / 2 + n.ox; n.y = T.fh / 2 + 3 + n.oy; noteXY(n); });
        });
        capY = ORG.t + cabH - 4 + fh + frh; deskTop = capY + 4;
        WALL.l = 4; WALL.r = W - 4; WALL.b = H - 16 - CH - 8; WALL.t = safe + 62 + NS * 0.4;
        const m = phone ? 10 : 28, cy = H - 16 - CH;
        [patch, rush].forEach(ch => ch.el.style.setProperty('--sz', CH + 'px'));
        patch.place(m, cy); rush.place(W - CH - m, cy);
        placeItems();
        if (first) { placeNotes(); G.laid = true; } else rescaleNotes(oW, oH);
        paintBG(); paintSprites();
        if (G.ink && G.pinned) { const geo = inkPlace(G.pinned); if (geo) Object.assign(G.ink, geo); G.fxLive = true; }
        G.dirty = true;
      }

      /* Where everything sits today: messy poses (scattered under the notes) and tidy poses (squared away round the edges). */
      const PR = K.rng(K.daily() * 17 + 9), JIT = Array.from({ length: 80 }, () => PR() - 0.5);
      function placeItems() {
        const dh = H - deskTop, ph = phone, pk = (a, b) => (ph ? a : b);
        const P = (fx, fy) => ({ x: fx * W, y: deskTop + fy * dh });
        IT.pad = Object.assign(P(0.5, pk(0.46, 0.45)), { w: pk(W * 0.8, Math.min(W * 0.46, 640)), h: pk(dh * 0.6, dh * 0.68) });
        Object.assign(IT.lamp, ph ? { x: W - 40 * U, y: deskTop + 44 * U } : P(0.85, 0.16), { r: pk(38, 54) * U });
        IT.lamp.base = ph ? { x: W - 12 * U, y: deskTop + 8 * U } : P(0.935, 0.04);
        Object.assign(IT.plant, ph ? { x: 16 * U, y: deskTop + 44 * U } : P(0.1, 0.14), { r: pk(54, 68) * U });
        Object.assign(IT.mug, P(pk(0.84, 0.79), pk(0.6, 0.64)), { R: pk(23, 28) * U, r0: 0.7 + JIT[0], r1: -0.2 });
        IT.rings.list = (ph ? [[0.62, 0.52, 21], [0.86, 0.77, 24], [0.38, 0.26, 19]] : [[0.71, 0.55, 26], [0.81, 0.8, 28], [0.58, 0.28, 22]]).map(([fx, fy, r], i) => Object.assign(P(fx, fy), { r: r * U, a: JIT[1 + i] * 6 }));
        Object.assign(IT.phone, P(pk(0.2, 0.24), pk(0.3, 0.42)), { r0: pk(-0.55, -0.6), t: P(pk(0.62, 0.2), pk(0.82, 0.74)), r1: pk(Math.PI / 2, 0.06) });
        const cb = IT.cable;
        cb.s = P(pk(-0.03, 0.02), pk(0.08, 0.0)); cb.e = P(pk(0.44, 0.31), pk(0.3, 0.38));
        const cc = P(pk(0.25, 0.2), pk(0.08, 0.26)); cb.cx = cc.x; cb.cy = cc.y;
        cablePath();
        Object.assign(IT.bin, ph ? { x: 14 * U, y: deskTop + dh * 0.6 } : P(0.925, 0.6), { r: pk(34, 42) * U });
        const bl = ph ? [[0.28, 0.78], [0.72, 0.3], [0.54, 0.64]] : [[0.36, 0.84], [0.66, 0.2], [0.6, 0.78]];
        if (!IT.balls.list.length) IT.balls.list = bl.map(([fx, fy], i) => Object.assign(P(fx, fy), { vx: 0, vy: 0, r: (12 + i * 1.5) * U, rot: JIT[5 + i] * 6, w: 0, spr: null, fly: null, inBin: false, fx, fy }));
        else IT.balls.list.forEach(b => { if (!b.inBin) Object.assign(b, P(b.fx, b.fy)); b.r = (12 + IT.balls.list.indexOf(b) * 1.5) * U; });
        Object.assign(IT.pot, P(pk(0.47, 0.74), pk(0.075, 0.28)));
        IT.pens.list = (ph ? [[0.62, 0.16, 0.4], [0.3, 0.58, -1.1], [0.72, 0.86, 2.0]] : [[0.71, 0.42, 0.5], [0.66, 0.49, -0.9], [0.3, 0.62, 1.9]]).map(([fx, fy, r], i) =>
          Object.assign(P(fx, fy), { r: r + JIT[9 + i] * 0.4, len: (i === 1 ? 58 : 66) * U, kind: i === 1 ? 'pencil' : 'pen', col: ['#2f5fd0', '#f2c230', '#d8433b'][i] }));
        const pc = P(0.5, pk(0.42, 0.42)), psc = pk(0.88, 1.05);
        IT.papers.list = [[-34, -26, -0.26], [28, 6, 0.2], [-6, 40, 0.52]].map(([dx, dy, r]) => ({ x: pc.x + dx * U, y: pc.y + dy * U, r: r + JIT[13] * 0.2, sc: psc }));
        const pt = P(pk(0.67, 0.84), pk(0.08, 0.44)); IT.papers.tx = pt.x; IT.papers.ty = pt.y; IT.papers.ta = 0.03; IT.papers.ts = pk(0.66, 0.9);
        const bk = IT.books, bs = pk(0.84, 1);
        bk.w = 54 * U * bs; bk.hh = 72 * U * bs;
        bk.a = Object.assign(P(pk(0.14, 0.1), pk(0.82, 0.6)), { r: 0.32 }); bk.b = Object.assign(P(pk(0.4, 0.21), pk(0.86, 0.86)), { r: -0.22 });
        const bt = P(pk(0.36, 0.1), pk(0.82, 0.58)); bk.tx = bt.x; bk.ty = bt.y;
        bk.cols = [['#2f6fb5', '#d9534f', '#3f8f5f', '#7a5cc9'][K.daily() % 4], '#e0a33a'];
        const cr = IT.crumbs, cc2 = P(pk(0.62, 0.7), pk(0.7, 0.82));
        if (!cr.list.length) for (let i = 0; i < 18; i++) cr.list.push({ dx: JIT[20 + i] * 70, dy: JIT[40 + i] * 46, r: 1.6 + Math.abs(JIT[60 + (i % 18)]) * 3, a: JIT[i] * 3 });
        cr.x = cc2.x; cr.y = cc2.y; cr.sx = (ph ? 110 : 150) * U; cr.sy = 40 * U;
        cr.wr = Object.assign(P(pk(0.7, 0.75), pk(0.75, 0.86)), { r: 0.5 });
        placeTreasures();
      }
      /* Desk treasures keep a fixed spot (the n-th one ever collected always sits in spot n mod 3), so the desk you come back
         to looks like yours; the newest one drops in during the finale. */
      function placeTreasures() {
        const ph = phone, dh = H - deskTop, P = (fx, fy) => ({ x: fx * W, y: deskTop + fy * dh });
        const col = K.collection(), nw = G.newTre, have = TREASURES.filter(t => col.includes(t.name) || (nw && nw.id === t.id));
        const ts = ph ? [[0.88, 0.19], [0.1, 0.43], [0.9, 0.42]] : [[0.06, 0.36], [0.92, 0.5], [0.26, 0.1]];
        const old = new Map((IT.tre || []).map(t => [t.id, t]));
        IT.tre = have.map((t, k) => ({ t, k })).slice(-3).map(({ t, k }) => Object.assign(P(ts[k % 3][0], ts[k % 3][1]), { id: t.id, name: t.name, s: (ph ? 0.9 : 1.15) * U,
          wobT: -9999, wobA: 0, drop: nw && nw.id === t.id && !(old.get(t.id) || {}).landed ? nw.t0 : 0, landed: (old.get(t.id) || {}).landed || !(nw && nw.id === t.id) }));
      }
      function cablePath() {
        const c = IT.cable, n = 48, M = [], Co = [];
        const dx = c.e.x - c.s.x, dy = c.e.y - c.s.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
        for (let i = 0; i < n; i++) {
          const s = i / (n - 1);
          let x = c.s.x + dx * s, y = c.s.y + dy * s;
          const wv = Math.sin(s * TAU * 1.5 + 0.6) * 24 * U * Math.sin(Math.PI * s);
          x += nx * wv; y += ny * wv;
          for (const lc of [0.34, 0.7]) { const q = (s - lc) / 0.08; if (q > -1 && q < 1) { const ang = (q + 1) * Math.PI, r = 12 * U; x += Math.cos(ang - Math.PI / 2) * r; y += (Math.sin(ang - Math.PI / 2) + 1) * r; } }
          M.push({ x, y });
          const ca = s * TAU * 2.4 + 0.5, cr = (7 + 9 * s) * U;
          Co.push({ x: c.cx + Math.cos(ca) * cr, y: c.cy + Math.sin(ca) * cr * 0.94 });
        }
        c.M = M; c.Co = Co;
      }

      /* ---------------- the desk itself (painted once per size and theme) ---------------- */
      let BG = null;
      function paintBG() {
        const dpr = cv.dpr || 1, c = BG || (BG = document.createElement('canvas'));
        c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr));
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const D = K.dark(), R = K.rng(K.daily() * 3 + 11), wd = DESK.wood, k = D ? 0.56 : 1;
        const col = (c3, f, a) => 'rgba(' + Math.round(clamp(c3[0] * k * f, 0, 255)) + ',' + Math.round(clamp(c3[1] * k * f, 0, 255)) + ',' + Math.round(clamp(c3[2] * k * f * (D ? 1.08 : 1), 0, 255)) + ',' + (a == null ? 1 : a) + ')';
        g.fillStyle = col(wd[0], 1); g.fillRect(0, 0, W, H);
        const ph = Math.round(DESK.plank * U);
        for (let y = -Math.round(R() * ph); y < H; y += ph) {
          g.fillStyle = col(wd[0], 0.9 + R() * 0.18); g.fillRect(0, y, W, ph);
          for (let i = 0; i < 15; i++) {
            const y0 = y + R() * ph, amp = 1 + R() * 3.5, f = 1 + Math.floor(R() * 3), phs = R() * TAU, dk = R() < 0.62;
            g.strokeStyle = dk ? col(wd[1], 1, 0.1 + R() * 0.17) : col(wd[2], 1, 0.08 + R() * 0.14);
            g.lineWidth = 0.6 + R() * 1.7;
            g.beginPath();
            for (let x = 0; x <= W + 12; x += 12) { const yy = y0 + Math.sin(x / W * TAU * f + phs) * amp + Math.sin(x * 0.045 + phs) * 0.7; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
            g.stroke();
          }
          if (R() < 0.5) { const kx = R() * W, ky = y + ph * (0.3 + R() * 0.4); g.strokeStyle = col(wd[1], 0.9, 0.3); g.lineWidth = 1.1; for (let r = 0; r < 4; r++) { g.beginPath(); g.ellipse(kx, ky, 5 + r * 5, 2 + r * 1.8, 0, 0, TAU); g.stroke(); } }
          g.fillStyle = col(wd[1], 0.5, 0.6); g.fillRect(0, y, W, 1.6);
          g.fillStyle = col(wd[2], 1.08, 0.22); g.fillRect(0, y + 1.6, W, 1);
        }
        // window light falling across the desk (day), cool street light (night)
        g.save(); g.globalCompositeOperation = D ? 'source-over' : 'lighter';
        // the shaft starts above the frame, so it never shows a hard top edge (it used to cut across the desk at 1280 wide)
        const lx = phone ? -W * 0.2 : -W * 0.05, lw = phone ? W * 0.9 : W * 0.55, ly = -90;
        const lg = g.createLinearGradient(lx, ly, lx + lw, ly + H * 0.95);
        lg.addColorStop(0, D ? 'rgba(130,160,255,0.08)' : 'rgba(255,236,200,0.15)'); lg.addColorStop(1, 'rgba(255,236,200,0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + lw, ly); g.lineTo(lx + lw * 0.6, H); g.lineTo(lx - lw * 0.4, H); g.closePath(); g.fill();
        g.globalCompositeOperation = 'source-over'; g.fillStyle = D ? 'rgba(0,0,10,0.08)' : 'rgba(60,30,0,0.05)';
        for (const f of [0.34, 0.68]) { const x0 = lx + lw * f; g.beginPath(); g.moveTo(x0, ly); g.lineTo(x0 + 10 * U, ly); g.lineTo(x0 + 10 * U - lw * 0.4, H); g.lineTo(x0 - lw * 0.4, H); g.closePath(); g.fill(); }
        g.restore();
        paintPad(g, D);
        const vg = g.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.32, W / 2, H * 0.5, Math.max(W, H) * 0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(6,3,10,0.55)' : 'rgba(70,36,8,0.24)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
        const tg = g.createLinearGradient(0, ORG.t, 0, deskTop + 30);
        tg.addColorStop(0, D ? 'rgba(0,0,0,0.4)' : 'rgba(40,20,0,0.18)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = tg; g.fillRect(0, 0, W, deskTop + 30);
      }
      function paintPad(g, D) {
        const p = IT.pad, x = p.x - p.w / 2, y = p.y - p.h / 2, rad = 14 * U, R = K.rng(77);
        g.fillStyle = D ? 'rgba(0,0,0,0.42)' : 'rgba(40,18,0,0.22)'; rr(g, x + 3, y + 6, p.w, p.h, rad); g.fill();
        const base = DESK.pad === 'cork' ? (D ? '#7f6142' : '#c79b66') : DESK.pad === 'felt' ? (D ? '#3a4149' : '#6d7782') : (D ? '#1f3d33' : '#2f6450');
        g.fillStyle = base; rr(g, x, y, p.w, p.h, rad); g.fill();
        g.save(); rr(g, x, y, p.w, p.h, rad); g.clip();
        if (DESK.pad === 'cork') { for (let i = 0; i < Math.round(p.w * p.h / 90); i++) { g.fillStyle = R() < 0.55 ? 'rgba(90,52,20,' + (0.14 + R() * 0.22) + ')' : 'rgba(255,236,200,' + (0.1 + R() * 0.2) + ')'; const s = 0.8 + R() * 1.8; g.fillRect(x + R() * p.w, y + R() * p.h, s, s * (0.6 + R() * 0.8)); } }
        else if (DESK.pad === 'felt') { for (let i = 0; i < Math.round(p.w * p.h / 60); i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.07)'; g.fillRect(x + R() * p.w, y + R() * p.h, 1.2, 1.2); } }
        else { const lg = g.createLinearGradient(x, y, x + p.w, y + p.h); lg.addColorStop(0, 'rgba(255,255,255,0.1)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = lg; g.fillRect(x, y, p.w, p.h); }
        g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 8; rr(g, x, y, p.w, p.h, rad); g.stroke();
        if (DESK.pad === 'leather') { g.setLineDash([6, 5]); g.strokeStyle = 'rgba(232,214,170,0.55)'; g.lineWidth = 1.5; rr(g, x + 9, y + 9, p.w - 18, p.h - 18, rad * 0.6); g.stroke(); g.setLineDash([]); }
        g.restore();
        g.strokeStyle = D ? 'rgba(255,240,210,0.1)' : 'rgba(255,255,255,0.3)'; g.lineWidth = 1.2; rr(g, x + 0.5, y + 0.5, p.w - 1, p.h - 1, rad); g.stroke();
      }
      function paintSprites() {
        const dpr = Math.min(2, cv.dpr || 1);
        IT.balls.list.forEach((b, i) => {
          const R = K.rng(41 + i * 13), r = b.r, s = Math.ceil(r * 2 + 8), c = document.createElement('canvas');
          c.width = c.height = Math.ceil(s * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(s / 2, s / 2);
          const pts = []; for (let k = 0; k < 13; k++) { const a = k / 13 * TAU, q = r * (0.78 + R() * 0.3); pts.push([Math.cos(a) * q, Math.sin(a) * q]); }
          const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.15); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, K.dark() ? '#b9b3a4' : '#d8d2c2');
          g.fillStyle = gr; g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(110,100,86,0.55)'; g.lineWidth = 0.9;
          for (let k = 0; k < 7; k++) { const a = R() * TAU, l = r * (0.45 + R() * 0.45); g.beginPath(); g.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15); g.lineTo(Math.cos(a + 0.4) * l, Math.sin(a + 0.4) * l); g.lineTo(Math.cos(a + 0.95) * l * 0.7, Math.sin(a + 0.95) * l * 0.7); g.stroke(); }
          g.strokeStyle = 'rgba(70,120,200,0.3)'; g.lineWidth = 0.8; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-r * 0.6, k * r * 0.35 + R() * 2); g.quadraticCurveTo(0, k * r * 0.35 + r * 0.25 * (R() - 0.5), r * 0.6, k * r * 0.35); g.stroke(); }
          b.spr = { c, s };
        });
      }

      /* ---------------- the clutter, drawn live while anything on the desk moves ---------------- */
      function drawRings(g, tn) {
        const e = 1 - E.inOutSine(prog(IT.mug, tn));
        if (e <= 0.01) return;
        g.lineCap = 'round';
        for (const r of IT.rings.list) {
          g.strokeStyle = 'rgba(96,54,20,' + (0.34 * e).toFixed(3) + ')'; g.lineWidth = 2.4 * U;
          g.beginPath(); g.arc(r.x, r.y, r.r, r.a, r.a + TAU * 0.82); g.stroke();
          g.strokeStyle = 'rgba(96,54,20,' + (0.13 * e).toFixed(3) + ')'; g.lineWidth = 5 * U;
          g.beginPath(); g.arc(r.x + 1, r.y + 1, r.r - 3 * U, r.a + 1, r.a + 1 + Math.PI); g.stroke();
        }
      }
      function drawMug(g, tn) {
        const it = IT.mug, R = it.R, kk = prog(it, tn), e = E.inOutCubic(kk), mc = DESK.mug, a = it.r0 + (it.r1 - it.r0) * e + wob(it, tn);
        blob(g, it.x + 5 * U, it.y + 7 * U, R * 1.6, R * 1.5, K.dark() ? 0.6 : 0.42);
        g.save(); g.translate(it.x, it.y); g.rotate(a);
        g.fillStyle = shadeHex(mc, 0.84); rr(g, R * 0.72, -R * 0.27, R * 0.66, R * 0.54, R * 0.27); g.fill();
        g.fillStyle = 'rgba(20,10,0,0.3)'; rr(g, R * 0.96, -R * 0.1, R * 0.3, R * 0.2, R * 0.1); g.fill();
        const bg = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.05);
        bg.addColorStop(0, shadeHex(mc, 1.15)); bg.addColorStop(1, shadeHex(mc, 0.8));
        g.fillStyle = bg; circle(g, 0, 0, R); g.fill();
        g.fillStyle = shadeHex(mc, 0.66); circle(g, 0, 0, R * 0.84); g.fill();
        g.fillStyle = mixHex('#3a2313', '#c98a3c', e); circle(g, 0, 0, R * 0.76); g.fill();
        if (kk < 1) { g.fillStyle = 'rgba(90,60,30,' + (0.5 * (1 - e)) + ')'; g.beginPath(); g.arc(0, 0, R * 0.62, 0.4, 2.2); g.arc(0, 0, R * 0.5, 2.2, 0.4, true); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.14 * e).toFixed(3) + ')'; g.beginPath(); g.ellipse(-R * 0.22, -R * 0.28, R * 0.32, R * 0.11, -0.6, 0, TAU); g.fill();
        if (it.rip) { const q = (tn - it.rip) / 900; if (q < 1) { g.strokeStyle = 'rgba(255,240,210,' + (0.55 * (1 - q)).toFixed(3) + ')'; g.lineWidth = 1.3; for (let w = 0; w < 2; w++) { circle(g, 0, 0, R * 0.72 * ((q + w * 0.35) % 1)); g.stroke(); } } else it.rip = 0; }
        g.restore();
      }
      function drawPhone(g, tn) {
        const it = IT.phone, kk = prog(it, tn), e = E.inOutCubic(kk), w = 42 * U, hh = 84 * U;
        const x = it.x + (it.t.x - it.x) * e, y = it.y + (it.t.y - it.y) * e, a = it.r0 + (it.r1 - it.r0) * e + wob(it, tn);
        const flip = Math.cos(Math.PI * e), lift = Math.sin(Math.PI * e);
        blob(g, x + (5 + lift * 14) * U, y + (7 + lift * 16) * U, w * 0.95, hh * 0.62, 0.45);
        g.save(); g.translate(x, y); g.rotate(a); g.scale(Math.max(0.05, Math.abs(flip)) * (1 + 0.12 * lift), 1 + 0.12 * lift);
        g.fillStyle = '#14161c'; rr(g, -w / 2, -hh / 2, w, hh, 8 * U); g.fill();
        if (flip > 0) {
          const sg = g.createLinearGradient(0, -hh / 2, 0, hh / 2); sg.addColorStop(0, '#9cc8ff'); sg.addColorStop(1, '#4f5fe0');
          g.fillStyle = sg; rr(g, -w / 2 + 3 * U, -hh / 2 + 3 * U, w - 6 * U, hh - 6 * U, 6 * U); g.fill();
          for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.78)'; rr(g, -w / 2 + 6 * U, -hh / 2 + 11 * U + i * 15 * U, w - 12 * U, 11 * U, 3 * U); g.fill(); g.fillStyle = ['#ff5a4e', '#ffb02e', '#3fbf6a', '#ff5a4e'][i]; circle(g, -w / 2 + 11 * U, -hh / 2 + 16.5 * U + i * 15 * U, 3 * U); g.fill(); g.fillStyle = 'rgba(40,50,80,0.35)'; g.fillRect(-w / 2 + 16 * U, -hh / 2 + 15 * U + i * 15 * U, w * 0.42, 1.6 * U); }
          g.fillStyle = '#ff3b30'; circle(g, w / 2 - 3 * U, -hh / 2 + 3 * U, 6.5 * U); g.fill(); g.fillStyle = '#fff'; circle(g, w / 2 - 3 * U, -hh / 2 + 3 * U, 2 * U); g.fill();
        } else {
          g.fillStyle = '#2b2f38'; rr(g, -w / 2 + 1.5 * U, -hh / 2 + 1.5 * U, w - 3 * U, hh - 3 * U, 7 * U); g.fill();
          g.fillStyle = '#1b1d23'; rr(g, -w / 2 + 5 * U, -hh / 2 + 5 * U, 17 * U, 17 * U, 5 * U); g.fill();
          g.fillStyle = '#0c0d10'; circle(g, -w / 2 + 10 * U, -hh / 2 + 10 * U, 3.4 * U); g.fill(); circle(g, -w / 2 + 16.5 * U, -hh / 2 + 16.5 * U, 3.4 * U); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.08)'; rr(g, -w / 2 + 3 * U, -hh / 2 + 3 * U, w * 0.35, hh - 6 * U, 6 * U); g.fill();
        }
        g.restore();
        if (flip > 0 && K.dark()) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 * flip; g.drawImage(K.glowSprite('rgba(120,160,255,0.9)'), x - hh, y - hh, hh * 2, hh * 2); g.restore(); }
      }
      function drawCable(g, tn) {
        const c = IT.cable; if (!c.M) return;
        const kk = prog(c, tn), n = c.M.length, pts = [];
        for (let i = 0; i < n; i++) { const s = i / (n - 1), ki = clamp(kk * 1.7 - (1 - s) * 0.7, 0, 1), e = E.inOutCubic(ki); pts.push({ x: c.M[i].x + (c.Co[i].x - c.M[i].x) * e, y: c.M[i].y + (c.Co[i].y - c.M[i].y) * e }); }
        const path = () => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2); g.lineTo(pts[n - 1].x, pts[n - 1].y); };
        const D = K.dark(), body = D ? '#d6d3cb' : '#f4f2ec', edge = D ? '#5e5b55' : '#a9a59b';
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.save(); g.translate(2 * U, 3 * U); g.strokeStyle = 'rgba(20,10,0,0.26)'; g.lineWidth = 5 * U; path(); g.stroke(); g.restore();
        g.strokeStyle = edge; g.lineWidth = 5.4 * U; path(); g.stroke();
        g.strokeStyle = body; g.lineWidth = 3.6 * U; path(); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1 * U; path(); g.stroke();
        const a = pts[n - 1], b = pts[n - 3], ang = Math.atan2(a.y - b.y, a.x - b.x);
        g.save(); g.translate(a.x, a.y); g.rotate(ang); g.fillStyle = edge; rr(g, -3 * U, -5 * U, 16 * U, 10 * U, 2.5 * U); g.fill(); g.fillStyle = body; rr(g, -2 * U, -4 * U, 14 * U, 8 * U, 2 * U); g.fill(); g.fillStyle = '#9aa0a8'; rr(g, 12 * U, -3 * U, 6 * U, 6 * U, 1 * U); g.fill(); g.restore();
        const s0 = pts[0], s1 = pts[2], ang0 = Math.atan2(s0.y - s1.y, s0.x - s1.x);
        g.save(); g.translate(s0.x, s0.y); g.rotate(ang0); g.fillStyle = edge; rr(g, -2 * U, -12 * U, 26 * U, 24 * U, 6 * U); g.fill(); g.fillStyle = body; rr(g, -1 * U, -11 * U, 24 * U, 22 * U, 5 * U); g.fill(); g.restore();
        if (kk >= 1) { g.save(); g.translate(c.cx, c.cy); g.rotate(0.5); g.fillStyle = 'rgba(20,10,0,0.25)'; rr(g, -3 * U + 1, -19 * U + 2, 7 * U, 38 * U, 3 * U); g.fill(); g.fillStyle = '#e8574a'; rr(g, -3.5 * U, -19 * U, 7 * U, 38 * U, 3 * U); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-1.5 * U, -16 * U, 1.2 * U, 32 * U); g.restore(); }
      }
      function drawBalls(g) {
        for (const b of IT.balls.list) {
          if (b.inBin || !b.spr) continue;
          const lift = b.lift || 0, sc = 1 + 0.4 * lift;
          blob(g, b.x + (4 + lift * 18) * U, b.y + (5 + lift * 26) * U, b.r * (1.3 + lift * 0.4), b.r * (1.2 + lift * 0.4), 0.4 * (1 - lift * 0.5));
          g.save(); g.translate(b.x, b.y - lift * 6 * U); g.rotate(b.rot); g.scale(sc, sc); g.drawImage(b.spr.c, -b.spr.s / 2, -b.spr.s / 2, b.spr.s, b.spr.s); g.restore();
        }
      }
      function drawBin(g, tn) {
        const b = IT.bin, r = b.r, D = K.dark();
        blob(g, b.x + 5 * U, b.y + 7 * U, r * 1.35, r * 1.3, 0.45);
        g.save(); g.translate(b.x, b.y); g.rotate(wob(b, tn) * 0.5);
        g.fillStyle = D ? '#4b525c' : '#8f9aa7'; circle(g, 0, 0, r); g.fill();
        g.fillStyle = D ? '#17191d' : '#353b43'; circle(g, 0, 0, r * 0.84); g.fill();
        g.save(); circle(g, 0, 0, r * 0.84); g.clip();
        g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 1;
        for (let i = -r * 2; i < r * 2; i += 6 * U) { g.beginPath(); g.moveTo(i, -r); g.lineTo(i + r * 2, r); g.moveTo(i, r); g.lineTo(i + r * 2, -r); g.stroke(); }
        let k = 0; for (const q of IT.balls.list) if (q.inBin && q.spr) { const a = k * 2.3 + 0.6, d = r * 0.3; g.drawImage(q.spr.c, Math.cos(a) * d - q.spr.s * 0.42, Math.sin(a) * d - q.spr.s * 0.42, q.spr.s * 0.84, q.spr.s * 0.84); k++; }
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.6 * U; g.beginPath(); g.arc(0, 0, r * 0.93, Math.PI * 1.05, Math.PI * 1.65); g.stroke();
        g.restore();
      }
      function drawPen(g, p, x, y, a, sc) {
        const L = p.len * sc, w = 7 * U;
        g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = 'rgba(20,10,0,0.25)'; rr(g, -L / 2 + 2 * U, -w / 2 + 3 * U, L, w, w / 2); g.fill();
        if (p.kind === 'pencil') {
          g.fillStyle = '#f2c230'; g.fillRect(-L / 2, -w / 2, L * 0.8, w);
          g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(-L / 2, 0.4 * U, L * 0.8, 1.4 * U);
          g.fillStyle = '#f3cfa2'; g.beginPath(); g.moveTo(L * 0.3, -w / 2); g.lineTo(L / 2, 0); g.lineTo(L * 0.3, w / 2); g.closePath(); g.fill();
          g.fillStyle = '#3a3a3a'; g.beginPath(); g.moveTo(L * 0.44, -w * 0.16); g.lineTo(L / 2, 0); g.lineTo(L * 0.44, w * 0.16); g.closePath(); g.fill();
          g.fillStyle = '#c7ccd2'; g.fillRect(-L / 2 - 3 * U, -w / 2, 4 * U, w); g.fillStyle = '#f08ca0'; rr(g, -L / 2 - 8 * U, -w / 2, 6 * U, w, 2 * U); g.fill();
        } else {
          g.fillStyle = p.col; rr(g, -L / 2, -w / 2, L, w, w / 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.38)'; g.fillRect(-L / 2 + 3 * U, -w / 2 + 1.2 * U, L - 6 * U, 1.2 * U);
          g.fillStyle = shadeHex(p.col, 0.66); rr(g, -L * 0.36, -w / 2 - 1.5 * U, 3 * U, w + 3 * U, 1 * U); g.fill();
          g.fillStyle = '#cfd3d8'; g.beginPath(); g.moveTo(L / 2 - 1, -w * 0.42); g.lineTo(L / 2 + 6 * U, 0); g.lineTo(L / 2 - 1, w * 0.42); g.closePath(); g.fill();
        }
        g.restore();
      }
      function drawPens(g, tn) {
        const P0 = IT.pens, kk = prog(P0, tn), pt = IT.pot, r = 17 * U, D = K.dark();
        blob(g, pt.x + 4 * U, pt.y + 6 * U, r * 1.4, r * 1.35, 0.42);
        g.fillStyle = D ? '#8e897e' : '#ece7da'; circle(g, pt.x, pt.y, r); g.fill();
        const ig = g.createRadialGradient(pt.x - r * 0.2, pt.y - r * 0.25, 1, pt.x, pt.y, r * 0.78); ig.addColorStop(0, D ? '#2a2826' : '#4a4640'); ig.addColorStop(1, D ? '#4a463f' : '#8a847a');
        g.fillStyle = ig; circle(g, pt.x, pt.y, r * 0.76); g.fill();
        g.fillStyle = '#5ab4a0'; circle(g, pt.x - r * 0.3, pt.y + r * 0.22, 3.6 * U); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; circle(g, pt.x - r * 0.3 - 1, pt.y + r * 0.22 - 1, 1.3 * U); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.4 * U; g.beginPath(); g.arc(pt.x, pt.y, r * 0.9, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
        P0.list.forEach((p, i) => {
          const ki = clamp(kk * 1.6 - i * 0.3, 0, 1), e = E.inOutCubic(ki);
          if (ki >= 1) { const a = i * 2.1 + 0.4, d = r * 0.36; g.fillStyle = p.kind === 'pencil' ? '#f08ca0' : p.col; circle(g, pt.x + Math.cos(a) * d, pt.y + Math.sin(a) * d, 3.8 * U); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; circle(g, pt.x + Math.cos(a) * d - 1, pt.y + Math.sin(a) * d - 1, 1.4 * U); g.fill(); return; }
          drawPen(g, p, p.x + (pt.x - p.x) * e, p.y + (pt.y - p.y) * e - Math.sin(Math.PI * e) * 26 * U, p.r + wrapA(-Math.PI / 2 - p.r) * e, 1 - 0.8 * e);
        });
      }
      function drawSheet(g, x, y, a, sc, D) {
        const w = 84 * U * sc, hh = 108 * U * sc;
        g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = 'rgba(20,10,0,0.2)'; g.fillRect(-w / 2 + 2 * U, -hh / 2 + 3 * U, w, hh);
        g.fillStyle = D ? '#d6d3c8' : '#fbfaf5'; g.fillRect(-w / 2, -hh / 2, w, hh);
        g.fillStyle = 'rgba(40,50,70,0.36)'; g.fillRect(-w / 2 + w * 0.12, -hh / 2 + hh * 0.1, w * 0.5, Math.max(1.5, hh * 0.04));
        g.fillStyle = 'rgba(40,50,70,0.16)'; for (let i = 0; i < 9; i++) g.fillRect(-w / 2 + w * 0.12, -hh / 2 + hh * (0.22 + i * 0.075), w * (i % 3 === 2 ? 0.48 : 0.76), Math.max(1, hh * 0.018));
        g.restore();
      }
      function drawPapers(g, tn) {
        const P0 = IT.papers, kk = prog(P0, tn), D = K.dark();
        P0.list.forEach((s, i) => { const ki = clamp(kk * 1.5 - i * 0.25, 0, 1), e = E.inOutCubic(ki); drawSheet(g, s.x + (P0.tx + i * 1.2 * U - s.x) * e, s.y + (P0.ty - i * 1.6 * U - s.y) * e - Math.sin(Math.PI * e) * 10 * U, s.r + (P0.ta - s.r) * e, s.sc + (P0.ts - s.sc) * e, D); });
      }
      function drawBook(g, x, y, a, col, open, D) {
        const B0 = IT.books, w = B0.w, hh = B0.hh;
        g.save(); g.translate(x, y); g.rotate(a);
        const ww = w * (1 + open);
        g.fillStyle = 'rgba(20,10,0,0.28)'; rr(g, -ww / 2 + 3 * U, -hh / 2 + 4 * U, ww, hh, 3 * U); g.fill();
        if (open > 0.04) {
          g.fillStyle = shadeHex(col, 0.72); rr(g, -ww / 2 - 2 * U, -hh / 2 - 2 * U, ww + 4 * U, hh + 4 * U, 3 * U); g.fill();
          g.fillStyle = D ? '#d6cdb8' : '#f6efdc'; rr(g, -ww / 2, -hh / 2, ww, hh, 2 * U); g.fill();
          const gg = g.createLinearGradient(-ww * 0.12, 0, ww * 0.12, 0); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.5, 'rgba(60,40,10,0.28)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gg; g.fillRect(-ww * 0.12, -hh / 2, ww * 0.24, hh);
          g.fillStyle = 'rgba(40,40,60,0.2)';
          for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 7; i++) g.fillRect(s < 0 ? -ww / 2 + ww * 0.06 : ww * 0.06, -hh / 2 + hh * (0.14 + i * 0.11), ww * 0.36 * (i % 3 === 2 ? 0.6 : 1), Math.max(1, hh * 0.02));
        } else {
          g.fillStyle = col; rr(g, -w / 2, -hh / 2, w, hh, 3 * U); g.fill();
          g.fillStyle = shadeHex(col, 0.72); g.fillRect(-w / 2, -hh / 2, 9 * U, hh);
          g.fillStyle = D ? '#cfc6b0' : '#f3ead4'; g.fillRect(w / 2 - 3 * U, -hh / 2 + 3 * U, 3 * U, hh - 6 * U);
          g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(-w / 2 + 16 * U, -hh / 2 + hh * 0.2, w * 0.5, 3 * U); g.fillRect(-w / 2 + 16 * U, -hh / 2 + hh * 0.2 + 7 * U, w * 0.32, 2 * U);
        }
        g.restore();
      }
      function drawBooks(g, tn) {
        const B0 = IT.books, kk = prog(B0, tn), e1 = E.inOutCubic(clamp(kk * 2, 0, 1)), e2 = E.inOutCubic(clamp(kk * 2 - 1, 0, 1)), D = K.dark();
        drawBook(g, B0.a.x + (B0.tx - B0.a.x) * e2, B0.a.y + (B0.ty - B0.a.y) * e2, B0.a.r * (1 - e2), B0.cols[0], 0, D);
        const bx = B0.b.x + (B0.tx - 3 * U - B0.b.x) * e2, by = B0.b.y + (B0.ty - 5 * U - B0.b.y) * e2 - Math.sin(Math.PI * e2) * 18 * U;
        drawBook(g, bx, by, B0.b.r * (1 - e2) + 0.04 * e2, B0.cols[1], 0.82 * (1 - e1), D);
      }
      function drawCrumbs(g, tn) {
        const c0 = IT.crumbs, kk = prog(c0, tn), e = E.inOutCubic(kk), D = K.dark();
        if (kk < 1) {
          g.fillStyle = D ? '#9c7442' : '#c99252';
          c0.list.forEach((q, i) => { const ki = clamp(e * 1.4 - i / c0.list.length * 0.4, 0, 1); if (ki >= 1) return; g.globalAlpha = 1 - ki; g.beginPath(); g.ellipse(c0.x + q.dx * U + c0.sx * ki * ki, c0.y + q.dy * U + c0.sy * ki * ki, q.r * U, q.r * 0.8 * U, q.a, 0, TAU); g.fill(); });
          g.globalAlpha = 1;
        }
        const w = c0.wr, s = 1 - 0.5 * e, jag = 1 - e;
        g.save(); g.translate(w.x, w.y); g.rotate(w.r * (1 - e) + wob(c0, tn)); g.scale(s, s);
        const pts = [[-22, -12], [-6, -16], [10, -11], [24, -14], [22, 2], [25, 13], [6, 11], [-12, 15], [-24, 10], [-20, -1]].map(([x, y], i) => [(x * (1 - 0.35 * e) + JIT[30 + i] * 6 * jag) * U, (y * (1 - 0.1 * e) + JIT[50 + i] * 6 * jag) * U]);
        g.fillStyle = 'rgba(20,10,0,0.22)'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] + 2 * U, p[1] + 3 * U) : g.moveTo(p[0] + 2 * U, p[1] + 3 * U))); g.closePath(); g.fill();
        g.fillStyle = '#d94848'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
        g.fillStyle = 'rgba(235,238,242,0.85)'; g.beginPath(); g.moveTo(pts[1][0] * 0.6, pts[1][1] * 0.6); g.lineTo(pts[3][0] * 0.6, pts[3][1] * 0.6); g.lineTo(pts[6][0] * 0.6, pts[6][1] * 0.6); g.lineTo(pts[8][0] * 0.6, pts[8][1] * 0.6); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(pts[i * 2][0] * 0.8, pts[i * 2][1] * 0.8); g.lineTo(pts[i * 2 + 1][0] * 0.3, pts[i * 2 + 1][1] * 0.3); g.stroke(); }
        g.restore();
      }
      function lampMouth() { const L0 = IT.lamp, aim = Math.atan2(IT.pad.y - L0.y, IT.pad.x - L0.x); return { x: L0.x + Math.cos(aim) * L0.r * 0.42, y: L0.y + Math.sin(aim) * L0.r * 0.42, aim }; }
      function drawLamp(g, tn) {
        const L0 = IT.lamp, r = L0.r, on = G.lamp, D = K.dark(), lc = DESK.lamp, m = lampMouth(), aim = m.aim + wob(L0, tn) * 0.5;
        const back = { x: L0.x - Math.cos(aim) * r * 0.86, y: L0.y - Math.sin(aim) * r * 0.86 }, base = L0.base;
        const mx = (base.x + back.x) / 2, my = (base.y + back.y) / 2, bl = Math.hypot(back.x - base.x, back.y - base.y) || 1;
        const elbow = { x: mx + (back.y - base.y) / bl * 22 * U, y: my - (back.x - base.x) / bl * 22 * U };
        blob(g, L0.x + 9 * U, L0.y + 13 * U, r * 1.25, r * 1.05, 0.34);
        blob(g, base.x + 5 * U, base.y + 7 * U, r * 0.62, r * 0.58, 0.42);
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(20,10,0,0.25)'; g.lineWidth = 5 * U; g.beginPath(); g.moveTo(base.x + 4 * U, base.y + 6 * U); g.lineTo(elbow.x + 4 * U, elbow.y + 6 * U); g.lineTo(back.x + 4 * U, back.y + 6 * U); g.stroke();
        g.strokeStyle = D ? '#3a3c42' : '#4a4d55'; g.lineWidth = 4.6 * U; g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(elbow.x, elbow.y); g.lineTo(back.x, back.y); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.2 * U; g.beginPath(); g.moveTo(base.x - 1, base.y - 1); g.lineTo(elbow.x - 1, elbow.y - 1); g.lineTo(back.x - 1, back.y - 1); g.stroke();
        g.strokeStyle = 'rgba(200,205,212,0.7)'; g.lineWidth = 1 * U; g.beginPath();
        for (let i = 0; i <= 8; i++) { const t = 0.2 + i * 0.075, px = base.x + (elbow.x - base.x) * t, py = base.y + (elbow.y - base.y) * t, o = (i % 2 ? 3 : -3) * U; g.lineTo(px + (elbow.y - base.y) / bl * o, py - (elbow.x - base.x) / bl * o); }
        g.stroke();
        const bgr = g.createRadialGradient(base.x - r * 0.12, base.y - r * 0.14, 1, base.x, base.y, r * 0.4); bgr.addColorStop(0, D ? '#5c5f66' : '#6d717a'); bgr.addColorStop(1, '#202226');
        g.fillStyle = bgr; circle(g, base.x, base.y, r * 0.4); g.fill();
        g.fillStyle = shadeHex(lc, 0.9); circle(g, elbow.x, elbow.y, 3.6 * U); g.fill();
        g.save(); g.translate(L0.x, L0.y); g.rotate(aim);
        const sg = g.createLinearGradient(0, -r * 0.64, 0, r * 0.64);
        sg.addColorStop(0, shadeHex(lc, 1.32)); sg.addColorStop(0.45, shadeHex(lc, 1)); sg.addColorStop(1, shadeHex(lc, 0.66));
        g.fillStyle = sg; g.beginPath(); g.moveTo(-r * 0.86, -r * 0.26); g.quadraticCurveTo(-r * 0.2, -r * 0.4, r * 0.34, -r * 0.64); g.lineTo(r * 0.34, r * 0.64); g.quadraticCurveTo(-r * 0.2, r * 0.4, -r * 0.86, r * 0.26); g.closePath(); g.fill();
        g.fillStyle = shadeHex(lc, 0.7); g.beginPath(); g.ellipse(-r * 0.86, 0, r * 0.09, r * 0.26, 0, 0, TAU); g.fill();
        g.fillStyle = shadeHex(lc, 0.86); g.beginPath(); g.ellipse(r * 0.34, 0, r * 0.22, r * 0.64, 0, 0, TAU); g.fill();
        g.fillStyle = on > 0.02 ? 'rgba(255,240,205,' + (0.55 + 0.45 * on).toFixed(3) + ')' : (D ? '#4b4842' : '#dcd5c8'); g.beginPath(); g.ellipse(r * 0.37, 0, r * 0.16, r * 0.53, 0, 0, TAU); g.fill();
        g.fillStyle = on > 0.02 ? '#fffaf0' : (D ? '#6b675e' : '#f4efe4'); circle(g, r * 0.38, 0, r * 0.17); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.32)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.3, r * 0.42, r * 0.06, -0.12, 0, TAU); g.fill();
        g.restore();
      }
      function drawPlant(g, tn) {
        const p = IT.plant, r = p.r, sw = wob(p, tn), D = K.dark();
        blob(g, p.x + 6 * U, p.y + 8 * U, r * 1.15, r * 1.08, 0.42);
        g.fillStyle = '#b8643f'; circle(g, p.x, p.y, r * 0.46); g.fill(); g.fillStyle = '#4a2f1f'; circle(g, p.x, p.y, r * 0.37); g.fill();
        for (let i = 0; i < 11; i++) {
          const a = i / 11 * TAU + 0.3 + sw * (i % 2 ? 1 : -1) * 0.7, d = r * (0.44 + (i % 3) * 0.08), lw = r * (0.22 + (i % 2) * 0.05), ll = r * (0.52 + (i % 3) * 0.1);
          const cx = p.x + Math.cos(a) * d, cy = p.y + Math.sin(a) * d;
          g.fillStyle = i % 2 ? (D ? '#2c5839' : '#4b955a') : (D ? '#3a6c47' : '#63b06e');
          g.beginPath(); g.ellipse(cx, cy, ll, lw, a, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.2 * U; g.beginPath(); g.moveTo(cx - Math.cos(a) * ll * 0.8, cy - Math.sin(a) * ll * 0.8); g.lineTo(cx + Math.cos(a) * ll * 0.85, cy + Math.sin(a) * ll * 0.85); g.stroke();
        }
      }
      function drawTreasure(g, t, tn) {
        let hgt = 0, sq = 0, al = 1;
        if (t.drop) { // the newest treasure falls onto the desk: it grows as it nears, squashes on landing
          const q = clamp((tn - t.drop) / 720, 0, 1);
          if (q <= 0) return;
          hgt = Math.pow(1 - q, 2); sq = q > 0.78 ? Math.sin((q - 0.78) / 0.22 * Math.PI) * 0.16 : 0; al = Math.min(1, q * 3);
          if (q >= 1) { t.drop = 0; t.landed = true; landTreasure(t); }
        }
        const s = t.s * (1 + hgt * 0.85);
        blob(g, t.x + (3 + hgt * 26) * t.s, t.y + (5 + hgt * 38) * t.s, 24 * s, 21 * s, 0.38 * (1 - hgt * 0.65) * al);
        g.save(); g.globalAlpha = al; g.translate(t.x, t.y - hgt * 30 * t.s); g.scale(s * (1 + sq), s * (1 - sq)); g.rotate(wob(t, tn));
        const D = K.dark();
        if (t.id === 'cat') {
          g.fillStyle = '#fbf7ef'; g.beginPath(); g.moveTo(-14, -9); g.lineTo(-11, -21); g.lineTo(-3, -13); g.lineTo(3, -13); g.lineTo(11, -21); g.lineTo(14, -9); g.closePath(); g.fill();
          circle(g, 0, 0, 15); g.fill(); g.fillStyle = '#f2a0a8'; g.beginPath(); g.moveTo(-11, -12); g.lineTo(-10, -18); g.lineTo(-6, -13); g.closePath(); g.fill(); g.beginPath(); g.moveTo(11, -12); g.lineTo(10, -18); g.lineTo(6, -13); g.closePath(); g.fill();
          g.strokeStyle = '#d63a3a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 12, 0.35, Math.PI - 0.35); g.stroke(); g.fillStyle = '#f2c230'; circle(g, 0, 11, 3); g.fill();
          g.strokeStyle = '#3a3030'; g.lineWidth = 1.4; g.beginPath(); g.arc(-5, -3, 2.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(5, -3, 2.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
          g.fillStyle = '#fbf7ef'; g.beginPath(); g.ellipse(15, -7, 5, 7, 0.3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.15)'; g.stroke();
        } else if (t.id === 'cactus') {
          g.fillStyle = '#c4704e'; circle(g, 0, 0, 15); g.fill(); g.fillStyle = '#4a2f1f'; circle(g, 0, 0, 12); g.fill();
          g.fillStyle = '#4f9a5e'; circle(g, 0, 0, 10); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); g.stroke(); }
          g.fillStyle = '#ff7aa8'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; circle(g, Math.cos(a) * 3, Math.sin(a) * 3, 2.4); g.fill(); } g.fillStyle = '#ffe07a'; circle(g, 0, 0, 1.8); g.fill();
        } else if (t.id === 'globe') {
          g.fillStyle = '#7a5232'; circle(g, 0, 0, 17); g.fill();
          const gg = g.createRadialGradient(-5, -6, 2, 0, 0, 14); gg.addColorStop(0, 'rgba(230,245,255,0.95)'); gg.addColorStop(1, 'rgba(150,190,230,0.75)'); g.fillStyle = gg; circle(g, 0, 0, 14); g.fill();
          g.fillStyle = '#2f7a4f'; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 4); g.lineTo(-6, 4); g.closePath(); g.fill();
          g.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { const a = i * 2.4, d = 4 + (i % 3) * 3; circle(g, Math.cos(a) * d, Math.sin(a) * d, 1); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-6, -7, 4, 2, -0.7, 0, TAU); g.fill();
        } else if (t.id === 'duck') {
          g.fillStyle = '#ffd43b'; g.beginPath(); g.ellipse(-2, 2, 15, 11, 0, 0, TAU); g.fill(); circle(g, 9, -5, 8); g.fill();
          g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(17, -4, 5, 2.6, 0.1, 0, TAU); g.fill();
          g.fillStyle = '#2a2a2a'; circle(g, 10, -7, 1.5); g.fill(); g.strokeStyle = '#e8b520'; g.lineWidth = 1.5; g.beginPath(); g.arc(-4, 3, 7, 3.6, 5.6); g.stroke();
        } else if (t.id === 'radio') {
          g.fillStyle = '#2f9e93'; rr(g, -19, -12, 38, 24, 5); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { circle(g, -13 + i * 5, -5 + j * 5, 1.4); g.fill(); }
          g.fillStyle = '#f4efe2'; circle(g, 10, 0, 6); g.fill(); g.strokeStyle = '#d64545'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, 0); g.lineTo(13, -4); g.stroke();
          g.strokeStyle = '#9aa0a8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(14, -12); g.lineTo(24, -24); g.stroke();
        } else {
          const sg = g.createRadialGradient(-4, -4, 2, 0, 0, 15); sg.addColorStop(0, D ? '#a9b2bd' : '#c9d1da'); sg.addColorStop(1, D ? '#5d6670' : '#7b8590');
          g.fillStyle = sg; g.beginPath(); g.ellipse(0, 0, 15, 11, 0.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-1, -1, 6, 4, 0.3, 0, TAU); g.fill();
        }
        g.restore();
      }
      function landTreasure(t) {
        poke(t, 0.2);
        PF.emit('star', t.x, t.y, 14, { colors: ['#fff6d6', '#ffe08a', '#ffd0a0'], speed: [50, 150] });
        PF.emit('dust', t.x, t.y + 10 * t.s, 8, { colors: ['rgba(255,245,225,0.75)'], speed: [20, 60] });
        if (!A.ctx) return;
        const tt = A.now();
        A.thud({ vol: 0.16 });
        ['C6', 'E6', 'G6', 'C7'].forEach((nm, i) => A.chime(A.note(nm), { when: tt + 0.06 + i * 0.09, vol: 0.05, dur: 1.1 }));
        sync('treasure');
      }

      /* ---------------- sticky notes (DOM, so the player's words stay crisp; moved by transform only) ---------------- */
      const notes = [], PF = K.particles({ max: 320 });
      let zTop = 20, DR = null, nid = 0;
      function noteXY(n) {
        const s = n.s * (1 + n.lift * 0.06) * (n.sqT ? 1 - 0.05 * Math.sin(Math.PI * clamp((now() - n.sqT) / 260, 0, 1)) : 1), a = n.a + (n.wa || 0);
        n.el.style.transform = 'translate3d(' + (n.x - NS / 2).toFixed(1) + 'px,' + (n.y - NS / 2).toFixed(1) + 'px,0) rotate(' + a.toFixed(4) + 'rad) scale(' + s.toFixed(4) + ')';
      }
      const longish = (t) => t.length > 17 || t.split(/\s+/).some(w => w.length > 8);
      const ntSpan = (d, big) => h('span', { class: 'cd-nt' + (d.own ? ' gk-user' : '') + (big ? ' cd-big' : '') + (longish(d.text) ? ' cd-long' : ''), text: d.text });
      function fillNote(n, i) {
        const d = n.d, card = !d.own && !d.piece, pal = d.piece ? HOT : PAPERS[(i + K.daily()) % PAPERS.length];
        n.el.className = 'cd-note' + (card ? ' cd-card' : '');
        n.el.style.setProperty('--cd-p1', pal[0]); n.el.style.setProperty('--cd-p2', pal[1]);
        n.el.textContent = '';
        const tag = card ? 'example' : d.piece ? 'part of it' : '';
        if (tag) n.el.append(h('span', { class: 'cd-nk', text: tag }));
        n.el.append(ntSpan(d));
        n.el.setAttribute('aria-label', (card ? 'Example note: ' : d.piece ? 'Small piece: ' : 'Sticky note: ') + d.text + '. Flick it into a tray, or press 1 for Now, 2 for Later, 3 for Not mine.');
      }
      function makeNote(d, i) {
        const n = { id: ++nid, d, el: h('div', { role: 'button', tabindex: '0' }), x: 0, y: 0, a: 0, s: 1, lift: 0, lt: 0, vx: 0, vy: 0, w: 0, wa: 0, wig: 0, wigT: 0, sqT: 0,
          state: 'rest', thrown: false, assisted: false, flicks: 0, tray: -1, ox: 0, oy: 0, ia: 0, cand: false, fly: null, cap: null };
        fillNote(n, i);
        layer.append(n.el);
        bindNote(n);
        notes.push(n);
        return n;
      }
      const canSort = (n) => (G.phase === 'sort' || G.phase === 'peel' || G.phase === 'sort2') && (n.state === 'rest' || n.state === 'slide');
      const inOrg = (x) => x > ORG.l - NS * 0.45 && x < ORG.r + NS * 0.45;
      const trayAt = (x) => { let b = 0; TR.forEach((T, i) => { if (Math.abs(x - T.cx) < Math.abs(x - TR[b].cx)) b = i; }); return b; };
      function setHot(i) { if (G.hot === i) return; G.hot = i; TR.forEach((T, k) => T.el.classList.toggle('cd-hot', k === i)); }
      function bindNote(n) {
        K.press(n.el, { space: el, down: (p) => grab(n, p), move: (p) => drag(n, p), up: () => release(n) });
        S.listen(n.el, 'keydown', (e) => {
          if (G.phase === 'pin' && n.cand && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); A.unlock(); pinNote(n); return; }
          const k = { Digit1: 0, Numpad1: 0, ArrowLeft: 0, Digit2: 1, Numpad2: 1, ArrowUp: 1, Digit3: 2, Numpad3: 2, ArrowRight: 2 }[e.code];
          if (k == null || !canSort(n)) return;
          e.preventDefault(); A.unlock(); flingTo(n, k);
        });
      }
      function grab(n, p) {
        if (G.phase === 'pin') { if (n.cand && !DR) DR = { n, mode: 'pin', p0: p, moved: 0 }; return; }
        if (n.state === 'in') { if (A.ctx) A.paper({ vol: 0.05, freq: 2400, dur: 0.06 }); return; }
        if (!canSort(n) || DR) return;
        DR = { n, mode: 'drag', p0: p, moved: 0, rl: rot(p.x - n.x, p.y - n.y, -n.a), hist: [{ x: p.x, y: p.y, a: n.a, t: now() }] };
        n.state = 'drag'; n.vx = n.vy = n.w = 0; n.lt = 1; n.thrown = false; n.assisted = false;
        n.el.classList.add('cd-lift'); n.el.style.zIndex = String(++zTop);
        sLift(); if (S.buzz) S.buzz(6);
      }
      function drag(n, p) {
        if (!DR || DR.n !== n) return;
        DR.moved = Math.max(DR.moved, Math.hypot(p.x - DR.p0.x, p.y - DR.p0.y));
        if (DR.mode !== 'drag') return;
        const lever = Math.hypot(DR.rl.x, DR.rl.y);
        if (lever > 5) { // paper dragged by a corner trails behind the finger
          const phi = Math.atan2(n.y - p.y, n.x - p.x), base = Math.atan2(-DR.rl.y, -DR.rl.x);
          n.a += wrapA(phi - base - n.a) * 0.45 * clamp(lever / (NS * 0.45), 0, 1);
        }
        const r = rot(DR.rl.x, DR.rl.y, n.a);
        n.x = clamp(p.x - r.x, WALL.l + NS * 0.3, WALL.r - NS * 0.3);
        n.y = clamp(p.y - r.y, ORG.t + 30, WALL.b - NS * 0.3);
        const tn = now(), last = DR.hist[DR.hist.length - 1], ddt = Math.max(0.008, (tn - last.t) / 1000);
        G.dvx = (p.x - last.x) / ddt; G.dvy = (p.y - last.y) / ddt; G.dragSp = Math.min(2600, Math.hypot(G.dvx, G.dvy));
        DR.hist.push({ x: p.x, y: p.y, a: n.a, t: tn });
        while (DR.hist.length > 2 && tn - DR.hist[0].t > 140) DR.hist.shift();
        setHot(n.y < capY + 4 && inOrg(n.x) ? trayAt(n.x) : -1);
        pushBalls(n);
        noteXY(n);
      }
      function release(n) {
        if (!DR || DR.n !== n) return;
        const d = DR; DR = null; G.dragSp = 0;
        if (d.mode === 'pin') { pinNote(n); return; }
        n.el.classList.remove('cd-lift'); n.lt = 0; setHot(-1);
        const tn = now(), hs = d.hist;
        let vx = 0, vy = 0, w = 0;
        if (hs.length >= 2) {
          let i0 = 0; while (i0 < hs.length - 2 && tn - hs[i0].t > 90) i0++;
          const a0 = hs[i0], a1 = hs[hs.length - 1], dt = Math.max(0.012, (a1.t - a0.t) / 1000);
          vx = (a1.x - a0.x) / dt; vy = (a1.y - a0.y) / dt; w = wrapA(a1.a - a0.a) / dt;
          const stale = tn - a1.t; if (stale > 50) { const f = Math.max(0, 1 - (stale - 50) / 120); vx *= f; vy *= f; w *= f; }
        }
        const sp = Math.hypot(vx, vy); if (sp > 2600) { vx *= 2600 / sp; vy *= 2600 / sp; }
        if (n.y < capY && inOrg(n.x)) { n.flicks++; capture(n, trayAt(n.x)); return; }
        if (d.moved < 10 && sp < 150) { n.state = 'rest'; n.wig = 1; n.wigT = tn; sDrop(0.7); tapNudge(n); return; }
        n.vx = vx; n.vy = vy; n.w = clamp(w * 0.5, -10, 10); n.state = 'slide'; n.thrown = true; n.flicks++;
        sDrop(0.6);
      }
      function tapNudge(n) {
        if (G.phase !== 'sort' && G.phase !== 'sort2' && G.phase !== 'peel') return;
        K.guide(flickGuide(n, 'tap-', 250));
      }
      /* The hand starts low on the note and flicks up; the label sits under the note, so it never covers the words. */
      function flickGuide(n, id, delay) {
        return { id: id + n.id, g: 'drag', target: n.el, oy: 0.86, place: 'below', dx: clamp((TR[1].cx - n.x) * 0.5, -80, 80), dy: -clamp(n.y + NS * 0.36 - capY - 10, 90, 190), label: 'FLICK INTO A TRAY', ms: 1300, delay };
      }
      function flingTo(n, ti) {
        const T = TR[ti], dx = T.cx - n.x, dy = (capY - 30) - n.y, d = Math.hypot(dx, dy) || 1, v = Math.sqrt(2 * MU * d) * 1.2 + 90;
        n.vx = dx / d * v; n.vy = dy / d * v; n.w = (Math.random() - 0.5) * 3; n.state = 'slide'; n.thrown = true; n.assisted = false; n.flicks++;
        n.el.style.zIndex = String(++zTop); sDrop(0.6);
      }
      function slideStep(n, hs) {
        const sp = Math.hypot(n.vx, n.vy);
        if (sp > 0.001) { const dec = Math.min(sp, (MU + sp * LIN) * hs); n.vx -= n.vx / sp * dec; n.vy -= n.vy / sp * dec; }
        n.x += n.vx * hs; n.y += n.vy * hs; n.a += n.w * hs; n.w *= Math.exp(-4.5 * hs);
        const r = NS * 0.42;
        if (n.x < WALL.l + r) { n.x = WALL.l + r; if (n.vx < 0) { sBump(-n.vx); n.w += n.vy * 0.004; n.vx = -n.vx * 0.42; } }
        if (n.x > WALL.r - r) { n.x = WALL.r - r; if (n.vx > 0) { sBump(n.vx); n.w -= n.vy * 0.004; n.vx = -n.vx * 0.42; } }
        if (n.y > WALL.b - r) { n.y = WALL.b - r; if (n.vy > 0) { sBump(n.vy); n.w -= n.vx * 0.004; n.vy = -n.vy * 0.42; } }
        if (n.y < capY) {
          if (inOrg(n.x)) { capture(n, trayAt(n.x)); return; }
          if (n.y < WALL.t) { n.y = WALL.t; if (n.vy < 0) { sBump(-n.vy); n.vy = -n.vy * 0.42; } }
        }
        pushBalls(n);
        const sp2 = Math.hypot(n.vx, n.vy);
        if (n.thrown && !n.assisted && sp2 < 190 && n.vy < 40 && n.y - capY < MAGNET && inOrg(n.x)) {
          n.assisted = true; n.vy = -(Math.sqrt(2 * MU * (n.y - capY + 26)) + 90); n.vx *= 0.4;
        }
        if (sp2 < 4) { n.vx = n.vy = 0; n.state = 'rest'; stopped(n); }
      }
      function stopped(n) {
        if (!n.thrown) return;
        n.thrown = false; n.assisted = false;
        if (G.phase !== 'sort' && G.phase !== 'sort2' && G.phase !== 'peel') return;
        const tn = now();
        if (tn - G.shortSaid > 9000) { G.shortSaid = tn; say(rush, line({ Jolly: 'Bit short! Give it a proper flick.', Cheeky: 'It got tired. Flick harder, champ.', Unfiltered: 'Short. Flick harder.' }), { mood: 'think', moodMs: 1400, ms: 2200 }); }
        guideNext(700);
      }
      function capture(n, ti) {
        const T = TR[ti];
        n.state = 'cap'; n.tray = ti; n.thrown = false;
        n.ox = JIT[(n.id * 7) % 80] * (T.w - 10) * 0.18; n.oy = JIT[(n.id * 11 + 3) % 80] * 8 - Math.min(T.notes.length, 6) * 1.5; n.ia = JIT[(n.id * 5 + 1) % 80] * 0.36;
        n.cap = { t0: now(), dur: 240, x0: n.x, y0: n.y, a0: n.a, s0: n.s, vx: clamp(n.vx, -1500, 1500), vy: clamp(n.vy, -1500, 1500), x1: T.px + (T.w - 10) / 2 + n.ox, y1: T.py + T.fh / 2 + 3 + n.oy };
        n.bull = Math.abs(n.x - T.cx) < T.w * 0.24;
        n.el.classList.remove('cd-lift'); n.lt = 0; setHot(ti);
        if (A.ctx) A.whoosh({ vol: 0.05, dur: 0.18, from: 900, to: 2600 });
      }
      function capStep(n, tn) {
        const c = n.cap, p = clamp((tn - c.t0) / c.dur, 0, 1), d = c.dur / 1000, p2 = p * p, p3 = p2 * p;
        const h00 = 2 * p3 - 3 * p2 + 1, h10 = p3 - 2 * p2 + p, h01 = 3 * p2 - 2 * p3;
        n.x = h00 * c.x0 + h10 * c.vx * d * 0.6 + h01 * c.x1; n.y = h00 * c.y0 + h10 * c.vy * d * 0.6 + h01 * c.y1;
        n.a = c.a0 + wrapA(n.ia - c.a0) * E.outCubic(p); n.s = c.s0 + (TSC - c.s0) * E.outCubic(p) + Math.sin(Math.PI * p) * 0.05;
        if (p >= 1) landed(n);
      }
      function landed(n) {
        const T = TR[n.tray];
        n.state = 'in'; n.s = TSC; n.lift = n.lt = 0; n.a = n.ia;
        n.x = (T.w - 10) / 2 + n.ox; n.y = T.fh / 2 + 3 + n.oy;
        T.floor.append(n.el); n.el.style.zIndex = String(2 + T.notes.length); n.el.setAttribute('tabindex', '-1');
        noteXY(n); T.notes.push(n);
        T.el.classList.remove('cd-bump'); void T.el.offsetWidth; T.el.classList.add('cd-bump');
        T.count.textContent = String(T.notes.length); T.count.classList.add('on');
        setHot(-1);
        G.sorted++; G.counts[n.tray]++;
        const clean = n.flicks <= 1; if (clean) G.clean++;
        G.scores.push(clean ? (n.bull ? 1 : 0.82) : 0.55);
        MZ.tidy = clamp(G.sorted / G.total, 0, 1); if (G.sorted >= 2) MZ.layer = Math.max(MZ.layer, 1);
        sThunk(n.tray, G.sorted - 1);
        const fy = T.y + T.fh * 0.85;
        PF.emit('dust', T.cx, fy, 9, { colors: ['rgba(255,250,235,0.85)', 'rgba(255,236,200,0.6)'], angle: -Math.PI / 2, spread: 2.4, speed: [30, 100] });
        if (clean && n.bull) { PF.emit('star', T.cx, T.y + T.fh * 0.45, 10, { colors: ['#fff3c4', '#ffd36b', T.col], speed: [60, 170] }); pop('Bullseye!', T.cx, capY + 26, true); }
        else pop(clean ? 'Clean!' : 'In!', T.cx, capY + 26, false);
        if (S.buzz) S.buzz(10);
        tidyNext();
        reactSort(n);
        S.later(progress, 380);
      }
      function pop(text, x, y, gold) {
        const p = h('div', { class: 'cd-pop' + (gold ? ' cd-gold' : '') + (K.reduced() ? ' cd-still' : ''), 'aria-hidden': 'true', text });
        p.style.left = clamp(x, 70, W - 70) + 'px'; p.style.top = clamp(y, deskTop + 12, WALL.b - 20) + 'px';
        el.append(p); S.later(() => p.remove(), 1100);
      }
      function flyStep(n, tn) {
        const f = n.fly, p = clamp((tn - f.t0) / f.dur, 0, 1), e = E.outCubic(p);
        n.x = f.x0 + (f.x1 - f.x0) * e; n.y = f.y0 + (f.y1 - f.y0) * e - Math.sin(Math.PI * p) * (f.arc || 30) * U;
        n.a = f.a0 + wrapA(f.a1 - f.a0) * e; n.s = f.s0 + (f.s1 - f.s0) * e + Math.sin(Math.PI * p) * 0.08;
        if (p >= 1) {
          n.fly = null; n.state = f.state || 'rest';
          if (n.state === 'rest') { sDrop(0.8); PF.emit('dust', n.x, n.y + NS * 0.45, 6, { colors: ['rgba(255,245,225,0.7)'], speed: [15, 50] }); }
          if (f.done) f.done(n);
        }
      }

      /* ---------------- paper balls get knocked about by sliding notes ---------------- */
      function sCrinkle() { if (!A.ctx) return; for (let i = 0; i < 3; i++) A.paper({ when: A.now() + i * 0.03, vol: 0.04, freq: 3400 + i * 500, dur: 0.035 }); }
      function sTink() { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 1500, to: 1250, glide: 0.1, dur: 0.14, vol: 0.05 }); A.noise({ filter: 'highpass', freq: 4000, dur: 0.03, vol: 0.04 }); sync('tink'); }
      function pushBalls(n) {
        const R = NS * 0.44, tn = now();
        for (const b of IT.balls.list) {
          if (b.inBin || b.fly) continue;
          const dx = b.x - n.x, dy = b.y - n.y, d = Math.hypot(dx, dy), min = R + b.r;
          if (d < min && d > 0.01) {
            const nx = dx / d, ny = dy / d;
            b.x += nx * (min - d); b.y += ny * (min - d);
            const vx = n.state === 'drag' ? (G.dvx || 0) : n.vx, vy = n.state === 'drag' ? (G.dvy || 0) : n.vy, rel = vx * nx + vy * ny;
            if (rel > 0) { b.vx += nx * rel * 0.9; b.vy += ny * rel * 0.9; b.w += (Math.random() - 0.5) * 8; if (rel > 120 && tn - (b.snd || 0) > 160) { b.snd = tn; sCrinkle(); } }
            G.animUntil = Math.max(G.animUntil || 0, tn + 80);
          }
        }
      }
      function stepBalls(dt, tn) {
        for (const b of IT.balls.list) {
          if (b.inBin) continue;
          if (b.fly) {
            const p = clamp((tn - b.fly.t0) / b.fly.dur, 0, 1);
            if (p <= 0) continue;
            if (!b.fly.snd) { b.fly.snd = true; if (A.ctx) A.whoosh({ vol: 0.05, dur: 0.3, from: 500, to: 2000 }); }
            const e = E.inOutSine(p); b.x = b.fly.x0 + (b.fly.x1 - b.fly.x0) * e; b.y = b.fly.y0 + (b.fly.y1 - b.fly.y0) * e; b.lift = Math.sin(Math.PI * p); b.rot += dt * 9;
            if (p >= 1) { b.inBin = true; b.fly = null; b.lift = 0; sTink(); poke(IT.bin, 0.12); PF.emit('dust', IT.bin.x, IT.bin.y, 5, { colors: ['rgba(255,250,240,0.7)'], speed: [20, 60] }); }
            G.animUntil = Math.max(G.animUntil || 0, tn + 60); continue;
          }
          if (b.hopT) { const q = (tn - b.hopT) / 420; b.lift = q < 1 ? Math.sin(Math.PI * q) * 0.55 : 0; if (q >= 1) b.hopT = 0; G.animUntil = Math.max(G.animUntil || 0, tn + 60); }
          const sp = Math.hypot(b.vx, b.vy);
          if (sp > 1) {
            const dec = Math.min(sp, (520 + sp * 1.8) * dt); b.vx -= b.vx / sp * dec; b.vy -= b.vy / sp * dec;
            b.x += b.vx * dt; b.y += b.vy * dt; b.rot += (b.vx * 0.02 + b.w) * dt; b.w *= Math.exp(-3 * dt);
            if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.5; } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.5; }
            if (b.y < deskTop + b.r) { b.y = deskTop + b.r; b.vy = Math.abs(b.vy) * 0.5; } if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * 0.5; }
            G.animUntil = Math.max(G.animUntil || 0, tn + 60);
          } else { b.vx = 0; b.vy = 0; }
        }
      }

      /* ---------------- each sort tidies one thing on the desk ---------------- */
      const ORDER = K.shuffle(TIDY, K.rng(K.daily() * 7 + 1));
      const TDUR = { cable: 1200, mug: 1300, balls: 1500, pens: 1300, papers: 1150, phone: 900, books: 1300, crumbs: 1100 };
      function tidyNext() { if (G.tidyIx < ORDER.length) tidy(ORDER[G.tidyIx++]); }
      function tidy(kind, quick) {
        const tn = now(), dur = TDUR[kind] * (quick ? 0.7 : 1) * (K.reduced() ? 0.6 : 1);
        if (kind === 'balls') {
          let k = 0;
          IT.balls.list.forEach((b) => { if (b.inBin) return; b.vx = b.vy = 0; b.hopT = 0; b.fly = { t0: tn + k * 190, dur: 560, x0: b.x, y0: b.y, x1: IT.bin.x + (k - 1) * 6 * U, y1: IT.bin.y + (k % 2 ? 5 : -4) * U }; k++; });
          IT.balls.k = 1; G.animUntil = Math.max(G.animUntil || 0, tn + 1400);
        } else { const it = IT[kind]; it.an = { t0: tn, dur }; G.animUntil = Math.max(G.animUntil || 0, tn + dur + 80); }
        sTidy(kind);
        ctx.track('tidy', { k: kind });
      }
      function sTidy(kind) {
        if (!A.ctx) return;
        const t = A.now();
        if (kind === 'cable') { A.noise({ filter: 'bandpass', freq: 700, to: 3400, q: 3, dur: 0.75, attack: 0.08, vol: 0.06 }); A.click({ when: t + 0.95, vol: 0.08 }); A.tone({ when: t + 0.95, type: 'sine', freq: 660, to: 990, glide: 0.06, dur: 0.12, vol: 0.05 }); }
        if (kind === 'mug') { for (let i = 0; i < 2; i++) A.tone({ when: t + i * 0.16, type: 'sine', freq: 1700 + i * 300, to: 2300 + i * 300, glide: 0.07, dur: 0.09, vol: 0.03 }); A.noise({ when: t + 0.4, filter: 'bandpass', freq: 600, to: 1300, q: 0.8, dur: 0.7, attack: 0.15, vol: 0.05 }); A.chime(A.note('A5'), { when: t + 1.1, vol: 0.05, dur: 1 }); }
        if (kind === 'pens') for (let i = 0; i < 3; i++) { A.wood(t + 0.35 + i * 0.22, 0.07, 1.7 + i * 0.25); A.tone({ when: t + 0.36 + i * 0.22, type: 'triangle', freq: 1900 + i * 240, dur: 0.06, vol: 0.025 }); }
        if (kind === 'papers') { A.paper({ vol: 0.09, dur: 0.3, freq: 1800 }); A.wood(t + 0.9, 0.09, 0.62); A.wood(t + 1.05, 0.08, 0.66); }
        if (kind === 'phone') { A.whoosh({ vol: 0.06, dur: 0.3 }); A.wood(t + 0.62, 0.1, 1.15); A.tone({ when: t + 0.62, type: 'sine', freq: 180, to: 90, glide: 0.08, dur: 0.12, vol: 0.08 }); }
        if (kind === 'books') { for (let i = 0; i < 3; i++) A.paper({ when: t + i * 0.07, vol: 0.06, freq: 2200 + i * 400, dur: 0.06 }); A.tone({ when: t + 1.1, type: 'sine', freq: 130, to: 60, glide: 0.1, dur: 0.22, vol: 0.18 }); A.noise({ when: t + 1.1, filter: 'lowpass', freq: 600, dur: 0.1, vol: 0.08 }); }
        if (kind === 'crumbs') { A.noise({ filter: 'bandpass', freq: 3000, q: 0.6, dur: 0.6, attack: 0.15, vol: 0.05 }); for (let i = 0; i < 4; i++) A.tone({ when: t + 0.7 + i * 0.05, type: 'sine', freq: 2000 + i * 400, dur: 0.1, vol: 0.02 }); }
        sync('tidy');
      }
      const tidyPos = (k) => (k === 'cable' ? { x: IT.cable.cx, y: IT.cable.cy } : k === 'mug' ? IT.mug : k === 'pens' ? IT.pot : k === 'papers' ? { x: IT.papers.tx, y: IT.papers.ty }
        : k === 'phone' ? IT.phone.t : k === 'books' ? { x: IT.books.tx, y: IT.books.ty } : k === 'crumbs' ? IT.crumbs.wr : IT.bin);
      function checkTidy(tn) {
        for (const k of TIDY) {
          const it = IT[k];
          if (!it.an || tn < it.an.t0 + it.an.dur) continue;
          it.k = 1; it.an = null;
          const p = tidyPos(k);
          PF.emit('star', p.x, p.y, 7, { colors: ['#fff6d6', '#ffe08a'], speed: [30, 90] });
          if (A.ctx) A.chime(A.note(['E6', 'G6', 'A6', 'C7'][G.tidyChime = ((G.tidyChime || 0) + 1) % 4]), { vol: 0.035, dur: 0.8 });
        }
      }
      const phonePos = () => { const e = E.inOutCubic(prog(IT.phone, now())); return { x: IT.phone.x + (IT.phone.t.x - IT.phone.x) * e, y: IT.phone.y + (IT.phone.t.y - IT.phone.y) * e }; };

      /* ---------------- the glued stack: one big worry that is really three small things ---------------- */
      const STK = { el: null, layers: 3, x: 0, y: 0, a: 0, ox: 0, oy: 0, ot: 0, vx: 0, vy: 0, vt: 0, ang: 0, wig: 0, wigT: 0, done: false, gone: false, busy: false, spring: null, fin: null };
      let SD = null;
      function makeStack() {
        const c = C.core, hdr = c.own ? 'one big worry' : 'example';
        STK.l3 = h('div', { class: 'cd-sl l3' }); STK.l2 = h('div', { class: 'cd-sl l2' });
        STK.underNk = h('span', { class: 'cd-nk', text: hdr }); STK.underT = ntSpan(c, true);
        STK.under = h('div', { class: 'cd-sl cd-under' }, STK.underNk, STK.underT);
        STK.frontNk = h('span', { class: 'cd-nk', text: hdr }); STK.frontT = ntSpan(c, true);
        STK.backT = h('span', { class: 'cd-nt' });
        STK.sheet = h('div', { class: 'cd-sheet' }, h('div', { class: 'cd-face' }, STK.frontNk, STK.frontT), h('div', { class: 'cd-face cd-back' }, h('span', { class: 'cd-nk', text: 'part of it' }), STK.backT));
        STK.el = h('div', { class: 'cd-stack', role: 'button', tabindex: '0', 'aria-label': 'A thick stack of notes stuck together: ' + c.text + '. Save it for last, then peel it apart.' },
          STK.l3, STK.l2, STK.under, STK.sheet, h('i', { class: 'cd-glue' }), h('i', { class: 'cd-glue g2' }));
        layer.append(STK.el);
        STK.el.style.zIndex = '15';
        K.press(STK.el, { space: el, down: (p) => stackDown(p), move: (p) => stackMove(p), up: () => stackUp() });
        S.listen(STK.el, 'keydown', (e) => { if (e.code !== 'Enter' && e.code !== 'Space') return; e.preventDefault(); A.unlock(); if (G.phase === 'stuck') stuckReveal(); else if (G.phase === 'peel' && G.peelReady) autoPeel(); });
        stackLayers();
      }
      function stackXY() {
        if (!STK.el) return;
        const wa = STK.wig > 0 ? Math.sin((now() - STK.wigT) * 0.05) * 0.06 * STK.wig : 0;
        STK.el.style.transform = 'translate3d(' + (STK.x - SS / 2 + STK.ox).toFixed(1) + 'px,' + (STK.y - SS / 2 + STK.oy).toFixed(1) + 'px,0) rotate(' + (STK.a + STK.ot + wa).toFixed(4) + 'rad)';
      }
      function stackLayers() {
        STK.l3.style.display = STK.layers >= 3 ? '' : 'none';
        STK.l2.style.display = STK.layers >= 2 ? '' : 'none';
        STK.under.style.display = STK.layers >= 2 ? '' : 'none';
        STK.el.classList.toggle('cd-thin', STK.layers <= 1);
        const d = C.pieces[3 - STK.layers];
        if (d) { STK.backT.textContent = d.text; STK.backT.className = 'cd-nt' + (d.own ? ' gk-user' : '') + (longish(d.text) ? ' cd-long' : ''); }
      }
      function setPeel(ang) {
        STK.ang = ang;
        STK.sheet.style.transform = ang > 0.05 ? 'rotateX(' + ang.toFixed(1) + 'deg)' : '';
        STK.el.style.setProperty('--cd-lift', (Math.sin(Math.min(ang, 179) / 180 * Math.PI) * 0.9).toFixed(3));
      }
      function sHeavy() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 82, to: 40, glide: 0.18, dur: 0.4, vol: 0.3 }); A.noise({ filter: 'lowpass', freq: 380, dur: 0.22, vol: 0.14 }); A.wood(undefined, 0.12, 0.45); sync('heavy'); }
      function stackDown(p) {
        if (STK.done || STK.busy) return;
        if (G.phase === 'sort' || G.phase === 'intro') {
          STK.wig = 1; STK.wigT = now(); sHeavy();
          if (!G.said.early) { G.said.early = true; say(rush, line({ Jolly: 'That one’s stuck fast. Save it for last!', Cheeky: 'Nope, that one’s welded on. Leave it for the finale.', Unfiltered: 'Stuck. Do it last.' }), { mood: 'think', moodMs: 1500, ms: 2400 }); }
          return;
        }
        if (G.phase === 'stuck') { SD = { mode: 'tug', p0: p, fired: false }; return; }
        if (G.phase === 'peel' && G.peelReady) {
          SD = { mode: 'peel', p0: p, ang: 0, lt: now() };
          STK.el.classList.remove('cd-peelable'); STK.spring = null;
          if (A.ctx) A.paper({ vol: 0.05, freq: 1500, dur: 0.06 });
        }
      }
      function stackMove(p) {
        if (!SD) return;
        if (SD.mode === 'tug') {
          const dx = p.x - SD.p0.x, dy = p.y - SD.p0.y, d = Math.hypot(dx, dy) || 1, k = Math.min(13, d * 0.12);
          STK.ox = dx / d * k; STK.oy = dy / d * k; STK.ot = 0.04 * clamp(dx / 60, -1, 1); stackXY();
          if (d > 36 && !SD.fired) { SD.fired = true; stuckReveal(); }
          return;
        }
        if (SD.mode === 'peel' && !STK.fin) {
          const dy = SD.p0.y - p.y, raw = Math.max(0, dy) / (SS * 1.25);
          const ang = clamp(raw < 0.14 ? raw * 0.55 : 0.077 + (raw - 0.14) * 1.07, 0, 1) * 180;
          const tn = now(), sp = Math.abs(ang - SD.ang) / Math.max(8, tn - SD.lt) * 16; SD.lt = tn; SD.ang = ang;
          setPeel(ang); peelLevel(ang < 120 ? sp * 0.3 : 0);
          if (ang >= 168) peelOff(ang);
        }
      }
      function stackUp() {
        if (!SD) return;
        const d = SD; SD = null;
        if (d.mode === 'tug') { if (!d.fired) stuckReveal(); return; }
        if (d.mode === 'peel' && !STK.fin) {
          peelLevel(0);
          if (d.ang >= 95) peelOff(d.ang);
          else { STK.spring = { t0: now(), from: d.ang }; if (A.ctx) { A.tone({ type: 'sine', freq: 300, to: 180, glide: 0.06, dur: 0.08, vol: 0.06 }); A.paper({ vol: 0.04, dur: 0.05 }); } }
        }
      }
      function autoPeel() { if (!G.peelReady || STK.fin || STK.done) return; STK.el.classList.remove('cd-peelable'); peelOff(0, 520); }
      function peelOff(from, dur) {
        if (STK.fin) return;
        G.peelReady = false; peelLevel(0);
        STK.fin = { t0: now(), from: from || STK.ang, dur: dur || 150 };
      }
      function spawnPiece() {
        const i = 3 - STK.layers, d = C.pieces[i];
        sTchk(); if (S.buzz) S.buzz(14);
        const n = makeNote(d, i);
        const off = rot(0, -SS, STK.a);
        n.x = STK.x + off.x; n.y = STK.y + off.y; n.a = STK.a; n.s = SS / NS; n.state = 'fly';
        const slot = G.slots[i];
        n.fly = { t0: now(), dur: 560, x0: n.x, y0: n.y, a0: n.a, s0: n.s, x1: slot.x, y1: slot.y, a1: slot.a, s1: slot.s || 1, arc: 34, state: 'rest', done: () => progress() };
        n.el.style.zIndex = String(++zTop); noteXY(n);
        PF.emit('dust', n.x, n.y, 8, { colors: ['rgba(255,236,210,0.8)'], speed: [20, 70] });
        STK.layers--;
        setPeel(0); STK.fin = null;
        reactPeel(i);
        if (STK.layers <= 0) {
          STK.done = true; STK.gone = true; STK.el.remove();
          setPhase('sort2');
        } else {
          stackLayers();
          STK.busy = true;
          S.later(() => { STK.busy = false; G.peelReady = true; STK.el.classList.add('cd-peelable'); guideNext(400); }, 650);
        }
      }
      function stepStack(dt, tn) {
        if (!STK.el || STK.gone) return;
        let moved = false;
        if (!SD || SD.mode !== 'tug') {
          if (Math.abs(STK.ox) + Math.abs(STK.oy) + Math.abs(STK.ot) > 0.02 || Math.abs(STK.vx) + Math.abs(STK.vy) > 0.5) {
            const st = Math.max(1, Math.ceil(dt / 0.006)), hs = dt / st;   // small steps: a stiff spring stays stable on a slow frame
            for (let k = 0; k < st; k++) {
              STK.vx += (-260 * STK.ox - 14 * STK.vx) * hs; STK.vy += (-260 * STK.oy - 14 * STK.vy) * hs; STK.vt += (-260 * STK.ot - 14 * STK.vt) * hs;
              STK.ox += STK.vx * hs; STK.oy += STK.vy * hs; STK.ot += STK.vt * hs;
            }
            moved = true;
          } else { STK.ox = STK.oy = STK.ot = 0; STK.vx = STK.vy = STK.vt = 0; }
        }
        if (STK.wig > 0) { STK.wig = Math.max(0, STK.wig - dt * 2); moved = true; }
        if (STK.spring) { const p = clamp((tn - STK.spring.t0) / 360, 0, 1); setPeel(Math.max(0, STK.spring.from * (1 - E.outBack(p)))); if (p >= 1) { STK.spring = null; setPeel(0); if (G.phase === 'peel' && G.peelReady) STK.el.classList.add('cd-peelable'); } }
        if (STK.fin) { const f = STK.fin, p = clamp((tn - f.t0) / f.dur, 0, 1); setPeel(f.from + (180 - f.from) * E.outCubic(p)); if (p >= 1) spawnPiece(); }
        if (moved) stackXY();
      }

      /* ---------------- the frame loop: physics every frame, the desk only when something on it moves ---------------- */
      function drawDesk(tn) {
        const g = cv.g; if (!g || !BG) return;
        const dpr = cv.dpr || 1; g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.drawImage(BG, 0, 0, W, H);
        drawRings(g, tn); drawPapers(g, tn); drawCrumbs(g, tn); drawCable(g, tn); drawBooks(g, tn); drawPhone(g, tn); drawPens(g, tn); drawBin(g, tn); drawBalls(g); drawMug(g, tn);
        IT.tre.forEach(t => drawTreasure(g, t, tn)); drawPlant(g, tn); drawLamp(g, tn);
        const D = K.dark(), cool = (1 - G.grade) * (D ? 0.2 : 0.11);
        if (cool > 0.004) { g.fillStyle = 'rgba(26,38,68,' + cool.toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
        if (G.lamp > 0.01) {
          const L0 = lampMouth(), R = Math.max(W, H) * (phone ? 1.05 : 0.85), on = G.lamp;
          g.save();
          const vg = g.createRadialGradient(L0.x, L0.y, R * 0.18, L0.x, L0.y, R);
          vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(8,4,0,' + (0.42 * on).toFixed(3) + ')' : 'rgba(50,24,0,' + (0.16 * on).toFixed(3) + ')');
          g.fillStyle = vg; g.fillRect(0, 0, W, H);
          g.globalCompositeOperation = 'soft-light'; g.globalAlpha = on * (D ? 0.95 : 0.7);
          g.drawImage(K.glowSprite('rgba(255,196,110,1)'), L0.x - R * 0.85, L0.y - R * 0.85, R * 1.7, R * 1.7);
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = on * (D ? 0.22 : 0.14);
          g.drawImage(K.glowSprite('rgba(255,206,140,0.9)'), L0.x - R * 0.42, L0.y - R * 0.42, R * 0.84, R * 0.84);
          g.globalAlpha = on * (D ? 0.7 : 0.45); g.drawImage(K.glowSprite('rgba(255,240,200,0.95)'), L0.x - IT.lamp.r * 1.5, L0.y - IT.lamp.r * 1.5, IT.lamp.r * 3, IT.lamp.r * 3);
          if (G.pinned) { const n = G.pinned, r2 = NS * 1.7; g.globalAlpha = on * (D ? 0.3 : 0.18); g.drawImage(K.glowSprite('rgba(255,214,150,0.9)'), n.x - r2, n.y - r2, r2 * 2, r2 * 2); }
          g.restore();
        }
      }
      K.loop(() => {
        const tn = now(), dt = clamp((tn - (G.last || tn)) / 1000, 0, 0.1); G.last = tn;
        if (!BG) return;
        let maxSp = 0;
        for (const n of notes) {
          let ch = false;
          if (n.lift !== n.lt) { n.lift += (n.lt - n.lift) * Math.min(1, dt * 18); if (Math.abs(n.lift - n.lt) < 0.01) n.lift = n.lt; ch = true; }
          if (n.state === 'slide') { const st = Math.max(1, Math.ceil(dt / 0.008)); for (let k = 0; k < st && n.state === 'slide'; k++) slideStep(n, dt / st); maxSp = Math.max(maxSp, Math.hypot(n.vx, n.vy)); ch = true; }
          else if (n.state === 'cap') { capStep(n, tn); ch = true; }
          else if (n.state === 'fly' && n.fly) { flyStep(n, tn); ch = true; }
          if (n.wig > 0) { n.wig = Math.max(0, n.wig - dt * 2.4); n.wa = Math.sin((tn - n.wigT) * 0.045) * 0.07 * n.wig; ch = true; } else if (n.wa) { n.wa = 0; ch = true; }
          if (n.sqT) { if (tn - n.sqT > 260) n.sqT = 0; ch = true; }
          if (ch && n.el.parentNode) noteXY(n);
        }
        G.dragSp = (G.dragSp || 0) * Math.pow(0.02, dt);
        slideLevel(Math.max(maxSp, G.dragSp));
        stepStack(dt, tn);
        stepBalls(dt, tn);
        checkTidy(tn);
        const tg = MZ.tidy;
        if (Math.abs(G.grade - tg) > 0.002) { G.grade += (tg - G.grade) * Math.min(1, dt * 1.6); G.animUntil = Math.max(G.animUntil || 0, tn + 30); }
        if (G.lampT) { const q = (tn - G.lampT) / 900; const fl = q < 0.35 ? (Math.sin(q * 60) > 0 ? 0.6 : 0.15) : 1; G.lamp = clamp(q, 0, 1) * fl; if (q >= 1) { G.lamp = 1; G.lampT = 0; } G.animUntil = Math.max(G.animUntil || 0, tn + 40); }
        if (G.pinAnim) pinStep2(tn);
        // anything still falling keeps the desk redrawing (extended before the redraw check, so a long frame can't strand it)
        for (const t of IT.tre) if (t.drop) G.animUntil = Math.max(G.animUntil || 0, tn + 60);
        if (G.started && !G.finished && IT.phone.k < 1 && !IT.phone.an && (G.phase === 'sort' || G.phase === 'sort2') && tn > G.buzzAt) {
          if (G.buzzAt) { poke(IT.phone, 0.08); sBuzz(); }
          G.buzzAt = tn + 6500 + Math.random() * 3500;
        }
        if (IT.mug.k >= 1 && tn > (G.steamAt || 0)) { G.steamAt = tn + 300; PF.emit('smoke', IT.mug.x + (Math.random() - 0.5) * IT.mug.R * 0.6, IT.mug.y - IT.mug.R * 0.25, 1, { colors: [K.dark() ? 'rgba(255,240,220,0.16)' : 'rgba(255,255,255,0.22)'], angle: -Math.PI / 2, spread: 0.6, speed: [12, 26], size: [2.5, 5.5], life: [1, 1.8] }); }
        if (G.lamp > 0.9 && Math.random() < dt * 3) PF.emit('mote', IT.pad.x + (Math.random() - 0.5) * IT.pad.w * 0.8, IT.pad.y + (Math.random() - 0.5) * IT.pad.h * 0.6, 1, { colors: ['rgba(255,226,170,0.8)'], speed: [4, 14] });
        if (G.dirty || tn < (G.animUntil || 0)) { drawDesk(tn); G.dirty = false; }
        const inkLive = !!G.ink && tn < G.ink.t0 + G.ink.dur + 60;
        if (PF.list.length || G.fxLive || inkLive) { if (fxc.g) { fxc.clear(); drawInk(fxc.g, tn); PF.update(dt); PF.draw(fxc.g); } G.fxLive = PF.list.length > 0 || inkLive; }
      });

      /* ---------------- the pile ---------------- */
      function pileCells(count) {
        const p = IT.pad, cols = phone ? 2 : 3, rows = Math.ceil(count / cols), out = [];
        const sx = NS * (phone ? 1.06 : 1.12), span = Math.min(Math.max(0, p.h - NS * 1.15), NS * 1.2 * (rows - 1));
        const y0 = clamp(p.y - span / 2, deskTop + NS * 0.62, Math.max(deskTop + NS * 0.62, WALL.b - NS * 0.6 - span));
        for (let i = 0; i < count; i++) {
          const r = Math.floor(i / cols), inRow = Math.min(cols, count - r * cols), c = i % cols;
          out.push({ x: p.x + (c - (inRow - 1) / 2) * sx, y: y0 + (rows > 1 ? span * r / (rows - 1) : 0) });
        }
        return out;
      }
      function placeNotes() {
        const cells = pileCells(notes.length + 1);
        notes.forEach((n, i) => { const c = cells[i]; n.x = c.x + JIT[i * 3] * NS * 0.3; n.y = c.y + JIT[i * 3 + 1] * NS * 0.24; n.a = JIT[i * 3 + 2] * 0.62; n.el.style.zIndex = String(5 + i); noteXY(n); });
        const c = cells[cells.length - 1];
        STK.x = c.x + JIT[70] * NS * 0.15; STK.y = c.y + JIT[71] * NS * 0.1; STK.a = JIT[72] * 0.3; stackXY();
        G.cells = cells;
      }
      /* The three small things land in a neat row on the pile's top row (empty by then), clear of the stack below. */
      function pieceSlots() {
        const p = IT.pad, row = G.cells && G.cells[0] ? G.cells[0].y : deskTop + NS * 0.75, s = phone ? 0.92 : 1;
        const gap = phone ? Math.min((W - 8) / 3, NS * 1.14) : NS * 1.2;
        return [0, 1, 2].map(i => ({ x: p.x + (i - 1) * gap + JIT[74 + i] * 6, y: row + (i === 1 ? -8 : 4) + JIT[77 + i] * 8, a: JIT[60 + i] * 0.2, s }));
      }
      function rescaleNotes(oW, oH) {
        const fx = W / (oW || W), fy = H / (oH || H);
        notes.forEach(n => { if (n.el.parentNode !== layer) return; n.x = clamp(n.x * fx, WALL.l + NS * 0.42, WALL.r - NS * 0.42); n.y = clamp(n.y * fy, deskTop + NS * 0.42, WALL.b - NS * 0.42); noteXY(n); });
        if (STK.el && !STK.gone) { STK.x = clamp(STK.x * fx, SS * 0.5, W - SS * 0.5); STK.y = clamp(STK.y * fy, deskTop + SS * 0.5, WALL.b - SS * 0.5); stackXY(); }
        if (G.cells) G.cells = pileCells(G.cells.length);
      }

      /* ---------------- characters react to what the player just did ---------------- */
      function reactSort(n) {
        const ti = n.tray, first = G.firstTray[ti]; G.firstTray[ti] = false;
        const mood = ['cool', 'surprised', 'wow'][ti];
        if (first) {
          const L = [
            { Jolly: 'NOW pile. Small, doable, today.', Cheeky: 'Into NOW. Look at you, deciding things.', Unfiltered: 'NOW. Got it.' },
            { Jolly: 'Later?! …Oh. That’s allowed?', Cheeky: 'LATER. The most underrated tray.', Unfiltered: 'Later. It keeps.' },
            n.d.loop === 'mindread' ? { Jolly: 'What other people think is theirs to carry. Lighter already!', Cheeky: 'Other people’s thoughts: their department.', Unfiltered: 'Their thoughts. Their job.' }
              : { Jolly: 'We can just… not carry it? WOW.', Cheeky: 'Not mine. Two of the best words going.', Unfiltered: 'Not yours. Dropped.' }][ti];
          say(rush, line(L), { mood, moodMs: 1600, ms: 2500 });
          if (ti === 1) S.later(() => { if (!G.finished && G.phase !== 'finale') say(patch, line({ Jolly: 'It’s written down now, so your head doesn’t have to hold it.', Cheeky: 'Paper remembers, so your brain can stop doing it.', Unfiltered: 'It’s on paper. Your head can let go.' }), { mood: 'happy', moodMs: 1600, ms: 3000 }); }, 2700);
        } else {
          rush.face(mood, 1100); patch.face(['idea', 'happy', 'wink'][ti], 1100);
          if (G.sorted === 4 && !G.said.half) { G.said.half = true; say(patch, line({ Jolly: 'See? The desk can breathe again.', Cheeky: 'Look, actual desk. I forgot it was wood.', Unfiltered: 'Desk’s showing.' }), { mood: 'happy', moodMs: 1600, ms: 2400 }); }
        }
        const calm = G.sorted / G.total;
        S.later(() => { if (G.phase !== 'finale' && !G.finished) rush.base(calm < 0.25 ? (care ? 'think' : 'panic') : calm < 0.6 ? 'cool' : 'happy'); }, 1800);
      }
      function reactPeel(i) {
        pop(['One…', 'Two…', 'Three!'][i], STK.x, STK.y - SS * 0.95, i === 2);
        if (i === 0) say(rush, line({ Jolly: 'Ooh, there’s something written on the back!', Cheeky: 'A tiny thing was hiding in there.', Unfiltered: 'One piece.' }), { mood: 'wow', moodMs: 1500, ms: 2400 });
        else if (i === 1) rush.face('surprised', 1200);
        else S.later(() => say(patch, line(care ? { Jolly: 'Three smaller parts. Each one can go where it fits.', Cheeky: 'Three smaller parts. Each gets a tray.', Unfiltered: 'Three parts. Sort them.' }
          : { Jolly: 'See? Three small things. Each one fits a tray.', Cheeky: 'One big scary worry. Three small, boring ones. Love boring.', Unfiltered: 'Three small things. Sort them.' }), { mood: 'happy', moodMs: 1800, ms: 3400 }), 450);
      }

      /* ---------------- flow ---------------- */
      const beat = (ms) => K.wait(K.reduced() ? Math.round(ms * 0.8) : ms);
      function guideNext(delay) {
        if (G.finished) return;
        if (G.phase === 'stuck' && STK.el) { K.guide({ id: 'stuck', g: 'drag', target: STK.el, oy: 0.84, place: 'below', dir: 'u', d: 90, label: 'FLICK THE BIG ONE', ms: 1400, delay: delay ?? 700 }); return; }
        if (G.phase === 'peel' && G.peelReady && !STK.done) { K.guide({ id: 'peel', g: 'drag', target: STK.el, oy: 0.84, place: 'below', dir: 'u', d: Math.round(SS * 0.9), label: 'PEEL IT UP SLOWLY', ms: 2200, delay: delay ?? 600 }); return; }
        if (G.phase !== 'sort' && G.phase !== 'sort2' && G.phase !== 'peel') return;
        const rest = notes.filter(n => n.state === 'rest' && n.el.parentNode === layer);
        if (!rest.length) return;
        const n = rest.sort((a, b) => b.y - a.y)[0];
        K.guide(flickGuide(n, 'flick-', delay ?? 700));
      }
      function progress() {
        if (G.finished) return;
        if (G.phase === 'sort' && !notes.some(n => !n.d.piece && n.state !== 'in')) { twist(); return; }
        if (G.phase === 'sort2' && STK.done && notes.every(n => n.state === 'in')) { pinPhase(); return; }
        guideNext(900);
      }
      async function twist() {
        setPhase('stuckwait'); K.guide(null);
        G.slots = pieceSlots();
        await beat(450);
        say(patch, line({ Jolly: 'Look at that. Just the big one left.', Cheeky: 'Nearly there. Only the chunky one left.', Unfiltered: 'One left. The big one.' }), { mood: 'happy', ms: 2600 });
        await beat(800);
        setPhase('stuck');
        guideNext(300);
      }
      async function stuckReveal() {
        if (G.phase !== 'stuck' || G.revealing) return;
        G.revealing = true; K.guide(null);
        STK.wig = 1; STK.wigT = now(); sHeavy(); if (S.buzz) S.buzz(30);
        say(rush, line(care ? { Jolly: 'It won’t move. That one’s heavy.', Cheeky: 'Heavy. Really heavy.', Unfiltered: 'It won’t move.' }
          : { Jolly: 'It won’t budge! It weighs a TONNE!', Cheeky: 'Heavy. Suspiciously heavy. What’s in it?', Unfiltered: 'Stuck. Won’t move.' }), { mood: care ? 'worried' : 'panic', moodMs: 1800, ms: 2400 });
        if (!care) rush.react('shake');
        await beat(2300);
        say(patch, line(care ? { Jolly: 'Because it isn’t one thing. It’s a few, stuck together. Let’s peel them apart, gently.', Cheeky: 'It’s a few things stuck together. Peel them apart, gently.', Unfiltered: 'A few things, glued. Peel them apart.' }
          : { Jolly: 'Because it isn’t one worry. It’s a few, glued together. Peel them apart!', Cheeky: 'That’s not one thing. That’s three things in a trench coat. Peel it.', Unfiltered: 'Three things glued together. Peel them.' }), { mood: 'idea', moodMs: 2200, ms: 3800 });
        await beat(1500);
        setPhase('peel'); G.peelReady = true; stackLayers(); STK.el.classList.add('cd-peelable');
        STK.el.setAttribute('aria-label', 'The stuck stack: ' + C.core.text + '. Drag the bottom edge up to peel a sheet off.');
        guideNext(300);
      }
      async function pinPhase() {
        setPhase('pinwait'); K.guide(null); MZ.tidy = 1; MZ.layer = 2;
        await beat(600);
        const src = TR[0].notes.length ? 0 : TR[1].notes.length ? 1 : 2, T = TR[src];
        G.pinSrc = src;
        const cands = T.notes.slice(-(phone ? 3 : 4));
        say(rush, line(src === 0 ? { Jolly: 'Last bit: pick ONE thing from NOW to pin up. Just one.', Cheeky: 'Pick one NOW note. One. The rest can wait their turn.', Unfiltered: 'Pick one NOW note. Pin it.' }
          : { Jolly: 'Nothing in NOW? That’s fine. Pick the one you’d do next, whenever next is.', Cheeky: 'No NOW pile. Respect. Pick the one you’d do next.', Unfiltered: 'Pick the one you’d do next.' }), { mood: 'idea', moodMs: 2400, ms: 3600 });
        const p = IT.pad, k = cands.length;
        cands.forEach((q, i) => {
          const rx = T.px + q.x, ry = T.py + q.y;
          layer.append(q.el); q.x = rx; q.y = ry; q.state = 'fly'; q.cand = true; q.el.setAttribute('tabindex', '0');
          q.el.setAttribute('aria-label', 'Pin this one up: ' + q.d.text);
          q.fly = { t0: now() + i * 90, dur: 520, x0: rx, y0: ry, a0: q.a, s0: q.s, x1: p.x + (i - (k - 1) / 2) * NS * (phone ? 1.02 : 1.1), y1: p.y + Math.abs(i - (k - 1) / 2) * 12 * U, a1: (i - (k - 1) / 2) * 0.1, s1: 1, arc: 46, state: 'rest' };
          q.el.style.zIndex = String(++zTop); noteXY(q);
        });
        if (A.ctx) A.whoosh({ vol: 0.07, dur: 0.4 });
        await beat(650 + k * 90);
        setPhase('pin');
        K.guide(k > 1 ? { id: 'pin', g: 'choose', target: cands.map(q => q.el), oy: 0.02, label: 'PIN ONE UP', delay: 500 } : { id: 'pin', g: 'tap', target: cands[0].el, oy: 0.02, label: 'PIN IT UP', delay: 500 });
      }
      function pinNote(n) {
        if (G.phase !== 'pin' || !n.cand) return;
        setPhase('pinned'); K.guide(null); G.pinned = n;
        const T = TR[G.pinSrc], p = IT.pad;
        notes.filter(q => q.cand && q !== n).forEach((q, i) => {
          q.cand = false; q.state = 'fly'; q.el.setAttribute('tabindex', '-1');
          q.fly = { t0: now() + 120 + i * 80, dur: 460, x0: q.x, y0: q.y, a0: q.a, s0: q.s, x1: T.px + (T.w - 10) / 2 + q.ox, y1: T.py + T.fh / 2 + 3 + q.oy, a1: q.ia, s1: TSC, arc: 24, state: 'fly2', done: backIn };
        });
        n.cand = false; n.state = 'fly'; n.el.classList.add('cd-hero', 'cd-pinned'); n.el.setAttribute('tabindex', '-1');
        T.notes = T.notes.filter(q => q !== n); T.count.textContent = String(T.notes.length); if (!T.notes.length) T.count.classList.remove('on');
        n.fly = { t0: now(), dur: 640, x0: n.x, y0: n.y, a0: n.a, s0: n.s, x1: p.x, y1: p.y - NS * 0.05, a1: -0.035, s1: phone ? 1.3 : 1.6, arc: 36, state: 'pinned', done: () => finale() };
        n.el.style.zIndex = String(++zTop);
        sLift(); if (A.ctx) A.whoosh({ vol: 0.06, dur: 0.35 });
        patch.face('love', 1400); rush.face('wow', 1400);
      }
      function backIn(q) {
        const T = TR[q.tray];
        q.state = 'in'; q.x = (T.w - 10) / 2 + q.ox; q.y = T.fh / 2 + 3 + q.oy; q.a = q.ia; q.s = TSC;
        T.floor.append(q.el); noteXY(q);
        if (A.ctx) A.paper({ vol: 0.05, freq: 2600, dur: 0.06 });
      }
      function pinStep2(tn) {
        const n = G.pinned, p = clamp((tn - G.pinAnim) / 360, 0, 1), e = E.inCubic(p);
        // a note with a printed tag (EXAMPLE, PART OF IT) is pinned at its corner, so the tag stays readable
        const tagged = !!n.el.querySelector('.cd-nk');
        const top = rot(tagged ? -NS * 0.43 : 0, -NS * (tagged ? 0.43 : 0.37), n.a), px = n.x + top.x * n.s, py = n.y + top.y * n.s;
        pinEl.style.opacity = String(Math.min(1, p * 4));
        pinEl.style.transform = 'translate3d(' + (px - 30 * (1 - e)).toFixed(1) + 'px,' + (py - 80 * (1 - e)).toFixed(1) + 'px,0) scale(' + (2.3 - 1.3 * e).toFixed(3) + ')';
        if (p >= 1) {
          G.pinAnim = 0; n.sqT = now();
          if (A.ctx) { A.thud({ vol: 0.32 }); A.click({ vol: 0.12 }); A.tone({ type: 'sine', freq: 940, to: 620, glide: 0.05, dur: 0.09, vol: 0.06 }); }
          sync('pin'); if (S.buzz) S.buzz([20, 30, 20]);
          PF.emit('dust', px, py + 6, 10, { colors: ['rgba(255,245,225,0.8)'], speed: [20, 70] });
          PF.emit('star', px, py, 12, { colors: ['#fff3c4', '#ffd36b', '#ff8a6a'], speed: [60, 180] });
          S.later(() => circleIt(n), 380);
        }
      }
      /* A loose red marker loop round the one thing: drawn once, it stays on the fx layer. */
      function inkPlace(n) {
        const t = n.el.querySelector('.cd-nt'); if (!t) return null;
        const r = K.rectIn(t, el), mx = NS * n.s * 0.6;
        return { x: r.cx, y: r.cy + 2, rx: Math.min(mx, r.w / 2 + 16 * U), ry: Math.min(mx * 0.7, r.h / 2 + 13 * U), lw: (phone ? 3.4 : 4.2) };
      }
      function circleIt(n) {
        if (G.ink || !n.el.isConnected || G.finished) return;
        const geo = inkPlace(n); if (!geo) return;
        G.ink = Object.assign({ t0: now(), dur: K.reduced() ? 200 : 680, rot: -0.07, a0: -2.5, ph: JIT[3] * 6 }, geo);
        if (A.ctx) { const t0 = A.now(); A.noise({ filter: 'bandpass', freq: 2300, to: 3900, q: 7, dur: 0.34, attack: 0.04, vol: 0.06 }); A.noise({ when: t0 + 0.36, filter: 'bandpass', freq: 3600, to: 2500, q: 7, dur: 0.3, attack: 0.04, vol: 0.05 }); A.tone({ when: t0 + 0.02, type: 'triangle', freq: 1800, to: 2500, glide: 0.3, dur: 0.32, vol: 0.01 }); }
        sync('ink');
      }
      function drawInk(g, tn) {
        const k = G.ink; if (!k) return;
        const p = clamp((tn - k.t0) / k.dur, 0, 1); if (p <= 0) return;
        const turns = 1.14, steps = 72, n = Math.max(2, Math.round(steps * turns * E.inOutSine(p)));
        g.save(); g.translate(k.x, k.y); g.rotate(k.rot);
        g.lineCap = 'round'; g.lineJoin = 'round';
        const path = (dx, dy) => { g.beginPath(); for (let i = 0; i <= n; i++) { const tt = i / steps, ang = k.a0 + tt * TAU, w = 1 + 0.04 * Math.sin(tt * 11 + k.ph) + tt * 0.07; const x = Math.cos(ang) * k.rx * w + dx, y = Math.sin(ang) * k.ry * w + tt * 5 + dy; if (i) g.lineTo(x, y); else g.moveTo(x, y); } };
        g.strokeStyle = 'rgba(120,20,10,0.18)'; g.lineWidth = k.lw + 1.5; path(0.8, 1.2); g.stroke();
        g.strokeStyle = 'rgba(214,46,38,0.9)'; g.lineWidth = k.lw; path(0, 0); g.stroke();
        g.strokeStyle = 'rgba(255,150,130,0.35)'; g.lineWidth = Math.max(1, k.lw * 0.3); path(-0.6, -0.7); g.stroke();
        g.restore();
      }
      async function finale() {
        if (G.phase === 'finale' || G.finished) return;
        setPhase('finale'); K.guide(null);
        G.pinAnim = now();
        await beat(480);
        say(patch, line(care ? { Jolly: 'That’s the one. Everything else has a place to wait.', Cheeky: 'One note up. The rest are filed.', Unfiltered: 'One thing. The rest are filed.' }
          : { Jolly: 'That’s the one. Everything else has a home.', Cheeky: 'One note. Everything else filed. Look at you.', Unfiltered: 'One thing. The rest are filed.' }), { mood: 'cosy', ms: 3000 });
        rush.base('calm');
        await beat(900);
        for (let i = 0; i < 3; i++) { TR[i].el.classList.add('cd-shut'); sClunk(i); PF.emit('dust', TR[i].cx, capY - 20, 8, { colors: ['rgba(255,240,215,0.7)'], angle: Math.PI / 2, spread: 2, speed: [20, 70] }); await beat(380); }
        let tick = 0;
        while (G.tidyIx < ORDER.length) { tidy(ORDER[G.tidyIx++], true); sTick(tick++); await beat(240); }
        await beat(450);
        const row = [IT.plant, IT.phone, IT.bin, IT.mug, IT.crumbs, IT.lamp].concat(IT.tre).sort((a, b) => (a.x || 0) - (b.x || 0));
        for (const it of row) { poke(it, 0.07); sTick(tick++); await beat(95); }
        await beat(380);
        sClick(); G.lampT = now(); MZ.vol = 0.9;
        await beat(520);
        rush.base('happy'); patch.base('cosy');
        K.finale('confetti', { from: [{ x: G.pinned.x, y: G.pinned.y - NS * 0.4 }], colors: PAPERS.map(c => c[0]).concat([HOT[0]]), chord: ['F3', 'A3', 'C4', 'E4', 'G4'], ms: 3000 });
        say(rush, line(care ? { Jolly: 'Clear desk. That’s a bit lighter to look at.', Cheeky: 'Clear desk. Quiet desk.', Unfiltered: 'Clear desk.' }
          : { Jolly: 'Look at it! A clear desk and ONE thing. I can breathe!', Cheeky: 'Clean desk. Smug lamp. One note. Perfect.', Unfiltered: 'Clear desk. One note. Done.' }), { mood: 'happy', ms: 3000 });
        await beat(1700);
        // this visit's desk treasure drops onto the desk; it will be there next time (never random, one per finished visit)
        const nt = TREASURES.find(x => !K.collection().includes(x.name));
        if (nt) {
          G.newTre = { id: nt.id, t0: now() }; placeTreasures(); G.dirty = true;
          if (A.ctx) A.whoosh({ vol: 0.05, dur: 0.5, from: 2600, to: 700 });
          await beat(900);
          say(patch, line({ Jolly: 'Oh! A ' + nt.name + ' just moved onto your desk. It’s staying.', Cheeky: 'A ' + nt.name + ' moved in. Rent-free.', Unfiltered: 'New on the desk: ' + nt.name + '.' }), { mood: 'love', moodMs: 1800, ms: 2600 });
          rush.face('wow', 1400);
          await beat(2700);
        } else await beat(1300);
        say(patch, line(care ? { Jolly: 'One note. Someone qualified can help with the rest.', Cheeky: 'One note. A qualified person can help with the rest.', Unfiltered: 'One note. Get proper help with the rest.' }
          : { Jolly: 'One note left. That’s plenty for now.', Cheeky: 'One note left. Your brain can clock off.', Unfiltered: 'One note. Enough for now.' }), { mood: 'cosy', ms: 0 });
        await beat(1500);
        finish();
      }
      function finish() {
        if (G.finished) return;
        G.finished = true;
        const n = G.scores.length || 1, q = G.scores.reduce((a, b) => a + b, 0) / n, pct = Math.round(G.clean / n * 100);
        const badges = [];
        const pb = K.best('clean', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% clean flicks'); else if (pb.first) badges.push('First desk: ' + pct + '% clean flicks');
        const tier = K.tier(q, [0.6, 0.78, 0.92]);
        if (tier) badges.push(tier + ': ' + (tier === 'Gold' ? 'clean sweep' : tier === 'Silver' ? 'tidy hands' : 'desk tamer'));
        const col = K.collection(), next = TREASURES.find(t => !col.includes(t.name));
        if (next) { const c = K.collect(next.name); badges.push('Desk treasure: ' + next.name + ' (' + Math.min(c.count, TREASURES.length) + ' of ' + TREASURES.length + ')'); }
        else badges.push('All ' + TREASURES.length + ' desk treasures out');
        const pd = G.pinned ? G.pinned.d : null;
        ctx.track('done', { clean: pct, n, now: G.counts[0], later: G.counts[1], notmine: G.counts[2], desk: DESK.id });
        ctx.finish({
          title: 'Desk cleared', mood: 'happy',
          lines: [pd ? (!pd.own && !pd.piece ? 'Pinned up (an example): ' : 'Pinned up: ') + pd.text : 'Desk cleared',
            G.counts[0] + ' now · ' + G.counts[1] + ' later · ' + G.counts[2] + ' not mine',
            care ? 'One big worry split into 3 smaller parts' : 'One big worry peeled into 3 small things'],
          share: 'Cleared a desk of ' + G.sorted + ' worries. One note left.', badges
        });
      }

      /* ---------------- touch the desk: everything answers ---------------- */
      S.listen(el, 'pointerdown', (e) => {
        const tg = e.target;
        if (!tg || !tg.closest || tg.closest('.cd-note, .cd-stack, .gk-intro') || !BG || G.phase === 'intro') return;
        const p = K.local(e, el); if (p.y < deskTop - 6) return;
        const tn = now(), near = (o, r) => Math.hypot(p.x - o.x, p.y - o.y) < r;
        if (near(IT.mug, IT.mug.R * 1.35)) { IT.mug.rip = tn; poke(IT.mug, 0.06); sClink(); return; }
        if (near(IT.lamp, IT.lamp.r)) { poke(IT.lamp, 0.08); sClick(); return; }
        if (near(IT.plant, IT.plant.r)) { poke(IT.plant, 0.25); if (A.ctx) for (let i = 0; i < 3; i++) A.paper({ when: A.now() + i * 0.05, vol: 0.04, freq: 3200 + i * 300, dur: 0.05 }); return; }
        if (near(phonePos(), 46 * U)) { poke(IT.phone, 0.1); if (IT.phone.k < 1) sBuzz(); else sKnock(); return; }
        if (near(IT.bin, IT.bin.r)) { poke(IT.bin, 0.1); sTink(); return; }
        for (const b of IT.balls.list) if (!b.inBin && !b.fly && near(b, b.r * 1.9)) { b.hopT = tn; b.vx += (b.x - p.x) * 6; b.vy += (b.y - p.y) * 6; sCrinkle(); G.animUntil = Math.max(G.animUntil || 0, tn + 500); return; }
        for (const t of IT.tre) if (near(t, 26 * t.s)) { poke(t, 0.18); if (A.ctx) A.chime(A.note(['C6', 'E6', 'G6', 'A6', 'D6', 'B5'][IT.tre.indexOf(t) % 6]), { vol: 0.06, dur: 0.8 }); return; }
        sKnock(); PF.emit('dust', p.x, p.y, 5, { colors: ['rgba(255,240,215,0.6)'], speed: [10, 40] });
        for (const b of IT.balls.list) if (!b.inBin && !b.fly && Math.hypot(b.x - p.x, b.y - p.y) < 120) { b.hopT = tn; G.animUntil = Math.max(G.animUntil || 0, tn + 500); }
      });
      K.onKey(['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'], (e) => {
        const ae = document.activeElement;
        if (ae && ae.classList && (ae.classList.contains('cd-note') || ae.classList.contains('cd-stack'))) return;
        const n = notes.filter(q => q.state === 'rest' && q.el.parentNode === layer).sort((a, b) => b.y - a.y)[0];
        if (!n || !canSort(n)) return;
        e.preventDefault(); A.unlock(); flingTo(n, Number(e.code.slice(-1)) - 1);
      });
      K.onKey(['Enter', 'Space'], (e) => {
        const ae = document.activeElement;
        if (ae && ae !== document.body && el.contains(ae)) return;
        if (G.phase === 'stuck') { e.preventDefault(); stuckReveal(); }
        else if (G.phase === 'peel' && G.peelReady) { e.preventDefault(); autoPeel(); }
        else if (G.phase === 'pin') { const c = notes.find(q => q.cand); if (c) { e.preventDefault(); pinNote(c); } }
      });

      /* ---------------- start ---------------- */
      C.notes.forEach((d, i) => makeNote(d, i));
      makeStack();
      cv.onResize((c) => { if (c.w !== W || c.h !== H || !BG) layout(c); });
      fxc.onResize(() => { G.fxLive = true; });   // a resized canvas comes back blank: redraw the ink and sparks once
      S.on('theme', () => { paintBG(); paintSprites(); G.dirty = true; });
      if (ctx.analysisReady && an.source !== 'ai') ctx.analysisReady.then((a2) => {
        if (!a2 || a2.source !== 'ai' || G.started) return;
        const C2 = content(a2);
        if (C2.notes.length !== notes.length) return;
        C = C2;
        notes.forEach((n, i) => { n.d = C.notes[i]; fillNote(n, i); });
        const hdr = C.core.own ? 'one big worry' : 'example';
        [[STK.underNk, STK.underT], [STK.frontNk, STK.frontT]].forEach(([nk, nt]) => { nk.textContent = hdr; nt.textContent = C.core.text; nt.className = 'cd-nt cd-big' + (C.core.own ? ' gk-user' : '') + (longish(C.core.text) ? ' cd-long' : ''); });
        stackLayers();
      }).catch(() => {});
      (async () => {
        await K.intro({ title: 'Clear the Desk', sub: 'Your head is a messy desk, and every thought is a sticky note.', how: 'Flick each note into NOW, LATER or NOT MINE. Then pin one up.', char: 'patch', mood: 'think' });
        G.started = true; setPhase('sort');
        say(rush, line(care ? { Jolly: 'So much on this desk. Where do we even start?', Cheeky: 'That’s a lot of notes. Where do we start?', Unfiltered: 'Lots here. Where to start?' }
          : visits >= 1 ? { Jolly: 'It’s piled up again! Everything’s NOW! …Right? Is it?', Cheeky: 'The desk is a crime scene again. Same suspects, new mess.', Unfiltered: 'Messy again. Let’s go.' }
            : { Jolly: 'Everything’s urgent! Everything’s NOW! Where do I even start?!', Cheeky: 'This desk is a crime scene. Every note’s yelling ‘me first’.', Unfiltered: 'Too much stuff. All of it shouting.' }), { mood: care ? 'worried' : 'panic', ms: 3200 });
        guideNext(1700);
        await beat(2900);
        if (G.sorted < 2) say(patch, line({ Jolly: 'Deep breath, Rush. Each note gets a tray: NOW, LATER or NOT MINE.', Cheeky: 'Easy. Every note gets a tray. Nobody gets to yell.', Unfiltered: 'Three trays. NOW, LATER, NOT MINE. One note at a time.' }), { mood: 'idea', moodMs: 2000, ms: 3800 });
        if (IT.tre.length && C.anyOwn) {
          await beat(4200);
          const t = IT.tre[IT.tre.length - 1], nm = (TREASURES.find(x => x.id === t.id) || TREASURES[0]).name;
          if (G.sorted < 3 && G.phase === 'sort') { poke(t, 0.2); say(patch, line({ Jolly: 'Your ' + nm + ' is keeping an eye on things today.', Cheeky: 'The ' + nm + ' is supervising. Strictly.', Unfiltered: nm + ' is watching.' }), { mood: 'happy', moodMs: 1600, ms: 2800 }); }
        }
        if (!C.anyOwn) {
          await beat(4000);
          if (G.sorted < 3 && G.phase === 'sort') say(patch, line({ Jolly: 'No words today, so these are example notes: thoughts like the ones that pile up.', Cheeky: 'These are example notes. Pretend they’re yours. Or don’t, I’m not your boss.', Unfiltered: 'Example notes. Sort them anyway.' }), { mood: 'wink', moodMs: 2000, ms: 3600 });
        }
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 20000)) await K.wait(80); };
          await until(() => !!el.querySelector('.gk-intro') || G.phase !== 'intro', 4000);
          const intro = el.querySelector('.gk-intro');
          if (intro) await K.sim.tap(intro);
          await until(() => G.phase === 'sort', 20000);
          await K.wait(700);
          const plan = [1, 0, 2, 1, 0, 2, 0, 1];
          let k = 0;
          const flickOne = async (n, ti) => {
            const T = TR[ti], sc = K.scaleOf(n.el) || 1, r = K.rectIn(n.el, el);
            await K.sim.drag(n.el, { x: r.w / 2 / sc, y: r.h / 2 / sc }, { x: (T.cx - r.x) / sc, y: (T.cy - r.y) / sc }, 220, 8);
          };
          const sortAll = async (want) => {
            let guard = 0;
            while (guard++ < 40) {
              const left = notes.filter(q => want(q) && q.state !== 'in');
              if (!left.length) break;
              const n = left.find(q => q.state === 'rest' && q.el.parentNode === layer);
              if (!n) { await K.wait(150); continue; }
              await K.wait(260);
              await flickOne(n, plan[k++ % plan.length]);
              await until(() => n.state === 'in' || n.state === 'rest', 3000);
            }
          };
          await sortAll(q => !q.d.piece);
          await until(() => G.phase === 'stuck', 15000);
          await K.wait(500);
          if (G.phase === 'stuck') { const r = K.rectIn(STK.el, el), sc = K.scaleOf(STK.el) || 1; await K.sim.drag(STK.el, { x: r.w / 2 / sc, y: r.h / 2 / sc }, { x: r.w / 2 / sc, y: (r.h / 2 - 90) / sc }, 300, 8); }
          await until(() => (G.phase === 'peel' && G.peelReady) || STK.done, 15000);
          for (let i = 0; i < 3 && !STK.done; i++) {
            await until(() => (G.peelReady && !STK.busy) || STK.done, 8000);
            if (STK.done) break;
            await K.wait(350);
            const r = K.rectIn(STK.el, el), sc = K.scaleOf(STK.el) || 1;
            await K.sim.drag(STK.el, { x: r.w / 2 / sc, y: r.h * 0.84 / sc }, { x: r.w / 2 / sc, y: (r.h * 0.84 - SS * 1.6) / sc }, 700, 14);
            await K.wait(250);
            if (!STK.done && G.peelReady && !STK.fin) autoPeel();
          }
          await until(() => STK.done, 8000);
          await sortAll(q => q.d.piece);
          await until(() => G.phase === 'pin', 20000);
          await K.wait(800);
          const c = notes.find(q => q.cand);
          if (c) await K.sim.tap(c.el);
          await until(() => G.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
